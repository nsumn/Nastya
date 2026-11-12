// ===================== KO 02 포장마차 (street tent bar) — night street, neon, rain/snow, soft look (VSM, DOF, bloom, grade) =====================
// Build: cat lib.js pocha_main.js > pocha.js  (./render_video.sh pocha ko02_pocha). Captions: caption layer (font Jua).
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FONT = 'Jua';
await document.fonts.load(`700 96px ${FONT}`);
const WORDS = await (await fetch('../ko02_pocha/words.json')).json();
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
  naembi: TE('냄비를'), pocha1: TE('포장마차가'),
  g1: G(1), bam: TE('밤이'), kkam: TE('깜깜해서'),
  s1: S(1), jeongu: TE('전구를'), maedara: TE('매달아'), bulbit: TE('불빛이'), sonnim: TE('손님을'),
  g2: G(2), bi: TE('비가'), bitmul: TE('빗물이'),
  s2: S(2), juhwang: TE('주황색'), cheonmak: TE('천막을'), chyeo: TE('쳐'),
  g3: G(3), jinaga: TE('지나가는'), molla: TE('몰라'),
  s3: S(3), menu: TE('메뉴를'), tteok2: TE('떡볶이', 2), sundae: TE('순대'), eomuk1: TE('어묵'),
  g4: G(4), gyeoul: TE('겨울엔'), chagawo: TE('차가워'),
  s4: S(4), sabang: TE('사방을'), binil: TE('비닐로'), dulleo: TE('둘러'), nanro: TE('난로를'), kyeo: TE('켜'),
  g5: G(5), maneunde: TE('많은데'), eopseo: TE('없어'),
  s5: S(5), plastic: TE('플라스틱'), uija: TE('의자를'), gabyeop: TE('가볍고'), ssaeu: TE('쌓으면'), ssok: TE('쏙'), deureoga: TE('들어가', 2),
  g6: G(6), tteokman: TE('떡볶이만'), maewo: TE('매워'),
  s6: S(6), eomuk2: TE('어묵을'), kkochi1: TE('꼬치에'), damga: TE('담가'), gongjja: TE('공짜야'), jongi: TE('종이컵으로'), dwae: TE('돼'),
  g7: G(7), chuun: TE('추운'), noga: TE('녹아'),
  s7: S(7), soju: TE('소주를'), sikyeo: TE('시켜'), juingong: TE('주인공이지'),
  g8: G(8), kkochi2: TE('꼬치를'), gieok: TE('기억'),
  s8: S(8), keobe: TE('컵에'), kkoja: TE('꽂아'), majimak: TE('마지막에'), seseo: TE('세서'), gyesan: TE('계산하는'),
  chukha: TE('축하해'), mandeul: TE('만들었어'), g9: G(9), jibe: TE('집에'), ga: TE('가') };

// ---------- sound ----------
const SFX = { end: END, music_gain: .06, events: [], beds: [[0, END, 'traffic', .25], [tw.sonnim, END, 'pub', .35], [tw.g2, tw.g3 + .3, 'rain', .9], [tw.g4, tw.sabang + .8, 'wind', .9], [tw.kyeo, END, 'fire', .15]] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
e(.05, 'whoosh', .4); e(tw.naembi, 'clack', .8); e(tw.pocha1, 'ding', .6);
e(tw.bam, 'boom', .5); for (let k = 0; k < 6; k++) e(tw.jeongu + k * .12, 'pop', .5); e(tw.bulbit, 'sparkle', .7);
e(tw.bitmul, 'splash', .7); e(tw.cheonmak, 'swoosh_up', .9); e(tw.chyeo, 'poof', .6);
e(tw.molla, 'boing', .5); e(tw.menu, 'pop', .6); e(tw.tteok2, 'pop', .6); e(tw.sundae, 'pop', .6); e(tw.eomuk1, 'pop', .6);
e(tw.chagawo, 'brr', .8); e(tw.binil, 'swoosh_up', .8); e(tw.kyeo, 'poof', .8);
e(tw.eopseo, 'boing', .5); for (let k = 0; k < 4; k++) e(tw.uija + k * .15, 'clack', .6); e(tw.ssaeu, 'clack', .7); e(tw.ssok, 'whoosh', .8);
e(tw.maewo, 'poof', 1); e(tw.maewo + .1, 'crackle', .8);
e(tw.eomuk2, 'splash', .5); e(tw.gongjja, 'ding', .7); e(tw.jongi, 'splash', .4);
e(tw.chuun, 'brr', .6); e(tw.soju, 'clink', .8); e(tw.juingong, 'tada', .7);
e(tw.gieok, 'boing', .5); for (let k = 0; k < 8; k++) e(tw.kkoja - .2 + k * .12, 'tick', .7); e(tw.gyesan, 'ding', .8);
e(tw.chukha, 'tada', .9); e(tw.chukha + .15, 'clink', .7); e(tw.jibe, 'boing', .6);
window.SFX = SFX;

// ---------- textures + light ----------
const TL = new THREE.TextureLoader();
const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
const pbr = async n => ({ d: await ld(n + '_diff_1k.jpg', true), n: await ld(n + '_nor_gl_1k.jpg', false) });
const [TX_ASP, TX_CON, HDR] = await Promise.all([pbr('asphalt_02'), pbr('concrete_wall_004'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
HDR.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(HDR).texture;
scene.fog = null;
renderer.shadowMap.type = THREE.VSMShadowMap;
function texMat(p, color, rx, ry, o = {}) { const d = p.d.clone(), n = p.n.clone(); d.repeat.set(rx, ry); n.repeat.set(rx, ry); d.needsUpdate = n.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: d, normalMap: n, color, roughness: o.rough ?? .8 }); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); return m; }
const roadM = texMat(TX_ASP, '#6a6866', 8, 8, { rough: .55 }), walkM = texMat(TX_CON, '#9a948c', 6, 2, { ns: .5 }), wallM = texMat(TX_CON, '#5a5450', 6, 4, { ns: .6 });
const steelM = new THREE.MeshStandardMaterial({ color: '#b4b8bd', metalness: .75, roughness: .45 });
const blackM = M('#151515', { roughness: .5 }), whiteM = M('#ffffff', { roughness: .3 });
const greenGlassM = new THREE.MeshStandardMaterial({ color: '#3fae5a', roughness: .1, metalness: .1, transparent: true, opacity: .88 });
const sauceM = new THREE.MeshStandardMaterial({ color: '#d8301a', roughness: .25, emissive: '#5a0a00', emissiveIntensity: .2 });
const brothM = new THREE.MeshStandardMaterial({ color: '#c89a5a', roughness: .15, transparent: true, opacity: .9 });
const plasticM = new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: .16, roughness: .05, metalness: .1, depthWrite: false, side: THREE.DoubleSide });
const tentM = new THREE.MeshStandardMaterial({ color: '#f08a28', roughness: .7, side: THREE.DoubleSide });

