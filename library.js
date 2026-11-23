/* The library page: every work the project cites (data/library.json, built by library/library.py from
   library/references.yml), filterable by topic and searchable, with BibTeX and Zotero (RDF) downloads. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const B = (document.querySelector('meta[name="build"]') || {}).content || '';
  I18N.ready.then(async () => {
    const D = await (await fetch('data/library.json?v=' + B)).json();
    document.title = 'wal.funk_891 · ' + t('lib.title');
    const main = $('hb'), toc = $('toc'); let topic = '';
    $('hb-build').textContent = t('lib.built', { n: D.refs.length, at: D.built });
    const head = el('header'); head.append(el('h1', '', t('lib.title')), el('p', 'lede', t('lib.lede')));
    const dl = el('p', 'lib-dl'); [['library/wal.funk_891.rdf', 'lib.zotero'], ['library/references.bib', 'lib.bib']].forEach(([u, k]) => { const a = el('a', '', t(k)); a.href = u + '?v=' + B; a.download = ''; dl.append(a); });
    head.append(dl, el('p', 'meta', t('lib.howto')));
    const bar = el('div', 'lib-bar'), q = el('input'); q.type = 'search'; q.placeholder = t('lib.search'); bar.append(q);
    const all = el('button', 'chip', t('lib.all')); all.type = 'button'; all.setAttribute('aria-pressed', 'true'); bar.append(all);
    const chips = Object.entries(D.topics).map(([k, v]) => { const b = el('button', 'chip', v); b.type = 'button'; b.dataset.k = k; b.setAttribute('aria-pressed', 'false'); bar.append(b); return b; });
    const list = el('div'), count = el('p', 'meta'); main.append(head, bar, count, list);
    const pageName = (p) => ({ start: t('nav.start'), dive: t('nav.dive'), whales: t('nav.whales'), places: t('nav.places'), listen: t('nav.hear'), results: t('nav.results'), machine: t('nav.machine'),
      paper: t('srch.paper'), handbook: t('srch.handbook'), game: t('res.game.link'), docs: t('lib.docs') })[p] || p;
    const pageHref = (p) => ({ paper: 'paper.html', handbook: 'handbook.html', game: 'label.html', docs: 'https://github.com/recurrentanalytics/wal.funk_891/tree/main/docs' })[p] || 'index.html#' + p;
    function render() {
      const s = q.value.trim().toLowerCase(); list.replaceChildren(); let n = 0;
      D.refs.filter((r) => (!topic || r.topics.includes(topic)) && (!s || JSON.stringify(r).toLowerCase().includes(s)))
        .sort((a, b) => (a.creators && a.creators[0] || a.title).localeCompare(b.creators && b.creators[0] || b.title)).forEach((r) => {
          n++; const d = el('div', 'ref'); const au = (r.creators || []).slice(0, 3).join('; ') + ((r.creators || []).length > 3 ? ' et al.' : '');
          d.append(el('div', 'au', `${au} (${r.year})`), el('b', '', r.title));
          const m = el('div', 'meta'); const src = r.journal || r.booktitle || r.publisher || ''; if (src) m.append(src + ' · ');
          const a = el('a', '', r.doi ? 'doi:' + r.doi : r.url); a.href = r.doi ? 'https://doi.org/' + r.doi : r.url; a.rel = 'noopener'; m.append(a);
          if (r.verified) m.append(' · ', el('span', 'ok', t('lib.checked', { by: r.verified.status === 'datacite' ? 'DataCite' : 'Crossref', at: r.verified.checked })));
          const c = el('div', 'cited'); c.append(t('lib.cited') + ' ');
          r.cited_on.forEach((x, i) => { const l = el('a', '', pageName(x.page)); l.href = pageHref(x.page); c.append(l, ` (${x.how})`); if (i < r.cited_on.length - 1) c.append(' · '); });
          d.append(m, c); list.append(d);
        });
      count.textContent = t('lib.count', { n, total: D.refs.length });
    }
    const pick = (k, b) => { topic = k; [all, ...chips].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); };
    all.addEventListener('click', () => pick('', all)); chips.forEach((b) => b.addEventListener('click', () => pick(b.dataset.k, b))); q.addEventListener('input', render);
    Object.entries(D.topics).forEach(([k, v]) => { const a = el('a', '', `${v} (${D.refs.filter((r) => r.topics.includes(k)).length})`); a.href = '#'; a.addEventListener('click', (e) => { e.preventDefault(); pick(k, chips.find((b) => b.dataset.k === k)); }); toc.append(a); });
    render();
  });
})();
