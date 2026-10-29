import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "Unnecessary engineering" format (her request, Oct 29): ONE TRIP WITH ALL THE GROCERIES. An everyday annoyance -> "Let's fix that." -> each fix makes a
// new problem -> the rig grows into a kitchen on wheels -> the twist loops back (the house keys are in the car). Narrated (Lumean TTS, voice C "Andrew", US);
// the timeline comes from the narration's word timestamps: parts_groc/g_times.js (tools/groc_timing.py).
// =================== timeline ===================
const B1 = 4.0, B2 = 12.0, B3 = 20.0, B4 = 28.0, B5 = 36.0, B6 = 44.0, TW = 52.0, REP = 58.0;   // used by the shared family sets
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
  for (const x of ex) { const r = U(0.11), cy = Vv(0.66), rg = g.createRadialGradient(U(x), cy, 0, U(x), cy, r); rg.addColorStop(0, `rgba(240,110,110,${ext.includes('blush') ? 0.75 : 0.45})`); rg.addColorStop(1, 'rgba(240,110,110,0)'); g.fillStyle = rg; g.fillRect(U(x) - r, cy - r, 2 * r, 2 * r); }
  if (o.wrinkles) { g.strokeStyle = 'rgba(90,50,40,0.35)'; g.lineWidth = U(0.012); for (const [x, s] of [[0.15, -1], [0.85, 1]]) for (const dy of [-0.025, 0.01]) { g.beginPath(); g.moveTo(U(x), Vv(ey + dy)); g.lineTo(U(x + s * 0.05), Vv(ey + dy * 1.6)); g.stroke(); } }
  // eyes
  const eye = blink && !['closed', 'happy', 'heart'].includes(e.eye) ? 'blink' : e.eye;
  for (const x of ex) {
    const cx = U(x), cy = Vv(ey);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = U(0.03);
    if (eye === 'cross') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, cy, U(0.075), U(0.085), 0, 0, 7); g.fill(); g.lineWidth = U(0.012); g.stroke(); g.fillStyle = ink; g.beginPath(); g.arc(cx + (x < 0.5 ? 1 : -1) * U(0.04), cy + U(0.01), U(0.032), 0, 7); g.fill(); continue; }
    if (eye === 'smug') { const rx = U(0.048), ry = U(0.058), px = cx + 0.35 * rx; g.beginPath(); g.ellipse(px, cy, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px - rx * 0.3, cy + ry * 0.1, rx * 0.3, 0, 7); g.fill();
      g.fillStyle = o.decal ? 'rgba(0,0,0,0)' : o.skin; g.fillRect(cx - U(0.07), cy - ry - U(0.01), U(0.14), ry * 1.05); g.strokeStyle = ink; g.lineWidth = U(0.026); g.beginPath(); g.moveTo(cx - U(0.065), cy - ry * 0.02); g.lineTo(cx + U(0.065), cy - ry * 0.1); g.stroke(); continue; }
    if (eye === 'dot' || eye === 'big' || eye === 'wide') {
      const rx = U(eye === 'dot' ? 0.045 : eye === 'big' ? 0.06 : 0.055), ry = U(eye === 'dot' ? 0.058 : 0.075);
      if (eye === 'wide') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx, cy, U(0.085), U(0.1), 0, 0, 7); g.fill(); g.lineWidth = U(0.012); g.stroke(); g.fillStyle = ink; g.beginPath(); g.ellipse(cx, cy, U(0.035), U(0.04), 0, 0, 7); g.fill(); }
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
  g.strokeStyle = o.browCol; g.lineWidth = U(0.035);
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
function humanGeo(k) { if (HUMAN_GEO[k]) return HUMAN_GEO[k]; const src = k === 'head' ? HUMAN_MESH.head : HUMAN_MESH.hair[k], g = new THREE.BufferGeometry();
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
    o.decal = true; if (shape === 'human') o.noNose = true; const geo = shape === 'round' ? new THREE.SphereGeometry(0.5, 40, 28) : shape === 'human' ? humanGeo('head') : new RoundedBoxGeometry(1, 1, 1, 5, 0.16);
    const sc = { round: [1.1, 1.08, 1.15], human: [1.12, 1.2, 1.2], soft: [1, 1, 1] }[shape]; head = new THREE.Mesh(geo, shape === 'human' ? M(o.skin, { roughness: 0.8, flatShading: true }) : skinM); if (shape === 'human') head.scale.setScalar(0.42); else head.scale.set(HEAD_W * sc[0], HEAD_H * sc[1], HEAD_D * sc[2]);
    faceM = new THREE.MeshStandardMaterial({ map: faceTex(o, 'neutral', false), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.85 });
    head.add(new THREE.Mesh(decalGeo(geo, 1), faceM)); }
  head.position.set(0, HEAD_Y, 0); head.castShadow = true; torso.add(head);
  if (shape === 'round' || shape === 'human') {   // round / human head: ears are balls, hair is a tilted cap of a slightly bigger sphere
    const hsx = head.scale, hm = M(o.hair, { roughness: 0.95 }), hs = o.hairStyle;
    if (shape === 'human') { const hk = { short: 'quiff', quiff: 'quiff', bangs: 'fringe', fringe: 'fringe' }[hs];   // ears are part of the head mesh
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
    const outfit = o.hoodie ? 'hoodie' : 'tee', geo = humanBodyGeo(outfit), bodyM = new THREE.SkinnedMesh(geo, HUMAN_MESH.body[outfit].groups.map(([r]) => mats[r]));   // no hoodie = oversized tee bodyM.castShadow = bodyM.receiveShadow = true; bodyM.frustumCulled = false;
    root.add(bodyM); outer.updateMatrixWorld(true);
    bodyM.bind(new THREE.Skeleton([root, torso, arms[0], elbows[0], arms[1], elbows[1], legs[0], knees[0], legs[1], knees[1]]), bodyM.matrixWorld); }
  const p = { outer, root, torso, head, arms, elbows, legs, knees, h: o.h, sx: [-1, 1], o };
  p.face = (name, t = 0) => { const ph = (t + blinkOff) % 3.9, blink = t >= 0 && ph < 0.12; faceM.map = faceTex(o, name, blink); };
  return p;
}
// =================== THE CAST (square heads, same family as the dad video) + props; sets copied from parts_dad (living room + kitchen, backyard) ===================
const DAD_HAIR = '#5a4436';   // own colour -> own material, greys over the years
const dad = makeBlock({ skin: '#e2ae86', hair: DAD_HAIR, top: '#3f6e9a', bottom: '#4a4a52', shoe: '#3a2a20', hairStyle: 'short', mustache: '#5a4436', glasses: '#2a2420' });
const mom = makeBlock({ skin: '#f0c8a4', hair: '#7a3a1e', top: '#d85a5a', bottom: '#2f3a5a', shoe: '#5a3a2a', hairStyle: 'long', lip: '#c8303c', h: 0.95 });
const hairMats = [M(DAD_HAIR, { roughness: 0.9 })], momHair = M('#7a3a1e', { roughness: 0.9 });
function ageMom(k) { momHair.color.copy(new THREE.Color('#7a3a1e').lerp(new THREE.Color('#9a8a84'), k)); }
function ageDad(k) { const c = new THREE.Color(DAD_HAIR).lerp(new THREE.Color('#a8a29a'), k); hairMats.forEach(m => m.color.copy(c)); }
function makePhone() { const g = new THREE.Group(); const b = mesh(BOX, M('#1c1c22', { roughness: 0.4 })); b.scale.set(0.085, 0.165, 0.012); g.add(b);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.074, 0.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.4, 1.6) })); scr.position.z = 0.0065; g.add(scr); g.scr = scr; return g; }
const dadPhone = makePhone(); dad.elbows[1].add(dadPhone); dad.phone = dadPhone;
const momPhone = makePhone(); mom.elbows[1].add(momPhone); mom.phone = momPhone;
// hold poses: 'near' (both hands, reading), 'far' (arm's length, squinting), 'type' (one finger poking), 'show' (held out sideways), 'up' (taking a photo), 'none'
function holdPhone(P, t, how) { P.phone.visible = how !== 'none'; const [L, Rr] = [0, 1];
  if (how === 'none') return;
  if (how === 'carry') { P.arms[Rr].rotation.x += -0.2; P.elbows[Rr].rotation.x = -0.5; P.phone.position.set(0, -0.31, 0.03); P.phone.rotation.set(-1.4, 0, 0); return; }
  if (how === 'far') { P.arms[Rr].rotation.set(-1.25, 0, 0.05); P.elbows[Rr].rotation.x = -0.25; P.arms[L].rotation.set(-0.2, 0, 0.05); P.elbows[L].rotation.x = -0.3; }
  else if (how === 'show') { P.arms[Rr].rotation.set(-1.15, 0, -0.35); P.elbows[Rr].rotation.x = -0.35; }
  else if (how === 'up') { P.arms[Rr].rotation.set(-1.7, 0, 0.05); P.elbows[Rr].rotation.x = -0.35; P.arms[L].rotation.set(-0.3, 0, 0.05); }
  else { P.arms[Rr].rotation.set(-0.4, 0, 0.12); P.elbows[Rr].rotation.x = -1.35; const poke = how === 'type' ? 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 2.3) : 0.3;
    P.arms[L].rotation.set(-0.45, 0, -0.32); P.elbows[L].rotation.x = -1.2 - 0.18 * poke; }
  const far = how === 'far' || how === 'show' || how === 'up'; P.phone.position.set(0, -0.31, 0.03); P.phone.rotation.set(far ? -1.4 : -0.85, far ? 0 : 0.15, 0); }
// the dog: a blocky golden mutt with a drawn face; tail wags, head tilts
const dogFace = canvasTex(256, 230, (g, w, h) => { g.fillStyle = '#d8a050'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2d8a8'; g.beginPath(); g.ellipse(w / 2, h * 0.72, w * 0.3, h * 0.24, 0, 0, 7); g.fill();
  for (const x of [0.3, 0.7]) { g.fillStyle = '#1c1410'; g.beginPath(); g.ellipse(w * x, h * 0.42, w * 0.06, w * 0.07, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * x - 5, h * 0.42 - 6, w * 0.022, 0, 7); g.fill(); }
  g.fillStyle = '#1c1410'; g.beginPath(); g.ellipse(w / 2, h * 0.62, w * 0.08, w * 0.055, 0, 0, 7); g.fill(); g.fillStyle = '#e8707a'; g.beginPath(); g.ellipse(w / 2, h * 0.86, w * 0.05, w * 0.07, 0, 0, 7); g.fill(); });
function makeDog() { const d = new THREE.Group(), fur = M('#d8a050', { roughness: 0.95 }), dark = M('#b8803a', { roughness: 0.95 });
  const body = new THREE.Group(); d.add(body); const B = (w, h, z_, col, x, y, z, par) => { const m = mesh(BOX, col); m.scale.set(w, h, z_); m.position.set(x, y, z); par.add(m); return m; };
  B(0.26, 0.26, 0.5, fur, 0, 0.36, 0, body); for (const [x, z] of [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]]) B(0.08, 0.26, 0.08, fur, x, 0.13, z, body);
  const tail = new THREE.Group(); tail.position.set(0, 0.45, -0.25); body.add(tail); B(0.05, 0.05, 0.22, dark, 0, 0.05, -0.1, tail);
  const head = new THREE.Group(); head.position.set(0, 0.56, 0.24); body.add(head); const hm = new THREE.Mesh(BOX, [fur, fur, fur, fur, new THREE.MeshStandardMaterial({ map: dogFace, roughness: 0.9 }), fur]); hm.scale.set(0.24, 0.22, 0.22); hm.castShadow = true; head.add(hm);
  for (const s of [-1, 1]) { const e = B(0.06, 0.16, 0.1, dark, s * 0.14, -0.02, -0.02, head); e.rotation.z = s * 0.25; }
  return { g: d, body, head, tail }; }
const dog = makeDog();

