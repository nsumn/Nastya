import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ===================== KO 03 노래방 (karaoke room) — soft look (VSM, DOF, bloom, grade) =====================
// Build: ./render_video.sh noraebang ko03_noraebang. Source parts: people rig / labels / post chain shared with pocha_main.js.
const FONT = 'Jua';
await document.fonts.load(`700 96px ${FONT}`);
const WORDS = await (await fetch('../ko03_noraebang/words.json')).json();
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
  norae: TE('노래를'), bureumyeon: TE('부르면'),
  g1: G(1), yeopjip: TE('옆집'), sikkeu: TE('시끄럽다고'), kwang: TE('쾅쾅'), chyeo: TE('쳐'),
  s1: S(1), jageun: TE('작은'), mandeulgo: TE('만들고'), byeok: TE('벽에'), ultung: TE('울퉁불퉁한'), bangeum: TE('방음'), butyeo: TE('붙여'),
  g2: G(2), gasa1: TE('가사가'), saenggak: TE('생각이'),
  s2: S(2), hwamyeon: TE('화면을'), gasa2: TE('가사를'), ttiwo: TE('띄워'), bureul: TE('부를'), geulja: TE('글자'), bakkwi: TE('바뀌어'),
  g3: G(3), manaseo: TE('많아서'), chaja: TE('찾아'),
  s3: S(3), dukkeoun: TE('두꺼운'), chaek: TE('노래책을'), beonho: TE('번호를'), remote: TE('리모컨으로'), nureumyeon: TE('누르면'), kkeut: TE('끝'),
  g4: G(4), moksori: TE('목소리가'), jagaseo: TE('작아서'), banju: TE('반주에'), mutyeo: TE('묻혀'),
  s4: S(4), mic: TE('마이크를'), echo: TE('에코를'), gasu: TE('가수가'),
  g5: G(5), buri: TE('불이'), ssuk: TE('쑥스러워'),
  s5: S(5), kkeugo: TE('끄고'), cheonjang: TE('천장에'), mirror: TE('미러볼을'), dollyeo: TE('돌려'),
  g6: G(6), chingu: TE('친구는'), simsim: TE('심심해'),
  s6: S(6), tamb: TE('탬버린을'), bakja: TE('박자가'), gwaenchana: TE('괜찮아'),
  g7: G(7), han1: TE('곡만', 1), han2: TE('곡만', 2), naga: TE('나가'),
  s7: S(7), sigan: TE('시간으로'), guseok: TE('구석에'), nameun: TE('남은'),
  g8: G(8), kkeutna: TE('끝나'), aswi: TE('아쉬워'),
  s8: S(8), sajang: TE('사장님이'), service: TE('서비스로'), samsip: TE('삼십'), neo: TE('넣어'),
  chukha: TE('축하해'), noraebang: TE('노래방을'), g9: G(9), majimak: TE('마지막'), daseot: TE('다섯'), beonjjae: TE('번째야') };

