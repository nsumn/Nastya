// ===================== 21 Autobahn — "new quality": Poly Haven photo textures, HDRI light, AO, hard cuts between camera angles,
// a worker rig with arms and legs, a diorama cross-section of the road layers at the front edge (z = Z0). =====================
// Build: cat lib.js autobahn_main.js > autobahn.js  (./render_video.sh autobahn 21_autobahn, CRF=18). Captions: caption layer.
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

await document.fonts.load('700 96px Fredoka');
const WORDS = await (await fetch('../21_autobahn/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const tw = {
  weg: T('Weg'), wiese: T('Wiese'), strasse1: T('Straße'),
  aber1: T('Aber'), regnet: T('regnet'), schlamm: T('Schlamm'),
  also1: T('Also'), grabst: T('gräbst'), fullst: T('füllst'), schotter1: T('Schotter'), wasser1: T('Wasser'), weglauft: T('wegläuft'),
  aber2: T('Aber', 2), winter: T('Winter'), gefriert: T('gefriert'), dehnt: T('dehnt'), reisst: T('reißt'),
  also2: T('Also', 2), frost: T('Frostschutzschicht'), kies: T('Kies'), meter1: T('Meter'),
  aber3: T('Aber', 3), rumpelt: T('rumpelt'), staub: T('Staub'),
  also3: T('Also', 3), walzt: T('walzt'), drei1: T('drei'), schichten: T('Schichten'), asphalt: T('Asphalt'), oberste: T('oberste'), glatt: T('glatt'),
  aber4: T('Aber', 4), rasen: T('rasen'), frontal: T('frontal'), zu: T('zu', 2),
  also4: T('Also', 4), getrennte: T('getrennte'), leitplanke: T('Leitplanke'),
  aber5: T('Aber', 5), kreuzung: T('Kreuzung'), bremsen: T('bremsen'),
  also5: T('Also', 5), quer: T('Querstraßen'), brucken: T('Brücken'), auffahrten: T('Auffahrten'),
  aber6: T('Aber', 6), lastwagen: T('Lastwagen'), staut: T('staut'),
  also6: T('Also', 6), drei2: T('drei', 2), rechts1: T('rechts'), langsamen: T('Langsamen'),
  aber7: T('Aber', 7), nachts: T('nachts'), aufhort: T('aufhört'),
  also7: T('Also', 7), funfzig: T('fünfzig'), leitpf: T('Leitpfosten'), reflekt: T('Reflektoren'),
  aber8: T('Aber', 8), liegen: T('liegen'), verkehr: T('Verkehr'),
  also8: T('Also', 8), stand: T('Standstreifen'), zwei2: T('zwei', 3), notruf: T('Notrufsäule'),
  gluck: T('Glückwunsch'), ganz2: T('ganz', 2), aus1: T('aus'), damit1: T('damit'), drauf: T('drauf'), fein: T('fein'), steckst: T('steckst'), fest: T('fest'), siehst: T('siehst'), fahrbahnen: T('Fahrbahnen'), spuren: T('Spuren'), autobahn: T('Autobahn'), deutschland: T('Deutschland'), schnell: T('schnell') };

// ---------- sound ----------
const SFX = { end: END, music_gain: .07, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
SFX.beds.push([0, tw.aber1, 'engine', .35], [tw.aber1 - .1, tw.also1 + .2, 'rain', 1], [tw.schlamm, tw.also1, 'engine', .7],
  [tw.aber2, tw.also2, 'wind', .6], [tw.aber3, tw.also3, 'engine', .5], [tw.walzt - .2, tw.aber4, 'engine', .8],
  [tw.aber4, END, 'traffic', .55], [tw.aber7, tw.aber8, 'wind', .3]);
e(.1, 'whoosh', .5); e(tw.strasse1, 'ding', .6); e(tw.regnet, 'splash', .5); e(tw.schlamm, 'splash', .8); e(tw.schlamm + .4, 'splash', .6);
for (let i = 0; i < 6; i++) e(tw.grabst + i * .28, 'clack', .5); for (let i = 0; i < 6; i++) e(tw.schotter1 - .2 + i * .15, 'tick', .5); e(tw.wasser1, 'splash', .4);
e(tw.winter, 'whoosh', .6); e(tw.gefriert, 'crackle', .7); e(tw.dehnt, 'crackle', .7); e(tw.reisst, 'boom', .8); e(tw.reisst + .15, 'crackle', 1);
e(tw.frost, 'poof', .7); e(tw.kies, 'poof', .6); e(tw.meter1, 'pop', .8);
for (let i = 0; i < 8; i++) e(tw.rumpelt + i * .14, 'clack', .35); e(tw.staub, 'poof', .8);
e(tw.drei1, 'pop', .7); e(tw.schichten, 'pop', .7); e(tw.asphalt, 'pop', .7); e(tw.glatt, 'sparkle', .8);
e(tw.rasen, 'whoosh', .8); e(tw.frontal, 'honk', 1); e(tw.zu, 'honk', .9);
e(tw.getrennte, 'swoosh_up', .7); for (let i = 0; i < 8; i++) e(tw.leitplanke + i * .08, 'clack', .4);
e(tw.kreuzung, 'ding', .5); e(tw.bremsen, 'hiss', .8); e(tw.brucken - .2, 'swoosh_up', .8); e(tw.auffahrten, 'pop', .7);
e(tw.lastwagen, 'honk', .6); e(tw.staut, 'honk', .8); e(tw.drei2, 'swoosh_up', .7); e(tw.rechts1, 'whoosh', .6);
e(tw.nachts, 'boom', .4); for (let i = 0; i < 6; i++) e(tw.leitpf + i * .1, 'tick', .6); e(tw.reflekt, 'sparkle', .8);
e(tw.liegen, 'boom', .5); e(tw.verkehr, 'honk', 1); e(tw.stand, 'swoosh_up', .7); e(tw.notruf, 'ding', .8);
e(tw.gluck, 'tada', .9); e(tw.deutschland + .3, 'whoosh', 1); e(tw.schnell, 'whoosh', 1);
window.SFX = SFX;

// ---------- photo textures (Poly Haven, CC0) + HDRI ----------
const TL = new THREE.TextureLoader();
const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
const pbr = async n => ({ d: await ld(n + '_diff_1k.jpg', true), n: await ld(n + '_nor_gl_1k.jpg', false) });
const [TX_ASP, TX_GRV, TX_MUD, TX_CON, TX_GRS, HDR] = await Promise.all([pbr('asphalt_02'), pbr('gravel_floor_02'), pbr('brown_mud_leaves_01'), pbr('concrete_wall_004'),
  (async () => ({ d: await ld('leafy_grass_detail_1k.jpg', true), n: await ld('leafy_grass_nor_gl_1k.jpg', false) }))(),
  new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
HDR.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(HDR).texture;
const ENV0 = .55;
// one material per face group so the photo texture keeps its real size on long boxes: top (u: x, v: z) and cut face (u: x, v: y)
function surf(p, color, scale, o = {}) {
  const mk = () => { const m = new THREE.MeshStandardMaterial({ map: p.d.clone(), normalMap: p.n.clone(), color, roughness: o.rough ?? .95, metalness: 0 });
    m.map.needsUpdate = m.normalMap.needsUpdate = true; m.normalScale.set(o.ns ?? 1, o.ns ?? 1); return m; };
  return { top: mk(), face: mk(), side: mk(), scale };
}
function setRep(m, u, v) { m.map.repeat.set(u, v); m.normalMap.repeat.set(u, v); }
// a box defined by its extents; size() moves/scales it and fixes the texture repeats
function slab(S, cast = false) {
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(.5, .5, -.5);
  const m = new THREE.Mesh(geo, [S.side, S.side, S.top, S.top, S.face, S.face]); m.receiveShadow = true; m.castShadow = cast; scene.add(m);
  m.userData.S = S; m.userData.ext = null;
  m.size = (x0, x1, y0, y1, z0, z1) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0; m.visible = w > .01 && h > .005 && d > .01; if (!m.visible) return m;
    const ex = [x0, x1, y0, y1, z0, z1].join(); if (ex === m.userData.ext) return m; m.userData.ext = ex;
    m.position.set(x0, y0, z1); m.scale.set(w, h, d); return m; };
  return m;
}
function fitRep(m) { const S = m.userData.S, s = S.scale, w = m.scale.x, h = m.scale.y, d = m.scale.z; setRep(S.top, w / s, d / s); setRep(S.face, w / s, h / s); setRep(S.side, d / s, h / s); }

const Z0 = 6, ZF = -420;                     // the road runs from the cut face (z = Z0, toward the camera) to the horizon
const S_GRASS = surf(TX_GRS, '#7db552', 3, { ns: .8 }), S_SOIL = surf(TX_MUD, '#9a7458', 2.5), S_MUD = surf(TX_MUD, '#6e5240', 2.5, { rough: .35 });
const S_GRV = surf(TX_GRV, '#8f8a82', 1.6, { ns: 1.4 }), S_FROST = surf(TX_GRV, '#f0d898', .7, { ns: 1.1 });
const S_TRAG = surf(TX_ASP, '#6a6560', 1.2, { ns: 1.4 }), S_BIND = surf(TX_ASP, '#58544f', 1.6, { ns: 1.1 }), S_DECK = surf(TX_ASP, '#4a4846', 2.4, { rough: .7, ns: .7 });
const S_CON = surf(TX_CON, '#d9d6cf', 3), S_SOILD = surf(TX_MUD, '#7a5a44', 3);
const GW = 70;   // half width of the ground diorama

// ---------- layout: one road, then two carriageways that widen ----------
// returns { ml, mr (median edges), cw: [ {x0, x1, lanes, shoulder} x2 ] }
const LANE = 3.75;
function layout(t) {
  const split = ease(t, tw.getrennte - .2, tw.fahrbahnen + .4);
  const three = ease(t, tw.drei2 - .1, tw.spuren + .5);
  const shoulder = 2.6 * ease(t, tw.stand - .2, tw.stand + .6);
  const median = 4 * split, lanes = 2 + three, w = lanes * LANE + .6;
  if (split < .001) { const half = 4.2; return { split, ml: 0, mr: 0, single: [-half, half], lanes: 2, shoulder: 0, w: 2 * half }; }
  const off = lerp(0, median / 2, 1);
  return { split, ml: -off, mr: off, lanes, shoulder, w,
    R: [off, off + lerp(4.2, w, split) + shoulder], L: [-(off + lerp(4.2, w, split) + shoulder), -off] };
}
// lane centre for carriageway side s (+1 right, traffic -z / -1 left, traffic +z), lane index i (0 = fast, next to the median)
function laneX(L, s, i) { if (!L.R) return s * 2.1; const inner = s > 0 ? L.R[0] : -L.L[1]; return s * (inner + .4 + (i + .5) * LANE); }
function shoulderX(L, s) { if (!L.R) return s * 5.5; const outer = s > 0 ? L.R[1] : -L.L[0]; return s * (outer - 1.3); }

// ---------- ground + road layers ----------
const gL = slab(S_GRASS), gR = slab(S_GRASS), gM = slab(S_GRASS);      // grass top layer (y -0.1 .. 0)
const sL = slab(S_SOILD), sR = slab(S_SOILD), sM = slab(S_SOILD), base = slab(S_SOILD);   // soil below grass and under the trench
const corr = [0, 1].map(() => ({ soil: slab(S_SOIL), frost: slab(S_FROST), grv: slab(S_GRV), trag: slab(S_TRAG), bind: slab(S_BIND), deck: slab(S_DECK, false), mud: slab(S_MUD) }));
const path = slab(S_MUD);   // meadow track
function setGround(x0, x1, top, gr, so) { gr.size(x0, x1, top - .1, top, ZF, Z0); so.size(x0, x1, -1.6, top - .1, ZF, Z0); fitRep(gr); fitRep(so); }

// ---------- materials for props ----------
const metal = new THREE.MeshStandardMaterial({ color: '#c8ccd0', metalness: .85, roughness: .3 });
const paint = new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: .5, emissive: '#ffffff', emissiveIntensity: .05 });
const glassM = new THREE.MeshStandardMaterial({ color: '#1f2a36', metalness: .6, roughness: .15 });
const tyreM = M('#1b1b1d', { roughness: .9 });
const headM = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff2c0', emissiveIntensity: .6 });
const tailM = new THREE.MeshStandardMaterial({ color: '#b01818', emissive: '#ff2020', emissiveIntensity: .4 });
const blinkM = new THREE.MeshStandardMaterial({ color: '#e08a10', emissive: '#ff9a10', emissiveIntensity: 0 });
const reflM = new THREE.MeshStandardMaterial({ color: '#d8d8d8', emissive: '#ffb030', emissiveIntensity: 0 });
const beamM = new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });

