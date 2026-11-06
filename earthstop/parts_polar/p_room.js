// ---- interiors: the mess hall on the upper floor of wing A (window to the north = the sea ice), a bunk room, the robot vacuum, gloves for POV ----
const FL = STILT + 4.2;            // upper floor level (world y)
const ROOM = new THREE.Group(); pw.add(ROOM);
const wallM = M('#bfb6a8', { roughness: 0.9 }), floorM = new THREE.MeshStandardMaterial({ color: '#8a7058', roughness: 0.55 }), ceilM = M('#f0eee8');
{ // floor: wood planks texture
  const t = canvasTex(1024, 1024, (g, w, h) => { for (let r = 0; r < 16; r++) for (let c = 0; c < 3; c++) { const l = 30 + 25 * rnd(); g.fillStyle = `hsl(28,${30 + 10 * rnd()}%,${l}%)`; g.fillRect(c * w / 3 + (r % 2) * 80, r * h / 16, w / 3, h / 16); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let r = 0; r <= 16; r++) { g.beginPath(); g.moveTo(0, r * h / 16); g.lineTo(w, r * h / 16); g.stroke(); } speckle(g, w, h, 20000, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.05)'], 3); }, [3, 6]);
  floorM.map = t; }
const RZ0 = -20, RZ1 = -51, RX = 6;
bx(12, 0.1, 31, floorM, 0, FL - 0.05, (RZ0 + RZ1) / 2, ROOM);
bx(12, 0.1, 31, ceilM, 0, FL + 3.4, (RZ0 + RZ1) / 2, ROOM);
bx(0.1, 3.4, 31, wallM, -RX, FL + 1.7, (RZ0 + RZ1) / 2, ROOM); bx(0.1, 3.4, 31, wallM, RX, FL + 1.7, (RZ0 + RZ1) / 2, ROOM); bx(12, 3.4, 0.1, wallM, 0, FL + 1.7, RZ0, ROOM);
for (const sx of [-1, 1]) bx(0.06, 1.0, 31, M('#7a5a40', { roughness: 0.7 }), sx * (RX - 0.05), FL + 0.5, (RZ0 + RZ1) / 2, ROOM);
for (let k = 0; k < 8; k++) bx(12, 0.18, 0.25, M('#d8d4cc'), 0, FL + 3.3, -21.5 - k * 4.2, ROOM);
{ const sh = grp(RX - 0.2, FL, -38, -Math.PI / 2, ROOM); for (let r = 0; r < 4; r++) { bx(2.4, 0.04, 0.32, M('#6a4a34'), 0, 0.5 + r * 0.45, 0, sh); let x = -1.1; while (x < 1.1) { const w = R(0.03, 0.07), h = R(0.22, 0.34); bx(w, h, 0.22, M(pick(['#8a2a2a', '#2a4a7a', '#3a6a3a', '#c8a040', '#ddd'])), x + w / 2, 0.52 + r * 0.45 + h / 2, 0, sh); x += w + 0.005; } } }
{ const k = grp(0, FL, RZ0 + 0.6, 0, ROOM); bx(6, 0.9, 0.6, M('#e8e8e6'), 0, 0.45, 0, k); bx(6.05, 0.04, 0.65, M('#3a3a3a', { roughness: 0.3 }), 0, 0.92, 0, k); bx(6, 0.7, 0.35, M('#dcdcd8'), 0, 2.0, 0.12, k);
  for (let i = 0; i < 6; i++) { const pot = mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.14, 14), M('#a8acb0', { metalness: 0.7, roughness: 0.3 })); pot.position.set(-2.5 + i * 0.9, 1.0, 0); k.add(pot); } }
