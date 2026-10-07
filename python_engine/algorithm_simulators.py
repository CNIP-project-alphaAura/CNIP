"""
=============================================================================
Algorithm Simulators: Sliding Window, Go-Back-N, Leaky Bucket
File: algorithm_simulators.py
Description: Discrete-event mathematical simulators for the three core
             network algorithms. Produces data for web dashboard animations
             and chart generation.
=============================================================================
"""

import random
import math
import json
import os
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
from enum import Enum


# ===========================================================================
# 1. SLIDING WINDOW & GO-BACK-N ARQ SIMULATOR
# ===========================================================================

class FrameState(Enum):
    PENDING    = "pending"
    SENT       = "sent"
    ACKED      = "acked"
    LOST       = "lost"
    RETRANSMIT = "retransmit"


@dataclass
class Frame:
    seq_no:    int
    data:      str
    state:     FrameState = FrameState.PENDING
    send_time: float = 0.0
    ack_time:  float = 0.0
    retransmissions: int = 0


@dataclass
class GBNEvent:
    """A single event in the GBN simulation timeline."""
    time:        float
    event_type:  str    # 'send', 'recv_ack', 'timeout', 'retransmit', 'window_slide'
    frame_seq:   int
    window_base: int
    window_size: int
    description: str


class GoBackNSimulator:
    """
    Go-Back-N ARQ Sliding Window Simulator.

    Models reliable transmission between an LMS client and the e-learning
    server. Demonstrates:
      - Window-based pipelining
      - GBN retransmission on loss (retransmit all frames from error point)
      - Window sliding on cumulative ACK
    """

    def __init__(self,
                 window_size:   int   = 4,
                 total_frames:  int   = 20,
                 loss_prob:     float = 0.15,
                 propagation_delay: float = 0.05,
                 timeout:       float = 0.3,
                 seed:          int   = 42):
        self.window_size       = window_size
        self.total_frames      = total_frames
        self.loss_prob         = loss_prob
        self.prop_delay        = propagation_delay
        self.timeout           = timeout
        random.seed(seed)

        self.frames: List[Frame] = [
            Frame(seq_no=i, data=f"DATA-{i:03d}") for i in range(total_frames)
        ]
        self.events:      List[GBNEvent] = []
        self.window_base: int   = 0
        self.next_seq:    int   = 0
        self.clock:       float = 0.0

        # Stats
        self.total_sent:     int = 0
        self.total_retransmit: int = 0
        self.total_acked:    int = 0

    def run(self) -> Dict:
        """Run the full GBN simulation and return results."""
        print(f"  Running Go-Back-N | W={self.window_size} | "
              f"Frames={self.total_frames} | Loss={self.loss_prob*100:.0f}%")

        max_iterations = self.total_frames * 10
        iteration = 0

        while self.total_acked < self.total_frames and iteration < max_iterations:
            iteration += 1

            # Send frames within window
            while (self.next_seq < self.total_frames and
                   self.next_seq < self.window_base + self.window_size):
                self._send_frame(self.next_seq)
                self.next_seq += 1

            # Check for timeout (oldest unACKed frame)
            if self.window_base < self.next_seq:
                oldest = self.frames[self.window_base]
                if (oldest.state == FrameState.SENT and
                        self.clock - oldest.send_time > self.timeout):
                    self._handle_timeout(self.window_base)
                else:
                    # Simulate propagation and ACK reception
                    self.clock += self.prop_delay

                    # Try to receive ACK for window_base
                    base_frame = self.frames[self.window_base]
                    if base_frame.state == FrameState.SENT:
                        lost = random.random() < self.loss_prob
                        if lost:
                            base_frame.state = FrameState.LOST
                            self._log_event("packet_lost", base_frame.seq_no,
                                            f"Frame {base_frame.seq_no} LOST in transit!")
                        else:
                            self._receive_ack(self.window_base)

        return self._compile_results()

    def _send_frame(self, seq: int):
        f = self.frames[seq]
        f.state     = FrameState.SENT
        f.send_time = self.clock
        self.total_sent += 1
        self._log_event("send", seq,
                        f"SEND Frame {seq} | Window [{self.window_base}, "
                        f"{min(self.window_base + self.window_size - 1, self.total_frames-1)}]")

    def _receive_ack(self, seq: int):
        f = self.frames[seq]
        f.state    = FrameState.ACKED
        f.ack_time = self.clock + self.prop_delay
        self.total_acked += 1

        self._log_event("recv_ack", seq,
                        f"ACK {seq} received | Window slides to {seq + 1}")

        # Slide window
        old_base = self.window_base
        while (self.window_base < self.total_frames and
               self.frames[self.window_base].state == FrameState.ACKED):
            self.window_base += 1

        if self.window_base > old_base:
            self._log_event("window_slide", seq,
                            f"Window slides: base {old_base} -> {self.window_base}")

    def _handle_timeout(self, base_seq: int):
        """GBN: On timeout, retransmit ALL frames from base_seq onwards."""
        self._log_event("timeout", base_seq,
                        f"TIMEOUT! Frame {base_seq} – GBN: Retransmit all from {base_seq}")
        retransmit_count = 0
        for i in range(base_seq, self.next_seq):
            if self.frames[i].state in (FrameState.SENT, FrameState.LOST):
                self.frames[i].state           = FrameState.RETRANSMIT
                self.frames[i].send_time       = self.clock
                self.frames[i].retransmissions += 1
                self.total_retransmit += 1
                retransmit_count += 1
                self._log_event("retransmit", i,
                                f"RETRANSMIT Frame {i} (attempt {self.frames[i].retransmissions})")
                self.frames[i].state = FrameState.SENT

        self.clock += self.prop_delay * retransmit_count

    def _log_event(self, event_type: str, seq: int, description: str):
        self.events.append(GBNEvent(
            time        = round(self.clock, 4),
            event_type  = event_type,
            frame_seq   = seq,
            window_base = self.window_base,
            window_size = self.window_size,
            description = description,
        ))

    def _compile_results(self) -> Dict:
        efficiency = (self.total_frames / self.total_sent * 100) if self.total_sent > 0 else 0
        return {
            "window_size":        self.window_size,
            "total_frames":       self.total_frames,
            "loss_probability":   self.loss_prob,
            "total_sent":         self.total_sent,
            "total_retransmit":   self.total_retransmit,
            "total_acked":        self.total_acked,
            "efficiency_percent": round(efficiency, 2),
            "sim_time":           round(self.clock, 4),
            "events": [
                {
                    "time":        e.time,
                    "type":        e.event_type,
                    "seq":         e.frame_seq,
                    "window_base": e.window_base,
                    "window_size": e.window_size,
                    "desc":        e.description,
                }
                for e in self.events
            ]
        }


