import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you only slept 5 hours a night?" — classic low-poly. Apartment (night / groggy morning / fridge raid / rested morning), brain wash, road, office.
// Facts: AAA Foundation 2016 (4-5 h sleep -> crash rate x4.3, ~legal-limit BAC); Yoo et al. 2007 (amygdala ~60% more reactive); Al Khatib 2016 KCL meta-analysis
// (+385 kcal/day); Prather et al. 2015 Sleep (<6 h -> 4.2x colds); Van Dongen et al. 2003 (2 weeks of 4-6 h ~ 1-2 nights of no sleep, people barely notice);
// glymphatic clearance during sleep; CDC ~1 in 3 US adults sleep < 7 h. Sleep debt 60-90 h/month; ~3 lb/month = MODEL (tools/sleep_math.py).
// =================== timeline ===================
const BRAIN = 4.0, MORN = 10.0, DRIVE = 17.0, OFFICE = 25.0, SNACK = 32.0, COLD = 39.0, FOG = 46.0, FIX = 54.0, T_END = 60.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 505;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed;
    void main(){ vec2 uv = vUv;
      // "censored" mosaic over the vape / cigarette: 30 px blocks inside the tracked screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB); c=mix(a,b,uMix); }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      gl_FragColor=vec4(srgb(c),1.0); }` });
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
// =================== APARTMENT (meters): bedroom on the left, kitchen corner on the right ===================
const home = new THREE.Scene(); const hCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hemiH = new THREE.HemisphereLight(0xe0e8ff, 0x403a48, 0.5); home.add(hemiH);
const moonH = new THREE.DirectionalLight(0x8aa0e0, 1.6); moonH.position.set(-1.6, 3.5, -6); moonH.castShadow = true; moonH.shadow.mapSize.set(1024, 1024); Object.assign(moonH.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); home.add(moonH, moonH.target);
const sunH = new THREE.DirectionalLight(0xffe0b0, 0); sunH.position.set(-1.0, 3.0, -6); sunH.castShadow = true; sunH.shadow.mapSize.set(1024, 1024); Object.assign(sunH.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); home.add(sunH, sunH.target);
const fillH = new THREE.PointLight(0xffd8b8, 3, 8, 1.6); fillH.position.set(1.0, 2.0, 2.2); home.add(fillH);
const clockL = new THREE.PointLight(0x7affb0, 0.3, 1.1, 1.5); clockL.position.set(-0.35, 0.75, -2.0); home.add(clockL);
const fridgeLH = new THREE.PointLight(0xdfefff, 0, 4, 1.4); fridgeLH.position.set(2.5, 1.2, -1.2); home.add(fridgeLH);
{ const tile = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8b49a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = pick(['#c2ae94', '#cdb9a0', '#bfa98e']); g.fillRect(x + 2, y + 2, 60, 60); } }, [4, 4]);
  const fl = mesh(new THREE.PlaneGeometry(7, 6), M('#ffffff', { map: tile, roughness: 0.8 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0.3, 0, -0.5); home.add(fl);
  bx(7, 3, 0.1, '#5a8a8e', 0.3, 1.5, -2.6, home); bx(0.1, 3, 6, '#4f7e82', -3.1, 1.5, -0.5, home); bx(0.1, 3, 6, '#e8dccb', 3.4, 1.5, -0.5, home); bx(7, 0.1, 6, '#f0ece4', 0.3, 3.0, -0.5, home);
  bx(3.4, 3, 0.09, '#f0e6d4', 2.0, 1.5, -2.55, home); }   // kitchen wall
const winH = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.16, 0.35) })); winH.position.set(-1.7, 1.9, -2.54); home.add(winH);
const BLINDS = []; for (let k = 0; k < 10; k++) { const b = bx(1.7, 0.1, 0.02, '#e8e4dc', -1.7, 2.45 - k * 0.12, -2.5, home); b.rotation.x = 0.6; BLINDS.push(b); }
// bed with a duvet, pillows; nightstand + digital alarm clock (canvas), lamp; a plant
bx(1.7, 0.32, 2.2, '#6a4a34', -1.7, 0.16, -1.45, home); bx(1.62, 0.22, 2.1, '#f2f0ec', -1.7, 0.43, -1.45, home); bx(1.75, 0.9, 0.1, '#6a4a34', -1.7, 0.7, -2.55, home);
for (const sx of [-0.4, 0.4]) bx(0.65, 0.16, 0.38, '#ffffff', -1.7 + sx, 0.62, -2.2, home);
const duvet = bx(1.7, 0.12, 1.45, '#f2b84a', -1.7, 0.6, -1.0, home);
bx(0.5, 0.55, 0.45, '#8a6a4e', -0.45, 0.275, -2.25, home); bx(0.36, 0.14, 0.12, '#1a1a1e', -0.42, 0.62, -2.15, home);
const ckCv = document.createElement('canvas'); ckCv.width = 256; ckCv.height = 96; const ckTex = new THREE.CanvasTexture(ckCv); ckTex.colorSpace = THREE.SRGBColorSpace;
const ckFace = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.12), new THREE.MeshBasicMaterial({ map: ckTex, color: new THREE.Color(1.8, 1.8, 1.8) })); ckFace.position.set(-0.42, 0.62, -2.088); home.add(ckFace);
function drawAlarm(txt, col = '#3aff8a') { const g = ckCv.getContext('2d'); g.fillStyle = '#060806'; g.fillRect(0, 0, 256, 96); g.fillStyle = col; g.textAlign = 'center'; const al = txt.startsWith('ALARM'); if (al) { g.font = 'bold 22px Inter, sans-serif'; g.fillText('ALARM', 128, 24); txt = txt.slice(6); } g.font = `bold ${al ? 60 : 74}px "JetBrains Mono", monospace`; g.fillText(txt, 128, al ? 86 : 74); ckTex.needsUpdate = true; }
{ const pot = mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 10), M('#c86a4a')); pot.position.set(-2.8, 0.15, -0.3); home.add(pot); for (let k = 0; k < 7; k++) { const lf = mesh(new THREE.ConeGeometry(0.06, 0.6, 4), M('#4a9a5a')); lf.position.set(-2.8 + Math.cos(k) * 0.08, 0.55, -0.3 + Math.sin(k) * 0.08); lf.rotation.set(Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5); home.add(lf); } }
// kitchen: counter, fridge (door swings), mugs that pile up, snacks
bx(2.2, 0.9, 0.62, '#f4f0e8', 1.7, 0.45, -2.2, home); bx(2.2, 0.05, 0.64, '#3a3e46', 1.7, 0.92, -2.2, home);
const fridgeH = new THREE.Group(); fridgeH.position.set(3.05, 0, -1.6); fridgeH.rotation.y = -Math.PI / 2; home.add(fridgeH); bx(0.75, 1.9, 0.68, '#dfe4ea', 0, 0.95, 0, fridgeH, { roughness: 0.3 });
const fDoorH = new THREE.Group(); fDoorH.position.set(-0.375, 0, 0.35); fridgeH.add(fDoorH); bx(0.75, 1.9, 0.05, '#e8ecf2', 0.375, 0.95, 0, fDoorH, { roughness: 0.3 }); bx(0.03, 0.5, 0.04, '#8a9098', 0.66, 1.1, 0.04, fDoorH);
const MUGS = []; for (let k = 0; k < 3; k++) { const g = new THREE.Group(); const m = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 12), M(['#e8584a', '#3a7ac8', '#f2c84a'][k])); m.position.y = 0.055; g.add(m); const hd = mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 12), M(['#e8584a', '#3a7ac8', '#f2c84a'][k])); hd.position.set(0.065, 0.06, 0); g.add(hd); g.position.set(1.1 + k * 0.2, 0.945, -2.05); home.add(g); MUGS.push(g); }
const SNK = []; for (let i = 0; i < 22; i++) { const g = new THREE.Group(); const c = pick(['#e2b33a', '#d8442e', '#3a7ac8', '#f08a2a', '#6ab04a', '#c24a8a']); if (rnd() < 0.5) bx(R(0.14, 0.22), R(0.18, 0.26), 0.05, c, 0, 0, 0, g); else { const m = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 10), M(c)); g.add(m); }
  g.position.set(1.5 + R(-0.6, 0.6), 1.02 + Math.floor(i / 8) * 0.07, -2.15 + R(-0.18, 0.18)); g.rotation.set(R(-0.4, 0.4), R(0, 6), R(-1, 1)); home.add(g); SNK.push({ g, at: SNACK + 0.8 + i * 0.22 }); }
