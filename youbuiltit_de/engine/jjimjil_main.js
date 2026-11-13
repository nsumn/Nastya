import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
const DIR = 'ko04_jjimjil';
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
// ===================== KO 04 찜질방 — clay dome, uniforms, sheep-head towel, bamboo mat, sikhye, baked eggs, ice room, TV, sleeping =====================
const tw = {
  hwangto: TE('황토로'), bang: TE('방에'), deureo: TE('들어가면'),
  g1: G(1), ot: TE('옷이'), jeojeo: TE('젖어'),
  s1: S(1), ipgu: TE('입구에서'), bok: TE('찜질복을'), nanwo: TE('나눠'), banpal: TE('반팔에'), pink: TE('분홍색'), orange: TE('주황색이야'),
  g2: G(2), meori: TE('머리가'), tteugeo1: TE('뜨거워'),
  s2: S(2), sugeon: TE('수건을'), doldol: TE('돌돌'), yang: TE('양머리를'),
  g3: G(3), badak: TE('바닥이'), eopseo: TE('없어'),
  s3: S(3), daenamu: TE('대나무'), dotjari: TE('돗자리를'), kkara: TE('깔아'), nuwo: TE('누워도'),
  g4: G(4), heullyeo: TE('흘려서'), malla: TE('말라'),
  s4: S(4), sikhye: TE('식혜를'), masyeo: TE('마셔'), sareoreum: TE('살얼음이'), dongdong: TE('동동'),
  g5: G(5), gopa: TE('고파'),
  s5: S(5), dol: TE('돌에'), maekban: TE('맥반석'), gyeran: TE('계란을'), ima: TE('이마에'), tok: TE('톡'), gukrul: TE('국룰이야'), sikhye2: TE('식혜랑'), kkok: TE('꼭'),
  g6: G(6), tteugeo2: TE('뜨거워졌어'),
  s6: S(6), chagaun: TE('차가운'), eoreum: TE('얼음방을'), deureoja: TE('들어가자마자'), ssok: TE('쏙'),
  g7: G(7), honja: TE('혼자'), simsim: TE('심심해'),
  s7: S(7), gajok: TE('가족이랑'), chingu: TE('친구랑'), tv: TE('텔레비전'), drama: TE('드라마를'),
  g8: G(8), gwichana: TE('귀찮아'),
  s8: S(8), badake: TE('바닥에'), ja: TE('자'), bamsae: TE('밤새'), datgeo: TE('닫거든'),
  chukha: TE('축하해'), jjimjil: TE('찜질방을'), g9: G(9), jip: TE('집보다'), jal: TE('잘') };

// ---------- sound ----------
SFX.beds.push([0, tw.s1, 'fire', .25], [tw.s7, tw.s8, 'pub', .3]);
e(.05, 'whoosh', .4); e(tw.hwangto, 'poof', .6); e(tw.jeojeo, 'splash', .5);
e(tw.bok, 'poof', .8); e(tw.pink, 'pop', .6); e(tw.orange, 'pop', .6);
e(tw.tteugeo1, 'boing', .5); e(tw.doldol, 'swoosh_up', .7); e(tw.yang, 'sparkle', .7);
for (let k = 0; k < 4; k++) e(tw.badak + k * .4, 'boing', .5);
e(tw.dotjari, 'whoosh', .7); e(tw.nuwo, 'clack', .5);
e(tw.malla, 'boing', .4); e(tw.sikhye, 'splash', .6); e(tw.sareoreum, 'sparkle', .6);
e(tw.gopa, 'boing', .6); e(tw.maekban, 'pop', .7); e(tw.tok, 'clack', 1); e(tw.gukrul, 'ding', .7);
e(tw.tteugeo2, 'poof', .6); e(tw.eoreum, 'sparkle', .8); e(tw.deureoja, 'brr', .7); e(tw.ssok, 'whoosh', .6);
e(tw.simsim, 'boing', .4); for (let k = 0; k < 4; k++) e(tw.gajok + k * .25, 'pop', .6); e(tw.tv, 'ding', .6);
e(tw.gwichana, 'boing', .4); e(tw.badake, 'clack', .4); e(tw.bamsae, 'ding', .5);
e(tw.chukha, 'tada', .9); e(tw.jal, 'sparkle', .6);

