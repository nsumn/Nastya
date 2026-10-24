// =================== APARTMENT (meters): desk (day 5 fog), kitchen island + scale, couch + TV + the rat cage, sunny morning with real food.
// One scene, four modes: updateApt(t, mode) sets props, lights and the hero for that beat, so two modes can dissolve into each other ===================
const apt = new THREE.Scene(); const aptCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hemiA = new THREE.HemisphereLight(0xe8eeff, 0x4a3a40, 0.7); apt.add(hemiA);
const sunA = new THREE.DirectionalLight(0xfff0d8, 1); sunA.position.set(-2.2, 5, -9); sunA.target.position.set(-0.5, 0, 0.5); sunA.castShadow = true; sunA.shadow.mapSize.set(2048, 2048); sunA.shadow.bias = -0.0004; Object.assign(sunA.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, far: 30 }); apt.add(sunA, sunA.target);
const fillA = new THREE.PointLight(0xffe8d0, 3, 12, 1.4); fillA.position.set(1.5, 2.6, 3.0); apt.add(fillA);
const pendA = new THREE.PointLight(0xffc880, 0, 6, 1.5); pendA.position.set(2.0, 2.3, -1.2); apt.add(pendA);
const floorLA = new THREE.PointLight(0xffb070, 0, 5, 1.5); floorLA.position.set(-0.4, 1.6, -0.4); apt.add(floorLA);
const tvLA = new THREE.PointLight(0x7ab0ff, 0, 7, 1.3); tvLA.position.set(-3.4, 1.3, 1.0); apt.add(tvLA);
{ const wood = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = pick(['#a87a52', '#b0845a', '#9e7048', '#b88c62']); g.fillRect(0, y, w, 31); g.fillStyle = 'rgba(60,30,10,0.25)'; g.fillRect(rnd() * w, y, 2, 31); } }, [3, 3]);
  const fl = mesh(new THREE.PlaneGeometry(8, 7), M('#ffffff', { map: wood, roughness: 0.75 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.5); apt.add(fl);
  bx(8, 3, 0.1, '#9a8ac8', 0, 1.5, -3.55, apt); bx(0.1, 3, 7, '#8a7ab8', -4.05, 1.5, -0.5, apt); bx(0.1, 3, 7, '#f0e6d8', 4.05, 1.5, -0.5, apt); bx(8, 0.1, 7, '#f4f0ea', 0, 3.0, -0.5, apt);
  bx(0.06, 2.1, 0.95, '#6a4a32', 3.98, 1.05, 1.6, apt); const kn = mesh(new THREE.SphereGeometry(0.035, 8, 6), M('#d8c070', { metalness: 0.6 })); kn.position.set(3.93, 1.0, 1.25); apt.add(kn);
  const rug = mesh(new THREE.CircleGeometry(1.4, 24), M('#e8c86a', { roughness: 1 }), false, true); rug.rotation.x = -Math.PI / 2; rug.position.set(-2.2, 0.01, 1.0); apt.add(rug); }
const winA = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) })); winA.position.set(-2.2, 1.75, -3.49); apt.add(winA);
bx(2.36, 0.08, 0.12, '#f4f0ea', -2.2, 0.96, -3.46, apt); bx(0.06, 1.5, 0.05, '#f4f0ea', -2.2, 1.75, -3.47, apt);
const tvM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.02, 0.03) }); { bx(0.06, 0.98, 1.72, '#1a1a1e', -3.98, 1.25, 1.0, apt); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), tvM); s.rotation.y = Math.PI / 2; s.position.set(-3.94, 1.25, 1.0); apt.add(s); }
// desk + chair + laptop (the lid hinges at its back edge)
bx(1.4, 0.05, 0.7, '#e8dcc8', -2.2, 0.75, -1.6, apt); for (const [dx, dz] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) bx(0.04, 0.75, 0.04, '#4a4a52', -2.2 + dx, 0.375, -1.6 + dz, apt);
bx(0.5, 0.06, 0.5, '#3a3e46', -2.2, 0.48, -2.3, apt); bx(0.5, 0.6, 0.06, '#3a3e46', -2.2, 0.8, -2.55, apt);
bx(0.36, 0.02, 0.25, '#b8bcc4', -2.2, 0.785, -1.6, apt, { metalness: 0.5, roughness: 0.3 });
const lidA = grp(-2.2, 0.795, -1.725, 0, apt); bx(0.36, 0.24, 0.015, '#b8bcc4', 0, 0.12, 0, lidA, { metalness: 0.5, roughness: 0.3 });
{ const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.21), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.3, 1.5) })); sc.position.set(0, 0.12, -0.009); sc.rotation.y = Math.PI; lidA.add(sc); }
// kitchen: island, back counter, fridge, pendant lamps
bx(2.0, 0.9, 0.9, '#f4f0e8', 2.0, 0.45, -1.2, apt); bx(2.1, 0.05, 1.0, '#3a3e46', 2.0, 0.925, -1.2, apt);
bx(3.2, 0.9, 0.6, '#f4f0e8', 2.3, 0.45, -3.2, apt); bx(3.2, 0.05, 0.62, '#3a3e46', 2.3, 0.925, -3.2, apt); bx(0.8, 1.95, 0.7, '#dfe4ea', 3.5, 0.975, -3.1, apt, { roughness: 0.3 });
for (const x of [1.5, 2.5]) { bx(0.01, 0.8, 0.01, '#222', x, 2.6, -1.2, apt); const sh = mesh(new THREE.ConeGeometry(0.16, 0.18, 12, 1, true), M('#2a2a30', { side: THREE.DoubleSide })); sh.position.set(x, 2.15, -1.2); apt.add(sh); }
// couch + floor lamp + side table with the rat cage; stuff you never got to: guitar, gym bag, laundry, a book
bx(0.95, 0.42, 2.3, '#c8584a', -1.55, 0.21, 1.05, apt); bx(0.25, 0.85, 2.3, '#b84a3e', -0.98, 0.5, 1.05, apt); for (const z of [-0.18, 2.28]) bx(0.95, 0.6, 0.22, '#b84a3e', -1.45, 0.4, z, apt);
bx(0.8, 0.12, 0.6, '#e86a5a', -1.6, 0.48, 0.5, apt); bx(0.8, 0.12, 0.7, '#e86a5a', -1.6, 0.48, 1.55, apt);
bx(0.04, 1.5, 0.04, '#2a2a30', -0.35, 0.75, -0.35, apt); { const ls = mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.28, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#3a2a10' })); ls.position.set(-0.35, 1.6, -0.35); apt.add(ls); }
bx(0.7, 0.62, 0.5, '#6a4a32', 0.9, 0.31, 2.4, apt);
const ratCage = grp(0.9, 0.62, 2.4, -0.25, apt); bx(0.62, 0.05, 0.42, '#3a8ac8', 0, 0.025, 0, ratCage);
{ const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.36, 0.42)), new THREE.LineBasicMaterial({ color: '#c8c8d0' })); ed.position.y = 0.23; ratCage.add(ed);
  const bars = []; for (let x = -0.3; x <= 0.3; x += 0.05) bars.push(x, 0.05, 0.21, x, 0.41, 0.21, x, 0.05, -0.21, x, 0.41, -0.21); const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bars, 3)); ratCage.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#b8b8c0' })));
  bx(0.05, 0.06, 0.04, '#d83a3a', 0.24, 0.16, -0.19, ratCage); bx(0.08, 0.03, 0.06, '#c8c8c8', 0.24, 0.07, -0.16, ratCage); }
