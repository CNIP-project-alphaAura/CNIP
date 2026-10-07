/**
 * ============================================================
 * app.js – E-Learning Network Performance Dashboard
 * Interactive visualizations: Go-Back-N, Leaky Bucket, Charts
 * ============================================================
 */

'use strict';

// ============================================================
// SIMULATION DATA (mirrors Python engine output)
// ============================================================
const SIM_DATA = {
  protocol: {
    low: {
      users: 10,
      TCP: { throughput_kbps: 1840, avg_delay_ms: 47.2, plr_percent: 0.5,  pdr_percent: 99.5 },
      UDP: { throughput_kbps: 2250, avg_delay_ms: 42.1, plr_percent: 0.8,  pdr_percent: 99.2 }
    },
    medium: {
      users: 30,
      TCP: { throughput_kbps: 4120, avg_delay_ms: 89.4, plr_percent: 3.5,  pdr_percent: 96.5 },
      UDP: { throughput_kbps: 5380, avg_delay_ms: 74.8, plr_percent: 5.2,  pdr_percent: 94.8 }
    },
    high: {
      users: 100,
      TCP: { throughput_kbps: 6900, avg_delay_ms: 245.7,plr_percent: 12.8, pdr_percent: 87.2 },
      UDP: { throughput_kbps: 8100, avg_delay_ms: 193.4,plr_percent: 18.5, pdr_percent: 81.5 }
    }
  },
  congestion: {
    userCounts:    [5, 10, 15, 20, 30, 40, 50, 60, 75, 100, 120],
    TCP_throughput:[820,  1840, 2760, 3680, 4120, 5050, 5780, 6290, 6650, 6900, 6750],
    UDP_throughput:[1100, 2250, 3400, 4500, 5380, 6800, 7600, 8100, 8200, 8100, 7900],
    TCP_plr:       [0.2,  0.5,  0.8,  1.5,  3.5,  5.8,  8.4,  10.2, 11.8, 12.8, 14.5],
    UDP_plr:       [0.4,  0.8,  1.5,  2.8,  5.2,  9.0,  13.5, 16.2, 17.8, 18.5, 20.1],
    TCP_delay:     [28,   47,   63,   82,   89,   115,  155,  198,  228,  246,  280],
    UDP_delay:     [22,   42,   55,   70,   75,   95,   130,  165,  182,  193,  215],
    TCP_pdr:       [99.8, 99.5, 99.2, 98.5, 96.5, 94.2, 91.6, 89.8, 88.2, 87.2, 85.5],
    UDP_pdr:       [99.6, 99.2, 98.5, 97.2, 94.8, 91.0, 86.5, 83.8, 82.2, 81.5, 79.9],
  },
  gbn: {
    windowSizes: [1, 2, 4, 8, 16, 32, 64],
    loss0:       [16.7, 33.3, 66.7, 100.0, 100.0, 100.0, 100.0],
    loss5:       [15.8, 31.7, 63.3, 92.5,  95.0,  96.2,  96.8],
    loss10:      [14.2, 28.4, 56.7, 81.2,  85.4,  87.3,  88.1],
    loss20:      [10.8, 21.6, 43.2, 62.1,  66.5,  68.2,  69.0],
    retransmissions_at10pct: [0, 1, 3, 8, 18, 38, 72],
  },
  leakyBucket: {
    times:       Array.from({length: 201}, (_,i) => (i*0.1).toFixed(1)),
    arrivalRate: [],  // filled below
    outputRate:  [],
    bucketLevel: [],
    withoutDrops:[],
    withDrops:   [],
  }
};

// Generate leaky bucket data
(function generateLBData() {
  const bursts = [[2,4,35],[8,10,50],[14,15.5,45]];
  const baseRate = 8;
  const cap  = 50;
  const leak = 10;
  const dt   = 0.1;
  let bucket = 0, totalDropped = 0;
  let bucketSmall = 0, droppedSmall = 0;

  SIM_DATA.leakyBucket.times.forEach((tStr, i) => {
    const t = parseFloat(tStr);
    let arr = baseRate;
    for (const [s, e, rate] of bursts) {
      if (t >= s && t <= e) { arr = rate; break; }
    }
    SIM_DATA.leakyBucket.arrivalRate.push(arr);

    const newPkts = Math.round(arr * dt);
    const space   = cap - bucket;
    const accepted= Math.min(newPkts, space);
    totalDropped += (newPkts - accepted);
    bucket += accepted;
    const toLeak = Math.min(bucket, Math.round(leak * dt));
    bucket -= toLeak;
    SIM_DATA.leakyBucket.outputRate.push(toLeak / dt);
    SIM_DATA.leakyBucket.bucketLevel.push(bucket);
    SIM_DATA.leakyBucket.withDrops.push(totalDropped);

    // Without LB (small bucket = cap 5)
    const space2 = 5 - bucketSmall;
    const acc2   = Math.min(newPkts, space2);
    droppedSmall += (newPkts - acc2);
    bucketSmall += acc2;
    const toLeak2 = Math.min(bucketSmall, Math.round(leak * dt));
    bucketSmall -= toLeak2;
    SIM_DATA.leakyBucket.withoutDrops.push(droppedSmall);
  });
})();

// ============================================================
// COLORS & CHART CONFIG
// ============================================================
const C = {
  tcp:    '#4FC3F7',
  udp:    '#FF8A65',
  low:    '#66BB6A',
  medium: '#FFA726',
  high:   '#EF5350',
  purple: '#7C4DFF',
  cyan:   '#00E5FF',
  green:  '#00E676',
  amber:  '#FFD600',
  red:    '#FF1744',
  bg:     '#141428',
  grid:   '#1e1e38',
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      labels: { color: '#9999BB', font: { size: 11, family: 'Inter' } }
    },
    tooltip: {
      backgroundColor: 'rgba(14,14,40,0.95)',
      borderColor:     'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor:  '#E8E8FF',
      bodyColor:   '#9999BB',
    }
  },
  scales: {
    x: {
      grid: { color: C.grid },
      ticks: { color: '#9999BB', font: { size: 10 } }
    },
    y: {
      grid: { color: C.grid },
      ticks: { color: '#9999BB', font: { size: 10 } }
    }
  }
};

function chartCfg(overrides = {}) {
  return JSON.parse(JSON.stringify({ ...CHART_DEFAULTS, ...overrides }));
}

// ============================================================
// NAVIGATION TAB SYSTEM
// ============================================================
function initNavigation() {
  document.querySelectorAll('[data-panel]').forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      const panelId = tab.dataset.panel;

      document.querySelectorAll('[data-panel]').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(panelId).classList.add('active');
    });
  });
}

