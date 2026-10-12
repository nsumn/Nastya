
// =================== MICRO layers: skin ridges (mm) · skin cells (µm) · atoms (Å) ===================
// the contact gap is horizontal (top = A's fingertip, bottom = B's), the camera looks along -z into it
const FOV_MICRO = 34;
function camForField(camera, fieldW, target, back = new THREE.Vector3(0, 0, 1), up = new THREE.Vector3(0, 1, 0)) {
  const hgt = fieldW * H / W; const d = hgt / 2 / Math.tan(camera.fov * Math.PI / 360);
  camera.position.copy(target).addScaledVector(back.clone().normalize(), d); camera.up.copy(up); camera.lookAt(target);
  camera.near = d * 0.02; camera.far = d * 60 + 50; camera.updateProjectionMatrix();
}
// ---- skin (units: mm)
const skin = new THREE.Scene(); skin.background = new THREE.Color('#1a0d0a');
const skinCam = new THREE.PerspectiveCamera(FOV_MICRO, W / H, 0.01, 1000);
skin.add(new THREE.HemisphereLight(0xffe6d6, 0x3a1a14, 0.9));
const skinKey = new THREE.DirectionalLight(0xfff2e6, 2.2); skinKey.position.set(3, 1.2, 6); skin.add(skinKey);
const skinBack = new THREE.PointLight(0xffd6b0, 30, 0, 1.4); skinBack.position.set(0, 0, -3); skin.add(skinBack);
function ridgeDome(r, colA, colB, flip, cx, cz) {
  const geo = new THREE.SphereGeometry(r, 420, 150, 0, Math.PI * 2, 0, Math.PI / 3);
  const p = geo.attributes.position, n = geo.attributes.normal; const cols = new Float32Array(p.count * 3);
  const ca = new THREE.Color(colA), cb = new THREE.Color(colB), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // whorl: distance to an off-centre core, warped
    const dx = x - cx, dz = z - cz; const ang = Math.atan2(dz, dx);
    const d = Math.sqrt(dx * dx * 1.0 + dz * dz * 1.35) + 0.12 * Math.sin(ang * 3 + x * 0.8) + 0.05 * Math.sin(z * 4.1 + x * 2.3);
    const ph = d / 0.46 * Math.PI * 2; const ridge = 0.5 + 0.5 * Math.cos(ph);
    const pore = Math.pow(Math.max(0, Math.cos(ph)), 6) * Math.pow(0.5 + 0.5 * Math.sin(ang * d * 13.0), 30);
    const h = 0.055 * Math.pow(ridge, 0.7) - 0.03 * pore;
    p.setXYZ(i, x + n.getX(i) * h, y + n.getY(i) * h, z + n.getZ(i) * h);
    c.copy(cb).lerp(ca, Math.pow(ridge, 0.8)); c.multiplyScalar(1 - 0.5 * pore);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, flatShading: false }));
  if (flip) m.rotation.z = Math.PI;
  return m;
}
const SKIN_R = 7.5, SKIN_GAP = 0.012;
const domeTop = ridgeDome(SKIN_R, '#f0c9ae', '#b9806a', true, 0.9, -0.6); domeTop.position.y = SKIN_R + SKIN_GAP / 2 + 0.055; skin.add(domeTop);
const domeBot = ridgeDome(SKIN_R, '#c98c6a', '#7d4a34', false, -0.7, 0.4); domeBot.position.y = -(SKIN_R + SKIN_GAP / 2 + 0.055); skin.add(domeBot);

// ---- cells (units: µm) — flattened corneocytes stacked in layers
const cells = new THREE.Scene(); cells.background = new THREE.Color('#1d0f0c');
const cellCam = new THREE.PerspectiveCamera(FOV_MICRO, W / H, 0.01, 4000);
cells.add(new THREE.HemisphereLight(0xffeedd, 0x402018, 1.0));
const cellKey = new THREE.DirectionalLight(0xfff0e0, 1.8); cellKey.position.set(2, 3, 5); cells.add(cellKey);
const cellBack = new THREE.PointLight(0xffc89a, 400, 0, 1.2); cellBack.position.set(0, 0, -60); cells.add(cellBack);
{
  const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1); const N = 2 * 7 * 15 * 15;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, flatShading: true });
  const im = new THREE.InstancedMesh(g, mat, N); const d = new THREE.Object3D(); const c = new THREE.Color(); let k = 0;
  for (const s of [1, -1]) for (let L = 0; L < 7; L++) for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) {
    const x = (i - 7 + (j % 2) * 0.5) * 30 + R(-3, 3) + L * 9, z = (j - 7) * 26 + R(-3, 3) - L * 7;
    const sag = 0.0012 * (x * x + z * z);                       // the surfaces curve away from the contact point
    const y = s * (1.6 + L * 1.25 + sag + R(0, 0.35));
    d.position.set(x, y, z); d.rotation.set(R(-0.05, 0.05), R(0, 1), R(-0.05, 0.05) + s * x * 0.0025); d.scale.set(R(15.5, 18), R(0.55, 0.8), R(15.5, 18)); d.updateMatrix(); im.setMatrixAt(k, d.matrix);
    if (s > 0) c.setHSL(0.06 + R(-0.01, 0.01), 0.45, 0.72 - L * 0.04 + R(-0.04, 0.04)); else c.setHSL(0.045 + R(-0.01, 0.01), 0.5, 0.55 - L * 0.04 + R(-0.04, 0.04));
    im.setColorAt(k, c); k++;
  }
  cells.add(im);
}