const leverA = bx(0.06, 0.012, 0.04, '#f2c84a', 0.17, 0.16, -0.17, ratCage);
const rat = grp(0, 0.05, 0, 0, ratCage); { const b = mesh(new THREE.SphereGeometry(1, 12, 8), M('#a8a8b2')); b.scale.set(0.055, 0.045, 0.085); b.position.y = 0.045; rat.add(b);
  const hd = mesh(new THREE.ConeGeometry(0.035, 0.08, 8), M('#a8a8b2')); hd.rotation.x = Math.PI / 2; hd.position.set(0, 0.06, 0.11); rat.add(hd); const ns = mesh(new THREE.SphereGeometry(0.01, 6, 4), M('#f08a9a')); ns.position.set(0, 0.06, 0.15); rat.add(ns);
  for (const s of [-1, 1]) { const e = mesh(new THREE.CircleGeometry(0.02, 10), M('#f0a0b0', { side: THREE.DoubleSide })); e.position.set(s * 0.025, 0.095, 0.085); rat.add(e); const ey = mesh(new THREE.SphereGeometry(0.007, 6, 4), M('#111')); ey.position.set(s * 0.018, 0.072, 0.12); rat.add(ey); }
  const tl = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0.03, -0.08), V3(0.04, 0.02, -0.16), V3(-0.02, 0.01, -0.24)]), 10, 0.006, 5), M('#f0a0b0')); rat.add(tl); }