// ============================================================
// TOPOLOGY CANVAS
// ============================================================
function initTopologyCanvas() {
  const canvas = document.getElementById('topology-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Node definitions
  const nodes = {
    server: { x: W*0.05, y: H/2,    label: 'E-Learning\nServer',  icon: '🖥️',  color: C.purple },
    gw:     { x: W*0.28, y: H/2,    label: 'Gateway\nRouter',     icon: '🔀',  color: C.amber  },
    core:   { x: W*0.50, y: H/2,    label: 'Core\nSwitch',        icon: '⚡',  color: C.cyan   },
    swA:    { x: W*0.72, y: H*0.28, label: 'Access\nSwitch A',    icon: '📶',  color: C.tcp    },
    swB:    { x: W*0.72, y: H*0.72, label: 'Access\nSwitch B',    icon: '📶',  color: C.tcp    },
  };

  // Student nodes
  const studentsA = [0,1,2,3,4].map((i,idx) => ({
    x: W*0.93, y: H*0.05 + idx * 50,
    label: `S${idx+1}`, color: C.low
  }));
  const studentsB = [0,1,2,3,4].map((i,idx) => ({
    x: W*0.93, y: H*0.53 + idx * 50,
    label: `S${idx+6}`, color: C.medium
  }));

  // Animated packets
  const packets = [];
  let animFrame;

  function addPacket(from, to, proto) {
    packets.push({
      x: from.x, y: from.y,
      tx: to.x,  ty: to.y,
      progress: 0,
      speed: 0.008 + Math.random()*0.006,
      proto: proto,
      dropped: Math.random() < 0.08,
      color: proto === 'TCP' ? C.tcp : C.udp,
    });
  }

  // Spawn packets periodically
  let spawnTimer = 0;
  function spawnPackets(ts) {
    if (ts - spawnTimer > 300) {
      spawnTimer = ts;
      const all = [...studentsA, ...studentsB];
      const s   = all[Math.floor(Math.random()*all.length)];
      const proto = Math.random() > 0.5 ? 'TCP' : 'UDP';
      const sw    = studentsA.includes(s) ? nodes.swA : nodes.swB;
      addPacket(s,      sw,       proto);
      addPacket(sw,     nodes.core, proto);
      addPacket(nodes.core, nodes.gw, proto);
      addPacket(nodes.gw,  nodes.server, proto);
    }
  }

  function drawArrow(ctx, x1,y1,x2,y2,color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawNode(ctx, n, size=28) {
    // Glow
    ctx.beginPath();
    const grad = ctx.createRadialGradient(n.x,n.y,0, n.x,n.y,size+12);
    grad.addColorStop(0, n.color+'44');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.arc(n.x, n.y, size+12, 0, Math.PI*2);
    ctx.fill();

    // Circle
    ctx.beginPath();
    ctx.arc(n.x, n.y, size, 0, Math.PI*2);
    ctx.fillStyle = '#0E0E24';
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();

    // Icon
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = n.color;
    ctx.fillText(n.icon, n.x, n.y+5);

    // Label
    const lines = n.label.split('\n');
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = '#9999BB';
    lines.forEach((line, i) => ctx.fillText(line, n.x, n.y+size+14+(i*12)));
  }

  function drawStudentNode(ctx, s) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 12, 0, Math.PI*2);
    ctx.fillStyle = '#0E0E24';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5;
    ctx.fill(); ctx.stroke();
    ctx.font = '7px Inter, sans-serif';
    ctx.fillStyle = s.color;
    ctx.textAlign = 'center';
    ctx.fillText(s.label, s.x, s.y+3);
  }

  function drawPacket(ctx, pkt) {
    const x = pkt.x + (pkt.tx - pkt.x) * pkt.progress;
    const y = pkt.y + (pkt.ty - pkt.y) * pkt.progress;
    const color = pkt.dropped ? C.red : pkt.color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 8;
    ctx.fill();
    ctx.shadowBlur  = 0;
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08080F';
    ctx.fillRect(0, 0, W, H);

    spawnPackets(ts);

    // Draw links
    drawArrow(ctx, nodes.server.x, nodes.server.y, nodes.gw.x,   nodes.gw.y,   C.purple);
    drawArrow(ctx, nodes.gw.x,     nodes.gw.y,     nodes.core.x, nodes.core.y, C.amber);
    drawArrow(ctx, nodes.core.x,   nodes.core.y,   nodes.swA.x,  nodes.swA.y,  C.tcp);
    drawArrow(ctx, nodes.core.x,   nodes.core.y,   nodes.swB.x,  nodes.swB.y,  C.tcp);
    studentsA.forEach(s => drawArrow(ctx, nodes.swA.x, nodes.swA.y, s.x, s.y, C.low));
    studentsB.forEach(s => drawArrow(ctx, nodes.swB.x, nodes.swB.y, s.x, s.y, C.medium));

    // Draw infrastructure nodes
    Object.values(nodes).forEach(n => drawNode(ctx, n));
    studentsA.forEach(s => drawStudentNode(ctx, s));
    studentsB.forEach(s => drawStudentNode(ctx, s));

    // Draw & update packets
    for (let i = packets.length-1; i >= 0; i--) {
      const p = packets[i];
      p.progress += p.speed;
      if (p.dropped && p.progress > 0.55) { packets.splice(i,1); continue; }
      if (p.progress >= 1)  { packets.splice(i,1); continue; }
      drawPacket(ctx, p);
    }

    animFrame = requestAnimationFrame(draw);
  }

  animFrame = requestAnimationFrame(draw);
}

// ============================================================
// OVERVIEW METRIC CARDS – populate
// ============================================================
function updateOverviewMetrics(scenario = 'medium') {
  const d = SIM_DATA.protocol[scenario];
  const tcp = d.TCP; const udp = d.UDP;
  const avgTput  = ((tcp.throughput_kbps + udp.throughput_kbps)/2).toFixed(0);
  const avgDelay = ((tcp.avg_delay_ms + udp.avg_delay_ms)/2).toFixed(1);
  const avgPlr   = ((tcp.plr_percent + udp.plr_percent)/2).toFixed(2);
  const avgPdr   = ((tcp.pdr_percent + udp.pdr_percent)/2).toFixed(1);

  document.getElementById('metric-tput').textContent  = avgTput;
  document.getElementById('metric-delay').textContent = avgDelay;
  document.getElementById('metric-plr').textContent   = avgPlr + '%';
  document.getElementById('metric-pdr').textContent   = avgPdr + '%';
  document.getElementById('metric-retx').textContent  = '72';  // W=64, 10% loss
}

