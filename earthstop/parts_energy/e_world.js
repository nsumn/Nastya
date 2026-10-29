// =================== THE CAST: you (the low-poly human she approved: faceted head with drawn emotions, oversized tee, jeans) ===================
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 });   // low-poly human: charcoal oversized tee, jeans
room.add(hero.outer); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false;
const camKey = new THREE.PointLight(0xfff0e0, 1.4, 6, 1.2); rmCam.add(camKey); room.add(rmCam);   // a soft key light riding with the camera: faces never go dark against the window
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); }
function seatAt(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
// ---- the can (no brand: a black can with a green bolt) ----
const canT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#16161a'; g.fillRect(0, 0, w, h); g.fillStyle = '#5aff7a'; g.beginPath(); g.moveTo(140, 30); g.lineTo(80, 140); g.lineTo(128, 140); g.lineTo(100, 230); g.lineTo(180, 110); g.lineTo(132, 110); g.closePath(); g.fill(); g.fillStyle = '#c8c8d0'; g.font = 'bold 30px Inter, sans-serif'; g.fillText('ENERGY', 70, 255 - 6); });
function makeCan() { const c = new THREE.Group(); const b = mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.16, 20), [new THREE.MeshStandardMaterial({ map: canT, roughness: 0.35, metalness: 0.4 }), M('#c8c8d0', { metalness: 0.7, roughness: 0.3 }), M('#c8c8d0', { metalness: 0.7, roughness: 0.3 })]); b.position.y = 0.08; c.add(b); return c; }
const can = makeCan(); hero.elbows[1].add(can); can.position.set(0, -0.3, 0.04); can.rotation.x = -1.4;
const can2 = makeCan(); room.add(can2);
const fizz = makeSmoke(room, 80);
// ---- the kitchen counter props: the sugar (13 teaspoons) and a year of it (11 bags) ----
const SPOONS = Array.from({ length: 13 }, (_, i) => { const g = new THREE.Group(); bx(0.012, 0.004, 0.13, '#d8d8e0', 0, 0, -0.05, g, { metalness: 0.6, roughness: 0.3 }); const bowl = mesh(new THREE.SphereGeometry(0.022, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#ffffff', { roughness: 0.9 })); bowl.scale.y = 0.6; bowl.position.set(0, 0.004, 0.035); g.add(bowl); room.add(g); return g; });
const sugarPile = mesh(new THREE.ConeGeometry(0.16, 0.12, 18), M('#fbfbf6', { roughness: 1 })); room.add(sugarPile);
// ---- a year of it: a bathtub (365 × 16 oz = 45.6 gal; a standard US tub ≈ 40 gal) filling up with green energy drink and spilling over ----
const tub = new THREE.Group(); room.add(tub); tub.position.set(2.25, 0, -1.05);
{ const por = M('#f6f6f2', { roughness: 0.25 }); bx(1.6, 0.06, 0.76, por, 0, 0.1, 0, tub); bx(1.6, 0.5, 0.07, por, 0, 0.34, 0.345, tub); bx(1.6, 0.5, 0.07, por, 0, 0.34, -0.345, tub); bx(0.07, 0.5, 0.76, por, 0.765, 0.34, 0, tub); bx(0.07, 0.5, 0.76, por, -0.765, 0.34, 0, tub);
  for (const [x, z] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) bx(0.08, 0.08, 0.08, '#c8b070', x, 0.04, z, tub, { metalness: 0.6, roughness: 0.3 });
  bx(0.05, 0.22, 0.05, '#c8c8d0', -0.72, 0.68, 0, tub, { metalness: 0.8, roughness: 0.25 }); bx(0.16, 0.04, 0.05, '#c8c8d0', -0.66, 0.78, 0, tub, { metalness: 0.8, roughness: 0.25 }); }
const drinkM = new THREE.MeshStandardMaterial({ color: '#86f05a', emissive: '#2a6a10', roughness: 0.15, transparent: true, opacity: 0.92 });
const liquid = bx(1.46, 1, 0.62, drinkM, 0, 0.13, 0, tub), spill = bx(0.9, 0.5, 0.02, drinkM, 0.1, 0.34, 0.385, tub), puddle = mesh(new THREE.CircleGeometry(1, 28), drinkM, false, true);
puddle.rotation.x = -Math.PI / 2; puddle.position.set(2.35, 0.006, -0.45); room.add(puddle);
const BUB = Array.from({ length: 24 }, (_, i) => { const b = mesh(new THREE.SphereGeometry(0.018 + 0.012 * hash(i), 8, 6), M('#d8ffc0', { emissive: '#4a8a20', roughness: 0.2 })); tub.add(b); return b; });
const FILL = [YEAR + 0.2, YEAR + 4.4];   // empty -> brim; then it spills
// ---- the bed (left corner) + a wall clock that can read 2:00 ----
const bed = new THREE.Group(); room.add(bed); bed.position.set(-2.9, 0, 1.3);
{ bx(1.1, 0.35, 2.0, '#6a4a34', 0, 0.18, 0, bed); bx(1.04, 0.16, 1.92, '#f2f0ec', 0, 0.43, 0, bed); bx(1.1, 0.8, 0.08, '#6a4a34', 0, 0.55, -1.0, bed); bx(0.55, 0.1, 0.3, '#ffffff', 0, 0.56, -0.78, bed); }
const duvet = bx(1.08, 0.2, 1.25, '#5a7ab0', 0, 0.8, 0.38, bed);   // covers you up to the chest
const clkCv = document.createElement('canvas'); clkCv.width = 256; clkCv.height = 96; const clkTex = new THREE.CanvasTexture(clkCv); clkTex.colorSpace = THREE.SRGBColorSpace;
function drawClock(txt) { const g = clkCv.getContext('2d'); g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff5a4a'; g.font = 'bold 70px Inter, monospace'; g.textAlign = 'center'; g.fillText(txt, 128, 74); clkTex.needsUpdate = true; }
{ const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: clkTex, color: new THREE.Color(1.6, 1.6, 1.6) })); ck.position.set(-3.93, 0.75, 0.15); ck.rotation.y = Math.PI / 2; room.add(ck); bx(0.3, 0.5, 0.3, '#6a4a30', -3.75, 0.25, 0.15, room); }
// ---- headache rings ----
const RINGS = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.3, 0.25), transparent: true, depthWrite: false })); room.add(r); return r; });
const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); }), transparent: true, depthWrite: false })); zzz.scale.setScalar(0.3); room.add(zzz);
function hideProps() { SPOONS.forEach(s => s.visible = false); sugarPile.visible = false; tub.visible = false; puddle.visible = false; RINGS.forEach(r => r.visible = false); zzz.visible = false; can.visible = false; can2.visible = false; }
// ---- home beats ----
function updateHome(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); hideProps(); const P = hero; poseReset(P, t); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false;
  const look = { night: 'night', sleep: t < SLEEP + 3.2 ? 'night' : 'day', month: 'eve' }[mode] || 'day'; lightRoom(look); camKey.intensity = look === 'night' ? 0.5 : 1.4; fizz.begin(); smokeMat.uniforms.uTint.value.set('#e8f4e8');
  if (mode === 'open') {   // tired, the crack, the gulp, eyes snap open
    P.outer.position.set(2.75, 0.95, -1.3); P.outer.rotation.y = 0.3; can.visible = true; const drink = smooth(CRACK + 0.3, CRACK + 0.8, t) * (1 - smooth(CRACK + 1.5, CRACK + 1.9, t));
    const ax = lerp(-0.9, -1.45, drink), ex = lerp(-1.0, -1.35, drink); P.arms[1].rotation.set(ax, 0, lerp(-0.35, -0.55, drink)); P.elbows[1].rotation.x = ex; can.rotation.x = lerp(0, -1.9, drink) - ax - ex;   // can in front of the chest (upright) -> tipped at the mouth
    if (t > CRACK && t < CRACK + 1.0) { P.outer.updateMatrixWorld(true); const top = can.localToWorld(V3(0, 0.17, 0)); for (let k = 0; k < 20; k++) { const u = ((t - CRACK) * 2 + k / 20) % 1; fizz.add(top.clone().add(V3(0.02 * Math.sin(k * 3), u * 0.12, 0.02 * Math.cos(k * 2))), 0.012 + u * 0.02, 0.5 * (1 - u)); } }
    P.root.rotation.x = 0.12 * (1 - smooth(CRACK + 1.6, CRACK + 1.9, t)); P.face(t < CRACK ? 'sleepy' : t < CRACK + 1.7 ? 'neutral' : 'wired', t); }
  else if (mode === 'sugar') {   // 13 teaspoons of sugar lined up next to the can, then a pile
    P.outer.position.set(2.75, 0.95, -1.3); P.outer.rotation.y = 0.6; P.arms[0].rotation.set(-0.6, 0, -0.2); P.elbows[0].rotation.x = -1.2; P.face(t < HOUR1 + 3 ? 'surprised' : 'worried', t);
    can2.visible = true; can2.position.set(3.15, 0.95, -0.55); const n = Math.min(13, Math.floor((t - HOUR1 - 0.3) / 0.18) + 1);
    SPOONS.forEach((s, i) => { s.visible = i < n; s.position.set(3.3, 0.955, -0.95 + i * 0.065); s.rotation.y = Math.PI / 2 + 0.1 * Math.sin(i); });
    sugarPile.visible = t > HOUR1 + 3.0; sugarPile.position.set(3.2, 0.95 + 0.06 * smooth(HOUR1 + 3, HOUR1 + 3.6, t), -1.55); sugarPile.scale.setScalar(Math.max(0.01, smooth(HOUR1 + 3.0, HOUR1 + 3.6, t))); }
  else if (mode === 'crash') {   // the crash on the couch side: sleepy, reaches for the second can
    seatAt(P, -1.0, 0.42, -1.3, 0); P.root.rotation.x = 0.15; can2.visible = true; const reach = smooth(HOUR4 + 2.6, HOUR4 + 3.8, t); can2.position.set(-1.95, 0.6, -1.55);
    P.arms[0].rotation.set(lerp(-0.2, -1.1, reach), 0, lerp(0, 0.6, reach)); P.elbows[0].rotation.x = -0.3; P.face(t < HOUR4 + 2.6 ? 'sleepy' : 'reading', t);
    if (t > HOUR4 + 3.8) { can2.visible = false; can.visible = true; P.arms[1].rotation.set(-0.6, 0, 0.1); P.elbows[1].rotation.x = -1.3; } }
  else if (mode === 'night') {   // 2 AM: in bed, eyes wide open
    P.outer.position.set(-2.9, 0.72, 1.34); P.outer.rotation.set(-Math.PI / 2, 0, 0); drawClock('2:00'); P.face(t < NIGHT + 4 ? 'surprised' : 'worried', t); }
  else if (mode === 'month' && t >= MONTH + 5.3) {   // on edge: jittery, sweating, can't sit still
    seatAt(P, -1.0, 0.42, -1.3, 0); P.outer.position.x += 0.012 * Math.sin(t * 47) + 0.006 * Math.sin(t * 31); P.root.rotation.z = 0.02 * Math.sin(t * 23);
    P.arms.forEach((a, i) => a.rotation.set(-0.5, 0, i ? -0.2 : 0.2)); P.elbows.forEach((e, i) => e.rotation.x = -1.2 - 0.15 * Math.sin(t * 19 + i)); P.face('anxious', t); }
  else if (mode === 'month') {   // skipped a day: the headache rings
    seatAt(P, -1.0, 0.42, -1.3, 0); P.arms.forEach((a, i) => a.rotation.set(-2.4, 0, i ? -0.5 : 0.5)); P.elbows.forEach(e => e.rotation.x = -1.6); P.face('worried', t);
    P.outer.updateMatrixWorld(true); const hd = headOf(P); RINGS.forEach((r, k) => { const u = ((t * 1.5) + k / 3) % 1; r.visible = true; r.position.copy(hd); r.scale.setScalar(0.7 + 1.4 * u); r.material.opacity = 1 - u; r.lookAt(rmCam.position); }); }
  else if (mode === 'year') {   // a year: the tub fills with a year of energy drink and spills over
    P.outer.position.set(2.25, 0.95, -1.8); P.outer.rotation.y = 0;   // behind the tub, facing us P.face(t < YEAR + 4.2 ? 'surprised' : 'worried', t);
    tub.visible = true; const k = smooth(FILL[0], FILL[1], t), lv = 0.02 + 0.44 * k; liquid.scale.y = lv; liquid.position.y = 0.13 + lv / 2;
    const sp = smooth(FILL[1] - 0.1, FILL[1] + 1.2, t); spill.visible = sp > 0.01; spill.scale.y = 0.47 * sp; spill.position.y = 0.6 - 0.47 * sp / 2;
    puddle.visible = sp > 0.05; puddle.scale.setScalar(0.05 + 0.75 * smooth(FILL[1] + 0.3, FILL[1] + 2.6, t));
    BUB.forEach((b, i) => { const u = ((t * 0.7 + hash(i * 3.3)) % 1); b.visible = k > 0.05; b.position.set(-0.65 + 1.3 * hash(i), 0.13 + lv + 0.012 - 0.03 * u, -0.26 + 0.52 * hash(i * 7.1)); b.scale.setScalar(1 - u); });
    if (t > FILL[0] && t < FILL[1] + 1.5) { const top = V3(2.25 - 0.66, 0.73, -1.05); for (let q = 0; q < 6; q++) fizz.add(top.clone().add(V3(0.02 * Math.sin(q * 2 + t * 9), -0.05 - ((t * 3 + q / 6) % 1) * (0.55 - lv), 0)), 0.03, 0.25); } }
  else {   // sleep: lights off, the can untouched on the nightstand, sunrise, wakes up happy
    const morning = t > SLEEP + 3.2; P.outer.position.set(-2.9, 0.72, 1.34); P.outer.rotation.set(-Math.PI / 2, 0, 0); drawClock(morning ? '7:30' : '11:00');
    can2.visible = true; can2.position.set(-3.75, 0.5, 0.35); zzz.visible = !morning; zzz.position.copy(headOf(P)).add(V3(0.25, 0.35, 0)); P.face(morning ? 'happy' : 'sleep', t);
    if (morning && t > SLEEP + 4.6) { P.outer.position.set(-2.9, 0.95, 0.5); P.outer.rotation.set(0, 0.6, 0); P.arms.forEach((a, i) => a.rotation.set(0, 0, i ? 2.55 : -2.55)); P.elbows.forEach(e => e.rotation.x = -0.25); P.face('laugh', t); } }
  fizz.end(); }

