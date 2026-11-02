import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const Q = new URLSearchParams(location.search);
const SCENE = Q.get('s') || 'pool';
const W = 1080, H = 1920;

// ---------- seeded random ----------
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

// ---------- canvas textures ----------
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
function noise(g, w, h, amp) {
  const d = g.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) { const n = (rnd() - .5) * amp; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function wrapDraw(S, fn) { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { fn(dx, dy); } }

function soilCanvas(base, pal, S = 512) {
  const [c, g] = cv(S, S);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  // big craggy facets: irregular quads, lit on the left, shadowed on the right
  for (let i = 0; i < 520; i++) {
    const x = rnd() * S, y = rnd() * S, w = rr(10, 46), h = rr(30, 150), col = pick(pal), sk = rr(-10, 10);
    const pts = [[x, y + rr(-6, 6)], [x + w * rr(.4, .6), y - rr(2, 10)], [x + w, y + rr(-6, 6)], [x + w + sk + rr(-6, 6), y + h * rr(.5, .7)], [x + w + sk, y + h], [x + sk, y + h + rr(-8, 8)], [x + sk * .5 + rr(-6, 6), y + h * rr(.3, .6)]];
    wrapDraw(S, (dx, dy) => {
      const gr = g.createLinearGradient(x + dx, 0, x + w + dx, 0);
      gr.addColorStop(0, shade(col, 1.25)); gr.addColorStop(.45, col); gr.addColorStop(1, shade(col, .62));
      g.globalAlpha = rr(.55, .95); g.fillStyle = gr; g.beginPath();
      pts.forEach(([px, py], k) => k ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy)); g.closePath(); g.fill();
      g.globalAlpha = .5; g.strokeStyle = '#3a200e'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(pts[2][0] + dx, pts[2][1] + dy); g.lineTo(pts[3][0] + dx, pts[3][1] + dy); g.lineTo(pts[4][0] + dx, pts[4][1] + dy); g.stroke();
    });
  }
  g.globalAlpha = .6; g.strokeStyle = '#2b170a'; g.lineWidth = 2.2;
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S, y = rnd() * S, len = rr(30, 120);
    wrapDraw(S, (dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy); let xx = x, yy = y; for (let k = 0; k < 6; k++) { xx += rr(-4, 4); yy += len / 6; g.lineTo(xx + dx, yy + dy); } g.stroke(); });
  }
  g.globalAlpha = 1; noise(g, S, S, 22);
  return c;
}
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) * f), gg = Math.min(255, ((n >> 8) & 255) * f), b = Math.min(255, (n & 255) * f); return `rgb(${r|0},${gg|0},${b|0})`; }
const soilC = soilCanvas('#6e3f20', ['#7a4524', '#94592f', '#5c321a', '#a5683a', '#6b3a1d', '#86502a']);
const soilMap = tex(soilC, .8, .8), soilBump = tex(soilC, .8, .8, false);
const soilMat = new THREE.MeshStandardMaterial({ map: soilMap, bumpMap: soilBump, bumpScale: 5, roughness: 1 });
const wetC = soilCanvas('#3c5fb5', ['#2f4c99', '#4e72c8', '#253f85', '#5b80d4', '#34549f']);
const wetMat = new THREE.MeshStandardMaterial({ map: tex(wetC), bumpMap: tex(wetC, 1, 1, false), bumpScale: 3, roughness: .8 });

function grassCanvas() {
  const S = 512, [c, g] = cv(S, S);
  for (let i = 0; i < 2; i++) { g.fillStyle = i ? '#3f8a22' : '#56a52f'; g.fillRect(i * S / 2, 0, S / 2, S); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = pick(['#2f6f19', '#68b83c', '#4a9a28', '#3b7e1f']); g.globalAlpha = rr(.2, .6); g.fillRect(rnd() * S, rnd() * S, 1.5, rr(2, 5)); }
  g.globalAlpha = 1; noise(g, S, S, 14); return c;
}
const grassMat = new THREE.MeshStandardMaterial({ map: tex(grassCanvas()), roughness: .95 });
const grassSideMat = new THREE.MeshStandardMaterial({ color: '#3d7f22', roughness: 1 });

function plainCanvas(base, amp, S = 256, spots) {
  const [c, g] = cv(S, S); g.fillStyle = base; g.fillRect(0, 0, S, S);
  if (spots) for (let i = 0; i < spots.n; i++) { g.fillStyle = pick(spots.cols); g.globalAlpha = rr(.2, .7); const r = rr(spots.r[0], spots.r[1]); g.beginPath(); g.arc(rnd() * S, rnd() * S, r, 0, 7); g.fill(); }
  g.globalAlpha = 1; noise(g, S, S, amp); return c;
}
const concreteMat = new THREE.MeshStandardMaterial({ map: tex(plainCanvas('#cfcdc6', 18, 256, { n: 300, cols: ['#b9b6ae', '#e2e0da'], r: [2, 10] })), roughness: .9 });
const membraneMat = new THREE.MeshStandardMaterial({ color: '#c0562c', roughness: .8 });
function tileCanvas() {
  const S = 256, [c, g] = cv(S, S); g.fillStyle = '#9fdcea'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = `hsl(192,${55 + rnd() * 10}%,${80 + rnd() * 6}%)`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); }
  return c;
}
const tileMat = new THREE.MeshStandardMaterial({ map: tex(tileCanvas()), roughness: .4 });
const copingMat = new THREE.MeshStandardMaterial({ map: tex(plainCanvas('#d8c7a6', 22, 256, { n: 200, cols: ['#bfa983', '#e8dcc3', '#a8906b'], r: [2, 8] })), roughness: .85 });
const gravelC = (() => { const S = 512, [c, g] = cv(S, S); g.fillStyle = '#7d7a74'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1600; i++) { const x = rnd() * S, y = rnd() * S, r = rr(4, 14); const l = rr(55, 92); wrapDraw(S, (dx, dy) => { g.fillStyle = `hsl(35,6%,${l}%)`; g.beginPath(); g.ellipse(x + dx, y + dy, r, r * rr(.6, 1), rnd() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,38,35,.6)'; g.lineWidth = 1.5; g.stroke(); }); }
  noise(g, S, S, 16); return c; })();
const gravelMat = new THREE.MeshStandardMaterial({ map: tex(gravelC), bumpMap: tex(gravelC, 1, 1, false), bumpScale: 4, roughness: .95 });
const fineC = plainCanvas('#3b3a39', 30, 256, { n: 1500, cols: ['#8a8784', '#1e1d1c', '#5d5b58', '#c8c5c0'], r: [1, 3] });
const fineMat = new THREE.MeshStandardMaterial({ map: tex(fineC), bumpMap: tex(fineC, 1, 1, false), bumpScale: 2, roughness: 1 });
const asphaltC = plainCanvas('#3a3b3e', 26, 256, { n: 600, cols: ['#55565a', '#26272a'], r: [1, 2] });
const asphaltMat = new THREE.MeshStandardMaterial({ map: tex(asphaltC), roughness: .85 });
const white = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: .35 });
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, ...o });

// ---------- world-UV boxes ----------
function wbox(x0, x1, y0, y1, z0, z1, mat, s = 6, opt = {}) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (az > .5) uv.setXY(i, x / s, y / s); else if (ay > .5) uv.setXY(i, x / s, z / s); else uv.setXY(i, z / s, y / s);
  }
  const m = new THREE.Mesh(g, mat); m.castShadow = opt.cast !== false; m.receiveShadow = true; scene.add(m); return m;
}
const WX = 40;   // half width of the world block
const BOT = -16;
function lawn(x0, x1, z0, z1, top = 0) {
  wbox(x0, x1, BOT, top - .22, z0, z1, soilMat, 6, { cast: false });
  wbox(x0, x1, top - .22, top + .02, z0, z1, [grassSideMat, grassSideMat, grassMat, grassSideMat, grassSideMat, grassSideMat], 6, { cast: false });
}

