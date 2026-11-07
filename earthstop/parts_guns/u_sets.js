// =================== THE SETS for "every gun in America disappeared overnight": reused worlds (bedroom, US map, the groceries street with YOUR garage,
// the mansion as the neighbour's living room, the supermarket as a hardware store, the office, the White House) + new ones (Congress, the FBI room). ===================
const sitP = (p, x, y, z, ry) => { p.outer.position.set(x, y, z); p.outer.rotation.set(0, ry, 0); poseSit(p); };
const SPEECH = [];   // scripted DOM bubbles: [t0, t1, set, headFn, text, cls]
// ---------- low-poly guns (boxes merged): a pistol and a long gun; used only as OBJECTS (piles, outlines) — nobody ever holds one ----------
const GUN = (() => { const B = (w, h, d, x, y, z, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); g.translate(x, y, z); return g; };
  return { pistol: mergeGeometries([B(0.19, 0.035, 0.03, 0, 0, 0), B(0.042, 0.105, 0.03, -0.06, -0.06, 0, -0.25), B(0.05, 0.012, 0.022, -0.015, -0.037, 0), B(0.012, 0.03, 0.022, -0.012, -0.052, 0)]),
    rifle: mergeGeometries([B(0.46, 0.024, 0.024, 0.22, 0.012, 0), B(0.26, 0.065, 0.045, -0.06, 0, 0), B(0.26, 0.075, 0.038, -0.32, -0.025, 0, 0.12), B(0.032, 0.1, 0.034, -0.02, -0.075, 0, -0.15), B(0.06, 0.04, 0.04, -0.06, 0.058, 0), B(0.12, 0.035, 0.05, 0.12, -0.02, 0)]) }; })();
const GUN_M = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.35, flatShading: true });
// a pile: guns scattered over a heightfield h(x, z) (mostly near the surface) + a dark mound under them so no gaps show
function gunPile(parent, n, x0, x1, z0, z1, hf, sd, front = null) {
  const r0 = seed; seed = sd; const nl = Math.round(n * 0.45), nr = n - nl, c = new THREE.Color();
  const IL = new THREE.InstancedMesh(GUN.rifle, GUN_M, nr), IP = new THREE.InstancedMesh(GUN.pistol, GUN_M, nl);
  const put = (I, k, x, y, z, cols) => { _o.position.set(x, y, z); _o.rotation.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28); _o.scale.setScalar(1); _o.updateMatrix(); I.setMatrixAt(k, _o.matrix); I.setColorAt(k, c.set(pick(cols))); };
  const RC = ['#2a2c30', '#5a3e26', '#3a3c42', '#4a4e38', '#6a4a2e', '#24262a'], PC = ['#1e1f22', '#2a2c30', '#6a6c72', '#3a3a3e'];
  const spot = () => { if (front && rnd() < 0.28) { const x = R(x0, x1), z = front + R(-0.12, 0.08); return [x, R(0.03, hf(x, front)), z]; } const x = R(x0, x1), z = R(z0, z1), h = hf(x, z); return [x, Math.max(0.03, h - 0.22 * Math.pow(rnd(), 2)), z]; };
  for (let k = 0; k < nr; k++) put(IL, k, ...spot(), RC); for (let k = 0; k < nl; k++) put(IP, k, ...spot(), PC);
  for (const I of [IL, IP]) { I.castShadow = I.receiveShadow = true; I.instanceColor.needsUpdate = true; parent.add(I); }
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 24, 24); g.rotateX(-Math.PI / 2); const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i) + (x0 + x1) / 2, z = P.getZ(i) + (z0 + z1) / 2; P.setY(i, Math.max(0, hf(x, z) - 0.12)); } g.computeVertexNormals();
  const mound = mesh(g, M('#1c1d20', { roughness: 0.6 }), false, true); mound.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); parent.add(mound);
  seed = r0; return { IL, IP, mound }; }

