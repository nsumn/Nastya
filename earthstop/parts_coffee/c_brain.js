// =================== THE BRAIN (abstract): a glassy brain covered in receptor "cups". Blue adenosine (the "I'm tired" signal) drifts in;
// orange caffeine hexagons sit in the cups so the blue can't land. Then the brain adapts: more cups sprout, and it takes more caffeine to fill them ===================
const brC = new THREE.Scene(); brC.background = new THREE.Color('#081020'); const brCam = new THREE.PerspectiveCamera(38, W / H, 0.05, 60);
brC.add(new THREE.HemisphereLight(0xc8d8ff, 0x302040, 1.0)); { const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(2, 3, 4); brC.add(k); }
const brGeo = (() => { const geo = new THREE.SphereGeometry(1, 140, 100); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let { x, y, z } = v; x *= 0.95; y *= 0.8; z *= 1.18; const f = Math.sin(z * 8 + Math.sin(y * 7) * 2) * Math.sin(y * 9 + Math.sin(x * 5 + z * 3) * 1.6); const d = 1 + 0.045 * Math.pow(Math.abs(f), 0.6) - 0.09 * Math.exp(-(x * x) / 0.004) * Math.max(0, y + 0.3); p.setXYZ(i, x * d, y * d, z * d); }
  geo.computeVertexNormals(); return geo; })();
const brMesh = new THREE.Mesh(brGeo, new THREE.MeshStandardMaterial({ color: '#f29ab8', roughness: 0.45, transparent: true, opacity: 0.85 })); brC.add(brMesh);
// receptor cups on the surface: 70 at first, up to 130 after "adapting"
const RC_N = 130, RC0 = 70; const cupGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.05, 12, 1, true);
const cups = new THREE.InstancedMesh(cupGeo, new THREE.MeshStandardMaterial({ color: '#f4f0ff', emissive: '#30304a', side: THREE.DoubleSide }), RC_N); cups.frustumCulled = false; brC.add(cups);
const RC = []; for (let i = 0; i < RC_N; i++) { const v = V3(R(-1, 1), R(-0.4, 1), R(-1, 1)).normalize(); v.multiply(V3(0.95, 0.8, 1.18)).multiplyScalar(1.03); RC.push({ p: v, n: v.clone().normalize(), born: i < RC0 ? -1 : ADAPT + 0.8 + (i - RC0) * 0.05, fill: hash(i * 3.7) }); }
const cafM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 6), new THREE.MeshStandardMaterial({ color: '#e8862a', emissive: '#5a2a06', flatShading: true }), RC_N); cafM.frustumCulled = false; brC.add(cafM);
const AD_N = 90; const adM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 0.45, 1.5) }), AD_N); adM.frustumCulled = false; brC.add(adM);
const AD = Array.from({ length: AD_N }, () => ({ dir: V3(R(-1, 1), R(-0.5, 1), R(-1, 1)).normalize(), ph: R(0, 6.28), sp: R(0.4, 0.8) }));
const _bc = new THREE.Object3D(), _q3 = new THREE.Quaternion();
// share of cups filled by caffeine: full in "BRAIN"; after adapting the new cups are mostly empty, so blue lands on them -> "need more coffee"
function updateBrainC(t) { brMesh.rotation.y = 0.25 * Math.sin(t * 0.35); const rot = brMesh.rotation.y;
  RC.forEach((C, i) => { const alive = C.born < 0 ? 1 : smooth(C.born, C.born + 0.4, t); _q3.setFromUnitVectors(V3(0, 1, 0), C.n); _bc.position.copy(C.p).applyAxisAngle(V3(0, 1, 0), rot); _bc.quaternion.copy(_q3).premultiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rot)); _bc.scale.setScalar(Math.max(0.0001, alive)); _bc.updateMatrix(); cups.setMatrixAt(i, _bc.matrix);
    const caf = (C.born < 0 ? smooth(BRAIN + 0.4 + C.fill * 1.6, BRAIN + 0.9 + C.fill * 1.6, t) : smooth(ADAPT + 3.6 + C.fill * 1.8, ADAPT + 4.1 + C.fill * 1.8, t)) * alive;
    _bc.position.addScaledVector(C.n.clone().applyAxisAngle(V3(0, 1, 0), rot), 0.03 + 0.4 * (1 - caf)); _bc.scale.setScalar(Math.max(0.0001, caf > 0.01 ? 1 : 0)); _bc.updateMatrix(); cafM.setMatrixAt(i, _bc.matrix); });
  cups.instanceMatrix.needsUpdate = cafM.instanceMatrix.needsUpdate = true;
  AD.forEach((A, i) => { const r = 1.55 + 0.25 * Math.sin(t * A.sp * 3 + A.ph); _bc.position.copy(A.dir).multiplyScalar(r).applyAxisAngle(V3(0, 1, 0), t * 0.2 + A.ph); _bc.position.y += 0.05 * Math.sin(t * 2 + i); _bc.rotation.set(0, 0, 0); _bc.scale.setScalar(1); _bc.updateMatrix(); adM.setMatrixAt(i, _bc.matrix); }); adM.instanceMatrix.needsUpdate = true; }
