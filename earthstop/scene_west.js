import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if the Sun rose in the West?" — classic series low-poly; a NYC street at a west-side sunrise, then one continuous flight around a globe that spins backwards.
// Facts: MPI-M retrograde-Earth run (Mikolajewicz et al. 2018, ESD 9:1191; Eos 2018): southern US/Brazil/Argentina dry out, Sahara + Arabia green, desert area -11 M km^2,
// AMOC moves to the North Pacific, western Europe much colder, US Atlantic coast milder, Indian Ocean cyanobacteria; Coriolis reversed -> NH cyclones clockwise.
// Rotation speeds / launch boost: tools/west_math.py. Manhattanhenge: grid ~29 deg off north, sunsets along the streets late May / mid July.
// =================== timeline ===================
const CRANE = 4.2, SPIN = 6.0, ZONES = 10.5, WINDS = 16.0, HURR = 23.0, DRY = 28.0, EURO = 36.0, SAHARA = 43.0, INDIAN = 49.0, ROCKET = 54.0, T_END = 60.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 1811;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const wrapR = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));
const fadeWin = (t, a, b, f = 0.35) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = n => Math.round(n).toLocaleString('en-US');
// =================== renderer ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
// every scene renders into a linear HDR target; one full-screen pass tone-maps both and dissolves between them
const RTA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }), RTB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    void main(){ vec3 a=aces(texture2D(tA,vUv).rgb*uExpA); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,vUv).rgb*uExpB); c=mix(a,b,uMix); } gl_FragColor=vec4(srgb(c),1.0); }` });
const compScene = new THREE.Scene(), compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); compScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat));
function shootTo(rt, scene, camera) { camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera); }
function composite(mix, expA, expB) { const u = compMat.uniforms; u.uMix.value = mix; u.uExpA.value = expA; u.uExpB.value = expB; renderer.setRenderTarget(null); renderer.render(compScene, compCam); }
// =================== materials / builders ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }
function bx(w, h, d, col, x, y, z, parent, opts = {}) { const m = mesh(BOX, typeof col === 'string' ? M(col, { flatShading: true, ...opts }) : col); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function grp(x, y, z, ry, parent) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
// =================== smoke (cold-gas plumes): one Points cloud per scene, rebuilt every frame from emitters ===================
const smokeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uScale: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `attribute float aSize; attribute float aA; uniform float uScale; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(aSize*uScale/(-mv.z), 700.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uTint; varying float vA; void main(){ vec2 q=gl_PointCoord-0.5; float d=dot(q,q)*4.0; float a=exp(-d*3.0)*vA; if(a<0.01) discard; gl_FragColor=vec4(uTint*(0.9+0.1*(1.0-d)),a); }` });
function makeSmoke(scene, n) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3), sz = new Float32Array(n), al = new Float32Array(n);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(al, 1));
  const pts = new THREE.Points(geo, smokeMat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  let k = 0;
  return { begin() { k = 0; }, add(p, size, a) { if (k >= n) return; pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; sz[k] = size; al[k] = a; k++; },
    end() { for (let i = k; i < n; i++) al[i] = 0; geo.attributes.position.needsUpdate = true; geo.attributes.aSize.needsUpdate = true; geo.attributes.aA.needsUpdate = true; geo.setDrawRange(0, Math.max(1, k)); } };
}
// =================== STREET (meters): 42nd St looking WEST toward New Jersey — the Sun comes up at the end of the street ===================
const street = new THREE.Scene(); const sCam = new THREE.PerspectiveCamera(58, W / H, 0.1, 9000);
const SUNS = t => { const e = lerp(0.016, 0.06, smooth(0, CRANE + 1.5, t)); return V3(0.035, Math.sin(e), -Math.cos(e)).normalize(); };   // west = -z
// sky: warm horizon around the Sun, pink -> deep blue overhead, east side still night-ish
const skyMatS = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: V3(0, 0, -1) }, uK: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uSun; uniform float uK; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float h = d.y; float s = max(dot(d, uSun), 0.0);
      vec3 zen = mix(vec3(0.05,0.07,0.18), vec3(0.16,0.28,0.55), uK), mid = mix(vec3(0.42,0.30,0.45), vec3(0.62,0.52,0.62), uK), hor = mix(vec3(1.1,0.5,0.22), vec3(1.4,0.75,0.4), uK);
      vec3 c = mix(mid, zen, smoothstep(0.02, 0.55, h)); c = mix(c, hor, exp(-max(h, 0.0) * 9.0) * (0.35 + 0.65 * pow(s, 3.0)));
      c += vec3(1.6,0.9,0.45) * pow(s, 40.0) * 1.2 + vec3(5.0,3.6,2.2) * pow(s, 1800.0) * 6.0;
      if (h < 0.0) c = mix(c, vec3(0.2,0.14,0.16), smoothstep(0.0, -0.05, h));
      gl_FragColor = vec4(c, 1.0); }` });
