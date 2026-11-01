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
// =================== 수능 EXAM ROOM (meters): Korean high-school classroom, 9 × 8 × 3 m. Students face −Z (the blackboard). Origin = floor centre.
const cls = new THREE.Scene();
const cCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 400); cls.add(cCam);
const RW = 9, RD = 8, RH = 3.0;
cls.environment = kw.environment; cls.environmentIntensity = 0.5;
cls.add(new THREE.HemisphereLight(0xfff8ee, 0x8a7a68, 0.9));
const winSun = new THREE.DirectionalLight(0xfff2dc, 2.6); winSun.position.set(-12, 7, 3); winSun.castShadow = true; winSun.shadow.mapSize.set(2048, 2048);
Object.assign(winSun.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: 1, far: 40 }); winSun.shadow.bias = -0.0005; winSun.shadow.normalBias = 0.02; cls.add(winSun, winSun.target);
for (const [x, z] of [[-2, -2], [2, -2], [-2, 1.5], [2, 1.5]]) { const p = new THREE.PointLight(0xfffaf0, 4.0, 9, 1.6); p.position.set(x, RH - 0.2, z); cls.add(p); }
// ---- textures ----
const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c9b48f'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = ((x + y) / 64) % 2 ? '#c2ad88' : '#cfbb96'; g.fillRect(x + 1, y + 1, 62, 62); } speckle(g, w, h, 5000, ['#b9a37e', '#d6c29d'], 2); }, [1, 1]);
const wallTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#efeadf'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2500, ['#e8e2d6', '#f4f0e7'], 2); }, [1, 1]);
const board = canvasTex(1600, 600, (g, w, h) => { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#35503f', '#2a4434', '#3a5646'], 3);
  g.fillStyle = 'rgba(240,240,232,.92)'; g.font = '500 76px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('2027학년도 대학수학능력시험', w / 2, 170);
  g.font = '500 62px "Noto Sans KR"'; g.fillText('제1교시  국어 영역', w / 2, 290); g.font = '400 50px "Noto Sans KR"'; g.fillText('08:40 ~ 10:00   (80분)', w / 2, 400);
  g.font = '400 40px "Noto Sans KR"'; g.fillStyle = 'rgba(255,220,140,.9)'; g.fillText('휴대폰 · 전자기기 제출 완료', w / 2, 500); });
const omrTex = canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#e46a7a'; g.fillRect(0, 0, w, 34); g.fillStyle = '#fff'; g.font = 'bold 18px "Noto Sans KR"'; g.fillText('답 안 지', 92, 23);
  g.strokeStyle = '#e46a7a'; g.lineWidth = 1; for (let c = 0; c < 4; c++) for (let r = 0; r < 20; r++) for (let b = 0; b < 5; b++) { g.beginPath(); g.ellipse(22 + c * 58 + b * 9, 52 + r * 15, 3, 5, 0, 0, Math.PI * 2); g.stroke(); } });
const bookTex = canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; g.font = 'bold 20px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('2027학년도', w / 2, 60); g.fillText('대학수학능력시험 문제지', w / 2, 90);
  g.font = 'bold 44px "Noto Sans KR"'; g.fillText('국어 영역', w / 2, 170); g.strokeStyle = '#333'; g.lineWidth = 2; g.strokeRect(20, 20, w - 40, h - 40); });
const clockTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fafafa'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#333'; g.stroke(); g.fillStyle = '#222';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 96 - 3, 128 - Math.cos(a) * 96 - 8, 6, 16); }
  g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(8.75 / 12 * 2 * Math.PI) * 55, 128 - Math.cos(8.75 / 12 * 2 * Math.PI) * 55); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(0.25 * 2 * Math.PI) * 85, 128 - Math.cos(0.25 * 2 * Math.PI) * 85); g.stroke(); });
const flagTex = canvasTex(300, 200, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c60c30'; g.beginPath(); g.arc(150, 100, 50, Math.PI, 0); g.fill(); g.fillStyle = '#003478'; g.beginPath(); g.arc(150, 100, 50, 0, Math.PI); g.fill();
  g.fillStyle = '#000'; for (const [x, y, r] of [[55, 45, -0.98], [245, 45, 0.98], [55, 155, 0.98], [245, 155, -0.98]]) { g.save(); g.translate(x, y); g.rotate(r); for (let k = -1; k <= 1; k++) g.fillRect(-25, k * 10 - 3, 50, 6); g.restore(); } });
