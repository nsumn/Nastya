import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
const DIR = 'ko06_ondol';
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
// ===================== KO 06 온돌 — cutaway: fire in the room -> agungi -> flues -> gudeuljang stones -> chimney -> araenmok -> boiler pipes -> floor bedding -> shoes off =====================
const tw = {
  chuun: TE('추운'), bul: TE('불을'), ttatteut0: TE('따뜻하지'),
  g1: G(1), yeongi: TE('연기로'), cha: TE('차'),
  s1: S(1), bakk: TE('밖에서'), gumeong: TE('구멍이'), agungi: TE('아궁이야'),
  g2: G(2), haneado: TE('하나도'), ttatteut1: TE('따뜻해', 1),
  s2: S(2), bangbadak: TE('방바닥'), bulgil: TE('불길이'), yeoreo: TE('여러'), mandeureo: TE('만들어'),
  g3: G(3), sigeo: TE('식어'),
  s3: S(3), neopjeok: TE('넓적한'), kkara: TE('깔아', 1), gudeul: TE('구들장이야'), dewo: TE('데워지면'), bamsae: TE('밤새'),
  g4: G(4), ppajyeo1: TE('빠져나갈'), eopseo1: TE('없어', 1),
  s4: S(4), gulttuk: TE('굴뚝을'), sewo: TE('세워'), jinaseo: TE('지나서'), ssuk: TE('쑥'),
  g5: G(5), jjokman: TE('쪽만'), tteugeo: TE('뜨거워'),
  s5: S(5), jeil: TE('제일'), araenmok: TE('아랫목이라고'), halabeoji: TE('할아버지가'), anja: TE('앉아'),
  g6: G(6), maeil: TE('매일'), himdeul: TE('힘들어'),
  s6: S(6), yojeum: TE('요즘은'), mul: TE('물이'), pipe: TE('파이프를'), boiler: TE('보일러'), button: TE('버튼'), kkeut: TE('끝'),
  g7: G(7), chimdae: TE('침대가'), eopseo2: TE('없어', 2),
  s7: S(7), ibul: TE('이불을'), ja: TE('자'),
  g8: G(8), sinbal1: TE('신발을', 1), deoreo: TE('더러워져'),
  s8: S(8), hyeongwan: TE('현관에서'), beoseo: TE('벗어'), hanguk: TE('한국'),
  chukha: TE('축하해'), ondol: TE('온돌을'), g9: G(9), gyeoul: TE('겨울엔'), ttak: TE('딱'), ileona: TE('일어나') };

// ---------- sound ----------
SFX.beds.push([0, END, 'wind', .25], [tw.bul, tw.s6, 'fire', .35]);
e(.05, 'whoosh', .4); e(tw.bul, 'poof', .8); e(tw.ttatteut0, 'sparkle', .5);
e(tw.yeongi, 'poof', .8); e(tw.cha, 'boing', .5); e(tw.bakk, 'whoosh', .6); e(tw.agungi, 'ding', .6);
e(tw.ttatteut1, 'brr', .7); for (let k = 0; k < 4; k++) e(tw.bulgil + k * .3, 'swoosh_up', .4); e(tw.sigeo, 'brr', .5);
for (let k = 0; k < 6; k++) e(tw.kkara - .3 + k * .12, 'clack', .6); e(tw.gudeul, 'ding', .6); e(tw.dewo, 'sparkle', .6);
e(tw.eopseo1, 'boing', .5); e(tw.gulttuk, 'swoosh_up', .8); e(tw.ssuk, 'whoosh', .8);
e(tw.tteugeo, 'boing', .6); e(tw.araenmok, 'ding', .7); e(tw.halabeoji, 'pop', .6);
e(tw.himdeul, 'clack', .5); e(tw.pipe, 'swoosh_up', .7); e(tw.button, 'tick', .9); e(tw.kkeut, 'ding', .8);
e(tw.chimdae, 'pop', .6); e(tw.eopseo2, 'poof', .8); e(tw.ibul, 'whoosh', .6);
for (let k = 0; k < 6; k++) e(tw.deoreo - .5 + k * .15, 'stamp', .4); e(tw.beoseo, 'clack', .6); e(tw.hanguk, 'ding', .5);
e(tw.chukha, 'tada', .9); e(tw.ttak, 'clack', .8);

