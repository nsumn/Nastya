import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if the ocean drained?" — classic series low-poly look; scenes dissolve into each other (render targets + one composite pass).
// Facts (sources in HANDOFF/chat): USGS, NOAA, WHOI 86% evaporation, UNCTAD 112,500 ships / 80% trade, TeleGeography cables, FAO 3.2 bn people,
// NOAA hurricanes >= 80F, NASA GISS water vapour ~50% of the greenhouse effect, USGS ~69% of fresh water in ice, Aral Sea dust, Zanclean flood. Salt: tools/ocean_math.py.
// =================== timeline ===================
const RECEDE = 4.0, FISH = 10.0, SHIPS = 17.0, CABLES = 23.0, SALT = 29.0, GLOBE = 36.0, RIVER = 43.0, STORE = 50.0, ICE = 55.0, MED = 60.0, T_END = 63.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 1335;
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
// =================== SCENE A (meters): Jersey Shore beach -> drained Atlantic floor (shelf, ships, cables, salt plain) ===================
const sea = new THREE.Scene(); const seaCam = new THREE.PerspectiveCamera(60, W / H, 0.5, 40000);
sea.fog = new THREE.Fog(new THREE.Color('#cfe0ee'), 800, 16000);
const seaHemi = new THREE.HemisphereLight(0xdfe8f6, 0x6a5a48, 1.1); sea.add(seaHemi);
const seaSun = new THREE.DirectionalLight(0xfff0dc, 3.0); seaSun.castShadow = true; seaSun.shadow.mapSize.set(2048, 2048);
Object.assign(seaSun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 1200 }); seaSun.shadow.bias = -0.0005; seaSun.shadow.normalBias = 0.03; sea.add(seaSun, seaSun.target);
const seaDome = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color('#4a86d0') }, uBot: { value: new THREE.Color('#d6e6f2') } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uTop, uBot; varying vec3 vD; void main(){ float e=max(vD.y,0.0); gl_FragColor=vec4(mix(uBot,uTop,pow(e,0.55)),1.0); }' })); sea.add(seaDome);
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const h = (i, j) => hash(i * 157.31 + j * 311.77); const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); }
function fbm(x, y, o = 4) { let a = 0, s = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { a += vnoise(x * f, y * f) * s; n += s; s *= 0.5; f *= 2.03; } return a / n; }
// seabed profile: beach (z>0) -> shelf (to -40 m at 2 km) -> slope (to -400 m at 8 km) -> salt plain
function seabed(x, z) { const d = -z; if (d < 0) return Math.min(6, -d * 0.03) + fbm(x * 0.02, z * 0.02) * 1.5 * smooth(0, 60, -d);
  const base = -(0.02 * Math.min(d, 2000) + 0.06 * Math.max(0, Math.min(d, 8000) - 2000) + 0.004 * Math.max(0, d - 8000));
  return base + (fbm(x * 0.004, z * 0.004, 4) - 0.5) * 10 * smooth(300, 3000, d) + Math.sin(x * 0.35 + Math.sin(z * 0.05) * 2) * 0.12 * (1 - smooth(200, 800, d)); }
const saltK = d => smooth(3500, 8000, d);
{ const g = new THREE.PlaneGeometry(9000, 16000, 180, 360); g.rotateX(-Math.PI / 2); g.translate(0, 0, -7600); const p = g.attributes.position, col = new Float32Array(p.count * 3); const c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = seabed(x, z); p.setY(i, y); const d = -z;
    if (d < 0) c.set(d > -12 ? '#e0cc9a' : '#d8c08a'); else { c.set(d < 600 ? '#b49c74' : '#7c7060'); const pa = fbm(x * 0.006 + 3, z * 0.006, 3); c.lerp(c2.set(pa > 0.55 ? '#5e5648' : '#a89a80'), Math.abs(pa - 0.5) * 1.2); c.lerp(c2.set('#ece9e2'), saltK(d) * (0.6 + 0.4 * fbm(x * 0.01, z * 0.01))); }
    c.offsetHSL(0, 0, (hash(x * 0.37 + z * 0.11) - 0.5) * 0.05); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), false, true); sea.add(m); }