const me = makePerson(rnd, { top: '#f2c84a', bottom: '#3a4a6a', hair: '#2a1d16', skin: '#d8a07a', dress: false, shorts: false, longSleeve: false, cap: false, hairStyle: 0.3 }); home.add(me.outer);
const steamH = makeSmoke(home, 200); const _hv = new THREE.Vector3();
function lightHome(t) { const day = (t >= MORN && t < SNACK - 0.5) || t >= FIX; const bright = t >= FIX ? 1.3 : 0.9;
  hemiH.intensity = day ? 0.9 * bright : 0.42; moonH.intensity = day ? 0 : 2.2; sunH.intensity = day ? 3.0 * bright : 0; fillH.intensity = t >= FIX ? 6 : day ? 3 : 1.4;
  winH.material.color.set(day ? new THREE.Color(1.6 * bright, 1.4 * bright, 1.0 * bright) : new THREE.Color(0.12, 0.16, 0.35)); BLINDS.forEach(b => b.rotation.x = day ? 1.2 : 0.6); clockL.intensity = day ? 0.1 : 0.3;
  const open = fadeWin(t, SNACK + 0.3, COLD - 0.2, 0.5); fDoorH.rotation.y = -1.9 * open; fridgeLH.intensity = 3 * open; }
function updateHome(t) { lightHome(t); const o = me.outer, P = me; o.rotation.set(0, 0, 0); o.rotation.order = 'XYZ'; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0);
  if (t < MORN) { drawAlarm(t < 2.5 ? '1:00' : 'ALARM 6:00', t < 2.5 ? '#3aff8a' : '#ffb03a'); o.position.set(-1.7, 0.78, -1.35); o.rotation.set(-Math.PI / 2, 0, 0); duvet.position.y = 0.66; }
  else if (t < SNACK - 0.5) { const ring = t < MORN + 2.2; drawAlarm(ring ? (Math.floor(t * 3) % 2 ? '6:00' : '    ') : '6:0' + Math.min(9, Math.floor((t - MORN) * 1.2)), '#ff4a3a');
    if (t < MORN + 3.2) { o.position.set(-1.0, 0.62, -1.35); o.rotation.y = 1.4; poseSit(P); P.root.rotation.x = 0.35; P.arms[0].rotation.x = -2.2 * smooth(MORN + 0.6, MORN + 1.2, t); P.elbows[0].rotation.x = -2.0; }   // sits up, hand on the face
    else { o.position.set(0.75, 0.95, -1.62); o.rotation.y = 0.5; P.arms[1].rotation.x = -1.0 - 0.5 * (0.5 + 0.5 * Math.sin(t * 2)); P.elbows[1].rotation.x = -1.4; P.root.rotation.x = 0.18; } }   // slumped against the counter, coffee in hand
  else if (t < FIX) { drawAlarm('2:40'); o.position.set(1.95, 0.95, -1.35); o.rotation.y = Math.PI / 2; P.arms[1].rotation.x = -1.1 + 0.25 * Math.sin(t * 4); P.elbows[1].rotation.x = -2.0; }
  else { drawAlarm('8:00', '#3aff8a'); o.position.set(-0.5, 0.95, -0.4); o.rotation.y = 0.6; const up = smooth(FIX + 0.6, FIX + 1.6, t); P.arms[0].rotation.set(-3.0 * up, 0, 0.3 * up); P.arms[1].rotation.set(-3.0 * up, 0, -0.3 * up); }
  MUGS.forEach((m, k) => m.visible = t > MORN + 3.4 + k * 0.9 && t < SNACK - 0.5); SNK.forEach(S => S.g.visible = t > S.at && t < FIX);
  steamH.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); if (t > MORN + 3.4 && t < SNACK - 0.5) for (let k = 0; k < 30; k++) { const age = (t * 0.5 + k / 30) % 1; const mk = MUGS[k % 3]; if (!mk.visible) continue; _hv.copy(mk.position).add(V3(Math.sin(k * 2.1 + age * 5) * 0.03, 0.12 + age * 0.4, 0)); steamH.add(_hv, 0.02 + age * 0.06, 0.3 * (1 - age)); } steamH.end(); }
