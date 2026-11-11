// ===================== KO 01 고깃집 (Korean BBQ) — "soft look": VSM soft shadows, depth of field, bloom, warm grade + vignette =====================
// Build: cat lib.js gogijip_main.js > gogijip.js  (./render_video.sh gogijip ko01_gogijip). Captions: caption layer (font Jua).
// Sets: restaurant (x 0) with the pay counter on the right, kitchen (x 60).
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FONT = 'Jua';
await document.fonts.load(`700 96px ${FONT}`);
const WORDS = await (await fetch('../ko01_gogijip/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function TE(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w) === word && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.6;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const G = n => TE('근데', n), S = n => TE('그래서', n);
const tw = {
  gogi1: TE('고기구이가'), g1: G(1), jubang: TE('주방에서'), sigeo: TE('식어'),
  s1: S(1), hangaunde: TE('한가운데에'), bulpan1: TE('불판을'), sonnim: TE('손님이'), gupneun: TE('굽는'),
  g2: G(2), gage: TE('가게'), yeongi1: TE('연기로'), kkwak: TE('꽉'),
  s2: S(2), tablemada: TE('테이블마다'), yeontong: TE('연통을'), dara: TE('달아'), yeongi2: TE('연기를'), ppara: TE('빨아들이지'),
  g3: G(3), samgyeop: TE('삼겹살이'), gireoseo: TE('길어서'), hanip: TE('한입에'),
  s3: S(3), gawiro: TE('가위로'), jalla: TE('잘라'), gawiga: TE('가위가'), kal: TE('칼이야'),
  g4: G(4), gireumi: TE('기름이'), goyeoseo: TE('고여서'), twigyeo: TE('튀겨져'),
  s4: S(4), bulpan2: TE('불판을', 2), biseu: TE('비스듬하게'), gumeong: TE('구멍으로'), ppajiji: TE('빠지지'),
  g5: G(5), kkamake: TE('까맣게'), tamyeon: TE('타면'), sseojyeo: TE('써져'),
  s5: S(5), jigwoni: TE('직원이'), waseo: TE('와서'), bulpan3: TE('불판을', 3), sae: TE('새'), gara: TE('갈아줘'),
  g6: G(6), gogiman: TE('고기만'), neukki: TE('느끼해'),
  s6: S(6), banchani: TE('반찬이'), kimchi: TE('김치'), kong: TE('콩나물'), pa: TE('파절이'), gongjja: TE('공짜로'), jwo: TE('줘'),
  g7: G(7), soju: TE('소주는'), sseugo: TE('쓰고'), maekju: TE('맥주는'), singeo: TE('싱거워'),
  s7: S(7), seokkeo: TE('섞어'), somaek: TE('소맥이야'), sutgarak: TE('숟가락으로'), tak: TE('탁'), geopum: TE('거품이'), hwak: TE('확'),
  g8: G(8), otheseo: TE('옷에서'), naemsae: TE('냄새가'),
  s8: S(8), uija: TE('의자'), ttukkeong: TE('뚜껑을'), yeolmyeon: TE('열면'), tong: TE('통이'),
  chukha: TE('축하해'), hanguk: TE('한국'), mandeul: TE('만들었어'), g9: G(9), gyesan: TE('계산할'), seoro: TE('서로'), ssawo: TE('싸워') };

// ---------- sound ----------
const SFX = { end: END, music_gain: .06, events: [], beds: [[0, END, 'pub', .45], [tw.s1, tw.chukha, 'fire', .25]] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
e(.05, 'whoosh', .4); e(tw.gogi1, 'hiss', .5); e(tw.sigeo, 'brr', .6);
e(tw.hangaunde, 'clack', .9); e(tw.bulpan1, 'poof', .6); e(tw.gupneun, 'hiss', .7);
e(tw.yeongi1, 'poof', .8); e(tw.kkwak, 'boom', .5);
e(tw.yeontong - .1, 'swoosh_up', .8); e(tw.ppara, 'whoosh', .8);
e(tw.gireoseo, 'boing', .5);
for (let k = 0; k < 4; k++) e(tw.jalla - .1 + k * .2, 'tick', .9); e(tw.kal, 'ding', .6);
e(tw.goyeoseo, 'hiss', .5); e(tw.twigyeo, 'crackle', .8);
e(tw.biseu, 'swoosh_up', .6); e(tw.ppajiji, 'splash', .5);
e(tw.kkamake, 'crackle', .6); e(tw.sseojyeo, 'buzz', .4);
e(tw.jigwoni, 'whoosh', .5); e(tw.gara, 'clack', .9); e(tw.gara + .2, 'sparkle', .6);
e(tw.neukki, 'boing', .4);
e(tw.kimchi, 'pop', .7); e(tw.kong, 'pop', .7); e(tw.pa, 'pop', .7); e(tw.gongjja, 'ding', .6);
e(tw.soju, 'clink', .6); e(tw.sseugo, 'buzz', .3); e(tw.maekju, 'clink', .5);
e(tw.seokkeo, 'splash', .6); e(tw.somaek, 'ding', .6); e(tw.tak, 'clink', 1); e(tw.hwak, 'swoosh_up', .8);
e(tw.naemsae, 'poof', .5); e(tw.ttukkeong, 'clack', .7); e(tw.tong, 'clack', .6);
e(tw.chukha, 'tada', .9); e(tw.chukha + .15, 'clink', .7); e(tw.seoro, 'boing', .7); e(tw.ssawo, 'whoosh', .8);
window.SFX = SFX;

// ---------- textures + HDRI light ----------
const TL = new THREE.TextureLoader();
const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
const pbr = async n => ({ d: await ld(n + '_diff_1k.jpg', true), n: await ld(n + '_nor_gl_1k.jpg', false) });
const [TX_WOOD, TX_PLAST, HDR] = await Promise.all([pbr('wood_planks'), pbr('concrete_wall_004'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
HDR.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(HDR).texture; scene.environmentIntensity = .45;
scene.background = new THREE.Color('#2a1a10'); scene.fog = null;
renderer.shadowMap.type = THREE.VSMShadowMap;
function texMat(p, color, rx, ry, o = {}) { const d = p.d.clone(), n = p.n.clone(); d.repeat.set(rx, ry); n.repeat.set(rx, ry); d.needsUpdate = n.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: d, normalMap: n, color, roughness: o.rough ?? .8 }); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); return m; }
const floorM = texMat(TX_PLAST, '#9a9086', 5, 5, { ns: .4, rough: .7 }), panelM = texMat(TX_WOOD, '#8a5a34', 6, 1, { rough: .6 }), plasterM = texMat(TX_PLAST, '#efe4d0', 4, 2, { ns: .4 });
const beamM = texMat(TX_WOOD, '#4a2c18', 4, .3), counterM = texMat(TX_WOOD, '#a8723e', 2, .5, { rough: .5 });
const steelM = new THREE.MeshStandardMaterial({ color: '#b4b8bd', metalness: .75, roughness: .5 });
const ductM = new THREE.MeshStandardMaterial({ color: '#d6d8da', metalness: .85, roughness: .32 });
const ironM = new THREE.MeshStandardMaterial({ color: '#2d2b2a', metalness: .6, roughness: .55 });
const coalM = new THREE.MeshStandardMaterial({ color: '#3a1a0a', emissive: '#ff5a10', emissiveIntensity: .9, roughness: .9 });
const blackM = M('#151515', { roughness: .5 }), whiteM = M('#ffffff', { roughness: .3 });
const greenGlassM = new THREE.MeshStandardMaterial({ color: '#3fae5a', roughness: .1, metalness: .1, transparent: true, opacity: .85 });
const brownGlassM = new THREE.MeshStandardMaterial({ color: '#6a3a10', roughness: .1, metalness: .1 });
const glassM = new THREE.MeshStandardMaterial({ color: '#eef6ff', transparent: true, opacity: .2, roughness: .05, depthWrite: false, side: THREE.DoubleSide });
const beerM = new THREE.MeshStandardMaterial({ color: '#e8a018', emissive: '#a86400', emissiveIntensity: .35, roughness: .2 });
const sojuM = new THREE.MeshStandardMaterial({ color: '#e8f4f0', transparent: true, opacity: .55, roughness: .05 });
const foamM = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: .9 });
const oilM = new THREE.MeshStandardMaterial({ color: '#f2c030', emissive: '#7a5000', emissiveIntensity: .3, metalness: .2, roughness: .05, transparent: true, opacity: .85 });
const dishM = new THREE.MeshStandardMaterial({ color: '#e2ddd3', roughness: .5 });

// ---------- room ----------
function box(w, h, d, mat, x, y, z, cast = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; }
function room(cx, w = 16, z0 = -7, z1 = 7) {
  const d = z1 - z0, zc = (z0 + z1) / 2;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), floorM); fl.position.set(cx, 0, zc); fl.receiveShadow = true; scene.add(fl);
  box(w, 1.1, .1, panelM, cx, .55, z0, false); box(w, 2.6, .1, plasterM, cx, 2.4, z0 - .02, false);
  for (const s of [-1, 1]) { box(.1, 1.1, d, panelM, cx + s * w / 2, .55, zc, false); box(.1, 2.6, d, plasterM, cx + s * w / 2 + s * .02, 2.4, zc, false); }
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), beamM); ce.position.set(cx, 3.7, zc); scene.add(ce);
}
room(0); room(60, 10, -4, 6);
// yellow paper menus on the back wall + red sign
function textTex(lines, w, h, bg, fg, size) { const [c, g] = cv(w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = `700 ${size}px ${FONT}`; g.fillText(l, w / 2, h * (i + .5) / lines.length); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const menus = [['삼겹살', '15,000원'], ['목살', '15,000원'], ['소주', '5,000원'], ['맥주', '5,000원'], ['공기밥', '1,000원']];
menus.forEach((m, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(.55, .85), new THREE.MeshStandardMaterial({ map: textTex(m, 256, 400, '#f7e27a', '#2a1a10', 64), roughness: .9 }));
  p.position.set(-2.4 + i * .68, 2.3, -6.93); p.rotation.z = (i % 2 ? .03 : -.03); scene.add(p); });
{ const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .7), new THREE.MeshStandardMaterial({ map: textTex(['참숯 삼겹살'], 512, 140, '#c8202a', '#fff6e0', 92), emissive: '#ffffff', emissiveMap: textTex(['참숯 삼겹살'], 512, 140, '#000000', '#fff0c0', 92), emissiveIntensity: .8 }));
  sg.position.set(2.8, 3.0, -6.93); scene.add(sg); }
