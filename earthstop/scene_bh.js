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
const TEE = { mustard: await loadT('tee_mustard.png'), cream: await loadT('tee_f_cream.png'), white: await loadT('tee_white.png'), navy: await loadT('tee_navy.png'), pink: await loadT('tee_f_pink.png') };
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
// curl the fingers (0 = open … 1 = fist): every joint bends about its OWN local X axis (verified in the finger lab, both hands)
const _qx = new THREE.Quaternion(), _X = new THREE.Vector3(1, 0, 0);
function fingers(P, side, curl = 0.6, thumb = 0.3, spread = 1) {
  ['index', 'middle', 'ring', 'pinky'].forEach((f, i) => [['01', 0.85], ['02', 1.15], ['03', 0.9]].forEach(([j, k]) => { const b = P.bones[`${f}_${j}_${side}`]; if (b) b.quaternion.multiply(_qx.setFromAxisAngle(_X, curl * k * (1 + 0.08 * i * spread))); }));
  for (const [j, k] of [['02', 0.8], ['03', 1.0]]) { const b = P.bones[`thumb_${j}_${side}`]; if (b) b.quaternion.multiply(_qx.setFromAxisAngle(_X, thumb * k)); }
  P.outer.updateMatrixWorld(true); }
// ---- facial expressions: ARKit face units (MakeHuman faceunits01, CC0) as morph targets ----
const LR = (o) => { const r = {}; for (const [k, v] of Object.entries(o)) { if (k.endsWith('_')) { r[k.slice(0, -1) + 'Left'] = v; r[k.slice(0, -1) + 'Right'] = v; } else r[k] = v; } return r; };
const EXPR = {   // pushed past 1.0 on purpose: the autogenerated units are subtle and a face is small on a phone
  neutral:   {},
  happy:     LR({ mouthSmile_: 1.3, cheekSquint_: 0.8, eyeSquint_: 0.35, mouthDimple_: 0.5, browInnerUp: 0.15 }),
  laugh:     LR({ mouthSmile_: 1.5, jawOpen: 0.5, cheekSquint_: 1.0, eyeSquint_: 0.7, mouthUpperUp_: 0.6, browInnerUp: 0.2 }),
  surprised: LR({ jawOpen: 0.6, browInnerUp: 1.4, browOuterUp_: 1.3, eyeWide_: 1.3, mouthFunnel: 0.3 }),
  shocked:   LR({ jawOpen: 0.9, browInnerUp: 1.5, browOuterUp_: 1.4, eyeWide_: 1.5, mouthStretch_: 0.6 }),
  scared:    LR({ browInnerUp: 1.5, browOuterUp_: 0.5, eyeWide_: 1.4, mouthStretch_: 1.2, jawOpen: 0.3, mouthFrown_: 0.5 }),
  worried:   LR({ browInnerUp: 1.4, mouthFrown_: 1.0, mouthPress_: 0.5, eyeSquint_: 0.2, mouthRollLower: 0.2 }),
  wow:       LR({ jawOpen: 0.75, mouthFunnel: 0.7, mouthPucker: 0.3, browInnerUp: 1.0, browOuterUp_: 1.0, eyeWide_: 0.9 }),
  proud:     LR({ mouthSmileLeft: 1.3, mouthSmileRight: 0.5, browOuterUpLeft: 0.9, browDownRight: 0.3, eyeSquint_: 0.45, cheekSquintLeft: 0.7 }),
  chewing:   LR({ mouthSmile_: 0.3, mouthClose: 0.3, cheekPuff: 0.25 }),
  dizzy:     LR({ eyeBlink_: 0.55, browInnerUp: 0.9, jawOpen: 0.3, mouthLeft: 0.6, eyeLookOutLeft: 0.5, eyeLookInRight: 0.5 }),
};
// face(P, name, t, k): blend toward an expression (k = 0…1), with natural blinks; chewing adds a jaw cycle
function face(P, name, t = 0, k = 1, name2 = null, mix = 0) {
  if (!P.morphs) { P.morphs = []; P.root.traverse(n => { if (n.isMesh && n.morphTargetDictionary) P.morphs.push(n); }); }
  const a = EXPR[name] || {}, b = name2 ? EXPR[name2] || {} : {}, w = {};
  for (const [u, v] of Object.entries(a)) w[u] = (w[u] || 0) + v * k * (1 - mix);
  for (const [u, v] of Object.entries(b)) w[u] = (w[u] || 0) + v * k * mix;
  if (name === 'chewing') w.jawOpen = (w.jawOpen || 0) + 0.12 * (0.5 + 0.5 * Math.sin(t * 9));
  const ph = (t + (P.blinkOff || (P.blinkOff = hash(P.name.length * 7.1) * 3))) % 3.4, bl = ph < 0.16 ? Math.sin(ph / 0.16 * Math.PI) : 0;
  w.eyeBlinkLeft = Math.max(w.eyeBlinkLeft || 0, bl); w.eyeBlinkRight = Math.max(w.eyeBlinkRight || 0, bl);
  for (const m of P.morphs) { const d = m.morphTargetDictionary, inf = m.morphTargetInfluences; inf.fill(0); for (const [u, v] of Object.entries(w)) if (u in d) inf[d[u]] = clamp(v, 0, 1.6); }
}
// =================== SEOUL (meters; camera side = +z = Banpo Hangang Park on the south bank, looking north across the Han River) ===================
// River z -12 … -1000 (≈1 km wide), Banpo Bridge on the right running north, the north bank: Gangbyeon expressway + white apartment slabs,
// Namsan with N Seoul Tower behind them; 63 Building far left (west), Lotte World Tower far right (stylised positions so all three read in one frame).
const kw = new THREE.Scene();
const kCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 60000);
kw.add(kCam);
const SKY_TOP = new THREE.Color('#4f86c9'), SKY_HOR = new THREE.Color('#d6e4ee');
kw.fog = new THREE.Fog('#c9d9e6', 900, 16000);
// ---- sky dome: gradient + soft cumulus (fbm), sun glow ----
const SUN_DIR = V3(-0.45, 0.42, 0.79).normalize();   // late-afternoon sun from the south-west = behind-left of the camera
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: SKY_TOP }, uHor: { value: SKY_HOR }, uSun: { value: SUN_DIR }, uSpace: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform vec3 uTop, uHor, uSun; uniform float uSpace; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0);
      vec3 c=mix(uHor, uTop, pow(y,0.55));
      vec2 uv=d.xz/(d.y+0.12)*1.6; float cl=fbm(uv+vec2(3.1,1.7)); cl=smoothstep(0.52,0.78,cl)*smoothstep(0.02,0.18,d.y)*(1.0-smoothstep(0.55,0.95,d.y));
      float lit=0.82+0.18*fbm(uv*1.7+vec2(0.4,0.0)); c=mix(c, vec3(1.0,0.99,0.97)*lit, cl*0.85);
      float s=max(dot(d,uSun),0.0); c+=vec3(1.0,0.92,0.78)*(pow(s,64.0)*0.6+pow(s,6.0)*0.10);
      if(d.y<0.0) c=mix(uHor, uHor*0.92, smoothstep(0.0,-0.2,d.y));
      // space (high shots): fade to black with stars
      float st=step(0.9985,h(floor(d.xz*900.0/(abs(d.y)+0.6))))*uSpace; c=mix(c, vec3(0.01,0.012,0.03)+st, uSpace);
      gl_FragColor=vec4(c,1.0); }` });
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(50000, 48, 24), skyMat); skyDome.frustumCulled = false; skyDome.renderOrder = -10; kw.add(skyDome);
// image-based light from the sky (reflections on water/glass + soft ambient)
const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
kw.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 1, 400).texture; kw.environmentIntensity = 0.55;
const kSun = new THREE.DirectionalLight(0xfff1dc, 3.0); kSun.position.copy(SUN_DIR).multiplyScalar(60); kSun.castShadow = true; kSun.shadow.mapSize.set(4096, 4096);
Object.assign(kSun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 160 }); kSun.shadow.bias = -0.0004; kSun.shadow.normalBias = 0.03; kSun.shadow.radius = 4;
kw.add(kSun, kSun.target);
kw.add(new THREE.HemisphereLight(0xcfe2ff, 0x6a7a52, 0.55));
// ---- textures ----
const grassTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6f9a4a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 26000, ['#5e8a3c', '#7eaa54', '#86b25c', '#64903f', '#729e48', '#8fb862'], 3); }, [1, 1]);
const paveTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, ['#bdb8ae', '#d3cec4', '#b4afa5'], 2); g.strokeStyle = 'rgba(90,85,78,.35)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, [1, 1]);
function rep(t, x, y) { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; }
// apartment facade: one unit = balcony glass band per floor (repeat = units × floors)
const aptFront = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h); g.fillStyle = '#6f8698'; g.fillRect(8, 14, w - 16, 34); g.fillStyle = '#9fb3c2'; g.fillRect(8, 14, w - 16, 6);
  g.fillStyle = '#d9d6cf'; g.fillRect(w / 2 - 2, 14, 4, 34); g.fillStyle = '#f6f5f1'; g.fillRect(0, 48, w, 5); }, [1, 1]);
const aptSide = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#e4e1da'; g.fillRect(0, 0, w, h); g.fillStyle = '#7b8a96'; g.fillRect(26, 22, 12, 22); }, [1, 1]);
function aptNumber(num) { return canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#e8e5de'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d8a95'; for (let y = 140; y < h; y += 26) g.fillRect(112, y, 32, 14);
  g.fillStyle = '#2f5d8c'; g.font = 'bold 74px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.fillText(num, w / 2, 96); g.fillStyle = '#3f8f6a'; g.fillRect(40, 112, w - 80, 8); }); }
const officeTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#7f95a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#a9bccb'; g.fillRect(3, 4, w - 6, 26); g.fillStyle = '#5f7488'; g.fillRect(0, 30, w, 4); }, [1, 1]);
// ---- ground: park (z > -12), promenade, stone revetment; the river; far bank ----
const parkMat = new THREE.MeshStandardMaterial({ map: rep(grassTex, 2000, 200), roughness: 1 });
const park = mesh(new THREE.PlaneGeometry(6000, 600), parkMat, false, true); park.rotation.x = -Math.PI / 2; park.position.set(0, 0, 288); kw.add(park);
const pave = mesh(new THREE.PlaneGeometry(6000, 5), new THREE.MeshStandardMaterial({ map: rep(paveTex, 1500, 1.25), roughness: 0.95 }), false, true); pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0.02, -8.5); kw.add(pave);
const revet = mesh(new THREE.BoxGeometry(6000, 1.6, 2.2), M('#a7a196', { roughness: 1 }), false, true); revet.position.set(0, -0.6, -11.6); revet.rotation.x = 0.5; kw.add(revet);
// river: planar-reflecting water (three.js Water with a canvas normal map)
const waterNormals = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = x / w * Math.PI * 2, b = y / h * Math.PI * 2;
  const nx = 0.5 * Math.sin(a * 3 + Math.sin(b * 2) * 1.5) + 0.3 * Math.sin(a * 7 + b * 5) + 0.2 * Math.sin(a * 13 - b * 11), ny = 0.5 * Math.cos(b * 4 + Math.sin(a * 3)) + 0.3 * Math.sin(b * 9 - a * 4) + 0.2 * Math.cos(b * 15 + a * 6);
  const i = (y * w + x) * 4; im.data[i] = 128 + nx * 60; im.data[i + 1] = 128 + ny * 60; im.data[i + 2] = 240; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
waterNormals.colorSpace = THREE.NoColorSpace; waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const river = new Water(new THREE.PlaneGeometry(14000, 1000), { textureWidth: 1024, textureHeight: 1024, waterNormals, sunDirection: SUN_DIR.clone(), sunColor: 0xfff1dc, waterColor: 0x1d4a66, distortionScale: 2.2, fog: true, alpha: 1 });
river.rotation.x = -Math.PI / 2; river.position.set(0, -1.0, -505); kw.add(river);
river.material.uniforms.size.value = 6;
// north bank: embankment + expressway, then the apartment district
const nb = new THREE.Group(); nb.position.z = -1000; kw.add(nb);
bx(14000, 8, 30, '#b7b1a6', 0, 3, -15, nb); bx(14000, 1.2, 24, '#6c6e72', 0, 7.6, -16, nb); bx(14000, 2, 40, '#7aa05a', 0, 0, -50, nb);
const city = new THREE.Group(); nb.add(city);
const aptFrontMats = {}, aptNums = {};
function apartment(x, z, wUnits, floors, ry, num) {
  const w = wUnits * 9, h = floors * 2.9, d = 14, k = wUnits + '_' + floors;
  if (!aptFrontMats[k]) aptFrontMats[k] = new THREE.MeshStandardMaterial({ map: rep(aptFront, wUnits, floors), roughness: 0.75 });
  if (!aptNums[num]) aptNums[num] = new THREE.MeshStandardMaterial({ map: aptNumber(num), roughness: 0.85 });
  const side = aptNums[num], roof = M('#9a9892'), back = M('#d8d5ce', { roughness: 0.9 });
  const b = mesh(BOX, [side, side, roof, roof, aptFrontMats[k], back]); b.scale.set(w, h, d); b.position.set(x, h / 2 + 2, z); b.rotation.y = ry; city.add(b);
  const top = mesh(BOX, M('#cfccc4')); top.scale.set(w * 0.25, 5, d * 0.8); top.position.set(x, h + 4.5, z); top.rotation.y = ry; city.add(top);   // rooftop core
  return b; }
{ let n = 101; seed = 9101;
  for (let row = 0; row < 7; row++) for (let i = 0; i < 26; i++) {
    const x = -3600 + i * 280 + R(-60, 60) + (row % 2) * 140, z = -110 - row * 170 + R(-30, 30);
    if (Math.abs(x - 330) < 260 && row > 3) continue;     // leave Namsan's foot open
    apartment(x, z, Math.round(R(4, 8)), Math.round(R(15, 30) - row), R(-0.08, 0.08), String(n)); n = n >= 115 ? 101 : n + 1; } }
// a few office towers in the gaps (glassy)
for (let i = 0; i < 14; i++) { const h = R(60, 140), w = R(25, 40); const m = new THREE.MeshStandardMaterial({ map: rep(officeTex, Math.round(w / 4), Math.round(h / 4)), roughness: 0.35, metalness: 0.3 });
  const b = mesh(BOX, m); b.scale.set(w, h, w); b.position.set(R(-3000, 3000), h / 2 + 2, R(-1300, -900)); city.add(b); }
// Namsan (262 m) + N Seoul Tower (236.7 m) — behind the apartments
const namsan = new THREE.Group(); namsan.position.set(330, 0, -3400); kw.add(namsan);
{ const g = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2); const P = g.attributes.position, col = [];
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const r = 1 + 0.06 * Math.sin(x * 9 + z * 7) + 0.04 * Math.sin(x * 23 - z * 17); P.setXYZ(i, x * r, y * (1 + 0.1 * Math.sin(z * 5)), z * r);
    const c = new THREE.Color().setHSL(0.26 + 0.05 * hash(i), 0.42, 0.14 + 0.07 * hash(i * 3.3)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const hill = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), false, false); hill.scale.set(900, 262, 700); namsan.add(hill);
  { const tg = new THREE.IcosahedronGeometry(1, 1), n = 2600, im = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), n), mm = new THREE.Matrix4(), cc = new THREE.Color();
    for (let i = 0; i < n; i++) { const a = hash(i * 1.7) * Math.PI * 2, r = Math.sqrt(hash(i * 3.1 + 2)) * 0.97, x = Math.cos(a) * r, z = Math.sin(a) * r, y = Math.sqrt(Math.max(0, 1 - r * r)), sc = 14 + 10 * hash(i * 5.3);
      mm.compose(V3(x * 900, y * 262 - 4, z * 700), new THREE.Quaternion(), V3(sc, sc * 0.9, sc)); im.setMatrixAt(i, mm); im.setColorAt(i, cc.setHSL(0.25 + 0.06 * hash(i * 7.7), 0.45, 0.13 + 0.09 * hash(i * 9.1))); }
    namsan.add(im); }
  const tw = new THREE.Group(); tw.position.y = 255; namsan.add(tw); const wht = M('#f1f1ee', { roughness: 0.5 });
  const shaft = mesh(new THREE.CylinderGeometry(4.2, 6.5, 135, 24), wht); shaft.position.y = 67; tw.add(shaft);
  for (const [y, r, hh] of [[132, 15, 9], [143, 14, 8], [151, 11, 6]]) { const p = mesh(new THREE.CylinderGeometry(r, r * 0.92, hh, 32), y === 143 ? new THREE.MeshStandardMaterial({ color: '#7b8fa3', roughness: 0.2, metalness: 0.4 }) : wht); p.position.y = y; tw.add(p); }
  const ant = mesh(new THREE.CylinderGeometry(1.2, 2.6, 82, 12), M('#e04a3a', { roughness: 0.6 })); ant.position.y = 196; tw.add(ant);
  for (let i = 0; i < 4; i++) { const b = mesh(new THREE.CylinderGeometry(2.7, 2.7, 4, 12), wht); b.position.y = 165 + i * 18; tw.add(b); } }
// 63 Building (249 m): golden glass, stepped profile — far left (Yeouido, west)
const B63 = V3(-300, 0, 40), LOTTE = V3(520, 0, 90);   // stylised: close enough to stand next to the giant in one frame
const b63 = new THREE.Group(); b63.position.copy(B63); kw.add(b63);
{ const gold = new THREE.MeshStandardMaterial({ color: '#e0b052', roughness: 0.18, metalness: 0.92, envMapIntensity: 1.4 });
  const prof = new THREE.Shape(); prof.moveTo(-36, 0); prof.lineTo(36, 0); prof.lineTo(36, 200); prof.lineTo(20, 235); prof.lineTo(-10, 249); prof.lineTo(-36, 249); prof.lineTo(-36, 0);
  const g = new THREE.ExtrudeGeometry(prof, { depth: 34, bevelEnabled: false }); g.translate(0, 0, -17); const m = mesh(g, gold, false, false); b63.add(m);
  const ribs = M('#b78a3a', { metalness: 0.6, roughness: 0.4 }); for (let y = 6; y < 245; y += 7.6) bx(73, 0.5, 34.6, ribs, 0, y, 0, b63).visible = y < 200; }
// Lotte World Tower (555 m): slender tapered glass tower with the split crown — far right
const lotte = new THREE.Group(); lotte.position.copy(LOTTE); kw.add(lotte);
{ const glass = new THREE.MeshStandardMaterial({ color: '#c9d6e2', roughness: 0.16, metalness: 0.75, envMapIntensity: 1.3 });
  const pts = []; for (let i = 0; i <= 24; i++) { const y = i / 24; pts.push(new THREE.Vector2(36 * (1 - 0.82 * Math.pow(y, 1.6)), y * 555)); }
  const g = new THREE.LatheGeometry(pts, 4); g.rotateY(Math.PI / 4); const m = mesh(g, glass, false, false); m.scale.set(1, 1, 0.92); lotte.add(m);
  const seam = M('#e9eef3', { roughness: 0.3, metalness: 0.3 }); for (const s of [-1, 1]) { const l = mesh(new THREE.BoxGeometry(1.2, 555, 1.2), seam); l.position.set(0, 277, s * 0.5); lotte.add(l); } }
// Banpo Bridge (double deck; Jamsu Bridge below), running north on the right of the frame
const bridge = new THREE.Group(); bridge.position.set(160, 0, 0); kw.add(bridge);
{ const deck = M('#b9b6ae', { roughness: 0.8 }), dark = M('#8e8b84'), rail = M('#4f6f8a', { roughness: 0.5 });
  bx(28, 3.2, 1060, deck, 0, 17, -500, bridge); bx(28.4, 0.8, 1060, rail, 0, 19, -500, bridge);
  bx(10, 1.2, 1000, dark, 0, 1.2, -505, bridge);    // Jamsu (low) bridge
  for (let z = -20; z > -1000; z -= 45) { bx(5, 16, 5, deck, -8, 8, z, bridge); bx(5, 16, 5, deck, 8, 8, z, bridge); bx(26, 2.2, 6, deck, 0, 14.6, z, bridge); }
  bx(28, 3.2, 120, deck, 0, 17, 60, bridge); bx(4, 17, 4, deck, 0, 8.5, 20, bridge); }
// ---- the park: trees, lamps, mats with people ----
const treeGeo = (() => { const parts = []; const tr = new THREE.CylinderGeometry(0.14, 0.22, 3.0, 7); tr.translate(0, 1.5, 0); parts.push([tr, 0]);
  for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(1, 2); const P = g.attributes.position; for (let j = 0; j < P.count; j++) { const v = V3(P.getX(j), P.getY(j), P.getZ(j)); const k = 1 + 0.12 * Math.sin(v.x * 5 + i) * Math.cos(v.z * 4 + v.y * 3); P.setXYZ(j, v.x * k, v.y * k, v.z * k); }
    const a = i / 6 * Math.PI * 2, r = i ? 0.9 : 0; g.scale(1.3, 1.1, 1.3); g.translate(Math.cos(a) * r, 3.7 + (i ? hash(i) * 0.8 : 1.0), Math.sin(a) * r); parts.push([g, 1]); }
  return parts; })();
const treeTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4f7f35'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#3f6e2a', '#5f9440', '#6ea64a', '#45772f', '#7cb256'], 5); });
const trunkM = M('#6a5442', { roughness: 0.95 }), leafM = new THREE.MeshStandardMaterial({ map: treeTex, roughness: 0.9, color: '#e8f0dc' });
function tree(x, z, s) { const g = grp(x, 0, z, hash(x * 1.3 + z) * 6, kw); g.scale.setScalar(s); for (const [geo, k] of treeGeo) g.add(mesh(geo, k ? leafM : trunkM)); return g; }
seed = 515; for (let i = 0; i < 70; i++) { const x = -260 + i * 7.5 + R(-2, 2), z = R(7, 12) + (i % 3) * 7; if (Math.abs(x - 160) < 22 || Math.abs(x) < 45) continue; tree(x, z, R(1.0, 1.5)); }
for (let i = 0; i < 30; i++) { const x = -300 + i * 20 + R(-4, 4); if (Math.abs(x - 160) < 20) continue; const l = grp(x, 0, -5.6, 0, kw); bx(0.09, 4.2, 0.09, '#3c4248', 0, 2.1, 0, l); bx(0.5, 0.12, 0.22, '#3c4248', 0.2, 4.2, 0, l); }
const MATS = ['#3b78c4', '#e9c23c', '#e46a5a', '#5aa070', '#f0f0ec'];
const matTex = (c) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 8; i += 2) { g.fillRect(i * 16, 0, 16, h); g.fillRect(0, i * 16, w, 16); } });
function picnicMat(x, z, ry, c) { const m = mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: matTex(c), roughness: 0.9 }), false, true); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.015, z); kw.add(m); return m; }
// ramen cup (convenience-store style: white cup, red band) + chopsticks
function ramenCup() { const g = new THREE.Group(); const cup = mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.1, 24, 1, true), new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#f7f5f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8282a'; c.fillRect(0, 18, w, 26); c.fillStyle = '#fff'; c.font = 'bold 20px "Noto Sans KR"'; for (let x = 10; x < w; x += 128) c.fillText('라면', x, 38); }), side: THREE.DoubleSide, roughness: 0.6 }));
  g.add(cup); const soup = mesh(new THREE.CircleGeometry(0.052, 24), M('#c8642a', { roughness: 0.3 })); soup.rotation.x = -Math.PI / 2; soup.position.y = 0.035; g.add(soup);
  for (const s of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 5), M('#d8c08a')); c.position.set(0.02 * s, 0.08, 0.01); c.rotation.z = 0.25; g.add(c); }
  return g; }
// ---- wide ground for the high shots: a procedural city/park patchwork (80 km), under the detailed park/river/bank ----
const cityTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#9a9a92'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const x = hash(i * 1.1) * w, y = hash(i * 2.3) * h, s = 6 + hash(i * 3.7) * 26; g.fillStyle = ['#d9d6cf', '#c4c2bc', '#b8b6ae', '#e6e3dc', '#8f9a86', '#6f8a5a'][(hash(i * 5.9) * 6) | 0]; g.fillRect(x, y, s, s * (0.6 + hash(i * 7.3))); }
  g.strokeStyle = 'rgba(70,70,74,.55)'; g.lineWidth = 3; for (let k = 0; k <= w; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); } });
const bigGround = mesh(new THREE.PlaneGeometry(80000, 80000), new THREE.MeshStandardMaterial({ map: rep(cityTex, 110, 110), roughness: 1 }), false, true);
bigGround.rotation.x = -Math.PI / 2; bigGround.position.y = -3; kw.add(bigGround);
river.geometry.dispose(); river.geometry = new THREE.PlaneGeometry(60000, 1000);
// ---- cloud deck (2–3 km) for the 3–7 km shots: soft sprites ----
const puffTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(250,252,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const cloudDeck = new THREE.Group(); kw.add(cloudDeck);
for (let i = 0; i < 380; i++) { const a = hash(i * 1.9) * Math.PI * 2, r = 1200 + Math.sqrt(hash(i * 4.1)) * 16000, s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, fog: true }));
  const sc = 900 + hash(i * 6.3) * 1600; s.scale.set(sc * 1.6, sc, 1); s.position.set(Math.cos(a) * r, 2300 + hash(i * 8.8) * 700, Math.sin(a) * r); cloudDeck.add(s); }
cloudDeck.visible = false;
// =================== SPACE (units = km): the real Earth (Solar System Scope 8k maps, CC BY 4.0) with Seoul at the origin, +Y up, north = -Z.
// Used once the hero is taller than ~10 km: clouds, airliner contrail, the Karman line, the ISS (~420 km).
const sp = new THREE.Scene();
const spCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 200000);
const RE = 6371, SEOUL = { lat: 37.5665, lon: 126.978 };
const ET = 'assets/growkr/earth/';
const etex = (u, srgb = true) => new Promise(ok => texL.load(ET + u, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; ok(t); }));
const [dayMap, cloudMap, nightMap] = await Promise.all([etex('8k_earth_daymap.jpg'), etex('8k_earth_clouds.jpg', false), etex('8k_earth_nightmap.jpg')]);
const earth = new THREE.Group(); earth.position.set(0, -RE, 0); sp.add(earth);
const globe = new THREE.Mesh(new THREE.SphereGeometry(RE, 256, 128), new THREE.MeshStandardMaterial({ map: dayMap, roughness: 0.85, metalness: 0, emissiveMap: nightMap, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.0 }));
earth.add(globe);
const clouds = new THREE.Mesh(new THREE.SphereGeometry(RE + 6, 192, 96), new THREE.MeshStandardMaterial({ color: '#ffffff', alphaMap: cloudMap, transparent: true, depthWrite: false, roughness: 1, opacity: 0.85 }));
earth.add(clouds);
// thin blue atmosphere: back-face fresnel shell (rim glow) + front haze
const atmo = new THREE.Mesh(new THREE.SphereGeometry(RE + 90, 128, 64), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uSun: { value: V3(-0.45, 0.42, 0.79).normalize() } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); float r=1.0-abs(dot(v,vN)); float a=pow(r,5.0)*1.6; float lit=0.35+0.65*max(dot(-vN,uSun)*0.5+0.5,0.0);
    gl_FragColor=vec4(vec3(0.35,0.6,1.0)*a*lit, a); }` }));
