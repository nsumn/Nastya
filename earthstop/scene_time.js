import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you watched Times Square since Earth was born?" — one fixed camera at Broadway & 7th Ave, eras swap in place.
// Facts (all sourced, see HANDOFF): Earth 4.54 Ga; Fordham gneiss ~1.1 Ga; Manhattan schist ~450 Ma (Taconic), Laurentia near the equator;
// Pangaea (mountains ~Andes scale); Palisades ~201 Ma + Riker Hill dinosaur tracks; ~1,000 ft of ice (NYC Parks); 1609 forest + Wickquasgeck trail = Broadway; Times Square named April 1904.
// =================== timeline ===================
const REW = 3.5, LAVA = 4.3, OCEAN = 9.0, GREN = 14.0, TACO = 19.0, PANG = 26.0, RIFT = 31.5, ICE = 37.5, WOODS = 43.5, OLD = 49.5, NOW = 55.5, T_END = 58.5;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 4540;
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
function shoot(scene, camera, exp = 1) { camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.toneMappingExposure = exp; renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera); }
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
// =================== one world, one camera at Broadway & 7th Ave (origin, looking north = -z); each era is a group ===================
const world = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.1, 9000);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); world.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 900 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
world.add(sun, sun.target); sun.target.position.set(0, 0, -70);
world.fog = new THREE.Fog(0xffffff, 300, 3000);
const dome = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uSunSize: { value: 0.0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 uTop, uBot, uSunDir, uSunCol; uniform float uSunSize; varying vec3 vD;
    void main(){ float e=max(vD.y,0.0); vec3 c=mix(uBot,uTop,pow(e,0.55)); float s=dot(normalize(vD),normalize(uSunDir));
      c+=uSunCol*(smoothstep(1.0-uSunSize,1.0-uSunSize*0.6,s)*1.5+pow(max(s,0.0),40.0)*0.25); gl_FragColor=vec4(c,1.0); }` }));
world.add(dome);
// ---- noise
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const h = (i, j) => hash(i * 157.31 + j * 311.77); const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); }
function fbm(x, y, o = 4) { let a = 0, s = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { a += vnoise(x * f, y * f) * s; n += s; s *= 0.5; f *= 2.03; } return a / n; }
const near = (x, z, r0, r1) => smooth(r0, r1, Math.hypot(x, z - 0));
const terMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
function terrain(parent, hf, cf, o = {}) { const w = o.w || 2400, d = o.d || 2400, seg = o.seg || 150, cz = o.cz ?? -900;
  const g = new THREE.PlaneGeometry(w, d, seg, Math.round(seg * d / w)); g.rotateX(-Math.PI / 2); g.translate(o.cx || 0, 0, cz);
  const p = g.attributes.position, col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = o.raw ? hf(x, z) : lerp(-0.4 + (fbm(x * 0.08, z * 0.08, 2) - 0.5) * 0.5, hf(x, z), near(x, z, 10, 80)); p.setY(i, y); cf(c, x, y, z); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = mesh(g, terMat, false, true); parent.add(m); return m; }
function waterPlane(parent, color, y, o = {}) { const g = new THREE.PlaneGeometry(o.w || 3000, o.d || 3000, o.seg || 80, o.seg || 80); g.rotateX(-Math.PI / 2); g.translate(0, y, o.cz ?? -1100);
  const m = mesh(g, new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.25, metalness: 0.1, flatShading: true, transparent: o.alpha !== undefined, opacity: o.alpha ?? 1 }), false, true); m.userData.base = g.attributes.position.array.slice(); parent.add(m); return m; }
function waves(m, t, amp = 1, k = 1) { const p = m.geometry.attributes.position, b = m.userData.base;
  for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; p.array[i * 3 + 1] = b[i * 3 + 1] + amp * (0.6 * Math.sin(x * 0.045 * k + t * 1.3) + 0.5 * Math.sin(z * 0.06 * k - t * 1.7 + x * 0.02) + 0.3 * Math.sin((x + z) * 0.11 * k + t * 2.3)) * smooth(0, 30, Math.hypot(x, z)) ; }
  p.needsUpdate = true; m.geometry.computeVertexNormals(); }
const puffs = makeSmoke(world, 3500);
const ERA = {}; const eraGroup = name => { const g = new THREE.Group(); g.visible = false; world.add(g); ERA[name] = { g }; return g; };
// =================== LAVA (4.5 billion years ago) ===================
{ const g = eraGroup('lava');
  terrain(g, (x, z) => { const n = fbm(x * 0.012 + 3, z * 0.012, 5); return lerp(-3, (n - 0.56) * 60 + 50 * smooth(700, 1500, -z) * fbm(x * 0.003, z * 0.003), near(x, z, 30, 110)); },
    (c, x, y) => c.set(y < 1.5 ? '#6a2a12' : y < 8 ? '#3a302c' : '#4c4038').offsetHSL(0, 0, (hash(x * 0.3 + y) - 0.5) * 0.05), { raw: true, seg: 300 });
  const ledge = mesh(new THREE.DodecahedronGeometry(5, 0), M('#3a302c', { flatShading: true })); ledge.scale.set(1.0, 0.35, 0.8); ledge.position.set(0, -0.2, 5.5); g.add(ledge);
  const lavaMat = new THREE.ShaderMaterial({ fog: false, uniforms: { uT: { value: 0 } }, vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 p=vW.xz*0.03; float a=n(p+vec2(uT*0.2,uT*0.1))*0.6+n(p*3.0-uT*0.3)*0.4; float crust=smoothstep(0.42,0.62,a);
        vec3 c=mix(vec3(1.9,0.5,0.08),vec3(2.6,1.3,0.3),n(p*6.0+uT));  c=mix(c,vec3(0.10,0.04,0.03),crust*0.9); float d=length(vW.xz); c=mix(c,vec3(0.9,0.25,0.06),smoothstep(800.0,2400.0,d));
        gl_FragColor=vec4(c,1.0); }` });
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 1, 1).rotateX(-Math.PI / 2), lavaMat); lava.position.set(0, 0.6, -1500); g.add(lava); ERA.lava.lavaMat = lavaMat;
  ERA.lava.meteors = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 7, 260, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.8, 0.8), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const fl = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); g.add(m, fl);
    ERA.lava.meteors.push({ m, fl, t0: LAVA + 0.3 + i * 0.68 + hash(i) * 0.2, hit: V3(R(-180, 180), 0, R(-700, -300)), dir: V3(R(-0.5, 0.5), -0.55, R(0.2, 0.6)).normalize() }); }
  ERA.lava.look = { top: '#140406', bot: '#ff5018', sunDir: V3(0.4, 0.05, -1), sunCol: '#ff8a40', sunSize: 0.0, fog: '#601a0a', fogN: 150, fogF: 2600, hemiS: '#a85040', hemiG: '#ff7030', hemiI: 1.6, sunC: '#ff9050', sunI: 1.6, sunPos: V3(300, 200, -600), exp: 1.1, camY: 3.0 }; }