// ---------- vehicles ----------
function vehicle(kind, color) {
  const g = new THREE.Group(); scene.add(g); const body = M(color, { roughness: .35, metalness: .3 });
  const L = kind === 'truck' ? 13 : kind === 'sport' ? 4.5 : 4.4, Wd = kind === 'truck' ? 2.5 : 1.85;
  const wheels = [];
  if (kind === 'truck') {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 2.3), body); cab.position.set(0, 2.0, -L / 2 + 1.15); g.add(cab);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.1, .05), glassM); ws.position.set(0, 2.7, -L / 2 - .02); g.add(ws);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(2.55, 3.1, L - 2.7), M('#eef0f2', { roughness: .6 })); tr.position.set(0, 2.3, 1.3); g.add(tr);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.57, .5, L - 2.8), body); stripe.position.set(0, 1.6, 1.3); g.add(stripe);
    for (const z of [-L / 2 + 1.2, 2.5, 4.0, 5.4]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .4, 16).rotateZ(Math.PI / 2), tyreM); w.position.set(s * 1.1, .52, z); g.add(w); wheels.push(w); }
  } else {
    const low = kind === 'sport';
    const b = new THREE.Mesh(new THREE.BoxGeometry(Wd, low ? .55 : .7, L), body); b.position.y = low ? .5 : .62; g.add(b);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(Wd - .2, low ? .45 : .62, L * (low ? .38 : .5)), glassM); cab.position.set(0, low ? .98 : 1.25, low ? .3 : .25); g.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(Wd - .3, .06, L * (low ? .3 : .42)), body); roof.position.set(0, low ? 1.22 : 1.58, low ? .35 : .3); g.add(roof);
    for (const z of [-L / 2 + .85, L / 2 - .85]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .26, 16).rotateZ(Math.PI / 2), tyreM); w.position.set(s * (Wd / 2 - .05), .34, z); g.add(w); wheels.push(w); }
    if (low) { const sp = new THREE.Mesh(new THREE.BoxGeometry(Wd, .06, .4), body); sp.position.set(0, 1.0, L / 2 - .2); g.add(sp); }
  }
  const y = kind === 'truck' ? 1.0 : .62, lights = [], tails = [], blinks = [];
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.4, .16, .05), headM); h.position.set(s * (Wd / 2 - .35), y, -L / 2 - .02); g.add(h); lights.push(h);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(.36, .16, .05), tailM); tl.position.set(s * (Wd / 2 - .3), y + (kind === 'truck' ? -.2 : 0), L / 2 + .02); g.add(tl); tails.push(tl);
    for (const z of [-L / 2 - .03, L / 2 + .03]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(.14, .12, .06), blinkM); bl.position.set(s * (Wd / 2 - .06), y + .12, z); g.add(bl); blinks.push(bl); } }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 16, 18, 1, true).rotateX(Math.PI / 2).translate(0, y - .2, -L / 2 - 8), beamM); g.add(beam);
  g.traverse(o => { if (o.isMesh && o !== beam) o.castShadow = true; });
  g.userData = { kind, L, wheels, beam, tailMat: null, blinks }; g.visible = false; return g;
}
function putV(v, x, z, dir, t, speed = 0, y = 0) {   // dir -1: drives toward -z, +1: toward +z
  v.visible = true; v.position.set(x, y, z); v.rotation.set(0, dir < 0 ? 0 : Math.PI, 0);
  v.userData.wheels.forEach(w => w.rotation.x = -t * speed / .4);
}
const CARC = ['#c8102e', '#1f5fbf', '#f2f2f0', '#2b2b2e', '#8a8f96', '#2f7d4f', '#e3b51c', '#5a2d82', '#d6d2c8', '#3a6ea5'];
const cars = CARC.concat(CARC, CARC, CARC.slice(0, 4)).map((c, i) => vehicle('car', c));   // 0-13: flow, 20-33: scenes
const trucks = ['#1f5fbf', '#c8102e', '#2f7d4f', '#e3b51c', '#f2f2f0', '#e36414', '#3a6ea5'].map(c => vehicle('truck', c));   // 0-3: flow, 4-6: scenes
const hero = vehicle('car', '#d9552b');   // your car (orange)
const sport = vehicle('sport', '#c40d1e');
const ALLV = [...cars, ...trucks, hero, sport];

