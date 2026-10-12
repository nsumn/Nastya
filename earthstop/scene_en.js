import * as THREE from 'three';

// =================== timeline ===================
const T0 = 5.0;            // Earth stops
const SLOW = 50;           // time slowed 50x  -> the 1 real second lasts 50 video seconds
const TE1 = 50.0;          // te when Earth spins again (video seconds after T0)
const T1 = T0 + TE1;       // 55.0
const T_END = 60.5;        // end card
const MPS = 352.6;         // New York rotation speed, m/s (465.1 * cos 40.71°)
const V = MPS / SLOW;      // apparent eastward speed in video (m/s)
const FPS = 30, DT = 1 / FPS;

// =================== rng / helpers ===================
let seed = 4242;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (x, c, half) => c + ((((x - c + half) % (2 * half)) + 2 * half) % (2 * half)) - half;

// =================== renderer ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 1200);
scene.add(camera);

function skyTex(top, mid, bot) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const skyCalm = skyTex('#7f9cc4', '#c9cfdc', '#f3d6b3');
const skyStorm = skyTex('#6f6c75', '#a8927d', '#d9b48c');
scene.background = skyCalm;
const fogCalm = new THREE.Color('#e9d7bf'), fogDust = new THREE.Color('#c9a57e');
scene.fog = new THREE.Fog(fogCalm.clone(), 90, 360);

const hemi = new THREE.HemisphereLight(0xc9dcf5, 0x6a5a40, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd6a0, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 65, bottom: -65, near: 10, far: 260 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, color, x = 0, y = 0, z = 0) { const m = mesh(BOX, M(color)); m.scale.set(w, h, d); m.position.set(x, y, z); return m; }
function plane(w, d, color, x, y, z, recv = true) { const p = mesh(new THREE.PlaneGeometry(w, d), M(color), false, recv); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); scene.add(p); return p; }

// =================== static city ===================
const XMIN = -260, XMAX = 560, XC = (XMIN + XMAX) / 2, XW = XMAX - XMIN;
plane(XW + 400, 211, '#6e9448', XC, 0, 94.7);                 // park ground
plane(XW + 400, 40, '#cdb48e', XC, 0.02, 50);                 // promenade
for (const [z, d] of [[14, 3.2], [-2.5, 2.6]]) plane(XW + 400, d, '#d8c39f', XC, 0.03, z);
for (let x = XMIN; x < XMAX; x += 30) plane(3, 30, '#d8c39f', x + R(-4, 4), 0.031, 8);
plane(XW + 400, 5.5, '#55545a', XC, 0.03, -6.8);               // road
for (let x = XMIN - 100; x < XMAX + 100; x += 6) { const s = box(3, 0.02, 0.18, '#e8e2d2', x, 0.05, -6.8); s.castShadow = false; scene.add(s); }
scene.add(box(XW + 400, 1.2, 1.2, '#9a8f86', XC, 0.2, -10.2));
// river
const RIV_W = XW + 200;
const riverGeo = new THREE.PlaneGeometry(RIV_W, 32, 280, 24); riverGeo.rotateX(-Math.PI / 2);
const riverBase = riverGeo.attributes.position.array.slice();
const river = mesh(riverGeo, new THREE.MeshStandardMaterial({ color: '#4b7896', roughness: 0.5, metalness: 0.05, flatShading: true }), false, true);
river.position.set(XC, -0.6, -26.8); scene.add(river);
plane(XW + 400, 40, '#3c4b52', XC, -3, -26.8, false);
scene.add(box(XW + 400, 1.4, 6, '#9a8f86', XC, -0.1, -45.5));
plane(XW + 400, 360, '#7b8f55', XC, 0.62, -222);
for (let x = XMIN - 100; x < XMAX + 100; x += 26) plane(4, 360, '#8d8a86', x, 0.64, -222);

function windowTex(base, win) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  g.fillStyle = win; for (let y = 8; y < 64; y += 16) for (let x = 6; x < 64; x += 16) g.fillRect(x, y, 8, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
}
const bPal = [['#c9b9a5', '#7f8b96'], ['#a7adb8', '#6d7480'], ['#d8cbb6', '#8a96a0'], ['#b49a85', '#6f7c88'], ['#e1d6c4', '#93a3b0'], ['#8e98a6', '#5f6875'], ['#a8573f', '#6b7c8a']];
const bTex = bPal.map(([b, w]) => windowTex(b, w));
const nearBuildings = [];
function building(x, z, w, d, h) {
  const tex = bTex[Math.floor(rnd() * bTex.length)].clone(); tex.needsUpdate = true; tex.repeat.set(w / 4, h / 4);
  const b = mesh(BOX, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, flatShading: true }), true, true);
  b.scale.set(w, h, d); b.position.set(x, h / 2 + 0.6, z); scene.add(b);
  if (h > 60 && rnd() < 0.6) scene.add(box(w * 0.4, h * 0.25, d * 0.4, '#c7b49b', x, h + h * 0.125 + 0.6, z));
  return { x, z, w, d, h };
}
for (let i = 0; i < 230; i++) { const h = rnd() < 0.14 ? R(55, 120) : R(14, 42); building(R(XMIN - 120, XMAX + 120), R(-118, -290), R(8, 20), R(8, 18), h); }
for (let x = XMIN; x < XMAX; x += R(14, 26)) nearBuildings.push(building(x, R(-74, -92), R(10, 18), R(8, 12), R(14, 34)));

