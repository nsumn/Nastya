import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you quit nicotine today?" — classic low-poly. Room (quit -> withdrawal nights -> morning), X-ray body, money jar, hourglass of time, mountain at sunset.
// Facts: CDC benefits-of-quitting timeline (20 min heart rate, 12 h CO, 2 wk-3 mo lung function, 1 yr CHD risk ~half, 10 yr lung-cancer death risk ~half);
// withdrawal peak ~day 3, easing over 2-4 weeks (Healthline); UCL/Addiction 2024 ~20 min of life per cigarette; Jha et al. NEJM 2013 (quit at 25-34 -> ~10 yr);
// money: tools/quit_math.py ($10.15/pack, $82/month vaping). The vape/cigarette is never shown clearly: pixelated in the composite (TikTok tobacco rules).
// =================== timeline ===================
const XRAY = 4.2, NIGHT = 9.0, PEAK = 13.5, WEEKS = 17.5, MORNING = 21.0, LUNGS = 24.5, MONEY = 28.0, YEARS = 42.0, MOUNT = 51.5, T_END = 60.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 2026;
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
// =================== ROOM (meters): living room + kitchen corner; evening -> withdrawal nights -> morning ===================
const room = new THREE.Scene(); const rCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hemiR = new THREE.HemisphereLight(0xfff0e0, 0x403830, 0.6); room.add(hemiR);
const lampL = new THREE.PointLight(0xffb870, 14, 9, 1.6); lampL.position.set(-1.9, 1.9, -1.4); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); room.add(lampL);
const moonL = new THREE.DirectionalLight(0x7090d0, 0.0); moonL.position.set(0.8, 3, -6); room.add(moonL, moonL.target);
const sunR = new THREE.DirectionalLight(0xffe2b0, 0.0); sunR.position.set(1.0, 3.2, -6); sunR.castShadow = true; sunR.shadow.mapSize.set(1024, 1024); Object.assign(sunR.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); room.add(sunR, sunR.target);
const fillR = new THREE.PointLight(0xffd8b0, 5, 7, 1.6); fillR.position.set(1.8, 1.7, 1.9); room.add(fillR);
const fridgeL = new THREE.PointLight(0xdfefff, 0, 4, 1.5); fridgeL.position.set(2.2, 1.2, -1.2); room.add(fridgeL);
// floor, walls, window (night city / morning sky textures)
{ const wood = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8a6448'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = pick(['#7e5a40', '#94694c', '#86603f']); g.fillRect(0, y, w, 30); } speckle(g, w, h, 900, ['#6e4e36', '#a07a58']); }, [3, 3]);
  const fl = mesh(new THREE.PlaneGeometry(7, 6), M('#ffffff', { map: wood, roughness: 0.7 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0.3, 0, -0.5); room.add(fl);
  bx(7, 3, 0.1, '#d9cdb8', 0.3, 1.5, -2.6, room); bx(0.1, 3, 6, '#cfc2ac', 3.3, 1.5, -0.5, room); bx(0.1, 3, 6, '#cfc2ac', -3.1, 1.5, -0.5, room); bx(7, 0.1, 6, '#e8e0d0', 0.3, 3.0, -0.5, room); }
const winNight = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#0c1430'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const bw = R(20, 50), bh = R(80, 300), x = R(0, w); g.fillStyle = '#141a2c'; g.fillRect(x, h - bh, bw, bh); for (let y = h - bh + 6; y < h; y += 12) for (let xx = x + 4; xx < x + bw - 4; xx += 9) if (rnd() < 0.35) { g.fillStyle = pick(['#ffd890', '#ffe8b0', '#9cc8ff']); g.fillRect(xx, y, 4, 5); } } g.fillStyle = '#f4f0e0'; g.beginPath(); g.arc(w * 0.8, h * 0.18, 16, 0, 7); g.fill(); });
const winDay = canvasTex(512, 384, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8cc0f0'); gr.addColorStop(1, '#ffe2b8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const bw = R(20, 50), bh = R(80, 300), x = R(0, w); g.fillStyle = pick(['#9aa6b8', '#b0b8c4', '#8a94a6']); g.fillRect(x, h - bh, bw, bh); } });
const winMat = new THREE.MeshBasicMaterial({ map: winNight }); const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), winMat); win.position.set(1.0, 1.65, -2.54); room.add(win);
for (const [w, h, x, y] of [[2.36, 0.08, 1.0, 2.49], [2.36, 0.08, 1.0, 0.81], [0.08, 1.7, -0.14, 1.65], [0.08, 1.7, 2.14, 1.65], [0.05, 1.6, 1.0, 1.65]]) bx(w, h, 0.08, '#f2eee6', x, y, -2.5, room);
// sofa, coffee table, floor lamp, rug, fridge + counter, trash bin, wall clock
{ const sofaC = '#5a6f8a'; bx(2.4, 0.42, 0.95, sofaC, -1.6, 0.35, -1.85, room); bx(2.4, 0.75, 0.25, sofaC, -1.6, 0.75, -2.3, room); for (const sx of [-1, 1]) bx(0.22, 0.6, 0.95, sofaC, -1.6 + sx * 1.2, 0.45, -1.85, room);
  for (const sx of [-0.55, 0.55]) bx(1.05, 0.12, 0.8, '#6a809c', -1.6 + sx, 0.62, -1.8, room);
  bx(1.3, 0.06, 0.7, '#6e4a32', -1.5, 0.45, -0.75, room); for (const [x, z] of [[-2.1, -1.05], [-0.9, -1.05], [-2.1, -0.45], [-0.9, -0.45]]) bx(0.06, 0.42, 0.06, '#5a3a26', x, 0.21, z, room);
  bx(2.6, 0.01, 1.8, '#b04a3a', -1.5, 0.005, -0.9, room); bx(0.06, 1.8, 0.06, '#2e2e30', -1.9, 0.9, -1.4, room); const shade = mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.3, 12, 1, true), M('#f4e2c0', { side: THREE.DoubleSide, emissive: '#ffcc88', emissiveIntensity: 0.6 })); shade.position.set(-1.9, 1.9, -1.4); room.add(shade);
  bx(1.6, 0.9, 0.6, '#e8e4dc', 2.6, 0.45, -2.2, room); bx(1.6, 0.05, 0.62, '#4a4a4e', 2.6, 0.92, -2.2, room); }
