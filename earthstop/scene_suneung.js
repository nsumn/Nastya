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
// =================== THE STORY: "만약 수능 시험장에서 방귀 위력이 2초마다 2배가 된다면?" (MODEL: exit wind 1.5 m/s ×2 every 2 s from t = 2; tools/suneung_math.py)
// 0–16 s exam room · 16–22 s out through the roof, up over Seoul (meters, kw) · 22–30 s stratosphere → escape velocity (km, sp; hero drawn in an overlay pass) · 30–33 end card
const F0 = 2.0, FDT = 2.0, FN = 14, END0 = 30.0, LIFT = 16.0;
const fN = t => clamp(Math.floor((t - F0) / FDT) + 1, 0, FN);
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function wind(t) { let e = 0; for (let k = 1; k <= FN; k++) { const x = (t - (F0 + FDT * (k - 1))) / 0.35; e += x <= 0 ? 0 : x >= 1 ? 1 : easeOutBack(x); } return e; }   // smooth "n"
const vAt = t => 1.5 * Math.pow(2, fN(t));
// altitude after lift-off: ∫ v dt with v doubling every 2 s (piecewise), metres
function altAt(t) { if (t <= LIFT) return 0; let a = 0; for (let k = 8; k <= FN; k++) { const t0 = F0 + FDT * (k - 1), t1 = t0 + FDT; if (t <= t0) break; a += 1.5 * Math.pow(2, k) * (Math.min(t, t1) - t0); } return a; }
// ---- people ----
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, y, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
function settle(P, hipY) { P.outer.updateMatrixWorld(true); P.outer.position.y += hipY - boneW(P, 'pelvis').y; P.outer.updateMatrixWorld(true); }
function sitChair(P, lean = 0) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.5); rotL(P, 'calf_' + s, [1, 0, 0], 1.45); } rotL(P, 'thigh_l', [0, 0, 1], 0.08); rotL(P, 'thigh_r', [0, 0, 1], -0.08); rotL(P, 'spine_01', [1, 0, 0], 0.18 - lean); }
function write(P, t, ph = 0) { armsDown(P, 1); rotL(P, 'upperarm_r', [1, 0, 0], -0.55); rotL(P, 'lowerarm_r', [1, 0, 0], -1.25 + 0.06 * Math.sin(t * 7 + ph)); rotL(P, 'lowerarm_r', [0, 1, 0], 0.5); fingers(P, 'r', 0.55, 0.5);
  rotL(P, 'upperarm_l', [1, 0, 0], -0.45); rotL(P, 'lowerarm_l', [1, 0, 0], -1.2); rotL(P, 'lowerarm_l', [0, 1, 0], -0.6); fingers(P, 'l', 0.3, 0.2); rotL(P, 'head', [1, 0, 0], 0.4); }
function brace(P, t, k = 1) { armsDown(P, 0.5); for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -1.1 * k); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.6 * k); rotL(P, 'upperarm_' + s, [0, 0, 1], q * 0.5 * k * (1 + 0.15 * Math.sin(t * 13 + q))); fingers(P, s, 0.2, 0.1); } rotL(P, 'head', [1, 0, 0], -0.25 * k); }
function flail(P, t) { for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], q * (1.6 + 0.5 * Math.sin(t * 11 + q))); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.6 + 0.4 * Math.sin(t * 9)); fingers(P, s, 0.1, 0); }
  rotL(P, 'thigh_l', [1, 0, 0], -0.4 + 0.5 * Math.sin(t * 10)); rotL(P, 'thigh_r', [1, 0, 0], -0.4 - 0.5 * Math.sin(t * 10)); rotL(P, 'calf_l', [1, 0, 0], 0.6); rotL(P, 'calf_r', [1, 0, 0], 0.6); }
function rocket(P, t) { for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], q * 2.55); rotL(P, 'lowerarm_' + s, [0, 0, 1], q * 0.15); fingers(P, s, 0.05, 0); }
  rotL(P, 'thigh_l', [1, 0, 0], 0.08 * Math.sin(t * 17)); rotL(P, 'thigh_r', [1, 0, 0], -0.08 * Math.sin(t * 17)); rotL(P, 'head', [1, 0, 0], 0.25); }