// =================== OCEAN (~4 billion years ago) ===================
{ const g = eraGroup('ocean'); ERA.ocean.sea = waterPlane(g, '#2b5866', 0, { seg: 90 });
  for (const [x, z, s] of [[-420, -1200, 60], [380, -900, 38], [900, -1600, 90], [-120, -1900, 50]]) { const r = mesh(new THREE.IcosahedronGeometry(s, 0), M('#3a3634', { flatShading: true })); r.scale.y = 0.45; r.position.set(x, 0, z); g.add(r); }
  ERA.ocean.look = { top: '#6c7686', bot: '#d0b49a', sunDir: V3(-0.3, 0.12, -1), sunCol: '#ffd8a0', sunSize: 0.004, fog: '#a8a49e', fogN: 300, fogF: 2600, hemiS: '#c8ccd4', hemiG: '#3a4a50', hemiI: 1.1, sunC: '#ffe0c0', sunI: 2.0, sunPos: V3(-200, 120, -600), exp: 1.0, camY: 3.2 }; }
// =================== GRENVILLE MOUNTAINS (1.1 billion years ago) ===================
{ const g = eraGroup('gren');
  const ridge = (x, z) => { let a = 0, s = 1, f = 0.0022; for (let i = 0; i < 5; i++) { a += s * (1 - Math.abs(vnoise(x * f + 7, z * f) * 2 - 1)); s *= 0.5; f *= 2.1; } return a; };
  ERA.gren.t = terrain(g, (x, z) => ridge(x, z) * 260 * smooth(150, 700, -z) + fbm(x * 0.03, z * 0.03, 3) * 6, (c, x, y) => c.set(y > 300 ? '#8c8a88' : y > 120 ? '#6e625a' : '#7c6a58').offsetHSL(0, 0, (hash(x + y) - 0.5) * 0.05));
  ERA.gren.look = { top: '#5f8fc8', bot: '#d8e2ea', sunDir: V3(0.5, 0.35, -1), sunCol: '#fff4e0', sunSize: 0.003, fog: '#c8d4de', fogN: 400, fogF: 3200, hemiS: '#cfe0ff', hemiG: '#6a5a4a', hemiI: 1.0, sunC: '#fff0dc', sunI: 3.0, sunPos: V3(300, 260, -300), exp: 1.0, camY: 2.0 }; }
// =================== TACONIC COLLISION (450 million years ago, near the equator) ===================
{ const g = eraGroup('taco'); ERA.taco.sea = waterPlane(g, '#2ea6ae', 0, { seg: 70, rough: 0.2 });
  terrain(g, (x, z) => (x < -60 ? (fbm(x * 0.006, z * 0.006, 4) * 140 - 20) * smooth(-60, -300, x) : -12) + (x < -60 ? 3 : 0), (c, x, y) => c.set(y < 2 ? '#c8b48a' : '#6a5a4c'), { cx: -900 });
  ERA.taco.volcs = [];
  for (const [x, z, h, r] of [[430, -620, 330, 330], [700, -900, 440, 420], [260, -1150, 280, 300], [900, -1300, 380, 380]]) { const vg = new THREE.Group(); g.add(vg);
    const cone = mesh(new THREE.ConeGeometry(r, h, 10, 3), M('#4a3e38', { flatShading: true })); cone.position.y = h / 2 - 10; vg.add(cone);
    const glow = mesh(new THREE.CircleGeometry(r * 0.12, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), fog: false })); glow.position.y = h - 10.5; vg.add(glow);
    ERA.taco.volcs.push({ vg, x, z, h, ph: R(0, 6) }); }
  ERA.taco.look = { top: '#2f6fd8', bot: '#cfe6f6', sunDir: V3(0.1, 1.0, -0.2), sunCol: '#fffbe8', sunSize: 0.004, fog: '#d6e8f2', fogN: 500, fogF: 3600, hemiS: '#d8ecff', hemiG: '#3a8a8a', hemiI: 1.1, sunC: '#fffaf0', sunI: 3.4, sunPos: V3(40, 400, -40), exp: 1.0, camY: 2.6 }; }
// =================== PANGAEA (~300-250 million years ago) ===================
{ const g = eraGroup('pang');
  const ridge = (x, z) => { let a = 0, s = 1, f = 0.0016; for (let i = 0; i < 5; i++) { a += s * (1 - Math.abs(vnoise(x * f + 31, z * f + 5) * 2 - 1)); s *= 0.5; f *= 2.1; } return a; };
  terrain(g, (x, z) => { const dunes = 5 * Math.sin(x * 0.035 + fbm(x * 0.01, z * 0.01) * 6) * Math.cos(z * 0.012) + fbm(x * 0.02, z * 0.02) * 6; return dunes * near(x, z, 8, 60) + ridge(x, z) * 420 * smooth(900, 1700, -z); },
    (c, x, y) => c.set(y > 420 ? '#f2efe8' : y > 60 ? '#8a5a40' : '#d8834a').offsetHSL(0, 0, (hash(x * 0.7 + y) - 0.5) * 0.05), { d: 3200, cz: -1300, seg: 170 });
  ERA.pang.look = { top: '#5a8ac0', bot: '#f2cc98', sunDir: V3(-0.4, 0.4, -1), sunCol: '#fff0d0', sunSize: 0.004, fog: '#f0d2a8', fogN: 500, fogF: 4200, hemiS: '#ffe8c8', hemiG: '#a05a30', hemiI: 1.0, sunC: '#fff0d8', sunI: 3.2, sunPos: V3(-300, 300, -200), exp: 1.0, camY: 2.2 }; }
