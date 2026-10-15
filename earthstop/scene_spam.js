import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if spam calls were missing people calling for help?" — classic series low-poly look (flat shading, soft shadows, no grain).
// Numbers: tools/spam_math.py — 52.5 B spam calls a year (YouMail 2025) = 1,665 / s; 93,447 missing (FBI NCIC 12/2024)
// -> 561,816 calls each a year = 1,539 a day = one every 56 s; 1 in 5 answered = 10.5 B = 49x the 212.9 M 911 calls (FCC 2024).
// =================== timeline ===================
const DECLINE = 4.0, ANSWER = 9.0, CITY = 15.0, MAP = 19.0, DIVIDE = 24.0, STREET = 33.0, CENTER = 42.0, DAWN = 51.0, T_END = 58.0;
// =================== helpers ===================
let seed = 9110;
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
// a small glowing phone that people hold (attached to the forearm group of people.js)
const phoneGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.2), toneMapped: true });
function givePhone(p) { const g = new THREE.Group(); g.position.set(0, -0.28, 0.02); p.elbows[1].add(g);
  const b = mesh(BOX, M('#15161a', { roughness: 0.4 })); b.scale.set(0.035, 0.15, 0.075); g.add(b);
  const s = new THREE.Mesh(BOX, phoneGlowMat); s.scale.set(0.004, 0.13, 0.064); s.position.x = -0.017; g.add(s); p.phone = g; return g; }
// hand at the ear: right arm folded up so the phone sits by the head
function posePhone(p, t, ph) { p.arms[1].rotation.set(-0.35, 0, 0.62); p.elbows[1].rotation.set(-2.55, 0, 0); p.elbows[1].rotation.y = 0; }
// =================== BEDROOM (meters), night / dawn: bed, nightstand, the phone, a window onto the city ===================
const bed = new THREE.Scene(); bed.background = new THREE.Color('#0b1020');
const bCam = new THREE.PerspectiveCamera(50, W / H, 0.01, 200);
const bHemi = new THREE.HemisphereLight(0x8fa6e0, 0x2a2438, 0.55); bed.add(bHemi);
const moon = new THREE.DirectionalLight(0xa9bbff, 1.6); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 20 }); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.01; moon.shadow.radius = 4;
moon.position.set(1.6, 3.2, -4.0); moon.target.position.set(-0.3, 0.4, 0.3); bed.add(moon, moon.target);
const bFill = new THREE.DirectionalLight(0x8090c0, 0.35); bFill.position.set(-2, 2, 3); bed.add(bFill);
const screenLight = new THREE.PointLight(0xcfe0ff, 0, 2.2, 1.6); bed.add(screenLight);
const bedProps = {};
{
  const planks = canvasTex(512, 512, (g, w, h) => { for (let r = 0; r < 8; r++) { let x = (r % 2) * -90; while (x < w) { const L = R(120, 260); g.fillStyle = pick(['#8a6444', '#94704c', '#7d5a3e', '#8e6848']); g.fillRect(x, r * 64, L - 3, 61); x += L; } } }, [3, 3]);
  const floor = mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.6 }), false, true); floor.rotation.x = -Math.PI / 2; floor.position.set(-0.5, 0, 2.5); bed.add(floor);
  const og = mesh(new THREE.PlaneGeometry(80, 40), M('#1c1a28'), false, false); og.rotation.x = -Math.PI / 2; og.position.set(0, -4.2, -20); bed.add(og);
  const wallM = M('#7a86a8', { roughness: 0.95 }); bedProps.wallM = wallM;
  const wall = (w, h, x, y, z, ry) => { const m = mesh(new THREE.PlaneGeometry(w, h), wallM, false, true); m.position.set(x, y, z); m.rotation.y = ry; bed.add(m); return m; };
  const BZ = -0.5, WX0 = 0.45, WX1 = 1.45, WY0 = 0.85, WY1 = 2.15;
  wall(WX0 + 3.5, 2.6, (WX0 - 3.5) / 2, 1.3, BZ, 0); wall(3.5 - WX1, 2.6, (WX1 + 3.5) / 2, 1.3, BZ, 0); wall(WX1 - WX0, WY0, (WX0 + WX1) / 2, WY0 / 2, BZ, 0); wall(WX1 - WX0, 2.6 - WY1, (WX0 + WX1) / 2, (WY1 + 2.6) / 2, BZ, 0);
  wall(4, 2.6, 2.2, 1.3, 1.5, -Math.PI / 2); wall(4, 2.6, -3.2, 1.3, 1.5, Math.PI / 2);
  for (const [w, h, x, y] of [[WX1 - WX0 + 0.08, 0.06, (WX0 + WX1) / 2, WY0], [WX1 - WX0 + 0.08, 0.06, (WX0 + WX1) / 2, WY1], [0.06, WY1 - WY0, WX0, (WY0 + WY1) / 2], [0.06, WY1 - WY0, WX1, (WY0 + WY1) / 2], [0.04, WY1 - WY0, (WX0 + WX1) / 2, (WY0 + WY1) / 2]]) bx(w, h, 0.1, '#e8e6ee', x, y, BZ, bed);
  // curtains
  for (const sx of [WX0 - 0.16, WX1 + 0.16]) { const c = bx(0.3, 2.0, 0.06, '#3c4a78', sx, 1.35, BZ + 0.08, bed); }
  // outside: sky (night <-> dawn), skyline with lit windows, the moon
  const skyN = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1440'); gr.addColorStop(1, '#2a3a78'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) g.fillRect(R(0, w), R(0, h * 0.6), 1.5, 1.5); });
  const skyD = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a8ad0'); gr.addColorStop(0.55, '#f0a8a0'); gr.addColorStop(1, '#ffd08a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const skyM = new THREE.MeshBasicMaterial({ map: skyN, fog: false }); const sky = new THREE.Mesh(new THREE.PlaneGeometry(140, 30), skyM); sky.position.set(20, 7, -14); bed.add(sky); bedProps.skyM = skyM; bedProps.skyN = skyN; bedProps.skyD = skyD;
  const moonS = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.0) })); moonS.position.set(3.2, 6.4, -13.9); bed.add(moonS); bedProps.moonS = moonS;
  const sunS = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.0, 1.0) })); sunS.position.set(9.0, 1.4, -13.8); bed.add(sunS); bedProps.sunS = sunS;
  const winE = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 12) for (let x = 4; x < w; x += 10) if (rnd() < 0.3) { g.fillStyle = pick(['#ffd28a', '#ffc070', '#bcd4ff']); g.fillRect(x, y, 6, 7); } });
  bedProps.skyline = [];
  for (let i = 0; i < 18; i++) { const h = R(3, 7.5), w = R(1.2, 2.2); const mt = new THREE.MeshStandardMaterial({ color: '#1a2038', emissive: '#ffffff', emissiveMap: winE, emissiveIntensity: 1.0, roughness: 1 }); const b = mesh(BOX, mt, false, false); b.scale.set(w, h, 1); b.position.set(-6 + i * 2.1 + R(-0.4, 0.4), h / 2 - 4.5, -11 - R(0, 2)); bed.add(b); bedProps.skyline.push(mt); }
  // bed (you are lying in it): headboard against the back wall, mattress, blanket, pillows
  const bd = grp(-1.25, 0, 0.55, 0, bed);
  bx(1.7, 0.32, 2.15, '#5a4030', 0, 0.16, 0, bd); bx(1.66, 0.22, 2.08, '#e8e8f0', 0, 0.42, 0, bd); bx(1.8, 1.05, 0.08, '#5a4030', 0, 0.52, -1.08, bd);
  const blanket = bx(1.74, 0.12, 1.5, '#4a63a8', 0, 0.56, 0.32, bd); bedProps.blanket = blanket;
  bx(1.74, 0.13, 0.25, '#e6e9f4', 0, 0.565, -0.45, bd);
  for (const sx of [-0.42, 0.42]) { const p = bx(0.62, 0.14, 0.38, '#f2f2f8', sx, 0.6, -0.82, bd); p.rotation.x = -0.12; }
  // nightstand + lamp (off) + glass + book
  const ns = grp(0, 0, -0.27, 0, bed); bx(0.5, 0.56, 0.42, '#8a6040', 0, 0.28, 0, ns); bx(0.52, 0.03, 0.44, '#9a6c48', 0, 0.575, 0, ns); bx(0.44, 0.2, 0.01, '#7a5236', 0, 0.38, 0.215, ns);
  const knob = mesh(new THREE.SphereGeometry(0.015, 8, 6), M('#d8c090', { metalness: 0.7, roughness: 0.3 })); knob.position.set(0, 0.38, 0.23); ns.add(knob);
  const lampG = grp(-0.16, 0.59, -0.13, 0, ns); const lb = mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.03, 12), M('#d8d0c0')); lb.position.y = 0.015; lampG.add(lb);
  const lst = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6), M('#c8b890', { metalness: 0.6 })); lst.position.y = 0.15; lampG.add(lst);
  const shade = mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.13, 14, 1, true), M('#efe4cc', { side: THREE.DoubleSide })); shade.position.y = 0.3; lampG.add(shade);
  const glass = mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14), new THREE.MeshStandardMaterial({ color: '#cfe4ff', transparent: true, opacity: 0.45, roughness: 0.05 })); glass.position.set(0.19, 0.64, -0.03); ns.add(glass);
  
}
// the phone: body + screen (canvas, redrawn each frame) + a hand that taps it
const PH = { w: 0.0716, l: 0.147, sw: 0.066, sl: 0.141, pos: V3(0.03, 0.592, -0.24), yaw: Math.atan2(-0.8, 0.6) };
const phoneRoot = grp(PH.pos.x, PH.pos.y, PH.pos.z, PH.yaw, bed);
const phoneBody = new THREE.Group(); phoneRoot.add(phoneBody);
{ const shp = new THREE.Shape(); const w = PH.w / 2, l = PH.l / 2, r = 0.011; shp.moveTo(-w + r, -l); shp.lineTo(w - r, -l); shp.quadraticCurveTo(w, -l, w, -l + r); shp.lineTo(w, l - r); shp.quadraticCurveTo(w, l, w - r, l); shp.lineTo(-w + r, l); shp.quadraticCurveTo(-w, l, -w, l - r); shp.lineTo(-w, -l + r); shp.quadraticCurveTo(-w, -l, -w + r, -l);
  const g = new THREE.ExtrudeGeometry(shp, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 6 }); g.rotateX(Math.PI / 2); g.translate(0, 0.009, 0);
  const b = mesh(g, M('#1c1d22', { roughness: 0.35, metalness: 0.5 })); phoneBody.add(b); }