// =================== THE HOUSE (meters): living room with Dad's recliner, a window in the back wall (seen from inside and from outside in the snow), the kitchen ===================
const room = new THREE.Scene(); const rmCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 120);
const rmHemi = new THREE.HemisphereLight(0xfff2e2, 0x6a5848, 0.8); room.add(rmHemi);
const rmSun = new THREE.DirectionalLight(0xffe2c0, 2.0); rmSun.position.set(2, 4, -7); rmSun.castShadow = true; rmSun.shadow.mapSize.set(2048, 2048); rmSun.shadow.bias = -0.0004; Object.assign(rmSun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 25 }); room.add(rmSun, rmSun.target);
const rmFill = new THREE.PointLight(0xffe6cc, 2.5, 9, 1.4); rmFill.position.set(0.5, 2.3, 1.5); room.add(rmFill);
const rmLamp = new THREE.PointLight(0xffb468, 0, 5, 1.4); rmLamp.position.set(-1.9, 1.35, -1.55); room.add(rmLamp);
const rmGlow = new THREE.PointLight(0xbcd4ff, 0, 1.2, 1.5); room.add(rmGlow);   // the phone screen lighting his face at night
const rmPorch = new THREE.PointLight(0xa8c0ff, 0, 6, 1.2); rmPorch.position.set(1.3, 2.6, -4.2); room.add(rmPorch);
const rmFace = new THREE.PointLight(0xffc890, 0, 3, 1.5); rmFace.position.set(1.3, 1.9, -1.9); room.add(rmFace);
const outsideM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.6, 1.8) });
{ const wood = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = pick(['#b88a60', '#b08258', '#bc8e64', '#a87a52']); g.fillRect(0, y, w, 31); g.fillStyle = 'rgba(80,50,28,0.3)'; g.fillRect(0, y + 30, w, 2); } }, [4, 4]);
  const fl = mesh(new THREE.PlaneGeometry(8, 7), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.5); room.add(fl);
  const paper = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(160,120,80,0.25)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); }, [8, 3]);
  const wallM = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }), sid = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = '#c8d4dc'; g.fillRect(0, y, w, 30); g.fillStyle = '#9aa8b4'; g.fillRect(0, y + 29, w, 3); } }, [6, 3]);
  // back wall z = -3 with a window hole (x 0.6..2.0, y 0.9..2.2); the outer skin is siding
  const BW = (w, h, x, y) => { const m = mesh(BOX, [wallM, wallM, wallM, wallM, wallM, new THREE.MeshStandardMaterial({ map: sid, roughness: 0.9 })]); m.scale.set(w, h, 0.16); m.position.set(x, y, -3); room.add(m); };
  BW(4.6, 2.8, -1.7, 1.4); BW(2.0, 2.8, 3.0, 1.4); BW(1.4, 0.9, 1.3, 0.45); BW(1.4, 0.6, 1.3, 2.5);
  bx(1.5, 0.06, 0.3, '#f4efe6', 1.3, 0.9, -2.9, room); bx(1.5, 0.06, 0.3, '#f4efe6', 1.3, 0.88, -3.12, room); for (const x of [0.6, 2.0]) bx(0.06, 1.36, 0.2, '#f4efe6', x, 1.55, -3, room); bx(1.46, 0.05, 0.18, '#f4efe6', 1.3, 1.55, -3, room);
  bx(0.12, 2.8, 7, '#e2d4bc', -4, 1.4, -0.5, room); bx(0.12, 2.8, 7, '#e2d4bc', 4, 1.4, -0.5, room); bx(8, 0.1, 7, '#f4f0ea', 0, 2.82, -0.5, room);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), outsideM); sky.position.set(0, 4, -14); room.add(sky);
  const yard = mesh(new THREE.PlaneGeometry(40, 12), M('#eef2f6', { roughness: 1 }), false, true); yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, -9); room.add(yard);
  // recliner (Dad's chair), side table + lamp, rug, family photos
  const lea = '#7a4a2e', lea2 = '#6a3e24'; bx(0.9, 0.42, 0.8, lea, -1.0, 0.21, -1.25, room); bx(0.9, 0.95, 0.24, lea2, -1.0, 0.75, -1.68, room).rotation.x = -0.18; for (const x of [-1.5, -0.5]) bx(0.18, 0.62, 0.8, lea2, x, 0.31, -1.25, room); bx(0.7, 0.14, 0.42, lea, -1.0, 0.3, -0.7, room);
  bx(0.45, 0.6, 0.45, '#6a4a30', -1.95, 0.3, -1.55, room); bx(0.04, 0.5, 0.04, '#2a2a30', -1.95, 0.85, -1.55, room); const sh = mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.24, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#5a3a10' })); sh.position.set(-1.95, 1.2, -1.55); room.add(sh);
  const rug = mesh(new THREE.PlaneGeometry(2.4, 1.8), M('#a84a3a', { roughness: 1 }), false, true); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.8, 0.005, -0.6); room.add(rug);
  for (const [x, y, w, h, c] of [[-2.4, 1.85, 0.5, 0.4, '#5a8ac8'], [-1.6, 2.0, 0.35, 0.45, '#e8b04a'], [-0.9, 1.8, 0.45, 0.35, '#6ab07a'], [-0.2, 2.0, 0.3, 0.3, '#d86a6a']]) { bx(w + 0.06, h + 0.06, 0.03, '#3a2a1e', x, y, -2.9, room); bx(w, h, 0.035, c, x, y, -2.9, room); }
  // kitchen (right): counter along the right wall, fridge with magnets
  bx(0.65, 0.9, 2.6, '#f2ede4', 3.6, 0.45, -1.4, room); bx(0.68, 0.05, 2.6, '#3a3a40', 3.6, 0.925, -1.4, room); bx(0.4, 0.72, 2.5, '#d8c8a8', 3.85, 1.95, -1.4, room);
  bx(0.7, 1.8, 0.7, '#e8ecee', 3.6, 0.9, 0.35, room); for (let k = 0; k < 5; k++) bx(0.02, 0.07, 0.07, pick(['#e84a4a', '#4a8ae8', '#f2c040', '#5ac87a']), 3.24, 1.1 + hash(k) * 0.6, 0.1 + hash(k + 9) * 0.45, room); }
const snowGeo = new THREE.BufferGeometry(), SN = 900, snowPos = new Float32Array(SN * 3), SN0 = []; for (let i = 0; i < SN; i++) SN0.push([R(-1.5, 4), R(0, 4), R(-7, -3.25), R(0.5, 1.2)]);
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3)); const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: new THREE.Color(2, 2, 2.1), size: 0.035, transparent: true, depthWrite: false })); snowPts.frustumCulled = false; room.add(snowPts);
room.add(dad.outer, mom.outer, dog.g);
const keys = new THREE.Group(); { const r = mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 14), M('#c8c8d0', { metalness: 0.8, roughness: 0.3 })); keys.add(r); const k = mesh(BOX, M('#c8c8d0', { metalness: 0.8, roughness: 0.3 })); k.scale.set(0.015, 0.06, 0.004); k.position.y = -0.05; keys.add(k); } dad.elbows[0].add(keys); keys.position.set(0, -0.32, 0.04);
function lightRoom(look) { const L = { day: [0.85, 2.0, [1.6, 1.7, 1.9], 0, 2.5, 0], eve: [0.6, 0.9, [1.6, 0.9, 0.6], 1.6, 2.0, 0], night: [0.22, 0, [0.12, 0.16, 0.34], 1.8, 0.6, 1.4], snow: [0.3, 0, [0.16, 0.2, 0.36], 2.2, 1.6, 0.6] }[look];
  rmHemi.intensity = L[0]; rmSun.intensity = L[1]; outsideM.color.setRGB(...L[2]); rmLamp.intensity = L[3]; rmFill.intensity = L[4]; rmGlow.intensity = L[5]; snowPts.visible = look === 'snow'; rmPorch.intensity = look === 'snow' ? 2.2 : 0; rmFace.intensity = look === 'snow' ? 2.0 : 0; }
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
// a framing = {pos, look}: camera at h + dir·dist with the head at screen height headY (0 top … 1 bottom); cameras blend between framings, no cuts
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
function blendF(A, B, k) { return { pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) }; }
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function frameCam(cam, h, dir, dist, headY, fov = 40) { applyF(cam, framing(h, dir, dist, headY, fov)); }
// =================== THE BACKYARD at sunset (meters): the back porch (two chairs, a little table, his phone face-up), the grill on the lawn, a fence, trees ===================
const yard = new THREE.Scene(); const ydCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 300);
{ const skyT = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a4a8a'); gr.addColorStop(0.45, '#c87a8a'); gr.addColorStop(0.7, '#f4a860'); gr.addColorStop(1, '#ffd890'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, color: new THREE.Color(1.15, 1.1, 1.05) })); yard.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.6), fog: false })); sun.position.set(-20, 9, 100); sun.lookAt(0, 0, 0); yard.add(sun); }
yard.fog = new THREE.Fog(0xf0b080, 25, 110);
yard.add(new THREE.HemisphereLight(0xffd0a8, 0x5a6a3a, 0.9));
const ydSun = new THREE.DirectionalLight(0xffb070, 2.6); ydSun.position.set(-4, 4, 12); ydSun.castShadow = true; ydSun.shadow.mapSize.set(2048, 2048); ydSun.shadow.bias = -0.0004; Object.assign(ydSun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, far: 40 }); yard.add(ydSun, ydSun.target);
const ydFill = new THREE.PointLight(0xffe0c0, 1.5, 8, 1.4); ydFill.position.set(0, 2.5, 4); yard.add(ydFill);
const ydBuzz = new THREE.PointLight(0xbcd4ff, 0, 0.8, 1.5); yard.add(ydBuzz);
{ const grassT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6a9a3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = pick(['#5a8a34', '#7aaa48', '#628f3a', '#84b052']); g.fillRect(rnd() * w, rnd() * h, 2, R(3, 7)); } }, [30, 30]);
  const gr = mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; yard.add(gr);
  const sid = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = '#e8e2d4'; g.fillRect(0, y, w, 30); g.fillStyle = '#b8b0a0'; g.fillRect(0, y + 29, w, 3); } }, [5, 2]);
  const wall = mesh(BOX, new THREE.MeshStandardMaterial({ map: sid, roughness: 0.9 })); wall.scale.set(10, 3.4, 0.2); wall.position.set(0, 1.7, -0.1); yard.add(wall); bx(10.4, 0.25, 0.4, '#5a4a40', 0, 3.45, -0.05, yard);
  bx(0.95, 2.1, 0.06, '#8a3a2a', -1.2, 1.35, 0.02, yard); bx(1.2, 0.95, 0.05, '#ffd8a0', 1.6, 1.8, 0.02, yard).material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.4, 0.9) }); bx(1.3, 0.06, 0.12, '#f4f0ea', 1.6, 1.3, 0.06, yard);
  // porch deck, steps, railing
  const deck = canvasTex(256, 256, (g, w, h) => { for (let x = 0; x < w; x += 28) { g.fillStyle = pick(['#a8784e', '#a07048', '#b0805a']); g.fillRect(x, 0, 27, h); g.fillStyle = 'rgba(60,35,20,0.4)'; g.fillRect(x + 26, 0, 2, h); } }, [3, 1]);
  const dk = mesh(BOX, new THREE.MeshStandardMaterial({ map: deck, roughness: 0.85 })); dk.scale.set(6, 0.3, 2.2); dk.position.set(0, 0.15, 1.1); yard.add(dk);
  for (let k = 0; k < 2; k++) bx(1.4, 0.15, 0.32, '#a07048', 2.2, 0.075 + k * 0, 2.36 + k * 0.3, yard);
  for (const x of [-2.95, -1.5, 0, 1.4]) bx(0.08, 0.9, 0.08, '#f4f0ea', x, 0.75, 2.15, yard); bx(4.4, 0.06, 0.1, '#f4f0ea', -0.8, 1.15, 2.15, yard);
  // porch chairs + the little table
  for (const x of [-0.6, 0.9]) { bx(0.55, 0.06, 0.5, '#f4f0ea', x, 0.72, 1.05, yard); bx(0.55, 0.6, 0.06, '#f4f0ea', x, 1.05, 0.8, yard); for (const [dx, dz] of [[-0.24, -0.2], [0.24, -0.2], [-0.24, 0.2], [0.24, 0.2]]) bx(0.05, 0.42, 0.05, '#f4f0ea', x + dx, 0.51, 1.05 + dz, yard); }
  bx(0.45, 0.05, 0.45, '#6a4a30', 0.15, 0.86, 1.25, yard); bx(0.06, 0.55, 0.06, '#6a4a30', 0.15, 0.58, 1.25, yard);
  // fence + trees far away
  for (let x = -14; x <= 14; x += 0.5) bx(0.12, 1.5, 0.05, '#e8dcc8', x, 0.75, 12, yard); bx(28, 0.08, 0.05, '#d8ccb8', 0, 1.2, 11.95, yard);
  for (let i = 0; i < 14; i++) { const x = R(-16, 16), z = R(14, 30), hgt = R(3, 6); const tr = mesh(new THREE.ConeGeometry(R(1, 1.8), hgt, 7), M(pick(['#3a6a34', '#4a7a3a', '#2f5a2e']), { flatShading: true })); tr.position.set(x, hgt / 2 + 0.6, z); yard.add(tr); } }
const tablePhone = makePhone(); tablePhone.rotation.x = -Math.PI / 2; tablePhone.position.set(0.15, 0.895, 1.25); yard.add(tablePhone);
// the grill: kettle on legs, lid up, burgers on the grate (one extra), smoke
const grill = new THREE.Group(); grill.position.set(1.6, 0, 5.0); yard.add(grill);
{ const blk = M('#1e1e22', { roughness: 0.5, metalness: 0.3 }); const bowl = mesh(new THREE.SphereGeometry(0.35, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), blk); bowl.position.y = 0.85; grill.add(bowl);
  const lid = mesh(new THREE.SphereGeometry(0.35, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), blk); lid.position.set(-0.36, 0.85, 0); lid.rotation.z = 1.4; grill.add(lid);
  for (let k = 0; k < 3; k++) { const a = k * 2.09; const l = bx(0.03, 0.75, 0.03, '#2a2a2e', Math.cos(a) * 0.24, 0.4, Math.sin(a) * 0.24, grill); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
  const grate = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.01, 20), M('#5a5a60', { metalness: 0.6, roughness: 0.4 })); grate.position.y = 0.86; grill.add(grate);
  const coal = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.01, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 0.15) })); coal.position.y = 0.72; grill.add(coal); }