// =================== RIFT + DINOSAURS (201 million years ago) ===================
{ const g = eraGroup('rift');
  terrain(g, (x, z) => { const valley = -6 + Math.abs(x + 200 + 20 * Math.sin(z * 0.004)) * 0.05; const cliff = 90 * smooth(120, 170, x) + 60 * smooth(-200, -260, -x) * 0; return Math.min(valley + fbm(x * 0.02, z * 0.02) * 4, 40) * 0.6 + cliff + fbm(x * 0.004, z * 0.004) * 30 * smooth(300, 900, -z); },
    (c, x, y) => c.set(y > 60 ? '#3a3a40' : y < -1 ? '#7a3a2a' : '#9a4a34').offsetHSL(0, 0, (hash(x * 0.9 + y) - 0.5) * 0.05));
  ERA.rift.lake = waterPlane(g, '#3a6a6a', -1.2, { seg: 60, rough: 0.15 });
  // conifers + ferns
  const coneG = new THREE.ConeGeometry(2.6, 11, 7), trunkG = new THREE.CylinderGeometry(0.35, 0.45, 3, 6), fernG = new THREE.ConeGeometry(1.6, 1.2, 6);
  for (let i = 0; i < 160; i++) { const x = R(-90, 140), z = R(-600, -40); if (Math.abs(x) < 25 && z > -120) continue; const s = R(0.8, 1.8);
    const tr = mesh(trunkG, M('#5a4030')); tr.position.set(x, 1.5 * s - 2, z); tr.scale.setScalar(s); g.add(tr); const c = mesh(coneG, M(pick(['#2f5a32', '#3a6a3a', '#26502e']), { flatShading: true })); c.position.set(x, 8 * s - 2, z); c.scale.setScalar(s); g.add(c); }
  for (let i = 0; i < 120; i++) { const x = R(-80, 100), z = R(-160, -15); if (Math.abs(x) < 6 && z > -40) continue; const f = mesh(fernG, M(pick(['#4a8a3a', '#5a9a40']), { flatShading: true })); f.position.set(x, -0.6, z); f.scale.set(1, R(0.6, 1.2), 1); g.add(f); }
  // the glowing fissure + its smoke far away (the Palisades magma)
  const fis = mesh(new THREE.BoxGeometry(900, 3, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.2, 0.3), fog: false })); fis.position.set(-80, 4, -1300); fis.rotation.y = 0.15; g.add(fis);
  // dinosaurs: small two-legged theropods (the kind that left Grallator / Eubrontes tracks)
  ERA.rift.dinos = [];
  for (let i = 0; i < 7; i++) { const d = new THREE.Group(); const skin = M(pick(['#6a7a3a', '#7a6a3a', '#5a6a40']), { flatShading: true }); const s = i === 2 ? 3.2 : R(1.6, 2.2);
    const body = mesh(new THREE.SphereGeometry(0.6, 8, 6), skin); body.scale.set(1.6, 0.9, 0.8); body.position.y = 1.5; d.add(body);
    const tail = mesh(new THREE.ConeGeometry(0.42, 2.6, 6).rotateZ(Math.PI / 2), skin); tail.position.set(-1.9, 1.6, 0); d.add(tail);
    const neck = mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.1, 6), skin); neck.position.set(0.9, 2.1, 0); neck.rotation.z = -0.7; d.add(neck);
    const head = mesh(new THREE.BoxGeometry(0.75, 0.3, 0.3), skin); head.position.set(1.45, 2.55, 0); d.add(head);
    const legs = [-0.25, 0.25].map(zz => { const L = new THREE.Group(); L.position.set(0.1, 1.4, zz); d.add(L); const th = mesh(new THREE.CylinderGeometry(0.16, 0.1, 1.4, 5), skin); th.position.y = -0.7; L.add(th); const ft = mesh(new THREE.BoxGeometry(0.4, 0.08, 0.2), M('#4a4030')); ft.position.set(0.12, -1.4, 0); L.add(ft); return L; });
    d.scale.setScalar(s); g.add(d); ERA.rift.dinos.push({ d, legs, x0: -32 + i * 7 + R(-2, 2), z: -16 - i * 4.5 + R(-1, 1), v: R(2.2, 3.2), ph: R(0, 6), s }); }
  ERA.rift.look = { top: '#6f9ac8', bot: '#e8dcc0', sunDir: V3(0.6, 0.3, -1), sunCol: '#fff0d0', sunSize: 0.004, fog: '#d8d0b8', fogN: 300, fogF: 2600, hemiS: '#e0ecff', hemiG: '#6a4a30', hemiI: 1.0, sunC: '#fff0dc', sunI: 3.0, sunPos: V3(250, 220, -200), exp: 1.0, camY: 2.0 }; }
