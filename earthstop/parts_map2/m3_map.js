// =================== MAP v3 (Nov 10 2026, her note: Geolyth's picture is much better) = map v2 + NASA Blue Marble satellite colour, punchier grade, glossy raised regions ===================
// textures: data/sat_world.jpg, data/sat_us.jpg, data/sat_ak.jpg (tools/sat_tex.py; NASA Blue Marble Next Generation, public domain)
// = parts_day/y_map.js + crisp VECTOR borders (LineSegments2, pixel width), per-pixel normals with fine detail noise, finer relief:
//   US plane data/us_dem2.png (z6, 0.02°), Alaska patch data/ak_dem.png (z6, 0.02°) — both from tools/patch_dem.py.
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
// One coordinate system for both planes: x = (lon + 96)·cos38°·SC, z = (38 − lat)·SC  (1 unit ≈ 18.5 km north–south)
const SC = 6, CLAT = Math.cos(38 * Math.PI / 180);
const ll2xz = (lon, lat) => V3((lon + 96) * CLAT * SC, 0, (38 - lat) * SC);
const WB = { lon0: -180, lon1: 180, lat0: -60, lat1: 84, cw: 8192, ch: 3277 };            // world plane
const UB = { lon0: -132, lon1: -58, lat0: 13, lat1: 53, cw: 7400, ch: 4000 };              // detailed US plane (lower 48)
const AKB = { lon0: -172, lon1: -129, lat0: 51, lat1: 72, cw: 4300, ch: 2100 };            // detailed Alaska patch
const MAPSC = new THREE.Scene(); MAPSC.background = new THREE.Color('#07111d');
const mCam = new THREE.PerspectiveCamera(36, W / H, 0.5, 6000); MAPSC.add(mCam);
MAPSC.add(new THREE.HemisphereLight(0xb8c8e8, 0x182018, 0.9));
const sunM = new THREE.DirectionalLight(0xfff0dc, 2.4); sunM.position.set(-120, 160, -90); MAPSC.add(sunM);
// palette texture: row 0 = country colour (rgb, a = mix), row 1 = state colour, row 2 = lift (r = country, g = state, b = county), row 3 = county colour
// optional counties of ONE state on the US plane (id texture B channel): define `const COUNTY_FIPS = '48'` before this part
const PAL = new Float32Array(256 * 4 * 4), palTex = new THREE.DataTexture(PAL, 256, 4, THREE.RGBAFormat, THREE.FloatType); palTex.magFilter = palTex.minFilter = THREE.NearestFilter; palTex.needsUpdate = true;
const COUNTRIES = [], STATES = [], COUNTIES = [];   // { id, name, lon, lat }
const mapUni = { uSun: { value: V3(-0.55, 0.62, -0.55).normalize() }, uFade: { value: new THREE.Vector2(400, 900) }, uT: { value: 0 }, uCty: { value: 0 }, uDim: { value: 0 } };
function mapMaterial(B, dem, idTex, us, sat) {
  const dx = (B.lon1 - B.lon0) * CLAT * SC / dem.image.width, dz = (B.lat1 - B.lat0) * SC / dem.image.height;
  return new THREE.ShaderMaterial({ uniforms: { tDem: { value: dem }, tId: { value: idTex }, tPal: { value: palTex }, tSat: { value: sat }, uSun: mapUni.uSun, uFade: mapUni.uFade, uT: mapUni.uT, uCty: mapUni.uCty, uDim: mapUni.uDim,
      uE: { value: new THREE.Vector2(1 / dem.image.width, 1 / dem.image.height) }, uD: { value: new THREE.Vector2(dx, dz) }, uP: { value: new THREE.Vector2(1 / B.cw, 1 / B.ch) } }, fog: false,
    defines: us ? { US: 1 } : {},
    vertexShader: `uniform sampler2D tDem, tId, tPal; uniform vec2 uE, uD; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vHt, vDp;
      float hh(vec2 uv){ vec4 d = texture2D(tDem, uv);
      #ifdef US
        return d.r * d.r * 11.0;
      #else
        return d.r * d.r * 13.1 - d.g * d.g * 3.0;
      #endif
      }
      void main(){ vUv = uv; vec4 idc = texture2D(tId, uv); float cid = floor(idc.r * 255.0 + 0.5), sid = floor(idc.g * 255.0 + 0.5), kid = floor(idc.b * 255.0 + 0.5);
        float h = hh(uv); vN = vec3(0.0, 1.0, 0.0);
        vec4 lf = texture2D(tPal, vec2((sid > 0.5 ? sid : cid) / 256.0 + 0.5 / 256.0, 2.5 / 4.0)); float lift = sid > 0.5 ? lf.g : lf.r;
        if (kid > 0.5) lift += texture2D(tPal, vec2(kid / 256.0 + 0.5 / 256.0, 2.5 / 4.0)).b;
        vec4 d = texture2D(tDem, uv); vHt = d.r; vDp = d.g;
        vec3 p = position; p.y += h + lift;
      #ifndef US
        if (sid > 0.5 && uv.y > 0.5833) p.y -= 0.6;   // tuck the world's US (lower 48 + Alaska; not Hawaii) under the finer planes
      #endif
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tId, tPal, tDem, tSat; uniform vec3 uSun; uniform vec2 uFade, uP, uE, uD; uniform float uT, uCty, uDim; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vHt, vDp;
      float hh(vec2 uv){ vec4 d = texture2D(tDem, uv);
      #ifdef US
        return d.r * d.r * 11.0;
      #else
        return d.r * d.r * 13.1 - d.g * d.g * 3.0;
      #endif
      }
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ return 0.5 * vn(p) + 0.25 * vn(p * 2.03) + 0.125 * vn(p * 4.11) + 0.0625 * vn(p * 8.3); }
      vec3 ids(vec2 o){ vec4 c = texture2D(tId, vUv + o); return floor(c.rgb * 255.0 + 0.5); }
      float liftOf(vec3 c){ vec4 lf = texture2D(tPal, vec2((c.g > 0.5 ? c.g : c.r) / 256.0 + 0.5 / 256.0, 2.5 / 4.0)); float l = c.g > 0.5 ? lf.g : lf.r; if (c.b > 0.5) l += texture2D(tPal, vec2(c.b / 256.0 + 0.5 / 256.0, 2.5 / 4.0)).b; return l; }
      void main(){ vec3 id = ids(vec2(0.0)); float cid = id.x, sid = id.y, kid = id.z;
      #ifdef US
        if (sid < 0.5) discard;
      #endif
        float hx = hh(vUv + vec2(uE.x, 0.0)) - hh(vUv - vec2(uE.x, 0.0)), hz = hh(vUv - vec2(0.0, uE.y)) - hh(vUv + vec2(0.0, uE.y));
        vec3 n = vec3(-hx / (2.0 * uD.x), 1.0, -hz / (2.0 * uD.y));
        // fine detail when the camera is close (keeps close-ups from looking soft): fbm bumps scaled by relief and distance
        float dist0 = length(vW - cameraPosition), dk = 1.0 - smoothstep(30.0, 260.0, dist0);
        if (dk > 0.0) { vec2 q = vW.xz * 2.6; float e1 = fbm(q), ex = fbm(q + vec2(0.07, 0.0)), ez = fbm(q + vec2(0.0, 0.07)); float amp = dk * (0.15 + 1.2 * vHt) * 0.5; n.x -= (ex - e1) / 0.07 * amp * 0.25; n.z -= (ez - e1) / 0.07 * amp * 0.25; }
        n = normalize(n); float dif = max(dot(n, uSun), 0.0), sh = 0.3 + 1.05 * dif;
        float e = vHt; vec3 land = mix(vec3(0.24, 0.33, 0.18), vec3(0.40, 0.40, 0.24), smoothstep(0.06, 0.32, e)); land = mix(land, vec3(0.50, 0.40, 0.28), smoothstep(0.32, 0.55, e));
        land = mix(land, vec3(0.42, 0.33, 0.26), smoothstep(0.55, 0.75, e)); land = mix(land, vec3(0.86, 0.86, 0.88), smoothstep(0.78, 0.92, e));
        vec3 sat = texture2D(tSat, vUv).rgb; float lum = dot(sat, vec3(0.3, 0.59, 0.11)); sat = mix(vec3(lum), sat, 1.25); land = sat * 1.15;
        bool sea = cid < 0.5 && vHt < 0.03 && vDp > 0.0;
        vec3 col;
        if (sea) { float dp = vDp; col = mix(vec3(0.10, 0.30, 0.38), vec3(0.04, 0.12, 0.22), smoothstep(0.02, 0.3, dp)); col = mix(col, vec3(0.02, 0.06, 0.13), smoothstep(0.3, 0.8, dp)); col *= 0.55 + 0.6 * dif; }
        else { float sh2 = 0.22 + 1.35 * pow(dif, 1.15); col = land * sh2; }
        // v4: a darker, calmer background so the painted subject glows (mapUni.uDim 0..1)
        if (uDim > 0.0) { float lm = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, vec3(lm) * vec3(0.95, 0.97, 1.05), 0.5 * uDim) * (1.0 - 0.42 * uDim); }
        if (cid > 0.5 || sid > 0.5) { vec4 c = sid > 0.5 ? texture2D(tPal, vec2(sid / 256.0 + 0.5 / 256.0, 1.5 / 4.0)) : texture2D(tPal, vec2(cid / 256.0 + 0.5 / 256.0, 0.5 / 4.0));
          vec3 V = normalize(cameraPosition - vW), Hh = normalize(uSun + V); float spec = pow(max(dot(n, Hh), 0.0), 40.0) * 0.6;
          col = mix(col, c.rgb * (0.42 + 0.95 * dif) * 1.15 + spec, c.a); col += c.rgb * c.a * 0.12; }
        if (kid > 0.5) { vec4 c = texture2D(tPal, vec2(kid / 256.0 + 0.5 / 256.0, 3.5 / 4.0)); col = mix(col, c.rgb * (0.5 + 0.8 * dif), c.a); col += c.rgb * c.a * 0.1; }
        // borders: compare ids with the neighbours (states thin, countries brighter, coasts soft)
        vec3 a = ids(vec2(uP.x, 0.0)), b = ids(vec2(-uP.x, 0.0)), c2 = ids(vec2(0.0, uP.y)), d = ids(vec2(0.0, -uP.y)); bool kb = a.z != kid || b.z != kid || c2.z != kid || d.z != kid;
        bool cb = a.x != cid || b.x != cid || c2.x != cid || d.x != cid; bool sb = a.y != sid || b.y != sid || c2.y != sid || d.y != sid;
        bool coast = cb && (cid < 0.5 || a.x < 0.5 || b.x < 0.5 || c2.x < 0.5 || d.x < 0.5);
        if (coast) col = mix(col, vec3(0.75, 0.85, 0.9), 0.18);
        { float myL = liftOf(id); float sh3 = 0.0; for (int k = 1; k <= 4; k++) { vec2 o = normalize(vec2(uSun.x, -uSun.z)) * uP * (3.0 * float(k)); float l = liftOf(ids(o)); sh3 = max(sh3, smoothstep(0.25, 1.2, l - myL) * (1.0 - 0.18 * float(k))); } col *= 1.0 - 0.5 * sh3; }
        float dist = length(vW - cameraPosition); col = mix(col, vec3(0.027, 0.067, 0.114), clamp((dist - uFade.x) / (uFade.y - uFade.x), 0.0, 0.9));
        gl_FragColor = vec4(col, 1.0); }` }); }
