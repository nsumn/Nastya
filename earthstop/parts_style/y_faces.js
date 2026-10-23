import * as THREE from 'three';
// FACE LAB: sculpted stylised male heads (Pixar-like proportions) — the head is a displaced sphere (jaw, chin, nose, brow, sockets, cheekbones),
// big glossy eyes with lids, thick brows, and one signature feature each. ?who=prof | beanie | stache   ?shot=portrait | full
const WHO = new URLSearchParams(location.search).get('who') || 'prof', SHOT = new URLSearchParams(location.search).get('shot') || 'portrait';
let seed = 11; function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd(); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const LOOK = { prof: { bg: '#f3d9b8', skin: '#e9b48e', hair: '#5a3a28', top: '#c8583a', top2: '#f2e6cc', eye: '#4a7ab8' },
  beanie: { bg: '#bfe3d8', skin: '#c98e68', hair: '#2a1d16', top: '#3a4a6a', top2: '#ff7a3a', eye: '#5a3a22' },
  stache: { bg: '#f3c6d8', skin: '#f2c6a6', hair: '#ff5fa8', top: '#2a2a32', top2: '#ffd23f', eye: '#3a8a6a' } }[WHO];
scene.background = new THREE.Color(LOOK.bg);
const bumpTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1600; i++) { const v = 100 + Math.floor(rnd() * 60); g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const clay = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: o.rough ?? 0.62, sheen: 0.5, sheenColor: new THREE.Color('#fff0e8'), sheenRoughness: 0.5, bumpMap: bumpTex, bumpScale: o.bump ?? 0.25, clearcoat: o.cc ?? 0, clearcoatRoughness: 0.2, transmission: 0 });
function add(geo, mat, x = 0, y = 0, z = 0, parent = scene) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? clay(mat) : mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const g3 = (x, y, z, c, s) => { const d2 = ((x - c[0]) ** 2) / (s[0] ** 2) + ((y - c[1]) ** 2) / (s[1] ** 2) + ((z - c[2]) ** 2) / (s[2] ** 2); return Math.exp(-d2); };
// ---------- the sculpted head (unit ~ head radius); +z = forward ----------
function sculptHead(look, who) { const geo = new THREE.SphereGeometry(1, 160, 120); const p = geo.attributes.position, v = new THREE.Vector3();
  const wide = who === 'beanie' ? 1.06 : who === 'stache' ? 0.96 : 1.0, jaw = who === 'beanie' ? 0.2 : who === 'prof' ? 0.32 : 0.26, nose = who === 'stache' ? 0.42 : who === 'beanie' ? 0.36 : 0.3;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); let { x, y, z } = v;
    y *= 1.16; x *= wide; z *= 0.96;
    if (y < -0.1) { const k = Math.min(1, (-y - 0.1) / 1.0); x *= 1 - jaw * k * k; z *= 1 - 0.12 * k * k * (z < 0 ? 1.6 : 0.2); }         // jaw tapers to the chin
    if (y > 0.2 && z < 0.2) { x *= 1.02; z *= 1.04; }                                                                                   // back of the skull
    const f = Math.max(0, z);
    z += 0.16 * g3(x, y, z, [0, -0.95, 0.8], [0.32, 0.22, 0.5]) * (who === 'prof' ? 1.3 : 1);                                         // chin
    z += nose * g3(x, y, z, [0, -0.12, 1.0], [0.13, 0.34, 0.4]) + nose * 0.55 * g3(x, y, z, [0, -0.32, 1.0], [0.17, 0.12, 0.4]);      // nose bridge + tip bulb
    for (const sx of [-1, 1]) { z += 0.11 * g3(x, y, z, [sx * 0.12, -0.38, 0.95], [0.08, 0.06, 0.3]);                                  // nostrils/wings
      z -= 0.1 * g3(x, y, z, [sx * 0.36, 0.13, 0.93], [0.2, 0.13, 0.3]);                                                                // eye sockets
      const cb = 0.07 * g3(x, y, z, [sx * 0.6, -0.12, 0.72], [0.25, 0.18, 0.35]); x += sx * cb; z += cb * 0.5;                       // cheekbones
      x += sx * 0.08 * g3(x, y, z, [sx * 0.95, 0.0, 0.0], [0.12, 0.25, 0.18]); }                                                         // temples (ears are separate)
    z += 0.08 * g3(x, y, z, [0, 0.33, 0.92], [0.55, 0.09, 0.3]);                                                                       // brow ridge
    z += 0.06 * g3(x, y, z, [0, -0.62, 0.95], [0.32, 0.12, 0.3]) - 0.035 * g3(x, y, z, [0, -0.72, 1.0], [0.25, 0.03, 0.3]);         // lips mass + mouth line
    p.setXYZ(i, x, y, z); }
  geo.computeVertexNormals(); return geo; }
