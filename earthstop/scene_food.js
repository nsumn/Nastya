import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you ate only fast food for 30 days?" — classic low-poly. Night drive-thru (sugar crash), artery + salt, day-5 brain fog at the desk, gut garden
// losing species, the scale, the liver on sugar, the couch (rats on junk food got lazier), morning with real food.
// Facts: Mantantzis 2019 (sugar: more tired, less alert within 1 h); Vogel 1997 (one fast-food breakfast halves artery flex for ~4 h); USDA (a large combo > 90%
// of 2,300 mg sodium); Holloway 2011 (5 days of a high-fat diet: worse attention, speed, mood); Caltech 2015 (~90% of body serotonin made in the gut);
// Spector 2015 (n=1, ~40% gut species lost in 10 days); Hall 2019 (+500 kcal/day, eaten faster); Spurlock 2004 (+24.5 lb); Kechagias 2008 (liver ALT up in 14/18
// in week 1, tracked sugar); Blaisdell 2014 (rats); Conner 2017 (fruit & veg -> vitality, motivation in 2 weeks); David 2014 (gut shifts in a day); CDC 84.8 M/day.
// =================== timeline ===================
const HOUR = 4.0, ART = 10.0, SALT = 13.6, DAY5 = 17.0, GUT = 24.0, WT = 32.0, LIV = 40.0, LAZY = 46.0, FIX = 53.0, T_END = 60.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 606;
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
// =================== DRIVE-THRU (meters, night): neon burger joint, pickup window, your car; then the sugar crash inside the car ===================
const drv = new THREE.Scene(); drv.background = new THREE.Color('#0b1230'); drv.fog = new THREE.Fog(0x0b1230, 22, 70); const dCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
drv.add(new THREE.HemisphereLight(0x7080d0, 0x281c24, 0.6));
{ const m = new THREE.DirectionalLight(0x9aa8e8, 0.9); m.position.set(8, 12, -6); m.castShadow = true; m.shadow.mapSize.set(2048, 2048); m.shadow.bias = -0.0005; Object.assign(m.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); drv.add(m, m.target); }
const winLD = new THREE.PointLight(0xffc880, 7, 6, 1.4); winLD.position.set(-2.0, 1.6, 0); drv.add(winLD);          // warm light spilling from the pickup window
const neonLD = new THREE.PointLight(0xff4a7a, 5, 9, 1.5); neonLD.position.set(-1.6, 4.3, -1.5); drv.add(neonLD);
const lampLD = new THREE.PointLight(0xffd8a0, 5, 10, 1.4); lampLD.position.set(2.8, 4.6, 3.5); drv.add(lampLD);
const dashLD = new THREE.PointLight(0x6ac8ff, 0, 1.8, 1.4); drv.add(dashLD);                                         // dashboard glow once we are inside
// ground: asphalt lot, lane arrows, curb strip, grass beyond
{ const lot = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2c2c34'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ['#34343c', '#26262c', '#3a3a42'], 3); }, [10, 10]);
  const gr = mesh(new THREE.PlaneGeometry(80, 80), M('#ffffff', { map: lot, roughness: 0.95 }), false, true); gr.rotation.x = -Math.PI / 2; drv.add(gr);
  for (let z = 6; z > -12; z -= 3) { const d = mesh(new THREE.PlaneGeometry(0.14, 1.6), M('#e8e0b0'), false, true); d.rotation.x = -Math.PI / 2; d.position.set(0.6, 0.01, z); drv.add(d); }
  bx(0.4, 0.18, 30, '#9a9a9a', 1.9, 0.09, -2, drv); const gs = mesh(new THREE.PlaneGeometry(20, 30), M('#2a4a30'), false, true); gs.rotation.x = -Math.PI / 2; gs.position.set(12.1, 0.02, -2); drv.add(gs); }
// the building: back block + a front wall with a real opening for the pickup window (lit kitchen behind it)
const BLD = grp(0, 0, 0, 0, drv);
bx(3.8, 3.6, 9, '#f2ebe0', -4.9, 1.8, 0, BLD); bx(4.7, 0.25, 9.4, '#d8d0c4', -4.55, 3.72, 0, BLD);                       // block + roof slab
for (const [z0, z1] of [[-4.5, -0.6], [0.6, 4.5]]) bx(0.15, 3.6, z1 - z0, '#f2ebe0', -2.3, 1.8, (z0 + z1) / 2, BLD);
bx(0.15, 1.05, 1.2, '#f2ebe0', -2.3, 0.525, 0, BLD); bx(0.15, 1.65, 1.2, '#f2ebe0', -2.3, 2.775, 0, BLD);
bx(0.18, 0.5, 9.0, '#d83a3a', -2.2, 3.25, 0, BLD); bx(0.18, 0.12, 9.0, '#f2c84a', -2.2, 2.95, 0, BLD);                   // red + yellow band, no logos
bx(0.5, 0.06, 1.4, '#c8c8c8', -2.1, 1.05, 0, BLD, { metalness: 0.5, roughness: 0.3 });                                 // window sill
{ const k = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.5, 1.0) })); k.rotation.y = Math.PI / 2; k.position.set(-2.99, 1.8, 0); BLD.add(k);
  bx(0.7, 0.04, 9, '#8a8a90', -2.65, 1.0, 0, BLD); for (let i = 0; i < 5; i++) bx(0.3, 0.4, 0.4, pick(['#c8c8d0', '#9a9aa4']), -2.85, 1.2, -1.6 + i * 0.8, BLD); }
// neon sign on the front wall + a tall roadside sign (generic words, no brands)
function neonTex(lines, col) { return canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#100810'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.shadowColor = col; g.shadowBlur = 18; g.fillStyle = '#fff0f4';
  g.font = `bold ${lines.length > 1 ? 54 : 84}px Inter, sans-serif`; lines.forEach((s, i) => g.fillText(s, w / 2, lines.length > 1 ? 66 + i * 64 : 108)); g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); }); }
{ const s1 = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: neonTex(['DRIVE THRU'], '#ff3a7a'), color: new THREE.Color(2.2, 2.2, 2.2) })); s1.rotation.y = Math.PI / 2; s1.position.set(-2.12, 4.45, -1.6); BLD.add(s1);
  bx(0.2, 6, 0.2, '#5a5a62', 3.4, 3, -8, drv); const s2 = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshBasicMaterial({ map: neonTex(['BURGERS', 'OPEN 24 H'], '#ffb03a'), color: new THREE.Color(2.0, 2.0, 2.0) })); s2.position.set(3.4, 6.4, -7.9); s2.rotation.y = -0.5; drv.add(s2);
  bx(0.14, 4.6, 0.14, '#4a4a52', 2.8, 2.3, 3.5, drv); bx(0.6, 0.12, 0.3, '#4a4a52', 2.6, 4.6, 3.5, drv); }
