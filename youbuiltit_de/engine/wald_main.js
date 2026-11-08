// ===================== 19 Waldhütte — how to survive a night in the forest (debris hut) =====================
// Built as: cat lib.js wald_main.js > wald.js   (./render_video.sh wald 19_waldhuette). Captions: separate caption layer.

await document.fonts.load('700 96px Fredoka');
const WORDS = await (await fetch('../19_waldhuette/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const show = (o, k) => { o.visible = k > .002; o.scale.setScalar(Math.max(k, .001)); };

const tw = {
  wald: T('Wald'), ast: T('Ast'), baum: T('Baum'), lehnst: T('lehnst'), hutte: T('Hütte'),
  aber1: T('Aber'), wind: T('Wind'), durch: T('durch'),
  also1: T('Also'), beiden: T('beiden'), dutz: T('dutzende'), dicht: T('dicht'), zelt: T('Zelt'),
  aber2: T('Aber', 2), regnen: T('regnen'), tropft: T('tropft'),
  also2: T('Also', 2), laub: T('Laub'), moos: T('Moos'), halben: T('halben'), wasser: T('Wasser'), ablauft: T('abläuft'),
  aber3: T('Aber', 3), nachts: T('nachts'), boden: T('Boden'), eiskalt: T('eiskalt'), warme1: T('Wärme'),
  also3: T('Also', 3), bett: T('Bett'), fichten: T('Fichtenzweigen'), dreissig: T('dreißig'), liegst: T('liegst'),
  aber4: T('Aber', 4), frierst: T('frierst'),
  also4: T('Also', 4), feuer1: T('Feuer'), stapelst: T('stapelst'), wand: T('Wand'), holz: T('Holzstämmen'), warme2: T('Wärme', 2), zuruck: T('zurückwirft'),
  aber5: T('Aber', 5), mitter: T('Mitternacht'), schnuff: T('schnüffelt'), wild: T('Wildschwein'),
  also5: T('Also', 5), stopfst: T('stopfst'), bundel: T('Bündel'), tur: T('Tür'),
  aber6: T('Aber', 6), morgen: T('Morgen'), suchen: T('suchen'), oben: T('oben'), laubh: T('Laubhaufen'),
  also6: T('Also', 6), lichtung: T('Lichtung'), drei: T('drei'), feuer2: T('Feuer', 2), dreieck: T('Dreieck'), notsig: T('Notsignal'),
  grune: T('grüne'), zweige: T('Zweige'), weiss: T('weiß'), qualmen: T('qualmen'),
  hub: T('Hubschrauber'), gluck: T('Glückwunsch'), uberlebt: T('überlebt') };

// ---------- sound ----------
const SFX = { end: END, music_gain: .08, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
SFX.beds.push([0, tw.aber1, 'wind', .25], [tw.aber1 - .2, tw.also1 + .3, 'wind', 1.1], [tw.also1, tw.aber2, 'wind', .3],
  [tw.aber2 - .1, tw.aber3 + .3, 'rain', 1.0], [tw.aber3, tw.morgen, 'wind', .25], [tw.feuer1 - .1, tw.morgen + .5, 'fire', .55],
  [tw.feuer2 - .1, END, 'fire', .4], [tw.hub - .4, END, 'heli', .9]);
e(.1, 'whoosh', .5); e(tw.ast, 'clack', .6); e(tw.lehnst + .35, 'clack', 1); e(tw.hutte, 'ding', .6);
e(tw.wind - .1, 'whoosh', .9); e(tw.durch, 'whoosh', .6);
for (let i = 0; i < 13; i++) e(tw.beiden + i * (tw.zelt - tw.beiden) / 13, 'clack', .45); e(tw.zelt + .1, 'ding', .6);
e(tw.tropft, 'tick', .7); e(tw.tropft + .35, 'tick', .6); e(tw.tropft + .7, 'tick', .6);
for (let i = 0; i < 6; i++) e(tw.laub + i * .3, 'poof', .5); e(tw.halben, 'pop', .8); e(tw.wasser, 'splash', .5);
e(tw.nachts, 'boom', .4); e(tw.eiskalt, 'brr', .8); e(tw.warme1, 'swoosh_up', .4);
e(tw.bett, 'poof', .6); e(tw.fichten, 'poof', .6); e(tw.dreissig, 'pop', .8); e(tw.frierst, 'brr', .9);
e(tw.feuer1 - .05, 'poof', .9); for (let i = 0; i < 4; i++) e(tw.stapelst + .1 + i * .32, 'clack', .8); e(tw.warme2, 'sparkle', .6);
e(tw.mitter - .1, 'boom', .4); e(tw.schnuff, 'sniff', 1); e(tw.wild + .1, 'sniff', .9); e(tw.stopfst, 'whoosh', .7); e(tw.bundel, 'clack', 1); e(tw.tur, 'stamp', .8); e(tw.tur + .2, 'whoosh', .5);
e(tw.morgen, 'tweet', .8); e(tw.morgen + .8, 'tweet', .6); e(tw.oben - .1, 'swoosh_up', .7); e(tw.laubh, 'ding', .6);
e(tw.drei, 'poof', .8); e(tw.feuer2, 'poof', .8); e(tw.feuer2 + .3, 'poof', .8); e(tw.dreieck, 'ding', .7); e(tw.notsig, 'stamp', .8);
e(tw.zweige, 'hiss', .7); e(tw.weiss, 'poof', .7); e(tw.gluck, 'tada', .9);
window.SFX = SFX;

// ---------- materials ----------
const barkMat = M('#6b4e36', { roughness: 1 }), woodMat = M('#8a6440', { roughness: .95 }), cutMat = M('#d8b47c', { roughness: .9 });
const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb12a', transparent: true, opacity: .95 });
const flame2Mat = new THREE.MeshBasicMaterial({ color: '#ff5a1a', transparent: true, opacity: .9 });
const smokeMat = new THREE.MeshStandardMaterial({ color: '#f2f2f2', transparent: true, opacity: .45, roughness: 1, depthWrite: false });
const spruceMat = M('#2f5a32', { roughness: 1 }), spruce2Mat = M('#3b6b3a', { roughness: 1 });

// ---------- ground ----------
const HUTZ = .5, BACKZ = -4.6, RIDGE = 1.6;          // ridge pole: front end on the fallen tree, back end on the ground
const CLR = V(12, 0, -2);                             // clearing for the signal fires
const GS = 90, GN = 180;
const gGeo = new THREE.PlaneGeometry(GS, GS, GN, GN); gGeo.rotateX(-Math.PI / 2);
{ const p = gGeo.attributes.position, col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), dc = Math.hypot(x - CLR.x, z - CLR.z);
    p.setY(i, .12 * Math.sin(x * .7 + 1) * Math.cos(z * .55) + .08 * Math.sin(x * 1.9 - z * 1.3));
    const n = .5 + .3 * Math.sin(x * 1.1 + z * .5) * Math.cos(z * .9 - x * .4) + rr(-.15, .15);
    c.setHSL(.075 + n * .02, .38, .29 + n * .05);                     // brown leaf litter
    const moss = cl(.5 + .5 * Math.sin(x * .33 + 2) * Math.cos(z * .41 - 1) - .25);
    c.lerp(new THREE.Color().setHSL(.17, .3, .31 + n * .04), moss * .6);
    c.lerp(new THREE.Color().setHSL(.24 + n * .02, .5, .34 + n * .06), 1 - smooth01(4.2, 6.5, dc));   // grassy clearing
    col.set([c.r, c.g, c.b], i * 3);
  }
  gGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); gGeo.computeVertexNormals(); }