const scrCanvas = document.createElement('canvas'); scrCanvas.width = 540; scrCanvas.height = 1154; const scrG = scrCanvas.getContext('2d');
const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false });
const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(PH.sw, PH.sl), scrMat); scrMesh.rotation.x = -Math.PI / 2; scrMesh.position.y = 0.0101; phoneBody.add(scrMesh);
// hand (low-poly), index finger pointing along local -z; it comes from the camera side (+z of the phone)
const hand = new THREE.Group(); phoneRoot.add(hand);
{ const skin = M('#b9845f', { flatShading: true, roughness: 0.9 }); const sl = M('#3a4f86', { flatShading: true });
  const palm = mesh(new THREE.BoxGeometry(0.075, 0.024, 0.085), skin); palm.position.set(0, 0.03, 0.075); hand.add(palm);
  const fing = (x, len, curl) => { const f = mesh(new THREE.CapsuleGeometry(0.0085, len, 3, 6), skin); f.rotation.x = Math.PI / 2 - curl; f.position.set(x, 0.03 - Math.sin(curl) * len * 0.5, 0.032 - Math.cos(curl) * len * 0.5); hand.add(f); return f; };
  fing(-0.024, 0.06, 0.18); fing(-0.004, 0.03, 1.1); fing(0.015, 0.028, 1.15); fing(0.031, 0.024, 1.2);
  const th = mesh(new THREE.CapsuleGeometry(0.009, 0.035, 3, 6), skin); th.rotation.set(Math.PI / 2, 0, -0.9); th.position.set(-0.045, 0.025, 0.07); hand.add(th);
  const wrist = mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.06, 8), skin); wrist.rotation.x = Math.PI / 2; wrist.position.set(0, 0.035, 0.14); hand.add(wrist);
  const sleeve = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.4, 8), sl); sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0.04, 0.36); hand.add(sleeve);
  hand.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
// fingertip of the index finger in hand-local coords (for aiming taps)
const TIP = V3(-0.024, 0.03 - Math.sin(0.18) * 0.075, 0.032 - Math.cos(0.18) * 0.075 - 0.005);
const scrUV = (u, v) => V3((u - 0.5) * PH.sw, 0.0105, (v - 0.5) * PH.sl);
// =================== STREET (meters): the classic low-poly city street (copied from parts_rocket/r_city.js) ===================
const city = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.1, 5000);
city.fog = new THREE.Fog(new THREE.Color(0.6, 0.7, 0.85), 180, 2400);
const hemi = new THREE.HemisphereLight(0xbfd6f2, 0x5b4e40, 1.0); city.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0dc, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 600 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.02;
city.add(sunL, sunL.target);
const archL = new THREE.DirectionalLight(0xc8d8ff, 0); archL.position.set(0, 100, -10); city.add(archL, archL.target);

function box(w, h, d, mat, x, y, z, parent = city) { const m = mesh(BOX, typeof mat === 'string' ? M(mat) : mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }

// ---- ground: asphalt, sidewalks, markings
const XA = -600, XB = 1400;
const asphalt = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#55585e', '#41444a', '#5c5f64', '#3b3e43'], 3);
  for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(30,32,36,0.25)'; g.fillRect(R(0, w), R(0, h), R(40, 140), R(20, 80)); }
  g.strokeStyle = 'rgba(25,26,30,0.7)'; g.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) { let x = R(0, w), y = R(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += R(-22, 22); y += R(-22, 22); g.lineTo(x, y); } g.stroke(); }
}, [(XB - XA) / 18, 2]);
const ground = mesh(new THREE.PlaneGeometry(XB - XA, 14), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); ground.rotation.x = -Math.PI / 2; ground.position.set((XA + XB) / 2, 0, 0); city.add(ground);
const sideTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#b3b1ac', '#9f9d98', '#bab8b2'], 2);
  g.strokeStyle = 'rgba(70,70,70,0.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
}, [(XB - XA) / 4, 5 / 4]);
for (const s of [-1, 1]) {
  const sw = mesh(new THREE.BoxGeometry(XB - XA, 0.18, 5), M('#ffffff', { map: sideTex, roughness: 0.9 }), false, true); sw.position.set((XA + XB) / 2, 0.09, s * 9.5); city.add(sw);
  box(XB - XA, 0.2, 0.25, '#8f8d88', (XA + XB) / 2, 0.1, s * 7.05);
}
const far = mesh(new THREE.PlaneGeometry(9000, 9000), M('#6d6a62', { roughness: 1 }), false, true); far.rotation.x = -Math.PI / 2; far.position.y = -0.05; city.add(far);
// lane markings (instanced)
{
  const dash = [], dy = [];
  for (let x = XA; x < XB; x += 9) { dash.push([x, 3.5]); dash.push([x, -3.5]); }
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.15), M('#e8e6df', { roughness: 0.6 }), dash.length); const d = new THREE.Object3D();
  dash.forEach(([x, z], i) => { d.position.set(x, 0.02, z); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.receiveShadow = true; city.add(im);
  for (const z of [-0.14, 0.14]) { const l = mesh(new THREE.PlaneGeometry(XB - XA, 0.12), M('#e3b23c', { roughness: 0.6 }), false, true); l.rotation.x = -Math.PI / 2; l.position.set((XA + XB) / 2, 0.021, z); city.add(l); }
}
// cross streets
const CROSS = [-170, 30, 165, 300, 435, 570, 705, 840, 975, 1110];
const crossRoads = [];
for (const cx of CROSS) {
  const r = mesh(new THREE.PlaneGeometry(14, 2400), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); r.rotation.x = -Math.PI / 2; r.position.set(cx, 0.005, 0); city.add(r);
  // crosswalks
  for (const xs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(2.6, 0.5), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + xs * 8.6, 0.025, k * 1.05); city.add(s); }
  for (const zs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(0.5, 2.6), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + k * 1.05, 0.026, zs * 8.6); city.add(s); }
  crossRoads.push(cx);
}

