/* Listening page for step 7f: the owner labels 300 blind 10 s clips from the MARS archive as humpback song yes / no /
   unsure. No dates and no model scores are shown. Labels stay in this browser (localStorage) until exported as JSON.
   Rules: label/RULES.md (written before any clip was drawn). */
(function () {
  const $ = (id) => document.getElementById(id);
  const MODE = (() => { const m = new URLSearchParams(location.search).get('mode'); return m === 'owner' || m === 'r8b' ? m : 'game'; })();
  const KEY = { owner: 'wl-labels-7f', r8b: 'wl-labels-8b', game: 'wl-game-7f' }[MODE];
  const DIR = MODE === 'r8b' ? 'label8' : 'label', STEP = MODE === 'r8b' ? '8b' : '7f', SESSION_MAX = 50;
  let heardFull = false;
  const sessCount = () => { try { return +sessionStorage.getItem('wl-8b-session') || 0; } catch (e) { return 0; } };
  const setSess = (n) => { try { sessionStorage.setItem('wl-8b-session', String(n)); } catch (e) {} };
  function lockState() {
    if (MODE !== 'r8b') return;
    const full = sessCount() >= SESSION_MAX, ok = heardFull && !full;
    document.querySelectorAll('.ans button').forEach((b) => { b.disabled = !ok; });
    const n = $('lb-lock'); if (n) { n.textContent = full ? t('lab.r8.break', { n: SESSION_MAX }) : heardFull ? '' : t('lab.r8.listen'); $('lb-newsess').hidden = !full; }
  }
  const B = (document.querySelector('meta[name="build"]') || {}).content || '';
  let GAME = null, CROWD = {}, BACK = { type: 'none' }, session = '';
  try { session = localStorage.getItem('wl-session') || ''; if (!session) { session = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('wl-session', session); } } catch (e) { session = 'anon' + Math.random().toString(36).slice(2); }
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  let L = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) { $('lb-msg').textContent = t('lab.nostore'); } };
  let ids = [], i = 0, ctx = null, buf = null, src = null, t0 = 0, loop = false, raf = 0, specImg = null, loadToken = 0;
  const NOAA = 'https://www.fisheries.noaa.gov/s3/2023-04/Meno-song-NOAA-PAGroup-13-humpback-clip.mp3';
  const audioCtx = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());

  // ---------- spectrogram (0-4 kHz) ----------
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
  }
  const col = (v) => { if (!(v >= 0)) v = 0; const s = [[2, 11, 16], [10, 60, 80], [40, 150, 160], [94, 230, 215], [230, 255, 250]], f = Math.min(.999, Math.max(0, v)) * (s.length - 1), k = Math.floor(f), r = f - k; return s[k].map((c, j) => Math.round(c + (s[k + 1][j] - c) * r)); };
  function spectrogram(b) {
    const cv = $('lb-spec'), W = cv.width = Math.round(cv.clientWidth * (devicePixelRatio || 1)), H = cv.height = Math.round(cv.clientHeight * (devicePixelRatio || 1)), g = cv.getContext('2d');
    const x = b.getChannelData(0), sr = b.sampleRate, N = 2048, hop = Math.max(64, Math.floor(x.length / W)), fmax = 4000, kmax = Math.floor(fmax / (sr / N));
    const cols = Math.floor((x.length - N) / hop), win = new Float32Array(N).map((_, n) => .5 - .5 * Math.cos(2 * Math.PI * n / (N - 1)));
    const S = []; let lo = Infinity, hi = -Infinity; const re = new Float32Array(N), im = new Float32Array(N);
    for (let c = 0; c < cols; c++) { for (let n = 0; n < N; n++) { re[n] = x[c * hop + n] * win[n]; im[n] = 0; } fft(re, im);
      const colv = new Float32Array(kmax); for (let k = 0; k < kmax; k++) { const v = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-12); colv[k] = v; } S.push(colv); }
    const all = S.flatMap((c) => Array.from(c)).sort((a, b) => a - b); lo = all[Math.floor(all.length * .08)]; hi = all[Math.floor(all.length * .997)];
    const img = g.createImageData(W, H);
    for (let px = 0; px < W; px++) { const c = S[Math.min(cols - 1, Math.floor(px / W * cols))];
      for (let py = 0; py < H; py++) { const k = Math.min(kmax - 1, Math.floor((1 - py / H) * kmax)), [r, gg, bb] = col(Math.pow(Math.min(1, Math.max(0, (c[k] - lo) / (hi - lo))), 1.3)), o = (py * W + px) * 4; img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = bb; img.data[o + 3] = 255; } }
    g.putImageData(img, 0, 0); specImg = img;
  }
  function playhead() {
    const cv = $('lb-spec'), g = cv.getContext('2d'); if (specImg) g.putImageData(specImg, 0, 0);
    if (src && buf) { if (!heardFull && ctx.currentTime - t0 >= buf.duration - 0.05) { heardFull = true; lockState(); } const p = ((ctx.currentTime - t0) % buf.duration) / buf.duration * cv.width; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(p, 0, 2, cv.height); raf = requestAnimationFrame(playhead); }
  }

  // ---------- playback ----------
  function stop() { if (src) { src.onended = null; try { src.stop(); } catch (e) {} src = null; } cancelAnimationFrame(raf); playhead(); $('lb-play').textContent = '▶ ' + t('lab.play'); }
  let heardFrom = 0; function play() { if (!buf) return; stop(); if (!heardFrom) heardFrom = performance.now(); audioCtx().resume(); src = ctx.createBufferSource(); src.buffer = buf; src.loop = loop; src.connect(ctx.destination); t0 = ctx.currentTime; src.start();
    src.onended = () => { if (!heardFull) { heardFull = true; lockState(); } src = null; stop(); }; $('lb-play').textContent = '❚❚ ' + t('lab.pause'); raf = requestAnimationFrame(playhead); }
  async function show(k, autoplay) {
    i = Math.max(0, Math.min(ids.length - 1, k)); stop(); buf = null; specImg = null; heardFrom = 0; heardFull = !!L[ids[i]]; hideReveal(); lockState(); const tok = ++loadToken, id = ids[i];
    $('lb-state').textContent = t('lab.loading'); draw();
    try { const ab = await (await fetch(`${DIR}/clips/${id}.mp3`)).arrayBuffer(); const b = await audioCtx().decodeAudioData(ab); if (tok !== loadToken) return; buf = b; spectrogram(b); $('lb-state').textContent = ''; if (MODE === 'game' && L[id]) reveal(); else if (autoplay) play(); }
    catch (e) { $('lb-state').textContent = t('lab.fail'); console.error('clip', id, e); }
  }
  function draw() {
    const done = ids.filter((x) => L[x]).length, id = ids[i], mine = L[id];
    $('lb-n').textContent = t('lab.clip', { i: i + 1, n: ids.length }); $('lb-done').textContent = t('lab.done', { d: done, n: ids.length });
    $('lb-prog').style.width = (done / Math.max(1, ids.length) * 100) + '%';
    document.querySelectorAll('.ans button').forEach((b) => b.classList.toggle('on', !!mine && mine.v === b.dataset.v));
    const m = $('lb-mine'); m.hidden = !mine; if (mine) { m.className = 'mine ' + mine.v; m.textContent = t('lab.mine', { v: t('lab.' + mine.v) }); }
    [...$('lb-grid').children].forEach((a, k) => { const l = L[ids[k]]; a.className = (l ? l.v : '') + (k === i ? ' cur' : ''); });
  }
  const nextOpen = () => { for (let k = 1; k <= ids.length; k++) { const j = (i + k) % ids.length; if (!L[ids[j]]) return j; } return -1; };
  function answer(v) {
    if (!ids.length) return;
    if (MODE === 'game') { if (L[ids[i]]) return; const ms = heardFrom ? Math.round(performance.now() - heardFrom) : 0; L[ids[i]] = { v, at: new Date().toISOString(), ms }; save(); draw(); send(ids[i], v, ms); reveal(); return; }
    if (MODE === 'r8b') { if (!heardFull || sessCount() >= SESSION_MAX) return; setSess(sessCount() + 1); L[ids[i]] = { v, at: new Date().toISOString(), ms: heardFrom ? Math.round(performance.now() - heardFrom) : 0 }; save(); draw(); lockState(); if (sessCount() >= SESSION_MAX) { stop(); return; } const j = nextOpen(); if (j >= 0) setTimeout(() => show(j, true), 250); else { stop(); $('lb-msg').textContent = t('lab.all'); } return; }
    L[ids[i]] = { v, at: new Date().toISOString() }; save(); draw();
    const j = nextOpen(); if (j >= 0) setTimeout(() => show(j, true), 250); else { stop(); $('lb-msg').textContent = t('lab.all'); }
  }
  // ---------- game: reveal, tally, sending ----------
  const isSong = (c) => GAME && GAME.clips[c] && Math.max(...GAME.clips[c].s) >= .7;
  function tally() {
    const mine = ids.filter((c) => L[c] && L[c].v !== 'unsure');
    const mm = mine.filter((c) => (L[c].v === 'yes') === isSong(c)).length, ow = mine.filter((c) => GAME.clips[c].o !== 'unsure'), mo = ow.filter((c) => L[c].v === GAME.clips[c].o).length;
    $('lb-tally').textContent = t('lab.g.tally', { m: mm, n: mine.length, o: mo, k: ow.length });
  }
  function hideReveal() { const r = $('lb-reveal'); if (r) r.hidden = true; document.querySelector('.ans').hidden = false; }
  function reveal() {
    const c = ids[i], g = GAME.clips[c], r = $('lb-reveal'), mx = Math.max(...g.s), mine = L[c].v;
    r.replaceChildren();
    const row = (who, txt, cls) => { const d = document.createElement('div'); d.className = 'rv-row'; const b = document.createElement('b'); b.textContent = who; const s = document.createElement('span'); s.className = 'rv ' + cls; s.textContent = txt; d.append(b, s); r.append(d); };
    row(t('lab.g.you'), t('lab.' + mine), mine);
    row(t('lab.g.model'), t(mx >= .7 ? 'lab.g.song' : 'lab.g.nosong', { p: Math.round(mx * 100) }), mx >= .7 ? 'yes' : 'no');
    row(t('lab.g.owner'), t('lab.' + g.o), g.o);
    const cr = CROWD[c]; if (cr && (cr.yes + cr.no + cr.unsure) > 0) row(t('lab.g.crowd'), t('lab.g.crowdv', { y: cr.yes, n: cr.no, u: cr.unsure }), 'crowd');
    const bars = document.createElement('div'); bars.className = 'rv-bars'; bars.title = t('lab.g.bars');
    g.s.forEach((v) => { const i2 = document.createElement('i'); i2.style.height = Math.max(4, v * 100) + '%'; if (v >= .7) i2.className = 'hit'; bars.append(i2); });
    const bl = document.createElement('small'); bl.textContent = t('lab.g.bars'); r.append(bars, bl);
    const verdict = document.createElement('p'); verdict.className = 'rv-say';
    verdict.textContent = mine === 'unsure' ? t('lab.g.say.unsure') : (mine === 'yes') === (mx >= .7) ? t('lab.g.say.agree') : t(mine === 'yes' ? 'lab.g.say.youyes' : 'lab.g.say.modelyes');
    r.append(verdict);
    const nx = document.createElement('button'); nx.type = 'button'; nx.className = 'play'; nx.textContent = t('lab.next') + ' →'; nx.addEventListener('click', () => { const j = nextOpen(); if (j >= 0) show(j, true); else $('lb-msg').textContent = t('lab.all'); }); r.append(nx);
    document.querySelector('.ans').hidden = true; r.hidden = false; nx.focus(); tally(); pending();
  }
  // where answers go: Supabase if data/backend.json names one, else they wait here until sent through GitHub
  const QKEY = 'wl-game-queue';
  const queue = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } };
  const setQueue = (q) => { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} };
  async function send(clip, v, ms) {
    const rec = { clip, v, session, listened_ms: Math.min(600000, ms), lang: I18N.lang };
    if (BACK.type === 'supabase') {
      try { const r = await fetch(BACK.url + '/rest/v1/labels', { method: 'POST', headers: { apikey: BACK.key, Authorization: 'Bearer ' + BACK.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rec) }); if (r.ok) return; } catch (e) {}
    }
    const q = queue(); q.push(rec); setQueue(q); pending();
  }
  function pending() {
    const q = queue(), b = $('lb-send'); if (!b) return;
    b.hidden = !q.length; b.textContent = t('lab.g.send', { n: q.length });
  }
  function sendGitHub() {
    const q = queue(); if (!q.length) return;
    const body = t('lab.g.issue.body') + '\n\n```json\n' + JSON.stringify({ step: '7f-crowd', session, labels: q.map((r) => [r.clip, r.v, r.listened_ms]) }) + '\n```\n';
    const url = 'https://github.com/recurrentanalytics/wal.funk_891/issues/new?title=' + encodeURIComponent('[labels] ' + q.length + ' answers') + '&body=' + encodeURIComponent(body);
    window.open(url, '_blank', 'noopener'); setQueue([]); pending(); $('lb-msg').textContent = t('lab.g.sent');
  }
  async function loadCrowd() {
    try {
      if (BACK.type === 'supabase') {
        const h = { apikey: BACK.key, Authorization: 'Bearer ' + BACK.key };
        const [cs, tot] = await Promise.all([fetch(BACK.url + '/rest/v1/clip_summary?select=*', { headers: h }).then((r) => r.json()), fetch(BACK.url + '/rest/v1/totals?select=*', { headers: h }).then((r) => r.json())]);
        cs.forEach((x) => { CROWD[x.clip] = x; }); if (tot[0]) $('lb-crowd').textContent = t('lab.g.live', { a: tot[0].answers, p: tot[0].people });
      } else {
        const d = await (await fetch('data/crowd_summary.json?v=' + B, { cache: 'no-cache' })).json(); CROWD = d.clips || {};
        $('lb-crowd').textContent = t('lab.g.github', { a: d.answers || 0, p: d.people || 0 });
      }
    } catch (e) {}
  }
  function exportJSON() {
    const out = { rules: MODE === 'r8b' ? 'docs/round8-plan.md (8b)' : 'label/RULES.md', step: STEP, exported_at: new Date().toISOString(), n_clips: ids.length, n_labelled: Object.keys(L).length, labels: L };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
    a.download = `wal.funk_891-labels-${STEP}-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove();
    $('lb-msg').textContent = t('lab.exported', { n: out.n_labelled });
  }
  async function importJSON(f) {
    try { const d = JSON.parse(await f.text()); const got = d.labels || {}; let n = 0; Object.entries(got).forEach(([k, v]) => { if (ids.includes(k) && v && ['yes', 'no', 'unsure'].includes(v.v)) { L[k] = v; n++; } }); save(); draw(); $('lb-msg').textContent = t('lab.imported', { n }); }
    catch (e) { $('lb-msg').textContent = t('lab.badfile'); }
  }
  let refA = null; const ref = (url) => { stop(); if (refA && !refA.paused) { refA.pause(); return; } refA = new Audio(url); refA.play().catch(() => {}); };

  I18N.ready.then(async () => {
    document.title = 'wal.funk_891 · ' + t(MODE === 'game' ? 'lab.g.short' : MODE === 'r8b' ? 'lab.r8.short' : 'lab.short');
    if (MODE === 'r8b') { document.querySelectorAll('[data-owner-only]').forEach((x) => { x.hidden = true; }); document.querySelectorAll('[data-r8]').forEach((x) => { x.hidden = false; });
      $('lb-newsess').addEventListener('click', () => { setSess(0); lockState(); const j = nextOpen(); if (j >= 0) show(j, true); }); }
    if (MODE === 'game') { document.querySelectorAll('[data-owner]').forEach((x) => { x.hidden = true; }); document.querySelectorAll('[data-game]').forEach((x) => { x.hidden = false; }); }
    $('lb-play').textContent = '▶ ' + t('lab.play'); $('lb-loop').textContent = '⟲ ' + t('lab.loop'); $('lb-prev').textContent = '← ' + t('lab.prev'); $('lb-next').textContent = t('lab.next') + ' →'; $('lb-open').textContent = t('lab.open');
    $('lb-ref1').textContent = '▶ ' + t('lab.ref.mbari'); $('lb-ref2').textContent = '▶ ' + t('lab.ref.noaa'); $('lb-export').textContent = '⤓ ' + t('lab.export'); $('lb-newsess').textContent = t('lab.r8.new'); $('lb-importb').textContent = '⤒ ' + t('lab.import');
    $('lb-play').addEventListener('click', () => (src ? stop() : play()));
    $('lb-loop').addEventListener('click', () => { loop = !loop; $('lb-loop').setAttribute('aria-pressed', String(loop)); $('lb-loop').classList.toggle('play', loop); if (src) src.loop = loop; });
    $('lb-prev').addEventListener('click', () => show(i - 1, true)); $('lb-next').addEventListener('click', () => show(i + 1, true));
    $('lb-open').addEventListener('click', () => { const j = nextOpen(); if (j >= 0) show(j, true); });
    document.querySelectorAll('.ans button').forEach((b) => b.addEventListener('click', () => answer(b.dataset.v)));
    $('lb-ref1').addEventListener('click', () => ref('data/voices/Mn.mp3')); $('lb-ref2').addEventListener('click', () => ref(NOAA));
    $('lb-export').addEventListener('click', exportJSON); $('lb-importb').addEventListener('click', () => $('lb-import').click());
    $('lb-import').addEventListener('change', (e) => e.target.files[0] && importJSON(e.target.files[0]));
    addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return; const k = e.key.toLowerCase();
      if (k === 'j' || k === 'y' || k === '1') answer('yes'); else if (k === 'n' || k === '2') answer('no'); else if (k === 'u' || k === '3') answer('unsure');
      else if (k === ' ') { e.preventDefault(); src ? stop() : play(); } else if (k === 'arrowleft') show(i - 1, true); else if (k === 'arrowright') show(i + 1, true); });
    addEventListener('resize', () => { if (buf) spectrogram(buf); });
    try { const d = await (await fetch(DIR + '/clips.json?v=' + B)).json(); ids = d.clips; }
    catch (e) { $('lb-state').textContent = t('lab.fail'); return; }
    if (MODE === 'game') {
      document.body.classList.add('game');
      try { GAME = await (await fetch('data/game_7f.json?v=' + B)).json(); } catch (e) { $('lb-state').textContent = t('lab.fail'); return; }
      try { BACK = await (await fetch('data/backend.json?v=' + B, { cache: 'no-cache' })).json(); } catch (e) {}
      // each visitor gets their own order, kept for later visits
      let ord = null; try { ord = JSON.parse(localStorage.getItem('wl-game-order') || 'null'); } catch (e) {}
      if (!ord || ord.length !== ids.length) { ord = ids.slice(); for (let k = ord.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [ord[k], ord[j]] = [ord[j], ord[k]]; } try { localStorage.setItem('wl-game-order', JSON.stringify(ord)); } catch (e) {} }
      ids = ord; $('lb-send').addEventListener('click', sendGitHub); pending(); tally(); loadCrowd();
      addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('lb-reveal').hidden) { e.preventDefault(); $('lb-reveal').querySelector('button').click(); } });
    }
    const grid = $('lb-grid'); ids.forEach((id, k) => { const a = document.createElement('a'); a.href = '#'; a.title = String(k + 1); a.addEventListener('click', (e) => { e.preventDefault(); show(k, true); }); grid.append(a); });
    const j = ids.findIndex((x) => !L[x]); show(j >= 0 ? j : 0, false);
  });
})();
