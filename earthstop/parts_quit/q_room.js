// =================== ROOM (meters): living room + kitchen corner; evening -> withdrawal nights -> morning ===================
const room = new THREE.Scene(); const rCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hemiR = new THREE.HemisphereLight(0xfff0e0, 0x403830, 0.6); room.add(hemiR);
const lampL = new THREE.PointLight(0xffb870, 14, 9, 1.6); lampL.position.set(-1.9, 1.9, -1.4); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); room.add(lampL);
const moonL = new THREE.DirectionalLight(0x7090d0, 0.0); moonL.position.set(0.8, 3, -6); room.add(moonL, moonL.target);
const sunR = new THREE.DirectionalLight(0xffe2b0, 0.0); sunR.position.set(1.0, 3.2, -6); sunR.castShadow = true; sunR.shadow.mapSize.set(1024, 1024); Object.assign(sunR.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); room.add(sunR, sunR.target);
const fillR = new THREE.PointLight(0xffd8b0, 5, 7, 1.6); fillR.position.set(1.8, 1.7, 1.9); room.add(fillR);
const fridgeL = new THREE.PointLight(0xdfefff, 0, 4, 1.5); fridgeL.position.set(2.2, 1.2, -1.2); room.add(fridgeL);
// floor, walls, window (night city / morning sky textures)
{ const wood = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#8a6448'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = pick(['#7e5a40', '#94694c', '#86603f']); g.fillRect(0, y, w, 30); } speckle(g, w, h, 900, ['#6e4e36', '#a07a58']); }, [3, 3]);
  const fl = mesh(new THREE.PlaneGeometry(7, 6), M('#ffffff', { map: wood, roughness: 0.7 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0.3, 0, -0.5); room.add(fl);
  bx(7, 3, 0.1, '#d9cdb8', 0.3, 1.5, -2.6, room); bx(0.1, 3, 6, '#cfc2ac', 3.3, 1.5, -0.5, room); bx(0.1, 3, 6, '#cfc2ac', -3.1, 1.5, -0.5, room); bx(7, 0.1, 6, '#e8e0d0', 0.3, 3.0, -0.5, room); }
const winNight = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#0c1430'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const bw = R(20, 50), bh = R(80, 300), x = R(0, w); g.fillStyle = '#141a2c'; g.fillRect(x, h - bh, bw, bh); for (let y = h - bh + 6; y < h; y += 12) for (let xx = x + 4; xx < x + bw - 4; xx += 9) if (rnd() < 0.35) { g.fillStyle = pick(['#ffd890', '#ffe8b0', '#9cc8ff']); g.fillRect(xx, y, 4, 5); } } g.fillStyle = '#f4f0e0'; g.beginPath(); g.arc(w * 0.8, h * 0.18, 16, 0, 7); g.fill(); });
const winDay = canvasTex(512, 384, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8cc0f0'); gr.addColorStop(1, '#ffe2b8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { const bw = R(20, 50), bh = R(80, 300), x = R(0, w); g.fillStyle = pick(['#9aa6b8', '#b0b8c4', '#8a94a6']); g.fillRect(x, h - bh, bw, bh); } });
const winMat = new THREE.MeshBasicMaterial({ map: winNight }); const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), winMat); win.position.set(1.0, 1.65, -2.54); room.add(win);
for (const [w, h, x, y] of [[2.36, 0.08, 1.0, 2.49], [2.36, 0.08, 1.0, 0.81], [0.08, 1.7, -0.14, 1.65], [0.08, 1.7, 2.14, 1.65], [0.05, 1.6, 1.0, 1.65]]) bx(w, h, 0.08, '#f2eee6', x, y, -2.5, room);
// sofa, coffee table, floor lamp, rug, fridge + counter, trash bin, wall clock
{ const sofaC = '#5a6f8a'; bx(2.4, 0.42, 0.95, sofaC, -1.6, 0.35, -1.85, room); bx(2.4, 0.75, 0.25, sofaC, -1.6, 0.75, -2.3, room); for (const sx of [-1, 1]) bx(0.22, 0.6, 0.95, sofaC, -1.6 + sx * 1.2, 0.45, -1.85, room);
  for (const sx of [-0.55, 0.55]) bx(1.05, 0.12, 0.8, '#6a809c', -1.6 + sx, 0.62, -1.8, room);
  bx(1.3, 0.06, 0.7, '#6e4a32', -1.5, 0.45, -0.75, room); for (const [x, z] of [[-2.1, -1.05], [-0.9, -1.05], [-2.1, -0.45], [-0.9, -0.45]]) bx(0.06, 0.42, 0.06, '#5a3a26', x, 0.21, z, room);
  bx(2.6, 0.01, 1.8, '#b04a3a', -1.5, 0.005, -0.9, room); bx(0.06, 1.8, 0.06, '#2e2e30', -1.9, 0.9, -1.4, room); const shade = mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.3, 12, 1, true), M('#f4e2c0', { side: THREE.DoubleSide, emissive: '#ffcc88', emissiveIntensity: 0.6 })); shade.position.set(-1.9, 1.9, -1.4); room.add(shade);
  bx(1.6, 0.9, 0.6, '#e8e4dc', 2.6, 0.45, -2.2, room); bx(1.6, 0.05, 0.62, '#4a4a4e', 2.6, 0.92, -2.2, room); }