// lamps
const lampGeo = new THREE.CylinderGeometry(0.09, 0.12, 4.2, 6), lampHead = new THREE.SphereGeometry(0.35, 8, 6);
for (let x = XMIN; x <= XMAX; x += 11) for (const z of [-4.3, 12.2]) {
  const g = new THREE.Group(); const p = mesh(lampGeo, M('#2f2f33')); p.position.y = 2.1; g.add(p);
  const h = mesh(lampHead, M('#fff1cf', { emissive: '#ffdca0', emissiveIntensity: 0.6 })); h.position.y = 4.35; g.add(h);
  g.position.set(x + (z > 0 ? 5 : 0), 0, z); scene.add(g);
}
// clouds
const clouds = []; const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
for (let i = 0; i < 46; i++) {
  const g = new THREE.Group(); const n = 4 + Math.floor(rnd() * 4);
  for (let j = 0; j < n; j++) { const s = mesh(cloudGeo, M('#fbf3ea', { emissive: '#f3d8b8', emissiveIntensity: 0.25 }), false, false); const r = R(5, 11); s.scale.set(r * 1.4, r * 0.8, r); s.position.set(j * 7 - n * 3.5 + R(-2, 2), R(-1.5, 2), R(-3, 3)); g.add(s); }
  g.position.set(R(-1000, 600), R(70, 125), R(-200, -320)); g.userData.x0 = g.position.x; scene.add(g); clouds.push(g);
}

// =================== actors ===================
const actors = [];
const shirts = ['#d9822b', '#c23b3b', '#2f5d8a', '#e8d6a8', '#4b8b5a', '#f2f0ea', '#7a4a8c', '#e0b040', '#1f2a3a', '#b5563a', '#5aa0c8'];
const pantsC = ['#23324d', '#2b2b2e', '#5a4632', '#3a4a5c', '#6b6b6b', '#1d1d22'];
const skins = ['#e9c4a2', '#d7a47e', '#b98260', '#f1d2b6', '#8d5a3c'];
const hairs = ['#2a1d14', '#5b3a20', '#d9b36a', '#1a1a1a', '#8a8a8a', '#7a3a1a'];
function makePerson() {
  const outer = new THREE.Group(); const body = new THREE.Group(); body.position.y = -0.95; outer.add(body);
  const shirt = pick(shirts), pants = pick(pantsC), skin = pick(skins); const legs = [], arms = [];
  for (const sx of [-0.14, 0.14]) { const hip = new THREE.Group(); hip.position.set(sx, 0.86, 0); body.add(hip); hip.add(box(0.22, 0.86, 0.26, pants, 0, -0.43, 0)); hip.add(box(0.24, 0.12, 0.34, '#1b1b1b', 0, -0.82, 0.04)); legs.push(hip); }
  body.add(box(0.58, 0.68, 0.32, shirt, 0, 1.2, 0));
  for (const sx of [-0.37, 0.37]) { const sh = new THREE.Group(); sh.position.set(sx, 1.5, 0); body.add(sh); sh.add(box(0.16, 0.62, 0.18, shirt, 0, -0.3, 0)); sh.add(box(0.14, 0.14, 0.15, skin, 0, -0.66, 0)); arms.push(sh); }
  body.add(box(0.33, 0.36, 0.33, skin, 0, 1.73, 0));
  if (rnd() < 0.85) body.add(box(0.35, 0.12, 0.35, pick(hairs), 0, 1.94, -0.01));
  return { outer, legs, arms };
}
function addLoose(obj, x, y, z, opt = {}) {
  obj.position.set(x, y, z); scene.add(obj);
  const a = { obj, kind: opt.kind || 'thing', pos: obj.position, vel: new THREE.Vector3(), walk: opt.walk || null, f: opt.f ?? R(0.88, 1.04), vy0: opt.vy0 ?? R(0.2, 1.0),
    spin: opt.spin || new THREE.Vector3(R(-0.5, 0.5), R(-0.5, 0.5), -R(0.8, 2.4)), lag: opt.lag ?? R(0, 0.12), floor: opt.floor ?? 0.3, launched: false, ...opt.extra };
  actors.push(a); return a;
}
const LX0 = -160, LX1 = 60;  // loose objects population
const POV_X0 = 0;            // where "you" stand
for (let i = 0; i < 330; i++) {
  const p = makePerson();
  const x = R(LX0, LX1), z = rnd() < 0.2 ? R(-5.2, -3.5) : R(0, 16.5);
  if (Math.abs(z - 14) < 1.4 && Math.abs(x - POV_X0) < 18) continue;
  const moving = rnd() < 0.7; const heading = rnd() < 0.5 ? 0 : Math.PI;
  p.outer.rotation.y = heading + (moving ? (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : R(-1, 1));
  addLoose(p.outer, x, 0.95, z, { kind: 'person', floor: 0.45, walk: moving ? { speed: R(1.1, 1.6), phase: R(0, 6) } : null, extra: { person: p, idlePhase: R(0, 6) } });
}
for (let i = 0; i < 44; i++) {
  const g = new THREE.Group(); g.add(box(1.8, 0.1, 0.5, '#8a5a34', 0, 0, 0)); g.add(box(1.8, 0.45, 0.08, '#8a5a34', 0, 0.28, -0.24));
  for (const sx of [-0.75, 0.75]) g.add(box(0.08, 0.45, 0.45, '#2b2b2b', sx, -0.24, 0));
  addLoose(g, R(LX0, LX1), 0.47, pick([11.6, 16.4, 0.2]) + R(-0.2, 0.2), { kind: 'bench', f: R(0.78, 0.92), vy0: R(0.1, 0.5), spin: new THREE.Vector3(R(-1, 1), R(-1, 1), -R(0.6, 1.6)) });
}
const binGeo = new THREE.CylinderGeometry(0.3, 0.26, 0.8, 8);
for (let i = 0; i < 30; i++) addLoose(mesh(binGeo, M('#3b4a3d')), R(LX0, LX1), 0.4, pick([12.5, 15.5, -0.6]), { kind: 'bin' });
const carCols = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#e8b923', '#6d7a83', '#3d6b4a'];
const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10); wheelGeo.rotateX(Math.PI / 2);
for (let i = 0; i < 26; i++) {
  const g = new THREE.Group(); const taxi = rnd() < 0.35; const c = taxi ? '#f2c12e' : pick(carCols);
  g.add(box(4.2, 0.75, 1.8, c, 0, 0, 0)); g.add(box(2.3, 0.62, 1.6, c, -0.2, 0.66, 0)); g.add(box(2.1, 0.5, 1.64, '#8fb0c8', -0.2, 0.66, 0));
  if (taxi) g.add(box(0.5, 0.18, 0.3, '#fff6d8', -0.2, 1.06, 0));
  for (const wx of [-1.35, 1.35]) for (const wz of [-0.9, 0.9]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, -0.38, wz); g.add(w); }
  const lane = rnd() < 0.5 ? -5.4 : -8.2; g.rotation.y = lane < -6.8 ? Math.PI : 0;
  addLoose(g, R(LX0, LX1), 0.75, lane, { kind: 'car', floor: 0.75, f: R(0.82, 0.95), vy0: R(0.05, 0.4), walk: { speed: R(9, 13) * (lane < -6.8 ? -1 : 1) }, spin: new THREE.Vector3(R(-1.2, -0.3), R(-0.3, 0.3), -R(0.3, 1.0)) });
}
for (let i = 0; i < 14; i++) {
  const g = new THREE.Group(); g.add(box(5, 0.8, 1.8, '#e8e4da', 0, 0, 0)); g.add(box(2, 0.9, 1.4, pick(['#355d82', '#b8423a', '#2f6b55']), -0.4, 0.8, 0));
  addLoose(g, R(LX0 + 20, LX1 + 20), -0.25, R(-36, -16), { kind: 'boat', floor: -0.3, f: R(0.92, 1.05), vy0: R(0.3, 1.0), walk: { speed: R(-2, 2) }, spin: new THREE.Vector3(R(-0.6, 0.6), R(-0.3, 0.3), -R(0.4, 1.2)) });
}
const birdGeo = new THREE.BufferGeometry();
birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.5, 0, 0.45, 0, 0, 0.25, 0, 0, 0, 0.5, 0, 0.45, 0, 0, 0.25], 3));
const birdMat = new THREE.MeshBasicMaterial({ color: '#2a2a2e', side: THREE.DoubleSide });
for (let i = 0; i < 44; i++) {
  const a = addLoose(new THREE.Mesh(birdGeo, birdMat), R(LX0, LX1), R(8, 22), R(-30, 20), { kind: 'bird', f: R(1.0, 1.06), vy0: R(-0.2, 0.3), spin: new THREE.Vector3(R(-2, 2), R(-2, 2), R(-3, 3)), extra: { ang: R(0, 6), rad: R(4, 12), w: R(0.4, 0.9) } });
  a.cx = a.pos.x; a.cz = a.pos.z; a.cy = a.pos.y;
}

