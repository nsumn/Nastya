// ===================== 22 Kölsch — a Cologne Brauhaus, wooden mannequin people (style of @attenbouroughsplanet), hard cuts =====================
// Build: cat lib.js koelsch_main.js > koelsch.js   (./render_video.sh koelsch 22_koelsch). Captions: caption layer (captions.json).
// Three sets far apart, the camera cuts between them: main room (x 0), long table for 20 (x 60), brewery shelf + contract (x -60).
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

await document.fonts.load('700 96px Fredoka');
const WORDS = await (await fetch('../22_koelsch/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function TE(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w) === word && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const tw = {
  glas1: TE('Glas'), tisch1: TE('Tisch'), stellst: TE('stellst'), koelsch1: TE('Kölsch'),
  aber1: TE('Aber'), grossen: TE('großen'), warm: TE('warm'), schal: TE('schal'),
  also1: TE('Also'), schmales: TE('schmales'), nullw: TE('null'), litern1: TE('Litern'), stange: TE('Stange'),
  aber2: TE('Aber', 2), drei: TE('drei'), schlucken: TE('Schlucken'), leer: TE('leer'), nachb: TE('nachbestellen'),
  also2: TE('Also', 2), lauft: TE('läuft'), kellner: TE('Kellner'), bringt: TE('bringt'), neues: TE('neues'), koebes1: TE('Köbes'),
  aber3: TE('Aber', 3), zwei: TE('zwei', 2), glaeser: TE('Gläser'), tragen: TE('tragen'),
  also3: TE('Also', 3), rundes: TE('rundes'), tablett: TE('Tablett'), loechern: TE('Löchern'), griff: TE('Griff'), mitte: TE('Mitte'), kranz: TE('Kranz'),
  aber4: TE('Aber', 4), nie: TE('nie'), bringen: TE('bringen'),
  also4: TE('Also', 4), legst: TE('legst'), deckel1: TE('Bierdeckel'), aufs: TE('aufs'), heisst: TE('heißt'), genug: TE('genug'),
  aber5: TE('Aber', 5), keiner: TE('keiner'), viele: TE('viele'), hatte: TE('hatte'),
  also5: TE('Also', 5), macht: TE('macht'), strich: TE('Strich'), deckel2: TE('Bierdeckel', 2), rechnung: TE('Rechnung'),
  aber6: TE('Aber', 6), zwanzig: TE('zwanzig'), leuten: TE('Leuten'), koebes3: TE('Köbes', 3), hinterher: TE('hinterher'),
  also6: TE('Also', 6), stellt: TE('stellt'), fass: TE('Fass'), zehn: TE('zehn'), tisch3: TE('Tisch', 3), pitter: TE('Pittermännchen'),
  aber7: TE('Aber', 7), brauerei: TE('Brauerei'), deutschland: TE('Deutschland'), koelsch3: TE('Kölsch', 3), nennen: TE('nennen'),
  also7: TE('Also', 7), unter: TE('unterschreiben'), brauer: TE('Brauer'), vertrag: TE('Vertrag'), koelsch4: TE('Kölsch', 4), nur3: TE('nur', 3), koeln3: TE('Köln', 2), kommen: TE('kommen'),
  konv: TE('Kölsch-Konvention'),
  gluck: TE('Glückwunsch'), brauhaus: TE('Brauhaus'), gebaut: TE('gebaut'), und9: TE('Und'), alt: TE('Alt'), bestellst: TE('bestellst'), fliegst: TE('fliegst'), raus: TE('raus') };

// ---------- sound ----------
const SFX = { end: END, music_gain: .06, events: [], beds: [[0, END, 'pub', .5]] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
e(.05, 'whoosh', .4); e(tw.stellst, 'clack', .7); e(tw.koelsch1, 'ding', .6);
e(tw.warm, 'boom', .35); e(tw.schal, 'poof', .6);
e(tw.schmales, 'pop', .8); e(tw.nullw, 'ding', .5); e(tw.stange, 'sparkle', .7);
for (const k of [0, 1, 2]) e(tw.drei + k * .42 + .15, 'tick', .5); e(tw.leer, 'boing', .5); e(tw.nachb, 'ding', .4);
e(tw.lauft, 'whoosh', .5); e(tw.neues, 'clink', .9); e(tw.koebes1, 'tada', .5);
e(tw.zwei, 'clink', .6); for (const k of [0, 1, 2, 3]) e(tw.glaeser + k * .25, 'ding', .25);
e(tw.rundes, 'pop', .7); for (let k = 0; k < 6; k++) e(tw.loechern + k * .06, 'tick', .5); e(tw.griff, 'swoosh_up', .7);
for (let k = 0; k < 11; k++) e(tw.mitte + k * .07, 'clink', .35); e(tw.kranz, 'sparkle', .8);
for (let k = 0; k < 8; k++) e(tw.aber4 + .3 + k * .22, 'clink', .45);
e(tw.aufs, 'clack', .7); e(tw.genug, 'ding', .7);
e(tw.keiner, 'boing', .4);
for (let k = 0; k < 7; k++) e(tw.strich - .2 + k * .25, 'tick', .7); e(tw.rechnung, 'ding', .7);
e(tw.aber6, 'whoosh', .5); e(tw.zwanzig, 'pop', .7); e(tw.hinterher, 'boing', .7);
e(tw.fass - .1, 'clack', 1); e(tw.zehn, 'ding', .6); e(tw.pitter, 'tada', .6);
e(tw.aber7, 'whoosh', .5); for (let k = 0; k < 4; k++) e(tw.brauerei + k * .25, 'pop', .5); e(tw.koelsch3, 'ding', .4);
e(tw.unter, 'hiss', .35); e(tw.vertrag, 'clack', .6); for (let k = 0; k < 4; k++) e(tw.nur3 + k * .12, 'buzz', .35); e(tw.koeln3, 'sparkle', .8); e(tw.konv, 'clack', 1);
e(tw.gluck, 'tada', .9); e(tw.gluck + .1, 'clink', .8); e(tw.alt, 'boom', .5); e(tw.fliegst, 'boing', 1); e(tw.raus, 'whoosh', 1);
window.SFX = SFX;

// ---------- photo textures (Poly Haven, CC0) + HDRI light ----------
const TL = new THREE.TextureLoader();
const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
const pbr = async n => ({ d: await ld(n + '_diff_1k.jpg', true), n: await ld(n + '_nor_gl_1k.jpg', false) });
const [TX_WOOD, TX_PLAST, HDR] = await Promise.all([pbr('wood_planks'), pbr('concrete_wall_004'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
HDR.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(HDR).texture; scene.environmentIntensity = .3;
scene.background = new THREE.Color('#24160d'); scene.fog = null;
function texMat(p, color, rx, ry, o = {}) { const d = p.d.clone(), n = p.n.clone(); d.repeat.set(rx, ry); n.repeat.set(rx, ry); d.needsUpdate = n.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: d, normalMap: n, color, roughness: o.rough ?? .8 }); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); return m; }
const floorM = texMat(TX_WOOD, '#c08a58', 6, 6), panelM = texMat(TX_WOOD, '#7a4a2a', 6, 1, { rough: .6 }), plasterM = texMat(TX_PLAST, '#f3e4c4', 4, 2, { ns: .5 });
const tableM = texMat(TX_WOOD, '#9a6234', 1, 1, { rough: .45 }), beamM = texMat(TX_WOOD, '#4a2c18', 4, .3), longTableM = texMat(TX_WOOD, '#9a6234', 4, .6, { rough: .45 });
const barrelM = texMat(TX_WOOD, '#a86c38', 2, 1, { rough: .5 });
const brassM = new THREE.MeshStandardMaterial({ color: '#d6a740', metalness: .9, roughness: .3 });
const ironM = new THREE.MeshStandardMaterial({ color: '#3a3a3c', metalness: .8, roughness: .4 });
const steelM = new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: .9, roughness: .25 });
const glassM = new THREE.MeshStandardMaterial({ color: '#eef6ff', transparent: true, opacity: .16, roughness: .05, depthWrite: false, side: THREE.DoubleSide });
const beerM = new THREE.MeshStandardMaterial({ color: '#e8a018', emissive: '#b86a00', emissiveIntensity: .45, roughness: .2 });
const staleM = new THREE.MeshStandardMaterial({ color: '#b98a3a', emissive: '#4a2c00', emissiveIntensity: .2, roughness: .3, transparent: true, opacity: .93 });
const altM = new THREE.MeshStandardMaterial({ color: '#5a2a0e', emissive: '#2a1000', emissiveIntensity: .25, roughness: .2 });
const foamM = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: .9 });
const blackM = M('#141414', { roughness: .5 }), whiteM = M('#ffffff', { roughness: .3 });

