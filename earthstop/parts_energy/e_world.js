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
const BAGS = Array.from({ length: 11 }, (_, i) => { const g = new THREE.Group(); bx(0.26, 0.36, 0.14, '#f4f0e6', 0, 0.18, 0, g); bx(0.262, 0.08, 0.142, '#2f6ad8', 0, 0.22, 0, g); room.add(g); return g; });
const cash = Array.from({ length: 8 }, (_, i) => bx(0.15, 0.03, 0.07, '#5aa86a', 0, 0, 0, room));
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
function hideProps() { SPOONS.forEach(s => s.visible = false); sugarPile.visible = false; BAGS.forEach(b => b.visible = false); cash.forEach(c => c.visible = false); RINGS.forEach(r => r.visible = false); zzz.visible = false; can.visible = false; can2.visible = false; }
// ---- home beats ----
function updateHome(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); hideProps(); const P = hero; poseReset(P, t); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false;
  const look = { night: 'night', sleep: t < SLEEP + 3.2 ? 'night' : 'day', month: 'eve' }[mode] || 'day'; lightRoom(look); camKey.intensity = look === 'night' ? 0.5 : 1.4; fizz.begin(); smokeMat.uniforms.uTint.value.set('#e8f4e8');
  if (mode === 'open') {   // tired, the crack, the gulp, eyes snap open
    P.outer.position.set(2.75, 0.95, -1.3); P.outer.rotation.y = 0.3; can.visible = true; const drink = smooth(CRACK + 0.3, CRACK + 0.8, t) * (1 - smooth(CRACK + 1.5, CRACK + 1.9, t));
    P.arms[1].rotation.set(lerp(-0.7, -1.25, drink), 0, lerp(-0.3, -0.5, drink)); P.elbows[1].rotation.x = lerp(-1.15, -1.95, drink); can.rotation.x = lerp(-1.3, -2.3, drink);   // can in front of the chest -> to the mouth
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
  else if (mode === 'month') {   // skipped a day: the headache rings
    seatAt(P, -1.0, 0.42, -1.3, 0); P.arms.forEach((a, i) => a.rotation.set(-2.4, 0, i ? -0.5 : 0.5)); P.elbows.forEach(e => e.rotation.x = -1.6); P.face('worried', t);
    P.outer.updateMatrixWorld(true); const hd = headOf(P); RINGS.forEach((r, k) => { const u = ((t * 1.5) + k / 3) % 1; r.visible = true; r.position.copy(hd); r.scale.setScalar(0.7 + 1.4 * u); r.material.opacity = 1 - u; r.lookAt(rmCam.position); }); }
  else if (mode === 'year') {   // a year: 11 bags of sugar stacked up, cash beside them
    P.outer.position.set(1.6, 0.95, -0.7); P.outer.rotation.y = -0.4; P.face(t < YEAR + 2.5 ? 'surprised' : 'worried', t); const n = Math.min(11, Math.floor((t - YEAR - 0.2) / 0.2) + 1);
    BAGS.forEach((b, i) => { b.visible = i < n; const row = i < 5 ? 0 : i < 9 ? 1 : 2, col = i < 5 ? i : i < 9 ? i - 5 : i - 9; b.position.set(2.3 + (col - (row === 0 ? 2 : row === 1 ? 1.5 : 0.5)) * 0.28, row * 0.36, -0.9); b.rotation.y = 0.05 * Math.sin(i * 3); });
    cash.forEach((c, i) => { c.visible = t > YEAR + 3.4; c.position.set(1.05 + (i % 4) * 0.16, 0.02 + Math.floor(i / 4) * 0.032, -0.35); }); }
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
const CN = 300, cellM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.2, 0.15) }), CN), sugM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.011, 0.011, 0.011), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.2) }), CN);
cellM.frustumCulled = sugM.frustumCulled = false; organs.add(cellM, sugM);
const CL = Array.from({ length: CN }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.007), s: rnd() }));
const bpmAt = t => Math.round(lerp(72, 104, smooth(MIN30 + 0.6, MIN30 + 3.0, t)));
const _o = new THREE.Object3D(), _v = new THREE.Vector3();
function updateXray(t, mode) { const bpm = bpmAt(t), sp = bpm / 72, ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(0, ph - 0.18) * 9) * (ph > 0.18);
  heartG.scale.setScalar(1 + 0.2 * beat); const sugar = mode === 'sugarx' ? smooth(HOUR1 + 3.0, HOUR1 + 4.5, t) : 0;
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
// =================== THE ER (2011): a cartoon hospital front, a crowd that keeps growing toward 20,783 ===================
const erS = new THREE.Scene(); erS.background = new THREE.Color('#8ab8e8'); const eCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 200); erS.fog = new THREE.Fog(0x8ab8e8, 20, 70);
erS.add(new THREE.HemisphereLight(0xf4f8ff, 0x7a8a6a, 1.1)); { const k = new THREE.DirectionalLight(0xfff0d8, 2.0); k.position.set(4, 8, 6); erS.add(k); }
{ const gr = mesh(new THREE.PlaneGeometry(200, 200), M('#b8b8b0', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; erS.add(gr);
  bx(12, 6, 3, '#f2f0ea', 0, 3, -6, erS); for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) bx(0.9, 0.8, 0.05, '#9ac8e8', -5 + c * 1.4, 1.6 + r * 1.4, -4.47, erS);
  const erT = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#e8303a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = 'bold 62px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('EMERGENCY', w / 2, 70); });
  const er = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: erT, color: new THREE.Color(1.4, 1.4, 1.4) })); er.position.set(0, 5.2, -4.45); erS.add(er);
  bx(2.4, 2.4, 0.1, '#5a6a7a', 0, 1.2, -4.45, erS); const amb = new THREE.Group(); bx(2.6, 1.2, 1.1, '#ffffff', 0, 0.9, 0, amb); bx(0.9, 0.9, 1.08, '#ffffff', 1.6, 0.75, 0, amb); bx(2.62, 0.15, 1.12, '#e8303a', 0, 1.0, 0, amb); amb.position.set(4.0, 0, -2.4); erS.add(amb); }
const ERN = 1400, erBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.09, 0.4, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), ERN), erHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), ERN);
erBody.frustumCulled = erHead.frustumCulled = false; erS.add(erBody, erHead);
const ERP = Array.from({ length: ERN }, (_, i) => { const a = i * 2.39996, r = 0.35 * Math.sqrt(i); return [Math.cos(a) * r * 1.4, 2.5 + Math.sin(a) * r * 0.9 * 0.6 + r * 0.3]; });
{ const col = new THREE.Color(); ERP.forEach((_, i) => { erBody.setColorAt(i, col.set(pick(['#e24b3b', '#2f5d8a', '#e0b040', '#4b8b5a', '#7a4a8c', '#f08a4b', '#5aa0c8', '#d46a8a']))); erHead.setColorAt(i, col.set(pick(['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c']))); }); }
function updateER(t) { const n = Math.floor(ERN * smooth(ER + 0.3, ER + 5.5, t)); ERP.forEach(([x, z], i) => { const on = i < n; _o.position.set(x, on ? 0.33 : -5, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); erBody.setMatrixAt(i, _o.matrix); _o.position.y = on ? 0.68 : -5; _o.updateMatrix(); erHead.setMatrixAt(i, _o.matrix); });
  erBody.instanceMatrix.needsUpdate = erHead.instanceMatrix.needsUpdate = true; }