// =================== ICE (~20,000 years ago): the wall of ice rolls over, then melts back ===================
{ const g = eraGroup('ice');
  terrain(g, (x, z) => fbm(x * 0.01, z * 0.01, 3) * 6 - 1, (c, x, y) => c.set(y > 2 ? '#8a8a6a' : '#7a7f66').offsetHSL(0, 0, (hash(x + y * 3) - 0.5) * 0.06));
  for (let i = 0; i < 40; i++) { const b = mesh(new THREE.IcosahedronGeometry(R(0.6, 3.5), 0), M('#8a8682', { flatShading: true })); b.position.set(R(-120, 120), 0.2, R(-260, -10)); b.rotation.set(R(0, 3), R(0, 3), 0); g.add(b); }
  // the ice front: a faceted wall 305 m (1,000 ft) high, 3 km wide, with a long body behind
  const fg = new THREE.PlaneGeometry(3600, 305, 70, 12); const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), y = fp.getY(i); fp.setZ(i, (fbm(x * 0.01, y * 0.02, 3) - 0.5) * 60 + (y + 152) * 0.15); fp.setY(i, y + (fbm(x * 0.02, 9) - 0.5) * 18 * smooth(100, 152, y)); }
  fg.computeVertexNormals(); const iceM = new THREE.MeshStandardMaterial({ color: '#e6f2fb', emissive: '#6a9ac0', emissiveIntensity: 0.12, roughness: 0.5, flatShading: true });
  const ice = new THREE.Group(); g.add(ice); const front = mesh(fg, iceM, false, true); front.position.y = 152; ice.add(front);
  const topS = mesh(new THREE.BoxGeometry(3600, 10, 4000), iceM, false, true); topS.position.set(0, 300, -2000); ice.add(topS);
  ERA.ice.ice = ice;
  // the Empire State Building as a ghost for scale (roof 1,250 ft = 381 m; tip 1,454 ft = 443 m)
  const ghost = new THREE.Group(); ghost.position.set(-120, 0, -760); g.add(ghost); const gm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false, fog: false });
  for (const [w, h, y] of [[56, 22, 11], [44, 250, 147], [34, 60, 302], [24, 40, 352], [14, 20, 372], [4, 62, 412]]) { const b = mesh(BOX, gm, false, false); b.scale.set(w, h, w * 0.7); b.position.y = y; ghost.add(b); }
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(44, 250, 31)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, fog: false })); edges.position.y = 147; ghost.add(edges);
  ERA.ice.ghost = ghost;
  ERA.ice.look = { top: '#7ea6d0', bot: '#e4ecf2', sunDir: V3(0.6, 0.25, -1), sunCol: '#fff8ec', sunSize: 0.003, fog: '#dfe8ef', fogN: 400, fogF: 3600, hemiS: '#e8f2ff', hemiG: '#6a6a5a', hemiI: 1.1, sunC: '#fff6ec', sunI: 2.6, sunPos: V3(300, 200, 100), exp: 1.0, camY: 1.8 }; }
// =================== 1609: fall forest, a stream and the Wickquasgeck trail (future Broadway) ===================
const trailX = z => 5 * Math.sin(z * 0.018) + z * 0.04;
{ const g = eraGroup('woods');
  terrain(g, (x, z) => fbm(x * 0.008, z * 0.008, 4) * 18 * near(x, z, 15, 120) + fbm(x * 0.05, z * 0.05, 2) * 0.5 - 0.3, (c, x, y, z) => { const tr = Math.abs(x - trailX(z)) < 1.6 && z < 10; c.set(tr ? '#8a6a48' : y > 10 ? '#6a7a3a' : '#5a7a34').offsetHSL(0, 0, (hash(x * 1.3 + z) - 0.5) * 0.06); }, { seg: 200, w: 1600, d: 1600, cz: -600, raw: true });
  const crown = new THREE.IcosahedronGeometry(1, 0), trunk = new THREE.CylinderGeometry(0.3, 0.5, 1, 6);
  const FALL = ['#d8622a', '#e8a030', '#b8382a', '#f0c040', '#6a8a3a', '#9aaa3a', '#c84a2a'];
  for (let i = 0; i < 900; i++) { const z = R(-700, 5), x = R(-260, 260); if (Math.abs(x - trailX(z)) < 4.5 || Math.hypot(x, z) < 6) continue; const s = R(0.8, 1.6), y0 = fbm(x * 0.008, z * 0.008, 4) * 18 * near(x, z, 15, 120);
    const tk = mesh(trunk, M('#4a3a2a')); tk.scale.set(s, 6 * s, s); tk.position.set(x, y0 + 3 * s, z); g.add(tk);
    const c = mesh(crown, M(pick(FALL), { flatShading: true })); c.scale.set(4.2 * s, 3.6 * s, 4.2 * s); c.position.set(x, y0 + 7.5 * s, z); g.add(c); }
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(5, 900, 1, 60).rotateX(-Math.PI / 2), M('#4a7a9a', { roughness: 0.2 })); stream.position.set(38, 0.4, -450); const sp = stream.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setX(i, sp.getX(i) + 10 * Math.sin(sp.getZ(i) * 0.02)); g.add(stream);
  ERA.woods.deer = [];
  for (const [x, z] of [[-9, -34], [-13, -38]]) { const d = new THREE.Group(); const fur = M('#8a5a3a', { flatShading: true }); const b = mesh(new THREE.SphereGeometry(0.5, 8, 6), fur); b.scale.set(1.5, 0.8, 0.7); b.position.y = 1.1; d.add(b);
    const n = mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 6), fur); n.position.set(0.7, 1.5, 0); n.rotation.z = -0.5; d.add(n); const h = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.22), fur); h.position.set(0.95, 1.85, 0); d.add(h);
    for (const [lx, lz] of [[0.5, 0.18], [0.5, -0.18], [-0.5, 0.18], [-0.5, -0.18]]) { const l = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.9, 5), fur); l.position.set(lx, 0.45, lz); d.add(l); }
    d.position.set(x, fbm(x * 0.008, z * 0.008, 4) * 18 * near(x, z, 15, 120), z); d.rotation.y = 0.8; g.add(d); ERA.woods.deer.push(d); }
  ERA.woods.look = { top: '#5f92d0', bot: '#f2dcb8', sunDir: V3(-0.7, 0.25, -1), sunCol: '#ffe6b8', sunSize: 0.004, fog: '#e8d8bc', fogN: 120, fogF: 1300, hemiS: '#ffe8c8', hemiG: '#5a6a30', hemiI: 1.0, sunC: '#ffd8a0', sunI: 2.8, sunPos: V3(-300, 160, -200), exp: 1.0, camY: 1.7 }; }
