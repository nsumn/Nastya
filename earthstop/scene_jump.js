import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you took off your helmet in space?" — FIRST-PERSON version (one continuous POV, blinks instead of cuts); classic low-poly; Earth/stars render in km in a background pass, the ISS + astronauts in meters on top.
// Facts: awareness ~10-15 s (NASA/USAF studies, Barratt ~12 s); ~90 s survivable if recompressed; exhale; saliva boils (Armstrong limit);
// swelling (ebullism) but no explosion; no instant freezing; severe sunburn; Jim LeBlanc 1966 chamber accident, woke after 87 s, no lasting harm.
// =================== timeline ===================
const OFF = 4.0, EXHALE = 5.2, SPIT = 9.0, SWELL = 15.0, SUNB = 21.0, FADE = 27.0, DARK = 36.0, RESCUE = 40.0, LOCK = 48.0, BACK = 54.0, T_END = 60.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
// ?v=2: re-upload variant (different Earth view, cloud/star layout, wording, grade)
const VAR = 4;   // jump video: Germany below
let seed = VAR === 3 ? 1990 : VAR === 2 ? 2024 : 1966;   // ?v=3: German version (mirrored picture, North Sea view, metric)
const DE = VAR === 3;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uFrame: { value: 0 }, uFrameK: { value: 0 }, uFog: { value: 0 }, uPulse: { value: 0 }, uGhost: { value: new THREE.Vector2() }, uGhostA: { value: 0 }, uSat: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uVig: { value: 3 }, uLid: { value: 0 }, uBright: { value: 1 }, uFlash: { value: 0 }, uSunUV: { value: new THREE.Vector2(-9, -9) }, uSunA: { value: 0 }, uFlipX: { value: VAR === 3 ? 1 : 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform float uFlipX; uniform float uFrame, uFrameK, uFog, uPulse, uGhostA, uSat, uVig, uLid, uBright, uFlash, uSunA; uniform vec2 uGhost, uSunUV; uniform vec3 uTint;
    void main(){ vec2 uv = (vUv - 0.5) * (1.0 - 0.014 * uPulse) + 0.5; uv.x = mix(uv.x, 1.0 - uv.x, uFlipX);
      vec3 c = aces(texture2D(tA, uv).rgb * uExpA);
      if (uGhostA > 0.001) { vec3 g = aces(texture2D(tA, uv + uGhost).rgb * uExpA); c = mix(c, g, 0.45 * uGhostA); }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0);                       // p.y in [-1,1], p.x in [-0.56,0.56] (square pixels)
      // sun glare
      vec2 sd = (vUv - uSunUV) * vec2(1.125, 2.0); float d = length(sd);
      c += uSunA * (vec3(1.0, 0.93, 0.8) * exp(-d * 3.5) * 0.55 + vec3(1.0) * exp(-d * 22.0) * 1.5 + vec3(1.0, 0.95, 0.85) * exp(-abs(sd.y) * 60.0) * exp(-abs(sd.x) * 2.5) * 0.35);
      // visor fog from your breath
      vec2 fq = (p - vec2(0.0, -0.62)) / vec2(0.5, 0.32); c = mix(c, vec3(0.86, 0.9, 0.93), clamp(uFog * exp(-dot(fq, fq)) * 0.75, 0.0, 1.0));
      // helmet rim (dark padded edge) — grows + fades as the helmet comes off
      vec2 hq = p / (vec2(0.66, 1.02) * (1.0 + 2.2 * uFrameK)); float e = length(hq);
      float rim = smoothstep(0.9, 1.0, e); vec3 rimC = vec3(0.045, 0.05, 0.06) + vec3(0.5, 0.55, 0.6) * exp(-abs(e - 0.985) * 70.0) * 0.35;
      c = mix(c, rimC, rim * uFrame); c += vec3(0.6, 0.75, 0.9) * 0.05 * uFrame * exp(-pow((p.x + p.y * 0.4 - 0.25) * 6.0, 2.0)) * (1.0 - rim);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat) * uTint;
      float r = length(p * vec2(1.3, 0.8)); c *= 1.0 - smoothstep(uVig * 0.45, uVig, r);
      float hl = 1.1 * (1.0 - uLid) - 0.35 * p.x * p.x; c *= 1.0 - smoothstep(hl - 0.1, hl + 0.02, abs(p.y));
      c = c * uBright + uFlash; gl_FragColor = vec4(srgb(clamp(c, 0.0, 1.0)), 1.0); }` });
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
// the sky: a Milky Way band crossing the opening view (yaw pi, looking up), coloured stars, a low-poly Moon
const MW_N = (() => { const d = V3(0, Math.sin(0.5), -Math.cos(0.5)); return d.clone().cross(V3(1, 0.55, 0.15)).normalize(); })();
const MW_Q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), MW_N);
{ const n = 26000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const lon = R(0, Math.PI * 2), g = (R(-1, 1) + R(-1, 1) + R(-1, 1)) / 3, lat = g * 0.32 * (0.6 + 0.4 * Math.abs(Math.sin(lon * 1.7)));
    const v = V3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).applyQuaternion(MW_Q).multiplyScalar(48000); pos.set([v.x, v.y, v.z], i * 3);
    const core = Math.exp(-Math.pow(Math.atan2(Math.sin(lon - 0.6), Math.cos(lon - 0.6)) / 0.7, 2)); c.setHSL(lerp(0.6, 0.1, core * rnd()), R(0.2, 0.6), R(0.55, 0.95)).multiplyScalar(R(0.5, 1.4)); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  bg.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })));
  const nb = 420, pb = new Float32Array(nb * 3), cb = new Float32Array(nb * 3);
  for (let i = 0; i < nb; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(47000); pb.set([v.x, v.y, v.z], i * 3); c.set(pick(['#ffffff', '#cfe0ff', '#ffe6c0', '#ffd0a0', '#bcd4ff'])).multiplyScalar(R(1.2, 3.0)); cb.set([c.r, c.g, c.b], i * 3); }
  const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.BufferAttribute(pb, 3)); gb.setAttribute('color', new THREE.BufferAttribute(cb, 3));
  bg.add(new THREE.Points(gb, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })));
  const glow = canvasTex(2048, 1024, (g2, w, h) => { g2.fillStyle = '#000'; g2.fillRect(0, 0, w, h); g2.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5000; i++) { const x = R(0, w), core = Math.exp(-Math.pow(Math.atan2(Math.sin(x / w * 6.283 - 0.6), Math.cos(x / w * 6.283 - 0.6)) / 0.8, 2)); const y = h / 2 + (R(-1, 1) + R(-1, 1) + R(-1, 1)) * h * 0.05 * (1 + core * 0.8), r = R(10, 46) * (1 + core);
        const gr = g2.createRadialGradient(x, y, 0, x, y, r); const hue = core > 0.4 && rnd() < 0.6 ? `rgba(255,${Math.floor(R(170, 215))},${Math.floor(R(120, 170))},` : rnd() < 0.18 ? 'rgba(200,120,190,' : 'rgba(150,175,255,';
        gr.addColorStop(0, hue + (0.016 + 0.026 * core) + ')'); gr.addColorStop(1, hue + '0)'); g2.fillStyle = gr; for (const sx of [-w, 0, w]) { g2.save(); g2.translate(sx, 0); g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); g2.restore(); } }
      g2.globalCompositeOperation = 'multiply'; for (let i = 0; i < 900; i++) { const x = R(0, w), y = h / 2 + R(-1, 1) * h * 0.018 + Math.sin(x / w * 25) * h * 0.008, r = R(6, 22); const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,58,72,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g2.fillStyle = gr; for (const sx of [-w, 0, w]) { g2.save(); g2.translate(sx, 0); g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); g2.restore(); } } });
  const band = new THREE.Mesh(new THREE.SphereGeometry(49000, 64, 32), new THREE.MeshBasicMaterial({ map: glow, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, color: new THREE.Color(1.1, 1.1, 1.1) }));
  band.quaternion.copy(MW_Q); bg.add(band); }
const moon = new THREE.Group(); { const mg = new THREE.IcosahedronGeometry(1, 3); const p = mg.attributes.position, mc = new Float32Array(p.count * 3), c = new THREE.Color(), v = new THREE.Vector3();
  const craters = Array.from({ length: 14 }, () => [V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), R(0.15, 0.45)]);
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize(); let d = 0.78 + R(-0.05, 0.05); for (const [cn, r] of craters) if (v.distanceTo(cn) < r) d -= 0.22; c.setRGB(d, d, d * 0.98); for (let k = 0; k < 3; k++) mc.set([c.r, c.g, c.b], (f + k) * 3); }
  mg.setAttribute('color', new THREE.BufferAttribute(mc, 3)); const mm = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })); mm.scale.setScalar(620); moon.add(mm);
  moon.position.copy(V3(-0.12, Math.sin(0.78), -Math.cos(0.78)).normalize().multiplyScalar(30000)); bg.add(moon); }
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 5), fog: false })); sunDisc.position.copy(SUN_DIR).multiplyScalar(45000); sunDisc.lookAt(0, 0, 0); bg.add(sunDisc);
const earth = new THREE.Group(); const EA = 0.62; earth.position.set(0, -(RE + ALT) * Math.cos(EA), -(RE + ALT) * Math.sin(EA)); bg.add(earth);
async function buildEarth() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json();
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  for (const f of topojson.feature(topo, topo.objects.countries).features) { if (!f.geometry) continue; const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } } }
  const img = g.getImageData(0, 0, MW, MH).data; const land = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const n0 = V3(0, Math.cos(EA), Math.sin(EA)).normalize(), la0 = (VAR === 4 ? 51 : VAR === 3 ? 45 : VAR === 2 ? 27 : 35) * Math.PI / 180, lo0 = (VAR === 4 ? 10 : VAR === 3 ? -19 : VAR === 2 ? -71 : -62) * Math.PI / 180;   // v2: the US East Coast under the station
  const EQ = new THREE.Quaternion().setFromUnitVectors(n0, V3(Math.cos(la0) * Math.cos(lo0), Math.sin(la0), -Math.cos(la0) * Math.sin(lo0)));
  window.__EQ = EQ; window.__land = land; window.__n0 = n0;   // reused by parts_jump (local high-res Earth cap)
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
    uniforms: { uSun: { value: SUN_DIR } }, vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vNw; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vNw = normalize(mat3(modelMatrix)*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vNw; void main(){ float g = 1.0 - abs(dot(vN, vV)); float s = dot(vNw, uSun);
      float day = smoothstep(-0.35, 0.15, s); float dusk = smoothstep(-0.3, -0.02, s) * (1.0 - smoothstep(0.0, 0.35, s));
      vec3 col = mix(vec3(0.38, 0.64, 1.0), vec3(1.0, 0.5, 0.22), dusk * 0.85);
      float f = pow(g, 9.0) * 1.1 + pow(g, 26.0) * 1.6; gl_FragColor = vec4(col * f * (0.15 + 0.85 * day) + vec3(1.0, 0.45, 0.18) * pow(g, 14.0) * dusk * 1.4, 1.0); }` })));
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
  for (const z of [1.55, 2.45]) { bx(3.8, 0.06, 0.06, '#e8b030', 4.8, -1.05, z, ISS); for (let x = 3.1; x <= 6.6; x += 0.7) bx(0.05, 0.16, 0.05, '#e8b030', x, -1.13, z, ISS); }   // rails along the airlock (the tow route)
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
  const visor = mesh(new THREE.SphereGeometry(0.275, 24, 18, Math.PI * 0.15, Math.PI * 0.7, 0.35, 1.3), new THREE.MeshStandardMaterial({ color: '#d8a040', metalness: 0.9, roughness: 0.15, transparent: true, opacity: withFace ? 0.0 : 0.92 })); A.helmet.add(visor); A.visor = visor;
  if (!withFace) { const shell = mesh(new THREE.SphereGeometry(0.285, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.32), M('#eeeeea', { flatShading: true })); shell.rotation.x = -0.7; A.helmet.add(shell); }
  for (const sx of [-1, 1]) { const lamp = bx(0.06, 0.05, 0.08, '#cfcfcf', sx * 0.22, 0.12, 0.08, A.helmet); }
  A.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return A; }
