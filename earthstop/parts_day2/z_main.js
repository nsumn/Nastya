// =================== "The last 24 hours" — Mon Nov 9 2026: topic props (GPU card, Pentagon + gavel, ballots, Abu Dhabi table, quake rings) ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// ---- places ----
const PL = { sc: [-121.96, 37.37], pent: [-77.056, 38.871], dc: [-77.04, 38.9], ak: [-152, 63.5], ms: [-89.7, 32.7], abu: [54.37, 24.45], paris: [2.35, 48.86], moscow: [37.62, 55.75], kyiv: [30.52, 50.45],
  jer: [35.21, 31.77], jp: [138.2, 34.95] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
let HOLDS = null;
function holds() { return [[0, T.wash, shot([-60, 32], 1500, 0, 0.16), shot([-75, 34], 1050, 0.06, 0.2)],
    [T.wash + 1.1, T.dc - 0.1, shot(off('sc', 0, 2), 78, -0.45, 0.6), shot(off('sc', 0, 2), 64, 0.2, 0.66)],
    [T.dc + 0.9, T.wh, shot(off('pent', 0, 1), 44, 0.6, 0.62), shot(off('pent', 0, 1), 34, 1.1, 0.7)],
    [T.wh + 0.55, T.count, shot(off('dc', -2, 1.5), 40, 1.3, 0.65), shot(off('dc', -2, 1.5), 32, 1.75, 0.7)],
    [T.count + 1.1, T.abu, shot([-121, 48], 640, 1.0, 0.3), shot([-121, 48], 580, 0.92, 0.32)],
    [T.abu + 1.5, T.il, shot([44, 39], 700, 0, 0.36), shot([50, 30], 380, 0.1, 0.45)],
    [T.il + 0.8, T.jp, shot([34.9, 31.4], 110, 0, 0.45), shot([34.9, 31.4], 92, 0.15, 0.5)],
    [T.jp + 1.3, T.follow, shot([138.5, 36.0], 170, 0, 0.42), shot([138.5, 35.6], 140, -0.1, 0.48)],
    [T.follow + 1.1, T_END, shot([-40, 36], 1500, 0, 0.16), shot([-40, 36], 1700, 0.05, 0.16)]]; }
// ---- props ----
let PROPS = null;
function flagTex(draw) { return canvasTex(96, 64, (g, w, h) => draw(g, w, h)); }
function buildProps() { const P = {};
  // a generic GPU card (no logo): green board, black shroud, two spinning fans, silver fins, a green light strip
  P.gpu = new THREE.Group(); const gm = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 6), gm('#1f6b3c')); pcb.position.y = 0.2; P.gpu.add(pcb);
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(13.4, 1.6, 5.6), gm('#16181d', { metalness: 0.6, roughness: 0.35 })); shroud.position.y = 1.2; P.gpu.add(shroud);
  for (let k = 0; k < 18; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 5.0), gm('#c9ced6', { metalness: 0.9, roughness: 0.25 })); f.position.set(-6.2 + k * 0.73, 0.9, 0); P.gpu.add(f); }
  P.fans = [-3.3, 3.3].map(x => { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 8, 32).rotateX(Math.PI / 2), gm('#2a2d33', { metalness: 0.5 })); g.add(ring);
    for (let b = 0; b < 9; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.55), gm('#0d0f12')); bl.position.x = 0.95; const pv = new THREE.Group(); pv.rotation.y = b / 9 * Math.PI * 2; bl.rotation.x = 0.5; pv.add(bl); g.add(pv); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 20), gm('#3a3e46', { metalness: 0.7 })); g.add(hub); g.position.set(x, 2.08, 0); P.gpu.add(g); return g; });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: '#7dff4a' })); strip.position.set(0, 1.95, 2.85); P.gpu.add(strip);
  const die = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 2.2), gm('#b08a3a', { metalness: 0.9, roughness: 0.3 })); die.position.set(0, 0.42, -3.2); P.gpu.add(die);
  P.gpu.visible = false; MAPSC.add(P.gpu);
  // magnifier ("investigation") circling the card
  P.mag = new THREE.Group(); const mr = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.22, 10, 32), gm('#e8e8ea', { metalness: 0.8, roughness: 0.25 })); P.mag.add(mr);
  const gl = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.35, roughness: 0.05 })); P.mag.add(gl);
  const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.6, 10), gm('#3a2a1c')); hd.position.set(0, -2.9, 0); P.mag.add(hd); P.mag.visible = false; MAPSC.add(P.mag);
  // the Pentagon (pentagonal ring) + a judge's gavel
  { const sh = new THREE.Shape(), hole = new THREE.Path(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * 6, Math.sin(a) * 6) : sh.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); }
    for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? hole.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6) : hole.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); } sh.holes.push(hole);
    P.pent = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.6, flatShading: true })); P.pent.visible = false; MAPSC.add(P.pent); }
  P.gavel = new THREE.Group(); { const wood = gm('#6b3f1f'), band = gm('#c8a24a', { metalness: 0.8 }); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 20).rotateZ(Math.PI / 2), wood); head.position.y = 0; P.gavel.add(head);
    for (const x of [-1.1, 1.1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.3, 20).rotateZ(Math.PI / 2), band); b.position.x = x; P.gavel.add(b); }
    const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 5.0, 12), wood); hdl.position.set(0, 0, 2.6); hdl.rotation.x = Math.PI / 2; P.gavel.add(hdl); }
  P.block = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.7, 24), gm('#5a3418')); P.gavel.visible = P.block.visible = false; MAPSC.add(P.gavel); MAPSC.add(P.block);
  // ballots raining on Alaska and Mississippi
  const balls = []; for (let i = 0; i < 260; i++) { const ak = i < 150; const c = ak ? PL.ak : PL.ms; balls.push({ p: llPos(c[0] + R(-1, 1) * (ak ? 7 : 1.6), c[1] + R(-1, 1) * (ak ? 3.2 : 1.8)), ph: rnd(), ry: R(0, 6) }); }
  P.balls = balls; P.bMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.1, 1.8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.25 }), balls.length); P.bMesh.frustumCulled = false; P.bMesh.visible = false; MAPSC.add(P.bMesh);
  // Abu Dhabi: a round table with four flags; arcs from Paris, Moscow, Kyiv and Washington
  P.table = new THREE.Group(); const top = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.8, 40), gm('#f2efe6')); top.position.y = 3.2; P.table.add(top); const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 3.2, 20), gm('#8a8f99')); leg.position.y = 1.6; P.table.add(leg);
  const flags = [flagTex((g, w, h) => { for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#fff' : '#c8303a'; g.fillRect(0, k * h / 7, w, h / 7 + 1); } g.fillStyle = '#25356e'; g.fillRect(0, 0, w * 0.42, h * 0.54); }),
    flagTex((g, w, h) => { g.fillStyle = '#0057b7'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#ffd700'; g.fillRect(0, h / 2, w, h / 2); }),
    flagTex((g, w, h) => { ['#fff', '#0039a6', '#d52b1e'].forEach((c, k) => { g.fillStyle = c; g.fillRect(0, k * h / 3, w, h / 3 + 1); }); }),
    flagTex((g, w, h) => { g.fillStyle = '#003399'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcc00'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.arc(w / 2 + Math.cos(a) * 18, h / 2 + Math.sin(a) * 18, 3, 0, 7); g.fill(); } })];
  P.flagMeshes = flags.map((tx, k) => { const a = k / 4 * Math.PI * 2 + 0.4, g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), gm('#d9d9dd', { metalness: 0.8 })); pole.position.y = 3; g.add(pole);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide, roughness: 0.7 })); f.position.set(1.85, 4.8, 0); g.add(f); g.userData.f = f; g.position.set(Math.cos(a) * 7.2, 3.6, Math.sin(a) * 7.2); g.rotation.y = -a; P.table.add(g); return g; });
  P.table.visible = false; MAPSC.add(P.table);
  P.arcs = [['paris', '#5f8dff'], ['moscow', '#ff6a5a'], ['kyiv', '#ffd84a'], ['dc', '#bcd0ff']].map(([k, c], i) => makeArc(P3(k, 0.5), P3('abu', 0.5), k === 'dc' ? 480 : 90, c));
  P.abuPin = makePin(GOLD);
  // Japan: expanding quake rings at the epicentre
  P.rings = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff7a3a', transparent: true, depthWrite: false })); m.visible = false; MAPSC.add(m); return m; });
  P.intro = ['sc', 'dc', 'ak', 'abu', 'jer', 'jp'].map(() => makePin(GOLD));
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
let SHAKE = 0;
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  P.intro.forEach((p, i) => { const keys = ['sc', 'dc', 'ak', 'abu', 'jer', 'jp']; const a = 0.9 + i * 0.22, on = (t >= a && t < T.wash + 0.5) || t >= T.follow + 0.3; p.visible = on; if (on) { const k = t >= T.follow ? pop(t, T.follow + 0.3 + i * 0.12, 0.35) : pop(t, a, 0.35);
    const kp = t >= T.follow ? 1 - smooth(T_END - 0.5, T_END, t) : 1 - smooth(T.wash, T.wash + 0.5, t); p.position.copy(P3(keys[i])); p.scale.setScalar(mCam.position.y / 50 * k * Math.max(0.01, kp)); p.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3 + i * 0.3) % 1)); p.userData.ring.material.opacity = 1 - ((t * 1.3 + i * 0.3) % 1); } });
  // Nvidia: the card rises out of Santa Clara, fans spin; after "spy" it pulses red; the magnifier circles it during "investigating"
  { const on = t >= T.wash + 0.6 && t < T.dc + 0.6; P.gpu.visible = on; if (on) { const k = easeOut(span(t, T.wash + 0.8, T.wash + 1.6)); P.gpu.position.copy(off('sc', 0, 0)).setY(1.2 + 7 * (1 - k) + 0.4 * Math.sin(t * 1.7)); P.gpu.scale.setScalar(1.25 * k + 0.01); P.gpu.rotation.set(0.12 * Math.sin(t * 0.9), 0.35 + 0.25 * Math.sin(t * 0.5), 0);
      P.fans.forEach((f, i) => f.rotation.y = t * (14 + i * 2)); const red = t >= T.spy ? 0.5 + 0.5 * Math.sin(t * 9) : 0; P.gpu.children[1].material.emissive.setRGB(red * 0.6, 0, 0); }
    const mo = t >= T.board && t < T.dc + 0.4; P.mag.visible = mo; if (mo) { const a = (t - T.board) * 1.6; const k = pop(t, T.board, 0.35); P.mag.position.copy(off('sc', Math.cos(a) * 7, Math.sin(a) * 4)).setY(7.5); P.mag.scale.setScalar(1.3 * k); P.mag.rotation.set(-0.9, a, 0.3); } }
  if (t >= T.wash + 0.6 && t < T.dc + 0.4) paintState('California', '#7dff4a', 0.18, 0.2);
  if (t >= T.china && t < T.dc + 0.4) paintCountry('China', RED, 0.5 * smooth(T.china, T.china + 0.4, t), 0.4);
  // the Pentagon + the gavel slamming on "impeach" and again on "hard yes"
  { const on = t >= T.dc && t < T.wh + 0.6; P.pent.visible = P.gavel.visible = P.block.visible = on; if (on) { const k = easeOut(span(t, T.dc + 0.4, T.dc + 1.1)); P.pent.position.copy(off('pent', -1, 0)).setY(0.4 + 6 * (1 - k)); P.pent.scale.setScalar(1.15 * k + 0.01); P.pent.rotation.y = 0.2;
      const b = off('pent', 9.5, 3.5); P.block.position.copy(b).setY(0.6); P.block.scale.setScalar(k + 0.01);
      const hit = (a) => { const u = span(t, a - 0.35, a); const back = span(t, a + 0.05, a + 0.5); return u < 1 ? -1.1 * Math.sin(u * Math.PI * 0.5) * 0 + lerp(-1.15, 0, u * u) : lerp(0, -0.9, easeOut(back)); };
      const ang = t < T.impeach - 0.35 ? -0.9 : t < T.yes - 0.35 ? hit(T.impeach + 0.15) : hit(T.yes + 0.1); P.gavel.position.copy(b).add(V3(0, 2.0, 3.2)); P.gavel.rotation.set(ang, 0.4, 0); P.gavel.scale.setScalar(k + 0.01); } }
  // White House
  WH.visible = t >= T.wh && t < T.count + 0.6; if (WH.visible) { const k = easeOut(span(t, T.wh + 0.3, T.wh + 1.0)); WH.position.copy(off('dc', -3, 0.5)).setY(0.3 + 6 * (1 - k)); WH.scale.setScalar(1.8 * k + 0.01); WH.rotation.y = 0; }
  if (t >= T.dc && t < T.count + 0.6) { paintState('District of Columbia', GOLD, 0.9, 0.6); paintState('Virginia', '#26324a', 0.3); paintState('Maryland', '#26324a', 0.3); }
  // still counting
  if (t >= T.count && t < T.abu + 0.4) { const pl = 0.45 + 0.25 * Math.sin(t * 6); paintState('Alaska', GREY, pl, 0.8); paintState('Mississippi', GREY, pl, 0.8); }
  { const on = t >= T.count + 0.6 && t < T.abu + 0.3; P.bMesh.visible = on; if (on) { P.balls.forEach((b, i) => { const a = T.count + 0.6 + b.ph * 2.4, k = span(t, a, a + 0.9), y = lerp(60, 2.0 + 0.1 * (i % 7), easeOut(k)); const sc = t < a ? 0.001 : (1 - smooth(T.abu - 0.1, T.abu + 0.3, t)) * 1.0 + 0.001;
      s4.setScalar(sc * 3.2); q4.setFromEuler(e4.set(0.6 * (1 - k) * Math.sin(i), b.ry + 3 * (1 - k), 0.5 * (1 - k))); m4.compose(V3(b.p.x, y * 3, b.p.z), q4, s4); P.bMesh.setMatrixAt(i, m4); }); P.bMesh.instanceMatrix.needsUpdate = true; } }
  // Abu Dhabi
  const arcK = (a) => t < a || t > T.il + 0.2 ? 0 : easeOut(span(t, a, a + 0.9)); arcShow(P.arcs[0], arcK(T.europe + 0.2)); arcShow(P.arcs[1], arcK(T.russia - 0.1)); arcShow(P.arcs[2], arcK(T.abu + 1.2)); arcShow(P.arcs[3], arcK(T.abu + 1.5));
  if (t >= T.abu && t < T.il + 0.3) { const EU = ['France', 'Germany', 'Italy', 'Spain', 'Poland', 'Netherlands', 'Belgium', 'Austria', 'Czechia', 'Sweden', 'Finland', 'Denmark', 'Ireland', 'Portugal', 'Greece', 'Romania', 'Bulgaria', 'Hungary', 'Slovakia', 'Croatia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia', 'Luxembourg'];
    const ek = smooth(T.europe, T.europe + 0.5, t); EU.forEach(n => paintCountry(n, BLUE, 0.75 * ek, 0.6 * ek)); paintCountry('Russia', RED, 0.45 * smooth(T.russia - 0.2, T.russia + 0.3, t), 0.4); paintCountry('Ukraine', GOLD, 0.45, 0.4); paintCountry('United Arab Emirates', GOLD, 0.8, 0.8); }
  { const on = false; P.table.visible = on; if (on) { const k = easeOut(span(t, T.abu + 0.9, T.abu + 1.6)); P.table.position.copy(off('abu', 0, -6)); P.table.scale.setScalar(mCam.position.y / 300 * k + 0.01); P.table.rotation.y = t * 0.25;
      P.flagMeshes.forEach((g, i) => { g.userData.f.rotation.y = 0.25 * Math.sin(t * 3 + i); g.visible = i !== 3 || t >= T.europe + 0.2; if (i === 3) g.scale.setScalar(pop(t, T.europe + 0.2, 0.35)); }); } }
  P.abuPin.visible = t >= T.abu + 0.6 && t < T.il + 0.3; if (P.abuPin.visible) { P.abuPin.position.copy(P3('abu')); P.abuPin.scale.setScalar(pop(t, T.abu + 0.6, 0.35) * mCam.position.y / 45); P.abuPin.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); P.abuPin.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
  // Israel
  if (t >= T.il && t < T.jp + 0.4) paintCountry('Israel', BLUE, 0.9 * smooth(T.il, T.il + 0.4, t), 1.2);
  // Japan: the quake
  if (t >= T.jp && t < T.follow + 0.4) paintCountry('Japan', '#ff9a5a', 0.45, 0.4);
  P.rings.forEach((r, i) => { const a = T.quake + 0.1 + i * 0.55; const on = t >= a && t < T.follow; r.visible = on; if (on) { const u = ((t - a) % 2.2) / 2.2; r.position.copy(P3('jp', 1.5 + i * 0.05)); r.scale.setScalar(2 + u * 38); r.material.opacity = (1 - u) * 0.9; } });
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { huang: ['Jensen Huang', 'NVIDIA CEO'], hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'], jeffries: ['Hakeem Jeffries', 'HOUSE DEMOCRATIC LEADER'], miller: ['Stephen Miller', 'CHIEF OF STAFF · DAY 1'],
  dana_white: ['Dana White', 'UFC BOSS'], trump: ['Donald Trump', 'PRESIDENT'], peltola: ['Mary Peltola', 'ALASKA · D'], colom: ['Scott Colom', 'MISSISSIPPI · D'], eisenkot: ['Gadi Eisenkot', 'TAPPED TO LEAD ISRAEL'] };
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) return lerpShot(A, B, esin(span(t, a, b)));
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = HOLDS[i][3], N = nx[2], u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.55); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { SHAKE = t >= T.quake && t < T.quake + 1.4 ? (1 - span(t, T.quake, T.quake + 1.4)) * 1.6 : 0; const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back + SHAKE * Math.sin(t * 61), s.h + SHAKE * Math.sin(t * 47) * 0.5, s.c.z + Math.cos(s.yaw) * back + SHAKE * Math.sin(t * 53));
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const fx = o.fx ?? 0;
  const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
