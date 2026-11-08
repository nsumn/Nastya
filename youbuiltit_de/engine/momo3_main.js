// ===================== 16 Momo Teil 3 — 3D, ~24 s: Momo is sad, the island is empty and boring; comment what to build + which kitten you want =====================
// Build: cat lib.js momo2_main.js > momo2.js (./render_video.sh momo2 15_momo_tag2). Data (local only): ../15_momo_tag2/cats.json + photos/. Captions: caption layer.
const GOAL = 10000, FOLLOWERS = 0;
await document.fonts.load('700 96px Fredoka');
const WORDS = await (await fetch('../16_momo_teil3/words.json')).json();
const CATS = await (await fetch('../15_momo_tag2/cats.json')).json();
const PHOTO = await Promise.all(CATS.map(c => new Promise(res => { if (!c.photo) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = '../15_momo_tag2/' + c.photo; })));
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
const fmt = n => Math.round(n).toLocaleString('de-DE');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tw = { traurig: T('traurig'), nichts: T('nichts'), haus: T('Haus'), futter: T('Futter'), kratz: T('Kratzbaum'), lang: T('langweilen'),
  ideen: T('Ideen'), khaus: T('Katzenhaus'), kiosk: T('Kiosk'), kratz2: T('Kratzbaum', 2), was: T('Was'), schreib: T('Schreib'), kaetz: T('Kätzchen', 2), folg: T('Folg') };
