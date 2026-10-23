import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// STYLE LAB: the same 3 AM bedroom with the mascot "Iffy" (a bean with a question-mark sprout) in five looks: clay, toon, paper, neon, diorama.
const STYLE = new URLSearchParams(location.search).get('style') || 'clay';
let seed = 77; function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd(); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = STYLE === 'clay' ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
// ---------- palettes ----------
const PAL = {
  clay: { bg: '#3b2f5c', wall: '#8f7fd0', wall2: '#a493e0', floor: '#5f4fa3', bed: '#7fb0ee', blanket: '#ffe08a', pillow: '#fff4e6', wood: '#e8a070', iffy: '#ff8a5c', sprout: '#6ccf7a', lamp: '#ffd9a0', moon: '#fff2c8', bubble: '#ffffff', crowd: ['#8fd6c8', '#ffb3c7', '#b6a6ff'] },
  toon: { bg: '#1a1a4a', wall: '#3537b8', wall2: '#2a2c9a', floor: '#22237a', bed: '#ff4f6d', blanket: '#ffd23f', pillow: '#ffffff', wood: '#ff9a3c', iffy: '#ff7b29', sprout: '#3ddc6c', lamp: '#fff3a0', moon: '#fff6c0', bubble: '#ffffff', crowd: ['#36d1ff', '#ff6bd6', '#b0ff5c'] },
  paper: { bg: '#f2e6cf', wall: '#2f4a6e', wall2: '#3c5a82', floor: '#e8d5b0', bed: '#e85a4f', blanket: '#f4c95d', pillow: '#fff6e4', wood: '#c98a52', iffy: '#f28a3a', sprout: '#4caf7a', lamp: '#ffe6a8', moon: '#fff6e4', bubble: '#fff6e4', crowd: ['#4fb3bf', '#e85a4f', '#8e7cc3'] },
  neon: { bg: '#04030c', wall: '#0a0818', wall2: '#0c0a1c', floor: '#07060f', bed: '#ff3cc7', blanket: '#00e5ff', pillow: '#b388ff', wood: '#ff9a3c', iffy: '#ffb020', sprout: '#39ff88', lamp: '#fff0a0', moon: '#e0f4ff', bubble: '#00e5ff', crowd: ['#ff3cc7', '#39ff88', '#b388ff'] },
  dio: { bg: '#20263a', wall: '#f2d7c2', wall2: '#e8c4aa', floor: '#c98f66', bed: '#6fa8dc', blanket: '#ffd966', pillow: '#ffffff', wood: '#a0673e', iffy: '#ff7f50', sprout: '#5ec46e', lamp: '#ffe0a0', moon: '#fff4d0', bubble: '#ffffff', crowd: ['#8ff0c8', '#ffb3c7', '#b6a6ff'], soil: '#6b4a32', grass: '#7ac36a', rock: '#8a8a8e' } }[STYLE];
scene.background = new THREE.Color(PAL.bg);
// ---------- material factory per style ----------
const toonGrad = (() => { const d = new Uint8Array([70, 150, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const paperTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 9000; i++) { const v = 215 + Math.floor(rnd() * 40); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const clayBump = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { const v = 100 + Math.floor(rnd() * 60); g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 1 + rnd() * 4, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const OUTLINE = [];
function mat(color, o = {}) { const c = new THREE.Color(color);
  if (STYLE === 'clay') return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.78, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.6, bumpMap: clayBump, bumpScale: 0.6, emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1 });
  if (STYLE === 'toon') return new THREE.MeshToonMaterial({ color: c, gradientMap: toonGrad, emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1 });
  if (STYLE === 'paper') return new THREE.MeshLambertMaterial({ color: c, map: paperTex, emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveIntensity: (o.ei ?? 1) * 0.6, flatShading: true });
  if (STYLE === 'neon') return new THREE.MeshStandardMaterial({ color: new THREE.Color('#06050c'), roughness: 0.6, metalness: 0.2, emissive: o.emissive ? new THREE.Color(o.emissive) : c.clone().multiplyScalar(o.glow ?? 0.05) });
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true, emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveIntensity: o.ei ?? 1 }); }
function add(geo, color, x, y, z, parent = scene, o = {}) { const m = new THREE.Mesh(geo, mat(color, o)); m.position.set(x, y, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; parent.add(m);
  if (STYLE === 'toon' && !o.noOutline) { const h = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#111111', side: THREE.BackSide })); h.scale.setScalar(1); m.add(h); OUTLINE.push(h); }
  if (STYLE === 'neon' && !o.noEdge) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2) })); m.add(e); }
  return m; }
