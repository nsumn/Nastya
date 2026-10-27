// =================== HOME (meters): kitchen counter with the coffee machine, a table, the couch, the bed, a window with curtains.
// One scene, modes: kitchen (push the mug away), yawn (hour 12-24 at the table), couch (the peak, throbbing head; fade: calmer), bed (deep sleep), curtains (morning, no cup) ===================
const home = new THREE.Scene(); const hmCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hmHemi = new THREE.HemisphereLight(0xfff4e8, 0x6a5a50, 0.8); home.add(hmHemi);
const hmSun = new THREE.DirectionalLight(0xffe8c8, 2.2); hmSun.position.set(-3, 5, -8); hmSun.target.position.set(0, 0, 0); hmSun.castShadow = true; hmSun.shadow.mapSize.set(2048, 2048); hmSun.shadow.bias = -0.0004; Object.assign(hmSun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, far: 30 }); home.add(hmSun, hmSun.target);
const hmFill = new THREE.PointLight(0xffe0c0, 3, 10, 1.4); hmFill.position.set(1.5, 2.4, 2.5); home.add(hmFill);
const hmLamp = new THREE.PointLight(0xffb070, 0, 4, 1.5); hmLamp.position.set(-2.6, 1.3, -1.6); home.add(hmLamp);
{ const wood = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 40) { g.fillStyle = pick(['#c89870', '#c2926a', '#cc9c74', '#bc8c64']); g.fillRect(0, y, w, 39); g.fillStyle = 'rgba(90,55,30,0.25)'; g.fillRect(0, y + 38, w, 2); } }, [3, 3]);
  const fl = mesh(new THREE.PlaneGeometry(9, 8), M('#ffffff', { map: wood, roughness: 0.7 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.5); home.add(fl);
  bx(9, 3, 0.1, '#e8d8c0', 0, 1.5, -4.05, home); bx(0.1, 3, 8, '#d8e4d0', -4.5, 1.5, -0.5, home); bx(0.1, 3, 8, '#e8d8c0', 4.5, 1.5, -0.5, home); bx(9, 0.1, 8, '#f4f0ea', 0, 3.0, -0.5, home);
  // kitchen counter + coffee machine (right back)
  bx(3.0, 0.9, 0.65, '#f4f0e8', 2.6, 0.45, -3.6, home); bx(3.0, 0.05, 0.68, '#3a3a40', 2.6, 0.925, -3.6, home);
  bx(0.3, 0.42, 0.32, '#2a2a30', 2.2, 1.16, -3.62, home); bx(0.22, 0.06, 0.2, '#8a8a90', 2.2, 1.0, -3.52, home);
  // table + chair (middle)
  bx(1.2, 0.05, 0.8, '#8a5a3a', 1.2, 0.75, -1.3, home); for (const [dx, dz] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) bx(0.05, 0.75, 0.05, '#6a4a30', 1.2 + dx, 0.375, -1.3 + dz, home);
  bx(0.45, 0.05, 0.45, '#6a4a30', 1.2, 0.47, -0.65, home); bx(0.45, 0.55, 0.05, '#6a4a30', 1.2, 0.75, -0.43, home);
  // couch (left) + floor lamp
  bx(2.2, 0.42, 0.95, '#5a7ab0', -2.4, 0.21, -1.6, home); bx(2.2, 0.8, 0.25, '#4a6aa0', -2.4, 0.5, -2.1, home); for (const x of [-3.45, -1.35]) bx(0.22, 0.6, 0.95, '#4a6aa0', x, 0.4, -1.6, home);
  bx(0.04, 1.4, 0.04, '#2a2a30', -3.8, 0.7, -2.6, home); const shade = mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.26, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#3a2a10' })); shade.position.set(-3.8, 1.5, -2.6); home.add(shade);
  // bed (front left)
  bx(1.5, 0.35, 2.1, '#6a4a34', -2.6, 0.18, 1.6, home); bx(1.42, 0.2, 2.0, '#f2f0ec', -2.6, 0.45, 1.6, home); bx(1.5, 0.9, 0.1, '#6a4a34', -2.6, 0.6, 0.55, home); bx(0.6, 0.14, 0.36, '#ffffff', -2.6, 0.62, 0.85, home); }
const duvetH = bx(1.5, 0.12, 1.4, '#e8a83a', -2.6, 0.6, 1.95, home);
// window with sliding curtains (back wall, middle)
const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) }); { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.5), winM); wn.position.set(-0.3, 1.75, -3.99); home.add(wn); bx(1.95, 0.08, 0.12, '#f4f0ea', -0.3, 0.98, -3.95, home); }
const curtL = bx(0.95, 1.7, 0.04, '#c84a5a', -0.75, 1.75, -3.9, home), curtR = bx(0.95, 1.7, 0.04, '#c84a5a', 0.15, 1.75, -3.9, home);
// the mug (on the counter or in the hand), the clock on the wall
const mugH = new THREE.Group(); { const m = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 14), M('#f4f4f2')); m.position.y = 0.055; mugH.add(m); const c = mesh(new THREE.CircleGeometry(0.048, 14), M('#4a2a18')); c.rotation.x = -Math.PI / 2; c.position.y = 0.1; mugH.add(c);
  const hd = mesh(new THREE.TorusGeometry(0.032, 0.01, 6, 12), M('#f4f4f2')); hd.position.set(0.065, 0.06, 0); mugH.add(hd); } home.add(mugH);
