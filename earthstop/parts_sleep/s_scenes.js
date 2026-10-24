// =================== BRAIN (abstract): a glassy pink brain; blue fluid washes waste particles out — the alarm stops it at ~62% ===================
const brs = new THREE.Scene(); brs.background = new THREE.Color('#0b1024'); const bCam = new THREE.PerspectiveCamera(36, W / H, 0.05, 50);
brs.add(new THREE.HemisphereLight(0xc8d8ff, 0x302040, 0.9)); { const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(2, 3, 4); brs.add(k); }
const brainGeo = (() => { const geo = new THREE.SphereGeometry(1, 150, 110); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let { x, y, z } = v; x *= 0.95; y *= 0.82; z *= 1.15;
    const folds = Math.sin(z * 9 + Math.sin(y * 7) * 1.8 + Math.sin(x * 5)) * Math.sin(y * 8 + Math.sin(x * 6 + z * 3) * 1.6) + 0.5 * Math.sin((z + x) * 13 + y * 4);
    const fis = Math.exp(-(x * x) / 0.004) * Math.max(0, y + 0.3); const d = 1 + 0.05 * Math.pow(Math.abs(folds), 0.6) - 0.1 * fis; p.setXYZ(i, x * d, y * d, z * d); }
  geo.computeVertexNormals(); return geo; })();
const brainM = new THREE.Mesh(brainGeo, new THREE.MeshPhysicalMaterial({ color: '#ff8fb8', roughness: 0.35, transmission: 0.0, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide })); brs.add(brainM);
const CH = [[[-0.5, 0.4, 0.6], [-0.2, 0.0, 0.2], [0, -0.45, 0], [0, -1.3, -0.2]], [[0.55, 0.35, 0.5], [0.25, 0, 0.15], [0, -0.45, 0], [0, -1.3, -0.2]], [[-0.45, 0.3, -0.6], [-0.2, -0.05, -0.25], [0, -0.45, 0]], [[0.5, 0.3, -0.6], [0.2, -0.05, -0.25], [0, -0.45, 0]]].map(a => new THREE.CatmullRomCurve3(a.map(q => V3(...q))));
const flowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.0, 2.2), transparent: true, opacity: 0.5 }); for (const c of CH) brs.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.035, 6, false), flowM));
const WASTE_N = 420; const waste = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: '#d8b84a', emissive: '#4a3a10', flatShading: true }), WASTE_N); waste.frustumCulled = false; brs.add(waste);
const WASTE = Array.from({ length: WASTE_N }, (_, i) => ({ p: V3(R(-0.8, 0.8), R(-0.5, 0.6), R(-0.95, 0.95)).multiply(V3(0.9, 0.8, 1)), c: i % CH.length, t0: R(0.2, 1.0), frac: rnd() }));
const _bo = new THREE.Object3D(), _bv = new THREE.Vector3();
const cleanAt = t => 0.62 * smooth(BRAIN + 0.3, BRAIN + 3.6, t);   // the job stops at 62% when the alarm rings
function updateBrainS(t) { brainM.rotation.y = 0.3 * Math.sin(t * 0.4); const cl = cleanAt(t);
  WASTE.forEach((Wt, i) => { const leaving = Wt.frac < cl; let pos; if (leaving) { const u = clamp((cl - Wt.frac) / 0.25, 0, 1); pos = Wt.p.clone().lerp(CH[Wt.c].getPointAt(Math.min(1, u)), Math.min(1, u * 2)); } else pos = Wt.p.clone().add(V3(Math.sin(t * 2 + i) * 0.01, Math.cos(t * 1.7 + i) * 0.01, 0));
    pos.applyAxisAngle(V3(0, 1, 0), brainM.rotation.y); _bo.position.copy(pos); _bo.rotation.set(t + i, t * 0.7, 0); _bo.scale.setScalar(leaving && pos.y < -1.1 ? 0.0001 : 1); _bo.updateMatrix(); waste.setMatrixAt(i, _bo.matrix); }); waste.instanceMatrix.needsUpdate = true;
  flowM.opacity = 0.55 * (1 - smooth(BRAIN + 3.7, BRAIN + 4.2, t)) + 0.1; }