// ---------- rooms ----------
function box(w, h, d, mat, x, y, z, cast = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; }
function room(cx, w = 18, z0 = -8, z1 = 7) {
  const d = z1 - z0, zc = (z0 + z1) / 2;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), floorM); fl.position.set(cx, 0, zc); fl.receiveShadow = true; scene.add(fl);
  box(w, 1.3, .1, panelM, cx, .65, z0, false); box(w, 2.8, .1, plasterM, cx, 2.7, z0 - .02, false);                       // back wall: panel + plaster
  for (const s of [-1, 1]) { box(.1, 1.3, d, panelM, cx + s * w / 2, .65, zc, false); box(.1, 2.8, d, plasterM, cx + s * w / 2 + s * .02, 2.7, zc, false); }
  box(w, .06, .08, beamM, cx, 1.32, z0 + .06, false);                                                                       // rail on top of the panel
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), beamM); ce.position.set(cx, 4.1, zc); scene.add(ce);
  for (let z = z0 + 1; z < z1; z += 2.2) box(w, .22, .3, beamM, cx, 3.95, z, false);
}
room(0); room(60); room(-60, 12, -2, 7);

// pendant lamps: shade + bulb glow; one warm point light per room follows the active set
const glowM = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffd890', emissiveIntensity: 2.2 });
function lamp(x, z, y = 2.9) { const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 4.1 - y, 6), blackM); cord.position.y = (4.1 - y) / 2; g.add(cord);
  const sh = new THREE.Mesh(new THREE.ConeGeometry(.32, .3, 24, 1, true), M('#2f4a2a', { side: THREE.DoubleSide, roughness: .6 })); g.add(sh);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), glowM); b.position.y = -.1; g.add(b); return g; }
for (const [x, z] of [[0, 0], [-3.5, -3.5], [3.2, -4.2], [-60, 1.2], [58, 0], [62, 0]]) lamp(x, z);
const keyLight = new THREE.PointLight('#ffcf8a', 14, 9, 1.6); keyLight.position.set(0, 2.7, 0); scene.add(keyLight);
const hemi = scene.children.find(o => o.isHemisphereLight); hemi.color.set('#ffe6c4'); hemi.groundColor.set('#6a4228'); hemi.intensity = .75;
sun.color.set('#fff0d8'); sun.intensity = 1.6; fill.intensity = .35;
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.mapSize.set(2048, 2048);
function lightRoom(cx) { sun.position.set(cx - 3, 9, 7); sun.target.position.set(cx, 0, -1.5); sun.target.updateMatrixWorld(); keyLight.position.x = cx + (cx === 60 ? 0 : 0); fill.position.set(cx + 6, 4, 20); }

// window with the Cologne cathedral behind the main table
const domTex = (() => { const [c, g] = cv(512, 512); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#6fa2d8'); gr.addColorStop(1, '#d9e8f2'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(rr(40, 470), rr(40, 160), rr(40, 80), rr(14, 24), 0, 0, 7); g.fill(); }
  g.fillStyle = '#4a4e5a';
  const spire = (x, w, top) => { g.beginPath(); g.moveTo(x - w / 2, 512); g.lineTo(x - w / 2, top + 120); g.lineTo(x - w * .32, top + 60); g.lineTo(x, top); g.lineTo(x + w * .32, top + 60); g.lineTo(x + w / 2, top + 120); g.lineTo(x + w / 2, 512); g.fill(); };
  spire(190, 70, 70); spire(322, 70, 70); g.fillRect(150, 300, 212, 212); g.fillRect(90, 380, 340, 132);
  g.fillStyle = '#353844'; for (let i = 0; i < 9; i++) g.fillRect(100 + i * 36, 420, 12, 60);
  g.fillStyle = '#7d6a58'; g.fillRect(0, 470, 512, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
{ const wv = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: domTex })); wv.position.set(-.6, 2.15, -7.93); scene.add(wv);
  for (const [w, h, x, y] of [[2.4, .12, -.6, 3.3], [2.4, .12, -.6, 1.0], [.12, 2.4, -1.76, 2.15], [.12, 2.4, .56, 2.15], [.06, 2.2, -.6, 2.15], [2.2, .06, -.6, 2.15]]) box(w, h, .1, beamM, x, y, -7.88, false); }
// door on the left wall of the main room (the ending)
const doorPivot = new THREE.Group(); doorPivot.position.set(-8.88, 0, -1.3); scene.add(doorPivot);
const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.3, 1.2), panelM); doorLeaf.position.set(0, 1.15, -.6); doorLeaf.castShadow = true; doorPivot.add(doorLeaf);
const doorOut = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#cfe4f5' })); doorOut.position.set(-8.935, 1.15, -1.9); scene.add(doorOut);
box(.14, 2.45, .1, beamM, -8.92, 1.22, -.65, false); box(.14, 2.45, .1, beamM, -8.92, 1.22, -3.15 + .0, false).position.z = -2.55; box(.14, .12, 1.4, beamM, -8.92, 2.4, -1.9, false);

// ---------- furniture ----------
function roundTable(x, z, r = .9) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .06, 40), tableM); top.position.y = .75; top.castShadow = top.receiveShadow = true; g.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .72, 12), beamM); leg.position.y = .36; leg.castShadow = true; g.add(leg);
  const ft = new THREE.Mesh(new THREE.CylinderGeometry(.4, .45, .05, 24), beamM); ft.position.y = .025; g.add(ft); return g; }
function stool(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .06, 20), tableM); s.position.y = .47; s.castShadow = true; g.add(s);
  for (let i = 0; i < 3; i++) { const a = i * 2.1, l = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .47, 6), beamM); l.position.set(Math.cos(a) * .14, .23, Math.sin(a) * .14); g.add(l); } return g; }
const TOP = .78;
roundTable(0, 0); roundTable(-3.5, -3.5); roundTable(3.2, -4.2);
// bar counter with a wooden cask on the right
box(2.8, 1.05, .8, panelM, 4.9, .525, -1.8); box(2.9, .06, .9, tableM, 4.9, 1.08, -1.8);
const cask = new THREE.Group(); cask.position.set(5.7, 1.11, -1.8); scene.add(cask);
{ const prof = []; for (let i = 0; i <= 12; i++) { const y = -.35 + i * .7 / 12; prof.push(new THREE.Vector2(.26 + .05 * Math.cos(y / .35 * Math.PI / 2), y)); }
  const b = new THREE.Mesh(new THREE.LatheGeometry(prof, 28).rotateZ(Math.PI / 2), barrelM); b.position.y = .32; b.castShadow = true; cask.add(b);
  for (const x of [-.25, 0, .25]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.3 - Math.abs(x) * .14, .012, 6, 30).rotateY(Math.PI / 2), ironM); r.position.set(x, .32, 0); cask.add(r); }
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .14, 8).rotateZ(Math.PI / 2), brassM); tap.position.set(-.42, .25, 0); cask.add(tap); }