const bannerTex = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#1f4fa0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 58px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('2027학년도 대학수학능력시험 제12시험장', w / 2, 84); });
const signTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d3a6e'; g.font = 'bold 64px "Noto Sans KR"'; g.textAlign = 'center'; g.fillText('한강고등학교', w / 2, 88); });
// ---- room shell ----
const room = new THREE.Group(); cls.add(room);
const fl = mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshStandardMaterial({ map: rep(floorTex, 9, 8), roughness: 0.55 }), false, true); fl.rotation.x = -Math.PI / 2; room.add(fl);
const ceil = mesh(new THREE.PlaneGeometry(RW, RD), M('#f2f0ea', { roughness: 0.95 }), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = RH; room.add(ceil);
const wallM = new THREE.MeshStandardMaterial({ map: rep(wallTex, 4, 2), roughness: 0.9 }), wainM = M('#9fb6a2', { roughness: 0.7 });
function wall(w, h, x, y, z, ry) { const m = mesh(new THREE.PlaneGeometry(w, h), wallM, false, true); m.position.set(x, y, z); m.rotation.y = ry; room.add(m); return m; }
wall(RW, RH, 0, RH / 2, -RD / 2, 0); wall(RW, RH, 0, RH / 2, RD / 2, Math.PI); wall(RD, RH, RW / 2, RH / 2, 0, -Math.PI / 2);
// left wall = windows: sill band + 4 window bays (frames + glass), sky + trees outside
bx(0.12, 0.95, RD, wainM, -RW / 2, 0.475, 0, room); bx(0.12, 0.35, RD, wallM, -RW / 2, RH - 0.175, 0, room);
const glassM = new THREE.MeshPhysicalMaterial({ color: '#dfeef6', roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.18 });
const panes = [];
for (let i = 0; i < 4; i++) { const z = -RD / 2 + 1 + i * 2; for (const dz of [-0.48, 0.48]) { const p = mesh(new THREE.PlaneGeometry(0.94, 1.66), glassM, false, false); p.rotation.y = Math.PI / 2; p.position.set(-RW / 2 + 0.02, 1.78, z + dz); room.add(p); panes.push(p); }
  for (const dz of [-0.98, 0, 0.98]) bx(0.08, 1.7, 0.06, '#d9dde0', -RW / 2 + 0.03, 1.78, z + dz, room); bx(0.08, 0.06, 2.0, '#d9dde0', -RW / 2 + 0.03, 2.62, z, room); bx(0.08, 0.06, 2.0, '#d9dde0', -RW / 2 + 0.03, 0.94, z, room);
  const cur = mesh(new THREE.BoxGeometry(0.06, 1.9, 0.5), M('#e8dcc4', { roughness: 1 })); cur.position.set(-RW / 2 + 0.15, 1.72, z + 0.95); room.add(cur); }
const outside = new THREE.Group(); outside.position.x = -RW / 2; room.add(outside);
{ const sky = mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6f9fd8'); gr.addColorStop(1, '#dcebf5'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), fog: false }), false, false);
  sky.rotation.y = Math.PI / 2; sky.position.set(-25, 10, 0); outside.add(sky);
  for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + hash(i) * 0.8, 1), M('#5f8f45', { flatShading: false })); t.position.set(-6 - hash(i * 3) * 4, 1.5 + hash(i * 5), -6 + i * 1.6); outside.add(t); } }