// trees
const trees = [];
const autumn = ['#5f8d3a', '#7a9a3a', '#d98b2b', '#e0b33a', '#c4562a', '#6c8f35', '#b98a2e', '#4f7a34'];
const foliageGeo = new THREE.IcosahedronGeometry(1, 0);
const noTree = [[45, 19, 8], [125, 24, 6], [62, 4, 9]]; // camera spots [x, z, radius]
function makeTree(x, z, s) {
  for (const [cx, cz, r] of noTree) if (Math.hypot(x - cx, z - cz) < r) return;
  const pivot = new THREE.Group(); pivot.position.set(x, 0, z); scene.add(pivot);
  const tr = mesh(new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 3.2 * s, 6), M('#5b3f2a')); tr.position.y = 1.6 * s; pivot.add(tr);
  const blobs = []; const n = 3 + Math.floor(rnd() * 3); const col = pick(autumn);
  for (let i = 0; i < n; i++) {
    const r = R(1.2, 2.0) * s; const b = mesh(foliageGeo, M(rnd() < 0.7 ? col : pick(autumn))); b.scale.set(r, r * R(0.85, 1.1), r);
    b.position.set(R(-1, 1) * s, (3.4 + R(0, 1.8)) * s, R(-1, 1) * s); b.rotation.set(R(0, 3), R(0, 3), R(0, 3)); pivot.add(b); blobs.push(b);
  }
  trees.push({ pivot, blobs, stiff: R(0.6, 1.2), snapAt: rnd() < 0.4 ? 2 + 40 * rnd() : Infinity, phase: R(0, 6), detachAt: blobs.map(() => 0.4 + 38 * Math.pow(rnd(), 1.5)), snapped: false });
}
for (let i = 0; i < 300; i++) { let z = R(1, 24); const x = R(XMIN, XMAX); if (Math.abs(z - 14) < 2.3) z += 4; if (x > -20 && x < 130 && Math.abs(z - 14) < 5) continue; makeTree(x, z, R(0.9, 1.35)); }
for (let x = XMIN; x < XMAX; x += R(6, 10)) makeTree(x, R(-1.8, -0.8), R(0.9, 1.2));
for (let x = XMIN; x < XMAX; x += R(5, 9)) makeTree(x, R(-52, -48), R(1.0, 1.4));