const burgers = [[-0.14, -0.1], [0.12, -0.12], [-0.1, 0.13], [0.15, 0.12]].map(([x, z]) => { const b = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 14), M('#5a3420', { roughness: 0.9 })); b.position.set(x, 0.885, z); grill.add(b); return b; });
const spatula = new THREE.Group(); { bx(0.012, 0.3, 0.02, '#3a2a20', 0, 0.12, 0, spatula); bx(0.08, 0.004, 0.09, '#c8c8d0', 0, -0.04, 0.03, spatula); } dad.elbows[0].add(spatula); spatula.position.set(0, -0.3, 0.03); spatula.rotation.x = -0.9;
const grillSmoke = makeSmoke(yard, 160);
// generated by tools/groc_timing.py from the narration timestamps — do not edit by hand
const T_END = 63.511;
const CAPS = [[0.3, 3.055, "Why does carrying in the groceries always take five trips?"], [3.075, 4.077, "Let's fix that."], [4.097, 5.935, "First, hooks on your arms."], [5.955, 7.131, "Now it all comes in at once,"], [7.151, 9.128, "until the bags start hitting your knees."], [9.148, 9.987, "Move the hooks up,"], [10.007, 11.474, "onto a frame on your back."], [11.494, 12.311, "Your arms are free,"], [12.331, 13.68, "but your back isn't happy."], [13.7, 14.632, "Put it on wheels."], [14.652, 15.408, "Much better."], [15.428, 17.012, "Except the porch has steps."], [17.032, 17.906, "Give it legs."], [17.926, 18.94, "Now it climbs."], [18.96, 20.832, "Unfortunately, so do the eggs."], [20.852, 21.865, "Add suspension."], [21.885, 22.584, "Smooth."], [22.604, 24.175, "The neighbors are starting to stare."], [24.195, 25.325, "One of them is filming."], [25.345, 27.009, "But you're still doing all the walking."], [27.029, 27.659, "Add a seat,"], [27.679, 28.448, "and a motor."], [28.468, 29.493, "Now it's fast."], [29.513, 30.374, "Too fast."], [30.394, 31.592, "The milk goes flying."], [31.612, 32.765, "Add seat belts."], [32.785, 33.6, "For the milk."], [33.62, 35.98, "Then the leaves start falling into your bags."], [36.0, 36.85, "Add a roof."], [36.87, 38.197, "Thanksgiving is coming."], [38.217, 39.532, "Add two more legs,"], [39.552, 40.403, "for the turkey."], [40.423, 41.858, "Now the ice cream's melting."], [41.878, 42.856, "Install a freezer."], [42.876, 43.739, "And a fridge."], [43.759, 44.598, "A pantry."], [44.618, 45.934, "A counter for snacks."], [45.954, 46.921, "A dishwasher."], [46.941, 47.757, "Obviously."], [47.777, 49.069, "And a coffee machine."], [49.089, 50.022, "And a TV,"], [50.042, 51.763, "for the long ride up the driveway."], [51.783, 53.052, "Congratulations."], [53.072, 54.702, "You've built a kitchen that walks."], [54.722, 55.56, "One trip."], [55.58, 56.524, "Every bag."], [56.544, 58.453, "You drive it right up to the front door,"], [58.473, 60.217, "and the house keys are in the car."], [60.237, 62.311, "Looks like it's two trips."]];
const CUE = {"whydoescarryin": 0.3, "letsfixthat": 3.075, "firsthookson": 4.097, "nowitall": 5.955, "movethehooks": 9.148, "yourarmsare": 11.494, "putiton": 13.7, "muchbetter": 14.652, "excepttheporch": 15.428, "giveitlegs": 17.032, "nowitclimbs": 17.926, "unfortunatelys": 18.96, "addsuspension": 20.852, "smooth": 21.885, "theneighborsar": 22.604, "oneofthem": 24.195, "butyourestill": 25.345, "addaseat": 27.029, "nowitsfast": 28.468, "toofast": 29.513, "themilkgoes": 30.394, "addseatbelts": 31.612, "forthemilk": 32.785, "thentheleaves": 33.62, "addaroof": 36.0, "thanksgivingis": 36.87, "addtwomore": 38.217, "nowtheice": 40.423, "installafreeze": 41.878, "andafridge": 42.876, "apantry": 43.759, "acounterfor": 44.618, "adishwasher": 45.954, "obviously": 46.941, "andacoffee": 47.777, "andatv": 49.089, "congratulation": 51.783, "youvebuilta": 53.072, "onetrip": 54.722, "everybag": 55.58, "youdriveit": 56.544, "lookslikeits": 60.237};
const WORDS = [[0.3, "Why"], [0.544, "does"], [0.73, "carrying"], [1.066, "in"], [1.148, "the"], [1.252, "groceries"], [1.729, "always"], [1.973, "take"], [2.182, "five"], [2.449, "trips?"], [3.075, "Let's"], [3.343, "fix"], [3.61, "that."], [4.097, "First,"], [4.724, "hooks"], [5.027, "on"], [5.155, "your"], [5.329, "arms."], [5.955, "Now"], [6.187, "it"], [6.256, "all"], [6.419, "comes"], [6.652, "in"], [6.745, "at"], [6.873, "once,"], [7.151, "until"], [7.418, "the"], [7.535, "bags"], [7.871, "start"], [8.138, "hitting"], [8.394, "your"], [8.521, "knees."], [9.148, "Move"], [9.392, "the"], [9.497, "hooks"], [9.787, "up,"], [10.007, "onto"], [10.321, "a"], [10.403, "frame"], [10.693, "on"], [10.798, "your"], [10.937, "back."], [11.494, "Your"], [11.715, "arms"], [11.936, "are"], [12.064, "free,"], [12.331, "but"], [12.471, "your"], [12.622, "back"], [12.854, "isn't"], [13.109, "happy."], [13.7, "Put"], [13.899, "it"], [13.992, "on"], [14.096, "wheels."], [14.652, "Much"], [14.907, "better."], [15.428, "Except"], [15.743, "the"], [15.847, "porch"], [16.172, "has"], [16.335, "steps."], [17.032, "Give"], [17.229, "it"], [17.333, "legs."], [17.926, "Now"], [18.158, "it"], [18.275, "climbs."], [18.96, "Unfortunately,"], [19.878, "so"], [20.075, "do"], [20.18, "the"], [20.296, "eggs."], [20.852, "Add"], [21.096, "suspension."], [21.885, "Smooth."], [22.604, "The"], [22.78, "neighbors"], [23.105, "are"], [23.209, "starting"], [23.511, "to"], [23.615, "stare."], [24.195, "One"], [24.369, "of"], [24.45, "them"], [24.614, "is"], [24.73, "filming."], [25.345, "But"], [25.507, "you're"], [25.705, "still"], [25.949, "doing"], [26.169, "all"], [26.285, "the"], [26.401, "walking."], [27.029, "Add"], [27.25, "a"], [27.319, "seat,"], [27.679, "and"], [27.854, "a"], [27.912, "motor."], [28.468, "Now"], [28.666, "it's"], [28.84, "fast."], [29.513, "Too"], [29.78, "fast."], [30.394, "The"], [30.557, "milk"], [30.789, "goes"], [30.998, "flying."], [31.612, "Add"], [31.879, "seat"], [32.112, "belts."], [32.785, "For"], [32.959, "the"], [33.063, "milk."], [33.62, "Then"], [33.84, "the"], [33.956, "leaves"], [34.41, "start"], [34.724, "falling"], [35.049, "into"], [35.258, "your"], [35.385, "bags."], [36.0, "Add"], [36.22, "a"], [36.302, "roof."], [36.87, "Thanksgiving"], [37.486, "is"], [37.625, "coming."], [38.217, "Add"], [38.461, "two"], [38.67, "more"], [38.879, "legs,"], [39.552, "for"], [39.715, "the"], [39.819, "turkey."], [40.423, "Now"], [40.597, "the"], [40.713, "ice"], [40.887, "cream's"], [41.177, "melting."], [41.878, "Install"], [42.296, "a"], [42.366, "freezer."], [42.876, "And"], [43.097, "a"], [43.167, "fridge."], [43.759, "A"], [43.922, "pantry."], [44.618, "A"], [44.781, "counter"], [45.106, "for"], [45.245, "snacks."], [45.954, "A"], [46.105, "dishwasher."], [46.941, "Obviously."], [47.777, "And"], [48.034, "a"], [48.138, "coffee"], [48.486, "machine."], [49.089, "And"], [49.356, "a"], [49.449, "TV,"], [50.042, "for"], [50.193, "the"], [50.321, "long"], [50.6, "ride"], [50.82, "up"], [50.936, "the"], [51.029, "driveway."], [51.783, "Congratulations."], [53.072, "You've"], [53.328, "built"], [53.548, "a"], [53.63, "kitchen"], [53.921, "that"], [54.072, "walks."], [54.722, "One"], [54.989, "trip."], [55.58, "Every"], [55.975, "bag."], [56.544, "You"], [56.73, "drive"], [57.02, "it"], [57.16, "right"], [57.404, "up"], [57.531, "to"], [57.636, "the"], [57.74, "front"], [57.997, "door,"], [58.473, "and"], [58.658, "the"], [58.798, "house"], [59.1, "keys"], [59.355, "are"], [59.471, "in"], [59.576, "the"], [59.692, "car."], [60.237, "Looks"], [60.492, "like"], [60.666, "it's"], [60.852, "two"], [61.096, "trips."]];
// =================== THE STREET (meters; x → right, z → toward the street): a brick house with a porch (2 steps) and a panelled red door, the driveway with
// an SUV (hatch up, groceries inside), the front walk, lawns + hedges, a neighbor's house with two neighbors who stare, trees, fence, mailbox, lamps, street.
// Look: textured materials (brick, paving, shingles, grass) with bump maps, bevelled edges everywhere, soft sun + ambient occlusion (GTAO, in g_main) ===================
const STYLE = new URLSearchParams(location.search).get('style') || 'lowpoly';   // 'lowpoly' (faceted, golden hour) | 'clay' (soft matte miniature) | 'smooth' (textured; too close to the reference channel)
const LOW = STYLE === 'lowpoly', CLAY = STYLE === 'clay', FALL = LOW;   // low-poly = autumn, golden hour (her pick, Oct 29)
const st = new THREE.Scene(); const stCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 300);
{ const skyT = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); if (LOW) { gr.addColorStop(0, '#3f6eb4'); gr.addColorStop(0.35, '#8a9cc8'); gr.addColorStop(0.62, '#e8b4a0'); gr.addColorStop(0.85, '#f8b678'); gr.addColorStop(1, '#ffd49a'); } else if (CLAY) { gr.addColorStop(0, '#8cc0ec'); gr.addColorStop(1, '#f4e8dc'); } else { gr.addColorStop(0, '#4f8fd8'); gr.addColorStop(0.5, '#9cc8f0'); gr.addColorStop(1, '#e6f0f8'); } g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  st.add(new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false }))); }
st.fog = new THREE.Fog(LOW ? 0xf2c49a : CLAY ? 0xf0e8de : 0xdfeaf4, LOW ? 35 : 50, 150);
st.add(LOW ? new THREE.HemisphereLight(0xffe2c4, 0x7a5a3a, 1.05) : CLAY ? new THREE.HemisphereLight(0xfff4ea, 0x9a8a6a, 1.35) : new THREE.HemisphereLight(0xe8f2ff, 0x7a8a5a, 1.15));
const stSun = new THREE.DirectionalLight(LOW ? 0xffb874 : CLAY ? 0xfff2e4 : 0xfff0dc, LOW ? 2.8 : CLAY ? 1.9 : 2.4); if (LOW) stSun.position.set(13, 6.2, 9); else stSun.position.set(8, 13, 9); stSun.castShadow = true; stSun.shadow.mapSize.set(4096, 4096); stSun.shadow.bias = -0.0003; stSun.shadow.normalBias = 0.02;
Object.assign(stSun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 45 }); st.add(stSun, stSun.target);
const camKey = new THREE.PointLight(0xfff0e0, 0.9, 7, 1.3); stCam.add(camKey); st.add(stCam);   // soft fill riding with the camera
const PORCH_Y = 0.54, STEP = [[-4.4, -4.08, 0.36], [-4.08, -3.76, 0.18]];   // [z0, z1, top]: deck at z -6..-4.4
// ---- texture kit: a colour map + a matching bump map from the same drawing ----
function texPair(w, h, draw, repeat) { const mk = (bump) => canvasTex(w, h, (g, W_, H_) => draw(g, W_, H_, bump), repeat); const map = mk(false), bump = mk(true); bump.colorSpace = THREE.NoColorSpace; return { map, bump }; }
const noise = (g, w, h, n, cols, s = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(mr() * cols.length) | 0]; g.fillRect(mr() * w, mr() * h, 1 + mr() * s, 1 + mr() * s); } };
const mr = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();   // deterministic textures / scatter
const BRICK = texPair(512, 512, (g, w, h, bump) => { g.fillStyle = bump ? '#202020' : '#d8d0c4'; g.fillRect(0, 0, w, h); const bw = 64, bh = 24;
  for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2;
    g.fillStyle = bump ? `rgb(${200 + (mr() * 40 | 0)},${200},${200})` : ['#a8503a', '#9a4632', '#b25a40', '#8e4030', '#a24c38', '#b86448'][(mr() * 6) | 0]; g.fillRect(x, y, bw - 4, bh - 4);
    if (!bump) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, y + bh - 9, bw - 4, 5); } } if (!bump) noise(g, w, h, 2500, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.07)']); }, [3, 3]);
const PAVE = texPair(512, 512, (g, w, h, bump) => { g.fillStyle = bump ? '#303030' : '#9a9a98'; g.fillRect(0, 0, w, h); const s = 128;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = mr(); g.fillStyle = bump ? '#d8d8d8' : `rgb(${196 + v * 22 | 0},${194 + v * 22 | 0},${188 + v * 22 | 0})`; g.fillRect(c * s + 3, r * s + 3, s - 6, s - 6); }
  if (!bump) noise(g, w, h, 5000, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.06)', 'rgba(120,110,90,0.06)']); }, [1, 1]);
const ASPH = texPair(256, 256, (g, w, h, bump) => { g.fillStyle = bump ? '#808080' : '#55575c'; g.fillRect(0, 0, w, h); noise(g, w, h, 9000, bump ? ['#606060', '#a0a0a0'] : ['#4a4c50', '#616368', '#6a6c70', '#45474b'], 2); }, [1, 1]);
const GRASS = texPair(256, 256, (g, w, h, bump) => { g.fillStyle = bump ? '#808080' : '#6aac4c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const x = mr() * w, y = mr() * h; g.strokeStyle = bump ? (mr() > 0.5 ? '#b0b0b0' : '#505050') : ['#5a9c40', '#78ba56', '#4e8e3a', '#86c462', '#64a648'][(mr() * 5) | 0]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + mr() * 2 - 1, y - 3 - mr() * 3); g.stroke(); } }, [1, 1]);
const SHING = texPair(256, 256, (g, w, h, bump) => { g.fillStyle = bump ? '#202020' : '#3e4048'; g.fillRect(0, 0, w, h); const bw = 32, bh = 20;
  for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { const v = mr(); g.fillStyle = bump ? '#c8c8c8' : `rgb(${70 + v * 20 | 0},${72 + v * 20 | 0},${80 + v * 20 | 0})`; g.fillRect(c * bw + (r % 2 ? bw / 2 : 0) + 1, r * bh + 1, bw - 2, bh - 3); } }, [5, 3]);
const SIDING = texPair(256, 256, (g, w, h, bump) => { for (let y = 0; y < h; y += 16) { g.fillStyle = bump ? '#c0c0c0' : '#e9e3d4'; g.fillRect(0, y, w, 15); g.fillStyle = bump ? '#303030' : '#c9c1ae'; g.fillRect(0, y + 14, w, 2); } }, [5, 3]);
const FLAT = new Map(); const flatCol = { BRICK: LOW ? '#c2674a' : '#e0907a', PAVE: LOW ? '#dcd4c6' : '#efe6d6', ASPH: LOW ? '#5c5e66' : '#7a7c84', GRASS: LOW ? '#7cbf5a' : '#94cc72', SHING: LOW ? '#4c5060' : '#8a6a6a', SIDING: '#b8d4e8' };
const tex = (T, rx, ry, extra = {}) => { if (!(LOW || CLAY)) return texSmooth(T, rx, ry, extra); const key = Object.keys(TEXS).find(k => TEXS[k] === T); const col = extra.color && key !== 'PAVE' && key !== 'BRICK' ? extra.color : flatCol[key];
  return new THREE.MeshStandardMaterial({ color: col, roughness: CLAY ? 1.0 : 0.85, flatShading: LOW }); };
const texSmooth = (T, rx, ry, extra = {}) => { const map = T.map.clone(), bump = T.bump.clone(); for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; }
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.6, roughness: 0.9, ...extra }); };
const TEXS = { BRICK, PAVE, ASPH, GRASS, SHING, SIDING };
// bevelled box (everything gets soft edges, like a modelled set)
const RBG = {};
function rb(w, h, d, mat, x, y, z, par = st, r = 0.04) { const rr = Math.min(r, 0.45 * Math.min(w, h, d)), k = [w, h, d, rr].map(v => v.toFixed(3)).join('_');   // true-size rounded box: the bevel stays r, never stretched
  const m = mesh(RBG[k] || (RBG[k] = new RoundedBoxGeometry(w, h, d, LOW ? 1 : CLAY ? 4 : 2, CLAY ? Math.min(rr * 2.5, 0.45 * Math.min(w, h, d)) : rr)), typeof mat === 'string' ? M(mat, { roughness: 0.75 }) : mat); m.position.set(x, y, z); par.add(m); return m; }
