
// =================== helpers ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(parent, w, h, d, mat, x, y, z) { const m = mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const puffTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 64 + R(-26, 26), y = 64 + R(-20, 20), r = R(18, 34); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(215,240,120,0.95)'); gr.addColorStop(0.6, 'rgba(170,210,80,0.5)'); gr.addColorStop(1, 'rgba(150,190,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
const GASC = '#b8dc4a';
function skyDome(scene, top, bot, r = 4000) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: new THREE.Color(top) }, uB: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uT, uB; varying vec3 vD; void main(){ float e=clamp(normalize(vD).y,-0.2,1.0); vec3 c=mix(uB,uT,pow(max(e,0.0),0.55)); gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
  m.frustumCulled = false; scene.add(m); return m;
}

// =================== GLOBE ===================
const gScene = new THREE.Scene(); gScene.background = new THREE.Color('#020308');
const gCam = new THREE.PerspectiveCamera(32, W / H, 0.1, 3000);
{
  const n = 5000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gScene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false })));
}
gScene.add(new THREE.AmbientLight(0x405070, 0.6)); const gSun = new THREE.DirectionalLight(0xfff2e0, 2.8); gSun.position.set(-8, 5, 10); gScene.add(gSun);
const ER = 10; const globe = new THREE.Group(); gScene.add(globe);
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
let landImg = null;
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json(); const land = topojson.feature(topo, topo.objects.land);
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry]; const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) { if (ring.every(([, la]) => la < -55)) continue; let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } }
  landImg = g.getImageData(0, 0, MW, MH).data;
  const isLand = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return landImg[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 44); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI; const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6'); else if (isLand(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); } else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  // puffs + sound rings at land points
  const pts = []; let tries = 0; while (pts.length < 420 && tries < 20000) { tries++; const lat = R(-50, 65), lon = R(-180, 180); if (isLand(lat, lon)) pts.push([lat, lon]); }
  for (const [lat, lon] of pts) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.position.copy(ll2v(lat, lon, ER * 1.01)); s.scale.setScalar(0.01); globe.add(s); gPuffs.push({ s, lat, lon, ph: rnd() }); }
  for (let i = 0; i < 160; i++) { const [lat, lon] = pts[i]; const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); const n = ll2v(lat, lon, 1).normalize(); r.position.copy(n.clone().multiplyScalar(ER * 1.004)); r.lookAt(n.clone().multiplyScalar(ER * 2)); globe.add(r); gRings.push({ r, ph: rnd() }); }
}
const gPuffs = [], gRings = [];
const gAtm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.07, 64, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uG: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uG; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.2); gl_FragColor=vec4(mix(vec3(0.45,0.7,1.0),vec3(0.75,0.95,0.3),uG),1.0)*f*1.4; }' })); gScene.add(gAtm);
// sweeping green wave: a shell that lights up behind a moving front (the terminator of the "moment")
const gWave = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.012, 96, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uFront: { value: -1.2 }, uA: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uFront, uA; varying vec3 vP; void main(){ float d=dot(vP,normalize(vec3(1.0,0.2,0.6))); float ring=exp(-pow((d-uFront)/0.05,2.0)); float behind=smoothstep(uFront+0.05,uFront-0.1,d)*0.18; gl_FragColor=vec4(vec3(0.75,1.0,0.3)*(ring*1.4+behind)*uA,1.0); }' }));
globe.add(gWave);

