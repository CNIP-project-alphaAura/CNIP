"""
=============================================================================
Experiment Runner: E-Learning Network Performance Study
File: experiment_runner.py
Description: Orchestrates all simulation experiments across traffic scenarios,
             protocols, and algorithms. Produces unified JSON dataset for
             chart generation and web dashboard.
=============================================================================
"""

import os
import sys
import json
import time
from typing import Dict, List

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from ns2_trace_analyzer import SyntheticTraceGenerator, NS2TraceParser
from algorithm_simulators import (
    GoBackNSimulator, LeakyBucketSimulator, SlidingWindowAnalyzer
)


# ---------------------------------------------------------------------------
# Directory Setup
# ---------------------------------------------------------------------------
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR   = os.path.join(BASE_DIR, "outputs")
TRACE_DIR    = os.path.join(OUTPUT_DIR, "traces")
METRICS_DIR  = os.path.join(OUTPUT_DIR, "metrics")
ALGO_DIR     = os.path.join(OUTPUT_DIR, "algorithm_data")
GRAPHS_DIR   = os.path.join(OUTPUT_DIR, "graphs")

for d in [TRACE_DIR, METRICS_DIR, ALGO_DIR, GRAPHS_DIR]:
    os.makedirs(d, exist_ok=True)


# ---------------------------------------------------------------------------
# Experiment 1: TCP vs UDP under Low/Medium/High Traffic
# ---------------------------------------------------------------------------
def run_protocol_comparison() -> Dict:
    """
    Compare TCP and UDP across low, medium, and high traffic scenarios.
    Measures: Throughput, Delay, PLR, PDR for each scenario/protocol combo.
    """
    print("\n" + "="*65)
    print("  EXPERIMENT 1: TCP vs UDP Protocol Comparison")
    print("="*65)

    scenarios = {
        "low":    {"users": 10,  "label": "Low (10 users)"},
        "medium": {"users": 50,  "label": "Medium (50 users)"},
        "high":   {"users": 100, "label": "High (100 users)"},
    }
    protocols = ["TCP", "UDP"]

    results = {}

    for scenario_name, scenario_cfg in scenarios.items():
        results[scenario_name] = {
            "label": scenario_cfg["label"],
            "users": scenario_cfg["users"],
        }
        for protocol in protocols:
            print(f"\n  Scenario: {scenario_cfg['label']} | Protocol: {protocol}")

            # Generate synthetic trace
            seed = hash(f"{scenario_name}{protocol}") % 1000 + 42
            gen = SyntheticTraceGenerator(
                scenario=scenario_name, protocol=protocol, seed=seed
            )
            trace_path = os.path.join(TRACE_DIR, f"elearning_{scenario_name}_{protocol.lower()}.tr")
            gen.generate(trace_path)

            # Parse trace
            parser = NS2TraceParser(trace_path)
            flows  = parser.parse()

            # Aggregate metrics
            total_sent     = sum(f.sent     for f in flows.values())
            total_received = sum(f.received for f in flows.values())
            total_dropped  = sum(f.dropped  for f in flows.values())
            total_bytes    = sum(f.total_bytes for f in flows.values())

            valid_flows = [f for f in flows.values() if f.first_time < float('inf')]
            if valid_flows:
                first_t = min(f.first_time for f in valid_flows)
                last_t  = max(f.last_time  for f in valid_flows)
                duration = last_t - first_t if last_t > first_t else 1.0
            else:
                duration = 1.0

            all_delays = [d for f in flows.values() for d in f.delays]

            plr = (total_dropped  / total_sent     * 100) if total_sent     > 0 else 0
            pdr = (total_received / total_sent     * 100) if total_sent     > 0 else 0
            tput = (total_bytes   * 8 / duration   / 1000) if duration     > 0 else 0
            avg_delay = (sum(all_delays) / len(all_delays) * 1000) if all_delays else 0

            # Jitter
            jitter_vals = []
            for f in flows.values():
                d = f.delays
                for i in range(1, len(d)):
                    jitter_vals.append(abs(d[i] - d[i-1]) * 1000)
            avg_jitter = sum(jitter_vals) / len(jitter_vals) if jitter_vals else 0

            metrics = {
                "total_sent":       total_sent,
                "total_received":   total_received,
                "total_dropped":    total_dropped,
                "plr_percent":      round(plr,       3),
                "pdr_percent":      round(pdr,       3),
                "throughput_kbps":  round(tput,      3),
                "avg_delay_ms":     round(avg_delay, 4),
                "avg_jitter_ms":    round(avg_jitter, 4),
            }
            results[scenario_name][protocol] = metrics

            print(f"    Throughput: {tput:8.2f} Kbps | "
                  f"Delay: {avg_delay:7.2f} ms | "
                  f"PLR: {plr:5.2f}% | PDR: {pdr:5.2f}%")

    # Save results
    path = os.path.join(METRICS_DIR, "protocol_comparison.json")
    with open(path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n  [OK] Protocol comparison saved: {path}")
    return results


# ---------------------------------------------------------------------------
# Experiment 2: Traffic Load vs Congestion Impact
# ---------------------------------------------------------------------------
def run_congestion_analysis() -> Dict:
    """
    Analyze effect of increasing user load (data rate) on congestion metrics.
    Shows how throughput degrades and packet loss increases under overload.
    """
    print("\n" + "="*65)
    print("  EXPERIMENT 2: User Load vs Network Congestion")
    print("="*65)

    # Simulate a range of user counts from 5 to 120
    user_counts = [5, 10, 15, 20, 30, 40, 50, 60, 75, 100, 120]
    results = {
        "user_counts":    user_counts,
        "TCP_throughput": [],
        "UDP_throughput": [],
        "TCP_plr":        [],
        "UDP_plr":        [],
        "TCP_delay":      [],
        "UDP_delay":      [],
        "TCP_pdr":        [],
        "UDP_pdr":        [],
    }

    # Network capacity model (bandwidth-delay product based)
    # Bottleneck: 10 Mbps access link
    CAPACITY_KBPS   = 10_000
    PER_USER_DEMAND = 256  # baseline demand per user in Kbps
    MAX_QUEUE       = 50   # max queue depth in packets
    PACKET_SIZE_KB  = 1.0

    for n in user_counts:
        total_demand = n * PER_USER_DEMAND

        for protocol in ["TCP", "UDP"]:
            seed = hash(f"cong_{n}_{protocol}") % 1000 + 100

            # Determine scenario for trace generator
            if n <= 15:
                scenario = "low"
            elif n <= 50:
                scenario = "medium"
            else:
                scenario = "high"

            gen = SyntheticTraceGenerator(
                scenario=scenario, protocol=protocol, seed=seed
            )
            trace_path = os.path.join(TRACE_DIR, f"cong_{n}_{protocol.lower()}.tr")
            gen.generate(trace_path)

            parser = NS2TraceParser(trace_path)
            flows  = parser.parse()

            total_sent = sum(f.sent for f in flows.values())
            total_received = sum(f.received for f in flows.values())
            total_dropped = sum(f.dropped for f in flows.values())
            total_bytes = sum(f.total_bytes for f in flows.values())

            valid_flows = [f for f in flows.values() if f.first_time < float('inf')]
            duration = 1.0
            if valid_flows:
                first_t = min(f.first_time for f in valid_flows)
                last_t = max(f.last_time for f in valid_flows)
                if last_t > first_t:
                    duration = last_t - first_t

            all_delays = [d for f in flows.values() for d in f.delays]

            plr   = (total_dropped / total_sent * 100) if total_sent > 0 else 0
            pdr   = (total_received / total_sent * 100) if total_sent > 0 else 0
            tput  = (total_bytes * 8 / duration / 1000) if duration > 0 else 0
            avg_d = (sum(all_delays) / len(all_delays) * 1000) if all_delays else 0

            key = protocol
            results[f"{key}_throughput"].append(round(tput,  2))
            results[f"{key}_plr"       ].append(round(plr,   3))
            results[f"{key}_delay"     ].append(round(avg_d, 3))
            results[f"{key}_pdr"       ].append(round(pdr,   3))

        print(f"  Users={n:3d} | "
              f"TCP Tput={results['TCP_throughput'][-1]:8.2f} Kbps | "
              f"UDP Tput={results['UDP_throughput'][-1]:8.2f} Kbps | "
              f"TCP PLR={results['TCP_plr'][-1]:5.2f}%")

    path = os.path.join(METRICS_DIR, "congestion_analysis.json")
    with open(path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n  [OK] Congestion analysis saved: {path}")
    return results


# ---------------------------------------------------------------------------
# Experiment 3: GBN Window Size vs Efficiency
# ---------------------------------------------------------------------------
def run_gbn_experiment() -> Dict:
    """Compare GBN performance across window sizes and loss rates."""
    print("\n" + "="*65)
    print("  EXPERIMENT 3: Go-Back-N Window Size vs Efficiency")
    print("="*65)

    window_sizes = [1, 2, 4, 8, 16, 32, 64]
    loss_probs   = [0.0, 0.05, 0.10, 0.20]
    results = {}

    for p in loss_probs:
        results[f"loss_{int(p*100)}pct"] = {
            "loss_prob":     p,
            "window_sizes":  window_sizes,
            "efficiencies":  [],
            "retransmissions": [],
            "sim_times":     [],
        }
        for W in window_sizes:
            sim = GoBackNSimulator(
                window_size=W, total_frames=50,
                loss_prob=p, seed=42
            )
            r = sim.run()
            results[f"loss_{int(p*100)}pct"]["efficiencies"    ].append(r["efficiency_percent"])
            results[f"loss_{int(p*100)}pct"]["retransmissions" ].append(r["total_retransmit"])
            results[f"loss_{int(p*100)}pct"]["sim_times"       ].append(r["sim_time"])
            print(f"  p={p:.2f} W={W:2d}: Efficiency={r['efficiency_percent']:5.1f}% | "
                  f"Retransmit={r['total_retransmit']:3d}")

    # Also add theoretical values
    sw_analysis = SlidingWindowAnalyzer.run_analysis()
    results["theoretical"] = sw_analysis["theoretical"]

    path = os.path.join(ALGO_DIR, "gbn_experiment.json")
    with open(path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n  [OK] GBN experiment saved: {path}")
    return results


# ---------------------------------------------------------------------------
# Experiment 4: Leaky Bucket Impact
# ---------------------------------------------------------------------------
def run_leaky_bucket_experiment() -> Dict:
    """Compare network behavior with and without Leaky Bucket."""
    print("\n" + "="*65)
    print("  EXPERIMENT 4: Leaky Bucket Traffic Shaping Impact")
    print("="*65)

    results = {}

    # Without Leaky Bucket: bursty traffic goes directly to network
    # Simulated by high loss probability during burst periods
    print("\n  WITHOUT Leaky Bucket (direct bursty traffic):")
    lb_sim_without = LeakyBucketSimulator(
        bucket_capacity=5,    # Very small buffer = lots of overflow
        leak_rate_pps=10.0,
        sim_duration=20.0,
        time_step=0.1,
    )
    without_result = lb_sim_without.run()
    results["without_lb"] = without_result["summary"]
    results["without_lb"]["timeline"] = without_result["timeline"]
    print(f"    Drops: {without_result['summary']['total_dropped']} "
          f"({without_result['summary']['drop_rate_pct']}%)")
    print(f"    Output Efficiency: {without_result['summary']['output_efficiency']}%")

    print("\n  WITH Leaky Bucket (regulated traffic):")
    lb_sim_with = LeakyBucketSimulator(
        bucket_capacity=50,   # Larger buffer absorbs bursts
        leak_rate_pps=10.0,
        sim_duration=20.0,
        time_step=0.1,
    )
    with_result = lb_sim_with.run()
    results["with_lb"] = with_result["summary"]
    results["with_lb"]["timeline"] = with_result["timeline"]
    print(f"    Drops: {with_result['summary']['total_dropped']} "
          f"({with_result['summary']['drop_rate_pct']}%)")
    print(f"    Output Efficiency: {with_result['summary']['output_efficiency']}%")

    # Bucket capacity sensitivity
    print("\n  Bucket Capacity Sensitivity Analysis:")
    cap_results = {
        "capacities":      [],
        "drop_rates":      [],
        "efficiencies":    [],
    }
    for cap in [5, 10, 20, 30, 50, 75, 100]:
        sim = LeakyBucketSimulator(bucket_capacity=cap, leak_rate_pps=10.0,
                                   sim_duration=20.0, time_step=0.1)
        r = sim.run()
        cap_results["capacities"  ].append(cap)
        cap_results["drop_rates"  ].append(r["summary"]["drop_rate_pct"])
        cap_results["efficiencies"].append(r["summary"]["output_efficiency"])
        print(f"    Cap={cap:3d}: Drop={r['summary']['drop_rate_pct']:5.2f}% | "
              f"Efficiency={r['summary']['output_efficiency']:5.2f}%")

    results["capacity_analysis"] = cap_results

    path = os.path.join(ALGO_DIR, "leaky_bucket_experiment.json")
    with open(path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n  [OK] Leaky Bucket experiment saved: {path}")
    return results


# ---------------------------------------------------------------------------
# Master Runner
# ---------------------------------------------------------------------------
def run_all_experiments():
    print("\n" + "="*65)
    print("  UNIVERSITY E-LEARNING NETWORK PERFORMANCE ANALYSIS")
    print("  Experiment Runner - All Scenarios")
    print("="*65)

    start = time.time()

    exp1 = run_protocol_comparison()
    exp2 = run_congestion_analysis()
    exp3 = run_gbn_experiment()
    exp4 = run_leaky_bucket_experiment()

    # Build master dataset for the web dashboard
    master = {
        "title":     "University E-Learning Network Performance Analysis",
        "protocol_comparison":    exp1,
        "congestion_analysis":    exp2,
        "gbn_experiment":         exp3,
        "leaky_bucket_experiment":exp4,
    }

    master_path = os.path.join(METRICS_DIR, "master_dataset.json")
    with open(master_path, 'w') as f:
        json.dump(master, f, indent=2)

    elapsed = time.time() - start
    print("\n" + "="*65)
    print(f"  [OK] All experiments complete in {elapsed:.1f}s")
    print(f"  [OK] Master dataset: {master_path}")
    print(f"  [OK] Run 'python generate_charts.py' to generate all graphs.")
    print("="*65)

    return master


if __name__ == "__main__":
    run_all_experiments()
