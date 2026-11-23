/* Tabs: the page's sections are grouped into views; only one view is shown. Old links (#whales, #finds, any element id)
   still work: they open the view that contains the target and scroll to it. Hidden views stop their animations
   (their IntersectionObservers see nothing) and get a resize when shown, so canvases and 3D scenes size correctly. */
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
  const sec = (id) => document.getElementById(id);
  const viewOf = (el) => {
    for (let n = el; n; n = n.parentElement) { const v = VIEWS.find((v) => v.sec.includes(n.id)); if (v) return v; }
    return null;
  };
  let current = null;
  const poke = () => [0, 120, 400].forEach((ms) => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  function show(v, target) {
    if (current !== v) {
      VIEWS.forEach((w) => w.sec.forEach((id) => { const s = sec(id); if (s) s.hidden = w !== v; }));
      document.querySelectorAll('.toc a[data-view]').forEach((a) => { const on = a.dataset.view === v.id; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      document.body.dataset.view = v.id; current = v; poke();
      const a = document.querySelector(`.toc a[data-view="${v.id}"]`); if (a) a.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    const top = !target || v.sec.includes(target.id) && target === sec(v.sec[0]);
    requestAnimationFrame(() => { if (top) scrollTo({ top: 0 }); else target.scrollIntoView({ block: 'start' }); });
  }
  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    const v = (target && viewOf(target)) || VIEWS.find((w) => w.id === id) || VIEWS[0];
    show(v, target && target !== document.getElementById(v.sec[0]) ? target : null);
  }
  function build() {
    const nav = document.querySelector('.toc .wrap'); if (!nav) return;
    nav.replaceChildren(...VIEWS.map((v) => { const a = document.createElement('a'); a.href = '#' + (v.id === 'start' ? 'top' : v.sec[0]); a.dataset.view = v.id; a.textContent = t(v.key); return a; }));
    // start page teasers: one card per view
    const grid = document.getElementById('start-grid');
    if (grid) grid.replaceChildren(...VIEWS.slice(1).map((v) => {
      const a = document.createElement('a'); a.className = 'start-card'; a.href = '#' + v.sec[0];
      const b = document.createElement('b'); b.textContent = t(v.key); const p = document.createElement('span'); p.textContent = t(`start.${v.id}`);
      const go = document.createElement('i'); go.textContent = '→'; a.append(b, p, go); return a;
    }));
    addEventListener('hashchange', route); route();
  }
  I18N.ready.then(build);
})();
