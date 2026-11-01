
/* ====================================================================
   7. REALISTIC NETWORK DEVICE TOPOLOGY ANIMATION & CONTROLS
   ==================================================================== */
let topoSelectedUsers = 10;
let topoPacketAnimRunning = true;
let topoPacketId = 0;

function updateTopologyState(users) {
  topoSelectedUsers = parseInt(users);

  // Sync button active states
  document.querySelectorAll('#topo-users-pills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-topo-users')) === topoSelectedUsers);
  });

  // Sync with simulation selector if present
  document.querySelectorAll('#user-count-pills .pill-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-users')) === topoSelectedUsers);
  });
  currentUsers = topoSelectedUsers;
  updateSimulationResults();

  // Update HUD elements
  const countEl = document.getElementById('topo-connected-count');
  const badgeEl = document.getElementById('svg-student-badge');
  const queueEl = document.getElementById('topo-queue-status');
  const linkStatusEl = document.getElementById('topo-link-status');
  const alertEl = document.getElementById('topo-congest-alert');
  const bottleneckCable = document.getElementById('path-sw-rtr');
  const rtrQueueBar = document.getElementById('rtr-queue-bar');
  const rtrLossLed = document.getElementById('rtr-loss-led');

  if (countEl) countEl.textContent = `${topoSelectedUsers} Connected Devices`;
  if (badgeEl) badgeEl.textContent = `+${topoSelectedUsers - 3} more devices`;

  if (topoSelectedUsers === 10) {
    if (queueEl) queueEl.textContent = "12 / 50 pkts";
    if (rtrQueueBar) { rtrQueueBar.setAttribute('width', '14'); rtrQueueBar.setAttribute('fill', '#10b981'); }
    if (linkStatusEl) { linkStatusEl.textContent = "🟢 Normal Flow"; linkStatusEl.className = "hud-val text-success"; }
    if (alertEl) {
      alertEl.innerHTML = "🟢 <strong>Link Status:</strong> Low student load. Router queue buffer is healthy with <strong>0% packet loss</strong>.";
      alertEl.className = "congest-alert-box";
    }
    if (bottleneckCable) bottleneckCable.classList.remove('congested');
    if (rtrLossLed) rtrLossLed.style.display = 'none';
  } else if (topoSelectedUsers === 50) {
    if (queueEl) queueEl.textContent = "38 / 50 pkts (Warning)";
    if (rtrQueueBar) { rtrQueueBar.setAttribute('width', '38'); rtrQueueBar.setAttribute('fill', '#f59e0b'); }
    if (linkStatusEl) { linkStatusEl.textContent = "🟡 Buffer Near Full"; linkStatusEl.className = "hud-val text-warning"; }
    if (alertEl) {
      alertEl.innerHTML = "🟡 <strong>Congestion Warning:</strong> 50 students streaming lectures. Router buffer occupancy high; <strong>~5.5% packet loss</strong> observed.";
      alertEl.className = "congest-alert-box";
    }
    if (bottleneckCable) bottleneckCable.classList.add('congested');
    if (rtrLossLed) rtrLossLed.style.display = 'block';
  } else {
    // 100 users
    if (queueEl) queueEl.textContent = "50 / 50 pkts (FULL!)";
    if (rtrQueueBar) { rtrQueueBar.setAttribute('width', '50'); rtrQueueBar.setAttribute('fill', '#ef4444'); }
    if (linkStatusEl) { linkStatusEl.textContent = "🔴 Congestion Overload"; linkStatusEl.className = "hud-val text-danger"; }
    if (alertEl) {
      alertEl.innerHTML = "🔴 <strong>Severe Congestion:</strong> 100 concurrent students! Bottleneck link saturated, queue overflowing, <strong>>17% packets dropped</strong>!";
      alertEl.className = "congest-alert-box congested";
    }
    if (bottleneckCable) bottleneckCable.classList.add('congested');
    if (rtrLossLed) rtrLossLed.style.display = 'block';
  }
}