// wainscot on the other walls
bx(RW, 0.95, 0.04, wainM, 0, 0.475, RD / 2 - 0.02, room); bx(0.04, 0.95, RD, wainM, RW / 2 - 0.02, 0.475, 0, room);
// front: blackboard, chalk tray, teacher's desk, clock, flag, TV, speaker
const bd = mesh(new THREE.PlaneGeometry(4.6, 1.3), new THREE.MeshStandardMaterial({ map: board, roughness: 0.85 }), false, false); bd.position.set(0, 1.65, -RD / 2 + 0.03); room.add(bd);
bx(4.8, 0.06, 0.05, '#8a6a46', 0, 2.32, -RD / 2 + 0.03, room); bx(4.8, 0.05, 0.1, '#8a6a46', 0, 0.98, -RD / 2 + 0.06, room);
const clk = mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.5 }), false, false); clk.position.set(0, 2.62, -RD / 2 + 0.03); room.add(clk);
const flg = mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.9 }), false, false); flg.position.set(-1.0, 2.62, -RD / 2 + 0.03); room.add(flg);
bx(1.0, 0.6, 0.06, '#1a1a1c', 3.3, 2.45, -RD / 2 + 0.05, room);
const tdesk = new THREE.Group(); tdesk.position.set(2.6, 0, -RD / 2 + 1.0); room.add(tdesk); bx(1.3, 0.05, 0.65, '#b99a72', 0, 0.76, 0, tdesk); bx(1.25, 0.7, 0.6, '#9a7c56', 0, 0.38, 0, tdesk);
// back: lockers + notice board
for (let i = 0; i < 14; i++) { const l = bx(0.6, 1.25, 0.45, '#b9c4cf', -RW / 2 + 0.6 + i * 0.6, 0.63, RD / 2 - 0.25, room, { metalness: 0.3, roughness: 0.5 }); bx(0.5, 0.02, 0.005, '#8a96a2', -RW / 2 + 0.6 + i * 0.6, 0.95, RD / 2 - 0.475, room); }
bx(3.0, 0.9, 0.03, '#c79a64', 0.5, 2.0, RD / 2 - 0.02, room);
// door (right wall) + ceiling lights
bx(0.05, 2.1, 0.95, '#a98663', RW / 2 - 0.03, 1.05, -2.8, room);
for (const [x, z] of [[-2, -2.5], [2, -2.5], [-2, 0], [2, 0], [-2, 2.5], [2, 2.5]]) { const l = mesh(new THREE.BoxGeometry(1.25, 0.05, 0.25), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 1.6 })); l.position.set(x, RH - 0.03, z); room.add(l); }
// ---- desks + chairs (5 columns × 4 rows); seat i: { x, z, desk, chair, omr, book } ----
const deskTop = M('#d8c7a2', { roughness: 0.55 }), deskEdge = M('#7b8a8f', { metalness: 0.5, roughness: 0.45 }), seatM = M('#6d8fb3', { roughness: 0.6 });
const omrM = new THREE.MeshStandardMaterial({ map: omrTex, roughness: 0.9, side: THREE.DoubleSide }), bookM = new THREE.MeshStandardMaterial({ map: bookTex, roughness: 0.9, side: THREE.DoubleSide });
const SEATS = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
  const x = -3.2 + c * 1.6, z = -1.7 + r * 1.45;
  const desk = new THREE.Group(); desk.position.set(x, 0, z); room.add(desk);
  bx(0.66, 0.035, 0.48, deskTop, 0, 0.72, 0, desk); bx(0.6, 0.02, 0.4, deskEdge, 0, 0.6, 0.02, desk);
  for (const [dx, dz] of [[-0.3, -0.21], [0.3, -0.21], [-0.3, 0.21], [0.3, 0.21]]) bx(0.03, 0.72, 0.03, deskEdge, dx, 0.36, dz, desk);
  const chair = new THREE.Group(); chair.position.set(x, 0, z + 0.48); room.add(chair);
  bx(0.4, 0.03, 0.38, seatM, 0, 0.43, 0, chair); bx(0.4, 0.3, 0.025, seatM, 0, 0.72, 0.19, chair);
  for (const [dx, dz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) bx(0.022, 0.43, 0.022, deskEdge, dx, 0.215, dz, chair);
  bx(0.02, 0.35, 0.02, deskEdge, -0.18, 0.6, 0.18, chair); bx(0.02, 0.35, 0.02, deskEdge, 0.18, 0.6, 0.18, chair);
  const omr = mesh(new THREE.PlaneGeometry(0.19, 0.27), omrM, true, true); omr.rotation.x = -Math.PI / 2; omr.position.set(x + 0.14, 0.742, z + 0.03); room.add(omr);
  const book = mesh(new THREE.PlaneGeometry(0.21, 0.29), bookM, true, true); book.rotation.x = -Math.PI / 2; book.position.set(x - 0.13, 0.742, z + 0.02); room.add(book);
  SEATS.push({ r, c, x, z, desk, chair, omr, book });
}
// ---- exterior: the school (4 storeys, cream + blue band), the exam banner, name plate; sits in the Seoul park scene (kw) ----
const school = new THREE.Group(); school.position.set(0, 0, 160); kw.add(school);
{ const facade = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h); for (let f = 0; f < 4; f++) for (let i = 0; i < 12; i++) { g.fillStyle = '#7f9db4'; g.fillRect(12 + i * 41, 18 + f * 60, 30, 34); g.fillStyle = '#b7cad8'; g.fillRect(12 + i * 41, 18 + f * 60, 30, 8); }
    g.fillStyle = '#2f62a8'; g.fillRect(0, 248, w, 8); });
  const b = mesh(new THREE.BoxGeometry(70, 16, 14), [M('#e6dcc6'), M('#e6dcc6'), M('#b9b3a6'), M('#b9b3a6'), new THREE.MeshStandardMaterial({ map: facade, roughness: 0.8 }), M('#e6dcc6')]); b.position.y = 8; school.add(b);
  const ban = mesh(new THREE.PlaneGeometry(26, 3.2), new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.8 }), false, false); ban.position.set(0, 12.2, 7.03); school.add(ban);
  const sg = mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }), false, false); sg.position.set(-24, 14.4, 7.03); school.add(sg);
  bx(70, 2.5, 0.3, '#d4cbb5', 0, 1.25, 30, school); }   // schoolyard wall
