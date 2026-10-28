// =================== THE CAST: you (gender-neutral: bangs, teal top), two friends, your little sibling, the teacher, classmates ===================
const hero = makeBlock({ skin: '#e9b98f', hair: '#4a3020', top: '#2fa89a', bottom: '#2a2e3a', shoe: '#f4f4f4', hairStyle: 'bangs' });
const fr1 = makeBlock({ skin: '#b98260', hair: '#1a1a1a', top: '#e8a83a', bottom: '#3a3a40', hairStyle: 'short' }), fr2 = makeBlock({ skin: '#f0c8a4', hair: '#c8903a', top: '#7a5ac8', bottom: '#2f3a5a', hairStyle: 'long' });
const sib = makeBlock({ skin: '#e9b98f', hair: '#4a3020', top: '#e84a5a', bottom: '#3a4a6a', hairStyle: 'bangs', h: 0.78 });
const teacher = makeBlock({ skin: '#d7a47e', hair: '#9a9a9a', top: '#5a6a4a', bottom: '#3a3a40', hairStyle: 'bald', glasses: '#2a2420', mustache: '#8a8a8a' });
const mates = [makeBlock({ skin: '#8d5a3c', hair: '#1a1a1a', top: '#4a8ae8', bottom: '#2a2e3a', hairStyle: 'short' }), makeBlock({ skin: '#f1d2b6', hair: '#d9b36a', top: '#5ac87a', bottom: '#2a2e3a', hairStyle: 'long' }), makeBlock({ skin: '#c98d62', hair: '#2a1d14', top: '#f28a3a', bottom: '#2a2e3a', hairStyle: 'bangs' })];
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); }
function seatAt(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
// sparkles around the head at the IQ jump (sprites)
const sparkT = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 9 : 30; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill(); });
function makeSparks(scene) { return Array.from({ length: 10 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkT, color: new THREE.Color(3, 2.6, 1.2), transparent: true, depthWrite: false })); scene.add(s); s.visible = false; return { s, a: i * 0.63, r: 0.22 + 0.08 * hash(i), y: 0.1 * (hash(i * 3) - 0.5) }; }); }
function sparkle(S, h, t, t0, dur = 1.6) { const k = (t - t0) / dur; S.forEach(({ s, a, r, y }) => { s.visible = k > 0 && k < 1; if (!s.visible) return; const rr = r * (0.6 + 0.8 * k); s.position.set(h.x + Math.cos(a + k * 3) * rr, h.y + y + 0.05 + 0.1 * k, h.z + Math.sin(a + k * 3) * rr * 0.6 + 0.1); s.scale.setScalar(0.09 * Math.sin(Math.PI * k)); }); }