// =================== THE X-RAY BODY (reworked from the quit-nicotine video, so it is not a copy): amber glow, YOUR round-headed silhouette,
// the heart speeding up, sugar crystals riding the vessels; the camera spirals in from behind ===================
const xr = new THREE.Scene(); xr.background = new THREE.Color('#140a06'); const xCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
xr.add(new THREE.AmbientLight(0xb08a6a, 0.8)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(1, 2, 3); xr.add(k); }
{ const ringT = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,150,60,0.35)'; g.lineWidth = 2; for (let r = 40; r < 256; r += 36) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); } });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; xr.add(floor); }
const ghost = makeBlock({ head: 'human', body: 'human', skin: '#ffffff', hair: '#ffffff', top: '#ffffff', bottom: '#ffffff', shoe: '#ffffff', hairStyle: 'short', headS: 0.88 }); xr.add(ghost.outer); ghost.outer.position.set(0, 0.95, 0); poseIdle(ghost, 0, 0);
const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.55, 0.22), transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
ghost.outer.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
const organs = new THREE.Group(); xr.add(organs);
const heartG = new THREE.Group(); heartG.position.set(0.035, 1.3, 0.04); organs.add(heartG);   // two lobes + a point: a readable heart, not the old ball
{ const hm = M('#e8283a', { emissive: '#7a0a14', roughness: 0.35 }); for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.034, 16, 12), hm); l.position.set(s * 0.024, 0.016, 0); heartG.add(l); } const tip = mesh(new THREE.ConeGeometry(0.05, 0.075, 16), hm); tip.rotation.x = Math.PI; tip.position.y = -0.03; heartG.add(tip); }
const VES = [[[0.035, 1.3, 0.04], [0.0, 1.5, 0.03], [0.0, 1.62, 0.02]], [[0.035, 1.3, 0.04], [0.16, 1.4, 0.02], [0.23, 1.18, 0.0], [0.26, 0.95, 0.02]], [[0.035, 1.3, 0.04], [-0.15, 1.4, 0.02], [-0.23, 1.18, 0.0], [-0.26, 0.95, 0.02]],
  [[0.035, 1.3, 0.04], [0.05, 1.05, 0.04], [0.1, 0.86, 0.02], [0.1, 0.42, 0.03], [0.1, 0.08, 0.05]], [[0.035, 1.3, 0.04], [0.0, 1.05, 0.04], [-0.1, 0.86, 0.02], [-0.1, 0.42, 0.03], [-0.1, 0.08, 0.05]]].map(pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p))));
const vesMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.1), transparent: true, opacity: 0.5 }); for (const c of VES) organs.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.007, 5, false), vesMat));
// ---- the brain inside the X-ray head: receptor "doors", blue adenosine (the "I'm tired" signal) piling up around it, orange caffeine hexagons plugging the doors ----
const brainC = headOf(ghost).add(V3(0, 0.03, -0.03)), BR = 0.105;
const brainG = new THREE.Group(); brainG.position.copy(brainC); xr.add(brainG);
const brainM = new THREE.MeshStandardMaterial({ color: '#f29ab8', emissive: '#5a1a30', roughness: 0.5, flatShading: true });
{ const g = new THREE.SphereGeometry(BR, 22, 16), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i).divideScalar(BR); const f = Math.sin(v.z * 9 + Math.sin(v.y * 7) * 2) * Math.sin(v.y * 10 + Math.sin(v.x * 6) * 1.6), d = 1 + 0.06 * Math.abs(f) - 0.12 * Math.exp(-v.x * v.x / 0.004) * Math.max(0, v.y + 0.3);
    q.setXYZ(i, v.x * 0.92 * d * BR, v.y * 0.8 * d * BR, v.z * 1.12 * d * BR); } g.computeVertexNormals(); brainG.add(new THREE.Mesh(g, brainM)); }
