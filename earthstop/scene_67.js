import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle } from './people.js';

// "What if 67 got deleted?"  — meme chain-reaction video
// =================== timeline ===================
const HOOK = 4, MEME = 11, NPC = 19, BALL = 26, SB = 34, TABLE = 38, COMET = 42, SIX8 = 45, CHAIN = 56, T_END = 60.5;

// =================== rng / helpers ===================
let seed = 6767;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const wrapR = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }

// =================== renderer ===================
const W = 1080, H = 1920;
const glCanvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false; renderer.localClippingEnabled = true;

// =================== sky dome (separate pass) ===================
const SKYFN = `
uniform vec3 uSunS; uniform vec3 uUp; uniform float uDay; uniform float uDusk; uniform float uRed; uniform float uVoid;
vec3 skyColor(vec3 d){
  float e=dot(d,uUp); float eh=max(e,0.0);
  vec3 zen=mix(vec3(0.004,0.007,0.018),vec3(0.13,0.30,0.66),uDay);
  vec3 hor=mix(vec3(0.016,0.024,0.05),vec3(0.62,0.74,0.88),uDay);
  hor=mix(hor,vec3(0.95,0.52,0.26),uDusk); zen=mix(zen,vec3(0.16,0.20,0.42),uDusk*0.6);
  vec3 c=mix(hor,zen,pow(eh,0.42));
  float sd=max(dot(d,uSunS),0.0);
  c+=vec3(1.0,0.78,0.5)*pow(sd,6.0)*0.32*(uDay*0.6+uDusk);
  if(e<0.0) c=hor*0.85;
  vec3 red=mix(vec3(0.45,0.03,0.05),vec3(0.06,0.0,0.02),pow(eh,0.5));
  c=mix(c,red,uRed); c*=(1.0-uVoid);
  return c;
}`;
const sky = new THREE.Scene();
const skyCam = new THREE.PerspectiveCamera(60, W / H, 1, 100000);
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSunS: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uDusk: { value: 0.45 }, uRed: { value: 0 }, uVoid: { value: 0 }, uT: { value: 0 }, uGrid: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform float uT; uniform float uGrid; varying vec3 vD;
  void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    float sd=max(dot(d,uSunS),0.0);
    c+=vec3(1.0,0.9,0.75)*smoothstep(0.99975,0.9999,sd)*6.0*(1.0-uRed)*(1.0-uVoid) + vec3(1.0,0.75,0.45)*pow(sd,500.0)*1.5*(1.0-uRed);
    // digital grid tearing the sky during the chain reaction
    vec2 g=vec2(atan(d.z,d.x)*40.0, d.y*60.0); vec2 f=abs(fract(g)-0.5);
    float line=smoothstep(0.47,0.5,max(f.x,f.y)); c+=vec3(1.0,0.15,0.3)*line*uGrid*0.35*(1.0-uVoid*0.7);
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(50000, 48, 32), domeMat); sky.add(dome);
const SUN = new THREE.Vector3(-0.62, 0.42, 0.66).normalize();   // golden hour, 6:07 PM, from the west