function planeFor(B, mat, sx, sz) { const w = (B.lon1 - B.lon0) * CLAT * SC, d = (B.lat1 - B.lat0) * SC, c = ll2xz((B.lon0 + B.lon1) / 2, (B.lat0 + B.lat1) / 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, sx, sz).rotateX(-Math.PI / 2), mat); m.position.copy(c); m.frustumCulled = false; MAPSC.add(m); return m; }
function d3c(geom) { const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let best = null, ba = -1;
  for (const p of polys) { const r = p[0]; let a = 0, cx = 0, cy = 0; for (let i = 0; i < r.length - 1; i++) { const [x0, y0] = r[i], [x1, y1] = r[i + 1], k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k; } if (Math.abs(a) > ba) { ba = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; } } return best; }
function idCanvas(B, countries, states, usaId, counties = []) { const cv = document.createElement('canvas'); cv.width = B.cw; cv.height = B.ch; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, B.cw, B.ch);
  const P = ([lon, lat]) => [(lon - B.lon0) / (B.lon1 - B.lon0) * B.cw, (B.lat1 - lat) / (B.lat1 - B.lat0) * B.ch];
  const draw = (geom, col) => { g.fillStyle = col; g.beginPath(); const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) for (const ring of poly) { let px = null; ring.forEach((pt, i) => { let [lon, lat] = pt; if (px !== null && Math.abs(lon - px) > 180) lon += lon < px ? 360 : -360; px = lon; const [x, y] = P([lon, lat]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } g.fill('evenodd'); };
  countries.forEach(f => f.geometry && draw(f.geometry, `rgb(${f.cid},0,0)`)); states.forEach(f => draw(f.geometry, `rgb(${usaId},${f.sid},0)`)); counties.forEach(f => draw(f.geometry, `rgb(${usaId},${f.sid},${f.kid})`));
  const tx = new THREE.CanvasTexture(cv); tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.colorSpace = THREE.NoColorSpace; return tx; }
let worldMesh = null, usMesh = null, akMesh = null, WORLD_CV = null, HGT = () => 0; const BORDERS = {}, TOPO = {}, RIMS = {};
// a thick white rim around a raised state / country (built on first use); call rims(t) once per frame after painting
function rim(kind, name) { const key = kind + ':' + name; if (RIMS[key]) return RIMS[key]; const topo = kind === 'state' ? TOPO.us : TOPO.wd, obj = kind === 'state' ? topo.objects.states : topo.objects.countries;
  const g = obj.geometries.find(q => q.properties && q.properties.name === name); if (!g) return null; const l = TOPO.lines(topojson.mesh(topo, obj, (a, b) => a === g || b === g), 4.2, 0xffffff, 0, 1); l.renderOrder = 1.5; return (RIMS[key] = l); }
function rims(list) { for (const k in RIMS) RIMS[k].material.opacity = 0; for (const [kind, name, a] of list) { const l = rim(kind, name); if (l) l.material.opacity = a; } }
function countryAt(lon, lat) { const x = Math.floor((lon - WB.lon0) / (WB.lon1 - WB.lon0) * WB.cw), y = Math.floor((WB.lat1 - lat) / (WB.lat1 - WB.lat0) * WB.ch); const d = WORLD_CV.getContext("2d").getImageData(x, y, 1, 1).data; const c = COUNTRIES.find(q => q.id === d[0]); return c ? c.name : ""; }
const mapReady = (async () => {
  const [us, wd] = await Promise.all([fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()), fetch('node_modules/world-atlas/countries-50m.json').then(r => r.json())]);
  const cf = topojson.feature(wd, wd.objects.countries).features; cf.forEach((f, i) => { f.cid = i + 1; if (f.geometry) { const c = d3c(f.geometry); COUNTRIES.push({ id: f.cid, name: f.properties.name, lon: c[0], lat: c[1] }); } });
  const usa = cf.find(f => f.properties.name === 'United States of America');
  const sf = topojson.feature(us, us.objects.states).features; sf.forEach((f, i) => { f.sid = i + 1; const c = d3c(f.geometry); STATES.push({ id: f.sid, name: f.properties.name, lon: c[0], lat: c[1] }); });
  const L = new THREE.TextureLoader(); const [wdem, udem, adem, wsat, usat, asat] = await Promise.all([L.loadAsync('data/world_dem.png'), L.loadAsync('data/us_dem2.png'), L.loadAsync('data/ak_dem.png'), L.loadAsync('data/sat_world.jpg'), L.loadAsync('data/sat_us.jpg'), L.loadAsync('data/sat_ak.jpg')]);
  for (const t of [wsat, usat, asat]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; }
  for (const d of [wdem, udem, adem]) { d.colorSpace = THREE.NoColorSpace; d.minFilter = THREE.LinearFilter; d.generateMipmaps = false; }
  worldMesh = planeFor(WB, mapMaterial(WB, wdem, idCanvas(WB, cf, sf, usa.cid), false, wsat), 1500, 580);
  WORLD_CV = worldMesh.material.uniforms.tId.value.image;
  let kf = [];
  if (typeof COUNTY_FIPS === 'string') { const cj = await fetch('node_modules/us-atlas/counties-10m.json').then(r => r.json()); const st = sf.find(f => f.id === COUNTY_FIPS);
    kf = topojson.feature(cj, cj.objects.counties).features.filter(f => String(f.id).startsWith(COUNTY_FIPS)); kf.forEach((f, i) => { f.kid = i + 1; f.sid = st.sid; const c = d3c(f.geometry); COUNTIES.push({ id: f.kid, name: f.properties.name, fips: f.id, lon: c[0], lat: c[1] }); }); }
  usMesh = planeFor(UB, mapMaterial(UB, udem, idCanvas(UB, [], sf, usa.cid, kf), true, usat), 1100, 600); usMesh.position.y = 0.02;
  akMesh = planeFor(AKB, mapMaterial(AKB, adem, idCanvas(AKB, [], sf.filter(f => f.properties.name === 'Alaska'), usa.cid), true, asat), 700, 340); akMesh.position.y = 0.02;
  // ---- vector borders: heights sampled from the same DEMs; drawn after the terrain without depth test (props draw over them) ----
  const sampler = (img, B, k, sea) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    return (lon, lat) => { if (lon < B.lon0 || lon >= B.lon1 || lat <= B.lat0 || lat > B.lat1) return null; const x = Math.floor((lon - B.lon0) / (B.lon1 - B.lon0) * c.width), y = Math.floor((B.lat1 - lat) / (B.lat1 - B.lat0) * c.height); const r = d[(y * c.width + x) * 4] / 255; return r * r * k; }; };
  const hU = sampler(udem.image, UB, 11), hA = sampler(adem.image, AKB, 11), hW = sampler(wdem.image, WB, 13.1);
  HGT = (lon, lat) => hU(lon, lat) ?? hA(lon, lat) ?? hW(lon, lat) ?? 0;
  const segs = (mesh) => { const pos = []; for (const line of mesh.coordinates) { for (let i = 0; i < line.length - 1; i++) { let [a0, b0] = line[i], [a1, b1] = line[i + 1]; if (Math.abs(a1 - a0) > 180) continue;
        const n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, b1 - b0) / 0.05)); for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n; const p = [a0 + (a1 - a0) * u0, b0 + (b1 - b0) * u0], q = [a0 + (a1 - a0) * u1, b0 + (b1 - b0) * u1];
          const P = ll2xz(p[0], p[1]), Q = ll2xz(q[0], q[1]); pos.push(P.x, HGT(p[0], p[1]) + 0.3, P.z, Q.x, HGT(q[0], q[1]) + 0.3, Q.z); } } } return pos; };
  // the lines ride on the painted lift: the vertex shader looks up the ids around each vertex in the planes' id textures and adds the biggest lift
  const idU = usMesh.material.uniforms.tId.value, idA = akMesh.material.uniforms.tId.value, idW = worldMesh.material.uniforms.tId.value;
  const liftGLSL = `uniform sampler2D tIdU, tIdA, tIdW, tPal; uniform vec4 bU, bA, bW;
    float liftId(vec3 c){ vec4 lf = texture2D(tPal, vec2((c.g > 0.5 ? c.g : c.r) / 256.0 + 0.5 / 256.0, 2.5 / 4.0)); float l = c.g > 0.5 ? lf.g : lf.r; if (c.b > 0.5) l += texture2D(tPal, vec2(c.b / 256.0 + 0.5 / 256.0, 2.5 / 4.0)).b; return l; }
    float liftTex(sampler2D t, vec2 uv, vec2 px){ float m = 0.0; for (int i = 0; i < 5; i++) { vec2 o = i == 0 ? vec2(0.0) : i == 1 ? vec2(px.x, 0.0) : i == 2 ? vec2(-px.x, 0.0) : i == 3 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
      m = max(m, liftId(floor(texture2D(t, uv + o).rgb * 255.0 + 0.5))); } return m; }
    float liftAt(vec3 p){ float lon = p.x / ${(CLAT * SC).toFixed(6)} - 96.0, lat = 38.0 - p.z / ${SC.toFixed(1)};
      if (lon > bU.x && lon < bU.y && lat > bU.z && lat < bU.w) return liftTex(tIdU, vec2((lon - bU.x) / (bU.y - bU.x), (lat - bU.z) / (bU.w - bU.z)), vec2(2.0 / ${UB.cw}.0, 2.0 / ${UB.ch}.0));
      if (lon > bA.x && lon < bA.y && lat > bA.z && lat < bA.w) return liftTex(tIdA, vec2((lon - bA.x) / (bA.y - bA.x), (lat - bA.z) / (bA.w - bA.z)), vec2(2.0 / ${AKB.cw}.0, 2.0 / ${AKB.ch}.0));
      return liftTex(tIdW, vec2((lon - bW.x) / (bW.y - bW.x), (lat - bW.z) / (bW.w - bW.z)), vec2(2.0 / ${WB.cw}.0, 2.0 / ${WB.ch}.0)); }
`;
  const bv = B => new THREE.Vector4(B.lon0, B.lon1, B.lat0, B.lat1);
  const lines = (mesh, width, color, opacity, order) => { const g = new LineSegmentsGeometry(); g.setPositions(segs(mesh)); const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false, resolution: new THREE.Vector2(W, H) });
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, { tIdU: { value: idU }, tIdA: { value: idA }, tIdW: { value: idW }, tPal: { value: palTex }, bU: { value: bv(UB) }, bA: { value: bv(AKB) }, bW: { value: bv(WB) } });
      sh.vertexShader = sh.vertexShader.replace('void main() {', liftGLSL + '\nvoid main() {').replace('vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );', 'vec4 start = modelViewMatrix * vec4( instanceStart + vec3(0.0, liftAt(instanceStart), 0.0), 1.0 );')
        .replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );', 'vec4 end = modelViewMatrix * vec4( instanceEnd + vec3(0.0, liftAt(instanceEnd), 0.0), 1.0 );'); };
    m.customProgramCacheKey = () => 'lift-lines';
    const l = new LineSegments2(g, m); l.renderOrder = order; l.frustumCulled = false; MAPSC.add(l); return l; };
  TOPO.us = us; TOPO.wd = wd; TOPO.lines = lines;
  BORDERS.country = lines(topojson.mesh(wd, wd.objects.countries, (a, b) => a !== b), 2.4, 0xf4f1ea, 0.7, 1);
  BORDERS.state = lines(topojson.mesh(us, us.objects.states, (a, b) => a !== b), 1.8, 0xeef2fa, 0.55, 1);
  if (typeof COUNTY_FIPS === 'string') { const cj = await fetch('node_modules/us-atlas/counties-10m.json').then(r => r.json()); const geos = { type: 'GeometryCollection', geometries: cj.objects.counties.geometries.filter(g => String(g.id).startsWith(COUNTY_FIPS)) };
    BORDERS.county = lines(topojson.mesh(cj, geos, (a, b) => a !== b), 1.1, 0xeef2fa, 0, 1); }
  for (const m of [worldMesh, usMesh, akMesh]) m.renderOrder = 0; })();