// ---------- worker rig (from the caveman rig in kuehl_main.js) ----------
const vestM = M('#ff7a12', { roughness: .7 }), stripeM = new THREE.MeshStandardMaterial({ color: '#e8e8e8', emissive: '#ffffff', emissiveIntensity: .25 });
const jeansM = M('#2e4a73', { roughness: .9 }), skinM = M('#e8b48c', { roughness: .75 }), helmM = M('#ffd21f', { roughness: .4 }), blackM = new THREE.MeshBasicMaterial({ color: '#111' });
function worker() {
  const root = new THREE.Group(); scene.add(root);
  const pelvis = new THREE.Group(); pelvis.position.y = .95; root.add(pelvis);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.27, .42, 6, 14), vestM); torso.position.y = .36; torso.scale.z = .82; pelvis.add(torso);
  for (const y of [.25, .45]) { const st = new THREE.Mesh(new THREE.TorusGeometry(.275, .025, 6, 24), stripeM); st.rotation.x = Math.PI / 2; st.scale.y = .82; st.position.y = y; pelvis.add(st); }
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(.28, .3, .22, 12), jeansM); hips.position.y = .02; pelvis.add(hips);
  const head = new THREE.Group(); head.position.y = .8; pelvis.add(head);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 18), skinM); hd.position.y = .18; head.add(hd);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.27, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), helmM); helm.position.y = .24; head.add(helm);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.33, .33, .03, 20), helmM); brim.position.set(0, .25, .04); head.add(brim);
  const brows = [], pupils = [];
  for (const s of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 10), M('#ffffff', { roughness: .3 })); ey.position.set(s * .09, .2, .2); head.add(ey);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), blackM); p.position.set(s * .09, .2, .25); head.add(p); pupils.push(p);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.11, .03, .03), M('#4a2c18')); b.position.set(s * .09, .275, .22); head.add(b); brows.push(b); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), skinM); nose.position.set(0, .14, .24); head.add(nose);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), M('#5a1a14')); mouth.scale.set(1.3, .35, .4); mouth.position.set(0, .06, .23); head.add(mouth);
  const sh = [], el = [], hand = [], hip = [], kn = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * .34, .6, 0); pelvis.add(a); sh.push(a);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(.08, .22, 4, 10), vestM); up.position.y = -.16; a.add(up);
    const e = new THREE.Group(); e.position.y = -.33; a.add(e); el.push(e);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .2, 4, 10), skinM); fo.position.y = -.14; e.add(fo);
    const h = new THREE.Group(); h.position.y = -.31; e.add(h); hand.push(h);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 10), M('#e8a020')); h.add(hm);           // work gloves
    const lg = new THREE.Group(); lg.position.set(s * .14, -.02, 0); pelvis.add(lg); hip.push(lg);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .28, 4, 10), jeansM); th.position.y = -.21; lg.add(th);
    const k = new THREE.Group(); k.position.y = -.45; lg.add(k); kn.push(k);
    const shn = new THREE.Mesh(new THREE.CapsuleGeometry(.09, .28, 4, 10), jeansM); shn.position.y = -.2; k.add(shn);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.18, .11, .3), M('#3a2a1a')); ft.position.set(0, -.44, .06); k.add(ft);
  }
  // shovel in the right hand
  const shovel = new THREE.Group(); hand[1].add(shovel);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.3, 8), M('#8a6440')); st.rotation.x = Math.PI / 2; st.position.z = .35; shovel.add(st);
  const bl = new THREE.Mesh(new THREE.BoxGeometry(.28, .02, .34), metal); bl.position.set(0, 0, 1.1); bl.rotation.x = .3; shovel.add(bl);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.userData = { pelvis, head, sh, el, hand, hip, kn, brows, mouth, shovel };
  return root;
}
// pose: [shLx, shLz, shRx, shRz, elL, elR, hipL, hipR, knL, knR, lean, headX, headY, brow, mouth]
const POSE = {
  idle: [0, -.12, 0, .12, -.15, -.15, 0, 0, 0, 0, 0, 0, 0, 0, .3],
  dig: [-1.3, -.05, -1.3, .05, -.4, -.4, -.25, .1, .45, .2, .45, .25, 0, -.3, .35],
  lift: [-1.9, -.05, -1.9, .05, -.6, -.6, 0, 0, .1, .1, -.1, -.15, 0, -.2, .5],
  cheer: [-2.9, -.35, -2.9, .35, -.1, -.1, 0, 0, 0, 0, -.05, -.15, 0, .8, 1.3],
  headhold: [-2.5, -.6, -2.5, .6, -1.9, -1.9, 0, 0, 0, 0, .05, .2, 0, .9, .25],
  point: [0, -.12, -1.6, .3, -.15, -.1, 0, 0, 0, 0, 0, 0, -.3, .3, .6],
  sit: [-1.0, -.1, -1.0, .1, -.5, -.5, -1.5, -1.5, 1.5, 1.5, 0, 0, 0, 0, .5],
  phone: [0, -.12, -2.2, .2, -.15, -2.1, 0, 0, 0, 0, 0, .05, .3, .2, .7],
  wave: [0, -.12, -2.8, .4, -.15, -.5, 0, 0, 0, 0, 0, -.1, 0, .6, 1.0] };
const mixP = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function applyPose(c, p) { const u = c.userData;
  u.sh[0].rotation.set(p[0], 0, p[1]); u.sh[1].rotation.set(p[2], 0, p[3]); u.el[0].rotation.x = p[4]; u.el[1].rotation.x = p[5];
  u.pelvis.rotation.x = p[10]; u.hip[0].rotation.x = p[6] - p[10]; u.hip[1].rotation.x = p[7] - p[10]; u.kn[0].rotation.x = p[8]; u.kn[1].rotation.x = p[9];
  u.head.rotation.set(p[11], p[12], 0); u.brows.forEach((b, i) => { const s = i ? 1 : -1; b.rotation.z = -s * p[13] * .45; b.position.y = .275 + p[13] * .02; });
  u.mouth.scale.set(1.3 - p[14] * .25, .3 + p[14] * .55, .4); u.pelvis.position.y = p[6] < -1 ? .55 : .95; }
const du = worker();

// ---------- props ----------
function roller() { const g = new THREE.Group(); scene.add(g); const yel = M('#f2b705', { roughness: .45 });
  for (const z of [-1.4, 1.4]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 2.1, 24).rotateZ(Math.PI / 2), metal); d.position.set(0, .75, z); g.add(d);
    const f = new THREE.Mesh(new THREE.BoxGeometry(2.3, .25, .5), yel); f.position.set(0, 1.55, z); g.add(f); }
  const ch = new THREE.Mesh(new THREE.BoxGeometry(1.7, .8, 2.4), yel); ch.position.y = 1.5; g.add(ch);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), glassM); cab.position.set(0, 2.5, .3); g.add(cab);
  const rf = new THREE.Mesh(new THREE.BoxGeometry(1.6, .1, 1.5), yel); rf.position.set(0, 3.15, .3); g.add(rf);
  const bc = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .2, 10), new THREE.MeshStandardMaterial({ color: '#ff9a10', emissive: '#ff9a10', emissiveIntensity: .8 })); bc.position.set(0, 3.3, .3); g.add(bc);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.visible = false; return g; }
