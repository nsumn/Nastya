import * as THREE from 'three';
// MASCOT LAB: non-human hosts. ?who=brain | cat | raccoon — sculpted (displaced spheres), clay look, studio light.
const WHO = new URLSearchParams(location.search).get('who') || 'brain';
let seed = 5; function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd(); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); const BG = { brain: '#d9ccff', cat: '#ffe1b8', raccoon: '#cde8d4' }[WHO]; scene.background = new THREE.Color(BG);
const bumpTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1600; i++) { const v = 100 + Math.floor(rnd() * 60); g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const clay = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: o.rough ?? 0.6, sheen: 0.5, sheenColor: new THREE.Color('#fff0e8'), sheenRoughness: 0.5, bumpMap: bumpTex, bumpScale: o.bump ?? 0.3, clearcoat: o.cc ?? 0, clearcoatRoughness: 0.2, vertexColors: !!o.vc });
function add(geo, mat, x = 0, y = 0, z = 0, parent = scene) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? clay(mat) : mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const g3 = (x, y, z, c, s) => Math.exp(-(((x - c[0]) ** 2) / (s[0] ** 2) + ((y - c[1]) ** 2) / (s[1] ** 2) + ((z - c[2]) ** 2) / (s[2] ** 2)));
function eyes(parent, y, z, sep, size, iris, lid = 0.12) { for (const sx of [-1, 1]) { const e = new THREE.Group(); e.position.set(sx * sep, y, z); parent.add(e);
  add(new THREE.SphereGeometry(size, 32, 24), clay('#fbfaf6', { rough: 0.15, cc: 1, bump: 0 }), 0, 0, 0, e);
  add(new THREE.SphereGeometry(size * 0.62, 28, 20), clay(iris, { rough: 0.2, cc: 1, bump: 0 }), -sx * size * 0.06, size * 0.03, size * 0.78, e).scale.set(1, 1.05, 0.42);
  add(new THREE.SphereGeometry(size * 0.34, 20, 14), clay('#111111', { rough: 0.1, cc: 1, bump: 0 }), -sx * size * 0.06, size * 0.03, size * 0.95, e).scale.set(1, 1.05, 0.3);
  add(new THREE.SphereGeometry(size * 0.15, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), -sx * size * 0.06 - size * 0.22, size * 0.28, size * 1.02, e);
  const up = add(new THREE.SphereGeometry(size * 1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), clay(parent.userData.lid || '#ffffff'), 0, 0, 0, e); up.rotation.x = -Math.PI * lid; up.visible = !!parent.userData.lid; } }
function smile(parent, y, z, w, col = '#5a1a2a') { const c = new THREE.CatmullRomCurve3([V3(-w, y + 0.03, z - 0.02), V3(-w * 0.4, y - 0.025, z), V3(0, y - 0.035, z + 0.01), V3(w * 0.4, y - 0.025, z), V3(w, y + 0.03, z - 0.02)]); return add(new THREE.TubeGeometry(c, 24, w * 0.11, 8, false), clay(col), 0, 0, 0, parent); }
function qPin(parent, x, y, z, s = 1) { const pin = new THREE.Group(); pin.position.set(x, y, z); pin.scale.setScalar(s); parent.add(pin); const q = add(new THREE.TorusGeometry(0.035, 0.012, 10, 22, Math.PI * 1.45), clay('#ffd23f', { cc: 1, bump: 0 }), 0, 0.012, 0, pin); q.rotation.z = -Math.PI * 0.62; add(new THREE.SphereGeometry(0.012, 8, 6), clay('#ffd23f'), -0.002, -0.055, 0, pin); }
const hero = new THREE.Group(); scene.add(hero);
if (WHO === 'brain') { // a pink brain with gyri (folds), a central fissure, big eyes, tiny limbs with white gloves + sneakers
  const geo = new THREE.SphereGeometry(1, 180, 140); const p = geo.attributes.position, v = new THREE.Vector3(); const col = new Float32Array(p.count * 3); const c = new THREE.Color(), base = new THREE.Color('#ff8fb8'), deep = new THREE.Color('#d9578e');
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let { x, y, z } = v; x *= 1.12; y *= 0.86; z *= 0.95;
    const folds = Math.sin(x * 9 + Math.sin(y * 7) * 1.8 + Math.sin(z * 5)) * Math.sin(y * 8 + Math.sin(z * 6 + x * 3) * 1.6) + 0.5 * Math.sin((x + z) * 13 + y * 4);
    const ridge = Math.pow(Math.abs(folds), 0.6); const fis = Math.exp(-(x * x) / 0.004) * Math.max(0, y + 0.3); const face = g3(x, y, z, [0, -0.15, 0.9], [0.55, 0.35, 0.4]);
    const d = 1 + 0.06 * ridge * (1 - face * 0.85) - 0.12 * fis; p.setXYZ(i, x * d, y * d, z * d); c.copy(deep).lerp(base, Math.min(1, 0.35 + ridge * 0.8 + face * 0.6)); col.set([c.r, c.g, c.b], i * 3); }
  geo.computeVertexNormals(); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); const brain = add(geo, clay('#ffffff', { vc: true, rough: 0.45, cc: 0.4, bump: 0.2 }), 0, 1.02, 0, hero); brain.scale.setScalar(0.62);
  const face = new THREE.Group(); face.position.set(0, 1.02, 0); face.scale.setScalar(0.62); hero.add(face); eyes(face, -0.08, 0.86, 0.3, 0.2, '#6a4ad0'); smile(face, -0.45, 0.88, 0.16);
  for (const sx of [-1, 1]) { const bl = add(new THREE.SphereGeometry(0.1, 14, 10), clay('#ff6a9a'), sx * 0.55, -0.32, 0.78, face); bl.scale.set(1, 0.5, 0.3); }
  for (const sx of [-1, 1]) { const arm = add(new THREE.CapsuleGeometry(0.035, 0.3, 6, 10), clay('#ff8fb8'), sx * 0.78, sx > 0 ? 1.02 : 0.8, 0.1, hero); arm.rotation.z = sx > 0 ? -2.2 : -0.5; add(new THREE.SphereGeometry(0.09, 16, 12), clay('#ffffff', { rough: 0.4 }), sx > 0 ? 0.98 : -0.92, sx > 0 ? 1.12 : 0.66, 0.12, hero);
    add(new THREE.CapsuleGeometry(0.04, 0.38, 6, 10), clay('#ff8fb8'), sx * 0.18, 0.42, 0, hero); const sh = add(new THREE.SphereGeometry(0.12, 16, 12), clay('#ffffff', { rough: 0.4 }), sx * 0.2, 0.16, 0.06, hero); sh.scale.set(0.9, 0.55, 1.4); add(new THREE.BoxGeometry(0.2, 0.03, 0.3), clay('#ff5a8a'), sx * 0.2, 0.1, 0.07, hero); }
  qPin(hero, 0.42, 1.39, 0.42, 2.2); }
