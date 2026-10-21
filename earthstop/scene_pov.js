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
const VAR = +(new URLSearchParams(location.search).get('v') || 1);
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
// =================== POV rig: you are a rigid body turning around your own eye ===================
const YOU0 = V3(1.6, 0.85, -3.3), EYE_L = V3(0, 1.89, 0.1), SUN_YAW = Math.atan2(SUN_DIR.x, SUN_DIR.z), SUN_PITCH = Math.asin(SUN_DIR.y);
const _c = new THREE.Color(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function setFace(A, t, o) { // o: mouth (0..1), swell (0..1), burn (0..1), eyes (0 closed .. 1 open), bubbles (0..1)
  if (!A.face) return; const sw = 1 + 0.12 * o.swell; A.head.scale.setScalar(sw); A.skin.color.set('#eebc98').lerp(_c.set('#e8806a'), o.burn * 0.75);
  A.mouth.scale.set(1.2 + 0.2 * o.mouth, 0.25 + 1.1 * o.mouth, 0.4 + 0.3 * o.mouth); A.tongue.position.y = -0.006 - 0.015 * o.mouth;
  for (const E of A.eyes) { E.lid.rotation.x = lerp(-0.25, -1.6, o.eyes); }
  for (const B of A.bubbles) { const k = (t * 1.3 + B.ph) % 1; const on = o.bubbles > 0.01; B.b.visible = on; B.b.scale.setScalar(on ? (0.5 + 1.6 * k) * o.bubbles : 0.001); B.b.position.set(B.x * (1 + k), 0.002 + 0.03 * k, B.z + 0.008 + 0.02 * k); B.b.material.opacity = 0.85 * (1 - Math.pow(k, 4)); }
  A.armL.glove.scale.setScalar(1 + 0.25 * o.swell); A.armR.glove.scale.setScalar(1 + 0.25 * o.swell); }
function poseAstro(A, o) { A.armL.sh.rotation.set(o.aL ?? 0.3, 0, o.zL ?? 0.25); A.armL.el.rotation.x = o.eL ?? -0.6; A.armR.sh.rotation.set(o.aR ?? 0.2, 0, o.zR ?? -0.25); A.armR.el.rotation.x = o.eR ?? -0.5;
  A.legL.sh.rotation.x = o.lL ?? 0.1; A.legR.sh.rotation.x = o.lR ?? -0.1; A.legL.el.rotation.x = 0.25; A.legR.el.rotation.x = 0.2; }
const bump = (t, a, b) => (t > a && t < b) ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
const shake = (t, f) => V3(Math.sin(t * 37.1) * 0.6 + Math.sin(t * 23.3 + 1) * 0.4, Math.sin(t * 29.7 + 2) * 0.6 + Math.sin(t * 17.9) * 0.4, 0).multiplyScalar(f);
// heartbeat times: same rule as audio_pov.py (fast while panicking, slowing into the blackout)
const HB = []; { let at = OFF + 0.8, per = 0.62; while (at < LOCK + 8) { if (at < DARK) per = 0.62 + 0.4 * Math.max(0, (at - FADE) / (DARK - FADE)); else if (at < LOCK) per = 1.2; else per = Math.max(0.8, per - 0.05); HB.push(at); at += per; } }
const pulseAt = t => { let v = 0; for (const h of HB) { const d = t - h; if (d >= 0 && d < 0.5) v = Math.max(v, Math.exp(-d * 9) + 0.6 * Math.exp(-Math.max(0, d - 0.22) * 9) * (d > 0.22)); } return v; };
// drift: the recoil pushes you slowly back and up
function eyeOutside(t) { const k = Math.max(0, t - OFF); return YOU0.clone().add(EYE_L).add(V3(0.0, 0.02 * k + 0.12 * smooth(OFF, OFF + 1.5, t), 0.03 * k + 0.25 * smooth(OFF, OFF + 1.5, t))); }
// the view: yaw (pi = toward the Earth horizon), pitch, roll, fov — keyed per beat, all blended so it is one continuous move
function viewAt(t) { let yaw = Math.PI + 0.08 * Math.sin(t * 0.5), pitch = -0.28 + 0.012 * Math.sin(t * 2.2), roll = 0, fov = 68;
  if (VAR >= 2) { const o = smooth(0.2, 3.1, t); pitch = lerp(0.62, pitch, o); yaw += lerp(0.22, 0, o); roll += lerp(-0.12, 0, o); }   // v2 opening: look up into the Milky Way, then tilt down to the Earth
  pitch += 0.16 * bump(t, OFF - 0.1, OFF + 1.2) - 0.06 * bump(t, OFF + 1.0, OFF + 2.6);            // jolt as the helmet lets go
  roll += 0.10 * smooth(OFF, SPIT, t);
  const lookDown = fadeWin(t, SWELL - 0.4, SUNB, 1.4); pitch = lerp(pitch, -0.62, lookDown);
  const sun = smooth(SUNB + 0.2, SUNB + 2.8, t) * (1 - smooth(FADE + 0.5, FADE + 6, t)); yaw = lerp(yaw, SUN_YAW - 0.12, sun); pitch = lerp(pitch, SUN_PITCH - 0.12, sun);
  roll += 0.35 * Math.sin((t - FADE) * 0.45) * smooth(FADE, FADE + 3, t) + 0.25 * smooth(SUNB, FADE, t);
  yaw += 0.35 * smooth(FADE + 2, DARK, t) + 0.05 * Math.sin(t * 0.9) * smooth(FADE, DARK, t); pitch -= 0.25 * smooth(FADE + 3, DARK, t);
  return { yaw, pitch, roll, fov }; }
function setRig(eye, yaw, pitch, roll, bodyPitch = 0) { // body yaw = view yaw (forward +z), the camera looks along the body's +z
  you.g.quaternion.setFromEuler(_e.set(bodyPitch, yaw, roll, 'YXZ')); you.g.position.copy(eye).sub(EYE_L.clone().applyQuaternion(you.g.quaternion)); you.g.updateMatrixWorld(true);
  cam.quaternion.copy(you.g.quaternion).multiply(_q.setFromEuler(_e.set(pitch, Math.PI, 0, 'YXZ'))); cam.position.copy(eye); }
const PATH = { curve: null };
you.helmet.children.forEach(c => { if (c.geometry && c.geometry.type === 'BoxGeometry') c.scale.multiplyScalar(0.5); });
function updateOutside(t) { you.head.visible = false; you.g.visible = true; let fov = 68;
  const v = viewAt(t); const eye = eyeOutside(t); setRig(eye, v.yaw, v.pitch, v.roll);
  // arms: rest -> reach up into view to the latches -> push the helmet off -> hands drift; look at swelling gloves; shield the Sun
  const reach = fadeWin(t, 1.2, OFF + 0.4, 0.8), push = smooth(OFF - 0.3, OFF + 0.2, t) * (1 - smooth(OFF + 0.6, OFF + 1.8, t));
  const hands = fadeWin(t, SWELL - 0.3, SUNB + 0.2, 1.2), shield = fadeWin(t, SUNB + 2.4, FADE + 1.0, 0.8), limp = smooth(FADE + 4, DARK, t);
  const o = { aL: lerp(0.3, -1.75, reach), eL: lerp(-0.6, -1.35, reach), aR: lerp(0.2, -1.8, reach), eR: lerp(-0.5, -1.3, reach), zL: 0.25 + 0.45 * reach, zR: -0.25 - 0.45 * reach };
  o.aL += -0.4 * push; o.aR += -0.4 * push; o.eL += 0.6 * push; o.eR += 0.6 * push;
  o.aL = lerp(o.aL, -1.45 + 0.05 * Math.sin(t * 2), hands); o.eL = lerp(o.eL, -0.9, hands); o.zL = lerp(o.zL, 0.7, hands); o.aR = lerp(o.aR, -1.4 + 0.05 * Math.sin(t * 2.3), hands); o.eR = lerp(o.eR, -0.95, hands); o.zR = lerp(o.zR, -0.7, hands);
  o.aR = lerp(o.aR, -1.8, shield); o.eR = lerp(o.eR, -1.25, shield); o.zR = lerp(o.zR, -0.85, shield);
  o.aL = lerp(o.aL, -0.6, limp); o.aR = lerp(o.aR, -0.7, limp); poseAstro(you, o);
  const swell = smooth(SWELL, SWELL + 4, t); you.armL.glove.scale.setScalar(1 + 0.3 * swell); you.armR.glove.scale.setScalar(1 + 0.3 * swell);
  // the helmet: on your head (not drawn — the shader draws its rim), lifted off, tumbling away; turns its visor to you as a mirror
  const off = smooth(OFF - 0.25, OFF + 0.7, t);
  if (t < OFF - 0.25) you.helmet.visible = false;
  else { you.helmet.visible = true; const fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion), up = V3(0, 1, 0).applyQuaternion(cam.quaternion);
    const k = Math.max(0, t - OFF); const H0 = eyeOutside(OFF + 0.7);
    // fixed world anchor after it leaves: in front of you and slightly up, drifting farther
    const anchor = YOU0.clone().add(EYE_L).add(V3(0.12, 0.2, -0.7)).add(V3(0.01, 0.015, -0.035).multiplyScalar(Math.min(k, SWELL - OFF))).add(V3(0.02, 0.03, -0.12).multiplyScalar(Math.max(0, t - SWELL)));
    const lifted = eye.clone().addScaledVector(up, 0.3 * off).addScaledVector(fwd, 0.25 + 0.2 * off);
    you.helmet.position.copy(lifted).lerp(anchor, smooth(OFF + 0.2, OFF + 2.0, t));
    const spin = V3(0.9 * k, 0.7 * k + 0.6, 0.4 * k);
    _q.setFromEuler(_e.set(spin.x, spin.y, spin.z)); you.helmet.quaternion.copy(_q);
    const face = fadeWin(t, SPIT - 1.0, SWELL + 0.5, 1.2);  // visor turns to face you
    if (face > 0) { const m = new THREE.Matrix4().lookAt(you.helmet.position, eye, V3(0, 1, 0)); const qf = new THREE.Quaternion().setFromRotationMatrix(m);
      qf.multiply(_q.clone().setFromEuler(_e.set(0.012 * Math.sin(t * 1.3), Math.PI + 0.015 * Math.sin(t * 0.8), 0.04 * Math.sin(t)))); you.helmet.quaternion.slerp(qf, face); }
    mirror.visible = face > 0.02; }
  // your face (only seen in the mirror)
  const mouth = Math.max(fadeWin(t, EXHALE, EXHALE + 3.0, 0.4), fadeWin(t, SPIT - 0.5, SWELL + 0.5, 0.4) * 0.75, fadeWin(t, OFF, OFF + 1.2, 0.3) * 0.5);
  setFace(you, t, { mouth, swell: smooth(SWELL - 1.5, SWELL + 4, t), burn: smooth(SUNB, SUNB + 4, t), eyes: 1, bubbles: fadeWin(t, SPIT, SWELL + 2, 0.6) });
  you.armL.glove.scale.setScalar(1 + 0.3 * swell); you.armR.glove.scale.setScalar(1 + 0.3 * swell);
  // mirror shot: look at the helmet and zoom in on the reflection
  let yaw = v.yaw, pitch = v.pitch, roll = v.roll; const mz = fadeWin(t, SPIT - 0.6, SWELL - 0.3, 1.0);
  setRig(eye, yaw, pitch, roll);
  if (mz > 0) { const d = you.helmet.position.clone().add(V3(0, -0.02, 0)).sub(eye).normalize(); const qy = Math.atan2(d.x, d.z), qp = Math.asin(d.y);
    let dy = qy - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); setRig(eye, yaw + dy * mz, lerp(pitch, qp, mz), roll * (1 - 0.7 * mz)); fov = lerp(68, lerp(30, 19, smooth(SPIT, SWELL - 1, t)), mz); }
  // shakes: helmet burst, heartbeat
  const sh = shake(t, 0.03 * bump(t, OFF - 0.1, OFF + 1.0) + 0.004 * pulseAt(t) * (t > OFF && t < DARK) + 0.006 * smooth(FADE, DARK, t));
  cam.rotateX(sh.y); cam.rotateY(sh.x); cam.fov = fov;
  // gas: air bursting out of the suit around you, then your own breath leaving as a white cloud
  nearSmoke.begin(); smokeMat.uniforms.uTint.value.set('#f2f6fa'); const fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion), up = V3(0, 1, 0).applyQuaternion(cam.quaternion), right = V3(1, 0, 0).applyQuaternion(cam.quaternion);
  for (let k = 0; k < 50; k++) { const age = t - (OFF - 0.15) - k * 0.03; if (age > 0 && age < 1.5) { const a = hash(k * 3.1) * 6.283, r = 0.25 + 0.5 * hash(k * 1.7);
    _p.copy(eye).addScaledVector(fwd, 0.35 + age * 1.6).addScaledVector(right, Math.cos(a) * r * (0.4 + age)).addScaledVector(up, Math.sin(a) * r * (0.4 + age) + 0.15); nearSmoke.add(_p, 0.1 + age * 0.5, 0.45 * (1 - age / 1.5)); } }
  for (let k = 0; k < 30; k++) { const age = t - (EXHALE + 0.15) - k * 0.07; if (age > 0 && age < 1.8) { _p.copy(eye).addScaledVector(up, -0.16 + 0.05 * age).addScaledVector(fwd, 0.12 + age * 0.75).addScaledVector(right, (hash(k) - 0.5) * 0.18 * age); nearSmoke.add(_p, 0.05 + age * 0.3, 0.5 * (1 - age / 1.8)); } }
  nearSmoke.end();
  mate.g.visible = false; hatchGlow.visible = false;
  nSun.target.position.copy(you.g.position); nSun.target.updateMatrixWorld(); nSun.position.copy(you.g.position).addScaledVector(SUN_DIR, 50);
}
// rescue: eyes flicker open three times — the crewmate's visor, the handrails rushing by, the open hatch
function updateRescue(t) { you.head.visible = false; you.g.visible = false; mirror.visible = false; hatchGlow.visible = true; nearSmoke.begin(); nearSmoke.end();
  if (!PATH.curve) { const e0 = eyeOutside(RESCUE); PATH.curve = new THREE.CatmullRomCurve3([e0, V3(3.4, 0.9, -0.9), V3(6.3, -0.35, 1.0), V3(8.5, -1.6, 2.0), V3(8.1, -2.95, 2.0)]); }
  const u = smooth(RESCUE + 1.6, LOCK - 0.1, t) * 0.97; const eye = PATH.curve.getPointAt(u), tan = PATH.curve.getTangentAt(Math.min(0.99, u + 0.02));
  // the crewmate: first facing you up close, then ahead of you on the route, towing you by the arm
  mate.g.visible = true; const grab = smooth(RESCUE, RESCUE + 1.4, t);
  if (t < RESCUE + 2.35) { const q = new THREE.Quaternion().setFromEuler(_e.set(0, Math.PI + 0.3, 0)); const f = V3(0, 0, 1).applyQuaternion(q);
    const mh = eye.clone().add(V3(-0.35, 0.05, -lerp(1.6, 0.75, grab))); mate.g.position.copy(mh).sub(V3(0, 1.86, 0)); mate.g.rotation.set(0, 0.35, 0); poseAstro(mate, { aR: -1.5 + 0.2 * grab, eR: -0.3, aL: -0.5, zR: 0.1 }); }
  else { const u2 = Math.min(1, u + 0.07), p2 = PATH.curve.getPointAt(u2), d = PATH.curve.getTangentAt(u2); mate.g.position.copy(p2).add(V3(0.0, -1.6, 0.0)).addScaledVector(d, 0.35);
    mate.g.rotation.set(0.9, Math.atan2(d.x, d.z), 0); poseAstro(mate, { aR: 1.2, eR: -0.2, aL: -2.4, eL: -0.6, lL: 0.4, lR: -0.2 }); }
  let look;
  if (t < RESCUE + 2.35) look = mate.head.localToWorld(V3(0, 0, 0));
  else if (t < RESCUE + 4.9) look = eye.clone().addScaledVector(tan, 1.0).add(V3(0, -1.1, 0.35));
  else look = V3(6.83, -3.0, 2.0);
  cam.position.copy(eye); cam.up.set(0, 1, 0); cam.lookAt(look); cam.rotateZ(0.25 * Math.sin(t * 0.7)); cam.fov = 62;
  const sh = shake(t, 0.004); cam.rotateX(sh.y); cam.rotateY(sh.x);
  nSun.target.position.copy(eye); nSun.target.updateMatrixWorld(); nSun.position.copy(eye).addScaledVector(SUN_DIR, 50); }
