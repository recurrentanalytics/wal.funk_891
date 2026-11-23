/* Technical article draft. Prose in i18n (pap.*); every number, table and figure is filled from data/results.json,
   data/ci_compare.json and data/handbook.json at load time, so the draft follows each new result. Print = PDF. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const B = (document.querySelector('meta[name="build"]') || {}).content || '';
  const get = (u) => fetch(u + '?v=' + B, { cache: 'no-cache' }).then((r) => r.json());
  const n = (v, d) => I18N.num(v, d);
  const NS = 'http://www.w3.org/2000/svg', S = (tag, a = {}) => { const e = document.createElementNS(NS, tag); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); return e; };

  function ciFigure(CI) {
    const W = 860, H = 260, m = { t: 26, r: 14, b: 30, l: 46 }, gap = 40, pw = (W - m.l - m.r - gap) / 2;
    const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': t('pap.fig1.t') }), mon = t('whales.monthsabbr').split('|');
    ['blue', 'fin'].forEach((sp, k) => {
      const d = CI.species[sp], ox = m.l + k * (pw + gap), vals = [...d.pi_month, ...d.mbari_month].filter((v) => v != null);
      const lo = Math.min(...vals, .99), hi = Math.max(...vals, 1.02), x = (i) => ox + i / 11 * pw, y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
      const ttl = S('text', { x: ox, y: 14, fill: '#e6f4f7', 'font-size': 13 }); ttl.textContent = t(`sp.${sp}.name`); svg.append(ttl);
      [lo, 1.01, hi].forEach((v) => { svg.append(S('line', { x1: ox, x2: ox + pw, y1: y(v), y2: y(v), stroke: v === 1.01 ? '#ffb547' : 'rgba(127,162,174,.3)', 'stroke-dasharray': v === 1.01 ? '4 4' : '' })); const tx = S('text', { x: ox - 6, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#8fb4be' }); tx.textContent = n(v, 2); svg.append(tx); });
      mon.forEach((mm, i) => { const tx = S('text', { x: x(i), y: H - 10, 'text-anchor': 'middle', 'font-size': 10, fill: '#8fb4be' }); tx.textContent = mm; svg.append(tx); });
      const line = (arr, col) => { let dd = ''; arr.forEach((v, i) => { if (v != null) dd += (dd ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }); svg.append(S('path', { d: dd, fill: 'none', stroke: col, 'stroke-width': 2.4 })); };
      line(d.mbari_month, '#ffb547'); line(d.pi_month, '#5ee6d7');
    });
    return svg;
  }

  async function build() {
    await I18N.ready;
    const [R, CI, H] = await Promise.all([get('data/results.json'), get('data/ci_compare.json').catch(() => null), get('data/handbook.json')]);
    const rows = Object.fromEntries(R.groups.flatMap((g) => g.rows).map((r) => [r.id, r])), v = (id, d = 3) => rows[id] && rows[id].value != null ? n(rows[id].value, d) : '—';
    const all = Object.values(rows), cnt = (k) => all.filter((r) => r.verdict === k).length;
    const V = { pass: cnt('pass'), fail: cnt('fail'), pending: cnt('pending'), total: all.length, s3p: v('s3_perch'), s3w: v('s3_whalu', 2), cbr: v('ci_blue_rho'), cfr: v('ci_fin_rho'), cbb: v('ci_blue_ba'), cfb: v('ci_fin_ba'), sp: v('s4_speed', 2), samp: v('sampling', 1), heat: v('s4c_heat', 1), s7ab: v('s7a_blue'), s7af: v('s7a_fin'), build: H.build };
    $('hb-build').textContent = t('hbk.build', { b: H.build, at: H.built_at });
    document.title = 'wal.funk_891 · ' + t('pap.short');
    const main = $('hb'), toc = $('toc'), secs = [];
    const head = el('header'); head.append(el('h1', '', t('pap.title')), el('p', 'authors', t('pap.authors')), el('p', 'meta', t('pap.status', V)));
    const ab = el('div', 'abstract'); ab.append(el('h3', '', t('pap.abs.t')), el('p', '', t('pap.abs', V))); head.append(ab); main.append(head);
    const sec = (id, num) => { const s = el('section'); s.id = id; const h = el('h2'); h.append(el('small', '', num), document.createTextNode(t(`pap.${id}.t`))); s.append(h); secs.push(s); return s; };
    const ps = (s, keys) => keys.forEach((k) => s.append(el('p', '', t(k, V))));
    let s = sec('intro', '1'); ps(s, ['pap.intro.p1', 'pap.intro.p2', 'pap.intro.p3']);
    s = sec('methods', '2'); ps(s, ['pap.m.station', 'pap.m.models', 'pap.m.prereg', 'pap.m.tests', 'pap.m.compute']);
    s = sec('results', '3'); ps(s, ['pap.r.p1']);
    const tb = el('table'); const tr = el('tr'); [t('res.col.test'), t('pap.col.data'), 'n', t('res.col.value'), t('res.col.mark'), t('res.col.verdict'), t('pap.col.where')].forEach((x) => tr.append(el('th', '', x))); tb.append(tr);
    R.groups.forEach((g) => { const gr = el('tr'); const td = el('td', '', t('res.group.' + g.id)); td.colSpan = 7; td.style.fontWeight = 500; gr.append(td); tb.append(gr);
      g.rows.forEach((r) => { const row = el('tr'); const val = r.value == null ? '—' : r.measure === 'peak' ? t('routes.months').split('|')[r.value - 1] : r.measure === 'crash' ? t('res.ok') : n(r.value, r.measure === 'speed' ? 2 : r.measure === 'temp' ? 1 : 3);
        const mk = r.measure === 'peak' ? t('res.mark.peak') : r.measure === 'crash' ? t('res.mark.crash') : (r.dir === '<=' ? '≤ ' : '≥ ') + n(r.mark, r.measure === 'temp' || r.measure === 'speed' ? 0 : 2);
        [t('res.' + r.id) + ' (' + t('res.m.' + r.measure) + ')', t('res.data.' + r.data), n(r.n), val, mk, t('res.v.' + r.verdict), t('res.where.' + r.where)].forEach((x) => row.append(el('td', '', x))); tb.append(row); }); });
    const f1 = el('figure'); f1.append(tb, el('figcaption', '', t('pap.tab1'))); s.append(f1);
    ps(s, ['pap.r.orca', 'pap.r.bluefin', 'pap.r.ci']);
    if (CI) { const f = el('figure', 'fig'); f.append(ciFigure(CI), el('figcaption', '', t('pap.fig1.t'))); s.append(f); }
    ps(s, ['pap.r.hump', 'pap.r.pi']);
    s = sec('discussion', '4'); ps(s, ['pap.d.p1', 'pap.d.p2', 'pap.d.p3']);
    s = sec('limits', '5'); ps(s, ['pap.l.p1', 'pap.l.p2']);
    s = sec('data', '6'); ps(s, ['pap.data.p1']);
    s = sec('refs', '7'); const ol = el('ol', 'refs');
    [['Ryan, J. P. et al. (2025). PLOS ONE 20(2): e0318624.', 'https://doi.org/10.1371/journal.pone.0318624'], ['Ryan et al. (2025), data and code.', 'https://doi.org/10.6084/m9.figshare.24977925.v1'],
      ['Allen, A. N. et al. (2021). A convolutional neural network for automated detection of humpback whale song. Frontiers in Marine Science 8:607321.', 'https://doi.org/10.3389/fmars.2021.607321'],
      ['DCLDE 2015 workshop data (NOAA NCEI).', 'https://www.ncei.noaa.gov/products/passive-acoustic-data'], ['Ryan, W. B. F. et al. (2009). Global Multi-Resolution Topography synthesis. G3 10: Q03014.', 'https://doi.org/10.1029/2008GC002332'],
      ['Oestreich, W. K. et al. (2020). Current Biology 30: 4773–4779.', 'https://doi.org/10.1016/j.cub.2020.08.105'], ['Perch 2.0 (Google DeepMind), perch-hoplite.', 'https://github.com/google-research/perch-hoplite'],
      ['Orcasound.', 'https://www.orcasound.net/'], ['MBARI Pacific Sound.', 'https://registry.opendata.aws/pacific-sound/']].forEach(([txt, u]) => { const li = el('li', '', txt + ' '); const a = el('a', '', u); a.href = u; a.rel = 'noopener'; li.append(a); ol.append(li); });
    s.append(ol);
    secs.forEach((x, i) => { main.append(x); const a = el('a', '', `${x.querySelector('small').textContent}. ${t(`pap.${x.id}.t`)}`); a.href = '#' + x.id; toc.append(a); });
    const links = [...toc.querySelectorAll('a')], io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach((x) => io.observe(x));
    $('hb-print').addEventListener('click', () => window.print());
  }
  build();
})();