// ---- facades
const WALLS = [
  { wall: '#c56d4c', band: '#e5c27a', trim: '#f0e2c4', brick: true }, { wall: '#d98c69', band: '#f2d8a8', trim: '#f6eedc', brick: false },
  { wall: '#9b4632', band: '#d8b88a', trim: '#e9dcc0', brick: true }, { wall: '#d9a73c', band: '#efd27c', trim: '#7a4a2a', brick: false },
  { wall: '#e3cfab', band: '#c9b48c', trim: '#ffffff', brick: false }, { wall: '#b85a40', band: '#e8cf92', trim: '#efe3c8', brick: true },
  { wall: '#a8b8a8', band: '#e8e2d0', trim: '#ffffff', brick: false }, { wall: '#cf7b5a', band: '#d9a73c', trim: '#f5e9cf', brick: true },
];
const SIGNS = ['#2a6b4f', '#b83a2e', '#1f3d6b', '#e0a81e', '#3a3a3a', '#6b2f5a', '#d46a2a', '#2f7a8a'];
const AWN = ['#2f7a4a', '#c43b2e', '#e2b13a', '#2b5f8a', '#d97a2a', '#3d8a7a'];
function facade(wM, hM, o, store = true) {
  const PPM = 9, cw = Math.ceil(wM * PPM), ch = Math.ceil(hM * PPM);
  const groundH = store ? 4.6 : 3.4, floorH = 3.35;
  const floors = Math.max(1, Math.floor((hM - groundH - 0.9) / floorH));
  const bays = Math.max(2, Math.round(wM / 3.3)), bw = cw / bays;
  const lit = [];
  const map = canvasTex(cw, ch, (g) => {
    g.fillStyle = o.wall; g.fillRect(0, 0, cw, ch);
    const base = new THREE.Color(o.wall);
    speckle(g, cw, ch, cw * ch / 14, ['#' + base.clone().offsetHSL(0, 0, 0.04).getHexString(), '#' + base.clone().offsetHSL(0, 0, -0.05).getHexString()], 2);
    if (o.brick) { g.strokeStyle = 'rgba(60,25,15,0.18)'; g.lineWidth = 1; for (let y = 0; y < ch; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); } }
    // cornice
    g.fillStyle = o.band; g.fillRect(0, 0, cw, PPM * 0.9); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, PPM * 0.9, cw, 3);
    const winStyle = rnd();
    for (let f = 0; f < floors; f++) {
      const y0 = ch - (groundH + (f + 1) * floorH) * PPM;
      if (o.bandEvery || winStyle < 0.35) { g.fillStyle = o.band; g.fillRect(0, y0 + floorH * PPM - 4, cw, 4); }
      for (let b = 0; b < bays; b++) {
        const ww = bw * (winStyle < 0.5 ? 0.5 : 0.62), wh = floorH * PPM * (winStyle < 0.5 ? 0.62 : 0.55);
        const x = b * bw + (bw - ww) / 2, y = y0 + floorH * PPM * 0.2;
        g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
        const gr = g.createLinearGradient(x, y, x + ww, y + wh); const sky = rnd();
        gr.addColorStop(0, sky < 0.3 ? '#9fb8cc' : '#44505c'); gr.addColorStop(1, sky < 0.3 ? '#5d7387' : '#262d35');
        g.fillStyle = gr; g.fillRect(x, y, ww, wh);
        if (rnd() < 0.55) { g.fillStyle = pick(['#d9cbb0', '#e8e0d0', '#b8a890', '#6d5a4a']); g.fillRect(x, y, ww, wh * R(0.2, 0.6)); } // curtains
        g.fillStyle = o.trim; g.fillRect(x + ww / 2 - 1, y, 2, wh); g.fillRect(x - 5, y + wh + 2, ww + 10, 4);
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, y, ww, 3); g.fillRect(x, y, 3, wh);
        if (rnd() < 0.3) lit.push([x, y, ww, wh]);
      }
    }
    if (store) {
      const y = ch - groundH * PPM;
      g.fillStyle = pick(SIGNS); g.fillRect(0, y, cw, PPM * 0.95);
      g.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = PPM; x < cw - PPM * 2; x += R(PPM * 1.2, PPM * 2.2)) if (rnd() < 0.7) g.fillRect(x, y + PPM * 0.3, R(PPM * 0.4, PPM * 1.1), PPM * 0.35);
      const gy = y + PPM * 0.95, gh = groundH * PPM - PPM * 0.95;
      g.fillStyle = '#3a3f3f'; g.fillRect(0, gy, cw, gh);
      const panes = Math.max(2, Math.round(wM / 2.4));
      for (let p = 0; p < panes; p++) {
        const x = p * cw / panes + 4, w = cw / panes - 8;
        const gr = g.createLinearGradient(x, gy, x + w * 0.6, gy + gh); gr.addColorStop(0, '#7f9a9e'); gr.addColorStop(0.5, '#3c4c50'); gr.addColorStop(1, '#2a3436');
        g.fillStyle = gr; g.fillRect(x, gy + 4, w, gh - 10);
        if (rnd() < 0.5) { g.fillStyle = pick(['#c8a070', '#8fb0a0', '#d0c0a0', '#a07060']); g.fillRect(x + 4, gy + gh * 0.55, w - 8, gh * 0.3); }
      }
      g.fillStyle = '#c9c2b5'; g.fillRect(0, ch - 5, cw, 5);
    } else {
      for (let b = 0; b < bays; b++) { const ww = bw * 0.5, wh = groundH * PPM * 0.5, x = b * bw + (bw - ww) / 2, y = ch - groundH * PPM * 0.8; g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6); g.fillStyle = '#39434c'; g.fillRect(x, y, ww, wh); }
    }
  });
  const emi = canvasTex(cw, ch, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
    for (const [x, y, ww, wh] of lit) { g.fillStyle = pick(['#ffd28a', '#ffc070', '#ffe0a8', '#f0b060']); g.fillRect(x, y, ww, wh); }
    if (store) { g.fillStyle = '#ffcf8a'; g.fillRect(0, ch - groundH * PPM + PPM * 0.95 + 4, cw, groundH * PPM - PPM * 0.95 - 12); g.fillStyle = '#ffffff'; g.fillRect(0, ch - groundH * PPM + PPM * 0.3, cw, PPM * 0.35); }
  });
  return { map, emi };
}
const winMats = [];
function wallMat(tex) { const m = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.88 }); winMats.push(m); return m; }
const roofMat = M('#77736c', { roughness: 1 });
const sharedFacades = WALLS.map(o => ({ o, side: facade(16, 30, o, false) }));
const buildings = [];
function building(x0, x1, side, h, o, unique) {
  const w = x1 - x0, d = R(14, 22), x = (x0 + x1) / 2, z = side * (12 + d / 2);
  const front = unique ? facade(w, h, o, true) : null;
  const sh = sharedFacades.find(s => s.o === o) || sharedFacades[0];
  const sideMat = wallMat(sh.side); sideMat.map = sh.side.map.clone(); sideMat.map.needsUpdate = true; sideMat.map.wrapS = sideMat.map.wrapT = THREE.RepeatWrapping; sideMat.map.repeat.set(d / 16, h / 30);
  sideMat.emissiveMap = sh.side.emi.clone(); sideMat.emissiveMap.needsUpdate = true; sideMat.emissiveMap.wrapS = sideMat.emissiveMap.wrapT = THREE.RepeatWrapping; sideMat.emissiveMap.repeat.copy(sideMat.map.repeat);
  const frontMat = front ? wallMat(front) : sideMat;
  const mats = [sideMat, sideMat, roofMat, roofMat, side < 0 ? frontMat : sideMat, side > 0 ? frontMat : sideMat];
  const b = mesh(BOX, mats); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  // cornice + parapet
  box(w + 0.6, 0.7, d + 0.6, M(o.band), x, h - 0.35, z);
  box(w, 0.9, 0.3, M(o.band), x, h + 0.45, z - side * (d / 2 - 0.15));
  if (rnd() < 0.6) { const ty = h + 0.9; const tank = new THREE.Group(); tank.position.set(x + R(-w / 4, w / 4), ty, z + R(-d / 5, d / 5)); city.add(tank);
    const tk = mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 12), M('#8a6a4a')); tk.position.y = 3.6; tank.add(tk); const cone = mesh(new THREE.ConeGeometry(1.6, 1.2, 12), M('#5c4a38')); cone.position.y = 5.7; tank.add(cone);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 5), M('#3a3a3a')); l.position.set(lx, 1.05, lz); tank.add(l); } }
  for (let k = 0; k < 3; k++) box(R(1.5, 3), R(1, 2), R(1.5, 3), '#9a968e', x + R(-w / 3, w / 3), h + 0.7, z + R(-d / 3, d / 3));
  // awning
  if (unique && rnd() < 0.8) {
    const ac = pick(AWN); const aw = mesh(BOX, M(ac)); aw.scale.set(w * R(0.6, 0.95), 0.12, 2.2); aw.position.set(x, 3.85, side * (12 - 1.0)); aw.rotation.x = side * 0.28; aw.castShadow = true; city.add(aw);
    box(w * R(0.6, 0.9), 0.5, 0.06, M(ac), x, 3.5, side * (12 - 2.05));
  }
  buildings.push({ x, z, w, d, h, side });
  return b;
}
for (const side of [-1, 1]) {
  for (let bi = 0; bi < CROSS.length - 1; bi++) {
    const a = CROSS[bi] + 7, bEnd = CROSS[bi + 1] - 7;
    let x = a;
    while (x < bEnd - 6) {
      const w = Math.min(bEnd - x, R(13, 26)); const near = x < 420 && x > -120;
      const h = rnd() < 0.15 ? R(38, 52) : R(16, 34);
      building(x, x + w, side, h, pick(WALLS), near);
      x += w;
    }
  }
}
// second row + glass towers
function glassTex() {
  return canvasTex(128, 512, (g, w, h) => {
    const base = pick(['#5f7f99', '#6f8ea6', '#4f6a80', '#7d97a8', '#56707a']);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const c = new THREE.Color(base).offsetHSL(R(-0.01, 0.01), 0, R(-0.12, 0.14)); g.fillStyle = '#' + c.getHexString(); g.fillRect(x, y, 7, 7); }
    g.fillStyle = 'rgba(20,30,40,0.5)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y + 7, w, 1);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
const glassPool = [0, 1, 2, 3, 4].map(() => { const map = glassTex(); const emi = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (rnd() < 0.22) { g.fillStyle = pick(['#ffd28a', '#fff0d0', '#ffc070']); g.fillRect(x, y, 7, 7); } }); return { map, emi }; });
function tower(x, z, w, d, h) {
  const t = pick(glassPool); const mp = t.map.clone(); mp.needsUpdate = true; mp.wrapS = mp.wrapT = THREE.RepeatWrapping; mp.repeat.set(w / 30, h / 120);
  const em = t.emi.clone(); em.needsUpdate = true; em.wrapS = em.wrapT = THREE.RepeatWrapping; em.repeat.copy(mp.repeat);
  const m = new THREE.MeshStandardMaterial({ map: mp, emissiveMap: em, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.35, metalness: 0.25 }); winMats.push(m);
  const b = mesh(BOX, [m, m, roofMat, roofMat, m, m]); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  box(w * 0.7, 3, d * 0.7, '#8d9aa3', x, h + 1.5, z);
}
for (const side of [-1, 1]) for (let x = -200; x < 1300; x += R(22, 40)) {
  const z = side * R(48, 70), h = R(28, 60); const o = pick(WALLS); const tex = pick(sharedFacades).side;
  const m = wallMat(tex); m.map = tex.map.clone(); m.map.needsUpdate = true; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(1.4, h / 30);
  m.emissiveMap = tex.emi.clone(); m.emissiveMap.needsUpdate = true; m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping; m.emissiveMap.repeat.copy(m.map.repeat);
  const b = mesh(BOX, m); b.scale.set(R(18, 30), h, R(16, 26)); b.position.set(x, h / 2, z); city.add(b); box(b.scale.x + 0.5, 0.8, b.scale.z + 0.5, M(o.band), x, h, z);
}
for (let i = 0; i < 46; i++) { const side = rnd() < 0.5 ? -1 : 1; tower(R(120, 1500), side * R(30, 260), R(22, 40), R(22, 40), R(70, 210)); }
for (let i = 0; i < 160; i++) { const side = rnd() < 0.5 ? -1 : 1; const h = R(20, 90); box(R(20, 50), h, R(20, 50), pick(['#a99b8a', '#8f8a84', '#b49a80', '#9aa3aa', '#c2b49c']), R(-300, 2600), h / 2, side * R(80, 900)); }