const walze = roller();
// guard rail on the median
const NPOST = 110, postGeo = new THREE.BoxGeometry(.12, .75, .12).translate(0, .37, 0);
const posts = new THREE.InstancedMesh(postGeo, metal, NPOST * 2); posts.castShadow = true; scene.add(posts);
const rails = [-1, 1].map(s => { const r = new THREE.Mesh(new THREE.BoxGeometry(.05, .32, 1).translate(0, 0, -.5), metal); r.castShadow = true; scene.add(r); return r; });
// lane markings
const DASH = new THREE.InstancedMesh(new THREE.BoxGeometry(.15, .02, 6), paint, 6 * 26); scene.add(DASH);
const edges = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(.25, .02, 1).translate(0, 0, -.5), paint); scene.add(m); return m; });
// reflector posts every 50 m (white, black band, reflector)
const NLP = 9;
const lposts = Array.from({ length: NLP * 2 }, (_, i) => { const g = new THREE.Group(); scene.add(g);
  const p = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.0, .1).translate(0, .5, 0), M('#f4f4f2', { roughness: .5 })); g.add(p);
  const band = new THREE.Mesh(new THREE.BoxGeometry(.125, .25, .105), M('#151515')); band.position.y = .82; g.add(band);
  const r = new THREE.Mesh(new THREE.BoxGeometry(.06, .14, .11), reflM); r.position.y = .82; g.add(r); p.castShadow = true; g.visible = false; return g; });
// bridge with ramps
const bridge = new THREE.Group(); scene.add(bridge); const BZ = -70;
const deck = new THREE.Mesh(new THREE.BoxGeometry(76, .8, 10), [S_CON.side, S_CON.side, S_DECK.top, S_CON.side, S_CON.face, S_CON.face]); deck.position.set(0, 0, 0); bridge.add(deck);
const bridgePillars = [-21, 0, 21].map(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 7), S_CON.face); p.position.set(x, 0, 0); bridge.add(p); return p; });
for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(76, .9, .2), S_CON.face); r.position.set(0, .85, s * 4.9); bridge.add(r); }
bridge.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
const crossRoad = slab(S_DECK);   // at-grade crossing before the bridge
const ramps = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(5, .6, 62), [S_CON.side, S_CON.side, S_DECK.top, S_CON.side, S_CON.face, S_CON.face]); m.castShadow = m.receiveShadow = true; scene.add(m); m.userData.s = s; return m; });
const stopSign = (() => { const g = new THREE.Group(); scene.add(g); const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.4, 8), metal); p.position.y = 1.2; g.add(p);
  const [c, x] = cv(256, 256); x.fillStyle = '#c8102e'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; x.lineTo(128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124); } x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 10; x.stroke(); x.fillStyle = '#fff'; x.font = '700 78px Fredoka'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', 128, 132);
  const s = new THREE.Mesh(new THREE.CircleGeometry(.5, 8), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .5 })); s.position.set(0, 2.4, .06); g.add(s); g.visible = false; return g; })();
const endSign = (() => { const g = new THREE.Group(); scene.add(g); const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.6, 8), metal); p.position.y = 1.3; g.add(p);
  const [c, x] = cv(256, 256); x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 128, 122, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = '#222'; x.stroke();
  x.save(); x.beginPath(); x.arc(128, 128, 116, 0, 7); x.clip(); x.translate(128, 128); x.rotate(-Math.PI / 4); x.fillStyle = '#111'; for (const o of [-36, -12, 12, 36]) x.fillRect(-140, o - 5, 280, 10); x.restore();
  const s = new THREE.Mesh(new THREE.CircleGeometry(.6, 32), new THREE.MeshStandardMaterial({ map: tex(c), roughness: .5 })); s.position.set(0, 2.6, .07); g.add(s); g.visible = false; return g; })();
const sos = (() => { const g = new THREE.Group(); scene.add(g); const b = new THREE.Mesh(new THREE.BoxGeometry(.45, 1.3, .35), M('#ff7a12', { roughness: .5 })); b.position.y = .65; g.add(b);
  const top = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .4), M('#ff7a12')); top.position.y = 1.36; g.add(top);
  const [c, x] = cv(128, 256); x.fillStyle = '#ff7a12'; x.fillRect(0, 0, 128, 256); x.fillStyle = '#fff'; x.font = '700 34px Fredoka'; x.textAlign = 'center'; x.fillText('NOTRUF', 64, 60); x.fillStyle = '#222'; x.fillRect(34, 110, 60, 80);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(.42, .84), new THREE.MeshStandardMaterial({ map: tex(c) })); f.position.set(0, .8, .18); g.add(f); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.visible = false; return g; })();
// villages + trees
for (const [x, z, r] of [[-30, -18, .3], [42, -110, -.4], [-33, -60, .2], [34, -120, -.2], [-30, -150, .5], [36, -175, .1]]) house(x, z, 11, 6.5, 8, r);
for (const [x, z, s] of [[-48, -5, 1.6], [48, -10, 1.5], [-46, -40, 1.7], [50, -70, 1.5], [-52, -95, 1.8], [47, -140, 1.6], [-45, -200, 1.7], [52, -230, 1.8]]) tree(x, z, s);
// rain / snow / dust / mud / water drops / ice
const NR = 900, rain = new THREE.InstancedMesh(new THREE.BoxGeometry(.02, .6, .02), new THREE.MeshBasicMaterial({ color: '#cfe0f5', transparent: true, opacity: .5 }), NR); scene.add(rain);
const RP = Array.from({ length: NR }, () => [rr(-14, 14), rr(0, 14), rr(-30, 10)]);
const snow = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 600); scene.add(snow);
const dustM = new THREE.MeshStandardMaterial({ color: '#cbbfa8', transparent: true, opacity: .45, depthWrite: false, roughness: 1 });
const dust = Array.from({ length: 18 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.6, 10, 8), dustM); m.visible = false; scene.add(m); return m; });
const mudM = M('#4a3528', { roughness: .4 }); const mudBits = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 5), mudM); m.visible = false; scene.add(m); return m; });
const dropM = new THREE.MeshBasicMaterial({ color: '#4aa8ff' }); const drops = Array.from({ length: 24 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), dropM); m.scale.y = 1.6; m.visible = false; scene.add(m); return m; });
const iceM = new THREE.MeshStandardMaterial({ color: '#bfe6ff', emissive: '#6fc6ff', emissiveIntensity: .5, roughness: .1, transparent: true, opacity: .9 });
const ice = Array.from({ length: 22 }, (_, i) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(.16, 0), iceM); m.position.set(-3.6 + (i % 11) * .72, -.75 - Math.floor(i / 11) * .3, Z0 + .05); m.scale.set(1.4, .6, .3); m.visible = false; scene.add(m); return m; });
const crackM = new THREE.MeshBasicMaterial({ color: '#1a1410' });
const cracks = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, 1), crackM); m.position.set(rr(-3, 3), .01, Z0 - 1 - i * 1.6); m.rotation.y = rr(-.6, .6); m.scale.z = rr(1.5, 3); m.visible = false; scene.add(m); return m; });
const bumps = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), [S_GRV.top][0]); m.position.set(rr(-2.5, 2.5), 0, Z0 - 1.5 - i * 1.7); m.scale.set(rr(.6, 1.1), .001, rr(.6, 1)); m.visible = false; scene.add(m); return m; });
const glint = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 40).rotateX(-Math.PI / 2).translate(0, .012, -18), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(glint);
const speedLines = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .7 })); m.visible = false; scene.add(m); return m; });