function orderProps() { const base = [worldMesh, usMesh, akMesh]; MAPSC.traverse(o => { if (o.isMesh && !base.includes(o) && !o.isLineSegments2) o.renderOrder = 2; }); }
const CT = name => COUNTRIES.find(s => s.name === name), ST = name => STATES.find(s => s.name === name);
const llPos = (lon, lat, y = 0) => ll2xz(lon, lat).setY(y);
const stPos = (name, y = 4) => { const s = ST(name); return ll2xz(s.lon, s.lat).setY(y); };
const ctPos = (name, y = 4) => { const s = CT(name); return ll2xz(s.lon, s.lat).setY(y); };
function paintRow(row, id, hex, a, lift) { const c = new THREE.Color(hex), o = (row * 256 + id) * 4; PAL[o] = c.r; PAL[o + 1] = c.g; PAL[o + 2] = c.b; PAL[o + 3] = a; const l = (2 * 256 + id) * 4; PAL[l + (row === 0 ? 0 : row === 1 ? 1 : 2)] = lift; }
const CY = name => COUNTIES.find(s => s.name === name);
const cyPos = (name, y = 4) => { const s = CY(name); return ll2xz(s.lon, s.lat).setY(y); };
function paintCounty(name, hex, a, lift = 0) { const s = CY(name); if (s) paintRow(3, s.id, hex, a, lift); }
function paintState(name, hex, a, lift = 0) { const s = ST(name); if (s) paintRow(1, s.id, hex, a, lift); }
function paintCountry(name, hex, a, lift = 0) { const s = CT(name); if (s) paintRow(0, s.id, hex, a, lift); }
function clearPaint() { PAL.fill(0); }
// ---- low-poly landmarks / props ----
const WM = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.55, flatShading: true });
function whiteHouse() { const g = new THREE.Group(); const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, WM); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(8, 2.2, 3), 0, 1.1, 0); add(new THREE.BoxGeometry(8.4, 0.25, 3.3), 0, 2.3, 0); add(new THREE.BoxGeometry(3.2, 0.6, 3.6), 0, 2.6, 0);
  for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 8), -1.25 + k * 0.5, 1.1, 1.85); add(new THREE.CylinderGeometry(1.6, 1.6, 0.3, 16, 1, false, 0, Math.PI), 0, 2.35, 1.6).rotation.y = -Math.PI / 2;
  add(new THREE.BoxGeometry(2.6, 0.2, 2.6), 0, 0.1, 3.4); const fl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.04), new THREE.MeshStandardMaterial({ color: '#c8303a' })); fl.position.set(0, 3.9, 0); g.add(fl); add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), -0.45, 3.5, 0);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(4, 1.2, 1.6), sx * 6, 0.6, -0.2); return g; }
