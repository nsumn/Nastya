const _o = new THREE.Object3D(), _v = new THREE.Vector3();
// =================== THE CAST: you (the low-poly human she approved) in the family-house set (m_sets.js), now a bedroom corner on the left ===================
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 });
room.add(hero.outer); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false;
const camKey = new THREE.PointLight(0xfff0e0, 1.4, 6, 1.2); rmCam.add(camKey); room.add(rmCam);   // soft key riding with the camera: faces never go dark
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.elbows.forEach(e => e.rotation.set(-0.15, 0, 0)); }
function seatAt(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
const LIE = V3(-2.9, 0.72, 1.34);   // lying in bed on your back, head at the headboard (-z)
// ---- the bed, a nightstand with a red digital clock and a little lamp, a blue "night" light from the window ----
const bed = new THREE.Group(); room.add(bed); bed.position.set(-2.9, 0, 1.3);
{ bx(1.1, 0.35, 2.0, '#6a4a34', 0, 0.18, 0, bed); bx(1.04, 0.16, 1.92, '#f2f0ec', 0, 0.43, 0, bed); bx(1.1, 0.8, 0.08, '#6a4a34', 0, 0.55, -1.0, bed); bx(0.55, 0.1, 0.3, '#ffffff', 0, 0.56, -0.78, bed); }
const duvet = bx(1.08, 0.2, 1.25, '#5a7ab0', 0, 0.8, 0.38, bed);
const clkCv = document.createElement('canvas'); clkCv.width = 256; clkCv.height = 96; const clkTex = new THREE.CanvasTexture(clkCv); clkTex.colorSpace = THREE.SRGBColorSpace; let clkLast = '';
function drawClock(txt) { if (txt === clkLast) return; clkLast = txt; const g = clkCv.getContext('2d'); g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff5a4a'; g.font = 'bold 64px Inter, monospace'; g.textAlign = 'center'; g.fillText(txt, 128, 72); clkTex.needsUpdate = true; }
{ const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: clkTex, color: new THREE.Color(1.6, 1.6, 1.6) })); ck.position.set(-3.6, 0.6, 0.0); ck.rotation.y = 0.5; room.add(ck);
  bx(0.4, 0.5, 0.4, '#6a4a30', -3.7, 0.25, 0.0, room); bx(0.36, 0.14, 0.2, '#1a1c22', -3.62, 0.57, 0.02, room).rotation.y = 0.5; }
const bedLamp = new THREE.PointLight(0xffc078, 0, 3.5, 1.4); bedLamp.position.set(-3.75, 1.0, 0.25); room.add(bedLamp);
{ bx(0.03, 0.3, 0.03, '#2a2a30', -3.8, 0.65, 0.12, room); const sh = mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.14, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#5a3a10' })); sh.position.set(-3.8, 0.85, 0.12); room.add(sh); }
const blueL = new THREE.PointLight(0x5a78ff, 0, 6, 1.2); blueL.position.set(-1.5, 2.2, 2.4); room.add(blueL);
const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); }), transparent: true, depthWrite: false })); zzz.scale.setScalar(0.2); room.add(zzz);
// ---- Halloween props: the candy mountain (instanced wrapped candies), the pumpkin bucket, flying wrappers, a treadmill ----
const CANDY_COLS = ['#e8463a', '#f4c430', '#8a3aa8', '#2a9a5a', '#f08a2a', '#3a6ad8', '#5a3a2a', '#f4f4f0', '#e86aa0'];
const PILE = V3(-1.15, 0, 1.75), NC = 420;
const candyM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.035, 0.05), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 }), NC); candyM.castShadow = true; room.add(candyM);
const CANDY = Array.from({ length: NC }, (_, i) => { const r = Math.sqrt(hash(i * 1.7)) * 0.62, a = hash(i * 3.1) * 6.283, h = 0.42 * (1 - r / 0.62) * (0.6 + 0.4 * hash(i * 5.3)); return { p: V3(PILE.x + Math.cos(a) * r, h + 0.02, PILE.z + Math.sin(a) * r * 0.8), ry: hash(i) * 6, rx: hash(i * 7) * 0.8, eat: hash(i * 9.9) }; });
{ const c = new THREE.Color(); CANDY.forEach((C, i) => candyM.setColorAt(i, c.set(CANDY_COLS[i % CANDY_COLS.length]))); }
const bucket = new THREE.Group(); { const b = mesh(new THREE.SphereGeometry(0.2, 14, 10), M('#f08a1a', { roughness: 0.6, flatShading: true })); b.scale.y = 0.8; b.position.y = 0.16; bucket.add(b);
  const face = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#1a0a04'; g.beginPath(); g.moveTo(30, 50); g.lineTo(50, 30); g.lineTo(55, 55); g.fill(); g.beginPath(); g.moveTo(98, 50); g.lineTo(78, 30); g.lineTo(73, 55); g.fill(); g.beginPath(); g.moveTo(25, 75); g.lineTo(103, 75); g.lineTo(90, 100); g.lineTo(64, 90); g.lineTo(38, 100); g.fill(); });
  const fp = mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: face, transparent: true }), false, false); fp.position.set(0, 0.17, 0.202); bucket.add(fp);
  const hdl = mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 20, Math.PI), M('#2a2a30')); hdl.position.y = 0.28; bucket.add(hdl); bucket.position.set(-0.45, 0, 1.55); bucket.rotation.y = -0.5; room.add(bucket); }