const RN = 34, RDIR = Array.from({ length: RN }, (_, i) => { const y = 1 - 2 * (i + 0.5) / RN, r = Math.sqrt(1 - y * y), a = i * 2.39996; return V3(Math.cos(a) * r, y * 0.85, Math.sin(a) * r).normalize(); });
const rcpM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.65, 0.8) }), cafM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.6, 0.08) });
const RCP = RDIR.map(d => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 5, 12), rcpM); m.position.copy(d).multiplyScalar(BR * 1.08); m.lookAt(d.clone().multiplyScalar(BR * 3)); brainG.add(m); return m; });
const CAF = RDIR.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 6), cafM); brainG.add(m); return m; });
const AN = 170, adM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0075, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.38, 1.25) }), AN); adM.frustumCulled = false; brainG.add(adM);
const AD = Array.from({ length: AN }, (_, i) => { const d = V3(R(-1, 1), R(-0.8, 1), R(-1, 1)).normalize(); return { d, far: R(0.35, 0.6), rest: BR * (1.3 + 0.45 * Math.floor(i / 50) / 3 + R(0, 0.1)), ts: R(0, 1), rcp: i % RN }; });
function updateBrain(t, mode) { const flood = mode === 'flood', k = smooth(BRAIN + 0.2, BRAIN + 5.6, t), plug = smooth(BRAIN + 2.4, BRAIN + 3.2, t);
  brainM.color.set('#f29ab8').lerp(new THREE.Color('#5a78c8'), flood ? smooth(HOUR4 + 0.6, HOUR4 + 1.6, t) : 0); brainG.rotation.y = 0.25 * Math.sin(t * 0.5);
  CAF.forEach((c, i) => { const d = RDIR[i], on = hash(i * 2.7) * 0.8, s = flood ? 1 - smooth(HOUR4 + 0.2, HOUR4 + 0.7, t) : smooth(BRAIN + 2.4 + on, BRAIN + 2.6 + on, t), away = flood ? smooth(HOUR4 + 0.2, HOUR4 + 0.9, t) : 0;
    c.visible = s > 0.02 || away > 0; c.position.copy(d).multiplyScalar(BR * (1.13 + 0.8 * away)); c.quaternion.setFromUnitVectors(V3(0, 1, 0), d); c.scale.setScalar(Math.max(0.01, flood ? 1 - away : s)); });
  AD.forEach((A, i) => { const t0 = BRAIN + 0.3 + (i / AN) * 4.8 + A.ts * 0.3, u = ease(clamp((t - t0) / 0.9, 0, 1)); let p = A.d.clone().multiplyScalar(lerp(A.far, A.rest, u));
    if (flood) { const f = ease(clamp((t - HOUR4 - 0.5 - 0.6 * A.ts) / 0.5, 0, 1)); p = p.lerp(RDIR[A.rcp].clone().multiplyScalar(BR * (1.05 + 0.25 * hash(i))), f); }
    _o.position.copy(p); _o.rotation.set(t + i, i, 0); _o.scale.setScalar(t > t0 || flood ? 1 : 0.0001); _o.updateMatrix(); adM.setMatrixAt(i, _o.matrix); }); adM.instanceMatrix.needsUpdate = true; }
