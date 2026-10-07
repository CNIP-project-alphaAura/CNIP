"""
=============================================================================
Chart Generator: Network Performance Analysis Graphs
File: generate_charts.py
Description: Reads experiment metrics JSON files and produces high-resolution
             publication-quality comparison charts using matplotlib.
             6 charts covering all project metrics.
=============================================================================

Charts Generated:
  1. Throughput vs User Load (TCP vs UDP)
  2. End-to-End Delay vs Traffic Load (TCP vs UDP)
  3. Packet Loss Rate vs User Count
  4. Packet Delivery Ratio (PDR) vs Traffic Scenario
  5. Leaky Bucket: Traffic Shaping Impact
  6. Go-Back-N: Window Size vs Transmission Efficiency
=============================================================================
"""

import os
import sys
import json
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend (no display needed)
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch
from matplotlib.ticker import MultipleLocator, FuncFormatter

# ---------------------------------------------------------------------------
# Setup Directories
# ---------------------------------------------------------------------------
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
METRICS_DIR = os.path.join(BASE_DIR, "outputs", "metrics")
ALGO_DIR    = os.path.join(BASE_DIR, "outputs", "algorithm_data")
GRAPHS_DIR  = os.path.join(BASE_DIR, "outputs", "graphs")
os.makedirs(GRAPHS_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Design System (consistent color palette)
# ---------------------------------------------------------------------------
COLORS = {
    "TCP":           "#4FC3F7",   # Light blue
    "UDP":           "#FF8A65",   # Coral orange
    "low":           "#66BB6A",   # Green
    "medium":        "#FFA726",   # Amber
    "high":          "#EF5350",   # Red
    "with_lb":       "#26C6DA",   # Cyan (with leaky bucket)
    "without_lb":    "#FF7043",   # Deep orange (without)
    "gbn_w4":        "#AB47BC",   # Purple
    "gbn_w16":       "#26A69A",   # Teal
    "gbn_w64":       "#FFA000",   # Amber dark
    "grid":          "#2A2A3A",
    "bg":            "#0F0F1A",
    "bg_axes":       "#141428",
    "text":          "#E0E0F0",
    "text_muted":    "#8080A0",
    "accent":        "#7C4DFF",
}

STYLE = {
    "linewidth":   2.5,
    "markersize":  8,
    "alpha_fill":  0.15,
    "dpi":         150,
    "figsize_wide": (14, 8),
    "figsize_sq":   (12, 8),
}


def apply_dark_style(ax, title: str = "", xlabel: str = "", ylabel: str = ""):
    """Apply consistent dark-mode styling to any axes."""
    ax.set_facecolor(COLORS["bg_axes"])
    ax.grid(True, color=COLORS["grid"], linewidth=0.7, linestyle='--', alpha=0.6)
    ax.tick_params(colors=COLORS["text"], labelsize=10)
    for spine in ax.spines.values():
        spine.set_edgecolor(COLORS["grid"])

    if title:
        ax.set_title(title, color=COLORS["text"], fontsize=13, fontweight='bold',
                     pad=12, fontfamily='monospace')
    if xlabel:
        ax.set_xlabel(xlabel, color=COLORS["text_muted"], fontsize=11, labelpad=8)
    if ylabel:
        ax.set_ylabel(ylabel, color=COLORS["text_muted"], fontsize=11, labelpad=8)


def make_figure(figsize=None, title: str = ""):
    """Create a styled figure with dark background."""
    if figsize is None:
        figsize = STYLE["figsize_wide"]
    fig = plt.figure(figsize=figsize, facecolor=COLORS["bg"])
    if title:
        fig.suptitle(title, color=COLORS["text"], fontsize=15, fontweight='bold',
                     y=0.97, fontfamily='monospace')
    return fig


def save_chart(fig, filename: str):
    path = os.path.join(GRAPHS_DIR, filename)
    fig.savefig(path, dpi=STYLE["dpi"], bbox_inches='tight',
                facecolor=COLORS["bg"], edgecolor='none')
    plt.close(fig)
    print(f"  [✓] Saved: {path}")
    return path


# ---------------------------------------------------------------------------
# Chart 1: Throughput vs User Load (TCP vs UDP)
# ---------------------------------------------------------------------------
def chart_throughput_vs_load(data: dict):
    fig = make_figure(title="Throughput vs User Load – E-Learning Network")
    ax = fig.add_subplot(111)
    apply_dark_style(ax,
                     title="System Throughput Under Low / Medium / High Student Traffic",
                     xlabel="Traffic Scenario (Number of Students)",
                     ylabel="Throughput (Kbps)")

    scenarios   = ["low", "medium", "high"]
    labels      = ["Low\n(10 users)", "Medium\n(30 users)", "High\n(100 users)"]
    tcp_tputs   = [data[s]["TCP"]["throughput_kbps"] for s in scenarios]
    udp_tputs   = [data[s]["UDP"]["throughput_kbps"] for s in scenarios]

    x = np.arange(len(labels))
    width = 0.32

    bars_tcp = ax.bar(x - width/2, tcp_tputs, width, label='TCP',
                      color=COLORS["TCP"], alpha=0.85, edgecolor=COLORS["bg"])
    bars_udp = ax.bar(x + width/2, udp_tputs, width, label='UDP',
                      color=COLORS["UDP"], alpha=0.85, edgecolor=COLORS["bg"])

    # Value labels on bars
    for bar in bars_tcp:
        h = bar.get_height()
        ax.annotate(f'{h:.0f}', xy=(bar.get_x() + bar.get_width()/2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha='center', va='bottom', color=COLORS["TCP"], fontsize=9, fontweight='bold')
    for bar in bars_udp:
        h = bar.get_height()
        ax.annotate(f'{h:.0f}', xy=(bar.get_x() + bar.get_width()/2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha='center', va='bottom', color=COLORS["UDP"], fontsize=9, fontweight='bold')

    ax.set_xticks(x)
    ax.set_xticklabels(labels, color=COLORS["text"])
    ax.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
              labelcolor=COLORS["text"], fontsize=11)

    # Add performance annotation
    ax.annotate('▼ Throughput drops under\nhigh congestion load',
                xy=(2, max(tcp_tputs[-1], udp_tputs[-1]) * 0.7),
                fontsize=9, color=COLORS["high"], style='italic',
                bbox=dict(boxstyle='round,pad=0.3', facecolor=COLORS["bg"], alpha=0.7))

    fig.tight_layout(rect=[0, 0, 1, 0.95])
    return save_chart(fig, "chart1_throughput_vs_load.png")


# ---------------------------------------------------------------------------
# Chart 2: End-to-End Delay vs Traffic Load
# ---------------------------------------------------------------------------
def chart_delay_vs_load(protocol_data: dict, congestion_data: dict):
    fig = make_figure(title="End-to-End Delay vs Traffic Load – E-Learning Network")
    ax  = fig.add_subplot(111)
    apply_dark_style(ax,
                     title="Average E2E Delay as Student Count Increases",
                     xlabel="Number of Concurrent Students",
                     ylabel="Average End-to-End Delay (ms)")

    users       = congestion_data["user_counts"]
    tcp_delays  = congestion_data["TCP_delay"]
    udp_delays  = congestion_data["UDP_delay"]

    ax.plot(users, tcp_delays, color=COLORS["TCP"], linewidth=STYLE["linewidth"],
            marker='o', markersize=STYLE["markersize"], label="TCP", zorder=3)
    ax.fill_between(users, tcp_delays, alpha=STYLE["alpha_fill"], color=COLORS["TCP"])

    ax.plot(users, udp_delays, color=COLORS["UDP"], linewidth=STYLE["linewidth"],
            marker='s', markersize=STYLE["markersize"], label="UDP", zorder=3)
    ax.fill_between(users, udp_delays, alpha=STYLE["alpha_fill"], color=COLORS["UDP"])

    # Threshold lines
    ax.axhline(y=100, color=COLORS["medium"], linestyle='--', linewidth=1.5,
               alpha=0.8, label='Acceptable threshold (100ms)')
    ax.axhline(y=300, color=COLORS["high"], linestyle='--', linewidth=1.5,
               alpha=0.8, label='Critical threshold (300ms)')

    # Annotate burst region
    ax.axvspan(45, 65, alpha=0.08, color=COLORS["high"])
    ax.text(50, max(max(tcp_delays), max(udp_delays)) * 0.9,
            'Congestion\nZone', color=COLORS["high"], ha='center',
            fontsize=9, style='italic')

    ax.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
              labelcolor=COLORS["text"], fontsize=10)
    ax.set_xlim(0, max(users) + 5)

    fig.tight_layout(rect=[0, 0, 1, 0.95])
    return save_chart(fig, "chart2_delay_vs_load.png")


# ---------------------------------------------------------------------------
# Chart 3: Packet Loss Rate vs User Count
# ---------------------------------------------------------------------------
def chart_packet_loss(congestion_data: dict):
    fig = make_figure(title="Packet Loss Rate vs User Load – E-Learning Network")
    ax  = fig.add_subplot(111)
    apply_dark_style(ax,
                     title="Packet Loss Rate (PLR%) Under Increasing Traffic",
                     xlabel="Number of Concurrent Students",
                     ylabel="Packet Loss Rate (%)")

    users    = congestion_data["user_counts"]
    tcp_plr  = congestion_data["TCP_plr"]
    udp_plr  = congestion_data["UDP_plr"]

    ax.plot(users, tcp_plr, color=COLORS["TCP"], linewidth=STYLE["linewidth"],
            marker='D', markersize=7, label="TCP (with retransmission)", zorder=3)
    ax.fill_between(users, tcp_plr, alpha=STYLE["alpha_fill"], color=COLORS["TCP"])

    ax.plot(users, udp_plr, color=COLORS["UDP"], linewidth=STYLE["linewidth"],
            marker='^', markersize=8, label="UDP (no retransmission)", zorder=3)
    ax.fill_between(users, udp_plr, alpha=STYLE["alpha_fill"], color=COLORS["UDP"])

    # QoS zones
    ax.axhspan(0,  1,  alpha=0.07, color=COLORS["low"],    label='Excellent <1%')
    ax.axhspan(1,  5,  alpha=0.05, color=COLORS["medium"], label='Acceptable <5%')
    ax.axhspan(5,  15, alpha=0.05, color=COLORS["high"],   label='Poor >5%')

    ax.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
              labelcolor=COLORS["text"], fontsize=10, loc='upper left')
    ax.set_xlim(0, max(users) + 5)
    ax.set_ylim(0)

    fig.tight_layout(rect=[0, 0, 1, 0.95])
    return save_chart(fig, "chart3_packet_loss_vs_load.png")