const WR = Array.from({ length: 14 }, (_, i) => { const w = bx(0.08, 0.005, 0.06, CANDY_COLS[i % CANDY_COLS.length], 0, 0, 0, room, { metalness: 0.3, roughness: 0.3 }); return w; });
const wrapFloor = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.004, 0.06), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.2 }), 120); room.add(wrapFloor);
{ const c = new THREE.Color(); for (let i = 0; i < 120; i++) { _o.position.set(-1.15 + (hash(i * 2.3) - 0.5) * 1.8, 0.003, 1.05 + (hash(i * 4.1) - 0.5) * 1.3); _o.rotation.set(0, hash(i) * 6, 0); _o.scale.setScalar(1); _o.updateMatrix(); wrapFloor.setMatrixAt(i, _o.matrix); wrapFloor.setColorAt(i, c.set(CANDY_COLS[i % 9])); } }
const tread = new THREE.Group(); { bx(0.7, 0.12, 1.7, '#2a2a30', 0, 0.06, 0, tread); bx(0.6, 0.02, 1.5, '#1a1a1e', 0, 0.13, 0, tread); for (const x of [-0.33, 0.33]) bx(0.05, 1.0, 0.05, '#5a5a62', x, 0.6, -0.75, tread); bx(0.75, 0.05, 0.2, '#5a5a62', 0, 1.1, -0.72, tread);
  const scr = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#0a2030'; g.fillRect(0, 0, w, h); g.fillStyle = '#5ad8ff'; g.font = 'bold 30px Inter'; g.fillText('5.0 MPH', 8, 42); }); const sp = mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: scr }), false, false); sp.position.set(0, 1.16, -0.6); sp.rotation.x = -0.6; tread.add(sp); }
tread.position.set(1.4, 0, 0.6); tread.rotation.y = Math.PI; room.add(tread);   // console toward the camera side: you face us
const sweat = makeSmoke(room, 30);
function hideProps() { candyM.visible = bucket.visible = wrapFloor.visible = tread.visible = false; WR.forEach(w => w.visible = false); zzz.visible = false; }
const CALS = 4800; const calAt = t => t < EAT ? 0 : CALS * ease(clamp((t - EAT - 0.3) / 6.5, 0, 1));
function updateHome(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); hideProps(); const P = hero; poseReset(P, t); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false;
  lightRoom('eve'); camKey.intensity = 1.2; bedLamp.intensity = 1.6; blueL.intensity = 0; duvet.visible = true; drawClock(t < WALK ? '9:30' : '11:58'); sweat.begin(); smokeMat.uniforms.uTint.value.set('#ffffff');
  if (mode === 'pile' || mode === 'dent') {   // on the floor in front of the candy mountain, eating as fast as possible
    candyM.visible = bucket.visible = true; wrapFloor.visible = true; wrapFloor.count = Math.floor(120 * clamp((calAt(t) / CALS), 0, 1)) + (mode === 'dent' ? 120 : 0); wrapFloor.count = Math.min(120, wrapFloor.count);
    const eaten = calAt(t) / CALS; CANDY.forEach((C, i) => { const gone = C.eat < eaten * 0.85; _o.position.copy(C.p); _o.position.y *= 1 - 0.7 * eaten; _o.rotation.set(C.rx, C.ry, 0); _o.scale.setScalar(gone ? 0.0001 : 1); _o.updateMatrix(); candyM.setMatrixAt(i, _o.matrix); }); candyM.instanceMatrix.needsUpdate = true;
    seatAt(P, -1.15, 0.0, 0.95, 0); P.outer.position.y = 0.95 - 0.87 * P.h + 0.02; const eating = mode === 'pile' && t >= EAT, f = eating ? 3.2 + 2.5 * smooth(EAT, EAT + 5, t) : 1.2, k = 0.5 + 0.5 * Math.sin(t * f * 2);
    P.arms[1].rotation.set(-0.7 - 1.4 * (eating ? k : 0.2), 0, -0.2); P.elbows[1].rotation.x = -0.4 - 1.5 * (eating ? k : 0.2); P.arms[0].rotation.set(-0.9 - (eating ? 0.6 * (1 - k) : 0), 0, 0.25); P.elbows[0].rotation.x = -0.5;
    P.face(mode === 'dent' ? 'squint' : t < EAT ? 'love' : t < EAT + 4 ? 'laugh' : 'wired', t);
    if (eating) WR.forEach((w, i) => { const u = ((t - EAT) * 1.6 + i / WR.length) % 1, a = i * 2.4; w.visible = true; w.position.set(-1.15 + Math.cos(a) * 0.5 * u, 1.0 + 1.1 * u - 1.9 * u * u, 1.2 + Math.sin(a) * 0.35 * u); w.rotation.set(t * 7 + i, t * 5, i); }); }
  else if (mode === 'rush') {   // bouncing off the walls… record scratch: frozen
    const froze = t > RUSH + 3.3; P.outer.position.set(-0.6, 0.95, 0.9); P.outer.rotation.y = 0.2;
    if (!froze) { const j = Math.abs(Math.sin((t - RUSH) * 5.5)); P.outer.position.y += 0.35 * j; P.arms.forEach((a, i) => a.rotation.set(-2.6 + 0.4 * Math.sin(t * 11 + i), 0, i ? -0.4 : 0.4)); P.legs.forEach((l, i) => l.rotation.x = 0.4 * Math.sin(t * 11 + i * Math.PI) * j); P.face('wired', t); }
    else { P.face(t > RUSH + 4.2 ? 'neutral' : 'surprised', t); P.arms.forEach((a, i) => a.rotation.set(0, 0, i ? -0.08 : 0.08)); } }
  else if (mode === 'crash') {   // slumps onto the bed, eyes closing
    const k = smooth(CRASH + 1.2, CRASH + 4.0, t); seatAt(P, -2.35, 0.45, 1.5, Math.PI / 2); duvet.visible = false; P.root.rotation.x = 0.3 + 0.2 * k; P.root.rotation.z = -0.9 * smooth(CRASH + 3.6, CRASH + 5.0, t);
    P.arms.forEach(a => a.rotation.set(-0.2, 0, 0)); P.face(k < 0.5 ? 'sleepy' : 'sleep', t); }
  else if (mode === 'walk') {   // walking it off on a treadmill (MODEL: 51 miles)
    tread.visible = true; P.outer.position.set(1.4, 0.95 + 0.14, 0.45); P.outer.rotation.y = 0; poseWalk(P, t * 8, 1); P.face(t < WALK + 4 ? 'worried' : 'crying', t);
    P.outer.updateMatrixWorld(true); const hd = headOf(P); for (let q = 0; q < 6; q++) { const u = (t * 1.3 + q / 6) % 1; sweat.add(hd.clone().add(V3(0.12 * Math.sin(q * 2), 0.05 - 0.3 * u, 0.12 * Math.cos(q * 2))), 0.02, 0.6 * (1 - u)); } }
  else {   // ache: in bed, curled, holding the stomach
    P.outer.position.copy(LIE); P.outer.rotation.set(-Math.PI / 2, 0, 0.5); P.arms.forEach((a, i) => a.rotation.set(-0.9, 0, i ? 0.5 : -0.5)); P.elbows.forEach(e => e.rotation.x = -1.4); P.face(t < ENDC ? 'sad' : 'sleep', t); bedLamp.intensity = 0.8; }
  sweat.end(); }
