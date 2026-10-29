import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What happens if you drink an energy drink every day?" (≈67 s, US, reply to @VIOLET's comment): one 16 oz can a day — the crack + the jolt,
// heart rate up (X-ray body), 13 tsp of sugar, the crash + the second can, 40 mg still in you at 2 am, enamel, withdrawal headache, a year = 43 lb of sugar + $1,095,
// 20,783 ER visits (2011), and the real fix: sleep. Numbers: tools/energy_math.py; sources in the chat (Shah 2019 JAHA, SAMHSA DAWN, Jain 2012, AASM).
// =================== timeline ===================
const CRACK = 1.8, MIN30 = 4.0, HOUR1 = 9.0, HOUR4 = 15.0, NIGHT = 21.0, WEEK = 28.0, MONTH = 34.0, YEAR = 40.0, ER = 47.0, SLEEP = 54.0, CTA = 61.0, T_END = 64.0;
const B1 = 4.0, B2 = 12.0, B3 = 20.0, B4 = 28.0, B5 = 36.0, B6 = 44.0, TW = 52.0, REP = 58.0;   // used by the shared family sets
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 160;
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
  wired:     { eye: 'wide', brow: [0, 0.07], mouth: 'grin', extra: ['sweat'] },                // jittery after the can
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
// =================== THE CAST: you (the low-poly human she approved: faceted head with drawn emotions, oversized tee, jeans) ===================
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 });   // low-poly human: charcoal oversized tee, jeans
room.add(hero.outer); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false;
const camKey = new THREE.PointLight(0xfff0e0, 1.4, 6, 1.2); rmCam.add(camKey); room.add(rmCam);   // a soft key light riding with the camera: faces never go dark against the window
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); }
function seatAt(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
// ---- the can (no brand: a black can with a green bolt) ----
const canT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#16161a'; g.fillRect(0, 0, w, h); g.fillStyle = '#5aff7a'; g.beginPath(); g.moveTo(140, 30); g.lineTo(80, 140); g.lineTo(128, 140); g.lineTo(100, 230); g.lineTo(180, 110); g.lineTo(132, 110); g.closePath(); g.fill(); g.fillStyle = '#c8c8d0'; g.font = 'bold 30px Inter, sans-serif'; g.fillText('ENERGY', 70, 255 - 6); });
function makeCan() { const c = new THREE.Group(); const b = mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.16, 20), [new THREE.MeshStandardMaterial({ map: canT, roughness: 0.35, metalness: 0.4 }), M('#c8c8d0', { metalness: 0.7, roughness: 0.3 }), M('#c8c8d0', { metalness: 0.7, roughness: 0.3 })]); b.position.y = 0.08; c.add(b); return c; }
const can = makeCan(); hero.elbows[1].add(can); can.position.set(0, -0.3, 0.04); can.rotation.x = -1.4;
const can2 = makeCan(); room.add(can2);
const fizz = makeSmoke(room, 80);
// ---- the kitchen counter props: the sugar (13 teaspoons) and a year of it (11 bags) ----
const SPOONS = Array.from({ length: 13 }, (_, i) => { const g = new THREE.Group(); bx(0.012, 0.004, 0.13, '#d8d8e0', 0, 0, -0.05, g, { metalness: 0.6, roughness: 0.3 }); const bowl = mesh(new THREE.SphereGeometry(0.022, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M('#ffffff', { roughness: 0.9 })); bowl.scale.y = 0.6; bowl.position.set(0, 0.004, 0.035); g.add(bowl); room.add(g); return g; });
const sugarPile = mesh(new THREE.ConeGeometry(0.16, 0.12, 18), M('#fbfbf6', { roughness: 1 })); room.add(sugarPile);
const BAGS = Array.from({ length: 11 }, (_, i) => { const g = new THREE.Group(); bx(0.26, 0.36, 0.14, '#f4f0e6', 0, 0.18, 0, g); bx(0.262, 0.08, 0.142, '#2f6ad8', 0, 0.22, 0, g); room.add(g); return g; });
const cash = Array.from({ length: 8 }, (_, i) => bx(0.15, 0.03, 0.07, '#5aa86a', 0, 0, 0, room));
// ---- the bed (left corner) + a wall clock that can read 2:00 ----
const bed = new THREE.Group(); room.add(bed); bed.position.set(-2.9, 0, 1.3);
{ bx(1.1, 0.35, 2.0, '#6a4a34', 0, 0.18, 0, bed); bx(1.04, 0.16, 1.92, '#f2f0ec', 0, 0.43, 0, bed); bx(1.1, 0.8, 0.08, '#6a4a34', 0, 0.55, -1.0, bed); bx(0.55, 0.1, 0.3, '#ffffff', 0, 0.56, -0.78, bed); }
const duvet = bx(1.08, 0.2, 1.25, '#5a7ab0', 0, 0.8, 0.38, bed);   // covers you up to the chest
const clkCv = document.createElement('canvas'); clkCv.width = 256; clkCv.height = 96; const clkTex = new THREE.CanvasTexture(clkCv); clkTex.colorSpace = THREE.SRGBColorSpace;
function drawClock(txt) { const g = clkCv.getContext('2d'); g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff5a4a'; g.font = 'bold 70px Inter, monospace'; g.textAlign = 'center'; g.fillText(txt, 128, 74); clkTex.needsUpdate = true; }
{ const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: clkTex, color: new THREE.Color(1.6, 1.6, 1.6) })); ck.position.set(-3.93, 0.75, 0.15); ck.rotation.y = Math.PI / 2; room.add(ck); bx(0.3, 0.5, 0.3, '#6a4a30', -3.75, 0.25, 0.15, room); }
// ---- headache rings ----
const RINGS = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.3, 0.25), transparent: true, depthWrite: false })); room.add(r); return r; });
const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); }), transparent: true, depthWrite: false })); zzz.scale.setScalar(0.3); room.add(zzz);
function hideProps() { SPOONS.forEach(s => s.visible = false); sugarPile.visible = false; BAGS.forEach(b => b.visible = false); cash.forEach(c => c.visible = false); RINGS.forEach(r => r.visible = false); zzz.visible = false; can.visible = false; can2.visible = false; }
// ---- home beats ----
function updateHome(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); hideProps(); const P = hero; poseReset(P, t); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false;
  const look = { night: 'night', sleep: t < SLEEP + 3.2 ? 'night' : 'day', month: 'eve' }[mode] || 'day'; lightRoom(look); camKey.intensity = look === 'night' ? 0.5 : 1.4; fizz.begin(); smokeMat.uniforms.uTint.value.set('#e8f4e8');
  if (mode === 'open') {   // tired, the crack, the gulp, eyes snap open
    P.outer.position.set(2.75, 0.95, -1.3); P.outer.rotation.y = 0.3; can.visible = true; const drink = smooth(CRACK + 0.3, CRACK + 0.8, t) * (1 - smooth(CRACK + 1.5, CRACK + 1.9, t));
    const ax = lerp(-0.9, -1.45, drink), ex = lerp(-1.0, -1.35, drink); P.arms[1].rotation.set(ax, 0, lerp(-0.35, -0.55, drink)); P.elbows[1].rotation.x = ex; can.rotation.x = lerp(0, -1.9, drink) - ax - ex;   // can in front of the chest (upright) -> tipped at the mouth
    if (t > CRACK && t < CRACK + 1.0) { P.outer.updateMatrixWorld(true); const top = can.localToWorld(V3(0, 0.17, 0)); for (let k = 0; k < 20; k++) { const u = ((t - CRACK) * 2 + k / 20) % 1; fizz.add(top.clone().add(V3(0.02 * Math.sin(k * 3), u * 0.12, 0.02 * Math.cos(k * 2))), 0.012 + u * 0.02, 0.5 * (1 - u)); } }
    P.root.rotation.x = 0.12 * (1 - smooth(CRACK + 1.6, CRACK + 1.9, t)); P.face(t < CRACK ? 'sleepy' : t < CRACK + 1.7 ? 'neutral' : 'wired', t); }
  else if (mode === 'sugar') {   // 13 teaspoons of sugar lined up next to the can, then a pile
    P.outer.position.set(2.75, 0.95, -1.3); P.outer.rotation.y = 0.6; P.arms[0].rotation.set(-0.6, 0, -0.2); P.elbows[0].rotation.x = -1.2; P.face(t < HOUR1 + 3 ? 'surprised' : 'worried', t);
    can2.visible = true; can2.position.set(3.15, 0.95, -0.55); const n = Math.min(13, Math.floor((t - HOUR1 - 0.3) / 0.18) + 1);
    SPOONS.forEach((s, i) => { s.visible = i < n; s.position.set(3.3, 0.955, -0.95 + i * 0.065); s.rotation.y = Math.PI / 2 + 0.1 * Math.sin(i); });
    sugarPile.visible = t > HOUR1 + 3.0; sugarPile.position.set(3.2, 0.95 + 0.06 * smooth(HOUR1 + 3, HOUR1 + 3.6, t), -1.55); sugarPile.scale.setScalar(Math.max(0.01, smooth(HOUR1 + 3.0, HOUR1 + 3.6, t))); }
  else if (mode === 'crash') {   // the crash on the couch side: sleepy, reaches for the second can
    seatAt(P, -1.0, 0.42, -1.3, 0); P.root.rotation.x = 0.15; can2.visible = true; const reach = smooth(HOUR4 + 2.6, HOUR4 + 3.8, t); can2.position.set(-1.95, 0.6, -1.55);
    P.arms[0].rotation.set(lerp(-0.2, -1.1, reach), 0, lerp(0, 0.6, reach)); P.elbows[0].rotation.x = -0.3; P.face(t < HOUR4 + 2.6 ? 'sleepy' : 'reading', t);
    if (t > HOUR4 + 3.8) { can2.visible = false; can.visible = true; P.arms[1].rotation.set(-0.6, 0, 0.1); P.elbows[1].rotation.x = -1.3; } }
  else if (mode === 'night') {   // 2 AM: in bed, eyes wide open
    P.outer.position.set(-2.9, 0.72, 1.34); P.outer.rotation.set(-Math.PI / 2, 0, 0); drawClock('2:00'); P.face(t < NIGHT + 4 ? 'surprised' : 'worried', t); }
  else if (mode === 'month') {   // skipped a day: the headache rings
    seatAt(P, -1.0, 0.42, -1.3, 0); P.arms.forEach((a, i) => a.rotation.set(-2.4, 0, i ? -0.5 : 0.5)); P.elbows.forEach(e => e.rotation.x = -1.6); P.face('worried', t);
    P.outer.updateMatrixWorld(true); const hd = headOf(P); RINGS.forEach((r, k) => { const u = ((t * 1.5) + k / 3) % 1; r.visible = true; r.position.copy(hd); r.scale.setScalar(0.7 + 1.4 * u); r.material.opacity = 1 - u; r.lookAt(rmCam.position); }); }
  else if (mode === 'year') {   // a year: 11 bags of sugar stacked up, cash beside them
    P.outer.position.set(1.6, 0.95, -0.7); P.outer.rotation.y = -0.4; P.face(t < YEAR + 2.5 ? 'surprised' : 'worried', t); const n = Math.min(11, Math.floor((t - YEAR - 0.2) / 0.2) + 1);
    BAGS.forEach((b, i) => { b.visible = i < n; const row = i < 5 ? 0 : i < 9 ? 1 : 2, col = i < 5 ? i : i < 9 ? i - 5 : i - 9; b.position.set(2.3 + (col - (row === 0 ? 2 : row === 1 ? 1.5 : 0.5)) * 0.28, row * 0.36, -0.9); b.rotation.y = 0.05 * Math.sin(i * 3); });
    cash.forEach((c, i) => { c.visible = t > YEAR + 3.4; c.position.set(1.05 + (i % 4) * 0.16, 0.02 + Math.floor(i / 4) * 0.032, -0.35); }); }
  else {   // sleep: lights off, the can untouched on the nightstand, sunrise, wakes up happy
    const morning = t > SLEEP + 3.2; P.outer.position.set(-2.9, 0.72, 1.34); P.outer.rotation.set(-Math.PI / 2, 0, 0); drawClock(morning ? '7:30' : '11:00');
    can2.visible = true; can2.position.set(-3.75, 0.5, 0.35); zzz.visible = !morning; zzz.position.copy(headOf(P)).add(V3(0.25, 0.35, 0)); P.face(morning ? 'happy' : 'sleep', t);
    if (morning && t > SLEEP + 4.6) { P.outer.position.set(-2.9, 0.95, 0.5); P.outer.rotation.set(0, 0.6, 0); P.arms.forEach((a, i) => a.rotation.set(0, 0, i ? 2.55 : -2.55)); P.elbows.forEach(e => e.rotation.x = -0.25); P.face('laugh', t); } }
  fizz.end(); }

