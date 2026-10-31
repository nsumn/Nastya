import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Water } from "three/addons/objects/Water.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

// "만약 내 키가 1.5초마다 2배가 된다면?" — Korean channel short (~33 s), ifcam-like look: clean semi-real Seoul, soft daylight, haze, serif Korean captions.
// Numbers: tools/growkr_math.py (start 1.7 m, x2 every 1.5 s from t=2, 18 doublings → 446 km, ISS ~420 km).
const T0 = 2.0, DT = 1.5, NDBL = 18, K_END = 33.0;
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
// =================== REAL KOREAN PEOPLE: MakeHuman (CC0) characters generated by tools/mh_people.py (Blender + MPFB2): Asian phenotype,
// young_asian skins, MakeHuman hair/clothes/shoes, 'game_engine' skeleton with fingers (UE-style bone names). Assets: assets/growkr/mh (git-ignored).
const MH = 'assets/growkr/mh/';
const gltfL = new GLTFLoader();
const loadG = u => new Promise((ok, bad) => gltfL.load(MH + u, ok, undefined, bad));
const texL = new THREE.TextureLoader();
const loadT = (u) => new Promise(ok => texL.load(MH + u, t => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; ok(t); }));
const MHG = {}; for (const n of ['hero', 'girl', 'man2', 'woman2']) MHG[n] = await loadG(n + '.glb').catch(() => null);
const TEE = { mustard: await loadT('tee_mustard.png'), cream: await loadT('tee_f_cream.png') };
// makeHuman(name, { hairCol, tee }) → { outer, bones, rest }
function makeHuman(name, o = {}) {
  o = { hairCol: '#2a2522', ...o };
  const root = SkeletonUtils.clone(MHG[name].scene); const bones = {};
  root.traverse(n => {
    if (n.isBone) bones[n.name] = n;
    if (!n.isMesh) return;
    const m = n.material = n.material.clone(); m.transparent = false; m.depthWrite = true; m.clearcoat = 0; m.alphaTest = 0;
    const nm = (n.name + ' ' + m.name).toLowerCase();
    if (/eyebrow|eyelash/.test(nm)) { m.alphaTest = 0.4; m.side = THREE.DoubleSide; m.color.set('#3a302a'); }
    else if (/short0|bob0|long0|ponytail|braid|afro/.test(nm)) { m.alphaTest = 0.42; m.side = THREE.DoubleSide; m.color.set(o.hairCol); m.roughness = 0.55; }
    else if (/high-poly|low-poly|eye/.test(nm)) { m.alphaTest = 0.5; m.roughness = 0.2; m.color.set('#8c847e'); }
    else if (/body/.test(nm)) { m.roughness = 0.62; }
    else m.roughness = Math.max(m.roughness, 0.8);
    if (o.tee && /male_casualsuit06|female_casualsuit01/.test(nm)) { m.map = TEE[o.tee]; m.needsUpdate = true; }
    n.castShadow = n.receiveShadow = true; n.frustumCulled = false; });
  const outer = new THREE.Group(); outer.add(root);
  const rest = {}; for (const k in bones) rest[k] = bones[k].quaternion.clone();
  return { outer, root, bones, rest, name };
}
// ---- posing: rotations about axes in the character's OWN frame (facing +Z, its left = +X), applied on top of the rest (A-pose) ----
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function poseRest(P) { for (const n in P.bones) P.bones[n].quaternion.copy(P.rest[n]); P.outer.updateMatrixWorld(true); }
function rotW(P, name, axis, ang) { const b = P.bones[name]; if (!b) return; b.parent.getWorldQuaternion(_pq); const bw = _pq.clone().multiply(b.quaternion); const la = axis.clone().normalize().applyQuaternion(bw.clone().invert());
  b.quaternion.multiply(_q.setFromAxisAngle(la, ang)); b.updateMatrixWorld(true); }
