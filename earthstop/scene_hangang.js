import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Water } from "three/addons/objects/Water.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

// "만약 한강이 5초 동안 사라진다면?" — Korean channel (뚝딱 @ttukttak3d), ~65 s, cinematic dusk look: Banpo Hangang Park, rainbow fountain, city lights.
// Numbers: tools/hangang_math.py. Story time 5 s stretched over the video with a millisecond countdown.
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
const RTA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) }), RTB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 }, uTilt: { value: 0 }, uWhip: { value: 0 }, tDepth: { value: null }, uDof: { value: 0 }, uFocus: { value: 5 }, uNF: { value: new THREE.Vector2(0.05, 40000) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook, uWhip, uTilt;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    // soft glow around bright HDR spots (lamps, the sun, emissive bits): two rings of taps on the over-1.0 part
    vec3 glow(sampler2D tx, vec2 uv, float ex){ vec3 g=vec3(0.0); for(int i=0;i<12;i++){ float a=float(i)*0.5236+0.26; vec2 d=vec2(cos(a),sin(a))*vec2(1.0,0.5625);
      g+=max(texture2D(tx,uv+d*0.008).rgb*ex-0.8,0.0)*0.45+max(texture2D(tx,uv+d*0.022).rgb*ex-0.8,0.0)*0.35+max(texture2D(tx,uv+d*0.05).rgb*ex-0.8,0.0)*0.2; } return g/12.0; }
    uniform sampler2D tDepth; uniform float uDof, uFocus; uniform vec2 uNF;
    float lz(vec2 q){ float d=texture2D(tDepth,q).r; return uNF.x*uNF.y/(uNF.y-d*(uNF.y-uNF.x)); }
    float coc(float z){ return clamp(uDof*abs(1.0-uFocus/z), 0.0, 22.0); }
    // depth of field: golden-angle gather, each tap weighted by its own blur size (keeps the sharp subject from bleeding), bright lights turn into soft discs
    vec3 dofA(vec2 uv){ float c0=coc(lz(uv)); vec3 base=texture2D(tA,uv).rgb; if(c0<0.4) return base; vec3 acc=base; float wsum=1.0;
      for(int i=1;i<40;i++){ float r=sqrt(float(i)/40.0)*c0, a=float(i)*2.39996; vec2 q=uv+vec2(cos(a),sin(a))*r/vec2(1080.0,1920.0); float cq=coc(lz(q)); float w=smoothstep(r-1.0,r+0.5,cq+0.5); acc+=texture2D(tA,q).rgb*w; wsum+=w; }
      return acc/wsum; }
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 sA=uDof>0.01?dofA(uv):texture2D(tA,uv).rgb; vec3 a=aces(sA*uExpA+0.35*uLook*glow(tA,uv,uExpA)); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB+0.35*uLook*glow(tB,uv,uExpB)); c=mix(a,b,uMix); }
      // whip pan: a horizontal smear along the cut (uWhip = smear length in uv, signed = direction)
      if(abs(uWhip)>0.0005){ vec3 acc=c; for(int i=1;i<=14;i++){ float o=uWhip*(float(i)/14.0-0.5)*2.0; vec2 q=vec2(clamp(uv.x+o,0.0,1.0),uv.y); vec3 sa=aces(texture2D(tA,q).rgb*uExpA); if(uMix>0.001) sa=mix(sa,aces(texture2D(tB,q).rgb*uExpB),uMix); acc+=sa; } c=acc/15.0; }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      // fake tilt-shift (clay look): blur grows above and below a sharp middle band, like a macro shot of a miniature
      if(uTilt>0.001){ float bl=uTilt*smoothstep(0.12,0.42,abs(vUv.y-0.56)); if(bl>0.0005){ vec3 acc=c; for(int i=0;i<12;i++){ float a=float(i)*0.5236; vec2 o=vec2(cos(a),sin(a)*0.5625)*bl*(0.5+0.5*mod(float(i),2.0)); acc+=aces(texture2D(tA,uv+o).rgb*uExpA); } c=acc/13.0; } }
      c=srgb(c);
      // cinematic finish: filmic S-curve, teal shadows / warm highlights split-tone, gentle chromatic fringe at the edges, static fine grain, vignette
      vec2 px=vUv*vec2(1080.0,1920.0); float grain=vn(px/1.3)-0.5;
      vec3 l=c; float lum=dot(l,vec3(0.2126,0.7152,0.0722));
      l=mix(l, l*vec3(0.86,0.98,1.1)+vec3(0.0,0.012,0.022), uLook*(1.0-smoothstep(0.05,0.55,lum))*0.8);     // teal shadows
      l=mix(l, l*vec3(1.07,1.0,0.9), uLook*smoothstep(0.45,0.95,lum)*0.7);                                   // warm highlights
      l=mix(l, smoothstep(vec3(-0.02),vec3(1.03),l), uLook*0.55);                                               // contrast curve
      l=mix(vec3(dot(l,vec3(0.2126,0.7152,0.0722))), l, 1.0+uLook*0.08);                                      // a touch of saturation
      l+=uLook*0.035*grain;
      float vg=length((vUv-0.5)*vec2(1.0,0.72)); l*=1.0-uLook*0.32*smoothstep(0.3,0.78,vg);
      gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }` });
compMat.uniforms.tDepth.value = RTA.depthTexture;
function dof(cam, focus, amt) { const u = compMat.uniforms; u.uDof.value = amt; u.uFocus.value = focus; u.uNF.value.set(cam.near, cam.far); }
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
// =================== faces: eyes with lids (blinking), brows and a mouth on top of people.js heads; setExpr() picks a mood ===================
// head centre in root space ≈ (0, 1.63, 0.005), radius 0.115 scaled (1, 1.13, 1.05) -> the face plane sits at z ≈ 0.12
function addFace(P, skin, hair) { const f = new THREE.Group(); P.root.add(f);
  const eyeW = new THREE.MeshStandardMaterial({ color: '#f6f6f2', roughness: 0.3 }), pup = new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.2 }), lidM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }), brM = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.8 }), mouthM = new THREE.MeshStandardMaterial({ color: '#6a2a2a', roughness: 0.6 });
  const eyes = [], lids = [], brows = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 10), eyeW); e.scale.set(1, 1.05, 0.55); e.position.set(s * 0.042, 1.655, 0.113); f.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), pup); p.position.set(s * 0.042, 1.652, 0.124); f.add(p); eyes.push(p);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.012), lidM); l.position.set(s * 0.042, 1.677, 0.126); f.add(l); lids.push(l);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.009, 0.01), brM); b.position.set(s * 0.042, 1.693, 0.121); f.add(b); brows.push({ b, s }); }
  const blushM = new THREE.MeshStandardMaterial({ color: new THREE.Color(skin).lerp(new THREE.Color('#ff6a6a'), 0.45), roughness: 0.9 });   // rosy cheeks
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 8), blushM); c.scale.set(1.1, 0.7, 0.3); c.position.set(s * 0.056, 1.618, 0.113); f.add(c); }
  const arc = new THREE.TorusGeometry(0.024, 0.0055, 6, 16, Math.PI);
  const smile = new THREE.Mesh(arc, mouthM); smile.rotation.z = Math.PI; smile.position.set(0, 1.592, 0.12); f.add(smile);
  const frown = new THREE.Mesh(arc, mouthM); frown.position.set(0, 1.572, 0.12); f.add(frown);
  const flat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.007, 0.008), mouthM); flat.position.set(0, 1.582, 0.122); f.add(flat);
  const open = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#3a1414', roughness: 0.7 })); open.scale.set(0.02, 0.03, 0.008); open.position.set(0, 1.58, 0.118); f.add(open);
  // lid: 0 = wide open, 1 = closed; brow: + raises the inner ends (worry/pain), - lowers them (anger/focus); y = brow lift
  const E = { neutral: [0.15, 0, 0, 'flat'], happy: [0.05, -0.1, 0.006, 'smile'], tired: [0.55, 0.15, -0.004, 'flat'], pain: [0.45, 0.45, 0.004, 'frown'], yawn: [0.75, 0.25, 0.006, 'open'], sleep: [1, 0, -0.003, 'flat'], grumpy: [0.35, -0.35, -0.004, 'frown'], shock: [0, 0.1, 0.01, 'open'] };
  return { setExpr(name, t = 0) { const [lid0, br, by, m] = E[name] || E.neutral; const blink = name === 'sleep' ? 0 : Math.max(0, 1 - Math.abs(((t + P.h * 7) % 3.7) - 0.08) / 0.08);
    const lid = Math.max(lid0, blink); eyes.forEach(p => p.visible = lid < 0.85); lids.forEach(l => { const h = 0.004 + 0.044 * lid; l.scale.y = h; l.position.y = 1.677 - h / 2 + 0.002; });
    brows.forEach(({ b, s }) => { b.rotation.z = -s * br; b.position.y = 1.693 + by; }); smile.visible = m === 'smile'; frown.visible = m === 'frown'; flat.visible = m === 'flat'; open.visible = m === 'open'; } }; }
// =================== BLOCKY PEOPLE: a square head with a face DRAWN on its front (canvas texture), box torso and box limbs ===================
// Same interface as people.js (outer / root / torso / arms / elbows / legs / knees), so poseIdle / poseSit / poseWalk work on them.
// p.face(expr, t) swaps the face texture (with blinks); the expressions are listed in FACE below.
const HEAD_W = 0.32, HEAD_H = 0.34, HEAD_D = 0.29, HEAD_Y = 1.72, FACE_PX = 256;
// eye: dot | big | happy (^ ^) | closed (sleeping ∪) | squint (— —) | half (droopy) | heart | wide
// brow: [inner tilt (+ worried, - angry), lift]; mouth: smile | grin | soft | flat | frown | o | wavy | side | sob
// look: pupil offset [x, y] (y + = down); extra: tear | tears | sweat | blush (stronger cheeks)
const FACE = {
  neutral:   { eye: 'dot', brow: [0, 0], mouth: 'flat' },
  happy:     { eye: 'dot', brow: [-0.05, 0.02], mouth: 'smile' },
  laugh:     { eye: 'happy', brow: [-0.05, 0.03], mouth: 'grin', extra: ['blush'] },
  proud:     { eye: 'happy', brow: [0.1, 0.01], mouth: 'soft', extra: ['blush'] },
  love:      { eye: 'heart', brow: [0.05, 0.03], mouth: 'smile', extra: ['blush'] },
  surprised: { eye: 'wide', brow: [0, 0.06], mouth: 'o' },
  worried:   { eye: 'dot', brow: [0.35, 0.02], mouth: 'wavy', extra: ['sweat'] },
  sad:       { eye: 'dot', brow: [0.4, 0], mouth: 'frown', look: [0, 0.25], extra: ['tear'] },
  crying:    { eye: 'closed', brow: [0.45, 0.01], mouth: 'sob', extra: ['tears', 'blush'] },
  angry:     { eye: 'dot', brow: [-0.45, -0.01], mouth: 'frown' },
  squint:    { eye: 'squint', brow: [-0.2, -0.015], mouth: 'side' },
  reading:   { eye: 'dot', brow: [-0.1, 0], mouth: 'flat', look: [0, 0.45] },
  sleepy:    { eye: 'half', brow: [0.1, -0.01], mouth: 'flat' },
  sleep:     { eye: 'closed', brow: [0, -0.01], mouth: 'flat' },
  wired:     { eye: 'wide', brow: [0, 0.07], mouth: 'grin', extra: ['sweat'] },                // jittery after the can
  anxious:   { eye: 'wide', brow: [0.35, 0.05], mouth: 'wavy', look: [0.3, 0], extra: ['sweat'] },   // jittery, on edge
  dumb:      { eye: 'cross', brow: [0.25, 0.04], mouth: 'dumb' },                       // cross-eyed, slack open mouth, tongue out
  smirk:     { eye: 'smug', brow: [-0.2, -0.01], brow2: [0.05, 0.06], mouth: 'smirk' },  // half-lidded side glance, one brow up, lopsided smile
};
function drawFace(g, w, h, e, o, blink) {
  const U = x => x * w, Vv = y => y * h, ink = '#1c1614';
  if (o.decal) g.clearRect(0, 0, w, h); else { g.fillStyle = o.skin; g.fillRect(0, 0, w, h); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  const ex = [0.31, 0.69], ey = 0.5, ext = e.extra || [], look = e.look || [0, 0];
  // cheeks
  for (const x of ex) { const r = U(0.11), cy = Vv(0.66), rg = g.createRadialGradient(U(x), cy, 0, U(x), cy, r); rg.addColorStop(0, `rgba(240,110,110,${ext.includes('blush') ? 0.75 : (o.blush ?? 0.45)})`); rg.addColorStop(1, 'rgba(240,110,110,0)'); g.fillStyle = rg; g.fillRect(U(x) - r, cy - r, 2 * r, 2 * r); }
  if (o.wrinkles) { g.strokeStyle = 'rgba(90,50,40,0.35)'; g.lineWidth = U(0.012); for (const [x, s] of [[0.15, -1], [0.85, 1]]) for (const dy of [-0.025, 0.01]) { g.beginPath(); g.moveTo(U(x), Vv(ey + dy)); g.lineTo(U(x + s * 0.05), Vv(ey + dy * 1.6)); g.stroke(); } }
  if (o.freckles) { g.fillStyle = 'rgba(150,80,50,0.55)'; for (let i = 0; i < 18; i++) { const s = i % 2 ? 1 : -1, fx = 0.5 + s * (0.13 + 0.12 * hash(i * 1.7)), fy = 0.58 + 0.09 * hash(i * 2.3); g.beginPath(); g.arc(U(fx), Vv(fy), U(0.009 + 0.006 * hash(i * 3.1)), 0, 7); g.fill(); } }
  // eyes
  const eye = blink && !['closed', 'happy', 'heart'].includes(e.eye) ? 'blink' : e.eye;
  for (const x of ex) {
    const cx = U(x), cy = Vv(ey);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = U(0.03);
    if (eye === 'cross') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, cy, U(0.075), U(0.085), 0, 0, 7); g.fill(); g.lineWidth = U(0.012); g.stroke(); g.fillStyle = ink; g.beginPath(); g.arc(cx + (x < 0.5 ? 1 : -1) * U(0.04), cy + U(0.01), U(0.032), 0, 7); g.fill(); continue; }
    if (eye === 'smug') { const rx = U(0.048), ry = U(0.058), px = cx + 0.35 * rx; g.beginPath(); g.ellipse(px, cy, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px - rx * 0.3, cy + ry * 0.1, rx * 0.3, 0, 7); g.fill();
      g.fillStyle = o.decal ? 'rgba(0,0,0,0)' : o.skin; g.fillRect(cx - U(0.07), cy - ry - U(0.01), U(0.14), ry * 1.05); g.strokeStyle = ink; g.lineWidth = U(0.026); g.beginPath(); g.moveTo(cx - U(0.065), cy - ry * 0.02); g.lineTo(cx + U(0.065), cy - ry * 0.1); g.stroke(); continue; }
    if (eye === 'dot' || eye === 'big' || eye === 'wide') {
      const es = o.eyeS || 1, rx = U((eye === 'dot' ? 0.045 : eye === 'big' ? 0.06 : 0.055) * es), ry = U((eye === 'dot' ? 0.058 : 0.075) * es);
      if (eye === 'wide') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, cy, U(0.085), U(0.1), 0, 0, 7); g.fill(); g.lineWidth = U(0.012); g.stroke(); g.fillStyle = ink; g.beginPath(); g.ellipse(cx, cy, U(0.035), U(0.04), 0, 0, 7); g.fill(); }
      else if (o.kr && eye === 'dot') {   // Korean eye: almond, slightly up-tilted outer corner, a lid line over it (monolid), iris highlight
        const sx = x < 0.5 ? -1 : 1, ax = U(0.06 * es), ay = U(0.036 * es), px = cx + look[0] * ax * 0.6, py = cy + look[1] * ay;
        g.save(); g.translate(cx, cy); g.rotate(-sx * 0.12); g.beginPath(); g.ellipse(0, 0, ax, ay, 0, 0, 7); g.restore(); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px - ax * 0.3, py - ay * 0.35, ax * 0.24, 0, 7); g.fill();
        g.strokeStyle = ink; g.lineWidth = U(0.016); g.beginPath(); g.moveTo(cx - U(0.072), cy - ay * 0.2 + sx * U(0.006)); g.quadraticCurveTo(cx, cy - ay * 1.55, cx + U(0.072), cy - ay * 0.2 - sx * U(0.006)); g.stroke(); }
      else { const px = cx + look[0] * rx, py = cy + look[1] * ry; g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px - rx * 0.35, py - ry * 0.4, rx * 0.36, 0, 7); g.fill(); }
    } else if (eye === 'happy') { g.beginPath(); g.arc(cx, cy + U(0.03), U(0.055), Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (eye === 'closed') { g.beginPath(); g.arc(cx, cy - U(0.02), U(0.055), Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    else if (eye === 'squint') { g.beginPath(); g.moveTo(cx - U(0.055), cy); g.lineTo(cx + U(0.055), cy - U(0.008)); g.stroke(); }
    else if (eye === 'blink') { g.beginPath(); g.moveTo(cx - U(0.05), cy + U(0.01)); g.lineTo(cx + U(0.05), cy + U(0.01)); g.stroke(); }
    else if (eye === 'half') { g.beginPath(); g.ellipse(cx, cy + U(0.015), U(0.045), U(0.04), 0, 0, Math.PI); g.fill(); g.beginPath(); g.moveTo(cx - U(0.06), cy + U(0.012)); g.lineTo(cx + U(0.06), cy + U(0.012)); g.stroke(); }
    else if (eye === 'heart') { g.fillStyle = '#e8304a'; const s = U(0.05); g.beginPath(); g.moveTo(cx, cy + s * 1.1); g.bezierCurveTo(cx - s * 1.6, cy - s * 0.2, cx - s * 0.6, cy - s * 1.3, cx, cy - s * 0.4); g.bezierCurveTo(cx + s * 0.6, cy - s * 1.3, cx + s * 1.6, cy - s * 0.2, cx, cy + s * 1.1); g.fill(); }
  }
  // glasses (drawn): round frames around the eyes
  if (o.glasses) { g.strokeStyle = o.glasses; g.lineWidth = U(0.018); for (const x of ex) { g.beginPath(); g.arc(U(x), Vv(ey), U(0.105), 0, 7); g.stroke(); } g.beginPath(); g.moveTo(U(ex[0] + 0.105), Vv(ey)); g.lineTo(U(ex[1] - 0.105), Vv(ey)); g.stroke(); g.beginPath(); g.moveTo(U(ex[0] - 0.105), Vv(ey)); g.lineTo(0, Vv(ey - 0.03)); g.moveTo(U(ex[1] + 0.105), Vv(ey)); g.lineTo(w, Vv(ey - 0.03)); g.stroke(); }
  // brows: inner end tilts up (worry) or down (anger)
  g.strokeStyle = o.browCol; g.lineWidth = U(0.035 * (o.browW || 1));
  for (const [x, s] of [[ex[0], 1], [ex[1], -1]]) { const [tilt, lift] = s < 0 && e.brow2 ? e.brow2 : e.brow; const by = Vv(0.37 - lift - (o.glasses ? 0.03 : 0)), half = U(0.075); g.beginPath(); g.moveTo(U(x) - s * half, by + U(0.01)); g.lineTo(U(x) + s * half, by - tilt * U(0.09)); g.stroke(); }
  // nose: a thin "L"
  if (!o.noNose) g.strokeStyle = 'rgba(110,60,40,0.75)'; else g.strokeStyle = 'rgba(0,0,0,0)'; g.lineWidth = U(0.014); g.beginPath(); g.moveTo(U(0.5), Vv(0.53)); g.lineTo(U(0.48), Vv(0.63)); g.lineTo(U(0.53), Vv(0.635)); g.stroke();
  if (o.mustache) { g.fillStyle = o.mustache; g.beginPath(); g.ellipse(U(0.44), Vv(0.69), U(0.075), U(0.028), 0.15, 0, 7); g.ellipse(U(0.56), Vv(0.69), U(0.075), U(0.028), -0.15, 0, 7); g.fill(); }
  // mouth
  const my = Vv(0.77), lip = o.lip || '#b8323a'; g.strokeStyle = lip; g.lineWidth = U(0.022);
  const m = e.mouth;
  if (m === 'smirk') { g.beginPath(); g.moveTo(U(0.41), my + U(0.005)); g.quadraticCurveTo(U(0.52), my + U(0.03), U(0.61), my - U(0.04)); g.stroke(); g.beginPath(); g.moveTo(U(0.6), my - U(0.055)); g.lineTo(U(0.625), my - U(0.025)); g.stroke(); }
  else if (m === 'dumb') { g.fillStyle = '#5a1c20'; g.beginPath(); g.ellipse(U(0.5), my + U(0.02), U(0.07), U(0.065), 0.1, 0, 7); g.fill(); g.fillStyle = '#e8707a'; g.beginPath(); g.ellipse(U(0.53), my + U(0.07), U(0.045), U(0.04), 0.2, 0, 7); g.fill(); }
  else if (m === 'smile') { g.beginPath(); g.arc(U(0.5), my - U(0.07), U(0.1), Math.PI * 0.25, Math.PI * 0.75); g.stroke(); }
  else if (m === 'soft') { g.beginPath(); g.arc(U(0.5), my - U(0.05), U(0.07), Math.PI * 0.3, Math.PI * 0.7); g.stroke(); }
  else if (m === 'flat') { g.beginPath(); g.moveTo(U(0.44), my); g.lineTo(U(0.56), my); g.stroke(); }
  else if (m === 'side') { g.beginPath(); g.moveTo(U(0.44), my + U(0.012)); g.quadraticCurveTo(U(0.53), my + U(0.005), U(0.58), my - U(0.02)); g.stroke(); }
  else if (m === 'frown') { g.beginPath(); g.arc(U(0.5), my + U(0.07), U(0.08), Math.PI * 1.25, Math.PI * 1.75); g.stroke(); }
  else if (m === 'wavy') { g.beginPath(); g.moveTo(U(0.42), my); for (let k = 1; k <= 4; k++) g.quadraticCurveTo(U(0.42 + 0.04 * k - 0.02), my + (k % 2 ? -1 : 1) * U(0.02), U(0.42 + 0.04 * k), my); g.stroke(); }
  else if (m === 'o') { g.fillStyle = '#5a1c20'; g.beginPath(); g.ellipse(U(0.5), my, U(0.04), U(0.055), 0, 0, 7); g.fill(); }
  else if (m === 'grin' || m === 'sob') { g.fillStyle = '#5a1c20'; g.beginPath(); if (m === 'grin') { g.moveTo(U(0.38), my - U(0.03)); g.lineTo(U(0.62), my - U(0.03)); g.quadraticCurveTo(U(0.6), my + U(0.12), U(0.5), my + U(0.11)); g.quadraticCurveTo(U(0.4), my + U(0.12), U(0.38), my - U(0.03)); } else { g.moveTo(U(0.41), my + U(0.05)); g.quadraticCurveTo(U(0.5), my - U(0.08), U(0.59), my + U(0.05)); g.closePath(); } g.fill();
    if (m === 'grin') { g.fillStyle = '#ffffff'; g.fillRect(U(0.4), my - U(0.03), U(0.2), U(0.03)); g.fillStyle = '#e8707a'; g.beginPath(); g.ellipse(U(0.5), my + U(0.08), U(0.05), U(0.025), 0, 0, 7); g.fill(); } }
  // tears / sweat
  const drop = (x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(U(x), Vv(y) - s * 1.6); g.quadraticCurveTo(U(x) + s, Vv(y), U(x), Vv(y) + s); g.quadraticCurveTo(U(x) - s, Vv(y), U(x), Vv(y) - s * 1.6); g.fill(); };
  if (ext.includes('tear')) drop(ex[1] + 0.02, 0.62, U(0.025), '#6ab8f0');
  if (ext.includes('tears')) for (const x of ex) { g.fillStyle = 'rgba(110,185,240,0.85)'; g.fillRect(U(x) - U(0.015), Vv(ey + 0.03), U(0.03), Vv(0.3)); }
  if (ext.includes('sweat')) drop(0.86, 0.3, U(0.03), '#8ccaf2');
}
const faceCache = {};
// the face as a decal on a curved head: the front triangles of the head geometry with a flat front projection for UVs
function decalGeo(geo, span) { const g = geo.toNonIndexed(), P = g.attributes.position, N = g.attributes.normal, pos = [], nor = [], uv = [];
  for (let i = 0; i < P.count; i += 3) { let cz = 0; for (let k = 0; k < 3; k++) cz += N.getZ(i + k); if (cz / 3 < 0.25) continue;
    for (let k = 0; k < 3; k++) { const x = P.getX(i + k), y = P.getY(i + k), z = P.getZ(i + k); pos.push(x, y, z); nor.push(N.getX(i + k), N.getY(i + k), N.getZ(i + k)); uv.push(x / span + 0.5, y / span + 0.5); } }
  const d = new THREE.BufferGeometry(); d.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); d.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); d.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return d; }
function faceTex(o, name, blink) { const k = o.key + name + (blink ? 'b' : ''); if (!faceCache[k]) { const c = document.createElement('canvas'); c.width = FACE_PX; c.height = Math.round(FACE_PX * HEAD_H / HEAD_W); drawFace(c.getContext('2d'), c.width, c.height, FACE[name] || FACE.neutral, o, blink); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; faceCache[k] = t; } return faceCache[k]; }
// jeans: a denim twill with faded knees and an orange stitch down the outer seam; the hips get pocket arcs
const denimTex = (pocket) => canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#3d5f8f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) { g.fillStyle = pick(['rgba(255,255,255,0.07)', 'rgba(0,0,0,0.10)', 'rgba(120,160,210,0.12)']); g.fillRect(rnd() * w, rnd() * h, R(2, 6), 1); }
  for (let y = -w; y < h; y += 6) { g.strokeStyle = 'rgba(0,0,20,0.12)'; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + w); g.stroke(); }
  if (!pocket) { const gr = g.createRadialGradient(w / 2, h * 0.45, 4, w / 2, h * 0.45, 60); gr.addColorStop(0, 'rgba(200,220,240,0.35)'); gr.addColorStop(1, 'rgba(200,220,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  g.strokeStyle = '#d89040'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(8, 0); g.lineTo(8, h); g.moveTo(w - 8, 0); g.lineTo(w - 8, h); g.stroke();
  if (pocket) { g.beginPath(); g.arc(18, 40, 46, 0, Math.PI / 2); g.stroke(); g.beginPath(); g.arc(w - 18, 40, 46, Math.PI / 2, Math.PI); g.stroke(); g.setLineDash([]); g.fillStyle = '#c8a050'; g.fillRect(w / 2 - 6, 10, 12, 12); } });
let denimLeg = null, denimHip = null;
// 'human' head / body: low-poly meshes made by tools/human_mesh.py (SDF -> marching cubes -> decimation), loaded once.
// Head and hair are in head units (eyes at y=0, x=+-0.19 like the drawn face texture); the body is ONE skinned mesh
// (shoulders flow into the arms) on the makeBlock joints, in two outfits (hoodie | oversized tee), with faces grouped by region (skin, top, top2, sleeve, bottom, cuff, shoe, sole).
const HUMAN_MESH = await fetch('data/human_mesh.json').then(r => r.json()).catch(() => null);
const HUMAN_GEO = {};
function humanGeo(k) { if (HUMAN_GEO[k]) return HUMAN_GEO[k]; const src = k.startsWith('head') ? HUMAN_MESH[k] : HUMAN_MESH.hair[k], g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(src.pos, 3)); g.setIndex(src.idx); g.computeVertexNormals(); return (HUMAN_GEO[k] = g); }
function humanBodyGeo(k) { if (HUMAN_GEO[k]) return HUMAN_GEO[k]; const b = HUMAN_MESH.body[k], g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(b.skinIndex, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(b.skinWeight, 4));
  g.computeVertexNormals(); b.groups.forEach(([, st, n], i) => g.addGroup(st, n, i)); return (HUMAN_GEO[k] = g); }
// front surface of the human body at (x, y): for things stuck on the chest (hoodie strings)
const humanFront = (x, y) => { const P = HUMAN_MESH.body.hoodie.pos; let z = 0; for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i] - x) < 0.03 && Math.abs(P[i + 1] - y) < 0.03 && P[i + 2] > z) z = P[i + 2]; return z; };
let denimHuman = null;
let blockN = 0;
function makeBlock(o = {}) {
  o = { skin: '#e9b98f', hair: '#3a2416', top: '#3a6aa8', bottom: '#2a2e3a', shoe: '#3a2a20', sleeve: true, hairStyle: 'short', h: 1, ...o };
  o.browCol = o.browCol || o.hair; o.key = 'p' + blockN; const blinkOff = (blockN++) * 1.37;
  const outer = new THREE.Group(), body = new THREE.Group(); body.position.y = -0.95; outer.add(body);
  const root = new THREE.Group(); root.scale.setScalar(o.h); body.add(root);
  const torso = new THREE.Group(); root.add(torso);
  const B = (w, h, d, col, x, y, z, par = torso) => { const m = mesh(BOX, typeof col === 'string' ? M(col, { roughness: 0.9 }) : col); m.scale.set(w, h, d); m.position.set(x, y, z); par.add(m); return m; };
  const hum = o.body === 'human' && HUMAN_MESH;
  const legM = o.jeans ? (denimLeg = denimLeg || new THREE.MeshStandardMaterial({ map: denimTex(false), roughness: 0.95 })) : o.bottom;
  if (!hum) {
    B(0.4, 0.5, 0.22, o.top, 0, 1.24, 0); B(0.38, 0.16, 0.205, o.jeans ? (denimHip = denimHip || new THREE.MeshStandardMaterial({ map: denimTex(true), roughness: 0.95 })) : o.bottom, 0, 0.95, 0); B(0.1, 0.08, 0.1, o.skin, 0, 1.52, 0);   // hips slightly thinner than the top (coplanar fronts flickered); neck
    if (o.belt) B(0.385, 0.035, 0.212, o.belt, 0, 1.0, 0);
    if (o.hoodie) { B(0.36, 0.16, 0.1, o.hoodie, 0, 1.5, -0.13); B(0.22, 0.1, 0.02, o.hoodie, 0, 1.12, 0.115); for (const x of [-0.04, 0.04]) B(0.012, 0.12, 0.012, '#f4f4f4', x, 1.38, 0.118); }
    if (o.tee) B(0.16, 0.12, 0.01, o.tee, 0, 1.3, 0.112);
    if (o.collar) B(0.22, 0.05, 0.03, o.collar, 0, 1.47, 0.11);
  } else {   // human body: the skinned mesh is built after the joints (below); here only the hoodie strings
    if (o.hoodie) for (const x of [-0.04, 0.04]) { const st = B(0.012, 0.13, 0.012, '#f4f4f4', x, 1.41, humanFront(x, 1.41) + 0.006); st.rotation.x = -0.15; } }
  // head: front face = the drawn face, other sides = skin
  const skinM = M(o.skin, { roughness: 0.85 }), shape = o.head || 'box'; let head, faceM; const nBefore = torso.children.length;
  if (shape === 'box') { faceM = new THREE.MeshStandardMaterial({ map: faceTex(o, 'neutral', false), roughness: 0.85 });
    head = new THREE.Mesh(BOX, [skinM, skinM, skinM, skinM, faceM, skinM]); head.scale.set(HEAD_W, HEAD_H, HEAD_D); }
  else {   // 'round' = a ball, 'soft' = a cube with rounded corners; the face is a transparent decal on the front
    o.decal = true; if (shape === 'human') o.noNose = true; const geo = shape === 'round' ? new THREE.SphereGeometry(0.5, 40, 28) : shape === 'human' ? humanGeo(o.headMesh || (o.chubbyHead ? 'head_chubby' : 'head')) : new RoundedBoxGeometry(1, 1, 1, 5, 0.16);
    const sc = { round: [1.1, 1.08, 1.15], human: [1.12, 1.2, 1.2], soft: [1, 1, 1] }[shape]; head = new THREE.Mesh(geo, shape === 'human' ? M(o.skin, { roughness: 0.8, flatShading: true }) : skinM); if (shape === 'human') head.scale.setScalar(0.42); else head.scale.set(HEAD_W * sc[0], HEAD_H * sc[1], HEAD_D * sc[2]);
    faceM = new THREE.MeshStandardMaterial({ map: faceTex(o, 'neutral', false), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.85 });
    head.add(new THREE.Mesh(decalGeo(geo, 1), faceM)); }
  head.position.set(0, HEAD_Y, 0); head.castShadow = true; torso.add(head);
  if (shape === 'round' || shape === 'human') {   // round / human head: ears are balls, hair is a tilted cap of a slightly bigger sphere
    const hsx = head.scale, hm = M(o.hair, { roughness: 0.95 }), hs = o.hairStyle;
    if (shape === 'human') { const hk = { short: 'quiff', quiff: 'quiff', bangs: 'fringe', fringe: 'fringe', mop: 'curly', twoblock: 'twoblock' }[hs];   // ears are part of the head mesh
      if (hk) { const m = mesh(humanGeo(hk), M(o.hair, { roughness: 0.95, flatShading: true })); m.scale.setScalar(0.42); m.position.set(0, HEAD_Y, 0); torso.add(m); }
    } else
    for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.035, 10, 8), skinM); e.position.set(s * hsx.x * 0.5, HEAD_Y - 0.01, 0); torso.add(e); }
    const cap = (theta, tilt, k = 1.07) => { const m = mesh(new THREE.SphereGeometry(0.5, 32, 20, 0, Math.PI * 2, 0, theta), hm); m.scale.set(hsx.x * k, hsx.y * k, hsx.z * k); m.position.set(0, HEAD_Y, 0); m.rotation.x = tilt; torso.add(m); return m; };
    if (shape !== 'human' && hs === 'short') cap(Math.PI * 0.42, -0.55);
    if (shape !== 'human' && hs === 'bangs') cap(Math.PI * 0.5, -0.42);
    if (hs === 'long') { cap(Math.PI * 0.55, -0.5); const b = mesh(new RoundedBoxGeometry(1, 1, 1, 4, 0.3), hm); b.scale.set(hsx.x * 1.05, 0.42, 0.12); b.position.set(0, HEAD_Y - 0.17, -hsx.z * 0.36); torso.add(b);
      for (const s of [-1, 1]) { const l = mesh(new THREE.CapsuleGeometry(0.045, 0.24, 4, 10), hm); l.position.set(s * hsx.x * 0.47, HEAD_Y - 0.12, -0.03); torso.add(l); } }
    if (hs === 'curly') for (let i = 0; i < 60; i++) { const a = hash(i * 3.1 + 7) * Math.PI * 2, el = Math.acos(1 - hash(i * 5.7 + 1) * 1.1) * 0.95, d = V3(Math.sin(el) * Math.cos(a), Math.cos(el), Math.sin(el) * Math.sin(a)); d.applyAxisAngle(V3(1, 0, 0), -0.45); if (d.z > 0.55 && d.y < 0.75) continue;
      const c = mesh(new THREE.SphereGeometry(0.04, 8, 6), hm); c.position.set(d.x * hsx.x * 0.52, HEAD_Y + d.y * hsx.y * 0.52, d.z * hsx.z * 0.52); torso.add(c); }
    if (hs === 'bald') for (const s of [-1, 1]) { const c = mesh(new THREE.SphereGeometry(0.05, 10, 8), hm); c.scale.set(0.5, 1, 1.4); c.position.set(s * hsx.x * 0.48, HEAD_Y + 0.02, -0.04); torso.add(c); }
  } else {
  B(0.03, 0.06, 0.05, o.skin, -HEAD_W / 2 - 0.012, HEAD_Y - 0.01, 0); B(0.03, 0.06, 0.05, o.skin, HEAD_W / 2 + 0.012, HEAD_Y - 0.01, 0);   // ears
  const top = HEAD_Y + HEAD_H / 2, hs = o.hairStyle, hc = o.hair;
  if (hs === 'short' || hs === 'bangs' || hs === 'long') { B(HEAD_W + 0.02, 0.06, HEAD_D + 0.02, hc, 0, top + 0.02, -0.002); B(HEAD_W + 0.02, HEAD_H * 0.75, 0.04, hc, 0, top - HEAD_H * 0.35, -HEAD_D / 2 - 0.012); for (const s of [-1, 1]) B(0.02, 0.09, HEAD_D * 0.8, hc, s * (HEAD_W / 2 + 0.006), top - 0.05, -0.02); }
  if (hs === 'short') B(HEAD_W + 0.02, 0.025, 0.03, hc, 0, top - 0.008, HEAD_D / 2 - 0.004);
  if (hs === 'bangs') B(HEAD_W + 0.02, 0.06, 0.03, hc, 0, top - 0.025, HEAD_D / 2 + 0.002);
  if (hs === 'long') { B(HEAD_W + 0.02, 0.05, 0.03, hc, 0, top - 0.02, HEAD_D / 2 + 0.002); for (const s of [-1, 1]) B(0.035, HEAD_H + 0.1, HEAD_D * 0.9, hc, s * (HEAD_W / 2 + 0.016), top - 0.17, -0.01); B(HEAD_W + 0.06, 0.36, 0.05, hc, 0, top - 0.26, -HEAD_D / 2 - 0.02); }
  if (hs === 'curly') { const cm = M(hc, { roughness: 1 }); for (let i = 0; i < 46; i++) { const a = hash(i * 3.1 + 7) * Math.PI * 2, r = Math.sqrt(hash(i * 5.7 + 1)), s = mesh(new THREE.SphereGeometry(0.034, 8, 6), cm); s.position.set(Math.cos(a) * r * HEAD_W * 0.55, top + 0.02 + 0.03 * hash(i), Math.sin(a) * r * HEAD_D * 0.55 - 0.01); torso.add(s); }
    for (let i = 0; i < 18; i++) { const s = mesh(new THREE.SphereGeometry(0.03, 8, 6), cm), side = i % 2 ? 1 : -1, k = Math.floor(i / 2) / 8; s.position.set(side * (HEAD_W / 2 + 0.005), top - 0.02 - k * 0.06, lerp(0.06, -0.12, hash(i * 9.1))); torso.add(s); } }
  if (hs === 'bald') { for (const s of [-1, 1]) B(0.02, 0.07, HEAD_D * 0.7, hc, s * (HEAD_W / 2 + 0.006), top - 0.09, -0.03); B(HEAD_W + 0.02, 0.08, 0.03, hc, 0, top - 0.1, -HEAD_D / 2 - 0.01); }
  }
  if (o.cap) { const top = HEAD_Y + HEAD_H / 2; B(HEAD_W + 0.03, 0.07, HEAD_D + 0.03, o.cap, 0, top + 0.025, 0); B(HEAD_W * 0.9, 0.02, 0.13, o.cap, 0, top - 0.005, (o.capBack ? -1 : 1) * (HEAD_D / 2 + 0.06)); }
  // the head and everything on it go into one group, so o.headS can make the head bigger (cuter proportions)
  const headG = new THREE.Group(); headG.position.set(0, HEAD_Y, 0); torso.add(headG); for (const c of torso.children.slice(nBefore, -1)) { c.position.y -= HEAD_Y; headG.add(c); } headG.scale.setScalar(o.headS || 1); headG.position.y = HEAD_Y + (HEAD_H / 2) * ((o.headS || 1) - 1) * 0.9; if (hum) headG.position.y += 0.06;   // the human body has a real neck
  // limbs (groups at the joints)
  const arms = [], elbows = [], legs = [], knees = [];
  if (!hum) {
  for (const sx of [-0.255, 0.255]) { const sh = new THREE.Group(); sh.position.set(sx, 1.45, 0); root.add(sh); B(0.11, 0.3, 0.12, o.top, 0, -0.13, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.28; sh.add(el); B(0.1, 0.24, 0.11, o.sleeve ? o.top : o.skin, 0, -0.11, 0, el); B(0.085, 0.09, 0.1, o.skin, 0, -0.27, 0, el); arms.push(sh); elbows.push(el); }
  for (const sx of [-0.1, 0.1]) { const hp = new THREE.Group(); hp.position.set(sx, 0.9, 0); root.add(hp); B(0.15, 0.42, 0.16, legM, 0, -0.2, 0, hp);
    const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn); B(0.14, 0.4, 0.15, legM, 0, -0.2, 0, kn); if (o.jeans) B(0.152, 0.05, 0.162, '#5a7aa8', 0, -0.37, 0, kn); B(0.15, 0.08, 0.24, o.shoe, 0, -0.43, 0.04, kn); legs.push(hp); knees.push(kn); }   // (jeans: rolled cuff)
  } else {   // human: bare joints, then one skinned mesh bound to them (rest pose = arms down, legs straight)
    for (const sx of [-0.255, 0.255]) { const sh = new THREE.Group(); sh.position.set(sx, 1.45, 0); root.add(sh); const el = new THREE.Group(); el.position.y = -0.28; sh.add(el); arms.push(sh); elbows.push(el); }
    for (const sx of [-0.1, 0.1]) { const hp = new THREE.Group(); hp.position.set(sx, 0.9, 0); root.add(hp); const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn); legs.push(hp); knees.push(kn); }
    if (o.jeans && !denimHuman) { const t = denimTex(false); t.wrapS = t.wrapT = THREE.RepeatWrapping; denimHuman = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, flatShading: true }); }
    const F = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }), topC = new THREE.Color(o.top);
    const mats = { skin: F(o.skin), top: F(o.top), top2: F(topC.clone().multiplyScalar(0.82)), sleeve: F(o.sleeve ? o.top : o.skin), bottom: o.jeans ? denimHuman : F(o.bottom),
      cuff: F(o.jeans ? '#5a7aa8' : o.bottom), shoe: F(o.shoe), sole: F(o.sole || '#e6e2da') };
    const outfit = o.outfit || (o.hoodie ? 'hoodie' : o.fat ? 'chubby' : 'tee'), geo = humanBodyGeo(outfit), bodyM = new THREE.SkinnedMesh(geo, HUMAN_MESH.body[outfit].groups.map(([r]) => mats[r]));   // no hoodie = oversized tee bodyM.castShadow = bodyM.receiveShadow = true; bodyM.frustumCulled = false;
    if (o.collar) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.019, 5, 16), F(topC.clone().multiplyScalar(0.7))); c.rotation.x = Math.PI / 2 + 0.06; c.scale.set(1, 0.92, 1); c.position.set(0, o.collar, 0.0); torso.add(c); }   // crew-neck rib, darker than the tee
    root.add(bodyM); outer.updateMatrixWorld(true);
    bodyM.bind(new THREE.Skeleton([root, torso, arms[0], elbows[0], arms[1], elbows[1], legs[0], knees[0], legs[1], knees[1]]), bodyM.matrixWorld); }
  const p = { outer, root, torso, head, arms, elbows, legs, knees, h: o.h, sx: [-1, 1], o };
  p.face = (name, t = 0) => { const ph = (t + blinkOff) % 3.9, blink = t >= 0 && ph < 0.12; faceM.map = faceTex(o, name, blink); };
  return p;
}
// =================== BANPO HANGANG PARK AT DUSK (meters; +z = the south-bank park, river from z=-12 to z=-812, north bank beyond; west = -x) ===================
// The river can vanish: water plane hidden → the real bed shows (stone revetment slopes, mud, rocks, lost stuff), WATER_Y = -1.5, bed ~ -7.
const hw = new THREE.Scene();
const hCam = new THREE.PerspectiveCamera(38, W / H, 0.05, 40000); hw.add(hCam);
const WATER_Y = -1.5, BED_Y = -7.0, RIV_N = -812, RIV_S = -12, BR_X = -150;   // Banpo Bridge runs north at x = 120
hw.fog = new THREE.FogExp2('#9a7c8c', 0.00048);
// ---- dusk sky: deep blue zenith, pink-orange band low in the west, thin lit clouds ----
const SUN_DIR = V3(-0.93, 0.035, -0.36).normalize();   // sun just above the horizon, west-northwest (down the river)
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN_DIR }, uDark: { value: 0.3 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform vec3 uSun; uniform float uDark; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0); float sw=max(dot(normalize(vec3(d.x,0.0,d.z)),normalize(vec3(uSun.x,0.0,uSun.z))),0.0);
      vec3 zen=vec3(0.07,0.11,0.26), mid=vec3(0.22,0.27,0.52), horE=vec3(0.52,0.42,0.62), horW=vec3(1.45,0.62,0.30);
      vec3 hor=mix(horE, horW, pow(sw,2.2)); vec3 c=mix(hor, mid, smoothstep(0.0,0.22,y)); c=mix(c, zen, smoothstep(0.18,0.75,y));
      c+=vec3(1.2,0.55,0.25)*pow(sw,8.0)*exp(-y*14.0)*1.2;                      // glow around the set sun
      vec2 uv=d.xz/(d.y+0.08)*1.1; float cl=fbm(uv*vec2(0.6,2.2)+vec2(1.3,0.2)); cl=smoothstep(0.55,0.8,cl)*smoothstep(0.015,0.08,d.y)*(1.0-smoothstep(0.3,0.6,d.y));
      vec3 cc=mix(vec3(0.32,0.28,0.45), vec3(1.6,0.7,0.45), pow(sw,3.0)); c=mix(c, cc, cl*0.75);
      if(d.y<0.0) c=hor*0.6;
      c*=1.0-0.75*uDark; gl_FragColor=vec4(c,1.0); }` });
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), skyMat); skyDome.frustumCulled = false; skyDome.renderOrder = -10; hw.add(skyDome);
{ const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  hw.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 1, 400).texture; hw.environmentIntensity = 0.45; }
const hSun = new THREE.DirectionalLight(0xff9a5c, 1.6); hSun.castShadow = true; hSun.shadow.mapSize.set(4096, 4096);
Object.assign(hSun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 200 }); hSun.shadow.bias = -0.0004; hSun.shadow.normalBias = 0.03; hSun.shadow.radius = 5;
hw.add(hSun, hSun.target);
function aimSun(x, z) { hSun.target.position.set(x, 0, z); hSun.position.set(x, 0, z).add(V3(SUN_DIR.x, 0.32, SUN_DIR.z).normalize().multiplyScalar(80)); }
aimSun(0, 4);
const hRim = new THREE.DirectionalLight(0xffa86a, 2.2); hw.add(hRim, hRim.target);
const hHemi = new THREE.HemisphereLight(0x6f84c8, 0x2a2428, 0.6); hw.add(hHemi);
// ---- textures ----
const grassTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4f7a36'; g.fillRect(0, 0, w, h); speckle(g, w, h, 90000, ['#3f6a2a', '#5e8a3e', '#6a9646', '#456f2e', '#577f37', '#7aa452', '#3a5f26'], 3);
  for (let i = 0; i < 1400; i++) { g.strokeStyle = pick(['rgba(130,170,80,.5)', 'rgba(40,70,30,.5)']); g.lineWidth = 1; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-2, 2), y - R(4, 9)); g.stroke(); } });
const paveTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#8a8580'; g.fillRect(0, 0, w, h); speckle(g, w, h, 12000, ['#7d7873', '#96918b', '#85807a'], 2); g.fillStyle = '#3d6fa8'; g.fillRect(0, h * 0.42, w, h * 0.16);   // blue bike lane
  g.fillStyle = 'rgba(240,240,230,.8)'; for (let x = 0; x < w; x += 64) g.fillRect(x, h * 0.49, 34, 3); });
const stoneTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6d675f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { const x = rnd() * w, y = rnd() * h, r = R(10, 26); g.fillStyle = pick(['#7a746b', '#5e5850', '#857e74', '#6a645b', '#4f4a44']); g.beginPath(); g.ellipse(x, y, r, r * R(0.6, 0.9), R(0, 3), 0, 7); g.fill(); g.strokeStyle = 'rgba(30,28,25,.55)'; g.lineWidth = 2; g.stroke(); } });
const mudTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4a4034'; g.fillRect(0, 0, w, h); speckle(g, w, h, 60000, ['#3d342a', '#574b3d', '#625545', '#2f2820', '#6b6150'], 3);
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(120,130,140,.18)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, R(10, 40), R(4, 12), R(0, 3), 0, 7); g.fill(); }   // wet puddles (sky sheen)
  for (let i = 0; i < 260; i++) { g.fillStyle = pick(['#8a8378', '#6e675d', '#9a9284']); g.beginPath(); g.ellipse(rnd() * w, rnd() * h, R(2, 7), R(2, 5), R(0, 3), 0, 7); g.fill(); } });