const you = makeAstronaut(true); near.add(you.g);
const mate = makeAstronaut(false); near.add(mate.g);
const nearSmoke = makeSmoke(near, 2000);
// POV: the helmet leaves your head and floats on its own; its gold visor works as a mirror (Reflector disc) so you see your own face
near.attach(you.helmet); you.visor.material = new THREE.MeshStandardMaterial({ color: '#d8a040', metalness: 0.9, roughness: 0.15, transparent: true, opacity: 0.35, depthWrite: false });
const shell = mesh(new THREE.SphereGeometry(0.285, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.32), M('#eeeeea', { flatShading: true })); shell.rotation.x = -0.7; you.helmet.add(shell);
const mirror = new Reflector(new THREE.CircleGeometry(0.2, 32), { textureWidth: 1024, textureHeight: 1024, color: 0xf2e2c4, clipBias: 0.003 }); mirror.position.set(0, -0.02, 0.262); mirror.scale.set(1, 0.85, 1); you.helmet.add(mirror);
{ const ob = mirror.onBeforeRender; mirror.onBeforeRender = function (r, s, c) { you.head.visible = true; ob.call(this, r, s, c); you.head.visible = false; }; }
const hatchGlow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.1, 2.8) })); hatchGlow.position.set(6.835, -3.0, 2.0); hatchGlow.rotation.y = Math.PI / 2; near.add(hatchGlow);
// =================== "POV: Du springst aus 39 km Höhe" — 15 s, German, metric ===================
// Reuses the helmet-video world (parts_pov p_head/p_smoke/p_space): Earth + Milky Way + stars, the POV helmet rim/FX compositor.
// Facts: Red Bull Stratos 2012 — exit 38,969 m, top speed 1,357.6 km/h (Mach 1.25), flat spin ~13 s at up to ~60 rpm;
// Alan Eustace 2014 — 41,419 m (135,890 ft). Timeline below is compressed (the real free fall lasted minutes).
const JUMP = 3.4, MACH = 7.4, SPIN = 9.0, STAB = 12.2, CARD = 14.0, J_END = 15.6;
ISS.visible = false; mate.g.visible = false; you.helmet.visible = false; mirror.visible = false; hatchGlow.visible = false; you.head.visible = false;
bg.background = new THREE.Color('#010205');
// altitude (km) and speed (km/h) profiles — compressed in time
const altKm = t => 38.969 - 14.5 * Math.pow(clamp((t - JUMP) / (J_END - JUMP), 0, 1), 1.3);
const speedKmh = t => t < JUMP ? 0 : t < MACH + 1.4 ? 1357.6 * Math.pow(smooth(JUMP, MACH + 1.4, t), 0.85) : lerp(1357.6, 1040, smooth(MACH + 1.4, J_END, t));
// Earth: rotate the globe so Germany (the lookup point n0) is straight below, at the current altitude
const EQ_UP = new THREE.Quaternion();
function placeEarth(t) { earth.quaternion.copy(EQ_UP); earth.position.set(0, -(RE + altKm(t)), 0); earth.updateMatrixWorld(true); }
function latLonWorld(la, lo, h = 0) { const q = V3(Math.cos(la * Math.PI / 180) * Math.cos(lo * Math.PI / 180), Math.sin(la * Math.PI / 180), -Math.cos(la * Math.PI / 180) * Math.sin(lo * Math.PI / 180));
  return q.applyQuaternion(window.__EQ.clone().invert()).multiplyScalar(RE + h).applyQuaternion(earth.quaternion).add(earth.position); }
