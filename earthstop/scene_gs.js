import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "Why did every flight in America stop?" (Nov 14 2026): 3D explainer, no hero (her call) — airport hall + departures board, frozen taxiway queue, the ATC telecom network failing, planes landing, an old server room. Voice: Sarah (Lumean), timing in g_times.js.
// Facts (CBS/ABC/Al Jazeera/NBC, Nov 13–14): ground stop 3:54–8:15 pm ET Fri Nov 13; 3rd nationwide one (9/11 2001, NOTAM Jan 2023); telecom outage hitting air route traffic control centers; ~1.5M passengers (AP); thousands canceled; no sign of a cyberattack (DHS); Duffy: old, overloaded equipment, may happen again.
// =================== timeline (s) ===================
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 4242;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 }, uTilt: { value: 0 }, uWhip: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook, uWhip, uTilt;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    // soft glow around bright HDR spots (lamps, the sun, emissive bits): two rings of taps on the over-1.0 part
    vec3 glow(sampler2D tx, vec2 uv, float ex){ vec3 g=vec3(0.0); for(int i=0;i<8;i++){ float a=float(i)*0.785398+0.39; vec2 d=vec2(cos(a),sin(a))*vec2(1.0,0.5625);
      g+=max(texture2D(tx,uv+d*0.012).rgb*ex-1.0,0.0)*0.6+max(texture2D(tx,uv+d*0.03).rgb*ex-1.0,0.0)*0.4; } return g/8.0; }
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA+0.35*uLook*glow(tA,uv,uExpA)); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB+0.35*uLook*glow(tB,uv,uExpB)); c=mix(a,b,uMix); }
      // whip pan: a horizontal smear along the cut (uWhip = smear length in uv, signed = direction)
      if(abs(uWhip)>0.0005){ vec3 acc=c; for(int i=1;i<=14;i++){ float o=uWhip*(float(i)/14.0-0.5)*2.0; vec2 q=vec2(clamp(uv.x+o,0.0,1.0),uv.y); vec3 sa=aces(texture2D(tA,q).rgb*uExpA); if(uMix>0.001) sa=mix(sa,aces(texture2D(tB,q).rgb*uExpB),uMix); acc+=sa; } c=acc/15.0; }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      // fake tilt-shift (clay look): blur grows above and below a sharp middle band, like a macro shot of a miniature
      if(uTilt>0.001){ float bl=uTilt*smoothstep(0.12,0.42,abs(vUv.y-0.56)); if(bl>0.0005){ vec3 acc=c; for(int i=0;i<12;i++){ float a=float(i)*0.5236; vec2 o=vec2(cos(a),sin(a)*0.5625)*bl*(0.5+0.5*mod(float(i),2.0)); acc+=aces(texture2D(tA,uv+o).rgb*uExpA); } c=acc/13.0; } }
      c=srgb(c);
      // "storybook" finish: softer contrast with lifted blacks and a STATIC paper texture (moving grain gets mangled by TikTok's re-encode)
      vec2 px=vUv*vec2(1080.0,1920.0); float paper=vn(px/90.0)*0.5+vn(px/23.0)*0.3+vn(px/6.0)*0.2, grain=vn(px/1.7)-0.5;
      vec3 l=mix(c, c*0.93+vec3(0.035,0.03,0.025), uLook); l*=1.0+uLook*(0.07*(paper-0.5)+0.05*grain);
      float vg=length((vUv-0.5)*vec2(1.0,0.75)); l*=1.0-uLook*0.18*smoothstep(0.35,0.75,vg);
      gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }` });
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
// =================== SETS (each its own scene + camera; you are re-parented into whichever set is shot) ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false })));
  sc.fog = new THREE.Fog(fog, near, far); const hm = new THREE.HemisphereLight(...hemi); sc.add(hm);
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 80 }); sc.add(s, s.target); sc.userData.sun = s; sc.userData.hemi = hm;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D(), _c = new THREE.Color();
// bake a group (people.js person, makeCar…) into ONE geometry with vertex colours, so thousands can be instanced cheaply
const BAKE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
function bake(group) { group.updateMatrixWorld(true); const gs = [];
  group.traverse(o => { if (!o.isMesh || !o.visible) return; let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.color) { const c = (Array.isArray(o.material) ? o.material[0] : o.material).color || new THREE.Color(1, 1, 1), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    gs.push(g); }); return mergeGeometries(gs); }
// the crowd: 12 beachgoers (people.js, built from simple shapes like on our streets) × 4 poses
const GLSL_HASH = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`;
const SUN_DIR = V3(-0.55, 0.32, -0.77).normalize(), HAZE = new THREE.Color('#f0b47a');
// =================== GROUND STOP sets (no hero): HALL (departures board + crowd), APRON (terminal, gates, taxiway queue, runway), NET (20 control towers + telecom cables, night), SKY (planes over clouds), SRV (old server room) ===================
const SMK = [];
// a low-poly airliner (fuselage, nose, swept wings, engines, tail in a livery colour, window band) — length ≈ 60 m
function makePlane(tail = '#2a5ad8', band = '#2a5ad8') { const pl = new THREE.Group(), white = F_('#eef2f6', { roughness: 0.4 });
  const fus = mesh(new THREE.CylinderGeometry(2.0, 2.0, 52, 16), white); fus.rotation.z = Math.PI / 2; pl.add(fus);
  const nose = mesh(new THREE.SphereGeometry(2.0, 14, 10), white); nose.scale.set(2.4, 1, 1); nose.position.x = 26; pl.add(nose);
  const cone = mesh(new THREE.ConeGeometry(2.0, 9, 14), white); cone.rotation.z = Math.PI / 2; cone.position.x = -30.5; cone.scale.set(1, 1, 0.8); pl.add(cone);
  for (const s of [-1, 1]) { const wg = mesh(new THREE.BoxGeometry(9, 0.5, 30), white); wg.position.set(2, -0.9, s * 16); wg.rotation.y = s * 0.42; pl.add(wg);
    const en = mesh(new THREE.CylinderGeometry(1.3, 1.15, 4.6, 14), F_('#d8dce0', { roughness: 0.35 })); en.rotation.z = Math.PI / 2; en.position.set(5.5, -2.3, s * 9.5); pl.add(en);
    const hs = mesh(new THREE.BoxGeometry(5, 0.35, 10), white); hs.position.set(-29, 1.2, s * 5); hs.rotation.y = s * 0.45; pl.add(hs); }
  const tl = mesh(new THREE.BoxGeometry(7, 10, 0.5), F_(tail)); tl.position.set(-29, 6, 0); tl.rotation.z = 0.35; pl.add(tl);
  bx(50, 0.7, 4.08, band, 0, -0.7, 0, pl); for (let k = 0; k < 36; k++) for (const s of [-1, 1]) bx(0.55, 0.5, 0.05, '#1a2230', -20 + k * 1.2, 0.6, s * 2.02, pl);
  for (const s of [-1, 1]) bx(1.6, 0.8, 0.05, '#1a2230', 25.5, 0.9, s * 1.62, pl);
  for (const [x, z] of [[20, 0], [3, -3.5], [3, 3.5]]) { bx(0.4, 3, 0.4, '#8a8e94', x, -3.2, z, pl); const w = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.6, 12), F_('#1a1a1e')); w.rotation.x = Math.PI / 2; w.position.set(x, -4.6, z); pl.add(w); }
  pl.position.y = 5.3; return pl; }