const clkCv = document.createElement('canvas'); clkCv.width = 256; clkCv.height = 96; const clkTex = new THREE.CanvasTexture(clkCv); clkTex.colorSpace = THREE.SRGBColorSpace;
function drawClock(txt) { const g = clkCv.getContext('2d'); g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#7affa0'; g.font = 'bold 70px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(txt, 128, 74); clkTex.needsUpdate = true; }
{ const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: clkTex, color: new THREE.Color(1.5, 1.5, 1.5) })); ck.position.set(1.4, 2.2, -3.99); home.add(ck); }
const meC = makePerson(rnd, { top: '#8a8e98', bottom: '#2a3a5a', hair: '#3a2416', skin: '#d8a882', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.55 }); home.add(meC.outer); meC.elbows[0].add(mugH); const faceC = addFace(meC, '#d8a882', '#3a2416');
// throbbing headache rings around the head (red, expanding)
const RINGS = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.3, 0.25), transparent: true, depthWrite: false })); home.add(r); return r; });
const zzzT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); });
const zzzS = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzT, transparent: true, depthWrite: false })); zzzS.scale.setScalar(0.35); home.add(zzzS);
const _hp = new THREE.Vector3();
function lightHome(mode) { const L = { kitchen: [0.85, 2.2, [1.6, 1.5, 1.3], 0, 3], yawn: [0.8, 1.6, [1.3, 1.35, 1.4], 0, 3], couch: [0.55, 0.9, [0.9, 0.85, 0.95], 2.0, 2.4], fade: [0.75, 1.6, [1.4, 1.4, 1.3], 0, 3], bed: [0.4, 0, [0.18, 0.24, 0.55], 0, 1.6], curtains: [1.15, 3.4, [2.4, 2.2, 1.8], 0, 3.5] }[mode];
  hmHemi.intensity = L[0]; hmSun.intensity = L[1]; winM.color.setRGB(...L[2]); hmLamp.intensity = L[3]; hmFill.intensity = L[4]; }