// =================== CITY ===================
const city = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 6000);
city.fog = new THREE.Fog(new THREE.Color(0.8, 0.72, 0.65), 200, 2600);
const hemi = new THREE.HemisphereLight(0xc8d8f0, 0x6b5e50, 1.15); city.add(hemi);
const sunL = new THREE.DirectionalLight(0xffd9a8, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 600 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.02;
city.add(sunL, sunL.target);

const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, mat, x, y, z, parent = city) { const m = mesh(BOX, typeof mat === 'string' ? M(mat) : mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }

// ---- ground
const XA = -600, XB = 1400;
const asphalt = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#55585e', '#41444a', '#5c5f64', '#3b3e43'], 3);
  for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(30,32,36,0.25)'; g.fillRect(R(0, w), R(0, h), R(40, 140), R(20, 80)); }
  g.strokeStyle = 'rgba(25,26,30,0.7)'; g.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) { let x = R(0, w), y = R(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += R(-22, 22); y += R(-22, 22); g.lineTo(x, y); } g.stroke(); }
}, [(XB - XA) / 18, 2]);
const groundParts = [];
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
{
  const dash = [];
  for (let x = XA; x < XB; x += 9) { dash.push([x, 3.5]); dash.push([x, -3.5]); }
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.15), M('#e8e6df', { roughness: 0.6 }), dash.length); const d = new THREE.Object3D();
  dash.forEach(([x, z], i) => { d.position.set(x, 0.02, z); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.receiveShadow = true; city.add(im);
  for (const z of [-0.14, 0.14]) { const l = mesh(new THREE.PlaneGeometry(XB - XA, 0.12), M('#e3b23c', { roughness: 0.6 }), false, true); l.rotation.x = -Math.PI / 2; l.position.set((XA + XB) / 2, 0.021, z); city.add(l); }
}
const CROSS = [-170, 30, 165, 300, 435, 570, 705, 840, 975, 1110];
for (const cx of CROSS) {
  const r = mesh(new THREE.PlaneGeometry(14, 2400), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); r.rotation.x = -Math.PI / 2; r.position.set(cx, 0.005, 0); city.add(r);
  for (const xs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(2.6, 0.5), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + xs * 8.6, 0.025, k * 1.05); city.add(s); }
  for (const zs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(0.5, 2.6), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + k * 1.05, 0.026, zs * 8.6); city.add(s); }
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
    g.fillStyle = o.band; g.fillRect(0, 0, cw, PPM * 0.9); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, PPM * 0.9, cw, 3);
    const winStyle = rnd();
    for (let f = 0; f < floors; f++) {
      const y0 = ch - (groundH + (f + 1) * floorH) * PPM;
      if (winStyle < 0.35) { g.fillStyle = o.band; g.fillRect(0, y0 + floorH * PPM - 4, cw, 4); }
      for (let b = 0; b < bays; b++) {
        const ww = bw * (winStyle < 0.5 ? 0.5 : 0.62), wh = floorH * PPM * (winStyle < 0.5 ? 0.62 : 0.55);
        const x = b * bw + (bw - ww) / 2, y = y0 + floorH * PPM * 0.2;
        g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
        const gr = g.createLinearGradient(x, y, x + ww, y + wh); const sk = rnd();
        gr.addColorStop(0, sk < 0.3 ? '#9fb8cc' : '#44505c'); gr.addColorStop(1, sk < 0.3 ? '#5d7387' : '#262d35');
        g.fillStyle = gr; g.fillRect(x, y, ww, wh);
        if (rnd() < 0.55) { g.fillStyle = pick(['#d9cbb0', '#e8e0d0', '#b8a890', '#6d5a4a']); g.fillRect(x, y, ww, wh * R(0.2, 0.6)); }
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
function wallMat(tex, rep) {
  const m = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.18, roughness: 0.88 });
  if (rep) { m.map = tex.map.clone(); m.map.needsUpdate = true; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(...rep); m.emissiveMap = tex.emi.clone(); m.emissiveMap.needsUpdate = true; m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping; m.emissiveMap.repeat.set(...rep); }
  winMats.push(m); return m;
}
const roofMat = M('#77736c', { roughness: 1 });
const sharedFacades = WALLS.map(o => ({ o, side: facade(16, 30, o, false) }));
const groups = [];     // everything that can be deleted in the chain reaction: {g, x, z, w, d, h, col}
function building(x0, x1, side, h, o, unique) {
  const w = x1 - x0, d = R(14, 22), x = (x0 + x1) / 2, z = side * (12 + d / 2);
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const front = unique ? facade(w, h, o, true) : null;
  const sh = sharedFacades.find(s => s.o === o) || sharedFacades[0];
  const sideMat = wallMat(sh.side, [d / 16, h / 30]);
  const frontMat = front ? wallMat(front) : sideMat;
  const mats = [sideMat, sideMat, roofMat, roofMat, side < 0 ? frontMat : sideMat, side > 0 ? frontMat : sideMat];
  const b = mesh(BOX, mats); b.scale.set(w, h, d); b.position.set(0, h / 2, 0); g.add(b);
  box(w + 0.6, 0.7, d + 0.6, M(o.band), 0, h - 0.35, 0, g);
  box(w, 0.9, 0.3, M(o.band), 0, h + 0.45, -side * (d / 2 - 0.15), g);
  if (rnd() < 0.6) { const tank = new THREE.Group(); tank.position.set(R(-w / 4, w / 4), h + 0.9, R(-d / 5, d / 5)); g.add(tank);
    const tk = mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 12), M('#8a6a4a')); tk.position.y = 3.6; tank.add(tk); const cone = mesh(new THREE.ConeGeometry(1.6, 1.2, 12), M('#5c4a38')); cone.position.y = 5.7; tank.add(cone);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 5), M('#3a3a3a')); l.position.set(lx, 1.05, lz); tank.add(l); } }
  for (let k = 0; k < 3; k++) box(R(1.5, 3), R(1, 2), R(1.5, 3), '#9a968e', R(-w / 3, w / 3), h + 0.7, R(-d / 3, d / 3), g);
  if (unique && rnd() < 0.8) {
    const ac = pick(AWN); const aw = mesh(BOX, M(ac)); aw.scale.set(w * R(0.6, 0.95), 0.12, 2.2); aw.position.set(0, 3.85, side * (12 - 1.0) - z); aw.rotation.x = side * 0.28; g.add(aw);
    box(w * R(0.6, 0.9), 0.5, 0.06, M(ac), 0, 3.5, side * (12 - 2.05) - z, g);
  }
  groups.push({ g, x, z, w, d, h, col: o.wall, front: side * 12 });
  return g;
}
for (const side of [-1, 1]) for (let bi = 0; bi < CROSS.length - 1; bi++) {
  const a = CROSS[bi] + 7, bEnd = CROSS[bi + 1] - 7; let x = a;
  while (x < bEnd - 6) {
    const w = Math.min(bEnd - x, R(13, 26)); const near = x < 420 && x > -120;
    let h = rnd() < 0.15 ? R(38, 52) : R(16, 34);
    if (side > 0 && x < 146 && x + w > 110) h = Math.max(h, 30);   // super bowl billboard wall
    building(x, x + w, side, h, pick(WALLS), near); x += w;
  }
}
const COURT = new THREE.Vector3(640, 0, -150);
const nearCourt = (x, z, r) => Math.hypot(x - COURT.x, z - COURT.z) < r;
function glassTex() {
  return canvasTex(128, 512, (g, w, h) => {
    const base = pick(['#5f7f99', '#6f8ea6', '#4f6a80', '#7d97a8', '#56707a']);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const c = new THREE.Color(base).offsetHSL(R(-0.01, 0.01), 0, R(-0.12, 0.14)); g.fillStyle = '#' + c.getHexString(); g.fillRect(x, y, 7, 7); }
    g.fillStyle = 'rgba(20,30,40,0.5)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y + 7, w, 1);
  });
}
const glassPool = [0, 1, 2, 3, 4].map(() => ({ map: glassTex(), emi: canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (rnd() < 0.22) { g.fillStyle = pick(['#ffd28a', '#fff0d0', '#ffc070']); g.fillRect(x, y, 7, 7); } }) }));
function tower(x, z, w, d, h) {
  if (nearCourt(x, z, 70)) return;
  const t = pick(glassPool); const m = wallMat(t, [w / 30, h / 120]); m.roughness = 0.35; m.metalness = 0.25;
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const b = mesh(BOX, [m, m, roofMat, roofMat, m, m]); b.scale.set(w, h, d); b.position.set(0, h / 2, 0); g.add(b);
  box(w * 0.7, 3, d * 0.7, '#8d9aa3', 0, h + 1.5, 0, g);
  groups.push({ g, x, z, w, d, h, col: '#6f8ea6' });
}
function plainBlock(x, z, w, d, h, o) {
  if (nearCourt(x, z, 40)) return;
  const tex = pick(sharedFacades).side; const m = wallMat(tex, [w / 16, h / 30]);
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const b = mesh(BOX, m); b.scale.set(w, h, d); b.position.set(0, h / 2, 0); g.add(b); box(w + 0.5, 0.8, d + 0.5, M(o.band), 0, h, 0, g);
  groups.push({ g, x, z, w, d, h, col: o.wall });
}
for (const side of [-1, 1]) for (let x = -200; x < 1300; x += R(22, 40)) plainBlock(x, side * R(48, 70), R(18, 30), R(16, 26), R(28, 60), pick(WALLS));
for (let i = 0; i < 46; i++) { const side = rnd() < 0.5 ? -1 : 1; tower(R(120, 1500), side * R(30, 260), R(22, 40), R(22, 40), R(70, 210)); }
for (let i = 0; i < 160; i++) { const side = rnd() < 0.5 ? -1 : 1; const x = R(-300, 2600), z = side * R(80, 900); if (nearCourt(x, z, 60)) continue; const h = R(20, 90); const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g); box(R(20, 50), h, R(20, 50), pick(['#a99b8a', '#8f8a84', '#b49a80', '#9aa3aa', '#c2b49c']), 0, h / 2, 0, g); groups.push({ g, x, z, w: 30, d: 30, h, col: '#a99b8a' }); }
// backdrop around the court
for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const r = R(42, 60); plainBlockForce(COURT.x + Math.cos(a) * r, COURT.z + Math.sin(a) * r, R(16, 26), R(14, 22), R(14, 32), pick(WALLS)); }
function plainBlockForce(x, z, w, d, h, o) { const tex = pick(sharedFacades).side; const m = wallMat(tex, [w / 16, h / 30]); const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g); const b = mesh(BOX, m); b.scale.set(w, h, d); b.position.set(0, h / 2, 0); g.add(b); box(w + 0.5, 0.8, d + 0.5, M(o.band), 0, h, 0, g); }

