import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you took off your helmet in space?" — classic low-poly; Earth/stars render in km in a background pass, the ISS + astronauts in meters on top.
// Facts: awareness ~10-15 s (NASA/USAF studies, Barratt ~12 s); ~90 s survivable if recompressed; exhale; saliva boils (Armstrong limit);
// swelling (ebullism) but no explosion; no instant freezing; severe sunburn; Jim LeBlanc 1966 chamber accident, woke after 87 s, no lasting harm.
// =================== timeline ===================
const OFF = 4.0, EXHALE = 9.0, SPIT = 15.0, SWELL = 21.0, SUNB = 27.0, FADE = 33.0, DARK = 40.0, RESCUE = 43.5, LOCK = 48.0, BACK = 57.0, T_END = 61.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 1966;
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
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true }); renderer.autoClear = false;
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
// =================== BACKGROUND (km): Earth 400 km below, stars, the Sun ===================
const bg = new THREE.Scene(); bg.background = new THREE.Color('#020308');
const bgCam = new THREE.PerspectiveCamera(50, W / H, 5, 60000);
const RE = 6371, ALT = 420;
bg.add(new THREE.AmbientLight(0x404a60, 0.6)); const bgSun = new THREE.DirectionalLight(0xfff4e8, 3.2); bgSun.position.set(3000, 2600, 5000); bg.add(bgSun);
const SUN_DIR = new THREE.Vector3(3000, 2600, 5000).normalize();
{ const n = 5000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(50000); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false }))); }
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 5), fog: false })); sunDisc.position.copy(SUN_DIR).multiplyScalar(45000); sunDisc.lookAt(0, 0, 0); bg.add(sunDisc);
const earth = new THREE.Group(); const EA = 0.62; earth.position.set(0, -(RE + ALT) * Math.cos(EA), -(RE + ALT) * Math.sin(EA)); bg.add(earth);
async function buildEarth() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json();
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  for (const f of topojson.feature(topo, topo.objects.countries).features) { if (!f.geometry) continue; const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } } }
  const img = g.getImageData(0, 0, MW, MH).data; const land = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const n0 = V3(0, Math.cos(EA), Math.sin(EA)).normalize(), la0 = 35 * Math.PI / 180, lo0 = -62 * Math.PI / 180;
  const EQ = new THREE.Quaternion().setFromUnitVectors(n0, V3(Math.cos(la0) * Math.cos(lo0), Math.sin(la0), -Math.cos(la0) * Math.sin(lo0)));
  const geo = new THREE.IcosahedronGeometry(RE, 90); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new THREE.Color(), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(w.fromBufferAttribute(p, f + k)); v.normalize();
    // our view: the camera looks north-east over the Atlantic toward the US east coast — rotate the lookup so that region faces up
    const q = v.clone().applyQuaternion(EQ);
    const lat = Math.asin(q.y) * 180 / Math.PI, lon = Math.atan2(-q.z, q.x) * 180 / Math.PI, al = Math.abs(lat), j = rnd() * 0.06 - 0.03;
    if (lat < -62 || lat > 78) c.set('#eef3f6'); else if (land(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if (al > 14 && al < 34 && rnd() < 0.7) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.multiplyScalar(0.85); }
    else c.set(al > 45 ? '#24506e' : '#1f5f92'); c.offsetHSL(0, 0, j); for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); earth.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 })));
  const cl = canvasTex(2048, 1024, (g2, w2, h2) => { g2.clearRect(0, 0, w2, h2); for (let i = 0; i < 700; i++) { const x = R(0, w2), y = R(h2 * 0.1, h2 * 0.9), r = R(3, 14); const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); } });
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(RE + 8, 128, 96), new THREE.MeshStandardMaterial({ map: cl, transparent: true, depthWrite: false, opacity: 0.55, roughness: 1 })));
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(RE + 90, 128, 96), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 9.0); gl_FragColor = vec4(0.4,0.65,1.0,1.0)*f*1.1; }' })));
}
// =================== NEAR (meters): ISS truss + modules + arrays, two astronauts ===================
const near = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 2000);
near.add(new THREE.AmbientLight(0x8a94a8, 1.0)); const nSun = new THREE.DirectionalLight(0xfff4e8, 4.0); nSun.position.copy(SUN_DIR).multiplyScalar(50); nSun.castShadow = true; nSun.shadow.mapSize.set(2048, 2048);
Object.assign(nSun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 120 }); nSun.shadow.bias = -0.0004; nSun.shadow.normalBias = 0.01; near.add(nSun, nSun.target);
const earthShine = new THREE.DirectionalLight(0x6a9ad8, 1.2); earthShine.position.set(0, -30, -40); near.add(earthShine);
const ISS = new THREE.Group(); near.add(ISS);
{ const truss = M('#cfd2d6', { metalness: 0.4, roughness: 0.5 }); bx(60, 1.6, 1.6, truss, 0, 0, -4, ISS); for (let x = -29; x <= 29; x += 2) { const s = bx(0.08, 1.6, 2.3, '#8a8e94', x, 0, -4, ISS); s.rotation.x = 0.78; }
  const mod = (len, r, x, y, z, rx, rz) => { const m = mesh(new THREE.CylinderGeometry(r, r, len, 16), M('#e8e6e0', { roughness: 0.6 })); m.position.set(x, y, z); m.rotation.set(rx || 0, 0, rz || 0); ISS.add(m); for (let k = -1; k <= 1; k += 2) { const b = mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.25, 16), M('#9aa0a8')); b.position.copy(m.position); b.rotation.copy(m.rotation); b.translateY(k * len * 0.42); ISS.add(b); } return m; };
  mod(9, 2.1, 0, -3.2, -4, Math.PI / 2, 0); mod(7, 2.1, 0, -3.2, 4.2, Math.PI / 2, 0); mod(6, 1.9, -5.5, -3.2, 3, 0, Math.PI / 2);
  // the airlock with its hatch (Quest-like) next to the work site
  const al = mesh(new THREE.CylinderGeometry(1.8, 1.8, 4, 16), M('#e8e6e0')); al.rotation.z = Math.PI / 2; al.position.set(4.8, -3.0, 2.0); ISS.add(al);
  const hatch = mesh(new THREE.CircleGeometry(0.75, 20), M('#3a3e46', { metalness: 0.5 })); hatch.position.set(6.82, -3.0, 2.0); hatch.rotation.y = Math.PI / 2; ISS.add(hatch);
  const ring = mesh(new THREE.TorusGeometry(0.8, 0.07, 6, 24), M('#d8b030', { metalness: 0.5 })); ring.position.copy(hatch.position); ring.rotation.y = Math.PI / 2; ISS.add(ring);
  // solar arrays
  const arrT = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#1a2a4a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8a050'; g.lineWidth = 2; for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
  const arrM = new THREE.MeshStandardMaterial({ map: arrT, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const a = mesh(new THREE.PlaneGeometry(11, 34), arrM); a.position.set(sx * 24, 0, -4 + sz * 19); a.rotation.x = -Math.PI / 2; ISS.add(a); bx(0.3, 0.3, 36, '#9a9a9a', sx * 24, 0.05, -4 + sz * 19, ISS); }
  for (let x = -8; x <= 8; x += 2) bx(0.06, 0.06, 1.2, '#e8b030', x, 0.9, -4, ISS); // handrails
}
// astronaut builder: white suit, backpack, gloves; helmet = neck ring + clear bubble + gold visor; a cartoon face under the comms cap
function makeAstronaut(withFace) { const A = { g: new THREE.Group() }; const suit = M('#eeeeea', { flatShading: true, roughness: 0.75 }), joint = M('#c8c8c2', { flatShading: true });
  const torso = mesh(new THREE.CapsuleGeometry(0.34, 0.5, 4, 10), suit); torso.position.y = 1.15; torso.scale.set(1.15, 1, 0.85); A.g.add(torso);
  bx(0.62, 0.78, 0.32, suit, 0, 1.22, -0.38, A.g); bx(0.3, 0.2, 0.05, M('#3a5a9a'), 0, 1.25, 0.31, A.g); bx(0.16, 0.08, 0.05, M('#c8302a'), -0.12, 1.42, 0.31, A.g);
  const limb = (x, y, len, r) => { const sh = new THREE.Group(); sh.position.set(x, y, 0); A.g.add(sh); const u = mesh(new THREE.CapsuleGeometry(r, len, 4, 8), suit); u.position.y = -len / 2 - r * 0.4; sh.add(u); const el = new THREE.Group(); el.position.y = -len - r * 0.6; sh.add(el); const lw = mesh(new THREE.CapsuleGeometry(r * 0.92, len * 0.9, 4, 8), suit); lw.position.y = -len * 0.45; el.add(lw); const j = mesh(new THREE.SphereGeometry(r * 1.05, 8, 6), joint); el.add(j); return { sh, el, end: lw }; };
  A.armL = limb(-0.48, 1.48, 0.32, 0.12); A.armR = limb(0.48, 1.48, 0.32, 0.12); A.legL = limb(-0.18, 0.72, 0.38, 0.14); A.legR = limb(0.18, 0.72, 0.38, 0.14);
  for (const a of [A.armL, A.armR]) { const gl = mesh(new THREE.SphereGeometry(0.11, 8, 6), M('#e8e8e2', { flatShading: true })); gl.scale.set(1, 1.2, 0.8); gl.position.y = -0.36; a.el.add(gl); a.glove = gl; }
  for (const l of [A.legL, A.legR]) { const b = bx(0.2, 0.14, 0.32, '#d8d8d2', 0, -0.4, 0.06, l.el); }
  A.head = new THREE.Group(); A.head.position.y = 1.86; A.g.add(A.head);
  const ring = mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 24), M('#c8ccd2', { metalness: 0.5, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.y = 1.7; A.g.add(ring);
  if (withFace) { const skin = new THREE.MeshStandardMaterial({ color: '#eebc98', roughness: 0.6, flatShading: true }); A.skin = skin;
    const face = mesh(new THREE.SphereGeometry(0.15, 14, 10), skin); face.scale.set(1, 1.2, 1.05); A.head.add(face); A.face = face;
    const cap = mesh(new THREE.SphereGeometry(0.158, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M('#1c1c20')); cap.scale.set(1, 1.2, 1.05); cap.rotation.x = -0.35; A.head.add(cap);
    const capW = mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0.35, 0.25), M('#f0f0f0')); capW.scale.set(1, 1.2, 1.05); capW.rotation.x = -0.35; A.head.add(capW);
    A.eyes = []; for (const sx of [-0.055, 0.055]) { const e = mesh(new THREE.SphereGeometry(0.026, 10, 8), M('#ffffff', { roughness: 0.2 })); e.position.set(sx, 0.03, 0.135); A.head.add(e); const pu = mesh(new THREE.SphereGeometry(0.013, 8, 6), M('#2a1a10')); pu.position.set(sx, 0.03, 0.158); A.head.add(pu); const lid = mesh(new THREE.SphereGeometry(0.028, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.position.set(sx, 0.031, 0.136); lid.rotation.x = -1.6; A.head.add(lid); A.eyes.push({ e, pu, lid });
      const br = bx(0.05, 0.01, 0.012, '#4a3020', sx, 0.075, 0.148, A.head); }
    const nose = mesh(new THREE.ConeGeometry(0.02, 0.05, 6), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.005, 0.165); A.head.add(nose);
    const mouth = new THREE.Group(); mouth.position.set(0, -0.075, 0.142); A.head.add(mouth); const mo = mesh(new THREE.SphereGeometry(0.035, 12, 8), M('#5a1a1a')); mo.scale.set(1.2, 0.25, 0.4); mouth.add(mo); const tongue = mesh(new THREE.SphereGeometry(0.022, 10, 8), M('#d86a6a')); tongue.scale.set(1.3, 0.4, 0.8); tongue.position.set(0, -0.006, 0.005); mouth.add(tongue);
    A.mouth = mo; A.tongue = tongue; A.bubbles = []; for (let i = 0; i < 26; i++) { const b = mesh(new THREE.SphereGeometry(0.0035, 8, 6), new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7 })); b.position.set(R(-0.022, 0.022), 0, R(0.0, 0.018)); mouth.add(b); A.bubbles.push({ b, ph: R(0, 6), x: b.position.x, z: b.position.z }); } }
  A.helmet = new THREE.Group(); A.head.add(A.helmet);
  const bubble = mesh(new THREE.SphereGeometry(0.27, 24, 18), new THREE.MeshStandardMaterial({ color: '#dfe8f2', transparent: true, opacity: withFace ? 0.18 : 0.35, roughness: 0.05, metalness: 0.2, depthWrite: false })); A.helmet.add(bubble);
  const visor = mesh(new THREE.SphereGeometry(0.275, 24, 18, -Math.PI * 0.35, Math.PI * 0.7, 0.35, 1.3), new THREE.MeshStandardMaterial({ color: '#d8a040', metalness: 0.9, roughness: 0.15, transparent: true, opacity: withFace ? 0.0 : 0.92 })); A.helmet.add(visor);
  if (!withFace) { const shell = mesh(new THREE.SphereGeometry(0.285, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.32), M('#eeeeea', { flatShading: true })); shell.rotation.x = -0.7; A.helmet.add(shell); }
  for (const sx of [-1, 1]) { const lamp = bx(0.06, 0.05, 0.08, '#cfcfcf', sx * 0.22, 0.12, 0.08, A.helmet); }
  A.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return A; }