// ---------- labels (sprites, drawn on top in their own scene) ----------
function label(text, w = 3, col = '#ffd21f') {
  const [c, g] = cv(512, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, 256, 132); g.fillStyle = col; g.fillText(text, 256, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.userData.w = w; return s; }
const overlay = new THREE.Scene();
const LB = { m1: label('1 m', 1.4), drei: label('3 Schichten', 3), stau: label('STAU', 4, '#ff4a3a'), m50: label('50 m', 6), km2: label('alle 2 km', 2.6),
  ex: label('!', 2, '#ff4a3a'), q: label('?', 3), frost: label('Frost', 2.6, '#8fd8ff'), lanes: label('3 Spuren', 6) };
Object.values(LB).forEach(s => overlay.add(s));
const yel = new THREE.MeshBasicMaterial({ color: '#ffd21f', depthTest: false });
const dim1 = (() => { const g = new THREE.Group(); const bar = new THREE.Mesh(new THREE.BoxGeometry(.06, 1, .06), yel); g.add(bar);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.12, .2, 10), yel); if (s < 0) c.rotation.x = Math.PI; c.position.y = s * .5; g.add(c); } overlay.add(g); return g; })();
function lab(s, k, x, y, z) { s.visible = k > .01; s.position.set(x, y, z); s.scale.set(s.userData.w * Math.max(k, .001), s.userData.w / 2 * Math.max(k, .001), 1); }

// ---------- sky / light ----------
const daySky = scene.background;
const nightSky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960);
  gr.addColorStop(0, '#050a1a'); gr.addColorStop(.6, '#101a3a'); gr.addColorStop(1, '#1e2a52'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${rr(.3, 1)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 600), rr(.5, 1.6), 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const greySky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#5d6670'); gr.addColorStop(1, '#b3bac0'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const winterSky = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#9fb3c8'); gr.addColorStop(1, '#eef3f7'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hemi = scene.children.find(o => o.isHemisphereLight);
scene.fog = new THREE.Fog('#dfe7ee', 70, 330); const dayFog = scene.fog.color.clone();
sun.position.set(-30, 45, 30); sun.target.position.set(0, 0, -25);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 200 }); sun.shadow.camera.updateProjectionMatrix();

// ---------- camera: key frames, a duplicated time = hard cut ----------
const camera = new THREE.PerspectiveCamera(46, W / H, .1, 900);
const CUT = .001;
const KEYS = [
  [0, V(10, 8, 26), V(0, 0, -30)], [tw.wiese, V(6, 3.6, 16), V(0, .6, -14)],
  [tw.aber1, V(5.5, 3.2, 14), V(0, .6, -14)], [tw.aber1 + CUT, V(4, 1.7, -2.5), V(0, .5, -9.5), 1], [tw.also1, V(3.5, 1.5, -3.2), V(0, .5, -9.5)],
  [tw.also1 + CUT, V(9, 4.2, 17), V(0, -.6, -1), 1], [tw.fullst, V(7, 3.2, 14), V(0, -.5, 0)], [tw.wasser1, V(3.6, .8, 11.5), V(0, -.5, 4)], [tw.aber2, V(3.4, .7, 11), V(0, -.5, 4)],
  [tw.aber2 + CUT, V(9, 4.5, 18), V(0, -.4, -2), 1], [tw.gefriert, V(7.5, 3.5, 15), V(0, -.4, 0)], [tw.dehnt, V(3, .1, 10), V(0, -.8, 4)], [tw.reisst - .1, V(3, .1, 10), V(0, -.8, 4)],
  [tw.reisst + CUT, V(5, 4.2, 9), V(0, 0, -4), 1], [tw.also2, V(5.2, 4.4, 9.5), V(0, 0, -4)],
  [tw.also2 + CUT, V(4.5, .9, 12), V(0, -.55, 4), 1], [tw.meter1, V(3.2, .3, 10), V(0, -.55, 5)], [tw.aber3, V(3.1, .3, 9.8), V(0, -.55, 5)],
  [tw.aber3 + CUT, V(2.8, 1.3, -2), V(0, .2, -16), 1], [tw.also3, V(3.2, 1.4, -1), V(0, .2, -16)],
  [tw.also3 + CUT, V(9, 4.5, 14), V(0, .3, -6), 1], [tw.drei1, V(7, 2.4, 12), V(0, -.1, 0)], [tw.oberste, V(3.4, .4, 10), V(0, -.15, 5)],
  [tw.ganz2, V(3.4, .4, 10), V(0, -.15, 5)], [tw.ganz2 + CUT, V(1.6, .45, 3), V(0, .05, -22), 1], [tw.aber4, V(1.3, .4, 1), V(0, .05, -22)],
  [tw.aber4 + CUT, V(16, 10, -8), V(0, 0, -32), 1], [tw.zu, V(8, 4, -20), V(0, .6, -34)],
  [tw.also4 + CUT, V(0, 30, 30), V(0, 0, -15), 1], [tw.leitplanke - .2, V(0, 26, 26), V(0, 0, -15)],
  [tw.leitplanke + CUT, V(2.6, 1.6, 2), V(.4, .5, -14), 1], [tw.aber5, V(2.2, 1.5, -2), V(.4, .5, -18)],
  [tw.aber5 + CUT, V(14, 9, -36), V(0, .5, -70), 1], [tw.also5, V(13, 8.5, -38), V(0, .5, -70)],
  [tw.also5 + CUT, V(34, 13, -36), V(0, 4, -72), 1], [tw.auffahrten, V(38, 15, -24), V(14, 2, -58)], [tw.aber6, V(39, 15.5, -22), V(14, 2, -58)],
  [tw.aber6 + CUT, V(6, 9, 26), V(4, 0, -22), 1], [tw.also6, V(7, 10, 28), V(4, 0, -22)],
  [tw.also6 + CUT, V(-4, 14, 24), V(4, 0, -26), 1], [tw.aber7, V(-2, 13, 22), V(5, 0, -26)],
  [tw.aber7 + CUT, V(6.5, 2.6, 16), V(7, .6, -45), 1], [tw.also7, V(6.5, 2.6, 16), V(7, .6, -45)], [tw.leitpf, V(12, 4, 14), V(8, .5, -40)], [tw.aber8, V(12.5, 4.2, 15), V(8, .5, -40)],
  [tw.aber8 + CUT, V(15, 3.4, 6), V(8.5, 1, -10), 1], [tw.also8, V(15.5, 3.6, 7), V(8.5, 1, -10)],
  [tw.also8 + CUT, V(22, 5, 9), V(11, .5, -10), 1], [tw.notruf - .3, V(20, 3, 3), V(13, 1, -6)], [tw.gluck, V(19.5, 2.8, 2), V(13, 1, -6)],
  [tw.gluck + CUT, V(30, 30, 36), V(0, 0, -45), 1], [tw.deutschland, V(24, 24, 30), V(0, 0, -45)],
  [tw.deutschland + CUT, V(18.5, 1.4, 4), V(9, 1.4, -18), 1], [END, V(18.2, 1.3, 2.5), V(8, 1.4, -18)]];
KEYS.sort((a, b) => a[0] - b[0]);
for (let i = KEYS.length - 1; i > 0; i--) if (KEYS[i][3] && KEYS[i][0] - KEYS[i - 1][0] > 2 * CUT) KEYS.splice(i, 0, [KEYS[i][0] - CUT, KEYS[i - 1][1], KEYS[i - 1][2]]);
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- traffic flow on the finished road ----------
const FLOW = [];   // [side, lane, speed, phase, vehicle]
{ let ci = 0, ti = 0;
  for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { const truck = k % 4 === 3 && ti < trucks.length; const v = truck ? trucks[ti++] : cars[ci++ % cars.length];
    FLOW.push({ s, lane: truck ? 99 : k % 3, speed: truck ? 22 : 30 + (k % 3) * 8, ph: k * 37 + (s > 0 ? 0 : 13), v }); } }
