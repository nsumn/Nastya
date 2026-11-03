// ===================== 02 Burg — timeline driven by the voice alignment =====================
// Built as: cat lib.js burg_main.js > burg.js

await document.fonts.load('700 96px Fredoka');

// ---------- words / timing ----------
const WORDS = await (await fetch('../02_burg/words.json')).json();
const clean = w => w.replace(/[.,!?]/g, '');
function T(word, n = 1) {
  let k = 0;
  for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s;
  throw new Error('word not found: ' + word + ' #' + n);
}
const END = WORDS[WORDS.length - 1][2] + 0.7;
const cl = x => Math.max(0, Math.min(1, x));
const ramp = (t, a, b) => cl((t - a) / (b - a));
const sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b));
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
const smooth = (a, b, x) => sm(cl((x - a) / (b - a)));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const show = (o, k) => { o.visible = k > .002; o.scale.setScalar(Math.max(k, .001)); };

// ---------- growable boxes ----------
function gbox(x0, x1, y0, y1, z0, z1, mat, s = 6, opt = {}) {
  const m = wbox(x0, x1, y0, y1, z0, z1, mat, s, opt);
  m.geometry.translate(-(x0 + x1) / 2, -y0, -(z0 + z1) / 2);
  m.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2);
  m.userData = { y0, y1 };
  return m;
}
function growTo(m, h) {
  const { y0, y1 } = m.userData; const k = cl((h - y0) / (y1 - y0));
  m.visible = k > 0.001; m.scale.y = Math.max(k, 0.001);
}

// ---------- materials ----------
const stoneC = (() => { const S = 512, [c, g] = cv(S, S); g.fillStyle = '#7f786c'; g.fillRect(0, 0, S, S);
  let y = 0; while (y < S) { const h = 34 + Math.floor(rnd() * 3) * 6; let x = -rr(0, 60);
    while (x < S) { const w = rr(55, 110); g.fillStyle = `hsl(${rr(30, 42)},${rr(6, 14)}%,${rr(58, 72)}%)`;
      g.beginPath(); g.roundRect(x + 3, y + 3, w - 6, h - 6, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 6, y + 5, w - 14, 4); x += w; }
    y += h; }
  noise(g, S, S, 16); return c; })();
const stoneMat = new THREE.MeshStandardMaterial({ map: tex(stoneC), bumpMap: tex(stoneC, 1, 1, false), bumpScale: 2, roughness: .95 });
const towerMat = new THREE.MeshStandardMaterial({ map: tex(stoneC, 4, 2.2), bumpMap: tex(stoneC, 4, 2.2, false), bumpScale: 2, roughness: .95 });
const woodTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#9a6b3e'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = `hsl(28,${40 + rnd() * 10}%,${30 + rnd() * 10}%)`; g.fillRect(0, y + 1, 256, 30); g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, y, 256, 2); }
  noise(g, 256, 256, 18); return tex(c); })();
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .9 });
const plankMat = new THREE.MeshStandardMaterial({ color: '#7a5130', roughness: .9 });
const stakeMat = new THREE.MeshStandardMaterial({ color: '#a0703f', roughness: .9 });
const thatchMat = new THREE.MeshStandardMaterial({ color: '#c49a4a', roughness: 1, flatShading: true });
const waterMat = new THREE.MeshPhysicalMaterial({ color: '#3f97c4', transparent: true, opacity: .8, roughness: .08, metalness: .1, depthWrite: false, side: THREE.DoubleSide });
const sackMat = new THREE.MeshStandardMaterial({ color: '#d7c193', roughness: 1 });
const darkMat = new THREE.MeshStandardMaterial({ color: '#1b1410', roughness: 1 });
const steelMat = new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: .8, roughness: .3 });
const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb12a', transparent: true, opacity: .95 });
const flame2Mat = new THREE.MeshBasicMaterial({ color: '#ff5a1a', transparent: true, opacity: .9 });
const smokeMat = new THREE.MeshStandardMaterial({ color: '#4b4846', transparent: true, opacity: .5, roughness: 1, depthWrite: false });
const roofRed = new THREE.MeshStandardMaterial({ color: '#b2432c', roughness: .8, flatShading: true });

// ---------- terrain ----------
const MOAT = { a: 8.6, b: 9.3, c: 11.0, d: 11.7, depth: 2.4 };
let digK = 0;
function hBase(x, z) {
  const d = Math.pow(x ** 4 + z ** 4, .25), e = 1 - smooth(26, 31, Math.max(Math.abs(x), Math.abs(z)));
  let h = 4 * (1 - smooth(14.3, 19.5, d));
  h += (.35 * Math.sin(x * .21 + 1) * Math.cos(z * .17) + .15 * Math.sin(x * .7) * Math.sin(z * .6)) * smooth(15, 22, d) * e;
  return h;
}
const moatP = (x, z) => { const m = Math.max(Math.abs(x), Math.abs(z)); return smooth(MOAT.a, MOAT.b, m) * (1 - smooth(MOAT.c, MOAT.d, m)); };
const hAt = (x, z) => hBase(x, z) - MOAT.depth * moatP(x, z) * digK;