const roofHole = mesh(new THREE.CircleGeometry(1.4, 24), M('#2a2622')); roofHole.rotation.x = -Math.PI / 2; roofHole.position.set(-6, 16.02, 1); roofHole.visible = false; school.add(roofHole);
// =================== STORY: "만약 내 박수 소리가 칠 때마다 2배가 된다면?" — graduation day in the same classroom (parts_suneung/s_class.js), MODEL: tools/clap_math.py
// 85 dB, ×2 pressure (+6 dB) per clap, a clap every 1.2 s from 2.0 s; clap 18 (22.4 s) ≈ 193 dB = the limit of sound in air; clap 19 = a shock wave over Seoul.
const C0 = 2.0, CDT = 1.2, CN = 19, END0 = 27.5;
const TC = k => C0 + CDT * (k - 1);
const nC = t => clamp(Math.floor((t - C0) / CDT) + 1, 0, CN);
const dB = n => 85 + 20 * Math.log10(Math.pow(2, n));
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const sinceClap = t => { const n = nC(t); return n ? t - TC(n) : 99; };
// ---- graduation dressing: board text, no exam papers, bouquets on the desks, a banner ----
bd.material.map = canvasTex(1600, 600, (g, w, h) => { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#35503f', '#2a4434', '#3a5646'], 3);
  g.fillStyle = 'rgba(240,240,232,.95)'; g.textAlign = 'center'; g.font = '500 110px "Noto Sans KR"'; g.fillText('졸업을 축하합니다!', w / 2, 230);
  g.font = '400 56px "Noto Sans KR"'; g.fillText('한강고등학교 제48회 졸업식', w / 2, 360); g.fillStyle = 'rgba(255,200,210,.9)'; g.font = '400 60px "Noto Sans KR"'; g.fillText('♥  3학년 2반 사랑해  ♥', w / 2, 480); });