const LIVERY = [['#2a5ad8', '#2a5ad8'], ['#d8302a', '#c02420'], ['#1a2a5a', '#e8a020'], ['#2aa86a', '#2aa86a'], ['#5a2a8a', '#8a5ac8']];
// ---------- 1) HALL: the departures board turns red, then a packed, stuck terminal ----------
const HALL = mkSet({ top: '#f0c890', bot: '#f8e0c0', fog: 0xe8d8c8, near: 60, far: 400, hemi: [0xfff4e8, 0x9a8a78, 1.3], sun: [0xffd8a8, 2.2, V3(-8, 12, 10)], shadow: 22 });
const HL = {}; { const sc = HALL.sc; const floor = new THREE.MeshStandardMaterial({ color: '#c8c4bc', roughness: 0.25, metalness: 0.05 }); gplane(sc, 120, 120, floor, 0, 0);
  for (let i = -6; i <= 6; i++) bx(0.04, 0.01, 120, '#b0aca4', i * 4, 0.006, 0, sc);
  // the glass wall with the apron behind it (two parked planes), mullions
  const glass = new THREE.MeshStandardMaterial({ color: '#9ac0e0', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25 }); const gw = mesh(new THREE.PlaneGeometry(60, 14), glass, false, false); gw.position.set(0, 7, -14); sc.add(gw);
  for (let i = -15; i <= 15; i++) bx(0.25, 14, 0.25, '#4a4e56', i * 2, 7, -14, sc); bx(60, 0.4, 0.4, '#4a4e56', 0, 14, -14, sc); bx(60, 0.3, 0.3, '#4a4e56', 0, 7, -14, sc);
  gplane(sc, 300, 200, '#8a8c90', 0, -110, -0.02); for (const [x, z, ry, li] of [[-24, -48, 0.5, 0], [30, -60, -0.4, 1], [2, -95, 0.1, 2]]) { const p = makePlane(...LIVERY[li]); p.position.set(x, 5.3, z); p.rotation.y = ry; sc.add(p); }
  bx(60, 1, 30, '#e8e4dc', 0, 18, 0, sc); bx(0.5, 18, 30, '#d8d4cc', -30, 9, 0, sc); bx(0.5, 18, 30, '#d8d4cc', 30, 9, 0, sc);
  // the board: two posts + a black screen with a canvas texture that is redrawn per frame
  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 640; HL.bctx = bc.getContext('2d'); HL.btex = new THREE.CanvasTexture(bc); HL.btex.colorSpace = THREE.SRGBColorSpace; HL.btex.anisotropy = 8;
  const bd = grp(0, 0, 2, 0, sc); bx(9.6, 6.2, 0.5, '#1a1c22', 0, 7.2, 0, bd, { roughness: 0.4 }); const scr = mesh(new THREE.PlaneGeometry(9.2, 5.75), new THREE.MeshBasicMaterial({ map: HL.btex, toneMapped: false }), false, false); scr.position.set(0, 7.2, 0.26); bd.add(scr);
  for (const s of [-1, 1]) bx(0.35, 4.2, 0.35, '#4a4e56', s * 3.5, 2.1, 0, bd); HL.board = bd;
  // benches + the crowd (people.js, posed), revealed for the "stuck" beat
  HL.crowd = []; const r0 = seed; seed = 777; for (let i = 0; i < 46; i++) { const p = makePerson(rnd); const x = R(-22, 22), z = R(4, 26); if (Math.abs(x) < 6 && z < 9) continue; const sit = rnd() < 0.35;
    p.outer.position.set(x, 0.95, z); p.outer.rotation.y = Math.atan2(-x * 0.3, -z) + R(-0.6, 0.6); if (sit) { poseSit(p); p.outer.position.y = 0.95 - 0.45; } else poseIdle(p, R(0, 9), R(0, 6)); p.outer.userData = { sit, ph: R(0, 6) }; sc.add(p.outer); HL.crowd.push(p);
    if (rnd() < 0.5) { const c = bx(0.42, 0.62, 0.26, pick(['#2a2e3a', '#8a2a2a', '#2a5a8a', '#5a5a5a', '#c8a040']), x + 0.45, 0.31, z + 0.2, sc); c.userData.bag = 1; HL.crowd.push({ outer: c, bag: 1 }); } }
  for (let i = 0; i < 6; i++) { const z = 12 + (i % 3) * 5, x = (i < 3 ? -14 : 14); bx(6, 0.12, 0.8, '#3a4a6a', x, 0.5, z, sc); for (const s of [-1, 1]) bx(0.1, 0.5, 0.7, '#2a2e36', x + s * 2.8, 0.25, z, sc); }
  seed = r0; }
