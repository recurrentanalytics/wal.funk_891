/* The dive: a sticky stage that changes with each story step.
   Step 2-4 draw the real sea-floor profile from Moss Landing to the MARS hydrophone (GMRT grid in data/bathy.json). */
(function () {
  const stage = document.getElementById('stage'); if (!stage) return;
  const steps = [...document.querySelectorAll('.step')];
  const svg = stage.querySelector('svg');
  const S = (tag, a = {}) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in a) n.setAttribute(k, a[k]); return n; };
  const layer = (id) => svg.querySelector(`#${id}`);
  const BG = ['#0b1a24', '#0c2331', '#0a2a3a', '#041520', '#020b10'];
  const gaugeVal = document.getElementById('st-depth'), gaugeLbl = document.getElementById('st-lbl'), gaugeFill = document.getElementById('st-fill');

  /* ---- scene 0: the Pi ---- */
  function drawPi() {
    const g = layer('sc-pi');
    g.append(S('rect', { x: 330, y: 250, width: 340, height: 220, rx: 14, fill: '#0f5a3a', stroke: '#2e8a5e', 'stroke-width': 2 }));
    for (let i = 0; i < 20; i++) g.append(S('rect', { x: 350 + i * 15, y: 262, width: 8, height: 8, fill: '#c9a227' }));
    g.append(S('rect', { x: 400, y: 320, width: 90, height: 90, rx: 6, fill: '#1d2a30', stroke: '#3c5560' }));
    g.append(S('rect', { x: 520, y: 330, width: 60, height: 40, rx: 4, fill: '#1d2a30' }));
    g.append(S('rect', { x: 600, y: 300, width: 70, height: 50, fill: '#9aa4a8' }), S('rect', { x: 600, y: 380, width: 70, height: 50, fill: '#9aa4a8' }));
    g.append(S('circle', { class: 'led', cx: 360, cy: 450, r: 6, fill: '#b7f36a' }));
    [0, 1, 2].forEach((i) => g.append(S('path', { class: `wifi w${i}`, d: `M ${470 - 30 * (i + 1)} ${210 - 14 * i} Q 500 ${180 - 40 * (i + 1)} ${530 + 30 * (i + 1)} ${210 - 14 * i}`, fill: 'none', stroke: '#5ee6d7', 'stroke-width': 4, 'stroke-linecap': 'round' })));
    const tx = S('text', { x: 500, y: 520, class: 'st-label', 'text-anchor': 'middle' }); tx.textContent = t('dive.pi'); g.append(tx);
  }
  /* ---- scene 1: the archive ---- */
  function drawCloud() {
    const g = layer('sc-cloud');
    g.append(S('path', { d: 'M 560 210 a 60 60 0 0 1 110 -30 a 70 70 0 0 1 130 30 a 50 50 0 0 1 -10 100 h -220 a 55 55 0 0 1 -10 -100 z', fill: '#16384a', stroke: '#5ee6d7', 'stroke-width': 2 }));
    const tx = S('text', { x: 680, y: 270, class: 'st-label', 'text-anchor': 'middle' }); tx.textContent = t('dive.cloud'); g.append(tx);
    g.append(S('rect', { x: 170, y: 470, width: 150, height: 96, rx: 8, fill: '#0f5a3a', stroke: '#2e8a5e', 'stroke-width': 2 }));
    const p = S('path', { id: 'stream', d: 'M 640 320 C 600 460, 420 420, 330 500', fill: 'none', stroke: 'rgba(94,230,215,.25)', 'stroke-width': 2, 'stroke-dasharray': '4 8' }); g.append(p);
    for (let i = 0; i < 9; i++) { const c = S('circle', { r: 5, fill: '#5ee6d7', class: 'packet' }); c.style.offsetPath = `path('M 640 320 C 600 460, 420 420, 330 500')`; c.style.animationDelay = `${i * .33}s`; g.append(c); }
    const tp = S('text', { x: 245, y: 600, class: 'st-label', 'text-anchor': 'middle' }); tp.textContent = t('dive.pi'); g.append(tp);
  }
  /* ---- scenes 2-4: the real profile ---- */
  let zoomGroup = null, hpXY = null;
  function drawProfile(b) {
    const raw = atob(b.int16_le_b64_rowmajor_north_first), buf = new ArrayBuffer(raw.length), u8 = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const z = new Int16Array(buf), C = b.cols, R = b.rows;
    const depthAt = (lat, lon) => { const c = Math.round((lon - b.west) / b.cell_deg), r = Math.round((b.north - lat) / b.cell_deg); return (c < 0 || r < 0 || c >= C || r >= R) ? null : z[r * C + c]; };
    const A = [36.8045, -121.7880], H = [36.7125, -122.1868];   // Moss Landing -> MARS hydrophone
    const km = (p, q) => { const dy = (q[0] - p[0]) * 110.57, dx = (q[1] - p[1]) * 111.32 * Math.cos(p[0] * Math.PI / 180); return Math.hypot(dx, dy); };
    const total = km(A, H), N = 260, ext = 1.12;
    const pts = [];
    for (let i = 0; i <= N; i++) { const f = i / N * ext; const lat = A[0] + (H[0] - A[0]) * f, lon = A[1] + (H[1] - A[1]) * f; const d = depthAt(lat, lon); if (d != null) pts.push([f * total, d]); }
    const X0 = 110, X1 = 920, SEA = 190, YM = 640, DMAX = 1150;
    const x = (k) => X0 + (X1 - X0) * k / (total * ext), y = (m) => m >= 0 ? SEA - m / 8 : SEA + (-m / DMAX) * (YM - SEA);
    const g = layer('sc-profile'); zoomGroup = S('g', { class: 'zoom' }); g.append(zoomGroup);
    const zg = zoomGroup;
    zg.append(S('rect', { x: 0, y: 0, width: 1000, height: SEA, fill: 'url(#sky)' }), S('rect', { x: 0, y: SEA, width: 1000, height: 700 - SEA, fill: 'url(#sea)' }));
    const floor = `M ${x(0)} ${y(pts[0][1])} ` + pts.map(([k, d]) => `L ${x(k).toFixed(1)} ${y(d).toFixed(1)}`).join(' ');
    zg.append(S('path', { d: `${floor} L ${x(pts[pts.length - 1][0])} 700 L ${x(0)} 700 Z`, fill: '#0d2028' }), S('path', { d: floor, fill: 'none', stroke: '#2d6276', 'stroke-width': 2 }));
    zg.append(S('rect', { x: 0, y: SEA - 18, width: x(0.6), height: 700, fill: '#2b3a2e' }), S('line', { x1: 0, x2: 1000, y1: SEA, y2: SEA, stroke: 'rgba(94,230,215,.35)', 'stroke-width': 1.5 }));
    const cp = pts.filter(([k, d]) => k >= 0.6 && k <= total && d < 0);
    const cable = S('path', { class: 'cable', d: `M ${x(0.6)} ${SEA - 2} ` + cp.map(([k, d]) => `L ${x(k).toFixed(1)} ${(y(d) - 3).toFixed(1)}`).join(' '), fill: 'none', stroke: '#ffb547', 'stroke-width': 2.5, 'stroke-dasharray': '6 5' });
    zg.append(cable);
    hpXY = [x(total), y(-891)];
    zg.append(S('circle', { cx: hpXY[0], cy: hpXY[1] - 6, r: 7, fill: '#ffb547', class: 'hp-dot' }));
    const hl = S('text', { x: hpXY[0] - 12, y: hpXY[1] - 22, class: 'st-label small', 'text-anchor': 'end' }); hl.textContent = t('dive.hydrophone'); zg.append(hl);
    const sl = S('text', { x: x(0.3), y: SEA - 30, class: 'st-label small' }); sl.textContent = t('dive.shore'); zg.append(sl);
    [0, 10, 20, 30].forEach((k) => { const tk = S('text', { x: x(k), y: 676, class: 'st-tick', 'text-anchor': 'middle' }); tk.textContent = k ? `${k} km` : '0'; zg.append(tk); });
    [[-500, '500 m'], [-1000, '1,000 m']].forEach(([m, l]) => { zg.append(S('line', { x1: X0 - 40, x2: X1, y1: y(m), y2: y(m), stroke: 'rgba(127,162,174,.15)', 'stroke-dasharray': '3 6' })); const tk = S('text', { x: X0 - 44, y: y(m) + 4, class: 'st-tick', 'text-anchor': 'end' }); tk.textContent = l; zg.append(tk); });
    // whale (scene 4)
    const wg = S('g', { class: 'whale-g' }); const wp = S('path', { d: whalePath(170, 26, 3, 'baleen', .1), fill: '#5ee6d7', opacity: .9 });
    const wx = hpXY[0] - 330, wy = hpXY[1] - 150; wp.setAttribute('transform', `translate(${wx} ${wy})`); wg.append(wp);
    for (let i = 0; i < 4; i++) wg.append(S('circle', { class: `ring r${i}`, cx: wx + 40, cy: wy + 14, r: 10, fill: 'none', stroke: '#5ee6d7', 'stroke-width': 2 }));
    const hz = S('text', { x: wx + 40, y: wy - 18, class: 'st-label small', 'text-anchor': 'middle' }); hz.textContent = '≈ 43 Hz'; wg.append(hz);
    zg.append(wg);
    document.getElementById('st-note').textContent = t('dive.profile');
    apply(current);
  }
  /* ---- marine snow ---- */
  const snow = stage.querySelector('canvas'); let flakes = [], snowOn = false;
  function snowLoop() {
    const c = snow.getContext('2d'), W = snow.width = snow.clientWidth, H = snow.height = snow.clientHeight;
    if (!flakes.length) flakes = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .4, v: Math.random() * .3 + .1, d: Math.random() * 2 }));
    const f = () => {
      c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(220,236,241,.55)';
      flakes.forEach((p) => { p.y += p.v; p.x += Math.sin((p.y + p.d * 50) / 40) * .15; if (p.y > H) { p.y = -4; p.x = Math.random() * W; } c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); });
      if (snowOn && !matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(f);
    };
    f();
  }
  /* ---- step switching ---- */
  let current = 0, shown = 0;
  const DEPTH = [0, 0, 0, 891, 891];
  const ZOOM = [null, null, 'none', 'zoom-hp', 'zoom-whale'];
  function apply(i) {
    current = i;
    stage.style.setProperty('--stage-bg', BG[i]);
    svg.querySelectorAll('.scene').forEach((s) => s.classList.toggle('on', +s.dataset.from <= i && i <= +s.dataset.to));
    if (zoomGroup && hpXY) {
      const z = ZOOM[i];
      const k = z === 'zoom-hp' ? 2.4 : z === 'zoom-whale' ? 1.6 : 1;
      const cx = z === 'zoom-whale' ? hpXY[0] - 170 : hpXY[0] - 40, cy = hpXY[1] - (z === 'zoom-whale' ? 80 : 20);
      zoomGroup.style.transform = k === 1 ? 'none' : `translate(${500 - cx * k}px, ${380 - cy * k}px) scale(${k})`;
      zoomGroup.classList.toggle('show-whale', i === 4);
      zoomGroup.classList.toggle('draw-cable', i >= 2);
    }
    const was = snowOn; snowOn = i >= 3; snow.style.opacity = snowOn ? 1 : 0; if (snowOn && !was) snowLoop();
    const to = DEPTH[i], from = shown, t0 = performance.now();
    const anim = (tt) => { const k = Math.min(1, (tt - t0) / 900), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); gaugeVal.textContent = `${v.toLocaleString(I18N.locale)} m`; if (k < 1) requestAnimationFrame(anim); else shown = to; };
    requestAnimationFrame(anim);
    gaugeLbl.textContent = t(`dive.s${i}.l`);
    gaugeFill.style.height = `${Math.max(3, to / 891 * 100)}%`;
    steps.forEach((s, j) => s.classList.toggle('on', j === i));
    document.getElementById('st-note').style.opacity = i >= 2 ? 1 : 0;
  }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) apply(+e.target.dataset.i); }), { rootMargin: '-45% 0px -45% 0px' });
  I18N.ready.then(() => {
    drawPi(); drawCloud(); apply(0);
    steps.forEach((s) => io.observe(s));
    fetch('data/bathy.json').then((r) => r.json()).then(drawProfile).catch(() => {});
  });
})();