# ===========================================================================
# 2. LEAKY BUCKET TRAFFIC SHAPER SIMULATOR
# ===========================================================================

@dataclass
class LeakyBucketResult:
    time:          float
    arrived:       int      # Cumulative packets arrived
    in_bucket:     int      # Packets currently in bucket
    leaked:        int      # Cumulative packets output (leaked)
    dropped:       int      # Cumulative packets dropped (overflow)
    arrival_rate:  float    # Instantaneous arrival rate (pkts/s)
    output_rate:   float    # Instantaneous output rate (pkts/s)


class LeakyBucketSimulator:
    """
    Leaky Bucket Traffic Shaper Simulator.

    Models campus router traffic shaping for e-learning video streams.
    Incoming: bursty student video traffic (CBR + burst events)
    Output:   constant regulated rate (leak rate)
    Overflow: excess packets dropped (bucket overflow)
    """

    def __init__(self,
                 bucket_capacity: int   = 50,
                 leak_rate_pps:   float = 10.0,
                 sim_duration:    float = 20.0,
                 time_step:       float = 0.1,
                 seed:            int   = 42):
        self.capacity   = bucket_capacity
        self.leak_rate  = leak_rate_pps    # packets per second
        self.duration   = sim_duration
        self.dt         = time_step
        random.seed(seed)

        # Burst schedule: (start_time, end_time, burst_rate_pps)
        self.burst_schedule = [
            (2.0,  4.0,  35.0),   # First burst: video lecture starts
            (8.0,  10.0, 50.0),   # Second burst: exam session peak
            (14.0, 15.5, 45.0),   # Third burst: lecture recording download
        ]
        self.base_arrival_rate = 8.0   # Background traffic pps

    def _arrival_rate_at(self, t: float) -> float:
        """Get arrival rate at time t."""
        rate = self.base_arrival_rate
        for (start, end, burst_rate) in self.burst_schedule:
            if start <= t <= end:
                rate = burst_rate
                break
        return rate

    def run(self) -> Dict:
        """Run the leaky bucket simulation."""
        print(f"  Running Leaky Bucket | Capacity={self.capacity} | "
              f"LeakRate={self.leak_rate} pps | Duration={self.duration}s")

        bucket         = 0
        total_arrived  = 0
        total_leaked   = 0
        total_dropped  = 0
        results        = []

        t = 0.0
        while t <= self.duration:
            # Arrivals in this time step
            arr_rate    = self._arrival_rate_at(t)
            new_arrivals = int(arr_rate * self.dt + random.uniform(-0.5, 0.5))
            new_arrivals = max(0, new_arrivals)

            # Try to add to bucket
            space     = self.capacity - bucket
            accepted  = min(new_arrivals, space)
            overflow  = new_arrivals - accepted

            bucket        += accepted
            total_arrived += new_arrivals
            total_dropped += overflow

            # Leak (output) packets at constant rate
            to_leak  = min(bucket, int(self.leak_rate * self.dt + 0.5))
            bucket   -= to_leak
            total_leaked += to_leak

            results.append(LeakyBucketResult(
                time         = round(t, 2),
                arrived      = total_arrived,
                in_bucket    = bucket,
                leaked       = total_leaked,
                dropped      = total_dropped,
                arrival_rate = arr_rate,
                output_rate  = to_leak / self.dt if self.dt > 0 else 0,
            ))

            t += self.dt

        return {
            "parameters": {
                "bucket_capacity": self.capacity,
                "leak_rate_pps":   self.leak_rate,
                "sim_duration":    self.duration,
                "time_step":       self.dt,
                "burst_schedule":  self.burst_schedule,
            },
            "summary": {
                "total_arrived":   total_arrived,
                "total_leaked":    total_leaked,
                "total_dropped":   total_dropped,
                "drop_rate_pct":   round(total_dropped / total_arrived * 100 if total_arrived else 0, 2),
                "output_efficiency": round(total_leaked / total_arrived * 100 if total_arrived else 0, 2),
            },
            "timeline": [
                {
                    "t":            r.time,
                    "in_bucket":    r.in_bucket,
                    "leaked":       r.leaked,
                    "dropped":      r.dropped,
                    "arrival_rate": r.arrival_rate,
                    "output_rate":  round(r.output_rate, 2),
                }
                for r in results
            ]
        }