const DEST = [['4:05', 'NEW YORK JFK', 'DL 412'], ['4:10', 'CHICAGO', 'UA 1188'], ['4:15', 'LOS ANGELES', 'AA 2201'], ['4:20', 'ATLANTA', 'DL 905'], ['4:25', 'DENVER', 'WN 3317'], ['4:30', 'MIAMI', 'AA 1450'], ['4:35', 'SEATTLE', 'AS 22'], ['4:40', 'DALLAS', 'AA 77'], ['4:45', 'BOSTON', 'B6 618'], ['4:50', 'LAS VEGAS', 'WN 1290']];
function drawBoard(t, flip0, green = 0) { const g = HL.bctx, w = 1024, h = 640; g.fillStyle = '#0a0d14'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4c430'; g.font = '700 46px Inter'; g.fillText('DEPARTURES', 30, 62); g.fillStyle = '#8a92a0'; g.font = '700 22px Inter'; g.fillText('TIME', 30, 104); g.fillText('DESTINATION', 150, 104); g.fillText('FLIGHT', 560, 104); g.fillText('STATUS', 760, 104);
  DEST.forEach((d, i) => { const y = 150 + i * 49; g.fillStyle = i % 2 ? '#121722' : '#0e131c'; g.fillRect(20, y - 34, w - 40, 46); g.font = '700 30px Inter'; g.fillStyle = '#e8ecf2'; g.fillText(d[0], 30, y); g.fillText(d[1], 150, y); g.fillStyle = '#b8c0cc'; g.fillText(d[2], 560, y);
    const tf = flip0 + i * 0.12, f = flip0 < 0 ? 0 : clamp((t - tf) / 0.18, 0, 1); let st = 'ON TIME', col = '#3ad07a'; if (f >= 1) { st = 'CANCELED'; col = '#ff3a3a'; } else if (f > 0) { st = '▒▒▒▒▒▒'; col = '#f4c430'; }
    if (green) { st = 'ON TIME'; col = '#3ad07a'; } g.fillStyle = col; g.fillText(st, 760, y); });
  HL.btex.needsUpdate = true; }
// ---------- 2) APRON: terminal + gates, a long taxiway queue with red stop bars, a runway ----------
const APRON = mkSet({ top: '#2a62c8', bot: '#f0b878', fog: 0xe8c8a8, near: 700, far: 4200, hemi: [0xfff0e0, 0x6a6a60, 1.15], sun: [0xffc890, 2.8, V3(-60, 40, 30)], shadow: 140 });
APRON.cam.near = 1.5; APRON.cam.far = 4500; APRON.cam.updateProjectionMatrix(); // depth precision: no z-fighting flicker on the runway/markings
const AP = {}; { const sc = APRON.sc; const conc = new THREE.ShaderMaterial({ lights: false, uniforms: {}, vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `${GLSL_HASH} varying vec3 vW; void main(){ float fw=length(fwidth(vW.xz)); float fine=clamp(1.0-fw*1.5,0.0,1.0); float n=vn(vW.xz*0.35)*0.5+vn(vW.xz*2.1)*0.3*fine+0.15*(1.0-fine); vec3 c=mix(vec3(0.075,0.075,0.08),vec3(0.11,0.11,0.115),n); float j=step(0.97,fract(vW.x/7.5))+step(0.97,fract(vW.z/7.5)); c*=1.0-0.08*min(j,1.0)*clamp(1.0-fw*6.0,0.0,1.0); gl_FragColor=vec4(c,1.0); }` });
  const g = mesh(new THREE.PlaneGeometry(3000, 3000), conc, false, false); g.rotation.x = -Math.PI / 2; sc.add(g); gplane(sc, 3000, 900, '#7a9a5a', 0, 1100, 0.12);
  // terminal (glass + white roof) with 5 jet bridges and parked planes
  bx(260, 16, 40, '#6a8aa8', 0, 8, -60, sc, { roughness: 0.15, metalness: 0.35 }); bx(270, 2, 46, '#f0ece4', 0, 17, -60, sc); for (let i = -12; i <= 12; i++) bx(0.6, 16, 0.6, '#3a3e46', i * 10.6, 8, -39.6, sc);
  AP.gate = []; for (let i = 0; i < 5; i++) { const x = -100 + i * 50; bx(3.4, 3.4, 22, '#c8ccd0', x, 6, -27, sc); const p = makePlane(...LIVERY[i % 5]); p.rotation.y = -Math.PI / 2; p.position.set(x + 8, 5.3, 6); sc.add(p); AP.gate.push(p); }
  // taxiway (yellow centre line) with the queue + red stop bar at the runway hold line; the runway itself
  bx(1400, 0.1, 0.5, '#e8c020', 0, 0.06, 120, sc); bx(1600, 0.2, 60, '#3a3a3c', 0, 0.1, 260, sc); for (let i = -40; i <= 40; i++) bx(18, 0.1, 1.2, '#f0f0f0', i * 40, 0.22, 260, sc);
  AP.queue = []; for (let i = 0; i < 9; i++) { const p = makePlane(...LIVERY[(i + 2) % 5]); p.position.set(260 - i * 75, 5.3, 120); sc.add(p); AP.queue.push(p); }
  AP.stop = []; for (let i = 0; i < 14; i++) { const m = mesh(new THREE.BoxGeometry(0.35, 0.25, 0.35), new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false }), false, false); m.position.set(330, 0.15, 105 + i * 2.4); sc.add(m); AP.stop.push(m); }
  AP.takeoff = makePlane('#d8302a', '#c02420'); sc.add(AP.takeoff);
  // the control tower next to the terminal
  const tw = grp(170, 0, -20, 0, sc); const sh = mesh(new THREE.CylinderGeometry(4, 6, 46, 10), F_('#e8e4dc')); sh.position.y = 23; tw.add(sh); const cab = mesh(new THREE.CylinderGeometry(9, 7, 7, 10), new THREE.MeshStandardMaterial({ color: '#2a4a5a', roughness: 0.1, metalness: 0.5, emissive: '#2a6a7a', emissiveIntensity: 0.4 })); cab.position.y = 50; tw.add(cab);
  bx(18, 1.2, 18, '#f0ece4', 0, 54.2, 0, tw); AP.tower = tw; }