function rep(t, x, y) { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; }
// ---- park ground, promenade with the bike lane, then the stone revetment slope down to the bed ----
const park = mesh(new THREE.PlaneGeometry(3000, 500), new THREE.MeshStandardMaterial({ map: rep(grassTex, 600, 100), roughness: 1, color: '#7d8a78' }), false, true); park.rotation.x = -Math.PI / 2; park.position.set(0, 0, 246); hw.add(park);
const pave = mesh(new THREE.PlaneGeometry(3000, 6), new THREE.MeshStandardMaterial({ map: rep(paveTex, 600, 1), roughness: 0.9 }), false, true); pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0.02, -6); hw.add(pave);
// riverbed as one displaced surface: revetment slopes on both banks (stones), mud in between with ridges and channels
const bedGeo = new THREE.PlaneGeometry(3000, 840, 300, 120); bedGeo.rotateX(-Math.PI / 2);
function bedMud(z) { return clamp((-18 - z) / 12, 0, 1) * clamp((z - (RIV_N + 12)) / 12, 0, 1); }   // 0 on the stone slopes, 1 on the mud
function bedHeight(x, z) { const s = clamp((-9 - z) / 9, 0, 1), nn = clamp((z - (RIV_N + 3)) / -9, 0, 1);
  let y = lerp(-0.2, BED_Y, smooth(0, 1, s)); y = lerp(y, -0.2, smooth(0, 1, nn));
  return y + bedMud(z) * (0.5 * Math.sin(x * 0.013 + z * 0.02) + 0.35 * Math.sin(x * 0.05 - z * 0.031) + 0.9 * Math.sin(z * 0.0075) - 0.6 + 0.12 * Math.sin(x * 0.3 + z * 0.4)); }
{ const P = bedGeo.attributes.position, col = [];
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i) - 412; P.setY(i, bedHeight(x, z)); P.setZ(i, z); const c = bedMud(z); col.push(c, c, c); }
  bedGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bedGeo.computeVertexNormals(); }