bd.material.needsUpdate = true;
SEATS.forEach(s => { s.omr.visible = s.book.visible = false; });
const bouquet = () => { const g = new THREE.Group(); const wrap = mesh(new THREE.ConeGeometry(0.07, 0.22, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#f3e7d8', side: THREE.DoubleSide, roughness: 0.8 })); wrap.rotation.x = Math.PI; wrap.position.y = 0.11; g.add(wrap);
  for (let i = 0; i < 9; i++) { const f = mesh(new THREE.IcosahedronGeometry(0.028, 1), M(['#ff7aa2', '#ffd36a', '#ffffff', '#ff9a5a'][i % 4], { roughness: 0.7 })); f.position.set((hash(i) - 0.5) * 0.09, 0.24 + hash(i * 2) * 0.04, (hash(i * 3) - 0.5) * 0.09); g.add(f); } return g; };
const BQ = SEATS.map((s, i) => { const b = bouquet(); b.position.set(s.x + 0.12, 0.74, s.z); b.rotation.set(Math.PI / 2 - 0.2, 0, 0.6 + hash(i)); room.add(b); return { b, p0: b.position.clone(), r0: b.rotation.clone(), k: hash(i * 7) }; });
// ---- people ----
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, y, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
function settle(P, hipY) { P.outer.updateMatrixWorld(true); P.outer.position.y += hipY - boneW(P, 'pelvis').y; P.outer.updateMatrixWorld(true); }
function sitChair(P, lean = 0) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.5); rotL(P, 'calf_' + s, [1, 0, 0], 1.45); } rotL(P, 'thigh_l', [0, 0, 1], 0.08); rotL(P, 'thigh_r', [0, 0, 1], -0.08); rotL(P, 'spine_01', [1, 0, 0], 0.18 - lean); }
function handsOnLap(P) { armsDown(P, 1); for (const s of ['l', 'r']) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.35); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.9); fingers(P, s, 0.4, 0.2); } }
function earsCovered(P, k = 1, t = 0) { armsDown(P, 1); for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], q * 1.15 * k); rotL(P, 'upperarm_' + s, [1, 0, 0], -0.25 * k); rotL(P, 'lowerarm_' + s, [0, 0, 1], q * 2.2 * k); rotL(P, 'lowerarm_' + s, [0, 1, 0], -q * 0.6 * k); fingers(P, s, 0.15, 0.1); }
  rotL(P, 'head', [1, 0, 0], 0.3 * k + 0.05 * Math.sin(t * 20) * k); rotL(P, 'spine_03', [1, 0, 0], 0.2 * k); }
// clapping: hands come together at each clap instant (and a small "ready" swing in between)
function clapPose(P, t) { armsDown(P, 1); const sc = sinceClap(t), open = t < C0 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 5)) : Math.min(1, sc / 0.35) * (sc < CDT - 0.25 ? 1 : 1 - (sc - (CDT - 0.25)) / 0.25);
  for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.45); rotL(P, 'upperarm_' + s, [0, 1, 0], -0.2 * q); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.95); rotL(P, 'lowerarm_' + s, [0, 1, 0], -q * (0.72 - 0.45 * open)); fingers(P, s, 0.08, 0.1); } }