function brainCamC(t) { const k = smooth(BRAIN, ADAPT, t), k2 = smooth(ADAPT, QUIT, t); const d = lerp(5.6, 3.2, k) + lerp(0, 2.2, k2), a = lerp(-0.5, 0.3, k) + 0.3 * k2; brCam.position.set(Math.sin(a) * d, lerp(1.0, 0.6, k), Math.cos(a) * d); brCam.lookAt(0, lerp(0.05, 0.2, k), 0); }
// =================== SPLIT (meters): two people side by side, each with an alertness meter and a dashed "normal" line.
// Left drinks coffee daily, right never does. TWIST: after the cup they read the same. BOOST: the left meter starts below normal in the morning, the cup only brings it back ===================
const split = new THREE.Scene(); split.background = new THREE.Color('#f0e4d4'); const spCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 100);
split.add(new THREE.HemisphereLight(0xfff4e8, 0x8a7a68, 1.1)); { const s = new THREE.DirectionalLight(0xffe8c8, 1.6); s.position.set(3, 5, 6); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); split.add(s); }
{ const fl = mesh(new THREE.PlaneGeometry(20, 20), M('#d8c8b0', { roughness: 0.9 }), false, true); fl.rotation.x = -Math.PI / 2; split.add(fl); bx(20, 4, 0.1, '#f4ece0', 0, 2, -2, split); bx(0.06, 4, 0.06, '#c8b8a0', 0, 2, -1.9, split); }
const drinker = makePerson(rnd, { top: '#8a8e98', bottom: '#2a3a5a', hair: '#3a2416', skin: '#d8a882', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.55 });
const never = makePerson(rnd, { top: '#5aa86a', bottom: '#3a3a40', hair: '#1a1a1a', skin: '#b98260', dress: false, cap: false }); split.add(drinker.outer, never.outer); const faceD = addFace(drinker, '#d8a882', '#3a2416'), faceN = addFace(never, '#b98260', '#1a1a1a');
const mugS = new THREE.Group(); { const m = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 14), M('#f4f4f2')); m.position.y = 0.055; mugS.add(m); } drinker.elbows[0].add(mugS); mugS.position.set(0, -0.3, 0.06);
// a game-style bar floating over each head; the white tick in the middle = "normal"
function meter(x) { const g = grp(x, 2.12, 0, 0, split); bx(0.5, 0.075, 0.03, '#2a2a30', 0, 0, 0, g); const fill = bx(1, 0.05, 0.04, '#5fd27a', 0, 0, 0.004, g); bx(0.012, 0.12, 0.05, '#ffffff', 0, 0, 0.008, g); return { g, fill }; }
const mL = meter(-0.5), mR = meter(0.5);
function setMeter(m, level, col) { const w = Math.max(0.005, level * 0.47); m.fill.scale.x = w; m.fill.position.x = -0.235 + w / 2; m.fill.material = M(col, { emissive: col, emissiveIntensity: 0.25 }); }   // level 0.5 = the white "normal" tick
function updateSplit(t) { for (const [P, x] of [[drinker, -0.5], [never, 0.5]]) { P.root.rotation.set(0, 0, 0); P.outer.position.set(x, 0.95, 0); P.outer.rotation.y = 0; poseIdle(P, t, x); }
  let left;
  if (t < BOOST) { const sip = smooth(TWIST + 0.6, TWIST + 1.6, t); drinker.arms[0].rotation.x = lerp(-0.6, -1.3, sip); drinker.elbows[0].rotation.x = lerp(-1.0, -1.9, sip); left = 0.5; }
  else { const sip = smooth(BOOST + 2.2, BOOST + 3.0, t); drinker.arms[0].rotation.x = lerp(-0.6, -1.3, sip); drinker.elbows[0].rotation.x = lerp(-1.0, -1.9, sip); left = lerp(lerp(0.5, 0.18, smooth(BOOST - 0.2, BOOST + 1.0, t)), 0.5, smooth(BOOST + 2.6, BOOST + 4.2, t));
    drinker.root.rotation.x = 0.15 * (1 - smooth(BOOST + 2.6, BOOST + 4.2, t)) * smooth(BOOST, BOOST + 1, t); }
  setMeter(mL, left, left < 0.45 ? '#e86a4a' : '#5fd27a'); setMeter(mR, 0.5, '#5fd27a'); faceD.setExpr(left < 0.4 ? 'tired' : 'neutral', t); faceN.setExpr('neutral', t + 1.3); }
function splitCam(t) { const k = smooth(TWIST - 0.5, BOOST - 0.5, t), b = smooth(BOOST - 0.6, BOOST + 1.4, t);   // both of them, then close on the morning drinker
  spCam.position.set(lerp(0, -0.3, b), lerp(1.62, 1.68, b), lerp(lerp(4.4, 4.0, k), 2.6, b)); spCam.lookAt(lerp(0, -0.42, b), lerp(1.45, 1.62, b), 0); }