function eye(parent, sx, look, lid = 0.18) { const e = new THREE.Group(); e.position.set(sx * 0.36, 0.12, 0.74); parent.add(e);
  add(new THREE.SphereGeometry(0.16, 32, 24), clay('#fbfaf6', { rough: 0.15, cc: 1, bump: 0 }), 0, 0, 0, e);
  add(new THREE.SphereGeometry(0.092, 28, 20), clay(look.eye, { rough: 0.2, cc: 1, bump: 0 }), -sx * 0.012, 0.004, 0.122, e).scale.set(1, 1, 0.42);
  add(new THREE.SphereGeometry(0.05, 20, 14), clay('#111111', { rough: 0.1, cc: 1, bump: 0 }), -sx * 0.012, 0.004, 0.152, e).scale.set(1, 1, 0.3);
  add(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), -sx * 0.012 - 0.035, 0.04, 0.165, e);
  const up = add(new THREE.SphereGeometry(0.168, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), clay(look.skin), 0, 0, 0, e); up.rotation.x = -Math.PI * lid;                         // upper lid
  const lo = add(new THREE.SphereGeometry(0.166, 32, 16, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), clay(look.skin), 0, 0, 0, e);                                    // lower lid
  return e; }
function brow(parent, sx, color, tilt, thick) { const c = new THREE.CatmullRomCurve3([V3(sx * 0.14, 0.33, 0.95), V3(sx * 0.33, 0.38 + tilt * 0.4, 0.93), V3(sx * 0.56, 0.32 + tilt, 0.8)]);
  return add(new THREE.TubeGeometry(c, 20, thick, 10, false), clay(color, { bump: 1.2 }), 0, 0, 0, parent); }