// Device Flash on packet transit
function flashDevice(id, isCongested = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const cls = isCongested ? 'device-highlight-congested' : 'device-highlight';
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 280);
}

// Animated Packet Flight in SVG
function spawnTopologyPacket() {
  const layer = document.getElementById('network-packets-layer');
  if (!layer || !topoPacketAnimRunning) return;

  const startNodes = [
    { name: "Laptop 1", proto: "TCP", color: "#38bdf8", y: 90 },
    { name: "Laptop 2", proto: "UDP", color: "#f43f5e", y: 210 },
    { name: "Laptop 3", proto: "TCP", color: "#34d399", y: 330 }
  ];

  const source = startNodes[Math.floor(Math.random() * startNodes.length)];
  const isCongested = topoSelectedUsers === 100;
  const isMedium = topoSelectedUsers === 50;
  const willDrop = (isCongested && Math.random() < 0.38) || (isMedium && Math.random() < 0.12);

  // SVG Packet Element
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "svg-data-packet");

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", "-18");
  rect.setAttribute("y", "-9");
  rect.setAttribute("width", "36");
  rect.setAttribute("height", "18");
  rect.setAttribute("rx", "4");
  rect.setAttribute("fill", source.color);
  rect.setAttribute("stroke", "#ffffff");
  rect.setAttribute("stroke-width", "1");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "0");
  text.setAttribute("y", "4");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("fill", "#ffffff");
  text.setAttribute("font-size", "9");
  text.setAttribute("font-weight", "bold");
  text.textContent = source.proto + " ➔";

  g.appendChild(rect);
  g.appendChild(text);
  layer.appendChild(g);

  // Coordinates along link:
  // 1. Source (110, y) -> AP (280, 210)
  // 2. AP (280, 210) -> Switch (435, 210)
  // 3. Switch (435, 210) -> Router (615, 210) [BOTTLENECK]
  // 4. Router (615, 210) -> Cloud (790, 210)
  // 5. Cloud (790, 210) -> Server (930, 210)

  let startTime = performance.now();
  const totalDuration = 2200; // ms

  function animate(now) {
    let elapsed = now - startTime;
    let t = elapsed / totalDuration;

    if (t > 1) {
      // Arrived at University Server!
      flashDevice('srv-body');
      g.remove();
      // Send ACK back
      spawnAckPacket();
      return;
    }

    let x, y;
    if (t < 0.22) {
      // Laptop to AP
      let subT = t / 0.22;
      x = 110 + subT * (280 - 110);
      y = source.y + subT * (210 - source.y);
      if (subT > 0.95) flashDevice('ap-body');
    } else if (t < 0.42) {
      // AP to Switch
      let subT = (t - 0.22) / 0.20;
      x = 280 + subT * (435 - 280);
      y = 210;
      if (subT > 0.95) flashDevice('sw-body');
    } else if (t < 0.65) {
      // Switch to Gateway Router (Bottleneck link)
      let subT = (t - 0.42) / 0.23;
      x = 435 + subT * (615 - 435);
      y = 210;

      if (subT > 0.85) {
        flashDevice('rtr-body', willDrop);
        if (willDrop) {
          // Packet Dropped at Router!
          rect.setAttribute("fill", "#ef4444");
          text.textContent = "DROP ✕";
          // Drop animation (fall down out of cable)
          let dropY = 210 + (subT - 0.85) * 60;
          g.setAttribute("transform", `translate(${x}, ${dropY})`);
          setTimeout(() => g.remove(), 250);
          return;
        }
      }
    } else if (t < 0.82) {
      // Router to Cloud
      let subT = (t - 0.65) / 0.17;
      x = 615 + subT * (790 - 615);
      y = 210;
      if (subT > 0.95) flashDevice('cloud-body');
    } else {
      // Cloud to Server
      let subT = (t - 0.82) / 0.18;
      x = 790 + subT * (930 - 790);
      y = 210;
    }

    g.setAttribute("transform", `translate(${x}, ${y})`);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// Return ACK from Server to Students
function spawnAckPacket() {
  const layer = document.getElementById('network-packets-layer');
  if (!layer || !topoPacketAnimRunning) return;

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "svg-data-packet");

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", "-16");
  rect.setAttribute("y", "-7");
  rect.setAttribute("width", "32");
  rect.setAttribute("height", "14");
  rect.setAttribute("rx", "3");
  rect.setAttribute("fill", "#10b981");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "0");
  text.setAttribute("y", "3");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("fill", "#ffffff");
  text.setAttribute("font-size", "8");
  text.setAttribute("font-weight", "bold");
  text.textContent = "⬅ ACK";

  g.appendChild(rect);
  g.appendChild(text);
  layer.appendChild(g);

  let startTime = performance.now();
  const duration = 1800;

  function animateAck(now) {
    let t = (now - startTime) / duration;
    if (t > 1) {
      g.remove();
      return;
    }

    // Return from Server (930, 210) back to Students (110, 210)
    let x = 930 - t * (930 - 110);
    let y = 210 + Math.sin(t * Math.PI) * -15; // slightly offset vertically

    g.setAttribute("transform", `translate(${x}, ${y})`);
    requestAnimationFrame(animateAck);
  }

  requestAnimationFrame(animateAck);
}