// =================== NEW YORK HARBOR (meters) ===================
const ny = new THREE.Scene(); ny.fog = new THREE.Fog('#b8cde0', 600, 5200);
const nyCam = new THREE.PerspectiveCamera(50, W / H, 0.5, 9000);
skyDome(ny, '#4f86c6', '#cfe0ee', 6000);
ny.add(new THREE.HemisphereLight(0xcfe2ff, 0x5a6a60, 1.0));
const nySun = new THREE.DirectionalLight(0xfff0dc, 2.8); nySun.position.set(-300, 420, 260); nySun.castShadow = true; nySun.shadow.mapSize.set(2048, 2048);
Object.assign(nySun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 1500 }); ny.add(nySun, nySun.target);
const water = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000, 1, 1), new THREE.MeshStandardMaterial({ color: '#3d6f8e', roughness: 0.25, metalness: 0.1 })); water.rotation.x = -Math.PI / 2; water.receiveShadow = true; ny.add(water);
// Liberty Island: grass + star-ish fort base
const island = new THREE.Group(); ny.add(island);
{ const isl = mesh(new THREE.CylinderGeometry(120, 125, 3, 10), '#6f9a52'); isl.position.y = 1.0; island.add(isl);
  const star = new THREE.Shape(); for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; const r = i % 2 ? 26 : 38; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); } star.closePath();
  const fort = mesh(new THREE.ExtrudeGeometry(star, { depth: 8, bevelEnabled: false }), '#b9b2a2'); fort.rotation.x = -Math.PI / 2; fort.position.y = 2.5; island.add(fort);
  // pedestal (granite) ~ 47 m to the statue's feet
  box(island, 28, 6, 28, '#a9a194', 0, 13.5, 0); box(island, 20, 22, 20, '#bdb5a6', 0, 27.5, 0); box(island, 22, 2.5, 22, '#a9a194', 0, 39.5, 0); box(island, 16, 6, 16, '#bdb5a6', 0, 43.7, 0);
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) box(island, 0.6 + Math.abs(z) * 14, 9, 0.6 + Math.abs(x) * 14, '#9a9284', x * 10.1, 27, z * 10.1);
  // statue (copper patina) ~46 m
  const cu = M('#6fae9a', { flatShading: true, roughness: 0.7 });
  const st = new THREE.Group(); st.position.y = 46.7; island.add(st);
  const robe = mesh(new THREE.CylinderGeometry(4.3, 6.8, 26, 9), cu); robe.position.y = 13; st.add(robe);
  const torso = mesh(new THREE.CylinderGeometry(3.4, 4.3, 8, 9), cu); torso.position.y = 30; st.add(torso);
  const head = mesh(new THREE.SphereGeometry(2.5, 10, 8), cu); head.position.y = 36.8; head.scale.set(1, 1.15, 1); st.add(head);
  for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; const ray = mesh(new THREE.ConeGeometry(0.35, 3.2, 4), cu); ray.position.set(Math.sin(a) * 2.6, 39.2 + Math.cos(a) * 0.4, Math.cos(a) * 1.2); ray.rotation.set(-0.3 + Math.cos(a) * -0.2, 0, -Math.sin(a) * 0.9); st.add(ray); }
  const arm = mesh(new THREE.CylinderGeometry(1.0, 1.3, 13, 7), cu); arm.position.set(3.4, 39, 0.4); arm.rotation.z = -0.12; st.add(arm);
  const torch = mesh(new THREE.CylinderGeometry(1.1, 0.6, 3, 8), cu); torch.position.set(4.3, 46.5, 0.4); st.add(torch);
  const flame = mesh(new THREE.ConeGeometry(1.2, 3.0, 8), M('#e9c46a', { emissive: '#ffb030', emissiveIntensity: 0.8, flatShading: true })); flame.position.set(4.4, 49.4, 0.4); st.add(flame);
  const tab = mesh(BOX, cu); tab.scale.set(1.2, 7, 4.5); tab.position.set(-4.2, 27, 1.2); tab.rotation.z = 0.15; st.add(tab);
}
// Manhattan skyline far away
{ const cols = ['#9aa7b4', '#8b98a6', '#b4bec8', '#7d8a98', '#a6a39a'];
  for (let i = 0; i < 260; i++) { const x = R(-1600, 1400), z = R(-3600, -2500); const h = R(40, 260) * (rnd() < 0.08 ? 1.8 : 1); box(ny, R(30, 70), h, R(30, 70), pick(cols), x, h / 2, z); }
  const one = box(ny, 60, 541, 60, '#a9bccc', 250, 270, -2550); }
