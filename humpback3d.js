/* A humpback whale in slow motion for the chapter cards. Procedural anatomy (14 m adult, 4.5 m calf): knobbly rostrum,
   throat grooves, small dorsal fin on a hump, very long white pectoral fins with a tubercled leading edge, broad flukes
   with a serrated trailing edge. Swims with an up-and-down fluke beat, always nose first. Four scenes, each faded in and
   out: a breach on a ballistic arc (real gravity, shown at 0.3x), a fluke-up dive after a blow, a mother with her calf,
   and three whales seen from below against the bright surface. Renders only while visible. */
(function () {
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };

  /* ---------- the animal: one mesh, nose at +x, built at length L ---------- */
  function buildWhale(L, seed) {
    const P = [], C = [], U = [], PART = [], I = [];
    const DARK = [.07, .08, .095], GREY = [.2, .22, .25], WHITE = [.86, .88, .9];
    const add = (x, y, z, col, u, part) => { P.push(x, y, z); C.push(...col); U.push(u); PART.push(part); return P.length / 3 - 1; };
    // body: rings from rostrum tip (u=0) to tail stock (u=1)
    const RINGS = 44, SEG = 28;
    const h = (u) => u < .03 ? .012 + u * 1.4 : u < .35 ? .054 + .072 * sst(.03, .35, u) : u < .62 ? .126 - .045 * sst(.35, .62, u) : .081 - .066 * sst(.62, 1, u);
    const wq = (u) => u < .7 ? 1.08 : 1.08 - .62 * sst(.7, 1, u);                 // tail stock is narrow side to side
    for (let i = 0; i <= RINGS; i++) {
      const u = Math.pow(i / RINGS, 1.08), x = (.5 - u) * L, hr = h(u) * L, wr = hr * wq(u);
      const hump = u > .55 && u < .75 ? Math.sin((u - .55) / .2 * Math.PI) * .012 * L : 0;   // the hump that gives the species its name
      for (let s = 0; s < SEG; s++) {
        const a = s / SEG * TAU, sy = Math.sin(a), cz = Math.cos(a);
        let y = sy * hr, z = cz * wr;
        if (u < .16 && sy > 0) y *= .55 + .45 * u / .16;                                    // flat, broad head from above
        if (u > .06 && u < .48 && sy < 0) {                                                   // throat with ventral grooves
          y *= 1.12; const g = Math.sin(a * 46) * .0018 * L * Math.sin((u - .06) / .42 * Math.PI); y += g; z += g * .4;
        }
        if (u < .2 && sy > .3) y += (vnoise(u * 60 + seed, a * 9) > .78 ? .006 * L : 0);   // tubercles ("knobs") on the head
        if (sy > 0) y += hump * sy;
        const belly = clamp(-sy * 1.6 - .1, 0, 1), mottle = vnoise(u * 9 + seed * 3, a * 3) * vnoise(u * 23, a * 7);
        const w = clamp(belly * (u > .08 && u < .55 ? .95 : .35) * (.4 + mottle * 1.3), 0, 1);
        const col = [0, 1, 2].map((k) => DARK[k] + (GREY[k] - DARK[k]) * sst(.2, -.4, sy) + (WHITE[k] - DARK[k]) * w * .8);
        add(x, y, z, col, u, 0);
      }
    }
    for (let i = 0; i < RINGS; i++) for (let s = 0; s < SEG; s++) { const a = i * SEG + s, b = i * SEG + (s + 1) % SEG; I.push(a, a + SEG, b, b, a + SEG, b + SEG); }
    const tipN = add(.5 * L + .004 * L, -.004 * L, 0, DARK, 0, 0); for (let s = 0; s < SEG; s++) I.push(tipN, (s + 1) % SEG, s);
    const tailRing = RINGS * SEG, tipT = add(-.5 * L - .01 * L, 0, 0, DARK, 1, 0); for (let s = 0; s < SEG; s++) I.push(tipT, tailRing + s, tailRing + (s + 1) % SEG);
    // a flat blade from a list of chord sections [pos(x,y,z), along-chord vector, half chord, half thickness]
    const blade = (secs, col, part, uOf) => {
      const base = P.length / 3, N = 8;
      secs.forEach(([p, ch, hc, th]) => {
        for (let k = 0; k < N; k++) { const a = k / N * TAU, cc = Math.cos(a), ss = Math.sin(a);
          add(p[0] + ch[0] * hc * cc, p[1] + ch[1] * hc * cc + ss * th, p[2] + ch[2] * hc * cc, typeof col === 'function' ? col(cc, ss) : col, uOf(p), part); }
      });
      for (let i = 0; i < secs.length - 1; i++) for (let k = 0; k < N; k++) { const a = base + i * N + k, b = base + i * N + (k + 1) % N; I.push(a, a + N, b, b, a + N, b + N); }
    };
    // pectoral fins: a third of the body long, white, tubercles on the leading edge, swept back and down
    [1, -1].forEach((side) => {
      const secs = [], n = 14, root = [.5 * L - .3 * L, -.055 * L, side * .07 * L];
      for (let i = 0; i <= n; i++) {
        const t = i / n, len = .31 * L * t;
        const p = [root[0] - len * .62, root[1] - len * .52 - t * t * .03 * L, root[2] + side * len * .58];
        const bump = (Math.sin(t * 38) > .55 ? .006 * L : 0) * (1 - t);
        const hc = (.045 * (1 - t) + .008) * L + bump, th = .009 * L * (1 - t * .7);
        secs.push([p, [-.86, .1, side * .5], hc, th]);
      }
      blade(secs, (cc, ss) => ss > 0 ? [.6, .63, .66] : WHITE, 2, () => .3);
    });
    // dorsal fin: small, on the hump
    { const u = .66, x = (.5 - u) * L, top = h(u) * L + .012 * L; const a = add(x + .05 * L, top - .01 * L, 0, DARK, u, 0), b = add(x - .03 * L, top + .035 * L, 0, DARK, u, 0), c = add(x - .06 * L, top - .005 * L, 0, DARK, u, 0), d = add(x, top - .02 * L, .012 * L, DARK, u, 0), e = add(x, top - .02 * L, -.012 * L, DARK, u, 0); I.push(a, b, d, b, c, d, a, e, b, b, e, c); }
    // flukes: broad, swept back, serrated trailing edge, median notch; underside white with a personal black pattern
    [1, -1].forEach((side) => {
      const secs = [], n = 14;
      for (let i = 0; i <= n; i++) {
        const t = i / n, span = .17 * L * t, sweep = -.045 * L * t * t;
        const serr = (Math.sin(t * 31 + seed) > .4 ? .006 * L : 0) * t;
        const hc = (.05 * (1 - t * .85) + .004) * L - serr * .5;
        secs.push([[-.5 * L - .02 * L + sweep - hc * .3, 0, side * (span + .004 * L)], [1, 0, 0], hc, .009 * L * (1 - t * .8)]);
      }
      blade(secs, (cc, ss) => ss > 0 ? DARK : (vnoise(cc * 3 + seed, side * 2 + ss) > .55 ? WHITE : DARK), 3, () => 1);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .42, metalness: .05 }));
    mesh.userData = { base: Float32Array.from(P), U: Float32Array.from(U), PART: Uint8Array.from(PART), L, phase: Math.random() * TAU };
    return mesh;
  }
  // fluke beat: dorso-ventral wave growing towards the tail; flukes pitch with the slope of the tail; fins sway slowly
  function swim(mesh, t, amp, period) {
    const { base, U, PART, L, phase } = mesh.userData, p = mesh.geometry.attributes.position.array, w = TAU / period;
    const dy = (u) => amp * L * Math.pow(u, 2.4) * Math.sin(w * t + phase - u * 2.6);
    const tailY = dy(1), slope = (dy(1) - dy(.97)) / (.03 * L), ang = Math.atan(slope) * 2.2, px = -.5 * L, ca = Math.cos(ang), sa = Math.sin(ang);
    const fin = Math.sin(w * t * .5 + phase) * .06;
    for (let i = 0; i < U.length; i++) {
      const o = i * 3, x = base[o], y = base[o + 1], z = base[o + 2];
      if (PART[i] === 3) { const lx = x - px; p[o] = px + lx * ca - y * sa; p[o + 1] = tailY + lx * sa + y * ca; p[o + 2] = z; }
      else if (PART[i] === 2) { p[o] = x; p[o + 1] = y + (Math.abs(z) - .07 * L) * fin + dy(.3); p[o + 2] = z; }
      else { p[o] = x; p[o + 1] = y + dy(U[i]); p[o + 2] = z; }
    }
    mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.computeVertexNormals();
  }

  /* ---------- the world: sky, sea surface, light, particles ---------- */
  function soft() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
  window.humpbackScene = function (host, startScene = 0) {
    if (!window.THREE) return;
    const W = () => host.clientWidth, H = () => host.clientHeight;
    const r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(1.75, devicePixelRatio || 1)); r.setSize(W(), H());
    r.domElement.className = 'wire-canvas'; r.domElement.setAttribute('aria-hidden', 'true'); host.append(r.domElement);
    const fade = document.createElement('div'); fade.className = 'hb-fade'; host.append(fade);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W() / H(), .1, 2000);
    const hemi = new THREE.HemisphereLight(0xcfe6f2, 0x0b1f2a, .9), sun = new THREE.DirectionalLight(0xfff0d8, 1.2); sun.position.set(-40, 80, 30); scene.add(hemi, sun);
    // sea surface: gentle swell, darker and glossier from above, bright and rippled from below
    const seaU = { t: { value: 0 }, under: { value: 0 } };
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 180, 180), new THREE.ShaderMaterial({ uniforms: seaU, side: THREE.DoubleSide, transparent: true,
      vertexShader: `uniform float t; varying vec3 wp; varying float hgt;
        float wv(vec2 p){ return .55*sin(dot(p,vec2(.06,.02))+t*.55)+.35*sin(dot(p,vec2(-.04,.07))+t*.7)+.18*sin(dot(p,vec2(.13,.11))+t*1.2)+.08*sin(dot(p,vec2(.31,-.23))+t*1.9); }
        void main(){ vec3 p=position; float h=wv(p.xy); p.z+=h; hgt=h; vec4 w=modelMatrix*vec4(p,1.); wp=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float t; uniform float under; varying vec3 wp; varying float hgt;
        void main(){ vec3 v=normalize(cameraPosition-wp); float f=pow(1.-abs(v.y),3.);
          vec3 deep=vec3(.02,.09,.12), sky=vec3(.55,.66,.72), lit=vec3(.5,.8,.85);
          vec3 above=mix(deep+hgt*.03, sky, clamp(f*.85,0.,1.));
          float rip=.5+.5*sin(wp.x*.7+t*1.3)*sin(wp.z*.6-t*1.1);
          vec3 below=mix(vec3(.08,.32,.38), lit, .35+.4*rip);
          float d=length(cameraPosition.xz-wp.xz); float a=under>.5? 1.0 : .97;
          gl_FragColor=vec4(under>.5?below:above, a); }` }));
    sea.rotation.x = -Math.PI / 2; scene.add(sea);
    // light shafts under water
    const rays = new THREE.Group(); const rayMat = new THREE.MeshBasicMaterial({ color: 0x9fe8e0, transparent: true, opacity: .06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 + Math.random() * 4, 70), rayMat); m.position.set((Math.random() - .5) * 90, -35, (Math.random() - .5) * 60); m.rotation.set(0, Math.random() * Math.PI, .25); rays.add(m); }
    scene.add(rays);
    // particles: splash/spray (gravity), drifting marine snow
    const tex = soft(), NP = 1400, pp = new Float32Array(NP * 3), pv = new Float32Array(NP * 3), pl = new Float32Array(NP);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const spray = new THREE.Points(pg, new THREE.PointsMaterial({ map: tex, size: .5, transparent: true, depthWrite: false, color: 0xeaf6f8, opacity: .85 })); scene.add(spray);
    let pi = 0; const emit = (x, y, z, vx, vy, vz, life) => { const k = pi++ % NP; pp[k * 3] = x; pp[k * 3 + 1] = y; pp[k * 3 + 2] = z; pv[k * 3] = vx; pv[k * 3 + 1] = vy; pv[k * 3 + 2] = vz; pl[k] = life; };
    for (let k = 0; k < NP; k++) pp[k * 3 + 1] = -999;
    const stepP = (dt) => { for (let k = 0; k < NP; k++) { if (pl[k] <= 0) { pp[k * 3 + 1] = -999; continue; } pl[k] -= dt; pv[k * 3 + 1] -= 9.81 * dt; pp[k * 3] += pv[k * 3] * dt; pp[k * 3 + 1] += pv[k * 3 + 1] * dt; pp[k * 3 + 2] += pv[k * 3 + 2] * dt; if (pp[k * 3 + 1] < -.3) pl[k] = 0; } pg.attributes.position.needsUpdate = true; };
    const SN = 600, snp = new Float32Array(SN * 3); for (let i = 0; i < SN * 3; i++) snp[i] = (Math.random() - .5) * 60;
    const snowG = new THREE.BufferGeometry(); snowG.setAttribute('position', new THREE.BufferAttribute(snp, 3));
    const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ map: tex, size: .12, transparent: true, opacity: .5, depthWrite: false, color: 0xcfe9ee })); scene.add(snow);
    const fogAir = new THREE.Fog(0x8fa6b1, 60, 520), fogSea = new THREE.FogExp2(0x0d4552, .028);
    const skyCol = new THREE.Color(0x8fa6b1), seaCol = new THREE.Color(0x0d4552);
    const adult = buildWhale(14, 1.7), calf = buildWhale(4.6, 4.2), w2 = buildWhale(13, 2.9), w3 = buildWhale(13.5, 6.1);
    [adult, calf, w2, w3].forEach((m) => scene.add(m));
    const place = (m, x, y, z, pitch, roll, yaw = 0) => { m.position.set(x, y, z); m.rotation.set(roll, yaw, pitch, 'YZX'); };
    const setUnder = (u) => { seaU.under.value = u ? 1 : 0; scene.fog = u ? fogSea : fogAir; scene.background = u ? seaCol : skyCol; rays.visible = u; snow.visible = u; hemi.intensity = u ? .55 : .9; sun.intensity = u ? .5 : 1.2; };
    const SLOW = .3, SC = [
      { len: 26, name: 'breach' }, { len: 28, name: 'fluke' }, { len: 26, name: 'calf' }, { len: 24, name: 'group' },
    ];
    let si = startScene % SC.length, sT = 0, splashed = false, blown = false;
    const begin = () => { sT = 0; splashed = false; blown = false; [adult, calf, w2, w3].forEach((m) => { m.visible = false; }); for (let k = 0; k < NP; k++) pl[k] = 0; };
    begin();
    const run = (dt) => {
      const S = SC[si]; sT += dt; const t = sT, st = t * SLOW;          // simulated seconds in slow motion
      fade.style.opacity = String(Math.max(sst(1.2, 0, t), sst(S.len - 1.4, S.len, t)));
      seaU.t.value += dt * SLOW * 2;
      if (S.name === 'breach') {
        setUnder(false); adult.visible = true;
        // approach under water at 50 deg, exit at 8.5 m/s, then a ballistic arc (g = 9.81) while rolling onto the back
        const v0 = 8.5, ang = 1.05, tExit = 2.2, vx = v0 * Math.cos(ang), vy = v0 * Math.sin(ang);
        let x, y, pitch, roll;
        if (st < tExit) { const k = st - tExit; x = vx * k; y = vy * k; pitch = ang; roll = 0; }
        else { const k = st - tExit; x = vx * k; y = vy * k - 4.905 * k * k; const vyN = vy - 9.81 * k; pitch = Math.atan2(vyN, vx) * .85 + .2; roll = Math.min(2.1, k * 1.25); if (y < -1 && k > .5 && !splashed) { splashed = true;
          for (let i = 0; i < 900; i++) { const a = Math.random() * TAU, s = 2 + Math.random() * 9; emit(x + (Math.random() - .5) * 10, .1, (Math.random() - .5) * 5, Math.cos(a) * s * .5, 3 + Math.random() * 12, Math.sin(a) * s * .5, 3); } } }
        if (st > tExit + 1.6) { const k = st - tExit - 1.6; y = Math.min(y, -1 - k * 1.5); }
        place(adult, x, y, 0, pitch, roll); swim(adult, st, .06, 2.2);
        if (st > tExit - .1 && st < tExit + 1.4) for (let i = 0; i < 6; i++) emit(x + (Math.random() - .5) * 3, .2, (Math.random() - .5) * 2, (Math.random() - .5) * 2, 2 + Math.random() * 4, (Math.random() - .5) * 2, 2);
        cam.position.set(4 + t * .15, 2.2, 34); cam.lookAt(3, 4, 0);
      } else if (S.name === 'fluke') {
        setUnder(false); adult.visible = true;
        // cruise at the surface, blow, arch the back and raise the flukes while sliding down
        const sp = 1.8, x = -10 + st * sp; let y = -1.15, pitch = 0;
        if (st > 2.2 && !blown) { blown = true; }
        if (blown && st < 4.2) for (let i = 0; i < 10; i++) emit(x + .5 * 14 * .25 + (Math.random() - .5) * .6, 1.2, (Math.random() - .5) * .6, (Math.random() - .5) * 1.2, 7 + Math.random() * 3, (Math.random() - .5) * 1.2, 1.6);
        const dive = sst(4.5, 8.5, st); pitch = -1.25 * dive; y = -1.15 - 5.2 * dive;
        place(adult, x, y, 0, pitch, 0); swim(adult, st, .05 * (1 - dive * .7), 3.2);
        if (dive > .5 && dive < .99) for (let i = 0; i < 5; i++) { const fx = x - 7 * Math.cos(pitch) + (Math.random() - .5) * 3, fy = y - 7 * Math.sin(pitch); if (fy > 0) emit(fx, fy, (Math.random() - .5) * 4.5, 0, -1, 0, 1.4); }
        cam.position.set(x - 26 + t * .1, 3.2, 26); cam.lookAt(x - 2, 1.5, 0);
      } else if (S.name === 'calf') {
        setUnder(true); adult.visible = true; calf.visible = true;
        const sp = 1.2, x = -14 + st * sp;
        place(adult, x, -14, 0, .03 * Math.sin(st * .4), .05); swim(adult, st, .045, 3.4);
        place(calf, x + 3.6, -9.6, 2.4, .05 * Math.sin(st * .6 + 1), -.08); swim(calf, st, .06, 1.9);
        cam.position.set(x + 2 - 14, -11, 20); cam.lookAt(x + 1, -12, 0);
      } else {
        setUnder(true); adult.visible = true; w2.visible = true; w3.visible = true;
        const sp = 1.5, x = -18 + st * sp;
        place(adult, x, -4, 0, 0, 0); swim(adult, st, .045, 3.0);
        place(w2, x - 9, -6, -8, .02, .05); swim(w2, st + .9, .045, 3.1);
        place(w3, x - 5, -5, 9, -.02, -.04); swim(w3, st + 1.7, .045, 2.9);
        cam.position.set(x - 6, -26, 6); cam.lookAt(x - 2, -2, 0);
      }
      snow.position.copy(cam.position); const a = snowG.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] -= dt * .15; if (a[i] < -30) a[i] = 30; } snowG.attributes.position.needsUpdate = true;
      stepP(dt * SLOW);
      if (t > S.len) { si = (si + 1) % SC.length; begin(); }
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = false, raf = 0, last = 0;
    const loop = (ts) => { if (!visible) return; const dt = last ? Math.min(.05, (ts - last) / 1000) : 0; last = ts; run(dt); r.render(scene, cam); raf = requestAnimationFrame(loop); };
    if (reduce) { si = 3; begin(); run(10); r.render(scene, cam); }
    else new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); last = 0; if (visible) raf = requestAnimationFrame(loop); }).observe(host);
    addEventListener('resize', () => { r.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); });
  };
})();