// Start packet generation loop based on student load
function startTopologyLoop() {
  setInterval(() => {
    if (!topoPacketAnimRunning) return;
    spawnTopologyPacket();
  }, topoSelectedUsers === 10 ? 800 : topoSelectedUsers === 50 ? 450 : 250);
}

/**
 * ====================================================================
 * E-Learning Network Performance Simulator & Interactive Dashboard
 * File: app.js
 * ====================================================================
 */

// Simulation dataset from actual NS-2 experiments (10, 50, 100 students)
const SIMULATION_DATA = {
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

// State variables
let currentUsers = 10;
let currentProtocol = "TCP";

/* ====================================================================
   1. NAVIGATION & TAB SWITCHING
   ==================================================================== */
function switchTab(tabId) {
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  const targetSection = document.getElementById(tabId);
  const targetLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);

  if (targetSection) targetSection.classList.add('active');
  if (targetLink) targetLink.classList.add('active');

  // Close mobile nav if open
  const navMenu = document.getElementById('nav-menu');
  if (navMenu) navMenu.classList.remove('show');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ====================================================================
   2. SIMULATION CONTROLLER & PIPE ANIMATION
   ==================================================================== */
function updateSimulationResults() {
  const data = SIMULATION_DATA[currentUsers][currentProtocol];
  document.getElementById('res-tput').textContent = data.tput;
  document.getElementById('res-tput-mbps').textContent = data.tputMbps;
  document.getElementById('res-delay').textContent = data.delay;
  document.getElementById('res-loss').textContent = data.plr;
  document.getElementById('res-dropped-count').textContent = `${data.dropped.toLocaleString()} packets dropped`;
  document.getElementById('res-pdr').textContent = data.pdr;
  document.getElementById('res-recv-count').textContent = `${data.recv.toLocaleString()} packets received`;
}

function launchPacketPipeAnimation() {
  const track = document.getElementById('pipe-track');
  if (!track) return;
  track.innerHTML = '';

  const packetCount = currentUsers === 10 ? 5 : currentUsers === 50 ? 9 : 14;
  const isHighDrop = currentUsers === 100;

  for (let i = 0; i < packetCount; i++) {
    setTimeout(() => {
      const pkt = document.createElement('div');
      pkt.className = 'anim-packet';
      pkt.style.left = '0%';
      pkt.textContent = `Pkt #${i + 1}`;
      track.appendChild(pkt);

      const willDrop = isHighDrop && (i % 5 === 2);

      setTimeout(() => {
        if (willDrop) {
          pkt.style.transform = 'translateX(180px)';
          setTimeout(() => {
            pkt.classList.add('lost');
            pkt.textContent = 'DROPPED ❌';
            setTimeout(() => pkt.remove(), 700);
          }, 600);
        } else {
          pkt.style.transform = `translateX(${track.clientWidth - 70}px)`;
          setTimeout(() => {
            pkt.textContent = 'ACK ✔';
            setTimeout(() => pkt.remove(), 400);
          }, 1100);
        }
      }, 50);
    }, i * 220);
  }
}

function runSimulation() {
  const statusBox = document.getElementById('sim-status-box');
  const progressFill = document.getElementById('sim-progress-fill');
  const statusText = document.getElementById('sim-status-text');

  statusBox.style.display = 'block';
  progressFill.style.width = '0%';
  statusText.textContent = `Injecting ${currentUsers} students with ${currentProtocol} flows into NS-2 bottleneck link...`;

  let progress = 0;
  const interval = setInterval(() => {
    progress += 25;
    progressFill.style.width = `${progress}%`;

    if (progress === 50) {
      statusText.textContent = `Routing student traffic through Campus Router (Queue size: 50)...`;
    } else if (progress >= 100) {
      clearInterval(interval);
      statusText.textContent = `Simulation complete! NS-2 trace generated and metrics extracted.`;
      updateSimulationResults();

  // Topology user pills
  document.querySelectorAll('#topo-users-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = btn.getAttribute('data-topo-users');
      updateTopologyState(u);
    });
  });
  updateTopologyState(10);
  startTopologyLoop();

      launchPacketPipeAnimation();
      setTimeout(() => { statusBox.style.display = 'none'; }, 2200);
    }
  }, 150);
}

