// ===================== 04 Kühlschrank — oddtilt-style "Wie du X erfunden hast" =====================
// Built as: cat lib.js kuehl_main.js > kuehl.js

await document.fonts.load('700 96px Fredoka');

// ---------- words / timing ----------
const WORDS = await (await fetch('../04_kuehlschrank/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
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
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const show = (o, k) => { o.visible = k > .002; o.scale.setScalar(Math.max(k, .001)); };
function gbox(x0, x1, y0, y1, z0, z1, mat, s = 6, opt = {}) {
  const m = wbox(x0, x1, y0, y1, z0, z1, mat, s, opt);
  m.geometry.translate(-(x0 + x1) / 2, -y0, -(z0 + z1) / 2); m.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2);
  m.userData = { y0, y1 }; return m;
}
function growTo(m, h) { const { y0, y1 } = m.userData; const k = cl((h - y0) / (y1 - y0)); m.visible = k > 0.001; m.scale.y = Math.max(k, 0.001); }

// ---------- word times ----------
const tw = {
  stinkt: T('stinkt'), sch: T('Scheiße'), also1: T('Also'), vergr: T('vergräbst'), schnee1: T('Schnee'), genial: T('Genial'),
  aber1: T('Aber'), sommer: T('Sommer'), schmilzt1: T('schmilzt'),
  also2: T('Also', 2), grab: T('gräbst'), loch: T('Loch'), erde: T('Erde'), winter: T('Winter'), eis: T('Eis'), see: T('See'), das: T('Das'), august: T('August'),
  aber2: T('Aber', 2), runter: T('runtersteigst'), warme: T('warme'), luft: T('Luft'),
  also3: T('Also', 3), kiste: T('Holzkiste'), stroh: T('Stroh'), wand: T('Wänden'), legst: T('legst'), block: T('Eisblock'),
  aber3: T('Aber', 3), schmilzt2: T('schmilzt', 2), schlepp: T('schleppst'), jeden: T('jeden'),
  dann: T('Dann'), schweiss: T('Schweiß'), haut: T('Haut'), verd: T('verdunstet'), kalt: T('kalt'),
  also4: T('Also', 4), fl: T('Flüssigkeit'), rohr: T('Rohr'), sie: T('Sie'), saugt: T('saugt'), fleisch: T('Fleisch'),
  hinten: T('Hinten'), pumpe: T('Pumpe'), flussig: T('flüssig'), warme2: T('Wärme', 2), draussen: T('draußen'),
  aber4: T('Aber', 4), pumpst: T('pumpst'), ganzen: T('ganzen'),
  also5: T('Also', 5), akw: T('Atomkraftwerk'), motor: T('Motor'),
  aber5: T('Aber', 5), dtl: T('Deutschland'), schalt: T('schaltest'), windrad: T('Windrad'),
  gluck: T('Glückwunsch'), kuehl: T('Kühlschrank'), erf: T('erfunden') };

// ---------- materials ----------
grassMat.map = tex(plainCanvas('#5d9a3a', 26, 256, { n: 1800, cols: ['#4c8530', '#6fae46', '#3f7426', '#7cba52'], r: [1, 4] }));
grassMat.map.repeat.set(1, 1);
const rockC = plainCanvas('#8d8b86', 30, 256, { n: 600, cols: ['#77756f', '#a3a19b', '#6a6862'], r: [2, 9] });
const rockMat = new THREE.MeshStandardMaterial({ map: tex(rockC, 3, 2), roughness: 1, flatShading: true });
const woodTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#9a6b3e'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = `hsl(28,${40 + rnd() * 10}%,${30 + rnd() * 10}%)`; g.fillRect(0, y + 1, 256, 30); g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, y, 256, 2); }
  noise(g, 256, 256, 18); return tex(c); })();
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .9 });
const strawTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#d9b553'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) { g.strokeStyle = pick(['#b8902f', '#f0d27a', '#c9a040']); g.lineWidth = rr(1, 2.5); const x = rr(0, 256), y = rr(0, 256), a = rr(-.6, .6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.stroke(); } return tex(c); })();
const strawMat = new THREE.MeshStandardMaterial({ map: strawTex, roughness: 1 });
const iceMat = new THREE.MeshStandardMaterial({ color: '#c6ecff', roughness: .08, metalness: .05, transparent: true, opacity: .86, emissive: '#3a7aa0', emissiveIntensity: .25 });
const snowMat = new THREE.MeshStandardMaterial({ color: '#f6f9ff', roughness: .9, transparent: true, opacity: 0, depthWrite: false });
const snowSolid = new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: .85 });
const fridgeMat = new THREE.MeshStandardMaterial({ color: '#f3f5f7', roughness: .3, metalness: .1 });
const flameless = new THREE.MeshBasicMaterial({ color: '#000' });

// ---------- world: ground block cut at the front (z = ZC), pit for the ice cellar ----------
const ZC = 3, PIT = { x0: 2.1, x1: 4.7, z0: .3, y: -2.6 };
wbox(-WX, WX, BOT, PIT.y, -200, ZC, soilMat, 6, { cast: false });
lawn(-WX, PIT.x0, -200, ZC); lawn(PIT.x1, WX, -200, ZC); lawn(PIT.x0, PIT.x1, -200, PIT.z0);
const digFill = gbox(PIT.x0, PIT.x1, PIT.y, -.22, PIT.z0, ZC, soilMat, 6, { cast: false });
const digGrass = gbox(PIT.x0, PIT.x1, -.22, .02, PIT.z0, ZC, [grassSideMat, grassSideMat, grassMat, grassSideMat, grassSideMat, grassSideMat], 6, { cast: false });
// snow layer (3 sheets around the pit) + snow on the dug pit face
const snowSheets = [[-WX, PIT.x0, -200, ZC], [PIT.x1, WX, -200, ZC], [PIT.x0, PIT.x1, -200, PIT.z0]].map(([x0, x1, z0, z1]) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), snowMat); m.position.set((x0 + x1) / 2, .04, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m; });
const pitSnow = new THREE.Mesh(new THREE.PlaneGeometry(PIT.x1 - PIT.x0, ZC - PIT.z0).rotateX(-Math.PI / 2), snowMat); pitSnow.position.set((PIT.x0 + PIT.x1) / 2, .04, (ZC + PIT.z0) / 2); scene.add(pitSnow);

// rock hill with cave
{ const g = new THREE.SphereGeometry(1, 48, 28); const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); const f = 1 + .07 * Math.sin(x * 7 + z * 3) * Math.cos(y * 6) + .05 * Math.sin(z * 11 + y * 4); p.setXYZ(k, x * f, y * f, z * f); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, rockMat); m.scale.set(10, 6.5, 6); m.position.set(-1, -.6, -11.5); m.castShadow = m.receiveShadow = true; scene.add(m);
  const arch = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#0b0908', roughness: 1 })); arch.position.set(.4, 0, -5.05); arch.name = 'arch'; scene.add(arch);
  for (const [x, z, r] of [[-5.5, -3.8, .7], [4.6, -4.2, .9], [-4.3, -2.6, .45], [6.2, -2, .5]]) { const r_ = rock(r, '#8c8a85'); r_.position.set(x, r * .4, z); scene.add(r_); } }