function plane(w, d, mat, x, z, y = 0.01, par = st) { const p = mesh(new THREE.PlaneGeometry(w, d), mat, false, true); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); par.add(p); return p; }
{ // ground: lawn, street + curbs, sidewalk, front walk, driveway
  if (LOW) { const g = new THREE.PlaneGeometry(140, 70, 120, 60).toNonIndexed(), P = g.attributes.position, cols = [], c = new THREE.Color();
    for (let i = 0; i < P.count; i++) P.setZ(i, 0.05 * (hash(Math.round(P.getX(i) * 10) * 7.1 + Math.round(P.getY(i) * 10) * 3.3) - 0.5));
    for (let i = 0; i < P.count; i += 3) { c.set(['#8aa648', '#94ae4e', '#7e9a42', '#a2b252', '#96a444'][(hash(i * 0.37) * 5) | 0]); for (let k = 0; k < 3; k++) cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); const lawn = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), false, true); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.02, -6); st.add(lawn); }
  else plane(140, 70, tex(GRASS, 70, 35), 0, -6, 0);
  plane(140, 7, tex(ASPH, 35, 2), 0, 13.6, 0.004); for (let x = -50; x < 50; x += 4) plane(1.8, 0.14, M('#f0e6a6', { roughness: 0.7 }), x, 13.6, 0.008);
  for (const z of [10.0, 7.85]) rb(140, 0.16, 0.22, M('#c8c4bc', { roughness: 0.9 }), 0, 0.06, z, st, 0.03);
  plane(140, 2.0, tex(PAVE, 70, 1), 0, 8.95, 0.015);
  plane(1.4, 12.0, tex(PAVE, 1, 8.5), 0, 1.9, 0.018); plane(3.8, 14.6, tex(PAVE, 2.7, 10.4, { color: '#e8e4dc' }), 5.3, 0.6, 0.016);
  plane(1.4, 12.0, tex(PAVE, 1, 8.5), -13, 2, 0.018); }
{ // the house: brick, white trim, shingle roof, gutters
  const brick = tex(BRICK, 4, 2.2), trim = M('#f6f4ee', { roughness: 0.6 }), roofM = tex(SHING, 4, 2);
  rb(7.4, 3.3, 4.2, brick, -0.4, 1.65, -8.1, st, 0.02); rb(4.6, 2.8, 4.2, tex(BRICK, 2.6, 1.9), 5.3, 1.4, -8.1, st, 0.02);
  for (const [w, x, y, z] of [[7.9, -0.4, 3.3, -8.1], [5.1, 5.3, 2.8, -8.1]]) { for (const s of [-1, 1]) { const r = rb(w, 0.12, 2.75, roofM, x, y + 0.75, z + s * 1.05, st, 0.02); r.rotation.x = s * 0.58; }
    rb(w, 0.12, 0.14, trim, x, y + 0.02, -5.95, st, 0.04); rb(w + 0.1, 0.1, 0.12, M('#d8d8d4'), x, y - 0.04, -5.86, st, 0.03); }
  rb(7.45, 0.16, 0.1, trim, -0.4, 0.08, -5.98, st, 0.03);
  // windows: white frame, sill, mullions, glass with a sky reflection, curtains
  const glass = new THREE.MeshStandardMaterial({ color: '#8ab4d8', roughness: 0.08, metalness: 0.5, emissive: '#2a4258', emissiveIntensity: 0.35 });
  for (const [x, y, w, h] of [[-3.1, 1.85, 1.0, 1.2], [-1.8, 1.85, 1.0, 1.2], [1.4, 1.85, 1.0, 1.2], [2.55, 1.85, 0.7, 1.2]]) {
    rb(w + 0.16, h + 0.16, 0.1, trim, x, y, -5.96, st, 0.03); rb(w, h, 0.05, glass, x, y, -5.93, st, 0.01); rb(w + 0.3, 0.07, 0.2, trim, x, y - h / 2 - 0.1, -5.88, st, 0.02);
    rb(0.05, h, 0.06, trim, x, y, -5.9, st, 0.01); rb(w, 0.05, 0.06, trim, x, y + 0.08, -5.9, st, 0.01); for (const s of [-1, 1]) rb(w * 0.22, h * 0.9, 0.02, M('#e8d8b8'), x + s * w * 0.36, y + 0.02, -5.95, st, 0.005); }
  // the front door: frame, 6 panels, knocker plate, lamp, house number, mat
  rb(1.36, 2.42, 0.12, trim, 0, PORCH_Y + 1.18, -5.97, st, 0.03); const dm = M('#a8302c', { roughness: 0.45 });
  rb(1.08, 2.2, 0.08, dm, 0, PORCH_Y + 1.1, -5.92, st, 0.02); for (let r = 0; r < 3; r++) for (const s of [-1, 1]) rb(0.36, r === 0 ? 0.44 : 0.6, 0.03, M('#922824', { roughness: 0.5 }), s * 0.24, PORCH_Y + 0.42 + r * 0.66 + (r === 0 ? -0.06 : 0), -5.875, st, 0.012);
  rb(0.24, 0.06, 0.12, M('#2a2a2e'), 0.95, PORCH_Y + 1.8, -5.9, st, 0.02); const lamp = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 8), new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffd890', emissiveIntensity: 0.6 })); lamp.position.set(0.95, PORCH_Y + 1.65, -5.84); st.add(lamp);
  rb(0.28, 0.14, 0.03, M('#2a2a2e'), -0.95, PORCH_Y + 1.85, -5.9, st, 0.01); rb(0.9, 0.02, 0.55, M('#7a5a3a', { roughness: 1 }), 0, PORCH_Y + 0.01, -5.5, st, 0.01);
  // porch: paved deck + 2 steps with nosings, columns, a little roof
  const pv = tex(PAVE, 2, 1.1, { color: '#e8e4dc' }); rb(3.1, PORCH_Y, 1.65, pv, 0, PORCH_Y / 2, -5.2, st, 0.03); for (const [z0, z1, top] of STEP) rb(1.7, top, z1 - z0 + 0.02, pv, 0, top / 2, (z0 + z1) / 2, st, 0.025);
  for (const x of [-1.42, 1.42]) { rb(0.16, 2.45, 0.16, trim, x, PORCH_Y + 1.22, -4.52, st, 0.03); rb(0.24, 0.12, 0.24, trim, x, PORCH_Y + 0.06, -4.52, st, 0.03); }
  rb(3.3, 0.16, 1.95, trim, 0, PORCH_Y + 2.5, -5.1, st, 0.04); { const pr = rb(3.4, 0.1, 2.2, roofM, 0, PORCH_Y + 2.72, -5.05, st, 0.02); pr.rotation.x = 0.18; }
  // garage door with panels + a wall lamp
  rb(3.6, 2.35, 0.08, trim, 5.3, 1.17, -5.96, st, 0.02); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rb(0.78, 0.46, 0.03, M('#eceae2'), 3.97 + c * 0.89, 0.3 + r * 0.57, -5.91, st, 0.015); }
{ // greenery: hedges in front of the house (many leafy lumps), trees, flowers; a white picket fence; mailbox; street lamps
  const leaf = FALL ? ['#5e7a34', '#6a8638', '#56702e', '#7a8a3a'].map(c => M(c, { roughness: 0.85 })) : [M('#3f8a3a', { roughness: 0.85 }), M('#4b9a42', { roughness: 0.85 }), M('#36803a', { roughness: 0.85 }), M('#56a64a', { roughness: 0.85 })],
    crown = FALL ? ['#e07a2a', '#d4562a', '#f0a63a', '#c8402a', '#e8c050', '#b8582a'].map(c => M(c, { roughness: 0.85 })) : null, LG = new THREE.IcosahedronGeometry(1, LOW ? 0 : CLAY ? 3 : 1);
  const hedge = (x0, x1, z, h = 0.75) => { for (let x = x0; x <= x1; x += 0.22) for (let k = 0; k < 3; k++) { const m = mesh(LG, leaf[(mr() * 4) | 0]); const s = 0.22 + mr() * 0.1; m.scale.setScalar(s); m.position.set(x + mr() * 0.1, h * (0.35 + 0.33 * k) + mr() * 0.08, z + (mr() - 0.5) * 0.35); st.add(m); } };
  hedge(-3.9, -1.7, -5.45); hedge(1.7, 3.0, -5.45); hedge(-17.2, -14.0, -5.45); hedge(-12.4, -10.8, -5.45);
  const tree = (x, z, s = 1) => { const tr = mesh(new THREE.CylinderGeometry(0.11 * s, 0.17 * s, 2.0 * s, 9), M('#6e4e34', { roughness: 0.9 })); tr.position.set(x, 1.0 * s, z); st.add(tr);
    for (let k = 0; k < 9; k++) { const a = k * 2.4, r = k ? 0.75 * s : 0, c = mesh(LG, crown ? crown[(((k + Math.round(x * 3)) % crown.length) + crown.length) % crown.length] : leaf[k % 4]); c.scale.setScalar((0.75 + 0.25 * Math.sin(k * 3)) * s); c.position.set(x + Math.cos(a) * r, (2.5 + 0.45 * Math.sin(k * 1.7) + (k ? 0 : 0.5)) * s, z + Math.sin(a) * r * 0.8); st.add(c); } };
  tree(-6.5, 3.5, 1.15); tree(9.8, 2.0, 1.0); tree(-2.9, 7.2, 0.85); tree(12.5, -4, 1.3); tree(-17, -1.5, 1.2); tree(-21, 6, 1.1); tree(16, 6.5, 1.0);
  if (FALL) { // fallen leaves (little flat triangles) all over the lawns, drifts by the trees; pumpkins on the steps; a wreath on the door
    const LC = ['#e07a2a', '#d4562a', '#f0a63a', '#c8402a', '#e8c050'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true, side: THREE.DoubleSide })), LF = new THREE.CircleGeometry(0.07, 3);
    const leafAt = (x, z, y = 0.02) => { const l = mesh(LF, LC[(mr() * 5) | 0], false, true); l.rotation.set(-Math.PI / 2 + (mr() - 0.5) * 0.5, 0, mr() * 6.28); l.scale.set(1, 0.6 + mr() * 0.6, 1); l.position.set(x, y, z); st.add(l); };
    for (let i = 0; i < 900; i++) { const x = -22 + mr() * 40, z = -5.4 + mr() * 13; if (Math.abs(x - 5.3) < 2.2 && z < 8 && mr() < 0.7) continue; leafAt(x, z); }
    for (const [tx, tz, n] of [[-6.5, 3.5, 160], [9.8, 2.0, 120], [-2.9, 7.2, 100], [12.5, -4, 120], [-17, -1.5, 120]]) for (let i = 0; i < n; i++) { const a = mr() * 6.28, r = Math.sqrt(mr()) * 1.8; leafAt(tx + Math.cos(a) * r, tz + Math.sin(a) * r, 0.02 + 0.06 * (1 - r / 1.8) * mr()); }
    for (const [x, y, z, s] of [[-0.62, 0.36 + 0.13, -4.25, 0.17], [0.65, 0.18 + 0.12, -3.93, 0.14], [-1.1, PORCH_Y + 0.15, -4.7, 0.2], [1.12, PORCH_Y + 0.12, -4.75, 0.15]]) {
      const pk = mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#e8762a', roughness: 0.7, flatShading: true })); pk.scale.set(s * 1.15, s * 0.8, s * 1.15); pk.position.set(x, y, z); st.add(pk);
      const stem = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 5), M('#5a4a2a')); stem.position.set(x, y + s * 0.8, z); st.add(stem); }
    const wr = mesh(new THREE.TorusGeometry(0.26, 0.07, 5, 12), new THREE.MeshStandardMaterial({ color: '#c8642a', roughness: 0.8, flatShading: true })); wr.position.set(0, PORCH_Y + 1.6, -5.8); st.add(wr);
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, l = mesh(LF, LC[i % 5]); l.scale.setScalar(1.3); l.position.set(Math.cos(a) * 0.27, PORCH_Y + 1.6 + Math.sin(a) * 0.27, -5.74); l.rotation.z = a; st.add(l); } }
  const fl = FALL ? ['#e8762a', '#f0b030', '#c8402a', '#f8d070'] : ['#f06a8a', '#f8d040', '#ffffff', '#b87ae8'];
  for (let i = 0; i < 40; i++) { const f = mesh(new THREE.IcosahedronGeometry(0.05, 0), M(fl[i % 4], { roughness: 0.6 })); f.position.set(-3.8 + mr() * 2.0, 0.22 + mr() * 0.1, -4.9 + mr() * 0.4); st.add(f); }
  for (let x = -9.6; x <= -2.0; x += 0.24) rb(0.08, 0.9, 0.04, M('#f8f6f0', { roughness: 0.6 }), x, 0.45, -1.2, st, 0.015);
  for (const y of [0.3, 0.7]) rb(7.7, 0.07, 0.03, M('#f0eee8'), -5.8, y, -1.17, st, 0.01);
  rb(0.1, 1.0, 0.1, M('#4a3a2e'), 2.4, 0.5, 8.0, st, 0.02); rb(0.24, 0.26, 0.48, M('#2a3a5a', { roughness: 0.4, metalness: 0.3 }), 2.4, 1.1, 8.0, st, 0.08); rb(0.03, 0.14, 0.08, M('#e83a3a'), 2.55, 1.2, 7.9, st, 0.01);
  for (const x of [-9, 9]) { const p = mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8), M('#2e3034', { roughness: 0.5, metalness: 0.4 })); p.position.set(x, 2.1, 7.6); st.add(p); rb(0.5, 0.16, 0.28, M('#2e3034'), x, 4.2, 7.75, st, 0.04); } }
{ // the neighbor's house (blue siding)
  const sid = tex(SIDING, 5, 2.5, { color: '#b8d4e8' }); rb(7.2, 3.1, 5, sid, -14, 1.55, -8.6, st, 0.02);
  for (const s of [-1, 1]) { const r = rb(7.7, 0.12, 3.2, tex(SHING, 4, 2, { color: '#8a6a5a' }), -14, 3.85, -8.6 + s * 1.25, st, 0.02); r.rotation.x = s * 0.6; }
  rb(1.2, 2.3, 0.1, M('#f6f4ee'), -13, 1.15, -6.06, st, 0.03); rb(0.98, 2.12, 0.06, M('#2f5a8a', { roughness: 0.5 }), -13, 1.06, -6.0, st, 0.02);
  for (const x of [-16, -11.4]) { rb(1.16, 1.16, 0.1, M('#f6f4ee'), x, 1.8, -6.06, st, 0.03); rb(1.0, 1.0, 0.05, new THREE.MeshStandardMaterial({ color: '#8ab4d8', roughness: 0.08, metalness: 0.5, emissive: '#2a4258', emissiveIntensity: 0.35 }), x, 1.8, -6.02, st, 0.01); } }