// ============================================================
// SCENARIO BUTTONS
// ============================================================
function initScenarioButtons(selector, callback) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(selector).forEach(b => {
        b.classList.remove('active-scenario');
        b.style.borderColor = '';
        b.style.color = '';
      });
      btn.classList.add('active-scenario');
      btn.style.borderColor = 'var(--accent-purple)';
      btn.style.color       = 'var(--accent-cyan)';
      callback(btn.dataset.s || btn.dataset.scenario);
    });
  });
}

// ============================================================
// CHART FACTORY HELPERS
// ============================================================
function makeLineChart(id, labels, datasets, yLabel='', extra={}) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        ...extra.plugins,
      },
      scales: {
        x: { ...CHART_DEFAULTS.scales.x, title: { display: true, color:'#9999BB', text: extra.xLabel||'' } },
        y: { ...CHART_DEFAULTS.scales.y, title: { display: !!yLabel, color:'#9999BB', text: yLabel } }
      },
      ...extra
    }
  });
}

function makeBarChart(id, labels, datasets, yLabel='', extra={}) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  return new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { ...CHART_DEFAULTS.scales.x, title:{ display:true, color:'#9999BB', text: extra.xLabel||'' } },
        y: { ...CHART_DEFAULTS.scales.y, title:{ display:!!yLabel, color:'#9999BB', text: yLabel } }
      },
      ...extra
    }
  });
}

function dsLine(label, data, color, opts={}) {
  return {
    label, data,
    borderColor:           color,
    backgroundColor:       color + '20',
    borderWidth:           2.5,
    pointBackgroundColor:  color,
    pointRadius:           4,
    fill:                  !!opts.fill,
    tension:               opts.tension ?? 0.4,
    ...opts
  };
}

function dsBar(label, data, color) {
  return { label, data, backgroundColor: color+'CC', borderColor: color, borderWidth: 1, borderRadius: 5 };
}

// ============================================================
// OVERVIEW CHARTS
// ============================================================
function initOverviewCharts() {
  const scenarios = ['Low\n(10)', 'Medium\n(30)', 'High\n(100)'];
  const tcpTput = ['low','medium','high'].map(s => SIM_DATA.protocol[s].TCP.throughput_kbps);
  const udpTput = ['low','medium','high'].map(s => SIM_DATA.protocol[s].UDP.throughput_kbps);

  makeBarChart('chart-throughput-overview', scenarios,
    [dsBar('TCP',tcpTput,C.tcp), dsBar('UDP',udpTput,C.udp)],
    'Throughput (Kbps)', { xLabel:'Traffic Scenario' });

  const tcpLoss = ['low','medium','high'].map(s => SIM_DATA.protocol[s].TCP.plr_percent);
  const udpLoss = ['low','medium','high'].map(s => SIM_DATA.protocol[s].UDP.plr_percent);

  makeBarChart('chart-loss-overview', scenarios,
    [dsBar('TCP',tcpLoss,C.tcp), dsBar('UDP',udpLoss,C.udp)],
    'Packet Loss Rate (%)', { xLabel:'Traffic Scenario' });
}

// ============================================================
// PROTOCOL COMPARISON CHARTS
// ============================================================
const SCEN_LABELS = ['Low (10)', 'Medium (30)', 'High (100)'];
const SCEN_KEYS   = ['low','medium','high'];

function initProtocolCharts() {
  const getTCP = m => SCEN_KEYS.map(s => SIM_DATA.protocol[s].TCP[m]);
  const getUDP = m => SCEN_KEYS.map(s => SIM_DATA.protocol[s].UDP[m]);

  makeBarChart('proto-chart-tput', SCEN_LABELS,
    [dsBar('TCP',getTCP('throughput_kbps'),C.tcp), dsBar('UDP',getUDP('throughput_kbps'),C.udp)],
    'Kbps', { xLabel:'Traffic Scenario' });

  makeBarChart('proto-chart-delay', SCEN_LABELS,
    [dsBar('TCP',getTCP('avg_delay_ms'),C.tcp), dsBar('UDP',getUDP('avg_delay_ms'),C.udp)],
    'ms', { xLabel:'Traffic Scenario' });

  makeBarChart('proto-chart-loss', SCEN_LABELS,
    [dsBar('TCP',getTCP('plr_percent'),C.tcp), dsBar('UDP',getUDP('plr_percent'),C.udp)],
    '%', { xLabel:'Traffic Scenario' });

  makeBarChart('proto-chart-pdr', SCEN_LABELS,
    [dsBar('TCP',getTCP('pdr_percent'),C.tcp), dsBar('UDP',getUDP('pdr_percent'),C.udp)],
    '%', { xLabel:'Traffic Scenario' });

  // Update stat boxes
  function updateProtoStats(s) {
    const d = SIM_DATA.protocol[s];
    document.getElementById('tcp-tput').textContent  = d.TCP.throughput_kbps + ' Kbps';
    document.getElementById('tcp-delay').textContent = d.TCP.avg_delay_ms    + ' ms';
    document.getElementById('tcp-pdr').textContent   = d.TCP.pdr_percent     + '%';
    document.getElementById('tcp-plr').textContent   = d.TCP.plr_percent     + '%';
    document.getElementById('udp-tput').textContent  = d.UDP.throughput_kbps + ' Kbps';
    document.getElementById('udp-delay').textContent = d.UDP.avg_delay_ms    + ' ms';
    document.getElementById('udp-pdr').textContent   = d.UDP.pdr_percent     + '%';
    document.getElementById('udp-plr').textContent   = d.UDP.plr_percent     + '%';
  }
  updateProtoStats('medium');
  initScenarioButtons('.proto-scenario-btn', updateProtoStats);
}

