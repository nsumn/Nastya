// ===================== 06 Kätzchen — "Jeder Follower ist ein Stein" (community format) =====================
// Built as: cat lib.js katze_main.js > katze.js   (./render_video.sh katze 06_kaetzchen)
// Exports window.SFX (sound events on word times) -> sfx.py mixes them with music under the voice.

await document.fonts.load('700 96px Fredoka');

// ---------- words / timing ----------
const WORDS = await (await fetch('../06_kaetzchen/words.json')).json();
const NAMES = await (await fetch('../06_kaetzchen/names.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) {
  let k = 0;
  for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s;
  throw new Error('word not found: ' + word + ' #' + n);
}
const END = WORDS[WORDS.length - 1][2] + 1.6;
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

const tw = {
  friert: T('friert'), winter: T('Winter'), halbes: T('halbes'), schau: T('schau'), stein1: T('Stein'), name1: T('Name'),
  jeder: T('Jeder'), mensch: T('Mensch'), folgt: T('folgt'), vier6: T('Viertausendsechshundert'), waende: T('Wände'),
  aber2: T('Aber', 2), dach1: T('Dach'), loch: T('Loch'), schnee1: T('Schnee'), koerb1: T('Körbchen'),
  also1: T('Also'), mehr: T('mehr'), zehn1: T('zehntausend'),
  folgst: T('Folgst'), neuen: T('neuen'), geschr: T('geschrieben'),
  komm: T('Kommentierst'), vorne: T('vorne'), tuer: T('Tür'),
  likest: T('Likest'), waermer: T('wärmer'),
  bei5: T('fünftausend'), dach2: T('Dach', 2), bei7: T('siebentausend'), kamin: T('Kamin'), feuer: T('Feuer'),
  bei8: T('achttausend'), fenster: T('Fenster'), schnee2: T('Schnee', 2),
  bei10: T('zehntausend', 2), turm: T('Turm'), ganz: T('Ganz'), blick: T('Blick'), wald: T('Wald'),
  stell: T('Stell'), zehnN: T('Zehntausend'), haelt: T('hält'), zusammen: T('zusammen'),
  aber3: T('Aber', 3), wartet: T('wartet'), nacht: T('Nacht'), minus: T('minus'), grad: T('Grad'),
  kuschelt: T('kuschelt'), ecke: T('Ecke'), meisten: T('meisten'),
  also2: T('Also', 2), nach: T('nach', 2), dabei: T('dabei'), wenn: T('Wenn'), folg: T('folg', 2), dein3: T('Dein'), teil: T('Teil'),
  und9: T('schreib'), komms: T('Kommentare'), erstes: T('Erstes'), soll: T('soll', 2) };

// ---------- sound events (exported for sfx.py) ----------
const SFX = { end: END, music: 'musicbox', music_gain: .17, events: [], beds: [] };
const sfx = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);

// ---------- world: winter clearing ----------
const snowC = plainCanvas('#eef4fb', 10, 256, { n: 900, cols: ['#dfe9f5', '#ffffff', '#d3e1f0'], r: [1, 5] });
const snowMat = new THREE.MeshStandardMaterial({ map: tex(snowC, 8, 8), roughness: .9, color: '#f4f8ff' });
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), snowMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const snowWhite = M('#f6f9ff', { roughness: .8 });
function pine(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.12 * s, .2 * s, 1.2 * s, 7), M('#5b4632')); tr.position.y = .6 * s; tr.castShadow = true; g.add(tr);
  const gm = M(pick(['#2f5d3a', '#356b40', '#2a5233']), { roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i++) { const r = (1.5 - i * .3) * s, h = 1.5 * s, y = (1.1 + i * .85) * s;
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), gm); c.position.y = y; c.castShadow = true; g.add(c);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * .72, h * .45, 8), snowWhite); sn.position.y = y + h * .3; g.add(sn); }
  return g;
}
for (let i = 0; i < 28; i++) {
  const a = rr(0, Math.PI * 2), d = rr(7, 22); const x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
  if (z > 3 && Math.abs(x) < 8) continue;
  pine(x, z, rr(.9, 1.7));
}
for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(rr(.4, 1.1), 12, 8), snowMat); m.scale.y = .35; m.position.set(rr(-12, 12), 0, rr(-14, 6)); if (Math.abs(m.position.x) < 3.2 && m.position.z > -3 && m.position.z < 3) continue; m.receiveShadow = true; scene.add(m); }

// winter sky (dusk) + night sky
const daySky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#6f8fc4'); gr.addColorStop(.45, '#a9bfe0'); gr.addColorStop(.75, '#f2d9d5'); gr.addColorStop(1, '#f7e6dc'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let k = 0; k < 10; k++) { const cx = rr(-50, 590), cy = rr(60, 380), sc = rr(.6, 1.4);
    for (let i = 0; i < 22; i++) { const x = cx + rr(-90, 90) * sc, y = cy + rr(-20, 16) * sc, r = rr(18, 44) * sc; const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,.6)'); rg.addColorStop(1, 'rgba(230,235,250,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const nightSky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#050a1c'); gr.addColorStop(.6, '#15204a'); gr.addColorStop(1, '#2c3a6e'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${rr(.3, 1)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 640), rr(.5, 1.8), 0, 7); g.fill(); }
  g.fillStyle = '#fdf6d8'; g.beginPath(); g.arc(130, 160, 30, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
scene.background = daySky; scene.fog = new THREE.Fog('#d9e2f2', 25, 90);
const hemi = scene.children.find(o => o.isHemisphereLight);
const dayFog = scene.fog.color.clone(), nightFog = new THREE.Color('#1a2450');
sun.color.set('#ffe4d0'); sun.position.set(-10, 18, 14); sun.target.position.set(0, 0, 0);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 }); sun.shadow.camera.updateProjectionMatrix();

// ---------- brick bhouse with names ----------
const HX = 2.0, HZ = 1.5, BH = .2, BL = .4, ROWS = 11, WALL_H = ROWS * BH;
const DOOR = { x0: -.42, x1: .42, rows: 6 };
const CW = 256, CH = 128, ACOL = 16, AROW = 32;                 // atlas 4096 x 4096, 512 cells
const [atlasC, ag] = cv(CW * ACOL, CH * AROW);
function brickCell(i, name, gold = false) {
  const x = (i % ACOL) * CW, y = Math.floor(i / ACOL) * CH;
  const base = gold ? '#e9b733' : pick(['#b5523b', '#a8472f', '#c05d43', '#9f4630', '#b9583c', '#ad4d36']);
  ag.fillStyle = base; ag.fillRect(x, y, CW, CH);
  for (let k = 0; k < 60; k++) { ag.fillStyle = `rgba(${rnd() < .5 ? '0,0,0' : '255,220,200'},${rr(.04, .12)})`; ag.fillRect(x + rr(0, CW), y + rr(0, CH), rr(2, 10), rr(2, 8)); }
  ag.fillStyle = 'rgba(0,0,0,.18)'; ag.fillRect(x, y + CH - 8, CW, 8); ag.fillStyle = 'rgba(255,255,255,.12)'; ag.fillRect(x, y, CW, 6);
  if (name) {
    let fs = 44; ag.font = `700 ${fs}px Fredoka`; while (ag.measureText(name).width > CW - 26 && fs > 22) { fs -= 2; ag.font = `700 ${fs}px Fredoka`; }
    ag.textAlign = 'center'; ag.textBaseline = 'middle'; ag.fillStyle = gold ? '#5a3a00' : 'rgba(255,240,225,.92)';
    ag.fillText(name, x + CW / 2, y + CH / 2 + 2);
  }
}
brickCell(0, '');
const bricks = [];        // {x,y,z,side,cell}
let cell = 1;
const wallsDef = [ // [axis along, fixed coord, normal sign]
  { w: 0, along: 'x', fixed: HZ, len: 2 * HX },   // front (+z)
  { w: 1, along: 'z', fixed: HX, len: 2 * HZ },   // right (+x)
  { w: 2, along: 'x', fixed: -HZ, len: 2 * HX },  // back
  { w: 3, along: 'z', fixed: -HX, len: 2 * HZ }]; // left