// the gas cube: 90.4 m on a side (738,000 m3), translucent, softly boiling
const CUBE_S = 90.4;
const gasMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
  vertexShader: 'uniform float uT; varying vec3 vP; varying vec3 vN; void main(){ vP=position; vec3 p=position+normal*(0.6*sin(position.y*0.18+uT*2.0)*sin(position.x*0.15+uT*1.3)); vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
  fragmentShader: `uniform float uT, uA; varying vec3 vP; varying vec3 vN; void main(){ float n=0.5+0.5*sin(vP.x*0.08+uT)*sin(vP.y*0.07-uT*0.7)*sin(vP.z*0.09+uT*0.4); vec3 c=mix(vec3(0.42,0.66,0.08),vec3(0.70,0.88,0.22),n); float edge=pow(1.0-abs(vN.z),2.0)*0.2; gl_FragColor=vec4(c,(0.5+0.2*n+edge)*uA);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const gasCube = new THREE.Mesh(new THREE.BoxGeometry(CUBE_S, CUBE_S, CUBE_S, 12, 12, 12), gasMat); gasCube.renderOrder = 5; ny.add(gasCube);
const GAS_X = 82, GAS_Z = -30;
const cubeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_S, CUBE_S, CUBE_S)), new THREE.LineBasicMaterial({ color: '#e8ff9a', transparent: true, opacity: 0 })); ny.add(cubeEdges);
// gas streams rising into the cube (puff sprites)
const streams = []; for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); ny.add(s); streams.push({ s, a: R(0, 6.28), r: R(300, 1400), ph: rnd(), y0: R(0, 40) }); }
// a boat for scale
{ const boat = new THREE.Group(); boat.position.set(-60, 0, 120); boat.rotation.y = 0.4; ny.add(boat); box(boat, 36, 4, 9, '#f2f2f0', 0, 2, 0); box(boat, 22, 5, 7, '#e8e4dc', -2, 6.5, 0); box(boat, 22, 0.6, 7.4, '#2b5f8a', -2, 9.2, 0); }
// lighter (finale): a hand-held lighter by the cube base, close to camera
const lighter = new THREE.Group(); ny.add(lighter); lighter.visible = false;
{ box(lighter, 0.022, 0.072, 0.011, M('#c8202a', { roughness: 0.35 }), 0, 0, 0); box(lighter, 0.02, 0.014, 0.011, M('#c0c0c8', { metalness: 0.8, roughness: 0.3 }), 0, 0.043, 0); const wh = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.009, 10), M('#555')); wh.rotation.x = Math.PI / 2; wh.position.set(-0.005, 0.053, 0); lighter.add(wh); }
const lFlame = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 80, 2, 32, 70, 40); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,0.9)'); gr.addColorStop(0.7, 'rgba(255,90,20,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 72, 18, 46, 0, 0, Math.PI * 2); g.fill(); }), transparent: true, depthWrite: false })); lFlame.scale.set(0.022, 0.045, 1); lFlame.material.depthTest = false; lFlame.renderOrder = 12; lighter.add(lFlame); lighter.traverse(o => { if (o.isMesh) o.renderOrder = 11; }); lFlame.position.y = 0.068;

// =================== PASTURE (cow) ===================
const farm = new THREE.Scene(); farm.fog = new THREE.Fog('#cfe2f0', 80, 600);
const farmCam = new THREE.PerspectiveCamera(42, W / H, 0.1, 3000);
skyDome(farm, '#5a93d0', '#dbe9f3', 2500);
farm.add(new THREE.HemisphereLight(0xdbeaff, 0x6a7a40, 1.0)); const farmSun = new THREE.DirectionalLight(0xfff0d8, 2.6); farmSun.position.set(-20, 30, 18); farmSun.castShadow = true; farmSun.shadow.mapSize.set(2048, 2048); Object.assign(farmSun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 100 }); farm.add(farmSun, farmSun.target);
{ const gGeo = new THREE.PlaneGeometry(1200, 1200, 120, 120); gGeo.rotateX(-Math.PI / 2); const p = gGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x * 0.02) * Math.cos(z * 0.017) * 6 * smooth(30, 160, Math.hypot(x, z))); } gGeo.computeVertexNormals();
  const gr = mesh(gGeo, M('#6fa046', { flatShading: true }), false, true); farm.add(gr);
  for (let x = -40; x <= 40; x += 3) { box(farm, 0.15, 1.2, 0.15, '#7a5a3a', x, 0.6, -9); } box(farm, 82, 0.12, 0.08, '#8a6a4a', 0, 1.0, -9); box(farm, 82, 0.12, 0.08, '#8a6a4a', 0, 0.6, -9);
  const barn = new THREE.Group(); barn.position.set(-26, 0, -40); farm.add(barn); box(barn, 14, 8, 10, '#a8322a', 0, 4, 0); for (const sx of [-1, 1]) { const rf = box(barn, 8.4, 0.4, 10.8, '#4a4a50', sx * 3.4, 9.9, 0); rf.rotation.z = -sx * 0.55; }
  for (let i = 0; i < 40; i++) { const tr = new THREE.Group(); const a = R(0, 6.28), r = R(60, 260); tr.position.set(Math.cos(a) * r, 0, -Math.abs(Math.sin(a)) * r - 30); farm.add(tr); const t1 = mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), '#5a4030'); t1.position.y = 1.5; tr.add(t1); const c1 = mesh(new THREE.IcosahedronGeometry(2.6, 0), '#4f8a3a'); c1.position.y = 4.4; tr.add(c1); }
}
function makeCow(spots) {
  const g = new THREE.Group(); const W_ = '#f2f0ea', B_ = '#2a2622';
  box(g, 2.2, 1.1, 0.95, W_, 0, 1.25, 0);
  for (const [x, y, z, s] of spots) box(g, s, s * 0.6, 0.97, B_, x, y, z);
  const head = new THREE.Group(); head.position.set(1.3, 1.6, 0); g.add(head); box(head, 0.7, 0.6, 0.55, W_, 0.2, 0, 0); box(head, 0.32, 0.36, 0.5, '#e9a8a0', 0.62, -0.12, 0); box(head, 0.1, 0.1, 0.05, B_, 0.35, 0.12, 0.28); box(head, 0.1, 0.1, 0.05, B_, 0.35, 0.12, -0.28);
  for (const z of [0.3, -0.3]) { const horn = mesh(new THREE.ConeGeometry(0.06, 0.28, 5), '#e8dcc0'); horn.position.set(0.05, 0.38, z); horn.rotation.x = z > 0 ? -0.4 : 0.4; head.add(horn); box(head, 0.12, 0.22, 0.32, W_, -0.05, 0.16, z * 1.5); }
  for (const [x, z] of [[0.8, 0.32], [0.8, -0.32], [-0.8, 0.32], [-0.8, -0.32]]) box(g, 0.24, 0.8, 0.24, W_, x, 0.4, z);
  box(g, 0.06, 0.7, 0.06, W_, -1.12, 1.2, 0); box(g, 0.5, 0.18, 0.4, '#e9a8a0', 0.1, 0.62, 0);
  g.userData.head = head; return g;
}
const cow = makeCow([[0.3, 1.45, 0, 0.7], [-0.6, 1.1, 0, 0.5], [0.7, 1.0, 0, 0.35]]); farm.add(cow); cow.rotation.y = -0.35;
const herd = []; for (let i = 0; i < 9; i++) { const c = makeCow([[R(-0.6, 0.6), R(1.0, 1.5), 0, R(0.35, 0.7)], [R(-0.8, 0.8), R(1.0, 1.5), 0, R(0.3, 0.5)]]); c.position.set(R(-30, 30), 0, R(-35, -14)); c.rotation.y = R(0, 6.28); farm.add(c); herd.push(c); }
const burps = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); farm.add(s); burps.push({ s, ph: i / 26 }); }
const tailPuff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); farm.add(tailPuff);

// =================== UNDERWATER (herring) ===================
const sea = new THREE.Scene(); sea.background = new THREE.Color('#0d4a66'); sea.fog = new THREE.Fog('#0d4a66', 8, 70);
const seaCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 400);
sea.add(new THREE.HemisphereLight(0x9fe0ff, 0x08202c, 1.3)); const seaSun = new THREE.DirectionalLight(0xc8f0ff, 1.6); seaSun.position.set(4, 30, 6); sea.add(seaSun);
const fishGeo = (() => { const s = new THREE.Shape(); s.moveTo(0.16, 0); s.quadraticCurveTo(0.06, 0.045, -0.08, 0.02); s.lineTo(-0.15, 0.05); s.lineTo(-0.13, 0); s.lineTo(-0.15, -0.05); s.lineTo(-0.08, -0.02); s.quadraticCurveTo(0.06, -0.045, 0.16, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 }); g.translate(0, 0, -0.015); return g; })();
const FISH_N = 420; const fishIM = new THREE.InstancedMesh(fishGeo, new THREE.MeshStandardMaterial({ color: '#b8c8d4', metalness: 0.6, roughness: 0.3, flatShading: true }), FISH_N); fishIM.frustumCulled = false; sea.add(fishIM);
const fishP = []; for (let i = 0; i < FISH_N; i++) fishP.push({ x: R(-6, 6), y: R(-2.2, 2.2), z: R(-6, 3), ph: R(0, 6.28), s: R(0.8, 1.3), bub: rnd() < 0.35 });
const bubIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.012, 1), new THREE.MeshStandardMaterial({ color: '#e8fbff', roughness: 0.1, transparent: true, opacity: 0.85, emissive: '#6fc0e0', emissiveIntensity: 0.3 }), 1600); bubIM.frustumCulled = false; sea.add(bubIM);
const rays = []; for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 40), new THREE.MeshBasicMaterial({ color: '#bfefff', transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.position.set(R(-10, 10), 6, R(-14, -2)); r.rotation.set(0, R(0, 3), 0.25); sea.add(r); rays.push(r); }
{ const sand = mesh(new THREE.PlaneGeometry(200, 200, 40, 40), '#c8b48a', false, true); sand.rotation.x = -Math.PI / 2; sand.position.y = -6; sea.add(sand); }
const D3 = new THREE.Object3D();

// =================== JUNGLE (sloth) ===================
const jungle = new THREE.Scene(); jungle.fog = new THREE.Fog('#9fc49a', 6, 60);
const jCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
skyDome(jungle, '#8fc0a8', '#d8ecd0', 300);
jungle.add(new THREE.HemisphereLight(0xe8ffe0, 0x3a4a2a, 1.1)); const jSun = new THREE.DirectionalLight(0xfff4d8, 2.2); jSun.position.set(-4, 10, 6); jungle.add(jSun);
const branch = mesh(new THREE.CylinderGeometry(0.11, 0.14, 7, 8), '#6b4a32'); branch.rotation.z = Math.PI / 2 - 0.08; branch.position.set(0, 2.4, 0); jungle.add(branch);
for (let i = 0; i < 70; i++) { const l = mesh(new THREE.IcosahedronGeometry(R(0.6, 1.6), 0), pick(['#3f7a3a', '#4f8f40', '#2f6a34', '#5a9a48'])); l.position.set(R(-6, 6), R(2.8, 7), R(-6, -0.8)); jungle.add(l); }
for (let i = 0; i < 14; i++) { const v = mesh(new THREE.CylinderGeometry(0.02, 0.02, R(2, 5), 4), '#3f6a2a'); v.position.set(R(-4, 4), R(2, 4), R(-3, -0.5)); jungle.add(v); }
const sloth = new THREE.Group(); jungle.add(sloth); sloth.position.set(0, 2.4, 0);
{ const fur = M('#8a7458'), face = M('#d8c8a8');
  const body = mesh(new THREE.CapsuleGeometry(0.28, 0.6, 4, 8), fur); body.rotation.z = Math.PI / 2; body.position.y = -0.42; sloth.add(body);
  for (const [x, a] of [[-0.3, 0.1], [0.3, -0.1], [-0.38, 0.05], [0.38, -0.05]]) { const limb = mesh(new THREE.CapsuleGeometry(0.06, 0.38, 3, 6), fur); limb.position.set(x, -0.17, x > 0 ? 0.12 : -0.12); limb.rotation.z = a; sloth.add(limb); }
  const head = mesh(new THREE.SphereGeometry(0.22, 12, 10), fur); head.position.set(0.55, -0.5, 0.12); sloth.add(head);
  const mask = mesh(new THREE.SphereGeometry(0.17, 12, 10), face); mask.scale.set(1, 0.85, 0.5); mask.position.set(0.6, -0.52, 0.27); sloth.add(mask);
  for (const z of [-0.07, 0.07]) { const patch = mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#3a2a1c')); patch.scale.set(1.4, 0.8, 0.4); patch.position.set(0.6 + z, -0.5, 0.33); sloth.add(patch); const eye = mesh(new THREE.SphereGeometry(0.018, 6, 5), M('#0a0a0a')); eye.position.set(0.6 + z, -0.5, 0.36); sloth.add(eye); }
  const nose = mesh(new THREE.SphereGeometry(0.03, 6, 5), M('#2a1a12')); nose.position.set(0.6, -0.57, 0.36); sloth.add(nose);
}
const slothBreath = []; for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); jungle.add(s); slothBreath.push({ s, ph: i / 6 }); }

// =================== SKY (birds) ===================
const birdsS = new THREE.Scene(); birdsS.fog = new THREE.Fog('#d8e8f4', 100, 900);
const bCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 3000);
skyDome(birdsS, '#3f7fc8', '#e6eff6', 2000);
birdsS.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
const cloudTex2 = canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 24; i++) { const x = R(40, w - 40), y = R(50, h - 30), r = R(18, 42); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex2, transparent: true, depthWrite: false, fog: false })); s.position.set(R(-600, 600), R(-150, 200), R(-900, -200)); const sc = R(160, 380); s.scale.set(sc, sc * 0.45, 1); birdsS.add(s); }
const BIRD_N = 60; const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.14, 0, 0, -0.1, 0.55, 0, -0.05], 3)); wingGeo.computeVertexNormals();
const wingMat = new THREE.MeshStandardMaterial({ color: '#2a2a30', side: THREE.DoubleSide, flatShading: true });
const birds = []; for (let i = 0; i < BIRD_N; i++) { const g = new THREE.Group(); const body = mesh(new THREE.ConeGeometry(0.07, 0.45, 5), '#2a2a30'); body.rotation.x = -Math.PI / 2; g.add(body);
  const wr = new THREE.Mesh(wingGeo, wingMat); const wl = new THREE.Mesh(wingGeo, wingMat); wl.scale.x = -1; g.add(wr, wl); g.scale.setScalar(2.4); birdsS.add(g);
  birds.push({ g, wr, wl, x: R(-14, 14), y: R(-6, 6), z: R(-30, -8), ph: R(0, 6.28) }); }