const zzz = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); });
const zzzA = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzz, transparent: true, depthWrite: false })); zzzA.scale.setScalar(0.07); apt.add(zzzA);
{ const gt = grp(-0.4, 0, -3.35, 0.15, apt); const gb = mesh(new THREE.SphereGeometry(1, 14, 10), M('#c87a3a')); gb.scale.set(0.2, 0.25, 0.06); gb.position.y = 0.3; gt.add(gb); bx(0.05, 0.6, 0.03, '#4a2a1a', 0, 0.8, 0, gt); gt.rotation.x = -0.12;
  const bag = grp(3.3, 0, 2.3, 0.3, apt); bx(0.6, 0.3, 0.3, '#2a4a8a', 0, 0.15, 0, bag); bx(0.5, 0.03, 0.04, '#1a1a1a', 0, 0.36, 0, bag);
  for (let i = 0; i < 7; i++) { const c = mesh(new THREE.SphereGeometry(1, 8, 6), M(pick(['#e8e8e8', '#5a7ac8', '#d86a6a', '#3a3a40', '#e8c86a']))); c.scale.set(R(0.16, 0.26), R(0.05, 0.09), R(0.14, 0.22)); c.position.set(-0.1 + R(-0.25, 0.25), 0.05 + i * 0.025, 2.35 + R(-0.2, 0.2)); c.rotation.y = R(0, 3); apt.add(c); }
  bx(0.32, 0.03, 0.22, '#f4f0e8', 0.3, 0.015, 0.5, apt).rotation.y = 0.5; }
// fast-food clutter (desk, island, couch) vs. real food (morning)
const JUNK = [];
function junkAt(x, y, z, kind) { const g = grp(x, y, z, R(-0.6, 0.6), apt);
  if (kind === 0) { bx(0.16, 0.07, 0.16, pick(['#f2c84a', '#d83a3a', '#f08a3a']), 0, 0.035, 0, g); }
  else if (kind === 1) { const c = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.18, 10), M('#e8e8e8')); c.position.y = 0.09; g.add(c); const b = mesh(new THREE.CylinderGeometry(0.051, 0.047, 0.06, 10), M('#d83a3a')); b.position.y = 0.11; g.add(b); }
  else { const w = mesh(new THREE.IcosahedronGeometry(0.05, 0), M(pick(['#f4f0e0', '#f2d04a', '#e8e4dc']), { flatShading: true })); w.scale.y = 0.6; w.position.y = 0.03; g.add(w); }
  JUNK.push(g); return g; }
[[-2.6, -1.45, 0], [-2.55, -1.75, 1], [-1.75, -1.5, 2], [-1.7, -1.8, 1], [-2.0, -1.35, 2]].forEach(([x, z, k]) => junkAt(x, 0.775, z, k));
[[1.4, -1.0, 0], [1.6, -1.3, 0], [1.8, -0.95, 1], [2.2, -1.35, 0], [2.4, -1.0, 2], [2.6, -1.25, 1], [1.5, -1.25, 0]].forEach(([x, z, k]) => junkAt(x, 0.95, z, k));
[[-0.6, 0.6, 0], [-0.7, 1.4, 1], [-0.3, 1.9, 2], [0.1, 1.0, 0]].forEach(([x, z, k]) => junkAt(x, 0.0, z, k));
const burgerA = new THREE.Group(); { const b1 = mesh(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#d8964a')); b1.position.y = 0.03; burgerA.add(b1); const pt = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.025, 10), M('#5a3020')); burgerA.add(pt);
  const ls = mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.006, 10), M('#6ac84a')); ls.position.y = 0.016; burgerA.add(ls); const b2 = mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.03, 10), M('#d8964a')); b2.position.y = -0.025; burgerA.add(b2); }