// =================== TIMES SQUARE: 1904 (Longacre -> Times Square) and TODAY share the street; buildings, signs and people differ ===================
const WORDS = ['SHOW', 'LIVE', 'NYC', 'TONIGHT', 'BROADWAY', 'SALE', 'NEW', 'COLA', 'MUSIC', 'DANCE', 'NEWS', 'TICKETS', 'WOW', 'SNACKS', 'PLAY', 'FUN'];
const BB_COLS = [['#ff2a6a', '#ffb02a'], ['#2a6aff', '#2affe0'], ['#8a2aff', '#ff2ad8'], ['#ff5a1a', '#ffe02a'], ['#1aff6a', '#1a8aff'], ['#ff1a1a', '#ff9a9a'], ['#ffe01a', '#ff6a1a'], ['#1ad8ff', '#ffffff']];
const bbTex = WORDS.map((w, i) => canvasTex(256, 320, (g, W_, H_) => { const [a, b] = BB_COLS[i % BB_COLS.length]; const gr = g.createLinearGradient(0, 0, W_, H_); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W_, H_);
  g.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(R(0, W_), R(0, H_), R(20, 80), 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.font = `800 ${w.length > 6 ? 46 : 72}px Inter`; g.textAlign = 'center'; g.fillText(w, W_ / 2, H_ / 2 + 20); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, H_ - 40, W_, 40); g.fillStyle = '#fff'; g.font = '600 20px Inter'; g.fillText('TIMES SQ', W_ / 2, H_ - 13); }));
const bbMats = bbTex.map(tx => new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, fog: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
function facadeTex(base, win, lit, cols = 8, rows = 12) { return canvasTex(256, 384, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = rnd() < lit ? pick(['#ffd88a', '#ffe8b8', '#cfe4ff']) : win; g.fillRect(c * w / cols + 5, r * h / rows + 6, w / cols - 10, h / rows - 12); } }); }
const STREET_W = 34;
function streetBase(g, old) {
  const road = mesh(new THREE.PlaneGeometry(STREET_W, 900).rotateX(-Math.PI / 2), M(old ? '#7a6e60' : '#2c2e33', { roughness: 0.9 }), false, true); road.position.set(0, 0.01, -380); g.add(road);
  for (const s of [-1, 1]) { const sw = mesh(new THREE.BoxGeometry(5, 0.2, 900), M(old ? '#9a8e7e' : '#8e8c88'), false, true); sw.position.set(s * (STREET_W / 2 - 2.5), 0.1, -380); g.add(sw); }
  if (!old) { const plaza = mesh(new THREE.PlaneGeometry(14, 140).rotateX(-Math.PI / 2), M('#c84a3a', { roughness: 0.8 }), false, true); plaza.position.set(0, 0.03, -40); g.add(plaza);
    for (let z = 20; z > -500; z -= 9) for (const x of [-7.5, 7.5]) { const d = mesh(new THREE.PlaneGeometry(0.2, 3).rotateX(-Math.PI / 2), M('#e8e6df'), false, true); d.position.set(x, 0.04, z); g.add(d); } }
  else for (const x of [-4, -2.6]) { const rail = mesh(new THREE.BoxGeometry(0.12, 0.08, 900), M('#3a3a3a', { metalness: 0.6 })); rail.position.set(x, 0.05, -380); g.add(rail); }
}
function buildings(g, old) {
  const texs = old ? ['#8a4a34', '#9a5a3c', '#7a3e2e', '#a8846a', '#b89a7a'].map(c => facadeTex(c, '#2a2420', 0.05, 6, 8)) : ['#3a4450', '#5a6470', '#2a3038', '#6a6a70', '#4a5560'].map(c => facadeTex(c, '#1a2028', 0.55, 8, 14));
  for (const s of [-1, 1]) { let z = 22;
    while (z > -470) { const len = R(14, 28), h = old ? R(14, 30) : R(45, 190), d = 30; const x = s * (STREET_W / 2 + d / 2), cz = z - len / 2;
      const tx = pick(texs).clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(Math.max(1, len / 14), Math.max(1, h / (old ? 24 : 40)));
      const mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85, emissive: old ? '#000000' : '#ffffff', emissiveMap: old ? null : tx, emissiveIntensity: old ? 0 : 0.35 });
      const b = mesh(BOX, mat); b.scale.set(d, h, len - 0.6); b.position.set(x, h / 2, cz); g.add(b);
      if (old) { bx(d + 0.8, 0.8, len - 0.2, '#d8c8a8', x, h, cz, g); if (rnd() < 0.35) { const sg = canvasTex(256, 64, (gg, w, hh) => { gg.fillStyle = pick(['#f2e8d0', '#2a3a2a', '#5a2a1a']); gg.fillRect(0, 0, w, hh); gg.fillStyle = gg.fillStyle === '#f2e8d0' ? '#3a2a1a' : '#f2e8d0'; gg.font = '700 30px "Source Serif 4"'; gg.textAlign = 'center'; gg.fillText(pick(['HOTEL', 'THEATRE', 'CIGARS', 'OYSTERS', 'HARDWARE', 'CAFE']), w / 2, 44); });
          const p = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(12, len - 2), 3), new THREE.MeshStandardMaterial({ map: sg })); p.position.set(s * (STREET_W / 2 - 0.05), R(4.5, 8), cz); p.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(p); } }
      else { const nB = 1 + Math.floor(rnd() * 3); for (let k = 0; k < nB; k++) { const bw = Math.min(len - 2, R(9, 20)), bh = R(8, 26), y = R(7, Math.min(h - bh / 2 - 2, 80)); if (y < bh / 2 + 4) continue;
          const p = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), pick(bbMats)); p.position.set(s * (STREET_W / 2 - 0.1 - k * 0.02), y, cz + R(-1, 1)); p.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(p); } }
      z -= len; } }
  // the tower at the end of the square (One Times Square / the 1904 Times Building), splitting the street
  const tw = new THREE.Group(); tw.position.set(0, 0, -190); g.add(tw);
  if (old) { const tx = facadeTex('#d8ccb0', '#4a4438', 0.0, 4, 26); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; const b = mesh(BOX, new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); b.scale.set(16, 111, 22); b.position.y = 55.5; tw.add(b);
    bx(17, 3, 23, '#c8bca0', 0, 111, 0, tw); bx(0.4, 14, 0.4, '#3a3a3a', 0, 118, 0, tw); const flag = bx(5, 3, 0.1, '#c83a2a', 2.6, 123, 0, tw); }
  else { const b = mesh(BOX, M('#2a2c32')); b.scale.set(16, 111, 22); b.position.y = 55.5; tw.add(b);
    for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(15, 14), pick(bbMats)); p.position.set(0, 14 + k * 15, 11.05); tw.add(p); }
    bx(0.6, 12, 0.6, '#9a9a9a', 0, 117, 0, tw); const ball = mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.6), fog: false })); ball.position.y = 124; tw.add(ball); }
}
function crowd(g, n, old) { const list = [];
  for (let i = 0; i < n; i++) { const opts = old ? { top: pick(['#2a2a2e', '#3a3028', '#4a3a2a', '#1e2230', '#5a4a3a', '#e8e0d0']), bottom: pick(['#2a2a2e', '#3a3028', '#1e1e22']), cap: rnd() < 0.5, dress: rnd() < 0.3, shorts: false } : {};
    const p = makePerson(rnd, opts); g.add(p.outer); const onSide = rnd() < 0.6; const side = rnd() < 0.5 ? -1 : 1;
    list.push({ p, x: onSide ? side * R(13.5, 16.5) : R(-6, 6), z0: R(-260, 25), v: (rnd() < 0.5 ? 1 : -1) * R(1.0, 1.5), ph: R(0, 6), idle: rnd() < 0.25 }); }
  return list; }