// ---------- glasses ----------
// glass(r, h, beer material, handle) -> group with setLevel(k) (0 empty .. 1 full)
function glass(r, h, bm = beerM, handle = false) {
  const g = new THREE.Group(); scene.add(g);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .96, h, 20, 1, true).translate(0, h / 2, 0), glassM); g.add(sh);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(r * .96, r * .96, .012, 20).translate(0, .006, 0), glassM); g.add(bot);
  const beer = new THREE.Mesh(new THREE.CylinderGeometry(r * .9, r * .87, 1, 20).translate(0, .5, 0), bm); beer.position.y = .012; g.add(beer);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(r * .92, r * .9, 1, 20).translate(0, .5, 0), foamM); g.add(foam);
  if (handle) { const hd = new THREE.Mesh(new THREE.TorusGeometry(h * .28, r * .14, 8, 16, Math.PI), glassM); hd.rotation.z = -Math.PI / 2; hd.position.set(r * 1.05, h * .5, 0); g.add(hd); }
  g.traverse(o => { if (o.isMesh) o.castShadow = o.material !== glassM; });
  g.userData = { level: -1, foamK: -1, beer, foam, h };
  g.setLevel = (k, fk = 1) => { if (k === g.userData.level && fk === g.userData.foamK) return; g.userData.level = k; g.userData.foamK = fk;
    const bh = Math.max(.001, (h - .03) * .86 * k); beer.scale.y = bh; beer.visible = k > .01; const fh = .035 * fk * (k > .01 ? 1 : 0);
    foam.scale.y = Math.max(fh, .001); foam.position.y = .012 + bh; foam.visible = fh > .002; };
  g.setLevel(1); return g;
}
const stange = (bm) => glass(.05, .27, bm);

// ---------- people: wooden mannequins with big eyes (rig from autobahn_main.js) ----------
const skinM = M('#e2bf96', { roughness: .55 }), pantsM = M('#2f3a4c', { roughness: .8 }), shoeM = M('#2a1c12');
function person(shirt, hair = '#4a2c18', o = {}) {
  const shirtM = M(shirt, { roughness: .75 });
  const root = new THREE.Group(); scene.add(root);
  const pelvis = new THREE.Group(); pelvis.position.y = .95; root.add(pelvis);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.25, .4, 6, 14), shirtM); torso.position.y = .36; torso.scale.z = .8; pelvis.add(torso);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(.26, .28, .22, 12), pantsM); hips.position.y = .02; pelvis.add(hips);
  const head = new THREE.Group(); head.position.y = .78; pelvis.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .12, 8), skinM); neck.position.y = .02; head.add(neck);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.23, 24, 18), skinM); hd.position.y = .2; hd.scale.set(1, 1.08, 1); head.add(hd);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(.24, 20, 12, 0, Math.PI * 2, 0, Math.PI * .42), M(hair, { roughness: .9 })); hr.position.set(0, .23, -.015); hr.rotation.x = -.25; head.add(hr);
  const brows = [];
  for (const s of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 12), whiteM); ey.position.set(s * .085, .22, .17); ey.scale.z = .6; head.add(ey);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), blackM); p.position.set(s * .085, .22, .215); head.add(p);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.09, .022, .02), M(hair)); b.position.set(s * .085, .31, .2); head.add(b); brows.push(b); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 8), M('#5a2016')); mouth.scale.set(1.2, .3, .4); mouth.position.set(0, .07, .21); head.add(mouth);
  const sh = [], el = [], hand = [], hip = [], kn = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * .32, .58, 0); pelvis.add(a); sh.push(a);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .22, 4, 10), shirtM); up.position.y = -.16; a.add(up);
    const e = new THREE.Group(); e.position.y = -.33; a.add(e); el.push(e);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(.065, .2, 4, 10), skinM); fo.position.y = -.14; e.add(fo);
    const h = new THREE.Group(); h.position.y = -.3; e.add(h); hand.push(h);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 10), skinM); h.add(hm);
    const lg = new THREE.Group(); lg.position.set(s * .13, -.02, 0); pelvis.add(lg); hip.push(lg);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.095, .28, 4, 10), pantsM); th.position.y = -.21; lg.add(th);
    const k = new THREE.Group(); k.position.y = -.45; lg.add(k); kn.push(k);
    const shn = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .28, 4, 10), pantsM); shn.position.y = -.2; k.add(shn);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(.17, .1, .3), shoeM); ft.position.set(0, -.44, .06); k.add(ft);
  }
  if (o.koebes) {   // Köbes: long blue apron and a leather money pouch
    const ap = new THREE.Mesh(new THREE.BoxGeometry(.5, .95, .03), M('#1d3f8f', { roughness: .8 })); ap.position.set(0, -.36, .25); pelvis.add(ap);
    const ap2 = new THREE.Mesh(new THREE.BoxGeometry(.4, .3, .03), M('#1d3f8f', { roughness: .8 })); ap2.position.set(0, .3, .2); pelvis.add(ap2);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(.2, .16, .07), M('#5a3218', { roughness: .6 })); pouch.position.set(.2, -.02, .28); pelvis.add(pouch);
  }
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  root.userData = { pelvis, head, sh, el, hand, hip, kn, brows, mouth };
  return root;
}
// pose: [shLx, shLz, shRx, shRz, elL, elR, hipL, hipR, knL, knR, lean, headX, headY, brow, mouth]
const UP = {
  idle: [0, -.1, 0, .1, -.15, -.15, 0, 0, 0, 0, 0, 0, 0, 0, .3],
  table: [-.9, -.15, -.9, .15, -.7, -.7, 0, 0, 0, 0, .08, .05, 0, 0, .35],
  drink: [-.7, -.15, -2.5, .5, -.6, -2.25, 0, 0, 0, 0, -.08, -.38, 0, .1, .7],
  raise: [-.8, -.15, -3.0, .25, -.6, -.15, 0, 0, 0, 0, 0, -.12, 0, .6, 1.0],
  cheer: [-2.9, -.35, -2.9, .35, -.1, -.1, 0, 0, 0, 0, -.05, -.15, 0, .8, 1.3],
  headhold: [-2.5, -.6, -2.5, .6, -1.9, -1.9, 0, 0, 0, 0, .05, .2, 0, .9, .25],
  point: [0, -.1, -1.6, .45, -.15, -.05, 0, 0, 0, 0, 0, 0, .35, -.6, .8],
  carry2: [-1.0, -.1, -1.0, .1, -.85, -.85, 0, 0, 0, 0, 0, 0, 0, 0, .5],
  carryK: [0, -.1, -1.25, .1, -.15, -.7, 0, 0, 0, 0, 0, 0, 0, 0, .5],
  place: [-.2, -.1, -1.3, .1, -.15, -.45, 0, 0, 0, 0, .25, .2, 0, 0, .4],
  shrug: [-.5, -.7, -.5, .7, -1.6, -1.6, 0, 0, 0, 0, 0, .05, .2, .9, .3] };
const mixP = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const SIT = p => { const q = p.slice(); q[6] = q[7] = -1.5; q[8] = q[9] = 1.5; return q; };
const WALK = (p, ph, amp = .5) => { const q = p.slice(), s = Math.sin(ph); q[6] = s * amp; q[7] = -s * amp; q[8] = Math.max(0, -s) * amp * 1.4; q[9] = Math.max(0, s) * amp * 1.4;
  if (p === UP.idle) { q[0] = -s * amp * .7; q[2] = s * amp * .7; } return q; };
