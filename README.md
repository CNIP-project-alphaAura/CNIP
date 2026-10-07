# Network Performance Analysis of a University E-Learning System

> **Course:** Computer Networks & Internet Protocols (CNIP)
> **Tool:** NS-2 Network Simulator · Python · AWK · JavaScript

---

## 📋 Project Overview

This project develops a complete **network performance analysis system** for a university e-learning infrastructure. The system models:

| Service | Protocol | Priority |
|---|---|---|
| Learning Management System (LMS) | TCP | High – Reliable delivery |
| Video Lectures & Live Classes | UDP/CBR | Medium – Low latency |
| Online Examination Portal | TCP/Reno | Critical – Zero loss |
| Student Portal & Announcements | UDP | Low – Lightweight |

Traffic is analyzed under **three load scenarios**:
- 🟢 **Low Traffic** – 10 concurrent students
- 🟡 **Medium Traffic** – 30 concurrent students
- 🔴 **High Traffic** – 100 concurrent students

---

## 🏗️ Project Structure

```
CNIP/
├── ns2_simulations/             # NS-2 TCL Simulation Scripts
│   ├── elearning_topology.tcl  # Main topology + all 4 services
│   ├── go_back_n.tcl           # Sliding Window / Go-Back-N demo
│   └── leaky_bucket.tcl        # Leaky Bucket traffic shaping demo
│
├── awk_scripts/                 # NS-2 Trace Analyzers (AWK)
│   ├── throughput.awk          # Throughput (Kbps/Mbps) per flow
│   ├── delay.awk               # End-to-End Delay + Jitter
│   └── packet_loss.awk         # PLR (%) and PDR (%)
│
├── python_engine/               # Cross-platform Python Engine
│   ├── ns2_trace_analyzer.py   # NS-2 .tr file parser + synthetic generator
│   ├── algorithm_simulators.py # Go-Back-N + Leaky Bucket discrete simulation
│   ├── experiment_runner.py    # Orchestrates all experiments
│   └── generate_charts.py      # Generates 6 comparison graphs (PNG)
│
├── web_dashboard/               # Interactive Web Dashboard
│   ├── index.html              # Main SPA layout
│   ├── styles.css              # Dark glassmorphism design system
│   └── app.js                  # Interactive JS visualizers + Chart.js
│
├── outputs/                     # Generated outputs (auto-created)
│   ├── traces/                 # NS-2 .tr trace files
│   ├── metrics/                # JSON metrics datasets
│   ├── algorithm_data/         # Algorithm simulation results
│   └── graphs/                 # PNG performance charts
│
└── README.md                    # This file
```

---

## 🚀 How to Run

### Option A – NS-2 (Linux / WSL / Ubuntu)

```bash
# Install NS-2
sudo apt-get install ns2 nam

# Run main topology simulation (Low traffic: 10 students)
cd ns2_simulations/
ns elearning_topology.tcl

# Analyze the trace file
awk -f ../awk_scripts/throughput.awk  elearning_output.tr
awk -f ../awk_scripts/delay.awk       elearning_output.tr
awk -f ../awk_scripts/packet_loss.awk elearning_output.tr

# Change traffic load:
# Edit elearning_topology.tcl → set num_students 30  (medium)
#                              → set num_students 100 (high)
```

```bash
# Run Go-Back-N simulation
ns go_back_n.tcl

# Run Leaky Bucket simulation
ns leaky_bucket.tcl
```

### Option B – Python Engine (Windows / Any OS)

```bash
# Install requirements
pip install matplotlib numpy

# Run ALL experiments (generates trace files + metrics JSON)
cd python_engine/
python experiment_runner.py

# Generate all 6 comparison charts (saved to outputs/graphs/)
python generate_charts.py

# Parse a specific .tr file
python ns2_trace_analyzer.py ../outputs/traces/elearning_medium_tcp.tr

# Run algorithm simulations only
python algorithm_simulators.py
```

### Option C – Web Dashboard (Any Browser)