// ---------- set: raised room over the flues (cutaway at the front) ----------
const FY = .8, RX = 1.55, RZ = 1.5;
const stoneM = texMat(TX_CON, '#8a8078', 2, 1, { ns: .8 }), plasterM = M('#efe6d2', { roughness: .9 }), beamM = M('#6a4426', { roughness: .7 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), M('#dfe6ee', { roughness: .9 })); ground.position.y = -.02; scene.add(ground);
box(RX * 2 + .2, .12, RZ * 2, stoneM, 0, .06, 0, false);   // footing
box(RX * 2 + .2, FY, .2, stoneM, 0, FY / 2, -RZ - .1, false);
// flues: 4 channels along x separated by stone ridges
const ridges = [-1.3, -.55, .2, .95].map(z => box(RX * 2, FY - .2, .2, stoneM, 0, (FY - .2) / 2 + .12, z, true));
const frontLight = new THREE.PointLight('#ffd8b0', 4, 7, 1.0); frontLight.position.set(0, .7, 3.2); scene.add(frontLight);
box(.2, FY, RZ * 2, stoneM, -RX - .1, FY / 2, 0, false);
// gudeuljang stones (flat slabs) + floor paper (jangpan)
const slabs = []; for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 5; iz++) { const m = new THREE.MeshStandardMaterial({ color: '#7a726a', roughness: .85, emissive: '#ff5a1a', emissiveIntensity: 0 });
  const s = box(.5, .07, .58, m, -RX + .26 + ix * .5, FY - .04, -RZ + .3 + iz * .6, true); s.rotation.y = rr(-.04, .04); s.userData = { ix, iz, m }; slabs.push(s); }
const floorCan = cv(256, 256), floorTex = new THREE.CanvasTexture(floorCan[0]); floorTex.colorSpace = THREE.SRGBColorSpace;
function drawFloor(hot, araen) { const g = floorCan[1]; const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, `rgb(${200 + 55 * araen},${150 - 40 * araen},${80 - 30 * araen})`); gr.addColorStop(.45, `rgb(${200 + 30 * hot},${160},${90})`); gr.addColorStop(1, `rgb(${196},${160 - 10 * hot},${96})`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(120,80,30,.35)'; g.lineWidth = 2; for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } for (let y = 0; y <= 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  floorTex.needsUpdate = true; }
const paper = box(RX * 2, .03, RZ * 2, new THREE.MeshStandardMaterial({ map: floorTex, roughness: .25, emissive: '#ff6a2a', emissiveIntensity: 0 }), 0, FY + .015, 0, false);
const coldFloor = box(RX * 2, .06, RZ * 2, M('#a89880', { roughness: .9 }), 0, FY - .03, 0, false);
// walls (back + sides, hanok beams and paper window)
box(RX * 2 + .2, 2.3, .1, plasterM, 0, FY + 1.15, -RZ - .05, false); box(.1, 2.3, RZ * 2, plasterM, -RX - .05, FY + 1.15, 0, false); box(.1, 2.3, RZ * 2, plasterM, RX + .05, FY + 1.15, 0, false);
for (const x of [-RX, 0, RX]) box(.12, 2.3, .12, beamM, x, FY + 1.15, -RZ + .02, false); box(RX * 2 + .3, .14, .14, beamM, 0, FY + 2.3, -RZ + .02, false);
const latticeTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#fbf3dc'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#7a5030'; g.lineWidth = 6; for (let i = 0; i <= 256; i += 42) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const windowM = new THREE.MeshStandardMaterial({ map: latticeTex, emissive: '#ffd8a0', emissiveMap: latticeTex, emissiveIntensity: .25, roughness: .9 });
const win_ = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .9), windowM); win_.position.set(-.75, FY + 1.35, -RZ + .01); scene.add(win_);
// agungi (fire mouth) in a kitchen block on the left, iron pot on top
const kitchen = new THREE.Group(); scene.add(kitchen); kitchen.position.set(-2.45, 0, 0);
box(1.6, FY, 1.8, stoneM, 0, FY / 2, -.4, true, kitchen);
{ const mouth = new THREE.Mesh(new THREE.CircleGeometry(.28, 24, 0, Math.PI), M('#0a0604', { roughness: 1 })); mouth.position.set(.2, .12, .51); kitchen.add(mouth);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(.38, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#2a2624', { metalness: .6, roughness: .5 })); pot.position.set(.0, FY + .3, -.4); pot.castShadow = true; kitchen.add(pot);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.36, .4, .06, 24), M('#3a3430', { metalness: .5, roughness: .5 })); lid.position.set(0, FY + .32, -.4); kitchen.add(lid); }
const AG = V(-2.25, .25, .55);
// chimney on the right
const chimney = new THREE.Group(); scene.add(chimney); chimney.position.set(2.2, 0, -.9);
box(.5, 3.4, .5, stoneM, 0, 1.7, 0, true, chimney); box(.6, .12, .6, beamM, 0, 3.45, 0, true, chimney); box(.7, .5, .7, stoneM, -.2, .25, 0, true, chimney);
// fire (in the room at first, then in the agungi), flame sprites through the flues, smoke
function fire() { const g = new THREE.Group(); for (const [r, l, c] of [[.16, .45, '#ff5a1a'], [.1, .32, '#ffc02a']]) { const f = new THREE.Mesh(new THREE.ConeGeometry(r, l, 10), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .9 })); f.position.y = l / 2; g.add(f); }
  for (let i = 0; i < 4; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .4, 8).rotateZ(Math.PI / 2), M('#5a3a20')); lg.rotation.y = i * .8; lg.position.y = .03; g.add(lg); } scene.add(g); return g; }
