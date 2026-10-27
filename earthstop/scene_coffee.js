import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you quit caffeine today?" (64 s, US): how caffeine works (it blocks the "tired" signal), why it hooks you, the withdrawal timeline, sleep,
// and the twist: daily drinkers after their cup are no more alert than non-drinkers — the "boost" is mostly the end of withdrawal.
// Facts: Juliano & Griffiths 2004 (onset 12-24 h, peak 20-51 h, 2-9 days, headache in 50%); DSM-5 caffeine withdrawal; Drake 2013 (400 mg 6 h before bed -> >1 h less sleep);
// Rogers et al. 2010 (379 people, Bristol: no net alertness gain for habitual drinkers); NCA 2025 (66% of US adults drink coffee daily).
// =================== timeline ===================
const BRAIN = 4.0, ADAPT = 11.0, QUIT = 17.0, PEAK = 24.0, FADE = 31.0, SLEEP = 37.0, TWIST = 43.0, BOOST = 50.0, FREE = 56.0, T_END = 61.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 1313;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    // soft glow around bright HDR spots (lamps, the sun, emissive bits): two rings of taps on the over-1.0 part
    vec3 glow(sampler2D tx, vec2 uv, float ex){ vec3 g=vec3(0.0); for(int i=0;i<8;i++){ float a=float(i)*0.785398+0.39; vec2 d=vec2(cos(a),sin(a))*vec2(1.0,0.5625);
      g+=max(texture2D(tx,uv+d*0.012).rgb*ex-1.0,0.0)*0.6+max(texture2D(tx,uv+d*0.03).rgb*ex-1.0,0.0)*0.4; } return g/8.0; }
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA+0.35*uLook*glow(tA,uv,uExpA)); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB+0.35*uLook*glow(tB,uv,uExpB)); c=mix(a,b,uMix); }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      c=srgb(c);
      // "storybook" finish: softer contrast with lifted blacks and a STATIC paper texture (moving grain gets mangled by TikTok's re-encode)
      vec2 px=vUv*vec2(1080.0,1920.0); float paper=vn(px/90.0)*0.5+vn(px/23.0)*0.3+vn(px/6.0)*0.2, grain=vn(px/1.7)-0.5;
      vec3 l=mix(c, c*0.93+vec3(0.035,0.03,0.025), uLook); l*=1.0+uLook*(0.07*(paper-0.5)+0.05*grain);
      float vg=length((vUv-0.5)*vec2(1.0,0.75)); l*=1.0-uLook*0.18*smoothstep(0.35,0.75,vg);
      gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }` });
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
// =================== the hero: same look in every scene (own seed so the height/hair never change) ===================
function makeHero() { const sv = seed; seed = 4242; const p = makePerson(rnd, { top: '#2fa89a', bottom: '#2a2e3a', hair: '#4a2f1b', skin: '#e9c4a2', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.3 }); seed = sv; return p; }
// =================== faces: eyes with lids (blinking), brows and a mouth on top of people.js heads; setExpr() picks a mood ===================
// head centre in root space ≈ (0, 1.63, 0.005), radius 0.115 scaled (1, 1.13, 1.05) -> the face plane sits at z ≈ 0.12
function addFace(P, skin, hair) { const f = new THREE.Group(); P.root.add(f);
  const eyeW = new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.3 }), pup = new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.2 }), lidM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }), brM = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.8 }), mouthM = new THREE.MeshStandardMaterial({ color: '#6a2a2a', roughness: 0.6 });
  const eyes = [], lids = [], brows = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 10), eyeW); e.scale.set(1, 1.05, 0.55); e.position.set(s * 0.042, 1.655, 0.113); f.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), pup); p.position.set(s * 0.042, 1.652, 0.124); f.add(p); eyes.push(p);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.012), lidM); l.position.set(s * 0.042, 1.677, 0.126); f.add(l); lids.push(l);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.009, 0.01), brM); b.position.set(s * 0.042, 1.693, 0.121); f.add(b); brows.push({ b, s }); }
  const blushM = new THREE.MeshStandardMaterial({ color: new THREE.Color(skin).lerp(new THREE.Color('#ff6a6a'), 0.45), roughness: 0.9 });   // rosy cheeks
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 8), blushM); c.scale.set(1.1, 0.7, 0.3); c.position.set(s * 0.056, 1.618, 0.113); f.add(c); }
  const arc = new THREE.TorusGeometry(0.024, 0.0055, 6, 16, Math.PI);
  const smile = new THREE.Mesh(arc, mouthM); smile.rotation.z = Math.PI; smile.position.set(0, 1.592, 0.12); f.add(smile);
  const frown = new THREE.Mesh(arc, mouthM); frown.position.set(0, 1.572, 0.12); f.add(frown);
  const flat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.007, 0.008), mouthM); flat.position.set(0, 1.582, 0.122); f.add(flat);
  const open = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#3a1414', roughness: 0.7 })); open.scale.set(0.02, 0.03, 0.008); open.position.set(0, 1.58, 0.118); f.add(open);
  // lid: 0 = wide open, 1 = closed; brow: + raises the inner ends (worry/pain), - lowers them (anger/focus); y = brow lift
  const E = { neutral: [0.15, 0, 0, 'flat'], happy: [0.05, -0.1, 0.006, 'smile'], tired: [0.55, 0.15, -0.004, 'flat'], pain: [0.45, 0.45, 0.004, 'frown'], yawn: [0.75, 0.25, 0.006, 'open'], sleep: [1, 0, -0.003, 'flat'], grumpy: [0.35, -0.35, -0.004, 'frown'], shock: [0, 0.1, 0.01, 'open'] };
  return { setExpr(name, t = 0) { const [lid0, br, by, m] = E[name] || E.neutral; const blink = name === 'sleep' ? 0 : Math.max(0, 1 - Math.abs(((t + P.h * 7) % 3.7) - 0.08) / 0.08);
    const lid = Math.max(lid0, blink); eyes.forEach(p => p.visible = lid < 0.85); lids.forEach(l => { const h = 0.004 + 0.044 * lid; l.scale.y = h; l.position.y = 1.677 - h / 2 + 0.002; });
    brows.forEach(({ b, s }) => { b.rotation.z = -s * br; b.position.y = 1.693 + by; }); smile.visible = m === 'smile'; frown.visible = m === 'frown'; flat.visible = m === 'flat'; open.visible = m === 'open'; } }; }
// =================== HOME (meters): kitchen counter with the coffee machine, a table, the couch, the bed, a window with curtains.
// One scene, modes: kitchen (push the mug away), yawn (hour 12-24 at the table), couch (the peak, throbbing head; fade: calmer), bed (deep sleep), curtains (morning, no cup) ===================
const home = new THREE.Scene(); const hmCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hmHemi = new THREE.HemisphereLight(0xfff4e8, 0x6a5a50, 0.8); home.add(hmHemi);
const hmSun = new THREE.DirectionalLight(0xffe8c8, 2.2); hmSun.position.set(-3, 5, -8); hmSun.target.position.set(0, 0, 0); hmSun.castShadow = true; hmSun.shadow.mapSize.set(2048, 2048); hmSun.shadow.bias = -0.0004; Object.assign(hmSun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, far: 30 }); home.add(hmSun, hmSun.target);
const hmFill = new THREE.PointLight(0xffe0c0, 3, 10, 1.4); hmFill.position.set(1.5, 2.4, 2.5); home.add(hmFill);
const hmLamp = new THREE.PointLight(0xffb070, 0, 4, 1.5); hmLamp.position.set(-2.6, 1.3, -1.6); home.add(hmLamp);
{ const wood = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 40) { g.fillStyle = pick(['#c89870', '#c2926a', '#cc9c74', '#bc8c64']); g.fillRect(0, y, w, 39); g.fillStyle = 'rgba(90,55,30,0.25)'; g.fillRect(0, y + 38, w, 2); } }, [3, 3]);
  const fl = mesh(new THREE.PlaneGeometry(9, 8), M('#ffffff', { map: wood, roughness: 0.7 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.5); home.add(fl);
  bx(9, 3, 0.1, '#e8d8c0', 0, 1.5, -4.05, home); bx(0.1, 3, 8, '#d8e4d0', -4.5, 1.5, -0.5, home); bx(0.1, 3, 8, '#e8d8c0', 4.5, 1.5, -0.5, home); bx(9, 0.1, 8, '#f4f0ea', 0, 3.0, -0.5, home);
  // kitchen counter + coffee machine (right back)
  bx(3.0, 0.9, 0.65, '#f4f0e8', 2.6, 0.45, -3.6, home); bx(3.0, 0.05, 0.68, '#3a3a40', 2.6, 0.925, -3.6, home);
  bx(0.3, 0.42, 0.32, '#2a2a30', 2.2, 1.16, -3.62, home); bx(0.22, 0.06, 0.2, '#8a8a90', 2.2, 1.0, -3.52, home);
  // table + chair (middle)
  bx(1.2, 0.05, 0.8, '#8a5a3a', 1.2, 0.75, -1.3, home); for (const [dx, dz] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) bx(0.05, 0.75, 0.05, '#6a4a30', 1.2 + dx, 0.375, -1.3 + dz, home);
  bx(0.45, 0.05, 0.45, '#6a4a30', 1.2, 0.47, -0.65, home); bx(0.45, 0.55, 0.05, '#6a4a30', 1.2, 0.75, -0.43, home);
  // couch (left) + floor lamp
  bx(2.2, 0.42, 0.95, '#5a7ab0', -2.4, 0.21, -1.6, home); bx(2.2, 0.8, 0.25, '#4a6aa0', -2.4, 0.5, -2.1, home); for (const x of [-3.45, -1.35]) bx(0.22, 0.6, 0.95, '#4a6aa0', x, 0.4, -1.6, home);
  bx(0.04, 1.4, 0.04, '#2a2a30', -3.8, 0.7, -2.6, home); const shade = mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.26, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#3a2a10' })); shade.position.set(-3.8, 1.5, -2.6); home.add(shade);
  // bed (front left)
  bx(1.5, 0.35, 2.1, '#6a4a34', -2.6, 0.18, 1.6, home); bx(1.42, 0.2, 2.0, '#f2f0ec', -2.6, 0.45, 1.6, home); bx(1.5, 0.9, 0.1, '#6a4a34', -2.6, 0.6, 0.55, home); bx(0.6, 0.14, 0.36, '#ffffff', -2.6, 0.62, 0.85, home); }
const duvetH = bx(1.5, 0.12, 1.4, '#e8a83a', -2.6, 0.6, 1.95, home);
// window with sliding curtains (back wall, middle)
const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) }); { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.5), winM); wn.position.set(-0.3, 1.75, -3.99); home.add(wn); bx(1.95, 0.08, 0.12, '#f4f0ea', -0.3, 0.98, -3.95, home); }
const curtL = bx(0.95, 1.7, 0.04, '#c84a5a', -0.75, 1.75, -3.9, home), curtR = bx(0.95, 1.7, 0.04, '#c84a5a', 0.15, 1.75, -3.9, home);
// the mug (on the counter or in the hand), the clock on the wall
const mugH = new THREE.Group(); { const m = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 14), M('#f4f4f2')); m.position.y = 0.055; mugH.add(m); const c = mesh(new THREE.CircleGeometry(0.048, 14), M('#4a2a18')); c.rotation.x = -Math.PI / 2; c.position.y = 0.1; mugH.add(c);
  const hd = mesh(new THREE.TorusGeometry(0.032, 0.01, 6, 12), M('#f4f4f2')); hd.position.set(0.065, 0.06, 0); mugH.add(hd); } home.add(mugH);
const clkCv = document.createElement('canvas'); clkCv.width = 256; clkCv.height = 96; const clkTex = new THREE.CanvasTexture(clkCv); clkTex.colorSpace = THREE.SRGBColorSpace;
function drawClock(txt) { const g = clkCv.getContext('2d'); g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#7affa0'; g.font = 'bold 70px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(txt, 128, 74); clkTex.needsUpdate = true; }
{ const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: clkTex, color: new THREE.Color(1.5, 1.5, 1.5) })); ck.position.set(1.4, 2.2, -3.99); home.add(ck); }
const meC = makePerson(rnd, { top: '#8a8e98', bottom: '#2a3a5a', hair: '#3a2416', skin: '#d8a882', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.55 }); home.add(meC.outer); meC.elbows[0].add(mugH); const faceC = addFace(meC, '#d8a882', '#3a2416');
// throbbing headache rings around the head (red, expanding)
const RINGS = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.3, 0.25), transparent: true, depthWrite: false })); home.add(r); return r; });
const zzzT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); });
const zzzS = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzT, transparent: true, depthWrite: false })); zzzS.scale.setScalar(0.35); home.add(zzzS);
const _hp = new THREE.Vector3();
function lightHome(mode) { const L = { kitchen: [0.85, 2.2, [1.6, 1.5, 1.3], 0, 3], yawn: [0.8, 1.6, [1.3, 1.35, 1.4], 0, 3], couch: [0.55, 0.9, [0.9, 0.85, 0.95], 2.0, 2.4], fade: [0.75, 1.6, [1.4, 1.4, 1.3], 0, 3], bed: [0.4, 0, [0.18, 0.24, 0.55], 0, 1.6], curtains: [1.15, 3.4, [2.4, 2.2, 1.8], 0, 3.5] }[mode];
  hmHemi.intensity = L[0]; hmSun.intensity = L[1]; winM.color.setRGB(...L[2]); hmLamp.intensity = L[3]; hmFill.intensity = L[4]; }
function updateHome(t, mode) { lightHome(mode); const P = meC, o = P.outer; o.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); mugH.visible = false; RINGS.forEach(r => r.visible = false); zzzS.visible = false; faceC.setExpr('neutral', t);
  curtL.position.x = -0.75; curtR.position.x = 0.15; drawClock(mode === 'bed' ? '23:00' : mode === 'curtains' ? '7:00' : mode === 'kitchen' ? '7:30' : '15:00'); duvetH.position.set(-2.6, 0.6, 1.95); duvetH.scale.y = 0.12;
  if (mode === 'kitchen') {   // at the counter, the mug in hand, then set down and pushed away
    o.position.set(2.2, 0.95, -2.95); o.rotation.y = -0.5; const push = smooth(1.0, 2.6, t); mugH.visible = true; P.arms[0].rotation.x = lerp(-1.3, -1.2, push); P.elbows[0].rotation.x = lerp(-1.6, -0.2, push); P.arms[0].rotation.z = 0.2 * push; mugH.position.set(0, -0.3, 0.06); mugH.rotation.set(0, 0, 0); faceC.setExpr(push > 0.5 ? 'grumpy' : 'neutral', t); }
  else if (mode === 'yawn') {   // at the table, a big yawn, rubbing the temples
    o.position.set(1.2, 0.55, -0.7); o.rotation.y = Math.PI; poseSit(P); const y = fadeWin(t, QUIT + 1.2, QUIT + 2.8, 0.4), rub = fadeWin(t, QUIT + 3.6, QUIT + 6.8, 0.4);
    P.arms[1].rotation.x = lerp(-0.3, -2.4, Math.max(y, rub)); P.elbows[1].rotation.x = lerp(-0.6, -1.8, Math.max(y, rub)); P.arms[0].rotation.x = lerp(-0.3, -2.4, rub); P.elbows[0].rotation.x = lerp(-0.6, -1.8, rub); P.root.rotation.x = -0.15 * y + 0.12 * rub; faceC.setExpr(y > 0.3 ? 'yawn' : 'tired', t); }
  else if (mode === 'couch' || mode === 'fade') {   // slumped on the couch holding the head; the rings throb (calmer in "fade")
    o.position.set(-2.4, 0.62, -1.55); o.rotation.y = 0; poseSit(P); const hold = mode === 'couch' ? 1 : 1 - smooth(FADE + 1.5, FADE + 3.5, t);
    P.arms[0].rotation.set(-2.5 * hold, 0, 0.35 * hold); P.arms[1].rotation.set(-2.5 * hold, 0, -0.35 * hold); P.elbows[0].rotation.x = P.elbows[1].rotation.x = lerp(-0.6, -1.9, hold); P.root.rotation.x = 0.2 * hold;
    const head = P.torso.localToWorld(_hp.set(0, 1.63, 0)), rate = mode === 'couch' ? 1.6 : lerp(1.6, 0.5, smooth(FADE, FADE + 4, t)), amp = mode === 'couch' ? 1 : 1 - smooth(FADE + 1, FADE + 4.5, t);
    faceC.setExpr(mode === 'couch' ? 'pain' : hold > 0.5 ? 'tired' : 'neutral', t); RINGS.forEach((r, k) => { const u = ((t * rate) + k / 3) % 1; r.visible = amp > 0.02; r.position.copy(head); r.scale.setScalar(0.7 + 1.4 * u); r.material.opacity = amp * (1 - u); r.lookAt(hmCam.position); }); }
  else if (mode === 'bed') {   // asleep under the duvet
    o.position.set(-2.6, 0.75, 1.35); o.rotation.set(-Math.PI / 2, 0, 0); zzzS.visible = true; o.updateMatrixWorld(true); const hd = P.torso.localToWorld(V3(0, 1.63, 0)); duvetH.scale.y = 0.28; duvetH.position.set(-2.6, 0.76 + 0.008 * Math.sin(t * 1.4), hd.z + 1.12); zzzS.position.copy(hd).add(V3(0.2, 0.28 + 0.03 * Math.sin(t * 1.3), 0.02)); zzzS.scale.setScalar(0.18); faceC.setExpr('sleep', t); }
  else {   // curtains: opens them wide, stretches
    o.position.set(-0.3, 0.95, -3.35); o.rotation.y = Math.PI; const op = smooth(FREE + 0.4, FREE + 1.8, t); curtL.position.x = -0.75 - 0.75 * op; curtR.position.x = 0.15 + 0.75 * op;
    const st = smooth(FREE + 2.2, FREE + 3.2, t); P.arms[0].rotation.set(-1.4 - 1.4 * st, 0, lerp(0.9 * op, -0.45, st)); P.arms[1].rotation.set(-1.4 - 1.4 * st, 0, lerp(-0.9 * op, 0.45, st)); if (t > FREE + 2.2) o.rotation.y = Math.PI - Math.PI * smooth(FREE + 2.2, FREE + 3.4, t); faceC.setExpr('happy', t); } }
function headC(t, mode) { updateHome(t, mode); meC.outer.updateMatrixWorld(true); return meC.torso.localToWorld(V3(0, 1.63, 0)); }   // pose first, then frame the face
function homeCamera(t, mode) { let pos, look;
  if (mode === 'kitchen') { const h = headC(t, mode), k = ease(clamp(t / BRAIN, 0, 1)), d = lerp(1.45, 1.38, k); pos = h.clone().add(V3(Math.sin(-0.5) * d + 0.25, -0.02, Math.cos(-0.5) * d)); look = h.clone().add(V3(0, -0.22, 0)); }
  else if (mode === 'yawn') { const h = headC(t, mode), k = smooth(QUIT - 0.5, PEAK + 0.5, t); pos = h.clone().add(V3(0.18, 0.04, lerp(-1.05, -0.8, k))); look = h.clone().add(V3(0, -0.14, 0)); }
  else if (mode === 'couch' || mode === 'fade') { const k = smooth(PEAK - 0.5, SLEEP + 0.5, t); pos = V3(lerp(-1.6, -1.9, k), 1.4, lerp(0.9, 0.6, k)); look = V3(-2.4, 1.15, -1.55); }
  else if (mode === 'bed') { const h = headC(t, mode), k = smooth(SLEEP - 0.5, TWIST + 0.5, t); pos = h.clone().add(V3(lerp(0.5, 0.4, k), lerp(1.35, 1.2, k), lerp(1.1, 0.95, k))); look = h.clone().add(V3(0, -0.12, 0.3)); }
  else { const k = smooth(FREE - 0.5, T_END, t); pos = V3(lerp(0.9, 0.15, k), lerp(1.55, 1.6, k), lerp(-0.3, -1.95, k)); look = V3(-0.3, lerp(1.4, 1.5, k), lerp(-3.6, -3.35, k)); }
  hmCam.position.copy(pos); hmCam.lookAt(look); hmCam.fov = 50; }
// =================== THE BRAIN (abstract): a glassy brain covered in receptor "cups". Blue adenosine (the "I'm tired" signal) drifts in;
// orange caffeine hexagons sit in the cups so the blue can't land. Then the brain adapts: more cups sprout, and it takes more caffeine to fill them ===================
const brC = new THREE.Scene(); brC.background = new THREE.Color('#081020'); const brCam = new THREE.PerspectiveCamera(38, W / H, 0.05, 60);
brC.add(new THREE.HemisphereLight(0xc8d8ff, 0x302040, 1.0)); { const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(2, 3, 4); brC.add(k); }
const brGeo = (() => { const geo = new THREE.SphereGeometry(1, 140, 100); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let { x, y, z } = v; x *= 0.95; y *= 0.8; z *= 1.18; const f = Math.sin(z * 8 + Math.sin(y * 7) * 2) * Math.sin(y * 9 + Math.sin(x * 5 + z * 3) * 1.6); const d = 1 + 0.045 * Math.pow(Math.abs(f), 0.6) - 0.09 * Math.exp(-(x * x) / 0.004) * Math.max(0, y + 0.3); p.setXYZ(i, x * d, y * d, z * d); }
  geo.computeVertexNormals(); return geo; })();
const brMesh = new THREE.Mesh(brGeo, new THREE.MeshStandardMaterial({ color: '#f29ab8', roughness: 0.45, transparent: true, opacity: 0.85 })); brC.add(brMesh);
// receptor cups on the surface: 70 at first, up to 130 after "adapting"
const RC_N = 130, RC0 = 70; const cupGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.05, 12, 1, true);
const cups = new THREE.InstancedMesh(cupGeo, new THREE.MeshStandardMaterial({ color: '#f4f0ff', emissive: '#30304a', side: THREE.DoubleSide }), RC_N); cups.frustumCulled = false; brC.add(cups);
const RC = []; for (let i = 0; i < RC_N; i++) { const v = V3(R(-1, 1), R(-0.4, 1), R(-1, 1)).normalize(); v.multiply(V3(0.95, 0.8, 1.18)).multiplyScalar(1.03); RC.push({ p: v, n: v.clone().normalize(), born: i < RC0 ? -1 : ADAPT + 0.8 + (i - RC0) * 0.05, fill: hash(i * 3.7) }); }
const cafM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 6), new THREE.MeshStandardMaterial({ color: '#e8862a', emissive: '#5a2a06', flatShading: true }), RC_N); cafM.frustumCulled = false; brC.add(cafM);
const AD_N = 90; const adM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 0.45, 1.5) }), AD_N); adM.frustumCulled = false; brC.add(adM);
const AD = Array.from({ length: AD_N }, () => ({ dir: V3(R(-1, 1), R(-0.5, 1), R(-1, 1)).normalize(), ph: R(0, 6.28), sp: R(0.4, 0.8) }));
const _bc = new THREE.Object3D(), _q3 = new THREE.Quaternion();
// share of cups filled by caffeine: full in "BRAIN"; after adapting the new cups are mostly empty, so blue lands on them -> "need more coffee"
function updateBrainC(t) { brMesh.rotation.y = 0.25 * Math.sin(t * 0.35); const rot = brMesh.rotation.y;
  RC.forEach((C, i) => { const alive = C.born < 0 ? 1 : smooth(C.born, C.born + 0.4, t); _q3.setFromUnitVectors(V3(0, 1, 0), C.n); _bc.position.copy(C.p).applyAxisAngle(V3(0, 1, 0), rot); _bc.quaternion.copy(_q3).premultiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rot)); _bc.scale.setScalar(Math.max(0.0001, alive)); _bc.updateMatrix(); cups.setMatrixAt(i, _bc.matrix);
    const caf = (C.born < 0 ? smooth(BRAIN + 0.4 + C.fill * 1.6, BRAIN + 0.9 + C.fill * 1.6, t) : smooth(ADAPT + 3.6 + C.fill * 1.8, ADAPT + 4.1 + C.fill * 1.8, t)) * alive;
    _bc.position.addScaledVector(C.n.clone().applyAxisAngle(V3(0, 1, 0), rot), 0.03 + 0.4 * (1 - caf)); _bc.scale.setScalar(Math.max(0.0001, caf > 0.01 ? 1 : 0)); _bc.updateMatrix(); cafM.setMatrixAt(i, _bc.matrix); });
  cups.instanceMatrix.needsUpdate = cafM.instanceMatrix.needsUpdate = true;
  AD.forEach((A, i) => { const r = 1.55 + 0.25 * Math.sin(t * A.sp * 3 + A.ph); _bc.position.copy(A.dir).multiplyScalar(r).applyAxisAngle(V3(0, 1, 0), t * 0.2 + A.ph); _bc.position.y += 0.05 * Math.sin(t * 2 + i); _bc.rotation.set(0, 0, 0); _bc.scale.setScalar(1); _bc.updateMatrix(); adM.setMatrixAt(i, _bc.matrix); }); adM.instanceMatrix.needsUpdate = true; }
function brainCamC(t) { const k = smooth(BRAIN, ADAPT, t), k2 = smooth(ADAPT, QUIT, t); const d = lerp(5.6, 3.2, k) + lerp(0, 2.2, k2), a = lerp(-0.5, 0.3, k) + 0.3 * k2; brCam.position.set(Math.sin(a) * d, lerp(1.0, 0.6, k), Math.cos(a) * d); brCam.lookAt(0, lerp(0.05, 0.2, k), 0); }
// =================== SPLIT (meters): two people side by side, each with an alertness meter and a dashed "normal" line.
// Left drinks coffee daily, right never does. TWIST: after the cup they read the same. BOOST: the left meter starts below normal in the morning, the cup only brings it back ===================
const split = new THREE.Scene(); split.background = new THREE.Color('#f0e4d4'); const spCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 100);
split.add(new THREE.HemisphereLight(0xfff4e8, 0x8a7a68, 1.1)); { const s = new THREE.DirectionalLight(0xffe8c8, 1.6); s.position.set(3, 5, 6); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); split.add(s); }
{ const fl = mesh(new THREE.PlaneGeometry(20, 20), M('#d8c8b0', { roughness: 0.9 }), false, true); fl.rotation.x = -Math.PI / 2; split.add(fl); bx(20, 4, 0.1, '#f4ece0', 0, 2, -2, split); bx(0.06, 4, 0.06, '#c8b8a0', 0, 2, -1.9, split); }
const drinker = makePerson(rnd, { top: '#8a8e98', bottom: '#2a3a5a', hair: '#3a2416', skin: '#d8a882', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.55 });
const never = makePerson(rnd, { top: '#5aa86a', bottom: '#3a3a40', hair: '#1a1a1a', skin: '#b98260', dress: false, cap: false }); split.add(drinker.outer, never.outer); const faceD = addFace(drinker, '#d8a882', '#3a2416'), faceN = addFace(never, '#b98260', '#1a1a1a');
const mugS = new THREE.Group(); { const m = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 14), M('#f4f4f2')); m.position.y = 0.055; mugS.add(m); } drinker.elbows[0].add(mugS); mugS.position.set(0, -0.3, 0.06);
// a game-style bar floating over each head; the white tick in the middle = "normal"
function meter(x) { const g = grp(x, 2.12, 0, 0, split); bx(0.5, 0.075, 0.03, '#2a2a30', 0, 0, 0, g); const fill = bx(1, 0.05, 0.04, '#5fd27a', 0, 0, 0.004, g); bx(0.012, 0.12, 0.05, '#ffffff', 0, 0, 0.008, g); return { g, fill }; }
const mL = meter(-0.5), mR = meter(0.5);
function setMeter(m, level, col) { const w = Math.max(0.005, level * 0.47); m.fill.scale.x = w; m.fill.position.x = -0.235 + w / 2; m.fill.material = M(col, { emissive: col, emissiveIntensity: 0.25 }); }   // level 0.5 = the white "normal" tick
function updateSplit(t) { for (const [P, x] of [[drinker, -0.5], [never, 0.5]]) { P.root.rotation.set(0, 0, 0); P.outer.position.set(x, 0.95, 0); P.outer.rotation.y = 0; poseIdle(P, t, x); }
  let left;
  if (t < BOOST) { const sip = smooth(TWIST + 0.6, TWIST + 1.6, t); drinker.arms[0].rotation.x = lerp(-0.6, -1.3, sip); drinker.elbows[0].rotation.x = lerp(-1.0, -1.9, sip); left = 0.5; }
  else { const sip = smooth(BOOST + 2.2, BOOST + 3.0, t); drinker.arms[0].rotation.x = lerp(-0.6, -1.3, sip); drinker.elbows[0].rotation.x = lerp(-1.0, -1.9, sip); left = lerp(lerp(0.5, 0.18, smooth(BOOST - 0.2, BOOST + 1.0, t)), 0.5, smooth(BOOST + 2.6, BOOST + 4.2, t));
    drinker.root.rotation.x = 0.15 * (1 - smooth(BOOST + 2.6, BOOST + 4.2, t)) * smooth(BOOST, BOOST + 1, t); }
  setMeter(mL, left, left < 0.45 ? '#e86a4a' : '#5fd27a'); setMeter(mR, 0.5, '#5fd27a'); faceD.setExpr(left < 0.4 ? 'tired' : 'neutral', t); faceN.setExpr('neutral', t + 1.3); }
function splitCam(t) { const k = smooth(TWIST - 0.5, BOOST - 0.5, t), b = smooth(BOOST - 0.6, BOOST + 1.4, t);   // both of them, then close on the morning drinker
  spCam.position.set(lerp(0, -0.3, b), lerp(1.62, 1.68, b), lerp(lerp(4.4, 4.0, k), 2.6, b)); spCam.lookAt(lerp(0, -0.42, b), lerp(1.45, 1.62, b), 0); }
// =================== schedule, DOM, render ===================
const SCN = { kitchen: [t => updateHome(t, 'kitchen'), t => homeCamera(t, 'kitchen'), home, () => hmCam], brain: [updateBrainC, brainCamC, brC, () => brCam],
  yawn: [t => updateHome(t, 'yawn'), t => homeCamera(t, 'yawn'), home, () => hmCam], couch: [t => updateHome(t, 'couch'), t => homeCamera(t, 'couch'), home, () => hmCam],
  fade: [t => updateHome(t, 'fade'), t => homeCamera(t, 'fade'), home, () => hmCam], bed: [t => updateHome(t, 'bed'), t => homeCamera(t, 'bed'), home, () => hmCam],
  split: [updateSplit, splitCam, split, () => spCam], curtains: [t => updateHome(t, 'curtains'), t => homeCamera(t, 'curtains'), home, () => hmCam] };
const SEQ = [[0, 'kitchen'], [BRAIN, 'brain'], [QUIT, 'yawn'], [PEAK, 'couch'], [FADE, 'fade'], [SLEEP, 'bed'], [TWIST, 'split'], [FREE, 'curtains']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[1](t); S[0](t);   // camera first: the headache rings face it
  const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you quit<br><span class="hl">caffeine</span> today?'; el.endT.innerHTML = 'What if you quit <span class="hl">caffeine</span> today?';
el.endS.innerHTML = 'JULIANO & GRIFFITHS 2004: WITHDRAWAL STARTS AT 12–24 H, PEAKS AT 20–51 H, LASTS 2–9 DAYS; HEADACHE IN ~50%.<br>ROGERS ET AL. 2010 (379 PEOPLE): DAILY DRINKERS GET NO NET ALERTNESS BOOST.<br>DRAKE ET AL. 2013: 400 MG 6 H BEFORE BED CUT SLEEP BY OVER 1 HOUR.';
const captions = [
  [4.4, 7.6, 'Caffeine doesn’t give you energy.'],
  [7.7, 10.8, 'It blocks the signal that<br>says you’re tired.'],
  [11.4, 14.0, 'Drink it every day and<br>your brain adapts —'],
  [14.1, 16.8, 'you need it just<br>to feel normal.'],
  [17.4, 20.4, 'Hour 12–24:<br>withdrawal kicks in.'],
  [20.5, 23.8, '1 in 2 people<br>get a headache.'],
  [24.4, 27.4, 'Hours 20–51: the peak.'],
  [27.5, 30.8, 'Foggy, grumpy,<br>can’t focus.'],
  [31.4, 34.0, 'Day 2–9: it fades.'],
  [34.1, 36.8, 'Caffeine withdrawal is an<br>official medical diagnosis.'],
  [37.4, 39.8, 'Week 2: deeper sleep.'],
  [39.9, 42.8, 'A strong dose even 6 hours<br>before bed can steal<br>an hour of sleep.'],
  [43.4, 46.4, 'The twist: daily coffee drinkers<br>after their morning cup…'],
  [46.5, 49.8, '…are no more alert than<br>people who never drink it.'],
  [50.4, 55.8, 'That “boost” is mostly<br>just ending the withdrawal.'],
  [56.4, 58.6, 'Quit, and after ~9 days you’re<br>back to that same level —'],
  [58.7, 60.8, 'no cup needed.'],
];
const RED = '<b></b>', GREEN = '<b style="background:#5fd27a"></b>', BLUE = '<b style="background:#5ad8ff"></b>';
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < BRAIN) return [RED + '7:30 AM', 'LAST CUP', 'now', '~95 MG OF CAFFEINE'];
  if (t < ADAPT) return [BLUE + 'YOUR BRAIN', '“TIRED” SIGNAL', 'blocked', 'CAFFEINE SITS IN THE RECEPTORS'];
  if (t < QUIT) return [RED + 'EVERY DAY', 'DEPENDENCE', 'building', 'YOU NEED IT TO FEEL NORMAL'];
  if (t < PEAK) return [RED + 'NO COFFEE · HOUR 12–24', 'HEADACHE', '1 in 2', 'IN STUDIES'];
  if (t < FADE) return [RED + 'HOUR 20–51', 'WITHDRAWAL', 'peak', 'FOG · GRUMPY · NO FOCUS'];
  if (t < SLEEP) return [GREEN + 'DAY 2–9', 'WITHDRAWAL', 'fading', 'A DSM-5 DIAGNOSIS'];
  if (t < TWIST) return [GREEN + 'WEEK 2', 'SLEEP', 'deeper', '400 MG 6 H BEFORE BED: −1 H'];
  if (t < BOOST) return [BLUE + 'BRISTOL STUDY · 379 PEOPLE', 'ALERTNESS', 'equal', 'DAILY DRINKER vs. NEVER'];
  if (t < FREE) return [RED + 'DAILY DRINKER · 7 AM', 'BEFORE THE CUP', 'below normal', 'THE CUP ONLY BRINGS IT BACK'];
  return [GREEN + '~9 DAYS LATER', 'MORNING', 'normal', 'NO CUP NEEDED']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(0.9, 1.4, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  if (!B || mix < 1) shootScene(A, t, RTA); if (B) shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = (0.22 + 0.1 * Math.sin(t * 6)) * fadeWin(t, PEAK, FADE + 0.6, 0.6);   // the throbbing peak
  compMat.uniforms.uT.value = t; composite(B ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