// ---------- sky ----------
function skyTexture() {
  const [c, g] = cv(540, 960);
  const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#7f9fbf'); gr.addColorStop(.45, '#b9cbdc'); gr.addColorStop(.7, '#e4ebf1'); gr.addColorStop(1, '#eef2f5');
  g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let k = 0; k < 14; k++) {
    const cx = rr(-50, 590), cy = rr(60, 420), sc = rr(.6, 1.5);
    for (let i = 0; i < 26; i++) {
      const x = cx + rr(-90, 90) * sc, y = cy + rr(-22, 18) * sc, r = rr(18, 46) * sc;
      const rg = g.createRadialGradient(x, y - r * .3, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,.85)'); rg.addColorStop(.6, 'rgba(240,244,248,.5)'); rg.addColorStop(1, 'rgba(220,228,238,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
scene.background = skyTexture();
scene.fog = new THREE.Fog('#dfe7ee', 45, 170);

// ---------- lights ----------
scene.add(new THREE.HemisphereLight('#dbe8ff', '#6b5a3f', 1.15));
const sun = new THREE.DirectionalLight('#fff3e0', 2.7);
sun.position.set(-14, 26, 16); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = .03;
sun.target.position.set(0, 0, -15); scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#ffffff', .55); fill.position.set(6, 4, 20); scene.add(fill);

// ---------- props ----------
function tree(x, z, s = 1) {
  const gTr = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.22 * s, .4 * s, 3.4 * s, 9), M('#5b4632', { roughness: 1 }));
  trunk.position.y = 1.7 * s; trunk.rotation.z = rr(-.1, .1); trunk.castShadow = true; gTr.add(trunk);
  const n = 10 + Math.floor(rnd() * 6);
  for (let i = 0; i < n; i++) {
    const geo = new THREE.SphereGeometry(rr(.9, 1.5) * s, 18, 12);
    const p = geo.attributes.position, ph = rr(0, 9);
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); const f = 1 + .14 * Math.sin(x * 4.1 + ph) * Math.cos(y * 3.7 - ph) + .08 * Math.sin(z * 6.3 + x * 2 + ph); p.setXYZ(k, x * f, y * f, z * f); }
    geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, M(pick(['#3f6a2a', '#4d7a31', '#365c24', '#57843a']), { roughness: 1, flatShading: false }));
    leaf.position.set(rr(-1.7, 1.7) * s, (3.4 + rr(-.2, 2.2)) * s, rr(-1.5, 1.5) * s);
    leaf.castShadow = true; leaf.receiveShadow = true; gTr.add(leaf);
  }
  gTr.position.set(x, 0, z); gTr.rotation.y = rnd() * 6; scene.add(gTr); return gTr;
}

function houseFrontCanvas(w, h, ppu = 100) {
  const [c, g] = cv(w * ppu, h * ppu), U = ppu;
  g.fillStyle = '#d9d1cc'; g.fillRect(0, 0, c.width, c.height);
  noise(g, c.width, c.height, 8);
  g.fillStyle = '#9b9187'; g.fillRect(0, c.height - .35 * U, c.width, .35 * U);           // stone base
  g.fillStyle = '#c9c0ba'; g.fillRect(0, h * U / 2 - .06 * U, c.width, .12 * U);         // floor band
  const win = (cx, by, ww, wh, shutters = true) => {
    const x = cx * U - ww * U / 2, y = c.height - (by + wh) * U;
    if (shutters) { g.fillStyle = '#2c5c8c'; g.fillRect(x - .48 * U, y, .42 * U, wh * U); g.fillRect(x + ww * U + .06 * U, y, .42 * U, wh * U);
      g.strokeStyle = '#244c75'; g.lineWidth = 2; for (let k = 1; k < 9; k++) { const yy = y + k * wh * U / 9; g.beginPath(); g.moveTo(x - .48 * U, yy); g.lineTo(x - .06 * U, yy); g.moveTo(x + ww * U + .06 * U, yy); g.lineTo(x + ww * U + .48 * U, yy); g.stroke(); } }
    g.fillStyle = '#f7f7f5'; g.fillRect(x - .08 * U, y - .08 * U, ww * U + .16 * U, wh * U + .16 * U);
    const gr = g.createLinearGradient(x, y, x + ww * U, y + wh * U); gr.addColorStop(0, '#5f86ad'); gr.addColorStop(.5, '#7fa3c7'); gr.addColorStop(1, '#4b739c');
    g.fillStyle = gr; g.fillRect(x, y, ww * U, wh * U);
    g.strokeStyle = '#f7f7f5'; g.lineWidth = .07 * U; g.beginPath(); g.moveTo(x + ww * U / 2, y); g.lineTo(x + ww * U / 2, y + wh * U); g.moveTo(x, y + wh * U / 2); g.lineTo(x + ww * U, y + wh * U / 2); g.stroke();
    g.fillStyle = '#efefec'; g.fillRect(x - .15 * U, y + wh * U, ww * U + .3 * U, .12 * U);
  };
  const up = h / 2 + .9, dn = .9;
  [-6, -3, 0, 3, 6].forEach(o => win(w / 2 + o, up, 1.3, 1.7));
  [-6, -3.4, 3.4, 6].forEach(o => win(w / 2 + o, dn, 1.3, 1.7));
  // sliding door
  { const ww = 3.4, wh = 2.5, x = (w / 2 - ww / 2) * U, y = c.height - (.35 + wh) * U;
    g.fillStyle = '#f7f7f5'; g.fillRect(x - .12 * U, y - .12 * U, ww * U + .24 * U, wh * U + .12 * U);
    const gr = g.createLinearGradient(x, y, x + ww * U, y + wh * U); gr.addColorStop(0, '#6d93b8'); gr.addColorStop(1, '#4d7298'); g.fillStyle = gr; g.fillRect(x, y, ww * U, wh * U);
    g.fillStyle = '#f7f7f5'; for (const k of [1, 2, 3]) g.fillRect(x + k * ww * U / 4 - .04 * U, y, .08 * U, wh * U); }
  // wreath
  g.strokeStyle = '#2f6b33'; g.lineWidth = .12 * U; g.beginPath(); g.arc((w / 2 + 2.3) * U, c.height - 2.2 * U, .25 * U, 0, 7); g.stroke();
  return c;
}
function roofTex() {
  const [c, g] = cv(256, 256); g.fillStyle = '#b8603c'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) { g.fillStyle = 'rgba(80,30,15,.45)'; g.fillRect(0, y + 12, 256, 4); for (let x = (y / 16 % 2) * 8; x < 256; x += 16) { g.fillStyle = `rgba(${rnd() < .5 ? '255,180,140' : '90,40,20'},${rr(.05, .2)})`; g.fillRect(x, y, 15, 12); } }
  noise(g, 256, 256, 14); return tex(c);
}
const roofMat = new THREE.MeshStandardMaterial({ map: roofTex(), roughness: .8, side: THREE.DoubleSide });

function house(cx, cz, w = 16, h = 7.6, d = 9, ry = 0) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M('#d6cec8', { roughness: .9 }));
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; grp.add(body);
  const ft = tex(houseFrontCanvas(w, h)); ft.wrapS = ft.wrapT = THREE.ClampToEdgeWrapping;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: ft, roughness: .85 }));
  front.position.set(0, h / 2, d / 2 + .01); front.receiveShadow = true; grp.add(front);
  // hip roof
  const o = .6, X = w / 2 + o, Z = d / 2 + o, R = w / 2 - d / 2, top = h + 3.6;
  const v = [
    [-X, h, Z], [X, h, Z], [R, top, 0], [-X, h, Z], [R, top, 0], [-R, top, 0],     // front
    [X, h, -Z], [-X, h, -Z], [-R, top, 0], [X, h, -Z], [-R, top, 0], [R, top, 0],  // back
    [X, h, Z], [X, h, -Z], [R, top, 0],                                            // right
    [-X, h, -Z], [-X, h, Z], [-R, top, 0]];                                        // left
  const pos = [], uv = [];
  v.forEach(p => { pos.push(...p); uv.push((p[0] + p[2] * .3) / 3, (p[1] - h) / 1.4); });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); rg.computeVertexNormals();
  const roof = new THREE.Mesh(rg, roofMat); roof.castShadow = roof.receiveShadow = true; grp.add(roof);
  const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * o, .25, d + 2 * o), white); eave.position.y = h - .05; grp.add(eave);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(.9, 2.2, .9), M('#8e5a45')); ch.position.set(w / 2 - 2.5, h + 3.2, -1); ch.castShadow = true; grp.add(ch);
  grp.position.set(cx, 0, cz); grp.rotation.y = ry; scene.add(grp); return grp;
}