const WH = whiteHouse(); WH.visible = false; MAPSC.add(WH);
const DOJ = (() => { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#d9d2c2', roughness: 0.6, flatShading: true }); const b = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 3.5), m); b.position.y = 1.2; g.add(b);
  for (let k = 0; k < 8; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.4, 8), m); c.position.set(-2.8 + k * 0.8, 1.2, 1.9); g.add(c); } const r = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.4, 3.9), m); r.position.y = 2.6; g.add(r); g.visible = false; MAPSC.add(g); return g; })();
// Cybertruck-like wedge pickup (generic, no logo) and a small rounded robotaxi pod
const TRUCK = (() => { const g = new THREE.Group(); const s = new THREE.Shape(); s.moveTo(-2.6, 0.35); s.lineTo(2.6, 0.35); s.lineTo(2.6, 1.0); s.lineTo(0.2, 1.75); s.lineTo(-2.6, 1.05); s.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 2.0, bevelEnabled: false }).translate(0, 0, -1.0), new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.75, roughness: 0.32, flatShading: true })); g.add(body);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 1.7), new THREE.MeshStandardMaterial({ color: '#10141a', roughness: 0.2 })); gl.position.set(0.9, 1.38, 0); gl.rotation.z = -0.29; g.add(gl);
  for (const x of [-1.7, 1.7]) for (const z of [-1.0, 1.0]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1a1a1e' })); w.position.set(x, 0.45, z); g.add(w); }
  const lb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.9), new THREE.MeshBasicMaterial({ color: '#ffffff' })); lb.position.set(-2.62, 1.0, 0); g.add(lb); g.visible = false; MAPSC.add(g); return g; })();
