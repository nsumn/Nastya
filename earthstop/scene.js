import * as THREE from 'three';

// ---------- timeline ----------
const T_EVENT = 3.0;
const SLOW = 40;
const V = 262 / SLOW;          // apparent eastward speed after the stop (m per video second)
const T_END = 13.0;
const FPS = 30, DT = 1 / FPS;

// ---------- seeded rng ----------
let seed = 1337;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------- renderer ----------
const W = 1080, H = 1920;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, W / H, 0.5, 900);

// sky gradient
function skyTex(top, mid, bot) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const skyCalm = skyTex('#7f9cc4', '#c9cfdc', '#f3d6b3');
const skyStorm = skyTex('#6d6a72', '#a58f7a', '#d9b48c');
scene.background = skyCalm;
const fogCalm = new THREE.Color('#e9d7bf'), fogDust = new THREE.Color('#c7a27a');
scene.fog = new THREE.Fog(fogCalm.clone(), 90, 330);

// lights
const hemi = new THREE.HemisphereLight(0xc9dcf5, 0x6a5a40, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd6a0, 2.6);
sun.position.set(-70, 55, -30);
sun.target.position.set(0, 0, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 60, bottom: -60, near: 10, far: 250 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

// materials helper
const matCache = {};
function M(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...opts });
  return matCache[k];
}
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, color, x = 0, y = 0, z = 0) { const m = mesh(BOX, M(color)); m.scale.set(w, h, d); m.position.set(x, y, z); return m; }

// ---------- static world ----------
// layout (z toward camera): promenade 30..60, park -4..30, road -9..-4, river -42..-11, far bank, skyline
const ground = mesh(new THREE.PlaneGeometry(600, 211), M('#6e9448'), false, true);
ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 94.7); scene.add(ground);

const prom = mesh(new THREE.PlaneGeometry(600, 40), M('#cdb48e'), false, true);
prom.rotation.x = -Math.PI / 2; prom.position.set(0, 0.02, 50); scene.add(prom);

// park paths
for (const [x, z, w, d] of [[0, 14, 200, 3.2], [-14, 8, 3, 30], [16, 10, 3, 30], [0, -2.5, 200, 2.6]]) {
  const p = mesh(new THREE.PlaneGeometry(w, d), M('#d8c39f'), false, true);
  p.rotation.x = -Math.PI / 2; p.position.set(x, 0.03, z); scene.add(p);
}
// embankment road + granite edge
const road = mesh(new THREE.PlaneGeometry(600, 5.5), M('#55545a'), false, true);
road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, -6.8); scene.add(road);
for (let x = -300; x < 300; x += 6) { const s = box(3, 0.02, 0.18, '#e8e2d2', x, 0.05, -6.8); s.castShadow = false; scene.add(s); }
scene.add(box(600, 1.2, 1.2, '#9a8f86', 0, 0.2, -10.2));
// river
const riverGeo = new THREE.PlaneGeometry(320, 32, 160, 24);
riverGeo.rotateX(-Math.PI / 2);
const riverBase = riverGeo.attributes.position.array.slice();
const river = mesh(riverGeo, new THREE.MeshStandardMaterial({ color: '#4b7896', roughness: 0.5, metalness: 0.05, flatShading: true }), false, true);
river.position.set(0, -0.6, -26.8); scene.add(river);
const riverBed = mesh(new THREE.PlaneGeometry(600, 40), M('#3c4b52'), false, false);
riverBed.rotation.x = -Math.PI / 2; riverBed.position.set(0, -3, -26.8); scene.add(riverBed);
// far bank
scene.add(box(600, 1.4, 6, '#9a8f86', 0, -0.1, -45.5));
const farGrass = mesh(new THREE.PlaneGeometry(600, 360), M('#7b8f55'), false, true);
farGrass.rotation.x = -Math.PI / 2; farGrass.position.set(0, 0.62, -222); scene.add(farGrass);
for (let x = -300; x < 300; x += 26) { const s = mesh(new THREE.PlaneGeometry(4, 360), M('#8d8a86'), false, true); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.64, -222); scene.add(s); }