// ---------- 1) YOUR STREET (groceries street, golden light) + YOUR GARAGE rebuilt hollow with a sectional door that rolls up — and the pile inside ----------
const GR = {}; {
  const hide = []; let brick = null;
  st.children.forEach(o => { if (!o.isMesh) return; const p = o.position;
    if (Math.abs(p.x - 5.3) < 0.01 && Math.abs(p.z + 8.1) < 0.01 && Math.abs(p.y - 1.4) < 0.01) { hide.push(o); brick = o.material; }
    else if (p.x > 3.4 && p.x < 7.2 && p.z > -6.0 && p.z < -5.86 && p.y < 2.36) hide.push(o); });
  hide.forEach(o => { o.visible = false; }); GR.hidden = hide.length;
  const bm = brick || M('#c2674a'), ins = M('#d8d2c6', { roughness: 0.9 });
  rb(0.15, 2.8, 4.2, bm, 3.075, 1.4, -8.1, st, 0.01); rb(0.15, 2.8, 4.2, bm, 7.525, 1.4, -8.1, st, 0.01); rb(4.6, 2.8, 0.15, bm, 5.3, 1.4, -10.125, st, 0.01);
  rb(4.3, 2.7, 0.04, ins, 5.3, 1.35, -10.03, st, 0.01); for (const x of [3.17, 7.43]) rb(0.04, 2.7, 4.0, ins, x, 1.35, -8.1, st, 0.01);
  rb(4.6, 0.1, 4.2, ins, 5.3, 2.75, -8.1, st, 0.01); rb(4.6, 0.45, 0.2, bm, 5.3, 2.575, -6.1, st, 0.01); for (const x of [3.25, 7.35]) rb(0.5, 2.35, 0.2, bm, x, 1.175, -6.1, st, 0.01);
  rb(3.7, 0.08, 0.1, M('#f6f4ee'), 5.3, 2.37, -5.98, st, 0.02); for (const x of [3.47, 7.13]) rb(0.08, 2.37, 0.1, M('#f6f4ee'), x, 1.18, -5.98, st, 0.02);
  plane(4.3, 4.0, M('#9a968e', { roughness: 0.8 }), 5.3, -8.1, 0.02);
  GR.bulb = new THREE.PointLight(0xffd8a0, 0, 7, 1.5); GR.bulb.position.set(5.3, 2.5, -7.6); st.add(GR.bulb);
  // the door: 4 sections (pivot at each section's bottom edge), white with raised panels
  GR.rows = []; const H4 = 2.35 / 4, dm = M('#eceae2', { roughness: 0.6 }), pm = M('#f4f2ec', { roughness: 0.55 });
  for (let r = 0; r < 4; r++) { const g = new THREE.Group(); st.add(g); rb(3.6, H4 - 0.01, 0.05, dm, 0, H4 / 2, 0, g, 0.01); for (let c = 0; c < 4; c++) rb(0.78, H4 * 0.72, 0.03, pm, -1.33 + c * 0.89, H4 / 2, 0.03, g, 0.012); GR.rows.push(g); }
  // the pile: back of the garage almost to the ceiling, sloping down toward the door
  GR.pile = gunPile(st, 2600, 3.22, 7.38, -9.98, -6.35, (x, z) => { const u = clamp((z + 9.98) / 3.63, 0, 1); return clamp(2.12 - 0.95 * u * u + 0.14 * Math.sin(x * 3.1 + z * 2.3) + 0.08 * Math.sin(x * 7.7 - z * 5.1), 0.2, 2.3); }, 3939, -6.35); }
function setGarage(open) { const H4 = 2.35 / 4, s = clamp(open, 0, 1) * 2.35;
  GR.rows.forEach((g, i) => { const p = i * H4 + s; if (p + H4 * 0.5 < 2.35) { g.position.set(5.3, p, -5.94); g.rotation.set(0, 0, 0); } else { g.position.set(5.3, 2.6, -5.94 - Math.max(0, p - 2.35 + H4 * 0.5)); g.rotation.set(-Math.PI / 2, 0, 0); } });
  GR.bulb.intensity = 2.2 * clamp(open * 3, 0, 1); }
// the neighbours on the morning street (in robes / pajamas)
const NBR = makeBlock({ head: 'human', body: 'human', skin: '#d8a47e', hair: '#8a8a8a', top: '#7a5a9a', bottom: '#5a6a8a', shoe: '#5a3a2a', hairStyle: 'short', mustache: '#6a6a6a', headS: 0.88 });
const ROBES = []; { const r0 = seed; seed = 5151; const cols = ['#c8a0d8', '#e8d8c0', '#8ab4d8', '#f4c4c4', '#a8c890', '#d8b080'];
  for (let i = 0; i < 7; i++) { const p = makePerson(rnd, { top: cols[i % 6], bottom: pick(['#5a6a8a', '#e8e0d0', '#8a5a6a']), cap: false, longSleeve: true, dress: false, shorts: false }); st.add(p.outer);
    ROBES.push({ p, x: [-17.5, -9.5, -4, 9, 14, -11, 18][i], z: [20.5, 20.2, 20.8, 20.4, 21, 2.0, 2.5][i], ph: rnd() * 6 }); } seed = r0; }
const MUG = (() => { const g = new THREE.Group(); const c = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), M('#f4f0e8', { roughness: 0.4 })); g.add(c); const h = mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 10), M('#f4f0e8')); h.position.x = 0.05; g.add(h);
  const cf = mesh(new THREE.CircleGeometry(0.038, 12), M('#3a2416', { roughness: 0.3 })); cf.rotation.x = -Math.PI / 2; cf.position.y = 0.045; g.add(cf); return g; })();
const HOTDOG = (() => { const g = new THREE.Group(); const b = mesh(new THREE.CapsuleGeometry(0.03, 0.15, 4, 8), M('#e8b878', { roughness: 0.8 })); b.rotation.z = Math.PI / 2; b.scale.set(1, 1, 1.4); g.add(b);
  const s = mesh(new THREE.CapsuleGeometry(0.018, 0.19, 4, 8), M('#b8502a', { roughness: 0.5 })); s.rotation.z = Math.PI / 2; s.position.y = 0.022; g.add(s);
  const m = mesh(new THREE.BoxGeometry(0.16, 0.006, 0.01), M('#f4c820')); m.position.y = 0.042; g.add(m); return g; })();