// lamps (bloom on the bulbs) and lights
const glowM = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffd890', emissiveIntensity: 3 });
function lamp(x, z, y = 2.7) { const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 3.7 - y, 6), blackM); cord.position.y = (3.7 - y) / 2; g.add(cord);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), glowM); g.add(b); return g; }
for (const [x, z] of [[-1.6, 1.2], [3.6, -2.2], [-3.4, -3.2], [60, -1]]) lamp(x, z);
const keyLight = new THREE.PointLight('#ffcf8a', 10, 9, 1.6); keyLight.position.set(-1.2, 2.6, 1.2); scene.add(keyLight);
const coalLight = new THREE.PointLight('#ff7a30', 0, 1.0, 2); scene.add(coalLight);
const hemi = scene.children.find(o => o.isHemisphereLight); hemi.color.set('#ffe9cc'); hemi.groundColor.set('#5a3a28'); hemi.intensity = .8;
sun.color.set('#fff0d8'); sun.intensity = 1.8; fill.intensity = .3;
sun.shadow.radius = 9; sun.shadow.blurSamples = 16; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005;
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); sun.shadow.camera.updateProjectionMatrix();
function lightRoom(cx) { sun.position.set(cx - 3.5, 9, 6); sun.target.position.set(cx, 0, -1); sun.target.updateMatrixWorld(); keyLight.position.set(cx === 60 ? 60.5 : -1.2, 2.6, cx === 60 ? .5 : 1.2); }

// ---------- furniture ----------
const TOP = .72, GR = .21;
function grillTable(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .05, 48), steelM); top.position.y = TOP - .025; top.castShadow = top.receiveShadow = true; g.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.62, .015, 6, 48).rotateX(Math.PI / 2), steelM); rim.position.y = TOP; g.add(rim);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.26, .3, TOP - .05, 24), steelM); body.position.y = (TOP - .05) / 2; body.castShadow = true; g.add(body);
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(GR + .01, GR + .01, .012, 32), ironM); pit.position.y = TOP + .002; g.add(pit);
  return g; }
function duct(x, z, bottom = 1.55) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, 3.7 - bottom - .2, 16, 1, true), ductM); pipe.position.y = (3.7 + bottom + .2) / 2; g.add(pipe);
  for (let y = bottom + .3; y < 3.6; y += .09) { const r = new THREE.Mesh(new THREE.TorusGeometry(.078, .008, 5, 16).rotateX(Math.PI / 2), ductM); r.position.y = y; g.add(r); }
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(.08, .2, .2, 24, 1, true), ductM); hood.position.y = bottom + .1; g.add(hood);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.side = THREE.DoubleSide; } }); return g; }
function stool(x, z) { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.19, .2, .42, 24, 1, true), steelM); b.position.y = .21; b.material = steelM; g.add(b);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .01, 24), ironM); bot.position.y = .005; g.add(bot);
  const lidP = new THREE.Group(); lidP.position.set(0, .43, -.19); g.add(lidP);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .05, 24), M('#b8202a', { roughness: .5 })); lid.position.set(0, 0, .19); lidP.add(lid);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.userData.lid = lidP; return g; }
const mainT = grillTable(0, 0);
const bgTables = [[-2.6, -2.4], [2.6, -2.6], [-3.2, 1.6], [3.4, 1.2]].map(([x, z]) => ({ t: grillTable(x, z), d: duct(x, z), x, z }));
const mainDuct = duct(0, 0);
// pay counter (right) + kitchen counter (x 60)
box(1.8, 1.0, .6, counterM, 5.6, .5, -3.6); box(1.9, .05, .7, counterM, 5.6, 1.02, -3.6);
const till = box(.35, .25, .3, M('#3a3a3c', { roughness: .4 }), 5.5, 1.17, -3.65); box(.3, .03, .2, M('#88c0f0', { emissive: '#4080c0', emissiveIntensity: .6 }), 5.5, 1.3, -3.5, false);
box(3.2, .95, .7, steelM, 60, .475, -2.4); const kFire = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .04, 24), coalM); kFire.position.set(60, .97, -2.4); scene.add(kFire);
const kGrate = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .015, 24), ironM); kGrate.position.set(60, 1.0, -2.4); scene.add(kGrate);

