/* A humpback whale in slow motion for the chapter cards. Procedural anatomy (14 m adult, 4.5 m calf): knobbly rostrum,
   throat grooves, small dorsal fin on a hump, very long white pectoral fins with a tubercled leading edge, broad flukes
   with a serrated trailing edge. Swims with an up-and-down fluke beat, always nose first. Four scenes, each faded in and
   out: a breach on a ballistic arc (real gravity, shown at 0.3x), a fluke-up dive (0.4x) after a blow, a mother with her calf,
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
    const RINGS = 64, SEG = 36;
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
          y *= 1.12;
        }
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
    const LINES = [], bladeInfo = [];
    const blade = (secs, col, part, uOf) => {
      const base = P.length / 3, N = 8; bladeInfo.push([base, secs.length, N]);
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
    // wireframe as contour lines: cross-section rings and lengthwise lines (dense on the throat: the ventral grooves)
    for (let i = 0; i <= RINGS; i += 2) for (let s = 0; s < SEG; s++) LINES.push(i * SEG + s, i * SEG + (s + 1) % SEG);
    for (let s = 0; s < SEG; s++) { const a = s / SEG * TAU, throat = Math.sin(a) < -.25; if (s % 2 && !throat) continue;
      for (let i = 0; i < RINGS; i++) { const u = i / RINGS; if (throat && s % 2 && (u < .06 || u > .48)) continue; LINES.push(i * SEG + s, (i + 1) * SEG + s); } }
    bladeInfo.forEach(([b0, n, N]) => { for (let i = 0; i < n; i += 2) for (let k = 0; k < N; k += 1) LINES.push(b0 + i * N + k, b0 + i * N + (k + 1) % N);
      [0, N / 2].forEach((k) => { for (let i = 0; i < n - 1; i++) LINES.push(b0 + i * N + k, b0 + (i + 1) * N + k); }); });
    const g = new THREE.BufferGeometry(), posAttr = new THREE.Float32BufferAttribute(P, 3);
    g.setAttribute('position', posAttr); g.setIndex(I);
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x03111a, transparent: true, opacity: .82, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    const nV = P.length / 3, cb = new Float32Array(nV * 3);
    for (let i = 0; i < nV; i++) { const u = U[i], k = L < 8 ? .25 : 0; cb[i * 3] = .25 + .2 * (1 - u) + k; cb[i * 3 + 1] = .75 + .2 * (1 - u) + k * .5; cb[i * 3 + 2] = .85 + .1 * u; }
    const lineCol = new THREE.BufferAttribute(cb.slice(), 3);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', posAttr); lg.setAttribute('color', lineCol); lg.setIndex(LINES);
    mesh.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .78 })));
    const nodes = []; for (let i = 0; i <= RINGS; i += 4) for (let s = 0; s < SEG; s += 3) nodes.push(i * SEG + s);
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', posAttr); ng.setIndex(nodes);
    mesh.add(new THREE.Points(ng, new THREE.PointsMaterial({ color: 0xd8fffa, size: L < 8 ? .07 : .11, transparent: true, opacity: .9 })));
    mesh.userData = { base: Float32Array.from(P), U: Float32Array.from(U), PART: Uint8Array.from(PART), L, phase: Math.random() * TAU, lineCol, colBase: cb };
    return mesh;
  }
  /* Organic motion, after how cetaceans actually swim. The body is a flexible spine sampled along its length:
     1. a base curve: either the body's own bend ("arch", put mostly into the lumbar region and tail stock, the head
        stays stiff; arch > 0 humps the back, < 0 bends the ends up) or a path in the water that every part of the body
        follows in turn, as a whale does when it rolls over the surface into a dive;
     2. the fluke beat: an up-and-down wave travelling from head to tail, A(u) sin(wt - Ku). Its amplitude is small at
        the head (recoil), smallest near the flippers and largest at the flukes (about 0.2 L peak to peak, cetacean
        kinematics after Fish 1998); about one wavelength fits on the body;
     3. the flukes pitch on the tail stock a quarter cycle out of phase with their heave, so they meet the water at an
        angle, as a propulsor does. Out of the water they beat no more and just follow the body. */
  const NS = 72, LW = (() => { const w = (u) => sst(.12, .42, u) * (1 - .35 * sst(.9, 1, u)) * (1 + .8 * sst(.55, .85, u)); const c = [0]; for (let k = 1; k <= NS; k++) c.push(c[k - 1] + w(k / NS)); return c.map((v) => v / c[NS]); })();
  function swim(mesh, t, o) {
    const { base, U, PART, L, phase } = mesh.userData, p = mesh.geometry.attributes.position.array;
    const amp = o.amp == null ? .08 : o.amp, w = TAU / (o.period || 3.4), K = 5.6, arch = o.arch || 0, fin = o.fin == null ? .06 : o.fin, u0 = o.anchor == null ? .4 : o.anchor;
    const bx = new Float32Array(NS + 1), by = new Float32Array(NS + 1), bth = new Float32Array(NS + 1), sx = new Float32Array(NS + 1), sy = new Float32Array(NS + 1), th = new Float32Array(NS + 1), du = L / NS;
    if (o.path) { for (let k = 0; k <= NS; k++) { const q = o.path(o.s - k / NS * L); bx[k] = q[0]; by[k] = q[1]; bth[k] = q[2]; } }
    else {
      const k0 = Math.round(u0 * NS); for (let k = 0; k <= NS; k++) bth[k] = 1.7 * arch * (LW[k] - LW[k0]);
      bx[k0] = o.anchor == null ? (.5 - u0) * L : 0; by[k0] = 0;
      for (let k = k0 + 1; k <= NS; k++) { const a = (bth[k] + bth[k - 1]) / 2; bx[k] = bx[k - 1] - du * Math.cos(a); by[k] = by[k - 1] - du * Math.sin(a); }
      for (let k = k0 - 1; k >= 0; k--) { const a = (bth[k] + bth[k + 1]) / 2; bx[k] = bx[k + 1] + du * Math.cos(a); by[k] = by[k + 1] + du * Math.sin(a); }
    }
    const ph = w * t + phase;
    for (let k = 0; k <= NS; k++) { const u = k / NS, d = amp * L * (.2 - .8 * u + 1.6 * u * u) * Math.sin(ph - K * u); sx[k] = bx[k] - d * Math.sin(bth[k]); sy[k] = by[k] + d * Math.cos(bth[k]); }
    for (let k = 0; k <= NS; k++) { const a = Math.max(0, k - 1), b = Math.min(NS, k + 1); th[k] = Math.atan2(sy[a] - sy[b], sx[a] - sx[b]); }
    const at = (u) => { const f = clamp(u * NS, 0, NS), k = Math.min(NS - 1, Math.floor(f)), r = f - k; return [sx[k] + (sx[k + 1] - sx[k]) * r, sy[k] + (sy[k + 1] - sy[k]) * r, th[k] + (th[k + 1] - th[k]) * r]; };
    const [px3, py3, a3] = at(1), flA = a3 - amp * 3.6 * Math.cos(ph - K) + (o.flukeBend || 0), c3 = Math.cos(flA), s3 = Math.sin(flA);
    const [px2, py2, a2] = at(.3), fs = Math.sin(ph * .5) * fin, c2 = Math.cos(a2), s2 = Math.sin(a2), xr2 = (.5 - .3) * L;
    for (let i = 0; i < U.length; i++) {
      const o3 = i * 3, x = base[o3], y = base[o3 + 1], z = base[o3 + 2];
      if (PART[i] === 3) { const lx = x + .5 * L; p[o3] = px3 + lx * c3 - y * s3; p[o3 + 1] = py3 + lx * s3 + y * c3; p[o3 + 2] = z; }
      else if (PART[i] === 2) { const lx = x - xr2, ly = y + (Math.abs(z) - .07 * L) * fs; p[o3] = px2 + lx * c2 - ly * s2; p[o3 + 1] = py2 + lx * s2 + ly * c2; p[o3 + 2] = z; }
      else { const [cx, cy, a] = at(U[i]), dx = x - (.5 - U[i]) * L, c = Math.cos(a), sn = Math.sin(a); p[o3] = cx + dx * c - y * sn; p[o3 + 1] = cy + dx * sn + y * c; p[o3 + 2] = z; }
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.userData.spine = { head: at(.08), mid: at(.45), tail: [px3, py3, flA] };
    const col = mesh.userData.lineCol; if (col) { const sc = (t * .12) % 1.4 - .2;
      for (let i = 0; i < U.length; i++) { const g = Math.exp(-((U[i] - sc) ** 2) / .0015), b = mesh.userData.colBase; col.array[i * 3] = b[i * 3] + g * .7; col.array[i * 3 + 1] = b[i * 3 + 1] + g * .5; col.array[i * 3 + 2] = b[i * 3 + 2] + g * .4; }
      col.needsUpdate = true; }
  }
  // a path in the x-y plane from its heading angle phi(s): returns s -> [x, y, phi], straight beyond its ends
  function makePath(phi, s0, s1, anchorS, ax, ay) {
    const ds = .05, n = Math.ceil((s1 - s0) / ds), X = new Float32Array(n + 1), Y = new Float32Array(n + 1), F = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) F[i] = phi(s0 + i * ds);
    for (let i = 1; i <= n; i++) { const a = (F[i] + F[i - 1]) / 2; X[i] = X[i - 1] + ds * Math.cos(a); Y[i] = Y[i - 1] + ds * Math.sin(a); }
    const ia = Math.round((anchorS - s0) / ds), ox = ax - X[ia], oy = ay - Y[ia];
    for (let i = 0; i <= n; i++) { X[i] += ox; Y[i] += oy; }
    return (s) => { if (s <= s0) return [X[0] - (s0 - s) * Math.cos(F[0]), Y[0] - (s0 - s) * Math.sin(F[0]), F[0]];
      if (s >= s1) return [X[n] + (s - s1) * Math.cos(F[n]), Y[n] + (s - s1) * Math.sin(F[n]), F[n]];
      const f = (s - s0) / ds, i = Math.min(n - 1, Math.floor(f)), r = f - i; return [X[i] + (X[i + 1] - X[i]) * r, Y[i] + (Y[i + 1] - Y[i]) * r, F[i] + (F[i + 1] - F[i]) * r]; };
  }

  /* ---------- the world: sky, sea surface, light, particles ---------- */
  function soft() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
  window.humpbackScene = function (host, startScene = 0) {
    if (!window.THREE) return;
    const W = () => host.clientWidth, H = () => host.clientHeight;
    const r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(1.75, devicePixelRatio || 1)); r.setSize(W(), H());
    r.domElement.className = 'wire-canvas'; r.domElement.setAttribute('aria-hidden', 'true'); host.append(r.domElement);
    const fade = document.createElement('div'); fade.className = 'hb-fade'; host.append(fade);
    const hud = document.createElement('div'); hud.className = 'hb-hud'; host.append(hud); let hudT = 0; const lastPos = new THREE.Vector3();
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
          vec2 gd=abs(fract(wp.xz/2.5)-.5); float line=smoothstep(.47,.5,max(gd.x,gd.y));
          float d=length(cameraPosition.xz-wp.xz); float fadeD=1.-smoothstep(40.,260.,d);
          vec3 base=under>.5? vec3(.03,.13,.17) : vec3(.016,.05,.07);
          vec3 col=base+vec3(.35,.95,.9)*line*(under>.5?.35:.22)*fadeD + vec3(.2,.5,.5)*f*.15;
          gl_FragColor=vec4(col, under>.5? .9 : .96); }` }));
    sea.rotation.x = -Math.PI / 2; scene.add(sea);
    // light shafts under water
    const rays = new THREE.Group(); const rayMat = new THREE.MeshBasicMaterial({ color: 0x9fe8e0, transparent: true, opacity: .06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2 + Math.random() * 4, 70), rayMat); m.position.set((Math.random() - .5) * 90, -35, (Math.random() - .5) * 60); m.rotation.set(0, Math.random() * Math.PI, .25); rays.add(m); }
    scene.add(rays);
    // particles: splash/spray (gravity), drifting marine snow
    const tex = soft(), NP = 1400, pp = new Float32Array(NP * 3), pv = new Float32Array(NP * 3), pl = new Float32Array(NP);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const spray = new THREE.Points(pg, new THREE.PointsMaterial({ map: tex, size: .35, transparent: true, depthWrite: false, color: 0x9ff6ec, opacity: .8, blending: THREE.AdditiveBlending })); scene.add(spray);
    let pi = 0; const emit = (x, y, z, vx, vy, vz, life) => { const k = pi++ % NP; pp[k * 3] = x; pp[k * 3 + 1] = y; pp[k * 3 + 2] = z; pv[k * 3] = vx; pv[k * 3 + 1] = vy; pv[k * 3 + 2] = vz; pl[k] = life; };
    for (let k = 0; k < NP; k++) pp[k * 3 + 1] = -999;
    const stepP = (dt) => { for (let k = 0; k < NP; k++) { if (pl[k] <= 0) { pp[k * 3 + 1] = -999; continue; } pl[k] -= dt; pv[k * 3 + 1] -= 9.81 * dt; pp[k * 3] += pv[k * 3] * dt; pp[k * 3 + 1] += pv[k * 3 + 1] * dt; pp[k * 3 + 2] += pv[k * 3 + 2] * dt; if (pp[k * 3 + 1] < -.3) pl[k] = 0; } pg.attributes.position.needsUpdate = true; };
    const SN = 600, snp = new Float32Array(SN * 3); for (let i = 0; i < SN * 3; i++) snp[i] = (Math.random() - .5) * 60;
    const snowG = new THREE.BufferGeometry(); snowG.setAttribute('position', new THREE.BufferAttribute(snp, 3));
    const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ map: tex, size: .12, transparent: true, opacity: .5, depthWrite: false, color: 0xcfe9ee })); scene.add(snow);
    const fogAir = new THREE.Fog(0x041018, 40, 300), fogSea = new THREE.FogExp2(0x052029, .03);
    const skyCol = new THREE.Color(0x041018), seaCol = new THREE.Color(0x052029);
    const adult = buildWhale(14, 1.7), calf = buildWhale(4.6, 4.2), w2 = buildWhale(13, 2.9), w3 = buildWhale(13.5, 6.1);
    [adult, calf, w2, w3].forEach((m) => scene.add(m));
    const place = (m, x, y, z, pitch, roll, yaw = 0) => { m.position.set(x, y, z); m.rotation.set(roll, yaw, pitch, 'YZX'); };
    const setUnder = (u) => { seaU.under.value = u ? 1 : 0; scene.fog = u ? fogSea : fogAir; scene.background = u ? seaCol : skyCol; rays.visible = u; snow.visible = u; hemi.intensity = u ? .55 : .9; sun.intensity = u ? .5 : 1.2; };
    const SC = [
      { len: 30, name: 'breach', slow: .3 }, { len: 42, name: 'fluke', slow: .4 }, { len: 26, name: 'calf', slow: .3 }, { len: 24, name: 'group', slow: .3 },
    ];
    // breach: a J-shaped run from depth, straight up the last 1.3 body lengths at 60 deg, leaving the water at 8.5 m/s
    const BA = 1.05, BV = 8.5, BT = 2.6;
    const breachPath = makePath((s) => BA * sst(-30, -18, s), -40, 10, 0, 0, 0);
    // fluke-up dive: the body slides into the water through one entry point E at the surface. Ahead of E it bends down
    // into the dive; behind E the back and tail stock rise in a line that tips up the more of the body has gone under,
    // so the flukes lift clear and then slip in almost vertically where the back went down.
    const EX = 4, EY = -1.25;
    const divePath = (sh) => { const al = 1.2 * sst(3.5, 11.2, sh); return makePath((s) => s < 0 ? -al : -al - (1.32 - al) * sst(0, 5, s), -16, 24, 0, EX, EY); };
    let si = startScene % SC.length, sT = 0, splashed = false, blown = false;
    const begin = () => { sT = 0; splashed = false; blown = false; [adult, calf, w2, w3].forEach((m) => { m.visible = false; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); }); for (let k = 0; k < NP; k++) pl[k] = 0; };
    begin();
    const run = (dt) => {
      const S = SC[si]; sT += dt; const t = sT, st = t * S.slow;          // simulated seconds in slow motion
      fade.style.opacity = String(Math.max(sst(1.2, 0, t), sst(S.len - 1.4, S.len, t)));
      seaU.t.value += dt * S.slow * 2;
      if (S.name === 'breach') {
        setUnder(false); adult.visible = true;
        const k = st - BT, L = 14;
        if (k < 0) {
          // under water: every part follows the J-shaped run, hard strokes with the flukes
          place(adult, 0, 0, 0, 0, 0); swim(adult, st, { path: breachPath, s: BV * k + .5 * L, amp: .12, period: 1.5, fin: .03 });
        } else {
          // airborne centre of mass on a ballistic arc (g = 9.81); the tail keeps beating until it is out, then the body
          // flexes: back bent hollow with head and tail up, pectoral fins flung out, a slow roll onto the side and back
          const vx = BV * Math.cos(BA), vy = BV * Math.sin(BA), x = vx * k, y = vy * k - 4.905 * k * k, vyN = vy - 9.81 * k;
          const out = sst(0, L / BV, k), pitch = Math.atan2(vyN, vx) * .8 + .2 * BA, roll = Math.min(2.2, k * 1.2);
          const archB = -.42 * sst(.2, 1.3, k) + .6 * sst(2.1, 3.2, k);
          if (y < -1 && k > .5 && !splashed) { splashed = true;
            for (let i = 0; i < 900; i++) { const a = Math.random() * TAU, s = 2 + Math.random() * 9; emit(x + (Math.random() - .5) * 10, .1, (Math.random() - .5) * 5, Math.cos(a) * s * .5, 3 + Math.random() * 12, Math.sin(a) * s * .5, 3); } }
          const yy = k > 1.6 ? Math.min(y, -1 - (k - 1.6) * 1.5) : y;
          place(adult, x, yy, 0, pitch, roll); swim(adult, st, { amp: .12 * (1 - out) + .012, period: 1.5 + out * 2, arch: archB, fin: .06 + .3 * out, flukeBend: -.25 * sst(.6, 1.4, k) });
          if (k < 1.4) for (let i = 0; i < 6; i++) emit(x * .4 + (Math.random() - .5) * 3, .2, (Math.random() - .5) * 2, (Math.random() - .5) * 2, 2 + Math.random() * 4, (Math.random() - .5) * 2, 2);
        }
        cam.position.set(4 + t * .15, 2.2, 34); cam.lookAt(3, 4, 0);
      } else if (S.name === 'fluke') {
        setUnder(false); adult.visible = true;
        const sh = -10 + 1.6 * st;
        place(adult, 0, 0, 0, 0, 0);
        swim(adult, st, { path: divePath(sh), s: sh, amp: .07 * (1 - sst(-6, -1, sh)) + .008, period: 3.4, fin: .04, flukeBend: .15 * sst(6, 11, sh) });
        const sp = adult.userData.spine, [tx, ty] = sp.tail;
        if (st > .6 && st < 2.6) for (let i = 0; i < 10; i++) emit(sp.head[0] - 1.6 + (Math.random() - .5) * .6, .9, (Math.random() - .5) * .6, (Math.random() - .5) * 1.2, 7 + Math.random() * 3, (Math.random() - .5) * 1.2, 1.6);
        if (ty > .2 && sh > 6) for (let i = 0; i < 5; i++) emit(tx + (Math.random() - .5) * 1.2, ty + Math.random() * 1.6, (Math.random() - .5) * 4.5, 0, -1, 0, 1.4);
        cam.position.set(EX - 17 + t * .08, 3, 16); cam.lookAt(EX - 2.5, .6, 0);
      } else if (S.name === 'calf') {
        setUnder(true); adult.visible = true; calf.visible = true;
        const sp = 1.2, x = -14 + st * sp;
        place(adult, x, -14, 0, .03 * Math.sin(st * .4), .05); swim(adult, st, { amp: .07, period: 3.4, arch: .06 * Math.sin(st * .35), fin: .08 });
        place(calf, x + 3.6, -9.6, 2.4, .05 * Math.sin(st * .6 + 1), -.08); swim(calf, st, { amp: .1, period: 1.7, arch: .1 * Math.sin(st * .55 + 1), fin: .12 });
        cam.position.set(x + 2 - 14, -11, 20); cam.lookAt(x + 1, -12, 0);
      } else {
        setUnder(true); adult.visible = true; w2.visible = true; w3.visible = true;
        const sp = 1.5, x = -18 + st * sp;
        place(adult, x, -4, 0, 0, 0); swim(adult, st, { amp: .07, period: 3.0, arch: .05 * Math.sin(st * .3), fin: .07 });
        place(w2, x - 9, -6, -8, .02, .05); swim(w2, st + .9, { amp: .07, period: 3.1, arch: .05 * Math.sin(st * .3 + 1), fin: .07 });
        place(w3, x - 5, -5, 9, -.02, -.04); swim(w3, st + 1.7, { amp: .07, period: 2.9, arch: .05 * Math.sin(st * .3 + 2), fin: .07 });
        cam.position.set(x - 6, -26, 6); cam.lookAt(x - 2, -2, 0);
      }
      snow.position.copy(cam.position); const a = snowG.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] -= dt * .15; if (a[i] < -30) a[i] = 30; } snowG.attributes.position.needsUpdate = true;
      stepP(dt * S.slow);
      hudT += dt; if (hudT > .25 && window.I18N) { const m = adult.userData.spine ? adult.localToWorld(new THREE.Vector3(adult.userData.spine.mid[0], adult.userData.spine.mid[1], 0)) : adult.position.clone(); const v = m.distanceTo(lastPos) / hudT / S.slow; lastPos.copy(m); hudT = 0;
        hud.textContent = `${I18N.t('hb.hud.' + S.name)} · Megaptera novaeangliae · L ${I18N.num(14, 1)} m · v ${I18N.num(v, 1)} m/s · z ${I18N.num(lastPos.y, 1)} m · ${I18N.t('hb.hud.slow')}`; }
      if (t > S.len) { si = (si + 1) % SC.length; begin(); }
    };
    host.wlSeek = (i, tt) => { si = i; begin(); run(tt); r.render(scene, cam); adult.updateMatrixWorld(); const g = adult.geometry.attributes.position.array, P = adult.userData.PART, v = new THREE.Vector3(); let fy = -99; for (let k = 0; k < P.length; k++) if (P[k] === 3) fy = Math.max(fy, adult.localToWorld(v.set(g[k * 3], g[k * 3 + 1], g[k * 3 + 2])).y); const w = (q) => { const z = adult.localToWorld(new THREE.Vector3(q[0], q[1], 0)); return [+z.x.toFixed(2), +z.y.toFixed(2)]; }; const s = adult.userData.spine; return { head: w(s.head), mid: w(s.mid), tail: w(s.tail), flukeTop: +fy.toFixed(2) }; };   // for checking poses
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = false, raf = 0, last = 0;
    const loop = (ts) => { if (!visible) return; const dt = last ? Math.min(.05, (ts - last) / 1000) : 0; last = ts; run(dt); r.render(scene, cam); raf = requestAnimationFrame(loop); };
    if (reduce) { si = 3; begin(); run(10); r.render(scene, cam); }
    else new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); last = 0; if (visible) raf = requestAnimationFrame(loop); }).observe(host);
    addEventListener('resize', () => { r.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); });
  };
})();