const box = (w, h, d, r = 0.04) => STYLE === 'clay' || STYLE === 'toon' ? new RoundedBoxGeometry(w, h, d, 4, Math.min(r * (STYLE === 'clay' ? 2.5 : 1), Math.min(w, h, d) / 2.01)) : new THREE.BoxGeometry(w, h, d);
// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xb8b0ff, 0x302850, STYLE === 'paper' ? 1.6 : STYLE === 'neon' ? 0.15 : 0.9); scene.add(hemi);
const moonL = new THREE.DirectionalLight(0xa8b8ff, STYLE === 'neon' ? 0.2 : 1.4); moonL.position.set(-2.5, 4, 3); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048); Object.assign(moonL.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); moonL.shadow.radius = 10; moonL.shadow.blurSamples = 16; scene.add(moonL);
const lampL = new THREE.PointLight(0xffb870, STYLE === 'neon' ? 2 : 9, 6, 1.6); lampL.position.set(1.25, 1.15, -0.3); lampL.castShadow = true; lampL.shadow.radius = 8; scene.add(lampL);
if (STYLE === 'paper') { moonL.color.set(0xfff4e0); moonL.intensity = 2.2; moonL.position.set(-3, 5, 4); }
if (STYLE === 'dio') { hemi.intensity = 1.1; moonL.intensity = 1.8; moonL.position.set(-4, 6, 4); }
// ---------- room ----------
const room = new THREE.Group(); scene.add(room);
add(box(4.2, 0.12, 3.4), PAL.floor, 0, -0.06, 0, room); add(box(4.2, 3.0, 0.12), PAL.wall, 0, 1.5, -1.7, room); add(box(0.12, 3.0, 3.4), PAL.wall2, -2.1, 1.5, 0, room);
// window + moon + stars
const win = add(box(1.2, 1.0, 0.05), STYLE === 'neon' ? '#0a1a3a' : '#1a2a5a', -0.7, 1.9, -1.62, room, { emissive: STYLE === 'neon' ? '#081838' : '#101c40', noOutline: true });
for (const [w, h, x, y] of [[1.3, 0.07, -0.7, 2.43], [1.3, 0.07, -0.7, 1.37], [0.07, 1.1, -1.32, 1.9], [0.07, 1.1, -0.08, 1.9], [0.05, 1.0, -0.7, 1.9]]) add(box(w, h, 0.08, 0.02), STYLE === 'neon' ? '#00e5ff' : '#f4eee4', x, y, -1.6, room);
add(new THREE.SphereGeometry(0.13, 20, 14), PAL.moon, -0.95, 2.12, -1.58, room, { emissive: PAL.moon, ei: STYLE === 'neon' ? 1.6 : 1.1, cast: false, noOutline: true });
for (let i = 0; i < 14; i++) add(new THREE.SphereGeometry(0.012, 6, 4), '#ffffff', R(-1.25, -0.15), R(1.45, 2.35), -1.585, room, { emissive: '#ffffff', ei: 1.5, cast: false, noOutline: true, noEdge: true });
// bed: frame, mattress, pillow, blanket
add(box(1.3, 0.32, 2.2), PAL.wood, 0.1, 0.16, -0.5, room); add(box(1.24, 0.2, 2.1), '#f4f0ea', 0.1, 0.42, -0.5, room); add(box(1.3, 0.75, 0.12), PAL.wood, 0.1, 0.62, -1.62, room);
add(box(0.9, 0.18, 0.42, 0.08), PAL.pillow, 0.1, 0.6, -1.3, room); const blanket = add(box(1.32, 0.14, 1.4, 0.06), PAL.blanket, 0.1, 0.56, -0.1, room); blanket.rotation.x = 0.03;
// nightstand + lamp + alarm clock showing 3:00
add(box(0.55, 0.55, 0.5), PAL.wood, 1.25, 0.275, -1.25, room); add(new THREE.CylinderGeometry(0.06, 0.09, 0.4, 14), '#f4eee4', 1.18, 0.75, -1.3, room);
add(new THREE.ConeGeometry(0.2, 0.26, 18, 1, true), PAL.lamp, 1.18, 1.02, -1.3, room, { emissive: PAL.lamp, ei: STYLE === 'neon' ? 1.6 : 0.7 }).material.side = THREE.DoubleSide;
const ck = document.createElement('canvas'); ck.width = 256; ck.height = 128; { const g = ck.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, 256, 128); g.fillStyle = STYLE === 'neon' ? '#ff3cc7' : '#ff4a3a'; g.font = 'bold 92px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText('3:00', 128, 98); }
const ckT = new THREE.CanvasTexture(ck); ckT.colorSpace = THREE.SRGBColorSpace; add(box(0.3, 0.16, 0.12, 0.03), '#2a2a30', 1.38, 0.63, -1.06, room); const face = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshBasicMaterial({ map: ckT })); face.position.set(1.38, 0.63, -0.995); face.scale.multiplyScalar(1.0); face.material.color.setScalar(STYLE === 'neon' ? 2 : 1.3); room.add(face);
// rug
add(new THREE.CylinderGeometry(0.75, 0.75, 0.02, 32), STYLE === 'neon' ? '#b388ff' : '#ff9eb5', 0.7, 0.01, 0.95, room, { cast: false });
// ---------- Iffy: bean body, big eyes, question-mark sprout ----------
function makeIffy(color, scale = 1, mood = 'awake') { const g = new THREE.Group(); g.scale.setScalar(scale);
  add(new THREE.CapsuleGeometry(0.3, 0.32, 8, 20), color, 0, 0.5, 0, g, { glow: 0.35 });
  for (const sx of [-1, 1]) { const ew = add(new THREE.SphereGeometry(0.095, 20, 14), '#ffffff', sx * 0.11, 0.66, 0.25, g, { noEdge: true, emissive: STYLE === 'neon' ? '#ffffff' : null, ei: 0.6 }); ew.scale.set(1, mood === 'awake' ? 1.18 : 0.6, 0.6);
    add(new THREE.SphereGeometry(0.045, 14, 10), '#111111', sx * 0.11 - 0.025, 0.7, 0.31, g, { noOutline: true, noEdge: true }); }   // both pupils look up-left (at the memory)
  const mo = add(new THREE.TorusGeometry(0.04, 0.012, 8, 16), '#3a1a12', 0, 0.48, 0.29, g, { noOutline: true, noEdge: true }); mo.scale.set(1, mood === 'awake' ? 1.3 : 0.6, 1);
  for (const sx of [-1, 1]) { const a = add(new THREE.CapsuleGeometry(0.05, 0.18, 4, 10), color, sx * 0.31, 0.45, 0.05, g); a.rotation.z = sx * 0.6; }
  // sprout: stem + a "?" made of a torus arc + a dot
  add(new THREE.CylinderGeometry(0.014, 0.018, 0.12, 8), PAL.sprout, 0, 0.92, 0, g, { emissive: STYLE === 'neon' ? PAL.sprout : null, ei: 0.8 });
  const q = add(new THREE.TorusGeometry(0.075, 0.022, 10, 28, Math.PI * 1.45), PAL.sprout, 0.0, 1.08, 0, g, { emissive: STYLE === 'neon' ? PAL.sprout : null, ei: 0.8 }); q.rotation.z = -Math.PI * 0.62;
  add(new THREE.SphereGeometry(0.03, 12, 8), PAL.sprout, 0.0, 1.21, 0, g, { emissive: STYLE === 'neon' ? PAL.sprout : null, ei: 0.8 }).position.set(-0.002, 0.995 - 0.06, 0.0);
  const leaf = add(new THREE.SphereGeometry(0.05, 12, 8), PAL.sprout, 0.06, 0.96, 0, g, { emissive: STYLE === 'neon' ? PAL.sprout : null, ei: 0.8 }); leaf.scale.set(1.4, 0.45, 0.7); leaf.rotation.z = 0.5;
  return g; }