const fridge = new THREE.Group(); fridge.position.set(2.85, 0, -1.25); room.add(fridge); bx(0.75, 1.85, 0.7, '#e8ecf0', 0, 0.925, 0, fridge, { roughness: 0.3 });
const fDoor = new THREE.Group(); fDoor.position.set(-0.375, 0, 0.36); fridge.add(fDoor); bx(0.75, 1.85, 0.05, '#f2f4f6', 0.375, 0.925, 0, fDoor, { roughness: 0.3 }); bx(0.03, 0.5, 0.04, '#9aa0a8', 0.66, 1.1, 0.04, fDoor);
fridge.rotation.y = -Math.PI / 2;
const bin = new THREE.Group(); bin.position.set(1.05, 0, 0.15); room.add(bin); { const b = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 14, 1, true), M('#5a5e66', { side: THREE.DoubleSide, metalness: 0.4 })); b.position.y = 0.25; bin.add(b); const bt = mesh(new THREE.CircleGeometry(0.17, 14), M('#3a3e44')); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.02; bin.add(bt); }
const clockCv = document.createElement('canvas'); clockCv.width = clockCv.height = 256; const clockTex = new THREE.CanvasTexture(clockCv); clockTex.colorSpace = THREE.SRGBColorSpace;
const clock = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), new THREE.MeshStandardMaterial({ map: clockTex, emissive: '#ffffff', emissiveMap: clockTex, emissiveIntensity: 0.15 })); clock.position.set(-1.6, 2.3, -2.54); room.add(clock);
function drawClock(h) { const g = clockCv.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = '#f8f4ea'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#2a2a2e'; g.stroke();
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = '#2a2a2e'; g.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 8, 8, 16); }
  const hand = (a, l, w) => { g.save(); g.translate(128, 128); g.rotate(a); g.fillStyle = '#1a1a1e'; g.fillRect(-w / 2, -l, w, l); g.restore(); }; hand((h % 12) / 12 * Math.PI * 2, 62, 10); hand((h % 1) * Math.PI * 2, 92, 6); clockTex.needsUpdate = true; }
// snacks piling up on the coffee table during the nights
const SNACKS = []; for (let i = 0; i < 26; i++) { const g = new THREE.Group(); const c = pick(['#e2b33a', '#d8442e', '#3a7ac8', '#f08a2a', '#6ab04a', '#c24a8a']);
  if (rnd() < 0.5) bx(R(0.16, 0.24), R(0.2, 0.28), 0.05, c, 0, 0, 0, g); else { const m = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), M(c)); g.add(m); }
  g.position.set(-1.5 + R(-0.55, 0.55), 0.55 + Math.floor(i / 9) * 0.07, -0.75 + R(-0.25, 0.25)); g.rotation.set(R(-0.5, 0.5), R(0, 6), R(-1.2, 1.2)); room.add(g); SNACKS.push({ g, at: R(NIGHT + 2.6, WEEKS) }); }
// pizza with steam in the morning
const pizza = new THREE.Group(); pizza.position.set(-1.3, 0.49, -0.7); room.add(pizza); { const p = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 8), M('#e8a848')); pizza.add(p); for (let i = 0; i < 7; i++) { const s = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 6), M('#c8302a')); s.position.set(R(-0.14, 0.14), 0.02, R(-0.14, 0.14)); pizza.add(s); } }
// you
const you = makePerson(rnd, { top: '#3f6fa8', bottom: '#2a2e38', hair: '#3a2a20', skin: '#e8b896', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.3 }); room.add(you.outer);
// the vape (pixelated on screen) + the crumpled pack
const vape = new THREE.Group(); { bx(0.026, 0.06, 0.016, '#30343a', 0, 0.03, 0, vape); bx(0.026, 0.06, 0.016, '#6a2a8a', 0, -0.03, 0, vape); } room.add(vape);
const vapeA = vape.children[0], vapeB = vape.children[1];
const pack = new THREE.Group(); bx(0.06, 0.08, 0.025, '#f2f2f2', 0, 0, 0, pack); bx(0.062, 0.025, 0.027, '#b02a2a', 0, 0.03, 0, pack); room.add(pack);
const steamR = makeSmoke(room, 200);
const _rv = new THREE.Vector3();
function lightRoom(t) { const night = smooth(NIGHT - 0.2, NIGHT + 0.4, t) * (1 - smooth(WEEKS + 0.5, MORNING + 0.6, t)); const day = smooth(WEEKS + 1.5, MORNING + 0.8, t);
  lampL.intensity = 14 * (1 - night) * (1 - day); fillR.intensity = 5 * (1 - night * 0.7); moonL.intensity = 2.8 * night; sunR.intensity = 3.2 * day; hemiR.intensity = lerp(0.6, 0.42, night) + 0.6 * day; hemiR.color.set(night > 0.5 ? 0x8090c0 : 0xfff0e0);
  winMat.map = day > 0.5 ? winDay : winNight; winMat.color.setScalar(day > 0.5 ? lerp(0.6, 1.4, day) : 1); room.background = null; }
