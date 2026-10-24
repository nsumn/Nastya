// =================== DRIVE-THRU (meters, night): neon burger joint, pickup window, your car; then the sugar crash inside the car ===================
const drv = new THREE.Scene(); drv.background = new THREE.Color('#0b1230'); drv.fog = new THREE.Fog(0x0b1230, 22, 70); const dCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
drv.add(new THREE.HemisphereLight(0x7080d0, 0x281c24, 0.6));
{ const m = new THREE.DirectionalLight(0x9aa8e8, 0.9); m.position.set(8, 12, -6); m.castShadow = true; m.shadow.mapSize.set(2048, 2048); m.shadow.bias = -0.0005; Object.assign(m.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); drv.add(m, m.target); }
const winLD = new THREE.PointLight(0xffc880, 7, 6, 1.4); winLD.position.set(-2.0, 1.6, 0); drv.add(winLD);          // warm light spilling from the pickup window
const neonLD = new THREE.PointLight(0xff4a7a, 5, 9, 1.5); neonLD.position.set(-1.6, 4.3, -1.5); drv.add(neonLD);
const lampLD = new THREE.PointLight(0xffd8a0, 5, 10, 1.4); lampLD.position.set(2.8, 4.6, 3.5); drv.add(lampLD);
const dashLD = new THREE.PointLight(0x6ac8ff, 0, 1.8, 1.4); drv.add(dashLD);                                         // dashboard glow once we are inside
// ground: asphalt lot, lane arrows, curb strip, grass beyond
{ const lot = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2c2c34'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ['#34343c', '#26262c', '#3a3a42'], 3); }, [10, 10]);
  const gr = mesh(new THREE.PlaneGeometry(80, 80), M('#ffffff', { map: lot, roughness: 0.95 }), false, true); gr.rotation.x = -Math.PI / 2; drv.add(gr);
  for (let z = 6; z > -12; z -= 3) { const d = mesh(new THREE.PlaneGeometry(0.14, 1.6), M('#e8e0b0'), false, true); d.rotation.x = -Math.PI / 2; d.position.set(0.6, 0.01, z); drv.add(d); }
  bx(0.4, 0.18, 30, '#9a9a9a', 1.9, 0.09, -2, drv); const gs = mesh(new THREE.PlaneGeometry(20, 30), M('#2a4a30'), false, true); gs.rotation.x = -Math.PI / 2; gs.position.set(12.1, 0.02, -2); drv.add(gs); }
// the building: back block + a front wall with a real opening for the pickup window (lit kitchen behind it)
const BLD = grp(0, 0, 0, 0, drv);
bx(3.8, 3.6, 9, '#f2ebe0', -4.9, 1.8, 0, BLD); bx(4.7, 0.25, 9.4, '#d8d0c4', -4.55, 3.72, 0, BLD);                       // block + roof slab
for (const [z0, z1] of [[-4.5, -0.6], [0.6, 4.5]]) bx(0.15, 3.6, z1 - z0, '#f2ebe0', -2.3, 1.8, (z0 + z1) / 2, BLD);
bx(0.15, 1.05, 1.2, '#f2ebe0', -2.3, 0.525, 0, BLD); bx(0.15, 1.65, 1.2, '#f2ebe0', -2.3, 2.775, 0, BLD);
bx(0.18, 0.5, 9.0, '#d83a3a', -2.2, 3.25, 0, BLD); bx(0.18, 0.12, 9.0, '#f2c84a', -2.2, 2.95, 0, BLD);                   // red + yellow band, no logos
bx(0.5, 0.06, 1.4, '#c8c8c8', -2.1, 1.05, 0, BLD, { metalness: 0.5, roughness: 0.3 });                                 // window sill
{ const k = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.5, 1.0) })); k.rotation.y = Math.PI / 2; k.position.set(-2.99, 1.8, 0); BLD.add(k);
  bx(0.7, 0.04, 9, '#8a8a90', -2.65, 1.0, 0, BLD); for (let i = 0; i < 5; i++) bx(0.3, 0.4, 0.4, pick(['#c8c8d0', '#9a9aa4']), -2.85, 1.2, -1.6 + i * 0.8, BLD); }
