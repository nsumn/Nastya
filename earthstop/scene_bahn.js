import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "Was wäre, wenn die Deutsche Bahn immer pünktlich wäre?" (German short, 20 s): a platform, a departure board flipping from delays to "pünktlich",
// the station clock at +5:59 (DB counts < 6 min late as punctual; cancellations are not counted), a train arriving on the minute.
// Facts: DB Fernverkehr ~60 % punctual in 2025 (60.1 %, 2024: 62.5 %, 2015: 74.4 %); 134.5 M long-distance passengers in 2025 (~368,000/day); federal target 70 % by 2029.
// =================== timeline ===================
const BOARD = 3.0, CLOCK = 8.0, ARRIVE = 13.0, CARD = 18.0, T_END = 20.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 909;
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
      // optional mosaic: 30 px blocks inside a screen rectangle
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
// =================== the hero: same look in every scene (own seed so the height/hair never change) ===================
function makeHero() { const sv = seed; seed = 4242; const p = makePerson(rnd, { top: '#2fa89a', bottom: '#2a2e3a', hair: '#4a2f1b', skin: '#e9c4a2', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.3 }); seed = sv; return p; }
// =================== PLATFORM (meters): a long-distance platform at golden hour — the departure board, the station clock, the track, waiting people ===================
const plat = new THREE.Scene(); plat.background = new THREE.Color('#f2c89a'); plat.fog = new THREE.Fog(0xf2c89a, 40, 200); const plCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 400);
plat.add(new THREE.HemisphereLight(0xfff0e0, 0x5a5048, 0.9));
const sunP = new THREE.DirectionalLight(0xffd0a0, 2.4); sunP.position.set(18, 14, 10); sunP.castShadow = true; sunP.shadow.mapSize.set(2048, 2048); sunP.shadow.bias = -0.0004; Object.assign(sunP.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 80 }); plat.add(sunP, sunP.target);
{ const ground = mesh(new THREE.PlaneGeometry(400, 400), M('#6a6058', { roughness: 1 }), false, true); ground.rotation.x = -Math.PI / 2; plat.add(ground);
  const ballast = mesh(new THREE.BoxGeometry(4, 0.2, 300), M('#8a8278', { roughness: 1 }), false, true); ballast.position.set(-2.5, 0.1, -100); plat.add(ballast);
  for (const x of [-3.22, -1.78]) { const r = mesh(new THREE.BoxGeometry(0.08, 0.15, 300), M('#b8b8c0', { metalness: 0.7, roughness: 0.3 })); r.position.set(x, 0.28, -100); plat.add(r); }
  for (let z = 30; z > -250; z -= 0.65) { const sl = mesh(new THREE.BoxGeometry(2.6, 0.1, 0.25), M('#6a5a48'), false, true); sl.position.set(-2.5, 0.2, z); plat.add(sl); }
  const pf = mesh(new THREE.BoxGeometry(8, 0.76, 120), M('#c8c4bc', { roughness: 0.85 }), false, true); pf.position.set(3, 0.38, -40); plat.add(pf);
  const edge = mesh(new THREE.BoxGeometry(0.12, 0.01, 120), M('#f2f2f2'), false, true); edge.position.set(-0.4, 0.765, -40); plat.add(edge);
  const tactile = mesh(new THREE.BoxGeometry(0.3, 0.012, 120), M('#e8c840'), false, true); tactile.position.set(0.2, 0.767, -40); plat.add(tactile);
  bx(8.6, 0.25, 70, '#9a9ea8', 3, 5.4, -20, plat); for (let z = 12; z > -55; z -= 9) bx(0.3, 4.7, 0.3, '#4a4e58', 4.5, 3.05, z, plat);
  for (const z of [-6, -16, -28]) { bx(1.6, 0.08, 0.45, '#8a5a3a', 5.6, 1.2, z, plat); bx(1.6, 0.4, 0.06, '#8a5a3a', 5.6, 1.45, z - 0.2, plat); bx(0.08, 0.44, 0.4, '#2a2a30', 5.0, 0.98, z, plat); bx(0.08, 0.44, 0.4, '#2a2a30', 6.2, 0.98, z, plat); } }