// pines with snow caps
const pineCaps = [];
function pine(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.15 * s, .22 * s, 1.2 * s, 8), M('#5b4030', { roughness: 1 })); tr.position.y = .6 * s; tr.castShadow = true; g.add(tr);
  for (let i = 0; i < 3; i++) { const r = (1.5 - i * .38) * s, h = 1.8 * s, y = (1.1 + i * 1.05) * s;
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), M(pick(['#2f6b34', '#2a5e2f', '#357a3b']), { roughness: 1, flatShading: true })); c.position.y = y + h / 2; c.castShadow = true; g.add(c);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * .62, h * .42, 10), snowSolid); cap.position.y = y + h * .8; g.add(cap); pineCaps.push(cap); }
  return g;
}
for (const [x, z, s] of [[-7.5, -6, 1.2], [-9.8, -2.5, 1.0], [7.8, -6.5, 1.3], [10.5, -3, 1.0], [-12, -9, 1.4], [13, -10, 1.5], [-6.2, -14, 1.6], [7, -16, 1.7], [-16, -16, 1.5], [17, -18, 1.6], [0, -24, 1.8], [-22, -26, 1.8], [24, -27, 1.9]]) pine(x, z, s);
// distant hills
for (const [x, z, r, h] of [[-60, -110, 45, 18], [20, -125, 55, 22], [80, -100, 42, 15]]) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M('#6f9a4a', { roughness: 1 })); m.scale.set(r, h, r * .7); m.position.set(x, -.1, z); scene.add(m); }

// ---------- caveman rig ----------
const furC = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#9a6a3c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { g.fillStyle = pick(['#6b4424', '#5a3920', '#7a512e']); g.beginPath(); g.ellipse(rr(0, 256), rr(0, 256), rr(8, 22), rr(6, 16), rr(0, 3), 0, 7); g.fill(); }
  noise(g, 256, 256, 20); return c; })();
const furMat = new THREE.MeshStandardMaterial({ map: tex(furC, 1.5, 1.5), roughness: 1 });
const skinMat = new THREE.MeshStandardMaterial({ color: '#e2a77c', roughness: .75 });
const hairMat = new THREE.MeshStandardMaterial({ color: '#3a2416', roughness: 1, flatShading: true });
const blackMat = new THREE.MeshBasicMaterial({ color: '#111' });
const SKIN = new THREE.Color('#e2a77c'), FROZEN = new THREE.Color('#9fc8f0');
function caveman() {
  const root = new THREE.Group(); scene.add(root);
  const pelvis = new THREE.Group(); pelvis.position.y = .95; root.add(pelvis);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.27, .42, 6, 14), furMat); torso.position.y = .36; torso.scale.z = .82; torso.castShadow = true; pelvis.add(torso);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.3, .36, .26, 10), furMat); skirt.position.y = .02; skirt.castShadow = true; pelvis.add(skirt);
  const head = new THREE.Group(); head.position.y = .8; pelvis.add(head);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.25, 24, 18), skinMat); hd.position.y = .18; hd.castShadow = true; head.add(hd);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.275, 16, 12, 0, Math.PI * 2, 0, Math.PI * .55), hairMat); hair.position.set(0, .2, -.03); head.add(hair);
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.06, .2, 5), hairMat); const a = -1.2 + i * .4; c.position.set(Math.sin(a) * .2, .42, Math.cos(a) * .05 - .05); c.rotation.z = -a * .6; head.add(c); }
  const beard = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), hairMat); beard.scale.set(1.12, .85, .7); beard.position.set(0, .03, .1); head.add(beard);
  const eyes = [], pupils = [], brows = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.062, 14, 10), M('#ffffff', { roughness: .3 })); e.position.set(s * .092, .23, .205); head.add(e); eyes.push(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.032, 10, 8), blackMat); p.position.set(s * .092, .23, .262); head.add(p); pupils.push(p);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.13, .035, .04), hairMat); b.position.set(s * .092, .315, .225); head.add(b); brows.push(b);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), skinMat); nose.position.set(0, .16, .25); head.add(nose);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 8), M('#4a1612')); mouth.scale.set(1.3, .35, .4); mouth.position.set(0, .08, .275); head.add(mouth);
  const sh = [], el = [], hand = [], hip = [], kn = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * .34, .6, 0); pelvis.add(a); sh.push(a);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(.078, .22, 4, 10), skinMat); up.position.y = -.16; up.castShadow = true; a.add(up);
    const e = new THREE.Group(); e.position.y = -.33; a.add(e); el.push(e);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .2, 4, 10), skinMat); fo.position.y = -.14; fo.castShadow = true; e.add(fo);
    const h = new THREE.Group(); h.position.y = -.31; e.add(h); hand.push(h);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(.088, 12, 10), skinMat); hm.castShadow = true; h.add(hm);
    const lg = new THREE.Group(); lg.position.set(s * .14, -.02, 0); pelvis.add(lg); hip.push(lg);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.095, .28, 4, 10), skinMat); th.position.y = -.21; th.castShadow = true; lg.add(th);
    const k = new THREE.Group(); k.position.y = -.45; lg.add(k); kn.push(k);
    const shn = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .28, 4, 10), skinMat); shn.position.y = -.2; shn.castShadow = true; k.add(shn);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.17, .09, .28), M('#5a3a22')); ft.position.set(0, -.44, .06); ft.castShadow = true; k.add(ft);
  }
  root.userData = { pelvis, head, sh, el, hand, hip, kn, brows, mouth, pupils };
  return root;
}
// pose: [shLx, shLz, shRx, shRz, elL, elR, hipL, hipR, knL, knR, lean, headX, headY, brow, mouth]
const POSE = {
  idle:    [0, -.12, 0, .12, -.15, -.15, 0, 0, 0, 0, 0, 0, 0, 0, .3],
  disgust: [-1.95, .55, -1.2, .35, -1.75, -.25, 0, 0, 0, 0, -.12, -.1, .25, -.9, .25],
  bend:    [-1.0, -.1, -1.0, .1, -.2, -.2, 0, 0, .25, .25, .65, .1, 0, .3, .5],
  cheer:   [-2.9, -.35, -2.9, .35, -.1, -.1, 0, 0, 0, 0, -.05, -.15, 0, .8, 1.3],
  headhold:[-2.5, -.6, -2.5, .6, -1.9, -1.9, 0, 0, 0, 0, .05, .2, 0, .9, .25],
  dig:     [-1.3, -.05, -1.3, .05, -.4, -.4, -.25, .1, .45, .2, .45, .25, 0, -.3, .35],
  carry:   [-1.15, -.05, -1.15, .05, -.55, -.55, 0, 0, 0, 0, -.06, -.05, 0, -.4, .7],
  hug:     [-1.2, .75, -1.2, -.75, -1.95, -1.95, 0, 0, 0, 0, .12, .1, 0, .7, .35],
  pump:    [-1.25, -.05, -1.25, .05, -.25, -.25, -.15, .15, .2, .05, .3, .15, 0, -.5, .8],
  shrug:   [-.4, -.75, -.4, .75, -1.6, -1.6, 0, 0, 0, 0, 0, 0, .25, .9, .2],
  wipe:    [-.1, -.12, -2.6, .45, -.15, -1.5, 0, 0, 0, 0, 0, -.05, 0, .5, .8],
  climb:   [-2.6, -.15, -2.6, .15, -.4, -.4, -.9, -.2, 1.0, .3, -.05, -.4, 0, -.2, .4],
};
const mixP = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function walkP(base, ph, amp = 1) {
  const p = base.slice(); const s = Math.sin(ph);
  p[6] += -.5 * s * amp; p[7] += .5 * s * amp; p[8] += Math.max(0, s) * .8 * amp; p[9] += Math.max(0, -s) * .8 * amp;
  if (base === POSE.idle) { p[0] += .4 * s * amp; p[2] += -.4 * s * amp; }
  return p;
}
function applyPose(c, p) {
  const u = c.userData;
  u.sh[0].rotation.set(p[0], 0, p[1]); u.sh[1].rotation.set(p[2], 0, p[3]); u.el[0].rotation.x = p[4]; u.el[1].rotation.x = p[5];
  u.pelvis.rotation.x = p[10]; u.hip[0].rotation.x = p[6] - p[10]; u.hip[1].rotation.x = p[7] - p[10];
  u.kn[0].rotation.x = p[8]; u.kn[1].rotation.x = p[9];
  u.head.rotation.set(p[11], p[12], 0);
  u.brows.forEach((b, i) => { const s = i ? 1 : -1; b.rotation.z = -s * p[13] * .45; b.position.y = .315 + p[13] * .025; });
  u.mouth.scale.set(1.3 - p[14] * .25, .3 + p[14] * .55, .4);
  const lower = Math.max(0, -Math.min(p[6], p[7]) * 0) ; u.pelvis.position.y = .95 - (Math.max(p[8], p[9]) > .9 ? .05 : 0) - lower;
}
const cave = caveman();
const _v = new THREE.Vector3();
const handPos = (i) => { cave.updateMatrixWorld(true); return cave.userData.hand[i].getWorldPosition(new THREE.Vector3()); };