// window texture for buildings
function windowTex(base, win) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  g.fillStyle = win; for (let y = 8; y < 64; y += 16) for (let x = 6; x < 64; x += 16) g.fillRect(x, y, 8, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
}
const bPal = [['#c9b9a5', '#8a7f78'], ['#a7adb8', '#6d7480'], ['#d8cbb6', '#9a8b77'], ['#b49a85', '#7c6555'], ['#e1d6c4', '#a99c88'], ['#8e98a6', '#5f6875']];
const bTex = bPal.map(([b, w]) => windowTex(b, w));
for (let i = 0; i < 150; i++) {
  const w = R(8, 20), d = R(8, 18), h = rnd() < 0.12 ? R(50, 95) : R(12, 38);
  const x = R(-220, 220), z = R(-115, -280);
  const tex = bTex[Math.floor(rnd() * bTex.length)].clone(); tex.needsUpdate = true; tex.repeat.set(w / 4, h / 4);
  const b = mesh(BOX, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, flatShading: true }), true, true);
  b.scale.set(w, h, d); b.position.set(x, h / 2 + 0.6, z); scene.add(b);
  if (h > 60 && rnd() < 0.6) { const sp = box(w * 0.4, h * 0.25, d * 0.4, '#c7b49b', x, h + h * 0.125 + 0.6, z); scene.add(sp); }
}

// lamps
const lampGeo = new THREE.CylinderGeometry(0.09, 0.12, 4.2, 6);
const lampHead = new THREE.SphereGeometry(0.35, 8, 6);
for (let x = -60; x <= 60; x += 11) for (const z of [-4.3, 12.2]) {
  const g = new THREE.Group(); const p = mesh(lampGeo, M('#2f2f33')); p.position.y = 2.1; g.add(p);
  const h = mesh(lampHead, M('#fff1cf', { emissive: '#ffdca0', emissiveIntensity: 0.6 })); h.position.y = 4.35; g.add(h);
  g.position.set(x + (z > 0 ? 5 : 0), 0, z); scene.add(g);
}

// clouds
const clouds = [];
const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
for (let i = 0; i < 16; i++) {
  const g = new THREE.Group();
  const n = 4 + Math.floor(rnd() * 4);
  for (let j = 0; j < n; j++) { const s = mesh(cloudGeo, M('#fbf3ea', { emissive: '#f3d8b8', emissiveIntensity: 0.25 }), false, false); const r = R(5, 11); s.scale.set(r * 1.4, r * 0.8, r); s.position.set(j * 7 - n * 3.5 + R(-2, 2), R(-1.5, 2), R(-3, 3)); g.add(s); }
  g.position.set(R(-260, 200), R(70, 120), R(-200, -300)); scene.add(g); clouds.push(g);
}

// ---------- dynamic actors ----------
const actors = []; // loose objects that fly east at the event

const shirts = ['#d9822b', '#c23b3b', '#2f5d8a', '#e8d6a8', '#4b8b5a', '#f2f0ea', '#7a4a8c', '#e0b040', '#1f2a3a', '#b5563a', '#5aa0c8'];
const pantsC = ['#23324d', '#2b2b2e', '#5a4632', '#3a4a5c', '#6b6b6b', '#1d1d22'];
const skins = ['#e9c4a2', '#d7a47e', '#b98260', '#f1d2b6', '#8d5a3c'];
const hairs = ['#2a1d14', '#5b3a20', '#d9b36a', '#1a1a1a', '#8a8a8a', '#7a3a1a'];

function makePerson() {
  const outer = new THREE.Group(); const body = new THREE.Group(); body.position.y = -0.95; outer.add(body);
  const shirt = pick(shirts), pants = pick(pantsC), skin = pick(skins);
  const legs = [], arms = [];
  for (const sx of [-0.14, 0.14]) {
    const hip = new THREE.Group(); hip.position.set(sx, 0.86, 0); body.add(hip);
    const l = box(0.22, 0.86, 0.26, pants, 0, -0.43, 0); hip.add(l); legs.push(hip);
    hip.add(box(0.24, 0.12, 0.34, '#1b1b1b', 0, -0.82, 0.04));
  }
  body.add(box(0.58, 0.68, 0.32, shirt, 0, 1.2, 0));
  for (const sx of [-0.37, 0.37]) {
    const sh = new THREE.Group(); sh.position.set(sx, 1.5, 0); body.add(sh);
    sh.add(box(0.16, 0.62, 0.18, shirt, 0, -0.3, 0)); sh.add(box(0.14, 0.14, 0.15, skin, 0, -0.66, 0)); arms.push(sh);
  }
  body.add(box(0.33, 0.36, 0.33, skin, 0, 1.73, 0));
  if (rnd() < 0.85) body.add(box(0.35, 0.12, 0.35, pick(hairs), 0, 1.94, -0.01));
  return { outer, legs, arms };
}

