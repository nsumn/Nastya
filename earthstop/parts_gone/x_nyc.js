// =================== NEW YORK (her request): one Manhattan avenue running along -z — skyscraper walls with window grids, storefront awnings, yellow cabs, traffic lights,
// a steaming street vent, and a Times-Square-style cluster of glowing billboards at z -70..-110. Used for the opening (crowd + cabs vanish), the supercar ride,
// the stale-gas stall + bikes, and the election (campaign billboards). x: road -7..7, sidewalks to ±11.5, buildings beyond. ===================
const NYC = mkSet({ top: '#5a8ad8', bot: '#f4dcc4', fog: 0xe8d8c8, near: 90, far: 520, hemi: [0xfff0e0, 0x6a6058, 1.15], sun: [0xfff0d8, 2.2, V3(16, 30, 10)], shadow: 22 });
const NY = {}; {
  const sc = NYC.sc; gplane(sc, 40, 1600, '#4a4c54', 0, -500, 0);
  for (const s of [-1, 1]) { rb(4.5, 0.16, 1600, F_('#b8b4ac'), s * 9.25, 0.08, -500, sc, 0.02); rb(0.25, 0.18, 1600, F_('#d0ccc4'), s * 7.1, 0.09, -500, sc, 0.02); }
  for (let z = 260; z > -1100; z -= 9) gplane(sc, 0.16, 3.5, '#f0e6a0', 0, z, 0.006);
  for (const x of [-3.5, 3.5]) for (let z = 260; z > -1100; z -= 6) gplane(sc, 0.12, 2.6, '#e8e6e0', x, z, 0.006);
  // window grid textures (a few looks, reused)
  const winTex = (wall, glass, lit) => { const t = canvasTex(128, 128, (g, w, h) => { g.fillStyle = wall; g.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = hash(r * 4 + c + lit) < 0.18 ? '#f8e0a0' : glass; g.fillRect(6 + c * 31, 6 + r * 31, 20, 22); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const LOOKS = [['#b8705a', '#3a4a5a'], ['#d8ccb4', '#4a5a6a'], ['#8a8c94', '#2a3a4a'], ['#c8a07a', '#3a4a5a'], ['#6a8ab8', '#a8c8e8'], ['#e8e2d6', '#5a6a7a']];
  // storefronts (her note, Oct 30: the ground floor read as black squares): a coloured frame, two big shop windows with a lit interior and reflections, a door
  const STORE = [['#c8b8a0', '#3a2a1a'], ['#8a3a2a', '#f4e8c8'], ['#2a4a5a', '#f4e8c8'], ['#e8e2d6', '#2a2a30'], ['#5a6a3a', '#f4e8c8'], ['#d8a040', '#2a2a30']].map(([frame, ink], k) => ({ frame,
    tex: canvasTex(384, 192, (g, w, h) => { g.fillStyle = frame; g.fillRect(0, 0, w, h); g.fillStyle = ink; g.font = '800 26px Inter'; g.textAlign = 'center'; g.fillText(['DELI', 'PIZZA', 'SHOES', 'CAFE', 'BOOKS', 'BAGELS'][k], w / 2, 30);
      for (const [x0, ww] of [[14, 140], [230, 140]]) { const gr = g.createLinearGradient(x0, 44, x0 + ww, 180); gr.addColorStop(0, '#f4e2b8'); gr.addColorStop(0.5, '#c8d8e0'); gr.addColorStop(1, '#8aa8bc'); g.fillStyle = gr; g.fillRect(x0, 44, ww, 132);
        for (let i = 0; i < 6; i++) { g.fillStyle = ['#e8463a', '#f4c430', '#3a6ad8', '#2a9a5a', '#f08a2a', '#8a3aa8'][(i + k) % 6]; g.fillRect(x0 + 10 + i * 21, 128 + 10 * ((i + k) % 2), 16, 40 - 10 * ((i + k) % 2)); }
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(x0 + 20, 176); g.lineTo(x0 + 60, 44); g.lineTo(x0 + 85, 44); g.lineTo(x0 + 45, 176); g.fill(); g.strokeStyle = '#2e3034'; g.lineWidth = 5; g.strokeRect(x0, 44, ww, 132); }
      g.fillStyle = '#3a4048'; g.fillRect(166, 54, 52, 138); g.fillStyle = '#a8c0d0'; g.fillRect(174, 64, 36, 70); g.fillStyle = '#d8c070'; g.fillRect(204, 124, 6, 14); }) }));
  STORE.forEach(o => { o.tex.wrapS = THREE.RepeatWrapping; });
  const blocks = []; for (const s of [-1, 1]) for (let z = 220; z > -1000; ) { const d = 18 + 22 * hash(z * 0.37 + s), hgt = 22 + 95 * Math.pow(hash(z * 0.71 + s * 3), 1.6), lk = LOOKS[(hash(z * 1.3 + s * 7) * LOOKS.length) | 0], wd = 22;
      if (Math.abs((z + 120) % 160) < 18) { z -= 22; continue; }   // cross streets
      const tex = winTex(lk[0], lk[1], z); tex.repeat.set(d / 4, hgt / 4); const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), top = F_(lk[0]);
      const b = mesh(new THREE.BoxGeometry(d, hgt, wd), [top, top, top, top, side, side]); b.geometry.rotateY(Math.PI / 2); b.position.set(s * (11.5 + wd / 2), hgt / 2, z - d / 2); b.castShadow = b.receiveShadow = true; sc.add(b);
      // ground floor: storefront band + an awning
      const sf = STORE[(hash(z * 2.1 + s) * STORE.length) | 0]; rb(0.3, 3.4, d - 0.6, F_(sf.frame), s * 11.6, 1.7, z - d / 2, sc, 0.02);
      const sfm = new THREE.MeshStandardMaterial({ map: sf.tex.clone(), roughness: 0.5 }); sfm.map.repeat.set(Math.max(1, Math.round((d - 0.8) / 6)), 1); sfm.map.needsUpdate = true;
      const sp = mesh(new THREE.PlaneGeometry(d - 0.8, 3.3), sfm, false, true); sp.rotation.y = -s * Math.PI / 2; sp.position.set(s * 11.44, 1.7, z - d / 2); sc.add(sp); const aw = rb(1.4, 0.12, d * 0.6, F_(['#c8302a', '#2a6a4a', '#2a4a8a', '#e8a030'][(hash(z) * 4) | 0]), s * 11.0, 3.2, z - d / 2, sc, 0.03); aw.rotation.z = s * 0.25;
      blocks.push(b); z -= d + 0.4; } NY.blocks = blocks;
  // Times-Square cluster: big glowing billboards on both sides (generic ads), two of them become campaign posters at the election
  const ad = (bg, fg, txt, sub) => canvasTex(512, 384, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = '800 92px Inter'; g.textAlign = 'center'; g.fillText(txt, w / 2, h / 2 + 20); g.font = '600 38px Inter'; g.fillText(sub, w / 2, h / 2 + 80); });
  NY.ads = [];
  const ADS = [['#e8303a', '#fff', 'SODA', 'ICE COLD'], ['#1a1a1a', '#f8d040', 'SHOW', 'TONIGHT 8PM'], ['#2a6ad8', '#fff', 'NEW PHONE', 'COMING SOON'], ['#f8d040', '#1a1a1a', 'BURGERS', '24/7'], ['#8a3ad8', '#fff', 'MUSICAL', 'NOW PLAYING'], ['#2ab87a', '#fff', 'SALE', '50% OFF']];
  for (let i = 0; i < 10; i++) { const s = i % 2 ? 1 : -1, z = -70 - Math.floor(i / 2) * 9, y = 9 + 7 * (i % 3), a = ADS[i % ADS.length];
    const m = new THREE.MeshBasicMaterial({ map: ad(...a) }); const p = mesh(new THREE.PlaneGeometry(8, 6), m, false, false); p.rotation.y = -s * Math.PI / 2; p.position.set(s * 11.3, y, z); sc.add(p); NY.ads.push({ p, m, a, map0: m.map }); }
  NY.campaign = [ad('#f08a2a', '#fff', 'VOTE YOU', 'FOR PRESIDENT'), ad('#d8342a', '#fff', 'VOTE HIM', 'FOR PRESIDENT')];
  // the narrow tower at the end of the square, its face stacked with screens (the avenue splits around it)
  rb(14, 62, 14, F_('#8a8c94'), 0, 31, -128, sc, 0.1); rb(15, 1.0, 15, F_('#6a6c74'), 0, 62.5, -128, sc, 0.1);
  for (let k = 0; k < 5; k++) { const a2 = ADS[(k + 2) % ADS.length], m = new THREE.MeshBasicMaterial({ map: ad(...a2) }), p = mesh(new THREE.PlaneGeometry(12.4, 6.2), m, false, false); p.position.set(0, 7 + k * 7.2, -120.9); sc.add(p); NY.ads.push({ p, m, a: a2, map0: m.map, tower: k }); }
  // traffic lights + street lamps every block, a steam vent, hydrants
  NY.lights = [];
  for (let z = 200; z > -900; z -= 40) for (const s of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.5, 8), F_('#2e3034', { metalness: 0.4 })); p.position.set(s * 7.6, 3.25, z); sc.add(p);
    const arm = rb(0.12, 0.12, 4.0, F_('#2e3034'), s * 5.7, 6.3, z, sc, 0.03); arm.rotation.y = Math.PI / 2; const lamp = mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: '#fff0c8' })); lamp.position.set(s * 4.0, 6.2, z); sc.add(lamp);
    if ((z / 40) % 2 === 0) { const tl = rb(0.4, 1.1, 0.4, F_('#e8c030'), s * 7.6, 4.0, z + 0.3, sc, 0.05); for (let k = 0; k < 3; k++) { const b = mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: ['#e8302a', '#f0b030', '#30d060'][k] })); b.position.set(s * 7.6, 4.35 - k * 0.33, z + 0.52); sc.add(b); NY.lights.push(b); } } }
  for (const z of [6, -46, -126]) { const h = mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.6, 8), F_('#c8302a')); h.position.set(8.0, 0.46, z); sc.add(h); }
  NY.vent = new THREE.Group(); { const st2 = mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.5, 10), [F_('#f08a2a'), F_('#f08a2a'), F_('#f08a2a')]); st2.position.y = 0.75; NY.vent.add(st2); for (const y of [0.4, 1.0]) { const b = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 10), F_('#f4f4f0')); b.position.y = y; NY.vent.add(b); } }
  NY.vent.position.set(-3.2, 0, -20); sc.add(NY.vent);
  NY.steam = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0.6 })); sc.add(s); return s; });
  // cabs: parked + moving (they vanish at the start); later they stand abandoned at angles
  NY.cabs = []; const cabSign = canvasTex(128, 48, (g, w, h) => { g.fillStyle = '#f8f0d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; g.font = '700 30px Inter'; g.textAlign = 'center'; g.fillText('TAXI', w / 2, 35); });
  for (let i = 0; i < 18; i++) { const g = makeCar('#f4c430'); const sg = mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshStandardMaterial({ map: cabSign })); sg.position.set(0, 1.68, -0.1); g.add(sg); bx(1.82, 0.12, 4.0, '#1a1a1a', 0, 0.62, 0, g);
    const lane = [-5.6, -2.8, 2.8, 5.6][i % 4]; g.position.set(lane, 0, 10 - i * 22 - 8 * hash(i)); g.rotation.y = lane > 0 ? Math.PI : 0; g.userData = { lane, z0: g.position.z, v: lane > 0 ? -1 : 1, tv: 1.5 + (i % 6) * 0.35, abandon: (hash(i * 3) - 0.5) * 1.2 }; sc.add(g); NY.cabs.push(g); }
  // crowd on the sidewalks
  NY.walkers = []; const r0 = seed; seed = 909;
  for (let i = 0; i < 26; i++) { const p = makePerson(rnd); sc.add(p.outer); const s = i % 3 === 0 ? -1 : 1; NY.walkers.push({ p, x: s * (8.3 + 2.4 * rnd()), z0: 14 - i * 3.2 - 6 * rnd(), dir: rnd() < 0.5 ? 1 : -1, sp: 1.0 + 0.5 * rnd(), ph: rnd() * 6, tv: 1.3 + 2.2 * rnd() }); }
  seed = r0;
  // re-home the supercar, the bikes and the stall smoke from the (unused) desert set; the ballot box + slips from the White House set
  for (const o of [HW.car, HW.bikeA, HW.bikeB, ...HW.smoke, WHS.box, ...WHS.slips]) sc.add(o); }