function applyPose(c, p) { const u = c.userData;
  u.sh[0].rotation.set(p[0], 0, p[1]); u.sh[1].rotation.set(p[2], 0, p[3]); u.el[0].rotation.x = p[4]; u.el[1].rotation.x = p[5];
  u.pelvis.rotation.x = p[10]; u.hip[0].rotation.x = p[6] - p[10]; u.hip[1].rotation.x = p[7] - p[10]; u.kn[0].rotation.x = p[8]; u.kn[1].rotation.x = p[9];
  u.head.rotation.set(p[11], p[12], 0); u.brows.forEach((b, i) => { const s = i ? 1 : -1; b.rotation.z = -s * p[13] * .45; b.position.y = .31 + p[13] * .02; });
  u.mouth.scale.set(1.2 - p[14] * .25, .3 + p[14] * .55, .4); u.pelvis.position.y = p[6] < -1 ? .55 : .95; }
const handPos = (c, i = 1, off = V(0, -.06, .05)) => { c.updateMatrixWorld(true); return c.userData.hand[i].localToWorld(off.clone()); };

const du = person('#3f8f4a', '#5a3a1e');
const koebes = person('#24418f', '#2a1a10', { koebes: true });
const friends = [person('#c8572e', '#d8b060'), person('#e6e0d0', '#2a1a10')];
const guests = [[-3.5, -3.5, '#8a3a8f'], [3.2, -4.2, '#3a7fb0']].flatMap(([x, z, c], j) => [0, 1, 2].map(i => { const a = i * 2.1 + j, p = person(i ? c : '#d6a43a', i === 1 ? '#c09040' : '#3a2412');
  p.userData.seat = [x + Math.sin(a) * 1.0, z + Math.cos(a) * 1.0, a + Math.PI]; stool(p.userData.seat[0], p.userData.seat[1]); return p; }));
stool(0, -1.0); stool(-1.0, -.25); stool(1.0, -.25);

// ---------- props ----------
const mug = glass(.085, .24, beerM, true);                       // the big glass of the first line
const g0 = stange(beerM);                                        // your Stange
const carried = [stange(beerM), stange(beerM)];                  // the Köbes' glasses in his hands
const pile = Array.from({ length: 8 }, () => stange(beerM));     // "he never stops bringing beer"
const empties = Array.from({ length: 9 }, () => { const s = stange(beerM); s.setLevel(0); return s; });
const altG = glass(.07, .2, altM);                               // a wide, short Altbier glass
// Kranz: base disc, ring with holes, central handle; 11 Stangen
const kranz = new THREE.Group(); scene.add(kranz);
const kBase = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .015, 40), steelM); kBase.position.y = .008; kranz.add(kBase);
const kRing = new THREE.Group(); kranz.add(kRing);
{ const top = new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 6, 48).rotateX(Math.PI / 2), steelM); top.position.y = .14; kRing.add(top);
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, r = new THREE.Mesh(new THREE.TorusGeometry(.056, .008, 6, 18).rotateX(Math.PI / 2), steelM); r.position.set(Math.cos(a) * .235, .14, Math.sin(a) * .235); kRing.add(r); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .14, 6), steelM); p.position.set(Math.cos(a) * .3, .07, Math.sin(a) * .3); kRing.add(p); } }
const kHandle = new THREE.Group(); kranz.add(kHandle);
{ const rod = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .42, 10), steelM); rod.position.y = .21; kHandle.add(rod);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(.07, .018, 8, 20), steelM); loop.position.y = .48; kHandle.add(loop); }
const kGlasses = Array.from({ length: 11 }, (_, i) => { const s = stange(beerM); s.removeFromParent(); const a = i / 11 * Math.PI * 2; s.position.set(Math.cos(a) * .235, .015, Math.sin(a) * .235); kranz.add(s); return s; });
kranz.traverse(o => { if (o.isMesh && o.material !== glassM) o.castShadow = true; });
// Bierdeckel with a canvas top (logo + tally strokes)
const dCan = cv(256, 256); const dTex = new THREE.CanvasTexture(dCan[0]); dTex.colorSpace = THREE.SRGBColorSpace; let dState = -1;
function drawDeckel(n) { if (n === dState) return; dState = n; const g = dCan[1]; g.clearRect(0, 0, 256, 256);
  g.fillStyle = '#fbf7ee'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = '#b8202a'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke();
  g.fillStyle = '#b8202a'; g.font = '700 40px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KÖLSCH', 128, 62);
  g.strokeStyle = '#1a1a1a'; g.lineCap = 'round'; g.lineWidth = 9;
  for (let i = 0; i < n; i++) { const grp = Math.floor(i / 5), j = i % 5, x0 = 66 + grp * 82;
    g.beginPath(); if (j < 4) { g.moveTo(x0 + j * 15, 100); g.lineTo(x0 + j * 15 + 3, 196); } else { g.moveTo(x0 - 10, 186); g.lineTo(x0 + 58, 108); } g.stroke(); }
  dTex.needsUpdate = true; }
drawDeckel(0);
const deckel = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .008, 32), [M('#f4efe2'), new THREE.MeshStandardMaterial({ map: dTex, roughness: .8 }), M('#f4efe2')]);
deckel.castShadow = true; scene.add(deckel);
// Pittermännchen: small upright 10-litre keg with brass tap, on a little stand
function pitter() { const g = new THREE.Group(); scene.add(g);
  const prof = []; for (let i = 0; i <= 12; i++) { const y = i * .36 / 12; prof.push(new THREE.Vector2(.15 + .03 * Math.sin(y / .36 * Math.PI), y)); }
  const b = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), barrelM); b.position.y = .06; g.add(b);
  for (const y of [.1, .24, .38]) { const r = new THREE.Mesh(new THREE.TorusGeometry(y === .24 ? .182 : .162, .009, 6, 30).rotateX(Math.PI / 2), brassM); r.position.y = y; g.add(r); }
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .01, 28), barrelM); lid.position.y = .42; g.add(lid);
  const st = new THREE.Mesh(new THREE.BoxGeometry(.34, .06, .28), beamM); st.position.y = .03; g.add(st);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .12, 8).rotateX(Math.PI / 2), brassM); tap.position.set(0, .12, .2); g.add(tap);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .06, 8), brassM); sp.position.set(0, .09, .25); g.add(sp);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
const pit = pitter(), pitMain = pitter();

// ---------- set 2: long table for 20 (x 60) ----------
box(7.4, .07, 1.0, longTableM, 60, .75, 0); for (const x of [57, 60, 63]) box(.12, .72, .7, beamM, x, .36, 0);
for (const z of [-.95, .95]) box(7.4, .06, .35, tableM, 60, .45, z);
const lite = []; { const shirts = ['#c8572e', '#3f8f4a', '#3a7fb0', '#8a3a8f', '#d6a43a', '#e6e0d0', '#a83a3a', '#3a8a8a'];
  for (let i = 0; i < 20; i++) { const side = i < 10 ? -1 : 1, x = 56.8 + (i % 10) * .71, g = new THREE.Group(); g.position.set(x, 0, side * .95); g.rotation.y = side < 0 ? 0 : Math.PI; scene.add(g);
    const sM = M(shirts[(i * 3) % 8], { roughness: .75 });
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .36, 4, 10), sM); b.position.y = .82; b.scale.z = .8; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(.18, 16, 12), skinM); h.position.y = 1.32; g.add(h);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(.19, 14, 8, 0, Math.PI * 2, 0, Math.PI * .42), M(i % 3 ? '#4a2c18' : '#c09040')); hr.position.y = 1.34; hr.rotation.x = -.25; g.add(hr);
    for (const s of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), whiteM); ey.position.set(s * .065, 1.34, .14); ey.scale.z = .6; g.add(ey);
      const p = new THREE.Mesh(new THREE.SphereGeometry(.027, 8, 6), blackM); p.position.set(s * .065, 1.34, .175); g.add(p); }
    const arm = new THREE.Group(); arm.position.set(.25, 1.05, 0); g.add(arm); const am = new THREE.Mesh(new THREE.CapsuleGeometry(.06, .42, 4, 8), sM); am.position.y = -.25; arm.add(am);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), skinM); hd.position.y = -.52; arm.add(hd);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData = { arm, ph: rr(0, 6.3) }; lite.push(g); } }
