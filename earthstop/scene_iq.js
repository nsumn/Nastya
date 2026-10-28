import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if your IQ jumped to 500?" (64 s, US): a dumb face bonks into a PULL door, IQ 100 -> 500 (flash + whoosh + ding), a smug smirk;
// the bell curve (1 in 10^156, nobody ever), the 3-second test (real tests stop ~160, highest listed 228), a library by lunch, the 20-watt brain bulb,
// small talk, winning an argument in one line — and the same PULL door at the end. Numbers: tools/iq_math.py.
// =================== timeline ===================
const POP = 3.0, CURVE = 6.0, TEST = 14.0, RUBIK = 22.0, ARGUE = 30.0, NOTIF = 38.0, CHESS = 41.6, RICH = 46.0, TALK = 51.0, DOOR = 57.0, CTA = 63.0, T_END = 66.0, LIB = 99, BULB = 99;   // SECOND 1 · MINUTE 1 · HOUR 1 · DAY 1 · WEEK 1 · MONTH 1 · YEAR 1 · EVERY DAY
const B1 = 4.0, B2 = 12.0, B3 = 20.0, B4 = 28.0, B5 = 36.0, B6 = 44.0, TW = 52.0, REP = 58.0;   // used by the shared family sets
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 500;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 }, uWhip: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook, uWhip;
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
  g.strokeStyle = 'rgba(110,60,40,0.75)'; g.lineWidth = U(0.014); g.beginPath(); g.moveTo(U(0.5), Vv(0.53)); g.lineTo(U(0.48), Vv(0.63)); g.lineTo(U(0.53), Vv(0.635)); g.stroke();
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
let blockN = 0;
function makeBlock(o = {}) {
  o = { skin: '#e9b98f', hair: '#3a2416', top: '#3a6aa8', bottom: '#2a2e3a', shoe: '#3a2a20', sleeve: true, hairStyle: 'short', h: 1, ...o };
  o.browCol = o.browCol || o.hair; o.key = 'p' + blockN; const blinkOff = (blockN++) * 1.37;
  const outer = new THREE.Group(), body = new THREE.Group(); body.position.y = -0.95; outer.add(body);
  const root = new THREE.Group(); root.scale.setScalar(o.h); body.add(root);
  const torso = new THREE.Group(); root.add(torso);
  const B = (w, h, d, col, x, y, z, par = torso) => { const m = mesh(BOX, typeof col === 'string' ? M(col, { roughness: 0.9 }) : col); m.scale.set(w, h, d); m.position.set(x, y, z); par.add(m); return m; };
  B(0.4, 0.5, 0.22, o.top, 0, 1.24, 0); B(0.38, 0.16, 0.205, o.bottom, 0, 0.95, 0); B(0.1, 0.08, 0.1, o.skin, 0, 1.52, 0);   // hips slightly thinner than the top (coplanar fronts flickered); neck
  if (o.belt) B(0.385, 0.035, 0.212, o.belt, 0, 1.0, 0);
  if (o.hoodie) { B(0.36, 0.16, 0.1, o.hoodie, 0, 1.5, -0.13); B(0.22, 0.1, 0.02, o.hoodie, 0, 1.12, 0.115); for (const x of [-0.04, 0.04]) B(0.012, 0.12, 0.012, '#f4f4f4', x, 1.38, 0.118); }
  if (o.tee) B(0.16, 0.12, 0.01, o.tee, 0, 1.3, 0.112);
  if (o.collar) B(0.22, 0.05, 0.03, o.collar, 0, 1.47, 0.11);
  // head: front face = the drawn face, other sides = skin
  const skinM = M(o.skin, { roughness: 0.85 }), shape = o.head || 'box'; let head, faceM; const nBefore = torso.children.length;
  if (shape === 'box') { faceM = new THREE.MeshStandardMaterial({ map: faceTex(o, 'neutral', false), roughness: 0.85 });
    head = new THREE.Mesh(BOX, [skinM, skinM, skinM, skinM, faceM, skinM]); head.scale.set(HEAD_W, HEAD_H, HEAD_D); }
  else {   // 'round' = a ball, 'soft' = a cube with rounded corners; the face is a transparent decal on the front
    o.decal = true; const geo = shape === 'round' ? new THREE.SphereGeometry(0.5, 40, 28) : new RoundedBoxGeometry(1, 1, 1, 5, 0.16);
    head = new THREE.Mesh(geo, skinM); head.scale.set(HEAD_W * (shape === 'round' ? 1.1 : 1), HEAD_H * (shape === 'round' ? 1.08 : 1), HEAD_D * (shape === 'round' ? 1.15 : 1));
    faceM = new THREE.MeshStandardMaterial({ map: faceTex(o, 'neutral', false), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.85 });
    head.add(new THREE.Mesh(decalGeo(geo, 1), faceM)); }
  head.position.set(0, HEAD_Y, 0); head.castShadow = true; torso.add(head);
  if (shape === 'round') {   // round head: ears are balls, hair is a tilted cap of a slightly bigger sphere
    const hsx = head.scale, hm = M(o.hair, { roughness: 0.95 }), hs = o.hairStyle;
    for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.035, 10, 8), skinM); e.position.set(s * hsx.x * 0.5, HEAD_Y - 0.01, 0); torso.add(e); }
    const cap = (theta, tilt, k = 1.07) => { const m = mesh(new THREE.SphereGeometry(0.5, 32, 20, 0, Math.PI * 2, 0, theta), hm); m.scale.set(hsx.x * k, hsx.y * k, hsx.z * k); m.position.set(0, HEAD_Y, 0); m.rotation.x = tilt; torso.add(m); return m; };
    if (hs === 'short') cap(Math.PI * 0.42, -0.55);
    if (hs === 'bangs') cap(Math.PI * 0.5, -0.42);
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
  const headG = new THREE.Group(); headG.position.set(0, HEAD_Y, 0); torso.add(headG); for (const c of torso.children.slice(nBefore, -1)) { c.position.y -= HEAD_Y; headG.add(c); } headG.scale.setScalar(o.headS || 1); headG.position.y = HEAD_Y + (HEAD_H / 2) * ((o.headS || 1) - 1) * 0.9;
  // limbs (groups at the joints)
  const arms = [], elbows = [], legs = [], knees = [];
  for (const sx of [-0.255, 0.255]) { const sh = new THREE.Group(); sh.position.set(sx, 1.45, 0); root.add(sh); B(0.11, 0.3, 0.12, o.top, 0, -0.13, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.28; sh.add(el); B(0.1, 0.24, 0.11, o.sleeve ? o.top : o.skin, 0, -0.11, 0, el); B(0.085, 0.09, 0.1, o.skin, 0, -0.27, 0, el); arms.push(sh); elbows.push(el); }
  for (const sx of [-0.1, 0.1]) { const hp = new THREE.Group(); hp.position.set(sx, 0.9, 0); root.add(hp); B(0.15, 0.42, 0.16, o.bottom, 0, -0.2, 0, hp);
    const kn = new THREE.Group(); kn.position.y = -0.42; hp.add(kn); B(0.14, 0.4, 0.15, o.bottom, 0, -0.2, 0, kn); B(0.15, 0.08, 0.24, o.shoe, 0, -0.43, 0.04, kn); legs.push(hp); knees.push(kn); }
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
// =================== THE CAST: you (gender-neutral: bangs, teal top), two friends, your little sibling, the teacher, classmates ===================
const hero = makeBlock({ skin: '#e9b98f', hair: '#4a3020', top: '#f28a2a', hoodie: '#f28a2a', bottom: '#2a3a5c', shoe: '#f4f4f4', hairStyle: 'bangs', headS: 1.25 });
const fr1 = makeBlock({ skin: '#b98260', hair: '#1a1a1a', top: '#e8a83a', bottom: '#3a3a40', hairStyle: 'short' }), fr2 = makeBlock({ skin: '#f0c8a4', hair: '#c8903a', top: '#7a5ac8', bottom: '#2f3a5a', hairStyle: 'long' });
const sib = makeBlock({ skin: '#e9b98f', hair: '#4a3020', top: '#e84a5a', bottom: '#3a4a6a', hairStyle: 'bangs', h: 0.78 });
const teacher = makeBlock({ skin: '#d7a47e', hair: '#9a9a9a', top: '#5a6a4a', bottom: '#3a3a40', hairStyle: 'bald', glasses: '#2a2420', mustache: '#8a8a8a' });
const mates = [makeBlock({ skin: '#8d5a3c', hair: '#1a1a1a', top: '#4a8ae8', bottom: '#2a2e3a', hairStyle: 'short' }), makeBlock({ skin: '#f1d2b6', hair: '#d9b36a', top: '#5ac87a', bottom: '#2a2e3a', hairStyle: 'long' }), makeBlock({ skin: '#c98d62', hair: '#2a1d14', top: '#f28a3a', bottom: '#2a2e3a', hairStyle: 'bangs' })];
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); }
function seatAt(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
// sparkles around the head at the IQ jump (sprites)
const sparkT = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? 9 : 30; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill(); });
function makeSparks(scene) { return Array.from({ length: 10 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkT, color: new THREE.Color(3, 2.6, 1.2), transparent: true, depthWrite: false })); scene.add(s); s.visible = false; return { s, a: i * 0.63, r: 0.22 + 0.08 * hash(i), y: 0.1 * (hash(i * 3) - 0.5) }; }); }
function sparkle(S, h, t, t0, dur = 1.6) { const k = (t - t0) / dur; S.forEach(({ s, a, r, y }) => { s.visible = k > 0 && k < 1; if (!s.visible) return; const rr = r * (0.6 + 0.8 * k); s.position.set(h.x + Math.cos(a + k * 3) * rr, h.y + y + 0.05 + 0.1 * k, h.z + Math.sin(a + k * 3) * rr * 0.6 + 0.1); s.scale.setScalar(0.09 * Math.sin(Math.PI * k)); }); }