# ===========================================================================
# 3. SLIDING WINDOW EFFICIENCY ANALYSIS
# ===========================================================================

class SlidingWindowAnalyzer:
    """
    Analyzes Sliding Window efficiency across different window sizes and
    loss probabilities. Generates data for the Window Size vs Efficiency chart.
    """

    @staticmethod
    def theoretical_gbn_efficiency(window_size: int, loss_prob: float) -> float:
        """
        Theoretical Go-Back-N efficiency:
        η = W(1-p) / (1 + 2a*p) where a = Tp/Tf
        Simplified: η = (1-p) / (1 + 2a*p) for W >= 2a+1
        """
        a = 5.0  # propagation/transmission delay ratio
        p = loss_prob
        W = window_size
        if p == 0:
            return min(1.0, W / (2*a + 1)) * 100

        two_a_plus_1 = 2 * a + 1
        if W >= two_a_plus_1:
            eta = (1 - p) / (1 + 2 * a * p)
        else:
            eta = (W * (1 - p)) / (two_a_plus_1 * (1 + 2 * a * p))
        return min(100.0, max(0.0, eta * 100))

    @staticmethod
    def run_analysis() -> Dict:
        window_sizes = [1, 2, 4, 8, 16, 32, 64]
        loss_probs   = [0.0, 0.01, 0.05, 0.10, 0.20]

        results = {}
        for p in loss_probs:
            results[str(p)] = {
                "loss_prob":    p,
                "window_sizes": window_sizes,
                "efficiencies": [
                    round(SlidingWindowAnalyzer.theoretical_gbn_efficiency(W, p), 2)
                    for W in window_sizes
                ]
            }

        # Also run discrete simulation for W=4,16,64 at 10% loss
        sim_results = []
        for W in [4, 16, 64]:
            sim = GoBackNSimulator(window_size=W, total_frames=40,
                                   loss_prob=0.10, seed=42)
            result = sim.run()
            sim_results.append({
                "window_size":        W,
                "efficiency_percent": result["efficiency_percent"],
                "retransmissions":    result["total_retransmit"],
                "total_sent":         result["total_sent"],
                "sim_time":           result["sim_time"],
            })

        return {
            "theoretical": results,
            "simulated":   sim_results,
        }