const TS = 64, TN = 256;
const terrGeo = new THREE.PlaneGeometry(TS, TS, TN, TN); terrGeo.rotateX(-Math.PI / 2);
const tPos = terrGeo.attributes.position, tCol = new Float32Array(tPos.count * 3);
terrGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
const tBase = new Float32Array(tPos.count), tMoat = new Float32Array(tPos.count), tGrass = [];
const cGrass = new THREE.Color(), cSoil = new THREE.Color('#7b5131'), cPath = new THREE.Color('#a68a62'), cTmp = new THREE.Color();
for (let i = 0; i < tPos.count; i++) {
  const x = tPos.getX(i), z = tPos.getZ(i);
  tBase[i] = hBase(x, z); tMoat[i] = moatP(x, z);
  const n = .5 + .25 * Math.sin(x * 1.3 + z * .4) * Math.cos(z * 1.1 - x * .3) + rr(-.12, .12);
  cGrass.setHSL(.27 + n * .03, .45 + n * .1, .30 + n * .08);
  const path = (1 - smooth(.8, 1.3, Math.abs(x + Math.sin(z * .25) * .4 * smooth(12, 16, z)))) * smooth(11.4, 12, z) * (1 - smooth(27, 30, z));
  cGrass.lerp(cPath, path * .9);
  tGrass.push(cGrass.clone());
}
function updateTerrain() {
  for (let i = 0; i < tPos.count; i++) {
    tPos.setY(i, tBase[i] - MOAT.depth * tMoat[i] * digK);
    cTmp.copy(tGrass[i]).lerp(cSoil, cl(tMoat[i] * digK * 1.6));
    tCol[i * 3] = cTmp.r; tCol[i * 3 + 1] = cTmp.g; tCol[i * 3 + 2] = cTmp.b;
  }
  tPos.needsUpdate = true; terrGeo.attributes.color.needsUpdate = true; terrGeo.computeVertexNormals();
}
updateTerrain();
const groundTex = tex(plainCanvas('#e6e6e6', 34, 256, { n: 2200, cols: ['#c9c9c9', '#f7f7f7', '#b3b3b3'], r: [1, 3] }), 26, 26);
const terrMat = new THREE.MeshStandardMaterial({ map: groundTex, vertexColors: true, roughness: 1 });
const terrain = new THREE.Mesh(terrGeo, terrMat); terrain.receiveShadow = true; terrain.castShadow = true; scene.add(terrain);
const plainGeo = new THREE.PlaneGeometry(500, 500); plainGeo.rotateX(-Math.PI / 2);
const plainTex = tex(plainCanvas('#e6e6e6', 34, 256, { n: 2200, cols: ['#c9c9c9', '#f7f7f7', '#b3b3b3'], r: [1, 3] }), 200, 200);
const plain = new THREE.Mesh(plainGeo, new THREE.MeshStandardMaterial({ map: plainTex, color: tGrass[0].clone().lerp(new THREE.Color('#5d9338'), .5), roughness: 1 }));
plain.position.y = -.03; plain.receiveShadow = true; scene.add(plain);
// distant hills + forest
for (const [x, z, r, h] of [[-70, -110, 40, 14], [10, -130, 55, 20], [80, -105, 42, 13], [-120, -60, 40, 10], [120, -50, 40, 11]]) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M('#6f9a4a', { roughness: 1 }));
  m.scale.set(r, h, r * .7); m.position.set(x, -.1, z); scene.add(m);
}
for (let i = 0; i < 26; i++) {
  const a = rr(0, Math.PI * 2), r = rr(31, 48); const x = Math.cos(a) * r, z = Math.sin(a) * r - 6;
  if (z > 14 && Math.abs(x) < 26) continue;
  const tr = tree(x, z, rr(1.0, 1.5)); tr.position.y = 0;
}
for (const [x, z, s] of [[-22, 9, 1.1], [23, 6, 1.2], [-25, -12, 1.3], [24, -16, 1.2], [-17, 20, .95], [19, 22, 1.05]]) { const tr = tree(x, z, s); tr.position.y = hAt(x, z) - .1; }

// ---------- night sky ----------
const daySky = scene.background;
const nightSky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#060b1d'); gr.addColorStop(.6, '#142046'); gr.addColorStop(1, '#2a3561'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${rr(.3, 1)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 620), rr(.5, 1.8), 0, 7); g.fill(); }
  g.fillStyle = '#fdf6d8'; g.beginPath(); g.arc(400, 170, 34, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hemi = scene.children.find(o => o.isHemisphereLight);
const dayFog = scene.fog.color.clone(), nightFog = new THREE.Color('#1c2547');

// ---------- people ----------
function person(kind) {
  const g = new THREE.Group();
  const tunic = kind === 'raider' ? '#7d2c1e' : '#2f5fb3';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.2, .3, .62, 12), M(tunic, { roughness: .9 })); body.position.y = .5; body.castShadow = true; g.add(body);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .26, 10), M('#3a2c22')); legs.position.y = .13; g.add(legs);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12), M('#f0c39a')); head.position.y = .98; head.castShadow = true; g.add(head);
  if (kind === 'raider') {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(.19, 16, 10, 0, Math.PI * 2, 0, Math.PI * .58), M('#2b2320')); hood.position.y = 1.0; hood.rotation.x = -.25; g.add(hood);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(.3, .07, .05), M('#1a1a1a')); mask.position.set(0, 1.0, .16); g.add(mask);
  } else {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), steelMat); helm.position.y = 1.02; g.add(helm);
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.6, 6), M('#6b4a2b')); spear.position.set(.3, .8, 0); g.add(spear);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.06, .2, 6), steelMat); tip.position.set(.3, 1.68, 0); g.add(tip);
    g.userData.spear = [spear, tip];
  }
  const torch = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .55, 6), M('#5a3a20')); st.position.y = .27; torch.add(st);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), flameMat); fl.position.y = .6; fl.scale.y = 1.5; torch.add(fl);
  torch.position.set(.28, .55, .1); torch.rotation.z = -.3; torch.visible = false; g.add(torch);
  const sack = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), sackMat); sack.scale.set(1, .8, .8); sack.position.set(0, .75, -.28); sack.visible = false; g.add(sack);
  g.userData.torch = torch; g.userData.flame = fl; g.userData.sack = sack;
  g.scale.setScalar(1.25); scene.add(g); return g;
}
const S_P = 1.25;
function place(p, x, z, face, t, walking = false, k = 1) {   // put a person on the ground
  p.visible = k > .01; p.scale.setScalar(S_P * Math.max(k, .001));
  p.position.set(x, hAt(x, z) + (walking ? Math.abs(Math.sin(t * 13 + x * 3)) * .1 : 0), z);
  p.rotation.set(0, face, 0);
}
const faceTo = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);
const R = []; for (let i = 0; i < 12; i++) R.push(person('raider'));
const G = []; for (let i = 0; i < 8; i++) G.push(person('guard'));

// ---------- hut ----------
const hut = new THREE.Group(); scene.add(hut);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.7), woodMat); b.position.y = .65; b.castShadow = b.receiveShadow = true; hut.add(b);
  const sh = new THREE.Shape(); sh.moveTo(-1.35, 0); sh.lineTo(1.35, 0); sh.lineTo(0, 1.05); sh.closePath();
  const r = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2.0, bevelEnabled: false }), thatchMat); r.position.set(0, 1.3, -1.0); r.castShadow = true; hut.add(r);
  const d = new THREE.Mesh(new THREE.BoxGeometry(.55, .9, .05), darkMat); d.position.set(0, .45, .86); hut.add(d);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.1, 6), M('#5a3a20')); pole.position.set(0, 2.85, 0); hut.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(.6, .38), M('#d63a2a', { side: THREE.DoubleSide })); flag.position.set(.3, 3.2, 0); hut.add(flag);
  hut.userData.flag = [pole, flag]; }
hut.position.set(0, 4, -.6);
const loot = new THREE.Group(); scene.add(loot);
{ const ch = new THREE.Mesh(new THREE.BoxGeometry(.7, .45, .45), M('#8a5a2a')); ch.position.set(0, .22, 0); ch.castShadow = true; loot.add(ch);
  const gold = new THREE.Mesh(new THREE.BoxGeometry(.6, .06, .36), M('#f2c33a', { metalness: .6, roughness: .3, emissive: '#5a4000' })); gold.position.y = .47; loot.add(gold);
  for (const [x, z] of [[.75, .1], [.65, -.45], [-.7, .05]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), sackMat); s.scale.set(1, .8, .85); s.position.set(x, .22, z); s.castShadow = true; loot.add(s); } }
loot.position.set(1.9, 4, .7);