// =================== THE SHOP DOOR (meters): you outside on the sidewalk, the camera inside behind a glass door marked PULL ===================
const shop = new THREE.Scene(); const spCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 200);
shop.add(new THREE.HemisphereLight(0xf4f8ff, 0x8a8070, 1.0)); { const s = new THREE.DirectionalLight(0xfff0d8, 2.2); s.position.set(3, 6, 6); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); Object.assign(s.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); shop.add(s); }
{ const skyT = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6aa8e8'); gr.addColorStop(1, '#d8ecfa'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshBasicMaterial({ map: skyT, color: new THREE.Color(1.1, 1.1, 1.1) })); sky.position.set(0, 10, 30); sky.rotation.y = Math.PI; shop.add(sky);
  const walk = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c8c4bc'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8a49c'; for (let i = 0; i <= w; i += 64) { g.fillRect(i, 0, 3, h); g.fillRect(0, i, w, 3); } }, [10, 6]);
  const sw = mesh(new THREE.PlaneGeometry(20, 12), new THREE.MeshStandardMaterial({ map: walk, roughness: 0.95 }), false, true); sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0, 6); shop.add(sw);
  const road = mesh(new THREE.PlaneGeometry(40, 10), M('#4a4a50', { roughness: 0.9 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.01, 17); shop.add(road);
  for (let i = 0; i < 6; i++) { const x = -8 + i * 3.2; bx(2.6, R(5, 9), 2, pick(['#d8b8a0', '#a8b8c8', '#e8d8b8', '#b8a090']), x, 3.5, 24, shop); }
  for (const x of [-3.5, 3.8]) { bx(0.2, 2.2, 0.2, '#6a4a30', x, 1.1, 9, shop); const c = mesh(new THREE.SphereGeometry(1.0, 10, 8), M('#4a8a3a', { flatShading: true })); c.position.set(x, 2.8, 9); shop.add(c); }
  // inside: floor + the storefront wall with the door opening (x -0.55..0.55, up to 2.2)
  const fl = mesh(new THREE.PlaneGeometry(10, 6), M('#e8e0d4', { roughness: 0.8 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.005, -3); shop.add(fl);
  bx(4.0, 3.2, 0.2, '#2a2e36', -2.55, 1.6, 0, shop); bx(4.0, 3.2, 0.2, '#2a2e36', 2.55, 1.6, 0, shop); bx(1.1, 1.0, 0.2, '#2a2e36', 0, 2.7, 0, shop);
  for (const x of [-0.55, 0.55]) bx(0.06, 2.2, 0.12, '#b8bcc4', x, 1.1, 0, shop); bx(1.16, 0.06, 0.12, '#b8bcc4', 0, 2.2, 0, shop); bx(1.16, 0.06, 0.12, '#b8bcc4', 0, 0.03, 0, shop);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 2.14), new THREE.MeshStandardMaterial({ color: '#c8e4f4', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false })); glass.position.set(0, 1.1, 0); shop.add(glass);
  bx(0.03, 0.4, 0.05, '#c8ccd4', 0.42, 1.05, -0.05, shop);   // the handle (on our side: you have to PULL)
  const pullT = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#e8303a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = 'bold 64px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('PULL', w / 2, 70); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: pullT, color: new THREE.Color(1.2, 1.2, 1.2) })); sign.position.set(0, 1.42, -0.015); sign.rotation.y = Math.PI; shop.add(sign);
  const sign2 = sign.clone(); sign2.position.z = 0.015; sign2.rotation.y = 0; shop.add(sign2); }
shop.add(hero.outer); const sparkShop = makeSparks(shop);
const smudge = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); smudge.position.set(0, 1.68, 0.012); shop.add(smudge);
// walks up from the street, pushes the glass (bonk), stumbles back; returns 'walk' | 'push' | 'bonk' | 'back'
function doorRun(t, t0, faceAfter) { const P = hero, o = P.outer; poseReset(P, t); const u = t - t0;
  const zW = lerp(3.2, 0.42, smooth(0, 1.4, u)), bonk = Math.exp(-Math.pow((u - 1.75) / 0.12, 2)), back = smooth(1.8, 2.3, u);
  o.position.set(0.05, 0.95, u < 1.6 ? zW : 0.42 + 0.03 * bonk + 0.25 * back); o.rotation.y = Math.PI; if (u < 1.4) poseWalk(P, u * 10, 1);
  if (u >= 1.3 && u < 1.85) { const k = smooth(1.3, 1.6, u); P.arms[0].rotation.set(-1.4 * k, 0, 0.1); P.arms[1].rotation.set(-1.4 * k, 0, -0.1); P.elbows.forEach(e => e.rotation.x = -0.3 * k); }
  P.root.rotation.x = -0.25 * bonk + 0.12 * back * (1 - smooth(2.3, 2.8, u)); smudge.material.opacity = 0.25 * smooth(1.7, 1.8, u);
  return u < 1.4 ? 'walk' : u < 1.75 ? 'push' : u < 2.0 ? 'bonk' : 'back'; }
function updateShop(t, mode) { if (hero.outer.parent !== shop) shop.add(hero.outer); pencil.visible = false; const P = hero; sparkShop.forEach(p => p.s.visible = false);
  if (mode === 'open') { const st = doorRun(t, 0.2); P.face(st === 'bonk' ? 'surprised' : t < POP ? 'dumb' : 'smirk', t);
    if (t > POP) { P.root.rotation.x = 0; P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.arms[0].rotation.set(-0.3, 0, 0.6); P.elbows[0].rotation.x = -1.9; }   // arms crossed-ish, chin up
    sparkle(sparkShop, headOf(P), t, POP, 1.4); }
  else { const st = doorRun(t, DOOR + 0.6); P.face(t < DOOR + 2.3 ? 'smirk' : t < DOOR + 3.2 ? 'dumb' : t < DOOR + 4.4 ? 'sad' : 'laugh', t);
    if (t > DOOR + 3.2) { P.arms[1].rotation.set(-2.5, 0, -0.2); P.elbows[1].rotation.x = -1.3; } }   // rubs the forehead
}
function shopCamera(t, mode) { updateShop(t, mode); const h = headOf(hero); let F;
  if (mode === 'open') F = framing(V3(0.05, h.y, Math.max(h.z, 0.4)), V3(0.12, -0.02, -1), lerp(3.0, 2.3, smooth(0, POP + 0.6, t)), 0.6);
  else F = framing(V3(0.05, h.y, Math.max(h.z, 0.4)), V3(-0.12, -0.02, -1), lerp(3.2, 2.4, smooth(DOOR, DOOR + 2.4, t)), 0.58);
  applyF(spCam, F); }

// =================== THE BELL CURVE (meters, 1 SD = 1.2 m): a crowd shaped like the curve, markers 100…228, you alone at 500 (32 m out) ===================
const curve = new THREE.Scene(); curve.background = new THREE.Color('#141a2e'); curve.fog = new THREE.Fog(0x141a2e, 18, 45); const cvCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 200);
curve.add(new THREE.HemisphereLight(0xc8d4ff, 0x2a2440, 1.1)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(2, 6, 8); curve.add(k); }
const SD = 1.2, iqX = iq => (iq - 100) / 15 * SD;
{ const gr = mesh(new THREE.PlaneGeometry(90, 30), M('#232a44', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; gr.position.set(15, 0, 0); curve.add(gr);
  const gridT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#232a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a4a7a'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); }, [90, 30]); gr.material = new THREE.MeshStandardMaterial({ map: gridT, roughness: 1 });
  // the glowing curve line above the crowd
  const pts = []; for (let i = 0; i <= 200; i++) { const x = -6 + i * 0.25, z = x / SD; pts.push(V3(x, 0.12 + 3.2 * Math.exp(-z * z / 2), -1.4)); }
  curve.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.03, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.6, 0.5) })));
  // markers
  const RARE = { 100: 'average', 130: '1 in 44', 145: '1 in 741', 160: '1 in 31,600', 228: '1 in 10¹⁷', 500: '1 in 10¹⁵⁶' };   // tools/iq_math.py
  for (const iq of [100, 130, 145, 160, 228, 500]) { const x = iqX(iq), t = canvasTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = iq === 500 ? '#ffd060' : '#ffffff'; g.font = 'bold 72px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(String(iq), w / 2, 68); g.font = '600 30px Inter, sans-serif'; g.fillStyle = '#9ad8ff'; g.fillText(RARE[iq], w / 2, 112); });
    bx(0.04, 1.2, 0.04, '#8a90a8', x, 0.6, -1.6, curve); const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); s.position.set(x, 1.55, -1.6); curve.add(s); } }
// the crowd: simple blocky people as two instanced meshes (body + head), density follows the curve
const CROWD = []; for (let c = -48; c <= 48; c++) { const x = c * 0.12, z = x / SD, n = Math.round(14 * Math.exp(-z * z / 2)); for (let k = 0; k < n; k++) CROWD.push([x + R(-0.04, 0.04), -1.0 + k * 0.32 + R(-0.05, 0.05)]); }
const crowdBody = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.9 }), CROWD.length), crowdHead = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.9 }), CROWD.length);
{ const o = new THREE.Object3D(), col = new THREE.Color(); CROWD.forEach(([x, z], i) => { const s = 0.9 + 0.2 * hash(i);
    o.position.set(x, 0.42 * s, z); o.scale.set(0.11 * s, 0.84 * s, 0.08 * s); o.rotation.set(0, 0, 0); o.updateMatrix(); crowdBody.setMatrixAt(i, o.matrix); crowdBody.setColorAt(i, col.set(pick(['#e24b3b', '#2f5d8a', '#e0b040', '#4b8b5a', '#7a4a8c', '#f08a4b', '#5aa0c8', '#d46a8a'])));
    o.position.set(x, 0.9 * s, z); o.scale.set(0.085 * s, 0.09 * s, 0.08 * s); o.updateMatrix(); crowdHead.setMatrixAt(i, o.matrix); crowdHead.setColorAt(i, col.set(pick(['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c', '#6b4329']))); });
  curve.add(crowdBody, crowdHead); }