function updateRoom(t) { lightRoom(t);
  // clock: 9 PM on quit night, 3 AM in the nights, 8 AM in the morning
  drawClock(t < NIGHT ? 21 + t * 0.02 : t < WEEKS ? 3 + (t - NIGHT) * 0.06 : t < MORNING ? lerp(4, 7, (t - WEEKS) / (MORNING - WEEKS)) : 8 + (t - MORNING) * 0.03);
  const o = you.outer, P = you; o.rotation.set(0, 0, 0); o.scale.setScalar(1); P.root.rotation.set(0, 0, 0);
  const hand = () => P.elbows[1].localToWorld(_rv.set(0, -0.27, 0.03));
  if (t < NIGHT) { // QUIT: by the bin, snap the vape, drop it, toss the pack
    o.position.set(0.55, 0.95, -0.35); o.rotation.y = 0.55; poseIdle(P, t, 0);
    const lift = smooth(0.2, 1.0, t) * (1 - smooth(2.3, 2.8, t)); P.arms[1].rotation.set(-1.1 * lift, 0, -0.15 * lift); P.elbows[1].rotation.x = -1.2 * lift; P.arms[0].rotation.set(-1.0 * lift, 0, 0.2 * lift); P.elbows[0].rotation.x = -1.3 * lift;
    const snap = smooth(1.5, 1.75, t), drop = clamp((t - 2.35) / 0.45, 0, 1); you.outer.updateMatrixWorld(true); const hp = hand().clone();
    vape.visible = t < 3.2; vape.position.copy(hp).lerp(V3(1.05, 0.15, 0.15), drop * drop); vape.rotation.set(0.3, 0.6, 0); vapeA.rotation.z = 0.9 * snap; vapeA.position.x = 0.012 * snap; vapeB.rotation.z = -0.9 * snap; vapeB.position.x = -0.012 * snap;
    const toss = clamp((t - 3.0) / 0.55, 0, 1); pack.visible = t > 1.0 && t < 3.8; pack.position.copy(P.elbows[0].localToWorld(_rv.set(0, -0.27, 0.03))).lerp(V3(1.05, 0.2, 0.15), toss).add(V3(0, 0.35 * Math.sin(Math.PI * toss), 0)); pack.rotation.set(toss * 4, toss * 3, 0); pack.scale.set(1, lerp(1, 0.55, smooth(1.2, 1.8, t)), 1); }
  else { vape.visible = false; pack.visible = false;
    if (t < NIGHT + 2.4) { // tossing on the sofa
      o.position.set(-1.6, 0.85, -1.8); o.rotation.set(0, 0, Math.PI / 2 + 0.12 * Math.sin(t * 2.2)); o.rotation.order = 'ZYX'; poseIdle(P, t, 0); P.arms[1].rotation.x = -2.6 + 0.5 * Math.sin(t * 1.7); }
    else if (t < PEAK) { // raiding the fridge
      o.position.set(2.1, 0.95, -0.9); o.rotation.y = Math.PI / 2 + 0.2; poseIdle(P, t, 1); P.arms[1].rotation.x = -1.3; P.elbows[1].rotation.x = -0.6; }
    else if (t < MORNING) { // the peak: on the sofa edge, head in hands; then calmer
      const calm = smooth(WEEKS + 0.5, MORNING - 0.5, t); o.position.set(-1.5, 0.95 + 0.05, -1.55); o.rotation.y = 0.15; poseSit(P); o.position.y = 0.6;
      P.arms[0].rotation.x = lerp(-2.4, -0.4, calm); P.arms[1].rotation.x = lerp(-2.4, -0.4, calm); P.elbows[0].rotation.x = lerp(-2.2, -0.6, calm); P.elbows[1].rotation.x = lerp(-2.2, -0.6, calm);
      P.root.rotation.x = lerp(0.35, 0, calm) + 0.04 * Math.sin(t * 9) * (1 - calm) * smooth(PEAK, PEAK + 0.5, t); }
    else { // morning: on the sofa, sunlight, reaching for a slice of pizza (taste + smell are back)
      o.position.set(-1.5, 0.6, -1.55); o.rotation.y = 0.15; poseSit(P); const r = smooth(MORNING + 0.6, MORNING + 1.6, t) * (1 - smooth(MORNING + 2.6, MORNING + 3.3, t));
      P.arms[1].rotation.x = lerp(-0.3, -1.5, r); P.elbows[1].rotation.x = lerp(-0.6, -0.2, r); P.root.rotation.x = 0.25 * r; } }
  fDoor.rotation.y = -1.9 * fadeWin(t, NIGHT + 2.3, PEAK + 0.2, 0.5); fridgeL.intensity = 6 * fadeWin(t, NIGHT + 2.3, PEAK + 0.2, 0.5);
  for (const S of SNACKS) S.g.visible = t > S.at && t < MORNING - 0.3;
  pizza.visible = t > MORNING - 0.5; steamR.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); if (pizza.visible) for (let k = 0; k < 40; k++) { const age = (t * 0.5 + k / 40) % 1; _rv.set(-1.3 + Math.sin(k * 2.1 + age * 5) * 0.08, 0.55 + age * 0.7, -0.7 + Math.cos(k * 1.3) * 0.08); steamR.add(_rv, 0.04 + age * 0.12, 0.35 * (1 - age) * smooth(0, 0.2, age)); } steamR.end(); }
function roomCamera(t) { let pos, look, fov = 50; const sh = (a) => V3(Math.sin(t * 31) * a, Math.sin(t * 27.3) * a, 0);
  if (t < NIGHT) { pos = V3(1.7, 1.5, 1.75).lerp(V3(1.45, 1.3, 1.25), smooth(0, 3.5, t)); look = V3(0.65, 1.15, -0.2).lerp(V3(0.95, 0.6, 0.05), smooth(1.9, 3.3, t)); fov = 44; }
  else if (t < PEAK) { const k = ease(clamp((t - (NIGHT + 1.6)) / 1.4, 0, 1)); pos = V3(0.2, 1.7, 1.6).lerp(V3(0.4, 1.6, 1.4), k); look = V3(-1.6, 0.8, -1.8).lerp(V3(2.4, 1.1, -1.1), k); fov = 52; }
  else if (t < MORNING) { const k = ease(clamp((t - PEAK) / 3, 0, 1)); pos = V3(0.4, 1.6, 1.4).lerp(V3(-0.6, 1.3, 0.9), k); look = V3(2.4, 1.1, -1.1).lerp(V3(-1.5, 0.95, -1.6), ease(clamp((t - PEAK) / 1.2, 0, 1))); fov = 50; pos.add(sh(0.02 * smooth(PEAK, PEAK + 0.6, t) * (1 - smooth(WEEKS, WEEKS + 1.5, t)))); }
  else { const k = smooth(MORNING, LUNGS, t); pos = V3(0.3, 1.35, 1.0).lerp(V3(-0.6, 1.15, 0.2), k); look = V3(-1.4, 0.8, -1.4).lerp(V3(-1.45, 1.05, -1.6), k); fov = 50; }
  rCam.position.copy(pos); rCam.lookAt(look); rCam.fov = fov; }