for (let r = 0; r < ROWS; r++) for (const wd of wallsDef) {
  const n = Math.round(wd.len / BL), off = (r % 2) * BL / 2;
  for (let i = 0; i < n; i++) {
    let a = -wd.len / 2 + off + (i + .5) * BL; if (a > wd.len / 2 - BL * .25) continue;
    if (wd.w === 0 && r < DOOR.rows && a > DOOR.x0 - .05 && a < DOOR.x1 + .05) continue;
    const y = r * BH + BH / 2;
    const p = wd.along === 'x' ? [a, y, wd.fixed] : [wd.fixed, y, a];
    const c = cell < AROW * ACOL ? cell++ : 1 + (cell++ % (AROW * ACOL - 1));
    if (c < AROW * ACOL && c === cell - 1) brickCell(c, NAMES[(c - 1) % NAMES.length]);
    bricks.push({ p, along: wd.along, row: r, wall: wd.w, cell: c, a });
  }
}
const atlas = new THREE.CanvasTexture(atlasC); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 8;
const brickMat = new THREE.MeshStandardMaterial({ map: atlas, roughness: .85, vertexColors: true });
const brickGeo = (() => {
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const g0 = new THREE.BoxGeometry(BL - .02, BH - .02, .2 - .02);
  const g1 = new THREE.BoxGeometry(.2 - .02, BH - .02, BL - .02);
  const P0 = g0.attributes.position.array, N0 = g0.attributes.normal.array, U0 = g0.attributes.uv.array, I0 = g0.index.array;
  const P1 = g1.attributes.position.array, N1 = g1.attributes.normal.array, U1 = g1.attributes.uv.array;
  bricks.forEach((b, bi) => {
    const Pa = b.along === 'x' ? P0 : P1, Na = b.along === 'x' ? N0 : N1, Ua = b.along === 'x' ? U0 : U1;
    const base = pos.length / 3; b.v0 = base;
    for (let v = 0; v < 24; v++) {
      const face = Math.floor(v / 4);  // 0 +x,1 -x,2 +y,3 -y,4 +z,5 -z
      const named = b.along === 'x' ? face >= 4 : face <= 1;
      const c = named ? b.cell : 0; let u = Ua[v * 2], w = Ua[v * 2 + 1];
      if (named && ((b.along === 'x' && face === 5) || (b.along === 'z' && face === 1))) u = 1 - u;
      if (b.along === 'z' && named) { /* side wall: text along z */ }
      const cx = (c % ACOL) / ACOL, cy = 1 - (Math.floor(c / ACOL) + 1) / AROW;
      uv.push(cx + (u * .96 + .02) / ACOL, cy + (w * .94 + .03) / AROW);
      pos.push(Pa[v * 3] + b.p[0], Pa[v * 3 + 1] + b.p[1], Pa[v * 3 + 2] + b.p[2]); nor.push(Na[v * 3], Na[v * 3 + 1], Na[v * 3 + 2]); col.push(1, 1, 1);
    }
    for (const i of I0) idx.push(base + i);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
})();
const bhouse = new THREE.Group(); scene.add(bhouse);
const wallMesh = new THREE.Mesh(brickGeo, brickMat); wallMesh.castShadow = wallMesh.receiveShadow = true; bhouse.add(wallMesh);
const mortar = new THREE.Mesh(new THREE.BoxGeometry(2 * HX - .1, WALL_H - .02, 2 * HZ - .1), M('#d8d0c4', { roughness: 1 })); mortar.position.y = WALL_H / 2; bhouse.add(mortar);
mortar.visible = false; // inside is visible from above; the mortar box would hide the interior
const floor = new THREE.Mesh(new THREE.BoxGeometry(2 * HX, .06, 2 * HZ), woodMatK()); floor.position.y = .03; floor.receiveShadow = true; bhouse.add(floor);
function woodMatK() { const [c, g] = cv(256, 256); g.fillStyle = '#9a6b3e'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = `hsl(28,${40 + rnd() * 10}%,${32 + rnd() * 10}%)`; g.fillRect(0, y + 1, 256, 30); g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, y, 256, 2); }
  noise(g, 256, 256, 14); return new THREE.MeshStandardMaterial({ map: tex(c, 2, 2), roughness: .9 }); }
const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(DOOR.x1 - DOOR.x0, DOOR.rows * BH, .06), woodMatK()); doorMesh.geometry.translate((DOOR.x1 - DOOR.x0) / 2, DOOR.rows * BH / 2, 0);
doorMesh.position.set(DOOR.x0, 0, HZ + .02); doorMesh.castShadow = true; bhouse.add(doorMesh); doorMesh.rotation.y = -1.2;
const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.05, .08, .24), woodMatK()); lintel.position.set(0, DOOR.rows * BH + .02, HZ); bhouse.add(lintel);

// snow pile inside (falls through the missing roof)
const pile = new THREE.Mesh(new THREE.SphereGeometry(.7, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), snowMat); pile.position.set(.7, .05, -.35); bhouse.add(pile);

// ---------- future upgrades (milestones) ----------
const roofMatK = M('#4a5a7a', { roughness: .7 });
const roof = new THREE.Group(); bhouse.add(roof);
{ const L = 2 * HZ + .5, sl = Math.hypot(HX + .3, 1.3);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(sl, .1, L + .3), roofMatK); p.position.set(s * (HX + .3) / 2, WALL_H + .65, 0); p.rotation.z = -s * Math.atan2(1.3, HX + .3); p.castShadow = true; roof.add(p);
    const sn = new THREE.Mesh(new THREE.BoxGeometry(sl * .96, .08, L + .2), snowWhite); sn.position.copy(p.position).add(V(0, .08, 0)); sn.rotation.copy(p.rotation); roof.add(sn); }
  const gable = new THREE.Shape(); gable.moveTo(-HX, 0); gable.lineTo(HX, 0); gable.lineTo(0, 1.3); gable.closePath();
  for (const z of [HZ, -HZ]) { const m = new THREE.Mesh(new THREE.ShapeGeometry(gable), M('#b5523b', { side: THREE.DoubleSide })); m.position.set(0, WALL_H, z * .99); roof.add(m); } }