// ---- the SUV (rounded body, rear to the street, hatch up) + the keys left on the driver's seat ----
const car = new THREE.Group(); car.position.set(5.3, 0, 1.2); st.add(car);
{ const paint = M('#3a4e6a', { roughness: 0.28, metalness: 0.45 }), dark = M('#1c1e24', { roughness: 0.6 }), glass = new THREE.MeshStandardMaterial({ color: '#1e2a36', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55 }), chrome = M('#d8dce2', { roughness: 0.2, metalness: 0.9 });
  rb(1.95, 0.8, 4.6, paint, 0, 0.78, 0, car, 0.18); rb(1.8, 0.65, 2.95, paint, 0, 1.45, 0.35, car, 0.16); rb(1.84, 0.5, 2.7, glass, 0, 1.47, 0.35, car, 0.12);
  rb(1.97, 0.14, 4.62, dark, 0, 0.42, 0, car, 0.06);
  for (const [x, z] of [[-0.86, -1.45], [0.86, -1.45], [-0.86, 1.45], [0.86, 1.45]]) { const w = mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.26, 24), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.37, z); car.add(w);
    const rim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.27, 12), chrome); rim.rotation.z = Math.PI / 2; rim.position.set(x, 0.37, z); car.add(rim); }
  const hatch = new THREE.Group(); hatch.position.set(0, 1.75, 1.8); car.add(hatch); hatch.rotation.x = -1.25; rb(1.8, 0.07, 1.12, paint, 0, 0, 0.55, hatch, 0.03); rb(1.5, 0.05, 0.7, glass, 0, -0.04, 0.5, hatch, 0.02);
  rb(1.72, 0.05, 1.3, '#2a2c32', 0, 0.85, 1.55, car, 0.02);
  for (const x of [-0.75, 0.75]) { rb(0.32, 0.14, 0.06, new THREE.MeshStandardMaterial({ color: '#e83a3a', emissive: '#7a0a0a' }), x, 1.0, 2.29, car, 0.02); rb(0.36, 0.12, 0.06, new THREE.MeshStandardMaterial({ color: '#f8f8f0', emissive: '#a8a890' }), x, 0.92, -2.29, car, 0.02); }
  rb(1.0, 0.18, 0.05, chrome, 0, 0.7, -2.3, car, 0.02); }
const carKeys = new THREE.Group(); { const r = mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 14), M('#d8d8e0', { metalness: 0.9, roughness: 0.2 })); carKeys.add(r);
  for (const [dx, a] of [[0.03, 0.4], [-0.02, -0.5]]) { const k = bx(0.018, 0.07, 0.005, M('#d8c070', { metalness: 0.9, roughness: 0.25 }), dx, -0.05, 0, carKeys); k.rotation.z = a; }
  bx(0.05, 0.035, 0.012, "#e83a3a", 0, 0.04, 0, carKeys); }
carKeys.position.set(4.85, 1.225, 1.25); carKeys.rotation.x = -Math.PI / 2; st.add(carKeys);
rb(0.6, 0.12, 0.6, '#3a3a42', -0.45, 1.14, 0.05, car, 0.05); rb(0.6, 0.6, 0.12, '#3a3a42', -0.45, 1.45, 0.4, car, 0.05); { const sw = mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 20), M('#25272c')); sw.position.set(-0.45, 1.45, -0.55); sw.rotation.x = -0.4; car.add(sw); }   // driver's seat + wheel
{ // the world beyond the street: houses across the road, a parked car, street trees, low-poly hills + a tree line on the horizon, faceted sunset clouds, a richer road
  const F = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
  const across = [[-19, '#e8d4a8', '#7a4a3a'], [-10.5, '#a8c4d8', '#4c5060'], [-2, '#f0ece2', '#8a4a3a'], [6.5, '#d8a87a', '#4c5060'], [15, '#b8cca0', '#6a4a3a'], [23.5, '#e8c8c0', '#4c5060']];
  for (const [x, wall, roofC] of across) { const z = 23; rb(6.2, 3.0, 4.5, F(wall), x, 1.5, z, st, 0.03);
    for (const sd of [-1, 1]) { const r = rb(6.7, 0.12, 2.9, F(roofC), x, 3.75, z + sd * 1.15, st, 0.02); r.rotation.x = sd * 0.62; }
    rb(1.0, 2.1, 0.08, F(['#3a5a8a', '#8a3030', '#3a6a4a'][Math.abs(Math.round(x)) % 3]), x, 1.05, z - 2.27, st, 0.02);
    for (const dx of [-1.9, 1.9]) { rb(1.05, 1.0, 0.08, F('#f6f4ee'), x + dx, 1.8, z - 2.28, st, 0.02); rb(0.9, 0.86, 0.05, F('#8ab4d8', { roughness: 0.2, emissive: '#3a3020', emissiveIntensity: 0.4 }), x + dx, 1.8, z - 2.24, st, 0.01); }
    plane(5.6, 4.5, F('#8aa648'), x, z - 4.6, 0.012); plane(1.2, 4.5, F('#d8d0c2'), x, z - 4.6, 0.016); }
  plane(140, 2.0, F('#d8d0c2'), 0, 18.3, 0.015); for (const z of [17.2, 19.4]) rb(140, 0.16, 0.22, F('#c8c4bc'), 0, 0.06, z, st, 0.03);
  { const pc = new THREE.Group(); pc.position.set(10.8, 0, 16.0); pc.rotation.y = Math.PI / 2; st.add(pc); const pm = F('#b83a32', { roughness: 0.35 });
    rb(1.8, 0.7, 4.2, pm, 0, 0.7, 0, pc, 0.15); rb(1.65, 0.55, 2.2, pm, 0, 1.3, -0.1, pc, 0.14); rb(1.68, 0.42, 2.0, F('#2a3440', { roughness: 0.1 }), 0, 1.32, -0.1, pc, 0.1);
    for (const [wx, wz] of [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10), F('#1c1e24')); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.34, wz); pc.add(w); } }
  // road: darker patches, white edge lines, two manholes, a few leaves
  for (let i = 0; i < 26; i++) { const p = plane(1.5 + mr() * 3, 0.8 + mr() * 1.6, F(mr() > 0.5 ? '#525460' : '#62646c'), -30 + mr() * 60, 11 + mr() * 5, 0.006); p.rotation.z = mr() * 0.4; }
  for (const z of [10.6, 16.6]) plane(140, 0.1, F('#e8e6e0'), 0, z, 0.009);
  for (const x of [-4, 8]) { const mh = mesh(new THREE.CircleGeometry(0.35, 10), F('#3a3c42'), false, true); mh.rotation.x = -Math.PI / 2; mh.position.set(x, 0.01, 13.0); st.add(mh); }
  const crowns = ['#e07a2a', '#d4562a', '#f0a63a', '#c8402a', '#e8c050'].map(c => F(c)), ico = new THREE.IcosahedronGeometry(1, 0);
  const tr = (x, z, s) => { const t = mesh(new THREE.CylinderGeometry(0.1 * s, 0.15 * s, 2 * s, 6), F('#6e4e34')); t.position.set(x, s, z); st.add(t); for (let k = 0; k < 5; k++) { const c = mesh(ico, crowns[(k + Math.abs(Math.round(x))) % 5]); c.scale.setScalar((0.8 + 0.3 * Math.sin(k * 2)) * s); c.position.set(x + Math.cos(k * 2.5) * 0.6 * s, (2.4 + 0.4 * Math.sin(k)) * s, z + Math.sin(k * 2.5) * 0.5 * s); st.add(c); } };
  for (const x of [-23, -14.5, -6, 2.5, 11, 19.5, 28]) tr(x, 18.9 + (x % 2), 1.1);
  // horizon: faceted hills and a band of autumn tree tops, all around
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, r = 78 + 10 * hash(i), h = mesh(new THREE.IcosahedronGeometry(1, 1), F(['#a8925a', '#b89a62', '#9a8a58', '#c4a46a'][i % 4], { fog: true }));
    h.scale.set(16 + 10 * hash(i * 2), 5 + 6 * hash(i * 3), 12); h.position.set(Math.cos(a) * r, -1, Math.sin(a) * r); h.lookAt(0, -1, 0); st.add(h); }
  for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283 + hash(i) * 0.05, r = 55 + 8 * hash(i * 1.3), c = mesh(ico, crowns[i % 5]); c.scale.setScalar(2.2 + 1.5 * hash(i * 1.7)); c.position.set(Math.cos(a) * r, 2.5 + 1.5 * hash(i * 2.1), Math.sin(a) * r); st.add(c); }
  // clouds: clusters of faceted puffs lit by the low sun
  const cm = new THREE.MeshStandardMaterial({ color: '#ffe8da', emissive: '#f8c0a0', emissiveIntensity: 0.3, roughness: 1, flatShading: true, fog: false });
  const cg = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + 0.3 * hash(i), r = 90 + 25 * hash(i * 4), g = new THREE.Group(); g.position.set(Math.cos(a) * r, 34 + 14 * hash(i * 5), Math.sin(a) * r); g.lookAt(0, g.position.y, 0); st.add(g);
    for (let k = 0; k < 9; k++) { const p = mesh(cg, cm, false, false); const sc = 2.2 + 1.6 * hash(i * 7 + k); p.scale.set(sc * 1.3, sc * 0.8, sc); p.position.set((k - 4) * 2.2, 1.2 * Math.sin(k * 1.7) + (k % 3 === 1 ? 1.5 : 0), (hash(k * 5 + i) - 0.5) * 2); g.add(p); } } }
// style pass over everything built so far (the set + the car): faceted shading for low-poly, fully matte for clay
st.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) { if (LOW) o.material.flatShading = true; if (CLAY) { o.material.roughness = Math.max(o.material.roughness, 0.92); o.material.metalness = 0; } o.material.needsUpdate = true; } });
// ---- the cast: you (the approved low-poly human) + two neighbors ----
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 }); st.add(hero.outer);
const nb1 = makeBlock({ head: 'human', body: 'human', skin: '#d8a47e', hair: '#8a8a8a', top: '#c8503a', jeans: false, bottom: '#6a6458', shoe: '#5a3a2a', hairStyle: 'short', headS: 0.88 }); st.add(nb1.outer);
const nb2 = makeBlock({ head: 'human', body: 'human', skin: '#f0c8a4', hair: '#6a3a1e', top: '#5aa070', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'bangs', headS: 0.85, h: 0.95 }); st.add(nb2.outer);
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.elbows.forEach(e => e.rotation.set(-0.15, 0, 0)); }
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, 0.95 + y, z); P.outer.rotation.y = ry; }
// walk P from A to B (x, z) between t0 and t1; facing the direction of travel
function walk(P, A, B, t0, t1, t, y0 = 0, y1 = 0) { const k = clamp((t - t0) / (t1 - t0), 0, 1), x = lerp(A[0], B[0], k), z = lerp(A[1], B[1], k);
  place(P, x, z, Math.atan2(B[0] - A[0], B[1] - A[1]), lerp(y0, y1, k)); if (k > 0 && k < 1) poseWalk(P, (t - t0) * 9, 1); }
// ---- grocery bags: a pivot at the handle top, the bag hangs below; a mix of white plastic and brown paper, things sticking out ----
const BAGS = Array.from({ length: 12 }, (_, i) => { const g = new THREE.Group(), paper = i % 3 === 1, body = new THREE.Group(); g.add(body); body.position.y = -0.27;
  const bm = paper ? M('#b88a5a', { roughness: 1 }) : M(i % 3 ? '#f4f4f0' : '#e8eef4', { roughness: 0.7 });
  const b = mesh(new RoundedBoxGeometry(0.3, 0.34, 0.17, 2, 0.05), bm); body.add(b);
  for (const s of [-1, 1]) { const hnd = mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 12, Math.PI), bm); hnd.position.set(s * 0.06, 0.17, 0); body.add(hnd); }
  const stuff = [['#f0c060', 0.04, 0.22, 0.04], ['#4aa04a', 0.07, 0.12, 0.07], ['#e8463a', 0.08, 0.08, 0.08], ['#f4f4f8', 0.1, 0.16, 0.06], ['#3a6ad8', 0.12, 0.1, 0.05]];
  for (let k = 0; k < 2; k++) { const [c, w, h, d] = stuff[(i * 2 + k) % stuff.length]; const s = bx(w, h, d, c, -0.06 + 0.12 * k, 0.17 + h * 0.3, 0, body); s.rotation.z = 0.2 * (k ? 1 : -1); }
  g.userData.ph = hash(i * 3.7) * 6; st.add(g); return g; });
const EGG_BAG = 4;   // this one carries the eggs
// hang a bag from a world point with a pendulum swing (amp in radians)
function hang(b, p, t, amp = 0.08, rate = 3) { b.visible = true; b.position.copy(p); b.rotation.set(amp * Math.sin(t * rate + b.userData.ph), 0, amp * 0.7 * Math.cos(t * rate * 0.9 + b.userData.ph)); }
// the eggs: a carton + 6 eggs that fly out and splat
const eggs = Array.from({ length: 6 }, () => { const e = mesh(new THREE.SphereGeometry(0.05, 10, 8), M('#f8f0e0', { roughness: 0.5 })); e.scale.y = 1.25; st.add(e); return e; });
const splats = Array.from({ length: 6 }, () => { const s = new THREE.Group(); const w = mesh(new THREE.CircleGeometry(0.14, 12), M('#fafaf0', { roughness: 0.4 }), false, true); w.rotation.x = -Math.PI / 2; s.add(w);
  const y = mesh(new THREE.SphereGeometry(0.045, 10, 6), M('#f8b820', { roughness: 0.3, emissive: '#5a3a00' })); y.scale.y = 0.4; y.position.y = 0.01; s.add(y); st.add(s); return s; });