const iffy = makeIffy(PAL.iffy); iffy.position.set(0.1, 0.48, -0.65); iffy.rotation.set(0, 0.25, 0.06); scene.add(iffy);
// ---------- thought bubble with the cringe memory: mini Iffy tripping on stage, three beans laughing ----------
const bub = new THREE.Group(); bub.position.set(-0.62, 2.02, 0.45); bub.scale.setScalar(1.0); scene.add(bub);
for (const [x, y, z, r] of [[0, 0, 0, 0.42], [0.42, 0.1, 0, 0.34], [-0.42, 0.08, 0, 0.34], [0.2, 0.32, -0.05, 0.32], [-0.22, 0.3, -0.05, 0.3], [0.62, -0.12, 0, 0.24], [-0.62, -0.12, 0, 0.24]]) add(new THREE.SphereGeometry(r, 24, 16), PAL.bubble, x, y, z, bub, { cast: false, glow: 0.3, emissive: STYLE === 'neon' ? null : null });
for (const [x, y, r] of [[0.55, -0.55, 0.08], [0.72, -0.82, 0.055], [0.82, -1.02, 0.04]]) add(new THREE.SphereGeometry(r, 14, 10), PAL.bubble, x, y, 0.1, bub, { cast: false });
const stage = new THREE.Group(); stage.position.set(0, -0.08, 0.4); bub.add(stage);
add(box(0.9, 0.04, 0.3, 0.01), PAL.wood, 0, -0.18, 0, stage, { cast: false });
const mini = makeIffy(PAL.iffy, 0.4); mini.position.set(-0.05, -0.16, 0.02); mini.rotation.set(0, 0, -1.1); stage.add(mini);
PAL.crowd.forEach((c, i) => { const b = makeIffy(c, 0.26, 'laugh'); b.position.set(0.16 + i * 0.15, -0.16, 0.06); b.rotation.y = -0.4; stage.add(b); });
// little "!" marks for the cringe
for (const [x, y] of [[-0.25, 0.22], [-0.12, 0.28]]) add(box(0.025, 0.09, 0.02, 0.005), '#ff4a3a', x, y, 0.02, stage, { cast: false, noOutline: true });
// ---------- per-style extras ----------
if (STYLE === 'toon') OUTLINE.forEach(h => h.scale.setScalar(1.035));
if (STYLE === 'dio') { // a floating block island below the room, soil layers, little grass tufts
  add(new THREE.BoxGeometry(4.2, 0.35, 3.4), PAL.soil, 0, -0.3, 0, scene); add(new THREE.BoxGeometry(4.2, 0.5, 3.4), '#5a3e2a', 0, -0.72, 0, scene); add(new THREE.BoxGeometry(4.0, 0.4, 3.2), PAL.rock, 0, -1.15, 0, scene);
  for (let i = 0; i < 26; i++) add(new THREE.ConeGeometry(0.05, 0.16, 5), PAL.grass, R(-2.0, 2.0), -0.06, 1.62 + R(0, 0.05), scene); }