const CN = 300, cellM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.2, 0.15) }), CN), sugM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.011, 0.011, 0.011), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.2) }), CN);
cellM.frustumCulled = sugM.frustumCulled = false; organs.add(cellM, sugM);
const CL = Array.from({ length: CN }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.007), s: rnd() }));
const bpmAt = t => Math.round(lerp(72, 104, smooth(MIN30 + 0.6, MIN30 + 3.0, t)));
const _o = new THREE.Object3D(), _v = new THREE.Vector3();
function updateXray(t, mode) { updateBrain(t, mode); ghostMat.opacity = mode === 'flood' || (t > BRAIN + 1.2 && t < HOUR1) ? 0.05 : 0.14; const bpm = bpmAt(t), sp = bpm / 72, ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(0, ph - 0.18) * 9) * (ph > 0.18);
  heartG.scale.setScalar(1 + 0.2 * beat); const sugar = mode === 'sugarx' ? smooth(HOUR1 + 3.0, HOUR1 + 4.5, t) : mode === 'sugary' ? 1 : 0;
  CL.forEach((C, i) => { const u = (C.u0 + t * C.sp * sp) % 1; VES[C.v].getPointAt(u, _v).add(C.off); _o.position.copy(_v); _o.rotation.set(t + i, t * 0.7 + i, 0); _o.scale.setScalar(1); _o.updateMatrix(); cellM.setMatrixAt(i, _o.matrix);
    _o.position.add(V3(0.009, 0.005, 0.004)); _o.scale.setScalar(C.s < sugar * 0.8 ? 1 : 0.0001); _o.updateMatrix(); sugM.setMatrixAt(i, _o.matrix); }); cellM.instanceMatrix.needsUpdate = sugM.instanceMatrix.needsUpdate = true; }