const bedMat = new THREE.MeshStandardMaterial({ map: rep(mudTex, 700, 196), roughness: 0.5, metalness: 0.05, envMapIntensity: 0.9, color: '#8a8278' });   // wet mud: shiny
bedMat.onBeforeCompile = (sh) => { sh.uniforms.tStone = { value: rep(stoneTex, 300, 80) };
  sh.fragmentShader = 'uniform sampler2D tStone;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    vec4 st = texture2D(tStone, vMapUv * vec2(0.43, 0.41)); vec3 macro = texture2D(map, vMapUv * 0.061).rgb; diffuseColor.rgb *= 0.55 + 0.9 * macro; diffuseColor.rgb = mix(st.rgb * vec3(0.95,0.93,0.9), diffuseColor.rgb, vColor.r); diffuseColor.rgb /= max(vColor.r * 0.0 + 1.0, 1.0);`).replace('#include <color_fragment>', ''); };
bedMat.vertexColors = true;
const bed = mesh(bedGeo, bedMat, false, true); hw.add(bed);
// the water: planar-reflecting surface (three.js Water) — hidden while the river is gone
const waterNormals = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = x / w * Math.PI * 2, b = y / h * Math.PI * 2;
  const nx = 0.5 * Math.sin(a * 3 + Math.sin(b * 2) * 1.5) + 0.3 * Math.sin(a * 7 + b * 5) + 0.2 * Math.sin(a * 13 - b * 11), ny = 0.5 * Math.cos(b * 4 + Math.sin(a * 3)) + 0.3 * Math.sin(b * 9 - a * 4) + 0.2 * Math.cos(b * 15 + a * 6);
  const i = (y * w + x) * 4; im.data[i] = 128 + nx * 60; im.data[i + 1] = 128 + ny * 60; im.data[i + 2] = 240; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
waterNormals.colorSpace = THREE.NoColorSpace; waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const river = new Water(new THREE.PlaneGeometry(3000, 800), { textureWidth: 1024, textureHeight: 1024, waterNormals, sunDirection: SUN_DIR.clone(), sunColor: 0xff9a5c, waterColor: 0x10203a, distortionScale: 0.7, fog: true, alpha: 1 });
river.material.uniforms.uHR = { value: -1 }; river.material.uniforms.uHC = { value: new THREE.Vector2(BR_X, -412) };
river.material.fragmentShader = river.material.fragmentShader.replace('void main() {', 'uniform float uHR; uniform vec2 uHC;\nvoid main() { if (uHR > 0.0 && distance(worldPosition.xz, uHC) < uHR) discard;');
river.rotation.x = -Math.PI / 2; river.position.set(0, WATER_Y, (RIV_N + RIV_S) / 2 + 0.0); river.material.uniforms.size.value = 1.4; hw.add(river);
// far water (beyond the detailed 3 km) so the river runs to the horizon
const riverFar = mesh(new THREE.PlaneGeometry(30000, 800), new THREE.MeshStandardMaterial({ color: '#1a2a44', roughness: 0.15, metalness: 0.6 }), false, false); riverFar.rotation.x = -Math.PI / 2; riverFar.position.set(0, WATER_Y - 0.05, (RIV_N + RIV_S) / 2); hw.add(riverFar);
const bedFar = mesh(new THREE.PlaneGeometry(30000, 800), new THREE.MeshStandardMaterial({ map: rep(mudTex, 1500, 40), roughness: 0.7 }), false, false); bedFar.rotation.x = -Math.PI / 2; bedFar.position.set(0, BED_Y - 2.6, (RIV_N + RIV_S) / 2); hw.add(bedFar);
const farGround = mesh(new THREE.PlaneGeometry(40000, 20000), M('#2c3426', { roughness: 1 }), false, false); farGround.rotation.x = -Math.PI / 2; farGround.position.set(0, -0.3, 10500); hw.add(farGround);
// ---- city lights: window textures with random lit windows (warm/cool), apartment slabs on the north bank ----
function windowsTex(cols, rows, lit, seedN) { seed = seedN; return canvasTex(cols * 8, rows * 8, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rnd() < lit) { g.fillStyle = pick(['#ffd9a0', '#ffe8c4', '#fff4e0', '#cfe4ff', '#ffc98a']); g.fillRect(c * 8 + 1, r * 8 + 2, 6, 4); } }); }
const aptBase = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#4a4850'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = '#26282f'; g.fillRect(0, y + 2, w, 4); g.fillStyle = '#5a5860'; g.fillRect(0, y + 6, w, 1); } });
const nbank = new THREE.Group(); nbank.position.z = RIV_N; hw.add(nbank);
bx(30000, 8, 26, '#5d5a55', 0, 0.5, -13, nbank); bx(30000, 0.8, 22, '#3a3b3f', 0, 4.6, -14, nbank);   // embankment + Gangbyeon expressway
const city = new THREE.Group(); nbank.add(city);
{ seed = 7702; const wm = []; for (let k = 0; k < 6; k++) wm.push(new THREE.MeshStandardMaterial({ map: rep(aptBase, 6, 24), emissive: '#ffffff', emissiveMap: windowsTex(48, 24, R(0.25, 0.5), 300 + k), emissiveIntensity: 2.2, roughness: 0.8 }));
  const side = M('#7d7b77', { roughness: 0.9 });
  for (let row = 0; row < 8; row++) for (let i = 0; i < 46; i++) { seed = 9000 + row * 100 + i;
    const x = -6400 + i * 280 + R(-70, 70) + (row % 2) * 140, z = -80 - row * 190 + R(-30, 30), f = Math.round(R(14, 32)), wu = Math.round(R(5, 8)), w = wu * 9, h = f * 2.9;
    const b = mesh(BOX, [side, side, side, side, wm[(i + row) % 6], side], false, false); b.scale.set(w, h, 14); b.position.set(x, h / 2, z); b.rotation.y = R(-0.06, 0.06); city.add(b); } }
{ seed = 8803; const lm = []; for (let k = 0; k < 4; k++) lm.push(new THREE.MeshStandardMaterial({ color: '#2c2b33', roughness: 0.9, emissive: '#ffffff', emissiveMap: windowsTex(16, 10, R(0.3, 0.55), 900 + k), emissiveIntensity: 1.6 }));
  for (let i = 0; i < 900; i++) { const x = R(-7000, 7000), z = R(-2600, -60), h = R(8, 40) * (z < -1500 ? 1.6 : 1), w = R(12, 40); const b = mesh(BOX, lm[i % 4], false, false); b.scale.set(w, h, R(12, 30)); b.position.set(x, h / 2, z); city.add(b); } }
// south-bank city behind the park (Banpo apartments) + more bridges downstream (west) with lamp rows
{ seed = 8804; const lm = []; for (let k = 0; k < 4; k++) lm.push(new THREE.MeshStandardMaterial({ color: '#2c2b33', roughness: 0.9, emissive: '#ffffff', emissiveMap: windowsTex(24, 30, R(0.3, 0.55), 950 + k), emissiveIntensity: 1.6 }));
  for (let i = 0; i < 700; i++) { const x = R(-7000, 7000), z = R(320, 3000), h = R(30, 80), w = R(30, 70); const b = mesh(BOX, lm[i % 4], false, false); b.scale.set(w, h, R(12, 18)); b.position.set(x, h / 2, z); hw.add(b); } }
for (const bxp of [-1500, -2900, -4300, -5900]) { const g = grp(bxp, 0, 0, 0, hw); bx(22, 2.4, 860, '#5a5852', 0, 13, -412, g); for (let z = -40; z > -800; z -= 60) bx(4, 14, 4, '#4a4844', 0, 6, z, g);
  for (let z = 0; z > -820; z -= 25) for (const sx of [-1, 1]) bx(0.8, 0.4, 0.8, new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.4, 2.4) }), sx * 10, 19, z, g); }
// office towers + red aircraft-warning lights
const towerLights = [];
{ seed = 4411; for (let i = 0; i < 22; i++) { const h = R(70, 170), w = R(24, 40), m = new THREE.MeshStandardMaterial({ color: '#2a3442', roughness: 0.3, metalness: 0.6, emissive: '#ffffff', emissiveMap: windowsTex(12, 40, 0.55, 600 + i), emissiveIntensity: 1.8 });
  const x = R(-6000, 6000), z = R(-1600, -500), b = mesh(BOX, m, false, false); b.scale.set(w, h, w); b.position.set(x, h / 2, z); city.add(b);
  const rl = mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.4, 0.3) }), false, false); rl.position.set(x, h + 1, z); city.add(rl); towerLights.push(rl); } }
// expressway car lights: two streams (white heads, red tails)
const carHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.35, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 3.8) }), 700);
const carTails = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.35, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.25, 0.15) }), 700);
nbank.add(carHeads, carTails);
function carsAt(t) { const mm = new THREE.Matrix4(); for (let i = 0; i < 700; i++) { const x1 = wrapR(-7000 + i * 20 + hash(i) * 12 + t * 24, -7000, 7000), x2 = wrapR(7000 - i * 20 - hash(i + 9) * 12 - t * 22, -7000, 7000);
  mm.makeTranslation(x1, 5.3, -9); carHeads.setMatrixAt(i, mm); mm.makeTranslation(x2, 5.3, -19); carTails.setMatrixAt(i, mm); } carHeads.instanceMatrix.needsUpdate = carTails.instanceMatrix.needsUpdate = true; }
// Namsan + N Seoul Tower (lit), slightly left of the bridge behind the apartments
const namsan = new THREE.Group(); namsan.position.set(-420, 0, -3600); hw.add(namsan);
{ const g = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const r = 1 + 0.06 * Math.sin(x * 9 + z * 7) + 0.04 * Math.sin(x * 23 - z * 17); P.setXYZ(i, x * r, y, z * r); }
  g.computeVertexNormals(); const hill = mesh(g, M('#1d2a22', { roughness: 1 }), false, false); hill.scale.set(900, 262, 700); namsan.add(hill);
  const tw = new THREE.Group(); tw.position.y = 255; namsan.add(tw); const wht = new THREE.MeshStandardMaterial({ color: '#d8dce8', emissive: '#9fb6ff', emissiveIntensity: 0.9, roughness: 0.5 });
  const shaft = mesh(new THREE.CylinderGeometry(4.2, 6.5, 135, 24), wht, false, false); shaft.position.y = 67; tw.add(shaft);
  for (const [y, r, hh] of [[132, 15, 9], [143, 14, 8], [151, 11, 6]]) { const p = mesh(new THREE.CylinderGeometry(r, r * 0.92, hh, 32), y === 143 ? new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 2.2) }) : wht, false, false); p.position.y = y; tw.add(p); }
  const ant = mesh(new THREE.CylinderGeometry(1.2, 2.6, 82, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 0.6, 0.5) }), false, false); ant.position.y = 196; tw.add(ant); }