// ---------- 3) NET: 20 control towers at night, linked by glowing telecom cables with data pulses; then the network fails ----------
const NET = mkSet({ top: '#0a1430', bot: '#2a2a4a', fog: 0x0e1426, near: 200, far: 1300, hemi: [0x6a7aa8, 0x101418, 0.55], sun: [0x9ab0e0, 0.6, V3(-40, 60, 20)], shadow: 300 });
const NT = {}; { const sc = NET.sc; gplane(sc, 4000, 4000, '#1a2030', 0, 0); const r0 = seed; seed = 2020;
  NT.towers = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2 + R(-0.12, 0.12), r = 150 + R(0, 230) * (i % 2 ? 1 : 0.55); const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r;
    const tw = grp(x, 0, z, 0, sc); const sh = mesh(new THREE.CylinderGeometry(2.5, 3.5, 30, 8), F_('#8a909c')); sh.position.y = 15; tw.add(sh);
    const win = new THREE.MeshStandardMaterial({ color: '#0a2a3a', emissive: '#3af0ff', emissiveIntensity: 1.6, roughness: 0.2 }); const cab = mesh(new THREE.CylinderGeometry(6, 4.5, 5, 8), win); cab.position.y = 32; tw.add(cab); bx(12, 0.8, 12, '#c8ccd4', 0, 35, 0, tw);
    const bc = mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3030', toneMapped: false })); bc.position.y = 37; tw.add(bc); NT.towers.push({ g: tw, win, bc, p: V3(x, 34, z) }); }
  // cables: each tower to its 2 nearest + 1 across, raised arcs; data pulses ride them
  NT.cables = []; const done = new Set(); NT.towers.forEach((A, i) => { const near = NT.towers.map((B, j) => [j, A.p.distanceTo(B.p)]).filter(q => q[0] !== i).sort((a, b) => a[1] - b[1]).slice(0, 2).map(q => q[0]); near.push((i + 7) % 20);
    near.forEach(j => { const key = Math.min(i, j) + '-' + Math.max(i, j); if (done.has(key)) return; done.add(key); const B = NT.towers[j]; const mid = A.p.clone().lerp(B.p, 0.5); mid.y += 30 + A.p.distanceTo(B.p) * 0.08;
      const cur = new THREE.QuadraticBezierCurve3(A.p, mid, B.p); const m = new THREE.MeshBasicMaterial({ color: '#3af0ff', transparent: true, opacity: 0.85, toneMapped: false }); const tb = mesh(new THREE.TubeGeometry(cur, 40, 0.45, 6, false), m, false, false); sc.add(tb);
      const pulses = Array.from({ length: 3 }, () => { const s = mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#e8ffff', toneMapped: false }), false, false); sc.add(s); return s; });
      NT.cables.push({ cur, m, tb, pulses, ph: R(0, 1), sp: R(0.25, 0.5), fail: R(0, 1.6), mid }); }); });
  NT.sparks = makeSmoke(sc, 400); SMK.push(NT.sparks); seed = r0; }
// ---------- 4) SKY: planes above the clouds, descending ----------
const SKY = mkSet({ top: '#1a4aa8', bot: '#e8a868', fog: 0xe8c0a0, near: 900, far: 4200, hemi: [0xffffff, 0x8a8aa0, 1.2], sun: [0xffe0b8, 2.6, V3(-60, 50, 40)], shadow: 80 });
const SK = {}; { const sc = SKY.sc; const cm = F_('#ffffff', { roughness: 1 }); const r0 = seed; seed = 909;
  for (let i = 0; i < 70; i++) { const c = new THREE.Group(); for (let k = 0; k < 6; k++) { const s = mesh(new THREE.SphereGeometry(R(14, 30), 9, 7), cm, false, false); s.position.set(R(-40, 40), R(-6, 8), R(-20, 20)); s.scale.y = 0.55; c.add(s); } c.position.set(R(-1400, 1400), R(-30, 10), R(-1800, 400)); sc.add(c); }
  SK.planes = [0, 1, 2].map(i => { const p = makePlane(...LIVERY[i + 1]); sc.add(p); return p; }); seed = r0; }
// ---------- 5) SRV: an old server room — beige boxes, CRTs, tangled cables, duct tape, blinking/failing LEDs, smoke ----------
const SRV = mkSet({ top: '#1a1e26', bot: '#2a2e36', fog: 0x14161c, near: 20, far: 90, hemi: [0x8a9ab8, 0x2a2420, 0.5], sun: [0xa8c0ff, 0.5, V3(3, 8, 5)], shadow: 10 });
const SV = {}; { const sc = SRV.sc; gplane(sc, 60, 60, '#3a3c40', 0, 0); bx(30, 6, 0.3, '#4a4c50', 0, 3, -6, sc); const lamp = new THREE.PointLight(0xffe0b0, 6, 14, 1.6); lamp.position.set(0, 4.6, 2); sc.add(lamp); SV.lamp = lamp;
  const warn = new THREE.PointLight(0xff3020, 0, 12, 1.4); warn.position.set(-1.5, 3, 0); sc.add(warn); SV.warn = warn; SV.leds = [];
  for (let r = 0; r < 4; r++) { const x = -5.4 + r * 2.4; bx(1.9, 4, 1.4, '#c8c0a8', x, 2, -4.4, sc); for (let k = 0; k < 12; k++) { bx(1.7, 0.04, 0.02, '#8a8470', x, 0.6 + k * 0.28, -3.68, sc);
      const led = mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: '#30ff60', toneMapped: false }), false, false); led.position.set(x + 0.7 - (k % 3) * 0.15, 0.68 + k * 0.28, -3.66); sc.add(led); SV.leds.push(led); } }
  // the desk with two beige CRTs (one with an error screen), a keyboard
  bx(4, 0.1, 1.6, '#8a6a4a', 0.4, 1.05, -0.6, sc); for (const s of [-1, 1]) bx(0.1, 1.0, 1.4, '#6a4a30', 0.4 + s * 1.9, 0.5, -0.6, sc);
  const ec = document.createElement('canvas'); ec.width = 256; ec.height = 192; SV.ectx = ec.getContext('2d'); SV.etex = new THREE.CanvasTexture(ec);
  SV.crts = []; for (const [x, err] of [[-0.6, 0], [1.4, 1]]) { const c = grp(x, 1.1, -0.7, err ? -0.25 : 0.2, sc); bx(1.2, 1.0, 1.1, '#d8d0b8', 0, 0.5, 0, c); bx(0.5, 0.08, 0.4, '#c8c0a8', 0, 0.04, 0.1, c);
    const scr = mesh(new THREE.PlaneGeometry(0.92, 0.7), new THREE.MeshBasicMaterial({ map: err ? SV.etex : null, color: err ? '#ffffff' : '#1a3a2a', toneMapped: false }), false, false); scr.position.set(0, 0.52, 0.56); c.add(scr); SV.crts.push(scr); }
  bx(1.4, 0.05, 0.4, '#c8c0a8', 0.4, 1.12, -0.05, sc);
  // cables: a tangle of tubes from the racks to the desk, with grey duct-tape wraps
  const r0 = seed; seed = 31; for (let i = 0; i < 14; i++) { const a = V3(-5.4 + (i % 4) * 2.4 + R(-0.5, 0.5), R(0.4, 3.6), -3.6), d = V3(R(-1, 1.8), 1.1, -0.9); const m1 = a.clone().lerp(d, 0.4).add(V3(R(-1, 1), R(-1.5, -0.2), R(0.4, 1.8)));
    const cur = new THREE.CatmullRomCurve3([a, m1, a.clone().lerp(d, 0.75).add(V3(R(-0.6, 0.6), R(-0.8, 0), R(0, 0.8))), d]); sc.add(mesh(new THREE.TubeGeometry(cur, 30, 0.035, 5, false), F_(pick(['#1a1a1a', '#2a4a8a', '#c8a020', '#8a2a2a', '#5a5a5a'])), false, false));
    if (i % 3 === 0) { const p = cur.getPoint(0.5); bx(0.16, 0.16, 0.16, '#9a9a9a', p.x, p.y, p.z, sc); } }
  seed = r0; SV.smoke = makeSmoke(sc, 160); SMK.push(SV.smoke); }