// =================== POV hands ===================
const hands = new THREE.Group(); camera.add(hands); hands.visible = false;
const handParts = [];
for (const side of [-1, 1]) {
  const arm = new THREE.Group(); arm.position.set(0.17 * side, -0.6, -0.2); hands.add(arm);
  const sleeve = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: '#25324c', roughness: 0.9, flatShading: true })); sleeve.scale.set(0.075, 0.075, 0.42); sleeve.position.z = -0.21; arm.add(sleeve);
  const hand = new THREE.Group(); hand.position.z = -0.44; arm.add(hand);
  const skinM = new THREE.MeshStandardMaterial({ color: '#e7b48e', roughness: 0.8, flatShading: true });
  const palm = new THREE.Mesh(BOX, skinM); palm.scale.set(0.1, 0.028, 0.1); palm.position.z = -0.045; hand.add(palm);
  for (let f = 0; f < 4; f++) { const fi = new THREE.Mesh(BOX, skinM); fi.scale.set(0.021, 0.024, 0.075); fi.position.set(-0.036 + f * 0.024, 0, -0.13); hand.add(fi); }
  const th = new THREE.Mesh(BOX, skinM); th.scale.set(0.024, 0.024, 0.06); th.position.set(-0.06 * side, 0, -0.03); th.rotation.y = 0.6 * side; hand.add(th);
  handParts.push({ arm, hand, side });
}
hands.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });

// =================== particles ===================
const dummy = new THREE.Object3D();
function makeParticles(n, geo, mat, spawnFn) {
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = false; scene.add(im);
  const P = []; for (let i = 0; i < n; i++) P.push(spawnFn(i));
  if (P.some(p => p.color)) P.forEach((p, i) => im.setColorAt(i, new THREE.Color(p.color || '#ffffff')));
  return { im, P };
}
const leaves = makeParticles(3200, new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 }), () => ({
  t0: Math.pow(rnd(), 0.8) * 22, x0: R(-90, 90), y0: R(0.3, 13), z0: R(-6, 29), sp: R(1.0, 1.3), color: pick(autumn), r: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-9, 9), R(-9, 9), R(-9, 9)], ph: R(0, 6), s: 1 }));
const dust = makeParticles(2400, new THREE.TetrahedronGeometry(0.12), new THREE.MeshStandardMaterial({ roughness: 1 }), () => ({
  t0: rnd() * 20, x0: R(-90, 90), y0: R(0.05, 2.5), z0: R(-6, 29), sp: R(1.0, 1.3), color: pick(['#cdb48e', '#b89a72', '#d8c39f', '#8a7a64']), r: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-6, 6), R(-6, 6), R(-6, 6)], ph: R(0, 6), s: R(0.8, 1.2) }));
const spray = makeParticles(2000, new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: '#f3f7fb', roughness: 0.4, emissive: '#9fb7c8', emissiveIntensity: 0.3 }), () => ({
  t0: rnd() * 45, x0: R(-90, 90), z0: R(-41, -12), vy: R(0.4, 2.4), sp: R(1.0, 1.3), s: R(0.25, 0.9), r: [0, 0, 0], w: [R(-4, 4), R(-4, 4), R(-4, 4)] }));
const glass = makeParticles(2600, new THREE.PlaneGeometry(1.3, 1.0), new THREE.MeshStandardMaterial({ color: '#cfe6f2', roughness: 0.1, metalness: 0.6, emissive: '#7fa4bd', emissiveIntensity: 0.35, side: THREE.DoubleSide }), () => {
  const b = pick(nearBuildings);
  return { t0: R(8, 48), x0: b.x + R(-b.w / 2, b.w / 2), y0: R(3, b.h), z0: b.z + b.d / 2 + 0.3, vz: R(0.3, 2.0), vy: R(-0.2, 0.6), sp: R(0.85, 1.05), r: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-5, 5), R(-5, 5), R(-5, 5)] };
});
const streakMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
const streaks = makeParticles(420, new THREE.BoxGeometry(5, 0.035, 0.035), streakMat, () => ({ x0: R(-80, 80), y0: R(0.5, 30), z0: R(-40, 30), sp: R(1.8, 2.6) }));
function hideAll(g) { for (let i = 0; i < g.P.length; i++) { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); g.im.setMatrixAt(i, dummy.matrix); } g.im.instanceMatrix.needsUpdate = true; }
[leaves, dust, spray, glass, streaks].forEach(hideAll);

// =================== SPACE scene (globe) ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#020308');
const spaceCam = new THREE.PerspectiveCamera(38, W / H, 0.1, 2000);
{
  const n = 5000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(800); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
}
space.add(new THREE.AmbientLight(0x404a60, 0.6));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 3.0); space.add(spaceSun);
const ER = 10;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const NYC = ll2v(40.71, -74.0);
const globe = new THREE.Group(); space.add(globe);
const arcs = [];
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry];
  const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) {
    if (ring.every(([, la]) => la < -55)) continue;
    let prev = ring[0][0], off = 0; const pts = [];
    for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); }
  }
  const img = g.getImageData(0, 0, MW, MH).data;
  const isLand = (lat, lon) => { const x = Math.floor((lon + 180) / 360 * MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 44); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
    const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6');
    else if (isLand(lat, lon)) {
      if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447');
      c.offsetHSL(0, 0, j);
    } else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  // atmosphere glow
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.07, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.4; }'
  })); globe.add(atm);
  // NYC marker
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
  ring.position.copy(NYC.clone().multiplyScalar(1.012)); ring.lookAt(NYC.clone().multiplyScalar(2)); globe.add(ring);
  // eastward motion arcs: length ∝ rotation speed (cos lat)
  const arcMatW = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 });
  const arcMatO = new THREE.MeshBasicMaterial({ color: '#f4a548', transparent: true, opacity: 0.95 });
  for (let lat = -70; lat <= 70; lat += 7) {
    const sp = Math.cos(lat * Math.PI / 180); const len = 22 * sp; const n = 6;
    for (let k = 0; k < n; k++) {
      const pts = []; for (let i = 0; i <= 16; i++) pts.push(ll2v(lat, -len / 2 + len * i / 16, ER * 1.035));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.03 + 0.02 * sp, 5, false), Math.abs(lat - 42) < 4 ? arcMatO : arcMatW);
      const holder = new THREE.Group(); holder.add(tube); holder.userData = { sp, ph: k * 360 / n + R(0, 40) }; globe.add(holder); arcs.push(holder);
    }
  }
  // cloud wisps
  for (let i = 0; i < 160; i++) {
    const v = ll2v(R(-60, 65), R(-180, 180), ER * 1.02); const s = mesh(cloudGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, flatShading: true }), false, false);
    s.position.copy(v); s.lookAt(0, 0, 0); s.scale.set(R(0.3, 0.9), R(0.15, 0.4), 0.05); globe.add(s);
  }
}