// =================== THE SHOP DOOR (meters): you outside on the sidewalk, the camera inside behind a glass door marked PULL ===================
const shop = new THREE.Scene(); const spCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 200);
shop.add(new THREE.HemisphereLight(0xf4f8ff, 0x8a8070, 1.0)); { const s = new THREE.DirectionalLight(0xfff0d8, 2.2); s.position.set(3, 6, 6); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); shop.add(s); }
{ const skyT = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6aa8e8'); gr.addColorStop(1, '#d8ecfa'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshBasicMaterial({ map: skyT, color: new THREE.Color(1.1, 1.1, 1.1) })); sky.position.set(0, 10, 30); sky.rotation.y = Math.PI; shop.add(sky);
  const walk = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c8c4bc'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8a49c'; for (let i = 0; i <= w; i += 64) { g.fillRect(i, 0, 3, h); g.fillRect(0, i, w, 3); } }, [10, 6]);
  const sw = mesh(new THREE.PlaneGeometry(20, 12), new THREE.MeshStandardMaterial({ map: walk, roughness: 0.95 }), false, true); sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0, 6); shop.add(sw);
  const road = mesh(new THREE.PlaneGeometry(40, 10), M('#4a4a50', { roughness: 0.9 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.01, 17); shop.add(road);
  for (let i = 0; i < 6; i++) { const x = -8 + i * 3.2; bx(2.6, R(5, 9), 2, pick(['#d8b8a0', '#a8b8c8', '#e8d8b8', '#b8a090']), x, 3.5, 24, shop); }
  for (const x of [-3.5, 3.8]) { bx(0.2, 2.2, 0.2, '#6a4a30', x, 1.1, 9, shop); const c = mesh(new THREE.SphereGeometry(1.0, 10, 8), M('#4a8a3a', { flatShading: true })); c.position.set(x, 2.8, 9); shop.add(c); }
  // inside: floor + the storefront wall with the door opening (x -0.55..0.55, up to 2.2)
  const fl = mesh(new THREE.PlaneGeometry(10, 6), M('#e8e0d4', { roughness: 0.8 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.005, -3); shop.add(fl);
  bx(4.0, 3.2, 0.2, '#2a2e36', -2.55, 1.6, 0, shop); bx(4.0, 3.2, 0.2, '#2a2e36', 2.55, 1.6, 0, shop); bx(1.1, 1.0, 0.2, '#2a2e36', 0, 2.7, 0, shop);
  for (const x of [-0.55, 0.55]) bx(0.06, 2.2, 0.12, '#b8bcc4', x, 1.1, 0, shop); bx(1.16, 0.06, 0.12, '#b8bcc4', 0, 2.2, 0, shop); bx(1.16, 0.06, 0.12, '#b8bcc4', 0, 0.03, 0, shop);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 2.14), new THREE.MeshStandardMaterial({ color: '#c8e4f4', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false })); glass.position.set(0, 1.1, 0); shop.add(glass);
  bx(0.03, 0.4, 0.05, '#c8ccd4', 0.42, 1.05, -0.05, shop);   // the handle (on our side: you have to PULL)
  const pullT = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#e8303a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = 'bold 64px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('PULL', w / 2, 70); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: pullT, color: new THREE.Color(1.2, 1.2, 1.2) })); sign.position.set(0, 1.42, -0.015); sign.rotation.y = Math.PI; shop.add(sign);
  const sign2 = sign.clone(); sign2.position.z = 0.015; sign2.rotation.y = 0; shop.add(sign2); }
shop.add(hero.outer); const sparkShop = makeSparks(shop);
const smudge = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); smudge.position.set(0, 1.68, 0.012); shop.add(smudge);
// walks up from the street, pushes the glass (bonk), stumbles back; returns 'walk' | 'push' | 'bonk' | 'back'
function doorRun(t, t0, faceAfter) { const P = hero, o = P.outer; poseReset(P, t); const u = t - t0;
  const zW = lerp(3.2, 0.42, smooth(0, 1.4, u)), bonk = Math.exp(-Math.pow((u - 1.75) / 0.12, 2)), back = smooth(1.8, 2.3, u);
  o.position.set(0.05, 0.95, u < 1.6 ? zW : 0.42 + 0.03 * bonk + 0.25 * back); o.rotation.y = Math.PI; if (u < 1.4) poseWalk(P, u * 10, 1);
  if (u >= 1.3 && u < 1.85) { const k = smooth(1.3, 1.6, u); P.arms[0].rotation.set(-1.4 * k, 0, 0.1); P.arms[1].rotation.set(-1.4 * k, 0, -0.1); P.elbows.forEach(e => e.rotation.x = -0.3 * k); }
  P.root.rotation.x = -0.25 * bonk + 0.12 * back * (1 - smooth(2.3, 2.8, u)); smudge.material.opacity = 0.25 * smooth(1.7, 1.8, u);
  return u < 1.4 ? 'walk' : u < 1.75 ? 'push' : u < 2.0 ? 'bonk' : 'back'; }