// ---- street props
const poleMat = M('#3b3e42', { roughness: 0.6, metalness: 0.3 });
function streetLamp(x, z, side) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 6), poleMat); p.position.y = 3.5; g.add(p);
  const arm = mesh(BOX, poleMat); arm.scale.set(0.1, 0.1, 1.6); arm.position.set(0, 6.9, -side * 0.8); g.add(arm);
  const head = mesh(BOX, M('#d8d4c8', { emissive: '#ffd9a0', emissiveIntensity: 0.4 })); head.scale.set(0.35, 0.15, 0.6); head.position.set(0, 6.8, -side * 1.5); g.add(head);
}
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
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.22, 7, false), trunkMat));
  const top = pts[8]; const fr = [];
  for (let k = 0; k < 10; k++) {
    const L = R(3.6, 4.6); const pg = new THREE.PlaneGeometry(L, 1.7, 10, 1); pg.translate(L / 2, 0, 0); pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position; const droop = R(0.12, 0.2);
    for (let i = 0; i < pa.count; i++) { const xx = pa.getX(i), zz = pa.getZ(i); pa.setY(i, -droop * xx * xx + 0.15 * xx - Math.abs(zz) * 0.35); }
    pg.rotateX(R(-0.3, 0.3)); pg.rotateZ(R(0.05, 0.35)); pg.rotateY(k / 10 * Math.PI * 2 + R(-0.2, 0.2)); pg.translate(top.x, top.y, top.z); fr.push(pg);
  }
  const fronds = mesh(mergeGeometries(fr), leafMat); g.add(fronds); palms.push({ g, fronds, ph: R(0, 6) });
}
for (const side of [-1, 1]) for (let x = -160; x < 1300; x += 30) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; streetLamp(x, side * 7.6, side); }
for (const side of [-1, 1]) for (let x = -150; x < 1300; x += R(11, 16)) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; if (side < 0 && x > 2 && x < 22) continue; if (side > 0 && x > -22 && x < 2) continue; palm(x, side * R(8.0, 8.5), R(7.5, 11.5)); }
for (const cx of [30, 165, 300]) { trafficLight(cx - 8.2, -8.0, -1, 7.5); trafficLight(cx + 8.2, 8.0, 1, 7.5); }

// cars
const CAR_COLS = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#e8b923', '#6d7a83', '#3d6b4a', '#8a8f96', '#f0f0ee'];
const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); wheelGeo.rotateX(Math.PI / 2);
const cars = [];
function car(lane, dir, x0, speed) {
  const g = new THREE.Group(); const taxi = rnd() < 0.2; const c = taxi ? '#f2c12e' : pick(CAR_COLS); const big = rnd() < 0.25;
  const L = big ? 4.8 : 4.3, Hh = big ? 0.85 : 0.72;
  box(L, Hh, 1.85, M(c, { roughness: 0.35, metalness: 0.3 }), 0, 0.33 + Hh / 2, 0, g);
  box(L * 0.55, 0.62, 1.68, M(c, { roughness: 0.35, metalness: 0.3 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.57, 0.5, 1.72, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  for (const zz of [0.6, -0.6]) { box(0.06, 0.16, 0.45, M('#ffffff', { emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, zz, g); box(0.06, 0.14, 0.4, M('#a01010', { emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, zz, g); }
  if (taxi) box(0.6, 0.2, 0.3, '#fff6d8', -0.15, 0.33 + Hh + 0.7, 0, g);
  for (const wx of [-L * 0.32, L * 0.32]) for (const wz of [-0.85, 0.85]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, 0.34, wz); g.add(w); }
  g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g);
  cars.push({ g, lane, dir, x0, speed, ph: R(0, 6), fly: R(0.5, 1.5) });
}
for (let i = 0; i < 46; i++) { const dir = rnd() < 0.5 ? 1 : -1; const lane = dir > 0 ? pick([-1.75, -5.25]) : pick([1.75, 5.25]); car(lane, dir, R(-200, 700), R(8, 13)); }

// ---- people
const people = [];
function person(o, scale = 1) { const p = makePerson(rnd); p.outer.scale.setScalar(scale); city.add(p.outer); const P = { p, s: scale, ...o, ph: R(0, 6), floatAt: R(11.2, 13.6), spin: R(-0.6, 0.6), rise: R(0.7, 1.3) }; people.push(P); return P; }
for (let i = 0; i < 110; i++) { const side = rnd() < 0.5 ? -1 : 1; if (side < 0) person({ kind: 'walk', z: side * R(8.9, 11.4), x0: R(45, 230), v: R(1.1, 1.55), lo: 40, hi: 260 }); else person({ kind: 'walk', z: side * R(8.9, 11.4), x0: R(-60, 260), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.55) }); }
for (let i = 0; i < 34; i++) person({ kind: 'walk', z: R(8.6, 11.6), x0: R(-4, 40), v: (rnd() < 0.5 ? 1 : -1) * R(0.9, 1.3), lo: -6, hi: 44 });
for (let i = 0; i < 20; i++) { const xs = pick([30 - 8.6, 30 + 8.6, 165 - 8.6]); person({ kind: 'cross', x: xs + R(-1, 1), z0: R(-11, 11), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.5) }); }
// kids doing "six seven" (hero kid first)
const CAM0 = new THREE.Vector3(3, 1.5, -1.2);
const kidSpots = [[8.6, -8.4], [11.6, -9.6], [6.6, -10.4], [13.9, -8.8], [18.5, -10.2], [21.0, -9.0], [24.5, -10.6], [27.0, -9.4], [16.8, -11.2], [10.8, -11.4]];
const kids = kidSpots.map(([x, z], i) => { const P = person({ kind: 'kid', x, z, rot: Math.atan2(CAM0.x - x, CAM0.z - z) + R(-0.25, 0.25), freeze: i === 0 ? 3.0 : R(2.95, 3.1), gph: R(0, 6) }, i === 0 ? 0.74 : R(0.66, 0.8)); return P; });
// basketball player #67
const player = person({ kind: 'player', x: COURT.x - 3.5, z: COURT.z + 0.4 }, 1.16);
const jerseyCanvas = document.createElement('canvas'); jerseyCanvas.width = 128; jerseyCanvas.height = 128;
const jerseyTex = new THREE.CanvasTexture(jerseyCanvas); jerseyTex.colorSpace = THREE.SRGBColorSpace;
const jersey = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ map: jerseyTex, transparent: true, roughness: 0.8 }));
jersey.position.set(0, 1.28, -0.13); jersey.rotation.y = Math.PI; player.p.outer.children[0].children[0].add(jersey);
const ballMesh = mesh(new THREE.SphereGeometry(0.12, 14, 10), M('#d9662a', { roughness: 0.6 })); city.add(ballMesh);