// neon sign on the front wall + a tall roadside sign (generic words, no brands)
function neonTex(lines, col) { return canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#100810'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.shadowColor = col; g.shadowBlur = 18; g.fillStyle = '#fff0f4';
  g.font = `bold ${lines.length > 1 ? 54 : 84}px Inter, sans-serif`; lines.forEach((s, i) => g.fillText(s, w / 2, lines.length > 1 ? 66 + i * 64 : 108)); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); }); }
{ const s1 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: neonTex(['DRIVE THRU'], '#ff3a7a'), color: new THREE.Color(2.2, 2.2, 2.2) })); s1.rotation.y = Math.PI / 2; s1.position.set(-2.12, 4.45, -1.6); BLD.add(s1);
  bx(0.2, 6, 0.2, '#5a5a62', 3.4, 3, -8, drv); const s2 = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshBasicMaterial({ map: neonTex(['BURGERS', 'OPEN 24 H'], '#ffb03a'), color: new THREE.Color(2.0, 2.0, 2.0) })); s2.position.set(3.4, 6.4, -7.9); s2.rotation.y = -0.5; drv.add(s2);
  bx(0.14, 4.6, 0.14, '#4a4a52', 2.8, 2.3, 3.5, drv); bx(0.6, 0.12, 0.3, '#4a4a52', 2.6, 4.6, 3.5, drv); }
// the clerk behind the window, your car with the driver's side open to the window
const clerk = makePerson(rnd, { top: '#d83a3a', bottom: '#2a2a30', cap: true, dress: false }); BLD.add(clerk.outer); clerk.outer.position.set(-2.72, 0.95, 0.1); clerk.outer.rotation.y = Math.PI / 2;
const CARD = grp(-1.15, 0, 0.2, 0, drv);
{ const C = '#3a6ad0'; bx(1.9, 0.62, 4.3, C, 0, 0.55, 0, CARD); bx(1.86, 0.08, 1.4, C, 0, 0.9, -1.4, CARD); bx(1.7, 0.08, 2.0, C, 0, 1.75, 0.35, CARD); bx(1.6, 0.02, 1.9, '#3a3a40', 0, 1.705, 0.35, CARD);
  for (const [x, z] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 1.3], [0.8, 1.3]]) bx(0.08, 0.85, 0.08, C, x, 1.28, z, CARD);
  bx(1.7, 0.22, 0.35, '#1e2028', 0, 1.0, -0.45, CARD); bx(0.55, 0.7, 0.12, '#2a2a30', -0.42, 1.1, 1.05, CARD); bx(0.55, 0.14, 0.6, '#2a2a30', -0.42, 0.8, 0.72, CARD); bx(0.55, 0.14, 0.6, '#2a2a30', 0.42, 0.8, 0.72, CARD);
  const wh = mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 16), M('#1a1a1e')); wh.position.set(-0.42, 1.18, -0.12); wh.rotation.x = -0.5; CARD.add(wh);
  for (const [x, z] of [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); CARD.add(w); }
  for (const x of [-0.6, 0.6]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.4, 2.0) })); hl.position.set(x, 0.65, -2.16); hl.rotation.y = Math.PI; CARD.add(hl); } }
const meD = makeHero(); CARD.add(meD.outer);
// the bag, a giant soda (lid + straw) and fries — the soda rides in the right hand, the fries in the left
const bagD = grp(0, 0, 0, 0, drv); bx(0.3, 0.36, 0.2, '#c8a070', 0, 0, 0, bagD); bx(0.31, 0.06, 0.21, '#d83a3a', 0, 0.06, 0, bagD);
const sodaD = new THREE.Group(); { const c = mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.28, 12), M('#e8e8e8')); sodaD.add(c); const b = mesh(new THREE.CylinderGeometry(0.0765, 0.07, 0.1, 12), M('#d83a3a')); b.position.y = 0.04; sodaD.add(b);
  const l = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.02, 12), M('#f4f4f4')); l.position.y = 0.15; sodaD.add(l); const s = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), M('#f2c84a')); s.position.set(0.02, 0.25, 0); s.rotation.z = 0.15; sodaD.add(s); }
