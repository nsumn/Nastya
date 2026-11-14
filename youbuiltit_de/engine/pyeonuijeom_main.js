import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
const DIR = 'ko07_pyeonuijeom';
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
// ===================== KO 07 편의점 — corner shop closes at 10 -> 24h 편의점 -> hot water -> plastic tables -> beer 4 cans -> 삼각김밥 1-2-3 -> 1+1 -> panic button -> another store across the street -> 50,000 =====================
const tw = {
  golmok: TE('골목에'), gage: TE('가게를'), super_: TE('슈퍼가'),
  g1: G(1), yeol: TE('열'), dada: TE('닫아서'), baego: TE('배고픈'), eopseo1: TE('없어', 1),
  s1: S(1), seumul: TE('스물네'), bul: TE('불을'), pyeon1: TE('편의점이야'),
  g2: G(2), cup: TE('컵라면을'), gwichan: TE('귀찮아'),
  s2: S(2), changa: TE('창가에'), gigye: TE('기계를'), butgo: TE('붓고'), sam1: TE('삼', 1), kkeut: TE('끝'),
  g3: G(3), ane: TE('안에는'), eopseo2: TE('없어', 2),
  s3: S(3), plastic: TE('플라스틱'), table: TE('테이블이랑'), parasol: TE('파라솔을'),
  g4: G(4), maekju1: TE('맥주를', 1), sijak: TE('시작해'),
  s4: S(4), ne: TE('네'), ssage: TE('싸게'),
  g5: G(5), honja1: TE('혼자', 1), himdeul: TE('힘들어'),
  s5: S(5), samgak: TE('삼각김밥을'), nuknuk: TE('눅눅해지지'), binil: TE('비닐로'), il: TE('일'), i: TE('이'), sam2: TE('삼', 2), dangi: TE('당기면'), basak: TE('바삭한'), gamssa: TE('감싸'),
  g6: G(6), deo: TE('더'),
  s6: S(6), won1: TE('원', 1), plus: TE('플러스'), hanane: TE('하나는'), gongjja: TE('공짜야'),
  g7: G(7), alba: TE('알바생이'), museo: TE('무서워'),
  s7: S(7), gyesan: TE('계산대'), bisang: TE('비상벨을'), nureu: TE('누르면'), police: TE('경찰이'),
  g8: G(8), neomu: TE('너무'), dwae: TE('돼'),
  s8: S(8), geonneo: TE('건너편에'), saenggyeo: TE('생겨'), hanguk: TE('한국엔'), oman: TE('오만'), neomeo: TE('넘어'),
  chukha: TE('축하해'), pyeon4: TE('편의점을'), g9: G(9), jibe: TE('집에'), jina: TE('지나가는'), eopseo3: TE('없어', 3) };

// ---------- sound ----------
SFX.beds.push([0, END, 'traffic', .18], [tw.g4, tw.s5, 'pub', .25], [tw.g8, tw.s8, 'pub', .3]);
e(.05, 'whoosh', .4); e(tw.super_, 'ding', .6);
e(tw.yeol, 'tick', .8); e(tw.dada - .1, 'clack', .9); e(tw.dada + .3, 'boom', .3); e(tw.eopseo1, 'brr', .5);
e(tw.s1 + .2, 'clack', .7); e(tw.bul, 'sparkle', .8); e(tw.pyeon1, 'jingle', .8);
e(tw.cup, 'pop', .6); e(tw.gwichan, 'boing', .5);
e(tw.gigye, 'pop', .7); e(tw.butgo, 'splash', .6); e(tw.sam1, 'tick', .7); e(tw.kkeut, 'ding', .8);
e(tw.eopseo2, 'boing', .5);
e(tw.plastic, 'clack', .7); e(tw.table, 'clack', .7); e(tw.parasol, 'whoosh', .7);
e(tw.maekju1, 'clink', .8); e(tw.sijak, 'clink', .6);
for (let k = 0; k < 4; k++) e(tw.ne + k * .12, 'pop', .6); e(tw.ssage, 'ding', .7);
e(tw.himdeul, 'brr', .5);
e(tw.samgak, 'pop', .8); e(tw.nuknuk, 'buzz', .5); e(tw.il, 'whoosh', .6); e(tw.i, 'whoosh', .6); e(tw.sam2, 'whoosh', .6); e(tw.basak, 'crackle', .8); e(tw.gamssa, 'sparkle', .7);
e(tw.deo, 'boing', .5); e(tw.plus, 'pop', .8); e(tw.gongjja, 'tada', .7);
e(tw.museo, 'brr', .5); e(tw.nureu, 'tick', .9); e(tw.nureu + .2, 'siren', .7); e(tw.police - .2, 'siren', .8);
e(tw.neomu, 'jingle', .7); e(tw.dwae, 'ding', .6);
e(tw.saenggyeo, 'pop', .9); e(tw.hanguk + .2, 'sparkle', .7); for (let k = 0; k < 8; k++) e(tw.oman + k * .15, 'pop', .35);
e(tw.chukha, 'tada', .9); e(tw.eopseo3 - .2, 'jingle', .8);