if (WHO === 'cat' || WHO === 'raccoon') { const CAT = WHO === 'cat'; const fur = CAT ? '#f2a35e' : '#9a9aa2', fur2 = CAT ? '#fff2e2' : '#f2f2f2', dark = CAT ? '#c66a2a' : '#2e2e34', top = CAT ? '#b8a6ff' : '#ff8a5c';
  // head: wide, cheek fluff, muzzle
  const geo = new THREE.SphereGeometry(1, 140, 110); const p = geo.attributes.position, v = new THREE.Vector3(); const col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let { x, y, z } = v; x *= 1.18; y *= 0.95;
    for (const sx of [-1, 1]) { x += sx * 0.12 * g3(x, y, z, [sx * 1.0, -0.35, 0.3], [0.3, 0.25, 0.4]); }
    z += 0.22 * g3(x, y, z, [0, -0.38, 0.95], [0.38, 0.22, 0.4]); y -= 0.05 * g3(x, y, z, [0, -0.6, 0.6], [0.5, 0.3, 0.6]);
    p.setXYZ(i, x, y, z);
    let k = 0; if (CAT) { const stripe = Math.max(0, Math.sin(x * 9) * Math.exp(-((y - 0.75) ** 2) / 0.08)); k = stripe > 0.6 ? 2 : 0; if (g3(x, y, z, [0, -0.4, 1.0], [0.42, 0.3, 0.5]) > 0.5) k = 1; }
    else { const mask = g3(Math.abs(x), y, z, [0.42, 0.05, 0.85], [0.32, 0.15, 0.5]); if (mask > 0.4) k = 2; if (g3(x, y, z, [0, -0.4, 1.0], [0.4, 0.28, 0.5]) > 0.5 || (y > 0.15 && Math.abs(x) < 0.12 && z > 0.6)) k = 1; }
    c.set(k === 1 ? fur2 : k === 2 ? dark : fur); col.set([c.r, c.g, c.b], i * 3); }
  geo.computeVertexNormals(); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); const head = new THREE.Group(); head.position.set(0, 1.55, 0); head.scale.setScalar(0.42); hero.add(head);
  add(geo, clay('#ffffff', { vc: true, rough: 0.75, bump: 1.4 }), 0, 0, 0, head);
  for (const sx of [-1, 1]) { const ear = add(new THREE.ConeGeometry(0.34, 0.6, 4), clay(CAT ? fur : dark, { bump: 1.2 }), sx * 0.66, 0.86, -0.05, head); ear.rotation.set(0, Math.PI / 4, sx * -0.35); ear.scale.set(1, 1, 0.55);
    const inn = add(new THREE.ConeGeometry(0.2, 0.38, 4), clay('#ff9eb5'), sx * 0.62, 0.82, 0.05, head); inn.rotation.set(0, Math.PI / 4, sx * -0.35); inn.scale.set(1, 1, 0.3); }
  head.userData.lid = fur; eyes(head, 0.1, 0.9, 0.38, 0.21, CAT ? '#3aa86a' : '#5a3a22', 0.12);
  add(new THREE.SphereGeometry(0.09, 16, 12), clay(CAT ? '#ff7a9a' : '#1a1a1e', { cc: 1 }), 0, -0.2, 1.08, head).scale.set(1.3, 0.8, 0.8); smile(head, -0.42, 1.0, 0.2, CAT ? '#7a3a2a' : '#1a1a1e');
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const wh = add(new THREE.CylinderGeometry(0.008, 0.004, 0.9, 6), clay('#fafafa'), sx * 0.72, -0.32 + k * 0.08, 0.85, head); wh.rotation.z = Math.PI / 2 + sx * (k - 1) * 0.12; wh.rotation.y = sx * 0.25; }
  // body in a hoodie, paws, tail
  const torso = add(new THREE.CapsuleGeometry(0.3, 0.42, 8, 24), clay(top, { bump: 1.5, rough: 0.85 }), 0, 0.85, 0, hero); torso.scale.set(1.1, 1, 0.8);
  const hood = add(new THREE.TorusGeometry(0.22, 0.09, 12, 30), clay(top, { bump: 1.5 }), 0, 1.2, -0.08, hero); hood.rotation.x = Math.PI / 2 - 0.3;
  for (const sx of [-1, 1]) { const arm = add(new THREE.CapsuleGeometry(0.09, 0.42, 8, 14), clay(top, { bump: 1.5 }), sx * 0.4, 0.85, 0.08, hero); arm.rotation.z = sx * 0.25; add(new THREE.SphereGeometry(0.1, 16, 12), clay(CAT ? fur2 : '#2e2e34', { bump: 1.2 }), sx * 0.47, 0.57, 0.14, hero);
    add(new THREE.CapsuleGeometry(0.1, 0.25, 6, 12), clay('#3a3e4a'), sx * 0.14, 0.35, 0, hero); const pw = add(new THREE.SphereGeometry(0.13, 16, 12), clay(CAT ? fur2 : '#2e2e34', { bump: 1.2 }), sx * 0.15, 0.1, 0.07, hero); pw.scale.set(1, 0.6, 1.3); }
  const tail = new THREE.CatmullRomCurve3([V3(0.1, 0.4, -0.25), V3(0.5, 0.35, -0.4), V3(0.75, 0.7, -0.35), V3(0.7, 1.05, -0.2)]);
  for (let k = 0; k <= 30; k++) { const u = k / 30, pt = tail.getPointAt(u); add(new THREE.SphereGeometry(CAT ? 0.08 : 0.11 + 0.03 * Math.sin(u * 9), 12, 10), clay(CAT ? fur : (Math.floor(u * 7) % 2 ? '#2e2e34' : '#c8c8cc'), { bump: 1.4 }), pt.x, pt.y, pt.z, hero); }
  qPin(hero, -0.16, 1.0, 0.27, 1.6); }
