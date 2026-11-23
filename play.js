/* Listening game, sound microscope and lab notebook. Uses $, el, t, num, getJSON, colour from app.js / i18n.js. */
(function () {
  /* ---------------- Listening game ---------------- */
  function game(g) {
    const box = $('game'); const audio = new Audio('data/play/game.mp3'); audio.preload = 'auto';
    let round = [], k = 0, score = { you: 0, perch: 0, whalu: 0 }, answered = false, stopAt = 0, raf = 0;
    const pickRound = () => { const a = g.items.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 10); };
    const playIt = (it) => { audio.currentTime = it.pos; stopAt = it.pos + g.win_s; audio.play().catch(() => {}); const tick = () => { const f = (audio.currentTime - it.pos) / g.win_s; $('g-ph').style.width = `${Math.max(0, Math.min(1, f)) * 100}%`; if (audio.currentTime >= stopAt) { audio.pause(); return; } if (!audio.paused) raf = requestAnimationFrame(tick); }; cancelAnimationFrame(raf); tick(); };
    const verdict = (yes, truth) => (yes === truth ? '✓' : '✗');
    function render() {
      const it = round[k]; answered = false; box.replaceChildren();
      const head = el('div', 'g-head'); head.append(el('span', 'kicker', t('game.progress', { n: k + 1, of: round.length })), el('span', 'g-score', t('game.score', { you: score.you, perch: score.perch, whalu: score.whalu, n: k })));
      const bar = el('div', 'g-bar'); const ph = el('span'); ph.id = 'g-ph'; bar.append(ph);
      const play = el('button', 'play'); play.type = 'button'; play.innerHTML = `<svg viewBox="0 0 14 14" style="width:14px;height:14px">${playIcon(false)}</svg>`; play.append(t('game.play'));
      play.addEventListener('click', () => playIt(it));
      const q = el('p', 'g-q', t('game.question'));
      const ans = el('div', 'g-ans');
      const yes = el('button', 'g-btn'); yes.type = 'button'; yes.textContent = t('game.yes');
      const no = el('button', 'g-btn'); no.type = 'button'; no.textContent = t('game.no');
      const reveal = el('div', 'g-reveal');
      const answer = (you) => {
        if (answered) return; answered = true;
        const truth = it.call === 1, p = it.perch >= 0.5, w = it.whalu >= 0.5;
        score.you += you === truth; score.perch += p === truth; score.whalu += w === truth;
        [yes, no].forEach((b) => { b.disabled = true; }); (you ? yes : no).classList.add(you === truth ? 'right' : 'wrong');
        reveal.replaceChildren(
          el('div', 'g-truth', truth ? t('game.truth.call') : t('game.truth.none')),
          row(t('game.you'), you ? t('game.yes') : t('game.no'), verdict(you, truth)),
          row('Perch 2.0', `${num(it.perch, 2)} → ${p ? t('game.yes') : t('game.no')}`, verdict(p, truth)),
          row('whalu', `${num(it.whalu, 2)} → ${w ? t('game.yes') : t('game.no')}`, verdict(w, truth)));
        const nx = el('button', 'play'); nx.type = 'button'; nx.textContent = k + 1 < round.length ? t('game.next') : t('game.finish');
        nx.addEventListener('click', () => { k += 1; k < round.length ? render() : summary(); }); reveal.append(nx);
        head.querySelector('.g-score').textContent = t('game.score', { you: score.you, perch: score.perch, whalu: score.whalu, n: k + 1 });
      };
      yes.addEventListener('click', () => answer(true)); no.addEventListener('click', () => answer(false));
      ans.append(yes, no);
      box.append(head, bar, play, q, ans, reveal);
    }
    const row = (who, what, mark) => { const r = el('div', 'g-row ' + (mark === '✓' ? 'ok' : 'bad')); r.append(el('b', '', who), el('span', '', what), el('i', '', mark)); return r; };
    function summary() {
      box.replaceChildren(el('span', 'kicker', t('game.done')), el('div', 'g-final', t('game.final', { you: score.you, perch: score.perch, whalu: score.whalu, n: round.length })), el('p', 'note', t('game.why')));
      const again = el('button', 'play'); again.type = 'button'; again.textContent = t('game.again'); again.addEventListener('click', start); box.append(again);
    }
    function start() { round = pickRound(); k = 0; score = { you: 0, perch: 0, whalu: 0 }; render(); }
    start();
  }

  /* ---------------- Sound microscope ---------------- */
  const CLIPS = { Bm: { sp: 'blue', fmax: 120 }, Bp: { sp: 'fin', fmax: 160 }, Mn: { sp: 'humpback', fmax: 2000 } };
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr; re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
    }
  }
  function microscope() {
    const sel = $('mc-clip'), speed = $('mc-speed'), cv = $('mc-canvas'), info = $('mc-info');
    let ctx = null, buf = null, spec = null, view = null, src = null, raf = 0, playT0 = 0, playFrom = 0, playTo = 0, rate = 1, fmax = 120, drag = null;
    const RATE = 4000, N = 1024, HOP = 128;
    Object.entries(CLIPS).forEach(([code, c]) => sel.append(new Option(t(`sp.${c.sp}.name`), code)));
    async function load(code) {
      info.textContent = t('mc.loading'); stop();
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const raw = await (await fetch(`data/play/micro_${code}.mp3`)).arrayBuffer();
      buf = await ctx.decodeAudioData(raw);
      const off = new OfflineAudioContext(1, Math.ceil(buf.duration * RATE), RATE);
      const s = off.createBufferSource(); s.buffer = buf; s.connect(off.destination); s.start();
      const low = (await off.startRendering()).getChannelData(0);
      const frames = Math.floor((low.length - N) / HOP), bins = N / 2, win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
      spec = { frames, bins, data: new Float32Array(frames * bins), dur: buf.duration };
      const re = new Float32Array(N), im = new Float32Array(N);
      for (let f = 0; f < frames; f++) { for (let i = 0; i < N; i++) { re[i] = low[f * HOP + i] * win[i]; im[i] = 0; } fft(re, im); for (let b = 0; b < bins; b++) spec.data[f * bins + b] = 10 * Math.log10(re[b] * re[b] + im[b] * im[b] + 1e-12); }
      fmax = CLIPS[code].fmax; view = { t0: 0, t1: buf.duration }; draw(); info.textContent = t('mc.hint');
    }
    function draw(playAt) {
      if (!spec) return;
      const W = cv.width = cv.clientWidth * (devicePixelRatio || 1), H = cv.height = cv.clientHeight * (devicePixelRatio || 1), g = cv.getContext('2d'), img = g.createImageData(W, H);
      const bmax = Math.min(spec.bins - 1, Math.round(fmax / (RATE / N)));
      const f0 = Math.floor(view.t0 / spec.dur * spec.frames), f1 = Math.max(f0 + 2, Math.ceil(view.t1 / spec.dur * spec.frames));
      let lo = Infinity, hi = -Infinity;
      for (let f = f0; f < f1; f += Math.max(1, Math.floor((f1 - f0) / 400))) for (let b = 1; b <= bmax; b++) { const v = spec.data[f * spec.bins + b]; if (v < lo) lo = v; if (v > hi) hi = v; }
      lo = lo + (hi - lo) * 0.35;
      for (let x = 0; x < W; x++) { const f = Math.min(spec.frames - 1, f0 + Math.floor(x / W * (f1 - f0))); for (let y = 0; y < H; y++) { const b = Math.max(1, Math.round((1 - y / H) * bmax)); const v = (spec.data[f * spec.bins + b] - lo) / (hi - lo); const [r, gg, bb] = colour(Math.max(0, v)); const k = (y * W + x) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = bb; img.data[k + 3] = 255; } }
      g.putImageData(img, 0, 0);
      const fy = (hz) => H * (1 - hz / fmax);
      g.font = `${11 * (devicePixelRatio || 1)}px "IBM Plex Mono", monospace`; g.textBaseline = 'bottom';
      if (fmax > 20) { g.strokeStyle = 'rgba(255,107,91,.9)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(0, fy(20)); g.lineTo(W, fy(20)); g.stroke(); g.setLineDash([]); g.fillStyle = '#ff8a7c'; g.fillText(t('mc.hearing'), 8, fy(20) - 4); }
      if (rate > 1) { const heard = 20 / rate; if (heard < fmax) { g.strokeStyle = 'rgba(94,230,215,.95)'; g.beginPath(); g.moveTo(0, fy(heard)); g.lineTo(W, fy(heard)); g.stroke(); g.fillStyle = '#5ee6d7'; g.fillText(t('mc.audible', { hz: num(heard, heard < 10 ? 1 : 0), x: rate }), 8, fy(heard) - 4); } }
      g.fillStyle = 'rgba(220,236,241,.75)'; [0, .25, .5, .75].forEach((q) => { const hz = fmax * q; if (q) g.fillText(`${num(hz)} Hz`, W - 70 * (devicePixelRatio || 1), fy(hz) - 2); });
      if (drag) { g.fillStyle = 'rgba(255,181,71,.18)'; g.fillRect(Math.min(drag.a, drag.b) * W, 0, Math.abs(drag.b - drag.a) * W, H); }
      if (playAt != null) { const x = (playAt - view.t0) / (view.t1 - view.t0) * W; g.fillStyle = '#fff'; g.fillRect(x - 1, 0, 2 * (devicePixelRatio || 1), H); }
      $('mc-range').textContent = t('mc.range', { a: num(view.t0, 1), b: num(view.t1, 1), x: rate });
    }
    function stop() { if (src) { try { src.stop(); } catch (e) {} src = null; } if (window.wlDuck) wlDuck('mc', false); cancelAnimationFrame(raf); $('mc-play').querySelector('span').textContent = t('mc.play'); }
    function play() {
      if (src) { stop(); draw(); return; }
      if (!buf) return; ctx.resume();
      rate = +speed.value; src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.connect(ctx.destination);
      playFrom = view.t0; playTo = view.t1; playT0 = ctx.currentTime; if (window.wlDuck) wlDuck('mc', true); src.start(0, playFrom, playTo - playFrom);
      src.onended = () => { src = null; stop(); draw(); };
      $('mc-play').querySelector('span').textContent = t('mc.stop');
      const tick = () => { if (!src) return; draw(playFrom + (ctx.currentTime - playT0) * rate); raf = requestAnimationFrame(tick); }; tick();
    }
    const fx = (e) => { const r = cv.getBoundingClientRect(); return Math.max(0, Math.min(1, ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width)); };
    cv.addEventListener('pointerdown', (e) => { if (!spec) return; drag = { a: fx(e), b: fx(e) }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (drag) { drag.b = fx(e); draw(); } });
    cv.addEventListener('pointerup', () => { if (!drag) return; const a = Math.min(drag.a, drag.b), b = Math.max(drag.a, drag.b); if (b - a > 0.02) { const d = view.t1 - view.t0; view = { t0: view.t0 + a * d, t1: view.t0 + b * d }; } drag = null; stop(); draw(); });
    $('mc-out').addEventListener('click', () => { if (buf) { view = { t0: 0, t1: buf.duration }; stop(); draw(); } });
    $('mc-play').addEventListener('click', play);
    speed.addEventListener('input', () => { rate = +speed.value; $('mc-speedv').textContent = `${rate}×`; if (src) src.playbackRate.value = rate; draw(); });
    sel.addEventListener('change', () => load(sel.value));
    $('mc-start').addEventListener('click', () => { $('mc-start').hidden = true; load(sel.value); });
    addEventListener('resize', () => draw());
  }

  /* ---------------- Lab notebook ---------------- */
  function notebook(nb) {
    const ol = $('nb'); ol.replaceChildren();
    nb.entries.forEach((e) => {
      const li = el('li', 'nb-' + e.status);
      const d = new Date(e.date + 'T12:00:00Z').toLocaleDateString(I18N.locale, { day: 'numeric', month: 'short', year: 'numeric' });
      li.append(el('time', '', d), el('span', 's ' + (e.status === 'note' ? 'waiting' : e.status), t(`nb.status.${e.status}`)), el('h4', '', t(`nb.${e.id}.t`)), el('p', '', t(`nb.${e.id}.d`)));
      if (e.figure) { const f = el('div', 'nb-fig'); f.append(el('b', '', e.figure), el('span', '', t(`nb.${e.id}.f`))); li.append(f); }
      ol.append(li);
    });
  }

  I18N.ready.then(() => {
    getJSON('data/play/game.json').then(game).catch(() => { $('game').textContent = t('ui.loadfail'); });
    microscope();
    getJSON('notebook.json').then(notebook).catch(() => { $('nb').textContent = t('ui.loadfail'); });
  });
})();