const skyS = new THREE.Mesh(new THREE.SphereGeometry(8000, 48, 24), skyMatS); skyS.frustumCulled = false; skyS.renderOrder = -10; street.add(skyS);
const hemiS = new THREE.HemisphereLight(0xd8b8d0, 0x6a5048, 1.6); street.add(hemiS);
const sunS = new THREE.DirectionalLight(0xffb070, 3.4); sunS.castShadow = true; sunS.shadow.mapSize.set(2048, 2048);
Object.assign(sunS.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 1600 }); sunS.shadow.bias = -0.0005; street.add(sunS, sunS.target);
street.fog = new THREE.Fog(0xd89878, 300, 2400);
// ground: asphalt, crosswalks, lane lines, sidewalks
{ const asphalt = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#3a3a3e'; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, ['#444448', '#323236', '#4a4a4e']); g.fillStyle = '#d8c070'; g.fillRect(w / 2 - 3, 0, 6, h); }, [1, 60]);
  const road = mesh(new THREE.PlaneGeometry(18, 1800), M('#ffffff', { map: asphalt, roughness: 0.6, metalness: 0.1 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -850); street.add(road);
  for (const sx of [-1, 1]) { const sw = mesh(BOX, M('#9a948a', { roughness: 0.9 }), false, true); sw.scale.set(6, 0.18, 1800); sw.position.set(sx * 12, 0.09, -850); street.add(sw); }
  for (let z = -60; z > -800; z -= 80) for (let k = -4; k <= 4; k++) { const st = mesh(BOX, M('#e8e4da'), false, true); st.scale.set(0.9, 0.02, 4); st.position.set(k * 2, 0.01, z); street.add(st); } }
// buildings: two canyon walls of towers with window textures (some windows lit), mix of brick / limestone / glass
const facTex = [];
for (const [base, win, lit] of [['#8a5a46', '#2a2f3a', '#ffcf8a'], ['#c9bca4', '#2c3440', '#ffd89a'], ['#5a6e86', '#1e2a3a', '#fff0c0'], ['#a89a86', '#323844', '#ffc880'], ['#6e5048', '#252a34', '#ffd090']]) {
  const tx = canvasTex(128, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); speckle(g, w, h, 300, [base, '#00000022', '#ffffff18']); for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) { g.fillStyle = rnd() < 0.18 ? lit : win; g.fillRect(x, y, 9, 10); } }, null);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping; facTex.push(new THREE.MeshStandardMaterial({ map: tx, roughness: 0.75, metalness: 0.05 })); }
function tower(x, z, w, d, h, mi) { const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 8, uv.getY(i) * h / 16);
  const m = new THREE.Mesh(geo, facTex[mi]); m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; street.add(m);
  if (h > 90 && rnd() < 0.5) { const top = mesh(BOX, M('#7a7468', { roughness: 0.6 })); top.scale.set(w * 0.6, h * 0.08, d * 0.6); top.position.set(x, h + h * 0.04, z); street.add(top); if (rnd() < 0.5) { const sp = mesh(new THREE.ConeGeometry(w * 0.12, h * 0.25, 6), M('#b8b0a0', { metalness: 0.4 })); sp.position.set(x, h * 1.2, z); street.add(sp); } } }
for (const sx of [-1, 1]) { let z = 30; while (z > -780) { const w = R(16, 34), d = R(18, 40), h = z > -250 ? R(40, 230) : R(30, 140); tower(sx * (15 + d / 2), z - w / 2, d, w, h, Math.floor(rnd() * facTex.length)); z -= w + R(0.5, 3); } }
// New Jersey across the Hudson: low dark skyline + water that catches the sunrise
{ const water = mesh(new THREE.PlaneGeometry(4000, 900), M('#5a4a58', { roughness: 0.15, metalness: 0.6 }), false, true); water.rotation.x = -Math.PI / 2; water.position.set(0, -0.5, -1250); street.add(water);
  for (let i = 0; i < 70; i++) { const b = mesh(BOX, M('#3a3040', { roughness: 1 }), false, false); const h = R(6, 26); b.scale.set(R(15, 60), h, R(15, 40)); b.position.set(R(-1400, 1400), h / 2, R(-1750, -2300)); street.add(b); } }
// details: street lamps, traffic lights, taxis, people looking at the Sun, steam from a manhole
for (let z = -10; z > -760; z -= 38) for (const sx of [-1, 1]) { bx(0.18, 7, 0.18, '#2e3236', sx * 9.6, 3.5, z, street); bx(1.6, 0.14, 0.14, '#2e3236', sx * 8.9, 7, z, street); }
const TAXI = []; for (let i = 0; i < 26; i++) { const g = new THREE.Group(); bx(1.9, 0.8, 4.4, '#f2c21a', 0, 0.6, 0, g); bx(1.7, 0.6, 2.2, '#2a2e36', 0, 1.25, -0.2, g, { roughness: 0.2, metalness: 0.4 }); bx(0.5, 0.18, 0.25, '#f8f4e0', 0, 1.62, -0.2, g);
  for (const wx of [-0.95, 0.95]) for (const wz of [-1.4, 1.4]) { const wh = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 10), M('#1a1a1a')); wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.34, wz); g.add(wh); }
  street.add(g); TAXI.push({ g, lane: pick([-6.5, -2.5, 2.5, 6.5]), z0: R(-700, 40), v: R(4, 9) }); }