function fence(z, x0, x1) {
  const [c, g] = cv(256, 128); g.fillStyle = '#6e4b33'; g.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = `hsl(25,${30 + rnd() * 10}%,${24 + rnd() * 8}%)`; g.fillRect(x + 1, 0, 14, 128); }
  noise(g, 256, 128, 14);
  const t = tex(c, (x1 - x0) / 4, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 2), new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide }));
  m.position.set((x0 + x1) / 2, 1, z); m.receiveShadow = true; scene.add(m);
}
function hedge(x0, x1, z) {
  for (let x = x0; x < x1; x += .9) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(.6, .9), 1), M(pick(['#3c6a2b', '#4b7a33']), { flatShading: true, roughness: 1 })); b.position.set(x, .5, z + rr(-.2, .2)); b.castShadow = true; scene.add(b); }
}
function pot(x, z) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.32, .24, .5, 12), M('#b0643c')); p.position.set(x, .25, z); p.castShadow = true; scene.add(p);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.45, 1), M('#3f7a2e', { flatShading: true })); b.position.set(x, .8, z); b.castShadow = true; scene.add(b);
}
function rock(r, col) {
  const g = new THREE.DodecahedronGeometry(r, 0); const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * rr(.8, 1.2), p.getY(k) * rr(.7, 1.1), p.getZ(k) * rr(.8, 1.2));
  g.computeVertexNormals(); const m = new THREE.Mesh(g, M(col, { roughness: .9, flatShading: true })); m.castShadow = true; m.receiveShadow = true; return m;
}
function pipe(points, r = .13, mat = white) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .02);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, r, 14), mat); m.castShadow = true; scene.add(m); return m;
}
function arrow(x, y, z, s = 1) {
  const sh = new THREE.Shape(); sh.moveTo(-.18, 0); sh.lineTo(.18, 0); sh.lineTo(.18, .7); sh.lineTo(.42, .7); sh.lineTo(0, 1.25); sh.lineTo(-.42, .7); sh.lineTo(-.18, .7); sh.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .55 }));
  m.scale.setScalar(s); m.position.set(x, y, z); scene.add(m); return m;
}
function backyardSet() {
  house(0, -29, 17, 7.6, 9);
  house(-21, -34, 13, 7, 8, .35);
  house(21, -36, 13, 7, 8, -.3);
  // patio
  wbox(-10, 10, 0, .1, -24.5, -20.5, copingMat, 3, { cast: false });
  pot(-6.5, -22); pot(5.5, -22); pot(8.6, -22.5);
  fence(-25.6, -40, -9.2); fence(-25.6, 9.2, 40);
  hedge(-30, -11, -25); hedge(11, 30, -25);
  tree(-8.5, -17, 1.15); tree(10.5, -27, 1.0); tree(-14, -30, 1.3); tree(15, -40, 1.4); tree(-4, -44, 1.5); tree(6, -46, 1.4);
}

// ---------- pool geometry ----------
const P = { x0: -3.4, x1: 3.0, z0: -7.2, wall: .38, mem: .07, depth: 2.5 };
function poolGround(wetBelow = false) {
  const { x0, x1, z0, wall, mem, depth } = P;
  const ox0 = x0 - wall - mem, ox1 = x1 + wall + mem, oz0 = z0 - wall - mem, oy = -depth - wall - mem;
  wbox(-WX, WX, BOT, oy, -200, 0, soilMat, 6, { cast: false });
  if (wetBelow) { wbox(-WX, WX, BOT, oy - 1.0, -14, .002, wetMat, 6, { cast: false }); }
  lawn(-WX, ox0, -200, 0); lawn(ox1, WX, -200, 0); lawn(ox0, ox1, -200, oz0);
  // fill the soil under lawn strips down to oy
  return { ox0, ox1, oz0, oy };
}
function poolShell(finished) {
  const { x0, x1, z0, wall, mem, depth } = P;
  const ox0 = x0 - wall - mem, ox1 = x1 + wall + mem, oz0 = z0 - wall - mem, oy = -depth - wall - mem;
  wbox(ox0, ox1, oy, oy + mem, oz0, 0, membraneMat); wbox(ox0, ox0 + mem, oy + mem, .02, oz0, 0, membraneMat);
  wbox(ox1 - mem, ox1, oy + mem, .02, oz0, 0, membraneMat); wbox(ox0, ox1, oy + mem, .02, oz0, oz0 + mem, membraneMat);
  const b = -depth - wall;
  wbox(x0 - wall, x1 + wall, b, -depth, z0 - wall, 0, concreteMat, 3);
  wbox(x0 - wall, x0, -depth, .05, z0 - wall, 0, concreteMat, 3);
  wbox(x1, x1 + wall, -depth, .05, z0 - wall, 0, concreteMat, 3);
  wbox(x0, x1, -depth, .05, z0 - wall, z0, concreteMat, 3);
  if (finished) {
    const t = .025;
    wbox(x0, x1, -depth, -depth + t, z0, 0, tileMat, 1.2); wbox(x0, x0 + t, -depth, 0, z0, 0, tileMat, 1.2);
    wbox(x1 - t, x1, -depth, 0, z0, 0, tileMat, 1.2); wbox(x0, x1, -depth, 0, z0, z0 + t, tileMat, 1.2);
    // coping
    const c = .55;
    wbox(x0 - c, x1 + c, .02, .16, z0 - c, z0, copingMat, 2); wbox(x0 - c, x0, .02, .16, z0, 0, copingMat, 2); wbox(x1, x1 + c, .02, .16, z0, 0, copingMat, 2);
  }
}
function water() {
  const { x0, x1, z0, depth } = P;
  const mat = new THREE.MeshPhysicalMaterial({ color: '#1ea7d0', transparent: true, opacity: .62, roughness: .08, metalness: 0, clearcoat: 1, depthWrite: false });
  const m = wbox(x0 + .03, x1 - .03, -depth + .03, -.22, z0 + .03, -.002, mat, 4, { cast: false });
  m.renderOrder = 2;
  // brighter surface sheet with ripples
  const [c, g] = cv(512, 512); g.fillStyle = '#7fd8ea'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
  for (let i = 0; i < 160; i++) { const x = rnd() * 512, y = rnd() * 512, r = rr(8, 30); g.beginPath(); g.ellipse(x, y, r, r * .35, rr(-.3, .3), 0, Math.PI * rr(.6, 1.6)); g.stroke(); }
  const s = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - .06, -z0 - .06), new THREE.MeshStandardMaterial({ map: tex(c), transparent: true, opacity: .55, roughness: .05, depthWrite: false }));
  s.rotation.x = -Math.PI / 2; s.position.set((x0 + x1) / 2, -.215, z0 / 2); s.renderOrder = 3; scene.add(s);
}
function drainAndPipes() {
  const { x0, x1, depth } = P, b = -depth - .45;
  // gravel bed under the main drain
  for (let i = 0; i < 46; i++) { const r = rock(rr(.09, .17), pick(['#e8e6e1', '#cfccc6', '#f4f2ee'])); r.position.set(-.3 + rr(-.65, .65), b - .25 + rr(-.18, .12), rr(-.25, .08)); scene.add(r); }
  // main drain: red grate + white riser
  const red = M('#e0493f', { roughness: .5 });
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(.75, .14, .5), red); g1.position.set(-.3, -depth + .09, -.3); scene.add(g1);
  const g2 = new THREE.Mesh(new THREE.BoxGeometry(.85, .1, .6), white); g2.position.set(-.3, -depth + .02, -.3); scene.add(g2);
  pipe([[-.3, -depth, -.05], [-.3, b - .2, -.05]], .16);
  // main line along the cut face
  pipe([[-6, b - .55, -.05], [-.3, b - .55, -.05], [x1 + 1.2, b - .55, -.05], [x1 + 1.45, b - .3, -.05], [x1 + 1.45, -.4, -.05], [x1 + 1.45, .35, -.6], [x1 + 1.45, .4, -1.6]], .14);
  pipe([[-.3, b - .2, -.05], [-.3, b - .55, -.05]], .14);
  // left return line
  pipe([[-WX, b - 1.0, -.05], [x0 - 1.2, b - 1.0, -.05], [x0 - .9, b - .6, -.05], [x0 - .9, -1.0, -.05], [x0 - .55, -.85, -.05]], .12);
  // skimmer box right (blue grille)
  const sk = new THREE.Mesh(new THREE.BoxGeometry(.7, .6, .5), M('#3a8fd1')); sk.position.set(x1 + .55, -.45, -.3); scene.add(sk);
  // pump + filter on the lawn
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .7, 16), M('#2366c2', { roughness: .4 })); pump.rotation.z = Math.PI / 2; pump.position.set(x1 + 2.0, .32, -1.9); pump.castShadow = true; scene.add(pump);
  const mot = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .8, 16), M('#1b1d22', { roughness: .4 })); mot.rotation.z = Math.PI / 2; mot.position.set(x1 + 2.75, .3, -1.9); mot.castShadow = true; scene.add(mot);
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(.55, .7, 6, 18), M('#3e8a4a', { roughness: .45 })); tank.position.set(x1 + 2.3, .95, -3.4); tank.castShadow = true; scene.add(tank);
}
function umbrella(x, z) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.6, 8), white); pole.position.set(x, 1.3, z); pole.castShadow = true; scene.add(pole);
  const [c, g] = cv(512, 64); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f6f3ee' : '#ef6b52'; g.fillRect(i * 64, 0, 64, 64); }
  const t = tex(c); const top = new THREE.Mesh(new THREE.ConeGeometry(1.7, .55, 32, 1, true), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: .8 }));
  top.position.set(x, 2.55, z); top.castShadow = true; scene.add(top);
}
function lounger(x, z, col, ry = 0) {
  const g = new THREE.Group(); const m = M(col, { roughness: .6 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.75, .1, 1.5), m); seat.position.set(0, .38, .2); g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(.75, .1, .85), m); back.position.set(0, .7, -.85); back.rotation.x = -.75; g.add(back);
  for (const [lx, lz] of [[-.33, .85], [.33, .85], [-.33, -.6], [.33, -.6]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .38, .05), white); l.position.set(lx, .19, lz); g.add(l); }
  g.traverse(o => o.castShadow = true); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
}
function ladder(x, z) {
  for (const dx of [-.28, .28]) pipe([[x + dx, -1.4, z + .14], [x + dx, .55, z + .14], [x + dx, .95, z - .1], [x + dx, .7, z - .55], [x + dx, .05, z - .6]], .045, M('#d9dde2', { metalness: .9, roughness: .25 }));
  for (const y of [-.4, -.95]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.56, .05, .2), M('#d9dde2', { metalness: .9, roughness: .25 })); s.position.set(x, y, z + .2); scene.add(s); }
}
function divingBoard(x, z) {
  const base = new THREE.Mesh(new THREE.BoxGeometry(.6, .5, .7), white); base.position.set(x, .25, z - .5); base.castShadow = true; scene.add(base);
  const b = new THREE.Mesh(new THREE.BoxGeometry(.55, .08, 2.4), M('#4fb4d8', { roughness: .4 })); b.position.set(x, .55, z + .6); b.rotation.x = -.05; b.castShadow = true; scene.add(b);
}
function ringBuoy(x, z) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.7, 8), white); post.position.set(x, .85, z); scene.add(post);
  const [c, g] = cv(256, 16); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e5342b'; g.fillRect(i * 32, 0, 32, 16); }
  const r = new THREE.Mesh(new THREE.TorusGeometry(.38, .11, 12, 32), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .5 }));
  r.position.set(x, 1.45, z + .1); r.castShadow = true; scene.add(r);
}
function beachBall(x, y, z) {
  const [c, g] = cv(256, 128); const cols = ['#ff4f6d', '#ffffff', '#3ab0ff', '#ffd23f', '#ffffff', '#4bd36b'];
  cols.forEach((cl, i) => { g.fillStyle = cl; g.fillRect(i * 256 / 6, 0, 256 / 6 + 1, 128); });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.32, 24, 16), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .35 })); b.position.set(x, y, z); b.rotation.z = .5; b.castShadow = true; scene.add(b);
}
function duck(x, y, z) {
  const m = M('#ffd21a', { roughness: .4 }); const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(.28, 18, 12), m); body.scale.set(1.2, .8, 1); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12), m); head.position.set(.2, .26, 0); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.07, .16, 10), M('#ff7a1a')); beak.rotation.z = -Math.PI / 2; beak.position.set(.4, .24, 0); g.add(beak);
  g.position.set(x, y, z); g.rotation.y = -.6; g.traverse(o => o.castShadow = true); scene.add(g);
}
function floatRing(x, y, z) {
  const r = new THREE.Mesh(new THREE.TorusGeometry(.42, .17, 14, 36), M('#ff9fc3', { roughness: .35 })); r.rotation.x = Math.PI / 2; r.position.set(x, y, z); r.castShadow = true; scene.add(r);
}
function dirtMound(x, z, s) {
  const g = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2); const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const y = p.getY(k); const f = 1 + .12 * Math.sin(p.getX(k) * 5) * Math.cos(p.getZ(k) * 4) + rr(-.04, .04); p.setXYZ(k, p.getX(k) * f, y * f, p.getZ(k) * f); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: soilMap, bumpMap: soilBump, bumpScale: 2, roughness: 1, color: '#c08a5e' }));
  m.scale.set(2.2 * s, 1.1 * s, 1.7 * s); m.position.set(x, -.02, z); m.castShadow = m.receiveShadow = true; scene.add(m);
}

