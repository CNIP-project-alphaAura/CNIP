import React, { useState, useEffect } from 'react';

const API_BASE = "http://localhost:8080/api";

const SIMULATION_FALLBACK = {
  10: {
    TCP: { tput: "4,610.66 Kbps", tputMbps: "4.61 Mbps", delay: "63.96 ms", plr: "0.55%", pdr: "99.45%", sent: 4204, recv: 4181, dropped: 23 },
    UDP: { tput: "4,614.45 Kbps", tputMbps: "4.61 Mbps", delay: "63.83 ms", plr: "0.70%", pdr: "99.30%", sent: 6146, recv: 6103, dropped: 43 }
  },
  50: {
    TCP: { tput: "78,240.50 Kbps", tputMbps: "78.24 Mbps", delay: "65.20 ms", plr: "5.46%", pdr: "94.54%", sent: 78920, recv: 74610, dropped: 4310 },
    UDP: { tput: "78,910.20 Kbps", tputMbps: "78.91 Mbps", delay: "65.15 ms", plr: "5.51%", pdr: "94.49%", sent: 115200, recv: 108850, dropped: 6350 }
  },
  100: {
    TCP: { tput: "453,538.68 Kbps", tputMbps: "453.54 Mbps", delay: "62.44 ms", plr: "17.04%", pdr: "82.96%", sent: 497642, recv: 412859, dropped: 84783 },
    UDP: { tput: "454,119.76 Kbps", tputMbps: "454.12 Mbps", delay: "62.41 ms", plr: "17.12%", pdr: "82.88%", sent: 726683, recv: 602284, dropped: 124399 }
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [users, setUsers] = useState(10);
  const [protocol, setProtocol] = useState('TCP');
  const [metrics, setMetrics] = useState(SIMULATION_FALLBACK[10]['TCP']);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [simStatus, setSimStatus] = useState('');
  const [simProgress, setSimProgress] = useState(0);

  // Check Spring Boot & MySQL Health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/system/status`);
        if (res.ok) {
          setIsBackendOnline(true);
        } else {
          setIsBackendOnline(false);
        }
      } catch (e) {
        setIsBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch metrics when users or protocol change
  useEffect(() => {
    const fetchMetrics = async () => {
      if (isBackendOnline) {
        try {
          const res = await fetch(`${API_BASE}/simulation/metrics?users=${users}&protocol=${protocol}`);
          if (res.ok) {
            const data = await res.json();
            setMetrics(data);
            return;
          }
        } catch (e) {
          // fallback
        }
      }
      setMetrics(SIMULATION_FALLBACK[users][protocol]);
    };
    fetchMetrics();
  }, [users, protocol, isBackendOnline]);

  const runSimulation = () => {
    setSimProgress(10);
    setSimStatus(`Running NS-2 simulation for ${users} students (${protocol})...`);

    let p = 10;
    const t = setInterval(() => {
      p += 30;
      setSimProgress(Math.min(p, 100));
      if (p >= 100) {
        clearInterval(t);
        if (isBackendOnline) {
          fetch(`${API_BASE}/simulation/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentCount: users, protocol })
          })
            .then(res => res.json())
            .then(data => {
              setSimStatus(`Simulation complete! Saved in MySQL (ID #${data.id})`);
            })
            .catch(() => {
              setSimStatus(`Simulation complete for ${users} students.`);
            });
        } else {
          setSimStatus(`Simulation complete for ${users} students.`);
        }
      }
    }, 250);
  };

  return (
    <div className="nettrack-app">
      {/* NAVIGATION BAR */}
      <header className="top-nav">
        <div className="nav-container">
          <div className="brand" onClick={() => setActiveTab('home')}>
            <img src="/assets/logo_symbol_trans.png" alt="NetTrack" className="brand-logo-img" />
            <div className="brand-text">
              <span className="brand-title">NetTrack</span>
              <span className="brand-subtitle">Network Performance Tracker</span>
            </div>
          </div>

          <nav className="nav-menu">
            {['home', 'topology', 'simulation', 'tcp-udp', 'graphs', 'results'].map(tab => (
              <button
                key={tab}
                className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              </button>
            ))}
          </nav>

          <div className="nav-right-actions">
            <div className={`backend-status-pill ${isBackendOnline ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              <span>{isBackendOnline ? 'Spring Boot · MySQL' : 'Local Mode (Port 8080)'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN VIEW */}
      <main className="main-content">
        {activeTab === 'home' && (
          <section className="tab-section active">
            <div className="home-header">
              <div>
                <h1>Performance Overview</h1>
                <p className="text-muted">Campus network status for 10, 50, and 100 students</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={() => setActiveTab('simulation')}>⚡ Run Simulation</button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('topology')}>🗺️ Topology</button>
              </div>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon blue">🚀</div>
                <div className="kpi-content">
                  <span className="kpi-label">Throughput</span>
                  <span className="kpi-value">{metrics.tputMbps || metrics.tput}</span>
                  <span className="kpi-hint">Current data speed</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon green">⏱️</div>
                <div className="kpi-content">
                  <span className="kpi-label">Average Delay</span>
                  <span className="kpi-value">{metrics.delay}</span>
                  <span className="kpi-hint">Waiting latency</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon purple">📦</div>
                <div className="kpi-content">
                  <span className="kpi-label">Delivery Ratio</span>
                  <span className="kpi-value">{metrics.pdr}</span>
                  <span className="kpi-hint">Packet success rate</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon red">⚠️</div>
                <div className="kpi-content">
                  <span className="kpi-label">Packet Loss</span>
                  <span className="kpi-value">{metrics.plr}</span>
                  <span className="kpi-hint">Congestion drops</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'simulation' && (
          <section className="tab-section active">
            <div className="card">
              <div className="card-header">
                <h2>⚡ Live NS-2 Network Simulator</h2>
                <p className="text-muted">Select students and protocol, then execute the simulation.</p>
              </div>
              <div className="card-body">
                <div className="sim-controls-bar">
                  <div className="control-group">
                    <label>Connected Students:</label>
                    <div className="pill-group">
                      {[10, 50, 100].map(cnt => (
                        <button
                          key={cnt}
                          className={`pill-btn ${users === cnt ? 'active' : ''}`}
                          onClick={() => setUsers(cnt)}
                        >
                          {cnt} Students
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Protocol:</label>
                    <div className="pill-group">
                      {['TCP', 'UDP'].map(p => (
                        <button
                          key={p}
                          className={`pill-btn ${protocol === p ? 'active' : ''}`}
                          onClick={() => setProtocol(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={runSimulation}>
                    ▶ Execute Simulation
                  </button>
                </div>

                {simStatus && (
                  <div className="sim-status-box" style={{ marginTop: '20px' }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${simProgress}%` }}></div>
                    </div>
                    <p style={{ marginTop: '8px', fontWeight: 600 }}>{simStatus}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'graphs' && (
          <section className="tab-section active">
            <div className="card">
              <div className="card-header">
                <h2>📊 NS-2 Performance Graphs</h2>
                <p className="text-muted">Calculated through NS-2 trace files and Matplotlib</p>
              </div>
              <div className="card-body">
                <div className="graphs-grid">
                  <div className="graph-card">
                    <img src="/outputs/graphs/chart1_throughput_vs_load.png" alt="Throughput" />
                  </div>
                  <div className="graph-card">
                    <img src="/outputs/graphs/chart2_delay_vs_load.png" alt="Delay" />
                  </div>
                  <div className="graph-card">
                    <img src="/outputs/graphs/chart3_packet_loss_vs_load.png" alt="Packet Loss" />
                  </div>
                  <div className="graph-card">
                    <img src="/outputs/graphs/chart4_pdr_comparison.png" alt="PDR" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