// ---------- sound ----------
const SFX = { end: END, music_gain: .03, events: [], beds: [[0, tw.s1 + .3, 'traffic', .15], [tw.hwamyeon, tw.g3, 'karaoke', .35], [tw.nureumyeon, tw.mic, 'karaoke', .6], [tw.mic, tw.g5, 'karaoke', .35], [tw.dollyeo, END, 'karaoke', .3]] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
e(.05, 'whoosh', .4);
for (let k = 0; k < 4; k++) e(tw.kwang - .1 + k * .2, 'knock', .9);
e(tw.jageun, 'swoosh_up', .8); e(tw.mandeulgo + .3, 'clack', .8); for (let k = 0; k < 8; k++) e(tw.ultung + k * .13, 'pop', .4);
e(tw.saenggak, 'boing', .5);
e(tw.hwamyeon, 'pop', .8); e(tw.ttiwo, 'sparkle', .6);
e(tw.chaja, 'boing', .5); e(tw.chaek, 'clack', .8); for (let k = 0; k < 5; k++) e(tw.beonho + .1 + k * .17, 'tick', .7); e(tw.kkeut, 'ding', .8);
e(tw.mic, 'pop', .7); e(tw.echo, 'sparkle', .6); e(tw.gasu, 'tada', .6);
e(tw.kkeugo, 'clack', .6); e(tw.mirror, 'sparkle', .8);
e(tw.simsim, 'boing', .4);
for (let k = 0; k < 6; k++) e(tw.tamb + k * .27 + (k % 2) * .06, 'jingle', .8);
for (let k = 0; k < 5; k++) e(tw.bakja + k * .33 + (k % 3) * .09, 'jingle', .6);
e(tw.han1, 'pop', .6); e(tw.han2, 'pop', .6);
e(tw.sigan, 'ding', .5); for (let k = 0; k < 6; k++) e(tw.kkeutna + k * .35, 'tick', .5);
e(tw.sajang, 'whoosh', .5); e(tw.samsip, 'fanfare', .9);
e(tw.chukha, 'tada', .9); e(tw.majimak, 'boing', .5); e(tw.daseot, 'ding', .7);
window.SFX = SFX;

// ---------- textures + light ----------
const TL = new THREE.TextureLoader();
const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
const pbr = async n => ({ d: await ld(n + '_diff_1k.jpg', true), n: await ld(n + '_nor_gl_1k.jpg', false) });
const [TX_CON, HDR] = await Promise.all([pbr('concrete_wall_004'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
HDR.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(HDR).texture;
scene.fog = null;
renderer.shadowMap.type = THREE.VSMShadowMap;
function texMat(p, color, rx, ry, o = {}) { const d = p.d.clone(), n = p.n.clone(); d.repeat.set(rx, ry); n.repeat.set(rx, ry); d.needsUpdate = n.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: d, normalMap: n, color, roughness: o.rough ?? .8 }); m.normalScale.set(o.ns ?? 1, o.ns ?? 1); return m; }
const groundM = texMat(TX_CON, '#8a8480', 10, 10, { ns: .5 }), nWallM = texMat(TX_CON, '#d8d0c4', 3, 2, { ns: .4 });
const blackM = M('#151515', { roughness: .5 }), whiteM = M('#ffffff', { roughness: .3 });
const steelM = new THREE.MeshStandardMaterial({ color: '#c4c8cd', metalness: .8, roughness: .35 });
const skyTex = (top, mid, bot) => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, top); gr.addColorStop(.55, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const duskSky = skyTex('#2a3270', '#a05a8a', '#f0a070');
function box(w, h, d, mat, x, y, z, cast = true, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; }
function textTex(lines, w, h, bg, fg, size) { const [c, g] = cv(w, h); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => { g.font = `700 ${size}px ${FONT}`; g.fillStyle = fg; g.fillText(l, w / 2, h * (i + .5) / lines.length); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// ---------- ground, room shell (walls slide up out of the floor), neighbour flat ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), groundM); ground.position.y = -.11; ground.receiveShadow = true; scene.add(ground);
const RX = 1.8, RZ0 = -2.0, RZ1 = 2.0, RH = 2.5;
const floorM = M('#5a3a2c', { roughness: .45 }); box(RX * 2, .1, RZ1 - RZ0, floorM, 0, -.05, 0, false);
const wallPM = M('#2e2648', { roughness: .8 });
const roomWalls = new THREE.Group(); scene.add(roomWalls);
box(RX * 2 + .1, RH, .1, wallPM, 0, RH / 2, RZ0 - .05, false, roomWalls);
box(.1, RH, RZ1 - RZ0, wallPM, -RX - .05, RH / 2, 0, false, roomWalls);
const DZ0 = .8, DZ1 = 1.65, DH = 2.0;   // door hole in the right wall
box(.1, RH, DZ0 - RZ0, wallPM, RX + .05, RH / 2, (RZ0 + DZ0) / 2, false, roomWalls);
box(.1, RH, RZ1 - DZ1, wallPM, RX + .05, RH / 2, (DZ1 + RZ1) / 2, false, roomWalls);
box(.1, RH - DH, DZ1 - DZ0, wallPM, RX + .05, (RH + DH) / 2, (DZ0 + DZ1) / 2, false, roomWalls);
const door = new THREE.Group(); roomWalls.add(door); door.position.set(RX + .02, 0, DZ0);
{ const p = new THREE.Mesh(new THREE.BoxGeometry(.05, DH, DZ1 - DZ0).translate(0, DH / 2, (DZ1 - DZ0) / 2), M('#6a2a3a', { roughness: .5 })); door.add(p);
  const w = new THREE.Mesh(new THREE.BoxGeometry(.06, .5, .3).translate(0, 1.35, (DZ1 - DZ0) / 2), new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffcf80', emissiveIntensity: .6 })); door.add(w);
  const h = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), steelM); h.position.set(-.05, 1.0, DZ1 - DZ0 - .1); door.add(h); }
const ceiling = new THREE.Group(); scene.add(ceiling);
box(RX * 2 + .2, .1, RZ1 - RZ0, M('#1e1a2e', { roughness: .9 }), 0, RH + .05, 0, false, ceiling);
const panelM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e0', emissiveIntensity: .5 });
const panel = box(1.2, .03, .5, panelM, 0, RH - .02, .4, false, ceiling);
// neighbour flat on the right
const nFlat = new THREE.Group(); scene.add(nFlat);
box(.14, RH, 4.4, nWallM, 2.6, RH / 2, 0, false, nFlat);
box(2.4, .1, 4.4, M('#8a7058', { roughness: .6 }), 3.8, -.05, 0, false, nFlat);
box(2.4, RH, .12, nWallM, 3.8, RH / 2, -2.2, false, nFlat);
{ const f = box(.6, .03, .45, M('#c8a070', { roughness: .6 }), 4.2, .62, -1.5, true, nFlat); box(.04, .6, .04, M('#8a6a4a'), 4.2, .31, -1.5, true, nFlat);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(.18, 24), new THREE.MeshStandardMaterial({ map: textTex(['11:40'], 256, 256, '#fff8e8', '#2a2a2a', 70) })); clock.position.set(3.6, 1.8, -2.13); nFlat.add(clock); }

// ---------- foam (egg-crate pyramids) on three walls ----------
const FOAM = [];
for (let iy = 0; iy < 12; iy++) for (let ix = 0; ix < 18; ix++) FOAM.push([V(-1.7 + ix * .2, .12 + iy * .2, RZ0 + .02), new THREE.Quaternion(), iy, ix]);
for (const s of [-1, 1]) for (let iy = 0; iy < 12; iy++) for (let iz = 0; iz < 20; iz++) { const z = -1.9 + iz * .2, y = .12 + iy * .2;
  if (s > 0 && z > DZ0 - .1 && z < DZ1 + .1 && y < DH + .1) continue;
  FOAM.push([V(s * (RX - .02), y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -s * Math.PI / 2), iy, iz]); }
const foamIM = new THREE.InstancedMesh(new THREE.ConeGeometry(.1, .1, 4, 1).rotateY(Math.PI / 4).rotateX(Math.PI / 2).translate(0, 0, .05), M('#3c3458', { roughness: .95 }), FOAM.length);
foamIM.receiveShadow = true; scene.add(foamIM);
const _m = new THREE.Matrix4(), _s = new THREE.Vector3();
let foamState = -1;
function foam(t) { const k0 = ramp(t, tw.ultung - .2, tw.butyeo + .2); const key = Math.round(k0 * 200); if (key === foamState) return; foamState = key; foamIM.visible = k0 > 0;
  FOAM.forEach(([p, q, iy, ix], i) => { const k = back(cl(k0 * 2.2 - (iy / 12) * .8 - ((ix * 7) % 5) * .05)); _s.setScalar(Math.max(k, .0001)); _m.compose(p, q, _s); foamIM.setMatrixAt(i, _m); }); foamIM.instanceMatrix.needsUpdate = true; }

// ---------- furniture ----------
const leatherM = M('#7a1a34', { roughness: .38 }), sofaL = new THREE.Group(), sofaR = new THREE.Group(); scene.add(sofaL, sofaR);
box(.6, .42, 3.4, leatherM, -1.45, .21, .1, true, sofaL); box(.16, .95, 3.4, leatherM, -1.68, .47, .1, true, sofaL);
box(.6, .42, 2.0, leatherM, 1.45, .21, -.45, true, sofaR); box(.16, .95, 2.0, leatherM, 1.68, .47, -.45, true, sofaR);
const table = new THREE.Group(); scene.add(table);
box(1.1, .05, .7, new THREE.MeshStandardMaterial({ color: '#16141e', roughness: .15, metalness: .2 }), 0, .4, .3, true, table);
for (const [x, z] of [[-.48, .0], [.48, .0], [-.48, .6], [.48, .6]]) box(.05, .38, .05, steelM, x, .19, z, true, table);
const TT = .425;
const cans = ['#e8302a', '#2a8ae8', '#f0c020'].map((c, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.033, .033, .12, 16), new THREE.MeshStandardMaterial({ color: c, metalness: .6, roughness: .3 })); m.position.set(-.45 + i * .13, TT + .06, .5 - (i % 2) * .08); m.castShadow = true; table.add(m); return m; });
// song book, remote, mic, tambourine
const book = new THREE.Group(); scene.add(book);
{ const pages = new THREE.Mesh(new THREE.BoxGeometry(.3, .11, .4), M('#f4f0e6', { roughness: .9 })); pages.position.y = .065; book.add(pages);
  for (const y of [.006, .124]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.32, .012, .42), M('#c8202a', { roughness: .5 })); c.position.y = y; book.add(c); }
  const lab_ = new THREE.Mesh(new THREE.PlaneGeometry(.26, .16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: textTex(['노래책'], 256, 160, '#c8202a', '#ffe060', 80) })); lab_.position.y = .131; book.add(lab_);
  book.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
