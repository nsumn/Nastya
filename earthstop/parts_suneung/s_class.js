// =================== 수능 EXAM ROOM (meters): Korean high-school classroom, 9 × 8 × 3 m. Students face −Z (the blackboard). Origin = floor centre.
const cls = new THREE.Scene();
const cCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 400); cls.add(cCam);
const RW = 9, RD = 8, RH = 3.0;
cls.environment = kw.environment; cls.environmentIntensity = 0.5;
cls.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7a68, 0.9));
const winSun = new THREE.DirectionalLight(0xfff2dc, 2.6); winSun.position.set(-12, 7, 3); winSun.castShadow = true; winSun.shadow.mapSize.set(2048, 2048);
Object.assign(winSun.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 40 }); winSun.shadow.bias = -0.0005; winSun.shadow.normalBias = 0.02; cls.add(winSun, winSun.target);
for (const [x, z] of [[-2, -2], [2, -2], [-2, 1.5], [2, 1.5]]) { const p = new THREE.PointLight(0xfffaf0, 4.0, 9, 1.6); p.position.set(x, RH - 0.2, z); cls.add(p); }
// ---- textures ----
const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c9b48f'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = ((x + y) / 64) % 2 ? '#c2ad88' : '#cfbb96'; g.fillRect(x + 1, y + 1, 62, 62); } speckle(g, w, h, 5000, ['#b9a37e', '#d6c29d'], 2); }, [1, 1]);
const wallTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efeadf'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2500, ['#e8e2d6', '#f4f0e7'], 2); }, [1, 1]);
const board = canvasTex(1600, 600, (g, w, h) => { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#35503f', '#2a4434', '#3a5646'], 3);
  g.fillStyle = 'rgba(240,240,232,.92)'; g.font = '500 76px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('2027학년도 대학수학능력시험', w / 2, 170);
  g.font = '500 62px "Noto Sans KR"'; g.fillText('제1교시  국어 영역', w / 2, 290); g.font = '400 50px "Noto Sans KR"'; g.fillText('08:40 ~ 10:00   (80분)', w / 2, 400);
  g.font = '400 40px "Noto Sans KR"'; g.fillStyle = 'rgba(255,220,140,.9)'; g.fillText('휴대폰 · 전자기기 제출 완료', w / 2, 500); });
const omrTex = canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#e46a7a'; g.fillRect(0, 0, w, 34); g.fillStyle = '#fff'; g.font = 'bold 18px "Noto Sans KR"'; g.fillText('답 안 지', 92, 23);
  g.strokeStyle = '#e46a7a'; g.lineWidth = 1; for (let c = 0; c < 4; c++) for (let r = 0; r < 20; r++) for (let b = 0; b < 5; b++) { g.beginPath(); g.ellipse(22 + c * 58 + b * 9, 52 + r * 15, 3, 5, 0, 0, Math.PI * 2); g.stroke(); } });
const bookTex = canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; g.font = 'bold 20px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('2027학년도', w / 2, 60); g.fillText('대학수학능력시험 문제지', w / 2, 90);
  g.font = 'bold 44px "Noto Sans KR"'; g.fillText('국어 영역', w / 2, 170); g.strokeStyle = '#333'; g.lineWidth = 2; g.strokeRect(20, 20, w - 40, h - 40); });
const clockTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fafafa'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#333'; g.stroke(); g.fillStyle = '#222';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 96 - 3, 128 - Math.cos(a) * 96 - 8, 6, 16); }
  g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(8.75 / 12 * 2 * Math.PI) * 55, 128 - Math.cos(8.75 / 12 * 2 * Math.PI) * 55); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(0.25 * 2 * Math.PI) * 85, 128 - Math.cos(0.25 * 2 * Math.PI) * 85); g.stroke(); });
const flagTex = canvasTex(300, 200, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c60c30'; g.beginPath(); g.arc(150, 100, 50, Math.PI, 0); g.fill(); g.fillStyle = '#003478'; g.beginPath(); g.arc(150, 100, 50, 0, Math.PI); g.fill();
  g.fillStyle = '#000'; for (const [x, y, r] of [[55, 45, -0.98], [245, 45, 0.98], [55, 155, 0.98], [245, 155, -0.98]]) { g.save(); g.translate(x, y); g.rotate(r); for (let k = -1; k <= 1; k++) g.fillRect(-25, k * 10 - 3, 50, 6); g.restore(); } });
