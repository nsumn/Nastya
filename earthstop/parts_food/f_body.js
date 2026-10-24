// =================== ARTERY (abstract, vertical for the portrait frame): blood cells flow up; after the breakfast the wall flexes half as much, fat drops appear;
// then salt crystals pour in and the pulse gets harder ===================
const artS = new THREE.Scene(); artS.background = new THREE.Color('#2a0a12'); const artCam = new THREE.PerspectiveCamera(46, W / H, 0.05, 50);
artS.add(new THREE.HemisphereLight(0xffd0d8, 0x401018, 1.0)); { const k = new THREE.DirectionalLight(0xfff0f0, 1.8); k.position.set(2, 3, 4); artS.add(k); const r = new THREE.PointLight(0xff6a7a, 4, 6, 1.5); r.position.set(-1.5, 0, 1.5); artS.add(r); }
const artWall = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 12, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#e05a6a', roughness: 0.5, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
artS.add(artWall); const artBack = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 12, 48, 1, true, Math.PI * 0.15, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: '#8a1a2a', roughness: 0.7, side: THREE.BackSide })); artS.add(artBack);
{ const rib = new THREE.TorusGeometry(0.555, 0.012, 6, 40); for (let y = -6; y <= 6; y += 0.45) { const r = new THREE.Mesh(rib, new THREE.MeshStandardMaterial({ color: '#f08a9a', transparent: true, opacity: 0.4 })); r.rotation.x = Math.PI / 2; r.position.y = y; artWall.add(r); } }
const RBC_N = 260; const rbcGeo = (() => { const g = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 0.075; p.setY(i, p.getY(i) * (0.4 + 0.9 * r * r)); } g.computeVertexNormals(); return g; })();
const rbc = new THREE.InstancedMesh(rbcGeo, new THREE.MeshStandardMaterial({ color: '#d8202e', roughness: 0.45 }), RBC_N); rbc.frustumCulled = false; artS.add(rbc);
const RBC = Array.from({ length: RBC_N }, () => { const a = R(0, 6.28), r = Math.sqrt(rnd()) * 0.42; return { x: Math.cos(a) * r, z: Math.sin(a) * r, y0: R(-6, 6), sp: R(1.1, 1.6), rx: R(0, 6), ry: R(0, 6) }; });
const FAT_N = 60; const fat = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 1), new THREE.MeshStandardMaterial({ color: '#f2d04a', emissive: '#5a4810', roughness: 0.3 }), FAT_N); fat.frustumCulled = false; artS.add(fat);
const SALT_N = 160; const salt = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#404448', roughness: 0.2 }), SALT_N); salt.frustumCulled = false; artS.add(salt);
const SLT = Array.from({ length: SALT_N }, (_, i) => ({ a: R(0, 6.28), r: Math.sqrt(rnd()) * 0.45, t0: SALT + 0.1 + i * 0.012 + R(0, 0.3), sp: R(0.8, 1.4) }));
const _ao = new THREE.Object3D();
// heartbeat-shaped pulse; the flex (how much the wall widens) halves after the breakfast; salt makes the beat faster and harder
const artFlex = t => lerp(1, 0.5, smooth(ART + 2.0, ART + 3.2, t));
function updateArtery(t) { const bpm = lerp(70, 92, smooth(SALT, SALT + 2.0, t)), ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 7) * (1 - Math.exp(-ph * 60));
  const flex = artFlex(t), sc = 1 + 0.09 * flex * beat + 0.03 * smooth(SALT, SALT + 2, t) * beat; artWall.scale.set(sc, 1, sc); artBack.scale.set(sc, 1, sc);
  artWall.material.color.set('#e05a6a').lerp(new THREE.Color('#c8a070'), 0.45 * smooth(ART + 2.0, ART + 3.2, t)).lerp(new THREE.Color('#ff3a4a'), 0.5 * smooth(SALT, SALT + 2, t));
  RBC.forEach((B, i) => { const y = wrapR(B.y0 + t * B.sp * (0.8 + 0.5 * beat), -6, 6); _ao.position.set(B.x * sc, y, B.z * sc); _ao.rotation.set(B.rx + t * 0.8, B.ry + t * 0.6, 0); _ao.scale.setScalar(1); _ao.updateMatrix(); rbc.setMatrixAt(i, _ao.matrix); }); rbc.instanceMatrix.needsUpdate = true;
  const fz = smooth(ART + 1.6, ART + 3.0, t); for (let i = 0; i < FAT_N; i++) { const B = RBC[i * 3]; _ao.position.set(B.z * 0.9, wrapR(B.y0 * 0.7 + t * 1.0, -6, 6), B.x * 0.9); _ao.rotation.set(0, 0, 0); _ao.scale.setScalar(Math.max(0.0001, fz * (0.7 + 0.6 * hash(i)))); _ao.updateMatrix(); fat.setMatrixAt(i, _ao.matrix); } fat.instanceMatrix.needsUpdate = true;
  SLT.forEach((S, i) => { const age = t - S.t0; if (age < 0) _ao.scale.setScalar(0.0001); else { const yIn = 2.4 - age * 3.2; const y = yIn > 0.4 ? yIn : wrapR(0.4 + (age - (2.0 / 3.2)) * 1.4 * S.sp, -6, 6); const r = yIn > 0.4 ? S.r + 0.9 * clamp((yIn - 0.4) / 2, 0, 1) : S.r;
    _ao.position.set(Math.cos(S.a) * r * sc, y, Math.sin(S.a) * r * sc + (yIn > 0.4 ? 0.6 : 0)); _ao.scale.setScalar(1); } _ao.rotation.set(t * 2 + i, t * 1.3 + i, 0); _ao.updateMatrix(); salt.setMatrixAt(i, _ao.matrix); }); salt.instanceMatrix.needsUpdate = true; }