// 63 Building (Yeouido, 249 m) on the western horizon: golden glass catching the last of the sunset
const b63 = new THREE.Group(); b63.position.set(-5400, 0, -1100); hw.add(b63);
{ const gold = new THREE.MeshStandardMaterial({ color: '#e0b052', roughness: 0.12, metalness: 0.95, envMapIntensity: 2.2, emissive: '#ff9a40', emissiveIntensity: 0.35 });
  const prof = new THREE.Shape(); prof.moveTo(-36, 0); prof.lineTo(36, 0); prof.lineTo(36, 200); prof.lineTo(20, 235); prof.lineTo(-10, 249); prof.lineTo(-36, 249); prof.lineTo(-36, 0);
  const g = new THREE.ExtrudeGeometry(prof, { depth: 34, bevelEnabled: false }); g.translate(0, 0, -17); const m = mesh(g, gold, false, false); m.rotation.y = Math.PI / 2 - 0.3; b63.add(m); }
// Lotte World Tower far right (east), lit crown
const lotte = new THREE.Group(); lotte.position.set(2600, 0, -5200); hw.add(lotte);
{ const pts = []; for (let i = 0; i <= 24; i++) { const y = i / 24; pts.push(new THREE.Vector2(36 * (1 - 0.82 * Math.pow(y, 1.6)), y * 555)); }
  const g = new THREE.LatheGeometry(pts, 4); g.rotateY(Math.PI / 4); lotte.add(mesh(g, new THREE.MeshStandardMaterial({ color: '#3a4656', roughness: 0.2, metalness: 0.8, emissive: '#ffffff', emissiveMap: windowsTex(8, 90, 0.5, 77), emissiveIntensity: 1.5 }), false, false));
  const crown = mesh(new THREE.ConeGeometry(9, 60, 4, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 3.2, 3.6), transparent: true, opacity: 0.85 }), false, false); crown.position.y = 525; lotte.add(crown); }
// ---- Banpo Bridge: upper deck on piers, Jamsu Bridge low below (submerges in floods), LED strips; the Moonlight Rainbow Fountain from both deck edges ----
const bridge = new THREE.Group(); bridge.position.set(BR_X, 0, 0); hw.add(bridge);
const DECK_Y = 16.5;
{ const conc = M('#7f7d78', { roughness: 0.85 }), dark = M('#55534f', { roughness: 0.9 });
  bx(25, 2.6, 900, conc, 0, DECK_Y, -420, bridge); bx(25.6, 0.9, 900, M('#2e3440', { roughness: 0.5 }), 0, DECK_Y + 1.6, -420, bridge);
  bx(25.4, 0.35, 900, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.2, 2.6) }), 0, DECK_Y - 1.35, -420, bridge);   // blue LED strip under the deck edge
  for (let z = -40; z > -800; z -= 50) { for (const s of [-1, 1]) bx(3.2, DECK_Y - BED_Y, 3.2, conc, s * 7, (DECK_Y + BED_Y) / 2 - 1, z, bridge); bx(22, 2.2, 4, conc, 0, DECK_Y - 2.2, z, bridge); }
  bx(10, 1.0, 800, dark, 0, WATER_Y + 1.6, -412, bridge);   // Jamsu Bridge (low)
  for (let z = -20; z > -800; z -= 12) bx(1.2, WATER_Y + 1.1 - BED_Y, 1.2, dark, 0, (WATER_Y + 1.1 + BED_Y) / 2, z, bridge);
  bx(25, 2.6, 160, conc, 0, DECK_Y, 70, bridge); for (let z = 0; z < 150; z += 30) bx(3, DECK_Y, 3, conc, 0, DECK_Y / 2, z, bridge);
  // street lamps on the deck
  for (let z = 120; z > -820; z -= 30) for (const s of [-1, 1]) { bx(0.25, 6, 0.25, '#2a2c30', s * 12, DECK_Y + 4, z, bridge); bx(0.6, 0.25, 0.4, new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.6, 2.8) }), s * 11.6, DECK_Y + 7, z, bridge); } }
// fountain jets: one tube per nozzle, recomputed per frame (throw, how far down they fall, how much water is left); rainbow colour drifts along the bridge
const JET_N = 110, JET_SEG = 14, JET_SIDES = 5, JZ0 = -70, JZ1 = -640;
const jetGeo = new THREE.BufferGeometry(); const jetVerts = 2 * JET_N * (JET_SEG + 1) * JET_SIDES;
jetGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(jetVerts * 3), 3)); jetGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(jetVerts * 3), 3));
{ const idx = []; for (let j = 0; j < 2 * JET_N; j++) for (let s = 0; s < JET_SEG; s++) for (let k = 0; k < JET_SIDES; k++) { const b = (j * (JET_SEG + 1) + s) * JET_SIDES, k2 = (k + 1) % JET_SIDES;
  idx.push(b + k, b + JET_SIDES + k, b + k2, b + k2, b + JET_SIDES + k, b + JET_SIDES + k2); } jetGeo.setIndex(idx); }
const jetMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, side: THREE.DoubleSide });
const jets = new THREE.Mesh(jetGeo, jetMat); jets.frustumCulled = false; bridge.add(jets);
const mistTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const mist = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: mistTex, size: 11, vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
{ const n = 2 * JET_N * 3, p = new Float32Array(n * 3), c = new Float32Array(n * 3); mist.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); mist.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
mist.frustumCulled = false; bridge.add(mist);
const jetCol = new THREE.Color();
// throw = horizontal reach (m, real max 43), power 0..1 (pumps sucking air → 0), floor = y where the jets end (water surface or the bed)
function setJets(t, throwM = 30, power = 1, floorY = WATER_Y) {
  const P = jetGeo.attributes.position.array, C = jetGeo.attributes.color.array, MP = mist.geometry.attributes.position.array, MC = mist.geometry.attributes.color.array; let v = 0, mi = 0;
  for (let side = 0; side < 2; side++) { const sx = side ? 1 : -1;
    for (let j = 0; j < JET_N; j++) { const z = lerp(JZ0, JZ1, j / (JET_N - 1)), ph = hash(j * 3.3 + side), reach = throwM * power * (0.85 + 0.15 * ph) * (0.92 + 0.08 * Math.sin(t * 2.1 + j * 0.35)), x0 = sx * 12.8, y0 = DECK_Y - 1.0, drop = y0 - floorY, up = 6 * power;
      jetCol.setHSL(wrapR(j / JET_N * 2.2 + t * 0.05 + side * 0.3, 0, 1), 1.0, 0.5); const br = 1.1 * (0.4 + 0.6 * power);
      for (let s = 0; s <= JET_SEG; s++) { const u = s / JET_SEG, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u, r = (0.08 + 0.4 * u * u) * (0.5 + 0.5 * power);
        for (let k = 0; k < JET_SIDES; k++) { const a = k / JET_SIDES * Math.PI * 2; P[v * 3] = x + Math.cos(a) * r * 0.3; P[v * 3 + 1] = y + Math.sin(a) * r; P[v * 3 + 2] = z + Math.cos(a) * r; C[v * 3] = jetCol.r * br; C[v * 3 + 1] = jetCol.g * br; C[v * 3 + 2] = jetCol.b * br; v++; } }
      for (let m = 0; m < 3; m++) { const u = 0.55 + m * 0.2, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u; MP[mi * 3] = x; MP[mi * 3 + 1] = y; MP[mi * 3 + 2] = z + (m - 1) * 1.5; MC[mi * 3] = jetCol.r * power; MC[mi * 3 + 1] = jetCol.g * power; MC[mi * 3 + 2] = jetCol.b * power; mi++; } } }
  jetGeo.attributes.position.needsUpdate = jetGeo.attributes.color.needsUpdate = true; mist.geometry.attributes.position.needsUpdate = mist.geometry.attributes.color.needsUpdate = true; jetGeo.computeBoundingSphere(); }
// ---- Some Sevit floating islands (glowing domes) west of the bridge ----
{ for (const [x, z, s, c] of [[-215, -70, 0.8, '#ffc870'], [-245, -100, 0.65, '#8fc4ff'], [-195, -110, 0.55, '#ff9fcf']]) { const g = grp(x, WATER_Y, z, 0.4, hw);
  const dome = mesh(new THREE.SphereGeometry(16 * s, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1c1f28', emissive: c, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.9 }), false, false); dome.scale.set(1, 0.75, 0.7); g.add(dome);
  bx(36 * s, 1, 26 * s, '#2a2c33', 0, 0, 0, g); bx(36.4 * s, 0.25, 26.4 * s, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(4) }), 0, 0.6, 0, g); g.userData.float = true; } }
// ---- the Hangang cruise boat (lit) ----
const ferry = grp(-260, WATER_Y, -300, Math.PI / 2 + 0.15, hw);
{ const hull = new THREE.Shape(); hull.moveTo(-22, 0); hull.lineTo(18, 0); hull.quadraticCurveTo(24, 0, 26, 2.5); hull.lineTo(-23, 2.5); hull.lineTo(-22, 0);
  const hg = new THREE.ExtrudeGeometry(hull, { depth: 9, bevelEnabled: false }); hg.translate(0, -1.4, -4.5); ferry.add(mesh(hg, M('#e9e6df', { roughness: 0.5 })));
  bx(30, 2.6, 7.6, M('#1a2230', { roughness: 0.15, metalness: 0.6 }), -3, 2.4, 0, ferry); bx(30.4, 0.3, 8, M('#f0ede6'), -3, 3.8, 0, ferry); bx(16, 2.2, 6.6, M('#1a2230', { roughness: 0.15, metalness: 0.6 }), -6, 5.0, 0, ferry); bx(16.4, 0.3, 7, M('#f0ede6'), -6, 6.2, 0, ferry);
  for (const [y, len, x] of [[2.4, 29.6, -3], [5.0, 15.6, -6]]) for (const s of [-1, 1]) bx(len, 1.0, 0.1, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 2.2) }), x, y, s * (y > 3 ? 3.32 : 3.82), ferry);
  bx(48, 0.25, 0.12, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 2.5, 5) }), 1, 1.0, 4.52, ferry); bx(48, 0.25, 0.12, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 2.5, 5) }), 1, 1.0, -4.52, ferry); }
// ---- the park: trees, lamps (with real point lights near the hero), shade tents, picnic mats, people ----
const treeTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2f4a26'; g.fillRect(0, 0, w, h); speckle(g, w, h, 12000, ['#263e1f', '#3a5a2e', '#456a34', '#203619', '#517a3a'], 5); });
const trunkM = M('#3d3128', { roughness: 0.95 }), leafM = new THREE.MeshStandardMaterial({ map: treeTex, roughness: 0.9 });
const treeParts = (() => { const parts = []; const tr = new THREE.CylinderGeometry(0.14, 0.22, 3.0, 7); tr.translate(0, 1.5, 0); parts.push([tr, 0]);
  for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(1, 2); const P = g.attributes.position; for (let j = 0; j < P.count; j++) { const v = V3(P.getX(j), P.getY(j), P.getZ(j)); const k = 1 + 0.14 * Math.sin(v.x * 5 + i) * Math.cos(v.z * 4 + v.y * 3); P.setXYZ(j, v.x * k, v.y * k, v.z * k); }
    g.computeVertexNormals(); const a = i / 6 * Math.PI * 2, r = i ? 0.9 : 0; g.scale(1.3, 1.1, 1.3); g.translate(Math.cos(a) * r, 3.7 + (i ? hash(i) * 0.8 : 1.0), Math.sin(a) * r); parts.push([g, 1]); } return parts; })();
function tree(x, z, s) { const g = grp(x, 0, z, hash(x * 1.3 + z) * 6, hw); g.scale.setScalar(s); for (const [geo, k] of treeParts) g.add(mesh(geo, k ? leafM : trunkM)); return g; }
seed = 515; for (let i = 0; i < 80; i++) { const x = -300 + i * 7.5 + R(-2, 2), z = R(16, 22) + (i % 3) * 8; if (Math.abs(x - BR_X) < 22 || Math.abs(x - 2) < 14) continue; tree(x, z, R(1.0, 1.6)); }
const lampHead = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 5.2, 3.0) });
for (let i = 0; i < 40; i++) { const x = -300 + i * 16; if (Math.abs(x - BR_X) < 18) continue; const l = grp(x, 0, -2.6, 0, hw); bx(0.1, 4.4, 0.1, '#25282c', 0, 2.2, 0, l); const hd = mesh(new THREE.SphereGeometry(0.22, 12, 8), lampHead, false, false); hd.position.set(0, 4.5, 0); l.add(hd); }
for (const x of [-12, 4, 20]) { const pl = new THREE.PointLight(0xffc488, 30, 22, 1.6); pl.position.set(x, 4.3, -2.6); hw.add(pl); }
// shade tents (그늘막): small dome tents in bright colours
function tent(x, z, ry, c) { const g = grp(x, 0, z, ry, hw); const t = mesh(new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI, 0, Math.PI / 2), M(c, { side: THREE.DoubleSide, roughness: 0.8 })); t.scale.set(1.1, 0.95, 1.3); g.add(t); return g; }
const MAT_COLS = ['#3b78c4', '#e9c23c', '#e46a5a', '#5aa070', '#f0f0ec', '#8a6ad0'];
const matTex = (c) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 8; i += 2) { g.fillRect(i * 16, 0, 16, h); g.fillRect(0, i * 16, w, 16); } });
function picnicMat(x, z, ry, c, s = 1.8) { const m = mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: matTex(c), roughness: 0.9 }), false, true); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.015, z); hw.add(m); return m; }
// food: fried-chicken box (open, drumsticks), beer cans, ramyeon cups, a phone
function chickenBox() { const g = new THREE.Group(); const box = M('#f2e6cc', { roughness: 0.8 }); bx(0.34, 0.02, 0.26, box, 0, 0.01, 0, g); for (const [x, z, w, d] of [[0, 0.13, 0.34, 0.01], [0, -0.13, 0.34, 0.01], [0.17, 0, 0.01, 0.26], [-0.17, 0, 0.01, 0.26]]) bx(w, 0.07, d, box, x, 0.04, z, g);
  const lid = bx(0.34, 0.01, 0.26, M('#d8402e', { roughness: 0.7 }), 0, 0.1, -0.2, g); lid.rotation.x = -1.1;
  for (let i = 0; i < 9; i++) { const c = mesh(new THREE.SphereGeometry(0.04, 7, 5), M(pick(['#b8641e', '#c9782a', '#a8541a']), { roughness: 0.6 })); c.scale.set(1.3, 0.75, 0.9); c.position.set(R(-0.12, 0.12), 0.05, R(-0.09, 0.09)); c.rotation.y = R(0, 3); g.add(c); }
  return g; }
function beerCan(c = '#d9b84a') { const g = new THREE.Group(); const can = mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), M(c, { roughness: 0.25, metalness: 0.7 })); can.position.y = 0.06; g.add(can); const top = mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.01, 14), M('#c9ccd0', { roughness: 0.2, metalness: 0.9 })); top.position.y = 0.125; g.add(top); return g; }
function ramenCup() { const g = new THREE.Group(); const cup = mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.1, 18, 1, true), M('#f3efe6', { side: THREE.DoubleSide, roughness: 0.6 })); cup.position.y = 0.05; g.add(cup);
  const band = mesh(new THREE.CylinderGeometry(0.0555, 0.05, 0.035, 18, 1, true), M('#d02a24', { roughness: 0.6 })); band.position.y = 0.07; g.add(band);
  const soup = mesh(new THREE.CircleGeometry(0.052, 18), M('#c8542a', { roughness: 0.25 })); soup.rotation.x = -Math.PI / 2; soup.position.y = 0.085; g.add(soup); return g; }