function poseCrowd(list, t) { for (const c of list) { const z = c.idle ? c.z0 : wrapR(c.z0 + c.v * t, -260, 25); c.p.outer.position.set(c.x, 0.95 + (Math.abs(c.x) > 12 ? 0.2 : 0), z); c.p.outer.rotation.y = c.idle ? c.ph : (c.v > 0 ? 0 : Math.PI); if (c.idle) poseIdle(c.p, t, c.ph); else poseWalk(c.p, t * 5.5 + c.ph); c.p.outer.visible = Math.hypot(c.x - cam.position.x, z - cam.position.z) > 1.5; } }
{ const g = eraGroup('now'); streetBase(g, false); buildings(g, false); ERA.now.crowd = crowd(g, 160, false);
  ERA.now.taxis = [];
  for (let i = 0; i < 16; i++) { const tg = new THREE.Group(); const y = M('#f2c12e', { roughness: 0.35, metalness: 0.3 }); bx(4.4, 0.75, 1.85, y, 0, 0.7, 0, tg); bx(2.4, 0.6, 1.7, y, -0.2, 1.35, 0, tg); bx(2.3, 0.5, 1.75, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.2, 1.35, 0, tg); bx(0.6, 0.2, 0.3, M('#fff6d8', { emissive: '#fff6d8', emissiveIntensity: 1 }), -0.2, 1.75, 0, tg);
    for (const [wx, wz] of [[1.4, 0.85], [1.4, -0.85], [-1.4, 0.85], [-1.4, -0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).rotateX(Math.PI / 2), M('#151515')); w.position.set(wx, 0.34, wz); tg.add(w); }
    tg.rotation.y = Math.PI / 2; g.add(tg); ERA.now.taxis.push({ g: tg, x: pick([-10.5, -13, 10.5]) , z0: R(-500, 20), v: R(4, 9) }); }
  ERA.now.look = { top: '#10143a', bot: '#d8705a', sunDir: V3(0.6, 0.02, -1), sunCol: '#ff9a60', sunSize: 0.0, fog: '#3a3048', fogN: 200, fogF: 1800, hemiS: '#6a70a8', hemiG: '#ff8a5a', hemiI: 1.0, sunC: '#ffb080', sunI: 0.6, sunPos: V3(200, 60, -100), exp: 1.15, camY: 1.7 }; }
{ const g = eraGroup('old'); streetBase(g, true); buildings(g, true); ERA.old.crowd = crowd(g, 70, true);
  ERA.old.carts = [];
  for (let i = 0; i < 6; i++) { const cg = new THREE.Group(); const hb = M('#5a3a24', { flatShading: true }); const horse = mesh(new THREE.BoxGeometry(2.0, 0.8, 0.6), hb); horse.position.set(2.2, 1.5, 0); cg.add(horse);
    const hh = mesh(new THREE.BoxGeometry(0.8, 0.35, 0.3), hb); hh.position.set(3.3, 2.1, 0); hh.rotation.z = 0.6; cg.add(hh);
    const legs = []; for (const [lx, lz] of [[2.9, 0.2], [2.9, -0.2], [1.5, 0.2], [1.5, -0.2]]) { const l = new THREE.Group(); l.position.set(lx, 1.1, lz); cg.add(l); const lm = mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), hb); lm.position.y = -0.55; l.add(lm); legs.push(l); }
    bx(2.4, 1.3, 1.6, M('#1e1e22', { flatShading: true }), -0.6, 1.5, 0, cg); bx(2.6, 0.1, 1.8, '#3a2a1a', -0.6, 2.2, 0, cg);
    for (const [wx, wz] of [[0.3, 0.85], [0.3, -0.85], [-1.4, 0.85], [-1.4, -0.85]]) { const w = mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 14), M('#3a2a1a')); w.position.set(wx, 0.55, wz); cg.add(w); }
    cg.rotation.y = Math.PI / 2; g.add(cg); ERA.old.carts.push({ g: cg, legs, x: pick([-10, 9, 12]), z0: R(-300, 10), v: R(2.0, 3.2) * (rnd() < 0.5 ? 1 : -1) }); }
  const trolley = new THREE.Group(); bx(2.4, 2.6, 10, M('#9a2a1e', { flatShading: true }), 0, 1.8, 0, trolley); bx(2.45, 0.9, 9.6, M('#e8dcc0'), 0, 2.4, 0, trolley); bx(2.6, 0.2, 10.4, '#3a2a1a', 0, 3.2, 0, trolley); trolley.position.set(-3.3, 0, -60); g.add(trolley); ERA.old.trolley = trolley;
  ERA.old.look = { top: '#8aa8c8', bot: '#efe2c8', sunDir: V3(0.5, 0.5, -1), sunCol: '#fff4e0', sunSize: 0.003, fog: '#e2d6c0', fogN: 150, fogF: 1400, hemiS: '#efe6d8', hemiG: '#7a6a5a', hemiI: 1.1, sunC: '#fff0d8', sunI: 2.6, sunPos: V3(200, 260, -120), exp: 1.0, camY: 1.7 }; }