// =================== X-RAY BODY (meters): glassy body, beating heart, lungs, vessels with blood cells; carbon monoxide leaves, lungs clear ===================
const xr = new THREE.Scene(); xr.background = new THREE.Color('#06101e'); const xCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
xr.add(new THREE.AmbientLight(0x6a8ab0, 0.8)); const xKey = new THREE.DirectionalLight(0xffffff, 1.6); xKey.position.set(1, 2, 3); xr.add(xKey);
{ const grid = new THREE.GridHelper(8, 32, 0x1e4a7a, 0x12304e); grid.rotation.x = Math.PI / 2; grid.position.z = -1.2; xr.add(grid); }
const ghost = makePerson(rnd, { top: '#ffffff', bottom: '#ffffff', skin: '#ffffff', hair: '#ffffff', dress: false, shorts: false, cap: false }); xr.add(ghost.outer); ghost.outer.position.set(0, 0.95, 0); poseIdle(ghost, 0, 0);
const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.6, 1.1), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
ghost.outer.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
const organs = new THREE.Group(); xr.add(organs);
const heart = mesh(new THREE.IcosahedronGeometry(0.055, 1), M('#d8283a', { flatShading: true, emissive: '#6a0a12', roughness: 0.4 })); heart.position.set(0.03, 1.31, 0.05); heart.scale.set(1, 1.15, 0.9); organs.add(heart);
const lungMat = new THREE.MeshStandardMaterial({ color: '#6a6a6e', flatShading: true, roughness: 0.6, emissive: '#1a1a1e' });
const lungs = []; for (const sx of [-1, 1]) { const l = mesh(new THREE.IcosahedronGeometry(1, 2), lungMat); l.scale.set(0.068, 0.13, 0.06); l.position.set(sx * 0.085, 1.34, 0.0); organs.add(l); lungs.push(l); }
const trachea = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), M('#c8b8b0')); trachea.position.set(0, 1.5, 0); organs.add(trachea);
// vessels from the heart to head, arms, legs; blood cells ride along them
const VES = [[[0.03, 1.31, 0.05], [0.0, 1.5, 0.03], [0.0, 1.62, 0.02]], [[0.03, 1.31, 0.05], [0.15, 1.38, 0.02], [0.22, 1.2, 0.0], [0.26, 0.95, 0.02]], [[0.03, 1.31, 0.05], [-0.15, 1.38, 0.02], [-0.22, 1.2, 0.0], [-0.26, 0.95, 0.02]],
  [[0.03, 1.31, 0.05], [0.04, 1.05, 0.04], [0.09, 0.85, 0.02], [0.1, 0.4, 0.03], [0.1, 0.08, 0.05]], [[0.03, 1.31, 0.05], [0.0, 1.05, 0.04], [-0.09, 0.85, 0.02], [-0.1, 0.4, 0.03], [-0.1, 0.08, 0.05]]].map(pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p))));
const vesMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.08, 0.1), transparent: true, opacity: 0.55 }); for (const c of VES) organs.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.006, 5, false), vesMat));
const CELL_N = 360; const cellMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.15, 0.15) }), CELL_N); cellMesh.frustumCulled = false; organs.add(cellMesh);
const coMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 5, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.35, 0.38) }), CELL_N); coMesh.frustumCulled = false; organs.add(coMesh);
const o2Mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.005, 5, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.4, 2.4) }), CELL_N); o2Mesh.frustumCulled = false; organs.add(o2Mesh);
const CELLS = Array.from({ length: CELL_N }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.006), co: rnd() }));
const tar = makeSmoke(xr, 400); const _xo = new THREE.Object3D(), _xv = new THREE.Vector3();
const bpmAt = t => t < XRAY + 1.5 ? 88 : Math.round(lerp(88, 74, smooth(XRAY + 1.5, XRAY + 3.0, t)));
function updateBody(t) { const bpm = bpmAt(t), ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(0, ph - 0.18) * 9) * (ph > 0.18);
  heart.scale.set(1 + 0.18 * beat, 1.15 + 0.2 * beat, 0.9 + 0.15 * beat);
  const co = 1 - smooth(XRAY + 2.8, XRAY + 4.4, t);   // CO leaves within ~12 h
  CELLS.forEach((C, i) => { const u = (C.u0 + t * C.sp) % 1; VES[C.v].getPointAt(u, _xv).add(C.off); _xo.position.copy(_xv); _xo.scale.setScalar(1); _xo.updateMatrix(); cellMesh.setMatrixAt(i, _xo.matrix);
    _xo.position.add(V3(0.007, 0.004, 0.004)); _xo.scale.setScalar(C.co < co ? 1 : 0.0001); _xo.updateMatrix(); coMesh.setMatrixAt(i, _xo.matrix);
    _xo.position.add(V3(-0.012, 0, 0)); _xo.scale.setScalar(C.co < 1 - co ? 1 : 0.0001); _xo.updateMatrix(); o2Mesh.setMatrixAt(i, _xo.matrix); });
  cellMesh.instanceMatrix.needsUpdate = true; coMesh.instanceMatrix.needsUpdate = true; o2Mesh.instanceMatrix.needsUpdate = true;
  // lungs: grey -> pink while the gunk is swept out (only in the LUNGS beat)
  const clean = smooth(LUNGS + 0.4, LUNGS + 3.0, t); lungMat.color.set('#6a6a6e').lerp(new THREE.Color('#e88a96'), clean); lungMat.emissive.set('#1a1a1e').lerp(new THREE.Color('#4a1018'), clean);
  const breath = 1 + 0.06 * Math.sin(t * 2.4); lungs.forEach(l => l.scale.set(0.068 * breath, 0.13 * breath, 0.06 * breath));
  tar.begin(); smokeMat.uniforms.uTint.value.set('#4a4a50'); if (t > LUNGS) for (let k = 0; k < 80; k++) { const age = (t * 0.35 + k / 80) % 1; const sx = k % 2 ? 1 : -1; _xv.set(sx * (0.06 + 0.04 * Math.sin(k * 3.3)) * (1 - age * 0.8), 1.28 + age * 0.34, 0.02 + 0.02 * Math.cos(k)); tar.add(_xv, 0.012 + 0.01 * (1 - age), 0.8 * (1 - clean * 0.85) * (1 - age)); } tar.end(); }