const remote = new THREE.Group(); scene.add(remote);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, .17), M('#222228', { roughness: .4 })); remote.add(b);
  for (let i = 0; i < 6; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(.012, .008, .012), M(i === 5 ? '#e83a3a' : '#c8c8d0')); k.position.set(-.012 + (i % 2) * .024, .012, -.05 + (i >> 1) * .03); remote.add(k); } }
const mic = new THREE.Group(); scene.add(mic);
{ const h = new THREE.Mesh(new THREE.CylinderGeometry(.018, .013, .17, 12), M('#1a1a1e', { roughness: .4 })); h.position.y = .03; mic.add(h);
  const g = new THREE.Mesh(new THREE.SphereGeometry(.036, 16, 12), new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: .8, roughness: .45 })); g.position.y = .13; mic.add(g);
  const r = new THREE.Mesh(new THREE.TorusGeometry(.019, .005, 6, 16).rotateX(Math.PI / 2), M('#3ad8ff', { roughness: .3 })); r.position.y = .1; mic.add(r); mic.userData.ring = r; }
const tamb = new THREE.Group(); scene.add(tamb);
{ const r = new THREE.Mesh(new THREE.TorusGeometry(.1, .016, 8, 28), M('#d83a5a', { roughness: .4 })); tamb.add(r);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, j = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .008, 12).rotateX(Math.PI / 2), steelM); j.position.set(Math.cos(a) * .1, Math.sin(a) * .1, 0); j.rotation.z = a; tamb.add(j); } }

// ---------- screen (canvas: lyrics with colour wipe, song list, number entry, timer) + speakers ----------
const TVW = 1.7, TVH = .96;
const tvCan = cv(1024, 576), tvTex = new THREE.CanvasTexture(tvCan[0]); tvTex.colorSpace = THREE.SRGBColorSpace;
const tv = new THREE.Group(); scene.add(tv); tv.position.set(0, 1.42, RZ0 + .12);
{ const f = new THREE.Mesh(new THREE.BoxGeometry(TVW + .08, TVH + .08, .06), blackM); f.position.z = -.03; tv.add(f);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(TVW, TVH), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tvTex, emissiveIntensity: .95, roughness: .3 })); s.position.z = .002; tv.add(s); }
const speakers = [-1, 1].map(s => { const g = new THREE.Group(); scene.add(g); g.position.set(s * 1.3, 1.65, RZ0 + .2);
  const b = new THREE.Mesh(new THREE.BoxGeometry(.32, .5, .28), M('#1c1c22', { roughness: .5 })); g.add(b);
  for (const [y, r] of [[.1, .09], [-.12, .06]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 20), M('#3a3a44', { roughness: .7 })); c.position.set(0, y, .141); g.add(c); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; });
const LYR = [['오늘 밤 별빛 아래서', '너와 함께 노래해'], ['한 번 더 크게 불러', '목이 쉬어도 좋아']];
const SONGS = ['38501  첫눈 오는 날', '38502  바다로 가자', '38503  우리 오늘', '38504  안녕 내 사랑', '38505  밤하늘 별', '38506  달려라 청춘', '38507  비 오는 거리', '38508  그대 생각', '38509  여름 바람', '38510  너의 이름', '38511  다시 만나', '38512  오늘 밤'];
function tvBg(g, hue) { const gr = g.createLinearGradient(0, 0, 0, 576); gr.addColorStop(0, `hsl(${hue},55%,30%)`); gr.addColorStop(1, `hsl(${hue + 40},60%,14%)`); g.fillStyle = gr; g.fillRect(0, 0, 1024, 576);
  g.globalAlpha = .18; for (let i = 0; i < 7; i++) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(120 + i * 140, 140 + (i % 3) * 60, 40 + (i % 4) * 18, 0, 7); g.fill(); } g.globalAlpha = 1; }