function homeCamera(t) { let pos, look, fov = 50;
  if (t < MORN) { const k = smooth(0, 3.6, t); pos = V3(0.6, 2.1, 1.2).lerp(V3(0.15, 1.12, -0.8), k); look = V3(-1.4, 0.6, -1.7).lerp(V3(-0.42, 0.66, -2.1), k); fov = lerp(52, 44, k); }
  else if (t < SNACK - 0.5) { const k = ease(clamp((t - MORN - 2.8) / 1.4, 0, 1)); pos = V3(0.4, 1.5, 0.9).lerp(V3(2.2, 1.5, 0.5), k); look = V3(-1.1, 0.9, -1.4).lerp(V3(1.05, 1.15, -1.9), k); }
  else if (t < FIX) { pos = V3(2.6, 1.55, 0.4).lerp(V3(2.5, 1.45, 0.0), smooth(SNACK, COLD, t)); look = V3(1.9, 1.15, -1.55); }
  else { pos = V3(1.2, 1.6, 1.6).lerp(V3(0.9, 1.5, 1.2), smooth(FIX, T_END, t)); look = V3(-0.6, 1.2, -1.0); }
  hCam.position.copy(pos); hCam.lookAt(look); hCam.fov = fov; }
// =================== BRAIN (abstract): a glassy pink brain; blue fluid washes waste particles out — the alarm stops it at ~62% ===================
const brs = new THREE.Scene(); brs.background = new THREE.Color('#0b1024'); const bCam = new THREE.PerspectiveCamera(36, W / H, 0.05, 50);
brs.add(new THREE.HemisphereLight(0xc8d8ff, 0x302040, 0.9)); { const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(2, 3, 4); brs.add(k); }
const brainGeo = (() => { const geo = new THREE.SphereGeometry(1, 150, 110); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let { x, y, z } = v; x *= 0.95; y *= 0.82; z *= 1.15;
    const folds = Math.sin(z * 9 + Math.sin(y * 7) * 1.8 + Math.sin(x * 5)) * Math.sin(y * 8 + Math.sin(x * 6 + z * 3) * 1.6) + 0.5 * Math.sin((z + x) * 13 + y * 4);
    const fis = Math.exp(-(x * x) / 0.004) * Math.max(0, y + 0.3); const d = 1 + 0.05 * Math.pow(Math.abs(folds), 0.6) - 0.1 * fis; p.setXYZ(i, x * d, y * d, z * d); }
  geo.computeVertexNormals(); return geo; })();