function addLoose(obj, x, y, z, opt = {}) {
  obj.position.set(x, y, z); scene.add(obj);
  const a = {
    obj, kind: opt.kind || 'thing', pos: obj.position, vel: new THREE.Vector3(), base: y,
    walk: opt.walk || null, f: opt.f ?? R(0.85, 1.05), vy0: opt.vy0 ?? R(0.2, 1.1),
    spin: opt.spin || new THREE.Vector3(R(-0.6, 0.6), R(-0.6, 0.6), -R(1.2, 3.2)),
    lag: opt.lag ?? R(0, 0.12), rest: opt.rest ?? y, launched: false, ...opt.extra
  };
  actors.push(a); return a;
}

// people
for (let i = 0; i < 190; i++) {
  const p = makePerson();
  const x = R(-95, 25), z = rnd() < 0.2 ? R(-5.2, -3.5) : R(0, 16.5);
  const heading = rnd() < 0.5 ? R(-0.4, 0.4) : Math.PI + R(-0.4, 0.4);
  const moving = rnd() < 0.7;
  p.outer.rotation.y = heading + (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2) * (moving ? 1 : 0);
  addLoose(p.outer, x, 0.95, z, {
    kind: 'person', walk: moving ? { speed: R(1.1, 1.6), phase: R(0, 6) } : null,
    extra: { person: p, idlePhase: R(0, 6) }
  });
}
// benches
for (let i = 0; i < 26; i++) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.1, 0.5, '#8a5a34', 0, 0.0, 0)); g.add(box(1.8, 0.45, 0.08, '#8a5a34', 0, 0.28, -0.24));
  for (const sx of [-0.75, 0.75]) g.add(box(0.08, 0.45, 0.45, '#2b2b2b', sx, -0.24, 0));
  addLoose(g, R(-110, 30), 0.47, pick([11.6, 16.4, 0.2]) + R(-0.2, 0.2), { kind: 'bench', f: R(0.75, 0.9), vy0: R(0.1, 0.5), spin: new THREE.Vector3(R(-1, 1), R(-1, 1), -R(0.6, 1.6)) });
}
// trash bins / small things
for (let i = 0; i < 18; i++) {
  const g = mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.8, 8), M('#3b4a3d'));
  addLoose(g, R(-110, 30), 0.4, pick([12.5, 15.5, -0.6]), { kind: 'bin', f: R(0.8, 1.0) });
}
// cars
const carCols = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#d8a23a', '#6d7a83', '#3d6b4a'];
for (let i = 0; i < 16; i++) {
  const g = new THREE.Group(); const c = pick(carCols);
  g.add(box(4.2, 0.75, 1.8, c, 0, 0, 0)); g.add(box(2.3, 0.62, 1.6, c, -0.2, 0.66, 0));
  g.add(box(2.1, 0.5, 1.64, '#8fb0c8', -0.2, 0.66, 0));
  const wg = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10); wg.rotateX(Math.PI / 2);
  for (const wx of [-1.35, 1.35]) for (const wz of [-0.9, 0.9]) { const w = mesh(wg, M('#151515')); w.position.set(wx, -0.38, wz); g.add(w); }
  const lane = rnd() < 0.5 ? -5.4 : -8.2;
  g.rotation.y = lane < -6.8 ? Math.PI : 0;
  addLoose(g, R(-130, 40), 0.75, lane, { kind: 'car', f: R(0.8, 0.95), vy0: R(0.05, 0.4), walk: { speed: R(9, 13) * (lane < -6.8 ? -1 : 1), phase: 0 }, spin: new THREE.Vector3(R(-1.2, -0.3), R(-0.3, 0.3), -R(0.3, 1.0)) });
}
// boats on the river
for (let i = 0; i < 5; i++) {
  const g = new THREE.Group(); g.add(box(5, 0.8, 1.8, '#e8e4da', 0, 0, 0)); g.add(box(2, 0.9, 1.4, '#355d82', -0.4, 0.8, 0));
  addLoose(g, R(-120, 40), -0.25, R(-36, -16), { kind: 'boat', f: R(0.9, 1.05), vy0: R(0.3, 1.0), walk: { speed: R(-2, 2), phase: 0 }, spin: new THREE.Vector3(R(-0.6, 0.6), R(-0.3, 0.3), -R(0.4, 1.2)) });
}
// birds
const birdGeo = new THREE.BufferGeometry();
birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.5, 0, 0.45, 0, 0, 0.25, 0, 0, 0, 0.5, 0, 0.45, 0, 0, 0.25], 3));
birdGeo.computeVertexNormals();
for (let i = 0; i < 30; i++) {
  const b = new THREE.Mesh(birdGeo, new THREE.MeshBasicMaterial({ color: '#2a2a2e', side: THREE.DoubleSide }));
  const a = addLoose(b, R(-120, 30), R(8, 22), R(-30, 20), { kind: 'bird', f: R(1.0, 1.1), vy0: R(-0.2, 0.4), spin: new THREE.Vector3(R(-2, 2), R(-2, 2), R(-3, 3)), extra: { cx: 0, cz: 0, ang: R(0, 6), rad: R(4, 12), w: R(0.4, 0.9) } });
  a.cx = a.pos.x; a.cz = a.pos.z; a.cy = a.pos.y;
}

