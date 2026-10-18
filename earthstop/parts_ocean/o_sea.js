// =================== SCENE A (meters): Jersey Shore beach -> drained Atlantic floor (shelf, ships, cables, salt plain) ===================
const sea = new THREE.Scene(); const seaCam = new THREE.PerspectiveCamera(60, W / H, 0.5, 40000);
sea.fog = new THREE.Fog(new THREE.Color('#cfe0ee'), 800, 16000);
const seaHemi = new THREE.HemisphereLight(0xdfe8f6, 0x6a5a48, 1.1); sea.add(seaHemi);
const seaSun = new THREE.DirectionalLight(0xfff0dc, 3.0); seaSun.castShadow = true; seaSun.shadow.mapSize.set(2048, 2048);
Object.assign(seaSun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 1200 }); seaSun.shadow.bias = -0.0005; seaSun.shadow.normalBias = 0.03; sea.add(seaSun, seaSun.target);
const seaDome = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color('#4a86d0') }, uBot: { value: new THREE.Color('#d6e6f2') } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uTop, uBot; varying vec3 vD; void main(){ float e=max(vD.y,0.0); gl_FragColor=vec4(mix(uBot,uTop,pow(e,0.55)),1.0); }' })); sea.add(seaDome);
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const h = (i, j) => hash(i * 157.31 + j * 311.77); const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); }
function fbm(x, y, o = 4) { let a = 0, s = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { a += vnoise(x * f, y * f) * s; n += s; s *= 0.5; f *= 2.03; } return a / n; }
// seabed profile: beach (z>0) -> shelf (to -40 m at 2 km) -> slope (to -400 m at 8 km) -> salt plain
function seabed(x, z) { const d = -z; if (d < 0) return Math.min(6, -d * 0.03) + fbm(x * 0.02, z * 0.02) * 1.5 * smooth(0, 60, -d);
  const base = -(0.02 * Math.min(d, 2000) + 0.06 * Math.max(0, Math.min(d, 8000) - 2000) + 0.004 * Math.max(0, d - 8000));
  return base + (fbm(x * 0.004, z * 0.004, 4) - 0.5) * 10 * smooth(300, 3000, d) + Math.sin(x * 0.35 + Math.sin(z * 0.05) * 2) * 0.12 * (1 - smooth(200, 800, d)); }
const saltK = d => smooth(3500, 8000, d);
{ const g = new THREE.PlaneGeometry(9000, 16000, 180, 360); g.rotateX(-Math.PI / 2); g.translate(0, 0, -7600); const p = g.attributes.position, col = new Float32Array(p.count * 3); const c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = seabed(x, z); p.setY(i, y); const d = -z;
    if (d < 0) c.set(d > -12 ? '#e0cc9a' : '#d8c08a'); else { c.set(d < 600 ? '#b49c74' : '#7c7060'); const pa = fbm(x * 0.006 + 3, z * 0.006, 3); c.lerp(c2.set(pa > 0.55 ? '#5e5648' : '#a89a80'), Math.abs(pa - 0.5) * 1.2); c.lerp(c2.set('#ece9e2'), saltK(d) * (0.6 + 0.4 * fbm(x * 0.01, z * 0.01))); }
    c.offsetHSL(0, 0, (hash(x * 0.37 + z * 0.11) - 0.5) * 0.05); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), false, true); sea.add(m); }