// high-res local cap of the globe: fields patchwork, rivers of sea, the Alps with snow (low-poly relief)
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, h = (a, b) => hash(a * 57.1 + b * 113.7), s = k => k * k * (3 - 2 * k);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), s(xf)), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), s(xf)), s(yf)); };
function alpsH(la, lo) { const band = Math.exp(-Math.pow((la - 46.7 + 0.25 * Math.sin(lo * 0.7)) / 0.7, 2)) * smooth(5.8, 7.0, lo) * (1 - smooth(14.5, 16.0, lo));
  return band * (0.35 + 0.65 * vnoise(lo * 3.2, la * 3.2)) * (0.7 + 0.3 * vnoise(lo * 9, la * 9)) * 9.0; }   // relief x2.5 so the Alps read on the horizon
const CITIES = [[52.52, 13.40, 0.22], [53.55, 9.99, 0.17], [48.14, 11.58, 0.16], [50.94, 6.96, 0.14], [50.11, 8.68, 0.13], [48.78, 9.18, 0.11], [51.23, 6.78, 0.1], [51.34, 12.37, 0.1], [51.05, 13.74, 0.1], [52.37, 9.73, 0.1], [49.45, 11.08, 0.1], [51.45, 7.0, 0.16]];
const cityAt = (la, lo) => { let v = 0; for (const [a, b, r] of CITIES) { const d = Math.hypot(la - a, (lo - b) * Math.cos(a * Math.PI / 180)); v = Math.max(v, 1 - d / r); } return v; };
const lakeAt = (la, lo) => Math.hypot((la - 47.62) / 0.11, (lo - 9.35) / 0.33) < 1 || Math.hypot((la - 47.85) / 0.06, (lo - 12.47) / 0.08) < 1;
function buildCap() { const n0 = window.__n0.clone(), EQ = window.__EQ, land = window.__land; const e1 = new THREE.Vector3(1, 0, 0).cross(n0).normalize(), e2 = n0.clone().cross(e1).normalize();
  const N = 520, A = 0.11, P = [], LL = []; for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = Math.tan(-A + 2 * A * i / N), y = Math.tan(-A + 2 * A * j / N); const d = n0.clone().addScaledVector(e1, x).addScaledVector(e2, y).normalize(); const q = d.clone().applyQuaternion(EQ);
    const la = Math.asin(q.y) * 180 / Math.PI, lo = Math.atan2(-q.z, q.x) * 180 / Math.PI; const isL = land(la, lo) && !lakeAt(la, lo); const h = isL ? 0.35 + alpsH(la, lo) + 0.25 * vnoise(lo * 6, la * 6) : 0.05; P.push(d.multiplyScalar(RE + h)); LL.push([la, lo, h, isL]); }
  const pos = [], col = [], c = new THREE.Color(); const fields = ['#5f8a3e', '#6f9447', '#86a24e', '#a5a957', '#7d9a45', '#8f8a4a', '#567f3a'];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, cc = a + N + 1, dd = cc + 1;
    for (const tri of [[a, b, cc], [b, dd, cc]]) { let h = 0, nl = 0, la = 0, lo = 0; for (const k of tri) { h += LL[k][2] / 3; nl += LL[k][3] ? 1 : 0; la += LL[k][0] / 3; lo += LL[k][1] / 3; }
      if (nl < 2) c.set(Math.abs(la) > 53 ? '#24506e' : '#1f5f92').offsetHSL(0, 0, R(-0.02, 0.02));
      else if (h > 2.3) c.set('#f2f5f8').offsetHSL(0, 0, R(-0.05, 0.0)); else if (h > 1.6) c.set('#8c8a86').offsetHSL(0, 0, R(-0.05, 0.05)); else if (h > 1.0) c.set('#4f6e38');
      else { const forest = vnoise(lo * 2.2, la * 2.2) * 0.65 + vnoise(lo * 7, la * 7) * 0.35, city = cityAt(la, lo);
        if (forest > 0.62) c.set(rnd() < 0.5 ? '#3c5a2c' : '#456533'); else c.set(fields[Math.floor(hash(i * 7.3 + j * 3.1 + (tri[0] === a ? 0 : 0.5)) * fields.length)]);
        if (city > 0 && rnd() < 0.35 + 0.6 * city) c.set(rnd() < 0.5 ? '#8e8a84' : '#a29d94'); else if (rnd() < 0.006) c.set('#9a9690'); }
      c.multiplyScalar(0.85); for (const k of tri) { pos.push(P[k].x, P[k].y, P[k].z); col.push(c.r, c.g, c.b); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  earth.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 })));
  const cg = new THREE.IcosahedronGeometry(1, 1), cm = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.88, emissive: '#3a4250' });
  const up = n0.clone(); for (let k = 0; k < 900; k++) { const x = R(-A, A) * 0.95, y = R(-A, A) * 0.95; if (vnoise(x * 60 + 3, y * 60 + 7) < 0.52) continue;
    const d = n0.clone().addScaledVector(e1, Math.tan(x)).addScaledVector(e2, Math.tan(y)).normalize(); const alt = R(2.5, 8.5); const grpC = new THREE.Group(); grpC.position.copy(d).multiplyScalar(RE + alt); grpC.quaternion.setFromUnitVectors(V3(0, 1, 0), d);
    const sz = R(4, 16); for (let b = 0; b < 4; b++) { const m = new THREE.Mesh(cg, cm); m.position.set(R(-1, 1) * sz, R(0, 0.4) * sz * 0.2, R(-1, 1) * sz); m.scale.set(sz * R(0.6, 1.1), sz * R(0.12, 0.22), sz * R(0.6, 1.1)); grpC.add(m); }
    earth.add(grpC); } }
