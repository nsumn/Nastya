// =================== ATOMS (1 unit ≈ 1 Å): two lattices — hers (warm electrons) above, his (cool) below. Seen from far they are a field of dots;
// up close every atom is a tiny nucleus in a cloud with three buzzing electrons. They come together, the facing clouds squash and spark — and stop ===================
const atomS = new THREE.Scene(); atomS.background = new THREE.Color('#050a1c'); const atCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
atomS.add(new THREE.AmbientLight(0x8090c0, 0.6)); { const k = new THREE.DirectionalLight(0xffffff, 1.0); k.position.set(2, 4, 5); atomS.add(k); }
const AX = 21, AY = 3, AZ = 3, ASP = 1.15, ATOMS = [];
for (const side of [1, -1]) for (let i = 0; i < AX; i++) for (let j = 0; j < AY; j++) for (let k = 0; k < AZ; k++)
  ATOMS.push({ side, x: (i - (AX - 1) / 2) * ASP + (side > 0 ? ASP * 0.5 : 0), y: side * (0.62 + j * ASP), z: (k - (AZ - 1) / 2) * ASP, layer: j, ph: R(0, 6.28), orb: [0, 1, 2].map(() => ({ ax: V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), sp: R(5, 9), ph: R(0, 6.28) })) });
const NA = ATOMS.length;
const nucM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.6) }), NA); nucM.frustumCulled = false; atomS.add(nucM);
const cloudM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.46, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending }), NA); cloudM.frustumCulled = false; atomS.add(cloudM);
const elM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NA * 3); elM.frustumCulled = false; atomS.add(elM);
const SPK_A = 160; const sparkA = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.4, 3.2) }), SPK_A); sparkA.frustumCulled = false; atomS.add(sparkA);
const HERC = new THREE.Color('#ff8ab0'), HISC = new THREE.Color('#5ad8ff'), _ac = new THREE.Color(), _o2 = new THREE.Object3D(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Vector3();
// her lattice comes down from LAT0 and settles with a little bounce: the clouds never merge
const latDrop = t => { const k = ease(clamp((t - LAT0 + 0.3) / 2.4, 0, 1)); return 2.6 * (1 - k) + 0.12 * Math.sin(clamp(t - LAT0 - 2.1, 0, 3) * 5) * Math.exp(-Math.max(0, t - LAT0 - 2.1) * 1.6); };
const pushAt = t => smooth(LAT0 + 1.2, LAT0 + 2.2, t);
function updateAtoms(t) { const dy = latDrop(t), push = pushAt(t);
  ATOMS.forEach((A, i) => { const y = A.y + (A.side > 0 ? dy : 0) + 0.015 * Math.sin(t * 7 + A.ph), face = A.layer === 0 ? push : 0, sq = 1 - 0.32 * face;
    _o2.position.set(A.x, y, A.z); _o2.rotation.set(0, 0, 0); _o2.scale.setScalar(1); _o2.updateMatrix(); nucM.setMatrixAt(i, _o2.matrix);
    _o2.position.y = y + A.side * 0.06 * face; _o2.scale.set(1 + 0.12 * face, sq, 1 + 0.12 * face); _o2.updateMatrix(); cloudM.setMatrixAt(i, _o2.matrix); cloudM.setColorAt(i, _ac.copy(A.side > 0 ? HERC : HISC).multiplyScalar(1 + 0.8 * face));
    A.orb.forEach((O, k) => { const a = t * O.sp + O.ph; _e2.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.42); _q2.setFromUnitVectors(V3(0, 1, 0), O.ax); _e2.applyQuaternion(_q2); _e2.y *= sq;
      _o2.position.set(A.x + _e2.x, y + _e2.y + A.side * 0.06 * face, A.z + _e2.z); _o2.scale.setScalar(1); _o2.updateMatrix(); elM.setMatrixAt(i * 3 + k, _o2.matrix); elM.setColorAt(i * 3 + k, A.side > 0 ? HERC : HISC); }); });
  nucM.instanceMatrix.needsUpdate = cloudM.instanceMatrix.needsUpdate = elM.instanceMatrix.needsUpdate = true; cloudM.instanceColor.needsUpdate = elM.instanceColor.needsUpdate = true;
  for (let s = 0; s < SPK_A; s++) { const on = push > 0.2 && hash(s * 7.1 + Math.floor(t * 18)) < 0.45 * push; const x = (hash(s * 3.3) - 0.5) * AX * ASP * 0.9, z = (hash(s * 5.7) - 0.5) * AZ * ASP * 0.9;
    _o2.position.set(x, dy * 0.5 + 0.0, z); _o2.rotation.set(0, hash(s) * 3, (hash(s * 9.1 + Math.floor(t * 18)) - 0.5) * 0.8); _o2.scale.setScalar(on ? 1 : 0.0001); _o2.updateMatrix(); sparkA.setMatrixAt(s, _o2.matrix); } sparkA.instanceMatrix.needsUpdate = true; }