const you = makeAstronaut(true); near.add(you.g);
const mate = makeAstronaut(false); near.add(mate.g);
const nearSmoke = makeSmoke(near, 2000);
// =================== AIRLOCK (meters): a padded white cylinder, lights, the hatch; air hisses back in ===================
const lock = new THREE.Scene(); lock.background = new THREE.Color('#1a1c22'); const lockCam = new THREE.PerspectiveCamera(55, W / H, 0.02, 100);
lock.add(new THREE.HemisphereLight(0xf2f4ff, 0x6a6a72, 1.1)); const lockKey = new THREE.PointLight(0xffffff, 6, 12, 1.4); lockKey.position.set(0, 1.3, 0); lock.add(lockKey);
{ const wallT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#e8e8e4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8b8b2'; g.lineWidth = 3; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 18; i++) { g.fillStyle = pick(['#3a5a9a', '#c8302a', '#e8b030', '#4a4a4a']); g.fillRect(R(0, w), R(0, h), R(10, 30), R(6, 14)); } }, [4, 2]);
  const cyl = mesh(new THREE.CylinderGeometry(1.8, 1.8, 5, 24, 1, true), new THREE.MeshStandardMaterial({ map: wallT, side: THREE.BackSide, roughness: 0.8 }), false, true); cyl.rotation.z = Math.PI / 2; lock.add(cyl);
  for (const sx of [-1, 1]) { const end = mesh(new THREE.CircleGeometry(1.8, 24), M('#d8d8d2')); end.position.x = sx * 2.5; end.rotation.y = -sx * Math.PI / 2; lock.add(end); const h = mesh(new THREE.CircleGeometry(0.7, 20), M('#5a5e66', { metalness: 0.5 })); h.position.x = sx * 2.48; h.rotation.y = -sx * Math.PI / 2; lock.add(h); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const strip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.5) })); strip.position.set(0, Math.cos(a) * 1.72, Math.sin(a) * 1.72); strip.rotation.x = -a; lock.add(strip); }
  for (const z of [-1.2, 1.2]) bx(3.6, 0.05, 0.05, '#e8b030', 0, -1.2, z, lock); }
