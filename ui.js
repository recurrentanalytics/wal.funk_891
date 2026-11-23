/* Fullscreen for every visualisation, and the page-wide current field as a quiet background. */
(function () {
  /* ---------- fullscreen ---------- */
  const TARGETS = ['#stage', '#map', '#bathy3d', '#world', '#spec-wrap', '#land3d', '.mc-stage', '.smap', '.atlas-main', '#galaxy', '.tl', '#routes-map'];
  const ICON = { open: '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', close: '<path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' };
  let active = null;
  const poke = () => { dispatchEvent(new Event('resize')); setTimeout(() => dispatchEvent(new Event('resize')), 120); setTimeout(() => dispatchEvent(new Event('resize')), 400); };
  function leave() {
    if (!active) return; const { el, btn, sec } = active; active = null;
    el.classList.remove('fs'); sec && sec.classList.remove('fs-part'); document.body.classList.remove('fs-on');
    btn.innerHTML = `<svg viewBox="0 0 16 16">${ICON.open}</svg>`; btn.setAttribute('aria-label', t('ui.fullscreen'));
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    poke(); el.scrollIntoView({ block: 'center' });
  }
  function enter(el, btn) {
    leave(); const sec = el.closest('section'); active = { el, btn, sec };
    el.classList.add('fs'); sec && sec.classList.add('fs-part'); document.body.classList.add('fs-on');
    btn.innerHTML = `<svg viewBox="0 0 16 16">${ICON.close}</svg>`; btn.setAttribute('aria-label', t('ui.close'));
    const d = document.documentElement; if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
    poke();
  }
  function wire() {
    TARGETS.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
      if (el.querySelector(':scope > .fs-btn')) return;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'fs-btn'; btn.innerHTML = `<svg viewBox="0 0 16 16">${ICON.open}</svg>`; btn.setAttribute('aria-label', t('ui.fullscreen')); btn.title = t('ui.fullscreen');
      btn.addEventListener('click', (e) => { e.stopPropagation(); active && active.el === el ? leave() : enter(el, btn); });
      el.append(btn);
    }));
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape') leave(); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && active) leave(); });

  /* ---------- currents as page background ---------- */
  function flow(c) {
    const cv = document.createElement('canvas'); cv.id = 'bgflow'; cv.setAttribute('aria-hidden', 'true'); document.body.prepend(cv);
    const dec = (b64) => { const r = atob(b64), o = new Int8Array(r.length); for (let i = 0; i < r.length; i++) o[i] = (r.charCodeAt(i) << 24) >> 24; return o; };
    const U = dec(c.u), V = dec(c.v), nlat = c.nlat, nlon = c.nlon, g = cv.getContext('2d');
    // the Pacific, centred on 150 W: 110 E .. 50 W, 62 S .. 66 N
    const LON0 = 110, LONS = 200, LAT1 = 66, LATS = 128;
    const at = (lat, lon) => { const i = Math.round((lat - c.lat0) / c.step), j = ((Math.round((lon - c.lon0) / c.step) % nlon) + nlon) % nlon; if (i < 0 || i >= nlat) return null; const k = i * nlon + j; return U[k] === -128 ? null : [U[k] * c.scale, V[k] * c.scale]; };
    let W = 0, H = 0; const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; }; size(); addEventListener('resize', size);
    const N = innerWidth < 700 ? 500 : 1300, P = [];
    const spawn = (p) => { for (let n = 0; n < 20; n++) { p.lat = LAT1 - Math.random() * LATS; p.lon = LON0 + Math.random() * LONS; if (at(p.lat, p.lon)) break; } p.age = Math.random() * 200 | 0; };
    for (let i = 0; i < N; i++) { const p = {}; spawn(p); P.push(p); }
    const X = (lon) => (lon - LON0) / LONS * W, Y = (lat) => (LAT1 - lat) / LATS * H;
    const step = () => {
      g.globalCompositeOperation = 'destination-in'; g.fillStyle = 'rgba(0,0,0,.965)'; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter'; g.lineWidth = 1; g.beginPath();
      for (const p of P) {
        const uv = at(p.lat, p.lon); if (!uv || p.age++ > 260 || p.lon > LON0 + LONS || p.lon < LON0 || p.lat > LAT1 || p.lat < LAT1 - LATS) { spawn(p); p.age = 0; continue; }
        const x0 = X(p.lon), y0 = Y(p.lat); p.lat += uv[1] * .35; p.lon += uv[0] * .35 / Math.max(.3, Math.cos(p.lat * Math.PI / 180));
        g.moveTo(x0, y0); g.lineTo(X(p.lon), Y(p.lat));
      }
      g.strokeStyle = 'rgba(94,230,215,.5)'; g.stroke();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { for (let i = 0; i < 90; i++) step(); return; }
    let last = 0; const loop = (ts) => { if (!document.hidden && !document.body.classList.contains('fs-on') && ts - last > 45) { last = ts; step(); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  I18N.ready.then(() => {
    wire(); setTimeout(wire, 3000); setTimeout(wire, 8000);       // views that are built after their data arrives
    fetch('data/currents.json').then((r) => r.json()).then(flow).catch(() => {});
  });
})();