function updateShop(t, mode) { if (hero.outer.parent !== shop) shop.add(hero.outer); pencil.visible = false; const P = hero; sparkShop.forEach(p => p.s.visible = false);
  if (mode === 'open') { const st = doorRun(t, 0.2); P.face(st === 'bonk' ? 'surprised' : t < POP ? 'dumb' : 'smirk', t);
    if (t > POP) { P.root.rotation.x = 0; P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.arms[0].rotation.set(-0.3, 0, 0.6); P.elbows[0].rotation.x = -1.9; }   // arms crossed-ish, chin up
    sparkle(sparkShop, headOf(P), t, POP, 1.4); }
  else { const st = doorRun(t, DOOR + 0.6); P.face(t < DOOR + 2.3 ? 'smirk' : t < DOOR + 3.2 ? 'dumb' : t < DOOR + 4.4 ? 'sad' : 'laugh', t);
    if (t > DOOR + 3.2) { P.arms[1].rotation.set(-2.5, 0, -0.2); P.elbows[1].rotation.x = -1.3; } }   // rubs the forehead
}
function shopCamera(t, mode) { updateShop(t, mode); const h = headOf(hero); let F;
  if (mode === 'open') F = framing(V3(0.05, h.y, Math.max(h.z, 0.4)), V3(0.12, -0.02, -1), lerp(3.0, 2.3, smooth(0, POP + 0.6, t)), 0.6);
  else F = framing(V3(0.05, h.y, Math.max(h.z, 0.4)), V3(-0.12, -0.02, -1), lerp(3.2, 2.4, smooth(DOOR, DOOR + 2.4, t)), 0.58);
  applyF(spCam, F); }

// =================== THE BELL CURVE (meters, 1 SD = 1.2 m): a crowd shaped like the curve, markers 100…228, you alone at 500 (32 m out) ===================
const curve = new THREE.Scene(); curve.background = new THREE.Color('#141a2e'); curve.fog = new THREE.Fog(0x141a2e, 18, 45); const cvCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 200);
curve.add(new THREE.HemisphereLight(0xc8d4ff, 0x2a2440, 1.1)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(2, 6, 8); curve.add(k); }
const SD = 1.2, iqX = iq => (iq - 100) / 15 * SD;
{ const gr = mesh(new THREE.PlaneGeometry(90, 30), M('#232a44', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; gr.position.set(15, 0, 0); curve.add(gr);
  // the glowing curve line above the crowd
  const pts = []; for (let i = 0; i <= 200; i++) { const x = -6 + i * 0.25, z = x / SD; pts.push(V3(x, 0.12 + 3.2 * Math.exp(-z * z / 2), -1.4)); }
  curve.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.03, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.6, 0.5) })));
  // markers
  for (const iq of [100, 130, 160, 228, 500]) { const x = iqX(iq), t = canvasTex(256, 128, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.fillStyle = iq === 500 ? '#ffd060' : '#ffffff'; g.font = 'bold 84px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(String(iq), w / 2, 92); });
    bx(0.03, 1.0, 0.03, '#8a90a8', x, 0.5, -1.6, curve); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); s.position.set(x, 1.25, -1.6); curve.add(s); } }
// the crowd: simple blocky people as two instanced meshes (body + head), density follows the curve
const CROWD = []; for (let c = -48; c <= 48; c++) { const x = c * 0.12, z = x / SD, n = Math.round(14 * Math.exp(-z * z / 2)); for (let k = 0; k < n; k++) CROWD.push([x + R(-0.04, 0.04), -1.0 + k * 0.32 + R(-0.05, 0.05)]); }
const crowdBody = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.9 }), CROWD.length), crowdHead = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.9 }), CROWD.length);
{ const o = new THREE.Object3D(), col = new THREE.Color(); CROWD.forEach(([x, z], i) => { const s = 0.9 + 0.2 * hash(i);
    o.position.set(x, 0.42 * s, z); o.scale.set(0.11 * s, 0.84 * s, 0.08 * s); o.rotation.set(0, 0, 0); o.updateMatrix(); crowdBody.setMatrixAt(i, o.matrix); crowdBody.setColorAt(i, col.set(pick(['#e24b3b', '#2f5d8a', '#e0b040', '#4b8b5a', '#7a4a8c', '#f08a4b', '#5aa0c8', '#d46a8a'])));
    o.position.set(x, 0.9 * s, z); o.scale.set(0.085 * s, 0.09 * s, 0.08 * s); o.updateMatrix(); crowdHead.setMatrixAt(i, o.matrix); crowdHead.setColorAt(i, col.set(pick(['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c', '#6b4329']))); });
  curve.add(crowdBody, crowdHead); }
