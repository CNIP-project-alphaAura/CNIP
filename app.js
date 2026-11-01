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
    });
  });

  document.querySelectorAll('#protocol-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#protocol-pills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentProtocol = btn.getAttribute('data-proto');
      updateSimulationResults();
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
  renderSlidingWindow();
  renderGBN();
  updateLeakyBucketUI();
  startLeakyBucketDrain();
});