meD.elbows[0].add(sodaD); sodaD.position.set(0, -0.3, 0.05);
const friesD = new THREE.Group(); { bx(0.12, 0.12, 0.07, '#d83a3a', 0, 0, 0, friesD); for (let i = 0; i < 9; i++) { const f = bx(0.014, 0.12, 0.014, '#f2c84a', -0.045 + (i % 5) * 0.022, 0.09, -0.015 + Math.floor(i / 5) * 0.03, friesD); f.rotation.z = (i - 4) * 0.06; } }
meD.elbows[1].add(friesD); friesD.position.set(0, -0.3, 0.05);
const _dv = new THREE.Vector3();
function updateDrive(t) { const P = meD, o = P.outer; o.position.set(-0.42, 0.88, 0.75); o.rotation.set(0, Math.PI, 0); P.root.rotation.set(0, 0, 0); poseSit(P);
  // clerk hands the bag out 1.6-3.0; it lands on the passenger seat
  poseIdle(clerk, t, 2); const hand = fadeWin(t, 1.3, 3.4, 0.5); clerk.arms[1].rotation.x = -1.4 * hand; clerk.elbows[1].rotation.x = -0.3;
  const a = V3(-2.35, 1.35, 0.25), b = V3(-1.75, 1.3, 0.6), c = V3(-0.75, 0.97, 0.9);
  if (t < 2.2) bagD.position.copy(a); else if (t < 2.9) bagD.position.copy(a).lerp(b, ease((t - 2.2) / 0.7)); else bagD.position.copy(b).lerp(c, ease((t - 2.9) / 0.9));
  sodaD.visible = friesD.visible = t > 3.6; bagD.visible = true;
  // window arm out to grab, then soda + fries; the sugar crash: a yawn, then a slump
  P.arms[1].rotation.x = -1.2 * fadeWin(t, 1.8, 3.2, 0.4); P.arms[1].rotation.z = -0.5 * fadeWin(t, 1.8, 3.2, 0.4);
  if (t > 3.6) { const sip = fadeWin(t, 4.4, 6.4, 0.5) + fadeWin(t, 7.0, 7.5, 0.2) * 0; P.arms[0].rotation.x = lerp(-0.6, -1.25, sip); P.elbows[0].rotation.x = lerp(-1.1, -1.9, sip); P.arms[0].rotation.z = 0.15 * sip;
    const munch = 0.15 * Math.max(0, Math.sin(t * 5)) * fadeWin(t, 5.2, 7.4, 0.3); P.arms[1].rotation.x = -0.7 - munch; P.elbows[1].rotation.x = -1.2 - munch * 2;
    const yawn = fadeWin(t, 7.6, 8.8, 0.3); P.root.rotation.x = -0.18 * yawn; P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -2.0, yawn); P.elbows[1].rotation.x = lerp(P.elbows[1].rotation.x, -1.9, yawn);
    const slump = smooth(8.8, 9.8, t); P.root.rotation.x += 0.22 * slump; o.position.y -= 0.06 * slump; P.arms[0].rotation.x = lerp(P.arms[0].rotation.x, -0.25, slump); P.elbows[0].rotation.x = lerp(P.elbows[0].rotation.x, -0.5, slump); }
  dashLD.position.copy(CARD.position).add(V3(-0.3, 1.25, -0.35)); dashLD.intensity = 1.6 * smooth(3.4, 4.6, t); neonLD.intensity = 5 + 0.6 * Math.sin(t * 13) * Math.sin(t * 3.1); }
function driveCamera(t) { const ext = V3(5.4, 2.4, -9.0).lerp(V3(4.2, 2.2, -6.8), smooth(0, 3.6, t)), extL = V3(-1.8, 2.7, -0.4);
  const ins = V3(-1.52, 1.6, -1.3).add(V3(0.05 * Math.sin(t * 0.7), 0.02 * Math.sin(t * 0.9), lerp(0, 0.35, smooth(5, 10, t)))), insL = V3(-1.58, 1.42, 0.95);
  const k = ease(clamp((t - 3.5) / 1.6, 0, 1)); dCam.position.copy(ext).lerp(ins, k); dCam.lookAt(extL.lerp(insL, k)); dCam.fov = lerp(50, 46, k); }
