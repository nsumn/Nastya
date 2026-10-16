import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if everyone had the new Tesla Roadster?" — classic series low-poly look (flat shading, soft shadows, no grain).
// Facts: Tesla reveal 2026-10-15 (Thrust trim 0-60 < 0.9 s = 3 G, cold-gas thrusters, $50,000 reservation, production 2028);
// FHWA 2024: 298 M registered vehicles. MODEL numbers (tools/roadster_math.py): ~1.2 s of hover per tank, ~9 kWh per refill.
// =================== timeline ===================
const GREEN = 4.0, JAM = 12.0, SKY = 22.0, AIR = 32.0, BUMP = 42.0, REAL = 50.0, T_END = 58.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 2028;
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
// =================== THE ROADSTER (2026 reveal look): low faceted wedge, "Ano White", bronze visor glass, light bar nose,
// full-width red tail bar, round thruster nozzles in a black tail, bronze wing, 5-spoke dark wheels. Local: +x forward, y up, z left.
const CAR_WHITE = '#e8e9ec', CAR_GLASS = '#3d2c22', CAR_BLACK = '#18191c';
const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.15, flatShading: true, side: THREE.DoubleSide });
// sections: x, yBottom, ySill, yBelt, yTop, wBottom, wBelt, wTop, glassSide, glassTop (flags for the segment to the next section)
const SECT = [
  [2.22, 0.24, 0.30, 0.40, 0.46, 0.70, 0.78, 0.58, 0, 0],
  [1.75, 0.20, 0.30, 0.58, 0.64, 0.92, 0.99, 0.74, 0, 0],
  [1.30, 0.19, 0.30, 0.66, 0.72, 0.95, 1.00, 0.70, 0, 0],
  [0.85, 0.19, 0.30, 0.70, 0.78, 0.95, 0.99, 0.64, 1, 1],
  [0.05, 0.19, 0.30, 0.72, 1.10, 0.94, 0.97, 0.56, 1, 1],
  [-0.55, 0.19, 0.30, 0.74, 1.13, 0.95, 0.98, 0.55, 1, 0],
  [-1.25, 0.19, 0.30, 0.79, 1.04, 1.00, 1.02, 0.62, 0, 0],
  [-1.85, 0.22, 0.32, 0.84, 0.97, 0.98, 1.00, 0.72, 0, 0],
  [-2.22, 0.30, 0.38, 0.86, 0.93, 0.92, 0.94, 0.76, 0, 0],
];
function roadsterBodyGeo() {
  const pos = [], col = []; const cW = new THREE.Color(CAR_WHITE), cG = new THREE.Color(CAR_GLASS), cB = new THREE.Color(CAR_BLACK);
  const ring = s => { const [x, yb, ys, yl, yt, wb, wl, wt] = s; return [[x, yb, wb * 0.9], [x, ys, wb], [x, yl, wl], [x, yt, wt], [x, yt, -wt], [x, yl, -wl], [x, ys, -wb], [x, yb, -wb * 0.9]]; };
  const tri = (a, b, c, color) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b); };
  for (let i = 0; i < SECT.length - 1; i++) {
    const A = ring(SECT[i]), B = ring(SECT[i + 1]); const gs = SECT[i][8], gt = SECT[i][9];
    for (let e = 0; e < 8; e++) { const e2 = (e + 1) % 8; let c = cW;
      if (e === 0 || e === 6 || e === 7) c = cB; else if ((e === 2 || e === 4) && gs) c = cG; else if (e === 3 && gt) c = cG;
      // flip winding so faces point outward (sections run from +x to -x)
      tri(A[e], B[e], B[e2], c); tri(A[e], B[e2], A[e2], c); }
  }
  // caps: nose (white), tail (black)
  const capF = ring(SECT[0]), capR = ring(SECT[SECT.length - 1]);
  for (let e = 1; e < 7; e++) { tri(capF[0], capF[e + 1], capF[e], cW); tri(capR[0], capR[e], capR[e + 1], cB); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const BODY_GEO = roadsterBodyGeo();
const lightW = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 2.2 });
const lightR = new THREE.MeshStandardMaterial({ color: '#601010', emissive: '#ff0a08', emissiveIntensity: 1.6 });
const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.27, 16); tireGeo.rotateX(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.29, 10); rimGeo.rotateX(Math.PI / 2);
const nozGeo = new THREE.CylinderGeometry(0.07, 0.085, 0.1, 12); nozGeo.rotateZ(Math.PI / 2);
const nozDown = new THREE.CylinderGeometry(0.05, 0.065, 0.06, 10);
function makeRoadster(opts = {}) {
  const g = new THREE.Group(); const body = new THREE.Mesh(BODY_GEO, carMat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  // nose light bar + fender light slits
  bx(0.03, 0.025, 1.18, lightW, 2.215, 0.43, 0, g); for (const s of [-1, 1]) { const l = bx(0.12, 0.02, 0.03, lightW, 1.85, 0.6, s * 0.86, g); l.rotation.y = s * 0.5; }
  bx(0.06, 0.08, 1.1, CAR_BLACK, 2.2, 0.3, 0, g);              // front intake
  // tail: red full-width bar, thruster nozzles (brass rims), black fans
  bx(0.03, 0.035, 1.78, lightR, -2.225, 0.84, 0, g);
  const brass = M('#d0a868', { metalness: 0.6, roughness: 0.3 }), noz = M('#2a2b2f', { metalness: 0.6, roughness: 0.4 });
  for (const z of [-0.45, -0.15, 0.15, 0.45]) { const n = mesh(nozGeo, brass); n.position.set(-2.24, 0.66, z); g.add(n); const f = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10).rotateZ(Math.PI / 2), noz); f.position.set(-2.235, 0.45, z); g.add(f); }
  bx(0.02, 0.1, 0.32, '#cfd0d2', -2.235, 0.6, 0, g).visible = false;
  // bronze wing (Thrust / Rocket)
  if (opts.wing !== false) { const wm = M('#8c6a48', { metalness: 0.7, roughness: 0.35, flatShading: true }); const w = bx(0.42, 0.035, 1.95, wm, -2.0, 1.2, 0, g); w.rotation.z = -0.08; for (const z of [-0.45, 0.45]) bx(0.12, 0.26, 0.03, CAR_BLACK, -1.95, 1.06, z, g); }
  // downward thrusters around the floor (the hopping version)
  for (const [x, z] of [[1.7, 0.6], [1.7, -0.6], [-1.75, 0.65], [-1.75, -0.65]]) { const n = mesh(nozDown, brass); n.position.set(x, 0.17, z); g.add(n); }
  // wheels: black tire + dark 5-spoke rim
  const wheels = [];
  for (const [x, z] of [[1.38, 0.86], [1.38, -0.86], [-1.42, 0.88], [-1.42, -0.88]]) {
    const wg = new THREE.Group(); wg.position.set(x, 0.36, z); g.add(wg); const spin = new THREE.Group(); wg.add(spin);
    spin.add(mesh(tireGeo, M('#121214', { roughness: 0.9 }))); spin.add(mesh(rimGeo, M('#2c2e33', { metalness: 0.6, roughness: 0.4 })));
    for (let k = 0; k < 5; k++) { const sp = mesh(BOX, M('#55585e', { metalness: 0.7, roughness: 0.35, flatShading: true })); sp.scale.set(0.05, 0.22, 0.02); sp.position.set(0, 0, Math.sign(z) * 0.15); const a = new THREE.Group(); a.rotation.z = k * Math.PI * 2 / 5; a.add(sp); sp.position.y = 0.11; sp.rotation.z = 0.25; spin.add(a); }
    wheels.push(spin);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return { g, wheels };
}
// =================== debug turntable (?debug=car) ===================
const studio = new THREE.Scene(); studio.background = new THREE.Color('#202226');
const sCam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
studio.add(new THREE.HemisphereLight(0xdfe6f0, 0x303034, 1.1)); const sKey = new THREE.DirectionalLight(0xffffff, 2.5); sKey.position.set(4, 6, 3); sKey.castShadow = true; studio.add(sKey);
studio.add(mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), M('#3a3c40'), false, true));
const demoCar = makeRoadster(); studio.add(demoCar.g);
function debugCar(t) { const views = [[10, 2.2, 10], [0.01, 1.4, 15], [-14, 1.3, 0.01], [14, 1.1, 0.01], [-9, 3, 9]]; const v = views[Math.floor(t) % views.length];
  sCam.fov = 30; sCam.position.set(...v); sCam.lookAt(0, 0.55, 0); shoot(studio, sCam, 1.0); }
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
// =================== actors: a state function of t -> pose + which thrusters fire ===================
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YZX'), _s = new THREE.Vector3(1, 1, 1);
function poseMatrix(st) { _e.set(st.roll || 0, st.yaw || 0, st.pitch || 0, 'YZX'); _q.setFromEuler(_e); return _m.compose(V3(st.x, st.y, st.z), _q, _s); }
const REAR_N = [V3(-2.3, 0.66, -0.3), V3(-2.3, 0.66, 0.3)], DOWN_N = [V3(1.7, 0.12, 0), V3(-1.75, 0.12, 0)];
function emitPlumes(smoke, actor, t, life = 1.1, dt = 0.05) {
  for (let k = Math.floor((t - life) / dt) + 1; k * dt <= t; k++) { const tau = k * dt, age = t - tau; const st = actor.state(tau); if (!st || !(st.rear || st.down)) continue;
    const m = poseMatrix(st).clone(); const fwd = V3(1, 0, 0).transformDirection(m), up = V3(0, 1, 0).transformDirection(m);
    const spread = (1 - Math.exp(-age * 3)) / 3, j = hash(k * 7.1 + actor.id * 13.3);
    if (st.rear) for (const n of REAR_N) { const p = n.clone().applyMatrix4(m).addScaledVector(fwd, -9 * spread).add(V3(0, 0.5 * age + 0.3 * age * age, (j - 0.5) * age)); smoke.add(p, 0.8 + 5.0 * age, 0.85 * Math.pow(1 - age / life, 1.2) * (st.rear)); }
    if (st.down) for (const n of DOWN_N) { const p = n.clone().applyMatrix4(m).addScaledVector(up, -6 * spread); p.x += (j - 0.5) * 2.5 * age; p.z += (hash(k * 3.3 + actor.id) - 0.5) * 2.5 * age; p.y = Math.max(p.y, 0.25 + 0.4 * age); smoke.add(p, 0.6 + 3.6 * age, 0.7 * Math.pow(1 - age / life, 1.4) * st.down); }
  }
}
// =================== semis (generic, for the jam) ===================
function makeSemi(cab) { const g = new THREE.Group();
  bx(15.5, 2.9, 2.6, M('#e8e6e0', { flatShading: true }), -6.2, 2.65, 0, g); bx(15.5, 0.25, 2.4, '#3a3a3e', -6.2, 1.1, 0, g);
  const c = grp(3.1, 0, 0, 0, g); bx(2.3, 2.6, 2.5, M(cab, { flatShading: true, roughness: 0.4 }), 0, 2.15, 0, c); bx(1.5, 1.2, 2.45, M(cab, { flatShading: true, roughness: 0.4 }), 1.6, 1.4, 0, c); bx(0.05, 0.9, 2.2, M('#22303a', { roughness: 0.15, metalness: 0.6 }), 1.16, 2.8, 0, c);
  const wg = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12).rotateX(Math.PI / 2);
  for (const x of [4.2, 1.6, 0.4, -10.5, -11.8]) for (const z of [-1.1, 1.1]) { const w = mesh(wg, M('#151515')); w.position.set(x, 0.5, z); g.add(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
// =================== the city fleet ===================
const POOL = []; for (let i = 0; i < 90; i++) { const r = makeRoadster(); r.g.visible = false; city.add(r.g); POOL.push(r); }
const citySmoke = makeSmoke(city, 6000);
function placeCar(r, st) { if (!st) { r.g.visible = false; return; } r.g.visible = true; r.g.position.set(st.x, st.y, st.z); r.g.rotation.set(st.roll || 0, st.yaw || 0, st.pitch || 0, 'YZX');
  const spin = -(st.dist || 0) / 0.36; for (const w of r.wheels) w.rotation.z = spin; }
// shot A/B: queues at the red light at x = 30, launch on green (Thrust: 0-60 in 0.9 s = 3.04 G)
const LAUNCH = [];
{ let id = 0; for (const [lane, dir, x0] of [[-1.75, 1, 19.6], [-5.25, 1, 19.6], [1.75, -1, 40.4], [5.25, -1, 40.4]]) for (let k = 0; k < 9; k++) {
    const xs = x0 - dir * k * 5.5; const delay = k * 0.16 + (lane === -5.25 || lane === 5.25 ? 0.07 : 0);
    LAUNCH.push({ id: id++, state(t) { const tl = t - (GREEN + delay); let s = 0, v = 0; const a1 = 3.04 * 9.81, t1 = 26.82 / a1;
      if (tl > 0) { if (tl < t1) { s = 0.5 * a1 * tl * tl; v = a1 * tl; } else { const a2 = 7, v1 = 26.82, tm = (58 - v1) / a2, u = Math.min(tl - t1, tm); s = 0.5 * a1 * t1 * t1 + v1 * u + 0.5 * a2 * u * u + Math.max(0, tl - t1 - tm) * 58; v = Math.min(58, v1 + a2 * (tl - t1)); } }
      return { x: xs + dir * s, y: 0, z: lane, yaw: dir > 0 ? 0 : Math.PI, pitch: tl > 0 && tl < 1.2 ? 0.035 * Math.sin(Math.PI * tl / 1.2) : 0, rear: tl > 0 && tl < 1.3 ? 1 - tl / 1.3 * 0.6 : 0, dist: s, v }; } }); } }
// shot C: everyone hops over a jam of semis around x = 330-350
const SEMIS = []; for (const [x, z, c] of [[346, -1.75, '#c43b2e'], [351, -5.25, '#2b5f8a']]) { const s = makeSemi(c); s.position.set(x, 0, z); city.add(s); SEMIS.push(s); }
const HOPPERS = [];
for (let k = 0; k < 22; k++) { const lane = k % 2 ? -5.25 : -1.75, th = JAM + 0.5 + k * 0.42, v = 13.5, xs = (lane === -1.75 ? 326 : 331), dur = 2.1, hmax = 6.2 + (k % 3) * 0.6, flip = k % 3 === 1;
  HOPPERS.push({ id: 100 + k, state(t) { const x = xs + v * (t - th); if (x < 215 || x > 420) return null; const u = clamp((t - th) / dur, 0, 1); const air = u > 0 && u < 1;
    return { x, y: air ? 4 * hmax * u * (1 - u) : 0, z: lane, yaw: 0, roll: flip && air ? Math.PI * 2 * smooth(0.12, 0.88, u) : 0, pitch: air ? 0.12 * Math.cos(Math.PI * u) : 0, down: air && (u < 0.3 || u > 0.82) ? 1 : 0, rear: air && u < 0.15 ? 0.6 : 0, dist: x }; } }); }
// shot D/F: the whole street hopping (hover ~1.2 s per tank, MODEL)
const SKYCARS = [];
for (let k = 0; k < 80; k++) { const lanes = [[-1.75, 1], [-5.25, 1], [1.75, -1], [5.25, -1]]; const [lane, dir] = lanes[k % 4]; const x0 = R(-40, 320), v = R(12, 17), P = R(2.4, 3.6), ph = R(0, P), dur = R(1.2, 1.5), hmax = R(3.0, 7.5), flip = rnd() < 0.18;
  SKYCARS.push({ id: 200 + k, state(t) { const x = wrapR(x0 + dir * v * t, -40, 320); const c = ((t + ph) % P); const u = clamp(c / dur, 0, 1); const air = c < dur;
    const y = air ? hmax * (1 - Math.pow(2 * u - 1, 4)) : 0;
    return { x, y, z: lane, yaw: dir > 0 ? 0 : Math.PI, roll: flip && air ? Math.PI * 2 * smooth(0.2, 0.8, u) : 0, pitch: air ? 0.08 * Math.sin(Math.PI * 2 * u) : 0, down: air && u < 0.9 ? 1 : 0, dist: x * dir }; } }); }
// shot F: a mid-air fender bender right in front of the camera (cartoony, both land on their wheels)
const BUMP_T = BUMP + 2.6;
const BUMPERS = [0, 1].map(i => ({ id: 400 + i, state(t) { const th = BUMP_T - 0.75 - (i ? 0.25 : 0), dur = i ? 1.9 : 1.6, h = i ? 5.2 : 4.6, v = i ? 17 : 12.5; const x0 = 118 - (i ? 20 : 9.375);
  const u = clamp((t - th) / dur, 0, 1), air = u > 0 && u < 1; const x = x0 + v * (t - th); let y = air ? 4 * h * u * (1 - u) : 0, roll = 0, yaw = 0, z = -1.75;
  if (t > BUMP_T && air) { const k = smooth(BUMP_T, th + dur - 0.1, t); roll = (i ? -1 : 1) * Math.PI * 2 * k; z += (i ? -1.6 : 1.4) * k; yaw = (i ? 0.25 : -0.3) * Math.sin(Math.PI * k); }
  return { x, y, z, yaw, roll, pitch: air ? 0.1 * Math.cos(Math.PI * u) : 0, down: air && (u < 0.35 || u > 0.8) ? 1 : 0, dist: x }; } }));
function updateFleet(t, shot) {
  let list = [];
  if (shot === 'launch') list = LAUNCH; else if (shot === 'jam') list = HOPPERS; else if (shot === 'sky') list = SKYCARS; else if (shot === 'bump') list = SKYCARS.filter(a => { const s = a.state(t); return !(Math.abs(s.x - 112) < 26 && s.z < 0) && !(s.z > 0 && s.x > 100 && s.x < 150); }).concat(BUMPERS);
  for (const s of SEMIS) s.visible = shot === 'jam';
  citySmoke.begin(); POOL.forEach((r, i) => { const a = list[i]; placeCar(r, a ? a.state(t) : null); if (a) emitPlumes(citySmoke, a, t); }); citySmoke.end();
}
// =================== AIR STATION (meters): canopy, air pumps, a queue of Roadsters down the road ===================
const st = new THREE.Scene(); st.background = new THREE.Color('#9cc6ec'); st.fog = new THREE.Fog(new THREE.Color('#cfe3f4'), 80, 700);
const stCam = new THREE.PerspectiveCamera(55, W / H, 0.1, 3000);
st.add(new THREE.HemisphereLight(0xcfe0ff, 0x6a5a48, 1.1));
const stSun = new THREE.DirectionalLight(0xfff0dc, 3.0); stSun.position.set(-40, 80, 50); stSun.castShadow = true; stSun.shadow.mapSize.set(2048, 2048);
Object.assign(stSun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 }); stSun.shadow.bias = -0.0004; stSun.shadow.normalBias = 0.02; st.add(stSun);
const stSmoke = makeSmoke(st, 2500);
const STATION = { pumps: [], queue: [] };
{
  const dome = cityDome.clone(); st.add(dome);
  const gr = mesh(new THREE.PlaneGeometry(2000, 2000), M('#7a9a58', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; gr.position.y = -0.02; st.add(gr);
  const road = mesh(new THREE.PlaneGeometry(1200, 9), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, 14); st.add(road);
  const lot = mesh(new THREE.PlaneGeometry(60, 26), M('#5a5d62', { roughness: 0.95 }), false, true); lot.rotation.x = -Math.PI / 2; lot.position.set(0, 0.01, -2); st.add(lot);
  for (let x = -600; x < 600; x += 9) { const d = mesh(new THREE.PlaneGeometry(3, 0.15), M('#e8e6df'), false, true); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.02, 14); st.add(d); }
  // canopy
  const cg = grp(0, 0, -2, 0, st); for (const [x, z] of [[-10, -4], [10, -4], [-10, 4], [10, 4]]) bx(0.6, 5.2, 0.6, '#d8d8d8', x, 2.6, z, cg);
  bx(26, 0.9, 13, '#f4f4f2', 0, 5.6, 0, cg); bx(26.1, 0.35, 13.1, '#2f6fd0', 0, 5.3, 0, cg);
  const sign = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#2f6fd0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 104px Inter'; g.textAlign = 'center'; g.fillText('AIR', w / 2, 112); });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshStandardMaterial({ map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.35 })); p.position.set(0, 5.6, s * 6.56); p.rotation.y = s > 0 ? 0 : Math.PI; cg.add(p); }
  // price pylon
  const py = grp(-24, 0, 7.5, 0.4, st); bx(0.5, 7, 0.5, '#555', 0, 3.5, 0, py);
  const pt = canvasTex(256, 384, (g, w, h) => { g.fillStyle = '#1b2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 64px Inter'; g.textAlign = 'center'; g.fillText('AIR', w / 2, 80); g.font = '600 30px Inter'; g.fillStyle = '#9fc5ff'; g.fillText('4,500 PSI', w / 2, 140);
    g.fillStyle = '#ffd24a'; g.font = '700 70px Inter'; g.fillText('9 kWh', w / 2, 250); g.fillStyle = '#cfd8e6'; g.font = '500 26px Inter'; g.fillText('PER FILL', w / 2, 300); });
  const pb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 0.4), [M('#1b2a44'), M('#1b2a44'), M('#1b2a44'), M('#1b2a44'), new THREE.MeshStandardMaterial({ map: pt, emissive: '#fff', emissiveMap: pt, emissiveIntensity: 0.5 }), M('#1b2a44')]); pb.position.y = 8.6; py.add(pb);
  // pumps on two islands
  for (const z of [-3.2, 2.2]) for (const x of [-6, 0, 6]) { const p = grp(x, 0, z - 2, 0, st); bx(1.6, 0.25, 0.9, '#cfcfcf', 0, 0.12, 0, p); bx(0.8, 1.9, 0.6, '#2f6fd0', 0, 1.2, 0, p); bx(0.62, 0.4, 0.02, M('#0f1a2a'), 0, 1.65, 0.31, p);
    const tank = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 10), M('#e0e0e0', { metalness: 0.5, roughness: 0.3 })); tank.position.set(0.55, 0.85, 0); p.add(tank); STATION.pumps.push(p.position.clone().add(V3(0, 0, -2))); }
  // shop + trees + far houses
  bx(14, 4.2, 8, '#e9dcc0', 22, 2.1, -10, st); bx(14.4, 0.4, 8.4, '#b85a40', 22, 4.3, -10, st); bx(6, 2, 0.1, M('#3a4c50', { roughness: 0.2 }), 22, 1.6, -5.95, st);
  for (let i = 0; i < 40; i++) { const x = R(-300, 300), z = R(-140, -30); const tr = grp(x, 0, z, 0, st); bx(0.5, 3, 0.5, '#6b4a2e', 0, 1.5, 0, tr); const c = mesh(new THREE.IcosahedronGeometry(R(2, 3.2), 0), M(pick(['#4f9a3c', '#3f8a3a', '#5aa048']), { flatShading: true })); c.position.y = 4; tr.add(c); }
  for (let i = 0; i < 30; i++) { const x = R(-500, 500), z = R(40, 160); const h = R(5, 9); bx(R(8, 14), h, R(8, 12), pick(['#e8c7a0', '#d9a07a', '#c8d0d8', '#efe2c8']), x, h / 2, z, st); }
}
// cars: 6 at the pumps (hissing), the queue: a line back down the road (+x) and around, inching forward
const STQ = [];
for (let i = 0; i < 6; i++) { const r = makeRoadster(); st.add(r.g); const p = STATION.pumps[i]; r.g.position.set(p.x + 0.0, 0, p.z + (p.z < -3 ? -1.9 : 1.9)); r.g.rotation.y = Math.PI; STQ.push({ r, pump: i }); }
for (let i = 0; i < 46; i++) { const r = makeRoadster(); st.add(r.g); STQ.push({ r, q: i }); }
function updateStation(t) {
  const u = t - AIR; stSmoke.begin();
  for (const c of STQ) { if (c.pump !== undefined) { const p = c.r.g.position; const pulse = 0.5 + 0.5 * Math.sin(u * 3 + c.pump);
      for (let k = 0; k < 10; k++) { const age = ((u * 1.3 + k / 10 + c.pump * 0.17) % 1); smokeAddTmp.set(p.x - 2.2 - age * 1.5, 0.7 + age * 1.6, p.z + (hash(k + c.pump * 9) - 0.5) * 1.2); stSmoke.add(smokeAddTmp, 0.6 + age * 2.5, 0.35 * (1 - age) * pulse); } continue; }
    // queue: a line in the right lane from the lot entrance out to x = +300, creeping forward 1.5 m/s in steps
    const s = c.q * 5.6 + 6 - Math.min(5.6, ((u * 1.2) % 5.6)) * (c.q < 30 ? 1 : 0);
    const x = 14 + s, z = 15.8; c.r.g.position.set(x, 0, z); c.r.g.rotation.y = Math.PI; for (const w of c.r.wheels) w.rotation.z = 0; }
  stSmoke.end();
}
const smokeAddTmp = new THREE.Vector3();
function stationCamera(t) { const u = (t - AIR) / (BUMP - AIR); stCam.fov = 55; stCam.position.set(lerp(-26, -14, ease(u)), lerp(9, 6.5, u), lerp(-26, -22, u)); stCam.lookAt(lerp(8, 18, u), 1.5, 8); }
// =================== THE REAL DEMO (dark arena): a ramp that curls over until upside down, fan suction, thrusters, flip, landing ===================
const arena = new THREE.Scene(); arena.background = new THREE.Color('#06070a'); arena.fog = new THREE.Fog(new THREE.Color('#06070a'), 40, 140);
const aCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
arena.add(new THREE.HemisphereLight(0x7f8db0, 0x101014, 0.55));
const aKey = new THREE.SpotLight(0xdfe8ff, 900, 120, 0.6, 0.5, 1.2); aKey.position.set(18, 30, 26); aKey.target.position.set(0, 4, 0); aKey.castShadow = true; aKey.shadow.mapSize.set(2048, 2048); arena.add(aKey, aKey.target);
const aBack = new THREE.SpotLight(0x6f9cff, 500, 100, 0.5, 0.6, 1.2); aBack.position.set(-20, 26, -18); aBack.target.position.set(0, 6, 0); arena.add(aBack, aBack.target);
const aSmoke = makeSmoke(arena, 3000);
const RAMP = { r: 6.2, cx: 12 };   // circle centre (cx, r); the car enters at x < cx, climbs the curl and ends upside down at the top
{ const fl = mesh(new THREE.PlaneGeometry(300, 300), M('#26282d', { roughness: 0.6, metalness: 0.2 }), false, true); fl.rotation.x = -Math.PI / 2; arena.add(fl);
  // the curl: a tube-like strip following the circle from the bottom to the top (180 deg)
  const segs = 40, wdt = 3.4, pos = [], idx = [];
  for (let i = 0; i <= segs; i++) { const a = Math.PI * i / segs; const x = RAMP.cx + RAMP.r * Math.sin(a), y = RAMP.r - RAMP.r * Math.cos(a); for (const z of [-wdt / 2, wdt / 2]) pos.push(x, y, z); if (i < segs) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  const ramp = mesh(rg, M('#2c3550', { side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3, flatShading: true })); arena.add(ramp);
  // back frame (truss) and side rails
  for (const z of [-wdt / 2 - 0.1, wdt / 2 + 0.1]) for (let i = 0; i < segs; i++) { const a0 = Math.PI * i / segs, a1 = Math.PI * (i + 1) / segs; const p0 = V3(RAMP.cx + RAMP.r * Math.sin(a0), RAMP.r - RAMP.r * Math.cos(a0), z), p1 = V3(RAMP.cx + RAMP.r * Math.sin(a1), RAMP.r - RAMP.r * Math.cos(a1), z);
    const b = mesh(BOX, M('#5a6aa8', { flatShading: true })); b.scale.set(p0.distanceTo(p1) + 0.05, 0.25, 0.2); b.position.copy(p0).lerp(p1, 0.5); b.rotation.z = Math.atan2(p1.y - p0.y, p1.x - p0.x); arena.add(b); }
  for (const z of [-2.2, 2.2]) { bx(0.5, 13, 0.5, '#2a2c34', RAMP.cx + RAMP.r + 0.6, 6.5, z, arena); bx(0.5, 1, 0.5, '#2a2c34', RAMP.cx + 0.5, 12.9, z, arena); }
  bx(RAMP.r + 1, 0.4, 0.4, '#2a2c34', RAMP.cx + RAMP.r / 2, 12.8, 0, arena);
  // red light strips on the floor + a line-up of other cars (blue sedan, red sedan, a white semi) like at the reveal
  for (const z of [-6, 6]) { const s = bx(60, 0.05, 0.12, new THREE.MeshStandardMaterial({ color: '#400', emissive: '#ff1a10', emissiveIntensity: 2 }), -10, 0.03, z, arena); }
  const semi = makeSemi('#f2f2f2'); semi.position.set(-14, 0, -9); arena.add(semi);
  for (const [x, c] of [[-26, '#2a4f9a'], [-31, '#b8241c'], [-36, '#2a2c30']]) { const g = grp(x, 0, -9, 0, arena); bx(4.6, 0.8, 1.9, M(c, { roughness: 0.3, metalness: 0.4 }), 0, 0.75, 0, g); bx(2.6, 0.55, 1.7, M('#1e262e', { roughness: 0.15, metalness: 0.6 }), -0.2, 1.4, 0, g); }
}
const hero = makeRoadster(); arena.add(hero.g);
const R_IN = REAL + 2.0, R_TOP = REAL + 3.4, R_DROP = REAL + 4.4, R_LAND = R_DROP + 1.55;
function heroState(t) {
  const r = RAMP.r, cx = RAMP.cx;
  if (t < R_IN) { const u = (t - REAL) / (R_IN - REAL); const x = lerp(-34, cx - 0.01, u * u * 0.3 + u * 0.7); return { x, y: 0, z: 0, yaw: 0, rear: u > 0.3 ? 0.8 : 0, dist: x }; }
  if (t < R_TOP) { const u = ease((t - R_IN) / (R_TOP - R_IN)); const a = Math.PI * u; const x = cx + (r - 0.0) * Math.sin(a), y = r - r * Math.cos(a);
    return { x, y, z: 0, yaw: 0, pitch: a, rear: 0.5, dist: 30 + a * r }; }   // pitch = curl angle: at the top the car hangs upside down
  if (t < R_DROP) return { x: cx, y: 2 * r, z: 0, yaw: 0, pitch: Math.PI, rear: 0, dist: 30 + Math.PI * r };
  if (t < R_LAND) { const u = (t - R_DROP) / (R_LAND - R_DROP); const y = 2 * r * (1 - u * u);
    return { x: cx - 6 * u, y: Math.max(0, y), z: 0, yaw: 0, pitch: Math.PI * (1 + ease(u)), down: u < 0.35 ? 1 : 0, rear: u < 0.5 ? 0.8 : 0, dist: 0 }; }
  const u = t - R_LAND; return { x: cx - 6 - 14 * u, y: 0, z: 0, yaw: 0, pitch: 0, down: u < 0.25 ? 0.8 : 0, dist: -14 * u };
}
const heroActor = { id: 777, state: heroState };
function updateReal(t) { const s = heroState(t); placeCar(hero, s);
  // at the top the car's body hangs below the curl: offset the car by its height along its own up axis so the wheels touch the ramp
  aSmoke.begin(); emitPlumes(aSmoke, heroActor, t, 1.3); aSmoke.end(); }
function realCamera(t) { const u = (t - REAL) / (T_END - REAL); aCam.fov = 50; const hs = heroState(t), k = smooth(REAL + 1.0, REAL + 2.4, t); const lx = t < R_TOP ? lerp(hs.x, 11, k) : 11; aCam.position.set(lx - 3, lerp(3.0, 6.0, k), lerp(24, 30, k)); aCam.lookAt(lx, lerp(1.5, 6.0, k), 0); }
// =================== city cameras ===================
const CHASE = LAUNCH[9];
function cityCamera(t, shot) {
  if (shot === 'launch') { if (t < 8.0) { const u = t / 8; cam.fov = 56; cam.position.set(31.5 - 1.0 * u, 1.05, 0.0); cam.lookAt(10, 1.15, -3.0); }
    else { const s = CHASE.state(t); cam.fov = 62; cam.position.set(s.x - 11, 3.0, s.z + 5.0); cam.lookAt(s.x + 8, 0.8, s.z - 0.5); } }
  else if (shot === 'jam') { const u = (t - JAM) / (SKY - JAM); cam.fov = 58; cam.position.set(380 - 4 * u, 6.5, 6.0); cam.lookAt(lerp(334, 344, u), 4.2, -3.5); }
  else if (shot === 'sky') { const u = (t - SKY) / (AIR - SKY); cam.fov = 58; cam.position.set(lerp(20, 52, u), lerp(11, 15, u), -3.0); cam.lookAt(lerp(70, 105, u), 1, 0); }
  else { const u = (t - BUMP) / (REAL - BUMP); cam.fov = 58; cam.position.set(142 - 2 * u, 2.6, 5.5); cam.lookAt(118, lerp(4.4, 3.8, u), -1.75); }
}
function cityLook(t, shot) {
  // traffic lights: red until GREEN, then green
  TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (t < GREEN ? i === 0 : i === 2) ? 2.4 : 0.05; });
  for (const P of people) if (P.kind === 'cross') P.p.outer.visible = false;
  if (shot === 'bump') { sunL.color.set('#ffb070'); sunL.intensity = 2.4; sunL.position.copy(cam.position).add(V3(120, 55, 70)); sunL.target.position.copy(cam.position).add(V3(-30, 0, -8)); sunL.target.updateMatrixWorld(); hemi.color.set('#ffd2a8'); hemi.intensity = 0.85;
    cityDome.material.uniforms.uTop.value.set('#4f62b0'); cityDome.material.uniforms.uBot.value.set('#ffb07a'); city.fog.color.set('#f2b48a'); for (const m of winMats) m.emissiveIntensity = 0.45; for (const m of lampHeads) m.emissiveIntensity = 1.2;
    for (const c of clouds) c.material.color.set('#ffc8a8'); smokeMat.uniforms.uTint.value.set('#ffe2cc'); }
  else { for (const c of clouds) c.material.color.set('#ffffff'); smokeMat.uniforms.uTint.value.set('#ffffff'); }
}
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.3, 7.0, '0 to 60 in 0.9 seconds.'],
  [7.1, 9.6, "That's 3 G —<br>like a Space Shuttle launch."],
  [9.7, 11.8, 'Everyone. At once.'],
  [12.4, 15.2, 'Traffic jam?<br>Just hop over it.'],
  [15.3, 18.5, '298 million vehicles<br>in the US.'],
  [18.6, 21.8, 'All of them jumping.'],
  [22.4, 25.4, "But it's not really flying."],
  [25.5, 28.7, 'The air runs out<br>in about a second.'],
  [28.8, 31.8, "It's a hop, not a flight."],
  [32.4, 35.0, 'Then you need more air.'],
  [35.1, 38.2, 'Lines at every<br>air station.'],
  [38.3, 41.8, 'Each refill: ~9 kWh —<br>like driving 32 miles.'],
  [42.4, 44.9, 'Mid-air fender benders.'],
  [45.0, 47.4, 'Insurance would be…<br>interesting.'],
  [47.5, 49.8, 'And just the deposits?'],
  [50.4, 52.8, 'The real one did this.'],
  [52.9, 55.4, 'Production: 2028.<br>(In 2017 they said 2020.)'],
  [55.5, 58.0, "The flying version<br>isn't street legal."],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < GREEN + 0.2 || t >= REAL) show = 0;
  else if (t < 8.0) { lab = '0–60 MPH'; val = '0.9 s'; sub = 'THRUST VERSION · 3 G'; }
  else if (t < JAM) { lab = 'SPEED'; val = Math.round(CHASE.state(t).v * 2.2369) + ' mph'; sub = 'TOP SPEED: OVER 230 MPH'; }
  else if (t < JAM + 0.3) show = 0;
  else if (t < SKY) { lab = 'US VEHICLES'; val = '298 million'; sub = 'FHWA, 2024'; }
  else if (t < SKY + 0.3) show = 0;
  else if (t < AIR) { stat = '<b></b>MODEL'; lab = 'HOVER TIME'; val = '~1.2 s'; sub = 'PER TANK OF COMPRESSED AIR'; }
  else if (t < AIR + 0.3) show = 0;
  else if (t < BUMP) { stat = '<b></b>MODEL'; lab = 'ONE REFILL'; val = '~9 kWh'; sub = '34 KG OF AIR AT 4,500 PSI'; }
  else if (t < BUMP + 0.3) show = 0;
  else { lab = '$50,000 × 298 MILLION'; val = '$' + (14.9 * smooth(BUMP + 0.4, 49.2, t)).toFixed(1) + ' trillion'; sub = 'RESERVATION DEPOSITS ALONE'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(3.4, 3.9, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const dip = Math.max(...[JAM, SKY, AIR, BUMP, REAL].map(T => fadeWin(t, T - 0.3, T + 0.25, 0.25)));
  el.veil.style.background = '#000'; el.veil.style.opacity = dip;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
const smokeScale = c => H / (2 * Math.tan(c.fov * Math.PI / 360));
window.renderAt = (t) => {
  if (DEBUG === 'car') { debugCar(t); return true; }
  if (t < AIR || (t >= BUMP && t < REAL)) {
    const shot = t < JAM ? 'launch' : t < SKY ? 'jam' : t < AIR ? 'sky' : 'bump';
    cityCamera(t, shot); updateStreet(t, false); cityLook(t, shot); updateFleet(t, shot); smokeMat.uniforms.uScale.value = smokeScale(cam); shoot(city, cam, shot === 'bump' ? 1.05 : 1.0);
  } else if (t < BUMP) { stationCamera(t); updateStation(t); smokeMat.uniforms.uTint.value.set('#ffffff'); smokeMat.uniforms.uScale.value = smokeScale(stCam); shoot(st, stCam, 1.0); }
  else { realCamera(t); updateReal(t); smokeMat.uniforms.uTint.value.set('#c8d4ff'); smokeMat.uniforms.uScale.value = smokeScale(aCam); shoot(arena, aCam, 1.1); }
  updateDOM(t);
  return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