earth.add(atmo);
// rotate the globe so Seoul is straight up (+Y) and north points to -Z
{ const u = (SEOUL.lon + 180) / 360, th = (90 - SEOUL.lat) * Math.PI / 180;
  const d = V3(-Math.cos(2 * Math.PI * u) * Math.sin(th), Math.cos(th), Math.sin(2 * Math.PI * u) * Math.sin(th)).normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(d, V3(0, 1, 0));
  const np = V3(0, 1, 0).applyQuaternion(q1);                                     // the north pole after the first turn
  const nt = np.clone().sub(V3(0, 1, 0).multiplyScalar(np.dot(V3(0, 1, 0)))).normalize();   // its direction along the ground at Seoul
  const q2 = new THREE.Quaternion().setFromUnitVectors(nt, V3(0, 0, -1));
  globe.quaternion.copy(q2.multiply(q1)); clouds.quaternion.copy(globe.quaternion); }
const spSun = new THREE.DirectionalLight(0xfff4e6, 3.2); spSun.position.copy(V3(-0.45, 0.42, 0.79).multiplyScalar(1000)); sp.add(spSun, spSun.target);
sp.add(new THREE.HemisphereLight(0x9cc0ff, 0x203040, 0.35));
sp.environment = kw.environment; sp.environmentIntensity = 0.45;
// stars
{ const n = 6000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i * 1.3) * Math.PI * 2, z = hash(i * 2.7) * 2 - 1, r = Math.sqrt(1 - z * z); pos.set([Math.cos(a) * r * 90000, z * 90000, Math.sin(a) * r * 90000], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sp.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false }))); }
// sky colour inside the atmosphere (fades to black with camera altitude)
function spSky(alt) { const k = smooth(15, 90, alt); sp.background = new THREE.Color('#7fa8d8').lerp(new THREE.Color('#02030a'), k); clouds.material.opacity = 0.85; return k; }
// airliner (A330-ish, ~64 m) + its contrail, flying at 11 km
const plane = new THREE.Group(); { const wM = M('#f4f5f7', { roughness: 0.35, metalness: 0.2 }), bl = M('#2f5fa8');
  const f = mesh(new THREE.CapsuleGeometry(0.0028, 0.058, 6, 12), wM); f.rotation.z = Math.PI / 2; plane.add(f);
  const w = mesh(new THREE.BoxGeometry(0.018, 0.0008, 0.06), wM); w.position.x = -0.002; plane.add(w);
  const tl = mesh(new THREE.BoxGeometry(0.008, 0.009, 0.0008), bl); tl.position.set(-0.028, 0.005, 0); plane.add(tl);
  const st = mesh(new THREE.BoxGeometry(0.006, 0.0006, 0.02), wM); st.position.set(-0.028, 0.001, 0); plane.add(st); }
