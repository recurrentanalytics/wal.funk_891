/* Chapters: one continuous page again, with orientation. The sections are grouped into chapters; each chapter opens with
   a chapter card, the bar at the top shows the current chapter with a progress line and jumps on click, every chapter ends
   with previous/next. Long reference blocks start folded. Old links (#whales, any element id) keep working. */
(function () {
  const VIEWS = [
    { id: 'start', key: 'nav.start', sec: ['top', 'start'] },
    { id: 'dive', key: 'nav.dive', sec: ['dive'] },
    { id: 'whales', key: 'nav.whales', sec: ['whales'] },
    { id: 'places', key: 'nav.places', sec: ['places'] },
    { id: 'listen', key: 'nav.hear', sec: ['listen', 'try'] },
    { id: 'results', key: 'nav.results', sec: ['results', 'finds', 'notebook'] },
    { id: 'machine', key: 'nav.machine', sec: ['machine', 'words'] },
  ];
  // blocks that start folded: [element id, summary key]
  const FOLD = [['gates', 'fold.gates'], ['nb', 'fold.nb'], ['gloss', 'fold.words'], ['world-notes', 'fold.world', ['world-list']]];
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const href = (v) => '#' + (v.id === 'start' ? 'top' : 'ch-' + v.id);

  function fold() {
    FOLD.forEach(([id, key, more]) => {
      const el = $(id) || document.querySelector('.' + id); if (!el || el.closest('details')) return;
      const d = mk('details', 'fold'); const s = mk('summary', '', t(key)); d.append(s);
      const prev = el.previousElementSibling; el.before(d);
      if (prev && prev.matches('h3.sub-h, h3.scene-title')) d.prepend(s), s.textContent = prev.textContent + ' · ' + t('fold.open'), prev.remove();
      d.append(el); (more || []).forEach((m) => { const x = $(m); if (x) d.append(x); });
    });
  }
  function openTarget() {
    const id = decodeURIComponent(location.hash.slice(1)); const el = id && $(id); if (!el) return;
    const d = el.closest('details'); if (d && !d.open) { d.open = true; requestAnimationFrame(() => el.scrollIntoView({ block: 'start' })); }
  }
  function build() {
    const nav = document.querySelector('.toc .wrap'); if (!nav) return;
    const links = VIEWS.map((v) => { const a = mk('a', '', t(v.key)); a.href = href(v); a.dataset.view = v.id; return a; });
    nav.replaceChildren(...links);
    // chapter cards in front of every chapter but the start
    VIEWS.slice(1).forEach((v, i) => {
      const first = $(v.sec[0]); if (!first) return;
      const card = mk('section', 'chapter'); card.id = 'ch-' + v.id;
      const w = mk('div', 'wrap'); w.append(mk('span', 'ch-n', t('ch.n', { n: i + 1, of: VIEWS.length - 1 })), mk('h2', 'ch-t', t(v.key)), mk('p', 'ch-d', t(`start.${v.id}`)));
      card.append(w); first.before(card); v.first = card;
    });
    // big photos and wireframe whales behind the chapter titles
    fetch('data/chapter_media.json?v=' + ((document.querySelector('meta[name=build]') || {}).content || '')).then((r) => r.json()).then((M) => VIEWS.slice(1).forEach((v) => {
      const m = M[v.id], card = $('ch-' + v.id); if (!m || !card) return;
      if (m.photo) {
        card.classList.add('has-photo'); const bg = mk('div', 'ch-bg'); bg.style.backgroundImage = `url("${m.photo.src}")`; card.prepend(bg);
        const cr = mk('a', 'ch-credit', `${t('whales.photo')} ${m.photo.by} · ${m.photo.lic}${m.cap ? ' · ' + t('chph.' + m.cap) : ''}`); cr.href = m.photo.page; cr.rel = 'noopener'; card.append(cr);
      } else if ((m.hb != null || m.wire) && window.humpbackScene) {
        card.classList.add('has-wire', 'has-hb'); const host = mk('div', 'ch-wire'); card.prepend(host); requestAnimationFrame(() => window.humpbackScene(host, m.hb || 0));
        const cr = mk('span', 'ch-credit', t('hb.note')); card.append(cr);
      }
    })).catch(() => {});
    VIEWS[0].first = $('top');
    // previous / next at the end of every chapter
    VIEWS.forEach((v, i) => {
      const last = $(v.sec[v.sec.length - 1]); if (!last) return;
      const n = mk('nav', 'view-nav'); n.setAttribute('aria-label', t('nav.pager')); const w = mk('div', 'wrap');
      const link = (x, dir) => {
        if (!x) { w.append(mk('span')); return; }
        const a = mk('a', 'vn ' + dir); a.href = href(x);
        a.append(mk('small', '', t(dir === 'prev' ? 'nav.prev' : 'nav.next')), mk('b', '', (dir === 'prev' ? '← ' : '') + t(x.key) + (dir === 'next' ? ' →' : '')));
        w.append(a);
      };
      link(VIEWS[i - 1], 'prev'); link(VIEWS[i + 1], 'next'); n.append(w); last.after(n); v.end = n;
    });
    // start page cards jump to the chapter cards
    const grid = $('start-grid');
    if (grid) grid.replaceChildren(...VIEWS.slice(1).map((v) => {
      const a = mk('a', 'start-card'); a.href = href(v); a.append(mk('b', '', t(v.key)), mk('span', '', t(`start.${v.id}`)), mk('i', '', '→')); return a;
    }));
    if (grid) { const a = mk('a', 'start-card hb-card'); a.href = 'handbook.html?lang=' + I18N.lang; a.append(mk('b', '', t('hbk.title')), mk('span', '', t('start.handbook')), mk('i', '', '↗')); grid.append(a); }
    fold();
    // current chapter + progress line in the bar
    let cur = null, ticking = false;
    const update = () => {
      ticking = false; const y = scrollY + innerHeight * .35;
      let v = VIEWS[0];
      VIEWS.forEach((w) => { if (w.first && w.first.getBoundingClientRect().top + scrollY <= y) v = w; });
      const top = v.first.getBoundingClientRect().top + scrollY, end = (v.end || v.first).getBoundingClientRect().bottom + scrollY;
      const p = Math.max(0, Math.min(1, (scrollY + innerHeight * .5 - top) / Math.max(1, end - top)));
      if (cur !== v) {
        links.forEach((a) => { const on = a.dataset.view === v.id; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        const a = links.find((x) => x.dataset.view === v.id); if (a) a.scrollIntoView({ block: 'nearest', inline: 'center' });
        cur = v; document.body.dataset.view = v.id;
      }
      const a = links.find((x) => x.dataset.view === v.id); if (a) a.style.setProperty('--p', p.toFixed(3));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update); addEventListener('hashchange', openTarget);
    openTarget(); update();
    // the page was rebuilt after load: honour a hash that pointed somewhere further down
    if (location.hash.length > 1) { const el = $(decodeURIComponent(location.hash.slice(1))); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 60); }
  }
  I18N.ready.then(build);
})();
