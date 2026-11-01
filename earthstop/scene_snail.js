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
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
// real shell: photogrammetry scan 'haus1' (OpenGameArt 'snail 3d model', CC0) — OBJ converted from its ASCII FBX 6.1 by tools/fbx6_to_obj.py
const SHELL = await new Promise(ok => new OBJLoader().load('assets/growkr/snail/shell.obj', ok, undefined, () => ok(null)));
const shellMats = await (async () => { const L = new THREE.TextureLoader(), ld = u => new Promise(ok => L.load('assets/growkr/snail/' + u, ok, undefined, () => ok(null)));
  const [c, n, orm] = await Promise.all([ld('haus1_3k_smooth_UV_None_BaseColor.jpg'), ld('haus1_3k_smooth_UV_None_Normal.jpg'), ld('haus1_3k_smooth_UV_None_OcclusionRoughnessMetallic.jpg')]);
  if (c) c.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshPhysicalMaterial({ map: c, normalMap: n, aoMap: orm, roughnessMap: orm, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.25 }); })();
const SHELL_ROT = (new URLSearchParams(location.search).get('sr') || '0,3.14,1.57').split(',').map(Number);
// =================== SNAIL (procedural body, metres): helico-spiral shell with growth bands, soft body, 4 tentacles (eyes on the long pair), slime trail ===================
function makeSnail() {
  const g = new THREE.Group();
  // shell: a tube swept along a log-spiral that rises a little, radius growing with the angle
  const turns = 3.2, N = 220, pts = [], rad = [];
  for (let i = 0; i <= N; i++) { const a = i / N * turns * Math.PI * 2, k = Math.exp(0.21 * a) / Math.exp(0.21 * turns * Math.PI * 2); pts.push(V3(Math.cos(a) * 0.0105 * k, Math.sin(a) * 0.0105 * k, 0.0035 * (1 - i / N))); rad.push(0.0012 + 0.0068 * k); }
  const curve = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(curve, N, 1, 18, false), P = tg.attributes.position, nrm = tg.attributes.normal;
  for (let i = 0; i < P.count; i++) { const seg = Math.min(N, Math.floor(i / 19)), c = curve.getPoint(seg / N); const v = V3(P.getX(i), P.getY(i), P.getZ(i)).sub(c); P.setXYZ(i, c.x + v.x * rad[seg], c.y + v.y * rad[seg], c.z + v.z * rad[seg]); }
  tg.computeVertexNormals();
  const shellTex = canvasTex(512, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#d9b68a'); gr.addColorStop(1, '#7a4e2a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) { c.fillStyle = `rgba(60,35,15,${0.15 + 0.25 * hash(x)})`; c.fillRect(x, 0, 1, h); } c.fillStyle = 'rgba(70,40,18,.55)'; c.fillRect(0, 22, w, 8); c.fillRect(0, 40, w, 4); });
  const shell = mesh(tg, new THREE.MeshPhysicalMaterial({ map: shellTex, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  shell.rotation.set(0, Math.PI / 2, 0); shell.rotateX(3.14); shell.position.set(0, 0.0185, 0.001); shell.userData.base = shell.quaternion.clone();
  if (SHELL) { shell.visible = false; const sc = SHELL.clone(); sc.traverse(o => { if (o.isMesh) { o.material = shellMats; o.castShadow = o.receiveShadow = true; o.geometry.setAttribute('uv2', o.geometry.attributes.uv); } });
    const b = new THREE.Box3().setFromObject(sc), sz = b.getSize(V3()), ctr = b.getCenter(V3()); const k = 0.024 / Math.max(sz.x, sz.y, sz.z); sc.position.copy(ctr).multiplyScalar(-k); sc.scale.setScalar(k);
    const holder = new THREE.Group(); holder.add(sc); holder.rotation.set(...SHELL_ROT); holder.position.set(0, 0.0165, -0.002); g.add(holder); g.userData.holder = holder; }
  g.add(shell);
  // body: a lathe 'foot' stretched along +Z (head forward), bumpy skin
  const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24; prof.push(new THREE.Vector2(0.0001 + 0.0062 * Math.sin(Math.PI * Math.pow(u, 0.75)) * (u < 0.9 ? 1 : 1 - (u - 0.9) * 6), u)); }
  const bg = new THREE.LatheGeometry(prof, 24); bg.scale(1, 0.042, 1); bg.rotateX(Math.PI / 2); bg.translate(0, 0.004, -0.02); { const Q = bg.attributes.position; for (let i = 0; i < Q.count; i++) if (Q.getY(i) < 0.001) Q.setY(i, 0.001); } bg.computeVertexNormals();
  const skin = canvasTex(256, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5e5246'); gr.addColorStop(1, '#9a8b78'); c.fillStyle = gr; c.fillRect(0, 0, w, h); speckle(c, w, h, 5000, ['#4f453b', '#6b5e50', '#8a7b68'], 2); for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(40,32,26,.35)'; c.beginPath(); c.ellipse(hash(i) * w, hash(i * 2) * h, 3 + hash(i * 3) * 5, 2 + hash(i * 4) * 3, 0, 0, 7); c.fill(); } });
  const bodyM = new THREE.MeshPhysicalMaterial({ map: skin, bumpMap: skin, bumpScale: 0.4, roughness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.08, sheen: 0.6, sheenColor: new THREE.Color('#d8cfc2') });
  const body = mesh(bg, bodyM); g.add(body);
  const neck = mesh(new THREE.CapsuleGeometry(0.0034, 0.008, 6, 12), bodyM); neck.rotation.x = Math.PI / 2 - 0.5; neck.position.set(0, 0.006, 0.019); g.add(neck);
  const tent = []; for (const [x, len, up] of [[-0.0022, 0.013, 0.9], [0.0022, 0.013, 0.9], [-0.003, 0.004, 0.35], [0.003, 0.004, 0.35]]) {
    const t = new THREE.Group(); t.position.set(x, 0.0085, 0.023); g.add(t); const s = mesh(new THREE.CylinderGeometry(0.00075, 0.0013, len, 12), bodyM); s.position.y = len / 2; t.add(s);
    if (len > 0.01) { const e = mesh(new THREE.SphereGeometry(0.0012, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#2e2620', roughness: 0.15, clearcoat: 1 })); e.position.y = len; t.add(e); }
    t.rotation.x = up; t.rotation.z = x * 60; tent.push(t); }
  g.userData = { shell, body, tent };
  return g;
}
function snailAnim(S, t, k = 1) { const { tent, body, shell } = S.userData; tent.forEach((tt, i) => { tt.rotation.x = (i < 2 ? 0.9 : 0.35) * k + 0.15 * Math.sin(t * 3 + i); tt.rotation.z = (i % 2 ? 1 : -1) * (0.15 + 0.08 * Math.sin(t * 2.3 + i)); });
  body.scale.z = 1 + 0.04 * Math.sin(t * 6); shell.quaternion.copy(shell.userData.base); shell.rotateZ(0.03 * Math.sin(t * 6 + 1)); }
// =================== GARDEN CURB + AUTUMN (kw scene): a concrete flower-bed curb along the promenade, ginkgo + maple leaves, wet sheen ===================
const CURB = { x0: -0.6, x1: 1.6, z: -5.55, h: 0.16 };
const curb = new THREE.Group(); kw.add(curb);
{ const conc = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#a9a69f'; c.fillRect(0, 0, w, h); speckle(c, w, h, 9000, ['#9a978f', '#b8b5ad', '#8f8c85', '#c4c1b9'], 2); for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(70,70,70,.2)'; c.beginPath(); c.arc(hash(i) * w, hash(i * 2) * h, 2 + hash(i * 3) * 4, 0, 7); c.fill(); } });
  const m = new THREE.MeshPhysicalMaterial({ map: rep(conc, 12, 1), roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const b = mesh(new THREE.BoxGeometry(CURB.x1 - CURB.x0 + 3, CURB.h, 0.15), m); b.position.set((CURB.x0 + CURB.x1) / 2 + 1.5, CURB.h / 2, CURB.z); curb.add(b);
  const soil = mesh(new THREE.BoxGeometry(6, 0.12, 1.2), M('#4a3a2c', { roughness: 1 })); soil.position.set(1.2, 0.06, CURB.z + 0.68); curb.add(soil); }
// leaves: ginkgo (yellow fans) + maple (red stars), instanced, scattered on soil, curb and promenade
function leafGeo(kind) { const s = new THREE.Shape(); if (kind === 'g') { s.moveTo(0, 0); s.quadraticCurveTo(-0.035, 0.03, -0.03, 0.05); s.quadraticCurveTo(0, 0.062, 0.03, 0.05); s.quadraticCurveTo(0.035, 0.03, 0, 0); }
  else { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.014 : 0.04; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.02) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r + 0.02); } }
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g; }
for (const [kind, col, n] of [['g', '#e8c23a', 900], ['m', '#c8402a', 450]]) {
  const im = new THREE.InstancedMesh(leafGeo(kind), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, side: THREE.DoubleSide }), n), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), cc = new THREE.Color();
  for (let i = 0; i < n; i++) { const x = -3 + hash(i * 1.3 + n) * 9, z = CURB.z - 2.6 + hash(i * 2.7 + n) * 4.2, onCurb = Math.abs(z - CURB.z) < 0.075 && x > CURB.x0 - 0.5, y = onCurb ? CURB.h + 0.002 : Math.abs(z - CURB.z - 0.68) < 0.6 ? 0.122 : 0.025;
    if (onCurb && x > CURB.x0 - 0.1 && x < CURB.x1 + 0.3 && Math.abs(z - CURB.z) < 0.05) continue;   // keep the snail's lane clear
    q.setFromEuler(new THREE.Euler((hash(i * 5) - 0.5) * 0.3, hash(i * 7) * 6.3, (hash(i * 9) - 0.5) * 0.3)); const sc = 0.7 + hash(i * 11) * 0.7;
    mm.compose(V3(x, y, z), q, V3(sc, sc, sc)); im.setMatrixAt(i, mm); im.setColorAt(i, cc.set(col).offsetHSL((hash(i) - 0.5) * 0.04, 0, (hash(i * 3) - 0.5) * 0.12)); }
  im.receiveShadow = true; im.castShadow = true; kw.add(im); }
// a ginkgo tree right behind the curb (fan-leaf crown, golden)
{ const t = grp(0.9, 0, CURB.z + 1.1, 0, kw); const trunk = mesh(new THREE.CylinderGeometry(0.12, 0.2, 4.5, 9), M('#5a4636')); trunk.position.y = 2.25; t.add(trunk);
  for (let i = 0; i < 9; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.9 + hash(i) * 0.4, 2), M('#e6b830', { roughness: 0.8 })); b.position.set((hash(i * 3) - 0.5) * 1.6, 4.2 + hash(i * 5) * 1.6, (hash(i * 7) - 0.5) * 1.6); t.add(b); } }
// slime trail: a glossy strip that grows behind the snail
const slimeM = new THREE.MeshPhysicalMaterial({ color: '#d8dde0', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.45, depthWrite: false });
const slime = mesh(new THREE.PlaneGeometry(1, 0.008), slimeM, false, false); slime.rotation.x = -Math.PI / 2; kw.add(slime);
// an ant on the curb (3 segments, 6 legs)
const ant = new THREE.Group(); { const b = M('#1c1410', { roughness: 0.35 }); for (const [z, r] of [[-0.004, 0.0018], [0, 0.0012], [0.0035, 0.0014]]) { const s = mesh(new THREE.SphereGeometry(r, 10, 8), b); s.scale.set(1, 0.8, 1.3); s.position.set(0, 0.0018, z); ant.add(s); }
  for (let i = 0; i < 6; i++) { const l = mesh(new THREE.CylinderGeometry(0.0002, 0.0002, 0.005, 4), b); l.position.set((i % 2 ? 1 : -1) * 0.002, 0.0012, -0.002 + Math.floor(i / 2) * 0.002); l.rotation.z = (i % 2 ? 1 : -1) * 1.0; ant.add(l); } }
ant.rotation.y = Math.PI / 2; kw.add(ant);
// =================== ROAD + KTX next to the park (stylised, south bank): a 4-lane road at z = +16, an elevated rail line at z = +24 ===================
const road = mesh(new THREE.PlaneGeometry(60000, 14), new THREE.MeshStandardMaterial({ map: rep(canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#4c4e52'; c.fillRect(0, 0, w, h); speckle(c, w, h, 6000, ['#44464a', '#56585c'], 2); c.fillStyle = '#e8e2c8'; for (let x = 0; x < w; x += 64) c.fillRect(x, h / 2 - 2, 34, 4); c.fillStyle = '#ffffff'; c.fillRect(0, 6, w, 3); c.fillRect(0, h - 9, w, 3); }), 4000, 1), roughness: 0.85 }), false, true);
road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, 16); kw.add(road);
const rail = new THREE.Group(); kw.add(rail); { const c = M('#c9c5bc'); bx(60000, 0.8, 6, c, 0, 6.6, 24, rail); for (let x = -400; x < 4000; x += 30) bx(1.5, 6.2, 1.5, c, x, 3.1, 24, rail); bx(60000, 0.15, 0.1, '#777', 0, 7.1, 23.3, rail); bx(60000, 0.15, 0.1, '#777', 0, 7.1, 24.7, rail); }
function car(col) { const g = new THREE.Group(); bx(4.4, 0.9, 1.8, col, 0, 0.75, 0, g, { roughness: 0.35, metalness: 0.4 }); bx(2.4, 0.7, 1.6, '#24282e', -0.2, 1.45, 0, g, { roughness: 0.15, metalness: 0.5 });
  for (const [x, z] of [[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), M('#151515')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); } return g; }
const CARS = []; ['#e8e8ea', '#1f2a44', '#b8bcc4', '#a22a2a', '#2f2f33', '#f2f2f2', '#3a5a8a', '#d9d9d9'].forEach((c, i) => { const g = car(c); kw.add(g); CARS.push({ g, lane: [12.5, 14.5, 17.5, 19.5][i % 4], x0: -60 + i * 21 + hash(i) * 8, v: 24 + hash(i * 3) * 5 }); });
// KTX: white body, blue stripe, sloped nose; 8 cars
const ktx = new THREE.Group(); kw.add(ktx);
{ const wh = M('#f3f4f6', { roughness: 0.3, metalness: 0.3 }), bl = M('#1d4fa0', { roughness: 0.4 }), win = M('#1b2430', { roughness: 0.1, metalness: 0.6 });
  for (let i = 0; i < 8; i++) { const c = new THREE.Group(); c.position.x = -i * 19; ktx.add(c); bx(18.4, 3.4, 2.9, wh, 0, 1.7, 0, c); bx(18.4, 0.35, 2.92, bl, 0, 1.1, 0, c); bx(16, 0.6, 2.93, win, 0, 2.3, 0, c); }
  const nose = mesh(new THREE.ConeGeometry(1.7, 7, 16), wh); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1, 0.85); nose.position.set(12.7, 1.6, 0); ktx.add(nose); }
ktx.position.set(0, 7.2, 24);
// =================== STORY: "만약 달팽이 속도가 1초마다 2배가 된다면?" — MODEL: 1.5 mm/s ×2 every second from t = 2 (tools/snail_math.py) ===================
const N0 = 2.0, NN = 24, END0 = 28.5;
const nAtS = t => clamp(Math.floor(t - N0) + 1, 0, NN);
const vS = t => t < N0 ? 0.0015 : 0.0015 * Math.pow(2, Math.min(NN, t - N0 + 1));                       // smooth version for motion
const dS = t => t < N0 ? 0.0015 * t : 0.003 + 0.0015 / Math.LN2 * (Math.pow(2, Math.min(NN, t - N0 + 1)) - 2) + (t > N0 + NN - 1 ? 0.0015 * Math.pow(2, NN) * (t - (N0 + NN - 1)) : 0);
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// snail path (metres, kw): along the curb top, off its end onto the promenade edge, then along the river (+x)
const CURB_END = CURB.x1 + 3.0;
function snailPos(t) { const x = CURB.x0 + dS(t); if (x < CURB_END) return V3(x, CURB.h, CURB.z); const k = Math.min(1, (x - CURB_END) / 0.6); return V3(x, CURB.h * (1 - k) + 0.02 * k, lerp(CURB.z, -6.4, k)); }
const snail = makeSnail(); snail.rotation.y = Math.PI / 2; kw.add(snail);
// speed streak behind the snail (reads at any scale)
const streakSM = new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const sStreak = mesh(new THREE.CylinderGeometry(1, 0.15, 1, 12, 1, true), streakSM, false, false); sStreak.rotation.z = Math.PI / 2; kw.add(sStreak);
const glowT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(190,225,255,.7)'); gr.addColorStop(1, 'rgba(160,210,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); kw.add(glow);
const boomS = mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); kw.add(boomS);
// people on the promenade: walker 1.4 m/s, cyclist 5 m/s, runner 12 m/s — placed so the snail passes them at 11.6 / 13.1 / 14.1 s
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, y, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
function walkCycle(P, ph, amp = 1) { rotL(P, 'thigh_l', [1, 0, 0], 0.4 * amp * Math.sin(ph)); rotL(P, 'thigh_r', [1, 0, 0], -0.4 * amp * Math.sin(ph)); rotL(P, 'calf_l', [1, 0, 0], 0.5 * amp * Math.max(0, Math.sin(ph + 1.6))); rotL(P, 'calf_r', [1, 0, 0], 0.5 * amp * Math.max(0, -Math.sin(ph + 1.6)));
  rotL(P, 'upperarm_l', [1, 0, 0], -0.35 * amp * Math.sin(ph)); rotL(P, 'upperarm_r', [1, 0, 0], 0.35 * amp * Math.sin(ph)); }
const PEOPLE = [{ P: makeHuman('girl', { tee: 'pink' }), v: 1.4, tp: 11.6, z: -6.9, kind: 'walk' }, { P: makeHuman('man2'), v: 5.2, tp: 13.1, z: -7.3, kind: 'bike' }, { P: makeHuman('hero', { tee: 'navy' }), v: 12.0, tp: 14.15, z: -7.0, kind: 'run' }];
PEOPLE.forEach(p => { kw.add(p.P.outer); p.x0 = snailPos(p.tp).x - p.v * p.tp; });
const bike = new THREE.Group(); { const fr = M('#2f6fb0', { metalness: 0.5, roughness: 0.4 }); for (const x of [-0.55, 0.55]) { const w = mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 24), M('#151515')); w.position.set(x, 0.35, 0); bike.add(w); } bx(1.1, 0.04, 0.04, fr, 0, 0.62, 0, bike); bx(0.04, 0.5, 0.04, fr, -0.15, 0.6, 0, bike); bx(0.25, 0.05, 0.12, '#222', -0.15, 0.88, 0, bike); bx(0.05, 0.5, 0.45, fr, 0.5, 0.85, 0, bike); } kw.add(bike);
const CAP = [[0.0, 0, ''], [2.1, 4.9, '…<span class="hl">스윽.</span>'], [5.0, 7.9, '<span class="hl">개미</span>랑 나란히.'], [8.0, 10.9, '10초 동안 겨우 <span class="hl">77cm.</span>'], [11.05, 11.95, '<span class="hl">걷는 사람</span> 추월.'],
  [12.05, 13.45, '<span class="hl">자전거</span> 추월.'], [13.5, 14.95, '<span class="hl">우사인 볼트</span>와 같은 속도.'], [15.05, 16.95, '<span class="hl">자동차</span>를 따라잡고…'], [17.0, 18.95, '<span class="hl">KTX</span> 추월!'], [19.0, 20.95, '<span class="hl">음속 돌파!</span> (343m/s)'],
  [21.0, 22.95, '<span class="hl">총알</span>보다 빠르게.'], [23.0, 23.95, '지구가 둥글어서…<br><span class="hl">땅이 멀어집니다.</span>'], [24.0, 25.95, '<span class="hl">지구 탈출 속도</span><br>(11.2km/s) 돌파!'], [26.05, 28.4, '…<span class="hl">집</span>은 챙겨 감. 🏠']];