plane.scale.setScalar(1); sp.add(plane);
const trail = mesh(new THREE.CylinderGeometry(0.06, 0.02, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false })); trail.rotation.z = Math.PI / 2; sp.add(trail);
// ISS (~109 m truss): truss, 8 solar wings, modules; plus a marker ring so it reads at this scale
const iss = new THREE.Group(); { const gr = M('#d8d8d0', { metalness: 0.4, roughness: 0.4 }), pan = new THREE.MeshStandardMaterial({ color: '#c08a2a', metalness: 0.6, roughness: 0.3, emissive: '#3a2400', emissiveIntensity: 0.4 });
  const tr = mesh(new THREE.BoxGeometry(0.109, 0.004, 0.004), gr); iss.add(tr);
  for (const x of [-0.05, -0.035, 0.035, 0.05]) for (const s of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.012, 0.0005, 0.035), pan); p.position.set(x, 0, s * 0.02); iss.add(p); }
  const md = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.05, 10), gr); md.rotation.x = Math.PI / 2; iss.add(md); }
sp.add(iss);
const issRing = mesh(new THREE.RingGeometry(0.9, 1.0, 48), new THREE.MeshBasicMaterial({ color: '#ffd36a', transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })); issRing.renderOrder = 10; sp.add(issRing);
// =================== "만약 강남역 사거리에 10원 동전 크기의 블랙홀이 생긴다면?" — Earth-mass black hole (r_s 8.9 mm, Ø 1.8 cm), tools/bh_math.py
// Everything at distance r has fallen in after the free-fall time t_ff(r) = (π/2)·sqrt(r³/2GM). The video runs in extreme slow motion: the HUD shows the real time.
// 0–18 s Gangnam crossing at night (metres) · 18–21 s aerial · 21–29 s the Korean peninsula from space · 29–32 s end card.
const END0 = 29.0, GM2 = 2 * 6.674e-11 * 5.972e24;
const tff = r => Math.PI / 2 * Math.sqrt(r * r * r / GM2);
const rFell = T => Math.pow(T / (Math.PI / 2), 2 / 3) * Math.pow(GM2, 1 / 3);           // radius that has fully fallen in by real time T
const TT = [[0, -7.5], [2, -7.5], [3, -6.6], [6, -6.0], [9, -4.3], [12, -3.6], [15, -2.75], [18, -1.6], [21, -0.8], [24, 0.25], [27, 0.85], [29, 0.95]];
function realT(tau) { if (tau < 2) return 0; for (let i = 1; i < TT.length; i++) if (tau <= TT[i][0]) { const [a, la] = TT[i - 1], [b, lb] = TT[i]; return Math.pow(10, la + (lb - la) * (tau - a) / (b - a)); } return Math.pow(10, 0.95); }
const fallK = (d, T) => { const f = clamp(T / tff(Math.max(d, 0.05)), 0, 1); return 1 - Math.pow(1 - f * f, 2 / 3); };     // 0 = still, 1 = gone (free-fall profile)
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// =================== the night crossing (scene gn, metres; the hole hangs 1.1 m above the centre of the crossing) ===================
const gn = new THREE.Scene(); const gCam = new THREE.PerspectiveCamera(40, W / H, 0.005, 90000); gn.add(gCam);
const BH = V3(0, 1.1, 0);
gn.background = new THREE.Color('#0b1022'); gn.fog = new THREE.Fog('#141a30', 400, 9000);
gn.add(new THREE.HemisphereLight(0x51608a, 0x1a1410, 0.9));
const moonL = new THREE.DirectionalLight(0x8aa0d0, 0.6); moonL.position.set(-50, 80, 40); gn.add(moonL);
gn.environment = kw.environment; gn.environmentIntensity = 0.15;
const asph = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#26272b'; c.fillRect(0, 0, w, h); speckle(c, w, h, 7000, ['#202124', '#2e2f33', '#35363b'], 2); });
const road = mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ map: rep(asph, 300, 300), roughness: 0.55, metalness: 0.1 }), false, true); road.rotation.x = -Math.PI / 2; gn.add(road);
const nightCity = canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = '#0d0f17'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { c.fillStyle = ['#ffd38a', '#fff1d0', '#8ab8ff', '#ff9a6a'][(hash(i) * 4) | 0]; c.globalAlpha = 0.3 + hash(i * 3) * 0.7; c.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 1 + hash(i * 5) * 2, 1); } c.globalAlpha = 1;
  c.strokeStyle = 'rgba(255,190,110,.35)'; c.lineWidth = 2; for (let k = 0; k <= w; k += 64) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } });
const farCity = mesh(new THREE.PlaneGeometry(80000, 80000), new THREE.MeshBasicMaterial({ map: rep(nightCity, 60, 60), fog: true }), false, false); farCity.rotation.x = -Math.PI / 2; farCity.position.y = -0.05; gn.add(farCity);
// crosswalks (zebras) on the 4 sides, lane lines
const zebra = new THREE.MeshStandardMaterial({ color: '#e8e8e2', roughness: 0.6 });
for (const [cx, cz, rot] of [[0, -18, 0], [0, 18, 0], [-18, 0, 1], [18, 0, 1]]) for (let i = -7; i <= 7; i++) { const s = mesh(new THREE.PlaneGeometry(0.5, 4.5), zebra, false, true); s.rotation.x = -Math.PI / 2; s.rotation.z = rot ? Math.PI / 2 : 0; s.position.set(cx + (rot ? 0 : i * 1.0), 0.01, cz + (rot ? i * 1.0 : 0)); gn.add(s); }
// the crossing lines on the road
for (const sgn of [-1, 1]) for (let k = 22; k < 400; k += 9) { for (const [x, z] of [[k * sgn, 0], [0, k * sgn]]) { const l = mesh(new THREE.PlaneGeometry(x ? 4 : 0.15, x ? 0.15 : 4), M('#d9c46a'), false, true); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.012, z); gn.add(l); } }
// towers: dark glass with lit windows + signs at street level
const winTex = (seed) => canvasTex(128, 256, (c, w, h) => { c.fillStyle = '#121722'; c.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 8) for (let x = 3; x < w; x += 8) { const on = hash(seed + x * 13 + y * 7) > 0.42; c.fillStyle = on ? ['#ffe2a8', '#fff4dc', '#cfe2ff'][(hash(seed + x + y) * 3) | 0] : '#1b2232'; c.fillRect(x, y, 5, 5); } });
const SIGNS = ['카페', '노래방', 'PC방', '치킨', '약국', '편의점', '안경', '헬스', '분식', '한의원', '부동산', '은행'];
const signTex = (txt, col) => canvasTex(256, 96, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 58px "Noto Sans KR"'; c.textAlign = 'center'; c.fillText(txt, w / 2, 70); });
const TOWERS = [];
for (const [qx, qz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let i = 0; i < 9; i++) {
  const x = qx * (24 + (i % 3) * 26 + hash(i * 3 + qx) * 6), z = qz * (24 + Math.floor(i / 3) * 26 + hash(i * 5 + qz) * 6), h = 30 + hash(i * 7 + qx * 3 + qz) * 140, w = 18 + hash(i * 11) * 6;
  const wt = winTex(i * 31 + qx * 7 + qz * 13); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(Math.round(w / 6), Math.round(h / 12));
  const m = new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.4 });
  const g = new THREE.Group(); g.position.set(x, 0, z); gn.add(g); const b = mesh(BOX, m); b.scale.set(w, h, w); b.position.y = h / 2; g.add(b);
  for (let k = 0; k < 3; k++) { const s = mesh(new THREE.PlaneGeometry(4.2, 1.6), new THREE.MeshBasicMaterial({ map: signTex(SIGNS[(i * 3 + k + qx + 4) % SIGNS.length], ['#d0283a', '#2a6ad0', '#e88a1a', '#18a06a', '#8a2ad0'][(i + k) % 5]) }), false, false);
    s.position.set(-qx * (w / 2 + 0.05) * 0 + (k - 1) * 5.2, 4.2 + k * 0.1, -qz * (w / 2 + 0.06)); s.rotation.y = qz > 0 ? Math.PI : 0; g.add(s); }
  TOWERS.push({ g, d: Math.hypot(x, z), h, x, z }); }