// =================== THE X-RAY BODY (reworked from the quit-nicotine video, so it is not a copy): amber glow, YOUR round-headed silhouette,
// the heart speeding up, sugar crystals riding the vessels; the camera spirals in from behind ===================
const xr = new THREE.Scene(); xr.background = new THREE.Color('#140a06'); const xCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
xr.add(new THREE.AmbientLight(0xb08a6a, 0.8)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(1, 2, 3); xr.add(k); }
{ const ringT = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,150,60,0.35)'; g.lineWidth = 2; for (let r = 40; r < 256; r += 36) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); } });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; xr.add(floor); }
const ghost = makeBlock({ head: 'human', body: 'human', skin: '#ffffff', hair: '#ffffff', top: '#ffffff', bottom: '#ffffff', shoe: '#ffffff', hairStyle: 'short', headS: 0.88 }); xr.add(ghost.outer); ghost.outer.position.set(0, 0.95, 0); poseIdle(ghost, 0, 0);
const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.55, 0.22), transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
ghost.outer.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
const organs = new THREE.Group(); xr.add(organs);
const heartG = new THREE.Group(); heartG.position.set(0.035, 1.3, 0.04); organs.add(heartG);   // two lobes + a point: a readable heart, not the old ball
{ const hm = M('#e8283a', { emissive: '#7a0a14', roughness: 0.35 }); for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.034, 16, 12), hm); l.position.set(s * 0.024, 0.016, 0); heartG.add(l); } const tip = mesh(new THREE.ConeGeometry(0.05, 0.075, 16), hm); tip.rotation.x = Math.PI; tip.position.y = -0.03; heartG.add(tip); }
const VES = [[[0.035, 1.3, 0.04], [0.0, 1.5, 0.03], [0.0, 1.62, 0.02]], [[0.035, 1.3, 0.04], [0.16, 1.4, 0.02], [0.23, 1.18, 0.0], [0.26, 0.95, 0.02]], [[0.035, 1.3, 0.04], [-0.15, 1.4, 0.02], [-0.23, 1.18, 0.0], [-0.26, 0.95, 0.02]],
  [[0.035, 1.3, 0.04], [0.05, 1.05, 0.04], [0.1, 0.86, 0.02], [0.1, 0.42, 0.03], [0.1, 0.08, 0.05]], [[0.035, 1.3, 0.04], [0.0, 1.05, 0.04], [-0.1, 0.86, 0.02], [-0.1, 0.42, 0.03], [-0.1, 0.08, 0.05]]].map(pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p))));
const vesMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.1), transparent: true, opacity: 0.5 }); for (const c of VES) organs.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.007, 5, false), vesMat));
const CN = 300, cellM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.2, 0.15) }), CN), sugM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.011, 0.011, 0.011), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.2) }), CN);
cellM.frustumCulled = sugM.frustumCulled = false; organs.add(cellM, sugM);
const CL = Array.from({ length: CN }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.007), s: rnd() }));
const bpmAt = t => Math.round(lerp(72, 104, smooth(MIN30 + 0.6, MIN30 + 3.0, t)));
const _o = new THREE.Object3D(), _v = new THREE.Vector3();
function updateXray(t, mode) { const bpm = bpmAt(t), sp = bpm / 72, ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(0, ph - 0.18) * 9) * (ph > 0.18);
  heartG.scale.setScalar(1 + 0.2 * beat); const sugar = mode === 'sugarx' ? smooth(HOUR1 + 3.0, HOUR1 + 4.5, t) : 0;
  CL.forEach((C, i) => { const u = (C.u0 + t * C.sp * sp) % 1; VES[C.v].getPointAt(u, _v).add(C.off); _o.position.copy(_v); _o.rotation.set(t + i, t * 0.7 + i, 0); _o.scale.setScalar(1); _o.updateMatrix(); cellM.setMatrixAt(i, _o.matrix);
    _o.position.add(V3(0.009, 0.005, 0.004)); _o.scale.setScalar(C.s < sugar * 0.8 ? 1 : 0.0001); _o.updateMatrix(); sugM.setMatrixAt(i, _o.matrix); }); cellM.instanceMatrix.needsUpdate = sugM.instanceMatrix.needsUpdate = true; }