// ---------- sky (dusk -> night) ----------
const skyTex = (top, mid, bot, stars) => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, top); gr.addColorStop(.55, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  if (stars) for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${rr(.2, .8)})`; g.beginPath(); g.arc(rr(0, 540), rr(0, 500), rr(.5, 1.4), 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const duskSky = skyTex('#3a4a8a', '#c86a7a', '#f2a860', false), nightSky = skyTex('#05081a', '#0e1530', '#1a2040', true);

// ---------- street: road, sidewalk, buildings with neon signs ----------
function box(w, h, d, mat, x, y, z, cast = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; scene.add(m); return m; }
const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 30).rotateX(-Math.PI / 2), roadM); road.position.set(0, -.12, 8); road.receiveShadow = true; scene.add(road);
box(60, .12, 9, walkM, 0, -.06, -2.0, false);
function textTex(lines, w, h, bg, fg, size, glow) { const [c, g] = cv(w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = `700 ${size}px ${FONT}`; if (glow) { g.shadowColor = fg; g.shadowBlur = 18; } g.fillStyle = fg; g.fillText(l, w / 2, h * (i + .5) / lines.length); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const winTex = (() => { const [c, g] = cv(256, 512); g.fillStyle = '#1c1a1e'; g.fillRect(0, 0, 256, 512);
  for (let y = 20; y < 500; y += 64) for (let x = 16; x < 250; x += 60) { const on = rnd() < .55; g.fillStyle = on ? (rnd() < .5 ? '#ffd890' : '#cfe4ff') : '#2a2830'; g.fillRect(x, y, 40, 40); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const winM = new THREE.MeshStandardMaterial({ map: winTex, emissive: '#ffffff', emissiveMap: winTex, emissiveIntensity: .0, roughness: .8 });
[[-6.5, 7], [-1.8, 9], [2.6, 6.5], [7, 8.5]].forEach(([x, h], i) => { box(4.4, h, 3, wallM, x, h / 2 - .05, -7.6, false); const f = new THREE.Mesh(new THREE.PlaneGeometry(4.2, h - 1), winM); f.position.set(x, h / 2 + .4, -6.09); scene.add(f); });
const NEON = [['치킨', '#ff4a4a', -6.5, 3.2], ['노래방', '#ff5adc', -1.8, 3.6], ['편의점', '#5ab4ff', 2.6, 3.0], ['PC방', '#5aff8a', 7, 3.4]].map(([txt, col, x, y]) => {
  const tex = textTex([txt], 512, 160, '#000000', col, 120, true);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .82), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0 })); m.position.set(x, y, -6.05); scene.add(m); return m; });
const streetLamp = new THREE.Group(); scene.add(streetLamp); streetLamp.position.set(-4.2, 0, 1.2);
{ const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 4.2, 10), M('#3a3c40', { metalness: .5 })); p.position.y = 2.1; streetLamp.add(p);
  const a = new THREE.Mesh(new THREE.BoxGeometry(.9, .06, .1), M('#3a3c40')); a.position.set(.42, 4.2, 0); streetLamp.add(a);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe0a8', emissiveIntensity: 0 })); b.position.set(.82, 4.12, 0); streetLamp.add(b); streetLamp.userData.bulb = b; }

// ---------- lights ----------
const hemi = scene.children.find(o => o.isHemisphereLight);
sun.shadow.radius = 7; sun.shadow.blurSamples = 8; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005;
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.camera.updateProjectionMatrix();
sun.position.set(3, 7, 5); sun.target.position.set(0, 0, -.5); sun.target.updateMatrixWorld();
const bulbLight = new THREE.PointLight('#ffc47a', 0, 6, 1.6); bulbLight.position.set(0, 2.0, .2); scene.add(bulbLight);
const heatLight = new THREE.PointLight('#ff6a20', 0, 2.5, 2); heatLight.position.set(1.45, .8, -1.0); scene.add(heatLight);

// ---------- cart (리어카) + food ----------
const cart = new THREE.Group(); scene.add(cart); cart.position.set(0, 0, -.6);
{ const wood = M('#8a6a4a', { roughness: .7 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, .08, .85), M('#6e7276', { metalness: .4, roughness: .65 })); top.position.y = .88; cart.add(top);
  const bodyB = new THREE.Mesh(new THREE.BoxGeometry(1.8, .55, .8), M('#2f6ab0', { roughness: .5 })); bodyB.position.y = .58; cart.add(bodyB);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(.26, .06, 10, 24), blackM); w.position.set(s * .5, .26, .44); cart.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .05, 12).rotateX(Math.PI / 2), steelM); hub.position.set(s * .5, .26, .44); cart.add(hub); }
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .8, 8).rotateZ(Math.PI / 2), wood); h.position.set(1.25, .8, s * .3); cart.add(h); }
  cart.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
const CT = .92;
const pan = new THREE.Group(); scene.add(pan);
{ const p = new THREE.Mesh(new THREE.BoxGeometry(.62, .07, .46), steelM); p.position.y = .035; pan.add(p);
  const sc = new THREE.Mesh(new THREE.BoxGeometry(.58, .02, .42), sauceM); sc.position.y = .065; pan.add(sc);
  for (let i = 0; i < 26; i++) { const r = new THREE.Mesh(new THREE.CapsuleGeometry(.018, .07, 4, 8).rotateZ(Math.PI / 2), M(i % 5 ? '#f4e8dc' : '#e8a080', { roughness: .4 })); r.position.set(rr(-.24, .24), .085, rr(-.17, .17)); r.rotation.y = rr(0, 3); pan.add(r); }
  pan.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
const tray = new THREE.Group(); scene.add(tray);
{ const t = new THREE.Mesh(new THREE.BoxGeometry(.5, .09, .34), steelM); t.position.y = .045; tray.add(t);
  const b = new THREE.Mesh(new THREE.BoxGeometry(.46, .02, .3), brothM); b.position.y = .085; tray.add(b);
  for (let k = 0; k < 2; k++) { const d = new THREE.Mesh(new THREE.BoxGeometry(.01, .08, .3), steelM); d.position.set(-.08 + k * .16, .06, 0); tray.add(d); } }
// odeng skewers (zigzag fishcake on a stick)
const odengM = M('#e8c48a', { roughness: .5 }), stickM = M('#d8b88a', { roughness: .8 });
function skewer() { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .34, 6), stickM); st.position.y = .17; g.add(st);
  for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(.075, .05, .01), odengM); f.position.set(0, .045 + k * .036, (k % 2 ? 1 : -1) * .012); f.rotation.x = (k % 2 ? 1 : -1) * .6; g.add(f); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.fish = g.children.slice(1); scene.add(g); return g; }
const skewers = Array.from({ length: 8 }, () => skewer());
const sticks = Array.from({ length: 12 }, () => { const s = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .34, 6), stickM); s.castShadow = true; scene.add(s); return s; });
const paperCup = new THREE.Group(); scene.add(paperCup);
{ const c = new THREE.Mesh(new THREE.CylinderGeometry(.04, .03, .09, 18, 1, true).translate(0, .045, 0), M('#f6f2ea', { side: THREE.DoubleSide })); paperCup.add(c);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .005, 18), brothM); l.position.y = .07; paperCup.add(l); paperCup.userData.liq = l; }
const stickCup = new THREE.Group(); scene.add(stickCup);
{ const c = new THREE.Mesh(new THREE.CylinderGeometry(.045, .038, .11, 18, 1, true).translate(0, .055, 0), M('#d8d0c0', { side: THREE.DoubleSide, roughness: .6 })); stickCup.add(c); }
const soju = (() => { const g = new THREE.Group(); scene.add(g); const h = .23;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, h * .62, 20), greenGlassM); b.position.y = h * .31; g.add(b);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.014, .034, h * .2, 20), greenGlassM); s.position.y = h * .72; g.add(s);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(.013, .014, h * .16, 12), greenGlassM); n.position.y = h * .9; g.add(n);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(.0345, .0345, h * .25, 20, 1, true), new THREE.MeshStandardMaterial({ map: textTex(['소주'], 256, 96, '#f4fff4', '#1a5a2a', 60), roughness: .5 })); l.position.y = h * .3; l.rotation.y = -Math.PI / 2; g.add(l);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; })();
const shotG = (() => { const g = new THREE.Group(); scene.add(g); const c = new THREE.Mesh(new THREE.CylinderGeometry(.022, .019, .05, 16, 1, true).translate(0, .025, 0), plasticM); g.add(c); return g; })();
// steam over the pans
const puffTex = (() => { const [c, g] = cv(128, 128); const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, 'rgba(240,240,240,.9)'); r.addColorStop(.6, 'rgba(220,220,220,.4)'); r.addColorStop(1, 'rgba(200,200,200,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const steam = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { ph: rr(0, 1), x: i % 2 ? -.35 : .42, dx: rr(-.15, .15), dz: rr(-.1, .1) }; scene.add(s); return s; });

// ---------- tent: poles, bulb wire, canopy with the menu, plastic walls, heater ----------
const TX0 = -2.1, TX1 = 2.1, TZ0 = -1.9, TZ1 = 1.55, TH = 2.35;
const poles = [[TX0, TZ0], [TX1, TZ0], [TX0, TZ1], [TX1, TZ1]].map(([x, z]) => box(.05, TH, .05, steelM, x, TH / 2, z));
const bulbM = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffcf80', emissiveIntensity: 0 });
const bulbs = []; for (let i = 0; i < 7; i++) { const x = lerp(TX0 + .2, TX1 - .2, i / 6), y = TH - .2 - Math.sin(i / 6 * Math.PI) * .12;
  const b = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 10), bulbM); b.position.set(x, y, TZ1 - .1); scene.add(b); bulbs.push(b);
}
const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => V(lerp(TX0, TX1, i / 8), TH - .14 - Math.sin(i / 8 * Math.PI) * .12, TZ1 - .1))), 40, .006, 4), blackM); scene.add(wire);
const canopy = new THREE.Group(); scene.add(canopy);
{ const roof = new THREE.Mesh(new THREE.BoxGeometry(TX1 - TX0 + .3, .04, TZ1 - TZ0 + .3), tentM); roof.position.set(0, TH + .15, (TZ0 + TZ1) / 2); roof.castShadow = true; canopy.add(roof);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, TX1 - TX0, 4).rotateZ(Math.PI / 2), tentM); ridge.position.set(0, TH + .4, (TZ0 + TZ1) / 2); canopy.add(ridge);
  for (const s of [-1, 1]) { const sl = new THREE.Mesh(new THREE.PlaneGeometry(TX1 - TX0 + .3, (TZ1 - TZ0) / 2 + .2), tentM); sl.rotation.x = -Math.PI / 2 + s * .26; sl.position.set(0, TH + .27, (TZ0 + TZ1) / 2 + s * (TZ1 - TZ0) / 4); sl.castShadow = true; canopy.add(sl); } }
const menuCan = cv(1024, 160); const menuTex = new THREE.CanvasTexture(menuCan[0]); menuTex.colorSpace = THREE.SRGBColorSpace; let menuState = -1;
function drawMenu(n) { if (n === menuState) return; menuState = n; const g = menuCan[1]; g.fillStyle = '#f08a28'; g.fillRect(0, 0, 1024, 160); g.fillStyle = '#d06a10'; g.fillRect(0, 140, 1024, 20);
  g.font = `700 104px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 10; g.strokeStyle = '#7a2a00';
  ['떡볶이', '순대', '어묵'].forEach((w, i) => { if (i < n) { g.fillStyle = '#ffffff'; g.strokeText(w, 190 + i * 320, 74); g.fillText(w, 190 + i * 320, 74); } }); menuTex.needsUpdate = true; }