const longEmpties = Array.from({ length: 14 }, (_, i) => { const s = stange(beerM); s.setLevel(0); s.position.set(56.9 + i * .5, TOP - .03, (i % 2 ? .25 : -.25)); return s; });

// ---------- set 3: brewery shelf + contract (x -60) ----------
box(4.2, .06, .5, tableM, -60, 1.05, -1.6); for (const x of [-62, -58]) box(.08, 1.05, .45, beamM, x, .52, -1.6);
const bottleM = new THREE.MeshStandardMaterial({ color: '#5a3410', roughness: .15, metalness: .1 });
const capM = new THREE.MeshStandardMaterial({ color: '#d0b040', metalness: .8, roughness: .3 });
function bottleTex(city, col) { const [c, g] = cv(256, 128); g.fillStyle = col; g.fillRect(0, 0, 256, 128); g.fillStyle = '#fff'; g.font = '700 46px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KÖLSCH', 128, 52);
  g.font = '700 22px Fredoka'; g.fillText(city.toUpperCase(), 128, 98); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const CITIES = [['München', '#2a5cad'], ['Hamburg', '#1f7a4a'], ['Köln', '#b8202a'], ['Berlin', '#6a3a8a'], ['Stuttgart', '#c07a10']];
const bottles = CITIES.map(([c, col], i) => { const g = new THREE.Group(); g.position.set(-61 + i * .5, 1.08, -1.55); scene.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .4, 24), bottleM); body.position.y = .2; g.add(body);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(.035, .11, .14, 24), bottleM); sh.position.y = .47; g.add(sh);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(.033, .035, .1, 16), bottleM); nk.position.y = .59; g.add(nk);
  const cp = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .025, 16), capM); cp.position.y = .65; g.add(cp);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(.112, .112, .16, 24, 1, true), new THREE.MeshStandardMaterial({ map: bottleTex(c, col), roughness: .6 })); lb.position.y = .2; lb.rotation.y = -Math.PI / 2; g.add(lb);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.city = c; return g; });
box(1.4, .06, .9, tableM, -60, .75, 1.3); box(.1, .72, .7, beamM, -60, .36, 1.3);
const docCan = cv(512, 724); const docTex = new THREE.CanvasTexture(docCan[0]); docTex.colorSpace = THREE.SRGBColorSpace; let docState = '';
function drawDoc(sig, stamp) { const st = sig.toFixed(2) + stamp; if (st === docState) return; docState = st; const g = docCan[1];
  g.fillStyle = '#f6efdc'; g.fillRect(0, 0, 512, 724); g.strokeStyle = '#c9b88e'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 696);
  g.fillStyle = '#2a1a10'; g.textAlign = 'center'; g.font = '700 50px Fredoka'; g.fillText('Kölsch-', 256, 92); g.fillText('Konvention', 256, 148);
  g.font = '700 30px Fredoka'; g.fillText('Köln, 1986', 256, 200); g.font = '600 28px Fredoka'; g.fillText('Kölsch darf nur', 256, 270); g.fillText('aus Köln kommen.', 256, 306);
  g.strokeStyle = '#b9ab88'; g.lineWidth = 3; for (let y = 350; y < 470; y += 26) { g.beginPath(); g.moveTo(70, y); g.lineTo(442, y); g.stroke(); }
  g.strokeStyle = '#1a2a6a'; g.lineWidth = 5; g.lineCap = 'round';
  for (let s = 0; s < 4; s++) { const k = cl(sig * 4 - s); if (k <= 0) continue; const x0 = s % 2 ? 290 : 80, y0 = 540 + Math.floor(s / 2) * 80; g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i <= 24 * k; i++) g.lineTo(x0 + i * 6, y0 + Math.sin(i * 1.3 + s) * 14 - (i % 7 === 0 ? 10 : 0)); g.stroke(); }
  if (stamp) { g.save(); g.translate(380, 230); g.rotate(-.3); g.strokeStyle = '#c8202a'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.stroke(); g.fillStyle = '#c8202a'; g.font = '700 30px Fredoka'; g.fillText('KÖLN', 0, -6); g.font = '700 24px Fredoka'; g.fillText('1986', 0, 26); g.restore(); }
  docTex.needsUpdate = true; }
drawDoc(0, false);
const doc = new THREE.Mesh(new THREE.PlaneGeometry(.5, .707).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: docTex, roughness: .9 })); doc.position.set(-60, .785, 1.3); doc.receiveShadow = true; scene.add(doc);
const pen = new THREE.Mesh(new THREE.CylinderGeometry(.012, .008, .18, 8), M('#1a2a6a', { metalness: .4, roughness: .3 })); pen.castShadow = true; scene.add(pen);