function smooth01(a, b, x) { return sm(cl((x - a) / (b - a))); }
const groundTex = tex(plainCanvas('#e6e6e6', 34, 256, { n: 2200, cols: ['#c9c9c9', '#f7f7f7', '#b3b3b3'], r: [1, 3] }), 30, 30);
const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ map: groundTex, vertexColors: true, roughness: 1 }));
ground.receiveShadow = true; scene.add(ground);
const farG = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), M('#4a3a26', { roughness: 1 })); farG.position.y = -.5; scene.add(farG);
scene.fog = new THREE.Fog('#c9d6c8', 30, 110);

// litter: fallen leaves on the forest floor (instanced)
const LEAFC = ['#c46a22', '#d99a2b', '#9c4a1c', '#7a5a2a', '#b8862f', '#8f3d1a'];
const leafGeo = new THREE.CircleGeometry(.09, 5); leafGeo.scale(1, 1.6, 1);
const litter = new THREE.InstancedMesh(leafGeo, M('#ffffff', { roughness: 1, side: THREE.DoubleSide }), 900);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  for (let i = 0; i < 900; i++) { const x = rr(-14, 22), z = rr(-12, 14); if (Math.hypot(x - CLR.x, z - CLR.z) < 5) { litter.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); continue; }
    q.setFromEuler(new THREE.Euler(-Math.PI / 2 + rr(-.3, .3), rr(0, 6), 0, 'YXZ')); m.compose(V(x, .14, z), q, V(1, 1, 1).multiplyScalar(rr(.8, 1.6)));
    litter.setMatrixAt(i, m); litter.setColorAt(i, c.set(pick(LEAFC))); } }
litter.receiveShadow = true; scene.add(litter);

// ---------- forest ----------
function treeOK(x, z) {
  if (z > -1 && z < 30 && x > -18 && x < 26) return false;
  if (Math.abs(x) < 7.5 && z > -7) return false;            // hut + camera corridor
  if (Math.hypot(x - CLR.x, z - CLR.z) < 6.5) return false;           // clearing
  if (x > 0 && x < 18 && z > -1 && z < 26) return false;              // view to the clearing
  return true;
}
const spr = [];
for (let i = 0; i < 2600 && spr.length < 170; i++) { const x = rr(-45, 50), z = rr(-50, 45); if (treeOK(x, z)) spr.push([x, z, rr(.8, 1.5)]); }
const sTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .3, 3, 7).translate(0, 1.5, 0), barkMat, spr.length);
const sCones = [0, 1, 2].map(k => new THREE.InstancedMesh(new THREE.ConeGeometry(2.1 - k * .55, 3.2 - k * .5, 9).translate(0, 2.6 + k * 1.9, 0), k % 2 ? spruce2Mat : spruceMat, spr.length));
{ const m = new THREE.Matrix4(); spr.forEach(([x, z, s], i) => { m.makeScale(s, s * rr(.95, 1.25), s).setPosition(x, 0, z); sTrunk.setMatrixAt(i, m); sCones.forEach(c => c.setMatrixAt(i, m)); }); }
for (const o of [sTrunk, ...sCones]) { o.castShadow = false; o.receiveShadow = true; scene.add(o); }
for (const [x, z, s] of [[-8.5, -8, 1.2], [8.5, -9.5, 1.3], [-10, 2, 1.1], [-3, -12, 1.4], [4, -13, 1.2], [19.5, -6, 1.2], [18, 4, 1.1], [7, -16, 1.3], [21, -12, 1.3]]) tree(x, z, s).traverse(o => { o.castShadow = false; });

// decoy leaf piles (so the covered hut looks like any other Laubhaufen from above)
const leafTexC = (() => { const S = 256, [c, g] = cv(S, S); g.fillStyle = '#8a5a26'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1600; i++) { g.fillStyle = pick(LEAFC); g.save(); g.translate(rr(0, S), rr(0, S)); g.rotate(rr(0, 6)); g.beginPath(); g.ellipse(0, 0, rr(3, 6), rr(6, 11), 0, 0, 7); g.fill(); g.restore(); }
  return c; })();
const leafMat = new THREE.MeshStandardMaterial({ map: tex(leafTexC, 2, 2), bumpMap: tex(leafTexC, 2, 2, false), bumpScale: 3, roughness: 1, side: THREE.DoubleSide });
for (const [x, z, sx, sz, ry] of [[-5.5, -6.5, 1.6, 2.6, .5], [5.8, -5.8, 1.5, 2.3, -.4], [-6.8, 4, 1.4, 2.2, 1.2], [6.5, 6, 1.2, 1.8, .3], [-2.5, -9.5, 1.3, 2.0, 1.9]]) {
  const g = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); const p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const f = 1 + .12 * Math.sin(p.getX(k) * 5 + x) * Math.cos(p.getZ(k) * 4 + z); p.setXYZ(k, p.getX(k) * f, p.getY(k) * f, p.getZ(k) * f); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, leafMat); m.scale.set(sx, 1.15, sz); m.position.set(x, 0, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; scene.add(m);
}