const CROWD = []; for (let i = 0; i < 46; i++) { const p = makePerson(rnd); const sx = pick([-1, 1]); p.outer.position.set(sx * R(10, 14), 0.95 + 0.18, R(-140, 18)); street.add(p.outer);
  CROWD.push({ p, stop: rnd() < 0.7, point: rnd() < 0.3, ph: R(0, 6), z0: p.outer.position.z, v: R(0.9, 1.5) * pick([-1, 1]) }); }
const steamS = makeSmoke(street, 400);
function updateStreet(t) { const sd = SUNS(t); skyMatS.uniforms.uSun.value.copy(sd); skyMatS.uniforms.uK.value = smooth(0, CRANE + 2, t);
  sunS.position.copy(sCam.position).addScaledVector(sd, 800); sunS.target.position.copy(sCam.position).add(V3(0, 0, -40)); sunS.intensity = lerp(1.2, 3.6, smooth(0.3, 3.5, t));
  for (const T of TAXI) { let z = T.z0 - T.v * t * (T.lane > 0 ? -1 : 1); z = wrapR(z, -760, 40); T.g.position.set(T.lane, 0, z); T.g.rotation.y = T.lane > 0 ? Math.PI : 0; }
  for (const C of CROWD) { const look = smooth(0.6 + C.ph * 0.15, 1.6 + C.ph * 0.15, t) * (C.stop ? 1 : 0);
    C.p.outer.position.z = C.z0 + C.v * (1 - look) * Math.min(t, 6); C.p.outer.rotation.y = lerp(C.v > 0 ? 0 : Math.PI, Math.PI, look);
    if (look > 0.5) { poseIdle(C.p, t, C.ph); if (C.point) { C.p.arms[1].rotation.x = -2.3 * smooth(0, 1, look * 2 - 1); C.p.elbows[1].rotation.x = -0.3; } } else poseWalk(C.p, t * 6 * Math.abs(C.v) + C.ph, 1); }
  steamS.begin(); smokeMat.uniforms.uTint.value.set('#e8d8d0'); for (let k = 0; k < 60; k++) { const age = (t * 0.45 + k / 60) % 1; _sp.set(-5.5 + Math.sin(k * 3.1) * 0.8 * age, 0.2 + age * 6, -46 + Math.cos(k * 1.7) * 0.8 * age); steamS.add(_sp, 0.6 + age * 3.0, 0.16 * (1 - age) * smooth(0, 0.15, age)); } steamS.end(); }
const _sp = new THREE.Vector3();
function streetCamera(t) { const crane = ease(clamp((t - CRANE) / 2.2, 0, 1));
  const p = V3(2.2 + 0.15 * Math.sin(t * 0.7), 1.7 + 0.05 * Math.sin(t * 1.9), 14 - 4.5 * t).lerp(V3(0, 420, -60 - 120 * crane), crane);
  const look = V3(0, 9 + 4 * t, -900).lerp(V3(0, 0, -520), Math.pow(crane, 1.4)); sCam.position.copy(p); sCam.lookAt(look); sCam.fov = lerp(56, 66, crane); }