const you2 = makeAstronaut(true), mate2 = makeAstronaut(false); lock.add(you2.g, mate2.g);
you2.helmet.visible = false; you2.g.position.set(-0.2, -1.1, 0); you2.g.rotation.set(0, 0.3, 0.12); mate2.g.position.set(0.85, -1.15, -1.0); mate2.g.rotation.y = -0.35;
const lockSmoke = makeSmoke(lock, 800);
// =================== poses + effects for "you" outside ===================
const YOU0 = V3(1.6, 0.85, -3.3), HATCH = V3(6.8, -3.0, 2.0);
function setFace(A, t, o) { // o: mouth (0..1), swell (0..1), burn (0..1), eyes (0 closed .. 1 open), bubbles (0..1)
  if (!A.face) return; const sw = 1 + 0.12 * o.swell; A.head.scale.setScalar(sw); A.skin.color.set('#eebc98').lerp(_c.set('#e8806a'), o.burn * 0.75);
  A.mouth.scale.set(1.2 + 0.2 * o.mouth, 0.25 + 1.1 * o.mouth, 0.4 + 0.3 * o.mouth); A.tongue.position.y = -0.006 - 0.015 * o.mouth;
  for (const E of A.eyes) { E.lid.rotation.x = lerp(-0.25, -1.6, o.eyes); }
  for (const B of A.bubbles) { const k = (t * 1.3 + B.ph) % 1; const on = o.bubbles > 0.01; B.b.visible = on; B.b.scale.setScalar(on ? (0.5 + 1.6 * k) * o.bubbles : 0.001); B.b.position.set(B.x * (1 + k), 0.002 + 0.03 * k, B.z + 0.008 + 0.02 * k); B.b.material.opacity = 0.85 * (1 - Math.pow(k, 4)); }
  A.armL.glove.scale.setScalar(1 + 0.15 * o.swell); A.armR.glove.scale.setScalar(1 + 0.15 * o.swell); }