const spot = new THREE.SpotLight(0xfff0d0, 0, 8, 0.4, 0.6); spot.position.set(iqX(500), 5, 1); spot.target.position.set(iqX(500), 0, 0); curve.add(spot, spot.target);
function updateCurve(t) { if (hero.outer.parent !== curve) curve.add(hero.outer); poseReset(hero, t); hero.outer.position.set(iqX(500), 0.95, 0); hero.outer.rotation.y = -0.3; spot.intensity = 30 * smooth(CURVE + 4, CURVE + 6, t);
  hero.arms[1].rotation.set(-0.2, 0, -0.5 * Math.max(0, Math.sin((t - CURVE - 6) * 6)) * smooth(CURVE + 5.8, CURVE + 6.2, t)); hero.face(t < CURVE + 6.5 ? 'smirk' : 'sad', t); }
function curveCamera(t) { updateCurve(t); const k = ease(clamp((t - CURVE - 0.3) / 6.2, 0, 1)), x = lerp(0, iqX(500), k), h = headOf(hero);
  const far = framing(V3(x, 1.1, -1.0), V3(0.0, 0.35, 1), lerp(9.5, 4.5, k), 0.5), near = framing(h, V3(0.25, 0.08, 1), 2.4, 0.6);
  applyF(cvCam, blendF(far, near, smooth(CURVE + 5.6, CURVE + 7.4, t))); }

// =================== THE CLASSROOM: the test, done in three seconds ===================
const cls = new THREE.Scene(); const clCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 100);
cls.add(new THREE.HemisphereLight(0xfff4e8, 0x6a5a50, 1.0)); { const k = new THREE.DirectionalLight(0xffe8d0, 1.8); k.position.set(-3, 5, 4); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); cls.add(k); }
{ const fl = mesh(new THREE.PlaneGeometry(10, 10), M('#c8b090', { roughness: 0.9 }), false, true); fl.rotation.x = -Math.PI / 2; cls.add(fl); bx(10, 3, 0.1, '#e8e0c8', 0, 1.5, -3.5, cls);
  const boardT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f4ec'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('IQ TEST', 30, 80); g.font = '34px Inter, sans-serif'; g.fillText('Time: 60 minutes', 30, 150); g.fillText('No phones!', 30, 205); });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map: boardT, roughness: 0.9 })); bd.position.set(0, 1.7, -3.44); cls.add(bd);
  for (const [x, z] of [[0, 0], [-1.3, 1.2], [1.3, 1.2], [0, 1.2]]) { bx(0.7, 0.04, 0.5, '#c89a6a', x, 0.72, z + 0.32, cls); bx(0.6, 0.7, 0.04, '#8a8a90', x, 0.35, z + 0.55, cls); } }