// ---------- props ----------
const meat = new THREE.Group(); scene.add(meat);
{ const bone = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .95, 10), M('#f1ead8')); bone.rotation.z = Math.PI / 2; meat.add(bone);
  for (const x of [-.48, .48]) for (const dz of [-.06, .06]) { const k = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), M('#f1ead8')); k.position.set(x, 0, dz); meat.add(k); }
  const m = new THREE.Mesh(new THREE.SphereGeometry(.3, 18, 14), M('#a8442c', { roughness: .6 })); m.scale.set(1.15, .85, .85); m.position.x = .08; m.castShadow = true; meat.add(m);
  const fat = new THREE.Mesh(new THREE.SphereGeometry(.31, 18, 14, 0, Math.PI * 2, 0, Math.PI * .3), M('#e8c9a3')); fat.scale.set(1.15, .85, .85); fat.position.x = .08; fat.rotation.z = -.6; meat.add(fat); }
const stink = [];
for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 20; k++) pts.push(V(Math.sin(k / 20 * Math.PI * 2.2 + i) * .1, k / 20 * 1.0, 0));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .028, 6), new THREE.MeshBasicMaterial({ color: '#8fe04a', transparent: true, opacity: .9 })); scene.add(m); stink.push(m); }
const flies = []; for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), blackMat); scene.add(f); flies.push(f); }
const snowPile = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), snowSolid); snowPile.position.set(-1.1, 0, .2); snowPile.castShadow = snowPile.receiveShadow = true; scene.add(snowPile);
const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7fb7d8', roughness: .1, transparent: true, opacity: .7 })); puddle.position.set(-1.1, .05, .2); scene.add(puddle);
// pit contents: ice blocks, lid, ladder
const pitIce = [];
for (let i = 0; i < 12; i++) { const c = i % 4, r = Math.floor(i / 4); const w = (PIT.x1 - PIT.x0 - .2) / 4;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w - .05, .62, (ZC - PIT.z0) - .25), iceMat); m.position.set(PIT.x0 + .1 + w * (c + .5), PIT.y + .31 + r * .64, (PIT.z0 + ZC) / 2 - .05); m.castShadow = true; scene.add(m); pitIce.push(m); }
const lid = new THREE.Group(); lid.position.set(PIT.x0, .02, (PIT.z0 + ZC) / 2); scene.add(lid);
for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(PIT.x1 - PIT.x0 + .2, .1, .42), i % 2 ? woodMat : M('#7a5130')); p.position.set((PIT.x1 - PIT.x0) / 2, .05, -1.25 + i * .45); p.castShadow = true; lid.add(p); }
function ladderMesh(L) { const g = new THREE.Group();
  for (const x of [-.26, .26]) { const r = new THREE.Mesh(new THREE.BoxGeometry(.07, L, .07), woodMat); r.position.set(x, L / 2, 0); g.add(r); }
  for (let y = .3; y < L; y += .38) { const r = new THREE.Mesh(new THREE.BoxGeometry(.52, .05, .05), woodMat); r.position.y = y; g.add(r); } scene.add(g); return g; }
const pitLadder = ladderMesh(3.2); pitLadder.position.set(4.25, PIT.y, .55); pitLadder.rotation.x = .15;
const warm = [];
for (let i = 0; i < 4; i++) { const pts = []; for (let k = 0; k <= 20; k++) pts.push(V(Math.sin(k / 20 * Math.PI * 2 + i * 1.3) * .14, -k / 20 * 1.6, 0));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .05, 6), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: .9 })); scene.add(m); warm.push(m); }