// =================== shots ===================
const shots = [
  { a: 0, b: T0 + 5, kind: 'wideA', cx: 0 },
  { a: 10, b: 15.5, kind: 'pov' },
  { a: 15.5, b: 21, kind: 'ground', cx: 45 },
  { a: 21, b: 26.5, kind: 'skyline', cx: 57 },
  { a: 26.5, b: 32, kind: 'trees', cx: 125 },
  { a: 32, b: 37.5, kind: 'river', cx: 160 },
  { a: 37.5, b: 43, kind: 'top', cx: 205 },
  { a: 43, b: 49.5, kind: 'space' },
  { a: 49.5, b: 99, kind: 'wideA2', cx: 280 },
];
const shotAt = t => shots.find(s => t >= s.a && t < s.b) || shots[shots.length - 1];
function setCamera(t) {
  const s = shotAt(t), u = t - s.a, te = t - T0; let cam, look, up = new THREE.Vector3(0, 1, 0), fov = 52, cx = s.cx ?? 0;
  hands.visible = false;
  if (s.kind === 'wideA') { const p = smooth(0, T0, t) * 3 + Math.max(0, te) * 0.4; cam = new THREE.Vector3(1, 28 - p * 0.3, 46 - p); look = new THREE.Vector3(0, 0, -22); }
  else if (s.kind === 'wideA2') { cam = new THREE.Vector3(cx + 1, 26, 43 - Math.min(u, 6) * 0.3); look = new THREE.Vector3(cx, 0, -22); }
  else if (s.kind === 'pov') {
    const xv = POV_X0 + V * te; cx = xv;
    cam = new THREE.Vector3(xv, 2.3 + 0.35 * Math.sin(te * 0.9), 14 + 0.5 * Math.sin(te * 0.6));
    look = cam.clone().add(new THREE.Vector3(10, -1.3 + 0.4 * Math.sin(te * 0.7), -2.5 + 2 * Math.sin(te * 0.35)));
    fov = 74; hands.visible = true;
  }
  else if (s.kind === 'ground') { cam = new THREE.Vector3(cx - 0.5 + u * 0.35, 1.9 + u * 0.05, 21.5 - u * 0.15); look = new THREE.Vector3(cx + 1.5 + u * 0.3, 2.4, 4); fov = 62; }
  else if (s.kind === 'skyline') { cam = new THREE.Vector3(cx + u * 0.6, 11, 10.5); look = new THREE.Vector3(cx + 8 + u * 0.6, 17, -120); fov = 44; }
  else if (s.kind === 'trees') { cam = new THREE.Vector3(cx + u * 0.4, 1.8, 26); look = new THREE.Vector3(cx - 6, 5.5, 6); fov = 60; }
  else if (s.kind === 'river') { cam = new THREE.Vector3(cx + u * 0.6, 4.2, -10.6); look = new THREE.Vector3(cx + 45 + u * 0.6, -1.5, -27); fov = 60; }
  else if (s.kind === 'top') { cam = new THREE.Vector3(cx, 62 + u * 4, 4 + u * 0.3); look = new THREE.Vector3(cx, 0, -6 + u * 0.3); up = new THREE.Vector3(0, 0, -1); fov = 50; }
  if (s.kind === 'space') return { space: true, s, u };
  let shake = 0;
  if (te >= 0 && te < 3) shake = 0.9 * Math.exp(-te * 3.2);
  if (t >= T1) shake = Math.max(shake, 1.1 * Math.exp(-(t - T1) * 2.6));
  if (te >= 0 && t < T1) shake += s.kind === 'pov' ? 0.12 : 0.07;
  const sh = new THREE.Vector3(Math.sin(t * 47.1) + Math.sin(t * 23.3), Math.sin(t * 39.7 + 1) + Math.sin(t * 19.1), Math.sin(t * 31.3 + 2)).multiplyScalar(shake * 0.5);
  camera.up.copy(up); camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.copy(cam).add(sh); camera.lookAt(look.clone().add(sh.clone().multiplyScalar(0.4)));
  if (s.kind === 'pov') camera.rotateZ(0.12 * Math.sin(te * 1.1));
  // shadows follow the shot
  sun.position.set(cx - 70, 55, -30); sun.target.position.set(cx, 0, 5); sun.target.updateMatrixWorld();
  return { space: false, s, u, cx };
}