// =================== era timeline ===================
const ORDER = [['lava', LAVA], ['ocean', OCEAN], ['gren', GREN], ['taco', TACO], ['pang', PANG], ['rift', RIFT], ['ice', ICE], ['woods', WOODS], ['old', OLD], ['now', NOW]];
const REWIND = ['now', 'old', 'woods', 'ice', 'rift', 'pang', 'taco', 'gren', 'ocean', 'lava'];
function eraAt(t) { if (t < REW) return 'now'; if (t < LAVA) return REWIND[Math.min(9, Math.floor((t - REW) / (LAVA - REW) * 10))]; let e = 'lava'; for (const [n, T] of ORDER) if (t >= T) e = n; return e; }
const YEARS = { lava: '4.5 billion years ago', ocean: '4 billion years ago', gren: '1.1 billion years ago', taco: '450 million years ago', pang: '250 million years ago', rift: '201 million years ago', ice: '20,000 years ago', woods: '1609', old: '1904', now: 'Today' };
const SUBS = { lava: 'NO OXYGEN · NO LIFE ON LAND', ocean: 'NO PLANTS ON LAND YET', gren: "NYC'S OLDEST ROCK (FORDHAM GNEISS)", taco: 'MANHATTAN SCHIST · NEAR THE EQUATOR', pang: 'SUPERCONTINENT PANGAEA', rift: 'ATLANTIC STARTS TO OPEN', ice: 'ICE ~1,000 FT THICK', woods: 'MANNAHATTA', old: 'LONGACRE SQUARE → TIMES SQUARE', now: 'TIMES SQUARE' };
let curEra = '';
function setEra(e) { if (e === curEra) return; curEra = e; for (const k in ERA) ERA[k].g.visible = k === e; const L = ERA[e].look; const u = dome.material.uniforms;
  u.uTop.value.set(L.top); u.uBot.value.set(L.bot); u.uSunDir.value.copy(L.sunDir).normalize(); u.uSunCol.value.set(L.sunCol); u.uSunSize.value = L.sunSize;
  world.fog.color.set(L.fog); world.fog.near = L.fogN; world.fog.far = L.fogF; hemi.color.set(L.hemiS); hemi.groundColor.set(L.hemiG); hemi.intensity = L.hemiI;
  sun.color.set(L.sunC); sun.intensity = L.sunI; sun.position.copy(L.sunPos); }
