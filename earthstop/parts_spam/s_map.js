// =================== US MAP (Albers USA units, 975 x 610): spam calls flashing, then the 93,447 missing ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#070b16');
const mapCam = new THREE.PerspectiveCamera(36, W / H, 1, 6000);
const STATES = { Alabama: [5.0, 50.6], Alaska: [0.73, 571], Arizona: [7.2, 113.6], Arkansas: [3.0, 52.0], California: [39.5, 155.8], Colorado: [5.8, 103.6], Connecticut: [3.6, 4.8], Delaware: [1.0, 1.9], 'District of Columbia': [0.69, 0.06], Florida: [21.5, 53.6], Georgia: [10.7, 57.5], Hawaii: [1.46, 6.4], Idaho: [1.8, 82.6], Illinois: [12.8, 55.5], Indiana: [6.8, 35.8], Iowa: [3.2, 55.9], Kansas: [2.9, 81.8], Kentucky: [4.5, 39.5], Louisiana: [4.7, 43.2], Maine: [1.4, 30.8], Maryland: [6.2, 9.7], Massachusetts: [7.0, 7.8], Michigan: [10.1, 56.5], Minnesota: [5.7, 79.6], Mississippi: [3.0, 46.9], Missouri: [6.2, 68.7], Montana: [1.1, 145.5], Nebraska: [2.0, 76.8], Nevada: [3.1, 109.8], 'New Hampshire': [1.4, 8.95], 'New Jersey': [9.3, 7.4], 'New Mexico': [2.1, 121.3], 'New York': [20.2, 47.1], 'North Carolina': [10.4, 48.6], 'North Dakota': [0.78, 69.0], Ohio: [11.8, 40.9], Oklahoma: [4.0, 68.6], Oregon: [4.2, 95.9], Pennsylvania: [13.0, 44.7], 'Rhode Island': [1.1, 1.0], 'South Carolina': [5.1, 30.1], 'South Dakota': [0.89, 75.8], Tennessee: [6.9, 41.2], Texas: [29.1, 261.2], Utah: [3.3, 82.2], Vermont: [0.64, 9.2], Virginia: [8.6, 39.5], Washington: [7.7, 66.5], 'West Virginia': [1.8, 24.0], Wisconsin: [5.9, 54.2], Wyoming: [0.58, 97.1] };
mapScene.add(new THREE.HemisphereLight(0x9fb0e0, 0x101020, 1.1));
const mapKey = new THREE.DirectionalLight(0xc8d4ff, 1.6); mapKey.position.set(-300, 900, 700); mapScene.add(mapKey);
const MW = 975, MH = 610, MAPY = 10.4;
let callPts, missPts, mapPerson, mapRings = [], FOCUS = V3(0, MAPY, 0);
const ptsVS = `attribute float aPh; attribute float aSz; uniform float uT, uScale, uMax; varying float vPh; void main(){ vPh=aPh; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(aSz*uScale/(-mv.z),uMax); gl_Position=projectionMatrix*mv; }`;
const callMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uAmt: { value: 0 }, uScale: { value: 1 }, uMax: { value: 60 } }, vertexShader: ptsVS,
  fragmentShader: `uniform float uT, uAmt; varying float vPh; void main(){ if(vPh>uAmt) discard; float cyc=fract(uT/1.3+vPh*31.0); float k=exp(-cyc*6.0)*smoothstep(0.0,0.03,cyc);
    vec2 q=gl_PointCoord-0.5; float d=length(q)*2.0; float a=(exp(-d*d*6.0)+0.6*exp(-d*d*40.0))*k; if(a<0.01) discard; gl_FragColor=vec4(vec3(0.45,0.75,1.0)*a*1.4,1.0); }` });
const missMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uAmt: { value: 0 }, uScale: { value: 1 }, uMax: { value: 14 }, uPulse: { value: 0 } }, vertexShader: ptsVS,
  fragmentShader: `uniform float uT, uAmt, uPulse; varying float vPh; void main(){ if(vPh>uAmt) discard; float cyc=fract(uT*0.9+vPh*53.0); float k=0.55+uPulse*1.2*exp(-cyc*5.0);
    vec2 q=gl_PointCoord-0.5; float d=length(q)*2.0; float a=exp(-d*d*7.0)*k*0.7; if(a<0.01) discard; gl_FragColor=vec4(vec3(1.0,0.78,0.45)*a,1.0); }` });