function shootSpace(rt) { cam.aspect = W / H; cam.updateProjectionMatrix(); bgCam.fov = cam.fov; bgCam.aspect = cam.aspect; bgCam.quaternion.copy(cam.quaternion); bgCam.position.set(0, 0, 0); bgCam.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bg, bgCam); renderer.setRenderTarget(rt); renderer.clearDepth(); renderer.render(near, cam); }
// airlock: you wake up, blurred white light, the crewmate in front of you gives a thumbs-up
you2.head.visible = false; you2.g.visible = false; mate2.g.rotation.y = -0.85;
function updateLock(t) { const u = t - LOCK;
  poseAstro(you2, { aL: -0.4, aR: -0.6 }); poseAstro(mate2, { aR: smooth(LOCK + 4.0, LOCK + 5.0, t) * -2.6, eR: -0.2 - 0.6 * smooth(LOCK + 4.0, LOCK + 5.0, t), aL: -0.5 });
  mate2.g.position.set(0.85 - 0.12 * smooth(LOCK + 1, LOCK + 4, t), -1.15 + 0.03 * Math.sin(t * 0.8), -1.0);
  lockSmoke.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); for (let k = 0; k < 60; k++) { const age = ((t * 0.7 + k / 60) % 1); _p.set(-2.3 + age * 1.2, 0.8 + (hash(k) - 0.5) * 1.2, (hash(k * 3) - 0.5) * 1.2); lockSmoke.add(_p, 0.2 + age * 0.8, 0.25 * (1 - age) * (1 - smooth(LOCK + 1, LOCK + 3, t))); } lockSmoke.end();
  you2.g.updateMatrixWorld(true); const eye = you2.head.localToWorld(V3(0, 0.03, 0.1)); const back = smooth(BACK, T_END, t);
  const mh = mate2.head.localToWorld(V3(0, 0, 0)); lockCam.position.copy(eye).addScaledVector(eye.clone().sub(mh).setY(0).normalize(), 0.5 + 0.35 * back).add(V3(0, 0.05 + 0.05 * back, 0)); const look = mate2.head.localToWorld(V3(0, -0.3, 0)).add(V3(-0.1 * back, 0, 0));
  lockCam.up.set(0, 1, 0); lockCam.lookAt(look); lockCam.rotateZ(0.06 * Math.sin(t * 0.6) - 0.15 * (1 - smooth(LOCK, LOCK + 3, t)));
  lockCam.rotateX(0.05 * bump(t, LOCK + 2.25, LOCK + 3.0) + 0.02 * Math.sin(t * 0.9)); lockCam.fov = lerp(64, 56, smooth(LOCK, BACK, t)); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = DE ? [
  [4.2, 6.6, 'Und plötzlich —<br>totale Stille.'],
  [6.7, 8.9, 'Atme AUS!<br>Luft anhalten würde deine Lunge zerreißen.'],
  [9.3, 11.9, 'Schau — dein Speichel kocht.'],
  [12.0, 14.8, 'Nicht vor Hitze:<br>Fast ohne Druck kocht Wasser schon bei 37 °C.'],
  [15.3, 20.8, 'Dein Körper schwillt an…<br>aber deine Haut hält. Du explodierst nicht.'],
  [21.3, 23.9, 'Du erfrierst nicht sofort —<br>ohne Luft verlierst du kaum Wärme.'],
  [24.0, 26.8, 'Die echte Gefahr ist die Sonne:<br>ungefiltertes UV, schwerer Sonnenbrand.'],
  [27.3, 31.4, 'Nach etwa 10 Sekunden<br>hat dein Blut keinen Sauerstoff mehr.'],
  [31.5, 35.6, 'Die Welt wird grau…<br>und immer enger.'],
  [36.4, 39.8, 'Nach ~15 Sekunden: Licht aus.<br>Jetzt bleiben etwa 90 Sekunden.'],
  [40.4, 47.6, 'Dein Kollege zieht dich<br>zurück zur Luftschleuse.'],
  [48.6, 53.8, 'Der Druck kommt zurück.<br>Du öffnest die Augen. Du lebst.'],
  [54.2, 57.0, 'Echte Geschichte: 1966, Houston.<br>Jim LeBlancs Anzug verlor in einer NASA-Testkammer den Druck.'],
  [57.1, 59.9, 'Er spürte noch, wie sein Speichel blubberte.<br>87 Sekunden später wachte er auf — ohne Schäden.'],
] : VAR === 2 ? [
  [4.2, 6.6, 'And just like that —<br>total silence.'],
  [6.7, 8.9, 'Let the air OUT.<br>Holding your breath would rip your lungs.'],
  [9.3, 11.9, 'Look — your spit is boiling.'],
  [12.0, 14.8, 'Not from heat. With almost no pressure,<br>water boils at 98 °F.'],
  [15.3, 20.8, 'Your body puffs up…<br>but your skin is tough enough. No explosion.'],
  [21.3, 23.9, 'You won\'t freeze solid —<br>there\'s no air to steal your heat.'],
  [24.0, 26.8, 'The Sun is the real danger:<br>raw UV, instant sunburn.'],
  [27.3, 31.4, 'About 10 seconds in,<br>your blood has no oxygen left.'],
  [31.5, 35.6, 'The world goes gray…<br>and closes in.'],
  [36.4, 39.8, 'Around 15 seconds — lights out.<br>The clock: ~90 seconds to save you.'],
  [40.4, 47.6, 'Your crewmate drags you<br>back to the airlock.'],
  [48.6, 53.8, 'Pressure comes back.<br>You open your eyes. You made it.'],
  [54.2, 57.0, 'Real story: 1966, Houston. NASA engineer<br>Jim LeBlanc\'s suit lost pressure in a test chamber.'],
  [57.1, 59.9, 'He remembered his saliva bubbling.<br>He woke up 87 seconds later — and was fine.'],
] : [
  [4.2, 6.6, 'Instantly: silence.<br>No air, no sound.'],
  [6.7, 8.9, 'Breathe OUT —<br>holding it would tear your lungs.'],
  [9.3, 11.9, 'Your spit starts to boil…'],
  [12.0, 14.8, '…at body temperature.<br>In a vacuum, water boils without heat.'],
  [15.3, 20.8, 'You swell up…<br>but you don\'t explode. Your skin holds you together.'],
  [21.3, 23.9, 'You don\'t freeze instantly —<br>a vacuum holds heat in.'],
  [24.0, 26.8, 'But the Sun burns your skin.<br>Nothing blocks the UV.'],
  [27.3, 31.4, '~10 seconds: your blood<br>runs out of oxygen.'],
  [31.5, 35.6, 'Colors fade.<br>Your vision narrows…'],
  [36.4, 39.8, '~15 seconds: you black out.<br>Now you have about 90 seconds.'],
  [40.4, 47.6, 'Your crewmate has one job:<br>get you inside.'],
  [48.6, 53.8, 'Air rushes back in.<br>You wake up. You\'re alive.'],
  [54.2, 57.0, 'This really happened: in 1966, NASA engineer<br>Jim LeBlanc\'s suit leaked in a vacuum chamber.'],
  [57.1, 59.9, 'His last memory: spit bubbling on his tongue.<br>He was fine.'],
];
function hudAt(t) { let stat = '', lab = '', val = '', sub = '', show = 1;
  const T = DE ? { ok: 'EVA · ANZUG OK', sp: 'ANZUGDRUCK', p0: 0.30, u: ' bar', d: 2, o2: 'O2 100 %', un: 'HELM ENTRIEGELT', w: 'WARNUNG', nh: 'OHNE HELM', tv: 'ZEIT IM VAKUUM', s: ['AUSATMEN!', 'SPEICHEL KOCHT', 'SCHWELLUNG (EBULLISMUS)', 'UV-VERBRENNUNG', 'BEWUSSTSEIN SCHWINDET', 'BEWUSSTLOS · ~90 s FENSTER', 'DRUCK WIEDERHERGESTELLT'] }
    : { ok: 'EVA · SUIT OK', sp: 'SUIT PRESSURE', p0: 4.3, u: ' psi', d: 1, o2: 'O2 100%', un: 'HELMET UNLOCKED', w: 'WARNING', nh: 'NO HELMET', tv: 'TIME IN VACUUM', s: ['EXHALE!', 'SALIVA BOILING', 'SWELLING (EBULLISM)', 'UV BURN', 'LOSING CONSCIOUSNESS', 'UNCONSCIOUS · ~90 s WINDOW', 'REPRESSURIZED'] };
  const num = x => { const s = x.toFixed(T.d); return DE ? s.replace('.', ',') : s; };
  if (t < OFF - 0.4) { stat = '<b style="background:#5fd27a"></b>' + T.ok; lab = T.sp; val = num(T.p0) + T.u; sub = T.o2; }
  else if (t < OFF + 0.6) { stat = '<b></b>' + T.un; lab = T.sp; val = num(T.p0 * (1 - smooth(OFF - 0.4, OFF + 0.3, t))) + T.u; sub = T.w; }
  else if (t < BACK) { const secs = t < DARK ? Math.min(15, Math.floor((t - OFF) * 15 / (DARK - OFF))) : Math.floor(15 + (t - DARK) * 72 / (LOCK - DARK)); const shown = t < LOCK ? secs : 87;
    stat = '<b></b>' + T.nh; lab = T.tv; val = 'T+' + shown + ' s'; sub = T.s[t < SPIT ? 0 : t < SWELL ? 1 : t < SUNB ? 2 : t < FADE ? 3 : t < DARK ? 4 : t < LOCK ? 5 : 6]; }
  else show = 0;
  return { stat, lab, val, sub, show }; }