function flow(t, L, n = 99, night = 0) {
  const lanes = L.lanes > 2.5 ? 3 : 2;
  FLOW.forEach((f, i) => { if (i >= n) return; const lane = f.lane === 99 ? lanes - 1 : Math.min(f.lane, lanes - 1);
    const span = 360, zz = ((f.ph + t * f.speed) % span); const z = f.s < 0 ? Z0 - 4 - zz : -span + 8 + zz;
    putV(f.v, laneX(L, f.s, lane), z, f.s > 0 ? -1 : 1, t, f.speed); }); }

// ---------- the timeline ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V(1, 1, 1);
function update(t) {
  // sky + light
  const night = win(t, tw.aber7 - .05, tw.aber8, .3), grey = win(t, tw.aber1 - .1, tw.also1, .2), winter = win(t, tw.aber2 - .05, tw.also2, .25);
  scene.background = night > .5 ? nightSky : grey > .5 ? greySky : winter > .5 ? winterSky : daySky;
  hemi.intensity = lerp(lerp(1.0, .6, grey), .9, night) * .55; sun.intensity = lerp(lerp(2.7, .8, grey), .45, night); fill.intensity = lerp(.5, .12, night); sun.color.set(night > .5 ? '#8fa6ff' : '#fff3e0');
  scene.environmentIntensity = lerp(lerp(ENV0, .35, grey), .06, night); renderer.toneMappingExposure = lerp(1.05, .95, night);
  scene.fog.color.copy(dayFog).lerp(new THREE.Color('#8f979e'), grey).lerp(new THREE.Color('#e9eef3'), winter).lerp(new THREE.Color('#0d1430'), night);
  S_GRASS.top.color.set('#7db552').lerp(new THREE.Color('#f4f7fa'), winter * .85);
  headM.emissiveIntensity = .6 + 3 * night; tailM.emissiveIntensity = .4 + 2 * night; beamM.opacity = 0;
  reflM.emissiveIntensity = night * 3 * ramp(t, tw.reflekt - .2, tw.reflekt + .3); blinkM.emissiveIntensity = Math.sin(t * 9) > 0 ? 2.5 : 0;

  // ---- road build-up ----
  const L = layout(t);
  const dig1 = ease(t, tw.grabst - .1, tw.aus1 + .3), grvA = ease(t, tw.schotter1 - .2, tw.damit1);       // first dig 0.5 m, gravel road
  const redo = ease(t, tw.also2 - .1, tw.also2 + .4), dig2 = ease(t, tw.also2, tw.frost - .1);           // dig to 1 m
  const frostK = ease(t, tw.frost - .1, tw.kies + .3), grvB = ease(t, tw.kies, tw.meter1);
  const ak = [ease(t, tw.drei1 - .2, tw.schichten), ease(t, tw.schichten, tw.asphalt + .2), ease(t, tw.asphalt + .1, tw.drauf + .3)];
  const soilTop = -.5 * dig1 - .5 * dig2;
  const roadTop = lerp(-.5 + .5 * grvA * (1 - redo), -.26, cl(redo + 0)) ;
  const grvTop = redo < .5 ? lerp(-.5, 0, grvA) : lerp(-.45, -.26, grvB);
  const grvBot = redo < .5 ? -.5 : -.45;
  const layersY = [[-.26, -.12], [-.12, -.04], [-.04, 0]];
  // corridor extents
  const spans = L.R ? [L.L, L.R] : [L.single];
  // outer ground + median
  const xl = spans[0][0], xr = spans[spans.length - 1][1];
  setGround(-GW, xl, 0, gL, sL); setGround(xr, GW, 0, gR, sR);
  if (L.R && L.mr - L.ml > .05) setGround(L.ml, L.mr, 0, gM, sM); else { gM.visible = sM.visible = false; }
  base.size(-GW, GW, -3.2, -1.6, ZF, Z0); fitRep(base);
  corr.forEach((c, i) => { const sp = spans[i]; if (!sp) { Object.values(c).forEach(m => m.visible = false); return; } const [a, b] = sp;
    const before = t < tw.grabst - .1;
    c.soil.size(a, b, -1.6, before ? -.1 : soilTop, ZF, Z0); fitRep(c.soil);
    c.mud.visible = false;
    const fr = frostK > .001 ? lerp(-1, -.45, frostK) : -1; c.frost.size(a, b, -1, fr, ZF, Z0); fitRep(c.frost);
    if (t > tw.schotter1 - .25) { const top = redo < .5 ? lerp(grvTop, grvBot, redo * 2) : grvTop; c.grv.size(a, b, grvBot, Math.max(grvBot + .002, top), ZF, Z0); if (c.grv.visible) fitRep(c.grv); } else c.grv.visible = false;
    const rl = walzeZ(t);
    [c.trag, c.bind, c.deck].forEach((m, j) => { if (ak[j] < .002) { m.visible = false; return; } const [y0, y1] = layersY[j]; m.size(a, b, y0, lerp(y0, y1, ak[j]), Math.min(rl, Z0 - .01), Z0); if (m.visible) fitRep(m); });
    if (before) { gM.visible = false; }
  });
  // before digging: the corridor is meadow too (grass top on the soil)
  if (t < tw.grabst - .1) { const [a, b] = L.single; gM.size(a, b, -.1, 0, ZF, Z0); fitRep(gM); }
  path.size(-1.4, 1.4, -.099, .004, ZF, Z0); path.visible = t < tw.grabst - .05; fitRep(path);
  S_MUD.top.color.set('#8a6a50').lerp(new THREE.Color('#3e2e24'), ease(t, tw.regnet - .3, tw.schlamm)); S_MUD.top.roughness = lerp(.9, .25, ease(t, tw.regnet, tw.schlamm));

  // ---- cars ----
  ALLV.forEach(v => v.visible = false);
  if (t < tw.aber1) putV(hero, .6, lerp(-2, -10, ease(t, 0, tw.aber1)), -1, t, 4, -.03);
  else if (t < tw.also1) { const sink = .22 * ease(t, tw.schlamm - .3, tw.schlamm + .3); putV(hero, .6, -10, -1, t * 3, 6, -.03 - sink); hero.rotation.z = .04 * Math.sin(t * 20) * ease(t, tw.schlamm, tw.fest);
    mudBits.forEach((m, i) => { const ph = (t * 1.6 + i / 16) % 1; m.visible = t > tw.schlamm - .1; m.position.set(.6 + (i % 2 ? .85 : -.85) + rr(-.05, .05), .2 + Math.sin(ph * Math.PI) * 1.2, -10 + 1.6 + ph * 2.2); }); }
  if (t >= tw.also1) mudBits.forEach(m => m.visible = false);
  if (t > tw.aber3 && t < tw.also3) { const z = lerp(-40, -4, ease(t, tw.aber3, tw.also3)); putV(cars[20], 0, z, 1, t, 10, -.26 + Math.abs(Math.sin(t * 25)) * .05); cars[20].rotation.z = .03 * Math.sin(t * 31);
    dust.forEach((d, i) => { const ph = (t * .8 + i / 18) % 1; d.visible = t > tw.rumpelt - .3; d.position.set(rr(-.3, .3) + Math.sin(i) * ph * 1.5, .4 + ph * 1.8, z - 2.6 - ph * 6); d.scale.setScalar(.4 + ph * 1.6); }); }
  else dust.forEach(d => d.visible = false);
  if (t > tw.aber4 && t < tw.also4) { const k = ease(t, tw.aber4, tw.zu + .2); putV(cars[21], -1.4 + .2 * k, lerp(-70, -36.5, k), 1, t, 30); putV(cars[22], -1.4 + .2 * k, lerp(-2, -33, k), -1, t, 30); }
  lab(LB.ex, win(t, tw.frontal, tw.also4, .15), -1, 4, -35);
  if (t >= tw.also4 && t < tw.aber5) flow(t, L, 10);
  if (t >= tw.aber5 && t < tw.also5 + .8) { // crossing at grade: braking
    const k = ease(t, tw.aber5, tw.bremsen + .2); putV(cars[23], laneX(L, -1 * -1, 1), lerp(-20, BZ + 9, k), -1, t, 20 * (1 - k)); cars[23].userData.blinks;
    tailM.emissiveIntensity = t > tw.bremsen - .2 ? 3 : tailM.emissiveIntensity;
    putV(cars[24], lerp(-40, 40, ramp(t, tw.kreuzung - .5, tw.also5 + .8)), BZ - 1.8, 1, t, 20); cars[24].rotation.y = -Math.PI / 2;
    putV(cars[25], lerp(45, -45, ramp(t, tw.kreuzung, tw.also5 + 1.2)), BZ + 1.8, 1, t, 20); cars[25].rotation.y = Math.PI / 2; }
  stopSign.visible = t > tw.aber5 - .1 && t < tw.brucken; stopSign.position.set(laneX(L, 1, 1) + 3.4, 0, BZ + 7.5);
  // bridge rises out of the crossing
  const bk = ease(t, tw.quer - .2, tw.brucken + .5); const bridgeOn = t > tw.aber5 - .2;
  crossRoad.size(-GW, GW, -.08, .015, BZ - 4, BZ + 4); crossRoad.visible = bridgeOn && bk < .02; if (crossRoad.visible) fitRep(crossRoad);
  bridge.visible = bridgeOn && bk > .01; bridge.position.set(0, 6.2 * bk, BZ);
  bridgePillars.forEach(p => { p.scale.y = Math.max(6.2 * bk, .01); p.position.y = -3.1 * bk - .2; });
  const rk = ease(t, tw.auffahrten - .2, tw.auffahrten + .5);
  ramps.forEach(r => { r.visible = bridgeOn && bk > .9; const s = r.userData.s, ang = Math.atan2(6.2, 60);
    r.position.set(s * 21.5, 3.1, BZ + 33); r.rotation.set(ang, 0, 0); r.scale.set(Math.max(rk, .001), 1, 1); });
  if (t >= tw.also5 + .8 && t < tw.aber6) { flow(t, L, 12); if (rk > .5) putV(cars[26], 21.5, lerp(BZ + 4, BZ + 50, ramp(t, tw.auffahrten, tw.aber6)), 1, t, 15, lerp(6.4, 1, ramp(t, tw.auffahrten, tw.aber6))); }
  // traffic jam behind two trucks overtaking each other
  if (t >= tw.aber6 && t < tw.also6) { const k = ramp(t, tw.aber6, tw.also6);
    putV(trucks[4], laneX(L, 1, 1), -24 - k * 4, -1, t, 6); putV(trucks[5], laneX(L, 1, 0), -27 - k * 4, -1, t, 6);
    for (let i = 0; i < 10; i++) { const lane = i % 2, row = Math.floor(i / 2); putV(cars[20 + i], laneX(L, 1, lane), -11 + row * 6.2 - k * 4, -1, t, 6); }
    flow(t, L, 6); }
  lab(LB.stau, win(t, tw.staut - .2, tw.also6 + .2, .25), 3.8, 6, -6);
  if (t >= tw.also6 && t < tw.aber7) { const k = ease(t, tw.rechts1 - .2, tw.langsamen + .3);
    putV(trucks[4], laneX(L, 1, lerp(1, 2, k)), -28 - (t - tw.also6) * 6, -1, t, 6); putV(trucks[5], laneX(L, 1, lerp(0, 2, k)), -46 - (t - tw.also6) * 6, -1, t, 6);
    for (let i = 0; i < 8; i++) { const lane = i % 2; putV(cars[20 + i], laneX(L, 1, lane), -12 + Math.floor(i / 2) * 7 - (t - tw.also6) * (12 + 10 * k + i), -1, t, 20); }
    flow(t, L, 18); }
  lab(LB.lanes, win(t, tw.drei2, tw.aber7, .25), 7, 5.5, -16);
  if (t >= tw.aber7 && t < tw.aber8) flow(t, L, 18, night);
  lab(LB.q, win(t, tw.siehst, tw.also7, .25), 8, 4, -30);
  // breakdown + shoulder + emergency phone
  const panne = t >= tw.aber8 && t < tw.gluck;
  if (panne) { const onSh = ease(t, tw.stand, tw.stand + .9); const xs = lerp(laneX(L, 1, 2), shoulderX(L, 1), onSh); putV(hero, xs, -11, -1, 0, 0);
    putV(trucks[6], laneX(L, 1, 2) + .1, lerp(30, -2.5, ease(t, tw.liegen, tw.verkehr + .3)) - 10 * ease(t, tw.also8, tw.stand), -1, t, 10);
    if (t > tw.also8) trucks[6].position.x = lerp(laneX(L, 1, 2), laneX(L, 1, 1), ease(t, tw.verkehr + .2, tw.also8 + .4)), trucks[6].position.z = -2.5 - 30 * ease(t, tw.also8, tw.stand + 1.5);
    flow(t, L, 12); }
  blinkM.emissiveIntensity = panne ? blinkM.emissiveIntensity : 0;
  sos.visible = t > tw.notruf - .2; sos.position.set(shoulderX(L, 1) + 2.0, 0, -4); sos.rotation.y = -Math.PI / 2; sos.scale.setScalar(Math.max(pop(t, tw.notruf - .2), .001));
  lab(LB.km2, win(t, tw.zwei2 - .1, tw.gluck, .25), shoulderX(L, 1) + .9, 2.3, -4);
  // final: full traffic, end-of-restrictions sign, sports car
  if (t >= tw.gluck) { flow(t, L, 18); endSign.visible = true; endSign.position.set(shoulderX(L, 1) + 2.2, 0, -12); endSign.rotation.y = 0;
    const k = ramp(t, tw.deutschland + .1, tw.deutschland + 1.4); if (k > 0 && k < 1) putV(sport, laneX(L, 1, 0), lerp(20, -160, k), -1, t, 60);
    const k2 = ramp(t, tw.schnell - .2, tw.schnell + .9); if (k2 > 0 && k2 < 1) putV(sport, laneX(L, 1, 0), lerp(25, -160, k2), -1, t, 60);
    speedLines.forEach((m, i) => { m.visible = sport.visible; m.position.set(sport.position.x + (i % 2 ? 1 : -1) * (1.1 + (i % 5) * .15), .3 + (i % 7) * .14, sport.position.z + 4 + (i % 4) * 2); }); }
  else { endSign.visible = false; speedLines.forEach(m => m.visible = false); }

  // ---- markings, guard rail, reflector posts ----
  const markOn = t > tw.also4 + .2; let di = 0;
  if (markOn && L.R) { const nl = L.lanes > 2.5 ? 3 : 2, kk = ease(t, tw.also4 + .2, tw.leitplanke);
    for (const s of [-1, 1]) for (let j = 1; j < nl; j++) { const x = s * (Math.abs(laneX(L, s, j - 1)) + LANE / 2); for (let n = 0; n < 26; n++) { const z = Z0 - 3 - n * 18; if (z < lerp(Z0, ZF, kk)) continue;
      _m.makeTranslation(x, .012, z); DASH.setMatrixAt(di++, _m); } } }
  DASH.count = di; DASH.instanceMatrix.needsUpdate = true;
  const edgeX = L.R ? [L.L[1] - .3, L.R[0] + .3, L.R[1] - .3 - L.shoulder, L.L[0] + .3 + L.shoulder] : [];
  edges.forEach((m, i) => { m.visible = markOn && !!L.R; if (!m.visible) return; m.position.set(edgeX[i], .012, Z0); m.scale.z = (Z0 - lerp(Z0, ZF, ease(t, tw.also4 + .2, tw.leitplanke))) + .01; });
  const gk = ramp(t, tw.leitplanke - .1, tw.leitplanke + .8);
  let pi = 0; if (L.R && gk > 0) for (const s of [-1, 1]) for (let n = 0; n < NPOST; n++) { const z = Z0 - .5 - n * 2; if ((Z0 - z) > gk * 220) continue; _m.makeTranslation(s * .25, 0, z); posts.setMatrixAt(pi++, _m); }
  posts.count = pi; posts.instanceMatrix.needsUpdate = true;
  rails.forEach((r, i) => { r.visible = gk > 0 && !!L.R; r.position.set((i ? 1 : -1) * .33, .62, Z0 - .5); r.scale.z = Math.max(gk * 220, .01); });
  lposts.forEach((g, i) => { const s = i < NLP ? 1 : -1, n = i % NLP; const k = pop(t, tw.leitpf - .2 + n * .08); g.visible = !!L.R && k > .01 && t > tw.leitpf - .3;
    if (!g.visible) return; g.position.set(s * ((s > 0 ? L.R[1] : -L.L[0]) + .6), 0, Z0 - 2 - n * 50); g.scale.setScalar(k); });
  lab(LB.m50, win(t, tw.funfzig - .1, tw.aber8, .25), (L.R ? L.R[1] : 8) + 1.5, 2.6, Z0 - 27);

  // ---- weather / frost / water ----
  const rk2 = win(t, tw.aber1 - .2, tw.also1 + .1, .3); rain.visible = rk2 > .02;
  if (rain.visible) { for (let i = 0; i < NR; i++) { const [x, y, z] = RP[i]; _m.makeTranslation(x, ((y - t * 14) % 14 + 14) % 14, z); rain.setMatrixAt(i, _m); } rain.instanceMatrix.needsUpdate = true; }
  snow.visible = winter > .02; if (snow.visible) { for (let i = 0; i < 600; i++) { const [x, y, z] = RP[i]; _m.makeTranslation(x + Math.sin(t + i) * .3, ((y - t * 1.6) % 14 + 14) % 14, z); snow.setMatrixAt(i, _m); } snow.instanceMatrix.needsUpdate = true; }
  drops.forEach((d, i) => { const ph = (t * 1.1 + i / 24) % 1; d.visible = t > tw.wasser1 - .2 && t < tw.aber2; d.position.set(-3.5 + (i % 12) * .62, lerp(0, -1.5, ph), Z0 + .06); });
  const ik = ease(t, tw.gefriert - .1, tw.dehnt + .3) * (1 - ease(t, tw.also2, tw.frost));
  ice.forEach((m, i) => { m.visible = ik > .02; m.scale.set(1.4 * ik * (1 + .3 * ease(t, tw.dehnt, tw.reisst)), .6 * ik, .3); });
  const heave = ease(t, tw.dehnt, tw.reisst + .2) * (1 - redo);
  bumps.forEach((b, i) => { b.visible = heave > .02; b.position.y = grvTop - .02; b.scale.y = Math.max(.25 * heave, .001); });
  cracks.forEach((c, i) => { c.visible = t > tw.reisst - .05 && redo < .5; c.position.y = grvTop + .03 + .15 * heave; });
  lab(LB.frost, win(t, tw.gefriert, tw.also2, .25), 2.5, -.6, Z0 + .5);
  glint.material.opacity = .35 * win(t, tw.fein - .2, tw.aber4, .3); glint.position.z = Z0 - 6 - (t - tw.fein) * 3;
  // labels for the layers
  const k1 = win(t, tw.meter1 - .1, tw.aber3, .25); lab(LB.m1, k1, 1.3, -.5, Z0 + .7);
  dim1.visible = k1 > .01; dim1.position.set(2.3, -.5, Z0 + .4); dim1.scale.set(1, Math.max(k1, .001), 1);
  lab(LB.drei, win(t, tw.schichten, tw.ganz2, .25), 1.4, .9, Z0 + .5);

  // ---- roller ----
  walze.visible = t > tw.also3 - .2 && t < tw.aber4; walze.position.set(0, lerp(-.26, 0, ak[0]), walzeZ(t) - 2.6);

  // ---- worker ----
  let pose = POSE.idle, wp = [5.6, 0, 3], face = -Math.PI / 2; du.visible = true; du.userData.shovel.visible = false;
  if (t < tw.aber1) du.visible = false;
  else if (t < tw.also1) { wp = [2.2, -.05, -9]; pose = mixP(POSE.idle, POSE.headhold, ease(t, tw.steckst, tw.schlamm)); face = Math.PI * .4; }
  else if (t < tw.aber2) { wp = [5, 0, 3.6]; face = -Math.PI / 2 - .3; du.userData.shovel.visible = true; const ph = Math.sin(t * 7); pose = mixP(POSE.dig, POSE.lift, .5 + .5 * ph); }
  else if (t < tw.also2) { wp = [5.2, 0, 4.4]; face = -Math.PI / 2 - .4; pose = mixP(POSE.idle, POSE.headhold, ease(t, tw.reisst, tw.reisst + .3)); }
  else if (t < tw.aber3) { wp = [5, 0, 4]; face = -Math.PI / 2 - .3; du.userData.shovel.visible = true; const ph = Math.sin(t * 7); pose = mixP(POSE.dig, POSE.lift, .5 + .5 * ph); }
  else if (t < tw.also3) { wp = [6, 0, -9]; face = Math.PI * .7; pose = mixP(POSE.idle, POSE.point, ease(t, tw.staub - .3, tw.staub)); }
  else if (t < tw.aber4) { wp = [0, lerp(-.26, 0, ak[0]) + 1.75, walzeZ(t) - 2.3]; face = Math.PI; pose = POSE.sit; }
  else if (t < tw.aber8) { wp = [(L.R ? L.R[1] : 4.2) + 3, 0, 1]; face = -Math.PI / 2 - .2; pose = t > tw.leitplanke || t > tw.brucken ? mixP(POSE.idle, POSE.cheer, win(t, tw.leitplanke, tw.aber5, .3) + win(t, tw.langsamen, tw.aber7, .3)) : POSE.idle;
    if (t > tw.aber5 && t < tw.aber6) du.visible = false; }
  else if (t < tw.gluck) { const onSh = ease(t, tw.stand, tw.stand + .9); wp = [lerp(laneX(L, 1, 2), shoulderX(L, 1), onSh) + 1.6, 0, -9]; face = Math.PI * .5;
    pose = t < tw.also8 ? mixP(POSE.idle, POSE.headhold, ease(t, tw.liegen, tw.verkehr)) : t > tw.notruf - .3 ? POSE.phone : POSE.idle;
    if (t > tw.notruf - .3) { wp = [shoulderX(L, 1) + 1.7, 0, -4.7]; face = Math.PI; } }
  else { wp = [shoulderX(L, 1) + 1.8, 0, -8]; face = -Math.PI * .6; pose = mixP(POSE.idle, POSE.cheer, .5 + .5 * Math.sin(t * 5)); }
  du.position.set(...wp); du.rotation.set(0, face, 0); applyPose(du, pose);

  placeCamera(t);
}
function walzeZ(t) { return lerp(Z0, -70, ease(t, tw.walzt - .2, tw.aber4 - .1)) - (t > tw.aber4 ? 400 : 0); }

// ---------- render: AO + MSAA, sprites on top ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const AO = +(Q.get('ao') ?? 0);   // GTAO draws black screen-space rectangles here (as in 04), off by default
if (AO > 0) { const gtao = new GTAOPass(scene, camera, W, H); gtao.updateGtaoMaterial({ radius: .8, distanceExponent: 2, thickness: 1, scale: 1, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 }); gtao.blendIntensity = AO; composer.addPass(gtao); }
composer.addPass(new OutputPass());
window.END = END; window.TW = tw;
window.renderAt = (t, q = .93) => { update(t); composer.render(); renderer.autoClear = false; renderer.render(overlay, camera); renderer.autoClear = true;
  return renderer.domElement.toDataURL('image/jpeg', q); };
window.__done = true;