// ---------- fallen tree ----------
const fallen = new THREE.Group(); scene.add(fallen);
{ const tr = new THREE.Mesh(new THREE.CylinderGeometry(.2, .3, 10.4, 14), barkMat); tr.rotation.z = Math.PI / 2 + .2; tr.position.set(-.2, RIDGE - .1, HUTZ + .05); tr.castShadow = tr.receiveShadow = true; fallen.add(tr);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, .4, 14), M('#5a4128', { roughness: 1 })); plate.rotation.z = Math.PI / 2; plate.position.set(4.8, 1.4, HUTZ + .05); plate.castShadow = true; fallen.add(plate);
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, .45, 12), soilMat); dirt.rotation.z = Math.PI / 2; dirt.position.set(4.95, 1.3, HUTZ + .05); fallen.add(dirt);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const r = new THREE.Mesh(new THREE.CylinderGeometry(.05, .1, 1.2, 5), barkMat);
    r.position.set(5.1, 1.4 + Math.sin(a) * 1.4, HUTZ + .05 + Math.cos(a) * 1.4); r.rotation.set(a, 0, Math.PI / 2 + rr(-.4, .4)); fallen.add(r); }
  for (const x of []) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.06, .1, 1.1, 6), barkMat); b.position.set(x, RIDGE + .15, HUTZ + .05 + rr(-.3, .3)); b.rotation.set(rr(-.6, .6), 0, rr(-.8, .8)); b.castShadow = true; fallen.add(b); }
   }

// ---------- hut geometry helpers ----------
const hAt = z => RIDGE * cl((z - BACKZ) / (HUTZ - BACKZ));                 // ridge height above z
const wAt = z => .58 * hAt(z) + .3;                                        // half width at the ground
function stick(len, r = .055) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * .8, r, len, 6).translate(0, len / 2, 0), woodMat); m.castShadow = true; return m; }
const ridgeLen = Math.hypot(RIDGE + .12, HUTZ + .35 - BACKZ);
const ridge = stick(ridgeLen, .085); scene.add(ridge);
const ridgeTilt = Math.atan2(HUTZ + .35 - BACKZ, RIDGE + .12);             // angle from vertical toward +z
// ribs: both sides
const RIBS = [];
for (let i = 0; i < 13; i++) { const z = HUTZ - .1 - i * .36; if (z < BACKZ + .25) break;
  for (const s of [-1, 1]) { const h = hAt(z), w = wAt(z); const len = Math.hypot(w + .12, h + .18) ; const m = stick(len, rr(.04, .06)); scene.add(m);
    m.position.set(s * w, 0, z + rr(-.05, .05)); m.rotation.set(rr(-.06, .06), 0, s * Math.atan2(w + .12, h + .18)); RIBS.push({ m, i, s }); } }
// leaf blanket: two sloped grids pushed outward along the roof normal
const LU = 18, LV = 9; const blank = [];
for (const s of [-1, 1]) {
  const g = new THREE.PlaneGeometry(1, 1, LU, LV); const p = g.attributes.position, base = [], nor = [], amp = [];
  for (let k = 0; k < p.count; k++) {
    const u = k % (LU + 1) / LU, v = Math.floor(k / (LU + 1)) / LV;
    const z = lerp(HUTZ + .25, BACKZ - .2, u), h = hAt(Math.min(z, HUTZ)), w = wAt(Math.min(z, HUTZ));
    const x = s * lerp(w + .1, .02, v), y = lerp(0, h + .12, v);
    base.push(V(x, y, z)); nor.push(V(s * (h + .1), w + .1, 0).normalize());
    amp.push((.75 + .25 * Math.sin(u * 17 + s) * Math.cos(v * 9)) * (v < .08 ? .5 : 1) * (u > .97 ? .4 : 1));
  }
  const m = new THREE.Mesh(g, leafMat); m.castShadow = m.receiveShadow = true; scene.add(m);
  blank.push({ m, p, base, nor, amp, s });
}
let lastTh = -1;
function setBlanket(th) {
  if (Math.abs(th - lastTh) < 1e-4) return; lastTh = th;
  for (const b of blank) { for (let k = 0; k < b.base.length; k++) { const q = b.base[k].clone().addScaledVector(b.nor[k], th * b.amp[k] + .03); b.p.setXYZ(k, q.x, q.y, q.z); }
    b.p.needsUpdate = true; b.m.geometry.computeVertexNormals(); b.m.visible = th > .005; }
  ridgeCap.visible = th > .005; ridgeCap.scale.set(Math.max(th, .01) * 1.6, 1, Math.max(th, .01) * 1.3);
}
const ridgeCap = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, ridgeLen + .3, 10, 1), leafMat); scene.add(ridgeCap);
ridgeCap.position.set(0, (RIDGE + .12) / 2 + .02, (HUTZ + BACKZ) / 2 - .05); ridgeCap.rotation.x = Math.PI / 2 - Math.atan2(RIDGE + .12, HUTZ + .35 - BACKZ);
// falling leaves while the layer grows
const fallLeaves = new THREE.InstancedMesh(leafGeo, M('#ffffff', { roughness: 1, side: THREE.DoubleSide }), 160);
for (let i = 0; i < 160; i++) fallLeaves.setColorAt(i, new THREE.Color(pick(LEAFC))); scene.add(fallLeaves);
const FL = Array.from({ length: 160 }, () => [rr(-1.8, 1.8), rr(BACKZ, HUTZ + .3), rr(0, 1), rr(0, 6)]);

// ---------- spruce bed ----------
const bed = new THREE.Group(); scene.add(bed);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1, 3.4).translate(0, .5, 0), M('#2c5a2c', { roughness: 1 })); b.receiveShadow = true; bed.add(b);
  const fr = new THREE.InstancedMesh(new THREE.ConeGeometry(.16, .7, 6).rotateX(Math.PI / 2).scale(1, .35, 1), spruce2Mat, 70);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 70; i++) { q.setFromEuler(new THREE.Euler(0, rr(-.7, .7) + (i % 2 ? Math.PI : 0), 0)); m.compose(V(rr(-.45, .45), 1.0, rr(-1.6, 1.6)), q, V(1, 1, 1)); fr.setMatrixAt(i, m); }
  bed.add(fr); }
bed.position.set(0, 0, -1.25);

