# Network Performance Analysis of a University E-Learning System

> **Course:** Computer Networks & Internet Protocols (CNIP)  
> **Technologies:** NS-2 (Network Simulator 2) · TCL · AWK · Python · Matplotlib · HTML/CSS/JavaScript

---

## 1. Project Purpose & Problem Statement

A university provides online classes, video lectures, a Learning Management System (LMS), a student portal, and an examination portal. A large number of students accessing these services simultaneously can generate heavy network traffic and cause network congestion, packet loss, increased delay, and reduced throughput.

This project develops a complete, user-friendly network performance analysis system to evaluate how user load and traffic conditions impact e-learning communication, and demonstrates how **Sliding Window**, **Go-Back-N ARQ**, and **Leaky Bucket** algorithms maintain reliability and prevent congestion.

---

## 2. Technologies Used

* **NS-2 (Network Simulator 2):** Core discrete-event network simulator.
* **TCL:** Scripts defining network topology, traffic generators, and protocol parameters.
* **AWK:** High-speed trace file parsing to compute throughput, delay, and packet delivery ratio.
* **Python & Matplotlib:** Generating publication-quality comparative performance graphs.
* **HTML, CSS, JavaScript:** Modern, professional, responsive interactive dashboard with real-time algorithm visualizers.

---

## 3. Main Features

### 1. Network Simulation
* Simulates 1 university server, 1 campus core router, and multiple student computers.
* Models three realistic traffic loads:
  * **Low Load:** 10 concurrent students (normal operating hours)
  * **Medium Load:** 50 concurrent students (peak lecture hours)
  * **High Load:** 100 concurrent students (exam submission / registration rush)
* Evaluates how throughput, delay, and packet loss degrade under heavy student loads.

### 2. TCP vs UDP Protocol Comparison
* **TCP (LMS & Online Exams):** Connection-oriented, 100% reliable delivery, automatic retransmissions, flow control.
* **UDP (Video Lectures & Student Portal):** Connectionless, ultra-low latency, prioritizes smooth streaming over occasional dropped packets.

### 3. Sliding Window Demonstration
* Interactive step-by-step visualizer demonstrating how a sender transmits multiple packets ($W = 4$ or $W = 8$) before waiting for acknowledgements (ACKs).
* Shows the sender window visibly sliding forward as ACKs return from the server.

### 4. Go-Back-N ARQ Demonstration
* Visualizes what happens when a packet is dropped due to network buffer congestion.
* Shows the receiver discarding out-of-order frames, sender timer expiration, and the sender "going back" to retransmit the lost packet and all subsequent frames.

### 5. Leaky Bucket Traffic Shaping
* Models bursty video streaming traffic (4 Mbps spikes) flooding a router buffer.
* Demonstrates how the Leaky Bucket buffers bursts and leaks packets at a steady **1 Mbps constant rate**, cutting packet loss from **57.7% down to 0%**.

### 6. Performance Analysis (Real Metrics)
* **Throughput (Network Speed):** Total data successfully received per second (Kbps / Mbps).
* **Packet Loss (Lost Data):** Percentage of packets dropped due to buffer overflow.
* **End-to-End Delay (Waiting Time):** Latency from student to server (ms).
* **Packet Delivery Ratio (PDR):** Success rate percentage of delivered data.

---

## 4. Interactive Dashboard Structure

The project includes an interactive web dashboard:
* **Home Page:** Executive summary, problem statement, and 4 quick-metric KPI cards.
* **Topology:** Visual schematic of the University Server, Router, and Student access links.
* **Simulation Center:** Select 10, 50, or 100 students and TCP/UDP; run live simulation with animated packet pipe.
* **TCP vs UDP:** Side-by-side protocol feature comparison and performance table.
* **Sliding Window:** Step-by-step interactive frame transmission animator.
* **Go-Back-N:** Interactive packet loss injection and retransmission recovery visualizer.
* **Leaky Bucket:** Interactive water bucket widget with burst valve and steady leak tap.
* **Performance Graphs:** 6 Matplotlib comparison charts with plain-English takeaways.
* **Results & Glossary:** Technical glossary in simple English and complete NS-2/AWK commands.

---

## 5. Project Directory Structure