function phoneMesh() { const g = new THREE.Group(); bx(0.075, 0.155, 0.009, M('#1a1c20', { roughness: 0.3, metalness: 0.5 }), 0, 0, 0, g); const sc = bx(0.068, 0.145, 0.002, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.5, 1.8) }), 0, 0, 0.0055, g); g.userData.screen = sc; return g; }
// people around (blocky humans, sitting on mats), seeded
const CROWD = [];
{ seed = 3311; const tops = ['#e8e4dc', '#2f3a4a', '#c45a4a', '#f2c84a', '#5a7a9a', '#3a6a4a', '#d8a0b0', '#7a5a9a'], skins = ['#f1c9a5', '#e9b98f', '#eec29c', '#d9a37a'];
  for (let i = 0; i < 26; i++) { const x = R(-70, 90), z = R(1.5, 15); if (Math.abs(x) < 7 && z < 9) continue; if (Math.abs(x - BR_X) < 16) continue;
    picnicMat(x, z, R(-0.3, 0.3), pick(MAT_COLS), R(1.6, 2.2)); const nP = 1 + (rnd() < 0.7 ? 1 : 0) + (rnd() < 0.2 ? 1 : 0);
    for (let k = 0; k < nP; k++) { const P = makeBlock({ head: 'human', body: 'human', skin: pick(skins), hair: pick(['#151215', '#2a1e18', '#3a2a20']), browCol: '#1a1416', top: pick(tops), outfit: 'tee_kr', collar: 1.556, jeans: rnd() < 0.6, bottom: pick(['#2f3d5c', '#3a3a40', '#c8c0b0']), shoe: '#f4f4f4', hairStyle: pick(['twoblock', 'short', 'fringe']), headMesh: 'head_kr', kr: true, headS: 0.88, h: R(0.92, 1.0) });
      P.outer.position.set(x + (k - 0.5) * 0.8, 0.17, z + R(-0.3, 0.3)); P.outer.rotation.y = R(-0.5, 0.5) + Math.PI + (rnd() < 0.5 ? 0 : 0.6); hw.add(P.outer); CROWD.push(P); }
    if (rnd() < 0.6) { const cb = chickenBox(); cb.position.set(x + R(-0.3, 0.3), 0.02, z + R(-0.3, 0.3)); hw.add(cb); }
    if (rnd() < 0.4) tent(x + R(1.5, 2.5), z + R(1, 2), R(0, 6), pick(['#3a8ad0', '#f0a030', '#e04a5a', '#4ab07a'])); } }
function sitPose(P, t, ph) { P.legs[0].rotation.set(-1.35, 0, -0.12); P.legs[1].rotation.set(-1.35, 0, 0.12); P.knees[0].rotation.x = 0.35; P.knees[1].rotation.x = 0.35;
  P.arms[0].rotation.set(0.35, 0, 0.12); P.arms[1].rotation.set(0.35, 0, -0.12); P.elbows[0].rotation.x = -0.2; P.elbows[1].rotation.x = -0.2; P.torso.rotation.x = -0.05 + 0.02 * Math.sin(t * 0.9 + ph); }
// bikes (Seoul public bike "따릉이": green frame) along the promenade
function bike(x, z, ry) { const g = grp(x, 0, z, ry, hw); const fr = M('#3fae5a', { roughness: 0.5, metalness: 0.3 }), tire = M('#1a1a1a');
  for (const s of [-0.5, 0.5]) { const w = mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 20), tire); w.position.set(s, 0.36, 0); g.add(w); }
  const b1 = bx(1.0, 0.05, 0.05, fr, 0, 0.6, 0, g); b1.rotation.z = 0.1; const b2 = bx(0.05, 0.5, 0.05, fr, -0.15, 0.6, 0, g); b2.rotation.z = 0.3; bx(0.22, 0.06, 0.1, '#222', -0.25, 0.86, 0, g); bx(0.05, 0.05, 0.5, '#555', 0.45, 0.95, 0, g); bx(0.2, 0.15, 0.25, fr, 0.55, 0.85, 0, g); return g; }
seed = 66; for (let i = 0; i < 8; i++) bike(R(-40, 60), -4.5 + R(-0.4, 0.4), R(-0.2, 0.2));
// ---- the hero (Korean faceted human, dark-green tee) on his own mat, front-row by the river ----
const hero = makeBlock({ head: 'human', body: 'human', skin: '#f1c9a5', hair: '#151215', browCol: '#1a1416', top: '#2f5a40', outfit: 'tee_kr', collar: 1.556, jeans: true, bottom: '#2f3d5c', shoe: '#f4f4f4', hairStyle: 'twoblock', headMesh: 'head_kr', kr: true, browW: 1.25, headS: 0.88 });
hw.add(hero.outer);
const HERO_MAT = V3(0, 0, -0.4); picnicMat(HERO_MAT.x, HERO_MAT.z, 0.1, '#3b78c4', 2.0);
const heroFood = new THREE.Group(); heroFood.position.copy(HERO_MAT); hw.add(heroFood);
{ const cb = chickenBox(); cb.position.set(0.35, 0.02, -0.2); heroFood.add(cb); const b1 = beerCan(); b1.position.set(-0.45, 0.02, -0.3); heroFood.add(b1); const b2 = beerCan('#3a6fb8'); b2.position.set(-0.3, 0.02, -0.5); heroFood.add(b2);
  const r = ramenCup(); r.position.set(0.6, 0.02, 0.25); heroFood.add(r); }
const heroPhone = phoneMesh(); hw.add(heroPhone);

// ---- what lies on the bed (only visible when the river is gone): puddles mirroring the sky, rocks, lost bikes, shopping carts, tyres, a scooter, fish ----
const bedStuff = new THREE.Group(); hw.add(bedStuff); bedStuff.visible = false;
const puddleM = new THREE.MeshStandardMaterial({ color: '#3a4256', roughness: 0.03, metalness: 0.95, envMapIntensity: 1.8, transparent: true, depthWrite: false, alphaMap: canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31); gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#ccc'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) });
{ seed = 1201; for (let i = 0; i < 260; i++) { const near = i < 140, x = near ? R(-80, 80) : R(-1400, 1400), z = near ? R(-110, -22) : R(-790, -30), r = R(1.5, near ? 6 : 18);
    const p = mesh(new THREE.CircleGeometry(1, 20), puddleM, false, false); p.rotation.x = -Math.PI / 2; p.scale.set(r, r * R(0.4, 0.8), 1); p.rotation.z = R(0, 3); p.position.set(x, bedHeight(x, z) + 0.04, z); bedStuff.add(p); }
  const rockG = new THREE.DodecahedronGeometry(1, 0), rockM = M('#7a746a', { roughness: 0.45, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockG, rockM, 900), mm = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 900; i++) { const x = i < 600 ? R(-90, 90) : R(-1400, 1400), z = i < 600 ? R(-120, -16) : R(-800, -16), sc = R(0.15, 0.9);
    q.setFromEuler(new THREE.Euler(R(0, 3), R(0, 3), R(0, 3))); mm.compose(V3(x, bedHeight(x, z) + sc * 0.3, z), q, V3(sc * R(0.8, 1.4), sc * 0.6, sc)); rocks.setMatrixAt(i, mm); }
  rocks.frustumCulled = false; bedStuff.add(rocks);
  const rust = M('#7a4a2a', { roughness: 0.8 }), chrome = M('#9aa0a6', { roughness: 0.35, metalness: 0.8 }), tyreM = M('#1c1c1c', { roughness: 0.9 });
  function lay(o, x, z, ry, tilt = 0) { o.position.set(x, bedHeight(x, z) + 0.05, z); o.rotation.set(tilt, ry, 0); bedStuff.add(o); return o; }
  for (let i = 0; i < 18; i++) { const b = bike(0, 0, 0); hw.remove(b); const x = R(-70, 70), z = R(-100, -24); lay(b, x, z, R(0, 6)); b.rotation.z = Math.PI / 2 - 0.15; b.position.y += 0.05; b.traverse(o => { if (o.material && o.material.color) o.material = o.material.clone(), o.material.color.multiplyScalar(0.55); }); }
  for (let i = 0; i < 7; i++) { const c = new THREE.Group(); bx(0.9, 0.6, 0.55, chrome, 0, 0.6, 0, c).material = new THREE.MeshStandardMaterial({ color: '#8a9096', roughness: 0.4, metalness: 0.8, wireframe: true }); bx(0.9, 0.04, 0.55, chrome, 0, 0.3, 0, c); for (const [a, b] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) { const w = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), tyreM); w.rotation.x = Math.PI / 2; w.position.set(a, 0.06, b); c.add(w); }
    lay(c, R(-60, 60), R(-90, -30), R(0, 6), 1.3); }
  for (let i = 0; i < 25; i++) { const t = mesh(new THREE.TorusGeometry(0.32, 0.12, 8, 18), tyreM); t.rotation.x = Math.PI / 2; lay(t, R(-90, 90), R(-110, -22), 0, Math.PI / 2 + R(-0.3, 0.3)); }
  for (let i = 0; i < 40; i++) { const can = beerCan(pick(['#d9b84a', '#3a6fb8', '#c43a2a', '#2f8a4a'])); lay(can, R(-40, 40), R(-60, -20), R(0, 6), Math.PI / 2); } }
// fish: silver bodies flopping (each its own phase); shown on the bed after the water goes
const FISH = [];
{ seed = 1301; const bodyG = new THREE.SphereGeometry(1, 12, 8), tailG = new THREE.ConeGeometry(0.5, 0.9, 4); tailG.rotateZ(Math.PI / 2);
  for (let i = 0; i < 60; i++) { const g = new THREE.Group(), sc = R(0.1, 0.19), m = new THREE.MeshStandardMaterial({ color: pick(['#c8d0d6', '#a8b2b8', '#d8d2b8', '#9eaaa0']), roughness: 0.35, metalness: 0.2, emissive: '#30343a', emissiveIntensity: 0.5, flatShading: true });
    const b = mesh(bodyG, m); b.scale.set(1, 0.36, 0.16); g.add(b); const eye = mesh(new THREE.SphereGeometry(0.07, 6, 4), M('#111')); eye.position.set(0.68, 0.08, 0.13); g.add(eye); const fin = mesh(tailG, m); fin.scale.set(0.35, 0.4, 0.12); fin.position.set(0.05, 0.36, 0); fin.rotation.z = -Math.PI / 2 + 0.6; g.add(fin); const tl = mesh(tailG, m); tl.position.x = -1.2; tl.scale.set(0.8, 0.9, 0.3); g.add(tl); g.scale.setScalar(sc);
    const x = i < 40 ? R(-50, 50) : R(-300, 300), z = i < 40 ? R(-90, -22) : R(-500, -22); g.position.set(x, bedHeight(x, z) + 0.08 * sc / 0.3, z); g.rotation.y = R(0, 6); g.userData = { ph: R(0, 6), sp: R(6, 11), y0: g.position.y }; bedStuff.add(g); FISH.push(g); } }