function buildHead(who, look) { const head = new THREE.Group();
  add(sculptHead(look, who), clay(look.skin, { rough: 0.55 }), 0, 0, 0, head);
  for (const sx of [-1, 1]) { const ear = add(new THREE.SphereGeometry(0.2, 20, 14), clay(look.skin), sx * 0.98, -0.02, -0.05, head); ear.scale.set(0.38, 1.05, 0.7); ear.rotation.y = sx * 0.4; eye(head, sx, look, who === 'beanie' ? 0.24 : 0.17); }
  const mouth = new THREE.Group(); mouth.position.set(0, -0.69, 1.0); head.add(mouth);
  const ml = new THREE.CatmullRomCurve3([V3(-0.2, 0.02, -0.04), V3(-0.1, -0.015, 0.01), V3(0.0, -0.02, 0.02), V3(0.1, -0.012, 0.01), V3(0.21, 0.035, -0.04)]);
  add(new THREE.TubeGeometry(ml, 24, 0.018, 8, false), clay('#8a3a3a'), 0, 0, 0, mouth); add(new THREE.SphereGeometry(0.12, 20, 12), clay('#d88a7a'), 0, -0.07, -0.02, mouth).scale.set(1.3, 0.35, 0.45);   // smirk + lower lip
  if (who === 'prof') { // curly messy hair (clumps), full short beard, round glasses
    const hair = new THREE.Group(); head.add(hair); for (let i = 0; i < 260; i++) { const th = R(0, Math.PI * 2), ph = R(0, Math.PI * 0.52); const d = V3(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 1.16, Math.sin(ph) * Math.sin(th)); if (d.z > 0.55 && d.y < 0.85) continue; add(new THREE.SphereGeometry(R(0.14, 0.24), 14, 10), clay(look.hair, { bump: 0.8 }), d.x * 1.02, d.y * 1.02 + 0.06, d.z * 1.0, hair); }
    for (let i = 0; i < 420; i++) { const th = R(-0.1, Math.PI + 0.1), y = R(-1.05, -0.38); const r = (1 - 0.32 * Math.min(1, (-y - 0.1))) * 1.0; const x = Math.cos(th) * r * 0.98, z = Math.sin(th) * r * 0.96 + 0.06; if (Math.abs(x) < 0.26 && y > -0.84 && y < -0.56 && z > 0.6) continue; add(new THREE.SphereGeometry(R(0.06, 0.11), 10, 8), clay(look.hair, { bump: 1 }), x, y, z, head); }
    for (const sx of [-1, 1]) { const rim = add(new THREE.TorusGeometry(0.22, 0.026, 12, 40), clay('#2a1f1a', { rough: 0.3, cc: 0.6 }), sx * 0.37, 0.11, 0.98, head); rim.scale.set(1, 0.95, 1); add(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8), clay('#2a1f1a'), sx * 0.7, 0.13, 0.62, head).rotation.set(Math.PI / 2, 0, sx * 0.3); }
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), clay('#2a1f1a'), 0, 0.16, 1.05, head).rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) brow(head, sx, look.hair, -0.02, 0.05); }
  if (who === 'beanie') { // orange knit beanie with a folded cuff, stubble, freckles, a little scar in one brow
    const bn = add(new THREE.SphereGeometry(1.1, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.5), clay(look.top2, { bump: 2.5, rough: 0.9 }), 0, 0.32, -0.03, head); bn.scale.set(1.02, 1.0, 1.02);
    add(new THREE.TorusGeometry(1.06, 0.13, 16, 64), clay(look.top2, { bump: 2.5, rough: 0.9 }), 0, 0.4, -0.03, head).rotation.x = Math.PI / 2 + 0.05;
    for (const sx of [-1, 1]) { const tuft = add(new THREE.SphereGeometry(0.16, 12, 10), clay(look.hair, { bump: 1 }), sx * 0.86, 0.32, 0.4, head); tuft.scale.set(0.6, 1, 0.8); }
    { const N = 5000, st = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0075, 4, 3), clay(look.hair, { bump: 0 }), N); const o = new THREE.Object3D(); let k = 0; head.add(st);
      const hg = head.children[0].geometry; const hp = hg.attributes.position; for (let i = 0; i < hp.count && k < N; i += 1) { const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i); if (y > -0.36 || y < -1.12 || z < 0.05 || rnd() > 0.55) continue; if (Math.abs(x) < 0.3 && y > -0.84 && y < -0.6 && z > 0.8) continue; o.position.set(x * 1.012, y * 1.005, z * 1.012); o.updateMatrix(); st.setMatrixAt(k++, o.matrix); } st.count = k; }
    for (let i = 0; i < 26; i++) { const sx = i % 2 ? 1 : -1; add(new THREE.SphereGeometry(0.014, 6, 4), clay('#8a5a3e'), sx * R(0.2, 0.62), R(-0.32, -0.08), 0.0, head).position.z = 0.9 - 0.25 * Math.abs(sx * 0.4); }
    brow(head, -1, look.hair, 0.02, 0.06); const b2 = brow(head, 1, look.hair, -0.04, 0.06); add(new THREE.BoxGeometry(0.03, 0.1, 0.06), clay(look.skin), 0.36, 0.37, 0.95, head).rotation.z = 0.3; }
  if (who === 'stache') { // pink swoopy quiff, big curled handlebar mustache, gold earring
    const hair = new THREE.Group(); head.add(hair);
    const cap = add(new THREE.SphereGeometry(1.05, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.3), clay(look.hair, { bump: 1.2 }), 0, 0.2, -0.1, hair); cap.scale.set(1, 1.1, 1.0);
    for (let i = 0; i < 70; i++) { const th = R(Math.PI * 0.75, Math.PI * 2.25), ph = R(0.25, 0.85); const d = V3(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 1.16, Math.sin(ph) * Math.sin(th)); if (d.z > 0.35) continue; add(new THREE.SphereGeometry(R(0.16, 0.26), 14, 10), clay(look.hair, { bump: 1 }), d.x * 0.98, d.y * 0.98 + 0.1, d.z * 0.98, hair); }
    for (const sx of [-1, 1]) { const sb = add(new THREE.CapsuleGeometry(0.06, 0.28, 6, 10), clay(look.hair), sx * 0.93, -0.1, 0.25, hair); sb.rotation.z = sx * 0.1; }
    for (let i = 0; i < 7; i++) { const a = -0.6 + i * 0.2; const c = new THREE.CatmullRomCurve3([V3(Math.sin(a) * 0.9, 0.7, Math.cos(a) * 0.3 - 0.3), V3(Math.sin(a) * 0.6 + 0.1, 1.35 - Math.abs(a) * 0.2, 0.45), V3(Math.sin(a) * 0.35 + 0.35, 1.25 - Math.abs(a) * 0.3, 0.95)]); add(new THREE.TubeGeometry(c, 24, 0.17 - Math.abs(a) * 0.08, 12, false), clay(look.hair, { bump: 1.2 }), 0, 0, 0, hair); }
    for (const sx of [-1, 1]) { const c = new THREE.CatmullRomCurve3([V3(0, -0.5, 1.2), V3(sx * 0.18, -0.55, 1.16), V3(sx * 0.4, -0.6, 1.0), V3(sx * 0.56, -0.48, 0.86), V3(sx * 0.6, -0.33, 0.85), V3(sx * 0.5, -0.3, 0.9)]);
      for (let k = 0; k <= 40; k++) { const u = k / 40, pt = c.getPointAt(u); const r = 0.11 * Math.sin(Math.PI * Math.min(1, u * 1.25 + 0.12)) + 0.02; add(new THREE.SphereGeometry(r, 14, 10), clay('#5a2a3a', { bump: 1.5 }), pt.x, pt.y, pt.z, head); }
      brow(head, sx, '#5a2a3a', 0.05, 0.055); }
    add(new THREE.TorusGeometry(0.07, 0.016, 10, 24), clay('#e8b830', { rough: 0.2, cc: 1, bump: 0 }), 0.98, -0.32, 0.0, head).rotation.y = Math.PI / 2; }
  return head; }