// =================== THE TOOTH (week 1): a big molar, acid drips, the enamel dulls and pits ===================
const toothS = new THREE.Scene(); toothS.background = new THREE.Color('#1a0e1a'); const tCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 50);
toothS.add(new THREE.HemisphereLight(0xffe8f0, 0x3a2030, 1.1)); { const k = new THREE.DirectionalLight(0xffffff, 1.8); k.position.set(1, 2, 3); toothS.add(k); }
const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbfaf4'), roughness: 0.25 });
const tooth = new THREE.Group(); toothS.add(tooth); { const crown = mesh(new RoundedBoxGeometry(0.5, 0.42, 0.45, 5, 0.12), enamel); crown.position.y = 0.3; tooth.add(crown); for (const s of [-1, 1]) { const r = mesh(new THREE.ConeGeometry(0.1, 0.42, 10), enamel); r.rotation.x = Math.PI; r.position.set(s * 0.13, -0.08, 0); tooth.add(r); }
  const gum = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.18, 24), M('#e86a7a', { roughness: 0.7 })); gum.position.y = 0.05; tooth.add(gum); }
const pits = Array.from({ length: 22 }, (_, i) => { const p = mesh(new THREE.SphereGeometry(0.02 + 0.02 * hash(i), 8, 6), M('#c8b070', { roughness: 0.9 })); const a = hash(i * 3.1) * Math.PI * 2; p.position.set(Math.cos(a) * 0.2, 0.32 + 0.16 * hash(i * 7.7), Math.sin(a) * 0.19 + 0.04); p.scale.z = 0.4; p.lookAt(p.position.clone().multiplyScalar(2)); tooth.add(p); return p; });
const drops = Array.from({ length: 10 }, (_, i) => { const d = mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: '#b8ff5a', emissive: '#3a6a10', transparent: true, opacity: 0.85, roughness: 0.1 })); d.scale.y = 1.4; toothS.add(d); return d; });
const acidFog = makeSmoke(toothS, 120);
function updateTooth(t) { const k = smooth(WEEK + 1.0, WEEK + 5.5, t); tooth.rotation.y = 0.4 * Math.sin(t * 0.4); enamel.color.set('#fbfaf4').lerp(new THREE.Color('#e4d6a8'), k); enamel.roughness = 0.25 + 0.6 * k;
  pits.forEach((p, i) => { p.visible = hash(i * 1.7) < k; p.scale.setScalar(Math.max(0.01, (k - hash(i * 1.7) * 0.8) * 1.5)); p.scale.z *= 0.4; });
  drops.forEach((d, i) => { const u = ((t - WEEK) * 0.9 + i / 10) % 1; d.position.set(-0.2 + 0.4 * hash(i), 1.2 - u * 0.75, 0.05 + 0.15 * (hash(i * 3) - 0.5)); d.visible = u < 0.95; });
  acidFog.begin(); smokeMat.uniforms.uTint.value.set('#a8e870'); for (let n = 0; n < 40; n++) { const u = ((t * 0.3 + n / 40) % 1); acidFog.add(V3(Math.cos(n * 2.4) * 0.3, 0.5 + u * 0.3, Math.sin(n * 2.4) * 0.3), 0.06 + u * 0.08, 0.2 * (1 - u) * k); } acidFog.end(); }