const appleA = new THREE.Group(); { const a = mesh(new THREE.SphereGeometry(0.05, 10, 8), M('#d8302a', { roughness: 0.35 })); appleA.add(a); bx(0.006, 0.03, 0.006, '#4a2a1a', 0, 0.055, 0, appleA); }
const phoneA = new THREE.Group(); { bx(0.07, 0.14, 0.01, '#1a1a1e', 0, 0, 0, phoneA); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.125), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.5, 1.9) })); s.position.z = -0.006; s.rotation.y = Math.PI; phoneA.add(s); }
const REAL = new THREE.Group(); apt.add(REAL); { const bowl = mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#f4f0e8', { side: THREE.DoubleSide })); bowl.position.set(1.6, 1.13, -1.15); REAL.add(bowl);
  for (let i = 0; i < 9; i++) { const f = mesh(new THREE.SphereGeometry(R(0.05, 0.07), 10, 8), M(pick(['#d8302a', '#f2a030', '#f2d84a', '#6ac84a', '#a83ad8']), { roughness: 0.4 })); f.position.set(1.6 + R(-0.12, 0.12), 1.0 + R(0, 0.1), -1.15 + R(-0.12, 0.12)); REAL.add(f); }
  const pl = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.02, 20), M('#ffffff')); pl.position.set(2.35, 0.96, -1.1); REAL.add(pl);
  for (let i = 0; i < 12; i++) { const k = i % 3; const v = k === 0 ? mesh(new THREE.ConeGeometry(0.02, 0.14, 6), M('#f08a2a')) : k === 1 ? mesh(new THREE.IcosahedronGeometry(0.04, 0), M('#3a9a3a', { flatShading: true })) : mesh(new THREE.SphereGeometry(0.025, 8, 6), M('#e84a3a'));
    v.position.set(2.35 + R(-0.12, 0.12), 0.995, -1.1 + R(-0.12, 0.12)); if (k === 0) { v.rotation.z = Math.PI / 2; v.rotation.y = R(0, 3); } REAL.add(v); } }
// the bathroom scale (dial on top, needle on a pivot)
const scaleA = grp(3.3, 0, -0.2, 0, apt); bx(0.36, 0.06, 0.4, '#f4f4f4', 0, 0.03, 0, scaleA, { roughness: 0.3 });
{ const dt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#222'; for (let i = 0; i < 40; i++) { const a = -Math.PI * 0.85 + i / 39 * Math.PI * 1.7; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); g.lineTo(128 + Math.sin(a) * (i % 5 ? 104 : 92), 128 - Math.cos(a) * (i % 5 ? 104 : 92)); g.stroke(); } });
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.3 })); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.062, 0.1); scaleA.add(d); }
const needleA = grp(0, 0.064, 0.1, 0, scaleA); bx(0.004, 0.003, 0.065, '#d82020', 0, 0, -0.03, needleA);
const meA = makeHero(); apt.add(meA.outer); meA.elbows[0].add(burgerA, appleA, phoneA); burgerA.position.set(0, -0.3, 0.06); appleA.position.set(0, -0.3, 0.06); phoneA.position.set(0, -0.32, 0.03);
const fogA = makeSmoke(apt, 300); const _av = new THREE.Vector3();
function walkPath(pts, u) { const n = pts.length - 1, k = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(k)); const a = pts[i], b = pts[i + 1], f = k - i; return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), ry: Math.atan2(b[0] - a[0], b[1] - a[1]) }; }
function lightApt(mode, t) { const L = { desk: [0.75, 1.2, [1.3, 1.35, 1.45], 0, 0, 0, 2.5], scale: [0.5, 0.0, [0.45, 0.32, 0.6], 7, 0.8, 0, 2.5], couch: [0.3, 0.0, [0.05, 0.07, 0.18], 0, 3.2, 1, 1.2], morning: [1.3, 3.6, [2.3, 2.1, 1.7], 0, 0, 0, 5.0] }[mode];
  hemiA.intensity = L[0]; sunA.intensity = L[1]; sunA.color.set(mode === 'morning' ? '#ffe2b0' : '#e8eef8'); winA.material.color.setRGB(...L[2]); pendA.intensity = L[3]; floorLA.intensity = L[4]; fillA.intensity = L[6];
  const fl = 0.75 + 0.25 * Math.sin(t * 9.3) * Math.sin(t * 2.7); tvLA.intensity = 5 * L[5] * fl; tvM.color.setRGB(L[5] ? 0.5 * fl : 0.02, L[5] ? 0.8 * fl : 0.02, L[5] ? 1.5 * fl : 0.03); }
