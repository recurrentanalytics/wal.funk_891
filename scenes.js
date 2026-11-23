/* 3D scenes: Monterey Canyon sea floor with the MBARI hydrophone, and the one-minute recording as terrain.
   Needs THREE (r128) and THREE.OrbitControls loaded first. Renders only while a scene is on screen. */
(function () {
  if (!window.THREE || !THREE.OrbitControls) {
    document.querySelectorAll('.scene .scene-msg').forEach((m) => { m.textContent = t('ui.nothree'); });
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

  /* ---------- Sea floor: realistic rendering + a dive along the canyon to the hydrophone ---------- */
  function bathy(b) {
    const host = document.getElementById('bathy3d');
    const raw = atob(b.int16_le_b64_rowmajor_north_first), buf = new ArrayBuffer(raw.length), u8 = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
    const z = new Int16Array(buf), C = b.cols, R = b.rows;
    const midLat = b.north - R * b.cell_deg / 2;
    const kmX = b.cell_deg * 111.32 * Math.cos(midLat * Math.PI / 180), kmY = b.cell_deg * 110.57;
    const W = (C - 1) * kmX, H = (R - 1) * kmY, EX = 3, S = 6;      // km, vertical exaggeration, scene units per km
    const yOf = (m) => m / 1000 * EX * S, mOf = (y) => y / (EX * S) * 1000;
    const o = { autoRotate: true, minD: 1, maxD: 900, bg: 0x0a1a24 };
    const { scene, camera, controls, renderer, label } = makeScene(host, o);
    
    camera.near = 0.05; camera.far = 3000; camera.updateProjectionMatrix(); controls.maxPolarAngle = Math.PI * 0.97;

    /* terrain: albedo from depth, height and slope; a second colour set bakes how water absorbs light when seen from above */
    const geo = new THREE.PlaneGeometry(W * S, H * S, C - 1, R - 1); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, n = pos.count, colTrue = new Float32Array(n * 3), colAbove = new Float32Array(n * 3);
    const mix = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
    const sst = (a, c, x) => { const t = Math.min(1, Math.max(0, (x - a) / (c - a))); return t * t * (3 - 2 * t); };
    const SAND = [.66, .61, .47], MUD = [.33, .36, .38], ROCK = [.17, .18, .2], VEG = [.2, .3, .16], DRY = [.5, .46, .32], BEACH = [.78, .72, .56], WATER = [.02, .16, .24];
    const cellM = kmX * 1000, cellMy = kmY * 1000;
    for (let i = 0; i < n; i++) {
      const c = i % C, r = (i / C) | 0, m = z[i];
      pos.setY(i, m >= 0 ? yOf(m) + .08 : Math.min(yOf(m), -.08));   // keep land and seafloor clear of the water plane: no flicker at the shore
      const dx = (z[r * C + Math.min(C - 1, c + 1)] - z[r * C + Math.max(0, c - 1)]) / (2 * cellM), dy = (z[Math.min(R - 1, r + 1) * C + c] - z[Math.max(0, r - 1) * C + c]) / (2 * cellMy);
      const slope = Math.hypot(dx, dy), h = Math.sin(i * 12.9898) * 43758.5453, noise = .9 + .2 * (h - Math.floor(h));
      let a;
      if (m >= 0) { a = mix(VEG, DRY, sst(0, 900, m)); a = mix(a, ROCK, sst(.25, .7, slope)); if (m < 12) a = mix(BEACH, a, m / 12); }
      else { a = mix(SAND, MUD, sst(0, 1500, -m)); a = mix(a, ROCK, sst(.12, .45, slope)); }
      a = a.map((v) => v * noise);
      colTrue.set(a, i * 3);
      const k = m >= 0 ? 1 : Math.exp(m / 450);                     // light left after travelling down and back up
      colAbove.set(m >= 0 ? a : mix(WATER, a, k), i * 3);
    }
    geo.computeVertexNormals();
    const geoB = geo.clone();
    geo.setAttribute('color', new THREE.BufferAttribute(colAbove, 3)); geoB.setAttribute('color', new THREE.BufferAttribute(colTrue, 3));
    const mat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 });
    const above = new THREE.Mesh(geo, mat()), below = new THREE.Mesh(geoB, mat()); below.visible = false; scene.add(above, below);
    /* detail from GMRT at ~50 m (three times finer than the mesh): baked colour (sediment, rock on steep walls, shading in
       gullies) and an object-space normal map, so slides, gullies and the meandering canyon floor catch the light */
    const tl = new THREE.TextureLoader(), aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const tex = (f) => new Promise((ok, no) => tl.load('data/canyon/' + f, (x) => { x.anisotropy = aniso; ok(x); }, undefined, no));
    /* below the 50 m the data resolves, an ASSUMED, procedural texture (labelled on the page): sediment ripples on the
       floor, rough rock and rubble on steep walls. Seamless 512 px tile, repeated every ~400 m, computed here. */
    const detail = (() => {
      const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), im = g.createImageData(N, N);
      const waves = []; for (let k = 0; k < 28; k++) { const f = 1 + Math.floor(Math.pow(Math.random(), 1.6) * 60), a = Math.random() * Math.PI * 2; waves.push([Math.round(Math.cos(a) * f), Math.round(Math.sin(a) * f), Math.random() * 6.283, 1 / f]); }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const u = x / N * 6.283, v = y / N * 6.283; let h = 0;
        for (const [fx, fy, p, w] of waves) h += Math.sin(fx * u + fy * v + p) * w;
        const rip = Math.sin(18 * u + 2 * Math.sin(3 * v) + 1.3 * Math.sin(2 * u + 5 * v)) * .12;   // sediment ripples
        const val = Math.max(0, Math.min(255, 128 + 52 * h + 26 * rip)), o = (y * N + x) * 4;
        im.data[o] = im.data[o + 1] = im.data[o + 2] = val; im.data[o + 3] = 255;
      }
      g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; return t;
    })();
    const REP = (W * 1000 / 400).toFixed(1);
    const addDetail = (m, strength) => {
      m.extensions = { derivatives: true };
      m.onBeforeCompile = (sh) => {
        sh.uniforms.detailMap = { value: detail };
        sh.fragmentShader = 'uniform sampler2D detailMap;\n' + sh.fragmentShader
          .replace('#include <map_fragment>', `#include <map_fragment>
            float dFade = 1.0 - smoothstep(6.0, 40.0, length(vViewPosition)); float dH = texture2D(detailMap, vUv * ${REP}).r; diffuseColor.rgb *= mix(1.0, 0.92 + 0.16 * dH, dFade);`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            if (dFade > 0.0) { vec2 duv = vUv * ${REP}; float h = texture2D(detailMap, duv).r * ${strength.toFixed(3)} * dFade;
              vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); float hx = dFdx(h), hy = dFdy(h);
              vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
              normal = normalize(abs(det) * normal - sign(det) * (hx * r1 + hy * r2)); }`);
      };
    };
    Promise.all([tex('albedo_above.jpg'), tex('albedo_true.jpg'), tex('normal_obj.jpg')]).then(([ta, tt, tn]) => {
      [[above, ta, 0.3], [below, tt, 0.7]].forEach(([m, map, str]) => {
        m.material.dispose();
        m.material = new THREE.MeshStandardMaterial({ map, normalMap: tn, normalMapType: THREE.ObjectSpaceNormalMap, roughness: .92, metalness: 0 });
        addDetail(m.material, str);
      });
    }).catch(() => {});   // the vertex colours stay as a fallback

    /* water surface with moving glints; bright from below */
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S, 1, 1), new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 p; void main(){ p = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float t; varying vec2 p; void main(){ float r = sin(dot(p, vec2(.9,.4))*.55 + t) + sin(dot(p, vec2(-.5,1.1))*.83 - t*1.2) + sin(dot(p, vec2(.3,-.8))*1.37 + t*.7) + sin(dot(p, vec2(1.3,.2))*2.1 - t*1.6); float g = pow(max(0.0, r*.25), 5.0) * .45; if (gl_FrontFacing) gl_FragColor = vec4(vec3(.03,.2,.28) + g*.55, .30 + g*.5); else gl_FragColor = vec4(vec3(.35,.8,.85) + g*.6, .42 + g*.4); }' }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.0; scene.add(water);

    /* light */
    const hemi = new THREE.HemisphereLight(0xdff4ff, 0x1a2a22, .85), sun = new THREE.DirectionalLight(0xfff1d6, 1.35); sun.position.set(-340, 300, 140); scene.add(hemi, sun);
    const lamp = new THREE.SpotLight(0xdff6ff, 0, 60, .62, .7, 1.1); camera.add(lamp); lamp.position.set(0, 0, 0); const lt = new THREE.Object3D(); lt.position.set(0, 0, -1); camera.add(lt); lamp.target = lt; scene.add(camera);
    const fogAir = new THREE.Fog(0x0a1a24, 400, 1600), fogSea = new THREE.FogExp2(0x0b5a66, .02); scene.fog = fogAir;
    const skyC = new THREE.Color(0x0a1a24), shallow = new THREE.Color(0x0e6f78), abyss = new THREE.Color(0x00070c), tmp = new THREE.Color(); scene.background = skyC.clone();

    /* marine snow around the camera, only under water */
    const SN = 1400, sp = new Float32Array(SN * 3); for (let i = 0; i < SN * 3; i++) sp[i] = (Math.random() - .5) * 24;
    const snowG = new THREE.BufferGeometry(); snowG.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xdfeef2, size: .07, transparent: true, opacity: .55, depthWrite: false })); snow.visible = false; scene.add(snow);

    /* places */
    const toXZ = (lat, lon) => [(((lon - b.west) / b.cell_deg) * kmX - W / 2) * S, (((b.north - lat) / b.cell_deg) * kmY - H / 2) * S];
    const HP = [36.7125, -122.1868], [hx, hz] = toXZ(HP[0], HP[1]), hy = yOf(-891), amber = 0xffb547;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.35, 24, 16), new THREE.MeshBasicMaterial({ color: amber })); dot.position.set(hx, hy + .5, hz); scene.add(dot);
    const glow = new THREE.PointLight(amber, 1.4, 14, 1.5); glow.position.set(hx, hy + 1.2, hz); scene.add(glow);
    const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(hx, hy + .5, hz), new THREE.Vector3(hx, 0, hz)]), new THREE.LineDashedMaterial({ color: amber, dashSize: .6, gapSize: .6, transparent: true, opacity: .6 })); cable.computeLineDistances(); scene.add(cable);
    const rings = [0, 1, 2].map((k) => { const r = new THREE.Mesh(new THREE.RingGeometry(.5, .6, 48), new THREE.MeshBasicMaterial({ color: amber, transparent: true, side: THREE.DoubleSide, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(hx, hy + .3, hz); r.userData.k = k; scene.add(r); return r; });
    label(t('canyon.label.hp'), new THREE.Vector3(hx, hy + 3, hz), 'amber');
    [['Monterey', 36.6, -121.89], ['Santa Cruz', 36.97, -122.03], ['Moss Landing', 36.80, -121.79]].forEach(([nm, la, lo]) => { const [x, zz] = toXZ(la, lo); label(nm, new THREE.Vector3(x, 4, zz)); });
    const [cx, cz] = toXZ(36.73, -122.02); label(t('canyon.label.canyon'), new THREE.Vector3(cx, yOf(-1100), cz));

    /* the dive: follow the canyon's deepest line from its head off Moss Landing, then climb to the hydrophone on the ridge */
    const col = (lon) => Math.round((lon - b.west) / b.cell_deg), row = (lat) => Math.round((b.north - lat) / b.cell_deg);
    const world = (c, r, lift) => new THREE.Vector3((c * kmX - W / 2) * S, yOf(Math.min(0, z[r * C + c])) + lift, (r * kmY - H / 2) * S);
    const pts = []; let rr = row(36.802), c0 = col(-121.815), cEnd = col(HP[1]) + 6;
    pts.push(world(c0 + 10, rr, 10), world(c0 + 4, rr, 3));
    for (let c = c0; c > cEnd; c -= 2) { let best = rr, bz = 1e9; for (let q = Math.max(1, rr - 5); q <= Math.min(R - 2, rr + 5); q++) if (z[q * C + c] < bz) { bz = z[q * C + c]; best = q; } rr = best; pts.push(world(c, rr, .42)); }
    const last = pts[pts.length - 1], end = new THREE.Vector3(hx + 1.6, hy + 1.3, hz + 2.4);
    for (let k = 1; k <= 6; k++) { const p = last.clone().lerp(end, k / 6); const cc = Math.min(C - 1, Math.max(0, Math.round((p.x / S + W / 2) / kmX))), rw = Math.min(R - 1, Math.max(0, Math.round((p.z / S + H / 2) / kmY))); p.y = Math.max(p.y, yOf(Math.min(0, z[rw * C + cc])) + .55); pts.push(p); }
    const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal', .5), pathKm = path.getLength() / S;

    /* ASSUMED life and rocks along the route (labelled on the page): everything below is generated, placed only within
       ~300 m of the dive path so it stays light: boulders on steep walls, sea pens on soft mud, fish schools in the upper
       200 m, light shafts near the surface, glowing jellies in the dark. Scale: 1 unit = 167 m across, 55 m vertically. */
    const anims = [];
    {
      const floorAt = (x, zz) => { const fc = (x / S + W / 2) / kmX, fr = (zz / S + H / 2) / kmY, c0 = Math.max(0, Math.min(C - 2, Math.floor(fc))), r0 = Math.max(0, Math.min(R - 2, Math.floor(fr))), tx = fc - c0, ty = fr - r0;
        const v = (cc, r2) => yOf(Math.min(0, z[r2 * C + cc])); const y = v(c0, r0) * (1 - tx) * (1 - ty) + v(c0 + 1, r0) * tx * (1 - ty) + v(c0, r0 + 1) * (1 - tx) * ty + v(c0 + 1, r0 + 1) * tx * ty;
        const sl = Math.hypot(z[r0 * C + c0 + 1] - z[r0 * C + c0], z[(r0 + 1) * C + c0] - z[r0 * C + c0]) / (kmX * 1000); return [y, sl, -mOf(y)]; };
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const P0 = new THREE.Vector3(), T0 = new THREE.Vector3(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), E = new THREE.Euler();
      const spots = (n, fn) => { for (let i = 0; i < n; i++) { const u = rnd(); path.getPointAt(u, P0); path.getTangentAt(u, T0); const side = (rnd() - .5) * 3.6, ax = P0.x - T0.z * side, az = P0.z + T0.x * side; const [y, sl, dep] = floorAt(ax, az); if (dep > 3) fn(ax, y, az, sl, dep, u); } };
      // boulders (3–15 m), more on steep walls
      const rockG = new THREE.IcosahedronGeometry(1, 1); { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { V.fromBufferAttribute(p, i).multiplyScalar(.75 + rnd() * .5); p.setXYZ(i, V.x, V.y, V.z); } rockG.computeVertexNormals(); }
      const rocks = new THREE.InstancedMesh(rockG, new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 1 }), 2200); let nr = 0;
      spots(9000, (x, y, zz, sl) => { if (nr >= 2200 || rnd() > Math.min(.9, .05 + sl * 2.2)) return; const sz = (3 + Math.pow(rnd(), 2.5) * 12) / 167; E.set(rnd() * 6, rnd() * 6, rnd() * 6); Q.setFromEuler(E); M.compose(V.set(x, y - sz * 1.2, zz), Q, new THREE.Vector3(sz, sz * 3.2, sz)); rocks.setMatrixAt(nr++, M); });
      rocks.count = nr; below.add ? scene.add(rocks) : 0; rocks.visible = false;
      // sea pens and sea whips on flat mud deeper than 250 m
      const penG = new THREE.CylinderGeometry(.0015, .004, 1, 5); penG.translate(0, .5, 0);
      const pens = new THREE.InstancedMesh(penG, new THREE.MeshStandardMaterial({ color: 0xe8c9a8, roughness: .8, emissive: 0x2a1a10 }), 2500); let np = 0;
      spots(14000, (x, y, zz, sl, dep) => { if (np >= 2500 || sl > .12 || dep < 250 || rnd() > .5) return; const hgt = (1 + rnd() * 1.5) * .018 * 1.4; E.set((rnd() - .5) * .5, rnd() * 6, (rnd() - .5) * .5); Q.setFromEuler(E); M.compose(V.set(x, y, zz), Q, new THREE.Vector3(1, hgt, 1)); pens.setMatrixAt(np++, M); });
      pens.count = np; scene.add(pens); pens.visible = false;
      // fish schools in the upper 220 m: silvery points swirling around a slowly drifting centre
      const fishTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
      const schools = []; for (let k = 0; k < 6; k++) { let found = null; for (let tr = 0; tr < 60 && !found; tr++) { const u = rnd() * .35; path.getPointAt(u, P0); const d = -mOf(P0.y); if (d > 30 && d < 220) found = P0.clone(); }
        if (!found) continue; const n = 500, a = new Float32Array(n * 3), ph = Array.from({ length: n }, () => [rnd() * 6.28, .3 + rnd() * .7, (rnd() - .5) * .6, .6 + rnd() * .8]);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
        const pts2 = new THREE.Points(g, new THREE.PointsMaterial({ map: fishTex, size: .012, transparent: true, depthWrite: false, color: 0xcfe2e6, opacity: .9 })); pts2.position.copy(found).add(V.set((rnd() - .5) * .6, .1, (rnd() - .5) * .6)); scene.add(pts2); pts2.visible = false;
        schools.push(pts2); anims.push((tt) => { for (let i = 0; i < n; i++) { const [p0, r0, h0, sp] = ph[i], ang = p0 + tt * sp * .5; a[i * 3] = Math.cos(ang) * r0 * .25; a[i * 3 + 1] = h0 * .06 + Math.sin(ang * 2) * .01; a[i * 3 + 2] = Math.sin(ang) * r0 * .12; } g.attributes.position.needsUpdate = true; pts2.rotation.y = tt * .05; }); }
      // light shafts reaching down from the surface over the shallow start of the route
      const shaftM = new THREE.MeshBasicMaterial({ color: 0xbff4ee, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const shafts = new THREE.Group(); for (let i = 0; i < 40; i++) { path.getPointAt(rnd() * .18, P0); const m = new THREE.Mesh(new THREE.PlaneGeometry(.04 + rnd() * .08, 6), shaftM); m.position.set(P0.x + (rnd() - .5) * 2, -3, P0.z + (rnd() - .5) * 2); m.rotation.set(0, rnd() * 3.14, .12); shafts.add(m); }
      scene.add(shafts); shafts.visible = false;
      // glowing jellies and siphonophores in the dark, pulsing
      const jn = 260, ja = new Float32Array(jn * 3), jc = new Float32Array(jn * 3), jph = []; spots(4000, (x, y, zz, sl, dep, u) => { const k = jph.length; if (k >= jn || dep < 400 || rnd() > .2) return; path.getPointAt(u, P0); ja[k * 3] = x; ja[k * 3 + 1] = Math.min(-.2, y + .2 + rnd() * .8); ja[k * 3 + 2] = zz; const c2 = rnd() > .5 ? [.35, .9, 1] : [.75, .45, 1]; jc.set(c2, k * 3); jph.push(rnd() * 6.28); });
      const jg = new THREE.BufferGeometry(); jg.setAttribute('position', new THREE.BufferAttribute(ja.slice(0, jph.length * 3), 3)); jg.setAttribute('color', new THREE.BufferAttribute(jc.slice(0, jph.length * 3), 3));
      const jelly = new THREE.Points(jg, new THREE.PointsMaterial({ map: fishTex, size: .05, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 })); scene.add(jelly); jelly.visible = false;
      anims.push((tt) => { jelly.material.opacity = .55 + .35 * Math.sin(tt * 1.3); const p = jg.attributes.position.array; for (let k = 0; k < jph.length; k++) p[k * 3 + 1] += Math.sin(tt * .7 + jph[k]) * .0004; jg.attributes.position.needsUpdate = true; });
      anims.vis = (under) => { rocks.visible = pens.visible = jelly.visible = shafts.visible = under; schools.forEach((x) => { x.visible = under; }); };
    }
    const hud = document.createElement('div'); hud.className = 'dive-hud'; const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'play small'; btn.textContent = t('canyon.dive');
    const read = document.createElement('div'); read.className = 'dive-read'; hud.append(btn, read); host.append(hud);
    let dive = null; const DUR = 110000, home = { p: new THREE.Vector3(hx - 250, 250, hz + 320), t: new THREE.Vector3(hx * .5, hy * .6, hz * .5) }, hpV = new THREE.Vector3(hx, hy, hz);
    /* stops on the way down: real pictures from these depths (free photos shown directly; videos only load from YouTube
       when someone presses play). The dive waits at each stop until "continue" or 12 s without a video. */
    const STOPS = [
      { depth: 60, img: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Widow_rockfish_in_Soquel_Canyon.jpg/960px-Widow_rockfish_in_Soquel_Canyon.jpg', key: 'rockfish', credit: 'NOAA Fisheries SWFSC · Public domain', page: 'https://commons.wikimedia.org/wiki/File:Widow_rockfish_in_Soquel_Canyon.jpg' },
      { depth: 215, yt: 'liPwCwexyik', key: 'soquel', credit: 'California Department of Fish and Wildlife / MARE, YouTube' },
      { depth: 640, yt: 'm-Get7opYt0', key: 'rovs', credit: '© MBARI, YouTube' },
      { depth: 1000, img: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Scotoplanes_globosa_and_crab_%28cropped%29.jpg', key: 'seapig', credit: 'NOAA/MBARI · CC0', page: 'https://commons.wikimedia.org/wiki/File:Scotoplanes_globosa_and_crab_(cropped).jpg' },
      { end: true, yt: '-fChU9h5YH8', key: 'mars', credit: 'OOI / NSF, ROV Ventana (MBARI), YouTube' },
    ];
    const card = document.createElement('div'); card.className = 'dive-stop'; card.hidden = true; host.append(card);
    let stopTimer = null, ytOn = false;
    const hideStop = () => { card.hidden = true; card.replaceChildren(); clearTimeout(stopTimer); if (ytOn && window.wlDuck) wlDuck('yt', false); ytOn = false; };
    const showStop = (st, onGo) => {
      card.replaceChildren(); card.hidden = false;
      const media = document.createElement('div'); media.className = 'ds-media';
      if (st.img) { const im = document.createElement('img'); im.src = st.img; im.alt = t(`stop.${st.key}.t`); media.append(im); }
      else {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ds-yt'; b.innerHTML = `<span>▶</span> ${t('stop.play')}`;
        b.addEventListener('click', () => {
          clearTimeout(stopTimer); ytOn = true; if (window.wlDuck) wlDuck('yt', true);
          const f = document.createElement('iframe'); f.src = `https://www.youtube-nocookie.com/embed/${st.yt}?autoplay=1&rel=0`; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.title = t(`stop.${st.key}.t`);
          media.replaceChildren(f);
        }); media.append(b);
      }
      const tx = document.createElement('div'); tx.className = 'ds-text';
      const h = document.createElement('b'); h.textContent = t(`stop.${st.key}.t`); const p = document.createElement('p'); p.textContent = t(`stop.${st.key}.d`);
      const c = document.createElement('small'); if (st.page) { const a = document.createElement('a'); a.href = st.page; a.rel = 'noopener'; a.textContent = st.credit; c.append(a); } else c.textContent = st.credit + (st.yt ? ' · ' + t('stop.ytnote') : '');
      const go = document.createElement('button'); go.type = 'button'; go.className = 'play small'; go.textContent = st.end ? t('stop.close') : t('stop.go');
      go.addEventListener('click', () => { hideStop(); onGo && onGo(); });
      tx.append(h, p, c, go); card.append(media, tx);
      if (!st.end) stopTimer = setTimeout(() => { if (!ytOn) { hideStop(); onGo && onGo(); } }, 12000);
    };
    const stopDive = (toHome) => { hideStop(); dive = null; ctl.hidden = true; look.yaw = look.pitch = 0; controls.enabled = true; btn.textContent = t('canyon.dive'); if (toHome) { camera.position.copy(home.p); controls.target.copy(home.t); } else controls.target.set(hx, hy + .5, hz); controls.update(); };
    btn.addEventListener('click', () => { if (dive) return stopDive(true); controls.autoRotate = false; controls.enabled = false; dive = { u: 0, done: new Set(), playing: true, last: performance.now() }; btn.textContent = t('canyon.surface'); ctl.hidden = false; syncCtl(); });
    /* steering: pause, speed, scrub along the route, drag to look around */
    const ctl = document.createElement('div'); ctl.className = 'dive-ctl'; ctl.hidden = true;
    const pp = document.createElement('button'); pp.type = 'button'; pp.className = 'dc-btn';
    const spd = document.createElement('select'); [['0.5', '0,5×'], ['1', '1×'], ['2', '2×']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; spd.append(o); }); spd.value = '1'; spd.setAttribute('aria-label', t('dive.speed'));
    const rng = document.createElement('input'); rng.type = 'range'; rng.min = 0; rng.max = 1000; rng.value = 0; rng.setAttribute('aria-label', t('dive.route'));
    const hint = document.createElement('small'); hint.textContent = t('dive.look');
    ctl.append(pp, spd, rng, hint); hud.append(ctl);
    const syncCtl = () => { if (!dive) return; pp.textContent = dive.playing ? '❚❚' : '▶'; pp.setAttribute('aria-label', t(dive.playing ? 'dive.pause' : 'dive.play')); rng.value = Math.round(dive.u * 1000); };
    pp.addEventListener('click', () => { if (!dive) return; dive.playing = !dive.playing; dive.last = performance.now(); syncCtl(); });
    rng.addEventListener('input', () => { if (!dive) return; dive.u = rng.value / 1000; hideStop(); dive.pausedAt = 0; dive.scrubbed = true; });
    let look = { yaw: 0, pitch: 0 }, drag = null;
    renderer.domElement.addEventListener('pointerdown', (e) => { if (!dive) return; drag = { x: e.clientX, y: e.clientY, yaw: look.yaw, pitch: look.pitch }; renderer.domElement.setPointerCapture(e.pointerId); });
    renderer.domElement.addEventListener('pointermove', (e) => { if (!drag) return; look.yaw = drag.yaw - (e.clientX - drag.x) * .005; look.pitch = Math.max(-1.1, Math.min(1.1, drag.pitch - (e.clientY - drag.y) * .004)); });
    renderer.domElement.addEventListener('pointerup', () => { drag = null; });
    const ahead = new THREE.Vector3();

    const t0 = performance.now();
    o.tick = () => {
      const now = performance.now(), tt = (now - t0) / 1000; water.material.uniforms.t.value = tt;
      if (dive) {
        if (!dive.pausedAt && dive.playing) dive.u = Math.min(1, dive.u + (now - dive.last) / DUR * +spd.value);
        dive.last = now; if (!drag) { look.yaw *= .985; look.pitch *= .985; }
        const u = dive.u, e = u * u * (3 - 2 * u);
        if (Math.round(u * 1000) !== +rng.value && document.activeElement !== rng) rng.value = Math.round(u * 1000);
        path.getPointAt(e, camera.position); path.getPointAt(Math.min(1, e + .012), ahead); if (e > .97) ahead.set(hx, hy + .5, hz); camera.lookAt(ahead); camera.rotateY(look.yaw); camera.rotateX(look.pitch);
        const dNow = Math.max(0, -mOf(camera.position.y));
        if (dive.scrubbed) { dive.scrubbed = false; dive.done = new Set(STOPS.map((x, i) => i).filter((i) => !STOPS[i].end && STOPS[i].depth <= dNow)); }
        const st = STOPS.find((x, i) => !x.end && !dive.done.has(i) && dNow >= x.depth);
        if (st && !dive.pausedAt) { dive.done.add(STOPS.indexOf(st)); dive.pausedAt = now; const d0 = dive; showStop(st, () => { if (dive === d0) { d0.pausedAt = 0; d0.last = performance.now(); } }); }
        if (u >= 1 && !dive.pausedAt) { stopDive(false); showStop(STOPS[STOPS.length - 1]); }
      }
      const under = camera.position.y < 0, depth = Math.max(0, -mOf(camera.position.y));
      // depth precision: a tiny near plane is only needed close to the ground; from high up it makes coast and water flicker
      const nearWanted = under || dive ? 0.05 : Math.min(4, Math.max(0.05, camera.position.y / 80));
      if (Math.abs(nearWanted - camera.near) > camera.near * 0.2) { camera.near = nearWanted; camera.updateProjectionMatrix(); }
      above.visible = !under; below.visible = under; snow.visible = under; anims.vis(under); if (under) anims.forEach((f) => f(tt));
      if (under) {
        const d = sst(0, 700, depth); tmp.copy(shallow).lerp(abyss, d); fogSea.color.copy(tmp); fogSea.density = .018 + .05 * d; scene.fog = fogSea; scene.background.copy(tmp);
        sun.intensity = 1.35 * Math.exp(-depth / 160); hemi.intensity = .2 + .65 * Math.exp(-depth / 220); lamp.intensity = 2.2 * sst(40, 300, depth);
        snow.position.copy(camera.position); const a = snowG.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] -= .004; if (a[i] < -12) a[i] = 12; } snowG.attributes.position.needsUpdate = true;
      } else { scene.fog = fogAir; scene.background.copy(skyC); sun.intensity = 1.35; hemi.intensity = .85; lamp.intensity = 0; }
      const mk = Math.min(9, Math.max(1, camera.position.distanceTo(hpV) / 45)); dot.scale.setScalar(mk); rings.forEach((r) => { const p = ((tt / 3 + r.userData.k / 3) % 1), s = (1 + p * 9) * mk; r.scale.set(s, s, s); r.material.opacity = (1 - p) * .7; });
      read.textContent = under ? t('canyon.depth', { m: Math.round(depth).toLocaleString(I18N.locale) }) : '';
      read.classList.toggle('on', under);
    };
    camera.position.copy(home.p); controls.target.copy(home.t); controls.update();
    host.title = '';
    const note = document.getElementById('dive-len'); if (note) note.textContent = t('canyon.dive.note', { km: Math.round(pathKm) });
  }

  /* ---------- Sound landscape ---------- */
  function land(clip) {
    const host = document.getElementById('land3d');
    const G = clip.grid, F = G.length, T = G[0].length, dur = clip.duration_s;
    const LEN = 240, WID = 80, HGT = 30;                    // x = time, z = pitch (front low, back high), y = loudness
    const { scene, camera, controls, label } = makeScene(host, { autoRotate: false, fogNear: 260, fogFar: 700, minD: 60, maxD: 600 });
    // light smoothing so single noisy cells do not read as spikes
    const val = (fi, ti) => parseInt(G[fi][ti], 16) / 15;
    const med = Array.from({ length: F }, (_, fi) => { const r = Array.from({ length: T }, (_, ti) => val(fi, ti)).sort((a, b) => a - b); return r[Math.floor(T / 2)]; });
    const sm = (fi, ti) => { let s = 0, n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const f = fi + a, t = ti + b; if (f >= 0 && f < F && t >= 0 && t < T) { const w = a === 0 && b === 0 ? 4 : 1; s += val(f, t) * w; n += w; } } return s / n; };
    const geo = new THREE.PlaneGeometry(LEN, WID, T - 1, F - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const stops = [[2, 11, 16], [8, 52, 70], [32, 140, 150], [120, 220, 200], [255, 236, 170]].map(([r, g, b2]) => new THREE.Color(r / 255, g / 255, b2 / 255));
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const ti = i % T, row = Math.floor(i / T), fi = F - 1 - row;   // row 0 is the back edge = highest pitch
      const raw = sm(fi, ti), d = Math.max(0, raw - med[fi]);     // louder than usual at this pitch
      const v = Math.min(1, d / .45);
      pos.setY(i, v ** 1.3 * HGT);
      const x = Math.min(.999, v) * (stops.length - 1), k = Math.floor(x), f = x - k;
      c.copy(stops[k]).lerp(stops[k + 1], f);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .05 })));
    scene.add(new THREE.HemisphereLight(0xcff7ff, 0x020b10, .85));
    const key = new THREE.DirectionalLight(0xffffff, .75); key.position.set(-60, 140, 120); scene.add(key);
    const xAt = (t) => -LEN / 2 + LEN * (t / dur);
    // calls people marked: amber strip along the front edge
    clip.labels.forEach(([a, d]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(LEN * d / dur, 5), new THREE.MeshBasicMaterial({ color: 0xffb547 }));
      m.rotation.x = -Math.PI / 2; m.position.set(xAt(a + d / 2), 0.2, WID / 2 + 6); scene.add(m);
    });
    // playhead: a glowing wall across the pitch axis
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(WID + 16, HGT + 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false }));
    wall.rotation.y = Math.PI / 2; wall.position.set(xAt(0), (HGT + 10) / 2, 4); scene.add(wall);
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, HGT + 10, -WID / 2 - 4), new THREE.Vector3(0, HGT + 10, WID / 2 + 12)]), new THREE.LineBasicMaterial({ color: 0xffffff }));
    edge.position.x = xAt(0); scene.add(edge);
    label('0 s', new THREE.Vector3(xAt(0), 0, WID / 2 + 14));
    label('30 s', new THREE.Vector3(xAt(30), 0, WID / 2 + 14));
    label(`${Math.round(dur)} s`, new THREE.Vector3(xAt(dur), 0, WID / 2 + 14));
    label(t('land.low'), new THREE.Vector3(xAt(dur) + 16, 0, WID / 2 - 4));
    label('10 kHz', new THREE.Vector3(xAt(dur) + 16, 0, -WID / 2 + 4));
    label(t('land.calls'), new THREE.Vector3(xAt(dur * .12), 0, WID / 2 + 24), 'amber');
    const audio = document.getElementById('audio');
    const orig = controls.update.bind(controls);
    controls.update = () => { const x0 = xAt(audio ? audio.currentTime : 0); wall.position.x = x0; edge.position.x = x0; return orig(); };
    const narrow = host.clientWidth < 600;
    camera.position.set(-40, narrow ? 220 : 150, narrow ? 300 : 190);
    controls.target.set(0, 0, 0); controls.update();
  }

  I18N.ready.then(() => {
  get('data/bathy_hi.json').then(bathy).catch(() => { const m = document.querySelector('#bathy3d .scene-msg'); if (m) m.textContent = t('ui.loadfail'); });
  get('data/clip.json').then(land).catch(() => { const m = document.querySelector('#land3d .scene-msg'); if (m) m.textContent = t('ui.loadfail'); });
  });
})();
