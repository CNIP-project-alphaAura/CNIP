import os
import json
import matplotlib.pyplot as plt
import numpy as np

# Directory paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
METRICS_DIR = os.path.join(BASE_DIR, "outputs", "metrics")
ALGO_DIR = os.path.join(BASE_DIR, "outputs", "algorithm_data")
GRAPHS_DIR = os.path.join(BASE_DIR, "outputs", "graphs")
os.makedirs(GRAPHS_DIR, exist_ok=True)


def load_json(filepath):
    """Load JSON file helper."""
    if not os.path.exists(filepath):
        print(f"Warning: File not found: {filepath}")
        return None
    with open(filepath, "r") as f:
        return json.load(f)


# -------------------------------------------------------------
# Chart 1: Throughput vs Traffic Load (TCP vs UDP)
# -------------------------------------------------------------
def plot_throughput(data):
    scenarios = ["low", "medium", "high"]
    labels = ["Low (10 users)", "Medium (50 users)", "High (100 users)"]
    
    tcp_tput = [data[s]["TCP"]["throughput_kbps"] for s in scenarios]
    udp_tput = [data[s]["UDP"]["throughput_kbps"] for s in scenarios]

    x = np.arange(len(labels))
    width = 0.35

    plt.figure(figsize=(8, 5))
    bars1 = plt.bar(x - width/2, tcp_tput, width, label="TCP", color="#2b5c8f")
    bars2 = plt.bar(x + width/2, udp_tput, width, label="UDP", color="#e67e22")

    # Add numeric labels on bars
    for bar in bars1:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, yval * 1.01, f"{yval:.0f}", ha='center', va='bottom', fontsize=8)
    for bar in bars2:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, yval * 1.01, f"{yval:.0f}", ha='center', va='bottom', fontsize=8)

    max_val = max(max(tcp_tput), max(udp_tput))
    plt.ylim(0, max_val * 1.15)
    plt.title("Throughput vs Traffic Load (TCP vs UDP)", fontsize=12, fontweight="bold")
    plt.xlabel("Traffic Scenario")
    plt.ylabel("Throughput (Kbps)")
    plt.xticks(x, labels)
    plt.grid(True, linestyle="--", alpha=0.5, axis='y')
    plt.legend()
    plt.tight_layout()

    out_path = os.path.join(GRAPHS_DIR, "chart1_throughput_vs_load.png")
    plt.savefig(out_path, dpi=120)
    plt.close()
    print("Saved:", out_path)


# -------------------------------------------------------------
# Chart 2: End-to-End Delay vs Traffic Load
# -------------------------------------------------------------
def plot_delay(data):
    users = data["user_counts"]
    tcp_delay = data["TCP_delay"]
    udp_delay = data["UDP_delay"]

    plt.figure(figsize=(8, 5))
    plt.plot(users, tcp_delay, marker='o', linewidth=2, label="TCP Delay", color="#2b5c8f")
    plt.plot(users, udp_delay, marker='s', linewidth=2, label="UDP Delay", color="#e67e22")

    # QoS threshold lines
    plt.axhline(y=100, color='green', linestyle='--', alpha=0.7, label="Acceptable (100 ms)")
    plt.axhline(y=300, color='red', linestyle='--', alpha=0.7, label="Critical (300 ms)")

    max_delay = max(max(tcp_delay), max(udp_delay))
    plt.ylim(0, max(max_delay * 1.15, 350))
    plt.title("End-to-End Delay vs Concurrent Users", fontsize=12, fontweight="bold")
    plt.xlabel("Number of Concurrent Users")
    plt.ylabel("Average Delay (ms)")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend()
    plt.tight_layout()

    out_path = os.path.join(GRAPHS_DIR, "chart2_delay_vs_load.png")
    plt.savefig(out_path, dpi=120)
    plt.close()
    print("Saved:", out_path)