// ---- cast: the student (centre, row 2) + 19 classmates + the proctor ----
const ME = SEATS.find(s => s.r === 1 && s.c === 2);
const hero = makeHuman('hero', { tee: 'mustard' }); cls.add(hero.outer);
const LOOKS = [['girl', 'cream'], ['hero', 'white'], ['man2', null], ['girl', 'pink'], ['hero', 'navy']];
const mates = SEATS.filter(s => s !== ME).map((s, i) => { const [nm, tee] = LOOKS[(i * 3 + s.r) % LOOKS.length]; const P = makeHuman(nm, tee ? { tee } : {}); cls.add(P.outer); return { P, s, ph: hash(i * 2.1) * 6, d: Math.hypot(s.x - ME.x, s.z - ME.z), behind: s.z > ME.z + 0.1 }; });
const proctor = makeHuman('woman2'); cls.add(proctor.outer);
// ---- papers: every desk's 답안지 + 문제지 lift off and join a loop (back wall → ceiling → front) once the wind reaches them ----
const PAPERS = []; SEATS.forEach((s, i) => { for (const m of [s.omr, s.book]) PAPERS.push({ m, p0: m.position.clone(), r0: m.rotation.clone(), rel: 2.6 + Math.hypot(s.x - ME.x, s.z - ME.z) * 0.32 + hash(i * 7 + m.id) * 0.4 + (s.z < ME.z ? 0.8 : 0), k: hash(i * 3 + m.id * 0.1) }); });
const extraSheets = []; for (let i = 0; i < 70; i++) { const m = mesh(new THREE.PlaneGeometry(0.2, 0.28), i % 2 ? omrM : bookM, true, false); room.add(m); extraSheets.push({ m, k: hash(i * 1.37), x: -3.8 + hash(i * 2.9) * 7.6, off: hash(i * 4.1) * 30 }); }
function loopPos(x, s, out) {   // s = distance along the loop (back along the floor-ish level, up the back wall, forward under the ceiling, down the front wall)
  const L1 = 3.6 - ME.z, L2 = 2.2, L3 = 7.0, L4 = 2.2, L = L1 + L2 + L3 + L4; s = ((s % L) + L) % L;
  if (s < L1) out.set(x, 0.9 + 0.3 * Math.sin(s * 2), ME.z + s); else if ((s -= L1) < L2) out.set(x, 0.9 + s, 3.6); else if ((s -= L2) < L3) out.set(x, 2.8, 3.6 - s); else { s -= L3; out.set(x, 2.8 - s, -3.4 + s * (ME.z + 3.4) / L4); }
  return out; }
// ---- wind streaks + the green-ish puff right behind the chair ----
const streakM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const streaks = []; for (let i = 0; i < 60; i++) { const m = mesh(new THREE.PlaneGeometry(0.02, 0.9), streakM, false, false); room.add(m); streaks.push({ m, x: -4 + hash(i * 5.3) * 8, off: hash(i * 9.1) * 15 }); }
const puffT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(225,240,205,.9)'); gr.addColorStop(1, 'rgba(225,240,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const puffs = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, depthWrite: false, opacity: 0 })); room.add(s); puffs.push(s); }
// glass shards (windows burst at 12 s)
const shardM = new THREE.MeshStandardMaterial({ color: '#e6f3fa', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const shards = []; for (let i = 0; i < 160; i++) { const m = mesh(new THREE.PlaneGeometry(0.05 + hash(i) * 0.12, 0.04 + hash(i * 2) * 0.1), shardM, false, false); room.add(m); const p = panes[i % panes.length].position; shards.push({ m, p0: p.clone().add(V3(0, (hash(i * 3) - 0.5) * 1.5, (hash(i * 5) - 0.5) * 0.9)), v: V3(-3 - hash(i * 7) * 9, (hash(i * 11) - 0.3) * 4, (hash(i * 13) - 0.5) * 4) }); }
// ---- jet trail for the flight (meters; lives in whichever scene the hero is in) ----
const trailG = new THREE.Group(); const trailS = []; for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, depthWrite: false, opacity: 0.8, fog: false })); trailG.add(s); trailS.push(s); }
const boomRing = mesh(new THREE.RingGeometry(0.85, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); boomRing.rotation.x = -Math.PI / 2; kw.add(boomRing);
// overlay scene for the hero in space (metres, own lights)
const heroS = new THREE.Scene(); heroS.environment = kw.environment; heroS.environmentIntensity = 0.5;
{ const sl = new THREE.DirectionalLight(0xfff4e6, 3.0); sl.position.set(-3, 4, 6); heroS.add(sl); heroS.add(new THREE.HemisphereLight(0x9cc0ff, 0x304050, 0.6)); }
const hCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 2000);
const floatOMR = mesh(new THREE.PlaneGeometry(0.19, 0.27), omrM, false, false); heroS.add(floatOMR);
// ---- text ----
const CAPS = [[2.05, 3.95, '…<span class="hl">뿡.</span>'], [4.05, 5.95, '뒷자리가 <span class="hl">냄새</span>를 맡았습니다.'], [6.05, 7.95, '<span class="hl">답안지</span>가 날아갑니다.'], [8.05, 9.95, '뒷자리 <span class="hl">책상</span>이 밀립니다.'],
  [10.05, 11.95, '태풍 <span class="hl">매미</span>(51m/s)급 바람.'], [12.05, 13.95, '<span class="hl">KTX</span>보다 빠른 바람.<br>창문이 터집니다.'], [14.05, 15.85, '몸이 의자에서 <span class="hl">뜹니다.</span>'], [16.05, 17.95, '<span class="hl">음속 돌파!</span> (343m/s)'],
  [18.05, 19.95, '<span class="hl">여객기</span>보다 3배 빠르게.'], [20.05, 21.95, '<span class="hl">구름</span>을 뚫고…'], [22.05, 23.95, '비행기 높이(11km)까지 <span class="hl">2초.</span>'], [24.05, 25.95, '하늘이 <span class="hl">까매집니다.</span>'],
  [26.05, 27.95, '<span class="hl">지구 탈출 속도</span><br>(11.2km/s) 돌파!'], [28.05, 29.9, '답안지는… <span class="hl">아직 백지.</span>']];