// 강남역 exit sign + LED billboard
const gangnamSign = mesh(new THREE.PlaneGeometry(3.2, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(320, 110, (c, w, h) => { c.fillStyle = '#1a1a1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#3cb44a'; c.beginPath(); c.arc(50, 55, 34, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 44px Inter'; c.textAlign = 'center'; c.fillText('2', 50, 71);
  c.textAlign = 'left'; c.font = 'bold 40px "Noto Sans KR"'; c.fillText('강남역', 100, 52); c.font = '500 26px Inter'; c.fillText('Gangnam  222', 100, 88); }) }), false, false); gangnamSign.position.set(-14, 2.6, -21.5); gn.add(gangnamSign);
const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), M('#444')); pole.position.set(-14, 1.2, -21.6); gn.add(pole);
const led = mesh(new THREE.PlaneGeometry(26, 15), new THREE.MeshBasicMaterial({ map: canvasTex(520, 300, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff3d7f'); gr.addColorStop(1, '#4a2aff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 88px "Noto Sans KR"'; c.textAlign = 'center'; c.fillText('GANGNAM', w / 2, 150); c.font = '500 40px "Noto Sans KR"'; c.fillText('오늘 밤도 강남', w / 2, 220); }) }), false, false);
led.position.set(-30, 32, -34.9); gn.add(led);
// street lamps (light pools)
for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14], [-40, -14], [40, 14], [-14, 40], [14, -40]]) { const p = new THREE.PointLight(0xffd9a0, 30, 30, 1.6); p.position.set(x, 8, z); gn.add(p); const l = mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 8), M('#3a3d42')); l.position.set(x, 4, z); gn.add(l); }
// traffic lights with a pedestrian countdown
const cdTex = []; for (let n = 0; n <= 20; n++) cdTex.push(canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#060606'; c.fillRect(0, 0, w, h); c.fillStyle = '#3cff6a'; c.font = 'bold 44px Inter'; c.textAlign = 'center'; c.fillText(String(n), w / 2, 48); }));
const cd = mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: cdTex[12] }), false, false); cd.position.set(6.5, 3.0, -20.6); gn.add(cd); { const p2 = mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), M('#444')); p2.position.set(6.5, 1.6, -20.8); gn.add(p2); }
// cars and buses waiting at the red light
function carG(col) { const g = new THREE.Group(); bx(4.4, 0.9, 1.8, col, 0, 0.75, 0, g, { roughness: 0.3, metalness: 0.5 }); bx(2.4, 0.7, 1.6, '#151a20', -0.2, 1.45, 0, g, { roughness: 0.1, metalness: 0.6 });
  for (const s of [-1, 1]) { const hl = mesh(new THREE.BoxGeometry(0.1, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: '#fff6dd' })); hl.position.set(2.22, 0.85, s * 0.6); g.add(hl); const tl = mesh(new THREE.BoxGeometry(0.1, 0.16, 0.4), new THREE.MeshBasicMaterial({ color: '#ff2a2a' })); tl.position.set(-2.22, 0.9, s * 0.6); g.add(tl); }
  for (const [x, z] of [[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), M('#111')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); } return g; }