// =================== GLOBE (units: Earth radius 10): spins BACKWARDS; regions recolour with the MPI model results ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#03040a'); const gCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 5000);
const ER = 10; const earthG = new THREE.Group(); space.add(earthG);
const ll = (lat, lon, r = ER) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(r); };
space.add(new THREE.AmbientLight(0x404a66, 0.35)); const gSun = new THREE.DirectionalLight(0xfff4e6, 3.0); space.add(gSun, gSun.target);
{ const n = 4000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color(); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(2500); pos.set([v.x, v.y, v.z], i * 3); c.set(pick(['#ffffff', '#cfe0ff', '#ffe6c0'])).multiplyScalar(R(0.4, 1.6)); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true }))); }
// regions that change colour (weights animated in updateGlobe)
const REG = { sus: { w: 0, idx: [] }, sah: { w: 0, idx: [] }, eur: { w: 0, idx: [] }, ind: { w: 0, idx: [] } };
let earthGeo = null, baseCol = null, altCol = null, thrArr = null; const cityPts = [];
const vn2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, h = (a, b) => hash(a * 57.1 + b * 113.7), s = k => k * k * (3 - 2 * k); return lerp(lerp(h(xi, yi), h(xi + 1, yi), s(xf)), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), s(xf)), s(yf)); };
// spread order inside each region (0 = first to change); edges stay > 1 so the region boundary is organic, not a box
const edgeT = (lat, lon, la0, la1, lo0, lo1) => { const e = Math.min(lat - la0, la1 - lat, (lon - lo0) * Math.cos(lat * Math.PI / 180), (lo1 - lon) * Math.cos(lat * Math.PI / 180)); return clamp(1.65 - e / 4.5, 0, 1.7); };   // ~0 deep inside, > 1.35 within ~1.5 deg of the box edge
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json();
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  for (const f of topojson.feature(topo, topo.objects.countries).features) { if (!f.geometry) continue; const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } } }
  const img = g.getImageData(0, 0, MW, MH).data; const land = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 72); const p = geo.attributes.position; baseCol = new Float32Array(p.count * 3); altCol = new Float32Array(p.count * 3); thrArr = new Float32Array(p.count); const c = new THREE.Color(), a = new THREE.Color(), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(w.fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI, al = Math.abs(lat), j = rnd() * 0.06 - 0.03, isL = land(lat, lon);
    if (lat < -62 || lat > 76) c.set('#eef3f6'); else if (isL) { if (al > 55) c.set('#7c8a62'); else if (al > 14 && al < 34 && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.multiplyScalar(0.85); }
    else c.set(al > 45 ? '#24506e' : '#1f5f92'); c.offsetHSL(0, 0, j); a.copy(c); let reg = null;
    if (isL && lat > 25 && lat < 36.5 && lon > -106 && lon < -76) { reg = 'sus'; a.set(rnd() < 0.6 ? '#d4b97c' : '#c6a46a').offsetHSL(0, 0, j); }
    else if (isL && lat > 9 && lat < 34 && lon > -17 && lon < 60) { reg = 'sah'; a.set(rnd() < 0.5 ? '#5f8a3e' : '#78a04c').multiplyScalar(0.9).offsetHSL(0, 0, j); }
    else if ((isL && lat > 42 && lat < 64 && lon > -11 && lon < 22) || (!isL && lat > 48 && lat < 68 && lon > -45 && lon < 8)) { reg = 'eur'; a.set(isL ? '#f2f5f8' : '#dfe9f0').offsetHSL(0, 0, j); }
    else if (!isL && lat > -15 && lat < 24 && lon > 45 && lon < 100) { reg = 'ind'; a.set(rnd() < 0.5 ? '#2f8f6a' : '#3a9a5a').offsetHSL(0, 0, j); }
    let thr = 0; const nz = vn2(lon / 4, lat / 4) * 0.6 + vn2(lon / 1.3, lat / 1.3) * 0.4;
    if (reg === 'sus') thr = Math.max(edgeT(lat, lon, 25, 36.5, -106, -76), 0.15 + 0.5 * (36.5 - lat) / 11 + nz * 0.4);
    else if (reg === 'sah') thr = Math.max(edgeT(lat, lon, 9, 34, -17, 60), nz * 0.9);
    else if (reg === 'eur') thr = Math.max(edgeT(lat, lon, 42, isL ? 64 : 68, isL ? -11 : -45, isL ? 22 : 8), (isL ? 0.05 : 0.35) + (64 - lat) / 28 + Math.max(0, lon) / 45 + nz * 0.45 + (isL ? 0 : (lon + 45) / 120));
    else if (reg === 'ind') thr = Math.max(edgeT(lat, lon, -15, 24, 45, 100), nz * 0.9);
    for (let k = 0; k < 3; k++) { baseCol.set([c.r, c.g, c.b], (f + k) * 3); altCol.set([a.r, a.g, a.b], (f + k) * 3); thrArr[f + k] = thr; if (reg) REG[reg].idx.push(f + k); } }
  geo.setAttribute('color', new THREE.BufferAttribute(baseCol.slice(), 3)); earthGeo = geo;
  earthG.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  // night-side city lights (fade in where it is dark)
  const cp = []; for (let i = 0; i < 26000 && cp.length < 5200; i++) { const la = Math.asin(R(-0.6, 0.95)) * 180 / Math.PI, lo = R(-180, 180); if (!land(la, lo)) continue; const dens = (lo > -125 && lo < -65 && la > 25 && la < 50) || (lo > -10 && lo < 40 && la > 36 && la < 60) || (lo > 68 && lo < 122 && la > 8 && la < 40) ? 1 : 0.25; if (rnd() > dens) continue; cp.push(ll(la, lo, ER * 1.002)); }
  const pg = new THREE.BufferGeometry().setFromPoints(cp); earthG.add(new THREE.Points(pg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uL: { value: V3(1, 0, 0) } },
    vertexShader: 'uniform vec3 uL; varying float vA; void main(){ vec3 wp = (modelMatrix*vec4(position,1.0)).xyz; vA = smoothstep(0.05, -0.15, dot(normalize(wp), uL)); gl_PointSize = 2.6; gl_Position = projectionMatrix*viewMatrix*vec4(wp,1.0); }',
    fragmentShader: 'varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(vec3(1.6,1.15,0.6)*vA, 1.0); }' })));
  cityMat = earthG.children[earthG.children.length - 1].material;
  // clouds + atmosphere
  const cl = canvasTex(2048, 1024, (g2, w2, h2) => { g2.clearRect(0, 0, w2, h2); for (let i = 0; i < 1600; i++) { const x = R(0, w2), y = R(h2 * 0.08, h2 * 0.92), r = R(2, 8); const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); } });
  clouds = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.012, 96, 64), new THREE.MeshStandardMaterial({ map: cl, transparent: true, depthWrite: false, opacity: 0.42, roughness: 1 })); earthG.add(clouds);
  space.add(new THREE.Mesh(new THREE.SphereGeometry(ER * 1.06, 96, 64), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uL: { value: V3(1, 0, 0) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vW = normalize((modelMatrix*vec4(position,1.)).xyz); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uL; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 6.0); float s = dot(vW, uL); vec3 col = mix(vec3(0.35,0.62,1.0), vec3(1.0,0.55,0.25), smoothstep(0.35, 0.0, s) * smoothstep(-0.35, 0.0, s)); gl_FragColor = vec4(col * f * 1.3 * smoothstep(-0.4, 0.2, s), 1.0); }' })));
  atmoMat = space.children[space.children.length - 1].material;
}
let cityMat = null, atmoMat = null, clouds = null;
function setRegions(w) { let dirty = false; for (const k in w) if (Math.abs(REG[k].w - w[k]) > 1e-4) { REG[k].w = w[k]; dirty = true; } if (!dirty) return; const col = earthGeo.attributes.color.array;
  for (const k in REG) { const ww = REG[k].w * 1.35; for (const i of REG[k].idx) { const m = clamp((ww - thrArr[i]) / 0.12, 0, 1); for (let q = 0; q < 3; q++) col[i * 3 + q] = baseCol[i * 3 + q] + (altCol[i * 3 + q] - baseCol[i * 3 + q]) * m; } } earthGeo.attributes.color.needsUpdate = true; }