// ===================== 01 Keller — timeline driven by the voice alignment =====================
// Built as: cat lib.js keller_main.js > keller.js

// ---------- words / timing ----------
const RAW = await (await fetch('../01_keller/words.json')).json();
const WORDS = [];
for (const [w, s, e] of RAW) {            // "Sommergewitter.Die" -> two words (missing line break in alignment)
  const parts = w.split(/(?<=[.!?])(?=[A-ZÄÖÜ])/);
  if (parts.length === 1) { WORDS.push([w, s, e]); continue; }
  const L = w.length; let acc = s;
  for (const p of parts) { const d = (e - s) * p.length / L; WORDS.push([p, acc, acc + d]); acc += d; }
}
const clean = w => w.replace(/[.,!?]/g, '');
function T(word, n = 1) {                 // start time of the n-th word starting with `word`
  let k = 0;
  for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s;
  throw new Error('word not found: ' + word);
}
const END = WORDS[WORDS.length - 1][2] + 0.6;
const cl = x => Math.max(0, Math.min(1, x));
const ramp = (t, a, b) => cl((t - a) / (b - a));
const sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b));
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));   // 0..1 inside [a,b]

// ---------- growable boxes (pivot at the bottom, world-space UVs) ----------
function gbox(x0, x1, y0, y1, z0, z1, mat, s = 6, opt = {}) {
  const m = wbox(x0, x1, y0, y1, z0, z1, mat, s, opt);
  m.geometry.translate(-(x0 + x1) / 2, -y0, -(z0 + z1) / 2);
  m.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2);
  m.userData = { y0, y1 };
  return m;
}
function growTo(m, h) {                   // show the box up to world height h
  const { y0, y1 } = m.userData; const k = cl((h - y0) / (y1 - y0));
  m.visible = k > 0.001; m.scale.y = Math.max(k, 0.001);
}

// ---------- extra materials ----------
const wallMat = new THREE.MeshStandardMaterial({ map: concreteMat.map, roughness: .9, color: '#b4b1aa' });
const leanMat = new THREE.MeshStandardMaterial({ color: '#8f8c86', roughness: 1 });
const woodTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#9a6b3e'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = `hsl(28,${40 + rnd() * 10}%,${30 + rnd() * 10}%)`; g.fillRect(0, y + 1, 256, 30); g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, y, 256, 2); }
  noise(g, 256, 256, 18); return tex(c); })();
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .9 });
const waterMat = new THREE.MeshPhysicalMaterial({ color: '#4fa9c9', transparent: true, opacity: .62, roughness: .1, depthWrite: false });
const sewageMat = new THREE.MeshStandardMaterial({ color: '#6b5226', transparent: true, opacity: .9, roughness: .3 });
const xpsTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#86c79a'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#5f9e72'; g.lineWidth = 3; for (let y = 0; y <= 256; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  for (let x = 0; x <= 256; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } noise(g, 256, 256, 10); return tex(c); })();
const xpsMat = new THREE.MeshStandardMaterial({ map: xpsTex, roughness: .8 });
const steelMat = new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: .85, roughness: .25 });
const darkMat = new THREE.MeshBasicMaterial({ color: '#05070c', transparent: true, opacity: 0, depthWrite: false });
const frostMat = new THREE.MeshBasicMaterial({ color: '#9fd6ff', transparent: true, opacity: 0, depthWrite: false });
function decal(drawFn, w, h) { const [c, g] = cv(512, 512); drawFn(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }); }
const dampMat = decal(g => { for (let i = 0; i < 60; i++) { const x = rr(0, 512), y = rr(0, 512), r = rr(20, 90); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,55,45,.75)'); gr.addColorStop(1, 'rgba(60,55,45,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
const mouldMat = decal(g => { for (let i = 0; i < 260; i++) { const x = rr(0, 512), y = rr(0, 512), r = rr(3, 16); g.fillStyle = pick(['rgba(40,70,30,.9)', 'rgba(20,30,20,.85)', 'rgba(70,95,40,.8)']); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
const poreMat = decal(g => { for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(30,30,30,.8)'; g.beginPath(); g.arc(rr(0, 512), rr(0, 512), rr(1.5, 4), 0, 7); g.fill(); } });
dampMat.map.wrapS = dampMat.map.wrapT = THREE.RepeatWrapping;

// ---------- geometry constants ----------
const PIT = { x0: -5, x1: 5, z0: -9, y: -3.6 };
const OUT = { x0: -4, x1: 4, z0: -8 }, TH = .3;     // basement outer box and wall thickness
const FL = -3.05, TOP = .3, CEIL = .6;               // floor (top of slab), top of walls, top of ceiling
const IN = { x0: OUT.x0 + TH, x1: OUT.x1 - TH, z0: OUT.z0 + TH };
const WIN = { z0: -1.4, y0: -1.3, y1: -.2 };          // window in the right wall (open to the cut face)

// ---------- static world ----------
backyardSet();
wbox(-WX, WX, BOT, PIT.y, -200, 0, soilMat, 6, { cast: false });
lawn(-WX, PIT.x0, -200, 0); lawn(PIT.x1, WX, -200, 0); lawn(PIT.x0, PIT.x1, -200, PIT.z0);

// digging: the soil inside the pit shrinks down
const digFill = gbox(PIT.x0, PIT.x1, PIT.y, -.22, PIT.z0, 0, soilMat, 6, { cast: false });
const digGrass = gbox(PIT.x0, PIT.x1, -.22, .02, PIT.z0, 0, [grassSideMat, grassSideMat, grassMat, grassSideMat, grassSideMat, grassSideMat], 6, { cast: false });
const mound = new THREE.Group(); scene.add(mound);
{ const before = scene.children.length; dirtMound(-1.5, -12.6, 1.35); dirtMound(2.2, -12.0, .9);
  scene.children.splice(before).forEach(o => mound.add(o)); }

// wooden roof (the "Dach drüber")
const roof = new THREE.Group(); scene.add(roof);
for (const s of [-1, 1]) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(5.9, .14, 10), woodMat); p.castShadow = true;
  p.position.set(s * 2.65, 1.25, -4.5); p.rotation.z = -s * .42; roof.add(p);
}
for (const [x, z] of [[-5.1, -.1], [5.1, -.1], [-5.1, -8.9], [5.1, -8.9]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.1, .18), woodMat); post.position.set(x, .55, z); post.castShadow = true; roof.add(post); }

// rain water + slumping walls
const pitWater = gbox(PIT.x0 + .02, PIT.x1 - .02, PIT.y, PIT.y + .75, PIT.z0 + .02, -.003, waterMat, 4, { cast: false }); pitWater.renderOrder = 2;
function wedge(len, h, w) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(w, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: soilMap, bumpMap: soilBump, bumpScale: 3, roughness: 1, color: '#a06f47' })); m.castShadow = m.receiveShadow = true; scene.add(m); return m; }
const slumpL = wedge(9, 2.2, 1.6); slumpL.position.set(PIT.x0, PIT.y, PIT.z0);
const slumpR = wedge(9, 2.2, 1.6); slumpR.rotation.y = Math.PI; slumpR.position.set(PIT.x1, PIT.y, 0);
const slumpB = wedge(10, 2.2, 1.6); slumpB.rotation.y = Math.PI / 2; slumpB.position.set(PIT.x0, PIT.y, PIT.z0);
const fallRocks = []; for (let i = 0; i < 22; i++) { const r = rock(rr(.12, .3), pick(['#7a4826', '#8a5631', '#5c321a'])); const side = rnd() < .5 ? -1 : 1; r.userData = { x: side * rr(4.3, 4.9), z: rr(-8.5, -.4), y0: rr(-1, -.2), d: rr(0, .8) }; scene.add(r); fallRocks.push(r); }

// lean concrete + slab + rebar
const lean = gbox(-4.3, 4.3, PIT.y, -3.42, -8.3, 0, leanMat, 3);
const slab = gbox(OUT.x0, OUT.x1, -3.42, FL, OUT.z0, 0, wallMat, 3);
const rebar = new THREE.Group(); scene.add(rebar);
{ const rm = M('#8a3b22', { roughness: .6, metalness: .3 });
  for (const y of [-3.32, -3.15]) {
    for (let x = OUT.x0 + .15; x <= OUT.x1 - .1; x += .35) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 7.9, 6), rm); b.rotation.x = Math.PI / 2; b.position.set(x, y, -3.95); rebar.add(b); }
    for (let z = -.2; z >= OUT.z0 + .1; z -= .5) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 7.8, 6), rm); b.rotation.z = Math.PI / 2; b.position.set(0, y + .06, z); rebar.add(b); }
  } }