// ---- atoms (units: Å). Electron clouds = soft additive spheres; nuclei = tiny bright points (not to scale)
const atoms = new THREE.Scene(); atoms.background = new THREE.Color('#05070f');
const atomCam = new THREE.PerspectiveCamera(FOV_MICRO, W / H, 0.05, 2000);
const insetCam = new THREE.PerspectiveCamera(30, 1, 0.05, 2000);
const CLOUD_VS = `
  attribute vec3 aCol; attribute float aSide;
  uniform float uPlaneT, uPlaneB, uSquash, uTime, uShiftT, uShiftB;
  varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vSide; varying vec3 vW;
  void main(){
    vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0);
    w.y+=aSide>0.5?uShiftT:uShiftB;
    // clouds are squashed against the interface instead of overlapping (the repulsion)
    if(aSide>0.5 && w.y<uPlaneT) w.y=uPlaneT-(uPlaneT-w.y)*uSquash;
    if(aSide<0.5 && w.y>uPlaneB) w.y=uPlaneB+(w.y-uPlaneB)*uSquash;
    vW=w.xyz; vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); vV=normalize(cameraPosition-w.xyz); vCol=aCol; vSide=aSide;
    gl_Position=projectionMatrix*viewMatrix*w;
  }`;
const CLOUD_FS = `
  uniform float uTime, uGlow, uMid, uBright, uFogNear, uFogFar;
  varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vSide; varying vec3 vW;
  void main(){
    float nv=abs(dot(normalize(vN),normalize(vV)));
    float dens=0.05*pow(nv,1.2)+0.34*pow(nv,10.0);
    float shim=0.85+0.15*sin(vW.x*5.0+uTime*3.1)*sin(vW.y*6.0-uTime*2.3)*sin(vW.z*4.0+uTime*1.7);
    vec3 c=vCol*dens*shim*uBright;
    float g=exp(-abs(vW.y-uMid)*2.2)*uGlow; c+=vec3(1.0,0.45,0.25)*g*dens*2.0;
    float fog=1.0-smoothstep(uFogNear,uFogFar,distance(vW,cameraPosition)); c*=fog;
    gl_FragColor=vec4(c,1.0);
  }`;