const roomFire = fire(), agFire = fire(); agFire.scale.setScalar(.7);
const fireLight = new THREE.PointLight('#ff8a3a', 0, 4, 1.5); scene.add(fireLight);
const glowTex = (() => { const [c, g] = cv(64, 64); const r = g.createRadialGradient(32, 32, 1, 32, 32, 30); r.addColorStop(0, 'rgba(255,240,180,1)'); r.addColorStop(.4, 'rgba(255,140,40,.8)'); r.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const LANES = [-.9, -.15, .6, 1.3];
const flames = Array.from({ length: 36 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.userData = { lane: i % 4, ph: (i * .137) % 1 }; scene.add(s); return s; });
const smokeFlow = Array.from({ length: 24 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#8a8a8a', transparent: true, depthWrite: false })); s.userData = { lane: i % 4, ph: (i * .211) % 1 }; scene.add(s); return s; });
const roomSmoke = puffs(16, '#9a9a9a'), agSmoke = puffs(10, '#8a8a8a'), chimSmoke = puffs(10, '#b0b0b0');
// modern: pipes + boiler
const pipeM = new THREE.MeshStandardMaterial({ color: '#d83a2a', roughness: .35, emissive: '#ff3a1a', emissiveIntensity: 0 });
const pipeCurve = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => V(i % 2 ? 1.25 : -1.25, FY - .1, -1.2 + i * .3)).flatMap((p, i, a) => i < a.length - 1 ? [p, V(i % 2 ? 1.4 : -1.4, FY - .1, p.z + .15)] : [p]), false, 'catmullrom', .2);
const heatPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 240, .035, 8), pipeM); heatPipe.castShadow = true; scene.add(heatPipe);
const waterDots = Array.from({ length: 40 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.userData.ph = i / 40; scene.add(s); return s; });
const boiler = new THREE.Group(); scene.add(boiler); boiler.position.set(1.0, FY + 1.5, -RZ + .12);
box(.4, .3, .08, M('#f4f4f4', { roughness: .4 }), 0, 0, 0, true, boiler);
const bScreen = new THREE.Mesh(new THREE.PlaneGeometry(.22, .1), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: textTex(['난방 ON'], 256, 110, '#0a3a1a', '#7cf07c', 60), emissiveIntensity: 0 })); bScreen.position.set(-.04, .05, .041); boiler.add(bScreen);
const bBtn = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .02, 16).rotateX(Math.PI / 2), M('#e83a3a', { roughness: .3 })); bBtn.position.set(.12, -.06, .045); boiler.add(bBtn);
// bed, quilt, shoes, footprints, firewood
const bed = new THREE.Group(); scene.add(bed); bed.position.set(.35, FY, -.6);
box(1.0, .4, 1.9, M('#8a5a34', { roughness: .6 }), 0, .2, 0, true, bed); box(.95, .15, 1.85, M('#f4f4f8', { roughness: .8 }), 0, .47, 0, true, bed); box(.4, .1, .25, M('#e8e8f0'), 0, .58, -.75, true, bed);
const quiltTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#d83a6a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 30; i++) { g.fillStyle = ['#ffd04a', '#5ac8a0', '#ffffff'][i % 3]; g.beginPath(); g.arc(rr(0, 256), rr(0, 256), rr(8, 18), 0, 7); g.fill(); } g.strokeStyle = '#ffe0a0'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 246); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const quilt = box(1.0, .1, 1.5, new THREE.MeshStandardMaterial({ map: quiltTex, roughness: .9 }), 0, FY + .12, .3, true);
const yo = box(1.05, .06, 1.95, M('#f6f0e6', { roughness: .9 }), 0, FY + .04, .05, true);
const shoes = [0, 1, 2, 3].map(i => { const g = new THREE.Group(); const m = M(i < 2 ? '#2a2a3a' : '#c8c8d0', { roughness: .6 }); const s = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .14, 4, 10).rotateX(Math.PI / 2), m); s.scale.y = .7; g.add(s); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(g); return g; });
const step = box(.8, .35, .5, stoneM, .9, .175, RZ + .35, true);
const prints = Array.from({ length: 8 }, (_, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(.06, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#4a3020', transparent: true, opacity: .75 })); m.scale.set(.7, 1, 1.4); m.position.set(.9 - (i % 2) * .16 - i * .05, FY + .035, 1.2 - i * .22); scene.add(m); return m; });
const logs = Array.from({ length: 4 }, (_, i) => { const l = cyl(.05, .05, .5, M('#7a5232', { roughness: .8 }), 0, 0, 0, 10); return l; });
// snow outside
const snow = Array.from({ length: 70 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, depthWrite: false })); s.userData = { x: rr(-4.5, 4.5), z: rr(-3, 3), ph: rnd() }; if (Math.abs(s.userData.x) < 1.8 && Math.abs(s.userData.z) < 1.8) s.userData.x += 3.6 * Math.sign(s.userData.x || 1); scene.add(s); return s; });