function brainCamera(t) { const a = lerp(-0.5, 0.4, smooth(BRAIN, MORN, t)); bCam.position.set(Math.sin(a) * 3.6, 0.6, Math.cos(a) * 3.6); bCam.lookAt(0, -0.15, 0); }
// =================== ROAD (meters): morning commute; your car weaves over the line ===================
const road = new THREE.Scene(); road.background = new THREE.Color('#a8c8e8'); road.fog = new THREE.Fog(0xc8d8e8, 60, 260); const rdCam = new THREE.PerspectiveCamera(55, W / H, 0.1, 600);
road.add(new THREE.HemisphereLight(0xdfeaff, 0x6a7a50, 1.0)); { const s = new THREE.DirectionalLight(0xffe8c8, 2.6); s.position.set(-40, 50, -60); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 200 }); road.add(s, s.target); }
{ const gr = mesh(new THREE.PlaneGeometry(600, 600), M('#7aa85a', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; gr.position.y = -0.02; road.add(gr);
  const asph = mesh(new THREE.PlaneGeometry(9, 600), M('#4a4a50', { roughness: 0.9 }), false, true); asph.rotation.x = -Math.PI / 2; asph.position.set(0, 0, -250); road.add(asph);
  for (let z = 10; z > -500; z -= 6) { const d = mesh(new THREE.PlaneGeometry(0.16, 3), M('#f2d04a'), false, true); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.01, z); road.add(d); }
  for (const sx of [-4.3, 4.3]) { const e = mesh(new THREE.PlaneGeometry(0.14, 600), M('#f4f4f4'), false, true); e.rotation.x = -Math.PI / 2; e.position.set(sx, 0.01, -250); road.add(e); }
  for (let i = 0; i < 90; i++) { const sx = pick([-1, 1]), x = sx * R(7, 40), z = R(-480, 20); if (rnd() < 0.6) { const t = mesh(new THREE.ConeGeometry(R(1.2, 2.2), R(4, 7), 7), M(pick(['#3a7a3a', '#4a8a3e', '#2f6a34']))); t.position.set(x, 2.5, z); road.add(t); const tr = mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6), M('#6a4a30')); tr.position.set(x, 0.6, z); road.add(tr); }
    else { const h = grp(sx * R(12, 30), 0, R(-480, 0), R(0, 6), road); bx(6, 3.2, 5, pick(['#f2e6cc', '#e8c8a8', '#cfe0f0', '#f4d4d4']), 0, 1.6, 0, h); const rf = mesh(new THREE.ConeGeometry(4.6, 2, 4), M(pick(['#a8483a', '#5a5a64', '#6a4a3a']))); rf.position.y = 4.2; rf.rotation.y = Math.PI / 4; h.add(rf); } } }
function car(color) { const g = new THREE.Group(); bx(1.9, 0.75, 4.3, color, 0, 0.6, 0, g); bx(1.7, 0.6, 2.2, '#2a3240', 0, 1.25, 0.2, g, { roughness: 0.2, metalness: 0.4 });
  for (const wx of [-0.95, 0.95]) for (const wz of [-1.4, 1.4]) { const w = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12), M('#1a1a1a')); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.35, wz); g.add(w); }
  for (const sx of [-0.6, 0.6]) bx(0.3, 0.12, 0.05, '#ff3a2a', sx, 0.75, 2.16, g, { emissive: '#ff2a1a' }); road.add(g); return g; }
const myCar = car('#3a7ac8'), oncoming = car('#e8584a');
const carX = t => 2.2 + 1.6 * Math.sin((t - DRIVE) * 1.3) * smooth(DRIVE + 0.8, DRIVE + 2.5, t) - 1.9 * fadeWin(t, DRIVE + 3.4, DRIVE + 4.8, 0.5);
function updateRoad(t) { const z = -(t - DRIVE) * 14; myCar.position.set(carX(t), 0, z); myCar.rotation.y = -0.12 * Math.cos((t - DRIVE) * 1.3) * smooth(DRIVE + 0.8, DRIVE + 2.5, t);
  oncoming.position.set(-2.2, 0, z - 163 + (t - DRIVE) * 24); oncoming.rotation.y = Math.PI; }