/* ====================================================================
   3. SLIDING WINDOW INTERACTIVE DEMO
   ==================================================================== */
let swWindowSize = 4;
let swBase = 0;
let swNextSeq = 0;
const SW_TOTAL_FRAMES = 12;
let swAutoTimer = null;

function renderSlidingWindow() {
  const track = document.getElementById('sw-frames-track');
  if (!track) return;
  track.innerHTML = '';

  for (let i = 0; i < SW_TOTAL_FRAMES; i++) {
    const box = document.createElement('div');
    box.className = 'frame-box';

    const inWindow = i >= swBase && i < swBase + swWindowSize;
    if (inWindow) box.classList.add('in-window');
    if (i < swBase) box.classList.add('acked');
    else if (i < swNextSeq) box.classList.add('sent');

    let stateLabel = i < swBase ? "ACKed ✔" : (i < swNextSeq ? "In Flight ✈" : (inWindow ? "In Window" : "Buffered"));

    box.innerHTML = `
      <span class="frame-id">#${i}</span>
      <span class="frame-tag">${stateLabel}</span>
    `;
    track.appendChild(box);
  }
}

function stepSlidingWindow() {
  const statusText = document.getElementById('sw-status-text');
  const pktChannel = document.getElementById('sw-packet-channel');
  const ackChannel = document.getElementById('sw-ack-channel');

  if (swBase >= SW_TOTAL_FRAMES) {
    statusText.textContent = "All 12 frames successfully transmitted and acknowledged!";
    if (swAutoTimer) clearInterval(swAutoTimer);
    return;
  }

  // If we can send frames inside window
  if (swNextSeq < swBase + swWindowSize && swNextSeq < SW_TOTAL_FRAMES) {
    const seq = swNextSeq;
    swNextSeq++;
    statusText.textContent = `Transmitting Frame #${seq} within window [${swBase}..${Math.min(swBase + swWindowSize - 1, SW_TOTAL_FRAMES - 1)}].`;
    renderSlidingWindow();

    // Fly packet
    const pkt = document.createElement('div');
    pkt.className = 'flight-packet';
    pkt.textContent = `Pkt #${seq}`;
    pkt.style.left = '0%';
    pktChannel.appendChild(pkt);

    setTimeout(() => {
      pkt.style.left = '80%';
      setTimeout(() => {
        pkt.remove();
        // Fly ACK back
        const ack = document.createElement('div');
        ack.className = 'flight-packet ack';
        ack.textContent = `ACK #${seq}`;
        ack.style.left = '80%';
        ackChannel.appendChild(ack);

        setTimeout(() => {
          ack.style.left = '0%';
          setTimeout(() => {
            ack.remove();
            swBase++;
            statusText.textContent = `Received ACK #${seq}! Window slides forward to base #${swBase}.`;
            renderSlidingWindow();
          }, 450);
        }, 50);
      }, 500);
    }, 50);
  } else {
    // Waiting for in-flight ACKs
    renderSlidingWindow();
  }
}

