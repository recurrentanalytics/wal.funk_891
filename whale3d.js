/* Low-poly wireframe whales for the chapter cards: a stylised humpback that cruises below a faint water line and every
   ~16 s breaches in slow motion, with a splash. Only renders while visible; static pose with reduced motion. */
(function () {
  function body(kind) {
    // rings along the body (x: 0 nose .. 1 tail stock), elliptical sections; then pectoral fins and flukes
    const RINGS = 15, SEG = 8, L = 6, pos = [], idx = [];
    const prof = (x) => kind === 'orca' ? .5 * Math.pow(Math.sin(Math.PI * Math.min(1, x * 1.05)), .9) * (1 - .55 * x) : .42 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(x, .75))), .85) * (1 - .6 * x);
    for (let i = 0; i <= RINGS; i++) {
      const x = i / RINGS, r = Math.max(.03, prof(x)), cx = (x - .5) * L;
      for (let s = 0; s < SEG; s++) { const a = s / SEG * Math.PI * 2; pos.push(cx, Math.sin(a) * r * (kind === 'orca' ? 1.05 : .9) - (Math.sin(a) < 0 ? r * .15 : 0), Math.cos(a) * r); }
    }
    for (let i = 0; i < RINGS; i++) for (let s = 0; s < SEG; s++) { const a = i * SEG + s, b = i * SEG + (s + 1) % SEG, c = a + SEG, d = b + SEG; idx.push(a, c, b, b, c, d); }
    const tip = (x, y, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
    const nose = tip(-L / 2 - .15, -.05, 0); for (let s = 0; s < SEG; s++) idx.push(nose, s, (s + 1) % SEG);
    const tailC = RINGS * SEG;
    // flukes
    const f1 = tip(L / 2 + .9, .05, 1.35), f2 = tip(L / 2 + .9, .05, -1.35), f0 = tip(L / 2 + .55, .02, 0), fb = tip(L / 2 + .2, 0, 0);
    idx.push(tailC, fb, tailC + 2, fb, f1, f0, fb, f0, f2, tailC + 6, fb, tailC + 4);
    // pectoral fins (long on a humpback)
    const pl = kind === 'orca' ? .9 : 2.0, pr = 4 * SEG;
    const p1 = tip(-1.2 + pl * .5, -.45, .55 + pl), p2 = tip(-1.2 + pl * .5, -.45, -.55 - pl);
    idx.push(pr + 2, pr + SEG + 2, p1, pr + 6, pr + SEG + 6, p2);
    // dorsal fin (tall triangle for an orca, a small hump otherwise)
    const dh = kind === 'orca' ? 1.3 : .25, dr = 9 * SEG;
    const dt = tip(.6, prof(.6) + dh, 0); idx.push(dr, dr + SEG, dt);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return g;
  }
  window.wireWhale = function (host, kind = 'humpback') {
    if (!window.THREE) return;
    const W = () => host.clientWidth, H = () => host.clientHeight;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.setSize(W(), H()); host.append(r.domElement);
    r.domElement.className = 'wire-canvas'; r.domElement.setAttribute('aria-hidden', 'true');
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, W() / H(), .1, 100); cam.position.set(2, 1.2, 15); cam.lookAt(2, .6, 0);
    const geo = body(kind), base = geo.attributes.position.array.slice();
    const whale = new THREE.Group();
    const lines = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x5ee6d7, transparent: true, opacity: .75 }));
    const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x03141c, transparent: true, opacity: .55, side: THREE.DoubleSide }));
    whale.add(fill, lines); scene.add(whale);
    // the water line: a faint grid seen nearly edge-on
    const sea = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.PlaneGeometry(60, 18, 30, 6)), new THREE.LineBasicMaterial({ color: 0x5ee6d7, transparent: true, opacity: .12 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(2, 0, -2); scene.add(sea);
    // splash particles
    const SN = 160, sp = new Float32Array(SN * 3), sv = []; for (let i = 0; i < SN; i++) sv.push([0, 0, 0]);
    const splashG = new THREE.BufferGeometry(); splashG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const splash = new THREE.Points(splashG, new THREE.PointsMaterial({ color: 0xbff7ef, size: .09, transparent: true, opacity: 0 })); scene.add(splash);
    let splashT = -1;
    const boom = (x) => { splashT = 0; for (let i = 0; i < SN; i++) { sp[i * 3] = x + (Math.random() - .5) * 2; sp[i * 3 + 1] = 0; sp[i * 3 + 2] = (Math.random() - .5) * 1.5; const a = Math.random() * Math.PI, v = 2 + Math.random() * 4; sv[i] = [Math.cos(a) * v * .5, Math.sin(a) * v + 2, (Math.random() - .5) * 2]; } };
    const CYCLE = 16, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = false, raf = 0, t0 = performance.now(), last = 0, splashed = false;
    const pose = (tt) => {
      const u = (tt % CYCLE) / CYCLE, flex = Math.sin(tt * 1.6);
      // gentle tail beat: bend vertices behind the middle
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const x = base[i]; const k = Math.max(0, x) / 3; p[i + 1] = base[i + 1] + Math.sin(tt * 1.6 - x * .6) * .18 * k * k; }
      geo.attributes.position.needsUpdate = true; lines.geometry.dispose(); lines.geometry = new THREE.WireframeGeometry(geo);
      if (u < .45) { const s = u / .45; whale.position.set(-6 + s * 7, -1.7 + Math.sin(tt) * .08, 0); whale.rotation.set(0, 0, .04 * flex); splashed = false; }
      else if (u < .72) {
        const s = (u - .45) / .27, arc = Math.sin(s * Math.PI);
        whale.position.set(1 + s * 3.2, -1.7 + arc * 4.0, 0);
        whale.rotation.set(s * Math.PI * .8, 0, -.9 + s * 1.9);          // twist and fall on its side, like a humpback
        if (s > .82 && !splashed) { splashed = true; boom(whale.position.x); }
      } else { const s = (u - .72) / .28; whale.position.set(4.2 + s * 6, -1.8 - s * .4, 0); whale.rotation.set(Math.PI * .8 * (1 - s), 0, 1 * (1 - s)); }
      if (splashT >= 0) {
        const dt = .016; splashT += dt; splash.material.opacity = Math.max(0, .9 - splashT * .6);
        for (let i = 0; i < SN; i++) { sv[i][1] -= 9.8 * dt; sp[i * 3] += sv[i][0] * dt; sp[i * 3 + 1] = Math.max(-.2, sp[i * 3 + 1] + sv[i][1] * dt); sp[i * 3 + 2] += sv[i][2] * dt; }
        splashG.attributes.position.needsUpdate = true; if (splashT > 1.6) splashT = -1;
      }
    };
    const loop = (ts) => { if (!visible) return; if (ts - last > 30) { last = ts; pose((ts - t0) / 1000); r.render(scene, cam); } raf = requestAnimationFrame(loop); };
    if (reduce) { pose(CYCLE * .55); r.render(scene, cam); }
    else new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(loop); }).observe(host);
    addEventListener('resize', () => { r.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); if (reduce) r.render(scene, cam); });
  };
})();