function bodyCamera(t) { let pos, look, fov = 40;
  if (t < NIGHT) { const k = ease(clamp((t - XRAY - 1.8) / 2.6, 0, 1)); pos = V3(0.9, 1.25, 3.4).lerp(V3(0.22, 1.35, 0.55), k); look = V3(0, 1.0, 0).lerp(V3(0.02, 1.3, 0.03), k); fov = lerp(40, 34, k); }
  else { const k = ease(clamp((t - LUNGS) / 3.2, 0, 1)); pos = V3(-0.25, 1.42, 0.5).lerp(V3(0.15, 1.36, 0.42), k); look = V3(0, 1.34, 0); fov = 32; }
  xCam.position.copy(pos); xCam.lookAt(look); xCam.fov = fov; }
// =================== MONEY (meters): a glass jar on a table fills with bills; what the money becomes pops up next to it ===================
const cash = new THREE.Scene(); cash.background = new THREE.Color('#1c2a22'); const mCam = new THREE.PerspectiveCamera(42, W / H, 0.02, 200);
cash.add(new THREE.HemisphereLight(0xfff4e0, 0x2a3a30, 0.9)); const mKey = new THREE.DirectionalLight(0xfff0d8, 2.6); mKey.position.set(2, 4, 3); mKey.castShadow = true; mKey.shadow.mapSize.set(2048, 2048);
Object.assign(mKey.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); cash.add(mKey); const mRim = new THREE.PointLight(0x7af0a8, 4, 6); mRim.position.set(-1.5, 1.5, -1); cash.add(mRim);
{ const top = mesh(BOX, M('#6a4a34', { roughness: 0.55 }), false, true); top.scale.set(6, 0.1, 3); top.position.set(0, -0.05, 0); cash.add(top); bx(8, 4, 0.1, '#20302a', 0, 1.5, -1.6, cash); }
const jar = new THREE.Group(); cash.add(jar); { const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#dff4ea', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 0.4; jar.add(glass); const lid = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 24), M('#c8a040', { metalness: 0.7, roughness: 0.3 })); lid.position.set(0.5, 0.03, 0.25); lid.rotation.z = 0.2; jar.add(lid);
  const label = mesh(new THREE.PlaneGeometry(0.4, 0.16), new THREE.MeshStandardMaterial({ map: canvasTex(256, 100, (g, w, h) => { g.fillStyle = '#f4ecd6'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a4a32'; g.font = 'bold 40px Inter'; g.textAlign = 'center'; g.fillText('NO MORE', w / 2, 44); g.fillText('NICOTINE', w / 2, 86); }) })); label.position.set(0, 0.42, 0.322); jar.add(label); }
const billTex = canvasTex(256, 110, (g, w, h) => { g.fillStyle = '#a8c89a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a6a42'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#4a6a42'; g.beginPath(); g.ellipse(w / 2, h / 2, 26, 34, 0, 0, 7); g.fill(); g.font = 'bold 30px Inter'; g.fillText('$', 24, 42); g.fillText('$', w - 44, h - 18); });
const billMat = new THREE.MeshStandardMaterial({ map: billTex, roughness: 0.8, side: THREE.DoubleSide }); const billGeo = new THREE.PlaneGeometry(0.2, 0.086);
const BILLS = []; for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(billGeo, billMat); m.castShadow = true; cash.add(m); const a = R(0, 6.28), r = R(0, 0.24), lvl = i / 160;
  BILLS.push({ m, at: MONEY + 0.3 + lvl * 11.5, rest: V3(Math.cos(a) * r, 0.02 + lvl * 0.72, Math.sin(a) * r), rot: V3(-Math.PI / 2 + R(-0.4, 0.4), R(0, 6), R(-0.3, 0.3)), sx: R(-0.6, 0.6) }); }
// rewards: concert ticket, beach trip (suitcase + palm), a car, a house — each pops in on its beat
const REW = [];
function reward(at, build, x, z) { const g = new THREE.Group(); build(g); g.position.set(x, 0, z); cash.add(g); REW.push({ g, at }); return g; }
reward(MONEY + 0.8, g => { const tk = mesh(new THREE.BoxGeometry(0.42, 0.2, 0.01), new THREE.MeshStandardMaterial({ map: canvasTex(256, 120, (c, w, h) => { c.fillStyle = '#ff5a8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 34px Inter'; c.fillText('CONCERT', 22, 56); c.font = '24px Inter'; c.fillText('ADMIT ONE', 22, 92); c.setLineDash([6, 6]); c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(196, 0); c.lineTo(196, h); c.stroke(); }) })); tk.position.y = 0.35; tk.rotation.set(-0.2, 0.3, 0.1); g.add(tk); }, -0.75, 0.25);
reward(MONEY + 4.3, g => { bx(0.36, 0.26, 0.14, '#3a8ac8', 0, 0.13, 0, g); bx(0.12, 0.05, 0.03, '#2a2a2e', 0, 0.28, 0, g); for (const sx of [-1, 1]) bx(0.02, 0.26, 0.15, '#f2c84a', sx * 0.1, 0.13, 0, g);
  const tr = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.55, 6), M('#8a6440')); tr.position.set(0.3, 0.27, -0.1); tr.rotation.z = -0.15; g.add(tr); for (let k = 0; k < 6; k++) { const lf = mesh(new THREE.ConeGeometry(0.05, 0.3, 4), M('#3aa04a')); lf.position.set(0.34 + Math.cos(k) * 0.1, 0.55, -0.1 + Math.sin(k) * 0.1); lf.rotation.set(Math.sin(k) * 1.2, 0, Math.cos(k) * 1.2 + 1.6); g.add(lf); } }, 0.78, 0.2);
reward(MONEY + 7.8, g => { bx(0.62, 0.14, 0.28, '#d23a3a', 0, 0.11, 0, g); bx(0.34, 0.12, 0.25, '#2a3442', -0.02, 0.24, 0, g, { roughness: 0.2, metalness: 0.4 }); for (const sx of [-0.2, 0.2]) for (const sz of [-0.13, 0.13]) { const w = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), M('#1a1a1a')); w.rotation.x = Math.PI / 2; w.position.set(sx, 0.06, sz); g.add(w); } }, -0.8, -0.5);
reward(MONEY + 11.2, g => { bx(0.5, 0.34, 0.4, '#f2e6cc', 0, 0.17, 0, g); const rf = mesh(new THREE.ConeGeometry(0.42, 0.26, 4), M('#a8483a')); rf.position.y = 0.47; rf.rotation.y = Math.PI / 4; g.add(rf); bx(0.1, 0.18, 0.01, '#6a4a34', 0, 0.09, 0.205, g); bx(0.1, 0.08, 0.01, '#9ad0f0', 0.15, 0.22, 0.205, g); bx(0.1, 0.08, 0.01, '#9ad0f0', -0.15, 0.22, 0.205, g); }, 0.85, -0.55);
function updateMoney(t) { for (const B of BILLS) { const k = clamp((t - B.at) / 0.55, 0, 1); B.m.visible = t > B.at; if (!B.m.visible) continue; const e = 1 - Math.pow(1 - k, 3);
    B.m.position.set(lerp(B.sx, B.rest.x, e), lerp(1.6, B.rest.y, e), lerp(0.2, B.rest.z, e)); B.m.rotation.set(lerp(0.6, B.rot.x, e) + (1 - e) * Math.sin(t * 9 + B.sx * 9), B.rot.y + (1 - e) * 3, B.rot.z); }
  for (const Rw of REW) { const k = clamp((t - Rw.at) / 0.45, 0, 1); const s = k < 1 ? Math.sin(k * Math.PI * 0.5) * (1 + 0.25 * Math.sin(k * Math.PI)) : 1; Rw.g.scale.setScalar(Math.max(0.0001, s)); Rw.g.visible = k > 0; Rw.g.rotation.y = 0.25 * Math.sin(t * 0.8 + Rw.at); } }
function moneyCamera(t) { const u = clamp((t - MONEY) / (YEARS - MONEY), 0, 1); const a = lerp(-0.5, 0.55, u), d = lerp(2.3, 3.1, u); mCam.position.set(Math.sin(a) * d, lerp(1.2, 1.55, u), Math.cos(a) * d); mCam.lookAt(0, lerp(0.38, 0.3, u), -0.1); mCam.fov = 42; }
// =================== TIME (meters): an hourglass whose sand flows back UP (time won back) + day pages flying in ===================
const hg = new THREE.Scene(); hg.background = new THREE.Color('#141a2a'); const hCam = new THREE.PerspectiveCamera(40, W / H, 0.02, 100);
hg.add(new THREE.HemisphereLight(0xe0e8ff, 0x302838, 0.8)); const hKey = new THREE.DirectionalLight(0xffe8c8, 2.4); hKey.position.set(2, 3, 3); hg.add(hKey); const hGlow = new THREE.PointLight(0xffc870, 6, 5); hGlow.position.set(0, 1.0, 0.6); hg.add(hGlow);
const hour = new THREE.Group(); hg.add(hour); { const wood = M('#6a4a34', { roughness: 0.5 }); bx(0.9, 0.08, 0.9, wood, 0, 0.04, 0, hour); bx(0.9, 0.08, 0.9, wood, 0, 1.76, 0, hour); for (const [x, z] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) bx(0.05, 1.7, 0.05, wood, x, 0.9, z, hour);
  const pts = []; for (let i = 0; i <= 24; i++) { const y = i / 24; const r = 0.03 + 0.3 * Math.pow(Math.abs(Math.cos(y * Math.PI)), 0.8); pts.push(new THREE.Vector2(r, 0.1 + y * 1.6)); }
  hour.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }))); }