// ---------- hall ----------
const woodM = M('#c9a070', { roughness: .55 }), clayM = texMat(TX_CON, '#d0884a', 3, 2, { ns: .5, rough: .9 });
box(7, .1, 6.6, woodM, 0, -.05, -.3, false);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), M('#3a2a20', { roughness: .9 })); ground.position.y = -.12; scene.add(ground);
box(7, 2.9, .12, clayM, 0, 1.45, -3.26, false); box(.12, 2.9, 6.6, clayM, -3.5, 1.45, -.3, false);
for (let i = 0; i < 7; i++) box(.06, 2.9, .05, M('#7a4a28', { roughness: .7 }), -3 + i, 1.45, -3.18, false);
const signTex = textTex(['찜질방'], 512, 160, '#1a0a08', '#ffb040', 120);
const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .5), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 1.6 })); sign.position.set(0, 2.55, -3.18); scene.add(sign);
const h24Tex = textTex(['24시간'], 384, 160, '#0a1020', '#5ad8ff', 110);
const h24 = new THREE.Mesh(new THREE.PlaneGeometry(.9, .38), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffffff', emissiveMap: h24Tex, emissiveIntensity: 0 })); h24.position.set(1.7, 2.45, -3.18); scene.add(h24);
// clay dome (back half, cutaway) with hot floor
const dome = new THREE.Group(); scene.add(dome); dome.position.set(-1.8, 0, -1.75);
{ const d = new THREE.Mesh(new THREE.SphereGeometry(1.45, 40, 20, Math.PI, Math.PI, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: clayM.map, normalMap: clayM.normalMap, color: '#c87840', roughness: .95, side: THREE.DoubleSide })); d.castShadow = false; d.receiveShadow = true; dome.add(d);
  const f = new THREE.Mesh(new THREE.CircleGeometry(1.45, 40, Math.PI, Math.PI).rotateX(-Math.PI / 2), M('#8a4a28', { roughness: .9 })); f.position.y = .012; dome.add(f);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, .05, 8, 40, Math.PI).rotateX(-Math.PI / 2), M('#6a3a1a')); rim.rotation.y = Math.PI; dome.add(rim); }
const domeLight = new THREE.PointLight('#ff8a3a', 0, 3.5, 1.5); domeLight.position.set(-1.8, 1.0, -1.2); scene.add(domeLight);
const heatPuffs = puffs(10, '#ffb070');
// ice room (right back, cutaway: back, side walls, roof)
const ice = new THREE.Group(); scene.add(ice); ice.position.set(1.95, 0, -1.55);
const iceM = new THREE.MeshStandardMaterial({ color: '#bfe6ff', roughness: .15, metalness: .1, emissive: '#4a8acc', emissiveIntensity: .25 });
box(1.9, 2.5, .1, iceM, 0, 1.25, -.85, false, ice); box(.1, 2.5, 1.8, iceM, -.95, 1.25, 0, false, ice); box(.1, 2.5, 1.8, iceM, .95, 1.25, 0, false, ice); box(2.0, .1, 1.8, iceM, 0, 2.5, 0, false, ice);
box(1.9, .03, 1.8, M('#e8f6ff', { roughness: .2 }), 0, .015, 0, false, ice);
for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.04, rr(.15, .35), 6).rotateX(Math.PI), iceM); c.position.set(-.8 + i * .2, 2.35, .85); ice.add(c); }
const iceSign = new THREE.Mesh(new THREE.PlaneGeometry(.9, .3), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffffff', emissiveMap: textTex(['얼음방'], 384, 128, '#0a2040', '#bfefff', 90), emissiveIntensity: 1.2 })); iceSign.position.set(0, 2.72, .9); ice.add(iceSign);
const iceLight = new THREE.PointLight('#8acfff', 0, 3, 1.5); iceLight.position.set(1.95, 1.4, -1.3); scene.add(iceLight);
const coldPuffs = puffs(8, '#e8f6ff');
// entrance counter + uniform stacks
const counter = new THREE.Group(); scene.add(counter); counter.position.set(2.0, 0, 1.35);
box(1.3, .95, .5, M('#7a4a28', { roughness: .6 }), 0, .475, 0, true, counter); box(1.4, .05, .6, M('#e8dcc8', { roughness: .4 }), 0, .97, 0, true, counter);
const stacks = [['#f0a0b8', -.35], ['#f09040', .0], ['#f0a0b8', .35]].map(([c, x]) => { const g = new THREE.Group(); counter.add(g); g.position.set(x, 1.0, .05);
  for (let k = 0; k < 4; k++) box(.28, .045, .2, M(c, { roughness: .9 }), 0, .025 + k * .05, 0, true, g); return g; });
// TV
const tvCan = cv(768, 432), tvTex = new THREE.CanvasTexture(tvCan[0]); tvTex.colorSpace = THREE.SRGBColorSpace;
{ const g = tvCan[1]; const gr = g.createLinearGradient(0, 0, 0, 432); gr.addColorStop(0, '#f8c8a0'); gr.addColorStop(1, '#a86a8a'); g.fillStyle = gr; g.fillRect(0, 0, 768, 432);
  for (const [x, c] of [[270, '#3a5a8a'], [500, '#c83a5a']]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, 360, 70, 120, 0, 0, 7); g.fill(); g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(x, 200, 52, 0, 7); g.fill(); g.fillStyle = '#1a1210'; g.beginPath(); g.arc(x, 185, 54, Math.PI, 0); g.fill(); }
  g.fillStyle = '#ff4a7a'; g.font = `700 90px ${FONT}`; g.textAlign = 'center'; g.fillText('♥', 385, 140);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 372, 768, 60); g.fillStyle = '#fff'; g.font = `700 40px ${FONT}`; g.fillText('사랑해...', 384, 414); tvTex.needsUpdate = true; }
