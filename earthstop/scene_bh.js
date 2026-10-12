import * as THREE from 'three';
import { makePerson as mkPerson, poseWalk, poseIdle, poseFlail } from './people.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// ===================== timeline =====================
const T0 = 4.0;          // black hole appears
const T_END = 61.0;      // end card
// visual "pull radius" (m) — everything closer than this has started falling in
const RV = [[4, 0], [9, 4], [15, 30], [21, 95], [27, 270], [33, 430]];
// real elapsed time since it appeared (s), log-interpolated per shot
const TAU = [[9, 2e-6], [15, 5e-5], [21, 3e-4], [27, 4e-3], [33, 0.08], [39, 1], [46, 3600], [53, 864000], [58, 6048000], [61, 31557600]];

// ===================== helpers =====================
let seed = 777;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
function rvAt(t) { if (t <= RV[0][0]) return 0; for (let i = 1; i < RV.length; i++) if (t <= RV[i][0]) { const [a, va] = RV[i - 1], [b, vb] = RV[i]; const k = (t - a) / (b - a); return lerp(va, vb, i === 1 ? k * k : k); } const [a, va] = RV[RV.length - 1]; return va + (t - a) * 30; }
function rvInv(d) { for (let i = 1; i < RV.length; i++) { const [a, va] = RV[i - 1], [b, vb] = RV[i]; if (d <= vb) { let k = (d - va) / (vb - va); if (i === 1) k = Math.sqrt(k); return lerp(a, b, k); } } const [a, va] = RV[RV.length - 1]; return a + (d - va) / 30; }
function tauAt(t) { if (t < T0) return 0; if (t < 9) { const k = (t - T0) / 5; return 2e-6 * k * k; } for (let i = 1; i < TAU.length; i++) if (t <= TAU[i][0]) { const [a, va] = TAU[i - 1], [b, vb] = TAU[i]; return va * Math.pow(vb / va, (t - a) / (b - a)); } return TAU[TAU.length - 1][1]; }