function barLabel(b, txt, t, t0, cls = '') { if (!b.visible) return ''; const top = b.position.clone().setY(b.scale.y + 1.5); return sticker(txt, top, t, t0, cls); }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
function hudAt(t) {
  if (t < T.wash + 0.6) return null;
  if (t < T.dc) return ['01 · SILICON VALLEY', t < T.spy ? 'NVIDIA’S CEO' : t < T.board ? 'A SUSPECTED SPY' : t < T.china ? 'UNDER INVESTIGATION' : 'CHINA DENIES IT', t < T.spy ? 'JENSEN HUANG ADMITS AN AFFAIR' : t < T.board ? 'U.S. OFFICIALS BELIEVE SHE SPIED FOR CHINA' : t < T.china ? 'NVIDIA’S BOARD + CONGRESS' : '“GROUNDLESS SPECULATION”'];
  if (t < T.wh) return ['02 · THE PENTAGON', t < T.impeach ? 'HEGSETH' : t < T.senate ? 'IMPEACHMENT VOTE?' : '2/3 TO REMOVE', t < T.jeffries ? 'THE HOUSE COULD VOTE THIS WEEK' : t < T.senate ? 'JEFFRIES: “HARD YES”' : 'THE SENATE HAS THE FINAL SAY'];
  if (t < T.count) return ['03 · WHITE HOUSE', t < T.dana ? 'MILLER: DAY 1' : 'PRESS SECRETARY?', t < T.dana ? 'NEW CHIEF OF STAFF STARTS TODAY' : 'DANA WHITE MEETS TRUMP TODAY'];
  if (t < T.abu) return ['04 · MIDTERMS 2026', 'STILL COUNTING', 'ALASKA + MISSISSIPPI · SENATE'];
  if (t < T.il) return ['05 · ABU DHABI', t < T.europe + 0.2 ? 'UKRAINE TALKS' : t < T.russia ? 'EUROPE JOINS' : '“NO PLACE”', t < T.russia ? 'TUESDAY · U.S. MEDIATES' : 'RUSSIA ON EUROPE AT THE TABLE'];
  if (t < T.jp) return ['06 · ISRAEL', t < T.d28 ? 'EISENKOT' : `${Math.max(1, 28 - Math.floor(span(t, T.d28, T.d28 + 1.2) * 0))} DAYS`, 'TO FORM A GOVERNMENT'];
  if (t < T.follow) return ['07 · JAPAN', t < T.quake + 0.2 ? 'EARTHQUAKE' : 'M 5.7', t < T.tsunami ? '~24 INJURED · CENTRAL JAPAN' : 'NO TSUNAMI · AFTERSHOCKS ALL WEEK'];
  return null; }