const sandMat = M('#e8c070', { roughness: 0.9, emissive: '#4a3010' });
const sandTop = mesh(new THREE.ConeGeometry(0.26, 0.4, 20), sandMat); sandTop.rotation.x = Math.PI; hour.add(sandTop); const sandBot = mesh(new THREE.ConeGeometry(0.28, 0.4, 20), sandMat); hour.add(sandBot);
const stream = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6), sandMat); stream.position.y = 0.9; hour.add(stream);
// calendar pages (one per "day won back") flying in a spiral around the hourglass
const pageTex = canvasTex(128, 150, (g, w, h) => { g.fillStyle = '#f8f4ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, 34); g.fillStyle = '#2a2a2e'; g.font = 'bold 64px Source Serif 4'; g.textAlign = 'center'; g.fillText('+1', w / 2, 112); g.fillStyle = '#fff'; g.font = 'bold 20px Inter'; g.fillText('DAY', w / 2, 25); });
const PAGE_N = 101; const pageMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.19), new THREE.MeshStandardMaterial({ map: pageTex, side: THREE.DoubleSide, roughness: 0.8 }), PAGE_N); pageMesh.frustumCulled = false; hg.add(pageMesh);
const PAGES = Array.from({ length: PAGE_N }, (_, i) => ({ at: YEARS + 0.4 + i * 0.04, a: i * 0.62, r: R(0.75, 1.1), y: R(0.2, 1.9), spin: R(-1, 1) })); const _ho = new THREE.Object3D();
// mountain at sunset: you, older, at the summit
const mt = new THREE.Scene(); const tCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 4000);
const mtSky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {},
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: 'varying vec3 vD; void main(){ float h = vD.y; vec3 sd = normalize(vec3(0.0, 0.06, -1.0)); float s = max(dot(normalize(vD), sd), 0.0); vec3 c = mix(vec3(1.3,0.62,0.32), vec3(0.22,0.24,0.5), smoothstep(0.0, 0.5, h)); c += vec3(2.0,1.2,0.6) * pow(s, 60.0) + vec3(6.0,4.5,3.0) * pow(s, 2500.0); if (h < 0.0) c = vec3(0.3,0.2,0.25); gl_FragColor = vec4(c, 1.0); }' }));
mt.add(mtSky); mt.add(new THREE.HemisphereLight(0xffc8a0, 0x403040, 0.9)); const mtSun = new THREE.DirectionalLight(0xffa860, 3.0); mtSun.position.set(0, 20, -300); mt.add(mtSun); mt.fog = new THREE.Fog(0xc8806a, 60, 900);
{ const geo = new THREE.PlaneGeometry(1600, 1600, 120, 120); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const d = Math.hypot(x, y);
    let h = 60 * Math.exp(-d * d / 26000) + 22 * (Math.sin(x * 0.012) * Math.cos(y * 0.01) + 1) * smooth(150, 600, d) + 6 * Math.sin(x * 0.05 + y * 0.03) * smooth(30, 120, d); p.setZ(i, h); }
  geo.computeVertexNormals(); const ter = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ color: '#5a6a48', flatShading: true, roughness: 1 })); ter.geometry.computeVertexNormals(); ter.rotation.x = -Math.PI / 2; mt.add(ter); }