// trees (rooted, they bend, lose foliage, some snap)
const trees = [];
const autumn = ['#5f8d3a', '#7a9a3a', '#d98b2b', '#e0b33a', '#c4562a', '#6c8f35', '#b98a2e', '#4f7a34'];
const foliageGeo = new THREE.IcosahedronGeometry(1, 0);
function makeTree(x, z, s) {
  const pivot = new THREE.Group(); pivot.position.set(x, 0, z); scene.add(pivot);
  const tr = mesh(new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 3.2 * s, 6), M('#5b3f2a')); tr.position.y = 1.6 * s; pivot.add(tr);
  const blobs = [];
  const n = 3 + Math.floor(rnd() * 3); const col = pick(autumn);
  for (let i = 0; i < n; i++) {
    const r = R(1.2, 2.0) * s;
    const b = mesh(foliageGeo, M(rnd() < 0.7 ? col : pick(autumn))); b.scale.set(r, r * R(0.85, 1.1), r);
    b.position.set(R(-1, 1) * s, (3.4 + R(0, 1.8)) * s, R(-1, 1) * s); b.rotation.set(R(0, 3), R(0, 3), R(0, 3)); pivot.add(b); blobs.push(b);
  }
  trees.push({ pivot, blobs, s, stiff: R(0.6, 1.2), snapAt: rnd() < 0.35 ? R(1.2, 6) : Infinity, phase: R(0, 6), detachAt: blobs.map(() => R(0.4, 5)), snapped: false });
}
for (let i = 0; i < 70; i++) {
  let x = R(-130, 60), z = R(1, 24);
  if (Math.abs(z - 14) < 2.3) z += 4;
  if (Math.abs(x) < 7 && z > 13) continue;
  makeTree(x, z, R(0.9, 1.35));
}
for (let x = -140; x < 80; x += R(6, 10)) makeTree(x, R(-1.8, -0.8), R(0.9, 1.2)); // row along the embankment
for (let x = -140; x < 80; x += R(5, 9)) makeTree(x, R(-52, -48), R(1.0, 1.4)); // far bank