const eggDrop = mesh(new THREE.ConeGeometry(0.02, 0.06, 6), M('#f8c040')); st.add(eggDrop);
// =================== THE RIG (local: origin on the ground, front = +z). It grows stage by stage: wheels → legs → suspension → seat + motor → a kitchen ===================
// our own palette (not the reference channel's yellow tubes + blue panels): matte black tubes, orange joints, light wood deck, mint seat + motor, chrome springs
const BLK = M('#2b2d31', { roughness: 0.55, metalness: 0.35 }), ORG = M('#ff7a2a', { roughness: 0.45 }), MINT = M('#7fd1b9', { roughness: 0.55 }), STEEL = M('#c8ccd2', { roughness: 0.3, metalness: 0.6 }), DARK = M('#25272c', { roughness: 0.6 });
const WOOD = new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(256, 128, (g, w, h) => { for (let y = 0; y < h; y += 21) { g.fillStyle = pick(['#d8b48a', '#cfa97e', '#dcba92']); g.fillRect(0, y, w, 20); g.fillStyle = 'rgba(90,60,30,0.35)'; g.fillRect(0, y + 20, w, 1); } }) });
const tube = (a, b, r, mat, par) => { const A = V3(...a), B = V3(...b), d = B.clone().sub(A), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); par.add(m); return m; };
const rig = new THREE.Group(); st.add(rig);
const body = new THREE.Group(); rig.add(body);   // everything above the running gear; its y = deck height
const deck = bx(1.4, 0.1, 1.0, WOOD, 0, 0, 0, body);
const deckX = bx(2.3, 0.1, 1.5, WOOD, 0, -0.005, 0, body);   // the bigger deck once the kitchen arrives
const frame = new THREE.Group(); body.add(frame);
for (const x of [-0.65, 0.65]) for (const z of [-0.45, 0.45]) tube([x, 0.05, z], [x, 2.25, z], 0.03, BLK, frame);
for (const z of [-0.45, 0.45]) tube([-0.68, 2.25, z], [0.68, 2.25, z], 0.03, BLK, frame);
for (const x of [-0.65, 0.65]) tube([x, 2.25, -0.48], [x, 2.25, 0.48], 0.03, BLK, frame);
for (const x of [-0.65, 0.65]) for (const z of [-0.45, 0.45]) { const j = mesh(new THREE.SphereGeometry(0.05, 10, 8), ORG); j.position.set(x, 2.25, z); frame.add(j); }
const RIG_HOOKS = []; for (const x of [-0.65, 0.65]) for (let k = 0; k < 6; k++) RIG_HOOKS.push(V3(x, 2.23, -0.4 + 0.16 * k));   // bags hang along the SIDES: the front stays clear for your face
// running gear: wheels | legs (+ springs)
const wheels = new THREE.Group(); rig.add(wheels);
const WH = [[-0.62, -0.42], [0.62, -0.42], [-0.62, 0.42], [0.62, 0.42]].map(([x, z]) => { const w = new THREE.Group(); w.position.set(x, 0.2, z); wheels.add(w);
  const t = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), DARK); t.rotation.z = Math.PI / 2; w.add(t); const hub = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), ORG); hub.rotation.z = Math.PI / 2; w.add(hub); return w; });
const legs = new THREE.Group(); rig.add(legs);
let EXTRA_LEGS = false;   // the 2 middle legs ("for the turkey")
const LEGS = [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4], [-0.64, 0], [0.64, 0]].map(([x, z], i) => { const hip = new THREE.Group(); hip.position.set(x, 0, z); legs.add(hip);
  const spring = new THREE.Group(); hip.add(spring); for (let k = 0; k < 5; k++) { const r = mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 14), STEEL); r.rotation.x = Math.PI / 2; r.position.y = -0.03 - k * 0.035; spring.add(r); }
  const thigh = new THREE.Group(); thigh.position.y = -0.2; hip.add(thigh); tube([0, 0, 0], [0, -0.42, 0], 0.035, BLK, thigh); const kj = mesh(new THREE.SphereGeometry(0.055, 10, 8), ORG); kj.position.y = -0.42; thigh.add(kj);
  const shin = new THREE.Group(); shin.position.y = -0.42; thigh.add(shin); tube([0, 0, 0], [0, -0.42, 0], 0.03, BLK, shin); bx(0.14, 0.04, 0.2, DARK, 0, -0.44, 0.02, shin);
  return { hip, thigh, shin, spring, ph: i === 0 || i === 3 ? 0 : i === 4 ? Math.PI / 2 : i === 5 ? -Math.PI / 2 : Math.PI, extra: i >= 4 }; });
// seat + steering bar, the motor (+ exhaust), the kitchen
const seat = new THREE.Group(); body.add(seat); seat.position.set(0, 0.05, -0.2); { bx(0.5, 0.1, 0.45, MINT, 0, 0.42, 0, seat); bx(0.5, 0.55, 0.08, MINT, 0, 0.72, -0.22, seat); tube([0, 0, 0], [0, 0.37, 0], 0.04, BLK, seat);
  tube([0, 0.05, 0.35], [0, 0.75, 0.42], 0.025, BLK, seat); tube([-0.2, 0.75, 0.42], [0.2, 0.75, 0.42], 0.025, DARK, seat); }
const motor = new THREE.Group(); body.add(motor); motor.position.set(0, 0.05, -0.52); { bx(0.5, 0.36, 0.3, MINT, 0, 0.18, 0, motor); bx(0.4, 0.06, 0.24, DARK, 0, 0.39, 0, motor); tube([0.18, 0.3, -0.12], [0.18, 0.75, -0.18], 0.03, STEEL, motor); }
const puffs = makeSmoke(st, 60);
const KIT = {}; { const k = (name, f) => { const g = new THREE.Group(); body.add(g); f(g); KIT[name] = g; };
  k('freezer', g => { g.position.set(-0.75, 0.05, 0.38); bx(0.62, 0.55, 0.5, '#f4f6f8', 0, 0.28, 0, g); bx(0.64, 0.05, 0.52, '#dfe4ea', 0, 0.58, 0, g); bx(0.2, 0.03, 0.03, STEEL, 0, 0.5, 0.26, g); });
  k('fridge', g => { g.position.set(0.78, 0.05, 0.35); bx(0.6, 1.35, 0.55, STEEL, 0, 0.68, 0, g); bx(0.02, 1.25, 0.56, '#9aa0a8', 0, 0.68, 0, g); for (const s of [-1, 1]) bx(0.03, 0.4, 0.04, '#e0e4ea', s * 0.06, 0.85, 0.29, g); });
  k('pantry', g => { g.position.set(-0.8, 0.05, -0.42); for (let s = 0; s < 4; s++) bx(0.6, 0.03, 0.3, '#b88a5a', 0, 0.05 + s * 0.32, 0, g); for (const x of [-0.29, 0.29]) bx(0.03, 1.1, 0.3, '#a07a4a', x, 0.55, 0, g);
    for (let s = 0; s < 3; s++) for (let q = 0; q < 3; q++) bx(0.12, 0.18 + 0.05 * ((s + q) % 2), 0.12, pick(['#e8463a', '#f2c040', '#4a8ae8', '#5ac87a', '#f4f4f0']), -0.18 + q * 0.18, 0.16 + s * 0.32, 0, g); });
  k('counter', g => { g.position.set(0.8, 0.05, -0.42); bx(0.62, 0.8, 0.45, '#f4f0e6', 0, 0.4, 0, g); bx(0.66, 0.05, 0.48, '#5a5a62', 0, 0.82, 0, g);
    const bowl = mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#e8463a')); bowl.position.set(0, 0.95, 0); g.add(bowl); for (let q = 0; q < 6; q++) { const c = mesh(new THREE.SphereGeometry(0.03, 6, 5), M('#f2c040')); c.position.set(-0.04 + 0.03 * (q % 3), 0.92, -0.02 + 0.03 * Math.floor(q / 3)); g.add(c); } });
  k('dish', g => { g.position.set(0.0, 0.05, 0.5); bx(0.56, 0.62, 0.42, STEEL, 0, 0.31, 0, g); bx(0.5, 0.08, 0.02, '#2a2c32', 0, 0.55, 0.215, g); for (let q = 0; q < 3; q++) bx(0.04, 0.02, 0.01, '#30e070', -0.12 + 0.06 * q, 0.55, 0.23, g, { emissive: '#1a8a3a' }); });
  k('icecream', g => { g.position.set(-0.3, 0.05, 0.42); const c = mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.14, 14), M('#f4d8e8')); c.position.y = 0.07; g.add(c); const top = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14), M('#e85a8a')); top.position.y = 0.15; g.add(top); }); }
const meltPuddle = mesh(new THREE.CircleGeometry(1, 20), M('#f8d8e4', { roughness: 0.3 }), false, true); meltPuddle.rotation.x = -Math.PI / 2; st.add(meltPuddle);
const meltDrops = Array.from({ length: 4 }, () => { const d = mesh(new THREE.SphereGeometry(0.02, 6, 5), M('#f8d0e0')); d.scale.y = 1.6; st.add(d); return d; });
// the back frame (stage 2): two posts up the back + a crossbar above the head with hooks at both ends
const backFrame = new THREE.Group(); hero.torso.add(backFrame);
{ for (const x of [-0.12, 0.12]) tube([x, 1.0, -0.2], [x, 2.25, -0.2], 0.025, BLK, backFrame); tube([-0.85, 2.25, -0.2], [0.85, 2.25, -0.2], 0.03, BLK, backFrame); bx(0.34, 0.06, 0.06, DARK, 0, 1.3, -0.17, backFrame); }
const BACK_HOOKS = []; for (const s of [-1, 1]) for (let k = 0; k < 6; k++) BACK_HOOKS.push(V3(s * (0.32 + 0.1 * k), 2.22, -0.2 + (k % 2 ? 0.06 : -0.06)));
// arm hooks (stage 1): a little hook at each wrist
const ARM_HOOKS = [0, 1].map(i => { const h = mesh(new THREE.TorusGeometry(0.04, 0.01, 5, 12, Math.PI * 1.3), STEEL); hero.elbows[i].add(h); h.position.set(0, -0.31, 0.02); h.rotation.y = Math.PI / 2; return h; });
// the rig's pose: deck height (wheels 0.45 / legs 0.85), gait phase; legs step with ph
function rigGear(kind, t, ph, bob = 0.05) { wheels.visible = kind === 'wheels'; legs.visible = kind !== 'wheels';
  if (kind === 'wheels') { body.position.y = 0.45; WH.forEach(w => w.rotation.x = ph); return; }
  const spr = kind === 'spring'; body.position.y = 0.95 + (spr ? 0.04 : 0) + (spr ? 0.006 : bob) * Math.abs(Math.sin(ph));
  legs.position.y = body.position.y;
  LEGS.forEach(L => { L.hip.visible = !L.extra || EXTRA_LEGS; const a = Math.sin(ph + L.ph); L.spring.visible = spr; L.thigh.position.y = spr ? -0.2 : -0.08; L.thigh.rotation.x = 0.35 * a; L.shin.rotation.x = -0.25 - 0.35 * Math.max(0, Math.cos(ph + L.ph)); }); }
// later upgrades: a roof, the milk (+ its seat belt), the turkey, a coffee machine, a TV
const roof = new THREE.Group(); body.add(roof); { const r = bx(1.75, 0.06, 1.3, M('#5a4a46', { flatShading: true, roughness: 0.8 }), 0, 2.33, 0, roof); r.rotation.x = 0.06; bx(1.8, 0.05, 0.06, ORG, 0, 2.3, 0.66, roof); }
const milk = new THREE.Group(); body.add(milk); { bx(0.1, 0.2, 0.1, '#f8f8f4', 0, 0.15, 0, milk); bx(0.102, 0.06, 0.102, '#3a6ad8', 0, 0.2, 0, milk); const tip = mesh(new THREE.ConeGeometry(0.075, 0.06, 4), M('#f8f8f4')); tip.rotation.y = Math.PI / 4; tip.position.y = 0.28; milk.add(tip); }
const strap = new THREE.Group(); milk.add(strap); bx(0.16, 0.035, 0.14, ORG, 0, 0.14, 0, strap); bx(0.03, 0.03, 0.5, ORG, 0, 0.13, -0.3, strap);   // the milk's seat belt
const turkey = new THREE.Group(); body.add(turkey); { const tm = M('#b8682a', { flatShading: true, roughness: 0.6 }); const b = mesh(new THREE.IcosahedronGeometry(0.14, 1), tm); b.scale.set(1.2, 0.75, 1); b.position.y = 0.12; turkey.add(b);
  for (const s_ of [-1, 1]) { const l = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.16, 6), tm); l.rotation.z = s_ * 1.0; l.position.set(s_ * 0.16, 0.14, 0.06); turkey.add(l); const bone = mesh(new THREE.SphereGeometry(0.025, 6, 5), M('#f8f0e0')); bone.position.set(s_ * 0.23, 0.19, 0.06); turkey.add(bone); }
  const plate = mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.025, 14), M('#f4f4f0')); plate.position.y = 0.012; turkey.add(plate); }
const coffee = new THREE.Group(); body.add(coffee); coffee.position.set(-0.75, 0.63, 0.38); { bx(0.2, 0.3, 0.22, '#2a2c30', 0, 0.15, 0, coffee); bx(0.14, 0.03, 0.12, STEEL, 0, 0.06, 0.05, coffee); bx(0.03, 0.03, 0.01, '#e8302a', 0.06, 0.25, 0.112, coffee, { emissive: '#a01010' }); const mug = mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.07, 10), M('#f4f4f0')); mug.position.set(0, 0.11, 0.05); coffee.add(mug); }
const tvT = canvasTex(256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#4a8ae8'); gr.addColorStop(1, '#8ad0f8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#3aa040'; g.fillRect(0, 110, w, 50); g.fillStyle = '#f8f8f0'; g.fillRect(118, 60, 8, 50); g.fillStyle = '#e83a3a'; g.beginPath(); g.arc(60, 120, 10, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.font = 'bold 22px Inter'; g.fillText('FOOTBALL', 70, 30); });
const tv = new THREE.Group(); body.add(tv); tv.position.set(0, 1.62, 0.5); { bx(0.62, 0.38, 0.04, '#1c1e22', 0, 0, 0, tv); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.32), new THREE.MeshBasicMaterial({ map: tvT, color: new THREE.Color(1.3, 1.3, 1.3) })); scr.position.z = -0.021; scr.rotation.y = Math.PI; tv.add(scr); tube([0, 0.19, 0], [0, 0.72, 0], 0.015, BLK, tv); }
// =================== THE STORY, driven by the narration cues (g_times.js) + FAST CUTS (1.5–2.5 s) ===================
const wordT = (w, after) => (WORDS.find(([t, x]) => t >= after - 0.01 && x.toLowerCase().replace(/[^a-z]/g, '') === w) || [99])[0];
const T = { fix: CUE.letsfixthat, hooks: CUE.firsthookson, allin: CUE.nowitall, back: CUE.movethehooks, backsad: CUE.yourarmsare,
  wheels: CUE.putiton, better: CUE.muchbetter, steps: CUE.excepttheporch, legs: CUE.giveitlegs, climbs: CUE.nowitclimbs, eggs: CUE.unfortunatelys, susp: CUE.addsuspension,
  smooth: CUE.smooth, stare: CUE.theneighborsar, film: CUE.oneofthem, walking: CUE.butyourestill, seat: CUE.addaseat, fast: CUE.nowitsfast, toofast: CUE.toofast,
  milk: CUE.themilkgoes, belts: CUE.addseatbelts, formilk: CUE.forthemilk, leaves: CUE.thentheleaves, roof: CUE.addaroof, thanks: CUE.thanksgivingis, twolegs: CUE.addtwomore,
  melt: CUE.nowtheice, freezer: CUE.installafreeze, fridge: CUE.andafridge, pantry: CUE.apantry, counter: CUE.acounterfor, dish: CUE.adishwasher, obv: CUE.obviously,
  coffee: CUE.andacoffee, tv: CUE.andatv, congr: CUE.congratulation, built: CUE.youvebuilta, onetrip: CUE.onetrip, drive: CUE.youdriveit, two: CUE.lookslikeits };
