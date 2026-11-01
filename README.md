# NetTrack - Network Performance Analysis of a University E-Learning System
### Java Full Stack Application (React.js + Java Spring Boot + MySQL + NS-2)

> **Course:** Computer Networks & Internet Protocols (CNIP)  
> **Architecture:** Java Spring Boot REST API · Spring Data JPA & Hibernate · MySQL 8.0 · React.js · NS-2 & TCL · AWK

---

## 1. Project Purpose & Overview

A university provides online classes, video lectures, a Learning Management System (LMS), student portals, and examination portals. When 10, 50, or 100 students access these services concurrently, network traffic surges, causing buffer overflows, packet loss, increased delay, and throughput degradation.

**NetTrack** is a full-stack network simulation and performance tracker that:
1. Simulates campus traffic loads for **10, 50, and 100 students** using **NS-2 and TCL**.
2. Analyzes network metrics using high-speed **AWK scripts**.
3. Persists simulation runs, flow control benchmarks, and device topology in a **MySQL** database using **Spring Data JPA & Hibernate**.
4. Provides robust **Spring Boot REST APIs** for dynamic simulation execution and querying.
5. Delivers a modern **React.js & HTML5 visual dashboard** with interactive network topology, packet signal animations, and visual demonstrations for **Sliding Window**, **Go-Back-N ARQ**, and **Leaky Bucket** traffic shaping.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Java 17/25, Spring Boot 3.3.5, Spring MVC REST APIs, Maven |
| **Database & ORM** | MySQL 8.0, Spring Data JPA, Hibernate, HikariCP (with auto-fallback) |
| **Frontend** | React 18, Modern HTML5, CSS3 Variables, JavaScript ES6+ |
| **Network Simulation** | NS-2 (Network Simulator 2), TCL, AWK Trace Analyzers |
| **Data & Graphing** | Python 3, Matplotlib (High-Resolution Charts) |

---

## 3. Spring Boot REST API Endpoints

All APIs are exposed under `http://localhost:8080/api`:

### Simulation APIs (`/api/simulation`)
* `GET /api/simulation/metrics?users={10|50|100}&protocol={TCP|UDP}`  
  Returns live throughput, delay, packet loss rate (PLR), and delivery ratio (PDR) from the MySQL database.
* `POST /api/simulation/run`  
  Executes an NS-2 simulation for the given student count and protocol, records trace metrics, persists the run into MySQL, and returns the saved entity.
* `GET /api/simulation/history`  
  Returns all past simulation runs stored in the MySQL database.
* `GET /api/simulation/all`  
  Returns pre-computed benchmark matrix for 10, 50, and 100 students across TCP Reno and UDP.

### Algorithm APIs (`/api/algorithms`)
* `GET /api/algorithms/sliding-window?windowSize={4|16|64}`  
  Calculates line utilization and concurrent pipeline transmission parameters.
* `GET /api/algorithms/go-back-n?windowSize={4|8}&drop={true|false}`  
  Simulates packet loss and returns Go-Back-N retransmission frame sequences.
* `GET /api/algorithms/leaky-bucket?burst={true|false}&capacity={100}&leakRate={1000}`  
  Simulates buffer queue dynamics and Constant Bit Rate (CBR) traffic shaping.
* `GET /api/algorithms/benchmarks`  
  Retrieves algorithm comparative benchmarks stored in MySQL.

### Topology APIs (`/api/topology`)
* `GET /api/topology/status?users={10|50|100}`  
  Returns active devices, gateway router queue buffer occupancy, and link congestion state.
* `GET /api/topology/nodes`  
  Retrieves network device inventory (Server, Router, Switch, AP, Laptops).

### System & Health (`/api/system`)
* `GET /api/system/status`  
  Returns Spring Boot version, database connectivity status (MySQL/H2), and active record counts.

---

## 4. How to Run the Project

### Option A: One-Click Runner (Windows)
Double-click `run_backend.bat` or run in terminal:
```powershell
.\run_backend.bat
```
This automatically boots the Spring Boot backend on **http://localhost:8080** and serves the full frontend dashboard.

### Option B: Maven Command
```powershell
.\mvnw.cmd spring-boot:run
```
Or package and run the standalone JAR:
```powershell
.\mvnw.cmd clean package -DskipTests
java -jar target/nettrack-backend-1.0.0.jar
```

### Option C: React Frontend (Vite)
To run the dedicated React application:
```powershell
cd frontend
npm install
npm run dev
```
Opens on **http://localhost:3000** with automatic proxy to the Spring Boot backend on port 8080.

---

## 5. MySQL Database Configuration

Configuration in `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/nettrack_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=root
```

To configure your custom MySQL password, set the environment variable:
```powershell
$env:DB_PASSWORD="your_password"
```
Or edit `application.properties` directly.

> **Note:** NetTrack includes intelligent auto-fallback: if your local MySQL instance has a custom password or is temporarily offline, Spring Boot automatically boots in embedded MySQL-mode without crashing, ensuring all features remain 100% accessible!

---

## 6. NS-2 Simulation Results Summary

| Scenario | Protocol | Speed (Throughput) | Average Delay | Packet Loss | Delivery Ratio | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **10 Students** | TCP Reno | 4.61 Mbps | 63.96 ms | 0.55% | 99.45% | 🟢 Optimal Flow |
| **10 Students** | UDP CBR | 4.61 Mbps | 63.83 ms | 0.70% | 99.30% | 🟢 Smooth Stream |
| **50 Students** | TCP Reno | 78.24 Mbps | 65.20 ms | 5.46% | 94.54% | 🟡 Moderate Load |
| **50 Students** | UDP CBR | 78.91 Mbps | 65.15 ms | 5.51% | 94.49% | 🟡 Queue Building |
| **100 Students** | TCP Reno | 453.54 Mbps | 62.44 ms | 17.04% | 82.96% | 🔴 Congested |
| **100 Students** | UDP CBR | 454.12 Mbps | 62.41 ms | 17.12% | 82.88% | 🔴 High Loss |

* **Leaky Bucket Traffic Shaping:** Successfully prevents buffer overflow, reducing packet loss from **57.7% down to 0%**.
* **Sliding Window:** Increases bandwidth utilization from 38% ($W=4$) up to **98%** ($W=64$).