// ---- street props
const poleMat = M('#3b3e42', { roughness: 0.6, metalness: 0.3 });
function streetLamp(x, z, side) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 6), poleMat); p.position.y = 3.5; g.add(p);
  const arm = mesh(BOX, poleMat); arm.scale.set(0.1, 0.1, 1.6); arm.position.set(0, 6.9, -side * 0.8); g.add(arm);
  const head = mesh(BOX, new THREE.MeshStandardMaterial({ color: '#d8d4c8', emissive: '#ffd9a0', emissiveIntensity: 0 })); head.scale.set(0.35, 0.15, 0.6); head.position.set(0, 6.8, -side * 1.5); g.add(head); lampHeads.push(head.material);
}
const lampHeads = [];
const TL_STATE = [];
function trafficLight(x, z, side, armLen) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.12, 0.15, 6.4, 8), M('#2c2e31', { roughness: 0.5, metalness: 0.4 })); p.position.y = 3.2; g.add(p);
  const arm = mesh(BOX, M('#2c2e31')); arm.scale.set(0.14, 0.14, armLen); arm.position.set(0, 6.1, -side * armLen / 2); g.add(arm);
  for (const zz of [-side * armLen * 0.55, -side * armLen * 0.95, -side * 0.3]) {
    const hgrp = new THREE.Group(); hgrp.position.set(0, zz === -side * 0.3 ? 3.4 : 5.4, zz); g.add(hgrp);
    const housing = mesh(BOX, M('#1d1f22')); housing.scale.set(0.42, 1.25, 0.42); hgrp.add(housing);
    const back = mesh(BOX, M('#e0b52a')); back.scale.set(0.08, 1.45, 0.62); back.position.x = 0.24; hgrp.add(back);
    ['#ff3a2a', '#ffb22a', '#3aff7a'].forEach((c, i) => { const l = mesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshStandardMaterial({ color: '#202020', emissive: c, emissiveIntensity: 0 }), false, false); l.position.set(-0.22, 0.38 - i * 0.38, 0); l.rotation.y = -Math.PI / 2; hgrp.add(l); TL_STATE.push({ m: l.material, i }); });
  }
}
// palm tree
const leafTex = canvasTex(256, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let x = 6; x < w - 6; x += 3) { const L = (1 - x / w) * 26 + 6; for (const s of [-1, 1]) { g.strokeStyle = `rgba(${40 + R(0, 25) | 0},${105 + R(0, 40) | 0},${40 + R(0, 20) | 0},1)`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + L * 0.45, h / 2 + s * L); g.stroke(); } }
  g.strokeStyle = '#5b6b2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
});
const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
const trunkTex = canvasTex(32, 128, (g, w, h) => { g.fillStyle = '#7a6248'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = '#5e4a36'; g.fillRect(0, y, w, 2); g.fillStyle = '#8e7656'; g.fillRect(0, y + 3, w, 2); } }, [1, 6]);
const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex, roughness: 0.95 });
const palms = [];
function palm(x, z, h) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const lean = new THREE.Vector3(R(-1, 1), 0, R(-1, 1)).normalize().multiplyScalar(R(0.4, 1.4));
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(lean.x * u * u, u * h, lean.z * u * u)); }
  const trunk = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.22, 7, false), trunkMat); g.add(trunk);
  const top = pts[8]; const fr = []; const n = 10;
  for (let k = 0; k < n; k++) {
    const L = R(3.6, 4.6); const pg = new THREE.PlaneGeometry(L, 1.7, 10, 1); pg.translate(L / 2, 0, 0); pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position; const droop = R(0.12, 0.2);
    for (let i = 0; i < pa.count; i++) { const xx = pa.getX(i), zz = pa.getZ(i); pa.setY(i, -droop * xx * xx + 0.15 * xx - Math.abs(zz) * 0.35); }
    pg.rotateX(R(-0.3, 0.3)); pg.rotateZ(R(0.05, 0.35)); pg.rotateY(k / n * Math.PI * 2 + R(-0.2, 0.2)); pg.translate(top.x, top.y, top.z); fr.push(pg);
  }
  const fronds = mesh(mergeGeometries(fr), leafMat); g.add(fronds);
  palms.push({ g, fronds, ph: R(0, 6) });
}
// cars
const CAR_COLS = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#e8b923', '#6d7a83', '#3d6b4a', '#8a8f96', '#f0f0ee'];
const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); wheelGeo.rotateX(Math.PI / 2);
const cars = [];
function car(lane, dir, x0, speed) {
  const g = new THREE.Group(); const taxi = rnd() < 0.2; const c = taxi ? '#f2c12e' : pick(CAR_COLS); const big = rnd() < 0.25;
  const L = big ? 4.8 : 4.3, Hh = big ? 0.85 : 0.72;
  box(L, Hh, 1.85, M(c, { roughness: 0.35, metalness: 0.3 }), 0, 0.33 + Hh / 2, 0, g);
  box(L * 0.55, 0.62, 1.68, M(c, { roughness: 0.35, metalness: 0.3 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.53, 0.5, 1.72, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.57, 0.5, 1.6, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, 0.6, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, -0.6, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, 0.62, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, -0.62, g);
  if (taxi) box(0.6, 0.2, 0.3, '#fff6d8', -0.15, 0.33 + Hh + 0.7, 0, g);
  for (const wx of [-L * 0.32, L * 0.32]) for (const wz of [-0.85, 0.85]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, 0.34, wz); g.add(w); }
  g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g);
  cars.push({ g, lane, dir, x0, speed });
}
// people
const people = [];
const jumpers = [];
function person(o) {
  const p = makePerson(rnd); city.add(p.outer); const P = { p, ...o, ph: R(0, 6) }; people.push(P); return P;
}

// ---- populate props
for (const side of [-1, 1]) for (let x = -160; x < 1300; x += 30) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; streetLamp(x, side * 7.6, side); }
for (const side of [-1, 1]) for (let x = -150; x < 1300; x += R(11, 16)) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; if (side < 0 && x > 37 && x < 62) continue; palm(x, side * R(8.0, 8.5), R(7.5, 11.5)); }
for (const cx of [30, 165, 300]) { trafficLight(cx - 8.2, -8.0, -1, 7.5); trafficLight(cx + 8.2, 8.0, 1, 7.5); }
for (let i = 0; i < 46; i++) { const dir = rnd() < 0.5 ? 1 : -1; const lane = dir > 0 ? pick([-1.75, -5.25]) : pick([1.75, 5.25]); car(lane, dir, R(-200, 700), R(8, 13)); }
for (let i = 0; i < 18; i++) { const side = rnd() < 0.5 ? -1 : 1; const g = new THREE.Group(); city.add(g); const dirZ = side; cars.push({ g, cross: true }); g.visible = false; }
// parked/benches/bins
for (const side of [-1, 1]) for (let x = -140; x < 600; x += R(18, 34)) {
  if (CROSS.some(c => Math.abs(x - c) < 12)) continue;
  if (rnd() < 0.5) { const b = new THREE.Group(); b.position.set(x, 0.18, side * 10.9); b.rotation.y = side > 0 ? Math.PI : 0; city.add(b); box(1.8, 0.08, 0.5, '#7a5233', 0, 0.45, 0, b); box(1.8, 0.45, 0.06, '#7a5233', 0, 0.75, -0.25, b); for (const sx of [-0.8, 0.8]) box(0.06, 0.45, 0.45, '#2b2b2b', sx, 0.22, 0, b); }
  else { const bin = mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 10), M('#2f4a3a')); bin.position.set(x, 0.63, side * 7.9); city.add(bin); }
}
// pedestrians on sidewalks
for (let i = 0; i < 120; i++) {
  const side = rnd() < 0.5 ? -1 : 1; const walking = rnd() < 0.8;
  person({ kind: walking ? 'walk' : 'idle', z: side * R(8.9, 11.4), x0: R(-60, 260), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.55), rotIdle: R(0, 6) });
}
// crossing pedestrians
for (let i = 0; i < 26; i++) { const xs = pick([30 - 8.6, 30 + 8.6, 165 - 8.6]); person({ kind: 'cross', x: xs + R(-1, 1), z0: R(-11, 11), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.5) }); }
// jumpers (gravity shot) on the corner past the cross street
const JUMP = { g: 0.29 * 9.81, v0: Math.sqrt(2 * 9.81 * 0.5) };   // 0.5 m jump on Earth -> 1.72 m here, 2.2 s in the air
for (let i = 0; i < 9; i++) { const P = person({ kind: 'jump', x: 41 + (i % 5) * 2.2 + R(-0.5, 0.5), z: -8.4 - Math.floor(i / 5) * 2.2 + R(-0.3, 0.3), off: i * 0.37 + R(0, 0.2), rot: R(-2.5, -0.6) }); jumpers.push(P); }
const ball = mesh(new THREE.SphereGeometry(0.12, 12, 10), M('#d9662a', { roughness: 0.6 })); city.add(ball);

// clouds (sprites)
const cloudTex = canvasTex(256, 128, (g, w, h) => {
  for (let i = 0; i < 26; i++) { const x = R(40, w - 40), y = R(50, h - 30), r = R(18, 42); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(250,250,252,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
});
const clouds = [];
for (let i = 0; i < 22; i++) {
  const m = new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, color: '#ffffff', opacity: 0.9 }); const s = new THREE.Sprite(m);
  const ang = R(-0.9, 0.9) + (rnd() < 0.7 ? 0 : Math.PI); const dist = R(2600, 4400);
  s.position.set(Math.cos(ang) * dist, R(250, 520), Math.sin(ang) * dist); const sc = R(1300, 2400); s.scale.set(sc, sc * 0.38, 1);
  city.add(s); clouds.push(s);
}


const hzC = new THREE.Color();

// sky dome + street update (cars drive, people walk, pigeons) and a night switch
const cityDome = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color('#3d7fd0') }, uBot: { value: new THREE.Color('#cfe3f4') } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uTop, uBot; varying vec3 vD; void main(){ float e=max(vD.y,0.0); gl_FragColor=vec4(mix(uBot,uTop,pow(e,0.6)),1.0); }' }));
city.add(cityDome);
const pigeons = [];
for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const bm = M('#7d8088', { flatShading: true });
  const b = mesh(new THREE.SphereGeometry(0.11, 10, 8), bm); b.scale.set(1, 0.85, 1.5); g.add(b); const hd = mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#5a6070', { flatShading: true })); hd.position.set(0, 0.09, -0.13); g.add(hd);
  const bk = mesh(new THREE.ConeGeometry(0.015, 0.04, 6), M('#e0a040')); bk.rotation.x = -Math.PI / 2; bk.position.set(0, 0.085, -0.2); g.add(bk);
  const wings = [-1, 1].map(s => { const w = mesh(new THREE.BoxGeometry(0.22, 0.01, 0.14), bm); w.geometry.translate(0.11 * s, 0, 0); w.position.set(0.04 * s, 0.04, 0); g.add(w); return w; });
  city.add(g); pigeons.push({ g, wings, x: R(38, 44), z: R(9.8, 11.3), ph: R(0, 6), vx: R(-1, 1), vy: R(2, 3.5), vz: R(-1.5, 1.5) }); }
