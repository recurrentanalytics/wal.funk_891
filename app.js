/* wal.funk_891 page logic. Every visible string goes through t(). Needs i18n.js, d3, topojson. */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const getJSON = (u) => fetch(u, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
const num = (n, d) => I18N.num(n, d);
const SP = { 'Blue whale': 'blue', 'Fin whale': 'fin', 'North Pacific right whale': 'npright', 'Humpback whale': 'humpback', "Bryde's whale": 'brydes', 'North Atlantic right whale': 'naright', 'Minke whale': 'minke', 'Killer whale (orca)': 'orca', 'Person': 'person' };
const SPTEXT = { blue: 'blue', fin: 'fin', humpback: 'humpback', brydes: 'brydes', minke: 'minke', orca: 'orca', npright: 'right', naright: 'right' };
const CODE2SP = { Mn: 'humpback', Bm: 'blue', Bp: 'fin', Ba: 'minke', Be: 'brydes', Oo: 'orca' };

/* Spectrogram colour: abyss -> teal -> pale gold */
function colour(v) {
  const stops = [[2, 11, 16], [8, 52, 70], [32, 140, 150], [120, 220, 200], [255, 236, 170]];
  const x = Math.min(.999, Math.max(0, v)) * (stops.length - 1), i = Math.floor(x), f = x - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
}
function paintGrid(canvas, grid) {
  const H = grid.length, W = grid[0].length; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(W, H);
  for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
    const [r, g, b] = colour(parseInt(grid[i][j], 16) / 15), k = ((H - 1 - i) * W + j) * 4;
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
const playIcon = (on) => on ? '<path d="M2 1h3.5v12H2zM8.5 1H12v12H8.5z" fill="currentColor"/>' : '<path d="M2 1 L13 7 L2 13 Z" fill="currentColor"/>';

/* ---------- Hero background: the real recording drifting by ---------- */
function hero(grid) {
  const cv = $('hero-spec'), src = document.createElement('canvas'); paintGrid(src, grid);
  const ctx = cv.getContext('2d');
  const size = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
  size(); addEventListener('resize', size);
  let x = 0;
  const frame = () => {
    const w = cv.width, h = cv.height, tile = src.width * (h / src.height);
    ctx.imageSmoothingEnabled = false;
    for (let o = -x % tile - tile; o < w; o += tile) ctx.drawImage(src, o, 0, tile, h);
    if (!reduce) { x += 0.35; requestAnimationFrame(frame); }
  };
  frame();
}

/* ---------- Whale silhouettes (side profile, horizontal flukes) ---------- */
function whalePath(L, H, fin, kind, flipper) {
  const f = (x, y) => `${(x * L).toFixed(1)} ${(y * H).toFixed(1)}`;
  const orca = kind === 'orca', right = kind === 'right';
  const dX = orca ? .45 : .68;
  const top = right ? [[.02, .2], [.18, -.02], [.4, .0]] : [[.03, .38], [.14, .06], [.3, .0]];
  const p = [`M ${f(0, .55)}`, `C ${f(top[0][0], top[0][1])} ${f(top[1][0], top[1][1])} ${f(top[2][0], top[2][1])}`, `L ${f(dX - .06, .03)}`];
  if (right) p.push(`L ${f(dX + .02, .06)}`);
  else if (orca) p.push(`L ${f(dX - .01, -fin / H)} L ${f(dX + .05, .05)}`);
  else p.push(`Q ${f(dX + .01, -fin / H)} ${f(dX + .04, .07)}`);
  p.push(`C ${f(.8, .18)} ${f(.88, .36)} ${f(.9, .42)}`, `L ${f(1, .36)} L ${f(.985, .47)} L ${f(1, .58)} L ${f(.9, .53)}`,
    `C ${f(.82, .66)} ${f(.62, .98)} ${f(.42, 1)}`, `C ${f(.24, 1)} ${f(.08, .92)} ${f(0, .62)} Z`);
  if (flipper) { const fx = orca ? .2 : .26, len = flipper; p.push(`M ${f(fx, .8)} Q ${f(fx + len * .45, 1.0)} ${f(fx + len, 1.2)} Q ${f(fx + len * .55, 1.02)} ${f(fx + .07, .8)} Z`); }
  return p.join(' ');
}
function whaleSVG(name, m, max, VB = 1000, VH = 200) {
  const s = svgEl('svg', { viewBox: `0 0 ${VB} ${VH}`, preserveAspectRatio: 'xMinYMax meet', 'aria-hidden': 'true' });
  const L = VB * m / max;
  if (name === 'Person') {
    const u = L / 8;
    s.append(svgEl('path', { d: `M${u * 1.6} ${VH - L} a${u * .55} ${u * .55} 0 1 1 0.01 0 Z M${u * 1.05} ${VH - L + u * 1.2} h${u * 1.1} l${u * .3} ${u * 3} h${-u * .45} v${u * 3.8} h${-u * .45} v${-u * 2.4} h${-u * .1} v${u * 2.4} h${-u * .45} v${-u * 3.8} h${-u * .45} Z` }));
  } else {
    const kind = /orca/i.test(name) ? 'orca' : /right/i.test(name) ? 'right' : 'baleen', hump = /humpback/i.test(name);
    const H = L * (kind === 'right' ? .22 : kind === 'orca' ? .2 : hump ? .17 : .12);
    const p = svgEl('path', { d: whalePath(L, H, kind === 'orca' ? H * .85 : hump ? H * .1 : H * .14, kind, hump ? .3 : kind === 'orca' ? .09 : .1) });
    p.setAttribute('transform', `translate(0 ${(VH - H * 1.2).toFixed(1)})`); s.append(p);
  }
  return s;
}

/* ---------- Whales explorer ---------- */
function whales(w) {
  const max = w.sizes.items[0][1];
  const facts = Object.fromEntries(w.species.map((s) => [s.name, s]));
  const factOf = (name) => /right whale/i.test(name) ? facts['Right whales'] : facts[name] || Object.values(facts).find((s) => s.name.startsWith(name.split(' (')[0]));
  const photos = w.photos || {};
  Object.values(photos).forEach((p) => { const i = new Image(); i.src = p.file; });
  const line = $('lineup'); line.replaceChildren();
  const buttons = [];
  w.sizes.items.forEach(([name, m]) => {
    const key = SP[name], isPerson = name === 'Person';
    const btn = el('button', 'whale-btn' + (isPerson ? ' person' : '')); btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.append(el('span', 'nm', t(`sp.${key}.name`)), el('span', 'len', `${num(m, 1)} m`), whaleSVG(name, m, max));
    if (isPerson) btn.disabled = true; else btn.addEventListener('click', () => select(name));
    buttons.push([name, btn]); line.append(btn);
  });
  const lo = Math.log10(10), hi = Math.log10(30000), pos = (hz) => 100 * (Math.log10(hz) - lo) / (hi - lo);
  const kHz = (v) => v >= 1000 ? `${num(v / 1000, v % 1000 ? 1 : 0)}k` : num(v);
  function select(name) {
    buttons.forEach(([n, b]) => b.setAttribute('aria-pressed', String(n === name)));
    const key = SP[name], tk = SPTEXT[key], sp = factOf(name) || {}, len = w.sizes.items.find((x) => x[0] === name)[1];
    const d = $('detail'); d.replaceChildren();
    const ph = photos[name];
    if (ph) {
      const fig = el('figure', 'photo'); const img = el('img'); img.src = ph.file; img.alt = ph.alt; img.loading = 'lazy';
      const cap = el('figcaption'); cap.append(`${t('whales.photo')} ${ph.credit} · `);
      if (ph.licence[1]) { const a = el('a', '', ph.licence[0]); a.href = ph.licence[1]; a.rel = 'noopener'; cap.append(a); } else cap.append(ph.licence[0]);
      cap.append(' · '); const s = el('a', '', t('whales.source')); s.href = ph.source; s.rel = 'noopener'; cap.append(s);
      fig.append(img, cap); d.append(fig);
    }
    const latin = /Atlantic/.test(name) ? 'Eubalaena glacialis' : /Pacific right/.test(name) ? 'Eubalaena japonica' : (sp.latin || '');
    d.append(el('h3', 'big', t(`sp.${key}.name`)), el('div', 'lat', latin));
    const fx = el('div', 'facts');
    const fact = (v, k) => { const f = el('div', 'fact'); f.append(el('b', '', v), el('span', '', k)); return f; };
    fx.append(fact(`${num(len, 1)} m`, t('whales.maxlen')), fact(sp.bands ? `${kHz(sp.bands[0])}–${kHz(sp.bands[1])} Hz` : '—', t('whales.range')), fact(sp.months ? t('whales.months', { n: sp.months.length }) : '—', t('whales.season')));
    d.append(fx, el('span', 'kicker', t('whales.pitch')));
    const pitch = el('div', 'pitch');
    const ear = el('div', 'ear'); ear.style.left = pos(20) + '%'; ear.style.width = (pos(20000) - pos(20)) + '%'; pitch.append(ear);
    const unsure = sp.bands_note && sp.bands_note.includes('not verified');
    if (sp.bands) { const b = el('div', 'band' + (unsure ? ' unsure' : '')); b.style.left = pos(sp.bands[0]) + '%'; b.style.width = Math.max(1, pos(sp.bands[1]) - pos(sp.bands[0])) + '%'; pitch.append(b); }
    [[10, '10'], [100, '100'], [1000, '1k'], [10000, '10k Hz']].forEach(([hz, tx]) => { const tk2 = el('span', 'tick', tx); tk2.style.left = pos(hz) + '%'; pitch.append(tk2); });
    d.append(pitch, el('p', 'note', t('whales.pitch.note') + (unsure ? ' ' + t('whales.unsure') : '')));
    d.append(el('p', '', t(`sp.${tk}.sound`)));
    if (sp.months) {
      d.append(el('span', 'kicker', t('whales.monthslabel')));
      const mo = el('div', 'months'); t('whales.monthsabbr').split('|').forEach((c, i) => mo.append(el('i', sp.months.includes(i + 1) ? 'on' : '', c))); d.append(mo);
    }
    d.append(el('p', '', t(`sp.${tk}.monterey`)), el('span', 'status-pill', t(`sp.${tk}.status`)));
    if (sp.sources) {
      const src = el('p', 'src', t('whales.sources') + ' ');
      sp.sources.forEach(([tx, u], i) => { const a = el('a', '', tx); a.href = u; a.rel = 'noopener'; src.append(a); if (i < sp.sources.length - 1) src.append(' · '); });
      d.append(src);
    }
  }
  select('Blue whale');
  const k = $('known'); k.replaceChildren();
  [0, 1, 2].forEach((i) => k.append(el('div', '', t(`known.${i}`))));
}

/* ---------- Local map (North-east Pacific) ---------- */
function localMap(hs) {
  const box = $('map'); box.replaceChildren();
  const W = 1000, H = 760, svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` }); box.append(svg);
  const proj = d3.geoConicConformal().parallels([34, 49]).rotate([125, 0]);
  proj.fitExtent([[10, 10], [W - 10, H - 10]], { type: 'MultiPoint', coordinates: [[-133, 33.3], [-116.5, 51.3]] });
  const path = d3.geoPath(proj);
  svg.append(svgEl('path', { class: 'grat', d: path(d3.geoGraticule().step([2, 2])()) }));
  const names = { 'MBARI MARS hydrophone': ['places.mbari.name', 'places.mbari.role'], 'Orcasound Lab': ['places.orcalab.name', 'places.orcalab.role'] };
  const places = $('place-list'); places.replaceChildren();
  hs.filter((h) => h.main).forEach((h) => {
    const [nk, rk] = names[h.name] || [null, null];
    const p = el('div', 'panel');
    p.append(el('b', '', nk ? t(nk) : h.name), el('div', 'meta', `${h.archive} · ${num(h.lat, 3)}°, ${num(h.lng, 3)}° · ${t('places.depth', { d: h.depth.replace('about ', '~') })}`), el('div', '', rk ? t(rk) : h.role));
    const a = el('a', 'src', ' ' + h.source[0]); a.href = h.source[1]; a.rel = 'noopener'; p.append(a); places.append(p);
  });
  const draw = () => {
    hs.forEach((h) => {
      const [x, y] = proj([h.lng, h.lat]);
      if (h.main) {
        svg.append(svgEl('circle', { class: 'hp-ring', cx: x, cy: y, r: 10 }), svgEl('circle', { class: 'hp-ring d2', cx: x, cy: y, r: 10 }), svgEl('circle', { class: 'hp-core', cx: x, cy: y, r: 6 }));
        const [nk] = names[h.name] || [null];
        const tx = svgEl('text', { class: 'map-label', x: x + 16, y: y - 4 }); tx.textContent = nk ? t(nk) : h.name; svg.append(tx);
        const s = svgEl('text', { class: 'map-sub', x: x + 16, y: y + 12 }); s.textContent = t('places.depth', { d: h.depth.replace('about ', '~') }); svg.append(s);
      } else svg.append(svgEl('circle', { class: 'hp-minor', cx: x, cy: y, r: 3 }));
    });
    const [ox, oy] = proj([-128.5, 41.5]); const o = svgEl('text', { class: 'map-sub', x: ox, y: oy, 'text-anchor': 'middle' }); o.textContent = t('places.ocean'); svg.append(o);
  };
  const areaG = svgEl('g', { class: 'areas' });
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json').then((r) => r.json()).then((topo) => {
    svg.insertBefore(svgEl('path', { class: 'land', d: path(topojson.feature(topo, topo.objects.land)) }), svg.firstChild.nextSibling);
    svg.insertBefore(areaG, svg.firstChild.nextSibling.nextSibling); draw(); areas(areaG, path);
  }).catch(() => { svg.append(areaG); draw(); areas(areaG, path); });
}

/* GeoJSON from ArcGIS winds rings counter-clockwise (RFC 7946); d3-geo needs clockwise, else it fills the rest of the globe. */
function rewind(f) {
  const g = f.geometry; if (!g) return;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  polys.forEach((poly) => {
    if (d3.geoArea({ type: 'Polygon', coordinates: [poly[0]] }) > 2 * Math.PI) poly.forEach((ring) => ring.reverse());
  });
}
/* Official NOAA whale areas, loaded live from NOAA's own servers (not re-hosted). */
function areas(g, path) {
  const NOAA = 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services';
  const Q = '&outSR=4326&geometryPrecision=4&maxAllowableOffset=0.003&f=geojson';
  const LAYERS = [
    { id: 'blue', key: 'areas.blue', col: '#4c8dff', url: `${NOAA}/BIA_II_WebMerc/FeatureServer/1/query?where=Region_Code%3D%27WC%27%20AND%20Common_Name%3D%27Blue%20whale%27%20AND%20BIA_Status%3D%27PARENT%27&outFields=Months_of_year${Q}` },
    { id: 'fin', key: 'areas.fin', col: '#b48cff', url: `${NOAA}/BIA_II_WebMerc/FeatureServer/1/query?where=Region_Code%3D%27WC%27%20AND%20Common_Name%3D%27Fin%20whale%27%20AND%20BIA_Status%3D%27PARENT%27&outFields=Months_of_year${Q}` },
    { id: 'humpback', key: 'areas.humpback', col: '#5ee6d7', url: `${NOAA}/BIA_II_WebMerc/FeatureServer/1/query?where=Region_Code%3D%27WC%27%20AND%20Common_Name%3D%27Humpback%20whale%27%20AND%20BIA_Status%3D%27PARENT%27&outFields=Months_of_year${Q}` },
    { id: 'srkw', key: 'areas.srkw', col: '#ff6b5b', url: `${NOAA}/WhaleKiller_SouthernResidentDPS_20210802/FeatureServer/65/query?where=1%3D1&outFields=UNIT${Q}` },
    { id: 'hch', key: 'areas.hch', col: '#ffb547', url: `${NOAA}/WhaleHumpback_CentralAmericaDPS_20210421/FeatureServer/68/query?where=1%3D1&outFields=UNIT${Q}` },
  ];
  const bar = $('areas'); bar.replaceChildren();
  LAYERS.forEach((L, i) => {
    const lg = svgEl('g', { class: 'area area-' + L.id }); g.append(lg);
    const b = el('button', 'area-chip'); b.type = 'button'; b.setAttribute('aria-pressed', String(i < 3));
    const dot = el('i'); dot.style.background = L.col; b.append(dot, t(L.key));
    lg.style.display = i < 3 ? '' : 'none';
    b.addEventListener('click', () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); lg.style.display = on ? '' : 'none'; });
    bar.append(b);
    fetch(L.url).then((r) => r.json()).then((fc) => {
      (fc.features || []).forEach((f) => {
        rewind(f);
        const p = svgEl('path', { d: path(f), fill: L.col, 'fill-opacity': L.id === 'srkw' || L.id === 'hch' ? .08 : .2, stroke: L.col, 'stroke-width': 1.2, 'stroke-dasharray': L.id === 'hch' ? '5 4' : '' });
        const tt = svgEl('title'); tt.textContent = t(L.key); p.append(tt); lg.append(p);
      });
    }).catch(() => { b.disabled = true; b.title = t('ui.loadfail'); });
  });
}

/* ---------- World map of open archives ---------- */
function worldMap(wd) {
  const box = $('world'); box.replaceChildren();
  const COL = { used: '#ffb547', open: '#5ee6d7', account: '#7fa2ae' };
  const info = $('world-info');
  const card = el('div', 'gcard'); card.hidden = true;
  const showCard = (c) => {
    card.replaceChildren(); card.hidden = false;
    const x = el('button', 'gcard-x', '×'); x.type = 'button'; x.setAttribute('aria-label', t('ui.close')); x.addEventListener('click', () => { card.hidden = true; });
    card.append(x, el('span', 'kicker', c.kind || ''), el('b', '', c.title));
    if (c.sub) card.append(el('i', '', c.sub));
    const dl = el('dl'); (c.rows || []).filter((r) => r[1] != null && r[1] !== '').forEach(([k, v]) => { dl.append(el('dt', '', k), el('dd', '', String(v))); }); card.append(dl);
    (c.links || []).forEach(([tx, u]) => { const a = el('a', '', tx + ' ↗'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; card.append(a); });
    if (c.note) card.append(el('p', 'note', c.note));
  };
  const lic = (u) => !u ? '' : /zero/.test(u) ? 'CC0' : /by-nc/.test(u) ? 'CC BY-NC 4.0' : /by\/4/.test(u) ? 'CC BY 4.0' : u;
  const coord = (la, lo) => `${num(Math.abs(la), 3)}° ${la >= 0 ? 'N' : 'S'}, ${num(Math.abs(lo), 3)}° ${lo >= 0 ? 'E' : 'W'}`;
  const showInfo = (a, s) => showCard({ kind: t('card.hydrophone'), title: s ? s.name : a.name, sub: s ? a.name : '', rows: [[t('card.where'), s ? coord(s.lat, s.lon) : ''], [t('card.years'), a.years], [t('card.rate'), a.rate], [t('card.access'), a.access], [t('card.licence'), a.licence === 'not verified' ? t('world.notverified') : a.licence]], links: [[t('card.archive'), a.link]] });
  let hl = () => {};
  const globe = window.makeGlobe ? window.makeGlobe(box, wd, COL, showInfo) : null;
  if (globe) {
    box.classList.add('globe'); hl = (id) => globe.highlight(id);
    box.append(card); box.addEventListener('globe-text', (e) => { typeof e.detail === 'string' ? showCard({ title: e.detail }) : showCard(e.detail); });
    const bar = $('world-layers'); bar.replaceChildren();
    const chip = (key, col, name, on) => { const b = el('button', 'area-chip'); b.type = 'button'; b.setAttribute('aria-pressed', String(on)); const d = el('i'); d.style.background = col; b.append(d, t(key)); b.addEventListener('click', () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); globe.show(name, v); }); bar.append(b); return b; };
    const fmtD = (d) => new Date(d).toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short', year: 'numeric' });
    const notes = $('world-notes'); notes.replaceChildren();
    getJSON('data/currents.json').then((c) => { globe.setCurrents(c); chip('layer.currents', '#73f2ff', 'cur', true); notes.append(el('p', 'note', t('layer.currents.note', { date: fmtD(c.time) }))); }).catch(() => {});
    // species name in the page language where we have one; otherwise the scientific name, with the reporter's own name kept as a hint
    const LATIN = { 'Balaenoptera musculus': 'blue', 'Balaenoptera physalus': 'fin', 'Megaptera novaeangliae': 'humpback', 'Orcinus orca': 'orca', 'Balaenoptera acutorostrata': 'minke', 'Balaenoptera edeni': 'brydes', 'Eubalaena glacialis': 'naright', 'Eubalaena japonica': 'npright' };
    const spName = (r) => { const sci = r.species || r.scientificName || 'Cetacea', k = LATIN[r.species];
      return k ? { title: t(`sp.${k}.name`), sub: sci } : { title: sci, sub: r.vernacularName ? t('card.reportedAs', { name: r.vernacularName }) : '' }; };
    // Whale sightings of the last 30 days from GBIF (1-3 weeks behind), fetched by the visitor's browser
    const iso = (d) => d.toISOString().slice(0, 10), now = new Date(), from = new Date(now - 30 * 864e5);
    getJSON(`https://api.gbif.org/v1/occurrence/search?taxonKey=733&hasCoordinate=true&eventDate=${iso(from)},${iso(now)}&limit=300`).then((g) => {
      const pts = g.results.filter((r) => r.decimalLatitude != null).map((r) => ({ lat: r.decimalLatitude, lon: r.decimalLongitude, text: r.species || 'Cetacea',
        card: { kind: t('card.sighting'), ...spName(r),
          rows: [[t('card.when'), fmtD(r.eventDate)], [t('card.where'), [r.waterBody, r.locality, r.stateProvince, r.country].filter(Boolean).slice(0, 2).join(', ') || coord(r.decimalLatitude, r.decimalLongitude)], [t('card.coords'), coord(r.decimalLatitude, r.decimalLongitude)], [t('card.count'), r.individualCount], [t('card.basis'), { HUMAN_OBSERVATION: t('card.basis.human'), MACHINE_OBSERVATION: t('card.basis.machine') }[r.basisOfRecord] || ''], [t('card.dataset'), r.datasetName || r.institutionCode], [t('card.licence'), lic(r.license)]],
          links: [[t('card.record'), `https://www.gbif.org/occurrence/${r.key}`]], note: t('card.gbif.note') } }));
      if (!pts.length) return; globe.setSightings(pts); chip('layer.sightings', '#ff8fd0', 'sight', true);
      notes.append(el('p', 'note', t('layer.sightings.note', { n: num(pts.length), total: num(g.count) })));
    }).catch(() => {});
    // Live sightings in the Salish Sea from Acartia (CC BY 4.0). Observer names and free-text comments are not shown.
    getJSON('https://acartia.io/api/v1/sightings/current').then((rows) => {
      const KEY = { 'Southern Resident Orca': 'acartia.srkw', 'Orca': 'acartia.orca', 'Humpback': 'acartia.humpback', 'Gray Whale': 'acartia.gray' };
      const pts = rows.map((r) => { const ts = Date.parse(String(r.created).replace(' ', 'T') + 'Z'), h = (Date.now() - ts) / 36e5; return { lat: +r.latitude, lon: +r.longitude, h, alpha: h < 24 ? 1 : .45,
        card: { kind: t('card.live'), title: KEY[r.type] ? t(KEY[r.type]) : t('acartia.other'), rows: [[t('card.when'), `${new Date(ts).toLocaleString(I18N.locale, { dateStyle: 'medium', timeStyle: 'short' })} (${h < 48 ? t('acartia.hago', { h: num(h, h < 10 ? 1 : 0) }) : fmtD(ts)})`], [t('card.count'), r.no_sighted], [t('card.coords'), coord(+r.latitude, +r.longitude)], [t('card.via'), [r.data_source_entity, r.data_source_name].filter(Boolean).join(' · ')], [t('card.checked'), r.trusted === '1' ? t('card.yes') : t('card.no')], [t('card.licence'), 'CC BY 4.0']], links: [['Acartia', 'https://acartia.io/']], note: t('card.acartia.note') },
        text: `${KEY[r.type] ? t(KEY[r.type]) : t('acartia.other')} · ${t('acartia.count', { n: r.no_sighted || '?' })} · ${h < 48 ? t('acartia.hago', { h: num(h, h < 10 ? 1 : 0) }) : fmtD(ts)} · ${r.data_source_entity || r.data_source_name || 'Acartia'} / Acartia` }; })
        .filter((p) => isFinite(p.lat) && isFinite(p.lon) && isFinite(p.h));
      if (!pts.length) return;
      globe.setPoints('acartia', pts, 0xffe066, .0035); chip('layer.acartia', '#ffe066', 'acartia', true);
      const newest = Math.min(...pts.map((p) => p.h)), day = pts.filter((p) => p.h < 24).length;
      const n = el('p', 'note'); n.append(t('layer.acartia.note', { n: num(pts.length), day: num(day), h: num(newest, newest < 10 ? 1 : 0) }) + ' ');
      const z = el('button', 'ghost'); z.type = 'button'; z.textContent = t('layer.acartia.zoom'); z.addEventListener('click', () => { globe.flyTo(48.2, -123.0, 1.09); box.scrollIntoView({ block: 'center' }); }); n.append(z); notes.append(n);
    }).catch(() => {});
    // Whale detections on Orcasound's fixed hydrophones in the last 48 hours
    Promise.all([getJSON('https://live.orcasound.net/api/json/feeds'), getJSON('https://live.orcasound.net/api/json/detections?page[limit]=200&sort=-timestamp&filter[category]=whale&include=feed')]).then(([f, d]) => {
      const feeds = {}; f.data.forEach((x) => { const ll = x.attributes.lat_lng; if (ll && ll.lat != null) feeds[x.id] = { name: x.attributes.name, slug: x.attributes.slug, lat: ll.lat, lon: ll.lng }; });
      const by = {}; d.data.forEach((x) => { const age = (Date.now() - Date.parse(x.attributes.timestamp)) / 36e5; const id = x.relationships && x.relationships.feed && x.relationships.feed.data && x.relationships.feed.data.id; if (age > 48 || !feeds[id]) return; (by[id] = by[id] || { n: 0, human: 0, last: age }); by[id].n++; if (x.attributes.source === 'human') by[id].human++; by[id].last = Math.min(by[id].last, age); });
      const list = Object.entries(by).map(([id, v]) => ({ ...feeds[id], card: { kind: t('card.heard'), title: feeds[id].name, sub: 'Orcasound', rows: [[t('card.reports'), v.n], [t('card.byPeople'), v.human], [t('card.byMachine'), v.n - v.human], [t('card.latest'), t('acartia.hago', { h: num(v.last, v.last < 10 ? 1 : 0) })], [t('card.coords'), coord(feeds[id].lat, feeds[id].lon)], [t('card.licence'), 'CC BY-NC-SA 4.0']], links: [[t('card.listen'), `https://live.orcasound.net/listen/${feeds[id].slug || ''}`]], note: t('card.orcasound.note') }, text: t('layer.det.item', { name: feeds[id].name, n: v.n, human: v.human, h: num(v.last, v.last < 10 ? 1 : 0) }) }));
      chip('layer.det', '#ff6b5b', 'det', true); globe.setDetections(list);
      notes.append(el('p', 'note', list.length ? t('layer.det.note') + ' ' + list.map((x) => x.text).join(' · ') : t('layer.det.none')));
    }).catch(() => {});
  }
  else {
    const W = 1000, H = 520, svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': t('world.title') }); box.append(svg);
    const proj = d3.geoNaturalEarth1().rotate([150, 0]).fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' }), path = d3.geoPath(proj);
    svg.append(svgEl('path', { class: 'sphere', d: path({ type: 'Sphere' }) }), svgEl('path', { class: 'grat', d: path(d3.geoGraticule().step([30, 30])()) }));
    const groups = {};
    const drawPts = () => wd.archives.forEach((a) => {
      const g = svgEl('g', { class: 'wgroup' }); groups[a.id] = g;
      a.sites.forEach((s) => { const [x, y] = proj([s.lon, s.lat]); const c = svgEl('circle', { cx: x, cy: y, r: a.status === 'used' ? 6 : 4, fill: COL[a.status], class: a.status === 'used' ? 'wused' : '' }); c.addEventListener('click', () => showInfo(a, s)); g.append(c); });
      svg.append(g);
    });
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then((r) => r.json()).then((topo) => { svg.append(svgEl('path', { class: 'land', d: path(topojson.feature(topo, topo.objects.land)) })); drawPts(); }).catch(drawPts);
    hl = (id) => Object.entries(groups).forEach(([k, g]) => g.classList.toggle('dim', !!id && k !== id));
  }
  const list = $('world-list'); list.replaceChildren();
  wd.archives.forEach((a) => {
    const b = el('button', 'wl-item'); b.type = 'button';
    const dot = el('i'); dot.style.background = COL[a.status];
    b.append(dot, el('b', '', a.name), el('span', '', `${{ used: t('world.used'), open: t('world.open'), account: t('world.account') }[a.status]} · ${(a.sites.length === 1 ? t('world.site1') : t('world.sites', { n: a.sites.length }))} · ${a.years}`));
    b.addEventListener('click', () => { const on = b.classList.toggle('on'); list.querySelectorAll('.wl-item').forEach((x) => x !== b && x.classList.remove('on')); hl(on ? a.id : null); showInfo(a); });
    list.append(b);
  });
  const off = el('p', 'note'); off.append(el('b', '', t('world.offmap') + ' '), wd.offmap.map((o) => `${o.name} (${o.years ? o.years + ', ' : ''}${t('world.off.' + o.id)})`).join(' · '));
  list.after(off, el('p', 'note', t('world.gaps')));
}