// ---------- set: night alley, store front at z = 0 facing +z ----------
const asphM = texMat(TX_ASP, '#4a4a52', 20, 20, { ns: .6 }), walkM = texMat(TX_CON, '#9a9aa2', 6, 1, { ns: .5 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2), asphM); ground.position.y = -.01; ground.receiveShadow = true; scene.add(ground);
box(30, .1, 3, walkM, 0, .05, 1.5, false); box(30, .1, 3, walkM, 0, .05, 9.5, false);
for (let x = -14; x <= 14; x += 2) box(1, .005, .12, M('#e8e8e0'), x, .005, 5.5, false);
const SIGN = { super: textTex(['동네 슈퍼'], 512, 96, '#2f7d4a', '#ffffff', 64), pyeon: textTex(['편의점 24'], 512, 96, '#1f5fd8', '#ffffff', 64) };
function makeStore(x, z, ry, big = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const wallM = M('#e9e6df', { roughness: .8 });
  box(4.6, 3.3, .15, wallM, 0, 1.65, -3.2, true, g); box(.15, 3.3, 3.2, wallM, -2.3, 1.65, -1.6, true, g); box(.15, 3.3, 3.2, wallM, 2.3, 1.65, -1.6, true, g);
  box(4.75, .15, 3.4, M('#d8d4cc'), 0, 3.35, -1.6, true, g);
  box(4.6, .3, .15, M('#3a3a42'), 0, .15, 0, true, g); box(4.6, .9, .2, M('#f4f4f4'), 0, 2.85, 0, true, g);
  for (const mx of [-2.25, -.75, .75, 2.25]) box(.08, 2.1, .08, M('#c8ccd2', { metalness: .6, roughness: .4 }), mx, 1.35, 0, true, g);
  const floor = box(4.5, .02, 3.1, M('#f2f2f2', { roughness: .3 }), 0, .01, -1.6, false, g);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.1), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: .1, roughness: .05, depthWrite: false })); glass.position.set(0, 1.35, .01); g.add(glass);
  const signM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: big ? SIGN.super : SIGN.pyeon, emissiveIntensity: 1.1 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.9, .72), signM); sign.position.set(0, 2.85, .11); g.add(sign);
  const ceilM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#f4fbff', emissiveIntensity: 1.3 });
  for (const cz of [-.8, -2.2]) for (const cx of [-1.2, 1.2]) box(1.2, .04, .25, ceilM, cx, 3.22, cz, false, g);
  const lamp = new THREE.PointLight('#eef6ff', 9, 9, 1.2); lamp.position.set(0, 2.6, -1.2); g.add(lamp);
  // shelves with products
  const shelfM = M('#cfd3d8', { roughness: .5 }), N = 3 * 3 * 12, prod = new THREE.InstancedMesh(new THREE.BoxGeometry(.12, .2, .14), M('#ffffff', { roughness: .5 }), N);
  const PC = ['#e83a3a', '#ffd21f', '#3a8ae8', '#4ac86a', '#ff8a2a', '#f4f4f4', '#c85ad8'].map(c => new THREE.Color(c)); let k = 0; const m4 = new THREE.Matrix4();
  for (const [sx, sz] of [[-1.3, -2.85], [-1.0, -1.6], [-.1, -2.4]]) { box(1.8, 1.4, .4, shelfM, sx, .7, sz, true, g);
    for (let lv = 0; lv < 3; lv++) for (let j = 0; j < 12; j++) { m4.makeTranslation(sx - .8 + j * .145, .35 + lv * .42, sz + .22); prod.setMatrixAt(k, m4); prod.setColorAt(k, PC[((j * 3 + lv * 5 + Math.round(sx * 7)) % PC.length + PC.length) % PC.length]); k++; } }
  prod.castShadow = true; g.add(prod);
  const counter = box(1.3, 1.0, .6, M('#3a5ad8', { roughness: .5 }), 1.4, .5, -1.0, true, g); box(1.35, .05, .65, M('#f4f4f4'), 1.4, 1.02, -1.0, true, g);
  box(.35, .25, .3, M('#2a2a2a', { roughness: .4 }), 1.65, 1.17, -1.05, true, g);
  g.userData = { sign, signM, lamp, ceilM, glass };
  return g; }
const store = makeStore(0, 0, 0, true), store2 = makeStore(0, 13.2, Math.PI, false);
// window bar + hot-water machine
const barM = M('#d8c8a8', { roughness: .6 });
box(1.9, .06, .35, barM, -1.2, 1.0, -.3, true); box(.08, 1.0, .3, barM, -2.1, .5, -.3, true);
const hotW = new THREE.Group(); scene.add(hotW); hotW.position.set(-1.85, 1.03, -.35);
box(.32, .48, .3, M('#f4f4f4', { roughness: .3 }), 0, .24, 0, true, hotW); box(.22, .1, .02, M('#e83a3a', { roughness: .3 }), 0, .36, .16, true, hotW);
cyl(.025, .025, .08, steelM, 0, .12, .1, 10, hotW);
// shutter (closes at 10)
const shutter = box(4.6, 1, .06, M('#9aa0a8', { metalness: .5, roughness: .5 }), 0, 1.35, .12, true);
const shutterLines = []; for (let i = 0; i < 10; i++) shutterLines.push(box(4.6, .02, .07, M('#6a7078', { metalness: .5, roughness: .5 }), 0, 0, .13, false));
// neighbours: dark houses with warm windows, a street lamp
const nbM = M('#8a7a6a', { roughness: .9 }), winM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffcf7a', emissiveIntensity: .9 });
for (const [hx, hw, hh] of [[-5.5, 5, 4.5], [5.4, 4.6, 5.5], [-11, 5, 6], [10.5, 5, 4]]) { box(hw, hh, 5, nbM, hx, hh / 2, -2.6, true);
  for (let wy = 1.4; wy < hh - .5; wy += 1.5) for (let wx = -hw / 2 + 1; wx < hw / 2 - .5; wx += 1.4) if (rnd() > .35) box(.6, .7, .05, winM, hx + wx, wy, -.08, false); }