// ---------- palisade (instanced) ----------
const HS = 7;                    // half size of the castle square (outer face)
function perimeter(off, step, gap = 0) {   // points along a square of half size `off`, skipping the gate gap on the front
  const pts = []; const n = Math.round(2 * off / step);
  for (let i = 0; i < n; i++) { const u = -off + (i + .5) * 2 * off / n;
    pts.push([u, -off, 0]); pts.push([off, u, Math.PI / 2]); pts.push([-off, u, Math.PI / 2]);
    if (Math.abs(u) > gap) pts.push([u, off, 0]); }
  return pts;
}
const stakePts = perimeter(6.55, .5, 1.15).sort((a, b) => Math.atan2(a[0], a[1]) - Math.atan2(b[0], b[1]));
const stakeBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .22, 2.3, 7).translate(0, 1.15, 0), stakeMat, stakePts.length);
const stakeTip = new THREE.InstancedMesh(new THREE.ConeGeometry(.2, .5, 7).translate(0, 2.55, 0), stakeMat, stakePts.length);
stakeBody.castShadow = stakeTip.castShadow = true; scene.add(stakeBody, stakeTip);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
function setStakes(t, t0, t1, burn) {
  stakePts.forEach(([x, z], i) => {
    const k = back(ramp(t, t0 + (t1 - t0) * i / stakePts.length, t0 + (t1 - t0) * i / stakePts.length + .25)) * (1 - burn);
    _p.set(x, 3.75, z); _s.set(Math.max(k, .001), Math.max(k, .001), Math.max(k, .001));
    _e.set(burn * .5 * Math.sin(i * 1.7), 0, burn * .5 * Math.cos(i * 2.3)); _q.setFromEuler(_e);
    _m.compose(_p, _q, _s); stakeBody.setMatrixAt(i, _m); stakeTip.setMatrixAt(i, _m);
  });
  stakeBody.instanceMatrix.needsUpdate = stakeTip.instanceMatrix.needsUpdate = true;
}
// fire
const flames = [];
for (let i = 0; i < stakePts.length; i += 3) {
  const [x, z] = stakePts[i]; const f = new THREE.Group();
  const a = new THREE.Mesh(new THREE.ConeGeometry(.45, 1.5, 8), flame2Mat); a.position.y = .75; f.add(a);
  const b = new THREE.Mesh(new THREE.ConeGeometry(.28, 1.0, 8), flameMat); b.position.y = .55; f.add(b);
  const s = new THREE.Mesh(new THREE.SphereGeometry(.55, 10, 8), smokeMat); f.add(s); f.userData.smoke = s;
  f.position.set(x, 4, z); f.userData.i = i; f.visible = false; scene.add(f); flames.push(f);
}
const fireLight = new THREE.PointLight('#ff7a2a', 0, 40, 1.4); fireLight.position.set(0, 6, 9); scene.add(fireLight);

// ---------- stone walls ----------
const WB = 3.6, WTOP = 8.5, GATE = 1.1, GATEH = 2.6;
const walls = [
  gbox(-HS, -GATE, WB, WTOP, HS - 1, HS, stoneMat, 3), gbox(GATE, HS, WB, WTOP, HS - 1, HS, stoneMat, 3),
  gbox(-HS, HS, WB, WTOP, -HS, -HS + 1, stoneMat, 3),
  gbox(-HS, -HS + 1, WB, WTOP, -HS + 1, HS - 1, stoneMat, 3), gbox(HS - 1, HS, WB, WTOP, -HS + 1, HS - 1, stoneMat, 3)];
const lintel = gbox(-GATE, GATE, 4 + GATEH, WTOP, HS - 1, HS, stoneMat, 3);
const doors = [1, -1].map(sg => { const h = new THREE.Group(); h.position.set(-sg * GATE, 4, HS - .25);
  const d = new THREE.Mesh(new THREE.BoxGeometry(GATE, GATEH, .16), plankMat); d.position.set(sg * GATE / 2, GATEH / 2, 0); d.castShadow = true; h.add(d);
  for (const y of [.5, 2.0]) { const band = new THREE.Mesh(new THREE.BoxGeometry(GATE * .95, .1, .2), M('#2a2a2a', { metalness: .5 })); band.position.set(sg * GATE / 2, y, 0); h.add(band); }
  h.userData.sg = sg; scene.add(h); return h; });
// merlons
const merlonPts = perimeter(HS - .17, 1.0, GATE * 0);
const merlons = new THREE.InstancedMesh(new THREE.BoxGeometry(.55, .62, .34).translate(0, .31, 0), stoneMat, merlonPts.length); merlons.castShadow = true; scene.add(merlons);
// labels
function label(text, w = 3) {
  const [c, g] = cv(512, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, 256, 132); g.fillStyle = '#ffd21f'; g.fillText(text, 256, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w, w / 2, 1); s.renderOrder = 10; scene.add(s); return s;
}
const yel = new THREE.MeshBasicMaterial({ color: '#ffd21f', depthTest: false });
const dimThick = new THREE.Group(); scene.add(dimThick);
{ const bar = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, 1.0), yel); bar.renderOrder = 9; dimThick.add(bar);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.16, .3, 10), yel); c.rotation.x = s * Math.PI / 2; c.position.z = s * .5; c.renderOrder = 9; dimThick.add(c); } }
const lblThick = label('3 m', 2.2);
const dimHigh = new THREE.Group(); scene.add(dimHigh);
{ const bar = new THREE.Mesh(new THREE.BoxGeometry(.12, 1, .12), yel); bar.renderOrder = 9; dimHigh.add(bar); dimHigh.userData.bar = bar;
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.22, .4, 10), yel); if (s < 0) c.rotation.x = Math.PI; c.renderOrder = 9; c.userData.s = s; dimHigh.add(c); } }
const lblHigh = label('10 m', 2.8);
const lblYear = label('1 Jahr', 3.2);
const qMark = label('?', 1.6);

// ---------- ladders ----------
function ladderMesh(L) {
  const g = new THREE.Group();
  for (const x of [-.3, .3]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.08, L, .08), woodMat); r.position.set(x, L / 2, 0); r.castShadow = true; g.add(r); }
  for (let y = .3; y < L; y += .4) { const r = new THREE.Mesh(new THREE.BoxGeometry(.6, .06, .06), woodMat); r.position.y = y; g.add(r); }
  scene.add(g); return g;
}
const LAD = [[-4.2], [-1.9], [3.6]].map(([x]) => { const l = ladderMesh(2.6); l.userData.x = x; return l; });
const LAD_A = Math.atan2(1.05, 2.2);

// ---------- battering ram ----------
const ram = new THREE.Mesh(new THREE.CylinderGeometry(.24, .28, 3.6, 12), M('#6a4a2c', { roughness: 1 })); ram.rotation.x = Math.PI / 2; ram.castShadow = true; scene.add(ram);