const brainM = new THREE.Mesh(brainGeo, new THREE.MeshPhysicalMaterial({ color: '#ff8fb8', roughness: 0.35, transmission: 0.0, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide })); brs.add(brainM);
const CH = [[[-0.5, 0.4, 0.6], [-0.2, 0.0, 0.2], [0, -0.45, 0], [0, -1.3, -0.2]], [[0.55, 0.35, 0.5], [0.25, 0, 0.15], [0, -0.45, 0], [0, -1.3, -0.2]], [[-0.45, 0.3, -0.6], [-0.2, -0.05, -0.25], [0, -0.45, 0]], [[0.5, 0.3, -0.6], [0.2, -0.05, -0.25], [0, -0.45, 0]]].map(a => new THREE.CatmullRomCurve3(a.map(q => V3(...q))));
const flowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.0, 2.2), transparent: true, opacity: 0.5 }); for (const c of CH) brs.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.035, 6, false), flowM));
const WASTE_N = 420; const waste = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: '#d8b84a', emissive: '#4a3a10', flatShading: true }), WASTE_N); waste.frustumCulled = false; brs.add(waste);
const WASTE = Array.from({ length: WASTE_N }, (_, i) => ({ p: V3(R(-0.8, 0.8), R(-0.5, 0.6), R(-0.95, 0.95)).multiply(V3(0.9, 0.8, 1)), c: i % CH.length, t0: R(0.2, 1.0), frac: rnd() }));
const _bo = new THREE.Object3D(), _bv = new THREE.Vector3();
const cleanAt = t => 0.62 * smooth(BRAIN + 0.3, BRAIN + 3.6, t);   // the job stops at 62% when the alarm rings
function updateBrainS(t) { brainM.rotation.y = 0.3 * Math.sin(t * 0.4); const cl = cleanAt(t);
  WASTE.forEach((Wt, i) => { const leaving = Wt.frac < cl; let pos; if (leaving) { const u = clamp((cl - Wt.frac) / 0.25, 0, 1); pos = Wt.p.clone().lerp(CH[Wt.c].getPointAt(Math.min(1, u)), Math.min(1, u * 2)); } else pos = Wt.p.clone().add(V3(Math.sin(t * 2 + i) * 0.01, Math.cos(t * 1.7 + i) * 0.01, 0));
    pos.applyAxisAngle(V3(0, 1, 0), brainM.rotation.y); _bo.position.copy(pos); _bo.rotation.set(t + i, t * 0.7, 0); _bo.scale.setScalar(leaving && pos.y < -1.1 ? 0.0001 : 1); _bo.updateMatrix(); waste.setMatrixAt(i, _bo.matrix); }); waste.instanceMatrix.needsUpdate = true;
  flowM.opacity = 0.55 * (1 - smooth(BRAIN + 3.7, BRAIN + 4.2, t)) + 0.1; }