/* ---------- One minute player ---------- */
function player(clip) {
  paintGrid($('spec'), clip.grid);
  const dur = clip.duration_s, pct = (x) => `${(100 * x / dur).toFixed(3)}%`;
  const band = $('calls-band'); band.replaceChildren();
  const callEls = clip.labels.map(([a, d]) => { const s = el('span'); s.style.left = pct(a); s.style.width = pct(d); band.append(s); return { a, b: a + d, s }; });
  const lanes = $('lanes'); lanes.replaceChildren();
  const laneRow = (label) => { const r = el('div', 'lane-row'); const l = el('div', 'lane'); r.append(el('span', '', label), l); lanes.append(r); return l; };
  const people = laneRow(t('listen.people'));
  clip.labels.forEach(([a, d]) => { const c = el('span', 'c'); c.style.left = pct(a); c.style.width = pct(d); people.append(c); });
  const models = {};
  [['whalu', 'whalu'], ['perch', 'Perch']].forEach(([k, label]) => {
    const pts = clip.scores[k]; if (!pts) return;
    const lane = laneRow(label); lane.append(el('div', 'thr'));
    models[k] = pts.map(([tt, p]) => { const w = el('span', 'w' + (k === 'whalu' ? ' whalu' : '')); w.style.left = pct(tt + 1.25); w.style.width = `calc(${pct(2.5)} - 2px)`; w.style.height = `${Math.max(3, p * 100)}%`; lane.append(w); return { t: tt, p, w }; });
  });
  const audio = $('audio'), head = $('playhead'), btn = $('play');
  const at = (list, x) => list ? list.find((y) => x >= y.t + 1.25 && x < y.t + 3.75) || list.find((y) => x >= y.t && x < y.t + 5) : null;
  let raf = 0;
  const tick = () => {
    const x = audio.currentTime; head.style.left = pct(x);
    let inCall = false; callEls.forEach((c) => { const on = x >= c.a && x <= c.b; c.s.classList.toggle('lit', on); inCall = inCall || on; });
    $('r-t').textContent = `${num(x, 1)} s`; $('r-p').textContent = inCall ? t('listen.call') : t('listen.quiet');
    for (const [k, id] of [['whalu', 'r-w'], ['perch', 'r-c']]) { if (!models[k]) continue; models[k].forEach((y) => y.w.classList.remove('now')); const cur = at(models[k], x); if (cur) { cur.w.classList.add('now'); $(id).textContent = num(cur.p, 2); } }
    if (!audio.paused) raf = requestAnimationFrame(tick);
  };
  const setBtn = (on) => {
    $('play-text').textContent = on ? t('listen.pause') : (audio.currentTime > 0 && audio.currentTime < dur - .2 ? t('listen.resume') : t('listen.play'));
    $('play-icon').innerHTML = playIcon(on); head.classList.toggle('on', on || audio.currentTime > 0);
  };
  btn.addEventListener('click', () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  audio.addEventListener('play', () => { setBtn(true); cancelAnimationFrame(raf); tick(); });
  audio.addEventListener('pause', () => { setBtn(false); tick(); });
  audio.addEventListener('ended', () => setBtn(false));
  $('spec-wrap').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = dur * (e.clientX - r.left) / r.width; head.classList.add('on'); tick(); });
}

