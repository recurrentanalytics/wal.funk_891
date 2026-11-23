/* Sound atlas (zoomable map of every sampled window), "who sings when" clock, and "the Pi learns" panel.
   Uses $, el, t, num, getJSON from app.js / i18n.js. */
(function () {
  const PAL = ['#5ee6d7', '#ffb547', '#ff6b5b', '#b48cff', '#4c8dff', '#b7f36a', '#ff8fd0', '#ffd166', '#06d6a0', '#ef476f', '#8ecae6', '#f4a261', '#c77dff', '#90be6d', '#e9c46a', '#48cae4'];
  const LETTER = (i) => String.fromCharCode(65 + i);
  function building(target, prog) {
    const host = typeof target === 'string' ? $(target) : target; if (!host) return;
    const card = el('div', 'building');
    card.append(el('span', 'kicker', t('build.kicker')), el('b', '', t('build.title')));
    if (prog) {
      const bar = el('div', 'bar'); const f = el('span'); f.style.width = `${Math.max(1, 100 * (prog.done + prog.skipped) / prog.total)}%`; bar.append(f);
      card.append(bar, el('span', 'note', t('build.prog', { done: num(prog.done), total: num(prog.total), skip: num(prog.skipped) })));
    }
    card.append(el('span', 'note', t('build.note')));
    host.replaceWith(card); card.id = host.id;
  }

  function atlas(a) {
    const cv = $('atlas'), box = $('atlas-side'), mf = $('atlas-months');
    $('atlas-sum').textContent = t('atlas.sum', { hours: num(a.hours), windows: num(a.windows_total), shown: num(a.windows_shown), k: a.islands.length, from: a.first_day, to: a.last_day });
    let view = { x: 0, y: 0, k: 1 }, sel = null, month = 0, ptrs = new Map(), last = null;
    const audio = new Audio();
    // month filter
    mf.replaceChildren();
    ['all', ...t('whales.monthsabbr').split('|')].forEach((m, i) => { const b = el('button', 'chip', i === 0 ? t('atlas.all') : m); b.type = 'button'; b.setAttribute('aria-pressed', String(i === 0)); b.addEventListener('click', () => { month = i; mf.querySelectorAll('button').forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); draw(); }); mf.append(b); });
    function toScreen(x, y, W, H) { const p = 20; return [(p + x * (W - 2 * p) - W / 2) * view.k + W / 2 + view.x, (p + (1 - y) * (H - 2 * p) - H / 2) * view.k + H / 2 + view.y]; }
    function draw() {
      const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
      const r = Math.max(1.4, Math.min(4, 2 * Math.sqrt(view.k)));
      a.points.forEach(([x, y, c, m]) => {
        const on = !month || m === month; const [sx, sy] = toScreen(x, y, W, H);
        if (sx < -5 || sy < -5 || sx > W + 5 || sy > H + 5) return;
        g.globalAlpha = on ? (sel == null || sel === c ? .85 : .12) : .05; g.fillStyle = PAL[c % PAL.length];
        g.beginPath(); g.arc(sx, sy, r, 0, 7); g.fill();
      });
      g.globalAlpha = 1; g.font = '500 13px "IBM Plex Mono", monospace'; g.textAlign = 'center';
      a.islands.forEach((is) => { const [sx, sy] = toScreen(is.cx, is.cy, W, H); g.fillStyle = 'rgba(2,11,16,.75)'; g.fillRect(sx - 11, sy - 10, 22, 19); g.fillStyle = PAL[is.id % PAL.length]; g.fillText(LETTER(is.id), sx, sy + 4); });
    }
    function pick(ev) {
      const r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top; let best = null, bd = 400;
      a.points.forEach(([x, y, c]) => { const [sx, sy] = toScreen(x, y, r.width, r.height); const d = (sx - mx) ** 2 + (sy - my) ** 2; if (d < bd) { bd = d; best = c; } });
      select(best);
    }
    function select(c) {
      sel = c; draw(); box.replaceChildren();
      if (c == null) { box.append(el('p', 'note', t('atlas.pick'))); return; }
      const is = a.islands[c];
      box.append(el('span', 'kicker', t('atlas.island', { l: LETTER(c) })), el('div', 'big-num', num(is.n)), el('p', 'note', t('atlas.windows', { pct: num(100 * is.n / a.windows_shown, 1) })));
      const ex = el('div', 'atlas-ex');
      is.examples.forEach((e, i) => { const b = el('button', 'ghost'); b.type = 'button'; b.textContent = `▶ ${t('atlas.example', { n: i + 1 })}`; b.title = `${e.day} ${String(e.hour).padStart(2, '0')}:00 UTC + ${e.s} s`; b.addEventListener('click', () => { audio.src = e.file; audio.play().catch(() => {}); }); ex.append(b); });
      box.append(el('span', 'kicker', t('atlas.hear')), ex, el('p', 'note', t('atlas.ex.note')));
      box.append(el('span', 'kicker', t('atlas.when')), clock(is), el('p', 'note', t('atlas.clock.note')));
      if (is['orca_ge_0.5']) box.append(el('p', 'note check', t('atlas.orca', { n: is['orca_ge_0.5'] })));
    }
    /* month x hour heatmap for one island (hours: UTC of the sampled hour) */
    function clock(is) {
      const pts = a.points.filter((p) => p[2] === is.id), grid = Array.from({ length: 12 }, () => new Array(24).fill(0)), tot = Array.from({ length: 12 }, () => new Array(24).fill(0));
      a.points.forEach((p) => { tot[p[3] - 1][p[4]]++; }); pts.forEach((p) => { grid[p[3] - 1][p[4]]++; });
      const W = 24 * 12, H = 12 * 12, s = svgEl('svg', { viewBox: `0 0 ${W + 30} ${H + 18}`, class: 'atlas-clock', role: 'img', 'aria-label': t('atlas.when') });
      const mon = t('whales.monthsabbr').split('|');
      for (let m = 0; m < 12; m++) {
        const lt = svgEl('text', { x: 24, y: m * 12 + 9, 'text-anchor': 'end' }); lt.textContent = mon[m]; s.append(lt);
        for (let h = 0; h < 24; h++) { const share = tot[m][h] ? grid[m][h] / tot[m][h] : null; s.append(svgEl('rect', { x: 30 + h * 12, y: m * 12, width: 11, height: 11, rx: 2, fill: share == null ? 'rgba(23,70,90,.25)' : PAL[is.id % PAL.length], 'fill-opacity': share == null ? 1 : Math.max(.08, share) })); }
      }
      [0, 6, 12, 18].forEach((h) => { const tx = svgEl('text', { x: 30 + h * 12, y: H + 14 }); tx.textContent = `${h}h`; s.append(tx); });
      return s;
    }
    // pan / zoom / tap
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); last = { x: e.clientX, y: e.clientY, moved: false }; });
    cv.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) { const [p1, p2] = [...ptrs.values()]; const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); if (last.d) view.k = Math.min(30, Math.max(1, view.k * d / last.d)); last.d = d; }
      else { view.x += e.clientX - prev[0]; view.y += e.clientY - prev[1]; }
      if (Math.abs(e.clientX - last.x) + Math.abs(e.clientY - last.y) > 6) last.moved = true; draw();
    });
    cv.addEventListener('pointerup', (e) => { ptrs.delete(e.pointerId); if (last && !last.moved && ptrs.size === 0) pick(e); if (ptrs.size < 2 && last) last.d = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const f = Math.exp(-e.deltaY / 400); view.k = Math.min(30, Math.max(1, view.k * f)); draw(); }, { passive: false });
    $('atlas-reset').addEventListener('click', () => { view = { x: 0, y: 0, k: 1 }; select(null); });
    addEventListener('resize', draw);
    const biggest = a.islands.slice().sort((p, q) => q.n - p.n)[0]; draw(); select(biggest ? biggest.id : null);
  }

  /* Unusual windows from the atlas go into the review queue with their own sound. */
  function outliers(list) {
    const box = $('cands'); if (!box || !list.length || !list[0].audio) return;
    const audio = new Audio();
    list.forEach((c) => {
      const d = el('div', 'cand'); const b = el('button', 'ghost'); b.type = 'button'; b.textContent = '▶ ' + t('queue.play');
      b.addEventListener('click', () => { audio.src = c.audio; audio.play().catch(() => {}); });
      d.append(el('span', 'st', t('queue.status.open')), el('b', '', t('queue.unusual', { l: LETTER(c.island) })), el('div', 'note', t('queue.unusual.why', { day: c.day, h: String(c.hour).padStart(2, '0'), z: num(c.z, 1) })), b);
      box.append(d);
    });
  }


  /* ---------------- Ocean time-lapse: the archive, day by day, coloured by the dominant sound island ---------------- */
  function timelapse(a) {
    const cv = $('tl'), btn = $('tl-play'), lbl = $('tl-date'), bars = $('tl-bars');
    if (!a.timeline || !a.timeline.length) { $('tl-note').textContent = t('atlas.empty'); return; }
    const rows = a.timeline.map(([k, v]) => ({ d: new Date(k.slice(0, 10) + 'T00:00:00Z'), v })).sort((p, q) => p.d - q.d);
    const y0 = 2015, y1 = new Date().getUTCFullYear(), nY = y1 - y0 + 1;
    let i = 0, raf = 0, playing = false; const tot = new Array(a.islands.length).fill(0);
    const size = () => { const dpr = devicePixelRatio || 1; cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; };
    function base() {
      size(); const g = cv.getContext('2d'), W = cv.width, H = cv.height, rh = H / nY;
      g.fillStyle = '#020b10'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(127,162,174,.55)'; g.font = `${11 * (devicePixelRatio || 1)}px "IBM Plex Mono", monospace`;
      for (let y = 0; y < nY; y++) { g.fillText(String(y0 + y), 4, y * rh + rh * .7); g.fillStyle = 'rgba(23,70,90,.35)'; g.fillRect(48 * (devicePixelRatio || 1), y * rh + 2, W - 52 * (devicePixelRatio || 1), rh - 4); g.fillStyle = 'rgba(127,162,174,.55)'; }
    }
    function plot(r) {
      const g = cv.getContext('2d'), W = cv.width, H = cv.height, rh = H / nY, x0 = 48 * (devicePixelRatio || 1), cw = (W - x0 - 4 * (devicePixelRatio || 1)) / 366;
      const y = r.d.getUTCFullYear() - y0, doy = Math.floor((r.d - Date.UTC(r.d.getUTCFullYear(), 0, 1)) / 864e5);
      const top = r.v.indexOf(Math.max(...r.v)); g.fillStyle = PAL[top % PAL.length];
      g.fillRect(x0 + doy * cw, y * rh + 2, Math.max(1.5, cw), rh - 4);
      r.v.forEach((n, k) => { tot[k] += n; });
    }
    function drawBars() {
      bars.replaceChildren(); const sum = tot.reduce((p, q) => p + q, 0) || 1;
      tot.forEach((n, k) => { const s2 = el('span'); s2.style.flex = String(n / sum); s2.style.background = PAL[k % PAL.length]; s2.title = `${t('atlas.island', { l: LETTER(k) })}: ${num(n)}`; bars.append(s2); });
    }
    function step() {
      const per = Math.max(1, Math.ceil(rows.length / 600));
      for (let j = 0; j < per && i < rows.length; j++, i++) plot(rows[i]);
      if (i > 0) lbl.textContent = rows[i - 1].d.toLocaleDateString(I18N.locale, { year: 'numeric', month: 'long' });
      drawBars();
      if (i < rows.length && playing) raf = requestAnimationFrame(step); else { playing = false; btn.textContent = t('tl.again'); }
    }
    function start() { cancelAnimationFrame(raf); base(); tot.fill(0); i = 0; playing = true; btn.textContent = t('tl.playing'); step(); }
    btn.addEventListener('click', start);
    base(); if (reduce) { rows.forEach(plot); drawBars(); lbl.textContent = ''; } else { lbl.textContent = t('tl.ready', { n: num(rows.length) }); }
    addEventListener('resize', () => { if (!playing) { base(); for (let j = 0; j < i; j++) plot(rows[j]); } });
    $('tl-note').textContent = t('tl.note', { n: num(rows.length), skip: num((a.skipped_days || []).length) });
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 3D galaxy ---------------- */
  function galaxy(a) {
    const host = $('galaxy'); const audio = new Audio();
    if (!window.makeGalaxy || !a.points3 || !a.points3.length) { host.replaceChildren(el('div', 'scene-msg', t('atlas.empty'))); return; }
    window.makeGalaxy(host, a, PAL, (p) => {
      const is = a.islands[p[3]]; $('galaxy-info').textContent = t('galaxy.picked', { l: LETTER(p[3]), n: num(is.n) });
      if (is.examples[0]) { audio.src = is.examples[0].file; audio.play().catch(() => {}); }
    });
  }

  function learning(L) {
    const box = $('learn'); box.replaceChildren();
    if (!L || !L.points || !L.points.length) { box.append(el('p', 'note', t('learn.empty'))); return; }
    const W = 600, H = 220, m = { l: 36, r: 10, t: 10, b: 26 };
    const s = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': t('learn.title'), class: 'learn-chart' });
    const xs = L.points.map((p) => p.n), xmax = Math.max(...xs);
    const x = (n) => m.l + (W - m.l - m.r) * n / xmax, y = (v) => m.t + (H - m.t - m.b) * (1 - (v - .5) / .5);
    [.5, .8, 1].forEach((v) => { s.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v === .8 ? 'var(--amber)' : 'rgba(127,162,174,.2)', 'stroke-dasharray': v === .8 ? '5 5' : '' })); const tx = svgEl('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }); tx.textContent = num(v, 1); s.append(tx); });
    s.append(svgEl('polyline', { points: L.points.map((p) => `${x(p.n)},${y(p.ba)}`).join(' '), fill: 'none', stroke: 'var(--glow)', 'stroke-width': 2.5 }));
    L.points.forEach((p) => s.append(svgEl('circle', { cx: x(p.n), cy: y(p.ba), r: 4, fill: 'var(--glow)' })));
    box.append(s, el('p', 'note', t('learn.note', { n: L.labels, sp: t(`sp.${L.species}.name`), ba: num(L.points[L.points.length - 1].ba, 2) })));
  }

  I18N.ready.then(() => {
    getJSON('data/atlas.json').then((a) => {
      if (!a.points || !a.points.length) throw new Error('building');
      atlas(a); galaxy(a); timelapse(a);
    }).catch(() => getJSON('data/status.json').then((st) => st.sample).catch(() => null).then((prog) => {
      building('atlas', prog); $('atlas-side').closest('.atlas-wrap').classList.add('empty'); $('atlas-side').remove(); $('atlas-months').parentElement.remove(); $('atlas-sum').remove();
      building('tl', prog); $('tl-play').parentElement.remove(); $('tl-bars').remove(); $('tl-note').remove();
      building('galaxy', prog);
    })).catch(() => { $('atlas-sum').textContent = t('atlas.empty'); $('atlas-side').replaceChildren(el('p', 'note', t('atlas.empty'))); $('tl-note').textContent = t('atlas.empty'); $('galaxy').replaceChildren(el('div', 'scene-msg', t('atlas.empty'))); });
    document.addEventListener('queue-ready', () => getJSON('data/candidates.json').then(outliers).catch(() => {}), { once: true });
    getJSON('data/learning.json').then(learning).catch(() => learning(null));
  });
})();