// ============================================================
// ANALYTICS CHARTS (Tab 5)
// ============================================================
function initAnalyticsCharts() {
  const cong = SIM_DATA.congestion;

  // Chart 1: Throughput vs User Load
  makeLineChart('analytics-chart1', cong.userCounts,
    [dsLine('TCP',cong.TCP_throughput,C.tcp,{fill:true}),
     dsLine('UDP',cong.UDP_throughput,C.udp,{fill:true})],
    'Throughput (Kbps)', { xLabel:'Concurrent Students' });

  // Chart 2: Delay vs Load
  makeLineChart('analytics-chart2', cong.userCounts,
    [dsLine('TCP Delay',cong.TCP_delay,C.tcp,{fill:true}),
     dsLine('UDP Delay',cong.UDP_delay,C.udp,{fill:true})],
    'Avg E2E Delay (ms)', { xLabel:'Concurrent Students' });

  // Chart 3: PLR vs User Count
  makeLineChart('analytics-chart3', cong.userCounts,
    [dsLine('TCP PLR',cong.TCP_plr,C.tcp,{fill:true}),
     dsLine('UDP PLR',cong.UDP_plr,C.udp,{fill:true})],
    'Packet Loss Rate (%)', { xLabel:'Concurrent Students' });

  // Chart 4: PDR Comparison (bar by scenario)
  makeBarChart('analytics-chart4', SCEN_LABELS,
    [dsBar('TCP PDR',SCEN_KEYS.map(s=>SIM_DATA.protocol[s].TCP.pdr_percent),C.tcp),
     dsBar('UDP PDR',SCEN_KEYS.map(s=>SIM_DATA.protocol[s].UDP.pdr_percent),C.udp)],
    'PDR (%)', { xLabel:'Traffic Scenario' });

  // Chart 5: Leaky Bucket Impact (Drops: with vs without)
  const lbTimes = SIM_DATA.leakyBucket.times.filter((_,i)=>i%5===0).map(Number);
  const lbWith  = SIM_DATA.leakyBucket.withDrops.filter((_,i)=>i%5===0);
  const lbWithout = SIM_DATA.leakyBucket.withoutDrops.filter((_,i)=>i%5===0);

  makeLineChart('analytics-chart5', lbTimes,
    [dsLine('Without Leaky Bucket (drops)',lbWithout,'#FF5722',{fill:true}),
     dsLine('With Leaky Bucket (drops)',lbWith,'#00BCD4',{fill:true})],
    'Cumulative Drops', { xLabel:'Time (s)' });

  // Chart 6: GBN Efficiency vs Window Size
  const gbn = SIM_DATA.gbn;
  makeLineChart('analytics-chart6', gbn.windowSizes,
    [dsLine('Loss=0%', gbn.loss0,  C.low,    {}),
     dsLine('Loss=5%', gbn.loss5,  C.medium, {}),
     dsLine('Loss=10%',gbn.loss10, C.high,   {}),
     dsLine('Loss=20%',gbn.loss20, C.red,    {})],
    'Efficiency (%)', { xLabel:'Window Size (W)' });
}

// ============================================================
// GBN EFFICIENCY CHART (Algorithm Tab)
// ============================================================
function initGBNEfficiencyChart() {
  const gbn = SIM_DATA.gbn;
  makeLineChart('gbn-efficiency-chart', gbn.windowSizes,
    [dsLine('Loss=0%',  gbn.loss0,  C.low,    {}),
     dsLine('Loss=5%',  gbn.loss5,  C.medium, {}),
     dsLine('Loss=10%', gbn.loss10, C.high,   {}),
     dsLine('Loss=20%', gbn.loss20, C.red,    {})],
    'Efficiency (%)', { xLabel:'Window Size (W)' });
}

function initLBTimelineChart() {
  const times  = SIM_DATA.leakyBucket.times.filter((_,i)=>i%5===0).map(Number);
  const bkt    = SIM_DATA.leakyBucket.bucketLevel.filter((_,i)=>i%5===0);
  const arr    = SIM_DATA.leakyBucket.arrivalRate.filter((_,i)=>i%5===0);
  makeLineChart('lb-timeline-chart', times,
    [dsLine('Bucket Level (pkts)',bkt,'#80CBC4',{fill:true}),
     dsLine('Arrival Rate (p/s)', arr,'#FF8A65',{fill:false})],
    'Value', { xLabel:'Time (s)' });
}