function standAt(P, x, z, ry) { place(P, x, z, ry); }
const ME = SEATS.find(s => s.r === 1 && s.c === 2);
const hero = makeHuman('hero', { tee: 'mustard' }); cls.add(hero.outer);
const LOOKS = [['girl', 'cream'], ['hero', 'white'], ['man2', null], ['girl', 'pink'], ['hero', 'navy']];
const mates = SEATS.filter(s => s !== ME).map((s, i) => { const [nm, tee] = LOOKS[(i * 3 + s.r) % LOOKS.length]; const P = makeHuman(nm, tee ? { tee } : {}); cls.add(P.outer); return { P, s, ph: hash(i * 2.1) * 6, d: Math.hypot(s.x - ME.x, s.z - ME.z) }; });
const teacher = makeHuman('woman2'); cls.add(teacher.outer);
// sound rings: a transparent sphere shell bursting from his hands on every clap, stronger each time
const ringM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending, uniforms: { opacity: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform float opacity; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); float r=pow(1.0-abs(dot(v,vN)),4.0); gl_FragColor=vec4(vec3(1.0)*r*opacity, 1.0); }' });
const RINGS = []; for (let i = 0; i < 3; i++) { const r = mesh(new THREE.SphereGeometry(1, 40, 20), ringM.clone(), false, false); cls.add(r); RINGS.push(r); }
// shards (windows at clap 13), petals (bouquets explode from clap 9)
const shardM2 = new THREE.MeshStandardMaterial({ color: '#e6f3fa', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const SH = []; for (let i = 0; i < 160; i++) { const m = mesh(new THREE.PlaneGeometry(0.05 + hash(i) * 0.12, 0.04 + hash(i * 2) * 0.1), shardM2, false, false); room.add(m); const p = panes[i % panes.length].position; SH.push({ m, p0: p.clone().add(V3(0, (hash(i * 3) - 0.5) * 1.5, (hash(i * 5) - 0.5) * 0.9)), v: V3(-3 - hash(i * 7) * 9, (hash(i * 11) - 0.3) * 4, (hash(i * 13) - 0.5) * 4) }); }
const PET = []; for (let i = 0; i < 220; i++) { const m = mesh(new THREE.PlaneGeometry(0.03, 0.025), M(['#ff7aa2', '#ffd36a', '#ffffff', '#ff9a5a'][i % 4], { side: THREE.DoubleSide }), false, false); room.add(m); const s = SEATS[i % SEATS.length]; PET.push({ m, p0: V3(s.x + 0.12, 0.98, s.z), v: V3((hash(i) - 0.5) * 3, 1 + hash(i * 2) * 3, (hash(i * 3) - 0.5) * 3) }); }
// exterior shock wave (kw, around the school at z = 160)
const shockM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { op: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform float op; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); float r=pow(1.0-abs(dot(v,vN)),3.0); gl_FragColor=vec4(mix(vec3(0.85,0.92,1.0),vec3(1.0),r), (0.08+0.85*r)*op); }' });
const shockRing = mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: '#c8b89a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), false, false); shockRing.rotation.x = -Math.PI / 2; kw.add(shockRing);
const shock = mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), shockM, false, false); kw.add(shock);
// ---- text ----
const CAPS = [[0.05, 1.95, ''], [2.05, 4.3, '<span class="hl">짝.</span>'], [4.4, 6.7, '…옆자리가 <span class="hl">쳐다봅니다.</span>'], [6.8, 9.1, '<span class="hl">고통</span>의 경계(약 120dB).'], [9.2, 11.5, '<span class="hl">제트기</span> 옆 소리(약 140dB).'],
  [11.6, 13.9, '꽃다발이 <span class="hl">터집니다.</span>'], [14.0, 16.3, '<span class="hl">고막</span> 위험(약 150dB).'], [16.4, 18.7, '<span class="hl">유리창</span>이 깨집니다.'], [18.8, 20.0, '책상이 <span class="hl">튀어오릅니다.</span>'], [20.0, 22.3, '<span class="hl">로켓 발사</span> 소리(약 180dB).'],
  [22.4, 23.5, '<span class="hl">193dB</span>: 공기로 낼 수 있는<br>가장 큰 소리.'], [23.6, 25.6, '그 다음 박수는…<br><span class="hl">충격파.</span>'], [25.6, 27.4, '<span class="hl">졸업식 박수</span>는 적당히. 👏']];