// =================== simulation ===================
let simT = 0; const tmp = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
let restarted = false;
function step(t, dt) {
  const te = t - T0;
  if (t >= T1 && !restarted) {
    restarted = true;
    for (const a of actors) { if (a.launched) { a.vel.x = R(-0.4, 0.4); a.vel.y = Math.min(a.vel.y, 0.5); a.spin.multiplyScalar(0.5); } }
  }
  for (const a of actors) {
    if (te < 0) {
      if (a.kind === 'person') {
        const p = a.person;
        if (a.walk) {
          const dir = tmp.set(0, 0, 1).applyAxisAngle(Y, a.obj.rotation.y); a.pos.addScaledVector(dir, a.walk.speed * dt);
          const ph = t * a.walk.speed * 4.2 + a.walk.phase;
          p.legs[0].rotation.x = Math.sin(ph) * 0.5; p.legs[1].rotation.x = -Math.sin(ph) * 0.5;
          p.arms[0].rotation.x = -Math.sin(ph) * 0.45; p.arms[1].rotation.x = Math.sin(ph) * 0.45;
          a.pos.y = 0.95 + Math.abs(Math.cos(ph)) * 0.04;
        } else p.arms[0].rotation.x = Math.sin(t * 1.3 + a.idlePhase) * 0.08;
      } else if (a.kind === 'car' || a.kind === 'boat') {
        a.pos.x += a.walk.speed * dt; if (a.kind === 'boat') a.pos.y = -0.25 + Math.sin(t * 1.5 + a.pos.x) * 0.05;
      } else if (a.kind === 'bird') {
        a.ang += a.w * dt; a.pos.set(a.cx + Math.cos(a.ang) * a.rad, a.cy + Math.sin(a.ang * 2) * 0.6, a.cz + Math.sin(a.ang) * a.rad);
        a.obj.rotation.y = -a.ang; a.obj.rotation.z = Math.sin(t * 11 + a.rad) * 0.25;
      }
      continue;
    }
    if (!restarted) {
      // Earth stopped: everything loose keeps its 789 mph relative to the halted ground
      const k = 1 - Math.exp(-Math.max(0, te - a.lag) / 0.22);
      a.vel.x = V * a.f * k;
      if (!a.launched && te >= a.lag) { a.launched = true; a.vel.y = a.vy0; }
      if (a.launched) {
        if (a.kind !== 'bird') {
          a.vel.y -= 0.3 * dt; a.pos.y += a.vel.y * dt;
          if (a.pos.y < a.floor) { a.pos.y = a.floor; a.vel.y = Math.abs(a.vel.y) * 0.55 + R(0.1, 0.5); a.spin.multiplyScalar(0.92); }
        } else a.pos.y += a.vy0 * dt * 0.5;
        const sk = Math.min(1, (te - a.lag) / 0.4);
        a.obj.rotation.x += a.spin.x * dt * sk; a.obj.rotation.y += a.spin.y * dt * sk; a.obj.rotation.z += a.spin.z * dt * sk;
        if (a.kind === 'person') {
          const p = a.person, fl = Math.sin(t * 9 + a.idlePhase);
          p.arms[0].rotation.x = -2.6 + fl * 0.4; p.arms[1].rotation.x = -2.3 - fl * 0.4;
          p.legs[0].rotation.x = 0.5 + fl * 0.3; p.legs[1].rotation.x = -0.4 - fl * 0.3;
        }
      }
      if (a.kind === 'blob') { const k2 = Math.max(0.3, 1 - (te - a.obj.userData.td) * 0.5); a.obj.scale.copy(a.obj.userData.s0).multiplyScalar(k2); }
      a.pos.x += a.vel.x * dt;
      a.pos.z += Math.sin(t * 0.7 + a.pos.x * 0.1) * 0.15 * dt;
    } else {
      // Earth spins again: ground catches up with everything -> relative motion stops, things drop (real time now)
      if (a.kind === 'bird') { a.pos.x += a.vel.x * dt; a.obj.rotation.z = Math.sin(t * 12) * 0.3; continue; }
      a.vel.y -= 9.8 * dt; a.pos.y += a.vel.y * dt; a.pos.x += a.vel.x * dt;
      const fl = a.floor;
      if (a.pos.y < fl) { a.pos.y = fl; a.vel.y = Math.abs(a.vel.y) > 1.5 ? Math.abs(a.vel.y) * 0.3 : 0; a.vel.x *= 0.6; a.spin.multiplyScalar(0.4); }
      a.obj.rotation.x += a.spin.x * dt; a.obj.rotation.z += a.spin.z * dt;
    }
  }
  if (te < 0) { for (const tr of trees) tr.pivot.rotation.z = Math.sin(t * 1.1 + tr.phase) * 0.02; return; }
  for (const tr of trees) {
    if (tr.snapped) continue;
    if (!restarted) {
      const bend = -(0.55 / tr.stiff) * smooth(0, 0.9, te) - Math.sin(t * 13 + tr.phase) * 0.05 * smooth(0, 0.5, te);
      tr.pivot.rotation.z = Math.max(bend, -1.05);
      tr.blobs.forEach((b, i) => {
        if (b.parent === tr.pivot && te > tr.detachAt[i]) {
          scene.attach(b); b.userData.s0 = b.scale.clone(); b.userData.td = te;
          actors.push({ obj: b, kind: 'blob', pos: b.position, vel: new THREE.Vector3(), f: R(0.95, 1.1), vy0: R(0.3, 1.0), spin: new THREE.Vector3(R(-2, 2), R(-2, 2), -R(1, 3)), lag: te, floor: 0.4, launched: false });
        }
      });
      if (te > tr.snapAt) { tr.snapped = true; actors.push({ obj: tr.pivot, kind: 'tree', pos: tr.pivot.position, vel: new THREE.Vector3(), f: R(0.78, 0.9), vy0: R(0.2, 0.6), spin: new THREE.Vector3(R(-0.4, 0.4), R(-0.4, 0.4), -R(0.6, 1.4)), lag: te, floor: 0.2, launched: false }); }
    } else {
      // trees whip back when the ground jerks forward again
      const r = t - T1; tr.pivot.rotation.z = -0.55 / tr.stiff * Math.exp(-r * 2.5) * Math.cos(r * 9) + 0.25 * Math.exp(-r * 1.5) * Math.sin(r * 9);
    }
  }
}