T.knees = wordT('until', T.allin); T.motor = wordT('motor', T.seat); T.keys = wordT('and', T.drive + 0.5);
const groundY = z => z < -4.4 ? PORCH_Y : z < -4.08 ? 0.36 : z < -3.76 ? 0.18 : 0;
const knob = mesh(new THREE.SphereGeometry(0.045, 10, 8), M('#d8b050', { metalness: 0.8, roughness: 0.25 })); knob.position.set(0.42, PORCH_Y + 1.0, -5.9); st.add(knob);
const pop = (t, a) => { const k = clamp((t - a) / 0.3, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };   // ease-out pop-in
const handW = (P, i) => P.elbows[i].localToWorld(V3(0, -0.36, 0.02));
function sitOn(P, p, ry) { poseSit(P); P.outer.position.set(p.x, p.y + 0.95 - 0.87 * P.h, p.z); P.outer.rotation.set(0, ry, 0); }
const nbPhone = makePhone(); nb2.elbows[1].add(nbPhone); nb2.phone = nbPhone;
const FALLING = Array.from({ length: 30 }, (_, i) => { const l = mesh(new THREE.CircleGeometry(0.08, 3), new THREE.MeshStandardMaterial({ color: ['#e07a2a', '#d4562a', '#f0a63a', '#c8402a', '#e8c050'][i % 5], flatShading: true, side: THREE.DoubleSide }), false, false); st.add(l); return l; });
// the rig's path: [t, x, z, heading-at-rest]; while moving it faces where it goes; y follows the porch steps
const PARK = [-3.4, 1.4];   // open lawn: no tree over the camera
const PATH = {
  wheels: [[T.wheels, 1.4, 1.6, Math.PI], [T.steps - 0.15, 0, -2.95, Math.PI], [99, 0, -2.95, Math.PI]],
  legs: [[T.legs, 0, -2.95, Math.PI], [T.climbs, 0, -2.95, Math.PI], [T.eggs + 1.2, 0, -5.0, Math.PI], [99, 0, -5.0, Math.PI]],
  susp: [[T.susp, 0, -1.2, 0], [T.stare, 0, 2.2, 0], [T.seat, -2.6, 3.4, 0], [99, -2.6, 3.4, 0]],
  ride: [[T.seat, -2.6, 3.4, 0], [T.motor + 0.2, -2.6, 3.4, 0], [T.fast, -3.4, 2.8, 0], [99, -3.4, 2.8, 0]],
  fast: [[T.fast, -3.4, 2.8, 0], [T.toofast, -1.3, 4.6, 0], [T.milk, -1.7, 2.0, 0], [T.belts, -4.4, 3.0, 0], [T.formilk, PARK[0], PARK[1], 0], [99, PARK[0], PARK[1], 0]],
  park: [[0, PARK[0], PARK[1], 0], [99, PARK[0], PARK[1], 0]],
  home: [[T.onetrip, PARK[0], PARK[1], 0], [T.onetrip + 1.4, -2.0, 0.4, 0], [T.keys - 0.3, -2.4, -3.3, 0], [99, -2.4, -3.3, 0]] };
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; };
for (const P of Object.values(PATH)) { let h = P[0][3]; for (let i = 0; i < P.length - 1; i++) { const dx = P[i + 1][1] - P[i][1], dz = P[i + 1][2] - P[i][2]; P[i].hd = Math.hypot(dx, dz) > 0.01 ? (h = Math.atan2(dx, dz)) : h; P[i].h0 = i ? P[i - 1].hd : P[0][3]; } P[P.length - 1].hd = h; }
function pathAt(P, t) { let i = 0; while (i < P.length - 2 && t >= P[i + 1][0]) i++; const [a, x0, z0] = P[i], [b, x1, z1] = P[i + 1], k = ease(clamp((t - a) / (b - a), 0, 1));
  return { x: lerp(x0, x1, k), z: lerp(z0, z1, k), h: angLerp(P[i].h0, P[i].hd, clamp((t - a) / 0.35, 0, 1)), moving: k > 0 && k < 1 }; }
let STAGE = '';
function hideAll() { BAGS.forEach(b => b.visible = false); eggs.forEach(e => e.visible = false); splats.forEach(s => s.visible = false); eggDrop.visible = false; rig.visible = false; backFrame.visible = false;
  ARM_HOOKS.forEach(h => h.visible = false); Object.values(KIT).forEach(k => k.visible = false); meltPuddle.visible = false; meltDrops.forEach(d => d.visible = false); seat.visible = motor.visible = false; deckX.visible = false;
  roof.visible = milk.visible = strap.visible = turkey.visible = coffee.visible = tv.visible = false; FALLING.forEach(l => l.visible = false); nbPhone.visible = false; EXTRA_LEGS = false; }