const NOODLE = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 10), M('#ff7a2a', { roughness: 0.7 }));
const REMOTE = (() => { const g = new THREE.Group(); rb(0.04, 0.07, 0.015, M('#2a2a2e'), 0, 0, 0, g, 0.006); rb(0.016, 0.016, 0.006, M('#e83a3a'), 0, 0.012, 0.01, g, 0.003); return g; })();
function holdIn(P, i, obj, off = V3(0, -0.3, 0.04), rot = null) { P.elbows[i].add(obj); obj.position.copy(off); if (rot) obj.rotation.copy(rot); obj.visible = true; }
function updateStreet(t) { for (const w of ROBES) { const p = w.p; p.outer.visible = true; p.outer.position.set(w.x, 0.95, w.z); p.outer.rotation.set(0, (w.z > 10 ? Math.PI : 0) + 0.7 * Math.sin(t * 0.9 + w.ph), 0); poseIdle(p, t, w.ph);
    if (w.ph > 3) { p.arms.forEach((a, i) => a.rotation.set(-0.4, 0, (i ? -1 : 1) * 0.5)); p.elbows.forEach(e => e.rotation.x = -1.6); } }
  nb1.outer.visible = nb2.outer.visible = true; place(nb1, -13.4, -3.2, 0.5); poseReset(nb1, t); nb1.arms.forEach((a, i) => a.rotation.set(-0.3, 0, (i ? -1 : 1) * 0.9)); nb1.elbows.forEach(e => e.rotation.x = -1.7); nb1.face('surprised', t);
  place(nb2, -11.2, -2.6, -0.4); poseReset(nb2, t); nb2.arms[1].rotation.set(-2.6, 0, -0.2); nb2.elbows[1].rotation.x = -1.6; nb2.face('worried', t); }

// ---------- 2) THE NEIGHBOUR'S LIVING ROOM (the mansion set): an open, EMPTY gun safe by the fireplace ----------
const SAFE = {}; { const sc = MAN.sc, dark = F_('#2a2e34', { roughness: 0.4, metalness: 0.4 }), felt = F_('#8a7a62', { roughness: 1 });
  const g = new THREE.Group(); g.position.set(-1.3, 0, -7.38); sc.add(g); SAFE.g = g;
  rb(0.95, 1.7, 0.06, dark, 0, 0.85, -0.32, g, 0.01); for (const x of [-0.445, 0.445]) rb(0.06, 1.7, 0.7, dark, x, 0.85, 0, g, 0.01); rb(0.95, 0.06, 0.7, dark, 0, 1.67, 0, g, 0.01); rb(0.95, 0.12, 0.7, dark, 0, 0.06, 0, g, 0.01);
  rb(0.83, 1.5, 0.02, felt, 0, 0.85, -0.28, g, 0.005); for (const y of [0.55, 1.25]) rb(0.83, 0.03, 0.55, felt, 0, y, -0.02, g, 0.005);
  for (let i = 0; i < 6; i++) rb(0.06, 0.05, 0.12, F_('#5a4e3e'), -0.3 + i * 0.12, 0.15, -0.15, g, 0.01);   // empty rifle slots
  SAFE.door = new THREE.Group(); SAFE.door.position.set(0.475, 0, 0.35); g.add(SAFE.door); rb(0.95, 1.7, 0.1, dark, -0.475, 0.85, 0.0, SAFE.door, 0.02);
  const dial = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 20), F_('#c8ccd4', { metalness: 0.8, roughness: 0.25 })); dial.rotation.x = Math.PI / 2; dial.position.set(-0.6, 1.1, 0.07); SAFE.door.add(dial);
  for (let k = 0; k < 3; k++) { const s = rb(0.025, 0.2, 0.025, F_('#c8ccd4', { metalness: 0.8 }), -0.6, 0.85, 0.09, SAFE.door, 0.008); s.rotation.z = k * 2.09; s.position.set(-0.6 + 0.09 * Math.sin(k * 2.09), 0.85 + 0.09 * Math.cos(k * 2.09), 0.09); }
  SAFE.door.rotation.y = -1.95; MS.couch.visible = false; }

