// =================== street props: day sky, Times Square billboards, London block, people ===================
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 uTop, uHor; varying vec3 vD; void main(){ float e=max(vD.y,0.0); vec3 c=mix(uHor,uTop,pow(e,0.5)); gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMat); skyDome.renderOrder = -10; skyDome.frustumCulled = false; city.add(skyDome);
// ---- Times Square billboards (made-up ads)
const ADS = [
  ['NOVA COLA', '#e8322a', '#ffd23a'], ['BROADWAY', '#1b1b3a', '#ffd86a'], ['LIVE TONIGHT', '#6a1fd0', '#ffffff'], ['MEGA SALE', '#ff7a1a', '#ffffff'],
  ['PIZZA 24/7', '#d9261c', '#fff2c0'], ['SKYLINE', '#0c6fd9', '#ffffff'], ['CINEMA', '#111111', '#ff3355'], ['ZOOM PHONE', '#13c2a3', '#04202a'],
  ['NEW YORK', '#ffffff', '#e8322a'], ['PLANET FM', '#2b2bff', '#9ef0ff'], ['SNACKZ', '#ffcc00', '#c4161c'], ['GALAXY TV', '#000000', '#38f5ff'],
  ['HOTEL 42', '#7a0f3a', '#ffd6e6'], ['RUN FAST', '#00b34a', '#ffffff'], ['ICE CREAM', '#ff8fc8', '#ffffff'], ['THE SHOW', '#b30000', '#ffe08a'],
];
function signTex(word, bg, fg, w, h, style = 0) {
  return canvasTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#' + new THREE.Color(bg).offsetHSL(R(-0.08, 0.08), 0, R(-0.2, 0.15)).getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (style === 1) { g.fillStyle = 'rgba(255,255,255,0.18)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(R(0, w), R(0, h), R(20, h * 0.6), 0, Math.PI * 2); g.fill(); } }
    if (style === 2) { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 10, h); }
    let fs = h * 0.42; g.font = `900 ${fs}px Inter, Arial, sans-serif`; while (g.measureText(word).width > w * 0.86 && fs > 10) { fs -= 4; g.font = `900 ${fs}px Inter, Arial, sans-serif`; }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2);
    g.strokeStyle = fg; g.lineWidth = 6; g.globalAlpha = 0.6; g.strokeRect(6, 6, w - 12, h - 12); g.globalAlpha = 1;
  });
}
function billboard(i, w, h, pos, rotY) {
  const [word, bg, fg] = ADS[i % ADS.length]; const th = Math.max(64, Math.round(512 / (w / h)));
  const m = new THREE.MeshBasicMaterial({ map: signTex(word, bg, fg, 512, th, i % 3) }); m.color.setScalar(1.25);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.copy(pos); p.rotation.y = rotY; city.add(p);
  const fr = mesh(BOX, M('#1a1a1c')); fr.scale.set(w + 0.6, h + 0.6, 0.4); fr.position.copy(pos); fr.rotation.y = rotY;
  if (rotY === 0) fr.position.z -= 0.25; else if (rotY === Math.PI) fr.position.z += 0.25; else fr.position.x += 0.25; city.add(fr);
}
{
  let k = 0;
  for (const side of [-1, 1]) for (let x = 36; x < 160; x += R(11, 20)) {
    if (CROSS.some(c => Math.abs(x - c) < 9)) continue;
    let y = R(7, 11);
    while (y < 42) { const w = R(8, 16), h = R(4, 9); billboard(k++, w, h, new THREE.Vector3(x + R(-2, 2), y + h / 2, side * 11.7), side < 0 ? 0 : Math.PI); y += h + R(1.5, 6); }
  }
  const TX = 186; const tw = mesh(BOX, M('#2a2c30', { roughness: 0.6 })); tw.scale.set(20, 64, 24); tw.position.set(TX + 10, 32, 0); city.add(tw);
  let y = 9; while (y < 54) { const h = R(7, 13); billboard(k++, 21, h, new THREE.Vector3(TX - 0.3, y + h / 2, 0), -Math.PI / 2); y += h + 1.2; }
  for (let i = 0; i < 7; i++) box(10, 0.45, 1.4, M('#b3261e', { roughness: 0.5 }), 128, 0.25 + i * 0.45, -3.5 - i * 1.2);
}
// ---- London block (x 300..430): double-deckers, black cabs, phone boxes, bunting, shop signs
function windowsTex(w, h, rows, col) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) { const y = h * (0.12 + r * 0.45); for (let x = w * 0.04; x < w * 0.92; x += w * 0.1) { g.fillStyle = '#26333d'; g.fillRect(x, y, w * 0.085, h * 0.28); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w * 0.085, h * 0.05); } }
    g.fillStyle = '#f2c12e'; g.font = `700 ${h * 0.09}px Inter, Arial`; g.fillText('CITY TOUR', w * 0.06, h * 0.97);
  });
}
const busTex = windowsTex(512, 256, 2, '#c8102e');
function dbus(x, lane, dir) {
  const g = new THREE.Group(); g.position.set(x, 0, lane); g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g);
  const side = new THREE.MeshStandardMaterial({ map: busTex, roughness: 0.5 });
  const body = mesh(BOX, [M('#c8102e', { roughness: 0.5 }), M('#c8102e', { roughness: 0.5 }), M('#b30d27'), M('#222'), side, side]); body.scale.set(11, 4.0, 2.5); body.position.y = 2.45; g.add(body);
  box(0.06, 1.0, 2.2, M('#26333d', { roughness: 0.2 }), 5.52, 3.2, 0, g); box(0.06, 1.0, 2.2, M('#26333d', { roughness: 0.2 }), 5.52, 1.5, 0, g);
  for (const wx of [-3.6, 3.4]) for (const wz of [-1.15, 1.15]) { const w = mesh(wheelGeo, M('#151515')); w.scale.setScalar(1.45); w.position.set(wx, 0.5, wz); g.add(w); }
  return g;
}
function phoneBox(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.18, z); city.add(g);
  const pt = canvasTex(64, 192, (c) => { c.fillStyle = '#c8102e'; c.fillRect(0, 0, 64, 192); c.fillStyle = '#26333d'; for (let r = 0; r < 6; r++) for (let q = 0; q < 3; q++) c.fillRect(8 + q * 17, 30 + r * 22, 14, 18); c.fillStyle = '#111'; c.fillRect(4, 6, 56, 14); c.fillStyle = '#fff'; c.font = '700 10px Inter'; c.fillText('TELEPHONE', 6, 17); });
  const m = new THREE.MeshStandardMaterial({ map: pt, roughness: 0.5 });
  const b = mesh(BOX, m); b.scale.set(1.0, 2.5, 1.0); b.position.y = 1.25; g.add(b);
  const top = mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.3, 4, 1), M('#c8102e')); top.rotation.y = Math.PI / 4; top.position.y = 2.65; g.add(top);
}
const bunting = [];
function buntingLine(x, z0, z1, y) {
  const n = 22; const cols = ['#c8102e', '#ffffff', '#012169'];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n; const z = lerp(z0, z1, u); const yy = y - Math.sin(u * Math.PI) * 1.6;
    const tri = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.32), new THREE.Vector3(0, 0, 0.32), new THREE.Vector3(0, -0.75, 0)]), new THREE.MeshStandardMaterial({ color: cols[i % 3], side: THREE.DoubleSide, roughness: 0.8 }));
    tri.position.set(x, yy, z); city.add(tri); bunting.push({ tri, ph: R(0, 6) });
  }
}
for (const bx of [318, 352, 386, 420]) buntingLine(bx, -11.5, 11.5, 9.5);
for (const [x, z] of [[311, -8.6], [347, 8.6], [404, -8.6]]) phoneBox(x, z);
const shopSigns = [['FISH & CHIPS', '#0b3d2e', '#f5e6b8'], ['THE CROWN', '#1b1b1b', '#e8c060'], ['TEA ROOM', '#4a1f3a', '#ffe1ef'], ['NEWSAGENT', '#123a6b', '#ffffff'], ['BAKERY', '#7a3b12', '#ffe2b0'], ['PHARMACY', '#0b6b3a', '#ffffff']];
{ let k = 0; for (const side of [-1, 1]) for (let x = 304; x < 432; x += R(12, 17)) { if (CROSS.some(c => Math.abs(x - c) < 9)) continue; const [w, bg, fg] = shopSigns[k++ % shopSigns.length]; const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshStandardMaterial({ map: signTex(w, bg, fg, 512, 74), roughness: 0.6 })); p.position.set(x, 4.3, side * 11.86); p.rotation.y = side < 0 ? 0 : Math.PI; city.add(p); } }
// traffic jam (left-hand traffic: cars moving +x keep to the -z side, which is the camera's left)
const jam = [];
{
  const make = (x, lane, dir, cab) => { const g = new THREE.Group(); const c = cab ? '#141414' : pick(CAR_COLS);
    box(4.4, 0.8, 1.85, M(c, { roughness: 0.35, metalness: 0.3 }), 0, 0.73, 0, g); box(cab ? 2.8 : 2.4, cab ? 0.85 : 0.62, 1.7, M(c, { roughness: 0.35, metalness: 0.3 }), -0.15, cab ? 1.55 : 1.42, 0, g);
    box(cab ? 2.82 : 2.42, cab ? 0.6 : 0.48, 1.72, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, cab ? 1.6 : 1.42, 0, g);
    if (cab) box(0.5, 0.18, 0.28, '#f2c12e', 0.2, 2.06, 0, g);
    for (const wx of [-1.4, 1.4]) for (const wz of [-0.85, 0.85]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, 0.34, wz); g.add(w); }
    g.position.set(x, 0, lane); g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g); jam.push({ g, x, lane }); };
  for (const [lane, dir] of [[-1.75, 1], [-5.25, 1], [1.75, -1], [5.25, -1]]) for (let x = 304; x < 432; x += R(6.5, 9)) { if (CROSS.some(c => Math.abs(x - c) < 9)) continue; if (lane === -1.75 && (Math.abs(x - 330) < 7 || Math.abs(x - 392) < 7)) continue; make(x, lane, dir, rnd() < 0.35); }
  dbus(330, -1.75, 1); dbus(392, -1.75, 1); dbus(372, 1.75, -1);
}
// ---- people: packed London crowd (sidewalks + between the jammed cars), Times Square Brit, talk pair
const londonCrowd = [];
const blocked = (x, z) => jam.some(c => Math.abs(x - c.x) < 2.6 && Math.abs(z - c.lane) < 1.2) || [330, 392].some(bx => Math.abs(x - bx) < 6 && Math.abs(z + 1.75) < 1.6) || (Math.abs(x - 372) < 6 && Math.abs(z - 1.75) < 1.6);
for (let i = 0; i < 1150; i++) {
  const x = i < 900 ? R(300, 372) : R(372, 430), z = R(-11.6, 11.6); if (blocked(x, z) || CROSS.some(c => Math.abs(x - c) < 7.5 && Math.abs(z) < 7)) { i--; continue; }
  const p = makePerson(rnd); city.add(p.outer); londonCrowd.push({ p, x, z, ry: R(0, 6.28), ph: R(0, 6), walk: rnd() < 0.3 });
}
const cupGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.09, 10);
function teaPerson(rndOpts) { const p = makePerson(rnd, rndOpts); const cup = mesh(cupGeo, M('#f4f1ea')); cup.position.set(0, -0.3, 0.06); p.elbows[1].add(cup); return p; }
const brit = teaPerson({ top: '#2b3a67', bottom: '#3a3a3a' }); city.add(brit.outer);
// tumbleweed: a ball of twigs (line segments on a sphere)
const weed = new THREE.Group(); city.add(weed);
{ const pts = []; for (let i = 0; i < 160; i++) { const a = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(0.35, 0.6)); const b = a.clone().add(new THREE.Vector3(R(-0.5, 0.5), R(-0.5, 0.5), R(-0.5, 0.5))).normalize().multiplyScalar(R(0.35, 0.6)); pts.push(a, b); }
  weed.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#8a6a3c' }))); }
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.5), new THREE.MeshStandardMaterial({ map: signTex('FISH & CHIPS', '#0b3d2e', '#f5e6b8', 512, 110), roughness: 0.6 })); p.position.set(360, 5.3, 11.84); p.rotation.y = Math.PI; city.add(p); }
const yank = makePerson(rnd, { top: '#b22234', bottom: '#2a3a5c', cap: true }); city.add(yank.outer);
const clerk = makePerson(rnd, { top: '#0b3d2e', bottom: '#2b2b2e' }); city.add(clerk.outer);