// ---------- particles (instanced) ----------
const dummy = new THREE.Object3D();
function makeParticles(n, geo, mat, spawnFn) {
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = false; scene.add(im);
  const P = []; for (let i = 0; i < n; i++) P.push(spawnFn(i));
  const colors = P.some(p => p.color);
  if (colors) P.forEach((p, i) => im.setColorAt(i, new THREE.Color(p.color || '#ffffff')));
  for (let i = 0; i < n; i++) { dummy.scale.setScalar(0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
  return { im, P };
}
const leafGeo = new THREE.PlaneGeometry(0.28, 0.2);
const leaves = makeParticles(2600, leafGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 }), () => ({
  t0: Math.pow(rnd(), 0.8) * 9.5, x0: R(-75, 15), y0: R(0.3, 13), z0: R(-6, 29), sp: R(1.0, 1.45), color: pick(autumn), r: new THREE.Vector3(R(0, 6), R(0, 6), R(0, 6)), w: new THREE.Vector3(R(-9, 9), R(-9, 9), R(-9, 9)), ph: R(0, 6)
}));
const dustGeo = new THREE.TetrahedronGeometry(0.12);
const dust = makeParticles(2200, dustGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), () => ({
  t0: rnd() * 9.5, x0: R(-70, 10), y0: R(0.05, 2.5), z0: R(-6, 29), sp: R(1.0, 1.5), color: pick(['#cdb48e', '#b89a72', '#d8c39f', '#8a7a64']), r: new THREE.Vector3(R(0, 6), R(0, 6), R(0, 6)), w: new THREE.Vector3(R(-6, 6), R(-6, 6), R(-6, 6)), ph: R(0, 6)
}));
const sprayGeo = new THREE.IcosahedronGeometry(0.22, 0);
const spray = makeParticles(1800, sprayGeo, new THREE.MeshStandardMaterial({ color: '#f3f7fb', roughness: 0.4, emissive: '#9fb7c8', emissiveIntensity: 0.3 }), () => ({
  t0: rnd() * 9.5, x0: R(-80, 30), z0: R(-41, -12), vy: R(0.4, 2.4), sp: R(1.0, 1.35), s: R(0.25, 0.9), r: new THREE.Vector3(), w: new THREE.Vector3(R(-4, 4), R(-4, 4), R(-4, 4))
}));
const streakMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, fog: true });
const streaks = makeParticles(380, new THREE.BoxGeometry(5, 0.035, 0.035), streakMat, () => ({ x0: R(-60, 60), y0: R(0.5, 28), z0: R(-40, 30), sp: R(1.8, 2.6) }));

// ---------- camera path ----------
const camBase = new THREE.Vector3(2, 17.5, 47);
const camLook = new THREE.Vector3(0, 3.5, -8);

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const el = { title: $('title'), slow: $('slow'), lab: $('lab'), val: $('val'), sub: $('sub'), cap: $('cap'), flash: $('flash'), end: $('end'), endT: $('endT'), endS: $('endS'), hud: $('hud') };
function fadeWin(t, a, b, f = 0.3) { return smooth(a, a + f, t) * (1 - smooth(b - f, b, t)); }

// ---------- simulation ----------
let simT = 0;
const tmp = new THREE.Vector3();