const $ = id => document.getElementById(id);
function text(t) {
  const n = nC(t), pulse = n > 0 ? Math.max(0, 1 - sinceClap(t) / 0.3) : 0;
  $('lab').textContent = '박수 소리'; $('val').textContent = (n < 19 ? Math.round(dB(n)) : '>194') + ' dB'; $('val').style.transform = `scale(${1 + 0.2 * pulse})`; $('val').style.transformOrigin = 'left center';
  $('sub').textContent = n ? `${n}번째 박수 · 압력 ×${Math.pow(2, n).toLocaleString('ko-KR')}` : '칠 때마다 ×2';
  for (const id of ['hud', 'mark']) $(id).style.opacity = 1 - smooth(27.3, 27.7, t); $('title').style.opacity = 1 - smooth(1.6, 2.0, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1] && c[2]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  if (c) { const k = clamp((t - c[0]) / 0.25, 0, 1); $('cap').style.transform = `scale(${k >= 1 ? 1 : 0.82 + 0.18 * easeOutBack(k)})`; }
  $('flash').style.opacity = Math.max(n >= 8 ? 0.35 * Math.max(0, 1 - sinceClap(t) / 0.1) * Math.min(1, (n - 7) / 8) : 0, 0.9 * Math.max(0, 1 - Math.abs(t - 23.6) / 0.15));
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function classAt(t) {
  const n = nC(t), sc = sinceClap(t), kick = n ? Math.max(0, 1 - sc / 0.25) : 0, lvl = n / 18;
  // the hero stands at his seat and claps
  const P = hero; poseRest(P); standAt(P, ME.x, ME.z + 0.62, Math.PI); clapPose(P, t); rotL(P, 'head', [1, 0, 0], -0.05);
  P.outer.position.x += 0.01 * Math.sin(t * 50) * kick * lvl; P.outer.updateMatrixWorld(true);
  face(P, t < 6 ? 'happy' : t < 12 ? 'proud' : t < 17 ? 'worried' : 'shocked', t);
  // classmates: sit → turn and stare → cover ears → duck (and desks hop on the claps late)
  for (const m of mates) { const Q = m.P, s = m.s; poseRest(Q); const hop = n >= 14 ? kick * 0.06 * (n - 13) : 0;
    s.desk.position.set(s.x, hop, s.z); s.chair.position.set(s.x, hop * 0.6, s.z + 0.48); s.desk.rotation.set(0, 0, hop * 0.5 * (hash(s.c) - 0.5));
    place(Q, s.x, s.z + 0.48, Math.PI); sitChair(Q, n >= 10 ? -0.25 : 0);
    const look = t > 4.2 && n < 6 ? smooth(4.2 + m.d * 0.15, 4.8 + m.d * 0.15, t) : 0, ang = Math.atan2(ME.x - s.x, ME.z - s.z) - Math.PI;
    if (n >= 6) earsCovered(Q, smooth(TC(6) + m.d * 0.05, TC(6) + 0.4 + m.d * 0.05, t), t + m.ph); else { handsOnLap(Q); rotL(Q, 'head', [0, 1, 0], clamp(ang, -1.3, 1.3) * look); }
    settle(Q, 0.5 + hop * 0.6); face(Q, n < 3 ? 'happy' : n < 6 ? 'surprised' : n < 11 ? 'worried' : 'scared', t + m.ph); }
  { const Q = teacher; poseRest(Q); place(Q, 1.0, -RD / 2 + 1.5, 0.25); if (n >= 6) earsCovered(Q, smooth(TC(6), TC(6) + 0.5, t), t); else { armsDown(Q, 1); rotL(Q, 'upperarm_l', [1, 0, 0], -0.3); rotL(Q, 'upperarm_r', [1, 0, 0], -0.3); }
    face(Q, n < 3 ? 'happy' : n < 6 ? 'surprised' : 'shocked', t); }
  // rings from the hands on each of the last 3 claps
  const hands = boneW(P, 'hand_l').lerp(boneW(P, 'hand_r'), 0.5);
  RINGS.forEach((r, i) => { const k = n - i; if (k < 1) { r.visible = false; return; } const a = t - TC(k), life = 0.9; r.visible = a > 0 && a < life; if (!r.visible) return;
    r.position.copy(hands); r.scale.setScalar(0.1 + a * (2 + k * 0.6)); r.material.uniforms.opacity.value = 0.9 * (1 - a / life) * Math.min(1, 0.2 + k / 10); });
  // bouquets burst from clap 9, petals fly
  const bq = n >= 9; BQ.forEach(o => { o.b.visible = !bq; });
  PET.forEach((p, i) => { const a = t - TC(9); p.m.visible = a > 0 && a < 4; if (!p.m.visible) return; p.m.position.copy(p.p0).addScaledVector(p.v, a).add(V3(0, -1.2 * a * a, 0)); if (p.m.position.y < 0.01) p.m.position.y = 0.01; p.m.rotation.set(a * 7 * hash(i), a * 5, a * 3); });
  // windows at clap 13
  const broke = t >= TC(13); panes.forEach(p => p.visible = !broke);
  SH.forEach((s, i) => { const a = t - TC(13); s.m.visible = a > 0 && a < 2.5; if (!s.m.visible) return; s.m.position.copy(s.p0).addScaledVector(s.v, a).add(V3(0, -4.9 * a * a, 0)); s.m.rotation.set(a * 9 * hash(i), a * 7, a * 5 * hash(i * 2)); });
  return { hands, kick, n };
}
function frameAt(t) {
  compMat.uniforms.uLook.value = 0.0;
  if (t < 23.6) {
    if (hero.outer.parent !== cls) cls.add(hero.outer);
    const { hands, kick, n } = classAt(t), H = boneW(hero, 'head');
    const sh = Math.min(9, Math.floor(t / 2.4)), u = (t % 2.4) / 2.4, U = u * u * (3 - 2 * u);
    if (sh === 0) LOOK(cCam, V3(2.6 - 0.6 * U, 1.9, -3.2 + 0.8 * U), V3(ME.x, 1.2, ME.z + 0.6), 46);                                 // the ceremony, push to him
    else if (sh === 1) LOOK(cCam, V3(ME.x - 0.6 + 0.3 * U, 1.45, ME.z - 0.75), V3(ME.x + 0.05, 1.3, ME.z + 0.6), 46);                   // close on the clapping hands + face
    else if (sh === 2) LOOK(cCam, V3(-2.6 + 1.2 * U, 1.3, ME.z + 2.4), V3(ME.x, 1.2, ME.z + 0.4), 50);                                  // the row behind turns to look
    else if (sh === 3) LOOK(cCam, V3(3.4, 1.6 + 0.3 * U, ME.z + 1.8 - 1.0 * U), V3(-1.0, 1.0, ME.z + 1.0), 54);                         // everyone covers their ears
    else if (sh === 4) LOOK(cCam, V3(0.3, 2.4 - 0.6 * U, -3.3), V3(ME.x, 1.1, ME.z + 1.0), 56);                                       // front wide: rings
    else if (sh === 5) LOOK(cCam, V3(ME.x + 0.5, 1.0, ME.z + 0.9 - 0.3 * U), V3(ME.x + 2.0, 1.0, ME.z + 2.5), 58);                      // petals explode
    else if (sh === 6) LOOK(cCam, V3(2.4 - 0.6 * U, 1.3, -1.2 + 0.6 * U), V3(-4.5, 1.6, 0.2), 52);                                     // windows burst
    else if (sh === 7) LOOK(cCam, V3(-3.4 + 0.6 * U, 0.6, 2.6), V3(0, 0.9, -0.5), 60);                                                // low: desks hop
    else if (sh === 8) LOOK(cCam, V3(ME.x + 0.45, 1.45 + 0.1 * U, ME.z - 0.55), H.clone().add(V3(0, -0.15, 0)), 40);                   // his face: 193 dB
    else LOOK(cCam, V3(ME.x + 0.8, 1.6, ME.z - 1.4), hands, 44);
    const sk = kick * Math.min(1, n / 10) * 0.06; cCam.position.add(V3(sk * Math.sin(t * 91), sk * Math.cos(t * 77), 0));
    shootTo(RTA, cls, cCam); return true;
  }
  // ----- the shock wave leaves the school and rolls over Seoul -----
  const a = t - 23.6; shock.visible = true; const R = 30 + 110 * a + 160 * a * a; shock.position.set(0, 0, 160); shock.scale.set(R, R * 0.55, R); shockM.uniforms.op.value = Math.max(0, 1 - a / 4.2); shockRing.position.set(0, 0.5, 160); shockRing.scale.setScalar(R); shockRing.material.opacity = 0.7 * Math.max(0, 1 - a / 4.2);
  roofHole.visible = false; cloudDeck.visible = false;
  if (a < 1.6) LOOK(kCam, V3(90 - 10 * a, 8 + 10 * a, 620 + 60 * a), V3(0, 20 + 40 * a, 160), 56);
  else { const k = (a - 1.6) / 2.4; LOOK(kCam, V3(-2600 + 500 * k, 1500 + 400 * k, 4800 + 600 * k), V3(0, 200, 300), 46); }
  kCam.near = 0.5; kCam.far = 90000; kw.fog.near = 900; kw.fog.far = 16000;
  shootTo(RTA, kw, kCam); return true;
}
// ---- motion blur on the loud part ----
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => t >= 11 && t < 27.5;
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0.06 * Math.max(0, 1 - Math.abs(t - 23.6) / 0.12);
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