// ---------- people + animals ----------
function hiker() {
  const g = new THREE.Group();
  const jacket = M('#e2641f', { roughness: .8 });
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .34, 10), M('#2e3a4a')); legs.position.y = .17; g.add(legs);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.2, .27, .6, 12), jacket); body.position.y = .62; g.add(body);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.34, .44, .2), M('#3c5f3a')); pack.position.set(0, .66, -.24); g.add(pack);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12), M('#f0c39a')); head.position.y = 1.09; g.add(head);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), M('#2a6a9a')); hat.position.y = 1.12; g.add(hat);
  const bob = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), M('#f4f4f2')); bob.position.y = 1.31; g.add(bob);
  for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(.025, 6, 6), M('#111')); ey.position.set(sx * .06, 1.1, .155); g.add(ey); }
  const arms = [-1, 1].map(sx => { const a = new THREE.Group(); a.position.set(sx * .25, .86, 0);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .5, 8).translate(0, -.25, 0), jacket); a.add(c); a.rotation.z = sx * .15; g.add(a); return a; });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.arms = arms; g.scale.setScalar(1.15); scene.add(g); return g;
}
const du = hiker();
function boar() {
  const g = new THREE.Group(), fur = M('#4a3426', { roughness: 1 }), dark = M('#2c1f16', { roughness: 1 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 12), fur); b.scale.set(1.25, .85, .75); b.position.y = .62; g.add(b);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(.9, .14, .12), dark); mane.position.set(.05, 1.02, 0); g.add(mane);
  const hd = new THREE.Group(); hd.position.set(.55, .62, 0); g.add(hd);
  const h = new THREE.Mesh(new THREE.ConeGeometry(.3, .62, 12).rotateZ(-Math.PI / 2), fur); h.position.x = .25; hd.add(h);
  const sn = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .1, 12).rotateZ(Math.PI / 2), M('#8a6a5a')); sn.position.x = .58; hd.add(sn);
  for (const sz of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.08, .2, 6), dark); ear.position.set(.08, .25, sz * .14); ear.rotation.x = sz * .3; hd.add(ear);
    const tusk = new THREE.Mesh(new THREE.ConeGeometry(.025, .14, 6), M('#f1ead8')); tusk.position.set(.48, .02, sz * .1); tusk.rotation.z = .5; hd.add(tusk);
    const ey = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 6), M('#111')); ey.position.set(.28, .12, sz * .13); hd.add(ey); }
  const legs = []; for (const [lx, lz] of [[.35, .18], [.35, -.18], [-.35, .18], [-.35, -.18]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .4, 6).translate(0, -.2, 0), dark); l.position.set(lx, .36, lz); g.add(l); legs.push(l); }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .25, 4), dark); tail.position.set(-.62, .75, 0); tail.rotation.z = .8; g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { hd, legs }; g.scale.setScalar(1.1); scene.add(g); return g;
}
const pig = boar();

// ---------- fire ----------
function campfire(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = rock(.16, '#7f7b74'); r.position.set(Math.cos(a) * .55, .08, Math.sin(a) * .55); g.add(r); }
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .8, 7), barkMat); l.rotation.set(Math.PI / 2 - .5, i * Math.PI / 2, 0); l.position.set(Math.sin(i * Math.PI / 2) * .12, .2, Math.cos(i * Math.PI / 2) * .12); l.castShadow = true; g.add(l); }
  const fl = new THREE.Group(); fl.position.y = .15; g.add(fl);
  const flames = [];
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(i ? .17 : .28, i ? .55 : .85, 8).translate(0, i ? .27 : .42, 0), i % 2 ? flame2Mat : flameMat);
    f.position.set(i ? Math.cos(i * 1.6) * .16 : 0, 0, i ? Math.sin(i * 1.6) * .16 : 0); fl.add(f); flames.push(f); }
  const smoke = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), smokeMat); m.visible = false; scene.add(m); smoke.push(m); }
  g.userData = { fl, flames, smoke }; return g;
}
const mainFire = campfire(0, 2.25);
const fireLight = new THREE.PointLight('#ff9a3c', 0, 14, 1.6); fireLight.position.set(0, .9, 2.25); scene.add(fireLight);
// reflector wall behind the fire
const WALLZ = 3.25, wallLogs = [], wallStakes = [];
for (const x of [-1.45, 1.45]) for (const dz of [-.18, .18]) { const s = stick(1.25, .07); s.position.set(x, 0, WALLZ + dz); scene.add(s); wallStakes.push(s); }
for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 3.1, 9), barkMat); l.rotation.z = Math.PI / 2; l.position.set(0, .14 + i * .27, WALLZ); l.castShadow = true; scene.add(l); wallLogs.push(l);
  for (const sy of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(.13, 10).rotateX(sy * -Math.PI / 2), cutMat); c.position.y = sy * 1.551; l.add(c); } }
// heat particles: fire -> wall -> hut
const heatMat = new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: .85 });
const heat = Array.from({ length: 26 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), heatMat); m.visible = false; scene.add(m); return m; });
// cold arrows (warmth drains into the ground) + frost on the ground
const coldMat = new THREE.MeshBasicMaterial({ color: '#7fd0ff', transparent: true, opacity: .9 });
const coldArrows = Array.from({ length: 6 }, () => { const a = arrow(0, 0, 0, .35); a.material = coldMat; a.rotation.set(Math.PI, 0, 0); a.visible = false; return a; });
const frost = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: .0, depthWrite: false }));
frost.scale.set(.75, 1, 2.0); frost.position.set(0, .16, -1.2); scene.add(frost);
// door bundle
const door = new THREE.Group(); scene.add(door);
{ for (let i = 0; i < 16; i++) { const s = stick(1.7, rr(.035, .05)); s.position.set(rr(-.55, .55), 0, rr(-.12, .12)); s.rotation.set(rr(-.08, .08), 0, rr(-.25, .25)); s.material = M(pick(['#7a5a3a', '#8a6440', '#5f452e']), { roughness: 1 }); door.add(s); }
  for (const y of [.45, 1.15]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.6 - y * .18, .03, 6, 20), M('#c8b080')); r.rotation.x = Math.PI / 2; r.scale.set(1, .35, 1); r.position.y = y; door.add(r); }
  for (let i = 0; i < 10; i++) { const n = new THREE.Mesh(new THREE.ConeGeometry(.14, .5, 6), spruce2Mat); n.position.set(rr(-.5, .5), rr(.3, 1.4), .12); n.rotation.z = rr(-1, 1); door.add(n); } }