function arteryCamera(t) { const k = smooth(ART - 0.5, DAY5, t); artCam.position.set(lerp(0.9, -0.5, k), lerp(-0.6, 0.3, k), lerp(2.3, 2.0, k)); artCam.lookAt(0, lerp(0.1, 0.4, k), 0); }
// =================== GUT GARDEN (abstract): villi + colourful bacteria; ~40% of the species fade out; the glowing nerve to the brain carries fewer sparks ===================
const gutS = new THREE.Scene(); gutS.background = new THREE.Color('#230a18'); gutS.fog = new THREE.Fog(0x230a18, 4, 11); const gutCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 60);
gutS.add(new THREE.HemisphereLight(0xffd8e8, 0x3a1024, 1.1)); { const k = new THREE.DirectionalLight(0xfff0f4, 1.4); k.position.set(1, 4, 3); gutS.add(k); }
{ const g = new THREE.PlaneGeometry(14, 16, 70, 80); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.12 * Math.sin(x * 2.1 + y * 0.7) * Math.cos(y * 1.7) + 0.35 * Math.pow(Math.abs(x) / 7, 2) * 3); } g.computeVertexNormals();
  const fl = mesh(g, M('#d86a80', { roughness: 0.6 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.z = -4; gutS.add(fl); }
const VIL_N = 700; const villi = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.28, 3, 6), new THREE.MeshStandardMaterial({ color: '#f29aaa', roughness: 0.55 }), VIL_N); villi.frustumCulled = false; gutS.add(villi);
const VIL = Array.from({ length: VIL_N }, () => ({ x: R(-3.5, 3.5), z: R(-11, 3), s: R(0.7, 1.3), ph: R(0, 6) }));
const BAC_N = 420, SPECIES = 40, BCOL = ['#2ad8c8', '#8ae83a', '#b86af0', '#ff9a3a', '#3a9aff', '#f2e04a', '#ff5aa8', '#5af0a0'];
const bac = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.035, 0.09, 3, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, emissive: '#202020' }), BAC_N); bac.frustumCulled = false; gutS.add(bac);
const BAC = Array.from({ length: BAC_N }, (_, i) => { const sp = Math.floor(rnd() * SPECIES); return { sp, x: R(-2.6, 2.6), y: R(0.12, 0.7), z: R(-9, 2.2), ph: R(0, 6), col: new THREE.Color(BCOL[sp % BCOL.length]).offsetHSL(((sp * 0.137) % 0.1) - 0.05, 0, 0) }; });
const lostAt = sp => sp < SPECIES * 0.4 ? GUT + 3.2 + (sp / (SPECIES * 0.4)) * 3.6 : 1e9;   // species 0-15 die out between +3.2 s and +6.8 s
const nerve = new THREE.CatmullRomCurve3([V3(0.3, 0.1, -2.5), V3(0.6, 1.2, -4.5), V3(0.2, 2.6, -6.5), V3(0, 3.8, -8)]);
const nerveM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 2.4) }); gutS.add(new THREE.Mesh(new THREE.TubeGeometry(nerve, 60, 0.04, 6, false), nerveM));
const gutBrain = mesh(new THREE.SphereGeometry(0.7, 20, 14), new THREE.MeshStandardMaterial({ color: '#ff9ac0', emissive: '#5a2040', roughness: 0.4 })); gutBrain.scale.set(1, 0.8, 1.15); gutBrain.position.set(0, 4.3, -8.4); gutS.add(gutBrain);
const SPK_N = 50; const spk = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 0.8) }), SPK_N); spk.frustumCulled = false; gutS.add(spk);
const _go = new THREE.Object3D(), _gc = new THREE.Color();
const gutHealth = t => 1 - 0.4 * smooth(GUT + 3.2, GUT + 6.8, t);
function updateGut(t) { VIL.forEach((V, i) => { _go.position.set(V.x, 0.12 + 0.35 * Math.pow(Math.abs(V.x) / 7, 2) * 3, V.z); _go.rotation.set(0.12 * Math.sin(t * 1.3 + V.ph), 0, 0.12 * Math.cos(t * 1.1 + V.ph)); _go.scale.set(1, V.s, 1); _go.updateMatrix(); villi.setMatrixAt(i, _go.matrix); }); villi.instanceMatrix.needsUpdate = true;
  BAC.forEach((B, i) => { const gone = smooth(lostAt(B.sp), lostAt(B.sp) + 0.6, t); _go.position.set(B.x + 0.06 * Math.sin(t * 2 + B.ph), B.y + 0.05 * Math.sin(t * 2.6 + B.ph * 2) - 0.3 * gone, B.z + 0.06 * Math.cos(t * 1.7 + B.ph));
    _go.rotation.set(t * 0.8 + B.ph, B.ph, Math.sin(t * 3 + B.ph)); _go.scale.setScalar(Math.max(0.0001, 1 - gone)); _go.updateMatrix(); bac.setMatrixAt(i, _go.matrix); bac.setColorAt(i, _gc.copy(B.col).multiplyScalar(lerp(1.4, 0.4, gone))); });
  bac.instanceMatrix.needsUpdate = true; bac.instanceColor.needsUpdate = true;
  const h = gutHealth(t); nerveM.color.setRGB(1.6 * h, 1.2 * h, 2.4 * h); gutBrain.material.emissive.set('#5a2040').multiplyScalar(lerp(0.2, 1, (h - 0.6) / 0.4));
  for (let i = 0; i < SPK_N; i++) { const on = i / SPK_N < (h - 0.55) / 0.45; const u = (t * 0.35 + i / SPK_N) % 1; _go.position.copy(nerve.getPointAt(u)); _go.rotation.set(0, 0, 0); _go.scale.setScalar(on ? 1 : 0.0001); _go.updateMatrix(); spk.setMatrixAt(i, _go.matrix); } spk.instanceMatrix.needsUpdate = true; }