const POD = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.0, 6, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8dce2', metalness: 0.5, roughness: 0.3 })); b.position.y = 1.0; b.scale.set(1, 0.85, 0.9); g.add(b);
  const wdw = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.4, 6, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0e1218', roughness: 0.15 })); wdw.position.set(0.1, 1.25, 0); wdw.scale.set(1, 0.7, 0.95); g.add(wdw); g.visible = false; MAPSC.add(g); return g; })();
// map pins: a glowing disc + a ring pulse + a stick with a ball
const PINS = [];
function makePin(col) { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: col }); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10), m); ball.position.y = 3.2; g.add(ball);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); st.position.y = 1.6; g.add(st);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false })); ring.position.y = 0.3; g.add(ring); g.userData.ring = ring; g.visible = false; MAPSC.add(g); PINS.push(g); return g; }
// 3D bars (base at y = 0)
const BARS = [];
function makeBar(col) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 })); m.visible = false; MAPSC.add(m); BARS.push(m); return m; }
// flight arcs: a tube along a raised great-circle-ish curve, revealed by drawRange
function makeArc(a, b, hgt, col) { const mid = a.clone().lerp(b, 0.5).setY(hgt); const cur = new THREE.QuadraticBezierCurve3(a, mid, b); const geo = new THREE.TubeGeometry(cur, 120, 0.45, 8, false);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col })); m.visible = false; m.userData.n = geo.index.count; MAPSC.add(m); m.userData.cur = cur; return m; }
function arcShow(m, k) { m.visible = k > 0.001; m.geometry.setDrawRange(0, Math.floor(m.userData.n * clamp(k, 0, 1) / 6) * 6); }