for (const [hx, hw, hh] of [[-5.5, 5, 5], [5.5, 5, 4.2], [-11, 5, 4.5], [11, 5, 6]]) box(hw, hh, 5, nbM, hx, hh / 2, 15.8, true);
const pole = cyl(.06, .08, 4.2, M('#3a3a42'), -3.1, 2.1, 2.7, 10); box(.6, .1, .2, M('#3a3a42'), -2.85, 4.2, 2.7, false);
const streetLight = new THREE.PointLight('#ffd8a0', 6, 10, 1.3); streetLight.position.set(-2.7, 4.0, 2.7); scene.add(streetLight);
// outdoor plastic table set + parasol
const tableSet = new THREE.Group(); scene.add(tableSet); tableSet.position.set(1.35, .1, 1.6);
const greenM = M('#2e9a4a', { roughness: .5 });
box(.9, .04, .9, greenM, 0, .72, 0, true, tableSet); for (const [lx, lz] of [[-.38, -.38], [.38, -.38], [-.38, .38], [.38, .38]]) box(.04, .72, .04, greenM, lx, .36, lz, true, tableSet);
const chairs = [[-.75, 0, Math.PI / 2], [.75, 0, -Math.PI / 2], [0, -.75, 0], [0, .75, Math.PI]].map(([cx, cz, r]) => { const c = new THREE.Group(); c.position.set(cx, 0, cz); c.rotation.y = r; tableSet.add(c);
  box(.42, .04, .42, greenM, 0, .45, 0, true, c); box(.42, .45, .04, greenM, 0, .68, -.2, true, c); for (const [lx, lz] of [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]]) box(.035, .45, .035, greenM, lx, .225, lz, true, c); return c; });
const parasol = new THREE.Group(); tableSet.add(parasol); cyl(.025, .025, 2.2, M('#f4f4f4'), 0, 1.1, 0, 8, parasol);
{ const top = new THREE.Mesh(new THREE.ConeGeometry(1.25, .45, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#e83a3a', roughness: .6, side: THREE.DoubleSide })); top.position.y = 2.2; top.castShadow = true; parasol.add(top);
  const top2 = new THREE.Mesh(new THREE.ConeGeometry(1.26, .45, 8, 1, true, 0, Math.PI / 4), new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: .6, side: THREE.DoubleSide })); top2.position.y = 2.201; parasol.add(top2); }
// food & drink props
function cupRamen() { const g = new THREE.Group(); scene.add(g); const c = new THREE.Mesh(new THREE.CylinderGeometry(.065, .05, .11, 18), M('#e83a3a', { roughness: .4 })); c.castShadow = true; g.add(c);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.066, .066, .008, 18), M('#f4f0e0')); lid.position.y = .058; g.add(lid); return g; }
const ramen = cupRamen(), ramenSteam = puffs(10, '#ffffff');
function can(col) { const g = new THREE.Group(); scene.add(g); const c = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .12, 14), new THREE.MeshStandardMaterial({ color: col, metalness: .7, roughness: .35 })); c.castShadow = true; g.add(c);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, .01, 14), steelM); t.position.y = .065; g.add(t); return g; }
const friendCans = [can('#d8b02a'), can('#2a6ad8')], fourPack = ['#d8b02a', '#2a6ad8', '#e83a3a', '#3ab86a'].map(can);
// ---- 삼각김밥 stage (x = 30) ----
const STX = 30;
box(3, .9, 1.6, M('#d8c8a8', { roughness: .6 }), STX, .45, 0, true);
box(3.4, 3, .1, M('#f2d27a', { roughness: .9 }), STX, 1.5, -.9, false);
const stageLight = new THREE.PointLight('#fff4e0', 6, 6, 1.2); stageLight.position.set(STX + .6, 2.2, 1.5); scene.add(stageLight);
const triShape = (s) => { const sh = new THREE.Shape(), r = .05 * s; sh.moveTo(-.2 * s, -.16 * s); sh.lineTo(.2 * s, -.16 * s); sh.lineTo(0, .2 * s); sh.closePath(); return sh; };
function kimbap(parent) { const g = new THREE.Group(); parent.add(g);
  const rice = new THREE.Mesh(new THREE.ExtrudeGeometry(triShape(1), { depth: .09, bevelEnabled: true, bevelThickness: .02, bevelSize: .025, bevelSegments: 3 }), M('#fbfaf4', { roughness: .8 })); rice.position.z = -.045; rice.castShadow = true; g.add(rice);
  const fill_ = new THREE.Mesh(new THREE.CircleGeometry(.04, 16), M('#e85a3a')); fill_.position.set(0, .07, .068); g.add(fill_);
  const noriM = M('#1e2a1e', { roughness: .7 }), nori = [];
  for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); sh.moveTo(-.235, -.19); sh.lineTo(.235, -.19); sh.lineTo(.125, .02); sh.lineTo(-.125, .02); return sh; })()), noriM); n.material.side = THREE.DoubleSide; n.position.z = s * .07; g.add(n); nori.push(n); }
  const filmM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .35, roughness: .1, depthWrite: false, side: THREE.DoubleSide });
  const filmL = new THREE.Mesh(new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); sh.moveTo(-.27, -.21); sh.lineTo(0, -.21); sh.lineTo(0, .25); sh.closePath(); return sh; })()), filmM); filmL.position.z = .095; g.add(filmL);
  const filmR = new THREE.Mesh(new THREE.ShapeGeometry((() => { const sh = new THREE.Shape(); sh.moveTo(0, -.21); sh.lineTo(.27, -.21); sh.lineTo(0, .25); sh.closePath(); return sh; })()), filmM.clone()); filmR.position.z = .095; g.add(filmR);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(.035, .48, .012), M('#e83a3a', { roughness: .4 })); tab.position.set(0, .02, .1); g.add(tab);
  const lab_ = new THREE.Mesh(new THREE.PlaneGeometry(.2, .07), new THREE.MeshBasicMaterial({ map: textTex(['참치마요'], 256, 90, '#ffffff', '#1f5fd8', 54), transparent: true })); lab_.position.set(.08, -.1, .1); g.add(lab_);
  g.userData = { nori, filmL, filmR, tab, lab_ }; return g; }