// ---------- the ice box (wood, straw-insulated, open front = cutaway) ----------
const BX = { x0: -3.6, x1: -1.6, z0: -.7, z1: .6, h: 1.95, t: .24 };
function boxShell(mat, core) {
  const g = new THREE.Group(); scene.add(g); const { x0, x1, z0, z1, h, t } = BX;
  const parts = [[x0, x1, 0, t, z0, z1], [x0, x1, h - t, h, z0, z1], [x0, x0 + t, t, h - t, z0, z1], [x1 - t, x1, t, h - t, z0, z1], [x0 + t, x1 - t, t, h - t, z0, z0 + t]];
  for (const [a, b, c, d, e, f] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, d - c, f - e), mat); m.position.set((a + b) / 2, (c + d) / 2, (e + f) / 2); m.castShadow = m.receiveShadow = true; g.add(m);
    if (core) { const sx = b - a > t + .01 ? b - a - .1 : t * .5, sy = d - c > t + .01 ? d - c - .1 : t * .5, sz = f - e > t + .01 ? f - e - .1 : t * .5;
      const s = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz + (f - e > t + .01 ? .12 : 0)), core); s.position.set((a + b) / 2, (c + d) / 2, (e + f) / 2 + (f - e > t + .01 ? .03 : 0)); g.add(s); g.userData.straw = (g.userData.straw || []).concat(s); }
  }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 2 * t, .06, z1 - z0 - t), mat === woodMat ? M('#7a5130') : M('#dfe6ea', { transparent: true, opacity: .7 })); shelf.position.set((x0 + x1) / 2, 1.3, (z0 + t + z1) / 2); g.add(shelf);
  return g;
}
const woodBox = boxShell(woodMat, strawMat);
const boxIce = new THREE.Mesh(new THREE.BoxGeometry(1.2, .38, .8), iceMat); boxIce.castShadow = true; scene.add(boxIce);
const carryIce = new THREE.Mesh(new THREE.BoxGeometry(.7, .4, .5), iceMat); scene.add(carryIce);
const boxPuddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), puddle.material); boxPuddle.position.set(-2.6, .05, .9); scene.add(boxPuddle);
// refrigerant loop: evaporator (inside, blue), condenser (outside left wall, red), pump
const flowTex = (() => { const [c, g] = cv(64, 8); g.fillStyle = '#2f7fe0'; g.fillRect(0, 0, 64, 8); g.fillStyle = '#bfe4ff'; g.fillRect(0, 0, 20, 8); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); return t; })();
const flowTexR = (() => { const [c, g] = cv(64, 8); g.fillStyle = '#e0452f'; g.fillRect(0, 0, 64, 8); g.fillStyle = '#ffc28a'; g.fillRect(0, 0, 20, 8); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); return t; })();
function coil(pts, mat) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'catmullrom', .05), 300, .045, 8), mat); m.castShadow = true; scene.add(m); m.geometry.setDrawRange(0, 0); m.userData.n = m.geometry.index.count; return m; }
const evapPts = []; { const zb = BX.z0 + BX.t + .07; for (let i = 0; i < 5; i++) { const y = 1.15 - i * .2; const xa = BX.x0 + BX.t + .12, xb = BX.x1 - BX.t - .12; evapPts.push(i % 2 ? [xb, y, zb] : [xa, y, zb], i % 2 ? [xa, y, zb] : [xb, y, zb]); } }
evapPts.unshift([BX.x0 + BX.t + .12, 1.15, BX.z1 - .3], [BX.x0 + .02, 1.15, BX.z1 - .3]); evapPts.unshift([BX.x0 - .3, 1.15, BX.z1 - .3]);
const evap = coil(evapPts, new THREE.MeshStandardMaterial({ map: flowTex, emissive: '#1d4f90', emissiveIntensity: .4, roughness: .4 }));
const condPts = []; { const xs = BX.x0 - .08; for (let i = 0; i < 6; i++) { const y = .35 + i * .22; condPts.push(i % 2 ? [xs, y, BX.z0 + .15] : [xs, y, BX.z1 - .15], i % 2 ? [xs, y, BX.z1 - .15] : [xs, y, BX.z0 + .15]); } }
condPts.unshift([BX.x0 - .7, .55, BX.z1 + .05], [BX.x0 - .08, .35, BX.z1 - .15]);
const cond = coil(condPts, new THREE.MeshStandardMaterial({ map: flowTexR, emissive: '#902a1a', emissiveIntensity: .45, roughness: .4 }));
const pump = new THREE.Group(); pump.position.set(BX.x0 - .95, 0, BX.z1 + .05); scene.add(pump);
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, .9, 16), M('#6d6a64', { metalness: .4, roughness: .5 })); b.position.y = .45; b.castShadow = true; pump.add(b);
  const lev = new THREE.Group(); lev.position.y = .95; pump.add(lev); pump.userData.lev = lev;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.95, .07, .07), woodMat); bar.position.x = -.45; lev.add(bar);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(.45, .35, .4), M('#3c6fb0', { metalness: .3 })); motor.position.set(.0, .18, -.45); pump.add(motor); pump.userData.motor = motor; }
const heatDots = []; for (let i = 0; i < 10; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a2a' })); scene.add(d); heatDots.push(d); }
const heatWaves = []; for (let i = 0; i < 4; i++) { const pts = []; for (let k = 0; k <= 16; k++) pts.push(V(Math.sin(k / 16 * Math.PI * 2 + i) * .08, k / 16 * .9, 0));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, .035, 6), new THREE.MeshBasicMaterial({ color: '#ff6a2a', transparent: true, opacity: .85 })); scene.add(m); heatWaves.push(m); }
// sweat + vapour
const drops = []; for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshStandardMaterial({ color: '#9fd8ff', roughness: .05 })); d.scale.y = 1.4; scene.add(d); drops.push(d); }
const vapour = []; for (let i = 0; i < 8; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.08, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .5, depthWrite: false })); scene.add(d); vapour.push(d); }

// ---------- modern fridge (finale) ----------
const fridge = boxShell(fridgeMat, null);
const fridgeLight = new THREE.Mesh(new THREE.BoxGeometry(BX.x1 - BX.x0 - .6, .04, .2), new THREE.MeshBasicMaterial({ color: '#fff7d6' })); fridgeLight.position.set((BX.x0 + BX.x1) / 2, BX.h - BX.t - .03, 0); scene.add(fridgeLight);
const fLight = new THREE.PointLight('#fff1c8', 0, 4, 1.5); fLight.position.set((BX.x0 + BX.x1) / 2, 1.4, .3); scene.add(fLight);
const fDoor = new THREE.Group(); fDoor.position.set(BX.x0, 0, BX.z1 + .02); scene.add(fDoor);
{ const d = new THREE.Mesh(new THREE.BoxGeometry(BX.x1 - BX.x0, BX.h, .1), fridgeMat); d.position.set((BX.x1 - BX.x0) / 2, BX.h / 2, .05); d.castShadow = true; fDoor.add(d);
  const hnd = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, .08), M('#9aa3ab', { metalness: .7, roughness: .3 })); hnd.position.set(BX.x1 - BX.x0 - .15, 1.15, .14); fDoor.add(hnd);
  const mag = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .03, 16).rotateX(Math.PI / 2), M('#e3412f')); mag.position.set(.5, 1.45, .12); fDoor.add(mag);
  const mag2 = new THREE.Mesh(new THREE.BoxGeometry(.22, .14, .03), M('#f2c33a')); mag2.position.set(.9, 1.25, .12); fDoor.add(mag2); }