function introHTML(t) { if (t > T.wash + 0.5) return ''; const k = pop(t, T.intro, 0.35), a = 1 - smooth(T.wash + 0.1, T.wash + 0.5, t), bar = easeOut(span(t, T.intro + 0.2, T.intro + 0.8));
  const hh = Math.max(0, 24 - span(t, T.intro + 0.3, T.wash) * 24), clock = `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}:${String(Math.floor((hh * 3600) % 60)).padStart(2, '0')}`;
  return `<div id="intro" style="opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><div class="idate"><b>●</b> MONDAY · NOV 9, 2026</div><div class="ititle">The last</div><div class="iplate" style="transform:skewX(-8deg) scale(${(0.6 + 0.4 * easeOut(span(t, T.intro + 0.15, T.intro + 0.45))).toFixed(3)})"><span>24 HOURS</span></div>
    <div><div class="isub" style="opacity:${smooth(T.intro + 0.5, T.intro + 0.8, t)}">IN AMERICA <i>&</i> AROUND THE WORLD</div></div><div class="iclock">${clock}</div></div>`; }
function domAt(t) { const P = PROPS; let h = introHTML(t);
  h += card('huang', T.huang - 0.05, T.dc, 640, 660, t, { tag: t >= T.spy ? 'ADMITS AFFAIR' : '', tagc: 'r', tagT: T.spy });
  h += card('hegseth', T.hegseth - 0.3, T.wh, 110, 640, t, { tag: t >= T.impeach ? 'IMPEACHMENT?' : '', tagc: 'r', tagT: T.impeach + 0.1 });
  h += card('jeffries', T.jeffries - 0.05, T.wh, 650, 680, t, { small: true, quote: 'HARD YES', qT: T.yes });
  h += card('miller', T.miller - 0.05, T.count, 110, 640, t, { tag: 'DAY 1', tagc: 'b', tagT: T.miller + 0.3 });
  h += card('dana_white', T.dana - 0.05, T.count, 650, 680, t, { small: true, tag: 'MEETING TODAY', tagc: 'b', tagT: T.dana + 0.3 });
  h += card('eisenkot', T.eisenkot - 0.05, T.jp, 110, 640, t, { tag: '28 DAYS', tagc: 'b', tagT: T.d28 });
  if (P) {
    if (t >= T.wash + 1.4 && t < T.dc) h += sticker('NVIDIA HQ · SANTA CLARA', off('sc', 0, 0).setY(9), t, T.wash + 1.4, 'sm w');
    if (t >= T.spy && t < T.dc) h += sticker('SUSPECTED CHINESE SPY', off('sc', 0, 3).setY(4), t, T.spy + 0.1, 'r');
    if (t >= T.china && t < T.dc) h += sticker('CHINA: “GROUNDLESS”', off('sc', 0, 6).setY(2), t, T.china + 0.2, 'g sm');
    if (t >= T.dc + 0.9 && t < T.wh) h += sticker('THE PENTAGON', off('pent', -1, 0).setY(5), t, T.dc + 0.9, 'sm w');
    if (t >= T.wh + 0.6 && t < T.count) h += sticker('WHITE HOUSE', off('dc', -3, 0.5).setY(9), t, T.wh + 0.6, 'sm w');
    if (t >= T.count + 0.8 && t < T.abu) { h += sticker('ALASKA · COUNTING', P3('ak', 6), t, T.count + 0.8, 'g'); h += sticker('MISSISSIPPI · COUNTING', P3('ms', 6), t, T.count + 1.0, 'g'); }
    if (t >= T.abu + 1.0 && t < T.il) { h += sticker('ABU DHABI · TUESDAY', P3('abu', 30), t, T.abu + 1.0, 'w'); if (t >= T.europe + 0.3) h += sticker('EUROPE', P3('paris', 4), t, T.europe + 0.3, 'b sm'); if (t >= T.russia) h += sticker('RUSSIA', P3('moscow', 4), t, T.russia, 'r sm'); h += sticker('KYIV', P3('kyiv', 3), t, T.abu + 1.3, 'sm'); }
    if (t >= T.il + 0.8 && t < T.jp) h += sticker('ISRAEL', P3('jer', 6), t, T.il + 0.8, 'b');
    if (t >= T.quake + 0.3 && t < T.follow) h += sticker('EPICENTER · M 5.7', P3('jp', 5), t, T.quake + 0.3, 'r');
    if (t >= T.tsunami && t < T.follow) h += sticker('NO TSUNAMI', P3('jp', 2).add(V3(14, 0, 8)), t, T.tsunami + 0.2, 'b sm');
  }
  if (t >= T.impeach + 0.15 && t < T.jeffries) h += `<div class="stamp" style="font-size:110px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.impeach + 0.15, T.impeach + 0.33)))).toFixed(3)})">IMPEACH?</div>`;
  if (t >= T.follow - 0.2 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.follow - 0.2, T.follow + 0.1, t)};transform:scale(${pop(t, T.follow - 0.2, 0.35).toFixed(3)})">Follow for <span class="hl">tomorrow’s</span><br>24 hours</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.wash + 0.6, T.spy, T.board, T.china, T.dc, T.impeach, T.senate, T.wh, T.dana, T.count, T.abu, T.europe + 0.2, T.russia, T.il, T.d28, T.jp, T.quake + 0.2]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.impeach + 0.15, T.yes + 0.1, T.spy]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); f = Math.max(f, 1 - Math.abs(t - T.intro - 0.05) / 0.2); return Math.max(0, f); }
window.renderAt = (t) => { mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