drawMenu(0);
const valance = new THREE.Mesh(new THREE.PlaneGeometry(TX1 - TX0 + .3, .5), new THREE.MeshStandardMaterial({ map: menuTex, side: THREE.DoubleSide, roughness: .7 })); valance.position.set(0, TH - .03, TZ1 + .15); canopy.add(valance);
const walls = [[TX1 - TX0, 0, TZ1], [TX1 - TX0, 0, TZ0], [TZ1 - TZ0, TX0, 0], [TZ1 - TZ0, TX1, 0]].map(([w, x, z], i) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, TH - .05), plasticM); m.geometry.translate(0, (TH - .05) / 2, 0);
  if (i < 2) m.position.set(0, 0, z); else { m.rotation.y = Math.PI / 2; m.position.set(x, 0, (TZ0 + TZ1) / 2); } scene.add(m); return m; });
const heater = new THREE.Group(); scene.add(heater); heater.position.set(1.5, 0, -1.25);
{ const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .55, 20), M('#3a3a3c', { metalness: .4, roughness: .5 })); b.position.y = .275; heater.add(b);
  const g = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .3, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#3a1a0a', emissive: '#ff5a10', emissiveIntensity: 0 })); g.position.y = .7; heater.add(g); heater.userData.glow = g;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, .03, 20), M('#3a3a3c')); top.position.y = .87; heater.add(top); heater.traverse(o => { if (o.isMesh) o.castShadow = true; }); }