const spot = new THREE.SpotLight(0xfff0d0, 0, 8, 0.4, 0.6); spot.position.set(iqX(500), 5, 1); spot.target.position.set(iqX(500), 0, 0); curve.add(spot, spot.target);
function updateCurve(t) { if (hero.outer.parent !== curve) curve.add(hero.outer); poseReset(hero, t); hero.outer.position.set(iqX(500), 0.95, 0); hero.outer.rotation.y = -0.3; spot.intensity = 30 * smooth(CURVE + 4, CURVE + 6, t);
  hero.arms[1].rotation.set(-0.2, 0, -0.5 * Math.max(0, Math.sin((t - CURVE - 6) * 6)) * smooth(CURVE + 5.8, CURVE + 6.2, t)); hero.face(t < CURVE + 6.5 ? 'smirk' : 'sad', t); }
function curveCamera(t) { updateCurve(t); const k = ease(clamp((t - CURVE - 0.3) / 6.2, 0, 1)), x = lerp(0, iqX(500), k), h = headOf(hero);
  const far = framing(V3(x, 1.1, -1.0), V3(0.0, 0.35, 1), lerp(9.5, 4.5, k), 0.5), near = framing(h, V3(0.25, 0.08, 1), 2.4, 0.6);
  applyF(cvCam, blendF(far, near, smooth(CURVE + 5.6, CURVE + 7.4, t))); }

// =================== THE CLASSROOM: the test, done in three seconds ===================
const cls = new THREE.Scene(); const clCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 100);
cls.add(new THREE.HemisphereLight(0xfff4e8, 0x6a5a50, 1.0)); { const k = new THREE.DirectionalLight(0xffe8d0, 1.8); k.position.set(-3, 5, 4); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); cls.add(k); }
{ const fl = mesh(new THREE.PlaneGeometry(10, 10), M('#c8b090', { roughness: 0.9 }), false, true); fl.rotation.x = -Math.PI / 2; cls.add(fl); bx(10, 3, 0.1, '#e8e0c8', 0, 1.5, -3.5, cls);
  const boardT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f4ec'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('IQ TEST', 30, 80); g.font = '34px Inter, sans-serif'; g.fillText('Time: 60 minutes', 30, 150); g.fillText('No phones!', 30, 205); });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map: boardT, roughness: 0.9 })); bd.position.set(0, 1.7, -3.44); cls.add(bd);
  for (const [x, z] of [[0, 0], [-1.3, 1.2], [1.3, 1.2], [0, 1.2]]) { bx(0.7, 0.04, 0.5, '#c89a6a', x, 0.72, z + 0.32, cls); bx(0.6, 0.7, 0.04, '#8a8a90', x, 0.35, z + 0.55, cls); } }