function brainCamera(t) { const a = lerp(-0.5, 0.4, smooth(BRAIN, MORN, t)); bCam.position.set(Math.sin(a) * 3.6, 0.6, Math.cos(a) * 3.6); bCam.lookAt(0, -0.15, 0); }
// =================== ROAD (meters): morning commute; your car weaves over the line ===================
const road = new THREE.Scene(); road.background = new THREE.Color('#a8c8e8'); road.fog = new THREE.Fog(0xc8d8e8, 60, 260); const rdCam = new THREE.PerspectiveCamera(55, W / H, 0.1, 600);
road.add(new THREE.HemisphereLight(0xdfeaff, 0x6a7a50, 1.0)); { const s = new THREE.DirectionalLight(0xffe8c8, 2.6); s.position.set(-40, 50, -60); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 200 }); road.add(s, s.target); }
{ const gr = mesh(new THREE.PlaneGeometry(600, 600), M('#7aa85a', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; gr.position.y = -0.02; road.add(gr);
  const asph = mesh(new THREE.PlaneGeometry(9, 600), M('#4a4a50', { roughness: 0.9 }), false, true); asph.rotation.x = -Math.PI / 2; asph.position.set(0, 0, -250); road.add(asph);
  for (let z = 10; z > -500; z -= 6) { const d = mesh(new THREE.PlaneGeometry(0.16, 3), M('#f2d04a'), false, true); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.01, z); road.add(d); }
  for (const sx of [-4.3, 4.3]) { const e = mesh(new THREE.PlaneGeometry(0.14, 600), M('#f4f4f4'), false, true); e.rotation.x = -Math.PI / 2; e.position.set(sx, 0.01, -250); road.add(e); }
  for (let i = 0; i < 90; i++) { const sx = pick([-1, 1]), x = sx * R(7, 40), z = R(-480, 20); if (rnd() < 0.6) { const t = mesh(new THREE.ConeGeometry(R(1.2, 2.2), R(4, 7), 7), M(pick(['#3a7a3a', '#4a8a3e', '#2f6a34']))); t.position.set(x, 2.5, z); road.add(t); const tr = mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6), M('#6a4a30')); tr.position.set(x, 0.6, z); road.add(tr); }
    else { const h = grp(sx * R(12, 30), 0, R(-480, 0), R(0, 6), road); bx(6, 3.2, 5, pick(['#f2e6cc', '#e8c8a8', '#cfe0f0', '#f4d4d4']), 0, 1.6, 0, h); const rf = mesh(new THREE.ConeGeometry(4.6, 2, 4), M(pick(['#a8483a', '#5a5a64', '#6a4a3a']))); rf.position.y = 4.2; rf.rotation.y = Math.PI / 4; h.add(rf); } } }
function car(color) { const g = new THREE.Group(); bx(1.9, 0.75, 4.3, color, 0, 0.6, 0, g); bx(1.7, 0.6, 2.2, '#2a3240', 0, 1.25, 0.2, g, { roughness: 0.2, metalness: 0.4 });
  for (const wx of [-0.95, 0.95]) for (const wz of [-1.4, 1.4]) { const w = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12), M('#1a1a1a')); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.35, wz); g.add(w); }
  for (const sx of [-0.6, 0.6]) bx(0.3, 0.12, 0.05, '#ff3a2a', sx, 0.75, 2.16, g, { emissive: '#ff2a1a' }); road.add(g); return g; }
const myCar = car('#3a7ac8'), oncoming = car('#e8584a');
const carX = t => 2.2 + 1.6 * Math.sin((t - DRIVE) * 1.3) * smooth(DRIVE + 0.8, DRIVE + 2.5, t) - 1.9 * fadeWin(t, DRIVE + 3.4, DRIVE + 4.8, 0.5);
function updateRoad(t) { const z = -(t - DRIVE) * 14; myCar.position.set(carX(t), 0, z); myCar.rotation.y = -0.12 * Math.cos((t - DRIVE) * 1.3) * smooth(DRIVE + 0.8, DRIVE + 2.5, t);
  oncoming.position.set(-2.2, 0, z - 163 + (t - DRIVE) * 24); oncoming.rotation.y = Math.PI; }