// walls (each piece grows up to the wall height h)
const walls = [
  gbox(OUT.x0, IN.x0, FL, TOP, OUT.z0, 0, wallMat, 3),                       // left
  gbox(OUT.x0, OUT.x1, FL, TOP, OUT.z0, IN.z0, wallMat, 3),                  // back
  gbox(IN.x1, OUT.x1, FL, TOP, OUT.z0, WIN.z0, wallMat, 3),                  // right, behind the window
  gbox(IN.x1, OUT.x1, FL, WIN.y0, WIN.z0, 0, wallMat, 3),                    // right, below the window
  gbox(IN.x1, OUT.x1, WIN.y1, TOP, WIN.z0, 0, wallMat, 3)];                  // right, above the window
const ceiling = gbox(OUT.x0, OUT.x1, TOP, CEIL, OUT.z0, 0, wallMat, 3);
const glass = new THREE.Mesh(new THREE.PlaneGeometry(-WIN.z0, WIN.y1 - WIN.y0), new THREE.MeshStandardMaterial({ color: '#a9d4ef', transparent: true, opacity: .35, roughness: .05 }));
glass.rotation.y = Math.PI / 2; glass.position.set((IN.x1 + OUT.x1) / 2, (WIN.y0 + WIN.y1) / 2, WIN.z0 / 2); scene.add(glass);

// damp, pores, mould decals
function plane(w, h, mat, pos, rot) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.rotation.set(...rot); m.renderOrder = 4; scene.add(m); return m; }
const WH = TOP - FL;
plane(IN.x1 - IN.x0, WH, dampMat, [0, FL + WH / 2, IN.z0 + .01], [0, 0, 0]);
plane(-IN.z0, WH, dampMat, [IN.x0 + .01, FL + WH / 2, IN.z0 / 2], [0, Math.PI / 2, 0]);
plane(TH, WH, dampMat, [(OUT.x0 + IN.x0) / 2, FL + WH / 2, .004], [0, 0, 0]);
plane(TH, WH, dampMat, [(OUT.x1 + IN.x1) / 2, FL + WH / 2, .004], [0, 0, 0]);
plane(IN.x1 - IN.x0, -IN.z0, mouldMat, [0, TOP - .01, IN.z0 / 2], [Math.PI / 2, 0, 0]);
plane(IN.x1 - IN.x0, .9, mouldMat, [0, TOP - .45, IN.z0 + .015], [0, 0, 0]);
const poreA = plane(TH, WH, poreMat, [(OUT.x0 + IN.x0) / 2, FL + WH / 2, .006], [0, 0, 0]);
const poreB = plane(TH, WH, poreMat, [(OUT.x1 + IN.x1) / 2, FL + WH / 2, .006], [0, 0, 0]);
const poreC = plane(OUT.x1 - OUT.x0, FL + 3.42, poreMat, [0, (FL - 3.42) / 2, .006], [0, 0, 0]);

// groundwater on the cut face + arrows
const wetFront = new THREE.MeshStandardMaterial({ map: wetMat.map, bumpMap: wetMat.bumpMap, bumpScale: 3, roughness: .8, transparent: true, opacity: 0, depthWrite: false });
plane(WX + PIT.x0, 16, wetFront, [(-WX + PIT.x0) / 2, -1.4 - 8, .003], [0, 0, 0]);
plane(WX - PIT.x1, 16, wetFront, [(WX + PIT.x1) / 2, -1.4 - 8, .003], [0, 0, 0]);
plane(PIT.x1 - PIT.x0, 12, wetFront, [0, PIT.y - 6, .003], [0, 0, 0]);
const gwArrows = [];
for (const y of [-2.8, -1.6]) { const a = arrow(0, 0, .08, .9); a.rotation.z = -Math.PI / 2; a.userData = { bx: -6.4, by: y, dx: 1, dy: 0 }; gwArrows.push(a);
  const b = arrow(0, 0, .08, .9); b.rotation.z = Math.PI / 2; b.userData = { bx: 6.4, by: y, dx: -1, dy: 0 }; gwArrows.push(b); }
for (const x of [-2.4, 0, 2.4]) { const a = arrow(0, 0, .08, .9); a.userData = { bx: x, by: -5.4, dx: 0, dy: 1 }; gwArrows.push(a); }

// the joint: red line, leaking drops, steel waterstop
const jointLine = new THREE.Mesh(new THREE.BoxGeometry(TH + .04, .035, .02), new THREE.MeshBasicMaterial({ color: '#ff3b2f', transparent: true, opacity: 0 }));
jointLine.position.set((OUT.x0 + IN.x0) / 2, FL, .012); scene.add(jointLine);
const leak = []; for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), new THREE.MeshStandardMaterial({ color: '#4fc3ff', emissive: '#1d6fa8', emissiveIntensity: .4, roughness: .1 })); d.userData = { ph: i / 9 }; scene.add(d); leak.push(d); }
const waterstop = new THREE.Mesh(new THREE.BoxGeometry(.03, .5, -OUT.z0), steelMat); waterstop.position.set((OUT.x0 + IN.x0) / 2, FL, OUT.z0 / 2 + .01); scene.add(waterstop);
const waterstopR = waterstop.clone(); waterstopR.position.x = (OUT.x1 + IN.x1) / 2; scene.add(waterstopR);

// frost + darkness inside
const frost = gbox(IN.x0, IN.x1, FL, TOP, IN.z0, -.01, frostMat, 6, { cast: false }); frost.renderOrder = 5;
const dark = gbox(IN.x0, IN.x1, FL, TOP, IN.z0, -.005, darkMat, 6, { cast: false }); dark.renderOrder = 6;
const flakes = (() => { const n = 160, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = rr(IN.x0, IN.x1); p[i * 3 + 1] = rr(FL, TOP); p[i * 3 + 2] = rr(-3, -.1); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: .09, transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 7; scene.add(m); m.userData.base = p.slice(); return m; })();