// ---------- people (mannequin rig, Korean style: black hair with bangs, blush, eye highlights) ----------
const skinM = M('#ecc9a2', { roughness: .5 }), pantsM = M('#2f3a4c', { roughness: .8 }), shoeM = M('#f0f0f0', { roughness: .6 }), blushM = new THREE.MeshStandardMaterial({ color: '#f29a9a', transparent: true, opacity: .55, roughness: .8 });
function person(shirt, o = {}) {
  const shirtM = M(shirt, { roughness: .75 }), hairM = M(o.hair || '#141110', { roughness: .7 });
  const root = new THREE.Group(); scene.add(root);
  const pelvis = new THREE.Group(); pelvis.position.y = .95; root.add(pelvis);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .4, 8, 20), shirtM); torso.position.y = .36; torso.scale.z = .78; pelvis.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.085, .025, 8, 20).rotateX(Math.PI / 2), o.apron ? M('#141414') : shirtM); collar.position.y = .66; pelvis.add(collar);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(.25, .27, .22, 16), pantsM); hips.position.y = .02; pelvis.add(hips);
  const head = new THREE.Group(); head.position.y = .76; pelvis.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, .12, 10), skinM); neck.position.y = .02; head.add(neck);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.22, 32, 24), skinM); hd.position.y = .2; hd.scale.set(1, 1.06, .98); head.add(hd);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(.232, 28, 16, 0, Math.PI * 2, 0, Math.PI * .5), hairM); hr.position.set(0, .22, -.01); hr.rotation.x = -.42; head.add(hr);
  if (!o.bald) { const bang = new THREE.Mesh(new THREE.SphereGeometry(.23, 24, 10, -Math.PI * .4, Math.PI * .8, Math.PI * .18, Math.PI * .2), hairM); bang.position.set(0, .2, .005); bang.rotation.y = 0; head.add(bang); }
  if (o.band) { const b = new THREE.Mesh(new THREE.TorusGeometry(.22, .025, 8, 28).rotateX(Math.PI / 2), M('#c8202a')); b.position.set(0, .3, 0); b.rotation.x = -.15; head.add(b); }
  const brows = [];
  for (const s of [-1, 1]) {
    const ey = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), whiteM); ey.position.set(s * .08, .2, .175); ey.scale.set(.9, 1, .55); head.add(ey);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), blackM); p.position.set(s * .08, .195, .2); head.add(p);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(.009, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(s * .08 + .01, .207, .227); head.add(hl);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), blushM); bl.position.set(s * .13, .13, .17); bl.scale.set(1, .55, .3); head.add(bl);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.08, .018, .02), hairM); b.position.set(s * .08, .275, .2); head.add(b); brows.push(b); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 8), M('#7a2a20')); mouth.scale.set(1.2, .3, .4); mouth.position.set(0, .08, .205); head.add(mouth);
  const sh = [], el = [], hand = [], hip = [], kn = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * .31, .58, 0); pelvis.add(a); sh.push(a);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(.072, .22, 6, 12), shirtM); up.position.y = -.16; a.add(up);
    const e = new THREE.Group(); e.position.y = -.33; a.add(e); el.push(e);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(.062, .2, 6, 12), o.long ? shirtM : skinM); fo.position.y = -.14; e.add(fo);
    const h = new THREE.Group(); h.position.y = -.3; e.add(h); hand.push(h);
    const hm = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 12), skinM); h.add(hm);
    const lg = new THREE.Group(); lg.position.set(s * .125, -.02, 0); pelvis.add(lg); hip.push(lg);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.092, .28, 6, 12), pantsM); th.position.y = -.21; lg.add(th);
    const k = new THREE.Group(); k.position.y = -.45; lg.add(k); kn.push(k);
    const shn = new THREE.Mesh(new THREE.CapsuleGeometry(.082, .28, 6, 12), pantsM); shn.position.y = -.2; k.add(shn);
    const ft = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .14, 4, 10).rotateX(Math.PI / 2), shoeM); ft.position.set(0, -.45, .05); k.add(ft); }
  if (o.apron) { const ap = new THREE.Mesh(new THREE.BoxGeometry(.46, .75, .03), M('#b8202a', { roughness: .8 })); ap.position.set(0, -.25, .23); pelvis.add(ap);
    const ap2 = new THREE.Mesh(new THREE.BoxGeometry(.36, .3, .03), M('#b8202a', { roughness: .8 })); ap2.position.set(0, .3, .2); pelvis.add(ap2); }
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  root.userData = { pelvis, head, sh, el, hand, hip, kn, brows, mouth };
  return root;
}
const UP = {
  idle: [0, -.1, 0, .1, -.15, -.15, 0, 0, 0, 0, 0, 0, 0, 0, .3],
  table: [-.3, -.2, -.3, .2, -.95, -.95, 0, 0, 0, 0, .02, .08, 0, 0, .35],
  grill: [-.6, -.15, -1.25, .2, -.5, -.6, 0, 0, 0, 0, .15, .3, 0, 0, .4],
  eat: [-.7, -.15, -2.4, .5, -.6, -2.3, 0, 0, 0, 0, -.05, -.25, 0, .3, 1.0],
  drink: [-.7, -.15, -2.5, .5, -.6, -2.25, 0, 0, 0, 0, -.08, -.38, 0, .1, .7],
  raise: [-.8, -.15, -3.0, .25, -.6, -.15, 0, 0, 0, 0, 0, -.12, 0, .6, 1.0],
  cheer: [-2.9, -.35, -2.9, .35, -.1, -.1, 0, 0, 0, 0, -.05, -.15, 0, .8, 1.3],
  cough: [-1.6, -.2, -1.0, .2, -1.9, -1.5, 0, 0, 0, 0, .25, .3, .2, .9, .25],
  sour: [-.9, -.15, -.9, .15, -.7, -.7, 0, 0, 0, 0, .1, .15, .3, -.9, .15],
  cold: [-1.2, -.6, -1.2, .6, -2.1, -2.1, 0, 0, 0, 0, .1, .1, 0, .9, .2],
  carry: [-1.0, -.1, -1.0, .1, -.85, -.85, 0, 0, 0, 0, 0, 0, 0, 0, .5],
  pay: [0, -.1, -1.55, .05, -.15, -.1, 0, 0, 0, 0, .25, .1, 0, -.6, 1.1],
  point: [0, -.1, -1.6, .45, -.15, -.05, 0, 0, 0, 0, 0, 0, .35, -.6, .8] };
const mixP = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const SIT = p => { const q = p.slice(); q[6] = q[7] = -1.5; q[8] = q[9] = 1.5; return q; };
const WALK = (p, ph, amp = .5) => { const q = p.slice(), s = Math.sin(ph); q[6] = s * amp; q[7] = -s * amp; q[8] = Math.max(0, -s) * amp * 1.4; q[9] = Math.max(0, s) * amp * 1.4;
  if (p === UP.idle) { q[0] = -s * amp * .7; q[2] = s * amp * .7; } return q; };
function applyPose(c, p) { const u = c.userData;
  u.sh[0].rotation.set(p[0], 0, p[1]); u.sh[1].rotation.set(p[2], 0, p[3]); u.el[0].rotation.x = p[4]; u.el[1].rotation.x = p[5];
  u.pelvis.rotation.x = p[10]; u.hip[0].rotation.x = p[6] - p[10]; u.hip[1].rotation.x = p[7] - p[10]; u.kn[0].rotation.x = p[8]; u.kn[1].rotation.x = p[9];
  u.head.rotation.set(p[11], p[12], 0); u.brows.forEach((b, i) => { const s = i ? 1 : -1; b.rotation.z = -s * p[13] * .45; b.position.y = .275 + p[13] * .02; });
  u.mouth.scale.set(1.2 - p[14] * .25, .3 + p[14] * .55, .4); u.pelvis.position.y = p[6] < -1 ? .55 : .95; }
const handPos = (c, i = 1, off = V(0, -.06, .05)) => { c.updateMatrixWorld(true); return c.userData.hand[i].localToWorld(off.clone()); };
const face = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

