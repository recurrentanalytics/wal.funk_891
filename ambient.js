/* Background sound: the live ocean from an Orcasound hydrophone (the feed with the most recent human whale report, else
   Orcasound Lab), played quietly. If no stream works, a generated underwater soundscape (ocean bed, slow chord, bubbles)
   takes over. Switch in the top bar; the choice is remembered. Browsers only allow sound after a first
   click or key press, so it starts then (unless switched off). Any other sound on the page (audio/video element) fades it
   out within half a second; it fades back in two seconds after the last one stops. */
(function () {
  const KEY = 'wl-ambient'; let LEVEL = 0.6;
  const B = 'https://audio-orcasound-net.s3.amazonaws.com';
  let streamEl = null, streamName = '', hls = null;
  let ctx = null, master = null, on = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } })();
  let started = false, ducked = false, bubbleTimer = null, chordTimer = null;
  // which hydrophone: 'auto' (latest human whale report), a node name, or 'synth' (generated sound)
  let node = (() => { try { return localStorage.getItem('wl-amb-node') || 'auto'; } catch (e) { return 'auto'; } })();
  let FEEDS = [['rpi_orcasound_lab', 'Orcasound Lab'], ['rpi_north_sjc', 'North San Juan Channel'], ['rpi_port_townsend', 'Port Townsend'], ['rpi_sunset_bay', 'Sunset Bay'], ['rpi_bush_point', 'Bush Point'], ['rpi_andrews_bay', 'Andrews Bay']];
  let srcNode = null, synth = null, synthSrc = [], VOL = 1;
  const emit = () => document.dispatchEvent(new CustomEvent('wl-ambient', { detail: { on, node, name: streamName, synth: !!synth, loaded: !!(streamName || synth) } }));
  const playing = new Set();
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'amb-btn';
  const label = () => { btn.setAttribute('aria-pressed', String(on)); btn.title = t(on ? 'amb.off' : 'amb.on'); btn.innerHTML = `<span aria-hidden="true">${on ? '≋' : '≋̸'}</span><small>${on && streamName ? t('amb.state.live', { name: streamName }) : t(on ? 'amb.state.on' : 'amb.state.off')}</small>`; if (streamName) btn.title = t(on ? 'amb.off' : 'amb.on') + ' · ' + t('amb.live.note', { name: streamName }); btn.setAttribute('aria-label', t('amb.menu.title')); btn.setAttribute('aria-haspopup', 'menu'); emit(); };
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
  function context() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  }
  async function stream(only) {
    // auto: the feed with the latest human whale report in the last 6 h, else Orcasound Lab; try the others if one is down
    let feeds = FEEDS.slice();
    if (only) feeds = feeds.filter((f) => f[0] === only).concat(feeds.some((f) => f[0] === only) ? [] : [[only, only]]);
    else try {
      const d = await (await fetch('https://live.orcasound.net/api/json/detections?page%5Blimit%5D=50&include=feed&sort=-timestamp&filter%5Bcategory%5D=whale')).json();
      const nodes = Object.fromEntries((d.included || []).map((f) => [f.id, f.attributes.node_name]));
      const hit = d.data.find((r) => r.attributes.source === 'human' && Date.now() - new Date(r.attributes.timestamp) < 6 * 3600e3);
      if (hit) { const n = nodes[hit.relationships.feed.data.id]; feeds.sort((a) => (a[0] === n ? -1 : 1)); }
    } catch (e) {}
    for (const [node, name] of feeds) {
      try {
        const ts = (await (await fetch(`${B}/${node}/latest.txt`, { cache: 'no-store' })).text()).trim();
        if (!/^\d+$/.test(ts)) continue;
        const a = new Audio(); a.crossOrigin = 'anonymous'; a.dataset.ambient = '1';
        const url = `${B}/${node}/hls/${ts}/live.m3u8`;
        if (window.Hls && Hls.isSupported()) { hls = new Hls({ liveSyncDurationCount: 3 }); hls.loadSource(url); hls.attachMedia(a); }
        else if (a.canPlayType('application/vnd.apple.mpegurl')) a.src = url; else return false;
        const src = ctx.createMediaElementSource(a), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 40;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -30; comp.ratio.value = 6;
        src.connect(hp); hp.connect(comp); comp.connect(master); srcNode = src;
        await Promise.race([a.play(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
        streamEl = a; streamName = name; LEVEL = 0.6; label(); return true;
      } catch (e) { if (hls) { hls.destroy(); hls = null; } if (srcNode) { srcNode.disconnect(); srcNode = null; } }
    }
    return false;
  }
  function build() {
    LEVEL = 0.16; synth = ctx.createGain(); synth.connect(master);
    const rev = reverb(), wet = ctx.createGain(); wet.gain.value = 0.55; rev.connect(wet); wet.connect(synth);
    // ocean bed: brown noise through a slowly breathing low-pass
    const bed = ctx.createBufferSource(); bed.buffer = noiseBuffer(6, true); bed.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.4;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.045; lfoG.gain.value = 180; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    const bedG = ctx.createGain(); bedG.gain.value = 0.55; bed.connect(lp); lp.connect(bedG); bedG.connect(synth); bedG.connect(rev); bed.start(); synthSrc.push(bed, lfo);
    // a slow pad on a pentatonic scale, changing every ~18 s
    const pad = ctx.createGain(); pad.gain.value = 0.07; const padLp = ctx.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 700;
    pad.connect(padLp); padLp.connect(synth); padLp.connect(rev);
    const voices = [0, 1, 2].map(() => { const o = ctx.createOscillator(); o.type = 'triangle'; const g = ctx.createGain(); g.gain.value = 0.33; o.connect(g); g.connect(pad); o.start(); synthSrc.push(o); return o; });
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
        o.connect(bp); bp.connect(g); g.connect(synth); g.connect(rev); o.start(t0); o.stop(t0 + dur + 0.05);
      }
      bubbleTimer = setTimeout(bub, 600 + Math.random() * 3200);
    };
    bub();
  }
  function unload() {
    if (streamEl) { streamEl.pause(); streamEl.removeAttribute('src'); } if (hls) { hls.destroy(); hls = null; } if (srcNode) { srcNode.disconnect(); srcNode = null; }
    streamEl = null; streamName = '';
    if (synth) { clearTimeout(bubbleTimer); clearTimeout(chordTimer); synthSrc.forEach((s) => { try { s.stop(); } catch (e) {} }); synthSrc = []; synth.disconnect(); synth = null; }
  }
  async function load() { unload(); let ok = false; if (node !== 'synth') ok = await stream(node === 'auto' ? null : node); if (!ok) build(); label(); }
  // smooth fades: exponential approach, time constant = sec / 4 (about 98 % done after sec)
  const ramp = (v, sec) => { if (!master) return; const now = ctx.currentTime; master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.setTargetAtTime(v, now, Math.max(0.01, sec / 4)); };
  const target = () => (on && !ducked && !document.hidden ? LEVEL * VOL : 0);
  let starting = false;
  async function start() {
    if (!on || starting) return;
    if (!ctx) {
      starting = true; context(); await ctx.resume();
      await load();
      starting = false;
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (streamEl && streamEl.paused) streamEl.play().catch(() => {});
    started = true; ramp(target(), 3);
  }
  function set(v) { on = v; try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {} label(); if (on) start(); else { ramp(0, 0.6); if (streamEl) setTimeout(() => { if (!on) streamEl.pause(); }, 700); } }
  async function setNode(n) { node = n; try { localStorage.setItem('wl-amb-node', n); } catch (e) {} if (!ctx) { set(true); return; } on = true; try { localStorage.setItem(KEY, 'on'); } catch (e) {} starting = true; await load(); starting = false; start(); }
  const menu = document.createElement('div'); menu.className = 'amb-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  let feedsFetched = false;
  function drawMenu() {
    menu.replaceChildren();
    const h = document.createElement('b'); h.textContent = t('amb.menu.title'); menu.append(h);
    const item = (key, text, sub) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitemradio');
      const sel = key === 'off' ? !on : on && node === key; b.setAttribute('aria-checked', String(sel)); b.className = sel ? 'on' : '';
      b.append(document.createTextNode(text)); if (sub) { const s = document.createElement('small'); s.textContent = sub; b.append(s); }
      b.addEventListener('click', () => { menu.hidden = true; if (key === 'off') set(false); else setNode(key); }); menu.append(b); };
    item('off', t('amb.menu.off'));
    item('auto', t('amb.menu.auto'), on && node === 'auto' && streamName ? t('amb.menu.now', { name: streamName }) : t('amb.menu.auto.d'));
    const g = document.createElement('i'); g.textContent = t('amb.menu.live'); menu.append(g);
    FEEDS.forEach(([id, name]) => item(id, name));
    item('synth', t('amb.menu.synth'), t('amb.menu.synth.d'));
    const n = document.createElement('p'); n.textContent = t('amb.menu.note'); menu.append(n);
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); if (!menu.hidden) { menu.hidden = true; return; }
    drawMenu(); const r = btn.getBoundingClientRect(); menu.style.top = (r.bottom + 6) + 'px'; menu.style.right = Math.max(8, innerWidth - r.right) + 'px'; menu.hidden = false;
    if (!feedsFetched) { feedsFetched = true; fetch('https://live.orcasound.net/api/json/feeds').then((r) => r.json()).then((d) => { const l = d.data.filter((f) => f.attributes.visible).map((f) => [f.attributes.node_name, f.attributes.name]); if (l.length) { FEEDS = l.sort((a) => (a[0] === 'rpi_orcasound_lab' ? -1 : 1)); if (!menu.hidden) drawMenu(); } }).catch(() => {}); }
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.hidden = true; });
  window.wlAmbient = { set: (v) => set(v), setNode, setVolume: (v) => { VOL = v; ramp(target(), .3); }, state: () => ({ on, node, name: streamName, synth: !!synth }) };
  // first interaction anywhere starts it (browsers block sound before that)
  const first = () => { if (!started && on) start(); };
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, first, { capture: true, passive: true }));
  // fade out while any other sound plays
  // Many sounds on the page are Audio objects that are not in the document, so their events never reach it.
  // Hook play() itself: every media element announces itself before it starts, and is watched until it stops.
  const watched = new WeakSet();
  const duck = (m) => { if (m.dataset && m.dataset.ambient) return; playing.add(m); ducked = true; ramp(0, 0.25); };
  const release = () => setTimeout(() => {
    [...playing].forEach((m) => { if (m.paused || m.ended) playing.delete(m); });
    if (!playing.size && !tokens.size && ducked) { ducked = false; ramp(target(), 1.5); }
  }, 350);
  const watch = (m) => { if (watched.has(m)) return; watched.add(m); ['pause', 'ended', 'emptied', 'error'].forEach((ev) => m.addEventListener(ev, release)); m.addEventListener('playing', () => duck(m)); };
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (!(this.dataset && this.dataset.ambient)) { watch(this); duck(this); document.dispatchEvent(new CustomEvent('wl-media', { detail: this })); } const p = origPlay.apply(this, arguments); if (p && p.catch) p.catch(() => release()); return p; };
  document.addEventListener('play', (e) => { if (e.target instanceof HTMLMediaElement) { watch(e.target); duck(e.target); } }, true);
  setInterval(() => { if (ducked) release(); }, 2000);   // safety net if a stop event is missed
  // Web Audio players (e.g. the sound microscope) report themselves here
  const tokens = new Set();
  window.wlAmbientLevel = () => (master ? Math.round(master.gain.value * 1000) / 1000 : null);   // read-only, for checking fades
  window.wlDuck = (id, isOn) => { if (isOn) { tokens.add(id); ducked = true; ramp(0, 0.25); } else { tokens.delete(id); release(); } };
  document.addEventListener('visibilitychange', () => ramp(target(), document.hidden ? 0.3 : 2));
  I18N.ready.then(() => { label(); const bar = document.querySelector('.toc'); if (bar) bar.append(btn); document.body.append(menu); });
})();