const fridge = new THREE.Group(); fridge.position.set(2.85, 0, -1.25); room.add(fridge); bx(0.75, 1.85, 0.7, '#e8ecf0', 0, 0.925, 0, fridge, { roughness: 0.3 });
const fDoor = new THREE.Group(); fDoor.position.set(-0.375, 0, 0.36); fridge.add(fDoor); bx(0.75, 1.85, 0.05, '#f2f4f6', 0.375, 0.925, 0, fDoor, { roughness: 0.3 }); bx(0.03, 0.5, 0.04, '#9aa0a8', 0.66, 1.1, 0.04, fDoor);
fridge.rotation.y = -Math.PI / 2;
const bin = new THREE.Group(); bin.position.set(1.05, 0, 0.15); room.add(bin); { const b = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 14, 1, true), M('#5a5e66', { side: THREE.DoubleSide, metalness: 0.4 })); b.position.y = 0.25; bin.add(b); const bt = mesh(new THREE.CircleGeometry(0.17, 14), M('#3a3e44')); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.02; bin.add(bt); }
const clockCv = document.createElement('canvas'); clockCv.width = clockCv.height = 256; const clockTex = new THREE.CanvasTexture(clockCv); clockTex.colorSpace = THREE.SRGBColorSpace;
const clock = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), new THREE.MeshStandardMaterial({ map: clockTex, emissive: '#ffffff', emissiveMap: clockTex, emissiveIntensity: 0.15 })); clock.position.set(-1.6, 2.3, -2.54); room.add(clock);
function drawClock(h) { const g = clockCv.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = '#f8f4ea'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#2a2a2e'; g.stroke();
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = '#2a2a2e'; g.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 8, 8, 16); }
  const hand = (a, l, w) => { g.save(); g.translate(128, 128); g.rotate(a); g.fillStyle = '#1a1a1e'; g.fillRect(-w / 2, -l, w, l); g.restore(); }; hand((h % 12) / 12 * Math.PI * 2, 62, 10); hand((h % 1) * Math.PI * 2, 92, 6); clockTex.needsUpdate = true; }
// snacks piling up on the coffee table during the nights
const SNACKS = []; for (let i = 0; i < 26; i++) { const g = new THREE.Group(); const c = pick(['#e2b33a', '#d8442e', '#3a7ac8', '#f08a2a', '#6ab04a', '#c24a8a']);
  if (rnd() < 0.5) bx(R(0.16, 0.24), R(0.2, 0.28), 0.05, c, 0, 0, 0, g); else { const m = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), M(c)); g.add(m); }
  g.position.set(-1.5 + R(-0.55, 0.55), 0.55 + Math.floor(i / 9) * 0.07, -0.75 + R(-0.25, 0.25)); g.rotation.set(R(-0.5, 0.5), R(0, 6), R(-1.2, 1.2)); room.add(g); SNACKS.push({ g, at: R(NIGHT + 2.6, WEEKS) }); }