function rotL(P, name, ax, ang) { const a = V3(...ax).applyQuaternion(P.outer.getWorldQuaternion(new THREE.Quaternion())); rotW(P, name, a, ang); }
// arms from the A-pose down to the sides
function armsDown(P, k = 1) { rotL(P, 'upperarm_l', [0, 0, 1], -0.62 * k); rotL(P, 'upperarm_r', [0, 0, 1], 0.62 * k); }
// curl the four fingers (0 = open … 1 = fist): each joint turns about the knuckle line (pinky → index), so it works in any arm pose
function fingers(P, side, curl = 0.6, sgn = 1) { P.outer.updateMatrixWorld(true);
  const ax = P.bones['index_01_' + side].getWorldPosition(V3()).sub(P.bones['pinky_01_' + side].getWorldPosition(V3())).normalize().multiplyScalar(side === 'l' ? sgn : -sgn);
  for (const f of ['index', 'middle', 'ring', 'pinky']) for (const [j, k] of [['01', 0.8], ['02', 1.1], ['03', 0.8]]) rotW(P, `${f}_${j}_${side}`, ax, curl * k);
  rotW(P, 'thumb_02_' + side, ax, curl * 0.4); }
function place(P, x, z, ry, dy = 0) { P.outer.position.set(x, dy, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
// sitting on the ground, legs forward (knees a little up); returns how much to lower the body so the hips touch the mat
function sitGround(P, knee = 0.35) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.45 + knee * 0.5); rotL(P, 'calf_' + s, [1, 0, 0], knee); rotL(P, 'foot_' + s, [1, 0, 0], -0.3); }
  rotL(P, 'thigh_l', [0, 0, 1], 0.12); rotL(P, 'thigh_r', [0, 0, 1], -0.12); rotL(P, 'spine_01', [1, 0, 0], 0.12); }
function holdBowl(P, lift = 0) { armsDown(P, 1.0); for (const [s, k] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.45 - lift); rotL(P, 'upperarm_' + s, [0, 0, 1], 0.12 * k);
    rotL(P, 'lowerarm_' + s, [1, 0, 0], -1.05); rotL(P, 'lowerarm_' + s, [0, 1, 0], -0.55 * k); rotL(P, 'hand_' + s, [0, 0, 1], -0.6 * k); fingers(P, s, 0.55); } }
function settle(P, hipY = 0.1) { P.outer.updateMatrixWorld(true); const py = boneW(P, 'pelvis').y; P.outer.position.y += hipY - py; P.outer.updateMatrixWorld(true); }
const POSE = P => { sitGround(P); holdBowl(P); };
// pose lab: ?v=0 front, ?v=1 side, ?v=2 top — hero only, with the sit + hold pose from k_main
const labS = new THREE.Scene(); labS.background = new THREE.Color('#a9bfd0'); labS.environment = new THREE.PMREMGenerator(renderer).fromScene(new (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment(), 0.04).texture; labS.environmentIntensity = 0.6;
const ls = new THREE.DirectionalLight(0xfff1dc, 2.6); ls.position.set(2, 4, 4); labS.add(ls);
const flo = mesh(new THREE.PlaneGeometry(20, 20), M('#cfc8bb')); flo.rotation.x = -Math.PI / 2; labS.add(flo);
for (let i = -5; i <= 5; i++) { const l = mesh(new THREE.BoxGeometry(0.01, 0.002, 10), M('#888')); l.position.set(i * 0.2, 0.001, 0); labS.add(l); const l2 = mesh(new THREE.BoxGeometry(10, 0.002, 0.01), M('#888')); l2.position.set(0, 0.001, i * 0.2); labS.add(l2); }
const P = makeHuman('hero', { tee: 'mustard' }); labS.add(P.outer);
const VIEW = +(new URLSearchParams(location.search).get('v') || 0);
const labCam = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);
window.renderAt = (t) => { poseRest(P); place(P, 0, 0, 0); POSE(P); settle(P, 0.1);
  if (VIEW === 1) { labCam.position.set(3.2, 0.7, 0.3); labCam.lookAt(0, 0.6, 0.3); } else if (VIEW === 2) { labCam.position.set(0, 4.0, 0.31); labCam.lookAt(0, 0, 0.3); } else { labCam.position.set(0, 0.7, 3.2); labCam.lookAt(0, 0.6, 0); }
  shootTo(RTA, labS, labCam); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { window.renderAt(0); return true; })();