# ---------------------------------------------------------------------------
# Chart 4: Packet Delivery Ratio (PDR) Comparison
# ---------------------------------------------------------------------------
def chart_pdr_comparison(protocol_data: dict):
    fig = make_figure(figsize=(12, 8), title="Packet Delivery Ratio (PDR) – E-Learning Services")
    gs  = gridspec.GridSpec(1, 2, figure=fig, wspace=0.35)

    # Left: Bar chart PDR per scenario
    ax1 = fig.add_subplot(gs[0])
    apply_dark_style(ax1, title="PDR by Traffic Scenario",
                     xlabel="Scenario", ylabel="PDR (%)")

    scenarios = ["low", "medium", "high"]
    labels    = ["Low\n10 users", "Medium\n30 users", "High\n100 users"]
    tcp_pdrs  = [protocol_data[s]["TCP"]["pdr_percent"] for s in scenarios]
    udp_pdrs  = [protocol_data[s]["UDP"]["pdr_percent"] for s in scenarios]
    x = np.arange(len(labels))

    ax1.bar(x - 0.18, tcp_pdrs, 0.32, label='TCP', color=COLORS["TCP"], alpha=0.85)
    ax1.bar(x + 0.18, udp_pdrs, 0.32, label='UDP', color=COLORS["UDP"], alpha=0.85)
    ax1.set_xticks(x); ax1.set_xticklabels(labels, color=COLORS["text"])
    ax1.set_ylim(60, 105)
    ax1.axhline(y=95, color='white', linestyle=':', linewidth=1, alpha=0.4)
    ax1.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
               labelcolor=COLORS["text"])

    # Right: Radar/polar chart of metrics per service type
    ax2 = fig.add_subplot(gs[1], polar=True)
    ax2.set_facecolor(COLORS["bg_axes"])

    services = ['LMS\n(TCP)', 'Video\n(UDP)', 'Exam\n(TCP)', 'Portal\n(UDP)']
    N = len(services)
    angles = [n / float(N) * 2 * math.pi for n in range(N)]
    angles += angles[:1]

    # Scenario-based PDR data
    low_pdrs    = [protocol_data["low"]["TCP"]["pdr_percent"],
                   protocol_data["low"]["UDP"]["pdr_percent"],
                   protocol_data["low"]["TCP"]["pdr_percent"],
                   protocol_data["low"]["UDP"]["pdr_percent"]]
    medium_pdrs = [protocol_data["medium"]["TCP"]["pdr_percent"],
                   protocol_data["medium"]["UDP"]["pdr_percent"],
                   protocol_data["medium"]["TCP"]["pdr_percent"],
                   protocol_data["medium"]["UDP"]["pdr_percent"]]
    high_pdrs   = [protocol_data["high"]["TCP"]["pdr_percent"],
                   protocol_data["high"]["UDP"]["pdr_percent"],
                   protocol_data["high"]["TCP"]["pdr_percent"],
                   protocol_data["high"]["UDP"]["pdr_percent"]]

    for vals, color, label in [
        (low_pdrs,    COLORS["low"],    "Low traffic"),
        (medium_pdrs, COLORS["medium"], "Medium traffic"),
        (high_pdrs,   COLORS["high"],   "High traffic"),
    ]:
        vals_plot = vals + vals[:1]
        ax2.plot(angles, vals_plot, color=color, linewidth=2, label=label)
        ax2.fill(angles, vals_plot, color=color, alpha=0.12)

    ax2.set_xticks(angles[:-1])
    ax2.set_xticklabels(services, color=COLORS["text"], fontsize=9)
    ax2.set_ylim(50, 105)
    ax2.tick_params(colors=COLORS["text_muted"])
    ax2.set_title("PDR by Service Type\n(Radar)", color=COLORS["text"], fontsize=12, pad=15)
    ax2.legend(loc='lower right', facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
               labelcolor=COLORS["text"], fontsize=9)

    fig.tight_layout(rect=[0, 0, 1, 0.93])
    return save_chart(fig, "chart4_pdr_comparison.png")


