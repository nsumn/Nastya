import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
const DIR = 'ko05_chicken';
// shared head for KO scenes (needs const DIR before it). Build: ko/build.sh <name>
const FONT = 'Jua';
await document.fonts.load(`700 96px ${FONT}`);
const WORDS = await (await fetch(`../${DIR}/words.json`)).json();
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
const CUT = .001;
const SFX = { end: END, music_gain: .06, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
window.SFX = SFX;
const TL = new THREE.TextureLoader();
const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
const pbr = async n => ({ d: await ld(n + '_diff_1k.jpg', true), n: await ld(n + '_nor_gl_1k.jpg', false) });
const [TX_CON, TX_ASP, HDR] = await Promise.all([pbr('concrete_wall_004'), pbr('asphalt_02'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
HDR.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(HDR).texture;
scene.fog = null;
renderer.shadowMap.type = THREE.VSMShadowMap;
function texMat(p, color, rx, ry, o = {}) { const d = p.d.clone(), n = p.n.clone(); d.repeat.set(rx, ry); n.repeat.set(rx, ry); d.needsUpdate = n.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: d, normalMap: n, color, roughness: o.rough ?? .8 }); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); return m; }
const blackM = M('#151515', { roughness: .5 }), whiteM = M('#ffffff', { roughness: .3 });
const steelM = new THREE.MeshStandardMaterial({ color: '#c4c8cd', metalness: .8, roughness: .4 });
const skyTex = (top, mid, bot, stars) => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, top); gr.addColorStop(.55, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  if (stars) for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${rr(.2, .8)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 500), rr(.5, 1.4), 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
function box(w, h, d, mat, x, y, z, cast = true, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; }
function cyl(rt, rb, h, mat, x, y, z, seg = 20, parent = scene) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function textTex(lines, w, h, bg, fg, size) { const [c, g] = cv(w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = `700 ${size}px ${FONT}`; g.fillStyle = fg; g.fillText(l, w / 2, h * (i + .5) / lines.length); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const puffTex = (() => { const [c, g] = cv(128, 128); const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(240,240,240,.9)'); r.addColorStop(.6, 'rgba(220,220,220,.4)'); r.addColorStop(1, 'rgba(200,200,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
// puffs: steam/smoke emitter. puffs(n, color) -> pool; puffUpdate(pool, src, t, k, {size, rise, spread})
function puffs(n, color = '#ffffff') { return Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { ph: i / n, dx: rr(-1, 1), dz: rr(-1, 1) }; scene.add(s); return s; }); }
function puffUpdate(pool, src, t, k, o = {}) { const size = o.size ?? .3, rise = o.rise ?? .8, sp = o.spread ?? .2, sp2 = o.drift ?? V(0, 0, 0);
  pool.forEach(s => { s.visible = k > .01; if (!s.visible) return; const u = s.userData, a = (t * (o.speed ?? .5) + u.ph) % 1;
    s.position.set(src.x + u.dx * sp + sp2.x * a, src.y + a * rise + sp2.y * a, src.z + u.dz * sp + sp2.z * a); s.scale.setScalar(size * (.4 + a)); s.material.opacity = (1 - a) * (o.op ?? .5) * k; }); }
const hemi = scene.children.find(o => o.isHemisphereLight);
sun.shadow.radius = 7; sun.shadow.blurSamples = 8; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005;
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); sun.shadow.camera.updateProjectionMatrix();
sun.position.set(2.5, 7, 5); sun.target.position.set(0, 0, -.5); sun.target.updateMatrixWorld();
const skinM = M('#ecc9a2', { roughness: .5 }), pantsM = M('#2f3a4c', { roughness: .8 }), shoeM = M('#f0f0f0', { roughness: .6 }), blushM = new THREE.MeshStandardMaterial({ color: '#f29a9a', transparent: true, opacity: .55, roughness: .8 });
function person(shirt, o = {}) {
  const shirtM = M(shirt, { roughness: .75 }), hairM = M(o.hair || '#141110', { roughness: .7 });
  const root = new THREE.Group(); scene.add(root);
  const pelvis = new THREE.Group(); pelvis.position.y = .95; root.add(pelvis);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .4, 8, 20), shirtM); torso.position.y = .36; torso.scale.z = .78; pelvis.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.085, .025, 8, 20).rotateX(Math.PI / 2), shirtM); collar.position.y = .66; pelvis.add(collar);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(.25, .27, .22, 16), pantsM); hips.position.y = .02; pelvis.add(hips);
  const head = new THREE.Group(); head.position.y = .76; pelvis.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, .12, 10), skinM); neck.position.y = .02; head.add(neck);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.22, 32, 24), skinM); hd.position.y = .2; hd.scale.set(1, 1.06, .98); head.add(hd);
  if (o.perm) { for (let i = 0; i < 26; i++) { const a = i * 2.39996, y = .18 + (i % 6) * .03, r = Math.sqrt(Math.max(0, .052 - (y - .2) ** 2)) * 1.05;
      if (Math.cos(a) > .55 && y < .3) continue; const c = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), hairM); c.position.set(Math.sin(a) * r, y + .05, Math.cos(a) * r - .02); head.add(c); } }
  else { const hr = new THREE.Mesh(new THREE.SphereGeometry(.232, 28, 16, 0, Math.PI * 2, 0, Math.PI * .5), hairM); hr.position.set(0, .22, -.01); hr.rotation.x = -.42; head.add(hr);
    const bang = new THREE.Mesh(new THREE.SphereGeometry(.23, 24, 10, -Math.PI * .4, Math.PI * .8, Math.PI * .18, Math.PI * .2), hairM); bang.position.set(0, .2, .005); head.add(bang); }
  if (o.beanie) { const b = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 12, 0, Math.PI * 2, 0, Math.PI * .45), M(o.beanie, { roughness: .9 })); b.position.y = .24; head.add(b); }
  const brows = [], cheeks = [];
  for (const s of [-1, 1]) {
    const ey = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), whiteM); ey.position.set(s * .08, .2, .175); ey.scale.set(.9, 1, .55); head.add(ey);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 10), blackM); p.position.set(s * .08, .195, .2); head.add(p);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(.009, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(s * .08 + .01, .207, .227); head.add(hl);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), blushM.clone()); bl.position.set(s * .13, .13, .17); bl.scale.set(1, .55, .3); head.add(bl); cheeks.push(bl);
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
  if (o.apron) { const ap = new THREE.Mesh(new THREE.BoxGeometry(.46, .75, .03), M(o.apron, { roughness: .8 })); ap.position.set(0, -.25, .23); pelvis.add(ap);
    const ap2 = new THREE.Mesh(new THREE.BoxGeometry(.36, .3, .03), M(o.apron, { roughness: .8 })); ap2.position.set(0, .3, .2); pelvis.add(ap2); }
  // fire breath (spicy!)
  const fire = new THREE.Group(); fire.position.set(0, .08, .24); head.add(fire); fire.visible = false;
  for (const [r, l, c] of [[.07, .35, '#ff5a1a'], [.045, .26, '#ffc02a']]) { const f = new THREE.Mesh(new THREE.ConeGeometry(r, l, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9 })); f.position.z = l / 2; fire.add(f); }
  root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  root.userData = { pelvis, head, sh, el, hand, hip, kn, brows, mouth, cheeks, fire, skin: hd };
  return root;
}
const UP = {
  idle: [0, -.1, 0, .1, -.15, -.15, 0, 0, 0, 0, 0, 0, 0, 0, .3],
  table: [-.3, -.2, -.3, .2, -.95, -.95, 0, 0, 0, 0, .02, .08, 0, 0, .35],
  eat: [-.7, -.15, -2.4, .5, -.6, -2.3, 0, 0, 0, 0, -.05, -.25, 0, .3, 1.0],
  drink: [-.7, -.15, -2.5, .5, -.6, -2.25, 0, 0, 0, 0, -.08, -.38, 0, .1, .7],
  cheer: [-2.9, -.35, -2.9, .35, -.1, -.1, 0, 0, 0, 0, -.05, -.15, 0, .8, 1.3],
  cold: [-1.2, -.6, -1.2, .6, -2.1, -2.1, 0, 0, 0, 0, .1, .1, 0, .9, .2],
  warm: [-.9, -.1, -.9, .1, -.4, -.4, 0, 0, 0, 0, .05, 0, 0, -.2, .6],
  cook: [-.7, -.15, -1.0, .2, -.6, -.7, 0, 0, 0, 0, .2, .3, 0, 0, .4],
  look: [0, -.1, 0, .1, -.15, -.15, 0, 0, 0, 0, 0, -.05, -.9, .7, .3],
  tired: [.1, -.05, .1, .05, -.1, -.1, 0, 0, 0, 0, .3, .45, 0, .9, .15],
  hot: [-2.6, -.5, -2.6, .5, -1.2, -1.2, 0, 0, 0, 0, -.1, -.25, 0, .9, 1.4] };