// the departure board: redrawn every frame, each row flips from a delay to a green "pünktlich"
const brdCv = document.createElement('canvas'); brdCv.width = 1024; brdCv.height = 420; const brdTex = new THREE.CanvasTexture(brdCv); brdTex.colorSpace = THREE.SRGBColorSpace; brdTex.anisotropy = 8;
const ROWS = [['14:02', 'ICE', 'Berlin Hbf', '+25'], ['14:10', 'IC', 'Köln Hbf', '+40'], ['14:16', 'ICE', 'München Hbf', '+15'], ['14:31', 'ICE', 'Hamburg Hbf', 'fällt aus']];
const flipAt = r => BOARD + 0.6 + r * 0.45;
function drawBoard(t) { const g = brdCv.getContext('2d'); g.fillStyle = '#0c1c4c'; g.fillRect(0, 0, 1024, 420); g.fillStyle = '#ffffff'; g.font = 'bold 34px Inter, sans-serif'; g.fillText('Abfahrt', 30, 52); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(30, 70, 964, 3);
  ROWS.forEach((r, i) => { const y = 132 + i * 80, f = smooth(flipAt(i), flipAt(i) + 0.25, t), squash = Math.abs(Math.cos(Math.PI * clamp((t - flipAt(i)) / 0.25, 0, 1)));
    g.save(); g.translate(0, y - 20); g.scale(1, f > 0 && f < 1 ? Math.max(0.05, squash) : 1); g.translate(0, -(y - 20));
    g.fillStyle = '#ffffff'; g.font = '40px Inter, sans-serif'; g.fillText(r[0], 30, y); g.fillText(r[1], 170, y); g.fillText(r[2], 290, y);
    const ok = t >= flipAt(i) + 0.12; g.fillStyle = ok ? '#5fd27a' : '#ff6a5a'; g.font = 'bold 40px Inter, sans-serif'; g.textAlign = 'right'; g.fillText(ok ? 'pünktlich' : r[3], 994, y); g.textAlign = 'left'; g.restore(); });
  brdTex.needsUpdate = true; }
const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.48), new THREE.MeshBasicMaterial({ map: brdTex, color: new THREE.Color(1.25, 1.25, 1.25) })); board.position.set(2.2, 3.7, -4); plat.add(board);
bx(3.8, 1.62, 0.12, '#2a2e36', 2.2, 3.7, -4.07, plat); bx(0.08, 1.6, 0.08, '#2a2e36', 1.0, 5.0, -4.07, plat); bx(0.08, 1.6, 0.08, '#2a2e36', 3.4, 5.0, -4.07, plat);
// the station clock (no ticking sound — the second hand sweeps)
const clockG = grp(4.5, 3.05, -0.4, 0, plat);
{ const face = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.fillStyle = '#111'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0; g.save(); g.translate(128, 128); g.rotate(a); g.fillRect(-(big ? 4 : 1.5), -118, big ? 8 : 3, big ? 26 : 10); g.restore(); } });
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshBasicMaterial({ map: face, color: new THREE.Color(1.15, 1.15, 1.15) })); clockG.add(f);
  const rim = mesh(new THREE.TorusGeometry(0.51, 0.04, 8, 48), M('#1a1a1e')); clockG.add(rim); bx(0.06, 1.8, 0.06, '#2a2a30', 0, 1.4, -0.05, clockG); }
