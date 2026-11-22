/* Descent story, whale voices, live Orcasound player, archive calendar, review queue.
   Uses paintGrid(), el() and $() from the page script. */
(function () {
  const get = (u) => fetch(u, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Descent ---------- */
  const steps = [...document.querySelectorAll('.step')];
  const fill = $('dg-fill'), val = $('dg-val'), lbl = $('dg-lbl');
  let shown = 0;
  const animate = (to) => {
    if (reduce) { shown = to; val.textContent = `${to} m`; return; }
    const from = shown, t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / 900), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); val.textContent = `${v} m`; if (k < 1) requestAnimationFrame(f); else shown = to; };
    requestAnimationFrame(f);
  };
  const dio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    steps.forEach((x) => x.classList.toggle('on', x === e.target));
    const d = +e.target.dataset.depth; lbl.textContent = e.target.dataset.lbl;
    fill.style.height = `${Math.max(4, d / 891 * 100)}%`; animate(d);
  }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((s) => dio.observe(s));

  /* ---------- Whale voices ---------- */
  let voicesData = null;
  function voices(v) {
    voicesData = v;
    const box = $('voices'); box.replaceChildren();
    const players = [];
    v.clips.forEach((c) => {
      const card = el('article', 'voice');
      const vs = el('div', 'vs'); const cv = document.createElement('canvas'); paintGrid(cv, c.grid);
      const ph = el('div', 'ph'); vs.append(cv, ph, el('span', 'ax', `0–${c.fmax_hz} Hz`));
      const body = el('div', 'body');
      const t0 = new Date(Date.parse(v.hour) + c.start_s * 1000);
      body.append(el('h4', '', c.name),
        el('div', 'meta', `${t0.toISOString().slice(0, 16).replace('T', ' ')} UTC · ${Math.round(c.duration_s)} s${c.speedup > 1 ? ` · played ${c.speedup}× faster` : ''} · model score ${c.peak_score.toFixed(2)}`));
      const audio = new Audio(); audio.preload = 'none'; audio.src = c.audio;
      const btn = el('button', 'play small'); btn.type = 'button';
      const label = () => { btn.innerHTML = ''; btn.append(Object.assign(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), {}), document.createTextNode(audio.paused ? (c.speedup > 1 ? `Hear it ${c.speedup}× faster` : 'Hear it') : 'Pause')); btn.firstChild.setAttribute('viewBox', '0 0 14 14'); btn.firstChild.innerHTML = audio.paused ? '<path d="M2 1 L13 7 L2 13 Z" fill="currentColor"/>' : '<path d="M2 1h3.5v12H2zM8.5 1H12v12H8.5z" fill="currentColor"/>'; btn.firstChild.style.width = '14px'; btn.firstChild.style.height = '14px'; };
      label();
      btn.addEventListener('click', () => { if (audio.paused) { players.forEach((p) => p !== audio && p.pause()); audio.play().catch(() => {}); } else audio.pause(); });
      let raf = 0;
      const tick = () => { const f = audio.currentTime * c.speedup / c.duration_s; ph.style.left = `${Math.min(100, f * 100)}%`; ph.style.opacity = 1; if (!audio.paused) raf = requestAnimationFrame(tick); };
      audio.addEventListener('play', () => { label(); tick(); });
      audio.addEventListener('pause', () => { label(); cancelAnimationFrame(raf); });
      audio.addEventListener('ended', label);
      vs.addEventListener('click', (e) => { const r = vs.getBoundingClientRect(); audio.currentTime = (e.clientX - r.left) / r.width * c.duration_s / c.speedup; tick(); });
      players.push(audio);
      const sc = el('div', 'sc'); sc.append(el('hr'));
      c.scores.forEach(([t, p]) => { const s = el('span'); s.style.left = `${Math.max(0, (t) / c.duration_s * 100)}%`; s.style.width = `${2.5 / c.duration_s * 100}%`; s.style.height = `${Math.max(3, p * 100)}%`; sc.append(s); });
      body.append(btn, sc, el('p', 'note', `Bars: whalu's ${c.name.toLowerCase()} score per window; dashed line 0.5. Picture: the original sound, not sped up.`));
      card.append(vs, body); box.append(card);
    });
    box.after(el('p', 'note', `Audio: ${v.source}. ${v.note}`));
  }

  /* ---------- Live ---------- */
  const B = 'https://audio-orcasound-net.s3.amazonaws.com';
  const FALLBACK = [['rpi_orcasound_lab', 'Orcasound Lab'], ['rpi_north_sjc', 'North San Juan Channel'], ['rpi_andrews_bay', 'Andrews Bay'], ['rpi_port_townsend', 'Port Townsend'], ['rpi_bush_point', 'Bush Point'], ['rpi_sunset_bay', 'Sunset Bay']];
  function live() {
    const sel = $('live-node'), btn = $('live-play'), audio = $('live-audio'), state = $('live-state'), cv = $('live-spec');
    const fill = (list) => { sel.replaceChildren(); list.forEach(([id, name]) => { const o = new Option(name, id); sel.append(o); }); };
    fill(FALLBACK);
    get('https://live.orcasound.net/api/json/feeds').then((d) => {
      const list = d.data.filter((f) => f.attributes.visible).map((f) => [f.attributes.node_name, f.attributes.name]);
      if (list.length) { list.sort((a, b) => (a[0] === 'rpi_orcasound_lab' ? -1 : b[0] === 'rpi_orcasound_lab' ? 1 : 0)); fill(list); }
    }).catch(() => {});
    const clock = () => { $('live-clock').textContent = new Date().toLocaleTimeString([], { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' }) + ' (Pacific time)'; };
    clock(); setInterval(clock, 30000);
    let hls = null, ctx = null, analyser = null, raf = 0, playing = false;
    const setBtn = () => { btn.querySelector('span').textContent = playing ? 'Stop' : 'Listen live'; btn.querySelector('svg').innerHTML = playing ? '<path d="M2 2h10v10H2z" fill="currentColor"/>' : '<path d="M2 1 L13 7 L2 13 Z" fill="currentColor"/>'; };
    const draw = () => {
      const g = cv.getContext('2d'), W = cv.width = cv.clientWidth * (devicePixelRatio || 1), H = cv.height = cv.clientHeight * (devicePixelRatio || 1);
      const bins = new Uint8Array(analyser.frequencyBinCount), nyq = ctx.sampleRate / 2, maxBin = Math.floor(analyser.frequencyBinCount * Math.min(1, 8000 / nyq));
      g.fillStyle = '#020b10'; g.fillRect(0, 0, W, H);
      const step = () => {
        analyser.getByteFrequencyData(bins);
        g.drawImage(cv, -2, 0);
        for (let y = 0; y < H; y++) {
          const b = Math.floor((1 - y / H) * maxBin), v = bins[b] / 255;
          const [r, gg, bb] = colour(Math.pow(v, 1.4)); g.fillStyle = `rgb(${r},${gg},${bb})`; g.fillRect(W - 2, y, 2, 1);
        }
        if (playing) raf = requestAnimationFrame(step);
      };
      step();
    };
    const stop = () => { playing = false; audio.pause(); if (hls) { hls.destroy(); hls = null; } cancelAnimationFrame(raf); state.textContent = ''; setBtn(); };
    btn.addEventListener('click', async () => {
      if (playing) return stop();
      const node = sel.value; state.textContent = 'Connecting…';
      try {
        const ts = (await (await fetch(`${B}/${node}/latest.txt`, { cache: 'no-store' })).text()).trim();
        const url = `${B}/${node}/hls/${ts}/live.m3u8`;
        if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); const srcN = ctx.createMediaElementSource(audio); analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.5; srcN.connect(analyser); analyser.connect(ctx.destination); }
        await ctx.resume();
        if (window.Hls && Hls.isSupported()) { hls = new Hls({ liveSyncDurationCount: 3 }); hls.loadSource(url); hls.attachMedia(audio); hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) { state.textContent = 'This hydrophone is not streaming right now. Try another one.'; stop(); } }); }
        else if (audio.canPlayType('application/vnd.apple.mpegurl')) audio.src = url;
        else { state.textContent = 'Your browser cannot play the live stream.'; return; }
        await audio.play(); playing = true; setBtn(); state.textContent = `Live from ${sel.options[sel.selectedIndex].text}`; draw();
      } catch (e) { state.textContent = 'Could not reach the stream. Try another hydrophone or later.'; stop(); }
    });
    sel.addEventListener('change', () => { if (playing) { stop(); btn.click(); } });
  }

  /* ---------- Calendar ---------- */
  function calendar(c) {
    const start = new Date('2015-07-01T00:00:00Z'), now = new Date();
    const totalH = Math.floor((now - start) / 3600000);
    const doneDays = new Map(); c.hours.forEach((h) => doneDays.set(h.day, (doneDays.get(h.day) || []).concat(h)));
    const doneH = c.hours.length;
    const tot = {}; c.hours.forEach((h) => Object.entries(h.counts).forEach(([k, n]) => tot[k] = (tot[k] || 0) + n));
    const names = { Mn: 'humpback', Bm: 'blue whale', Bp: 'fin whale', Ba: 'minke', Be: "Bryde's", Oo: 'orca' };
    const found = Object.entries(tot).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${names[k] || k}`).join(', ');
    $('cal-sum').textContent = `${doneH.toLocaleString()} of about ${totalH.toLocaleString()} hours listened to (${(100 * doneH / totalH).toFixed(3)}%). Windows the model scored ≥ 0.5 so far: ${found || 'none'}.`;
    const cal = $('cal'); cal.replaceChildren();
    for (let y = 2015; y <= now.getUTCFullYear(); y++) {
      const row = el('div', 'cal-year'); const days = el('div', 'cal-days');
      const jan1 = new Date(Date.UTC(y, 0, 1)), pad = jan1.getUTCDay();
      for (let i = 0; i < pad; i++) days.append(el('i', 'none'));
      for (let d = new Date(jan1); d.getUTCFullYear() === y; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = d.toISOString().slice(0, 10), i = el('i');
        if (d < start || d > now) i.className = 'none';
        else if (doneDays.has(key)) { i.className = 'on'; const h = doneDays.get(key); i.title = `${key}: ${h.length} hour(s) listened`; }
        days.append(i);
      }
      row.append(el('span', '', String(y)), days); cal.append(row);
    }
    $('cal-legend').replaceChildren(Object.assign(el('span'), { innerHTML: '<i style="background:var(--glow)"></i>Day with at least one hour listened to' }), Object.assign(el('span'), { innerHTML: '<i style="background:rgba(23,70,90,.6)"></i>Not yet' }));
  }

  /* ---------- Review queue ---------- */
  function candidates(list) {
    const box = $('cands'); box.replaceChildren();
    const items = list.slice();
    if (voicesData) voicesData.clips.forEach((c) => items.push({ title: `${c.name}?`, when: new Date(Date.parse(voicesData.hour) + c.start_s * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC', why: `Strongest ${c.name.toLowerCase()} pick of the first hour (score ${c.peak_score.toFixed(2)})`, status: 'not reviewed yet', anchor: '#whales' }));
    if (!items.length) { box.append(el('p', 'note', 'No candidates yet. They appear here once the Pi listens around the clock.')); return; }
    items.forEach((it) => { const c = el('div', 'cand'); c.append(el('span', 'st', it.status), el('b', '', it.title), el('div', 'note', `${it.when} · ${it.why}`)); if (it.anchor) { const a = el('a', '', 'Listen ↑'); a.href = it.anchor; c.append(a); } box.append(c); });
  }

  get('data/voices/voices.json').then(voices).catch(() => { $('voices').append(el('p', 'note', 'The voices could not load.')); })
    .finally(() => get('data/candidates.json').then(candidates).catch(() => candidates([])));
  get('data/calendar.json').then(calendar).catch(() => { $('cal-sum').textContent = 'The calendar could not load.'; });
  live();
})();