const _c = new THREE.Color();
function poseAstro(A, o) { A.armL.sh.rotation.set(o.aL ?? 0.3, 0, 0.25); A.armL.el.rotation.x = o.eL ?? -0.6; A.armR.sh.rotation.set(o.aR ?? 0.2, 0, -0.25); A.armR.el.rotation.x = o.eR ?? -0.5;
  A.legL.sh.rotation.x = o.lL ?? 0.1; A.legR.sh.rotation.x = o.lR ?? -0.1; A.legL.el.rotation.x = 0.25; A.legR.el.rotation.x = 0.2; }
function updateOutside(t) {
  const limp = smooth(FADE + 4, DARK, t); you.g.position.copy(YOU0); you.g.rotation.set(0, 0.25, 0);
  // hands up to the helmet, then off; then arms drift limp
  const lift = fadeWin(t, 1.4, OFF + 0.6, 0.9); poseAstro(you, { aL: lerp(0.3, -2.6, lift), aR: lerp(0.2, -2.7, lift), eL: lerp(-0.6, -1.4, lift), eR: lerp(-0.5, -1.4, lift) });
  if (limp > 0) { you.armL.sh.rotation.x = lerp(you.armL.sh.rotation.x, -0.9, limp); you.armR.sh.rotation.x = lerp(you.armR.sh.rotation.x, -1.1, limp); you.g.rotation.x = -0.25 * limp; }
  const off = smooth(OFF - 0.2, OFF + 0.6, t); const back = t >= BACK; you.helmet.visible = true;
  if (back) { you.helmet.position.set(0, 0, 0); you.helmet.rotation.set(0, 0, 0); poseAstro(you, { aR: -2.9, eR: -0.2 }); you.g.rotation.set(0, 0.25, 0); }
  else { const fl = Math.max(0, t - OFF); you.helmet.position.set(0.05 * fl + 0.2 * off, 0.35 * off + 0.12 * fl, 0.25 * off + 0.08 * fl); you.helmet.rotation.set(0.3 * fl, 0.5 * fl, 0.2 * fl); }
  const mouth = back ? 0 : Math.max(fadeWin(t, EXHALE, EXHALE + 3.5, 0.5) * 1.0, fadeWin(t, SPIT - 0.5, SWELL + 0.5, 0.4) * 0.7, fadeWin(t, OFF, OFF + 1.2, 0.3) * 0.5);
  setFace(you, t, { mouth, swell: back ? 0 : smooth(SWELL, SWELL + 4, t) * (1 - smooth(DARK, RESCUE, t) * 0), burn: back ? 0 : smooth(SUNB, SUNB + 4, t), eyes: back ? 1 : lerp(1, 0.2, smooth(SUNB + 1, SUNB + 2.5, t) * (1 - smooth(FADE - 0.5, FADE, t))) * (1 - smooth(FADE + 4.5, DARK, t)), bubbles: back ? 0 : fadeWin(t, SPIT, SWELL + 2, 0.6) });
  // rescue: the crewmate grabs you and tows you to the hatch
  const tow = smooth(RESCUE + 0.6, LOCK + 0.3, t);
  if (t > DARK && !back) { const p = YOU0.clone().lerp(HATCH.clone().add(V3(-1.2, 0.2, 0)), tow); you.g.position.copy(p); you.g.rotation.set(-0.5, 1.2, 0.3); }
  if (t < RESCUE - 0.5 || back) { mate.g.position.set(-6, -1.2, -5); mate.g.rotation.y = 0.8; poseAstro(mate, {}); }
  else { const app = smooth(RESCUE - 0.5, RESCUE + 0.8, t); const p = you.g.position.clone().add(V3(lerp(-3, -0.7, app), 0.3, lerp(-2.5, -0.3, app))); mate.g.position.copy(p); mate.g.rotation.set(-0.3, 1.4, 0); poseAstro(mate, { aR: -1.6, eR: -0.3, aL: -0.4 }); }
  // air bursting out of the suit, a breath of vapour, ice glitter
  nearSmoke.begin(); smokeMat.uniforms.uTint.value.set('#f2f6fa'); const neck = you.g.position.clone().add(V3(0, 1.72, 0));
  for (let k = 0; k < 40; k++) { const age = t - (OFF - 0.1) - k * 0.05; if (age > 0 && age < 1.6) { const d = V3(hash(k * 3.1) - 0.5, 0.6 + hash(k), hash(k * 7.7) - 0.3).normalize(); _p.copy(neck).addScaledVector(d, age * 2.2); nearSmoke.add(_p, 0.15 + age * 0.9, 0.55 * (1 - age / 1.6)); } }
  const mouthW = you.head.localToWorld(V3(0, -0.075, 0.2));
  for (let k = 0; k < 24; k++) { const age = t - (EXHALE + 0.2) - k * 0.08; if (age > 0 && age < 1.4) { _p.copy(mouthW).add(V3((hash(k) - 0.5) * 0.1 * age, 0.05 * age, 0.6 * age)); nearSmoke.add(_p, 0.05 + age * 0.35, 0.5 * (1 - age / 1.4)); } }
  nearSmoke.end();
  nSun.target.position.copy(you.g.position); nSun.target.updateMatrixWorld(); nSun.position.copy(you.g.position).addScaledVector(SUN_DIR, 50);
}
const _p = new THREE.Vector3();
function headW() { return you.head.localToWorld(V3(0, 0, 0)); }
function outsideCamera(t) { const h = headW(); let pos, look, fov = 45;
  if (t < OFF) { pos = YOU0.clone().add(V3(2.2, 2.2, 5.6)); look = YOU0.clone().add(V3(0, 0.6, 0)); fov = 50; }
  else if (t < EXHALE) { pos = h.clone().add(V3(0.6, 0.15, 1.35)); look = h.clone().add(V3(0, -0.12, 0)); fov = 42; }
  else if (t < SPIT) { pos = h.clone().add(V3(0.15, 0.08, 1.05)); look = h.clone().add(V3(0, -0.06, 0)); fov = 40; }
  else if (t < SWELL) { const m = you.head.localToWorld(V3(0, -0.07, 0.15)); pos = m.clone().add(V3(0.08, 0.06, 0.42)); look = m.clone().add(V3(0, 0.04, 0)); fov = 40; }
  else if (t < SUNB) { pos = h.clone().add(V3(0.9, 0.0, 2.6)); look = h.clone().add(V3(0, -0.55, 0)); fov = 44; }
  else if (t < FADE) { pos = h.clone().add(V3(-0.55, 0.12, 0.95)); look = h.clone().add(V3(0, -0.05, 0)); fov = 42; }
  else if (t < DARK) { pos = h.clone().add(V3(0, 0.02, 0.12)); look = h.clone().add(V3(0.6, -0.9, 3.0)); fov = 62; }
  else if (t < BACK) { const p = you.g.position; pos = p.clone().add(V3(2.5, 1.8, 6.5)); look = p.clone().add(V3(0.6, 0.0, 0)); fov = 50; }
  else { pos = YOU0.clone().add(V3(1.6, 2.0, 4.6)); look = YOU0.clone().add(V3(0, 0.9, 0)); fov = 50; }
  cam.fov = fov; cam.position.copy(pos); cam.lookAt(look); }