const beer = new THREE.Group(); scene.add(beer);
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .32, 14), M('#5c3a12', { roughness: .2, transparent: true, opacity: .9 })); b.position.y = .16; beer.add(b);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, .14, 12), b.material); n.position.y = .38; beer.add(n);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(.072, .072, .12, 14), M('#f2e6c4')); lab.position.y = .16; beer.add(lab); }
beer.position.set(BX.x1 - .55, BX.t, .1);
const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .9 })); puff.position.set((BX.x0 + BX.x1) / 2, 1, 0); scene.add(puff);

// ---------- power: nuclear plant, then a wind turbine ----------
function coolingTower(x, z) {
  const pts = []; for (let i = 0; i <= 20; i++) { const y = i / 20 * 9; pts.push(new THREE.Vector2(2.1 * Math.sqrt(1 + ((y - 6.2) / 3.6) ** 2), y)); }
  const g = new THREE.Group(); g.position.set(x, 0, z); g.userData.s = 1.35; scene.add(g);
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M('#d9d6cf', { side: THREE.DoubleSide, roughness: .9 })); m.castShadow = true; g.add(m);
  const steam = []; for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .85, roughness: 1, depthWrite: false })); g.add(s); steam.push(s); }
  g.userData.steam = steam; return g;
}
const towers = [coolingTower(-17.5, -17), coolingTower(-12.5, -21)];
const windrad = new THREE.Group(); windrad.position.set(2.5, 0, -21); scene.add(windrad);
{ const tw_ = new THREE.Mesh(new THREE.CylinderGeometry(.22, .45, 14, 16), M('#f4f4f2')); tw_.position.y = 7; tw_.castShadow = true; windrad.add(tw_);
  const nac = new THREE.Mesh(new THREE.BoxGeometry(.7, .7, 1.6), M('#f4f4f2')); nac.position.set(0, 14.2, 0); windrad.add(nac);
  const rot = new THREE.Group(); rot.position.set(0, 14.2, .9); windrad.add(rot); windrad.userData.rot = rot;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(.4, 14, 10), M('#f4f4f2')); rot.add(hub);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.5, 6.2, .12), M('#f4f4f2')); b.geometry.translate(0, 3.2, 0); b.rotation.z = i * Math.PI * 2 / 3; b.castShadow = true; rot.add(b); } }
const cableMat = new THREE.LineBasicMaterial({ color: '#222' });
function cable(pts) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => V(...p))), cableMat); scene.add(l); return l; }
const poles = []; for (const [x, z] of [[-6, -6], [-10, -10], [-14, -14]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 3.2, 8), woodMat); p.position.set(x, 1.6, z); p.castShadow = true; scene.add(p); poles.push(p); }
const poles2 = []; for (const [x, z] of [[1.5, -8], [2.2, -14]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 3.2, 8), woodMat); p.position.set(x, 1.6, z); scene.add(p); poles2.push(p); }
const cableA = cable([[BX.x0 - .95, .5, BX.z1 - .35], [-5, 3.0, -3], [-6, 3.2, -6], [-10, 3.2, -10], [-14, 3.2, -14], [-16, 3.2, -16.5]]);
const cableB = cable([[BX.x0 - .95, .5, BX.z1 - .35], [-1.5, 3.0, -6], [1.5, 3.2, -8], [2.2, 3.2, -14], [2.4, 3.2, -20.6]]);

// ---------- labels ----------
function label(text, w = 3, fill = '#ffd21f') {
  const [c, g] = cv(768, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, 384, 132); g.fillStyle = fill; g.fillText(text, 384, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w, w / 3, 1); s.renderOrder = 10; s.userData.w = w; scene.add(s); return s;
}
const lblAug = label('AUGUST', 3.2), lblAus = label('AUS', 4.5, '#ff4a3a'), lblBrr = label('BRRR', 1.6, '#bfe8ff'), lblMinus = label('-18 °C', 2.6, '#bfe8ff');
const flag = (() => { const [c, g] = cv(300, 180); g.fillStyle = '#000'; g.fillRect(0, 0, 300, 60); g.fillStyle = '#dd0000'; g.fillRect(0, 60, 300, 60); g.fillStyle = '#ffce00'; g.fillRect(0, 120, 300, 60);
  g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeRect(0, 0, 300, 180);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.renderOrder = 10; scene.add(s); return s; })();
function setLabel(s, k, x, y, z) { s.visible = k > .01; s.position.set(x, y, z); s.scale.set(s.userData.w * k, s.userData.w / 3 * k, 1); }