// rain
const RAINN = 700;
const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(.018, .55, .018), new THREE.MeshBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: .55 }), RAINN); scene.add(rain);
const RP = Array.from({ length: RAINN }, () => [rr(-9, 9), rr(0, 12), rr(-8, 9)]);
const drips = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#8fd0ff' })); m.scale.y = 1.6; m.visible = false; scene.add(m); return m; });
const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4a6f9a', roughness: .15, transparent: true, opacity: .7 })); puddle.position.set(0, .17, -1.1); scene.add(puddle);
const runoff = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#6ec3ff' })); m.visible = false; scene.add(m); return m; });
// wind streaks
const windMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .6, depthWrite: false });
const winds = Array.from({ length: 14 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, .03, .03), windMat); m.visible = false; scene.add(m); return m; });

// ---------- signal fires + helicopter ----------
const SIG = [0, 1, 2].map(i => { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; return campfire(CLR.x + Math.cos(a) * 2.6, CLR.z + Math.sin(a) * 2.6, 1.15); });
const triLines = [0, 1, 2].map(i => { const a = SIG[i].position, b = SIG[(i + 1) % 3].position; const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(.12, .03, 1).translate(0, 0, .5), new THREE.MeshBasicMaterial({ color: '#ffd21f' })); m.position.set(a.x, .2, a.z); m.lookAt(b.x, .2, b.z); m.userData.len = len; m.visible = false; scene.add(m); return m; });
const greens = SIG.map(f => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const n = new THREE.Mesh(new THREE.ConeGeometry(.2, .8, 6).rotateX(Math.PI / 2), spruce2Mat); n.position.set(rr(-.3, .3), .35 + i * .05, rr(-.3, .3)); n.rotation.y = rr(0, 6); g.add(n); } g.position.copy(f.position); g.visible = false; scene.add(g); return g; });
function heli() {
  const g = new THREE.Group(), yel = M('#f2c418', { roughness: .45, metalness: .1 }), dk = M('#26303a', { roughness: .4 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), yel); b.scale.set(1.7, 1, 1); g.add(b);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(.8, 16, 12, 0, Math.PI), M('#3b6f9a', { roughness: .1, metalness: .3 })); gl.rotation.y = Math.PI / 2; gl.position.set(.95, .2, 0); gl.scale.set(.7, .8, 1); g.add(gl);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(.14, .3, 3.2, 10).rotateZ(Math.PI / 2), yel); boom.position.set(-2.9, .3, 0); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.5, .9, .08), yel); fin.position.set(-4.4, .7, 0); g.add(fin);
  const tr = new THREE.Mesh(new THREE.BoxGeometry(.08, .9, .06), dk); tr.position.set(-4.4, .75, .12); g.add(tr);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .4, 8), dk); mast.position.y = 1.1; g.add(mast);
  const rot = new THREE.Group(); rot.position.y = 1.3; g.add(rot);
  for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(5.2, .04, .22).translate(2.6, 0, 0), dk); bl.rotation.y = i * Math.PI / 2; rot.add(bl); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#2a2a2a', transparent: true, opacity: .15, depthWrite: false })); disc.position.y = 1.3; g.add(disc);
  for (const sz of [-1, 1]) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 6).rotateZ(Math.PI / 2), dk); sk.position.set(0, -1.15, sz * .7); g.add(sk);
    for (const sx of [-.6, .6]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .4, 6), dk); st.position.set(sx, -.95, sz * .7); g.add(st); } }
  const cross = new THREE.Group(); for (const [w, h] of [[.7, .2], [.2, .7]]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#ffffff' })); cross.add(c); }
  cross.position.set(-.3, .1, 1.001); g.add(cross);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.rot = rot; g.scale.setScalar(.85); scene.add(g); return g;
}
const copter = heli();

// ---------- labels ----------
function label(text, w = 3, col = '#ffd21f') {
  const [c, g] = cv(512, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, 256, 132); g.fillStyle = col; g.fillText(text, 256, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w, w / 2, 1); s.renderOrder = 10; s.userData.w = w; scene.add(s); return s;
}
const yel = new THREE.MeshBasicMaterial({ color: '#ffd21f', depthTest: false });
function dim() { const g = new THREE.Group(); const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, 1, .05), yel); bar.renderOrder = 9; g.add(bar);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.09, .16, 10), yel); if (s < 0) c.rotation.x = Math.PI; c.position.y = s * .5; c.renderOrder = 9; g.add(c); } scene.add(g); return g; }
const lblQ = label('?', 1.6), lbl50 = label('50 cm', 1.7), lbl30 = label('30 cm', 1.3), lblSOS = label('SOS', 3.4), lblEx = label('!', 1.4, '#ff4a3a'), lblQ2 = label('?', 5);
const dim50 = dim(), dim30 = dim();
function lab(s, k, x, y, z) { s.visible = k > .01; s.position.set(x, y, z); s.scale.set(s.userData.w * Math.max(k, .001), s.userData.w / 2 * Math.max(k, .001), 1); }