// =================== per-era motion ===================
const _p = new THREE.Vector3();
function updateEra(e, t) {
  puffs.begin();
  if (e === 'lava') { ERA.lava.lavaMat.uniforms.uT.value = t; smokeMat.uniforms.uTint.value.set('#5a3a30');
    for (const M_ of ERA.lava.meteors) { const k = (t - M_.t0) / 0.5; M_.m.visible = k > 0 && k < 1; if (M_.m.visible) { M_.m.position.copy(M_.hit).addScaledVector(M_.dir, -(1 - k) * 1100 - 130); M_.m.lookAt(M_.m.position.clone().add(M_.dir)); }
      const f = t - (M_.t0 + 0.5); M_.fl.visible = f > 0 && f < 1.0; if (M_.fl.visible) { M_.fl.position.copy(M_.hit); M_.fl.scale.setScalar(15 + f * 160); M_.fl.material.opacity = Math.pow(1 - f, 2); }
      for (let j = 0; j < 8; j++) { const age = f - j * 0.12; if (age > 0 && age < 2.5) { _p.copy(M_.hit).add(V3((hash(j + M_.t0) - 0.5) * 60, age * 70, (hash(j * 3 + M_.t0) - 0.5) * 60)); puffs.add(_p, 60 + age * 90, 0.5 * (1 - age / 2.5)); } } } }
  else if (e === 'ocean') waves(ERA.ocean.sea, t, 1.3, 1);
  else if (e === 'gren') ERA.gren.t.scale.y = lerp(0.1, 1, ease((t - GREN) / (TACO - GREN - 0.3)));
  else if (e === 'taco') { waves(ERA.taco.sea, t, 0.35, 1.6); const u = clamp((t - TACO) / (PANG - TACO), 0, 1); smokeMat.uniforms.uTint.value.set('#8a8480');
    for (const v of ERA.taco.volcs) { v.vg.position.set(v.x - 300 * u, -40 * (1 - u), v.z); const top = V3(v.vg.position.x, v.vg.position.y + v.h - 10, v.z);
      for (let k = 0; k < 14; k++) { const age = ((t * 0.18 + k / 14 + v.ph) % 1); _p.copy(top).add(V3(age * 140, age * 380, -age * 40)); puffs.add(_p, 50 + age * 260, 0.6 * (1 - age) * smooth(0, 0.08, age)); } } }
  else if (e === 'rift') { waves(ERA.rift.lake, t, 0.12, 2.5); smokeMat.uniforms.uTint.value.set('#6a6460');
    for (const d of ERA.rift.dinos) { const x = d.x0 + d.v * (t - RIFT), ph = (t * d.v * 1.6 / d.s) + d.ph; d.d.position.set(x, -0.3 + Math.abs(Math.sin(ph)) * 0.08 * d.s, d.z); d.d.rotation.y = 0; d.legs[0].rotation.z = Math.sin(ph) * 0.6; d.legs[1].rotation.z = -Math.sin(ph) * 0.6; }
    for (let k = 0; k < 18; k++) { const age = ((t * 0.12 + k / 18) % 1); _p.set(-500 + k * 55, 10 + age * 300, -1300 + age * 40); puffs.add(_p, 80 + age * 260, 0.45 * (1 - age)); } }
  else if (e === 'ice') { const adv = ease((t - ICE) / 3.6), back = ease((t - (ICE + 4.7)) / 1.3); const a2 = clamp((t - ICE) / 3.6, 0, 1); ERA.ice.ice.position.z = t < ICE + 4.7 ? lerp(-1700, 12, a2 * a2) : lerp(12, -1600, back); ERA.ice.ghost.visible = t < ICE + 3.3; }
  else if (e === 'woods') { for (const d of ERA.woods.deer) d.children[2].position.y = 1.85 - 0.5 * smooth(0.4, 0.6, (Math.sin(t * 0.9 + d.position.x) + 1) / 2); }
  else if (e === 'old') { poseCrowd(ERA.old.crowd, t); for (const c of ERA.old.carts) { const z = wrapR(c.z0 + c.v * t, -320, 20); c.g.position.set(c.x, 0, z); c.g.rotation.y = c.v > 0 ? -Math.PI / 2 : Math.PI / 2; c.legs.forEach((l, i) => l.rotation.z = Math.sin(t * 7 + i * 1.6) * 0.4); } ERA.old.trolley.position.z = -80 + 2.5 * (t - OLD); }
  else if (e === 'now') { poseCrowd(ERA.now.crowd, t); for (const c of ERA.now.taxis) { const dir = c.x > 0 ? 1 : -1; c.g.position.set(c.x, 0, wrapR(c.z0 + dir * c.v * t, -500, 20)); c.g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; } }
  puffs.end();
}
function worldCamera(e, t) { const L = ERA[e].look; let ly = L.camY + 4, lz = -80, fov = 62;
  if (e === 'gren' || e === 'pang') ly = L.camY + 9; if (e === 'ice') ly = L.camY + 14 * (1 - smooth(ICE + 2.5, ICE + 3.4, t)) + 4; if (e === 'now' || e === 'old') { ly = L.camY + 14; fov = 64; } if (e === 'woods') ly = L.camY + 2.5; if (e === 'taco') ly = L.camY + 6; if (e === 'lava') ly = L.camY + 1;
  cam.fov = fov; cam.position.set(0.6 * Math.sin(t * 0.13), L.camY, 8 - 0.15 * (t % 6)); cam.lookAt(1.5 * Math.sin(t * 0.09), ly, lz); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.6, 6.8, '4.5 billion years ago:<br>Earth is lava.'],
  [6.9, 8.8, 'Meteorites pound<br>the surface.'],
  [9.3, 11.6, 'Then: oceans.'],
  [11.7, 13.8, 'No plants on land<br>for 4 billion years.'],
  [14.3, 16.5, '1.1 billion years ago:<br>mountains rise.'],
  [16.6, 18.8, "NYC's oldest rock forms."],
  [19.3, 22.4, '450 million years ago:<br>volcanic islands crash in.'],
  [22.5, 24.1, "That crash makes<br>Manhattan's bedrock."],
  [24.2, 25.8, 'And this spot is<br>near the equator.'],
  [26.3, 28.8, "Now you're inside<br>the supercontinent Pangaea."],
  [28.9, 31.3, 'Mountains as tall<br>as the Andes.'],
  [31.8, 34.6, '201 million years ago:<br>the Atlantic starts to open.'],
  [34.7, 37.3, 'Dinosaur footprints from then<br>are still in New Jersey.'],
  [37.8, 40.8, '20,000 years ago:<br>a wall of ice.'],
  [40.9, 43.3, 'About 1,000 feet thick —<br>almost the Empire State Building.'],
  [43.8, 46.4, '1609: a forest.<br>A Lenape trail runs right here…'],
  [46.5, 49.3, '…it will become Broadway.'],
  [49.8, 52.6, '1904: it gets its name —<br>Times Square.'],
  [52.7, 55.3, 'Broadway is older than the grid —<br>that\'s why it cuts across.'],
  [55.8, 58.3, 'Same spot.<br>4.5 billion years.'],
];
function yearsText(t, e) { if (t >= REW && t < LAVA) { const u = (t - REW) / (LAVA - REW); const y = Math.pow(10, lerp(1, Math.log10(4.5e9), u)); return y > 1e9 ? (y / 1e9).toFixed(1) + ' billion years ago' : y > 1e6 ? Math.round(y / 1e6) + ' million years ago' : fmt(y) + ' years ago'; } return YEARS[e]; }
function updateDOM(t, e) {
  el.title.style.opacity = 1 - smooth(3.0, 3.5, t);
  const show = t >= REW && t < T_END; el.stat.innerHTML = '<b></b>THIS SPOT · BROADWAY & 7TH AVE'; el.lab.textContent = ''; el.val.textContent = yearsText(t, e); el.sub.textContent = t >= LAVA ? SUBS[e] : '';
  el.hud.style.opacity = show ? 1 - smooth(T_END, T_END + 0.4, t) : 0; el.val.style.fontSize = el.val.textContent.length > 16 ? '66px' : '98px';
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const fl = Math.max(...ORDER.map(([, T]) => fadeWin(t, T - 0.1, T + 0.28, 0.1)), t >= REW && t < LAVA ? 0.25 + 0.2 * Math.sin(t * 60) : 0);
  el.flash.style.opacity = fl * 0.75;
  // inside the ice: a blue-white veil
  const inIce = fadeWin(t, ICE + 3.45, ICE + 4.85, 0.25); el.veil.style.background = 'linear-gradient(180deg,#bfe0f4,#e8f4fb 60%,#cfe6f2)'; el.veil.style.opacity = inIce;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
window.renderAt = (t) => {
  const e = DEBUG && ERA[DEBUG] ? DEBUG : eraAt(t); setEra(e); updateEra(e, t); worldCamera(e, t);
  smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shoot(world, cam, ERA[e].look.exp);
  updateDOM(t, e); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