function step(t, dt) {
  const te = t - T_EVENT; const after = te >= 0;
  // actors
  for (const a of actors) {
    if (!after) {
      if (a.kind === 'person') {
        const p = a.person;
        if (a.walk) {
          const dir = tmp.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), a.obj.rotation.y);
          a.pos.addScaledVector(dir, a.walk.speed * dt);
          const ph = t * a.walk.speed * 4.2 + a.walk.phase;
          p.legs[0].rotation.x = Math.sin(ph) * 0.5; p.legs[1].rotation.x = -Math.sin(ph) * 0.5;
          p.arms[0].rotation.x = -Math.sin(ph) * 0.45; p.arms[1].rotation.x = Math.sin(ph) * 0.45;
          a.pos.y = 0.95 + Math.abs(Math.cos(ph)) * 0.04;
        } else {
          p.arms[0].rotation.x = Math.sin(t * 1.3 + a.idlePhase) * 0.08;
        }
      } else if (a.kind === 'car' || a.kind === 'boat') {
        a.pos.x += a.walk.speed * dt;
        if (a.kind === 'boat') a.pos.y = -0.25 + Math.sin(t * 1.5 + a.pos.x) * 0.05;
      } else if (a.kind === 'bird') {
        a.ang += a.w * dt; a.pos.set(a.cx + Math.cos(a.ang) * a.rad, a.cy + Math.sin(a.ang * 2) * 0.6, a.cz + Math.sin(a.ang) * a.rad);
        a.obj.rotation.y = -a.ang; a.obj.scale.set(1, 1, 1);
        const flap = Math.sin(t * 11 + a.rad);
        a.obj.geometry === birdGeo && (a.obj.rotation.z = flap * 0.25);
      }
      continue;
    }
    // after the stop: everything loose keeps going east relative to the stopped ground
    const k = 1 - Math.exp(-Math.max(0, te - a.lag) / 0.22);
    const target = V * a.f;
    a.vel.x = target * k;
    if (!a.launched && te >= a.lag) { a.launched = true; a.vel.y = a.vy0; }
    if (a.launched) {
      if (a.kind !== 'bird') {
        a.vel.y -= 0.35 * dt;
        a.pos.y += a.vel.y * dt;
        const floor = a.kind === 'boat' ? -0.3 : (a.kind === 'person' ? 0.45 : 0.3);
        if (a.pos.y < floor) { a.pos.y = floor; a.vel.y = Math.abs(a.vel.y) * 0.55 + R(0.1, 0.5); a.spin.multiplyScalar(0.9); }
      } else {
        a.pos.y += a.vy0 * dt * 0.5;
      }
      const sk = Math.min(1, (te - a.lag) / 0.4);
      a.obj.rotation.x += a.spin.x * dt * sk; a.obj.rotation.y += a.spin.y * dt * sk; a.obj.rotation.z += a.spin.z * dt * sk;
      if (a.kind === 'person') {
        const p = a.person; const fl = Math.sin(t * 9 + a.idlePhase);
        p.arms[0].rotation.x = -2.6 + fl * 0.4; p.arms[1].rotation.x = -2.3 - fl * 0.4;
        p.legs[0].rotation.x = 0.5 + fl * 0.3; p.legs[1].rotation.x = -0.4 - fl * 0.3;
      }
    }
    if (a.kind === 'blob') { const k2 = Math.max(0.25, 1 - (te - a.obj.userData.td) * 0.6); a.obj.scale.copy(a.obj.userData.s0).multiplyScalar(k2); }
    a.pos.x += a.vel.x * dt;
    a.pos.z += Math.sin(t * 0.7 + a.pos.x * 0.1) * 0.15 * dt;
  }

  // trees
  for (const tr of trees) {
    const gust = Math.sin(t * 1.1 + tr.phase) * 0.02;
    if (!after) { tr.pivot.rotation.z = gust; continue; }
    if (!tr.snapped) {
      const bend = -(0.55 / tr.stiff) * smooth(0, 0.9, te) - Math.sin(t * 13 + tr.phase) * 0.05 * smooth(0, 0.5, te);
      tr.pivot.rotation.z = Math.max(bend, -1.05);
      tr.blobs.forEach((b, i) => {
        if (b.parent === tr.pivot && te > tr.detachAt[i]) {
          scene.attach(b);
          b.userData.s0 = b.scale.clone(); b.userData.td = te;
          actors.push({ obj: b, kind: 'blob', pos: b.position, vel: new THREE.Vector3(), f: R(0.95, 1.15), vy0: R(0.3, 1.2), spin: new THREE.Vector3(R(-2, 2), R(-2, 2), -R(1, 3)), lag: te, launched: false, base: b.position.y });
        }
      });
      if (te > tr.snapAt) {
        tr.snapped = true;
        actors.push({ obj: tr.pivot, kind: 'tree', pos: tr.pivot.position, vel: new THREE.Vector3(), f: R(0.75, 0.9), vy0: R(0.2, 0.6), spin: new THREE.Vector3(R(-0.4, 0.4), R(-0.4, 0.4), -R(0.6, 1.4)), lag: te, launched: false });
      }
    }
  }
}