```
CNIP/
├── index.html                   # Modern interactive web dashboard (Root)
├── styles.css                   # Professional responsive CSS design system
├── app.js                       # Interactive simulation & algorithm visualizers
│
├── ns2_simulations/             # NS-2 TCL Simulation Scripts
│   ├── elearning_topology.tcl  # E-Learning system with LMS, Video, Exam, Portal
│   ├── go_back_n.tcl           # Sliding Window & Go-Back-N ARQ demo
│   └── leaky_bucket.tcl        # Leaky Bucket traffic shaping demo
│
├── awk_scripts/                 # Trace Analyzers (AWK)
│   ├── throughput.awk          # Computes system & per-flow throughput (Kbps)
│   ├── delay.awk               # Computes average end-to-end delay (ms)
│   └── packet_loss.awk         # Computes packet loss rate (PLR) and PDR (%)
│
├── python_engine/               # Performance Graphs & Data Engine
│   ├── generate_charts.py      # Generates 6 performance comparison charts
│   ├── experiment_runner.py    # Runs automated simulation experiments
│   ├── algorithm_simulators.py # Sliding Window & Leaky Bucket simulators
│   └── ns2_trace_analyzer.py   # Trace file parser
│
├── outputs/                     # Generated outputs
    ├── traces/                 # NS-2 trace files (.tr)
    ├── metrics/                # Performance metrics datasets (JSON)
    ├── algorithm_data/         # GBN and Leaky Bucket results (JSON)
    └── graphs/                 # 6 clean comparison charts (PNG)
```

---

## 6. How to Run the Project

### Method A: View the Interactive Dashboard
Double-click `index.html` in your browser, or run a local Python HTTP server:

```bash
python -m http.server 8000
```
Open **[http://localhost:8000/](http://localhost:8000/)** to access the full interactive dashboard.

### Method B: Run NS-2 Simulations (Linux / WSL / Ubuntu)
```bash
cd ns2_simulations

# Main E-Learning simulation (pass student count: 10, 50, or 100)
ns elearning_topology.tcl 10
ns elearning_topology.tcl 50
ns elearning_topology.tcl 100

# Run Go-Back-N ARQ simulation
ns go_back_n.tcl

# Run Leaky Bucket Traffic Shaping simulation
ns leaky_bucket.tcl
```

### Method C: Run AWK Trace Analysis
```bash
cd awk_scripts

# Throughput Analysis
awk -f throughput.awk ../ns2_simulations/elearning_output.tr

# End-to-End Delay Analysis
awk -f delay.awk ../ns2_simulations/elearning_output.tr

# Packet Loss Rate & PDR Analysis
awk -f packet_loss.awk ../ns2_simulations/elearning_output.tr
```

### Method D: Regenerate Performance Graphs
```bash
python python_engine/generate_charts.py
```
This generates all 6 comparison graphs into `outputs/graphs/`.

---

## 7. Performance Summary & Findings

| Students | Protocol | Throughput | Average Delay | Packet Loss (PLR) | Packet Delivery Ratio (PDR) |
|---|---|---|---|---|---|
| **10 Students** | **TCP** | 4.61 Mbps | 63.96 ms | **0.55%** | **99.45%** |
| *(Low Load)* | **UDP** | 4.61 Mbps | 63.83 ms | **0.70%** | **99.30%** |
| **50 Students** | **TCP** | 78.24 Mbps | 65.20 ms | **5.46%** | **94.54%** |
| *(Medium Load)* | **UDP** | 78.91 Mbps | 65.15 ms | **5.51%** | **94.49%** |
| **100 Students** | **TCP** | 453.54 Mbps | 62.44 ms | **17.04%** | **82.96%** |
| *(High Load)* | **UDP** | 454.12 Mbps | 62.41 ms | **17.12%** | **82.88%** |

### Key Conclusions:
1. **TCP vs UDP:** TCP ensures 100% data integrity for critical services (LMS and Exams) via retransmissions; UDP provides low latency for Video Lectures.
2. **Congestion Point:** As student count scales past 50, router queues saturate, and packet drops jump to over 17% under 100 concurrent students without traffic control.
3. **Leaky Bucket Effectiveness:** Unregulated video bursts caused a 57.7% drop rate; shaping traffic with a Leaky Bucket reduced packet drops to **0%**, maintaining a stable 1 Mbps throughput.
4. **Go-Back-N Window Trade-off:** Increasing the window from $W=4$ to $W=16$ significantly improves throughput, but larger windows ($W=64$) cause substantial retransmission overhead when drops occur.