const paper = new THREE.Group(); { bx(0.21, 0.004, 0.28, '#ffffff', 0, 0, 0, paper); const doneT = canvasTex(128, 170, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8c8d0'; for (let y = 30; y < h; y += 14) g.fillRect(10, y, w - 20, 3); g.fillStyle = '#e8303a'; g.font = 'bold 36px Inter, sans-serif'; g.fillText('100%', 18, 120); });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshBasicMaterial({ map: doneT })); pm.rotation.x = -Math.PI / 2; pm.position.y = 0.003; paper.add(pm); } cls.add(paper);
const pencil = new THREE.Group(); { bx(0.012, 0.16, 0.012, '#f2c040', 0, 0, 0, pencil); bx(0.012, 0.02, 0.012, '#e8a0a0', 0, 0.09, 0, pencil); } hero.elbows[1].add(pencil); pencil.position.set(0, -0.3, 0.04);
cls.add(teacher.outer); mates.forEach(m => cls.add(m.outer));
function updateClass(t) { if (hero.outer.parent !== cls) cls.add(hero.outer); pencil.visible = true; const P = hero; poseReset(P, t); seatAt(P, 0, 0.47, 0.6, Math.PI);
  const done = t > TEST + 1.4; P.arms[1].rotation.set(done ? -2.6 : -0.9, 0, 0.1); P.elbows[1].rotation.x = done ? -0.2 : -0.8; pencil.rotation.z = t * 14; pencil.visible = !done || t > TEST + 2.2;
  paper.position.copy(done ? V3(0.12, 1.98, 0.75) : V3(0, 0.745, 0.32)); paper.rotation.set(done ? Math.PI / 2 - 0.2 : 0, 0, 0); if (done) { P.outer.updateMatrixWorld(true); }
  P.face(t < TEST + 0.6 ? 'reading' : t < TEST + 1.4 ? 'squint' : 'smirk', t);
  poseReset(teacher, t); teacher.outer.position.set(1.0, 0.95, -0.9); teacher.outer.rotation.y = -2.5; teacher.face(t < TEST + 1.6 ? 'neutral' : 'surprised', t + 0.5);
  mates.forEach((m, i) => { poseReset(m, t); seatAt(m, [-1.3, 1.3, 0][i], 0.47, 1.8, Math.PI); m.arms[1].rotation.set(-0.9, 0, 0.1); m.elbows[1].rotation.x = -0.8; m.face(t < TEST + 1.8 ? (i % 2 ? 'squint' : 'worried') : 'surprised', t + i); }); }
function classCamera(t) { updateClass(t); const h = headOf(hero); applyF(clCam, blendF(framing(h, V3(0.2, 0.1, -1), 2.2, 0.62), framing(h, V3(-0.35, 0.15, -1), 3.0, 0.6), smooth(TEST + 1.6, TEST + 4, t))); }

// =================== THE LIBRARY: books fly into your hands and back; then the reading table, and the brain bulb that pops ===================
const lib = new THREE.Scene(); const lbCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 100); lib.fog = new THREE.Fog(0x3a2a20, 8, 20); lib.background = new THREE.Color('#3a2a20');
const lbHemi = new THREE.HemisphereLight(0xffe8c8, 0x4a3a2a, 0.9); lib.add(lbHemi); { const k = new THREE.PointLight(0xffd8a0, 4, 12, 1.2); k.position.set(0, 3, 2); lib.add(k); }
const spineT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#4a3020'; g.fillRect(0, 0, w, h); for (let row = 0; row < 4; row++) { let x = 4; while (x < w - 10) { const bw = R(10, 22), bh = R(40, 58); g.fillStyle = pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a', '#6a3a7a', '#d8c8a8', '#1a3a5a']); g.fillRect(x, row * 64 + 62 - bh, bw, bh); x += bw + 2; } g.fillStyle = '#6a4a30'; g.fillRect(0, row * 64 + 60, w, 6); } });
{ const fl = mesh(new THREE.PlaneGeometry(14, 14), M('#7a5034', { roughness: 0.85 }), false, true); fl.rotation.x = -Math.PI / 2; lib.add(fl);
  for (const [x, z, ry] of [[0, -2.2, 0], [-2.6, -0.6, Math.PI / 2], [2.6, -0.6, -Math.PI / 2], [-1.6, -2.2, 0], [1.6, -2.2, 0]]) { const s = mesh(BOX, [M('#5a3a24'), M('#5a3a24'), M('#5a3a24'), M('#5a3a24'), new THREE.MeshStandardMaterial({ map: spineT, roughness: 0.9 }), M('#5a3a24')]); s.scale.set(1.6, 2.6, 0.4); s.position.set(x, 1.3, z); s.rotation.y = ry; lib.add(s); }
  bx(1.4, 0.05, 0.8, '#8a5a3a', 0, 0.75, 1.0, lib); for (const [dx, dz] of [[-0.6, -0.32], [0.6, -0.32], [-0.6, 0.32], [0.6, 0.32]]) bx(0.05, 0.75, 0.05, '#6a4a30', dx, 0.375, 1.0 + dz, lib); bx(0.45, 0.05, 0.45, '#6a4a30', 0, 0.47, 0.45, lib); }
const BOOKS = Array.from({ length: 14 }, (_, i) => { const b = mesh(BOX, M(pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a', '#6a3a7a']), { roughness: 0.8 })); b.scale.set(0.16, 0.22, 0.04); lib.add(b); return { b, x0: R(-0.7, 0.7), y0: R(0.4, 2.2) }; });
const readPile = Array.from({ length: 10 }, (_, i) => { const b = bx(0.22, 0.04, 0.16, pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a']), 0.45, 0.795 + i * 0.042, 1.05, lib); b.rotation.y = R(-0.3, 0.3); return b; });
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), transparent: true })); lib.add(bulb); const bulbBase = bx(0.05, 0.05, 0.05, '#a8a8b0', 0, 0, 0, lib); const bulbL = new THREE.PointLight(0xfff0c0, 0, 4, 1.4); lib.add(bulbL);
const shards = Array.from({ length: 16 }, (_, i) => { const s = bx(0.025, 0.004, 0.02, '#e8f4ff', 0, 0, 0, lib); return { s, d: V3(R(-1, 1), R(0.2, 1.2), R(-1, 1)).normalize() }; });
lib.add(hero.outer); const sparkLib = makeSparks(lib);
function updateLib(t, mode) { if (hero.outer.parent !== lib) lib.add(hero.outer); const P = hero; poseReset(P, t); pencil.visible = false; BOOKS.forEach(B => B.b.visible = false); bulb.visible = bulbBase.visible = false; bulbL.intensity = 0; shards.forEach(S => S.s.visible = false); sparkLib.forEach(p => p.s.visible = false);
  if (mode === 'books') { P.outer.position.set(0, 0.95, -1.2); P.outer.rotation.y = 0; P.arms[0].rotation.set(-1.0, 0, -0.2); P.arms[1].rotation.set(-1.0, 0, 0.2); P.elbows.forEach(e => e.rotation.x = -0.6); P.face(t < LIB + 2 ? 'reading' : 'smirk', t);
    readPile.forEach((b, i) => b.visible = i < Math.floor((t - LIB) * 1.2)); P.outer.updateMatrixWorld(true); const hand = P.head.getWorldPosition(V3(0, 0, 0)).add(V3(0, -0.45, 0.32));
    BOOKS.forEach((B, i) => { const ph = (t - LIB) * 1.8 - i * 0.55; if (ph < 0 || ph > 1) return; B.b.visible = true; const from = V3(B.x0, B.y0, -1.95), to = V3(0.45, 0.8 + 0.4 * (i % 3), 1.05), mid = ph < 0.5 ? from.clone().lerp(hand, ph * 2) : hand.clone().lerp(to, (ph - 0.5) * 2);
      mid.y += Math.sin(Math.PI * ph * 2) * 0.25; B.b.position.copy(mid); B.b.rotation.set(ph * 6, ph * 4, 0); }); }
  else {   // bulb: at the table, a bulb above your head glows brighter and brighter, then pops
    readPile.forEach(b => b.visible = true); seatAt(P, 0, 0.47, 0.45, 0); P.arms.forEach(a => a.rotation.set(-0.9, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.7); const k = smooth(BULB + 0.5, BULB + 5.2, t), popped = t > BULB + 5.4;
    P.outer.updateMatrixWorld(true); const hd = P.head.getWorldPosition(V3(0, 0, 0)), bp = hd.clone().add(V3(0, 0.42, 0)); bulb.visible = bulbBase.visible = !popped; bulb.position.copy(bp); bulbBase.position.copy(bp).add(V3(0, -0.11, 0));
    bulb.material.color.setScalar(1 + 6 * k); bulb.scale.setScalar(1 + 0.25 * k + 0.05 * Math.sin(t * 30) * k); bulbL.position.copy(bp); bulbL.intensity = popped ? Math.max(0, 6 * (1 - (t - BULB - 5.4) / 0.4)) : 0.5 + 5 * k;
    if (popped) shards.forEach(S => { const u = t - BULB - 5.4; S.s.visible = u < 1.2; S.s.position.copy(bp).addScaledVector(S.d, u * 1.2).add(V3(0, -2 * u * u, 0)); S.s.rotation.set(u * 9, u * 7, 0); });
    P.face(t < BULB + 3 ? 'smirk' : t < BULB + 5.4 ? 'surprised' : t < BULB + 6.4 ? 'dumb' : 'laugh', t); }
  lbHemi.intensity = mode === 'bulb' ? 0.6 : 0.9; }
function libCamera(t, mode) { updateLib(t, mode); const h = headOf(hero);
  if (mode === 'books') applyF(lbCam, blendF(framing(h, V3(0.15, 0.05, 1), 2.6, 0.62), framing(h, V3(0.45, 0.2, 1), 3.4, 0.6), smooth(LIB + 1, LIB + 7, t)));
  else applyF(lbCam, framing(h.clone().add(V3(0, 0.2, 0)), V3(0.2, 0.08, 1), lerp(2.7, 2.3, smooth(BULB, TALK, t)), 0.5)); }

// =================== THE LIVING ROOM (shared family set): small talk with two friends; the kitchen argument with your little sibling ===================
room.add(fr1.outer, fr2.outer, sib.outer); const sparkRoom = makeSparks(room);
function updateTalk(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false; lightRoom('day'); for (const P of [fr1, fr2, sib]) P.outer.visible = false; sparkRoom.forEach(p => p.s.visible = false);
  const P = hero; poseReset(P, t);
  if (mode === 'talk') { P.outer.position.set(-0.2, 0.95, -0.9); P.outer.rotation.y = 0.3; P.face(t < TALK + 2.4 ? 'sleepy' : t < TALK + 4.2 ? 'smirk' : 'sleepy', t);
    poseReset(fr1, t); poseReset(fr2, t); fr1.outer.position.set(0.75, 0.95, -0.6); fr1.outer.rotation.y = -1.2; fr2.outer.position.set(0.55, 0.95, 0.15); fr2.outer.rotation.y = -1.9;
    fr1.arms[1].rotation.set(-0.6 - 0.3 * Math.max(0, Math.sin(t * 4)), 0, -0.2); fr1.face(t < TALK + 3.0 ? 'happy' : 'surprised', t); fr2.face(t < TALK + 3.0 ? 'laugh' : 'surprised', t + 1.1);
    if (t > TALK + 5.0) { P.arms[1].rotation.set(-2.3, 0, -0.2); P.elbows[1].rotation.x = -1.4; } }   // a yawn behind the hand
  else { P.outer.position.set(2.2, 0.95, -0.9); P.outer.rotation.y = 0.9; P.face(t < ARGUE + 3.4 ? 'neutral' : 'smirk', t);
    poseReset(sib, t); sib.outer.position.set(2.95, 0.95, -0.35); sib.outer.rotation.y = -2.1; sib.arms.forEach((a, i) => a.rotation.set(-0.4 - 0.4 * Math.max(0, Math.sin(t * 7 + i)) * (t < ARGUE + 3.4 ? 1 : 0), 0, i ? -0.3 : 0.3));
    sib.face(t < ARGUE + 3.4 ? 'angry' : t < ARGUE + 4.6 ? 'surprised' : 'sad', t + 0.4); if (t > ARGUE + 3.4) { P.arms[0].rotation.set(-0.5, 0, 0.6); P.elbows[0].rotation.x = -1.9; } } }
function talkCamera(t, mode) { updateTalk(t, mode); const h = headOf(hero), o = headOf(mode === 'talk' ? fr1 : sib), mid = h.clone().lerp(o, 0.5);
  applyF(rmCam, blendF(framing(mid, V3(0.15, 0.08, 1), 3.2, 0.62), framing(h, V3(0.35, 0.06, 1), 2.4, 0.62), smooth((mode === 'talk' ? TALK : ARGUE) + 3.2, (mode === 'talk' ? TALK : ARGUE) + 5.0, t))); }
