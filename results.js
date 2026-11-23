/* Results board: every pre-registered test on one screen, from data/results.json (the same file the article draft reads).
   Each row: what was measured, on how much data, the value against the mark fixed in advance, the verdict, where it ran. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const SCALE = { ba: [0, 1], recall: [0, 1], rho: [0, 1], fa: [0, 1], speed: [.1, 20, 'log'], temp: [40, 95], peak: [1, 12], crash: [0, 1] };
  const LINK = { s3_whalu: '#scores', s3_perch: '#scores', ci_blue_rho: '#cic', ci_blue_ba: '#cic', ci_blue_peak: '#cic', ci_fin_rho: '#cic', ci_fin_ba: '#cic', ci_fin_peak: '#cic' };
  const fmt = (r) => {
    if (r.value == null) return '—';
    if (r.measure === 'peak') return t('routes.months').split('|')[r.value - 1];
    if (r.measure === 'speed') return `${I18N.num(r.value, 2)}×`;
    if (r.measure === 'temp') return `${I18N.num(r.value, 1)} °C`;
    if (r.measure === 'crash') return r.value ? t('res.ok') : t('res.notok');
    return I18N.num(r.value, r.value < 1 && r.value > 0 ? 3 : 2);
  };
  const markTxt = (r) => r.measure === 'peak' ? t('res.mark.peak') : r.measure === 'crash' ? t('res.mark.crash') : `${r.dir === '<=' ? '≤' : '≥'} ${r.measure === 'speed' ? I18N.num(r.mark, 1) + '×' : r.measure === 'temp' ? I18N.num(r.mark, 0) + ' °C' : I18N.num(r.mark, 2)}`;
  function bar(r) {
    const [lo, hi, kind] = SCALE[r.measure] || [0, 1], pos = (v) => kind === 'log' ? (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) : (v - lo) / (hi - lo);
    const b = el('div', 'rb-bar');
    if (r.measure === 'peak') { const band = el('i', 'rb-band'); band.style.left = (pos(10) * 100) + '%'; band.style.width = ((pos(12) - pos(10)) * 100) + '%'; b.append(band); }
    else if (r.measure !== 'crash') { const m = el('i', 'rb-mark'); m.style.left = Math.max(0, Math.min(1, pos(r.mark))) * 100 + '%'; b.append(m); }
    if (r.value != null) { const v = el('i', 'rb-val ' + r.verdict); v.style.left = Math.max(0, Math.min(1, pos(r.value))) * 100 + '%'; b.append(v); const f = el('i', 'rb-fill ' + r.verdict); f.style.width = Math.max(0, Math.min(1, pos(r.value))) * 100 + '%'; b.append(f); }
    else b.classList.add('wait');
    return b;
  }
  function build(R) {
    const host = $('res-board'); if (!host) return; host.replaceChildren();
    const all = R.groups.flatMap((g) => g.rows), cnt = (v) => all.filter((r) => r.verdict === v).length;
    const kpi = el('div', 'rb-kpi');
    [['pass', cnt('pass')], ['fail', cnt('fail')], ['pending', cnt('pending')], ['mac', all.filter((r) => r.where === 'mac').length]].forEach(([k, n]) => { const c = el('div', 'rb-k ' + k); c.append(el('b', '', String(n)), el('span', '', t('res.kpi.' + k))); kpi.append(c); });
    const paper = el('a', 'rb-paper', t('res.paper')); paper.href = 'paper.html?lang=' + I18N.lang;
    const lab = el('a', 'rb-paper', '🎧 ' + t('res.label.link')); lab.href = 'label.html?mode=owner&lang=' + I18N.lang;
    const game = el('a', 'rb-paper', '🐋 ' + t('res.game.link')); game.href = 'label.html?lang=' + I18N.lang;
    host.append(kpi, paper, game, lab);
    R.groups.forEach((g) => {
      const box = el('div', 'rb-group'); box.append(el('h3', '', t('res.group.' + g.id)), el('p', 'note', t('res.group.' + g.id + '.d')));
      const head = el('div', 'rb-row rb-head'); [t('res.col.test'), t('res.col.value'), t('res.col.mark'), '', t('res.col.verdict')].forEach((x) => head.append(el('span', '', x))); box.append(head);
      g.rows.forEach((r) => {
        const row = el(LINK[r.id] ? 'a' : 'div', 'rb-row'); if (LINK[r.id]) row.href = LINK[r.id];
        const name = el('span', 'rb-name'); name.append(el('b', '', t('res.' + r.id)), el('small', '', `${t('res.m.' + r.measure)} · ${t('res.data.' + r.data)} · n = ${I18N.num(r.n)} · ${t('res.where.' + r.where)}${r.date ? ' · ' + r.date : ''}`));
        row.append(name, el('span', 'rb-v', fmt(r)), el('span', 'rb-m', markTxt(r)), bar(r), el('span', 'pill ' + r.verdict, t('res.v.' + r.verdict)));
        box.append(row);
      });
      host.append(box);
    });
    host.append(el('p', 'note', t('res.board.note', { d: R.updated })));
  }
  I18N.ready.then(() => fetch('data/results.json?v=' + ((document.querySelector('meta[name=build]') || {}).content || '')).then((r) => r.json()).then(build).catch(() => {}));
})();