const tv = new THREE.Group(); scene.add(tv); tv.position.set(0, 1.45, -3.14);
box(1.36, .8, .06, blackM, 0, 0, -.03, true, tv);
{ const s = new THREE.Mesh(new THREE.PlaneGeometry(1.28, .72), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tvTex, emissiveIntensity: 1 })); s.position.z = .002; tv.add(s); }
const tvLight = new THREE.PointLight('#ffc8d8', 0, 4, 1.5); tvLight.position.set(0, 1.4, -2.2); scene.add(tvLight);
// bamboo mats
const matTex = (() => { const [c, g] = cv(256, 128); g.fillStyle = '#d8c078'; g.fillRect(0, 0, 256, 128); for (let x = 0; x < 256; x += 8) { g.fillStyle = x % 16 ? '#c8ac60' : '#e4d090'; g.fillRect(x, 0, 6, 128); } g.fillStyle = '#5a7a3a'; g.fillRect(0, 0, 256, 8); g.fillRect(0, 120, 256, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const MATS = [V(0, 0, .2), V(-.75, 0, .2), V(.75, 0, .2), V(-1.5, 0, .2), V(1.5, 0, .2)];
const mats = MATS.map(p => { const m = new THREE.Mesh(new THREE.BoxGeometry(.7, .02, 2.0), new THREE.MeshStandardMaterial({ map: matTex, roughness: .7 })); m.position.set(p.x, .01, p.z); m.receiveShadow = true; scene.add(m); return m; });
// sikhye cup + eggs on stones
const plasticM = new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: .3, roughness: .05, depthWrite: false, side: THREE.DoubleSide });
const cup = new THREE.Group(); scene.add(cup);
{ const c = new THREE.Mesh(new THREE.CylinderGeometry(.05, .04, .13, 18, 1, true).translate(0, .065, 0), plasticM); cup.add(c);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(.047, .04, .1, 18).translate(0, .05, 0), new THREE.MeshStandardMaterial({ color: '#efe2c0', roughness: .2, transparent: true, opacity: .85 })); cup.add(l);
  for (let i = 0; i < 10; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(.006, 6, 4), whiteM); r.position.set(rr(-.03, .03), .1, rr(-.03, .03)); cup.add(r); }
  const flakes = new THREE.Group(); cup.add(flakes); for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(.018, .006, .014), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .05, emissive: '#bfe6ff', emissiveIntensity: .4 })); f.position.set(rr(-.03, .03), .102, rr(-.03, .03)); f.rotation.y = rr(0, 3); flakes.add(f); } cup.userData.flakes = flakes; }
const eggBrownM = M('#a8642a', { roughness: .45 }), eggWhiteM = M('#fbf6ee', { roughness: .35 });
const tray = new THREE.Group(); scene.add(tray);
box(.42, .06, .3, M('#5a3a24'), 0, .03, 0, true, tray);
for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(.035, 0), M('#3a3836', { roughness: .8 })); s.position.set(rr(-.17, .17), .075, rr(-.11, .11)); s.rotation.set(rr(0, 3), rr(0, 3), 0); tray.add(s); }
const eggs = [[-.1, -.04], [.05, .03], [.14, -.05], [-.02, .08]].map(([x, z]) => { const g = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), eggBrownM); g.scale.set(1, 1.25, 1); g.position.set(x, .12, z); g.castShadow = true; tray.add(g); return g; });
const handEgg = new THREE.Mesh(new THREE.SphereGeometry(.035, 16, 12), eggBrownM); handEgg.scale.set(1, 1.25, 1); handEgg.castShadow = true; scene.add(handEgg);
// sweat drops + "heat" over the floor
const dropTex = (() => { const [c, g] = cv(64, 96); g.fillStyle = '#8fd8ff'; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(52, 40, 58, 60, 32, 90); g.bezierCurveTo(6, 60, 12, 40, 32, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(24, 58, 7, 0, 7); g.fill(); return new THREE.CanvasTexture(c); })();
const drops = Array.from({ length: 6 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTex, transparent: true, depthWrite: false })); s.userData.ph = i / 6; s.userData.dx = (i % 2 ? 1 : -1) * rr(.12, .22); scene.add(s); return s; });
function sweat(src, t, k) { drops.forEach(s => { s.visible = k > .01; if (!s.visible) return; const a = (t * 1.1 + s.userData.ph) % 1; s.position.set(src.x + s.userData.dx, src.y + .05 - a * .35, src.z + .1); s.scale.set(.05 * k, .075 * k, 1); s.material.opacity = 1 - a * .6; }); }
const floorHeat = puffs(10, '#ff9a5a');
const steamHead = puffs(6, '#ffffff');
const zzz = Array.from({ length: 5 }, () => label('Z', 1, '#bfe0ff'));
const towelRoll = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .38, 16).rotateZ(Math.PI / 2), M('#f6ece4', { roughness: .95 })); towelRoll.castShadow = true; scene.add(towelRoll);