// the clerk behind the window, your car with the driver's side open to the window
const clerk = makePerson(rnd, { top: '#d83a3a', bottom: '#2a2a30', cap: true, dress: false }); BLD.add(clerk.outer); clerk.outer.position.set(-2.72, 0.95, 0.1); clerk.outer.rotation.y = Math.PI / 2;
const CARD = grp(-1.15, 0, 0.2, 0, drv);
{ const C = '#3a6ad0'; bx(1.9, 0.62, 4.3, C, 0, 0.55, 0, CARD); bx(1.86, 0.08, 1.4, C, 0, 0.9, -1.4, CARD); bx(1.7, 0.08, 2.0, C, 0, 1.75, 0.35, CARD); bx(1.6, 0.02, 1.9, '#3a3a40', 0, 1.705, 0.35, CARD);
  for (const [x, z] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 1.3], [0.8, 1.3]]) bx(0.08, 0.85, 0.08, C, x, 1.28, z, CARD);
  bx(1.7, 0.22, 0.35, '#1e2028', 0, 1.0, -0.45, CARD); bx(0.55, 0.7, 0.12, '#2a2a30', -0.42, 1.1, 1.05, CARD); bx(0.55, 0.14, 0.6, '#2a2a30', -0.42, 0.8, 0.72, CARD); bx(0.55, 0.14, 0.6, '#2a2a30', 0.42, 0.8, 0.72, CARD);
  const wh = mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 16), M('#1a1a1e')); wh.position.set(-0.42, 1.18, -0.12); wh.rotation.x = -0.5; CARD.add(wh);
  for (const [x, z] of [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); CARD.add(w); }
  for (const x of [-0.6, 0.6]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.4, 2.0) })); hl.position.set(x, 0.65, -2.16); hl.rotation.y = Math.PI; CARD.add(hl); } }
const meD = makeHero(); CARD.add(meD.outer);
// the bag, a giant soda (lid + straw) and fries — the soda rides in the right hand, the fries in the left
const bagD = grp(0, 0, 0, 0, drv); bx(0.3, 0.36, 0.2, '#c8a070', 0, 0, 0, bagD); bx(0.31, 0.06, 0.21, '#d83a3a', 0, 0.06, 0, bagD);
const sodaD = new THREE.Group(); { const c = mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.28, 12), M('#e8e8e8')); sodaD.add(c); const b = mesh(new THREE.CylinderGeometry(0.0765, 0.07, 0.1, 12), M('#d83a3a')); b.position.y = 0.04; sodaD.add(b);
  const l = mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.02, 12), M('#f4f4f4')); l.position.y = 0.15; sodaD.add(l); const s = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), M('#f2c84a')); s.position.set(0.02, 0.25, 0); s.rotation.z = 0.15; sodaD.add(s); }
meD.elbows[0].add(sodaD); sodaD.position.set(0, -0.3, 0.05);
const friesD = new THREE.Group(); { bx(0.12, 0.12, 0.07, '#d83a3a', 0, 0, 0, friesD); for (let i = 0; i < 9; i++) { const f = bx(0.014, 0.12, 0.014, '#f2c84a', -0.045 + (i % 5) * 0.022, 0.09, -0.015 + Math.floor(i / 5) * 0.03, friesD); f.rotation.z = (i - 4) * 0.06; } }
meD.elbows[1].add(friesD); friesD.position.set(0, -0.3, 0.05);
const _dv = new THREE.Vector3();
function updateDrive(t) { const P = meD, o = P.outer; o.position.set(-0.42, 0.88, 0.75); o.rotation.set(0, Math.PI, 0); P.root.rotation.set(0, 0, 0); poseSit(P);
  // clerk hands the bag out 1.6-3.0; it lands on the passenger seat
  poseIdle(clerk, t, 2); const hand = fadeWin(t, 1.3, 3.4, 0.5); clerk.arms[1].rotation.x = -1.4 * hand; clerk.elbows[1].rotation.x = -0.3;
  const a = V3(-2.35, 1.35, 0.25), b = V3(-1.75, 1.3, 0.6), c = V3(-0.75, 0.97, 0.9);
  if (t < 2.2) bagD.position.copy(a); else if (t < 2.9) bagD.position.copy(a).lerp(b, ease((t - 2.2) / 0.7)); else bagD.position.copy(b).lerp(c, ease((t - 2.9) / 0.9));
  sodaD.visible = friesD.visible = t > 3.6; bagD.visible = true;
  // window arm out to grab, then soda + fries; the sugar crash: a yawn, then a slump
  P.arms[1].rotation.x = -1.2 * fadeWin(t, 1.8, 3.2, 0.4); P.arms[1].rotation.z = -0.5 * fadeWin(t, 1.8, 3.2, 0.4);
  if (t > 3.6) { const sip = fadeWin(t, 4.4, 6.4, 0.5) + fadeWin(t, 7.0, 7.5, 0.2) * 0; P.arms[0].rotation.x = lerp(-0.6, -1.25, sip); P.elbows[0].rotation.x = lerp(-1.1, -1.9, sip); P.arms[0].rotation.z = 0.15 * sip;
    const munch = 0.15 * Math.max(0, Math.sin(t * 5)) * fadeWin(t, 5.2, 7.4, 0.3); P.arms[1].rotation.x = -0.7 - munch; P.elbows[1].rotation.x = -1.2 - munch * 2;
    const yawn = fadeWin(t, 7.6, 8.8, 0.3); P.root.rotation.x = -0.18 * yawn; P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -2.0, yawn); P.elbows[1].rotation.x = lerp(P.elbows[1].rotation.x, -1.9, yawn);
    const slump = smooth(8.8, 9.8, t); P.root.rotation.x += 0.22 * slump; o.position.y -= 0.06 * slump; P.arms[0].rotation.x = lerp(P.arms[0].rotation.x, -0.25, slump); P.elbows[0].rotation.x = lerp(P.elbows[0].rotation.x, -0.5, slump); }
  dashLD.position.copy(CARD.position).add(V3(-0.3, 1.25, -0.35)); dashLD.intensity = 1.6 * smooth(3.4, 4.6, t); neonLD.intensity = 5 + 0.6 * Math.sin(t * 13) * Math.sin(t * 3.1); }
function driveCamera(t) { const ext = V3(5.4, 2.4, -9.0).lerp(V3(4.2, 2.2, -6.8), smooth(0, 3.6, t)), extL = V3(-1.8, 2.7, -0.4);
  const ins = V3(-1.52, 1.6, -1.3).add(V3(0.05 * Math.sin(t * 0.7), 0.02 * Math.sin(t * 0.9), lerp(0, 0.35, smooth(5, 10, t)))), insL = V3(-1.58, 1.42, 0.95);
  const k = ease(clamp((t - 3.5) / 1.6, 0, 1)); dCam.position.copy(ext).lerp(ins, k); dCam.lookAt(extL.lerp(insL, k)); dCam.fov = lerp(50, 46, k); }