// camera: a log-scale dolly from "1 mm away" (a field of dots) down to the gap between two atoms
const atDist = t => t < ATOM + 1 ? Math.exp(lerp(Math.log(150), Math.log(14), smooth(LENS + 0.3, ATOM, t))) : Math.exp(lerp(Math.log(9), Math.log(4.2), smooth(LAT0 - 0.4, LAT0 + 3.2, t)));
function atomCamera(t) { const d = atDist(t), a = 0.5 + 0.12 * Math.sin(t * 0.3); atCam.position.set(Math.sin(a) * d, d * 0.12 + 0.2, Math.cos(a) * d); atCam.lookAt(0, 0.25, 0); }
// =================== ONE ATOM, the textbook picture: a nucleus (6 protons + 6 neutrons) and electrons racing round three tilted orbits — mostly nothing ===================
const bohrS = new THREE.Scene(); bohrS.background = new THREE.Color('#050a1c'); const bhCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
bohrS.add(new THREE.AmbientLight(0x8090c0, 0.7)); { const k = new THREE.DirectionalLight(0xffffff, 1.8); k.position.set(2, 3, 4); bohrS.add(k); }
{ const n = 1200, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(40, 80)); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bohrS.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#5a6ab0', size: 2, sizeAttenuation: false }))); }
const bohrNuc = new THREE.Group(); bohrS.add(bohrNuc);
for (let i = 0; i < 12; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(i ? R(0.12, 0.2) : 0); const b = mesh(new THREE.SphereGeometry(0.13, 18, 12), new THREE.MeshStandardMaterial({ color: i % 2 ? '#ff5a4a' : '#9ab0d8', roughness: 0.35, emissive: i % 2 ? '#3a0a06' : '#0a1020' })); b.position.copy(v); bohrNuc.add(b); }
const nucGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,220,180,0.9)'); rg.addColorStop(1, 'rgba(255,120,80,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); nucGlow.scale.setScalar(0.9); bohrS.add(nucGlow);
const ORB = [0, 1, 2].map(k => { const g = new THREE.Group(); g.rotation.set(Math.PI / 2 + 0.35 * (k - 1), k * Math.PI / 3, 0); bohrS.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.006, 6, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.6, 1.1) })); ring.scale.set(1, 0.62, 1); g.add(ring);
  const els = [0, 1].map(() => { const e = mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 2.4, 3.2) })); g.add(e); return e; }); return { g, els, sp: 1.6 + k * 0.35 }; });
const bohrTrail = makeSmoke(bohrS, 200);
function updateBohr(t) { bohrNuc.rotation.set(t * 0.4, t * 0.6, 0);
  bohrTrail.begin(); smokeMat.uniforms.uTint.value.set('#7ad8ff');
  ORB.forEach((O, k) => { O.els.forEach((e, j) => { const a = t * O.sp * 2 + j * Math.PI + k; e.position.set(Math.cos(a) * 2.0, Math.sin(a) * 2.0 * 0.62, 0);
    for (let s = 1; s < 12; s++) { const b = a - s * 0.06; bohrTrail.add(O.g.localToWorld(V3(Math.cos(b) * 2.0, Math.sin(b) * 1.24, 0)), 0.09 * (1 - s / 12), 0.5 * (1 - s / 12)); } }); });
  bohrTrail.end(); }
function bohrCamera(t) { const k = smooth(ATOM, LAT0 + 0.4, t), a = 0.3 + 0.5 * k; bhCam.position.set(Math.sin(a) * lerp(7.4, 9.0, k), lerp(1.6, 0.8, k), Math.cos(a) * lerp(7.4, 9.0, k)); bhCam.lookAt(0, 0, 0); }
