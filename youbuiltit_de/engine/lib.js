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

