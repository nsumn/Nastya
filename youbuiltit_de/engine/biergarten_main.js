// ===================== 23 Biergarten — Munich beer garden: cellar under chestnuts, king's decree, Brotzeit, Maß, Radler =====================
// Build: cat lib.js biergarten_main.js > biergarten.js   (./render_video.sh biergarten 23_biergarten). Captions: caption layer (captions.json).
// Sets: garden over a cut-open cellar (x 0), city + king (x 60), decree (x 120), Kugler Alm road (x -60).
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

await document.fonts.load('700 96px Fredoka');
const WORDS = await (await fetch('../23_biergarten/words.json')).json();
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
  fass: TE('Fass'), keller1: TE('Keller'), rollst: TE('rollst'), bierkeller: TE('Bierkeller'),
  aber1: TE('Aber'), sommer: TE('Sommer'), warm1: TE('warm'), bier2: TE('Bier', 2), schlecht: TE('schlecht'),
  also1: TE('Also'), schuettest: TE('schüttest'), kies: TE('Kies'), keller3: TE('Keller', 3), pflanzt: TE('pflanzt'), kast1: TE('Kastanien'), drauf: TE('drauf'),
  ihre: TE('Ihre'), grossen: TE('großen'), blaetter: TE('Blätter'), schatten: TE('Schatten'), flachen: TE('flachen'), wurzeln: TE('Wurzeln'), stoeren: TE('stören'), nicht1: TE('nicht'),
  aber2: TE('Aber', 2), kuehlen: TE('kühlen'), alle1: TE('alle'), hier: TE('hier'), trinken: TE('trinken'),
  also2: TE('Also', 2), tische: TE('Tische'), baenke: TE('Bänke'), kast2: TE('Kastanien', 2), biergarten: TE('Biergarten'),
  aber3: TE('Aber', 3), wirte: TE('Wirte'), stadt: TE('Stadt'), beschweren: TE('beschweren'), koenig1: TE('König'), keiner: TE('keiner'), kommt: TE('kommt'),
  also3: TE('Also', 3), erlaubt: TE('erlaubt'), bier3: TE('Bier', 3), essen1: TE('Essen'), nicht2: TE('nicht', 2), verkaufen: TE('verkaufen'),
  aber4: TE('Aber', 4), alle2: TE('alle', 2), hunger: TE('Hunger'),
  also4: TE('Also', 4), bringt: TE('bringt'), essen2: TE('Essen', 2), brezn: TE('Brezn'), radi: TE('Radi'), obazda: TE('Obazda'), brotzeit: TE('Brotzeit'),
  aber5: TE('Aber', 5), kleinen: TE('kleinen'), sonne: TE('Sonne'), warm2: TE('warm', 2),
  also5: TE('Also', 5), schweren: TE('schweren'), krug: TE('Krug'), liter: TE('Liter'), mass: TE('Maß'),
  aber6: TE('Aber', 6), wirt: TE('Wirt'), schenkt: TE('schenkt'), halb1: TE('halb'), voll: TE('voll'),
  also6: TE('Also', 6), gruenden: TE('gründen'), gaeste: TE('Gäste'), verein: TE('Verein'), betr: TE('betrügerisches'), einschenken: TE('Einschenken'),
  aber7: TE('Aber', 7), heissen: TE('heißen'), sonntag: TE('Sonntag'), n13: TE('dreizehntausend'), radfahrer: TE('Radfahrer'), bier5: TE('Bier', 5), aus: TE('aus', 2),
  also7: TE('Also', 7), mischst: TE('mischst'), bier6: TE('Bier', 6), halb2: TE('halb', 2), limo: TE('Zitronenlimo'), radler: TE('Radler'),
  gluck: TE('Glückwunsch'), biergarten2: TE('Biergarten', 2), und9: TE('Und'), stange: TE('Stange'), bestellst: TE('bestellst'), lacht: TE('lacht'), tisch: TE('Tisch') };