const paper = new THREE.Group(); { bx(0.21, 0.004, 0.28, '#ffffff', 0, 0, 0, paper); const doneT = canvasTex(128, 170, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8c8d0'; for (let y = 30; y < h; y += 14) g.fillRect(10, y, w - 20, 3); g.fillStyle = '#e8303a'; g.font = 'bold 36px Inter, sans-serif'; g.fillText('100%', 18, 120); });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshBasicMaterial({ map: doneT })); pm.rotation.x = -Math.PI / 2; pm.position.y = 0.003; paper.add(pm); } cls.add(paper);
const pencil = new THREE.Group(); { bx(0.012, 0.16, 0.012, '#f2c040', 0, 0, 0, pencil); bx(0.012, 0.02, 0.012, '#e8a0a0', 0, 0.09, 0, pencil); } hero.elbows[1].add(pencil); pencil.position.set(0, -0.3, 0.04);
cls.add(teacher.outer); mates.forEach(m => cls.add(m.outer));
function updateClass(t) { if (hero.outer.parent !== cls) cls.add(hero.outer); pencil.visible = true; const P = hero; poseReset(P, t); seatAt(P, 0, 0.47, 0.6, Math.PI);
  const done = t > TEST + 1.4; P.arms[1].rotation.set(done ? -2.6 : -0.9, 0, 0.1); P.elbows[1].rotation.x = done ? -0.2 : -0.8; pencil.rotation.z = t * 14; pencil.visible = !done || t > TEST + 2.2;
  paper.position.copy(done ? V3(0.12, 1.98, 0.75) : V3(0, 0.745, 0.32)); paper.rotation.set(done ? Math.PI / 2 - 0.2 : 0, 0, 0); if (done) { P.outer.updateMatrixWorld(true); }
  P.face(t < TEST + 0.6 ? 'reading' : t < TEST + 1.4 ? 'squint' : 'smirk', t);
  poseReset(teacher, t); teacher.outer.position.set(1.0, 0.95, -0.9); teacher.outer.rotation.y = -2.5; teacher.face(t < TEST + 1.6 ? 'neutral' : 'surprised', t + 0.5);
  mates.forEach((m, i) => { poseReset(m, t); seatAt(m, [-1.3, 1.3, 0][i], 0.47, 1.8, Math.PI); m.arms[1].rotation.set(-0.9, 0, 0.1); m.elbows[1].rotation.x = -0.8; m.face(t < TEST + 1.8 ? (i % 2 ? 'squint' : 'worried') : 'surprised', t + i); }); }
function classCamera(t) { updateClass(t); const h = headOf(hero); applyF(clCam, blendF(framing(h, V3(0.2, 0.1, -1), 2.2, 0.62), framing(h, V3(-0.35, 0.15, -1), 3.0, 0.6), smooth(TEST + 1.6, TEST + 4, t))); }

// =================== THE LIBRARY: books fly into your hands and back; then the reading table, and the brain bulb that pops ===================
const lib = new THREE.Scene(); const lbCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 100); lib.fog = new THREE.Fog(0x3a2a20, 8, 20); lib.background = new THREE.Color('#3a2a20');
const lbHemi = new THREE.HemisphereLight(0xffe8c8, 0x4a3a2a, 0.9); lib.add(lbHemi); const lbLamp = new THREE.PointLight(0xffd8a0, 4, 12, 1.2); lbLamp.position.set(0, 3, 2); lib.add(lbLamp);
const spineT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#4a3020'; g.fillRect(0, 0, w, h); for (let row = 0; row < 4; row++) { let x = 4; while (x < w - 10) { const bw = R(10, 22), bh = R(40, 58); g.fillStyle = pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a', '#6a3a7a', '#d8c8a8', '#1a3a5a']); g.fillRect(x, row * 64 + 62 - bh, bw, bh); x += bw + 2; } g.fillStyle = '#6a4a30'; g.fillRect(0, row * 64 + 60, w, 6); } });
{ const fl = mesh(new THREE.PlaneGeometry(14, 14), M('#7a5034', { roughness: 0.85 }), false, true); fl.rotation.x = -Math.PI / 2; lib.add(fl);
  for (const [x, z, ry] of [[0, -2.2, 0], [-2.6, -0.6, Math.PI / 2], [2.6, -0.6, -Math.PI / 2], [-1.6, -2.2, 0], [1.6, -2.2, 0]]) { const s = mesh(BOX, [M('#5a3a24'), M('#5a3a24'), M('#5a3a24'), M('#5a3a24'), new THREE.MeshStandardMaterial({ map: spineT, roughness: 0.9 }), M('#5a3a24')]); s.scale.set(1.6, 2.6, 0.4); s.position.set(x, 1.3, z); s.rotation.y = ry; lib.add(s); }
  bx(1.4, 0.05, 0.8, '#8a5a3a', 0, 0.75, 1.0, lib); for (const [dx, dz] of [[-0.6, -0.32], [0.6, -0.32], [-0.6, 0.32], [0.6, 0.32]]) bx(0.05, 0.75, 0.05, '#6a4a30', dx, 0.375, 1.0 + dz, lib); bx(0.45, 0.05, 0.45, '#6a4a30', 0, 0.47, 0.45, lib); }
const BOOKS = Array.from({ length: 14 }, (_, i) => { const b = mesh(BOX, M(pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a', '#6a3a7a']), { roughness: 0.8 })); b.scale.set(0.16, 0.22, 0.04); lib.add(b); return { b, x0: R(-0.7, 0.7), y0: R(0.4, 2.2) }; });
const readPile = Array.from({ length: 10 }, (_, i) => { const b = bx(0.22, 0.04, 0.16, pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a']), 0.45, 0.795 + i * 0.042, 1.05, lib); b.rotation.y = R(-0.3, 0.3); return b; });
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), transparent: true })); lib.add(bulb); const bulbBase = bx(0.05, 0.05, 0.05, '#a8a8b0', 0, 0, 0, lib); const bulbL = new THREE.PointLight(0xfff0c0, 0, 4, 1.4); lib.add(bulbL);
const shards = Array.from({ length: 16 }, (_, i) => { const s = bx(0.025, 0.004, 0.02, '#e8f4ff', 0, 0, 0, lib); return { s, d: V3(R(-1, 1), R(0.2, 1.2), R(-1, 1)).normalize() }; });
lib.add(hero.outer); const sparkLib = makeSparks(lib);
function updateLib(t, mode) { if (hero.outer.parent !== lib) lib.add(hero.outer); const P = hero; poseReset(P, t); pencil.visible = false; BOOKS.forEach(B => B.b.visible = false); bulb.visible = bulbBase.visible = false; bulbL.intensity = 0; shards.forEach(S => S.s.visible = false); sparkLib.forEach(p => p.s.visible = false);
  if (mode === 'books') { P.outer.position.set(0, 0.95, -1.2); P.outer.rotation.y = 0; P.arms[0].rotation.set(-1.0, 0, -0.2); P.arms[1].rotation.set(-1.0, 0, 0.2); P.elbows.forEach(e => e.rotation.x = -0.6); P.face(t < LIB + 2 ? 'reading' : 'smirk', t);
    readPile.forEach((b, i) => b.visible = i < Math.floor((t - LIB) * 1.2)); P.outer.updateMatrixWorld(true); const hand = P.head.getWorldPosition(V3(0, 0, 0)).add(V3(0, -0.45, 0.32));
    BOOKS.forEach((B, i) => { const ph = (t - LIB) * 1.8 - i * 0.55; if (ph < 0 || ph > 1) return; B.b.visible = true; const from = V3(B.x0, B.y0, -1.95), to = V3(0.45, 0.8 + 0.4 * (i % 3), 1.05), mid = ph < 0.5 ? from.clone().lerp(hand, ph * 2) : hand.clone().lerp(to, (ph - 0.5) * 2);
      mid.y += Math.sin(Math.PI * ph * 2) * 0.25; B.b.position.copy(mid); B.b.rotation.set(ph * 6, ph * 4, 0); }); }
  else {   // bulb: at the table, a bulb above your head glows brighter and brighter, then pops
    readPile.forEach(b => b.visible = true); seatAt(P, 0, 0.47, 0.45, 0); P.arms.forEach(a => a.rotation.set(-0.9, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.7); const k = smooth(BULB + 0.5, BULB + 5.2, t), popped = t > BULB + 5.4;
    P.outer.updateMatrixWorld(true); const hd = P.head.getWorldPosition(V3(0, 0, 0)), bp = hd.clone().add(V3(0, 0.42, 0)); bulb.visible = bulbBase.visible = !popped; bulb.position.copy(bp); bulbBase.position.copy(bp).add(V3(0, -0.11, 0));
    bulb.material.color.setScalar(1 + 6 * k); bulb.scale.setScalar(1 + 0.25 * k + 0.05 * Math.sin(t * 30) * k); bulbL.position.copy(bp); bulbL.intensity = popped ? Math.max(0, 6 * (1 - (t - BULB - 5.4) / 0.4)) : 0.5 + 5 * k;
    if (popped) shards.forEach(S => { const u = t - BULB - 5.4; S.s.visible = u < 1.2; S.s.position.copy(bp).addScaledVector(S.d, u * 1.2).add(V3(0, -2 * u * u, 0)); S.s.rotation.set(u * 9, u * 7, 0); });
    P.face(t < BULB + 3 ? 'smirk' : t < BULB + 5.4 ? 'surprised' : t < BULB + 6.4 ? 'dumb' : 'laugh', t); }
  lbHemi.intensity = mode === 'bulb' ? 0.6 : 0.9; }
function libCamera(t, mode) { updateLib(t, mode); const h = headOf(hero);
  if (mode === 'books') applyF(lbCam, blendF(framing(h, V3(0.15, 0.05, 1), 2.6, 0.62), framing(h, V3(0.45, 0.2, 1), 3.4, 0.6), smooth(LIB + 1, LIB + 7, t)));
  else applyF(lbCam, framing(h.clone().add(V3(0, 0.2, 0)), V3(0.2, 0.08, 1), lerp(2.7, 2.3, smooth(BULB, TALK, t)), 0.5)); }

// =================== THE LIVING ROOM (shared family set): small talk with two friends; the kitchen argument with your little sibling ===================
room.add(fr1.outer, fr2.outer, sib.outer); const sparkRoom = makeSparks(room);
function updateTalk(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false; lightRoom('day'); for (const P of [fr1, fr2, sib]) P.outer.visible = false; sparkRoom.forEach(p => p.s.visible = false);
  const P = hero; poseReset(P, t);
  if (mode === 'talk') { P.outer.position.set(-0.3, 0.95, -1.2); P.outer.rotation.y = 0.15; P.face(t < TALK + 2.4 ? 'sleepy' : t < TALK + 4.2 ? 'smirk' : 'sleepy', t);
    poseReset(fr1, t); poseReset(fr2, t); fr1.outer.position.set(0.55, 0.95, -1.45); fr1.outer.rotation.y = -0.7; fr2.outer.position.set(-1.15, 0.95, -1.5); fr2.outer.rotation.y = 0.7;
    fr1.arms[1].rotation.set(-0.6 - 0.3 * Math.max(0, Math.sin(t * 4)), 0, -0.2); fr1.face(t < TALK + 3.0 ? 'happy' : 'surprised', t); fr2.face(t < TALK + 3.0 ? 'laugh' : 'surprised', t + 1.1);
    if (t > TALK + 5.0) { P.arms[1].rotation.set(-2.3, 0, -0.2); P.elbows[1].rotation.x = -1.4; } }   // a yawn behind the hand
  else { P.outer.position.set(2.2, 0.95, -0.9); P.outer.rotation.y = 0.9; P.face(t < ARGUE + 3.4 ? 'neutral' : 'smirk', t);
    poseReset(sib, t); sib.outer.position.set(2.95, 0.95, -0.35); sib.outer.rotation.y = -2.1; sib.arms.forEach((a, i) => a.rotation.set(-0.4 - 0.4 * Math.max(0, Math.sin(t * 7 + i)) * (t < ARGUE + 3.4 ? 1 : 0), 0, i ? -0.3 : 0.3));
    sib.face(t < ARGUE + 3.4 ? 'angry' : t < ARGUE + 4.6 ? 'surprised' : 'sad', t + 0.4); if (t > ARGUE + 3.4) { P.arms[0].rotation.set(-0.5, 0, 0.6); P.elbows[0].rotation.x = -1.9; } } }
function talkCamera(t, mode) { updateTalk(t, mode); const h = headOf(hero), o = headOf(mode === 'talk' ? fr1 : sib), mid = h.clone().lerp(o, 0.5);
  applyF(rmCam, blendF(framing(mid, V3(0.15, 0.08, 1), 3.2, 0.62), framing(h, V3(0.35, 0.06, 1), 2.4, 0.62), smooth((mode === 'talk' ? TALK : ARGUE) + 3.2, (mode === 'talk' ? TALK : ARGUE) + 5.0, t))); }
// =================== EXTRAS (more to look at): the formula aura, street life + lightning + rays at the jump, a fuller classroom (falling mug),
// the book tornado, the library lights draining into the bulb, more friends, the sibling storming off with Mom laughing ===================
// ---- the aura: glowing formulas orbiting your head once the IQ jumps (one set per scene) ----
const FORMULAS = ['E=mc²', 'π', '∑', '√2', 'a²+b²=c²', '∫x dx', '∞', 'Δx', 'φ', 'e^iπ+1=0', '42', 'x̄'];
const formTex = FORMULAS.map(f => canvasTex(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = 'bold 54px "Source Serif 4", serif'; g.textAlign = 'center'; g.shadowColor = '#7ae8ff'; g.shadowBlur = 14; g.fillStyle = '#e8fcff'; g.fillText(f, w / 2, 66); }));
function makeAura(scene) { return FORMULAS.map((f, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: formTex[i], color: new THREE.Color(1.6, 1.9, 2.2), transparent: true, depthWrite: false })); s.visible = false; scene.add(s); return { s, a: i / FORMULAS.length * Math.PI * 2, y: 0.25 * Math.sin(i * 2.1), r: 0.55 + 0.15 * hash(i * 7) }; }); }
function aura(A, h, t, k) { A.forEach(({ s, a, y, r }, i) => { s.visible = k > 0.01; if (!s.visible) return; const ang = a + t * 0.6, fall = 1 - k;
  s.position.set(h.x + Math.cos(ang) * r, h.y + 0.1 + y + 0.05 * Math.sin(t * 2 + i) - fall * 0.8, h.z + Math.sin(ang) * r * 0.7); s.material.opacity = k * (0.55 + 0.45 * (Math.sin(ang) * 0.5 + 0.5)); s.scale.set(0.26, 0.1, 1); }); }
const auras = { shop: makeAura(shop), curve: makeAura(curve), cls: makeAura(cls), lib: makeAura(lib), room: makeAura(room) };
// ---- the street (seen through the glass): storefronts with signs, people walking, cars ----
const signTex = txt => canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#1e2a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd060'; g.font = 'bold 40px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, 46); });
['PIZZA', 'BOOKS', 'LAUNDRY', 'DINER', 'GYM', 'BANK'].forEach((n, i) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: signTex(n), color: new THREE.Color(1.3, 1.3, 1.3) })); s.position.set(-8 + i * 3.2, 2.6, 22.9); s.rotation.y = Math.PI; shop.add(s); });
const walkers = [['#e84a5a', '#d7a47e', 'long'], ['#4a8ae8', '#8d5a3c', 'short'], ['#f2c040', '#f1d2b6', 'bangs'], ['#7a5ac8', '#b98260', 'curly']].map(([top, skin, hs], i) => { const p = makeBlock({ skin, top, hair: hs === 'curly' ? '#2a1d14' : pick(['#1a1a1a', '#4a2f1b', '#c8903a']), bottom: '#2a3a5c', hairStyle: hs }); shop.add(p.outer); return { p, z: 3.6 + (i % 2) * 1.3, sp: (i % 2 ? -1 : 1) * R(0.8, 1.1), x0: R(-6, 6) }; });
function makeCar(col) { const c = new THREE.Group(); bx(1.9, 0.5, 0.85, col, 0, 0.45, 0, c); bx(1.0, 0.4, 0.8, col, -0.1, 0.88, 0, c); bx(0.98, 0.34, 0.82, '#a8c8e0', -0.1, 0.88, 0, c, { roughness: 0.2 }); for (const [x, z] of [[-0.62, 0.43], [0.62, 0.43], [-0.62, -0.43], [0.62, -0.43]]) { const w = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), M('#1a1a1e')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, z); c.add(w); } return c; }
const cars = [['#e8303a', 15.8, 1], ['#f4f4f2', 18.2, -1], ['#3a6ad0', 15.8, 1]].map(([col, z, d], i) => { const c = makeCar(col); c.position.z = z; shop.add(c); return { c, d, x0: i * 9 }; });
// ---- the jump: lightning around the head + a burst of rays behind you ----
const boltM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 3.2, 4.0), transparent: true, depthWrite: false });
const bolts = Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => { const m = mesh(BOX, boltM, false, false); shop.add(m); return m; }));
const raysT = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); for (let k = 0; k < 24; k++) { g.rotate(Math.PI / 12); const gr = g.createLinearGradient(0, 0, w / 2, 0); gr.addColorStop(0, 'rgba(255,240,180,0.9)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, -14); g.lineTo(w / 2, 14); g.closePath(); g.fill(); } });
const rays = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: raysT, transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(1.6, 1.5, 1.2) })); shop.add(rays);
function shopExtras(t, mode) { const h = headOf(hero);
  walkers.forEach(({ p, z, sp, x0 }, i) => { poseReset(p, t); const x = wrapR(x0 + sp * t, -7, 7); p.outer.position.set(x, 0.95, z); p.outer.rotation.y = sp > 0 ? Math.PI / 2 : -Math.PI / 2; poseWalk(p, t * 8 + i, 1);
    const lookAt = (mode === 'open' && t > 1.95 && t < POP + 1.5) || (mode === 'end' && t > DOOR + 2.35); if (lookAt) { p.outer.rotation.y = Math.PI + (x > 0 ? 0.4 : -0.4); poseIdle(p, t, i); p.outer.position.x = clamp(x, -2.5, 2.5); }
    p.face(lookAt ? (mode === 'open' && t > POP ? 'surprised' : 'laugh') : 'neutral', t + i); });
  cars.forEach(({ c, d, x0 }) => { c.position.x = wrapR(x0 + d * 6 * t, -20, 20); c.rotation.y = d > 0 ? 0 : Math.PI; });
  const kb = mode === 'open' ? Math.max(0, 1 - Math.abs(t - POP - 0.35) / 0.55) : 0;
  bolts.forEach((B, j) => { let p = h.clone().add(V3(0, 0.05, 0)); const ang = j * 1.57 + Math.floor(t * 15) * 0.7; B.forEach((m, i) => { m.visible = kb > 0.05; if (!m.visible) return; const q = p.clone().add(V3(Math.cos(ang) * 0.07 + (hash(i + j * 9 + Math.floor(t * 15)) - 0.5) * 0.08, 0.04 + (hash(i * 3 + j + Math.floor(t * 15)) - 0.5) * 0.08, Math.sin(ang) * 0.05));
    m.position.lerpVectors(p, q, 0.5); m.lookAt(q); m.scale.set(0.012, 0.012, p.distanceTo(q)); p = q; }); }); boltM.opacity = kb;
  rays.position.set(h.x, h.y, h.z + 0.4); rays.lookAt(spCam.position); rays.rotateZ(t * 0.8); rays.material.opacity = mode === 'open' ? 0.85 * Math.max(0, 1 - Math.abs(t - POP - 0.4) / 0.9) : 0;
  aura(auras.shop, h, t, mode === 'open' ? smooth(POP + 0.2, POP + 0.9, t) : 1 - smooth(DOOR + 2.3, DOOR + 2.9, t)); }