function roadCamera(t) { const z = -(t - DRIVE) * 14; rdCam.position.set(carX(t) * 0.6 + 1.0, 3.0, z + 8.5); rdCam.lookAt(carX(t) * 0.8, 1.9, z - 14); rdCam.rotateZ(0.02 * Math.sin(t * 3)); }
// =================== OFFICE (meters): open-plan; a coworker, the outburst, the sneeze, the fog ===================
const office = new THREE.Scene(); office.background = new THREE.Color('#e8eef4'); const oCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 100);
office.add(new THREE.HemisphereLight(0xffffff, 0x8a8a90, 1.0)); { const s = new THREE.DirectionalLight(0xfff4e8, 1.8); s.position.set(3, 6, 4); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); office.add(s); }
{ const fl = mesh(new THREE.PlaneGeometry(20, 20), M('#9aa4b0', { roughness: 0.9 }), false, true); fl.rotation.x = -Math.PI / 2; office.add(fl); bx(20, 3.2, 0.1, '#f4f4f2', 0, 1.6, -4, office);
  for (let k = 0; k < 4; k++) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.7, 1.9) })); wn.position.set(-4.5 + k * 3, 1.8, -3.94); office.add(wn); } }
const scrTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#1e2a3a'; g.fillRect(0, 0, w, h); for (let y = 16; y < h; y += 18) { g.fillStyle = pick(['#5ac8ff', '#f2c84a', '#8a9ab0', '#5aff9a']); g.fillRect(14, y, R(60, 200), 8); } });
function desk(x, z, ry) { const g = grp(x, 0, z, ry, office); bx(1.6, 0.06, 0.8, '#d8c8a8', 0, 0.75, 0, g); for (const [dx, dz] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) bx(0.05, 0.75, 0.05, '#5a5e66', dx, 0.375, dz, g);
  bx(0.7, 0.42, 0.04, '#1a1a1e', 0, 1.05, -0.25, g); const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.36), new THREE.MeshBasicMaterial({ map: scrTex, color: new THREE.Color(1.4, 1.4, 1.4) })); sc.position.set(0, 1.05, -0.228); g.add(sc);
  bx(0.5, 0.06, 0.5, '#3a3e46', 0, 0.5, 0.65, g); bx(0.5, 0.55, 0.06, '#3a3e46', 0, 0.8, 0.9, g); return g; }