const SFX = { end: END, music_gain: .14, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
SFX.beds.push([0, tw.ideen, 'wind', .5]);
e(.1, 'meow_sad', .9); e(tw.nichts, 'whoosh', .6); for (const k of ['haus', 'futter', 'kratz']) { e(tw[k], 'pop', .6); e(tw[k] + .25, 'buzz', .45); }
e(tw.lang, 'meow_sad', .6); e(tw.lang + .6, 'tick', .4);
e(tw.ideen, 'sparkle', .7); for (const k of ['khaus', 'kiosk', 'kratz2']) e(tw[k] - .05, 'pop', .9);
e(tw.was - .1, 'whoosh', .6); e(tw.schreib, 'pop', .8); e(tw.kaetz, 'meow_happy', .7); e(tw.folg - .05, 'pop', 1); e(tw.folg + .5, 'ding', .8);
window.SFX = SFX;
// ---------- kitten rig (from katze_main.js) ----------
// ---------- Mimi the kitten ----------
const furO = M('#f0a050', { roughness: .85 }), furW = M('#fff6ea', { roughness: .85 }), pinkM = M('#ff9fb4', { roughness: .5 }), eyeM = M('#141414', { roughness: .15 }), shineM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const scarfM = M('#e8344e', { roughness: .8 });
function kitten(o = {}) {
  const furO = M(o.c || '#f0a050', { roughness: .85 }), furW = M(o.c2 || '#fff6ea', { roughness: .85 });
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 16), furO); torso.scale.set(1, .9, 1.25); torso.position.set(0, .2, 0); torso.castShadow = true; body.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), furW); belly.position.set(0, .17, .1); belly.scale.set(1, .9, 1); body.add(belly);
  const head = new THREE.Group(); head.position.set(0, .42, .14); body.add(head);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 18), furO); hd.scale.set(1.1, .95, 1); hd.castShadow = true; head.add(hd);
  const muz = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), furW); muz.position.set(0, -.06, .16); muz.scale.set(1.3, .8, .8); head.add(muz);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.025, 10, 8), pinkM); nose.position.set(0, -.02, .23); nose.scale.set(1.3, .8, 1); head.add(nose);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * .085, .03, .17); head.add(e); eyes.push(e);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.058, 16, 12), eyeM); ball.scale.set(.9, 1.1, .6); e.add(ball);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), shineM); sh.position.set(.018 * s, .025, .03); e.add(sh);
    const sh2 = new THREE.Mesh(new THREE.SphereGeometry(.009, 6, 6), shineM); sh2.position.set(-.012 * s, -.018, .033); e.add(sh2);
    const ck = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff9fb0', transparent: true, opacity: .55 })); ck.position.set(s * .13, -.06, .14); ck.scale.set(1.3, .7, .3); head.add(ck);
  }
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * .13, .15, 0); head.add(ear); ears.push(ear);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(.075, .16, 4), furO); outer.position.y = .07; outer.rotation.y = Math.PI / 4; ear.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.045, .11, 4), pinkM); inner.position.set(0, .06, .025); inner.rotation.y = Math.PI / 4; ear.add(inner);
    ear.rotation.z = -s * .25;
  }
  const whisk = new THREE.LineBasicMaterial({ color: '#5a4030' });
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { const g = new THREE.BufferGeometry().setFromPoints([V(s * .08, -.05 + k * .015, .2), V(s * .26, -.03 + k * .045, .17)]); head.add(new THREE.Line(g, whisk)); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.025, .007, 6, 12, Math.PI), M('#5a3020')); mouth.position.set(0, -.075, .225); mouth.rotation.z = Math.PI; head.add(mouth);
  const legs = [];
  for (const [x, z] of [[-.1, .14], [.1, .14], [-.1, -.14], [.1, -.14]]) { const l = new THREE.Group(); l.position.set(x, .12, z); body.add(l); legs.push(l);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .07, 4, 8), furO); m.position.y = -.06; l.add(m);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), furW); p.position.set(0, -.11, .015); p.scale.set(1, .7, 1.2); l.add(p); }
  const tail = []; let par = body;
  for (let i = 0; i < 7; i++) { const g = new THREE.Group(); g.position.set(0, i === 0 ? .22 : .07, i === 0 ? -.24 : 0); par.add(g);
    const m = new THREE.Mesh(new THREE.SphereGeometry(.045 - i * .002, 10, 8), i === 6 ? furW : furO); m.scale.y = 1.4; m.position.y = .035; g.add(m); tail.push(g); par = g; }
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(.15, .045, 8, 20), scarfM); scarf.rotation.x = Math.PI / 2 - .25; scarf.position.set(0, .33, .1); body.add(scarf);
  const tailEnd = new THREE.Mesh(new THREE.BoxGeometry(.07, .16, .03), scarfM); tailEnd.position.set(.09, .24, .2); tailEnd.rotation.z = .25; body.add(tailEnd);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.14, .02, 8, 20), M('#ffc933', { metalness: .8, roughness: .25 })); collar.rotation.x = Math.PI / 2 - .25; collar.position.set(0, .34, .1); body.add(collar); collar.visible = false;
  root.userData = { body, head, eyes, ears, legs, tail, mouth, scarf, collar, torso };
  return root;
}
const KS = 1.5;
// state: {x,z,face, shiver, sad, happy, hop, blink, curl, look}
function poseKitten(k, t, s) {
  const u = k.userData;
  k.position.set(s.x, s.y || 0, s.z); k.rotation.y = s.face || 0; k.scale.setScalar(KS);
  const breath = Math.sin(t * 3.2) * .02;
  const shv = (s.shiver || 0) * Math.sin(t * 55) * .018;
  const hop = s.hop || 0, sq = 1 - .18 * (s.squash || 0);
  u.body.position.set(shv, Math.max(0, hop), 0); u.body.scale.set(1 + (1 - sq) * .6, sq * (1 + breath), 1 + (1 - sq) * .6);
  u.head.rotation.set((s.sad || 0) * .35 - (s.happy || 0) * .15 + (s.lookUp || 0) * -.5, (s.lookX || 0), Math.sin(t * 1.3) * .08 * (1 - (s.curl || 0)) + (s.tilt || 0));
  const blink = (Math.sin(t * 1.7) > .985 || s.closed) ? .12 : 1;
  u.eyes.forEach(e => { e.scale.y = blink * (1 + (s.happy || 0) * .1); });
  u.ears.forEach((e, i) => { const sg = i ? 1 : -1; e.rotation.z = -sg * (.25 + (s.sad || 0) * .9); e.rotation.x = (s.sad || 0) * .3 + (Math.sin(t * 4 + i) > .97 ? .3 : 0); });
  u.tail.forEach((g, i) => { g.rotation.x = i === 0 ? -.9 + (s.curl || 0) * 1.2 : (.25 + (s.curl || 0) * .25); g.rotation.z = Math.sin(t * (2.2 + (s.happy || 0) * 4) - i * .6) * (.18 + (s.happy || 0) * .2); });
  u.legs.forEach((l, i) => { l.rotation.x = (s.walk ? Math.sin(t * 14 + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * .5 : 0) - (s.curl || 0) * (i < 2 ? 1.2 : -1.2); });
  u.body.rotation.x = (s.curl || 0) * .1;
  u.mouth.scale.set(1, 1 + (s.meow || 0) * 1.5, 1);
}
// ---------- 3D labels ----------
function label(text, w = 3, fill = '#ffd21f') {
  const [c, g] = cv(768, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, 384, 132); g.fillStyle = fill; g.fillText(text, 384, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w, w / 3, 1); s.renderOrder = 10; s.userData.w = w; scene.add(s); return s;
}
function setLabel(s, k, x, y, z) { s.visible = k > .01; s.position.set(x, y, z); s.scale.set(s.userData.w * k, s.userData.w / 3 * k, 1); }

// ---------- ocean, islands ----------
const SEA_N = 90, SEA_S = 220;
const seaGeo = new THREE.PlaneGeometry(SEA_S, SEA_S, SEA_N, SEA_N); seaGeo.rotateX(-Math.PI / 2);
const seaBase = seaGeo.attributes.position.array.slice();
const seaMat = new THREE.MeshStandardMaterial({ color: '#2f9fd8', roughness: .35, metalness: .1, flatShading: true });
const sea = new THREE.Mesh(seaGeo, seaMat); sea.receiveShadow = true; scene.add(sea);
function waves(t, amp) {
  const p = seaGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { const x = seaBase[i], z = seaBase[i + 2];
    p[i + 1] = amp * (Math.sin(x * .35 + t * 1.6) * .5 + Math.sin(z * .42 - t * 1.2) * .4 + Math.sin((x + z) * .9 + t * 2.4) * .18) - .05; }
  seaGeo.attributes.position.needsUpdate = true; seaGeo.computeVertexNormals();
}
const sandMat = M('#f3d9a4', { roughness: 1, flatShading: true }), grassMatI = M('#69c25a', { roughness: 1, flatShading: true });
function island(x, z, r, h = .9) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.18, h, 28, 1), sandMat); sand.position.y = h / 2 - .35; sand.receiveShadow = true; g.add(sand);
  const gr = new THREE.Mesh(new THREE.CylinderGeometry(r * .78, r * .86, .25, 28), grassMatI); gr.position.y = h - .25; gr.receiveShadow = true; g.add(gr);
  g.userData.top = h - .12; return g;
}
const leafMat = M('#3fae4a', { roughness: .9, flatShading: true, side: THREE.DoubleSide }), trunkMat = M('#a8794a', { roughness: 1, flatShading: true });
function palm(parent, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  let py = 0; for (let i = 0; i < 7; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(.13 - i * .008, .16 - i * .008, .5, 7), trunkMat); seg.position.set(i * i * .012, py + .25, 0); seg.rotation.z = -i * .04; seg.castShadow = true; g.add(seg); py += .48; }
  const crown = new THREE.Group(); crown.position.set(.6, py, 0); g.add(crown);
  for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .45, 4, 1), leafMat); const p = lf.geometry.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, p.getY(k) - Math.pow(p.getX(k) + .9, 2) * .18); lf.geometry.translate(.9, 0, 0);
    lf.rotation.set(-.2, i / 7 * Math.PI * 2, -.25); lf.castShadow = true; crown.add(lf); }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), M('#6b4a2a')); c.position.set(Math.cos(i * 2) * .18, -.12, Math.sin(i * 2) * .18); crown.add(c); }
  g.userData.crown = crown; return g;
}
// big island far away, full of kittens + lights
const BIG = V(0, 0, -46);
const big = island(BIG.x, BIG.z, 16, 1.4);
const palmsBig = []; seed = 4; for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + rr(-.2, .2), d = rr(8, 13.5); palmsBig.push(palm(big, Math.cos(a) * d, big.userData.top, Math.sin(a) * d, rr(1.2, 1.7))); }
const hutCols = ['#ff9fb4', '#ffd36b', '#9fd7ff', '#c7a6ff', '#9fe0b0'];
for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + .3, d = rr(3, 9); const h = new THREE.Group(); h.position.set(Math.cos(a) * d, big.userData.top, Math.sin(a) * d); h.rotation.y = -a; big.add(h);
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), M(hutCols[i % 5])); b.position.y = .6; b.castShadow = true; h.add(b);
  const r = new THREE.Mesh(new THREE.ConeGeometry(1.35, .9, 4), M('#d9a35a')); r.position.y = 1.65; r.rotation.y = Math.PI / 4; h.add(r); }
