/* Interactive check of the Pi against MBARI: the Pi's call index (one hour a day) next to MBARI's published daily index.
   Species toggle, two views (year course / day by day) and a threshold slider for the day view. Needs d3, i18n.js. */
(function () {
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const NS = 'http://www.w3.org/2000/svg', S = (tag, a = {}) => { const e = document.createElementNS(NS, tag); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  function build(D) {
    const host = $('cic'); if (!host) return;
    let sp = 'blue', view = 'year', th = 1.01, years = false;
    const bar = mk('div', 'cic-bar');
    const seg = (opts, get, set) => { const g = mk('div', 'seg'); opts.forEach(([v, k]) => { const b = mk('button', '', t(k)); b.type = 'button'; b.addEventListener('click', () => { set(v); draw(); }); b.dataset.v = v; g.append(b); }); g.sync = () => g.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === get())); return g; };
    const s1 = seg([['blue', 'sp.blue.name'], ['fin', 'sp.fin.name']], () => sp, (v) => { sp = v; });
    const s2 = seg([['year', 'cic.view.year'], ['days', 'cic.view.days']], () => view, (v) => { view = v; });
    const yl = mk('label', 'rt-chk'); const yc = mk('input'); yc.type = 'checkbox'; yl.append(yc, ' ' + t('cic.years')); yc.addEventListener('change', () => { years = yc.checked; draw(); });
    const sl = mk('label', 'cic-th'); const si = mk('input'); si.type = 'range'; si.min = 1.0; si.max = 1.04; si.step = 0.001; si.value = th; const sv = mk('b'); sl.append(t('cic.threshold') + ' ', si, sv);
    si.addEventListener('input', () => { th = +si.value; draw(); });
    bar.append(s1, s2, yl, sl);
    const chart = mk('div', 'cic-chart'), read = mk('p', 'note cic-read');
    host.replaceChildren(bar, chart, read, mk('p', 'note', t('cic.note')));
    function draw() {
      s1.sync(); s2.sync(); yl.hidden = view !== 'year'; sl.hidden = view !== 'days'; sv.textContent = num(th, 3);
      const d = D.species[sp], W = Math.max(320, chart.clientWidth || 700), H = Math.min(360, Math.max(240, W * .5)), m = { t: 14, r: 14, b: 34, l: 48 };
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': t('cic.title') });
      const axis = (x0, y0, x1, y1, txt, x, y, anchor) => { svg.append(S('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'rgba(127,162,174,.25)' })); if (txt != null) { const e = S('text', { x, y, 'text-anchor': anchor || 'middle', 'font-size': 11, fill: '#8fb4be' }); e.textContent = txt; svg.append(e); } };
      if (view === 'year') {
        const all = [...d.pi_month, ...d.mbari_month].filter((v) => v != null);
        const lo = Math.min(...all, 0.985), hi = Math.max(...all, 1.02);
        const x = d3.scaleLinear().domain([0, 11]).range([m.l, W - m.r]), y = d3.scaleLinear().domain([lo, hi]).nice().range([H - m.b, m.t]);
        y.ticks(5).forEach((v) => axis(m.l, y(v), W - m.r, y(v), num(v, 2), m.l - 6, y(v) + 4, 'end'));
        const mon = t('routes.months').split('|');
        for (let i = 0; i < 12; i++) { const e = S('text', { x: x(i), y: H - 12, 'text-anchor': 'middle', 'font-size': 11, fill: '#8fb4be' }); e.textContent = mon[i].slice(0, 3); svg.append(e); }
        svg.append(S('line', { x1: m.l, x2: W - m.r, y1: y(1.01), y2: y(1.01), stroke: 'var(--amber)', 'stroke-dasharray': '4 4', 'stroke-opacity': .6 }));
        const line = (arr, col, w, op) => { const p = d3.line().defined((v) => v != null).x((_, i) => x(i)).y((v) => y(v))(arr); svg.append(S('path', { d: p, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-opacity': op })); };
        if (years) Object.values(d.pi_year_month).forEach((arr) => line(arr, '#5ee6d7', 1, .22));
        line(d.mbari_month, '#ffb547', 3, 1); line(d.pi_month, '#5ee6d7', 3, 1);
        const peak = (a) => a.indexOf(Math.max(...a.filter((v) => v != null)));
        read.textContent = t('cic.read.year', { pi: mon[peak(d.pi_month)], mbari: mon[peak(d.mbari_month)] });
      } else {
        const P = d.pairs, xs = P.map((p) => p[2]), ys = P.map((p) => p[1]);
        const x = d3.scaleLinear().domain([Math.min(...xs, .98), Math.max(...xs, 1.15)]).nice().range([m.l, W - m.r]);
        const y = d3.scaleLinear().domain([Math.min(...ys, .98), Math.max(...ys, 1.15)]).nice().range([H - m.b, m.t]);
        x.ticks(5).forEach((v) => axis(x(v), m.t, x(v), H - m.b, num(v, 2), x(v), H - 18));
        y.ticks(5).forEach((v) => axis(m.l, y(v), W - m.r, y(v), num(v, 2), m.l - 6, y(v) + 4, 'end'));
        const xl = S('text', { x: (m.l + W - m.r) / 2, y: H - 2, 'text-anchor': 'middle', 'font-size': 11, fill: '#ffb547' }); xl.textContent = t('cic.axis.mbari'); svg.append(xl);
        const ylb = S('text', { x: 12, y: m.t + 4, 'font-size': 11, fill: '#5ee6d7' }); ylb.textContent = t('cic.axis.pi'); svg.append(ylb);
        let a = 0, b = 0, c = 0, e = 0;
        P.forEach(([day, pi, mb]) => {
          const pp = pi >= th, mp = mb >= th; if (pp && mp) a++; else if (pp) b++; else if (mp) c++; else e++;
          const dot = S('circle', { cx: x(mb), cy: y(pi), r: 2.4, fill: pp === mp ? '#5ee6d7' : '#ff6b6b', 'fill-opacity': .55 });
          const tt = S('title'); tt.textContent = `${day} · Pi ${num(pi, 3)} · MBARI ${num(mb, 3)}`; dot.append(tt); svg.append(dot);
        });
        svg.append(S('line', { x1: x(th), x2: x(th), y1: m.t, y2: H - m.b, stroke: 'var(--amber)', 'stroke-dasharray': '4 4' }), S('line', { x1: m.l, x2: W - m.r, y1: y(th), y2: y(th), stroke: 'var(--amber)', 'stroke-dasharray': '4 4' }));
        const ba = 0.5 * (a / Math.max(1, a + c) + e / Math.max(1, e + b));
        read.textContent = t('cic.read.days', { n: num(P.length), both: num(a), none: num(e), onlypi: num(b), onlymbari: num(c), ba: num(ba, 2) });
      }
      chart.replaceChildren(svg);
    }
    draw(); addEventListener('resize', draw);
  }
  I18N.ready.then(() => fetch('data/ci_compare.json').then((r) => r.json()).then(build).catch(() => {}));
})();
