"""
=============================================================================
Python NS-2 Trace Analyzer & Network Performance Simulator Engine
File: ns2_trace_analyzer.py
Description: Parses standard NS-2 .tr trace files and generates comprehensive
             performance metrics: Throughput, Delay, Packet Loss, PDR.
             Also generates synthetic NS-2 compatible trace data if NS-2
             is not available (Windows cross-platform engine).
=============================================================================
"""

import re
import os
import json
import random
import math
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple
from collections import defaultdict


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------
@dataclass
class Packet:
    """Represents a single NS-2 trace packet entry."""
    event:     str          # 's' sent, 'r' received, 'd' dropped
    time:      float
    from_node: int
    to_node:   int
    pkt_type:  str          # tcp, udp, cbr, ack, etc.
    pkt_size:  int
    flow_id:   int
    seq_no:    int
    pkt_id:    int


@dataclass
class FlowMetrics:
    """Aggregated metrics for a single traffic flow."""
    flow_id:        int
    protocol:       str = "unknown"
    sent:           int = 0
    received:       int = 0
    dropped:        int = 0
    total_delay:    float = 0.0
    delays:         List[float] = field(default_factory=list)
    total_bytes:    int = 0
    first_time:     float = float('inf')
    last_time:      float = 0.0

    @property
    def pdr(self) -> float:
        return (self.received / self.sent * 100) if self.sent > 0 else 0.0

    @property
    def plr(self) -> float:
        return (self.dropped / self.sent * 100) if self.sent > 0 else 0.0

    @property
    def avg_delay_ms(self) -> float:
        return (sum(self.delays) / len(self.delays) * 1000) if self.delays else 0.0

    @property
    def throughput_kbps(self) -> float:
        duration = self.last_time - self.first_time
        return (self.total_bytes * 8 / duration / 1000) if duration > 0 else 0.0

    @property
    def jitter_ms(self) -> float:
        if len(self.delays) < 2:
            return 0.0
        diffs = [abs(self.delays[i] - self.delays[i-1]) for i in range(1, len(self.delays))]
        return (sum(diffs) / len(diffs) * 1000)