// ---------- 3) THE HARDWARE STORE (the supermarket aisle re-dressed): a bat bin with ONE bat left, shoppers running off with bats, SOLD OUT signs ----------
const STO = {}; { const sc = MKT.sc; MK.cart.visible = false; MK.wr.visible = false;
  const bin = new THREE.Group(); bin.position.set(0, 0, 3.2); sc.add(bin); rb(1.1, 0.8, 0.8, F_('#f08a2a'), 0, 0.4, 0, bin, 0.04);
  const st2 = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a22'; g.font = '800 62px Inter'; g.textAlign = 'center'; g.fillText('BASEBALL BATS', w / 2, 70); g.fillStyle = '#e8302a'; g.font = '900 56px Inter'; g.fillText('SOLD OUT', w / 2, 138); });
  const sg = mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: st2 }), false, false); sg.position.set(0, 2.05, 3.2); sc.add(sg); rb(0.04, 1.2, 0.04, F_('#9a9aa0'), 0, 1.3, 3.15, sc, 0.01);
  const so = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#e8302a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 52px Inter'; g.textAlign = 'center'; g.fillText('SOLD OUT', w / 2, 66); });
  for (let k = 0; k < 9; k++) { const s = mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ map: so }), false, false); const side = k % 2 ? 1 : -1; s.position.set(side * 1.58, 0.75 + 0.46 * (k % 4), -18 + k * 2.6); s.rotation.y = -side * Math.PI / 2; sc.add(s); }
  // empty shelves near the bin: hide the products in this stretch
  const n = MK.prods.count; for (let i = 0; i < n; i++) { MK.prods.getMatrixAt(i, _o.matrix); _o.matrix.decompose(_o.position, _o.quaternion, _o.scale); if (_o.position.z > -12 && _o.position.z < 2.5 && hash(i * 0.73) < 0.85) { _o.scale.setScalar(0.0001); _o.updateMatrix(); MK.prods.setMatrixAt(i, _o.matrix); } }
  MK.prods.instanceMatrix.needsUpdate = true;
  STO.bat = new THREE.Group(); { const b = mesh(new THREE.CylinderGeometry(0.035, 0.016, 0.84, 10), M('#d8a868', { roughness: 0.5 })); b.rotation.z = Math.PI / 2; STO.bat.add(b); } sc.add(STO.bat);
  const r0 = seed; seed = 8282;
  STO.tugA = makeBlock({ head: 'human', body: 'human', skin: '#e2ae86', hair: '#3a2a20', top: '#e8762a', bottom: '#4a4a52', shoe: '#3a2a20', hairStyle: 'short', headS: 0.88 });
  STO.tugB = makeBlock({ head: 'human', body: 'human', skin: '#f0c8a4', hair: '#c8a050', top: '#3a7ab8', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'long', headS: 0.86, lip: '#c8404a', h: 0.95 });
  sc.add(STO.tugA.outer, STO.tugB.outer);
  STO.run = []; for (let i = 0; i < 14; i++) { const p = makePerson(rnd); sc.add(p.outer); const bat = mesh(new THREE.CylinderGeometry(0.03, 0.014, 0.8, 8), M(pick(['#d8a868', '#c89858', '#2a2a2e', '#c8ccd4']), { roughness: 0.5 })); p.elbows[1].add(bat); bat.position.set(0, -0.28, 0.1); bat.rotation.x = 1.2;
    STO.run.push({ p, x: (i % 2 ? 1 : -1) * (0.35 + 0.3 * rnd()), z0: -20 + 22 * rnd(), sp: 2.2 + 1.2 * rnd(), ph: rnd() * 6, dir: rnd() < 0.7 ? 1 : -1 }); }
  seed = r0; }