const du = person('#3f8f6a'), friend = person('#e08a3a', { hair: '#3a2416' }), staff = person('#1c1c1c', { apron: true, band: true, long: true });
const SEAT_DU = V(.36, 0, -.74), SEAT_FR = V(-.5, 0, -.66);
const stoolDu = stool(SEAT_DU.x, SEAT_DU.z - .02), stoolFr = stool(SEAT_FR.x + .02, SEAT_FR.z);
const bgPeople = bgTables.flatMap((b, j) => [0, 1].map(i => { const a = i * Math.PI + j * .8 + .4, p = person(['#3a7fb0', '#c8572e', '#8a3a8f', '#d6a43a', '#e6e0d0', '#a83a3a', '#3a8a8a', '#6a6a6a'][(j * 2 + i) % 8], { hair: i ? '#2a1a10' : '#141110' });
  const seat = V(b.x + Math.sin(a) * .8, 0, b.z + Math.cos(a) * .8); stool(seat.x, seat.z); p.userData.seat = seat; p.userData.ry = face(seat, V(b.x, 0, b.z)); p.userData.ph = j + i; return p; }));

// ---------- food, drinks, props ----------
// grill plate: dome-ish slanted pan with a drain hole, swappable
function plate(dark = false) { const g = new THREE.Group(); scene.add(g);
  const m = new THREE.MeshStandardMaterial({ color: dark ? '#141210' : '#5a5856', metalness: .7, roughness: .4 });
  const p = new THREE.Mesh(new THREE.CylinderGeometry(GR, GR, .02, 40), m); p.castShadow = p.receiveShadow = true; g.add(p);
  for (let i = -3; i <= 3; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(GR * 1.8 * Math.cos(Math.asin(i / 4)), .012, .012), m); r.position.set(0, .014, i * GR / 4); g.add(r); }
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .022, 16), blackM); hole.position.set(GR - .045, .002, 0); g.add(hole);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .07, 16), steelM); cup.position.set(GR + .02, -.06, 0); g.add(cup);
  g.userData = { m, hole, cup }; return g; }
const plateA = plate(), plateB = plate();
const coals = new THREE.Mesh(new THREE.CylinderGeometry(GR - .01, GR - .03, .03, 24), coalM); coals.position.set(0, TOP - .01, 0); scene.add(coals);
const oil = new THREE.Mesh(new THREE.CylinderGeometry(GR * .8, GR * .8, .006, 32), oilM); scene.add(oil);
// pork belly strips: layered pink/white canvas
const porkTex = (() => { const [c, g] = cv(64, 256); const cols = ['#f0b8b0', '#fff2ea', '#e89a90', '#fff6f0', '#f2a8a0']; let y = 0; let i = 0;
  while (y < 256) { const h = 18 + (i * 13) % 26; g.fillStyle = cols[i % cols.length]; g.fillRect(0, y, 64, h); y += h; i++; } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const porkM = new THREE.MeshStandardMaterial({ map: porkTex, roughness: .5 }), cookedM = new THREE.MeshStandardMaterial({ map: porkTex, color: '#c88a50', roughness: .4 }), burntM = new THREE.MeshStandardMaterial({ map: porkTex, color: '#3a2618', roughness: .7 });
const strips = [-1, 0, 1].map(i => { const g = new THREE.Group(); scene.add(g); const pieces = [];
  for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .089), porkM); p.position.z = (k - 1.5) * .088; p.castShadow = true; g.add(p); pieces.push(p); }
  g.userData = { i, pieces }; return g; });
const dishMeat = new THREE.Group(); scene.add(dishMeat);
{ const d = new THREE.Mesh(new THREE.CylinderGeometry(.16, .13, .03, 28), dishM); dishMeat.add(d);
  for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .26), cookedM); p.position.set((k - 1) * .065, .03, 0); p.castShadow = true; dishMeat.add(p); } }
// banchan: kimchi (red), bean sprouts (cream), green onion salad (green)
function banchan(kind) { const g = new THREE.Group(); scene.add(g);
  const d = new THREE.Mesh(new THREE.CylinderGeometry(.08, .065, .025, 24), dishM); d.castShadow = true; g.add(d);
  const food = new THREE.Group(); food.position.y = .015; g.add(food);
  const col = kind === 'kimchi' ? ['#d8402a', '#e8603a', '#f0d8a0'] : kind === 'kong' ? ['#f4ecc8', '#e8dca0', '#f8f4e0'] : ['#5aa83a', '#7cc04a', '#d8402a'];
  for (let k = 0; k < 18; k++) { const a = k * 2.4, r = .01 + (k % 4) * .013; const geo = kind === 'kong' ? new THREE.CylinderGeometry(.008, .008, .09, 6) : kind === 'pa' ? new THREE.BoxGeometry(.012, .008, .09) : new THREE.BoxGeometry(.045, .02, .035);
    const m = new THREE.Mesh(geo, M(col[k % 3], { roughness: .6 })); m.position.set(Math.cos(a) * r, .008 + (k % 3) * .006, Math.sin(a) * r); m.rotation.set(kind === 'kong' ? 1.3 : 0, a, kind === 'kong' ? .3 : 0); food.add(m); }
  g.userData.food = food; return g; }
const BAN = [['kimchi', V(-.36, TOP, .22)], ['kong', V(-.06, TOP, .4)], ['pa', V(.26, TOP, .3)]].map(([k, p]) => { const b = banchan(k); b.position.copy(p); b.position.y += .012; b.userData.home = p.clone(); return b; });
// soju bottle, beer bottle, shot glass, beer glass, spoon, scissors, tongs, jacket
function bottle(m, h = .23, label = '#ffffff', txt = '') { const g = new THREE.Group(); scene.add(g);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, h * .62, 20), m); b.position.y = h * .31; g.add(b);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.014, .034, h * .2, 20), m); s.position.y = h * .72; g.add(s);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(.013, .014, h * .16, 12), m); n.position.y = h * .9; g.add(n);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .015, 12), M(txt ? '#e8e8e8' : '#c8a030', { metalness: .6 })); c.position.y = h + .005; g.add(c);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(.0345, .0345, h * .25, 20, 1, true), new THREE.MeshStandardMaterial({ map: textTex([txt], 256, 96, label, '#1a5a2a', 60), roughness: .5 })); l.position.y = h * .3; l.rotation.y = -Math.PI / 2; g.add(l);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
const soju = bottle(greenGlassM, .23, '#f4fff4', '소주'), beerB = bottle(brownGlassM, .3, '#f4c030', '맥주');
function cup(r, h, liquid) { const g = new THREE.Group(); scene.add(g);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .85, h, 20, 1, true).translate(0, h / 2, 0), glassM); g.add(s);
  const lq = new THREE.Mesh(new THREE.CylinderGeometry(r * .9, r * .8, 1, 20).translate(0, .5, 0), liquid); lq.position.y = .004; g.add(lq);
  const fm = new THREE.Mesh(new THREE.CylinderGeometry(r * .92, r * .9, 1, 20).translate(0, .5, 0), foamM); g.add(fm);
  g.set = (k, foam) => { const lh = Math.max(.001, h * .9 * k); lq.scale.y = lh; lq.visible = k > .01; fm.position.y = .004 + lh; fm.scale.y = Math.max(.001, foam); fm.visible = foam > .002; };
  g.set(0, 0); return g; }