// ---------- people ----------
const du = person('#3f8f6a', { long: true }), grandpa = person('#f2efe6', { hair: '#c8c8c8', long: true }), kid = person('#e8b03a');
kid.scale.setScalar(.68);
const RF = (x, z) => V(x, FY, z);

// ---------- labels ----------
const LB = { warm: label('따뜻~', 1, '#ffb070'), cough: label('콜록!', 1, '#cfcfcf'), agungi: label('아궁이', 1, '#ffb070'), cold: label('추워...', 1, '#8fd8ff'), gorae: label('불길', 1, '#ff8a4a'),
  cool: label('식어...', 1, '#8fd8ff'), gudeul: label('구들장'), night: label('밤새 따뜻', 1, '#ff8a4a'), q: label('?', 1, '#ffffff'), gulttuk: label('굴뚝'),
  hot: label('앗 뜨거!', 1, '#ff6a5a'), araen: label('아랫목', 1, '#ff8a4a'), hard: label('힘들어...', 1, '#8fb0ff'), boiler: label('보일러', 1, '#ffffff'), done: label('끝!'),
  nobed: label('침대 필요 없음', 1, '#ff6a5a'), ibul: label('이불', 1, '#ff8ab0'), dirty: label('더러워!', 1, '#c8a070'), hyeon: label('현관'), ttak: label('딱!') };
for (const s of Object.values(LB)) overlay.add(s);

// ---------- camera ----------
const KEYS = [
  [0, V(0, 1.9, 4.6), V(0, 1.3, -.3)], [tw.g1, V(0, 1.85, 4.2), V(0, 1.35, -.3)],
  [tw.g1 + CUT, V(.3, 2.0, 3.8), V(0, 1.6, -.3), 1], [tw.s1, V(.3, 1.98, 3.6), V(0, 1.6, -.3)],
  [tw.s1 + CUT, V(-1.6, 1.2, 2.9), V(-2.2, .45, .4), 1], [tw.g2, V(-1.65, 1.15, 2.7), V(-2.2, .45, .4)],
  [tw.g2 + CUT, V(.3, 1.9, 3.8), V(0, 1.5, -.4), 1], [tw.s2, V(.3, 1.88, 3.6), V(0, 1.5, -.4)],
  [tw.s2 + CUT, V(-.5, .7, 4.4), V(0, .45, .8), 1], [tw.g3, V(-.3, .68, 4.0), V(0, .45, .8)],
  [tw.g3 + CUT, V(.3, 1.8, 4.2), V(.2, 1.1, 0), 1], [tw.s3, V(.3, 1.78, 4.0), V(.2, 1.1, 0)],
  [tw.s3 + CUT, V(-.3, 3.4, 3.0), V(-.3, .8, -.2), 1], [tw.dewo - .1, V(-.3, 3.3, 2.8), V(-.3, .8, -.2)],
  [tw.dewo + CUT, V(-.3, 1.6, 4.0), V(0, .9, 0), 1], [tw.g4, V(-.3, 1.58, 3.8), V(0, .9, 0)],
  [tw.g4 + CUT, V(-1.4, 1.1, 3.0), V(-1.9, .45, .2), 1], [tw.s4, V(-1.42, 1.08, 2.8), V(-1.9, .45, .2)],
  [tw.s4 + CUT, V(.6, 1.9, 6.6), V(.6, 1.5, -.5), 1], [tw.jinaseo, V(.6, 1.9, 6.2), V(.6, 1.5, -.5)], [tw.ssuk, V(1.6, 2.6, 4.8), V(2.2, 3.0, -.9)], [tw.g5, V(1.6, 2.65, 4.6), V(2.2, 3.1, -.9)],
  [tw.g5 + CUT, V(-.5, 2.1, 4.4), V(-.9, 1.5, -.2), 1], [tw.s5, V(-.5, 2.08, 4.2), V(-.9, 1.5, -.2)],
  [tw.s5 + CUT, V(-.4, 1.8, 3.4), V(-.9, 1.25, -.4), 1], [tw.g6, V(-.45, 1.75, 3.2), V(-.9, 1.25, -.4)],
  [tw.g6 + CUT, V(-1.0, 1.9, 5.0), V(-2.0, 1.2, .8), 1], [tw.s6, V(-1.05, 1.88, 4.8), V(-2.0, 1.2, .8)],
  [tw.s6 + CUT, V(0, 3.4, 2.6), V(0, .8, -.2), 1], [tw.boiler - .1, V(0, 3.3, 2.4), V(0, .8, -.2)],
  [tw.boiler + CUT, V(1.25, 2.2, .3), V(1.0, 2.3, -1.4), 1], [tw.g7, V(1.27, 2.18, .2), V(1.0, 2.3, -1.4)],
  [tw.g7 + CUT, V(.4, 2.0, 3.6), V(.2, 1.3, -.4), 1], [tw.s7, V(.4, 1.98, 3.4), V(.2, 1.3, -.4)],
  [tw.s7 + CUT, V(.2, 2.4, 2.9), V(0, 1.0, .2), 1], [tw.g8, V(.2, 2.35, 2.7), V(0, 1.0, .2)],
  [tw.g8 + CUT, V(.3, 2.1, 4.0), V(.5, 1.0, .6), 1], [tw.s8, V(.3, 2.08, 3.8), V(.5, 1.0, .6)],
  [tw.s8 + CUT, V(2.8, 1.4, 3.7), V(.9, .6, 1.9), 1], [tw.chukha, V(2.75, 1.38, 3.6), V(.9, .6, 1.9)],
  [tw.chukha + CUT, V(.0, 2.4, 7.4), V(0, 1.3, -.2), 1], [tw.g9, V(0, 2.3, 6.8), V(0, 1.3, -.2)],
  [tw.g9 + CUT, V(.2, 2.6, 2.6), V(0, .9, -.1), 1], [END, V(.2, 2.5, 2.4), V(0, .9, -.1)]];