// ---------- sound ----------
const SFX = { end: END, music_gain: .07, events: [], beds: [[0, tw.also2, 'rustle', .45], [tw.also2, tw.aber3, 'pub', .35], [tw.aber4, tw.aber7, 'pub', .35], [tw.gluck, END, 'pub', .45]] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
e(.05, 'whoosh', .4); for (let k = 0; k < 4; k++) e(tw.fass + k * .3, 'knock', .35); e(tw.bierkeller, 'ding', .6);
e(tw.warm1, 'boom', .3); e(tw.schlecht, 'poof', .7);
for (let k = 0; k < 6; k++) e(tw.kies + k * .08, 'tick', .5); e(tw.pflanzt, 'pop', .7); e(tw.kast1, 'swoosh_up', .7); e(tw.kast1 + .3, 'sparkle', .5);
e(tw.schatten, 'ding', .5); e(tw.wurzeln, 'pop', .5); e(tw.nicht1, 'ding', .5);
e(tw.alle1, 'pop', .6); e(tw.hier, 'clink', .7); e(tw.tische, 'clack', .8); e(tw.baenke, 'clack', .8); e(tw.biergarten, 'tada', .7);
e(tw.aber3, 'whoosh', .5); e(tw.beschweren, 'buzz', .4); e(tw.koenig1, 'fanfare', .5);
e(tw.erlaubt, 'hiss', .3); e(tw.bier3, 'ding', .7); e(tw.nicht2, 'buzz', .6); e(tw.verkaufen, 'stamp', .9);
e(tw.hunger, 'boing', .7);
e(tw.brezn, 'pop', .8); e(tw.radi, 'pop', .8); e(tw.obazda, 'pop', .8); e(tw.brotzeit, 'sparkle', .7);
e(tw.sonne, 'boom', .3); e(tw.warm2, 'poof', .5);
e(tw.krug, 'clack', .9); e(tw.liter, 'ding', .6); e(tw.mass, 'tada', .6);
e(tw.schenkt, 'splash', .5); e(tw.voll, 'boing', .6);
e(tw.verein, 'swoosh_up', .7); e(tw.einschenken, 'stamp', .8); e(tw.einschenken + .4, 'splash', .4);
e(tw.aber7, 'whoosh', .5); for (let k = 0; k < 10; k++) e(tw.n13 + k * .2, 'jingle', .25); e(tw.aus, 'boing', .8);
e(tw.bier6, 'splash', .5); e(tw.limo, 'splash', .5); e(tw.radler, 'sparkle', .8);
e(tw.gluck, 'tada', .9); e(tw.gluck + .1, 'clink', .8); e(tw.stange, 'boing', .7); for (let k = 0; k < 3; k++) e(tw.lacht + k * .25, 'pop', .5);
window.SFX = SFX;

// ---------- textures + light ----------
const TL = new THREE.TextureLoader();
const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
const pbr = async n => ({ d: await ld(n + '_diff_1k.jpg', true), n: await ld(n + '_nor_gl_1k.jpg', false) });
const [TX_WOOD, TX_GRAV, TX_STONE, TX_PLAST, HDR] = await Promise.all([pbr('wood_planks'), pbr('gravel_floor_02'), pbr('stone_wall'), pbr('concrete_wall_004'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
HDR.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(HDR).texture; scene.environmentIntensity = .35;
scene.fog = new THREE.Fog('#dfe7ee', 40, 140);
function texMat(p, color, rx, ry, o = {}) { const d = p.d.clone(), n = p.n.clone(); d.repeat.set(rx, ry); n.repeat.set(rx, ry); d.needsUpdate = n.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: d, normalMap: n, color, roughness: o.rough ?? .8 }); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); return m; }
const gravM = texMat(TX_GRAV, '#e8dcc8', 4, 5), stoneM = texMat(TX_STONE, '#c9b9a0', 3, 1.5), stoneM2 = texMat(TX_STONE, '#b8a68c', 2, 4);
const tableM = texMat(TX_WOOD, '#c89a64', 2, .5, { rough: .55 }), benchM = texMat(TX_WOOD, '#b88850', 2, .3, { rough: .6 }), barrelM = texMat(TX_WOOD, '#a86c38', 2, 1, { rough: .5 });
const plazaM = texMat(TX_PLAST, '#d8cfc0', 8, 8, { ns: .6 }), roadM = texMat(TX_PLAST, '#8a8680', 2, 20, { ns: .4 });
const soilM2 = M('#7a5436', { roughness: 1 }), grassM2 = M('#6f9a3a', { roughness: 1 }), grassFar = M('#5f8a32', { roughness: 1 });
const ironM = new THREE.MeshStandardMaterial({ color: '#3a3a3c', metalness: .8, roughness: .4 });
const brassM = new THREE.MeshStandardMaterial({ color: '#d6a740', metalness: .9, roughness: .3 });
const glassM = new THREE.MeshStandardMaterial({ color: '#eef6ff', transparent: true, opacity: .2, roughness: .05, depthWrite: false, side: THREE.DoubleSide });
const beerM = new THREE.MeshStandardMaterial({ color: '#e8a018', emissive: '#b86a00', emissiveIntensity: .45, roughness: .2 });
const staleM = new THREE.MeshStandardMaterial({ color: '#b98a3a', emissive: '#4a2c00', emissiveIntensity: .2, roughness: .3 });
const radlerM = new THREE.MeshStandardMaterial({ color: '#e8a018', emissive: '#b86a00', emissiveIntensity: .45, roughness: .2 });
const foamM = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: .9 });
const blackM = M('#141414', { roughness: .5 }), whiteM = M('#ffffff', { roughness: .3 }), redM = M('#d8202a', { roughness: .4 });
const hemi = scene.children.find(o => o.isHemisphereLight); if (hemi) hemi.intensity = .9;
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.mapSize.set(2048, 2048);
function lightSet(cx, cz = -2) { sun.position.set(cx + 8, 18, cz + 10); sun.target.position.set(cx, 0, cz); sun.target.updateMatrixWorld(); fill.position.set(cx - 6, 5, cz + 20); }
function box(w, h, d, mat, x, y, z, cast = true, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; }
const plane = (w, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
const TOP = .78;

// ================= set A (x 0): garden on top of a cellar, cut open at z = 1.5 =================
const FZ = 1.5;
box(2.6, 3.2, 9.5, soilM2, -3.5, -1.6, -3.25, false); box(2.6, 3.2, 9.5, soilM2, 3.5, -1.6, -3.25, false);   // sides
box(4.4, .7, 9.5, soilM2, 0, -.35, -3.25, false); box(4.4, .4, 9.5, soilM2, 0, -3.0, -3.25, false);          // roof slab, floor slab
box(4.4, 2.1, 1.5, soilM2, 0, -1.75, -7.25, false);                                                          // back
// cellar lining: stone floor, walls, vault
plane(4.4, 6.5, stoneM, 0, -2.79, -1.75);
box(.06, 2.1, 6.5, stoneM2, -2.17, -1.75, -1.75, false); box(.06, 2.1, 6.5, stoneM2, 2.17, -1.75, -1.75, false); box(4.4, 2.1, .06, stoneM2, 0, -1.75, -4.97, false);
{ const v = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6.5, 24, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: stoneM.map, normalMap: stoneM.normalMap, color: '#b8a68c', side: THREE.BackSide, roughness: .8 }));
  v.scale.y = .28; v.position.set(0, -1.32, -1.75); scene.add(v); }
const cellarLight = new THREE.PointLight('#ffcf8a', 6, 7, 1.4); cellarLight.position.set(0, -1.3, 0); scene.add(cellarLight);
// lawn on top + all around, dark meadow below the cut
const lawnTop = plane(80, 61.5, grassM2, 0, .005, -29.25);
plane(80, 40, grassFar, 0, -3.2, 21.5);
const kies = box(10, 1, 9.5, gravM, 0, .0, -3.25, false); kies.castShadow = false;
// background trees + a far Munich skyline (two towers of the Frauenkirche)
for (const [x, z, s] of [[-9, -16, 1.1], [8, -18, 1.2], [-15, -9, 1], [15, -7, 1.1], [0, -24, 1.2]]) tree(x, z, s);
if (false) { const sk = new THREE.Group(); sk.position.set(-4, 0, -40); scene.add(sk); const bm = M('#b49a84', { roughness: .9 }), cm = M('#4f7a5a', { roughness: .5, metalness: .3 });
  for (const x of [-1.6, 1.6]) { box(2.4, 16, 2.4, bm, x, 8, 0, false, sk); const d = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cm); d.scale.y = 1.6; d.position.set(x, 16, 0); sk.add(d); }
  box(6, 9, 10, bm, 0, 4.5, 5, false, sk); }
// Kastanien: lib tree() + white flower candles
function kastanie(x, z, s) { const g = tree(x, z, s); const cm = M('#fbf6ea', { roughness: .8 });
  g.children.slice(1).forEach(l => { for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.08 * s, .32 * s, 6), cm); const a = rr(0, 6.3), r = .9 * s;
    c.position.set(l.position.x + Math.cos(a) * r * .7, l.position.y + r * rr(.5, .9), l.position.z + Math.sin(a) * r * .7); g.add(c); } });
  g.userData.leaves = g.children.slice(1); return g; }