function shootSpace(rt) { cam.aspect = W / H; cam.updateProjectionMatrix(); bgCam.fov = cam.fov; bgCam.aspect = cam.aspect; bgCam.quaternion.copy(cam.quaternion); bgCam.position.set(0, 0, 0); bgCam.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bg, bgCam); renderer.clearDepth(); renderer.render(near, cam); }
function updateLock(t) { const u = t - LOCK; const wake = smooth(LOCK + 1.5, LOCK + 3.5, t);
  setFace(you2, t, { mouth: 0.15, swell: lerp(0.6, 0, smooth(LOCK, LOCK + 4, t)), burn: lerp(0.7, 0.4, smooth(LOCK, BACK, t)), eyes: wake, bubbles: 0 }); poseAstro(you2, { aL: -0.4, aR: -0.6 + 0 * u });
  poseAstro(mate2, { aR: smooth(LOCK + 4.5, LOCK + 5.5, t) * -2.6, eR: -0.2, aL: -0.5 });
  lockSmoke.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); for (let k = 0; k < 60; k++) { const age = ((t * 0.7 + k / 60) % 1); _p.set(-2.3 + age * 1.2, 0.8 + (hash(k) - 0.5) * 1.2, (hash(k * 3) - 0.5) * 1.2); lockSmoke.add(_p, 0.2 + age * 0.8, 0.25 * (1 - age) * (1 - smooth(LOCK + 1, LOCK + 3, t))); } lockSmoke.end(); }