// ---------- people ----------
const du = person('#3f8f6a'), fr = person('#3a7fb0', { hair: '#2a1a10' }), mom = person('#3a7fb0', { perm: true, hair: '#3a2418' }), dad = person('#3a7fb0'), kid = person('#3a7fb0'), clerk = person('#e86a8a', { perm: true, hair: '#3a2418', apron: '#7a3ab0', long: true });
kid.scale.setScalar(.68);
dress(fr, '#f0a0b8'); dress(mom, '#f0a0b8'); dress(dad, '#f09040'); dress(kid, '#f0a0b8');
[du, fr, mom, dad, kid].forEach(p => sheepHead(p)); [fr, mom, dad, kid].forEach(p => p.userData.sheep.visible = true);
let duDressed = false;
const shirtWet = M('#2a6a4a', { roughness: .5 });
const HALL = { du: V(0, 0, 1.15), fr: V(1.5, 0, 1.15), mom: V(-.75, 0, 1.15), dad: V(.75, 0, 1.15), kid: V(-1.5, 0, .75) };
const SITP = { du: V(0, 0, .35), fr: V(1.0, 0, .5), mom: V(-1.0, 0, .5), dad: V(-.5, 0, 1.35), kid: V(.5, 0, 1.35) };

// ---------- labels ----------
const LB = { hwangto: label('황토방', 1, '#ffb070'), wet: label('축축...', 1, '#8fd8ff'), bok: label('찜질복'), hot: label('뜨거!', 1, '#ff6a5a'), yang: label('양머리', 1, '#ffffff'),
  floor: label('앗 뜨거!', 1, '#ff6a5a'), thirsty: label('목말라', 1, '#8fd8ff'), ice1: label('살얼음', 1, '#bfefff'), hungry: label('꼬르륵', 1, '#ffd21f'), tok: label('톡!'),
  rule: label('국룰', 1, '#7cf07c'), combo: label('식혜 + 계란'), hot2: label('너무 뜨거!', 1, '#ff6a5a'), ssok: label('쏙!', 1, '#8fd8ff'), simsim: label('심심...', 1, '#8fb0ff'),
  lazy: label('귀찮아...', 1, '#ffd21f'), kkul: label('꿀잠', 1, '#ffd21f') };
for (const s of Object.values(LB)) overlay.add(s); zzz.forEach(s => overlay.add(s));