function drawError(t) { const g = SV.ectx; g.fillStyle = '#0018a8'; g.fillRect(0, 0, 256, 192); g.fillStyle = '#ffffff'; g.font = '700 16px monospace'; ['NETWORK LINK DOWN', '', 'ROUTER OVERLOAD', 'BUFFER FULL 100%', '', 'ERROR 0x00FF2F'].forEach((l, i) => g.fillText(l, 14, 30 + i * 22));
  if (Math.floor(t * 3) % 2) g.fillRect(14, 168, 12, 14); SV.etex.needsUpdate = true; }
// generated by tools/news_timing.py — do not edit
const SENT = [0.0, 4.286, 9.559, 15.656, 16.621, 21.626, 26.632, 29.593, 32.937, 35.899, 41.182, 46.105, 48.497, 53.038, 55.906];
const WORDS = [[0.0, 0.313, "On"], [0.36, 0.673, "Friday"], [0.72, 1.428, "afternoon,"], [1.568, 1.882, "every"], [1.94, 2.381, "departing"], [2.451, 2.764, "flight"], [2.834, 2.915, "in"], [2.961, 3.426, "America"], [3.519, 4.146, "stopped."], [4.286, 4.449, "At"], [4.495, 4.727, "3:54"], [4.774, 5.308, "in"], [5.343, 5.412, "the"], [5.47, 6.179, "afternoon,"], [6.319, 6.458, "the"], [6.54, 7.167, "FAA"], [7.306, 7.689, "ordered"], [7.747, 7.782, "a"], [7.875, 8.502, "nationwide"], [8.537, 8.827, "ground"], [8.885, 9.419, "stop."], [9.559, 9.757, "That"], [9.791, 9.873, "has"], [9.919, 10.221, "happened"], [10.291, 10.534, "only"], [10.592, 10.929, "twice"], [10.964, 11.626, "before:"], [11.766, 11.929, "on"], [11.987, 13.101, "9/11,"], [13.241, 13.427, "and"], [13.508, 13.589, "in"], [13.659, 14.239, "January"], [14.309, 15.516, "2023."], [15.656, 15.947, "Here's"], [15.993, 16.481, "why."], [16.621, 17.016, "Planes"], [17.074, 17.469, "crossing"], [17.515, 17.98, "American"], [18.049, 18.479, "skies"], [18.537, 18.676, "are"], [18.723, 19.036, "guided"], [19.094, 19.234, "by"], [19.326, 19.756, "20"], [19.837, 20.023, "air"], [20.081, 20.441, "traffic"], [20.487, 20.836, "control"], [20.905, 21.486, "centers."], [21.626, 21.8, "They"], [21.859, 22.079, "talk"], [22.149, 22.207, "to"], [22.288, 22.427, "each"], [22.474, 22.776, "other,"], [22.799, 22.985, "and"], [23.054, 23.124, "to"], [23.194, 23.844, "pilots,"], [23.984, 24.263, "through"], [24.333, 24.611, "one"], [24.681, 25.331, "nationwide"], [25.366, 25.83, "telecom"], [25.9, 26.492, "network."], [26.632, 26.806, "On"], [26.864, 27.212, "Friday"], [27.259, 27.967, "afternoon,"], [28.025, 28.234, "that"], [28.292, 28.652, "network"], [28.71, 28.895, "went"], [28.953, 29.453, "down."], [29.593, 30.185, "Controllers"], [30.231, 30.405, "could"], [30.452, 30.568, "no"], [30.649, 30.974, "longer"], [31.067, 31.752, "reliably"], [31.868, 32.135, "reach"], [32.182, 32.333, "each"], [32.379, 32.797, "other."], [32.937, 33.111, "So"], [33.181, 33.286, "the"], [33.378, 34.005, "FAA"], [34.145, 34.621, "froze"], [34.691, 35.004, "every"], [35.062, 35.759, "departure."], [35.899, 36.282, "Planes"], [36.34, 36.7, "already"], [36.747, 36.793, "in"], [36.828, 36.898, "the"], [36.956, 37.107, "air"], [37.176, 37.385, "kept"], [37.455, 37.838, "flying"], [37.885, 37.954, "and"], [38.012, 38.57, "landed,"], [38.709, 38.86, "but"], [38.906, 39.173, "nothing"], [39.231, 39.405, "took"], [39.463, 39.638, "off"], [39.684, 39.789, "for"], [39.835, 39.974, "more"], [39.998, 40.125, "than"], [40.195, 40.415, "four"], [40.474, 41.042, "hours."], [41.182, 41.751, "Thousands"], [41.785, 41.843, "of"], [41.89, 42.192, "flights"], [42.227, 42.343, "were"], [42.378, 42.993, "canceled,"], [43.109, 43.26, "and"], [43.307, 43.527, "about"], [43.585, 43.771, "one"], [43.806, 43.887, "and"], [43.934, 43.957, "a"], [44.026, 44.201, "half"], [44.27, 44.584, "million"], [44.653, 45.222, "passengers"], [45.269, 45.42, "were"], [45.454, 45.965, "stuck."], [46.105, 46.569, "Officials"], [46.604, 46.836, "say"], [46.906, 46.987, "it"], [47.022, 47.138, "was"], [47.208, 47.417, "not"], [47.475, 47.51, "a"], [47.568, 48.357, "cyberattack."], [48.497, 49.241, "Transportation"], [49.299, 49.786, "Secretary"], [49.902, 50.181, "Sean"], [50.262, 50.634, "Duffy"], [50.727, 51.121, "blamed"], [51.214, 51.632, "old,"], [51.679, 52.248, "overloaded"], [52.282, 52.898, "equipment."], [53.038, 53.2, "And"], [53.258, 53.317, "he"], [53.375, 53.549, "would"], [53.618, 53.839, "not"], [53.909, 54.164, "rule"], [54.21, 54.396, "out"], [54.454, 54.594, "that"], [54.628, 54.686, "it"], [54.721, 54.861, "could"], [54.907, 55.174, "happen"], [55.221, 55.766, "again."], [55.906, 56.289, "Follow"], [56.358, 56.428, "to"], [56.486, 56.66, "stay"], [56.707, 56.8, "up"], [56.846, 56.892, "to"], [56.939, 57.473, "date."]];
const VO_END = 57.522;
// =================== TIMELINE from the voice (g_times.js: SENT / WORDS / VO_END) ===================
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const T = { stop: S[1], twice: S[2], why: S[3], centers: S[4], talk: S[5], down: S[6], ctrl: S[7], froze: S[8], air: S[9], cancel: S[10], hack: S[11], duffy: S[12], again: S[13], cta: S[14] };
const T_CTA = T.cta, ENDC = Math.max(VO_END + 0.3, T_CTA + 2.1), T_END = ENDC + 3.0;
const FOL_MODE = new URLSearchParams(location.search).get('fol') || 'tiktok';
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const vlerp = (a, b, k) => a.clone().lerp(b, k);
// ---- per-set updates ----
function upHall(t, crowd) { drawBoard(t, t < T.cancel - 1 ? 0.5 : -1, 0); if (t >= T.cancel - 1) drawBoard(t, 0, 0) ;
  HL.crowd.forEach((p, i) => { p.outer.visible = crowd; if (crowd && !p.bag && !p.outer.userData.sit) poseIdle(p, t, p.outer.userData.ph); }); }