// rain + snow (instanced), smoke-like breath
const DROPS = 260, rainIM = new THREE.InstancedMesh(new THREE.BoxGeometry(.008, .22, .008), new THREE.MeshBasicMaterial({ color: '#bcd4ff', transparent: true, opacity: .6 }), DROPS); scene.add(rainIM);
const snowIM = new THREE.InstancedMesh(new THREE.SphereGeometry(.025, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), DROPS); scene.add(snowIM);
const dropSeed = Array.from({ length: DROPS }, () => [rr(-4, 4), rr(-2.5, 4), rr(0, 1)]); const _m = new THREE.Matrix4(), _zero = new THREE.Matrix4().makeScale(0, 0, 0);
function weather(im, k, t, speed, drift, covered) { im.visible = k > .01; if (!im.visible) return;
  dropSeed.forEach(([x, z, p], i) => { const y = 4.2 - ((t * speed + p * 4.2) % 4.2); const xx = x + Math.sin(t * 2 + i) * drift;
    const inside = covered && xx > TX0 - .1 && xx < TX1 + .1 && z > TZ0 - .1 && z < TZ1 + .2 && y < TH + .2;
    if (i / DROPS > k || inside) im.setMatrixAt(i, _zero); else im.setMatrixAt(i, _m.makeTranslation(xx, y, z)); }); im.instanceMatrix.needsUpdate = true; }
