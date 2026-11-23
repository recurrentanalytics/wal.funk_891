/* 3D globe of open hydrophone archives, and the 3D sound galaxy. Needs THREE + OrbitControls, d3, topojson. */
(function () {
  const ok = () => window.THREE && THREE.OrbitControls;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stage(host, { autoRotate = true, dist = 3.2, minD = 1.4, maxD = 8, fov = 40 } = {}) {
    host.replaceChildren();
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); host.append(r.domElement);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(fov, 1, 0.01, 100); cam.position.set(0, 0, dist);
    const ctl = new THREE.OrbitControls(cam, r.domElement); ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.minDistance = minD; ctl.maxDistance = maxD; ctl.enablePan = false;
    ctl.autoRotate = autoRotate && !reduce; ctl.autoRotateSpeed = .4; ctl.addEventListener('start', () => { ctl.autoRotate = false; });
    const size = () => { const w = host.clientWidth, h = host.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    size(); new ResizeObserver(size).observe(host);
    let visible = false, raf = 0; const ticks = [];
    const loop = () => { ctl.update(); ticks.forEach((f) => f()); r.render(scene, cam); if (visible) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) loop(); }, { rootMargin: '100px' }).observe(host);
    return { scene, cam, ctl, r, ticks, host };
  }
  const ll2v = (lat, lon, rad = 1) => { const p = (90 - lat) * Math.PI / 180, l = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-rad * Math.sin(p) * Math.cos(l), rad * Math.cos(p), rad * Math.sin(p) * Math.sin(l)); };

  /* ---------------- Globe ---------------- */
  window.makeGlobe = function (host, wd, COL, showInfo) {
    if (!ok()) return null;
    const S = stage(host, { dist: 3.0, minD: 1.07 });
    // texture: ocean + land + graticule drawn with d3 on an equirectangular canvas
    const tc = document.createElement('canvas'); tc.width = 2048; tc.height = 1024; const g = tc.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 1024); grad.addColorStop(0, '#0a3a52'); grad.addColorStop(.5, '#0f4a66'); grad.addColorStop(1, '#0a3a52');
    g.fillStyle = grad; g.fillRect(0, 0, 2048, 1024);
    const proj = d3.geoEquirectangular().translate([1024, 512]).scale(1024 / Math.PI), path = d3.geoPath(proj, g);
    g.strokeStyle = 'rgba(94,230,215,.10)'; g.lineWidth = 1; g.beginPath(); path(d3.geoGraticule().step([15, 15])()); g.stroke();
    const tex = new THREE.CanvasTexture(tc); if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: .9, metalness: 0 }));
    S.scene.add(earth);
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then((r) => r.json()).then((topo) => {
      g.fillStyle = '#3e6f66'; g.strokeStyle = '#8fd8c8'; g.lineWidth = 1.4; g.beginPath(); path(topojson.feature(topo, topo.objects.land)); g.fill(); g.stroke(); tex.needsUpdate = true;
    }).catch(() => {});
    // atmosphere
    const atm = new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: 'varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 n; void main(){ float i = pow(0.75 - dot(n, vec3(0,0,1.0)), 3.0); gl_FragColor = vec4(0.37,0.9,0.84,1.0) * i; }' }));
    S.scene.add(atm);
    S.scene.add(new THREE.HemisphereLight(0xe6fbff, 0x0a2a36, 1.2)); const sun = new THREE.DirectionalLight(0xffffff, .7); sun.position.set(3, 2, 4); S.scene.add(sun);
    // hydrophones
    const groups = {}, pickables = [], rings = [];
    wd.archives.forEach((a) => {
      const grp = new THREE.Group(); groups[a.id] = grp; S.scene.add(grp);
      const col = new THREE.Color(COL[a.status]);
      a.sites.forEach((s) => {
        const p = ll2v(s.lat, s.lon, 1.005);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(a.status === 'used' ? .016 : .009, 12, 10), new THREE.MeshBasicMaterial({ color: col }));
        dot.position.copy(p); dot.userData = { a, s }; grp.add(dot); pickables.push(dot);
        const spike = new THREE.Mesh(new THREE.CylinderGeometry(.0025, .0025, a.status === 'used' ? .12 : .05, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .7 }));
        spike.position.copy(p.clone().multiplyScalar(1 + (a.status === 'used' ? .06 : .025))); spike.lookAt(0, 0, 0); spike.rotateX(Math.PI / 2); grp.add(spike);
        if (a.status === 'used') { const ring = new THREE.Mesh(new THREE.RingGeometry(.02, .026, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide })); ring.position.copy(p); ring.lookAt(0, 0, 0); grp.add(ring); rings.push(ring); }
      });
    });
    const t0 = performance.now();
    S.ticks.push(() => { const tt = (performance.now() - t0) / 1000; rings.forEach((r, i) => { const k = ((tt / 2.5) + i * .3) % 1; r.scale.setScalar(1 + k * 3); r.material.opacity = (1 - k) * .9; }); });
    // start over the Pacific
    S.cam.position.copy(ll2v(30, -140, 3.0)); S.ctl.update();
    // picking
    const ray = new THREE.Raycaster(), m = new THREE.Vector2();
    S.r.domElement.addEventListener('click', (e) => {
      const b = S.r.domElement.getBoundingClientRect(); m.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(m, S.cam); ray.params.Mesh = { threshold: .02 };
      const hit = ray.intersectObjects(pickables.filter((p) => p.visible && p.parent.visible), false)[0]; if (hit) { const u = hit.object.userData; if (u.text) host.dispatchEvent(new CustomEvent('globe-text', { detail: u.text })); else showInfo(u.a, u.s); }
    });
    /* ---- extra layers: currents (NOAA), sightings (GBIF), live detections (Orcasound) ---- */
    const L = { cur: null, sight: new THREE.Group(), det: new THREE.Group() }; S.scene.add(L.sight, L.det);
    function setCurrents(c) {
      const dec = (b64) => { const r = atob(b64), o = new Int8Array(r.length); for (let i = 0; i < r.length; i++) o[i] = (r.charCodeAt(i) << 24) >> 24; return o; };
      const U = dec(c.u), V = dec(c.v), nlat = c.nlat, nlon = c.nlon;
      const at = (lat, lon) => { const i = Math.round((lat - c.lat0) / c.step), j = ((Math.round((lon - c.lon0) / c.step) % nlon) + nlon) % nlon; if (i < 0 || i >= nlat) return null; const k = i * nlon + j; return U[k] === -128 ? null : [U[k] * c.scale, V[k] * c.scale]; };
      const N = host.clientWidth < 600 ? 3000 : 8000, T = 12, LIFE = 150, K = 0.6;
      const pos = new Float32Array(N * (T - 1) * 6), col = new Float32Array(N * (T - 1) * 6), trail = new Float32Array(N * T * 3), P = [];
      const put = (lat, lon, out, o) => { const v = ll2v(lat, lon, 1.004); out[o] = v.x; out[o + 1] = v.y; out[o + 2] = v.z; };
      const spawn = (p, i) => { for (let n = 0; n < 30; n++) { const lat = Math.asin(Math.random() * 1.9 - .95) * 180 / Math.PI, lon = Math.random() * 360 - 180; if (at(lat, lon)) { p.lat = lat; p.lon = lon; break; } } p.age = Math.floor(Math.random() * LIFE); for (let t = 0; t < T; t++) put(p.lat, p.lon, trail, (i * T + t) * 3); };
      for (let i = 0; i < N; i++) { const p = { lat: 0, lon: 0, age: 0, sp: 0 }; P.push(p); spawn(p, i); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      S.scene.add(lines); L.cur = lines;
      const step = () => {
        for (let i = 0; i < N; i++) {
          const p = P[i], uv = at(p.lat, p.lon);
          if (!uv || p.age++ > LIFE || Math.abs(p.lat) > 86) { spawn(p, i); p.age = 0; continue; }
          p.sp = Math.hypot(uv[0], uv[1]); p.lat += uv[1] * K; p.lon += uv[0] * K / Math.max(.2, Math.cos(p.lat * Math.PI / 180));
          trail.copyWithin(i * T * 3, i * T * 3 + 3, (i + 1) * T * 3); put(p.lat, p.lon, trail, (i * T + T - 1) * 3);
          const b = Math.min(1, .38 + p.sp * 2.4);
          for (let t = 0; t < T - 1; t++) {
            const o = (i * (T - 1) + t) * 6, src = (i * T + t) * 3;
            for (let q = 0; q < 6; q++) pos[o + q] = trail[src + q];
            const f0 = b * t / T, f1 = b * (t + 1) / T;
            col[o] = .45 * f0; col[o + 1] = .95 * f0; col[o + 2] = f0; col[o + 3] = .45 * f1; col[o + 4] = .95 * f1; col[o + 5] = f1;
          }
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      };
      for (let w = 0; w < 14; w++) step();
      if (!reduce) S.ticks.push(() => { if (lines.visible) step(); });
    }
    function setSightings(list) {
      L.sight.clear();
      list.forEach((o) => { const d = new THREE.Mesh(new THREE.SphereGeometry(.0075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff8fd0 })); d.position.copy(ll2v(o.lat, o.lon, 1.006)); d.userData = { text: o.text }; L.sight.add(d); pickables.push(d); });
    }
    function setPoints(name, list, color, r) {
      if (!L[name]) { L[name] = new THREE.Group(); S.scene.add(L[name]); } L[name].clear();
      list.forEach((o) => { const d = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.alpha == null ? 1 : o.alpha })); d.position.copy(ll2v(o.lat, o.lon, 1.007)); d.userData = { text: o.text }; L[name].add(d); pickables.push(d); });
    }
    function setDetections(list) {
      L.det.clear();
      list.forEach((o) => { const p = ll2v(o.lat, o.lon, 1.008);
        for (let k = 0; k < 2; k++) { const ring = new THREE.Mesh(new THREE.RingGeometry(.03, .037, 40), new THREE.MeshBasicMaterial({ color: 0xff6b5b, transparent: true, side: THREE.DoubleSide, depthWrite: false })); ring.position.copy(p); ring.lookAt(0, 0, 0); L.det.add(ring); rings.push(ring); }
        const d = new THREE.Mesh(new THREE.SphereGeometry(.013, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6b5b })); d.position.copy(p); d.userData = { text: o.text }; L.det.add(d); pickables.push(d); });
    }
    return { highlight(id) { Object.entries(groups).forEach(([k, g2]) => { g2.visible = !id || k === id; }); }, setCurrents, setSightings, setDetections, setPoints,
      flyTo(lat, lon, dist) { S.ctl.autoRotate = false; S.cam.position.copy(ll2v(lat, lon, dist)); S.ctl.update(); },
      show(name, on) { const o = L[name]; if (o) o.visible = on; } };
  };

  /* ---------------- Sound galaxy ---------------- */
  window.makeGalaxy = function (host, a, PAL, onPick) {
    if (!ok() || !a || !a.points3 || !a.points3.length) return null;
    const S = stage(host, { dist: 2.6, minD: .5, maxD: 6, fov: 50 });
    S.scene.fog = new THREE.FogExp2(0x020b10, .18);
    const n = a.points3.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    a.points3.forEach(([x, y, z, c], i) => { pos.set([(x - .5) * 2.4, (y - .5) * 2.4, (z - .5) * 2.4], i * 3); const k = new THREE.Color(PAL[c % PAL.length]); col.set([k.r, k.g, k.b], i * 3); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // soft round sprite
    const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sg = sc.getContext('2d'); const rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(.35, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({ size: .045, map: new THREE.CanvasTexture(sc), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat); S.scene.add(pts);
    S.ticks.push(() => { if (!reduce) pts.rotation.y += .0006; });
    const ray = new THREE.Raycaster(); ray.params.Points = { threshold: .03 }; const m = new THREE.Vector2();
    S.r.domElement.addEventListener('click', (e) => {
      const b = S.r.domElement.getBoundingClientRect(); m.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(m, S.cam); const hit = ray.intersectObject(pts)[0]; if (hit) onPick(a.points3[hit.index]);
    });
    return S;
  };
})();