// scattered rocks along the camera path
{ const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#6a6258', { flatShading: true }), 900); const d = new THREE.Object3D();
  for (let i = 0; i < 900; i++) { const z = -R(30, 9000), x = R(-260, 260) * (1 + -z / 3000); d.position.set(x, seabed(x, z) - 0.2, z); const s = R(0.4, 2.5) * (1 + -z / 4000); d.scale.set(s, s * R(0.4, 0.8), s * R(0.7, 1.2)); d.rotation.set(R(0, 3), R(0, 3), 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.castShadow = true; im.receiveShadow = true; sea.add(im); }
// beach town: boardwalk + houses + a far NYC skyline
{ bx(3000, 0.4, 5, '#a07a54', 0, 3.2, 70, sea);
  for (let i = 0; i < 70; i++) { const x = -1400 + i * 40 + R(-8, 8), h = R(6, 12), w = R(10, 16); const hs = grp(x, 6, R(95, 130), 0, sea); bx(w, h, 10, pick(['#e8dcc8', '#c8d8e0', '#f0e0c8', '#d8b8a0', '#e8e8e8']), 0, h / 2, 0, hs); const rf = mesh(new THREE.ConeGeometry(w * 0.75, 4, 4), M(pick(['#7a3a2e', '#3a4a5a', '#5a4a3a']), { flatShading: true })); rf.rotation.y = Math.PI / 4; rf.scale.z = 0.7; rf.position.y = h + 2; hs.add(rf); }
  for (let i = 0; i < 40; i++) { const h = R(80, 380); bx(R(40, 90), h, R(40, 90), pick(['#8a9aa8', '#a8b0b8', '#6a7a88', '#b8b0a0']), R(-2500, 2500), h / 2, R(2400, 3200), sea); } }
// the water: one big plane whose level drops; a whirlpool where the plug was pulled
const seaWater = mesh(new THREE.PlaneGeometry(9000, 16000, 120, 240).rotateX(-Math.PI / 2).translate(0, 0, -7600), new THREE.MeshStandardMaterial({ color: '#2a6a8a', roughness: 0.35, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }), false, true);
seaWater.userData.base = seaWater.geometry.attributes.position.array.slice(); sea.add(seaWater);
const PLUG = V3(0, 0, -6500);
const whirlTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(230,245,255,${0.5 - k * 0.05})`; g.lineWidth = 14 - k; g.beginPath(); for (let a = 0; a < 18; a += 0.05) { const r = 250 * (1 - a / 18); const ang = a + k * 0.9; g.lineTo(w / 2 + Math.cos(ang) * r, h / 2 + Math.sin(ang) * r); } g.stroke(); } });
const whirl = new THREE.Mesh(new THREE.CircleGeometry(900, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: whirlTex, transparent: true, depthWrite: false, fog: false })); whirl.position.copy(PLUG).add(V3(0, 0.6, 0)); sea.add(whirl);
const plug = new THREE.Group(); sea.add(plug); { const pm = M('#2a2a2e', { roughness: 0.4 }); const pp = mesh(new THREE.CylinderGeometry(120, 160, 90, 20), pm); pp.position.y = 45; plug.add(pp); const ring = mesh(new THREE.TorusGeometry(40, 10, 8, 20), M('#8a8a8a', { metalness: 0.7, roughness: 0.3 })); ring.position.y = 120; plug.add(ring);
  for (let k = 0; k < 40; k++) { const l = mesh(new THREE.TorusGeometry(26, 7, 6, 14), M('#9a9a9a', { metalness: 0.7, roughness: 0.3 })); l.position.y = 150 + k * 44; l.rotation.y = k % 2 ? Math.PI / 2 : 0; plug.add(l); } }
plug.position.copy(PLUG);
// boats that settle on the sand
const boats = [];
for (let i = 0; i < 9; i++) { const g = new THREE.Group(); const hull = mesh(new THREE.CylinderGeometry(1.4, 0.9, 7, 6, 1).rotateZ(Math.PI / 2), M(pick(['#f2f2f2', '#d8423a', '#2a5a9a', '#f0c040']), { flatShading: true })); hull.scale.set(1, 0.6, 1); hull.position.y = 0.6; g.add(hull);
  bx(2.6, 1.4, 1.8, '#e8e8e8', -0.6, 1.8, 0, g); bx(0.12, 6, 0.12, '#cfcfcf', 0.8, 4, 0, g); const x = R(-120, 120), z = R(-140, -620); g.position.set(x, 0, z); g.rotation.y = R(0, 6); sea.add(g); boats.push({ g, x, z, tilt: R(-0.35, 0.35) }); }
// stranded fish (no gore: they just flop) + people running with buckets
const fishes = [];
for (let i = 0; i < 90; i++) { const g = new THREE.Group(); const col = pick(['#9aa6b0', '#c8a040', '#7a8a9a', '#d86a3a', '#5a7a8a']);
  const b = mesh(new THREE.SphereGeometry(0.22, 8, 6), M(col, { flatShading: true, roughness: 0.4 })); b.scale.set(1.6, 0.7, 0.45); g.add(b); const tl = mesh(new THREE.ConeGeometry(0.16, 0.25, 4).rotateZ(Math.PI / 2), M(col, { flatShading: true })); tl.position.x = -0.42; g.add(tl);
  const x = R(-22, 22), z = R(-52, -125); g.scale.setScalar(R(1.8, 2.6)); g.position.set(x, seabed(x, z) + 0.1, z); g.rotation.y = R(0, 6); sea.add(g); fishes.push({ g, x, z, ph: R(0, 6), r: R(0, 6) }); }
const savers = [];
for (let i = 0; i < 14; i++) { const p = makePerson(rnd); sea.add(p.outer); const bucket = mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 10), M(pick(['#e8b030', '#d8423a', '#3a7ad0']))); bucket.position.set(0, -0.36, 0.05); p.elbows[0].add(bucket);
  savers.push({ p, x0: R(-14, 14), z0: R(-5, 15), z1: R(-60, -110), delay: R(0, 2.0), sp: R(7, 9) }); }
// cargo ships lying on the shelf
const CONT = ['#c8302a', '#2a6ab0', '#e8a030', '#3a8a5a', '#e8e8e8', '#7a3a8a', '#d86a2a'];
function cargoShip(x, z, ry, roll) { const g = new THREE.Group(); const shp = new THREE.Shape(); shp.moveTo(-120, 0); shp.lineTo(110, 0); shp.lineTo(140, 14); shp.lineTo(140, 22); shp.lineTo(-125, 22); shp.lineTo(-125, 8); shp.lineTo(-120, 0);
  const hg = new THREE.ExtrudeGeometry(shp, { depth: 40, bevelEnabled: false }); hg.translate(0, 0, -20); const hull = mesh(hg, M('#2a3a4a', { flatShading: true })); g.add(hull); bx(250, 3, 40, '#8a2a24', 5, 1.5, 0, g);
  const deck = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.7 }), 400); let k = 0; const d = new THREE.Object3D(); const cc = new THREE.Color();
  for (let bay = 0; bay < 18; bay++) for (let row = 0; row < 6; row++) for (let tier = 0; tier < 4; tier++) { if (k >= 400) break; if (rnd() < 0.15) continue; d.position.set(-95 + bay * 12.5, 22 + 1.3 + tier * 2.6, -16 + row * 6.4); d.scale.set(12, 2.5, 6.0); d.updateMatrix(); deck.setMatrixAt(k, d.matrix); deck.setColorAt(k, cc.set(pick(CONT))); k++; }
  deck.count = k; deck.castShadow = true; g.add(deck);
  const br = grp(-112, 22, 0, 0, g); bx(14, 22, 36, '#f0f0f0', 0, 11, 0, br); bx(16, 4, 40, '#e8e8e8', 0, 23, 0, br); bx(14.2, 2, 34, M('#22303a', { roughness: 0.2, metalness: 0.6 }), 0, 19, 0, br);
  g.position.set(x, seabed(x, z) - 3, z); g.rotation.set(roll, ry, 0, 'YXZ'); sea.add(g); return g; }
cargoShip(-150, -2050, 0.4, 0.12); cargoShip(170, -2350, -0.9, -0.1); cargoShip(-20, -2700, 1.8, 0.16);
// seafloor internet cables (with repeaters) + a hiker walking along one
const cables = [];
for (const [x0, c] of [[-20, '#1a1a1e'], [180, '#2a2a20'], [-260, '#1e1a1a']]) { const pts = []; for (let z = 50; z > -12000; z -= 120) { const x = x0 + 30 * Math.sin(z * 0.0011 + x0); pts.push(V3(x, seabed(x, z) + 1.3, z)); }
  const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.45, 6, false), M(c, { roughness: 0.6 })); sea.add(tube); cables.push(pts);
  for (let i = 4; i < pts.length; i += 9) { const r = mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.2, 10).rotateX(Math.PI / 2), M('#5a5a5e', { metalness: 0.5 })); r.position.copy(pts[i]); r.position.y += 0.3; sea.add(r); } }
const hiker = makePerson(rnd, { top: '#e86a2a', bottom: '#2a3a5c' }); sea.add(hiker.outer);
const pack = mesh(new THREE.BoxGeometry(0.4, 0.5, 0.22), M('#3a5a3a')); pack.position.set(0, 1.3, -0.2); hiker.root.add(pack);
// salt storm: a wall of white-tan dust rolling toward the coast
const seaSmoke = makeSmoke(sea, 5000);
function cablePoint(i, u) { const pts = cables[i]; const f = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)); return pts[k].clone().lerp(pts[k + 1], f - k); }
function seaLevel(t) { if (t < RECEDE) return 0; return -smooth(RECEDE, FISH, t) * 40 - smooth(FISH, SHIPS + 2, t) * 410 - smooth(SHIPS + 1, CABLES + 2, t) * 400; }
function updateSea(t) {
  const L = seaLevel(t); seaWater.position.y = L; seaWater.visible = L > -820;
  { const p = seaWater.geometry.attributes.position, b = seaWater.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; p.array[i * 3 + 1] = 0.6 * Math.sin(x * 0.02 + t * 1.2) + 0.5 * Math.sin(z * 0.03 - t * 1.5); } p.needsUpdate = true; seaWater.geometry.computeVertexNormals(); }
  // the plug rises out on its chain, the whirlpool spins and sinks with the water
  plug.position.set(PLUG.x, L - 90 + 260 * smooth(0.6, 3.2, t), PLUG.z); whirl.position.set(PLUG.x, L + 0.8, PLUG.z); whirl.rotation.y = -t * 1.6; whirl.visible = t > 1.4 && L > -820; plug.visible = t < SHIPS + 2; whirl.material.opacity = smooth(1.4, 2.6, t) * (1 - smooth(CABLES, CABLES + 2, t));
  for (const B of boats) { const gh = seabed(B.x, B.z); const fl = L > gh + 0.5; B.g.position.y = fl ? L + 0.15 * Math.sin(t * 2 + B.x) : gh + 0.05; B.g.rotation.z = fl ? 0.04 * Math.sin(t * 1.7 + B.z) : B.tilt; }
  for (const F of fishes) { const gh = seabed(F.x, F.z); const out = L < gh - 0.05; F.g.visible = out && t < SHIPS + 0.5; const f = Math.max(0, Math.sin(t * (6 + F.r) + F.ph)); F.g.position.y = gh + 0.12 + 0.18 * f * f; F.g.rotation.x = Math.sin(t * 9 + F.ph) * 0.9; }
  for (const S of savers) { const u = clamp((t - (FISH - 1.5) - S.delay) / ((S.z0 - S.z1) / S.sp), 0, 1); const z = lerp(S.z0, S.z1, u), x = S.x0 + 4 * Math.sin(u * 3 + S.x0); const o = S.p.outer; o.visible = t > FISH - 1.6 && t < SHIPS + 0.5;
    o.position.set(x, seabed(x, z) + 0.95, z); o.rotation.y = Math.PI; if (u < 1) poseWalk(S.p, t * 12 + S.delay * 3, 1.3); else { poseIdle(S.p, t, S.delay); S.p.arms[0].rotation.x = -0.9; S.p.elbows[0].rotation.x = -0.3; S.p.root.rotation.x = 0.5; } if (u < 1) S.p.root.rotation.x = 0.15; }
  // hiker on the middle cable
  { const u = 0.36 + (t - CABLES) * 0.00055; const p = cablePoint(0, u), q = cablePoint(0, u + 0.002); hiker.outer.position.copy(p).add(V3(0, 0.95 + 0.45, 0)); hiker.outer.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); poseWalk(hiker, t * 6); hiker.outer.visible = t > CABLES - 0.5 && t < SALT + 0.5; }
  // salt storm
  seaSmoke.begin(); if (t > SALT - 1) { smokeMat.uniforms.uTint.value.set('#cbb690'); const front = lerp(-7300, -5600, smooth(SALT, GLOBE, t));
    for (let k = 0; k < 1400; k++) { const x = -2400 + hash(k * 1.7) * 4800, z = front + hash(k * 3.1) * 700 + (t - SALT) * 25 * hash(k), y = seabed(x, z) + Math.pow(hash(k * 7.7), 1.5) * 420 + 10; _sp.set(x, y, z); seaSmoke.add(_sp, 180 + hash(k * 9.1) * 280, 0.5 * smooth(SALT - 1, SALT + 1.5, t)); } }
  seaSmoke.end();
  const late = smooth(SALT, GLOBE, t); seaDome.material.uniforms.uTop.value.set('#4a86d0').lerp(_sc.set('#8a8fa0'), late * 0.6); seaDome.material.uniforms.uBot.value.set('#d6e6f2').lerp(_sc.set('#e8dcc8'), late); sea.fog.color.set('#cfe0ee').lerp(_sc.set('#e6dcca'), late);
  sea.fog.near = lerp(800, 400, late); sea.fog.far = lerp(16000, 9000, late);
}
const _sp = new THREE.Vector3(), _sc = new THREE.Color();
function seaCamera(t) { let pos, look; seaCam.fov = 60;
  if (t < FISH) { const u = t / FISH; pos = V3(0, 9 - 2 * u, 45 - 10 * u); look = V3(0, lerp(40, -5, smooth(RECEDE, FISH, t)), -3000); }
  else if (t < SHIPS) { const u = ease((t - FISH) / (SHIPS - FISH)); pos = V3(lerp(0, -5, u), lerp(7, seabed(-5, -40) + 2.0, u), lerp(35, -40, u)); look = V3(0, seabed(0, -95) + 0.3, lerp(-400, -95, u)); }
  else if (t < CABLES) { const u = (t - SHIPS) / (CABLES - SHIPS); const z = lerp(-1450, -1900, u); pos = V3(lerp(-60, 80, u), seabed(0, z) + lerp(30, 42, u), z); look = V3(0, seabed(0, -2300) + 8, -2350); }
  else if (t < SALT) { const p = cablePoint(0, 0.36 + (t - CABLES) * 0.00055); pos = p.clone().add(V3(3.5, 3.2, 9)); look = p.clone().add(V3(-0.5, 1.2, -10)); }
  else { const u = ease((t - SALT) / (GLOBE - SALT)); const z = lerp(-8800, -9400, u); pos = V3(lerp(-200, 0, u), seabed(0, z) + lerp(25, 400, smooth(GLOBE - 1.5, GLOBE + 0.6, t)), z); look = V3(0, seabed(0, -6000) + 80 + 600 * smooth(GLOBE - 1.5, GLOBE + 0.6, t), -5500); }
  seaSun.position.copy(pos).add(V3(-200, 300, 150)); seaSun.target.position.copy(pos).add(V3(0, 0, -60)); seaSun.target.updateMatrixWorld();
  seaCam.position.copy(pos); seaCam.lookAt(look); }
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
// =================== timeline of scenes; neighbours dissolve over 0.9 s ===================
const SEGS = [['sea', 0], ['globe', GLOBE], ['river', RIVER], ['shop', STORE], ['ant', ICE], ['med', MED]];
const DIS = 0.9;
function renderScene(name, t, rt) {
  if (name === 'sea') { updateSea(t); seaCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(seaCam.fov * Math.PI / 360)); shootTo(rt, sea, seaCam); return 1.0; }
  if (name === 'globe' || name === 'med') { updateGlobe(t); globeCamera(t); shootTo(rt, space, spaceCam); return 1.05; }
  if (name === 'river') { updateRiver(t); riverCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(rivCam.fov * Math.PI / 360)); shootTo(rt, riv, rivCam); return 1.0; }
  if (name === 'shop') { updateShop(t); shopCamera(t); shootTo(rt, shop, shopCam); return 1.05; }
  if (name === 'ant') { updateAnt(t); antCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(antCam.fov * Math.PI / 360)); shootTo(rt, ant, antCam); return 1.0; }
}
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.3, 6.9, 'The sea pulls back<br>for miles.'],
  [7.0, 9.7, '400 feet down: you could walk<br>from Alaska to Russia.'],
  [10.3, 13.4, 'Hour 1: billions of fish,<br>stranded.'],
  [13.5, 16.7, 'The biggest US aquarium holds<br>1/32-trillionth of the ocean.'],
  [17.3, 19.9, 'Day 1: 112,500 cargo ships —<br>stuck.'],
  [20.0, 22.7, '80% of world trade moves by sea.<br>Store shelves go empty.'],
  [23.2, 26.1, "Surprise: the internet between continents<br>doesn't go through space…"],
  [26.2, 28.8, '…it runs through hundreds of cables<br>on the seafloor. Now you can walk on it.'],
  [29.3, 32.3, 'Left behind: about<br>200 feet of salt.'],
  [32.4, 35.7, 'Wind turns it into salt storms —<br>like the dried-up Aral Sea.'],
  [36.4, 39.4, 'Good news, Florida: no hurricanes —<br>they need 80°F ocean water.'],
  [39.5, 42.7, 'Bad news: no ocean, no clouds.<br>Scorching days, freezing nights.'],
  [43.4, 46.4, 'Rivers keep pouring<br>into the empty basins…'],
  [46.5, 49.7, '…until the rain stops.<br>86% of evaporation came from the ocean.'],
  [50.4, 52.6, 'Bottled water? It comes from springs<br>and taps — refilled by rain.'],
  [52.7, 54.7, 'Soon, water is worth<br>more than gold.'],
  [55.4, 57.6, "Ice holds about 69% of<br>Earth's fresh water…"],
  [57.7, 59.8, '…so Antarctica becomes the most<br>valuable place on Earth.'],
  [60.3, 63.0, 'It happened before: the Mediterranean dried up<br>~6 million years ago — then a flood refilled it.'],
];
function hudAt(t) { let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < RECEDE + 0.2 || t >= MED) show = 0;
  else if (t < SHIPS) { lab = 'SEA LEVEL'; val = '−' + fmt(-seaLevel(t) * 3.281) + ' ft'; sub = t < FISH ? 'THE OCEAN IS DRAINING' : 'FISH STRANDED: BILLIONS'; }
  else if (t < CABLES) { lab = 'CARGO SHIPS STUCK'; val = '112,500'; sub = '80% OF WORLD TRADE GOES BY SEA'; }
  else if (t < SALT) { lab = 'INTERNET CABLES ON THE SEAFLOOR'; val = '~900,000 mi'; sub = 'ALMOST ALL DATA BETWEEN CONTINENTS'; }
  else if (t < GLOBE) { stat = '<b></b>MODEL'; lab = 'SALT LEFT BEHIND'; val = '~200 ft'; sub = 'ON THE WHOLE SEAFLOOR'; }
  else if (t < RIVER) { lab = 'HURRICANES'; val = '0'; sub = t < 39.5 ? 'THEY NEED 80°F OCEAN WATER' : 'NO CLOUDS · DESERT TEMPERATURES'; }
  else if (t < STORE) { lab = 'EVAPORATION FROM THE OCEAN'; val = '86%'; sub = 'NOW GONE — RAIN MOSTLY STOPS'; }
  else if (t < ICE) { lab = 'BOTTLED WATER'; val = PRICES[Math.min(PRICES.length - 1, Math.floor(clamp((t - STORE) / (ICE - STORE), 0, 1) * PRICES.length * 1.05))]; sub = '55% SPRING WATER · 45% TAP WATER'; }
  else { lab = 'FRESH WATER IN ICE'; val = '~69%'; sub = 'USGS'; }
  return { stat, lab, val, sub, show }; }
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
window.renderAt = (t) => {
  let i = 0; for (let k = 0; k < SEGS.length; k++) if (t >= SEGS[k][1]) i = k;
  let mix = 0, j = -1;
  if (i + 1 < SEGS.length && t > SEGS[i + 1][1] - DIS / 2) { j = i + 1; mix = smooth(SEGS[j][1] - DIS / 2, SEGS[j][1] + DIS / 2, t); }
  else if (i > 0 && t < SEGS[i][1] + DIS / 2) { j = i - 1; mix = 1 - smooth(SEGS[i][1] - DIS / 2, SEGS[i][1] + DIS / 2, t); }
  const ea = renderScene(SEGS[i][0], t, RTA); let eb = 1;
  if (j >= 0 && mix > 0.001) eb = renderScene(SEGS[j][0], t, RTB);
  composite(j >= 0 ? mix : 0, ea, eb);
  updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildGlobe(); window.renderAt(0); return true; })();