const peakY = 60; const old = makePerson(rnd, { top: '#c8582e', bottom: '#3a3e48', hair: '#d8d8d8', skin: '#e8b896', dress: false, shorts: false, longSleeve: true, cap: false }); mt.add(old.outer); old.outer.position.set(0, peakY + 0.95, 0); old.outer.rotation.y = Math.PI;
const stick = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6), M('#6a4a34')); mt.add(stick);
function updateLife(t) { const u = smooth(YEARS + 0.3, MOUNT, t);
  sandTop.position.y = 1.08; sandTop.scale.set(lerp(0.4, 1, u), lerp(0.4, 1, u), lerp(0.4, 1, u)); sandBot.position.y = 0.3; sandBot.scale.setScalar(Math.max(0.0001, lerp(1, 0.4, u)));
  stream.visible = u < 0.98; stream.material.emissiveIntensity = 1; hour.rotation.y = 0.15 * Math.sin(t * 0.5);
  PAGES.forEach((P, i) => { const k = clamp((t - P.at) / 1.2, 0, 1); const a = P.a + t * 0.6; const r = lerp(2.4, P.r, 1 - Math.pow(1 - k, 3)); _ho.position.set(Math.cos(a) * r, lerp(2.4, P.y, k), Math.sin(a) * r); _ho.rotation.set(P.spin * t, a + Math.PI / 2, 0.2 * P.spin); _ho.scale.setScalar(k > 0 ? 1 : 0.0001); _ho.updateMatrix(); pageMesh.setMatrixAt(i, _ho.matrix); }); pageMesh.instanceMatrix.needsUpdate = true;
  poseIdle(old, t, 0); old.arms[1].rotation.set(-0.35, 0, 0); stick.position.copy(old.elbows[1].localToWorld(V3(0, -0.27, 0.05))).add(V3(0, -0.55, 0)); old.arms[0].rotation.set(-2.6 * smooth(MOUNT + 3.5, MOUNT + 4.5, t), 0, 0.3); }
function lifeCamera(t) { const k = ease(clamp((t - YEARS) / (MOUNT - YEARS), 0, 1)); hCam.position.set(Math.sin(lerp(-0.6, 0.6, k)) * lerp(3.6, 3.0, k), lerp(1.3, 1.0, k), Math.cos(lerp(-0.6, 0.6, k)) * lerp(3.6, 3.0, k)); hCam.lookAt(0, 0.95, 0); hCam.fov = 40; }
function mountCamera(t) { const k = ease(clamp((t - MOUNT) / (T_END - MOUNT), 0, 1)); const a = lerp(0.9, 0.2, k), d = lerp(9, 4.2, k); tCam.position.set(Math.sin(a) * d, peakY + lerp(4.5, 2.0, k), Math.cos(a) * d); tCam.lookAt(0, peakY + 1.4, -2); tCam.fov = 50; }
// =================== scene schedule + dissolves ===================
const SCN = { room: [updateRoom, roomCamera, room, () => rCam, 1.0], body: [updateBody, bodyCamera, xr, () => xCam, 1.25], cash: [updateMoney, moneyCamera, cash, () => mCam, 1.0],
  hg: [updateLife, lifeCamera, hg, () => hCam, 1.1], mt: [updateLife, mountCamera, mt, () => tCam, 1.0] };