// ---------- sky / time of day ----------
const daySky = scene.background;
const nightSky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#060b1d'); gr.addColorStop(.6, '#142046'); gr.addColorStop(1, '#2a3561'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${rr(.3, 1)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 620), rr(.5, 1.8), 0, 7); g.fill(); }
  g.fillStyle = '#fdf6d8'; g.beginPath(); g.arc(400, 170, 34, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hemi = scene.children.find(o => o.isHemisphereLight);
const dayFog = scene.fog.color.clone(), nightFog = new THREE.Color('#1c2547');

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 600);
const KEYS = [
  [0, V(.2, 1.75, 4.3), V(.1, 1.45, .8)],
  [tw.also1 - .1, V(.2, 1.75, 4.6), V(.1, 1.4, .8)],
  [tw.also1 + .6, V(-.3, 2.2, 7.2), V(-.6, .9, .2)],
  [tw.aber1 - .1, V(-.3, 2.2, 7.0), V(-.6, .9, .2)],
  [tw.aber1 + .6, V(-.5, 2.4, 7.6), V(-.7, .8, .2)],
  [tw.also2 - .1, V(-.5, 2.4, 7.4), V(-.7, .8, .2)],
  [tw.also2 + .8, V(3.4, 1.6, 11.8), V(3.4, -.9, 0)],
  [tw.aber2 + .6, V(3.4, 1.4, 11.0), V(3.4, -1.0, 0)],
  [tw.also3 - .1, V(3.2, 1.4, 10.6), V(3.4, -1.0, 0)],
  [tw.also3 + .8, V(-1.6, 2.0, 7.6), V(-2.2, .95, 0)],
  [tw.aber3 - .1, V(-1.6, 1.9, 7.2), V(-2.2, .95, 0)],
  [tw.aber3 + .6, V(-2.8, 2.8, 11.5), V(-3.0, 1.0, 0)],
  [tw.dann - .1, V(-2.8, 2.8, 11.2), V(-3.0, 1.0, 0)],
  [tw.dann + .6, V(-.55, 1.85, 3.3), V(-.55, 1.72, .8)],
  [tw.also4 - .1, V(-.55, 1.85, 3.1), V(-.55, 1.72, .8)],
  [tw.also4 + .7, V(-2.4, 1.3, 4.9), V(-2.6, .95, -.1)],
  [tw.hinten - .1, V(-2.4, 1.25, 4.6), V(-2.6, .95, -.1)],
  [tw.hinten + .8, V(-6.6, 1.9, 5.0), V(-3.7, .9, -.1)],
  [tw.aber4 - .1, V(-6.6, 1.9, 4.8), V(-3.9, .9, -.1)],
  [tw.aber4 + .5, V(-6.9, 2.2, 5.8), V(-4.4, 1.0, 0)],
  [tw.also5 - .1, V(-6.9, 2.2, 5.6), V(-4.4, 1.0, 0)],
  [tw.also5 + 1.0, V(1.5, 3.6, 15), V(-8.5, 5.2, -14)],
  [tw.aber5 - .1, V(1.7, 3.6, 14.6), V(-8.0, 5.2, -14)],
  [tw.windrad - .2, V(1.0, 4.0, 15), V(1.5, 8.5, -14)],
  [tw.gluck - .2, V(1.0, 3.9, 14.5), V(1.2, 8.0, -14)],
  [tw.gluck + .7, V(-1.4, 1.8, 6.8), V(-2.0, 1.05, 0)],
  [END, V(-1.3, 1.85, 7.3), V(-2.0, 1.05, 0)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- caveman choreography ----------
function placeCave(x, z, face) { cave.position.set(x, 0, z); cave.rotation.set(0, face, 0); }
function caveAt(t) {
  let pose = POSE.idle, x = .1, z = .8, face = 0, walking = false;
  const step = (a, b, x0, z0, x1, z1) => { const k = ease(t, a, b); x = lerp(x0, x1, k); z = lerp(z0, z1, k); face = Math.atan2(x1 - x0, z1 - z0); walking = k > 0 && k < 1; return k; };
  if (t < tw.also1) { pose = mixP(POSE.idle, POSE.disgust, ease(t, .1, .5)); }
  else if (t < tw.aber1) {
    const k = step(tw.also1, tw.vergr + .1, .1, .8, -.45, 1.1);
    if (k >= 1) { face = -.9; pose = mixP(POSE.idle, POSE.bend, win(t, tw.vergr + .1, tw.genial, .25)); }
    if (t > tw.genial - .1) { face = 0; pose = mixP(POSE.idle, POSE.cheer, pop(t, tw.genial - .1, .3)); }
  } else if (t < tw.also2) { x = -.45; z = 1.1; face = -.3; pose = mixP(POSE.idle, POSE.headhold, ease(t, tw.schmilzt1 - .2, tw.schmilzt1 + .2)); }
  else if (t < tw.aber2) {
    const k = step(tw.also2, tw.grab + .3, -.45, 1.1, 1.55, 1.6);
    if (k >= 1) { face = Math.PI / 2; const ph = (t - tw.grab) * 9; pose = t < tw.erde + .6 ? mixP(POSE.idle, POSE.dig, .6 + .4 * Math.sin(ph)) : POSE.idle; }
    if (t > tw.august - .1) { face = .3; pose = mixP(POSE.idle, POSE.cheer, pop(t, tw.august - .1, .3) * .7); }
  } else if (t < tw.also3) {
    // climbs down the ladder into the pit
    const k = ease(t, tw.aber2 + .2, tw.runter + .5); x = lerp(1.55, 4.25, Math.min(1, k * 2.2)); z = lerp(1.6, .95, Math.min(1, k * 2.2)); face = Math.PI;
    const down = ease(t, tw.runter - .2, tw.warme + .2);
    cave.position.y = lerp(0, PIT.y + .62 * 3 + .1, down);
    pose = down > 0 ? walkP(POSE.climb, t * 9, .5) : walkP(POSE.idle, t * 12, k < 1 ? 1 : 0);
    placeCave(x, z, face); cave.position.y = lerp(0, PIT.y + 1.95, down); return { pose, keepY: true };
  } else if (t < tw.aber3) {
    x = -.8; z = 1.3; face = -.6; pose = mixP(POSE.idle, POSE.cheer, pop(t, tw.block + .2, .3) * .6);
    if (t < tw.kiste + .3) { face = -.4; pose = POSE.idle; }
  } else if (t < tw.dann) {
    // carries ice blocks back and forth
    const cyc = (t - tw.aber3) / ((tw.dann - tw.aber3) / 2.2); const ph = cyc % 1; const going = ph < .5; const k = going ? ph * 2 : 1 - (ph - .5) * 2;
    x = lerp(-7.5, -.9, sm(k)); z = 1.4; face = going ? Math.PI / 2 : -Math.PI / 2; walking = true;
    pose = going ? POSE.carry : POSE.idle; return { pose: walkP(pose, t * 14, 1), x, z, face, carry: going };
  } else if (t < tw.also4) {
    x = -.55; z = .8; face = 0;
    pose = t < tw.kalt - .2 ? mixP(POSE.idle, POSE.wipe, win(t, tw.dann + .1, tw.verd + .3, .25)) : mixP(POSE.idle, POSE.hug, ease(t, tw.kalt - .3, tw.kalt + .1));
  } else if (t < tw.aber4) { x = -.6; z = 1.3; face = -.3; pose = mixP(POSE.idle, POSE.shrug, win(t, tw.saugt, tw.fleisch + .8, .3) * .5); }
  else if (t < tw.also5 + .6) {
    x = BX.x0 - 1.95; z = BX.z1 + .05; face = Math.PI / 2;
    const ph = (t - tw.aber4) * 11; pose = mixP(POSE.idle, POSE.pump, ease(t, tw.aber4, tw.aber4 + .3)); pose = pose.slice(); pose[0] += .3 * Math.sin(ph); pose[2] += .3 * Math.sin(ph); pose[10] += .1 * Math.sin(ph);
  } else if (t < tw.gluck) { x = BX.x0 - 1.7; z = 1.4; face = .4; pose = t > tw.schalt - .1 ? mixP(POSE.idle, POSE.shrug, ease(t, tw.schalt - .1, tw.schalt + .3)) : mixP(POSE.idle, POSE.cheer, ease(t, tw.motor - .1, tw.motor + .3) * .4); }
  else { x = -.95; z = 1.35; face = -.35; pose = mixP(POSE.idle, POSE.cheer, pop(t, tw.gluck + .2, .35)); }
  return { pose: walking ? walkP(pose, t * 12, 1) : pose, x, z, face };
}

// ---------- the timeline ----------
let lastSkin = -1;
function update(t) {
  // seasons: snow in, summer, winter (ice), summer
  const snow = Math.max(ease(t, tw.also1 - .2, tw.vergr) * (1 - ease(t, tw.sommer, tw.schmilzt1 + .6)), ease(t, tw.winter - .3, tw.winter + .3) * (1 - ease(t, tw.das, tw.august + .3)));
  snowMat.opacity = snow * .96; snowSheets.forEach(m => m.visible = snow > .01); pineCaps.forEach(c => { c.visible = snow > .05; c.scale.setScalar(Math.max(snow, .001)); });
  // day/night cycles while hauling ice and while pumping all day
  const cyc = (a, b, n) => t > a && t < b ? (.5 - .5 * Math.cos((t - a) / (b - a) * Math.PI * 2 * n)) : 0;
  const night = Math.max(cyc(tw.jeden - .4, tw.dann - .1, 2), cyc(tw.ganzen - .4, tw.also5 + .1, 2));
  scene.background = night > .5 ? nightSky : daySky;
  hemi.intensity = lerp(1.15, .3, night); sun.intensity = lerp(2.7, .35, night); fill.intensity = lerp(.55, .12, night);
  renderer.toneMappingExposure = lerp(1.05, .8, night); scene.fog.color.copy(dayFog).lerp(nightFog, night);

  // caveman
  const st = caveAt(t);
  if (!st.keepY) { placeCave(st.x, st.z, st.face); cave.position.y = 0; }
  applyPose(cave, st.pose);
  const shiver = win(t, tw.kalt - .1, tw.also4 + .2, .2); if (shiver > 0) cave.position.x += Math.sin(t * 70) * .015 * shiver;
  const frozen = shiver; if (frozen !== lastSkin) { skinMat.color.copy(SKIN).lerp(FROZEN, frozen * .8); lastSkin = frozen; }

  // meat
  let mp = null, mk = 1, mrot = 0;
  if (t < tw.also1 + .2) { const h = handPos(1); mp = h.add(V(.0, .05, .12)); mrot = .4; }
  else if (t < tw.vergr + .1) { const h = handPos(1); mp = h.add(V(0, .05, .1)); }
  else if (t < tw.aber1) { const k = ease(t, tw.vergr + .1, tw.schnee1 + .2); mp = V(lerp(-.85, -1.1, k), lerp(.5, .15, k), lerp(.7, .25, k)); mk = 1 - k * .0; }
  else if (t < tw.also2 + .2) { mp = V(-1.1, .22, .25); }
  else if (t < tw.also3) { mp = V(3.4, PIT.y + 1.92 + .2, 1.6); mk = ease(t, tw.see, tw.see + .3); }
  else if (t < tw.gluck) { mp = V(-2.75, BX.t + .2, .05); mk = pop(t, tw.wand, .3); }
  else { mp = V(-2.95, BX.t + .2, .05); }
  show(meat, mk); if (mp) meat.position.copy(mp); meat.rotation.set(0, .3, mrot);
  if (t > tw.also1 + .2 && t < tw.vergr + .3) meat.visible = true;
  if (t > tw.schnee1 + .2 && t < tw.sommer + .3) meat.visible = false;   // buried
  // stink + flies
  const stinkK = Math.max(win(t, .1, tw.also1 + .4, .3), win(t, tw.schmilzt1 - .1, tw.also2 + .2, .3));
  stink.forEach((s, i) => { s.visible = stinkK > .02 && meat.visible; const ph = (t * .9 + i * .33) % 1;
    s.position.set(meat.position.x - .25 + i * .25, meat.position.y + .15 + ph * .5, meat.position.z); s.scale.set(stinkK, stinkK * (.6 + ph * .5), stinkK); s.material.opacity = .9 * (1 - ph) * stinkK; s.rotation.y = t * 2 + i; });
  flies.forEach((f, i) => { f.visible = stinkK > .3 && meat.visible; const a = t * (5 + i) + i * 2; f.position.set(meat.position.x + Math.cos(a) * .45, meat.position.y + .35 + .15 * Math.sin(a * 1.7), meat.position.z + Math.sin(a) * .45); });

  // snow pile: appears with the snow, melts in summer
  const pile = ease(t, tw.also1 - .1, tw.vergr) * (1 - ease(t, tw.sommer, tw.schmilzt1 + .5));
  snowPile.visible = pile > .01; snowPile.scale.set(.85 * Math.max(pile, .001), .62 * Math.max(pile, .001), .75 * Math.max(pile, .001));
  const pud = win(t, tw.sommer + .2, tw.also2 + .6, .4); puddle.visible = pud > .01; puddle.scale.setScalar(Math.max(pud, .001) * .9);

  // ice cellar
  const dig = ease(t, tw.grab, tw.erde + .6);
  growTo(digFill, lerp(-.22, PIT.y, dig)); digGrass.visible = dig < .02; pitSnow.visible = dig < .02 && snow > .01;
  const melt1 = 1 - .25 * ease(t, tw.warme, tw.also3);
  pitIce.forEach((m, i) => { const k = pop(t, tw.eis - .1 + i * .08, .3); m.visible = k > .01 && t < tw.also3 + .4; m.scale.set(Math.max(k, .001), Math.max(k, .001) * (Math.floor(i / 4) === 2 ? melt1 : 1), Math.max(k, .001)); });
  const lidOn = ease(t, tw.das - .1, tw.das + .4), lidOpen = ease(t, tw.aber2 + .3, tw.runter - .1);
  lid.visible = lidOn > .01 && t < tw.also3 + .4; lid.position.y = .02 + (1 - lidOn) * 2; lid.rotation.z = lidOpen * 1.9;
  pitLadder.visible = t > tw.aber2 + .3 && t < tw.also3 + .4; pitLadder.scale.y = Math.max(ease(t, tw.aber2 + .3, tw.aber2 + .7), .001);
  const wk = win(t, tw.warme - .1, tw.also3 + .2, .3);
  warm.forEach((w, i) => { w.visible = wk > .02; const ph = (t * 1.2 + i * .25) % 1; w.position.set(PIT.x0 + .45 + i * .55, 1.3 - ph * 1.6, 1.6); w.scale.setScalar(wk); w.material.opacity = .9 * Math.sin(ph * Math.PI) * wk; });
  setLabel(lblAug, win(t, tw.august - .1, tw.aber2 + .3, .25), 3.4, .9, 1.6);

  // wooden ice box
  const boxK = t < tw.gluck ? 1 : 1 - ramp(t, tw.gluck - .05, tw.gluck + .1);
  woodBox.children.forEach((m, i) => { const k = pop(t, tw.kiste - .1 + i * .06, .3) * boxK; m.visible = k > .01; m.scale.setScalar(Math.max(k, .001)); });
  (woodBox.userData.straw || []).forEach((s, i) => { const k = pop(t, tw.stroh - .1 + i * .05, .3) * boxK; s.visible = k > .01; });
  const melt2 = 1 - .7 * ease(t, tw.schmilzt2 - .2, tw.schlepp) + .7 * (t > tw.dann - .2 ? 1 : 0) * ease(t, tw.dann - .2, tw.dann + .1);
  const bi = pop(t, tw.block - .1, .35) * boxK; boxIce.visible = bi > .01 && t < tw.also4 + .3;
  boxIce.scale.set(Math.max(bi, .001), Math.max(bi * melt2, .001), Math.max(bi, .001)); boxIce.position.set((BX.x0 + BX.x1) / 2, 1.33 + .19 * melt2, -.05);
  const bp = win(t, tw.schmilzt2, tw.dann + .5, .4); boxPuddle.visible = bp > .01; boxPuddle.scale.setScalar(Math.max(bp, .001) * .8);
  carryIce.visible = !!st.carry; if (st.carry) { const a = handPos(0), b = handPos(1); carryIce.position.copy(a.add(b).multiplyScalar(.5)).add(V(0, .12, 0)); carryIce.rotation.y = cave.rotation.y; }

  // sweat close-up
  const sw = win(t, tw.dann - .1, tw.also4 + .1, .25);
  cave.updateMatrixWorld(true); const headW = cave.userData.head.getWorldPosition(new THREE.Vector3());
  drops.forEach((d, i) => { d.visible = sw > .02 && t < tw.kalt; const ph = (t * .8 + i * .2) % 1; d.position.set(headW.x - .14 + i * .07, headW.y + .3 - ph * .25, headW.z + .2); });
  const vk = win(t, tw.verd - .2, tw.also4 + .1, .25);
  vapour.forEach((v, i) => { v.visible = vk > .02; const ph = (t * .7 + i * .125) % 1; v.position.set(headW.x - .25 + (i % 4) * .17, headW.y + .4 + ph * .6, headW.z + .1); v.scale.setScalar(.5 + ph); v.material.opacity = .55 * (1 - ph) * vk; });
  setLabel(lblBrr, win(t, tw.kalt, tw.also4 + .1, .2), headW.x + .55, headW.y + .45, headW.z + .1);

  // refrigerant loop
  const flowOn = t > tw.rohr - .2;
  const ev = ease(t, tw.rohr - .3, tw.rohr + .5); evap.visible = ev > .01 && t < tw.gluck; evap.geometry.setDrawRange(0, Math.floor(evap.userData.n * ev / 3) * 3);
  const cd = ease(t, tw.hinten, tw.pumpe + .3); cond.visible = cd > .01 && t < tw.gluck; cond.geometry.setDrawRange(0, Math.floor(cond.userData.n * cd / 3) * 3);
  const pumping = t > tw.aber4 && t < tw.also5 + .6, motorOn = t > tw.motor - .2;
  const flowSpeed = pumping ? (.3 + .3 * Math.abs(Math.sin((t - tw.aber4) * 5.5))) : 1.0;
  if (flowOn) { flowTex.offset.x = -t * flowSpeed * 2; flowTexR.offset.x = -t * flowSpeed * 2; }
  const pk = pop(t, tw.pumpe - .1, .35); pump.visible = pk > .01 && t < tw.gluck; pump.scale.setScalar(Math.max(pk, .001));
  pump.userData.lev.rotation.z = pumping ? -.35 * Math.sin((t - tw.aber4) * 11) : motorOn ? -.3 * Math.sin(t * 18) : 0;
  pump.userData.motor.visible = motorOn; pump.userData.motor.scale.setScalar(pop(t, tw.motor - .2, .3));
  const hk = win(t, tw.saugt - .1, tw.also5, .3);
  heatDots.forEach((d, i) => { d.visible = hk > .02 && t < tw.hinten + .6; const ph = (t * .7 + i * .1) % 1;
    d.position.set(lerp(meat.position.x, BX.x0 + .3, ph), lerp(meat.position.y + .2, 1.1, ph) + Math.sin(ph * 9 + i) * .05, lerp(meat.position.z, -.3, ph)); d.scale.setScalar(hk * (1 - ph * .5)); });
  const wv = win(t, tw.warme2 - .2, tw.also5 + .4, .3);
  heatWaves.forEach((w, i) => { w.visible = wv > .02; const ph = (t * 1.1 + i * .25) % 1; w.position.set(BX.x0 - .25, .5 + i * .3 + ph * .5, BX.z0 + .3 + (i % 2) * .5); w.rotation.y = Math.PI / 2; w.scale.setScalar(wv); w.material.opacity = .85 * Math.sin(ph * Math.PI) * wv; });

  // nuclear plant -> wind turbine
  const akwUp = ease(t, tw.akw - .3, tw.akw + .5), akwDown = ease(t, tw.schalt, tw.schalt + .9);
  towers.forEach((g, j) => { const k = akwUp * (1 - akwDown); g.visible = k > .01; g.scale.set(1.35, 1.35 * Math.max(k, .001), 1.35);
    const steamOn = (t > tw.motor - .3 ? 1 : 0) * (1 - ease(t, tw.schalt - .1, tw.schalt + .3));
    g.userData.steam.forEach((s, i) => { const ph = (t * .35 + i / 9) % 1; s.visible = steamOn > .02; s.position.set(Math.sin(i * 2.3) * .8, 9 + ph * 5, Math.cos(i * 1.7) * .8); s.scale.setScalar((1.3 + ph * 2) * steamOn); s.material.opacity = .85 * (1 - ph); }); });
  poles.forEach(p => p.visible = akwUp > .5 && t < tw.windrad); cableA.visible = akwUp > .9 && t < tw.schalt + .5;
  const wr = ease(t, tw.windrad - 1.0, tw.windrad + .1); windrad.visible = wr > .01; windrad.scale.set(1, Math.max(wr, .001), 1);
  windrad.userData.rot.rotation.z = -t * 2.2; poles2.forEach(p => p.visible = wr > .9); cableB.visible = wr > .95;
  setLabel(lblAus, win(t, tw.schalt + .1, tw.windrad + .3, .25), -15, 11.5, -19);
  const fk = win(t, tw.dtl - .1, tw.windrad, .2); flag.visible = fk > .01; flag.position.set(-15, 14.5, -19); flag.scale.set(5 * fk, 3 * fk, 1);

  // finale: the box turns into a fridge
  const pf = ramp(t, tw.gluck - .1, tw.gluck + .5); puff.visible = pf > 0 && pf < 1; puff.scale.setScalar(.5 + pf * 1.6); puff.material.opacity = .9 * (1 - pf);
  const fr = pop(t, tw.gluck + .05, .3);
  fridge.children.forEach(m => { m.visible = fr > .01; m.scale.setScalar(Math.max(fr, .001)); });
  fDoor.visible = fr > .01; fDoor.scale.setScalar(Math.max(fr, .001));
  const open = ease(t, tw.kuehl - .2, tw.kuehl + .5); fDoor.rotation.y = -open * 1.9;
  fridgeLight.visible = fr > .5; fLight.intensity = open * 3;
  beer.visible = fr > .5; setLabel(lblMinus, win(t, tw.kuehl + .4, END + 1, .25), -2.6, 2.45, .6);

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
window.END = END; window.TW = tw;
window.renderAt = (t, q = .9) => {
  update(t); renderer.render(scene, camera);
  og.drawImage(renderer.domElement, 0, 0); drawCaption(t);
  return out.toDataURL('image/jpeg', q);
};
window.__done = true;