# -------------------------------------------------------------
# Chart 3: Packet Loss Rate vs User Count
# -------------------------------------------------------------
def plot_packet_loss(data):
    users = data["user_counts"]
    tcp_loss = data["TCP_plr"]
    udp_loss = data["UDP_plr"]

    plt.figure(figsize=(8, 5))
    plt.plot(users, tcp_loss, marker='^', linewidth=2, label="TCP Loss Rate", color="#2b5c8f")
    plt.plot(users, udp_loss, marker='x', linewidth=2, label="UDP Loss Rate", color="#c0392b")

    max_loss = max(max(tcp_loss), max(udp_loss))
    plt.ylim(0, max_loss * 1.15)
    plt.title("Packet Loss Rate vs User Load", fontsize=12, fontweight="bold")
    plt.xlabel("Number of Concurrent Users")
    plt.ylabel("Packet Loss Rate (%)")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend()
    plt.tight_layout()

    out_path = os.path.join(GRAPHS_DIR, "chart3_packet_loss_vs_load.png")
    plt.savefig(out_path, dpi=120)
    plt.close()
    print("Saved:", out_path)


# -------------------------------------------------------------
# Chart 4: Packet Delivery Ratio (PDR) Comparison
# -------------------------------------------------------------
def plot_pdr(data):
    scenarios = ["low", "medium", "high"]
    labels = ["Low (10 users)", "Medium (50 users)", "High (100 users)"]

    tcp_pdr = [data[s]["TCP"]["pdr_percent"] for s in scenarios]
    udp_pdr = [data[s]["UDP"]["pdr_percent"] for s in scenarios]

    x = np.arange(len(labels))
    width = 0.35

    plt.figure(figsize=(8, 5))
    bars1 = plt.bar(x - width/2, tcp_pdr, width, label="TCP PDR", color="#27ae60")
    bars2 = plt.bar(x + width/2, udp_pdr, width, label="UDP PDR", color="#2980b9")

    # Add numeric labels on bars
    for bar in bars1:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, yval + 0.8, f"{yval:.1f}%", ha='center', va='bottom', fontsize=8)
    for bar in bars2:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, yval + 0.8, f"{yval:.1f}%", ha='center', va='bottom', fontsize=8)

    plt.ylim(60, 105)
    plt.title("Packet Delivery Ratio (PDR) Comparison", fontsize=12, fontweight="bold")
    plt.xlabel("Traffic Scenario")
    plt.ylabel("PDR (%)")
    plt.xticks(x, labels)
    plt.grid(True, linestyle="--", alpha=0.5, axis='y')
    plt.legend(loc="lower left")
    plt.tight_layout()

    out_path = os.path.join(GRAPHS_DIR, "chart4_pdr_comparison.png")
    plt.savefig(out_path, dpi=120)
    plt.close()
    print("Saved:", out_path)


# -------------------------------------------------------------
# Chart 5: Leaky Bucket Traffic Shaping Impact
# -------------------------------------------------------------
def plot_leaky_bucket(data):
    w_tl = data.get("without_lb", {}).get("timeline", [])
    b_tl = data.get("with_lb", {}).get("timeline", [])

    time_w = [item["t"] for item in w_tl]
    time_b = [item["t"] for item in b_tl]

    arr_w = [item["arrival_rate"] for item in w_tl]
    out_w = [item["output_rate"] for item in w_tl]
    drop_w = [item["dropped"] for item in w_tl]

    out_b = [item["output_rate"] for item in b_tl]
    drop_b = [item["dropped"] for item in b_tl]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 6.5))

    # Top plot: Rate smoothing
    ax1.plot(time_w, arr_w, label="Incoming Bursty Traffic", color="#e74c3c", linestyle="--")
    ax1.plot(time_w, out_w, label="Output without Leaky Bucket", color="#f39c12", alpha=0.8)
    ax1.plot(time_b, out_b, label="Output with Leaky Bucket", color="#27ae60", linewidth=2)
    ax1.set_title("Leaky Bucket: Traffic Smoothing Effect", fontsize=11, fontweight="bold")
    ax1.set_xlabel("Time (s)")
    ax1.set_ylabel("Packet Rate")
    ax1.legend()
    ax1.grid(True, linestyle="--", alpha=0.5)

    # Bottom plot: Dropped packets
    ax2.plot(time_w, drop_w, label="Drops without Leaky Bucket", color="#c0392b", linewidth=2)
    ax2.plot(time_b, drop_b, label="Drops with Leaky Bucket", color="#2980b9", linewidth=2)
    ax2.set_title("Cumulative Packet Drops", fontsize=11, fontweight="bold")
    ax2.set_xlabel("Time (s)")
    ax2.set_ylabel("Dropped Packets")
    ax2.legend()
    ax2.grid(True, linestyle="--", alpha=0.5)

    plt.tight_layout()
    out_path = os.path.join(GRAPHS_DIR, "chart5_leaky_bucket_impact.png")
    plt.savefig(out_path, dpi=120)
    plt.close()
    print("Saved:", out_path)