const posterTex = canvasTex(400, 560, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1a3a'); gr.addColorStop(1, '#1a6a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '800 44px Pretendard'; g.textAlign = 'center'; g.fillText('제11차 월동대', w / 2, 460); g.font = '500 26px Pretendard'; g.fillText('JANG BOGO WINTER-OVER', w / 2, 505); for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(rnd() * w, rnd() * 360, 2, 2); } });
bx(0.7, 1.0, 0.02, new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.6 }), -RX + 0.05, FL + 1.9, -31, ROOM).rotation.y = Math.PI / 2;
// north wall: a wide window (sill 0.9 m, head 2.9 m) with mullions and a faint glass
bx(12, 0.9, 0.2, wallM, 0, FL + 0.45, RZ1, ROOM); bx(12, 0.5, 0.2, wallM, 0, FL + 3.15, RZ1, ROOM);
for (let k = 0; k < 5; k++) bx(0.12, 2.0, 0.24, M('#3a3f46', { metalness: 0.5, roughness: 0.4 }), -5 + k * 2.5, FL + 1.9, RZ1, ROOM);
bx(12, 0.1, 0.5, M('#3a3f46'), 0, FL + 0.9, RZ1 + 0.1, ROOM);
const glass = mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshPhysicalMaterial({ color: '#cfe0f0', transparent: true, opacity: 0.08, roughness: 0.02, metalness: 0, envMapIntensity: 0.6 }), false, false); glass.position.set(0, FL + 1.9, RZ1 + 0.02); glass.rotation.y = Math.PI; ROOM.add(glass);
// frost on the glass (grows at night): a canvas of ferns at the edges
const frostTex = canvasTex(1024, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(235,245,255,.55)';
  for (let k = 0; k < 900; k++) { const e = rnd(); let x = e < 0.5 ? rnd() * w : (rnd() < 0.5 ? 0 : w), y = e < 0.5 ? (rnd() < 0.5 ? 0 : h) : rnd() * h; let a = Math.atan2(h / 2 - y, w / 2 - x) + R(-0.9, 0.9);
    g.lineWidth = R(0.5, 1.6); g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 12; s++) { x += Math.cos(a) * R(3, 9); y += Math.sin(a) * R(3, 9); a += R(-0.5, 0.5); g.lineTo(x, y); } g.stroke(); } });
const frost = mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false }), false, false); frost.position.set(0, FL + 1.9, RZ1 + 0.04); frost.rotation.y = Math.PI; ROOM.add(frost);
// ceiling light panels (emissive) + warm point lights
const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.2) });
const roomLights = [];
for (let k = 0; k < 5; k++) { bx(1.2, 0.04, 0.6, panelM, -2.6, FL + 3.37, -23 - k * 6, ROOM); bx(1.2, 0.04, 0.6, panelM, 2.6, FL + 3.37, -23 - k * 6, ROOM);
  const L = new THREE.PointLight(0xffd0a0, 14, 15, 1.4); L.position.set(0, FL + 3.0, -23 - k * 6); ROOM.add(L); roomLights.push(L); }
// two long tables, 23 chairs (one table seats 12, the other 11 — the whole winter crew), trays, mugs, a water dispenser, a TV, a calendar
const tableM = M('#c9b79a', { roughness: 0.6 }), chairM = M('#3e6a8a', { roughness: 0.7 }), legM = M('#5a5e64', { metalness: 0.6, roughness: 0.4 });
function chair(x, z, ry) { const g = grp(x, FL, z, ry, ROOM); bx(0.46, 0.06, 0.44, chairM, 0, 0.46, 0, g); bx(0.46, 0.45, 0.05, chairM, 0, 0.72, -0.2, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.03, 0.46, 0.03, legM, sx * 0.2, 0.23, sz * 0.19, g); return g; }
const CHAIRS = [];
[-2.2, 2.2].forEach((tx, ti) => { bx(1.1, 0.06, 13.5, tableM, tx, FL + 0.75, -34, ROOM); for (const sz of [-6.2, 6.2]) for (const sx of [-0.45, 0.45]) bx(0.05, 0.72, 0.05, legM, tx + sx, FL + 0.37, -34 + sz, ROOM);
  const n = ti ? 11 : 12; for (let k = 0; k < n; k++) { const side = k % 2 ? 1 : -1, j = Math.floor(k / 2); CHAIRS.push(chair(tx + side * 0.85, -29 - j * 1.8 - (ti && side > 0 ? 0.9 : 0), side > 0 ? -Math.PI / 2 : Math.PI / 2)); } });
for (let k = 0; k < 9; k++) { const m = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), M(pick(['#f2f2f0', '#c84a3a', '#3a6aa0', '#e8c040']))); m.position.set(pick([-2.4, -2.0, 2.0, 2.4]), FL + 0.83, -28.5 - k * 1.3); ROOM.add(m); }
{ const d = grp(-5.5, FL, -22, Math.PI / 2, ROOM); bx(0.4, 1.3, 0.4, M('#e8eaec'), 0, 0.65, 0, d); const bt = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 14), new THREE.MeshPhysicalMaterial({ color: '#8ac8f0', transparent: true, opacity: 0.5, roughness: 0.05 })); bt.position.y = 1.55; d.add(bt); }
const tvTex = canvasTex(512, 288, (g, w, h) => { g.fillStyle = '#06080c'; g.fillRect(0, 0, w, h); g.fillStyle = '#16304a'; g.fillRect(16, 16, w - 32, h - 32); g.fillStyle = '#cfe4ff'; g.font = '600 34px Pretendard'; g.textAlign = 'center'; g.fillText('NO SIGNAL', w / 2, h / 2 + 12); });
bx(1.6, 0.92, 0.06, new THREE.MeshBasicMaterial({ map: tvTex }), RX - 0.06, FL + 2.1, -27, ROOM).rotation.y = -Math.PI / 2;
// the weather screen on the side wall: −34.0 °C / 41 m/s
const wxTex = canvasTex(640, 400, (g, w, h) => { g.fillStyle = '#071018'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e3a52'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#6fa8d8'; g.font = '600 30px Pretendard'; g.fillText('외부 기상 · JANG BOGO', 34, 62); g.fillStyle = '#eaf4ff'; g.font = '200 150px Pretendard'; g.fillText('−34.0°', 30, 230);
  g.fillStyle = '#9fd0ff'; g.font = '500 34px Pretendard'; g.fillText('풍속 41 m/s · 체감 −62°C', 34, 300); g.fillStyle = '#ff6a50'; g.fillText('● 외출 금지', 34, 352); });