// =================== THE TOOTH (week 1): a big molar, acid drips, the enamel dulls and pits ===================
const toothS = new THREE.Scene(); toothS.background = new THREE.Color('#1a0e1a'); const tCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 50);
toothS.add(new THREE.HemisphereLight(0xffe8f0, 0x3a2030, 1.1)); { const k = new THREE.DirectionalLight(0xffffff, 1.8); k.position.set(1, 2, 3); toothS.add(k); }
const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbfaf4'), roughness: 0.25 });
const tooth = new THREE.Group(); toothS.add(tooth); { const crown = mesh(new RoundedBoxGeometry(0.5, 0.42, 0.45, 5, 0.12), enamel); crown.position.y = 0.3; tooth.add(crown); for (const s of [-1, 1]) { const r = mesh(new THREE.ConeGeometry(0.1, 0.42, 10), enamel); r.rotation.x = Math.PI; r.position.set(s * 0.13, -0.08, 0); tooth.add(r); }
  const gum = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.18, 24), M('#e86a7a', { roughness: 0.7 })); gum.position.y = 0.05; tooth.add(gum); }
const pits = Array.from({ length: 22 }, (_, i) => { const p = mesh(new THREE.SphereGeometry(0.02 + 0.02 * hash(i), 8, 6), M('#c8b070', { roughness: 0.9 })); const a = hash(i * 3.1) * Math.PI * 2; p.position.set(Math.cos(a) * 0.2, 0.32 + 0.16 * hash(i * 7.7), Math.sin(a) * 0.19 + 0.04); p.scale.z = 0.4; p.lookAt(p.position.clone().multiplyScalar(2)); tooth.add(p); return p; });
const drops = Array.from({ length: 10 }, (_, i) => { const d = mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: '#b8ff5a', emissive: '#3a6a10', transparent: true, opacity: 0.85, roughness: 0.1 })); d.scale.y = 1.4; toothS.add(d); return d; });
const acidFog = makeSmoke(toothS, 120);
function updateTooth(t) { const k = smooth(WEEK + 1.0, WEEK + 5.5, t); tooth.rotation.y = 0.4 * Math.sin(t * 0.4); enamel.color.set('#fbfaf4').lerp(new THREE.Color('#e4d6a8'), k); enamel.roughness = 0.25 + 0.6 * k;
  pits.forEach((p, i) => { p.visible = hash(i * 1.7) < k; p.scale.setScalar(Math.max(0.01, (k - hash(i * 1.7) * 0.8) * 1.5)); p.scale.z *= 0.4; });
  drops.forEach((d, i) => { const u = ((t - WEEK) * 0.9 + i / 10) % 1; d.position.set(-0.2 + 0.4 * hash(i), 1.2 - u * 0.75, 0.05 + 0.15 * (hash(i * 3) - 0.5)); d.visible = u < 0.95; });
  acidFog.begin(); smokeMat.uniforms.uTint.value.set('#a8e870'); for (let n = 0; n < 40; n++) { const u = ((t * 0.3 + n / 40) % 1); acidFog.add(V3(Math.cos(n * 2.4) * 0.3, 0.5 + u * 0.3, Math.sin(n * 2.4) * 0.3), 0.06 + u * 0.08, 0.2 * (1 - u) * k); } acidFog.end(); }