// spin arrows around the equator (clockwise seen from the north = backwards)
const spinRing = new THREE.Group(); earthG.add(spinRing); { const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.4), transparent: true });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.18, 0.06, 6, 120), tm); ring.rotation.x = Math.PI / 2; spinRing.add(ring);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const cn = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 10), tm); cn.position.set(Math.cos(a) * ER * 1.18, 0, -Math.sin(a) * ER * 1.18); cn.lookAt(V3(Math.cos(a - 0.1) * ER * 1.18, 0, -Math.sin(a - 0.1) * ER * 1.18)); cn.rotateX(Math.PI / 2); spinRing.add(cn); } }
// winds: arrows riding the mid-latitude bands, flowing WEST (they flip with the spin)
const WIND_N = 260; const windMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.6, 5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.0), transparent: true, opacity: 0.9 }), WIND_N); windMesh.frustumCulled = false; earthG.add(windMesh);
const WIND = Array.from({ length: WIND_N }, (_, i) => ({ lat: (i % 2 ? 1 : -1) * R(30, 58), lon0: R(-180, 180), sp: R(18, 30), ph: R(0, 1) }));
const _o = new THREE.Object3D();
// the plane NYC -> LA with a contrail; the hurricane (spins clockwise); the Gulf Stream; the rocket from California heading west
const plane = new THREE.Group(); { const m = M('#f4f6fa', { roughness: 0.4 }); bx(0.05, 0.05, 0.36, m, 0, 0, 0, plane); bx(0.34, 0.012, 0.08, m, 0, 0, 0.02, plane); bx(0.12, 0.012, 0.05, m, 0, 0, 0.16, plane); bx(0.012, 0.07, 0.05, m, 0, 0.035, 0.16, plane); } earthG.add(plane);
const NYC = [40.71, -74.0], LA = [34.05, -118.24];
const gcPoint = (u, lift = 0.35) => { const a = ll(NYC[0], NYC[1], 1), b = ll(LA[0], LA[1], 1); const om = a.angleTo(b); const p = a.clone().multiplyScalar(Math.sin((1 - u) * om) / Math.sin(om)).add(b.clone().multiplyScalar(Math.sin(u * om) / Math.sin(om))); return p.normalize().multiplyScalar(ER + lift * Math.sin(Math.PI * u) + 0.08); };
const spiralTex = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 260; i++) { const k = i / 260, a = arm * Math.PI / 2 + k * 7.5, r = 14 + k * 230; const x = Math.cos(a) * r, y = Math.sin(a) * r, s = 10 + 26 * k;
  const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - k * 0.6)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } }, null);