# ---------------------------------------------------------------------------
# NS-2 Trace File Parser
# ---------------------------------------------------------------------------
class NS2TraceParser:
    """Parses NS-2 .tr trace files and extracts performance metrics."""

    # NS-2 trace line format (basic):
    # <event> <time> <from_node> <to_node> <pkt_type> <size> <flags>
    # <flow_id> <src_addr> <dst_addr> <seq_no> <pkt_id>
    TRACE_PATTERN = re.compile(
        r'^([srdf])\s+(\d+\.\d+)\s+(\d+)\s+(\d+)\s+(\w+)\s+(\d+)\s+\S+\s+'
        r'(\d+)\s+\S+\s+\S+\s+(\d+)\s+(\d+)'
    )

    def __init__(self, filepath: str):
        self.filepath = filepath
        self.packets:  List[Packet]     = []
        self.flows:    Dict[int, FlowMetrics] = {}
        self._sent_times: Dict[int, float] = {}  # pkt_id -> send_time

    def parse(self) -> Dict[int, FlowMetrics]:
        """Parse the trace file and return flow metrics."""
        if not os.path.exists(self.filepath):
            raise FileNotFoundError(f"Trace file not found: {self.filepath}")

        with open(self.filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                packet = self._parse_line(line)
                if packet:
                    self._process_packet(packet)

        return self.flows

    def _parse_line(self, line: str) -> Optional[Packet]:
        m = self.TRACE_PATTERN.match(line)
        if not m:
            return None
        try:
            return Packet(
                event     = m.group(1),
                time      = float(m.group(2)),
                from_node = int(m.group(3)),
                to_node   = int(m.group(4)),
                pkt_type  = m.group(5),
                pkt_size  = int(m.group(6)),
                flow_id   = int(m.group(7)),
                seq_no    = int(m.group(8)),
                pkt_id    = int(m.group(9)),
            )
        except (ValueError, IndexError):
            return None

    def _process_packet(self, pkt: Packet):
        fid = pkt.flow_id
        if fid not in self.flows:
            self.flows[fid] = FlowMetrics(flow_id=fid)

        fm = self.flows[fid]

        if pkt.event == 's':
            fm.sent += 1
            self._sent_times[pkt.pkt_id] = pkt.time
            if pkt.pkt_type in ('tcp', 'ack'):
                fm.protocol = 'TCP'
            elif pkt.pkt_type in ('cbr', 'udp'):
                fm.protocol = 'UDP'

        elif pkt.event == 'r':
            fm.received += 1
            fm.total_bytes += pkt.pkt_size
            if pkt.pkt_id in self._sent_times:
                delay = pkt.time - self._sent_times[pkt.pkt_id]
                fm.delays.append(delay)
                fm.total_delay += delay
                del self._sent_times[pkt.pkt_id]
            if pkt.time < fm.first_time:
                fm.first_time = pkt.time
            if pkt.time > fm.last_time:
                fm.last_time = pkt.time

        elif pkt.event == 'd':
            fm.dropped += 1

    def summary_report(self) -> str:
        """Generate a human-readable summary report."""
        lines = [
            "=" * 65,
            "  NS-2 TRACE ANALYSIS REPORT - University E-Learning System",
            "=" * 65,
            f"  Trace File: {os.path.basename(self.filepath)}",
            "=" * 65,
            "",
            f"  {'Flow':>6}  {'Proto':>5}  {'Sent':>7}  {'Rcvd':>7}  "
            f"{'Drop':>6}  {'PDR%':>6}  {'Tput(Kbps)':>11}  {'Delay(ms)':>10}",
            "  " + "-" * 63,
        ]
        for fid, fm in sorted(self.flows.items()):
            lines.append(
                f"  {fid:>6}  {fm.protocol:>5}  {fm.sent:>7}  {fm.received:>7}  "
                f"{fm.dropped:>6}  {fm.pdr:>6.2f}  {fm.throughput_kbps:>11.2f}  "
                f"{fm.avg_delay_ms:>10.3f}"
            )
        lines += [
            "",
            "=" * 65,
        ]
        return "\n".join(lines)

    def export_json(self, output_path: str):
        """Export metrics to JSON for chart generation."""
        data = {}
        for fid, fm in self.flows.items():
            data[str(fid)] = {
                "flow_id":        fid,
                "protocol":       fm.protocol,
                "sent":           fm.sent,
                "received":       fm.received,
                "dropped":        fm.dropped,
                "pdr":            round(fm.pdr, 3),
                "plr":            round(fm.plr, 3),
                "throughput_kbps":round(fm.throughput_kbps, 3),
                "avg_delay_ms":   round(fm.avg_delay_ms, 4),
                "jitter_ms":      round(fm.jitter_ms, 4),
            }
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"  [OK] Metrics exported to: {output_path}")