// =================== ARTERY (abstract, vertical for the portrait frame): blood cells flow up; after the breakfast the wall flexes half as much, fat drops appear;
// then salt crystals pour in and the pulse gets harder ===================
const artS = new THREE.Scene(); artS.background = new THREE.Color('#2a0a12'); const artCam = new THREE.PerspectiveCamera(46, W / H, 0.05, 50);
artS.add(new THREE.HemisphereLight(0xffd0d8, 0x401018, 1.0)); { const k = new THREE.DirectionalLight(0xfff0f0, 1.8); k.position.set(2, 3, 4); artS.add(k); const r = new THREE.PointLight(0xff6a7a, 4, 6, 1.5); r.position.set(-1.5, 0, 1.5); artS.add(r); }
const artWall = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 12, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#e05a6a', roughness: 0.5, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
artS.add(artWall); const artBack = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 12, 48, 1, true, Math.PI * 0.15, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: '#8a1a2a', roughness: 0.7, side: THREE.BackSide })); artS.add(artBack);
{ const rib = new THREE.TorusGeometry(0.555, 0.012, 6, 40); for (let y = -6; y <= 6; y += 0.45) { const r = new THREE.Mesh(rib, new THREE.MeshStandardMaterial({ color: '#f08a9a', transparent: true, opacity: 0.4 })); r.rotation.x = Math.PI / 2; r.position.y = y; artWall.add(r); } }
const RBC_N = 260; const rbcGeo = (() => { const g = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 0.075; p.setY(i, p.getY(i) * (0.4 + 0.9 * r * r)); } g.computeVertexNormals(); return g; })();
const rbc = new THREE.InstancedMesh(rbcGeo, new THREE.MeshStandardMaterial({ color: '#d8202e', roughness: 0.45 }), RBC_N); rbc.frustumCulled = false; artS.add(rbc);
const RBC = Array.from({ length: RBC_N }, () => { const a = R(0, 6.28), r = Math.sqrt(rnd()) * 0.42; return { x: Math.cos(a) * r, z: Math.sin(a) * r, y0: R(-6, 6), sp: R(1.1, 1.6), rx: R(0, 6), ry: R(0, 6) }; });
const FAT_N = 60; const fat = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 1), new THREE.MeshStandardMaterial({ color: '#f2d04a', emissive: '#5a4810', roughness: 0.3 }), FAT_N); fat.frustumCulled = false; artS.add(fat);
const SALT_N = 160; const salt = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#404448', roughness: 0.2 }), SALT_N); salt.frustumCulled = false; artS.add(salt);
const SLT = Array.from({ length: SALT_N }, (_, i) => ({ a: R(0, 6.28), r: Math.sqrt(rnd()) * 0.45, t0: SALT + 0.1 + i * 0.012 + R(0, 0.3), sp: R(0.8, 1.4) }));
const _ao = new THREE.Object3D();
// heartbeat-shaped pulse; the flex (how much the wall widens) halves after the breakfast; salt makes the beat faster and harder
const artFlex = t => lerp(1, 0.5, smooth(ART + 2.0, ART + 3.2, t));
function updateArtery(t) { const bpm = lerp(70, 92, smooth(SALT, SALT + 2.0, t)), ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 7) * (1 - Math.exp(-ph * 60));
  const flex = artFlex(t), sc = 1 + 0.09 * flex * beat + 0.03 * smooth(SALT, SALT + 2, t) * beat; artWall.scale.set(sc, 1, sc); artBack.scale.set(sc, 1, sc);
  artWall.material.color.set('#e05a6a').lerp(new THREE.Color('#c8a070'), 0.45 * smooth(ART + 2.0, ART + 3.2, t)).lerp(new THREE.Color('#ff3a4a'), 0.5 * smooth(SALT, SALT + 2, t));
  RBC.forEach((B, i) => { const y = wrapR(B.y0 + t * B.sp * (0.8 + 0.5 * beat), -6, 6); _ao.position.set(B.x * sc, y, B.z * sc); _ao.rotation.set(B.rx + t * 0.8, B.ry + t * 0.6, 0); _ao.scale.setScalar(1); _ao.updateMatrix(); rbc.setMatrixAt(i, _ao.matrix); }); rbc.instanceMatrix.needsUpdate = true;
  const fz = smooth(ART + 1.6, ART + 3.0, t); for (let i = 0; i < FAT_N; i++) { const B = RBC[i * 3]; _ao.position.set(B.z * 0.9, wrapR(B.y0 * 0.7 + t * 1.0, -6, 6), B.x * 0.9); _ao.rotation.set(0, 0, 0); _ao.scale.setScalar(Math.max(0.0001, fz * (0.7 + 0.6 * hash(i)))); _ao.updateMatrix(); fat.setMatrixAt(i, _ao.matrix); } fat.instanceMatrix.needsUpdate = true;
  SLT.forEach((S, i) => { const age = t - S.t0; if (age < 0) _ao.scale.setScalar(0.0001); else { const yIn = 2.4 - age * 3.2; const y = yIn > 0.4 ? yIn : wrapR(0.4 + (age - (2.0 / 3.2)) * 1.4 * S.sp, -6, 6); const r = yIn > 0.4 ? S.r + 0.9 * clamp((yIn - 0.4) / 2, 0, 1) : S.r;
    _ao.position.set(Math.cos(S.a) * r * sc, y, Math.sin(S.a) * r * sc + (yIn > 0.4 ? 0.6 : 0)); _ao.scale.setScalar(1); } _ao.rotation.set(t * 2 + i, t * 1.3 + i, 0); _ao.updateMatrix(); salt.setMatrixAt(i, _ao.matrix); }); salt.instanceMatrix.needsUpdate = true; }
function arteryCamera(t) { const k = smooth(ART - 0.5, DAY5, t); artCam.position.set(lerp(0.9, -0.5, k), lerp(-0.6, 0.3, k), lerp(2.3, 2.0, k)); artCam.lookAt(0, lerp(0.1, 0.4, k), 0); }
// =================== GUT GARDEN (abstract): villi + colourful bacteria; ~40% of the species fade out; the glowing nerve to the brain carries fewer sparks ===================
const gutS = new THREE.Scene(); gutS.background = new THREE.Color('#230a18'); gutS.fog = new THREE.Fog(0x230a18, 4, 11); const gutCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 60);
gutS.add(new THREE.HemisphereLight(0xffd8e8, 0x3a1024, 1.1)); { const k = new THREE.DirectionalLight(0xfff0f4, 1.4); k.position.set(1, 4, 3); gutS.add(k); }
{ const g = new THREE.PlaneGeometry(14, 16, 70, 80); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.12 * Math.sin(x * 2.1 + y * 0.7) * Math.cos(y * 1.7) + 0.35 * Math.pow(Math.abs(x) / 7, 2) * 3); } g.computeVertexNormals();
  const fl = mesh(g, M('#d86a80', { roughness: 0.6 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.z = -4; gutS.add(fl); }
const VIL_N = 700; const villi = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.28, 3, 6), new THREE.MeshStandardMaterial({ color: '#f29aaa', roughness: 0.55 }), VIL_N); villi.frustumCulled = false; gutS.add(villi);
const VIL = Array.from({ length: VIL_N }, () => ({ x: R(-3.5, 3.5), z: R(-11, 3), s: R(0.7, 1.3), ph: R(0, 6) }));
const BAC_N = 420, SPECIES = 40, BCOL = ['#2ad8c8', '#8ae83a', '#b86af0', '#ff9a3a', '#3a9aff', '#f2e04a', '#ff5aa8', '#5af0a0'];
const bac = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.035, 0.09, 3, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, emissive: '#202020' }), BAC_N); bac.frustumCulled = false; gutS.add(bac);
const BAC = Array.from({ length: BAC_N }, (_, i) => { const sp = Math.floor(rnd() * SPECIES); return { sp, x: R(-2.6, 2.6), y: R(0.12, 0.7), z: R(-9, 2.2), ph: R(0, 6), col: new THREE.Color(BCOL[sp % BCOL.length]).offsetHSL(((sp * 0.137) % 0.1) - 0.05, 0, 0) }; });
const lostAt = sp => sp < SPECIES * 0.4 ? GUT + 3.2 + (sp / (SPECIES * 0.4)) * 3.6 : 1e9;   // species 0-15 die out between +3.2 s and +6.8 s
const nerve = new THREE.CatmullRomCurve3([V3(0.3, 0.1, -2.5), V3(0.6, 1.2, -4.5), V3(0.2, 2.6, -6.5), V3(0, 3.8, -8)]);
const nerveM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 2.4) }); gutS.add(new THREE.Mesh(new THREE.TubeGeometry(nerve, 60, 0.04, 6, false), nerveM));
const gutBrain = mesh(new THREE.SphereGeometry(0.7, 20, 14), new THREE.MeshStandardMaterial({ color: '#ff9ac0', emissive: '#5a2040', roughness: 0.4 })); gutBrain.scale.set(1, 0.8, 1.15); gutBrain.position.set(0, 4.3, -8.4); gutS.add(gutBrain);
const SPK_N = 50; const spk = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 0.8) }), SPK_N); spk.frustumCulled = false; gutS.add(spk);
const _go = new THREE.Object3D(), _gc = new THREE.Color();
const gutHealth = t => 1 - 0.4 * smooth(GUT + 3.2, GUT + 6.8, t);
function updateGut(t) { VIL.forEach((V, i) => { _go.position.set(V.x, 0.12 + 0.35 * Math.pow(Math.abs(V.x) / 7, 2) * 3, V.z); _go.rotation.set(0.12 * Math.sin(t * 1.3 + V.ph), 0, 0.12 * Math.cos(t * 1.1 + V.ph)); _go.scale.set(1, V.s, 1); _go.updateMatrix(); villi.setMatrixAt(i, _go.matrix); }); villi.instanceMatrix.needsUpdate = true;
  BAC.forEach((B, i) => { const gone = smooth(lostAt(B.sp), lostAt(B.sp) + 0.6, t); _go.position.set(B.x + 0.06 * Math.sin(t * 2 + B.ph), B.y + 0.05 * Math.sin(t * 2.6 + B.ph * 2) - 0.3 * gone, B.z + 0.06 * Math.cos(t * 1.7 + B.ph));
    _go.rotation.set(t * 0.8 + B.ph, B.ph, Math.sin(t * 3 + B.ph)); _go.scale.setScalar(Math.max(0.0001, 1 - gone)); _go.updateMatrix(); bac.setMatrixAt(i, _go.matrix); bac.setColorAt(i, _gc.copy(B.col).multiplyScalar(lerp(1.4, 0.4, gone))); });
  bac.instanceMatrix.needsUpdate = true; bac.instanceColor.needsUpdate = true;
  const h = gutHealth(t); nerveM.color.setRGB(1.6 * h, 1.2 * h, 2.4 * h); gutBrain.material.emissive.set('#5a2040').multiplyScalar(lerp(0.2, 1, (h - 0.6) / 0.4));
  for (let i = 0; i < SPK_N; i++) { const on = i / SPK_N < (h - 0.55) / 0.45; const u = (t * 0.35 + i / SPK_N) % 1; _go.position.copy(nerve.getPointAt(u)); _go.rotation.set(0, 0, 0); _go.scale.setScalar(on ? 1 : 0.0001); _go.updateMatrix(); spk.setMatrixAt(i, _go.matrix); } spk.instanceMatrix.needsUpdate = true; }
