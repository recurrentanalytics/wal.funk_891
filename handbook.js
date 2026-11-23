/* The handbook: prose in i18n (hbk.*), facts generated at every build (data/handbook.json, pi_stack.json, sources.json,
   status.json, notebook.json). One page you can click through; the print button gives a PDF with one chapter per page. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const B = (document.querySelector('meta[name="build"]') || {}).content || '';
  const get = (u) => fetch(u + (u.includes('?') ? '&' : '?') + 'v=' + B, { cache: 'no-cache' }).then((r) => r.json());
  const table = (head, rows) => { const tb = el('table'); const tr = el('tr'); head.forEach((h) => tr.append(el('th', '', h))); tb.append(tr);
    rows.forEach((r) => { const row = el('tr'); r.forEach((c) => { const td = el('td'); if (c instanceof Node) td.append(c); else td.textContent = c == null ? '—' : String(c); row.append(td); }); tb.append(row); }); return tb; };
  const link = (txt, u) => { const a = el('a', '', txt); a.href = u; a.rel = 'noopener'; return a; };
  const paras = (sec, keys) => keys.forEach((k) => sec.append(el('p', '', t(k))));
  const kb = (n) => n > 1e6 ? `${num(n / 1e6, 1)} MB` : `${num(n / 1e3, 0)} kB`;
  const num = (n, d) => I18N.num(n, d);

  function diagram() {
    const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 860 300'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', t('hbk.arch.alt'));
    const box = (x, y, w, h, title, sub) => { const r = document.createElementNS(NS, 'rect'); Object.entries({ x, y, width: w, height: h, rx: 12, fill: '#071d28', stroke: '#5ee6d7', 'stroke-opacity': .6 }).forEach(([k, v]) => r.setAttribute(k, v)); s.append(r);
      const a = document.createElementNS(NS, 'text'); a.setAttribute('x', x + 12); a.setAttribute('y', y + 24); a.setAttribute('fill', '#e6f4f7'); a.setAttribute('font-size', 15); a.textContent = title; s.append(a);
      sub.split('|').forEach((l, i) => { const b = document.createElementNS(NS, 'text'); b.setAttribute('x', x + 12); b.setAttribute('y', y + 46 + i * 17); b.setAttribute('fill', '#8fb4be'); b.setAttribute('font-size', 12); b.textContent = l; s.append(b); }); };
    const arrow = (x1, y1, x2, y2, label) => { const p = document.createElementNS(NS, 'line'); Object.entries({ x1, y1, x2, y2, stroke: '#5ee6d7', 'stroke-width': 1.5, 'marker-end': 'url(#ar)' }).forEach(([k, v]) => p.setAttribute(k, v)); s.append(p);
      if (label) { const tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', (x1 + x2) / 2); tx.setAttribute('y', (y1 + y2) / 2 - 6); tx.setAttribute('text-anchor', 'middle'); tx.setAttribute('fill', '#ffb547'); tx.setAttribute('font-size', 11); tx.textContent = label; s.append(tx); } };
    const defs = document.createElementNS(NS, 'defs'); defs.innerHTML = '<marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#5ee6d7"/></marker>'; s.append(defs);
    box(10, 20, 230, 110, t('hbk.arch.src'), t('hbk.arch.src.d'));
    box(315, 20, 230, 110, t('hbk.arch.pi'), t('hbk.arch.pi.d'));
    box(620, 20, 230, 110, t('hbk.arch.gh'), t('hbk.arch.gh.d'));
    box(620, 170, 230, 110, t('hbk.arch.page'), t('hbk.arch.page.d'));
    box(315, 170, 230, 110, t('hbk.arch.mac'), t('hbk.arch.mac.d'));
    arrow(240, 75, 315, 75, t('hbk.arch.a1')); arrow(545, 75, 620, 75, t('hbk.arch.a2')); arrow(735, 130, 735, 170, ''); arrow(240, 110, 315, 200, t('hbk.arch.a3'));
    return s;
  }

  async function build() {
    await I18N.ready;
    const [H, PI, SRC, ST, NB] = await Promise.all([get('data/handbook.json'), get('data/pi_stack.json'), get('data/sources.json'), get('data/status.json').catch(() => ({})), get('notebook.json').catch(() => ({ entries: [] }))]);
    $('hb-build').textContent = t('hbk.build', { b: H.build, at: H.built_at });
    document.title = 'wal.funk_891 · ' + t('hbk.title');
    const main = $('hb'), toc = $('toc');
    const head = el('header'); head.append(el('h1', '', t('hbk.title')), el('p', 'lede', t('hbk.lede')), el('p', 'meta', t('hbk.auto')));
    main.append(head);
    const sections = [];
    const sec = (id, n) => { const s = el('section'); s.id = id; const h = el('h2'); h.append(el('small', '', t('hbk.ch', { n })), document.createTextNode(t(`hbk.${id}.t`))); s.append(h); sections.push(s); return s; };

    let s = sec('overview', 1); paras(s, ['hbk.overview.p1', 'hbk.overview.p2', 'hbk.overview.p3']);
    s = sec('arch', 2); paras(s, ['hbk.arch.p1']); const dg = el('div', 'diagram'); dg.append(diagram()); s.append(dg); paras(s, ['hbk.arch.p2', 'hbk.arch.p3']);
    s = sec('stack', 3); paras(s, ['hbk.stack.p1']);
    s.append(el('h3', '', t('hbk.stack.page')));
    s.append(table([t('hbk.col.part'), t('hbk.col.what')], [
      ['HTML + CSS', t('hbk.stack.html', { n: num(H.html_lines) })],
      ['JavaScript', t('hbk.stack.js', { files: H.own_js.length, n: num(H.own_js_lines) })],
      ...H.libs.map(([n, v, host]) => [`${n} ${v}`, t(`hbk.lib.${n.split(' ')[0].replace('.js', '')}`) + ` (${host})`]),
      [t('hbk.stack.fonts'), H.fonts.map((f) => f.replace(/\+/g, ' ')).join(', ') + ' (Google Fonts)'],
      [t('hbk.stack.i18n'), t('hbk.stack.i18n.d', { n: num(H.i18n_keys.en) })],
      [t('hbk.stack.host'), t('hbk.stack.host.d')],
    ]));
    s.append(el('h3', '', t('hbk.stack.pi')));
    s.append(table([t('hbk.col.part'), t('hbk.col.what')], [
      [t('hbk.stack.hw'), t('hbk.pi.hw')], [t('hbk.stack.os'), t('hbk.pi.os')], ['Python', `${PI.python} · uv, uv.lock`],
      [t('hbk.stack.code'), t('hbk.stack.code.d', { files: PI.scripts, n: num(PI.script_lines) })],
      ...Object.entries(PI.packages).map(([k, v]) => [`${k} ${v}`, t(`hbk.pkg.${k}`)]),
    ]));
    s.append(el('h3', '', t('hbk.stack.models')));
    s.append(table([t('hbk.col.model'), t('hbk.col.from'), t('hbk.col.use')], ['perch', 'hump', 'whalu', 'orca'].map((k) => [t(`hbk.model.${k}.n`), t(`hbk.model.${k}.f`), t(`hbk.model.${k}.u`)])));
    s.append(el('h3', '', t('hbk.stack.own')));
    s.append(table([t('hbk.col.file'), t('hbk.col.lines')], H.own_js.map(([f, n]) => [f, num(n)])));

    s = sec('data', 4); paras(s, ['hbk.data.p1']);
    s.append(table([t('hbk.col.source'), t('hbk.col.licence'), t('hbk.col.use')], SRC.sources.map(([n, u, l, use]) => [link(n, u), l.startsWith('@') ? t('hbk.lic.' + l.slice(1)) : l, t('hbk.use.' + use)])));
    s.append(el('p', 'meta', t('hbk.data.files', { n: H.data_files.length, size: kb(H.data_bytes) })));

    s = sec('tests', 5); paras(s, ['hbk.tests.p1']);
    const ids = { 'Hardware audit': 'audit', 'Environment': 'env', 'Correctness (whalu model)': 'test_whalu', 'Correctness (Perch 2.0)': 'test_perch', 'Benchmark, one MBARI day': 'bench', 'whalu on human-labelled blue and fin calls (DCLDE)': 'dclde', 'Sampling gate without cooler': 'gate4c', 'MBARI call index, blue and fin': 'ci', 'Unattended design': 'design', 'Seven-day trial': 'trial', 'Science layer': 'science' };
    s.append(table([t('hbk.col.step'), t('hbk.col.test'), t('hbk.col.result'), t('hbk.col.status')], (ST.steps || []).map((r) => { const id = ids[r.name]; const p = el('span', 'pill ' + r.status, t(`status.${r.status}`));
      return [r.step, id ? t(`step.${id}`) : r.name, id && I18N.t(`step.${id}.r`) !== `step.${id}.r` ? t(`step.${id}.r`) : r.result, p]; })));
    s.append(el('h3', '', t('hbk.tests.nb')));
    s.append(table([t('hbk.col.date'), t('hbk.col.entry'), t('hbk.col.status')], NB.entries.map((e) => [e.date, t(`nb.${e.id}.t`), el('span', 'pill ' + e.status, t(`nb.status.${e.status}`))])));

    s = sec('ops', 6); paras(s, ['hbk.ops.p1']);
    s.append(table([t('hbk.col.service'), t('hbk.col.what')], [['whale-sampler.timer', t('hbk.svc.sampler')], ['whale-push.timer', t('hbk.svc.push')], ['whale-health.service', t('hbk.svc.health')]]));
    paras(s, ['hbk.ops.p2', 'hbk.ops.p3', 'hbk.ops.p4']);

    s = sec('use', 7); paras(s, ['hbk.use.p1']);
    s.append(table([t('hbk.col.chapter'), t('hbk.col.what')], ['dive', 'whales', 'places', 'listen', 'results', 'machine'].map((k) => [t(k === 'listen' ? 'nav.hear' : `nav.${k}`), t(`start.${k}`)])));
    paras(s, ['hbk.use.p2', 'hbk.use.p3']);

    // the page in pictures: screenshots in the reader's language, taken by tools/screenshots.py
    s = sec('screens', 8); paras(s, ['hbk.screens.p1']);
    const SC = await get('data/screens.json').catch(() => null);
    if (SC) {
      const grid = el('div', 'shots'), L = I18N.lang;
      SC.views.forEach((v) => { const sh = SC.shots.find((x) => x.view === v && x.lang === L) || SC.shots.find((x) => x.view === v && x.lang === 'en'); if (!sh) return;
        const f = el('figure', 'shot'), a = el('a'); a.href = sh.file; a.target = '_blank'; a.rel = 'noopener'; const im = el('img'); im.src = sh.file + '?v=' + H.build; im.alt = t(`hbk.scr.${v}`); im.loading = 'lazy'; im.width = sh.w; im.height = sh.h; a.append(im);
        f.append(a, el('figcaption', '', t(`hbk.scr.${v}`))); grid.append(f); });
      s.append(grid, el('p', 'meta', t('hbk.screens.at', { at: SC.taken_at })));
    }
    paras(s, ['hbk.crowd.p1', 'hbk.crowd.p2']);

    s = sec('words', 9);
    const W = ['hydrophone', 'spectrogram', 'window', 'embedding', 'classifier', 'threshold', 'ba', 'gate', 'throttling', 'candidate'];
    s.append(table([t('hbk.col.term'), t('hbk.col.meaning')], W.map((k) => [t(`w.${k}`), t(`w.${k}.d`)])));

    s = sec('limits', 10); paras(s, ['hbk.limits.p1', 'hbk.limits.p2', 'hbk.limits.p3']);

    s = sec('version', 11);
    s.append(table([t('hbk.col.part'), t('hbk.col.what')], [[t('hbk.v.build'), H.build], [t('hbk.v.at'), H.built_at], [t('hbk.v.species'), t('hbk.v.species.d', { n: H.species_total, st: H.species_at_stations, c: H.species_with_clips })],
      [t('hbk.v.keys'), `en ${H.i18n_keys.en} · de ${H.i18n_keys.de} · zh ${H.i18n_keys.zh}`], [t('hbk.v.repo'), link('github.com/recurrentanalytics/wal.funk_891', 'https://github.com/recurrentanalytics/wal.funk_891')]]));

    sections.forEach((x, i) => {
      main.append(x);
      const a = el('a', '', `${i + 1}. ${t(`hbk.${x.id}.t`)}`); a.href = '#' + x.id; toc.append(a);
      const pg = el('div', 'pager');
      if (sections[i - 1]) { const p = el('a', '', '← ' + t(`hbk.${sections[i - 1].id}.t`)); p.href = '#' + sections[i - 1].id; pg.append(p); } else pg.append(el('span'));
      if (sections[i + 1]) { const n2 = el('a', '', t(`hbk.${sections[i + 1].id}.t`) + ' →'); n2.href = '#' + sections[i + 1].id; pg.append(n2); }
      x.append(pg);
    });
    const links = [...toc.querySelectorAll('a')];
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
    sections.forEach((x) => io.observe(x));
    $('hb-print').addEventListener('click', () => window.print());
    if (location.hash.length > 1) { const tg = document.getElementById(location.hash.slice(1)); if (tg) tg.scrollIntoView(); }
  }
  build();
})();