// =================== ONE BLOOD VESSEL up close (1:30 PM): a red tube with cells streaming through; it tightens and the flow slows ===================
const vsl = new THREE.Group(); vsl.position.set(3, 1, 0); xr.add(vsl);
const vWall = new THREE.MeshStandardMaterial({ color: '#e8504a', emissive: '#5a0a08', roughness: 0.5, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
const vTube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 20, 1, true), vWall); vTube.rotation.z = Math.PI / 2; vsl.add(vTube);
const VCN = 90, vCells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 10, 6), new THREE.MeshStandardMaterial({ color: '#ff3a3a', emissive: '#7a0a0a', roughness: 0.4 }), VCN); vCells.frustumCulled = false; vsl.add(vCells);
const VC = Array.from({ length: VCN }, () => ({ x: R(-0.8, 0.8), a: R(0, 6.283), r: R(0, 1), s: R(0.8, 1.2) }));
function updateVessel(t) { const k = smooth(VESSEL + 1.2, VESSEL + 3.0, t), rad = lerp(1, 0.6, k), sp = lerp(0.35, 0.14, k);
  vTube.scale.set(rad, 1, rad); vWall.color.set('#e8504a').lerp(new THREE.Color('#a03838'), k);
  VC.forEach((c, i) => { const x = wrapR(c.x + t * sp * c.s, -0.8, 0.8), rr = 0.035 * rad * c.r; _o.position.set(x, Math.cos(c.a + t) * rr, Math.sin(c.a + t) * rr); _o.rotation.set(0, t + i, 0); _o.scale.set(0.45, 1, 1); _o.updateMatrix(); vCells.setMatrixAt(i, _o.matrix); }); vCells.instanceMatrix.needsUpdate = true; }