function gutCamera(t) { const k = smooth(GUT - 0.5, WT + 0.5, t); gutCam.position.set(lerp(-0.4, 0.4, k), lerp(0.75, 1.1, k), lerp(2.6, 0.4, k)); gutCam.lookAt(lerp(0, 0.1, k), lerp(0.6, 2.0, smooth(GUT + 4.5, WT, t)), -5); }
// =================== LIVER (abstract): sugar cubes rain in; the liver turns from healthy red-brown to a stressed, pulsing amber ===================
const livS = new THREE.Scene(); livS.background = new THREE.Color('#1c0a10'); const livCam = new THREE.PerspectiveCamera(44, W / H, 0.05, 50);
livS.add(new THREE.HemisphereLight(0xffe0d8, 0x30101a, 1.0)); { const k = new THREE.DirectionalLight(0xfff4e8, 2.0); k.position.set(2, 4, 4); livS.add(k); }
const liverGeo = (() => { const g = new THREE.SphereGeometry(1, 64, 40); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const right = smooth(-0.6, 0.6, v.x); let x = v.x * 1.55, y = v.y * lerp(0.45, 0.8, right), z = v.z * lerp(0.55, 0.85, right);
    y += 0.25 * right - 0.15 * v.x * v.x; y -= 0.18 * Math.exp(-((v.x - 0.05) ** 2) / 0.02) * Math.max(0, v.y); const n = 1 + 0.03 * Math.sin(v.x * 7 + v.z * 5) * Math.sin(v.y * 6); p.setXYZ(i, x * n, y * n, z * n); }
  g.computeVertexNormals(); return g; })();
const liver = mesh(liverGeo, new THREE.MeshStandardMaterial({ color: '#8a2a2a', roughness: 0.45, emissive: '#000000' })); livS.add(liver);
const CUBE_N = 140; const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#303030' }), CUBE_N); cubes.frustumCulled = false; livS.add(cubes);
const CUB = Array.from({ length: CUBE_N }, (_, i) => ({ x: R(-0.9, 0.9), z: R(-0.3, 0.35), t0: LIV - 0.4 + i * 0.04 + R(0, 0.2), r: R(0, 6) }));
function updateLiver(t) { const st = smooth(LIV + 1.0, LIV + 4.5, t), pulse = 0.5 + 0.5 * Math.sin(t * 6); liver.rotation.y = -0.25 + 0.15 * Math.sin(t * 0.5);
  liver.material.color.set('#8a2a2a').lerp(new THREE.Color('#d89a3a'), st); liver.material.emissive.setRGB(0.5 * st * pulse, 0.18 * st * pulse, 0); liver.scale.setScalar(0.72 * (1 + 0.05 * st));
  CUB.forEach((C, i) => { const age = t - C.t0; let y = 3.2 - age * 2.6; if (age < 0) y = 9; const sink = clamp((0.55 - y) / 0.5, 0, 1); _ao.position.set(C.x, Math.max(y, 0.1), C.z); _ao.rotation.set(C.r + t, C.r * 2 + t * 0.7, 0); _ao.scale.setScalar(Math.max(0.0001, 1 - sink)); _ao.updateMatrix(); cubes.setMatrixAt(i, _ao.matrix); }); cubes.instanceMatrix.needsUpdate = true; }