const hand = (len, w, col, z) => { const p = grp(0, 0, z, 0, clockG); bx(w, len, 0.01, col, 0, len / 2 - 0.05, 0, p); return p; };
const hH = hand(0.28, 0.05, '#111', 0.01), mH = hand(0.42, 0.035, '#111', 0.02), sH = hand(0.44, 0.012, '#d82020', 0.03);
// clock time in seconds since midnight: running fast up to 14:07:50, sweeping through the "5:59" gag, then normal again
const SCHED = 14 * 3600 + 2 * 60;
const clockTime = t => t < CLOCK ? 14 * 3600 + 7 * 60 + 30 + 2.5 * t : t < ARRIVE ? SCHED + 350 + (t - CLOCK) * 2.4 : SCHED + 362 + (t - ARRIVE) * 1;
// waiting people + the train (white body, red band, no logos)
const waiting = []; for (let k = 0; k < 9; k++) { const p = makePerson(rnd); plat.add(p.outer); waiting.push({ p, x: R(1.2, 4.0), z: R(-20, 2), ry: R(-2.2, -0.9) }); }
const train = new THREE.Group(); plat.add(train);
{ const W2 = 2.9, H2 = 3.6; for (let c = 0; c < 4; c++) { const z0 = -c * 26.5; const car = bx(W2, H2, 26, '#f4f4f2', 0, 0.6 + H2 / 2, z0 - 13, train, { roughness: 0.4 }); bx(W2 + 0.02, 0.28, 26, '#d8202a', 0, 1.35, z0 - 13, train);
    const win = bx(W2 + 0.03, 0.75, 22, '#1a2230', 0, 2.75, z0 - 13, train, { roughness: 0.15, metalness: 0.3 }); for (const dz of [-3, -23]) bx(W2 + 0.04, 2.1, 1.3, '#d8d8d4', 0, 1.75, z0 + dz, train); }
  const nose = mesh(new THREE.CylinderGeometry(0.01, 1.45, 5, 4, 1), M('#f4f4f2', { roughness: 0.4 })); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1, 1, 0.9); nose.position.set(0, 2.1, 2.4); train.add(nose);
  const shield = bx(2.0, 0.7, 0.05, '#1a2230', 0, 2.9, 0.6, train); shield.rotation.x = -0.5;
  for (const x of [-0.8, 0.8]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.6) })); hl.position.set(x, 1.3, 2.6); train.add(hl); } }
train.position.x = -2.5;
const arriveZ = t => { const u = clamp((t - ARRIVE + 0.4) / 3.0, 0, 1); return lerp(-170, 2, 1 - (1 - u) * (1 - u)); };   // decelerates into the platform, stops on time
function updatePlat(t) { drawBoard(t);
  const s = clockTime(t), sec = s % 60, min = (s / 60) % 60, hr = (s / 3600) % 12; sH.rotation.z = -sec / 60 * Math.PI * 2; mH.rotation.z = -min / 60 * Math.PI * 2; hH.rotation.z = -hr / 12 * Math.PI * 2;
  train.position.z = arriveZ(t); train.visible = t > ARRIVE - 0.8;
  const relief = smooth(BOARD + 0.6, BOARD + 2.4, t), board2 = smooth(ARRIVE + 2.6, ARRIVE + 4.6, t);
  waiting.forEach((Wt, k) => { const P = Wt.p; P.root.rotation.set(0, 0, 0); poseIdle(P, t, k);
    const sigh = (1 - relief) * (0.5 + 0.5 * Math.sin(t * 2 + k)); P.root.rotation.x = 0.12 * sigh; P.arms[0].rotation.x = -0.4 * sigh; P.arms[1].rotation.x = -0.4 * sigh;
    if (board2 > 0) { const x = lerp(Wt.x, -0.2, board2), z = Wt.z; P.outer.position.set(x, 0.95 + 0.76, z); P.outer.rotation.y = -Math.PI / 2; poseWalk(P, t * 8 + k, board2 < 1 ? 1 : 0); P.outer.visible = board2 < 0.97 || k % 3 === 0; }
    else { P.outer.position.set(Wt.x, 0.95 + 0.76, Wt.z); P.outer.rotation.y = Wt.ry + 0.8 * relief * Math.sin(k); P.outer.visible = true; } }); }