// ---- the court
{
  const ct = canvasTex(560, 300, (g, w, h) => {
    g.fillStyle = '#2f6d58'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8543a'; g.fillRect(20, 20, w - 40, h - 40);
    speckle(g, w, h, 4000, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'], 2);
    g.strokeStyle = '#f2efe6'; g.lineWidth = 4; g.strokeRect(20, 20, w - 40, h - 40); g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h - 20); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 36, 0, Math.PI * 2); g.stroke();
    for (const s of [0, 1]) { const x0 = s ? w - 20 : 20, dir = s ? -1 : 1; g.strokeRect(s ? w - 20 - 110 : 20, h / 2 - 48, 110, 96); g.beginPath(); g.arc(x0 + dir * 110, h / 2, 48, s ? Math.PI / 2 : -Math.PI / 2, s ? -Math.PI / 2 : Math.PI / 2, s ? false : false); g.stroke(); g.beginPath(); g.arc(x0 + dir * 10, h / 2, 140, -Math.PI / 2 * 0.95 + (s ? Math.PI : 0), Math.PI / 2 * 0.95 + (s ? Math.PI : 0)); g.stroke(); }
  });
  const c = mesh(new THREE.PlaneGeometry(30, 16), M('#ffffff', { map: ct, roughness: 0.85 }), false, true); c.rotation.x = -Math.PI / 2; c.position.set(COURT.x, 0.03, COURT.z); city.add(c);
  const fenceTex = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(190,195,200,1)'; g.lineWidth = 2; for (let i = -64; i < 128; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); } }, [40, 5]);
  const fm = new THREE.MeshStandardMaterial({ map: fenceTex, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
  for (const [x, z, w, ry] of [[COURT.x, COURT.z - 9.5, 34, 0], [COURT.x, COURT.z + 9.5, 34, 0], [COURT.x + 17, COURT.z, 19, Math.PI / 2]]) { const f = mesh(new THREE.PlaneGeometry(w, 4), fm, false, false); f.position.set(x, 2, z); f.rotation.y = ry; city.add(f); }
  const hx = COURT.x + 13.4;
  const pole = mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.6, 10), M('#2b2e33', { metalness: 0.4, roughness: 0.5 })); pole.position.set(hx + 1.2, 1.8, COURT.z); city.add(pole);
  box(1.2, 0.12, 0.12, '#2b2e33', hx + 0.6, 3.5, COURT.z);
  const bb = canvasTex(180, 120, (g, w, h) => { g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d23a2a'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8); g.strokeRect(62, 58, 56, 44); });
  const board = mesh(new THREE.PlaneGeometry(1.8, 1.2), M('#ffffff', { map: bb }), true, false); board.position.set(hx, 3.45, COURT.z); board.rotation.y = -Math.PI / 2; city.add(board);
  const rim = mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), M('#e2551f', { metalness: 0.3 })); rim.rotation.x = Math.PI / 2; rim.position.set(hx - 0.3, 3.05, COURT.z); city.add(rim);
  const net = mesh(new THREE.CylinderGeometry(0.23, 0.15, 0.4, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', wireframe: true })); net.position.set(hx - 0.3, 2.83, COURT.z); city.add(net);
}

// ---- LED billboards (redrawn per frame)
function ledBoard(w, h, x, y, z, ry, pxW = 512) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = Math.round(pxW * h / w); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = ry; city.add(m);
  const frame = mesh(BOX, M('#1a1b1e', { metalness: 0.4, roughness: 0.4 })); frame.scale.set(w + 0.5, h + 0.5, 0.35); frame.position.set(x, y, z - Math.cos(ry) * 0.2); frame.rotation.y = ry; city.add(frame);
  return { c, g, tex, m, frame };
}
const board1 = ledBoard(6.4, 3.7, 11.4, 6.9, -11.75, 0);
const board2 = ledBoard(16, 9, 128, 12.2, 11.75, Math.PI, 768);
function ledGrid(g, w, h) { g.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h); }
function glitchSlices(g, w, h, amt, fr) {
  if (amt <= 0) return;
  for (let k = 0; k < 10 * amt; k++) { const y = hash(fr * 13 + k) * h, hh = 4 + hash(fr * 7 + k) * 30; const dx = (hash(fr * 3 + k) - 0.5) * 120 * amt; g.drawImage(g.canvas, 0, y, w, hh, dx, y, w, hh); }
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6 * amt; k++) { g.fillStyle = hash(fr + k * 1.7) < 0.5 ? 'rgba(255,0,90,0.45)' : 'rgba(0,255,230,0.4)'; g.fillRect(hash(fr * 5 + k) * w, hash(fr * 11 + k) * h, hash(fr * 2 + k) * w * 0.5, 3 + hash(fr * 9 + k) * 14); }
  g.globalCompositeOperation = 'source-over';
}
function drawBoard1(t, fr) {
  const { g, c } = board1; const w = c.width, h = c.height;
  g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h);
  let num, col = '#ff3b4a', gl = 0;
  if (t < 0.85) num = '64'; else if (t < 1.7) num = '65'; else if (t < 2.55) num = '66'; else if (t < 3.15) { num = fr % 3 === 0 ? '67' : (fr % 3 === 1 ? '6?' : '█7'); gl = 1; } else num = '68';
  if (t >= SIX8 && t < CHAIN) { num = t < 48.4 ? 'NaN' : (t < 51.4 ? '404' : 'ERR'); gl = 0.6 + 0.4 * hash(fr); }
  g.fillStyle = '#ffb02e'; g.font = '600 26px Inter'; g.textAlign = 'center'; g.fillText('OHIO  ·  6:07 PM', w / 2, 44);
  g.fillStyle = col; g.font = `600 ${num.length > 2 ? 150 : 200}px Inter`; g.textBaseline = 'middle'; g.fillText(num, w / 2, h / 2 + 22); g.textBaseline = 'alphabetic';
  glitchSlices(g, w, h, gl, fr); ledGrid(g, w, h); board1.tex.needsUpdate = true;
}
function drawBoard2(t, fr) {
  const { g, c } = board2; const w = c.width, h = c.height;
  g.fillStyle = '#04050a'; g.fillRect(0, 0, w, h); g.textAlign = 'center';
  let gl = 0;
  if (t < 27.4) {
    g.fillStyle = '#ffcf3a'; g.font = '600 46px Inter'; g.fillText('SUPER BOWL I', w / 2, 92);
    g.fillStyle = '#ffffff'; g.font = '600 64px Inter'; g.fillText('GREEN BAY  35', w / 2, 210); g.fillText('KANSAS CITY  10', w / 2, 290);
    g.fillStyle = '#8fd0ff'; g.font = '500 34px Inter'; g.fillText('JANUARY 15, 1967', w / 2, 380);
  } else if (t < 29.6) {
    gl = 0.4 + 0.6 * smooth(27.4, 29.4, t);
    g.fillStyle = '#ffffff'; g.font = '600 190px Inter'; g.textBaseline = 'middle'; g.fillText(fr % 4 === 0 ? '19█7' : '1967', w / 2, h / 2); g.textBaseline = 'alphabetic';
  } else {
    g.font = '600 120px Inter'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.fillText('1966', w * 0.24, h / 2 - 20); g.fillText('1968', w * 0.76, h / 2 - 20);
    g.fillStyle = '#ff3b4a'; g.font = '600 70px Inter'; g.fillText('→', w / 2, h / 2 - 24);
    g.font = '500 32px Inter'; g.fillStyle = '#ff6a70'; g.fillText('1967: NO DATA', w / 2, h - 70); g.textBaseline = 'alphabetic';
    gl = 0.15 * hash(fr);
  }
  if (t >= SIX8 && t < CHAIN) gl = 1;
  glitchSlices(g, w, h, gl, fr); ledGrid(g, w, h); board2.tex.needsUpdate = true;
}