// =================== THE X-RAY BODY: your ghost silhouette; the brain glass-clear with the ALARM centre (amygdala) glowing; a signal runs down to the adrenal glands,
// which pour cortisol (orange) into the blood; then the heart beating fast ===================
const xr = new THREE.Scene(); xr.background = new THREE.Color('#0a0c18'); const xCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
xr.add(new THREE.AmbientLight(0x8a9ab8, 0.8)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(1, 2, 3); xr.add(k); }
{ const ringT = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(120,160,255,0.35)'; g.lineWidth = 2; for (let r = 40; r < 256; r += 36) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); } });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; xr.add(floor); }
const ghost = makeBlock({ head: 'human', body: 'human', skin: '#ffffff', hair: '#ffffff', top: '#ffffff', bottom: '#ffffff', shoe: '#ffffff', hairStyle: 'short', headS: 0.88 }); xr.add(ghost.outer); ghost.outer.position.set(0, 0.95, 0); poseIdle(ghost, 0, 0);
const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.6, 1.2), transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending });
ghost.outer.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
const heartG = new THREE.Group(); heartG.position.set(0.035, 1.3, 0.04); xr.add(heartG);
{ const hm = M('#e8283a', { emissive: '#7a0a14', roughness: 0.35 }); for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.034, 16, 12), hm); l.position.set(s * 0.024, 0.016, 0); heartG.add(l); } const tip = mesh(new THREE.ConeGeometry(0.05, 0.075, 16), hm); tip.rotation.x = Math.PI; tip.position.y = -0.03; heartG.add(tip); }
const VES = [[[0.035, 1.3, 0.04], [0.0, 1.5, 0.03], [0.0, 1.62, 0.02]], [[0.035, 1.3, 0.04], [0.16, 1.4, 0.02], [0.23, 1.18, 0.0], [0.26, 0.95, 0.02]], [[0.035, 1.3, 0.04], [-0.15, 1.4, 0.02], [-0.23, 1.18, 0.0], [-0.26, 0.95, 0.02]],
  [[-0.04, 1.12, 0.03], [0.0, 1.22, 0.04], [0.035, 1.3, 0.04]],
  [[0.035, 1.3, 0.04], [0.05, 1.05, 0.04], [0.1, 0.86, 0.02], [0.1, 0.42, 0.03], [0.1, 0.08, 0.05]], [[0.035, 1.3, 0.04], [0.0, 1.05, 0.04], [-0.1, 0.86, 0.02], [-0.1, 0.42, 0.03], [-0.1, 0.08, 0.05]]].map(pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p))));
const vesMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.15), transparent: true, opacity: 0.45 }); for (const c of VES) xr.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.007, 5, false), vesMat));
const CN = 260, cellM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.2, 0.15) }), CN), corM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.009, 0.009, 0.009), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.1) }), CN);
cellM.frustumCulled = corM.frustumCulled = false; xr.add(cellM, corM);
const CL = Array.from({ length: CN }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.007), s: rnd() }));

// pancreas + insulin (green) joining the sugar (white cubes) in the blood
const panc = mesh(new THREE.CapsuleGeometry(0.018, 0.09, 4, 8), M('#f2b07a', { emissive: '#5a2a10' }), false, false); panc.rotation.z = Math.PI / 2 - 0.3; panc.position.set(-0.03, 1.12, 0.03); xr.add(panc);
const insM = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.007, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.0, 0.6) }), CN); insM.frustumCulled = false; xr.add(insM);
function updateXray(t) { const sug = smooth(XRAY + 0.3, XRAY + 3.5, t), ins = smooth(XRAY + 4.2, XRAY + 6.5, t), beat = Math.exp(-((t * 1.6) % 1) * 9); heartG.scale.setScalar(1 + 0.22 * beat);
  panc.scale.setScalar(1 + 0.4 * ins * Math.abs(Math.sin(t * 7))); const sp = 1.4;
  CL.forEach((C, i) => { const u = (C.u0 + t * C.sp * sp) % 1; VES[C.v].getPointAt(u, _v).add(C.off); _o.position.copy(_v); _o.rotation.set(t + i, t * 0.7 + i, 0); _o.scale.setScalar(1); _o.updateMatrix(); cellM.setMatrixAt(i, _o.matrix);
    _o.position.add(V3(0.009, 0.005, 0.004)); _o.scale.setScalar(C.s < sug * 0.85 ? 1 : 0.0001); _o.updateMatrix(); corM.setMatrixAt(i, _o.matrix);
    _o.position.add(V3(-0.016, 0.004, 0)); _o.scale.setScalar(C.s < ins * 0.6 ? 1 : 0.0001); _o.updateMatrix(); insM.setMatrixAt(i, _o.matrix); }); cellM.instanceMatrix.needsUpdate = corM.instanceMatrix.needsUpdate = insM.instanceMatrix.needsUpdate = true; }