// ---------- moat water + drawbridge ----------
const ringShape = new THREE.Shape(); ringShape.moveTo(-11.6, -11.6); ringShape.lineTo(11.6, -11.6); ringShape.lineTo(11.6, 11.6); ringShape.lineTo(-11.6, 11.6); ringShape.closePath();
const hole = new THREE.Path(); hole.moveTo(-8.8, -8.8); hole.lineTo(-8.8, 8.8); hole.lineTo(8.8, 8.8); hole.lineTo(8.8, -8.8); hole.closePath(); ringShape.holes.push(hole);
const moatWater = new THREE.Mesh(new THREE.ShapeGeometry(ringShape).rotateX(-Math.PI / 2), waterMat); moatWater.receiveShadow = true; scene.add(moatWater);
const BR_L = 4.95;
const bridge = new THREE.Group(); bridge.position.set(0, 4.02, HS); scene.add(bridge);
{ for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.1, .2, BR_L / 9 - .04), i % 2 ? plankMat : woodMat); p.position.set(0, .1, (i + .5) * BR_L / 9); p.castShadow = p.receiveShadow = true; bridge.add(p); }
  for (const x of [-.95, .95]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.12, .22, BR_L), M('#3b2a1b')); b.position.set(x, .2, BR_L / 2); bridge.add(b); } }
const chainMat = new THREE.LineBasicMaterial({ color: '#1e1e1e' });
const chains = [-.95, .95].map(x => { const g = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 1, 0)]); const l = new THREE.Line(g, chainMat); l.userData.x = x; scene.add(l); return l; });

// ---------- towers ----------
const TW_B = 3.4, TW_T = 10.2, TW_R = 1.55;
const towers = [[-HS, HS], [HS, HS], [-HS, -HS], [HS, -HS]].map(([x, z]) => {
  const g = new THREE.Group(); g.position.set(x, TW_B, z); scene.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(TW_R, TW_R * 1.08, TW_T - TW_B, 28).translate(0, (TW_T - TW_B) / 2, 0), towerMat); body.castShadow = body.receiveShadow = true; g.add(body);
  const top = new THREE.Group(); top.position.y = TW_T - TW_B; g.add(top);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(.5, .6, .3), stoneMat); m.position.set(Math.cos(a) * (TW_R - .15), .3, Math.sin(a) * (TW_R - .15)); m.rotation.y = -a + Math.PI / 2; m.castShadow = true; top.add(m); }
  for (let i = 0; i < 3; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(.12, .7, .05), darkMat); const a = Math.atan2(HS - Math.abs(z) + z, x) + (i - 1) * 1.2; sl.position.set(Math.cos(a) * TW_R * 1.01, 3 + i * .4, Math.sin(a) * TW_R * 1.01); sl.rotation.y = -a + Math.PI / 2; g.add(sl); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.8, 6), M('#4b3a2a')); pole.position.y = TW_T - TW_B + .9; g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .6, 8, 1), M('#d63a2a', { side: THREE.DoubleSide })); flag.position.set(.5, TW_T - TW_B + 1.5, 0); g.add(flag);
  g.userData = { body, top, flag: [pole, flag], x, z };
  return g; });
// arrows
const arrowMeshes = [];
for (let i = 0; i < 9; i++) { const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .9, 5), M('#5a3a20')); g.add(s);
  const h = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 6), steelMat); h.position.y = .5; g.add(h);
  const f = new THREE.Mesh(new THREE.BoxGeometry(.14, .16, .01), M('#e8e2d0')); f.position.y = -.4; g.add(f);
  g.visible = false; scene.add(g); arrowMeshes.push(g); }
const _up = V(0, 1, 0);
function flyArrow(m, a, b, k) {
  m.visible = k > 0 && k < 1; if (!m.visible) return;
  const p = new THREE.Vector3().lerpVectors(a, b, k); p.y += Math.sin(k * Math.PI) * .9;
  const p2 = new THREE.Vector3().lerpVectors(a, b, Math.min(1, k + .02)); p2.y += Math.sin(Math.min(1, k + .02) * Math.PI) * .9;
  m.position.copy(p); m.quaternion.setFromUnitVectors(_up, p2.sub(p).normalize());
}

// ---------- siege camp ----------
const tentTex = (() => { const [c, g] = cv(256, 64); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f1e6cf' : '#b8382a'; g.fillRect(i * 32, 0, 32, 64); } return tex(c); })();
const camp = [];
for (let i = 0; i < 9; i++) { const a = -1.25 + i / 8 * 2.5, r = 27 + (i % 2) * 3.5; const x = Math.sin(a) * r, z = Math.cos(a) * r - 1;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rr(0, 3); scene.add(g);
  const t = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.0, 6), new THREE.MeshStandardMaterial({ map: tentTex, roughness: .9, flatShading: true })); t.position.y = 1.0; t.castShadow = true; g.add(t);
  const fire = new THREE.Mesh(new THREE.ConeGeometry(.3, .7, 7), flameMat); fire.position.set(2.0, .35, .5); g.add(fire);
  camp.push(g); }

// ---------- well, storehouse, keep ----------
const well = new THREE.Group(); well.position.set(3.7, 4, -3.1); scene.add(well);
{ const ring = new THREE.Mesh(new THREE.CylinderGeometry(.85, .9, .9, 24, 1, true).translate(0, .45, 0), towerMat); ring.material = towerMat.clone(); ring.material.side = THREE.DoubleSide; ring.castShadow = true; well.add(ring);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(.8, 24).rotateX(-Math.PI / 2), M('#0b0b0b')); inner.position.y = .3; well.add(inner); well.userData.inner = inner;
  for (const x of [-.8, .8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.7, .12), woodMat); p.position.set(x, .85, 0); well.add(p); }
  const sh = new THREE.Shape(); sh.moveTo(-1.1, 0); sh.lineTo(1.1, 0); sh.lineTo(0, .7); sh.closePath();
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.6, 8).rotateZ(Math.PI / 2), woodMat); axle.position.y = 1.35; well.add(axle);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(.18, .14, .3, 12), M('#6b4a2b')); well.add(bucket); well.userData.bucket = bucket;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .02, 12), M('#53b6ff', { emissive: '#1f6fb0' })); water.position.y = .14; bucket.add(water); well.userData.bw = water;
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 1, 4), M('#c8b28a')); well.add(rope); well.userData.rope = rope; }
const store = new THREE.Group(); store.position.set(-4.0, 4, -4.7); scene.add(store);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 2.0), stoneMat); b.position.y = .9; b.castShadow = b.receiveShadow = true; store.add(b);
  const sh = new THREE.Shape(); sh.moveTo(-1.9, 0); sh.lineTo(1.9, 0); sh.lineTo(0, 1.2); sh.closePath();
  const r = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2.3, bevelEnabled: false }), roofRed); r.position.set(0, 1.8, -1.15); r.castShadow = true; store.add(r);
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.3, .05, .9), darkMat); hatch.position.set(.7, .03, 1.6); store.add(hatch); }
const sacks = [];
for (let i = 0; i < 16; i++) { const row = i < 7 ? 0 : i < 12 ? 1 : i < 15 ? 2 : 3; const nIn = [7, 5, 3, 1][row], j = i - [0, 7, 12, 15][row];
  const s = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 10), sackMat); s.scale.set(1, .75, .8); s.castShadow = true;
  s.position.set(-4.0 + (j - (nIn - 1) / 2) * .58, 4.22 + row * .4, -3.0 + (i % 2) * .15); scene.add(s); sacks.push(s); }
