/* Ambient underwater music, generated live in the browser (no recording, no licence): a deep ocean bed, a slow drifting
   chord and the odd bubble. Switch in the top bar; the choice is remembered. Browsers only allow sound after a first
   click or key press, so it starts then (unless switched off). Any other sound on the page (audio/video element) fades it
   out within half a second; it fades back in two seconds after the last one stops. */
(function () {
  const KEY = 'wl-ambient', LEVEL = 0.16;
  let ctx = null, master = null, on = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } })();
  let started = false, ducked = false, bubbleTimer = null, chordTimer = null;
  const playing = new Set();
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'amb-btn';
  const label = () => { btn.setAttribute('aria-pressed', String(on)); btn.title = t(on ? 'amb.off' : 'amb.on'); btn.innerHTML = `<span aria-hidden="true">${on ? '♪' : '♪̸'}</span><small>${t(on ? 'amb.state.on' : 'amb.state.off')}</small>`; btn.setAttribute('aria-label', t(on ? 'amb.off' : 'amb.on')); };
  function noiseBuffer(sec, brown) {
    const n = ctx.sampleRate * sec, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function reverb() {
    const c = ctx.createConvolver(), n = ctx.sampleRate * 3.5, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    c.buffer = b; return c;
  }
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const rev = reverb(), wet = ctx.createGain(); wet.gain.value = 0.55; rev.connect(wet); wet.connect(master);
    // ocean bed: brown noise through a slowly breathing low-pass
    const bed = ctx.createBufferSource(); bed.buffer = noiseBuffer(6, true); bed.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.4;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.045; lfoG.gain.value = 180; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    const bedG = ctx.createGain(); bedG.gain.value = 0.55; bed.connect(lp); lp.connect(bedG); bedG.connect(master); bedG.connect(rev); bed.start();
    // a slow pad on a pentatonic scale, changing every ~18 s
    const pad = ctx.createGain(); pad.gain.value = 0.07; const padLp = ctx.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 700;
    pad.connect(padLp); padLp.connect(master); padLp.connect(rev);
    const voices = [0, 1, 2].map(() => { const o = ctx.createOscillator(); o.type = 'triangle'; const g = ctx.createGain(); g.gain.value = 0.33; o.connect(g); g.connect(pad); o.start(); return o; });
    const CHORDS = [[55, 82.41, 110], [49, 73.42, 98], [58.27, 87.31, 116.54], [43.65, 65.41, 98], [51.91, 77.78, 103.83]];
    let ci = 0;
    const chord = () => { const c = CHORDS[ci++ % CHORDS.length], now = ctx.currentTime; voices.forEach((o, i) => { o.frequency.setTargetAtTime(c[i] * (1 + (Math.random() - .5) * .004), now, 4); }); chordTimer = setTimeout(chord, 16000 + Math.random() * 6000); };
    chord();
    // bubbles: short upward chirps, sometimes in little strings
    const bub = () => {
      const now = ctx.currentTime, n = Math.random() < .3 ? 2 + Math.floor(Math.random() * 5) : 1;
      for (let k = 0; k < n; k++) {
        const t0 = now + k * (0.05 + Math.random() * 0.12), f0 = 300 + Math.random() * 500, dur = 0.04 + Math.random() * 0.07;
        const o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * 2; bp.Q.value = 3;
        o.type = 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (2 + Math.random()), t0 + dur);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.05, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(bp); bp.connect(g); g.connect(master); g.connect(rev); o.start(t0); o.stop(t0 + dur + 0.05);
      }
      bubbleTimer = setTimeout(bub, 600 + Math.random() * 3200);
    };
    bub();
  }
  const ramp = (v, sec) => { if (!master) return; const now = ctx.currentTime; master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.linearRampToValueAtTime(v, now + sec); };
  const target = () => (on && !ducked && !document.hidden ? LEVEL : 0);
  function start() {
    if (!on) return;
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();
    started = true; ramp(target(), 3);
  }
  function set(v) { on = v; try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {} label(); if (on) start(); else ramp(0, 0.6); }
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(!on); });
  // first interaction anywhere starts it (browsers block sound before that)
  const first = () => { if (!started && on) start(); };
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, first, { capture: true, passive: true }));
  // fade out while any other sound plays
  document.addEventListener('play', (e) => { playing.add(e.target); ducked = true; ramp(0, 0.4); }, true);
  const off = (e) => { playing.delete(e.target); setTimeout(() => { [...playing].forEach((m) => { if (m.paused || m.ended) playing.delete(m); }); if (!playing.size) { ducked = false; ramp(target(), 2); } }, 300); };
  document.addEventListener('pause', off, true); document.addEventListener('ended', off, true);
  document.addEventListener('visibilitychange', () => ramp(target(), document.hidden ? 0.3 : 2));
  I18N.ready.then(() => { label(); const bar = document.querySelector('.toc'); if (bar) bar.append(btn); });
})();