// studio light + floor
scene.add(new THREE.HemisphereLight(0xfff4ec, 0x8a7a70, 0.9));
const key = new THREE.DirectionalLight(0xfff0e0, 2.6); key.position.set(2.5, 3.5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.normalBias = 0.03; Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 }); scene.add(key);
const fill = new THREE.DirectionalLight(0xe0ecff, 0.9); fill.position.set(-3, 1.5, 2.5); scene.add(fill); const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(-1.5, 2.5, -3); scene.add(rim);
const floor = add(new THREE.CircleGeometry(6, 48), clay(BG, { bump: 0 })); floor.rotation.x = -Math.PI / 2; add(new THREE.PlaneGeometry(12, 8), clay(BG, { bump: 0 }), 0, 3, -2.5);
const cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 50); cam.position.set(0.8, 1.4, 5.3); cam.lookAt(0, 0.98, 0); hero.rotation.y = -0.2;
const NAMES = { brain: ['BRAINY', 'the host of "Your Brain" · pink, curious, a bit dramatic'], cat: ['MOCHI', 'the curious cat · orange tabby in a lavender hoodie'], raccoon: ['BANDIT', 'the raccoon · knows all your 3 AM thoughts'] };
document.getElementById('title').innerHTML = NAMES[WHO][0]; document.getElementById('cap').innerHTML = '<span>' + NAMES[WHO][1] + '</span>'; document.getElementById('cap').style.opacity = 1; document.getElementById('cap').style.top = '1560px';
document.getElementById('hud').style.opacity = 0; document.getElementById('tag').innerHTML = '<span>HOST CONCEPT</span>';
window.renderAt = () => { renderer.render(scene, cam); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
