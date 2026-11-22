/* 3D scenes: Monterey Canyon sea floor with the MBARI hydrophone, and the one-minute recording as terrain.
   Needs THREE (r128) and THREE.OrbitControls loaded first. Renders only while a scene is on screen. */
(function () {
  if (!window.THREE || !THREE.OrbitControls) {
    document.querySelectorAll('.scene .scene-msg').forEach((m) => { m.textContent = '3D view could not load in this browser.'; });
    return;
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const get = (u) => fetch(u, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

  function makeScene(host, opts) {
    host.querySelector('.scene-msg')?.remove();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setClearColor(opts.bg || 0x020b10);
    host.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(opts.bg || 0x020b10, opts.fogNear || 200, opts.fogFar || 900);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.autoRotate = !reduce && !!opts.autoRotate; controls.autoRotateSpeed = 0.35;
    controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = opts.minD || 40; controls.maxDistance = opts.maxD || 1200;
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    const labels = [];
    const size = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    size(); new ResizeObserver(size).observe(host);
    let visible = false, raf = 0;
    const v = new THREE.Vector3();
    const loop = () => {
      controls.update(); opts.tick && opts.tick();
      renderer.render(scene, camera);
      labels.forEach(({ el, pos }) => {
        v.copy(pos).project(camera);
        const hide = v.z > 1 || v.z < -1;
        el.style.display = hide ? 'none' : '';
        el.style.left = `${(v.x * .5 + .5) * host.clientWidth}px`; el.style.top = `${(-v.y * .5 + .5) * host.clientHeight}px`;
      });
      if (visible) raf = requestAnimationFrame(loop);
    };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) loop(); }, { rootMargin: '100px' }).observe(host);
    const label = (text, pos, cls) => { const el = document.createElement('div'); el.className = 'scene-label' + (cls ? ' ' + cls : ''); el.textContent = text; host.append(el); labels.push({ el, pos }); };
    return { scene, camera, controls, renderer, label };
  }

  /* ---------- Sea floor ---------- */
  function bathy(b) {
    const host = document.getElementById('bathy3d');
    const raw = atob(b.int16_le_b64_rowmajor_north_first), buf = new ArrayBuffer(raw.length), u8 = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const z = new Int16Array(buf), C = b.cols, R = b.rows;
    const midLat = b.north - R * b.cell_deg / 2;
    const kmX = b.cell_deg * 111.32 * Math.cos(midLat * Math.PI / 180), kmY = b.cell_deg * 110.57;
    const W = (C - 1) * kmX, H = (R - 1) * kmY;               // km
    const EX = 3, mToKm = (m) => m / 1000 * EX;                // vertical exaggeration
    const S = 6;                                               // scene units per km
    const { scene, camera, controls, label } = makeScene(host, { autoRotate: true, fogNear: 300, fogFar: 1400, minD: 60, maxD: 900 });
    const geo = new THREE.PlaneGeometry(W * S, H * S, C - 1, R - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const deep = new THREE.Color('#06142a'), mid = new THREE.Color('#1d6f8a'), shelf = new THREE.Color('#8fe0d6'), land = new THREE.Color('#5c6b4e'), hi = new THREE.Color('#9a9a7e');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const m = z[i];
      pos.setY(i, mToKm(m) * S);
      if (m >= 0) c.copy(land).lerp(hi, Math.min(1, m / 1200));
      else { const t = Math.min(1, -m / 3300); if (t < .25) c.copy(shelf).lerp(mid, t / .25); else c.copy(mid).lerp(deep, (t - .25) / .75); }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0, flatShading: false })));
    // sea surface
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), new THREE.MeshBasicMaterial({ color: 0x5ee6d7, transparent: true, opacity: .07, depthWrite: false }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = 0.2; scene.add(sea);
    scene.add(new THREE.HemisphereLight(0xbfefff, 0x0a1520, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(-300, 400, 200); scene.add(sun);
    // geographic -> scene
    const toXZ = (lat, lng) => {
      const col_ = (lng - b.west) / b.cell_deg, row_ = (b.north - lat) / b.cell_deg;
      return [(col_ * kmX - W / 2) * S, (row_ * kmY - H / 2) * S];
    };
    // hydrophone
    const [hx, hz] = toXZ(36.7125, -122.1868), hy = mToKm(-891) * S;
    const amber = 0xffb547;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(3.2, 24, 16), new THREE.MeshBasicMaterial({ color: amber }));
    dot.position.set(hx, hy + 2, hz); scene.add(dot);
    const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(hx, hy + 2, hz), new THREE.Vector3(hx, 4, hz)]), new THREE.LineDashedMaterial({ color: amber, dashSize: 3, gapSize: 3 }));
    cable.computeLineDistances(); scene.add(cable);
    const rings = [0, 1, 2].map((k) => { const r = new THREE.Mesh(new THREE.RingGeometry(3, 3.6, 48), new THREE.MeshBasicMaterial({ color: amber, transparent: true, side: THREE.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(hx, hy + 1.5, hz); r.userData.k = k; scene.add(r); return r; });
    const t0 = performance.now();
    const pulse = () => { const t = (performance.now() - t0) / 1000; rings.forEach((r) => { const p = ((t / 3 + r.userData.k / 3) % 1); const s = 1 + p * 14; r.scale.set(s, s, s); r.material.opacity = (1 - p) * .7; }); };
    label('MBARI hydrophone · 891 m', new THREE.Vector3(hx, hy + 12, hz), 'amber');
    [['Monterey', 36.6, -121.89], ['Santa Cruz', 36.97, -122.03], ['Moss Landing', 36.80, -121.79]].forEach(([n, la, lo]) => { const [x, zz] = toXZ(la, lo); label(n, new THREE.Vector3(x, 10, zz)); });
    const [cx, cz] = toXZ(36.73, -122.02); label('Monterey Canyon', new THREE.Vector3(cx, mToKm(-1300) * S, cz));
    camera.position.set(hx - 260, 260, hz + 330);
    controls.target.set(hx * .5, hy * .6, hz * .5);
    controls.update();
    // tick hook
    const r0 = controls.update.bind(controls);
    controls.update = () => { pulse(); return r0(); };
  }

  /* ---------- Sound landscape ---------- */
  function land(clip) {
    const host = document.getElementById('land3d');
    const G = clip.grid, F = G.length, T = G[0].length, dur = clip.duration_s;
    const LEN = 240, WID = 90, HGT = 26;
    const { scene, camera, controls, label } = makeScene(host, { autoRotate: false, fogNear: 150, fogFar: 520, minD: 40, maxD: 520 });
    const geo = new THREE.PlaneGeometry(WID, LEN, F - 1, T - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const stops = [[2, 11, 16], [8, 52, 70], [32, 140, 150], [120, 220, 200], [255, 236, 170]].map(([r, g, b2]) => new THREE.Color(r / 255, g / 255, b2 / 255));
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const fi = i % F, ti = Math.floor(i / F);            // x across = frequency (low left), z along = time
      const v = parseInt(G[fi][ti], 16) / 15;
      pos.setY(i, Math.pow(v, 1.6) * HGT);
      const x = Math.min(.999, v) * (stops.length - 1), k = Math.floor(x), f = x - k;
      c.copy(stops[k]).lerp(stops[k + 1], f);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, metalness: .05 }));
    scene.add(mesh);
    scene.add(new THREE.HemisphereLight(0xcff7ff, 0x020b10, .8));
    const key = new THREE.DirectionalLight(0xffffff, .7); key.position.set(80, 120, 60); scene.add(key);
    // call bands on the floor along time
    const zAt = (t) => -LEN / 2 + LEN * (t / dur);
    clip.labels.forEach(([a, d]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4, LEN * d / dur), new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: .85 }));
      m.rotation.x = -Math.PI / 2; m.position.set(-WID / 2 - 5, 0.2, zAt(a + d / 2)); scene.add(m);
    });
    // playhead wall
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(WID + 14, HGT + 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }));
    wall.position.set(-3, (HGT + 12) / 2, zAt(0)); scene.add(wall);
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-WID / 2 - 10, HGT + 12, 0), new THREE.Vector3(WID / 2 + 4, HGT + 12, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff }));
    edge.position.z = zAt(0); scene.add(edge);
    label('0 s', new THREE.Vector3(-WID / 2 - 6, 2, zAt(0)));
    label(`${Math.round(dur)} s`, new THREE.Vector3(-WID / 2 - 6, 2, zAt(dur)));
    label('low pitch', new THREE.Vector3(-WID / 2 + 6, 1, zAt(dur) + 8));
    label('10 kHz', new THREE.Vector3(WID / 2, 1, zAt(dur) + 8));
    label('calls marked by people', new THREE.Vector3(-WID / 2 - 6, 2, zAt(dur * .5)), 'amber');
    const audio = document.getElementById('audio');
    const orig = controls.update.bind(controls);
    controls.update = () => { const z0 = zAt(audio ? audio.currentTime : 0); wall.position.z = z0; edge.position.z = z0; return orig(); };
    camera.position.set(-150, 95, -LEN / 2 - 70);
    controls.target.set(0, 4, 10); controls.update();
  }

  get('data/bathy.json').then(bathy).catch(() => { const m = document.querySelector('#bathy3d .scene-msg'); if (m) m.textContent = 'Sea floor data could not load.'; });
  get('data/clip.json').then(land).catch(() => { const m = document.querySelector('#land3d .scene-msg'); if (m) m.textContent = 'The recording could not load.'; });
})();