function resetSlidingWindow() {
  if (swAutoTimer) clearInterval(swAutoTimer);
  swBase = 0;
  swNextSeq = 0;
  document.getElementById('sw-status-text').textContent = "Reset complete. Ready to send.";
  renderSlidingWindow();
}

/* ====================================================================
   4. GO-BACK-N ARQ INTERACTIVE DEMO
   ==================================================================== */
let gbnStep = 0;
const GBN_FRAMES = [
  { id: 0, state: "ready" },
  { id: 1, state: "ready" },
  { id: 2, state: "ready" },
  { id: 3, state: "ready" },
  { id: 4, state: "ready" },
  { id: 5, state: "ready" },
  { id: 6, state: "ready" },
  { id: 7, state: "ready" }
];
let gbnDropTriggered = false;

function renderGBN() {
  const track = document.getElementById('gbn-frames-track');
  if (!track) return;
  track.innerHTML = '';

  GBN_FRAMES.forEach(f => {
    const box = document.createElement('div');
    box.className = `frame-box ${f.state}`;
    let label = f.state === "acked" ? "ACKed ✔" :
                f.state === "lost" ? "LOST ❌" :
                f.state === "sent" ? "Sent" :
                f.state === "in-window" ? "Window" : "Ready";
    box.innerHTML = `<span class="frame-id">#${f.id}</span><span class="frame-tag">${label}</span>`;
    track.appendChild(box);
  });
}

function stepGBN() {
  const exp = document.getElementById('gbn-step-explanation');
  const status = document.getElementById('gbn-status-text');

  gbnStep++;

  if (gbnStep === 1) {
    // Send window frames 0, 1, 2, 3
    GBN_FRAMES[0].state = "sent";
    GBN_FRAMES[1].state = "sent";
    GBN_FRAMES[2].state = "sent";
    GBN_FRAMES[3].state = "sent";
    exp.innerHTML = "<strong>Step 1:</strong> Sender sends window frames #0, #1, #2, #3.";
    status.textContent = "Frames 0..3 transmitted.";
  } else if (gbnStep === 2) {
    if (gbnDropTriggered) {
      GBN_FRAMES[0].state = "acked";
      GBN_FRAMES[1].state = "acked";
      GBN_FRAMES[2].state = "acked";
      GBN_FRAMES[3].state = "lost"; // Packet 3 dropped
      exp.innerHTML = "<strong>Step 2 (Packet Loss!):</strong> ACKs for #0, #1, #2 arrive safely. But <strong>Packet #3 is lost in transmission ❌</strong>!";
      status.textContent = "Packet #3 dropped due to buffer overflow!";
    } else {
      GBN_FRAMES[0].state = "acked";
      GBN_FRAMES[1].state = "acked";
      GBN_FRAMES[2].state = "acked";
      GBN_FRAMES[3].state = "acked";
      exp.innerHTML = "<strong>Step 2:</strong> All ACKs arrive safely. Window slides forward to frame #4.";
      status.textContent = "All frames ACKed.";
    }
  } else if (gbnStep === 3) {
    if (gbnDropTriggered) {
      // Receiver refuses out of order frames
      GBN_FRAMES[4].state = "sent";
      GBN_FRAMES[5].state = "sent";
      exp.innerHTML = "<strong>Step 3 (Out-of-Order Discard):</strong> Receiver expects Packet #3. Frames #4 and #5 arrive, but Receiver <strong>discards them</strong>!";
      status.textContent = "Receiver discarded out-of-order packets.";
    } else {
      GBN_FRAMES[4].state = "sent";
      GBN_FRAMES[5].state = "sent";
      exp.innerHTML = "<strong>Step 3:</strong> Transmitting next window frames #4 and #5.";
    }
  } else if (gbnStep === 4) {
    if (gbnDropTriggered) {
      // Timeout occurs -> Go Back to 3
      GBN_FRAMES[3].state = "in-window";
      GBN_FRAMES[4].state = "in-window";
      GBN_FRAMES[5].state = "in-window";
      exp.innerHTML = "<strong>Step 4 (Timeout & Go-Back-N):</strong> Sender's timer expires! Sender <strong>Goes Back to Packet #3</strong> and retransmits #3, #4, and #5!";
      status.textContent = "Go-Back-N triggered! Retransmitting all unacknowledged packets.";
    } else {
      GBN_FRAMES[4].state = "acked";
      GBN_FRAMES[5].state = "acked";
      exp.innerHTML = "<strong>Step 4:</strong> All frames received successfully.";
    }
  } else if (gbnStep >= 5) {
    // Retransmission successful
    GBN_FRAMES[3].state = "acked";
    GBN_FRAMES[4].state = "acked";
    GBN_FRAMES[5].state = "acked";
    exp.innerHTML = "<strong>Step 5 (Recovery Complete):</strong> Retransmitted Packet #3 arrives safely! ACKs return, and window slides forward.";
    status.textContent = "Communication recovered successfully.";
  }

  renderGBN();
}