// stools
const stoolCols = ['#d8282a', '#2a6ad8', '#d8282a', '#2a6ad8'];
const stools = stoolCols.map(c => { const g = new THREE.Group(); scene.add(g); const m = M(c, { roughness: .4 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .03, 20), m); top.position.y = .42; g.add(top);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .785, l = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, .42, 6), m); l.position.set(Math.cos(a) * .12, .21, Math.sin(a) * .12); l.rotation.set(Math.sin(a) * .12, 0, -Math.cos(a) * .12); g.add(l); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; });

// ---------- people (mannequin rig, Korean style) ----------
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

const imo = person('#e86a8a', { perm: true, hair: '#3a2418', apron: '#7a3ab0', long: true });
const du = person('#3f8f6a'), fr1 = person('#e08a3a', { hair: '#3a2416', beanie: '#2a2a6a' }), fr2 = person('#3a7fb0');
const passer = person('#8a3a8f', { hair: '#2a1a10' });
const SEATS = [V(0, 0, .45), V(-.75, 0, .5), V(.75, 0, .5)];
const cartCenter = V(0, 0, -.6);
const skin0 = du.userData.skin.material.color.clone();

// ---------- labels (sprites, Jua font) ----------
function label(text, w = 1, col = '#ffd21f') {
  const [c0, g0] = cv(8, 8); g0.font = `700 150px ${FONT}`; const tw_ = g0.measureText(text).width, cw = Math.ceil(tw_ + 60);
  const [c, g] = cv(cw, 256); g.font = `700 150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, cw / 2, 138); g.fillStyle = col; g.fillText(text, cw / 2, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.userData = { w, aspect: cw / 256 }; s.visible = false; return s; }
const overlay = new THREE.Scene();
const LB = { pocha: label('포장마차'), dark: label('깜깜', 1, '#8fb0ff'), rain: label('빗물', 1, '#8fd8ff'), q: label('?', 1, '#ffffff'), cold: label('추워!', 1, '#8fd8ff'),
  nanro: label('난로', 1, '#ff9a4a'), full: label('자리 없음', 1, '#ff6a5a'), ssok: label('쏙!'), hot: label('매워!', 1, '#ff4a3a'), free: label('공짜', 1, '#7cf07c'),
  star: label('주인공', 1, '#7cf07c'), q2: label('?', 1, '#ffd21f'), cnt: label('꼬치 12개'), time: label('새벽 3시', 1, '#8fb0ff') };
for (const s of Object.values(LB)) overlay.add(s);
function lab(s, k, x, y, z, w) { s.visible = k > .01; if (!s.visible) return; const h = (w ?? s.userData.w) / 4 * Math.max(k, .001); s.position.set(x, y, z); s.scale.set(h * s.userData.aspect, h, 1); }

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(42, W / H, .06, 120);
const CUT = .001;
const KEYS = [
  [0, V(1.9, 1.5, 4.4), V(0, 1.0, -.6)], [tw.g1, V(1.6, 1.45, 3.9), V(0, 1.0, -.6)],
  [tw.g1 + CUT, V(-1.6, 1.6, 4.2), V(0, 1.2, -.4), 1], [tw.s1, V(-1.4, 1.55, 3.9), V(0, 1.2, -.4)],
  [tw.s1 + CUT, V(-.9, 1.5, 3.3), V(0, 1.7, -.3), 1], [tw.g2, V(-.8, 1.45, 3.1), V(0, 1.6, -.3)],
  [tw.g2 + CUT, V(-1.0, 1.55, .35), V(-.38, .95, -.6), 1], [tw.s2, V(-.95, 1.52, .3), V(-.38, .95, -.6)],
  [tw.s2 + CUT, V(2.6, 2.2, 5.6), V(0, 1.4, -.3), 1], [tw.g3, V(2.3, 2.1, 5.2), V(0, 1.4, -.3)],
  [tw.g3 + CUT, V(4.2, 1.5, 5.6), V(1.0, 1.3, 2.6), 1], [tw.s3, V(4.0, 1.5, 5.4), V(1.0, 1.3, 2.4)],
  [tw.s3 + CUT, V(-1.4, 1.75, 4.4), V(-1.4, 2.2, 1.7), 1], [tw.tteok2 + .3, V(-1.4, 1.75, 4.3), V(-1.4, 2.2, 1.7)], [tw.sundae - .05, V(.05, 1.75, 4.25), V(.05, 2.2, 1.7)], [tw.eomuk1 - .05, V(1.45, 1.75, 4.2), V(1.45, 2.2, 1.7)], [tw.g4, V(1.45, 1.75, 4.1), V(1.45, 2.2, 1.7)],
  [tw.g4 + CUT, V(2.4, 1.9, 4.8), V(0, 1.1, 0), 1], [tw.s4, V(2.2, 1.85, 4.5), V(0, 1.1, 0)],
  [tw.s4 + CUT, V(-2.8, 1.8, 4.3), V(0, 1.0, -.3), 1], [tw.nanro - .1, V(-2.6, 1.75, 4.0), V(0, 1.0, -.3)],
  [tw.nanro + CUT, V(2.9, 1.35, .4), V(1.5, .65, -1.25), 1], [tw.g5, V(2.8, 1.33, .3), V(1.5, .65, -1.25)],
  [tw.g5 + CUT, V(3.6, 1.55, .5), V(0, 1.2, .5), 1], [tw.s5, V(3.5, 1.53, .5), V(0, 1.2, .5)],
  [tw.s5 + CUT, V(3.1, 1.15, .75), V(0, .5, .7), 1], [tw.ssaeu - .1, V(3.0, 1.13, .75), V(0, .5, .7)],
  [tw.ssaeu + CUT, V(3.0, 1.35, .85), V(.55, .6, .15), 1], [tw.g6, V(2.95, 1.33, .82), V(.55, .6, .15)],
  [tw.g6 + CUT, V(.3, 1.55, -1.45), V(0, 1.3, .45), 1], [tw.s6, V(.28, 1.53, -1.4), V(0, 1.3, .45)],
  [tw.s6 + CUT, V(.95, 1.4, -1.45), V(.45, .98, -.6), 1], [tw.g7, V(.92, 1.38, -1.4), V(.45, .98, -.6)],
  [tw.g7 + CUT, V(-.25, 1.55, -1.45), V(0, 1.3, .45), 1], [tw.s7, V(-.23, 1.53, -1.4), V(0, 1.3, .45)],
  [tw.s7 + CUT, V(.35, 1.35, -1.35), V(-.1, 1.0, -.15), 1], [tw.g8, V(.33, 1.33, -1.3), V(-.1, 1.0, -.15)],
  [tw.g8 + CUT, V(.1, 1.65, -1.15), V(0, .92, -.2), 1], [tw.s8, V(.1, 1.62, -1.1), V(0, .92, -.2)],
  [tw.s8 + CUT, V(.4, 1.3, -1.25), V(.1, 1.02, -.2), 1], [tw.chukha, V(.38, 1.28, -1.2), V(.1, 1.02, -.2)],
  [tw.chukha + CUT, V(2.7, 2.1, 5.4), V(0, 1.1, -.3), 1], [tw.g9, V(2.4, 2.0, 5.0), V(0, 1.1, -.3)],
  [tw.g9 + CUT, V(-1.1, 1.85, -.2), V(0, 1.72, -1.3), 1], [END, V(-1.05, 1.84, -.25), V(0, 1.72, -1.3)]];
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
function update(t) {
  // ---- dusk -> night ----
  const night = ease(t, tw.bam - .1, tw.kkam + .4), lights = ease(t, tw.jeongu - .05, tw.maedara + .3);
  scene.background = night > .5 ? nightSky : duskSky;
  hemi.color.set(night > .5 ? '#5a6aa0' : '#ffd0b0'); hemi.groundColor.set('#2a2018'); hemi.intensity = lerp(1.0, .28, night);
  sun.color.set(night > .5 ? '#8aa0ff' : '#ffb070'); sun.intensity = lerp(1.6, .35, night); fill.intensity = lerp(.35, .05, night);
  scene.environmentIntensity = lerp(.4, .06, night);
  winM.emissiveIntensity = lerp(.15, .9, night); NEON.forEach(n => n.material.emissiveIntensity = lerp(.3, 2.2, night));
  streetLamp.userData.bulb.material.emissiveIntensity = lerp(.5, 3, night);
  bulbs.forEach((b, i) => b.visible = t > tw.jeongu - .05 + i * .1); bulbM.emissiveIntensity = 3 * lights; bulbLight.intensity = 5 * lights;
  renderer.toneMappingExposure = lerp(1.0, 1.1, night);

  // ---- cart + food ----
  const pk = ease(t, tw.naembi - .45, tw.naembi);
  pan.position.set(-.38, lerp(CT + .8, CT, pk), -.6); pan.visible = t > tw.naembi - .45;
  tray.visible = t > tw.eomuk2 - .3; tray.position.set(.45, CT, -.6); tray.scale.setScalar(Math.max(pop(t, tw.eomuk2 - .3), .001));
  steam.forEach((s, i) => { const u = s.userData, ph = (t * .5 + u.ph) % 1; const src = u.x < 0 ? pan : tray; s.visible = src.visible; if (!s.visible) return;
    s.position.set(src.position.x + u.dx, CT + .12 + ph * .5, -.6 + u.dz); s.scale.setScalar(.08 + ph * .2); s.material.opacity = (1 - ph) * .45; });
  // skewers in the broth, one eaten at a time later
  skewers.forEach((s, i) => { s.visible = tray.visible; const k = pop(t, tw.kkochi1 - .2 + i * .06); s.scale.setScalar(Math.max(k, .001));
    s.position.set(.3 + (i % 4) * .08, CT + .04, -.66 + (i >> 2) * .1); s.rotation.set(.45, 0, (i % 2 ? .1 : -.1)); });
  // used sticks: pile on the counter, then into the cup
  const into = ease(t, tw.keobe - .2, tw.kkoja + .9);
  sticks.forEach((s, i) => { s.visible = t > tw.g8 - .05 && t < tw.g9 + 4; const kk = cl(into * 12 - i * .7);
    const pile = V(-.15 + (i % 6) * .05, CT + .006 + (i >> 1) * .004, -.2 + (i % 3) * .02); const cupP = V(.12 + Math.sin(i * 2.4) * .015, CT + .18, -.2 + Math.cos(i * 2.4) * .015);
    s.position.lerpVectors(pile, cupP, sm(kk)); s.rotation.set(lerp(Math.PI / 2, .1 * Math.sin(i), sm(kk)), i * .7, 0); });
  stickCup.visible = t > tw.s8 - .1 && t < tw.g9 + 4; stickCup.position.set(.12, CT, -.2); stickCup.scale.setScalar(Math.max(pop(t, tw.s8), .001));
  paperCup.visible = t > tw.jongi - .3 && t < tw.g7 + .2; paperCup.position.copy(t < tw.dwae ? V(lerp(.45, .2, ease(t, tw.jongi - .2, tw.jongi + .3)), CT + lerp(.12, 0, ease(t, tw.jongi, tw.jongi + .4)), -.25) : V(.2, CT, -.25));
  soju.visible = shotG.visible = t > tw.soju - .15; soju.position.set(-.1, CT, -.18); soju.scale.setScalar(Math.max(pop(t, tw.soju - .15), .001)); shotG.position.set(-.22, CT, -.12);
  // ---- tent, menu, walls, heater ----
  canopy.visible = t > tw.cheonmak - .2; canopy.scale.set(1, Math.max(pop(t, tw.cheonmak - .2, .5), .001), 1); canopy.position.y = (1 - ease(t, tw.cheonmak - .2, tw.chyeo)) * .6;
  drawMenu(t < tw.tteok2 - .05 ? 0 : t < tw.sundae - .05 ? 1 : t < tw.eomuk1 - .05 ? 2 : 3);
  walls.forEach((w, i) => { const k = ease(t, tw.binil - .3 + i * .12, tw.dulleo + .2 + i * .12); w.visible = k > .01; w.scale.y = Math.max(k, .001); });
  heater.visible = t > tw.nanro - .25; heater.scale.setScalar(Math.max(pop(t, tw.nanro - .25), .001));
  const hk = ease(t, tw.kyeo - .1, tw.kyeo + .4); heater.userData.glow.material.emissiveIntensity = 1.6 * hk; heatLight.intensity = 1.2 * hk;
  // ---- weather ----
  weather(rainIM, ease(t, tw.bi - .3, tw.bi + .3) * (1 - ease(t, tw.g3 - .2, tw.g3 + .3)), t, 9, .05, t > tw.cheonmak);
  weather(snowIM, ease(t, tw.gyeoul - .3, tw.gyeoul + .3) * (1 - ease(t, tw.g5, tw.g5 + .4)), t, 1.2, .35, t > tw.dulleo);

  // ---- stools: appear, stack, slide into the cart, then back for the rest ----
  const seatK = (i) => pop(t, tw.uija - .1 + i * .15);
  const stack = ease(t, tw.ssaeu - .15, tw.ssaeu + .45), inCart = ease(t, tw.ssok - .2, tw.deureoga + .2), back_ = t > tw.g6;
  stools.forEach((s, i) => { const seat = i < 3 ? SEATS[i].clone().add(V(0, 0, .05)) : V(1.2, 0, .9);
    const stackP = V(.9, .03 + i * .07, .9), cartP = V(.2, .55 + i * .07, -.6);
    let p = seat.clone(); if (!back_ && t > tw.ssaeu - .2) { p.lerpVectors(seat, stackP, stack); if (inCart > 0) p.lerpVectors(stackP, cartP, inCart); }
    s.visible = t > tw.uija - .1 && !(t > tw.deureoga + .2 && !back_); s.position.copy(p); s.scale.setScalar(Math.max(back_ ? 1 : seatK(i), .001)); });
  // ---- people ----
  const seated = t >= tw.g6;
  const arrive = ease(t, tw.sonnim - .4, tw.sonnim + .9);
  [du, fr1, fr2].forEach((p, i) => { const seat = SEATS[i]; let pos = seat.clone(), ry = Math.PI, pose = seated ? SIT(UP.table) : UP.idle, walking = false;
    if (t < tw.sonnim + .9) { const from = V(seat.x - 3.5 - i * .8, 0, 3.4); pos = from.clone().lerp(seat, arrive); ry = face(from, seat); walking = arrive > 0 && arrive < 1; p.visible = t > tw.sonnim - .5; if (arrive >= 1) ry = Math.PI; }
    else p.visible = true;
    if (t >= tw.s5 && t < tw.g6) pos.z += .6 * ease(t, tw.s5, tw.uija - .1);
    if (t >= tw.g4 && t < tw.kyeo) pose = mixP(pose, seated ? SIT(UP.cold) : UP.cold, ease(t, tw.gyeoul, tw.chagawo) * (.85 + .15 * Math.sin(t * 30 + i)));
    if (t >= tw.kyeo && t < tw.g5) pose = mixP(UP.idle, UP.warm, ease(t, tw.kyeo, tw.kyeo + .5));
    if (t >= tw.g5 && t < tw.uija) pose = mixP(UP.idle, UP.look, ease(t, tw.maneunde - .3, tw.eopseo));
    if (i === 0 && t >= tw.g6 && t < tw.s6) pose = SIT(mixP(UP.eat, UP.hot, ease(t, tw.maewo - .3, tw.maewo)));
    if (i === 0 && t >= tw.g7 && t < tw.s7) pose = SIT(mixP(UP.table, UP.cold, ease(t, tw.chuun, tw.noga)));
    if (i === 0 && t >= tw.s7 && t < tw.g8) pose = SIT(mixP(UP.table, UP.drink, win(t, tw.juingong - .4, tw.g8, .25)));
    if (t >= tw.g8 && t < tw.s8) pose = SIT(mixP(UP.table, UP.look, ease(t, tw.kkochi2, tw.gieok) * .7));
    if (t >= tw.chukha) pose = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6 + i)));
    if (walking) pose = WALK(UP.idle, t * 10 + i, .5);
    putP(p, pos, ry); applyPose(p, pose);
    // face goes red + fire when it's too spicy
    const hotK = i === 0 ? win(t, tw.maewo - .3, tw.s6, .2) : 0;
    p.userData.skin.material = p.userData.skin.material === skinM ? skinM.clone() : p.userData.skin.material; p.userData.skin.material.color.copy(skin0).lerp(new THREE.Color('#ff5a4a'), hotK);
    p.userData.fire.visible = hotK > .3; p.userData.fire.scale.setScalar(.6 + .4 * Math.sin(t * 25)); });
  // passer-by walking past, puzzled
  { const k = ramp(t, tw.g3 - .4, tw.s3 + .2); passer.visible = k > 0 && k < 1; const p = V(lerp(-2.5, 3.5, k), 0, 2.6); putP(passer, p, k < .45 || k > .75 ? Math.PI / 2 : Math.PI * .9); applyPose(passer, WALK(UP.look, t * 9, k > .45 && k < .75 ? .05 : .5)); }
  // owner
  { let pose = mixP(UP.idle, UP.cook, .8 + .2 * Math.sin(t * 3)); if (t < tw.naembi) pose = UP.cook;
    if (t >= tw.g4 && t < tw.kyeo) pose = mixP(UP.cook, UP.cold, ease(t, tw.gyeoul, tw.chagawo));
    if (t >= tw.chukha && t < tw.g9) pose = mixP(UP.idle, UP.cheer, .5 + .5 * Math.sin(t * 5));
    if (t >= tw.g9) pose = mixP(UP.idle, UP.tired, ease(t, tw.g9, tw.jibe));
    const aside = t >= tw.g5 && t < tw.chukha ? -.85 : 0; putP(imo, V(aside, 0, -1.3), aside ? .5 : t >= tw.g9 ? -.75 : 0); applyPose(imo, pose); }

  // ---- labels ----
  Object.values(LB).forEach(s => s.visible = false);
  lab(LB.pocha, win(t, tw.pocha1 - .1, tw.g1, .15) * pop(t, tw.pocha1 - .1), 0, 2.3, -.6, .9);
  lab(LB.dark, win(t, tw.kkam - .1, tw.s1, .15) * pop(t, tw.kkam - .1), 0, 2.1, -.4, .8);
  lab(LB.rain, win(t, tw.bitmul - .1, tw.s2, .15) * pop(t, tw.bitmul - .1), -.38, 1.25, -.6, .22);
  lab(LB.q, win(t, tw.molla - .2, tw.s3, .15) * pop(t, tw.molla - .2), passer.position.x, 2.05, 2.6, .9);
  lab(LB.cold, win(t, tw.chagawo - .1, tw.s4, .15) * pop(t, tw.chagawo - .1), 0, 2.15, .5, 1.0);
  lab(LB.nanro, win(t, tw.nanro - .05, tw.g5, .15) * pop(t, tw.nanro - .05), 1.5, 1.15, -1.25, .3);
  lab(LB.full, win(t, tw.eopseo - .1, tw.s5, .15) * pop(t, tw.eopseo - .1), 0, 2.1, .5, .9);
  lab(LB.ssok, win(t, tw.ssok - .05, tw.g6, .15) * pop(t, tw.ssok - .05), .35, 1.25, -.6, .5);
  lab(LB.hot, win(t, tw.maewo - .1, tw.s6, .15) * pop(t, tw.maewo - .1), 0, 1.95, .45, .5);
  lab(LB.free, win(t, tw.gongjja - .05, tw.g7, .15) * pop(t, tw.gongjja - .05), .42, 1.18, -.6, .3);
  lab(LB.star, win(t, tw.juingong - .1, tw.g8, .15) * pop(t, tw.juingong - .1), -.1, 1.3, -.18, .25);
  if (t > tw.gieok - .2 && t < tw.s8) { lab(LB.q2, pop(t, tw.gieok - .2), 0, 1.25, -.2, .4); }
  lab(LB.cnt, win(t, tw.seseo - .1, tw.chukha, .15) * pop(t, tw.seseo - .1), .1, 1.22, -.2, .22);
  lab(LB.time, ramp(t, tw.jibe - .3, tw.jibe) * pop(t, tw.jibe - .3), 0, 2.25, -1.3, .45);

  placeCamera(t);
  bokeh.uniforms.focus.value = camera.position.distanceTo(LOOK);
}

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
window.renderAt = (t, q = .93) => { update(t); composer.render(); renderer.autoClear = false; renderer.render(overlay, camera); renderer.autoClear = true;
  return renderer.domElement.toDataURL('image/jpeg', q); };
window.__done = true;