const bulbs = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshBasicMaterial({ color: ['#ffe066', '#ff8fb1', '#8fe3ff'][i % 3] })); b.position.set(Math.cos(a) * 11, big.userData.top + 2.4 + Math.sin(i * 1.3) * .2, Math.sin(a) * 11); big.add(b); bulbs.push(b); }
const kitCols = [['#f3a35b', '#fff4e6'], ['#9aa3ad', '#f1f3f5'], ['#3d3a3c', '#e9e2dd'], ['#f6efe6', '#ffffff'], ['#c98a52', '#f7e3cc'], ['#e7c79c', '#fff6ea'], ['#6f6a72', '#e8e4ea'], ['#f4c06a', '#fff6e0']];
const crowd = []; seed = 8;
for (let i = 0; i < 34; i++) { const [c0, c1] = kitCols[i % kitCols.length]; const k = kitten({ c: c0, c2: c1 }); const a = rr(0, Math.PI * 2), d = rr(1.5, 11); k.userData.home = V(BIG.x + Math.cos(a) * d, big.userData.top, BIG.z + Math.sin(a) * d); k.userData.ph = rr(0, 6); crowd.push(k); }
const fireworks = []; for (let i = 0; i < 4; i++) { const f = new THREE.Group(); f.position.set(BIG.x + rr(-8, 8), 14 + rr(0, 4), BIG.z + rr(-4, 4)); scene.add(f);
  for (let j = 0; j < 18; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.18, 6, 4), new THREE.MeshBasicMaterial({ color: ['#ffe066', '#ff6f91', '#7fe3ff', '#b28cff'][i] })); s.userData.dir = V(Math.cos(j * .35) * Math.sin(j), Math.sin(j * .7), Math.cos(j) * .6).normalize(); f.add(s); } fireworks.push(f); }

