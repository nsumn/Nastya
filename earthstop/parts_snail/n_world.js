import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
// real shell: photogrammetry scan 'haus1' (OpenGameArt 'snail 3d model', CC0) — OBJ converted from its ASCII FBX 6.1 by tools/fbx6_to_obj.py
const SHELL = await new Promise(ok => new OBJLoader().load('assets/growkr/snail/shell.obj', ok, undefined, () => ok(null)));
const shellMats = await (async () => { const L = new THREE.TextureLoader(), ld = u => new Promise(ok => L.load('assets/growkr/snail/' + u, ok, undefined, () => ok(null)));
  const [c, n, orm] = await Promise.all([ld('haus1_3k_smooth_UV_None_BaseColor.jpg'), ld('haus1_3k_smooth_UV_None_Normal.jpg'), ld('haus1_3k_smooth_UV_None_OcclusionRoughnessMetallic.jpg')]);
  if (c) c.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshPhysicalMaterial({ map: c, normalMap: n, aoMap: orm, roughnessMap: orm, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.25 }); })();
const SHELL_ROT = (new URLSearchParams(location.search).get('sr') || '0,3.14,1.57').split(',').map(Number);
// =================== SNAIL (procedural body, metres): helico-spiral shell with growth bands, soft body, 4 tentacles (eyes on the long pair), slime trail ===================
function makeSnail() {
  const g = new THREE.Group();
  // shell: a tube swept along a log-spiral that rises a little, radius growing with the angle
  const turns = 3.2, N = 220, pts = [], rad = [];
  for (let i = 0; i <= N; i++) { const a = i / N * turns * Math.PI * 2, k = Math.exp(0.21 * a) / Math.exp(0.21 * turns * Math.PI * 2); pts.push(V3(Math.cos(a) * 0.0105 * k, Math.sin(a) * 0.0105 * k, 0.0035 * (1 - i / N))); rad.push(0.0012 + 0.0068 * k); }
  const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, N, 1, 18, false), P = tg.attributes.position, nrm = tg.attributes.normal;
  for (let i = 0; i < P.count; i++) { const seg = Math.min(N, Math.floor(i / 19)), c = curve.getPoint(seg / N); const v = V3(P.getX(i), P.getY(i), P.getZ(i)).sub(c); P.setXYZ(i, c.x + v.x * rad[seg], c.y + v.y * rad[seg], c.z + v.z * rad[seg]); }
  tg.computeVertexNormals();
  const shellTex = canvasTex(512, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#d9b68a'); gr.addColorStop(1, '#7a4e2a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) { c.fillStyle = `rgba(60,35,15,${0.15 + 0.25 * hash(x)})`; c.fillRect(x, 0, 1, h); } c.fillStyle = 'rgba(70,40,18,.55)'; c.fillRect(0, 22, w, 8); c.fillRect(0, 40, w, 4); });
  const shell = mesh(tg, new THREE.MeshPhysicalMaterial({ map: shellTex, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  shell.rotation.set(0, Math.PI / 2, 0); shell.rotateX(3.14); shell.position.set(0, 0.0185, 0.001); shell.userData.base = shell.quaternion.clone();
  if (SHELL) { shell.visible = false; const sc = SHELL.clone(); sc.traverse(o => { if (o.isMesh) { o.material = shellMats; o.castShadow = o.receiveShadow = true; o.geometry.setAttribute('uv2', o.geometry.attributes.uv); } });
    const b = new THREE.Box3().setFromObject(sc), sz = b.getSize(V3()), ctr = b.getCenter(V3()); const k = 0.024 / Math.max(sz.x, sz.y, sz.z); sc.position.copy(ctr).multiplyScalar(-k); sc.scale.setScalar(k);
    const holder = new THREE.Group(); holder.add(sc); holder.rotation.set(...SHELL_ROT); holder.position.set(0, 0.0165, -0.002); g.add(holder); g.userData.holder = holder; }
  g.add(shell);
  // body: a lathe 'foot' stretched along +Z (head forward), bumpy skin
  const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24; prof.push(new THREE.Vector2(0.0001 + 0.0062 * Math.sin(Math.PI * Math.pow(u, 0.75)) * (u < 0.9 ? 1 : 1 - (u - 0.9) * 6), u)); }
  const bg = new THREE.LatheGeometry(prof, 24); bg.scale(1, 0.042, 1); bg.rotateX(Math.PI / 2); bg.translate(0, 0.004, -0.02); { const Q = bg.attributes.position; for (let i = 0; i < Q.count; i++) if (Q.getY(i) < 0.001) Q.setY(i, 0.001); } bg.computeVertexNormals();
  const skin = canvasTex(256, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5e5246'); gr.addColorStop(1, '#9a8b78'); c.fillStyle = gr; c.fillRect(0, 0, w, h); speckle(c, w, h, 5000, ['#4f453b', '#6b5e50', '#8a7b68'], 2); for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(40,32,26,.35)'; c.beginPath(); c.ellipse(hash(i) * w, hash(i * 2) * h, 3 + hash(i * 3) * 5, 2 + hash(i * 4) * 3, 0, 0, 7); c.fill(); } });
  const bodyM = new THREE.MeshPhysicalMaterial({ map: skin, bumpMap: skin, bumpScale: 0.4, roughness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.08, sheen: 0.6, sheenColor: new THREE.Color('#d8cfc2') });
  const body = mesh(bg, bodyM); g.add(body);
  const neck = mesh(new THREE.CapsuleGeometry(0.0034, 0.008, 6, 12), bodyM); neck.rotation.x = Math.PI / 2 - 0.5; neck.position.set(0, 0.006, 0.019); g.add(neck);
  const tent = []; for (const [x, len, up] of [[-0.0022, 0.013, 0.9], [0.0022, 0.013, 0.9], [-0.003, 0.004, 0.35], [0.003, 0.004, 0.35]]) {
    const t = new THREE.Group(); t.position.set(x, 0.0085, 0.023); g.add(t); const s = mesh(new THREE.CylinderGeometry(0.00075, 0.0013, len, 12), bodyM); s.position.y = len / 2; t.add(s);
    if (len > 0.01) { const e = mesh(new THREE.SphereGeometry(0.0012, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#2e2620', roughness: 0.15, clearcoat: 1 })); e.position.y = len; t.add(e); }
    t.rotation.x = up; t.rotation.z = x * 60; tent.push(t); }
  g.userData = { shell, body, tent };
  return g;
}
function snailAnim(S, t, k = 1) { const { tent, body, shell } = S.userData; tent.forEach((tt, i) => { tt.rotation.x = (i < 2 ? 0.9 : 0.35) * k + 0.15 * Math.sin(t * 3 + i); tt.rotation.z = (i % 2 ? 1 : -1) * (0.15 + 0.08 * Math.sin(t * 2.3 + i)); });
  body.scale.z = 1 + 0.04 * Math.sin(t * 6); shell.quaternion.copy(shell.userData.base); shell.rotateZ(0.03 * Math.sin(t * 6 + 1)); }
// =================== GARDEN CURB + AUTUMN (kw scene): a concrete flower-bed curb along the promenade, ginkgo + maple leaves, wet sheen ===================
const CURB = { x0: -0.6, x1: 1.6, z: -5.55, h: 0.16 };
const curb = new THREE.Group(); kw.add(curb);
{ const conc = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#a9a69f'; c.fillRect(0, 0, w, h); speckle(c, w, h, 9000, ['#9a978f', '#b8b5ad', '#8f8c85', '#c4c1b9'], 2); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(70,70,70,.2)'; c.beginPath(); c.arc(hash(i) * w, hash(i * 2) * h, 2 + hash(i * 3) * 4, 0, 7); c.fill(); } });
  const m = new THREE.MeshPhysicalMaterial({ map: rep(conc, 12, 1), roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const b = mesh(new THREE.BoxGeometry(CURB.x1 - CURB.x0 + 3, CURB.h, 0.15), m); b.position.set((CURB.x0 + CURB.x1) / 2 + 1.5, CURB.h / 2, CURB.z); curb.add(b);
  const soil = mesh(new THREE.BoxGeometry(6, 0.12, 1.2), M('#4a3a2c', { roughness: 1 })); soil.position.set(1.2, 0.06, CURB.z + 0.68); curb.add(soil); }
// leaves: ginkgo (yellow fans) + maple (red stars), instanced, scattered on soil, curb and promenade
function leafGeo(kind) { const s = new THREE.Shape(); if (kind === 'g') { s.moveTo(0, 0); s.quadraticCurveTo(-0.035, 0.03, -0.03, 0.05); s.quadraticCurveTo(0, 0.062, 0.03, 0.05); s.quadraticCurveTo(0.035, 0.03, 0, 0); }
  else { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.014 : 0.04; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.02) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r + 0.02); } }
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; }
for (const [kind, col, n] of [['g', '#e8c23a', 900], ['m', '#c8402a', 450]]) {
  const im = new THREE.InstancedMesh(leafGeo(kind), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, side: THREE.DoubleSide }), n), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color();
  for (let i = 0; i < n; i++) { const x = -3 + hash(i * 1.3 + n) * 9, z = CURB.z - 2.6 + hash(i * 2.7 + n) * 4.2, onCurb = Math.abs(z - CURB.z) < 0.075 && x > CURB.x0 - 0.5, y = onCurb ? CURB.h + 0.002 : Math.abs(z - CURB.z - 0.68) < 0.6 ? 0.122 : 0.025;
    if (onCurb && x > CURB.x0 - 0.1 && x < CURB.x1 + 0.3 && Math.abs(z - CURB.z) < 0.05) continue;   // keep the snail's lane clear
    q.setFromEuler(new THREE.Euler((hash(i * 5) - 0.5) * 0.3, hash(i * 7) * 6.3, (hash(i * 9) - 0.5) * 0.3)); const sc = 0.7 + hash(i * 11) * 0.7;
    mm.compose(V3(x, y, z), q, V3(sc, sc, sc)); im.setMatrixAt(i, mm); im.setColorAt(i, cc.set(col).offsetHSL((hash(i) - 0.5) * 0.04, 0, (hash(i * 3) - 0.5) * 0.12)); }
  im.receiveShadow = true; im.castShadow = true; kw.add(im); }
// a ginkgo tree right behind the curb (fan-leaf crown, golden)
{ const t = grp(0.9, 0, CURB.z + 1.1, 0, kw); const trunk = mesh(new THREE.CylinderGeometry(0.12, 0.2, 4.5, 9), M('#5a4636')); trunk.position.y = 2.25; t.add(trunk);
  for (let i = 0; i < 9; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.9 + hash(i) * 0.4, 2), M('#e6b830', { roughness: 0.8 })); b.position.set((hash(i * 3) - 0.5) * 1.6, 4.2 + hash(i * 5) * 1.6, (hash(i * 7) - 0.5) * 1.6); t.add(b); } }
// slime trail: a glossy strip that grows behind the snail
const slimeM = new THREE.MeshPhysicalMaterial({ color: '#d8dde0', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false });
const slime = mesh(new THREE.PlaneGeometry(1, 0.008), slimeM, false, false); slime.rotation.x = -Math.PI / 2; kw.add(slime);
// an ant on the curb (3 segments, 6 legs)
const ant = new THREE.Group(); { const b = M('#1c1410', { roughness: 0.35 }); for (const [z, r] of [[-0.004, 0.0018], [0, 0.0012], [0.0035, 0.0014]]) { const s = mesh(new THREE.SphereGeometry(r, 10, 8), b); s.scale.set(1, 0.8, 1.3); s.position.set(0, 0.0018, z); ant.add(s); }
  for (let i = 0; i < 6; i++) { const l = mesh(new THREE.CylinderGeometry(0.0002, 0.0002, 0.005, 4), b); l.position.set((i % 2 ? 1 : -1) * 0.002, 0.0012, -0.002 + Math.floor(i / 2) * 0.002); l.rotation.z = (i % 2 ? 1 : -1) * 1.0; ant.add(l); } }
ant.rotation.y = Math.PI / 2; kw.add(ant);
// =================== ROAD + KTX next to the park (stylised, south bank): a 4-lane road at z = +16, an elevated rail line at z = +24 ===================
const road = mesh(new THREE.PlaneGeometry(60000, 14), new THREE.MeshStandardMaterial({ map: rep(canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#4c4e52'; c.fillRect(0, 0, w, h); speckle(c, w, h, 6000, ['#44464a', '#56585c'], 2); c.fillStyle = '#e8e2c8'; for (let x = 0; x < w; x += 64) c.fillRect(x, h / 2 - 2, 34, 4); c.fillStyle = '#ffffff'; c.fillRect(0, 6, w, 3); c.fillRect(0, h - 9, w, 3); }), 4000, 1), roughness: 0.85 }), false, true);
road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, 16); kw.add(road);
const rail = new THREE.Group(); kw.add(rail); { const c = M('#c9c5bc'); bx(60000, 0.8, 6, c, 0, 6.6, 24, rail); for (let x = -400; x < 4000; x += 30) bx(1.5, 6.2, 1.5, c, x, 3.1, 24, rail); bx(60000, 0.15, 0.1, '#777', 0, 7.1, 23.3, rail); bx(60000, 0.15, 0.1, '#777', 0, 7.1, 24.7, rail); }
function car(col) { const g = new THREE.Group(); bx(4.4, 0.9, 1.8, col, 0, 0.75, 0, g, { roughness: 0.35, metalness: 0.4 }); bx(2.4, 0.7, 1.6, '#24282e', -0.2, 1.45, 0, g, { roughness: 0.15, metalness: 0.5 });
  for (const [x, z] of [[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), M('#151515')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); } return g; }
const CARS = []; ['#e8e8ea', '#1f2a44', '#b8bcc4', '#a22a2a', '#2f2f33', '#f2f2f2', '#3a5a8a', '#d9d9d9'].forEach((c, i) => { const g = car(c); kw.add(g); CARS.push({ g, lane: [12.5, 14.5, 17.5, 19.5][i % 4], x0: -60 + i * 21 + hash(i) * 8, v: 24 + hash(i * 3) * 5 }); });
// KTX: white body, blue stripe, sloped nose; 8 cars
const ktx = new THREE.Group(); kw.add(ktx);
{ const wh = M('#f3f4f6', { roughness: 0.3, metalness: 0.3 }), bl = M('#1d4fa0', { roughness: 0.4 }), win = M('#1b2430', { roughness: 0.1, metalness: 0.6 });
  for (let i = 0; i < 8; i++) { const c = new THREE.Group(); c.position.x = -i * 19; ktx.add(c); bx(18.4, 3.4, 2.9, wh, 0, 1.7, 0, c); bx(18.4, 0.35, 2.92, bl, 0, 1.1, 0, c); bx(16, 0.6, 2.93, win, 0, 2.3, 0, c); }
  const nose = mesh(new THREE.ConeGeometry(1.7, 7, 16), wh); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1, 0.85); nose.position.set(12.7, 1.6, 0); ktx.add(nose); }
ktx.position.set(0, 7.2, 24);