// insulation boards
const xps = [
  { m: gbox(OUT.x0 - .14, OUT.x0, FL - .3, .1, OUT.z0 - .14, 0, xpsMat, 1.2), d: [-1.5, 0] },
  { m: gbox(OUT.x0 - .14, OUT.x1 + .14, FL - .3, .1, OUT.z0 - .14, OUT.z0, xpsMat, 1.2), d: [0, -1.5] },
  { m: gbox(OUT.x1, OUT.x1 + .14, FL - .3, .1, OUT.z0, -1.6, xpsMat, 1.2), d: [1.5, 0] },
  { m: gbox(OUT.x1, OUT.x1 + .14, FL - .3, -1.65, -1.6, 0, xpsMat, 1.2), d: [1.5, 0] }];
xps.forEach(o => o.base = o.m.position.clone());

// light well
const well = new THREE.Group(); scene.add(well);
{ const wm = wallMat;
  const parts = [[OUT.x1 + .14, 5.0, -1.8, -1.65, -1.6, 0], [4.85, 5.0, -1.65, .12, -1.6, 0], [OUT.x1 + .14, 5.0, -1.65, .12, -1.6, -1.45]];
  for (const p of parts) { const m = wbox(...p, wm, 3); scene.remove(m); well.add(m); }
  const [c, g] = cv(128, 128); g.fillStyle = '#2a2d31'; for (let i = 0; i < 128; i += 16) { g.fillRect(i, 0, 5, 128); g.fillRect(0, i, 128, 5); }
  const gt = new THREE.CanvasTexture(c); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(3, 6);
  const grate = new THREE.Mesh(new THREE.PlaneGeometry(.86, 1.6), new THREE.MeshStandardMaterial({ map: gt, transparent: true, alphaTest: .5, metalness: .6, roughness: .4 }));
  { const [c2, g2] = cv(128, 128); g2.fillStyle = '#fff'; for (let i = 0; i < 128; i += 16) { g2.fillRect(i, 0, 5, 128); g2.fillRect(0, i, 128, 5); } const at = new THREE.CanvasTexture(c2); at.wrapS = at.wrapT = THREE.RepeatWrapping; at.repeat.set(3, 6); grate.material.alphaMap = at; }
  grate.rotation.x = -Math.PI / 2; grate.position.set(4.57, .13, -.8); well.add(grate);
  well.userData.baseY = 0; }
const beamShape = new THREE.Shape(); beamShape.moveTo(4.85, .12); beamShape.lineTo(OUT.x1 + .14, .12); beamShape.lineTo(OUT.x1, WIN.y1); beamShape.lineTo(-.4, FL); beamShape.lineTo(2.2, FL); beamShape.lineTo(OUT.x1, WIN.y0); beamShape.closePath();
const beam = new THREE.Mesh(new THREE.ShapeGeometry(beamShape), new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
beam.position.z = -.7; beam.renderOrder = 8; scene.add(beam);

// sewer: floor drain, house pipe, street main, backflow valve
const MAIN = { x: 8.6, y: -5.2, r: .85 };
const pipeGlass = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .62, roughness: .3, depthWrite: false });
const sewerPts = [[MAIN.x - .75, MAIN.y + .35, -.05], [7.2, -4.35, -.05], [2.2, -3.95, -.05], [1.6, -3.85, -.05], [1.6, FL + .02, -.05]];
const sewerPipe = pipe(sewerPts.slice().reverse(), .15, pipeGlass); sewerPipe.renderOrder = 3;
const fillCurve = new THREE.CatmullRomCurve3(sewerPts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'catmullrom', .02);
const fillGeo = new THREE.TubeGeometry(fillCurve, 240, .11, 10); const fillTube = new THREE.Mesh(fillGeo, sewageMat); scene.add(fillTube);
const fillCount = fillGeo.index.count;
const drain = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .5), M('#3b3f45', { metalness: .6, roughness: .4 })); drain.position.set(1.6, FL + .03, -.3); scene.add(drain);
const mainRing = new THREE.Mesh(new THREE.RingGeometry(MAIN.r, MAIN.r + .16, 48), M('#8d8a84', { roughness: .9 })); mainRing.position.set(MAIN.x, MAIN.y, .006); scene.add(mainRing);
const mainBack = new THREE.Mesh(new THREE.CircleGeometry(MAIN.r, 48), M('#2a2622', { roughness: 1 })); mainBack.position.set(MAIN.x, MAIN.y, .004); scene.add(mainBack);
const mainFill = new THREE.Mesh(new THREE.BufferGeometry(), sewageMat); mainFill.position.set(MAIN.x, MAIN.y, .005); scene.add(mainFill);
function setMainLevel(k) {            // k = 0..1 fill of the round sewer (circular segment below a chord)
  const r = MAIN.r, phi = Math.asin(Math.max(-1, Math.min(1, -1 + 2 * k))), n = 48, pts = [];
  for (let i = 0; i <= n; i++) { const th = (Math.PI - phi) + ((2 * Math.PI + phi) - (Math.PI - phi)) * i / n; pts.push(new THREE.Vector2(r * Math.cos(th), r * Math.sin(th))); }
  mainFill.geometry.dispose(); mainFill.geometry = k > .01 ? new THREE.ShapeGeometry(new THREE.Shape(pts)) : new THREE.BufferGeometry();
}
const manhole = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .06, 28), M('#3a3c40', { metalness: .5, roughness: .5 })); manhole.position.set(MAIN.x, .04, -2.5); scene.add(manhole);
const shaftM = gbox(MAIN.x - .45, MAIN.x + .45, MAIN.y + MAIN.r, .02, -.6, 0, wallMat, 3); // manhole shaft on the cut face
const puddle = gbox(IN.x0 + .01, IN.x1 - .01, FL, FL + .55, IN.z0 + .01, -.006, sewageMat, 4, { cast: false }); puddle.renderOrder = 3;
const valve = new THREE.Group(); scene.add(valve);
{ const body = new THREE.Mesh(new THREE.BoxGeometry(.75, .62, .45), M('#f08a24', { roughness: .45 })); valve.add(body);
  const win2 = new THREE.Mesh(new THREE.PlaneGeometry(.55, .42), M('#20242a')); win2.position.z = .231; valve.add(win2);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(.05, .38, .02), M('#e8e8e8', { metalness: .6, roughness: .3 })); flap.geometry.translate(0, -.19, 0); flap.position.set(0, .19, .245); valve.add(flap); valve.userData.flap = flap;
  valve.position.set(5.6, -4.17, .0); valve.rotation.z = -.08; }
const goArrow = arrow(0, 0, 0, .55); goArrow.material = goArrow.material.clone(); goArrow.material.color.set('#3ccf5a'); goArrow.material.emissive.set('#3ccf5a'); goArrow.rotation.z = -Math.PI / 2;
const noArrow = arrow(0, 0, 0, .55); noArrow.material = noArrow.material.clone(); noArrow.material.color.set('#ff3b2f'); noArrow.material.emissive.set('#ff3b2f'); noArrow.rotation.z = Math.PI / 2;

// rain
const rain = (() => { const n = 2600, g = new THREE.BufferGeometry(), p = new Float32Array(n * 6), base = [];
  for (let i = 0; i < n; i++) base.push([rr(-14, 18), rr(-3, 16), rr(-16, 6), rr(9, 13)]);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#dfe9f5', transparent: true, opacity: 0, depthWrite: false })); m.userData.base = base; m.renderOrder = 9; m.frustumCulled = false; scene.add(m); return m; })();
function updateRain(t, op) {
  rain.material.opacity = op; rain.visible = op > .01; if (!rain.visible) return;
  const p = rain.geometry.attributes.position.array; rain.userData.base.forEach(([x, y, z, v], i) => {
    const yy = -3 + (((y + 3) - t * v) % 19 + 19) % 19; p.set([x, yy, z, x - .05, yy + .55, z], i * 6); });
  rain.geometry.attributes.position.needsUpdate = true;
}

// room furniture at the end
const room = new THREE.Group(); scene.add(room);
const washer = new THREE.Group(); room.add(washer);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(.75, .9, .7), M('#f4f5f6', { roughness: .35 })); b.position.y = .45; washer.add(b);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .045, 12, 32), M('#9aa3ad', { metalness: .7, roughness: .3 })); ring.position.set(0, .42, .36); washer.add(ring);
  const door = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), M('#5d7c99', { roughness: .1 })); door.position.set(0, .42, .355); washer.add(door);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(.75, .1, .02), M('#d4d7db')); panel.position.set(0, .82, .36); washer.add(panel);
  washer.position.set(-2.3, FL, -1.0); washer.traverse(o => o.castShadow = true); }