const kbStage = new THREE.Group(); scene.add(kbStage); kbStage.position.set(STX, 1.2, 0);
const kb1 = kimbap(kbStage), kb2 = kimbap(kbStage);
const kbHand = kimbap(scene); kbHand.scale.setScalar(.35);
// police car
const policeCar = new THREE.Group(); scene.add(policeCar);
box(1.9, .5, .9, M('#f4f4f4', { roughness: .3 }), 0, .45, 0, true, policeCar); box(1.1, .4, .82, M('#1a2a4a', { roughness: .2 }), -.1, .88, 0, true, policeCar);
box(1.92, .12, .92, M('#1f4fd8'), 0, .5, 0, false, policeCar);
const sirenR = new THREE.MeshStandardMaterial({ color: '#400', emissive: '#ff2020', emissiveIntensity: 0 }), sirenB = new THREE.MeshStandardMaterial({ color: '#004', emissive: '#2050ff', emissiveIntensity: 0 });
const sbR = box(.18, .1, .25, sirenR, -.1, 1.13, -.12, false, policeCar);
const sbB = box(.18, .1, .25, sirenB, -.1, 1.13, .12, false, policeCar);
for (const [wx, wz] of [[-.6, .45], [.6, .45], [-.6, -.45], [.6, -.45]]) { const w = cyl(.2, .2, .12, blackM, wx, .2, wz, 16, policeCar); w.rotation.x = Math.PI / 2; }
const sirenLight = new THREE.PointLight('#ff2020', 0, 8, 1.2); policeCar.add(sirenLight); sirenLight.position.y = 1.6;
// panic button under the counter
const panic = new THREE.Group(); scene.add(panic); panic.position.set(1.4, .62, -1.33);
box(.18, .18, .05, M('#f4d21f'), 0, 0, 0, false, panic); const panicBtn = cyl(.05, .05, .05, M('#e82020', { roughness: .3 }), 0, 0, -.04, 16, panic); panicBtn.rotation.x = Math.PI / 2;
// mini city (50,000)
const miniStores = []; for (let i = 0; i < 90; i++) { let x, z; do { x = rr(-60, 60); z = rr(-55, 45); } while (Math.abs(x) < 9 && z > -6 && z < 18);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.round(rr(0, 3)) * Math.PI / 2; scene.add(g);
  box(2.4, 1.6, 1.8, M('#e9e6df'), 0, .8, 0, false, g); box(2.3, .35, .05, new THREE.MeshStandardMaterial({ color: '#000', emissive: ['#2a6aff', '#2ac85a', '#ff3a7a', '#7a3aff'][i % 4], emissiveIntensity: 1.6 }), 0, 1.4, .92, false, g);
  box(2.2, .9, .03, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#f4fbff', emissiveIntensity: .8 }), 0, .55, .91, false, g);
  g.userData.d = Math.hypot(x, z); miniStores.push(g); }
const cityBlocks = []; for (let i = 0; i < 70; i++) { const x = rr(-65, 65), z = rr(-60, 50); if (Math.abs(x) < 14 && z > -8 && z < 20) continue; const h = rr(3, 9); cityBlocks.push(box(rr(3, 6), h, rr(3, 6), nbM, x, h / 2, z, false)); }

// ---------- people ----------
const du = person('#3f8f6a', { long: true }), albaP = person('#3a6ad8', { apron: '#1f4fd8' }), f1 = person('#e8b03a'), f2 = person('#d85a8a', { perm: true });
const crowd = ['#e86a3a', '#5ac8a0', '#8a6ad8', '#f4f4f4', '#3a8ae8', '#c8a03a', '#d84a4a'].map((c, i) => person(c, i % 3 === 1 ? { perm: true } : {}));
const seat = (p, ch, pose) => { p.visible = true; tableSet.updateMatrixWorld(true); const c = chairs[ch]; const w = c.getWorldPosition(V(0, 0, 0)); putP(p, V(w.x, .1, w.z), c.rotation.y); applyPose(p, SIT(pose)); };

// ---------- labels ----------
const labS = (s, k, x, y, z, w) => lab(s, k, x, y, z, w * 2.6);
const LB = { clock: label('22:00', 1, '#ff6a5a'), hungry: label('배고파...', 1, '#8fd8ff'), h24: label('24시간'), lazy: label('귀찮아~', 1, '#8fb0ff'), min3: label('3분', 1, '#ffd21f'), done: label('끝!'),
  q: label('?', 1, '#ffffff'), cheers: label('짠!', 1, '#ffd21f'), c4: label('4캔'), solo: label('혼밥...', 1, '#8fb0ff'), soggy: label('눅눅 ✕', 1, '#ff6a5a'),
  n1: label('1', 1, '#ffffff'), n2: label('2', 1, '#ffffff'), n3: label('3', 1, '#ffffff'), basak: label('바삭!'), more: label('하나 더!', 1, '#ff8ab0'), p11: label('1+1', 1, '#ff3a7a'), free: label('공짜!'),
  scared: label('무서워...', 1, '#8fb0ff'), bell: label('비상벨', 1, '#ff6a5a'), siren: label('삐뽀삐뽀', 1, '#5a9aff'), daebak: label('대박!'), again: label('또?!', 1, '#ff8a4a'), n50k: label('50,000+'),
  justone: label('딱 하나만~', 1, '#ffd21f') };
for (const s of Object.values(LB)) overlay.add(s);

// ---------- camera ----------
const KEYS = [
  [0, V(.3, 1.7, 5.4), V(0, 1.65, 0)], [tw.g1, V(.2, 1.7, 4.9), V(0, 1.65, 0)],
  [tw.g1 + CUT, V(-.3, 1.7, 5.4), V(0, 1.5, 0), 1], [tw.s1, V(-.3, 1.75, 5.0), V(0, 1.5, 0)],
  [tw.s1 + CUT, V(0, 2.0, 8.2), V(0, 1.8, 0), 1], [tw.g2, V(0, 1.8, 6.4), V(0, 1.7, 0)],
  [tw.g2 + CUT, V(.7, 1.65, 4.3), V(.05, 1.4, 1.2), 1], [tw.s2, V(.6, 1.65, 4.0), V(.05, 1.4, 1.2)],
  [tw.s2 + CUT, V(-1.3, 1.45, 1.25), V(-1.65, 1.15, -.4), 1], [tw.g3, V(-1.35, 1.4, 1.05), V(-1.65, 1.15, -.4)],
  [tw.g3 + CUT, V(1.5, 1.9, 2.8), V(-.3, 1.1, -.6), 1], [tw.s3, V(1.4, 1.85, 2.6), V(-.3, 1.1, -.6)],
  [tw.s3 + CUT, V(-1.4, 1.9, 5.4), V(1.0, 1.0, 1.4), 1], [tw.g4, V(-1.2, 1.8, 5.0), V(1.1, 1.0, 1.4)],
  [tw.g4 + CUT, V(3.4, 1.55, 3.8), V(1.3, 1.0, 1.5), 1], [tw.s4, V(3.2, 1.5, 3.6), V(1.3, 1.0, 1.5)],
  [tw.s4 + CUT, V(1.42, 1.55, 2.85), V(1.34, .92, 1.92), 1], [tw.g5, V(1.42, 1.5, 2.7), V(1.34, .92, 1.92)],
  [tw.g5 + CUT, V(-.5, 1.3, 3.6), V(1.0, 1.0, 1.6), 1], [tw.s5, V(-.4, 1.3, 3.4), V(1.0, 1.0, 1.6)],
  [tw.s5 + CUT, V(STX, 1.35, 2.3), V(STX, 1.22, 0), 1], [tw.il - .3, V(STX, 1.32, 2.0), V(STX, 1.22, 0)], [tw.gamssa + .3, V(STX + .15, 1.3, 1.85), V(STX, 1.22, 0)], [tw.g6, V(STX + .15, 1.3, 1.85), V(STX, 1.22, 0)],
  [tw.g6 + CUT, V(.6, 1.65, 4.7), V(-.2, 1.45, 1.3), 1], [tw.s6, V(.5, 1.65, 4.4), V(-.2, 1.45, 1.3)],
  [tw.s6 + CUT, V(STX, 1.45, 3.6), V(STX, 1.3, 0), 1], [tw.g7, V(STX, 1.42, 3.3), V(STX, 1.3, 0)],
  [tw.g7 + CUT, V(1.0, 1.65, 1.6), V(1.45, 1.4, -1.6), 1], [tw.s7, V(1.0, 1.65, 1.4), V(1.45, 1.4, -1.6)],
  [tw.s7 + CUT, V(1.75, 1.15, -2.55), V(1.4, .62, -1.33), 1], [tw.police - .5, V(1.7, 1.1, -2.4), V(1.4, .62, -1.33)],
  [tw.police - .5 + CUT, V(-4.8, 2.0, 9.6), V(-1.6, 1.0, 3.6), 1], [tw.g8, V(-4.6, 2.0, 9.3), V(-1.4, 1.0, 3.6)],
  [tw.g8 + CUT, V(.4, 2.5, 7.0), V(0, 1.3, 0), 1], [tw.s8, V(.3, 2.4, 6.6), V(0, 1.3, 0)],
  [tw.s8 + CUT, V(2.6, 2.0, 6.0), V(0, 2.0, 13.0), 1], [tw.hanguk, V(2.4, 2.1, 6.6), V(0, 2.0, 13.0)],
  [tw.hanguk + CUT, V(0, 14, 26), V(0, 0, 4), 1], [tw.chukha - .1, V(0, 48, 62), V(0, 0, -2)],
  [tw.chukha + CUT, V(0, 1.9, 6.4), V(0, 1.4, 0), 1], [tw.g9, V(0, 1.85, 6.0), V(0, 1.4, 0)],
  [tw.g9 + CUT, V(-3.0, 1.7, 5.4), V(-2.2, 1.2, 1.9), 1], [tw.jina + .2, V(-1.2, 1.7, 5.2), V(-.3, 1.2, 1.9)], [END, V(-.6, 1.8, 4.6), V(-.2, 1.3, .4)]];

// ---------- timeline ----------
function update(t) {
  scene.background = skyTex.cache || (skyTex.cache = skyTex('#070b24', '#1a2450', '#3a3466', true));
  hemi.color.set('#8a9ad8'); hemi.groundColor.set('#2a2630'); hemi.intensity = .5; sun.color.set('#b8c8ff'); sun.intensity = .5; fill.intensity = .15; scene.environmentIntensity = .12;
  // ---- store: super -> closed -> 24h ----
  const closed = t > tw.dada - .1 && t < tw.s1 + .4, sk = closed ? Math.min(ease(t, tw.dada - .2, tw.dada + .4), 1 - ease(t, tw.s1, tw.s1 + .4)) : 0;
  shutter.visible = sk > .01; shutter.scale.y = Math.max(sk * 2.1, .001); shutter.position.y = 2.4 - sk * 2.1 / 2;
  shutterLines.forEach((l, i) => { const y = 2.4 - (i + .5) * .21; l.visible = sk > .01 && y > 2.4 - sk * 2.1; l.position.y = y; });
  const u = store.userData, is24 = t > tw.s1 + .3;
  u.signM.emissiveMap = is24 ? SIGN.pyeon : SIGN.super; u.signM.emissiveIntensity = closed ? .15 : is24 ? 1.4 + .1 * Math.sin(t * 3) : .9;
  u.lamp.intensity = closed ? 0 : is24 ? 10 : 5; u.ceilM.emissiveIntensity = closed ? .05 : is24 ? 1.5 : .7;
  if (is24) u.sign.scale.setScalar(1 + .12 * (1 - cl(pop(t, tw.s1 + .3))));
  const s2 = store2.userData; store2.visible = t > tw.saenggyeo - .3; store2.scale.setScalar(Math.max(pop(t, tw.saenggyeo - .3, .45), .001)); s2.lamp.intensity = 10;
  hotW.visible = t > tw.gigye - .3; hotW.scale.setScalar(Math.max(pop(t, tw.gigye - .3), .001));
  // ---- outdoor tables ----
  const tk = pop(t, tw.plastic - .2); tableSet.visible = t > tw.plastic - .2; tableSet.scale.setScalar(Math.max(tk, .001));
  parasol.visible = t > tw.parasol - .2; parasol.scale.setScalar(Math.max(pop(t, tw.parasol - .2), .001));
  // ---- police ----
  const pk = ease(t, tw.nureu + .2, tw.police + .3); policeCar.visible = t > tw.nureu && t < tw.g8 + .3; policeCar.position.set(lerp(-14, -1.2, pk), 0, 4.6);
  const flash = Math.sin(t * 18) > 0; sirenR.emissiveIntensity = flash ? 2.5 : .2; sirenB.emissiveIntensity = flash ? .2 : 2.5; sirenLight.intensity = policeCar.visible ? 5 : 0; sirenLight.color.set(flash ? '#ff2020' : '#2050ff');
  panic.visible = t > tw.s7 - .2 && t < tw.g8; panicBtn.position.z = t > tw.nureu && t < tw.nureu + .3 ? -.02 : -.04;
  // ---- mini city ----
  const cityOn = t > tw.hanguk - .1 && t < tw.chukha;
  miniStores.forEach(g => { g.visible = cityOn && t > tw.oman - .4 + g.userData.d / 70 * 1.6; if (g.visible) g.scale.setScalar(Math.max(pop(t, tw.oman - .4 + g.userData.d / 70 * 1.6), .001) * 1.6); });
  cityBlocks.forEach(b => b.visible = cityOn);
  // ---- kimbap stage ----
  const kbK = pop(t, tw.samgak - .2);
  kb1.visible = t > tw.samgak - .2; kb1.scale.setScalar(Math.max(kbK, .001) * 1.25); kb1.position.set(t > tw.s6 ? -.36 : 0, 0, 0); kb1.rotation.y = t < tw.il - .3 ? Math.sin(t * 1.5) * .25 : 0;
  { const d = kb1.userData, open = t > tw.s6 - .3; // 1: tab down, 2: left film off, 3: right film off, then nori wraps
    const a1 = ease(t, tw.il, tw.il + .4), a2 = ease(t, tw.i, tw.i + .4), a3 = ease(t, tw.sam2, tw.sam2 + .4), wrap = ease(t, tw.basak - .2, tw.gamssa);
    d.tab.visible = !open && a1 < .99; d.tab.position.y = .02 - a1 * .7; d.filmL.visible = !open && a2 < .99; d.filmL.position.x = -a2 * .5; d.filmL.material.opacity = .35 * (1 - a2);
    d.filmR.visible = !open && a3 < .99; d.filmR.position.x = a3 * .5; d.filmR.material.opacity = .35 * (1 - a3);
    const gap = open ? .1 : lerp(.1, .069, wrap); d.nori.forEach((n, i) => { n.position.z = (i ? 1 : -1) * gap; n.scale.y = 1; });
    const nuk = t > tw.nuknuk - .2 && t < tw.binil; d.nori.forEach(n => n.material.color.set(nuk ? '#3a4a2a' : '#1e2a1e')); d.lab_.visible = !open && a2 < .5; }
  kb2.visible = t > tw.plus - .2 && t < tw.g7; kb2.position.set(.36, 0, 0); kb2.scale.setScalar(Math.max(pop(t, tw.plus - .2), .001) * 1.25);
  { const d = kb2.userData; d.tab.visible = d.filmL.visible = d.filmR.visible = true; d.filmL.position.x = d.filmR.position.x = 0; d.filmL.material.opacity = d.filmR.material.opacity = .35; d.tab.position.y = .02; d.lab_.visible = true; d.nori.forEach((n, i) => { n.position.z = (i ? 1 : -1) * .1; n.scale.y = 1; }); }
  if (t > tw.s6 - .3) { kb1.userData.tab.visible = kb1.userData.filmL.visible = kb1.userData.filmR.visible = true; kb1.userData.filmL.position.x = kb1.userData.filmR.position.x = 0; kb1.userData.filmL.material.opacity = kb1.userData.filmR.material.opacity = .35; kb1.userData.tab.position.y = .02; kb1.userData.lab_.visible = true; kb1.userData.nori.forEach((n, i) => { n.position.z = (i ? 1 : -1) * .1; n.scale.y = 1; }); }
  // ---- people ----
  [du, albaP, f1, f2, ...crowd].forEach(p => { p.visible = false; p.scale.setScalar(1); });
  ramen.visible = false; kbHand.visible = false; friendCans.forEach(c => c.visible = false); fourPack.forEach(c => c.visible = false); ramenSteam.forEach(s => s.visible = false);
  const D = (pos, ry, pose) => { du.visible = true; putP(du, pos, ry); applyPose(du, pose); };
  if (t < tw.s1) { // in front of the shop: arrives, then the shutter slams
    const wk = ease(t, 0, tw.super_); const pose = t < tw.super_ ? WALK(UP.idle, t * 9, .4) : t < tw.baego ? UP.look : mixP(UP.idle, UP.tired, ease(t, tw.baego, tw.eopseo1));
    D(V(lerp(-.35, .15, wk), .1, 1.4), t < tw.super_ ? .7 : t < tw.g1 ? Math.PI - .3 : 0, pose); }
  else if (t < tw.g2) { D(V(.1, .1, 1.25), 0, mixP(UP.idle, UP.cheer, win(t, tw.bul, tw.g2, .3))); }
  else if (t < tw.s2) { D(V(.05, .1, 1.2), 0, mixP(UP.idle, UP.give, .7)); ramen.visible = true; ramen.position.copy(handPos(du, 1)).add(V(0, .08, .05)); }
  else if (t < tw.g3) { D(V(-.75, 0, -1.0), -2.4, mixP(UP.idle, UP.cook, .8)); ramen.visible = true; ramen.position.set(-1.5, 1.09, -.33);
    puffUpdate(ramenSteam, V(-1.5, 1.15, -.33), t, t > tw.butgo ? 1 : 0, { size: .14, rise: .35, spread: .03, op: .6 }); }
  else if (t < tw.s3) { D(V(-.2, 0, -.3), lerp(.6, -.6, ease(t, tw.ane, tw.eopseo2)), mixP(UP.give, UP.look, .5)); ramen.visible = true; ramen.position.copy(handPos(du, 1)).add(V(0, .08, .05)); }
  else if (t < tw.g5) { seat(du, 2, t > tw.g4 ? mixP(UP.table, UP.drink, .5 + .5 * Math.sin(t * 3)) : UP.eat); ramen.visible = true; ramen.position.set(1.35, .92, 1.25);
    puffUpdate(ramenSteam, V(1.35, .98, 1.25), t, 1, { size: .12, rise: .3, spread: .03, op: .5 }); }
  else if (t < tw.s5) { seat(du, 2, mixP(UP.table, UP.tired, .8)); }
  else if (t < tw.g6) { /* kimbap stage */ }
  else if (t < tw.s6) { D(V(-.2, .1, 1.3), .3, mixP(UP.eat, UP.thumb, ease(t, tw.deo - .3, tw.deo))); kbHand.visible = true; kbHand.position.copy(handPos(du, 1)).add(V(0, .1, .06)); }
  else if (t >= tw.g8 && t < tw.s8) { D(V(1.1, .1, 2.4), -.3, mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 6))); }
  else if (t >= tw.chukha && t < tw.g9) { D(V(0, .1, 1.6), 0, mixP(UP.idle, UP.cheer, .6 + .4 * Math.sin(t * 6))); }
  else if (t >= tw.g9) { // walks home along the sidewalk... and turns into the store
    const k1 = ease(t, tw.g9, tw.jina + .2), k2 = ease(t, tw.jina + .2, END - .3);
    if (k2 <= 0) D(V(lerp(-3.0, -.2, k1), .1, 1.9), Math.PI / 2, WALK(UP.idle, t * 9, .45)); else D(V(-.2, .1, lerp(1.9, .2, k2)), Math.PI, WALK(UP.idle, t * 9, .45)); }
  // friends with beer at the table
  if (t > tw.g4 - .2 && t < tw.g5) { for (const [p, ch, i] of [[f1, 0, 0], [f2, 1, 1]]) { p.visible = true; p.scale.setScalar(Math.max(pop(t, tw.g4 - .2 + i * .15), .001));
      seat(p, ch, t < tw.maekju1 ? UP.table : mixP(UP.drink, UP.cheer, t > tw.sijak ? .5 + .5 * Math.sin(t * 4 + i) : 0));
      friendCans[i].visible = true; friendCans[i].position.copy(handPos(p, 1)).add(V(0, .05, 0)); } }
  fourPack.forEach((c, i) => { c.visible = t > tw.ne - .1 + i * .12 && t < tw.g5; if (c.visible) { c.position.set(1.3 + (i % 2) * .08, .88, 1.88 + Math.floor(i / 2) * .08); c.scale.setScalar(Math.max(pop(t, tw.ne - .1 + i * .12), .001)); } });
  // part-timer behind the counter
  albaP.visible = (t > tw.g7 - .1 && t < tw.police - .5) || (t >= tw.g8 && t < tw.s8) || (t >= tw.chukha && t < tw.g9) || t >= tw.g9;
  if (albaP.visible) { putP(albaP, t > tw.s7 - .1 && t < tw.police - .5 ? V(.85, 0, -1.75) : V(1.45, 0, -1.75), t > tw.s7 - .1 && t < tw.police - .5 ? .6 : 0);
    applyPose(albaP, t < tw.s7 ? mixP(UP.idle, UP.shy, ease(t, tw.alba, tw.museo)) : t < tw.g8 ? mixP(UP.idle, UP.give, ease(t, tw.nureu - .4, tw.nureu)) : mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 5))); }
  // queue of customers
  const qOn = (t >= tw.g8 && t < tw.s8) || (t >= tw.chukha && t < tw.g9);
  crowd.forEach((p, i) => { p.visible = qOn; if (!qOn) return; p.scale.setScalar(Math.max(pop(t, tw.g8 + i * .08), .001));
    const pos = i < 4 ? V(-1.2 + i * .65, .1, .9 + (i % 2) * .15) : V(-1.8 + (i - 4) * .7, 0, -.9 - (i % 2) * .5);
    putP(p, pos, i < 4 ? Math.PI : rr(-1, 1) * 0 + 2.6); applyPose(p, t >= tw.chukha ? mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 6 + i)) : mixP(UP.idle, UP.give, .4)); });

  // ---- labels ----
  const HD = c => { c.updateMatrixWorld(true); return c.userData.head.localToWorld(V(0, .55, 0)); }, h = HD(du);
  labS(LB.clock, win(t, tw.yeol - .1, tw.baego, .15) * pop(t, tw.yeol - .1), 0, 2.85, .4, .5);
  labS(LB.hungry, win(t, tw.baego - .1, tw.s1, .15) * pop(t, tw.baego - .1), h.x, h.y, h.z, .4);
  labS(LB.h24, win(t, tw.seumul - .1, tw.g2, .15) * pop(t, tw.seumul - .1), 0, 3.65, .3, .75);
  labS(LB.lazy, win(t, tw.gwichan - .3, tw.s2, .15) * pop(t, tw.gwichan - .3), h.x, h.y, h.z, .3);
  labS(LB.min3, win(t, tw.sam1 - .1, tw.kkeut, .1) * pop(t, tw.sam1 - .1), -1.5, 1.4, -.3, .22);
  labS(LB.done, win(t, tw.kkeut - .05, tw.g3, .15) * pop(t, tw.kkeut - .05), -1.5, 1.4, -.3, .25);
  labS(LB.q, win(t, tw.eopseo2 - .4, tw.s3, .15) * pop(t, tw.eopseo2 - .4), h.x, h.y, h.z, .3);
  labS(LB.cheers, win(t, tw.sijak - .2, tw.s4, .15) * pop(t, tw.sijak - .2), 1.35, 1.95, 1.6, .35);
  labS(LB.c4, win(t, tw.ne, tw.g5, .15) * pop(t, tw.ne), 1.34, 1.12, 1.92, .1);
  labS(LB.solo, win(t, tw.honja1 - .1, tw.s5, .15) * pop(t, tw.honja1 - .1), h.x, h.y, h.z, .35);
  labS(LB.soggy, win(t, tw.nuknuk - .1, tw.il, .15) * pop(t, tw.nuknuk - .1), STX, 1.55, .1, .14);
  labS(LB.n1, win(t, tw.il - .1, tw.i, .1) * pop(t, tw.il - .1), STX, 1.55, .1, .16);
  labS(LB.n2, win(t, tw.i - .1, tw.sam2, .1) * pop(t, tw.i - .1), STX - .18, 1.4, .15, .16);
  labS(LB.n3, win(t, tw.sam2 - .1, tw.dangi + .3, .1) * pop(t, tw.sam2 - .1), STX + .18, 1.4, .15, .16);
  labS(LB.basak, win(t, tw.basak - .1, tw.g6, .15) * pop(t, tw.basak - .1), STX, 1.55, .1, .16);
  labS(LB.more, win(t, tw.deo - .2, tw.s6, .15) * pop(t, tw.deo - .2), h.x, h.y, h.z, .35);
  labS(LB.p11, win(t, tw.plus - .1, tw.g7, .15) * pop(t, tw.plus - .1), STX, 1.62, .1, .26);
  labS(LB.free, win(t, tw.gongjja - .1, tw.g7, .15) * pop(t, tw.gongjja - .1), STX + .32, 1.42, .2, .13);
  const ha = HD(albaP);
  labS(LB.scared, win(t, tw.museo - .3, tw.s7, .15) * pop(t, tw.museo - .3), ha.x, ha.y, ha.z, .3);
  labS(LB.bell, win(t, tw.bisang - .1, tw.police - .5, .15) * pop(t, tw.bisang - .1), 1.4, .85, -1.36, .1);
  labS(LB.siren, win(t, tw.police - .4, tw.g8, .15) * pop(t, tw.police - .4), policeCar.position.x, 2.0, 4.6, .6);
  labS(LB.daebak, win(t, tw.neomu - .1, tw.s8, .15) * pop(t, tw.neomu - .1), 0, 3.7, .4, .7);
  labS(LB.again, win(t, tw.saenggyeo - .1, tw.hanguk, .15) * pop(t, tw.saenggyeo - .1), 0, 4.0, 12.8, .9);
  labS(LB.n50k, win(t, tw.oman - .1, tw.chukha, .2) * pop(t, tw.oman - .1), 0, 12, 0, 9);
  labS(LB.justone, win(t, tw.jina - .1, END, .15) * pop(t, tw.jina - .1), h.x, h.y, h.z, .32);
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