function lockCamera(t) { const u = (t - LOCK) / (BACK - LOCK); const h = you2.head.localToWorld(V3(0, 0, 0)); lockCam.position.copy(h).add(V3(lerp(0.2, 0.35, u), lerp(0.1, 0.18, u), lerp(0.9, 1.3, u))); lockCam.lookAt(h.clone().add(V3(0.12, -0.1, 0))); lockCam.fov = 50; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const tunnel = document.createElement('div'); tunnel.className = 'ov gfx'; tunnel.style.cssText = 'top:0;bottom:0;pointer-events:none'; $('wrap').insertBefore(tunnel, $('title'));
const captions = [
  [4.3, 8.7, 'Instantly: silence.<br>No air, no sound.'],
  [9.3, 14.7, 'Rule #1: breathe OUT.<br>Holding your breath can tear your lungs.'],
  [15.3, 18.0, 'Your spit starts to boil —<br>and it isn\'t even hot.'],
  [18.1, 20.8, 'In near-vacuum, water boils<br>at body temperature.'],
  [21.3, 26.7, 'Your body swells…<br>but you don\'t explode. Your skin holds you together.'],
  [27.3, 29.9, 'You don\'t freeze instantly —<br>vacuum holds heat in.'],
  [30.0, 32.8, 'But the Sun burns your skin fast.<br>Nothing blocks the UV.'],
  [33.3, 39.6, 'About 12–15 seconds:<br>you black out. Your blood runs out of oxygen.'],
  [40.6, 47.6, 'Get back into air within ~90 seconds…<br>and you can survive.'],
  [48.4, 52.6, 'It really happened: in 1966, a NASA engineer\'s<br>suit leaked in a vacuum chamber.'],
  [52.7, 56.8, 'Jim LeBlanc felt his spit bubbling —<br>then woke up 87 seconds later. He was fine.'],
  [57.3, 60.8, 'So… keep your helmet on.'],
];
function hudAt(t) { let stat = '', lab = '', val = '', sub = '', show = 1; if (t < OFF || t >= BACK) show = 0;
  else { const s = (t - OFF) * (t < DARK ? 2.0 : 1.0) + (t >= DARK ? (DARK - OFF) * 1.0 : 0); const secs = t < DARK ? Math.min(15, Math.floor((t - OFF) * 15 / (DARK - OFF))) : Math.floor(15 + (t - DARK) * 15); const shown = t < LOCK ? secs : 87;
    stat = '<b></b>NO HELMET'; lab = 'TIME IN VACUUM'; val = 'T+' + shown + ' s'; sub = t < SPIT ? 'EXHALE!' : t < SWELL ? 'SALIVA BOILING' : t < SUNB ? 'SWELLING (EBULLISM)' : t < FADE ? 'UV BURN' : t < DARK ? 'LOSING CONSCIOUSNESS' : t < LOCK ? 'UNCONSCIOUS · ~90 s WINDOW' : 'REPRESSURIZED'; }
  return { stat, lab, val, sub, show }; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.0, 3.6, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const tv = smooth(FADE, DARK - 0.6, t) * (1 - smooth(RESCUE - 0.3, RESCUE + 0.6, t)); const r = lerp(85, 0, tv);
  tunnel.style.background = tv > 0.001 ? `radial-gradient(ellipse ${r}% ${r * 0.62}% at 50% 48%, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 100%)` : 'none';
  el.veil.style.background = '#000'; el.veil.style.opacity = smooth(DARK - 1.0, DARK - 0.2, t) * (1 - smooth(RESCUE - 0.4, RESCUE + 0.6, t));
  $('c').style.filter = t > LOCK && t < LOCK + 3 ? `blur(${lerp(6, 0, smooth(LOCK, LOCK + 3, t)).toFixed(1)}px)` : 'none';
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
window.renderAt = (t) => {
  const inLock = t >= LOCK && t < BACK;
  if (!inLock) { updateOutside(t); outsideCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shootSpace(RTA); }
  else { updateLock(t); lockCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(lockCam.fov * Math.PI / 360)); shootTo(RTA, lock, lockCam); }
  composite(0, inLock ? 1.05 : 1.0, 1); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth(); window.renderAt(0); return true; })();