# ===========================================================================
# Main - Run all algorithm simulations
# ===========================================================================
if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'outputs', 'algorithm_data')
    os.makedirs(out_dir, exist_ok=True)

    print("\n" + "="*60)
    print("  Algorithm Simulators - E-Learning Network Analysis")
    print("="*60)

    # ---- 1. Go-Back-N Simulation ----
    print("\n[1] Go-Back-N ARQ Simulation")
    print("-" * 40)
    gbn_all = []
    for W in [4, 16, 64]:
        sim = GoBackNSimulator(window_size=W, total_frames=30,
                               loss_prob=0.12, seed=42)
        result = sim.run()
        gbn_all.append(result)
        print(f"    W={W:2d}: Efficiency={result['efficiency_percent']:5.1f}% | "
              f"Retransmissions={result['total_retransmit']:3d} | "
              f"Time={result['sim_time']:.2f}s")

    gbn_path = os.path.join(out_dir, "gbn_simulation.json")
    with open(gbn_path, 'w') as f:
        json.dump(gbn_all, f, indent=2)
    print(f"  [✓] GBN data saved: {gbn_path}")

    # ---- 2. Leaky Bucket Simulation ----
    print("\n[2] Leaky Bucket Traffic Shaper")
    print("-" * 40)
    lb = LeakyBucketSimulator(
        bucket_capacity=50, leak_rate_pps=10.0,
        sim_duration=20.0, time_step=0.1
    )
    lb_result = lb.run()
    print(f"    Total Arrived : {lb_result['summary']['total_arrived']}")
    print(f"    Total Leaked  : {lb_result['summary']['total_leaked']}")
    print(f"    Total Dropped : {lb_result['summary']['total_dropped']}")
    print(f"    Drop Rate     : {lb_result['summary']['drop_rate_pct']}%")
    print(f"    Efficiency    : {lb_result['summary']['output_efficiency']}%")

    lb_path = os.path.join(out_dir, "leaky_bucket_simulation.json")
    with open(lb_path, 'w') as f:
        json.dump(lb_result, f, indent=2)
    print(f"  [✓] Leaky Bucket data saved: {lb_path}")

    # ---- 3. Sliding Window Efficiency Analysis ----
    print("\n[3] Sliding Window Efficiency Analysis")
    print("-" * 40)
    sw_results = SlidingWindowAnalyzer.run_analysis()
    sw_path = os.path.join(out_dir, "sliding_window_analysis.json")
    with open(sw_path, 'w') as f:
        json.dump(sw_results, f, indent=2)
    print("    Theoretical GBN Efficiency (W vs Loss probability):")
    for p_str, data in sw_results["theoretical"].items():
        p = float(p_str)
        effs = " | ".join(f"W={w}: {e:.1f}%" for w, e in zip(data["window_sizes"], data["efficiencies"]))
        print(f"    p={p:.2f}: {effs}")
    print(f"  [✓] Window analysis saved: {sw_path}")

    print("\n  [✓] All algorithm simulations complete!")
    print("  [✓] Run 'python generate_charts.py' to create performance graphs.")