function liverCamera(t) { const a = lerp(-0.35, 0.25, smooth(LIV - 0.5, LAZY + 0.5, t)); livCam.position.set(Math.sin(a) * 5.6, 1.3, Math.cos(a) * 5.6); livCam.lookAt(0, 0.35, 0); }
// =================== APARTMENT (meters): desk (day 5 fog), kitchen island + scale, couch + TV + the rat cage, sunny morning with real food.
// One scene, four modes: updateApt(t, mode) sets props, lights and the hero for that beat, so two modes can dissolve into each other ===================
const apt = new THREE.Scene(); const aptCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hemiA = new THREE.HemisphereLight(0xe8eeff, 0x4a3a40, 0.7); apt.add(hemiA);
const sunA = new THREE.DirectionalLight(0xfff0d8, 1); sunA.position.set(-2.2, 5, -9); sunA.target.position.set(-0.5, 0, 0.5); sunA.castShadow = true; sunA.shadow.mapSize.set(2048, 2048); sunA.shadow.bias = -0.0004; Object.assign(sunA.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, far: 30 }); apt.add(sunA, sunA.target);
const fillA = new THREE.PointLight(0xffe8d0, 3, 12, 1.4); fillA.position.set(1.5, 2.6, 3.0); apt.add(fillA);
const pendA = new THREE.PointLight(0xffc880, 0, 6, 1.5); pendA.position.set(2.0, 2.3, -1.2); apt.add(pendA);
const floorLA = new THREE.PointLight(0xffb070, 0, 5, 1.5); floorLA.position.set(-0.4, 1.6, -0.4); apt.add(floorLA);
const tvLA = new THREE.PointLight(0x7ab0ff, 0, 7, 1.3); tvLA.position.set(-3.4, 1.3, 1.0); apt.add(tvLA);
{ const wood = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = pick(['#a87a52', '#b0845a', '#9e7048', '#b88c62']); g.fillRect(0, y, w, 31); g.fillStyle = 'rgba(60,30,10,0.25)'; g.fillRect(rnd() * w, y, 2, 31); } }, [3, 3]);
  const fl = mesh(new THREE.PlaneGeometry(8, 7), M('#ffffff', { map: wood, roughness: 0.75 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.5); apt.add(fl);
  bx(8, 3, 0.1, '#9a8ac8', 0, 1.5, -3.55, apt); bx(0.1, 3, 7, '#8a7ab8', -4.05, 1.5, -0.5, apt); bx(0.1, 3, 7, '#f0e6d8', 4.05, 1.5, -0.5, apt); bx(8, 0.1, 7, '#f4f0ea', 0, 3.0, -0.5, apt);
  bx(0.06, 2.1, 0.95, '#6a4a32', 3.98, 1.05, 1.6, apt); const kn = mesh(new THREE.SphereGeometry(0.035, 8, 6), M('#d8c070', { metalness: 0.6 })); kn.position.set(3.93, 1.0, 1.25); apt.add(kn);
  const rug = mesh(new THREE.CircleGeometry(1.4, 24), M('#e8c86a', { roughness: 1 }), false, true); rug.rotation.x = -Math.PI / 2; rug.position.set(-2.2, 0.01, 1.0); apt.add(rug); }
const winA = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) })); winA.position.set(-2.2, 1.75, -3.49); apt.add(winA);
bx(2.36, 0.08, 0.12, '#f4f0ea', -2.2, 0.96, -3.46, apt); bx(0.06, 1.5, 0.05, '#f4f0ea', -2.2, 1.75, -3.47, apt);
const tvM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.02, 0.03) }); { bx(0.06, 0.98, 1.72, '#1a1a1e', -3.98, 1.25, 1.0, apt); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), tvM); s.rotation.y = Math.PI / 2; s.position.set(-3.94, 1.25, 1.0); apt.add(s); }
// desk + chair + laptop (the lid hinges at its back edge)
bx(1.4, 0.05, 0.7, '#e8dcc8', -2.2, 0.75, -1.6, apt); for (const [dx, dz] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) bx(0.04, 0.75, 0.04, '#4a4a52', -2.2 + dx, 0.375, -1.6 + dz, apt);
bx(0.5, 0.06, 0.5, '#3a3e46', -2.2, 0.48, -2.3, apt); bx(0.5, 0.6, 0.06, '#3a3e46', -2.2, 0.8, -2.55, apt);
bx(0.36, 0.02, 0.25, '#b8bcc4', -2.2, 0.785, -1.6, apt, { metalness: 0.5, roughness: 0.3 });
const lidA = grp(-2.2, 0.795, -1.725, 0, apt); bx(0.36, 0.24, 0.015, '#b8bcc4', 0, 0.12, 0, lidA, { metalness: 0.5, roughness: 0.3 });
{ const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.21), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.3, 1.5) })); sc.position.set(0, 0.12, -0.009); sc.rotation.y = Math.PI; lidA.add(sc); }
// kitchen: island, back counter, fridge, pendant lamps
bx(2.0, 0.9, 0.9, '#f4f0e8', 2.0, 0.45, -1.2, apt); bx(2.1, 0.05, 1.0, '#3a3e46', 2.0, 0.925, -1.2, apt);
bx(3.2, 0.9, 0.6, '#f4f0e8', 2.3, 0.45, -3.2, apt); bx(3.2, 0.05, 0.62, '#3a3e46', 2.3, 0.925, -3.2, apt); bx(0.8, 1.95, 0.7, '#dfe4ea', 3.5, 0.975, -3.1, apt, { roughness: 0.3 });
for (const x of [1.5, 2.5]) { bx(0.01, 0.8, 0.01, '#222', x, 2.6, -1.2, apt); const sh = mesh(new THREE.ConeGeometry(0.16, 0.18, 12, 1, true), M('#2a2a30', { side: THREE.DoubleSide })); sh.position.set(x, 2.15, -1.2); apt.add(sh); }
// couch + floor lamp + side table with the rat cage; stuff you never got to: guitar, gym bag, laundry, a book
bx(0.95, 0.42, 2.3, '#c8584a', -1.55, 0.21, 1.05, apt); bx(0.25, 0.85, 2.3, '#b84a3e', -0.98, 0.5, 1.05, apt); for (const z of [-0.18, 2.28]) bx(0.95, 0.6, 0.22, '#b84a3e', -1.45, 0.4, z, apt);
bx(0.8, 0.12, 0.6, '#e86a5a', -1.6, 0.48, 0.5, apt); bx(0.8, 0.12, 0.7, '#e86a5a', -1.6, 0.48, 1.55, apt);
bx(0.04, 1.5, 0.04, '#2a2a30', -0.35, 0.75, -0.35, apt); { const ls = mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.28, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#3a2a10' })); ls.position.set(-0.35, 1.6, -0.35); apt.add(ls); }
bx(0.7, 0.62, 0.5, '#6a4a32', 0.9, 0.31, 2.4, apt);
const ratCage = grp(0.9, 0.62, 2.4, -0.25, apt); bx(0.62, 0.05, 0.42, '#3a8ac8', 0, 0.025, 0, ratCage);
{ const ed = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.36, 0.42)), new THREE.LineBasicMaterial({ color: '#c8c8d0' })); ed.position.y = 0.23; ratCage.add(ed);
  const bars = []; for (let x = -0.3; x <= 0.3; x += 0.05) bars.push(x, 0.05, 0.21, x, 0.41, 0.21, x, 0.05, -0.21, x, 0.41, -0.21); const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bars, 3)); ratCage.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#b8b8c0' })));
  bx(0.05, 0.06, 0.04, '#d83a3a', 0.24, 0.16, -0.19, ratCage); bx(0.08, 0.03, 0.06, '#c8c8c8', 0.24, 0.07, -0.16, ratCage); }
const leverA = bx(0.06, 0.012, 0.04, '#f2c84a', 0.17, 0.16, -0.17, ratCage);
const rat = grp(0, 0.05, 0, 0, ratCage); { const b = mesh(new THREE.SphereGeometry(1, 12, 8), M('#a8a8b2')); b.scale.set(0.055, 0.045, 0.085); b.position.y = 0.045; rat.add(b);
  const hd = mesh(new THREE.ConeGeometry(0.035, 0.08, 8), M('#a8a8b2')); hd.rotation.x = Math.PI / 2; hd.position.set(0, 0.06, 0.11); rat.add(hd); const ns = mesh(new THREE.SphereGeometry(0.01, 6, 4), M('#f08a9a')); ns.position.set(0, 0.06, 0.15); rat.add(ns);
  for (const s of [-1, 1]) { const e = mesh(new THREE.CircleGeometry(0.02, 10), M('#f0a0b0', { side: THREE.DoubleSide })); e.position.set(s * 0.025, 0.095, 0.085); rat.add(e); const ey = mesh(new THREE.SphereGeometry(0.007, 6, 4), M('#111')); ey.position.set(s * 0.018, 0.072, 0.12); rat.add(ey); }
  const tl = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0.03, -0.08), V3(0.04, 0.02, -0.16), V3(-0.02, 0.01, -0.24)]), 10, 0.006, 5), M('#f0a0b0')); rat.add(tl); }