// ---- a fuller classroom: more students, a window wall, a clock, the teacher's mug drops ----
const mates2 = [['#e8a83a', '#f1d2b6', 'long'], ['#5a6ae8', '#6b4329', 'short'], ['#e84a8a', '#d7a47e', 'curly']].map(([top, skin, hs]) => { const p = makeBlock({ skin, top, hair: pick(['#1a1a1a', '#4a2f1b', '#7a4a22']), bottom: '#2a2e3a', hairStyle: hs }); cls.add(p.outer); return p; });
{ for (const [x, z] of [[-1.3, 2.4], [1.3, 2.4], [0, 2.4]]) { bx(0.7, 0.04, 0.5, '#c89a6a', x, 0.72, z + 0.32, cls); }
  bx(0.1, 3, 8, '#e8e0c8', -3.0, 1.5, 0, cls); for (const z of [-1.8, 0.2, 2.2]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.8, 2.0) })); w.position.set(-2.94, 1.8, z); w.rotation.y = Math.PI / 2; cls.add(w); }
  const clockT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#2a2a30'; g.lineWidth = 6; g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 22); g.moveTo(64, 64); g.lineTo(94, 64); g.stroke(); });
  const ck = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ map: clockT })); ck.position.set(1.9, 2.3, -3.44); cls.add(ck);
  const eqT = canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f4f4ec'; g.font = '36px "Source Serif 4", serif'; ['x² − 5x + 6 = 0', '∫₀¹ x² dx = ⅓', 'e^{iπ} + 1 = 0', 'F = ma'].forEach((s, i) => g.fillText(s, 20, 50 + i * 58)); });
  const eq = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: eqT, transparent: true })); eq.position.set(-1.9, 1.75, -3.43); cls.add(eq); bx(1.8, 1.0, 0.03, '#2f4a3a', -1.9, 1.75, -3.46, cls); }
const tMug = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), M('#e84a3a')); cls.add(tMug);
function classExtras(t) { mates2.forEach((m, i) => { poseReset(m, t); seatAt(m, [-1.3, 1.3, 0][i], 0.47, 3.0, Math.PI); m.arms[1].rotation.set(-0.9, 0, 0.1); m.elbows[1].rotation.x = -0.8; m.face(t < TEST + 1.9 ? (i % 2 ? 'reading' : 'squint') : 'surprised', t + i * 0.7); });
  teacher.outer.updateMatrixWorld(true); const hand = teacher.elbows[1].localToWorld(V3(0, -0.3, 0.05)), fall = clamp((t - TEST - 1.8) / 0.45, 0, 1);
  if (t < TEST + 1.8) { teacher.arms[1].rotation.set(-0.7, 0, 0); teacher.elbows[1].rotation.x = -1.2; tMug.position.copy(teacher.elbows[1].localToWorld(V3(0, -0.3, 0.06))); tMug.rotation.set(0, 0, 0); }
  else { tMug.position.set(hand.x + 0.1 * fall, Math.max(0.05, hand.y - 4.9 * Math.pow(fall * 0.45, 2) * 4.5), hand.z + 0.1 * fall); tMug.rotation.set(0, 0, fall * 1.6); }
  aura(auras.cls, headOf(hero), t, 1); }
// ---- the book tornado; the library lights drain into the bulb ----
const TORN = Array.from({ length: 44 }, (_, i) => { const b = mesh(BOX, M(pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a', '#6a3a7a', '#d8c8a8']), { roughness: 0.8 })); b.scale.set(0.14, 0.2, 0.035); lib.add(b); return { b, a: i * 0.77, y: 0.2 + (i / 44) * 2.0, r: 0.55 + 0.45 * (i / 44), sp: 2.2 + hash(i) * 1.2 }; });
const ceilLamps = [-1.2, 0, 1.2].map(x => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.8) })); m.position.set(x, 2.9, 0.6); lib.add(m); bx(0.01, 0.3, 0.01, '#2a2a2a', x, 3.1, 0.6, lib); return m; });
function libExtras(t, mode) { const h = headOf(hero);
  const k = mode === 'books' ? smooth(LIB + 2.2, LIB + 3.2, t) : 0; TORN.forEach(({ b, a, y, r, sp }) => { b.visible = k > 0.01; if (!b.visible) return; const ang = a + t * sp; b.position.set(h.x + Math.cos(ang) * r * k, y * (0.4 + 0.6 * k), h.z + Math.sin(ang) * r * k); b.rotation.set(ang, ang * 0.7, 0.3); });
  let drain = 0, dark = 0; if (mode === 'bulb') { drain = smooth(BULB + 1.0, BULB + 5.2, t); dark = t > BULB + 5.4 ? Math.max(0, 1 - (t - BULB - 5.6) / 1.4) : 0; }
  const flick = drain > 0.5 ? 0.85 + 0.15 * Math.sin(t * 37) * Math.sin(t * 11) : 1, lv = (1 - 0.8 * drain) * flick * (1 - 0.8 * dark);
  lbLamp.intensity = 4 * lv; ceilLamps.forEach(m => m.material.color.setRGB(3 * lv, 2.6 * lv, 1.8 * lv)); lbHemi.intensity = (mode === 'bulb' ? 0.6 : 0.9) * (0.4 + 0.6 * lv);
  aura(auras.lib, h, t, 1); }