function updateParticles(t) {
  const te = t - T_EVENT;
  const groups = [[leaves, 'leaf'], [dust, 'dust'], [spray, 'spray']];
  for (const [g, kind] of groups) {
    g.P.forEach((p, i) => {
      const age = te - p.t0;
      if (te < 0 || age < 0) { dummy.scale.setScalar(0); }
      else {
        let x, y, z;
        if (kind === 'spray') {
          x = p.x0 + V * p.sp * age; y = -0.5 + p.vy * age - 0.25 * age * age; z = p.z0 + Math.sin(age * 2 + p.x0) * 0.4;
          if (y < -0.7 || age > 6) { dummy.scale.setScalar(0); dummy.updateMatrix(); g.im.setMatrixAt(i, dummy.matrix); return; }
          dummy.scale.setScalar(p.s * smooth(0, 0.25, age));
        } else {
          x = p.x0 + V * p.sp * age + Math.sin(age * 3 + p.ph) * 0.6;
          y = p.y0 + Math.sin(age * 2.3 + p.ph) * 0.8 + (kind === 'dust' ? age * 0.25 : 0);
          z = p.z0 + Math.cos(age * 1.7 + p.ph) * 0.8;
          dummy.scale.setScalar(smooth(0, 0.3, age) * (kind === 'dust' ? R(0.8, 1.2) : 1));
        }
        dummy.position.set(x, y, z);
        dummy.rotation.set(p.r.x + p.w.x * age, p.r.y + p.w.y * age, p.r.z + p.w.z * age);
        if (x > 70) dummy.scale.setScalar(0);
      }
      dummy.updateMatrix(); g.im.setMatrixAt(i, dummy.matrix);
    });
    g.im.instanceMatrix.needsUpdate = true;
  }
  // wind streaks
  streakMat.opacity = 0.32 * smooth(0, 0.8, te);
  streaks.P.forEach((p, i) => {
    if (te < 0) { dummy.scale.setScalar(0); }
    else {
      let x = p.x0 + V * p.sp * te; x = ((x + 70) % 140 + 140) % 140 - 70;
      dummy.position.set(x, p.y0, p.z0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
    }
    dummy.updateMatrix(); streaks.im.setMatrixAt(i, dummy.matrix);
  });
  streaks.im.instanceMatrix.needsUpdate = true;
}

function updateRiver(t) {
  const te = Math.max(0, t - T_EVENT);
  const A = 0.12 + 0.75 * smooth(0, 2.5, te);
  const pos = riverGeo.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    const x = riverBase[i], z = riverBase[i + 2];
    let h = Math.sin(x * 0.25 + t * 1.2) * 0.06 + Math.cos(z * 0.6 + t) * 0.05;
    if (te > 0) {
      h += A * (0.55 * Math.sin(0.32 * (x - V * 1.3 * te) + z * 0.25) + 0.3 * Math.sin(0.9 * (x - V * 1.6 * te) - z * 0.5));
      h += 0.12 * te * (x / 160); // water piling up to the east
    }
    pos[i + 1] = h;
  }
  riverGeo.attributes.position.needsUpdate = true; riverGeo.computeVertexNormals();
}

function updateWorld(t) {
  const te = t - T_EVENT;
  const dustK = smooth(0.5, 9, te) * 0.8;
  scene.fog.color.copy(fogCalm).lerp(fogDust, dustK);
  scene.fog.near = 90 - 50 * dustK; scene.fog.far = 330 - 110 * dustK;
  scene.background = te > 0 && dustK > 0.45 ? skyStorm : skyCalm;
  sun.intensity = 2.6 - 1.0 * dustK;
  hemi.intensity = 1.1 - 0.2 * dustK;
  clouds.forEach(c => { if (te > 0) c.position.x += 0; });
  // clouds drift with the atmosphere
  clouds.forEach((c, i) => { c.userData.x0 ??= c.position.x; c.position.x = c.userData.x0 + t * 0.6 + Math.max(0, te) * V * 2.2; });

  // camera: three shots
  let cam, look, up = new THREE.Vector3(0, 1, 0);
  if (t < 6.5) {               // A: wide elevated view to the river
    const push = smooth(0, T_EVENT, t) * 3 + Math.max(0, te) * 0.4;
    cam = new THREE.Vector3(1, 28 - push * 0.3, 46 - push); look = new THREE.Vector3(0, 0, -22);
  } else if (t < 10) {         // B: ground level, people flying past
    const u = t - 6.5;
    cam = new THREE.Vector3(-0.5 + u * 0.35, 1.9 + u * 0.05, 21.5 - u * 0.15); look = new THREE.Vector3(1.5 + u * 0.3, 2.4, 4);
  } else {                     // C: top-down over the park and river
    const u = t - 10;
    cam = new THREE.Vector3(2, 62 + u * 4, 4 + u * 0.3); look = new THREE.Vector3(2, 0, -6 + u * 0.3); up = new THREE.Vector3(0, 0, -1);
  }
  let shake = 0;
  if (te >= 0) shake = 0.9 * Math.exp(-te * 3.2) + (t >= 6.5 && t < 10 ? 0.05 : 0.07);
  const sh = new THREE.Vector3(Math.sin(t * 47.1) + Math.sin(t * 23.3), Math.sin(t * 39.7 + 1) + Math.sin(t * 19.1), Math.sin(t * 31.3 + 2)).multiplyScalar(shake * 0.5);
  camera.up.copy(up);
  camera.fov = t < 6.5 ? 52 : (t < 10 ? 62 : 50); camera.updateProjectionMatrix();
  camera.position.copy(cam).add(sh);
  camera.lookAt(look.clone().add(sh.clone().multiplyScalar(0.4)));
}