function upApron(t) { AP.stop.forEach((m, i) => { m.material.color.set(Math.floor(t * 3 + i * 0.2) % 2 ? '#ff2020' : '#ff6a50'); });
  const k = span(t, T.again, T.again + 3.2); AP.takeoff.position.set(-300 + 520 * Math.pow(k, 1.6), 5.3 + Math.max(0, k - 0.55) * 160, 260); AP.takeoff.rotation.z = Math.max(0, k - 0.5) * 0.25; AP.takeoff.visible = t >= T.again - 0.2; }
function upNet(t) { const f0 = T.down; NT.sparks.begin();
  NT.cables.forEach((c, i) => { const tf = f0 + c.fail; const dead = t > tf + 0.25, flick = t > tf && !dead ? (Math.sin(t * 90 + i) > 0 ? 1 : 0.15) : 1;
    c.m.color.set(dead ? '#3a1218' : '#3af0ff'); c.m.opacity = dead ? 0.55 : 0.85 * flick;
    c.pulses.forEach((s, k) => { const u = (t * c.sp + c.ph + k / 3) % 1; s.position.copy(c.cur.getPoint(u)); s.visible = !dead && flick > 0.5; });
    if (t > tf && t < tf + 0.9) for (let k = 0; k < 10; k++) { const a = (t - tf) * 2 + k * 0.7; const p = c.mid.clone().add(V3(Math.sin(k * 3.1) * 6 * (t - tf) * 8, -((t - tf) * 25) + Math.cos(k) * 4, Math.cos(k * 1.7) * 6 * (t - tf) * 8)); NT.sparks.add(p, 6 + 6 * Math.sin(k), 1 - (t - tf) / 0.9); } });
  NT.towers.forEach((w, i) => { const off = t > f0 + 0.6 + (i % 7) * 0.15; w.win.emissiveIntensity = off ? 0.06 : 1.6; w.bc.material.color.set(off ? (Math.floor(t * 2 + i) % 2 ? '#ff2020' : '#400808') : '#ff3030'); });
  NT.sparks.end(); smokeMat.uniforms.uTint.value.set('#ffd080'); }
function upSky(t) { SK.planes.forEach((p, i) => { const k = span(t, T.air - 0.3, T.cancel + 0.2), d = 260 * i; p.position.set(-200 + 380 * k - d * 0.4, 120 - i * 25 - 95 * k * k, -120 - d); p.rotation.set(0, 0, -0.12 * (0.4 + k)); }); }
function upSrv(t) { drawError(t); SV.leds.forEach((l, i) => { const bad = hash(i * 7.1) < 0.45; l.material.color.set(bad ? (Math.floor(t * 4 + i) % 2 ? '#ff2a20' : '#401010') : (hash(i + Math.floor(t * 6)) < 0.5 ? '#30ff60' : '#106020')); });
  SV.warn.intensity = 4 * (0.5 + 0.5 * Math.sin(t * 7)); SV.lamp.intensity = 6 * (Math.sin(t * 37) > 0.93 ? 0.4 : 1);
  SV.smoke.begin(); for (let k = 0; k < 60; k++) { const u = ((t * 0.35) + k / 60) % 1; SV.smoke.add(V3(-3 + Math.sin(k * 2.3) * 0.3 * (1 + u * 2), 4.1 + u * 2.4, -3.8 + Math.cos(k) * 0.3 * u), 0.4 + u * 1.2, 0.35 * (1 - u)); } SV.smoke.end(); smokeMat.uniforms.uTint.value.set('#9aa0a8'); }