const KP = { x: 0, z: -.9, h: 1.75, b: 4.0, t: 13.2 };
const keep = gbox(KP.x - KP.h, KP.x + KP.h, KP.b - .2, KP.t, KP.z - KP.h, KP.z + KP.h, stoneMat, 3);
const keepTop = new THREE.Group(); keepTop.position.set(KP.x, KP.t, KP.z); scene.add(keepTop);
for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.55, .6, .32), stoneMat); const u = -1.15 + j * 1.15;
  const pos = [[u, KP.h - .16], [u, -KP.h + .16], [KP.h - .16, u], [-KP.h + .16, u]][i]; m.position.set(pos[0], .3, pos[1]); if (i > 1) m.rotation.y = Math.PI / 2; m.castShadow = true; keepTop.add(m); }
{ const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.2, 6), M('#4b3a2a')); pole.position.y = 1.1; keepTop.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .85, 8, 1), M('#f2c33a', { side: THREE.DoubleSide })); flag.position.set(.7, 1.75, 0); keepTop.add(flag); keepTop.userData.flag = [pole, flag]; }
const keepWins = []; for (const y of [8.6, 10.6, 12.2]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.3, .6, .05), darkMat); w.position.set(KP.x, y, KP.z + KP.h + .02); scene.add(w); keepWins.push(w); }
const keepDoor = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.5, .1), plankMat); keepDoor.position.set(KP.x, 4 + 3.3 + .75, KP.z + KP.h + .03); scene.add(keepDoor);
const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.75, .06), darkMat); doorFrame.position.set(KP.x, 4 + 3.3 + .8, KP.z + KP.h + .01); scene.add(doorFrame);
const keepLadder = ladderMesh(3.5);
const KL_A = Math.atan2(1.1, 3.3);
const lblFloor = label('2. Stock', 3.4);

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .1, 600);
const tw = {
  hugel: T('Hügel'), hut: T('Holzhütte'), burg: T('Burg'), aber1: T('Aber'), nacht: T('Nacht'), rauber: T('Räuber'), nehmen: T('nehmen'),
  also1: T('Also'), zaun: T('Zaun'), spitz: T('spitzen'), aber2: T('Aber', 2), zund: T('zünden'),
  also2: T('Also', 2), mauer: T('Mauer'), stein: T('Stein'), drei: T('drei'), dick: T('dick'),
  aber3: T('Aber', 3), leitern: T('Leitern'), klettern: T('klettern'), druber: T('drüber'),
  also3: T('Also', 3), zehn: T('zehn'), hoch: T('hoch'), zinnen: T('Zinnen'), wachen: T('Wachen'), verst: T('verstecken'),
  aber4: T('Aber', 4), tor: T('Tor'), rammen: T('rammen'), stamm: T('Baumstamm'), durch: T('durch'),
  also4: T('Also', 4), grab: T('gräbst'), graben: T('Graben'), wasser: T('Wasser'), zug: T('Zugbrücke'), hochz: T('hochziehen'),
  aber5: T('Aber', 5), ecken: T('Ecken'), sieht: T('sieht'), unten: T('unten'),
  also5: T('Also', 5), runde: T('runde'), turme: T('Türme'), raus: T('rausstehen'), bogen: T('Bogenschützen'), schiess: T('schießen'), entlang: T('entlang'),
  aber6: T('Aber', 6), belag: T('belagern'), verh: T('verhungerst'),
  also6: T('Also', 6), brunnen: T('Brunnen'), grund: T('Grundwasser'), keller: T('Keller'), getreide: T('Getreide'), jahr: T('Jahr'),
  und: T('Und'), rein: T('reinkommen'), mitte: T('Mitte'), turm: T('Turm'), berg: T('Bergfried'), tur: T('Tür', 2), zweit: T('zweiten'), leiter: T('Leiter', 2), hochst: T('hochziehst'),
  gluck: T('Glückwunsch'), ritter: T('Ritterburg') };