# -------------------------------------------------------------
# Chart 6: Go-Back-N Window Size vs Transmission Efficiency
# -------------------------------------------------------------
def plot_gbn_efficiency(data):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.8))

    # Left plot: Efficiency vs Window Size
    for key, label, col in [
        ("loss_0pct", "0% Loss", "#27ae60"),
        ("loss_5pct", "5% Loss", "#f39c12"),
        ("loss_10pct", "10% Loss", "#e67e22"),
        ("loss_20pct", "20% Loss", "#c0392b"),
    ]:
        if key in data:
            ws = data[key]["window_sizes"]
            eff = data[key]["efficiencies"]
            ax1.plot(ws, eff, marker='o', label=label, color=col)

    ax1.set_title("GBN Efficiency vs Window Size", fontsize=11, fontweight="bold")
    ax1.set_xlabel("Window Size (W)")
    ax1.set_ylabel("Efficiency (%)")
    ax1.set_xscale('log', base=2)
    ax1.set_xticks([1, 2, 4, 8, 16, 32, 64])
    ax1.set_xticklabels([1, 2, 4, 8, 16, 32, 64])
    ax1.grid(True, linestyle="--", alpha=0.5)
    ax1.legend()

    # Right plot: Retransmissions at 10% loss
    if "loss_10pct" in data:
        ws = data["loss_10pct"]["window_sizes"]
        retx = data["loss_10pct"]["retransmissions"]
        bars = ax2.bar([str(w) for w in ws], retx, color="#2980b9", width=0.6)
        for bar in bars:
            yval = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2, yval + 0.1, str(yval), ha='center', va='bottom', fontsize=8)

        max_retx = max(retx) if retx else 0
        ax2.set_ylim(0, max(max_retx + 2, 5))
        ax2.set_title("Retransmissions at 10% Loss", fontsize=11, fontweight="bold")
        ax2.set_xlabel("Window Size (W)")
        ax2.set_ylabel("Total Retransmissions")
        ax2.grid(True, linestyle="--", alpha=0.5, axis='y')

    plt.tight_layout()
    out_path = os.path.join(GRAPHS_DIR, "chart6_gbn_efficiency.png")
    plt.savefig(out_path, dpi=120)
    plt.close()
    print("Saved:", out_path)


# -------------------------------------------------------------
# Main function
# -------------------------------------------------------------
def generate_all_charts():
    print("Generating charts...")

    proto_file = os.path.join(METRICS_DIR, "protocol_comparison.json")
    cong_file = os.path.join(METRICS_DIR, "congestion_analysis.json")
    gbn_file = os.path.join(ALGO_DIR, "gbn_experiment.json")
    lb_file = os.path.join(ALGO_DIR, "leaky_bucket_experiment.json")

    protocol_data = load_json(proto_file)
    congestion_data = load_json(cong_file)
    gbn_data = load_json(gbn_file)
    lb_data = load_json(lb_file)

    if not all([protocol_data, congestion_data, gbn_data, lb_data]):
        print("Missing dataset files. Run experiment_runner.py first.")
        return

    plot_throughput(protocol_data)
    plot_delay(congestion_data)
    plot_packet_loss(congestion_data)
    plot_pdr(protocol_data)
    plot_leaky_bucket(lb_data)
    plot_gbn_efficiency(gbn_data)

    print("All charts generated successfully in:", GRAPHS_DIR)


if __name__ == "__main__":
    generate_all_charts()