const mixP = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
const SIT = p => { const q = p.slice(); q[6] = q[7] = -1.5; q[8] = q[9] = 1.5; return q; };
const WALK = (p, ph, amp = .5) => { const q = p.slice(), s = Math.sin(ph); q[6] = s * amp; q[7] = -s * amp; q[8] = Math.max(0, -s) * amp * 1.4; q[9] = Math.max(0, s) * amp * 1.4;
  if (p === UP.idle || p === UP.look) { q[0] = -s * amp * .7; q[2] = s * amp * .7; } return q; };
function applyPose(c, p) { const u = c.userData;
  u.sh[0].rotation.set(p[0], 0, p[1]); u.sh[1].rotation.set(p[2], 0, p[3]); u.el[0].rotation.x = p[4]; u.el[1].rotation.x = p[5];
  u.pelvis.rotation.x = p[10]; u.hip[0].rotation.x = p[6] - p[10]; u.hip[1].rotation.x = p[7] - p[10]; u.kn[0].rotation.x = p[8]; u.kn[1].rotation.x = p[9];
  u.head.rotation.set(p[11], p[12], 0); u.brows.forEach((b, i) => { const s = i ? 1 : -1; b.rotation.z = -s * p[13] * .45; b.position.y = .275 + p[13] * .02; });
  u.mouth.scale.set(1.2 - p[14] * .25, .3 + p[14] * .55, .4); u.pelvis.position.y = p[6] < -1 ? .55 : .95; }
const handPos = (c, i = 1, off = V(0, -.06, .05)) => { c.updateMatrixWorld(true); return c.userData.hand[i].localToWorld(off.clone()); };
const face = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
function putP(o, p, ry = 0) { o.position.copy(p); o.rotation.set(0, ry, 0); }
Object.assign(UP, {
  singFree: [-.5, -.7, -.5, .7, -.5, -.5, 0, 0, 0, 0, -.05, -.2, 0, .5, 1.3],
  sing: [-.15, -.15, -1.0, -.6, -.2, -2.05, 0, 0, 0, 0, -.03, -.12, 0, .4, 1.2],
  bang: [-1.6, -.1, -1.6, .1, -1.0, -1.0, 0, 0, 0, 0, .08, 0, 0, -.8, 1.0],
  shy: [-1.3, .5, -1.3, -.5, -2.15, -2.15, 0, 0, 0, 0, .12, .38, 0, .7, .2],
  bored: [-.3, -.15, -1.45, .25, -.9, -2.5, 0, 0, 0, 0, .12, .15, .35, .5, .1],
  remote: [-.3, -.2, -1.0, .2, -.95, -1.3, 0, 0, 0, 0, .05, .12, 0, .2, .3],
  thumb: [0, -.1, -1.2, .25, -.15, -1.6, 0, 0, 0, 0, 0, -.05, 0, .3, 1.1],
  give: [-1.1, -.1, -1.1, .1, -.5, -.5, 0, 0, 0, 0, .1, .15, 0, 0, .5],
  forehead: [-.3, -.15, -1.3, -.6, -.2, -2.4, 0, 0, 0, 0, .05, .1, 0, .6, .8],
  sleep: [.15, -.25, .15, .25, -.2, -.2, 0, 0, 0, 0, 0, 0, .3, .3, .05],
  lieTV: [-.2, -.6, -.2, .6, -.6, -.6, 0, 0, 0, 0, 0, .1, 0, 0, .3] });
const FSIT = p => { const q = p.slice(); q[6] = q[7] = -1.5; q[8] = q[9] = 0; return q; };   // sit on the floor, legs forward (root y = FLOOR_Y)
const FLOOR_Y = -.43;
// swap clothes: shirt colour (+ shorts in the same colour with bare shins), keeps the rig
function dress(p, col, shorts = true) { const u = p.userData, m = M(col, { roughness: .8 }), old = u.pelvis.children[0].material;
  p.traverse(o => { if (o.isMesh && o.material === old) o.material = m; });
  if (shorts) { u.hip.forEach(h => h.children[0].material = m); u.kn.forEach(k => k.children[0].material = skinM); u.pelvis.children[2].material = m; } }
// lying on the back, head towards +x (feet at pos.x)
function lie(p, pos, pose) { p.position.set(pos.x, .21, pos.z); p.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); applyPose(p, pose); }
// towel "sheep head" (양머리)
function sheepHead(p, col = '#f6ece4') { const g = new THREE.Group(), m = M(col, { roughness: .95 }); p.userData.head.add(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.2, .055, 10, 28).rotateX(Math.PI / 2), m); band.position.y = .3; g.add(band);
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.07, .045, 10, 20), m); r.position.set(s * .2, .34, .02); r.rotation.y = Math.PI / 2; g.add(r); }
  const top = new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 10, 0, Math.PI * 2, 0, Math.PI * .5), m); top.position.y = .3; top.scale.y = .5; g.add(top);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.visible = false; p.userData.sheep = g; return g; }