// near scene: the capsule step (platform + door frame) — it falls away above you
const step = new THREE.Group(); near.add(step);
{ bx(1.7, 0.12, 1.3, M('#8a8e94', { metalness: 0.4, roughness: 0.5 }), 0, -0.06, 0.1, step); bx(1.7, 0.02, 0.1, '#e8b030', 0, 0.005, 0.7, step); bx(1.7, 0.5, 0.06, '#d8d8d2', 0, -0.37, 0.74, step);
  for (const sx of [-1, 1]) { bx(0.12, 2.4, 0.14, '#d8d8d2', sx * 0.9, 1.2, 0.68, step); bx(0.05, 1.3, 0.05, '#e8b030', sx * 0.78, 1.2, 0.6, step); } bx(1.92, 0.14, 0.14, '#d8d8d2', 0, 2.4, 0.68, step);
  bx(1.9, 2.6, 0.1, '#30343a', 0, 1.2, -0.62, step); for (const sx of [-1, 1]) bx(0.1, 2.6, 1.3, '#3a3e46', sx * 0.98, 1.2, 0.0, step); }
const EYE_L = V3(0, 1.89, 0.1), _e = new THREE.Euler(), _q = new THREE.Quaternion();
function poseAstro(A, o) { A.armL.sh.rotation.set(o.aL ?? 0.3, 0, o.zL ?? 0.25); A.armL.el.rotation.x = o.eL ?? -0.6; A.armR.sh.rotation.set(o.aR ?? 0.2, 0, o.zR ?? -0.25); A.armR.el.rotation.x = o.eR ?? -0.5;
  A.legL.sh.rotation.x = o.lL ?? 0.1; A.legR.sh.rotation.x = o.lR ?? -0.1; A.legL.el.rotation.x = o.kL ?? 0.25; A.legR.el.rotation.x = o.kR ?? 0.2; }