// Momo's tiny island
const tiny = island(0, 0, 3.0, .8);
const myPalm = palm(tiny, -1.3, tiny.userData.top, -.9, 1.05);
// basket (Momo drifts in it)
const basketG = new THREE.Group(); scene.add(basketG);
{ const bm = M('#b98245', { roughness: .95 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(.75, .6, .4, 20, 1, true), bm); b.material.side = THREE.DoubleSide; b.position.y = .2; basketG.add(b);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.75, .08, 8, 22), bm); rim.rotation.x = Math.PI / 2; rim.position.y = .4; basketG.add(rim);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .06, 20), M('#8fc8ff')); bot.position.y = .05; basketG.add(bot); }
const momo = kitten({ c: '#a9a3b3', c2: '#f5f2f8' });
// builds: hut, campfire, lighthouse, bridge
const driftMat = M('#b59a7a', { roughness: 1, flatShading: true });
const hut = new THREE.Group(); hut.position.set(1.2, tiny.userData.top, -1.1); tiny.add(hut);
for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 1.4, 6), driftMat); l.position.set(-.6 + i * .2, .7, -.5); l.castShadow = true; hut.add(l); }
for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 1.1, 6), driftMat); l.position.set(sx * .62, .55, -.35 + i * .25); hut.add(l); }
{ const r = new THREE.Mesh(new THREE.ConeGeometry(1.05, .7, 4), M('#d6b36a', { flatShading: true })); r.position.y = 1.7; r.rotation.y = Math.PI / 4; r.castShadow = true; hut.add(r); }
const fire = new THREE.Group(); fire.position.set(.9, tiny.userData.top, .9); tiny.add(fire);
for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .6, 5), driftMat); l.rotation.set(Math.PI / 2 - .5, i / 5 * Math.PI * 2, 0); l.position.y = .12; fire.add(l); }
const flames = []; for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.12 + (i % 2) * .05, .5, 7), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffb020' : '#ff5a1a', transparent: true, opacity: .95 })); f.position.set(Math.cos(i * 1.6) * .08, .35, Math.sin(i * 1.6) * .08); fire.add(f); flames.push(f); }
const fireLight = new THREE.PointLight('#ff9a40', 0, 9, 1.5); fireLight.position.set(.9, tiny.userData.top + .8, .9); scene.add(fireLight);
const light = new THREE.Group(); light.position.set(-2.1, tiny.userData.top, .6); tiny.add(light);
for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.42 - i * .035, .45 - i * .035, .55, 14), M(i % 2 ? '#ffffff' : '#e8414d')); s.position.y = .28 + i * .55; s.castShadow = true; light.add(s); }
{ const top = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .45, 12), new THREE.MeshStandardMaterial({ color: '#fff4b0', emissive: '#ffd84a', emissiveIntensity: 1.2 })); top.position.y = 3.6; light.add(top);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.45, .45, 12), M('#e8414d')); cap.position.y = 4.05; light.add(cap); }
const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }));
beam.geometry.translate(0, -7, 0); beam.geometry.rotateZ(Math.PI / 2); const beamPivot = new THREE.Group(); beamPivot.position.y = 3.6; beamPivot.add(beam); light.add(beamPivot);
const planks = []; const bridgeG = new THREE.Group(); scene.add(bridgeG);
for (let i = 0; i < 46; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, .1, .6), driftMat); p.position.set(0, .45 + Math.sin(i / 45 * Math.PI) * .9, -3.2 - i * .7); p.castShadow = true; bridgeG.add(p); planks.push(p); }
// whale (mystery in the water)
const whale = new THREE.Group(); scene.add(whale);
{ const wm = M('#3d5a8a', { roughness: .6 }); const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 12), wm); body.scale.set(2.4, 1, 1.2); whale.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 10), M('#c9dcf0')); belly.scale.set(2.2, .7, 1.05); belly.position.y = -.35; whale.add(belly);
  for (const sz of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), M('#111')); eye.position.set(2.6, .2, sz * 1.0); whale.add(eye); const sh = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 6), new THREE.MeshBasicMaterial({ color: '#fff' })); sh.position.set(2.72, .27, sz * 1.08); whale.add(sh); }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.9, 1.6, 4), wm); tail.rotation.z = Math.PI / 2; tail.position.set(-4.2, .3, 0); tail.scale.z = .3; whale.add(tail); whale.userData.tail = tail; }
const spout = []; for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshStandardMaterial({ color: '#dff3ff', transparent: true, opacity: .8 })); scene.add(s); spout.push(s); }
// rain + lightning
const rainN = 900, rainG = new THREE.BufferGeometry(), rainP = new Float32Array(rainN * 6), rainSeed = [];
for (let i = 0; i < rainN; i++) rainSeed.push([rr(-25, 25), rr(0, 22), rr(-35, 10)]);
rainG.setAttribute('position', new THREE.BufferAttribute(rainP, 3)); const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: .55 })); scene.add(rain);
// sparkle hearts for the happy ending of the bridge
const hearts = []; const hs = (() => { const s = new THREE.Shape(); s.moveTo(0, -.1); s.bezierCurveTo(-.16, .02, -.08, .14, 0, .06); s.bezierCurveTo(.08, .14, .16, .02, 0, -.1); return s; })();
for (let i = 0; i < 10; i++) { const h = new THREE.Mesh(new THREE.ShapeGeometry(hs), new THREE.MeshBasicMaterial({ color: '#ff4f7b', side: THREE.DoubleSide, transparent: true })); h.scale.setScalar(2.4); scene.add(h); hearts.push(h); }