function fishAt(t) { for (const f of FISH) { const u = f.userData, k = Math.max(0, Math.sin(t * u.sp + u.ph)); f.rotation.x = Math.PI / 2 + 0.45 * Math.sin(t * u.sp * 0.7 + u.ph); f.rotation.z = 0.25 * Math.sin(t * u.sp + u.ph); f.position.y = u.y0 + 0.1 * k; } }
// =================== EFFECTS: vanish ring, wind (grass + debris), ferry mud splash, the foam eruption ===================
// ---- the vanish: a bright ring racing out from the bridge, the water inside it gone ----
const vanishRing = mesh(new THREE.RingGeometry(0.97, 1.0, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 3.6, 4.2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false, false);
vanishRing.rotation.x = -Math.PI / 2; vanishRing.position.set(BR_X, WATER_Y + 0.05, -412); hw.add(vanishRing); vanishRing.visible = false;
// ---- grass blades around the picnic, bending toward the river with the wind (uWind 0..1) ----
const grassU = { uWind: { value: 0 }, uT: { value: 0 } };
const blades = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.018, 0, 0, 0.018, 0, 0, 0, 0.13, 0], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  const m = new THREE.MeshStandardMaterial({ color: '#6a8a4a', roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, grassU); sh.vertexShader = 'uniform float uWind, uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float hgt = position.y / 0.13; vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0); float gust = 0.6 + 0.4 * sin(uT * 7.0 + wp.x * 0.7 + wp.z * 0.9);
    transformed.y *= 1.0 - 0.35 * uWind * hgt; `).replace('#include <project_vertex>', `vec4 mvPosition = vec4(transformed, 1.0); mvPosition = instanceMatrix * mvPosition;
    mvPosition.z -= hgt * hgt * 0.2 * (uWind * gust + 0.08 * sin(uT * 1.7 + wp.x)); mvPosition.x += hgt * hgt * 0.03 * sin(uT * 1.3 + wp.z);
    mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`); };
  const n = 26000, im = new THREE.InstancedMesh(g, m, n), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); seed = 2201;
  for (let i = 0; i < n; i++) { const x = R(-16, 16), z = R(-3.2, 9); if (Math.abs(x - HERO_MAT.x) < 1.05 && Math.abs(z - HERO_MAT.z) < 1.05) { i--; continue; }
    q.setFromAxisAngle(V3(0, 1, 0), R(0, 6.28)); const sc = R(0.6, 1.4); mm.compose(V3(x, 0, z), q, V3(sc, sc * R(0.7, 1.3), sc)); im.setMatrixAt(i, mm); im.setColorAt(i, c.setHSL(R(0.22, 0.28), R(0.3, 0.5), R(0.35, 0.55))); }
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; hw.add(im); return im; })();
// ---- debris carried by the wind into the empty channel: napkins, paper cups, a chicken-box lid, a cap ----
const DEB = [];
{ seed = 2301; const kinds = [[new THREE.PlaneGeometry(0.22, 0.22), '#f4f2ec'], [new THREE.CylinderGeometry(0.04, 0.03, 0.09, 10), '#e8e4dc'], [new THREE.PlaneGeometry(0.34, 0.26), '#d8402e'], [new THREE.BoxGeometry(0.2, 0.05, 0.14), '#f2e6cc']];
  for (let i = 0; i < 160; i++) { const [geo, col] = kinds[i < 70 ? 0 : i < 120 ? 1 : i < 125 ? 2 : 3]; const m = mesh(geo, M(col, { side: THREE.DoubleSide, roughness: 0.8 })); const x = R(-14, 14), z = R(-2, 9);
    m.userData = { x, z, d: R(0.0, 0.25), sp: R(9, 16), up: R(1.5, 4.5), sx: R(-1.5, 1.5), spin: V3(R(-9, 9), R(-9, 9), R(-9, 9)) }; m.position.set(x, 0.03, z); hw.add(m); DEB.push(m); } }
// story time s (seconds after the vanish): debris flies toward -z, lifts, then falls into the canyon
function debrisAt(s, t) { for (const m of DEB) { const u = m.userData, a = s - 0.12 - u.d; if (a <= 0) { m.position.set(u.x, 0.03, u.z); m.rotation.set(-Math.PI / 2, 0, 0); continue; }
  let z = u.z - u.sp * a, y = 0.03 + u.up * a - 2.0 * a * a; const lip = bedHeight(u.x, z) + 0.03; if (z < -9) y = Math.max(y - 4.9 * Math.max(0, a - (u.z + 9) / u.sp) ** 2, lip); else y = Math.max(y, 0.03);
  m.position.set(u.x + u.sx * a, y, z); m.rotation.set(u.spin.x * a, u.spin.y * a, u.spin.z * a); } }
// ---- mud splash when the ferry lands ----
const splash = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#4a3e30', { roughness: 0.4, flatShading: true }), 400); splash.frustumCulled = false; hw.add(splash);
const SPL = []; { seed = 2401; for (let i = 0; i < 400; i++) { const a = R(0, 6.28); SPL.push({ a, v: R(3, 12), up: R(3, 11), sc: R(0.15, 0.6), ox: R(-20, 20), oz: R(-4, 4) }); } }
function splashAt(dt, x, z, y0) { const mm = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < SPL.length; i++) { const p = SPL[i]; if (dt <= 0 || dt > 3) { mm.makeScale(0, 0, 0); splash.setMatrixAt(i, mm); continue; }
    const r = p.v * dt, y = Math.max(y0, y0 + p.up * dt - 4.9 * dt * dt), sc = p.sc * (y > y0 + 0.01 ? 1 : Math.max(0, 1 - (dt - 1.2) * 0.6));
    q.setFromEuler(new THREE.Euler(dt * 5 + i, dt * 3, 0)); mm.compose(V3(x + p.ox * 0.5 + Math.cos(p.a) * r, y, z + p.oz + Math.sin(p.a) * r), q, V3(sc, sc * 0.6, sc)); splash.setMatrixAt(i, mm); }
  splash.instanceMatrix.needsUpdate = true; }
// ---- the eruption: when the water comes back, the air that filled the channel is trapped inside it and bursts up as foam (MODEL) ----
const foamM = new THREE.MeshStandardMaterial({ color: '#eef1f6', roughness: 0.75, emissive: '#4a5060', emissiveIntensity: 0.5, flatShading: true });
const FOAM_N = 11000, foam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), foamM, FOAM_N); foam.frustumCulled = false; hw.add(foam);
const FOAMP = []; { seed = 2501; for (let i = 0; i < FOAM_N; i++) { const near = i < 6000; const z = near ? R(-140, -14) : R(-800, -14), close = near && z > -45; FOAMP.push({ x: near ? R(-120, 60) : R(-1500, 900), z, d: R(0, 0.5), v: close ? R(0.5, 3) : R(2, near ? 9 : 22), sc: close ? R(0.08, 0.3) : R(0.15, near ? 0.7 : 3.5), ph: R(0, 6) }); } }
const foamSheet = mesh(new THREE.PlaneGeometry(3000, 800), new THREE.MeshStandardMaterial({ color: '#e8ecf2', roughness: 1, transparent: true, opacity: 0, depthWrite: false, emissive: '#3a3f4a',
  map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8ccd4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = pick(['#ffffff', '#eef1f5', '#b8bec8', '#dfe3ea']); g.beginPath(); g.arc(rnd() * w, rnd() * h, R(2, 9), 0, 7); g.fill(); } }, [120, 32]) }), false, false);
foamSheet.rotation.x = -Math.PI / 2; foamSheet.position.set(0, WATER_Y + 0.06, (RIV_N + RIV_S) / 2); hw.add(foamSheet);
// dt = real seconds since the water came back
function foamAt(dt) { const mm = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < FOAM_N; i++) { const p = FOAMP[i], a = dt - p.d; if (a <= 0 || dt > 30) { mm.makeScale(0, 0, 0); foam.setMatrixAt(i, mm); continue; }
    const y = WATER_Y + Math.max(0, p.v * a - 4.9 * a * a) + 0.2 * Math.sin(a * 2 + p.ph), grow = Math.min(1, a / 0.35) * (1 - 0.5 * smooth(6, 14, a)), sc = p.sc * grow * (1 + 0.25 * Math.sin(a * 5 + p.ph));
    q.setFromEuler(new THREE.Euler(p.ph, a + p.ph, 0)); mm.compose(V3(p.x, y, p.z), q, V3(sc * (1 + 0.4 * Math.sin(p.ph * 3)), sc * 0.55, sc * (1 + 0.4 * Math.cos(p.ph * 5)))); foam.setMatrixAt(i, mm); }
  foam.instanceMatrix.needsUpdate = true; foamSheet.material.opacity = 0.92 * smooth(0.1, 1.2, dt) * (1 - 0.45 * smooth(8, 16, dt)); }
// ---- the phone screen shows what the phone camera sees (render target) ----
const phoneRT = new THREE.WebGLRenderTarget(360, 720, { type: THREE.HalfFloatType });
const phoneCam = new THREE.PerspectiveCamera(48, 0.5, 0.05, 40000);
heroPhone.userData.screen.material = new THREE.MeshBasicMaterial({ map: phoneRT.texture, color: new THREE.Color(1.15, 1.15, 1.15) });
heroPhone.userData.screen.scale.set(0.068, 0.145, 0.002);
// =================== TIMELINE (see STORYBOARD.md). Video t (s) → story s = seconds after the river vanished (5 s stretched ×7.2 between t=6 and t=42) ===================
const T_VAN = 6.0, T_RET = 42.0, SLOW = 7.2, END0 = 58.0;
const storyS = t => (t - T_VAN) / SLOW;
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
// ---- hero path on the ground: mat → bank lip → down the stone slope → across the mud to the phone ----
const PATH = [V3(HERO_MAT.x, 0, HERO_MAT.z), V3(-1.5, 0, -9.2), V3(-2.6, 0, -18.6), V3(-4.0, 0, -23.4)];
const BRIDGE_AIM = V3(-150, 9, -330);
const PHONE_L = V3(-4.3, 0, -24.3); PHONE_L.y = bedHeight(PHONE_L.x, PHONE_L.z) + 0.006;
// a few fish right where the macro shot looks
FISH.slice(0, 7).forEach((f, i) => { const x = PHONE_L.x - 1.2 + i * 0.7 + Math.sin(i * 3.1) * 0.5, z = PHONE_L.z + 1.0 + (i % 3) * 0.9; f.position.set(x, bedHeight(x, z) + 0.05, z); f.userData.y0 = f.position.y; });
function groundY(x, z) { return z > -9 ? 0 : bedHeight(x, z); }
function heading(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
function holdPhone(P) { P.arms[1].rotation.set(-1.35, 0.1, -0.15); P.elbows[1].rotation.x = -0.35; }
function standPose(P) { for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02; P.torso.rotation.set(0, 0, 0); }
function heroAt(s, t) {
  const P = hero; P.head.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); P.arms[0].rotation.set(0, 0, 0); P.arms[1].rotation.set(0, 0, 0); P.elbows[0].rotation.x = -0.15; P.elbows[1].rotation.x = -0.15;
  const facing = Math.PI + 0.42;
  if (s < 1.0) {   // sitting on the mat, filming; the wind hits at 0.15, rips the phone at 0.3
    P.outer.position.set(HERO_MAT.x - 0.1, 0.17, HERO_MAT.z + 0.15); P.outer.rotation.y = facing; sitPose(P, t, 0); holdPhone(P);
    const w = smooth(0.12, 0.3, s) * (1 - smooth(0.8, 1.0, s));
    P.torso.rotation.x = -0.28 * w + 0.03 * w * Math.sin(t * 9); P.head.rotation.x = 0.15 * w;
    if (s >= 0.3) { const k = smooth(0.3, 0.45, s); P.arms[1].rotation.set(lerp(-1.35, -1.9, k), 0.1, lerp(-0.15, 0.2, k)); P.elbows[1].rotation.x = lerp(-0.35, -0.05, k); }
    P.arms[0].rotation.set(-0.6 * w, 0, 0.35 * w); P.elbows[0].rotation.x = -0.9 * w;
    return; }
  if (s < 1.6) {   // gets up
    const k = smooth(1.0, 1.6, s); P.outer.position.set(HERO_MAT.x - 0.1, lerp(0.17, 0.95, k), HERO_MAT.z + 0.15); P.outer.rotation.y = lerp(facing, heading(PATH[0], PATH[1]), k);
    sitPose(P, t, 0); for (let i = 0; i < 2; i++) { P.legs[i].rotation.x = lerp(-1.35, 0, k); P.knees[i].rotation.x = lerp(0.35, 0.02, k) + 0.9 * Math.sin(k * Math.PI); }
    P.torso.rotation.x = 0.45 * Math.sin(k * Math.PI); P.arms[1].rotation.set(lerp(-0.4, 0, k), 0, 0); return; }
  const seg = (a, b, s0, s1) => { const k = clamp((s - s0) / (s1 - s0), 0, 1); return [V3(lerp(a.x, b.x, k), 0, lerp(a.z, b.z, k)), k]; };
  if (s < 2.7 || (s >= 3.9 && s < 4.6)) {   // running (slow motion)
    const [a, b, s0, s1] = s < 2.7 ? [PATH[0], PATH[1], 1.6, 2.7] : [PATH[2], PATH[3], 3.9, 4.6]; const [p] = seg(a, b, s0, s1);
    P.outer.position.set(p.x, groundY(p.x, p.z) + 0.95, p.z); P.outer.rotation.y = heading(a, b); standPose(P); poseWalk(P, (s - s0) * 10.5, 1.8); P.torso.rotation.x = 0.22; return; }
  if (s < 3.9) {   // sliding down the stone slope on his backside, arms up for balance
    const [p, k] = seg(PATH[1], PATH[2], 2.7, 3.9); const ee = smooth(0, 1, k); const q = V3(lerp(PATH[1].x, PATH[2].x, ee), 0, lerp(PATH[1].z, PATH[2].z, ee));
    P.outer.position.set(q.x, groundY(q.x, q.z) + 0.3, q.z); P.outer.rotation.y = heading(PATH[1], PATH[2]); sitPose(P, t, 0);
    for (let i = 0; i < 2; i++) { P.legs[i].rotation.x = -1.15; P.knees[i].rotation.x = 0.25; } P.torso.rotation.x = -0.45 + 0.05 * Math.sin(t * 3);
    P.arms[0].rotation.set(-2.5, 0, 0.5 + 0.1 * Math.sin(t * 4)); P.arms[1].rotation.set(-2.3, 0, -0.5); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.4; return; }
  // picks the phone up, straightens, looks up
  const p = PATH[3], k = smooth(4.6, 4.75, s) * (1 - smooth(4.82, 4.95, s));
  P.outer.position.set(p.x, groundY(p.x, p.z) + 0.95 - 0.38 * k, p.z); P.outer.rotation.y = heading(PATH[2], PATH[3]) + 0.4 * smooth(4.85, 5.0, s); standPose(P);
  for (let i = 0; i < 2; i++) { P.legs[i].rotation.x = -0.9 * k; P.knees[i].rotation.x = 1.4 * k; } P.torso.rotation.x = 0.7 * k;
  P.arms[1].rotation.set(lerp(-0.6, -1.0, smooth(4.85, 4.95, s)), 0, 0); P.elbows[1].rotation.x = -0.9 * smooth(4.8, 4.95, s) - 0.3 * k;
  P.head.rotation.x = -0.55 * smooth(4.88, 5.0, s);
}
function heroFace(t, s) { const f = t < 6 ? 'happy' : s < 0.2 ? 'neutral' : s < 0.45 ? 'surprised' : s < 1.6 ? 'anxious' : s < 4.7 ? 'angry' : s < 4.9 ? 'happy' : 'surprised'; hero.face(f, t); }
// the phone: in his hand → ripped away by the wind at s=0.3 → tumbles into the canyon (lands s=2.4) → back in his hand at s=4.75
const handPos = () => { hero.outer.updateMatrixWorld(true); const v = V3(0, -0.28, 0.05); hero.elbows[1].localToWorld(v); return v; };
let RIP = null;
function phoneAt(s, t) {
  const ph = heroPhone, hd = headW(hero);
  if (s < 0.3 || s >= 4.75) { ph.position.copy(handPos()); if (s < 0.3) { ph.lookAt(BRIDGE_AIM); ph.rotateY(Math.PI); } else { ph.lookAt(hd); } return; }
  if (!RIP) { heroAt(0.3, T_VAN + 0.3 * SLOW); RIP = handPos(); heroAt(s, t); }
  if (s < 2.4) { const k = (s - 0.3) / 2.1, a = RIP, b = PHONE_L; ph.position.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k) + 2.6 * Math.sin(Math.min(k * 1.25, 1) * Math.PI * 0.62) * (1 - k * k * 0.2), lerp(a.z, b.z, k));
    if (k > 0.55) ph.position.y = Math.max(PHONE_L.y, lerp(a.y, b.y, k) + 2.6 * (1 - (k - 0.55) / 0.45) ** 1.6 * 0.9);
    ph.rotation.set(s * 7.0, s * 4.2, s * 2.6); return; }
  const b = Math.max(0, Math.sin(Math.min(1, (s - 2.4) / 0.25) * Math.PI)) * 0.25 * Math.max(0, 1 - (s - 2.4) / 0.25);
  ph.position.set(PHONE_L.x, PHONE_L.y + 0.004 + b, PHONE_L.z); ph.rotation.set(-Math.PI / 2, 0, 0.6);
}
function headW(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
// ---- the world state at time t ----
let RIPPED = false;
function worldAt(t) {
  const s = storyS(t), dry = t >= T_VAN && t < T_RET, back = t >= T_RET, dtR = t - T_RET;
  carsAt(t); fishAt(t); grassU.uT.value = t;
  // water + the vanish ring
  const r = t < T_VAN ? -1 : t < T_VAN + 0.7 ? 2600 * Math.pow((t - T_VAN) / 0.7, 2.2) : 99999;
  river.material.uniforms.uHR.value = back ? -1 : r; riverFar.visible = !(t >= T_VAN + 0.45 && !back); river.visible = !(dry && t > T_VAN + 0.7);
  vanishRing.visible = t >= T_VAN && t < T_VAN + 0.75; vanishRing.scale.setScalar(Math.max(1, r)); vanishRing.material.opacity = 0.9 * (1 - span(t, T_VAN + 0.3, T_VAN + 0.75));
  bedStuff.visible = t >= T_VAN && t < T_RET + 0.5;
  // fountain: jets fall to the bed once the water is gone, pumps lose water from s=2.5 (sputter)
  const pw = !dry ? 1 : 1 - 0.85 * smooth(2.4, 3.6, s) + (s > 2.4 ? 0.12 * Math.max(0, Math.sin(t * 13) * Math.sin(t * 5.3)) : 0);
  setJets(t, 32, pw, dry && t > T_VAN + 0.2 ? BED_Y : WATER_Y);
  // ferry: hangs where the water was, falls (lands at s≈0.98), tossed up by the returning water
  const fBed = bedHeight(ferry.position.x, ferry.position.z) + 1.35;
  if (t < T_VAN) ferry.position.y = WATER_Y + 0.05 * Math.sin(t * 1.3); else if (!back) ferry.position.y = Math.max(fBed, WATER_Y - 4.905 * Math.max(0, s - 0.02) ** 2);
  else ferry.position.y = dtR < 2.6 ? lerp(fBed, WATER_Y, smooth(0, 0.25, dtR)) + 5.5 * Math.sin(Math.PI * clamp(dtR / 2.6, 0, 1)) : WATER_Y + 0.4 * Math.sin(dtR * 2.0) * Math.exp(-(dtR - 2.6) * 0.5);
  ferry.rotation.z = back ? 0.12 * Math.sin(dtR * 1.8) * Math.exp(-dtR * 0.25) : (dry && s > 0.97 ? 0.04 * Math.exp(-(s - 0.97) * 6) : 0);
  splashAt(dry ? (t - (T_VAN + 0.98 * SLOW)) / SLOW * 3.0 : 0, ferry.position.x, ferry.position.z, fBed - 1.2);
  // wind + debris + the crowd leaning away
  const wind = dry ? smooth(0.12, 0.3, s) * (1 - smooth(0.8, 1.3, s)) : 0; grassU.uWind.value = wind; debrisAt(dry ? s : t < T_VAN ? -1 : 9, t);
  CROWD.forEach((P, i) => { sitPose(P, t, i); P.torso.rotation.x += -0.3 * wind; if (wind > 0.3 && i % 3 === 0) { P.arms[0].rotation.set(-2.2, 0, 0.4); P.arms[1].rotation.set(-2.0, 0, -0.4); } if (back && dtR > 1) P.head.rotation.x = -0.1; });
  // foam
  foamAt(back ? dtR : -1);
  // hero + phone
  if (t < T_RET) { hero.outer.visible = true; heroAt(Math.max(s, -1), t); heroFace(t, s); phoneAt(Math.max(s, -1), t); heroPhone.visible = true; }
  else if (t >= 52) { const P = hero; P.outer.visible = true; standPose(P); P.head.rotation.set(0, 0, 0); const k = smooth(52, 52.8, t);
    P.outer.position.set(PATH[3].x, WATER_Y - 0.62 - 1.2 * (1 - k) + 0.06 * Math.sin(t * 2.2), PATH[3].z); P.outer.rotation.y = 0.5; P.arms[1].rotation.set(-2.95, 0, -0.15); P.elbows[1].rotation.x = -0.15; P.arms[0].rotation.set(-0.7, 0, 0.5); P.elbows[0].rotation.x = -0.6;
    P.face(t < 53.2 ? 'surprised' : 'laugh', t); P.outer.updateMatrixWorld(true); const hp = V3(0, -0.3, 0.02); P.elbows[1].localToWorld(hp); heroPhone.position.copy(hp); heroPhone.rotation.set(0, 0.5 + Math.PI, 0.1); heroPhone.visible = true; }
  else { hero.outer.visible = false; heroPhone.visible = false; }
  return s;
}
// ---- cameras per shot ----
const LOOKC = (p, l, fov) => { hCam.position.copy(p); hCam.up.set(0, 1, 0); hCam.lookAt(l); hCam.fov = fov; };
function camAt(t, s) {
  dof(hCam, 1, 0); const hd = headW(hero);
  if (t < 3) {   // S1: from inside the phone screen, pulling back past his head to over-the-shoulder
    const ph = heroPhone.position, n = V3(0, 0, 1).applyQuaternion(heroPhone.quaternion), u = ease(span(t, 0.2, 3.0));
    const f = V3(Math.sin(Math.PI + 0.42), 0, Math.cos(Math.PI + 0.42)), right = V3(-f.z, 0, f.x);
    const p0 = ph.clone().addScaledVector(n, 0.26), p2 = hd.clone().addScaledVector(f, -0.8).addScaledVector(right, 0.2).add(V3(0, 0.08, 0)), mid = ph.clone().lerp(p2, 0.5).addScaledVector(right, 0.55);
    const p = p0.clone().multiplyScalar((1 - u) ** 2).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(p2, u * u);
    LOOKC(p, ph.clone().lerp(hd.clone().addScaledVector(f, 30).add(V3(0, 2.5, 0)), smooth(0.35, 1, u)), 34); window.__dbg = [hd, p, ph, hero.outer.position].map(v => v.toArray().map(a => a.toFixed(2)).join(",")).join(" | "); dof(hCam, p.distanceTo(ph), lerp(6, 4, u)); aimSun(hd.x, hd.z); return; }
  if (t < 6) {   // S2: orbit from behind-right to front-right, food in the foreground
    const a = lerp(2.2, 0.75, ease(span(t, 3, 6))) , f0 = Math.PI + 0.42, ang = f0 + a, rad = lerp(1.6, 1.9, span(t, 3, 6));
    const p = hd.clone().add(V3(Math.sin(ang) * rad, lerp(0.15, -0.1, span(t, 3, 6)), Math.cos(ang) * rad)); LOOKC(p, hd.clone().add(V3(0, -0.12, 0)), 36); dof(hCam, rad, 8); aimSun(hd.x, hd.z); return; }
  if (t < 7.2) {   // S3: low wide on the lip, the ring races out from the bridge
    const u = span(t, 6, 7.2), sh = 0.06 * Math.exp(-(t - 6) * 3) * Math.sin(t * 60);
    LOOKC(V3(lerp(10, 7, u), 1.5 + sh, lerp(-7.4, -8.4, u)), V3(-150, 4 + sh * 10, -380), lerp(40, 37, u)); aimSun(0, -6); return; }
  if (t < 11) {   // S4: close on him from the river side as the wind hits; the phone flies past the lens
    const f = V3(Math.sin(Math.PI + 0.42), 0, Math.cos(Math.PI + 0.42)), right = V3(-f.z, 0, f.x), u = span(t, 7.2, 11), sh = 0.012 * smooth(7.3, 8, t) * (1 - smooth(10, 11, t));
    const p = hd.clone().addScaledVector(f, lerp(1.9, 1.45, ease(u))).addScaledVector(right, lerp(-0.6, -0.35, u)).add(V3(sh * Math.sin(t * 41), -0.18 + sh * Math.cos(t * 37), 0));
    LOOKC(p, hd.clone().add(V3(0, -0.15, 0)), 34); dof(hCam, p.distanceTo(hd), 9); aimSun(hd.x, hd.z); return; }
  if (t < 14) {   // S5: the ferry drops onto the bed
    const u = span(t, 11, 14), fc = ferry.position; LOOKC(V3(lerp(-196, -205, u), lerp(7, 3, u), lerp(-238, -246, u)), V3(fc.x, fc.y + 1, fc.z), 40); aimSun(fc.x, fc.z); return; }
  if (t < 19) {   // S6: drone glide down the empty canyon toward the sunset and the 63 Building
    const u = ease(span(t, 14, 19)), p = V3(lerp(40, -760, u), lerp(30, 14, u) + 6 * Math.sin(u * Math.PI), lerp(-60, -430, u) + 40 * Math.sin(u * Math.PI));
    LOOKC(p, V3(p.x - 260, -14, p.z - 70 + 60 * (1 - u)), 42); aimSun(p.x - 100, p.z - 50); return; }
  if (t < 24) {   // S7: macro over the bed: fish, a bike, cans; the phone lands in front of the lens
    const u = ease(span(t, 19, 24)), x = lerp(1.8, -2.4, u), z = lerp(-27.8, -25.9, u), p = V3(x, bedHeight(x, z) + lerp(0.5, 0.3, u), z);
    LOOKC(p, V3(PHONE_L.x, PHONE_L.y + 0.12, PHONE_L.z), 34); dof(hCam, p.distanceTo(PHONE_L), 12); aimSun(p.x, p.z); return; }
  if (t < 29) {   // S8: low at the foot of the slope, he slides down toward us
    const x = -3.4, z = -21.2, p = V3(x, bedHeight(x, z) + 0.55, z); LOOKC(p, hd.clone().add(V3(0, -0.4, 0)), lerp(36, 30, span(t, 24, 29))); dof(hCam, p.distanceTo(hd), 6); aimSun(hd.x, hd.z); return; }
  if (t < 35) {   // S9: follow behind him across the mud; the fountain sputters in the distance
    const dir = V3(PATH[3].x - PATH[2].x, 0, PATH[3].z - PATH[2].z).normalize(), side = V3(-dir.z, 0, dir.x), u = span(t, 29, 35);
    const p = hd.clone().addScaledVector(dir, -lerp(2.6, 3.2, u)).addScaledVector(side, lerp(1.1, 1.6, u)).add(V3(0, 0.25, 0)); LOOKC(p, hd.clone().addScaledVector(dir, 3).add(V3(0, -0.3, 0)), 38); dof(hCam, 3, 4); aimSun(hd.x, hd.z); return; }
  if (t < 40.2) {   // S10a: front, low, push in as he reaches the phone and picks it up
    const dir = V3(PATH[3].x - PATH[2].x, 0, PATH[3].z - PATH[2].z).normalize(), u = ease(span(t, 35, 40.2)), tgt = V3(PATH[3].x, groundY(PATH[3].x, PATH[3].z) + 1.0, PATH[3].z);
    const p = tgt.clone().addScaledVector(dir, lerp(4.6, 2.7, u)).add(V3(0.7, lerp(-0.1, 0.15, u), 0)); LOOKC(p, tgt.clone().add(V3(0, -0.05, 0)), 36); dof(hCam, p.distanceTo(tgt), 7); aimSun(tgt.x, tgt.z); return; }
  if (t < T_RET) {   // S10b: crane up — the tiny hero in the empty canyon, the last half second
    const u = ease(span(t, 40.2, 42)), tgt = V3(PATH[3].x, groundY(PATH[3].x, PATH[3].z), PATH[3].z), p = tgt.clone().add(V3(lerp(2.0, 4.5, u), lerp(1.6, 9, u), lerp(2.6, 11, u)));
    LOOKC(p, tgt.clone().lerp(BRIDGE_AIM, 0.03 * u).add(V3(0, 0.9 * (1 - u), 0)), lerp(40, 46, u)); aimSun(tgt.x, tgt.z); return; }
  if (t < 46.5) {   // S11a: the water is back — and erupts
    const u = span(t, 42, 46.5), sh = 0.15 * Math.exp(-(t - 42) * 1.2) * Math.sin(t * 50);
    LOOKC(V3(lerp(12, 9, u), 2.2 + sh, lerp(-6.2, -7.2, u)), V3(-120, 6 + lerp(0, 8, u) + sh * 4, -380), 40); aimSun(0, -6); return; }
  if (t < 52) {   // S11b: crane up and back over the fizzing river toward the sunset
    const u = ease(span(t, 46.5, 52)); LOOKC(V3(lerp(30, 140, u), lerp(14, 130, u), lerp(10, 170, u)), V3(-320, 0, -420), 42); aimSun(0, -60); return; }
  // S12: he surfaces with the phone held up
  const u = span(t, 52, END0), p = hd.clone().add(V3(lerp(1.7, 1.3, u), lerp(-0.25, -0.15, u), lerp(1.6, 1.25, u))); p.y = Math.max(p.y, WATER_Y + 0.25);
  LOOKC(p, hd.clone().add(V3(0, 0.05, 0)), 36); dof(hCam, p.distanceTo(hd), 8); aimSun(hd.x, hd.z);
}
// ---- overlay text ----
const TITLE = ['만약', '<span class="hl">한강</span>이', '<br>', '5초', '동안', '사라진다면?'];
const CAPS = [[3.2, 5.8, '반포한강공원, 저녁 7시'], [7.4, 9.15, '물이 있던 자리는 <span class="hl">진공</span>'], [9.25, 11.0, '<span class="hl">20만 톤</span>의 공기가 쏟아진다'],
  [11.2, 13.9, '유람선이 <span class="hl">바닥</span>으로 떨어진다'], [14.3, 18.7, '폭 <span class="hl">800m</span> · 깊이 <span class="hl">6m</span> · 길이 <span class="hl">41km</span>'],
  [19.3, 23.0, '강바닥엔 <span class="hl">잃어버린 것들</span>'], [24.3, 28.6, '너는 <span class="hl">휴대폰</span>을 주우러 간다'], [29.4, 34.2, '분수 펌프는 이제 <span class="hl">공기</span>만 빨아들인다'],
  [42.6, 46.8, '<span class="m">MODEL</span>물이 돌아오자, 갇힌 공기가 <span class="hl">터져 나온다</span>'], [47.0, 51.6, '한강 전체가 <span class="hl">탄산처럼</span> 끓는다'], [52.6, 57.6, '휴대폰은 <span class="hl">방수</span>였다']];
const fmtT = x => '0:0' + Math.max(0, x).toFixed(3);
let lastCap = '';
function kineticHTML(html) { // wrap words (outside tags) in spans for the word-by-word entrance
  const out = []; let i = 0; const parts = html.split(/(<[^>]+>)/); let depth = 0;
  for (const p of parts) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } }
  return out.join(''); }
function text(t) {
  const s = storyS(t);
  // title, word by word
  const tt = $('title'); if (!tt.dataset.ok) { tt.innerHTML = TITLE.map((w, i) => w === '<br>' ? '<br>' : `<span class="w" data-i="${i}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.25 - i * 0.2) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(5.2, 5.8, t);
  // HUD timer
  let lab, val, sub = ''; if (t < T_VAN) { lab = '한강 사라지기까지'; val = fmtT(T_VAN - t); } else if (t < T_RET) { lab = '한강 복귀까지'; val = fmtT(5 - s); sub = '시간 ×7 느리게'; } else { lab = '한강 복귀'; val = fmtT(0); sub = '실제 시간'; }
  $('lab').innerHTML = '<b></b>' + lab; $('val').textContent = val; $('sub').textContent = sub;
  const pop = Math.max(0, 1 - Math.abs(t - T_VAN) / 0.25) + Math.max(0, 1 - Math.abs(t - T_RET) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pop})`; $('val').style.transformOrigin = 'left center';
  const big = smooth(38.4, 38.9, t) * (1 - smooth(42.0, 42.15, t)); $('big').textContent = fmtT(t < T_RET ? 5 - s : 0); $('big').style.opacity = big; $('big').style.transform = `scale(${1 + 0.05 * Math.sin(Math.max(0, t - 38.4) * 9) * big})`;
  $('hud').style.opacity = (1 - big * 0.9) * (1 - smooth(51.4, 51.9, t)) * smooth(0.1, 0.4, t); $('mark').style.opacity = 1 - smooth(END0, END0 + 0.4, t);
  // captions, word by word
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); }
  else { cp.style.opacity = 0; }
  $('flash').style.opacity = 0.55 * Math.max(0, 1 - Math.abs(t - T_VAN) / 0.12) + 0.75 * Math.max(0, 1 - (t - T_RET) / 0.35) * (t >= T_RET ? 1 : 0);
  $('end').style.opacity = smooth(END0, END0 + 0.5, t); $('endT').style.opacity = smooth(END0 + 0.3, END0 + 0.9, t); $('endS').style.opacity = smooth(END0 + 0.9, END0 + 1.6, t);
}
// ---- render: phone screen pass, scene, sub-frame motion blur on the fast shots ----
function frameAt(t) { const s = worldAt(t); camAt(t, s);
  if (t < 6.2) { heroPhone.updateMatrixWorld(true); phoneCam.position.copy(heroPhone.position); phoneCam.lookAt(BRIDGE_AIM); heroPhone.visible = false; const hv = hero.outer.visible; hero.outer.visible = false;
    renderer.setRenderTarget(phoneRT); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(hw, phoneCam); heroPhone.visible = true; hero.outer.visible = hv; }
  shootTo(RTA, hw, hCam); }
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => (t >= 6 && t < 7.2) || (t >= 11 && t < 19) || (t >= 42 && t < 46.5) || (t >= 40.2 && t < 42);
window.renderAt = (t) => {
  if (window.PASS !== 'text') { const s0 = worldAt(t); camAt(t, s0); }
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0;
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