function resetGBN() {
  gbnStep = 0;
  gbnDropTriggered = false;
  GBN_FRAMES.forEach(f => { f.state = "ready"; });
  document.getElementById('gbn-step-explanation').innerHTML = "<strong>Step 0:</strong> Packets #0, #1, #2, #3 are ready to transmit.";
  document.getElementById('gbn-status-text').textContent = "Click 'Drop Packet #3' then 'Next Step' to see Go-Back-N retransmission!";
  renderGBN();
}

/* ====================================================================
   5. LEAKY BUCKET INTERACTIVE DEMO
   ==================================================================== */
let lbCapacity = 50;
let lbCurrentLevel = 0;
let lbTotalArrived = 0;
let lbTotalLeaked = 0;
let lbTotalDropped = 0;
let lbLeakInterval = null;

function updateLeakyBucketUI() {
  const waterFill = document.getElementById('lb-water-fill');
  const levelText = document.getElementById('lb-level-text');

  const pct = Math.min((lbCurrentLevel / lbCapacity) * 100, 100);
  if (waterFill) waterFill.style.height = `${pct}%`;
  if (levelText) levelText.textContent = `${lbCurrentLevel} / ${lbCapacity}`;

  document.getElementById('lb-stat-arrived').textContent = lbTotalArrived;
  document.getElementById('lb-stat-leaked').textContent = lbTotalLeaked;
  document.getElementById('lb-stat-dropped').textContent = lbTotalDropped;

  const lossPct = lbTotalArrived > 0 ? ((lbTotalDropped / lbTotalArrived) * 100).toFixed(1) : "0.0";
  document.getElementById('lb-stat-loss-rate').textContent = `${lossPct}%`;
}

function startLeakyBucketDrain() {
  if (lbLeakInterval) return;
  lbLeakInterval = setInterval(() => {
    if (lbCurrentLevel > 0) {
      lbCurrentLevel = Math.max(0, lbCurrentLevel - 2);
      lbTotalLeaked += 2;
      updateLeakyBucketUI();
    }
  }, 400);
}