// =================== THE ER (2011): a cartoon hospital front, a crowd that keeps growing toward 20,783 ===================
const erS = new THREE.Scene(); erS.background = new THREE.Color('#8ab8e8'); const eCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 200); erS.fog = new THREE.Fog(0x8ab8e8, 20, 70);
erS.add(new THREE.HemisphereLight(0xf4f8ff, 0x7a8a6a, 1.1)); { const k = new THREE.DirectionalLight(0xfff0d8, 2.0); k.position.set(4, 8, 6); erS.add(k); }
{ const gr = mesh(new THREE.PlaneGeometry(200, 200), M('#b8b8b0', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; erS.add(gr);
  bx(12, 6, 3, '#f2f0ea', 0, 3, -6, erS); for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) bx(0.9, 0.8, 0.05, '#9ac8e8', -5 + c * 1.4, 1.6 + r * 1.4, -4.47, erS);
  const erT = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#e8303a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = 'bold 62px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('EMERGENCY', w / 2, 70); });
  const er = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshBasicMaterial({ map: erT, color: new THREE.Color(1.4, 1.4, 1.4) })); er.position.set(0, 5.2, -4.45); erS.add(er);
  bx(2.4, 2.4, 0.1, '#5a6a7a', 0, 1.2, -4.45, erS); const amb = new THREE.Group(); bx(2.6, 1.2, 1.1, '#ffffff', 0, 0.9, 0, amb); bx(0.9, 0.9, 1.08, '#ffffff', 1.6, 0.75, 0, amb); bx(2.62, 0.15, 1.12, '#e8303a', 0, 1.0, 0, amb); amb.position.set(4.0, 0, -2.4); erS.add(amb); }
const ERN = 1400, erBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.09, 0.4, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), ERN), erHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), ERN);
erBody.frustumCulled = erHead.frustumCulled = false; erS.add(erBody, erHead);
const ERP = Array.from({ length: ERN }, (_, i) => { const a = i * 2.39996, r = 0.35 * Math.sqrt(i); return [Math.cos(a) * r * 1.4, 2.5 + Math.sin(a) * r * 0.9 * 0.6 + r * 0.3]; });
{ const col = new THREE.Color(); ERP.forEach((_, i) => { erBody.setColorAt(i, col.set(pick(['#e24b3b', '#2f5d8a', '#e0b040', '#4b8b5a', '#7a4a8c', '#f08a4b', '#5aa0c8', '#d46a8a']))); erHead.setColorAt(i, col.set(pick(['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c']))); }); }
function updateER(t) { const n = Math.floor(ERN * smooth(ER + 0.3, ER + 5.5, t)); ERP.forEach(([x, z], i) => { const on = i < n; _o.position.set(x, on ? 0.33 : -5, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); erBody.setMatrixAt(i, _o.matrix); _o.position.y = on ? 0.68 : -5; _o.updateMatrix(); erHead.setMatrixAt(i, _o.matrix); });
  erBody.instanceMatrix.needsUpdate = erHead.instanceMatrix.needsUpdate = true; }