const KAST = [kastanie(-3.0, .3, .85), kastanie(3.1, -3.0, .9), kastanie(-2.8, -6.6, .85)];
// roots on the cut face under the front tree
const rootM = M('#3a2414', { roughness: 1 });
const roots = [[-.15, -1.1], [-.25, -.6], [-.12, .9], [-.3, .45], [-.2, 1.4], [-.35, -1.5], [-.1, -.3]].map(([y, dx]) => { const len = Math.abs(dx) + .6, r = new THREE.Mesh(new THREE.CylinderGeometry(.025, .06, len, 6).rotateZ(Math.PI / 2), rootM);
  r.position.set(-3.0 + dx / 2, y, FZ + .02); r.rotation.z = (y + .2) * 1.2 * Math.sign(dx); scene.add(r); return r; });
// barrels in the cellar
function fass(r = .32, len = .8, lying = true) { const g = new THREE.Group(); scene.add(g); const G = new THREE.Group(); G.rotation.z = lying ? Math.PI / 2 : 0; g.add(G);
  const prof = []; for (let i = 0; i <= 12; i++) { const y = -len / 2 + i * len / 12; prof.push(new THREE.Vector2(r + .06 * Math.cos(y / (len / 2) * Math.PI / 2), y)); }
  const b = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), barrelM); b.castShadow = true; G.add(b);
  for (const y of [-len * .38, 0, len * .38]) { const h = new THREE.Mesh(new THREE.TorusGeometry(r + .06 * Math.cos(y / (len / 2) * Math.PI / 2) + .005, .012, 6, 30).rotateX(Math.PI / 2), ironM); h.position.y = y; G.add(h); }
  for (const s of [-1, 1]) { const lid = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(s * Math.PI / 2), barrelM); lid.position.y = s * len / 2; G.add(lid); }
  return g; }
const fass0 = fass(.45, 1.1), fassBack = [fass(), fass(), fass()];
// tables + benches (Bierbank sets)
function garnitur(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  box(2.2, .04, .6, tableM, 0, TOP - .02, 0, true, g); for (const s of [-1, 1]) { box(.05, TOP - .04, .5, ironM, s * .85, (TOP - .04) / 2, 0, true, g); box(2.2, .04, .25, benchM, 0, .45, s * .6, true, g); box(.05, .43, .2, ironM, s * .85, .215, .6, true, g); box(.05, .43, .2, ironM, s * .85, .215, -.6, true, g); }
  return g; }
const TABLES = [garnitur(0, -1.0), garnitur(0, -4.2), garnitur(-2.9, -3.4)];
// blue-white Bavarian cloth on table A
const rautTex = (() => { const [c, g] = cv(256, 128); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#3a7fd0';
  for (let i = -2; i < 18; i++) for (let j = -1; j < 9; j++) if ((i + j) % 2 === 0) { const x = i * 16, y = j * 16; g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + 8, y); g.lineTo(x + 16, y + 8); g.lineTo(x + 8, y + 16); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rautTex, roughness: .9 })); cloth.position.set(0, TOP + .002, -.95); cloth.receiveShadow = true; scene.add(cloth);
// sign
const signTex = (() => { const [c, g] = cv(512, 160); g.fillStyle = '#5a3418'; g.fillRect(0, 0, 512, 160); g.strokeStyle = '#e8c070'; g.lineWidth = 8; g.strokeRect(8, 8, 496, 144);
  g.fillStyle = '#ffe6a8'; g.font = '700 84px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BIERGARTEN', 256, 84); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const sign = new THREE.Group(); sign.position.set(1.55, 0, .9); scene.add(sign);
box(.08, 2.3, .08, benchM, -.7, 1.15, 0, true, sign); box(.08, 2.3, .08, benchM, .7, 1.15, 0, true, sign);
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .5), new THREE.MeshStandardMaterial({ map: signTex, roughness: .7 })); p.position.set(0, 2.05, .05); sign.add(p); box(1.62, .52, .04, benchM, 0, 2.05, 0, true, sign); }

// ---------- glasses ----------
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
const small = () => glass(.032, .11, beerM);
const massG = () => { const g = glass(.06, .22, beerM, true); const ring = new THREE.Mesh(new THREE.TorusGeometry(.061, .003, 4, 24).rotateX(Math.PI / 2), redM); ring.position.y = .19; g.add(ring); return g; };

// ---------- people ----------
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
  if (o.apron) {   // Wirt: long white apron
    const ap = new THREE.Mesh(new THREE.BoxGeometry(.5, .95, .03), M('#f4f1ea', { roughness: .8 })); ap.position.set(0, -.36, .25); pelvis.add(ap);
    const ap2 = new THREE.Mesh(new THREE.BoxGeometry(.4, .3, .03), M('#f4f1ea', { roughness: .8 })); ap2.position.set(0, .3, .2); pelvis.add(ap2);
    const mu = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .14, 4, 8).rotateZ(Math.PI / 2), M(hair)); mu.position.set(0, .11, .215); head.add(mu);
  }
  if (o.king) {    // König: red cape, golden crown
    const cape = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.45, .05), M('#b8202a', { roughness: .7 })); cape.position.set(0, -.12, -.24); pelvis.add(cape);
    const col = new THREE.Mesh(new THREE.TorusGeometry(.26, .06, 8, 20).rotateX(Math.PI / 2), M('#f4f1ea')); col.position.y = .64; pelvis.add(col);
    const gold = new THREE.MeshStandardMaterial({ color: '#e8b830', metalness: .85, roughness: .3 });
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(.17, .16, .1, 20, 1, true), gold); cr.position.y = .43; head.add(cr);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, s = new THREE.Mesh(new THREE.ConeGeometry(.035, .1, 6), gold); s.position.set(Math.cos(a) * .16, .52, Math.sin(a) * .16); head.add(s); }
    const mu = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .14, 4, 8).rotateZ(Math.PI / 2), M('#f4f1ea')); mu.position.set(0, .11, .215); head.add(mu);
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
const wirt = person('#7a5a3a', '#2a1a10', { apron: true });
const SEATS = [[-.75, -1.55, 0], [.75, -1.55, 0], [-.7, -4.75, 0], [0, -4.75, 0], [.7, -4.75, 0], [-.6, -3.65, Math.PI], [.6, -3.65, Math.PI], [-3.4, -3.95, 0], [-2.4, -3.95, 0]];
const SHIRTS = ['#c8572e', '#e6e0d0', '#3a7fb0', '#8a3a8f', '#d6a43a', '#a83a3a', '#3a8a8a', '#7a9a3a', '#5a5aa8'];
const guests = SEATS.map((s, i) => { const p = person(SHIRTS[i], i % 3 === 1 ? '#c09040' : i % 3 === 2 ? '#2a1a10' : '#6a4228'); p.userData.seat = s; return p; });
const gSmall = guests.map(() => small()), gMass = guests.map(() => massG());
const duSmall = small(), duMass = massG(), duStange = glass(.022, .2, beerM);
// Brotzeit: Brezn, Radi, Obazda on a wooden board
const brettl = box(.62, .025, .3, benchM, -.1, TOP + .013, -.83);
function brezn(s = 1) { const P0 = [[0, -.55], [-.45, -.75], [-.95, -.35], [-.85, .35], [-.35, .55], [.1, .15], [-.1, -.35], [-.2, -.55]], P1 = P0.map(([x, z]) => [-x, z]).reverse();
  const pts = [...P0, [0, -.62], ...P1].map(([x, z], i) => new THREE.Vector3(x * .1 * s, .022 * s + (i === 6 || i === 10 ? .01 : 0), z * .1 * s));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, .028 * s, 10, true), M('#9a5422', { roughness: .45 })); m.castShadow = true; scene.add(m); return m; }