function updateStore(t) { STO.run.forEach(w => { const z = wrapR(w.z0 + w.dir * w.sp * (t - STORE), -22, 1.5); w.p.outer.position.set(w.x, 0.95, z); w.p.outer.rotation.set(0, w.dir > 0 ? 0 : Math.PI, 0); poseWalk(w.p, t * 10 + w.ph, 1.2); w.p.arms[1].rotation.x = -0.6; w.p.elbows[1].rotation.x = -0.9; w.p.outer.visible = Math.abs(z - 3.2) > 1.2; });
  const tug = Math.sin(t * 5.5) * 0.09 + Math.sin(t * 2.3) * 0.05, A = STO.tugA, B = STO.tugB;
  for (const [P, s] of [[A, -1], [B, 1]]) { poseReset(P, t); place(P, s * 0.68 + tug, 4.25, s < 0 ? Math.PI / 2 : -Math.PI / 2); P.outer.rotation.x = 0; P.root.rotation.x = 0;
    P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = -0.12; P.arms.forEach(a => a.rotation.set(-1.45, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.25); P.legs[0].rotation.x = 0.35; P.legs[1].rotation.x = -0.25; P.knees[1].rotation.x = 0.3; }
  A.face(t < 19.5 ? 'angry' : 'wired', t); B.face(t < 19.5 ? 'angry' : 'angry', t);
  STO.bat.position.set(tug, 1.27, 4.25); STO.bat.rotation.set(0, 0, 0.04 * Math.sin(t * 7)); }

// ---------- 4) THE OFFICE: the screen shows the market — gun makers crash, home alarms skyrocket ----------
const MKTV = {}; { const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; MKTV.cv = cv; MKTV.tex = new THREE.CanvasTexture(cv); MKTV.tex.colorSpace = THREE.SRGBColorSpace; MKTV.tex.anisotropy = 8; MKTV.k = -1;
  const scr = OFF.sc.children.find(o => o.isMesh && o.material.isMeshBasicMaterial && Math.abs(o.position.z + 3.15) < 0.01); scr.material.map = MKTV.tex; scr.scale.set(1.3, 1.3, 1);
  const fr = OFF.sc.children.find(o => o.isMesh && Math.abs(o.position.z + 3.2) < 0.01 && Math.abs(o.position.y - 1.6) < 0.01); if (fr) fr.scale.set(2.0 * 1.3, 1.15 * 1.3, 0.05); }
function drawMarket(k) { const g = MKTV.cv.getContext('2d'), w = 960, h = 540; g.fillStyle = '#0c1220'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8eef8'; g.font = '800 44px Inter'; g.fillText('MARKETS · DAY 1', 40, 66); g.strokeStyle = '#1e2a40'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(40, 120 + i * 66); g.lineTo(w - 40, 120 + i * 66); g.stroke(); }
  const line = (f, col) => { g.strokeStyle = col; g.lineWidth = 9; g.lineJoin = 'round'; g.beginPath(); const N = 60, m = Math.max(2, Math.round(N * k)); for (let i = 0; i < m; i++) { const u = i / N, x = 50 + u * (w - 110), y = f(u); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); return [50 + (m - 1) / N * (w - 110), f((m - 1) / N)]; };
  const red = line(u => 230 + 12 * Math.sin(u * 40) + (u > 0.3 ? 300 * Math.pow((u - 0.3) / 0.7, 0.6) : 0), '#ff4a3a'), grn = line(u => 400 + 10 * Math.sin(u * 33) - (u > 0.35 ? 300 * Math.pow((u - 0.35) / 0.65, 0.7) : 0), '#3ad87a');
  g.font = '800 34px Inter'; g.fillStyle = '#ff4a3a'; g.fillText('▼ GUN MAKERS', Math.min(red[0] - 120, w - 300), Math.min(red[1] + 48, h - 14)); g.fillStyle = '#3ad87a'; g.fillText('▲ HOME ALARMS', Math.min(grn[0] - 150, w - 320), Math.max(grn[1] - 24, 140));
  MKTV.tex.needsUpdate = true; }

// ---------- 5) THE MARCH in front of the White House: two crowds with signs facing each other across the drive, you in the middle with a hot dog ----------
const MARCHP = []; { const sc = WH.sc, r0 = seed; seed = 9191;
  const L = ['GIVE THEM BACK', 'WHERE ARE OUR GUNS?', 'HUNTERS UNITED', 'I MISS MY RIFLE', '383,000 JOBS!', 'BRING THEM BACK'], Rr = ['KEEP THEM GONE', 'NO REFUNDS', 'FINALLY', 'GOOD RIDDANCE', 'DON\'T BRING THEM BACK', 'KEEP THEM GONE'];
  const signTex = {}; const sT = (txt, bg, fg) => signTex[txt + bg] || (signTex[txt + bg] = canvasTex(320, 200, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center';
    const ws = txt.split(' '), lines = []; let ln = ''; for (const wd of ws) { if ((ln + ' ' + wd).trim().length > 10 && ln) { lines.push(ln); ln = wd; } else ln = (ln + ' ' + wd).trim(); } lines.push(ln); const fs = lines.length > 2 ? 46 : 56; g.font = `900 ${fs}px Inter`;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.05 + fs * 0.36)); }));
  for (const side of [-1, 1]) for (let i = 0; i < 64; i++) { const row = i % 8, col = (i / 8) | 0, hunter = side < 0 && rnd() < 0.3;
    const p = makePerson(rnd, hunter ? { top: '#ff7a1a', cap: true } : {}); sc.add(p.outer);
    const x = side * (4.6 + row * 1.0 + 0.4 * rnd()), z = 16 + col * 1.6 + 0.6 * rnd(), sign = rnd() < 0.55;
    let sgn = null; if (sign) { sgn = new THREE.Group(); const txt = side < 0 ? pick(L) : pick(Rr), bg = side < 0 ? pick(['#ffffff', '#f4d040', '#ff7a1a']) : pick(['#ffffff', '#8ad0f0', '#f4c4d8']);
      const pl = mesh(new THREE.PlaneGeometry(0.62, 0.39), new THREE.MeshStandardMaterial({ map: sT(txt, bg, '#1a1a22'), side: THREE.DoubleSide, roughness: 0.8 }), true, false); pl.position.y = 0.5; sgn.add(pl);
      const stick = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.7), M('#a8784a')); stick.position.y = 0.05; sgn.add(stick); p.elbows[1].add(sgn); sgn.position.set(0, -0.28, 0); }
    MARCHP.push({ p, x, z, side, ph: rnd() * 6, sgn, ry: side < 0 ? Math.PI / 2 : -Math.PI / 2 }); }
  seed = r0; }
