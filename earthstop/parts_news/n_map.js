// =================== THE 3D RELIEF MAP OF THE US ===================
const LON0 = -132, LON1 = -58, LAT0 = 13, LAT1 = 53, SC = 6, CLAT = Math.cos(38 * Math.PI / 180);
const ll2xz = (lon, lat) => V3((lon + 96) * CLAT * SC, 0, (38 - lat) * SC);
const MW = (LON1 - LON0) * CLAT * SC, MD = (LAT1 - LAT0) * SC, MCX = ((LON0 + LON1) / 2 + 96) * CLAT * SC, MCZ = (38 - (LAT0 + LAT1) / 2) * SC;
const MAPSC = new THREE.Scene(); MAPSC.background = new THREE.Color('#0b0f16'); MAPSC.fog = new THREE.Fog('#0b0f16', 220, 520);
const mCam = new THREE.PerspectiveCamera(34, W / H, 0.5, 3000); MAPSC.add(mCam);
const hemiM = new THREE.HemisphereLight(0x9ab0d8, 0x101418, 0.5); MAPSC.add(hemiM);
const sunM = new THREE.DirectionalLight(0xfff0dc, 2.2); sunM.position.set(-120, 140, -90); MAPSC.add(sunM);
const STATES = [];   // { id, name, fips, lon, lat }  index+1 = id in the id texture
const ST_COL = Array.from({ length: 64 }, () => new THREE.Vector4(0, 0, 0, 0)), ST_LIFT = new Float32Array(64);
const mapU = { tDem: { value: null }, tId: { value: null }, uCol: { value: ST_COL }, uLift: { value: ST_LIFT }, uH: { value: 11 }, uSun: { value: V3(-0.55, 0.62, -0.55).normalize() }, uT: { value: 0 }, uGlobal: { value: 0 } };
const mapMat = new THREE.ShaderMaterial({ uniforms: mapU, fog: false,
  vertexShader: `uniform sampler2D tDem, tId; uniform float uH, uLift[64]; varying vec2 vUv; varying vec3 vN; varying float vId; varying vec3 vW; varying float vHt;
    float hh(vec2 uv){ float v = texture2D(tDem, uv).r; return v * v * uH; }
    void main(){ vUv = uv; vec2 tuv = vec2(uv.x, uv.y); float id = floor(texture2D(tId, tuv).r * 255.0 + 0.5); vId = id;
      float e = 1.0 / 1850.0, f = 1.0 / 1000.0; float h = hh(tuv), hx = hh(tuv + vec2(e, 0.0)) - hh(tuv - vec2(e, 0.0)), hz = hh(tuv + vec2(0.0, f)) - hh(tuv - vec2(0.0, f));
      vN = normalize(vec3(-hx / (2.0 * ${(74 * 0.788 * 6 / 1850).toFixed(5)}), 1.0, hz / (2.0 * ${(40 * 6 / 1000).toFixed(5)})));
      float lift = 0.0; if (id > 0.5 && id < 63.5) lift = uLift[int(id)];
      vHt = texture2D(tDem, tuv).r; vec3 p = position; p.y += h + lift; vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tId; uniform vec4 uCol[64]; uniform vec3 uSun; uniform float uT, uGlobal; varying vec2 vUv; varying vec3 vN; varying float vId; varying vec3 vW; varying float vHt;
    float idAt(vec2 o){ return floor(texture2D(tId, vUv + o).r * 255.0 + 0.5); }
    void main(){ float id = idAt(vec2(0.0)); vec3 n = normalize(vN); float dif = max(dot(n, uSun), 0.0), sh = 0.25 + 1.1 * dif;
      // natural hypsometric tint (muted): green lowlands → olive plains → tan uplands → brown mountains → pale peaks
      float e = vHt; vec3 land = mix(vec3(0.20, 0.27, 0.16), vec3(0.33, 0.33, 0.20), smoothstep(0.08, 0.35, e)); land = mix(land, vec3(0.42, 0.34, 0.24), smoothstep(0.35, 0.6, e)); land = mix(land, vec3(0.36, 0.28, 0.22), smoothstep(0.6, 0.8, e)); land = mix(land, vec3(0.62, 0.6, 0.58), smoothstep(0.82, 0.95, e));
      land = mix(vec3(dot(land, vec3(0.3, 0.59, 0.11))), land, 0.75);
      vec3 base = id < 0.5 ? vec3(0.03, 0.05, 0.08) : id > 254.5 ? land * 0.55 : land;
      vec3 col = base * sh;
      if (id > 0.5 && id < 63.5) { vec4 c = uCol[int(id)]; col = mix(col, c.rgb * (0.55 + 0.75 * dif), c.a); col += c.rgb * c.a * 0.12; }
      // borders: state lines (thin, light), the coast (brighter)
      vec2 px = vec2(1.0 / 3700.0, 1.0 / 2000.0); float a = idAt(vec2(px.x, 0.0)), b = idAt(vec2(-px.x, 0.0)), c2 = idAt(vec2(0.0, px.y)), d = idAt(vec2(0.0, -px.y));
      float edge = (a != id || b != id || c2 != id || d != id) ? 1.0 : 0.0; bool usEdge = (id > 0.5 && id < 63.5) || (a > 0.5 && a < 63.5) || (c2 > 0.5 && c2 < 63.5);
      if (edge > 0.5) col = mix(col, usEdge ? vec3(0.9, 0.92, 0.96) : vec3(0.35, 0.4, 0.5), usEdge ? 0.55 : 0.4);
      float dist = length(vW - cameraPosition); col = mix(col, vec3(0.043, 0.059, 0.086), clamp((dist - 260.0) / 320.0, 0.0, 0.85)); float ef = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y); if (!(id > 0.5 && id < 63.5)) col = mix(vec3(0.035, 0.05, 0.075), col, ef);
      gl_FragColor = vec4(col, 1.0); }` });