// ---- shots: [start, set, update(t), camera(t) → [pos, look, fov]] ----
const camAt = (pos, look, fov = 40) => [pos, look, fov];
const SHOTS = [
  [0, HALL, t => upHall(t, false), t => camAt(V3(lerp(-1.5, 1.0, span(t, 0, T.stop)), 6.6, lerp(34, 30, span(t, 0, T.stop))), V3(0, 7.9, 2), 40)],
  [T.stop, APRON, upApron, t => { const k = span(t, T.stop, T.twice); return camAt(V3(lerp(400, 372, k), 5 + 4 * k, lerp(160, 150, k)), V3(200, 7, 120), 38); }],
  [T.twice, APRON, upApron, t => { const k = span(t, T.twice, T.why), a = -0.5 + 0.35 * k; return camAt(V3(Math.sin(a) * 520, 190 - 30 * k, 60 + Math.cos(a) * 520), V3(60, 0, 80), 40); }],
  [T.why, NET, upNet, t => { const k = span(t, T.why, T.talk), a = 0.2 + 0.5 * k; return camAt(V3(Math.sin(a) * 760, 520 - 120 * k, Math.cos(a) * 760), V3(0, 30, 0), 42); }],
  [T.talk, NET, upNet, t => { const k = span(t, T.talk, T.down), p = NT.towers[0].p; return camAt(p.clone().add(V3(lerp(90, 70, k), 34, lerp(120, 90, k))), p.clone().add(V3(-40, 0, -30)), 44); }],
  [T.down, NET, upNet, t => { const k = span(t, T.down, T.ctrl), a = 0.9 + 0.25 * k; return camAt(V3(Math.sin(a) * 560, 380 - 60 * k, Math.cos(a) * 560), V3(0, 30, 0), 42); }],
  [T.ctrl, NET, upNet, t => { const k = span(t, T.ctrl, T.froze), p = NT.towers[3].p; return camAt(p.clone().add(V3(lerp(30, 22, k), 4 + 2 * k, lerp(34, 26, k))), p.clone().add(V3(0, -2, 0)), 46); }],
  [T.froze, APRON, upApron, t => { const k = span(t, T.froze, T.air); return camAt(V3(lerp(352, 344, k), 3.2, lerp(96, 100, k)), V3(290, 6, 120), 36); }],
  [T.air, SKY, upSky, t => { const p = SK.planes[0].position; return camAt(p.clone().add(V3(-40, 16, 70)), p.clone().add(V3(10, -4, 0)), 42); }],
  [T.cancel, HALL, t => upHall(t, true), t => { const k = span(t, T.cancel, T.hack); return camAt(V3(lerp(-5, 3, k), lerp(5.5, 4.8, k), lerp(34, 30, k)), V3(0, 4.5, 6), 46); }],
  [T.hack, SRV, upSrv, t => { const k = span(t, T.hack, T.duffy); return camAt(V3(lerp(3.2, 2.2, k), 2.5, lerp(5.6, 4.4, k)), V3(-0.8, 1.9, -2.6), 44); }],
  [T.duffy, SRV, upSrv, t => { const k = span(t, T.duffy, T.again); return camAt(V3(lerp(2.9, 2.5, k), 1.85, lerp(2.4, 2.0, k)), V3(1.3, 1.6, -0.7), 40); }],
  [T.again, APRON, upApron, t => { const k = span(t, T.again, T_END); const p = AP.takeoff.position; return camAt(V3(p.x * 0.5 - 60, 10 + p.y * 0.4, 470), p.clone().add(V3(0, 6, 0)), 32); }]];
function shootShot(Sh, t, rt) { const [, set, upd, cam] = Sh; upd(t); const [p, l, f] = cam(t); set.cam.position.copy(p); set.cam.lookAt(l); set.cam.fov = f;
  smokeMat.uniforms.uScale.value = H / (2 * Math.tan(f * Math.PI / 360)); shootTo(rt, set.sc, set.cam); }
// ---- DOM: captions (spoken word highlighted), stamps, clock, timeline, follow call, end card ----
const $ = id => document.getElementById(id);
const SOFT = [[/\bkill(ed|ing|s)?\b/gi, m => m[0] + '*' + m.slice(2)], [/\bdead\b/gi, m => m[0] + '*' + m.slice(2)], [/\bdie(d|s)?\b/gi, m => m[0] + '*' + m.slice(2)]];
const soft = s => SOFT.reduce((a, [re, f]) => a.replace(re, f), s);
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 5; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.2)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.08 ? 'y' : ''}">${soft(w[2])}</span>`).join(' '); }
const BIG = [[wordT('ground', S[1]), S[2] - 0.1, 'GROUND STOP', 'FRIDAY · 3:54 PM ET', 'r'], [wordT('twice', S[2]), S[3] - 0.1, 'ONLY 3RD TIME', 'IN U.S. HISTORY', 'w'],
  [wordT('20', S[4]), S[5] - 0.1, '20 CENTERS', 'AIR TRAFFIC CONTROL', 'b'], [wordT('one', S[5]), S[6] - 0.1, 'ONE NETWORK', 'TELECOM LINKS', 'b'], [wordT('down', S[6]), S[8] - 0.1, 'NETWORK DOWN', 'FRIDAY AFTERNOON', 'r'],
  [wordT('froze', S[8]), S[9] - 0.1, 'NO DEPARTURES', 'NATIONWIDE', 'r'], [wordT('thousands', S[10]), wordT('one', S[10]) - 0.1, 'THOUSANDS', 'OF FLIGHTS CANCELED', 'r'], [wordT('one', S[10]), S[11] - 0.1, '1.5M STUCK', 'PASSENGERS', 'r'],
  [wordT('not', S[11]), S[12] - 0.1, 'NOT A HACK', 'NO SIGN OF A CYBERATTACK', 'w'], [wordT('old', S[12]), S[13] - 0.1, 'OLD, OVERLOADED', 'EQUIPMENT — SEAN DUFFY', 'r'], [wordT('again', S[13]), T_CTA - 0.1, 'AGAIN?', 'HE WON’T RULE IT OUT', 'w']];
