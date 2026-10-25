// =================== KAUB (meters): sunset over the Rhine; a barge stuck on a gravel bar, the castle on its island, the gauge board on the bank ===================
const kaub = new THREE.Scene(); kaub.fog = new THREE.Fog(0xf0b880, 70, 300); const kaubCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 600);
kaub.add(new THREE.HemisphereLight(0xffe0c0, 0x3a4a5a, 0.9)); const sunK = new THREE.DirectionalLight(0xffb070, 2.6); sunK.position.set(-40, 12, -70); sunK.castShadow = true; sunK.shadow.mapSize.set(2048, 2048); Object.assign(sunK.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 200 }); kaub.add(sunK, sunK.target); sunK.target.position.set(0, 0, -20);
{ const sky = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2c5a'); gr.addColorStop(0.55, '#c86a5a'); gr.addColorStop(0.8, '#f4a660'); gr.addColorStop(1, '#ffd890'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sk = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), new THREE.MeshBasicMaterial({ map: sky, fog: false, depthWrite: false })); sk.position.set(0, 150, -320); kaub.add(sk);
  const gnd = mesh(new THREE.PlaneGeometry(900, 900), M('#5a7a3a', { roughness: 1 }), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.05; kaub.add(gnd);
  const water = mesh(new THREE.PlaneGeometry(120, 900), M('#2f6f9a', { roughness: 0.25, metalness: 0.2 }), false, true); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.02, -100); kaub.add(water);
  for (let i = 0; i < 16; i++) { const h = mesh(new THREE.ConeGeometry(R(12, 22), R(18, 30), 6), M(pick(['#3a5a3a', '#4a6a40', '#5a4a3a']), { flatShading: true })); h.position.set(R(-150, -70), 6, R(-300, -20)); kaub.add(h); }
  for (let i = 0; i < 16; i++) { const h = mesh(new THREE.ConeGeometry(R(12, 22), R(14, 26), 6), M(pick(['#3a5a3a', '#4a6a40']), { flatShading: true })); h.position.set(R(70, 150), 4, R(-300, -20)); kaub.add(h); } }
// gravel bar (the trap) + the barge, listing
{ const bar = mesh(new THREE.SphereGeometry(1, 24, 12), M('#d8bf8a', { roughness: 1 }), false, true); bar.scale.set(16, 0.25, 6); bar.position.set(2, 0.08, -20); kaub.add(bar);
  for (let i = 0; i < 5; i++) { const st = mesh(new THREE.DodecahedronGeometry(0.25, 0), M('#9a8a72', { flatShading: true })); st.position.set(R(-6, 9), 0.15, R(-22, -17)); kaub.add(st); } }
const barge = grp(2, 0, -20, 0.05, kaub); bx(9, 1.0, 2.6, '#7a3a2a', 0, 0.35, 0, barge); bx(2.4, 1.2, 2.2, '#e8e0d0', -3.4, 1.4, 0, barge);
for (let i = 0; i < 3; i++) bx(2, 0.9, 2.2, pick(['#2a6ad0', '#d86a2a', '#e8c040']), -1.6 + i * 2.05, 1.4, 0, barge);
barge.rotation.z = 0.14;
// the castle on its island (dark silhouette against the sunset)
{ const isl = mesh(new THREE.CylinderGeometry(20, 22, 2, 20), M('#4a5a3a', { flatShading: true })); isl.position.set(40, 0.5, -90); kaub.add(isl);
  const cs = '#2a2a30'; bx(14, 6, 9, cs, 40, 5, -90, kaub); for (const [x, z] of [[33, -95], [47, -95], [33, -85], [47, -85]]) { const tw = mesh(new THREE.CylinderGeometry(1.4, 1.6, 9, 8), M(cs)); tw.position.set(x, 6, z); kaub.add(tw); const rf = mesh(new THREE.ConeGeometry(1.8, 3, 8), M('#5a2a2a')); rf.position.set(x, 10.5, z); kaub.add(rf); } }
// the gauge board on the left bank: a striped post, water-level marks, the red 25 cm line
{ const post = mesh(new THREE.BoxGeometry(0.4, 4, 0.2), M('#ffffff')); post.position.set(-7, 2, -14); kaub.add(post);
  for (let i = 0; i < 8; i++) { const st = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.22), M(i % 2 ? '#ffffff' : '#1a1a1a')); st.position.set(-7, 0.3 + i * 0.45, -13.9); kaub.add(st); }
  const red = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.2), M('#e02a2a')); red.position.set(-7, 1.6, -13.9); kaub.add(red); }