roof.userData.y = 0;
const chimney = new THREE.Group(); bhouse.add(chimney);
{ const c = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.6, .5), M('#8a3b2a')); c.position.set(-1.2, WALL_H + 1.0, -.5); c.castShadow = true; chimney.add(c);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(.6, .1, .6), snowWhite); cap.position.set(-1.2, WALL_H + 1.85, -.5); chimney.add(cap); }
const fireplace = new THREE.Group(); bhouse.add(fireplace);
{ const fb = new THREE.Mesh(new THREE.BoxGeometry(.9, .8, .4), M('#7a3424')); fb.position.set(-1.0, .4, -1.25); fireplace.add(fb);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(.55, .45, .1), M('#1a0c06')); hole.position.set(-1.0, .3, -1.03); fireplace.add(hole); }
const flames = []; for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.08 + i % 2 * .03, .35, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffb020' : '#ff5a1a', transparent: true, opacity: .95 })); f.position.set(-1.18 + i * .09, .25, -.97); fireplace.add(f); flames.push(f); }
const fireLight = new THREE.PointLight('#ff9a40', 0, 6, 1.5); fireLight.position.set(-1.0, .7, -.5); bhouse.add(fireLight);
const smoke = []; for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), new THREE.MeshStandardMaterial({ color: '#e8eaf0', transparent: true, opacity: .6 })); bhouse.add(s); smoke.push(s); }
const windowG = new THREE.Group(); bhouse.add(windowG);
{ const fr = new THREE.Mesh(new THREE.BoxGeometry(.9, .7, .26), woodMatK()); fr.position.set(HX, 1.3, 0); fr.rotation.y = Math.PI / 2; windowG.add(fr);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(.72, .54, .28), new THREE.MeshStandardMaterial({ color: '#ffe8a0', emissive: '#ffcc55', emissiveIntensity: .9 })); gl.position.copy(fr.position); gl.rotation.y = Math.PI / 2; windowG.add(gl);
  const cr = new THREE.Mesh(new THREE.BoxGeometry(.06, .54, .3), woodMatK()); cr.position.copy(fr.position); windowG.add(cr); }
const tower = new THREE.Group(); bhouse.add(tower);
{ const tb = new THREE.Mesh(new THREE.CylinderGeometry(.8, .9, 3.2, 16), M('#b5523b')); tb.position.set(1.2, WALL_H + 1.6 + 1.3, -.4); tb.castShadow = true; tower.add(tb);
  const top = WALL_H + 4.5; const pl = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .12, 20), woodMatK()); pl.position.set(1.2, top, -.4); tower.add(pl);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(.28, .3, .2), M('#b5523b')); m.position.set(1.2 + Math.sin(a) * .85, top + .2, -.4 + Math.cos(a) * .85); m.rotation.y = a; tower.add(m);
    const c = new THREE.Mesh(new THREE.BoxGeometry(.3, .06, .22), snowWhite); c.position.copy(m.position).add(V(0, .18, 0)); c.rotation.y = a; tower.add(c); }
  for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(.25, .35, .1), new THREE.MeshStandardMaterial({ color: '#ffe8a0', emissive: '#ffcc55', emissiveIntensity: .8 })); const a = i / 6 * Math.PI * 2; w.position.set(1.2 + Math.sin(a) * .82, WALL_H + 3.6, -.4 + Math.cos(a) * .82); w.rotation.y = a; tower.add(w); }
  const fl = new THREE.Mesh(new THREE.BoxGeometry(.5, .3, .02), M('#ff4f7b')); fl.position.set(.45, WALL_H + 4.5 + 1.25, -1.0); tower.add(fl);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .8), M('#444')); pole.position.set(.2, WALL_H + 4.5 + 1.0, -1.0); pole.scale.y = 2; tower.add(pole); }
const TOWER_TOP = V(1.2, WALL_H + 4.56, -.4);

// ---------- Mimi the kitten ----------
const furO = M('#f0a050', { roughness: .85 }), furW = M('#fff6ea', { roughness: .85 }), pinkM = M('#ff9fb4', { roughness: .5 }), eyeM = M('#141414', { roughness: .15 }), shineM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const scarfM = M('#e8344e', { roughness: .8 });
function kitten() {
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
const mimi = kitten(); const KS = 1.9;
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

// basket + blanket
const basket = new THREE.Group(); bhouse.add(basket);
{ const bm = M('#a8743d', { roughness: .95 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(.42, .35, .2, 24, 1, true), bm); b.position.y = .12; b.material.side = THREE.DoubleSide; basket.add(b);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 8, 24), bm); rim.rotation.x = Math.PI / 2; rim.position.y = .22; basket.add(rim);
  const bl = new THREE.Mesh(new THREE.CylinderGeometry(.36, .34, .06, 24), M('#7fb4e6')); bl.position.y = .1; basket.add(bl); }
basket.position.set(.7, 0, -.65); basket.scale.setScalar(1.8);

// falling snow
const flakeN = 700, flakeG = new THREE.BufferGeometry(), flakeP = new Float32Array(flakeN * 3), flakeSeed = [];
for (let i = 0; i < flakeN; i++) flakeSeed.push([rr(-8, 8), rr(0, 9), rr(-7, 7), rr(.6, 1.2), rr(0, 6)]);
flakeG.setAttribute('position', new THREE.BufferAttribute(flakeP, 3));
const flakeTex = (() => { const [c, g] = cv(32, 32); const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32); return tex(c); })();
const flakes = new THREE.Points(flakeG, new THREE.PointsMaterial({ size: .09, map: flakeTex, transparent: true, depthWrite: false })); scene.add(flakes);
// snow column falling into the basket through the roof hole
const holeN = 120, holeG = new THREE.BufferGeometry(), holeP = new Float32Array(holeN * 3); holeG.setAttribute('position', new THREE.BufferAttribute(holeP, 3));
const holeFlakes = new THREE.Points(holeG, new THREE.PointsMaterial({ size: .07, map: flakeTex, transparent: true, depthWrite: false })); scene.add(holeFlakes);

// the viewer's own new brick (gold, "@du")
const NEWCELL = AROW * ACOL - 1; brickCell(NEWCELL, '@du', true); atlas.needsUpdate = true;
const myBrick = (() => { const g = new THREE.BoxGeometry(BL - .02, BH - .02, .18); const uvs = g.attributes.uv.array; const cx = (NEWCELL % ACOL) / ACOL, cy = 1 - (Math.floor(NEWCELL / ACOL) + 1) / AROW;
  for (let i = 0; i < uvs.length; i += 2) { uvs[i] = cx + (uvs[i] * .96 + .02) / ACOL; uvs[i + 1] = cy + (uvs[i + 1] * .94 + .03) / AROW; }
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: atlas, emissive: '#ffcc33', emissiveIntensity: .0, roughness: .5 })); m.castShadow = true; scene.add(m); return m; })();
const sparkles = []; for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.035), new THREE.MeshBasicMaterial({ color: i % 2 ? '#fff2a0' : '#ffffff' })); scene.add(s); sparkles.push(s); }
const hearts = []; const heartShape = (() => { const s = new THREE.Shape(); s.moveTo(0, -.1); s.bezierCurveTo(-.16, .02, -.08, .14, 0, .06); s.bezierCurveTo(.08, .14, .16, .02, 0, -.1); return s; })();
for (let i = 0; i < 10; i++) { const h = new THREE.Mesh(new THREE.ShapeGeometry(heartShape), new THREE.MeshBasicMaterial({ color: '#ff3d6e', transparent: true, side: THREE.DoubleSide })); scene.add(h); hearts.push(h); }
const puffs = []; for (let i = 0; i < 10; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.35, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .8 })); scene.add(p); puffs.push(p); }

