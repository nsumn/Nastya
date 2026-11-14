// =================== SETS (each its own scene + camera; you are re-parented into whichever set is shot) ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false })));
  sc.fog = new THREE.Fog(fog, near, far); const hm = new THREE.HemisphereLight(...hemi); sc.add(hm);
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 80 }); sc.add(s, s.target); sc.userData.sun = s; sc.userData.hemi = hm;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D(), _c = new THREE.Color();
// bake a group (people.js person, makeCar…) into ONE geometry with vertex colours, so thousands can be instanced cheaply
const BAKE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
function bake(group) { group.updateMatrixWorld(true); const gs = [];
  group.traverse(o => { if (!o.isMesh || !o.visible) return; let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.color) { const c = (Array.isArray(o.material) ? o.material[0] : o.material).color || new THREE.Color(1, 1, 1), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    gs.push(g); }); return mergeGeometries(gs); }
// the crowd: 12 beachgoers (people.js, built from simple shapes like on our streets) × 4 poses
const GLSL_HASH = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`;
const SUN_DIR = V3(-0.55, 0.32, -0.77).normalize(), HAZE = new THREE.Color('#f0b47a');
// =================== GROUND STOP sets (no hero): HALL (departures board + crowd), APRON (terminal, gates, taxiway queue, runway), NET (20 control towers + telecom cables, night), SKY (planes over clouds), SRV (old server room) ===================
const SMK = [];
// a low-poly airliner (fuselage, nose, swept wings, engines, tail in a livery colour, window band) — length ≈ 60 m
function makePlane(tail = '#2a5ad8', band = '#2a5ad8') { const pl = new THREE.Group(), white = F_('#eef2f6', { roughness: 0.4 });
  const fus = mesh(new THREE.CylinderGeometry(2.0, 2.0, 52, 16), white); fus.rotation.z = Math.PI / 2; pl.add(fus);
  const nose = mesh(new THREE.SphereGeometry(2.0, 14, 10), white); nose.scale.set(2.4, 1, 1); nose.position.x = 26; pl.add(nose);
  const cone = mesh(new THREE.ConeGeometry(2.0, 9, 14), white); cone.rotation.z = Math.PI / 2; cone.position.x = -30.5; cone.scale.set(1, 1, 0.8); pl.add(cone);
  for (const s of [-1, 1]) { const wg = mesh(new THREE.BoxGeometry(9, 0.5, 30), white); wg.position.set(2, -0.9, s * 16); wg.rotation.y = s * 0.42; pl.add(wg);
    const en = mesh(new THREE.CylinderGeometry(1.3, 1.15, 4.6, 14), F_('#d8dce0', { roughness: 0.35 })); en.rotation.z = Math.PI / 2; en.position.set(5.5, -2.3, s * 9.5); pl.add(en);
    const hs = mesh(new THREE.BoxGeometry(5, 0.35, 10), white); hs.position.set(-29, 1.2, s * 5); hs.rotation.y = s * 0.45; pl.add(hs); }
  const tl = mesh(new THREE.BoxGeometry(7, 10, 0.5), F_(tail)); tl.position.set(-29, 6, 0); tl.rotation.z = 0.35; pl.add(tl);
  bx(50, 0.7, 4.08, band, 0, -0.7, 0, pl); for (let k = 0; k < 36; k++) for (const s of [-1, 1]) bx(0.55, 0.5, 0.05, '#1a2230', -20 + k * 1.2, 0.6, s * 2.02, pl);
  for (const s of [-1, 1]) bx(1.6, 0.8, 0.05, '#1a2230', 25.5, 0.9, s * 1.62, pl);
  for (const [x, z] of [[20, 0], [3, -3.5], [3, 3.5]]) { bx(0.4, 3, 0.4, '#8a8e94', x, -3.2, z, pl); const w = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.6, 12), F_('#1a1a1e')); w.rotation.x = Math.PI / 2; w.position.set(x, -4.6, z); pl.add(w); }
  pl.position.y = 5.3; return pl; }
const LIVERY = [['#2a5ad8', '#2a5ad8'], ['#d8302a', '#c02420'], ['#1a2a5a', '#e8a020'], ['#2aa86a', '#2aa86a'], ['#5a2a8a', '#8a5ac8']];
// ---------- 1) HALL: the departures board turns red, then a packed, stuck terminal ----------
const HALL = mkSet({ top: '#f0c890', bot: '#f8e0c0', fog: 0xe8d8c8, near: 60, far: 400, hemi: [0xfff4e8, 0x9a8a78, 1.3], sun: [0xffd8a8, 2.2, V3(-8, 12, 10)], shadow: 22 });
const HL = {}; { const sc = HALL.sc; const floor = new THREE.MeshStandardMaterial({ color: '#c8c4bc', roughness: 0.25, metalness: 0.05 }); gplane(sc, 120, 120, floor, 0, 0);
  for (let i = -6; i <= 6; i++) bx(0.04, 0.01, 120, '#b0aca4', i * 4, 0.006, 0, sc);
  // the glass wall with the apron behind it (two parked planes), mullions
  const glass = new THREE.MeshStandardMaterial({ color: '#9ac0e0', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25 }); const gw = mesh(new THREE.PlaneGeometry(60, 14), glass, false, false); gw.position.set(0, 7, -14); sc.add(gw);
  for (let i = -15; i <= 15; i++) bx(0.25, 14, 0.25, '#4a4e56', i * 2, 7, -14, sc); bx(60, 0.4, 0.4, '#4a4e56', 0, 14, -14, sc); bx(60, 0.3, 0.3, '#4a4e56', 0, 7, -14, sc);
  gplane(sc, 300, 200, '#8a8c90', 0, -110, -0.02); for (const [x, z, ry, li] of [[-24, -48, 0.5, 0], [30, -60, -0.4, 1], [2, -95, 0.1, 2]]) { const p = makePlane(...LIVERY[li]); p.position.set(x, 5.3, z); p.rotation.y = ry; sc.add(p); }
  bx(60, 1, 30, '#e8e4dc', 0, 18, 0, sc); bx(0.5, 18, 30, '#d8d4cc', -30, 9, 0, sc); bx(0.5, 18, 30, '#d8d4cc', 30, 9, 0, sc);
  // the board: two posts + a black screen with a canvas texture that is redrawn per frame
  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 640; HL.bctx = bc.getContext('2d'); HL.btex = new THREE.CanvasTexture(bc); HL.btex.colorSpace = THREE.SRGBColorSpace; HL.btex.anisotropy = 8;
  const bd = grp(0, 0, 2, 0, sc); bx(9.6, 6.2, 0.5, '#1a1c22', 0, 7.2, 0, bd, { roughness: 0.4 }); const scr = mesh(new THREE.PlaneGeometry(9.2, 5.75), new THREE.MeshBasicMaterial({ map: HL.btex, toneMapped: false }), false, false); scr.position.set(0, 7.2, 0.26); bd.add(scr);
  for (const s of [-1, 1]) bx(0.35, 4.2, 0.35, '#4a4e56', s * 3.5, 2.1, 0, bd); HL.board = bd;
  // benches + the crowd (people.js, posed), revealed for the "stuck" beat
  HL.crowd = []; const r0 = seed; seed = 777; for (let i = 0; i < 46; i++) { const p = makePerson(rnd); const x = R(-22, 22), z = R(4, 26); if (Math.abs(x) < 6 && z < 9) continue; const sit = rnd() < 0.35;
    p.outer.position.set(x, 0.95, z); p.outer.rotation.y = Math.atan2(-x * 0.3, -z) + R(-0.6, 0.6); if (sit) { poseSit(p); p.outer.position.y = 0.95 - 0.45; } else poseIdle(p, R(0, 9), R(0, 6)); p.outer.userData = { sit, ph: R(0, 6) }; sc.add(p.outer); HL.crowd.push(p);
    if (rnd() < 0.5) { const c = bx(0.42, 0.62, 0.26, pick(['#2a2e3a', '#8a2a2a', '#2a5a8a', '#5a5a5a', '#c8a040']), x + 0.45, 0.31, z + 0.2, sc); c.userData.bag = 1; HL.crowd.push({ outer: c, bag: 1 }); } }
  for (let i = 0; i < 6; i++) { const z = 12 + (i % 3) * 5, x = (i < 3 ? -14 : 14); bx(6, 0.12, 0.8, '#3a4a6a', x, 0.5, z, sc); for (const s of [-1, 1]) bx(0.1, 0.5, 0.7, '#2a2e36', x + s * 2.8, 0.25, z, sc); }
  seed = r0; }
const DEST = [['4:05', 'NEW YORK JFK', 'DL 412'], ['4:10', 'CHICAGO', 'UA 1188'], ['4:15', 'LOS ANGELES', 'AA 2201'], ['4:20', 'ATLANTA', 'DL 905'], ['4:25', 'DENVER', 'WN 3317'], ['4:30', 'MIAMI', 'AA 1450'], ['4:35', 'SEATTLE', 'AS 22'], ['4:40', 'DALLAS', 'AA 77'], ['4:45', 'BOSTON', 'B6 618'], ['4:50', 'LAS VEGAS', 'WN 1290']];
function drawBoard(t, flip0, green = 0) { const g = HL.bctx, w = 1024, h = 640; g.fillStyle = '#0a0d14'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4c430'; g.font = '700 46px Inter'; g.fillText('DEPARTURES', 30, 62); g.fillStyle = '#8a92a0'; g.font = '700 22px Inter'; g.fillText('TIME', 30, 104); g.fillText('DESTINATION', 150, 104); g.fillText('FLIGHT', 560, 104); g.fillText('STATUS', 760, 104);
  DEST.forEach((d, i) => { const y = 150 + i * 49; g.fillStyle = i % 2 ? '#121722' : '#0e131c'; g.fillRect(20, y - 34, w - 40, 46); g.font = '700 30px Inter'; g.fillStyle = '#e8ecf2'; g.fillText(d[0], 30, y); g.fillText(d[1], 150, y); g.fillStyle = '#b8c0cc'; g.fillText(d[2], 560, y);
    const tf = flip0 + i * 0.12, f = flip0 < 0 ? 0 : clamp((t - tf) / 0.18, 0, 1); let st = 'ON TIME', col = '#3ad07a'; if (f >= 1) { st = 'CANCELED'; col = '#ff3a3a'; } else if (f > 0) { st = '▒▒▒▒▒▒'; col = '#f4c430'; }
    if (green) { st = 'ON TIME'; col = '#3ad07a'; } g.fillStyle = col; g.fillText(st, 760, y); });
  HL.btex.needsUpdate = true; }
// ---------- 2) APRON: terminal + gates, a long taxiway queue with red stop bars, a runway ----------
const APRON = mkSet({ top: '#2a62c8', bot: '#f0b878', fog: 0xe8c8a8, near: 700, far: 4200, hemi: [0xfff0e0, 0x6a6a60, 1.15], sun: [0xffc890, 2.8, V3(-60, 40, 30)], shadow: 140 });
const AP = {}; { const sc = APRON.sc; const conc = new THREE.ShaderMaterial({ lights: false, uniforms: {}, vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `${GLSL_HASH} varying vec3 vW; void main(){ float n=vn(vW.xz*0.35)*0.5+vn(vW.xz*2.1)*0.3; vec3 c=mix(vec3(0.075,0.075,0.08),vec3(0.11,0.11,0.115),n); float j=step(0.97,fract(vW.x/7.5))+step(0.97,fract(vW.z/7.5)); c*=1.0-0.08*min(j,1.0); gl_FragColor=vec4(c,1.0); }` });
  const g = mesh(new THREE.PlaneGeometry(3000, 3000), conc, false, false); g.rotation.x = -Math.PI / 2; sc.add(g); gplane(sc, 3000, 900, '#7a9a5a', 0, 1100, 0.01);
  // terminal (glass + white roof) with 5 jet bridges and parked planes
  bx(260, 16, 40, '#6a8aa8', 0, 8, -60, sc, { roughness: 0.15, metalness: 0.35 }); bx(270, 2, 46, '#f0ece4', 0, 17, -60, sc); for (let i = -12; i <= 12; i++) bx(0.6, 16, 0.6, '#3a3e46', i * 10.6, 8, -39.6, sc);
  AP.gate = []; for (let i = 0; i < 5; i++) { const x = -100 + i * 50; bx(3.4, 3.4, 22, '#c8ccd0', x, 6, -27, sc); const p = makePlane(...LIVERY[i % 5]); p.rotation.y = -Math.PI / 2; p.position.set(x + 8, 5.3, 6); sc.add(p); AP.gate.push(p); }
  // taxiway (yellow centre line) with the queue + red stop bar at the runway hold line; the runway itself
  bx(1400, 0.02, 0.5, '#e8c020', 0, 0.03, 120, sc); bx(1600, 0.02, 60, '#3a3a3c', 0, 0.02, 260, sc); for (let i = -40; i <= 40; i++) bx(18, 0.03, 1.2, '#f0f0f0', i * 40, 0.04, 260, sc);
  AP.queue = []; for (let i = 0; i < 9; i++) { const p = makePlane(...LIVERY[(i + 2) % 5]); p.position.set(260 - i * 75, 5.3, 120); sc.add(p); AP.queue.push(p); }
  AP.stop = []; for (let i = 0; i < 14; i++) { const m = mesh(new THREE.BoxGeometry(0.35, 0.25, 0.35), new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false }), false, false); m.position.set(330, 0.15, 105 + i * 2.4); sc.add(m); AP.stop.push(m); }
  AP.takeoff = makePlane('#d8302a', '#c02420'); sc.add(AP.takeoff);
  // the control tower next to the terminal
  const tw = grp(170, 0, -20, 0, sc); const sh = mesh(new THREE.CylinderGeometry(4, 6, 46, 10), F_('#e8e4dc')); sh.position.y = 23; tw.add(sh); const cab = mesh(new THREE.CylinderGeometry(9, 7, 7, 10), new THREE.MeshStandardMaterial({ color: '#2a4a5a', roughness: 0.1, metalness: 0.5, emissive: '#2a6a7a', emissiveIntensity: 0.4 })); cab.position.y = 50; tw.add(cab);
  bx(18, 1.2, 18, '#f0ece4', 0, 54.2, 0, tw); AP.tower = tw; }
// ---------- 3) NET: 20 control towers at night, linked by glowing telecom cables with data pulses; then the network fails ----------
const NET = mkSet({ top: '#0a1430', bot: '#2a2a4a', fog: 0x0e1426, near: 200, far: 1300, hemi: [0x6a7aa8, 0x101418, 0.55], sun: [0x9ab0e0, 0.6, V3(-40, 60, 20)], shadow: 300 });
const NT = {}; { const sc = NET.sc; gplane(sc, 4000, 4000, '#1a2030', 0, 0); const r0 = seed; seed = 2020;
  NT.towers = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2 + R(-0.12, 0.12), r = 150 + R(0, 230) * (i % 2 ? 1 : 0.55); const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
    const tw = grp(x, 0, z, 0, sc); const sh = mesh(new THREE.CylinderGeometry(2.5, 3.5, 30, 8), F_('#8a909c')); sh.position.y = 15; tw.add(sh);
    const win = new THREE.MeshStandardMaterial({ color: '#0a2a3a', emissive: '#3af0ff', emissiveIntensity: 1.6, roughness: 0.2 }); const cab = mesh(new THREE.CylinderGeometry(6, 4.5, 5, 8), win); cab.position.y = 32; tw.add(cab); bx(12, 0.8, 12, '#c8ccd4', 0, 35, 0, tw);
    const bc = mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3030', toneMapped: false })); bc.position.y = 37; tw.add(bc); NT.towers.push({ g: tw, win, bc, p: V3(x, 34, z) }); }
  // cables: each tower to its 2 nearest + 1 across, raised arcs; data pulses ride them
  NT.cables = []; const done = new Set(); NT.towers.forEach((A, i) => { const near = NT.towers.map((B, j) => [j, A.p.distanceTo(B.p)]).filter(q => q[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 2).map(q => q[0]); near.push((i + 7) % 20);
    near.forEach(j => { const key = Math.min(i, j) + '-' + Math.max(i, j); if (done.has(key)) return; done.add(key); const B = NT.towers[j]; const mid = A.p.clone().lerp(B.p, 0.5); mid.y += 30 + A.p.distanceTo(B.p) * 0.08;
      const cur = new THREE.QuadraticBezierCurve3(A.p, mid, B.p); const m = new THREE.MeshBasicMaterial({ color: '#3af0ff', transparent: true, opacity: 0.85, toneMapped: false }); const tb = mesh(new THREE.TubeGeometry(cur, 40, 0.45, 6, false), m, false, false); sc.add(tb);
      const pulses = Array.from({ length: 3 }, () => { const s = mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#e8ffff', toneMapped: false }), false, false); sc.add(s); return s; });
      NT.cables.push({ cur, m, tb, pulses, ph: R(0, 1), sp: R(0.25, 0.5), fail: R(0, 1.6), mid }); }); });
  NT.sparks = makeSmoke(sc, 400); SMK.push(NT.sparks); seed = r0; }
// ---------- 4) SKY: planes above the clouds, descending ----------
const SKY = mkSet({ top: '#1a4aa8', bot: '#e8a868', fog: 0xe8c0a0, near: 900, far: 4200, hemi: [0xffffff, 0x8a8aa0, 1.2], sun: [0xffe0b8, 2.6, V3(-60, 50, 40)], shadow: 80 });
const SK = {}; { const sc = SKY.sc; const cm = F_('#ffffff', { roughness: 1 }); const r0 = seed; seed = 909;
  for (let i = 0; i < 70; i++) { const c = new THREE.Group(); for (let k = 0; k < 6; k++) { const s = mesh(new THREE.SphereGeometry(R(14, 30), 9, 7), cm, false, false); s.position.set(R(-40, 40), R(-6, 8), R(-20, 20)); s.scale.y = 0.55; c.add(s); } c.position.set(R(-1400, 1400), R(-30, 10), R(-1800, 400)); sc.add(c); }
  SK.planes = [0, 1, 2].map(i => { const p = makePlane(...LIVERY[i + 1]); sc.add(p); return p; }); seed = r0; }
// ---------- 5) SRV: an old server room — beige boxes, CRTs, tangled cables, duct tape, blinking/failing LEDs, smoke ----------
const SRV = mkSet({ top: '#1a1e26', bot: '#2a2e36', fog: 0x14161c, near: 20, far: 90, hemi: [0x8a9ab8, 0x2a2420, 0.5], sun: [0xa8c0ff, 0.5, V3(3, 8, 5)], shadow: 10 });
const SV = {}; { const sc = SRV.sc; gplane(sc, 60, 60, '#3a3c40', 0, 0); bx(30, 6, 0.3, '#4a4c50', 0, 3, -6, sc); const lamp = new THREE.PointLight(0xffe0b0, 6, 14, 1.6); lamp.position.set(0, 4.6, 2); sc.add(lamp); SV.lamp = lamp;
  const warn = new THREE.PointLight(0xff3020, 0, 12, 1.4); warn.position.set(-1.5, 3, 0); sc.add(warn); SV.warn = warn; SV.leds = [];
  for (let r = 0; r < 4; r++) { const x = -5.4 + r * 2.4; bx(1.9, 4, 1.4, '#c8c0a8', x, 2, -4.4, sc); for (let k = 0; k < 12; k++) { bx(1.7, 0.04, 0.02, '#8a8470', x, 0.6 + k * 0.28, -3.68, sc);
      const led = mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: '#30ff60', toneMapped: false }), false, false); led.position.set(x + 0.7 - (k % 3) * 0.15, 0.68 + k * 0.28, -3.66); sc.add(led); SV.leds.push(led); } }
  // the desk with two beige CRTs (one with an error screen), a keyboard
  bx(4, 0.1, 1.6, '#8a6a4a', 0.4, 1.05, -0.6, sc); for (const s of [-1, 1]) bx(0.1, 1.0, 1.4, '#6a4a30', 0.4 + s * 1.9, 0.5, -0.6, sc);
  const ec = document.createElement('canvas'); ec.width = 256; ec.height = 192; SV.ectx = ec.getContext('2d'); SV.etex = new THREE.CanvasTexture(ec);
  SV.crts = []; for (const [x, err] of [[-0.6, 0], [1.4, 1]]) { const c = grp(x, 1.1, -0.7, err ? -0.25 : 0.2, sc); bx(1.2, 1.0, 1.1, '#d8d0b8', 0, 0.5, 0, c); bx(0.5, 0.08, 0.4, '#c8c0a8', 0, 0.04, 0.1, c);
    const scr = mesh(new THREE.PlaneGeometry(0.92, 0.7), new THREE.MeshBasicMaterial({ map: err ? SV.etex : null, color: err ? '#ffffff' : '#1a3a2a', toneMapped: false }), false, false); scr.position.set(0, 0.52, 0.56); c.add(scr); SV.crts.push(scr); }
  bx(1.4, 0.05, 0.4, '#c8c0a8', 0.4, 1.12, -0.05, sc);
  // cables: a tangle of tubes from the racks to the desk, with grey duct-tape wraps
  const r0 = seed; seed = 31; for (let i = 0; i < 14; i++) { const a = V3(-5.4 + (i % 4) * 2.4 + R(-0.5, 0.5), R(0.4, 3.6), -3.6), d = V3(R(-1, 1.8), 1.1, -0.9); const m1 = a.clone().lerp(d, 0.4).add(V3(R(-1, 1), R(-1.5, -0.2), R(0.4, 1.8)));
    const cur = new THREE.CatmullRomCurve3([a, m1, a.clone().lerp(d, 0.75).add(V3(R(-0.6, 0.6), R(-0.8, 0), R(0, 0.8))), d]); sc.add(mesh(new THREE.TubeGeometry(cur, 30, 0.035, 5, false), F_(pick(['#1a1a1a', '#2a4a8a', '#c8a020', '#8a2a2a', '#5a5a5a'])), false, false));
    if (i % 3 === 0) { const p = cur.getPoint(0.5); bx(0.16, 0.16, 0.16, '#9a9a9a', p.x, p.y, p.z, sc); } }
  seed = r0; SV.smoke = makeSmoke(sc, 160); SMK.push(SV.smoke); }
function drawError(t) { const g = SV.ectx; g.fillStyle = '#0018a8'; g.fillRect(0, 0, 256, 192); g.fillStyle = '#ffffff'; g.font = '700 16px monospace'; ['NETWORK LINK DOWN', '', 'ROUTER OVERLOAD', 'BUFFER FULL 100%', '', 'ERROR 0x00FF2F'].forEach((l, i) => g.fillText(l, 14, 30 + i * 22));
  if (Math.floor(t * 3) % 2) g.fillRect(14, 168, 12, 14); SV.etex.needsUpdate = true; }