// pizza with steam in the morning
const pizza = new THREE.Group(); pizza.position.set(-1.3, 0.49, -0.7); room.add(pizza); { const p = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 8), M('#e8a848')); pizza.add(p); for (let i = 0; i < 7; i++) { const s = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 6), M('#c8302a')); s.position.set(R(-0.14, 0.14), 0.02, R(-0.14, 0.14)); pizza.add(s); } }
// you
const you = makePerson(rnd, { top: '#3f6fa8', bottom: '#2a2e38', hair: '#3a2a20', skin: '#e8b896', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.3 }); room.add(you.outer);
// the vape (pixelated on screen) + the crumpled pack
const vape = new THREE.Group(); { bx(0.026, 0.06, 0.016, '#30343a', 0, 0.03, 0, vape); bx(0.026, 0.06, 0.016, '#6a2a8a', 0, -0.03, 0, vape); } room.add(vape);
const vapeA = vape.children[0], vapeB = vape.children[1];
const pack = new THREE.Group(); bx(0.06, 0.08, 0.025, '#f2f2f2', 0, 0, 0, pack); bx(0.062, 0.025, 0.027, '#b02a2a', 0, 0.03, 0, pack); room.add(pack);
const steamR = makeSmoke(room, 200);
const _rv = new THREE.Vector3();
function lightRoom(t) { const night = smooth(NIGHT - 0.2, NIGHT + 0.4, t) * (1 - smooth(WEEKS + 0.5, MORNING + 0.6, t)); const day = smooth(WEEKS + 1.5, MORNING + 0.8, t);
  lampL.intensity = 14 * (1 - night) * (1 - day); fillR.intensity = 5 * (1 - night * 0.7); moonL.intensity = 2.8 * night; sunR.intensity = 3.2 * day; hemiR.intensity = lerp(0.6, 0.42, night) + 0.6 * day; hemiR.color.set(night > 0.5 ? 0x8090c0 : 0xfff0e0);
  winMat.map = day > 0.5 ? winDay : winNight; winMat.color.setScalar(day > 0.5 ? lerp(0.6, 1.4, day) : 1); room.background = null; }
function updateRoom(t) { lightRoom(t);
  // clock: 9 PM on quit night, 3 AM in the nights, 8 AM in the morning
  drawClock(t < NIGHT ? 21 + t * 0.02 : t < WEEKS ? 3 + (t - NIGHT) * 0.06 : t < MORNING ? lerp(4, 7, (t - WEEKS) / (MORNING - WEEKS)) : 8 + (t - MORNING) * 0.03);
  const o = you.outer, P = you; o.rotation.set(0, 0, 0); o.scale.setScalar(1); P.root.rotation.set(0, 0, 0);
  const hand = () => P.elbows[1].localToWorld(_rv.set(0, -0.27, 0.03));
  if (t < NIGHT - 0.45) { // QUIT: by the bin, snap the vape, drop it, toss the pack
    o.position.set(0.55, 0.95, -0.35); o.rotation.y = 0.55; poseIdle(P, t, 0);
    const lift = smooth(0.2, 1.0, t) * (1 - smooth(2.3, 2.8, t)); P.arms[1].rotation.set(-0.45 * lift, 0, -0.12 * lift); P.elbows[1].rotation.x = -1.35 * lift; P.arms[0].rotation.set(-0.4 * lift, 0, 0.15 * lift); P.elbows[0].rotation.x = -1.4 * lift;   // hands at chest height, well below the face
    const snap = smooth(1.5, 1.75, t), drop = clamp((t - 2.35) / 0.45, 0, 1); you.outer.updateMatrixWorld(true); const hp = hand().clone();
    vape.visible = t < 3.2; vape.position.copy(hp).lerp(V3(1.05, 0.15, 0.15), drop * drop); vape.rotation.set(0.3, 0.6, 0); vapeA.rotation.z = 0.9 * snap; vapeA.position.x = 0.012 * snap; vapeB.rotation.z = -0.9 * snap; vapeB.position.x = -0.012 * snap;
    const toss = clamp((t - 3.0) / 0.55, 0, 1); pack.visible = t > 1.0 && t < 3.8; pack.position.copy(P.elbows[0].localToWorld(_rv.set(0, -0.27, 0.03))).lerp(V3(1.05, 0.2, 0.15), toss).add(V3(0, 0.35 * Math.sin(Math.PI * toss), 0)); pack.rotation.set(toss * 4, toss * 3, 0); pack.scale.set(1, lerp(1, 0.55, smooth(1.2, 1.8, t)), 1); }
  else { vape.visible = false; pack.visible = false;
    if (t < NIGHT + 2.7) { // tossing on the sofa (switches while the camera pans past the window)
      o.position.set(-1.6, 0.85, -1.8); o.rotation.set(0, 0, Math.PI / 2 + 0.12 * Math.sin(t * 2.2)); o.rotation.order = 'ZYX'; poseIdle(P, t, 0); P.arms[1].rotation.x = -2.6 + 0.5 * Math.sin(t * 1.7); }
    else if (t < PEAK + 0.45) { // raiding the fridge (leaves while the camera turns away)
      o.position.set(2.1, 0.95, -0.9); o.rotation.y = Math.PI / 2 + 0.2; poseIdle(P, t, 1); P.arms[1].rotation.x = -1.3; P.elbows[1].rotation.x = -0.6; }
    else if (t < MORNING) { // the peak: on the sofa edge, head in hands; then calmer
      const calm = smooth(WEEKS + 0.5, MORNING - 0.5, t); o.position.set(-1.5, 0.95 + 0.05, -1.55); o.rotation.y = 0.15; poseSit(P); o.position.y = 0.6;
      P.arms[0].rotation.x = lerp(-2.4, -0.4, calm); P.arms[1].rotation.x = lerp(-2.4, -0.4, calm); P.elbows[0].rotation.x = lerp(-2.2, -0.6, calm); P.elbows[1].rotation.x = lerp(-2.2, -0.6, calm);
      P.root.rotation.x = lerp(0.35, 0, calm) + 0.04 * Math.sin(t * 9) * (1 - calm) * smooth(PEAK, PEAK + 0.5, t); }
    else { // morning: on the sofa, sunlight, reaching for a slice of pizza (taste + smell are back)
      o.position.set(-1.5, 0.6, -1.55); o.rotation.y = 0.15; poseSit(P); const r = smooth(MORNING + 0.6, MORNING + 1.6, t) * (1 - smooth(MORNING + 2.6, MORNING + 3.3, t));
      P.arms[1].rotation.x = lerp(-0.3, -1.5, r); P.elbows[1].rotation.x = lerp(-0.6, -0.2, r); P.root.rotation.x = 0.25 * r; } }
  fDoor.rotation.y = -1.9 * fadeWin(t, NIGHT + 2.3, PEAK + 0.2, 0.5); fridgeL.intensity = 6 * fadeWin(t, NIGHT + 2.3, PEAK + 0.2, 0.5);
  for (const S of SNACKS) S.g.visible = t > S.at && t < MORNING - 0.3;
  pizza.visible = t > MORNING - 0.5; steamR.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); if (pizza.visible) for (let k = 0; k < 40; k++) { const age = (t * 0.5 + k / 40) % 1; _rv.set(-1.3 + Math.sin(k * 2.1 + age * 5) * 0.08, 0.55 + age * 0.7, -0.7 + Math.cos(k * 1.3) * 0.08); steamR.add(_rv, 0.04 + age * 0.12, 0.35 * (1 - age) * smooth(0, 0.2, age)); } steamR.end(); }