/* ---------- Results ---------- */
function results(s) {
  const box = $('scores'); box.replaceChildren();
  (s.models || []).forEach((m) => {
    const id = /perch/i.test(m.model) ? 'perch' : 'whalu';
    const p = el('div', 'panel'), v = m.balanced_accuracy;
    p.append(el('span', 'kicker', m.status === 'done' ? t('results.tested') : t('results.testing')), el('h3', '', t(`model.${id}`)));
    p.append(el('div', 'verdict ' + (v == null ? 'wait' : v >= .8 ? 'pass' : 'fail'), v == null ? '—' : num(v, v * 100 % 1 ? 3 : 2)));
    p.append(el('div', 'note', v == null ? t('results.ba.pending') : v >= .8 ? t('results.ba.pass') : t('results.ba.fail')));
    const g = el('div', 'gauge-line'); g.append(el('div', 'rail'));
    [[.5, t('results.guess')], [.8, t('results.passmark')], [1, t('results.perfect')]].forEach(([x, tx]) => { const mk = el('div', 'mark'); mk.style.left = `calc(${x * 100}% - 1px)`; const lb = el('div', x === .8 ? 'lbl up' : 'lbl', tx); lb.style.left = `${x * 100}%`; if (x === 1) lb.style.transform = 'translateX(-100%)'; g.append(mk, lb); });
    if (v != null) { const d = el('div', 'val'); d.style.left = `${v * 100}%`; d.style.background = v >= .8 ? 'var(--krill)' : 'var(--coral)'; g.append(d); }
    p.append(g, el('div', '', ' '));
    const meter = (label, n, total, col) => { const m2 = el('div', 'meter'); const r = el('div', 'row'); r.append(el('span', '', label), el('b', '', n == null ? t('results.pending') : `${n} / ${total}`)); const tr = el('div', 'track'); const f = el('span'); f.style.width = n == null ? '0' : `${100 * n / total}%`; f.style.background = col; tr.append(f); m2.append(r, tr); return m2; };
    p.append(meter(t('results.found'), m.calls_found, m.calls_total, 'var(--krill)'), meter(t('results.false'), m.false_alarms, m.quiet_total, 'var(--coral)'));
    p.append(el('p', 'note', `${t(`model.${id}.note`)} ${m.x_realtime ? t('results.speed', { x: num(m.x_realtime, 1) }) : ''}`));
    box.append(p);
  });
  const g = $('gates'); g.replaceChildren();
  const ids = { 'Hardware audit': 'audit', 'Environment': 'env', 'Correctness (whalu model)': 'test_whalu', 'Correctness (Perch 2.0)': 'test_perch', 'Benchmark, one MBARI day': 'bench', 'Unattended design': 'design', 'Seven-day trial': 'trial', 'Science layer': 'science' };
  (s.steps || []).forEach((r) => {
    const id = ids[r.name]; const li = el('li'); const tx = el('div');
    const res = id && I18N.t(`step.${id}.r`) !== `step.${id}.r` ? t(`step.${id}.r`) : (r.result || '');
    tx.append(el('span', 't', id ? t(`step.${id}`) : r.name), el('span', 'r', r.status === 'waiting' ? '' : res));
    li.append(el('span', 'n', String(r.step).padStart(2, '0')), tx, el('span', 's ' + r.status, t(`status.${r.status}`))); g.append(li);
  });
  const perch = (s.models || []).find((m) => /perch/i.test(m.model));
  if (perch && perch.balanced_accuracy != null) $('g-model').textContent = t('glance.model.val', { score: num(perch.balanced_accuracy, 3) });
}