// =================== FAST CUTS (2–3 s): timeline HUD (12 PM → TONIGHT) with an ENERGY bar, stat pop-ups, word-pop captions ===================
// faces sit between the top HUD and the captions (1250 px): fr() lifts the head 0.15 of the frame above the given headY
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const canW = () => { hero.outer.updateMatrixWorld(true); return can.getWorldPosition(V3(0, 0, 0)); };
const heartW = () => heartG.getWorldPosition(V3(0, 0, 0));
const home = m => t => updateHome(t, m);
// [start, scene, camera, update(t), framing(t)]
const SHOTS = [
  [0.0, room, () => rmCam, home('open'), t => framing(H_(hero), V3(0.25, 0.02, 1), lerp(2.0, 1.6, t / 1.6), 0.6)],   // under the title: face low
  [1.6, room, () => rmCam, home('open'), t => framing(H_(hero), V3(-0.5, 0.12, 1), lerp(2.1, 1.85, (t - 1.6) / 1.1), 0.45)],   // the crack
  [2.7, room, () => rmCam, home('open'), t => framing(H_(hero), V3(-0.55, 0.05, 1), lerp(1.45, 1.6, (t - 2.7) / 1.3), 0.55)],   // eyes snap open
  [MIN30, xr, () => xCam, t => updateXray(t, 'x'), t => { const a = lerp(Math.PI * 0.95, 0.35, ease((t - MIN30) / 2.6)); return fr(heartW(), V3(Math.sin(a), 0.15, Math.cos(a)), lerp(2.6, 1.3, ease((t - MIN30) / 2.6)), 0.5); }],   // spirals in from behind
  [MIN30 + 2.6, xr, () => xCam, t => updateXray(t, 'x'), t => fr(heartW(), V3(0.5, 0.15, 1), lerp(0.55, 0.42, (t - MIN30 - 2.6) / 2.4), 0.5)],
  [HOUR1, room, () => rmCam, home('sugar'), t => fr(V3(3.3, 0.96, -0.6), V3(-0.55, 1.1, 0.35), lerp(1.15, 1.0, (t - HOUR1) / 2.4), 0.5)],   // 13 spoons, from above
  [HOUR1 + 2.4, room, () => rmCam, home('sugar'), t => fr(H_(hero), V3(-0.55, 0.05, 1), lerp(1.5, 1.3, (t - HOUR1 - 2.4) / 1.6), 0.6)],
  [HOUR1 + 4.0, xr, () => xCam, t => updateXray(t, 'sugarx'), t => fr(V3(0.18, 1.2, 0.02), V3(0.35, 0.1, 1), lerp(0.75, 0.6, (t - HOUR1 - 4) / 2), 0.5)],   // sugar riding the blood
  [HOUR4, room, () => rmCam, home('crash'), t => fr(H_(hero), V3(0.25, 0.12, 1), lerp(2.6, 2.2, (t - HOUR4) / 2.6), 0.6)],
  [HOUR4 + 2.6, room, () => rmCam, home('crash'), t => fr(H_(hero), V3(-0.45, 0.05, 1), lerp(1.3, 1.15, (t - HOUR4 - 2.6) / 1.4), 0.6)],
  [HOUR4 + 4.0, room, () => rmCam, home('crash'), t => fr(H_(hero), V3(0.5, 0.1, 1), lerp(1.6, 1.9, (t - HOUR4 - 4) / 2), 0.6)],   // the second can
  [NIGHT, room, () => rmCam, home('night'), t => fr(H_(hero), V3(0.05, 1, 0.55), lerp(2.0, 1.6, (t - NIGHT) / 2.5), 0.55)],   // in bed, from above
  [NIGHT + 2.5, room, () => rmCam, home('night'), t => fr(V3(-3.93, 0.75, 0.15), V3(1, 0.1, 0.25), lerp(0.75, 0.6, (t - NIGHT - 2.5) / 1.7), 0.5)],   // 2:00
  [NIGHT + 4.2, room, () => rmCam, home('night'), t => fr(H_(hero), V3(-0.1, 1, 0.4), lerp(1.0, 0.85, (t - NIGHT - 4.2) / 2.8), 0.55)],
  [WEEK, toothS, () => tCam, updateTooth, t => fr(V3(0, 0.32, 0), V3(0.45, 0.3, 1), lerp(2.2, 1.8, (t - WEEK) / 2.8), 0.5)],
  [WEEK + 2.8, toothS, () => tCam, updateTooth, t => fr(V3(0, 0.4, 0.05), V3(-0.3, 0.55, 1), lerp(1.1, 0.95, (t - WEEK - 2.8) / 3.2), 0.5)],
  [MONTH, room, () => rmCam, home('month'), t => fr(H_(hero), V3(0.2, 0.08, 1), lerp(1.9, 1.6, (t - MONTH) / 2.8), 0.6)],
  [MONTH + 2.8, room, () => rmCam, home('month'), t => fr(H_(hero), V3(-0.45, 0.1, 1), lerp(1.3, 1.15, (t - MONTH - 2.8) / 3.2), 0.6)],
  [YEAR, room, () => rmCam, home('year'), t => fr(V3(2.1, 1.15, -0.8), V3(0.25, 0.12, 1), lerp(4.6, 4.2, (t - YEAR) / 2.6), 0.62)],
  [YEAR + 2.6, room, () => rmCam, home('year'), t => fr(H_(hero), V3(-0.3, 0.05, 1), lerp(1.6, 1.4, (t - YEAR - 2.6) / 1.4), 0.6)],
  [YEAR + 4.0, room, () => rmCam, home('year'), t => fr(V3(1.3, 0.1, -0.35), V3(0.15, 0.9, 1), lerp(1.0, 0.85, (t - YEAR - 4) / 3), 0.5)],   // the cash
  [ER, erS, () => eCam, updateER, t => fr(V3(0, 1.2, 0), V3(0.15, 0.5, 1), lerp(15, 12, (t - ER) / 3.4), 0.5, 46)],
  [ER + 3.4, erS, () => eCam, updateER, t => fr(V3(-0.5, 0.8, 2.5), V3(-0.45, 0.2, 1), lerp(5.5, 4.8, (t - ER - 3.4) / 3.6), 0.5, 46)],
  [SLEEP, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(0.05, 1, 0.6), lerp(2.2, 1.8, (t - SLEEP) / 3.2), 0.55)],
  [SLEEP + 3.2, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(0.1, 1, 0.45), lerp(1.0, 1.15, (t - SLEEP - 3.2) / 1.4), 0.55)],   // morning
  [SLEEP + 4.6, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(0.3, 0.05, 1), lerp(2.3, 2.0, (t - SLEEP - 4.6) / 2.4), 0.6)],   // up, stretching
  [CTA, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(-0.2, 0.05, 1), lerp(1.6, 1.4, (t - CTA) / 3), 0.62)]];
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'hud', 'flash', 'tl', 'tlBar', 'tlT', 'tlV', 'pop'].map(k => [k, $(k)]));
el.title.innerHTML = 'What happens if you drink<br>an <span class="hl">energy drink</span> every day?'; el.endT.innerHTML = 'What happens if you drink an <span class="hl">energy drink</span> every day?';
el.endS.innerHTML = 'ONE CAN A DAY: 13 TSP OF SUGAR,<br>160 MG OF CAFFEINE.<br>A YEAR: 43 LB OF SUGAR, ~$1,100.<br>AT BEDTIME IT’S STILL IN YOU.';
const captions = [
  [MIN30 + 0.3, MIN30 + 2.5, 'Within 30 minutes your heart speeds up.'], [MIN30 + 2.7, HOUR1 - 0.2, '2 big cans: blood pressure up 4–5 points for hours.'],
  [HOUR1 + 0.3, HOUR1 + 2.6, 'One can: 13 teaspoons of sugar.'], [HOUR1 + 2.8, HOUR4 - 0.2, 'That’s 1.5–2× your whole daily limit.'],
  [HOUR4 + 0.3, HOUR4 + 2.8, 'When it wears off…'], [HOUR4 + 3.2, NIGHT - 0.2, '…you reach for another.'],
  [NIGHT + 0.3, NIGHT + 2.8, 'Caffeine’s half-life is about 5 hours.'], [NIGHT + 3.0, WEEK - 0.2, 'A 4 pm can: still 40 mg in you at 2 am.'],
  [WEEK + 0.3, WEEK + 2.6, 'Energy drinks are acidic.'], [WEEK + 2.8, MONTH - 0.2, 'In a lab test, they wore away enamel 2× faster than sports drinks.'],
  [MONTH + 0.3, MONTH + 2.8, 'Skip one day — headache.'], [MONTH + 3.0, YEAR - 0.2, 'Your body is hooked on caffeine.'],
  [YEAR + 0.3, YEAR + 3.4, 'A year of one can a day: 43 lb of sugar.'], [YEAR + 3.6, ER - 0.2, 'And about $1,100.'],
  [ER + 0.3, ER + 3.8, 'In 2011, energy drinks sent 20,783 Americans to the ER.'], [ER + 4.0, SLEEP - 0.2, 'Twice as many as in 2007.'],
  [SLEEP + 0.3, SLEEP + 3.0, 'Your body isn’t out of energy.'], [SLEEP + 3.2, CTA - 0.2, 'It’s out of sleep.'],
  [CTA + 0.2, T_END - 0.1, 'How many cans a day do you drink? 👇'],
];
const TIMELINE = [[0, '12 PM'], [MIN30, '12:30 PM'], [HOUR1, '1 PM'], [HOUR4, '4 PM'], [NIGHT, '2 AM'], [WEEK, 'WEEK 1'], [MONTH, 'MONTH 1'], [YEAR, 'YEAR 1'], [ER, 'IN THE US'], [SLEEP, 'TONIGHT']];
// how you FEEL (a story meter, not a measurement): tired → jolt → crash → second can → wired at night → headache → after a real night's sleep
const EN = [[0, 0.22], [CRACK + 0.4, 0.22], [MIN30 + 1.2, 0.95], [HOUR1, 0.9], [HOUR4, 0.55], [HOUR4 + 1.2, 0.15], [HOUR4 + 4.0, 0.15], [HOUR4 + 5.2, 0.8], [NIGHT, 0.75], [WEEK, 0.5],
  [MONTH, 0.45], [MONTH + 0.8, 0.08], [YEAR, 0.35], [SLEEP + 3.0, 0.3], [SLEEP + 3.6, 1.0], [99, 1.0]];