// ---------- 3D labels ----------
function label(text, w = 3, fill = '#ffd21f') {
  const [c, g] = cv(768, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, 384, 132); g.fillStyle = fill; g.fillText(text, 384, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w, w / 3, 1); s.renderOrder = 10; s.userData.w = w; scene.add(s); return s;
}
function setLabel(s, k, x, y, z) { s.visible = k > .01; s.position.set(x, y, z); s.scale.set(s.userData.w * k, s.userData.w / 3 * k, 1); }
const wallNums = [label('1', 2.0), label('2', 2.0), label('3', 2.0), label('4', 2.0)];
const lblMinus = label('-10 °C', 2.4, '#bfe8ff'), lblBrr = label('BRRR', 1.2, '#bfe8ff'), lblTeil2 = label('TEIL 2', 2.4, '#ffd21f');
const lblMs = { 5: label('5.000', 1.9), 7: label('7.000', 1.9), 8: label('8.000', 1.9), 10: label('10.000', 2.3) };
const lblQ = label('?', 1.6, '#ff6a6a');

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .05, 300);
const BR_FRONT = bricks.filter(b => b.wall === 0);
const findBrick = (row, a) => BR_FRONT.reduce((best, b) => Math.abs(b.row - row) + Math.abs(b.a - a) < Math.abs(best.row - row) + Math.abs(best.a - a) ? b : best);
const nameBrick = findBrick(7, -1.0), nameBrick2 = findBrick(8, -.6), nameBrick3 = findBrick(6, 1.2), doorSpot = V(DOOR.x1 + .25, .5, HZ + .12);
const NB = V(...nameBrick.p);
const KEYS = [
  [0, V(.3, 1.3, 1.4), V(.7, .78, -.65)],                    // close on the shivering kitten
  [tw.winter - .3, V(.35, 1.35, 1.4), V(.7, .78, -.65)],
  [tw.halbes - .6, V(.8, 3.6, 1.0), V(.7, .4, -.35)],          // rise out through the missing roof
  [tw.halbes + .1, V(3.2, 3.2, 7.4), V(0, 1.2, 0)],            // pull out: half a bhouse
  [tw.schau - .05, V(3.0, 3.0, 7.0), V(0, 1.2, 0)],
  [tw.stein1, V(NB.x + .15, NB.y + .05, NB.z + 1.25), NB],      // push in: names on bricks
  [tw.jeder, V(NB.x + .35, NB.y + .1, NB.z + 1.15), V(NB.x + .25, NB.y, NB.z)],
  [tw.folgt, V(NB.x + .9, NB.y + .2, NB.z + 1.6), V(NB.x + .7, NB.y, NB.z)],
  [tw.vier6 + .2, V(4.6, 3.4, 8.6), V(0, 1.1, 0)],
  [tw.waende + .2, V(5.6, 4.6, 8.0), V(0, 1.0, 0)],
  [tw.aber2 + .4, V(1.8, 6.6, 4.2), V(.3, .4, -.2)],           // from above: no roof
  [tw.koerb1, V(1.2, 4.2, 1.6), V(.7, .2, -.35)],
  [tw.also1 + .2, V(1.6, 4.0, 2.0), V(.7, .3, -.3)],
  [tw.folgst - .1, V(2.6, 2.2, 6.4), V(.2, 1.3, 0)],
  [tw.geschr, V(2.2, 2.0, 5.6), V(.2, 1.4, 0)],
  [tw.komm + .3, V(1.6, 1.1, 4.4), V(.6, .7, HZ)],             // next to the door
  [tw.tuer + .2, V(1.4, 1.0, 4.0), V(.6, .6, HZ)],
  [tw.likest + .3, V(.9, 2.8, 3.0), V(.7, .4, -.35)],           // warmer inside
  [tw.waermer + .3, V(1.0, 2.9, 3.2), V(.7, .4, -.35)],
  [tw.bei5 + .4, V(5.6, 3.6, 8.8), V(0, 1.8, 0)],               // milestones: roof
  [tw.kamin, V(5.0, 3.8, 8.0), V(-.6, 2.2, 0)],
  [tw.feuer + .2, V(.3, .75, 3.2), V(-1.0, .4, -1.2)],        // fire (look in through the door/roof)
  [tw.fenster - .1, V(.35, .78, 3.0), V(-1.0, .4, -1.2)],
  [tw.fenster + .4, V(6.2, 2.0, 2.2), V(HX, 1.3, 0)],           // window from outside
  [tw.bei10 - .1, V(6.0, 2.0, 2.4), V(HX, 1.3, 0)],
  [tw.turm + .3, V(5.4, 3.0, 9.0), V(.6, 4.2, -.4)],             // tower rises
  [tw.blick - .2, V(3.6, TOWER_TOP.y + 1.3, 2.4), V(1.2, TOWER_TOP.y + .5, -.4)],      // up top with Mimi
  [tw.wald + .2, V(1.9, TOWER_TOP.y + 1.6, 2.2), V(-4, TOWER_TOP.y - 1.5, -14)],
  [tw.stell + .3, V(4.0, 5.0, 12.5), V(0, 2.4, 0)],
  [tw.zusammen, V(-3.0, 5.6, 13.5), V(0, 2.4, 0)],
  [tw.aber3 + .3, V(.5, 2.8, 6.6), V(0, 1.0, 0)],
  [tw.minus, V(.5, 2.6, 6.2), V(0, 1.0, 0)],
  [tw.kuschelt + .2, V(-.4, 3.4, 1.0), V(-1.3, .3, -.9)],         // Mimi curls into the corner
  [tw.also2, V(-.6, 3.5, 1.0), V(-1.4, .2, -.9)],
  [tw.nach + .3, V(-1.3, 1.2, 3.2), V(-1.4, 1.0, HZ)],          // search for your name along the wall
  [tw.dabei + .3, V(1.4, 1.3, 3.2), V(1.4, 1.1, HZ)],
  [tw.folg + .1, V(1.2, 1.6, 5.4), V(.1, 1.0, HZ)],
  [tw.komms, V(1.4, 1.7, 5.8), V(.1, 1.0, HZ)],
  [END, V(1.3, 1.6, 5.5), V(.1, 1.0, HZ)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
  // gentle handheld drift
  camera.position.x += Math.sin(t * .7) * .03; camera.position.y += Math.sin(t * .9 + 1) * .02;
}

// ---------- sound design (word-synced) ----------
{
  const e = sfx;
  SFX.beds.push([0, tw.folgst, 'wind', .9], [tw.aber3 - .2, tw.also2 + .5, 'wind', 1.3], [tw.kamin, tw.fenster + .2, 'fire', .9], [tw.kuschelt, tw.also2 + .3, 'purr', .5]);
  e(.15, 'meow_sad', .9); e(tw.friert, 'brr', .8); e(tw.halbes - .1, 'whoosh', .6);
  e(tw.stein1 - .25, 'whoosh', .5); e(tw.name1, 'sparkle', .7);
  e(tw.mensch, 'pop', .6); e(tw.folgt, 'pop', .6);
  for (let i = 0; i < 14; i++) e(tw.vier6 + i * .13, 'tick', .5);
  e(tw.vier6 + 1.8, 'ding', .8);
  for (let i = 0; i < 4; i++) e(lerp(tw.vier6 + 1.9, tw.waende + .2, i / 3), 'clack', .8);
  e(tw.aber2 - .1, 'whoosh', .6); e(tw.dach1, 'boing', .5); e(tw.koerb1, 'meow_sad', .8);
  e(tw.also1, 'swoosh_up', .6); e(tw.zehn1, 'ding', .8);
  e(tw.folgst, 'tick', .8); e(tw.neuen - .1, 'whoosh', .6); e(tw.geschr + .1, 'clack', 1); e(tw.geschr + .15, 'sparkle', .8);
  e(tw.komm, 'tick', .8); e(tw.vorne, 'whoosh', .5); e(tw.tuer, 'clack', 1);
  e(tw.likest, 'tick', .8); e(tw.likest + .2, 'heart', .7); e(tw.waermer, 'meow_happy', .8);
  e(tw.bei5 + .5, 'stamp', 1); e(tw.dach2 - .05, 'pop', .9); e(tw.bei7 + .4, 'stamp', 1); e(tw.kamin, 'pop', .9);
  e(tw.bei8 + .4, 'stamp', 1); e(tw.fenster - .05, 'pop', .9); e(tw.fenster + .1, 'sparkle', .6);
  e(tw.turm - .4, 'swoosh_up', .8); e(tw.turm + .1, 'tada', .9); e(tw.blick, 'meow_happy', .9);
  e(tw.zehnN, 'sparkle', .9); e(tw.zusammen, 'ding', .7);
  e(tw.aber3 - .2, 'whoosh', .9); e(tw.minus, 'boom', 1); e(tw.grad + .3, 'brr', .8);
  e(tw.kuschelt + .3, 'meow_sad', .7);
  e(tw.nach, 'whoosh', .5); for (let i = 0; i < 6; i++) e(tw.nach + .3 + i * .25, 'tick', .4);
  e(tw.folg - .05, 'pop', 1); e(tw.folg + .25, 'ding', .8); e(tw.teil, 'stamp', .9);
  e(tw.komms - .1, 'pop', .8); e(tw.erstes, 'meow_happy', .9); e(END - .9, 'sparkle', .6);
}
window.SFX = SFX;

// ---------- update ----------
const colAttr = brickGeo.attributes.color;
function setBrickColor(i, r, g, b) { const o = bricks[i].v0 * 3; for (let v = 0; v < 24; v++) { colAttr.array[o + v * 3] = r; colAttr.array[o + v * 3 + 1] = g; colAttr.array[o + v * 3 + 2] = b; } }
const nameIdx = bricks.indexOf(nameBrick);
function update(t) {
  // time of day: dusk -> night for the cold snap
  const night = ease(t, tw.aber3 - .3, tw.minus) * (1 - ease(t, tw.also2 + .2, tw.wenn));
  const warmK = win(t, tw.likest + .1, tw.bei5 + .2, .4);
  scene.background = night > .5 ? nightSky : daySky;
  hemi.intensity = lerp(1.05, .35, night); sun.intensity = lerp(2.2, .35, night); fill.intensity = lerp(.5, .15, night);
  renderer.toneMappingExposure = lerp(1.05, .85, night); scene.fog.color.copy(dayFog).lerp(nightFog, night);

  // snowfall (heavier in the cold snap)
  const heavy = 1 + night * 1.5;
  for (let i = 0; i < flakeN; i++) { const [x, y0, z, sp, ph] = flakeSeed[i]; const y = ((y0 - t * sp * heavy) % 9 + 9) % 9;
    flakeP[i * 3] = x + Math.sin(t * .8 + ph) * .3 + night * Math.sin(t * 2 + ph) * .4; flakeP[i * 3 + 1] = y; flakeP[i * 3 + 2] = z; }
  flakeG.attributes.position.needsUpdate = true;
  const roofK = ease(t, tw.dach2 - .1, tw.dach2 + .3) * (1 - ease(t, tw.aber3 - .3, tw.aber3 + .2));
  const holeK = (1 - roofK) * (t < tw.folgst || (t > tw.aber3 && t < tw.wenn) ? 1 : .35);
  for (let i = 0; i < holeN; i++) { const ph = (t * .5 + i / holeN) % 1; holeP[i * 3] = .7 + Math.sin(i * 7.1) * .35; holeP[i * 3 + 1] = lerp(4.5, .15, ph); holeP[i * 3 + 2] = -.35 + Math.cos(i * 3.3) * .3; }
  holeG.attributes.position.needsUpdate = true; holeFlakes.visible = holeK > .05;

  // snow pile in the basket area grows when the roof is missing
  const pileK = .25 + .5 * ease(t, tw.loch, tw.also1) + .4 * ease(t, tw.nacht, tw.kuschelt) - .5 * ease(t, tw.likest, tw.waermer + .3) * (1 - ease(t, tw.aber3, tw.nacht));
  pile.scale.set(Math.max(.01, pileK), Math.max(.01, pileK * .45), Math.max(.01, pileK)); pile.position.set(.15, .05, -.75);

  // bricks: names light up; counter wave; four walls flash
  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i]; let k = 1;
    const wave = win(t, tw.vier6 - .1 + b.row * .12, tw.vier6 + .5 + b.row * .12, .15) * .6;
    const wallFlash = win(t, lerp(tw.vier6 + 1.9, tw.waende + .2, b.wall / 3), lerp(tw.vier6 + 1.9, tw.waende + .2, b.wall / 3) + .45, .12) * .55;
    const all = win(t, tw.zehnN - .1, tw.zusammen + .6, .3) * (.35 + .35 * Math.sin(t * 6 + b.row * .7 + b.a * 2));
    k += wave + wallFlash + all;
    if (i === nameIdx) k += win(t, tw.name1 - .2, tw.folgt + .2, .2) * .5;
    setBrickColor(i, k, k * (1 + all * .2), k * (1 - all * .1));
  }
  colAttr.needsUpdate = true;
  wallNums.forEach((l, i) => { const a = lerp(tw.vier6 + 1.9, tw.waende + .2, i / 3); const k = pop(t, a, .3) * (1 - ease(t, tw.aber2 + .1, tw.aber2 + .4));
    const p = [[0, WALL_H + .5, HZ + .3], [HX + .3, WALL_H + .5, 0], [0, WALL_H + .5, -HZ - .3], [-HX - .3, WALL_H + .5, 0]][i]; setLabel(l, k, ...p); });
  setLabel(lblQ, win(t, tw.dach1 - .1, tw.loch + .4, .2), .2, WALL_H + 1.2, 0);

  // milestones
  roof.visible = roofK > .01; roof.scale.setScalar(Math.max(.001, roofK)); roof.position.y = (1 - roofK) * 1.5;
  const fireK = pop(t, tw.kamin - .1, .35) * (1 - ease(t, tw.aber3 - .3, tw.aber3 + .2));
  chimney.visible = fireplace.visible = fireK > .01; chimney.scale.setScalar(Math.max(.001, fireK)); fireplace.scale.setScalar(Math.max(.001, fireK));
  const flameOn = ramp(t, tw.feuer - .3, tw.feuer) * fireK;
  flames.forEach((f, i) => { f.visible = flameOn > .02; f.scale.set(1, (.7 + .4 * Math.abs(Math.sin(t * 9 + i * 1.7))) * flameOn, 1); });
  fireLight.intensity = flameOn * (2.5 + .6 * Math.sin(t * 13)) + warmK * 1.2;
  smoke.forEach((s, i) => { const ph = (t * .4 + i / 8) % 1; s.visible = fireK > .5 && flameOn > .1; s.position.set(-1.2 + Math.sin(i * 2) * .2, WALL_H + 2 + ph * 2.5, -.5); s.scale.setScalar(.6 + ph * 1.5); s.material.opacity = .55 * (1 - ph); });
  const winK = pop(t, tw.fenster - .1, .35) * (1 - ease(t, tw.aber3 - .3, tw.aber3 + .2)); windowG.visible = winK > .01; windowG.scale.setScalar(Math.max(.001, winK));
  const towK = ease(t, tw.turm - .5, tw.turm + .5) * (1 - ease(t, tw.aber3 - .3, tw.aber3 + .2)); tower.visible = towK > .01; tower.scale.set(1, Math.max(.001, towK), 1);
  const puffT = ramp(t, tw.aber3 - .3, tw.aber3 + .6);
  puffs.forEach((p, i) => { p.visible = puffT > 0 && puffT < 1; const a = i / 10 * Math.PI * 2; p.position.set(Math.cos(a) * 2 + .3, WALL_H + 1 + Math.sin(i * 3) * 1.5 + puffT, Math.sin(a) * 1.6); p.scale.setScalar(.5 + puffT * 1.8); p.material.opacity = .85 * (1 - puffT); });
  setLabel(lblMs[5], win(t, tw.bei5 - .05, tw.bei7 - .05, .2), 0, WALL_H + 2.6, 0);
  setLabel(lblMs[7], win(t, tw.bei7 - .05, tw.feuer + .1, .2), -1.2, WALL_H + 2.6, -.5);
  setLabel(lblMs[8], win(t, tw.bei8 - .05, tw.fenster + .9, .2), HX + .4, 2.3, 0);
  setLabel(lblMs[10], win(t, tw.bei10 - .05, tw.ganz, .2), 1.2, WALL_H + 6.4, -.4);

  // door: open a crack at the start, swings for the comment brick
  doorMesh.rotation.y = -1.2 - .4 * win(t, tw.kamin, tw.fenster + .3, .3) + .5 * ease(t, tw.aber3, tw.minus) * (1 - ease(t, tw.also2, tw.wenn));

  // Mimi
  const s = { x: .7, z: -.65, y: .18, face: t < tw.halbes ? -.2 : .3, shiver: 0, sad: 0, happy: 0 };
  s.shiver = (t < tw.likest ? 1 : 0) + (t > tw.minus - .2 && t < tw.wenn ? 1.2 : 0);
  s.sad = t < tw.also1 ? .8 : (t > tw.aber3 && t < tw.wenn ? .9 : .1);
  s.meow = win(t, .15, .9, .15) + win(t, tw.koerb1, tw.koerb1 + .8, .15) + win(t, tw.waermer, tw.waermer + .5, .1) + win(t, tw.erstes, tw.erstes + .5, .1) + win(t, tw.blick, tw.blick + .5, .1);
  if (t < tw.friert + .4) s.lookUp = ease(t, .2, 1.0) * .9;
  if (t > tw.schau && t < tw.also1) s.lookX = .4;
  if (t > tw.likest && t < tw.aber3) { s.happy = ease(t, tw.waermer - .4, tw.waermer); const h = ramp(t, tw.waermer - .1, tw.waermer + .45); s.hop = Math.sin(h * Math.PI) * .25; s.squash = h > 0 && h < .15 ? 1 : 0; }
  // on top of the tower
  if (t > tw.turm + .2 && t < tw.stell + .2) { s.x = TOWER_TOP.x; s.z = TOWER_TOP.z + .1; s.y = TOWER_TOP.y; s.face = .5; s.happy = 1; s.shiver = 0; s.sad = 0;
    const h = ramp(t, tw.blick - .1, tw.blick + .45); s.hop = Math.sin(h * Math.PI) * .3; }
  if (t > tw.stell + .2 && t < tw.aber3) { s.happy = 1; s.shiver = 0; s.sad = 0; const h = (t * 1.6) % 1; s.hop = Math.sin(h * Math.PI) * .2; }
  // cold snap: walk to the corner with most bricks and curl up
  if (t > tw.kuschelt - .1 && t < tw.wenn) { const k = ease(t, tw.kuschelt - .1, tw.ecke); s.x = lerp(.7, -1.45, k); s.z = lerp(-.65, -1.0, k); s.y = lerp(.1, 0, k); s.face = k > 0 && k < 1 ? -2.0 : 2.4; s.walk = k > 0 && k < 1;
    s.curl = ease(t, tw.ecke, tw.meisten); s.closed = t > tw.meisten; }
  if (t > tw.wenn) { s.x = .15; s.z = HZ + .8; s.y = 0; s.face = 0; s.sad = 0; s.shiver = 0; s.happy = ease(t, tw.folg, tw.folg + .3); s.lookUp = .4;
    const h = ramp(t, tw.erstes - .1, tw.erstes + .45); s.hop = Math.sin(h * Math.PI) * .25; }
  poseKitten(mimi, t, s);
  mimi.userData.collar.visible = false;
  basket.visible = !(t > tw.turm + .2 && t < tw.stell + .2) || true;
  setLabel(lblBrr, win(t, tw.friert - .1, tw.halbes, .15) + win(t, tw.grad, tw.kuschelt, .15), mimi.position.x + .7, mimi.position.y + 1.4, mimi.position.z + .3);
  setLabel(lblMinus, win(t, tw.minus - .1, tw.kuschelt + .3, .2), 0, WALL_H + .7, HZ);

  // the viewer's gold brick: flies in on "neuen Stein", then moves next to the door
  const top = bricks.filter(b => b.wall === 0 && b.row === ROWS - 1);
  const slot = V(-.2, WALL_H + BH / 2, HZ);
  const fly = ease(t, tw.neuen - .1, tw.geschr + .1), toDoor = ease(t, tw.vorne - .2, tw.tuer);
  myBrick.visible = t > tw.neuen - .2 && t < tw.likest + .2;
  const from = V(3.5, 4.5, 6), p = new THREE.Vector3().lerpVectors(from, slot, fly); p.y += Math.sin(fly * Math.PI) * 1.0;
  p.lerp(doorSpot, toDoor); p.y += Math.sin(toDoor * Math.PI) * .6;
  myBrick.position.copy(p); myBrick.rotation.set((1 - fly) * 4, (1 - fly) * 6, 0);
  myBrick.material.emissiveIntensity = .25 + .25 * Math.sin(t * 6);
  sparkles.forEach((sp, i) => { const ph = (t * 1.2 + i / 14) % 1; const on = win(t, tw.geschr, tw.komm, .2) + win(t, tw.tuer - .1, tw.likest, .2); sp.visible = on > .05;
    sp.position.copy(myBrick.position).add(V(Math.cos(i * 2.4) * (.2 + ph * .3), ph * .5 - .1, Math.sin(i * 2.4) * .2 + .15)); sp.scale.setScalar((1 - ph) * on * 1.4); sp.rotation.y = t * 3 + i; });
  // like hearts rising from Mimi
  hearts.forEach((h, i) => { const ph = (t * .8 + i / 10) % 1; const on = win(t, tw.likest, tw.bei5 + .1, .2); h.visible = on > .05;
    h.position.set(.7 + Math.sin(i * 2.1) * .45, .6 + ph * 1.6, -.35 + Math.cos(i * 1.7) * .3); h.scale.setScalar((.6 + .5 * Math.sin(ph * Math.PI)) * on * 1.4); h.lookAt(camera.position); h.material.opacity = 1 - ph * .7; });

  setLabel(lblTeil2, pop(t, tw.teil - .05, .3) * (1 - ease(t, tw.komms - .3, tw.komms)), 0, WALL_H + 1.0, HZ + .3);
  placeCamera(t);
}