# ---------------------------------------------------------------------------
# Synthetic NS-2 Trace Generator (Windows cross-platform)
# ---------------------------------------------------------------------------
class SyntheticTraceGenerator:
    """
    Generates realistic NS-2 format .tr trace files without needing NS-2.
    Models university e-learning network with realistic traffic patterns.
    """

    SCENARIOS = {
        "low":    {"users": 10,  "data_rate_mbps": 0.5,  "loss_prob": 0.005},
        "medium": {"users": 50,  "data_rate_mbps": 2.5,  "loss_prob": 0.045},
        "high":   {"users": 100, "data_rate_mbps": 8.0,  "loss_prob": 0.125},
    }

    def __init__(self, scenario: str = "medium", protocol: str = "TCP",
                 sim_duration: float = 10.0, seed: int = 42):
        self.scenario       = scenario.lower()
        self.protocol       = protocol.upper()
        self.sim_duration   = sim_duration
        self.seed           = seed
        random.seed(seed)

        cfg = self.SCENARIOS[self.scenario]
        self.num_users    = cfg["users"]
        self.data_rate    = cfg["data_rate_mbps"]
        self.loss_prob    = cfg["loss_prob"]

        # Packet size and rate params
        self.pkt_size     = 1000 if protocol == "UDP" else 1460
        self.pkt_interval = (self.pkt_size * 8) / (self.data_rate * 1e6)

        # Network delay parameters (base + random jitter)
        self.base_delay   = 0.045     # 45ms base e2e delay
        self.jitter_range = 0.015     # ±15ms jitter

    def generate(self, output_path: str) -> str:
        """Generate a synthetic NS-2 trace file."""
        lines = []
        pkt_id   = 0
        node_0   = 0    # E-Learning Server
        node_off = 5    # Student nodes start at node 5

        for user_id in range(self.num_users):
            student_node = node_off + user_id
            fid = (user_id % 4) + 1  # 4 flow types: LMS, Video, Exam, Portal
            pkt_type = "tcp" if fid in (1, 3) else "cbr"
            start_t = 0.1 + user_id * 0.05

            t = start_t
            seq = 0
            while t < self.sim_duration - 0.5:
                pkt_id += 1
                send_event = (
                    f"s {t:.6f} {student_node} {node_0} {pkt_type} "
                    f"{self.pkt_size} ------- {fid} {student_node}.0 {node_0}.0 "
                    f"{seq} {pkt_id}"
                )
                lines.append(send_event)

                # Determine if packet is dropped (loss model)
                burst_factor = 1.0
                if 4.8 <= t <= 6.2:  # Congestion burst period
                    burst_factor = 3.5

                drop_prob = self.loss_prob * burst_factor
                drop_prob = min(drop_prob, 0.80)

                if random.random() < drop_prob:
                    # Dropped packet
                    drop_event = (
                        f"d {t + 0.001:.6f} 2 3 {pkt_type} "
                        f"{self.pkt_size} ------- {fid} {student_node}.0 {node_0}.0 "
                        f"{seq} {pkt_id}"
                    )
                    lines.append(drop_event)
                else:
                    # Received packet (add delay + jitter)
                    delay = (self.base_delay +
                             random.uniform(-self.jitter_range, self.jitter_range) +
                             (burst_factor - 1.0) * 0.05)
                    recv_t = t + max(delay, 0.005)
                    recv_event = (
                        f"r {recv_t:.6f} {node_0} {student_node} {pkt_type} "
                        f"{self.pkt_size} ------- {fid} {student_node}.0 {node_0}.0 "
                        f"{seq} {pkt_id}"
                    )
                    lines.append(recv_event)

                    # TCP ACK
                    if pkt_type == "tcp" and seq % 4 == 3:
                        pkt_id += 1
                        ack_t = recv_t + 0.001
                        ack_event = (
                            f"s {ack_t:.6f} {node_0} {student_node} ack "
                            f"40 ------- {fid} {node_0}.0 {student_node}.0 "
                            f"{seq} {pkt_id}"
                        )
                        lines.append(ack_event)
                        pkt_id += 1
                        ack_recv_t = ack_t + delay
                        ack_recv = (
                            f"r {ack_recv_t:.6f} {student_node} {node_0} ack "
                            f"40 ------- {fid} {node_0}.0 {student_node}.0 "
                            f"{seq} {pkt_id}"
                        )
                        lines.append(ack_recv)

                t += self.pkt_interval + random.uniform(0, self.pkt_interval * 0.1)
                seq += 1

        # Sort by time for realistic trace format
        def get_time(line_str):
            parts = line_str.split()
            try:
                return float(parts[1])
            except (IndexError, ValueError):
                return 0.0

        lines.sort(key=get_time)

        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
        with open(output_path, 'w') as f:
            f.write(f"# NS-2 Synthetic Trace: E-Learning Network Simulation\n")
            f.write(f"# Scenario: {self.scenario} | Protocol: {self.protocol} "
                    f"| Users: {self.num_users}\n")
            f.write(f"# Generated: cross-platform Python engine\n")
            f.write("\n".join(lines) + "\n")

        print(f"  [OK] Synthetic trace: {output_path} ({len(lines)} events)")
        return output_path


# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    output_dir = os.path.join(os.path.dirname(__file__), '..', 'outputs', 'traces')
    os.makedirs(output_dir, exist_ok=True)

    metrics_dir = os.path.join(os.path.dirname(__file__), '..', 'outputs', 'metrics')
    os.makedirs(metrics_dir, exist_ok=True)

    # If a .tr file is passed, parse it directly
    if len(sys.argv) > 1 and sys.argv[1].endswith('.tr'):
        trace_file = sys.argv[1]
        print(f"\nParsing NS-2 trace file: {trace_file}")
        parser = NS2TraceParser(trace_file)
        flows  = parser.parse()
        print(parser.summary_report())
        out_json = os.path.join(metrics_dir, os.path.basename(trace_file).replace('.tr', '_metrics.json'))
        parser.export_json(out_json)

    else:
        # Generate synthetic traces for all scenarios x protocols
        print("\n" + "="*60)
        print("  Synthetic NS-2 Trace Generator - E-Learning Network")
        print("="*60)

        combos = [
            ("low",    "TCP", 42),
            ("low",    "UDP", 43),
            ("medium", "TCP", 44),
            ("medium", "UDP", 45),
            ("high",   "TCP", 46),
            ("high",   "UDP", 47),
        ]

        all_metrics = {}

        for scenario, protocol, seed in combos:
            print(f"\n  Generating: {scenario.upper()} traffic | {protocol} | seed={seed}")
            gen = SyntheticTraceGenerator(scenario=scenario, protocol=protocol, seed=seed)
            trace_path = os.path.join(output_dir, f"elearning_{scenario}_{protocol.lower()}.tr")
            gen.generate(trace_path)

            parser = NS2TraceParser(trace_path)
            flows  = parser.parse()
            print(parser.summary_report())

            # Aggregate metrics for this scenario
            key = f"{scenario}_{protocol}"
            agg = {
                "scenario": scenario,
                "protocol": protocol,
                "users":    gen.num_users,
                "flows":    {}
            }
            for fid, fm in flows.items():
                agg["flows"][str(fid)] = asdict(fm)
                # Remove delays list to keep JSON compact
                agg["flows"][str(fid)]["delays"] = []

            # Compute scenario-level aggregates
            total_sent     = sum(f.sent     for f in flows.values())
            total_received = sum(f.received for f in flows.values())
            total_dropped  = sum(f.dropped  for f in flows.values())
            total_bytes    = sum(f.total_bytes for f in flows.values())

            first_t = min(f.first_time for f in flows.values() if f.first_time < float('inf'))
            last_t  = max(f.last_time  for f in flows.values())
            duration = last_t - first_t if last_t > first_t else 1.0

            avg_delays = [d for f in flows.values() for d in f.delays]

            agg["aggregate"] = {
                "total_sent":           total_sent,
                "total_received":       total_received,
                "total_dropped":        total_dropped,
                "plr_percent":          round((total_dropped / total_sent * 100) if total_sent > 0 else 0, 3),
                "pdr_percent":          round((total_received / total_sent * 100) if total_sent > 0 else 0, 3),
                "throughput_kbps":      round((total_bytes * 8 / duration / 1000), 3),
                "avg_delay_ms":         round((sum(avg_delays) / len(avg_delays) * 1000) if avg_delays else 0, 4),
            }

            all_metrics[key] = agg

            # Per-scenario JSON export
            json_path = os.path.join(metrics_dir, f"metrics_{key}.json")
            with open(json_path, 'w') as f:
                json.dump(agg, f, indent=2)
            print(f"  [OK] Metrics saved: {json_path}")

        # Combined metrics export for chart generation
        combined_path = os.path.join(metrics_dir, "all_metrics.json")
        with open(combined_path, 'w') as f:
            json.dump(all_metrics, f, indent=2)
        print(f"\n  [OK] Combined metrics: {combined_path}")
        print("  [OK] Run 'python generate_charts.py' to create performance graphs.")