for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if (!(i === 1 && j === 0)) desk(-3 + i * 2, -2.2 + j * 2.2, 0);
desk(-1, -2.2, 0);   // your desk
const meO = makePerson(rnd, { top: '#f2c84a', bottom: '#3a4a6a', hair: '#2a1d16', skin: '#d8a07a', dress: false, shorts: false, longSleeve: false, cap: false, hairStyle: 0.3 }); office.add(meO.outer);
const coworker = makePerson(rnd, { top: '#6a4ad0', bottom: '#2a2e38', dress: false, cap: false }); office.add(coworker.outer);
const others = []; for (let k = 0; k < 5; k++) { const p = makePerson(rnd); office.add(p.outer); others.push(p); }
const VIR_N = 90; const virus = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ color: '#6ad84a', emissive: '#1a5a10', flatShading: true }), VIR_N); virus.frustumCulled = false; office.add(virus);
const VIR = Array.from({ length: VIR_N }, () => ({ d: V3(R(-0.6, 0.6), R(-0.25, 0.4), R(0.6, 1.4)).normalize(), sp: R(0.6, 1.6) }));
const fogO = makeSmoke(office, 500); const _ov = new THREE.Vector3(); const _oo = new THREE.Object3D();
const papers = []; for (let k = 0; k < 14; k++) { const p = mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshStandardMaterial({ color: '#f8f8f4', side: THREE.DoubleSide }), true, false); office.add(p); papers.push({ p, a: R(0, 6), r: R(0.3, 1.0), y0: R(0.9, 2.0) }); }
function updateOffice(t) { const P = meO, o = P.outer; o.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0);
  // you at your desk (seat at z -1.55 facing -z)
  const angry = fadeWin(t, OFFICE + 2.2, OFFICE + 5.6, 0.25);
  o.position.set(-1, 0.55, -1.5); o.rotation.y = Math.PI; poseSit(P); if (angry > 0) { o.position.y = lerp(0.55, 0.95, angry); poseIdle(P, t, 0); P.arms[1].rotation.x = -1.8 * angry; P.arms[0].rotation.x = -1.6 * angry; P.root.rotation.x = -0.15 * angry; }
  if (t >= COLD && t < FOG) { const sn = fadeWin(t, COLD + 1.0, COLD + 2.2, 0.15); P.root.rotation.x = 0.45 * sn; P.arms[0].rotation.x = -2.4 * smooth(COLD + 0.4, COLD + 0.9, t); P.elbows[0].rotation.x = -2.0; }
  if (t >= FOG) { P.arms[1].rotation.set(-2.6, 0, -0.2); P.elbows[1].rotation.x = -0.4; }
  coworker.outer.position.set(-0.3, 0.95, -0.9); coworker.outer.rotation.y = -2.28; poseIdle(coworker, t, 1); coworker.outer.visible = t < SNACK; coworker.arms[1].rotation.x = -0.9 - 0.3 * Math.sin(t * 5) * (t < OFFICE + 2.5 ? 1 : 0);
  others.forEach((p, k) => { p.outer.position.set(-3 + (k % 4) * 2 + (k > 3 ? 1 : 0), 0.55, -1.5 + Math.floor(k / 4) * 2.2 + (k > 3 ? 0 : 2.2)); p.outer.rotation.y = Math.PI; poseSit(p); });
  // sneeze burst
  for (let i = 0; i < VIR_N; i++) { const V = VIR[i]; const age = t - (COLD + 1.25); if (age > 0 && age < 3.5 && t < FOG) { const hp = P.elbows[0].localToWorld(_ov.set(0, -0.2, 0)); _oo.position.set(-1, 1.45, -1.75).addScaledVector(V.d.clone().multiply(V3(1, 1, -1)), age * V.sp * (1 - age * 0.12)); _oo.position.y -= 0.05 * age * age; _oo.scale.setScalar(1); } else _oo.scale.setScalar(0.0001); _oo.rotation.set(t * 2 + i, t, 0); _oo.updateMatrix(); virus.setMatrixAt(i, _oo.matrix); } virus.instanceMatrix.needsUpdate = true;
  // brain fog: grey haze rolls in, papers float
  fogO.begin(); smokeMat.uniforms.uTint.value.set('#b8bcc4'); const fz = smooth(FOG, FOG + 2.5, t) * (1 - smooth(FIX - 1.2, FIX - 0.3, t)); if (fz > 0) for (let k = 0; k < 160; k++) { const a = k * 2.4 + t * 0.15; _ov.set(-1 + Math.cos(a) * (0.6 + (k % 7) * 0.35), 0.4 + (k % 9) * 0.25 + 0.1 * Math.sin(t + k), -1.5 + Math.sin(a) * (0.6 + (k % 7) * 0.35)); fogO.add(_ov, 0.9 + (k % 5) * 0.3, 0.32 * fz); } fogO.end();
  papers.forEach((Pp, k) => { Pp.p.visible = fz > 0.05; const a = Pp.a + t * 0.8; Pp.p.position.set(-1 + Math.cos(a) * Pp.r, Pp.y0 + 0.15 * Math.sin(t * 1.5 + k), -1.6 + Math.sin(a) * Pp.r); Pp.p.rotation.set(t + k, t * 0.7, k); }); }
function officeCamera(t) { let pos, look, fov = 50;
  if (t < SNACK) { const k = smooth(OFFICE, SNACK, t); pos = V3(0.3, 1.75, -3.7).lerp(V3(0.1, 1.68, -3.4), k); look = V3(-0.65, 1.25, -1.2); pos.add(V3(Math.sin(t * 31) * 0.02, Math.sin(t * 27) * 0.02, 0).multiplyScalar(fadeWin(t, OFFICE + 2.2, OFFICE + 3.4, 0.2))); }
  else if (t < FOG) { pos = V3(-0.35, 1.47, -3.05).lerp(V3(-0.5, 1.45, -2.85), smooth(COLD, FOG, t)); look = V3(-1.0, 1.3, -1.55); fov = 46; }
  else { const k = smooth(FOG, FIX, t); pos = V3(0.9, 1.9, -3.5).lerp(V3(0.2, 1.6, -2.95), k); look = V3(-1, 1.2, -1.5); }
  oCam.position.copy(pos); oCam.lookAt(look); oCam.fov = fov; }
// =================== scene schedule + dissolves ===================
const SCN = { home: [updateHome, homeCamera, home, () => hCam, 1.0], brain: [updateBrainS, brainCamera, brs, () => bCam, 1.2],
  road: [updateRoad, roadCamera, road, () => rdCam, 1.0], office: [updateOffice, officeCamera, office, () => oCam, 1.0] };