const shelf = new THREE.Group(); room.add(shelf);
{ for (const y of [0, .6, 1.2, 1.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, .05, .45), woodMat); b.position.y = y + .1; shelf.add(b); }
  for (const x of [-.88, .88]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.9, .45), woodMat); s.position.set(x, .95, 0); shelf.add(s); }
  for (const y of [0, .6, 1.2]) for (let x = -.7; x < .75; x += .24) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .22, 14), M(pick(['#d64b3c', '#e3a23a', '#7aa84c', '#9c4c7a', '#e9d8a6']), { roughness: .3 })); j.position.set(x, y + .24, rr(-.08, .08)); shelf.add(j); }
  shelf.position.set(1.1, FL, -6.9); shelf.traverse(o => o.castShadow = true); }
const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); bulb.position.set(-.5, TOP - .25, -3.5); room.add(bulb);
const bulbLight = new THREE.PointLight('#ffd9a0', 0, 12, 1.5); bulbLight.position.copy(bulb.position); scene.add(bulbLight);
const wellLight = new THREE.PointLight('#fff1c8', 0, 9, 1.6); wellLight.position.set(2.6, -1.4, -.8); scene.add(wellLight);
// backfill + green roof
const fills = [gbox(PIT.x0, OUT.x0 - .14, PIT.y, -.22, PIT.z0, 0, soilMat, 6, { cast: false }),
  gbox(OUT.x1 + .14, PIT.x1, PIT.y, -1.8, -1.6, 0, soilMat, 6, { cast: false }),
  gbox(OUT.x1 + .14, PIT.x1, PIT.y, -.22, PIT.z0, -1.6, soilMat, 6, { cast: false }),
  gbox(OUT.x0 - .14, OUT.x1 + .14, PIT.y, -.22, PIT.z0, OUT.z0 - .14, soilMat, 6, { cast: false })];
const gm = [grassSideMat, grassSideMat, grassMat, grassSideMat, grassSideMat, grassSideMat];
const fillGrass = [gbox(PIT.x0, OUT.x0 - .14, -.22, .02, PIT.z0, 0, gm, 6), gbox(OUT.x1 + .14, PIT.x1, -.22, .02, PIT.z0, -1.6, gm, 6), gbox(OUT.x0 - .14, OUT.x1 + .14, -.22, .02, PIT.z0, OUT.z0 - .14, gm, 6), gbox(OUT.x0, OUT.x1, CEIL, CEIL + .12, OUT.z0, 0, gm, 6)];

// ---------- skies / light presets ----------
const skyDay = scene.background;
const skyStorm = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#2c333d'); gr.addColorStop(.6, '#59626e'); gr.addColorStop(1, '#79828c'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 260; i++) { const x = rr(-40, 580), y = rr(0, 520), r = rr(30, 80); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(40,46,54,.6)'); rg.addColorStop(1, 'rgba(40,46,54,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hemi = scene.children.find(o => o.isHemisphereLight);