function updateKaub(t) { barge.position.y = 0.0 + 0.04 * Math.sin(t * 1.3); barge.rotation.z = 0.14 + 0.02 * Math.sin(t * 0.8); }
function kaubCamera(t) { kaubCam.position.set(lerp(-8, -5, smooth(0, 8, t)), lerp(3.6, 4.2, smooth(0, 8, t)), lerp(14, 6, smooth(0, 8, t))); kaubCam.lookAt(0, 2.4, -24); kaubCam.fov = 50; }

// =================== TRUCKS AND TRAIN (meters): a motorway embankment and a freight line; the traffic that replaces the barges ===================
const trk = new THREE.Scene(); trk.fog = new THREE.Fog(0xf2c890, 70, 320); const trkCam = new THREE.PerspectiveCamera(46, W / H, 0.1, 600);
trk.add(new THREE.HemisphereLight(0xffe6c8, 0x404a58, 0.9)); const sunT = new THREE.DirectionalLight(0xffc080, 2.4); sunT.position.set(-30, 10, -40); sunT.castShadow = true; sunT.shadow.mapSize.set(2048, 2048); Object.assign(sunT.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 200 }); trk.add(sunT, sunT.target);
{ const sk = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), new THREE.MeshBasicMaterial({ map: canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a6ab8'); gr.addColorStop(0.6, '#f0a070'); gr.addColorStop(1, '#ffd8a0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false, depthWrite: false })); sk.position.set(0, 150, -320); trk.add(sk);
  const gnd = mesh(new THREE.PlaneGeometry(900, 900), M('#6a8a4a', { roughness: 1 }), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.05; trk.add(gnd);
  const road = mesh(new THREE.BoxGeometry(14, 0.3, 900), M('#3a3a42', { roughness: 0.9 }), false, true); road.position.set(0, 0.1, -300); trk.add(road);
  for (let z = 0; z > -600; z -= 6) { const d = mesh(new THREE.BoxGeometry(0.2, 0.02, 3), M('#f2e8c0'), false, true); d.position.set(0, 0.27, z); trk.add(d); }
  const rail = mesh(new THREE.BoxGeometry(2.5, 0.2, 900), M('#5a5a60'), false, true); rail.position.set(-12, 0.1, -300); trk.add(rail);
  for (let z = 0; z > -600; z -= 2.2) { const sl = mesh(new THREE.BoxGeometry(2.8, 0.1, 0.25), M('#4a3a2a'), false, true); sl.position.set(-12, 0.22, z); trk.add(sl); } }
function truck(color) { const g = new THREE.Group(); bx(2.4, 2.3, 1.6, '#2a3a5a', 0, 1.4, 1.2, g); bx(2.3, 2.0, 1.8, '#f2f0ea', 0, 1.4, -1.0, g); bx(2.2, 0.5, 0.3, '#2a2a30', 0, 1.1, -0.1, g);
  for (const [x, z] of [[-1.1, 1.2], [1.1, 1.2], [-1.1, -0.6], [1.1, -0.6], [-1.1, -1.6], [1.1, -1.6]]) { const w = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); }
  bx(0.1, 0.5, 0.6, color, 0, 2.6, 1.2, g); return g; }
const trucks = []; for (let k = 0; k < 16; k++) { const lane = k % 2; const g = truck(pick(['#d86a2a', '#2a6ad0', '#e8c040', '#d83a3a'])); trk.add(g); trucks.push({ g, lane, z0: -k * 9 - 14 }); }
function wagon(x, z) { const g = new THREE.Group(); bx(2.4, 1.6, 6.5, pick(['#8a4a2a', '#4a6a8a', '#7a7a80']), 0, 1.2, 0, g); for (const zz of [-2.2, 2.2]) { const w = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(0, 0.22, zz); g.add(w); } g.position.set(x, 0, z); trk.add(g); return g; }
const wagons = []; for (let k = 0; k < 9; k++) wagons.push({ g: wagon(-12, -k * 8 - 40), z0: -k * 8 - 40 });
function updateTrucks(t) { const u = clamp((t - TRUCK) / (SHOP - TRUCK), 0, 1);
  trucks.forEach(T => { const z = wrapR(T.z0 + (t - TRUCK) * 10 * (T.lane ? -1 : 1), -75, -12); T.g.position.set(T.lane ? 3.6 : -3.6, 0, z); T.g.rotation.y = T.lane ? Math.PI : 0; });
  wagons.forEach(W => { W.g.position.z = wrapR(W.z0 + (t - TRUCK) * 14, -120, -40); }); }
function trucksCamera(t) { const k = smooth(TRUCK - 0.3, SHOP, t); trkCam.position.set(lerp(9, 7, k), lerp(3.4, 3.8, k), lerp(8, 5, k)); trkCam.lookAt(-2, 1.6, -26); trkCam.fov = 46; }

// =================== SHOP (meters): a shelf aisle with rising price tags (arrows, no invented numbers) ===================
const shop = new THREE.Scene(); shop.background = new THREE.Color('#e8e2d6'); shop.fog = new THREE.Fog(0xe8e2d6, 8, 30); const shopCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
shop.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.1)); { const s = new THREE.DirectionalLight(0xfff4e8, 1.6); s.position.set(2, 6, 5); shop.add(s); }
{ const fl = mesh(new THREE.PlaneGeometry(30, 30), M('#cfc9bc', { roughness: 0.6 }), false, true); fl.rotation.x = -Math.PI / 2; shop.add(fl); bx(30, 4, 0.2, '#f4f0e8', 0, 2, -6, shop); }
const tagTex = (up) => canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = up ? '#d83a3a' : '#2a8a4a'; g.font = 'bold 72px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(up ? '↑' : '↓', w / 2, 92); });
const TAGS = [], TAG_UP = tagTex(true);
for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) { const x = -4 + i * 1.0, y = 0.5 + row * 1.1; bx(0.8, 0.9, 0.4, pick(['#e8584a', '#3a7ac8', '#f2c84a', '#6ab04a', '#c8c8d0']), x, y, -5.7, shop);
  const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshBasicMaterial({ map: TAG_UP, color: new THREE.Color(1.1, 1.1, 1.1) })); tg.position.set(x, y + 0.5, -5.45); shop.add(tg); TAGS.push({ tg, row, i }); }