function trunkBags(n, t) { for (let i = 0; i < n; i++) { const b = BAGS[11 - i]; hang(b, car.localToWorld(V3(-0.6 + 0.4 * (i % 4), 1.29, 1.25 + 0.3 * Math.floor(i / 4))), t, 0.0); b.rotation.y = 0.3 * hash(i); } }
function rigBags(t, amp) { rig.updateMatrixWorld(true); BAGS.forEach((b, i) => hang(b, body.localToWorld(RIG_HOOKS[i].clone()), t, amp, 2.6)); }
function ridePose(P, q) { rig.updateMatrixWorld(true); sitOn(P, body.localToWorld(V3(0, 0.52, -0.2)), q.h); P.arms.forEach(a => a.rotation.set(-1.0, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.5); }
function exhaust(t, rate = 2.2) { const ex = motor.localToWorld(V3(0.18, 0.78, -0.18)); for (let k = 0; k < 8; k++) { const u = ((t * rate + k / 8) % 1); puffs.add(ex.clone().add(V3(0.1 * Math.sin(k * 3), u * 0.6, -u * 0.3)), 0.06 + u * 0.15, 0.45 * (1 - u)); } }
// what is on the rig at time t (each upgrade stays once added)
function rigKit(t) { if (milk.parent !== body) { body.add(milk); milk.rotation.set(0, 0, 0); } seat.visible = t >= T.seat; seat.scale.setScalar(pop(t, T.seat)); motor.visible = t >= T.motor; motor.scale.setScalar(pop(t, T.motor));
  milk.visible = t >= T.seat && !(t >= T.milk && t < T.belts); milk.position.set(-0.35, 0.05, 0.42); strap.visible = t >= T.belts; strap.scale.setScalar(pop(t, T.belts));
  roof.visible = t >= T.roof; roof.scale.setScalar(pop(t, T.roof)); EXTRA_LEGS = t >= T.twolegs; turkey.visible = t >= T.twolegs; turkey.scale.setScalar(pop(t, T.twolegs + 0.1));
  turkey.position.set(0.8, t >= T.counter ? 0.87 : 0.05, -0.42);
  deckX.visible = t >= T.freezer; const dk = ease(clamp((t - T.freezer) / 0.4, 0, 1)); deckX.scale.set(lerp(0.6, 1, dk), 1, lerp(0.67, 1, dk));
  for (const [k, at] of [['freezer', T.freezer], ['fridge', T.fridge], ['pantry', T.pantry], ['counter', T.counter], ['dish', T.dish]]) { KIT[k].visible = t >= at; KIT[k].scale.setScalar(pop(t, at)); }
  coffee.visible = t >= T.coffee; coffee.scale.setScalar(pop(t, T.coffee)); tv.visible = t >= T.tv; tv.scale.setScalar(pop(t, T.tv)); }
function update(t) {
  hideAll(); [hero, nb1, nb2].forEach(p => poseReset(p, t)); puffs.begin(); smokeMat.uniforms.uTint.value.set('#d8d8d8');
  place(nb1, -11.6, 0.6, 1.2); place(nb2, -12.4, 1.4, 1.3); nb1.face('neutral', t); nb2.face('happy', t + 1);
  if (t >= T.stare) { const look = (P, k) => { P.outer.rotation.y = Math.atan2(rig.position.x - P.outer.position.x, rig.position.z - P.outer.position.z); P.face(k, t); }; look(nb1, 'surprised'); look(nb2, t >= T.film ? 'smirk' : 'dumb'); }
  if (t >= T.film) { nb2.phone = nbPhone; holdPhone(nb2, t, 'up'); }
  const P = hero; let s;
  if (t < T.fix) {   // five trips: two bags at a time, the trunk still full
    s = 'trips'; trunkBags(10, t); const mid = 1.6;
    if (t < mid) walk(P, [3.2, 1.6], [0.6, -1.4], -1.0, mid, t); else walk(P, [0.5, -1.0], [3.6, 2.4], mid, T.fix + 0.6, t);
    P.face(t < mid ? 'neutral' : 'sleepy', t); if (t < mid) { P.outer.updateMatrixWorld(true); hang(BAGS[0], handW(P, 0), t, 0.15, 6); hang(BAGS[1], handW(P, 1), t, 0.15, 6); P.elbows.forEach(e => e.rotation.x = -0.1); }
  } else if (t < T.hooks) { s = 'fix'; trunkBags(12, t); place(P, 4.7, 3.6, 0.4); P.face('smirk', t); }
  else if (t < T.knees) {   // hooks on the arms, every bag at once
    s = 'hooks'; ARM_HOOKS.forEach(h => h.visible = true);
    if (t < T.allin) place(P, 4.7, 3.6, 0.4); else walk(P, [4.6, 3.4], [1.0, 0.0], T.allin, T.knees + 0.5, t);
    P.arms.forEach((a, i) => a.rotation.set(-0.25 + a.rotation.x * 0.3, 0, i ? 0.08 : -0.08)); P.elbows.forEach(e => e.rotation.x = -1.35); P.face('proud', t);
    P.outer.updateMatrixWorld(true); BAGS.forEach((b, i) => { const side = i % 2, k = Math.floor(i / 2), p = handW(P, side).add(V3(0, -0.02 * k, 0)); hang(b, p, t, 0.1 + 0.02 * k, 4); b.position.x += (k - 2.5) * 0.035; b.position.z += (k % 2 ? 0.05 : -0.05); });
  } else if (t < T.back) {   // the bags hang at your knees: a waddle, the bags slam
    s = 'knees'; ARM_HOOKS.forEach(h => h.visible = true); const ph = (t - T.knees) * 8;
    place(P, lerp(1.0, 0.4, (t - T.knees) / 2), lerp(0.0, -1.0, (t - T.knees) / 2), Math.PI * 0.82); poseWalk(P, ph, 0.45); P.arms.forEach(a => a.rotation.set(a.rotation.x * 0.2, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.1);
    P.root.rotation.z = 0.08 * Math.sin(ph); P.face(Math.sin(ph) > 0 ? 'worried' : 'surprised', t);
    P.outer.updateMatrixWorld(true); BAGS.forEach((b, i) => { const side = i % 2, k = Math.floor(i / 2); hang(b, handW(P, side), t, 0.35, 8); b.position.x += (k - 2.5) * 0.035; b.position.z += (k % 2 ? 0.05 : -0.05); });
  } else if (t < T.wheels) {   // a frame on your back
    s = 'back'; backFrame.visible = true; const sad = t >= T.backsad;
    walk(P, [0.2, 3.0], [0.0, -0.4], T.back, T.wheels, t); if (sad) { P.torso.rotation.x = 0.3; P.root.rotation.x = 0.08; } P.face(sad ? 'sad' : 'happy', t);
    P.outer.updateMatrixWorld(true); BAGS.forEach((b, i) => hang(b, P.torso.localToWorld(BACK_HOOKS[i].clone()), t, 0.12, 4));
  } else if (t < T.legs) {   // on wheels: push it to the porch… and the steps stop it
    s = 'wheels'; rig.visible = true; const q = pathAt(PATH.wheels, t), bump = t > T.steps - 0.15 ? 0.06 * Math.exp(-(t - T.steps + 0.15) * 6) * Math.sin((t - T.steps) * 30) : 0;
    rig.position.set(q.x, 0, q.z + bump); rig.rotation.y = q.h; rigGear('wheels', t, -(t - T.wheels) * 4 * (q.moving ? 1 : 0));
    const back = V3(Math.sin(q.h), 0, Math.cos(q.h)).multiplyScalar(-1.0); place(P, q.x + back.x, q.z + back.z, q.h); if (q.moving) poseWalk(P, t * 9, 1);
    P.arms.forEach(a => a.rotation.set(-1.2, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.3); P.face(t >= T.steps ? 'surprised' : t >= T.better ? 'happy' : 'proud', t); rigBags(t, q.moving ? 0.12 : 0.05 + (t > T.steps - 0.2 && t < T.steps + 0.8 ? 0.2 : 0));
  } else if (t < T.susp) {   // legs: it climbs the steps; the eggs jump out
    s = 'legs'; rig.visible = true; const q = pathAt(PATH.legs, t), ph = (t - T.legs) * 7;
    rig.position.set(q.x, groundY(q.z + 0.3) * 0.5 + groundY(q.z - 0.3) * 0.5, q.z); rig.rotation.y = q.h; rigGear('legs', t, q.moving ? ph : 0, 0.14);
    walk(P, [0.25, -1.4], [0.25, -2.3], T.climbs, T.eggs + 1.2, t); P.outer.rotation.y = Math.PI; P.face(t >= T.eggs ? 'surprised' : 'proud', t); rigBags(t, q.moving ? 0.3 : 0.1);
    if (t > T.eggs) { const src = BAGS[EGG_BAG].position.clone().add(V3(0, -0.2, 0)); eggs.forEach((e, i) => { const u = clamp((t - T.eggs - i * 0.08) / 0.7, 0, 1), dx = (hash(i * 3.1) - 0.5) * 1.6, dz = 1.2 + hash(i * 5.3) * 1.4;
        const p = src.clone().add(V3(dx * u, 0.9 * u - 1.6 * u * u, dz * u)); p.y = Math.max(p.y, groundY(p.z) + 0.04); e.visible = u > 0 && u < 1; e.position.copy(p); e.rotation.set(t * 9 + i, 0, t * 7);
        const sp = splats[i]; sp.visible = u >= 1; if (sp.visible) { const sz = src.z + dz; sp.position.set(src.x + dx, groundY(sz) + 0.012, sz); sp.scale.setScalar(0.8 + 0.5 * hash(i)); } }); }
  } else if (t < T.seat) {   // suspension: smooth; the neighbors stare (one films); you still walk beside it
    s = 'susp'; rig.visible = true; const q = pathAt(PATH.susp, t);
    rig.position.set(q.x, 0, q.z); rig.rotation.y = q.h; rigGear('spring', t, q.moving ? (t - T.susp) * 7 : 0); rigBags(t, 0.04);
    const side = V3(Math.cos(q.h), 0, -Math.sin(q.h)).multiplyScalar(-1.05); place(P, q.x + side.x, q.z + side.z, q.h); if (q.moving) poseWalk(P, t * 9, 1);
    P.face(t >= T.walking ? 'sleepy' : t >= T.stare ? 'smirk' : 'happy', t);
  } else if (t < T.leaves) {   // a seat + a motor; then FAST — the milk flies, gets a seat belt
    s = 'ride'; rig.visible = true; rigKit(t); const q = pathAt(t >= T.fast ? PATH.fast : PATH.ride, t), spd = t >= T.fast ? 14 : 9;
    rig.position.set(q.x, 0, q.z); rig.rotation.y = q.h; rig.rotation.z = t >= T.toofast && q.moving ? 0.06 * Math.sin(t * 13) : 0; rigGear('spring', t, q.moving ? (t - T.seat) * spd : 0); rigBags(t, t >= T.fast && q.moving ? 0.35 : 0.05);
    ridePose(P, q); P.face(t >= T.belts ? 'proud' : t >= T.toofast ? 'surprised' : t >= T.motor ? 'laugh' : 'happy', t); if (t >= T.motor) exhaust(t, t >= T.fast ? 4 : 2.2);
    if (t >= T.milk && t < T.belts) { milk.visible = true; const u = clamp((t - T.milk) / 0.8, 0, 1); rig.updateMatrixWorld(true); const p0 = body.localToWorld(V3(-0.35, 0.05, 0.42)); milk.removeFromParent(); st.add(milk);
      milk.position.set(p0.x - 1.6 * u, Math.max(0, p0.y + 1.4 * u - 2.6 * u * u), p0.z + 0.8 * u); milk.rotation.set(t * 8, 0, t * 6); } else if (milk.parent !== body) { body.add(milk); milk.rotation.set(0, 0, 0); }
  } else if (t < T.onetrip) {   // parked under the tree: leaves fall into the bags → a roof; Thanksgiving → two more legs; the kitchen; coffee + TV; congratulations
    s = t >= T.congr ? 'congr' : 'kitchen'; rig.visible = true; rigKit(t); const q = pathAt(PATH.park, t); rig.position.set(q.x, 0, q.z); rig.rotation.y = PATH.fast[PATH.fast.length - 1].hd; rigGear('spring', t, t >= T.twolegs && t < T.twolegs + 1.2 ? (t - T.twolegs) * 6 : 0); rigBags(t, 0.03);
    ridePose(P, { h: rig.rotation.y }); if (t >= T.motor) exhaust(t, 1.2);
    if (t < T.roof + 1.5) { rig.updateMatrixWorld(true); const top = body.localToWorld(V3(0, 2.36, 0)); FALLING.forEach((l, i) => { const u = ((t - T.leaves) * 0.45 + i / 30) % 1, landed = t >= T.roof && u > 0.75; l.visible = true;
        const y = landed ? top.y + 0.01 : lerp(top.y + 2.4, top.y - 0.4, u / 0.9); l.position.set(top.x + 1.3 * (hash(i) - 0.5), y, top.z + 1.0 * (hash(i * 3) - 0.5)); l.rotation.set(landed ? -Math.PI / 2 : t * 3 + i, i, t * 2); }); }
    KIT.icecream.visible = t >= T.melt && t < T.freezer + 0.3; if (KIT.icecream.visible) { const ic = KIT.icecream.localToWorld(V3(0, 0, 0)); meltPuddle.visible = true; meltPuddle.position.set(ic.x, 0.008, ic.z); meltPuddle.scale.setScalar(0.05 + 0.25 * smooth(T.melt, T.freezer, t));
      meltDrops.forEach((d, i) => { const u = ((t * 1.6 + i / 4) % 1); d.visible = true; d.position.set(ic.x + 0.08 * Math.sin(i * 2), lerp(ic.y + 0.05, 0.02, u), ic.z + 0.08 * Math.cos(i * 2)); }); }
    P.face(t >= T.congr ? 'proud' : t >= T.tv ? 'laugh' : t >= T.obv ? 'smirk' : t >= T.freezer ? 'proud' : t >= T.melt ? 'worried' : t >= T.thanks ? 'happy' : t >= T.leaves ? 'surprised' : 'proud', t);
  } else {   // one trip: ride up to the door… locked. The keys are in the car.
    s = 'home'; rig.visible = true; rigKit(t); KIT.icecream.visible = false;
    const q = pathAt(PATH.home, t); rig.position.set(q.x, groundY(q.z + 0.4) * 0.5 + groundY(q.z - 0.4) * 0.5, q.z); rig.rotation.y = q.h; rigGear('spring', t, q.moving ? (t - T.onetrip) * 8 : 0); rigBags(t, q.moving ? 0.08 : 0.03);
    rig.updateMatrixWorld(true); if (q.moving) exhaust(t, 3);
    if (t < T.keys) { ridePose(P, q); P.face('proud', t); }
    else if (t < T.two) { place(P, 0.15, -5.5, Math.PI, PORCH_Y); const jig = t < T.keys + 0.8;
      if (jig) { P.arms[1].rotation.set(-1.25, 0, 0.15); P.elbows[1].rotation.x = -0.25 + 0.08 * Math.sin(t * 40); P.face('neutral', t); }
      else { P.outer.rotation.y = 0.2; P.arms.forEach((a, i) => a.rotation.set(0.15, 0, i ? 0.25 : -0.25)); P.elbows.forEach((e, i) => e.rotation.x = -0.9 - 0.3 * Math.max(0, Math.sin(t * 14 + i * 2))); P.face('surprised', t); } }
    else { walk(P, [0.4, -5.2], [4.4, 3.2], T.two, T.two + 6.2, t, PORCH_Y, 0); P.outer.position.y = 0.95 + groundY(P.outer.position.z); P.face('sleepy', t); }
    splats.forEach(sp => { sp.visible = true; }); }
  STAGE = s; puffs.end(); }
// cameras: [start, framing(t)] — every shot in the one street scene; a new angle every 1.5–2.5 s
const H_ = p => headOf(p), rigC = (dy = 1.2) => rig.position.clone().add(V3(0, dy, 0));
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
const fwd = (P, side = 0, up = 0.1) => { const h = P.outer.rotation.y; return V3(Math.sin(h) + side * Math.cos(h), up, Math.cos(h) - side * Math.sin(h)); };   // in front of P (+ a bit to its left/right)
const SHOTS = [
  [0, t => fr(H_(hero), V3(-0.35, 0.15, -1), lerp(3.4, 3.0, t / 1.6), 0.6)],   // trip 2: two bags to the porch
  [1.6, t => fr(H_(hero), V3(0.25, 0.1, 1), lerp(3.0, 2.7, (t - 1.6) / 1.5), 0.6)],   // back to the car for trip 3
  [T.fix, t => fr(H_(hero), V3(-0.2, 0.05, 1), lerp(1.2, 1.05, (t - T.fix) / 1.0), 0.6)],
  [T.hooks, t => fr(H_(hero), V3(0.45, 0.12, 1), lerp(2.4, 2.7, (t - T.hooks) / 1.9), 0.55)],
  [T.allin, t => fr(H_(hero), V3(-0.55, 0.25, -1), 3.5, 0.6)],
  [T.knees, t => fr(hero.outer.position.clone().add(V3(0, -0.35, 0)), V3(0.6, 0.05, -1), 1.7, 0.5)],
  [T.back, t => fr(H_(hero), V3(0.75, 0.3, 0.7), lerp(3.2, 2.9, (t - T.back) / 2.3), 0.52)],
  [T.backsad, t => fr(H_(hero), V3(0.6, 0.15, -1), 3.0, 0.62)],
  [T.wheels, t => fr(rigC(1.1), V3(0.55, 0.35, -1), lerp(4.0, 3.7, (t - T.wheels) / 1.0), 0.55)],
  [T.better, t => fr(H_(hero), V3(-0.5, 0.1, -1), 2.2, 0.62)],
  [T.steps, t => fr(V3(0, 1.0, -3.6), V3(1, 0.2, 0.25), 4.2, 0.55)],
  [T.legs, t => fr(rigC(0.9), V3(1, 0.25, 0.35), lerp(3.6, 3.9, (t - T.legs) / 0.9), 0.52)],
  [T.climbs, t => fr(V3(0, 1.6, -4.0), V3(1, 0.25, 0.35), 6.5, 0.6)],
  [T.eggs, t => fr(V3(0.2, 1.1, -3.4), V3(0.9, 0.15, 0.7), 3.4, 0.5)],
  [T.susp, t => { rig.updateMatrixWorld(true); return fr(LEGS[3].hip.localToWorld(V3(0, -0.1, 0)), V3(0.7, 0.1, 1), 1.4, 0.5); }],
  [T.smooth, t => fr(rigC(1.0), V3(-0.5, 0.3, 1), 5.0, 0.55)],
  [T.stare, t => fr(H_(nb1).lerp(H_(nb2), 0.5), V3(1, 0.05, 0.15), 3.3, 0.6)],
  [T.film, t => fr(H_(nb2).add(V3(0.15, 0.1, 0)), V3(1, 0.1, -0.35), 1.6, 0.6)],   // she's filming
  [T.walking, t => fr(H_(hero), V3(-1, 0.1, 0.3), 2.6, 0.6)],
  [T.seat, t => fr(H_(hero), fwd(hero, 0.35, 0.25), 3.0, 0.6)],
  [T.fast, t => fr(rigC(1.3), V3(-0.4, 0.3, 1), 6.2, 0.55)],
  [T.toofast, t => fr(H_(hero), fwd(hero, 0.2), 2.2, 0.6)],
  [T.milk, t => fr(rigC(1.0).add(V3(-0.9, 0, 0)), V3(0.25, 0.3, -1), 6.2, 0.5)],
  [T.belts, t => { rig.updateMatrixWorld(true); return fr(body.localToWorld(V3(-0.35, 0.25, 0.42)), V3(0.3, 0.5, 1), 1.0, 0.5); }],
  [T.formilk, t => fr(H_(hero), fwd(hero, -0.3, 0.05), 1.5, 0.6)],
  [T.leaves, t => fr(rigC(2.0), fwd(hero, 0.6, 0.25), 4.2, 0.45)],
  [T.roof, t => fr(rigC(1.6), fwd(hero, -0.6, 0.6), 5.0, 0.5)],
  [T.thanks, t => fr(H_(hero), fwd(hero, 0.3), 2.2, 0.6)],
  [T.twolegs, t => fr(rigC(0.6), fwd(hero, 4, 0.8), 4.4, 0.5)],
  [T.melt, t => { rig.updateMatrixWorld(true); return fr(KIT.icecream.localToWorld(V3(0, 0.1, 0)), fwd(hero, 0.3, 0.6), 1.0, 0.5); }],
  [T.freezer, t => fr(rigC(1.0), fwd(hero, 0.4, 0.45), 4.6, 0.55)],
  [T.pantry, t => fr(rigC(1.0), fwd(hero, -0.75, 0.35), 4.4, 0.55)],
  [T.dish, t => { rig.updateMatrixWorld(true); return fr(KIT.dish.localToWorld(V3(0, 0.4, 0)), fwd(hero, 0.25, 0.3), 1.6, 0.5); }],
  [T.obv, t => fr(H_(hero), fwd(hero, -0.3, 0.05), 1.4, 0.6)],
  [T.coffee, t => { rig.updateMatrixWorld(true); return fr(coffee.localToWorld(V3(0, 0.15, 0)), fwd(hero, -0.3, 0.3), 1.1, 0.5); }],
  [T.tv, t => fr(H_(hero), fwd(hero, 0.75, 0.35), 2.0, 0.62)],   // front-side: you + the TV
  [T.congr, t => fr(rigC(1.2), fwd(hero, 0.8, 0.45), lerp(5.8, 7.2, (t - T.congr) / 1.3), 0.55)],
  [T.built, t => fr(rigC(1.0), fwd(hero, -0.9, 0.3), lerp(6.5, 6.0, (t - T.built) / 1.6), 0.55)],
  [T.onetrip, t => fr(rigC(1.4), V3(0.35, 0.4, 1), 5.4, 0.55)],
  [T.drive, t => fr(rigC(1.2), V3(0.8, 0.3, 0.7), 5.8, 0.55)],
  [T.keys, t => fr(H_(hero), V3(1, 0.1, 0.45), 2.4, 0.6)],
  [T.keys + 0.8, t => fr(H_(hero), V3(0.15, 0.05, 1), 1.35, 0.6)],
  [T.keys + 1.5, t => fr(carKeys.position, V3(0.5, 0.7, 0.3), 0.5, 0.5)],   // inside the car: the keys on the seat
  [T.two, t => fr(H_(hero), V3(0.4, 0.25, 1), lerp(3.6, 4.0, (t - T.two) / 3.3), 0.6)]];
// ambient occlusion (GTAO at half res) between the scene render and the tone-mapping composite: soft contact shading in every corner, like a modelled set
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const gtao = new GTAOPass(st, stCam, W / 2, H / 2); gtao.renderToScreen = false; gtao.blendIntensity = 1.0;
gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
function shoot(i, t, rt) { update(t); const F = SHOTS[i][1](t); applyF(stCam, F); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(stCam.fov * Math.PI / 360)); shootTo(RTS, st, stCam); gtao.render(renderer, rt, RTS); }
// captions: their style — bold white with a black outline, the phrase's words revealed as they're spoken
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['cap', 'end'].map(k => [k, $(k)]));
const CTA_T = T.two + 1.5;
function updateDOM(t) {
  let cp = CAPS.find(([a, b]) => t >= a && t < b), html = '';
  if (cp) { const ws = WORDS.filter(([wt]) => wt >= cp[0] - 0.01 && wt <= cp[1]); html = ws.map(([wt, w]) => `<span style="opacity:${t >= wt ? 1 : 0}">${w}</span>`).join(' '); }
  else if (t >= CTA_T) html = 'Would you build one? 👇';
  el.cap.innerHTML = html; el.cap.style.opacity = html ? 1 : 0; }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t); return true; }
  shoot(i, t, RTA); compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = CLAY ? 0.012 : 0; composite(0, 1.0, 1.0); updateDOM(t); return true; };   // a clean look: almost no paper grain / vignette
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, nb1, nb2]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