function updateStreet(t, nightMode) {
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * t, -220, 760); c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.visible = true; }
  for (const P of people) { const o = P.p.outer; if (P.kind === 'jump') { o.visible = false; continue; } let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; } else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; } else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    o.position.set(x, (Math.abs(z) > 7 ? 0.18 : 0) + 0.95, z); o.rotation.set(0, ry, 0); if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph); o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 1.2; }
  const fly = -1;
  for (const S of pigeons) { const k = Math.max(0, fly - S.ph * 0.05); S.g.position.set(S.x + S.vx * k, 0.2 + (k > 0 ? S.vy * k + 0.6 * k * k : 0) + (k <= 0 ? Math.max(0, Math.sin(t * 5 + S.ph)) * 0.03 : 0), S.z + S.vz * k);
    S.g.rotation.set(k > 0 ? -0.3 : Math.max(0, Math.sin(t * 5 + S.ph)) * 0.5, S.ph, 0); const f = k > 0 ? Math.sin(t * 30 + S.ph) * 0.9 : -0.05; S.wings[0].rotation.z = f; S.wings[1].rotation.z = -f; S.g.visible = false; }
  for (const p of palms) p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph);
  const n = nightMode ? 1 : 0;
  sunL.intensity = lerp(3.0, 0.5, n); sunL.color.set(n ? '#9fb4ff' : '#fff0dc'); hemi.intensity = lerp(1.0, 0.45, n); hemi.color.set(n ? '#6f86c8' : '#bfd6f2'); sunL.position.copy(cam.position).add(new THREE.Vector3(-60, 120, 50)); sunL.target.position.copy(cam.position).add(new THREE.Vector3(10, 0, 0)); sunL.target.updateMatrixWorld();
  for (const m of winMats) m.emissiveIntensity = lerp(0.15, 0.9, n); for (const m of lampHeads) m.emissiveIntensity = lerp(0, 3.0, n);
  cityDome.material.uniforms.uTop.value.set(n ? '#04060f' : '#3d7fd0'); cityDome.material.uniforms.uBot.value.set(n ? '#151a2a' : '#cfe3f4');
  city.fog.color.set(n ? '#0c1020' : '#cfe3f4'); city.fog.near = 120; city.fog.far = 1600;
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
}
// =================== phones lighting up behind the windows + everyone on the phone ===================
const glowMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  uniforms: { uT: { value: 0 }, uAmt: { value: 0 } },
  vertexShader: `attribute float aPh; varying vec2 vUv; varying float vPh; void main(){ vUv=uv; vPh=aPh; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform float uT, uAmt; varying vec2 vUv; varying float vPh;
    void main(){ if(vPh>uAmt) discard; float cyc=fract(uT*0.45+vPh*17.0); float on=smoothstep(0.0,0.04,cyc)*(1.0-smoothstep(0.55,0.62,cyc));
      vec2 q=vUv-0.5; float d=length(q); float core=1.0-smoothstep(0.05,0.065,max(abs(q.x)*1.5,abs(q.y)));
      float halo=exp(-d*d*30.0)*0.9+exp(-d*d*120.0); float pulse=0.8+0.2*sin(uT*14.0+vPh*40.0);
      gl_FragColor=vec4((vec3(0.75,0.88,1.0)*core*2.0+vec3(0.25,0.5,1.0)*halo)*on*pulse, 1.0); }` });
const glowSlots = [];
for (const b of buildings) { if (b.x < -80 || b.x > 520) continue; const floors = Math.max(1, Math.floor((b.h - 4.6 - 0.9) / 3.35)); const bays = Math.max(2, Math.round(b.w / 3.3)), bw = b.w / bays;
  for (let f = 0; f < floors; f++) for (let k = 0; k < bays; k++) if (rnd() < 0.55) glowSlots.push([b.x - b.w / 2 + (k + 0.5) * bw, 6.1 + f * 3.35, b.side * 11.93, b.side]); }
const glowIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.0, 4.0), glowMat, glowSlots.length);
{ const d = new THREE.Object3D(); const ph = new Float32Array(glowSlots.length);
  glowSlots.forEach(([x, y, z, s], i) => { d.position.set(x + R(-0.3, 0.3), y + R(-0.3, 0.2), z); d.rotation.set(0, s > 0 ? Math.PI : 0, 0); d.updateMatrix(); glowIM.setMatrixAt(i, d.matrix); ph[i] = rnd(); });
  glowIM.geometry.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); glowIM.frustumCulled = false; city.add(glowIM); }
// every pedestrian gets a phone (shown only when everyone answers)
for (const P of people) givePhone(P.p);
function updateCalls(t, mode) {
  for (const c of clouds) c.material.color.set('#262c40');
  glowIM.visible = mode === 'city' || mode === 'street'; glowMat.uniforms.uT.value = t;
  glowMat.uniforms.uAmt.value = mode === 'city' ? lerp(0.08, 1.0, smooth(CITY, MAP - 0.8, t)) : 0.9;
  for (const P of people) { P.p.phone.visible = mode === 'street'; if (mode === 'street' && P.p.outer.visible) posePhone(P.p, t, P.ph); else { P.p.arms[1].rotation.set(P.p.arms[1].rotation.x, 0, -0.08); P.p.elbows[1].rotation.y = 0; } }
}
const camLight = new THREE.PointLight(0xffe2c0, 0, 30, 1.2); city.add(camLight);
// extra people standing on the near sidewalk, answering
for (let i = 0; i < 34; i++) { const side = i % 3 === 0 ? 1 : -1; person({ kind: 'idle', z: side * R(8.7, 11.3), x0: R(22, 70), v: 0, rotIdle: R(0, 6) }); givePhone(people[people.length - 1].p); }
// =================== US MAP (Albers USA units, 975 x 610): spam calls flashing, then the 93,447 missing ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#070b16');
const mapCam = new THREE.PerspectiveCamera(36, W / H, 1, 6000);
const STATES = { Alabama: [5.0, 50.6], Alaska: [0.73, 571], Arizona: [7.2, 113.6], Arkansas: [3.0, 52.0], California: [39.5, 155.8], Colorado: [5.8, 103.6], Connecticut: [3.6, 4.8], Delaware: [1.0, 1.9], 'District of Columbia': [0.69, 0.06], Florida: [21.5, 53.6], Georgia: [10.7, 57.5], Hawaii: [1.46, 6.4], Idaho: [1.8, 82.6], Illinois: [12.8, 55.5], Indiana: [6.8, 35.8], Iowa: [3.2, 55.9], Kansas: [2.9, 81.8], Kentucky: [4.5, 39.5], Louisiana: [4.7, 43.2], Maine: [1.4, 30.8], Maryland: [6.2, 9.7], Massachusetts: [7.0, 7.8], Michigan: [10.1, 56.5], Minnesota: [5.7, 79.6], Mississippi: [3.0, 46.9], Missouri: [6.2, 68.7], Montana: [1.1, 145.5], Nebraska: [2.0, 76.8], Nevada: [3.1, 109.8], 'New Hampshire': [1.4, 8.95], 'New Jersey': [9.3, 7.4], 'New Mexico': [2.1, 121.3], 'New York': [20.2, 47.1], 'North Carolina': [10.4, 48.6], 'North Dakota': [0.78, 69.0], Ohio: [11.8, 40.9], Oklahoma: [4.0, 68.6], Oregon: [4.2, 95.9], Pennsylvania: [13.0, 44.7], 'Rhode Island': [1.1, 1.0], 'South Carolina': [5.1, 30.1], 'South Dakota': [0.89, 75.8], Tennessee: [6.9, 41.2], Texas: [29.1, 261.2], Utah: [3.3, 82.2], Vermont: [0.64, 9.2], Virginia: [8.6, 39.5], Washington: [7.7, 66.5], 'West Virginia': [1.8, 24.0], Wisconsin: [5.9, 54.2], Wyoming: [0.58, 97.1] };
mapScene.add(new THREE.HemisphereLight(0x9fb0e0, 0x101020, 1.1));
const mapKey = new THREE.DirectionalLight(0xc8d4ff, 1.6); mapKey.position.set(-300, 900, 700); mapScene.add(mapKey);
const MW = 975, MH = 610, MAPY = 10.4;
let callPts, missPts, mapPerson, mapRings = [], FOCUS = V3(0, MAPY, 0);
const ptsVS = `attribute float aPh; attribute float aSz; uniform float uT, uScale, uMax; varying float vPh; void main(){ vPh=aPh; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(aSz*uScale/(-mv.z),uMax); gl_Position=projectionMatrix*mv; }`;
const callMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uAmt: { value: 0 }, uScale: { value: 1 }, uMax: { value: 60 } }, vertexShader: ptsVS,
  fragmentShader: `uniform float uT, uAmt; varying float vPh; void main(){ if(vPh>uAmt) discard; float cyc=fract(uT/1.3+vPh*31.0); float k=exp(-cyc*6.0)*smoothstep(0.0,0.03,cyc);
    vec2 q=gl_PointCoord-0.5; float d=length(q)*2.0; float a=(exp(-d*d*6.0)+0.6*exp(-d*d*40.0))*k; if(a<0.01) discard; gl_FragColor=vec4(vec3(0.45,0.75,1.0)*a*1.4,1.0); }` });
const missMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uAmt: { value: 0 }, uScale: { value: 1 }, uMax: { value: 14 }, uPulse: { value: 0 } }, vertexShader: ptsVS,
  fragmentShader: `uniform float uT, uAmt, uPulse; varying float vPh; void main(){ if(vPh>uAmt) discard; float cyc=fract(uT*0.9+vPh*53.0); float k=0.55+uPulse*1.2*exp(-cyc*5.0);
    vec2 q=gl_PointCoord-0.5; float d=length(q)*2.0; float a=exp(-d*d*7.0)*k*0.7; if(a<0.01) discard; gl_FragColor=vec4(vec3(1.0,0.78,0.45)*a,1.0); }` });
