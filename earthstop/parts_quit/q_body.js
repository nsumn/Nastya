// =================== X-RAY BODY (meters): glassy body, beating heart, lungs, vessels with blood cells; carbon monoxide leaves, lungs clear ===================
const xr = new THREE.Scene(); xr.background = new THREE.Color('#06101e'); const xCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
xr.add(new THREE.AmbientLight(0x6a8ab0, 0.8)); const xKey = new THREE.DirectionalLight(0xffffff, 1.6); xKey.position.set(1, 2, 3); xr.add(xKey);
{ const grid = new THREE.GridHelper(8, 32, 0x1e4a7a, 0x12304e); grid.rotation.x = Math.PI / 2; grid.position.z = -1.2; xr.add(grid); }
const ghost = makePerson(rnd, { top: '#ffffff', bottom: '#ffffff', skin: '#ffffff', hair: '#ffffff', dress: false, shorts: false, cap: false }); xr.add(ghost.outer); ghost.outer.position.set(0, 0.95, 0); poseIdle(ghost, 0, 0);
const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.6, 1.1), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
ghost.outer.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
const organs = new THREE.Group(); xr.add(organs);
const heart = mesh(new THREE.IcosahedronGeometry(0.055, 1), M('#d8283a', { flatShading: true, emissive: '#6a0a12', roughness: 0.4 })); heart.position.set(0.03, 1.31, 0.05); heart.scale.set(1, 1.15, 0.9); organs.add(heart);
const lungMat = new THREE.MeshStandardMaterial({ color: '#6a6a6e', flatShading: true, roughness: 0.6, emissive: '#1a1a1e' });
const lungs = []; for (const sx of [-1, 1]) { const l = mesh(new THREE.IcosahedronGeometry(1, 2), lungMat); l.scale.set(0.068, 0.13, 0.06); l.position.set(sx * 0.085, 1.34, 0.0); organs.add(l); lungs.push(l); }
const trachea = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), M('#c8b8b0')); trachea.position.set(0, 1.5, 0); organs.add(trachea);
// vessels from the heart to head, arms, legs; blood cells ride along them
const VES = [[[0.03, 1.31, 0.05], [0.0, 1.5, 0.03], [0.0, 1.62, 0.02]], [[0.03, 1.31, 0.05], [0.15, 1.38, 0.02], [0.22, 1.2, 0.0], [0.26, 0.95, 0.02]], [[0.03, 1.31, 0.05], [-0.15, 1.38, 0.02], [-0.22, 1.2, 0.0], [-0.26, 0.95, 0.02]],
  [[0.03, 1.31, 0.05], [0.04, 1.05, 0.04], [0.09, 0.85, 0.02], [0.1, 0.4, 0.03], [0.1, 0.08, 0.05]], [[0.03, 1.31, 0.05], [0.0, 1.05, 0.04], [-0.09, 0.85, 0.02], [-0.1, 0.4, 0.03], [-0.1, 0.08, 0.05]]].map(pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p))));
const vesMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.08, 0.1), transparent: true, opacity: 0.55 }); for (const c of VES) organs.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.006, 5, false), vesMat));
const CELL_N = 360; const cellMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.15, 0.15) }), CELL_N); cellMesh.frustumCulled = false; organs.add(cellMesh);
const coMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 5, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.35, 0.38) }), CELL_N); coMesh.frustumCulled = false; organs.add(coMesh);
const o2Mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.005, 5, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.4, 2.4) }), CELL_N); o2Mesh.frustumCulled = false; organs.add(o2Mesh);
const CELLS = Array.from({ length: CELL_N }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.006), co: rnd() }));
const tar = makeSmoke(xr, 400); const _xo = new THREE.Object3D(), _xv = new THREE.Vector3();
const bpmAt = t => t < XRAY + 1.5 ? 88 : Math.round(lerp(88, 74, smooth(XRAY + 1.5, XRAY + 3.0, t)));
function updateBody(t) { const bpm = bpmAt(t), ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(0, ph - 0.18) * 9) * (ph > 0.18);
  heart.scale.set(1 + 0.18 * beat, 1.15 + 0.2 * beat, 0.9 + 0.15 * beat);
  const co = 1 - smooth(XRAY + 2.8, XRAY + 4.4, t);   // CO leaves within ~12 h
  CELLS.forEach((C, i) => { const u = (C.u0 + t * C.sp) % 1; VES[C.v].getPointAt(u, _xv).add(C.off); _xo.position.copy(_xv); _xo.scale.setScalar(1); _xo.updateMatrix(); cellMesh.setMatrixAt(i, _xo.matrix);
    _xo.position.add(V3(0.007, 0.004, 0.004)); _xo.scale.setScalar(C.co < co ? 1 : 0.0001); _xo.updateMatrix(); coMesh.setMatrixAt(i, _xo.matrix);
    _xo.position.add(V3(-0.012, 0, 0)); _xo.scale.setScalar(C.co < 1 - co ? 1 : 0.0001); _xo.updateMatrix(); o2Mesh.setMatrixAt(i, _xo.matrix); });
  cellMesh.instanceMatrix.needsUpdate = true; coMesh.instanceMatrix.needsUpdate = true; o2Mesh.instanceMatrix.needsUpdate = true;
  // lungs: grey -> pink while the gunk is swept out (only in the LUNGS beat)
  const clean = smooth(LUNGS + 0.4, LUNGS + 3.0, t); lungMat.color.set('#6a6a6e').lerp(new THREE.Color('#e88a96'), clean); lungMat.emissive.set('#1a1a1e').lerp(new THREE.Color('#4a1018'), clean);
  const breath = 1 + 0.06 * Math.sin(t * 2.4); lungs.forEach(l => l.scale.set(0.068 * breath, 0.13 * breath, 0.06 * breath));
  tar.begin(); smokeMat.uniforms.uTint.value.set('#4a4a50'); if (t > LUNGS) for (let k = 0; k < 80; k++) { const age = (t * 0.35 + k / 80) % 1; const sx = k % 2 ? 1 : -1; _xv.set(sx * (0.06 + 0.04 * Math.sin(k * 3.3)) * (1 - age * 0.8), 1.28 + age * 0.34, 0.02 + 0.02 * Math.cos(k)); tar.add(_xv, 0.012 + 0.01 * (1 - age), 0.8 * (1 - clean * 0.85) * (1 - age)); } tar.end(); }
function bodyCamera(t) { let pos, look, fov = 40;
  if (t < NIGHT) { const k = ease(clamp((t - XRAY - 1.8) / 2.6, 0, 1)); pos = V3(0.9, 1.25, 3.4).lerp(V3(0.22, 1.35, 0.55), k); look = V3(0, 1.0, 0).lerp(V3(0.02, 1.3, 0.03), k); fov = lerp(40, 34, k); }
  else { const k = ease(clamp((t - LUNGS) / 3.2, 0, 1)); pos = V3(-0.25, 1.42, 0.5).lerp(V3(0.15, 1.36, 0.42), k); look = V3(0, 1.34, 0); fov = 32; }
  xCam.position.copy(pos); xCam.lookAt(look); xCam.fov = fov; }
