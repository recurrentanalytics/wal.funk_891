/* Distribution and migration map: where whales were reported, month by month (GBIF occurrences, 2D, animated).
   Needs d3, topojson, i18n.js. Data: data/dist.json (built from GBIF ad-hoc maps), data/species.json. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const STATIONS = [{ name: 'MARS (MBARI)', lat: 36.713, lon: -122.186 }, { name: 'Orcasound', lat: 48.56, lon: -123.17 }];
  const MONTHS = () => t('routes.months').split('|');

  function build(D, S) {
    const host = $('routes-map'); if (!host) return;
    const lang = I18N.lang, byS = Object.fromEntries(S.species.map((x) => [x.sci, x]));
    const nm = (sci) => { const x = byS[sci]; return x ? (x.name[lang] || x.name.en) : sci; };
    const monthly = Object.keys(D).filter((k) => D[k].months).sort((a, b) => nm(a).localeCompare(nm(b), lang));
    const others = Object.keys(D).filter((k) => !D[k].months && D[k].all && D[k].all.length).sort((a, b) => nm(a).localeCompare(nm(b), lang));
    // controls
    const bar = $('routes-ctl'); bar.replaceChildren();
    const sel = el('select'); sel.setAttribute('aria-label', t('routes.species'));
    const g1 = el('optgroup'); g1.label = t('routes.group.monthly'); monthly.forEach((k) => { const o = el('option', '', nm(k)); o.value = k; g1.append(o); });
    const g2 = el('optgroup'); g2.label = t('routes.group.all'); others.forEach((k) => { const o = el('option', '', nm(k)); o.value = k; g2.append(o); });
    sel.append(g1, g2);
    const play = el('button', 'rt-play', '❚❚'); play.type = 'button'; play.setAttribute('aria-label', t('routes.pause'));
    const slider = el('input'); slider.type = 'range'; slider.min = 0; slider.max = 11; slider.step = 1; slider.value = new Date().getMonth(); slider.setAttribute('aria-label', t('routes.month'));
    const mlab = el('b', 'rt-month');
    const speed = el('select'); [['1800', t('routes.slow')], ['1000', t('routes.normal')], ['500', t('routes.fast')]].forEach(([v, l]) => { const o = el('option', '', l); o.value = v; speed.append(o); }); speed.value = '1000'; speed.setAttribute('aria-label', t('routes.speed'));
    const trail = el('label', 'rt-chk'); const tc = el('input'); tc.type = 'checkbox'; tc.checked = true; trail.append(tc, ' ' + t('routes.trail'));
    const cmp = el('select'); cmp.setAttribute('aria-label', t('routes.compare')); const o0 = el('option', '', t('routes.compare.none')); o0.value = ''; cmp.append(o0);
    monthly.forEach((k) => { const o = el('option', '', nm(k)); o.value = k; cmp.append(o); });
    bar.append(sel, play, slider, mlab, speed, trail, el('span', 'rt-vs', t('routes.vs')), cmp);
    const note = $('routes-note');
    // canvas map
    const cv = el('canvas'); host.replaceChildren(cv);
    const tip = el('div', 'rt-tip'); tip.hidden = true; host.append(tip);
    const g = cv.getContext('2d'); let W = 0, H = 0, proj, path, land = null;
    const resize = () => {
      const r = host.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = Math.max(260, Math.min(r.height || W * .52, W * .62));
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      proj = d3.geoEqualEarth().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' }).rotate([150 - view.lon, 0]); proj.scale(proj.scale() * view.k);
      path = d3.geoPath(proj, g); draw();
    };
    const view = { lon: 0, k: 1 };
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then((r) => r.json()).then((topo) => { land = topojson.feature(topo, topo.objects.land); draw(); });
    let sp = monthly[0] || others[0], sp2 = '', m = +slider.value, f = 0, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, last = 0;
    const cellsFor = (k, mo) => { const d = D[k]; if (!d) return []; return d.months ? d.months[mo] || [] : d.all || []; };
    const maxFor = (k) => { const d = D[k]; if (!d) return 1; const arr = d.months ? d.months.flat() : d.all; return Math.max(1, ...arr.map((c) => c[2])); };
    let mx1 = maxFor(sp), mx2 = 1;
    const dot = (c, a, col, mx) => {
      const p = proj([c[1], c[0]]); if (!p) return; const v = Math.log1p(c[2]) / Math.log1p(mx);
      g.globalAlpha = a * (0.25 + 0.75 * v); g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], (1.2 + 4.5 * v) * view.k ** .5, 0, 6.283); g.fill();
    };
    function draw() {
      if (!proj) return; g.clearRect(0, 0, W, H); g.globalAlpha = 1;
      g.beginPath(); path({ type: 'Sphere' }); g.fillStyle = '#04202c'; g.fill();
      g.beginPath(); path(d3.geoGraticule10()); g.strokeStyle = 'rgba(127,162,174,.12)'; g.lineWidth = .6; g.stroke();
      if (land) { g.beginPath(); path(land); g.fillStyle = '#1d3a3c'; g.fill(); g.strokeStyle = 'rgba(143,216,200,.35)'; g.stroke(); }
      g.globalCompositeOperation = 'lighter';
      const monthlyOn = !!D[sp] && !!D[sp].months, nx = (m + 1) % 12;
      if (monthlyOn && tc.checked) cellsFor(sp, (m + 11) % 12).forEach((c) => dot(c, .18 * (1 - f), '#5ee6d7', mx1));
      cellsFor(sp, m).forEach((c) => dot(c, monthlyOn ? 1 - f : 1, '#5ee6d7', mx1));
      if (monthlyOn) cellsFor(sp, nx).forEach((c) => dot(c, f, '#5ee6d7', mx1));
      if (sp2) { cellsFor(sp2, m).forEach((c) => dot(c, 1 - f, '#ffb547', mx2)); cellsFor(sp2, nx).forEach((c) => dot(c, f, '#ffb547', mx2)); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      STATIONS.forEach((s) => { const p = proj([s.lon, s.lat]); if (!p) return; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(p[0], p[1], 5, 0, 6.283); g.stroke(); g.fillStyle = '#fff'; g.font = '11px ui-monospace, monospace'; g.fillText(s.name, p[0] + 8, p[1] + 4); });
      mlab.textContent = monthlyOn ? MONTHS()[m] : t('routes.allyear');
    }
    function label() {
      const x = byS[sp], d = D[sp] || {}, n = (d.months ? d.months.flat() : d.all || []).reduce((a, c) => a + c[2], 0);
      note.textContent = (d.months ? t('routes.note.monthly', { name: nm(sp), n: num(n) }) : t('routes.note.all', { name: nm(sp), n: num(n) })) + (sp2 ? ' ' + t('routes.note.cmp', { name: nm(sp2) }) : '');
      slider.disabled = play.disabled = !d.months;
    }
    const setSp = (k) => { if (!D[k]) return; sp = k; sel.value = k; mx1 = maxFor(k); label(); draw(); };
    sel.addEventListener('change', () => setSp(sel.value));
    cmp.addEventListener('change', () => { sp2 = cmp.value; mx2 = maxFor(sp2); label(); draw(); });
    slider.addEventListener('input', () => { m = +slider.value; f = 0; draw(); });
    tc.addEventListener('change', draw);
    play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? '❚❚' : '▶'; play.setAttribute('aria-label', t(playing ? 'routes.pause' : 'routes.play')); });
    document.addEventListener('routes-species', (e) => { if (D[e.detail]) setSp(e.detail); });
    // drag to turn the map east-west, wheel / buttons to zoom
    let drag = null;
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, lon: view.lon }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => {
      if (drag) { view.lon = drag.lon + (e.clientX - drag.x) * 0.4 / view.k; resize(); return; }
      const r = cv.getBoundingClientRect(), ll = proj.invert([e.clientX - r.left, e.clientY - r.top]); if (!ll) { tip.hidden = true; return; }
      let best = null, bd = 9; cellsFor(sp, m).forEach((c) => { const p = proj([c[1], c[0]]); const dd = Math.hypot(p[0] - (e.clientX - r.left), p[1] - (e.clientY - r.top)); if (dd < bd * 1.4) { bd = dd; best = c; } });
      if (best) { tip.hidden = false; tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; tip.textContent = t('routes.tip', { n: num(best[2]), lat: num(best[0], 1), lon: num(best[1], 1) }); } else tip.hidden = true;
    });
    cv.addEventListener('pointerup', () => { drag = null; }); cv.addEventListener('pointerleave', () => { tip.hidden = true; });
    cv.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); view.k = Math.max(1, Math.min(6, view.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); resize(); }, { passive: false });
    const zoom = el('div', 'rt-zoom'); [['+', 1.3], ['−', 1 / 1.3], ['⟲', 0]].forEach(([s, k]) => { const b = el('button', '', s); b.type = 'button'; b.addEventListener('click', () => { if (k) view.k = Math.max(1, Math.min(6, view.k * k)); else { view.k = 1; view.lon = 0; } resize(); }); zoom.append(b); }); host.append(zoom);
    addEventListener('resize', resize); new ResizeObserver(resize).observe(host);
    const tick = (ts) => {
      if (playing && D[sp] && D[sp].months && !document.hidden) {
        const dur = +speed.value; f = Math.min(1, f + (last ? (ts - last) / dur : 0));
        if (f >= 1) { f = 0; m = (m + 1) % 12; slider.value = m; }
        draw();
      }
      last = ts; requestAnimationFrame(tick);
    };
    label(); resize(); requestAnimationFrame(tick);
  }
  I18N.ready.then(() => Promise.all([fetch('data/dist.json').then((r) => r.json()), fetch('data/species.json').then((r) => r.json())]).then(([D, S]) => build(D, S))
    .catch(() => { const h = $('routes-map'); if (h) h.replaceChildren(el('div', 'scene-msg', t('ui.loadfail'))); }));
})();
