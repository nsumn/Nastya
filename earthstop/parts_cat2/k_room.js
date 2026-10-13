
// =================== LIVING ROOM (meters), low-poly: planks, painted walls, window, sofa, table, shelf, plant, rug, door with a cat flap ===================
const room = new THREE.Scene(); room.background = new THREE.Color('#9ec9ee');
const rCam = new THREE.PerspectiveCamera(70, W / H, 0.02, 80);
room.add(new THREE.HemisphereLight(0xdfe9ff, 0x8a6a4a, 1.0));
const sun = new THREE.DirectionalLight(0xfff0dc, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.01; sun.shadow.radius = 3;
sun.position.set(-3.5, 3.2, -6.0); sun.target.position.set(0.4, 0, 0.6); room.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xffe8d0, 0.6); fill.position.set(2, 2.5, 4); room.add(fill);
const ROOM = { w: 6.0, d: 6.0, h: 2.7 };
const props = {};
function bx(w, h, d, col, x, y, z, parent = room, opts = {}) { const m = mesh(BOX, M(col, { flatShading: true, ...opts })); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function grp(x, y, z, ry = 0, parent = room) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
{
  const planks = canvasTex(512, 512, (g, w, h) => { for (let r = 0; r < 8; r++) { let x = (r % 2) * -90; while (x < w) { const L = R(120, 260); g.fillStyle = pick(['#b98552', '#c8955f', '#a8744a', '#c08a55', '#b07b4c']); g.fillRect(x, r * 64, L - 3, 61); g.fillStyle = 'rgba(70,40,20,0.12)'; for (let k = 0; k < 6; k++) g.fillRect(x, r * 64 + R(4, 57), L - 3, 1.5); x += L; } } }, [3, 3]);
  const floor = mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.55 }), false, true); floor.rotation.x = -Math.PI / 2; room.add(floor);
  const wallM = M('#efe6d8', { roughness: 0.95 });
  const wall = (w, h, x, y, z, ry) => { const m = mesh(new THREE.PlaneGeometry(w, h), wallM, true, true); m.position.set(x, y, z); m.rotation.y = ry; room.add(m); return m; };
  const BZ = -ROOM.d / 2, WX0 = -1.6, WX1 = -0.2, WY0 = 0.75, WY1 = 2.2;
  wall(WX0 + ROOM.w / 2, ROOM.h, (-ROOM.w / 2 + WX0) / 2, ROOM.h / 2, BZ, 0); wall(ROOM.w / 2 - WX1, ROOM.h, (WX1 + ROOM.w / 2) / 2, ROOM.h / 2, BZ, 0);
  wall(WX1 - WX0, WY0, (WX0 + WX1) / 2, WY0 / 2, BZ, 0); wall(WX1 - WX0, ROOM.h - WY1, (WX0 + WX1) / 2, (WY1 + ROOM.h) / 2, BZ, 0);
  wall(ROOM.d, ROOM.h, -ROOM.w / 2, ROOM.h / 2, 0, Math.PI / 2); wall(ROOM.d, ROOM.h, ROOM.w / 2, ROOM.h / 2, 0, -Math.PI / 2); wall(ROOM.w, ROOM.h, 0, ROOM.h / 2, ROOM.d / 2, Math.PI);
  const ceil = mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), M('#f6f1e8'), false, false); ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; room.add(ceil);
  for (const [w, h, x, y] of [[WX1 - WX0 + 0.1, 0.07, (WX0 + WX1) / 2, WY0], [WX1 - WX0 + 0.1, 0.07, (WX0 + WX1) / 2, WY1], [0.07, WY1 - WY0, WX0, (WY0 + WY1) / 2], [0.07, WY1 - WY0, WX1, (WY0 + WY1) / 2], [0.045, WY1 - WY0, (WX0 + WX1) / 2, (WY0 + WY1) / 2]]) bx(w, h, 0.12, '#fbf8f2', x, y, BZ);
  bx(WX1 - WX0 + 0.3, 0.05, 0.26, '#fbf8f2', (WX0 + WX1) / 2, WY0 - 0.02, BZ + 0.1);
  // outside the window: sky, a lawn, a tree, a neighbour's house
  const out = grp(0, 0, BZ - 0.2); bx(30, 0.1, 20, '#7fbf55', 0, 0.3, -10, out); const tr = grp(-2.4, 0.3, -5, 0, out); bx(0.25, 1.6, 0.25, '#6b4a2e', 0, 0.8, 0, tr); const crown = mesh(new THREE.IcosahedronGeometry(1.1, 0), M('#4f9a3c', { flatShading: true })); crown.position.y = 2.2; tr.add(crown);
  const hs = grp(1.2, 0.3, -9, 0, out); bx(4, 2.6, 3, '#e8c7a0', 0, 1.3, 0, hs); const roof = mesh(new THREE.ConeGeometry(3.0, 1.4, 4), M('#a8473a', { flatShading: true })); roof.rotation.y = Math.PI / 4; roof.position.y = 3.3; roof.scale.set(1, 1, 0.75); hs.add(roof);
  for (const [w, x, z, ry] of [[ROOM.w, 0, BZ + 0.012, 0], [ROOM.d, -ROOM.w / 2 + 0.012, 0, Math.PI / 2], [ROOM.d, ROOM.w / 2 - 0.012, 0, -Math.PI / 2], [ROOM.w, 0, ROOM.d / 2 - 0.012, Math.PI]]) { const b = bx(w, 0.1, 0.025, '#fbf8f2', x, 0.05, z); b.rotation.y = ry; }
  // rug: bold red / cream zigzags (the red will vanish for the cat)
  const rugT = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#efe2c8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8302a'; g.lineWidth = 26; for (let row = 0; row < 5; row++) { g.beginPath(); for (let x = -20; x <= w + 40; x += 64) g.lineTo(x, 50 + row * 72 + ((x / 64) % 2 ? 22 : -22)); g.stroke(); } g.strokeStyle = '#2f5d8a'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28); });
  const rug = mesh(new THREE.BoxGeometry(2.6, 0.014, 1.9), new THREE.MeshStandardMaterial({ map: rugT, roughness: 1 }), false, true); rug.position.set(0.2, 0.007, 0.0); room.add(rug);
  // sofa
  const so = grp(0.25, 0, -1.55); const SC = '#3e7aa8'; bx(2.1, 0.32, 0.9, SC, 0, 0.22, 0, so); bx(2.1, 0.7, 0.22, SC, 0, 0.55, -0.36, so); for (const sx of [-1, 1]) bx(0.2, 0.55, 0.9, SC, sx * 0.95, 0.38, 0, so);
  for (const sx of [-0.48, 0.48]) bx(0.92, 0.14, 0.62, '#4c8cbc', sx, 0.44, 0.08, so); for (const sx of [-0.85, 0.85]) for (const sz of [-0.38, 0.38]) bx(0.06, 0.08, 0.06, '#3a2a1c', sx, 0.04, sz, so);
  bx(0.4, 0.34, 0.12, '#f0b23e', -0.55, 0.65, -0.22, so).rotation.z = 0.15; bx(0.4, 0.34, 0.12, '#e05a6a', 0.6, 0.65, -0.22, so).rotation.z = -0.12;
  props.sofa = so;
  // coffee table
  const ta = grp(0.2, 0.014, 0.05); bx(1.1, 0.05, 0.6, '#9a6a40', 0, 0.42, 0, ta); for (const sx of [-0.5, 0.5]) for (const sz of [-0.25, 0.25]) bx(0.05, 0.4, 0.05, '#7a5030', sx, 0.2, sz, ta); bx(0.2, 0.25, 0.14, '#e8e8e8', 0.25, 0.57, 0.05, ta); props.table = ta;
  // armchair
  const ch = grp(-1.75, 0, -1.25, 0.9); const CC = '#d9a63a'; bx(0.85, 0.36, 0.8, CC, 0, 0.26, 0, ch); bx(0.85, 0.6, 0.18, CC, 0, 0.62, -0.32, ch); for (const sx of [-1, 1]) bx(0.15, 0.5, 0.8, CC, sx * 0.38, 0.35, 0, ch); props.chair = ch;
  // bookshelf with colourful books
  const sh = grp(2.75, 0, -1.6, -Math.PI / 2); bx(1.3, 2.0, 0.34, '#8a5a34', 0, 1.0, -0.02, sh);
  for (let s = 0; s < 4; s++) { bx(1.22, 0.03, 0.3, '#a8754a', 0, 0.12 + s * 0.48, 0.02, sh); let x = -0.58; while (x < 0.56) { const bw = R(0.03, 0.07), bh = R(0.24, 0.38); bx(bw, bh, 0.24, pick(['#c8302a', '#2f5d8a', '#e0b040', '#3c8a52', '#7a4a8c', '#e8e2d0', '#d46a3a', '#1f2a3a']), x + bw / 2, 0.135 + s * 0.48 + bh / 2, 0.04, sh); x += bw + 0.004; } }
  props.shelf = sh;
  // plant
  const pl = grp(-2.2, 0, -2.3); const pot = mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.38, 10), M('#c46a3a', { flatShading: true })); pot.position.y = 0.19; pl.add(pot);
  for (let i = 0; i < 9; i++) { const lf = mesh(new THREE.IcosahedronGeometry(R(0.16, 0.26), 0), M(pick(['#3f8a3a', '#4f9a44', '#2f7a34']), { flatShading: true })); lf.position.set(R(-0.25, 0.25), R(0.5, 1.15), R(-0.25, 0.25)); lf.scale.y = R(0.6, 1.0); pl.add(lf); }
  props.plant = pl;
  // pillow on the floor
  const pw = bx(0.5, 0.14, 0.45, '#8c5ab0', -0.9, 0.07, 1.0); pw.rotation.y = 0.5;
}
// colour line-up on the rug
{
  const ap = grp(-0.62, 0.014, 0.95); const a = mesh(new THREE.IcosahedronGeometry(0.05, 2), M('#d0201c', { roughness: 0.45 })); a.scale.y = 0.9; a.position.y = 0.045; ap.add(a);
  const st = mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.03, 6), M('#5a3a1c')); st.position.y = 0.1; ap.add(st); const lf = mesh(new THREE.SphereGeometry(0.018, 8, 6), M('#3c8a32')); lf.scale.set(1, 0.3, 0.5); lf.position.set(0.012, 0.105, 0); ap.add(lf); props.apple = ap;
  const li = mesh(new THREE.IcosahedronGeometry(0.035, 2), M('#4caa2c', { roughness: 0.5 })); li.scale.set(1, 0.85, 1.2); li.position.set(-0.38, 0.045, 1.0); room.add(li); props.lime = li;
  const pk = grp(-0.1, 0.014, 0.98); const pg = new THREE.SphereGeometry(0.09, 40, 20); const pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); const k = 1 - 0.08 * Math.pow(Math.abs(Math.cos(Math.atan2(z, x) * 5)), 0.5); pp.setXYZ(i, x * k, y * 0.78, z * k); }
  pg.computeVertexNormals(); const pu = mesh(pg, M('#ee7420', { roughness: 0.55 })); pu.position.y = 0.07; pk.add(pu); const ps = mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.05, 6), M('#4a6a2a')); ps.position.y = 0.15; pk.add(ps); props.pumpkin = pk;
  const le = mesh(new THREE.IcosahedronGeometry(0.038, 2), M('#f2d21c', { roughness: 0.5 })); le.scale.set(1.35, 0.95, 0.95); le.position.set(0.15, 0.05, 1.02); le.rotation.y = 0.4; room.add(le); props.lemon = le;
  const du = grp(0.42, 0.014, 0.95, 2.6); const body = mesh(new THREE.SphereGeometry(0.06, 16, 12), M('#f6d020', { roughness: 0.4 })); body.scale.set(1.25, 0.85, 1); body.position.y = 0.05; du.add(body);
  const hd = mesh(new THREE.SphereGeometry(0.038, 14, 10), M('#f6d020', { roughness: 0.4 })); hd.position.set(0.05, 0.12, 0); du.add(hd); const bk = mesh(new THREE.BoxGeometry(0.035, 0.012, 0.03), M('#f08a20')); bk.position.set(0.09, 0.115, 0); du.add(bk);
  for (const sz of [-0.018, 0.018]) { const e = mesh(new THREE.SphereGeometry(0.006, 6, 4), M('#111')); e.position.set(0.075, 0.13, sz); du.add(e); } props.duck = du;
  const bl = mesh(new THREE.SphereGeometry(0.05, 24, 16), M('#1f5fe0', { roughness: 0.3 })); bl.position.set(0.72, 0.064, 0.98); room.add(bl); props.blue = bl;
}
// the mouse + its hole
{
  const m = new THREE.Group(); const fur = M('#8d8680', { flatShading: true }); const pink = M('#e9a0a8');
  const b = mesh(new THREE.SphereGeometry(0.03, 12, 8), fur); b.scale.set(1, 0.8, 1.7); b.position.y = 0.025; m.add(b);
  const hd = mesh(new THREE.ConeGeometry(0.022, 0.05, 10), fur); hd.rotation.x = -Math.PI / 2; hd.position.set(0, 0.03, -0.065); m.add(hd);
  const nose = mesh(new THREE.SphereGeometry(0.005, 6, 4), pink); nose.position.set(0, 0.03, -0.09); m.add(nose);
  for (const sx of [-1, 1]) { const ear = mesh(new THREE.CircleGeometry(0.014, 10), pink); ear.position.set(sx * 0.016, 0.052, -0.05); ear.rotation.set(-0.2, sx * 0.4, 0); m.add(ear); const e = mesh(new THREE.SphereGeometry(0.004, 6, 4), M('#111')); e.position.set(sx * 0.012, 0.038, -0.075); m.add(e); }
  const tail = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0.02, 0.05), V3(0.01, 0.015, 0.09), V3(-0.01, 0.01, 0.13), V3(0.015, 0.008, 0.17)]), 12, 0.003, 5), pink); m.add(tail);
  room.add(m); props.mouse = m;
  const hole = mesh(new THREE.CircleGeometry(0.05, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#0a0806' }), false, false); hole.position.set(-ROOM.w / 2 + 0.03, 0.0, 0.6); hole.rotation.y = Math.PI / 2; room.add(hole);
}
// front door with a cat flap
{
  const g = grp(ROOM.w / 2 - 0.04, 0, 1.8, -Math.PI / 2); const DC = '#f4f1ea';
  const FW = 0.2, FY0 = 0.05, FY1 = 0.27; bx(0.9, 2.05 - FY1, 0.04, DC, 0, (FY1 + 2.05) / 2, 0, g); bx(0.9, FY0, 0.04, DC, 0, FY0 / 2, 0, g); bx((0.9 - FW) / 2, FY1 - FY0, 0.04, DC, -(0.9 + FW) / 4, (FY0 + FY1) / 2, 0, g); bx((0.9 - FW) / 2, FY1 - FY0, 0.04, DC, (0.9 + FW) / 4, (FY0 + FY1) / 2, 0, g);
  for (const [w, h, x, y] of [[0.06, 2.1, -0.48, 1.05], [0.06, 2.1, 0.48, 1.05], [1.02, 0.06, 0, 2.08]]) bx(w, h, 0.06, '#e9e2d4', x, y, 0.01, g);
  const knob = mesh(new THREE.SphereGeometry(0.03, 12, 8), M('#c8a050', { metalness: 0.8, roughness: 0.3 })); knob.position.set(0.36, 1.0, 0.05); g.add(knob);
  const fp = new THREE.Group(); fp.position.set(0, FY1, 0); g.add(fp); const flap = bx(FW, FY1 - FY0, 0.008, '#9a9a9a', 0, -(FY1 - FY0) / 2, 0, fp, { transparent: true, opacity: 0.75 });
  const outside = mesh(new THREE.PlaneGeometry(FW, FY1 - FY0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.6, 2.4) }), false, false); outside.position.set(0, (FY0 + FY1) / 2, -0.03); g.add(outside);
  props.flap = fp;
}
// food corner: a bowl and a slice of cake on the floor
{
  const bw = mesh(new THREE.LatheGeometry([new THREE.Vector2(0.05, 0), new THREE.Vector2(0.11, 0.01), new THREE.Vector2(0.13, 0.06), new THREE.Vector2(0.12, 0.065), new THREE.Vector2(0.1, 0.02)], 24), M('#3a8ad0', { roughness: 0.35, side: THREE.DoubleSide })); bw.position.set(2.35, 0, 2.55); room.add(bw);
  const kib = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20), M('#8a5a2a', { flatShading: true })); kib.position.set(2.35, 0.045, 2.55); room.add(kib);
  const ck = grp(2.0, 0, 2.62, 0.6); const wedge = s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.14, -0.05); sh.lineTo(0.14, 0.05); sh.lineTo(0, 0); return new THREE.ExtrudeGeometry(sh, { depth: s, bevelEnabled: false }); };
  [['#5a3220', 0.03], ['#f4e0e8', 0.012], ['#6a3a24', 0.03], ['#f6c8d4', 0.016]].reduce((y, [c, hgt]) => { const m = mesh(wedge(hgt), M(c, { flatShading: true })); m.rotation.x = -Math.PI / 2; m.position.y = y; ck.add(m); return y + hgt; }, 0.01);
  const plate = mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.01, 24), M('#f6f6f2')); plate.position.set(0.07, 0.005, 0); ck.add(plate);
  const sb = mesh(new THREE.ConeGeometry(0.015, 0.03, 8), M('#e02a3a')); sb.position.set(0.1, 0.12, 0); sb.rotation.z = Math.PI; ck.add(sb); props.cake = ck;
}
