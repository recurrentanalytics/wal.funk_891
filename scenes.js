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
      pos.setY(i, yOf(m));
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
        const rip = Math.sin(18 * u + 2 * Math.sin(3 * v) + 1.3 * Math.sin(2 * u + 5 * v)) * .25;   // sediment ripples
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
            float dH = texture2D(detailMap, vUv * ${REP}).r; diffuseColor.rgb *= 0.86 + 0.28 * dH;`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            { vec2 duv = vUv * ${REP}; float h = texture2D(detailMap, duv).r * ${strength.toFixed(3)};
              vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); float hx = dFdx(h), hy = dFdy(h);
              vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
              normal = normalize(abs(det) * normal - sign(det) * (hx * r1 + hy * r2)); }`);
      };
    };
    Promise.all([tex('albedo_above.jpg'), tex('albedo_true.jpg'), tex('normal_obj.jpg')]).then(([ta, tt, tn]) => {
      [[above, ta, 0.6], [below, tt, 1.6]].forEach(([m, map, str]) => {
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
    water.rotation.x = -Math.PI / 2; water.position.y = 0.02; scene.add(water);

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
    for (let c = c0; c > cEnd; c -= 3) { let best = rr, bz = 1e9; for (let q = Math.max(1, rr - 5); q <= Math.min(R - 2, rr + 5); q++) if (z[q * C + c] < bz) { bz = z[q * C + c]; best = q; } rr = best; pts.push(world(c, rr, .7)); }
    const last = pts[pts.length - 1], end = new THREE.Vector3(hx + 1.6, hy + 1.3, hz + 2.4);
    for (let k = 1; k <= 6; k++) { const p = last.clone().lerp(end, k / 6); const cc = Math.min(C - 1, Math.max(0, Math.round((p.x / S + W / 2) / kmX))), rw = Math.min(R - 1, Math.max(0, Math.round((p.z / S + H / 2) / kmY))); p.y = Math.max(p.y, yOf(Math.min(0, z[rw * C + cc])) + .9); pts.push(p); }
    const path = new THREE.CatmullRomCurve3(pts, false, 'centripetal', .5), pathKm = path.getLength() / S;
    const hud = document.createElement('div'); hud.className = 'dive-hud'; const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'play small'; btn.textContent = t('canyon.dive');
    const read = document.createElement('div'); read.className = 'dive-read'; hud.append(btn, read); host.append(hud);
    let dive = null; const DUR = 55000, home = { p: new THREE.Vector3(hx - 250, 250, hz + 320), t: new THREE.Vector3(hx * .5, hy * .6, hz * .5) }, hpV = new THREE.Vector3(hx, hy, hz);
    const stopDive = (toHome) => { dive = null; controls.enabled = true; btn.textContent = t('canyon.dive'); if (toHome) { camera.position.copy(home.p); controls.target.copy(home.t); } else controls.target.set(hx, hy + .5, hz); controls.update(); };
    btn.addEventListener('click', () => { if (dive) return stopDive(true); controls.autoRotate = false; controls.enabled = false; dive = { t0: performance.now() }; btn.textContent = t('canyon.surface'); });
    const ahead = new THREE.Vector3();

    const t0 = performance.now();
    o.tick = () => {
      const now = performance.now(), tt = (now - t0) / 1000; water.material.uniforms.t.value = tt;
      if (dive) {
        const u = Math.min(1, (now - dive.t0) / DUR), e = u * u * (3 - 2 * u);
        path.getPointAt(e, camera.position); path.getPointAt(Math.min(1, e + .012), ahead); if (e > .97) ahead.set(hx, hy + .5, hz); camera.lookAt(ahead);
        if (u >= 1) stopDive(false);
      }
      const under = camera.position.y < 0, depth = Math.max(0, -mOf(camera.position.y));
      above.visible = !under; below.visible = under; snow.visible = under;
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