// ---------- night / weather ----------
const daySky = scene.background;
const nightSky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#060b1d'); gr.addColorStop(.6, '#142046'); gr.addColorStop(1, '#2a3561'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${rr(.3, 1)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 620), rr(.5, 1.8), 0, 7); g.fill(); }
  g.fillStyle = '#fdf6d8'; g.beginPath(); g.arc(400, 170, 34, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const greySky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#59636e'); gr.addColorStop(1, '#a9b2ba'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,78,88,${rr(.2, .5)})`; g.beginPath(); g.ellipse(rr(0, 540), rr(0, 500), rr(60, 160), rr(20, 50), 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hemi = scene.children.find(o => o.isHemisphereLight);
const dayFog = scene.fog.color.clone(), nightFog = new THREE.Color('#1c2547'), greyFog = new THREE.Color('#8d969c');

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .1, 600);
const KEYS = [
  [0, V(3.5, 3.0, 11.5), V(0, 1.0, 1)],
  [tw.ast, V(3.8, 3.2, 9), V(0, .9, -.6)],
  [tw.lehnst + .6, V(4.6, 3.6, 7), V(0, .8, -1.6)],
  [tw.aber1, V(4.4, 3.4, 6.6), V(0, .8, -1.6)],
  [tw.aber1 + .6, V(3.6, 2.2, 4.4), V(.3, .9, -1.2)],
  [tw.also1 - .1, V(3.4, 2.1, 4.1), V(.3, .9, -1.2)],
  [tw.also1 + .8, V(6.2, 4.4, 6.4), V(0, .7, -1.8)],
  [tw.aber2 - .1, V(5.6, 4.0, 6.0), V(0, .7, -1.8)],
  [tw.aber2 + .7, V(6.5, 3.4, 8.5), V(0, 1, -1.5)],
  [tw.tropft - .3, V(6.0, 3.2, 8.0), V(0, 1, -1.5)],
  [tw.tropft + .3, V(3.2, 1.9, 2.6), V(0, .5, -1.4)],
  [tw.also2 - .1, V(3.0, 1.8, 2.4), V(0, .5, -1.4)],
  [tw.also2 + .8, V(6.5, 4.6, 7.2), V(0, .8, -1.8)],
  [tw.halben - .3, V(5.8, 3.5, 6.0), V(.6, 1, -1.6)],
  [tw.halben + .4, V(4.4, 2.2, 3.6), V(1.6, 1.0, -1.2)],
  [tw.wasser - .1, V(4.5, 2.3, 3.8), V(1.6, 1.0, -1.2)],
  [tw.wasser + .6, V(6.5, 3.6, 5.5), V(0, .8, -1.5)],
  [tw.aber3 - .05, V(6.4, 3.5, 5.3), V(0, .8, -1.5)],
  [tw.aber3 + .6, V(4.4, 2.0, .6), V(0, .75, -1.1)],
  [tw.also3 - .1, V(4.1, 1.9, .5), V(0, .75, -1.1)],
  [tw.also3 + .7, V(4.2, 1.9, .5), V(0, .75, -1.1)],
  [tw.dreissig - .1, V(4.0, 1.8, .2), V(0, .75, -1.3)],
  [tw.dreissig + .5, V(3.4, 1.5, -.6), V(0, .7, -1.7)],
  [tw.aber4 - .1, V(3.3, 1.5, -.6), V(0, .7, -1.7)],
  [tw.aber4 + .4, V(3.8, 1.7, .4), V(0, .8, -1.1)],
  [tw.also4 - .05, V(3.8, 1.7, .4), V(0, .8, -1.1)],
  [tw.also4 + .7, V(4.6, 3.2, 7.4), V(0, .7, 1.2)],
  [tw.stapelst - .1, V(4.8, 3.0, 7.6), V(0, .7, 1.6)],
  [tw.wand + .5, V(5.2, 2.6, 7.2), V(0, .8, 2.2)],
  [tw.warme2 - .2, V(5.4, 2.5, 6.6), V(0, .8, 2.0)],
  [tw.warme2 + .5, V(6.8, 2.2, 1.2), V(0, .7, 1.2)],
  [tw.aber5 - .05, V(6.8, 2.3, 1.0), V(0, .7, 1.2)],
  [tw.aber5 + .6, V(5.4, 2.1, 4.8), V(1.2, .7, .8)],
  [tw.also5 - .1, V(4.9, 1.9, 4.4), V(1.2, .7, .8)],
  [tw.also5 + .6, V(3.2, 4.2, 6.2), V(0, .6, .4)],
  [tw.aber6 - .1, V(3.4, 4.3, 6.5), V(0, .6, .4)],
  [tw.aber6 + .8, V(5, 4.5, 9), V(1, .8, -1)],
  [tw.oben - .2, V(4, 7, 8), V(1, .5, -1)],
  [tw.oben + .9, V(1.2, 24, .4), V(1.2, 0, -.6)],
  [tw.also6 - .1, V(1.3, 25, .3), V(1.3, 0, -.7)],
  [tw.also6 + .9, V(8.5, 6.5, 10), V(12, 1, -2)],
  [tw.dreieck + .2, V(8, 8.5, 9), V(12, .5, -2)],
  [tw.grune - .1, V(8.2, 8.2, 9.5), V(12, .8, -2)],
  [tw.weiss, V(7.5, 7.5, 14), V(12, 4, -2)],
  [tw.hub - .2, V(6.5, 7.5, 16), V(10, 5.5, -2)],
  [tw.gluck, V(5, 5.5, 16.5), V(7.5, 3.6, -1.5)],
  [END, V(3.5, 5.8, 18.5), V(7, 3.8, -1.5)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- helpers for the timeline ----------
function poseDu(t, x, y, z, face, lying = false, shiver = 0, walk = false) {
  du.visible = true; du.position.set(x + shiver * .03 * Math.sin(t * 60), y + (walk ? Math.abs(Math.sin(t * 12)) * .07 : 0), z);
  du.rotation.set(lying ? -Math.PI / 2 : 0, face, 0);
  du.userData.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (.15 + shiver * .5) ; a.rotation.x = walk ? Math.sin(t * 12 + i * Math.PI) * .5 : 0; });
}
function fireAnim(f, t, k, smokeK = 0, white = 0) {
  const u = f.userData; u.fl.visible = k > .02; u.fl.scale.setScalar(Math.max(k, .001));
  u.flames.forEach((m, j) => { m.scale.y = 1 + .3 * Math.sin(t * 21 + j * 2.3) + .15 * Math.sin(t * 33 + j); m.rotation.y = t * 2 + j; });
  u.smoke.forEach((m, j) => { const ph = (t * (white ? .55 : .35) + j / u.smoke.length) % 1; m.visible = smokeK > .02;
    m.position.set(f.position.x + Math.sin(t * .8 + j * 1.7) * (.2 + ph * (white ? 1.2 : .6)), .6 + ph * (white ? 14 : 3), f.position.z + Math.cos(t * .7 + j) * .3 * ph);
    m.scale.setScalar(Math.max(.001, smokeK * (white ? .7 + ph * 2.2 : .25 + ph * .8))); });
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = V(1, 1, 1);

// ---------- the timeline ----------
function update(t) {
  // weather + time of day
  const night = win(t, tw.aber3, tw.morgen + .2, .5);
  const grey = Math.max(win(t, tw.aber2 - .2, tw.ablauft + .3, .4), .55 * win(t, tw.aber1 - .2, tw.also1, .3));
  scene.background = night > .5 ? nightSky : grey > .5 ? greySky : daySky;
  hemi.intensity = lerp(lerp(1.15, .7, grey), .3, night); sun.intensity = lerp(lerp(2.7, .9, grey), .35, night); fill.intensity = lerp(.55, .1, night);
  sun.color.set(night > .5 ? '#9fb4ff' : '#fff3e0'); renderer.toneMappingExposure = lerp(1.05, .7, night); scene.environmentIntensity = lerp(.35, .04, night);
  scene.fog.color.copy(dayFog).lerp(greyFog, grey).lerp(nightFog, night);

  // du: lost, then watches the build, sleeps in the hut, then signals at the clearing
  if (t < tw.lehnst) { const k = ease(t, 0, tw.lehnst - .3); poseDu(t, lerp(.6, 2.2, k), 0, lerp(5.6, 2.2, k), lerp(.9, -.4, k), false, 0, k < .99 && k > 0); }
  else if (t < tw.aber3) poseDu(t, 2.2, 0, 2.2, -.7 + (t > tw.aber2 ? .3 : 0), false, win(t, tw.aber1, tw.also1, .2) + .6 * win(t, tw.aber2, tw.also2, .2));
  else if (t < tw.aber6) {
    const bedH = .3 * ease(t, tw.bett - .1, tw.dreissig + .3);
    const lift = Math.sin(Math.PI * ramp(t, tw.bett - .2, tw.fichten + .4)) * .25;
    poseDu(t, 0, .22 + bedH + lift, .05, 0, true, win(t, tw.eiskalt - .2, tw.also3, .2) + win(t, tw.frierst - .2, tw.feuer1 + .6, .2));
  }
  else if (t < tw.also6) poseDu(t, 1.5, 0, 2.6, .5);
  else { const k = ease(t, tw.also6 - .1, tw.lichtung + .4); poseDu(t, lerp(9.4, 12, k), 0, lerp(3.4, 1.7, k), t > tw.hub ? Math.PI * .1 : -2.6, false, 0, k > 0 && k < 1);
    if (t > tw.hub - .2) du.userData.arms.forEach((a, i) => { a.rotation.z = (i ? 1 : -1) * (2.6 + .4 * Math.sin(t * 9 + i)); }); }
  lab(lblQ, win(t, tw.wald - .1, tw.lehnst - .3, .25), du.position.x, 2.1, du.position.z);

  // ridge pole falls against the fallen tree
  const rk = ease(t, tw.lehnst - .1, tw.lehnst + .35), rApp = pop(t, tw.ast - .1);
  ridge.visible = rApp > .01; ridge.scale.set(1, Math.max(rApp, .001), 1);
  ridge.position.set(0, 0, BACKZ); ridge.rotation.set(lerp(.15, ridgeTilt, rk), 0, 0);

  // cutaway of the +x side while we look inside
  const cut = t > tw.aber3 - .05 && t < tw.also4 + .2;
  RIBS.forEach(r => { if (r.s > 0 && cut) r.m.visible = false; });
  // wind
  const wk = win(t, tw.aber1, tw.also1 + .1, .25);
  winds.forEach((m, i) => { const ph = (t * 1.2 + i * .37) % 1; m.visible = wk > .02; m.material.opacity = .6 * wk;
    m.position.set(lerp(-6, 6, ph), .4 + (i % 7) * .22 + .15 * Math.sin(ph * 9 + i), -2.5 + (i % 5) * .7); });

  // ribs
  RIBS.forEach(({ m, i, s }) => { const a = lerp(tw.beiden - .1, tw.zelt - .3, i / 12) + (s > 0 ? .08 : 0); const k = back(ramp(t, a, a + .3));
    m.visible = k > .01; m.scale.set(1, Math.max(k, .001), 1); });

  RIBS.forEach(r => { if (r.s > 0 && cut) r.m.visible = false; });
  // rain + drips + puddle
  const rk2 = win(t, tw.aber2 - .1, tw.aber3 + .1, .35); rain.visible = rk2 > .02;
  if (rain.visible) { rain.material.opacity = .55 * rk2; for (let i = 0; i < RAINN; i++) { const [x, y, z] = RP[i]; _m.makeTranslation(x, ((y - t * 13) % 12 + 12) % 12, z); rain.setMatrixAt(i, _m); } rain.instanceMatrix.needsUpdate = true; }
  const th = .5 * ease(t, tw.laub - .1, tw.halben + .2);
  drips.forEach((m, i) => { const ph = (t * 1.3 + i * .23) % 1; m.visible = t > tw.tropft - .2 && t < tw.also2 + .6 && th < .15; m.position.set(-.4 + i * .17, lerp(1.25 - Math.abs(-.4 + i * .17) * .7, .2, ph), -.6 - i * .25); });
  const pk = ease(t, tw.tropft, tw.also2 + .2) * (1 - ease(t, tw.wasser, tw.aber3)); puddle.visible = pk > .02; puddle.scale.set(.6 * pk, 1, 1.0 * pk);

  // leaf blanket
  setBlanket(th); blank[1].m.visible = blank[1].m.visible && !cut; ridgeCap.visible = ridgeCap.visible && !cut;
  const fk = win(t, tw.laub - .2, tw.halben + .4, .2);
  fallLeaves.visible = fk > .02;
  if (fallLeaves.visible) { FL.forEach(([x, z, ph, r], i) => { const p = (t * .9 + ph) % 1; const yb = hAt(Math.min(z, HUTZ)) * (1 - Math.abs(x) / 2.2) + th;
      _q.setFromEuler(_e.set(t * 3 + r, r, t * 2)); _m.compose(V(x + Math.sin(t * 2 + r) * .3, Math.max(yb, 0) + (1 - p) * 5, z), _q, _s); fallLeaves.setMatrixAt(i, _m); }); fallLeaves.instanceMatrix.needsUpdate = true; }
  const k50 = win(t, tw.halben - .1, tw.aber3, .25); lab(lbl50, k50, 2.6, 1.9, -.9);
  dim50.visible = k50 > .01; dim50.position.set(1.32, .95, -.9); dim50.rotation.set(0, 0, -Math.atan2(1.0, .65)); dim50.scale.set(1, .5 * Math.max(k50, .001), 1);
  runoff.forEach((m, i) => { const ph = (t * 1.1 + i / 8) % 1, s = i % 2 ? 1 : -1, z = -.4 - (i >> 1) * .8; const k = win(t, tw.wasser - .1, tw.aber3, .2);
    const h = hAt(z), w = wAt(z); m.visible = k > .02; m.position.set(s * lerp(.15 + th * .6, w + th + .15, ph), lerp(h + th + .1, .15, ph), z); });

  // cold ground: frost + arrows down
  const ck = win(t, tw.boden - .1, tw.also3 + .4, .3);
  frost.material.opacity = .45 * ck * (1 - ease(t, tw.fichten, tw.dreissig));
  coldArrows.forEach((a, i) => { const ph = (t * .9 + i / 6) % 1; const k = ck * win(t, tw.warme1 - .3, tw.also3 + .4, .2); a.visible = k > .02;
    a.position.set(-.3 + (i % 3) * .3, .55 - ph * .55, -.3 - Math.floor(i / 3) * .7); a.scale.setScalar(.3 * k); a.material.opacity = .9 * (1 - ph); a.rotation.set(Math.PI, 0, 0); });

  // spruce bed
  const bh = .3 * ease(t, tw.bett - .1, tw.dreissig + .3); bed.visible = bh > .005; bed.scale.set(1, Math.max(bh, .001), 1);
  bed.children[1].visible = true;
  const k30 = win(t, tw.dreissig - .1, tw.aber4 + .1, .25); lab(lbl30, k30, .3, 1.15, -1.6);
  dim30.visible = k30 > .01; dim30.position.set(.62, .15, -2.6); dim30.scale.set(1, .3 * Math.max(k30, .001), 1);

  // fire + reflector wall + heat
  const fireK = pop(t, tw.feuer1 - .1) * (1 - ease(t, tw.morgen - .2, tw.morgen + .6));
  fireAnim(mainFire, t, fireK, t > tw.morgen - .2 ? win(t, tw.morgen - .2, tw.oben, .3) : fireK * .5);
  mainFire.visible = t > tw.feuer1 - .3; fireLight.intensity = fireK * (10 + 2.5 * Math.sin(t * 19)) * (.4 + night);
  wallStakes.forEach((s, i) => { const k = pop(t, tw.stapelst - .2 + i * .05); s.visible = k > .01; s.scale.set(1, Math.max(k, .001), 1); });
  wallLogs.forEach((l, i) => { const k = ease(t, tw.stapelst + .1 + i * .32, tw.stapelst + .4 + i * .32); l.visible = k > .01; l.position.y = .14 + i * .27 + (1 - k) * 1.5; });
  const hk = win(t, tw.warme2 - .2, tw.aber5 + .3, .3) + .5 * win(t, tw.aber5 + .3, tw.morgen, .3);
  heat.forEach((m, i) => { const ph = (t * .6 + i / heat.length) % 1; m.visible = hk > .02; m.scale.setScalar(Math.max(hk, .001) * (1 - ph * .4));
    const p = ph < .35 ? V(0, .5, 2.25).lerp(V((i % 5 - 2) * .25, .7, WALLZ - .2), ph / .35) : V((i % 5 - 2) * .25, .7, WALLZ - .2).lerp(V((i % 5 - 2) * .12, .55, -.6), (ph - .35) / .65);
    p.y += Math.sin(ph * 9 + i) * .1; m.position.copy(p); });

  // wild boar
  const bIn = ease(t, tw.aber5 + .1, tw.schnuff), bOut = ease(t, tw.tur - .1, tw.tur + 1.4);
  pig.visible = t > tw.aber5 && t < tw.aber6;
  const bx = lerp(7, 1.75, bIn) + bOut * 7, bz = lerp(4.5, 1.1, bIn) + bOut * 2.5;
  pig.position.set(bx, 0, bz); pig.rotation.y = bOut > 0 ? Math.PI * .85 : lerp(.55, -.65, bIn) + Math.PI * .0 - .2;
  pig.rotation.y = bOut > .01 ? .35 : bIn > .99 ? Math.PI + .25 : -Math.atan2(1.1 - bz, 1.75 - bx - .001) ;
  const walking = (bIn > .01 && bIn < .99) || (bOut > .01 && bOut < .99);
  pig.userData.legs.forEach((l, i) => l.rotation.z = walking ? Math.sin(t * 16 + i * Math.PI / 2) * .5 : 0);
  pig.userData.hd.rotation.z = t > tw.schnuff - .1 && t < tw.stopfst ? -.25 + .15 * Math.sin(t * 22) : 0;
  lab(lblEx, win(t, tw.schnuff, tw.bundel, .2), .2, 2.1, -.2);

  // door bundle
  const dk = ease(t, tw.stopfst, tw.bundel + .2);
  door.visible = dk > .01; door.position.set(lerp(3, 0, dk), lerp(2.5, 0, dk), lerp(3.5, HUTZ + .35, dk)); door.rotation.set(-.35 * dk, (1 - dk) * 1.5, 0);
  door.scale.set(1, 1, 1);

  // from above: "?" over the forest
  lab(lblQ2, win(t, tw.oben + .5, tw.also6, .3), 1.2, 6, -.4);

  // signal fires + triangle + SOS + green twigs + white smoke
  SIG.forEach((f, i) => { const on = i === 0 ? tw.drei : i === 1 ? tw.feuer2 : tw.feuer2 + .3; f.visible = t > on - .3;
    const k = pop(t, on - .05); const white = ease(t, tw.weiss - .3, tw.qualmen + .3);
    fireAnim(f, t, k * (1 - .35 * white), k * (.25 + .75 * white), white > .05 ? 1 : 0);
    greens[i].visible = t > tw.zweige - .4; greens[i].position.y = lerp(3, 0, ease(t, tw.zweige - .4 + i * .12, tw.zweige + i * .12)); });
  triLines.forEach((m, i) => { const k = ease(t, tw.dreieck - .1 + i * .15, tw.dreieck + .25 + i * .15) * (1 - ease(t, tw.weiss, tw.qualmen)); m.visible = k > .01; m.scale.z = Math.max(k * m.userData.len, .001); });
  lab(lblSOS, win(t, tw.notsig - .1, tw.zweige + .2, .3), CLR.x, 3.8, CLR.z);

  // helicopter
  const hk2 = ease(t, tw.hub - .5, tw.gluck + 1.6);
  copter.visible = t > tw.hub - .6;
  copter.position.set(lerp(30, 9.5, hk2), lerp(15, 7.2, hk2) + .2 * Math.sin(t * 2), lerp(-14, -4.5, hk2));
  copter.rotation.set(0, Math.PI * .82, lerp(.22, .05, hk2)); copter.userData.rot.rotation.y = t * 31;

  placeCamera(t);
}

window.END = END;
window.TW = tw;
window.renderAt = (t, q = .9) => { update(t); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', q); };
window.__done = true;