// ---------- labels (sprites drawn on top in their own scene) ----------
function label(text, w = 1, col = '#ffd21f') {   // canvas fits the text; size is set by the text height (w / 4 metres)
  const [c0, g0] = cv(8, 8); g0.font = '700 150px Fredoka'; const tw_ = g0.measureText(text).width, cw = Math.ceil(tw_ + 60);
  const [c, g] = cv(cw, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, cw / 2, 134); g.fillStyle = col; g.fillText(text, cw / 2, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.userData = { w, aspect: cw / 256 }; s.visible = false; return s; }
const overlay = new THREE.Scene();
const LB = { koelsch: label('Kölsch'), warm: label('warm', 1, '#ff7a3a'), schal: label('schal', 1, '#c8c8c8'), l02: label('0,2 l'), stange: label('Stange'),
  q: label('?', 1, '#ffd21f'), koebes: label('Köbes', 1, '#7fb6ff'), zwei: label('nur 2', 1, '#ff4a3a'), kranz: label('Kranz'), ex: label('!', 1, '#ff4a3a'),
  genug: label('genug!', 1, '#7cf07c'), ex2: label('!', 1, '#ff4a3a'), rechnung: label('Rechnung'), n20: label('20'), l10: label('10 l'), pitter: label('Pittermännchen'),
  alt: label('Alt?', 1, '#ffb07a'), raus: label('RAUS!', 1, '#ff4a3a'), year: label('1986'),
  q2: label('?', 1, '#ffd21f'), q3: label('?', 1, '#ffd21f'),
  cities: CITIES.map(([c]) => label(c, 1, '#ffffff')), kq: CITIES.map(() => label('Kölsch?', 1, '#ffd21f')), x: CITIES.map(() => label('X', 1, '#ff3a3a')) };
for (const v of Object.values(LB)) (Array.isArray(v) ? v : [v]).forEach(s => overlay.add(s));
// size k (0..1), world width w (metres) at that point
function lab(s, k, x, y, z, w) { s.visible = k > .01; if (!s.visible) return; const h = (w ?? s.userData.w) / 4 * Math.max(k, .001); s.position.set(x, y, z); s.scale.set(h * s.userData.aspect, h, 1); }

// ---------- camera: key frames, a duplicated time = hard cut ----------
const camera = new THREE.PerspectiveCamera(42, W / H, .05, 200);
const CUT = .001;
const KEYS = [
  [0, V(.95, 1.32, 1.75), V(0, 1.05, -.6)], [tw.koelsch1, V(.7, 1.2, 1.3), V(.05, .98, -.4)],
  [tw.aber1 + CUT, V(.62, 1.12, 1.15), V(.12, .96, .05), 1], [tw.also1, V(.55, 1.1, 1.05), V(.12, .96, .05)],
  [tw.also1 + CUT, V(-.45, 1.08, .92), V(.12, .92, .1), 1], [tw.aber2, V(-.38, 1.05, .8), V(.12, .92, .1)],
  [tw.aber2 + CUT, V(.25, 1.42, 1.55), V(0, 1.18, -.6), 1], [tw.also2, V(.2, 1.38, 1.4), V(0, 1.18, -.6)],
  [tw.also2 + CUT, V(2.7, 2.1, 3.4), V(-.7, .95, -.4), 1], [tw.aber3, V(2.4, 1.9, 3.0), V(-.2, 1.0, -.4)],
  [tw.aber3 + CUT, V(.3, 2.7, 5.6), V(0, 1.0, -3.2), 1], [tw.also3, V(.2, 2.5, 5.2), V(0, 1.0, -3.2)],
  [tw.also3 + CUT, V(4.25, 1.95, -.15), V(4.1, 1.2, -1.75), 1], [tw.aber4, V(4.2, 1.85, -.3), V(4.1, 1.2, -1.75)],
  [tw.aber4 + CUT, V(.15, 1.5, 1.65), V(0, 1.02, -.45), 1], [tw.also4, V(.1, 1.45, 1.5), V(0, 1.02, -.45)],
  [tw.also4 + CUT, V(.28, 1.16, .62), V(.12, 1.0, .05), 1], [tw.aber5, V(.25, 1.12, .58), V(.12, 1.0, .05)],
  [tw.aber5 + CUT, V(0, 2.9, 5.3), V(0, 1.05, -.4), 1], [tw.also5, V(0, 2.8, 5.0), V(0, 1.05, -.4)],
  [tw.also5 + CUT, V(.12, 1.48, .36), V(.12, 1.04, .06), 1], [tw.aber6, V(.12, 1.44, .33), V(.12, 1.04, .06)],
  [tw.aber6 + CUT, V(60, 3.6, 6.6), V(60, .9, -.4), 1], [tw.also6, V(60, 3.5, 6.2), V(60, .9, -.4)],
  [tw.also6 + CUT, V(61.7, 1.42, .05), V(60, 1.0, 0), 1], [tw.pitter - .4, V(61.55, 1.4, .05), V(60, 1.0, 0)],
  [tw.pitter + CUT, V(60, 3.0, 4.2), V(60, .9, 0), 1], [tw.aber7, V(60, 2.9, 4.0), V(60, .9, 0)],
  [tw.aber7 + CUT, V(-60, 1.75, 4.6), V(-60, 1.4, -1.5), 1], [tw.also7, V(-60, 1.72, 4.4), V(-60, 1.4, -1.5)],
  [tw.also7 + CUT, V(-60, 1.62, 2.12), V(-60, .79, 1.33), 1], [tw.koelsch4, V(-60, 1.58, 2.05), V(-60, .79, 1.33)],
  [tw.koelsch4 + CUT, V(-60, 1.75, 4.6), V(-60, 1.4, -1.5), 1], [tw.konv - .15, V(-60, 1.72, 4.45), V(-60, 1.4, -1.5)],
  [tw.konv + CUT, V(-60, 1.62, 2.12), V(-60, .79, 1.33), 1], [tw.gluck, V(-60, 1.6, 2.08), V(-60, .79, 1.33)],
  [tw.gluck + CUT, V(.5, 2.9, 6.0), V(0, 1.0, -2.0), 1], [tw.und9, V(.3, 2.6, 5.0), V(0, 1.0, -1.5)],
  [tw.und9 + CUT, V(.25, 1.45, 1.6), V(0, 1.15, -.6), 1], [tw.fliegst - .1, V(.2, 1.42, 1.5), V(0, 1.15, -.6)],
  [tw.fliegst + CUT, V(3.4, 2.4, 4.4), V(-4.2, 1.5, -1.4), 1], [END, V(3.1, 2.3, 4.0), V(-4.6, 1.5, -1.5)]];
KEYS.sort((a, b) => a[0] - b[0]);
for (let i = KEYS.length - 1; i > 0; i--) if (KEYS[i][3] && KEYS[i][0] - KEYS[i - 1][0] > 2 * CUT) KEYS.splice(i, 0, [KEYS[i][0] - CUT, KEYS[i - 1][1], KEYS[i - 1][2]]);
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- the timeline ----------
const DU = V(0, 0, -1.0), GPOS = V(.12, TOP, .02);
const KT = V(1.0, 0, .8);                       // where the Köbes stands at the main table
function put(o, p, ry = 0) { o.position.copy(p); o.rotation.set(0, ry, 0); }
function update(t) {
  const set = t >= tw.aber6 && t < tw.aber7 ? 60 : t >= tw.aber7 && t < tw.gluck ? -60 : 0; lightRoom(set);
  keyLight.position.set(set, 2.7, set === -60 ? 1 : 0);

  // ---- du ----
  let dp = DU.clone(), dry = 0, dpose = SIT(UP.table);
  if (t < tw.stellst) dpose = SIT(mixP(UP.table, UP.place, 1 - ease(t, tw.tisch1, tw.stellst)));
  else if (t < tw.aber1) dpose = SIT(UP.table);
  else if (t < tw.also1) dpose = SIT(mixP(UP.table, UP.headhold, ease(t, tw.schal - .2, tw.schal + .2) * .6));
  else if (t >= tw.aber2 && t < tw.also2) {
    const sips = [tw.drei - .05, tw.drei + .42, tw.drei + .84]; let k = 0; for (const s of sips) k = Math.max(k, win(t, s, s + .4, .15));
    dpose = SIT(mixP(UP.table, UP.drink, k)); if (t > tw.leer - .1) dpose = SIT(mixP(UP.table, UP.raise, ease(t, tw.nachb - .3, tw.nachb)));
  } else if (t >= tw.aber4 && t < tw.also4) dpose = SIT(mixP(UP.table, UP.headhold, ease(t, tw.nie, tw.bringen)));
  else if (t >= tw.aber5 && t < tw.also5) dpose = SIT(mixP(UP.table, UP.shrug, ease(t, tw.keiner - .2, tw.keiner + .2)));
  else if (t >= tw.gluck && t < tw.und9) dpose = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6)));
  else if (t >= tw.und9 && t < tw.fliegst) dpose = SIT(mixP(UP.table, UP.raise, ease(t, tw.alt - .3, tw.alt)));
  else if (t >= tw.fliegst) { const k = ease(t, tw.fliegst, tw.raus + .55); dp = V(lerp(0, -9.6, k), Math.sin(Math.PI * Math.min(1, k * 1.05)) * 2.2 + lerp(.4, .3, k), lerp(-1.0, -1.9, k));
    dpose = mixP(UP.cheer, UP.headhold, .5); dpose[6] = -.4; dpose[7] = .4; dry = -Math.PI / 2; }
  put(du, dp, dry); applyPose(du, dpose); if (t >= tw.fliegst) du.rotation.z = -t * 9 % (Math.PI * 2);
  else du.rotation.z = 0;

  // ---- glasses on the main table ----
  // big glass: put down, goes warm and flat, replaced by the Stange
  const mk = 1 - ease(t, tw.also1, tw.also1 + .3); mug.visible = mk > .01; mug.scale.setScalar(Math.max(mk, .001));
  if (t < tw.stellst) { const k = ease(t, tw.glas1 - .4, tw.stellst); mug.position.set(.15, lerp(1.05, TOP, k), lerp(-.25, .1, k)); } else mug.position.set(.15, TOP, .1);
  const stale = ease(t, tw.warm, tw.schal + .3); mug.children[2].material = stale > .5 ? staleM : beerM; mug.setLevel(1, 1 - stale);
  // your Stange
  let gl = 1, gp = GPOS.clone(), gvis = t > tw.schmales - .05, gs = pop(t, tw.schmales - .05); g0.rotation.x = 0;
  if (t >= tw.aber2 && t < tw.neues) { gl = 1 - (ramp(t, tw.drei, tw.drei + .3) + ramp(t, tw.drei + .42, tw.drei + .72) + ramp(t, tw.drei + .84, tw.drei + 1.14)) / 3;
    const sips = [tw.drei - .05, tw.drei + .42, tw.drei + .84]; for (const s of sips) { const k = win(t, s, s + .4, .15); if (k > 0) { du.updateMatrixWorld(true); gp.lerp(du.userData.head.localToWorld(V(0, .04, .3)), k); g0.rotation.x = -1.3 * k; } } }
  if (t >= tw.neues && t < tw.also4) gl = 1;
  if (t >= tw.also4 && t < tw.gluck) gl = .55;
  if (t >= tw.aber5 && t < tw.gluck) gl = 0;
  if (t >= tw.gluck) gl = .8;
  if (t >= tw.alt - .3) gvis = false;
  g0.visible = gvis; g0.scale.setScalar(Math.max(gs, .001)); g0.position.copy(gp); g0.setLevel(gl);
  // Bierdeckel: lands on your glass, then gets the tally
  const dk = ease(t, tw.deckel1 - .2, tw.aufs + .1);
  deckel.visible = t > tw.legst && t < tw.alt - .3;
  const dTop = V(GPOS.x, TOP + .27 + .006, GPOS.z);
  deckel.position.copy(dTop).add(V(lerp(.0, 0, dk), lerp(.35, 0, dk), lerp(.25, 0, dk))); deckel.rotation.set(lerp(-.6, 0, dk), 0, 0);
  drawDeckel(t < tw.strich - .2 ? 0 : Math.min(7, 1 + Math.floor((t - (tw.strich - .2)) / .25)));
  // the pile of Stangen that keeps coming
  pile.forEach((s, i) => { const a = tw.aber4 + .3 + i * .22, k = pop(t, a) * (1 - ease(t, tw.genug, tw.genug + .25)); s.visible = k > .01 && t < tw.also4;
    const ang = -1.9 + i * .5; s.position.set(Math.cos(ang) * .42 + .05, TOP, Math.sin(ang) * .3 + .2); s.scale.setScalar(Math.max(k, .001)); });
  // empties after a long night
  empties.forEach((s, i) => { const k = pop(t, tw.aber5 + .05 * i); s.visible = t > tw.aber5 && t < tw.gluck; const ang = i * .7 + .3; s.position.set(Math.cos(ang) * .55, TOP, Math.sin(ang) * .45 - .1); s.scale.setScalar(Math.max(k, .001)); });
  // Alt glass in your hand at the end
  altG.visible = t > tw.alt - .3 && t < tw.fliegst + .2; if (altG.visible) { altG.position.set(-.1, TOP, .15); altG.scale.setScalar(Math.max(pop(t, tw.alt - .3), .001)); }

  // ---- the Köbes ----
  let kp = V(-7, 0, 2), kry = Math.PI / 2, kpose = UP.idle, walking = false;
  carried.forEach(c => c.visible = false);
  if (t >= tw.also2 && t < tw.neues) { const k = ease(t, tw.lauft - .2, tw.neues - .25); kp = V(lerp(-5, KT.x, k), 0, lerp(1.8, KT.z, k)); kry = Math.atan2(KT.x + 5, KT.z - 1.8); walking = k > 0 && k < 1; kpose = UP.carryK;
    carried[0].visible = true; }
  else if (t >= tw.neues && t < tw.aber3) { kp = KT.clone(); kry = -Math.PI / 2; kpose = mixP(UP.place, UP.idle, ease(t, tw.neues + .2, tw.neues + .6)); }
  else if (t >= tw.aber3 && t < tw.also3) { kp = V(.2, 0, 1.5); kry = Math.sin(t * 2.2) * .7; kpose = UP.carry2;
    carried.forEach(c => { c.visible = true; c.setLevel(1); }); }
  else if (t >= tw.also3 && t < tw.aber4) { kp = V(4.55, 0, -2.75); kry = 0; kpose = t < tw.kranz ? UP.place : mixP(UP.idle, UP.cheer, .6); }
  else if (t >= tw.aber4 && t < tw.aber6) { kp = KT.clone(); kry = -Math.PI / 2; const k = t < tw.genug ? .5 + .5 * Math.sin(t * 9) : 0; kpose = mixP(UP.idle, UP.place, k);
    if (t > tw.genug - .1 && t < tw.aber5) { kpose = mixP(UP.idle, UP.point, .2); kpose[11] = .25 * Math.sin((t - tw.genug) * 10) * (1 - ramp(t, tw.genug + .5, tw.genug + .8)); } }
  else if (t >= tw.aber6 && t < tw.also6) { const ph = (t - tw.aber6) * 2.4; kp = V(60 + 3.2 * Math.sin(ph), 0, 1.75); kry = Math.cos(ph) > 0 ? Math.PI / 2 : -Math.PI / 2; walking = true; kpose = UP.carry2;
    carried.forEach(c => { c.visible = true; }); }
  else if (t >= tw.also6 && t < tw.aber7) { kp = V(60.7, 0, -1.65); kry = -.3; kpose = mixP(UP.place, UP.idle, ease(t, tw.fass + .2, tw.fass + .6)); }
  else if (t >= tw.gluck) { kp = V(1.4, 0, .9); kry = -Math.PI / 2 - .4; kpose = t > tw.alt ? mixP(UP.idle, UP.point, ease(t, tw.alt, tw.bestellst)) : mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 6));
    if (t > tw.alt) kry = lerp(-Math.PI / 2 - .4, -Math.PI / 2 + .35, ease(t, tw.alt, tw.bestellst)); }
  if (walking) kpose = WALK(kpose, t * 11, kp.x > 30 ? .7 : .5);
  put(koebes, kp, kry); applyPose(koebes, kpose); if (walking) koebes.userData.pelvis.position.y = .95 + Math.abs(Math.sin(t * 11)) * .04;
  carried.forEach((c, i) => { if (c.visible) c.position.copy(handPos(koebes, t < tw.neues ? 1 : i, V(0, -.1, .02))); });

  // ---- Kranz: built on the counter, carried to the table, full at the end ----
  kranz.visible = t > tw.rundes - .1 && t < tw.aber5 || t > tw.gluck;
  kBase.scale.setScalar(Math.max(pop(t, tw.rundes - .05), .001)); kRing.visible = t > tw.loechern - .1; kRing.scale.setScalar(Math.max(pop(t, tw.loechern - .1), .001));
  kHandle.visible = t > tw.griff - .1; kHandle.scale.set(1, Math.max(ease(t, tw.griff - .1, tw.griff + .3), .001), 1);
  kGlasses.forEach((s, i) => { const k = pop(t, tw.mitte - .05 + i * .07, .25); s.visible = k > .01; s.scale.setScalar(Math.max(k, .001)); s.setLevel(t > tw.gluck ? 1 : 1); });
  if (t < tw.kranz) put(kranz, V(4.05, 1.11, -1.8));
  else if (t < tw.aber4) put(kranz, V(4.05, 1.11 + .12 * ease(t, tw.kranz, tw.kranz + .3), -1.8));
  else if (t < tw.aber5) put(kranz, V(-.45, TOP, .3));
  else put(kranz, V(-.55, TOP, -.25));

  // ---- friends + other guests ----
  const fpos = [[-1.0, -.25, Math.PI / 2], [1.0, -.25, -Math.PI / 2]];
  friends.forEach((f, i) => { f.visible = t > tw.aber5; put(f, V(fpos[i][0], 0, fpos[i][1]), fpos[i][2]);
    let p = SIT(UP.table); if (t < tw.also5) p = SIT(mixP(UP.table, UP.shrug, ease(t, tw.viele - .2 + i * .15, tw.viele + .2 + i * .15))); if (t > tw.gluck) p = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6 + i))); applyPose(f, p); });
  guests.forEach((g, i) => { const [x, z, ry] = g.userData.seat; put(g, V(x, 0, z), ry);
    let p = SIT(UP.table); if (t > tw.aber3 && t < tw.also3) p = SIT(mixP(UP.table, UP.raise, .7 + .3 * Math.sin(t * 7 + i)));
    if (t > tw.gluck) p = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6 + i * 1.3))); applyPose(g, p); });
  lite.forEach((g, i) => { const k = t > tw.zwanzig - .2 && t < tw.also6 ? .5 + .5 * Math.sin(t * 7 + g.userData.ph) : t >= tw.also6 ? .9 : .2; g.userData.arm.rotation.x = -k * 2.8; });

  // ---- Pittermännchen ----
  const pk = ease(t, tw.fass - .45, tw.fass); pit.visible = t > tw.fass - .5; put(pit, V(60, lerp(TOP + 1.4, TOP, pk), 0), .3);
  pitMain.visible = t > tw.gluck; put(pitMain, V(.35, TOP, -.35), .4);
  // ---- bottles + contract ----
  bottles.forEach((b, i) => { const c = b.userData.city, k = pop(t, tw.brauerei + i * .25 - .3); b.visible = t > tw.aber7 - .1 && t < tw.gluck; b.scale.setScalar(Math.max(k, .001));
    const fall = c === 'Köln' ? 0 : ease(t, tw.nur3 + i * .1, tw.nur3 + i * .1 + .45); b.rotation.z = fall * (i < 2 ? 1.4 : -1.4); b.position.y = 1.08 - fall * .05; });
  doc.visible = t > tw.also7 - .1;
  drawDoc(ramp(t, tw.unter - .1, tw.vertrag + .2), t > tw.konv);
  pen.visible = t > tw.also7 && t < tw.koelsch4; { const s = ramp(t, tw.unter - .1, tw.vertrag + .2), k = (s * 4) % 1, row = Math.floor(Math.min(3.99, s * 4));
    const x = -60 + (row % 2 ? .03 : -.17) + k * .14, z = 1.3 + .12 + Math.floor(row / 2) * .055; pen.position.set(x, .87, z); pen.rotation.set(-.5, 0, .4); }
  // ---- door ----
  doorPivot.rotation.y = -1.6 * ease(t, tw.fliegst - .2, tw.fliegst + .2);

  // ---- labels ----
  Object.values(LB).forEach(v => (Array.isArray(v) ? v : [v]).forEach(s => s.visible = false));
  lab(LB.koelsch, win(t, tw.koelsch1 - .05, tw.aber1, .2) * pop(t, tw.koelsch1 - .05), .15, 1.32, .1, .42);
  lab(LB.warm, win(t, tw.warm - .05, tw.also1, .15) * pop(t, tw.warm - .05), .02, 1.2, .1, .26);
  lab(LB.schal, win(t, tw.schal - .05, tw.also1, .15) * pop(t, tw.schal - .05), .3, 1.1, .1, .26);
  lab(LB.l02, win(t, tw.nullw - .05, tw.stange - .1, .15) * pop(t, tw.nullw - .05), .12, 1.18, .02, .22);
  lab(LB.stange, win(t, tw.stange - .05, tw.aber2, .15) * pop(t, tw.stange - .05), .12, 1.2, .02, .34);
  lab(LB.q, win(t, tw.nachb - .1, tw.also2, .15) * pop(t, tw.nachb - .1), -.3, 1.9, -1.0, .7);
  lab(LB.koebes, win(t, tw.koebes1 - .05, tw.aber3, .15) * pop(t, tw.koebes1 - .05), KT.x, 2.2, KT.z, .9);
  lab(LB.zwei, win(t, tw.zwei - .05, tw.also3, .15) * pop(t, tw.zwei - .05), .2, 2.2, 1.5, 1.0);
  lab(LB.kranz, win(t, tw.kranz - .05, tw.aber4, .15) * pop(t, tw.kranz - .05), 4.08, 1.82, -1.8, .7);
  lab(LB.ex, win(t, tw.nie - .1, tw.also4, .15) * pop(t, tw.nie - .1), .3, 1.95, -1.0, .8);
  lab(LB.genug, win(t, tw.genug - .1, tw.aber5, .15) * pop(t, tw.genug - .1), .12, 1.13, .05, .24);
  if (t > tw.keiner - .1 && t < tw.also5) { const k = pop(t, tw.keiner - .1); lab(LB.q, k, 0, 2.0, -1.0, 1.4); lab(LB.q2, pop(t, tw.keiner + .05), -.8, 1.85, -.25, 1.4); lab(LB.q3, pop(t, tw.keiner + .2), .8, 1.85, -.25, 1.4); }
  lab(LB.rechnung, win(t, tw.rechnung - .05, tw.aber6, .15) * pop(t, tw.rechnung - .05), .12, 1.14, .1, .17);
  lab(LB.n20, win(t, tw.zwanzig - .05, tw.also6, .15) * pop(t, tw.zwanzig - .05), 60, 2.55, 0, 2.6);
  lab(LB.ex2, win(t, tw.hinterher - .1, tw.also6, .1) * pop(t, tw.hinterher - .1), koebes.position.x, 2.4, 1.75, 1.6);
  lab(LB.l10, win(t, tw.zehn - .05, tw.pitter - .1, .15) * pop(t, tw.zehn - .05), 60, 1.45, 0, .55);
  lab(LB.pitter, win(t, tw.pitter - .05, tw.aber7, .15) * pop(t, tw.pitter - .05), 60, 1.8, 0, 1.0);
  CITIES.forEach(([c], i) => { const b = bottles[i]; lab(LB.cities[i], win(t, tw.brauerei + i * .25 - .2, tw.also7, .15) * pop(t, tw.brauerei + i * .25 - .2), b.position.x, i % 2 ? 2.12 : 1.9, -1.55, .9);
    lab(LB.kq[i], win(t, tw.koelsch3 - .1 + i * .06, tw.also7, .15) * pop(t, tw.koelsch3 - .1 + i * .06), b.position.x, i % 2 ? .7 : .92, -1.4, .9);
    if (c !== 'Köln') lab(LB.x[i], win(t, tw.nur3 + i * .1, tw.konv - .15, .1) * pop(t, tw.nur3 + i * .1), b.position.x, 1.42, -1.4, 1.1); });
  lab(LB.alt, win(t, tw.alt - .1, tw.fliegst, .15) * pop(t, tw.alt - .1), -.12, 1.12, .18, .32);
  lab(LB.raus, ramp(t, tw.fliegst, tw.fliegst + .25) * pop(t, tw.fliegst), -3.0, 2.4, -1.4, 2.2);

  placeCamera(t);
}

// ---------- render: MSAA, labels on top ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(new OutputPass());
renderer.toneMappingExposure = 1.0;
window.END = END; window.TW = tw;
window.renderAt = (t, q = .93) => { update(t); composer.render(); renderer.autoClear = false; renderer.render(overlay, camera); renderer.autoClear = true;
  return renderer.domElement.toDataURL('image/jpeg', q); };
window.__done = true;