function updateApt(t, mode) { lightApt(mode, t); const P = meA, o = P.outer; o.rotation.set(0, 0, 0); o.rotation.order = 'XYZ'; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0);
  burgerA.visible = appleA.visible = phoneA.visible = false; JUNK.forEach(j => j.visible = mode !== 'morning'); REAL.visible = mode === 'morning'; lidA.rotation.x = 0; zzzA.visible = false;
  P.torso.scale.set(1, 1, 1); let cloud = 0, head = null;
  if (mode === 'desk') {   // day 5: typing in a fog, head in the hand, then slams the laptop
    o.position.set(-2.2, 0.55, -2.25); poseSit(P); const ty = Math.sin(t * 14) * 0.06 * (1 - smooth(DAY5 + 3.4, DAY5 + 3.8, t)); P.arms[0].rotation.x = -0.95 + ty; P.arms[1].rotation.x = -0.95 - ty; P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.5;
    const hh = fadeWin(t, DAY5 + 3.5, DAY5 + 5.1, 0.3); P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -1.3, hh); P.elbows[1].rotation.x = lerp(-0.5, -2.2, hh); P.root.rotation.x = 0.18 * hh;
    const slam = smooth(DAY5 + 5.1, DAY5 + 5.35, t), up = fadeWin(t, DAY5 + 5.3, DAY5 + 6.9, 0.25); lidA.rotation.x = 1.55 * slam - 0.25 * (1 - slam);
    P.arms[0].rotation.x = lerp(P.arms[0].rotation.x, -2.6, up); P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -2.6, up); P.arms[0].rotation.z = 0.5 * up; P.arms[1].rotation.z = -0.5 * up; P.root.rotation.x -= 0.12 * up;
    cloud = smooth(DAY5 - 0.3, DAY5 + 2.5, t); P.torso.scale.set(1.04, 1, 1.05); }
  else if (mode === 'scale') {   // eat fast behind the island, then walk round to the scale; the belly grows
    const belly = lerp(1.04, 1.13, smooth(WT + 1, WT + 7, t)); P.torso.scale.set(belly, 1, belly * 1.04);
    if (t < WT + 3.4) { o.position.set(2.0, 0.95, -2.0); const bite = Math.max(0, Math.sin((t - WT) * 6.5)); P.arms[0].rotation.x = -1.1 - 0.35 * bite; P.elbows[0].rotation.x = -1.4 - 0.6 * bite; burgerA.visible = true; P.arms[1].rotation.x = -0.7; P.elbows[1].rotation.x = -0.6; }
    else if (t < WT + 4.8) { const w = walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, -0.85], [3.3, -0.2]], (t - WT - 3.4) / 1.4); o.position.set(w.x, 0.95, w.z); o.rotation.y = w.ry; poseWalk(P, (t - WT) * 9, 1); }
    else { o.position.set(3.3, 1.01, -0.22); o.rotation.y = 0; P.root.rotation.x = 0.1 * smooth(WT + 5, WT + 5.6, t); P.arms[0].rotation.x = P.arms[1].rotation.x = -0.1; } }
  else if (mode === 'couch') {   // lying on the couch scrolling, TV on, fog of no motivation
    o.position.set(-1.6, 0.68, 1.15); o.rotation.set(-Math.PI / 2, 0, -0.35); poseIdle(P, t, 0); P.legs[0].rotation.x = 0.05; P.knees[1].rotation.x = 0.5; P.legs[1].rotation.x = -0.25;
    P.arms[0].rotation.x = -1.5; P.elbows[0].rotation.x = -1.0 + 0.04 * Math.sin(t * 3); phoneA.visible = true; P.torso.scale.set(1.13, 1, 1.17); cloud = 1; }
  else {   // morning: an apple at the island with real food, a stretch, then off for a run with the gym bag
    o.position.set(2.0, 0.95, -2.0); P.torso.scale.set(1.1, 1, 1.13);
    if (t < FIX + 2.8) { const bite = fadeWin(t, FIX + 0.6, FIX + 2.6, 0.4) * (0.6 + 0.4 * Math.sin(t * 4)); P.arms[0].rotation.x = -1.0 - 0.5 * bite; P.elbows[0].rotation.x = -1.3 - 0.8 * bite; appleA.visible = true; }
    else if (t < FIX + 4.0) { const up = fadeWin(t, FIX + 2.8, FIX + 4.0, 0.35); P.arms[0].rotation.set(-3.0 * up, 0, 0.3 * up); P.arms[1].rotation.set(-3.0 * up, 0, -0.3 * up); }
    else { const w = walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, 0.2], [3.5, 1.4]], (t - FIX - 4.0) / 2.6); o.position.set(w.x, 0.95 + 0.03 * Math.abs(Math.sin((t - FIX) * 7)), w.z); o.rotation.y = w.ry; poseWalk(P, (t - FIX) * 12, 1.25); } }
  // rat (couch beat): sniffs, presses the lever once, then takes a long nap next to it
  rat.position.set(0.05, 0.05, -0.02); rat.rotation.set(0, 0.9, 0);
  if (mode === 'couch') { const press = fadeWin(t, LAZY + 3.6, LAZY + 4.3, 0.2), nap = smooth(LAZY + 4.5, LAZY + 5.0, t); rat.position.x = lerp(0.05, 0.13, press + nap * 0); rat.rotation.x = -0.6 * press; leverA.position.y = 0.16 - 0.015 * press;
    rat.rotation.z = 1.25 * nap; rat.position.y = 0.05 + 0.02 * nap; zzzA.visible = nap > 0.05; zzzA.material.opacity = nap; zzzA.position.copy(ratCage.position).add(V3(0.08, 0.2 + 0.02 * Math.sin(t * 2), 0.0)); }
  // grey fog of no-energy above the head
  fogA.begin(); smokeMat.uniforms.uTint.value.set(mode === 'couch' ? '#6a6e7a' : '#5a5e6a'); scaleA.visible = mode === 'scale'; if (cloud > 0) { head = P.torso.localToWorld(_av.set(0, 1.63, 0)); for (let k = 0; k < 70; k++) { const a = k * 2.39 + t * 0.4, r = 0.06 + (k % 7) * 0.03; fogA.add(V3(head.x + Math.cos(a) * r, head.y + 0.3 + (k % 5) * 0.03 + 0.02 * Math.sin(t * 1.5 + k), head.z + Math.sin(a) * r), 0.12 + (k % 4) * 0.04, (mode === 'couch' ? 0.25 : 0.5) * cloud); } } fogA.end();
  // the scale needle: creeps up through the month
  needleA.rotation.y = -lerp(-0.4, 0.9, smooth(WT + 5.0, WT + 7.6, t)) * (mode === 'scale' && t > WT + 4.6 ? 1 : 0) - (mode === 'scale' && t > WT + 4.6 ? 0 : -0.0); }
