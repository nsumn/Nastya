// =================== NEW BEATS (fast-cut version): the Rubik's cube solved with one look, a flood of "help me" texts, chess vs a grandmaster, the joke nobody gets ===================
hero.phone = makePhone(); hero.elbows[1].add(hero.phone); hero.phone.visible = false;
// ---- the cube: 27 cubelets; the stickers go from scrambled to solved, the cube spins in your hands ----
const RUB_C = ['#e8303a', '#f28a2a', '#f4f4f2', '#f2d030', '#30a050', '#2f6ad8'];   // +x -x +y -y +z -z
const rubik = new THREE.Group(); room.add(rubik); const cubelets = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
  const mats = [0, 1, 2, 3, 4, 5].map(f => { const out = [x === 1, x === -1, y === 1, y === -1, z === 1, z === -1][f]; return new THREE.MeshStandardMaterial({ color: out ? RUB_C[f] : '#111114', roughness: 0.4 }); });
  const m = new THREE.Mesh(BOX, mats); m.scale.setScalar(0.031); m.position.set(x * 0.033, y * 0.033, z * 0.033); rubik.add(m); cubelets.push({ m, mats, scr: [0, 1, 2, 3, 4, 5].map(f => RUB_C[Math.floor(hash(cubelets.length * 6 + f + 0.5) * 6)]), x, y, z }); }
function setRubik(k) {   // k = 0 scrambled … 1 solved (stickers flip to their right colours one by one)
  cubelets.forEach((c, i) => c.mats.forEach((mt, f) => { const out = [c.x === 1, c.x === -1, c.y === 1, c.y === -1, c.z === 1, c.z === -1][f]; if (!out) return; mt.color.set(hash(i * 13 + f) < k ? RUB_C[f] : c.scr[f]); })); }
const chessGrp = new THREE.Group(); room.add(chessGrp);
{ bx(0.9, 0.05, 0.9, '#6a4a30', 0, 0.72, 0, chessGrp); for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) bx(0.05, 0.72, 0.05, '#5a3a24', x, 0.36, z, chessGrp);
  const boardT = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#7a5a3a' : '#e8d8b8'; g.fillRect(i * 32, j * 32, 32, 32); } });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), new THREE.MeshStandardMaterial({ map: boardT, roughness: 0.7 })); bd.rotation.x = -Math.PI / 2; bd.position.y = 0.752; chessGrp.add(bd); }
const PIECES = []; function piece(col, kind, i, j) { const g = new THREE.Group(), m = M(col, { roughness: 0.4 }); const base = mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 12), m); base.position.y = 0.01; g.add(base);
  const body = mesh(new THREE.CylinderGeometry(0.013, 0.02, kind === 'K' ? 0.08 : kind === 'Q' ? 0.07 : 0.045, 12), m); body.position.y = kind === 'p' ? 0.035 : 0.05; g.add(body); const top = mesh(new THREE.SphereGeometry(kind === 'p' ? 0.014 : 0.017, 10, 8), m); top.position.y = kind === 'K' ? 0.1 : kind === 'Q' ? 0.09 : 0.06; g.add(top);
  g.position.set(-0.245 + i * 0.07, 0.752, -0.245 + j * 0.07); chessGrp.add(g); const P = { g, i, j }; PIECES.push(P); return P; }