function flightX(p, age) { return p.x0 + V * p.sp * age; }
function updateParticles(t, cx) {
  const te = t - T0, ter = Math.min(te, TE1), post = Math.max(0, te - TE1);
  for (const [g, kind] of [[leaves, 'leaf'], [dust, 'dust'], [spray, 'spray'], [glass, 'glass']]) {
    g.P.forEach((p, i) => {
      const age = ter - p.t0; let x, y, z, sc = 1;
      if (te < 0 || age < 0) { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); g.im.setMatrixAt(i, dummy.matrix); return; }
      if (kind === 'spray') {
        x = wrap(flightX(p, age), cx, 90); y = -0.5 + p.vy * age - 0.25 * age * age; z = p.z0 + Math.sin(age * 2 + p.x0) * 0.4;
        if (y < -0.7 || age > 6) sc = 0; else sc = p.s * smooth(0, 0.25, age);
        if (post > 0) { y -= 9.8 * post * post * 0.5; if (y < -0.7) sc = 0; }
      } else if (kind === 'glass') {
        x = flightX(p, age); y = p.y0 + p.vy * age - 0.04 * age * age; z = p.z0 + p.vz * age;
        if (post > 0) y -= 4.9 * post * post;
        if (y < 0.7) { y = 0.7; } sc = smooth(0, 0.2, age);
      } else {
        x = wrap(flightX(p, age) + Math.sin(age * 3 + p.ph) * 0.6, cx, 90);
        y = p.y0 + Math.sin(age * 2.3 + p.ph) * 0.8 + (kind === 'dust' ? age * 0.05 : 0);
        z = p.z0 + Math.cos(age * 1.7 + p.ph) * 0.8;
        if (post > 0) { y -= (kind === 'leaf' ? 1.3 : 0.6) * post; x += Math.sin(post * 2 + p.ph) * 0.3; }
        if (y < 0.05) y = 0.05;
        sc = smooth(0, 0.3, age) * p.s;
      }
      dummy.position.set(x, y, z);
      const rr = post > 0 && kind !== 'leaf' ? Math.min(age, age) : age;
      dummy.rotation.set(p.r[0] + p.w[0] * rr, p.r[1] + p.w[1] * rr, p.r[2] + p.w[2] * rr);
      dummy.scale.setScalar(sc); dummy.updateMatrix(); g.im.setMatrixAt(i, dummy.matrix);
    });
    g.im.instanceMatrix.needsUpdate = true;
  }
  streakMat.opacity = 0.32 * smooth(0, 0.8, te) * (1 - smooth(0, 0.3, post));
  streaks.P.forEach((p, i) => {
    if (te < 0) dummy.scale.setScalar(0);
    else { dummy.position.set(wrap(p.x0 + V * p.sp * ter, cx, 80), p.y0, p.z0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); }
    dummy.updateMatrix(); streaks.im.setMatrixAt(i, dummy.matrix);
  });
  streaks.im.instanceMatrix.needsUpdate = true;
}

function updateRiver(t) {
  const te = Math.max(0, t - T0), ter = Math.min(te, TE1), post = Math.max(0, te - TE1);
  const A = (0.12 + 0.75 * smooth(0, 2.5, te)) * (post > 0 ? 0.4 + 0.6 * Math.exp(-post * 0.5) : 1);
  const pos = riverGeo.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    const x = riverBase[i] + XC, z = riverBase[i + 2];
    let h = Math.sin(x * 0.25 + t * 1.2) * 0.06 + Math.cos(z * 0.6 + t) * 0.05;
    if (te > 0) {
      const xs = post > 0 ? -V * 1.3 * ter + Math.sin(post * 3) * 2 : -V * 1.3 * ter;
      h += A * (0.55 * Math.sin(0.32 * (x + xs) + z * 0.25) + 0.3 * Math.sin(0.9 * (x + xs * 1.2) - z * 0.5));
    }
    pos[i + 1] = h;
  }
  riverGeo.attributes.position.needsUpdate = true; riverGeo.computeVertexNormals();
}

function updateWorld(t) {
  const te = t - T0;
  const dustK = smooth(0.5, 15, te) * 0.8;
  scene.fog.color.copy(fogCalm).lerp(fogDust, dustK);
  scene.fog.near = 90 - 50 * dustK; scene.fog.far = 360 - 130 * dustK;
  scene.background = te > 0 && dustK > 0.45 ? skyStorm : skyCalm;
  sun.intensity = 2.6 - 1.0 * dustK; hemi.intensity = 1.1 - 0.2 * dustK;
  const ter = Math.min(Math.max(0, te), TE1);
  clouds.forEach(c => { c.position.x = c.userData.x0 + t * 0.6 + ter * V * 2.2; });
  // POV hands flail against the wind
  const k = smooth(0, 0.6, te);
  handParts.forEach(({ arm, hand, side }) => {
    arm.rotation.x = 0.8 + 0.1 * Math.sin(t * 2.3 + side) * k;
    arm.rotation.y = 0.12 * side + 0.06 * Math.sin(t * 1.7 + side * 2) * k;
    arm.rotation.z = 0.15 * Math.sin(t * 2.9 + side) * k;
    hand.rotation.x = 0.55 + 0.2 * Math.sin(t * 4 + side);
  });
}