const bannerTex = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#1f4fa0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 58px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('2027학년도 대학수학능력시험 제12시험장', w / 2, 84); });
const signTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d3a6e'; g.font = 'bold 64px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('한강고등학교', w / 2, 88); });
// ---- room shell ----
const room = new THREE.Group(); cls.add(room);
const fl = mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshStandardMaterial({ map: rep(floorTex, 9, 8), roughness: 0.55 }), false, true); fl.rotation.x = -Math.PI / 2; room.add(fl);
const ceil = mesh(new THREE.PlaneGeometry(RW, RD), M('#f2f0ea', { roughness: 0.95 }), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = RH; room.add(ceil);
const wallM = new THREE.MeshStandardMaterial({ map: rep(wallTex, 4, 2), roughness: 0.9 }), wainM = M('#9fb6a2', { roughness: 0.7 });
function wall(w, h, x, y, z, ry) { const m = mesh(new THREE.PlaneGeometry(w, h), wallM, false, true); m.position.set(x, y, z); m.rotation.y = ry; room.add(m); return m; }
wall(RW, RH, 0, RH / 2, -RD / 2, 0); wall(RW, RH, 0, RH / 2, RD / 2, Math.PI); wall(RD, RH, RW / 2, RH / 2, 0, -Math.PI / 2);
// left wall = windows: sill band + 4 window bays (frames + glass), sky + trees outside
bx(0.12, 0.95, RD, wainM, -RW / 2, 0.475, 0, room); bx(0.12, 0.35, RD, wallM, -RW / 2, RH - 0.175, 0, room);
const glassM = new THREE.MeshPhysicalMaterial({ color: '#dfeef6', roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.18 });
const panes = [];
for (let i = 0; i < 4; i++) { const z = -RD / 2 + 1 + i * 2; for (const dz of [-0.48, 0.48]) { const p = mesh(new THREE.PlaneGeometry(0.94, 1.66), glassM, false, false); p.rotation.y = Math.PI / 2; p.position.set(-RW / 2 + 0.02, 1.78, z + dz); room.add(p); panes.push(p); }
  for (const dz of [-0.98, 0, 0.98]) bx(0.08, 1.7, 0.06, '#d9dde0', -RW / 2 + 0.03, 1.78, z + dz, room); bx(0.08, 0.06, 2.0, '#d9dde0', -RW / 2 + 0.03, 2.62, z, room); bx(0.08, 0.06, 2.0, '#d9dde0', -RW / 2 + 0.03, 0.94, z, room);
  const cur = mesh(new THREE.BoxGeometry(0.06, 1.9, 0.5), M('#e8dcc4', { roughness: 1 })); cur.position.set(-RW / 2 + 0.15, 1.72, z + 0.95); room.add(cur); }
const outside = new THREE.Group(); outside.position.x = -RW / 2; room.add(outside);
{ const sky = mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6f9fd8'); gr.addColorStop(1, '#dcebf5'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false }), false, false);
  sky.rotation.y = Math.PI / 2; sky.position.set(-25, 10, 0); outside.add(sky);
  for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + hash(i) * 0.8, 1), M('#5f8f45', { flatShading: false })); t.position.set(-6 - hash(i * 3) * 4, 1.5 + hash(i * 5), -6 + i * 1.6); outside.add(t); } }