// =================== THE TOOTH (week 1): a big molar, acid drips, the enamel dulls and pits ===================
const toothS = new THREE.Scene(); toothS.background = new THREE.Color('#1a0e1a'); const tCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 50);
toothS.add(new THREE.HemisphereLight(0xffe8f0, 0x3a2030, 1.1)); { const k = new THREE.DirectionalLight(0xffffff, 1.8); k.position.set(1, 2, 3); toothS.add(k); }
const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbfaf4'), roughness: 0.25 });
const tooth = new THREE.Group(); toothS.add(tooth); { const crown = mesh(new RoundedBoxGeometry(0.5, 0.42, 0.45, 5, 0.12), enamel); crown.position.y = 0.3; tooth.add(crown); for (const s of [-1, 1]) { const r = mesh(new THREE.ConeGeometry(0.1, 0.42, 10), enamel); r.rotation.x = Math.PI; r.position.set(s * 0.13, -0.08, 0); tooth.add(r); }
  const gum = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.18, 24), M('#e86a7a', { roughness: 0.7 })); gum.position.y = 0.05; tooth.add(gum); }
const pits = Array.from({ length: 22 }, (_, i) => { const p = mesh(new THREE.SphereGeometry(0.02 + 0.02 * hash(i), 8, 6), M('#c8b070', { roughness: 0.9 })); const a = hash(i * 3.1) * Math.PI * 2; p.position.set(Math.cos(a) * 0.2, 0.32 + 0.16 * hash(i * 7.7), Math.sin(a) * 0.19 + 0.04); p.scale.z = 0.4; p.lookAt(p.position.clone().multiplyScalar(2)); tooth.add(p); return p; });
const drops = Array.from({ length: 10 }, (_, i) => { const d = mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: '#b8ff5a', emissive: '#3a6a10', transparent: true, opacity: 0.85, roughness: 0.1 })); d.scale.y = 1.4; toothS.add(d); return d; });
const acidFog = makeSmoke(toothS, 120);
function updateTooth(t) { const k = smooth(TOOTH + 1.0, TOOTH + 5.5, t); tooth.rotation.y = 0.4 * Math.sin(t * 0.4); enamel.color.set('#fbfaf4').lerp(new THREE.Color('#e4d6a8'), k); enamel.roughness = 0.25 + 0.6 * k;
  pits.forEach((p, i) => { p.visible = hash(i * 1.7) < k; p.scale.setScalar(Math.max(0.01, (k - hash(i * 1.7) * 0.8) * 1.5)); p.scale.z *= 0.4; });
  drops.forEach((d, i) => { const u = ((t - TOOTH) * 0.9 + i / 10) % 1; d.position.set(-0.2 + 0.4 * hash(i), 1.2 - u * 0.75, 0.05 + 0.15 * (hash(i * 3) - 0.5)); d.visible = u < 0.95; });
  acidFog.begin(); smokeMat.uniforms.uTint.value.set('#a8e870'); for (let n = 0; n < 40; n++) { const u = ((t * 0.3 + n / 40) % 1); acidFog.add(V3(Math.cos(n * 2.4) * 0.3, 0.5 + u * 0.3, Math.sin(n * 2.4) * 0.3), 0.06 + u * 0.08, 0.2 * (1 - u) * k); } acidFog.end(); }