const bump = (t, a, b) => (t > a && t < b) ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
let YAW0 = Math.PI;
// spin angle = integral of the spin rate (pure function of t)
const spinRate = t => 2 * Math.PI * 1.0 * smooth(SPIN - 0.3, SPIN + 0.9, t) * (1 - smooth(STAB - 0.9, STAB + 0.4, t));
const spinAt = t => { let a = 0; const dt = 1 / 120; for (let x = SPIN - 0.4; x < t; x += dt) a += spinRate(x) * dt; return a; };
function update(t) { placeEarth(t);
  const fall = Math.max(0, t - JUMP), lean = smooth(JUMP - 0.3, JUMP + 1.1, t);
  // the step drops away above you (you fall; drawn relative to your eye)
  step.position.set(0, 0.5 * 9.8 * fall * fall, 0); step.rotation.y = YAW0; step.visible = fall < 4;
  let yaw = YAW0 + 0.05 * Math.sin(t * 0.6), pitch = lerp(lerp(-0.08, -0.85, smooth(1.6, 3.0, t)) + 0.01 * Math.sin(t * 2.1), -1.25, lean), roll = 0, bodyPitch = lerp(0, 1.2, lean);
  pitch = lerp(pitch, -0.55, smooth(JUMP + 1.6, MACH, t)); bodyPitch = lerp(bodyPitch, 0.75, smooth(JUMP + 1.6, MACH, t));
  yaw += spinAt(t); roll += 0.25 * Math.sin(t * 1.7) * smooth(SPIN, SPIN + 1, t) * (1 - smooth(STAB - 0.5, STAB + 0.5, t));
  pitch = lerp(pitch, -0.7, smooth(STAB, STAB + 1.2, t));
  const buf = Math.min(1, speedKmh(t) / 1357.6); // buffeting grows with speed and thicker air
  pitch += (Math.sin(t * 31) * 0.6 + Math.sin(t * 19.3) * 0.4) * 0.006 * buf * (1 + 1.5 * smooth(SPIN, SPIN + 0.5, t)); yaw += Math.sin(t * 27.7) * 0.005 * buf;
  // body: hands on the door posts, then arms spread (stable free-fall arch)
  const spread = smooth(JUMP - 0.1, JUMP + 0.8, t);
  poseAstro(you, { aL: lerp(-1.25, -0.45, spread), eL: lerp(-0.5, -0.4, spread), zL: lerp(-0.85, -1.35, spread), aR: lerp(-1.25, -0.45, spread), eR: lerp(-0.5, -0.4, spread), zR: lerp(0.85, 1.35, spread), lL: lerp(0.1, 0.5, spread), lR: lerp(-0.1, 0.45, spread), kL: lerp(0.25, 1.0, spread), kR: lerp(0.2, 1.0, spread) });
  you.g.quaternion.setFromEuler(_e.set(bodyPitch, yaw, roll, 'YXZ')); you.g.position.copy(V3(0, 1.89, 0)).sub(EYE_L.clone().applyQuaternion(you.g.quaternion)); you.g.updateMatrixWorld(true);
  cam.quaternion.copy(you.g.quaternion).multiply(_q.setFromEuler(_e.set(pitch + bodyPitch, Math.PI, 0, 'YXZ'))); cam.position.set(0, 1.89, 0); cam.fov = 72;
  nearSmoke.begin(); nearSmoke.end();
  nSun.target.position.set(0, 1, 0); nSun.target.updateMatrixWorld(); nSun.position.copy(SUN_DIR).multiplyScalar(50); }