function hotFace(p, k, col = '#ff6a5a') { const u = p.userData; if (!u.hotM) { u.hotM = skinM.clone(); u.skin.material = u.hotM; u.c0 = skinM.color.clone(); } u.hotM.color.copy(u.c0).lerp(new THREE.Color(col), k); }
function label(text, w = 1, col = '#ffd21f') {
  const [c0, g0] = cv(8, 8); g0.font = `700 150px ${FONT}`; const tw_ = g0.measureText(text).width, cw = Math.ceil(tw_ + 60);
  const [c, g] = cv(cw, 256); g.font = `700 150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, cw / 2, 138); g.fillStyle = col; g.fillText(text, cw / 2, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.userData = { w, aspect: cw / 256 }; s.visible = false; return s; }
const overlay = new THREE.Scene();
function lab(s, k, x, y, z, w) { s.visible = k > .01; if (!s.visible) return; const h = (w ?? s.userData.w) / 4 * Math.max(k, .001); s.position.set(x, y, z); s.scale.set(h * s.userData.aspect, h, 1); }
// ===================== KO 05 치킨 — fryer, double fry, sauce, half/half, radish, delivery bike + box, beer, bones, gloves, 10 pm =====================
const tw = {
  dak: TE('닭을'), gireum: TE('기름에'), twigimyeon: TE('튀기면', 1), chikin: TE('치킨이', 1),
  g1: G(1), kkeopjil: TE('껍질이'), nuknuk: TE('눅눅해져서'), eopseo: TE('없어'),
  s1: S(1), du2: TE('두'), twigyeo: TE('튀겨'), han: TE('한', 1), deo: TE('더'), basak: TE('바삭바삭'), chokchok: TE('촉촉해'),
  g2: G(2), meogeumyeon: TE('먹으면', 1), neukki1: TE('느끼해', 1),
  s2: S(2), ppalgan: TE('빨간'), yangnyeom: TE('양념을'), balla: TE('발라'), gochujang: TE('고추장에'), mulyeot: TE('물엿을'), dalkom: TE('달콤하고'), maekom: TE('매콤해'),
  g3: G(3), fried1: TE('프라이드도'), yang2: TE('양념도'), sipeo: TE('싶어'),
  s3: S(3), ban1: TE('반은', 1), fried2: TE('프라이드'), ban2: TE('반은', 2), yang3: TE('양념'), banban: TE('반반'), chikin2: TE('치킨이야'),
  g4: G(4), neukki2: TE('느끼해', 2),
  s4: S(4), hayan: TE('하얀'), mu: TE('치킨무를'), saekom: TE('새콤달콤해서'), gaeun: TE('개운해져'),
  g5: G(5), gage: TE('가게까지'), gwichana: TE('귀찮아'),
  s5: S(5), otobai: TE('오토바이로'), baedal: TE('배달해'), jeonhwa: TE('전화'), samsip: TE('삼십'), wa: TE('와'),
  g6: G(6), oneun: TE('오는'), sigeo: TE('식어'),
  s6: S(6), ttatteut: TE('따뜻하게'), tong: TE('배달통에'), neo: TE('넣어', 1), ttukkeong: TE('뚜껑을'), kkwak: TE('꽉'), ppajyeo: TE('빠져'),
  g7: G(7), chikinman: TE('치킨만'), makhyeo: TE('막혀'),
  s7: S(7), siwon: TE('시원한'), maekju: TE('맥주를'), masyeo: TE('마셔'), chimaek: TE('치맥이야'),
  g8: G(8), siktak: TE('식탁'), ppyeo1: TE('뼈가'), hangadeuk: TE('한가득이야'),
  s8: S(8), ppyeo2: TE('뼈'), tong2: TE('통을'), bijil: TE('비닐장갑도'),
  chukha: TE('축하해'), chikinjip: TE('치킨집을'), g9: G(9), bam: TE('밤'), yeol: TE('열'), gopa: TE('고파') };

// ---------- sound ----------
SFX.beds.push([0, tw.s2, 'fire', .35], [tw.s5, tw.g6 + 1.5, 'engine', .5], [tw.s1, tw.chokchok, 'fire', .3]);
e(.05, 'whoosh', .4); e(tw.gireum, 'splash', .7); e(tw.gireum + .1, 'crackle', .9); e(tw.chikin, 'ding', .6);
e(tw.nuknuk, 'boing', .5); e(tw.du2, 'splash', .6); e(tw.deo, 'splash', .6); for (let k = 0; k < 4; k++) e(tw.basak + k * .12, 'clack', .5);
e(tw.neukki1, 'boing', .4); e(tw.yangnyeom, 'splash', .5); e(tw.balla, 'swoosh_up', .6); e(tw.gochujang, 'pop', .6); e(tw.mulyeot, 'pop', .6); e(tw.maekom, 'poof', .7);
e(tw.sipeo, 'boing', .5); e(tw.fried2, 'pop', .7); e(tw.yang3, 'pop', .7); e(tw.banban, 'tada', .6);
e(tw.neukki2, 'boing', .4); e(tw.mu, 'pop', .7); e(tw.gaeun, 'sparkle', .8);
e(tw.gwichana, 'boing', .4); e(tw.otobai, 'honk', .6); e(tw.jeonhwa, 'ding', .5); e(tw.samsip, 'ding', .7);
e(tw.sigeo, 'brr', .6); e(tw.tong, 'pop', .7); e(tw.kkwak, 'clack', .9);
e(tw.makhyeo, 'boing', .6); e(tw.maekju, 'pop', .6); e(tw.masyeo, 'clink', .9); e(tw.chimaek, 'tada', .7);
for (let k = 0; k < 6; k++) e(tw.ppyeo1 + k * .1, 'clack', .4); e(tw.tong2, 'pop', .6); for (let k = 0; k < 5; k++) e(tw.tong2 + .3 + k * .12, 'tick', .6); e(tw.bijil, 'swoosh_up', .5);
e(tw.chukha, 'tada', .9); e(tw.yeol, 'ding', .6); e(tw.gopa, 'boing', .7);

// ---------- sets: shop (left), road (front), home (right) ----------
const tileM = texMat(TX_CON, '#e8e4dc', 6, 6, { ns: .3, rough: .5 }), woodF = M('#b88a5a', { roughness: .55 }), wallW = M('#f2e6d0', { roughness: .85 });
box(4.2, .1, 4, tileM, -1.9, -.05, 0, false); box(4.2, 2.8, .1, M('#f4d070', { roughness: .8 }), -1.9, 1.4, -2.0, false); box(.1, 2.8, 4, M('#f4d070', { roughness: .8 }), -4.0, 1.4, 0, false);
const shopSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .55), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffffff', emissiveMap: textTex(['치킨'], 512, 160, '#c8201a', '#ffe060', 120), emissiveIntensity: 1.0 })); shopSign.position.set(-1.9, 2.4, -1.94); scene.add(shopSign);
box(4.0, .1, 4, woodF, 3.4, -.05, 0, false); box(4.0, 2.8, .1, wallW, 3.4, 1.4, -2.0, false); box(.1, 2.8, 4, wallW, 5.4, 1.4, 0, false); box(.1, 2.8, 2.6, wallW, 1.4, 1.4, -.7, false);
const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 6).rotateX(-Math.PI / 2), texMat(TX_ASP, '#6a6866', 10, 2, { rough: .6 })); road.position.set(0, -.08, 5); road.receiveShadow = true; scene.add(road);
box(40, .12, 1.0, texMat(TX_CON, '#a09a92', 12, 1, { ns: .5 }), 0, -.04, 2.5, false);
for (let i = -8; i < 8; i++) box(.9, .01, .12, M('#f0e8c0'), i * 2.2, -.07, 5.2, false);
// shop: fryer, counter, table + chair
const fryer = new THREE.Group(); scene.add(fryer); fryer.position.set(-2.6, 0, -1.3);
box(.8, .9, .6, steelM, 0, .45, 0, true, fryer);
const oil = box(.66, .02, .46, new THREE.MeshStandardMaterial({ color: '#c88a2a', roughness: .1, metalness: .2, emissive: '#5a3008', emissiveIntensity: .3 }), 0, .9, 0, false, fryer);
const basket = new THREE.Group(); fryer.add(basket);
{ const wm = new THREE.MeshStandardMaterial({ color: '#d0d4d8', metalness: .8, roughness: .3, wireframe: true }); const b = new THREE.Mesh(new THREE.BoxGeometry(.5, .2, .34, 6, 3, 4), wm); b.position.y = .1; basket.add(b);
  const h = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .5, 8).rotateX(Math.PI / 2), blackM); h.position.set(0, .2, .4); basket.add(h); }
const counter = box(.9, .95, .6, M('#d8d0c4', { roughness: .5 }), -1.65, .475, -1.3);
const shopTable = new THREE.Group(); scene.add(shopTable); shopTable.position.set(-1.4, 0, .75);
box(.9, .05, .7, M('#e8e0d4', { roughness: .4 }), 0, .75, 0, true, shopTable); box(.06, .73, .06, steelM, 0, .365, 0, true, shopTable); box(.5, .03, .5, steelM, 0, .015, 0, true, shopTable);
box(.42, .05, .42, M('#c83a2a', { roughness: .5 }), -1.4, .45, 1.45); box(.05, .45, .05, steelM, -1.4, .22, 1.45);
// home: sofa, low table, TV, clock, window
const sofa = new THREE.Group(); scene.add(sofa); sofa.position.set(4.75, 0, .4);
box(.7, .45, 2.2, M('#5a7aa8', { roughness: .7 }), 0, .225, 0, true, sofa); box(.18, .9, 2.2, M('#5a7aa8', { roughness: .7 }), .3, .45, 0, true, sofa);
const lowTable = new THREE.Group(); scene.add(lowTable); lowTable.position.set(3.3, 0, .55);
box(1.1, .05, .7, M('#8a5a34', { roughness: .45 }), 0, .4, 0, true, lowTable); for (const [x, z] of [[-.48, -.28], [.48, -.28], [-.48, .28], [.48, .28]]) box(.06, .38, .06, M('#6a4024'), x, .19, z, true, lowTable);
const LT = .425;
const clockCan = cv(256, 256), clockTex = new THREE.CanvasTexture(clockCan[0]); clockTex.colorSpace = THREE.SRGBColorSpace;
function drawClock(h, m) { const g = clockCan[1]; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#2a2a2a'; g.stroke();
  g.fillStyle = '#2a2a2a'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 4, 8, 8); }
  const hand = (a, l, w) => { g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * l, 128 - Math.cos(a) * l); g.stroke(); };
  hand((h % 12 + m / 60) / 12 * Math.PI * 2, 60, 12); hand(m / 60 * Math.PI * 2, 92, 8); clockTex.needsUpdate = true; }
const clock = new THREE.Mesh(new THREE.CircleGeometry(.3, 32), new THREE.MeshStandardMaterial({ map: clockTex, roughness: .5 })); clock.position.set(3.0, 2.0, -1.94); scene.add(clock);
const winM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: skyTex('#8ac0ff', '#c8e0ff', '#ffe8c0'), emissiveIntensity: .9 });
const nightWin = skyTex('#05081a', '#0e1530', '#1a2040', true);
const win_ = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), winM); win_.position.set(4.3, 1.7, -1.94); scene.add(win_);
const homeTV = box(1.0, .6, .06, blackM, 3.3, 1.2, -1.92, false);

// ---------- food ----------
const RAW = new THREE.Color('#f0b8a8'), GOLD = new THREE.Color('#d8902e'), CRISP = new THREE.Color('#b0601a'), SOG = new THREE.Color('#c8a070'), RED = new THREE.Color('#b8200e');
const boneM = M('#f6f0e4', { roughness: .5 });
function drumstick() { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: GOLD.clone(), roughness: .45, bumpScale: 1 });
  const meat = new THREE.Mesh(new THREE.IcosahedronGeometry(.065, 2), m); meat.scale.set(1, 1, 1.35); g.add(meat);
  const pos = meat.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const k = 1 + .09 * Math.sin(pos.getX(i) * 90) * Math.sin(pos.getY(i) * 80 + 1) * Math.sin(pos.getZ(i) * 70 + 2); pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k); } meat.geometry.computeVertexNormals();
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(.014, .07, 4, 8).rotateX(Math.PI / 2), boneM); b.position.z = .11; g.add(b);
  const k = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), boneM); k.position.z = .155; g.add(k);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.m = m; scene.add(g); return g; }
const fryPcs = Array.from({ length: 4 }, () => drumstick());
const platePcs = Array.from({ length: 6 }, () => drumstick());
const homePcs = Array.from({ length: 6 }, () => drumstick());
const plate = cyl(.22, .19, .025, M('#ffffff', { roughness: .3 }), 0, 0, 0, 28);
const box_ = new THREE.Group(); scene.add(box_); box_.position.set(3.3, LT, .5);
box(.5, .1, .4, M('#c8a878', { roughness: .8 }), 0, .05, 0, true, box_);
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(.5, .4).rotateX(-Math.PI / 2), M('#d8c8a8', { roughness: .9 })); p.position.y = .101; box_.add(p); }
const sauceBowl = cyl(.15, .1, .1, M('#f4f0e8'), -1.75, .95 + .05, -1.25, 24); const sauceIn = cyl(.14, .14, .01, new THREE.MeshStandardMaterial({ color: RED, roughness: .2 }), -1.75, 1.04, -1.25, 24);
const jar = new THREE.Group(); scene.add(jar); { const c = cyl(.09, .09, .12, M('#c82a1a', { roughness: .4 }), 0, .06, 0, 20, jar); const l = new THREE.Mesh(new THREE.CylinderGeometry(.092, .092, .07, 20, 1, true), new THREE.MeshStandardMaterial({ map: textTex(['고추장'], 256, 80, '#ffe8c0', '#a01a10', 56) })); l.position.y = .06; l.rotation.y = -Math.PI / 2; jar.add(l); }
const syrup = new THREE.Group(); scene.add(syrup); { cyl(.05, .05, .2, new THREE.MeshStandardMaterial({ color: '#e8a040', roughness: .1, transparent: true, opacity: .8 }), 0, .1, 0, 16, syrup); cyl(.022, .03, .06, whiteM, 0, .23, 0, 12, syrup);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .07, 16, 1, true), new THREE.MeshStandardMaterial({ map: textTex(['물엿'], 256, 80, '#ffffff', '#c86a10', 60) })); l.position.y = .1; l.rotation.y = -Math.PI / 2; syrup.add(l); }
const radish = new THREE.Group(); scene.add(radish);
{ const c = new THREE.Mesh(new THREE.CylinderGeometry(.09, .08, .08, 20, 1, true).translate(0, .04, 0), new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: .35, roughness: .05, side: THREE.DoubleSide, depthWrite: false })); radish.add(c);
  for (let i = 0; i < 12; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .035), M('#fbfbf4', { roughness: .3 })); k.position.set(rr(-.05, .05), .02 + (i % 3) * .022, rr(-.05, .05)); k.rotation.set(rr(0, 1), rr(0, 1), 0); radish.add(k); } }
const beer = new THREE.Group(); scene.add(beer);
{ const glassM = new THREE.MeshStandardMaterial({ color: '#f0f8ff', transparent: true, opacity: .25, roughness: .05, side: THREE.DoubleSide, depthWrite: false });
  const g = new THREE.Mesh(new THREE.CylinderGeometry(.06, .055, .18, 20, 1, true).translate(0, .09, 0), glassM); beer.add(g);
  cyl(.057, .053, .14, new THREE.MeshStandardMaterial({ color: '#f0b030', roughness: .1, transparent: true, opacity: .85 }), 0, .07, 0, 20, beer); cyl(.06, .058, .04, M('#fffaf0', { roughness: .9 }), 0, .16, 0, 20, beer);
  const h = new THREE.Mesh(new THREE.TorusGeometry(.04, .01, 6, 14, Math.PI), glassM); h.position.set(.07, .09, 0); h.rotation.z = -Math.PI / 2; beer.add(h); }
const bottle = new THREE.Group(); scene.add(bottle); { const bm = new THREE.MeshStandardMaterial({ color: '#7a4a10', roughness: .15, transparent: true, opacity: .9 }); cyl(.04, .04, .18, bm, 0, .09, 0, 16, bottle); cyl(.015, .04, .07, bm, 0, .21, 0, 16, bottle); cyl(.015, .015, .06, bm, 0, .27, 0, 12, bottle); }
const bones = Array.from({ length: 12 }, () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(.014, .08, 4, 8).rotateZ(Math.PI / 2), boneM); g.add(b); for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), boneM); k.position.x = s * .055; g.add(k); } g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); return g; });
const bin = new THREE.Group(); scene.add(bin); { const c = new THREE.Mesh(new THREE.CylinderGeometry(.1, .08, .16, 20, 1, true).translate(0, .08, 0), M('#f4f0e6', { side: THREE.DoubleSide })); bin.add(c); const l = new THREE.Mesh(new THREE.CylinderGeometry(.101, .081, .06, 20, 1, true).translate(0, .08, 0), new THREE.MeshStandardMaterial({ map: textTex(['뼈'], 128, 64, '#c8201a', '#ffffff', 44) })); bin.add(l); }
const gloveM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .45, roughness: .05, depthWrite: false });
const gloves = [0, 1].map(() => { const g = new THREE.Mesh(new THREE.SphereGeometry(.085, 14, 10), gloveM); scene.add(g); return g; });
const phone = box(.05, .1, .012, M('#1a1a20', { roughness: .3 }), 0, 0, 0);
// delivery bike
const bike = new THREE.Group(); scene.add(bike);
{ const red = M('#d82a1a', { roughness: .4 });
  for (const x of [-.45, .45]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.24, .07, 10, 24), blackM); w.position.set(x, .3, 0); bike.add(w); const h = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .1, 12).rotateX(Math.PI / 2), steelM); h.position.set(x, .3, 0); bike.add(h); }
  const b = new THREE.Mesh(new THREE.BoxGeometry(.8, .25, .3), red); b.position.set(0, .5, 0); bike.add(b);
  const f = new THREE.Mesh(new THREE.BoxGeometry(.12, .55, .28), red); f.position.set(.42, .7, 0); f.rotation.z = -.35; bike.add(f);
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .6, 8).rotateX(Math.PI / 2), blackM); hb.position.set(.5, .98, 0); bike.add(hb);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.45, .08, .26), blackM); seat.position.set(-.1, .68, 0); bike.add(seat);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(.4, .04, .34), steelM); rack.position.set(-.45, .72, 0); bike.add(rack);
  bike.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
const dbox = new THREE.Group(); bike.add(dbox); dbox.position.set(-.45, .74, 0);
const lid = new THREE.Group(); dbox.add(lid); lid.position.set(-.21, .44, 0);
{ const bm = M('#c8201a', { roughness: .5 }); box(.42, .42, .4, bm, 0, .21, 0, true, dbox);
  const lab_ = new THREE.Mesh(new THREE.PlaneGeometry(.38, .2), new THREE.MeshStandardMaterial({ map: textTex(['치킨'], 256, 128, '#c8201a', '#ffe060', 90) })); lab_.position.set(0, .22, .201); dbox.add(lab_);
  const l = box(.44, .04, .42, bm, .21, .02, 0, true, lid); }
const bag = new THREE.Mesh(new THREE.SphereGeometry(.16, 14, 10), M('#f8f8f4', { roughness: .6 })); bag.scale.set(1, .8, 1); bike.add(bag); bag.position.set(-.45, .86, 0);
const coldP = puffs(6, '#bfe0ff'), steamP = puffs(8, '#ffffff'), fryP = puffs(10, '#ffffff'), boxSteam = puffs(6, '#ffffff');

// ---------- people ----------
const du = person('#3f8f6a'), owner = person('#f4f4f4', { hair: '#1a1a1a', beanie: '#e83a3a', apron: '#c8201a' }), rider = person('#2a2a30', { hair: '#1a1a1a', beanie: '#d82a1a', long: true });
rider.userData.head.children.find(o => o.geometry && o.geometry.type === 'SphereGeometry' && o.material.color.getHexString() === 'd82a1a');
{ const h = new THREE.Mesh(new THREE.SphereGeometry(.27, 24, 16), M('#d82a1a', { roughness: .3 })); h.position.y = .24; h.scale.set(1, .95, 1.05); rider.userData.head.add(h); }

// ---------- labels ----------
const LB = { chikin: label('치킨!'), nuk: label('눅눅...', 1, '#c8a070'), n1: label('1번', 1, '#ffffff'), n2: label('2번'), bas: label('바삭!'), chok: label('촉촉', 1, '#8fd8ff'),
  neuk: label('느끼...', 1, '#e8d070'), dal: label('달콤', 1, '#ff8ab0'), mae: label('매콤!', 1, '#ff4a3a'), q: label('?', 1, '#ffffff'), banban: label('반반'),
  neuk2: label('느끼...', 1, '#e8d070'), gaeun: label('개운~', 1, '#8fe8ff'), lazy: label('귀찮아...', 1, '#8fb0ff'), m30: label('30분'), cold: label('식어...', 1, '#8fd8ff'),
  hot: label('따끈!', 1, '#ff8a4a'), cheok: label('컥!', 1, '#ff6a5a'), chimaek: label('치맥'), bonepile: label('뼈 산', 1, '#ffffff'), glove: label('비닐장갑', 1, '#ffffff'),
  ten: label('밤 10시', 1, '#8fb0ff'), grr: label('꼬르륵', 1, '#ffd21f') };
for (const s of Object.values(LB)) overlay.add(s);

// ---------- camera ----------
const BIKE0 = -2.6, BIKE1 = 1.0, BZ = 4.0;
const KEYS = [
  [0, V(-2.2, 1.55, -.15), V(-2.65, .95, -1.3)], [tw.g1, V(-2.25, 1.52, -.25), V(-2.65, .95, -1.3)],
  [tw.g1 + CUT, V(-1.25, 1.55, -.55), V(-1.4, 1.05, 1.1), 1], [tw.s1, V(-1.28, 1.52, -.45), V(-1.4, 1.05, 1.1)],
  [tw.s1 + CUT, V(-2.2, 1.55, -.15), V(-2.65, .95, -1.3), 1], [tw.basak - .1, V(-2.25, 1.52, -.25), V(-2.65, .95, -1.3)],
  [tw.basak + CUT, V(-1.4, 1.3, -.2), V(-1.4, .85, .75), 1], [tw.g2, V(-1.38, 1.25, -.1), V(-1.4, .85, .75)],
  [tw.g2 + CUT, V(-1.3, 1.6, -.3), V(-1.4, 1.35, 1.45), 1], [tw.s2, V(-1.32, 1.58, -.2), V(-1.4, 1.35, 1.45)],
  [tw.s2 + CUT, V(-1.5, 1.5, -.3), V(-1.75, 1.0, -1.25), 1], [tw.dalkom - .1, V(-1.55, 1.45, -.4), V(-1.75, 1.0, -1.25)],
  [tw.dalkom + CUT, V(-1.3, 1.6, -.3), V(-1.4, 1.35, 1.45), 1], [tw.g3, V(-1.32, 1.58, -.2), V(-1.4, 1.35, 1.45)],
  [tw.g3 + CUT, V(-1.4, 1.8, -.9), V(-1.4, 1.0, 1.0), 1], [tw.s3, V(-1.4, 1.75, -.8), V(-1.4, 1.0, 1.0)],
  [tw.s3 + CUT, V(-1.4, 1.65, .15), V(-1.4, .78, .75), 1], [tw.g4, V(-1.4, 1.6, .2), V(-1.4, .78, .75)],
  [tw.g4 + CUT, V(-1.3, 1.6, -.3), V(-1.4, 1.35, 1.45), 1], [tw.s4, V(-1.32, 1.58, -.2), V(-1.4, 1.35, 1.45)],
  [tw.s4 + CUT, V(-1.15, 1.15, .15), V(-1.2, .8, .8), 1], [tw.saekom, V(-1.15, 1.12, .2), V(-1.2, .8, .8)],
  [tw.saekom + CUT, V(-1.3, 1.6, -.3), V(-1.4, 1.35, 1.45), 1], [tw.g5, V(-1.32, 1.58, -.2), V(-1.4, 1.35, 1.45)],
  [tw.g5 + CUT, V(3.4, 1.9, 1.9), V(4.6, .7, .4), 1], [tw.s5, V(3.45, 1.85, 1.8), V(4.6, .7, .4)],
  [tw.s5 + CUT, V(BIKE0, 1.4, 7.4), V(BIKE0, .8, BZ), 1], [tw.jeonhwa - .05, V(lerp(BIKE0, BIKE1, .45), 1.4, 7.4), V(lerp(BIKE0, BIKE1, .45), .8, BZ)],
  [tw.jeonhwa + CUT, V(3.6, 1.6, 1.9), V(4.6, .9, .4), 1], [tw.samsip - .05, V(3.62, 1.58, 1.85), V(4.6, .9, .4)],
  [tw.samsip + CUT, V(lerp(BIKE0, BIKE1, .75), 1.4, 7.0), V(lerp(BIKE0, BIKE1, .75), .8, BZ), 1], [tw.g6, V(BIKE1, 1.4, 7.0), V(BIKE1, .8, BZ)],
  [tw.g6 + CUT, V(BIKE1 - 1.4, 1.5, BZ + 1.4), V(BIKE1 - .45, .95, BZ), 1], [tw.s6, V(BIKE1 - 1.35, 1.48, BZ + 1.3), V(BIKE1 - .45, .95, BZ)],
  [tw.s6 + CUT, V(BIKE1 - 1.2, 1.6, BZ + 1.3), V(BIKE1 - .45, 1.0, BZ), 1], [tw.g7, V(BIKE1 - 1.15, 1.55, BZ + 1.2), V(BIKE1 - .45, 1.0, BZ)],
  [tw.g7 + CUT, V(3.3, 1.5, -.9), V(3.3, 1.0, 1.2), 1], [tw.s7, V(3.3, 1.48, -.8), V(3.3, 1.0, 1.2)],
  [tw.s7 + CUT, V(3.1, 1.05, -.2), V(3.3, .55, .6), 1], [tw.masyeo, V(3.12, 1.03, -.15), V(3.3, .55, .6)],
  [tw.masyeo + CUT, V(3.3, 1.5, -.9), V(3.3, 1.0, 1.2), 1], [tw.g8, V(3.3, 1.48, -.8), V(3.3, 1.0, 1.2)],
  [tw.g8 + CUT, V(3.65, 1.35, -.15), V(3.15, .45, .7), 1], [tw.s8, V(3.63, 1.32, -.1), V(3.15, .45, .7)],
  [tw.bijil - .05 + CUT, V(3.45, 1.25, -.1), V(3.3, .85, 1.0), 1], [tw.chukha, V(3.46, 1.23, -.05), V(3.3, .85, 1.0)],
  [tw.chukha + CUT, V(2.4, 2.1, 7.0), V(2.4, .9, .6), 1], [tw.g9, V(2.4, 2.0, 6.5), V(2.4, .9, .6)],
  [tw.g9 + CUT, V(3.0, 1.85, -.4), V(3.0, 1.95, -1.94), 1], [tw.gopa - .5, V(3.0, 1.83, -.5), V(3.0, 1.95, -1.94)],
  [tw.gopa - .5 + CUT, V(3.3, 1.5, -.7), V(3.3, 1.05, 1.2), 1], [END, V(3.3, 1.45, -.55), V(3.3, 1.05, 1.2)]];

// ---------- timeline ----------
const setCol = (p, c) => p.userData.m.color.copy(c);
function lay(pcs, c, r, cols, t0, gap = .06) { pcs.forEach((p, i) => { const a = i / pcs.length * Math.PI * 2; p.position.set(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r); p.rotation.set(0, -a + Math.PI / 2, 0); p.scale.setScalar(Math.max(pop(t0.t, t0.a + i * gap), .001)); setCol(p, cols(i)); }); }
function update(t) {
  const home = t >= tw.g5, night = ease(t, tw.g9 - .2, tw.g9 + .3);
  scene.background = skyTex.cache || (skyTex.cache = skyTex('#5a8ad8', '#a8c8f0', '#f0d8b0'));
  hemi.color.set('#fff0dc'); hemi.groundColor.set('#4a3a2a'); hemi.intensity = lerp(1.0, .35, night); sun.intensity = lerp(1.5, .2, night); fill.intensity = lerp(.35, .05, night);
  scene.environmentIntensity = lerp(.4, .08, night); win_.material.emissiveMap = night > .5 ? nightWin : winM.emissiveMap; drawClock(night > .5 ? 10 : 7, 0);
  if (night > .5 && !winM.userData.n) { winM.userData.n = 1; winM.emissiveMap = nightWin; winM.needsUpdate = true; }
  // ---- fryer: dip, colour ----
  const dip = t < tw.g1 ? ease(t, .2, tw.gireum) : t < tw.s1 + .2 ? 0 : t < tw.basak ? (ease(t, tw.twigyeo - .2, tw.twigyeo + .1) * (1 - ease(t, tw.han, tw.han + .2)) + ease(t, tw.deo - .2, tw.deo + .1) * (1 - ease(t, tw.basak - .3, tw.basak))) : 0;
  basket.position.y = lerp(1.0, .8, dip); basket.visible = t < tw.g2 + .5;
  fryPcs.forEach((p, i) => { p.visible = basket.visible; const bp = V(-2.6 - .15 + (i % 2) * .3, basket.position.y + .08, -1.3 - .07 + (i >> 1) * .14); p.position.copy(bp); p.rotation.set(0, i, 0);
    p.userData.m.color.copy(RAW).lerp(GOLD, ease(t, tw.gireum, tw.chikin)).lerp(CRISP, ease(t, tw.basak - .3, tw.basak + .2)); });
  puffUpdate(fryP, V(-2.6, .95, -1.3), t, basket.visible ? .3 + dip * .7 : 0, { size: .25, rise: .9, spread: .25, op: .45, speed: .8 });
  // ---- table plate (shop) ----
  const shopPlate = t < tw.g5;
  plate.visible = shopPlate; plate.position.set(-1.4, .79, .7);
  platePcs.forEach((p, i) => { p.visible = shopPlate && t > tw.g1 - .2; if (!p.visible) return;
    const a = i / 6 * Math.PI * 2; p.position.set(-1.4 + Math.cos(a) * .12, .83, .7 + Math.sin(a) * .1); p.rotation.set(.1, -a + Math.PI / 2, 0); p.scale.setScalar(1);
    let c = GOLD.clone(); if (t < tw.s1) c.lerp(SOG, ease(t, tw.kkeopjil, tw.nuknuk + .3)); else c = CRISP.clone();
    if (t > tw.balla - .2) c.lerp(RED, ease(t, tw.balla - .2, tw.balla + .3));
    if (t >= tw.g3 && t < tw.s3) c = i < 3 ? CRISP.clone() : RED.clone();
    if (t >= tw.s3) c = i < 3 ? (t > tw.fried2 - .2 ? CRISP.clone() : GOLD.clone()) : (t > tw.yang3 - .2 ? RED.clone() : GOLD.clone());
    p.userData.m.color.copy(c); p.userData.m.roughness = c.equals(RED) ? .15 : .45; p.userData.m.emissive?.set(c.equals(RED) ? '#300400' : '#000000'); });
  puffUpdate(steamP, V(-1.4, .85, .7), t, (t > tw.s1 && t < tw.g5) ? .6 : 0, { size: .07, rise: .3, spread: .08, op: .25 });
  sauceBowl.visible = sauceIn.visible = t > tw.ppalgan - .2 && t < tw.g3; sauceBowl.scale.setScalar(Math.max(pop(t, tw.ppalgan - .2), .001)); sauceIn.scale.copy(sauceBowl.scale);
  jar.visible = t > tw.gochujang - .2 && t < tw.g3; jar.position.set(-2.0, .95, -1.15); jar.scale.setScalar(Math.max(pop(t, tw.gochujang - .2), .001));
  syrup.visible = t > tw.mulyeot - .2 && t < tw.g3; syrup.position.set(-1.5, .95 + ease(t, tw.mulyeot, tw.mulyeot + .3) * .15, -1.15); syrup.rotation.z = ease(t, tw.mulyeot, tw.mulyeot + .3) * 1.6; syrup.scale.setScalar(Math.max(pop(t, tw.mulyeot - .2), .001));
  radish.visible = t > tw.mu - .2 && t < tw.g5; radish.position.set(-1.15, .78, .85); radish.scale.setScalar(Math.max(pop(t, tw.mu - .2), .001));
  // ---- home: box with half/half, beer, bones, bin, gloves ----
  box_.visible = t > tw.g7 - .1; box_.scale.setScalar(Math.max(pop(t, tw.g7 - .1), .001));
  const eaten = ease(t, tw.g8, tw.hangadeuk);
  homePcs.forEach((p, i) => { p.visible = box_.visible && i >= Math.floor(eaten * 6); const a = i / 6 * Math.PI * 2; p.position.set(3.3 + Math.cos(a) * .13, LT + .14, .5 + Math.sin(a) * .1); p.rotation.set(.1, -a + Math.PI / 2, 0); p.scale.setScalar(box_.scale.x); setCol(p, i < 3 ? CRISP : RED); });
  bottle.visible = beer.visible = t > tw.maekju - .2; bottle.position.set(3.65, LT, .4); bottle.scale.setScalar(Math.max(pop(t, tw.maekju - .2), .001));
  const toBin = ease(t, tw.tong2 + .2, tw.bijil);
  bones.forEach((b, i) => { b.visible = t > tw.ppyeo1 - .3 + i * .05 && toBin < .999; const pile = V(2.95 + (i % 4) * .05, LT + .02 + Math.floor(i / 4) * .025, .7 + (i % 3) * .05), binP = V(3.7, LT + .2, .75);
    const k = cl(toBin * 12 / 8 - i * .05); b.position.lerpVectors(pile, binP, sm(cl(k))); b.position.y += Math.sin(Math.PI * cl(k)) * .25; b.rotation.set(0, i * .9 + k * 6, k * 4); b.scale.setScalar(Math.max(pop(t, tw.ppyeo1 - .3 + i * .05), .001)); });
  bin.visible = t > tw.tong2 - .2; bin.position.set(3.7, LT, .75); bin.scale.setScalar(Math.max(pop(t, tw.tong2 - .2), .001));
  // ---- people ----
  owner.visible = t < tw.g5; putP(owner, V(-3.35, 0, -1.3), Math.PI / 2); applyPose(owner, mixP(UP.idle, UP.cook, .8 + .2 * Math.sin(t * 3)));
  if (t >= tw.balla - .4 && t < tw.g3) applyPose(owner, mixP(UP.cook, UP.give, win(t, tw.balla - .4, tw.dalkom, .3)));
  let pose = SIT(UP.table);
  if (!home) { putP(du, V(-1.4, 0, 1.45), Math.PI);
    if (t < tw.s1) pose = SIT(mixP(UP.table, UP.eat, ease(t, tw.g1 + .2, tw.kkeopjil) * .8)), pose[13] = ease(t, tw.kkeopjil, tw.nuknuk) * .8;
    else if (t < tw.s2) pose = SIT(mixP(UP.table, UP.eat, win(t, tw.basak - .5, tw.g2 + 1, .3))), (t > tw.g2 ? (pose[13] = .7) : 0);
    else if (t < tw.g3) pose = SIT(mixP(UP.table, UP.eat, win(t, tw.dalkom - .2, tw.g3, .2))), (t > tw.maekom ? (pose[14] = 1.4) : 0);
    else if (t < tw.s3) pose = SIT(mixP(UP.table, UP.look, .8)), pose[12] = Math.sin((t - tw.g3) * 3) * .7;
    else if (t < tw.g4) pose = SIT(mixP(UP.table, UP.cheer, ease(t, tw.banban, tw.chikin2) * .6));
    else if (t < tw.s4) pose = SIT(mixP(UP.table, UP.eat, .6)), pose[13] = .8;
    else pose = SIT(mixP(UP.table, UP.cheer, ease(t, tw.gaeun - .3, tw.gaeun) * .5));
    applyPose(du, pose); }
  else if (t < tw.g7) { // lying on the sofa, phone call
    lieZ(du, V(4.7, 0, 1.35), mixP(UP.sleep, UP.remote, t > tw.jeonhwa - .3 && t < tw.wa ? 1 : 0)); du.position.y = .66; }
  else { putP(du, V(3.3, FLOOR_Y, 1.25), Math.PI); let q = UP.table;
    if (t < tw.s7) q = mixP(UP.table, UP.cold, ease(t, tw.chikinman, tw.makhyeo) * .8);
    else if (t < tw.g8) q = mixP(UP.table, UP.drink, win(t, tw.masyeo - .2, tw.g8, .3));
    else if (t < tw.chukha) q = t > tw.bijil - .2 ? mixP(UP.table, UP.give, ease(t, tw.bijil - .2, tw.bijil + .2)) : mixP(UP.table, UP.eat, .5 + .5 * Math.sin(t * 4));
    else if (t < tw.g9) q = mixP(UP.table, UP.cheer, .7 + .3 * Math.sin(t * 5));
    else q = mixP(UP.table, UP.remote, ease(t, tw.bam, tw.gopa)); if (t >= tw.g9) q[13] = .6;
    applyPose(du, FSIT(q)); }
  hotFace(du, win(t, tw.maekom - .2, tw.g3, .2) * .8);
  const hp = handPos(du, 1, V(0, -.07, .04));
  beer.position.copy(t > tw.masyeo - .3 && t < tw.g8 ? hp : V(3.5, LT, .75)); beer.scale.setScalar(Math.max(pop(t, tw.maekju - .2), .001));
  phone.visible = (t > tw.jeonhwa - .3 && t < tw.wa) || t > tw.bam - .2; phone.position.copy(hp); phone.rotation.set(0, du.rotation.y, 0);
  gloves.forEach((g, i) => { g.visible = t > tw.bijil - .1; g.position.copy(handPos(du, i, V(0, -.01, 0))); g.scale.setScalar(Math.max(pop(t, tw.bijil - .1), .001)); });
  // ---- bike ----
  const bx = t < tw.g6 ? lerp(BIKE0, BIKE1, ease(t, tw.s5, tw.g6)) : BIKE1;
  bike.visible = rider.visible = t > tw.s5 - .1 && t < tw.g7 || t > tw.chukha; bike.position.set(t > tw.chukha ? 1.0 : bx, 0, t > tw.chukha ? 3.3 : BZ); bike.rotation.y = 0;
  bike.children.slice(0, 4).forEach(o => { if (o.geometry.type === 'TorusGeometry') o.rotation.z = -t * 12; });
  putP(rider, V(bike.position.x - .05, .05, bike.position.z), Math.PI / 2); applyPose(rider, t > tw.chukha ? SIT(mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 6))) : SIT(UP.remote));
  bag.visible = t < tw.s6 + .1; dbox.visible = t > tw.tong - .3; dbox.scale.setScalar(Math.max(pop(t, tw.tong - .3), .001));
  lid.rotation.z = -1.9 * (1 - ease(t, tw.kkwak - .3, tw.kkwak + .05)) * (t > tw.chukha ? 0 : 1);
  puffUpdate(coldP, V(bx - .45, 1.0, BZ), t, win(t, tw.oneun - .2, tw.s6, .3), { size: .2, rise: .5, spread: .15, op: .5, speed: .7 });
  puffUpdate(boxSteam, V(BIKE1 - .45, 1.25, BZ), t, win(t, tw.neo - .2, tw.kkwak, .2), { size: .2, rise: .5, spread: .1, op: .6, speed: .9 });

  // ---- labels ----
  const H = () => { du.updateMatrixWorld(true); return du.userData.head.localToWorld(V(0, .55, 0)); }, h = H();
  lab(LB.chikin, win(t, tw.chikin - .1, tw.g1, .15) * pop(t, tw.chikin - .1), -2.6, 1.55, -1.3, .3);
  lab(LB.nuk, win(t, tw.nuknuk - .2, tw.s1, .15) * pop(t, tw.nuknuk - .2), -1.4, 1.05, .7, .2);
  lab(LB.n1, win(t, tw.du2 - .1, tw.deo - .1, .15) * pop(t, tw.du2 - .1), -2.9, 1.5, -1.3, .25);
  lab(LB.n2, win(t, tw.deo - .1, tw.basak - .1, .15) * pop(t, tw.deo - .1), -2.3, 1.5, -1.3, .25);
  lab(LB.bas, win(t, tw.basak - .05, tw.chokchok, .15) * pop(t, tw.basak - .05), -1.55, 1.05, .7, .16);
  lab(LB.chok, win(t, tw.chokchok - .05, tw.g2, .15) * pop(t, tw.chokchok - .05), -1.25, 1.05, .7, .16);
  lab(LB.neuk, win(t, tw.neukki1 - .3, tw.s2, .15) * pop(t, tw.neukki1 - .3), h.x, h.y, h.z, .4);
  lab(LB.dal, win(t, tw.dalkom - .1, tw.g3, .15) * pop(t, tw.dalkom - .1), h.x - .3, h.y, h.z, .35);
  lab(LB.mae, win(t, tw.maekom - .1, tw.g3, .15) * pop(t, tw.maekom - .1), h.x + .3, h.y - .1, h.z, .35);
  lab(LB.q, win(t, tw.yang2 - .3, tw.s3, .15) * pop(t, tw.yang2 - .3), h.x, h.y, h.z, .45);
  lab(LB.banban, win(t, tw.banban - .1, tw.g4, .15) * pop(t, tw.banban - .1), -1.4, 1.02, .7, .18);
  lab(LB.neuk2, win(t, tw.neukki2 - .3, tw.s4, .15) * pop(t, tw.neukki2 - .3), h.x, h.y, h.z, .4);
  lab(LB.gaeun, win(t, tw.gaeun - .2, tw.g5, .15) * pop(t, tw.gaeun - .2), h.x, h.y, h.z, .4);
  lab(LB.lazy, win(t, tw.gwichana - .3, tw.s5, .15) * pop(t, tw.gwichana - .3), 4.4, 1.3, .8, .4);
  lab(LB.m30, win(t, tw.samsip - .1, tw.g6, .15) * pop(t, tw.samsip - .1), bx, 2.3, BZ, .6);
  lab(LB.cold, win(t, tw.sigeo - .2, tw.s6, .15) * pop(t, tw.sigeo - .2), BIKE1 - .45, 1.45, BZ, .3);
  lab(LB.hot, win(t, tw.kkwak - .05, tw.g7, .15) * pop(t, tw.kkwak - .05), BIKE1 - .45, 1.55, BZ, .3);
  lab(LB.cheok, win(t, tw.makhyeo - .2, tw.s7, .15) * pop(t, tw.makhyeo - .2), h.x, h.y - .1, h.z, .35);
  lab(LB.chimaek, win(t, tw.chimaek - .1, tw.g8, .15) * pop(t, tw.chimaek - .1), 3.3, 1.55, 1.0, .5);
  lab(LB.bonepile, win(t, tw.hangadeuk - .1, tw.s8, .15) * pop(t, tw.hangadeuk - .1), 3.05, .75, .75, .16);
  lab(LB.glove, win(t, tw.bijil - .05, tw.chukha, .15) * pop(t, tw.bijil - .05), 3.3, 1.25, .8, .25);
  lab(LB.ten, win(t, tw.yeol - .1, tw.gopa - .5, .15) * pop(t, tw.yeol - .1), 3.0, 2.45, -1.9, .35);
  lab(LB.grr, ramp(t, tw.gopa - .4, tw.gopa - .2) * pop(t, tw.gopa - .4), h.x, h.y - .1, h.z, .4);
}
function lieZ(p, pos, pose) { p.position.set(pos.x, .21, pos.z); p.rotation.set(-Math.PI / 2, 0, 0); applyPose(p, pose); }
// shared tail: camera from KEYS ([t, pos, look, cut?]), post chain, renderAt
const camera = new THREE.PerspectiveCamera(42, W / H, .06, 120);
KEYS.sort((a, b) => a[0] - b[0]);
for (let i = KEYS.length - 1; i > 0; i--) if (KEYS[i][3] && KEYS[i][0] - KEYS[i - 1][0] > 2 * CUT) KEYS.splice(i, 0, [KEYS[i][0] - CUT, KEYS[i - 1][1], KEYS[i - 1][2]]);
const LOOK = new THREE.Vector3();
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); LOOK.lerpVectors(l0, l1, k); camera.lookAt(LOOK);
}
function frame(t) { Object.values(LB).forEach(s => s.visible = false); update(t); placeCamera(t); bokeh.uniforms.focus.value = camera.position.distanceTo(LOOK); }
// ---------- render: MSAA -> depth of field -> bloom -> tone map -> grade + vignette; labels on top ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 2, aperture: +(Q.get('ap') ?? .003), maxblur: +(Q.get('blur') ?? .005) });
if (Q.get('dof') !== '0') composer.addPass(bokeh);
if (Q.get('bloom') !== '0') composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 4, H / 4), .5, .6, 1.0));
composer.addPass(new OutputPass());
composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
      col = mix(col, col * vec3(1.05, 1.0, .93), .6);
      col = (col - .5) * 1.05 + .5 + .01;
      float l = dot(col, vec3(.299, .587, .114)); col = mix(vec3(l), col, 1.1);
      vec2 d = (vUv - .5) * vec2(.9, 1.0); col *= 1.0 - smoothstep(.35, .85, length(d)) * .4;
      gl_FragColor = vec4(clamp(col, 0., 1.), c.a); }` }));
window.END = END; window.TW = tw;
window.renderAt = (t, q = .93) => { frame(t); composer.render(); renderer.autoClear = false; renderer.render(overlay, camera); renderer.autoClear = true;
  return renderer.domElement.toDataURL('image/jpeg', q); };
window.__done = true;