if (STYLE === 'paper') { scene.traverse(o => { if (o.isMesh && o.material.map) { o.material.map.repeat.set(2, 2); } }); }
// ---------- camera ----------
let cam;
if (STYLE === 'dio') { const s = 3.5; cam = new THREE.OrthographicCamera(-s * W / H, s * W / H, s, -s, 0.1, 100); cam.position.set(7, 6.2, 7); cam.lookAt(-0.25, 1.35, -0.3); }
else { cam = new THREE.PerspectiveCamera(42, W / H, 0.05, 100); cam.position.set(2.0, 2.2, 5.9); cam.lookAt(-0.2, 1.55, -0.4); }
// ---------- DOM ----------
const $ = id => document.getElementById(id);
const TITLE = 'Why your brain replays<br>that cringe moment<br>at 3 AM';
$('title').innerHTML = STYLE === 'paper' ? `<span class="strip">${TITLE}</span>` : STYLE === 'dio' ? `<span class="card">${TITLE}</span>` : TITLE;
$('title').style.top = '380px'; $('tag').innerHTML = '<span>YOUR BRAIN · EP. 1</span>';
$('cap').innerHTML = '<span>Your brain thinks<br>it’s protecting you.</span>'; $('cap').style.opacity = 1; $('cap').style.top = '1500px';
$('hud').style.opacity = 0; if (STYLE === 'dio') { $('tiltT').style.display = 'block'; $('tiltB').style.display = 'block'; }
// ---------- render ----------
let composer = null;
if (STYLE === 'neon') { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, cam)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 1.1, 0.6, 0.15)); composer.addPass(new OutputPass()); }
window.renderAt = (t) => { iffy.position.y = 0.48 + 0.01 * Math.sin(t * 2); bub.position.y = 2.02 + 0.03 * Math.sin(t * 1.3); if (composer) composer.render(); else renderer.render(scene, cam); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