function shootJump(rt) { cam.aspect = W / H; cam.updateProjectionMatrix(); bgCam.fov = cam.fov; bgCam.aspect = cam.aspect; bgCam.quaternion.copy(cam.quaternion); bgCam.position.set(0, 0, 0); bgCam.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bg, bgCam); renderer.setRenderTarget(rt); renderer.clearDepth(); renderer.render(near, cam); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
document.documentElement.lang = 'de';
el.title.innerHTML = 'POV: Du springst aus<br><span class="hl">39 km</span> Höhe'; el.endT.innerHTML = 'POV: Du springst aus <span class="hl">39 km</span> Höhe';
el.endS.innerHTML = 'REKORD 2012: ABSPRUNG AUS 38.969 M, 1.357 KM/H — MACH 1,25.<br>REKORD 2014: ALAN EUSTACE, 41.419 M ÜBER NEW MEXICO.<br>OHNE DRUCKANZUG KOCHT ÜBER ~19 KM DEINE KÖRPERFLÜSSIGKEIT.';
const captions = [
  [JUMP + 0.1, 6.4, 'Hier oben ist fast keine Luft.<br>Ohne Anzug würde dein Blut kochen.'],
  [6.6, 8.8, 'Du durchbrichst die Schallmauer —<br>und hörst… nichts.'],
  [SPIN + 0.2, STAB, 'Flachtrudeln: bis zu 60 Umdrehungen pro Minute.<br>Das Blut schießt dir in den Kopf.'],
  [STAB + 0.15, CARD - 0.05, 'Arme raus, Rücken durchdrücken —<br>stabil.'],
];
const fmtDE = n => Math.round(n).toLocaleString('de-DE');
function updateDOM(t) { el.title.style.opacity = 1 - smooth(JUMP - 0.5, JUMP + 0.1, t);
  const v = speedKmh(t), h = altKm(t) * 1000, mach = v / 1085;
  el.stat.innerHTML = t < JUMP ? '<b style="background:#5fd27a"></b>STRATOSPHÄRE · ANZUG OK' : mach >= 1 ? '<b></b>ÜBERSCHALL · MACH ' + mach.toFixed(2).replace('.', ',') : '<b></b>FREIER FALL';
  el.lab.textContent = t < JUMP ? 'HÖHE' : 'GESCHWINDIGKEIT'; el.val.textContent = t < JUMP ? fmtDE(h) + ' m' : fmtDE(v) + ' km/h'; el.sub.textContent = t < JUMP ? 'LUFTDRUCK < 1 %' : 'HÖHE ' + fmtDE(h) + ' m';
  el.hud.style.opacity = 1 - smooth(CARD - 0.3, CARD + 0.1, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.2) : 0;
  el.end.style.opacity = smooth(CARD, CARD + 0.4, t); el.endT.style.opacity = smooth(CARD + 0.2, CARD + 0.6, t); el.endS.style.opacity = smooth(CARD + 0.5, CARD + 0.9, t); }
