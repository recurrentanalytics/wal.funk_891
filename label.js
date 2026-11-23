/* Listening page for step 7f: the owner labels 300 blind 10 s clips from the MARS archive as humpback song yes / no /
   unsure. No dates and no model scores are shown. Labels stay in this browser (localStorage) until exported as JSON.
   Rules: label/RULES.md (written before any clip was drawn). */
(function () {
  const $ = (id) => document.getElementById(id);
  const KEY = 'wl-labels-7f';
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
    if (src && buf) { const p = ((ctx.currentTime - t0) % buf.duration) / buf.duration * cv.width; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(p, 0, 2, cv.height); raf = requestAnimationFrame(playhead); }
  }

  // ---------- playback ----------
  function stop() { if (src) { src.onended = null; try { src.stop(); } catch (e) {} src = null; } cancelAnimationFrame(raf); playhead(); $('lb-play').textContent = '▶ ' + t('lab.play'); }
  function play() { if (!buf) return; stop(); audioCtx().resume(); src = ctx.createBufferSource(); src.buffer = buf; src.loop = loop; src.connect(ctx.destination); t0 = ctx.currentTime; src.start();
    src.onended = () => { src = null; stop(); }; $('lb-play').textContent = '❚❚ ' + t('lab.pause'); raf = requestAnimationFrame(playhead); }
  async function show(k, autoplay) {
    i = Math.max(0, Math.min(ids.length - 1, k)); stop(); buf = null; specImg = null; const tok = ++loadToken, id = ids[i];
    $('lb-state').textContent = t('lab.loading'); draw();
    try { const ab = await (await fetch(`label/clips/${id}.mp3`)).arrayBuffer(); const b = await audioCtx().decodeAudioData(ab); if (tok !== loadToken) return; buf = b; spectrogram(b); $('lb-state').textContent = ''; if (autoplay) play(); }
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
    if (!ids.length) return; L[ids[i]] = { v, at: new Date().toISOString() }; save(); draw();
    const j = nextOpen(); if (j >= 0) setTimeout(() => show(j, true), 250); else { stop(); $('lb-msg').textContent = t('lab.all'); }
  }
  function exportJSON() {
    const out = { rules: 'label/RULES.md', step: '7f', exported_at: new Date().toISOString(), n_clips: ids.length, n_labelled: Object.keys(L).length, labels: L };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
    a.download = `wal.funk_891-labels-7f-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove();
    $('lb-msg').textContent = t('lab.exported', { n: out.n_labelled });
  }
  async function importJSON(f) {
    try { const d = JSON.parse(await f.text()); const got = d.labels || {}; let n = 0; Object.entries(got).forEach(([k, v]) => { if (ids.includes(k) && v && ['yes', 'no', 'unsure'].includes(v.v)) { L[k] = v; n++; } }); save(); draw(); $('lb-msg').textContent = t('lab.imported', { n }); }
    catch (e) { $('lb-msg').textContent = t('lab.badfile'); }
  }
  let refA = null; const ref = (url) => { stop(); if (refA && !refA.paused) { refA.pause(); return; } refA = new Audio(url); refA.play().catch(() => {}); };

  I18N.ready.then(async () => {
    document.title = 'wal.funk_891 · ' + t('lab.short');
    $('lb-play').textContent = '▶ ' + t('lab.play'); $('lb-loop').textContent = '⟲ ' + t('lab.loop'); $('lb-prev').textContent = '← ' + t('lab.prev'); $('lb-next').textContent = t('lab.next') + ' →'; $('lb-open').textContent = t('lab.open');
    $('lb-ref1').textContent = '▶ ' + t('lab.ref.mbari'); $('lb-ref2').textContent = '▶ ' + t('lab.ref.noaa'); $('lb-export').textContent = '⤓ ' + t('lab.export'); $('lb-importb').textContent = '⤒ ' + t('lab.import');
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
    try { const d = await (await fetch('label/clips.json?v=' + ((document.querySelector('meta[name="build"]') || {}).content || ''))).json(); ids = d.clips; }
    catch (e) { $('lb-state').textContent = t('lab.fail'); return; }
    const grid = $('lb-grid'); ids.forEach((id, k) => { const a = document.createElement('a'); a.href = '#'; a.title = String(k + 1); a.addEventListener('click', (e) => { e.preventDefault(); show(k, true); }); grid.append(a); });
    const j = ids.findIndex((x) => !L[x]); show(j >= 0 ? j : 0, false);
  });
})();