function lyricLine(g, txt, y, p) { g.font = `700 78px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const w = g.measureText(txt).width, x0 = 512 - w / 2;
  g.lineWidth = 12; g.strokeStyle = '#10204a'; g.strokeText(txt, 512, y); g.fillStyle = '#ffffff'; g.fillText(txt, 512, y);
  if (p > 0) { g.save(); g.beginPath(); g.rect(x0 - 10, y - 60, (w + 20) * p, 120); g.clip(); g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeText(txt, 512, y); g.fillStyle = '#1aa0ff'; g.fillText(txt, 512, y); g.restore(); } }
function drawTV(t) { const g = tvCan[1];
  if (t < tw.hwamyeon) { g.fillStyle = '#05050a'; g.fillRect(0, 0, 1024, 576); }
  else if (t < tw.g3) { tvBg(g, 230); const p = ramp(t, tw.bureul - .1, tw.g3 - .3) * 2; lyricLine(g, LYR[0][0], 330, cl(p)); lyricLine(g, LYR[0][1], 440, cl(p - 1));
    g.font = `700 40px ${FONT}`; g.fillStyle = '#ffe060'; g.textAlign = 'left'; g.fillText('♪ 오늘 밤', 40, 60); }
  else if (t < tw.s3) { g.fillStyle = '#101830'; g.fillRect(0, 0, 1024, 576); g.font = `700 46px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    const off = (t - tw.g3) * 260; for (let i = 0; i < 40; i++) { const y = 60 + i * 64 - off % (64 * 12); g.fillStyle = i % 2 ? '#c8d8ff' : '#ffffff'; g.fillText(SONGS[i % 12].replace('385', String(380 + (i * 7) % 19).padStart(3, '0')), 60, y); } }
  else if (t < tw.g4) { tvBg(g, 280); const n = Math.floor(ramp(t, tw.beonho + .05, tw.remote + .2) * 5 + .001), num = '38512';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 54px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText('곡 번호', 512, 150);
    g.fillStyle = '#0a0a20'; g.fillRect(262, 220, 500, 150); g.font = `700 120px ${FONT}`; g.fillStyle = '#ffe060'; g.fillText(num.slice(0, n).padEnd(5, '_'), 512, 300);
    if (t > tw.nureumyeon) { g.font = `700 64px ${FONT}`; g.fillStyle = '#7cf07c'; g.fillText('예약 완료!', 512, 470); } }
  else { const k = Math.floor((t - tw.g4) / 3.2) % 2, p = ((t - tw.g4) % 3.2) / 3.2 * 2; tvBg(g, k ? 300 : 230); lyricLine(g, LYR[k][0], 330, cl(p)); lyricLine(g, LYR[k][1], 440, cl(p - 1));
    g.font = `700 40px ${FONT}`; g.fillStyle = '#ffe060'; g.textAlign = 'left'; g.fillText('♪ 오늘 밤  38512', 40, 60);
    if (t > tw.sigan - .1) { let m = Math.round(lerp(60, 1, ease(t, tw.guseok, tw.g8 + .8))); const red = t > tw.g8 && t < tw.samsip; if (t > tw.samsip) m = 31;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(660, 22, 340, 92); g.font = `700 50px ${FONT}`; g.textAlign = 'center';
      g.fillStyle = red ? (Math.sin(t * 14) > 0 ? '#ff4a3a' : '#ffffff') : '#ffffff'; g.fillText(`남은 시간 ${m}분`, 830, 70);
      if (t > tw.samsip) { g.fillStyle = '#ff5adc'; g.fillRect(560, 130, 440, 80); g.fillStyle = '#ffffff'; g.font = `700 52px ${FONT}`; g.fillText('서비스 +30분', 780, 172); } }
    if (t > tw.majimak - .1) { g.fillStyle = 'rgba(255,60,120,.9)'; g.fillRect(212, 150, 600, 110); g.fillStyle = '#ffffff'; g.font = `700 76px ${FONT}`; g.textAlign = 'center'; g.fillText('♪ 마지막 곡 ♪', 512, 208); } }
  tvTex.needsUpdate = true; }

// ---------- mirror ball + disco spots + light dots ----------
const ballG = new THREE.Group(); scene.add(ballG);
const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(.17, 2), new THREE.MeshStandardMaterial({ color: '#e8eaf0', metalness: 1, roughness: .12, flatShading: true, emissive: '#6a6a8a', emissiveIntensity: 0 })); ballG.add(ball);
const rod = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .5, 6), steelM); rod.position.y = .42; ballG.add(rod);
const BALL0 = V(0, 2.12, .2);
const spots = ['#ff3aa8', '#3ad8ff', '#ffe03a', '#7a5aff'].map(c => { const s = new THREE.SpotLight(c, 0, 9, .32, .6, 1); s.castShadow = false; scene.add(s, s.target); return s; });
const dotTex = (() => { const [c, g] = cv(64, 64); const r = g.createRadialGradient(32, 32, 1, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const DOTC = ['#ff6ac8', '#6ae8ff', '#fff06a', '#ffffff'];
const dots = Array.from({ length: 80 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: DOTC[i % 4], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const u = rr(-1, 1), a = rr(0, 6.283); s.userData.dir = V(Math.sqrt(1 - u * u) * Math.cos(a), u, Math.sqrt(1 - u * u) * Math.sin(a)); scene.add(s); return s; });
const _d = new THREE.Vector3();
function discoDots(t, k) { const rot = t * .9;
  dots.forEach(s => { s.visible = k > .01; if (!s.visible) return; const d0 = s.userData.dir; _d.set(d0.x * Math.cos(rot) - d0.z * Math.sin(rot), d0.y, d0.x * Math.sin(rot) + d0.z * Math.cos(rot));
    let best = 1e9; const c = BALL0;
    if (_d.x > 1e-3) best = Math.min(best, (RX - .04 - c.x) / _d.x); if (_d.x < -1e-3) best = Math.min(best, (-RX + .04 - c.x) / _d.x);
    if (_d.z < -1e-3) best = Math.min(best, (RZ0 + .06 - c.z) / _d.z); if (_d.y < -1e-3) best = Math.min(best, (.01 - c.y) / _d.y); if (_d.y > 1e-3) best = Math.min(best, (RH - .03 - c.y) / _d.y);
    if (_d.z > 1e-3 && (RZ1 - c.z) / _d.z < best) { s.visible = false; return; }
    s.position.copy(c).addScaledVector(_d, best); s.scale.setScalar(.09 * k); s.material.opacity = .85 * k; }); }

// ---------- music notes + echo rings (sprites) ----------
const noteTex = (() => { const [c, g] = cv(128, 128); g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = 10;
  g.beginPath(); g.ellipse(46, 96, 22, 16, -.4, 0, 7); g.fill(); g.beginPath(); g.moveTo(66, 92); g.lineTo(66, 18); g.stroke();
  g.beginPath(); g.moveTo(66, 18); g.quadraticCurveTo(100, 30, 96, 62); g.stroke(); return new THREE.CanvasTexture(c); })();
const NOTEC = ['#ffd21f', '#ff6ac8', '#6ae8ff', '#7cf07c'];
function emitter(n) { return Array.from({ length: n }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: NOTEC[i % 4], transparent: true, depthWrite: false })); s.userData = { ph: i / n, dx: rr(-.5, .5), dz: rr(-.2, .3) }; scene.add(s); return s; }); }
function emit(pool, src, t, k, size = .12, rise = .7) { pool.forEach((s, i) => { s.visible = k > .01; if (!s.visible) return; const u = s.userData, a = (t * .7 + u.ph) % 1;
  s.position.set(src.x + u.dx * a * .8 + Math.sin(t * 3 + i) * .05, src.y + a * rise, src.z + u.dz * a); s.scale.setScalar(size * k * (.6 + .4 * Math.sin(Math.PI * a))); s.material.opacity = k * Math.sin(Math.PI * a); s.material.rotation = Math.sin(t * 4 + i) * .3; }); }