const hurr = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshStandardMaterial({ map: spiralTex, transparent: true, depthWrite: false, roughness: 1 })); const hurrG = new THREE.Group(); hurrG.add(hurr); earthG.add(hurrG);
{ const pos = ll(26, -62, ER * 1.02); hurrG.position.copy(pos); hurrG.quaternion.setFromUnitVectors(V3(0, 0, 1), pos.clone().normalize()); }
const GULF = new THREE.CatmullRomCurve3([[24.5, -81], [29, -79.6], [34, -75.5], [38, -70], [41, -60], [44, -47], [48, -33], [52, -20], [56, -10], [60, -4]].map(([a, b]) => ll(a, b, ER * 1.006)));
const gulfMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.35), transparent: true, opacity: 0 }); const gulf = new THREE.Mesh(new THREE.TubeGeometry(GULF, 160, 0.07, 6, false), gulfMat); earthG.add(gulf);
const PACI = new THREE.CatmullRomCurve3([[30, 135], [35, 145], [40, 160], [44, 175], [48, -170], [52, -155], [56, -145]].map(([a, b]) => ll(a, b, ER * 1.006)));
const paciMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.35), transparent: true, opacity: 0 }); earthG.add(new THREE.Mesh(new THREE.TubeGeometry(PACI, 120, 0.07, 6, false), paciMat));
const rocket = new THREE.Group(); { bx(0.05, 0.3, 0.05, '#f2f2f2', 0, 0.15, 0, rocket); const nc = mesh(new THREE.ConeGeometry(0.036, 0.09, 8), M('#d8d8d8')); nc.position.y = 0.345; rocket.add(nc); const fl = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 0.8) })); fl.rotation.x = Math.PI; fl.position.y = -0.08; rocket.add(fl); }
earthG.add(rocket); const VAND = [34.7, -120.6];
const ROCK = t => { const u = clamp((t - (ROCKET + 0.8)) / 4.5, 0, 1); const up = ll(VAND[0], VAND[1], 1); const alt = 0.05 + 3.2 * Math.pow(u, 1.5); const lon = VAND[1] - 26 * Math.pow(u, 1.8); const lat = VAND[0] - 6 * Math.pow(u, 1.8); return ll(lat, lon, ER + alt); };
const gSmoke = makeSmoke(space, 1600);
// Earth spin angle (retrograde = decreasing). Effective world longitude = lon + rot; the Sun sits at world lon 0 => dawn at effective lon +90
const ROT0 = 300 * Math.PI / 180;
const rotAt = t => { const d2r = Math.PI / 180;
  if (t < ZONES) return lerp(ROT0, 214 * d2r, ease(clamp((t - SPIN + 0.4) / (ZONES - SPIN + 0.4), 0, 1)));
  if (t < WINDS) return lerp(214 * d2r, 158 * d2r, clamp((t - ZONES) / (WINDS - ZONES), 0, 1));
  return 158 * d2r - (t - WINDS) * 1.2 * d2r; };
// =================== globe camera: one continuous flight between the beats (keys in Earth-local lat/lon, so the camera rides with the spin) ===================
const KEYS = [ // [time, lat, lon, distance above surface, northward tilt]
  [ZONES, 37, -96, 26, 0.2], [WINDS + 0.6, 39, -92, 22, 0.25], [HURR + 0.4, 27, -66, 8.5, 0.35], [DRY + 0.6, 31, -90, 7.5, 0.3], [DRY + 4.3, 34, -80, 8.5, 0.3],
  [EURO + 0.5, 44, -38, 13, 0.2], [EURO + 4.0, 50, 4, 10, 0.25], [SAHARA + 0.5, 22, 15, 12, 0.2], [INDIAN + 0.5, 6, 75, 14, 0.15], [ROCKET + 0.5, 30, -128, 9.5, 0.3], [T_END - 0.6, 26, -140, 26, 0.2]];
const angLerp = (a, b, k) => { let d = ((b - a + 540) % 360) - 180; return a + d * k; };
function keyAt(t) { if (t <= KEYS[0][0]) return KEYS[0].slice(1); for (let i = 0; i < KEYS.length - 1; i++) { const A = KEYS[i], B = KEYS[i + 1]; if (t <= B[0]) { const hold = Math.max(0, (B[0] - A[0]) - 2.0); const k = ease(clamp((t - A[0] - hold) / (B[0] - A[0] - hold), 0, 1));
      return [lerp(A[1], B[1], k), angLerp(A[2], B[2], k), lerp(A[3], B[3], k), lerp(A[4], B[4], k)]; } } return KEYS[KEYS.length - 1].slice(1); }
function localCam(lat, lon, dist, tilt) { const p = earthG.localToWorld(ll(lat, lon, ER)); const n = p.clone().normalize(); const north = earthG.localToWorld(ll(lat + 8, lon, ER)).sub(p).normalize();
  return { pos: n.clone().multiplyScalar(ER + dist).addScaledVector(north, -dist * tilt), look: p.clone().multiplyScalar(0.92) }; }