const brezns = [brezn(1.2), brezn(1), brezn(1), brezn(1)];
const radi = new THREE.Group(); scene.add(radi);
{ const r = new THREE.Mesh(new THREE.ConeGeometry(.035, .2, 12).rotateZ(Math.PI / 2), M('#f6f2e8', { roughness: .5 })); r.castShadow = true; radi.add(r);
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(.02, .11, 6).rotateZ(-Math.PI / 2 + (i - 1) * .4), M('#4f8a2a')); l.position.set(.14, .01, (i - 1) * .02); radi.add(l); } }
const obazda = new THREE.Group(); scene.add(obazda);
{ const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.07, .05, .04, 20), whiteM); bowl.position.y = .02; obazda.add(bowl);
  const ch = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#e89a3a', { roughness: .8 })); ch.scale.y = .7; ch.position.y = .04; obazda.add(ch);
  for (let i = 0; i < 3; i++) { const o = new THREE.Mesh(new THREE.TorusGeometry(.018, .004, 4, 12).rotateX(Math.PI / 2 - .3), M('#f2ead8')); o.position.set((i - 1) * .025, .085, (i % 2) * .01); obazda.add(o); }
  obazda.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
// banner of the Verein
const banTex = (() => { const [c, g] = cv(768, 300); g.fillStyle = '#f6efdc'; g.fillRect(0, 0, 768, 300); g.fillStyle = '#3a7fd0'; g.fillRect(0, 0, 768, 22); g.fillRect(0, 278, 768, 22);
  g.fillStyle = '#1a2a4a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 56px Fredoka'; g.fillText('VEREIN GEGEN', 384, 70); g.fillText('BETRÜGERISCHES', 384, 132); g.fillText('EINSCHENKEN', 384, 194);
  g.font = '700 38px Fredoka'; g.fillStyle = '#b8202a'; g.fillText('München 1899', 384, 250); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const banner = new THREE.Group(); banner.position.set(0, 0, -2.55); scene.add(banner);
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(2.0, .78), new THREE.MeshStandardMaterial({ map: banTex, roughness: .8, side: THREE.DoubleSide })); p.position.y = 2.4; banner.add(p);
  for (const s of [-1, 1]) box(.05, 2.85, .05, benchM, s * 1.03, 1.42, 0, true, banner); }

// ================= set B (x 60): the city, the king, empty inns =================
plane(40, 40, plazaM, 60, 0, -5);
house(60, -9, 12, 7, 6);
const innSignTex = (() => { const [c, g] = cv(512, 128); g.fillStyle = '#2a4a2a'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#ffe6a8'; g.font = '700 70px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('WIRTSHAUS', 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), new THREE.MeshStandardMaterial({ map: innSignTex })); p.position.set(60, 3.3, -5.95); scene.add(p); }
box(1.4, .25, 1.0, M('#8a2a2a', { roughness: .8 }), 60.75, .125, .2);
const king = person('#6a2a8a', '#c9c2b0', { king: true });
const wirte = [person('#7a5a3a', '#2a1a10', { apron: true }), person('#5a6a7a', '#6a4228', { apron: true })];
// ================= set C (x 120): the decree on a table =================
box(1.4, .06, .9, tableM, 120, .75, 0); box(.1, .72, .7, ironM, 120, .36, 0); plane(20, 20, plazaM, 120, 0, 0);
const docCan = cv(512, 724); const docTex = new THREE.CanvasTexture(docCan[0]); docTex.colorSpace = THREE.SRGBColorSpace; let docState = '';
function drawDoc(a, b, stamp) { const st = '' + a + b + stamp; if (st === docState) return; docState = st; const g = docCan[1];
  g.fillStyle = '#f6efdc'; g.fillRect(0, 0, 512, 724); g.strokeStyle = '#c9b88e'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 696);
  g.fillStyle = '#2a1a10'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = '700 48px Fredoka'; g.fillText('Königlicher', 256, 96); g.fillText('Erlass', 256, 152);
  g.font = '700 30px Fredoka'; g.fillText('München, 1812', 256, 204);
  g.textAlign = 'left'; g.font = '700 54px Fredoka'; g.fillText('Bier', 80, 330); g.fillText('Essen', 80, 450);
  g.lineCap = 'round'; g.lineWidth = 16;
  if (a) { g.strokeStyle = '#2a9a3a'; g.beginPath(); g.moveTo(330, 305); g.lineTo(365, 340); g.lineTo(430, 260); g.stroke(); }
  if (b) { g.strokeStyle = '#d8202a'; g.beginPath(); g.moveTo(335, 395); g.lineTo(425, 470); g.moveTo(425, 395); g.lineTo(335, 470); g.stroke(); }
  g.strokeStyle = '#b9ab88'; g.lineWidth = 3; for (let y = 530; y < 600; y += 24) { g.beginPath(); g.moveTo(70, y); g.lineTo(442, y); g.stroke(); }
  if (stamp) { g.save(); g.translate(370, 640); g.rotate(-.25); g.strokeStyle = '#c8202a'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 60, 0, 7); g.stroke(); g.fillStyle = '#c8202a'; g.textAlign = 'center'; g.font = '700 28px Fredoka'; g.fillText('KÖNIG', 0, -4); g.font = '700 24px Fredoka'; g.fillText('1812', 0, 26); g.restore(); }
  docTex.needsUpdate = true; }
drawDoc(false, false, false);
const doc = new THREE.Mesh(new THREE.PlaneGeometry(.5, .707).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: docTex, roughness: .9 })); doc.position.set(120, .785, 0); doc.receiveShadow = true; scene.add(doc);