// ---------- timeline ----------
function update(t) {
  scene.background = skyTex.cache || (skyTex.cache = skyTex('#05081a', '#121a38', '#2a3058', true));
  hemi.color.set('#8a9ac8'); hemi.groundColor.set('#3a3028'); hemi.intensity = .55; sun.color.set('#b8c8ff'); sun.intensity = .55; fill.intensity = .15; scene.environmentIntensity = .15;
  const warmRoom = t < tw.g1 + .6 || t > tw.dewo; const lampK = t > tw.s6 ? 1 : .5;
  windowM.emissiveIntensity = .3 + .3 * lampK;
  // ---- fire ----
  const inRoom = t > tw.bul - .3 && t < tw.s1 + .2;
  roomFire.visible = inRoom; roomFire.position.copy(RF(0, .35)); roomFire.scale.setScalar(Math.max(pop(t, tw.bul - .3), .001) * (1 + .08 * Math.sin(t * 20)));
  const agOn = t > tw.bakk - .3 && t < tw.s6 + .5; agFire.visible = agOn; agFire.position.copy(AG).add(V(0, -.2, -.1)); agFire.scale.setScalar(.6 * Math.max(pop(t, tw.bakk - .3), .001) * (1 + .1 * Math.sin(t * 22)));
  fireLight.position.copy(inRoom ? RF(0, .2).add(V(0, .5, 0)) : AG.clone().add(V(0, .3, .3))); fireLight.intensity = inRoom ? 3 : agOn ? 2.2 : 0;
  puffUpdate(roomSmoke, RF(0, .2).add(V(0, .3, 0)), t, win(t, tw.g1 - .2, tw.s1 + .4, .4), { size: .9, rise: 1.6, spread: 1.0, op: .55, speed: .6 });
  puffUpdate(agSmoke, AG.clone().add(V(0, .3, .1)), t, win(t, tw.ppajyeo1 - .5, tw.sewo, .3), { size: .45, rise: 1.0, spread: .3, op: .6 });
  // ---- flues ----
  const flow = t > tw.bulgil - .2 && t < tw.s6 + .3; const stuck = t > tw.g4 - .3 && t < tw.sewo;
  flames.forEach((s, i) => { const u = s.userData; s.visible = flow && (u.lane < 1 || t > tw.yeoreo - .2 + u.lane * .15); if (!s.visible) return;
    const a = (t * .35 + u.ph) % 1, lim = stuck ? .5 : 1; s.position.set(lerp(-1.75, lerp(-1.75, 1.7, lim), a), .45 + Math.sin(t * 6 + i) * .05, LANES[u.lane]);
    s.scale.setScalar(.28 * (1 - a * .5) * (t < tw.dewo && t > tw.g3 ? .45 : 1)); s.material.opacity = .9 * (1 - a * .6); });
  smokeFlow.forEach((s, i) => { const u = s.userData; s.visible = t > tw.jinaseo - .4 && t < tw.s6 + .3; if (!s.visible) return; const a = (t * .3 + u.ph) % 1;
    if (a < .75) s.position.set(lerp(-1.5, 1.95, a / .75), .5, LANES[u.lane]); else s.position.set(2.2, lerp(.5, 1.0, (a - .75) / .25), -.9); s.scale.setScalar(.22); s.material.opacity = .35; });
  puffUpdate(chimSmoke, V(2.2, 3.55, -.9), t, t > tw.ssuk - .3 && t < tw.s6 + .5 ? 1 : 0, { size: .5, rise: 1.3, spread: .15, op: .5, drift: V(.4, 0, 0) });
  // ---- stones, floor heat ----
  const stonesK = (s) => pop(t, tw.kkara - .5 + (s.userData.ix + s.userData.iz) * .05, .25);
  const stoneHot = ease(t, tw.dewo - .2, tw.bamsae + .3) * (t < tw.s6 + .5 ? 1 : 1 - ease(t, tw.s6, tw.s6 + .8));
  slabs.forEach(s => { s.visible = t > tw.kkara - .55 && t < tw.pipe - .2; s.scale.setScalar(Math.max(stonesK(s), .001)); s.position.y = FY - .04 + (1 - cl(stonesK(s))) * .5;
    const araen = s.userData.ix < 2 && t > tw.g5 - .3 ? ease(t, tw.g5, tw.tteugeo) : 0; s.userData.m.emissiveIntensity = (stoneHot * .55 + araen * .6) * (.85 + .15 * Math.sin(t * 2 + s.userData.ix)); });
  const paperOn = t > tw.dewo + .2 && !(t > tw.s6 + .2 && t < tw.kkeut); paper.visible = paperOn; coldFloor.visible = !paperOn && t < tw.kkara;
  const flueHot = t > tw.bulgil && t < tw.g3 + .2 ? 1 - ease(t, tw.g3, tw.sigeo + .3) : 0;
  coldFloor.material.emissive = coldFloor.material.emissive || new THREE.Color(); coldFloor.material.emissive.set('#ff5a1a'); coldFloor.material.emissiveIntensity = flueHot * .35;
  const araenK = t > tw.g5 - .3 ? ease(t, tw.g5, tw.tteugeo) * (t > tw.s6 ? 1 - ease(t, tw.s6, tw.pipe) : 1) : 0;
  drawFloor(t > tw.pipe ? .6 : stoneHot * .5, araenK); paper.material.emissiveIntensity = t > tw.kkeut ? .12 : araenK * .05;
  // ---- chimney ----
  chimney.visible = t > tw.gulttuk - .3; chimney.scale.set(1, Math.max(ease(t, tw.gulttuk - .3, tw.sewo + .2), .001), 1);
  // ---- modern ----
  const pk = ease(t, tw.pipe - .4, tw.pipe + .3); heatPipe.visible = pk > .01; heatPipe.scale.set(1, 1, 1); heatPipe.material.opacity = 1; pipeM.emissiveIntensity = t > tw.button ? .35 : 0;
  heatPipe.geometry.setDrawRange(0, Math.floor(heatPipe.geometry.index.count * pk / 3) * 3);
  ridges.forEach(r => r.visible = t < tw.pipe - .2);
  waterDots.forEach((s, i) => { s.visible = t > tw.button; if (!s.visible) return; const a = (t * .12 + s.userData.ph) % 1; s.position.copy(pipeCurve.getPointAt(a)); s.scale.setScalar(.09); s.material.color.set('#ffb08a'); });
  boiler.visible = t > tw.boiler - .3; boiler.scale.setScalar(Math.max(pop(t, tw.boiler - .3), .001)); bScreen.material.emissiveIntensity = t > tw.button + .1 ? 1.2 : .1; bBtn.position.z = t > tw.button && t < tw.button + .25 ? .035 : .045;
  agFire.visible = agFire.visible && t < tw.s6 + .5;
  // ---- bed / quilt / shoes ----
  bed.visible = t > tw.chimdae - .2 && t < tw.eopseo2 + .3; bed.scale.setScalar(Math.max(pop(t, tw.chimdae - .2), .001) * (1 - ease(t, tw.eopseo2 - .1, tw.eopseo2 + .3)) + .001);
  yo.visible = quilt.visible = t > tw.ibul - .3; const qk = ease(t, tw.ibul - .3, tw.ibul + .3); yo.scale.set(1, 1, Math.max(qk, .001)); quilt.scale.set(1, 1, Math.max(qk, .001));
  quilt.position.set(0, FY + .12 + (t > tw.ja - .3 ? .05 : 0), .35);
  prints.forEach((p, i) => p.visible = t > tw.deureo0() + i * .12 && t < tw.s8 + .3);
  const shoesOn = t < tw.beoseo - .1;
  // ---- people ----
  du.visible = true; let pose = UP.idle;
  if (t < tw.s2) { // sitting on the floor by the fire, then cold
    putP(du, V(0, FY + FLOOR_Y, -.75), 0); pose = t < tw.g1 ? mixP(UP.idle, UP.warm, ease(t, tw.bul, tw.ttatteut0)) : t < tw.s1 ? mixP(UP.idle, UP.cold, .7) : t < tw.g2 ? UP.idle : mixP(UP.idle, UP.cold, ease(t, tw.g2, tw.ttatteut1));
    if (t >= tw.g1 && t < tw.s1) pose[11] = .3 + Math.sin(t * 14) * .1; applyPose(du, FSIT(pose)); }
  else if (t < tw.s5) { putP(du, t >= tw.s3 && t < tw.s4 ? V(.95, FY + FLOOR_Y, -.95) : V(.3, FY + FLOOR_Y, .2), 0); pose = t < tw.s3 ? mixP(UP.idle, UP.cold, ease(t, tw.g3, tw.sigeo)) : t < tw.g4 ? mixP(UP.idle, UP.warm, ease(t, tw.dewo, tw.bamsae)) : t < tw.s4 ? mixP(UP.idle, UP.look, .7) : UP.idle;
    if (t > tw.g5 - .2) { putP(du, V(-1.0, FY, .4), 0); const hop = Math.abs(Math.sin((t - tw.g5) * 7)); du.position.y += hop * .15; pose = mixP(UP.idle, UP.hot, .7); applyPose(du, pose); }
    else applyPose(du, FSIT(pose)); }
  else if (t < tw.g6) { putP(du, V(.6, FY + FLOOR_Y, .5), -.4); applyPose(du, FSIT(mixP(UP.idle, UP.look, .3))); }
  else if (t < tw.s6) { const k = ease(t, tw.g6, tw.himdeul); putP(du, V(lerp(-2.6, -2.0, k), 0, 1.3), Math.PI / 2 + .3); applyPose(du, mixP(WALK(UP.give, t * 6, .3), UP.give, .5)); }
  else if (t < tw.g7) { putP(du, V(.25, FY, -.9), -2.4); applyPose(du, t > tw.boiler - .3 ? mixP(UP.idle, UP.remote, ease(t, tw.boiler - .3, tw.button)) : UP.idle); }
  else if (t < tw.s7) { putP(du, V(-.8, FY, .4), .4); applyPose(du, mixP(UP.idle, UP.look, ease(t, tw.chimdae, tw.eopseo2))); }
  else if (t < tw.g8) { lieZ(du, V(0, FY, 1.2), UP.sleep); }
  else if (t < tw.chukha) { const k = ease(t, tw.g8, tw.deoreo); const p = V(lerp(.9, .6, k), FY, lerp(2.2, -.3, k)); if (t < tw.s8) { putP(du, k < .02 ? V(.9, .35, RZ + .4) : p, Math.PI); applyPose(du, k > 0 && k < 1 ? WALK(UP.idle, t * 10) : UP.look); }
    else { putP(du, V(.9, .35, RZ + .4), Math.PI); applyPose(du, mixP(UP.idle, UP.give, win(t, tw.hyeongwan, tw.beoseo + .3, .25))); } }
  else if (t < tw.g9) { putP(du, V(.2, FY, .2), 0); applyPose(du, mixP(UP.idle, UP.cheer, .6 + .4 * Math.sin(t * 6))); }
  else lieZ(du, V(.1, FY, 1.2), UP.sleep);
  if (t >= tw.g8 && t < tw.chukha) { du.position.y = du.position.y; }
  // shoes: on du's feet until the step, then neatly on the step
  shoes.forEach((s, i) => { if (i < 2) { s.visible = t > tw.g8 - .1 && t < tw.g9; if (shoesOn) { du.updateMatrixWorld(true); s.position.copy(du.userData.kn[i].localToWorld(V(0, -.45, .05))); s.rotation.set(0, du.rotation.y, 0); }
      else { s.position.set(.82 + i * .16, .37, RZ + .5); s.rotation.set(0, 0, 0); } } else { s.visible = t > tw.hanguk - .2; s.position.set(.6 + (i - 2) * .14 + .5 * (i - 2), .37, RZ + .5); } });
  grandpa.visible = t > tw.halabeoji - .25; grandpa.scale.setScalar(Math.max(pop(t, tw.halabeoji - .25), .001));
  if (t < tw.g9) { putP(grandpa, V(-1.15, FY + FLOOR_Y, -.4), .4); applyPose(grandpa, FSIT(mixP(UP.idle, UP.warm, .8))); } else lieZ(grandpa, V(-.9, FY, .9), UP.sleep);
  kid.visible = t > tw.chukha - .2; if (t < tw.g9) { putP(kid, V(-.3, FY + FLOOR_Y * .68, .9), 0); applyPose(kid, FSIT(mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 5)))); } else { kid.position.set(1.0, FY + .21 * .68, .9); kid.rotation.set(-Math.PI / 2, 0, 0); applyPose(kid, UP.sleep); }
  logs.forEach((l, i) => { l.visible = t > tw.g6 - .2 && t < tw.s6; if (!l.visible) return; const hp = handPos(du, 0); l.position.copy(hp).add(V(0, .05 + i * .1, 0)); l.rotation.set(0, du.rotation.y, Math.PI / 2); });
  // snow
  snow.forEach((s, i) => { const u = s.userData, a = (t * .12 + u.ph) % 1; s.position.set(u.x + Math.sin(t + i) * .2, 4 - a * 4, u.z); s.scale.setScalar(.06); s.material.opacity = .9; });

  // ---- labels ----
  const H = c => { c.updateMatrixWorld(true); return c.userData.head.localToWorld(V(0, .55, 0)); }, h = H(du);
  lab(LB.warm, win(t, tw.ttatteut0 - .2, tw.g1, .15) * pop(t, tw.ttatteut0 - .2), 0, FY + 1.2, .2, .4);
  lab(LB.cough, win(t, tw.cha - .3, tw.s1, .15) * pop(t, tw.cha - .3), h.x, h.y, h.z, .4);
  lab(LB.agungi, win(t, tw.agungi - .2, tw.g2, .15) * pop(t, tw.agungi - .2), -2.25, 1.0, .6, .3);
  lab(LB.cold, win(t, tw.ttatteut1 - .4, tw.s2, .15) * pop(t, tw.ttatteut1 - .4), h.x, h.y, h.z, .4);
  lab(LB.gorae, win(t, tw.bulgil, tw.g3, .15) * pop(t, tw.bulgil), .0, .95, 1.4, .22);
  lab(LB.cool, win(t, tw.sigeo - .2, tw.s3, .15) * pop(t, tw.sigeo - .2), .0, FY + .5, .6, .35);
  lab(LB.gudeul, win(t, tw.gudeul - .1, tw.dewo, .15) * pop(t, tw.gudeul - .1), 0, FY + .35, .3, .35);
  lab(LB.night, win(t, tw.bamsae - .2, tw.g4, .15) * pop(t, tw.bamsae - .2), 0, FY + .6, .6, .35);
  lab(LB.q, win(t, tw.eopseo1 - .3, tw.s4, .15) * pop(t, tw.eopseo1 - .3), -1.9, 1.3, .4, .35);
  lab(LB.gulttuk, win(t, tw.sewo - .1, tw.jinaseo, .15) * pop(t, tw.sewo - .1), 2.2, 2.3, -.5, .45);
  lab(LB.hot, win(t, tw.tteugeo - .3, tw.s5, .15) * pop(t, tw.tteugeo - .3), h.x, h.y, h.z, .4);
  lab(LB.araen, win(t, tw.araenmok - .1, tw.g6, .15) * pop(t, tw.araenmok - .1), -1.1, FY + .25, .6, .35);
  lab(LB.hard, win(t, tw.himdeul - .3, tw.s6, .15) * pop(t, tw.himdeul - .3), h.x, h.y, h.z, .4);
  lab(LB.boiler, win(t, tw.boiler - .1, tw.kkeut, .15) * pop(t, tw.boiler - .1), 1.0, FY + 1.85, -1.35, .14);
  lab(LB.done, win(t, tw.kkeut - .05, tw.g7, .15) * pop(t, tw.kkeut - .05), 1.0, FY + 1.85, -1.35, .16);
  lab(LB.nobed, win(t, tw.eopseo2 - .2, tw.s7, .15) * pop(t, tw.eopseo2 - .2), .35, FY + 1.2, -.5, .3);
  lab(LB.ibul, win(t, tw.ibul, tw.g8, .15) * pop(t, tw.ibul), 0, FY + .6, .3, .35);
  lab(LB.dirty, win(t, tw.deoreo - .2, tw.s8, .15) * pop(t, tw.deoreo - .2), .5, FY + .5, .6, .35);
  lab(LB.hyeon, win(t, tw.hyeongwan - .1, tw.chukha, .15) * pop(t, tw.hyeongwan - .1), .9, .75, RZ + .4, .2);
  lab(LB.ttak, ramp(t, tw.ttak - .2, tw.ttak) * pop(t, tw.ttak - .2), 0, FY + .7, .6, .45);
}
tw.deureo0 = () => tw.g8 + .9;
function lieZ(p, pos, pose) { p.position.set(pos.x, pos.y + .21 * p.scale.y, pos.z); p.rotation.set(-Math.PI / 2, 0, 0); applyPose(p, pose); }
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
