/* "Right now": when people on Orcasound have reported whales in the last 90 minutes, a slim banner says so, with a button
   that opens the live player on that hydrophone. Checked every 2 minutes; dismissed reports stay dismissed. */
(function () {
  const API = 'https://live.orcasound.net/api/json/detections?page%5Blimit%5D=40&include=feed&sort=-timestamp&filter%5Bcategory%5D=whale';
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const bar = el('div', 'nowbar'); bar.hidden = true; bar.setAttribute('role', 'status');
  const dot = el('i', 'nb-dot'), txt = el('span', 'nb-t'), go = el('button', 'nb-go'), x = el('button', 'nb-x', '×'); go.type = x.type = 'button';
  bar.append(dot, txt, go, x);
  let current = null; const seen = () => { try { return localStorage.getItem('wl-now-dismissed') || ''; } catch (e) { return ''; } };
  x.setAttribute('aria-label', 'close');
  x.addEventListener('click', () => { bar.hidden = true; try { localStorage.setItem('wl-now-dismissed', current ? current.id : ''); } catch (e) {} });
  go.addEventListener('click', () => {
    if (!current) return; const card = document.getElementById('live-card');
    if (card) { if (window.wlReveal) wlReveal(card); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    setTimeout(() => { if (window.wlLive) wlLive(current.node); }, 600);
  });
  async function check() {
    try {
      const d = await (await fetch(API, { cache: 'no-store' })).json();
      const feeds = Object.fromEntries((d.included || []).map((f) => [f.id, f.attributes]));
      const hit = d.data.find((r) => r.attributes.source === 'human' && Date.now() - new Date(r.attributes.timestamp) < 90 * 60e3);
      if (!hit) { bar.hidden = true; current = null; return; }
      const f = feeds[hit.relationships.feed.data.id] || {}, min = Math.max(1, Math.round((Date.now() - new Date(hit.attributes.timestamp)) / 60e3));
      const orca = /orca|srkw|killer|\b[jkl] ?pod|resident|transient|bigg/i.test(hit.attributes.description || '');
      current = { id: hit.id, node: f.node_name };
      if (seen() === hit.id) return;
      txt.textContent = t(orca ? 'now.orca' : 'now.whale', { min, place: f.name || '' }); go.textContent = t('now.listen');
      bar.hidden = false;
    } catch (e) { /* offline or API down: say nothing */ }
  }
  I18N.ready.then(() => { const toc = document.querySelector('.toc'); (toc ? toc.after(bar) : document.body.prepend(bar)); check(); setInterval(check, 120000); });
})();