// ---------- camera ----------
const KEYS = [
  [0, V(-1.75, 1.3, 1.6), V(-1.8, .8, -1.7)], [tw.g1, V(-1.75, 1.25, 1.2), V(-1.8, .8, -1.7)],
  [tw.g1 + CUT, V(-1.5, 1.2, .3), V(-1.8, .95, -1.9), 1], [tw.s1, V(-1.5, 1.18, .2), V(-1.8, .95, -1.9)],
  [tw.s1 + CUT, V(.1, 1.7, 3.4), V(1.95, 1.05, 1.5), 1], [tw.banpal - .1, V(.2, 1.65, 3.2), V(1.95, 1.05, 1.6)],
  [tw.banpal + CUT, V(2.0, 1.3, 5.6), V(2.0, 1.0, 2.2), 1], [tw.g2, V(2.0, 1.28, 5.3), V(2.0, 1.0, 2.2)],
  [tw.g2 + CUT, V(.1, 1.7, 2.8), V(0, 1.55, .35), 1], [tw.s2, V(.1, 1.68, 2.6), V(0, 1.55, .35)],
  [tw.s2 + CUT, V(.4, 1.8, 2.5), V(0, 1.75, .35), 1], [tw.g3, V(.35, 1.78, 2.3), V(0, 1.75, .35)],
  [tw.g3 + CUT, V(.2, .8, 2.4), V(0, .5, .35), 1], [tw.s3, V(.2, .78, 2.2), V(0, .5, .35)],
  [tw.s3 + CUT, V(.4, 2.4, 2.6), V(0, .2, .3), 1], [tw.g4, V(.35, 2.3, 2.4), V(0, .2, .3)],
  [tw.g4 + CUT, V(.5, 1.6, 1.6), V(0, .25, .0), 1], [tw.s4, V(.48, 1.55, 1.5), V(0, .25, .0)],
  [tw.s4 + CUT, V(.3, 1.3, 2.4), V(0, .9, -.1), 1], [tw.g5, V(.25, 1.25, 2.1), V(0, .9, -.1)],
  [tw.g5 + CUT, V(-.3, 1.3, 2.3), V(0, .9, -.1), 1], [tw.s5, V(-.25, 1.28, 2.1), V(0, .9, -.1)],
  [tw.s5 + CUT, V(.75, .75, 1.45), V(.45, .15, .75), 1], [tw.ima - .1, V(.7, .72, 1.4), V(.45, .15, .75)],
  [tw.ima + CUT, V(.2, 1.2, 1.9), V(0, 1.0, -.1), 1], [tw.sikhye2, V(.18, 1.18, 1.8), V(0, 1.0, -.1)],
  [tw.sikhye2 + CUT, V(.6, 1.3, 2.4), V(.15, .6, .2), 1], [tw.g6, V(.55, 1.28, 2.3), V(.15, .6, .2)],
  [tw.g6 + CUT, V(.2, 1.25, 2.0), V(0, 1.0, -.1), 1], [tw.s6, V(.18, 1.23, 1.9), V(0, 1.0, -.1)],
  [tw.s6 + CUT, V(.5, 1.7, 2.8), V(1.9, 1.0, -1.3), 1], [tw.deureoja - .05, V(.7, 1.65, 2.5), V(1.95, 1.0, -1.4)],
  [tw.deureoja + CUT, V(1.95, 1.5, 1.9), V(1.95, 1.15, -1.3), 1], [tw.g7, V(1.95, 1.48, 1.7), V(1.95, 1.15, -1.3)],
  [tw.g7 + CUT, V(0, 2.4, 5.0), V(0, .6, -.4), 1], [tw.s7, V(0, 2.3, 4.6), V(0, .6, -.4)],
  [tw.s7 + CUT, V(-.2, 1.9, 4.4), V(0, .7, .4), 1], [tw.tv - .05, V(-.2, 1.85, 4.1), V(0, .7, .4)],
  [tw.tv + CUT, V(0, 1.2, 3.4), V(0, 1.2, -3.1), 1], [tw.g8, V(0, 1.18, 3.2), V(0, 1.2, -3.1)],
  [tw.g8 + CUT, V(.3, 1.0, 2.0), V(0, .95, -.1), 1], [tw.s8, V(.28, .98, 1.9), V(0, .95, -.1)],
  [tw.s8 + CUT, V(0, 3.8, 3.0), V(0, 0, .6), 1], [tw.bamsae, V(0, 3.6, 2.8), V(0, 0, .6)],
  [tw.bamsae + CUT, V(1.0, 2.1, -.6), V(1.7, 2.35, -3.15), 1], [tw.chukha, V(1.05, 2.1, -.7), V(1.7, 2.35, -3.15)],
  [tw.chukha + CUT, V(0, 2.6, 5.6), V(0, .8, -1.0), 1], [tw.g9, V(0, 2.5, 5.2), V(0, .8, -1.0)],
  [tw.g9 + CUT, V(.6, 1.6, .9), V(0, .25, -.4), 1], [END, V(.55, 1.55, .8), V(0, .25, -.4)]];