// ---- pixel glitch cubes around frozen kids + chain-reaction voxels
const pixN = 150;
const pixMat = new THREE.MeshBasicMaterial({ toneMapped: false });
const pix = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.075, 0.075), pixMat, pixN); pix.frustumCulled = false; city.add(pix);
const pixP = []; for (let i = 0; i < pixN; i++) { const k = kids[i % kids.length]; pixP.push({ k, ox: R(-0.35, 0.35), oy: R(0.2, 1.5), oz: R(-0.3, 0.3), c: pick(['#ff2a6a', '#22ffe0', '#ffffff', '#ffe02a']) }); }
pixP.forEach((p, i) => pix.setColorAt(i, new THREE.Color(p.c)));
const voxN = 9000;
const vox = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7, emissive: '#ff2050', emissiveIntensity: 0.0 }), voxN); vox.frustumCulled = false; vox.castShadow = false; city.add(vox);
const voxMat = vox.material;
// deletion front sweeps from far east toward the camera
const delStart = 46.0, delEnd = 55.3;
const tdOf = (x, z) => lerp(delEnd - 1.2, delStart, clamp((x + Math.abs(z) * 0.35 + 60) / 1300, 0, 1));
groups.forEach(G => { G.td = tdOf(G.x, G.z) + R(-0.4, 0.4); G.dur = R(1.5, 2.4); });
const voxP = [];
{
  const visible = groups.filter(G => G.x > -80 && G.x < 650 && Math.abs(G.z) < 110);
  for (let i = 0; i < voxN; i++) {
    const G = visible[Math.floor(rnd() * visible.length)]; const u = rnd();
    voxP.push({ G, u, ts: G.td + u * G.dur, ox: R(-0.5, 0.5) * G.w, oz: R(-0.5, 0.5) * G.d, vx: R(-3, 3), vy: R(5, 16), vz: R(-3, 3), s: R(0.5, 1.2), w: R(-4, 4) });
  }
  voxP.forEach((p, i) => vox.setColorAt(i, new THREE.Color(p.G.col).offsetHSL(0, 0, R(-0.08, 0.1))));
}
// "404" sprites in the sky
const errTexs = ['404', 'ERROR', 'NaN', '67?', 'NULL', '∅'].map(s => canvasTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = '600 76px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,60,90,1)'; g.fillText(s, w / 2 + 3, h / 2); g.fillStyle = 'rgba(40,255,230,0.9)'; g.fillText(s, w / 2 - 3, h / 2); g.fillStyle = '#fff'; g.fillText(s, w / 2, h / 2); }));
const errs = [];
for (let i = 0; i < 46; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pick(errTexs), transparent: true, depthWrite: false, fog: false, opacity: 0 })); s.position.set(R(60, 700), R(40, 260), R(-260, 260)); const sc = R(14, 40); s.scale.set(sc * 2, sc, 1); s.userData.t0 = R(47, 55); city.add(s); errs.push(s); }

// =================== SPACE (comet 67P) ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#010207');
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 4000);
{
  const n = 5000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, color: '#dfe6ff', transparent: true, opacity: 0.85 })));
}
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 3.2); spaceSun.position.set(-5, 2, 3); space.add(spaceSun); space.add(new THREE.AmbientLight(0x334055, 0.35));
function noise3(x, y, z) { return Math.sin(x * 1.7 + Math.sin(y * 2.3)) * Math.cos(y * 1.9 + Math.sin(z * 1.3)) * Math.sin(z * 2.1 + x * 0.7); }
function lobe(r, cx, cy, cz, sx, sy, sz) {
  const g = new THREE.IcosahedronGeometry(r, 5); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const d = 1 + 0.12 * noise3(v.x * 3, v.y * 3, v.z * 3) + 0.05 * noise3(v.x * 9, v.y * 9, v.z * 9); v.multiplyScalar(d); v.set(v.x * sx + cx, v.y * sy + cy, v.z * sz + cz); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
const cometGeo = mergeGeometries([lobe(1.0, 0, 0, 0, 1.25, 0.95, 1.0), lobe(0.72, 1.35, 1.0, 0.1, 1.0, 0.9, 1.05)]); cometGeo.computeVertexNormals(); cometGeo.translate(-0.55, -0.4, 0);
const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 10);
const comet = new THREE.Mesh(cometGeo, new THREE.MeshStandardMaterial({ color: '#57524d', roughness: 1, flatShading: true, clippingPlanes: [clip] })); space.add(comet);
const cometPts = []; { const p = cometGeo.attributes.position; for (let i = 0; i < 700; i++) { const k = Math.floor(rnd() * p.count); cometPts.push({ v: new THREE.Vector3().fromBufferAttribute(p, k), d: new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), sp: R(0.4, 1.4), w: R(-5, 5) }); } }
const cvoxMat = new THREE.MeshBasicMaterial({ toneMapped: false });
const cvox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), cvoxMat, cometPts.length); cvox.frustumCulled = false; space.add(cvox);
cometPts.forEach((p, i) => cvox.setColorAt(i, new THREE.Color(pick(['#ff2a6a', '#22ffe0', '#ffffff', '#9a948e', '#9a948e']))));
// jets of gas
const jetSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(220,235,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
jetSprite.scale.set(6, 6, 1); jetSprite.position.set(-0.6, 1.4, -0.6); space.add(jetSprite);

// =================== poses ===================
function pose67(p, ph, amp = 1) {
  const s = Math.sin(ph);
  p.arms[0].rotation.set(-0.5 + 0.38 * s * amp, 0, 0.22); p.arms[1].rotation.set(-0.5 - 0.38 * s * amp, 0, -0.22);
  p.elbows[0].rotation.x = -1.25; p.elbows[1].rotation.x = -1.25;
  p.legs[0].rotation.x = 0; p.legs[1].rotation.x = 0; p.knees[0].rotation.x = 0.03; p.knees[1].rotation.x = 0.03;
}
function poseT(p) {
  p.arms[0].rotation.set(0, 0, -1.5); p.arms[1].rotation.set(0, 0, 1.5); p.elbows[0].rotation.x = 0; p.elbows[1].rotation.x = 0;
  p.legs[0].rotation.x = 0; p.legs[1].rotation.x = 0; p.knees[0].rotation.x = 0; p.knees[1].rotation.x = 0;
}
function poseDribble(p, t) {
  poseIdle(p, t, 0); p.knees[0].rotation.x = 0.35; p.knees[1].rotation.x = 0.35; p.legs[0].rotation.x = -0.25; p.legs[1].rotation.x = -0.2;
  p.arms[1].rotation.set(-0.5 - 0.25 * Math.sin(t * 9), 0, -0.15); p.elbows[1].rotation.x = -0.6; p.arms[0].rotation.set(-0.2, 0, 0.2);
}

// =================== cameras ===================
function cityCamera(t) {
  let pos, look, fov = 60;
  if (t < HOOK) { const u = t / HOOK; pos = new THREE.Vector3(3.5 + u * 0.35, 1.0, -1.5 - u * 0.35); look = new THREE.Vector3(12.0, 5.75, -11.6); fov = lerp(74, 71, ease(u)); }
  else if (t < MEME) { const u = (t - HOOK) / (MEME - HOOK); pos = new THREE.Vector3(4.6 + u * 1.6, 1.75, -5.0); look = new THREE.Vector3(15, 1.0, -10); fov = 52; }
  else if (t < NPC) { const u = (t - MEME) / (NPC - MEME); pos = new THREE.Vector3(-12 + u * 3, 1.7, 3.0); look = new THREE.Vector3(24, lerp(3, 12, ease(u)), 9.0); fov = 62; }
  else if (t < BALL) { const u = (t - NPC) / (BALL - NPC); pos = new THREE.Vector3(COURT.x - 10.5 + u * 2.2, 1.9, COURT.z + 3.0 - u * 1.2); look = new THREE.Vector3(COURT.x + 4, 2.3, COURT.z - 0.2); fov = 50; }
  else if (t < SB) { const u = (t - BALL) / (SB - BALL); pos = new THREE.Vector3(104 + u * 4, 2.5, -5); look = new THREE.Vector3(128, 12.4, 11.8); fov = lerp(62, 54, ease(u)); }
  else if (t < TABLE) { const u = (t - SB) / (TABLE - SB); pos = new THREE.Vector3(20 + u * 3, 9, 2); look = new THREE.Vector3(120, 18, 0); fov = 60; }
  else if (t < SIX8) { const u = (t - COMET) / (SIX8 - COMET); pos = new THREE.Vector3(4.5 + u * 1.2, 1.9, -4.2); look = new THREE.Vector3(17, 1.6, -10.4); fov = 50; }
  else if (t < CHAIN) { const u = (t - SIX8) / (CHAIN - SIX8); pos = new THREE.Vector3(lerp(-4, -45, ease(u)), lerp(5, 46, ease(u)), lerp(2, 3, ease(u))); look = new THREE.Vector3(lerp(60, 120, u), lerp(10, 16, u), lerp(-4, -6, u)); fov = lerp(62, 66, u); }
  else { const u = (t - CHAIN) / (T_END - CHAIN); pos = new THREE.Vector3(-45 - u * 10, 46 + u * 4, 3); look = new THREE.Vector3(120, 16, -6); fov = 66; }
  // glitch shake
  const gk = glitchAt(t); const sh = new THREE.Vector3(hash(Math.floor(t * 30) * 1.3) - 0.5, hash(Math.floor(t * 30) * 2.1) - 0.5, 0).multiplyScalar(gk * 0.25);
  cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos).add(sh); cam.up.set(0, 1, 0); cam.lookAt(look);
}
function spaceCamera(t) {
  const u = (t - TABLE) / (COMET - TABLE); const a = 0.4 + u * 0.5;
  spaceCam.position.set(Math.sin(a) * 7.2, 1.2 - u * 0.4, Math.cos(a) * 7.2); spaceCam.lookAt(0.2, 0.25, 0); spaceCam.fov = 40; spaceCam.updateProjectionMatrix();
}