function updateShop(t) { TAGS.forEach((T, k) => { const on = smooth(SHOP + 0.5 + k * 0.08, SHOP + 1.2 + k * 0.08, t); T.tg.scale.setScalar(0.6 + 0.4 * on); T.tg.material.color.setRGB(1.1, 1.1 - 0.4 * on, 1.1 - 0.4 * on); }); }
function shopCamera(t) { shopCam.position.set(lerp(0.4, 0.2, smooth(SHOP, CARD, t)), 1.2, 10.5 - 0.8 * smooth(SHOP, CARD, t)); shopCam.lookAt(0, 0.5, -5); shopCam.fov = 56; }

// =================== DOM + render ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'Was wäre, wenn<br><span class="hl">der Rhein</span> austrocknet?'; el.endT.innerHTML = 'Was wäre, wenn<br><span class="hl">der Rhein</span> austrocknet?';
el.endS.innerHTML = 'PEGEL KAUB: REKORD 2018 BEI 25 CM.<br>AUGUST 2026: DARUNTER.<br>RHEIN: 86 % DER BINNENSCHIFFSFRACHT (JAN–MAI 2022, DESTATIS).';
const captions = [
  [3.5, 7.6, 'Der Rhein ist Deutschlands<br>wichtigste Wasserstraße.'],
  [8.6, 13.4, 'Die Fracht fährt plötzlich<br>auf Straße und Schiene.'],
  [14.6, 18.9, 'Und alles wird teurer.'],
];
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < TRUCK) return ['<b></b>KAUB · RHEIN', 'REKORD 2018', '25 cm', 'DER BISHERIGE TIEFSTWERT'];
  if (t < SHOP) return ['<b style="background:#ff6a5a"></b>KAUB · AUGUST 2026', 'PEGEL', 'UNTER 25 cm', 'REKORD GEBROCHEN'];
  if (t < CARD) return ['<b style="background:#e8b030"></b>FOLGEN', 'FRACHT', 'Straße + Schiene', 'STATT DES RHEINS'];
  return null; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(2.7, 3.2, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(0.8, 1.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(CARD, CARD + 0.4, t); el.endT.style.opacity = smooth(CARD + 0.2, CARD + 0.6, t); el.endS.style.opacity = smooth(CARD + 0.4, CARD + 0.8, t); }
const SCN = { kaub: [updateKaub, kaubCamera, kaub, () => kaubCam, 1.0], trucks: [updateTrucks, trucksCamera, trk, () => trkCam, 1.0], shop: [updateShop, shopCamera, shop, () => shopCam, 1.0] };
const SEQ = [[0, 'kaub', 0.7], [TRUCK, 'trucks', 0.7], [SHOP, 'shop', 0.7]];
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && SEQ[i + 1][2] > 0 && t > SEQ[i + 1][0] - SEQ[i + 1][2] / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - SEQ[i + 1][2] / 2, SEQ[i + 1][0] + SEQ[i + 1][2] / 2, t); }
  else if (i > 0 && SEQ[i][2] > 0 && t < SEQ[i][0] + SEQ[i][2] / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - SEQ[i][2] / 2, SEQ[i][0] + SEQ[i][2] / 2, t); }
  let eA = 1, eB = 1; if (!B || mix < 1) eA = shootScene(A, t, RTA); if (B) eB = shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0;
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