function postFX(t) { const u = compMat.uniforms;
  u.uFrame.value = 1; u.uFrameK.value = 0; u.uFog.value = 0.55 * (fadeWin(t, 0.9, 2.1, 0.35) + fadeWin(t, 2.7, 3.3, 0.2) + 0.6 * fadeWin(t, 5.0, 5.6, 0.2) + 0.6 * fadeWin(t, 12.6, 13.6, 0.3));
  const red = smooth(SPIN + 0.6, SPIN + 2.0, t) * (1 - smooth(STAB - 0.4, STAB + 0.8, t));
  u.uPulse.value = 0.6 * red * Math.pow(Math.max(0, Math.sin(t * 9.4)), 6); u.uGhostA.value = 0.5 * red; u.uGhost.value.set(0.01 * Math.sin(t * 5), 0.006 * Math.cos(t * 4));
  u.uSat.value = 1; u.uTint.value.set(1, 1 - 0.35 * red, 1 - 0.38 * red); u.uVig.value = lerp(3, 0.9, red); u.uLid.value = 0;
  u.uFlash.value = 0.07 * Math.exp(-Math.pow((t - MACH) / 0.08, 2)); u.uBright.value = 1;
  const sp = SUN_DIR.clone().multiplyScalar(1000).project(bgCam); const inView = (sp.z < 1 ? 1 : 0) * smooth(2.2, 1.1, Math.abs(sp.x)) * smooth(1.9, 1.1, Math.abs(sp.y));
  u.uSunUV.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); u.uSunA.value = 0.8 * inView; u.uExpA.value = 1.06; }
// =================== render ===================
window.renderAt = (t) => { update(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shootJump(RTA); postFX(t); composite(0, compMat.uniforms.uExpA.value, 1); updateDOM(t); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth();
  EQ_UP.setFromUnitVectors(window.__n0.clone().normalize(), V3(0, 1, 0)); placeEarth(0); buildCap();
  if (DEBUG === 'noglobe') earth.children[0].visible = false; if (DEBUG) console.log('earth children', earth.children.length, earth.children.map(c => c.type + ':' + (c.geometry ? c.geometry.attributes.position.count : 0)).slice(0, 6).join(' '));
  // face south, toward the Alps on the horizon
  const eye = V3(0, 0, 0), s = latLonWorld(47.0, 10.5).sub(eye); YAW0 = Math.atan2(s.x, s.z);
  window.renderAt(0); return true; })();