const cloudUni = { uShiftT: { value: 0 }, uShiftB: { value: 0 }, uPlaneT: { value: 0.3 }, uPlaneB: { value: -0.3 }, uSquash: { value: 1 }, uTime: { value: 0 }, uGlow: { value: 0 }, uMid: { value: 0 }, uBright: { value: 1 }, uFogNear: { value: 20 }, uFogFar: { value: 70 } };
const cloudMat = new THREE.ShaderMaterial({ uniforms: cloudUni, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const atomList = []; let nucTop, nucBot;
{
  // two amorphous slabs (protein-like: C, N, O, H). Jittered packing, ~1.5 Å bonds
  const EL = { C: { r: 0.95, c: [0.5, 0.75, 1.0] }, N: { r: 0.9, c: [0.45, 0.6, 1.0] }, O: { r: 0.85, c: [0.7, 0.55, 1.0] }, H: { r: 0.62, c: [0.85, 0.95, 1.0] } };
  const SP = 1.75;
  for (const s of [1, -1]) {
    for (let iy = 0; iy < 4; iy++) for (let ix = -20; ix <= 20; ix++) for (let iz = -6; iz <= 2; iz++) {
      const surf = iy === 0;
      const el = surf ? (rnd() < 0.7 ? 'H' : 'O') : pick(['C', 'C', 'C', 'N', 'O', 'H', 'H']);
      const x = ix * SP + (iy % 2) * SP * 0.5 + R(-0.35, 0.35), z = iz * SP * 1.05 + R(-0.35, 0.35);
      const y = s * (1.55 + iy * SP * 0.92 + R(-0.15, 0.15) + (surf ? 0.08 * Math.sin(ix * 1.3) : 0));
      atomList.push({ x, y, z, s, el, r: EL[el].r * R(0.95, 1.08) });
    }
  }
  // hero pair (fusion close-up) at x=0,z=0 on the interface
  for (const a of atomList) if (Math.abs(a.x) < 1.0 && Math.abs(a.z) < 1.0 && Math.abs(a.y) < 2.2) { a.hide = true; }
  const N = atomList.length; const geo = new THREE.SphereGeometry(1, 18, 12);
  const im = new THREE.InstancedMesh(geo, cloudMat, N); im.frustumCulled = false;
  const aCol = new Float32Array(N * 3), aSide = new Float32Array(N); const d = new THREE.Object3D();
  const tintA = new THREE.Color('#58a8ff'), tintB = new THREE.Color('#ff9a4a');
  atomList.forEach((a, i) => {
    d.position.set(a.x, a.y, a.z); d.scale.setScalar(a.hide ? 0 : a.r * 1.25); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    const base = new THREE.Color(...EL[a.el].c); const c = (a.s > 0 ? tintA : tintB).clone().lerp(base, a.s > 0 ? 0.35 : 0.0); if (a.s < 0) c.lerp(new THREE.Color(1, 0.75 + 0.1 * (a.el === 'H'), 0.45), 0.3);
    aCol.set([c.r, c.g, c.b], i * 3); aSide[i] = a.s > 0 ? 1 : 0;
  });
  geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3)); geo.setAttribute('aSide', new THREE.InstancedBufferAttribute(aSide, 1));
  atoms.add(im);
  // nuclei (one mesh per side so a slab can be pushed)
  for (const sd of [1, -1]) {
    const list = atomList.filter(a => a.s === sd);
    const nuc = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), list.length); nuc.frustumCulled = false;
    list.forEach((a, i) => { d.position.set(a.x, a.y, a.z); d.scale.setScalar(a.hide ? 0 : 0.055); d.updateMatrix(); nuc.setMatrixAt(i, d.matrix); });
    atoms.add(nuc); if (sd > 0) nucTop = nuc; else nucBot = nuc;
  }
}
// faint background specks (depth)
{
  const n = 900, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([R(-120, 120), R(-200, 200), R(-160, -40)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  atoms.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#3a4a7a', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.6 })));
}
// hero pair: one hydrogen atom from each side, for the fusion close-up
const heroMat = (col) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 1 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float nv=abs(dot(normalize(vN),normalize(vV))); gl_FragColor=vec4(uCol*(0.08*pow(nv,1.2)+0.4*pow(nv,10.0))*uA,1.0); }',
});
const heroCloudT = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), heroMat('#7cc0ff')); heroCloudT.scale.setScalar(0.62 * 1.25); atoms.add(heroCloudT);
const heroCloudB = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), heroMat('#ffa860')); heroCloudB.scale.setScalar(0.62 * 1.25); atoms.add(heroCloudB);
const nucMat = (col) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 1 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float nv=abs(dot(normalize(vN),normalize(vV))); gl_FragColor=vec4(uCol*(0.4+2.5*pow(nv,3.0))*uA,1.0); }',
});
const heroNucT = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), nucMat('#ffffff')); atoms.add(heroNucT);
const heroNucB = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), nucMat('#ffffff')); atoms.add(heroNucB);
// repulsion arcs between the two nuclei (field-line style)
const arcs = new THREE.Group(); atoms.add(arcs);
const arcMat = new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
for (let k = 0; k < 10; k++) {
  const a = k / 10 * Math.PI * 2; const pts = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; const bulge = Math.sin(u * Math.PI); pts.push(new THREE.Vector3(Math.cos(a) * bulge * 0.9, lerp(0.5, -0.5, u), Math.sin(a) * bulge * 0.9)); }
  arcs.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.02, 4, false), arcMat));
}
// fusion fireball
const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float nv=abs(dot(normalize(vN),normalize(vV))); vec3 c=mix(vec3(1.0,0.45,0.1),vec3(1.0,0.97,0.9),pow(nv,2.0)); gl_FragColor=vec4(c*(0.3+2.0*pow(nv,1.5))*uA,1.0); }',
})); atoms.add(fireball);
const heatBg = new THREE.Color('#05070f');