/* ---------- Sound map ---------- */
function soundmap(sm) {
  const cv = $('smap'), only = $('smap-test');
  const P = sm.points.filter((p) => p[2] !== 2), C = P.filter((p) => p[2] === 1);
  let near = 0;
  C.forEach((c) => { const d = P.filter((q) => q !== c).map((q) => [(q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2, q[2]]).sort((a, b) => a[0] - b[0]).slice(0, 10); near += d.filter((x) => x[1] === 1).length / 10; });
  $('smap-note').textContent = t('smap.summary', { n: num(sm.points.length), calls: num(sm.points.filter((p) => p[2] === 1).length), purity: Math.round(100 * near / C.length), base: Math.round(100 * C.length / P.length) });
  const draw = () => {
    const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const pad = 18, r = Math.max(2, Math.min(4, W / 220));
    [2, 0, 1].forEach((lbl) => sm.points.forEach(([x, y, l, tst]) => {
      if (l !== lbl || (only.checked && !tst)) return;
      ctx.beginPath(); ctx.arc(pad + x * (W - 2 * pad), pad + (1 - y) * (H - 2 * pad), l === 1 ? r : r * .85, 0, 7);
      ctx.fillStyle = l === 1 ? 'rgba(255,181,71,.9)' : l === 0 ? 'rgba(47,111,134,.75)' : 'rgba(86,112,122,.7)';
      ctx.shadowBlur = l === 1 ? 6 : 0; ctx.shadowColor = 'rgba(255,181,71,.6)'; ctx.fill();
    }));
  };
  draw(); only.addEventListener('change', draw); addEventListener('resize', draw);
}

/* ---------- Machine ---------- */
function machine(s) {
  const gen = new Date(s.generated), age = Math.round((Date.now() - gen) / 60000);
  const last = s.temps[s.temps.length - 1], flags = last ? parseInt(last.throttled, 16) || 0 : 0, temp = last ? num(+last.temp_c, 0) : '—';
  const when = gen.toLocaleString(I18N.locale, { dateStyle: 'medium', timeStyle: 'short' });
  $('stamp').textContent = t('machine.stamp', { when, age: age < 1 ? t('machine.justnow') : t('machine.minago', { n: age }) });
  if (age > 90) $('stamp').classList.add('err');
  $('live-dot').className = 'dot ' + (age > 90 ? 'stale' : (flags & 4) ? 'hot on' : 'on');
  const done = (s.progress || []).reduce((a, p) => a + p.done, 0), tot = (s.progress || []).reduce((a, p) => a + p.total, 0);
  $('live-text').textContent = age > 90 ? t('hero.silent', { min: age }) : t('hero.live', { temp, done, total: tot });
  $('g-pi').textContent = age > 90 ? t('glance.pi.silent', { min: age }) : (flags & 4) ? t('glance.pi.hot', { temp }) : t('glance.pi.ok', { temp });
  $('g-pi').closest('.tile').classList.toggle('warn', !!(flags & 4) || age > 90);
  if (last) { $('temp').replaceChildren(document.createTextNode(num(+last.temp_c, 1)), el('small', '', ' °C')); }
  $('throttle').textContent = (flags & 4) ? t('machine.throttle.now') : flags ? t('machine.throttle.since') : t('machine.throttle.none');
  const c = $('cores'); c.replaceChildren();
  (s.cores || []).forEach((k) => { const d = el('div', 'core'); const col = el('div', 'col'); const f = el('span'); f.style.height = k.busy_pct + '%'; col.append(f); d.append(col, el('div', '', `${k.busy_pct}%`)); c.append(d); });
  if (s.ram) $('ram').textContent = t('machine.ram', { used: num(s.ram.used_gb, 1), total: num(s.ram.total_gb, 1) });
  const pr = $('progress'); pr.replaceChildren();
  const stageKey = { 'Test clips': 'machine.job.test', 'Training clips': 'machine.job.train' };
  (s.progress || []).forEach((p) => { const r = el('div', 'row2'); r.append(el('span', '', stageKey[p.stage] ? t(stageKey[p.stage]) : p.stage), el('span', 'mono', `${p.done}/${p.total}`)); const b = el('div', 'bar'); const f = el('span'); f.style.width = `${100 * p.done / p.total}%`; b.append(f); pr.append(r, b); });
  pr.append(el('p', 'note', t('machine.job.note')));
  const pipe = $('pipeline'); pipe.replaceChildren();
  (s.pipeline || []).forEach((p) => { const li = el('li', p.active ? 'on' : ''); const val = p.unit ? t(`pipe.v.${p.unit}`, { n: num(p.n || 0), of: num(p.of || 0), real: num(p.real || 0) }) : p.value; li.append(el('b', '', t(`pipe.${p.id}`)), el('span', 'v', val), el('span', 'n', t(`pipe.${p.id}.n`))); pipe.append(li); });
  tchart(s.temps || []);
}
function tchart(temps) {
  const box = $('tchart'); box.replaceChildren();
  if (temps.length < 2) { box.textContent = t('machine.tchart.few'); return; }
  const W = Math.max(300, box.clientWidth || 700), H = 200, m = { t: 10, r: 8, b: 22, l: 30 };
  const pts = temps.map((r) => ({ d: new Date(r.time), c: +r.temp_c }));
  const x = d3.scaleTime().domain(d3.extent(pts, (p) => p.d)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([40, 92]).range([H - m.b, m.t]);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': t('machine.tchart') });
  const defs = svgEl('defs'), lg = svgEl('linearGradient', { id: 'tg', x1: 0, x2: 0, y1: 0, y2: 1 });
  lg.append(svgEl('stop', { offset: '0%', 'stop-color': '#ff6b5b', 'stop-opacity': .45 }), svgEl('stop', { offset: '100%', 'stop-color': '#ff6b5b', 'stop-opacity': 0 })); defs.append(lg); svg.append(defs);
  [40, 60, 80].forEach((cc) => { svg.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(cc), y2: y(cc), stroke: 'rgba(127,162,174,.12)' })); const tx = svgEl('text', { x: m.l - 6, y: y(cc) + 3, 'text-anchor': 'end' }); tx.textContent = cc; svg.append(tx); });
  [[75, 'var(--amber)'], [85, 'var(--coral)']].forEach(([cc, col]) => svg.append(svgEl('line', { x1: m.l, x2: W - m.r, y1: y(cc), y2: y(cc), stroke: col, 'stroke-dasharray': '4 4', 'stroke-opacity': .7 })));
  svg.append(svgEl('path', { d: d3.area().x((p) => x(p.d)).y0(H - m.b).y1((p) => y(p.c))(pts), fill: 'url(#tg)' }), svgEl('path', { d: d3.line().x((p) => x(p.d)).y((p) => y(p.c))(pts), fill: 'none', stroke: '#ff8a7c', 'stroke-width': 2 }));
  const lp = pts[pts.length - 1]; svg.append(svgEl('circle', { cx: x(lp.d), cy: y(lp.c), r: 4, fill: '#ff8a7c' }));
  const fmt = (d) => d.toLocaleTimeString(I18N.locale, { hour: '2-digit', minute: '2-digit' });
  [pts[0], lp].forEach((p, i) => { const tx = svgEl('text', { x: x(p.d), y: H - 6, 'text-anchor': i ? 'end' : 'start' }); tx.textContent = fmt(p.d); svg.append(tx); });
  box.append(svg);
}