// wainscot on the other walls
bx(RW, 0.95, 0.04, wainM, 0, 0.475, RD / 2 - 0.02, room); bx(0.04, 0.95, RD, wainM, RW / 2 - 0.02, 0.475, 0, room);
// front: blackboard, chalk tray, teacher's desk, clock, flag, TV, speaker
const bd = mesh(new THREE.PlaneGeometry(4.6, 1.3), new THREE.MeshStandardMaterial({ map: board, roughness: 0.85 }), false, false); bd.position.set(0, 1.65, -RD / 2 + 0.03); room.add(bd);
bx(4.8, 0.06, 0.05, '#8a6a46', 0, 2.32, -RD / 2 + 0.03, room); bx(4.8, 0.05, 0.1, '#8a6a46', 0, 0.98, -RD / 2 + 0.06, room);
const clk = mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.5 }), false, false); clk.position.set(0, 2.62, -RD / 2 + 0.03); room.add(clk);
const flg = mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.9 }), false, false); flg.position.set(-1.0, 2.62, -RD / 2 + 0.03); room.add(flg);
bx(1.0, 0.6, 0.06, '#1a1a1c', 3.3, 2.45, -RD / 2 + 0.05, room);
const tdesk = new THREE.Group(); tdesk.position.set(2.6, 0, -RD / 2 + 1.0); room.add(tdesk); bx(1.3, 0.05, 0.65, '#b99a72', 0, 0.76, 0, tdesk); bx(1.25, 0.7, 0.6, '#9a7c56', 0, 0.38, 0, tdesk);
// back: lockers + notice board
for (let i = 0; i < 14; i++) { const l = bx(0.6, 1.25, 0.45, '#b9c4cf', -RW / 2 + 0.6 + i * 0.6, 0.63, RD / 2 - 0.25, room, { metalness: 0.3, roughness: 0.5 }); bx(0.5, 0.02, 0.005, '#8a96a2', -RW / 2 + 0.6 + i * 0.6, 0.95, RD / 2 - 0.475, room); }
bx(3.0, 0.9, 0.03, '#c79a64', 0.5, 2.0, RD / 2 - 0.02, room);
// door (right wall) + ceiling lights
bx(0.05, 2.1, 0.95, '#a98663', RW / 2 - 0.03, 1.05, -2.8, room);
for (const [x, z] of [[-2, -2.5], [2, -2.5], [-2, 0], [2, 0], [-2, 2.5], [2, 2.5]]) { const l = mesh(new THREE.BoxGeometry(1.25, 0.05, 0.25), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 1.6 })); l.position.set(x, RH - 0.03, z); room.add(l); }
// ---- desks + chairs (5 columns × 4 rows); seat i: { x, z, desk, chair, omr, book } ----
const deskTop = M('#d8c7a2', { roughness: 0.55 }), deskEdge = M('#7b8a8f', { metalness: 0.5, roughness: 0.45 }), seatM = M('#6d8fb3', { roughness: 0.6 });
const omrM = new THREE.MeshStandardMaterial({ map: omrTex, roughness: 0.9, side: THREE.DoubleSide }), bookM = new THREE.MeshStandardMaterial({ map: bookTex, roughness: 0.9, side: THREE.DoubleSide });
const SEATS = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
  const x = -3.2 + c * 1.6, z = -1.7 + r * 1.45;
  const desk = new THREE.Group(); desk.position.set(x, 0, z); room.add(desk);
  bx(0.66, 0.035, 0.48, deskTop, 0, 0.72, 0, desk); bx(0.6, 0.02, 0.4, deskEdge, 0, 0.6, 0.02, desk);
  for (const [dx, dz] of [[-0.3, -0.21], [0.3, -0.21], [-0.3, 0.21], [0.3, 0.21]]) bx(0.03, 0.72, 0.03, deskEdge, dx, 0.36, dz, desk);
  const chair = new THREE.Group(); chair.position.set(x, 0, z + 0.48); room.add(chair);
  bx(0.4, 0.03, 0.38, seatM, 0, 0.43, 0, chair); bx(0.4, 0.3, 0.025, seatM, 0, 0.72, 0.19, chair);
  for (const [dx, dz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) bx(0.022, 0.43, 0.022, deskEdge, dx, 0.215, dz, chair);
  bx(0.02, 0.35, 0.02, deskEdge, -0.18, 0.6, 0.18, chair); bx(0.02, 0.35, 0.02, deskEdge, 0.18, 0.6, 0.18, chair);
  const omr = mesh(new THREE.PlaneGeometry(0.19, 0.27), omrM, true, true); omr.rotation.x = -Math.PI / 2; omr.position.set(x + 0.14, 0.742, z + 0.03); room.add(omr);
  const book = mesh(new THREE.PlaneGeometry(0.21, 0.29), bookM, true, true); book.rotation.x = -Math.PI / 2; book.position.set(x - 0.13, 0.742, z + 0.02); room.add(book);
  SEATS.push({ r, c, x, z, desk, chair, omr, book });
}
// ---- exterior: the school (4 storeys, cream + blue band), the exam banner, name plate; sits in the Seoul park scene (kw) ----
const school = new THREE.Group(); school.position.set(0, 0, 160); kw.add(school);
{ const facade = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h); for (let f = 0; f < 4; f++) for (let i = 0; i < 12; i++) { g.fillStyle = '#7f9db4'; g.fillRect(12 + i * 41, 18 + f * 60, 30, 34); g.fillStyle = '#b7cad8'; g.fillRect(12 + i * 41, 18 + f * 60, 30, 8); }
    g.fillStyle = '#2f62a8'; g.fillRect(0, 248, w, 8); });
  const b = mesh(new THREE.BoxGeometry(70, 16, 14), [M('#e6dcc6'), M('#e6dcc6'), M('#b9b3a6'), M('#b9b3a6'), new THREE.MeshStandardMaterial({ map: facade, roughness: 0.8 }), M('#e6dcc6')]); b.position.y = 8; school.add(b);
  const ban = mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.8 }), false, false); ban.position.set(0, 12.2, 7.03); school.add(ban);
  const sg = mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }), false, false); sg.position.set(-24, 14.4, 7.03); school.add(sg);
  bx(70, 2.5, 0.3, '#d4cbb5', 0, 1.25, 30, school); }   // schoolyard wall
const roofHole = mesh(new THREE.CircleGeometry(1.4, 24), M('#2a2622')); roofHole.rotation.x = -Math.PI / 2; roofHole.position.set(-6, 16.02, 1); roofHole.visible = false; school.add(roofHole);