async function buildMap() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii'].includes(g.properties.name));
  const info = await (await fetch('zmap.json')).json();
  const merged = topojson.merge(topo, L48); const shapes = [];
  for (const poly of merged.coordinates) { const outer = poly[0]; if (outer.length < 8) continue;
    const sh = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2)))); for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))))); shapes.push(sh); }
  const slabGeo = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 }); slabGeo.rotateX(-Math.PI / 2);
  const slab = new THREE.Mesh(slabGeo, [new THREE.MeshStandardMaterial({ color: '#24345e', roughness: 0.9, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#111a33', roughness: 1 })]); mapScene.add(slab);
  const bm = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b);
  const lp = []; for (const line of bm.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; lp.push(a[0] - MW / 2, 10.2, a[1] - MH / 2, b[0] - MW / 2, 10.2, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  mapScene.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#7f8fc0', transparent: true, opacity: 0.55 })));
  // per-state raster (colour = state index) -> population-weighted sampling, metros for clustering
  const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const feats = topojson.feature(topo, { type: 'GeometryCollection', geometries: L48 }).features;
  feats.forEach((f, i) => { g.fillStyle = `rgb(${i + 1},0,0)`; g.beginPath(); const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of polys) for (const ring of p) { ring.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); } g.fill('evenodd'); });
  const px = g.getImageData(0, 0, MW, MH).data; const cells = feats.map(() => []);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const i = (y * MW + x) * 4; if (px[i + 3] > 250 && px[i + 1] === 0) { const s = px[i] - 1; if (cells[s]) cells[s].push(x, y); } }
  const land = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= MW || y >= MH) return false; const i = (y * MW + x) * 4; return px[i + 3] > 128; };
  const sw = feats.map(f => (STATES[f.properties.name] || [0.5])[0]); const swT = sw.reduce((a, b) => a + b, 0);
  const metros = info.metros.filter(m => !['Honolulu', 'Anchorage'].includes(m.n)); const mT = metros.reduce((a, m) => a + m.pop, 0);
  const sample = () => { for (let tries = 0; tries < 30; tries++) {
      if (rnd() < 0.5) { let r = rnd() * mT, m = metros[0]; for (const mm of metros) { r -= mm.pop; if (r <= 0) { m = mm; break; } } const s = 2 + 2.6 * Math.sqrt(m.pop); const a = rnd() * 6.283, rr = s * Math.sqrt(-2 * Math.log(1 - rnd() * 0.999)); const x = m.x * 2 + Math.cos(a) * rr, y = m.y * 2 + Math.sin(a) * rr; if (land(x, y)) return [x, y]; }
      else { let r = rnd() * swT, s = 0; for (; s < sw.length - 1; s++) { r -= sw[s]; if (r <= 0) break; } const c = cells[s]; if (!c.length) continue; const k = Math.floor(rnd() * c.length / 2) * 2; return [c[k] + rnd(), c[k + 1] + rnd()]; } }
    return [MW / 2, MH / 2]; };
  const mkPts = (n, mat, szA, szB) => { const pos = new Float32Array(n * 3), ph = new Float32Array(n), sz = new Float32Array(n);
    for (let i = 0; i < n; i++) { const [x, y] = sample(); pos[i * 3] = x - MW / 2; pos[i * 3 + 1] = MAPY; pos[i * 3 + 2] = y - MH / 2; ph[i] = rnd(); sz[i] = R(szA, szB); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); geo.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; mapScene.add(p); return p; };
  callPts = mkPts(12000, callMat, 14, 28);
  missPts = mkPts(93447, missMat, 3, 5);
  // the zoom target: one dot near St. Louis
  const stl = metros.find(m => m.n === 'St. Louis') || metros[10]; FOCUS = V3(stl.x * 2 - MW / 2 + 6, MAPY, stl.y * 2 - MH / 2 + 3);
  mapPerson = makePerson(rnd, { top: '#e8b04a', bottom: '#2a3a5c', skin: '#d7a47e', dress: false }); givePhone(mapPerson); posePhone(mapPerson, 0, 0);
  mapPerson.outer.scale.setScalar(1.6); mapPerson.outer.position.copy(FOCUS).add(V3(0, 0.95 * 1.6, 0)); mapPerson.outer.rotation.y = 0.5; mapScene.add(mapPerson.outer);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.copy(FOCUS).add(V3(0, 0.05, 0)); mapScene.add(r); mapRings.push(r); }
  const spot = new THREE.PointLight(0xffe0b0, 40, 30, 1.5); spot.position.copy(FOCUS).add(V3(2, 6, 4)); mapScene.add(spot);
}
function updateMap(t) {
  callMat.uniforms.uT.value = t; missMat.uniforms.uT.value = t;
  callMat.uniforms.uAmt.value = lerp(0.05, 1, smooth(MAP, MAP + 2.5, t)) * (1 - smooth(DIVIDE, DIVIDE + 1.0, t));
  missMat.uniforms.uAmt.value = smooth(DIVIDE + 0.6, DIVIDE + 3.5, t); missMat.uniforms.uPulse.value = smooth(DIVIDE + 4.8, DIVIDE + 5.6, t);
  const sc = H / (2 * Math.tan(mapCam.fov * Math.PI / 360)); callMat.uniforms.uScale.value = sc; missMat.uniforms.uScale.value = sc;
  mapRings.forEach((r, i) => { const k = ((t - (DIVIDE + 5)) * 1.1 + i / 4) % 1; const on = t > DIVIDE + 5; r.scale.setScalar(0.6 + k * 9); r.material.opacity = on ? 0.8 * (1 - k) : 0; });
  if (mapPerson) { const lean = Math.sin(t * 1.4) * 0.04; mapPerson.root.rotation.z = lean; }
}
function mapCamera(t) {
  const whole = V3(0, 0, 25), WH = 2550, WZ = 1450; let pos, look, fov = 36;
  if (t < DIVIDE + 4.6) { const u = clamp((t - MAP) / (DIVIDE + 4.6 - MAP), 0, 1); look = whole.clone(); pos = V3(lerp(-120, 80, u), lerp(WH * 1.04, WH * 0.96, u), WZ + 25); }
  else { const u = ease((t - (DIVIDE + 4.6)) / 3.0); const h = Math.exp(lerp(Math.log(WH * 0.96), Math.log(7), u)); look = whole.clone().lerp(FOCUS.clone().add(V3(-1.0, -0.4, 0)), 1 - (h - 7) / (WH * 0.96 - 7)); pos = look.clone().add(V3(lerp(80, 3, u), h, h * lerp(WZ / WH, 1.25, u))); }
  mapCam.fov = fov; mapCam.position.copy(pos); mapCam.up.set(0, 1, 0); mapCam.lookAt(look);
}
// =================== 911 CALL CENTER (meters): rows of dispatch desks, line lights blinking, the queue on the wall ===================
const ctr = new THREE.Scene(); ctr.background = new THREE.Color('#10141e');
const cCam = new THREE.PerspectiveCamera(60, W / H, 0.05, 200);
const cHemi = new THREE.HemisphereLight(0xc8d4f0, 0x2a2a34, 0.9); ctr.add(cHemi);
const cKey = new THREE.DirectionalLight(0xe8eeff, 1.4); cKey.position.set(3, 8, 6); cKey.castShadow = true; cKey.shadow.mapSize.set(2048, 2048);
Object.assign(cKey.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 }); cKey.shadow.bias = -0.0005; cKey.shadow.normalBias = 0.02; ctr.add(cKey);
const alarm = new THREE.PointLight(0xff3020, 0, 18, 1.2); alarm.position.set(0, 2.9, -4.2); ctr.add(alarm);
const ctrLines = [];      // line-button materials, blinking with their own phase
const wallCanvas = document.createElement('canvas'); wallCanvas.width = 1024; wallCanvas.height = 512; const wallG = wallCanvas.getContext('2d');
const wallTex = new THREE.CanvasTexture(wallCanvas); wallTex.colorSpace = THREE.SRGBColorSpace; wallTex.anisotropy = 8;
{
  const RW = 14, RD = 12, RH = 3.3;
  const carpet = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a4152'; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, ['#434b5e', '#323848', '#3e4658'], 2); }, [6, 6]);
  const fl = mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }), false, true); fl.rotation.x = -Math.PI / 2; ctr.add(fl);
  const wm = M('#9aa3b8', { roughness: 0.95 });
  for (const [w, x, z, ry] of [[RW, 0, -RD / 2, 0], [RW, 0, RD / 2, Math.PI], [RD, -RW / 2, 0, Math.PI / 2], [RD, RW / 2, 0, -Math.PI / 2]]) { const m = mesh(new THREE.PlaneGeometry(w, RH), wm, false, true); m.position.set(x, RH / 2, z); m.rotation.y = ry; ctr.add(m); }
  const ce = mesh(new THREE.PlaneGeometry(RW, RD), M('#c8ccd6'), false, false); ce.rotation.x = Math.PI / 2; ce.position.y = RH; ctr.add(ce);
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const p = mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.45, 1.5) }), false, false); p.rotation.x = Math.PI / 2; p.position.set(i * 2.6, RH - 0.01, j * 2.3); ctr.add(p); }
  // the big wall display
  bx(7.2, 2.0, 0.12, '#15171c', 0, 1.95, -RD / 2 + 0.07, ctr);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.85), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false })); scr.position.set(0, 1.95, -RD / 2 + 0.14); ctr.add(scr);
  // desks in 3 rows x 4, operators with headsets
  const monTex = [0, 1, 2].map(k => canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#0d2238'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f4a78'; g.fillRect(0, 0, w, 18);
    for (let y = 28; y < h - 8; y += 14) { g.fillStyle = pick(['#6fa8dc', '#9fc5e8', '#e06666', '#ffd966', '#93c47d']); g.fillRect(10, y, R(60, 200), 7); }
    if (k === 1) { g.strokeStyle = '#6fa8dc'; g.lineWidth = 2; g.strokeRect(150, 40, 90, 100); for (let i = 0; i < 6; i++) { g.fillStyle = '#e06666'; g.beginPath(); g.arc(R(160, 230), R(50, 130), 4, 0, 7); g.fill(); } } }));
  const monMats = monTex.map(tx => new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }));
  const lineMats = [0, 1, 2, 3, 4, 5].map(i => { const m = new THREE.MeshStandardMaterial({ color: '#301010', emissive: '#ff2a1a', emissiveIntensity: 0 }); ctrLines.push({ m, ph: i / 6 }); return m; });
  const skins = ['#f1d2b6', '#d7a47e', '#b98260', '#8d5a3c', '#e9c4a2', '#6b4329'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = (c - 1.5) * 3.0, z = -2.2 + r * 2.7; const d = grp(x, 0, z, 0, ctr);
    bx(2.4, 0.05, 0.9, '#c8b8a0', 0, 0.75, 0, d); bx(2.4, 0.72, 0.04, '#5a606e', 0, 0.37, -0.43, d); for (const sx of [-1.15, 1.15]) bx(0.05, 0.72, 0.85, '#5a606e', sx, 0.37, 0, d);
    bx(2.4, 0.5, 0.04, '#6a7488', 0, 1.0, -0.47, d);   // privacy panel
    for (const [mx, ry] of [[-0.55, 0.3], [0, 0], [0.55, -0.3]]) { const mg = grp(mx, 0.78, -0.25, ry, d); bx(0.5, 0.32, 0.03, '#1a1c22', 0, 0.3, 0, mg); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.28), pick(monMats)); s.position.set(0, 0.3, 0.017); mg.add(s); bx(0.05, 0.14, 0.05, '#2a2c32', 0, 0.07, -0.02, mg); }
    const con = grp(0.75, 0.78, 0.05, -0.2, d); bx(0.36, 0.04, 0.22, '#25272c', 0, 0.02, 0, con);
    for (let k = 0; k < 8; k++) { const b = mesh(BOX, pick(lineMats), false, false); b.scale.set(0.03, 0.012, 0.025); b.position.set(-0.13 + (k % 4) * 0.045, 0.045, -0.06 + Math.floor(k / 4) * 0.045); con.add(b); }
    bx(0.45, 0.02, 0.16, '#2a2c32', -0.1, 0.785, 0.15, d);  // keyboard
    // chair + operator
    const chair = grp(0, 0, 0.75, Math.PI, d); bx(0.5, 0.08, 0.5, '#2a2e3a', 0, 0.48, 0, chair); bx(0.5, 0.6, 0.08, '#2a2e3a', 0, 0.85, 0.24, chair); bx(0.06, 0.44, 0.06, '#555', 0, 0.22, 0, chair);
    const op = makePerson(rnd, { skin: skins[(r * 4 + c) % 6] }); poseSit(op); op.arms[0].rotation.x = -0.9; op.arms[1].rotation.x = -0.9; op.elbows[0].rotation.x = -0.7; op.elbows[1].rotation.x = -0.7;
    op.outer.position.set(0, 0.95 + 0.0, 0.62); op.outer.rotation.y = Math.PI; d.add(op.outer);
    const hs = mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 16, Math.PI), M('#1a1a1e')); hs.position.set(0, 1.64 * op.h, 0); hs.rotation.y = Math.PI / 2; op.root.add(hs);
    const mic = mesh(new THREE.BoxGeometry(0.01, 0.01, 0.12), M('#1a1a1e')); mic.position.set(0.11, 1.57 * op.h, 0.07); mic.rotation.y = 0.5; op.root.add(mic);
    op.root.position.y = -0.45;
  }
}
function drawWall(t) {
  const g = wallG, w = 1024, h = 512, u = t - CENTER;
  g.fillStyle = '#071226'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, 70); g.fillStyle = '#fff'; g.font = '600 40px Inter'; g.textAlign = 'center'; g.fillText('911  ·  INCOMING CALLS', w / 2, 50);
  g.fillStyle = '#9fb4d8'; g.font = '600 30px Inter'; g.fillText('CALLS WAITING', w / 2, 140);
  const q = Math.max(0, 326 * u); const blink = 0.75 + 0.25 * Math.sin(t * 4);
  g.fillStyle = `rgba(255,${80 + 60 * blink | 0},${60 * blink | 0},1)`; g.font = '400 170px "Source Serif 4"'; g.fillText(fmt(q), w / 2, 310);
  g.fillStyle = '#9fb4d8'; g.font = '600 28px Inter'; g.fillText('ALL DISPATCHERS BUSY  ·  AVG WAIT ' + Math.round(u * 8 + 1) + ' MIN', w / 2, 380);
  // queue bars
  for (let i = 0; i < 40; i++) { const k = clamp(u * 0.6 - i * 0.12 + 1, 0, 1) * (0.3 + 0.7 * hash(i)); g.fillStyle = k > 0.75 ? '#e05040' : '#3a7ad0'; g.fillRect(62 + i * 23, 470 - k * 60, 16, k * 60); }
  wallTex.needsUpdate = true;
}
function updateCenter(t) {
  for (const L of ctrLines) { const cyc = (t * 1.6 + L.ph) % 1; L.m.emissiveIntensity = cyc < 0.5 ? 2.2 : 0.15; }
  alarm.intensity = 6 * (0.5 + 0.5 * Math.sin((t - CENTER) * 2.4)) * smooth(CENTER + 1.5, CENTER + 3.5, t);
  drawWall(t);
}
function centerCamera(t) { const u = clamp((t - CENTER) / (DAWN - CENTER), 0, 1);
  cCam.fov = 62; cCam.position.set(lerp(1.6, 0.4, ease(u)), lerp(2.5, 1.9, u), lerp(5.6, 2.0, ease(u))); cCam.lookAt(lerp(0.2, 0, u), lerp(-1.6, -0.6, u), -6); }
