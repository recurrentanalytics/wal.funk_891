/* Tools in the top bar: search across everything (Ctrl/Cmd+K or /), a link to the current view, a guided tour,
   and one player bar for every sound on the page. */
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const B = (document.querySelector('meta[name="build"]') || {}).content || '';
  const getJSON = (u) => fetch(u + '?v=' + B).then((r) => r.json());
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const later = (test, fn, ms = 12000) => { const t0 = Date.now(); (function go() { if (test()) fn(); else if (Date.now() - t0 < ms) setTimeout(go, 250); })(); };
  const show = (target) => { if (!target) return; if (window.wlReveal) wlReveal(target); setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); };
  let toastT; const toast = (msg) => { let b = document.querySelector('.wl-toast'); if (!b) { b = el('div', 'wl-toast'); b.setAttribute('role', 'status'); document.body.append(b); } b.textContent = msg; b.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => b.classList.remove('on'), 2200); };

  /* ---------- search ---------- */
  let index = null; const ov = el('div', 'srch'); ov.hidden = true;
  const box = el('div', 'srch-box'), inp = el('input'), list = el('ol', 'srch-list'), hint = el('p', 'srch-hint');
  inp.type = 'search'; inp.autocomplete = 'off'; inp.spellcheck = false; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.append(inp, list, hint); ov.append(box);
  // which chapter an element sits in: the last chapter card before it in the page
  const chapterOf = (e) => { let name = t('nav.start'); document.querySelectorAll('.chapter .ch-t').forEach((h) => { if (h.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) name = h.textContent.trim(); }); return name; };
  async function build() {
    const out = [], ctx = (e) => { const s = e.closest('section[id]'); const h = s && s.querySelector('h2'); return h ? h.textContent.trim() : ''; };
    document.querySelectorAll('main section[id] h2, main h3, main summary, .chapter h2').forEach((h) => {
      const txt = h.textContent.trim(); if (!txt || txt.length > 120) return;
      out.push({ kind: t('srch.k.section'), where: chapterOf(h), title: txt, sub: h.tagName === 'H2' ? '' : ctx(h), go: () => show(h.closest('details') && h.tagName === 'SUMMARY' ? h.closest('details') : h) });
    });
    document.querySelectorAll('.gloss dt').forEach((dt) => out.push({ kind: t('srch.k.term'), where: chapterOf(dt), title: dt.textContent.trim(), sub: (dt.nextElementSibling || {}).textContent || '', go: () => show(dt) }));
    try {
      const S = await getJSON('data/species.json'), L = I18N.lang;
      (S.species || []).forEach((x) => { const nm = (x.name && (x.name[L] || x.name.en)) || x.sci;
        out.push({ kind: t('srch.k.species'), where: t('nav.whales'), title: nm, sub: x.sci, extra: x.name ? Object.values(x.name).join(' ') : '', go: () => { if (window.wlSelectSpecies && wlSelectSpecies(x.sci)) show($('detail')); else show($('whales')); } }); });
    } catch (e) {}
    try {
      const R = await getJSON('data/results.json');
      R.groups.flatMap((g) => g.rows).forEach((r) => out.push({ kind: t('srch.k.test'), where: t('nav.results'), title: t('res.' + r.id), sub: t('res.v.' + r.verdict), go: () => show($('res-board')) }));
    } catch (e) {}
    out.push({ kind: t('srch.k.doc'), title: t('srch.handbook'), sub: 'handbook.html', go: () => { location.href = 'handbook.html' + location.search; } });
    out.push({ kind: t('srch.k.doc'), title: t('srch.paper'), sub: 'paper.html', go: () => { location.href = 'paper.html' + location.search; } });
    out.forEach((o) => { o.n = norm(o.title + ' ' + o.sub + ' ' + (o.extra || '')); o.nt = norm(o.title); });
    return out;
  }
  let hits = [], cur = 0;
  function render() {
    const q = norm(inp.value).trim(), words = q.split(/\s+/).filter(Boolean);
    hits = !words.length ? [] : index.filter((o) => words.every((w) => o.n.includes(w)))
      .map((o) => [o, (o.nt.startsWith(q) ? 0 : o.nt.includes(q) ? 1 : 2)]).sort((a, b) => a[1] - b[1]).slice(0, 30).map((x) => x[0]);
    list.replaceChildren(); cur = 0;
    hits.forEach((o, i) => { const li = el('li'); li.setAttribute('role', 'option'); li.append(el('small', '', o.kind), el('b', '', o.title)); if (o.where) li.append(el('em', 'srch-where', '↳ ' + o.where)); if (o.sub) li.append(el('span', '', o.sub.slice(0, 110)));
      li.addEventListener('click', () => pick(i)); li.addEventListener('mousemove', () => mark(i)); list.append(li); });
    hint.textContent = words.length && !hits.length ? t('srch.none') : t('srch.hint'); mark(0);
  }
  const mark = (i) => { cur = i; [...list.children].forEach((li, k) => li.classList.toggle('on', k === i)); const c = list.children[i]; if (c) c.scrollIntoView({ block: 'nearest' }); };
  const pick = (i) => { const o = hits[i]; if (!o) return; close(); o.go(); };
  async function open() { ov.hidden = false; document.body.classList.add('noscroll'); inp.placeholder = t('srch.ph'); hint.textContent = t('srch.hint'); inp.value = ''; list.replaceChildren(); inp.focus(); if (!index) index = await build(); render(); }
  function close() { ov.hidden = true; document.body.classList.remove('noscroll'); }
  inp.addEventListener('input', () => index && render());
  inp.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); mark(Math.min(hits.length - 1, cur + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); mark(Math.max(0, cur - 1)); } else if (e.key === 'Enter') pick(cur); else if (e.key === 'Escape') close(); });
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ov.hidden ? open() : close(); }
    else if (e.key === '/' && !typing && ov.hidden) { e.preventDefault(); open(); }
  });

  /* ---------- link to this view ---------- */
  const DEF_SP = 'Blue whale';
  function stateURL() {
    const u = new URL(location.href), p = u.searchParams; ['sp', 'rsp', 'rm', 'dive'].forEach((k) => p.delete(k));
    if (window.wlCurSpecies && wlCurSpecies !== DEF_SP) p.set('sp', wlCurSpecies);
    if (window.wlRoutes && window.wlRoutesTouched) { const r = wlRoutes.get(); if (r.sp) p.set('rsp', r.sp); p.set('rm', r.m + 1); }
    if (window.wlDive && wlDive.get() != null) p.set('dive', wlDive.get().toFixed(3));
    let best = null; document.querySelectorAll('main section[id], .chapter[id]').forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.35) best = s; });
    u.hash = best ? best.id : ''; return u.toString();
  }
  const pop = el('div', 'share-pop'); pop.hidden = true; pop.setAttribute('role', 'dialog');
  const popT = el('p', 'sp-what'), popU = el('input', 'sp-url'), popRow = el('div', 'sp-row'), popCopy = el('button', 'sp-copy'), popX = el('button', 'sp-x', '×');
  popU.readOnly = true; popCopy.type = popX.type = 'button'; popRow.append(popU, popCopy); pop.append(popX, el('b', 'sp-h'), popT, popRow);
  function describe() {
    const parts = []; let best = null; document.querySelectorAll('main section[id]').forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * 0.35) best = s; });
    const h = best && best.querySelector('h2'); if (h) parts.push(t('share.part.at', { x: h.textContent.trim() }));
    const d = document.querySelector('#detail h3'); if (window.wlCurSpecies && wlCurSpecies !== DEF_SP && d) parts.push(t('share.part.sp', { x: d.textContent.trim() }));
    if (window.wlRoutes && window.wlRoutesTouched) { const o = document.querySelector('#routes-ctl select'), m = document.querySelector('.rt-month'); if (o && m) parts.push(t('share.part.map', { x: o.options[o.selectedIndex].text, m: m.textContent.trim() })); }
    if (window.wlDive && wlDive.get() != null) parts.push(t('share.part.dive', { x: Math.round(wlDive.get() * 100) }));
    return parts;
  }
  async function share() {
    const url = stateURL(); pop.querySelector('.sp-h').textContent = t('share.title');
    popT.textContent = t('share.explain') + ' ' + describe().join(' · '); popU.value = url; popCopy.textContent = t('share.copy');
    pop.hidden = false; popU.focus(); popU.select();
    try { await navigator.clipboard.writeText(url); popCopy.textContent = t('share.copied'); } catch (e) {}
  }
  popCopy.addEventListener('click', async () => { if (navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: document.title, url: popU.value }); return; } catch (e) {} }
    try { await navigator.clipboard.writeText(popU.value); } catch (e) { popU.select(); document.execCommand('copy'); } popCopy.textContent = t('share.copied'); });
  popX.addEventListener('click', () => { pop.hidden = true; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') pop.hidden = true; });
  document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.tool-b')) pop.hidden = true; });
  function restore() {
    const p = new URLSearchParams(location.search);
    if (p.get('sp')) later(() => window.wlSelectSpecies, () => { if (wlSelectSpecies(p.get('sp')) && !location.hash) show($('detail')); });
    if (p.get('rsp') || p.get('rm')) later(() => window.wlRoutes, () => wlRoutes.set(p.get('rsp'), p.get('rm') ? +p.get('rm') - 1 : null));
    if (p.get('dive')) { const c = $('bathy3d'); if (c) { show(c); later(() => window.wlDive, () => wlDive.to(+p.get('dive')), 30000); } }
  }

  /* ---------- one player for every sound ---------- */
  const gp = el('div', 'gp idle'); gp.setAttribute('role', 'region');
  const gpPlay = el('button', 'gp-b', '❚❚'), gpStop = el('button', 'gp-b gp-stop', '■'), gpT = el('b', 'gp-t'), gpTime = el('span', 'gp-time'), gpSeek = el('input', 'gp-seek'), gpVol = el('input', 'gp-vol');
  [gpPlay, gpStop].forEach((b) => { b.type = 'button'; });
  gpSeek.type = gpVol.type = 'range'; gpSeek.min = 0; gpSeek.max = 1000; gpSeek.value = 0; gpVol.min = 0; gpVol.max = 1; gpVol.step = .05; gpVol.value = 1;
  const meta = el('div', 'gp-meta'); meta.append(gpT, gpTime); gp.append(gpPlay, gpStop, meta, gpSeek, gpVol);
  let media = null, vol = 1; const fmt = (s) => !isFinite(s) ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const titleOf = (m) => (m.dataset && m.dataset.title) || decodeURIComponent((m.currentSrc || m.src || '').split('/').pop().split('?')[0]).replace(/\.(mp3|wav|ogg|m4a|flac|webm|m3u8)$/i, '').replace(/[_-]+/g, ' ') || t('gp.sound');
  const sync = () => { if (!media) return; gpPlay.textContent = media.paused ? '▶' : '❚❚'; gpPlay.setAttribute('aria-label', t(media.paused ? 'gp.play' : 'gp.pause'));
    const d = media.dataset && media.dataset.live ? Infinity : media.duration; gpSeek.disabled = !isFinite(d); gpSeek.value = isFinite(d) && d ? Math.round(media.currentTime / d * 1000) : 0; gpTime.textContent = isFinite(d) ? `${fmt(media.currentTime)} / ${fmt(d)}` : t('gp.live'); };
  const EV = ['play', 'pause', 'ended', 'timeupdate', 'durationchange', 'loadedmetadata'];
  // the background stream shows here too whenever no other sound is in the player
  let amb = null, ambFolded = false;
  const showAmb = () => {
    if (media) return;
    if (amb && amb.loaded && !(ambFolded && !amb.on)) { gp.classList.remove('idle'); gp.classList.add('amb'); document.body.classList.add('has-gp');
      gpT.textContent = amb.name ? t('gp.amb.live', { name: amb.name }) : t('gp.amb.synth'); gpTime.textContent = t(amb.on ? 'gp.amb.note' : 'gp.amb.off');
      gpPlay.textContent = amb.on ? '❚❚' : '▶'; gpPlay.setAttribute('aria-label', t(amb.on ? 'gp.pause' : 'gp.play')); }
    else idle();
  };
  document.addEventListener('wl-ambient', (e) => { amb = e.detail; if (amb.on) ambFolded = false; showAmb(); });
  document.addEventListener('wl-media', (e) => { const m = e.detail; if (media && media !== m) { EV.forEach((ev) => media.removeEventListener(ev, sync)); if (!media.paused) media.pause(); }
    media = m; m.volume = vol; EV.forEach((ev) => m.addEventListener(ev, sync)); m.addEventListener('ended', () => { if (media === m) { EV.forEach((ev) => m.removeEventListener(ev, sync)); media = null; showAmb(); } }); gpT.textContent = titleOf(m); gp.classList.remove('idle', 'amb'); document.body.classList.add('has-gp'); sync(); });
  gpPlay.addEventListener('click', () => { if (!media) { if (amb && window.wlAmbient) wlAmbient.set(!amb.on); return; } media.paused ? media.play().catch(() => {}) : media.pause(); });
  // stop ends the sound and folds the bar back to its small resting state; it never disappears
  gpStop.addEventListener('click', () => { if (!media) { if (amb && amb.loaded && window.wlAmbient) { ambFolded = true; wlAmbient.set(false); } idle(); return; } media.pause(); try { media.currentTime = 0; } catch (e) {} EV.forEach((ev) => media.removeEventListener(ev, sync)); media = null; showAmb(); });
  gpSeek.addEventListener('input', () => { if (media && isFinite(media.duration)) media.currentTime = gpSeek.value / 1000 * media.duration; });
  gpVol.addEventListener('input', () => { vol = +gpVol.value; if (media) media.volume = vol; else if (window.wlAmbient) wlAmbient.setVolume(vol); });
  const idle = () => { gp.classList.add('idle'); gp.classList.remove('amb'); gpT.textContent = t('gp.idle'); gpTime.textContent = t('gp.idle2'); document.body.classList.remove('has-gp'); };

  /* ---------- guided tour ---------- */
  const STEPS = ['#top', '#dive', '#lineup', '#routes', '#bathy3d', '#live-card', '#listen', '#res-board', '#machine'];
  const STEP_MS = 13000; let tour = null;
  const cap = el('div', 'tour'); cap.hidden = true; cap.setAttribute('role', 'dialog');
  const tN = el('small', 'tour-n'), tTx = el('p', 'tour-t'), tBar = el('i', 'tour-bar'), tCtl = el('div', 'tour-ctl');
  const tPrev = el('button', '', '‹'), tPause = el('button', '', '❚❚'), tNext = el('button', '', '›'), tEnd = el('button', 'tour-end');
  [tPrev, tPause, tNext, tEnd].forEach((b) => { b.type = 'button'; tCtl.append(b); }); cap.append(tN, tTx, tBar, tCtl);
  function step(i) {
    if (!tour) return; document.querySelectorAll('.tour-hi').forEach((x) => x.classList.remove('tour-hi'));
    if (i >= STEPS.length) return endTour(); tour.i = Math.max(0, i);
    const target = document.querySelector(STEPS[tour.i]); if (target) { show(target); target.classList.add('tour-hi'); }
    tN.textContent = t('tour.n', { i: tour.i + 1, n: STEPS.length }); tTx.textContent = t(`tour.s${tour.i + 1}`);
    tour.t0 = performance.now(); tour.left = STEP_MS;
  }
  function tick(now) { if (!tour) return; if (!tour.paused) { const f = (now - tour.t0) / tour.left; tBar.style.transform = `scaleX(${Math.min(1, f)})`; if (f >= 1) step(tour.i + 1); } tour.raf = requestAnimationFrame(tick); }
  function startTour() { if (tour) return; close(); tour = { i: 0, paused: false }; cap.hidden = false; tPause.textContent = '❚❚'; tEnd.textContent = t('tour.end'); step(0); tour.raf = requestAnimationFrame(tick); }
  function endTour() { if (!tour) return; cancelAnimationFrame(tour.raf); tour = null; cap.hidden = true; document.querySelectorAll('.tour-hi').forEach((x) => x.classList.remove('tour-hi')); }
  tPrev.addEventListener('click', () => step(tour.i - 1)); tNext.addEventListener('click', () => step(tour.i + 1)); tEnd.addEventListener('click', endTour);
  tPause.addEventListener('click', () => { tour.paused = !tour.paused; tPause.textContent = tour.paused ? '▶' : '❚❚'; if (!tour.paused) { tour.t0 = performance.now() - (parseFloat((tBar.style.transform.match(/[\d.]+/) || [0])[0]) * tour.left); } });
  addEventListener('keydown', (e) => { if (!tour) return; if (e.key === 'Escape') endTour(); else if (e.key === 'ArrowRight') step(tour.i + 1); else if (e.key === 'ArrowLeft') step(tour.i - 1); });
  window.wlTour = startTour;

  /* ---------- top bar buttons ---------- */
  I18N.ready.then(() => {
    const bar = document.querySelector('.toc'), grp = el('div', 'tools');
    const mkB = (ico, key, fn, kbd) => { const b = el('button', 'tool-b'); b.type = 'button'; b.append(el('i', 'ic ic-' + ico)); const lab = el('em', '', t(key)); b.append(lab); if (kbd) b.append(el('kbd', '', kbd)); b.title = t(key); b.setAttribute('aria-label', t(key)); b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); grp.append(b); return b; };
    mkB('search', 'srch.btn', open, /Mac/.test(navigator.platform) ? '⌘K' : 'Ctrl K'); mkB('link', 'share.btn', share); mkB('play', 'tour.btn', startTour);
    if (bar) bar.append(grp); document.body.append(ov, gp, cap, pop); showAmb();
    gp.setAttribute('aria-label', t('gp.label')); gpStop.setAttribute('aria-label', t('gp.stop')); gpSeek.setAttribute('aria-label', t('gp.seek')); gpVol.setAttribute('aria-label', t('gp.vol'));
    const startCard = $('start-grid'); if (startCard) { const b = el('button', 'tour-cta', t('tour.cta')); b.type = 'button'; b.addEventListener('click', startTour); startCard.before(b); }
    restore();
  });
})();