// ---------- sky / light ----------
const hemi = scene.children.find(o => o.isHemisphereLight);
const skyTex = (stops, stars = 0, moon = false) => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < stars; i++) { g.fillStyle = `rgba(255,255,255,${rr(.3, 1)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 600), rr(.5, 1.7), 0, 7); g.fill(); }
  if (moon) { g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(420, 150, 30, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const SKY = { dusk: skyTex([[0, '#5b6fd6'], [.5, '#f08fb0'], [.8, '#ffcf8a'], [1, '#ffe3b0']]), storm: skyTex([[0, '#1d2333'], [.6, '#3a4256'], [1, '#55607a']]),
  day: skyTex([[0, '#6fb8ff'], [.6, '#bfe6ff'], [1, '#e8f7ff']]), night: skyTex([[0, '#070b22'], [.6, '#18245a'], [1, '#2b3c7a']], 320, true) };
scene.fog = new THREE.Fog('#bfe6ff', 40, 130);
sun.position.set(-20, 30, 20); sun.target.position.set(0, 0, -10); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 }); sun.shadow.camera.updateProjectionMatrix();

// ---------- labels ----------
const lblMomo = label('Momo', 2.2, '#ffffff'), lblBig = label('4.600', 7, '#ffd21f'), lblNo = [label('✗', 1.4, '#ff5a5a'), label('✗', 1.4, '#ff5a5a'), label('✗', 1.4, '#ff5a5a')], lblGoal = label('5.000', 3.2, '#ffd21f'), lblFish = label('🐟', 1.6, '#ffffff'), lblQ = label('?', 2.2, '#ffffff');
lblBig.material.map.dispose(); { const l2 = label(fmt(FOLLOWERS), 7, '#ffd21f'); lblBig.material = l2.material; scene.remove(l2); }
{ const l2 = label(fmt(GOAL), 3.2, '#ffd21f'); lblGoal.material = l2.material; scene.remove(l2); }


// new kittens on Momo's island: DU (follow), three from comments, one from a photo
// ---------- new kittens on a growing island ----------
const LOOKS = { tabby: ['#a48a6a', '#efe3cf'], tabwhite: ['#9c8566', '#ffffff'], silver: ['#c7c9cf', '#f4f4f6'], ginger: ['#f19a4c', '#fff1e0'], gingerwhite: ['#f19a4c', '#ffffff'],
  golden: ['#e8c99a', '#fbf1e2'], black: ['#2f2a33', '#4a4350'], tuxedo: ['#2f2a33', '#ffffff'], grey: ['#8e97a6', '#b9c0cc'], white: ['#fbfaf8', '#ffffff'], calico: ['#f3e2c8', '#ffffff'],
  tortie: ['#3a2c2a', '#7a4a2a'], siamese: ['#f3e6d2', '#5a4334'], greywhite: ['#8e97a6', '#ffffff'], cow: ['#ffffff', '#2f2a33'], pink: ['#ffb3c0', '#fff0f2'], blue: ['#9cc8ff', '#e6f2ff'] };
const TOP = tiny.userData.top;
const NK = Math.min(70, CATS.length), kits = [];
for (let i = 0; i < NK; i++) { const [c, c2] = LOOKS[CATS[i].look] || LOOKS.tabby; const k = kitten({ c, c2 }); const ring = i < 14 ? 2.2 : i < 34 ? 3.6 : 5.0, per = i < 14 ? 14 : i < 34 ? 20 : 36, j = i < 14 ? i : i < 34 ? i - 14 : i - 34;
  const a = j / per * Math.PI * 2 + ring; k.userData.p = V(Math.cos(a) * ring, 0, Math.sin(a) * ring + .4); k.userData.ph = i * .37; kits.push(k); }
// extra kittens so the island is really full (random coats from the comment cats)
for (let i = 0; i < 80; i++) { const cat0 = CATS[(i * 7) % CATS.length]; const [c, c2] = LOOKS[cat0.look] || LOOKS.tabby; const k = kitten({ c, c2 });
  const ring = 1.4 + (i % 5) * 1.25 + (i % 2) * .5, a = i * 2.39996; k.userData.p = V(Math.cos(a) * ring, 0, Math.sin(a) * ring * .9 + .6); k.userData.ph = i * .53; kits.push(k); }
const dog = kitten({ c: '#c98a52', c2: '#f7e3cc' }); dog.userData.ears.forEach(e_ => { e_.children.forEach(m => { m.scale.set(1.3, 1.6, 1.3); }); });
const lblNr1 = label('Kätzchen Nr. 1', 2.4, '#ffd21f'), lblDog = label('@marlondoner', 2.2, '#ffffff'), lblBesch = label('Beschützer-Hund', 2.4, '#5ff0ff');
const helmet = new THREE.Mesh(new THREE.SphereGeometry(.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#3a6fd8', { roughness: .4 })); dog.userData.head.add(helmet); helmet.position.set(0, .12, 0);
[hut, fire, light, bridgeG, whale].forEach(o => o.visible = false); fireLight.intensity = 0; spout.forEach(s => s.visible = false); hearts.forEach(h => h.visible = false);
[lblBig, lblGoal, lblFish, lblQ, ...lblNo].forEach(l => l.visible = false); fireworks.forEach(f => f.visible = false);
crowd.forEach((k, i) => { const h = k.userData.home; poseKitten(k, 0, { x: h.x, z: h.z, y: h.y, happy: 1 }); k.scale.setScalar(1.7); });
// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 400);
const KEYS = [
  [0, V(1.5, TOP + 1.45, 3.7), V(.6, TOP + .9, 1.0)], [tw.nichts - .1, V(1.55, TOP + 1.5, 3.9), V(.6, TOP + .9, 1.0)],
  [tw.lang - .2, V(8, 8.5, 15), V(0, TOP, 0)], [tw.ideen, V(7.5, 8, 14), V(0, TOP, 0)],
  [tw.kratz2 + .4, V(0, 9, 13), V(0, TOP + 1.5, -4)], [tw.was, V(1, 8.6, 14), V(0, TOP + .6, -1)], [END, V(7, 7, 13), V(0, TOP + .6, 0)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1]; const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k)); }
// ghost structures for the ideas from the comments
const ghostMat = new THREE.MeshStandardMaterial({ color: '#7fd8ff', transparent: true, opacity: .7, emissive: '#3aa8ff', emissiveIntensity: .6 });
const ghosts = [];
{ const gH = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.4), ghostMat); b.position.y = .6; gH.add(b); const r = new THREE.Mesh(new THREE.ConeGeometry(1.35, .9, 4), ghostMat); r.position.y = 1.65; r.rotation.y = Math.PI / 4; gH.add(r); gH.position.set(-3.6, TOP, -5.4); scene.add(gH); ghosts.push(gH);
  const gK = new THREE.Group(); const k1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.0), ghostMat); k1.position.y = .5; gK.add(k1); const aw = new THREE.Mesh(new THREE.BoxGeometry(1.7, .08, .7), ghostMat); aw.position.set(0, 1.25, .45); aw.rotation.x = .3; gK.add(aw); gK.position.set(3.6, TOP, -5.2); scene.add(gK); ghosts.push(gK);
  const gT = new THREE.Group(); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.1), ghostMat); p.position.y = .55 + i * 1.1; gT.add(p); const pl = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .12, 16), ghostMat); pl.position.y = 1.1 + i * 1.1; gT.add(pl); } gT.position.set(0, TOP, -6.0); scene.add(gT); ghosts.push(gT); }
[lblNr1, lblDog, lblBesch].forEach(l => { l.visible = false; scene.remove(l); });
ghostMat.color.set('#ffffff'); ghostMat.emissive.set('#9fd8ff'); ghostMat.emissiveIntensity = .5;
ghosts.forEach(gh => gh.children.slice().forEach(m => { const ed = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 20), new THREE.LineBasicMaterial({ color: '#1e5fd0' })); ed.position.copy(m.position); ed.rotation.copy(m.rotation); gh.add(ed); }));
const GHOST_AT = () => [tw.khaus, tw.kiosk, tw.kratz2];
function update(t) {
  const gloom = 1 - ease(t, tw.ideen - .3, tw.ideen + .3);
  scene.background = SKY.day; hemi.intensity = lerp(1.1, .7, gloom); sun.intensity = lerp(2.4, 1.1, gloom); renderer.toneMappingExposure = lerp(1.05, .92, gloom);
  scene.fog.color.set('#bfe6ff'); seaMat.color.set('#2f9fd8'); rain.visible = false; waves(t, .25);
  tiny.scale.set(2.3, 1, 2.3);
  bulbs.forEach((b, i) => b.material.color.setHSL(((i * .13 + t * .3) % 1), .9, .65)); myPalm.userData.crown.rotation.z = Math.sin(t * 1.3) * .06;
  basketG.position.set(.6, TOP, 1.0); basketG.rotation.set(0, 0, 0);
  const happy = ease(t, tw.was - .2, tw.was + .3);
  poseKitten(momo, t, { x: .6, z: 1.0, y: TOP + .08, face: .3, sad: 1 - happy, happy, tear: 1 - happy, lookUp: happy * .3, meow: win(t, .1, .9, .1), hop: t > tw.folg ? Math.sin(((t * 1.4) % 1) * Math.PI) * .2 : 0 }); momo.scale.setScalar(1.5);
  lblMomo.visible = false;
  kits.forEach((k, i) => { const p = k.userData.p; k.visible = t > tw.nichts - .1 && Math.hypot(p.x - .6, p.z - 1.0) > 1.1;
    const bored = t < tw.was; poseKitten(k, t + k.userData.ph, { x: p.x, z: p.z, y: TOP, face: Math.atan2(camera.position.x - p.x, camera.position.z - p.z), sad: bored ? .6 : 0, curl: bored && i % 2 ? .9 : 0, closed: bored && i % 3 === 0, happy: bored ? 0 : 1, hop: !bored ? Math.abs(Math.sin(t * 5 + k.userData.ph)) * .12 : 0 }); k.scale.setScalar(1.0); });
  dog.visible = false;
  ghosts.forEach((gh, i) => { const k = pop(t, GHOST_AT()[i] - .1, .4); gh.visible = k > .01; gh.scale.setScalar(Math.max(.001, k) * 1.3); gh.rotation.y = Math.sin(t * .8 + i) * .1; });
  ghostMat.opacity = .6 + .15 * Math.sin(t * 4);
  placeCamera(t);
}
// ---------- 2D overlay ---------- (?nocap=1: captions come from the separate caption layer)
const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d');
function rrect(x, y, w, h, r) { og.beginPath(); og.moveTo(x + r, y); og.arcTo(x + w, y, x + w, y + h, r); og.arcTo(x + w, y + h, x, y + h, r); og.arcTo(x, y + h, x, y, r); og.arcTo(x, y, x + w, y, r); og.closePath(); }
function txt(s, x, y, size, fill = '#fff', stroke = '#000', lw = 14, align = 'center') { og.font = `700 ${size}px Fredoka`; og.textAlign = align; og.textBaseline = 'middle'; og.lineJoin = 'round'; if (lw) { og.lineWidth = lw; og.strokeStyle = stroke; og.strokeText(s, x, y); } og.fillStyle = fill; og.fillText(s, x, y); }
function icon(kind, cx, cy, r) {
  og.save(); og.translate(cx, cy); const col = { follow: '#ff2d55', like: '#ff2d55', comment: '#2f9bff', share: '#ffb020' }[kind];
  og.fillStyle = col; og.beginPath(); og.arc(0, 0, r, 0, 7); og.fill(); og.fillStyle = '#fff'; og.strokeStyle = '#fff'; og.lineWidth = r * .22; og.lineCap = 'round';
  if (kind === 'follow') { og.beginPath(); og.moveTo(-r * .45, 0); og.lineTo(r * .45, 0); og.moveTo(0, -r * .45); og.lineTo(0, r * .45); og.stroke(); }
  if (kind === 'like') { const s = r * .5; og.beginPath(); og.moveTo(0, s * .9); og.bezierCurveTo(-s * 1.6, -s * .2, -s * .7, -s * 1.3, 0, -s * .45); og.bezierCurveTo(s * .7, -s * 1.3, s * 1.6, -s * .2, 0, s * .9); og.fill(); }
  if (kind === 'comment') { rrect(-r * .5, -r * .42, r, r * .7, r * .2); og.fill(); og.beginPath(); og.moveTo(-r * .2, r * .25); og.lineTo(-r * .35, r * .55); og.lineTo(0, r * .25); og.fill(); }
  if (kind === 'share') { og.beginPath(); og.moveTo(-r * .45, r * .35); og.quadraticCurveTo(-r * .3, -r * .2, r * .2, -r * .2); og.stroke(); og.beginPath(); og.moveTo(r * .05, -r * .5); og.lineTo(r * .5, -r * .2); og.lineTo(r * .05, r * .1); og.fill(); }
  og.restore(); }
// glassy dark cards (this account's own look: navy glass + cyan accents)
function card(k, y, kind, title, sub, active, t) {
  if (k <= .01) return; const w = 900, h = 156, x = W / 2 - w / 2 + (1 - k) * 1100;
  og.save(); og.globalAlpha = cl(k * 1.4); og.shadowColor = 'rgba(0,0,0,.45)'; og.shadowBlur = 30; rrect(x, y, w, h, 30); og.fillStyle = active ? 'rgba(18,60,96,.94)' : 'rgba(12,28,52,.86)'; og.fill(); og.shadowColor = 'transparent';
  og.lineWidth = active ? 6 : 3; og.strokeStyle = active ? '#5ff0ff' : 'rgba(140,220,255,.5)'; og.stroke();
  icon(kind, x + 88, y + h / 2, 50); txt(title, x + 168, y + 54, 58, '#ffffff', null, 0, 'left'); txt(sub, x + 168, y + 110, 38, '#9fdcff', null, 0, 'left'); og.restore(); }
function meter(k, val, y) {
  if (k <= .01) return; const x = 100, w = W - 200, h = 56; og.save(); og.globalAlpha = cl(k * 1.3); const yy = y + (1 - k) * 260;
  og.shadowColor = 'rgba(0,0,0,.4)'; og.shadowBlur = 24; rrect(x - 26, yy - 84, w + 52, h + 140, 34); og.fillStyle = 'rgba(12,28,52,.88)'; og.fill(); og.shadowColor = 'transparent'; og.lineWidth = 3; og.strokeStyle = 'rgba(140,220,255,.5)'; og.stroke();
  txt(`Ziel: ${fmt(GOAL)} Kätzchen`, W / 2, yy - 38, 44, '#ffffff', null, 0);
  rrect(x, yy, w, h, 28); og.fillStyle = '#1d3a5c'; og.fill(); const f = cl(val / GOAL);
  rrect(x, yy, Math.max(h, w * f), h, 28); const gr = og.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#2fd6ff'); gr.addColorStop(1, '#7dffb0'); og.fillStyle = gr; og.fill();
  og.restore(); }
function button(k, t, y) { if (k <= .01) return; const w = 600, h = 150, x = W / 2 - w / 2; const p = 1 + .05 * Math.sin(t * 9);
  og.save(); og.translate(W / 2, y + h / 2); og.scale(k * p, k * p); og.translate(-W / 2, -(y + h / 2)); og.shadowColor = 'rgba(0,0,0,.45)'; og.shadowBlur = 26; rrect(x, y, w, h, 75); og.fillStyle = '#ff2d55'; og.fill(); og.shadowColor = 'transparent';
  txt('+ Folgen', W / 2, y + h / 2 + 2, 78, '#fff', null, 0); og.restore(); }
const proj = p => { const v = p.clone().project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
function photoCard(x, y, r, k, i, alpha = 1) { if (k <= .01) return; og.save(); og.globalAlpha = alpha; og.translate(x, y); og.rotate(r); og.scale(k, k); og.fillStyle = '#fff'; og.shadowColor = 'rgba(0,0,0,.4)'; og.shadowBlur = 20; og.fillRect(-120, -140, 240, 280); og.shadowColor = 'transparent';
  if (PHOTO[i]) og.drawImage(PHOTO[i], -105, -125, 210, 210); txt('@' + CATS[i].uid, 0, 112, 22, '#333', null, 0); og.restore(); }
function wall(t, scroll, k) {
  og.save(); og.globalAlpha = k; og.fillStyle = 'rgba(6,16,34,.92)'; og.fillRect(0, 0, W, H);
  const cols = 4, cw = W / cols, rh = 260;
  CATS.forEach((c, i) => { const r = Math.floor(i / cols), cx = (i % cols) * cw + cw / 2, cy = 470 + r * rh - scroll; if (cy < 150 || cy > H + 260) return;
    rrect(cx - cw / 2 + 10, cy - 220, cw - 20, 250, 22); og.fillStyle = 'rgba(18,60,96,.9)'; og.fill(); og.lineWidth = 3; og.strokeStyle = 'rgba(140,220,255,.6)'; og.stroke();
    if (PHOTO[i]) og.drawImage(PHOTO[i], cx - 70, cy - 205, 140, 140); else { const [c0, c1] = LOOKS[c.look] || LOOKS.tabby; og.fillStyle = c0; og.beginPath(); og.arc(cx, cy - 135, 62, 0, 7); og.fill(); txt('💬', cx, cy - 135, 50, '#fff', null, 0); }
    let nm = '@' + c.uid; og.font = '700 24px Fredoka'; while (og.measureText(nm).width > cw - 30) nm = nm.slice(0, -2) + '…'; txt(nm, cx, cy - 34, 24, '#ffffff', null, 0);
    if (c.name) txt('„' + c.name + '"', cx, cy + 2, 26, '#5ff0ff', null, 0); });
  og.restore(); }
function drawUI(t) {
  // the hook: big text from the very first frame
  const hk = 1 - ramp(t, tw.nichts - .2, tw.nichts + .2);
  if (hk > 0) { og.save(); og.globalAlpha = hk; txt('Momo ist traurig 😿', W / 2, 330, 104, '#ffffff', '#000', 18); og.restore(); }
  // nothing on the island
  [['haus', 'Kein Haus'], ['futter', 'Kein Futter'], ['kratz', 'Kein Kratzbaum']].forEach(([k, s_], i) => { const kk = win(t, tw[k] - .05, tw.lang + .3, .15); if (kk <= .01) return;
    og.save(); og.globalAlpha = kk; og.translate(W / 2, 420 + i * 130); og.scale(back(ramp(t, tw[k] - .05, tw[k] + .25)), 1); rrect(-300, -52, 600, 104, 30); og.fillStyle = 'rgba(12,28,52,.88)'; og.fill(); txt('✗  ' + s_, 0, 4, 58, '#ff6b6b', null, 0); og.restore(); });
  const lz = win(t, tw.lang - .1, tw.ideen, .2); if (lz > .01) { og.save(); og.globalAlpha = lz; for (let i = 0; i < 6; i++) { const ph = (t * .5 + i / 6) % 1; txt('z', 260 + i * 110, 1100 - ph * 200, 40 + ph * 40, '#ffffff', '#000', 8); } og.restore(); }
  // ideas from the comments over their ghost buildings
  const ik = win(t, tw.ideen - .1, tw.was - .05, .25);
  if (ik > .01) { og.save(); og.globalAlpha = ik; txt('Eure Ideen', W / 2, 330, 90, '#5ff0ff', '#000', 16);
    [[ghosts[0], 'Katzenhaus', '@s3l12006_', tw.khaus], [ghosts[1], 'Kiosk mit Katzenfutter', '@chicken_lover604', tw.kiosk], [ghosts[2], 'Kratzbaum', '@merorina_3.1', tw.kratz2]].forEach(([gh, a, u, at]) => { const k = back(ramp(t, at - .1, at + .3)); if (k <= .01) return;
      og.font = '700 40px Fredoka'; const w = Math.max(og.measureText(a).width, 220) + 60; const [x, y] = proj(gh.position.clone().setY(TOP + 3.6)); og.save(); og.translate(Math.min(W - w / 2 - 20, Math.max(w / 2 + 20, x)), Math.max(460, y)); og.scale(k, k);
      rrect(-w / 2, -60, w, 120, 26); og.fillStyle = 'rgba(12,28,52,.92)'; og.fill(); og.lineWidth = 4; og.strokeStyle = '#5ff0ff'; og.stroke(); txt(a, 0, -18, 40, '#ffffff', null, 0); txt(u, 0, 28, 30, '#9fdcff', null, 0); og.restore(); });
    og.restore(); }
  // ask: what to build + which kitten
  const ak = ramp(t, tw.was - .15, tw.was + .3);
  if (ak > 0) { const k1 = back(ak), k2 = back(ramp(t, tw.kaetz - .4, tw.kaetz));
    og.save(); og.translate(W / 2, 360); og.scale(k1, k1); rrect(-450, -80, 900, 160, 40); og.fillStyle = 'rgba(12,28,52,.92)'; og.fill(); og.lineWidth = 5; og.strokeStyle = '#5ff0ff'; og.stroke(); icon('comment', -370, 0, 48); txt('Was sollen wir bauen?', 40, 4, 60, '#ffffff', null, 0); og.restore();
    if (k2 > .01) { og.save(); og.translate(W / 2, 560); og.scale(k2, k2); rrect(-450, -80, 900, 160, 40); og.fillStyle = 'rgba(12,28,52,.92)'; og.fill(); og.lineWidth = 5; og.strokeStyle = '#ffd21f'; og.stroke(); icon('comment', -370, 0, 48); txt('Was für ein Kätzchen?', 40, 4, 60, '#ffd21f', null, 0); og.restore(); }
    button(pop(t, tw.folg - .1, .35), t, 720); }
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => { update(t); renderer.render(scene, camera); og.drawImage(renderer.domElement, 0, 0); drawUI(t); return out.toDataURL('image/jpeg', q); };
window.__done = true;