const KEYS = [
  [0, V(0, 5.0, 40), V(0, 4.6, 0)],
  [tw.hut - .1, V(0, 5.6, 36), V(0, 4.8, 0)],
  [tw.hut + .7, V(1.2, 6.6, 9.5), V(.3, 4.9, -.4)],
  [tw.aber1, V(1.0, 6.8, 10.5), V(.3, 4.9, -.4)],
  [tw.aber1 + .9, V(0, 11, 30), V(0, 3.5, 4)],
  [tw.also1 - .2, V(0, 10.5, 27), V(0, 3.8, 2)],
  [tw.also1 + .7, V(3, 14, 27), V(0, 4, 0)],
  [tw.aber2 - .1, V(3, 13.5, 25), V(0, 4, 0)],
  [tw.aber2 + .7, V(0, 7.5, 18.5), V(0, 4.8, 5)],
  [tw.also2 - .1, V(0, 8.0, 19.5), V(0, 4.8, 4)],
  [tw.also2 + .8, V(9, 13.5, 24), V(0, 4.5, 0)],
  [tw.drei - .3, V(9, 13, 23), V(0, 4.5, 0)],
  [tw.drei + .4, V(7.6, 8.4, 12.2), V(4.6, 5.6, 6.5)],
  [tw.aber3 - .1, V(7.4, 8.2, 12.0), V(4.6, 5.6, 6.5)],
  [tw.aber3 + .7, V(-1, 7.4, 20), V(0, 5, 6)],
  [tw.also3 - .1, V(-1, 7.6, 20.5), V(0, 5, 6)],
  [tw.also3 + 1.0, V(7, 13.5, 27), V(0, 6.5, 2)],
  [tw.wachen - .2, V(5, 11.5, 22), V(0, 7, 4)],
  [tw.wachen + .7, V(3.5, 10.2, 15.5), V(.5, 8.4, 6)],
  [tw.aber4 - .1, V(3.5, 10.0, 15.0), V(.5, 8.4, 6)],
  [tw.aber4 + .7, V(-7, 8.2, 22), V(0, 5.2, 7)],
  [tw.also4 - .1, V(-6.5, 7.8, 21), V(0, 5.2, 7)],
  [tw.also4 + .9, V(9, 19, 33), V(0, 3.2, 3)],
  [tw.zug - .4, V(8, 18, 31), V(0, 3.2, 4)],
  [tw.zug + .5, V(-6.5, 8.8, 21), V(0, 5.5, 8.5)],
  [tw.aber5 - .1, V(-6.5, 8.6, 20.5), V(0, 5.5, 8.5)],
  [tw.aber5 + .8, V(17, 8.5, 12), V(7.6, 5.2, 3)],
  [tw.also5 - .1, V(17, 8.7, 12.5), V(7.6, 5.2, 3)],
  [tw.also5 + .9, V(15, 14, 25), V(2, 7.2, 1)],
  [tw.bogen - .2, V(15, 13.5, 24), V(2, 7.2, 1)],
  [tw.bogen + .6, V(14.5, 11, 13), V(6.5, 5.6, 0)],
  [tw.aber6 - .1, V(14.5, 11, 12.5), V(6.5, 5.6, 0)],
  [tw.aber6 + 1.0, V(0, 30, 52), V(0, 2, 4)],
  [tw.also6 - .1, V(0, 29, 50), V(0, 2, 4)],
  [tw.also6 + .9, V(6.4, 10.2, 4.0), V(3.7, 4.7, -3.1)],
  [tw.keller - .3, V(6.2, 10.0, 3.8), V(3.5, 4.7, -3.1)],
  [tw.keller + .6, V(-1.6, 12.5, 2.6), V(-4.0, 4.7, -3.8)],
  [tw.und - .1, V(-1.6, 12.3, 2.4), V(-4.0, 4.7, -3.8)],
  [tw.und + .9, V(5, 14, 27), V(0, 7.5, 0)],
  [tw.tur - .3, V(4.5, 13, 25), V(0, 8, 0)],
  [tw.tur + .6, V(-3.5, 15.2, 8.2), V(0, 7.6, .8)],
  [tw.gluck - .1, V(-3.3, 15.0, 7.8), V(0, 7.6, .8)],
  [tw.gluck + 1.4, V(10, 16, 34), V(0, 6.5, 0)],
  [END, V(11, 16.5, 35), V(0, 6.5, 0)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- raider choreography ----------
function hideAll(list) { for (const p of list) { p.visible = false; p.userData.torch.visible = false; p.userData.sack.visible = false; p.rotation.set(0, 0, 0); } }
function raiders(t) {
  hideAll(R);
  // A: night raid on the hut
  if (t > tw.aber1 && t < tw.also1 + .3) {
    const out = ramp(t, tw.also1, tw.also1 + .3);
    for (let i = 0; i < 4; i++) {
      const sx = (i - 1.5) * 2.2, sz = 24, tx = .6 + (i - 1.5) * 1.0, tz = 2.0 + (i % 2) * .5;
      const kIn = ease(t, tw.aber1 + .2 + i * .1, tw.rauber + .7), kOut = ease(t, tw.nehmen + .1, tw.also1);
      const k = kIn - kOut;
      const x = lerp(sx, tx, k), z = lerp(sz, tz, k);
      const face = kOut > .01 ? Math.PI * 0 : Math.PI;
      place(R[i], x, z, face, t, kIn < 1 || kOut > 0, 1 - out);
      R[i].userData.torch.visible = true; R[i].userData.sack.visible = t > tw.nehmen + .1;
    }
  }
  // B: torching the palisade
  if (t > tw.aber2 - .1 && t < tw.also2 + .4) {
    const out = ramp(t, tw.also2, tw.also2 + .4);
    for (let i = 0; i < 4; i++) {
      const x = -4.5 + i * 3.0, k = ease(t, tw.aber2, tw.zund);
      place(R[i], x, lerp(15, 8.0, k), Math.PI, t, k < 1, (1 - out) * pop(t, tw.aber2 - .1));
      R[i].userData.torch.visible = true;
    }
  }
  // C: ladders
  const lUp = ease(t, tw.leitern - .3, tw.leitern + .3), lFall = ease(t, tw.zehn - .1, tw.hoch + .3);
  LAD.forEach((l, i) => {
    const on = t > tw.aber3 && t < tw.wachen; l.visible = on && lUp > .01;
    const r = lerp(-LAD_A, 1.45, lFall); l.rotation.set(r, 0, 0);
    l.position.set(l.userData.x, hAt(l.userData.x, HS + 1.05), HS + 1.05 + (1 - lUp) * 3);
    if (!on) return;
    const p = R[i]; const f = ease(t, tw.klettern - .1 + i * .15, tw.druber + .4 + i * .1) * .82;
    const dir = V(0, Math.cos(r), Math.sin(r)); const pos = l.position.clone().addScaledVector(dir, 2.6 * f);
    const k = 1 - ramp(t, tw.hoch + .6, tw.hoch + 1.0);
    p.visible = k > .01; p.scale.setScalar(S_P * Math.max(k, .001));
    p.position.set(pos.x, Math.max(pos.y - .3, hAt(pos.x, pos.z)), pos.z - .25); p.rotation.set(lerp(-.2, 1.4, lFall), Math.PI, 0);
  });
  if (t > tw.aber3 && t < tw.hoch + 1.0) { const k = 1 - ramp(t, tw.hoch + .6, tw.hoch + 1.0); place(R[3], .8, 9.5, Math.PI, t, false, k * pop(t, tw.aber3)); R[3].userData.torch.visible = true; }
  // D: battering ram
  const ramK = ease(t, tw.tor - .3, tw.durch + .1), ramOut = ramp(t, tw.grab, tw.grab + .5);
  ram.visible = t > tw.aber4 && t < tw.grab + .5;
  if (ram.visible) {
    const z = lerp(22, 7.4, Math.pow(ramK, 1.3)) - ease(t, tw.durch + .1, tw.durch + .4) * 1.6;
    ram.position.set(0, hAt(0, z + 1.2) + .75, z + .2); ram.scale.setScalar(Math.max(1 - ramOut, .001));
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 ? .55 : -.55, dz = i < 2 ? .1 : 1.3;
      place(R[i], sx, z + dz + .8, Math.PI, t, ramK < 1, 1 - ramOut); R[i].rotation.y = Math.PI + (i % 2 ? -.3 : .3);
    }
  }
  // E: blind spot at the corner, then arrows
  if (t > tw.aber5 && t < tw.belag) {
    const spots = [[7.85, 2.4], [7.85, .6], [-3.8, 7.85]];
    spots.forEach(([x, z], i) => {
      const hit = tw.schiess + .25 + i * .35, fall = ease(t, hit, hit + .3), out = ramp(t, hit + .8, hit + 1.1);
      place(R[i], x, z, i < 2 ? -Math.PI / 2 : Math.PI, t, false, pop(t, tw.aber5 + i * .1) * (1 - out));
      R[i].rotation.x = -fall * 1.45;
    });
  }
  // F: siege ring
  if (t > tw.aber6 && t < tw.gluck + .5) {
    const out = ramp(t, tw.gluck, tw.gluck + .4);
    for (let i = 0; i < 10; i++) {
      const a = -1.05 + i / 9 * 2.1, r = 22.5 + (i % 3) * .8; const x = Math.sin(a) * r, z = Math.cos(a) * r - 1;
      place(R[2 + i], x, z, faceTo(x, z, 0, 0), t, false, pop(t, tw.belag - .2 + i * .06) * (1 - out));
      R[2 + i].userData.torch.visible = i % 2 === 0;
    }
  }
  // G: raiders inside, stuck at the keep
  if (t > tw.rein - .1 && t < tw.gluck + .5) {
    const out = ramp(t, tw.gluck, tw.gluck + .4);
    for (let i = 0; i < 2; i++) {
      const k = ease(t, tw.rein + .2, tw.turm + .6); const x = lerp(-1.2 + i * 2.4, -.6 + i * 1.6, k), z = lerp(5.4, 2.5, k);
      place(R[i], x, z, Math.PI, t, k > 0 && k < 1, pop(t, tw.rein - .1) * (1 - out));
    }
  }
}

// ---------- the timeline ----------
let lastDig = -1;
function update(t) {
  // time of day: night raid, then day/night cycles of the siege
  const night = Math.max(win(t, tw.nacht - .5, tw.also1 + .2, .45),
    t > tw.belag && t < tw.also6 + .2 ? (.5 - .5 * Math.cos((t - tw.belag) / .95 * Math.PI * 2)) * win(t, tw.belag, tw.also6 + .2, .2) : 0);
  scene.background = night > .5 ? nightSky : daySky;
  hemi.intensity = lerp(1.15, .3, night); sun.intensity = lerp(2.7, .35, night); fill.intensity = lerp(.55, .12, night);
  renderer.toneMappingExposure = lerp(1.05, .8, night);
  scene.fog.color.copy(dayFog).lerp(nightFog, night);
  sun.color.set(night > .5 ? '#9fb4ff' : '#fff3e0');

  // dig the moat
  digK = ease(t, tw.grab, tw.graben + .5);
  if (digK !== lastDig) { updateTerrain(); lastDig = digK; }

  // hut, loot
  const hutK = pop(t, tw.hut - .05) * (1 - ease(t, tw.turm - .2, tw.turm + .5));
  show(hut, hutK); hut.userData.flag.forEach(o => o.visible = t > tw.burg && hutK > .5);
  hut.userData.flag[1].scale.setScalar(t > tw.burg ? back(ramp(t, tw.burg, tw.burg + .35)) : .001);
  hut.userData.flag[1].rotation.y = Math.sin(t * 4) * .25;
  show(loot, pop(t, tw.hut + .2) * (1 - ramp(t, tw.nehmen + .05, tw.nehmen + .2)));

  // palisade + fire
  const burn = ease(t, tw.zund + .8, tw.also2 + .3);
  const stakeOn = t > tw.zaun - .3 && t < tw.also2 + .6;
  stakeBody.visible = stakeTip.visible = stakeOn;
  if (stakeOn) setStakes(t, tw.zaun - .2, tw.spitz + .4, burn);
  const fireK = win(t, tw.zund + .1, tw.also2 + .5, .35);
  stakeMat.color.set('#a0703f').lerp(new THREE.Color('#1c1612'), ease(t, tw.zund + .3, tw.zund + 1.4));
  flames.forEach((f, j) => {
    const k = fireK * ramp(t, tw.zund + .1 + j * .02, tw.zund + .4 + j * .02); f.visible = k > .02;
    const fl = 1 + .25 * Math.sin(t * 23 + j * 2.1) + .15 * Math.sin(t * 37 + j);
    f.scale.set(k, k * fl, k); f.position.y = 4 + (1 - burn) * 1.0;
    f.userData.smoke.position.set(.2 * Math.sin(t * 2 + j), 2.0 + ((t * 1.3 + j * .37) % 1.5), 0); f.userData.smoke.scale.setScalar(.8 + ((t * 1.3 + j * .37) % 1.5) * .6);
  });
  fireLight.intensity = fireK * (60 + 15 * Math.sin(t * 19));

  // stone walls: low first, then 10 m
  const wallH = 1.8 * ease(t, tw.mauer - .1, tw.stein + .3) + 2.7 * ease(t, tw.zehn - .2, tw.hoch + .3);
  const WT = 4 + wallH;
  walls.forEach(w => growTo(w, wallH > .01 ? WT : 0)); growTo(lintel, WT);
  doors.forEach(d => {
    d.visible = wallH > .05; d.scale.set(1, Math.max(Math.min(wallH, GATEH) / GATEH, .001), 1);
    const open = back(ramp(t, tw.durch, tw.durch + .3)) * (1 - ease(t, tw.zug - .4, tw.zug + .2));
    d.rotation.y = d.userData.sg * 1.35 * open;
  });
  const merK = t > tw.zinnen - .1;
  merlons.visible = merK;
  if (merK) { merlonPts.forEach(([x, z, ry], i) => { const k = back(ramp(t, tw.zinnen - .1 + i * .012, tw.zinnen + .2 + i * .012)); const gate = Math.abs(x) < GATE + .3 && z > 0;
    _p.set(x, WT, z); _s.setScalar(Math.max(gate ? 1 : k, .001)); _q.setFromEuler(_e.set(0, ry, 0)); _m.compose(_p, _q, _s); merlons.setMatrixAt(i, _m); });
    merlons.instanceMatrix.needsUpdate = true; }
  // dimension labels
  const kThick = win(t, tw.drei - .1, tw.aber3, .25);
  dimThick.visible = lblThick.visible = kThick > .01;
  dimThick.position.set(4.6, WT + .25, HS - .5); dimThick.scale.setScalar(Math.max(kThick, .001));
  lblThick.position.set(4.6, WT + 1.15, HS - .5); lblThick.scale.set(2.2 * kThick, 1.1 * kThick, 1);
  const kHigh = win(t, tw.zehn, tw.zinnen + .2, .25);
  dimHigh.visible = lblHigh.visible = kHigh > .01;
  dimHigh.position.set(-4.9, 0, HS + .35);
  dimHigh.userData.bar.scale.y = Math.max(WT - 4.1, .01); dimHigh.userData.bar.position.y = (WT + 4.1) / 2;
  dimHigh.children.forEach(c => { if (c.userData.s) c.position.y = c.userData.s > 0 ? WT : 4.1; });
  lblHigh.position.set(-4.9, (WT + 4) / 2, HS + 1.3); lblHigh.scale.set(2.8 * kHigh, 1.4 * kHigh, 1);

  // guards on the walls
  const gPos = [[-5, HS - .55], [-2.6, HS - .55], [2.6, HS - .55], [5, HS - .55]];
  for (let i = 0; i < 4; i++) {
    const k = pop(t, tw.wachen + i * .08); G[i].visible = k > .01; G[i].scale.setScalar(S_P * Math.max(k, .001));
    G[i].position.set(gPos[i][0], WT, gPos[i][1]); G[i].rotation.set(0, i === 3 && t > tw.ecken - .2 && t < tw.also5 ? Math.sin((t - tw.ecken) * 4) * .8 : 0, 0);
  }
  // corner blind spot "?"
  const kq = win(t, tw.sieht, tw.also5 + .1, .25);
  qMark.visible = kq > .01; qMark.position.set(5, WT + 2.2, HS - .55); qMark.scale.set(1.6 * kq, .8 * kq, 1);

  // moat water + drawbridge
  const wl = lerp(4 - MOAT.depth, 3.35, ease(t, tw.wasser - .2, tw.wasser + .7));
  moatWater.visible = t > tw.wasser - .2; moatWater.position.y = wl;
  const bk = back(ramp(t, tw.zug - .1, tw.zug + .4)), up = ease(t, tw.hochz, tw.hochz + .7) * (1 - ease(t, tw.gluck + .3, tw.gluck + 1.3));
  bridge.visible = bk > .01; bridge.scale.set(1, 1, Math.max(bk, .001)); bridge.rotation.x = -Math.PI / 2 * .97 * up;
  chains.forEach(c => { c.visible = bridge.visible && WT > 6;
    const tip = V(c.userData.x, 0, BR_L * Math.max(bk, .001)).applyEuler(bridge.rotation).add(bridge.position);
    const a = c.geometry.attributes.position; a.setXYZ(0, c.userData.x * 1.05, 4 + GATEH + .9, HS + .02); a.setXYZ(1, tip.x, tip.y + .2, tip.z); a.needsUpdate = true; });

  // towers + archers + arrows
  towers.forEach((tw_, i) => {
    const k = ease(t, tw.runde - .1 + i * .12, tw.turme + .5 + i * .12);
    tw_.visible = k > .01; tw_.userData.body.scale.y = Math.max(k, .001); tw_.userData.top.position.y = (TW_T - TW_B) * k;
    tw_.userData.top.scale.setScalar(pop(t, tw.turme + .4 + i * .12));
    const fk = pop(t, tw.gluck + .3 + i * .1); tw_.userData.flag.forEach(o => { o.visible = fk > .01; o.position.y = (TW_T - TW_B) * k + (o === tw_.userData.flag[0] ? .9 : 1.5); });
    tw_.userData.flag[1].scale.set(Math.max(fk, .001), Math.max(fk, .001), 1); tw_.userData.flag[1].rotation.y = Math.sin(t * 3.5 + i) * .3;
  });
  const archers = [[HS + .2, HS - .4, -Math.PI / 2 - .3], [HS - .6, HS + .5, 0], [-HS + .4, HS + .3, .2], [HS + .2, -HS + .4, -Math.PI]];
  archers.forEach(([x, z, f], i) => { const g = G[4 + i]; const k = pop(t, tw.bogen + i * .1); g.visible = k > .01; g.scale.setScalar(S_P * Math.max(k, .001));
    g.position.set(x, TW_T, z); g.rotation.set(0, f + Math.PI, 0); g.userData.spear.forEach(s => s.visible = false); });
  const targets = [V(7.85, 5.0, 2.4), V(7.85, 5.0, .6), V(-3.8, 5.0, 7.85)];
  const srcs = [V(HS + .2, TW_T + 1, HS - .4), V(HS + .2, TW_T + 1, -HS + .4), V(-HS + .5, TW_T + 1, HS + .3)];
  arrowMeshes.forEach((m, j) => { const ti = j % 3, v = Math.floor(j / 3); const a = tw.schiess - .1 + ti * .35 + v * .12;
    const src = ti === 1 && v % 2 ? srcs[0] : srcs[ti === 2 ? 2 : (v % 2 ? 1 : 0)];
    flyArrow(m, src, targets[ti].clone().add(V(rr(0, 0), 0, 0)), ramp(t, a, a + .35)); });

  // siege camp
  camp.forEach((c, i) => { const k = pop(t, tw.belag - .3 + i * .07) * (1 - ramp(t, tw.gluck, tw.gluck + .4)); show(c, k); c.position.y = hAt(c.position.x, c.position.z);
    c.children[1].scale.y = 1 + .3 * Math.sin(t * 20 + i); });

  // well + grain
  const wk = ease(t, tw.brunnen - .1, tw.brunnen + .5); well.visible = wk > .01; well.scale.set(1, Math.max(wk, .001), 1);
  const bucketY = 1.3 - 1.0 * ease(t, tw.brunnen + .5, tw.grund) + 1.0 * ease(t, tw.grund + .4, tw.keller + .2);
  well.userData.bucket.position.set(0, bucketY - .2, 0); well.userData.bucket.visible = bucketY > .5;
  well.userData.rope.scale.y = Math.max(1.35 - bucketY, .01); well.userData.rope.position.y = (1.35 + bucketY) / 2;
  well.userData.bw.visible = t > tw.grund + .3;
  well.userData.inner.material.color.set(t > tw.grund ? '#1e5f9a' : '#0b0b0b');
  show(store, pop(t, tw.keller - .2) * (t > tw.keller - .2 ? 1 : 0));
  sacks.forEach((s, i) => { const k = pop(t, tw.getreide - .1 + i * .07, .25); s.visible = k > .01; s.scale.set(Math.max(k, .001), .75 * Math.max(k, .001), .8 * Math.max(k, .001)); });
  const ky = win(t, tw.jahr - .15, tw.und + .4, .25); lblYear.visible = ky > .01; lblYear.position.set(-4.0, 7.9, -3.4); lblYear.scale.set(3.2 * ky, 1.6 * ky, 1);

  // keep
  growTo(keep, lerp(KP.b - .2, KP.t, ease(t, tw.turm - .3, tw.berg + .3)));
  keepTop.visible = t > tw.berg; keepTop.scale.setScalar(pop(t, tw.berg + .1));
  keepTop.userData.flag.forEach(o => o.visible = t > tw.gluck + .2); keepTop.userData.flag[1].scale.setScalar(pop(t, tw.gluck + .2)); keepTop.userData.flag[1].rotation.y = Math.sin(t * 3) * .3;
  keepWins.forEach(w => w.visible = t > tw.berg + .2);
  const dk = pop(t, tw.tur - .05); keepDoor.visible = doorFrame.visible = dk > .01; keepDoor.scale.setScalar(Math.max(dk, .001)); doorFrame.scale.setScalar(Math.max(dk, .001));
  const lk = ease(t, tw.leiter - .2, tw.leiter + .3), lu = ease(t, tw.hochst, tw.hochst + .8);
  keepLadder.visible = lk > .01 && lu < .98;
  const la = lerp(-KL_A, 0, lu);
  keepLadder.rotation.set(la, 0, 0); keepLadder.position.set(KP.x, 4 + lu * 3.3, KP.z + KP.h + 1.1 * (1 - lu) + .15 + (1 - lk) * 2);
  const kf = win(t, tw.zweit - .1, tw.leiter + .2, .2); lblFloor.visible = kf > .01; lblFloor.position.set(KP.x, 4 + 6.0, KP.z + KP.h + .6); lblFloor.scale.set(3.4 * kf, 1.7 * kf, 1);

  raiders(t);
  // "?" over stuck raiders after the ladder went up
  placeCamera(t);
}

// ---------- captions ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d');
function wordAt(t) { let w = null; for (const x of WORDS) { if (x[1] <= t + .02) w = x; else break; } return w && t < w[2] + .5 ? clean(w[0]) : ''; }
function drawCaption(t) {
  const w = wordAt(t); if (!w) return;
  og.font = '700 96px Fredoka'; og.textAlign = 'center'; og.textBaseline = 'middle'; og.lineJoin = 'round';
  const y = 990;
  og.lineWidth = 16; og.strokeStyle = 'rgba(0,0,0,.92)'; og.strokeText(w, W / 2, y + 4);
  og.lineWidth = 12; og.strokeStyle = '#000'; og.strokeText(w, W / 2, y);
  og.fillStyle = '#ffffff'; og.fillText(w, W / 2, y);
}
window.END = END;
window.TW = tw;
window.renderAt = (t, q = .9) => {
  update(t); renderer.render(scene, camera);
  og.drawImage(renderer.domElement, 0, 0); drawCaption(t);
  return out.toDataURL('image/jpeg', q);
};
window.__done = true;