async function buildMap() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii'].includes(g.properties.name));
  const info = await (await fetch('zmap.json')).json();
  const merged = topojson.merge(topo, L48); const shapes = [];
  for (const poly of merged.coordinates) { const outer = poly[0]; if (outer.length < 8) continue;
    const sh = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2)))); for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))))); shapes.push(sh); }
  const slabGeo = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 }); slabGeo.rotateX(-Math.PI / 2);
  const slab = new THREE.Mesh(slabGeo, [new THREE.MeshStandardMaterial({ color: '#24345e', roughness: 0.9, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#111a33', roughness: 1 })]); mapScene.add(slab);
  const bm = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b);
  const lp = []; for (const line of bm.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; lp.push(a[0] - MW / 2, 10.2, a[1] - MH / 2, b[0] - MW / 2, 10.2, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  mapScene.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#7f8fc0', transparent: true, opacity: 0.55 })));
  // per-state raster (colour = state index) -> population-weighted sampling, metros for clustering
  const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const feats = topojson.feature(topo, { type: 'GeometryCollection', geometries: L48 }).features;
  feats.forEach((f, i) => { g.fillStyle = `rgb(${i + 1},0,0)`; g.beginPath(); const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of polys) for (const ring of p) { ring.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); } g.fill('evenodd'); });
  const px = g.getImageData(0, 0, MW, MH).data; const cells = feats.map(() => []);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const i = (y * MW + x) * 4; if (px[i + 3] > 250 && px[i + 1] === 0) { const s = px[i] - 1; if (cells[s]) cells[s].push(x, y); } }
  const land = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= MW || y >= MH) return false; const i = (y * MW + x) * 4; return px[i + 3] > 128; };
  const sw = feats.map(f => (STATES[f.properties.name] || [0.5])[0]); const swT = sw.reduce((a, b) => a + b, 0);
  const metros = info.metros.filter(m => !['Honolulu', 'Anchorage'].includes(m.n)); const mT = metros.reduce((a, m) => a + m.pop, 0);
  const sample = () => { for (let tries = 0; tries < 30; tries++) {
      if (rnd() < 0.5) { let r = rnd() * mT, m = metros[0]; for (const mm of metros) { r -= mm.pop; if (r <= 0) { m = mm; break; } } const s = 2 + 2.6 * Math.sqrt(m.pop); const a = rnd() * 6.283, rr = s * Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)); const x = m.x * 2 + Math.cos(a) * rr, y = m.y * 2 + Math.sin(a) * rr; if (land(x, y)) return [x, y]; }
      else { let r = rnd() * swT, s = 0; for (; s < sw.length - 1; s++) { r -= sw[s]; if (r <= 0) break; } const c = cells[s]; if (!c.length) continue; const k = Math.floor(rnd() * c.length / 2) * 2; return [c[k] + rnd(), c[k + 1] + rnd()]; } }
    return [MW / 2, MH / 2]; };
  const mkPts = (n, mat, szA, szB) => { const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
    for (let i = 0; i < n; i++) { const [x, y] = sample(); pos[i * 3] = x - MW / 2; pos[i * 3 + 1] = MAPY; pos[i * 3 + 2] = y - MH / 2; ph[i] = rnd(); sz[i] = R(szA, szB); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); geo.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; mapScene.add(p); return p; };
  callPts = mkPts(12000, callMat, 14, 28);
  missPts = mkPts(93447, missMat, 3, 5);
  // the zoom target: one dot near St. Louis
  const stl = metros.find(m => m.n === 'St. Louis') || metros[10]; FOCUS = V3(stl.x * 2 - MW / 2 + 6, MAPY, stl.y * 2 - MH / 2 + 3);
  mapPerson = makePerson(rnd, { top: '#e8b04a', bottom: '#2a3a5c', skin: '#d7a47e', dress: false }); givePhone(mapPerson); posePhone(mapPerson, 0, 0);
  mapPerson.outer.scale.setScalar(1.6); mapPerson.outer.position.copy(FOCUS).add(V3(0, 0.95 * 1.6, 0)); mapPerson.outer.rotation.y = 0.5; mapScene.add(mapPerson.outer);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.copy(FOCUS).add(V3(0, 0.05, 0)); mapScene.add(r); mapRings.push(r); }
  const spot = new THREE.PointLight(0xffe0b0, 40, 30, 1.5); spot.position.copy(FOCUS).add(V3(2, 6, 4)); mapScene.add(spot);
}
function updateMap(t) {
  callMat.uniforms.uT.value = t; missMat.uniforms.uT.value = t;
  callMat.uniforms.uAmt.value = lerp(0.05, 1, smooth(MAP, MAP + 2.5, t)) * (1 - smooth(DIVIDE, DIVIDE + 1.0, t));
  missMat.uniforms.uAmt.value = smooth(DIVIDE + 0.6, DIVIDE + 3.5, t); missMat.uniforms.uPulse.value = smooth(DIVIDE + 4.8, DIVIDE + 5.6, t);
  const sc = H / (2 * Math.tan(mapCam.fov * Math.PI / 360)); callMat.uniforms.uScale.value = sc; missMat.uniforms.uScale.value = sc;
  mapRings.forEach((r, i) => { const k = ((t - (DIVIDE + 5)) * 1.1 + i / 4) % 1; const on = t > DIVIDE + 5; r.scale.setScalar(0.6 + k * 9); r.material.opacity = on ? 0.8 * (1 - k) : 0; });
  if (mapPerson) { const lean = Math.sin(t * 1.4) * 0.04; mapPerson.root.rotation.z = lean; }
}
function mapCamera(t) {
  const whole = V3(0, 0, 25), WH = 2550, WZ = 1450; let pos, look, fov = 36;
  if (t < DIVIDE + 4.6) { const u = clamp((t - MAP) / (DIVIDE + 4.6 - MAP), 0, 1); look = whole.clone(); pos = V3(lerp(-120, 80, u), lerp(WH * 1.04, WH * 0.96, u), WZ + 25); }
  else { const u = ease((t - (DIVIDE + 4.6)) / 3.0); const h = Math.exp(lerp(Math.log(WH * 0.96), Math.log(7), u)); look = whole.clone().lerp(FOCUS.clone().add(V3(-1.0, -0.4, 0)), 1 - (h - 7) / (WH * 0.96 - 7)); pos = look.clone().add(V3(lerp(80, 3, u), h, h * lerp(WZ / WH, 1.25, u))); }
  mapCam.fov = fov; mapCam.position.copy(pos); mapCam.up.set(0, 1, 0); mapCam.lookAt(look);
}