const shot = cup(.022, .05, sojuM), bglass = cup(.04, .12, beerM);
const spoon = new THREE.Group(); scene.add(spoon); { const h = new THREE.Mesh(new THREE.BoxGeometry(.012, .004, .2), steelM); h.position.z = -.06; spoon.add(h); const b = new THREE.Mesh(new THREE.SphereGeometry(.025, 12, 8), steelM); b.scale.set(1, .25, 1.3); b.position.z = .06; spoon.add(b); }
const scissors = new THREE.Group(); scene.add(scissors);
{ const bladeM = steelM; for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.rotation.y = s * .2; scissors.add(arm); arm.userData.s = s;
    const bl = new THREE.Mesh(new THREE.BoxGeometry(.012, .004, .16), bladeM); bl.position.z = .08; arm.add(bl);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(.028, .007, 6, 16).rotateX(Math.PI / 2), blackM); hd.position.set(s * .02, 0, -.045); arm.add(hd); }
  scissors.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
const tongs = new THREE.Group(); scene.add(tongs); for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(.01, .004, .24), steelM); a.position.x = s * .012; a.rotation.y = s * .04; tongs.add(a); }
const jacket = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .2, 6, 12), M('#2a4a7a', { roughness: .8 })); jacket.castShadow = true; scene.add(jacket);
const cards = [0, 1].map(i => { const c = new THREE.Mesh(new THREE.BoxGeometry(.09, .004, .055), M(i ? '#d8b040' : '#3a6ad8', { metalness: .3, roughness: .3 })); scene.add(c); return c; });

// smoke puffs (soft sprites)
const puffTex = (() => { const [c, g] = cv(128, 128); const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(235,235,235,.9)'); r.addColorStop(.6, 'rgba(210,210,210,.45)'); r.addColorStop(1, 'rgba(200,200,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const puffs = Array.from({ length: 70 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { ph: rr(0, 1), x: rr(-4.5, 4.5), z: rr(-4, 3), y: rr(1.2, 3.4), sz: rr(.8, 1.8), i }; scene.add(s); return s; });
const steam = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData.ph = rr(0, 1); scene.add(s); return s; });
// stink lines (wavy green tubes) over the jacket
const stinkM = new THREE.MeshBasicMaterial({ color: '#9ad050', transparent: true, opacity: .9 });
const stink = [0, 1, 2].map(i => { const pts = []; for (let k = 0; k <= 12; k++) pts.push(V(Math.sin(k * .9 + i) * .03, k * .025, 0)); const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .006, 5), stinkM); scene.add(m); return m; });

