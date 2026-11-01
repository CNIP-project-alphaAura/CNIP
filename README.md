# Network Performance Analysis of a University E-Learning System

> **Course:** Computer Networks & Internet Protocols (CNIP)  
> **Tool:** NS-2 (Network Simulator 2) · AWK · Python

---

## 1. Problem Statement

A university provides online classes, video lectures, a Learning Management System (LMS), a student portal, and an examination portal. A large number of students accessing these services simultaneously can generate heavy network traffic and cause congestion, packet loss, delay, and reduced throughput. The project develops a network performance analysis system to study the effect of user load and traffic conditions on e-learning communication.

---

## 2. System Implementation

The e-learning server, students, and network devices are represented as nodes in **NS-2**:
- **E-Learning Server (Node 0):** Provides LMS, exam, and video services.
- **Campus Router (Node 1):** Connects the campus network to the server through a bottleneck link.
- **Student Nodes (Nodes 2..N):** Students accessing the different services concurrently.

Different numbers of users and traffic rates are generated to create **low, medium, and high traffic conditions**:
- **Low Traffic:** 10 concurrent students
- **Medium Traffic:** 30 concurrent students
- **High Traffic:** 100 concurrent students

---

## 3. Concepts & Algorithms Covered

| Concept / Algorithm | Implementation in NS-2 | Purpose in E-Learning System |
|---|---|---|
| **TCP vs UDP** | TCP (FTP) & UDP (CBR) agents | Compares reliable delivery (LMS/Exams) vs low-latency streaming (Video/Portal) |
| **Sliding Window** | TCP window parameter (`window_`) | Controls how many unacknowledged frames can be transmitted |
| **Go-Back-N ARQ** | Window flow control under packet loss | Retransmits lost frames and subsequent frames upon timeout |
| **Leaky Bucket** | Traffic shaping buffer and constant leak rate | Smooths bursty video lecture traffic to prevent buffer overflow and drops |
| **Congestion & Data Rate** | Varying student count & transmission rates | Analyzes how heavy user load leads to bottleneck link saturation |
| **Throughput** | AWK trace analysis (`throughput.awk`) | Measures total data successfully received per unit time (Kbps/Mbps) |
| **End-to-End Delay** | AWK trace analysis (`delay.awk`) | Measures time taken for packets to travel from source to destination (ms) |
| **Packet Loss & PDR** | AWK trace analysis (`packet_loss.awk`) | Evaluates Packet Loss Rate (PLR %) and Packet Delivery Ratio (PDR %) |

---

## 4. Project Structure

```
CNIP/
├── ns2_simulations/             # NS-2 Simulation Scripts (TCL)
│   ├── elearning_topology.tcl  # E-Learning system with LMS, Video, Exam, Portal
│   ├── go_back_n.tcl           # Sliding Window & Go-Back-N ARQ demo
│   └── leaky_bucket.tcl        # Leaky Bucket traffic shaping demo
│
├── awk_scripts/                 # Trace Analyzers (AWK)
│   ├── throughput.awk          # Computes system & flow throughput (Kbps)
│   ├── delay.awk               # Computes average end-to-end delay (ms)
│   └── packet_loss.awk         # Computes packet loss rate (PLR) and PDR (%)
│
├── python_engine/               # Performance Graphs & Data Engine
│   ├── generate_charts.py      # Generates the 6 performance comparison charts
│   ├── experiment_runner.py    # Runs automated simulation experiments
│   ├── algorithm_simulators.py # Sliding Window & Leaky Bucket algorithms
│   └── ns2_trace_analyzer.py   # Trace file parser
│
├── web_dashboard/               # Simple Project Viewer (HTML/CSS)
│   ├── index.html              # Clean single-page project report & chart viewer
│   ├── styles.css              # Simple styling
│   └── app.js                  # Lightweight helper
│
└── outputs/                     # Generated outputs
    ├── traces/                 # NS-2 trace files (.tr)
    ├── metrics/                # Performance metrics (JSON)
    ├── algorithm_data/         # GBN and Leaky Bucket results (JSON)
    └── graphs/                 # 6 performance comparison charts (PNG)
```

---

## 5. How to Run

### Step 1: Run NS-2 Simulations
To run the simulations in NS-2 (Linux / WSL / Ubuntu):

```bash
cd ns2_simulations

# 1. Main E-Learning simulation (pass number of students: 10, 30, or 100)
ns elearning_topology.tcl 10

# 2. Sliding Window & Go-Back-N simulation
ns go_back_n.tcl

# 3. Leaky Bucket traffic shaping simulation
ns leaky_bucket.tcl
```

### Step 2: Analyze Traces with AWK
Run the AWK scripts on the generated trace files (`.tr`):

```bash
cd ../awk_scripts

# Throughput calculation
awk -f throughput.awk ../ns2_simulations/elearning_output.tr

# End-to-end delay calculation
awk -f delay.awk ../ns2_simulations/elearning_output.tr

# Packet Loss Rate and Delivery Ratio
awk -f packet_loss.awk ../ns2_simulations/elearning_output.tr
```

### Step 3: Generate Graphs (Python)
To generate all 6 comparison graphs:

```bash
python python_engine/generate_charts.py
```
The charts will be saved in `outputs/graphs/`:
1. `chart1_throughput_vs_load.png` — Throughput vs Traffic Load (TCP vs UDP)
2. `chart2_delay_vs_load.png` — End-to-End Delay vs User Load
3. `chart3_packet_loss_vs_load.png` — Packet Loss Rate vs User Count
4. `chart4_pdr_comparison.png` — Packet Delivery Ratio (PDR) Comparison
5. `chart5_leaky_bucket_impact.png` — Leaky Bucket Traffic Smoothing & Drop Reduction
6. `chart6_gbn_efficiency.png` — Go-Back-N Window Size vs Transmission Efficiency

### Step 4: View Project Dashboard
Open `web_dashboard/index.html` in any web browser to view the complete project report, system architecture, and generated graphs.

---

## 6. Key Observations & Results Summary

1. **TCP vs UDP Performance:**
   - TCP adjusts its transmission rate using congestion control, ensuring 100% reliable delivery for LMS submissions and Online Exams.
   - UDP maintains steady transmission for Video Lectures and Portal traffic, but suffers packet drops when the network link becomes congested.

2. **Impact of User Load:**
   - Under **Low Load (10 users)**: Throughput is stable, packet loss is under 1%, and end-to-end delay remains under 65 ms.
   - Under **Medium Load (30 users)**: Traffic increases, buffer occupancy rises, and loss rate reaches ~4.5%.
   - Under **High Load (100 users)**: The bottleneck link saturates, causing congestion, queue overflow, and packet loss exceeding 17%.

3. **Go-Back-N ARQ (Sliding Window):**
   - Larger window sizes ($W=16, 64$) increase throughput when loss is low, but lead to higher retransmission overhead when packet loss occurs.

4. **Leaky Bucket Traffic Shaping:**
   - Unregulated video traffic causes heavy bursts (4 Mbps) that overflow router queues and cause over 50% packet drops.
   - The Leaky Bucket algorithm regulates the flow to a steady 1 Mbps leak rate, eliminating buffer overflow and dramatically reducing packet drops.