function roomCamera(t) { let pos, look, fov = 50; const sh = (a) => V3(Math.sin(t * 31) * a, Math.sin(t * 27.3) * a, 0);
  if (t < NIGHT - 0.45) { pos = V3(1.7, 1.5, 1.75).lerp(V3(1.45, 1.3, 1.25), smooth(0, 3.5, t)); look = V3(0.65, 1.15, -0.2).lerp(V3(0.95, 0.6, 0.05), smooth(1.9, 3.3, t)); fov = 44; }
  else if (t < PEAK - 0.6) { const k = ease(clamp((t - (NIGHT + 1.6)) / 2.2, 0, 1)); pos = V3(0.2, 1.7, 1.6).lerp(V3(0.4, 1.6, 1.4), k); look = V3(-1.6, 0.8, -1.8).lerp(V3(2.4, 1.1, -1.1), k); fov = 52; }
  else if (t < MORNING) { const k = ease(clamp((t - PEAK + 0.6) / 3.6, 0, 1)); pos = V3(0.4, 1.6, 1.4).lerp(V3(-0.6, 1.3, 0.9), k); look = V3(2.4, 1.1, -1.1).lerp(V3(-1.5, 0.95, -1.6), ease(clamp((t - PEAK + 0.6) / 2.0, 0, 1))); fov = 50; pos.add(sh(0.02 * smooth(PEAK + 0.2, PEAK + 0.8, t) * (1 - smooth(WEEKS, WEEKS + 1.5, t)))); }
  else { const k = smooth(MORNING, LUNGS, t); pos = V3(-0.6, 1.3, 0.9).lerp(V3(-0.75, 1.15, 0.2), k); look = V3(-1.5, 0.95, -1.6).lerp(V3(-1.45, 1.0, -1.6), k); fov = 50; }
  rCam.position.copy(pos); rCam.lookAt(look); rCam.fov = fov; }