const zzz = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); });
const zzzA = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzz, transparent: true, depthWrite: false })); zzzA.scale.setScalar(0.07); apt.add(zzzA);
{ const gt = grp(-0.4, 0, -3.35, 0.15, apt); const gb = mesh(new THREE.SphereGeometry(1, 14, 10), M('#c87a3a')); gb.scale.set(0.2, 0.25, 0.06); gb.position.y = 0.3; gt.add(gb); bx(0.05, 0.6, 0.03, '#4a2a1a', 0, 0.8, 0, gt); gt.rotation.x = -0.12;
  const bag = grp(3.3, 0, 2.3, 0.3, apt); bx(0.6, 0.3, 0.3, '#2a4a8a', 0, 0.15, 0, bag); bx(0.5, 0.03, 0.04, '#1a1a1a', 0, 0.36, 0, bag);
  for (let i = 0; i < 7; i++) { const c = mesh(new THREE.SphereGeometry(1, 8, 6), M(pick(['#e8e8e8', '#5a7ac8', '#d86a6a', '#3a3a40', '#e8c86a']))); c.scale.set(R(0.16, 0.26), R(0.05, 0.09), R(0.14, 0.22)); c.position.set(-0.1 + R(-0.25, 0.25), 0.05 + i * 0.025, 2.35 + R(-0.2, 0.2)); c.rotation.y = R(0, 3); apt.add(c); }
  bx(0.32, 0.03, 0.22, '#f4f0e8', 0.3, 0.015, 0.5, apt).rotation.y = 0.5; }
// fast-food clutter (desk, island, couch) vs. real food (morning)
const JUNK = [];
function junkAt(x, y, z, kind) { const g = grp(x, y, z, R(-0.6, 0.6), apt);
  if (kind === 0) { bx(0.16, 0.07, 0.16, pick(['#f2c84a', '#d83a3a', '#f08a3a']), 0, 0.035, 0, g); }
  else if (kind === 1) { const c = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.18, 10), M('#e8e8e8')); c.position.y = 0.09; g.add(c); const b = mesh(new THREE.CylinderGeometry(0.051, 0.047, 0.06, 10), M('#d83a3a')); b.position.y = 0.11; g.add(b); }
  else { const w = mesh(new THREE.IcosahedronGeometry(0.05, 0), M(pick(['#f4f0e0', '#f2d04a', '#e8e4dc']), { flatShading: true })); w.scale.y = 0.6; w.position.y = 0.03; g.add(w); }
  JUNK.push(g); return g; }
[[-2.6, -1.45, 0], [-2.55, -1.75, 1], [-1.75, -1.5, 2], [-1.7, -1.8, 1], [-2.0, -1.35, 2]].forEach(([x, z, k]) => junkAt(x, 0.775, z, k));
[[1.4, -1.0, 0], [1.6, -1.3, 0], [1.8, -0.95, 1], [2.2, -1.35, 0], [2.4, -1.0, 2], [2.6, -1.25, 1], [1.5, -1.25, 0]].forEach(([x, z, k]) => junkAt(x, 0.95, z, k));
[[-0.6, 0.6, 0], [-0.7, 1.4, 1], [-0.3, 1.9, 2], [0.1, 1.0, 0]].forEach(([x, z, k]) => junkAt(x, 0.0, z, k));
const burgerA = new THREE.Group(); { const b1 = mesh(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#d8964a')); b1.position.y = 0.03; burgerA.add(b1); const pt = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.025, 10), M('#5a3020')); burgerA.add(pt);
  const ls = mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.006, 10), M('#6ac84a')); ls.position.y = 0.016; burgerA.add(ls); const b2 = mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.03, 10), M('#d8964a')); b2.position.y = -0.025; burgerA.add(b2); }
const appleA = new THREE.Group(); { const a = mesh(new THREE.SphereGeometry(0.05, 10, 8), M('#d8302a', { roughness: 0.35 })); appleA.add(a); bx(0.006, 0.03, 0.006, '#4a2a1a', 0, 0.055, 0, appleA); }
const phoneA = new THREE.Group(); { bx(0.07, 0.14, 0.01, '#1a1a1e', 0, 0, 0, phoneA); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.125), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.5, 1.9) })); s.position.z = -0.006; s.rotation.y = Math.PI; phoneA.add(s); }
const REAL = new THREE.Group(); apt.add(REAL); { const bowl = mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#f4f0e8', { side: THREE.DoubleSide })); bowl.position.set(1.6, 1.13, -1.15); REAL.add(bowl);
  for (let i = 0; i < 9; i++) { const f = mesh(new THREE.SphereGeometry(R(0.05, 0.07), 10, 8), M(pick(['#d8302a', '#f2a030', '#f2d84a', '#6ac84a', '#a83ad8']), { roughness: 0.4 })); f.position.set(1.6 + R(-0.12, 0.12), 1.0 + R(0, 0.1), -1.15 + R(-0.12, 0.12)); REAL.add(f); }
  const pl = mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.02, 20), M('#ffffff')); pl.position.set(2.35, 0.96, -1.1); REAL.add(pl);
  for (let i = 0; i < 12; i++) { const k = i % 3; const v = k === 0 ? mesh(new THREE.ConeGeometry(0.02, 0.14, 6), M('#f08a2a')) : k === 1 ? mesh(new THREE.IcosahedronGeometry(0.04, 0), M('#3a9a3a', { flatShading: true })) : mesh(new THREE.SphereGeometry(0.025, 8, 6), M('#e84a3a'));
    v.position.set(2.35 + R(-0.12, 0.12), 0.995, -1.1 + R(-0.12, 0.12)); if (k === 0) { v.rotation.z = Math.PI / 2; v.rotation.y = R(0, 3); } REAL.add(v); } }
// the bathroom scale (dial on top, needle on a pivot)
const scaleA = grp(3.3, 0, -0.2, 0, apt); bx(0.36, 0.06, 0.4, '#f4f4f4', 0, 0.03, 0, scaleA, { roughness: 0.3 });
{ const dt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#222'; for (let i = 0; i < 40; i++) { const a = -Math.PI * 0.85 + i / 39 * Math.PI * 1.7; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); g.lineTo(128 + Math.sin(a) * (i % 5 ? 104 : 92), 128 - Math.cos(a) * (i % 5 ? 104 : 92)); g.stroke(); } });
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.3 })); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.062, 0.1); scaleA.add(d); }
const needleA = grp(0, 0.064, 0.1, 0, scaleA); bx(0.004, 0.003, 0.065, '#d82020', 0, 0, -0.03, needleA);
const meA = makeHero(); apt.add(meA.outer); meA.elbows[0].add(burgerA, appleA, phoneA); burgerA.position.set(0, -0.3, 0.06); appleA.position.set(0, -0.3, 0.06); phoneA.position.set(0, -0.32, 0.03);
const fogA = makeSmoke(apt, 300); const _av = new THREE.Vector3();
function walkPath(pts, u) { const n = pts.length - 1, k = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(k)); const a = pts[i], b = pts[i + 1], f = k - i; return { x: lerp(a[0], b[0], f), z: lerp(a[1], b[1], f), ry: Math.atan2(b[0] - a[0], b[1] - a[1]) }; }
function lightApt(mode, t) { const L = { desk: [0.75, 1.2, [1.3, 1.35, 1.45], 0, 0, 0, 2.5], scale: [0.5, 0.0, [0.45, 0.32, 0.6], 7, 0.8, 0, 2.5], couch: [0.3, 0.0, [0.05, 0.07, 0.18], 0, 3.2, 1, 1.2], morning: [1.3, 3.6, [2.3, 2.1, 1.7], 0, 0, 0, 5.0] }[mode];
  hemiA.intensity = L[0]; sunA.intensity = L[1]; sunA.color.set(mode === 'morning' ? '#ffe2b0' : '#e8eef8'); winA.material.color.setRGB(...L[2]); pendA.intensity = L[3]; floorLA.intensity = L[4]; fillA.intensity = L[6];
  const fl = 0.75 + 0.25 * Math.sin(t * 9.3) * Math.sin(t * 2.7); tvLA.intensity = 5 * L[5] * fl; tvM.color.setRGB(L[5] ? 0.5 * fl : 0.02, L[5] ? 0.8 * fl : 0.02, L[5] ? 1.5 * fl : 0.03); }