// ---------- timeline ----------
function lieZ(p, pos, pose) { p.position.set(pos.x, .21 * p.scale.y, pos.z); p.rotation.set(-Math.PI / 2, 0, 0); applyPose(p, pose); }
function update(t) {
  const night = ease(t, tw.s8 - .1, tw.ja), domeOn = t < tw.s1;
  scene.background = skyTex.cache || (skyTex.cache = skyTex('#1a1020', '#2a1a20', '#3a2420'));
  hemi.color.set('#ffe0c0'); hemi.groundColor.set('#3a2a20'); hemi.intensity = lerp(.9, .25, night);
  sun.color.set('#ffd8b0'); sun.intensity = lerp(1.2, .15, night); fill.intensity = lerp(.3, .03, night);
  scene.environmentIntensity = lerp(.35, .06, night); renderer.toneMappingExposure = 1.0;
  domeLight.intensity = domeOn ? 1.1 : (t < tw.g8 ? 1.0 : 1.0 - night * .7);
  iceLight.intensity = t > tw.eoreum - .2 ? 2.0 * pop(t, tw.eoreum - .2) : 0;
  tvLight.intensity = t > tw.tv - .2 ? 1.4 + night * 1.2 : 0;
  h24.material.emissiveIntensity = t > tw.bamsae - .1 ? 2.0 : .15; sign.material.emissiveIntensity = lerp(1.2, 2.2, night);
  // ---- objects ----
  dome.visible = true; dome.scale.setScalar(Math.max(pop(t, tw.hwangto - .3, .5), .001));
  puffUpdate(heatPuffs, V(-1.8, .05, -1.6), t, (t > tw.hwangto - .2 && t < tw.s1) ? 1 : 0, { size: .45, rise: 1.4, spread: .7, op: .22 });
  ice.visible = t > tw.eoreum - .3; ice.scale.setScalar(Math.max(pop(t, tw.eoreum - .3, .5), .001));
  puffUpdate(coldPuffs, V(1.95, 1.7, -1.3), t, ice.visible ? .8 : 0, { size: .3, rise: -1.4, spread: .5, op: .3, speed: .35 });
  counter.visible = t < tw.g2 + .5 && t > tw.s1 - .5;
  stacks.forEach((s, i) => s.scale.setScalar(Math.max(pop(t, tw.ipgu - .2 + i * .12), .001)));
  tv.visible = t > tw.tv - .25; tv.scale.setScalar(Math.max(pop(t, tw.tv - .25, .4), .001));
  mats.forEach((m, i) => { const a = i === 0 ? tw.dotjari - .2 : tw.gajok - .3 + i * .15; const k = ease(t, a, a + .5); m.visible = k > .01; m.scale.set(1, 1, Math.max(k, .001)); m.position.z = MATS[i].z - (1 - k); });
  // ---- du ----
  if (!duDressed && t >= tw.bok) { dress(du, '#f09040'); duDressed = true; }
  let pos = V(-1.8, 0, -1.3), ry = 0, pose = mixP(UP.idle, UP.warm, .4), lying = false, floorSit = false;
  if (t < tw.s1) { pose = t < tw.g1 ? mixP(UP.idle, UP.warm, .5) : mixP(UP.idle, UP.cold, ease(t, tw.ot, tw.jeojeo) * .5); pose[14] = t < tw.g1 ? .6 : .2; }
  else if (t < tw.g2) { pos = V(2.0, 0, 2.15); ry = Math.PI; pose = t > tw.nanwo ? mixP(UP.idle, UP.give, ease(t, tw.nanwo - .2, tw.nanwo + .2) * (1 - ease(t, tw.bok + .6, tw.banpal))) : UP.idle;
    if (t > tw.banpal) { pos = V(1.6, 0, 2.3); ry = 0; pose = mixP(UP.idle, UP.cheer, .4); } }
  else if (t < tw.s3) { pos = V(0, 0, .35); ry = 0;
    pose = t < tw.g3 ? mixP(UP.idle, UP.hot, ease(t, tw.meori, tw.tteugeo1) * (1 - ease(t, tw.s2, tw.s2 + .4))) : UP.idle;
    if (t >= tw.s2 && t < tw.g3) pose = mixP(UP.idle, UP.forehead, ease(t, tw.sugeon, tw.doldol) * (1 - ease(t, tw.yang, tw.yang + .4)));
    if (t >= tw.g3) { const hop = Math.abs(Math.sin((t - tw.g3) * 7)); pos.y = hop * .18 * ease(t, tw.badak - .2, tw.badak); pose = mixP(UP.idle, UP.hot, .6); pose[6] = -.3 * hop; pose[8] = .8 * hop; } }
  else if (t < tw.s4) { if (t > tw.nuwo - .2) lying = true; else pos = V(0, 0, .35); }
  else if (t < tw.s6) { floorSit = true;
    pose = UP.idle; if (t < tw.g5) pose = mixP(UP.idle, UP.drink, ease(t, tw.masyeo - .3, tw.masyeo) * (1 - ease(t, tw.sareoreum - .2, tw.sareoreum)) + win(t, tw.dongdong, tw.g5, .2));
    if (t >= tw.g5 && t < tw.s5) pose = mixP(UP.idle, UP.cold, ease(t, tw.g5, tw.gopa) * .6);
    if (t >= tw.s5 && t < tw.g6) pose = mixP(UP.idle, UP.forehead, win(t, tw.ima - .3, tw.gukrul + .2, .25));
    if (t >= tw.sikhye2 && t < tw.g6) pose = mixP(UP.idle, UP.cheer, .5);
    if (t >= tw.g6) pose = mixP(UP.idle, UP.hot, ease(t, tw.g6, tw.tteugeo2)); }
  else if (t < tw.g7) { const k = ease(t, tw.s6 + .3, tw.deureoja - .1); pos = V(lerp(.0, 1.95, k), 0, lerp(.35, -1.25, k)); ry = k > .98 ? 0 : face(V(0, 0, .35), V(1.95, 0, -1.25)); pose = k > 0 && k < .98 ? WALK(UP.idle, t * 10) : mixP(UP.idle, UP.cold, ease(t, tw.deureoja, tw.deureoja + .4) * (1 - ease(t, tw.ssok, tw.g7)) + .3 * ease(t, tw.ssok, tw.g7));
    if (k >= .98 && t > tw.ssok) pose = mixP(UP.idle, UP.cheer, .3); }
  else if (t < tw.s8) { floorSit = true; pose = t < tw.s7 ? mixP(UP.idle, UP.bored, ease(t, tw.g7, tw.honja)) : UP.idle; if (t >= tw.g8) pose = mixP(UP.idle, UP.tired, ease(t, tw.g8, tw.gwichana)); }
  else lying = true;
  du.visible = true;
  if (lying) { lieZ(du, HALL.du, t < tw.s4 ? mixP(UP.sleep, UP.hot, ease(t, tw.g4, tw.malla) * .5) : UP.sleep); }
  else if (floorSit || t < tw.s1) { putP(du, t < tw.s1 ? V(-1.8, FLOOR_Y, -1.9) : V(0, FLOOR_Y, -.1), 0); applyPose(du, FSIT(pose)); }
  else { putP(du, pos, ry); applyPose(du, pose); }
  du.userData.sheep.visible = t > tw.yang - .1;
  du.userData.sheep.scale.setScalar(Math.max(pop(t, tw.yang - .1), .001));
  hotFace(du, Math.max(win(t, tw.meori - .2, tw.s2 + .3, .3), win(t, tw.badak - .2, tw.s3, .2) * .6, win(t, tw.tteugeo2 - .4, tw.deureoja + .5, .3), win(t, tw.ot, tw.s1, .3) * .4));
  // wet shirt
  if (!duDressed) du.userData.pelvis.children[0].material.color.set(t > tw.ot ? '#2a6a4a' : '#3f8f6a');
  const headW = () => { du.updateMatrixWorld(true); return du.userData.head.localToWorld(V(0, .2, .1)); };
  sweat(headW(), t, Math.max(win(t, tw.g1 - .2, tw.s1, .3), win(t, tw.heullyeo - .3, tw.s4, .3), win(t, tw.tteugeo2 - .3, tw.deureoja + .3, .3)));
  puffUpdate(steamHead, headW().add(V(0, .15, 0)), t, Math.max(win(t, tw.meori - .2, tw.s2 + .2, .3), win(t, tw.tteugeo2 - .3, tw.s6 + .5, .3)), { size: .14, rise: .5, spread: .08, op: .6, speed: .9 });
  puffUpdate(floorHeat, V(0, .02, .35), t, win(t, tw.g3 - .1, tw.dotjari, .3), { size: .4, rise: .7, spread: .6, op: .3, speed: .7 });
  // towel roll -> sheep head
  towelRoll.visible = t > tw.sugeon - .2 && t < tw.yang; if (towelRoll.visible) { const hp = handPos(du, 1); towelRoll.position.copy(hp); towelRoll.rotation.x = t * 12; towelRoll.scale.setScalar(Math.max(pop(t, tw.sugeon - .2), .001)); }
  // cup + eggs
  cup.visible = t > tw.sikhye - .2 && t < tw.g6; if (cup.visible) { const inHand = t < tw.s5; const hp = inHand ? handPos(du, 1, V(0, -.08, .04)) : V(.28, 0, .5); cup.position.copy(hp); cup.rotation.set(0, 0, 0); cup.scale.setScalar(Math.max(pop(t, tw.sikhye - .2), .001));
    cup.userData.flakes.children.forEach((f, i) => { f.position.y = .102 + Math.sin(t * 3 + i) * .004; }); }
  tray.visible = t > tw.maekban - .3 && t < tw.g6 + 1; tray.position.set(.45, 0, .7); tray.scale.setScalar(Math.max(pop(t, tw.maekban - .3), .001));
  handEgg.visible = t > tw.gyeran - .1 && t < tw.g6; if (handEgg.visible) { const hp = handPos(du, 1, V(0, -.07, .03)); handEgg.position.copy(hp); handEgg.material = t > tw.tok + .25 ? eggWhiteM : eggBrownM; }
  eggs[0].visible = !(t > tw.gyeran - .1);
  // ---- others ----
  const others = [['fr', fr], ['mom', mom], ['dad', dad], ['kid', kid]];
  others.forEach(([n, p], i) => { const appear = n === 'fr' ? tw.pink - .15 : tw.gajok - .2 + i * .18;
    if (t < tw.g2) { p.visible = n === 'fr' && t > appear; if (p.visible) { putP(p, V(2.4, 0, 2.3), 0); p.scale.setScalar((n === 'kid' ? .68 : 1) * Math.max(pop(t, appear), .001)); applyPose(p, mixP(UP.idle, UP.cheer, .4)); } return; }
    p.visible = t > tw.gajok - .2 + i * .18; if (!p.visible) return; p.scale.setScalar((n === 'kid' ? .68 : 1) * Math.max(pop(t, appear), .001));
    if (t < tw.s8) { const sp = SITP[n]; putP(p, V(sp.x, FLOOR_Y * (n === 'kid' ? .68 : 1), sp.z), 0); applyPose(p, FSIT(t > tw.tv ? mixP(UP.idle, UP.lieTV, .5) : UP.cheer)); }
    else lieZ(p, HALL[n], UP.sleep); });
  clerk.visible = counter.visible; putP(clerk, V(2.0, 0, .85), 0); applyPose(clerk, t > tw.nanwo - .4 ? mixP(UP.idle, UP.give, ease(t, tw.nanwo - .4, tw.nanwo) * (1 - ease(t, tw.bok, tw.bok + .4))) : UP.idle);

  // ---- labels ----
  lab(LB.hwangto, win(t, tw.hwangto - .1, tw.g1, .15) * pop(t, tw.hwangto - .1), -1.8, 1.75, -1.6, .55);
  lab(LB.bok, win(t, tw.bok - .1, tw.pink - .1, .15) * pop(t, tw.bok - .1), 2.0, 1.6, 1.35, .45);
  lab(LB.hot, win(t, tw.tteugeo1 - .3, tw.s2, .15) * pop(t, tw.tteugeo1 - .3), .0, 2.35, .35, .4);
  lab(LB.yang, win(t, tw.yang - .1, tw.g3, .15) * pop(t, tw.yang - .1), .0, 2.45, .35, .4);
  lab(LB.floor, win(t, tw.badak - .1, tw.s3, .15) * pop(t, tw.badak - .1), .0, 1.0, .5, .45);
  lab(LB.ice1, win(t, tw.sareoreum - .1, tw.g5, .15) * pop(t, tw.sareoreum - .1), cup.position.x, cup.position.y + .25, cup.position.z, .2);
  { const hp = headW(); lab(LB.tok, win(t, tw.tok - .05, tw.tok + .9, .15) * pop(t, tw.tok - .05), hp.x + .18, hp.y + .25, hp.z, .22);
  lab(LB.rule, win(t, tw.gukrul - .1, tw.sikhye2, .15) * pop(t, tw.gukrul - .1), hp.x - .15, hp.y + .3, hp.z, .25);
  lab(LB.hungry, win(t, tw.gopa - .3, tw.s5, .15) * pop(t, tw.gopa - .3), hp.x, hp.y + .3, hp.z, .3); lab(LB.hot2, win(t, tw.tteugeo2 - .3, tw.s6, .15) * pop(t, tw.tteugeo2 - .3), hp.x, hp.y + .35, hp.z, .3);
  lab(LB.lazy, win(t, tw.gwichana - .3, tw.s8, .15) * pop(t, tw.gwichana - .3), hp.x, hp.y + .3, hp.z, .32); lab(LB.simsim, win(t, tw.simsim - .3, tw.s7, .15) * pop(t, tw.simsim - .3), hp.x, hp.y + .32, hp.z, .4);
  lab(LB.wet, win(t, tw.jeojeo - .3, tw.s1, .15) * pop(t, tw.jeojeo - .3), hp.x, hp.y + .32, hp.z, .4); lab(LB.thirsty, win(t, tw.malla - .3, tw.s4, .15) * pop(t, tw.malla - .3), hp.x, hp.y + .3, hp.z, .35); }
  lab(LB.combo, win(t, tw.sikhye2 - .1, tw.g6, .15) * pop(t, tw.sikhye2 - .1), .3, .55, .6, .2);
  lab(LB.ssok, win(t, tw.ssok - .1, tw.g7, .15) * pop(t, tw.ssok - .1), 1.95, 2.25, -1.25, .4);
  lab(LB.kkul, ramp(t, tw.jal - .3, tw.jal) * pop(t, tw.jal - .3), 0, .75, -.75, .22);
  zzz.forEach((z, i) => { const a = ((t * .6 + i / 5) % 1); const p = [HALL.du, HALL.fr, HALL.mom, HALL.dad, HALL.kid][i];
    lab(z, ramp(t, tw.ja, tw.ja + .3) * (1 - Math.max(0, a - .7) / .3), p.x + .1 + a * .15, .45 + a * .5, p.z - (n => n)(1.9) * (i === 4 ? .68 : 1), .16 + a * .08); });
}
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