// ---- more friends at the small talk, snacks; the sibling storms off, Mom laughs in the background ----
const fr3 = makeBlock({ skin: '#8d5a3c', hair: '#1a1a1a', top: '#5ac87a', bottom: '#3a3a40', hairStyle: 'curly' }), fr4 = makeBlock({ skin: '#f1d2b6', hair: '#a5462a', top: '#f08a4b', bottom: '#2a3a5c', hairStyle: 'short' }); room.add(fr3.outer, fr4.outer);
const snacks = new THREE.Group(); { const bowl = mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#e8e0d0')); bowl.position.y = 0.16; snacks.add(bowl); for (let i = 0; i < 14; i++) { const c = bx(0.05, 0.01, 0.05, '#e8b04a', R(-0.1, 0.1), 0.15 + R(0, 0.04), R(-0.1, 0.1), snacks); c.rotation.set(R(0, 3), R(0, 3), 0); } } snacks.position.set(-1.95, 0.6, -1.55); room.add(snacks);
function talkExtras(t, mode) { fr3.outer.visible = fr4.outer.visible = false; snacks.visible = mode === 'talk';
  if (mode === 'talk') { for (const [P, x, z, ry, ex] of [[fr3, 0.25, -2.15, -0.2, 'laugh'], [fr4, -0.75, -2.25, 0.3, 'happy']]) { poseReset(P, t); P.outer.position.set(x, 0.95, z); P.outer.rotation.y = ry; P.face(t < TALK + 3.0 ? ex : 'surprised', t + x); } }
  else { const go = smooth(ARGUE + 5.0, ARGUE + 7.4, t); if (go > 0) { sib.outer.position.set(lerp(2.95, 0.6, go), 0.95, lerp(-0.35, 0.9, go)); sib.outer.rotation.y = -2.1 + 1.2 * smooth(ARGUE + 4.8, ARGUE + 5.2, t); poseWalk(sib, t * 12, 1); }
    mom.outer.visible = true; poseReset(mom, t); mom.outer.position.set(1.2, 0.95, -2.2); mom.outer.rotation.y = 0.5; mom.face(t > ARGUE + 3.6 ? 'laugh' : 'neutral', t); }
  aura(auras.room, headOf(hero), t, 1); }
function curveExtras(t) { aura(auras.curve, headOf(hero), t, smooth(CURVE + 5, CURVE + 6, t)); }
// hide every aura except the current scene's
function extras(id, t) { Object.values(auras).forEach(A => A.forEach(a => a.s.visible = false)); bolts.forEach(B => B.forEach(m => m.visible = false));
  if (id !== 'room') hero.phone.visible = false; if (id === 'argue' || id === 'joke') hideRoomExtras();
  if (id === 'open') shopExtras(t, 'open'); else if (id === 'door') shopExtras(t, 'end'); else if (id === 'test') classExtras(t); else if (id === 'books' || id === 'bulb') libExtras(t, id);
  else if (id === 'talk' || id === 'argue' || id === 'joke') talkExtras(t, id === 'argue' ? 'argue' : 'talk'); else if (id === 'curve') curveExtras(t); else if (id === 'room') { fr3.outer.visible = fr4.outer.visible = false; snacks.visible = false; aura(auras.room, headOf(hero), t, 1); } }
// =================== NEW BEATS (fast-cut version): the Rubik's cube solved with one look, a flood of "help me" texts, chess vs a grandmaster, the joke nobody gets ===================
hero.phone = makePhone(); hero.elbows[1].add(hero.phone); hero.phone.visible = false;
// ---- the cube: 27 cubelets; the stickers go from scrambled to solved, the cube spins in your hands ----
const RUB_C = ['#e8303a', '#f28a2a', '#f4f4f2', '#f2d030', '#30a050', '#2f6ad8'];   // +x -x +y -y +z -z
const rubik = new THREE.Group(); room.add(rubik); const cubelets = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
  const mats = [0, 1, 2, 3, 4, 5].map(f => { const out = [x === 1, x === -1, y === 1, y === -1, z === 1, z === -1][f]; return new THREE.MeshStandardMaterial({ color: out ? RUB_C[f] : '#111114', roughness: 0.4 }); });
  const m = new THREE.Mesh(BOX, mats); m.scale.setScalar(0.031); m.position.set(x * 0.033, y * 0.033, z * 0.033); rubik.add(m); cubelets.push({ m, mats, scr: [0, 1, 2, 3, 4, 5].map(f => RUB_C[Math.floor(hash(cubelets.length * 6 + f + 0.5) * 6)]), x, y, z }); }
function setRubik(k) {   // k = 0 scrambled … 1 solved (stickers flip to their right colours one by one)
  cubelets.forEach((c, i) => c.mats.forEach((mt, f) => { const out = [c.x === 1, c.x === -1, c.y === 1, c.y === -1, c.z === 1, c.z === -1][f]; if (!out) return; mt.color.set(hash(i * 13 + f) < k ? RUB_C[f] : c.scr[f]); })); }
const chessGrp = new THREE.Group(); room.add(chessGrp);
{ bx(0.9, 0.05, 0.9, '#6a4a30', 0, 0.72, 0, chessGrp); for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) bx(0.05, 0.72, 0.05, '#5a3a24', x, 0.36, z, chessGrp);
  const boardT = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#7a5a3a' : '#e8d8b8'; g.fillRect(i * 32, j * 32, 32, 32); } });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), new THREE.MeshStandardMaterial({ map: boardT, roughness: 0.7 })); bd.rotation.x = -Math.PI / 2; bd.position.y = 0.752; chessGrp.add(bd); }
const PIECES = []; function piece(col, kind, i, j) { const g = new THREE.Group(), m = M(col, { roughness: 0.4 }); const base = mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.02, 12), m); base.position.y = 0.01; g.add(base);
  const body = mesh(new THREE.CylinderGeometry(0.013, 0.02, kind === 'K' ? 0.08 : kind === 'Q' ? 0.07 : 0.045, 12), m); body.position.y = kind === 'p' ? 0.035 : 0.05; g.add(body); const top = mesh(new THREE.SphereGeometry(kind === 'p' ? 0.014 : 0.017, 10, 8), m); top.position.y = kind === 'K' ? 0.1 : kind === 'Q' ? 0.09 : 0.06; g.add(top);
  g.position.set(-0.245 + i * 0.07, 0.752, -0.245 + j * 0.07); chessGrp.add(g); const P = { g, i, j }; PIECES.push(P); return P; }
['R', 'p', 'K', 'p', 'Q', 'p'].forEach((k, n) => piece('#f4f0e8', k, [0, 3, 4, 5, 3, 6][n], [7, 6, 7, 6, 7, 6][n])); const wQ = PIECES[4];
['R', 'p', 'K', 'p', 'p', 'B'].forEach((k, n) => piece('#2a2a2e', k, [0, 2, 4, 5, 6, 2][n], [0, 1, 0, 1, 1, 0][n])); const bK = PIECES[8];
chessGrp.position.set(0.9, 0, 0.6);
const gm = makeBlock({ skin: '#e2ae86', hair: '#c8c8c8', top: '#3a3a40', collar: '#f4f4f4', bottom: '#2a2a2e', hairStyle: 'bald', glasses: '#2a2420', mustache: '#c8c8c8' }); room.add(gm.outer);
// ---- per-beat updates in the living room ----
function hideRoomExtras() { desk.visible = false; bills.visible = false; rubik.visible = false; chessGrp.visible = false; gm.outer.visible = false; hero.phone.visible = false; }
function updateRubik(t) { updateTalk(t, 'argue'); [sib, mom].forEach(p => p.outer.visible = false); hideRoomExtras(); const P = hero; poseReset(P, t); seatAt(P, -1.0, 0.42, -1.3, 0); P.root.rotation.x = -0.05;
  P.arms.forEach((a, i) => a.rotation.set(-0.75, 0, i ? 0.25 : -0.25)); P.elbows.forEach(e => e.rotation.x = -1.0); rubik.visible = true; P.outer.updateMatrixWorld(true); const h = headOf(P);
  const k = smooth(RUBIK + 3.0, RUBIK + 4.6, t); setRubik(k); rubik.position.copy(h).add(V3(0, -0.42 + 0.25 * smooth(RUBIK + 5.4, RUBIK + 6.0, t), 0.3)); rubik.rotation.set(t * 0.5 + k * 9, t * 0.7 + k * 11, 0); rubik.scale.setScalar(1 + 0.6 * smooth(RUBIK + 5.4, RUBIK + 6.0, t));
  if (t > RUBIK + 5.4) { P.arms[1].rotation.set(-2.2, 0, -0.1); P.elbows[1].rotation.x = -0.4; }
  P.face(t < RUBIK + 2.4 ? 'reading' : t < RUBIK + 3.0 ? 'squint' : 'smirk', t); }
function updateNotif(t) { updateTalk(t, 'argue'); [sib, mom].forEach(p => p.outer.visible = false); hideRoomExtras(); const P = hero; poseReset(P, t); P.outer.position.set(2.6, 0.95, -1.3); P.outer.rotation.y = 0.5; holdPhone(P, t, 'near');
  P.face(t < NOTIF + 1.0 ? 'neutral' : t < NOTIF + 2.2 ? 'surprised' : 'sleepy', t); }
function updateChess(t) { updateTalk(t, 'argue'); [sib, mom].forEach(p => p.outer.visible = false); hideRoomExtras(); chessGrp.visible = true; const P = hero; poseReset(P, t); seatAt(P, 0.9, 0.47, 0.12, 0);
  P.arms[1].rotation.set(-1.0 - 0.25 * smooth(CHESS + 0.6, CHESS + 1.0, t) * (1 - smooth(CHESS + 1.6, CHESS + 2.0, t)), 0, -0.1); P.elbows[1].rotation.x = -0.6;
  const mv = smooth(CHESS + 0.8, CHESS + 1.6, t); wQ.g.position.set(-0.245 + lerp(3, 4, mv) * 0.07, 0.752 + 0.06 * Math.sin(Math.PI * mv), -0.245 + lerp(7, 1, mv) * 0.07);   // queen up the board: checkmate
  bK.g.rotation.z = 1.4 * smooth(CHESS + 2.6, CHESS + 3.0, t); bK.g.position.y = 0.752 + 0.01 * smooth(CHESS + 2.6, CHESS + 3.0, t);   // the black king tips over
  P.face(t < CHESS + 0.8 ? 'smirk' : t < CHESS + 2.4 ? 'squint' : 'smirk', t);
  gm.outer.visible = true; poseReset(gm, t); seatAt(gm, 0.9, 0.47, 1.1, Math.PI); gm.arms.forEach(a => a.rotation.set(-0.8, 0, 0)); gm.elbows.forEach(e => e.rotation.x = -0.8); gm.face(t < CHESS + 1.6 ? 'reading' : t < CHESS + 2.6 ? 'surprised' : 'crying', t + 0.5); }
function updateJoke(t) { updateTalk(t, 'talk'); hideRoomExtras(); hero.face(t < TALK + 2.6 ? 'laugh' : t < TALK + 4.0 ? 'neutral' : 'sad', t); fr1.face(t < TALK + 2.4 ? 'neutral' : 'squint', t); fr2.face('worried', t + 1);
  if (t > TALK + 3.0) { const k = smooth(TALK + 3.0, TALK + 4.0, t); fr1.outer.rotation.y = lerp(-0.7, 2.2, k); fr2.outer.rotation.y = lerp(0.7, -2.4, k); hero.arms.forEach(a => a.rotation.set(0, 0, 0)); } }