function updateDOM(t) {
  $('hook').style.opacity = 1 - smooth(T.stop - 0.4, T.stop, t); $('hook').style.transform = `scale(${pop(t, 0, 0.35).toFixed(3)})`;
  $('head').style.opacity = t < T.stop || t >= ENDC ? 0 : 1;
  const B = BIG.find(x => t >= x[0] && t < x[1]); if (B) { const q = pop(t, B[0], 0.32), f = 1 - smooth(B[1] - 0.2, B[1], t); $('big').innerHTML = `<div class="bv ${B[4]}" style="font-size:${B[2].length > 12 ? 84 : 110}px">${B[2]}</div><div class="bs">${B[3]}</div>`; $('big').style.opacity = f; $('big').style.transform = `rotate(-3deg) scale(${q.toFixed(3)})`; } else $('big').style.opacity = 0;
  // the 3 nationwide ground stops (on "twice before")
  { const on = t >= T.twice && t < T.why; $('tline').style.opacity = on ? smooth(T.twice, T.twice + 0.2, t) * (1 - smooth(T.why - 0.2, T.why, t)) : 0; if (on) $('tline').innerHTML = [['SEP 11, 2001', wordT('9', T.twice)], ['JAN 11, 2023', wordT('January', T.twice)], ['NOV 13, 2026', wordT('January', T.twice) + 0.8]].map(([l, a], i) => `<div class="tp${i === 2 ? ' now' : ''}" style="opacity:${t >= a ? 1 : 0.15};transform:scale(${(t >= a ? pop(t, a, 0.3) : 1).toFixed(3)})">${l}</div>`).join(''); }
  // the clock 3:54 → 8:15 PM while "nothing took off for more than four hours"
  { const on = t >= T.air && t < T.cancel; $('clock').style.opacity = on ? smooth(T.air, T.air + 0.2, t) * (1 - smooth(T.cancel - 0.2, T.cancel, t)) : 0; if (on) { const m = Math.round(lerp(15 * 60 + 54, 20 * 60 + 15, easeOut(span(t, T.air + 0.3, T.cancel - 0.6)))); const h = Math.floor(m / 60), mm = m % 60; $('clock').innerHTML = `<div class="cl">${h - 12}:${String(mm).padStart(2, '0')} PM</div><div class="cs">NOTHING TAKES OFF</div>`; } }
  // the follow call (TikTok-style by default, see parts_plug)
  { const f0 = T_CTA + 0.05, on = t >= f0 && t < ENDC, OUT = 1 - smooth(ENDC - 0.25, ENDC, t); $('fol').style.opacity = on ? smooth(f0, f0 + 0.2, t) * OUT : 0;
    if (on) { const tap = f0 + 1.0, k = pop(t, f0, 0.35), fu = easeOut(span(t, f0 + 0.35, tap - 0.05)), press = t >= tap - 0.05 && t < tap + 0.15 ? 0.82 : 1, done = t >= tap + 0.12;
      $('fol').style.transform = `translateX(-50%) scale(${k.toFixed(3)})`; $('folPlus').style.transform = `translateX(-50%) scale(${(press * (done ? pop(t, tap + 0.12, 0.3) : 1)).toFixed(3)})`; $('folPlus').className = done ? 'ok' : ''; $('folPlus').textContent = done ? '✓' : '+';
      $('folRip').style.opacity = t >= tap ? (1 - span(t, tap, tap + 0.5)).toFixed(2) : 0; $('folRip').style.transform = `translateX(-50%) scale(${(1 + 1.6 * span(t, tap, tap + 0.5)).toFixed(3)})`;
      $('folHand').style.transform = `translate(${(160 * (1 - fu)).toFixed(0)}px, ${(220 * (1 - fu) + (press < 1 ? 10 : 0)).toFixed(0)}px) rotate(-14deg)`; } }
  $('cta').style.opacity = t >= T_CTA - 0.1 && t < ENDC ? smooth(T_CTA - 0.1, T_CTA + 0.2, t) * (1 - smooth(ENDC - 0.25, ENDC, t)) : 0; $('cta').style.transform = `scale(${pop(t, T_CTA - 0.1, 0.35).toFixed(3)})`;
  $('veil').style.opacity = t >= T_CTA - 0.1 ? 0.55 * smooth(T_CTA - 0.1, T_CTA + 0.3, t) : 0;
  $('cap').innerHTML = t < ENDC ? capHTML(t) : ''; $('cap').style.opacity = t >= T_CTA ? 1 - smooth(ENDC - 0.25, ENDC, t) : 1;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.3, t); $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.4, t); $('endS').style.opacity = smooth(ENDC + 0.5, ENDC + 0.9, t); $('endB').style.opacity = smooth(ENDC + 0.1, ENDC + 0.4, t); }
const CUES = [[0.02, 'whoosh', 0.5], [0.5, 'flip', 0.7], [T.stop, 'alarm', 0.5], [wordT('ground', S[1]), 'stamp', 0.7], [T.why - 0.2, 'whoosh', 0.5], [T.centers, 'ding', 0.4], [T.down, 'boom', 0.35], [T.down + 0.1, 'alarm', 0.4],
  [T.froze, 'stamp', 0.6], [T.air - 0.2, 'jet', 0.6], [T.cancel, 'crowd', 0.5], [T.hack - 0.2, 'whoosh', 0.5], [T.hack, 'type', 0.5], [T.again, 'jet', 0.7], ...BIG.map(b => [b[0], 'pop', 0.5]), ...(FOL_MODE === 'tiktok' ? [[T_CTA + 1.05, 'follow', 0.9]] : []), [ENDC, 'whoosh', 0.5]];
window.renderAt = (t) => { let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS !== 'text') { const Sh = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== Sh[1] ? smooth(Sh[0] - 0.001, Sh[0] + 0.25, t) : 1;
    if (t >= ENDC + 0.35) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); }
    else { if (mix < 1) { shootShot(P, t, RTA); shootShot(Sh, t, RTB); } else shootShot(Sh, t, RTA);
      const u = compMat.uniforms; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = t >= T.down && t < T.froze ? 0.35 * Math.max(0, Math.sin((t - T.down) * 4)) : 0; u.uT.value = t; u.uLook.value = 0.35; if (u.uTilt) u.uTilt.value = 0;
      composite(mix < 1 ? mix : 0, 1.0, 1.0); } }
  updateDOM(t); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await Promise.all(['900', '800', '700'].map(w => document.fonts.load(`${w} 60px Inter`)).concat([document.fonts.load('400 60px Anton')]));
  drawBoard(0, -1); drawError(0); for (const Sh of SHOTS) shootShot(Sh, Sh[0] + 0.3, RTA); window.renderAt(0); return true; })();
