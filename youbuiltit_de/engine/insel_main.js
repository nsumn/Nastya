// ===================== 10 Katzeninsel — 3D (three.js, kitten rig from katze_main.js), account with ~4.600 followers =====================
// Big island full of kittens (= the existing followers), a storm drifts kitten Momo to a tiny empty island;
// new followers land on Momo's island, at GOAL a bridge brings Momo home.
// The voice never says a number: FOLLOWERS / GOAL below are only drawn on screen, so they can be updated without a new voice.
// Build: cat lib.js insel_main.js > insel.js  (./render_video.sh insel 10_insel)

const FOLLOWERS = 4600, GOAL = 5000;
await document.fonts.load('700 96px Fredoka');
const WORDS = await (await fetch('../10_insel/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
const fmt = n => Math.round(n).toLocaleString('de-DE');

const tw = {
  tausende: T('tausende'), jedes: T('jedes'), euch: T('euch'), gespielt: T('gespielt'), gefeiert: T('gefeiert'),
  aber1: T('Aber'), sturm: T('Sturm'), kleines: T('kleines'), meer: T('Meer'), getrieben: T('getrieben'),
  das1: T('Das'), momo1: T('Momo'), gelandet: T('gelandet'), winzigen: T('winzigen'), leeren: T('leeren'),
  kein1: T('Kein'), futter: T('Futter'), katze: T('Katze'), nur1: T('Nur'), palme: T('Palme'), lichter: T('Lichter'), hause1: T('Hause'),
  cta: T('genau'), folgst: T('Folgst'), likest: T('Likest'), komment: T('Kommentierst'), teilst: T('Teilst'), fisch: T('Fisch'),
  zusammen: T('Zusammen'), huette: T('Hütte'), feuer: T('Lagerfeuer'), leucht: T('Leuchtturm'), sehen: T('sehen'),
  wenn: T('wenn'), bruecke: T('Brücke'), endlich: T('endlich'), hause2: T('Hause', 2),
  aber2: T('Aber', 2), nacht2: T('Nacht', 2), allein: T('allein'),
  was: T('Was'), zuerst: T('zuerst'), schreib: T('Schreib'), likes: T('Likes', 2), gewinnen: T('gewinnen'),
  psst: T('psst'), wasser: T('Wasser'), grosses: T('Großes'),
  folg: T('Folg', 2), schwimm: T('schwimm'), ersten: T('ersten'), teil: T('Teil', 2) };

// ---------- sound events ----------
const SFX = { end: END, music_gain: .14, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
SFX.beds.push([tw.aber1 - .2, tw.das1 + .2, 'rain', 1.1], [tw.aber1 - .2, tw.das1, 'wind', .9], [tw.das1, tw.cta, 'wind', .3], [tw.feuer - .1, tw.aber2, 'fire', .6], [tw.psst - .2, tw.folg, 'wind', .5]);
e(.2, 'sparkle', .6); for (let i = 0; i < 10; i++) e(tw.tausende + i * .09, i % 3 ? 'pop' : 'meow_happy', .3); e(tw.euch, 'ding', .7);
e(tw.gefeiert, 'tada', .7); for (let i = 0; i < 4; i++) e(tw.gefeiert + .3 + i * .35, 'boom', .2);
e(tw.sturm - .1, 'boom', 1); e(tw.meer, 'splash', .8); e(tw.getrieben, 'meow_sad', .8); e(tw.getrieben + .6, 'boom', .6);
e(tw.das1 - .1, 'splash', .5); e(tw.momo1, 'pop', .8); e(tw.leeren, 'tick', .5);
e(tw.kein1, 'pop', .6); e(tw.kein1 + .3, 'buzz', .5); e(tw.futter, 'pop', .6); e(tw.futter + .3, 'buzz', .5); e(tw.katze, 'pop', .6); e(tw.katze + .3, 'buzz', .5);
e(tw.palme, 'boing', .6); e(tw.lichter, 'sparkle', .6); e(tw.hause1, 'meow_sad', .7);
e(tw.cta - .1, 'whoosh', .7); for (const k of ['folgst', 'likest', 'komment', 'teilst']) e(tw[k] - .05, 'pop', .9);
e(tw.folgst + .5, 'splash', .4); e(tw.likest + .4, 'heart', .6); e(tw.fisch, 'boing', .6);
e(tw.zusammen, 'whoosh', .6); e(tw.huette, 'clack', .9); e(tw.huette + .2, 'clack', .7); e(tw.feuer, 'poof', .8); e(tw.leucht - .1, 'swoosh_up', .8); e(tw.sehen, 'ding', .8);
e(tw.bruecke - .1, 'swoosh_up', .7); for (let i = 0; i < 6; i++) e(tw.bruecke + .1 + i * .1, 'clack', .4); e(tw.hause2, 'tada', .9); e(tw.hause2 + .2, 'meow_happy', .8);
e(tw.aber2 - .1, 'whoosh', .8); e(tw.nacht2, 'boom', .5); e(tw.allein, 'meow_sad', .8);
e(tw.was, 'ding', .7); e(tw.schreib, 'pop', .8); e(tw.schreib + .3, 'pop', .7); e(tw.likes, 'heart', .7);
e(tw.psst - .1, 'tick', .6); e(tw.wasser, 'splash', .6); e(tw.grosses, 'boom', .9); e(tw.grosses + .5, 'splash', .8);
e(tw.folg - .05, 'pop', 1); e(tw.folg + .5, 'ding', .8); e(tw.teil, 'tada', .7); e(END - 1, 'meow_happy', .7);
window.SFX = SFX;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

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

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 400);
const TOP = tiny.userData.top;
const KEYS = [
  [0, V(10, 9, -20), V(0, 2, -46)],                                  // big party island
  [tw.jedes, V(6, 7, -27), V(0, 2.5, -46)],
  [tw.gefeiert, V(-4, 10, -22), V(0, 4, -46)],
  [tw.aber1 + .3, V(4, 4, -14), V(0, 1, -24)],                       // storm at sea
  [tw.meer, V(3, 2.2, -11), V(0, .6, -17)],
  [tw.getrieben + .6, V(2.5, 2.0, -6), V(0, .5, -9)],
  [tw.das1 + .2, V(1.8, 2.4, 4.6), V(0, TOP + .8, 0)],                // landed on the tiny island
  [tw.leeren + .3, V(4.5, 4.2, 9), V(0, TOP + .4, 0)],
  [tw.palme + .2, V(-2.5, 3.2, 6), V(-1, TOP + 1.4, 0)],
  [tw.lichter, V(1.2, 2.0, 5.0), V(0, 2.5, -46)],                    // look over Momo's shoulder to the far lights
  [tw.cta + .2, V(1.0, 2.0, 5.2), V(0, 2.5, -46)],
  [tw.zusammen, V(4.5, 3.8, 8.5), V(0, TOP + .9, 0)],                // build
  [tw.leucht + .2, V(-6, 4.5, 7), V(-1.5, TOP + 2, 0)],
  [tw.sehen + .4, V(-4, 6, 9), V(-1, 3, -10)],
  [tw.bruecke + .2, V(6, 6, 7), V(0, 1, -16)],                       // bridge across the sea
  [tw.hause2 + .4, V(5, 7, -6), V(0, 1, -30)],
  [tw.aber2 + .3, V(2.2, 2.6, 5.4), V(0, TOP + .7, 0)],              // alone at night
  [tw.was, V(2.0, 2.5, 5.2), V(0, TOP + .7, 0)],
  [tw.psst, V(9, 7, 13), V(2, 0, -2)],
  [tw.grosses + .5, V(11, 6, 11), V(5, 0, -3.5)],
  [tw.folg, V(4, 3.0, 7.5), V(0, TOP + .7, 0)],
  [END, V(3.4, 2.8, 6.8), V(0, TOP + .7, 0)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1]; const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
  // follow the drifting basket through the storm
  const fol = win(t, tw.kleines - .4, tw.das1 + .1, .4);
  if (fol > 0) { const b = basketG.position; const cp = V(b.x + 2.6, b.y + 2.1, b.z + 4.6), cl_ = V(b.x, b.y + .6, b.z); camera.position.lerp(cp, fol); const look = new THREE.Vector3(); camera.getWorldDirection(look); look.multiplyScalar(10).add(camera.position); camera.lookAt(look.lerp(cl_, fol)); }
  const storm = win(t, tw.aber1, tw.das1, .3); camera.position.x += Math.sin(t * 7) * .06 * storm; camera.position.y += Math.sin(t * 5.3) * .05 * storm;
}

// ---------- update ----------
function update(t) {
  const storm = win(t, tw.aber1 - .1, tw.das1 + .1, .4);
  const night = win(t, tw.aber2 - .2, tw.was + .2, .4) + win(t, tw.psst - .3, tw.folg + .2, .4);
  const party = t < tw.aber1;
  scene.background = storm > .5 ? SKY.storm : night > .5 ? SKY.night : party ? SKY.dusk : SKY.day;
  const flash = storm > .5 && (Math.abs(t - tw.sturm - .05) < .07 || Math.abs(t - tw.getrieben - .6) < .07) ? 1 : 0;
  hemi.intensity = lerp(1.1, .35, Math.max(storm, night)) + flash * 1.5; sun.intensity = lerp(2.4, .25, Math.max(storm, night)) + flash * 2;
  renderer.toneMappingExposure = lerp(1.05, .85, Math.max(storm, night)) + flash * .6;
  sun.color.set(party ? '#ffc79a' : '#fff3e0');
  scene.fog.color.set(storm > .5 ? '#3a4256' : night > .5 ? '#18245a' : party ? '#f0a8b8' : '#bfe6ff');
  seaMat.color.set(storm > .5 ? '#2a4d6e' : night > .5 ? '#1a3570' : '#2f9fd8');
  waves(t, .25 + storm * .9);
  // rain
  rain.visible = storm > .05; if (rain.visible) { for (let i = 0; i < rainN; i++) { const [x, y0, z] = rainSeed[i]; const y = ((y0 - t * 26) % 22 + 22) % 22; rainP.set([x, y, z, x - .3, y - 1.1, z], i * 6); } rainG.attributes.position.needsUpdate = true; }
  // party island
  crowd.forEach((k, i) => { const h = k.userData.home; const hop = party ? Math.abs(Math.sin(t * 5 + k.userData.ph)) * .25 : 0;
    poseKitten(k, t + k.userData.ph, { x: h.x, z: h.z, y: h.y + hop, face: Math.atan2(camera.position.x - h.x, camera.position.z - h.z), happy: 1, hop: 0 }); k.scale.setScalar(1.7); });
  bulbs.forEach((b, i) => b.material.color.setHSL(((i * .13 + t * .3) % 1), .9, .65));
  fireworks.forEach((f, i) => { const ph = ramp(t, tw.gefeiert + i * .35, tw.gefeiert + i * .35 + 1.0); f.visible = ph > 0 && ph < 1; f.children.forEach(s => { s.position.copy(s.userData.dir).multiplyScalar(ph * 4); s.scale.setScalar(1 - ph * .7); }); });
  setLabel(lblBig, win(t, tw.tausende - .1, tw.aber1, .25), BIG.x, 11, BIG.z);
  palmsBig.forEach((p, i) => p.userData.crown.rotation.z = Math.sin(t * (1 + storm * 4) + i) * (.05 + storm * .25));
  myPalm.userData.crown.rotation.z = Math.sin(t * 1.3) * .06; myPalm.scale.setScalar(1.05 * (t < tw.palme ? 1 : 1 + .15 * win(t, tw.palme, tw.palme + .5, .2)));
  // Momo: drifting in the basket, then on the tiny island
  const drift = ease(t, tw.kleines - .2, tw.das1);
  let bx = 0, bz = lerp(lerp(-30, -9, ease(t, tw.kleines - .2, tw.das1 - .5)), 1.0, ease(t, tw.das1 - .5, tw.das1)), by = .15 + Math.sin(t * 2.6) * .25 * (.3 + storm);
  const onIsland = t > tw.das1 - .05;
  if (onIsland) { bx = .6; bz = 1.0; by = TOP; }
  basketG.position.set(bx, by, bz); basketG.rotation.set(Math.sin(t * 2.2) * .25 * storm, t * .3 * storm, Math.cos(t * 1.9) * .2 * storm); basketG.visible = t > tw.kleines - .3;
  const s = { x: bx, z: bz, y: by + .08, face: onIsland ? .35 : Math.PI * .1, shiver: storm > .3 ? 1 : 0, sad: 1 };
  if (!onIsland && t < tw.kleines - .3) { s.x = 3; s.z = -40; s.y = big.userData.top; s.sad = 0; s.happy = 1; }
  if (onIsland) { s.lookX = t > tw.lichter - .2 && t < tw.cta + .4 ? -.6 : 0; s.lookUp = t > tw.lichter - .2 && t < tw.cta + .4 ? .3 : 0; }
  if (t > tw.cta - .1 && t < tw.aber2) { s.sad = 0; s.happy = ease(t, tw.cta - .1, tw.cta + .3); }
  if (t > tw.endlich - .2 && t < tw.aber2) { const h = ramp(t, tw.hause2 - .1, tw.hause2 + .45); s.hop = Math.sin(h * Math.PI) * .3; s.happy = 1; }
  if (t > tw.aber2 - .1 && t < tw.was) { s.sad = 1; s.happy = 0; s.curl = ease(t, tw.nacht2, tw.allein); }
  if (t > tw.was) { s.sad = .2; }
  if (t > tw.psst - .2 && t < tw.folg) { s.sad = 0; s.lookX = .8; s.shiver = .4; }
  if (t > tw.folg) { s.sad = 0; s.happy = 1; const h = (t * 1.4) % 1; s.hop = Math.sin(h * Math.PI) * .22; }
  s.meow = win(t, tw.getrieben, tw.getrieben + .7, .1) + win(t, tw.hause1, tw.hause1 + .6, .1) + win(t, tw.allein, tw.allein + .7, .1) + win(t, tw.hause2, tw.hause2 + .5, .1);
  poseKitten(momo, t, s); momo.scale.setScalar(t < tw.kleines - .3 ? 1.7 : 1.5);
  setLabel(lblMomo, win(t, tw.momo1 - .1, tw.leeren + .2, .2), bx, TOP + 1.9, bz);
  // crossed-out empties
  [[tw.kein1, 1.3, -1.0], [tw.futter, 1.5, 1.6], [tw.katze, -.6, 1.8]].forEach(([a, x, z], i) => setLabel(lblNo[i], win(t, a - .05, tw.palme, .15), x, TOP + .9, z));
  // builds (shown while dreaming/building; gone at night, back from "Was bauen")
  const dream = !(t > tw.aber2 - .1 && t < tw.was);
  const hk = pop(t, tw.huette - .1, .4) * (dream ? 1 : 0); hut.visible = hk > .01; hut.scale.setScalar(Math.max(.001, hk));
  const fk = pop(t, tw.feuer - .1, .35) * (dream ? 1 : 0); fire.visible = fk > .01; fire.scale.setScalar(Math.max(.001, fk));
  flames.forEach((f, i) => f.scale.set(1, .7 + .45 * Math.abs(Math.sin(t * 9 + i * 1.7)), 1)); fireLight.intensity = fk * (3 + .7 * Math.sin(t * 13));
  const lk = ease(t, tw.leucht - .3, tw.leucht + .5) * (dream ? 1 : 0); light.visible = lk > .01; light.scale.set(1, Math.max(.001, lk), 1);
  beamPivot.rotation.y = t * 1.8; beam.visible = t > tw.sehen - .3 && lk > .9;
  const brk = ramp(t, tw.bruecke - .1, tw.hause2 - .2) * (dream ? 1 : 0);
  planks.forEach((p, i) => { const k = cl(brk * planks.length - i); p.visible = k > .01 && t < tw.aber2 - .1; p.scale.setScalar(Math.max(.001, k)); });
  setLabel(lblGoal, win(t, tw.wenn - .1, tw.aber2 - .1, .2), 0, 3.5, -20);
  hearts.forEach((h, i) => { const ph = (t * .7 + i / 10) % 1; const on = win(t, tw.hause2 - .1, tw.aber2 - .1, .2); h.visible = on > .05; h.position.set(bx + Math.sin(i * 2.1) * .7, TOP + 1.3 + ph * 2, bz + Math.cos(i * 1.7) * .5); h.lookAt(camera.position); h.material.opacity = 1 - ph; });
  setLabel(lblFish, win(t, tw.fisch - .1, tw.zusammen, .2), bx + .9, TOP + 2.0, bz);
  // whale circling
  const wk = ease(t, tw.wasser - .2, tw.grosses + .2); const wa = .1 + (t - tw.psst) * .2;
  whale.visible = t > tw.psst - .2 && t < END; whale.position.set(lerp(10, 5.2, ease(t, tw.psst, tw.folg)), lerp(-3.5, -.3, wk) + Math.sin(t * 1.5) * .15, 1.2); whale.rotation.y = Math.PI + .25; whale.userData.tail.rotation.y = Math.sin(t * 3) * .4;
  spout.forEach((sp, i) => { const ph = (t * 1.1 + i / 12) % 1; sp.visible = t > tw.grosses && t < tw.folg + 1; sp.position.set(whale.position.x + Math.sin(i * 2) * ph * .6, whale.position.y + 1.5 + ph * 3, whale.position.z + Math.cos(i * 2) * ph * .6); sp.scale.setScalar(.6 + ph); sp.material.opacity = .8 * (1 - ph); });
  setLabel(lblQ, win(t, tw.grosses - .1, tw.folg, .2), whale.position.x, 3.2, whale.position.z);
  placeCamera(t);
}

// ---------- 2D overlay ----------
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
  txt(`${fmt(val)} / ${fmt(GOAL)}  bis zur Brücke`, W / 2, yy - 38, 44, '#ffffff', null, 0);
  rrect(x, yy, w, h, 28); og.fillStyle = '#1d3a5c'; og.fill(); const f = cl(val / GOAL);
  rrect(x, yy, Math.max(h, w * f), h, 28); const gr = og.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#2fd6ff'); gr.addColorStop(1, '#7dffb0'); og.fillStyle = gr; og.fill();
  txt('🌉', x + w - 4, yy + h / 2 + 2, 44, '#fff', null, 0); og.restore(); }
function button(k, t, y) { if (k <= .01) return; const w = 600, h = 150, x = W / 2 - w / 2; const p = 1 + .05 * Math.sin(t * 9);
  og.save(); og.translate(W / 2, y + h / 2); og.scale(k * p, k * p); og.translate(-W / 2, -(y + h / 2)); og.shadowColor = 'rgba(0,0,0,.45)'; og.shadowBlur = 26; rrect(x, y, w, h, 75); og.fillStyle = '#ff2d55'; og.fill(); og.shadowColor = 'transparent';
  txt('+ Folgen', W / 2, y + h / 2 + 2, 78, '#fff', null, 0); og.restore(); }
function wordAt(t) { let w = null; for (const x of WORDS) { if (x[1] <= t + .02) w = x; else break; } return w && t < w[2] + .5 ? clean(w[0]) : ''; }
function drawCaption(t, cy = 990) {   // channel style: one word at a time, centre of the frame, cyan for the key words
  const w = wordAt(t); if (!w) return; let fs = 96; og.font = `700 ${fs}px Fredoka`; while (og.measureText(w).width > W - 120) { fs -= 4; og.font = `700 ${fs}px Fredoka`; }
  const key = /^(Momo|Momos|Insel|Sturm|Brücke|Leuchtturm|Lagerfeuer|Hütte|Großes|allein|Kätzchen)$/.test(w);
  og.textAlign = 'center'; og.textBaseline = 'middle'; og.lineJoin = 'round'; og.lineWidth = 16; og.strokeStyle = '#000'; og.strokeText(w, W / 2, cy); og.fillStyle = key ? '#5ff0ff' : '#ffffff'; og.fillText(w, W / 2, cy); }
function drawUI(t) {
  const cta = win(t, tw.cta - .1, tw.zusammen + .1, .3);
  if (cta > .01) { og.fillStyle = `rgba(6,16,34,${.55 * cta})`; og.fillRect(0, 0, W, H); txt('SO MACHST DU MIT', W / 2, 300, 72, '#5ff0ff', '#000', 14);
    const rows = [['folgst', 'follow', 'FOLGEN', 'Du landest auf Momos Insel'], ['likest', 'like', 'LIKEN', 'Du stimmst ab'], ['komment', 'comment', 'KOMMENTIEREN', 'Deine Idee wird gebaut'], ['teilst', 'share', 'TEILEN', 'Momo bekommt Fisch']];
    const nxt = ['likest', 'komment', 'teilst', 'zusammen'];
    rows.forEach(([k, kind, ti, su], i) => card(back(ramp(t, tw[k] - .1, tw[k] + .3)) * cta, 390 + i * 180, kind, ti, su, t > tw[k] && t < tw[nxt[i]], t)); }
  meter(win(t, tw.wenn - .1, tw.aber2 - .1, .3), FOLLOWERS + 400 * ease(t, tw.bruecke, tw.hause2), 1600);
  // "1 Kätzchen auf Momos Insel" at night
  const alone = win(t, tw.aber2, tw.was, .3); if (alone > .01) { og.save(); og.globalAlpha = alone; txt('1 Kätzchen auf Momos Insel', W / 2, 1720, 54, '#ffffff', '#000', 12); og.restore(); }
  // build vote
  const site = win(t, tw.was - .1, tw.psst - .1, .3);
  if (site > .01) { const slots = ['Hütte?', 'Lagerfeuer?', 'Leuchtturm?', 'Deine Idee?'];
    slots.forEach((s, i) => { const k = back(ramp(t, tw.schreib - .1 + i * .12, tw.schreib + .25 + i * .12)) * site; if (k <= .01) return; const y = 360 + i * 130; og.save(); og.translate(W / 2, y); og.scale(k, k);
      rrect(-420, -50, 840, 100, 30); og.fillStyle = 'rgba(12,28,52,.9)'; og.fill(); og.lineWidth = 3; og.strokeStyle = 'rgba(140,220,255,.6)'; og.stroke();
      txt(s, -380, 2, 44, '#ffffff', null, 0, 'left'); const likes = Math.round(ease(t, tw.likes - .2, tw.gewinnen + .3) * [61, 38, 92, 27][i]); icon('like', 300, 0, 26); txt(String(likes), 365, 2, 40, '#fff', null, 0); og.restore(); }); }
  // end card
  const endK = ramp(t, tw.folg - .2, tw.folg + .3);
  if (endK > 0) { og.fillStyle = `rgba(6,16,34,${.7 * endK})`; og.fillRect(0, 0, W, H);
    if (endK > .3) { txt('Folg mir und', W / 2, 330, 90, '#ffffff', '#000', 16); txt('schwimm zu Momo!', W / 2, 440, 90, '#5ff0ff', '#000', 16); button(pop(t, tw.folg + .05, .35), t, 540);
      const tp = ramp(t, tw.folg + .35, tw.folg + .9); if (tp > 0 && tp < 1) { og.save(); og.globalAlpha = 1 - tp; og.lineWidth = 10; og.strokeStyle = '#fff'; og.beginPath(); og.arc(W / 2 + 170, 615, 30 + tp * 140, 0, 7); og.stroke(); og.restore(); }
      txt('TEIL 2', W / 2, 1450, 70, '#ffd21f', '#000', 14); meter(1, FOLLOWERS, 1700); } }
  // storm flash
  const flash = Math.max(0, 1 - Math.abs(t - tw.sturm - .05) / .12) + Math.max(0, 1 - Math.abs(t - tw.getrieben - .6) / .12); if (flash > 0) { og.fillStyle = `rgba(255,255,255,${.55 * cl(flash)})`; og.fillRect(0, 0, W, H); }
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => { update(t); renderer.render(scene, camera); og.drawImage(renderer.domElement, 0, 0); drawUI(t); if (ramp(t, tw.folg - .2, tw.folg + .3) < .3) drawCaption(t, win(t, tw.cta - .1, tw.zusammen + .1, .3) > .3 ? 1400 : 990); return out.toDataURL('image/jpeg', q); };
window.__done = true;