function aptCamera(t, mode) { let pos, look, fov = 50;
  if (mode === 'desk') { const k = smooth(DAY5 - 0.5, GUT + 0.5, t); pos = V3(-1.3, 1.6, 0.7).lerp(V3(-1.75, 1.45, -0.05), k); look = V3(-2.2, 1.05, -2.15); }
  else if (mode === 'scale') { const k = smooth(WT + 4.4, WT + 6.0, t); pos = V3(2.4, 1.55, 0.9).lerp(V3(2.2, 1.45, 0.6), smooth(WT - 0.5, WT + 3.4, t)).lerp(V3(2.9, 1.35, 2.5), k); const hw = walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, -0.85], [3.3, -0.2]], clamp((t - WT - 3.4) / 1.4, 0, 1)); look = V3(2.0, 1.15, -2.0).lerp(V3(hw.x, 1.1, hw.z), smooth(WT + 3.2, WT + 3.8, t)).lerp(V3(3.3, 0.8, -0.2), k); }
  else if (mode === 'couch') { const k = smooth(LAZY + 3.1, LAZY + 4.1, t); pos = V3(0.3, 1.9, 3.0).lerp(V3(0.0, 1.75, 2.7), smooth(LAZY - 0.5, LAZY + 3.1, t)).lerp(V3(1.25, 1.02, 3.1), k); look = V3(-1.5, 0.75, 1.15).lerp(V3(0.9, 0.82, 2.4), k); fov = lerp(50, 44, k); }
  else { const w = t < FIX + 4.0 ? null : walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, 0.2], [3.5, 1.4]], (t - FIX - 4.0) / 2.6); pos = V3(0.9, 1.6, 1.6).lerp(V3(1.3, 1.55, 1.2), smooth(FIX, T_END, t)); look = V3(2.0, 1.2, -1.9);
    if (w) look.lerp(V3(w.x, 1.2, w.z), smooth(FIX + 4.0, FIX + 5.0, t)); }
  aptCam.position.copy(pos); aptCam.lookAt(look); aptCam.fov = fov; }
