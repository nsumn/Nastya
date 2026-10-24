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
// her lattice comes down 8.0-11.2 and settles with a little bounce: the clouds never merge
const latDrop = t => { const k = ease(clamp((t - ATOM + 0.6) / 3.6, 0, 1)); return 2.6 * (1 - k) + 0.12 * Math.sin(clamp(t - ATOM - 2.9, 0, 3) * 5) * Math.exp(-Math.max(0, t - ATOM - 2.9) * 1.6); };
const pushAt = t => smooth(ATOM + 1.9, ATOM + 3.0, t);
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
const atDist = t => Math.exp(lerp(Math.log(150), Math.log(14), smooth(LENS + 0.3, ATOM, t)) + lerp(0, Math.log(4.2 / 14), smooth(ATOM, ATOM + 3.4, t)));
function atomCamera(t) { const d = atDist(t), a = 0.5 + 0.12 * Math.sin(t * 0.3); atCam.position.set(Math.sin(a) * d, d * 0.12 + 0.2, Math.cos(a) * d); atCam.lookAt(0, 0.25, 0); }
// =================== FUSION: two deuterium nuclei (a proton + a neutron each) pushed together; they bounce off once, then fuse into a tiny sun ===================
const fuseS = new THREE.Scene(); fuseS.background = new THREE.Color('#0a0410'); const fuCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 100);
fuseS.add(new THREE.AmbientLight(0x6a5a80, 0.7)); { const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(2, 3, 4); fuseS.add(k); }
const sunL = new THREE.PointLight(0xffb050, 0, 12, 1.2); fuseS.add(sunL);
function nucleus() { const g = new THREE.Group(); const p = mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshStandardMaterial({ color: '#ff5a4a', roughness: 0.35, emissive: '#3a0a06' })); p.position.x = -0.17; g.add(p);
  const n = mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshStandardMaterial({ color: '#9ab0d8', roughness: 0.35 })); n.position.set(0.17, 0.05, 0.08); g.add(n); fuseS.add(g); return g; }
const nucA = nucleus(), nucB = nucleus();
const tinySun = mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.3, 0.45) })); fuseS.add(tinySun);
const plasma = makeSmoke(fuseS, 260);
const pushRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.8, 3.0), transparent: true })); fuseS.add(pushRing);
const FT = FUSE + 3.9;   // the moment of fusion
function updateFuse(t) { const u = t - FUSE;
  // approach, bounce (repulsion), approach again harder, fuse
  let sep = u < 1.6 ? lerp(2.4, 0.9, ease(u / 1.6)) : u < 2.4 ? lerp(0.9, 1.6, ease((u - 1.6) / 0.8)) : lerp(1.6, 0.0, ease(clamp((u - 2.4) / 1.5, 0, 1)));
  const shake = u > 2.4 && u < 3.9 ? 0.03 * Math.sin(t * 60) * smooth(FUSE + 2.6, FT, t) : 0;
  nucA.position.set(-sep / 2 + shake, 0, 0); nucB.position.set(sep / 2 - shake, 0, 0); nucA.rotation.set(t * 0.8, t * 0.5, 0); nucB.rotation.set(-t * 0.7, t * 0.4, 1);
  const f = smooth(FT - 0.05, FT + 0.6, t); nucA.visible = nucB.visible = f < 0.5; tinySun.scale.setScalar(Math.max(0.0001, f * (0.42 + 0.03 * Math.sin(t * 9)))); sunL.intensity = 30 * f;
  pushRing.scale.setScalar(lerp(1.6, 0.5, smooth(FUSE + 2.4, FT, t))); pushRing.material.opacity = fadeWin(t, FUSE + 2.3, FT + 0.1, 0.3); pushRing.rotation.x = Math.PI / 2 + 0.3;
  plasma.begin(); smokeMat.uniforms.uTint.value.set('#ffa040'); if (f > 0) for (let k = 0; k < 120; k++) { const a = k * 2.399, rr = 0.8 + ((t * 0.6 + k * 0.013) % 1) * 1.8 * f; plasma.add(V3(Math.cos(a) * rr, Math.sin(a * 1.3) * rr * 0.8, Math.sin(a) * rr * 0.6), 0.45, 0.25 * f * (1 - ((t * 0.6 + k * 0.013) % 1))); } plasma.end(); }
function fuseCamera(t) { const k = smooth(FUSE - 0.5, ENDS + 0.5, t); fuCam.position.set(lerp(0.6, -0.4, k), lerp(0.3, 0.5, k), lerp(4.6, 3.6, k) + 1.2 * smooth(FT, FT + 1.2, t)); fuCam.lookAt(0, 0, 0); }