function roadCamera(t) { const z = -(t - DRIVE) * 14; rdCam.position.set(carX(t) * 0.6 + 1.0, 3.0, z + 8.5); rdCam.lookAt(carX(t) * 0.8, 1.9, z - 14); rdCam.rotateZ(0.02 * Math.sin(t * 3)); }
// =================== OFFICE (meters): open-plan; a coworker, the outburst, the sneeze, the fog ===================
const office = new THREE.Scene(); office.background = new THREE.Color('#e8eef4'); const oCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 100);
office.add(new THREE.HemisphereLight(0xffffff, 0x8a8a90, 1.0)); { const s = new THREE.DirectionalLight(0xfff4e8, 1.8); s.position.set(3, 6, 4); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); office.add(s); }
{ const fl = mesh(new THREE.PlaneGeometry(20, 20), M('#9aa4b0', { roughness: 0.9 }), false, true); fl.rotation.x = -Math.PI / 2; office.add(fl); bx(20, 3.2, 0.1, '#f4f4f2', 0, 1.6, -4, office);
  for (let k = 0; k < 4; k++) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.7, 1.9) })); wn.position.set(-4.5 + k * 3, 1.8, -3.94); office.add(wn); } }
const scrTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#1e2a3a'; g.fillRect(0, 0, w, h); for (let y = 16; y < h; y += 18) { g.fillStyle = pick(['#5ac8ff', '#f2c84a', '#8a9ab0', '#5aff9a']); g.fillRect(14, y, R(60, 200), 8); } });
function desk(x, z, ry) { const g = grp(x, 0, z, ry, office); bx(1.6, 0.06, 0.8, '#d8c8a8', 0, 0.75, 0, g); for (const [dx, dz] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) bx(0.05, 0.75, 0.05, '#5a5e66', dx, 0.375, dz, g);
  bx(0.7, 0.42, 0.04, '#1a1a1e', 0, 1.05, -0.25, g); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.36), new THREE.MeshBasicMaterial({ map: scrTex, color: new THREE.Color(1.4, 1.4, 1.4) })); sc.position.set(0, 1.05, -0.228); g.add(sc);
  bx(0.5, 0.06, 0.5, '#3a3e46', 0, 0.5, 0.65, g); bx(0.5, 0.55, 0.06, '#3a3e46', 0, 0.8, 0.9, g); return g; }
