
// =================== SPACE scene ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#010207');
const spaceCam = new THREE.PerspectiveCamera(36, W / H, 0.01, 4000);
{
  const n = 6000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); const b = R(0.35, 1); col.set([b * 0.9, b * 0.9, b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 })));
}
const SUN_SPACE = new THREE.Vector3(-0.55, 0.45, 0.70).normalize();
space.add(new THREE.AmbientLight(0x334055, 0.6));
const spaceDir = new THREE.DirectionalLight(0xfff2e0, 2.6); spaceDir.position.copy(SUN_SPACE).multiplyScalar(50); space.add(spaceDir);

// ---- roulette shapes
const SHAPE_NS = 0.16;
function shapeMesh(geo, shellScale = 1.045, ice = 0, extra = {}) {
  withBase(geo); const mat = planetMat({ ns: SHAPE_NS, ice, ...extra }); const m = new THREE.Mesh(geo, mat);
  const g = new THREE.Group(); g.add(m); const sh = atmoShell(geo, shellScale); g.add(sh); g.userData = { mat, sh, mesh: m }; g.visible = false; space.add(g); return g;
}
function lathe(pts, seg = 96) { return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); }
const shapes = {};
shapes.Sphere = shapeMesh(new THREE.IcosahedronGeometry(7.2, 40), 1.045, 1);
shapes.Cube = shapeMesh(new THREE.BoxGeometry(11, 11, 11, 40, 40, 40), 1.035);
shapes.Pyramid = shapeMesh((() => { const g = new THREE.ConeGeometry(8.5, 11.5, 4, 1); g.translate(0, -1.2, 0); const n = g.toNonIndexed(); n.computeVertexNormals(); return n; })(), 1.04);
{
  const s = new THREE.Shape(); s.moveTo(0, -6.5); s.bezierCurveTo(-1.5, -4.6, -8.6, -1.2, -7.8, 3.0); s.bezierCurveTo(-7.2, 6.4, -2.2, 7.4, 0, 3.6); s.bezierCurveTo(2.2, 7.4, 7.2, 6.4, 7.8, 3.0); s.bezierCurveTo(8.6, -1.2, 1.5, -4.6, 0, -6.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 1.1, bevelSegments: 6, curveSegments: 24 }); g.translate(0, -0.3, -1.3); g.deleteAttribute('uv');
  shapes.Heart = shapeMesh(g.toNonIndexed(), 1.04);
}
shapes.Donut = shapeMesh(new THREE.TorusGeometry(5.2, 2.6, 48, 128), 1.05);
{
  const s = new THREE.Shape(); s.moveTo(0, -7); s.lineTo(-5.4, 5.2); s.quadraticCurveTo(0, 7.4, 5.4, 5.2); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3, curveSegments: 20 }); g.translate(0, 0, -0.6); g.deleteAttribute('uv');
  shapes.Pizza = shapeMesh(g.toNonIndexed(), 1.04);
}
{
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 3.6 : 8.6; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.7, bevelSegments: 4, curveSegments: 4 }); g.translate(0, 0, -1.2); g.deleteAttribute('uv');
  shapes.Star = shapeMesh(g.toNonIndexed(), 1.04);
}
shapes.Diamond = shapeMesh(lathe([[0.001, 5.0], [3.4, 4.2], [6.0, 2.4], [0.001, -6.5]], 10).toNonIndexed(), 1.04);
{ // the tsunami (fake-out): the wave profile extruded, short
  const PROF = [[-8500, 0], [-6500, 1200], [-4200, 3300], [-2000, 5600], [0, 7400], [1800, 8400], [3800, 8300], [5600, 7300], [6900, 5700], [7400, 4200],
    [6800, 4300], [5900, 5400], [4400, 6100], [2900, 5900], [1800, 5000], [1100, 3600], [900, 2200], [1300, 1100], [2400, 400], [4200, 120], [6500, 30], [9500, 0],
    [9300, -900], [5000, -1500], [0, -1700], [-5000, -1500], [-8000, -800]];
  const s = new THREE.Shape(); const c = new THREE.CatmullRomCurve3(PROF.map(([x, y]) => new THREE.Vector3(x / 1000, y / 1000 - 3.3, 0)), true, 'centripetal');
  c.getSpacedPoints(200).forEach((p, i) => i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y));
  const g = new THREE.ExtrudeGeometry(s, { depth: 9, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 0.6, bevelSegments: 4, curveSegments: 4 }); g.translate(-0.5, 0, -4.5); g.deleteAttribute('uv');
  shapes.Tsunami = shapeMesh(g.toNonIndexed(), 1.03, 0, { land: -0.3, snow: 3.6 });
}
// ---- the "rocket": shaft + rounded tip + two lobes (shape units; 1 unit = 1,541 km gives Earth's volume)
const KM = 1541.4;
const RCOM = new THREE.Vector3(0, -1908 / KM, 0);               // centre of mass (Monte-Carlo)
const R_SPHERE = 6371 / KM;
const rocketGeo = (() => {
  const prof = [];
  for (let i = 0; i <= 20; i++) prof.push([2.05 + 0.08 * Math.sin(i / 20 * Math.PI), -4.5 + i * 0.475]);
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; prof.push([2.55 * Math.cos(a) * (i === 0 ? 0.86 : 1), 5.4 + 2.5 * Math.sin(a)]); }
  prof.splice(21, 0, [2.4, 5.0], [2.62, 5.35]);
  prof.unshift([0.001, -4.6]);
  const shaft = lathe(prof, 96); shaft.deleteAttribute('uv');
  const b1 = new THREE.SphereGeometry(2.55, 64, 40); b1.translate(-1.95, -5.4, 0.3); b1.deleteAttribute('uv');
  const b2 = new THREE.SphereGeometry(2.55, 64, 40); b2.translate(1.95, -5.4, -0.3); b2.deleteAttribute('uv');
  const g = mergeGeometries([shaft.toNonIndexed(), b1.toNonIndexed(), b2.toNonIndexed()]); g.computeVertexNormals();
  return g;
})();
const rocketBase = rocketGeo.attributes.position.array.slice();
const rocketMat = planetMat({ ns: SHAPE_NS, ice: 0, land: 0.0, lights: 0, clouds: 0.8 });
withBase(rocketGeo);
const rocketMesh = new THREE.Mesh(rocketGeo, rocketMat);
const rocketG = new THREE.Group(); rocketG.add(rocketMesh); space.add(rocketG); rocketG.visible = false;
const rocketShell = atmoShell(rocketGeo, 1.035); rocketG.add(rocketShell);
shapes.Rocket = rocketG; rocketG.userData = { mat: rocketMat, sh: rocketShell, mesh: rocketMesh };
// sea ring around the base of the shaft (where the gravitational energy is lowest)
const shaftR = y => 2.05 + 0.08 * Math.sin(clamp((y + 4.5) / 9.5, 0, 1) * Math.PI);
const seaRing = new THREE.Mesh(lathe((() => { const p = []; for (let i = 0; i <= 12; i++) { const y = -5.0 + i * (2.3 / 12); p.push([shaftR(y) + 0.006, y]); } p.push([shaftR(-2.62) - 0.01, -2.62]); return p; })(), 96), new THREE.MeshStandardMaterial({ color: '#1a74b8', roughness: 0.12, metalness: 0.1, emissive: '#0b4a7a', emissiveIntensity: 0.5, transparent: true, opacity: 0 }));
rocketG.add(seaRing);
// air band: atmosphere only around the base
const airBand = new THREE.Mesh(lathe([[2.0, -5.2], [2.45, -4.6], [2.5, -3.2], [2.38, -2.0], [2.06, -1.2]], 96), new THREE.ShaderMaterial({
  transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.0); gl_FragColor=vec4(0.35,0.62,1.0,1.0)*(0.18+1.4*f)*uA; }',
}));
rocketG.add(airBand);
// "goes soft": droop the shaft, then slump everything into a sphere around the centre of mass
let lastMorph = '';
function morphRocket(droop, slump) {
  const key = droop.toFixed(4) + '/' + slump.toFixed(4); if (key === lastMorph) return; lastMorph = key;
  const P = rocketGeo.attributes.position.array, B = rocketBase; const v = new THREE.Vector3();
  for (let i = 0; i < B.length; i += 3) {
    let x = B[i], y = B[i + 1], z = B[i + 2];
    if (droop > 0 && y > -2.4) {                 // bend about z: angle grows along the shaft
      const u = (y + 2.4) / 10.3; const th = -droop * u * u * 1.0;
      const px = x, py = y + 2.4; const c = Math.cos(th), s = Math.sin(th);
      x = px * c - py * s; y = py * c + px * s - 2.4; y -= droop * 0.6 * u;
    }
    if (slump > 0) {
      v.set(x, y, z).sub(RCOM); const L = v.length(); const w = clamp(slump * 1.6 - (L / 12) * 0.6, 0, 1); const k = ease(w);
      v.multiplyScalar(lerp(1, R_SPHERE / Math.max(L, 1e-3), k)).add(RCOM); x = v.x; y = v.y; z = v.z;
    }
    P[i] = x; P[i + 1] = y; P[i + 2] = z;
  }
  rocketGeo.attributes.position.needsUpdate = true; rocketGeo.computeVertexNormals(); rocketGeo.computeBoundingSphere();
}