const $ = id => document.getElementById(id);
const fmtV = v => v < 1000 ? Math.round(v).toLocaleString('ko-KR') + ' m/s' : (v / 1000).toFixed(1) + ' km/s';
function text(t) {
  const n = fN(t), pulse = n > 0 ? Math.max(0, 1 - (t - (F0 + FDT * (n - 1))) / 0.35) : 0;
  $('lab').textContent = '방귀 위력'; $('val').textContent = '×' + Math.pow(2, n).toLocaleString('ko-KR'); $('val').style.transform = `scale(${1 + 0.2 * pulse})`; $('val').style.transformOrigin = 'left center';
  const a = altAt(t); $('sub').textContent = `바람 ${fmtV(vAt(t))}` + (a > 0 ? ` · 고도 ${a < 1000 ? Math.round(a) + 'm' : (a / 1000).toFixed(1) + 'km'}` : '');
  $('hud').style.opacity = 1 - smooth(29.8, 30.2, t); $('title').style.opacity = 1 - smooth(1.6, 2.0, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  if (c) { const k = clamp((t - c[0]) / 0.25, 0, 1); $('cap').style.transform = `scale(${k >= 1 ? 1 : 0.82 + 0.18 * easeOutBack(k)})`; }
  $('flash').style.opacity = Math.max(smooth(15.75, 15.95, t) * (1 - smooth(16.0, 16.4, t)), 0.7 * Math.max(0, 1 - Math.abs(t - 12.05) / 0.12));
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
// ---- the classroom at time t ----
function classAt(t) {
  const W_ = wind(t), n = fN(t);
  // the student
  const P = hero; poseRest(P); place(P, ME.x, ME.z + 0.48, Math.PI);
  if (t < 14) { sitChair(P, t > 8 ? 0.15 : 0); if (t < 4) write(P, t); else brace(P, t, smooth(4, 6, t)); settle(P, 0.5); P.outer.position.x += 0.01 * Math.sin(t * 40) * smooth(6, 14, t); }
  else { const k = smooth(14, 15.9, t); sitChair(P, 0); flail(P, t); settle(P, 0.5 + k * 1.6); P.outer.rotation.x = 0; P.outer.position.x += 0.04 * Math.sin(t * 31) * k; }
  P.outer.updateMatrixWorld(true);
  face(P, t < 2 ? 'neutral' : t < 4 ? 'worried' : t < 8 ? 'scared' : t < 14 ? 'shocked' : 'scared', t, 1, t >= 14 ? 'shocked' : null, t >= 14 ? 0.5 + 0.5 * Math.sin(t * 6) : 0);
  ME.chair.position.set(ME.x, 0, ME.z + 0.48); ME.chair.rotation.set(0, 0, 0);
  // classmates
  for (const m of mates) { const Q = m.P, s = m.s; poseRest(Q);
    let dz = 0, lean = 0; if (m.behind) { const push = clamp((W_ - 3.6) * 0.7 / (1 + m.d * 0.25), 0, 1); dz = Math.min(3.45 - (s.z + 0.48), push * 4.0); lean = push * 0.4; }
    s.desk.position.z = s.z + dz * 0.95; s.chair.position.z = s.z + 0.48 + dz; s.desk.rotation.y = dz * 0.08 * (hash(s.c) - 0.5); s.chair.rotation.y = s.desk.rotation.y;
    place(Q, s.x, s.z + 0.48 + dz, Math.PI); sitChair(Q, lean);
    const turn = m.d < 3.2 ? smooth(m.d < 1.6 ? 2.6 : 4.0, m.d < 1.6 ? 3.1 : 4.6, t) : 0, ang = Math.atan2(ME.x - s.x, ME.z - s.z) - Math.PI;
    if (t < 4.0 || m.d > 3.2) write(Q, t, m.ph); else if (W_ < 4.2) { write(Q, t, m.ph); rotL(Q, 'head', [0, 1, 0], clamp(ang, -1.2, 1.2) * turn); rotL(Q, 'head', [1, 0, 0], -0.4 * turn); } else brace(Q, t + m.ph, 1);
    if (W_ >= 4.2 && m.d > 3.2) brace(Q, t + m.ph, smooth(9, 10, t));
    settle(Q, 0.5);
    face(Q, t < 2.5 ? 'neutral' : m.d < 1.6 && t < 5 ? 'worried' : W_ < 3.5 ? (m.d < 3.2 ? 'surprised' : 'neutral') : W_ < 5 ? 'scared' : 'shocked', t + m.ph); }
  // proctor at the front: walks along, then grabs the teacher's desk
  { const Q = proctor; poseRest(Q); const x = t < 8 ? 2.2 - 0.25 * t : 0.2; place(Q, x, -RD / 2 + 1.6, t < 8 ? -0.2 : 0.4); armsDown(Q, 1); if (t >= 8) brace(Q, t, 1); else { rotL(Q, 'upperarm_l', [1, 0, 0], -0.3); rotL(Q, 'upperarm_r', [1, 0, 0], -0.3); }
    face(Q, t < 4 ? 'neutral' : t < 8 ? 'worried' : 'shocked', t); }
  // papers
  const tmp = V3();
  for (const p of PAPERS) { const a = t - p.rel; if (a <= 0 || W_ < 2.6) { p.m.position.copy(p.p0); p.m.rotation.copy(p.r0); if (p.m === ME.omr || p.m === ME.book) p.m.position.y = 0.742; continue; }
    const sp = Math.pow(2, Math.min(W_, 7)) * 0.11 + 0.6, s = a * sp * (0.8 + 0.4 * p.k);
    const lift = Math.min(1, a / 0.5); loopPos(p.p0.x + Math.sin(a * 2 + p.k * 6) * 0.4, s, tmp); p.m.position.lerpVectors(p.p0, tmp, lift); p.m.rotation.set(a * (3 + p.k * 4), a * (2 + p.k * 3), a * 5 * p.k); }
  for (const e of extraSheets) { const on = W_ > 3.4; e.m.visible = on; if (!on) continue; const sp = Math.pow(2, Math.min(W_, 7)) * 0.11 + 0.6; loopPos(e.x, (t - 6) * sp * (0.7 + 0.5 * e.k) + e.off, tmp); e.m.position.copy(tmp); e.m.rotation.set(t * (4 + e.k * 5), t * 3 * e.k, t * 2); }
  streakM.opacity = 0.18 * smooth(3.2, 5.5, W_);
  for (const st of streaks) { const sp = Math.pow(2, Math.min(W_, 8)) * 0.2 + 1; loopPos(st.x, t * sp + st.off, tmp); st.m.position.copy(tmp); st.m.rotation.set(Math.PI / 2, 0, 0); }
  puffs.forEach((s, i) => { const a = ((t - 2.0) * 1.6 + i / puffs.length) % 1, on = t > 2.0 && t < 16; s.visible = on; if (!on) return; const k = Math.min(1, W_ / 4);
    s.position.set(ME.x + (hash(i) - 0.5) * 0.3 * (1 + a * 3), 0.42 + a * (0.3 + k * 1.2), ME.z + 0.62 + a * (0.5 + k * 3.2)); const sc = 0.15 + a * (0.3 + k * 0.7); s.scale.set(sc, sc, 1); s.material.opacity = (1 - a) * (0.18 + 0.12 * Math.min(1, W_ / 3)) * (1 - 0.6 * smooth(4, 7, W_)); });
  // windows burst at 12 s
  const broke = t >= 12.0; panes.forEach(p => p.visible = !broke);
  shards.forEach((s, i) => { const a = t - 12.0; s.m.visible = a > 0 && a < 2.5; if (!s.m.visible) return; s.m.position.copy(s.p0).addScaledVector(s.v, a).add(V3(0, -4.9 * a * a, 0)); s.m.rotation.set(a * 9 * hash(i), a * 7, a * 5 * hash(i * 2)); });
}
// ---- camera helpers ----
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function heroFlight(t, scene) {   // pose the flying student at the origin of `scene`'s local frame; returns butt position
  const P = hero; if (P.outer.parent !== scene) scene.add(P.outer); poseRest(P); place(P, 0, 0, 0.3); rocket(P, t);
  face(P, t < 20 ? 'shocked' : t < 24 ? 'laugh' : t < 28 ? 'wow' : 'proud', t); P.outer.updateMatrixWorld(true); }
function frameAt(t) {
  compMat.uniforms.uLook.value = 0.0;
  if (t < LIFT) {
    if (hero.outer.parent !== cls) cls.add(hero.outer);
    classAt(t);
    const H_ = boneW(hero, 'head'), sh = Math.min(7, Math.floor(t / 2)), u = (t % 2) / 2;
    const e = x => x * x * (3 - 2 * x), U = e(u);
    if (sh === 0) { if (u < 0.35) LOOK(cCam, V3(0.15, 2.55, -2.9), V3(0, 2.62, -4), 30 + 10 * U); else LOOK(cCam, V3(0.5 - 0.3 * U, 2.1 - 0.5 * U, -3.2 + 1.6 * U), V3(ME.x, 1.0, ME.z + 0.4), 46); }   // clock → dolly back down the aisle
    else if (sh === 1) { const a = -0.5 + 0.5 * U; LOOK(cCam, V3(ME.x + Math.sin(a) * (1.25 - 0.3 * U), 1.08, ME.z - Math.cos(a) * (1.25 - 0.3 * U)), V3(ME.x + 0.1, 1.05, ME.z + 0.9), 44); }      // arc + push on his face, the girl behind
    else if (sh === 2) LOOK(cCam, V3(-2.6 + 4.4 * U, 1.35, ME.z + 2.35), V3(-1.8 + 4.0 * U, 1.0, ME.z + 0.4), 50);                           // truck along the row behind him
    else if (sh === 3) { const a = 1.1 - 0.6 * U; LOOK(cCam, V3(ME.x + Math.sin(a) * 3.2, 1.4 + 0.3 * U, ME.z + 0.8 + Math.cos(a) * 3.2), V3(ME.x, 1.1, ME.z + 1.2), 52); }               // side arc, cards fly past
    else if (sh === 4) LOOK(cCam, V3(0.5 - 0.3 * U, 1.45, 3.75 - 1.2 * U), V3(ME.x, 1.1, ME.z), 60);                                     // back wall, push in against the wind
    else if (sh === 5) LOOK(cCam, V3(3.6, 0.6 + 2.0 * U, 2.8 - 0.4 * U), V3(-1.5, 0.9 + 0.4 * U, 1.5), 60);                                // crane up: students pinned at the back
    else if (sh === 6) LOOK(cCam, V3(2.6 - 0.8 * U, 1.3, -1.0 + 0.8 * U), V3(-4.5, 1.6, -0.2 + 0.5 * U), 52);                                 // to the windows (whip at 12 s)
    else LOOK(cCam, V3(ME.x + 0.9, 0.55 + 0.9 * U, ME.z - 0.6), V3(ME.x, 1.7 + 1.0 * U, ME.z + 0.3), 64);                                    // low, dolly up with him
    cCam.position.add(V3(0.01 * Math.sin(t * 37), 0.01 * Math.cos(t * 41), 0).multiplyScalar(smooth(8, 14, t) * 3));                 // wind shake
    shootTo(RTA, cls, cCam); return true;
  }
  const a = altAt(t), base = V3(-6, 16, 161);   // the roof hole (school at z = 160)
  roofHole.visible = true;
  if (t < 22) {   // ----- out of the roof and up over Seoul (kw, metres) -----
    heroFlight(t, kw); const pos = base.clone().add(V3(0, a + Math.min(1, (t - LIFT) * 6) * 2, 0)); hero.outer.position.copy(pos); hero.outer.updateMatrixWorld(true);
    if (trailG.parent !== kw) kw.add(trailG); trailG.position.copy(pos);
    const len = Math.min(a + 2, 6 + vAt(t) * 0.05); trailS.forEach((s, i) => { const k = i / trailS.length; s.position.set((hash(i) - 0.5) * 0.4, -0.2 - k * len, 0.1); const sc = 0.6 + k * len * 0.12; s.scale.set(sc, sc, 1); s.material.opacity = 0.75 * (1 - k); s.material.fog = true; });
    const bk = (t - LIFT) / 0.7; boomRing.visible = bk > 0 && bk < 1; boomRing.position.copy(base).add(V3(0, 1, 0)); boomRing.scale.setScalar(2 + bk * 60); boomRing.material.opacity = 0.8 * (1 - bk);
    cloudDeck.visible = t >= 19.5; walkersOff();
    if (t < 16.75) LOOK(kCam, V3(36, 3, 262), V3(-6, 55, 160), 64);
    else if (t < 18) { const d = 7; LOOK(kCam, pos.clone().add(V3(d * 0.6, -d * 0.9, d * 0.6)), pos.clone().add(V3(0, 0.9, 0)), 55); }
    else { const d = 6 + Math.min(a * 0.002, 4); LOOK(kCam, pos.clone().add(V3(d * 0.45, d * 0.7, d * 0.75)), pos.clone().add(V3(0, -0.4, 0)), 50); }
    kCam.near = 0.05; kCam.far = 90000; const camD = kCam.position.distanceTo(V3(0, 0, 0)); kw.fog.near = Math.max(900, camD * 0.5); kw.fog.far = Math.max(16000, camD * 6);
    shootTo(RTA, kw, kCam); return true;
  }
  // ----- stratosphere → space (Earth in km in `sp`; the student drawn on top in metres) -----
  heroFlight(t, heroS); hero.outer.position.set(0, 0, 0); hero.outer.updateMatrixWorld(true);
  if (trailG.parent !== heroS) heroS.add(trailG); trailG.position.set(0, 0, 0); trailS.forEach((s, i) => { const k = i / trailS.length; s.position.set((hash(i) - 0.5) * 0.3, -0.2 - k * 9, 0.1); const sc = 0.5 + k * 1.6; s.scale.set(sc, sc, 1); s.material.opacity = 0.7 * (1 - k); s.material.fog = false; });
  const u = smooth(22, 30, t), ang = 0.6 + (t - 22) * 0.18, off = V3(Math.sin(ang) * (3.6 + u), 0.4 - 0.6 * u, Math.cos(ang) * (3.6 + u));
  hero.outer.rotation.set(0.15 * Math.sin(t * 0.9), 0.3 + (t - 22) * 0.25, 0.1 * Math.sin(t * 1.3)); hero.outer.updateMatrixWorld(true);
  LOOK(hCam, off, V3(0, 0.9, 0), 46);
  floatOMR.visible = t > 27.5; floatOMR.position.set(0.7 + 0.1 * Math.sin(t * 2), 1.2 + 0.15 * Math.sin(t * 1.3), 0.6); floatOMR.rotation.set(t * 0.9, t * 0.6, 0.3);
  const aK = a / 1000; spCam.position.set(off.x / 1000, aK + off.y / 1000, off.z / 1000); spCam.quaternion.copy(hCam.quaternion); spCam.fov = hCam.fov; spCam.near = 0.5; spCam.far = 200000; spCam.aspect = W / H; spCam.updateProjectionMatrix();
  spSky(14 + aK * 2.2); plane.visible = trail.visible = iss.visible = issRing.visible = false;
  hCam.aspect = W / H; hCam.updateProjectionMatrix();
  renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(heroS, hCam); renderer.autoClear = ac;
  return true;
};
function walkersOff() {}
// ---- motion blur: average 4 sub-frames over a 180° shutter on the fast shots (vizavi-motion) ----
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => (t >= 6 && t < 16) || (t >= 16 && t < 30);   // fast shots: flying paper, wind, flight
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  // whip-pan on the window burst (12 s): horizontal smear around the cut
  compMat.uniforms.uWhip.value = 0.06 * Math.max(0, 1 - Math.abs(t - 11.95) / 0.12);
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
