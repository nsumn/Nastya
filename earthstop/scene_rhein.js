import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "Was wäre, wenn der Rhein austrocknet?" (German short, 20 s): Kaub at sunset, a barge on a gravel bar (2018 record 25 cm; below it in Aug 2026),
// trucks and freight trains replace the river, shelves get more expensive. Facts: Destatis (Rhine = 86.3% of German inland waterway freight, Jan–May 2022);
// WSA Rhein (gauge record 25 cm on 22 Oct 2018, broken Aug 2026). The gauge is a water level, not the depth.
// =================== timeline ===================
const RIVER = 3.2, TRUCK = 8.4, SHOP = 14.2, CARD = 19.4, T_END = 20.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 808;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const wrapR = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));
const fadeWin = (t, a, b, f = 0.35) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = n => Math.round(n).toLocaleString('en-US');
// =================== renderer ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
// every scene renders into a linear HDR target; one full-screen pass tone-maps both and dissolves between them
const RTA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }), RTB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed;
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB); c=mix(a,b,uMix); }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      gl_FragColor=vec4(srgb(c),1.0); }` });
const compScene = new THREE.Scene(), compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); compScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat));
function shootTo(rt, scene, camera) { camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera); }
function composite(mix, expA, expB) { const u = compMat.uniforms; u.uMix.value = mix; u.uExpA.value = expA; u.uExpB.value = expB; renderer.setRenderTarget(null); renderer.render(compScene, compCam); }
// =================== materials / builders ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }
function bx(w, h, d, col, x, y, z, parent, opts = {}) { const m = mesh(BOX, typeof col === 'string' ? M(col, { flatShading: true, ...opts }) : col); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function grp(x, y, z, ry, parent) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
// =================== smoke (cold-gas plumes): one Points cloud per scene, rebuilt every frame from emitters ===================
const smokeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uScale: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `attribute float aSize; attribute float aA; uniform float uScale; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(aSize*uScale/(-mv.z), 700.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uTint; varying float vA; void main(){ vec2 q=gl_PointCoord-0.5; float d=dot(q,q)*4.0; float a=exp(-d*3.0)*vA; if(a<0.01) discard; gl_FragColor=vec4(uTint*(0.9+0.1*(1.0-d)),a); }` });
function makeSmoke(scene, n) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3), sz = new Float32Array(n), al = new Float32Array(n);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(al, 1));
  const pts = new THREE.Points(geo, smokeMat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  let k = 0;
  return { begin() { k = 0; }, add(p, size, a) { if (k >= n) return; pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; sz[k] = size; al[k] = a; k++; },
    end() { for (let i = k; i < n; i++) al[i] = 0; geo.attributes.position.needsUpdate = true; geo.attributes.aSize.needsUpdate = true; geo.attributes.aA.needsUpdate = true; geo.setDrawRange(0, Math.max(1, k)); } };
}
// =================== the hero: same look in every scene (own seed so the height/hair never change) ===================
function makeHero() { const sv = seed; seed = 4242; const p = makePerson(rnd, { top: '#2fa89a', bottom: '#2a2e3a', hair: '#4a2f1b', skin: '#e9c4a2', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.3 }); seed = sv; return p; }
// =================== KAUB (meters): sunset over the Rhine; a barge stuck on a gravel bar, the castle on its island, the gauge board on the bank ===================
const kaub = new THREE.Scene(); kaub.fog = new THREE.Fog(0xf0b880, 70, 300); const kaubCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 600);
kaub.add(new THREE.HemisphereLight(0xffe0c0, 0x3a4a5a, 0.9)); const sunK = new THREE.DirectionalLight(0xffb070, 2.6); sunK.position.set(-40, 12, -70); sunK.castShadow = true; sunK.shadow.mapSize.set(2048, 2048); Object.assign(sunK.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 200 }); kaub.add(sunK, sunK.target); sunK.target.position.set(0, 0, -20);
{ const sky = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a2c5a'); gr.addColorStop(0.55, '#c86a5a'); gr.addColorStop(0.8, '#f4a660'); gr.addColorStop(1, '#ffd890'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sk = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), new THREE.MeshBasicMaterial({ map: sky, fog: false, depthWrite: false })); sk.position.set(0, 150, -320); kaub.add(sk);
  const gnd = mesh(new THREE.PlaneGeometry(900, 900), M('#5a7a3a', { roughness: 1 }), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.05; kaub.add(gnd);
  const water = mesh(new THREE.PlaneGeometry(120, 900), M('#2f6f9a', { roughness: 0.25, metalness: 0.2 }), false, true); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.02, -100); kaub.add(water);
  for (let i = 0; i < 16; i++) { const h = mesh(new THREE.ConeGeometry(R(12, 22), R(18, 30), 6), M(pick(['#3a5a3a', '#4a6a40', '#5a4a3a']), { flatShading: true })); h.position.set(R(-150, -70), 6, R(-300, -20)); kaub.add(h); }
  for (let i = 0; i < 16; i++) { const h = mesh(new THREE.ConeGeometry(R(12, 22), R(14, 26), 6), M(pick(['#3a5a3a', '#4a6a40']), { flatShading: true })); h.position.set(R(70, 150), 4, R(-300, -20)); kaub.add(h); } }
// gravel bar (the trap) + the barge, listing
{ const bar = mesh(new THREE.SphereGeometry(1, 24, 12), M('#d8bf8a', { roughness: 1 }), false, true); bar.scale.set(16, 0.25, 6); bar.position.set(2, 0.08, -20); kaub.add(bar);
  for (let i = 0; i < 5; i++) { const st = mesh(new THREE.DodecahedronGeometry(0.25, 0), M('#9a8a72', { flatShading: true })); st.position.set(R(-6, 9), 0.15, R(-22, -17)); kaub.add(st); } }
const barge = grp(2, 0, -20, 0.05, kaub); bx(9, 1.0, 2.6, '#7a3a2a', 0, 0.35, 0, barge); bx(2.4, 1.2, 2.2, '#e8e0d0', -3.4, 1.4, 0, barge);
for (let i = 0; i < 3; i++) bx(2, 0.9, 2.2, pick(['#2a6ad0', '#d86a2a', '#e8c040']), -1.6 + i * 2.05, 1.4, 0, barge);
barge.rotation.z = 0.14;
// the castle on its island (dark silhouette against the sunset)
{ const isl = mesh(new THREE.CylinderGeometry(20, 22, 2, 20), M('#4a5a3a', { flatShading: true })); isl.position.set(40, 0.5, -90); kaub.add(isl);
  const cs = '#2a2a30'; bx(14, 6, 9, cs, 40, 5, -90, kaub); for (const [x, z] of [[33, -95], [47, -95], [33, -85], [47, -85]]) { const tw = mesh(new THREE.CylinderGeometry(1.4, 1.6, 9, 8), M(cs)); tw.position.set(x, 6, z); kaub.add(tw); const rf = mesh(new THREE.ConeGeometry(1.8, 3, 8), M('#5a2a2a')); rf.position.set(x, 10.5, z); kaub.add(rf); } }
// the gauge board on the left bank: a striped post, water-level marks, the red 25 cm line
{ const post = mesh(new THREE.BoxGeometry(0.4, 4, 0.2), M('#ffffff')); post.position.set(-7, 2, -14); kaub.add(post);
  for (let i = 0; i < 8; i++) { const st = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.22), M(i % 2 ? '#ffffff' : '#1a1a1a')); st.position.set(-7, 0.3 + i * 0.45, -13.9); kaub.add(st); }
  const red = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.2), M('#e02a2a')); red.position.set(-7, 1.6, -13.9); kaub.add(red); }
function updateKaub(t) { barge.position.y = 0.0 + 0.04 * Math.sin(t * 1.3); barge.rotation.z = 0.14 + 0.02 * Math.sin(t * 0.8); }
function kaubCamera(t) { kaubCam.position.set(lerp(-8, -5, smooth(0, 8, t)), lerp(3.6, 4.2, smooth(0, 8, t)), lerp(14, 6, smooth(0, 8, t))); kaubCam.lookAt(0, 2.4, -24); kaubCam.fov = 50; }

// =================== TRUCKS AND TRAIN (meters): a motorway embankment and a freight line; the traffic that replaces the barges ===================
const trk = new THREE.Scene(); trk.fog = new THREE.Fog(0xf2c890, 70, 320); const trkCam = new THREE.PerspectiveCamera(46, W / H, 0.1, 600);
trk.add(new THREE.HemisphereLight(0xffe6c8, 0x404a58, 0.9)); const sunT = new THREE.DirectionalLight(0xffc080, 2.4); sunT.position.set(-30, 10, -40); sunT.castShadow = true; sunT.shadow.mapSize.set(2048, 2048); Object.assign(sunT.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 200 }); trk.add(sunT, sunT.target);
{ const sk = new THREE.Mesh(new THREE.PlaneGeometry(900, 450), new THREE.MeshBasicMaterial({ map: canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a6ab8'); gr.addColorStop(0.6, '#f0a070'); gr.addColorStop(1, '#ffd8a0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false, depthWrite: false })); sk.position.set(0, 150, -320); trk.add(sk);
  const gnd = mesh(new THREE.PlaneGeometry(900, 900), M('#6a8a4a', { roughness: 1 }), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.05; trk.add(gnd);
  const road = mesh(new THREE.BoxGeometry(14, 0.3, 900), M('#3a3a42', { roughness: 0.9 }), false, true); road.position.set(0, 0.1, -300); trk.add(road);
  for (let z = 0; z > -600; z -= 6) { const d = mesh(new THREE.BoxGeometry(0.2, 0.02, 3), M('#f2e8c0'), false, true); d.position.set(0, 0.27, z); trk.add(d); }
  const rail = mesh(new THREE.BoxGeometry(2.5, 0.2, 900), M('#5a5a60'), false, true); rail.position.set(-12, 0.1, -300); trk.add(rail);
  for (let z = 0; z > -600; z -= 2.2) { const sl = mesh(new THREE.BoxGeometry(2.8, 0.1, 0.25), M('#4a3a2a'), false, true); sl.position.set(-12, 0.22, z); trk.add(sl); } }
function truck(color) { const g = new THREE.Group(); bx(2.4, 2.3, 1.6, '#2a3a5a', 0, 1.4, 1.2, g); bx(2.3, 2.0, 1.8, '#f2f0ea', 0, 1.4, -1.0, g); bx(2.2, 0.5, 0.3, '#2a2a30', 0, 1.1, -0.1, g);
  for (const [x, z] of [[-1.1, 1.2], [1.1, 1.2], [-1.1, -0.6], [1.1, -0.6], [-1.1, -1.6], [1.1, -1.6]]) { const w = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); }
  bx(0.1, 0.5, 0.6, color, 0, 2.6, 1.2, g); return g; }
const trucks = []; for (let k = 0; k < 16; k++) { const lane = k % 2; const g = truck(pick(['#d86a2a', '#2a6ad0', '#e8c040', '#d83a3a'])); trk.add(g); trucks.push({ g, lane, z0: -k * 9 - 14 }); }
function wagon(x, z) { const g = new THREE.Group(); bx(2.4, 1.6, 6.5, pick(['#8a4a2a', '#4a6a8a', '#7a7a80']), 0, 1.2, 0, g); for (const zz of [-2.2, 2.2]) { const w = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(0, 0.22, zz); g.add(w); } g.position.set(x, 0, z); trk.add(g); return g; }
const wagons = []; for (let k = 0; k < 9; k++) wagons.push({ g: wagon(-12, -k * 8 - 40), z0: -k * 8 - 40 });
function updateTrucks(t) { const u = clamp((t - TRUCK) / (SHOP - TRUCK), 0, 1);
  trucks.forEach(T => { const z = wrapR(T.z0 + (t - TRUCK) * 10 * (T.lane ? -1 : 1), -75, -12); T.g.position.set(T.lane ? 3.6 : -3.6, 0, z); T.g.rotation.y = T.lane ? Math.PI : 0; });
  wagons.forEach(W => { W.g.position.z = wrapR(W.z0 + (t - TRUCK) * 14, -120, -40); }); }
function trucksCamera(t) { const k = smooth(TRUCK - 0.3, SHOP, t); trkCam.position.set(lerp(9, 7, k), lerp(3.4, 3.8, k), lerp(8, 5, k)); trkCam.lookAt(-2, 1.6, -26); trkCam.fov = 46; }

// =================== SHOP (meters): a shelf aisle with rising price tags (arrows, no invented numbers) ===================
const shop = new THREE.Scene(); shop.background = new THREE.Color('#e8e2d6'); shop.fog = new THREE.Fog(0xe8e2d6, 8, 30); const shopCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
shop.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.1)); { const s = new THREE.DirectionalLight(0xfff4e8, 1.6); s.position.set(2, 6, 5); shop.add(s); }
{ const fl = mesh(new THREE.PlaneGeometry(30, 30), M('#cfc9bc', { roughness: 0.6 }), false, true); fl.rotation.x = -Math.PI / 2; shop.add(fl); bx(30, 4, 0.2, '#f4f0e8', 0, 2, -6, shop); }
const tagTex = (up) => canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = up ? '#d83a3a' : '#2a8a4a'; g.font = 'bold 72px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(up ? '↑' : '↓', w / 2, 92); });
const TAGS = [], TAG_UP = tagTex(true);
for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) { const x = -4 + i * 1.0, y = 0.5 + row * 1.1; bx(0.8, 0.9, 0.4, pick(['#e8584a', '#3a7ac8', '#f2c84a', '#6ab04a', '#c8c8d0']), x, y, -5.7, shop);
  const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshBasicMaterial({ map: TAG_UP, color: new THREE.Color(1.1, 1.1, 1.1) })); tg.position.set(x, y + 0.5, -5.45); shop.add(tg); TAGS.push({ tg, row, i }); }
function updateShop(t) { TAGS.forEach((T, k) => { const on = smooth(SHOP + 0.5 + k * 0.08, SHOP + 1.2 + k * 0.08, t); T.tg.scale.setScalar(0.6 + 0.4 * on); T.tg.material.color.setRGB(1.1, 1.1 - 0.4 * on, 1.1 - 0.4 * on); }); }
function shopCamera(t) { shopCam.position.set(lerp(0.4, 0.2, smooth(SHOP, CARD, t)), 1.2, 10.5 - 0.8 * smooth(SHOP, CARD, t)); shopCam.lookAt(0, 0.5, -5); shopCam.fov = 56; }

// =================== DOM + render ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'Was wäre, wenn<br><span class="hl">der Rhein</span> austrocknet?'; el.endT.innerHTML = 'Was wäre, wenn<br><span class="hl">der Rhein</span> austrocknet?';
el.endS.innerHTML = 'PEGEL KAUB: REKORD 2018 BEI 25 CM.<br>AUGUST 2026: DARUNTER.<br>RHEIN: 86 % DER BINNENSCHIFFSFRACHT (JAN–MAI 2022, DESTATIS).';
const captions = [
  [3.5, 7.6, 'Der Rhein ist Deutschlands<br>wichtigste Wasserstraße.'],
  [8.6, 13.4, 'Die Fracht fährt plötzlich<br>auf Straße und Schiene.'],
  [14.6, 18.9, 'Und alles wird teurer.'],
];
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < TRUCK) return ['<b></b>KAUB · RHEIN', 'REKORD 2018', '25 cm', 'DER BISHERIGE TIEFSTWERT'];
  if (t < SHOP) return ['<b style="background:#ff6a5a"></b>KAUB · AUGUST 2026', 'PEGEL', 'UNTER 25 cm', 'REKORD GEBROCHEN'];
  if (t < CARD) return ['<b style="background:#e8b030"></b>FOLGEN', 'FRACHT', 'Straße + Schiene', 'STATT DES RHEINS'];
  return null; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(2.7, 3.2, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(0.8, 1.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(CARD, CARD + 0.4, t); el.endT.style.opacity = smooth(CARD + 0.2, CARD + 0.6, t); el.endS.style.opacity = smooth(CARD + 0.4, CARD + 0.8, t); }
const SCN = { kaub: [updateKaub, kaubCamera, kaub, () => kaubCam, 1.0], trucks: [updateTrucks, trucksCamera, trk, () => trkCam, 1.0], shop: [updateShop, shopCamera, shop, () => shopCam, 1.0] };
const SEQ = [[0, 'kaub', 0.7], [TRUCK, 'trucks', 0.7], [SHOP, 'shop', 0.7]];
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && SEQ[i + 1][2] > 0 && t > SEQ[i + 1][0] - SEQ[i + 1][2] / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - SEQ[i + 1][2] / 2, SEQ[i + 1][0] + SEQ[i + 1][2] / 2, t); }
  else if (i > 0 && SEQ[i][2] > 0 && t < SEQ[i][0] + SEQ[i][2] / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - SEQ[i][2] / 2, SEQ[i][0] + SEQ[i][2] / 2, t); }
  let eA = 1, eB = 1; if (!B || mix < 1) eA = shootScene(A, t, RTA); if (B) eB = shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0;
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