function updateApt(t, mode) { lightApt(mode, t); const P = meA, o = P.outer; o.rotation.set(0, 0, 0); o.rotation.order = 'XYZ'; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0);
  burgerA.visible = appleA.visible = phoneA.visible = false; JUNK.forEach(j => j.visible = mode !== 'morning'); REAL.visible = mode === 'morning'; lidA.rotation.x = 0; zzzA.visible = false;
  P.torso.scale.set(1, 1, 1); let cloud = 0, head = null;
  if (mode === 'desk') {   // day 5: typing in a fog, head in the hand, then slams the laptop
    o.position.set(-2.2, 0.55, -2.25); poseSit(P); const ty = Math.sin(t * 14) * 0.06 * (1 - smooth(DAY5 + 3.4, DAY5 + 3.8, t)); P.arms[0].rotation.x = -0.95 + ty; P.arms[1].rotation.x = -0.95 - ty; P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.5;
    const hh = fadeWin(t, DAY5 + 3.5, DAY5 + 5.1, 0.3); P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -1.3, hh); P.elbows[1].rotation.x = lerp(-0.5, -2.2, hh); P.root.rotation.x = 0.18 * hh;
    const slam = smooth(DAY5 + 5.1, DAY5 + 5.35, t), up = fadeWin(t, DAY5 + 5.3, DAY5 + 6.9, 0.25); lidA.rotation.x = 1.55 * slam - 0.25 * (1 - slam);
    P.arms[0].rotation.x = lerp(P.arms[0].rotation.x, -2.6, up); P.arms[1].rotation.x = lerp(P.arms[1].rotation.x, -2.6, up); P.arms[0].rotation.z = 0.5 * up; P.arms[1].rotation.z = -0.5 * up; P.root.rotation.x -= 0.12 * up;
    cloud = smooth(DAY5 - 0.3, DAY5 + 2.5, t); P.torso.scale.set(1.04, 1, 1.05); }
  else if (mode === 'scale') {   // eat fast behind the island, then walk round to the scale; the belly grows
    const belly = lerp(1.04, 1.13, smooth(WT + 1, WT + 7, t)); P.torso.scale.set(belly, 1, belly * 1.04);
    if (t < WT + 3.4) { o.position.set(2.0, 0.95, -2.0); const bite = Math.max(0, Math.sin((t - WT) * 6.5)); P.arms[0].rotation.x = -1.1 - 0.35 * bite; P.elbows[0].rotation.x = -1.4 - 0.6 * bite; burgerA.visible = true; P.arms[1].rotation.x = -0.7; P.elbows[1].rotation.x = -0.6; }
    else if (t < WT + 4.8) { const w = walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, -0.85], [3.3, -0.2]], (t - WT - 3.4) / 1.4); o.position.set(w.x, 0.95, w.z); o.rotation.y = w.ry; poseWalk(P, (t - WT) * 9, 1); }
    else { o.position.set(3.3, 1.01, -0.22); o.rotation.y = 0; P.root.rotation.x = 0.1 * smooth(WT + 5, WT + 5.6, t); P.arms[0].rotation.x = P.arms[1].rotation.x = -0.1; } }
  else if (mode === 'couch') {   // lying on the couch scrolling, TV on, fog of no motivation
    o.position.set(-1.6, 0.68, 1.15); o.rotation.set(-Math.PI / 2, 0, -0.35); poseIdle(P, t, 0); P.legs[0].rotation.x = 0.05; P.knees[1].rotation.x = 0.5; P.legs[1].rotation.x = -0.25;
    P.arms[0].rotation.x = -1.5; P.elbows[0].rotation.x = -1.0 + 0.04 * Math.sin(t * 3); phoneA.visible = true; P.torso.scale.set(1.13, 1, 1.17); cloud = 1; }
  else {   // morning: an apple at the island with real food, a stretch, then off for a run with the gym bag
    o.position.set(2.0, 0.95, -2.0); P.torso.scale.set(1.1, 1, 1.13);
    if (t < FIX + 2.8) { const bite = fadeWin(t, FIX + 0.6, FIX + 2.6, 0.4) * (0.6 + 0.4 * Math.sin(t * 4)); P.arms[0].rotation.x = -1.0 - 0.5 * bite; P.elbows[0].rotation.x = -1.3 - 0.8 * bite; appleA.visible = true; }
    else if (t < FIX + 4.0) { const up = fadeWin(t, FIX + 2.8, FIX + 4.0, 0.35); P.arms[0].rotation.set(-3.0 * up, 0, 0.3 * up); P.arms[1].rotation.set(-3.0 * up, 0, -0.3 * up); }
    else { const w = walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, 0.2], [3.5, 1.4]], (t - FIX - 4.0) / 2.6); o.position.set(w.x, 0.95 + 0.03 * Math.abs(Math.sin((t - FIX) * 7)), w.z); o.rotation.y = w.ry; poseWalk(P, (t - FIX) * 12, 1.25); } }
  // rat (couch beat): sniffs, presses the lever once, then takes a long nap next to it
  rat.position.set(0.05, 0.05, -0.02); rat.rotation.set(0, 0.9, 0);
  if (mode === 'couch') { const press = fadeWin(t, LAZY + 3.6, LAZY + 4.3, 0.2), nap = smooth(LAZY + 4.5, LAZY + 5.0, t); rat.position.x = lerp(0.05, 0.13, press + nap * 0); rat.rotation.x = -0.6 * press; leverA.position.y = 0.16 - 0.015 * press;
    rat.rotation.z = 1.25 * nap; rat.position.y = 0.05 + 0.02 * nap; zzzA.visible = nap > 0.05; zzzA.material.opacity = nap; zzzA.position.copy(ratCage.position).add(V3(0.08, 0.2 + 0.02 * Math.sin(t * 2), 0.0)); }
  // grey fog of no-energy above the head
  fogA.begin(); smokeMat.uniforms.uTint.value.set(mode === 'couch' ? '#6a6e7a' : '#5a5e6a'); scaleA.visible = mode === 'scale'; if (cloud > 0) { head = P.torso.localToWorld(_av.set(0, 1.63, 0)); for (let k = 0; k < 70; k++) { const a = k * 2.39 + t * 0.4, r = 0.06 + (k % 7) * 0.03; fogA.add(V3(head.x + Math.cos(a) * r, head.y + 0.3 + (k % 5) * 0.03 + 0.02 * Math.sin(t * 1.5 + k), head.z + Math.sin(a) * r), 0.12 + (k % 4) * 0.04, (mode === 'couch' ? 0.25 : 0.5) * cloud); } } fogA.end();
  // the scale needle: creeps up through the month
  needleA.rotation.y = -lerp(-0.4, 0.9, smooth(WT + 5.0, WT + 7.6, t)) * (mode === 'scale' && t > WT + 4.6 ? 1 : 0) - (mode === 'scale' && t > WT + 4.6 ? 0 : -0.0); }
