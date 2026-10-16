// =================== THE ROADSTER (2026 reveal look): low faceted wedge, "Ano White", bronze visor glass, light bar nose,
// full-width red tail bar, round thruster nozzles in a black tail, bronze wing, 5-spoke dark wheels. Local: +x forward, y up, z left.
const CAR_WHITE = '#e8e9ec', CAR_GLASS = '#3d2c22', CAR_BLACK = '#18191c';
const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.15, flatShading: true, side: THREE.DoubleSide });
// sections: x, yBottom, ySill, yBelt, yTop, wBottom, wBelt, wTop, glassSide, glassTop (flags for the segment to the next section)
const SECT = [
  [2.22, 0.24, 0.30, 0.40, 0.46, 0.70, 0.78, 0.58, 0, 0],
  [1.75, 0.20, 0.30, 0.58, 0.64, 0.92, 0.99, 0.74, 0, 0],
  [1.30, 0.19, 0.30, 0.66, 0.72, 0.95, 1.00, 0.70, 0, 0],
  [0.85, 0.19, 0.30, 0.70, 0.78, 0.95, 0.99, 0.64, 1, 1],
  [0.05, 0.19, 0.30, 0.72, 1.10, 0.94, 0.97, 0.56, 1, 1],
  [-0.55, 0.19, 0.30, 0.74, 1.13, 0.95, 0.98, 0.55, 1, 0],
  [-1.25, 0.19, 0.30, 0.79, 1.04, 1.00, 1.02, 0.62, 0, 0],
  [-1.85, 0.22, 0.32, 0.84, 0.97, 0.98, 1.00, 0.72, 0, 0],
  [-2.22, 0.30, 0.38, 0.86, 0.93, 0.92, 0.94, 0.76, 0, 0],
];
function roadsterBodyGeo() {
  const pos = [], col = []; const cW = new THREE.Color(CAR_WHITE), cG = new THREE.Color(CAR_GLASS), cB = new THREE.Color(CAR_BLACK);
  const ring = s => { const [x, yb, ys, yl, yt, wb, wl, wt] = s; return [[x, yb, wb * 0.9], [x, ys, wb], [x, yl, wl], [x, yt, wt], [x, yt, -wt], [x, yl, -wl], [x, ys, -wb], [x, yb, -wb * 0.9]]; };
  const tri = (a, b, c, color) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b); };
  for (let i = 0; i < SECT.length - 1; i++) {
    const A = ring(SECT[i]), B = ring(SECT[i + 1]); const gs = SECT[i][8], gt = SECT[i][9];
    for (let e = 0; e < 8; e++) { const e2 = (e + 1) % 8; let c = cW;
      if (e === 0 || e === 6 || e === 7) c = cB; else if ((e === 2 || e === 4) && gs) c = cG; else if (e === 3 && gt) c = cG;
      // flip winding so faces point outward (sections run from +x to -x)
      tri(A[e], B[e], B[e2], c); tri(A[e], B[e2], A[e2], c); }
  }
  // caps: nose (white), tail (black)
  const capF = ring(SECT[0]), capR = ring(SECT[SECT.length - 1]);
  for (let e = 1; e < 7; e++) { tri(capF[0], capF[e + 1], capF[e], cW); tri(capR[0], capR[e], capR[e + 1], cB); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const BODY_GEO = roadsterBodyGeo();
const lightW = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 2.2 });
const lightR = new THREE.MeshStandardMaterial({ color: '#601010', emissive: '#ff0a08', emissiveIntensity: 1.6 });
const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.27, 16); tireGeo.rotateX(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.29, 10); rimGeo.rotateX(Math.PI / 2);
const nozGeo = new THREE.CylinderGeometry(0.07, 0.085, 0.1, 12); nozGeo.rotateZ(Math.PI / 2);
const nozDown = new THREE.CylinderGeometry(0.05, 0.065, 0.06, 10);
function makeRoadster(opts = {}) {
  const g = new THREE.Group(); const body = new THREE.Mesh(BODY_GEO, carMat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  // nose light bar + fender light slits
  bx(0.03, 0.025, 1.18, lightW, 2.215, 0.43, 0, g); for (const s of [-1, 1]) { const l = bx(0.12, 0.02, 0.03, lightW, 1.85, 0.6, s * 0.86, g); l.rotation.y = s * 0.5; }
  bx(0.06, 0.08, 1.1, CAR_BLACK, 2.2, 0.3, 0, g);              // front intake
  // tail: red full-width bar, thruster nozzles (brass rims), black fans
  bx(0.03, 0.035, 1.78, lightR, -2.225, 0.84, 0, g);
  const brass = M('#d0a868', { metalness: 0.6, roughness: 0.3 }), noz = M('#2a2b2f', { metalness: 0.6, roughness: 0.4 });
  for (const z of [-0.45, -0.15, 0.15, 0.45]) { const n = mesh(nozGeo, brass); n.position.set(-2.24, 0.66, z); g.add(n); const f = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10).rotateZ(Math.PI / 2), noz); f.position.set(-2.235, 0.45, z); g.add(f); }
  bx(0.02, 0.1, 0.32, '#cfd0d2', -2.235, 0.6, 0, g).visible = false;
  // bronze wing (Thrust / Rocket)
  if (opts.wing !== false) { const wm = M('#8c6a48', { metalness: 0.7, roughness: 0.35, flatShading: true }); const w = bx(0.42, 0.035, 1.95, wm, -2.0, 1.2, 0, g); w.rotation.z = -0.08; for (const z of [-0.45, 0.45]) bx(0.12, 0.26, 0.03, CAR_BLACK, -1.95, 1.06, z, g); }
  // downward thrusters around the floor (the hopping version)
  for (const [x, z] of [[1.7, 0.6], [1.7, -0.6], [-1.75, 0.65], [-1.75, -0.65]]) { const n = mesh(nozDown, brass); n.position.set(x, 0.17, z); g.add(n); }
  // wheels: black tire + dark 5-spoke rim
  const wheels = [];
  for (const [x, z] of [[1.38, 0.86], [1.38, -0.86], [-1.42, 0.88], [-1.42, -0.88]]) {
    const wg = new THREE.Group(); wg.position.set(x, 0.36, z); g.add(wg); const spin = new THREE.Group(); wg.add(spin);
    spin.add(mesh(tireGeo, M('#121214', { roughness: 0.9 }))); spin.add(mesh(rimGeo, M('#2c2e33', { metalness: 0.6, roughness: 0.4 })));
    for (let k = 0; k < 5; k++) { const sp = mesh(BOX, M('#55585e', { metalness: 0.7, roughness: 0.35, flatShading: true })); sp.scale.set(0.05, 0.22, 0.02); sp.position.set(0, 0, Math.sign(z) * 0.15); const a = new THREE.Group(); a.rotation.z = k * Math.PI * 2 / 5; a.add(sp); sp.position.y = 0.11; sp.rotation.z = 0.25; spin.add(a); }
    wheels.push(spin);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return { g, wheels };
}