function updateSpace(t, u) {
  const d = 74 - u * 2.2;
  const dir = NYC.clone().normalize();
  const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  spaceCam.position.copy(dir.clone().multiplyScalar(d)).addScaledVector(side, -6 + u * 0.4).add(new THREE.Vector3(0, -6, 0));
  spaceCam.up.set(0, 1, 0); spaceCam.lookAt(new THREE.Vector3(0, -1.5, 0));
  spaceSun.position.copy(dir.clone().multiplyScalar(30)).addScaledVector(side, 30).add(new THREE.Vector3(0, 12, 0));
  const ter = Math.min(Math.max(0, t - T0), TE1);
  arcs.forEach(h => { h.rotation.y = (h.userData.ph + h.userData.sp * ter * 9) * Math.PI / 180; });
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'slow', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'cracks'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.3) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const fmt = sec => { sec = Math.max(0, sec); const s = Math.floor(sec); const ms = Math.floor((sec - s) * 1000 + 1e-6); return `0:0${s}.${String(Math.min(ms, 999)).padStart(3, '0')}`; };
const ftAt = te => Math.round(MPS * 3.28084 * Math.min(te, TE1) / SLOW).toLocaleString('en-US');
const captions = [
  [2.6, 4.95, "You're by the East River, New York."],
  [5.4, 9.85, 'The ground just stopped.<br>You didn\'t.'],
  [10.3, 15.35, "You're still flying east<br>at 789 mph."],
  [15.8, 20.85, "So is everything<br>that isn't bolted down."],
  [21.3, 26.35, "The air didn't stop either.<br>It's faster than sound."],
  [26.8, 31.85, "That's 2.6× the strongest<br>tornado ever measured."],
  [32.3, 37.35, 'The East River surges east<br>like a tsunami.'],
  [37.8, 42.85, 'Everything slides east.<br>Nothing can slow it down.'],
  [43.3, 49.35, "It's happening everywhere at once.<br>Fastest at the equator."],
  [49.8, 54.85, 'And then…<br>the ground starts spinning again.'],
  [55.6, 60.3, 'Everything stops dead and falls.<br>That was one second.'],
];
const subs = [
  [0, 5, "NEW YORK · 789 MPH AROUND EARTH'S AXIS"], [5, 15.5, 'YOUR SPEED · 789 MPH EAST'], [15.5, 21, 'FASTER THAN A JETLINER · ~575 MPH'],
  [21, 26.5, 'SPEED OF SOUND · 767 MPH'], [26.5, 32, 'STRONGEST TORNADO · 302 MPH'], [32, 37.5, 'WATER SPEED · 1,157 FT PER SECOND'],
  [37.5, 43, null], [43, 49.5, 'EQUATOR · 1,040 MPH  ·  POLES · 0 MPH'], [49.5, 55, null], [55, 99, 'EARTH STOPPED FOR · 1.000 SECOND'],
];
function buildCracks() {
  const svg = el.cracks; let s = '';
  for (const [cx, cy, n] of [[300, 640, 13], [820, 1180, 11], [180, 1560, 9]]) {
    for (let i = 0; i < n; i++) {
      let a = i / n * Math.PI * 2 + R(-0.2, 0.2), x = cx, y = cy; let d = `M${cx},${cy}`; const L = R(160, 520);
      for (let l = 0; l < L; l += R(25, 60)) { a += R(-0.35, 0.35); x += Math.cos(a) * R(25, 60); y += Math.sin(a) * R(25, 60); d += ` L${x.toFixed(1)},${y.toFixed(1)}`; }
      s += `<path d="${d}" stroke="rgba(255,255,255,.85)" stroke-width="${R(1.5, 3).toFixed(1)}" fill="none"/>`;
    }
    for (const rr of [R(40, 70), R(110, 160)]) {
      let d = ''; const a0 = R(0, 6), a1 = a0 + R(2, 4.5);
      for (let a = a0; a < a1; a += 0.3) { const r = rr * R(0.85, 1.15); d += `${d ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `; }
      s += `<path d="${d}" stroke="rgba(255,255,255,.7)" stroke-width="1.6" fill="none"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(255,255,255,.9)"/>`;
  }
  svg.innerHTML = s;
}

function updateDOM(t) {
  const te = t - T0;
  el.title.style.opacity = fadeWin(t, 0.1, 2.55, 0.3);
  el.flash.style.opacity = (te >= 0 ? 0.55 * Math.exp(-te * 9) : 0) + (t >= T1 ? 0.8 * Math.exp(-(t - T1) * 7) : 0);
  el.cracks.style.opacity = t >= T1 ? 1 - smooth(T_END - 0.2, T_END + 0.3, t) : 0;
  let slow = '', lab, val, sub = '';
  if (t < T0) { lab = 'EARTH STOPS IN'; val = fmt(T0 - t); }
  else if (t < T1) { slow = '<b></b>TIME SLOWED DOWN 50×'; lab = 'EARTH SPINS AGAIN IN'; val = fmt((T1 - t) / SLOW); }
  else { lab = "EARTH'S SPIN"; val = 'BACK'; }
  const sb = subs.find(([a, b]) => t >= a && t < b);
  sub = sb && sb[2] ? sb[2] : `DISTANCE TRAVELED · ${ftAt(te)} FT`;
  el.slow.innerHTML = slow; el.lab.textContent = lab; el.val.textContent = val; el.sub.textContent = sub;
  const c = captions.find(([a, b]) => t >= a && t < b);
  el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  el.hud.style.opacity = fadeWin(t, 0.1, T_END + 0.01, 0.3);
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t);
  el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t);
  el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

window.renderAt = (t) => {
  while (simT + DT * 0.5 < t) { simT += DT; step(simT, DT); }
  const cs = setCamera(t);
  updateWorld(t); updateDOM(t);
  if (cs.space) { updateSpace(t, cs.u); renderer.render(space, spaceCam); }
  else { updateParticles(t, cs.cx); updateRiver(t); renderer.render(scene, camera); }
  return true;
};
buildCracks();
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe()]).then(() => { window.renderAt(0); return true; });