// ===================== renderer / post =====================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const LensShader = {
  uniforms: { tDiffuse: { value: null }, bh: { value: new THREE.Vector2() }, thetaE: { value: 0 }, blackR: { value: 0 }, ring: { value: 0 }, on: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, whiteout: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 bh; uniform float thetaE, blackR, ring, on, whiteout; uniform vec2 res; varying vec2 vUv;
    void main(){
      vec2 p = vUv * res; vec3 col;
      if (on > 0.5) {
        vec2 d = p - bh; float r = max(length(d), 0.001);
        vec2 src = p - d * (thetaE * thetaE) / (r * r);
        col = texture2D(tDiffuse, clamp(src / res, vec2(0.001), vec2(0.999))).rgb;
        col += vec3(1.0, 0.8, 0.55) * ring * exp(-pow((r - blackR * 1.25) / max(2.0, blackR * 0.18), 2.0));
        col *= smoothstep(blackR * 0.92, blackR * 1.05, r);
      } else col = texture2D(tDiffuse, vUv).rgb;
      col = mix(col, vec3(6.0, 5.2, 4.2), whiteout);
      gl_FragColor = vec4(col, 1.0);
    }`
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 30000);
scene.add(camera);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H); gtao.blendIntensity = 0.9;
gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
composer.addPass(gtao);
const lensPass = new ShaderPass(LensShader); composer.addPass(lensPass); const postMat = lensPass.material;
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.5, 0.9); composer.addPass(bloom);
composer.addPass(new OutputPass());
function skyTex(top, mid, bot) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
scene.background = skyTex('#6f95c8', '#bcd0e6', '#f1dcc0');
scene.fog = new THREE.Fog(new THREE.Color('#dfe3e6'), 200, 1400);
const hemi = new THREE.HemisphereLight(0xcfe0f5, 0x6a5a40, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 400 }); sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);
const P = new THREE.Vector3(0, 1.1, 10);   // where the black hole appears
const bhLight = new THREE.PointLight(0xffa860, 0, 0, 1.6); bhLight.position.copy(P); scene.add(bhLight);

const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, color, x = 0, y = 0, z = 0) { const m = mesh(BOX, M(color)); m.scale.set(w, h, d); m.position.set(x, y, z); return m; }
function radialTex(stops) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const glowTex = radialTex([[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,230,190,0.9)'], [0.4, 'rgba(255,150,60,0.35)'], [1, 'rgba(255,90,20,0)']]);

// ===================== deformable ground =====================
const GS = 1100, GN = 220;
const groundGeo = new THREE.PlaneGeometry(GS, GS, GN, GN); groundGeo.rotateX(-Math.PI / 2); groundGeo.translate(P.x, 0, P.z);
const gpos = groundGeo.attributes.position; const gBase = gpos.array.slice();
const gcol = new Float32Array(gpos.count * 3); const gColBase = new Float32Array(gpos.count * 3);
const cc = new THREE.Color();
function groundAt(x, z) {
  if (z > -11 && z < -9.5) return ['#9a8f86', 0.6];
  if (z <= -11 && z > -42) return ['#4b7896', -0.6];
  if (z <= -42 && z > -48) return ['#9a8f86', 0.6];
  if (z <= -48) return [(((x % 26) + 26) % 26) < 4 ? '#8d8a86' : '#7b8f55', 0.62];
  if (z > -9.5 && z < -4) return ['#55545a', 0.02];
  if (z > 32) return ['#cdb48e', 0.02];
  if (Math.abs(z - 14) < 1.6 || Math.abs(z + 2.5) < 1.3 || (((x + 15) % 30) + 30) % 30 < 3) return ['#d8c39f', 0.03];
  return ['#6e9448', 0];
}
for (let i = 0; i < gpos.count; i++) {
  const x = gBase[i * 3], z = gBase[i * 3 + 2]; const [c, h] = groundAt(x, z);
  gBase[i * 3 + 1] = h; cc.set(c); cc.offsetHSL(0, 0, R(-0.015, 0.015)); gColBase.set([cc.r, cc.g, cc.b], i * 3);
}
gcol.set(gColBase); groundGeo.setAttribute('color', new THREE.BufferAttribute(gcol, 3)); gpos.array.set(gBase);
const ground = mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), false, true); scene.add(ground);
const soilA = new THREE.Color('#5a4330'), soilB = new THREE.Color('#2a1d14'), hotC = new THREE.Color('#e0501a');
let lastRv = -1;
function updateGround(rv, heat) {
  if (Math.abs(rv - lastRv) < 1e-4 && heat === 0) return; lastRv = rv;
  const a = gpos.array;
  for (let i = 0; i < gpos.count; i++) {
    const x = gBase[i * 3], z = gBase[i * 3 + 2], dx = x - P.x, dz = z - P.z; const r = Math.hypot(dx, dz);
    let y = gBase[i * 3 + 1], k = 0;
    if (rv > 0 && r < rv * 1.25) {
      if (r < rv) { y = -Math.sqrt(rv * rv - r * r) * 0.9; k = 1; }
      else { const u = (r - rv) / (rv * 0.25); y += Math.sin(u * Math.PI) * rv * 0.04; k = 0; }
    }
    a[i * 3 + 1] = y;
    if (k) { const dep = clamp(-y / Math.max(rv, 0.01), 0, 1); cc.copy(soilA).lerp(soilB, dep); if (heat > 0) cc.lerp(hotC, clamp(heat * (1 - dep * 0.5), 0, 1)); gcol.set([cc.r, cc.g, cc.b], i * 3); }
    else { gcol[i * 3] = gColBase[i * 3]; gcol[i * 3 + 1] = gColBase[i * 3 + 1]; gcol[i * 3 + 2] = gColBase[i * 3 + 2]; }
  }
  gpos.needsUpdate = true; groundGeo.attributes.color.needsUpdate = true; groundGeo.computeVertexNormals();
}

// far city (for the aerial shot)
const farGround = mesh(new THREE.PlaneGeometry(40000, 40000), M('#8f8b84'), false, true); farGround.rotation.x = -Math.PI / 2; farGround.position.set(0, -0.2, 0); scene.add(farGround);
for (const [x, w] of [[-1900, 1100], [1700, 900]]) { const r = mesh(new THREE.PlaneGeometry(w, 40000), M('#43708e'), false, true); r.rotation.x = -Math.PI / 2; r.position.set(x, -0.1, 0); scene.add(r); }
const park = mesh(new THREE.PlaneGeometry(800, 3800), M('#6e9448'), false, true); park.rotation.x = -Math.PI / 2; park.position.set(0, -0.15, -1200); scene.add(park);
const sprawlN = 9000; const sprawl = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), sprawlN); sprawl.receiveShadow = true;
{ const d = new THREE.Object3D(); let n = 0; const cols = ['#c9b9a5', '#a7adb8', '#d8cbb6', '#b49a85', '#8e98a6', '#a8573f', '#e1d6c4'];
  while (n < sprawlN) {
    const x = R(-9000, 9000), z = R(-9000, 6000);
    if (Math.abs(x + 1900) < 600 || Math.abs(x - 1700) < 500 || (Math.abs(x) < 450 && z > -3200 && z < 900) || Math.hypot(x - P.x, z - P.z) < 560) continue;
    const h = rnd() < 0.08 ? R(80, 260) : R(12, 60); d.position.set(x, h / 2, z); d.scale.set(R(25, 60), h, R(25, 60)); d.updateMatrix(); sprawl.setMatrixAt(n, d.matrix); sprawl.setColorAt(n, new THREE.Color(pick(cols))); n++;
  } }
scene.add(sprawl);

// ===================== actors (everything that can fall in) =====================
const actors = [];
function addActor(obj, opt = {}) {
  scene.add(obj);
  const S = obj.position.clone(); const rel = S.clone().sub(P); const d0 = Math.hypot(rel.x, rel.z);
  const a = { obj, S, rot0: obj.rotation.clone(), sc0: obj.scale.clone(), d0, tr: rvInv(d0 * R(0.97, 1.03)), T: (1.0 + 0.02 * d0) * R(0.85, 1.15), spin: new THREE.Vector3(R(-3, 3), R(-3, 3), R(-3, 3)), sw: R(1.0, 2.2), lift: R(0.05, 0.25), ...opt };
  actors.push(a); return a;
}
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
  body.add(box(0.33, 0.36, 0.33, skin, 0, 1.73, 0)); if (rnd() < 0.85) body.add(box(0.35, 0.12, 0.35, pick(hairs), 0, 1.94, -0.01));
  return { outer, legs, arms };
}
const POVD = { x: 9, z: 22 }; // where "you" stand
for (let i = 0; i < 230; i++) {
  const p = mkPerson(rnd); let x = R(-90, 90), z = rnd() < 0.15 ? R(-5.2, -3.5) : R(-1, 30);
  if (Math.hypot(x - P.x, z - P.z) < 2.5 || Math.hypot(x - POVD.x, z - POVD.z) < 2.5) continue;
  const moving = rnd() < 0.65; const heading = R(0, Math.PI * 2);
  p.outer.position.set(x, 0.95, z); p.outer.rotation.y = heading;
  const a = addActor(p.outer, { kind: 'person', person: p, walk: moving ? R(1.0, 1.5) : 0, ph: R(0, 6) });
}
for (let i = 0; i < 34; i++) {
  const g = new THREE.Group(); g.add(box(1.8, 0.1, 0.5, '#8a5a34', 0, 0, 0)); g.add(box(1.8, 0.45, 0.08, '#8a5a34', 0, 0.28, -0.24));
  for (const sx of [-0.75, 0.75]) g.add(box(0.08, 0.45, 0.45, '#2b2b2b', sx, -0.24, 0));
  g.position.set(R(-90, 90), 0.47, pick([11.6, 16.4, 0.2]) + R(-0.2, 0.2)); addActor(g, { kind: 'bench' });
}
const lampGeo = new THREE.CylinderGeometry(0.09, 0.12, 4.2, 6), lampHead = new THREE.SphereGeometry(0.35, 8, 6);
for (let x = -150; x <= 150; x += 11) for (const z of [-4.3, 12.2]) {
  const g = new THREE.Group(); const p = mesh(lampGeo, M('#2f2f33')); p.position.y = 2.1; g.add(p);
  const h = mesh(lampHead, M('#fff1cf', { emissive: '#ffdca0', emissiveIntensity: 0.4 })); h.position.y = 4.35; g.add(h);
  g.position.set(x + (z > 0 ? 5 : 0), 0, z); if (Math.hypot(g.position.x - P.x, g.position.z - P.z) > 3) addActor(g, { kind: 'lamp' });
}
const carCols = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#f2c12e', '#6d7a83', '#3d6b4a', '#f2c12e'];
const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10); wheelGeo.rotateX(Math.PI / 2);
for (let i = 0; i < 30; i++) {
  const g = new THREE.Group(); const c = pick(carCols);
  g.add(box(4.2, 0.75, 1.8, c, 0, 0, 0)); g.add(box(2.3, 0.62, 1.6, c, -0.2, 0.66, 0)); g.add(box(2.1, 0.5, 1.64, '#8fb0c8', -0.2, 0.66, 0));
  for (const wx of [-1.35, 1.35]) for (const wz of [-0.9, 0.9]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, -0.38, wz); g.add(w); }
  const lane = rnd() < 0.5 ? -5.4 : -8.2; g.rotation.y = lane < -6.8 ? Math.PI : 0; g.position.set(R(-160, 160), 0.75, lane);
  addActor(g, { kind: 'car', drive: R(9, 13) * (lane < -6.8 ? -1 : 1) });
}
for (let i = 0; i < 10; i++) {
  const g = new THREE.Group(); g.add(box(5, 0.8, 1.8, '#e8e4da', 0, 0, 0)); g.add(box(2, 0.9, 1.4, pick(['#355d82', '#b8423a', '#2f6b55']), -0.4, 0.8, 0));
  g.position.set(R(-160, 160), -0.25, R(-36, -16)); addActor(g, { kind: 'boat', drive: R(-2, 2) });
}
const birdGeo = new THREE.BufferGeometry(); birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.5, 0, 0.45, 0, 0, 0.25, 0, 0, 0, 0.5, 0, 0.45, 0, 0, 0.25], 3));
const birdMat = new THREE.MeshBasicMaterial({ color: '#2a2a2e', side: THREE.DoubleSide });
for (let i = 0; i < 40; i++) { const b = new THREE.Mesh(birdGeo, birdMat); b.position.set(R(-120, 120), R(8, 26), R(-40, 40)); addActor(b, { kind: 'bird', ang: R(0, 6), rad: R(4, 12), w: R(0.4, 0.9) }); }
// trees
const autumn = ['#5f8d3a', '#7a9a3a', '#d98b2b', '#e0b33a', '#c4562a', '#6c8f35', '#b98a2e', '#4f7a34'];
const foliageGeo = new THREE.IcosahedronGeometry(1, 0);
function makeTree(x, z, s) {
  if (Math.hypot(x - P.x, z - P.z) < 6 || Math.hypot(x - POVD.x, z - POVD.z) < 5 || (Math.abs(z - 14) < 2.3)) return;
  const pivot = new THREE.Group(); pivot.position.set(x, 0, z);
  const tr = mesh(new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 3.2 * s, 6), M('#5b3f2a')); tr.position.y = 1.6 * s; pivot.add(tr);
  const n = 3 + Math.floor(rnd() * 3); const col = pick(autumn);
  for (let i = 0; i < n; i++) { const r = R(1.2, 2.0) * s; const b = mesh(foliageGeo, M(rnd() < 0.7 ? col : pick(autumn))); b.scale.set(r, r * R(0.85, 1.1), r); b.position.set(R(-1, 1) * s, (3.4 + R(0, 1.8)) * s, R(-1, 1) * s); b.rotation.set(R(0, 3), R(0, 3), R(0, 3)); pivot.add(b); }
  addActor(pivot, { kind: 'tree', ph: R(0, 6) });
}
for (let i = 0; i < 170; i++) makeTree(R(-160, 160), R(1, 30), R(0.9, 1.35));
for (let x = -170; x < 170; x += R(6, 10)) makeTree(x, R(-1.8, -0.8), R(0.9, 1.2));
for (let x = -170; x < 170; x += R(5, 9)) makeTree(x, R(-52, -48), R(1.0, 1.4));
// buildings: stacks of segments that can be torn off
function windowTex(base, win) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  g.fillStyle = win; for (let y = 8; y < 64; y += 16) for (let x = 6; x < 64; x += 16) g.fillRect(x, y, 8, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
}
const bTex = [['#c9b9a5', '#7f8b96'], ['#a7adb8', '#6d7480'], ['#d8cbb6', '#8a96a0'], ['#b49a85', '#6f7c88'], ['#e1d6c4', '#93a3b0'], ['#8e98a6', '#5f6875'], ['#a8573f', '#6b7c8a']].map(([b, w]) => windowTex(b, w));
const buildings = [];
function building(x, z, w, d, h) {
  const nseg = Math.max(2, Math.round(h / 12)); const sh = h / nseg; const tex = bTex[Math.floor(rnd() * bTex.length)];
  const mats = {}; const segs = [];
  for (let i = 0; i < nseg; i++) {
    const key = 'm'; const tx = tex.clone(); tx.needsUpdate = true; tx.repeat.set(w / 4, sh / 4);
    const m = mesh(BOX, new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85, flatShading: true })); m.scale.set(w, sh, d); m.position.set(x, 0.6 + sh * (i + 0.5), z);
    const a = addActor(m, { kind: 'seg', hFrac: (i + 0.5) / nseg, bx: x, bz: z, by: m.position.y }); a.tr -= (i / nseg) * 0.6; segs.push(a);
  }
  buildings.push({ x, z, h, segs });
}
for (let i = 0; i < 70; i++) building(R(-260, 260), R(-150, -260), R(10, 20), R(8, 16), rnd() < 0.15 ? R(60, 120) : R(16, 45));
for (let i = 0; i < 90; i++) building(R(-420, 420), R(-290, -420), R(10, 22), R(8, 18), rnd() < 0.15 ? R(70, 140) : R(18, 50));
for (let i = 0; i < 40; i++) { const sgn = rnd() < 0.5 ? -1 : 1; building(sgn * R(170, 420), R(-120, 120), R(10, 20), R(8, 16), R(16, 50)); }

// ===================== debris particles =====================
const dummy = new THREE.Object3D();
const debrisN = 7000;
const debris = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.25), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), debrisN); debris.frustumCulled = false; scene.add(debris);
const DP = [];
for (let i = 0; i < debrisN; i++) {
  // sample start distance roughly uniform in pull radius growth
  const d0 = Math.pow(rnd(), 1.6) * 430 + 0.4; const ang = R(0, Math.PI * 2); const kind = rnd();
  const y0 = kind < 0.55 ? R(-0.4, 0.3) : (kind < 0.85 ? R(0.5, 8) : R(5, 30));
  const color = kind < 0.55 ? pick(['#5a4330', '#3b2a1c', '#6e9448', '#7d6a50', '#d8c39f']) : (kind < 0.85 ? pick(autumn) : pick(['#c9b9a5', '#a7adb8', '#8fb0c8', '#d8cbb6']));
  const s = d0 < 6 ? R(0.08, 0.3) : (d0 < 40 ? R(0.2, 0.8) : R(0.6, 3.5));
  DP.push({ d0, ang, y0, s, tr: rvInv(d0) + R(-0.2, 0.4), T: (1.0 + 0.02 * d0) * R(0.8, 1.2), sw: R(1.0, 2.5), r: [R(0, 6), R(0, 6), R(0, 6)], w: [R(-6, 6), R(-6, 6), R(-6, 6)] });
  debris.setColorAt(i, new THREE.Color(color));
}
// accretion disk particles
const diskN = 2500;
const diskMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const disk = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), diskMat, diskN); disk.frustumCulled = false; scene.add(disk);
const DK = []; for (let i = 0; i < diskN; i++) { DK.push({ rr: Math.pow(rnd(), 0.7), a: R(0, Math.PI * 2), h: R(-1, 1), s: R(0.4, 1.4) }); disk.setColorAt(i, new THREE.Color().setHSL(R(0.02, 0.1), 1, R(0.4, 0.62))); }
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); core.position.copy(P); core.material.color.set('#ffc488'); scene.add(core);
// fireball (aerial)
const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { k: { value: 1 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(vN, vV)); vec3 c = mix(vec3(1.0,0.28,0.04), vec3(1.5,1.15,0.7), pow(f,2.5)); gl_FragColor = vec4(c*k, 1.0)*(0.35+0.65*pow(f,0.6)); }'
})); dome.visible = false; dome.position.set(P.x, 0, P.z); scene.add(dome);
const shock = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), new THREE.MeshBasicMaterial({ color: '#fff1d8', transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
shock.rotation.x = -Math.PI / 2; shock.visible = false; shock.position.set(P.x, 2, P.z); scene.add(shock);

// ===================== POV hands (own scene, drawn after lensing) =====================
const handsScene = new THREE.Scene(); const hcam = new THREE.PerspectiveCamera(74, W / H, 0.01, 10);
handsScene.add(new THREE.HemisphereLight(0xcfe0f5, 0x6a5a40, 1.4)); const hDir = new THREE.DirectionalLight(0xfff0d8, 1.8); hDir.position.set(-1, 2, 1); handsScene.add(hDir);
const hFront = new THREE.PointLight(0xffa860, 0, 0, 0); hFront.position.set(0, 0, -2); handsScene.add(hFront);
const handParts = [];
for (const side of [-1, 1]) {
  const arm = new THREE.Group(); arm.position.set(0.17 * side, -0.6, -0.2); handsScene.add(arm);
  const sleeve = new THREE.Mesh(BOX, new THREE.MeshStandardMaterial({ color: '#25324c', roughness: 0.9, flatShading: true })); sleeve.scale.set(0.075, 0.075, 0.42); sleeve.position.z = -0.21; arm.add(sleeve);
  const hand = new THREE.Group(); hand.position.z = -0.44; arm.add(hand);
  const skinM = new THREE.MeshStandardMaterial({ color: '#e7b48e', roughness: 0.8, flatShading: true });
  const palm = new THREE.Mesh(BOX, skinM); palm.scale.set(0.1, 0.028, 0.1); palm.position.z = -0.045; hand.add(palm);
  for (let f = 0; f < 4; f++) { const fi = new THREE.Mesh(BOX, skinM); fi.scale.set(0.021, 0.024, 0.075); fi.position.set(-0.036 + f * 0.024, 0, -0.13); hand.add(fi); }
  const th = new THREE.Mesh(BOX, skinM); th.scale.set(0.024, 0.024, 0.06); th.position.set(-0.06 * side, 0, -0.03); th.rotation.y = 0.6 * side; hand.add(th);
  handParts.push({ arm, hand, side });
}

// ===================== SPACE =====================
const space = new THREE.Scene(); space.background = new THREE.Color('#020308');
const spaceCam = new THREE.PerspectiveCamera(36, W / H, 0.1, 4000);
const composer2 = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer2.addPass(new RenderPass(space, spaceCam)); composer2.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.8, 0.6, 0.75)); composer2.addPass(new OutputPass());
{ const n = 5000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 }))); }
space.add(new THREE.AmbientLight(0x404a60, 0.5));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 2.6); space.add(spaceSun);
const ER = 10;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const NYCdir = ll2v(40.78, -73.97, 1).normalize();
const globe = new THREE.Group(); space.add(globe);
let globeGeo, globeBaseCol, faceAng;
const hotSpot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); space.add(hotSpot);
const bhPoint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); space.add(bhPoint);
const hsLight = new THREE.PointLight(0xffa050, 0, 0, 1.2); space.add(hsLight);
const crackMat = new THREE.MeshBasicMaterial({ color: '#ffb060', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const ejectaN = 2600; const ejecta = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff7a30', emissiveIntensity: 0.9, flatShading: true }), ejectaN); ejecta.frustumCulled = false; space.add(ejecta);
const EJ = []; for (let i = 0; i < ejectaN; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(); EJ.push({ v, sp: R(0.3, 1.6), s: R(0.4, 1.8), d: R(0, 0.5), w: [R(-3, 3), R(-3, 3), R(-3, 3)] }); ejecta.setColorAt(i, new THREE.Color().setHSL(R(0.02, 0.1), 0.6, R(0.25, 0.6))); }
const moon = mesh(new THREE.IcosahedronGeometry(2.7, 3), new THREE.MeshStandardMaterial({ color: '#b9b5ad', roughness: 1, flatShading: true }), false, false); space.add(moon);
const ringN = 3000; const ringMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff8a40', emissiveIntensity: 0.7, flatShading: true }), ringN); ringMesh.frustumCulled = false; space.add(ringMesh);
const RG = []; for (let i = 0; i < ringN; i++) { RG.push({ r: R(6, 22), a: R(0, Math.PI * 2), h: R(-0.6, 0.6), s: R(0.3, 1.5) }); ringMesh.setColorAt(i, new THREE.Color().setHSL(R(0.03, 0.1), 0.7, R(0.3, 0.7))); }
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json(); const land = topojson.feature(topo, topo.objects.land);
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry]; const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) {
    if (ring.every(([, la]) => la < -55)) continue; let prev = ring[0][0], off = 0; const pts = [];
    for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); }
  }
  const img = g.getImageData(0, 0, MW, MH).data; const isLand = (lat, lon) => { const x = Math.floor((lon + 180) / 360 * MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  globeGeo = new THREE.IcosahedronGeometry(ER, 44); const p = globeGeo.attributes.position; const cols = new Float32Array(p.count * 3); faceAng = new Float32Array(p.count / 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    faceAng[f / 3] = Math.acos(clamp(v.dot(NYCdir), -1, 1));
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI; const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6');
    else if (isLand(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); }
    else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  globeBaseCol = cols.slice(); globeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(globeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, emissive: '#ff5a10', emissiveIntensity: 0 })));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.07, 64, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { col: { value: new THREE.Color(0.45, 0.7, 1.0) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 col; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(col,1.0)*f*1.4; }' })); globe.add(atm); globe.userData.atm = atm;
  for (let i = 0; i < 140; i++) { const s = mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, flatShading: true }), false, false); s.position.copy(ll2v(R(-60, 65), R(-180, 180), ER * 1.02)); s.lookAt(0, 0, 0); s.scale.set(R(0.3, 0.9), R(0.15, 0.4), 0.05); globe.add(s); }
  // glowing cracks spreading from New York
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 26; i++) {
    let dir = NYCdir.clone(); const axis = new THREE.Vector3().crossVectors(NYCdir, new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize()).normalize(); const pts = []; const L = R(0.5, 1.6);
    for (let k = 0; k <= 20; k++) { const q = new THREE.Quaternion().setFromAxisAngle(axis, L * k / 20); const jit = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.012); pts.push(NYCdir.clone().applyQuaternion(q).add(jit).normalize().multiplyScalar(ER * 1.004)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 4, false), crackMat); tube.userData.L = L; globe.add(tube);
  }
}

// ===================== shots =====================
const shots = [
  { a: 0, b: 9.0, kind: 'intro' },  // 0-4 wide, 4-9 close-up handled inside
  { a: 9.0, b: 15, kind: 'pov' }, { a: 15, b: 21, kind: 'wide' }, { a: 21, b: 27, kind: 'skyline' }, { a: 27, b: 33, kind: 'glow' },
  { a: 33, b: 39, kind: 'aerial' }, { a: 39, b: 46, kind: 'space1' }, { a: 46, b: 53, kind: 'space2' }, { a: 53, b: 58, kind: 'space3' }, { a: 58, b: 99, kind: 'space4' },
];
const shotAt = t => shots.find(s => t >= s.a && t < s.b) || shots[shots.length - 1];
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
function cityCamera(t) {
  const s = shotAt(t); const u = t - s.a; let cam, look, fov = 50, shake = 0, cx = 0, cz = 10, pov = null;
  if (s.kind === 'intro' && t < T0) { const k = smooth(0, T0, t); cam = v3(14 - 4 * k, 15 - 3 * k, 62 - 14 * k); look = v3(0, 2.5, 0); }
  else if (s.kind === 'intro') { const k = smooth(T0, 9, t); cam = v3(P.x + 2.6 - 0.6 * k, P.y + 0.55 - 0.1 * k, P.z + 5.2 - 1.6 * k); look = P.clone().add(v3(0, 0.25, 0)); fov = 44; }
  else if (s.kind === 'pov') {
    const k = Math.pow(clamp((t - 9.6) / 5.6, 0, 1), 2.2); const start = v3(POVD.x, 1.7, POVD.z); const dir = P.clone().sub(start); const L = dir.length(); dir.normalize();
    cam = start.clone().addScaledVector(dir, L * 0.82 * k); cam.y += Math.sin(k * 3) * 0.3 * k; look = P.clone().add(v3(0, 0.9 - 0.7 * k, 0)); fov = 74; shake = 0.04 + 0.12 * k; pov = k;
  }
  else if (s.kind === 'wide') { cam = v3(46 + u * 1.2, 34 + u * 0.8, 92 + u * 2); look = P.clone().add(v3(0, -4, -6)); shake = 0.15; }
  else if (s.kind === 'skyline') { cam = v3(-170 + u * 3, 42, 70 + u * 2); look = v3(10 + u * 2, 18, -120); fov = 52; shake = 0.25; }
  else if (s.kind === 'glow') { cam = v3(60 - u * 2, 120 + u * 6, 420 + u * 12); look = P.clone().add(v3(0, 20, -60)); fov = 48; shake = 0.5; }
  else if (s.kind === 'aerial') { cam = v3(1800 - u * 60, 2400 + u * 80, 5200 + u * 120); look = v3(0, 200, -800); fov = 46; shake = 3; }
  return { cam, look, fov, shake, pov };
}

// ===================== per-frame state =====================
const tmpQ = new THREE.Quaternion();
function placeActors(t) {
  const rv = rvAt(t); const tc = Math.min(t, T0);
  for (const a of actors) {
    const o = a.obj;
    // pre-release (frozen after T0 because time is slowed to a crawl)
    let base = a.S.clone(), rot = a.rot0.clone();
    if (a.kind === 'person' && a.walk) {
      const dir = new THREE.Vector3(Math.sin(a.rot0.y), 0, Math.cos(a.rot0.y)); base.addScaledVector(dir, a.walk * tc);
      const ph = tc * a.walk * 4.2 + a.ph; poseWalk(a.person, ph);
    } else if (a.kind === 'car' || a.kind === 'boat') base.x += a.drive * tc;
    else if (a.kind === 'bird') { const ang = a.ang + a.w * tc; base.set(a.S.x + Math.cos(ang) * a.rad, a.S.y, a.S.z + Math.sin(ang) * a.rad); rot.y = -ang; rot.z = Math.sin(tc * 11 + a.rad) * 0.25; }
    else if (a.kind === 'tree') rot.z = Math.sin(tc * 1.1 + a.ph) * 0.02;
    // lean toward the hole before being torn loose
    if (rv > 0) {
      const rel = base.clone().sub(P); const d = Math.hypot(rel.x, rel.z); const pre = smooth(0.75, 1.0, rv / Math.max(d, 0.01));
      if (pre > 0 && t < a.tr) {
        const tow = v3(-rel.x, 0, -rel.z).normalize();
        if (a.kind === 'seg') base.addScaledVector(tow, (a.by) * 0.08 * pre);
        else if (a.kind === 'tree' || a.kind === 'lamp') { const ax = v3(tow.z, 0, -tow.x); tmpQ.setFromAxisAngle(ax, -0.35 * pre); o.quaternion.setFromEuler(rot).premultiply(tmpQ); o.position.copy(base); o.scale.copy(a.sc0); continue; }
        else base.addScaledVector(tow, 0.3 * pre);
      }
    }
    if (a.kind === 'person' && !a.walk) poseIdle(a.person, tc, a.ph);
    if (t < a.tr) { o.position.copy(base); o.rotation.copy(rot); o.scale.copy(a.sc0); o.visible = true; continue; }
    // falling in: spiral toward the hole, accelerating, shrinking at the end
    const u = clamp((t - a.tr) / a.T, 0, 1); const f = 1 - Math.pow(u, 2.4);
    if (u >= 1) { o.visible = false; continue; }
    const rel = base.clone().sub(P); const L = rel.length(); const phi = a.sw * Math.pow(u, 2);
    const cs = Math.cos(phi), sn = Math.sin(phi); const rx = rel.x * cs - rel.z * sn, rz = rel.x * sn + rel.z * cs;
    o.position.set(P.x + rx * f, P.y + rel.y * f + Math.sin(Math.PI * u) * a.lift * L, P.z + rz * f);
    const sp = (t - a.tr); o.rotation.set(rot.x + a.spin.x * sp * 0.6, rot.y + a.spin.y * sp * 0.6, rot.z + a.spin.z * sp * 0.6);
    const shrink = 1 - smooth(0.7, 1.0, u); o.scale.copy(a.sc0).multiplyScalar(shrink); o.visible = true;
    if (a.kind === 'person') poseFlail(a.person, t, a.ph);
  }
}
function placeDebris(t) {
  for (let i = 0; i < debrisN; i++) {
    const p = DP[i]; const u = (t - p.tr) / p.T;
    if (t < T0 || u < 0 || u >= 1) { dummy.position.set(0, -9999, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix); continue; }
    const f = 1 - Math.pow(u, 2.2); const phi = p.ang + p.sw * u * u;
    dummy.position.set(P.x + Math.cos(phi) * p.d0 * f, P.y + (p.y0 - P.y) * f + Math.sin(Math.PI * u) * 0.12 * p.d0, P.z + Math.sin(phi) * p.d0 * f);
    dummy.rotation.set(p.r[0] + p.w[0] * u * 3, p.r[1] + p.w[1] * u * 3, p.r[2] + p.w[2] * u * 3);
    dummy.scale.setScalar(p.s * smooth(0, 0.08, u) * (1 - smooth(0.75, 1, u))); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;
}
function glowAt(t) { if (t < 9) return smooth(5, 9, t) * 0.08; if (t < 15) return lerp(0.08, 0.35, (t - 9) / 6); if (t < 21) return lerp(0.35, 1.2, (t - 15) / 6); if (t < 27) return lerp(1.2, 3, (t - 21) / 6); if (t < 33) return 3 * Math.pow(12, (t - 27) / 6); return 40; }
function diskRAt(t) { if (t < 9) return 0.15 + smooth(4, 9, t) * 0.25; if (t < 15) return lerp(0.4, 2.2, (t - 9) / 6); if (t < 21) return lerp(2.2, 9, (t - 15) / 6); if (t < 27) return lerp(9, 30, (t - 21) / 6); return lerp(30, 60, clamp((t - 27) / 6, 0, 1)); }
function placeDisk(t) {
  const R0 = diskRAt(t), g = glowAt(t), on = t >= T0;
  for (let i = 0; i < diskN; i++) {
    const d = DK[i]; const r = R0 * (0.25 + 0.75 * d.rr); const om = 2.6 / Math.pow(Math.max(d.rr, 0.05), 1.5) * 0.4; const a = d.a + om * (t - T0);
    if (!on || g < 0.02) { dummy.scale.setScalar(0); }
    else { dummy.position.set(P.x + Math.cos(a) * r, P.y + d.h * r * 0.04, P.z + Math.sin(a) * r); dummy.lookAt(camera.position); dummy.scale.setScalar(R0 * 0.07 * d.s * clamp(g, 0.2, 2)); }
    dummy.updateMatrix(); disk.setMatrixAt(i, dummy.matrix);
  }
  disk.instanceMatrix.needsUpdate = true; diskMat.opacity = clamp(g * 1.2, 0, 0.8);
  core.visible = on && g > 0.02; core.scale.setScalar(R0 * 1.3 * (0.6 + Math.min(g, 6) * 0.2)); core.material.opacity = clamp(g, 0, 1);
  bhLight.intensity = on ? g * 400 : 0;
}

// ===================== space =====================
function spaceFrame(t) {
  const s = shotAt(t), u = t - s.a; const dirN = NYCdir.clone();
  const side = new THREE.Vector3().crossVectors(dirN, v3(0, 1, 0)).normalize();
  spaceSun.position.copy(dirN.clone().multiplyScalar(20).addScaledVector(side, 30).add(v3(0, 10, 0)));
  // black hole sinking toward the core
  const sink = s.kind === 'space1' ? smooth(39, 46, t) * 0.35 : s.kind === 'space2' ? 0.35 + smooth(46, 53, t) * 0.4 : 0.75 + smooth(53, 56, t) * 0.25;
  const bhPos = dirN.clone().multiplyScalar(ER * (1 - sink));
  // melt: faces within angle 'melt' of NYC turn molten
  const melt = s.kind === 'space1' ? 0.08 + smooth(39, 46, t) * 0.25 : s.kind === 'space2' ? 0.33 + smooth(46, 53, t) * 1.4 : 3.2;
  if (globeGeo) {
    const col = globeGeo.attributes.color.array; const lava = new THREE.Color('#ff6a1a'), dark = new THREE.Color('#3a1206');
    for (let f = 0; f < faceAng.length; f++) {
      const k = 1 - smooth(melt * 0.7, melt, faceAng[f]);
      for (let j = 0; j < 3; j++) { const i = (f * 3 + j) * 3; const b = [globeBaseCol[i], globeBaseCol[i + 1], globeBaseCol[i + 2]]; const lv = ((f * 7) % 5) / 5 < 0.5 ? lava : dark; col[i] = lerp(b[0], lv.r, k); col[i + 1] = lerp(b[1], lv.g, k); col[i + 2] = lerp(b[2], lv.b, k); }
    }
    globeGeo.attributes.color.needsUpdate = true;
    globe.children[0].material.emissiveIntensity = s.kind === 'space1' ? 0.05 : s.kind === 'space2' ? 0.05 + smooth(46, 53, t) * 0.35 : 0.6;
    globe.userData.atm.material.uniforms.col.value.setRGB(lerp(0.45, 1.0, smooth(44, 52, t)), lerp(0.7, 0.45, smooth(44, 52, t)), lerp(1.0, 0.2, smooth(44, 52, t)));
    crackMat.opacity = s.kind === 'space1' ? 0 : smooth(46, 49, t);
    globe.children.forEach(c => { if (c.userData.L) { const k = smooth(46, 53, t); c.scale.setScalar(1); c.visible = k > c.userData.L / 1.6 * 0.5 || s.kind !== 'space2'; } });
  }
  // globe breaks apart in space3/space4
  let gs = 1; if (s.kind === 'space3') gs = 1 - smooth(53, 58, t) * 0.55; if (s.kind === 'space4') gs = 0.45 - smooth(58, 61, t) * 0.2; globe.scale.setScalar(gs);
  globe.visible = gs > 0.05;
  const ej = s.kind === 'space3' ? smooth(53, 58, t) : s.kind === 'space4' ? 1 : 0;
  for (let i = 0; i < ejectaN; i++) {
    const e = EJ[i]; const k = clamp((ej - e.d) / (1 - e.d), 0, 1);
    if (k <= 0) dummy.scale.setScalar(0);
    else { const r = ER * gs * 0.95 + k * e.sp * 18 + (s.kind === 'space4' ? (t - 58) * e.sp * 3 : 0); dummy.position.copy(e.v).multiplyScalar(r); dummy.rotation.set(e.w[0] * k, e.w[1] * k, e.w[2] * k); dummy.scale.setScalar(e.s * (0.6 + k)); }
    dummy.updateMatrix(); ejecta.setMatrixAt(i, dummy.matrix);
  }
  ejecta.instanceMatrix.needsUpdate = true; ejecta.visible = ej > 0;
  // hot glow at the black hole
  const hs = s.kind === 'space1' ? 1.5 + smooth(39, 46, t) * 2.5 : s.kind === 'space2' ? 4 + smooth(46, 53, t) * 10 : 16;
  hotSpot.position.copy(dirN.clone().multiplyScalar(ER * 1.01)); hotSpot.scale.setScalar(hs); hotSpot.visible = s.kind === 'space1' || s.kind === 'space2';
  bhPoint.position.copy(bhPos); bhPoint.scale.setScalar(s.kind === 'space4' ? 7 : hs * 0.7); bhPoint.visible = s.kind === 'space3' || s.kind === 'space4';
  hsLight.position.copy(dirN.clone().multiplyScalar(ER * 1.6)); hsLight.intensity = s.kind === 'space1' ? 60 + u * 40 : s.kind === 'space2' ? 400 : 0;
  // Moon + ring of debris at the end
  moon.visible = s.kind === 'space4' || s.kind === 'space3';
  const mang = 0.6 + (t - 53) * 0.12; moon.position.copy(bhPos).add(v3(Math.cos(mang) * 46, 6 * Math.sin(mang), Math.sin(mang) * 46));
  const rk = s.kind === 'space4' ? smooth(58, 60, t) : 0;
  for (let i = 0; i < ringN; i++) { const r = RG[i]; const a = r.a + (t - 58) * 3 / Math.pow(r.r / 6, 1.5); if (rk <= 0) dummy.scale.setScalar(0); else { dummy.position.set(bhPos.x + Math.cos(a) * r.r, bhPos.y + r.h, bhPos.z + Math.sin(a) * r.r); dummy.scale.setScalar(r.s * rk); dummy.rotation.set(a, a * 2, 0); } dummy.updateMatrix(); ringMesh.setMatrixAt(i, dummy.matrix); }
  ringMesh.instanceMatrix.needsUpdate = true; ringMesh.visible = rk > 0;
  // camera
  let d, off;
  if (s.kind === 'space1') { d = 70 - u * 2.5; off = -8 + u * 0.6; }
  else if (s.kind === 'space2') { d = 60 - u * 1.5; off = -2 + u * 0.4; }
  else if (s.kind === 'space3') { d = 75 + u * 3; off = 4; }
  else { d = 120 + u * 6; off = 30; }
  spaceCam.position.copy(dirN.clone().multiplyScalar(d)).addScaledVector(side, off).add(v3(0, s.kind === 'space4' ? 40 : -4, 0));
  spaceCam.up.set(0, 1, 0); spaceCam.lookAt(s.kind === 'space4' ? bhPos.clone().add(v3(-6, -6, 0)) : v3(0, -2, 0));
}

// ===================== DOM =====================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'slow', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.3) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
function fmtTau(s) {
  if (s < 1e-3) return `${(s * 1e6).toFixed(s < 1e-5 ? 1 : 0)} µs`;
  if (s < 1) return `${(s * 1e3).toFixed(s < 0.01 ? 2 : 0)} ms`;
  if (s < 60) return `${s.toFixed(1)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(0)} hours`;
  if (s < 86400 * 365 * 0.97) return `${Math.floor(s / 86400)} days`;
  return '1 year';
}
const captions = [
  [2.2, 3.95, "You're in Central Park, New York."],
  [4.4, 8.85, 'A black hole the size of a marble.<br>It weighs as much as Earth.'],
  [9.3, 14.85, "You're 300 feet away.<br>It pulls on you with 5 billion g."],
  [15.3, 20.85, 'Everything nearby falls in<br>in under a millisecond.'],
  [21.3, 26.85, 'Buildings a mile away hit<br>1% of light speed as they fall.'],
  [27.3, 32.85, 'Each pound that falls in releases<br>~35 Hiroshima bombs of energy.'],
  [33.3, 38.85, 'New York is gone<br>in a fraction of a second.'],
  [39.3, 45.85, "The black hole sinks toward<br>Earth's core, eating as it goes."],
  [46.3, 52.85, 'It shines 200 million times brighter<br>than the sunlight Earth gets.'],
  [53.3, 57.85, 'Within months, that glow could<br>blow the whole planet apart.'],
  [58.3, 60.9, 'The Moon keeps orbiting —<br>around a marble.'],
];
const subs = [
  [0, 4, 'CENTRAL PARK · NEW YORK'], [4, 9, 'WIDTH · 0.7 IN  ·  MASS · 1 EARTH'], [9, 15, 'PULL AT 300 FT · 5,000,000,000 g'],
  [15, 21, 'PULL AT 1,000 FT · 440,000,000 g'], [21, 27, 'SPEED NEAR THE HOLE · 1% OF LIGHT'], [27, 33, 'ENERGY · 5.7% OF E=mc²'],
  [33, 39, 'NOTHING IN THE CITY IS LEFT STANDING'], [39, 46, 'BLACK HOLE · SINKING TOWARD THE CORE'], [46, 53, 'ITS GLOW · 200,000,000× SUNLIGHT ON EARTH'],
  [53, 58, 'ENOUGH ENERGY TO UNBIND EARTH · ~2 MONTHS'], [58, 99, 'BLACK HOLE · STILL ABOUT 0.7 INCHES WIDE'],
];
function updateDOM(t) {
  el.title.style.opacity = fadeWin(t, 0.1, 2.1, 0.3);
  let slow = '', lab, val;
  if (t < T0) { lab = 'BLACK HOLE APPEARS IN'; const r = T0 - t; val = `0:0${Math.floor(r)}.${String(Math.floor((r % 1) * 1000)).padStart(3, '0')}`; }
  else { slow = t < 39 ? '<b></b>TIME SLOWED DOWN' : '<b></b>TIME SPED UP'; lab = 'TIME SINCE IT APPEARED'; val = fmtTau(Math.max(tauAt(t), 1e-8)); }
  const sb = subs.find(([a, b]) => t >= a && t < b);
  el.slow.innerHTML = slow; el.lab.textContent = lab; el.val.textContent = val; el.sub.textContent = sb ? sb[2] : '';
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  el.hud.style.opacity = fadeWin(t, 0.1, T_END + 0.01, 0.3);
  el.flash.style.opacity = (t >= T0 ? 0.35 * Math.exp(-(t - T0) * 8) : 0) + smooth(31.6, 33, t) * (1 - smooth(33, 33.6, t));
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// ===================== render =====================
const proj = new THREE.Vector3();
window.renderAt = (t) => {
  updateDOM(t);
  const s = shotAt(t);
  if (s.kind.startsWith('space')) { spaceFrame(t); composer2.render(); return true; }
  const cs = cityCamera(t);
  const sh = cs.shake; const n = v3(Math.sin(t * 47.1) + Math.sin(t * 23.3), Math.sin(t * 39.7 + 1) + Math.sin(t * 19.1), Math.sin(t * 31.3 + 2)).multiplyScalar(sh * 0.5);
  camera.fov = cs.fov; camera.updateProjectionMatrix(); camera.position.copy(cs.cam).add(n); camera.up.set(0, 1, 0); camera.lookAt(cs.look.clone().add(n.multiplyScalar(0.3)));
  const rv = rvAt(t), g = glowAt(t);
  updateGround(rv, clamp((g - 0.3) / 3, 0, 1));
  placeActors(t); placeDebris(t); placeDisk(t);
  // daylight dims as the glow takes over
  const k = smooth(21, 33, t);
  sun.intensity = 2.6 * (1 - 0.5 * k); hemi.intensity = 1.15 * (1 - 0.4 * k); renderer.toneMappingExposure = 1.05 + Math.min(g, 12) * 0.012;
  const center = s.kind === 'aerial' ? v3(0, 0, -400) : P; sun.position.copy(center).add(v3(-90, 120, -40)); sun.target.position.copy(center); sun.target.updateMatrixWorld();
  sun.castShadow = s.kind !== 'aerial';
  scene.fog.near = s.kind === 'aerial' ? 3000 : (s.kind === 'glow' ? 500 : 200); scene.fog.far = s.kind === 'aerial' ? 16000 : (s.kind === 'glow' ? 3000 : 1400);
  scene.fog.color.set('#dfe3e6').lerp(new THREE.Color('#ff9a50'), smooth(21, 32, t) * 0.8);
  // aerial fireball
  dome.visible = shock.visible = s.kind === 'aerial';
  if (s.kind === 'aerial') { const u = (t - 33) / 6; const Rd = 160 + 2600 * Math.pow(u, 1.2); dome.scale.set(Rd, Rd * 0.75, Rd); dome.material.uniforms.k.value = 1.6 - u * 0.6; shock.scale.setScalar(Rd * 1.35); shock.material.opacity = 0.55 * (1 - u * 0.5); }
  // lensing
  const visibleBH = t >= T0 && s.kind !== 'aerial';
  camera.updateMatrixWorld(); proj.copy(P).project(camera);
  const dist = camera.position.distanceTo(P);
  const thetaE = 270 / Math.sqrt(Math.max(dist, 0.3)) * (44 / camera.fov);
  postMat.uniforms.on.value = visibleBH && proj.z < 1 ? 1 : 0;
  postMat.uniforms.bh.value.set((proj.x * 0.5 + 0.5) * W, (proj.y * 0.5 + 0.5) * H);
  postMat.uniforms.thetaE.value = thetaE * smooth(T0, T0 + 0.4, t); postMat.uniforms.blackR.value = Math.max(6, thetaE * 0.16) * smooth(T0, T0 + 0.3, t);
  postMat.uniforms.ring.value = 0.6 + g * 0.5; postMat.uniforms.whiteout.value = s.kind === 'glow' ? smooth(31, 33, t) * 0.9 : 0;
  gtao.enabled = s.kind !== 'aerial' && s.kind !== 'glow'; gtao.updateGtaoMaterial({ radius: s.kind === 'intro' && t >= T0 ? 0.6 : (s.kind === 'skyline' ? 4 : 1.4) });
  bloom.strength = 0.3 + clamp(g, 0, 8) * 0.12; bloom.threshold = g > 0.5 ? 0.7 : 0.92;
  composer.render();
  if (cs.pov !== null) {
    const kk = cs.pov; hFront.intensity = g * 3;
    handParts.forEach(({ arm, hand, side }) => { arm.rotation.x = 0.8 + 0.1 * Math.sin(t * 2.3 + side) + 0.25 * kk; arm.rotation.y = 0.12 * side * (1 - kk); arm.rotation.z = 0.08 * Math.sin(t * 2.9 + side); hand.rotation.x = 0.55 + 0.2 * Math.sin(t * 4 + side); });
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(handsScene, hcam); renderer.autoClear = true;
  }
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe()]).then(() => { window.renderAt(0); return true; });