// =================== glitch schedule ===================
const SPIKES = [[2.55, 3.25, 1.0], [10.9, 11.6, 0.8], [22.5, 23.1, 0.9], [27.4, 29.7, 0.55], [34.0, 34.35, 0.6], [36.1, 36.6, 0.7], [39.6, 40.2, 0.8], [41.8, 42.2, 0.7], [44.9, 45.5, 1.0], [48.3, 48.8, 0.9], [51.3, 51.8, 0.9], [55.6, 56.4, 1.0], [58.4, 58.9, 1.0]];
function glitchAt(t) {
  let g = 0; for (const [a, b, k] of SPIKES) if (t >= a && t < b) g = Math.max(g, k * (0.6 + 0.4 * hash(Math.floor(t * 30))));
  if (t > 52 && t < CHAIN) g = Math.max(g, 0.25 + 0.5 * smooth(52, 55.8, t) * hash(Math.floor(t * 30) + 7));
  return g;
}

// =================== updates ===================
const dmy = new THREE.Object3D();
function updateCity(t, fr) {
  const red = smooth(46.5, 54.5, t), voidK = smooth(55.4, 56.6, t);
  domeMat.uniforms.uSunS.value.copy(SUN); domeMat.uniforms.uRed.value = red; domeMat.uniforms.uVoid.value = voidK; domeMat.uniforms.uGrid.value = smooth(47, 53, t);
  sunL.position.copy(cam.position).addScaledVector(SUN, 300); sunL.target.position.copy(cam.position).add(new THREE.Vector3(30, 0, 0)); sunL.target.updateMatrixWorld();
  sunL.intensity = 3.0 * (1 - 0.65 * red) * (1 - voidK); sunL.color.setRGB(1, lerp(0.8, 0.35, red), lerp(0.6, 0.35, red));
  hemi.intensity = (1.15 - 0.5 * red) * (1 - voidK * 0.9); hemi.color.setRGB(lerp(0.78, 0.9, red), lerp(0.84, 0.3, red), lerp(0.94, 0.35, red));
  const fogC = new THREE.Color(0.95, 0.66, 0.45).lerp(new THREE.Color(0.35, 0.03, 0.05), red).multiplyScalar(1 - voidK);
  city.fog.color.copy(fogC); city.fog.near = lerp(200, 30, voidK); city.fog.far = lerp(lerp(2600, 900, red), 140, voidK);
  voxMat.emissiveIntensity = 0.08 + 0.45 * voidK;
  // billboards
  drawBoard1(t, fr); if (t > 25 && t < CHAIN) drawBoard2(t, fr);
  // traffic lights
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = t > MEME && hash(fr + i) < 0.3 ? 0 : ((phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05); });
  // cars: freeze at the glitch, jitter, then float up in the chain reaction
  for (const c of cars) {
    const tt = Math.min(t, MEME); let x = wrapR(c.x0 + c.dir * c.speed * tt, -220, 760); let y = 0, z = c.lane;
    if (t > MEME) { const j = glitchAt(t) * 0.4; x += (hash(fr + c.ph * 10) - 0.5) * j; z += (hash(fr * 2 + c.ph) - 0.5) * j; }
    if (t > 46) { const d = Math.max(0, t - tdOf(x, z)); y = d * d * c.fly * 1.2; c.g.rotation.set(d * 0.3 * c.fly, (c.dir > 0 ? 0 : Math.PI) + d * 0.2, d * 0.25); } else c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0);
    c.g.position.set(x, y, z); c.g.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 6 && y < 300;
  }
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); });
  // people
  for (const P of people) {
    const o = P.p.outer, s = P.s;
    if (P.kind === 'walk' || P.kind === 'cross') {
      const tw = Math.min(t, P.floatAt);
      let x, z, ry;
      if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * tw, P.lo ?? -60, P.hi ?? 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { z = wrapR(P.z0 + P.v * tw, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
      const gy = Math.abs(z) > 7 ? 0.18 : 0;
      if (t < P.floatAt) { o.position.set(x, gy + 0.95 * s, z); o.rotation.set(0, ry, 0); poseWalk(P.p, t * 1.3 * 4.4 + P.ph); }
      else { const d = t - P.floatAt; const up = P.rise * Math.pow(d, 1.25) * (1 + 2.5 * smooth(46, 54, t)); o.position.set(x, gy + 0.95 * s + up, z); o.rotation.set(0.15 * Math.sin(d * 0.7 + P.ph), ry + P.spin * d, 0.1 * Math.sin(d * 0.5)); poseT(P.p); }
    } else if (P.kind === 'kid') {
      o.position.set(P.x, 0.18 + 0.95 * s, P.z); o.rotation.set(0, P.rot, 0);
      if (t < P.freeze) pose67(P.p, t * 2 * Math.PI * 2.3 + P.gph, 1);
      else if (t >= COMET + 0.2 && t < SIX8 + 0.6) pose67(P.p, t * 2 * Math.PI * 2.6 + P.gph, 1.1);
      else if (t >= SIX8 + 0.6) { const d = t - (SIX8 + 0.6); o.position.y += 0.4 * d * d * (1 + 0.3 * Math.sin(P.gph)); o.rotation.y += d * 0.4; pose67(P.p, P.freeze * 2 * Math.PI * 2.3 + P.gph, 1); }
      else pose67(P.p, P.freeze * 2 * Math.PI * 2.3 + P.gph, 1);
    } else if (P.kind === 'player') {
      o.position.set(P.x + 0.15 * Math.sin(t * 0.8), 0.95 * s + 0.03, P.z); o.rotation.set(0, Math.PI / 2, 0); poseDribble(P.p, t);
    }
  }
  // ball dribble (right hand side of the player)
  { const ph = (t * 1.45) % 1; const y = 0.13 + 0.95 * Math.abs(Math.sin(Math.PI * ph)); const pp = player.p.outer.position; ballMesh.position.set(pp.x + 0.45, y, pp.z + 0.42); }
  // jersey "67" glitches away
  {
    const g = jerseyCanvas.getContext('2d'); g.clearRect(0, 0, 128, 128);
    let txt = '67', a = 1; if (t > 22.5 && t < 23.1) { txt = fr % 2 ? '6' : (fr % 3 ? '█7' : '67'); } else if (t >= 23.1) { txt = ''; }
    g.fillStyle = `rgba(255,255,255,${a})`; g.font = '600 92px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64, 70);
    if (t > 22.5 && t < 23.1) { g.fillStyle = 'rgba(255,0,90,0.8)'; g.fillRect(0, hash(fr) * 110, 128, 10); g.fillStyle = 'rgba(0,255,230,0.8)'; g.fillRect(0, hash(fr + 3) * 110, 128, 7); }
    jerseyTex.needsUpdate = true;
  }
  // glitch pixels around the frozen kids (4–42 s)
  const pixOn = t > 3.0 && t < COMET;
  pixP.forEach((p, i) => {
    const k = p.k.p.outer; const flick = hash(fr * 0.37 + i * 1.71);
    if (!pixOn || flick < 0.45) { dmy.position.set(0, -999, 0); dmy.scale.setScalar(0); }
    else { dmy.position.set(k.position.x + p.ox + (hash(fr + i) - 0.5) * 0.1, 0.18 + p.oy * p.k.s, k.position.z + p.oz); dmy.scale.setScalar(R0(i) * (0.6 + flick)); dmy.rotation.set(0, 0, 0); }
    dmy.updateMatrix(); pix.setMatrixAt(i, dmy.matrix);
  });
  pix.instanceMatrix.needsUpdate = true;
  // chain reaction: every group shrinks from the top into voxels
  for (const G of groups) { const k = smooth(G.td, G.td + G.dur, t); G.g.scale.y = Math.max(0.0001, 1 - k); G.g.visible = k < 0.999; }
  for (let i = 0; i < voxN; i++) {
    const p = voxP[i]; const age = t - p.ts;
    if (age < 0 || age > 6) { dmy.position.set(0, -999, 0); dmy.scale.setScalar(0); }
    else { const G = p.G; const y0 = G.h * (1 - p.u); dmy.position.set(G.x + p.ox + p.vx * age, y0 + p.vy * age + 1.2 * age * age, G.z + p.oz + p.vz * age); dmy.rotation.set(age * p.w, age * p.w * 0.6, 0); dmy.scale.setScalar(p.s * (1 - smooth(3.5, 6, age))); }
    dmy.updateMatrix(); vox.setMatrixAt(i, dmy.matrix);
  }
  vox.instanceMatrix.needsUpdate = true;
  errs.forEach((s, i) => { const a = smooth(s.userData.t0, s.userData.t0 + 0.2, t) * (hash(fr * 0.5 + i) < 0.15 ? 0.2 : 1) * (1 - smooth(57.5, 59, t)); s.material.opacity = a; s.position.y += 0; });
  // ground disappears into the void
  far.visible = ground.visible = t < 56.2;
}
function R0(i) { return 0.7 + 0.6 * hash(i * 3.3); }
function updateSpace(t, fr) {
  const u = (t - TABLE) / (COMET - TABLE);
  comet.rotation.set(0.3, t * 0.25, 0.15); cvox.rotation.copy(comet.rotation);
  // deletion sweep 39.6 -> 41.2 along world x
  const front = lerp(2.6, -2.6, smooth(39.6, 41.3, t));
  clip.constant = front; clip.normal.set(-1, 0, 0);   // keeps x < front
  comet.material.clippingPlanes = [clip];
  jetSprite.material.opacity = 0.6 * (1 - smooth(39.6, 40.8, t));
  const m4 = new THREE.Matrix4().makeRotationFromEuler(comet.rotation);
  cometPts.forEach((p, i) => {
    const w = p.v.clone().applyMatrix4(m4); const tPass = lerp(39.6, 41.3, clamp((2.6 - w.x) / 5.2, 0, 1));
    const age = t - tPass;
    if (age < 0 || t < 39.6) { dmy.position.set(0, -999, 0); dmy.scale.setScalar(0); }
    else { dmy.position.copy(p.v).addScaledVector(p.d, p.sp * age); dmy.scale.setScalar(1.6 * (1 - smooth(0.8, 2.2, age))); dmy.rotation.set(age * p.w, age * p.w, 0); }
    dmy.updateMatrix(); cvox.setMatrixAt(i, dmy.matrix);
  });
  cvox.instanceMatrix.needsUpdate = true;
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'cracks', 'gl', 'ptable', 'dim'].map(k => [k, $(k)]));
const glCtx = el.gl.getContext('2d');
const fadeWin = (t, a, b, f = 0.22) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [1.3, 3.05, '"SIX… SEV—"'],
  [4.3, 7.5, 'Ohio, 6:07 PM.<br>The number 67 is gone.'],
  [7.7, 10.8, "Dictionary.com's Word of the Year…<br>deleted."],
  [11.4, 14.9, "The simulation can't count<br>past 66 anymore."],
  [15.1, 18.8, 'Everyone just became<br>an NPC.'],
  [19.3, 22.5, 'Every 6′7″ player<br>is now 6′8″.'],
  [22.8, 25.8, 'Yes, even LaMelo Ball.'],
  [26.3, 29.6, '1967 is gone.<br>Super Bowl I never happened.'],
  [29.9, 33.8, 'The Packers just lost<br>their first Super Bowl ring.'],
  [34.4, 37.8, "Element 67, holmium,<br>got ratio'd."],
  [38.3, 41.8, 'Comet 67P<br>left the group chat.'],
  [42.3, 44.8, 'But the kids adapted.<br>"SIX… EIGHT!"'],
  [45.3, 48.2, 'So the universe<br>deleted 68.'],
  [48.5, 51.2, 'RIP 69.<br>The internet mourns.'],
  [51.5, 55.6, 'Then 70. Then 100.<br>Then everything.'],
  [56.5, 60.3, "Should've just let them<br>say 67."],
];
function fmtN(n) { return Math.round(n).toLocaleString('en-US'); }
function hudAt(t, fr) {
  let stat = '', lab = '', val = '', sub = '';
  if (t < HOOK) { lab = 'COUNTING'; val = t < 0.85 ? '64' : t < 1.7 ? '65' : t < 2.55 ? '66' : t < 3.15 ? (fr % 2 ? '67' : '6̷7̷') : '68'; sub = 'OHIO · 6:07 PM'; }
  else if (t < MEME) { lab = 'GLOBAL AURA'; val = (t < 4.3 ? '0' : '−' + fmtN(6700 * ease((t - 4.3) / 2.6))); sub = 'WORD OF THE YEAR 2025 · DELETED'; }
  else if (t < NPC) { stat = '<b></b>SIMULATION ERROR'; lab = 'MAX NUMBER'; val = '66'; sub = "CAN'T COUNT PAST 66"; }
  else if (t < BALL) { lab = 'HEIGHT'; val = t < 22.5 ? '6′7″' : (t < 23.1 ? (fr % 2 ? '6′█″' : '6′7″') : '6′8″'); sub = 'LAMELO BALL · LISTED 6′7″'; }
  else if (t < SB) { lab = 'YEAR'; val = t < 27.4 ? '1967' : (t < 29.6 ? (fr % 3 ? '19█7' : '1967') : '—'); sub = t < 29.6 ? 'SUPER BOWL I · JAN 15, 1967' : 'PACKERS 35 · CHIEFS 10 · ERASED'; }
  else if (t < TABLE) { lab = 'ELEMENT 67'; val = t < 36.3 ? 'Holmium' : 'Deleted'; sub = 'MOST MAGNETIC NATURAL ELEMENT'; }
  else if (t < COMET) { lab = 'COMET'; val = t < 39.7 ? '67P' : (t < 41.3 ? (fr % 2 ? '6█P' : '67P') : '—'); sub = 'FIRST COMET LANDING · 2014'; }
  else if (t < SIX8) { lab = 'NEW NUMBER'; val = '68'; sub = 'THE KIDS ADAPTED'; }
  else if (t < CHAIN) {
    stat = '<b></b>CHAIN REACTION'; lab = 'NOW DELETING';
    if (t < 48.4) val = '68'; else if (t < 51.4) val = '69'; else { const k = (t - 51.4) / (55.4 - 51.4); val = k >= 1 ? 'ALL' : fmtN(70 * Math.pow(10, 6 * Math.pow(k, 1.6))); }
    sub = t < 48.4 ? 'NUMBERS DELETED · 2' : (t < 51.4 ? 'NICE. · DELETED ANYWAY' : 'NUMBERS LEFT · FEW');
  }
  else { lab = 'NUMBERS LEFT'; val = '0'; sub = 'NOTHING CAN BE COUNTED'; }
  return { stat, lab, val, sub };
}
// periodic table
const SYM = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
function cellPos(z) {
  if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
  if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8]; if (z <= 18) return [3, z <= 12 ? z - 10 : z];
  if (z <= 36) return [4, z - 18]; if (z <= 54) return [5, z - 36];
  if (z <= 56) return [6, z - 54]; if (z <= 71) return [9, z - 54]; if (z <= 86) return [6, z - 68];
  if (z <= 88) return [7, z - 86]; if (z <= 103) return [10, z - 86]; return [7, z - 100];
}
let hoCell = null;
{
  const CW = 48, GAP = 2; let s = '';
  for (let z = 1; z <= 118; z++) {
    const [r, c] = cellPos(z); const x = (c - 1) * (CW + GAP), y = (r - 1) * (CW + GAP) + (r >= 9 ? 14 : 0);
    const cat = (z >= 57 && z <= 71) || (z >= 89 && z <= 103) ? 'f' : (c <= 2 ? 's' : (c >= 13 ? 'p' : 'd'));
    s += `<div class="pc ${cat}${z === 67 ? ' ho' : ''}" id="pc${z}" style="left:${x}px;top:${y}px"><i>${z}</i>${SYM[z - 1]}</div>`;
  }
  el.ptable.innerHTML = s; hoCell = $('pc67');
}
function buildCracks() {
  let s = '';
  for (const [cx, cy, n] of [[300, 620, 13], [820, 1180, 11], [190, 1560, 9]]) {
    for (let i = 0; i < n; i++) {
      let a = i / n * Math.PI * 2 + R(-0.2, 0.2), x = cx, y = cy; let d = `M${cx},${cy}`; const L = R(160, 520);
      for (let l = 0; l < L; l += R(25, 60)) { a += R(-0.35, 0.35); x += Math.cos(a) * R(25, 60); y += Math.sin(a) * R(25, 60); d += ` L${x.toFixed(1)},${y.toFixed(1)}`; }
      s += `<path d="${d}" stroke="rgba(255,255,255,.85)" stroke-width="${R(1.5, 3).toFixed(1)}" fill="none"/>`;
    }
    for (const rr of [R(40, 70), R(110, 160)]) { let d = ''; const a0 = R(0, 6), a1 = a0 + R(2, 4.5); for (let a = a0; a < a1; a += 0.3) { const r = rr * R(0.85, 1.15); d += `${d ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `; } s += `<path d="${d}" stroke="rgba(255,255,255,.7)" stroke-width="1.6" fill="none"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(255,255,255,.9)"/>`;
  }
  el.cracks.innerHTML = s;
}
function updateDOM(t, fr) {
  el.title.style.opacity = 1 - smooth(HOOK - 0.35, HOOK, t);
  const h = hudAt(t, fr); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = (t >= HOOK ? 1 : 0) * (1 - smooth(T_END, T_END + 0.4, t));
  el.cap.style.top = t < HOOK ? '1170px' : '1250px';
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  // periodic table overlay
  const pt = fadeWin(t, SB, TABLE, 0.35); el.ptable.style.opacity = pt; el.dim.style.opacity = 0.62 * pt;
  const fall = smooth(36.3, 37.6, t); const jit = t > 35.4 && t < 36.4 ? (hash(fr) - 0.5) * 14 : 0;
  hoCell.style.transform = `translate(${jit + fall * 60}px, ${fall * fall * 900}px) rotate(${fall * 40}deg)`;
  hoCell.style.filter = t > 35.4 && t < 36.4 && fr % 2 ? 'hue-rotate(160deg) saturate(3)' : 'none';
  el.flash.style.opacity = (t >= 58.5 ? Math.exp(-(t - 58.5) * 3) * 0.9 : 0) + (t >= 2.55 && t < 3.25 ? 0.35 * Math.exp(-(t - 2.55) * 8) : 0);
  el.cracks.style.opacity = t >= 58.5 ? 1 - smooth(T_END + 2.5, T_END + 3.2, t) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
function drawGlitch(t, fr) {
  const g = glCtx; g.clearRect(0, 0, W, H);
  const k = glitchAt(t); if (k <= 0.02 || t >= T_END) return;
  const n = Math.floor(6 + 22 * k);
  for (let i = 0; i < n; i++) { const y = Math.floor(hash(fr * 17 + i) * H), hh = Math.floor(6 + hash(fr * 29 + i) * 90 * k); const dx = (hash(fr * 31 + i) - 0.5) * 160 * k; g.drawImage(glCanvas, 0, y, W, hh, dx, y, W, hh); }
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n * 0.6; i++) { g.fillStyle = hash(fr * 3 + i) < 0.5 ? `rgba(255,0,90,${0.25 * k})` : `rgba(0,255,230,${0.22 * k})`; g.fillRect(0, hash(fr * 7 + i) * H, W, 4 + hash(fr * 13 + i) * 40 * k); }
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 14 * k; i++) { g.fillStyle = hash(fr * 5 + i) < 0.5 ? '#000' : (hash(fr * 9 + i) < 0.5 ? '#ff2a6a' : '#22ffe0'); g.fillRect(hash(fr * 41 + i) * W, hash(fr * 43 + i) * H, 20 + hash(fr * 47 + i) * 120, 12 + hash(fr * 53 + i) * 40); }
}

// =================== main ===================
window.renderAt = (t) => {
  const fr = Math.round(t * 30);
  updateDOM(t, fr);
  if (window.PASS === 'text') return true;
  renderer.clear();
  if (t >= TABLE && t < COMET) { spaceCamera(t); updateSpace(t, fr); renderer.render(space, spaceCam); }
  else {
    cityCamera(t); updateCity(t, fr);
    skyCam.fov = cam.fov; skyCam.aspect = cam.aspect; skyCam.updateProjectionMatrix(); skyCam.position.set(0, 0, 0); skyCam.quaternion.copy(cam.quaternion);
    renderer.render(sky, skyCam); renderer.clearDepth(); renderer.render(city, cam);
  }
  drawGlitch(t, fr);
  return true;
};
buildCracks();
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