function fmtCount(sec) { sec = Math.max(0, sec); const s = Math.floor(sec); const ms = Math.floor((sec - s) * 1000); return `0:0${s}.${String(ms).padStart(3, '0')}`; }

function updateDOM(t) {
  const te = t - T_EVENT;
  el.title.style.opacity = fadeWin(t, 0.15, 2.85, 0.35);
  el.flash.style.opacity = te >= 0 ? 0.55 * Math.exp(-te * 9) : 0;
  let slow = '', lab = '', val = '', sub = '', cap = '';
  if (t < T_EVENT) { lab = 'ЗЕМЛЯ ОСТАНОВИТСЯ ЧЕРЕЗ'; val = fmtCount(T_EVENT - t); sub = 'МОСКВА · 942 КМ/Ч ВОКРУГ ОСИ'; }
  else if (t < 6.5) { lab = 'СКОРОСТЬ ВРАЩЕНИЯ ЗЕМЛИ'; val = '0 км/ч'; sub = 'СЕКУНДУ НАЗАД — 942 КМ/Ч'; }
  else if (t < 10) { lab = 'ВЕТЕР В МОСКВЕ'; val = '942 км/ч'; sub = 'САМЫЕ СИЛЬНЫЕ ТОРНАДО — ~500 КМ/Ч'; }
  else { lab = 'ВСЁ НЕЗАКРЕПЛЁННОЕ ПРОЛЕТЕЛО'; val = `${(262 * te / SLOW).toFixed(1).replace('.', ',')} м`; sub = 'НА ВОСТОК · 262 М/С'; }
  if (te >= 0) slow = '<b></b>ВРЕМЯ ЗАМЕДЛЕНО ×40';
  if (t >= 3.3 && t < 6.4) cap = 'Земля остановилась.<br>Всё остальное — нет.';
  else if (t >= 6.6 && t < 9.9) cap = 'Воздух тоже продолжает лететь.<br>Это вдвое сильнее любого торнадо.';
  else if (t >= 10.1 && t < 13) cap = 'Всё, что не прибито к земле,<br>летит на восток.';
  el.slow.innerHTML = slow; el.lab.textContent = lab; el.val.textContent = val; el.sub.textContent = sub; el.cap.innerHTML = cap;
  const capOp = fadeWin(t, 3.3, 6.4) + fadeWin(t, 6.6, 9.9) + fadeWin(t, 10.1, 13.0);
  el.cap.style.opacity = capOp;
  const hudOp = (t < T_EVENT ? fadeWin(t, 0.15, T_EVENT + 0.01, 0.3) : 1) * (1 - smooth(12.7, 13.1, t));
  el.hud.style.opacity = hudOp;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t);
  el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t);
  el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

window.renderAt = (t) => {
  while (simT + DT * 0.5 < t) { simT += DT; step(simT, DT); }
  updateWorld(t); updateParticles(t); updateRiver(t); updateDOM(t);
  renderer.render(scene, camera);
  return true;
};
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