// ============================================================
// GO-BACK-N CANVAS VISUALIZER
// ============================================================
class GBNVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.W = this.canvas.offsetWidth  || 520;
    this.H = this.canvas.offsetHeight || 320;
    this.canvas.width  = this.W;
    this.canvas.height = this.H;

    this.windowSize   = 4;
    this.lossProb     = 0.15;
    this.speed        = 2;
    this.running      = false;
    this.animFrame    = null;

    // State
    this.totalFrames  = 20;
    this.frames       = [];
    this.windowBase   = 0;
    this.nextSeq      = 0;
    this.sentCount    = 0;
    this.ackedCount   = 0;
    this.retxCount    = 0;
    this.clock        = 0;
    this.inFlight     = [];  // animated packets on canvas

    this.SENDER_Y = 60;
    this.RECV_Y   = this.H - 60;
    this.FRAME_W  = 34;
    this.FRAME_GAP = 4;

    this.reset();
  }

  reset() {
    this.frames = Array.from({length: this.totalFrames}, (_, i) => ({
      seq: i, state: 'pending', x: 0,
    }));
    this.windowBase  = 0;
    this.nextSeq     = 0;
    this.sentCount   = 0;
    this.ackedCount  = 0;
    this.retxCount   = 0;
    this.clock       = 0;
    this.inFlight    = [];
    this.updateStats();
  }

  updateStats() {
    document.getElementById('gbn-stat-sent').textContent  = this.sentCount;
    document.getElementById('gbn-stat-acked').textContent = this.ackedCount;
    document.getElementById('gbn-stat-retx').textContent  = this.retxCount;
    document.getElementById('gbn-stat-base').textContent  = this.windowBase;
    const eff = this.sentCount > 0
      ? ((this.ackedCount / this.sentCount)*100).toFixed(1) + '%'
      : '--';
    document.getElementById('gbn-stat-eff').textContent = eff;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._tick();
  }

  stop() { this.running = false; if (this.animFrame) cancelAnimationFrame(this.animFrame); }

  _tick() {
    if (!this.running) return;
    this.clock++;

    // Every 30 ticks (speed-adjusted), advance simulation
    const interval = Math.max(5, 30 / this.speed);
    if (this.clock % interval === 0) {
      this._stepSimulation();
    }

    this._render();
    this.animFrame = requestAnimationFrame(() => this._tick());
  }

  _stepSimulation() {
    if (this.ackedCount >= this.totalFrames) return;

    // Send frames in window
    while (this.nextSeq < this.totalFrames &&
           this.nextSeq < this.windowBase + this.windowSize) {
      const f = this.frames[this.nextSeq];
      if (f.state === 'pending') {
        f.state = 'sent';
        this.sentCount++;
        const dropped = Math.random() < this.lossProb;
        this.inFlight.push({
          seq:      this.nextSeq,
          y:        this.SENDER_Y,
          progress: 0,
          speed:    0.04 * this.speed,
          dropped,
          isAck:    false,
          color:    dropped ? C.red : C.tcp,
        });
      }
      this.nextSeq++;
    }

    // Update inflight
    for (let i = this.inFlight.length-1; i >= 0; i--) {
      const pkt = this.inFlight[i];
      pkt.progress += pkt.speed;

      if (pkt.dropped && pkt.progress >= 0.5) {
        // Drop and trigger GBN retransmit
        const lostSeq = pkt.seq;
        this.inFlight.splice(i,1);
        this._triggerGBNRetransmit(lostSeq);
      } else if (!pkt.isAck && pkt.progress >= 1.0) {
        // Arrived at receiver → send ACK
        const seq = pkt.seq;
        this.inFlight.splice(i,1);
        this.inFlight.push({
          seq, y: this.RECV_Y,
          progress: 0,
          speed: 0.05 * this.speed,
          dropped: false,
          isAck: true,
          color: C.low,
        });
      } else if (pkt.isAck && pkt.progress >= 1.0) {
        // ACK received at sender
        const seq = pkt.seq;
        this.inFlight.splice(i,1);
        if (this.frames[seq].state !== 'acked') {
          this.frames[seq].state = 'acked';
          this.ackedCount++;
          // Slide window
          while (this.windowBase < this.totalFrames &&
                 this.frames[this.windowBase].state === 'acked') {
            this.windowBase++;
          }
        }
      }
    }

    this.updateStats();
  }

  _triggerGBNRetransmit(fromSeq) {
    // GBN: retransmit ALL from fromSeq to nextSeq-1
    for (let s = fromSeq; s < this.nextSeq; s++) {
      if (this.frames[s].state === 'sent') {
        this.frames[s].state = 'pending';
      }
    }
    this.nextSeq = fromSeq;
    this.retxCount++;
  }

  _render() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#08080F';
    ctx.fillRect(0,0,W,H);

    // Draw sender label
    ctx.fillStyle = C.tcp;
    ctx.font = 'bold 11px Inter,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📤 LMS CLIENT (Sender)', 10, this.SENDER_Y - 38);

    // Draw receiver label
    ctx.fillStyle = C.udp;
    ctx.fillText('📥 E-LEARNING SERVER (Receiver)', 10, this.RECV_Y + 28);

    // Draw sender/receiver lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(0,this.SENDER_Y); ctx.lineTo(W,this.SENDER_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,this.RECV_Y);   ctx.lineTo(W,this.RECV_Y);   ctx.stroke();
    ctx.setLineDash([]);

    // Draw frames
    const startX = 10;
    this.frames.forEach((f, i) => {
      const x = startX + i * (this.FRAME_W + this.FRAME_GAP);
      if (x + this.FRAME_W > W) return;
      f.x = x;

      const inWindow = i >= this.windowBase && i < this.windowBase + this.windowSize;
      let color = '#333';
      if (f.state === 'acked')   color = C.low;
      else if (f.state === 'sent' && inWindow) color = C.tcp;
      else if (inWindow)         color = C.amber + '80';

      ctx.fillStyle = color;
      ctx.strokeStyle = inWindow ? C.purple : 'transparent';
      ctx.lineWidth = inWindow ? 1.5 : 0;
      ctx.beginPath();
      ctx.roundRect(x, this.SENDER_Y - 18, this.FRAME_W, 18, 4);
      ctx.fill();
      if (inWindow) ctx.stroke();

      ctx.fillStyle = f.state === 'acked' ? '#000' : '#E8E8FF';
      ctx.font = '9px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.seq, x + this.FRAME_W/2, this.SENDER_Y - 5);
    });

    // Window bracket
    if (this.windowBase < this.totalFrames) {
      const wx1 = startX + this.windowBase * (this.FRAME_W + this.FRAME_GAP) - 2;
      const wx2 = wx1 + this.windowSize * (this.FRAME_W + this.FRAME_GAP);
      ctx.strokeStyle = C.purple + 'BB';
      ctx.lineWidth = 2;
      ctx.setLineDash([4,2]);
      ctx.beginPath();
      ctx.moveTo(wx1, this.SENDER_Y + 4);
      ctx.lineTo(wx1, this.SENDER_Y + 22);
      ctx.lineTo(wx2, this.SENDER_Y + 22);
      ctx.lineTo(wx2, this.SENDER_Y + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.purple;
      ctx.font = '9px Inter,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Window W=${this.windowSize}`, wx1, this.SENDER_Y + 35);
    }

    // Draw inflight packets
    this.inFlight.forEach(pkt => {
      const cx = W * 0.15 + pkt.seq * 3;
      const startY = pkt.isAck ? this.RECV_Y   : this.SENDER_Y;
      const endY   = pkt.isAck ? this.SENDER_Y : this.RECV_Y;
      const px     = cx;
      const py     = startY + (endY - startY) * pkt.progress;

      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI*2);
      ctx.fillStyle = pkt.color;
      ctx.shadowColor = pkt.color;
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.shadowBlur  = 0;

      if (pkt.dropped && pkt.progress > 0.45) {
        ctx.fillStyle = C.red;
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✕', px, py - 12);
      }

      // Seq label
      ctx.fillStyle = 'white';
      ctx.font = '7px JetBrains Mono,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pkt.seq, px, py + 2.5);
    });

    // Legend
    ctx.textAlign = 'left';
    ctx.font = '9px Inter,sans-serif';
    [[C.tcp,'Data Packet'],[C.low,'ACK'],[C.red,'Dropped/Lost'],[C.amber,'Window Frame']].forEach(([col,lbl],i) => {
      ctx.fillStyle = col;
      ctx.fillRect(W-140, 10+i*16, 8, 8);
      ctx.fillStyle = '#9999BB';
      ctx.fillText(lbl, W-128, 18+i*16);
    });

    // Completion overlay
    if (this.ackedCount >= this.totalFrames) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = C.low;
      ctx.font = 'bold 20px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✅ All Frames Delivered!', W/2, H/2);
      ctx.fillStyle = '#9999BB';
      ctx.font = '12px Inter,sans-serif';
      const eff = ((this.ackedCount/this.sentCount)*100).toFixed(1);
      ctx.fillText(`Efficiency: ${eff}% | Retransmissions: ${this.retxCount}`, W/2, H/2+30);
      this.running = false;
    }
  }
}