const $ = id => document.getElementById(id);
const fmtV = v => v < 0.01 ? (v * 1000).toFixed(1) + ' mm/s' : v < 1 ? (v * 100).toFixed(1) + ' cm/s' : v < 1000 ? (v < 10 ? v.toFixed(1) : Math.round(v)).toLocaleString('ko-KR') + ' m/s' : (v / 1000).toFixed(1) + ' km/s';
function text(t) {
  const n = nAtS(t), pulse = n > 0 ? Math.max(0, 1 - (t - (N0 + n - 1)) / 0.3) : 0, v = 0.0015 * Math.pow(2, n);
  $('lab').textContent = '달팽이 속도'; $('val').textContent = fmtV(v); $('val').style.transform = `scale(${1 + 0.18 * pulse})`; $('val').style.transformOrigin = 'left center';
  $('sub').textContent = n ? `${n}번째 · 1초마다 ×2` : '1초마다 ×2';
  $('hud').style.opacity = 1 - smooth(28.3, 28.7, t); $('title').style.opacity = 1 - smooth(1.6, 2.0, t); $('mark').style.opacity = 1 - smooth(28.3, 28.7, t);
  const c = CAP.find(c => t >= c[0] && t < c[1] && c[2]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  if (c) { const k = clamp((t - c[0]) / 0.25, 0, 1); $('cap').style.transform = `scale(${k >= 1 ? 1 : 0.82 + 0.18 * easeOutBack(k)})`; }
  $('flash').style.opacity = 0.75 * Math.max(0, 1 - Math.abs(t - 19.0) / 0.12);
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
// overlay scene for the snail close-up in space (metres)
const snS = new THREE.Scene(); snS.environment = kw.environment; snS.environmentIntensity = 0.6; { const l = new THREE.DirectionalLight(0xfff4e6, 3.2); l.position.set(-2, 3, 4); snS.add(l); snS.add(new THREE.HemisphereLight(0x9cc0ff, 0x203040, 0.7)); }
const snCam = new THREE.PerspectiveCamera(40, W / H, 0.002, 100);
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function frameAt(t) {
  compMat.uniforms.uLook.value = 0.0; compMat.uniforms.uTilt.value = 0;
  if (t < 23) {
    if (snail.parent !== kw) kw.add(snail);
    const p = snailPos(t), v = vS(t); snail.position.copy(p); snail.scale.setScalar(1); snail.rotation.set(0, Math.PI / 2, 0); snailAnim(snail, t, 1);
    if (p.x > CURB_END) snail.rotation.z = -0.2 * Math.max(0, 1 - (p.x - CURB_END) / 0.6);
    // slime trail
    const x0 = CURB.x0, x1 = Math.min(p.x, CURB_END); slime.visible = x1 > x0 + 0.01; slime.scale.set(x1 - x0, 1, 1); slime.position.set((x0 + x1) / 2, CURB.h + 0.0012, CURB.z);
    // ant: 5 cm/s along the curb, a little ahead at 5 s, level at ~7 s, then left behind
    const ax = CURB.x0 - 0.12 + 0.05 * t; ant.position.set(ax, CURB.h, CURB.z - 0.035); ant.visible = t < 11; ant.children.forEach((c, i) => { if (i > 2) c.rotation.x = 0.4 * Math.sin(t * 30 + i); });
    // speed streak
    const sl = Math.min(3000, v * 0.12); streakSM.opacity = 0.75 * smooth(10.5, 13, t); sStreak.visible = streakSM.opacity > 0.01; const r = Math.max(0.004 + 0.002 * Math.log2(1 + v), kCam.position.distanceTo(p) * 0.006);
    sStreak.scale.set(r, sl, r); sStreak.position.set(p.x - sl / 2 - 0.03, p.y + 0.012, p.z);
    // people
    PEOPLE.forEach((q, i) => { const P = q.P; poseRest(P); const x = q.x0 + q.v * t; place(P, x, q.z, Math.PI / 2); armsDown(P, 0.9);
      if (q.kind === 'bike') { P.outer.position.y = 0.42; for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.2 + 0.4 * Math.sin(t * 9 + (s === 'l' ? 0 : 3.14))); rotL(P, 'calf_' + s, [1, 0, 0], 1.1); } rotL(P, 'spine_01', [1, 0, 0], 0.35); rotL(P, 'upperarm_l', [1, 0, 0], -0.9); rotL(P, 'upperarm_r', [1, 0, 0], -0.9); bike.position.set(x + 0.15, 0, q.z); bike.rotation.y = 0; }
      else walkCycle(P, t * (q.kind === 'run' ? 16 : 6.5) + i, q.kind === 'run' ? 1.7 : 1);
      if (q.kind === 'run') rotL(P, 'spine_01', [1, 0, 0], 0.2);
      fingers(P, 'l', 0.4, 0.2); fingers(P, 'r', 0.4, 0.2); face(P, t > q.tp - 0.2 && t < q.tp + 1.2 ? 'shocked' : 'neutral', t); P.outer.visible = t > 9 && t < 16; });
    bike.visible = t > 9 && t < 16;
    CARS.forEach(c => { c.g.position.set(snailPos(15.6).x + c.x0 + c.v * (t - 15.6), 0, c.lane); c.g.visible = t > 13 && t < 21; });
    ktx.position.x = snailPos(17.0).x + 40 + 83 * (t - 17.0); ktx.visible = t > 14 && t < 21;
    glow.visible = t > 14.5; glow.position.copy(p).add(V3(0, 0.02, 0)); glow.scale.setScalar(Math.max(0.05, kCam.position.distanceTo(p) * 0.06)); glow.material.opacity = smooth(14.5, 15.5, t);
    const bk = (t - 19.0) / 0.8; boomS.visible = bk > 0 && bk < 1; boomS.position.copy(p).add(V3(0, 0.05, 0)); boomS.rotation.y = Math.PI / 2; boomS.scale.setScalar(0.5 + bk * 40); boomS.material.opacity = 0.8 * (1 - bk);
    cloudDeck.visible = false;
    // cameras
    const sh = t < 2 ? 0 : t < 5 ? 1 : t < 8 ? 2 : t < 11 ? 3 : t < 15 ? 4 : t < 19 ? 5 : 6, u = sh === 0 ? t / 2 : sh <= 3 ? ((t - 2) % 3) / 3 : sh === 4 ? (t - 11) / 4 : sh === 5 ? (t - 15) / 4 : (t - 19) / 4, U = u * u * (3 - 2 * u);
    if (sh === 0) LOOK(kCam, p.clone().add(V3(0.11 - 0.03 * U, 0.03, 0.09)), p.clone().add(V3(0, 0.012, 0)), 38);                                        // macro: face of the snail
    else if (sh === 1) { const a = 0.9 - 1.3 * U; LOOK(kCam, p.clone().add(V3(Math.cos(a) * 0.14, 0.035 + 0.02 * U, Math.sin(a) * 0.14)), p.clone().add(V3(0, 0.012, 0)), 40); }   // slow arc around it
    else if (sh === 2) LOOK(kCam, p.clone().add(V3(-0.02, 0.03, 0.2)), p.clone().add(V3(0.02, 0.008, -0.02)), 40);                                          // side: the ant level with it
    else if (sh === 3) LOOK(kCam, p.clone().add(V3(-0.35 - 0.2 * U, 0.12, 0.28)), p.clone().add(V3(0.2, 0, 0)), 44);                                        // behind: it starts to glide
    else if (sh === 4) LOOK(kCam, p.clone().add(V3(-1.7, 0.45 + 0.3 * U, 0.35)), p.clone().add(V3(2.0, 0.5, -1.6)), 56);                                     // tracking on the promenade
    else if (sh === 5) LOOK(kCam, p.clone().add(V3(-6, 3 + 2 * U, -9)), p.clone().add(V3(8, 2, 16)), 52);                                                  // tracking, road + KTX beyond
    else { const h = 40 * Math.pow(30, u); LOOK(kCam, p.clone().add(V3(-h * 0.6, h, h * 0.9)), p.clone().add(V3(h * 0.5, 0, 0)), 50); }                      // aerial: the streak over Seoul
    kCam.near = sh <= 3 ? 0.004 : sh === 4 ? 0.02 : 0.1; kCam.far = 90000; const camD = kCam.position.distanceTo(p); kw.fog.near = Math.max(900, camD * 1.5); kw.fog.far = Math.max(16000, camD * 8);
    if (sh <= 3) compMat.uniforms.uTilt.value = 0.012;   // macro: shallow focus look
    const sb = sh <= 3 ? 1.5 : 14; Object.assign(kSun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 1, far: 120 }); kSun.shadow.camera.updateProjectionMatrix(); kSun.position.copy(p).addScaledVector(SUN_DIR, 40); kSun.target.position.copy(p);
    { const cd = kCam.position.distanceTo(p); glow.scale.setScalar(Math.max(0.05, cd * 0.06)); const sl = Math.min(3000, v * 0.12), r = Math.max(0.004 + 0.002 * Math.log2(1 + v), cd * 0.006); sStreak.scale.set(r, sl, r); sStreak.position.set(p.x - sl / 2 - 0.03, p.y + 0.012, p.z); }
    shootTo(RTA, kw, kCam); return true;
  }
  if (t < 26) {   // ----- space, km: the snail leaves along the tangent while the Earth curves away -----
    const dk = dS(t) / 1000, sp0 = V3(dk, Math.max(0.01, dk * dk / (2 * RE)) * 0 + 0.01, -0.006);
    trail.visible = true; trail.scale.set(3, dk, 3); trail.position.set(dk / 2, 0.01, 0); trail.rotation.set(0, 0, Math.PI / 2); trail.material.opacity = 0.9;
    plane.visible = iss.visible = false; issRing.visible = true; issRing.position.copy(sp0); issRing.quaternion.copy(spCam.quaternion); const u = (t - 23) / 3;
    LOOK(spCam, V3(-300 + 200 * u, 260 + 900 * u * u, 1400 + 1600 * u), V3(dk * 0.5 + 150, 0, 0), 44); spCam.near = 1; spCam.far = 200000; spCam.aspect = W / H; spCam.updateProjectionMatrix();
    issRing.scale.setScalar(spCam.position.distanceTo(sp0) * 0.025); spSky(200);
    renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam); return true;
  }
  // ----- close-up of the snail in space, Earth behind (overlay) -----
  trail.visible = issRing.visible = false; if (snail.parent !== snS) snS.add(snail);
  snail.position.set(0, 0, 0); snail.rotation.set(0.2, Math.PI / 2 + (t - 26) * 0.4, 0.15 * Math.sin(t)); snailAnim(snail, t, 1.1);
  const u = (t - 26) / 2.5; LOOK(snCam, V3(0.09 - 0.02 * u, 0.04, 0.11 - 0.03 * u), V3(0, 0.01, 0), 40); snCam.aspect = W / H; snCam.updateProjectionMatrix();
  const dk = dS(t) / 1000; spCam.position.set(dk + 300, 120, 600); spCam.lookAt(dk * 0.2, -800, -2000); spCam.fov = 50; spCam.near = 1; spCam.far = 200000; spCam.aspect = W / H; spCam.updateProjectionMatrix(); spSky(200);
  renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(snS, snCam); renderer.autoClear = ac; return true;
}
// ---- motion blur (4 sub-frames) on the fast shots ----
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => t >= 11 && t < 23;
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0.05 * Math.max(0, 1 - Math.abs(t - 15.0) / 0.1) + 0.05 * Math.max(0, 1 - Math.abs(t - 19.0) / 0.1);
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