// ---- MONTH 6: rich — the chart only you can read, a laptop, cash stacks, money raining down ----
const desk = new THREE.Group(); room.add(desk); desk.position.set(-0.2, 0, 0.6);
{ bx(1.1, 0.05, 0.6, '#6a4a30', 0, 0.74, 0, desk); for (const [x, z] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) bx(0.05, 0.74, 0.05, '#5a3a24', x, 0.37, z, desk); }
const chartCv = document.createElement('canvas'); chartCv.width = 320; chartCv.height = 200; const chartTex = new THREE.CanvasTexture(chartCv); chartTex.colorSpace = THREE.SRGBColorSpace;
function drawChart(k) { const g = chartCv.getContext('2d'); g.fillStyle = '#0c1420'; g.fillRect(0, 0, 320, 200); g.strokeStyle = '#1e2e44'; g.lineWidth = 1; for (let y = 20; y < 200; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke(); }
  g.strokeStyle = '#30e070'; g.lineWidth = 5; g.beginPath(); const n = Math.max(2, Math.floor(60 * k)); for (let i = 0; i < n; i++) { const x = 10 + i * 5, y = 170 - 150 * Math.pow(i / 60, 2.2) - 12 * Math.sin(i * 1.7) * (1 - i / 60); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.fillStyle = '#30e070'; g.font = 'bold 30px Inter, sans-serif'; g.fillText('+' + Math.round(9000 * k * k) + '%', 190, 40); chartTex.needsUpdate = true; }
const lap = new THREE.Group(); lap.position.set(0, 0.765, -0.05); desk.add(lap); { bx(0.36, 0.02, 0.25, '#b8bcc4', 0, 0.01, 0, lap); const lid = grp(0, 0.02, 0.12, 0, lap); lid.rotation.x = 0.25; bx(0.36, 0.24, 0.015, '#b8bcc4', 0, 0.12, 0, lid);
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.21), new THREE.MeshBasicMaterial({ map: chartTex, color: new THREE.Color(1.4, 1.4, 1.4) })); sc.position.set(0, 0.12, -0.009); sc.rotation.y = Math.PI; lid.add(sc); }
const stacks = Array.from({ length: 12 }, (_, i) => bx(0.15, 0.04, 0.07, '#5aa86a', (i % 4 - 1.5) * 0.17 + 0.28 * (i % 2 ? 1 : -1) * 0, 0.785 + Math.floor(i / 4) * 0.042, 0.18, desk));
stacks.forEach((b, i) => { b.position.x = -0.42 + (i % 3) * 0.16 + (i >= 6 ? 0.56 : 0); b.position.y = 0.785 + Math.floor((i % 6) / 3) * 0.042; });
const billM = new THREE.MeshStandardMaterial({ color: '#8ac88a', side: THREE.DoubleSide, roughness: 0.8 }); const BILLS = 140; const bills = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 0.065), billM, BILLS); bills.frustumCulled = false; room.add(bills);
const B0 = Array.from({ length: BILLS }, () => [R(-1.4, 1.2), R(0, 3), R(-0.4, 1.8), R(0.4, 0.9), R(0, 6)]);
function updateRich(t) { updateTalk(t, 'argue'); [sib, mom].forEach(p => p.outer.visible = false); hideRoomExtras(); desk.visible = true; const P = hero; poseReset(P, t); seatAt(P, -0.2, 0.47, 0.18, 0);
  const k = smooth(RICH + 0.3, RICH + 2.4, t); drawChart(k); P.arms.forEach((a, i) => a.rotation.set(-0.95, 0, i ? 0.15 : -0.15)); P.elbows.forEach(e => e.rotation.x = -0.5 - 0.15 * Math.max(0, Math.sin(t * 8 + 1)));
  const rain = smooth(RICH + 2.4, RICH + 2.8, t); stacks.forEach((b, i) => b.visible = i < Math.floor(12 * smooth(RICH + 1.0, RICH + 2.6, t)));
  if (t > RICH + 2.6) { P.arms.forEach((a, i) => a.rotation.set(-2.7, 0, i ? -0.35 : 0.35)); P.elbows.forEach(e => e.rotation.x = -0.3); }   // arms up
  const o = new THREE.Object3D(); B0.forEach(([x, y0, z, sp, ph], i) => { const y = wrapR(y0 - (t - RICH) * sp * 1.4, -0.2, 3); o.position.set(x, rain > 0.01 ? y : -5, z); o.rotation.set(t * 2 + ph, ph + t * 1.3, Math.sin(t * 3 + ph) * 0.6); o.updateMatrix(); bills.setMatrixAt(i, o.matrix); }); bills.instanceMatrix.needsUpdate = true; bills.visible = rain > 0.01;
  P.face(t < RICH + 1.2 ? 'squint' : t < RICH + 2.6 ? 'smirk' : 'laugh', t); }
// =================== FAST CUTS: a new shot every 2–3 s; timeline HUD (SECOND 1 → YEAR 1), big stat pop-ups, captions that pop word by word ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy, fov);
const H_ = P => headOf(P);
// [start, scene, camera, update(t), framing(t) -> F, extras key]
const SHOTS = [
  [0.0, shop, () => spCam, t => updateShop(t, 'open'), t => fr(V3(0.05, H_(hero).y, Math.max(H_(hero).z, 0.4)), V3(0.15, -0.02, -1), lerp(3.6, 3.0, t / 1.9), 0.58), 'open'],
  [1.9, shop, () => spCam, t => updateShop(t, 'open'), t => fr(H_(hero), V3(0.1, 0.0, -1), lerp(1.5, 1.25, (t - 1.9) / 1.1), 0.56), 'open'],
  [3.0, shop, () => spCam, t => updateShop(t, 'open'), t => fr(H_(hero), V3(-0.25, -0.18, -1), lerp(1.2, 1.6, (t - 3) / 1.4), 0.5, 46), 'open'],
  [4.4, shop, () => spCam, t => updateShop(t, 'open'), t => fr(H_(hero), V3(0.45 + 0.2 * (t - 4.4), 0.12, -1), 3.3, 0.6, 46), 'open'],
  [CURVE, curve, () => cvCam, updateCurve, t => fr(V3(-0.5, 1.0, -1.0), V3(0.05, 1.2, 1), lerp(8, 7, (t - CURVE) / 2.6), 0.5, 46), 'curve'],
  [CURVE + 2.6, curve, () => cvCam, updateCurve, t => fr(V3(iqX(lerp(125, 240, smooth(CURVE + 2.6, CURVE + 5.0, t))), 1.3, -1.6), V3(0.25, 0.1, 1), 3.2, 0.5, 46), 'curve'],   // the markers slide past: 130, 145, 160, 228
  [CURVE + 5.0, curve, () => cvCam, updateCurve, t => fr(H_(hero), V3(0.25, 0.08, 1), lerp(3.0, 2.2, (t - CURVE - 5) / 3), 0.6), 'curve'],
  [TEST, cls, () => clCam, updateClass, t => fr(H_(hero), V3(0.2, 0.35, -1), lerp(1.7, 1.45, (t - TEST) / 2.4), 0.66), 'test'],
  [TEST + 2.4, cls, () => clCam, updateClass, t => fr(H_(hero), V3(-0.5, 0.15, -1), lerp(3.4, 3.0, (t - TEST - 2.4) / 2.6), 0.55, 46), 'test'],
  [TEST + 5.0, cls, () => clCam, updateClass, t => fr(H_(teacher), V3(-0.6, 0.0, -1), lerp(1.9, 1.6, (t - TEST - 5) / 3), 0.6), 'test'],
  [RUBIK, room, () => rmCam, updateRubik, t => fr(rubik.position, V3(0.2, 0.25, 1), lerp(0.7, 0.55, (t - RUBIK) / 2.6), 0.62), 'room'],
  [RUBIK + 2.6, room, () => rmCam, updateRubik, t => fr(H_(hero), V3(-0.2, 0.05, 1), lerp(1.8, 1.5, (t - RUBIK - 2.6) / 2.6), 0.6), 'room'],
  [RUBIK + 5.2, room, () => rmCam, updateRubik, t => fr(H_(hero), V3(0.35, 0.12, 1), lerp(2.4, 2.8, (t - RUBIK - 5.2) / 2.8), 0.62), 'room'],
  [ARGUE, room, () => rmCam, t => updateTalk(t, 'argue'), t => fr(H_(sib), V3(-0.3, 0.1, 1), lerp(1.8, 1.5, (t - ARGUE) / 3.2), 0.6), 'argue'],
  [ARGUE + 3.2, room, () => rmCam, t => updateTalk(t, 'argue'), t => fr(H_(hero), V3(0.4, 0.05, 1), lerp(1.7, 1.5, (t - ARGUE - 3.2) / 1.9), 0.6), 'argue'],
  [ARGUE + 5.1, room, () => rmCam, t => updateTalk(t, 'argue'), t => fr(V3(2.0, 1.4, -0.5), V3(0.2, 0.25, 1), 4.2, 0.55, 46), 'argue'],
  [NOTIF, room, () => rmCam, updateNotif, t => fr(H_(hero), V3(0.3, 0.05, 1), lerp(2.2, 1.8, (t - NOTIF) / 3.6), 0.68), 'room'],
  [CHESS, room, () => rmCam, updateChess, t => fr(V3(0.9, 0.8, 0.6), V3(-0.6, 1.0, 0.3), lerp(1.1, 0.9, (t - CHESS) / 2.2), 0.5), 'room'],
  [CHESS + 2.2, room, () => rmCam, updateChess, t => fr(H_(gm), V3(0.3, 0.05, -1), lerp(1.5, 1.3, (t - CHESS - 2.2) / 2.2), 0.6), 'room'],
  [RICH, room, () => rmCam, updateRich, t => fr(H_(hero), V3(-0.25, 0.1, 1), lerp(2.0, 1.7, (t - RICH) / 2.4), 0.68), 'room'],
  [RICH + 2.4, room, () => rmCam, updateRich, t => fr(H_(hero), V3(0.2, 0.12, 1), lerp(2.2, 2.9, (t - RICH - 2.4) / 2.6), 0.6, 46), 'room'],
  [TALK, room, () => rmCam, updateJoke, t => fr(H_(hero).lerp(H_(fr1), 0.5), V3(0.12, 0.08, 1), 3.3, 0.6), 'joke'],
  [TALK + 3.0, room, () => rmCam, updateJoke, t => fr(H_(hero), V3(-0.25, 0.05, 1), lerp(1.8, 1.4, (t - TALK - 3) / 3), 0.62), 'joke'],
  [DOOR, shop, () => spCam, t => updateShop(t, 'end'), t => fr(V3(0.05, H_(hero).y, Math.max(H_(hero).z, 0.4)), V3(-0.2, 0.05, -1), lerp(4.2, 3.4, (t - DOOR) / 2.3), 0.58, 46), 'door'],
  [DOOR + 2.3, shop, () => spCam, t => updateShop(t, 'end'), t => fr(H_(hero), V3(0.12, -0.05, -1), 1.3, 0.55), 'door'],
  [DOOR + 4.0, shop, () => spCam, t => updateShop(t, 'end'), t => fr(H_(hero), V3(-0.15, 0.03, -1), lerp(2.2, 2.6, (t - DOOR - 4) / 5), 0.6), 'door']];