// ============================================================
// LEAKY BUCKET CANVAS VISUALIZER
// ============================================================
class LeakyBucketVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.W = this.canvas.offsetWidth  || 520;
    this.H = this.canvas.offsetHeight || 320;
    this.canvas.width  = this.W;
    this.canvas.height = this.H;

    this.capacity  = 40;
    this.leakRate  = 8;
    this.running   = false;
    this.animFrame = null;
    this.burstActive = false;

    // State
    this.bucket    = 0;
    this.arrived   = 0;
    this.output    = 0;
    this.dropped   = 0;
    this.clock     = 0;
    this.particles = [];  // incoming particles
    this.leakParticles = []; // outgoing particles

    this.BUCKET_X  = this.W / 2 - 50;
    this.BUCKET_Y  = this.H * 0.18;
    this.BUCKET_W  = 100;
    this.BUCKET_H  = this.H * 0.50;

    this.reset();
  }

  reset() {
    this.bucket = 0; this.arrived = 0; this.output = 0;
    this.dropped = 0; this.clock = 0;
    this.particles = []; this.leakParticles = [];
    this.burstActive = false;
    this.updateStats();
  }

  updateStats() {
    document.getElementById('lb-stat-arrived').textContent = this.arrived;
    document.getElementById('lb-stat-output').textContent  = this.output;
    document.getElementById('lb-stat-dropped').textContent = this.dropped;
    document.getElementById('lb-stat-bucket').textContent  = this.bucket;
    const dr = this.arrived > 0 ? ((this.dropped/this.arrived)*100).toFixed(1)+'%' : '0%';
    document.getElementById('lb-stat-droprate').textContent = dr;
  }

  burst() {
    this.burstActive = true;
    setTimeout(() => { this.burstActive = false; }, 2000);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._tick();
  }

  stop() { this.running = false; if (this.animFrame) cancelAnimationFrame(this.animFrame); }

  _tick() {
    if (!this.running) return;
    this.clock++;

    // Every 15 ticks: simulate one time step
    if (this.clock % 15 === 0) {
      const arrRate = this.burstActive ? 35 : (8 + Math.sin(this.clock*0.02)*3);
      const newPkts = Math.round(arrRate * 0.1);

      // Add particles for visualization
      for (let i = 0; i < Math.min(newPkts, 4); i++) {
        this.particles.push({
          x: this.BUCKET_X + Math.random()*this.BUCKET_W,
          y: 0,
          vy: 3 + Math.random()*2,
          state: 'falling',  // falling | accepted | dropped
          color: this.burstActive ? C.high : C.udp,
        });
      }

      // Simulate bucket logic
      const space    = this.capacity - this.bucket;
      const accepted = Math.min(newPkts, space);
      const overflow = newPkts - accepted;
      this.bucket += accepted;
      this.arrived += newPkts;
      this.dropped += overflow;

      // Leak
      const toLeakCount = Math.min(this.bucket, Math.round(this.leakRate * 0.1));
      this.bucket -= toLeakCount;
      this.output += toLeakCount;

      // Leak particles
      for (let i = 0; i < Math.min(toLeakCount, 3); i++) {
        this.leakParticles.push({
          x: this.BUCKET_X + this.BUCKET_W/2 + (Math.random()-0.5)*20,
          y: this.BUCKET_Y + this.BUCKET_H,
          vy: 2,
          alpha: 1.0,
          color: C.low,
        });
      }

      this.updateStats();
    }

    this._render();
    this.animFrame = requestAnimationFrame(() => this._tick());
  }

  _render() {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const BX = this.BUCKET_X, BY = this.BUCKET_Y;
    const BW = this.BUCKET_W, BH = this.BUCKET_H;

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#08080F';
    ctx.fillRect(0,0,W,H);

    // ---- Draw Bucket Shell ----
    ctx.strokeStyle = '#4FC3F7';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(BX, BY);
    ctx.lineTo(BX, BY + BH);
    ctx.lineTo(BX + BW, BY + BH);
    ctx.lineTo(BX + BW, BY);
    ctx.stroke();

    // ---- Bucket Fill ----
    const fillH = (this.bucket / this.capacity) * BH;
    const fillY = BY + BH - fillH;
    const fillGrad = ctx.createLinearGradient(BX, fillY, BX, BY+BH);
    const overflowRatio = this.bucket / this.capacity;
    if (overflowRatio > 0.85) {
      fillGrad.addColorStop(0, C.high + 'CC');
      fillGrad.addColorStop(1, C.high + '44');
    } else if (overflowRatio > 0.6) {
      fillGrad.addColorStop(0, C.amber + 'CC');
      fillGrad.addColorStop(1, C.amber + '44');
    } else {
      fillGrad.addColorStop(0, '#00BCD4CC');
      fillGrad.addColorStop(1, '#00BCD444');
    }
    ctx.fillStyle = fillGrad;
    ctx.fillRect(BX+1, fillY, BW-2, fillH);

    // Capacity lines
    for (let p = 0.25; p <= 1.0; p += 0.25) {
      const lineY = BY + BH - p * BH;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2,4]);
      ctx.beginPath(); ctx.moveTo(BX,lineY); ctx.lineTo(BX+BW,lineY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#5C5C7A'; ctx.font = '8px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(p*this.capacity)}`, BX-4, lineY+3);
    }

    // Leak hole at bottom
    ctx.beginPath();
    ctx.arc(BX + BW/2, BY+BH+8, 6, 0, Math.PI*2);
    ctx.fillStyle = C.low;
    ctx.fill();

    // Capacity label
    ctx.textAlign = 'center';
    ctx.fillStyle = C.cyan;
    ctx.font = 'bold 10px Inter,sans-serif';
    ctx.fillText(`Bucket Capacity: ${this.capacity} pkts`, BX+BW/2, BY-8);

    // Bucket level %
    const pct = Math.round((this.bucket/this.capacity)*100);
    ctx.fillStyle = overflowRatio > 0.85 ? C.high : C.text;
    ctx.font = 'bold 14px JetBrains Mono,monospace';
    ctx.fillText(`${pct}%`, BX+BW/2, BY+BH/2+5);

    // ---- Leak Rate Label ----
    ctx.fillStyle = C.low;
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`↓ Leak Rate: ${this.leakRate} pkt/s`, BX+BW/2, BY+BH+28);

    // ---- Arrival arrow label ----
    ctx.fillStyle = this.burstActive ? C.high : C.udp;
    ctx.font = this.burstActive ? 'bold 11px Inter,sans-serif' : '10px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.burstActive ? '⚡ BURST TRAFFIC!' : '↓ Bursty Arrivals', BX+BW/2, 20);

    // ---- Update incoming particles ----
    for (let i = this.particles.length-1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy;

      // Check if reached bucket top
      if (p.y >= BY && p.state === 'falling') {
        p.state = (this.bucket < this.capacity) ? 'accepted' : 'dropped';
        p.color = p.state === 'dropped' ? C.red : C.low;
      }

      if (p.state === 'dropped' && p.y > BY + 20) {
        this.particles.splice(i,1); continue;
      }
      if (p.state === 'accepted' && p.y > BY + BH) {
        this.particles.splice(i,1); continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 6;
      ctx.fill();
      ctx.shadowBlur  = 0;

      if (p.state === 'dropped') {
        ctx.fillStyle = C.red;
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✕', p.x, p.y - 8);
      }
    }

    // ---- Update leak particles ----
    for (let i = this.leakParticles.length-1; i >= 0; i--) {
      const p = this.leakParticles[i];
      p.y  += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0 || p.y > H) { this.leakParticles.splice(i,1); continue; }
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ---- Side labels ----
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9999BB'; ctx.font = '9px Inter,sans-serif';
    ctx.fillText('NETWORK', 10, H*0.65);
    ctx.fillText('SIDE', 10, H*0.65+14);

    ctx.textAlign = 'right';
    ctx.fillText('OUTPUT', W-10, H*0.65);
    ctx.fillText('(regulated)', W-10, H*0.65+14);

    // Burst overlay
    if (this.burstActive) {
      ctx.fillStyle = 'rgba(255,23,68,0.06)';
      ctx.fillRect(0,0,W,H);
    }
  }
}