// ================= set D (x -60): Kugler Alm, 13 000 cyclists =================
plane(60, 80, grassM2, -60, 0, -10); plane(3.2, 70, roadM, -60, .01, -20);
house(-64.5, -14, 9, 6, 6, .5);
const almTex = (() => { const [c, g] = cv(512, 128); g.fillStyle = '#f4ead0'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#5a2a10'; g.font = '700 72px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Kugler Alm', 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .8), new THREE.MeshStandardMaterial({ map: almTex })); p.position.set(-64.5 + Math.sin(.5) * 3.05, 3.4, -14 + Math.cos(.5) * 3.05); p.rotation.y = .5; scene.add(p); }
for (const [x, z] of [[-55, -6], [-53, -16], [-66, 2], [-56, -26], [-68, -24]]) tree(x, z, 1);
const fassAlm = fass(.3, .75, false); fassAlm.position.set(-57.6, .42, 4.2);
box(1.2, .06, .8, tableM, -57.6, .75, 6.3); box(.1, .72, .6, ironM, -57.6, .36, 6.3);
const radlerG = glass(.06, .22, radlerM, true); { const ring = new THREE.Mesh(new THREE.TorusGeometry(.061, .003, 4, 24).rotateX(Math.PI / 2), redM); ring.position.y = .19; radlerG.add(ring); }
const lemon = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .01, 16).rotateX(Math.PI / 2), M('#f6e040', { roughness: .4 })); scene.add(lemon);
const riderM = SHIRTS.map(c => M(c, { roughness: .75 })), tireM = M('#1a1a1a'), frameM = M('#c8202a', { metalness: .4, roughness: .4 });
const riders = Array.from({ length: 36 }, (_, i) => { const g = new THREE.Group(); scene.add(g);
  for (const z of [-.42, .42]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.3, .035, 6, 20).rotateY(Math.PI / 2), tireM); w.position.set(0, .33, z); g.add(w); }
  const fr = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .85, 6).rotateX(Math.PI / 2), frameM); fr.position.y = .6; g.add(fr);
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .34, 4, 8), riderM[i % riderM.length]); b.position.set(0, 1.08, -.08); b.rotation.x = .35; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 8), skinM); h.position.set(0, 1.5, .05); g.add(h);
  const lg = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .4, 4, 6), pantsM); lg.position.set(0, .7, -.02); g.add(lg);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { lane: -60 + ((i * 7) % 5 - 2) * .55, z0: -26 - i * 1.3, sp: rr(5.5, 7) }; return g; });

// ---------- labels ----------
function label(text, w = 1, col = '#ffd21f') {   // canvas fits the text; size is set by the text height (w / 4 metres)
  const [c0, g0] = cv(8, 8); g0.font = '700 150px Fredoka'; const tw_ = g0.measureText(text).width, cw = Math.ceil(tw_ + 60);
  const [c, g] = cv(cw, 256); g.font = '700 150px Fredoka'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, cw / 2, 134); g.fillStyle = col; g.fillText(text, cw / 2, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.userData = { w, aspect: cw / 256 }; s.visible = false; return s; }
const overlay = new THREE.Scene();
let LS = 1.7;
const LB = { bierkeller: label('Bierkeller'), sommer: label('Sommer', 1, '#ffb030'), warm: label('warm', 1, '#ff7a3a'), schlecht: label('schlecht', 1, '#9ad86a'),
  kies: label('Kies'), kast: label('Kastanie'), schatten: label('Schatten', 1, '#bfe6ff'), flach: label('flach'), kuehl: label('kühl', 1, '#7fd0ff'), ok: label('OK', 1, '#7cf07c'),
  hier: label('hier!'), biergarten: label('Biergarten'), wirte: label('Wirte', 1, '#ffffff'), koenig: label('König'), ex: label('!', 1, '#ff4a3a'), ex2: label('!', 1, '#ff4a3a'), leer0: label('leer', 1, '#c8c8c8'),
  hunger: label('Hunger!', 1, '#ff7a3a'), brezn: label('Brezn'), radi: label('Radi'), obazda: label('Obazda'), brotzeit: label('Brotzeit'),
  warm2: label('warm', 1, '#ff7a3a'), l1: label('1 Liter'), mass: label('Maß'), halb: label('halb voll?', 1, '#ff4a3a'),
  n13: label('13.000'), leer: label('leer!', 1, '#ff4a3a'), bier: label('Bier'), limo: label('Limo', 1, '#fff27a'), radler: label('Radler'),
  stange: label('Stange?', 1, '#ffb07a'), ha: [0, 1, 2, 3].map(i => label(i % 2 ? 'HAHA' : 'HA', 1, '#ffffff')) };
for (const v of Object.values(LB)) (Array.isArray(v) ? v : [v]).forEach(s => overlay.add(s));
// size k (0..1), world width w (metres) at that point
function lab(s, k, x, y, z, w) { s.visible = k > .01; if (!s.visible) return; const h = (w ?? s.userData.w) * LS / 4 * Math.max(k, .001); s.position.set(x, y, z); s.scale.set(h * s.userData.aspect, h, 1); }

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(42, W / H, .05, 200);
const CUT = .001;
const KEYS = [
  [0, V(0, -1.3, 6.6), V(0, -1.95, -1.5)], [tw.aber1 - .1, V(0, -1.4, 5.9), V(0, -1.95, -1.5)],
  [tw.aber1 + CUT, V(1.0, 1.6, 10.5), V(0, -.6, -2), 1], [tw.also1, V(.9, 1.4, 9.8), V(0, -.7, -2)],
  [tw.also1 + CUT, V(0, 2.6, 13.5), V(0, 1.8, -3), 1], [tw.ihre, V(0, 2.8, 12.8), V(0, 2.0, -3)],
  [tw.ihre + CUT, V(.5, 14, 7), V(0, 0, -3), 1], [tw.flachen - .1, V(.5, 13, 6.2), V(0, 0, -3)],
  [tw.flachen + CUT, V(-2.4, .6, 4.6), V(-2.4, -.45, 1.4), 1], [tw.aber2, V(-2.3, .5, 4.2), V(-2.3, -.5, 1.4)],
  [tw.aber2 + CUT, V(0, 2.3, 8.5), V(0, .9, -3), 1], [tw.also2, V(0, 2.2, 8.0), V(0, .9, -3)],
  [tw.also2 + CUT, V(.4, 3.4, 10.5), V(0, .7, -3), 1], [tw.aber3, V(.3, 3.2, 9.8), V(0, .7, -3)],
  [tw.aber3 + CUT, V(60.3, 2.0, 8.2), V(60.1, 1.3, 0), 1], [tw.also3, V(60.3, 1.95, 7.6), V(60.1, 1.3, 0)],
  [tw.also3 + CUT, V(120, 1.6, .55), V(120, .78, -.02), 1], [tw.aber4, V(120, 1.55, .5), V(120, .78, -.02)],
  [tw.aber4 + CUT, V(0, 1.75, 3.6), V(0, 1.0, -2), 1], [tw.also4, V(0, 1.7, 3.3), V(0, 1.0, -2)],
  [tw.also4 + CUT, V(-.04, 2.2, -.3), V(-.04, .78, -.84), 1], [tw.aber5, V(-.04, 2.1, -.33), V(-.04, .78, -.84)],
  [tw.aber5 + CUT, V(.9, 1.0, -.35), V(.45, .86, -.8), 1], [tw.also5, V(.88, .99, -.38), V(.45, .86, -.8)],
  [tw.also5 + CUT, V(.7, 1.12, .05), V(.45, .9, -.8), 1], [tw.aber6, V(.68, 1.1, 0), V(.45, .9, -.8)],
  [tw.aber6 + CUT, V(-.3, 1.5, 1.1), V(.55, 1.0, -.75), 1], [tw.also6, V(-.25, 1.45, .95), V(.55, 1.0, -.75)],
  [tw.also6 + CUT, V(0, 2.4, 5.8), V(0, 1.75, -2.5), 1], [tw.einschenken + .2, V(0, 2.35, 5.4), V(0, 1.75, -2.5)],
  [tw.einschenken + .2 + CUT, V(.7, 1.12, .05), V(.45, .9, -.8), 1], [tw.aber7, V(.68, 1.1, 0), V(.45, .9, -.8)],
  [tw.aber7 + CUT, V(-59.0, 1.9, 9.5), V(-60, 1.0, -4), 1], [tw.also7, V(-59.0, 1.85, 9.0), V(-60, 1.0, -4)],
  [tw.also7 + CUT, V(-57.6, 1.2, 7.05), V(-57.6, .93, 6.25), 1], [tw.gluck, V(-57.6, 1.18, 6.95), V(-57.6, .93, 6.25)],
  [tw.gluck + CUT, V(0, 3.4, 10), V(0, 1.0, -2.5), 1], [tw.und9, V(0, 3.0, 8.6), V(0, 1.0, -2.3)],
  [tw.und9 + CUT, V(0, 1.6, 1.4), V(0, 1.1, -1.4), 1], [END, V(0, 1.75, 2.2), V(0, 1.1, -1.6)]];