const notesDu = emitter(6), notesF1 = emitter(5), notesF2 = emitter(5), notesSpL = emitter(5), notesSpR = emitter(5);
const ringTex = (() => { const [c, g] = cv(128, 128); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke(); return new THREE.CanvasTexture(c); })();
const rings = Array.from({ length: 3 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: '#6ae8ff', transparent: true, depthWrite: false })); scene.add(s); return s; });

// ---------- lights ----------
const hemi = scene.children.find(o => o.isHemisphereLight);
sun.shadow.radius = 7; sun.shadow.blurSamples = 8; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005;
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); sun.shadow.camera.updateProjectionMatrix();
sun.position.set(2.5, 7, 5); sun.target.position.set(0, 0, -.5); sun.target.updateMatrixWorld();
const hallLight = new THREE.PointLight('#ffd8a0', 0, 3, 1.5); hallLight.position.set(RX + .5, 1.9, (DZ0 + DZ1) / 2); scene.add(hallLight);
const roomLight = new THREE.PointLight('#ffe6c8', 0, 7, 1.3); roomLight.position.set(0, 2.2, .4); scene.add(roomLight);
const tvLight = new THREE.PointLight('#6a8aff', 0, 4, 1.5); tvLight.position.set(0, 1.4, -1.3); scene.add(tvLight);

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
function label(text, w = 1, col = '#ffd21f') {
  const [c0, g0] = cv(8, 8); g0.font = `700 150px ${FONT}`; const tw_ = g0.measureText(text).width, cw = Math.ceil(tw_ + 60);
  const [c, g] = cv(cw, 256); g.font = `700 150px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 26; g.strokeStyle = '#000'; g.strokeText(text, cw / 2, 138); g.fillStyle = col; g.fillText(text, cw / 2, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.userData = { w, aspect: cw / 256 }; s.visible = false; return s; }
const overlay = new THREE.Scene();
function lab(s, k, x, y, z, w) { s.visible = k > .01; if (!s.visible) return; const h = (w ?? s.userData.w) / 4 * Math.max(k, .001); s.position.set(x, y, z); s.scale.set(h * s.userData.aspect, h, 1); }

Object.assign(UP, {
  singFree: [-.5, -.7, -.5, .7, -.5, -.5, 0, 0, 0, 0, -.05, -.2, 0, .5, 1.3],
  sing: [-.15, -.15, -1.0, -.6, -.2, -2.05, 0, 0, 0, 0, -.03, -.12, 0, .4, 1.2],
  bang: [-1.6, -.1, -1.6, .1, -1.0, -1.0, 0, 0, 0, 0, .08, 0, 0, -.8, 1.0],
  shy: [-1.3, .5, -1.3, -.5, -2.15, -2.15, 0, 0, 0, 0, .12, .38, 0, .7, .2],
  bored: [-.3, -.15, -1.45, .25, -.9, -2.5, 0, 0, 0, 0, .12, .15, .35, .5, .1],
  tamb: [-.3, -.2, -2.8, .35, -.9, -.4, 0, 0, 0, 0, -.05, -.15, 0, .6, 1.2],
  remote: [-.3, -.2, -1.0, .2, -.95, -1.3, 0, 0, 0, 0, .05, .12, 0, .2, .3],
  thumb: [0, -.1, -1.2, .25, -.15, -1.6, 0, 0, 0, 0, 0, -.05, 0, .3, 1.1] });

const du = person('#3f8f6a'), fr1 = person('#e08a3a', { hair: '#3a2416', beanie: '#2a2a6a' }), fr2 = person('#3a7fb0');
const nb = person('#b07ad8', { perm: true, hair: '#4a4a52', long: true });
const boss = person('#4a4a52', { hair: '#1a1a1a', apron: '#1a1a20' });
const skin0 = du.userData.skin.material.color.clone();
du.userData.skin.material = skinM.clone();
const DU = V(.95, 0, -.95), F1 = V(-1.28, 0, .35), F2 = V(1.28, 0, -.1);
const headP = c => { c.updateMatrixWorld(true); return c.userData.head.localToWorld(V(0, .25, .2)); };

// ---------- labels ----------
const LB = { kwang: label('쾅쾅!', 1, '#ff6a5a'), bangeum: label('방음', 1, '#ffffff'), q: label('?', 1, '#ffffff'), q2: label('?', 1, '#ffd21f'), num: label('38512'),
  small: label('...', 1, '#ffffff'), gasu: label('가수!'), shy: label('부끄', 1, '#ff8ab0'), simsim: label('심심...', 1, '#8fb0ff'), jing: label('찰랑!'),
  one1: label('한 곡만 더!'), one2: label('한 곡만 더!', 1, '#ff8ab0'), svc: label('서비스!', 1, '#7cf07c'), five: label('5번째', 1, '#ff5adc') };
for (const s of Object.values(LB)) overlay.add(s);

// ---------- camera ----------
const camera = new THREE.PerspectiveCamera(42, W / H, .06, 120);
const CUT = .001;
const KEYS = [
  [0, V(0, 1.6, 6.0), V(0, 1.05, .1)], [tw.g1, V(0, 1.55, 5.4), V(0, 1.1, .1)],
  [tw.g1 + CUT, V(2.85, 1.65, 2.5), V(3.05, 1.3, .0), 1], [tw.s1, V(2.85, 1.62, 2.3), V(3.05, 1.3, .0)],
  [tw.s1 + CUT, V(-1.4, 3.4, 7.0), V(0, .9, -.4), 1], [tw.byeok, V(-1.3, 3.1, 6.4), V(0, .9, -.4)],
  [tw.byeok + CUT, V(.6, 1.6, -.2), V(-1.6, 1.2, -1.5), 1], [tw.g2, V(.5, 1.58, -.25), V(-1.6, 1.2, -1.6)],
  [tw.g2 + CUT, V(-1.5, 2.0, 4.6), V(.3, 1.0, -.5), 1], [tw.s2, V(-1.4, 1.95, 4.3), V(.3, 1.0, -.5)],
  [tw.s2 + CUT, V(-.3, 1.5, 2.6), V(0, 1.35, -1.6), 1], [tw.bureul - .05, V(-.2, 1.45, 2.0), V(0, 1.4, -1.8)],
  [tw.bureul + CUT, V(0, 1.45, .55), V(0, 1.42, -1.9), 1], [tw.g3, V(0, 1.43, .4), V(0, 1.42, -1.9)],
  [tw.g3 + CUT, V(.9, 1.45, 1.2), V(-.1, 1.4, -1.6), 1], [tw.s3, V(.85, 1.43, 1.0), V(-.1, 1.4, -1.6)],
  [tw.s3 + CUT, V(.25, 1.45, 1.2), V(-.2, .45, .25), 1], [tw.beonho, V(.22, 1.4, 1.1), V(-.2, .45, .25)],
  [tw.beonho + CUT, V(.1, 1.45, .5), V(0, 1.42, -1.9), 1], [tw.remote - .05, V(.1, 1.44, .4), V(0, 1.42, -1.9)],
  [tw.remote + CUT, V(.6, 1.3, 1.4), V(.0, 1.25, -1.6), 1], [tw.g4, V(.55, 1.28, 1.3), V(0, 1.25, -1.6)],
  [tw.g4 + CUT, V(-.5, 1.5, 2.4), V(.4, 1.4, -1.3), 1], [tw.s4, V(-.45, 1.48, 2.2), V(.4, 1.4, -1.3)],
  [tw.s4 + CUT, V(.55, 1.6, .9), V(.95, 1.5, -.95), 1], [tw.echo, V(.6, 1.58, .75), V(.95, 1.5, -.95)],
  [tw.echo + CUT, V(-.3, 1.6, 2.7), V(.5, 1.4, -1.0), 1], [tw.g5, V(-.25, 1.58, 2.5), V(.5, 1.4, -1.0)],
  [tw.g5 + CUT, V(.6, 1.6, .85), V(.95, 1.5, -.95), 1], [tw.s5, V(.62, 1.6, .8), V(.95, 1.5, -.95)],
  [tw.s5 + CUT, V(-.2, 1.1, 2.9), V(0, 1.75, -.4), 1], [tw.g6, V(-.15, 1.05, 2.6), V(0, 1.8, -.3)],
  [tw.g6 + CUT, V(.5, 1.5, 2.4), V(-1.2, 1.0, .35), 1], [tw.s6, V(.45, 1.48, 2.25), V(-1.2, 1.0, .35)],
  [tw.s6 + CUT, V(.0, 1.5, 2.0), V(-1.2, 1.3, .35), 1], [tw.g7, V(-.05, 1.5, 1.9), V(-1.2, 1.3, .35)],
  [tw.g7 + CUT, V(-.8, 2.0, 5.6), V(.1, 1.05, -.4), 1], [tw.s7, V(-.7, 1.95, 5.2), V(.1, 1.05, -.4)],
  [tw.s7 + CUT, V(.3, 1.5, .5), V(.25, 1.48, -1.9), 1], [tw.g8, V(.32, 1.5, .4), V(.25, 1.48, -1.9)],
  [tw.g8 + CUT, V(0, 1.9, 5.4), V(0, 1.0, -.3), 1], [tw.s8, V(0, 1.85, 5.0), V(0, 1.0, -.3)],
  [tw.s8 + CUT, V(-.2, 1.55, 2.4), V(1.6, 1.4, 1.2), 1], [tw.samsip - .05, V(-.05, 1.55, 2.2), V(1.6, 1.4, 1.2)],
  [tw.samsip + CUT, V(.3, 1.5, .5), V(.25, 1.48, -1.9), 1], [tw.chukha, V(.32, 1.5, .4), V(.25, 1.48, -1.9)],
  [tw.chukha + CUT, V(-1.6, 2.1, 5.0), V(.3, 1.15, -.5), 1], [tw.g9, V(-1.4, 2.0, 4.5), V(.3, 1.15, -.5)],
  [tw.g9 + CUT, V(.7, 1.35, 2.3), V(-.1, 1.45, -1.4), 1], [END, V(.6, 1.35, 2.1), V(-.1, 1.45, -1.4)]];
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
  const built = t >= tw.s1, inRoom = t >= tw.g2;
  // ---- light: dusk outside -> room light -> bright -> dark disco ----
  const bright = win(t, tw.buri - .2, tw.kkeugo, .25), dark = ease(t, tw.kkeugo - .1, tw.kkeugo + .25), disco = ease(t, tw.mirror - .2, tw.mirror + .5);
  scene.background = duskSky;
  hemi.color.set(dark > .5 ? '#a08aff' : '#ffd8c0'); hemi.groundColor.set('#2a2030');
  const roomK = ease(t, tw.mandeulgo, tw.byeok);
  hemi.intensity = lerp(lerp(1.0, .55, roomK), .45, dark) + bright * .6;
  sun.color.set('#ffc08a'); sun.intensity = lerp(lerp(1.5, .7, roomK), .2, dark) + bright * .6; fill.intensity = lerp(.3, .02, dark);
  scene.environmentIntensity = lerp(lerp(.4, .25, roomK), .04, dark);
  roomLight.intensity = (roomK * 2.5 + bright * 3) * (1 - dark) + dark * .9; roomLight.color.set(dark > .5 ? '#b08aff' : '#ffe6c8'); panelM.emissiveIntensity = (.5 + bright * 2.5) * (1 - dark) + .05;
  tvLight.intensity = (t > tw.hwamyeon ? 1.2 : 0) * (1 + dark * .6);
  renderer.toneMappingExposure = 1.0 + bright * .25 + dark * .1;
  ball.material.emissiveIntensity = disco * .5;
  spots.forEach((s, i) => { s.intensity = 18 * disco; s.position.copy(BALL0); const a = t * (.9 + i * .25) + i * 1.6; s.target.position.set(Math.cos(a) * 1.6, i % 2 ? 0 : 1.2, Math.sin(a) * 1.4 - .2); s.target.updateMatrixWorld(); });
  discoDots(t, disco);
  // ---- shell ----
  const wk = ease(t, tw.jageun - .1, tw.mandeulgo + .3); roomWalls.visible = wk > .001; roomWalls.position.y = -(RH + .1) * (1 - wk);
  const ck = ease(t, tw.mandeulgo + .1, tw.byeok); ceiling.visible = ck > .001; ceiling.position.y = 2.5 * (1 - ck);
  nFlat.visible = nb.visible = t < tw.g2;
  foam(t);
  const doorK = ease(t, tw.s8 - .1, tw.sajang + .2) * (1 - ease(t, tw.g9, tw.g9 + .6)); door.rotation.y = -1.25 * doorK; hallLight.intensity = 5 * doorK;
  // ---- furniture + props ----
  sofaL.visible = sofaR.visible = table.visible = inRoom;
  tv.visible = speakers[0].visible = speakers[1].visible = t > tw.hwamyeon - .3;
  const tvk = Math.max(pop(t, tw.hwamyeon - .3, .45), .001); tv.scale.setScalar(tvk); speakers.forEach(s => s.scale.setScalar(Math.max(pop(t, tw.hwamyeon - .1), .001)));
  drawTV(t);
  book.visible = t > tw.dukkeoun - .2; book.position.set(-.2, TT, .25); book.rotation.y = .25; book.scale.setScalar(Math.max(pop(t, tw.dukkeoun - .2, .45), .001));
  ballG.visible = t > tw.cheonjang; ballG.position.set(BALL0.x, lerp(2.75, BALL0.y, ease(t, tw.cheonjang, tw.mirror + .2)), BALL0.z); ball.rotation.y = t * 1.2;

  // ---- people ----
  const f1Tamb = t >= tw.tamb - .2, cheering = (t >= tw.g7 && t < tw.s7) || t >= tw.chukha;
  [du, fr1, fr2].forEach((p, i) => { p.visible = true;
    let pos, ry, pose;
    if (!inRoom) { pos = [V(0, 0, .1), V(-.85, 0, .3), V(.85, 0, .3)][i]; ry = [0, .25, -.25][i]; pose = mixP(UP.idle, UP.singFree, .75 + .25 * Math.sin(t * 6 + i));
      if (t >= tw.g1) pose = mixP(pose, UP.look, ease(t, tw.kwang - .2, tw.kwang + .3) * .7); }
    else if (i === 0) { pos = DU; ry = -.45; pose = mixP(UP.idle, UP.singFree, .25 + .15 * Math.sin(t * 5)); }
    else { pos = i === 1 ? F1 : F2; ry = i === 1 ? Math.PI / 2 : -Math.PI / 2; pose = SIT(UP.idle); }
    if (inRoom && t < tw.s2) pose = i === 0 ? mixP(UP.idle, UP.look, ease(t, tw.gasa1, tw.saenggak)) : SIT(UP.look);
    if (t >= tw.g3 && t < tw.s3) pose = i === 0 ? mixP(UP.idle, UP.look, ease(t, tw.g3, tw.manaseo)) : SIT(mixP(UP.idle, UP.look, .8));
    if (i === 2 && t >= tw.s3 && t < tw.g4) pose = SIT(mixP(UP.idle, UP.remote, ease(t, tw.beonho - .3, tw.beonho + .2)));
    if (i === 0 && t >= tw.s4) pose = mixP(UP.sing, UP.singFree, .1 + .1 * Math.sin(t * 5));
    if (i === 0 && t >= tw.g5 && t < tw.kkeugo) pose = mixP(UP.sing, UP.shy, ease(t, tw.buri, tw.ssuk));
    if (i === 1 && t >= tw.g6 && t < tw.s6) pose = SIT(mixP(UP.idle, UP.bored, ease(t, tw.g6, tw.chingu)));
    if (i === 1 && f1Tamb) { const q = SIT(UP.tamb); q[2] += Math.sin(t * 22) * .12; q[5] += Math.sin(t * 22 + 1) * .2; pose = q; }
    if (cheering && i !== 0) pose = SIT(mixP(UP.table, UP.cheer, .6 + .4 * Math.sin(t * 6 + i)));
    if (i === 1 && f1Tamb && cheering) { const q = SIT(UP.tamb); q[2] += Math.sin(t * 22) * .12; pose = q; }
    if (t >= tw.g8 && t < tw.s8) pose = i === 0 ? mixP(UP.sing, UP.tired, ease(t, tw.g8, tw.aswi) * .8) : SIT(mixP(UP.idle, UP.tired, ease(t, tw.g8, tw.aswi)));
    putP(p, pos, ry); applyPose(p, pose); });
  // blush when the light is on
  { const k = win(t, tw.buri, tw.kkeugo + .3, .3); du.userData.cheeks.forEach(c => { c.material.opacity = .55 + .45 * k; c.scale.set(1 + k * .5, .55 + k * .3, .3); }); du.userData.skin.material.color.copy(skin0).lerp(new THREE.Color('#ff8a7a'), k * .5); }
  // neighbour bangs the wall
  { const bk = win(t, tw.yeopjip - .3, tw.s1 + .4, .2); const q = mixP(UP.idle, UP.bang, bk); const sw = Math.sin(t * 16); q[0] += sw * .35 * bk; q[2] -= sw * .35 * bk; q[13] = lerp(0, -.8, bk);
    putP(nb, V(3.12, 0, .1), -Math.PI / 2); applyPose(nb, q); nFlat.children[0].position.x = 2.6 + (bk > .1 ? Math.sin(t * 32) * .012 : 0); }
  // boss at the door
  { const k = ease(t, tw.s8, tw.sajang + .1); boss.visible = t > tw.s8 - .1 && t < tw.g9; putP(boss, V(lerp(2.6, RX - .2, k), 0, (DZ0 + DZ1) / 2), -Math.PI / 2);
    applyPose(boss, mixP(UP.idle, UP.thumb, ease(t, tw.service - .2, tw.samsip))); }
  // props in hands
  mic.visible = t > tw.mic - .1; if (mic.visible) { const hp = handPos(du, 1, V(0, -.05, .02)); mic.position.copy(hp); mic.rotation.set(-.25, du.rotation.y, .35); mic.scale.setScalar(Math.max(pop(t, tw.mic - .1), .001)); }
  remote.visible = t > tw.beonho - .3 && t < tw.g4 + .5; if (remote.visible) { remote.position.copy(handPos(fr2, 0, V(0, -.06, .03))); remote.rotation.set(0, fr2.rotation.y, 0); }
  tamb.visible = f1Tamb; if (tamb.visible) { tamb.position.copy(handPos(fr1, 1, V(0, -.12, 0))); tamb.rotation.set(Math.sin(t * 22) * .4, fr1.rotation.y + Math.PI / 2, .2); tamb.scale.setScalar(Math.max(pop(t, tw.tamb - .2), .001)); }
  // notes + echo
  const singOut = (t < tw.g1 + .8 ? 1 : 1 - ease(t, tw.kwang - .2, tw.kwang + .2)) * (t < tw.g2 ? 1 : 0);
  emit(notesDu, headP(du), t, inRoom ? (t < tw.s2 ? 0 : t < tw.g4 ? .0 : t < tw.mic ? .45 : 1) : singOut, t >= tw.g4 && t < tw.mic ? .05 : .13);
  emit(notesF1, headP(fr1), t + .3, singOut); emit(notesF2, headP(fr2), t + .6, singOut);
  const spk = win(t, tw.g4 - .1, tw.mic + .2, .2) * 1.0 + (t > tw.dollyeo ? .6 : 0) * (t < tw.g8 || t > tw.s8 ? 1 : 0);
  emit(notesSpL, speakers[0].position.clone().add(V(0, .2, .2)), t, spk, t < tw.mic + .2 ? .26 : .14, .9); emit(notesSpR, speakers[1].position.clone().add(V(0, .2, .2)), t + .5, spk, t < tw.mic + .2 ? .26 : .14, .9);
  const ek = win(t, tw.echo - .1, tw.g5 - .1, .2); rings.forEach((r, i) => { r.visible = ek > .01; const a = ((t - tw.echo) * 1.6 + i / 3) % 1; r.position.copy(mic.position).add(V(0, .14, 0)); r.scale.setScalar(.08 + a * .55); r.material.opacity = ek * (1 - a); });

  // ---- labels ----
  Object.values(LB).forEach(s => s.visible = false);
  lab(LB.kwang, win(t, tw.kwang - .15, tw.s1, .15) * pop(t, tw.kwang - .15) * (1 + .08 * Math.sin(t * 30)), 2.6, 2.0, .3, .7);
  lab(LB.bangeum, win(t, tw.bangeum - .1, tw.g2, .15) * pop(t, tw.bangeum - .1), -1.5, 1.95, -1.4, .45);
  lab(LB.q, win(t, tw.saenggak - .2, tw.s2, .15) * pop(t, tw.saenggak - .2), DU.x, 2.15, DU.z, 1.2);
  lab(LB.q2, win(t, tw.chaja - .3, tw.s3, .15) * pop(t, tw.chaja - .3), .1, 2.1, -1.2, .4);
  lab(LB.num, win(t, tw.beonho - .1, tw.beonho + .9, .15) * pop(t, tw.beonho - .1), -.2, .85, .25, .22);
  lab(LB.small, win(t, tw.jagaseo - .1, tw.s4, .15) * pop(t, tw.jagaseo - .1), DU.x, 1.95, DU.z, .25);
  lab(LB.gasu, win(t, tw.gasu - .1, tw.g5, .15) * pop(t, tw.gasu - .1), .6, 2.0, -1.0, .45);
  lab(LB.shy, win(t, tw.ssuk - .3, tw.s5, .15) * pop(t, tw.ssuk - .3), DU.x - .1, 1.92, DU.z + .2, .22);
  lab(LB.simsim, win(t, tw.simsim - .2, tw.s6, .15) * pop(t, tw.simsim - .2), F1.x + .1, 1.62, F1.z, .3);
  lab(LB.jing, win(t, tw.tamb + .1, tw.g7, .15) * pop(t, tw.tamb + .1), F1.x + .2, 1.95, F1.z, .3);
  lab(LB.one1, win(t, tw.han1 - .2, tw.s7, .15) * pop(t, tw.han1 - .2), -.55, 1.95, .3, .75);
  lab(LB.one2, win(t, tw.han2 - .2, tw.s7, .15) * pop(t, tw.han2 - .2), .5, 1.6, -.2, .75);
  lab(LB.svc, win(t, tw.service - .1, tw.samsip, .15) * pop(t, tw.service - .1), 1.95, 2.05, (DZ0 + DZ1) / 2, .4);
  lab(LB.five, ramp(t, tw.daseot - .2, tw.daseot) * pop(t, tw.daseot - .2), -.05, 2.05, -1.5, .8);

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