function gutCamera(t) { const k = smooth(GUT - 0.5, WT + 0.5, t); gutCam.position.set(lerp(-0.4, 0.4, k), lerp(0.75, 1.1, k), lerp(2.6, 0.4, k)); gutCam.lookAt(lerp(0, 0.1, k), lerp(0.6, 2.0, smooth(GUT + 4.5, WT, t)), -5); }
// =================== LIVER (abstract): sugar cubes rain in; the liver turns from healthy red-brown to a stressed, pulsing amber ===================
const livS = new THREE.Scene(); livS.background = new THREE.Color('#1c0a10'); const livCam = new THREE.PerspectiveCamera(44, W / H, 0.05, 50);
livS.add(new THREE.HemisphereLight(0xffe0d8, 0x30101a, 1.0)); { const k = new THREE.DirectionalLight(0xfff4e8, 2.0); k.position.set(2, 4, 4); livS.add(k); }
const liverGeo = (() => { const g = new THREE.SphereGeometry(1, 64, 40); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const right = smooth(-0.6, 0.6, v.x); let x = v.x * 1.55, y = v.y * lerp(0.45, 0.8, right), z = v.z * lerp(0.55, 0.85, right);
    y += 0.25 * right - 0.15 * v.x * v.x; y -= 0.18 * Math.exp(-((v.x - 0.05) ** 2) / 0.02) * Math.max(0, v.y); const n = 1 + 0.03 * Math.sin(v.x * 7 + v.z * 5) * Math.sin(v.y * 6); p.setXYZ(i, x * n, y * n, z * n); }
  g.computeVertexNormals(); return g; })();
const liver = mesh(liverGeo, new THREE.MeshStandardMaterial({ color: '#8a2a2a', roughness: 0.45, emissive: '#000000' })); livS.add(liver);
const CUBE_N = 140; const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#303030' }), CUBE_N); cubes.frustumCulled = false; livS.add(cubes);
const CUB = Array.from({ length: CUBE_N }, (_, i) => ({ x: R(-0.9, 0.9), z: R(-0.3, 0.35), t0: LIV - 0.4 + i * 0.04 + R(0, 0.2), r: R(0, 6) }));
function updateLiver(t) { const st = smooth(LIV + 1.0, LIV + 4.5, t), pulse = 0.5 + 0.5 * Math.sin(t * 6); liver.rotation.y = -0.25 + 0.15 * Math.sin(t * 0.5);
  liver.material.color.set('#8a2a2a').lerp(new THREE.Color('#d89a3a'), st); liver.material.emissive.setRGB(0.5 * st * pulse, 0.18 * st * pulse, 0); liver.scale.setScalar(0.72 * (1 + 0.05 * st));
  CUB.forEach((C, i) => { const age = t - C.t0; let y = 3.2 - age * 2.6; if (age < 0) y = 9; const sink = clamp((0.55 - y) / 0.5, 0, 1); _ao.position.set(C.x, Math.max(y, 0.1), C.z); _ao.rotation.set(C.r + t, C.r * 2 + t * 0.7, 0); _ao.scale.setScalar(Math.max(0.0001, 1 - sink)); _ao.updateMatrix(); cubes.setMatrixAt(i, _ao.matrix); }); cubes.instanceMatrix.needsUpdate = true; }
function liverCamera(t) { const a = lerp(-0.35, 0.25, smooth(LIV - 0.5, LAZY + 0.5, t)); livCam.position.set(Math.sin(a) * 5.6, 1.3, Math.cos(a) * 5.6); livCam.lookAt(0, 0.35, 0); }