KEYS.sort((a, b) => a[0] - b[0]);
for (let i = KEYS.length - 1; i > 0; i--) if (KEYS[i][3] && KEYS[i][0] - KEYS[i - 1][0] > 2 * CUT) KEYS.splice(i, 0, [KEYS[i][0] - CUT, KEYS[i - 1][1], KEYS[i - 1][2]]);
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- timeline ----------
function put(o, p, ry = 0) { o.position.copy(p); o.rotation.set(0, ry, 0); }
function update(t) {
  const set = t >= tw.aber3 && t < tw.also3 ? 60 : t >= tw.also3 && t < tw.aber4 ? 120 : t >= tw.aber7 && t < tw.gluck ? -60 : 0;
  lightSet(set, set === -60 ? 2 : set === 120 ? 0 : -2);
  const hot = win(t, tw.sommer - .2, tw.schatten, .4) + win(t, tw.sonne - .2, tw.also5, .3);
  sun.intensity = 2.6 + 1.0 * hot; sun.color.setRGB(1, lerp(.96, .82, hot), lerp(.9, .62, hot));
  // cellar: warm -> red, shade -> blue
  const red = ease(t, tw.warm1 - .3, tw.warm1 + .2) * (1 - ease(t, tw.kies, tw.schatten));
  const cool = ease(t, tw.schatten - .2, tw.schatten + .3);
  cellarLight.color.setRGB(1, lerp(.81, .45, red) * (1 - cool * .2), lerp(.54, .3, red) + cool * .45); cellarLight.intensity = 6 + red * 4;

  // ---- set A ----
  // barrel rolls in along z, then stays; 3 more appear behind
  { const k = ease(t, tw.fass - .1, tw.rollst + .4); fass0.position.set(.3, -2.79 + .53, lerp(-4.4, -.2, k)); fass0.rotation.set(-lerp(0, 9.3, k), 0, 0);
    fassBack.forEach((f, i) => { const s = pop(t, tw.bierkeller + i * .12); f.visible = t > tw.bierkeller; f.scale.setScalar(Math.max(s, .001)); f.position.set(-1.1 + (i % 2) * .8, -2.79 + .38 + (i === 2 ? .7 : 0), -4.2); if (i === 2) f.position.x = -.7; }); }
  // gravel + chestnuts
  const kk = ease(t, tw.kies - .1, tw.keller3 + .2); kies.visible = kk > .01; kies.scale.y = Math.max(kk * .1, .001); kies.position.y = kk * .05;
  KAST.forEach((g, i) => { const k = ease(t, tw.pflanzt + i * .2, tw.drauf + .2 + i * .2); g.visible = k > .01; g.scale.setScalar(Math.max(k, .001) * (.35 + .65 * k));
    const lk = lerp(.75, 1, ease(t, tw.grossen, tw.blaetter + .2)); g.userData.leaves.forEach(l => l.scale.setScalar(lk)); });
  roots.forEach((r, i) => { const k = ease(t, tw.flachen - .1 + i * .08, tw.wurzeln + .3 + i * .08); r.visible = t > tw.pflanzt; r.scale.set(1, Math.max(.2, k), 1); });
  // tables pop
  TABLES.forEach((g, i) => { const k = pop(t, tw.tische - .05 + i * .12); g.visible = t > tw.tische - .1; g.scale.setScalar(Math.max(k, .001)); });
  cloth.visible = t > tw.tische; sign.visible = t > tw.biergarten - .1; sign.scale.setScalar(Math.max(pop(t, tw.biergarten - .1), .001));
  // people
  const seated = t > tw.baenke - .1, standing = !seated && t > tw.alle1 - .15;
  guests.forEach((g, i) => { const [x, z, ry] = g.userData.seat; g.visible = t > tw.alle1 - .15 + i * .04 && (t < tw.aber3 || t > tw.aber4);
    const k = pop(t, tw.alle1 - .15 + i * .04); g.scale.setScalar(Math.max(k, .001));
    let p;
    if (standing) { put(g, V(x, 0, z + (ry ? .2 : -.2)), ry); p = mixP(UP.idle, UP.raise, ease(t, tw.hier - .3 + i * .03, tw.hier + i * .03)); }
    else { put(g, V(x, 0, z), ry); p = SIT(UP.table);
      if (t > tw.aber4 && t < tw.also4) p = SIT(mixP(UP.table, UP.headhold, ease(t, tw.hunger - .3, tw.hunger)));
      if (t > tw.also6 && t < tw.aber7) { p = mixP(UP.idle, UP.cheer, ease(t, tw.verein, tw.verein + .3) * (.7 + .3 * Math.sin(t * 7 + i))); g.position.z += ry ? -.15 : .15; }
      if (t > tw.aber5 && t < tw.also5) p = SIT(mixP(UP.table, UP.shrug, ease(t, tw.warm2 - .2, tw.warm2 + .1) * .6));
      if (t > tw.gluck && t < tw.lacht) p = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6 + i)));
      if (t >= tw.lacht) { p = SIT(mixP(UP.table, UP.headhold, .35)); p[10] = -.25 + .12 * Math.sin(t * 16 + i); p[14] = 1.3; p[13] = .6; } }
    applyPose(g, p);
    // glasses: small until Maß, then Maß
    const front = ry ? 1 : -1, tz = z - front * .45;
    const sm_ = gSmall[i], ms = gMass[i]; sm_.visible = g.visible && seated && t < tw.krug; ms.visible = g.visible && seated && t >= tw.krug;
    sm_.position.set(x + .15, TOP, tz); ms.position.set(x + .15, TOP, tz); ms.scale.setScalar(Math.max(pop(t, tw.krug + i * .05), .001));
    if (standing) { sm_.visible = g.visible; sm_.position.copy(handPos(g, 1)); }
    sm_.setLevel(t > tw.aber5 && t < tw.krug ? .85 : 1); sm_.children[2].material = t > tw.warm2 - .1 && t < tw.krug ? staleM : beerM; });
  // du: sits in the middle of the back bench of table A
  du.visible = t > tw.alle1 - .15 && (t < tw.aber3 || t > tw.aber4);
  { let p = SIT(UP.table), dp = V(0, 0, -1.55);
    if (standing) { dp = V(0, 0, -1.75); p = mixP(UP.idle, UP.raise, ease(t, tw.hier - .3, tw.hier)); }
    if (t > tw.aber4 && t < tw.also4) p = SIT(mixP(UP.table, UP.headhold, ease(t, tw.hunger - .3, tw.hunger)));
    if (t > tw.aber5 && t < tw.also5) p = SIT(mixP(UP.table, UP.shrug, ease(t, tw.warm2 - .2, tw.warm2 + .1)));
    if (t > tw.aber6 && t < tw.also6) p = SIT(mixP(UP.table, UP.point, ease(t, tw.halb1, tw.voll)));
    if (t > tw.also6 && t < tw.aber7) { dp = V(0, 0, -1.75); p = mixP(UP.idle, UP.cheer, ease(t, tw.verein, tw.verein + .3) * (.7 + .3 * Math.sin(t * 7))); }
    if (t > tw.gluck && t < tw.und9) p = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6)));
    if (t >= tw.und9) p = SIT(mixP(UP.table, UP.raise, ease(t, tw.stange - .4, tw.stange)));
    put(du, dp, 0); applyPose(du, p);
    duSmall.visible = du.visible && (standing || seated) && t < tw.krug && !(t > tw.also6 && t < tw.aber7); duSmall.position.copy(standing ? handPos(du, 1) : V(.45, TOP, -.8));
    duSmall.setLevel(t > tw.aber5 && t < tw.krug ? .85 : 1); duSmall.children[2].material = t > tw.warm2 - .1 && t < tw.krug ? staleM : beerM;
    duMass.visible = du.visible && t >= tw.krug - .05 && t < tw.und9 && !(t > tw.also6 && t < tw.einschenken); duMass.position.set(.45, TOP, -.8);
    duMass.scale.setScalar(Math.max(pop(t, tw.krug - .05), .001));
    let ml = 1, fk = 1; if (t > tw.aber6 && t < tw.einschenken + .3) { ml = .5 * ease(t, tw.schenkt - .1, tw.halb1); fk = 4; }
    if (t >= tw.einschenken + .3 && t < tw.aber7 + 1) { ml = lerp(.5, 1.0, ease(t, tw.einschenken + .3, tw.einschenken + .9)); fk = lerp(4, 1, ease(t, tw.einschenken + .3, tw.einschenken + .9)); }
    duMass.setLevel(ml, fk);
    duStange.visible = t >= tw.und9; if (duStange.visible) { duStange.scale.setScalar(Math.max(pop(t, tw.und9), .001)); duStange.position.copy(t > tw.stange - .4 ? handPos(du, 1, V(0, -.12, .04)) : V(.3, TOP, -1.05)); } }
  // Wirt pours at table A
  wirt.visible = t > tw.aber6 && t < tw.also6; put(wirt, V(1.3, 0, -.45), -2.03); applyPose(wirt, mixP(UP.idle, UP.place, ease(t, tw.schenkt - .3, tw.schenkt)));
  // Brotzeit
  const bz = [[-.25, -.83, tw.brezn], [-.03, -.85, tw.radi], [.17, -.82, tw.obazda]];
  brettl.visible = t > tw.bringt - .1 && t < tw.gluck + 99; brettl.scale.setScalar(Math.max(pop(t, tw.bringt - .1), .001));
  brezns[0].position.set(bz[0][0], TOP + .026, bz[0][1]); brezns[0].scale.setScalar(Math.max(pop(t, tw.brezn - .05), .001)); brezns[0].visible = t > tw.brezn - .1;
  [[-.6, -4.5], [.5, -4.0], [-2.9, -3.55]].forEach(([x, z], i) => { const b = brezns[i + 1]; b.position.set(x, TOP, z); b.visible = t > tw.brezn; b.scale.setScalar(Math.max(pop(t, tw.brezn + .1 * i), .001)); });
  radi.position.set(bz[1][0], TOP + .06, bz[1][1]); radi.rotation.y = .4; radi.visible = t > tw.radi - .1; radi.scale.setScalar(Math.max(pop(t, tw.radi - .05), .001));
  obazda.position.set(bz[2][0], TOP + .026, bz[2][1]); obazda.visible = t > tw.obazda - .1; obazda.scale.setScalar(Math.max(pop(t, tw.obazda - .05), .001));
  // banner
  banner.visible = t > tw.verein - .15 && t < tw.aber7; banner.scale.setScalar(Math.max(pop(t, tw.verein - .15), .001));

  // ---- set B: king + Wirte ----
  put(king, V(60.75, .25, .2), -Math.PI / 2 + .55);
  applyPose(king, t > tw.koenig1 ? mixP(UP.idle, UP.shrug, ease(t, tw.keiner, tw.kommt) * .6) : UP.idle);
  wirte.forEach((w, i) => { put(w, V(59.3 + i * .35, 0, .9 - i * 1.4), Math.PI / 2 - .5 + i * .5);
    const p = mixP(UP.idle, UP.point, ease(t, tw.beschweren - .2 + i * .15, tw.beschweren + .1 + i * .15)); p[13] = -.7; p[14] = .9 + .3 * Math.sin(t * 14 + i); applyPose(w, p); });
  // ---- set C: decree ----
  drawDoc(t > tw.bier3 - .05, t > tw.nicht2 - .05, t > tw.verkaufen);
  // ---- set D: cyclists, empty barrel, Radler ----
  riders.forEach((r, i) => { const u = r.userData; const z = Math.min(u.z0 + Math.max(0, t - tw.aber7 + .3) * u.sp, 3.2 - (i % 6) * .9 - Math.floor(i / 6) * .1); r.position.set(u.lane, 0, z); r.visible = t > tw.aber7 - .1 && t < tw.also7; });
  const rk = ease(t, tw.bier6 - .1, tw.halb2 + .1), lk = ease(t, tw.limo - .1, tw.limo + .5);
  radlerG.position.set(-57.6, TOP, 6.25); radlerG.setLevel(Math.max(.001, .5 * rk + .5 * lk), 1);
  radlerM.color.lerpColors(new THREE.Color('#e8a018'), new THREE.Color('#f4e070'), lk * .75); radlerM.emissive.lerpColors(new THREE.Color('#b86a00'), new THREE.Color('#a89020'), lk * .75);
  lemon.visible = t > tw.radler - .1; lemon.scale.setScalar(Math.max(pop(t, tw.radler - .1), .001)); lemon.position.set(-57.6 + .055, TOP + .215, 6.25 + .0);

  // ---- labels ----
  Object.values(LB).forEach(v => (Array.isArray(v) ? v : [v]).forEach(s => s.visible = false));
  lab(LB.bierkeller, win(t, tw.bierkeller - .05, tw.aber1, .15) * pop(t, tw.bierkeller - .05), 0, -.95, 0, 1.3);
  lab(LB.sommer, win(t, tw.sommer - .05, tw.also1, .15) * pop(t, tw.sommer - .05), 0, 1.4, -1, 1.7);
  lab(LB.warm, win(t, tw.warm1 - .05, tw.also1, .15) * pop(t, tw.warm1 - .05), -.9, -1.35, -.3, 1.0);
  lab(LB.schlecht, win(t, tw.schlecht - .05, tw.also1, .15) * pop(t, tw.schlecht - .05), .6, -1.6, -.3, 1.1);
  lab(LB.kies, win(t, tw.kies - .05, tw.pflanzt, .15) * pop(t, tw.kies - .05), 0, .7, 0, 1.6);
  lab(LB.kast, win(t, tw.kast1 - .05, tw.ihre, .15) * pop(t, tw.kast1 - .05), 0, 6.6, -3, 2.6);
  lab(LB.schatten, win(t, tw.schatten - .05, tw.flachen, .15) * pop(t, tw.schatten - .05), 0, 1, -1.8, 2.6);
  lab(LB.flach, win(t, tw.wurzeln - .05, tw.aber2, .15) * pop(t, tw.wurzeln - .05), -2.3, .15, FZ + .1, .7);
  lab(LB.ok, win(t, tw.nicht1 - .05, tw.aber2, .15) * pop(t, tw.nicht1 - .05), -1.6, -1.2, FZ, .7);
  lab(LB.kuehl, win(t, tw.schatten - .05, tw.flachen, .15) * pop(t, tw.schatten - .05), .9, -1.2, 0, .9);
  lab(LB.hier, win(t, tw.hier - .05, tw.also2, .15) * pop(t, tw.hier - .05), 0, 2.7, -2.5, 1.4);
  lab(LB.biergarten, win(t, tw.biergarten - .05, tw.aber3, .15) * pop(t, tw.biergarten - .05), 0, 3.0, -2.6, 1.6);
  lab(LB.wirte, win(t, tw.wirte - .05, tw.koenig1, .15) * pop(t, tw.wirte - .05), 59.4, 2.35, .3, .9);
  lab(LB.koenig, win(t, tw.koenig1 - .05, tw.also3, .15) * pop(t, tw.koenig1 - .05), 60.75, 2.45, .2, .9);
  lab(LB.ex, win(t, tw.beschweren - .05, tw.koenig1, .1) * pop(t, tw.beschweren - .05), 59.2, 2.3, .75, .9);
  lab(LB.ex2, win(t, tw.beschweren + .1, tw.koenig1, .1) * pop(t, tw.beschweren + .1), 59.6, 2.3, -.2, .9);
  lab(LB.leer0, win(t, tw.keiner - .05, tw.also3, .15) * pop(t, tw.keiner - .05), 60, 1.2, -5.5, 1.6);
  lab(LB.hunger, win(t, tw.hunger - .1, tw.also4, .15) * pop(t, tw.hunger - .1), 0, 2.3, -1.8, .85);
  lab(LB.brezn, win(t, tw.brezn - .05, tw.brotzeit - .1, .15) * pop(t, tw.brezn - .05), -.25, .92, -.83, .16);
  lab(LB.radi, win(t, tw.radi - .05, tw.brotzeit - .1, .15) * pop(t, tw.radi - .05), -.02, 1.0, -.85, .16);
  lab(LB.obazda, win(t, tw.obazda - .05, tw.brotzeit - .1, .15) * pop(t, tw.obazda - .05), .17, .92, -.82, .16);
  lab(LB.brotzeit, win(t, tw.brotzeit - .05, tw.aber5, .15) * pop(t, tw.brotzeit - .05), -.08, 1.04, -.9, .3);
  lab(LB.warm2, win(t, tw.warm2 - .05, tw.also5, .15) * pop(t, tw.warm2 - .05), .45, 1.0, -.8, .2);
  lab(LB.l1, win(t, tw.liter - .05, tw.mass - .1, .15) * pop(t, tw.liter - .05), .45, 1.12, -.8, .22);
  lab(LB.mass, win(t, tw.mass - .05, tw.aber6, .15) * pop(t, tw.mass - .05), .45, 1.12, -.8, .28);
  lab(LB.halb, win(t, tw.halb1 - .05, tw.also6, .15) * pop(t, tw.halb1 - .05), .45, 1.2, -.8, .22);
  lab(LB.n13, win(t, tw.n13 - .05, tw.bier5, .15) * pop(t, tw.n13 - .05), -60, 3.0, -2, 2.2);
  lab(LB.leer, win(t, tw.aus - .1, tw.also7, .15) * pop(t, tw.aus - .1), -57.6, 1.3, 4.2, 1.1);
  lab(LB.bier, win(t, tw.halb2 - .1, tw.radler - .1, .15) * pop(t, tw.halb2 - .1), -57.6 - .1, .86, 6.3, .08);
  lab(LB.limo, win(t, tw.limo + .2, tw.radler - .1, .15) * pop(t, tw.limo + .2), -57.6 - .1, .98, 6.3, .08);
  lab(LB.radler, win(t, tw.radler - .05, tw.gluck, .15) * pop(t, tw.radler - .05), -57.6, 1.1, 6.25, .15);
  lab(LB.stange, win(t, tw.stange - .05, tw.lacht, .15) * pop(t, tw.stange - .05), .25, 1.75, -1.4, .38);
  LB.ha.forEach((s, i) => lab(s, ramp(t, tw.lacht + i * .15, tw.lacht + i * .15 + .2) * pop(t, tw.lacht + i * .15), [-1.05, .95, -.55, .5][i], [1.85, 1.8, 2.05, 2.1][i], -1.5, .3));

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
