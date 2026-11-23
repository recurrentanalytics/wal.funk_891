/* Usability: resume where you were, glossary tooltips, a thumb bar on phones, "where am I" in the top bar, one settings
   menu, a link to every section, keyboard shortcuts, loading placeholders and a skip link. No new content. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const typing = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || (document.activeElement || {}).isContentEditable;
  let toastT; const toast = (msg) => { let b = document.querySelector('.wl-toast'); if (!b) { b = el('div', 'wl-toast'); b.setAttribute('role', 'status'); document.body.append(b); } b.textContent = msg; b.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => b.classList.remove('on'), 2200); };
  const goTo = (target) => { if (!target) return; if (window.wlReveal) wlReveal(target); if (target.tagName === 'DETAILS') target.open = true; scrollTo({ top: target.getBoundingClientRect().top + scrollY - 70, behavior: 'smooth' }); };
  const chapters = () => [...document.querySelectorAll('.toc .wrap a[data-view]')];
  const chapterTargets = () => chapters().map((a) => document.querySelector(a.getAttribute('href')));

  /* 9. skip link and visible focus (CSS); runs at once so it is the first thing a keyboard reaches */
  const skip = el('a', 'skip-link'); skip.href = '#start'; document.body.prepend(skip);

  I18N.ready.then(() => {
    skip.textContent = t('ux.skip');

    /* 8. loading placeholders where a heavy view starts empty */
    ['map', 'world'].forEach((id) => { const h = $(id); if (h && !h.children.length) { const m = el('div', 'scene-msg', t('ui.loading')); h.append(m);
      new MutationObserver((_, o) => { if (h.querySelector('canvas, svg, .leaflet-pane, img')) { m.remove(); o.disconnect(); } }).observe(h, { childList: true, subtree: true }); } });

    /* 5. one settings menu: language, background sound, less motion, text size */
    const prefs = store.get('wl-prefs', { motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'less' : 'full', size: 'm' });
    const applyPrefs = () => { document.documentElement.classList.toggle('less-motion', prefs.motion === 'less'); document.documentElement.dataset.size = prefs.size; window.wlLessMotion = prefs.motion === 'less'; };
    applyPrefs();
    const set = el('div', 'set-pop'); set.hidden = true; set.setAttribute('role', 'dialog'); set.setAttribute('aria-label', t('ux.set'));
    const row = (label, ...kids) => { const r = el('div', 'set-row'); r.append(el('span', 'set-l', label)); const g = el('div', 'set-g'); g.append(...kids); r.append(g); return r; };
    const opt = (txt, on, fn) => { const b = el('button', 'chip', txt); b.type = 'button'; b.setAttribute('aria-pressed', String(!!on)); b.addEventListener('click', fn); return b; };
    function drawSet() {
      set.replaceChildren(el('b', 'set-h', t('ux.set')));
      set.append(row(t('ux.set.lang'), ...[['en', 'EN'], ['de', 'DE'], ['zh', '中文']].map(([l, n]) => opt(n, I18N.lang === l, () => { const u = new URL(location.href); u.searchParams.set('lang', l); location.href = u.toString(); }))));
      const A = window.wlAmbient && wlAmbient.state();
      if (A) {
        const sel = el('select', 'cat-sel'); sel.setAttribute('aria-label', t('amb.menu.title'));
        sel.append(new Option(t('amb.menu.off'), 'off'), new Option(t('amb.menu.auto'), 'auto'), new Option(t('amb.menu.synth'), 'synth'));
        sel.value = A.on ? A.node : 'off'; if (sel.value !== (A.on ? A.node : 'off')) { sel.append(new Option(A.name || A.node.replace(/^rpi_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), A.node)); sel.value = A.node; }
        sel.addEventListener('change', () => { if (sel.value === 'off') wlAmbient.set(false); else wlAmbient.setNode(sel.value); });
        set.append(row(t('amb.menu.title'), sel));
      }
      set.append(row(t('ux.set.motion'), opt(t('ux.set.full'), prefs.motion === 'full', () => { prefs.motion = 'full'; store.set('wl-prefs', prefs); applyPrefs(); drawSet(); }), opt(t('ux.set.less'), prefs.motion === 'less', () => { prefs.motion = 'less'; store.set('wl-prefs', prefs); applyPrefs(); drawSet(); })));
      set.append(row(t('ux.set.size'), ...[['s', 'A−'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']].map(([k, n]) => opt(n, prefs.size === k, () => { prefs.size = k; store.set('wl-prefs', prefs); applyPrefs(); drawSet(); }))));
      set.append(el('p', 'set-n', t('ux.set.note')));
    }
    const setBtn = el('button', 'tool-b'); setBtn.type = 'button'; setBtn.append(el('span', '', '⚙'), el('em', '', t('ux.set'))); setBtn.setAttribute('aria-label', t('ux.set')); setBtn.title = t('ux.set');
    setBtn.addEventListener('click', (e) => { e.stopPropagation(); if (!set.hidden) { set.hidden = true; return; } drawSet(); const r = setBtn.getBoundingClientRect(); set.style.top = (r.bottom + 6) + 'px'; set.style.right = Math.max(8, innerWidth - r.right) + 'px'; set.hidden = false; });
    document.addEventListener('click', (e) => { if (!set.hidden && !set.contains(e.target)) set.hidden = true; });
    document.body.append(set);
    const tools = () => document.querySelector('.toc .tools');
    (function addSet() { const g = tools(); if (g) g.append(setBtn); else setTimeout(addSet, 300); })();

    /* 7. keyboard shortcuts and their overview (?) */
    const help = el('div', 'kbd-pop'); help.hidden = true; help.setAttribute('role', 'dialog');
    const keys = [['/', 'ux.k.search'], ['J', 'ux.k.next'], ['K', 'ux.k.prev'], ['M', 'ux.k.sound'], ['T', 'ux.k.top'], ['?', 'ux.k.help'], ['Esc', 'ux.k.close']];
    help.append(el('b', 'set-h', t('ux.k.title'))); const dl = el('dl'); keys.forEach(([k, d]) => { dl.append(el('dt', '', k), el('dd', '', t(d))); }); help.append(dl); document.body.append(help);
    const step = (dir) => { const T = chapterTargets().filter(Boolean); const y = scrollY + 90; let i = T.findIndex((x) => x.getBoundingClientRect().top + scrollY > y); if (i < 0) i = T.length;
      const target = dir > 0 ? T[i] : T[Math.max(0, i - 2)]; if (target) scrollTo({ top: target.getBoundingClientRect().top + scrollY - 50, behavior: 'smooth' }); };
    addEventListener('keydown', (e) => {
      if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { help.hidden = !help.hidden; e.preventDefault(); }
      else if (e.key === 'Escape') { help.hidden = true; set.hidden = true; }
      else if (e.key === 'j' || e.key === 'J') step(1);
      else if (e.key === 'k' || e.key === 'K') step(-1);
      else if ((e.key === 'm' || e.key === 'M') && window.wlAmbient) { const s = wlAmbient.state(); wlAmbient.set(!s.on); toast(t(s.on ? 'ux.k.soundoff' : 'ux.k.soundon')); }
      else if (e.key === 't' || e.key === 'T') scrollTo({ top: 0, behavior: 'smooth' });
    });
    help.addEventListener('click', () => { help.hidden = true; });

    setTimeout(() => {
      /* 6. a link to every section: ids for the folds, a small 🔗 on hover */
      const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      document.querySelectorAll('details.sec-fold').forEach((d) => { if (!d.id) { const tt = d.querySelector('.sf-t'); const s = 'sf-' + slug(tt ? tt.textContent : 'x'); d.id = document.getElementById(s) ? s + '-2' : s; } });
      document.querySelectorAll('main section[id] > .wrap > h2, details.sec-fold > summary, .cat-head h3').forEach((h) => {
        const host = h.closest('details.sec-fold') || h.closest('.catalog') || h.closest('section[id]'); if (!host || !host.id) return;
        const b = el('button', 'anchor-b');   // the icon is CSS, so headings' text stays clean for search and menus b.type = 'button'; b.title = t('ux.anchor'); b.setAttribute('aria-label', t('ux.anchor'));
        b.addEventListener('click', async (e) => { e.preventDefault(); e.stopPropagation(); const u = new URL(location.href); u.hash = host.id; ['sp', 'rsp', 'rm', 'dive'].forEach((k) => u.searchParams.delete(k));
          try { await navigator.clipboard.writeText(u.toString()); toast(t('ux.anchor.ok')); } catch (err) { prompt(t('share.copy'), u.toString()); } });
        h.append(b);
      });

      /* 2. glossary terms explained in place: first use per section, on hover, focus or tap */
      const T2 = ['hydrophone', 'spectrogram', 'embedding', 'classifier', 'ba', 'gate', 'throttling', 'candidate'].map((k) => ({ k, w: t('w.' + k), d: t('w.' + k + '.d') })).filter((x) => x.w && x.d);
      const tip = el('div', 'gl-tip'); tip.hidden = true; tip.setAttribute('role', 'tooltip'); document.body.append(tip);
      const showTip = (a) => { tip.replaceChildren(el('b', '', a.textContent), el('span', '', a.dataset.d)); const r = a.getBoundingClientRect(); tip.hidden = false;
        tip.style.left = Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, r.left)) + 'px'; tip.style.top = (r.bottom + 6 + tip.offsetHeight > innerHeight ? r.top - tip.offsetHeight - 6 : r.bottom + 6) + 'px'; };
      document.querySelectorAll('main section[id]').forEach((sec) => {
        const used = new Set();
        const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: (n) => { const p = n.parentElement; if (!p || p.closest('h1,h2,h3,summary,button,a,abbr,svg,canvas,input,select,textarea,.gloss,.toc,.lineup,.all-sp,.rb-row,code,figcaption,.kicker')) return NodeFilter.FILTER_REJECT; return n.nodeValue.trim().length > 20 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
        const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((n) => {
          for (const g of T2) {
            if (used.has(g.k)) continue;
            const i = n.nodeValue.toLowerCase().indexOf(g.w.toLowerCase()); if (i < 0) continue;
            const pre = n.nodeValue[i - 1], post = n.nodeValue[i + g.w.length]; if ((pre && /[\p{L}]/u.test(pre)) || (post && /[\p{L}]/u.test(post) && I18N.lang !== 'de' && I18N.lang !== 'zh')) continue;
            const rest = n.splitText(i); rest.splitText(g.w.length); const a = el('abbr', 'gl', rest.nodeValue); a.dataset.d = g.d; a.tabIndex = 0; rest.replaceWith(a); used.add(g.k);
            ['mouseenter', 'focus'].forEach((ev) => a.addEventListener(ev, () => showTip(a))); ['mouseleave', 'blur'].forEach((ev) => a.addEventListener(ev, () => { tip.hidden = true; }));
            a.addEventListener('click', (e) => { e.stopPropagation(); if (tip.hidden) showTip(a); else tip.hidden = true; });
            break;
          }
        });
      });
      document.addEventListener('click', () => { tip.hidden = true; }); addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
    }, 2500);

    /* 4. where am I: the current block's title next to the active chapter */
    let tick = false;
    const crumb = () => { tick = false; const a = document.querySelector('.toc .wrap a.active'); if (!a) return; const y = 120; let cur = null;
      document.querySelectorAll('details.sec-fold, .catalog').forEach((d) => { const r = d.getBoundingClientRect(); if (r.top < y && r.bottom > y) cur = d; });
      const tt = cur ? (cur.querySelector('.sf-t') || cur.querySelector('.cat-head h3')) : null; const txt = tt ? tt.textContent.trim() : '';
      chapters().forEach((x) => { if (x !== a) delete x.dataset.sub; }); if (txt) a.dataset.sub = txt.length > 34 ? txt.slice(0, 32) + '…' : txt; else delete a.dataset.sub;
      if (bb) bb.querySelector('.bb-t').textContent = a.textContent + (txt ? ' › ' + (txt.length > 28 ? txt.slice(0, 26) + '…' : txt) : ''); };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(crumb); } }, { passive: true });

    /* 3. thumb bar on phones: previous / chapter list / next / search */
    let bb = null;
    if (matchMedia('(max-width: 760px)').matches) {
      bb = el('nav', 'bottombar'); bb.setAttribute('aria-label', t('ux.bb'));
      const prev = el('button', 'bb-b', '‹'), mid = el('button', 'bb-m'), next = el('button', 'bb-b', '›'), find = el('button', 'bb-b', '⌕');
      [prev, mid, next, find].forEach((b) => { b.type = 'button'; }); prev.setAttribute('aria-label', t('ux.k.prev')); next.setAttribute('aria-label', t('ux.k.next')); find.setAttribute('aria-label', t('srch.btn'));
      mid.append(el('span', 'bb-t', '')); bb.append(prev, mid, next, find); document.body.append(bb); document.body.classList.add('has-bb');
      prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
      find.addEventListener('click', () => { const s = document.querySelector('.tool-b'); if (s) s.click(); });
      const sheet = el('div', 'bb-sheet'); sheet.hidden = true; document.body.append(sheet);
      mid.addEventListener('click', (e) => { e.stopPropagation(); if (!sheet.hidden) { sheet.hidden = true; return; } sheet.replaceChildren(); chapters().forEach((a) => { const b = el('button', 'sn-i' + (a.classList.contains('active') ? ' on' : ''), a.textContent); b.type = 'button'; b.addEventListener('click', () => { sheet.hidden = true; goTo(document.querySelector(a.getAttribute('href'))); }); sheet.append(b); }); sheet.hidden = false; });
      document.addEventListener('click', (e) => { if (!sheet.hidden && !sheet.contains(e.target)) sheet.hidden = true; });
      crumb();
    }

    /* 1. resume where you were */
    const last = store.get('wl-last', null), fresh = !location.hash && !/[?&](sp|rsp|rm|dive)=/.test(location.search);
    let saveT = 0; addEventListener('scroll', () => { clearTimeout(saveT); saveT = setTimeout(() => { let id = null; document.querySelectorAll('main section[id], details.sec-fold[id], .catalog').forEach((s) => { if (s.getBoundingClientRect().top < 140) id = s.id; }); if (id && scrollY > 800) store.set('wl-last', { id, at: Date.now() }); }, 800); }, { passive: true });
    if (fresh && last && last.id && Date.now() - last.at < 30 * 864e5) setTimeout(() => {
      const target = $(last.id); if (!target || scrollY > 400) return;
      const h = target.querySelector('.sf-t, h2, h3'); const bar = el('div', 'resume'); const go = el('button', 'resume-go', t('ux.resume', { x: h ? h.textContent.trim().slice(0, 60) : '' })), x = el('button', 'resume-x', '×');
      go.type = x.type = 'button'; x.setAttribute('aria-label', t('gp.close')); bar.append(go, x); document.body.append(bar);
      go.addEventListener('click', () => { bar.remove(); goTo(target); }); x.addEventListener('click', () => { bar.remove(); store.set('wl-last', null); });
      setTimeout(() => bar.classList.add('fade'), 14000); setTimeout(() => bar.remove(), 15000);
    }, 2600);
  });
})();