function updateHome(t, mode) { lightHome(mode); const P = meC, o = P.outer; o.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); mugH.visible = false; RINGS.forEach(r => r.visible = false); zzzS.visible = false; faceC.setExpr('neutral', t);
  curtL.position.x = -0.75; curtR.position.x = 0.15; drawClock(mode === 'bed' ? '23:00' : mode === 'curtains' ? '7:00' : mode === 'kitchen' ? '7:30' : '15:00'); duvetH.position.set(-2.6, 0.6, 1.95); duvetH.scale.y = 0.12;
  if (mode === 'kitchen') {   // at the counter, the mug in hand, then set down and pushed away
    o.position.set(2.2, 0.95, -2.95); o.rotation.y = -0.5; const push = smooth(1.0, 2.6, t); mugH.visible = true; P.arms[0].rotation.x = lerp(-1.3, -1.2, push); P.elbows[0].rotation.x = lerp(-1.6, -0.2, push); P.arms[0].rotation.z = 0.2 * push; mugH.position.set(0, -0.3, 0.06); mugH.rotation.set(0, 0, 0); faceC.setExpr(push > 0.5 ? 'grumpy' : 'neutral', t); }
  else if (mode === 'yawn') {   // at the table, a big yawn, rubbing the temples
    o.position.set(1.2, 0.55, -0.7); o.rotation.y = Math.PI; poseSit(P); const y = fadeWin(t, QUIT + 1.2, QUIT + 2.8, 0.4), rub = fadeWin(t, QUIT + 3.6, QUIT + 6.8, 0.4);
    P.arms[1].rotation.x = lerp(-0.3, -2.4, Math.max(y, rub)); P.elbows[1].rotation.x = lerp(-0.6, -1.8, Math.max(y, rub)); P.arms[0].rotation.x = lerp(-0.3, -2.4, rub); P.elbows[0].rotation.x = lerp(-0.6, -1.8, rub); P.root.rotation.x = -0.15 * y + 0.12 * rub; faceC.setExpr(y > 0.3 ? 'yawn' : 'tired', t); }
  else if (mode === 'couch' || mode === 'fade') {   // slumped on the couch holding the head; the rings throb (calmer in "fade")
    o.position.set(-2.4, 0.62, -1.55); o.rotation.y = 0; poseSit(P); const hold = mode === 'couch' ? 1 : 1 - smooth(FADE + 1.5, FADE + 3.5, t);
    P.arms[0].rotation.set(-2.5 * hold, 0, 0.35 * hold); P.arms[1].rotation.set(-2.5 * hold, 0, -0.35 * hold); P.elbows[0].rotation.x = P.elbows[1].rotation.x = lerp(-0.6, -1.9, hold); P.root.rotation.x = 0.2 * hold;
    const head = P.torso.localToWorld(_hp.set(0, 1.63, 0)), rate = mode === 'couch' ? 1.6 : lerp(1.6, 0.5, smooth(FADE, FADE + 4, t)), amp = mode === 'couch' ? 1 : 1 - smooth(FADE + 1, FADE + 4.5, t);
    faceC.setExpr(mode === 'couch' ? 'pain' : hold > 0.5 ? 'tired' : 'neutral', t); RINGS.forEach((r, k) => { const u = ((t * rate) + k / 3) % 1; r.visible = amp > 0.02; r.position.copy(head); r.scale.setScalar(0.7 + 1.4 * u); r.material.opacity = amp * (1 - u); r.lookAt(hmCam.position); }); }
  else if (mode === 'bed') {   // asleep under the duvet
    o.position.set(-2.6, 0.75, 1.35); o.rotation.set(-Math.PI / 2, 0, 0); zzzS.visible = true; o.updateMatrixWorld(true); const hd = P.torso.localToWorld(V3(0, 1.63, 0)); duvetH.scale.y = 0.28; duvetH.position.set(-2.6, 0.76 + 0.008 * Math.sin(t * 1.4), hd.z + 1.12); zzzS.position.copy(hd).add(V3(0.2, 0.28 + 0.03 * Math.sin(t * 1.3), 0.02)); zzzS.scale.setScalar(0.18); faceC.setExpr('sleep', t); }
  else {   // curtains: opens them wide, stretches
    o.position.set(-0.3, 0.95, -3.35); o.rotation.y = Math.PI; const op = smooth(FREE + 0.4, FREE + 1.8, t); curtL.position.x = -0.75 - 0.75 * op; curtR.position.x = 0.15 + 0.75 * op;
    const st = smooth(FREE + 2.2, FREE + 3.2, t); P.arms[0].rotation.set(-1.4 - 1.4 * st, 0, lerp(0.9 * op, -0.45, st)); P.arms[1].rotation.set(-1.4 - 1.4 * st, 0, lerp(-0.9 * op, 0.45, st)); if (t > FREE + 2.2) o.rotation.y = Math.PI - Math.PI * smooth(FREE + 2.2, FREE + 3.4, t); faceC.setExpr('happy', t); } }
function headC(t, mode) { updateHome(t, mode); meC.outer.updateMatrixWorld(true); return meC.torso.localToWorld(V3(0, 1.63, 0)); }   // pose first, then frame the face
function homeCamera(t, mode) { let pos, look;
  if (mode === 'kitchen') { const h = headC(t, mode), k = ease(clamp(t / BRAIN, 0, 1)), d = lerp(1.45, 1.38, k); pos = h.clone().add(V3(Math.sin(-0.5) * d + 0.25, -0.02, Math.cos(-0.5) * d)); look = h.clone().add(V3(0, -0.22, 0)); }
  else if (mode === 'yawn') { const h = headC(t, mode), k = smooth(QUIT - 0.5, PEAK + 0.5, t); pos = h.clone().add(V3(0.18, 0.04, lerp(-1.05, -0.8, k))); look = h.clone().add(V3(0, -0.14, 0)); }
  else if (mode === 'couch' || mode === 'fade') { const k = smooth(PEAK - 0.5, SLEEP + 0.5, t); pos = V3(lerp(-1.6, -1.9, k), 1.4, lerp(0.9, 0.6, k)); look = V3(-2.4, 1.15, -1.55); }
  else if (mode === 'bed') { const h = headC(t, mode), k = smooth(SLEEP - 0.5, TWIST + 0.5, t); pos = h.clone().add(V3(lerp(0.5, 0.4, k), lerp(1.35, 1.2, k), lerp(1.1, 0.95, k))); look = h.clone().add(V3(0, -0.12, 0.3)); }
  else { const k = smooth(FREE - 0.5, T_END, t); pos = V3(lerp(0.9, 0.15, k), lerp(1.55, 1.6, k), lerp(-0.3, -1.95, k)); look = V3(-0.3, lerp(1.4, 1.5, k), lerp(-3.6, -3.35, k)); }
  hmCam.position.copy(pos); hmCam.lookAt(look); hmCam.fov = 50; }