['R', 'p', 'K', 'p', 'Q', 'p'].forEach((k, n) => piece('#f4f0e8', k, [0, 3, 4, 5, 3, 6][n], [7, 6, 7, 6, 7, 6][n])); const wQ = PIECES[4];
['R', 'p', 'K', 'p', 'p', 'B'].forEach((k, n) => piece('#2a2a2e', k, [0, 2, 4, 5, 6, 2][n], [0, 1, 0, 1, 1, 0][n])); const bK = PIECES[8];
chessGrp.position.set(0.9, 0, 0.6);
const gm = makeBlock({ skin: '#e2ae86', hair: '#c8c8c8', top: '#3a3a40', collar: '#f4f4f4', bottom: '#2a2a2e', hairStyle: 'bald', glasses: '#2a2420', mustache: '#c8c8c8' }); room.add(gm.outer);
// ---- per-beat updates in the living room ----
function hideRoomExtras() { rubik.visible = false; chessGrp.visible = false; gm.outer.visible = false; hero.phone.visible = false; }
function updateRubik(t) { updateTalk(t, 'argue'); [sib, mom].forEach(p => p.outer.visible = false); hideRoomExtras(); const P = hero; poseReset(P, t); seatAt(P, -1.0, 0.42, -1.3, 0); P.root.rotation.x = -0.05;
  P.arms.forEach((a, i) => a.rotation.set(-0.75, 0, i ? 0.25 : -0.25)); P.elbows.forEach(e => e.rotation.x = -1.0); rubik.visible = true; P.outer.updateMatrixWorld(true); const h = headOf(P);
  const k = smooth(RUBIK + 3.0, RUBIK + 4.6, t); setRubik(k); rubik.position.copy(h).add(V3(0, -0.42 + 0.25 * smooth(RUBIK + 5.4, RUBIK + 6.0, t), 0.3)); rubik.rotation.set(t * 0.5 + k * 9, t * 0.7 + k * 11, 0); rubik.scale.setScalar(1 + 0.6 * smooth(RUBIK + 5.4, RUBIK + 6.0, t));
  if (t > RUBIK + 5.4) { P.arms[1].rotation.set(-2.2, 0, -0.1); P.elbows[1].rotation.x = -0.4; }
  P.face(t < RUBIK + 2.4 ? 'reading' : t < RUBIK + 3.0 ? 'squint' : 'smirk', t); }
function updateNotif(t) { updateTalk(t, 'argue'); [sib, mom].forEach(p => p.outer.visible = false); hideRoomExtras(); const P = hero; poseReset(P, t); P.outer.position.set(2.6, 0.95, -1.3); P.outer.rotation.y = 0.5; holdPhone(P, t, 'near');
  P.face(t < NOTIF + 1.0 ? 'neutral' : t < NOTIF + 2.2 ? 'surprised' : 'sleepy', t); }
function updateChess(t) { updateTalk(t, 'argue'); [sib, mom].forEach(p => p.outer.visible = false); hideRoomExtras(); chessGrp.visible = true; const P = hero; poseReset(P, t); seatAt(P, 0.9, 0.47, 0.12, 0);
  P.arms[1].rotation.set(-1.0 - 0.25 * smooth(CHESS + 0.6, CHESS + 1.0, t) * (1 - smooth(CHESS + 1.6, CHESS + 2.0, t)), 0, -0.1); P.elbows[1].rotation.x = -0.6;
  const mv = smooth(CHESS + 0.8, CHESS + 1.6, t); wQ.g.position.set(-0.245 + lerp(3, 4, mv) * 0.07, 0.752 + 0.06 * Math.sin(Math.PI * mv), -0.245 + lerp(7, 1, mv) * 0.07);   // queen up the board: checkmate
  bK.g.rotation.z = 1.4 * smooth(CHESS + 2.6, CHESS + 3.0, t); bK.g.position.y = 0.752 + 0.01 * smooth(CHESS + 2.6, CHESS + 3.0, t);   // the black king tips over
  P.face(t < CHESS + 0.8 ? 'smirk' : t < CHESS + 2.4 ? 'squint' : 'smirk', t);
  gm.outer.visible = true; poseReset(gm, t); seatAt(gm, 0.9, 0.47, 1.1, Math.PI); gm.arms.forEach(a => a.rotation.set(-0.8, 0, 0)); gm.elbows.forEach(e => e.rotation.x = -0.8); gm.face(t < CHESS + 1.6 ? 'reading' : t < CHESS + 2.6 ? 'surprised' : 'crying', t + 0.5); }
function updateJoke(t) { updateTalk(t, 'talk'); hideRoomExtras(); hero.face(t < TALK + 2.6 ? 'laugh' : t < TALK + 4.0 ? 'neutral' : 'sad', t); fr1.face(t < TALK + 2.4 ? 'neutral' : 'squint', t); fr2.face('worried', t + 1);
  if (t > TALK + 3.0) { const k = smooth(TALK + 3.0, TALK + 4.0, t); fr1.outer.rotation.y = lerp(-0.7, 2.2, k); fr2.outer.rotation.y = lerp(0.7, -2.4, k); hero.arms.forEach(a => a.rotation.set(0, 0, 0)); } }