// camera keyframes: wide -> the board -> the clock -> the arrival
const KF = [[0, [6.0, 2.3, 12], [0.6, 2.8, -6]], [BOARD - 0.4, [5.4, 2.6, 9.5], [1.0, 3.0, -6]], [BOARD + 0.6, [2.2, 1.9, 4.4], [2.2, 2.55, -4]], [CLOCK - 0.6, [2.2, 1.9, 4.0], [2.2, 2.55, -4]],
  [CLOCK + 0.5, [4.5, 2.35, 2.6], [4.5, 2.6, -0.4]], [ARRIVE - 0.6, [4.5, 2.35, 2.4], [4.5, 2.6, -0.4]], [ARRIVE - 0.1, [3.4, 2.35, 2.2], [2.6, 2.4, -4]], [ARRIVE + 0.8, [3.4, 2.2, 11], [-2.0, 2.0, -12]], [T_END, [3.3, 2.1, 9.8], [-2.1, 2.0, -12]]];
function platCamera(t) { let i = 0; while (i < KF.length - 2 && t >= KF[i + 1][0]) i++; const [a, pa, la] = KF[i], [b, pb, lb] = KF[i + 1], k = ease(clamp((t - a) / (b - a), 0, 1));
  plCam.position.set(lerp(pa[0], pb[0], k), lerp(pa[1], pb[1], k), lerp(pa[2], pb[2], k)); plCam.lookAt(lerp(la[0], lb[0], k), lerp(la[1], lb[1], k), lerp(la[2], lb[2], k)); plCam.fov = 50; }
// =================== DOM + render ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'Was wäre, wenn die<br><span class="hl">Deutsche Bahn</span><br>immer pünktlich wäre?'; el.endT.innerHTML = 'Was wäre, wenn die <span class="hl">Deutsche Bahn</span> immer pünktlich wäre?';
el.endS.innerHTML = 'DB FERNVERKEHR 2025: ~60 % PÜNKTLICH (2015: 74 %).<br>PÜNKTLICH = UNTER 6 MINUTEN ZU SPÄT, AUSFÄLLE NICHT GEZÄHLT.<br>ZIEL DES BUNDES: 70 % BIS 2029.';
const captions = [
  [3.4, 7.8, 'Heute: nur ~60 % der<br>Fernzüge sind pünktlich.'],
  [8.4, 12.8, '„Pünktlich“ heißt: unter<br>6 Minuten zu spät.<br>Ausfälle zählen gar nicht.'],
  [13.4, 17.8, 'Jeden Tag ~368.000 Fernreisende —<br>und keiner verpasst<br>den Anschluss.'],
];
const mmss = s => `+${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < BOARD) return ['<b></b>FERNVERKEHR · HEUTE', 'ICE NACH BERLIN', '+25 min', 'SCHON WIEDER'];
  if (t < CLOCK) return ['<b></b>DB FERNVERKEHR 2025', 'PÜNKTLICH', '~60 %', '2015 WAREN ES 74 %'];
  if (t < ARRIVE) { const d = clockTime(t) - SCHED; return [d < 360 ? '<b style="background:#5fd27a"></b>DB-DEFINITION' : '<b></b>DB-DEFINITION', 'ANKUNFT', mmss(d), d < 360 ? 'ZÄHLT NOCH ALS PÜNKTLICH' : 'JETZT ERST VERSPÄTET']; }
  if (t < CARD) return ['<b style="background:#5fd27a"></b>WAS WÄRE, WENN …', 'FERNREISENDE / TAG', '~368.000', 'Ø 2025 · ALLE PÜNKTLICH']; return null; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(2.6, 3.1, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(CARD - 0.3, CARD, t)) * smooth(0.8, 1.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(CARD, CARD + 0.4, t); el.endT.style.opacity = smooth(CARD + 0.2, CARD + 0.6, t); el.endS.style.opacity = smooth(CARD + 0.4, CARD + 0.8, t); }
window.renderAt = (t) => { updatePlat(t); platCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(plCam.fov * Math.PI / 360)); shootTo(RTA, plat, plCam);
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0.25 * fadeWin(t, CLOCK + 4.1, ARRIVE - 0.2, 0.2) * (clockTime(t) - SCHED >= 360 ? 1 : 0); composite(0, 1.0, 1.0); updateDOM(t); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