for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (!(i === 1 && j === 0)) desk(-3 + i * 2, -2.2 + j * 2.2, 0);
desk(-1, -2.2, 0);   // your desk
const meO = makePerson(rnd, { top: '#f2c84a', bottom: '#3a4a6a', hair: '#2a1d16', skin: '#d8a07a', dress: false, shorts: false, longSleeve: false, cap: false, hairStyle: 0.3 }); office.add(meO.outer);
const coworker = makePerson(rnd, { top: '#6a4ad0', bottom: '#2a2e38', dress: false, cap: false }); office.add(coworker.outer);
const others = []; for (let k = 0; k < 5; k++) { const p = makePerson(rnd); office.add(p.outer); others.push(p); }
const VIR_N = 90; const virus = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ color: '#6ad84a', emissive: '#1a5a10', flatShading: true }), VIR_N); virus.frustumCulled = false; office.add(virus);
const VIR = Array.from({ length: VIR_N }, () => ({ d: V3(R(-0.6, 0.6), R(-0.25, 0.4), R(0.6, 1.4)).normalize(), sp: R(0.6, 1.6) }));
const fogO = makeSmoke(office, 500); const _ov = new THREE.Vector3(); const _oo = new THREE.Object3D();
const papers = []; for (let k = 0; k < 14; k++) { const p = mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ color: '#f8f8f4', side: THREE.DoubleSide }), true, false); office.add(p); papers.push({ p, a: R(0, 6), r: R(0.3, 1.0), y0: R(0.9, 2.0) }); }
function updateOffice(t) { const P = meO, o = P.outer; o.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0);
  // you at your desk (seat at z -1.55 facing -z)
  const angry = fadeWin(t, OFFICE + 2.2, OFFICE + 5.6, 0.25);
  o.position.set(-1, 0.55, -1.5); o.rotation.y = Math.PI; poseSit(P); if (angry > 0) { o.position.y = lerp(0.55, 0.95, angry); poseIdle(P, t, 0); P.arms[1].rotation.x = -1.8 * angry; P.arms[0].rotation.x = -1.6 * angry; P.root.rotation.x = -0.15 * angry; }
  if (t >= COLD && t < FOG) { const sn = fadeWin(t, COLD + 1.0, COLD + 2.2, 0.15); P.root.rotation.x = 0.45 * sn; P.arms[0].rotation.x = -2.4 * smooth(COLD + 0.4, COLD + 0.9, t); P.elbows[0].rotation.x = -2.0; }
  if (t >= FOG) { P.arms[1].rotation.set(-2.6, 0, -0.2); P.elbows[1].rotation.x = -0.4; }
  coworker.outer.position.set(-0.3, 0.95, -0.9); coworker.outer.rotation.y = -2.28; poseIdle(coworker, t, 1); coworker.outer.visible = t < SNACK; coworker.arms[1].rotation.x = -0.9 - 0.3 * Math.sin(t * 5) * (t < OFFICE + 2.5 ? 1 : 0);
  others.forEach((p, k) => { p.outer.position.set(-3 + (k % 4) * 2 + (k > 3 ? 1 : 0), 0.55, -1.5 + Math.floor(k / 4) * 2.2 + (k > 3 ? 0 : 2.2)); p.outer.rotation.y = Math.PI; poseSit(p); });
  // sneeze burst
  for (let i = 0; i < VIR_N; i++) { const V = VIR[i]; const age = t - (COLD + 1.25); if (age > 0 && age < 3.5 && t < FOG) { const hp = P.elbows[0].localToWorld(_ov.set(0, -0.2, 0)); _oo.position.set(-1, 1.45, -1.75).addScaledVector(V.d.clone().multiply(V3(1, 1, -1)), age * V.sp * (1 - age * 0.12)); _oo.position.y -= 0.05 * age * age; _oo.scale.setScalar(1); } else _oo.scale.setScalar(0.0001); _oo.rotation.set(t * 2 + i, t, 0); _oo.updateMatrix(); virus.setMatrixAt(i, _oo.matrix); } virus.instanceMatrix.needsUpdate = true;
  // brain fog: grey haze rolls in, papers float
  fogO.begin(); smokeMat.uniforms.uTint.value.set('#b8bcc4'); const fz = smooth(FOG, FOG + 2.5, t) * (1 - smooth(FIX - 1.2, FIX - 0.3, t)); if (fz > 0) for (let k = 0; k < 160; k++) { const a = k * 2.4 + t * 0.15; _ov.set(-1 + Math.cos(a) * (0.6 + (k % 7) * 0.35), 0.4 + (k % 9) * 0.25 + 0.1 * Math.sin(t + k), -1.5 + Math.sin(a) * (0.6 + (k % 7) * 0.35)); fogO.add(_ov, 0.9 + (k % 5) * 0.3, 0.32 * fz); } fogO.end();
  papers.forEach((Pp, k) => { Pp.p.visible = fz > 0.05; const a = Pp.a + t * 0.8; Pp.p.position.set(-1 + Math.cos(a) * Pp.r, Pp.y0 + 0.15 * Math.sin(t * 1.5 + k), -1.6 + Math.sin(a) * Pp.r); Pp.p.rotation.set(t + k, t * 0.7, k); }); }
function officeCamera(t) { let pos, look, fov = 50;
  if (t < SNACK) { const k = smooth(OFFICE, SNACK, t); pos = V3(0.3, 1.75, -3.7).lerp(V3(0.1, 1.68, -3.4), k); look = V3(-0.65, 1.25, -1.2); pos.add(V3(Math.sin(t * 31) * 0.02, Math.sin(t * 27) * 0.02, 0).multiplyScalar(fadeWin(t, OFFICE + 2.2, OFFICE + 3.4, 0.2))); }
  else if (t < FOG) { pos = V3(-0.35, 1.47, -3.05).lerp(V3(-0.5, 1.45, -2.85), smooth(COLD, FOG, t)); look = V3(-1.0, 1.3, -1.55); fov = 46; }
  else { const k = smooth(FOG, FIX, t); pos = V3(0.9, 1.9, -3.5).lerp(V3(0.2, 1.6, -2.95), k); look = V3(-1, 1.2, -1.5); }
  oCam.position.copy(pos); oCam.lookAt(look); oCam.fov = fov; }