// ============================================================
// LIVE SIMULATION (Tab 2)
// ============================================================
class LiveSimulation {
  constructor() {
    this.canvas  = document.getElementById('sim-canvas');
    this.ctx     = this.canvas.getContext('2d');
    this.W = this.canvas.offsetWidth  || 1200;
    this.H = this.canvas.offsetHeight || 480;
    this.canvas.width  = 1200;
    this.canvas.height = 480;

    this.users    = 20;
    this.lossProb = 0.05;
    this.protocol = 'both';
    this.running  = false;
    this.animFrame = null;
    this.clock    = 0;

    this.sent = 0; this.recv = 0; this.drop = 0;
    this.packets = [];
  }

  setParams(users, lossPct, protocol) {
    this.users    = users;
    this.lossProb = lossPct / 100;
    this.protocol = protocol;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._tick();
  }

  pause() { this.running = false; }

  reset() {
    this.running = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.clock = 0;
    this.sent = this.recv = this.drop = 0;
    this.packets = [];
    this._render();
    this._updateLiveStats();
  }

  _updateLiveStats() {
    document.getElementById('live-sent').textContent = this.sent;
    document.getElementById('live-recv').textContent = this.recv;
    document.getElementById('live-drop').textContent = this.drop;
    const tput = Math.round((this.recv * 1460 * 8) / Math.max(this.clock/60, 1) / 1000);
    document.getElementById('live-tput').textContent = tput;
  }

  _tick() {
    if (!this.running) return;
    this.clock++;

    // Spawn packets based on user count
    if (this.clock % Math.max(2, Math.round(60/this.users)) === 0) {
      const proto = this.protocol === 'both'
        ? (Math.random() > 0.5 ? 'TCP' : 'UDP')
        : this.protocol.toUpperCase();
      const dropped = Math.random() < this.lossProb;
      this.packets.push({
        x:     30,
        y:     20 + Math.random() * (this.H - 40),
        vx:    2.5 + Math.random() * 1.5,
        proto: proto,
        color: proto === 'TCP' ? C.tcp : C.udp,
        dropped,
        dead:  false,
        size:  dropped ? 5 : 6,
      });
      this.sent++;
    }

    // Update packets
    for (let i = this.packets.length-1; i >= 0; i--) {
      const p = this.packets[i];
      p.x += p.vx;

      if (p.dropped && p.x > this.W * 0.5) {
        this.drop++;
        this.packets.splice(i, 1);
        continue;
      }
      if (p.x > this.W - 30) {
        this.recv++;
        this.packets.splice(i, 1);
        continue;
      }
    }

    // Keep packet count sane
    if (this.packets.length > 300) this.packets.splice(0, 50);

    this._render();
    if (this.clock % 10 === 0) this._updateLiveStats();
    this.animFrame = requestAnimationFrame(() => this._tick());
  }

  _render() {
    const ctx = this.ctx;
    const W = 1200, H = 480;

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#08080F';
    ctx.fillRect(0,0,W,H);

    // Network pipeline visualization
    // Draw nodes
    const nodeY = H/2;
    const nodeConfigs = [
      { x:30,   label:'Students',      icon:'👨‍💻', color:C.purple },
      { x:220,  label:'Access SW',     icon:'📶',  color:C.tcp   },
      { x:420,  label:'Core Router',   icon:'🔀',  color:C.amber },
      { x:650,  label:'Gateway',       icon:'🌐',  color:C.cyan  },
      { x:900,  label:'Core Switch',   icon:'⚡',  color:C.tcp   },
      { x:W-30, label:'E-Learn Server',icon:'🖥️', color:C.green },
    ];

    // Draw pipe
    const pipeY1 = H*0.3, pipeY2 = H*0.7;
    const grad = ctx.createLinearGradient(30,0,W-30,0);
    grad.addColorStop(0,    'rgba(124,77,255,0.15)');
    grad.addColorStop(0.45, 'rgba(0,229,255,0.10)');
    grad.addColorStop(0.75, 'rgba(255,109,0,0.12)');
    grad.addColorStop(1.0,  'rgba(0,230,118,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(30, pipeY1, W-60, pipeY2-pipeY1);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, pipeY1, W-60, pipeY2-pipeY1);

    // Bottleneck indicator
    const bx = 600;
    ctx.strokeStyle = this.lossProb > 0.1 ? C.high+'80' : C.amber+'40';
    ctx.lineWidth = 2;
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(bx, pipeY1-10); ctx.lineTo(bx, pipeY2+10); ctx.stroke();
    ctx.setLineDash([]);
    if (this.lossProb > 0.1) {
      ctx.fillStyle = C.high;
      ctx.font = '9px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ Congestion', bx, pipeY1-14);
    }

    // Draw inflight packets
    this.packets.forEach(p => {
      const color = p.dropped && p.x > W*0.4 ? C.red : p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 6;
      ctx.fill();
      ctx.shadowBlur  = 0;
    });

    // Draw network nodes
    nodeConfigs.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, nodeY, 22, 0, Math.PI*2);
      ctx.fillStyle = '#0E0E24';
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();

      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = n.color;
      ctx.fillText(n.icon, n.x, nodeY+5);

      ctx.font = '9px Inter,sans-serif';
      ctx.fillStyle = '#9999BB';
      ctx.fillText(n.label, n.x, nodeY+36);
    });

    // Stats bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, H-32, W, 32);
    ctx.font = '11px JetBrains Mono,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = C.tcp;
    ctx.fillText(`Sent: ${this.sent}`, 20, H-12);
    ctx.fillStyle = C.green;
    ctx.fillText(`Recv: ${this.recv}`, 150, H-12);
    ctx.fillStyle = C.red;
    ctx.fillText(`Dropped: ${this.drop}`, 280, H-12);
    ctx.fillStyle = '#9999BB';
    const pdr = this.sent > 0 ? ((this.recv/this.sent)*100).toFixed(1) : '100.0';
    ctx.fillText(`PDR: ${pdr}%`, 420, H-12);
    ctx.fillStyle = C.udp;
    ctx.fillText(`Users: ${this.users} | Loss: ${(this.lossProb*100).toFixed(0)}%`, 540, H-12);
  }
}