// scattered rocks along the camera path
{ const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#6a6258', { flatShading: true }), 900); const d = new THREE.Object3D();
  for (let i = 0; i < 900; i++) { const z = -R(30, 9000), x = R(-260, 260) * (1 + -z / 3000); d.position.set(x, seabed(x, z) - 0.2, z); const s = R(0.4, 2.5) * (1 + -z / 4000); d.scale.set(s, s * R(0.4, 0.8), s * R(0.7, 1.2)); d.rotation.set(R(0, 3), R(0, 3), 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.castShadow = true; im.receiveShadow = true; sea.add(im); }
// beach town: boardwalk + houses + a far NYC skyline
{ bx(3000, 0.4, 5, '#a07a54', 0, 3.2, 70, sea);
  for (let i = 0; i < 70; i++) { const x = -1400 + i * 40 + R(-8, 8), h = R(6, 12), w = R(10, 16); const hs = grp(x, 6, R(95, 130), 0, sea); bx(w, h, 10, pick(['#e8dcc8', '#c8d8e0', '#f0e0c8', '#d8b8a0', '#e8e8e8']), 0, h / 2, 0, hs); const rf = mesh(new THREE.ConeGeometry(w * 0.75, 4, 4), M(pick(['#7a3a2e', '#3a4a5a', '#5a4a3a']), { flatShading: true })); rf.rotation.y = Math.PI / 4; rf.scale.z = 0.7; rf.position.y = h + 2; hs.add(rf); }
  for (let i = 0; i < 40; i++) { const h = R(80, 380); bx(R(40, 90), h, R(40, 90), pick(['#8a9aa8', '#a8b0b8', '#6a7a88', '#b8b0a0']), R(-2500, 2500), h / 2, R(2400, 3200), sea); } }
// the water: one big plane whose level drops; a whirlpool where the plug was pulled
const seaWater = mesh(new THREE.PlaneGeometry(9000, 16000, 120, 240).rotateX(-Math.PI / 2).translate(0, 0, -7600), new THREE.MeshStandardMaterial({ color: '#2a6a8a', roughness: 0.35, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }), false, true);
seaWater.userData.base = seaWater.geometry.attributes.position.array.slice(); sea.add(seaWater);
const PLUG = V3(0, 0, -6500);
const whirlTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(230,245,255,${0.5 - k * 0.05})`; g.lineWidth = 14 - k; g.beginPath(); for (let a = 0; a < 18; a += 0.05) { const r = 250 * (1 - a / 18); const ang = a + k * 0.9; g.lineTo(w / 2 + Math.cos(ang) * r, h / 2 + Math.sin(ang) * r); } g.stroke(); } });
const whirl = new THREE.Mesh(new THREE.CircleGeometry(900, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: whirlTex, transparent: true, depthWrite: false, fog: false })); whirl.position.copy(PLUG).add(V3(0, 0.6, 0)); sea.add(whirl);
const plug = new THREE.Group(); sea.add(plug); { const pm = M('#2a2a2e', { roughness: 0.4 }); const pp = mesh(new THREE.CylinderGeometry(120, 160, 90, 20), pm); pp.position.y = 45; plug.add(pp); const ring = mesh(new THREE.TorusGeometry(40, 10, 8, 20), M('#8a8a8a', { metalness: 0.7, roughness: 0.3 })); ring.position.y = 120; plug.add(ring);
  for (let k = 0; k < 40; k++) { const l = mesh(new THREE.TorusGeometry(26, 7, 6, 14), M('#9a9a9a', { metalness: 0.7, roughness: 0.3 })); l.position.y = 150 + k * 44; l.rotation.y = k % 2 ? Math.PI / 2 : 0; plug.add(l); } }
plug.position.copy(PLUG);
// boats that settle on the sand
const boats = [];
for (let i = 0; i < 9; i++) { const g = new THREE.Group(); const hull = mesh(new THREE.CylinderGeometry(1.4, 0.9, 7, 6, 1).rotateZ(Math.PI / 2), M(pick(['#f2f2f2', '#d8423a', '#2a5a9a', '#f0c040']), { flatShading: true })); hull.scale.set(1, 0.6, 1); hull.position.y = 0.6; g.add(hull);
  bx(2.6, 1.4, 1.8, '#e8e8e8', -0.6, 1.8, 0, g); bx(0.12, 6, 0.12, '#cfcfcf', 0.8, 4, 0, g); const x = R(-120, 120), z = R(-140, -620); g.position.set(x, 0, z); g.rotation.y = R(0, 6); sea.add(g); boats.push({ g, x, z, tilt: R(-0.35, 0.35) }); }
// stranded fish (no gore: they just flop) + people running with buckets
const fishes = [];
for (let i = 0; i < 90; i++) { const g = new THREE.Group(); const col = pick(['#9aa6b0', '#c8a040', '#7a8a9a', '#d86a3a', '#5a7a8a']);
  const b = mesh(new THREE.SphereGeometry(0.22, 8, 6), M(col, { flatShading: true, roughness: 0.4 })); b.scale.set(1.6, 0.7, 0.45); g.add(b); const tl = mesh(new THREE.ConeGeometry(0.16, 0.25, 4).rotateZ(Math.PI / 2), M(col, { flatShading: true })); tl.position.x = -0.42; g.add(tl);
  const x = R(-22, 22), z = R(-52, -125); g.scale.setScalar(R(1.8, 2.6)); g.position.set(x, seabed(x, z) + 0.1, z); g.rotation.y = R(0, 6); sea.add(g); fishes.push({ g, x, z, ph: R(0, 6), r: R(0, 6) }); }
const savers = [];
for (let i = 0; i < 14; i++) { const p = makePerson(rnd); sea.add(p.outer); const bucket = mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 10), M(pick(['#e8b030', '#d8423a', '#3a7ad0']))); bucket.position.set(0, -0.36, 0.05); p.elbows[0].add(bucket);
  savers.push({ p, x0: R(-14, 14), z0: R(-5, 15), z1: R(-60, -110), delay: R(0, 2.0), sp: R(7, 9) }); }
// cargo ships lying on the shelf
const CONT = ['#c8302a', '#2a6ab0', '#e8a030', '#3a8a5a', '#e8e8e8', '#7a3a8a', '#d86a2a'];
function cargoShip(x, z, ry, roll) { const g = new THREE.Group(); const shp = new THREE.Shape(); shp.moveTo(-120, 0); shp.lineTo(110, 0); shp.lineTo(140, 14); shp.lineTo(140, 22); shp.lineTo(-125, 22); shp.lineTo(-125, 8); shp.lineTo(-120, 0);
  const hg = new THREE.ExtrudeGeometry(shp, { depth: 40, bevelEnabled: false }); hg.translate(0, 0, -20); const hull = mesh(hg, M('#2a3a4a', { flatShading: true })); g.add(hull); bx(250, 3, 40, '#8a2a24', 5, 1.5, 0, g);
  const deck = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.7 }), 400); let k = 0; const d = new THREE.Object3D(); const cc = new THREE.Color();
  for (let bay = 0; bay < 18; bay++) for (let row = 0; row < 6; row++) for (let tier = 0; tier < 4; tier++) { if (k >= 400) break; if (rnd() < 0.15) continue; d.position.set(-95 + bay * 12.5, 22 + 1.3 + tier * 2.6, -16 + row * 6.4); d.scale.set(12, 2.5, 6.0); d.updateMatrix(); deck.setMatrixAt(k, d.matrix); deck.setColorAt(k, cc.set(pick(CONT))); k++; }
  deck.count = k; deck.castShadow = true; g.add(deck);
  const br = grp(-112, 22, 0, 0, g); bx(14, 22, 36, '#f0f0f0', 0, 11, 0, br); bx(16, 4, 40, '#e8e8e8', 0, 23, 0, br); bx(14.2, 2, 34, M('#22303a', { roughness: 0.2, metalness: 0.6 }), 0, 19, 0, br);
  g.position.set(x, seabed(x, z) - 3, z); g.rotation.set(roll, ry, 0, 'YXZ'); sea.add(g); return g; }
cargoShip(-150, -2050, 0.4, 0.12); cargoShip(170, -2350, -0.9, -0.1); cargoShip(-20, -2700, 1.8, 0.16);
// seafloor internet cables (with repeaters) + a hiker walking along one
const cables = [];
for (const [x0, c] of [[-20, '#1a1a1e'], [180, '#2a2a20'], [-260, '#1e1a1a']]) { const pts = []; for (let z = 50; z > -12000; z -= 120) { const x = x0 + 30 * Math.sin(z * 0.0011 + x0); pts.push(V3(x, seabed(x, z) + 1.3, z)); }
  const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.45, 6, false), M(c, { roughness: 0.6 })); sea.add(tube); cables.push(pts);
  for (let i = 4; i < pts.length; i += 9) { const r = mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.2, 10).rotateX(Math.PI / 2), M('#5a5a5e', { metalness: 0.5 })); r.position.copy(pts[i]); r.position.y += 0.3; sea.add(r); } }
const hiker = makePerson(rnd, { top: '#e86a2a', bottom: '#2a3a5c' }); sea.add(hiker.outer);
const pack = mesh(new THREE.BoxGeometry(0.4, 0.5, 0.22), M('#3a5a3a')); pack.position.set(0, 1.3, -0.2); hiker.root.add(pack);
// salt storm: a wall of white-tan dust rolling toward the coast
const seaSmoke = makeSmoke(sea, 5000);
function cablePoint(i, u) { const pts = cables[i]; const f = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)); return pts[k].clone().lerp(pts[k + 1], f - k); }
function seaLevel(t) { if (t < RECEDE) return 0; return -smooth(RECEDE, FISH, t) * 40 - smooth(FISH, SHIPS + 2, t) * 410 - smooth(SHIPS + 1, CABLES + 2, t) * 400; }
function updateSea(t) {
  const L = seaLevel(t); seaWater.position.y = L; seaWater.visible = L > -820;
  { const p = seaWater.geometry.attributes.position, b = seaWater.userData.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; p.array[i * 3 + 1] = 0.6 * Math.sin(x * 0.02 + t * 1.2) + 0.5 * Math.sin(z * 0.03 - t * 1.5); } p.needsUpdate = true; seaWater.geometry.computeVertexNormals(); }
  // the plug rises out on its chain, the whirlpool spins and sinks with the water
  plug.position.set(PLUG.x, L - 90 + 260 * smooth(0.6, 3.2, t), PLUG.z); whirl.position.set(PLUG.x, L + 0.8, PLUG.z); whirl.rotation.y = -t * 1.6; whirl.visible = t > 1.4 && L > -820; plug.visible = t < SHIPS + 2; whirl.material.opacity = smooth(1.4, 2.6, t) * (1 - smooth(CABLES, CABLES + 2, t));
  for (const B of boats) { const gh = seabed(B.x, B.z); const fl = L > gh + 0.5; B.g.position.y = fl ? L + 0.15 * Math.sin(t * 2 + B.x) : gh + 0.05; B.g.rotation.z = fl ? 0.04 * Math.sin(t * 1.7 + B.z) : B.tilt; }
  for (const F of fishes) { const gh = seabed(F.x, F.z); const out = L < gh - 0.05; F.g.visible = out && t < SHIPS + 0.5; const f = Math.max(0, Math.sin(t * (6 + F.r) + F.ph)); F.g.position.y = gh + 0.12 + 0.18 * f * f; F.g.rotation.x = Math.sin(t * 9 + F.ph) * 0.9; }
  for (const S of savers) { const u = clamp((t - (FISH - 1.5) - S.delay) / ((S.z0 - S.z1) / S.sp), 0, 1); const z = lerp(S.z0, S.z1, u), x = S.x0 + 4 * Math.sin(u * 3 + S.x0); const o = S.p.outer; o.visible = t > FISH - 1.6 && t < SHIPS + 0.5;
    o.position.set(x, seabed(x, z) + 0.95, z); o.rotation.y = Math.PI; if (u < 1) poseWalk(S.p, t * 12 + S.delay * 3, 1.3); else { poseIdle(S.p, t, S.delay); S.p.arms[0].rotation.x = -0.9; S.p.elbows[0].rotation.x = -0.3; S.p.root.rotation.x = 0.5; } if (u < 1) S.p.root.rotation.x = 0.15; }
  // hiker on the middle cable
  { const u = 0.36 + (t - CABLES) * 0.00055; const p = cablePoint(0, u), q = cablePoint(0, u + 0.002); hiker.outer.position.copy(p).add(V3(0, 0.95 + 0.45, 0)); hiker.outer.rotation.y = Math.atan2(q.x - p.x, q.z - p.z); poseWalk(hiker, t * 6); hiker.outer.visible = t > CABLES - 0.5 && t < SALT + 0.5; }
  // salt storm
  seaSmoke.begin(); if (t > SALT - 1) { smokeMat.uniforms.uTint.value.set('#cbb690'); const front = lerp(-7300, -5600, smooth(SALT, GLOBE, t));
    for (let k = 0; k < 1400; k++) { const x = -2400 + hash(k * 1.7) * 4800, z = front + hash(k * 3.1) * 700 + (t - SALT) * 25 * hash(k), y = seabed(x, z) + Math.pow(hash(k * 7.7), 1.5) * 420 + 10; _sp.set(x, y, z); seaSmoke.add(_sp, 180 + hash(k * 9.1) * 280, 0.5 * smooth(SALT - 1, SALT + 1.5, t)); } }
  seaSmoke.end();
  const late = smooth(SALT, GLOBE, t); seaDome.material.uniforms.uTop.value.set('#4a86d0').lerp(_sc.set('#8a8fa0'), late * 0.6); seaDome.material.uniforms.uBot.value.set('#d6e6f2').lerp(_sc.set('#e8dcc8'), late); sea.fog.color.set('#cfe0ee').lerp(_sc.set('#e6dcca'), late);
  sea.fog.near = lerp(800, 400, late); sea.fog.far = lerp(16000, 9000, late);
}
const _sp = new THREE.Vector3(), _sc = new THREE.Color();
function seaCamera(t) { let pos, look; seaCam.fov = 60;
  if (t < FISH) { const u = t / FISH; pos = V3(0, 9 - 2 * u, 45 - 10 * u); look = V3(0, lerp(40, -5, smooth(RECEDE, FISH, t)), -3000); }
  else if (t < SHIPS) { const u = ease((t - FISH) / (SHIPS - FISH)); pos = V3(lerp(0, -5, u), lerp(7, seabed(-5, -40) + 2.0, u), lerp(35, -40, u)); look = V3(0, seabed(0, -95) + 0.3, lerp(-400, -95, u)); }
  else if (t < CABLES) { const u = (t - SHIPS) / (CABLES - SHIPS); const z = lerp(-1450, -1900, u); pos = V3(lerp(-60, 80, u), seabed(0, z) + lerp(30, 42, u), z); look = V3(0, seabed(0, -2300) + 8, -2350); }
  else if (t < SALT) { const p = cablePoint(0, 0.36 + (t - CABLES) * 0.00055); pos = p.clone().add(V3(3.5, 3.2, 9)); look = p.clone().add(V3(-0.5, 1.2, -10)); }
  else { const u = ease((t - SALT) / (GLOBE - SALT)); const z = lerp(-8800, -9400, u); pos = V3(lerp(-200, 0, u), seabed(0, z) + lerp(25, 400, smooth(GLOBE - 1.5, GLOBE + 0.6, t)), z); look = V3(0, seabed(0, -6000) + 80 + 600 * smooth(GLOBE - 1.5, GLOBE + 0.6, t), -5500); }
  seaSun.position.copy(pos).add(V3(-200, 300, 150)); seaSun.target.position.copy(pos).add(V3(0, 0, -60)); seaSun.target.updateMatrixWorld();
  seaCam.position.copy(pos); seaCam.lookAt(look); }