const SEQ = [[0, 'home'], [BRAIN, 'brain'], [MORN, 'home'], [DRIVE, 'road'], [OFFICE, 'office'], [SNACK, 'home'], [COLD, 'office'], [FIX, 'home']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you only slept<br><span class="hl">5 hours</span> a night?'; el.endT.innerHTML = 'What if you only slept <span class="hl">5 hours</span> a night?';
el.endS.innerHTML = 'AAA FOUNDATION 2016: 4–5 HOURS OF SLEEP → ~4.3× THE CRASH RATE.<br>PRATHER ET AL., SLEEP 2015: UNDER 6 HOURS → 4.2× MORE COLDS.<br>VAN DONGEN ET AL. 2003: 2 WEEKS OF SHORT SLEEP ≈ 1–2 NIGHTS WITH NONE.';
const captions = [
  [4.4, 7.0, 'While you sleep,<br>your brain washes itself.'],
  [7.1, 9.8, '5 hours = the job<br>isn’t done.'],
  [10.4, 16.6, 'Day 1: you feel… kind of fine.'],
  [17.4, 20.9, 'Sleep 4–5 hours →<br>crash risk ×4.3.'],
  [21.1, 24.7, 'Close to driving at<br>the legal alcohol limit.'],
  [25.4, 28.6, 'Your brain’s alarm center gets<br>~60% more reactive.'],
  [28.8, 31.7, 'Small things feel huge.'],
  [32.4, 35.6, 'You eat ~385 extra<br>calories a day.'],
  [35.8, 38.7, 'That’s ~3 lb a month.'],
  [39.4, 45.7, 'Under 6 hours: 4.2× more<br>likely to catch a cold.'],
  [46.4, 50.6, '2 weeks of short sleep =<br>your brain after 1–2 nights<br>of NO sleep…'],
  [50.8, 53.7, '…and you barely notice.'],
  [54.4, 57.2, 'A month on 5 hours:<br>60–90 hours of sleep debt.'],
  [57.4, 59.8, '1 in 3 Americans already<br>sleep less than 7.'],
];
// sleep debt vs. 7–8 h: 2–3 h per night, shown as the low–high pair
const debt = t => t < MORN ? 0 : t < FOG ? 2.5 * lerp(1, 14, smooth(MORN + 1, FOG, t)) : t < FIX ? 35 : lerp(75, 0, smooth(FIX + 3.2, FIX + 5.6, t));
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < MORN) return [`<b style="background:#5a8ae8"></b>${t < BRAIN + 3.6 ? 'ASLEEP' : 'ALARM · 6:00 AM'}`, 'BRAIN CLEANUP', Math.round(100 * cleanAt(t)) + '%', t < BRAIN + 3.6 ? 'WASHING OUT WASTE' : 'ONLY 5 HOURS · NOT DONE'];
  if (t < DRIVE) return ['<b></b>DAY 1', 'SLEEP DEBT', '2–3 h', 'VS. 7–8 H YOU NEED'];
  if (t < OFFICE) return ['<b></b>DAY 2 · DRIVING', 'CRASH RISK', '×4.3', 'AAA FOUNDATION 2016'];
  if (t < SNACK) return ['<b></b>DAY 4', 'AMYGDALA', '+60%', 'THE BRAIN’S ALARM CENTER'];
  if (t < COLD) return ['<b style="background:#e8b030"></b>DAY 7 · 2:40 AM', 'EXTRA FOOD', '+385 kcal', '≈ 3 LB A MONTH (MODEL)'];
  if (t < FOG) return ['<b></b>DAY 10', 'COLD RISK', '×4.2', 'UNDER 6 H · PRATHER 2015'];
  if (t < FIX) return ['<b></b>DAY 14', 'YOUR BRAIN', t < FOG + 4.6 ? '≈ 1–2' : 'BARELY', t < FOG + 4.6 ? 'NIGHTS WITH NO SLEEP' : 'NOTICE IT'];
  if (t < FIX + 3.0) return ['<b></b>30 NIGHTS × 5 H', 'SLEEP DEBT', '60–90 h', 'VS. 7–8 H A NIGHT'];
  return ['<b style="background:#5fd27a"></b>SLEEP 8 H', 'SLEEP DEBT', Math.round(debt(t)) + ' h', 'PAYING IT BACK']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(3.8, 4.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  let eA = 1, eB = 1; if (!B || mix < 1) eA = shootScene(A, t, RTA); if (B) eB = shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0;
  // the outburst: a red flash of the amygdala; a faint grey-red edge in the brain fog
  compMat.uniforms.uRed.value = (0.42 + 0.12 * Math.sin(t * 6)) * fadeWin(t, OFFICE + 2.0, OFFICE + 4.0, 0.4) + 0.12 * fadeWin(t, FOG + 0.5, FIX - 0.3, 1.2);
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