const wx = bx(1.1, 0.69, 0.04, new THREE.MeshBasicMaterial({ map: wxTex, color: new THREE.Color(1.4, 1.4, 1.4) }), -RX + 0.05, FL + 1.75, -45, ROOM); wx.rotation.y = Math.PI / 2;
// calendar with crossed days
const calTex = canvasTex(400, 520, (g, w, h) => { g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8322a'; g.fillRect(0, 0, w, 90); g.fillStyle = '#fff'; g.font = '700 54px Pretendard'; g.textAlign = 'center'; g.fillText('5월', w / 2, 66);
  g.fillStyle = '#333'; g.font = '500 30px Pretendard'; for (let d = 1; d <= 31; d++) { const c = (d + 3) % 7, r = Math.floor((d + 3) / 7); const x = 30 + c * 52, y = 150 + r * 70; g.fillText(d, x + 6, y); if (d < 5) { g.strokeStyle = '#c8322a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 14, y - 26); g.lineTo(x + 26, y + 8); g.stroke(); } } });
bx(0.5, 0.65, 0.02, new THREE.MeshBasicMaterial({ map: calTex }), -RX + 0.05, FL + 1.8, -24.5, ROOM).rotation.y = Math.PI / 2;
// the note on the table
const noteTex = canvasTex(512, 380, (g, w, h) => { g.fillStyle = '#fbf7ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9d6e8'; g.lineWidth = 2; for (let y = 70; y < h; y += 46) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
  g.fillStyle = '#20232a'; g.font = '500 44px "Noto Serif KR"'; g.fillText('다들 먼저 갑니다.', 40, 110); g.fillText('봄에 봐요.', 40, 200); g.font = '500 34px "Noto Serif KR"'; g.fillText('— 월동대 22명', 220, 300); });
const note = mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.9 })); note.rotation.x = -Math.PI / 2; note.rotation.z = 0.25; note.position.set(-2.1, FL + 0.785, -44.5); ROOM.add(note);
const pen = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8).rotateZ(Math.PI / 2), M('#1a3a8a')); pen.position.set(-1.92, FL + 0.79, -44.38); pen.rotation.y = 0.4; ROOM.add(pen);
// the bunk room (a separate box far away; its window shows the polar night)
const BED = new THREE.Group(); BED.position.set(4000, 0, 0); pw.add(BED);
bx(4, 0.1, 4, floorM, 0, -0.05, 0, BED); bx(4, 0.1, 4, ceilM, 0, 2.7, 0, BED); bx(0.1, 2.7, 4, M('#d6dde4'), -2, 1.35, 0, BED); bx(0.1, 2.7, 4, M('#d6dde4'), 2, 1.35, 0, BED); bx(4, 2.7, 0.1, M('#d6dde4'), 0, 1.35, 2, BED);
bx(1.4, 1.0, 0.1, M('#d6dde4'), -1.3, 0.5, -2, BED); bx(1.4, 1.0, 0.1, M('#d6dde4'), 1.3, 0.5, -2, BED); bx(4, 1.0, 0.1, M('#d6dde4'), 0, 2.2, -2, BED); bx(1.2, 0.7, 0.1, M('#d6dde4'), -1.4, 1.35, -2, BED); bx(1.2, 0.7, 0.1, M('#d6dde4'), 1.4, 1.35, -2, BED);
const nightWin = mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.ShaderMaterial({ uniforms: { uT: skyU.uT }, vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){ vec3 c=mix(vec3(0.01,0.015,0.035), vec3(0.03,0.05,0.1), 1.0-vU.y); vec2 q=floor(vU*vec2(160.0,120.0)); float s=step(0.993,h(q)); c+=vec3(1.0)*s*(0.6+0.4*sin(uT*2.0+h(q)*30.0));
      c=mix(c, vec3(0.18,0.2,0.26), smoothstep(0.25,0.0,vU.y)*0.6); gl_FragColor=vec4(c*1.0,1.0); }` }), false, false); nightWin.position.set(0, 1.35, -2.02); BED.add(nightWin);
{ const b = grp(-0.9, 0, 0.6, 0, BED); bx(1.0, 0.45, 2.1, M('#6a5a4a'), 0, 0.22, 0, b); bx(0.95, 0.18, 2.0, M('#f0f0ec'), 0, 0.54, 0, b); bx(0.98, 0.12, 1.4, M('#2f5a40', { roughness: 0.95 }), 0, 0.66, 0.25, b); bx(0.6, 0.12, 0.35, M('#f4f4f0'), 0, 0.68, -0.75, b); }
const clockTex = canvasTex(512, 200, (g, w, h) => { g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3a2a'; g.font = '300 150px Pretendard'; g.textAlign = 'center'; g.fillText('03:12', w / 2, 152); });
{ const ns = grp(0.3, 0, -0.2, 0, BED); bx(0.45, 0.5, 0.4, M('#8a7058'), 0, 0.25, 0, ns); bx(0.22, 0.09, 0.08, M('#1a1a1a'), 0, 0.55, 0, ns); const cf = mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: clockTex, color: new THREE.Color(2.5, 2.5, 2.5) }), false, false); cf.position.set(0, 0.55, 0.042); ns.add(cf);
  const cl = new THREE.PointLight(0xff3020, 1.5, 2.5, 2); cl.position.set(0, 0.6, 0.2); ns.add(cl); }
const bedLight = new THREE.PointLight(0x7a9cff, 4, 6, 1.4); bedLight.position.set(0, 1.4, -1.3); BED.add(bedLight);
// ---- the robot vacuum: our companion (a disc with two LED 'eyes' that blink and a cyan ring light) ----
const BOT = new THREE.Group(); pw.add(BOT);
{ const body = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.085, 40), M('#2a2d33', { roughness: 0.35, metalness: 0.3 })); body.position.y = 0.05; BOT.add(body);
  const top = mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.012, 40), M('#15171b', { roughness: 0.15, metalness: 0.5 })); top.position.y = 0.098; BOT.add(top);
  const ring = mesh(new THREE.TorusGeometry(0.155, 0.006, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 2.6) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.093; BOT.add(ring); BOT.userData.ring = ring;
  const bump = mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.04, 40, 1, true, -1.2, 2.4), M('#4a4e56', { roughness: 0.5 })); bump.position.y = 0.04; BOT.add(bump);
  const eyes = []; for (const sx of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.8, 3.2) })); e.scale.set(1, 1.5, 0.5); e.position.set(sx * 0.045, 0.072, 0.168); BOT.add(e); eyes.push(e); } BOT.userData.eyes = eyes;
  const glowL = new THREE.PointLight(0x40e0ff, 0.35, 1.2, 2); glowL.position.set(0, 0.12, 0.12); BOT.add(glowL); }
function botAt(p, ry, t, blink = true) { BOT.position.copy(p); BOT.rotation.y = ry; const b = blink ? (Math.abs(Math.sin(t * 0.9)) > 0.985 ? 0.15 : 1) : 1; BOT.userData.eyes.forEach(e => e.scale.y = 1.5 * b); }
// ---- POV gloves (dark fleece liner gloves; red parka cuff) ----
function glove(side) { const g = new THREE.Group(), gm = M('#23262c', { roughness: 0.95 }), cuff = M('#b02a22', { roughness: 0.85 });
  const palm = mesh(new RoundedBoxGeometry(0.085, 0.1, 0.03, 3, 0.012), gm); palm.position.y = 0.05; g.add(palm);
  for (let k = 0; k < 4; k++) { const f = mesh(new THREE.CapsuleGeometry(0.0095, 0.05 + 0.012 * (k === 1 || k === 2 ? 1 : 0) - 0.008 * (k === 3), 4, 8), gm); f.position.set(-0.03 + k * 0.02, 0.128 + 0.006 * (k === 1 || k === 2), 0); g.add(f); }
  const th = mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), gm); th.position.set(side * 0.05, 0.05, 0.008); th.rotation.z = -side * 0.7; g.add(th);
  const wr = new THREE.Group(); g.add(wr); g.userData.wrist = wr; const cf = mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.14, 16), cuff); cf.position.y = -0.06; wr.add(cf); const sl = mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.42, 16), M('#c8322a', { roughness: 0.85 })); sl.position.y = -0.29; wr.add(sl);
  pw.add(g); return g; }
const GL = glove(-1), GR = glove(1);