const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(MW, MD, 740, 400).rotateX(-Math.PI / 2), mapMat); mapMesh.position.set(MCX, 0, MCZ); mapMesh.frustumCulled = false; MAPSC.add(mapMesh);
// the sea: a dark glossy plane just under the land with a faint grid
{ const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: {}, fog: false, vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; void main(){ vec2 g = abs(fract(vW.xz / ${SC * 5}.0) - 0.5); float l = smoothstep(0.49, 0.5, max(g.x, g.y)); float dist = length(vW - cameraPosition);
      vec3 c = mix(vec3(0.035, 0.055, 0.085), vec3(0.06, 0.09, 0.13), l * 0.5); c = mix(c, vec3(0.043, 0.059, 0.086), clamp((dist - 200.0) / 300.0, 0.0, 0.9)); gl_FragColor = vec4(c, 1.0); }` })); sea.position.y = 0.02; MAPSC.add(sea); }
// build the id texture + state list from us-atlas / world-atlas (lon/lat), and load the DEM
const mapReady = (async () => {
  const [us, wd] = await Promise.all([fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()), fetch('node_modules/world-atlas/land-50m.json').then(r => r.json())]);
  const cv = document.createElement('canvas'); cv.width = 3700; cv.height = 2000; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  const P = ([lon, lat]) => [(lon - LON0) / (LON1 - LON0) * cv.width, (LAT1 - lat) / (LAT1 - LAT0) * cv.height];
  const draw = (geom, col) => { g.fillStyle = col; g.beginPath(); const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; for (const poly of polys) for (const ring of poly) { ring.forEach((pt, i) => { const [x, y] = P(pt); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } g.fill('evenodd'); };
  const land = topojson.feature(wd, wd.objects.land); for (const f of land.features || [land]) draw(f.geometry || f, 'rgb(255,0,0)');
  const st = topojson.feature(us, us.objects.states).features;
  st.forEach((f, i) => { const id = i + 1; draw(f.geometry, `rgb(${id},0,0)`); const c = d3c(f); STATES.push({ id, name: f.properties.name, fips: f.id, lon: c[0], lat: c[1] }); });
  const tId = new THREE.CanvasTexture(cv); tId.magFilter = tId.minFilter = THREE.NearestFilter; tId.generateMipmaps = false; tId.colorSpace = THREE.NoColorSpace; tId.flipY = true; mapU.tId.value = tId;
  const dem = await new THREE.TextureLoader().loadAsync('data/us_dem.png'); dem.colorSpace = THREE.NoColorSpace; dem.minFilter = THREE.LinearFilter; dem.generateMipmaps = false; mapU.tDem.value = dem; })();
// a simple area-weighted centroid of the biggest polygon (lon/lat), enough to anchor labels and cameras
function d3c(f) { const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = -1;
  for (const p of polys) { const r = p[0]; let a = 0, cx = 0, cy = 0; for (let i = 0; i < r.length - 1; i++) { const [x0, y0] = r[i], [x1, y1] = r[i + 1], k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k; } if (Math.abs(a) > ba) { ba = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; } } return best; }
const ST = name => STATES.find(s => s.name === name);
const stPos = (name, y = 4) => { const s = ST(name); return ll2xz(s.lon, s.lat).setY(y); };
function paint(name, hex, a, lift = 0) { const s = ST(name); if (!s) return; const c = new THREE.Color(hex); ST_COL[s.id].set(c.r, c.g, c.b, a); ST_LIFT[s.id] = lift; }
function clearPaint() { ST_COL.forEach(v => v.set(0, 0, 0, 0)); ST_LIFT.fill(0); }
// ---- Alaska inset (flat, lower left in the Pacific) ----
const AK = { mat: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: new THREE.Color(0.4, 0.42, 0.38) }), mesh: null };
const akReady = mapReady.then(async () => { const us = await fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()); const f = topojson.feature(us, us.objects.states).features.find(q => q.properties.name === 'Alaska');
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640; const g = cv.getContext('2d'); g.clearRect(0, 0, 1024, 640); g.fillStyle = '#fff';
  const P = ([lon, lat]) => { if (lon > 0) lon -= 360; return [(lon + 172) / 44 * 1024, (72 - lat) / 21 * 640]; }; g.beginPath();
  for (const poly of f.geometry.coordinates) for (const ring of poly) { ring.forEach((pt, i) => { const [x, y] = P(pt); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } g.fill('evenodd');
  const tx = new THREE.CanvasTexture(cv); AK.mat.map = tx; AK.mat.needsUpdate = true; const w = 44 * Math.cos(62 * Math.PI / 180) * SC * 0.55, d = 21 * SC * 0.55;
  AK.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), AK.mat); AK.mesh.position.copy(ll2xz(-114, 20.5)).setY(0.6); MAPSC.add(AK.mesh);
  const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w * 1.08, d * 1.1).rotateX(-Math.PI / 2)), new THREE.LineBasicMaterial({ color: '#5a6478' })); fr.position.copy(AK.mesh.position); MAPSC.add(fr); });
const akPos = () => AK.mesh ? AK.mesh.position.clone().setY(4) : ll2xz(-114, 20.5).setY(4);
// ---- the Capitol (white, low-poly) on Washington, D.C. ----
const CAP = new THREE.Group(); MAPSC.add(CAP);
{ const wm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.5, flatShading: true });
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, wm); m.position.set(x, y, z); CAP.add(m); return m; };
  add(new THREE.BoxGeometry(9, 1.6, 2.4), 0, 0.8, 0); add(new THREE.BoxGeometry(3, 2.2, 2.8), 0, 1.1, 0); add(new THREE.CylinderGeometry(1.3, 1.4, 1.6, 16), 0, 2.9, 0);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), Math.cos(a) * 1.45, 2.8, Math.sin(a) * 1.45); }
  add(new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.6, 0).scale.y = 1.25; add(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10), 0, 5.4, 0); add(new THREE.SphereGeometry(0.16, 8, 6), 0, 6.0, 0);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), sx * (1.8 + k * 0.5), 0.9, 1.25); CAP.visible = false; }