function aptCamera(t, mode) { let pos, look, fov = 50;
  if (mode === 'desk') { const k = smooth(DAY5 - 0.5, GUT + 0.5, t); pos = V3(-1.3, 1.6, 0.7).lerp(V3(-1.75, 1.45, -0.05), k); look = V3(-2.2, 1.05, -2.15); }
  else if (mode === 'scale') { const k = smooth(WT + 4.4, WT + 6.0, t); pos = V3(2.4, 1.55, 0.9).lerp(V3(2.2, 1.45, 0.6), smooth(WT - 0.5, WT + 3.4, t)).lerp(V3(2.9, 1.35, 2.5), k); const hw = walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, -0.85], [3.3, -0.2]], clamp((t - WT - 3.4) / 1.4, 0, 1)); look = V3(2.0, 1.15, -2.0).lerp(V3(hw.x, 1.1, hw.z), smooth(WT + 3.2, WT + 3.8, t)).lerp(V3(3.3, 0.8, -0.2), k); }
  else if (mode === 'couch') { const k = smooth(LAZY + 3.1, LAZY + 4.1, t); pos = V3(0.3, 1.9, 3.0).lerp(V3(0.0, 1.75, 2.7), smooth(LAZY - 0.5, LAZY + 3.1, t)).lerp(V3(1.25, 1.02, 3.1), k); look = V3(-1.5, 0.75, 1.15).lerp(V3(0.9, 0.82, 2.4), k); fov = lerp(50, 44, k); }
  else { const w = t < FIX + 4.0 ? null : walkPath([[2.0, -2.0], [3.45, -1.75], [3.45, 0.2], [3.5, 1.4]], (t - FIX - 4.0) / 2.6); pos = V3(0.9, 1.6, 1.6).lerp(V3(1.3, 1.55, 1.2), smooth(FIX, T_END, t)); look = V3(2.0, 1.2, -1.9);
    if (w) look.lerp(V3(w.x, 1.2, w.z), smooth(FIX + 4.0, FIX + 5.0, t)); }
  aptCam.position.copy(pos); aptCam.lookAt(look); aptCam.fov = fov; }
// =================== scene schedule + dissolves (the apartment dissolves between its own modes too) ===================
const SCN = { drive: [updateDrive, driveCamera, drv, () => dCam, 1.0], art: [updateArtery, arteryCamera, artS, () => artCam, 1.15], gut: [updateGut, gutCamera, gutS, () => gutCam, 1.15], liv: [updateLiver, liverCamera, livS, () => livCam, 1.1],
  desk: [t => updateApt(t, 'desk'), t => aptCamera(t, 'desk'), apt, () => aptCam, 1.0], scale: [t => updateApt(t, 'scale'), t => aptCamera(t, 'scale'), apt, () => aptCam, 1.0],
  couch: [t => updateApt(t, 'couch'), t => aptCamera(t, 'couch'), apt, () => aptCam, 1.0], morning: [t => updateApt(t, 'morning'), t => aptCamera(t, 'morning'), apt, () => aptCam, 1.0] };
const SEQ = [[0, 'drive'], [ART, 'art'], [DAY5, 'desk'], [GUT, 'gut'], [WT, 'scale'], [LIV, 'liv'], [LAZY, 'couch'], [FIX, 'morning']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you ate only<br><span class="hl">fast food</span> for 30 days?'; el.endT.innerHTML = 'What if you ate only<br><span class="hl">fast food</span> for 30 days?';
el.endS.innerHTML = 'VOGEL 1997: ONE FAST-FOOD BREAKFAST HALVED ARTERY FLEX FOR ~4 HOURS.<br>KECHAGIAS 2008: 4 WEEKS OF FAST FOOD RAISED LIVER ENZYMES IN 14 OF 18.<br>HOLLOWAY 2011 (YOUNG MEN): 5 DAYS OF A HIGH-FAT DIET WORSENED ATTENTION AND MOOD.';
const captions = [
  [4.3, 6.9, 'Sugar rush? It’s a myth.'],
  [7.0, 9.8, 'Within an hour: more tired,<br>less alert.'],
  [10.4, 13.4, 'One fast-food breakfast →<br>arteries relax 50% less<br>for 4 hours.'],
  [13.7, 16.7, '3 combo meals ≈ 2.7×<br>your daily salt limit.'],
  [17.4, 23.7, 'Day 5: greasy food made<br>people slower, less focused<br>— and grumpier.'],
  [24.4, 26.9, '~90% of your serotonin<br>is made in your gut.'],
  [27.0, 29.4, 'Your gut bacteria eat fiber.<br>Fast food has almost none.'],
  [29.5, 31.8, '10 days: one person lost ~40%<br>of their gut bacteria species.'],
  [32.4, 35.0, 'You eat it faster than<br>your brain can say “full”.'],
  [35.2, 37.4, '+500 calories a day<br>≈ 4 lb a month (MODEL).'],
  [37.5, 39.8, 'Super Size Me:<br>+24.5 lb in 30 days.'],
  [40.4, 45.7, 'Week 1: liver stress<br>in 14 of 18 people.<br>Main suspect: sugar.'],
  [46.4, 49.3, 'Rats on junk food got lazier.'],
  [49.5, 52.7, 'Their breaks before working<br>for a reward: 2× longer.'],
  [53.4, 56.3, '2 weeks of fruits & veggies:<br>more energy,<br>more motivation.'],
  [56.5, 58.0, 'Your gut changes in a day.'],
  [58.1, 59.9, '84.8 million Americans<br>eat fast food today. 👇'],
];
const GREEN = '<b style="background:#5fd27a"></b>';
const weightAt = t => t < WT + 5.5 ? 4.3 * smooth(WT + 3.3, WT + 4.8, t) : lerp(4.3, 24.5, smooth(WT + 5.6, WT + 7.4, t));
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < ART) return ['<b></b>DAY 1 · DRIVE-THRU', 'ENERGY', t < 6.8 ? 'OK' : t < 8.6 ? 'DROPPING' : 'LOW', 'AFTER SODA + FRIES'];
  if (t < SALT) return ['<b></b>DAY 1 · BREAKFAST', 'ARTERY FLEX', Math.round(100 * artFlex(t)) + '%', 'VS. NORMAL · NEXT ~4 HOURS'];
  if (t < DAY5) return ['<b></b>DAY 1 · 3 COMBOS', 'SODIUM', fmt(6200 * smooth(SALT + 0.2, SALT + 2.4, t)) + ' mg', '≈ 2.7× THE DAILY LIMIT (MODEL)'];
  if (t < GUT) return ['<b></b>DAY 5', 'FOCUS', 'WORSE', 'ATTENTION · SPEED · MOOD'];
  if (t < WT) return ['<b></b>DAY 10', 'GUT SPECIES', Math.round(100 - 40 * smooth(GUT + 3.2, GUT + 6.8, t)) + '%', 'LEFT · ONE-PERSON TEST'];
  if (t < LIV) return ['<b></b>DAY 30', 'WEIGHT', '+' + weightAt(t).toFixed(1) + ' lb', t < WT + 5.5 ? '+500 KCAL A DAY (MODEL)' : 'SUPER SIZE ME · 5,000 KCAL A DAY'];
  if (t < LAZY) return ['<b></b>WEEK 1', 'LIVER STRESS', '14 of 18', 'PEOPLE IN THE STUDY'];
  if (t < LAZY + 3.3) return ['<b></b>DAY 30 · EVENING', 'MOTIVATION', 'LOW', 'THE COUCH WINS'];
  if (t < FIX) return ['<b></b>RATS · 3 MONTHS', 'BREAKS', '2× longer', 'VS. RATS ON NORMAL FOOD'];
  if (t < FIX + 3.4) return [GREEN + 'REAL FOOD · 2 WEEKS', 'ENERGY', 'UP', 'MORE MOTIVATION · STUDY 2017'];
  if (t < FIX + 5.0) return [GREEN + 'REAL FOOD', 'GUT BACTERIA', '1 day', 'TO START CHANGING'];
  return [GREEN + 'CDC', 'AMERICANS TODAY', '84.8 M', 'EAT FAST FOOD ON A GIVEN DAY']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(3.8, 4.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  let eA = 1, eB = 1; if (!B || mix < 1) eA = shootScene(A, t, RTA); if (B) eB = shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0;
  compMat.uniforms.uRed.value = 0.3 * fadeWin(t, DAY5 + 5.1, DAY5 + 6.6, 0.3);   // the grumpy outburst at the desk
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