const L = new THREE.Vector3(1, 0.12, 0).normalize();
function updateGlobe(t) { earthG.rotation.y = rotAt(t); earthG.updateMatrixWorld(true); if (clouds) clouds.rotation.y = -t * 0.004;
  // camera: close over NYC (continuing the street crane) -> world view of the backwards spin -> follow the beats
  let cam;
  if (t < ZONES) { const near = localCam(40.7, -74.0, lerp(1.2, 6, smooth(5.2, 6.6, t)), 0.15); const far = { pos: V3(0, 15, 30), look: V3(0, 1.5, 0) }; const k = ease(clamp((t - 5.6) / 2.2, 0, 1));
    const zk = ease(clamp((t - (ZONES - 1.4)) / 1.6, 0, 1)), z = localCam(37, -96, 26, 0.2); cam = { pos: near.pos.clone().lerp(far.pos, k).lerp(z.pos, zk), look: near.look.clone().lerp(far.look, k).lerp(z.look, zk) }; }
  else { const [la, lo, d, ti] = keyAt(t); cam = localCam(la, lo, d, ti); }
  cam.pos.add(V3(Math.sin(t * 0.37) * 0.15, Math.sin(t * 0.29) * 0.12, 0)); gCam.position.copy(cam.pos); gCam.up.set(0, 1, 0); gCam.lookAt(cam.look); gCam.fov = 40; gCam.aspect = W / H; gCam.updateProjectionMatrix();
  // sunlight: the real Sun (world lon 0) while we show the spin and the dawn line; later it follows the camera so each region is lit, terminator at the side
  const Lc = gCam.position.clone().normalize().applyAxisAngle(V3(0, 1, 0), 0.75).add(V3(0, 0.25, 0)).normalize(); const lk = smooth(WINDS - 0.2, WINDS + 1.6, t);
  L.set(1, 0.12, 0).normalize().lerp(Lc, lk).normalize(); gSun.position.copy(L).multiplyScalar(60); gSun.target.position.set(0, 0, 0);
  if (cityMat) cityMat.uniforms.uL.value.copy(L); if (atmoMat) atmoMat.uniforms.uL.value.copy(L);
  // spin ring (backwards = clockwise from the north)
  spinRing.visible = t < ZONES + 0.5; spinRing.children.forEach(c => { c.material.opacity = fadeWin(t, SPIN + 0.6, ZONES + 0.4, 0.6); }); spinRing.rotation.y = -t * 0.6;
  // winds flowing west
  const wv = fadeWin(t, WINDS - 0.3, HURR + 0.6, 0.6); windMesh.visible = wv > 0.01;
  WIND.forEach((A, i) => { const life = ((t * 0.35 + A.ph) % 1); const lon = A.lon0 - A.sp * (t - WINDS) - 40 * life; const s = wv * Math.sin(Math.PI * life);
    _o.position.copy(ll(A.lat, lon, ER * 1.03)); _o.up.copy(_o.position).normalize(); _o.lookAt(ll(A.lat, lon - 2, ER * 1.03)); _o.scale.setScalar(Math.max(0.001, s)); _o.updateMatrix(); windMesh.setMatrixAt(i, _o.matrix); }); windMesh.instanceMatrix.needsUpdate = true;
  // the plane: NYC -> LA riding the tailwind
  const pu = smooth(WINDS + 1.2, HURR - 0.4, t); plane.visible = t > WINDS + 0.9 && t < HURR + 0.2; const pp = gcPoint(pu), pn = gcPoint(Math.min(1, pu + 0.01)); plane.position.copy(pp); plane.up.copy(pp).normalize(); plane.lookAt(pn); plane.scale.setScalar(1.6);
  // hurricane, clockwise
  hurrG.visible = t > HURR - 0.4 && t < DRY + 0.6; hurr.material.opacity = fadeWin(t, HURR - 0.4, DRY + 0.6, 0.6); hurr.rotation.z = -t * 2.2;
  // model results
  setRegions({ sus: smooth(DRY + 0.6, DRY + 4.0, t), eur: smooth(EURO + 3.4, EURO + 6.2, t), sah: smooth(SAHARA + 0.3, SAHARA + 3.5, t), ind: smooth(INDIAN + 0.3, INDIAN + 3.2, t) });
  gulfMat.opacity = smooth(EURO - 0.4, EURO + 0.6, t) * (1 - smooth(EURO + 1.8, EURO + 3.4, t)) * 0.95; gulf.visible = gulfMat.opacity > 0.01; paciMat.opacity = smooth(EURO + 2.4, EURO + 3.6, t) * (1 - smooth(SAHARA, SAHARA + 1, t));
  // rocket from California, heading WEST over the Pacific
  gSmoke.begin(); smokeMat.uniforms.uTint.value.set('#f4f2ee');
  if (t > ROCKET + 0.3) { rocket.visible = true; const p = ROCK(t), q = ROCK(t + 0.05); rocket.position.copy(p); rocket.quaternion.setFromUnitVectors(V3(0, 1, 0), q.clone().sub(p).lengthSq() > 1e-8 ? q.clone().sub(p).normalize() : p.clone().normalize()); rocket.scale.setScalar(2.2);
    for (let k = 0; k < 140; k++) { const tk = t - k * 0.03; if (tk < ROCKET + 0.8) break; const w = earthG.localToWorld(ROCK(tk)); gSmoke.add(w, 0.1 + k * 0.004, 0.5 * (1 - k / 140)); }
    if (t < ROCKET + 1.6) for (let k = 0; k < 30; k++) { const w = earthG.localToWorld(ll(VAND[0] + Math.sin(k) * 0.4, VAND[1] + Math.cos(k * 1.3) * 0.4, ER * 1.01)); gSmoke.add(w, 0.25, 0.4 * fadeWin(t, ROCKET + 0.5, ROCKET + 1.6, 0.3)); } }
  else rocket.visible = false;
  gSmoke.end(); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud', 'labels'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if the Sun rose<br>in the <span class="hl">West</span>?'; el.endT.innerHTML = 'What if the Sun rose in the <span class="hl">West</span>?';
el.endS.innerHTML = 'MAX PLANCK INSTITUTE, 2018: A 7,000-YEAR CLIMATE SIMULATION OF A BACKWARDS-SPINNING EARTH.<br>DESERTS SHRINK BY ~4 MILLION SQ MI OVERALL — BUT MOVE TO THE AMERICAS.<br>ON VENUS, THE SUN REALLY DOES RISE IN THE WEST.';
const captions = [
  [1.2, 5.0, 'Manhattanhenge… at sunrise.'],
  [6.5, 10.3, 'Not a sudden flip — that would throw you east at 789 mph.<br>Earth just always spun the other way.'],
  [10.8, 15.8, 'Time zones flip:<br>LA wakes up 3 hours before New York.'],
  [16.3, 22.8, 'Winds blow the other way.<br>NYC → LA becomes the fast flight.'],
  [23.3, 27.8, 'Hurricanes spin clockwise.'],
  [28.3, 31.9, 'A real climate model (Max Planck, 2018):<br>the southern US turns into desert.'],
  [32.0, 35.8, 'But New York gets milder winters.'],
  [36.3, 39.6, 'The Atlantic’s warm current<br>moves to the Pacific…'],
  [39.7, 42.8, '…and western Europe freezes.'],
  [43.3, 48.8, 'The Sahara turns green.'],
  [49.3, 53.8, 'The Indian Ocean fills<br>with cyanobacteria.'],
  [54.3, 59.7, 'Rockets launch WEST for the free boost —<br>America’s spaceport moves to California.'],
];
function hudAt(t) { const M_ = '<b></b>MODEL · MAX PLANCK 2018';
  if (t < SPIN + 0.3) return null;
  if (t < ZONES) return ['<b></b>EARTH’S SPIN', 'DIRECTION', 'REVERSED', 'THE SUN RISES IN THE WEST'];
  if (t < WINDS) return null;
  if (t < HURR) return ['<b></b>WINDS FLIP', 'FLIGHT NYC → LA', '~5 h', 'TODAY ~6 h INTO A HEADWIND'];
  if (t < DRY) return ['<b></b>CORIOLIS FLIPS', 'HURRICANES', 'CLOCKWISE', 'IN THE NORTHERN HEMISPHERE'];
  if (t < EURO) return [M_, 'SOUTHERN US', 'DESERT', t < DRY + 4 ? 'TEXAS · LOUISIANA · FLORIDA' : 'NYC: MILDER WINTERS'];
  if (t < SAHARA) return [M_, 'WESTERN EUROPE', t < EURO + 3.4 ? 'NO GULF STREAM' : 'FREEZING', 'DEEP-WATER ENGINE → N. PACIFIC'];
  if (t < INDIAN) return [M_, 'SAHARA', 'GREEN', 'ARABIA TOO'];
  if (t < ROCKET) return [M_, 'INDIAN OCEAN', 'BLOOM', 'CYANOBACTERIA TAKE OVER'];
  return ['<b></b>LAUNCH WEST', 'FREE BOOST', '856 mph', 'EARTH’S SPIN AT CALIFORNIA’S COAST']; }
const clockEls = [['LA', LA], ['NEW YORK', NYC]].map(([name, p]) => { const d = document.createElement('div'); d.className = 'lb'; d.style.fontSize = '30px'; el.labels.appendChild(d); return { name, p, d }; });
function fmtClock(h) { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); const ap = hh < 12 ? 'AM' : 'PM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.4, 4.0, t);
  const h = hudAt(t); el.hud.style.opacity = h ? fadeWin(t, Math.max(0, t - 99), T_END, 0.3) * (1 - smooth(T_END - 0.4, T_END, t)) : 0;
  if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 9 ? '72px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  // local clocks on LA / NYC while the dawn line sweeps WEST -> EAST
  const ca = fadeWin(t, ZONES + 0.3, WINDS - 0.1, 0.4); const rotDeg = rotAt(t) * 180 / Math.PI;
  for (const C of clockEls) { const eff = ((C.p[1] + rotDeg + 540) % 360) - 180; const hours = 12 - eff / 15; const day = Math.abs(eff) < 90;
    const w = earthG.localToWorld(ll(C.p[0], C.p[1], ER * 1.01)).project(gCam); C.d.style.left = ((w.x * 0.5 + 0.5) * W) + 'px'; C.d.style.top = ((-w.y * 0.5 + 0.5) * H - 14) + 'px';
    C.d.innerHTML = `${day ? '☀' : '☾'} ${C.name}<br><span style="font-size:44px;font-family:'Source Serif 4'">${fmtClock(hours)}</span>`; C.d.style.opacity = ca; C.d.style.textAlign = 'center'; }
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
window.renderAt = (t) => {
  const mix = smooth(5.2, 6.3, t);
  if (mix < 1) { updateStreet(t); streetCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(sCam.fov * Math.PI / 360)); shootTo(RTA, street, sCam); }
  if (mix > 0) { updateGlobe(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(gCam.fov * Math.PI / 360)); shootTo(mix < 1 ? RTB : RTA, space, gCam); }
  composite(mix > 0 && mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildGlobe(); window.renderAt(0); return true; })();