// =================== the phone screen ===================
const CALLS = [{ a: 0.0, b: 4.6, act: 'decline' }, { a: 5.3, b: 6.7, act: 'decline' }, { a: 7.3, b: 8.5, act: 'decline' }, { a: 9.0, b: 10.1, act: 'accept' }];
const RING2 = 55.0;
const BTN = { decline: [0.27, 0.83], accept: [0.73, 0.83] };
function phoneAt(t) {
  if (t >= DAWN) return t >= RING2 ? { mode: 'incoming', ring: RING2, night: false } : { mode: 'lock', missed: 4, clock: '6:42', night: false };
  const acc = CALLS[3]; if (t >= acc.b) return { mode: 'call', since: acc.b };
  for (const c of CALLS) { if (t >= c.a && t < c.b) return { mode: 'incoming', ring: c.a }; if (c.act === 'decline' && t >= c.b && t < c.b + 0.45) return { mode: 'declined' }; }
  return { mode: 'lock', missed: CALLS.filter(c => c.act === 'decline' && t >= c.b).length, clock: '3:07' };
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function phoneIcon(g, x, y, s, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-s * 0.45, -s * 0.12, s * 0.2, s * 0.13, 0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(s * 0.45, -s * 0.12, s * 0.2, s * 0.13, -0.5, 0, 7); g.fill(); g.fillRect(-s * 0.45, -s * 0.3, s * 0.9, s * 0.16); g.restore(); }
function voiceEnv(t) { return Math.max(fadeWin(t, 11.6, 12.7, 0.15), fadeWin(t, 13.2, 14.7, 0.15)); }
function drawScreen(t) {
  const g = scrG, w = 540, h = 1154, s = phoneAt(t);
  g.clearRect(0, 0, w, h); g.save(); rr(g, 0, 0, w, h, 62); g.clip();
  const bgr = g.createLinearGradient(0, 0, w * 0.4, h); bgr.addColorStop(0, s.night === false ? '#3a5aa0' : '#1d2c62'); bgr.addColorStop(1, s.night === false ? '#c07a6a' : '#5a3a80'); g.fillStyle = bgr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.arc(w * 0.8, h * 0.3, 260, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.1, h * 0.75, 200, 0, 7); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.fillStyle = 'rgba(0,0,0,0.85)'; rr(g, w / 2 - 70, 22, 140, 38, 19); g.fill();      // camera pill
  if (s.mode === 'incoming') {
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 30px Inter'; g.fillText('incoming call', w / 2, 170);
    g.fillStyle = '#fff'; g.font = '600 74px Inter'; g.fillText('Scam Likely', w / 2, 262);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 34px Inter'; g.fillText('(202) 555-0148', w / 2, 318);
    const pr = (t - s.ring) % 1.2; g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pr / 1.2)})`; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, 540, 96 + pr * 60, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(w / 2, 540, 92, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '600 110px Inter'; g.fillText('?', w / 2, 578);
    const [dx, dy] = BTN.decline, [ax, ay] = BTN.accept;
    g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(dx * w, dy * h, 64, 0, 7); g.fill(); phoneIcon(g, dx * w, dy * h + 6, 60, Math.PI * 0.75);
    const wob = Math.sin(t * 12) * 0.12 * (((t - s.ring) % 1.2) < 0.7 ? 1 : 0);
    g.fillStyle = '#34c759'; g.beginPath(); g.arc(ax * w, ay * h, 64, 0, 7); g.fill(); phoneIcon(g, ax * w, ay * h + 4, 60, wob);
    g.fillStyle = '#fff'; g.font = '500 28px Inter'; g.fillText('Decline', dx * w, dy * h + 110); g.fillText('Accept', ax * w, ay * h + 110);
  } else if (s.mode === 'declined') {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '600 60px Inter'; g.fillText('Scam Likely', w / 2, 500); g.fillStyle = '#ff6a60'; g.font = '500 40px Inter'; g.fillText('Call Declined', w / 2, 570);
  } else if (s.mode === 'lock') {
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 32px Inter'; g.fillText(s.clock === '3:07' ? 'Thursday, October 16' : 'Thursday, October 16', w / 2, 150);
    g.fillStyle = '#fff'; g.font = '300 170px Inter'; g.fillText(s.clock, w / 2, 320);
    const n = Math.min(4, s.missed);
    for (let i = 0; i < n; i++) { const y = 420 + i * 128; g.fillStyle = 'rgba(255,255,255,0.24)'; rr(g, 30, y, w - 60, 112, 28); g.fill();
      g.fillStyle = '#34c759'; rr(g, 52, y + 26, 60, 60, 14); g.fill(); phoneIcon(g, 82, y + 60, 40);
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '600 30px Inter'; g.fillText('Missed Call', 132, y + 48); g.font = '400 30px Inter'; g.fillText('Scam Likely', 132, y + 88);
      g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '400 24px Inter'; g.fillText(i === 0 ? 'now' : (s.clock === '3:07' ? i + 'm ago' : (3 * i + 3) + 'h ago'), w - 54, y + 48); g.textAlign = 'center'; }
  } else if (s.mode === 'call') {
    const sec = Math.floor(t - s.since); g.fillStyle = '#0c0f18'; g.globalAlpha = 0.55; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    g.fillStyle = '#fff'; g.font = '600 64px Inter'; g.fillText('Scam Likely', w / 2, 230); g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 36px Inter'; g.fillText('00:0' + Math.min(9, sec), w / 2, 288);
    const env = voiceEnv(t);
    for (let i = 0; i < 28; i++) { const x = 60 + i * 15.5, k = 0.06 + env * (0.35 + 0.65 * Math.abs(Math.sin(t * 9 + i * 0.7) * Math.sin(t * 5.3 + i * 1.9))) * (1 - Math.abs(i - 13.5) / 16);
      g.fillStyle = env > 0.05 ? '#9fd0ff' : 'rgba(255,255,255,0.5)'; rr(g, x, 540 - k * 150, 9, Math.max(9, k * 300), 4.5); g.fill(); }
    const lab = ['mute', 'keypad', 'speaker', 'add', 'video', 'contacts'];
    lab.forEach((l, i) => { const x = w * (0.22 + 0.28 * (i % 3)), y = 720 + Math.floor(i / 3) * 150; g.fillStyle = i === 2 ? '#fff' : 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(x, y, 46, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 22px Inter'; g.fillText(l, x, y + 78); });
    g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(w / 2, 0.88 * h, 60, 0, 7); g.fill(); phoneIcon(g, w / 2, 0.88 * h + 6, 56, Math.PI * 0.75);
  }
  g.restore(); scrTex.needsUpdate = true;
}
// =================== bedroom animation + camera ===================
const TAPS = [[4.6, 'decline'], [6.7, 'decline'], [8.5, 'decline'], [10.1, 'accept']];
function updateBed(t) {
  const dawn = t >= DAWN; const s = phoneAt(t);
  drawScreen(t);
  const buzz = s.mode === 'incoming' && ((t - s.ring) % 1.2) < 0.7 ? 1 : 0;
  phoneBody.position.set(Math.sin(t * 170) * 0.0011 * buzz, 0, Math.cos(t * 150) * 0.0007 * buzz); phoneBody.rotation.y = Math.sin(t * 130) * 0.018 * buzz;
  // hand taps
  let best = 0, tgt = null; for (const [T, b] of TAPS) { const k = smooth(T - 0.55, T - 0.05, t) * (1 - smooth(T + 0.12, T + 0.65, t)); if (k > best) { best = k; tgt = scrUV(...BTN[b]); } }
  hand.visible = !dawn && best > 0.001;
  if (tgt) { const rest = V3(0.07, 0.14, 0.42); const p = tgt.clone().sub(TIP).add(V3(0, 0.002 + 0.03 * (1 - smooth(0.6, 1, best)), 0)); hand.position.copy(rest.lerp(p, ease(best))); hand.rotation.set(-0.1 * (1 - best), 0.15, 0); }
  // light
  screenLight.position.copy(PH.pos).add(V3(0, 0.12, 0)); screenLight.intensity = (dawn ? 0.1 : 0.45) * (s.mode === 'call' ? 0.7 : 1);
  bedProps.skyM.map = dawn ? bedProps.skyD : bedProps.skyN; bedProps.moonS.visible = !dawn; bedProps.sunS.visible = dawn; for (const m of bedProps.skyline) { m.emissiveIntensity = dawn ? 0.08 : 1.0; m.color.set(dawn ? '#6a6a88' : '#1a2038'); }
  moon.color.set(dawn ? '#ffc890' : '#a9bbff'); moon.intensity = dawn ? 3.0 : 1.6; moon.position.set(dawn ? 2.4 : 1.6, dawn ? 1.9 : 3.2, -4.0);
  bHemi.color.set(dawn ? '#ffe2c8' : '#8fa6e0'); bHemi.intensity = dawn ? 1.0 : 0.55; bed.background.set(dawn ? '#e8b8a8' : '#0b1020'); bedProps.wallM.color.set(dawn ? '#b4a2b0' : '#7a86a8');
}
const PDIR = V3(-0.8, 0, 0.6).normalize();
function bedCamera(t) {
  let e, d, fov, look = PH.pos.clone();
  const at = (e_, d_) => PH.pos.clone().add(PDIR.clone().multiplyScalar(Math.cos(e_) * d_)).add(V3(0, Math.sin(e_) * d_, 0));
  if (t < DAWN) {
    if (t < 3.8) { const u = ease(t / 3.8); e = lerp(0.36, 1.05, u); d = lerp(1.15, 0.42, u); fov = lerp(55, 38, u); look.add(V3(0, lerp(0.16, -0.02, u), 0)).add(PDIR.clone().multiplyScalar(lerp(0, 0.012, u))); }
    else if (t < 10.1) { const u = (t - 3.8) / 6.3; e = 1.05 + 0.03 * u; d = 0.42 - 0.015 * u; fov = 38; look.add(V3(0, -0.02, 0)).add(PDIR.clone().multiplyScalar(0.012)); }
    else { const u = ease((t - 10.1) / 4.9); e = lerp(1.08, 1.15, u); d = lerp(0.405, 0.33, u); fov = 38; look.add(V3(0, -0.02, 0)).add(PDIR.clone().multiplyScalar(0.012)); }
  } else { const u = (t - DAWN) / (RING2 - 0.4 - DAWN), v = ease((t - (RING2 - 0.4)) / 1.6);
    const e0 = lerp(0.3, 0.36, Math.min(1, u)), d0 = lerp(1.3, 1.1, Math.min(1, u)); e = lerp(e0, 1.05, v); d = lerp(d0, 0.42, v); fov = lerp(55, 38, v);
    look.add(V3(lerp(0.25, 0, v), lerp(0.38, -0.02, v), lerp(-0.1, 0, v))).add(PDIR.clone().multiplyScalar(0.012 * v)); }
  bCam.fov = fov; bCam.position.copy(at(e, d)); bCam.lookAt(look);
}
// =================== city / street cameras ===================
function cityCamera(t) { const u = ease((t - CITY) / (MAP - CITY));
  cam.fov = 60; cam.position.set(lerp(-25, -60, u), lerp(12, 46, u), lerp(-1.5, 0, u)); cam.lookAt(lerp(90, 120, u), lerp(14, 4, u), 0); }
function streetCamera(t) { const u = (t - STREET) / (CENTER - STREET);
  cam.fov = 62; cam.position.set(lerp(18, 30, u), 1.62 + 0.02 * Math.sin(t * 7), -10.15); cam.lookAt(cam.position.x + 10, 1.35, lerp(-8.0, -6.5, u)); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.2, 6.9, 'You decline. Again.'],
  [7.0, 9.0, "80% of Americans don't<br>answer unknown numbers."],
  [9.3, 11.3, 'This time, you answer.'],
  [11.5, 13.1, 'Not a robot.'],
  [13.2, 15.0, '“Please… I need help.”'],
  [15.4, 18.8, 'What if every spam call<br>was someone like that?'],
  [19.4, 21.8, '52.5 billion spam calls<br>a year in the US.'],
  [21.9, 23.9, "That's 154 for<br>every American."],
  [24.3, 26.4, 'The US has 93,447<br>missing people.'],
  [26.5, 28.6, 'If spam calls were them…'],
  [28.8, 31.0, '…each would call<br>1,500 times a day.'],
  [31.1, 32.9, 'One call every minute.'],
  [33.4, 35.8, 'Suddenly, everyone answers.'],
  [35.9, 38.6, 'Every unknown number<br>could be someone.'],
  [38.7, 41.8, 'If just 1 in 5 picked up…'],
  [42.4, 45.0, '…911 would get 10.5 billion<br>extra calls a year.'],
  [45.1, 48.0, '49 times more<br>than it gets today.'],
  [48.1, 50.8, 'Real emergencies<br>would wait in line.'],
  [51.4, 54.2, 'In real life,<br>spam calls are just spam.'],
  [54.3, 56.1, "Don't call back<br>unknown numbers."],
  [56.2, 58.0, 'But if someone needs help —<br>call 911.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < CITY + 0.3 || t >= DAWN) show = 0;
  else if (t < DIVIDE) { stat = '<b></b>LIVE RATE'; lab = 'US SPAM CALLS'; val = fmt(1665 * (t - CITY - 0.3)); sub = t < MAP ? '1,665 EVERY SECOND' : '1,665 EVERY SECOND · 52.5 BILLION A YEAR'; }
  else if (t < DIVIDE + 4.6) { stat = '<b></b>MODEL'; lab = '52.5 BILLION ÷ 93,447'; val = fmt(561816 * smooth(DIVIDE + 0.4, DIVIDE + 3.2, t)); sub = 'CALLS PER MISSING PERSON, EVERY YEAR'; }
  else if (t < STREET) { stat = '<b></b>MODEL'; lab = 'ONE PERSON'; val = '1,539 a day'; sub = 'ONE CALL EVERY 56 SECONDS'; }
  else if (t < STREET + 0.4) show = 0;
  else if (t < CENTER) { stat = '<b></b>MODEL'; lab = t < 38.7 ? 'SPAM CALLS PER AMERICAN' : 'IF 1 IN 5 PICK UP'; val = t < 38.7 ? '3 a week' : (10.5 * smooth(38.9, 41.2, t)).toFixed(1) + ' billion'; sub = t < 38.7 ? '154 A YEAR' : 'CALLS FOR HELP A YEAR'; }
  else if (t < CENTER + 0.4) show = 0;
  else { stat = '<b></b>MODEL'; lab = '911 CALLS A YEAR'; const k = smooth(CENTER + 1.5, CENTER + 5.5, t); val = k < 0.02 ? '213 million' : (0.213 + 10.5 * k).toFixed(1) + ' billion'; sub = 'TODAY: 212.9 MILLION (FCC) · 49× MORE'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(3.4, 3.9, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  el.cap.style.top = (t > 3.6 && t < CITY) || t >= RING2 + 1.0 ? '1440px' : '1250px';
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const dip = Math.max(...[CITY, MAP, STREET, CENTER, DAWN].map(T => fadeWin(t, T - 0.3, T + 0.25, 0.25)));
  el.veil.style.background = '#000'; el.veil.style.opacity = dip;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
window.renderAt = (t) => {
  if (t < CITY || t >= DAWN) { updateBed(t); bedCamera(t); shoot(bed, bCam, t >= DAWN ? 1.2 : 1.15); }
  else if (t < MAP) { cityCamera(t); updateStreet(t, true); updateCalls(t, 'city'); shoot(city, cam, 1.1); }
  else if (t < STREET) { mapCamera(t); updateMap(t); shoot(mapScene, mapCam, 1.0); }
  else if (t < CENTER) { streetCamera(t); updateStreet(t, true); updateCalls(t, 'street'); camLight.position.copy(cam.position).add(V3(2, 1.5, 1.5)); camLight.intensity = 30; shoot(city, cam, 1.5); camLight.intensity = 0; }
  else { centerCamera(t); updateCenter(t); shoot(ctr, cCam, 1.0); }
  updateDOM(t);
  return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildMap(); window.renderAt(0); return true; })();