function shootShot(S, t, rt) { const [, scene, cam, upd, frm, key] = S; upd(t); extras(key, t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'hud', 'flash', 'sb1', 'sb2', 'tl', 'tlBar', 'tlT', 'tlV', 'pop', 'card'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if your <span class="hl">IQ</span><br>jumped to 500?'; el.endT.innerHTML = 'What if your <span class="hl">IQ</span> jumped to 500?';
el.endS.innerHTML = 'AN IQ OF 500 IS SO RARE<br>THAT NO HUMAN HAS EVER HAD IT.<br>REAL TESTS STOP AT ~160.<br>THE HIGHEST EVER LISTED: 228.';
const captions = [
  [4.4, 5.9, 'Your IQ just hit 500.'],
  [6.3, 9.8, '100 is average.'], [10.1, 13.8, '500 is 1 in 10¹⁵⁶. No human has ever had it.'],
  [14.3, 17.8, 'Real IQ tests stop at about 160.'], [18.1, 21.8, 'The highest ever listed: 228. You’re off the chart.'],
  [22.3, 25.8, 'A Rubik’s cube?'], [26.1, 29.8, 'One look. Solved.'],
  [30.3, 33.8, 'You win every argument —'], [34.1, 37.8, '— in one sentence.'],
  [38.3, 41.3, 'Everyone needs your help.'], [41.8, 45.8, 'A grandmaster? Checkmate in one move.'],
  [RICH + 0.3, RICH + 2.4, 'You see patterns nobody else sees.'], [RICH + 2.6, RICH + 4.8, 'Month 6: you’re a millionaire.'],
  [TALK + 0.3, TALK + 3.2, 'But nobody gets your jokes.'], [TALK + 3.4, TALK + 5.8, 'It’s lonely at 500.'],
  [DOOR + 0.4, DOOR + 2.3, 'And some things'], [DOOR + 2.4, DOOR + 5.8, 'no IQ can fix.'],
  [CTA + 0.2, CTA + 2.9, 'What would you do first? 👇'],
];
const TIMELINE = [[0, 'SECOND 1'], [CURVE, 'MINUTE 1'], [TEST, 'HOUR 1'], [RUBIK, 'DAY 1'], [ARGUE, 'WEEK 1'], [NOTIF, 'MONTH 1'], [RICH, 'MONTH 6'], [TALK, 'YEAR 1'], [DOOR, 'EVERY DAY']];
const POPS = [[11.0, 13.7, '1 in 10¹⁵⁶'], [14.3, 17.6, '≈160'], [18.1, 21.6, '228'], [26.1, 29.6, '1 LOOK'], [41.8, 45.6, '1 MOVE'], [RICH + 2.6, RICH + 4.8, '$1,000,000']];
const BUBBLES = [[ARGUE + 0.4, ARGUE + 3.2, () => sib, 'It’s MY turn to pick the movie!'], [ARGUE + 3.3, ARGUE + 5.1, () => hero, 'You picked last Friday. And the one before.'],
  [TALK + 0.4, TALK + 3.0, () => hero, '…and THAT’S why the integral diverged! 😂'], [TALK + 2.4, TALK + 3.0, () => fr1, '…what?']];
const NOTES = [['Mom', 'how do i turn off caps lock'], ['Boss', 'can u fix the budget by 5'], ['Neighbor', 'whats 15% of $84.50'], ['Sam', 'help w my homework??'], ['Grandpa', 'the TV says NO SIGNAL'], ['Group chat', 'settle this: is a hot dog a sandwich'], ['Unknown', 'Hi! Are you the genius?'], ['Mom', 'never mind i turned the computer off']];
const scr = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
const popWords = (txt, t, a, b) => { const ws = txt.split(' '), span = Math.min(1.2, (b - a) * 0.4); return ws.map((w, i) => { const k = clamp((t - a - i * span / ws.length) / 0.12, 0, 1); return `<span style="display:inline-block;opacity:${k.toFixed(2)};transform:scale(${(0.6 + 0.4 * k + 0.1 * Math.sin(Math.PI * k)).toFixed(3)})">${w}</span>`; }).join(' '); };
const popStyle = (t, at) => { const k = clamp((t - at) / 0.2, 0, 1); return `transform:scale(${(0.7 + 0.3 * k).toFixed(3)});opacity:${k.toFixed(2)};transform-origin:50% 0`; };
function updateDOM(t, cam) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t); el.hud.style.opacity = 0;
  // timeline HUD: YOUR IQ bar + the time label
  el.tl.style.opacity = smooth(0.3, 0.7, t) * (1 - smooth(T_END - 0.4, T_END, t)); const roll = clamp((t - POP) / 0.5, 0, 1), iq = t < POP ? 100 : Math.round(100 + 400 * roll * roll);
  el.tlV.textContent = iq; el.tlV.style.color = t > POP ? '#ffd060' : '#ffffff'; el.tlBar.style.width = (20 + 80 * (iq - 100) / 400) + '%'; el.tlT.textContent = [...TIMELINE].reverse().find(([a]) => t >= a)[1];
  el.flash.style.opacity = Math.exp(-Math.pow((t - POP - 0.05) / 0.12, 2)) * 0.85;
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.textContent = pp ? pp[2] : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0; el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  [el.sb1, el.sb2].forEach(b => b.style.opacity = 0); let k = 0;
  for (const [a, b, who, txt] of BUBBLES) { if (t < a || t >= b || k > 1) continue; const box = k ? el.sb2 : el.sb1; k++; const [x, y] = scr(headOf(who()).add(V3(0, 0.36, 0)), cam);
    box.textContent = txt; box.style.left = clamp(x, 300, 780) + 'px'; box.style.top = clamp(y, 470, 1300) + 'px'; box.style.opacity = fadeWin(t, a, b, 0.15); box.style.transform = `translate(-50%,-100%) scale(${(0.8 + 0.2 * smooth(a, a + 0.15, t)).toFixed(3)})`; }
  // the "help me" flood (month 1)
  if (t >= NOTIF + 0.6 && t < CHESS) { const n = Math.min(NOTES.length, Math.floor((t - NOTIF - 0.6) / 0.38) + 1); el.card.style.opacity = 1;
    el.card.innerHTML = `<div class="hd ls"><span>Your phone</span></div><div class="bd">` + NOTES.slice(0, n).reverse().slice(0, 5).map(([who, msg], i) => `<div class="nt"${i === 0 ? ` style="${popStyle(t, NOTIF + 0.6 + (n - 1) * 0.38)}"` : ''}><b class="av">${who[0]}</b><div><div class="nh"><span>${who}</span><i>now</i></div><div class="nb">${msg}</div></div></div>`).join('') + '</div>'; }
  else if (t >= RICH + 0.2 && t < RICH + 2.5) { const k = smooth(RICH + 0.3, RICH + 2.4, t), n = Math.max(2, Math.floor(60 * k)); let d = '';
    for (let i = 0; i < n; i++) { const x = 10 + i * 10, y = 330 - 300 * Math.pow(i / 60, 2.2) - 20 * Math.sin(i * 1.7) * (1 - i / 60); d += (i ? 'L' : 'M') + x.toFixed(0) + ' ' + y.toFixed(0); }
    el.card.style.opacity = smooth(RICH + 0.2, RICH + 0.4, t); el.card.innerHTML = `<div class="hd dp"><span>Your portfolio</span><em>THE PATTERN NOBODY ELSE SEES</em></div><div class="bd" style="background:#0c1420"><svg viewBox="0 0 640 350" width="640" height="350"><path d="${d}" stroke="#30e070" stroke-width="8" fill="none" stroke-linejoin="round"/></svg><div style="font-size:64px;font-weight:600;color:#30e070;text-align:right">+${Math.round(9000 * k * k).toLocaleString('en-US')}%</div></div>`; }
  else el.card.style.opacity = 0;
  const cp = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? popWords(cp[2], t, cp[0], cp[1]) : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.2) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { const S = SHOTS[i]; S[3](t); extras(S[5], t); applyF(S[2](), S[4](t)); updateDOM(t, S[2]()); return true; }   // text pass: no 3D, just pose + camera for the bubbles
  // hard cuts inside a beat; a short 0.25 s dissolve when the place changes
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.25, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t, S[2]()); return true;
};
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, fr1, fr2, fr3, fr4, sib, teacher, mom, gm, ...mates, ...mates2, ...walkers.map(w => w.p)]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