# ---------------------------------------------------------------------------
# Chart 5: Leaky Bucket Traffic Shaping Impact
# ---------------------------------------------------------------------------
def chart_leaky_bucket(lb_data: dict):
    fig = make_figure(figsize=(14, 9), title="Leaky Bucket Traffic Shaping – E-Learning Video Streams")
    gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.45, wspace=0.35)

    # Extract timeline data
    without_tl = lb_data.get("without_lb", {}).get("timeline", [])
    with_tl    = lb_data.get("with_lb",    {}).get("timeline", [])

    times_w = [r["t"] for r in without_tl]
    times_b = [r["t"] for r in with_tl]
    arr_w   = [r["arrival_rate"] for r in without_tl]
    arr_b   = [r["arrival_rate"] for r in with_tl]
    out_w   = [r["output_rate"]  for r in without_tl]
    out_b   = [r["output_rate"]  for r in with_tl]
    bkt_w   = [r["in_bucket"]    for r in without_tl]
    bkt_b   = [r["in_bucket"]    for r in with_tl]
    drp_w   = [r["dropped"]      for r in without_tl]
    drp_b   = [r["dropped"]      for r in with_tl]

    # ---- Top-Left: Input vs Output WITHOUT Leaky Bucket ----
    ax1 = fig.add_subplot(gs[0, 0])
    apply_dark_style(ax1, title="WITHOUT Leaky Bucket (Bursty)",
                     xlabel="Time (s)", ylabel="Rate (pkt/s)")
    if times_w:
        ax1.plot(times_w, arr_w, color=COLORS["UDP"],  linewidth=2, label="Arrival (Bursty)")
        ax1.plot(times_w, out_w, color=COLORS["high"], linewidth=2, label="Output", linestyle='--')
        ax1.fill_between(times_w, arr_w, out_w, alpha=0.2, color=COLORS["high"])
        ax1.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
                   labelcolor=COLORS["text"], fontsize=9)

    # ---- Top-Right: Input vs Output WITH Leaky Bucket ----
    ax2 = fig.add_subplot(gs[0, 1])
    apply_dark_style(ax2, title="WITH Leaky Bucket (Regulated)",
                     xlabel="Time (s)", ylabel="Rate (pkt/s)")
    if times_b:
        ax2.plot(times_b, arr_b, color=COLORS["UDP"],    linewidth=2, label="Arrival (Bursty)")
        ax2.plot(times_b, out_b, color=COLORS["with_lb"], linewidth=2, label="Output (Steady)")
        ax2.fill_between(times_b, out_b, alpha=0.15, color=COLORS["with_lb"])
        ax2.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
                   labelcolor=COLORS["text"], fontsize=9)

    # ---- Bottom-Left: Bucket Level Over Time ----
    ax3 = fig.add_subplot(gs[1, 0])
    apply_dark_style(ax3, title="Bucket Level (Packets in Buffer)",
                     xlabel="Time (s)", ylabel="Packets in Bucket")
    if times_w:
        ax3.plot(times_w, bkt_w, color=COLORS["without_lb"], linewidth=2, label="Without LB (cap=5)")
    if times_b:
        ax3.plot(times_b, bkt_b, color=COLORS["with_lb"], linewidth=2, label="With LB (cap=50)")
    ax3.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
               labelcolor=COLORS["text"], fontsize=9)

    # ---- Bottom-Right: Cumulative Drops Comparison ----
    ax4 = fig.add_subplot(gs[1, 1])
    apply_dark_style(ax4, title="Cumulative Packet Drops Comparison",
                     xlabel="Time (s)", ylabel="Cumulative Drops")
    if times_w:
        ax4.plot(times_w, drp_w, color=COLORS["without_lb"], linewidth=2.5, label="Without LB")
    if times_b:
        ax4.plot(times_b, drp_b, color=COLORS["with_lb"], linewidth=2.5, label="With LB")
    ax4.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
               labelcolor=COLORS["text"], fontsize=9)

    # Add summary stats as text box
    w_sum = lb_data.get("without_lb", {})
    b_sum = lb_data.get("with_lb",    {})
    stats_text = (
        f"WITHOUT LB: Drop Rate = {w_sum.get('drop_rate_pct', 'N/A')}%\n"
        f"WITH    LB: Drop Rate = {b_sum.get('drop_rate_pct', 'N/A')}%"
    )
    fig.text(0.5, 0.01, stats_text, ha='center', fontsize=10,
             color=COLORS["text_muted"], style='italic',
             bbox=dict(boxstyle='round', facecolor=COLORS["bg_axes"], alpha=0.6))

    fig.tight_layout(rect=[0, 0.04, 1, 0.95])
    return save_chart(fig, "chart5_leaky_bucket_impact.png")