function updateMarch(t) { MARCHP.forEach(w => { const p = w.p; p.outer.visible = true; p.outer.position.set(w.x, 0.95 + 0.05 * Math.max(0, Math.sin(t * 6 + w.ph)), w.z); p.outer.rotation.set(0, w.ry + 0.25 * Math.sin(t * 0.8 + w.ph), 0); poseIdle(p, t, w.ph);
    if (w.sgn) { const pump = Math.sin(t * 5 + w.ph); p.arms[1].rotation.set(-2.7 - 0.25 * pump, 0, -0.15); p.elbows[1].rotation.x = -0.2 - 0.2 * pump; w.sgn.rotation.set(Math.PI - 0.2, 0, 0); p.arms[0].rotation.set(-0.5 * Math.max(0, pump), 0, 0.2); }
    else { const f = Math.sin(t * 7 + w.ph); p.arms.forEach((a, i) => a.rotation.set(-2.4 - 0.4 * (i ? f : -f), 0, (i ? -1 : 1) * 0.35)); p.elbows.forEach(e => e.rotation.x = -0.5); } });
  const s = WHS.flag.geometry.attributes.position, p0 = WHS.flag.userData.p0; for (let i = 0; i < s.count; i++) { const x = p0[i * 3] + 1.5; s.setZ(i, 0.18 * x * Math.sin(x * 2.2 - t * 5)); } s.needsUpdate = true; }

// ---------- 6) CONGRESS: a half-ring of wooden desks on tiers, everyone on their feet yelling, the Speaker banging the gavel ----------
const CON = mkSet({ top: '#3a2e28', bot: '#3a2e28', fog: 0x2a2220, near: 25, far: 60, hemi: [0xfff0dc, 0x5a4434, 0.9], sun: [0xfff0d8, 1.6, V3(4, 14, 10)], shadow: 16 });
const CG = {}; { const sc = CON.sc, wood = F_('#7a4a2a', { roughness: 0.55 }), wood2 = F_('#5a3420', { roughness: 0.6 });
  gplane(sc, 40, 40, F_('#2a4a8a', { roughness: 1 }), 0, 0); const wall = F_('#e8dcc4', { roughness: 0.8 });
  rb(30, 10, 0.4, wall, 0, 5, -4.5, sc, 0.02); for (let i = 0; i < 9; i++) { const c = mesh(new THREE.CylinderGeometry(0.28, 0.32, 8, 14), F_('#d8ccb4')); c.position.set(-8 + i * 2, 4, -4.1); sc.add(c); }
  rb(5.4, 0.7, 1.8, wood2, 0, 0.35, -3.3, sc, 0.03); rb(4.4, 1.2, 1.0, wood, 0, 0.6, -1.9, sc, 0.04); rb(2.6, 1.0, 0.6, wood, 0, 1.2, -2.75, sc, 0.04);   // rostrum: platform, front desk, the Speaker's desk
  const seal = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8a050'; g.beginPath(); g.arc(128, 128, 120, 0, 6.3); g.fill(); g.fillStyle = '#2a3a6a'; g.beginPath(); g.arc(128, 128, 100, 0, 6.3); g.fill(); g.fillStyle = '#e8dcc4'; g.font = '900 120px Inter'; g.textAlign = 'center'; g.fillText('★', 128, 170); });
  const sm = mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({ map: seal, roughness: 0.6 }), false, false); sm.position.set(0, 3.6, -4.28); sc.add(sm);
  const flagT = canvasTex(192, 120, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8202a'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#2a3a7a'; g.fillRect(0, 0, w * 0.4, h * 7 / 13); g.fillStyle = '#fff'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.fillRect(6 + c * 12, 6 + r * 12, 4, 4); });
  const fl = mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshStandardMaterial({ map: flagT, roughness: 0.8 }), false, false); fl.position.set(0, 6.4, -4.27); sc.add(fl);
  for (const x of [-6, 6]) { const L2 = new THREE.PointLight(0xffd8a0, 30, 16, 1.6); L2.position.set(x, 6, 2); sc.add(L2); }
  CG.people = []; const r0 = seed; seed = 2727;
  for (let r = 0; r < 4; r++) { const R0 = 3.6 + r * 1.5, y = r * 0.42, nA = 9 + r * 3; if (r) { const tg = new THREE.RingGeometry(R0 - 0.75, R0 + 0.75, 40, 1, Math.PI * 0.08, Math.PI * 0.84); tg.rotateX(-Math.PI / 2); const tm = mesh(tg, F_('#2a4a8a', { roughness: 1 }), false, true); tm.position.set(0, y, -1.6); sc.add(tm); }
    for (let i = 0; i < nA; i++) { const a = Math.PI * (0.1 + 0.8 * (i + 0.5) / nA), x = Math.cos(a) * R0, z = -1.6 + Math.sin(a) * R0, ry = Math.atan2(-x, -(z + 1.6));
      const d = rb(0.9, 0.75, 0.42, wood, 0, 0, 0, sc, 0.03); d.position.set(Math.cos(a) * (R0 - 0.45), y + 0.37, -1.6 + Math.sin(a) * (R0 - 0.45)); d.rotation.y = ry;
      const p = makePerson(rnd, { top: pick(['#1e2430', '#2a2e3a', '#3a3a42', '#1a1e28', '#5a2a2a', '#2a3a5a']), bottom: '#1e2028', cap: false, longSleeve: true, dress: false, shorts: false }); sc.add(p.outer);
      CG.people.push({ p, x, y, z, ry, ph: rnd() * 6, yell: rnd() < 0.75 }); } }
  CG.spk = makeBlock({ head: 'human', body: 'human', skin: '#e8b898', hair: '#e8e4dc', browCol: '#b8b0a8', top: '#1e2430', bottom: '#1e2028', shoe: '#1a1a1e', hairStyle: 'short', headS: 0.88, glasses: '#2a2420' }); sc.add(CG.spk.outer);
  CG.gavel = new THREE.Group(); { const hd = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 10), wood2); hd.rotation.z = Math.PI / 2; hd.position.y = -0.2; CG.gavel.add(hd); const hn = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), wood2); hn.position.y = -0.1; CG.gavel.add(hn); }
  seed = r0; }