// ---------- camera path ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .1, 400);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const WIDE = [V(.3, 9.6, 21.5), V(.3, -1.3, -9)];
const tJoint = T('Aber', 3), tBlechEnd = T('Jetzt'), tWell = T('stockdunkel'), tStorm = T('Dann'), tKlappe = T('Also', 5), tGrube = T('Schütte');
const KEYS = [
  [0, ...WIDE],
  [3.6, V(.3, 8.4, 19), V(.3, -1.5, -8)],
  [T('Also'), V(0, 7.2, 17.5), V(0, -1.6, -6)],
  [T('Aber', 2) + .2, V(0, -.4, 12.5), V(0, -1.4, -6)],
  [T('Also', 2), V(0, -.4, 12.0), V(0, -1.4, -6)],
  [tJoint, V(0, 0, 12.6), V(0, -1.5, -6)],
  [tJoint + .9, V(-3.1, -2.45, 3.4), V(-3.65, -3.0, -.6)],
  [tBlechEnd - .1, V(-3.2, -2.5, 3.0), V(-3.7, -3.0, -.6)],
  [tBlechEnd + .8, V(.4, -.6, 12.8), V(.4, -1.5, -6)],
  [tWell, V(.6, -.6, 12.4), V(.6, -1.5, -6)],
  [tWell + 1.0, V(3.0, -.2, 8.6), V(3.7, -1.1, -1)],
  [tStorm - .1, V(3.0, -.2, 8.3), V(3.7, -1.1, -1)],
  [tStorm + 1.1, V(4.4, 3.4, 19.5), V(4.4, -2.8, -6)],
  [tKlappe - .2, V(4.4, 3.0, 18.5), V(4.4, -3.0, -6)],
  [tKlappe + .8, V(5.2, -2.8, 6.6), V(5.3, -3.5, -.6)],
  [tGrube - .1, V(5.2, -2.9, 6.2), V(5.3, -3.5, -.6)],
  [tGrube + 1.4, V(.3, 7.8, 20), V(.3, -1.6, -8)],
  [END, V(.3, 8.6, 21.5), V(.3, -1.2, -9)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- the timeline ----------
const tw = {
  dig0: .15, dig1: T('gräbst') + .6, roof: T('Dach'), regen: T('Regen'), knien: T('Knien'), rutsch: T('rutschen'),
  also: T('Also'), platte: T('Bodenplatte'), gitter: T('Gitter'), wande: T('Betonwände'),
  gw: T('Grundwasser'), poren: T('Poren'), feucht: T('feucht'), schimmel: T('Schimmel'),
  dicht: T('dicht'), weisse: T('weiße'), fuge: T('Fuge'), rein: T('rein'), blech: T('Stahlblech'), herum: T('herum'),
  eiskalt: T('eiskalt'), damm: T('Dämmplatten'), dunkel: T('stockdunkel'), schacht: T('Lichtschacht'),
  gewitter: T('Sommergewitter'), kanal: T('Kanalisation'), zuruck: T('zurück'), abfluss: T('Abfluss'), keller: T('Keller', 2),
  klappe: T('Klappe'), raus: T('raus'), nicht: T('nicht', 2), ruck: T('Rückstauklappe'),
  grube: T('Grube'), wasch: T('Waschmaschine'), regal: T('Regal'), gluck: T('Glückwunsch') };

function update(t) {
  // dig + roof
  const dig = ease(t, tw.dig0, tw.dig1);
  growTo(digFill, lerp(-.22, PIT.y, dig)); digGrass.visible = t < tw.dig0 + .1;
  const md = dig * (1 - ease(t, tw.grube, tw.grube + .9)); mound.scale.setScalar(Math.max(.001, md)); mound.visible = md > .01;
  const sew = t > tw.gewitter - .6; sewerPipe.visible = drain.visible = mainRing.visible = mainBack.visible = mainFill.visible = manhole.visible = shaftM.visible = sew;
  const roofIn = ramp(t, tw.roof - .1, tw.roof + .45), roofOut = ease(t, tw.wande, tw.wande + .9);
  roof.visible = roofIn > 0 && roofOut < 1;
  roof.position.y = (1 - back(roofIn)) * 7 + roofOut * 12; roof.rotation.z = roofOut * .6;
  // rain on the open pit
  const storm = win(t, tw.gewitter - .2, tw.klappe + .4, .6);
  updateRain(t, Math.max(win(t, tw.regen - .5, tw.also + .3, .5) * .55, storm * .75));
  const waterUp = ease(t, tw.regen, tw.knien + .4) * (1 - ease(t, tw.also, tw.also + .7));
  growTo(pitWater, PIT.y + .75 * waterUp); pitWater.visible = waterUp > .01;
  const sl = pop(t, tw.rutsch, .7) * (1 - ease(t, tw.also, tw.also + .6));
  for (const s of [slumpL, slumpR, slumpB]) { s.visible = sl > .01; s.scale.set(Math.max(sl, .001), Math.max(sl, .001), 1); }
  fallRocks.forEach(r => { const u = r.userData, k = ramp(t, tw.rutsch + u.d * .5, tw.rutsch + u.d * .5 + .6); r.visible = k > 0 && t < tw.also + .4;
    r.position.set(lerp(u.x, u.x * .8, k), lerp(u.y0, PIT.y + .25, k * k), u.z); r.rotation.set(k * 4, k * 3, 0); });
  // slab, rebar, walls, ceiling
  growTo(lean, lerp(PIT.y, -3.42, ease(t, tw.also + .3, tw.platte)));
  rebar.visible = t > tw.platte - .2; rebar.position.y = (1 - back(ramp(t, tw.platte - .2, tw.platte + .3))) * 3;
  growTo(slab, lerp(-3.42, FL, ease(t, tw.gitter + .3, tw.wande - .1)));
  const h = lerp(FL, TOP, ease(t, tw.wande, tw.wande + 1.6));
  walls.forEach(w => growTo(w, h)); glass.visible = h >= WIN.y1;
  const ceil = back(ramp(t, tw.wande + 1.6, tw.wande + 2.1)); ceiling.visible = t > tw.wande + 1.6; ceiling.position.y = TOP + (1 - ceil) * 4;
  // groundwater, pores, damp, mould
  const gw = ease(t, tw.gw - .1, tw.gw + .8) * (1 - ease(t, tw.herum + .3, tw.herum + 1.3));
  wetFront.opacity = gw * .9;
  const white = ease(t, tw.dicht, tw.weisse + .3);
  const push = win(t, tw.gw, tw.weisse + 1.2, .4);
  gwArrows.forEach((a, i) => { const u = a.userData, ph = (t * 1.6 + i * .37) % 1;
    const bounce = white > .5 ? -ramp(t, tw.weisse, tw.weisse + .6) * 1.2 : 0;
    const off = (sm(ph) * .7 + bounce) * (1 - white * .4);
    a.position.set(u.bx + u.dx * off, u.by + u.dy * off, .08); a.visible = push > .02; a.scale.setScalar(.9 * push); });
  const pores = win(t, tw.poren - .1, tw.feucht + 1.2, .3) * (1 - white);
  poreMat.opacity = pores * .85;
  dampMat.opacity = ease(t, tw.feucht, tw.feucht + .8) * (1 - white);
  mouldMat.opacity = ease(t, tw.schimmel, tw.schimmel + .7) * (1 - white);
  wallMat.color.set('#b4b1aa').lerp(new THREE.Color('#ffffff'), white);
  // the joint leak and the steel waterstop
  const jl = win(t, tw.fuge - .2, tw.herum + .6, .25);
  jointLine.material.opacity = jl * (.6 + .4 * Math.sin(t * 12));
  const leaking = ramp(t, tw.rein - .3, tw.rein + .2) * (1 - ramp(t, tw.blech + .5, tw.blech + .8));
  const blocked = ramp(t, tw.blech + .5, tw.blech + .8) * (1 - ramp(t, tw.eiskalt, tw.eiskalt + .3));
  leak.forEach(d => { const ph = (t * .9 + d.userData.ph) % 1; d.visible = leaking > .02 || blocked > .02;
    if (leaking > blocked) { // from outside soil, through the joint, onto the floor
      const x = lerp(OUT.x0 - .35, IN.x0 + .5, ph), y = FL + (ph < .55 ? .02 : -(ph - .55) * 0) + (ph > .55 ? .02 : 0);
      d.position.set(x, y + .03 * Math.sin(ph * 30), .04); }
    else { const x = lerp(OUT.x0 - .35, (OUT.x0 + IN.x0) / 2 - .05, Math.min(ph * 1.6, 1)); d.position.set(x, FL + .03 - Math.max(0, ph - .62) * .8, .04); }
    d.scale.setScalar(Math.max(leaking, blocked)); });
  const ws = ramp(t, tw.blech - .1, tw.blech + .45); waterstop.visible = waterstopR.visible = t > tw.blech - .1;
  waterstop.position.y = waterstopR.position.y = FL + (1 - sm(ws)) * 2.2;
  // frost, insulation, darkness, light well
  const cold = win(t, tw.eiskalt - .1, tw.damm + 1.4, .4);
  frostMat.opacity = cold * .38; flakes.material.opacity = cold;
  { const p = flakes.geometry.attributes.position.array, b = flakes.userData.base; for (let i = 0; i < p.length; i += 3) { p[i + 1] = FL + ((b[i + 1] - FL - t * .35) % (TOP - FL) + (TOP - FL)) % (TOP - FL); p[i] = b[i] + .1 * Math.sin(t * 2 + i); } flakes.geometry.attributes.position.needsUpdate = true; }
  xps.forEach((o, i) => { const k = back(ramp(t, tw.damm + i * .18, tw.damm + i * .18 + .45)); o.m.visible = k > .01; o.m.position.set(o.base.x + o.d[0] * (1 - k) * 2, o.base.y, o.base.z + o.d[1] * (1 - k) * 2); });
  const dk = ease(t, tw.dunkel, tw.dunkel + .4) * (1 - .55 * ease(t, tw.schacht, tw.schacht + .6)) * (1 - ease(t, tw.wasch - .4, tw.wasch + .2));
  darkMat.opacity = dk * .82;
  const wl = back(ramp(t, tw.schacht - .2, tw.schacht + .3)); well.visible = wl > .01; well.position.y = -(1 - wl) * 2.5;
  const lit = ease(t, tw.schacht + .1, tw.schacht + .6) * (1 - .7 * storm);
  beam.material.opacity = lit * .28; wellLight.intensity = lit * 9;
  // storm, sewer backflow, valve
  scene.background = storm > .5 ? skyStorm : skyDay;
  sun.intensity = 2.7 * (1 - .8 * storm); hemi.intensity = 1.15 * (1 - .45 * storm);
  const flash = Math.max(1 - ramp(t, tw.gewitter + .15, tw.gewitter + .45), 0) * (t > tw.gewitter + .15 ? 1 : 0) + Math.max(1 - ramp(t, tw.kanal + .9, tw.kanal + 1.15), 0) * (t > tw.kanal + .9 ? .7 : 0);
  renderer.toneMappingExposure = 1.05 + flash * 1.6;
  const mainK = lerp(.25, 1, ease(t, tw.kanal, tw.kanal + 1.2)) * (1 - .6 * ease(t, tw.grube - .2, tw.grube + .6));
  setMainLevel(t > tw.gewitter - 1 ? mainK : .2);
  const back1 = ease(t, tw.zuruck - .2, tw.abfluss + .6);                              // sewage climbs the house pipe
  const valveOn = t > tw.klappe + .2;
  const pipeFrac = valveOn ? lerp(back1, .22, ease(t, tw.klappe + .2, tw.raus)) : back1;
  fillGeo.setDrawRange(0, Math.floor(fillCount * pipeFrac / 3) * 3); fillTube.visible = pipeFrac > .01;
  const pud = ease(t, tw.abfluss + .4, tw.keller + .5) * (1 - ease(t, tw.raus - .4, tw.raus + .5));
  growTo(puddle, FL + .55 * pud); puddle.visible = pud > .01;
  const vk = back(ramp(t, tw.klappe, tw.klappe + .4)); valve.visible = vk > .01; valve.scale.setScalar(Math.max(vk, .001));
  const open = ease(t, tw.raus - .2, tw.raus + .2) * (1 - ease(t, tw.nicht - .2, tw.nicht + .1));
  valve.userData.flap.rotation.z = -open * 1.1;
  goArrow.visible = win(t, tw.raus - .2, tw.nicht - .1, .15) > 0; goArrow.position.set(6.7, -3.55, .3); goArrow.scale.setScalar(.55 * pop(t, tw.raus - .2));
  noArrow.visible = win(t, tw.nicht - .1, tw.grube - .3, .15) > 0; noArrow.position.set(4.5 + .15 * Math.sin(t * 14), -3.55, .3); noArrow.scale.setScalar(.55 * pop(t, tw.nicht - .1));
  // backfill + room
  const bf = ease(t, tw.grube, tw.grube + 1.1);
  fills.forEach(f => growTo(f, lerp(PIT.y, f.userData.y1, bf)));
  fillGrass.forEach((g, i) => { const k = back(ramp(t, tw.grube + 1.0 + i * .05, tw.grube + 1.4 + i * .05)); g.visible = k > .01; g.scale.y = Math.max(k, .001); });
  const wsh = back(ramp(t, tw.wasch, tw.wasch + .4)), rsh = back(ramp(t, tw.regal, tw.regal + .4));
  washer.visible = wsh > .01; washer.scale.setScalar(Math.max(wsh, .001));
  shelf.visible = rsh > .01; shelf.scale.setScalar(Math.max(rsh, .001));
  const bl = ease(t, tw.wasch - .4, tw.wasch); bulb.visible = bl > .01; bulbLight.intensity = bl * 7;
  placeCamera(t);
}

// ---------- captions (one word at a time, like the original) ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d');
function wordAt(t) { let w = null; for (const x of WORDS) { if (x[1] <= t + .02) w = x; else break; } return w && t < w[2] + .5 ? clean(w[0]).replace(/^./, c => c) : ''; }
function drawCaption(t) {
  const w = wordAt(t); if (!w) return;
  og.font = '700 96px Fredoka'; og.textAlign = 'center'; og.textBaseline = 'middle'; og.lineJoin = 'round';
  const y = 990;
  og.lineWidth = 16; og.strokeStyle = 'rgba(0,0,0,.92)'; og.strokeText(w, W / 2, y + 4);
  og.lineWidth = 12; og.strokeStyle = '#000'; og.strokeText(w, W / 2, y);
  og.fillStyle = '#ffffff'; og.fillText(w, W / 2, y);
}

await document.fonts.load('700 96px Fredoka');
window.END = END;
window.renderAt = (t, q = .9) => {
  update(t); renderer.render(scene, camera);
  og.drawImage(renderer.domElement, 0, 0); drawCaption(t);
  return out.toDataURL('image/jpeg', q);
};
window.__done = true;