const blur = t => t < DARK ? 2.2 * smooth(FADE + 3, DARK - 1, t) : t < LOCK ? 3.5 : lerp(9, 0, smooth(LOCK, LOCK + 3.2, t));
if (DE) { el.title.innerHTML = 'POV: Du nimmst im All<br>deinen <span class="hl">Helm</span> ab'; el.title.style.fontSize = '70px'; el.title.style.padding = '0 60px'; el.endT.innerHTML = 'POV: Du nimmst im All deinen <span class="hl">Helm</span> ab';
  el.endS.innerHTML = 'BEI PLÖTZLICHEM DRUCKVERLUST BLEIBST DU ETWA 10–15 SEKUNDEN BEI BEWUSSTSEIN.<br>DRUCK INNERHALB VON ~90 SEKUNDEN KANN ÜBERLEBBAR SEIN.<br>JIM LEBLANC, 1966: LECK IM ANZUG IN EINER NASA-VAKUUMKAMMER — VOLLSTÄNDIG ERHOLT.'; document.documentElement.lang = 'de'; }
if (VAR === 2) { el.title.innerHTML = 'POV: you take off<br>your <span class="hl">helmet</span> in space'; el.endT.innerHTML = 'POV: you take off your <span class="hl">helmet</span> in space'; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.0, 3.6, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(BACK - 0.4, BACK, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const b = blur(t); $('c').style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// eyelids: closed in the blackout; three half-open flickers during the rescue; wake in the airlock
function lidAt(t) { if (t < DARK - 1.2) return 0.12 * bump(t, SUNB + 2.2, SUNB + 3.0) + 0.35 * smooth(FADE + 5, DARK - 1.2, t);
  if (t < LOCK) { let open = 0; for (const [a, b, m] of [[RESCUE + 0.2, RESCUE + 2.1, 0.7], [RESCUE + 2.6, RESCUE + 4.7, 0.6], [RESCUE + 5.2, LOCK - 0.3, 0.75]]) open = Math.max(open, m * fadeWin(t, a, b, 0.35));
    if (t < RESCUE) return 0.35 + 0.65 * smooth(DARK - 1.2, DARK - 0.2, t);
    return 1 - open * (1 - 0.15 * Math.sin(t * 7) ** 2); }
  return 1 - smooth(LOCK + 0.2, LOCK + 1.6, t) * (1 - 0.3 * bump(t, LOCK + 1.8, LOCK + 2.2)); }
function postFX(t, inLock) { const u = compMat.uniforms;
  u.uFrame.value = 1 - smooth(OFF - 0.15, OFF + 0.45, t); u.uFrameK.value = smooth(OFF - 0.2, OFF + 0.5, t);
  u.uFog.value = (fadeWin(t, 1.25, 2.6, 0.45) * 0.9 + fadeWin(t, 3.15, 3.7, 0.2) * 0.6) * u.uFrame.value;
  u.uPulse.value = (t > OFF && t < LOCK + 3) ? pulseAt(t) * (0.5 + 0.8 * smooth(FADE, DARK, t)) : 0;
  const hyp = smooth(FADE + 1, DARK - 1, t) * (t < LOCK ? 1 : 0); const res = t >= DARK && t < LOCK ? 1 : 0;
  u.uGhostA.value = Math.max(hyp, 0.6 * res); u.uGhost.value.set(0.012 * Math.sin(t * 1.3) + 0.006, 0.006 * Math.cos(t * 1.7));
  u.uSat.value = t < LOCK ? lerp(1, 0.12, Math.max(hyp, res)) : lerp(0.35, 1, smooth(LOCK, LOCK + 4, t));
  const burn = smooth(SUNB + 2, SUNB + 4, t) * (1 - smooth(FADE + 2, FADE + 5, t)); u.uTint.value.set(1, 1 - 0.12 * burn, 1 - 0.2 * burn); if (VAR === 2) u.uTint.value.multiply(V3(0.97, 1.0, 1.06)); if (DE) u.uTint.value.multiply(V3(1.04, 1.0, 0.97));
  u.uVig.value = t < LOCK ? lerp(3, 0.42, smooth(FADE + 0.5, DARK - 0.8, t) * (1 - 0.35 * res)) + 0.06 * u.uPulse.value : lerp(0.8, 3, smooth(LOCK, LOCK + 3, t));
  u.uLid.value = lidAt(t);
  u.uFlash.value = inLock ? 0.7 * (1 - smooth(LOCK + 0.2, LOCK + 3.0, t)) * (1 - u.uLid.value) : 0;
  u.uBright.value = 1;
  // sun glare where the Sun is on screen
  const sp = SUN_DIR.clone().multiplyScalar(1000).project(bgCam); const inView = (!inLock && sp.z < 1 ? 1 : 0) * smooth(2.2, 1.1, Math.abs(sp.x)) * smooth(1.9, 1.1, Math.abs(sp.y));
  u.uSunUV.value.set(DE ? 0.5 - sp.x * 0.5 : sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); u.uSunA.value = inView * (1.0 - 0.45 * fadeWin(t, SUNB + 2.6, FADE + 1, 0.8));
  u.uExpA.value = (inLock ? 1.05 : 1.0) * (VAR >= 2 ? 1.08 : 1) * (1 + 0.5 * fadeWin(t, SUNB + 2.0, SUNB + 3.6, 0.6)); }
// =================== render ===================
window.renderAt = (t) => {
  const inLock = t >= LOCK;
  if (!inLock) { if (t < DARK) updateOutside(t); else updateRescue(t); cam.aspect = W / H; cam.updateProjectionMatrix(); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shootSpace(RTA); }
  else { updateLock(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(lockCam.fov * Math.PI / 360)); shootTo(RTA, lock, lockCam); }
  if (DEBUG === '3p' && !inLock) { you.head.visible = true; const e = cam.position.clone(); cam.position.add(V3(1.4, 0.4, -1.6)); cam.lookAt(e); cam.fov = 50; cam.updateProjectionMatrix(); shootSpace(RTA); }
  postFX(t, inLock); composite(0, compMat.uniforms.uExpA.value, 1); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth(); window.renderAt(0); return true; })();