const energyAt = t => { for (let i = 1; i < EN.length; i++) if (t < EN[i][0]) return lerp(EN[i - 1][1], EN[i][1], smooth(EN[i - 1][0], EN[i][0], t)); return 1; };
const spoonsAt = t => clamp(Math.floor((t - HOUR1 - 0.3) / 0.18) + 1, 0, 13);
const POPS = [[MIN30 + 2.7, HOUR1 - 0.3, () => 'BP +4–5'], [HOUR1 + 0.3, HOUR1 + 2.3, t => spoonsAt(t) + ' TSP'], [HOUR1 + 2.8, HOUR4 - 0.3, () => '1.5–2×'],
  [NIGHT + 3.0, WEEK - 0.3, () => '40 mg'], [WEEK + 2.8, MONTH - 0.3, () => '2×'], [YEAR + 0.3, YEAR + 3.4, () => '43 LB'], [YEAR + 3.6, ER - 0.3, () => '$1,095'],
  [ER + 0.3, ER + 3.8, t => fmt(20783 * smooth(ER + 0.3, ER + 3.2, t))], [ER + 4.0, SLEEP - 0.3, () => '2× 2007']];
const popWords = (txt, t, a, b) => { const ws = txt.split(' '), span = Math.min(1.2, (b - a) * 0.4); return ws.map((w, i) => { const k = clamp((t - a - i * span / ws.length) / 0.12, 0, 1); return `<span style="display:inline-block;opacity:${k.toFixed(2)};transform:scale(${(0.6 + 0.4 * k + 0.1 * Math.sin(Math.PI * k)).toFixed(3)})">${w}</span>`; }).join(' '); };
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t); el.hud.style.opacity = 0;
  el.tl.style.opacity = smooth(0.3, 0.7, t) * (1 - smooth(T_END - 0.4, T_END, t)); const e = energyAt(t);
  el.tlV.textContent = Math.round(e * 100) + '%'; el.tlBar.style.width = (e * 100).toFixed(1) + '%';
  el.tlBar.style.background = e < 0.3 ? 'linear-gradient(90deg,#ff4a3a,#ff7a4a)' : e < 0.6 ? 'linear-gradient(90deg,#ffb030,#ffd060)' : 'linear-gradient(90deg,#4ad86a,#9af07a)';
  el.tlT.textContent = [...TIMELINE].reverse().find(([a]) => t >= a)[1];
  el.flash.style.opacity = Math.exp(-Math.pow((t - CRACK - 1.7) / 0.1, 2)) * 0.6;   // the jolt
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.textContent = pp ? pp[2](t) : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0;
  el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  const cp = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? popWords(cp[2], t, cp[0], cp[1]) : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.2) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t); return true; }   // text pass: no 3D
  // hard cuts inside a beat; a short 0.25 s dissolve when the place changes
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.25, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, ghost]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