function busG(col) { const g = new THREE.Group(); bx(11, 2.9, 2.5, col, 0, 1.75, 0, g, { roughness: 0.4, metalness: 0.3 }); bx(10, 1.0, 2.52, '#162030', 0, 2.3, 0, g, { roughness: 0.1, metalness: 0.6 }); return g; }
const VEH = []; ['#e8e8ea', '#1f2a44', '#b8bcc4', '#a22a2a', '#2f2f33', '#f2f2f2', '#3a5a8a', '#d9d9d9', '#2a2a2a', '#6a7280'].forEach((c, i) => { const lane = [-8, -4.5, 4.5, 8][i % 4], along = 26 + Math.floor(i / 4) * 7 + hash(i) * 2, g = carG(c); const onX = i % 2;
  g.position.set(onX ? along * (lane < 0 ? -1 : 1) : lane, 0, onX ? lane : -along * (lane < 0 ? 1 : -1)); g.rotation.y = onX ? 0 : Math.PI / 2; gn.add(g); VEH.push({ g, p0: g.position.clone(), r0: g.rotation.clone() }); });
for (const [x, z, ry, c] of [[24, -6, 0, '#2a8a3a'], [-27, 6, 0, '#2a5ad0']]) { const g = busG(c); g.position.set(x, 0, z); g.rotation.y = ry; gn.add(g); VEH.push({ g, p0: g.position.clone(), r0: g.rotation.clone() }); }
// pedestrians on the crosswalks and corners
const PEDS = []; { const looks = [['girl', 'cream'], ['hero', 'white'], ['man2', null], ['girl', 'pink'], ['hero', 'navy'], ['woman2', null]];
  for (let i = 0; i < 18; i++) { const [nm, tee] = looks[i % looks.length]; const P = makeHuman(nm, tee ? { tee } : {}); gn.add(P.outer);
    const side = i % 4, k = (i / 4 | 0) - 2; const pos = [V3(-6 + k * 2.6 + hash(i) * 1.2, 0, -18 + (hash(i * 2) - 0.5) * 2.5), V3(5 + k * 2.4, 0, 18 + (hash(i * 3) - 0.5) * 2), V3(-18 + (hash(i * 5) - 0.5) * 2, 0, 3 + k * 2.5), V3(17 + (hash(i * 7) - 0.5) * 2, 0, -4 + k * 2.6)][side];
    PEDS.push({ P, p0: pos, ry: [Math.PI / 2, -Math.PI / 2, 0, Math.PI][side], v: 1.3 + hash(i * 9) * 0.3, ph: hash(i * 11) * 6 }); } }