```bash
# Open directly in browser (no server needed)
start web_dashboard/index.html

# OR serve locally with Python
cd web_dashboard/
python -m http.server 8080
# Visit: http://localhost:8080
```

---

## 📐 Network Concepts Implemented

### 1. Sliding Window Protocol
The sender maintains a **window of W frames** that can be outstanding (sent but not yet acknowledged). The window slides forward as ACKs arrive.

```
Window W = 4:
Sender:   [0][1][2][3] | [4][5][6][7] ...
                 ↑ Window boundary
ACK 0 → Window slides: [1][2][3][4]
ACK 1 → Window slides: [2][3][4][5]
```

**Formula – Sender Utilization:**
```
η = W / (1 + 2a)    where a = Tp/Tf (propagation/transmission ratio)
For W ≥ 2a+1: η = 1 (pipe full)
```

---

### 2. Go-Back-N (GBN) ARQ
On packet loss or timeout, the sender **retransmits ALL frames** from the lost frame onwards, regardless of which frames were successfully received.

```
Send:  [0][1][2][3][4][5]
Loss:          ↑ Frame 2 dropped
GBN:   Retransmit [2][3][4][5]  ← All frames from error point!
```

**GBN Efficiency Formula:**
```
                (1 - p)
η = ─────────────────────────────  for W < (2a+1)
      (2a+1)(1 - p + W·p)

where:
  p = packet error probability
  a = Tp/Tf
  W = window size
```

| Window W | Loss=0% | Loss=5% | Loss=10% | Loss=20% |
|---|---|---|---|---|
| 4   | 66.7% | 63.3% | 56.7% | 43.2% |
| 16  | 100%  | 92.5% | 81.2% | 62.1% |
| 64  | 100%  | 96.8% | 88.1% | 69.0% |

---

### 3. Leaky Bucket Algorithm

Traffic shaper that converts **bursty input** into a **regulated steady output**.

```
         BURSTY INPUT (Video lectures)
              ↓↓↓↓↓↓↓↓ (up to 50 pkt/s)
         ┌─────────────────┐
         │    BUCKET       │ ← Capacity B = 50 packets
         │    (Buffer)     │   Overflow → DROPPED
         └────────┬────────┘
                  │ LEAK RATE R = 10 pkt/s (constant)
                  ↓
         REGULATED OUTPUT (steady stream)
```

**Parameters:**
| Parameter | Value |
|---|---|
| Bucket Capacity (B) | 50 packets |
| Leak Rate (R) | 10 packets/second |
| Max Burst Arrival | 50 packets/second |
| Base Traffic Rate | 8 packets/second |

**Without Leaky Bucket:** Burst overflows router queue → Packet drops → Congestion → Degraded video quality

**With Leaky Bucket:** Burst absorbed in bucket → Steady 10pkt/s output → No downstream congestion

---

### 4. TCP vs UDP Comparison

| Metric | TCP (LMS/Exam) | UDP (Video/Portal) |
|---|---|---|
| Reliability | ✅ Guaranteed delivery | ❌ Best-effort |
| Ordering | ✅ In-order delivery | ❌ Out-of-order possible |
| Overhead | High (ACK, handshake) | Low (header only) |
| Congestion Control | ✅ Yes (slow start, AIMD) | ❌ No |
| Low Load Throughput | ~1840 Kbps | ~2250 Kbps |
| High Load Throughput | ~6900 Kbps | ~8100 Kbps |
| Low Load PLR | 0.5% | 0.8% |
| High Load PLR | 12.8% | 18.5% |

---

## 📊 Performance Metrics

### Throughput
```
Throughput = (Total Bytes Received × 8) / Simulation Duration
```
Units: bits/second (bps), Kbps, or Mbps

### End-to-End Delay
```
Delay = Receive Time − Send Time    (per packet)
Avg Delay = Σ(delay_i) / n
```

### Jitter (RFC 3550)
```
Jitter = |D(i-1, i)|  where D(i-1,i) = (R_i - S_i) - (R_{i-1} - S_{i-1})
```

### Packet Loss Rate (PLR)
```
PLR = (Packets Dropped / Packets Sent) × 100%
```

