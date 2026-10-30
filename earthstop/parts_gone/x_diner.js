// =================== THE OPENING (her request, Oct 30): a packed fast-food place (generic "BURGER BARN" — no real brand), everyone eating fries;
// at 2.2–3.7 s every customer vanishes in a puff (a poof sound each, audio_gone.py reads the same times), the trays stay; you two at the window booth look at each other.
// Room: x -8..8 (window wall at +8), z -10..10, counter + menu boards at the back (z -8). The booth: table at (5.6, 3.0), you at z 3.55 facing -z, him at z 2.45 facing +z. ===================
const DIN = mkSet({ top: '#f4ecd8', bot: '#f4ecd8', fog: 0xf4ecd8, near: 30, far: 80, hemi: [0xfff4e4, 0x8a6a50, 1.25], sun: [0xfff0d8, 1.6, V3(14, 12, 5)], shadow: 14 });
const DN = {}; {
  const sc = DIN.sc;
  const tile = canvasTex(128, 128, (g, w, h) => { for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { g.fillStyle = (r + c) % 2 ? '#f4efe4' : '#c8302a'; g.fillRect(c * 64, r * 64, 64, 64); } }, [26, 32]);
  gplane(sc, 16.4, 21, new THREE.MeshStandardMaterial({ map: tile, roughness: 0.4 }), 0, 0);
  const ceil = mesh(new THREE.PlaneGeometry(16.4, 21), new THREE.MeshBasicMaterial({ color: '#d8ccb4' }), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.6; sc.add(ceil);
  for (let z = -8; z <= 8; z += 3.2) for (const x of [-5, -1, 3]) { const l = mesh(new THREE.BoxGeometry(1.6, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: '#fffaf0' }), false, false); l.position.set(x, 3.57, z); sc.add(l); }
  // walls: yellow below, deep red above (the title sits over the upper wall: orange on yellow was unreadable)
  const wall = (w, x, z, ry) => { for (const [hh, y, col] of [[1.2, 0.6, '#f4c440'], [2.4, 2.4, '#8a2620']]) { const p = mesh(new THREE.PlaneGeometry(w, hh), F_(col), false, true); p.position.set(x, y, z); p.rotation.y = ry; sc.add(p); } };
  wall(16.4, 0, -10.2, 0); wall(16.4, 0, 10.4, Math.PI); wall(21, -8.2, 0, Math.PI / 2);
  // the window wall: the street outside (cabs, towers) as a bright picture behind mullions
  const street = canvasTex(1024, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9cc4ec'); gr.addColorStop(1, '#f4e8d8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) { const x = i * 76 + 10 * hash(i), bw = 60 + 30 * hash(i * 2), bh = 120 + 120 * hash(i * 3); g.fillStyle = ['#b8705a', '#d8ccb4', '#8a8c94', '#c8a07a'][i % 4]; g.fillRect(x, h - 70 - bh, bw, bh);
      g.fillStyle = 'rgba(40,60,80,0.55)'; for (let r = 0; r < bh / 16 - 1; r++) for (let c = 0; c < bw / 14 - 1; c++) g.fillRect(x + 5 + c * 14, h - 70 - bh + 6 + r * 16, 7, 9); }
    g.fillStyle = '#5a5c64'; g.fillRect(0, h - 70, w, 70); g.fillStyle = '#b8b4ac'; g.fillRect(0, h - 70, w, 14);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#f4c430'; g.fillRect(40 + i * 210, h - 52, 90, 30); g.fillStyle = '#2a3a4a'; g.fillRect(58 + i * 210, h - 48, 50, 12); } });
  const win = mesh(new THREE.PlaneGeometry(21, 3.2), new THREE.MeshBasicMaterial({ map: street }), false, false); win.position.set(8.2, 1.85, 0); win.rotation.y = -Math.PI / 2; sc.add(win);
  for (let z = -10; z <= 10.5; z += 2.6) rb(0.12, 3.6, 0.12, F_('#2e3034', { metalness: 0.4 }), 8.1, 1.8, z, sc, 0.02);
  rb(0.2, 0.25, 21, F_('#2e3034', { metalness: 0.4 }), 8.1, 0.12, 0, sc, 0.02); rb(0.2, 0.15, 21, F_('#2e3034', { metalness: 0.4 }), 8.1, 3.5, 0, sc, 0.02);
  // the counter, registers, the sign and three menu boards
  rb(11, 1.05, 1.0, F_('#c8302a'), -1.5, 0.52, -8.0, sc, 0.05); rb(11.2, 0.06, 1.15, F_('#d8d8dc', { roughness: 0.3 }), -1.5, 1.07, -8.0, sc, 0.02);
  for (const x of [-5, -2, 1]) { rb(0.4, 0.3, 0.35, F_('#2a2a30'), x, 1.25, -8.1, sc, 0.03); rb(0.36, 0.2, 0.04, new THREE.MeshBasicMaterial({ color: '#7ad8a8' }), x, 1.45, -7.96, sc, 0.01); }
  const sign = canvasTex(1024, 160, (g, w, h) => { g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f8d040'; g.font = '900 112px Inter'; g.textAlign = 'center'; g.fillText('BURGER BARN', w / 2, 120); });
  const sg = mesh(new THREE.PlaneGeometry(6.4, 1.0), new THREE.MeshBasicMaterial({ map: sign }), false, false); sg.position.set(-1.5, 3.0, -10.15); sc.add(sg);
  const menu = (kind) => canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#2a2a30'; g.fillRect(0, 0, w, h); g.textAlign = 'center';
    if (kind === 0) { g.fillStyle = '#e8a040'; g.beginPath(); g.ellipse(256, 120, 120, 50, 0, Math.PI, 0); g.fill(); g.fillStyle = '#5ab040'; g.fillRect(130, 120, 252, 14); g.fillStyle = '#6a3a1a'; g.fillRect(140, 134, 232, 26); g.fillStyle = '#e8a040'; g.fillRect(136, 160, 240, 26); }
    if (kind === 1) { g.fillStyle = '#f8d040'; for (let i = 0; i < 9; i++) g.fillRect(186 + i * 16, 40 + 12 * (i % 3), 10, 90); g.fillStyle = '#d8302a'; g.beginPath(); g.moveTo(176, 100); g.lineTo(336, 100); g.lineTo(316, 190); g.lineTo(196, 190); g.fill(); }
    if (kind === 2) { g.fillStyle = '#d8302a'; g.beginPath(); g.moveTo(206, 60); g.lineTo(306, 60); g.lineTo(290, 190); g.lineTo(222, 190); g.fill(); g.fillStyle = '#f4f4f0'; g.fillRect(200, 48, 112, 14); g.fillRect(262, 10, 8, 40); }
    g.fillStyle = '#f4f0e6'; g.font = '800 52px Inter'; g.fillText(['BURGER', 'FRIES', 'SODA'][kind], w / 2, 250); g.fillStyle = '#f8d040'; g.font = '700 40px Inter'; g.fillText(['$5.99', '$2.99', '$1.99'][kind], w / 2, 298); });
  for (let k = 0; k < 3; k++) { const p = mesh(new THREE.PlaneGeometry(2.0, 1.25), new THREE.MeshBasicMaterial({ map: menu(k) }), false, false); p.position.set(-3.7 + k * 2.2, 1.95, -10.15); sc.add(p); }
  // fries cartons + cups + trays (instanced look by reuse of geometries/materials)
  const red = F_('#d8302a'), fry = F_('#f8d040', { roughness: 0.6 }), tray = F_('#c8682a'), cupM = F_('#f4f4f0'), lid = F_('#d8302a');
  DN.cartons = [];
  const carton = (x, y, z, ry, par = sc) => { const g = new THREE.Group(); rb(0.11, 0.12, 0.06, red, 0, 0.06, 0, g, 0.01); for (let i = 0; i < 7; i++) { const f = bx(0.014, 0.1 + 0.04 * hash(i + x), 0.014, fry, -0.04 + 0.013 * i, 0.14, (i % 2 - 0.5) * 0.02, g); f.rotation.z = (hash(i * 3 + z) - 0.5) * 0.4; }
    g.position.set(x, y, z); g.rotation.y = ry; par.add(g); DN.cartons.push(g); return g; };
  const cup = (x, y, z) => { const c = mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.16, 10), cupM); c.position.set(x, y + 0.08, z); sc.add(c); const l = mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.015, 10), lid); l.position.set(x, y + 0.165, z); sc.add(l); };
  const table = (x, z, w = 1.0, d = 1.0) => { rb(w, 0.06, d, F_('#f4efe4', { roughness: 0.4 }), x, 0.75, z, sc, 0.02); rb(0.12, 0.72, 0.12, F_('#2e3034'), x, 0.36, z, sc, 0.02); rb(0.5, 0.03, 0.5, F_('#2e3034'), x, 0.015, z, sc, 0.02); };
  const stool = (x, z) => { rb(0.42, 0.08, 0.42, F_(hash(x * 3 + z) < 0.5 ? '#c8302a' : '#f4c430'), x, 0.46, z, sc, 0.03); rb(0.08, 0.42, 0.08, F_('#2e3034'), x, 0.21, z, sc, 0.02); };
  // the crowd: seated at the tables (2–4 each), a line at the counter; some lift a fry to the mouth
  DN.people = []; const r0 = seed; seed = 5151;
  const TABLES = []; for (const x of [-6.0, -3.2, -0.4, 2.4]) for (const z of [-5.0, -1.6, 1.8, 5.2]) TABLES.push([x + 0.3 * (hash(x * z) - 0.5), z]);
  TABLES.push([5.6, -4.6], [5.6, -1.2]);
  TABLES.forEach(([x, z], ti) => { table(x, z); const tr = rb(0.5, 0.02, 0.36, tray, x, 0.79, z, sc, 0.01); tr.rotation.y = hash(ti) * 0.6;
    const seats = [[0, 0.68, Math.PI], [0, -0.68, 0], [0.68, 0, -Math.PI / 2], [-0.68, 0, Math.PI / 2]].slice(0, 2 + ((hash(ti * 7) * 3) | 0));
    seats.forEach(([dx, dz, ry], si) => { stool(x + dx, z + dz); const p = makePerson(rnd); sc.add(p.outer);
      carton(x + dx * 0.45 + 0.08, 0.78, z + dz * 0.45, ry); if (si % 2) cup(x + dx * 0.4 - 0.15, 0.78, z + dz * 0.4);
      DN.people.push({ p, x: x + dx, z: z + dz, ry, sit: true, eat: rnd() < 0.6, ph: rnd() * 6 }); }); });
  for (let i = 0; i < 6; i++) { const p = makePerson(rnd); sc.add(p.outer); DN.people.push({ p, x: -3.6 + 0.9 * (i % 2) * 0.4, z: -6.6 + i * 0.85, ry: Math.PI, sit: false, eat: false, ph: rnd() * 6 }); }
  seed = r0;
  // vanish order: everyone between 2.25 and 3.7 s, roughly back-to-front in waves (audio_gone.py rebuilds this order from the same hash)
  DN.people.forEach((w, i) => { w.tv = 2.25 + 1.45 * hash(i * 1.37 + 0.5); });
  // the booth by the window: a table, two red benches with backs, their fries + drinks
  table(5.6, 3.0, 0.8, 0.75); for (const [z, bz] of [[3.62, 3.95], [2.38, 2.05]]) { rb(0.9, 0.12, 0.42, F_('#c8302a'), 5.6, 0.44, z, sc, 0.05); rb(0.9, 0.7, 0.12, F_('#c8302a'), 5.6, 0.8, bz, sc, 0.05); rb(0.9, 0.38, 0.42, F_('#8a2020'), 5.6, 0.19, z, sc, 0.03); }
  rb(0.5, 0.02, 0.36, tray, 5.6, 0.79, 3.0, sc, 0.01); carton(5.48, 0.8, 3.2, Math.PI); carton(5.72, 0.8, 2.8, 0); cup(5.85, 0.78, 3.25); cup(5.35, 0.78, 2.75);
  // a single fry in each of your hands (follows the hand)
  DN.fryP = bx(0.016, 0.12, 0.016, fry, 0, 0, 0, sc); DN.fryQ = bx(0.016, 0.12, 0.016, fry, 0, 0, 0, sc); }
function updateDiner(t) {
  DN.people.forEach(w => { const gone = t >= w.tv, p = w.p; p.outer.visible = !gone; if (gone) { puffAt(DIN.sc, V3(w.x, w.sit ? 1.05 : 1.45, w.z), t, w.tv, 1.3); return; }
    p.outer.rotation.set(0, w.ry, 0);
    if (w.sit) { p.outer.position.set(w.x, 0.52, w.z); poseSit(p); if (w.eat) { const k = 0.5 + 0.5 * Math.sin(t * 2.4 + w.ph); p.arms[1].rotation.x = -0.6 - 1.5 * k; p.elbows[1].rotation.x = -0.5 - 1.3 * k; } p.root.rotation.x = 0.06 * Math.sin(t * 1.7 + w.ph); }
    else { p.outer.position.set(w.x, 0.95, w.z); poseIdle(p, t, w.ph); } }); }