function walkCycle(P, ph, amp = 1) { rotL(P, 'thigh_l', [1, 0, 0], 0.4 * amp * Math.sin(ph)); rotL(P, 'thigh_r', [1, 0, 0], -0.4 * amp * Math.sin(ph)); rotL(P, 'calf_l', [1, 0, 0], 0.5 * amp * Math.max(0, Math.sin(ph + 1.6))); rotL(P, 'calf_r', [1, 0, 0], 0.5 * amp * Math.max(0, -Math.sin(ph + 1.6)));
  rotL(P, 'upperarm_l', [1, 0, 0], -0.35 * amp * Math.sin(ph)); rotL(P, 'upperarm_r', [1, 0, 0], 0.35 * amp * Math.sin(ph)); }
function place(P, x, z, ry) { P.outer.position.set(x, 0, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
// the hole: an event horizon (black sphere, Ø 1.8 cm), a thin glowing photon ring, an accretion glow that grows as matter falls in; a 10-won coin on the road for scale
const hole = mesh(new THREE.SphereGeometry(0.0089, 32, 16), new THREE.MeshBasicMaterial({ color: '#000000' }), false, false); hole.position.copy(BH); gn.add(hole);
const glowT2 = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(128, 128, 4, 128, 128, 126); gr.addColorStop(0, 'rgba(255,240,220,1)'); gr.addColorStop(0.12, 'rgba(255,190,120,.85)'); gr.addColorStop(0.4, 'rgba(255,120,60,.25)'); gr.addColorStop(1, 'rgba(255,90,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
const accr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); accr.position.copy(BH); gn.add(accr);
const coin = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.0015, 32), new THREE.MeshStandardMaterial({ color: '#c88a4a', metalness: 0.9, roughness: 0.3 })); coin.position.set(0.05, 0.001, 0.02); gn.add(coin);
const coinLift = new THREE.Group(); gn.add(coinLift);
// streams of light from everything that falls in (instanced thin quads aligned to the hole)
const NSTR = 900, strGeo = new THREE.PlaneGeometry(1, 1); strGeo.translate(0.5, 0, 0);
const strM = new THREE.MeshBasicMaterial({ color: '#ffd7a0', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
const STR = new THREE.InstancedMesh(strGeo, strM, NSTR); STR.frustumCulled = false; gn.add(STR);
const SRC = []; for (let i = 0; i < NSTR; i++) { const d = Math.pow(10, -0.3 + hash(i * 1.3) * 4.6), a = hash(i * 2.7) * Math.PI * 2, y = hash(i * 4.1) * Math.min(d * 0.6, 160); SRC.push(V3(Math.cos(a) * d, y, Math.sin(a) * d)); }
const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _s4 = V3(), _x = V3(1, 0, 0);
function streams(T, cam) { let n = 0; for (let i = 0; i < NSTR; i++) { const s = SRC[i], d = s.distanceTo(BH), k = fallK(d, T * (0.9 + 0.3 * hash(i))); if (k <= 0.02 || k >= 0.999) { _m4.makeScale(0, 0, 0); STR.setMatrixAt(i, _m4); continue; }
  const p = s.clone().lerp(BH, k), dir = BH.clone().sub(p), len = Math.min(dir.length(), d * 0.35 * Math.sin(Math.PI * k) + 0.02); dir.normalize(); _q4.setFromUnitVectors(_x, dir);
  const wdt = Math.max(0.004, cam.position.distanceTo(p) * 0.0016); _s4.set(len, wdt, 1); _m4.compose(p, _q4, _s4); STR.setMatrixAt(i, _m4); n++; } STR.instanceMatrix.needsUpdate = true; return n; }
// gravitational lensing in the final composite: deflection α = θE²/θ around the hole's screen position (and a black shadow inside the photon ring)
compMat.uniforms.uBH = { value: new THREE.Vector3(0.5, 0.5, 0) }; compMat.uniforms.uBHr = { value: 0.0 };
compMat.fragmentShader = compMat.fragmentShader.replace('void main(){ vec2 uv = vUv;', `uniform vec3 uBH; uniform float uBHr;
  void main(){ vec2 uv = vUv; float lensDark = 0.0; if (uBHr > 0.00001) { vec2 asp = vec2(1.0, 1.7778); vec2 d = (uv - uBH.xy) * asp; float r = length(d); float e2 = uBHr * uBHr;
    if (r < uBHr * 0.62) lensDark = 1.0; else { float rr = r - e2 / max(r, 1e-4); uv = uBH.xy + normalize(d) * rr / asp; uv = clamp(uv, 0.001, 0.999); } }`);
compMat.fragmentShader = compMat.fragmentShader.replace('gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }', 'l = mix(l, vec3(0.0), lensDark); gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }');
compMat.needsUpdate = true;
function lensFor(cam, eRad) { const p = BH.clone().project(cam); compMat.uniforms.uBH.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, 0); const dist = cam.position.distanceTo(BH), vis = p.z < 1 ? 1 : 0;
  compMat.uniforms.uBHr.value = vis * Math.min(0.35, eRad / (2 * dist * Math.tan(cam.fov * Math.PI / 360))); }
// =================== space: a dark, glowing scar at Seoul that grows with the fallen radius (km) ===================
const scar = mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.94 }), false, false); scar.position.set(0, -RE, 0); sp.add(scar);
const scarRing = mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#ffb36a', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false, false); scarRing.position.set(0, -RE, 0); sp.add(scarRing);
function setScar(rk) { const th = Math.max(0.6, rk) / RE; scar.geometry.dispose(); scar.geometry = new THREE.SphereGeometry(RE + 4, 128, 8, 0, Math.PI * 2, 0, th);
  scarRing.geometry.dispose(); scarRing.geometry = new THREE.SphereGeometry(RE + 5, 128, 2, 0, Math.PI * 2, th * 0.97, th * 0.09); }
const scarGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.add(scarGlow);
// =================== text ===================
const fmtT = T => T <= 0 ? '0초' : T < 0.001 ? (T * 1e6 < 10 ? (T * 1e6).toFixed(1) : Math.round(T * 1e6)) + 'µs' : T < 1 ? (T * 1000 < 10 ? (T * 1000).toFixed(2) : Math.round(T * 1000)) + 'ms' : T.toFixed(1) + '초';
const fmtR = r => r < 1000 ? Math.round(r) + 'm' : (r / 1000 < 10 ? (r / 1000).toFixed(1) : Math.round(r / 1000)) + 'km';
const CAPS = [[3.0, 5.9, '<span class="hl">10원 동전</span> 크기.<br>질량은 <span class="hl">지구</span>와 같습니다.'], [6.0, 8.9, '1m 거리 중력:<br>지구의 <span class="hl">40조 배.</span>'], [9.0, 11.9, '<span class="hl">0.00006초</span>:<br>사거리 위의 모든 것이 사라집니다.'],
  [12.0, 14.9, '<span class="hl">빛</span>까지 휘어집니다.'], [15.0, 17.9, '<span class="hl">0.002초</span>: 강남역 빌딩들.'], [18.0, 20.9, '<span class="hl">0.16초</span>: 서울 전체.'], [21.0, 23.9, '<span class="hl">1.8초</span>: 수도권과 서해까지.'],
  [24.0, 26.9, '<span class="hl">7초</span>: 남한 대부분.'], [27.0, 28.9, '지구 전체는…<br><span class="hl">약 15분.</span>']];
const $ = id => document.getElementById(id);
function text(t) {
  const T = realT(t), r = rFell(T);
  $('lab').textContent = '실제 경과 시간'; $('val').textContent = fmtT(T); $('sub').textContent = t < 2 ? '지구 질량 · 지름 1.8cm' : `빨려 들어간 반경 ${fmtR(Math.max(0, r))}`;
  for (const id of ['hud', 'mark']) $(id).style.opacity = 1 - smooth(28.8, 29.2, t); $('title').style.opacity = 1 - smooth(2.4, 2.9, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  if (c) { const k = clamp((t - c[0]) / 0.25, 0, 1); $('cap').style.transform = `scale(${k >= 1 ? 1 : 0.82 + 0.18 * easeOutBack(k)})`; }
  $('flash').style.opacity = 0.8 * Math.max(0, 1 - Math.abs(t - 2.0) / 0.12);
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; cam.aspect = W / H; cam.updateProjectionMatrix(); };
function frameAt(t) {
  compMat.uniforms.uLook.value = 0.25; compMat.uniforms.uBHr.value = 0;
  const T = realT(t), on = t >= 2.0;
  if (t < 18) {
    hole.visible = on; accr.visible = on;
    // people: walk until the hole appears, then freeze (slow motion), then fall in as the radius reaches them
    PEDS.forEach((q, i) => { const P = q.P; poseRest(P); const walk = Math.min(t, 2.0); const p = q.p0.clone().add(V3(Math.sin(q.ry) * q.v * walk, 0, Math.cos(q.ry) * q.v * walk));
      const k = fallK(p.distanceTo(BH), T); const pp = p.lerp(BH.clone().setY(0), k); place(P, pp.x, pp.z, q.ry); armsDown(P, 0.9); walkCycle(P, (t < 2 ? t : 2) * 6 + q.ph, 1); fingers(P, 'l', 0.3, 0.2); fingers(P, 'r', 0.3, 0.2);
      P.outer.scale.setScalar(Math.max(0.001, 1 - k)); P.outer.visible = k < 0.98; face(P, t < 2.2 ? 'neutral' : 'shocked', t); });
    VEH.forEach(v => { const d = v.p0.distanceTo(BH), k = fallK(d, T); v.g.position.copy(v.p0).lerp(BH, k); v.g.scale.setScalar(Math.max(0.001, 1 - k)); v.g.visible = k < 0.98; v.g.rotation.set(v.r0.x + k * 3, v.r0.y, v.r0.z + k * 2); });
    TOWERS.forEach(o => { const k = fallK(o.d, T); o.g.position.set(o.x * (1 - k), 0, o.z * (1 - k));
      o.g.scale.set(Math.max(0.001, 1 - k), Math.max(0.001, 1 - k * 0.95), Math.max(0.001, 1 - k)); o.g.visible = k < 0.98; });
    gangnamSign.visible = pole.visible = fallK(25, T) < 0.9; led.visible = fallK(46, T) < 0.9; cd.material.map = cdTex[Math.max(0, 12 - Math.floor(Math.min(t, 2) * 1))]; cd.visible = fallK(21, T) < 0.9;
    coin.visible = fallK(0.5, T) < 0.5;
    // camera per shot
    let lensR = 0;
    if (t < 3) LOOK(gCam, V3(9 - 1.2 * t, 1.65, 34 - 2 * t), V3(0, 2.5, 0), 46);                                                  // street level: the crowd crosses, the hole pops in
    else if (t < 6) { const u = (t - 3) / 3; LOOK(gCam, V3(0.06 - 0.02 * u, 1.13, 0.16 - 0.04 * u), BH, 40); }                       // macro: the hole, the 10-won coin below, lensed zebra
    else if (t < 9) { const u = (t - 6) / 3; LOOK(gCam, V3(3.2 - u, 1.4, 6.5 - 1.5 * u), BH.clone().add(V3(0, 0.3, 0)), 50); }          // people frozen around it
    else if (t < 12) { const u = (t - 9) / 3; LOOK(gCam, V3(-12 + 4 * u, 3 + 2 * u, 22 - 4 * u), BH, 52); }                           // the crossing falls in as light
    else if (t < 15) { const u = (t - 12) / 3; LOOK(gCam, V3(30 * Math.cos(u), 4 + 6 * u, 30 * Math.sin(u) + 10), BH.clone().add(V3(0, 4, 0)), 54); }   // orbit: lensing ring
    else if (t < 18) { const u = (t - 15) / 3; LOOK(gCam, V3(-120 + 40 * u, 40 + 120 * u, 160 - 20 * u), V3(0, 20, 0), 56); }        // crane up: towers peel off
    else { const u = (t - 18) / 3; LOOK(gCam, V3(-800 - 600 * u, 900 + 1500 * u, 1200 + 900 * u), V3(0, 0, 0), 52); }                  // aerial: Seoul streams in
    accr.scale.setScalar(t >= 18 ? gCam.position.length() * 0.18 : Math.max(0.03, Math.min(6, 0.02 + rFell(T) * 0.004)) * (t > 15 ? 1 + (t - 15) * 6 : 1)); accr.material.opacity = on ? Math.min(1, 0.4 + rFell(T) * 0.01) : 0;
    streams(on ? T : 0, gCam);
    gn.fog.near = Math.max(400, gCam.position.length() * 0.6); gn.fog.far = Math.max(9000, gCam.position.length() * 6);
    shootTo(RTA, gn, gCam);
    if (on) lensFor(gCam, t < 6 ? 0.022 : t < 12 ? 0.4 : t < 18 ? 3 + (t - 12) : 30);
    return true;
  }
  // ----- the peninsula from space: the scar grows to the fallen radius -----
  const rk = rFell(T) / 1000; setScar(rk); scarGlow.position.set(0, 2, 0); scarGlow.scale.setScalar(Math.max(20, rk * 3.2)); scarGlow.material.opacity = 0.9;
  plane.visible = trail.visible = iss.visible = issRing.visible = false;
  const u = (t - 18) / 11, e = u * u * (3 - 2 * u); LOOK(spCam, V3(-20 - 480 * e, 60 + 1440 * e, 120 + 1880 * e), V3(10 + 30 * e, 0, -10 - 50 * e), 46); spCam.near = 60; spCam.updateProjectionMatrix(); spCam.far = 200000; spSky(200);
  renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam); return true;
}
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0.05 * Math.max(0, 1 - Math.abs(t - 18.0) / 0.1);
  frameAt(t); composite(0, 1, 1); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