function updateNYC(t) {
  NY.walkers.forEach(w => { const gone = t >= w.tv; w.p.outer.visible = !gone; const z = w.z0 + w.dir * w.sp * Math.min(t, w.tv); w.p.outer.position.set(w.x, 0.95 + 0.16, z); w.p.outer.rotation.y = w.dir > 0 ? 0 : Math.PI; poseWalk(w.p, t * 7 + w.ph, 1); puffAt(NYC.sc, V3(w.x, 1.1, z), t, w.tv, 1.8); });
  NY.cabs.forEach(c => { const u = c.userData, moving = Math.min(t, u.tv); c.position.z = u.z0 + u.v * 9 * moving; c.rotation.y = (u.lane > 0 ? Math.PI : 0) + (t > u.tv ? u.abandon * 0.3 : 0); c.visible = !(t > 10 && c.position.z < -38 && c.position.z > -84);   // keep the stall / square clear   // the cars stay (nobody to drive them), drivers vanish
    puffAt(NYC.sc, V3(c.position.x, 1.4, c.position.z), t, u.tv, 2.4); });
  NY.steam.forEach((s, i) => { const k = ((t * 0.5 + i / 6) % 1); s.position.set(-3.2 + 0.3 * Math.sin(i + t), 1.5 + 4 * k, -20 + 0.4 * Math.cos(i)); s.scale.setScalar(1 + 3 * k); s.material.opacity = 0.55 * (1 - k); });
  const lit = Math.floor(t / 3) % 3; NY.lights.forEach((b, i) => b.material.color.set(i % 3 === lit ? ['#e8302a', '#f0b030', '#30d060'][i % 3] : '#2a2a2a'));
  const camp = t >= PRES; NY.ads.forEach((a, i) => { const c = a.tower !== undefined ? (a.tower === 1 || a.tower === 2 ? a.tower - 1 : -1) : i < 4 ? i % 2 : -1; a.m.map = camp && c >= 0 ? NY.campaign[c] : a.map0; }); }