// ============================================================
// THEME MANAGER — Dark / Light Toggle
// ============================================================
function initThemeSwitcher() {
  const toggleBtn   = document.getElementById('theme-toggle-btn');
  const themeIcon   = document.getElementById('theme-icon');
  const themeLabel  = document.getElementById('theme-label');
  const savedTheme  = localStorage.getItem('cnip_theme') || 'dark';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('cnip_theme', theme);

    const isLight = (theme === 'light');
    if (themeIcon)  themeIcon.textContent  = isLight ? '🌙' : '☀️';
    if (themeLabel) themeLabel.textContent = isLight ? 'Dark' : 'Light';

    // Update Chart.js global defaults
    if (window.Chart) {
      Chart.defaults.color       = isLight ? '#374151' : '#94A3B8';
      Chart.defaults.borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

      Object.values(Chart.instances || {}).forEach(chart => {
        if (chart.options && chart.options.scales) {
          Object.values(chart.options.scales).forEach(scale => {
            if (scale.ticks) scale.ticks.color = isLight ? '#374151' : '#94A3B8';
            if (scale.grid)  scale.grid.color  = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
          });
        }
        if (chart.options?.plugins?.legend?.labels) {
          chart.options.plugins.legend.labels.color = isLight ? '#1F2937' : '#E8E8FF';
        }
        chart.update();
      });
    }
  }

  // Apply saved theme on load
  applyTheme(savedTheme);

  // Toggle between dark and light on button click
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}

// ============================================================
// INITIALIZATION
// ============================================================
let gbnViz, lbViz, liveSim;

function init() {
  // Theme switcher
  initThemeSwitcher();

  // Navigation
  initNavigation();

  // Topology canvas
  initTopologyCanvas();

  // Metrics and overview charts
  updateOverviewMetrics('medium');
  initOverviewCharts();

  // Scenario buttons (Overview tab)
  initScenarioButtons('.scenario-btn', (s) => {
    updateOverviewMetrics(s);
  });

  // Protocol tab
  initProtocolCharts();

  // Algorithm Visualizers
  gbnViz = new GBNVisualizer('gbn-canvas');
  lbViz  = new LeakyBucketVisualizer('lb-canvas');
  gbnViz._render();
  lbViz._render();

  // GBN Controls
  const gbnWindowSlider = document.getElementById('gbn-window');
  const gbnLossSlider   = document.getElementById('gbn-loss');
  const gbnSpeedSlider  = document.getElementById('gbn-speed');

  gbnWindowSlider.addEventListener('input', function() {
    document.getElementById('gbn-window-val').textContent = this.value;
    gbnViz.windowSize = parseInt(this.value);
  });
  gbnLossSlider.addEventListener('input', function() {
    document.getElementById('gbn-loss-val').textContent = this.value + '%';
    gbnViz.lossProb = parseInt(this.value) / 100;
  });
  gbnSpeedSlider.addEventListener('input', function() {
    document.getElementById('gbn-speed-val').textContent = this.value + 'x';
    gbnViz.speed = parseInt(this.value);
  });

  document.getElementById('gbn-start-btn').addEventListener('click', function() {
    if (gbnViz.running) {
      gbnViz.stop();
      this.textContent = '▶ Start';
    } else {
      gbnViz.start();
      this.textContent = '⏸ Pause';
    }
  });
  document.getElementById('gbn-reset-btn').addEventListener('click', () => {
    gbnViz.stop();
    document.getElementById('gbn-start-btn').textContent = '▶ Start';
    gbnViz.reset();
    gbnViz._render();
  });

  // LB Controls
  document.getElementById('lb-capacity').addEventListener('input', function() {
    document.getElementById('lb-capacity-val').textContent = this.value + ' pkts';
    lbViz.capacity = parseInt(this.value);
  });
  document.getElementById('lb-leak').addEventListener('input', function() {
    document.getElementById('lb-leak-val').textContent = this.value + ' p/s';
    lbViz.leakRate = parseInt(this.value);
  });
  document.getElementById('lb-burst-btn').addEventListener('click', () => lbViz.burst());

  document.getElementById('lb-start-btn').addEventListener('click', function() {
    if (lbViz.running) {
      lbViz.stop();
      this.textContent = '▶ Start';
    } else {
      lbViz.start();
      this.textContent = '⏸ Pause';
    }
  });
  document.getElementById('lb-reset-btn').addEventListener('click', () => {
    lbViz.stop();
    document.getElementById('lb-start-btn').textContent = '▶ Start';
    lbViz.reset();
    lbViz._render();
  });

  // Analytics charts
  initAnalyticsCharts();
  initGBNEfficiencyChart();
  initLBTimelineChart();

  // Live Simulation (Tab 2)
  liveSim = new LiveSimulation();

  const simUsersSlider = document.getElementById('sim-users');
  const simRateSlider  = document.getElementById('sim-rate');
  const simLossSlider  = document.getElementById('sim-loss');
  const simProtoSel    = document.getElementById('sim-protocol');

  function updateSimParams() {
    const users = parseInt(simUsersSlider.value);
    const loss  = parseInt(simLossSlider.value);
    const proto = simProtoSel.value;
    document.getElementById('sim-users-val').textContent = users;
    document.getElementById('sim-rate-val').textContent  = simRateSlider.value + ' Mbps';
    document.getElementById('sim-loss-val').textContent  = loss + '%';
    liveSim.setParams(users, loss, proto);
  }

  [simUsersSlider, simRateSlider, simLossSlider, simProtoSel].forEach(el =>
    el.addEventListener('input', updateSimParams));

  document.getElementById('sim-start-btn').addEventListener('click', function() {
    liveSim.start();
    this.disabled = true;
    document.getElementById('sim-pause-btn').disabled = false;
  });

  document.getElementById('sim-pause-btn').addEventListener('click', function() {
    liveSim.pause();
    this.disabled = true;
    document.getElementById('sim-start-btn').disabled = false;
  });

  document.getElementById('sim-reset-btn').addEventListener('click', () => {
    liveSim.reset();
    document.getElementById('sim-start-btn').disabled = false;
    document.getElementById('sim-pause-btn').disabled = true;
  });

  liveSim._render();

  // Append log entries
  appendLog('[OK]     Web Dashboard initialized successfully!', 'success');
  appendLog('[OK]     All interactive visualizers ready.', 'success');
}

function appendLog(msg, type='info') {
  const log = document.getElementById('sim-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = `log-${type}`;
  const ts = new Date().toLocaleTimeString();
  div.innerHTML = `<span class="log-time">[${ts}]</span> ${msg}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// Start everything when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