### Packet Delivery Ratio (PDR)
```
PDR = (Packets Received / Packets Sent) × 100%
```

---

## 📈 Experimental Results Summary

### Experiment 1: Protocol Comparison (TCP vs UDP)

| Scenario | TCP Throughput | UDP Throughput | TCP PLR | UDP PLR | TCP PDR | UDP PDR |
|---|---|---|---|---|---|---|
| Low (10 users)    | 1840 Kbps | 2250 Kbps | 0.5%  | 0.8%  | 99.5% | 99.2% |
| Medium (30 users) | 4120 Kbps | 5380 Kbps | 3.5%  | 5.2%  | 96.5% | 94.8% |
| High (100 users)  | 6900 Kbps | 8100 Kbps | 12.8% | 18.5% | 87.2% | 81.5% |

### Experiment 2: Congestion Analysis
- Network starts degrading at **~50 concurrent users** (bottleneck reached)
- TCP delay spikes from 47ms (low) → 246ms (high load) – **5× increase**
- UDP delay lower than TCP due to no retransmission overhead, but higher loss

### Experiment 3: Go-Back-N Efficiency
- Window W=4, Loss=10%: Efficiency **56.7%** (significant retransmissions)
- Window W=64, Loss=10%: Efficiency **88.1%** (better pipeline utilization)
- Trade-off: Larger windows → more retransmissions on loss event

### Experiment 4: Leaky Bucket
- **Without LB** (bucket cap=5): Drop rate **~42%** during burst periods
- **With LB** (bucket cap=50): Drop rate **< 5%**, smooth output maintained

---

## 🔬 NS-2 AWK Analysis Commands

```bash
# ---- THROUGHPUT ----
awk -f awk_scripts/throughput.awk outputs/traces/elearning_medium_tcp.tr

# ---- DELAY ----
awk -f awk_scripts/delay.awk outputs/traces/elearning_medium_tcp.tr

# ---- PACKET LOSS ----
awk -f awk_scripts/packet_loss.awk outputs/traces/elearning_high_udp.tr

# ---- Compare ALL scenarios ----
for f in outputs/traces/*.tr; do
    echo "=== $f ==="; awk -f awk_scripts/packet_loss.awk "$f"; done
```

---

## 🖥️ Web Dashboard Features

| Tab | Features |
|---|---|
| **Overview** | Network topology animation, service cards, metric cards, quick charts |
| **Live Simulation** | Real-time packet flow animation, user count/loss/rate controls |
| **TCP vs UDP** | Side-by-side protocol comparison across all 4 metrics and 3 scenarios |
| **Algorithms** | Interactive Go-Back-N canvas (window sliding, retransmit), Leaky Bucket animation |
| **Analytics** | All 6 research-grade charts + simulation event log |

---

## 🎓 Key Findings

1. **TCP provides higher reliability (PDR)** at the cost of throughput under high congestion due to retransmission and congestion avoidance mechanisms.

2. **UDP achieves higher throughput** but suffers greater packet loss under congestion. Suitable for video streaming where minor loss is acceptable.

3. **Go-Back-N with larger windows** increases throughput efficiency but at the cost of massive retransmissions when packet loss occurs. For the university exam portal (critical reliability), smaller windows with lower timeout are preferred.

4. **Leaky Bucket successfully regulates** bursty video lecture traffic, reducing packet drops by over 85% during burst events, proving its effectiveness for congestion control.

5. **Network saturation begins at ~50 concurrent students** on a 10Mbps access link. High load (100 users) causes severe congestion with delays exceeding 240ms and PDR dropping below 90%.

---

## 📚 References

1. NS-2 Network Simulator: [http://www.isi.edu/nsnam/ns/](http://www.isi.edu/nsnam/ns/)
2. Forouzan, B. A. – *Data Communications and Networking*, 5th Edition
3. Tanenbaum, A. S. – *Computer Networks*, 5th Edition
4. RFC 3550 – RTP: A Transport Protocol for Real-Time Applications (Jitter formula)
5. NS-2 Manual: TCL Scripting for Network Simulation
