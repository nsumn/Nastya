// =================== 911 CALL CENTER (meters): rows of dispatch desks, line lights blinking, the queue on the wall ===================
const ctr = new THREE.Scene(); ctr.background = new THREE.Color('#10141e');
const cCam = new THREE.PerspectiveCamera(60, W / H, 0.05, 200);
const cHemi = new THREE.HemisphereLight(0xc8d4f0, 0x2a2a34, 0.9); ctr.add(cHemi);
const cKey = new THREE.DirectionalLight(0xe8eeff, 1.4); cKey.position.set(3, 8, 6); cKey.castShadow = true; cKey.shadow.mapSize.set(2048, 2048);
Object.assign(cKey.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 }); cKey.shadow.bias = -0.0005; cKey.shadow.normalBias = 0.02; ctr.add(cKey);
const alarm = new THREE.PointLight(0xff3020, 0, 18, 1.2); alarm.position.set(0, 2.9, -4.2); ctr.add(alarm);
const ctrLines = [];      // line-button materials, blinking with their own phase
const wallCanvas = document.createElement('canvas'); wallCanvas.width = 1024; wallCanvas.height = 512; const wallG = wallCanvas.getContext('2d');
const wallTex = new THREE.CanvasTexture(wallCanvas); wallTex.colorSpace = THREE.SRGBColorSpace; wallTex.anisotropy = 8;
{
  const RW = 14, RD = 12, RH = 3.3;
  const carpet = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a4152'; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, ['#434b5e', '#323848', '#3e4658'], 2); }, [6, 6]);
  const fl = mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }), false, true); fl.rotation.x = -Math.PI / 2; ctr.add(fl);
  const wm = M('#9aa3b8', { roughness: 0.95 });
  for (const [w, x, z, ry] of [[RW, 0, -RD / 2, 0], [RW, 0, RD / 2, Math.PI], [RD, -RW / 2, 0, Math.PI / 2], [RD, RW / 2, 0, -Math.PI / 2]]) { const m = mesh(new THREE.PlaneGeometry(w, RH), wm, false, true); m.position.set(x, RH / 2, z); m.rotation.y = ry; ctr.add(m); }
  const ce = mesh(new THREE.PlaneGeometry(RW, RD), M('#c8ccd6'), false, false); ce.rotation.x = Math.PI / 2; ce.position.y = RH; ctr.add(ce);
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const p = mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.45, 1.5) }), false, false); p.rotation.x = Math.PI / 2; p.position.set(i * 2.6, RH - 0.01, j * 2.3); ctr.add(p); }
  // the big wall display
  bx(7.2, 2.0, 0.12, '#15171c', 0, 1.95, -RD / 2 + 0.07, ctr);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 1.85), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false })); scr.position.set(0, 1.95, -RD / 2 + 0.14); ctr.add(scr);
  // desks in 3 rows x 4, operators with headsets
  const monTex = [0, 1, 2].map(k => canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#0d2238'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f4a78'; g.fillRect(0, 0, w, 18);
    for (let y = 28; y < h - 8; y += 14) { g.fillStyle = pick(['#6fa8dc', '#9fc5e8', '#e06666', '#ffd966', '#93c47d']); g.fillRect(10, y, R(60, 200), 7); }
    if (k === 1) { g.strokeStyle = '#6fa8dc'; g.lineWidth = 2; g.strokeRect(150, 40, 90, 100); for (let i = 0; i < 6; i++) { g.fillStyle = '#e06666'; g.beginPath(); g.arc(R(160, 230), R(50, 130), 4, 0, 7); g.fill(); } } }));
  const monMats = monTex.map(tx => new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }));
  const lineMats = [0, 1, 2, 3, 4, 5].map(i => { const m = new THREE.MeshStandardMaterial({ color: '#301010', emissive: '#ff2a1a', emissiveIntensity: 0 }); ctrLines.push({ m, ph: i / 6 }); return m; });
  const skins = ['#f1d2b6', '#d7a47e', '#b98260', '#8d5a3c', '#e9c4a2', '#6b4329'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = (c - 1.5) * 3.0, z = -2.2 + r * 2.7; const d = grp(x, 0, z, 0, ctr);
    bx(2.4, 0.05, 0.9, '#c8b8a0', 0, 0.75, 0, d); bx(2.4, 0.72, 0.04, '#5a606e', 0, 0.37, -0.43, d); for (const sx of [-1.15, 1.15]) bx(0.05, 0.72, 0.85, '#5a606e', sx, 0.37, 0, d);
    bx(2.4, 0.5, 0.04, '#6a7488', 0, 1.0, -0.47, d);   // privacy panel
    for (const [mx, ry] of [[-0.55, 0.3], [0, 0], [0.55, -0.3]]) { const mg = grp(mx, 0.78, -0.25, ry, d); bx(0.5, 0.32, 0.03, '#1a1c22', 0, 0.3, 0, mg); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.28), pick(monMats)); s.position.set(0, 0.3, 0.017); mg.add(s); bx(0.05, 0.14, 0.05, '#2a2c32', 0, 0.07, -0.02, mg); }
    const con = grp(0.75, 0.78, 0.05, -0.2, d); bx(0.36, 0.04, 0.22, '#25272c', 0, 0.02, 0, con);
    for (let k = 0; k < 8; k++) { const b = mesh(BOX, pick(lineMats), false, false); b.scale.set(0.03, 0.012, 0.025); b.position.set(-0.13 + (k % 4) * 0.045, 0.045, -0.06 + Math.floor(k / 4) * 0.045); con.add(b); }
    bx(0.45, 0.02, 0.16, '#2a2c32', -0.1, 0.785, 0.15, d);  // keyboard
    // chair + operator
    const chair = grp(0, 0, 0.75, Math.PI, d); bx(0.5, 0.08, 0.5, '#2a2e3a', 0, 0.48, 0, chair); bx(0.5, 0.6, 0.08, '#2a2e3a', 0, 0.85, 0.24, chair); bx(0.06, 0.44, 0.06, '#555', 0, 0.22, 0, chair);
    const op = makePerson(rnd, { skin: skins[(r * 4 + c) % 6] }); poseSit(op); op.arms[0].rotation.x = -0.9; op.arms[1].rotation.x = -0.9; op.elbows[0].rotation.x = -0.7; op.elbows[1].rotation.x = -0.7;
    op.outer.position.set(0, 0.95 + 0.0, 0.62); op.outer.rotation.y = Math.PI; d.add(op.outer);
    const hs = mesh(new THREE.TorusGeometry(0.125, 0.012, 6, 16, Math.PI), M('#1a1a1e')); hs.position.set(0, 1.64 * op.h, 0); hs.rotation.y = Math.PI / 2; op.root.add(hs);
    const mic = mesh(new THREE.BoxGeometry(0.01, 0.01, 0.12), M('#1a1a1e')); mic.position.set(0.11, 1.57 * op.h, 0.07); mic.rotation.y = 0.5; op.root.add(mic);
    op.root.position.y = -0.45;
  }
}
function drawWall(t) {
  const g = wallG, w = 1024, h = 512, u = t - CENTER;
  g.fillStyle = '#071226'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, 70); g.fillStyle = '#fff'; g.font = '600 40px Inter'; g.textAlign = 'center'; g.fillText('911  ·  INCOMING CALLS', w / 2, 50);
  g.fillStyle = '#9fb4d8'; g.font = '600 30px Inter'; g.fillText('CALLS WAITING', w / 2, 140);
  const q = Math.max(0, 326 * u); const blink = 0.75 + 0.25 * Math.sin(t * 4);
  g.fillStyle = `rgba(255,${80 + 60 * blink | 0},${60 * blink | 0},1)`; g.font = '400 170px "Source Serif 4"'; g.fillText(fmt(q), w / 2, 310);
  g.fillStyle = '#9fb4d8'; g.font = '600 28px Inter'; g.fillText('ALL DISPATCHERS BUSY  ·  AVG WAIT ' + Math.round(u * 8 + 1) + ' MIN', w / 2, 380);
  // queue bars
  for (let i = 0; i < 40; i++) { const k = clamp(u * 0.6 - i * 0.12 + 1, 0, 1) * (0.3 + 0.7 * hash(i)); g.fillStyle = k > 0.75 ? '#e05040' : '#3a7ad0'; g.fillRect(62 + i * 23, 470 - k * 60, 16, k * 60); }
  wallTex.needsUpdate = true;
}
function updateCenter(t) {
  for (const L of ctrLines) { const cyc = (t * 1.6 + L.ph) % 1; L.m.emissiveIntensity = cyc < 0.5 ? 2.2 : 0.15; }
  alarm.intensity = 6 * (0.5 + 0.5 * Math.sin((t - CENTER) * 2.4)) * smooth(CENTER + 1.5, CENTER + 3.5, t);
  drawWall(t);
}
function centerCamera(t) { const u = clamp((t - CENTER) / (DAWN - CENTER), 0, 1);
  cCam.fov = 62; cCam.position.set(lerp(1.6, 0.4, ease(u)), lerp(2.5, 1.9, u), lerp(5.6, 2.0, ease(u))); cCam.lookAt(lerp(0.2, 0, u), lerp(-1.6, -0.6, u), -6); }