function sendLeakyBucketBurst() {
  startLeakyBucketDrain();
  const burst = 28; // Packets in heavy video burst
  lbTotalArrived += burst;

  const pipe = document.getElementById('lb-inflow-pipe');
  pipe.classList.add('burst');
  pipe.textContent = "Burst Arrival: 4 Mbps ⚡";

  setTimeout(() => {
    pipe.classList.remove('burst');
    pipe.textContent = "Incoming Flow: Idle";
  }, 1200);

  const available = lbCapacity - lbCurrentLevel;
  if (burst > available) {
    const accepted = available;
    const dropped = burst - available;
    lbCurrentLevel = lbCapacity;
    lbTotalDropped += dropped;
  } else {
    lbCurrentLevel += burst;
  }
  updateLeakyBucketUI();
}

function sendLeakyBucketNormal() {
  startLeakyBucketDrain();
  const normal = 8;
  lbTotalArrived += normal;

  const pipe = document.getElementById('lb-inflow-pipe');
  pipe.textContent = "Steady Arrival: 1 Mbps 💧";
  setTimeout(() => { pipe.textContent = "Incoming Flow: Idle"; }, 800);

  lbCurrentLevel = Math.min(lbCapacity, lbCurrentLevel + normal);
  updateLeakyBucketUI();
}

function resetLeakyBucket() {
  lbCurrentLevel = 0;
  lbTotalArrived = 0;
  lbTotalLeaked = 0;
  lbTotalDropped = 0;
  updateLeakyBucketUI();
}

/* ====================================================================
   6. DOM INITIALIZATION
   ==================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Navigation tabs
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Mobile navigation toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      document.getElementById('nav-menu').classList.toggle('show');
    });
  }

  // Simulation pills
  document.querySelectorAll('#user-count-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#user-count-pills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentUsers = parseInt(btn.getAttribute('data-users'));
      updateSimulationResults();

  // Topology user pills
  document.querySelectorAll('#topo-users-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = btn.getAttribute('data-topo-users');
      updateTopologyState(u);
    });
  });
  updateTopologyState(10);
  startTopologyLoop();

    });
  });

  document.querySelectorAll('#protocol-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#protocol-pills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentProtocol = btn.getAttribute('data-proto');
      updateSimulationResults();

  // Topology user pills
  document.querySelectorAll('#topo-users-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = btn.getAttribute('data-topo-users');
      updateTopologyState(u);
    });
  });
  updateTopologyState(10);
  startTopologyLoop();

    });
  });

  document.getElementById('btn-run-sim').addEventListener('click', runSimulation);

  // Sliding Window Controls
  document.getElementById('btn-sw-step').addEventListener('click', stepSlidingWindow);
  document.getElementById('btn-sw-reset').addEventListener('click', resetSlidingWindow);
  document.getElementById('btn-sw-play').addEventListener('click', () => {
    if (swAutoTimer) {
      clearInterval(swAutoTimer);
      swAutoTimer = null;
      document.getElementById('btn-sw-play').textContent = "▶ Auto Play";
    } else {
      document.getElementById('btn-sw-play').textContent = "⏸ Pause";
      swAutoTimer = setInterval(stepSlidingWindow, 1100);
    }
  });

  // Go-Back-N Controls
  document.getElementById('btn-gbn-drop').addEventListener('click', () => {
    gbnDropTriggered = true;
    document.getElementById('gbn-status-text').textContent = "Packet #3 marked to DROP! Click 'Next Step'.";
  });
  document.getElementById('btn-gbn-step').addEventListener('click', stepGBN);
  document.getElementById('btn-gbn-reset').addEventListener('click', resetGBN);

  // Leaky Bucket Controls
  document.getElementById('btn-lb-burst').addEventListener('click', sendLeakyBucketBurst);
  document.getElementById('btn-lb-normal').addEventListener('click', sendLeakyBucketNormal);
  document.getElementById('btn-lb-reset').addEventListener('click', resetLeakyBucket);

  // Initial Renders
  updateSimulationResults();

  // Topology user pills
  document.querySelectorAll('#topo-users-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = btn.getAttribute('data-topo-users');
      updateTopologyState(u);
    });
  });
  updateTopologyState(10);
  startTopologyLoop();

  renderSlidingWindow();
  renderGBN();
  updateLeakyBucketUI();
  startLeakyBucketDrain();
});