// ---------- 2D overlay: captions, UI cards, progress bar ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d');
const SHOW = { Viertausendsechshundert: '4.600', zehntausend: '10.000', Zehntausend: '10.000', fünftausend: '5.000', siebentausend: '7.000', achttausend: '8.000', zehn: '10' };
function wordAt(t) { let w = null; for (const x of WORDS) { if (x[1] <= t + .02) w = x; else break; } return w && t < w[2] + .5 ? clean(w[0]) : ''; }
function drawCaption(t) {
  let w = wordAt(t); if (!w) return; w = SHOW[w] || w;
  let fs = 96; og.font = `700 ${fs}px Fredoka`; while (og.measureText(w).width > W - 120) { fs -= 4; og.font = `700 ${fs}px Fredoka`; }
  og.textAlign = 'center'; og.textBaseline = 'middle'; og.lineJoin = 'round';
  const y = 990;
  og.lineWidth = 16; og.strokeStyle = 'rgba(0,0,0,.92)'; og.strokeText(w, W / 2, y + 4);
  og.lineWidth = 12; og.strokeStyle = '#000'; og.strokeText(w, W / 2, y);
  og.fillStyle = /^[0-9.]+$/.test(w) ? '#ffd21f' : '#ffffff'; og.fillText(w, W / 2, y);
}
function rrect(x, y, w, h, r) { og.beginPath(); og.moveTo(x + r, y); og.arcTo(x + w, y, x + w, y + h, r); og.arcTo(x + w, y + h, x, y + h, r); og.arcTo(x, y + h, x, y, r); og.arcTo(x, y, x + w, y, r); og.closePath(); }
function icon(kind, cx, cy, r) {
  og.save(); og.translate(cx, cy);
  const col = { follow: '#ff2d55', like: '#ff2d55', comment: '#2f9bff', share: '#ffb020' }[kind] || '#888';
  og.fillStyle = col; og.beginPath(); og.arc(0, 0, r, 0, 7); og.fill(); og.fillStyle = '#fff'; og.strokeStyle = '#fff'; og.lineWidth = r * .22; og.lineCap = 'round';
  if (kind === 'follow') { og.beginPath(); og.moveTo(-r * .45, 0); og.lineTo(r * .45, 0); og.moveTo(0, -r * .45); og.lineTo(0, r * .45); og.stroke(); }
  if (kind === 'like') { const s = r * .5; og.beginPath(); og.moveTo(0, s * .9); og.bezierCurveTo(-s * 1.6, -s * .2, -s * .7, -s * 1.3, 0, -s * .45); og.bezierCurveTo(s * .7, -s * 1.3, s * 1.6, -s * .2, 0, s * .9); og.fill(); }
  if (kind === 'comment') { rrect(-r * .5, -r * .42, r, r * .7, r * .2); og.fill(); og.beginPath(); og.moveTo(-r * .2, r * .25); og.lineTo(-r * .35, r * .55); og.lineTo(0, r * .25); og.fill();
    og.fillStyle = col; for (const dx of [-.22, 0, .22]) { og.beginPath(); og.arc(dx * r, -r * .07, r * .07, 0, 7); og.fill(); } }
  if (kind === 'share') { og.beginPath(); og.moveTo(-r * .45, r * .35); og.quadraticCurveTo(-r * .3, -r * .2, r * .2, -r * .2); og.stroke(); og.beginPath(); og.moveTo(r * .05, -r * .5); og.lineTo(r * .5, -r * .2); og.lineTo(r * .05, r * .1); og.fill(); }
  og.restore();
}
function card(k, y, kind, title, sub, active) {
  if (k <= .01) return;
  const w = 900, h = 150, x = W / 2 - w / 2 + (1 - k) * -1000;
  og.save(); og.globalAlpha = cl(k * 1.4); const sc = active ? 1 + .04 * Math.sin(Date.now() * 0) : 1;
  og.shadowColor = 'rgba(0,0,0,.35)'; og.shadowBlur = 24; og.shadowOffsetY = 8;
  og.fillStyle = active ? '#fff9e0' : '#ffffff'; rrect(x, y, w, h, 34); og.fill(); og.shadowColor = 'transparent';
  if (active) { og.lineWidth = 7; og.strokeStyle = '#ffc21f'; rrect(x, y, w, h, 34); og.stroke(); }
  icon(kind, x + 84, y + h / 2, 50);
  og.fillStyle = '#1d1d1f'; og.font = '700 58px Fredoka'; og.textAlign = 'left'; og.textBaseline = 'middle'; og.fillText(title, x + 160, y + 52);
  og.fillStyle = '#6a6a72'; og.font = '700 38px Fredoka'; og.fillText(sub, x + 160, y + 106);
  og.restore();
}
function progressBar(k, val, t) {
  if (k <= .01) return;
  const x = 90, w = W - 180, y = 1590 + (1 - k) * 300, h = 64;
  og.save(); og.globalAlpha = cl(k * 1.3);
  og.shadowColor = 'rgba(0,0,0,.4)'; og.shadowBlur = 20; og.fillStyle = 'rgba(20,24,40,.85)'; rrect(x - 20, y - 86, w + 40, h + 150, 36); og.fill(); og.shadowColor = 'transparent';
  og.fillStyle = '#fff'; og.font = '700 46px Fredoka'; og.textAlign = 'center'; og.textBaseline = 'middle';
  og.fillText(`${Math.round(val).toLocaleString('de-DE')} / 10.000 Steine`, W / 2, y - 40);
  og.fillStyle = '#3a3f55'; rrect(x, y, w, h, 32); og.fill();
  const f = cl(val / 10000); const gr = og.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#ff7a3d'); gr.addColorStop(1, '#ffcf3d');
  og.fillStyle = gr; rrect(x, y, Math.max(h, w * f), h, 32); og.fill();
  og.fillStyle = 'rgba(255,255,255,.35)'; rrect(x + 10, y + 8, Math.max(0, w * f - 20), 14, 7); og.fill();
  // milestone pins
  const ms = [[5000, 'Dach', tw.bei5], [7000, 'Kamin', tw.bei7], [8000, 'Fenster', tw.bei8], [10000, 'Turm', tw.bei10]];
  for (const [v, nm, at] of ms) { const px = x + w * v / 10000 - (v === 10000 ? 28 : 0); const hl = win(t, at - .1, at + 1.4, .2);
    og.fillStyle = hl > .1 ? '#ffd21f' : '#ffffff'; og.beginPath(); og.arc(px, y + h / 2, 16 + hl * 8, 0, 7); og.fill(); og.lineWidth = 5; og.strokeStyle = '#141828'; og.stroke();
    og.font = `700 ${28 + hl * 10}px Fredoka`; og.fillStyle = hl > .1 ? '#ffd21f' : '#c9cde0'; og.fillText(nm, Math.min(px, W - 120), y + h + 34); }
  og.restore();
}
function button(k, t) {
  if (k <= .01) return;
  const w = 560, h = 140, x = W / 2 - w / 2, y = 330; const pulse = 1 + .05 * Math.sin(t * 9);
  og.save(); og.translate(W / 2, y + h / 2); og.scale(k * pulse, k * pulse); og.translate(-W / 2, -(y + h / 2));
  og.shadowColor = 'rgba(0,0,0,.4)'; og.shadowBlur = 24; og.fillStyle = '#ff2d55'; rrect(x, y, w, h, 70); og.fill(); og.shadowColor = 'transparent';
  og.fillStyle = '#fff'; og.font = '700 70px Fredoka'; og.textAlign = 'center'; og.textBaseline = 'middle'; og.fillText('+ Folgen', W / 2, y + h / 2 + 2);
  og.restore();
}
function commentBox(k, t) {
  if (k <= .01) return;
  const items = [['Dach', '#7a8fb8'], ['Kamin', '#ff7a3d'], ['Fenster', '#ffcf3d'], ['Turm', '#ff4f7b']];
  items.forEach(([nm, c], i) => { const kk = back(cl((k * 1.6) - i * .15)); if (kk <= .01) return; const w = 236, h = 110, x = 34 + i * 256, y = 300;
    og.save(); og.translate(x + w / 2, y + h / 2); og.scale(kk, kk); og.translate(-(x + w / 2), -(y + h / 2));
    og.fillStyle = '#ffffff'; og.shadowColor = 'rgba(0,0,0,.3)'; og.shadowBlur = 16; rrect(x, y, w, h, 28); og.fill(); og.shadowColor = 'transparent';
    og.fillStyle = c; og.beginPath(); og.arc(x + 38, y + h / 2, 18, 0, 7); og.fill(); og.fillStyle = '#1d1d1f'; og.font = '700 40px Fredoka'; og.textAlign = 'left'; og.textBaseline = 'middle'; og.fillText(nm, x + 66, y + h / 2 + 2);
    og.restore(); });
  og.save(); og.globalAlpha = cl(k * 2); og.font = '700 78px Fredoka'; og.textAlign = 'center'; og.lineJoin = 'round'; og.lineWidth = 16; og.strokeStyle = '#000'; og.strokeText('Was bekommt Mimi zuerst?', W / 2, 230); og.fillStyle = '#ffd21f'; og.fillText('Was bekommt Mimi zuerst?', W / 2, 230); og.restore();
}
function drawUI(t) {
  // counter during "4.600 Steine": counts up
  const countK = win(t, tw.vier6 - .1, tw.aber2 + .2, .25);
  const barK = Math.max(countK, win(t, tw.also1 - .1, tw.bei10 + 1.4, .3), win(t, tw.also2 - .1, END + 1, .3));
  let val = 4600 * ease(t, tw.vier6 - .1, tw.vier6 + 1.6);
  if (t > tw.aber2 + .2) val = 4600;
  if (t > tw.zehn1 - .1 && t < tw.folgst) val = 4600 + 30 * Math.sin((t - tw.zehn1) * 8);   // the bar "wants" more
  if (t > tw.folgst && t < tw.bei5) val = 4600 + ease(t, tw.neuen, tw.geschr + .2);          // +1 for you
  progressBar(barK, val, t);
  card(back(ramp(t, tw.folgst - .1, tw.folgst + .3)) * (1 - ease(t, tw.bei5 - .2, tw.bei5 + .1)), 150, 'follow', 'FOLGEN', 'Dein Name auf einem Stein', t > tw.folgst && t < tw.komm);
  card(back(ramp(t, tw.komm - .1, tw.komm + .3)) * (1 - ease(t, tw.bei5 - .2, tw.bei5 + .1)), 320, 'comment', 'KOMMENTIEREN', 'Dein Stein neben die Tür', t > tw.komm && t < tw.likest);
  card(back(ramp(t, tw.likest - .1, tw.likest + .3)) * (1 - ease(t, tw.bei5 - .2, tw.bei5 + .1)), 490, 'like', 'LIKEN', 'Drinnen wird es wärmer', t > tw.likest && t < tw.bei5);
  button(back(ramp(t, tw.folg - .15, tw.folg + .2)) * (1 - ease(t, tw.komms - .3, tw.komms)), t);
  commentBox(ramp(t, tw.komms - .2, tw.komms + .6), t);
  // tap ripple on the button
  const tp = ramp(t, tw.folg + .15, tw.folg + .7); if (tp > 0 && tp < 1) { og.save(); og.globalAlpha = 1 - tp; og.lineWidth = 10; og.strokeStyle = '#fff'; og.beginPath(); og.arc(W / 2 + 120, 410, 30 + tp * 120, 0, 7); og.stroke(); og.restore(); }
  // cold vignette in the cold snap, warm one when liked
  const cold = win(t, tw.minus - .2, tw.wenn, .4);
  if (cold > .01) { const g = og.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); g.addColorStop(0, 'rgba(150,200,255,0)'); g.addColorStop(1, `rgba(150,200,255,${.45 * cold})`); og.fillStyle = g; og.fillRect(0, 0, W, H); }
  const warm = win(t, tw.likest + .1, tw.bei5, .3) + win(t, tw.feuer, tw.fenster + .3, .3) * .7;
  if (warm > .01) { const g = og.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); g.addColorStop(0, 'rgba(255,170,80,0)'); g.addColorStop(1, `rgba(255,150,60,${.3 * warm})`); og.fillStyle = g; og.fillRect(0, 0, W, H); }
  // flash on milestone stamps
  for (const a of [tw.bei5 + .5, tw.bei7 + .4, tw.bei8 + .4, tw.turm + .1]) { const f = win(t, a - .02, a + .25, .08); if (f > .01) { og.fillStyle = `rgba(255,255,255,${.35 * f})`; og.fillRect(0, 0, W, H); } }
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => {
  update(t); renderer.render(scene, camera);
  og.drawImage(renderer.domElement, 0, 0); drawUI(t); drawCaption(t);
  return out.toDataURL('image/jpeg', q);
};
window.__done = true;