# ---------------------------------------------------------------------------
# Chart 6: Go-Back-N Efficiency
# ---------------------------------------------------------------------------
def chart_gbn_efficiency(gbn_data: dict):
    fig = make_figure(figsize=(14, 9),
                      title="Go-Back-N ARQ – Window Size vs Transmission Efficiency")
    gs  = gridspec.GridSpec(1, 2, figure=fig, wspace=0.35)

    window_sizes = [1, 2, 4, 8, 16, 32, 64]

    # ---- Left: Efficiency vs Window Size per loss rate ----
    ax1 = fig.add_subplot(gs[0])
    apply_dark_style(ax1, title="GBN Efficiency vs Window Size",
                     xlabel="Window Size (W frames)",
                     ylabel="Transmission Efficiency (%)")

    loss_colors = {
        "loss_0pct":  COLORS["low"],
        "loss_5pct":  COLORS["medium"],
        "loss_10pct": COLORS["high"],
        "loss_20pct": "#FF1744",
    }
    loss_labels = {
        "loss_0pct":  "Loss = 0%",
        "loss_5pct":  "Loss = 5%",
        "loss_10pct": "Loss = 10%",
        "loss_20pct": "Loss = 20%",
    }

    for key, color in loss_colors.items():
        if key in gbn_data:
            effs = gbn_data[key]["efficiencies"]
            ws   = gbn_data[key]["window_sizes"]
            ax1.plot(ws, effs, color=color, linewidth=STYLE["linewidth"],
                     marker='o', markersize=7, label=loss_labels[key])
            ax1.fill_between(ws, effs, alpha=0.08, color=color)

    ax1.set_xscale('log', base=2)
    ax1.set_xlim(1, 64)
    ax1.set_ylim(0, 105)
    ax1.set_xticks(window_sizes)
    ax1.set_xticklabels(window_sizes, color=COLORS["text"])
    ax1.axhline(y=100, color='white', linestyle=':', linewidth=1, alpha=0.3)
    ax1.legend(facecolor=COLORS["bg"], edgecolor=COLORS["grid"],
               labelcolor=COLORS["text"], fontsize=10)

    # ---- Right: Retransmissions vs Window Size ----
    ax2 = fig.add_subplot(gs[1])
    apply_dark_style(ax2, title="Retransmissions vs Window Size (10% Loss)",
                     xlabel="Window Size (W frames)",
                     ylabel="Total Retransmissions")

    if "loss_10pct" in gbn_data:
        retransmits = gbn_data["loss_10pct"]["retransmissions"]
        ws          = gbn_data["loss_10pct"]["window_sizes"]
        bars = ax2.bar(range(len(ws)), retransmits,
                       color=[COLORS["TCP"] if r < 15 else
                              COLORS["medium"] if r < 30 else
                              COLORS["high"] for r in retransmits],
                       alpha=0.85, edgecolor=COLORS["bg"])
        ax2.set_xticks(range(len(ws)))
        ax2.set_xticklabels([f"W={w}" for w in ws], color=COLORS["text"])

        for bar, val in zip(bars, retransmits):
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                     str(val), ha='center', va='bottom',
                     color=COLORS["text"], fontsize=9, fontweight='bold')

    ax2.annotate('Larger windows → more\nretransmissions on loss\n(GBN behavior)',
                 xy=(5, max(retransmits) * 0.7 if "loss_10pct" in gbn_data and gbn_data["loss_10pct"]["retransmissions"] else 10),
                 fontsize=9, color=COLORS["high"], style='italic',
                 bbox=dict(boxstyle='round,pad=0.3', facecolor=COLORS["bg"], alpha=0.7))

    fig.tight_layout(rect=[0, 0, 1, 0.95])
    return save_chart(fig, "chart6_gbn_efficiency.png")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def generate_all_charts():
    print("\n" + "="*65)
    print("  Chart Generator – E-Learning Network Performance Analysis")
    print("="*65)

    # Load datasets
    def load_json(path):
        if os.path.exists(path):
            with open(path, 'r') as f:
                return json.load(f)
        print(f"  [!] Not found: {path}. Run experiment_runner.py first.")
        return None

    protocol_data  = load_json(os.path.join(METRICS_DIR, "protocol_comparison.json"))
    congestion_data= load_json(os.path.join(METRICS_DIR, "congestion_analysis.json"))
    gbn_data       = load_json(os.path.join(ALGO_DIR,    "gbn_experiment.json"))
    lb_data        = load_json(os.path.join(ALGO_DIR,    "leaky_bucket_experiment.json"))

    # If data files not found, generate them first
    if not all([protocol_data, congestion_data, gbn_data, lb_data]):
        print("  Running experiment_runner.py first...")
        sys.path.insert(0, os.path.dirname(__file__))
        import experiment_runner
        master = experiment_runner.run_all_experiments()
        protocol_data   = master["protocol_comparison"]
        congestion_data = master["congestion_analysis"]
        gbn_data        = master["gbn_experiment"]
        lb_data         = master["leaky_bucket_experiment"]

    charts = []
    print("\n  Generating charts...")

    print("\n  [1/6] Throughput vs User Load...")
    charts.append(chart_throughput_vs_load(protocol_data))

    print("  [2/6] Delay vs Traffic Load...")
    charts.append(chart_delay_vs_load(protocol_data, congestion_data))

    print("  [3/6] Packet Loss Rate vs User Count...")
    charts.append(chart_packet_loss(congestion_data))

    print("  [4/6] PDR Comparison (Bar + Radar)...")
    charts.append(chart_pdr_comparison(protocol_data))

    print("  [5/6] Leaky Bucket Traffic Shaping Impact...")
    charts.append(chart_leaky_bucket(lb_data))

    print("  [6/6] GBN Window Size vs Efficiency...")
    charts.append(chart_gbn_efficiency(gbn_data))

    print("\n" + "="*65)
    print(f"  [✓] All 6 charts saved to: {GRAPHS_DIR}")
    print("  [✓] Charts list:")
    for i, c in enumerate(charts, 1):
        print(f"        {i}. {os.path.basename(c)}")
    print("="*65)

    return charts


if __name__ == "__main__":
    generate_all_charts()