// ---------- labels (sprites, Jua font) ----------
function label(text, w = 1, col = '#ffd21f') {
  const [c0, g0] = cv(8, 8); g0.font = `700 150px ${FONT}`; const tw_ = g0.measureText(text).width, cw = Math.ceil(tw_ + 60);
  const [c, g] = cv(cw, 256); g.font = `700 150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, cw / 2, 138); g.fillStyle = col; g.fillText(text, cw / 2, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.userData = { w, aspect: cw / 256 }; s.visible = false; return s; }
const overlay = new THREE.Scene();
const LB = { gogi: label('고기구이'), cold: label('다 식음', 1, '#8fd8ff'), bulpan: label('불판'), smoke: label('콜록콜록', 1, '#d0d0d0'), duct: label('연통'),
  long: label('30cm', 1), gawi: label('가위'), oil: label('기름', 1, '#ffd21f'), tilt: label('기울기', 1), bitter: label('써!', 1, '#ff6a3a'), newp: label('새 불판', 1, '#7cf07c'),
  greasy: label('느끼해', 1, '#c8e060'), kimchi: label('김치', 1, '#ff7a5a'), kong: label('콩나물', 1, '#fff3c0'), pa: label('파절이', 1, '#9ae070'), free: label('공짜!', 1, '#7cf07c'),
  p16: label('16도', 1, '#9af0b0'), p5: label('5도', 1, '#ffd21f'), somaek: label('소맥'), smell: label('냄새', 1, '#9ad050'), box: label('옷 보관함'),
  pay1: label('내가 낼게!', 1, '#ffffff'), pay2: label('아니야 내가!', 1, '#ffd21f') };
for (const s of Object.values(LB)) overlay.add(s);
function lab(s, k, x, y, z, w) { s.visible = k > .01; if (!s.visible) return; const h = (w ?? s.userData.w) / 4 * Math.max(k, .001); s.position.set(x, y, z); s.scale.set(h * s.userData.aspect, h, 1); }

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(42, W / H, .06, 120);
const CUT = .001;
const KEYS = [
  [0, V(60.9, 1.65, -.9), V(60, 1.0, -2.4)], [tw.g1 - .05, V(60.7, 1.55, -1.1), V(60, 1.0, -2.4)],
  [tw.g1 + CUT, V(2.2, 1.8, 3.0), V(-.2, 1.0, -.2), 1], [tw.s1, V(1.9, 1.7, 2.6), V(0, 1.0, -.3)],
  [tw.s1 + CUT, V(.6, 1.5, 1.25), V(0, .82, -.15), 1], [tw.g2, V(.55, 1.45, 1.15), V(0, .82, -.15)],
  [tw.g2 + CUT, V(.4, 2.5, 5.6), V(0, 1.4, -2), 1], [tw.s2, V(.3, 2.4, 5.2), V(0, 1.4, -2)],
  [tw.s2 + CUT, V(.9, 1.35, 2.4), V(0, 1.35, -.2), 1], [tw.g3, V(.75, 1.25, 2.1), V(0, 1.2, -.2)],
  [tw.g3 + CUT, V(.2, 1.4, 1.05), V(.2, .95, -.4), 1], [tw.s3, V(.2, 1.37, 1.0), V(.2, .95, -.4)],
  [tw.s3 + CUT, V(-.5, 1.3, .85), V(0, .76, 0), 1], [tw.g4, V(-.46, 1.27, .8), V(0, .76, 0)],
  [tw.g4 + CUT, V(.3, 1.3, .8), V(0, .75, 0), 1], [tw.s4, V(.28, 1.27, .76), V(0, .75, 0)],
  [tw.s4 + CUT, V(.15, 1.0, .9), V(.05, .76, 0), 1], [tw.g5, V(.14, .98, .85), V(.05, .76, 0)],
  [tw.g5 + CUT, V(.15, 1.38, 1.15), V(.2, .95, -.4), 1], [tw.s5, V(.15, 1.35, 1.08), V(.2, .95, -.4)],
  [tw.s5 + CUT, V(-1.4, 1.65, 2.2), V(.1, 1.0, -.1), 1], [tw.g6, V(-1.25, 1.6, 2.0), V(.1, 1.0, -.1)],
  [tw.g6 + CUT, V(.05, 1.45, 1.35), V(.3, 1.15, -.7), 1], [tw.s6, V(.05, 1.42, 1.25), V(.3, 1.15, -.7)],
  [tw.s6 + CUT, V(-.05, 1.72, 1.45), V(-.05, .74, .2), 1], [tw.g7, V(-.05, 1.68, 1.38), V(-.05, .74, .2)],
  [tw.g7 + CUT, V(.85, 1.25, .95), V(.25, .88, -.05), 1], [tw.s7, V(.8, 1.22, .9), V(.25, .88, -.05)],
  [tw.s7 + CUT, V(.6, 1.12, .78), V(.13, .86, .1), 1], [tw.g8, V(.57, 1.1, .74), V(.13, .86, .1)],
  [tw.g8 + CUT, V(.1, 1.4, 1.45), V(.25, 1.05, -.7), 1], [tw.s8, V(.1, 1.37, 1.35), V(.25, 1.05, -.7)],
  [tw.s8 + CUT, V(1.55, 1.35, .45), V(.4, .45, -.76), 1], [tw.chukha, V(1.5, 1.32, .4), V(.4, .45, -.76)],
  [tw.chukha + CUT, V(.6, 2.6, 5.6), V(0, 1.1, -1.8), 1], [tw.g9, V(.4, 2.4, 5.0), V(0, 1.1, -1.8)],
  [tw.g9 + CUT, V(5.15, 1.8, -5.3), V(5.25, 1.35, -2.6), 1], [END, V(5.15, 1.78, -5.15), V(5.25, 1.35, -2.6)]];
KEYS.sort((a, b) => a[0] - b[0]);
for (let i = KEYS.length - 1; i > 0; i--) if (KEYS[i][3] && KEYS[i][0] - KEYS[i - 1][0] > 2 * CUT) KEYS.splice(i, 0, [KEYS[i][0] - CUT, KEYS[i - 1][1], KEYS[i - 1][2]]);
const LOOK = new THREE.Vector3();
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); LOOK.lerpVectors(l0, l1, k); camera.lookAt(LOOK);
}

// ---------- the timeline ----------
function put(o, p, ry = 0) { o.position.copy(p); o.rotation.set(0, ry, 0); }
const MID = V(0, 0, 0);
function update(t) {
  const set = t < tw.g1 ? 60 : 0; lightRoom(set);
  const grillOn = t > tw.hangaunde - .1;

  // ---- people at the main table ----
  let dp = SIT(UP.table);
  if (t >= tw.g1 && t < tw.s1) dp = SIT(mixP(UP.table, UP.cold, ease(t, tw.sigeo - .3, tw.sigeo)));
  else if (t >= tw.s1 && t < tw.g2) dp = SIT(mixP(UP.table, UP.grill, ease(t, tw.sonnim - .3, tw.sonnim)));
  else if (t >= tw.g2 && t < tw.s2) dp = SIT(mixP(UP.table, UP.cough, ease(t, tw.yeongi1 - .2, tw.kkwak) * (.75 + .25 * Math.sin(t * 14))));
  else if (t >= tw.g3 && t < tw.s3) dp = SIT(mixP(UP.table, UP.eat, ease(t, tw.samgyeop, tw.gireoseo)));
  else if (t >= tw.g5 && t < tw.s5) dp = SIT(mixP(UP.table, UP.sour, ease(t, tw.tamyeon, tw.sseojyeo)));
  else if (t >= tw.g6 && t < tw.s6) dp = SIT(mixP(UP.table, UP.sour, ease(t, tw.gogiman, tw.neukki)));
  else if (t >= tw.g7 && t < tw.s7) dp = SIT(t < tw.maekju ? mixP(UP.table, UP.sour, ease(t, tw.soju, tw.sseugo)) : mixP(UP.table, UP.drink, .4));
  else if (t >= tw.s7 && t < tw.g8) dp = SIT(t > tw.hwak ? mixP(UP.table, UP.cheer, ease(t, tw.hwak, tw.hwak + .3)) : UP.table);
  else if (t >= tw.g8 && t < tw.s8) dp = SIT(mixP(UP.table, UP.cough, ease(t, tw.otheseo, tw.naemsae) * .6));
  else if (t >= tw.chukha && t < tw.g9) dp = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6)));
  let duP = SEAT_DU.clone(), duR = face(SEAT_DU, MID), frP = SEAT_FR.clone(), frR = face(SEAT_FR, MID), fp = SIT(UP.table);
  if (t >= tw.s8 && t < tw.chukha) { duP = SEAT_DU.clone().add(V(.42, 0, -.12)); duR = -1.4; dp = mixP(UP.idle, UP.point, .0); dp[0] = -.8; dp[4] = -.4; dp[10] = .35; dp[11] = .5; }
  if (t >= tw.g7 && t < tw.g8) fp = SIT(mixP(UP.table, UP.cheer, t > tw.hwak ? ease(t, tw.hwak, tw.hwak + .3) : 0));
  if (t >= tw.chukha) fp = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6 + 1)));
  if (t >= tw.g9) {   // fight to pay at the counter
    const k = ease(t, tw.g9 - .05, tw.g9 + .3), j = Math.sin(t * 9);
    duP = V(4.95 + .06 * j, 0, -2.75); duR = face(duP, V(5.5, 0, -3.6)); dp = mixP(UP.idle, UP.pay, k); dp[10] = .25 + .05 * j;
    frP = V(5.6 - .06 * j, 0, -2.6); frR = face(frP, V(5.5, 0, -3.6)); fp = mixP(UP.idle, UP.pay, k); fp[2] = -1.5 - .15 * j; fp[10] = .3 - .05 * j; fp[12] = -.2; }
  put(du, duP, duR); applyPose(du, dp); put(friend, frP, frR); applyPose(friend, fp);
  bgPeople.forEach((p, i) => { put(p, p.userData.seat, p.userData.ry); let q = SIT(UP.table);
    if (t >= tw.g2 && t < tw.s2) q = SIT(mixP(UP.table, UP.cough, ease(t, tw.yeongi1, tw.kkwak) * (.75 + .25 * Math.sin(t * 13 + i))));
    else if (t >= tw.chukha && t < tw.g9) q = SIT(mixP(UP.table, UP.cheer, .5 + .5 * Math.sin(t * 6 + i)));
    else q = SIT(mixP(UP.table, UP.grill, .5 + .5 * Math.sin(t * 1.3 + p.userData.ph * 2))); applyPose(p, q); });

  // ---- staff ----
  let sp = V(59.25, 0, -1.85), sr = face(V(59.25, 0, -1.85), V(60, 0, -2.4)), spose = mixP(UP.idle, UP.grill, .8), walking = false;
  const plateCarry = t >= tw.g1 && t < tw.s1;
  if (plateCarry) { const k = ease(t, tw.g1, tw.sigeo - .2); sp = V(lerp(-3.5, .55, k), 0, lerp(3.5, .75, k)); sr = face(V(-3.5, 0, 3.5), V(.55, 0, .75)); walking = k > 0 && k < 1; spose = UP.carry; }
  else if (t >= tw.s1 && t < tw.s5) { sp = V(-5, 0, 4); }
  else if (t >= tw.s5 && t < tw.g6) { const k = ease(t, tw.jigwoni - .3, tw.bulpan3); sp = V(lerp(-2.2, -.62, k), 0, lerp(1.6, .5, k)); sr = face(V(-2.2, 0, 1.6), V(-.62, 0, .5)); walking = k > 0 && k < 1;
    if (k >= 1) sr = face(sp, MID); spose = k < 1 ? UP.carry : mixP(UP.carry, UP.grill, ease(t, tw.bulpan3, tw.sae)); }
  else if (t >= tw.s6 && t < tw.g7) { sp = V(-.75, 0, .55); sr = face(sp, MID); spose = mixP(UP.idle, UP.grill, win(t, tw.jwo - .5, tw.g7, .2) + win(t, tw.banchani, tw.kimchi + .2, .2)); }
  else if (t >= tw.chukha && t < tw.g9) { sp = V(-1.2, 0, 1.4); sr = face(sp, MID); spose = mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 6)); }
  else if (t >= tw.g9) { sp = V(6.25, 0, -4.15); sr = -.5; spose = mixP(UP.idle, UP.point, .0); spose[13] = .9; spose[14] = .2; spose[0] = -.6; spose[2] = -.6; spose[4] = -1.4; spose[5] = -1.4; }
  else if (t >= tw.s1) sp = V(-5, 0, 4);
  if (walking) spose = WALK(spose, t * 10, .5);
  put(staff, sp, sr); applyPose(staff, spose);

  // ---- kitchen meat (first line) / plate carried to the table ----
  dishMeat.visible = t < tw.s1; strips.forEach(s => s.visible = false);
  if (t < tw.g1) { dishMeat.position.set(60, 1.03, -2.4); dishMeat.children[0].visible = false; }
  else { dishMeat.children[0].visible = true; dishMeat.position.copy(plateCarry && t < tw.sigeo - .2 ? handPos(staff, 1, V(-.15, -.05, .1)) : V(.05, TOP + .016, .3)); dishMeat.rotation.set(0, 0, 0); }
  steam.forEach((s, i) => { const u = s.userData, ph = (t * .6 + u.ph) % 1; const base = dishMeat.position; const hot = t < tw.g1 ? 1 : 1 - ease(t, tw.g1 + .8, tw.sigeo);
    s.position.set(base.x + Math.sin(i * 2.3) * .06, base.y + .05 + ph * .35, base.z + Math.cos(i * 1.7) * .06); s.scale.setScalar(.06 + ph * .14); s.material.opacity = (1 - ph) * .6 * hot; s.visible = dishMeat.visible && hot > .01; });

  // ---- grill: table pit, coals, plate A (gets dark), plate B (new) ----
  const gk = pop(t, tw.hangaunde - .1); coals.visible = grillOn; coalLight.intensity = grillOn ? .15 * gk : 0; coalLight.position.set(0, TOP + .15, 0);
  const tilt = ease(t, tw.biseu - .1, tw.biseu + .4) * .14;
  const dark = ease(t, tw.kkamake - .2, tw.tamyeon + .1);
  plateA.userData.m.color.set('#5a5856').lerp(new THREE.Color('#121010'), dark);
  const swap = ease(t, tw.bulpan3 - .1, tw.sae + .1);
  plateA.visible = grillOn && swap < .999; plateA.scale.setScalar(Math.max(gk, .001));
  plateA.position.set(0, TOP + .03 + swap * .5, 0); plateA.rotation.set(0, 0, -tilt);
  if (swap > 0 && swap < 1) { plateA.position.copy(V(lerp(0, -.5, swap), TOP + .03 + Math.sin(swap * Math.PI) * .25, lerp(0, .4, swap))); }
  plateB.visible = t > tw.bulpan3 - .1; plateB.rotation.set(0, 0, -tilt);
  plateB.position.copy(t < tw.sae + .1 ? V(lerp(-.55, 0, swap), TOP + .03 + Math.sin(swap * Math.PI) * .2, lerp(.45, 0, swap)) : V(0, TOP + .03, 0));
  // oil pool: grows, then drains to the hole once the plate is slanted
  const oilK = ease(t, tw.gireumi - .1, tw.goyeoseo + .3) * (1 - ease(t, tw.gumeong - .1, tw.ppajiji + .2));
  oil.visible = t > tw.g4 - .1 && oilK > .01 && t < tw.g5; oil.scale.set(oilK, 1, oilK); oil.position.set(.03 + .1 * ease(t, tw.biseu, tw.gumeong), TOP + .045 - tilt * .1, 0); oil.rotation.set(0, 0, -tilt);
  plateA.userData.cup.visible = t > tw.biseu; plateB.userData.cup.visible = true;
  // pork strips on the plate: raw -> cooked, long -> cut in 4, burnt on the dark plate
  const meatOn = t > tw.gupneun - .3 && t < tw.chukha;
  const cut = ease(t, tw.jalla - .1, tw.jalla + .6);
  strips.forEach((s, i) => { s.visible = meatOn && !(t > tw.bulpan3 - .1 && t < tw.sae + .2); const pl = t > tw.sae ? plateB : plateA;
    s.position.set(pl.position.x + (i - 1) * .075, pl.position.y + .025 + (i - 1) * tilt * .075, pl.position.z); s.rotation.set(0, 0, -tilt);
    s.userData.pieces.forEach((p, k) => { p.position.z = (k - 1.5) * lerp(.088, .105, cut); p.position.x = cut > 0 ? (k % 2 ? .006 : -.006) * cut : 0;
      const cook = ease(t, tw.gupneun, tw.gupneun + 2.5); p.material = t > tw.tamyeon && t < tw.sae ? burntM : cook > .5 ? cookedM : porkM; }); });
  // scissors + tongs
  scissors.visible = t > tw.gawiro - .2 && t < tw.g4; const snip = Math.abs(Math.sin((t - tw.jalla) * 12)) * .35;
  scissors.position.set(lerp(.18, -.05, ease(t, tw.jalla - .1, tw.jalla + .8)), TOP + .1, .02); scissors.rotation.set(0, Math.PI / 2, -.3);
  scissors.children.forEach(a => a.rotation.y = a.userData.s * (.05 + snip * (t > tw.jalla - .1 && t < tw.kal ? 1 : 0)));
  tongs.visible = t > tw.sonnim - .2 && t < tw.g2 + .5; tongs.position.copy(handPos(du, 1, V(0, -.04, .12))); tongs.rotation.set(-.6, 0, 0);
  // smoke: fills the room, then gets sucked into the ducts
  const fillK = ease(t, tw.g2, tw.kkwak + .3) * (1 - ease(t, tw.yeontong, tw.ppara + .6));
  const suck = ease(t, tw.yeongi2 - .2, tw.ppara + .6);
  puffs.forEach(s => { const u = s.userData; const k = fillK; s.visible = k > .01 && t < tw.g3;
    const tx = bgTables[u.i % 4] && u.i % 5 ? bgTables[u.i % 4] : { x: 0, z: 0 };
    const x = lerp(u.x, tx.x, suck), z = lerp(u.z, tx.z, suck), y = lerp(u.y, 3.3, suck) + Math.sin(t * .7 + u.ph * 6) * .1;
    s.position.set(x + Math.sin(t * .4 + u.ph * 9) * .2, y, z); s.scale.setScalar(u.sz * (1 - suck * .7)); s.material.opacity = .7 * k; });
  // ducts drop from the ceiling
  const dk = ease(t, tw.tablemada - .1, tw.dara + .2);
  [mainDuct, ...bgTables.map(b => b.d)].forEach((d, i) => { d.visible = dk > 0; d.position.y = lerp(2.3, 0, ease(t, tw.tablemada - .1 + i * .08, tw.dara + .1 + i * .08)); });
  // banchan + refill
  BAN.forEach((b, i) => { const a = [tw.kimchi, tw.kong, tw.pa][i]; const k = pop(t, a - .1); b.visible = t > a - .1; b.scale.setScalar(Math.max(k * 1.5, .001));
    const eaten = ease(t, tw.pa + .3, tw.gongjja) * (1 - ease(t, tw.gongjja + .1, tw.jwo + .3)); b.userData.food.scale.setScalar(Math.max(1 - eaten, .001)); });
  // soju, beer, somaek
  soju.visible = t > tw.soju - .15; soju.position.set(.3, TOP, -.18); soju.scale.setScalar(Math.max(pop(t, tw.soju - .15), .001));
  beerB.visible = t > tw.maekju - .15; beerB.position.set(.38, TOP, .02); beerB.scale.setScalar(Math.max(pop(t, tw.maekju - .15), .001));
  const pour = ease(t, tw.seokkeo - .2, tw.seokkeo + .4);
  shot.visible = t > tw.soju - .15; bglass.visible = t > tw.maekju - .15;
  shot.position.set(lerp(.18, .14, pour), TOP + pour * .2, lerp(-.08, .1, pour)); shot.rotation.set(0, 0, pour * 2.2); shot.set(1 - pour, 0);
  bglass.position.set(.12, TOP, .12); const foam = t < tw.tak ? .01 : lerp(.01, .11, ease(t, tw.tak, tw.hwak + .3));
  bglass.set(t < tw.maekju ? 0 : .7 + pour * .15, foam);
  if (t > tw.chukha) { bglass.set(.6, .02); }
  spoon.visible = t > tw.sutgarak - .2 && t < tw.g8; const tap = t > tw.tak - .25 && t < tw.tak + .05 ? 1 - ramp(t, tw.tak - .25, tw.tak) : 0;
  spoon.position.set(.12 + .02, TOP + .2 + tap * .08, .12 - .17); spoon.rotation.set(.2 - tap * .5, 0, 0);
  // jacket: smells, then goes into the stool
  const lid = ease(t, tw.ttukkeong - .1, tw.yeolmyeon + .2) * (1 - ease(t, tw.tong + .3, tw.chukha - .1));
  stoolDu.userData.lid.rotation.x = -lid * 1.9;
  const inK = ease(t, tw.yeolmyeon + .1, tw.tong + .2);
  jacket.visible = t > tw.g8 - .1 && t < tw.chukha - .1;
  jacket.position.copy(t < tw.s8 ? SEAT_DU.clone().add(V(-.3, .95, -.12)) : V(lerp(SEAT_DU.x + .3, SEAT_DU.x, inK), lerp(.8, .25, inK), lerp(SEAT_DU.z - .05, SEAT_DU.z - .02, inK))); jacket.rotation.set(Math.PI / 2 * (t < tw.s8 ? .2 : 1), 0, .3);
  stink.forEach((s, i) => { s.visible = t > tw.naemsae - .2 && t < tw.s8; s.position.set(jacket.position.x + (i - 1) * .07, jacket.position.y + .12 + ((t * .5 + i * .33) % 1) * .1, jacket.position.z); });
  // cards at the pay counter
  cards.forEach((c, i) => { c.visible = t > tw.g9; if (c.visible) { c.position.copy(handPos(i ? friend : du, 1, V(0, -.06, .06))); c.rotation.set(0, i ? frR : duR, 0); } });
  kFire.visible = kGrate.visible = true;

  // ---- labels ----
  Object.values(LB).forEach(s => s.visible = false);
  lab(LB.gogi, win(t, tw.gogi1 - .1, tw.g1, .15) * pop(t, tw.gogi1 - .1), 60, 1.32, -2.4, .7);
  lab(LB.cold, win(t, tw.sigeo - .1, tw.s1, .15) * pop(t, tw.sigeo - .1), .05, 1.05, .3, .5);
  lab(LB.bulpan, win(t, tw.bulpan1 - .1, tw.g2, .15) * pop(t, tw.bulpan1 - .1), 0, 1.02, 0, .38);
  lab(LB.smoke, win(t, tw.kkwak - .1, tw.s2, .15) * pop(t, tw.kkwak - .1), 0, 2.5, -.8, 1.4);
  lab(LB.duct, win(t, tw.yeontong - .05, tw.g3, .15) * pop(t, tw.yeontong - .05), .25, 1.85, 0, .5);
  lab(LB.long, win(t, tw.gireoseo - .1, tw.s3, .15) * pop(t, tw.gireoseo - .1), 0, .92, 0, .2);
  lab(LB.gawi, win(t, tw.gawiga - .1, tw.g4, .15) * pop(t, tw.gawiga - .1), 0, .92, .02, .2);
  lab(LB.oil, win(t, tw.gireumi - .1, tw.s4, .15) * pop(t, tw.gireumi - .1), 0, .86, .02, .14);
  lab(LB.tilt, win(t, tw.biseu - .05, tw.g5, .15) * pop(t, tw.biseu - .05), .02, .86, 0, .13);
  lab(LB.bitter, win(t, tw.sseojyeo - .1, tw.s5, .15) * pop(t, tw.sseojyeo - .1), SEAT_DU.x - .2, 1.85, SEAT_DU.z, .45);
  lab(LB.newp, win(t, tw.sae - .05, tw.g6, .15) * pop(t, tw.sae - .05), 0, 1.0, 0, .32);
  lab(LB.greasy, win(t, tw.neukki - .1, tw.s6, .15) * pop(t, tw.neukki - .1), SEAT_DU.x - .1, 1.85, SEAT_DU.z, .45);
  lab(LB.kimchi, win(t, tw.kimchi - .05, tw.g7, .15) * pop(t, tw.kimchi - .05), -.36, .95, .22, .45);
  lab(LB.kong, win(t, tw.kong - .05, tw.g7, .15) * pop(t, tw.kong - .05), -.06, .95, .4, .45);
  lab(LB.pa, win(t, tw.pa - .05, tw.g7, .15) * pop(t, tw.pa - .05), .26, .95, .3, .45);
  lab(LB.free, win(t, tw.gongjja - .05, tw.g7, .15) * pop(t, tw.gongjja - .05), -.05, 1.0, .3, .3);
  lab(LB.p16, win(t, tw.soju - .05, tw.s7, .15) * pop(t, tw.soju - .05), .3, 1.04, -.18, .3);
  lab(LB.p5, win(t, tw.maekju - .05, tw.s7, .15) * pop(t, tw.maekju - .05), .38, 1.12, .02, .3);
  lab(LB.somaek, win(t, tw.somaek - .05, tw.g8, .15) * pop(t, tw.somaek - .05), .12, 1.0, .12, .17);
  lab(LB.smell, win(t, tw.naemsae - .1, tw.s8, .15) * pop(t, tw.naemsae - .1), jacket.position.x, jacket.position.y + .42, jacket.position.z, .4);
  lab(LB.box, win(t, tw.tong - .1, tw.chukha, .15) * pop(t, tw.tong - .1), SEAT_DU.x, .82, SEAT_DU.z, .3);
  lab(LB.pay1, win(t, tw.gyesan - .1, END + 1, .15) * pop(t, tw.gyesan - .1), 4.95, 2.0, -2.75, .45);
  lab(LB.pay2, win(t, tw.seoro - .1, END + 1, .15) * pop(t, tw.seoro - .1), 5.55, 1.98, -2.6, .45);

  placeCamera(t);
  bokeh.uniforms.focus.value = camera.position.distanceTo(LOOK);
}

// ---------- render: MSAA -> depth of field -> bloom -> tone map -> warm grade + vignette; labels on top ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 2, aperture: +(Q.get('ap') ?? .0035), maxblur: +(Q.get('blur') ?? .006) });
if (Q.get('dof') !== '0') composer.addPass(bokeh);
if (Q.get('bloom') !== '0') composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), .28, .5, 1.05));
composer.addPass(new OutputPass());
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
      col = mix(col, col * vec3(1.06, 1.0, .9), .7);                           // warm
      col = (col - .5) * 1.04 + .5 + .015;                                      // gentle contrast, lifted blacks
      float l = dot(col, vec3(.299, .587, .114)); col = mix(vec3(l), col, 1.08); // a touch of saturation
      vec2 d = (vUv - .5) * vec2(.9, 1.0); col *= 1.0 - smoothstep(.35, .85, length(d)) * .38;   // vignette
      gl_FragColor = vec4(clamp(col, 0., 1.), c.a); }` }));
renderer.toneMappingExposure = .95;
window.END = END; window.TW = tw;
window.renderAt = (t, q = .93) => { update(t); composer.render(); renderer.autoClear = false; renderer.render(overlay, camera); renderer.autoClear = true;
  return renderer.domElement.toDataURL('image/jpeg', q); };
window.__done = true;
