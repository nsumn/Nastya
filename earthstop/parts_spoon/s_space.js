
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
// ---- the spoon (shape units; 1 unit = 3,469 km gives Earth's volume — tools/spoon_phys.py). Model x along, y across, z up;
// scene = (x, z, y). Bowl: lower half of an ellipsoidal shell (outer A,B,C, wall T), open at z = 0. Handle from x = A - 0.4, length 11.
const KM = 3469.4;
const SA = 4.0, SB = 3.0, SC = 1.6, ST = 0.55, HL = 11.0, HW0 = 1.1, HW1 = 0.7, HT = 0.45, HX0 = SA - 0.4;
const SCOM = new THREE.Vector3(1.47, -0.63, 0);                 // centre of mass (scene coords), Monte-Carlo
const R_SPHERE = 6371 / KM;
const S = (x, y, z) => [x, z, y];                                // model -> scene
const handleZ = u => -0.15 + 0.9 * u * u;
const spoonGeo = (() => {
  const parts = [];
  const grid = (nu, nv, f, flip) => { const pos = [], idx = []; for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) pos.push(...f(i / nu, j / nv));
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g.toNonIndexed(); };
  const shell = (a, b, c) => (u, v) => { const th = u * Math.PI / 2, ph = v * Math.PI * 2; return S(a * Math.sin(th) * Math.cos(ph), b * Math.sin(th) * Math.sin(ph), -c * Math.cos(th)); };
  parts.push(grid(48, 160, shell(SA, SB, SC), false));                    // outer surface (normals out/down)
  parts.push(grid(48, 160, shell(SA - ST, SB - ST, SC - ST), true));       // inner surface (normals into the cavity)
  parts.push(grid(2, 160, (u, v) => { const ph = v * Math.PI * 2; const a = lerp(SA - ST, SA, u), b = lerp(SB - ST, SB, u); return S(a * Math.cos(ph), b * Math.sin(ph), 0); }, false));   // rim
  // handle: a box section swept along the curved centreline, rounded tip
  const NX = 140, NY = 10; const wAt = u => { const w = lerp(HW0, HW1, u) / 2; const tip = u > 0.93 ? Math.sqrt(Math.max(0, 1 - ((u - 0.93) / 0.07) ** 2)) : 1; return w * Math.max(tip, 0.04); };
  const P = (u, s, top) => { const x = HX0 + u * HL; const z = handleZ(u) + (top ? HT / 2 : -HT / 2); return S(x, s * wAt(u), z); };
  parts.push(grid(NX, NY, (u, v) => P(u, lerp(-1, 1, v), true), true));
  parts.push(grid(NX, NY, (u, v) => P(u, lerp(-1, 1, v), false), false));
  parts.push(grid(NX, 4, (u, v) => { const p = P(u, -1, true), q = P(u, -1, false); return [lerp(p[0], q[0], v), lerp(p[1], q[1], v), lerp(p[2], q[2], v)]; }, true));
  parts.push(grid(NX, 4, (u, v) => { const p = P(u, 1, true), q = P(u, 1, false); return [lerp(p[0], q[0], v), lerp(p[1], q[1], v), lerp(p[2], q[2], v)]; }, false));
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
})();
const spoonBase = spoonGeo.attributes.position.array.slice();
const spoonMat = planetMat({ ns: SHAPE_NS, ice: 0, land: 0.0, lights: 0, clouds: 0.8 });
withBase(spoonGeo);
const spoonMesh = new THREE.Mesh(spoonGeo, spoonMat);
const spoonG = new THREE.Group(); spoonG.add(spoonMesh); spoonG.visible = false;
const spoonShell = atmoShell(spoonGeo, 1.02); spoonG.add(spoonShell);
const spoonPivot = new THREE.Group(); spoonPivot.add(spoonG); space.add(spoonPivot);   // rotate about the spoon's middle
spoonG.position.set(-5.3, 0.4, 0);
shapes.Spoon = spoonPivot; spoonPivot.userData = { mat: spoonMat, sh: spoonShell, mesh: spoonMesh };
// the one sea on the bowl floor: an equipotential ~flat, the bowl floor is where the energy is lowest
const SEA_Z = -0.9992;                                              // waterline where the sea is ~3,900 mi across
const SEA_K = Math.sqrt(1 - (SEA_Z / (SC - ST)) ** 2);
const seaDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: '#1a74b8', roughness: 0.12, metalness: 0.1, emissive: '#0b4a7a', emissiveIntensity: 0.5, transparent: true, opacity: 0 }));
seaDisc.rotation.x = -Math.PI / 2; seaDisc.position.y = SEA_Z; seaDisc.scale.set((SA - ST) * SEA_K * 1.02, (SB - ST) * SEA_K * 1.02, 1); seaDisc.renderOrder = 1; spoonG.add(seaDisc);
// air: a glowing dome only over the sea
const airDome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ShaderMaterial({
  transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.0); gl_FragColor=vec4(0.35,0.62,1.0,1.0)*(0.15+1.3*f)*uA; }',
}));
airDome.position.y = SEA_Z; airDome.scale.set((SA - ST) * SEA_K * 1.5, 0.32, (SB - ST) * SEA_K * 1.5); spoonG.add(airDome);
// "melts": the handle bends down toward the bowl, then everything slumps into a sphere around the centre of mass
let lastMorph = '';
function morphSpoon(droop, slump) {
  const key = droop.toFixed(4) + '/' + slump.toFixed(4); if (key === lastMorph) return; lastMorph = key;
  const P = spoonGeo.attributes.position.array, B = spoonBase; const v = new THREE.Vector3();
  for (let i = 0; i < B.length; i += 3) {
    let x = B[i], y = B[i + 1], z = B[i + 2];
    if (droop > 0 && x > HX0) {
      const u = (x - HX0) / HL; const th = -droop * u * u; const px = x - HX0, py = y + 0.15; const c = Math.cos(th), s = Math.sin(th);
      x = HX0 + px * c - py * s; y = -0.15 + py * c + px * s; y -= droop * 0.8 * u;
    }
    if (slump > 0) { v.set(x, y, z).sub(SCOM); const L = v.length(); const w = clamp(slump * 1.6 - (L / 14) * 0.6, 0, 1); const k = ease(w); v.multiplyScalar(lerp(1, R_SPHERE / Math.max(L, 1e-3), k)).add(SCOM); x = v.x; y = v.y; z = v.z; }
    P[i] = x; P[i + 1] = y; P[i + 2] = z;
  }
  spoonGeo.attributes.position.needsUpdate = true; spoonGeo.computeVertexNormals(); spoonGeo.computeBoundingSphere();
}
// the ball it becomes (a clean sphere takes over once the slump is done)
const ballG = shapeMesh(new THREE.IcosahedronGeometry(R_SPHERE, 30), 1.045, 0, { land: 0.34, clouds: 0.0 }); spoonG.add(ballG); ballG.position.copy(SCOM);
// ---- easter egg: the "rocket" from the first video (scene_donut.js) drifts by far behind the spoon, not part of the roulette
const cameoG = (() => {
  const prof = [];
  for (let i = 0; i <= 10; i++) prof.push([2.05 + 0.08 * Math.sin(i / 10 * Math.PI), -4.5 + i * 0.95]);
  for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; prof.push([2.55 * Math.cos(a) * (i === 0 ? 0.86 : 1), 5.4 + 2.5 * Math.sin(a)]); }
  prof.splice(11, 0, [2.4, 5.0], [2.62, 5.35]);
  prof.unshift([0.001, -4.6]);
  const shaft = lathe(prof, 72); shaft.deleteAttribute('uv');
  const b1 = new THREE.SphereGeometry(2.55, 48, 32); b1.translate(-1.95, -5.4, 0.3); b1.deleteAttribute('uv');
  const b2 = new THREE.SphereGeometry(2.55, 48, 32); b2.translate(1.95, -5.4, -0.3); b2.deleteAttribute('uv');
  const g = mergeGeometries([shaft.toNonIndexed(), b1.toNonIndexed(), b2.toNonIndexed()]); g.computeVertexNormals();
  return shapeMesh(g, 1.04, 0);
})();
const cameoPos = t => { const u = (t - CAMEO0) / (CAMEO1 - CAMEO0); return new THREE.Vector3(lerp(-46, 46, u), lerp(12, 19.5, u), -120); };
function updateCameo(t) {
  cameoG.visible = t > CAMEO0 && t < CAMEO1; if (!cameoG.visible) return;
  const p = cameoPos(t), q = cameoPos(t + 0.05); cameoG.position.copy(p); cameoG.scale.setScalar(0.8);
  cameoG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize()); cameoG.rotateY(t * 1.6);
  const mat = cameoG.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; cameoG.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE);
}
