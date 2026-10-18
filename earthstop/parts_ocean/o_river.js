// =================== SCENE C: the Mississippi pours over the old shelf edge into the empty Gulf basin, then dwindles ===================
const riv = new THREE.Scene(); const rivCam = new THREE.PerspectiveCamera(58, W / H, 1, 40000);
riv.fog = new THREE.Fog(new THREE.Color('#e6dccb'), 1500, 9000);
riv.add(new THREE.HemisphereLight(0xe8eef8, 0x7a6a58, 1.1)); const rivSun = new THREE.DirectionalLight(0xfff0dc, 3.0); rivSun.position.set(-600, 900, 400); riv.add(rivSun);
const rivDome = seaDome.clone(); rivDome.material = seaDome.material.clone(); rivDome.material.uniforms.uTop.value = new THREE.Color('#6a8fc0'); rivDome.material.uniforms.uBot.value = new THREE.Color('#ece2d0'); riv.add(rivDome);
const EDGE = -300, DROP = 420;
function rivH(x, z) { const plateau = (fbm(x * 0.004, z * 0.004, 3) - 0.5) * 16; const chan = -9 * Math.exp(-Math.pow(x / 70, 2)) * smooth(EDGE - 40, EDGE + 60, z);
  const cliff = -DROP * (1 - smooth(EDGE - 60, EDGE + 10, z)); const basin = (fbm(x * 0.003 + 5, z * 0.003, 3) - 0.5) * 40 * (1 - smooth(EDGE - 200, EDGE, z)); return plateau + chan + cliff + basin; }
{ const g = new THREE.PlaneGeometry(6000, 6000, 200, 200); g.rotateX(-Math.PI / 2); g.translate(0, 0, -1500); const p = g.attributes.position, col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = rivH(x, z); p.setY(i, y); if (y > -30) c.set(y > 2 ? '#6f8a44' : '#8a7a54'); else if (y > -380) c.set('#a8977a'); else c.set('#e6e2d8'); c.offsetHSL(0, 0, (hash(x * 0.3 + z * 0.7) - 0.5) * 0.05); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); riv.add(mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), false, true)); }
const flowMat = new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uW: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT, uW; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    void main(){ float edge=abs(vUv.x-0.5)*2.0; if(edge>uW) discard; float s=n(vec2(vUv.x*14.0, vUv.y*40.0+uT*6.0))*0.6+n(vec2(vUv.x*40.0, vUv.y*120.0+uT*14.0))*0.4;
      vec3 c=mix(vec3(0.22,0.42,0.52), vec3(0.85,0.92,0.95), smoothstep(0.55,0.85,s)); gl_FragColor=vec4(c,0.95); }` });
const river = new THREE.Mesh(new THREE.PlaneGeometry(130, 2600, 1, 1).rotateX(-Math.PI / 2), flowMat); river.position.set(0, -7.5, EDGE + 1300); riv.add(river);
const fallMat = flowMat.clone(); fallMat.uniforms = { uT: { value: 0 }, uW: { value: 1 } }; fallMat.side = THREE.DoubleSide;
const fall = new THREE.Mesh(new THREE.PlaneGeometry(130, DROP, 1, 1), fallMat); fall.position.set(0, -DROP / 2 - 6, EDGE - 18); fall.rotation.x = -0.12; riv.add(fall);
const lake = mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), M('#4a7a8a', { roughness: 0.2 }), false, true); lake.position.set(0, -DROP - 4, EDGE - 420); riv.add(lake);
const rivSmoke = makeSmoke(riv, 1500);
function updateRiver(t) { const u = clamp((t - RIVER) / (STORE - RIVER), 0, 1); const wv = 1 - smooth(0.45, 0.95, u) * 0.92;
  flowMat.uniforms.uT.value = t; flowMat.uniforms.uW.value = wv; fallMat.uniforms.uT.value = -t * 1.5; fallMat.uniforms.uW.value = wv; const r = lerp(200, 420, smooth(0, 0.6, u)); lake.scale.set(r, 1, r * 0.8);
  rivSmoke.begin(); smokeMat.uniforms.uTint.value.set('#f4f8fa'); for (let k = 0; k < 140; k++) { const age = ((t * 0.4 + k / 140) % 1); _sp.set((hash(k) - 0.5) * 140 * wv, -DROP + age * 90, EDGE - 40 - hash(k * 3) * 60); rivSmoke.add(_sp, 20 + age * 60, 0.35 * (1 - age) * wv); } rivSmoke.end(); }
function riverCamera(t) { const u = (t - RIVER) / (STORE - RIVER); rivCam.position.set(lerp(520, 380, u), lerp(-160, -120, u), lerp(EDGE - 820, EDGE - 700, u)); rivCam.lookAt(0, lerp(-150, -200, u), EDGE); rivCam.fov = 58; }
// =================== SCENE D: a supermarket water aisle — prices climb, shelves empty ===================
const shop = new THREE.Scene(); shop.background = new THREE.Color('#d8dce2'); const shopCam = new THREE.PerspectiveCamera(60, W / H, 0.05, 200);
shop.add(new THREE.HemisphereLight(0xf4f6ff, 0x8a8478, 1.3)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(2, 8, 4); shop.add(k); }
const priceTags = [], bottles = [], SHELF = {};
{ const fl = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#e8e6e0' : '#d6d2ca'; g.fillRect(i * 64, j * 64, 64, 64); } }, [10, 40]);
  const floor = mesh(new THREE.PlaneGeometry(10, 60).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: fl, roughness: 0.4 }), false, true); floor.position.z = -25; shop.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(10, 60).rotateX(Math.PI / 2), M('#f2f2f2'), false, false); ceil.position.set(0, 3.6, -25); shop.add(ceil);
  for (let z = 0; z > -50; z -= 4) { const lp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) })); lp.position.set(0, 3.58, z); shop.add(lp); }
  const bgeo = new THREE.CylinderGeometry(0.045, 0.045, 0.26, 8); const bmat = new THREE.MeshStandardMaterial({ color: '#8ac8f0', roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.85 }); const capm = M('#2a6ad0');
  for (const s of [-1, 1]) { const N = 30 * 5 * 22; const im = new THREE.InstancedMesh(bgeo, bmat, N); const caps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 6), capm, N); const d = new THREE.Object3D(); let k = 0;
    for (let seg = 0; seg < 30; seg++) { const z0 = -seg * 1.5; bx(0.6, 2.2, 1.45, '#cfd2d8', s * 2.3, 1.1, z0 - 0.75, shop); for (let sh = 0; sh < 5; sh++) { bx(0.62, 0.03, 1.45, '#9aa0a8', s * 2.0, 0.25 + sh * 0.42, z0 - 0.75, shop);
        for (let j = 0; j < 22; j++) { d.position.set(s * (1.85 + (j % 2) * 0.1), 0.4 + sh * 0.42, z0 - 0.05 - Math.floor(j / 2) * 0.13); d.updateMatrix(); im.setMatrixAt(k, d.matrix); const m0 = d.matrix.clone(); d.position.y += 0.145; d.updateMatrix(); caps.setMatrixAt(k, d.matrix); bottles.push({ s, k, th: hash(k * 1.3 + s * 7), m0, m1: d.matrix.clone() }); k++; } }
      if (seg % 2 === 0) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshBasicMaterial({ map: tx })); tag.position.set(s * 1.69, 1.25, z0 - 0.75); tag.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; shop.add(tag); priceTags.push({ cv, tx, seg }); } }
    shop.add(im, caps); SHELF[s] = { im, caps }; }
}
const shopPeople = []; for (let i = 0; i < 8; i++) { const p = makePerson(rnd); shop.add(p.outer); shopPeople.push({ p, z0: R(-30, -4), x: R(-1.1, 1.1), v: R(1.4, 2.2) * (rnd() < 0.5 ? 1 : -1), ph: R(0, 6) }); }
const PRICES = ['$1.49', '$4.99', '$19.99', '$99', '$499', '$2,999'];
function updateShop(t) { const u = clamp((t - STORE) / (ICE - STORE), 0, 1); const pi = Math.min(PRICES.length - 1, Math.floor(u * PRICES.length * 1.05));
  for (const P of priceTags) { const g = P.cv.getContext('2d'); g.fillStyle = '#ffe94a'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#c8202a'; g.font = '800 64px Inter'; g.textAlign = 'center'; g.fillText(PRICES[pi], 128, 84); g.fillStyle = '#2a2a2a'; g.font = '600 18px Inter'; g.fillText('WATER · 16.9 OZ', 128, 116); P.tx.needsUpdate = true; }
  const zero = new THREE.Matrix4().makeScale(0, 0, 0); const lim = smooth(0.1, 0.95, u) * 0.92;
  for (const B of bottles) { const S = SHELF[B.s]; const gone = B.th < lim; S.im.setMatrixAt(B.k, gone ? zero : B.m0); S.caps.setMatrixAt(B.k, gone ? zero : B.m1); }
  for (const s of [-1, 1]) { SHELF[s].im.instanceMatrix.needsUpdate = true; SHELF[s].caps.instanceMatrix.needsUpdate = true; }
  for (const S of shopPeople) { const z = wrapR(S.z0 + S.v * (t - STORE) * 1.4, -34, -1); S.p.outer.position.set(S.x, 0.95, z); S.p.outer.rotation.y = S.v > 0 ? 0 : Math.PI; poseWalk(S.p, t * 8 + S.ph, 1.2); S.p.outer.visible = Math.abs(z - shopCam.position.z) > 1.2; } }
function shopCamera(t) { const u = (t - STORE) / (ICE - STORE); shopCam.position.set(0.2, 1.55, lerp(1.5, -4, u)); shopCam.lookAt(-0.3, 1.15, lerp(-12, -18, u)); shopCam.fov = 62; }
// =================== SCENE E: Antarctica — convoys race across the salt flats to the last big store of fresh water ===================
const ant = new THREE.Scene(); const antCam = new THREE.PerspectiveCamera(58, W / H, 0.5, 30000); ant.fog = new THREE.Fog(new THREE.Color('#dfe6ec'), 2500, 22000);
ant.add(new THREE.HemisphereLight(0xe8f0ff, 0x8a8a8a, 1.1)); const antSun = new THREE.DirectionalLight(0xfff4e8, 2.8); antSun.position.set(400, 300, 600); antSun.castShadow = true; antSun.shadow.mapSize.set(2048, 2048);
Object.assign(antSun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 1, far: 3000 }); ant.add(antSun, antSun.target);
const antDome = seaDome.clone(); antDome.material = seaDome.material.clone(); antDome.material.uniforms.uTop.value = new THREE.Color('#7aa0d0'); antDome.material.uniforms.uBot.value = new THREE.Color('#eef2f6'); ant.add(antDome);
{ const g = new THREE.PlaneGeometry(8000, 12000, 160, 240); g.rotateX(-Math.PI / 2); g.translate(0, 0, -5000); const p = g.attributes.position, col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const ice = smooth(-3000, -3300, z); const y = (fbm(x * 0.01, z * 0.01, 3) - 0.5) * 4 + ice * (900 + (fbm(x * 0.002, z * 0.002, 4) - 0.5) * 200); p.setY(i, y); c.set(ice > 0.92 ? '#f2f7fb' : ice > 0.08 ? '#9cc4dc' : '#e2ded6').offsetHSL(0, 0, (hash(x * 0.3 + z) - 0.5) * 0.05); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); ant.add(mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), false, true)); }
const trucks = [];
for (let i = 0; i < 18; i++) { const g = new THREE.Group(); const c = pick(['#d8423a', '#e8b030', '#3a7ad0', '#f0f0f0']); bx(2.6, 3.0, 3.2, M(c, { flatShading: true }), 0, 2.0, 5.5, g); const tank = mesh(new THREE.CylinderGeometry(1.4, 1.4, 9, 12).rotateX(Math.PI / 2), M('#cfd4da', { metalness: 0.6, roughness: 0.3 })); tank.position.set(0, 2.3, -1); g.add(tank);
  for (const z of [5.8, 1.5, -3.5]) for (const x of [-1.3, 1.3]) { const w = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 10).rotateZ(Math.PI / 2), M('#151515')); w.position.set(x, 0.6, z); g.add(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); ant.add(g); trucks.push({ g, lane: (i % 3 - 1) * 14, z0: 400 + Math.floor(i / 3) * 26 + R(-3, 3) }); }
const antSmoke = makeSmoke(ant, 2500);
function updateAnt(t) { const u = t - ICE; antSmoke.begin(); smokeMat.uniforms.uTint.value.set('#eae4d8');
  for (const T of trucks) { const z = T.z0 - u * 22; T.g.position.set(T.lane, 0, z); T.g.rotation.y = Math.PI;
    for (let k = 0; k < 6; k++) { const age = ((t * 1.2 + k / 6 + T.lane) % 1); _sp.set(T.lane + (hash(k + T.z0) - 0.5) * 3, 1 + age * 6, z + 7 + age * 16); antSmoke.add(_sp, 3 + age * 12, 0.35 * (1 - age)); } } antSmoke.end(); }
function antCamera(t) { const u = (t - ICE) / (MED - ICE); const zc = 400 - (t - ICE) * 22 + 40; antCam.position.set(lerp(24, 20, u), lerp(8, 6.5, u), zc); antCam.lookAt(-6, lerp(10, 16, u), zc - 220); antCam.fov = 58;
  antSun.target.position.copy(antCam.position).add(V3(-20, 0, -60)); antSun.target.updateMatrixWorld(); antSun.position.copy(antCam.position).add(V3(300, 260, 400)); }