const SEQ = [[0, 'room'], [XRAY, 'body'], [NIGHT, 'room'], [LUNGS, 'body'], [MONEY, 'cash'], [YEARS, 'hg'], [MOUNT, 'mt']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== censor mosaic over the vape / pack (screen rectangle from their projected bounds) ===================
const _bb = new THREE.Box3(), _pc = new THREE.Vector3();
function censorRect(t) { const u = compMat.uniforms; if (t > NIGHT - 0.5 || (!vape.visible && !pack.visible)) { u.uPixOn.value = 0; return; }
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0; for (const o of [vape, pack]) { if (!o.visible) continue; _bb.setFromObject(o); for (let k = 0; k < 8; k++) { _pc.set(k & 1 ? _bb.max.x : _bb.min.x, k & 2 ? _bb.max.y : _bb.min.y, k & 4 ? _bb.max.z : _bb.min.z).project(rCam); const x = _pc.x * 0.5 + 0.5, y = _pc.y * 0.5 + 0.5; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max((x1 - x0) / 2 + 0.03, 0.06), hh = Math.max((y1 - y0) / 2 + 0.018, 0.036); u.uPix.value.set(cx - hw, cy - hh, cx + hw, cy + hh); u.uPixOn.value = 1; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you quit<br><span class="hl">nicotine</span> today?'; el.endT.innerHTML = 'What if you quit <span class="hl">nicotine</span> today?';
el.endS.innerHTML = 'CDC: ONE YEAR AFTER QUITTING, THE EXTRA RISK OF HEART DISEASE IS ABOUT HALF.<br>JHA ET AL., NEJM 2013: QUITTING AT 25–34 GIVES BACK ~10 YEARS OF LIFE.<br>UCL 2024: EACH CIGARETTE ≈ 20 MINUTES OF LIFE EXPECTANCY.';
const captions = [
  [4.6, 6.7, '20 minutes: your heart rate drops.'],
  [6.8, 8.8, '12 hours: carbon monoxide<br>leaves your blood.'],
  [9.3, 13.3, 'Day 1: cravings, anger, no sleep.'],
  [13.6, 17.3, 'Day 3: the nicotine is gone —<br>this is the peak.'],
  [17.6, 20.8, 'Weeks 2–4: every craving gets weaker.<br>A few extra pounds? Totally normal.'],
  [21.2, 24.3, 'Food tastes better.<br>You can smell again.'],
  [24.7, 27.8, '2 weeks – 3 months:<br>your lungs start working better.'],
  [28.3, 31.8, 'A pack a day ≈ $10.<br>That’s $309 a month.'],
  [32.0, 35.3, '$3,705 a year.<br>Vaping? Still about $1,000.'],
  [35.5, 38.8, '$37,000 in 10 years.'],
  [39.0, 41.8, 'Invest it for 30 years:<br>about $377,000.'],
  [42.3, 46.6, 'Every cigarette ≈ 20 minutes of life.<br>A pack a day = 101 days a year.'],
  [46.8, 51.2, '1 year: heart attack risk cut in half.<br>10 years: lung cancer risk cut in half.'],
  [51.8, 55.6, 'Quit before 40 —<br>and win back about 10 years.'],
  [55.8, 59.8, 'The first week is hell.<br>The rest is your life.'],
];
const money = t => t < MONEY + 4.0 ? 309 * smooth(MONEY + 0.2, MONEY + 3.6, t) : t < MONEY + 7.5 ? lerp(309, 3705, smooth(MONEY + 4.0, MONEY + 7.0, t)) : t < MONEY + 11.0 ? lerp(3705, 37048, smooth(MONEY + 7.5, MONEY + 10.5, t)) : lerp(37048, 376641, smooth(MONEY + 11.0, MONEY + 13.4, t));
const craving = t => t < PEAK ? lerp(35, 85, smooth(NIGHT, PEAK, t)) + 8 * Math.sin(t * 3) : t < WEEKS ? 96 + 4 * Math.sin(t * 7) : Math.max(8, lerp(80, 15, smooth(WEEKS, MORNING, t)) * (0.6 + 0.4 * Math.abs(Math.sin((t - WEEKS) * 2.2))));
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < NIGHT) return [`<b style="background:#5fd27a"></b>QUIT · ${t < XRAY + 2.6 ? '20 MINUTES' : '12 HOURS'} AGO`, 'HEART RATE', bpmAt(t) + ' bpm', t < XRAY + 2.6 ? 'CALMING DOWN' : 'CARBON MONOXIDE: LEAVING'];
  if (t < PEAK) return ['<b></b>DAY 1', 'CRAVING', Math.round(craving(t)) + '%', 'IRRITABLE · CAN’T SLEEP'];
  if (t < WEEKS) return ['<b></b>DAY 3 · PEAK', 'CRAVING', Math.round(craving(t)) + '%', 'WITHDRAWAL AT ITS WORST'];
  if (t < MORNING) return [`<b style="background:#e8b030"></b>WEEK ${t < WEEKS + 1.7 ? 2 : 4}`, 'CRAVING', Math.round(craving(t)) + '%', 'WAVES GET WEAKER'];
  if (t < LUNGS) return ['<b style="background:#5fd27a"></b>WEEK 4', 'TASTE & SMELL', 'BACK', 'FOOD TASTES BETTER'];
  if (t < MONEY) return ['<b style="background:#5fd27a"></b>MONTH 3', 'LUNGS', 'CLEARING', 'BREATHING GETS EASIER'];
  if (t < YEARS) { const m = money(t); return [`<b style="background:#5fd27a"></b>${t < MONEY + 4 ? '1 MONTH' : t < MONEY + 7.5 ? '1 YEAR' : t < MONEY + 11 ? '10 YEARS' : '30 YEARS · INVESTED AT 7%'}`, 'MONEY SAVED', '$' + fmt(m), 'PACK A DAY · $10.15'] ; }
  if (t < YEARS + 4.6) return ['<b style="background:#5fd27a"></b>PACK A DAY · 1 YEAR', 'LIFE WON BACK', '+' + Math.round(101 * smooth(YEARS + 0.4, YEARS + 4.4, t)) + ' days', '~20 MIN PER CIGARETTE'];
  if (t < MOUNT) return ['<b style="background:#5fd27a"></b>' + (t < YEARS + 7 ? '1 YEAR' : '10 YEARS') + ' AFTER QUITTING', t < YEARS + 7 ? 'HEART ATTACK RISK' : 'LUNG CANCER RISK', '−50%', t < YEARS + 7 ? 'EXTRA RISK, VS. STILL SMOKING' : 'RISK OF DYING, VS. STILL SMOKING'];
  return ['<b style="background:#5fd27a"></b>QUIT AT 25–34 · NEJM 2013', 'LIFE WON BACK', '~10 years', 'QUIT BEFORE 40: ~90% OF THE RISK GONE']; }
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
  if (A === 'room' || B === 'room') censorRect(t); else compMat.uniforms.uPixOn.value = 0;
  compMat.uniforms.uRed.value = 0.1 * fadeWin(t, NIGHT, PEAK, 0.5) + (0.32 + 0.18 * Math.sin(t * 5.5)) * fadeWin(t, PEAK, WEEKS + 0.8, 0.6);
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