// ---------- body (shoulders + top) ----------
const hero = new THREE.Group(); scene.add(hero);
const head = buildHead(WHO, LOOK); head.scale.setScalar(0.34); head.position.set(0, 1.62, 0); head.rotation.set(0.03, -0.18, 0.02); hero.add(head);
add(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 20), clay(LOOK.skin), 0, 1.33, 0, hero);
const torso = add(new THREE.CapsuleGeometry(0.33, 0.55, 8, 24), clay(LOOK.top, { bump: 1.5, rough: 0.85 }), 0, 0.82, 0, hero); torso.scale.set(1.15, 1, 0.68);
const shoulders = add(new THREE.CapsuleGeometry(0.17, 0.52, 8, 20), clay(LOOK.top, { bump: 1.5, rough: 0.85 }), 0, 1.14, 0, hero); shoulders.rotation.z = Math.PI / 2; shoulders.scale.set(1, 1, 0.75);
for (const sx of [-1, 1]) { const arm = add(new THREE.CapsuleGeometry(0.11, 0.62, 8, 16), clay(LOOK.top, { bump: 1.5, rough: 0.85 }), sx * 0.47, 0.78, 0.02, hero); arm.rotation.z = sx * 0.12; }
if (WHO === 'prof') { const col = add(new THREE.TorusGeometry(0.16, 0.05, 10, 30), clay(LOOK.top2), 0, 1.22, 0.02, hero); col.rotation.x = Math.PI / 2; }
if (WHO === 'beanie') { const hood = add(new THREE.TorusGeometry(0.24, 0.1, 12, 30), clay(LOOK.top, { bump: 1.5 }), 0, 1.2, -0.05, hero); hood.rotation.x = Math.PI / 2 - 0.3; for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), clay('#f4f4f4'), sx * 0.07, 1.0, 0.25, hero); }
if (WHO === 'stache') { for (const sx of [-1, 1]) { const lap = add(new THREE.BoxGeometry(0.16, 0.45, 0.04), clay('#3a3a44'), sx * 0.13, 0.98, 0.22, hero); lap.rotation.z = sx * 0.25; } add(new THREE.BoxGeometry(0.16, 0.3, 0.03), clay(LOOK.top2), 0, 1.02, 0.21, hero); }
// "?" pin (channel mark) on every outfit
{ const pin = new THREE.Group(); pin.position.set(-0.2, 1.02, 0.25); hero.add(pin); const q = add(new THREE.TorusGeometry(0.035, 0.012, 10, 22, Math.PI * 1.45), clay('#ffd23f', { cc: 1, bump: 0 }), 0, 0.012, 0, pin); q.rotation.z = -Math.PI * 0.62; add(new THREE.SphereGeometry(0.012, 8, 6), clay('#ffd23f'), -0.002, -0.055, 0, pin); }
// ---------- studio light: key, fill, rim; soft floor ----------
scene.add(new THREE.HemisphereLight(0xfff4ec, 0x8a7a70, 0.9));
const key = new THREE.DirectionalLight(0xfff0e0, 2.6); key.position.set(2.5, 3.5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.blurSamples = 16; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.03; Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 }); scene.add(key);
const fill = new THREE.DirectionalLight(0xe0ecff, 0.9); fill.position.set(-3, 1.5, 2.5); scene.add(fill); const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(-1.5, 2.5, -3); scene.add(rim);
const floor = add(new THREE.CircleGeometry(6, 48), clay(LOOK.bg, { bump: 0 }), 0, 0, 0); floor.rotation.x = -Math.PI / 2; const wall = add(new THREE.PlaneGeometry(12, 8), clay(LOOK.bg, { bump: 0 }), 0, 3, -2.5);
const cam = new THREE.PerspectiveCamera(SHOT === 'portrait' ? 24 : 30, W / H, 0.05, 50);
if (SHOT === 'portrait') { cam.position.set(0.75, 1.78, 4.1); cam.lookAt(0, 1.62, 0); } else { cam.position.set(0.7, 1.4, 4.6); cam.lookAt(0, 1.05, 0); }
const NAMES = { prof: ['DR. MILO', 'the overthinker · curly hair, beard, round glasses'], beanie: ['JAKE', 'the chill one · orange beanie, stubble, freckles'], stache: ['RICO', 'the showman · pink quiff, handlebar mustache'] };
document.getElementById('title').innerHTML = NAMES[WHO][0]; document.getElementById('cap').innerHTML = '<span>' + NAMES[WHO][1] + '</span>'; document.getElementById('cap').style.opacity = 1; document.getElementById('cap').style.top = '1560px';
document.getElementById('hud').style.opacity = 0; document.getElementById('tag').innerHTML = '<span>HOST CONCEPT</span>';
window.renderAt = () => { renderer.render(scene, cam); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