function updateCongress(t) { CG.people.forEach(w => { const p = w.p; p.outer.position.set(w.x, w.y + 0.95 + (w.yell ? 0.04 * Math.max(0, Math.sin(t * 8 + w.ph)) : 0), w.z); p.outer.rotation.set(0, w.ry + 0.3 * Math.sin(t * 1.3 + w.ph), 0);
    if (w.yell) { poseFlail(p, t * 0.6, w.ph); p.legs.forEach(l => l.rotation.x = 0); p.knees.forEach(k => k.rotation.x = 0); } else poseIdle(p, t, w.ph); });
  const S = CG.spk; poseReset(S, t); place(S, 0, -3.4, 0, 0.7); const bang = Math.pow(Math.abs(Math.sin(t * 6)), 0.5); S.arms[1].rotation.set(-1.0 - 1.1 * bang, 0, -0.1); S.elbows[1].rotation.x = -0.6 - 0.3 * bang; holdIn(S, 1, CG.gavel, V3(0, -0.28, 0.04));
  S.arms[0].rotation.set(-0.9, 0, 0.3); S.elbows[0].rotation.x = -0.8; S.face(t < CONG + 4.2 ? 'angry' : 'dumb', t); }

// ---------- 7) THE FBI ROOM: dark, a case board (cork, photos of empty safes, the US map, red strings), three agents, a desk lamp ----------
const FBIS = mkSet({ top: '#0c1018', bot: '#0c1018', fog: 0x0a0c12, near: 12, far: 40, hemi: [0x8aa0d8, 0x1a1a22, 0.45], sun: [0x8ab0ff, 0.5, V3(-6, 8, 6)], shadow: 8 });
const FB = {}; { const sc = FBIS.sc; gplane(sc, 16, 16, F_('#3a3c42', { roughness: 0.9 }), 0, 0); rb(16, 3.2, 0.2, F_('#4a4e58'), 0, 1.6, -3.2, sc, 0.02); rb(0.2, 3.2, 16, F_('#4a4e58'), -4, 1.6, 0, sc, 0.02);
  const board = canvasTex(1200, 720, (g, w, h) => { g.fillStyle = '#b8864e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = hash(i * 1.3) < 0.5 ? '#a8763e' : '#c8965e'; g.fillRect(hash(i * 2.1) * w, hash(i * 3.7) * h, 3, 3); }
    g.fillStyle = '#f4f0e6'; g.fillRect(380, 200, 440, 280); g.strokeStyle = '#3a4a6a'; g.lineWidth = 5; g.beginPath();
    const us = [[0.02, 0.18], [0.3, 0.12], [0.62, 0.15], [0.8, 0.08], [0.98, 0.12], [0.93, 0.4], [0.85, 0.62], [0.88, 0.95], [0.74, 0.7], [0.55, 0.8], [0.45, 0.98], [0.32, 0.75], [0.14, 0.72], [0.0, 0.5]];
    us.forEach(([x, y], i) => { const X = 400 + x * 400, Y = 215 + y * 250; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); g.fillStyle = '#e8463a'; g.font = '900 58px Inter'; g.textAlign = 'center'; g.fillText('?', 600, 370);
    const pins = []; const photo = (x, y, r, label) => { g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = '#f8f6f0'; g.fillRect(-90, -80, 180, 160); g.fillStyle = '#2a2e34'; g.fillRect(-72, -64, 144, 104); g.fillStyle = '#5a5e66'; g.fillRect(-52, -50, 104, 78);
      g.fillStyle = '#1a1a22'; g.font = '700 22px Inter'; g.textAlign = 'center'; g.fillText(label, 0, 66); g.restore(); pins.push([x, y - 70]); };
    photo(160, 150, -0.08, 'EMPTY SAFE'), photo(170, 470, 0.06, 'EMPTY STORE'), photo(1040, 160, 0.07, 'EMPTY HOLSTER'), photo(1030, 480, -0.05, 'EMPTY RACK'), photo(600, 620, 0.03, 'NO LEADS');
    g.strokeStyle = '#d8202a'; g.lineWidth = 4; for (const [x, y] of pins) { g.beginPath(); g.moveTo(x, y); g.lineTo(600, 340); g.stroke(); }
    g.fillStyle = '#d8202a'; for (const [x, y] of [...pins, [600, 340]]) { g.beginPath(); g.arc(x, y, 10, 0, 6.3); g.fill(); }
    g.fillStyle = '#f8f6f0'; g.fillRect(420, 30, 360, 110); g.fillStyle = '#1a1a22'; g.font = '800 34px Inter'; g.fillText('CASE: 393,300,000', 600, 78); g.font = '700 26px Inter'; g.fillText('GUNS MISSING', 600, 118); });
  const bd = mesh(new THREE.PlaneGeometry(3.2, 1.92), new THREE.MeshStandardMaterial({ map: board, roughness: 0.9 }), false, true); bd.position.set(0.4, 1.7, -3.05); sc.add(bd); rb(3.3, 2.02, 0.05, F_('#5a3a22'), 0.4, 1.7, -3.1, sc, 0.01);
  rb(1.8, 0.06, 0.9, F_('#5a4a3a'), -1.6, 0.76, -1.2, sc, 0.02); for (const [x, z] of [[-2.4, -1.55], [-0.8, -1.55], [-2.4, -0.85], [-0.8, -0.85]]) rb(0.06, 0.74, 0.06, F_('#3a3a3a'), x, 0.37, z, sc, 0.01);
  for (let i = 0; i < 4; i++) rb(0.3, 0.012, 0.4, F_('#f4f2ea'), -2.1 + 0.25 * i, 0.8 + 0.004 * i, -1.2 + 0.1 * Math.sin(i * 3), sc, 0.003).rotation.y = i * 0.4;
  for (const x of [-1.0, -2.3]) { const cp = mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 10), M('#f4f0e8')); cp.position.set(x, 0.84, -1.0); sc.add(cp); }
  FB.lamp = new THREE.PointLight(0xffd090, 6, 6, 1.4); FB.lamp.position.set(-1.0, 1.4, -1.5); sc.add(FB.lamp); const sh = mesh(new THREE.ConeGeometry(0.16, 0.18, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#2a5a3a', emissive: '#ffd090', emissiveIntensity: 0.3, side: THREE.DoubleSide })); sh.position.set(-1.0, 1.32, -1.5); sc.add(sh);
  FB.spot = new THREE.SpotLight(0xfff0d8, 16, 10, 0.6, 0.6, 1.2); FB.spot.position.set(0.4, 3.0, -0.6); FB.spot.target.position.set(0.4, 1.6, -3.1); sc.add(FB.spot, FB.spot.target);
  const suit = { top: '#1e2430', bottom: '#1e2028', shoe: '#1a1a1e', headS: 0.88 };
  FB.a = makeBlock({ head: 'human', body: 'human', skin: '#c98d62', hair: '#1c1612', hairStyle: 'short', ...suit }); FB.b = makeBlock({ head: 'human', body: 'human', skin: '#f0c8a4', hair: '#7a3a1e', hairStyle: 'long', lip: '#b8404a', h: 0.95, ...suit });
  FB.c = makeBlock({ head: 'human', body: 'human', skin: '#e2ae86', hair: '#5a4434', hairStyle: 'short', glasses: '#2a2420', ...suit }); sc.add(FB.a.outer, FB.b.outer, FB.c.outer); }
function updateFBI(t) { const { a, b, c } = FB; for (const P of [a, b, c]) poseReset(P, t);
  place(a, 1.25, -1.9, -0.35); a.arms[1].rotation.set(-1.75, 0, -0.2); a.elbows[1].rotation.x = -0.15; a.face(t < 49.3 ? 'squint' : 'surprised', t);
  place(b, -0.3, -1.55, 0.3); b.arms.forEach((x, i) => x.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.15)); b.elbows.forEach(e => e.rotation.x = -1.6); b.face(t < 48 ? 'worried' : 'squint', t);
  place(c, 0.4, -0.5, Math.PI + 0.1 * Math.sin(t * 0.6)); c.outer.rotation.y = 0.0 + 0.2 * Math.sin(t * 0.5); c.arms[0].rotation.set(-0.3, 0, 0.1); c.arms[1].rotation.set(-1.9, 0, 0); c.elbows[1].rotation.x = -2.0; c.face(t < 50 ? 'reading' : 'surprised', t); }

// ---------- the US map: every lit dot = guns; at midnight each region flashes white and goes dark ----------
lightsMat.fragmentShader = lightsMat.fragmentShader.replace('vec3 col=base+vec3(1.0,0.78,0.42)*pow(lit,2.2)*1.6*on;',
  'float fl=exp(-pow((uOff-when)/0.012,2.0)); vec3 col=base+vec3(1.0,0.62,0.3)*pow(lit,1.8)*1.8*on+vec3(1.4,1.3,1.2)*fl*(0.25+pow(lit,1.2)*2.5);');
