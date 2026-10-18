// =================== SCENE B (globe, ER = 10): the drained world from space; hurricane falls apart; later the Mediterranean flood ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#04060c');
const spaceCam = new THREE.PerspectiveCamera(38, W / H, 0.05, 3000);
{ const n = 4000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(900); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7 }))); }
space.add(new THREE.AmbientLight(0x6a7590, 0.9));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 2.8); spaceSun.position.set(-40, 30, 60); space.add(spaceSun);
const ER = 10;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const globe = new THREE.Group(); space.add(globe);
let globeGeo = null, COL_DRY = null, COL_MED = null, MED_FACES = [];
const inMed = (lat, lon) => lat > 30 && lat < 46.5 && lon > -6 && lon < 37 && !(lon > 26 && lat > 41);   // rough Mediterranean box (Black Sea excluded)
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json();
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH);
  const drawGeo = (geom) => { g.fillStyle = '#fff'; const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
    for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } } };
  for (const f of topojson.feature(topo, topo.objects.countries).features) if (f.geometry) drawGeo(f.geometry);
  const img = g.getImageData(0, 0, MW, MH).data;
  const land = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const nearLand = (lat, lon) => { for (const [a, b] of [[2, 0], [-2, 0], [0, 2.5], [0, -2.5], [1.5, 1.5], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5]]) if (land(lat + a, lon + b)) return true; return false; };
  const geo = new THREE.IcosahedronGeometry(ER, 56); const p = geo.attributes.position; const n = p.count; COL_DRY = new Float32Array(n * 3); COL_MED = new Float32Array(n * 3);
  const c = new THREE.Color(), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let f = 0; f < n; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(w.fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI, al = Math.abs(lat), j = rnd() * 0.06 - 0.03; const L = land(lat, lon);
    let dry, wet;
    if (lat < -62 || lat > 80 || (al > 72 && L)) { dry = wet = '#eef3f6'; }
    else if (L) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); c.multiplyScalar(0.8); dry = wet = '#' + c.getHexString(); }
    else { const shelf = nearLand(lat, lon); c.set(shelf ? '#a8987c' : '#e6e2d8'); c.offsetHSL(0, 0, j * 0.8); dry = '#' + c.getHexString(); c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); wet = '#' + c.getHexString(); if (inMed(lat, lon)) MED_FACES.push({ f, lon, wet: wet, dry }); }
    c.set(dry); for (let k = 0; k < 3; k++) COL_DRY.set([c.r, c.g, c.b], (f + k) * 3); c.set(wet); for (let k = 0; k < 3; k++) COL_MED.set([c.r, c.g, c.b], (f + k) * 3); }
  for (const F of MED_FACES) { c.set(F.dry); for (let k = 0; k < 3; k++) COL_MED.set([c.r, c.g, c.b], (F.f + k) * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(COL_DRY.slice(), 3)); globeGeo = geo;
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(ER * 1.04, 64, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.3; }' })));
}
// clouds (fade out as the water vapour disappears) + a hurricane spiral off Florida that falls apart
const cloudTex = canvasTex(1024, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const x = R(0, w), y = R(h * 0.08, h * 0.92), r = R(4, 22); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
const clouds = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.012, 64, 48), new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.9, roughness: 1 })); globe.add(clouds);
const hurTex = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.lineCap = 'round'; for (let arm = 0; arm < 3; arm++) for (let a = 0.3; a < 9; a += 0.04) { const r = 14 + a * 26, ang = a + arm * 2.094; const x = w / 2 + Math.cos(ang) * r, y = h / 2 + Math.sin(ang) * r; g.fillStyle = `rgba(255,255,255,${0.55 * (1 - a / 9)})`; g.beginPath(); g.arc(x, y, 10 + a * 3.2, 0, 7); g.fill(); } const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 60); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill(); g.fillStyle = 'rgba(60,80,110,0.8)'; g.beginPath(); g.arc(w / 2, h / 2, 10, 0, 7); g.fill(); });
const hurricane = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), new THREE.MeshBasicMaterial({ map: hurTex, transparent: true, depthWrite: false })); globe.add(hurricane);
{ const p = ll2v(26, -76, ER * 1.02); hurricane.position.copy(p); hurricane.lookAt(p.clone().multiplyScalar(2)); }
function updateGlobe(t) {
  if (!globeGeo) return; const col = globeGeo.attributes.color;
  if (t < MED - 0.8) { if (col.userData !== 'dry') { col.array.set(COL_DRY); col.userData = 'dry'; col.needsUpdate = true; }
    const k = smooth(GLOBE + 2.2, GLOBE + 5.5, t); clouds.material.opacity = 0.9 * (1 - k); clouds.visible = k < 0.99; clouds.rotation.y = t * 0.01;
    const hk = smooth(GLOBE + 0.6, GLOBE + 3.2, t); hurricane.visible = hk < 0.999; hurricane.material.opacity = 1 - hk; hurricane.rotation.z = -t * 2.2; hurricane.scale.setScalar(1 + hk * 1.4); }
  else { clouds.visible = true; clouds.material.opacity = 0.35; hurricane.visible = false; col.array.set(COL_MED); const front = lerp(-7, 38, smooth(MED + 0.5, MED + 2.6, t)); const c = new THREE.Color();
    for (const F of MED_FACES) { if (F.lon < front) { c.set(F.wet); for (let k = 0; k < 3; k++) col.array.set([c.r, c.g, c.b], (F.f + k) * 3); } } col.userData = 'med'; col.needsUpdate = true; }
}
function globeCamera(t) {
  let lat, lon, dist; if (t < MED - 0.8) { const u = (t - GLOBE) / (RIVER - GLOBE); lat = lerp(30, 26, u); lon = lerp(-72, -86, u); dist = lerp(31, 27, u); }
  else { const u = (t - MED) / (T_END - MED); lat = 36; lon = lerp(12, 16, u); dist = lerp(28, 26, u); }
  const p = ll2v(lat, lon, dist); spaceCam.position.copy(p); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(ll2v(lat - 4, lon, 0)); spaceCam.fov = 38;
  spaceSun.position.copy(ll2v(lat + 15, lon - 40, 60)); }