/* ---------- Voices, live, calendar, queue ---------- */
let voicesData = null;
function voices(v) {
  voicesData = v;
  const box = $('voices'); box.replaceChildren();
  const players = [];
  v.clips.forEach((c) => {
    const spk = CODE2SP[c.code]; const card = el('article', 'voice');
    const vs = el('div', 'vs'); const cv = document.createElement('canvas'); paintGrid(cv, c.grid);
    const ph = el('div', 'ph'); vs.append(cv, ph, el('span', 'ax', `0–${c.fmax_hz} Hz`));
    const body = el('div', 'body');
    const when = new Date(Date.parse(v.hour) + c.start_s * 1000).toISOString().slice(0, 16).replace('T', ' ');
    const meta = { when, dur: Math.round(c.duration_s), x: c.speedup, score: num(c.peak_score, 2) };
    body.append(el('h4', '', t(`sp.${spk}.name`)), el('div', 'meta', c.speedup > 1 ? t('voices.meta.fast', meta) : t('voices.meta', meta)));
    const audio = new Audio(); audio.preload = 'none'; audio.src = c.audio;
    const btn = el('button', 'play small'); btn.type = 'button';
    const label = () => { btn.innerHTML = `<svg viewBox="0 0 14 14" style="width:14px;height:14px">${playIcon(!audio.paused)}</svg>`; btn.append(audio.paused ? (c.speedup > 1 ? t('voices.play.fast', { x: c.speedup }) : t('voices.play')) : t('voices.pause')); };
    label();
    btn.addEventListener('click', () => { if (audio.paused) { players.forEach((p) => p !== audio && p.pause()); audio.play().catch(() => {}); } else audio.pause(); });
    let raf = 0;
    const tick = () => { ph.style.left = `${Math.min(100, audio.currentTime * c.speedup / c.duration_s * 100)}%`; ph.style.opacity = 1; if (!audio.paused) raf = requestAnimationFrame(tick); };
    audio.addEventListener('play', () => { label(); tick(); }); audio.addEventListener('pause', () => { label(); cancelAnimationFrame(raf); }); audio.addEventListener('ended', label);
    vs.addEventListener('click', (e) => { const r = vs.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * c.duration_s / c.speedup; tick(); });
    players.push(audio);
    const sc = el('div', 'sc'); sc.append(el('hr'));
    c.scores.forEach(([x, p]) => { const s = el('span'); s.style.left = `${Math.max(0, x / c.duration_s * 100)}%`; s.style.width = `${2.5 / c.duration_s * 100}%`; s.style.height = `${Math.max(3, p * 100)}%`; sc.append(s); });
    body.append(btn, sc, el('p', 'note', t('voices.bars')), el('p', 'note check', t(`voices.check.${c.code}`)));
    card.append(vs, body); box.append(card);
  });
}
function live() {
  const B = 'https://audio-orcasound-net.s3.amazonaws.com';
  const sel = $('live-node'), btn = $('live-play'), audio = $('live-audio'), state = $('live-state'), cv = $('live-spec');
  const fill = (list) => { sel.replaceChildren(); list.forEach(([id, name]) => sel.append(new Option(name, id))); };
  fill([['rpi_orcasound_lab', 'Orcasound Lab'], ['rpi_north_sjc', 'North San Juan Channel'], ['rpi_andrews_bay', 'Andrews Bay'], ['rpi_port_townsend', 'Port Townsend'], ['rpi_bush_point', 'Bush Point'], ['rpi_sunset_bay', 'Sunset Bay']]);
  getJSON('https://live.orcasound.net/api/json/feeds').then((d) => {
    const list = d.data.filter((f) => f.attributes.visible).map((f) => [f.attributes.node_name, f.attributes.name]);
    if (list.length) { list.sort((a) => (a[0] === 'rpi_orcasound_lab' ? -1 : 1)); fill(list); }
  }).catch(() => {});
  const clock = () => { $('live-clock').textContent = `${new Date().toLocaleTimeString(I18N.locale, { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' })} ${t('live.tz')}`; };
  clock(); setInterval(clock, 30000);
  let hls = null, ctx = null, analyser = null, raf = 0, playing = false;
  const setBtn = () => { btn.querySelector('span').textContent = playing ? t('live.stop') : t('live.play'); btn.querySelector('svg').innerHTML = playing ? '<path d="M2 2h10v10H2z" fill="currentColor"/>' : playIcon(false); };
  const draw = () => {
    const g = cv.getContext('2d'), W = cv.width = cv.clientWidth * (devicePixelRatio || 1), H = cv.height = cv.clientHeight * (devicePixelRatio || 1);
    const bins = new Uint8Array(analyser.frequencyBinCount), maxBin = Math.floor(analyser.frequencyBinCount * Math.min(1, 8000 / (ctx.sampleRate / 2)));
    g.fillStyle = '#020b10'; g.fillRect(0, 0, W, H);
    const step = () => {
      analyser.getByteFrequencyData(bins); g.drawImage(cv, -2, 0);
      for (let y = 0; y < H; y++) { const [r, gg, bb] = colour(Math.pow(bins[Math.floor((1 - y / H) * maxBin)] / 255, 1.4)); g.fillStyle = `rgb(${r},${gg},${bb})`; g.fillRect(W - 2, y, 2, 1); }
      if (playing) raf = requestAnimationFrame(step);
    };
    step();
  };
  const stop = () => { playing = false; audio.pause(); if (hls) { hls.destroy(); hls = null; } cancelAnimationFrame(raf); state.textContent = ''; setBtn(); };
  btn.addEventListener('click', async () => {
    if (playing) return stop();
    const node = sel.value; state.textContent = t('live.connecting');
    try {
      const ts = (await (await fetch(`${B}/${node}/latest.txt`, { cache: 'no-store' })).text()).trim();
      const url = `${B}/${node}/hls/${ts}/live.m3u8`;
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); const srcN = ctx.createMediaElementSource(audio); analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = .5; srcN.connect(analyser); analyser.connect(ctx.destination); }
      await ctx.resume();
      if (window.Hls && Hls.isSupported()) { hls = new Hls({ liveSyncDurationCount: 3 }); hls.loadSource(url); hls.attachMedia(audio); hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { stop(); state.textContent = t('live.down'); } }); }
      else if (audio.canPlayType('application/vnd.apple.mpegurl')) audio.src = url;
      else { state.textContent = t('live.unsupported'); return; }
      await audio.play(); playing = true; setBtn(); state.textContent = t('live.from', { name: sel.options[sel.selectedIndex].text }); draw();
    } catch (e) { stop(); state.textContent = t('live.fail'); }
  });
  sel.addEventListener('change', () => { if (playing) { stop(); btn.click(); } });
}
function calendar(c) {
  const start = new Date('2015-07-01T00:00:00Z'), now = new Date(), totalH = Math.floor((now - start) / 3600000);
  const doneDays = new Map(); c.hours.forEach((h) => doneDays.set(h.day, (doneDays.get(h.day) || []).concat(h)));
  const tot = {}; c.hours.forEach((h) => Object.entries(h.counts).forEach(([k, n]) => { tot[k] = (tot[k] || 0) + n; }));
  const found = Object.entries(tot).filter(([, n]) => n > 0).map(([k, n]) => `${num(n)} ${CODE2SP[k] ? t(`sp.${CODE2SP[k]}.name`) : k}`).join(', ');
  $('cal-sum').textContent = t('finds.sum', { done: num(c.hours.length), total: num(totalH), pct: num(100 * c.hours.length / totalH, 3), found: found || t('finds.none') });
  $('g-hours').textContent = t('glance.hours.val', { done: num(c.hours.length), total: num(totalH) });
  const cal = $('cal'); cal.replaceChildren();
  for (let y = 2015; y <= now.getUTCFullYear(); y++) {
    const row = el('div', 'cal-year'), days = el('div', 'cal-days'), jan1 = new Date(Date.UTC(y, 0, 1));
    for (let i = 0; i < jan1.getUTCDay(); i++) days.append(el('i', 'none'));
    for (let d = new Date(jan1); d.getUTCFullYear() === y; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10), i = el('i');
      if (d < start || d > now) i.className = 'none';
      else if (doneDays.has(key)) { i.className = 'on'; i.title = t('finds.day', { day: key, n: doneDays.get(key).length }); }
      days.append(i);
    }
    row.append(el('span', '', String(y)), days); cal.append(row);
  }
}
function queue(list) {
  const box = $('cands'); box.replaceChildren();
  const items = list.filter((x) => !x.audio);
  if (voicesData) voicesData.clips.forEach((c) => items.push({ title: `${t(`sp.${CODE2SP[c.code]}.name`)}?`, when: new Date(Date.parse(voicesData.hour) + c.start_s * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC', why: t('queue.why', { sp: t(`sp.${CODE2SP[c.code]}.name`), score: num(c.peak_score, 2) }), status: c.code === 'Bm' ? t('queue.status.doubt') : t('queue.status.open'), anchor: '#voices' }));
  if (!items.length && !list.some((x) => x.audio)) { box.append(el('p', 'note', t('queue.empty'))); document.dispatchEvent(new Event('queue-ready')); return; }
  items.forEach((it) => { const c = el('div', 'cand'); c.append(el('span', 'st', it.status), el('b', '', it.title), el('div', 'note', `${it.when} · ${it.why}`)); if (it.anchor) { const a = el('a', '', t('queue.listen')); a.href = it.anchor; c.append(a); } box.append(c); });
  document.dispatchEvent(new Event('queue-ready'));
}

/* ---------- Menu highlight ---------- */
function menu() {
  const links = [...document.querySelectorAll('.toc a')];
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('[data-part]').forEach((p) => io.observe(p));
}

/* ---------- Load ---------- */
I18N.ready.then(() => {
  menu();
  getJSON('data/clip.json').then((c) => { hero(c.grid); player(c); }).catch(() => { $('clipnote').textContent = t('listen.loadfail'); });
  getJSON('whales.json').then((w) => { whales(w); localMap(w.hydrophones); }).catch(() => { $('detail').textContent = t('ui.loadfail'); });
  getJSON('data/world.json').then(worldMap).catch(() => { $('world').textContent = t('ui.loadfail'); });
  getJSON('data/status.json').then((s) => { machine(s); results(s); }).catch(() => { $('stamp').textContent = t('machine.loadfail'); $('stamp').classList.add('err'); $('live-text').textContent = t('hero.noreport'); });
  getJSON('data/soundmap.json').then(soundmap).catch(() => { $('smap-note').textContent = t('ui.loadfail'); });
  getJSON('data/voices/voices.json').then(voices).catch(() => {}).finally(() => getJSON('data/candidates.json').then(queue).catch(() => queue([])));
  getJSON('data/calendar.json').then(calendar).catch(() => { $('cal-sum').textContent = t('ui.loadfail'); });
  live();
});
