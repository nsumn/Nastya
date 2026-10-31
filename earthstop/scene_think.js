import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you overthought every night for a month?" (64 s, US): you in bed, eyes open — thoughts pop around your head; X-ray: the alarm centre + cortisol;
// the heart racing all night; forcing sleep (sheep); after midnight the thoughts darken; zombie mornings; week 2 fog; night 30: a wall of worries, 91% crossed out;
// the fix: a to-do list on paper, asleep. Numbers: tools/overthink_math.py; sources in the chat (Zoccola, Brosschot 2007, Ansfield 1996, Tubbs 2022, Nota & Coles 2015,
// Van Dongen 2003, LaFreniere & Newman 2019, Scullin 2018).
// =================== timeline ===================
const THINK = 4.0, CORT = 10.0, HEART = 16.0, FORCE = 22.0, MID = 28.0, MORN = 34.0, FOG = 40.0, WALL = 48.0, LIST = 55.0, ENDC = 60.0, T_END = 64.0;
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
function humanGeo(k) { if (HUMAN_GEO[k]) return HUMAN_GEO[k]; const src = k === 'head' ? HUMAN_MESH.head : k === 'head_chubby' ? HUMAN_MESH.head_chubby : HUMAN_MESH.hair[k], g = new THREE.BufferGeometry();
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
    o.decal = true; if (shape === 'human') o.noNose = true; const geo = shape === 'round' ? new THREE.SphereGeometry(0.5, 40, 28) : shape === 'human' ? humanGeo(o.chubbyHead ? 'head_chubby' : 'head') : new RoundedBoxGeometry(1, 1, 1, 5, 0.16);
    const sc = { round: [1.1, 1.08, 1.15], human: [1.12, 1.2, 1.2], soft: [1, 1, 1] }[shape]; head = new THREE.Mesh(geo, shape === 'human' ? M(o.skin, { roughness: 0.8, flatShading: true }) : skinM); if (shape === 'human') head.scale.setScalar(0.42); else head.scale.set(HEAD_W * sc[0], HEAD_H * sc[1], HEAD_D * sc[2]);
    faceM = new THREE.MeshStandardMaterial({ map: faceTex(o, 'neutral', false), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.85 });
    head.add(new THREE.Mesh(decalGeo(geo, 1), faceM)); }
  head.position.set(0, HEAD_Y, 0); head.castShadow = true; torso.add(head);
  if (shape === 'round' || shape === 'human') {   // round / human head: ears are balls, hair is a tilted cap of a slightly bigger sphere
    const hsx = head.scale, hm = M(o.hair, { roughness: 0.95 }), hs = o.hairStyle;
    if (shape === 'human') { const hk = { short: 'quiff', quiff: 'quiff', bangs: 'fringe', fringe: 'fringe', mop: 'curly' }[hs];   // ears are part of the head mesh
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
    const outfit = o.hoodie ? 'hoodie' : o.fat ? 'chubby' : 'tee', geo = humanBodyGeo(outfit), bodyM = new THREE.SkinnedMesh(geo, HUMAN_MESH.body[outfit].groups.map(([r]) => mats[r]));   // no hoodie = oversized tee bodyM.castShadow = bodyM.receiveShadow = true; bodyM.frustumCulled = false;
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
// =================== THE CAST: you (the low-poly human she approved) in the family-house set (m_sets.js), now a bedroom corner on the left ===================
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 });
room.add(hero.outer); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false;
const camKey = new THREE.PointLight(0xfff0e0, 1.4, 6, 1.2); rmCam.add(camKey); room.add(rmCam);   // soft key riding with the camera: faces never go dark
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.elbows.forEach(e => e.rotation.set(-0.15, 0, 0)); }
function seatAt(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
const LIE = V3(-2.9, 0.72, 1.34);   // lying in bed on your back, head at the headboard (-z)
// ---- the bed, a nightstand with a red digital clock and a little lamp, a blue "night" light from the window ----
const bed = new THREE.Group(); room.add(bed); bed.position.set(-2.9, 0, 1.3);
{ bx(1.1, 0.35, 2.0, '#6a4a34', 0, 0.18, 0, bed); bx(1.04, 0.16, 1.92, '#f2f0ec', 0, 0.43, 0, bed); bx(1.1, 0.8, 0.08, '#6a4a34', 0, 0.55, -1.0, bed); bx(0.55, 0.1, 0.3, '#ffffff', 0, 0.56, -0.78, bed); }
const duvet = bx(1.08, 0.2, 1.25, '#5a7ab0', 0, 0.8, 0.38, bed);
const clkCv = document.createElement('canvas'); clkCv.width = 256; clkCv.height = 96; const clkTex = new THREE.CanvasTexture(clkCv); clkTex.colorSpace = THREE.SRGBColorSpace; let clkLast = '';
function drawClock(txt) { if (txt === clkLast) return; clkLast = txt; const g = clkCv.getContext('2d'); g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff5a4a'; g.font = 'bold 64px Inter, monospace'; g.textAlign = 'center'; g.fillText(txt, 128, 72); clkTex.needsUpdate = true; }
{ const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: clkTex, color: new THREE.Color(1.6, 1.6, 1.6) })); ck.position.set(-3.6, 0.6, 0.0); ck.rotation.y = 0.5; room.add(ck);
  bx(0.4, 0.5, 0.4, '#6a4a30', -3.7, 0.25, 0.0, room); bx(0.36, 0.14, 0.2, '#1a1c22', -3.62, 0.57, 0.02, room).rotation.y = 0.5; }
const bedLamp = new THREE.PointLight(0xffc078, 0, 3.5, 1.4); bedLamp.position.set(-3.75, 1.0, 0.25); room.add(bedLamp);
{ bx(0.03, 0.3, 0.03, '#2a2a30', -3.8, 0.65, 0.12, room); const sh = mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.14, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#5a3a10' })); sh.position.set(-3.8, 0.85, 0.12); room.add(sh); }
const blueL = new THREE.PointLight(0x5a78ff, 0, 6, 1.2); blueL.position.set(-1.5, 2.2, 2.4); room.add(blueL);
// ---- thoughts: speech-bubble cards that pop up around your head (billboard sprites); after midnight they turn dark and bigger ----
const THOUGHTS = [   // [appear t, text, dark] — drawn as speech bubbles in the DOM text layer (k_main.js), so they stay readable and never cover the caption
  [THINK + 0.2, 'Did I lock the door?'], [THINK + 1.1, 'Why did I say “you too”<br>to the waiter?'], [THINK + 2.0, 'That thing I said<br>in 7th grade…'],
  [THINK + 2.9, 'Did they read my text?'], [THINK + 3.8, 'Is that a new mole?'], [THINK + 4.7, 'Wait… what’s my purpose?'],
  [MID + 0.4, 'What if I fail?', 1], [MID + 1.4, 'What if they’re all<br>mad at me?', 1], [MID + 2.4, 'What if I’m wasting<br>my life?', 1], [MID + 3.4, 'What if I never<br>sleep again?', 1]];
// ---- counting sheep: a little fence beside the bed, sheep hop over it toward your head; when trying too hard, they stop and turn to stare at you ----
function makeSheep() { const g = new THREE.Group(); const wool = M('#f4f2ec', { flatShading: true, roughness: 1, emissive: '#4a4a46' }), blk = M('#2a2626', { flatShading: true });
  for (let i = 0; i < 7; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.11, 0), wool); b.position.set((hash(i) - 0.5) * 0.12, 0.3 + (hash(i * 3) - 0.5) * 0.06, -0.12 + i * 0.04); g.add(b); }
  const hd = mesh(new THREE.BoxGeometry(0.09, 0.1, 0.12), blk); hd.position.set(0, 0.36, -0.24); g.add(hd); for (const s of [-1, 1]) { const e = mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), blk); e.position.set(s * 0.065, 0.39, -0.22); g.add(e); }
  const legs = []; for (const [x, z] of [[-0.05, -0.1], [0.05, -0.1], [-0.05, 0.12], [0.05, 0.12]]) { const l = mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), blk); l.position.set(x, 0.1, z); g.add(l); legs.push(l); } g.userData.legs = legs; g.scale.setScalar(0.72); room.add(g); return g; }
const SHEEP = Array.from({ length: 6 }, makeSheep);
const fence = new THREE.Group(); room.add(fence); fence.position.set(-1.75, 0, 1.3); { const wd = M('#c89a5a', { flatShading: true }); for (const x of [-0.25, 0.25]) bx(0.05, 0.32, 0.05, wd, x, 0.16, 0, fence); for (const y of [0.12, 0.26]) bx(0.6, 0.04, 0.03, wd, 0, y, 0, fence); }
// ---- night 30: sticky notes all over the wall above the bed; then 91% get a red line through them ----
const NOTE_TXT = ['the email', 'rent', 'that text', 'my hair?', 'the exam', 'lock?', 'her face', 'the meeting', 'money', 'my back', 'the dog?', 'job', 'the party', 'what he said', 'teeth', 'taxes', 'the car', 'my mom', 'the stove', 'heart?', 'grades', 'the date', 'boss', 'weird mole', 'the trip', 'friends', 'the call', 'my phone', 'Monday', 'the future'];
const NOTES = NOTE_TXT.map((txt, i) => { const col = ['#fff27a', '#ffb0c8', '#9fe2ff', '#b8f59a', '#ffcf7a'][i % 5];
  const tex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, w, 34); g.fillStyle = '#2a2430'; g.font = '600 40px Inter'; g.textAlign = 'center'; g.fillText(txt, w / 2, 145); });
  const strike = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#e8202a'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(26, 190); g.lineTo(230, 70); g.stroke(); });
  const n = new THREE.Group(); const p = mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), false, true); n.add(p);
  const s = mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: strike, transparent: true, depthWrite: false }), false, false); s.position.z = 0.002; n.add(s);
  const col_ = i % 6, row = Math.floor(i / 6); n.position.set(-3.92, 1.05 + row * 0.27 + 0.04 * (hash(i * 5) - 0.5), 0.45 + col_ * 0.33 + 0.05 * (hash(i * 7) - 0.5)); n.rotation.set(0, Math.PI / 2, (hash(i * 3) - 0.5) * 0.25);
  room.add(n); return { n, s, i, cross: i !== 4 && i !== 17 && i !== 26 }; });   // 27 of 30 = 90% (≈ the study's 91%): three stay
// ---- coffee: a mug in your hand in the morning; week 2 you pour and miss (the cup overflows) ----
const mug = new THREE.Group(); { const m = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), M('#e8603a')); m.position.y = 0.05; mug.add(m); const hdl = mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 10), M('#e8603a')); hdl.position.set(0.05, 0.05, 0); mug.add(hdl);
  const cf = mesh(new THREE.CircleGeometry(0.04, 14), M('#4a2a18', { roughness: 0.3 })); cf.rotation.x = -Math.PI / 2; cf.position.y = 0.095; mug.add(cf); } room.add(mug);
const pot = new THREE.Group(); { const b = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 14), M('#d8e4ec', { transparent: true, opacity: 0.6, roughness: 0.1 })); b.position.y = 0.08; pot.add(b); const c = mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.09, 14), M('#3a1e10')); c.position.y = 0.05; pot.add(c); bx(0.03, 0.12, 0.03, '#1a1a1e', -0.09, 0.09, 0, pot); } room.add(pot);
const coffeeM = M('#4a2a18', { roughness: 0.2 }), stream = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), coffeeM), spillP = mesh(new THREE.CircleGeometry(1, 20), coffeeM, false, true); room.add(stream); spillP.rotation.x = -Math.PI / 2; room.add(spillP);
const haze = makeSmoke(room, 90);
// ---- the to-do list: a notepad on your knees + a pen in your hand ----
const pad = new THREE.Group(); { const pg = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9ac0e8'; g.lineWidth = 2; for (let y = 60; y < h; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = '#e88a8a'; g.beginPath(); g.moveTo(34, 0); g.lineTo(34, h); g.stroke();
    g.fillStyle = '#1a2a6a'; g.font = '600 26px Inter'; ['TOMORROW:', '1. email Sam', '2. pay rent', '3. call mom', '4. gym 6pm'].forEach((l, i) => g.fillText(l, 44, 50 + i * 34 + (i ? 10 : 0))); });
  const p = mesh(new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: pg, roughness: 0.9 }), false, true); p.rotation.x = -Math.PI / 2; pad.add(p); } room.add(pad);
const pen = bx(0.012, 0.012, 0.14, '#2a5ad8', 0, 0, 0, room);
const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); }), transparent: true, depthWrite: false })); zzz.scale.setScalar(0.2); room.add(zzz);
function hideProps() { SHEEP.forEach(s => s.visible = false); fence.visible = false; NOTES.forEach(o => o.n.visible = false); mug.visible = pot.visible = stream.visible = spillP.visible = false; pad.visible = pen.visible = zzz.visible = false; }
// ---- the clock + night counter (also drives the HUD): [t, night, minutes after midnight (can exceed 24 h for PM→AM)] ----
const CLK = [[0, 1, 23 * 60 + 2], [CORT, 1, 23 * 60 + 41], [FORCE, 1, 25 * 60 + 47], [MID, 1, 26 * 60 + 31], [MORN, 7, 7 * 60], [FOG, 14, 9 * 60 + 30], [WALL, 30, 23 * 60 + 30], [LIST, 30, 23 * 60 + 36], [ENDC, 30, 23 * 60 + 44]];
function clockAt(t) { let i = 0; while (i < CLK.length - 2 && t >= CLK[i + 1][0]) i++; const [a, n, m0] = CLK[i], [b, , m1] = CLK[i + 1]; const m = CLK[i + 1][1] === n && m1 > m0 ? lerp(m0, m1, clamp((t - a) / (b - a), 0, 1)) : m0;
  const mm = Math.floor(m) % (24 * 60), h24 = Math.floor(mm / 60), h12 = (h24 + 11) % 12 + 1; return { night: n, txt: `${h12}:${String(mm % 60).padStart(2, '0')}`, ap: h24 < 12 ? 'AM' : 'PM' }; }
// ---- home beats ----
function updateHome(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); hideProps(); const P = hero; poseReset(P, t); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false;
  const night = ['bed', 'force', 'mid', 'wall', 'list'].includes(mode); lightRoom(night ? 'night' : 'day'); camKey.intensity = night ? 0.55 : 1.4; bedLamp.intensity = 0; blueL.intensity = 0; duvet.visible = true;
  drawClock(clockAt(t).txt); haze.begin(); smokeMat.uniforms.uTint.value.set('#d8dce4');
  const lie = (roll = 0) => { P.outer.position.copy(LIE); P.outer.rotation.set(-Math.PI / 2, 0, roll); };
  const popS = (t0, k = 1) => { const u = clamp((t - t0) / 0.28, 0, 1); return u <= 0 ? 0 : k * (1 + 0.3 * Math.sin(Math.PI * u) * (1 - u) - (1 - u) * (1 - u) * 0.95); };
  if (mode === 'bed' || mode === 'mid') {   // eyes open; the thoughts pop up around your head (after midnight: blue room, dark big thoughts)
    const dark = mode === 'mid'; lie(0.12 * Math.sin(t * 0.9) * (t > THINK ? 1 : 0.3)); blueL.intensity = dark ? 2.4 * smooth(MID, MID + 1.2, t) : 0; bedLamp.intensity = dark ? 0 : t < 1.2 ? 1.2 * (1 - smooth(0.6, 1.2, t)) : 0;
    P.face(dark ? 'anxious' : t < THINK ? 'neutral' : t < THINK + 3 ? 'worried' : 'surprised', t); }
  else if (mode === 'force') {   // 1:47: squeezing your eyes shut, counting sheep — then the sheep give up and stare
    lie(); P.face(t < FORCE + 3.2 ? 'squint' : 'angry', t); fence.visible = true; const stop = FORCE + 3.4;
    SHEEP.forEach((s, i) => { s.visible = true; const per = 1.6, tt = Math.min(t, stop + i * 0.05) - FORCE + i * per / SHEEP.length, u = (tt % per) / per, z = lerp(3.0, -0.2, u), hop = Math.max(0, 1 - Math.pow((z - 1.3) / 0.45, 2));
      s.position.set(-1.75 + 0.06 * Math.sin(i * 2), 0.42 * hop, z); s.rotation.set(-0.35 * hop * Math.sign(1.3 - z), 0, 0); const run = t < stop; s.userData.legs.forEach((l, k) => l.rotation.x = run ? 0.6 * Math.sin(t * 16 + k * Math.PI) : 0);
      if (!run) { s.rotation.set(0, lerp(0, Math.PI / 2 + 0.25 * (hash(i) - 0.5), smooth(stop, stop + 0.4, t)), 0); s.position.y = 0; } }); }
  else if (mode === 'morn') {   // night 7, 7:00 AM: sitting on the bed edge, wrecked, coffee
    seatAt(P, -2.3, 0.45, 1.5, Math.PI / 2); duvet.visible = false; P.root.rotation.x = 0.25; P.face(t < MORN + 3 ? 'sleepy' : 'worried', t);
    P.arms[1].rotation.set(-0.9, 0, -0.2); P.elbows[1].rotation.x = -1.1; P.outer.updateMatrixWorld(true); mug.visible = true; mug.position.copy(P.elbows[1].localToWorld(V3(0, -0.3, 0.05))).add(V3(0, -0.05, 0)); mug.rotation.set(0, 0, 0); }
  else if (mode === 'fog') {   // night 14, 9:30 AM: at the kitchen counter, pouring coffee… past the cup; grey haze around your head
    P.outer.position.set(3.0, 0.95, -1.5); P.outer.rotation.set(0, Math.PI / 2, 0); P.face('sleepy', t); P.arms[1].rotation.set(-1.3, 0, 0.1); P.elbows[1].rotation.x = -0.35; P.outer.updateMatrixWorld(true);
    pot.visible = true; const hand = P.elbows[1].localToWorld(V3(0, -0.32, 0.04)); pot.position.copy(hand).add(V3(0, -0.12, 0)); pot.rotation.set(0, 0, -0.9);
    mug.visible = true; mug.position.set(3.55, 0.95, -1.5); const lip = pot.localToWorld(V3(-0.09, 0.15, 0)); stream.visible = true; const sh = lip.y - 0.95; stream.scale.set(1, sh, 1); stream.position.set(lip.x, 0.95 + sh / 2, lip.z);
    spillP.visible = true; spillP.position.set(3.55, 0.953, -1.5); spillP.scale.setScalar(0.06 + 0.22 * smooth(FOG + 1.0, FOG + 6.0, t));
    const hd = headOf(P); for (let k = 0; k < 40; k++) { const u = (t * 0.15 + k / 40) % 1, a = k * 2.4; haze.add(hd.clone().add(V3(Math.cos(a) * (0.15 + 0.25 * u), 0.05 + 0.25 * u, Math.sin(a) * (0.15 + 0.25 * u))), 0.12 + 0.1 * u, 0.32 * Math.sin(Math.PI * u)); } }
  else if (mode === 'wall') {   // night 30: standing at the foot of the bed facing a wall of worries; they get crossed out one by one
    P.outer.position.set(-3.0, 0.95, 3.0); P.outer.rotation.set(0, -Math.PI * 0.62, 0); bedLamp.intensity = 1.6; P.face(t < WALL + 3.5 ? 'worried' : t < WALL + 5.6 ? 'surprised' : 'happy', t);
    NOTES.forEach((o, i) => { const t0 = WALL + 0.1 + i * 0.09, sc = popS(t0); o.n.visible = sc > 0; o.n.scale.setScalar(Math.max(0.001, sc)); const tc = WALL + 3.6 + i * 0.075; o.s.visible = o.cross && t > tc; o.s.scale.set(clamp((t - tc) / 0.12, 0.01, 1), 1, 1); }); }
  else if (mode === 'list') {   // 11:36 PM: write tomorrow's list on paper, lamp on; then lights out, asleep
    const asleep = t > LIST + 2.9; bedLamp.intensity = asleep ? 1.4 * (1 - smooth(LIST + 2.9, LIST + 3.4, t)) : 1.8;
    if (!asleep) { seatAt(P, -2.75, 0.62, 1.55, 0); duvet.visible = false; P.root.rotation.x = 0.18; P.face('reading', t); P.arms[1].rotation.set(-0.7, 0, -0.25); P.elbows[1].rotation.x = -1.0 + 0.08 * Math.sin(t * 14); P.arms[0].rotation.set(-0.6, 0, 0.25); P.elbows[0].rotation.x = -0.9;
      P.outer.updateMatrixWorld(true); pad.visible = true; pad.position.copy(P.elbows[0].localToWorld(V3(0, -0.3, 0.06))).lerp(P.elbows[1].localToWorld(V3(0, -0.3, 0.06)), 0.5); pad.rotation.set(0.5, 0, 0);
      pen.visible = true; pen.position.copy(P.elbows[1].localToWorld(V3(0, -0.32, 0.05))).add(V3(0.02 * Math.sin(t * 9), 0.03, 0)); pen.rotation.set(0.8, 0.3, 0); }
    else { lie(); P.face('sleep', t); zzz.visible = true; zzz.position.copy(headOf(P)).add(V3(0.2, 0.35, 0.1)); pad.visible = true; pad.position.set(-3.62, 0.54, 0.25); pad.rotation.set(0, 0.4, 0); } }
  haze.end(); }

// =================== THE X-RAY BODY: your ghost silhouette; the brain glass-clear with the ALARM centre (amygdala) glowing; a signal runs down to the adrenal glands,
// which pour cortisol (orange) into the blood; then the heart beating fast ===================
const xr = new THREE.Scene(); xr.background = new THREE.Color('#0a0c18'); const xCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
xr.add(new THREE.AmbientLight(0x8a9ab8, 0.8)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(1, 2, 3); xr.add(k); }
{ const ringT = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(120,160,255,0.35)'; g.lineWidth = 2; for (let r = 40; r < 256; r += 36) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); } });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; xr.add(floor); }
const ghost = makeBlock({ head: 'human', body: 'human', skin: '#ffffff', hair: '#ffffff', top: '#ffffff', bottom: '#ffffff', shoe: '#ffffff', hairStyle: 'short', headS: 0.88 }); xr.add(ghost.outer); ghost.outer.position.set(0, 0.95, 0); poseIdle(ghost, 0, 0);
const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.6, 1.2), transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending });
ghost.outer.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
const brainC = headOf(ghost).add(V3(0, 0.03, -0.03)), BR = 0.105;
const brainG = new THREE.Group(); brainG.position.copy(brainC); xr.add(brainG);
const brainM = new THREE.MeshStandardMaterial({ color: '#f29ab8', emissive: '#3a1428', roughness: 0.5, flatShading: true, transparent: true, opacity: 0.42, depthWrite: false });
{ const g = new THREE.SphereGeometry(BR, 22, 16), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i).divideScalar(BR); const f = Math.sin(v.z * 9 + Math.sin(v.y * 7) * 2) * Math.sin(v.y * 10 + Math.sin(v.x * 6) * 1.6), d = 1 + 0.06 * Math.abs(f) - 0.12 * Math.exp(-v.x * v.x / 0.004) * Math.max(0, v.y + 0.3);
    q.setXYZ(i, v.x * 0.92 * d * BR, v.y * 0.8 * d * BR, v.z * 1.12 * d * BR); } g.computeVertexNormals(); brainG.add(new THREE.Mesh(g, brainM)); }
const amyM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.2) }), AMY = [-1, 1].map(s => { const a = mesh(new THREE.SphereGeometry(0.014, 12, 8), amyM, false, false); a.scale.set(1, 0.8, 1.6); a.position.set(s * 0.035, -0.035, 0.02); brainG.add(a); return a; });
const pulseM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.3, 0.25), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), PULSE = [0, 1, 2].map(() => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), pulseM.clone()); brainG.add(p); return p; });
// adrenal glands on top of the kidneys; the signal path brain → spine → adrenals; cortisol rides the vessels
const kidM = M('#8a2a3a', { emissive: '#2a0810', roughness: 0.5 }), adrM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, 0.2) });
const ADR = [-1, 1].map(s => { const k = mesh(new THREE.SphereGeometry(0.035, 12, 10), kidM, false, false); k.scale.set(0.8, 1.3, 0.7); k.position.set(s * 0.07, 1.02, -0.03); xr.add(k);
  const a = mesh(new THREE.ConeGeometry(0.022, 0.03, 4), adrM, false, false); a.position.set(s * 0.07, 1.08, -0.03); xr.add(a); return a; });
const SIG = new THREE.CatmullRomCurve3([brainC.clone().add(V3(0, -0.05, 0.01)), V3(0, 1.48, -0.04), V3(0, 1.25, -0.06), V3(0.035, 1.12, -0.04), V3(0.07, 1.09, -0.03)]);
const sigDot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.2) })); xr.add(sigDot);
xr.add(new THREE.Mesh(new THREE.TubeGeometry(SIG, 40, 0.003, 5, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.8, 0.5), transparent: true, opacity: 0.4 })));
const heartG = new THREE.Group(); heartG.position.set(0.035, 1.3, 0.04); xr.add(heartG);
{ const hm = M('#e8283a', { emissive: '#7a0a14', roughness: 0.35 }); for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.034, 16, 12), hm); l.position.set(s * 0.024, 0.016, 0); heartG.add(l); } const tip = mesh(new THREE.ConeGeometry(0.05, 0.075, 16), hm); tip.rotation.x = Math.PI; tip.position.y = -0.03; heartG.add(tip); }
const VES = [[[0.035, 1.3, 0.04], [0.0, 1.5, 0.03], [0.0, 1.62, 0.02]], [[0.035, 1.3, 0.04], [0.16, 1.4, 0.02], [0.23, 1.18, 0.0], [0.26, 0.95, 0.02]], [[0.035, 1.3, 0.04], [-0.15, 1.4, 0.02], [-0.23, 1.18, 0.0], [-0.26, 0.95, 0.02]],
  [[0.07, 1.08, -0.03], [0.05, 1.2, 0.02], [0.035, 1.3, 0.04]], [[-0.07, 1.08, -0.03], [-0.05, 1.2, 0.02], [0.035, 1.3, 0.04]],
  [[0.035, 1.3, 0.04], [0.05, 1.05, 0.04], [0.1, 0.86, 0.02], [0.1, 0.42, 0.03], [0.1, 0.08, 0.05]], [[0.035, 1.3, 0.04], [0.0, 1.05, 0.04], [-0.1, 0.86, 0.02], [-0.1, 0.42, 0.03], [-0.1, 0.08, 0.05]]].map(pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p))));
const vesMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.15), transparent: true, opacity: 0.45 }); for (const c of VES) xr.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.007, 5, false), vesMat));
const CN = 260, cellM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.2, 0.15) }), CN), corM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.85, 0.12) }), CN);
cellM.frustumCulled = corM.frustumCulled = false; xr.add(cellM, corM);
const CL = Array.from({ length: CN }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.007), s: rnd() }));
const bpmAt = t => lerp(62, 92, smooth(HEART + 0.5, HEART + 3.0, t));
const _o = new THREE.Object3D(), _v = new THREE.Vector3();
function updateXray(t) { brainG.rotation.y = 0.25 * Math.sin(t * 0.5); const alarm = smooth(CORT + 0.3, CORT + 1.2, t);
  AMY.forEach(a => a.scale.set(1 + 0.4 * alarm * Math.abs(Math.sin(t * 6)), 0.8, 1.6)); amyM.color.setRGB(0.8 + 2.0 * alarm, 0.25, 0.2);
  PULSE.forEach((p, k) => { const u = ((t * 1.2) + k / 3) % 1; p.visible = alarm > 0.1; p.position.set(0, -0.035, 0.02); p.scale.setScalar(0.4 + 2.6 * u); p.material.opacity = (1 - u) * 0.5 * alarm; });
  const su = clamp((t - CORT - 1.6) / 1.4, 0, 1); sigDot.visible = su > 0 && su < 1; SIG.getPointAt(su, sigDot.position); const cort = smooth(CORT + 3.0, CORT + 5.0, t) + (t >= HEART ? 1 : 0);
  ADR.forEach(a => a.scale.setScalar(1 + 0.5 * smooth(CORT + 2.9, CORT + 3.3, t) * (0.6 + 0.4 * Math.sin(t * 8))));
  const bpm = bpmAt(t), sp = bpm / 62, ph = (t * bpm / 60) % 1, beat = Math.exp(-ph * 9) + 0.5 * Math.exp(-Math.max(0, ph - 0.18) * 9) * (ph > 0.18); heartG.scale.setScalar(1 + 0.22 * beat);
  CL.forEach((C, i) => { const u = (C.u0 + t * C.sp * sp) % 1; VES[C.v].getPointAt(u, _v).add(C.off); _o.position.copy(_v); _o.rotation.set(t + i, t * 0.7 + i, 0); _o.scale.setScalar(1); _o.updateMatrix(); cellM.setMatrixAt(i, _o.matrix);
    _o.position.add(V3(0.009, 0.005, 0.004)); _o.scale.setScalar(C.s < Math.min(1, cort) * 0.75 ? 1 : 0.0001); _o.updateMatrix(); corM.setMatrixAt(i, _o.matrix); }); cellM.instanceMatrix.needsUpdate = corM.instanceMatrix.needsUpdate = true; }
// =================== SHOTS (moving cameras: every framing dollies), HUD = NIGHT x OF 30 + the clock, captions in the series style (fade + pop, no word-by-word) ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const home = m => t => updateHome(t, m);
const heartW = () => heartG.getWorldPosition(V3(0, 0, 0)), brainW = () => brainG.getWorldPosition(V3(0, 0, 0)), adrW = () => V3(0, 1.08, -0.03);
const sp = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
// [start, scene, camera, update(t), framing(t)]
const SHOTS = [
  [0.0, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(0.05, 1, 0.55), lerp(2.5, 2.0, sp(t, 0, THINK)), 0.66)],   // in bed, eyes open; the title above
  [THINK, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(0.2, 1, 0.75), lerp(2.0, 1.75, sp(t, THINK, 7)), 0.6)],   // the thoughts pop up
  [7.0, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(-0.35, 1, 0.6), lerp(1.75, 2.0, sp(t, 7, CORT)), 0.6)],
  [CORT, xr, () => xCam, updateXray, t => { const a = lerp(Math.PI * 0.85, 0.3, sp(t, CORT, CORT + 3)); return fr(brainW(), V3(Math.sin(a), 0.12, Math.cos(a)), lerp(1.2, 0.5, sp(t, CORT, CORT + 3)), 0.5); }],   // spiral in to the alarm centre
  [CORT + 3.0, xr, () => xCam, updateXray, t => fr(brainW().lerp(adrW(), sp(t, CORT + 3, CORT + 4.6)), V3(0.45, 0.1, 1), lerp(0.62, 0.8, sp(t, CORT + 3, HEART)), 0.5)],   // follow the signal down to the adrenals
  [HEART, xr, () => xCam, updateXray, t => fr(heartW(), V3(0.5, 0.15, 1), lerp(0.62, 0.45, sp(t, HEART, HEART + 3)), 0.5)],
  [HEART + 3.0, xr, () => xCam, updateXray, t => fr(heartW(), V3(-0.35, 0.1, 1), lerp(0.75, 0.62, sp(t, HEART + 3, FORCE)), 0.86)],   // under the heart-rate card
  [FORCE, room, () => rmCam, home('force'), t => fr(V3(-2.35, 0.6, 0.95), V3(2.0, 0.85, 0.7), lerp(3.6, 3.2, sp(t, FORCE, FORCE + 3.4)), 0.64)],   // from beside the bed: the sheep hop across the frame   // you + the sheep hopping the fence
  [FORCE + 3.4, room, () => rmCam, home('force'), t => fr(V3(-2.4, 0.6, 0.9), V3(1.6, 0.5, 0.35), lerp(2.8, 2.5, sp(t, FORCE + 3.4, MID)), 0.55)],   // they stop and stare
  [MID, room, () => rmCam, home('mid'), t => fr(H_(hero), V3(0.1, 1, 0.6), lerp(2.4, 2.0, sp(t, MID, MID + 3)), 0.6)],
  [MID + 3.0, room, () => rmCam, home('mid'), t => fr(H_(hero), V3(-0.3, 1, 0.5), lerp(2.0, 1.75, sp(t, MID + 3, MORN)), 0.6)],
  [MORN, room, () => rmCam, home('morn'), t => fr(H_(hero), V3(1, 0.15, 0.45), lerp(2.0, 1.7, sp(t, MORN, MORN + 3)), 0.6)],
  [MORN + 3.0, room, () => rmCam, home('morn'), t => fr(H_(hero), V3(0.85, 0.05, -0.35), lerp(1.35, 1.2, sp(t, MORN + 3, FOG)), 0.6)],
  [FOG, room, () => rmCam, home('fog'), t => fr(V3(3.3, 1.45, -1.5), V3(-0.3, 0.22, 1), lerp(3.1, 2.8, sp(t, FOG, FOG + 4)), 0.74)],   // you + the overflowing cup
  [FOG + 4.0, room, () => rmCam, home('fog'), t => fr(H_(hero), V3(0.5, 0.06, 1), lerp(1.4, 1.2, sp(t, FOG + 4, WALL)), 0.62)],
  [WALL, room, () => rmCam, home('wall'), t => fr(V3(-3.9, 1.55, 1.3), V3(1, 0.12, 0.3), lerp(2.6, 2.25, sp(t, WALL, WALL + 3.4)), 0.47)],   // the wall fills up
  [WALL + 3.4, room, () => rmCam, home('wall'), t => fr(V3(-3.9, 1.5, 1.4), V3(1, 0.1, 0.75), lerp(3.0, 2.8, sp(t, WALL + 3.4, WALL + 5.6)), 0.5)],   // over your shoulder: crossed out
  [WALL + 5.6, room, () => rmCam, home('wall'), t => fr(H_(hero), V3(-0.85, 0.08, -0.5), lerp(1.3, 1.15, sp(t, WALL + 5.6, LIST)), 0.6)],
  [LIST, room, () => rmCam, home('list'), t => fr(H_(hero), V3(0.5, 0.02, 1), lerp(1.6, 1.4, sp(t, LIST, LIST + 2.9)), 0.6)],   // writing tomorrow's list
  [LIST + 2.9, room, () => rmCam, home('list'), t => fr(H_(hero), V3(0.1, 1, 0.6), lerp(1.8, 2.3, sp(t, LIST + 2.9, T_END)), 0.6)]];   // asleep (under the end card too)
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'tl', 'tlN', 'tlC', 'pop', 'card', 'labels', 'th'].map(k => [k, $(k)]));
const CAPS = [
  [THINK + 0.2, 7.0, 'Your body is tired.'], [7.0, CORT - 0.15, 'Your brain: “Let’s talk about everything.”'],
  [CORT + 0.3, CORT + 3.0, 'Replaying a stress fires up your brain’s alarm…'], [CORT + 3.2, HEART - 0.15, '…and keeps your stress hormone, cortisol, high at bedtime.'],
  [HEART + 0.3, HEART + 3.0, 'Worry follows you into sleep:'], [HEART + 3.2, FORCE - 0.15, 'your heart beats faster all night.'],
  [FORCE + 0.3, FORCE + 3.3, 'You try HARD to fall asleep.'], [FORCE + 3.5, MID - 0.15, 'Trying hard can make it slower.'],
  [MID + 0.3, MID + 3.0, 'Scientists think that after midnight…'], [MID + 3.2, MORN - 0.15, '…the brain leans negative.'],
  [MORN + 0.3, MORN + 3.0, 'Tired brains overthink more.'], [MORN + 3.2, FOG - 0.15, 'It’s a loop.'],
  [FOG + 0.3, FOG + 4.0, '2 weeks of 6-hour nights: as foggy as an all-nighter.'], [FOG + 4.2, WALL - 0.15, 'And you don’t even notice.'],
  [WALL + 0.3, WALL + 3.4, 'Night 30. A wall of worries.'], [WALL + 3.6, LIST - 0.15, 'In one study, <b>91%</b> of worries never came true.'],
  [LIST + 0.3, LIST + 2.8, 'Try this: write tomorrow’s to-do list.'], [LIST + 3.0, ENDC - 0.15, 'People fell asleep <b>~9 min</b> faster.']];
// big numbers (MODEL = our own assumption: ~1 extra hour awake a night, tools/overthink_math.py)
const POPS = [[FOG + 0.3, FOG + 4.0, () => '14 H', 'SLEEP LOST · MODEL'], [WALL + 3.6, LIST - 0.2, () => '91%', 'NEVER HAPPENED'], [LIST + 3.0, ENDC - 0.2, () => '−9 MIN', 'TO FALL ASLEEP']];
const sheepAt = t => Math.floor(1 + Math.min(t - FORCE, 3.4) * 3.75 + 1240);
function labelsAt(t, i) { if (SHOTS[i][1] !== xr || t >= HEART) return ''; const out = [], put = (p, txt, a) => { const v = p.clone().project(xCam); if (v.z > 1) return; out.push(`<div class="lb" style="left:${((v.x + 1) / 2 * W).toFixed(0)}px;top:${((1 - v.y) / 2 * H).toFixed(0)}px;opacity:${a.toFixed(2)}">${txt}</div>`); };
  brainG.updateMatrixWorld(true); put(AMY[1].getWorldPosition(V3(0, 0, 0)).add(V3(0.04, 0.09, 0)), 'ALARM CENTER', fadeWin(t, CORT + 0.6, CORT + 3.0, 0.25));
  put(adrW().add(V3(0.08, 0.06, 0)), 'ADRENAL GLANDS', fadeWin(t, CORT + 4.0, CORT + 6.0, 0.25)); put(V3(-0.2, 1.24, 0.03), 'CORTISOL', fadeWin(t, CORT + 4.6, HEART, 0.25)); return out.join(''); }
// thought bubbles in fixed screen slots around your face (left / right, clear of the right-hand icon column below y 950 and of the caption band)
const SLOTS = [[60, 560, 'l'], [560, 610, 'r'], [70, 760, 'l'], [560, 800, 'r'], [80, 960, 'l'], [330, 1110, 'l']], DSLOTS = [[60, 560, 'l'], [520, 640, 'r'], [70, 860, 'l'], [300, 1080, 'l']];
function thoughtsAt(t, i) { const k = SHOTS[i][1] === room ? (t < CORT ? 0 : t >= MID && t < MORN ? 1 : -1) : -1; if (k < 0) return ''; let n = 0;
  return THOUGHTS.filter(o => !!o[2] === !!k).map(([t0, txt, dark]) => { const [x, y, side] = (dark ? DSLOTS : SLOTS)[n++]; const u = clamp((t - t0) / 0.28, 0, 1); if (u <= 0) return '';
    const sc = 1 + 0.3 * Math.sin(Math.PI * u) * (1 - u) - (1 - u) * (1 - u) * 0.95, bob = 6 * Math.sin(t * 1.4 + n);
    return `<div class="tb${dark ? ' dk' : ''} ${side}" style="left:${x}px;top:${(y + bob).toFixed(0)}px;transform:scale(${sc.toFixed(3)})">${txt}</div>`; }).join(''); }
function ecg(t) { const bpm = bpmAt(t), ph = t * bpm / 60 * 0.5; let d = ''; for (let x = 0; x <= 640; x += 4) { const u = ((x / 160 + ph) % 1), y = 170 - 80 * Math.exp(-Math.pow((u - 0.2) / 0.015, 2)) + 24 * Math.exp(-Math.pow((u - 0.24) / 0.012, 2)) - 14 * Math.exp(-Math.pow((u - 0.08) / 0.03, 2)) - 22 * Math.exp(-Math.pow((u - 0.5) / 0.06, 2)); d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1); } return d; }
function updateDOM(t, i) { el.title.style.opacity = fadeWin(t, 0, THINK, 0.35);
  const c = clockAt(t); el.tl.style.opacity = smooth(0.4, 0.8, t) * (1 - smooth(ENDC - 0.3, ENDC, t)) * (SHOTS[i][1] === xr ? 0 : 1); el.tlN.textContent = `NIGHT ${c.night} OF 30`; el.tlC.innerHTML = `${c.txt}<small>${c.ap}</small>`;
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.innerHTML = pp ? `${pp[2](t)}<div class="ps">${pp[3]}</div>` : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0;
  el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  if (t >= FORCE + 0.3 && t < MID) { el.pop.innerHTML = `<span style="font-size:80px">${fmt(sheepAt(t))}</span><div class="ps">SHEEP COUNTED</div>`; el.pop.style.opacity = fadeWin(t, FORCE + 0.3, MID, 0.2); el.pop.style.transform = 'translateX(-50%) translateY(-60px)'; }
  if (t >= HEART + 3.0 && t < FORCE) { el.card.style.opacity = fadeWin(t, HEART + 3.0, FORCE, 0.2); el.card.innerHTML = `<div class="hd dp"><span>Your heart at night</span><em>WORRY DAY → FASTER ALL NIGHT</em></div><div class="bd" style="background:#0c1420"><svg viewBox="0 0 640 240" width="640" height="240"><path d="${ecg(t)}" stroke="#30e070" stroke-width="6" fill="none" stroke-linejoin="round"/></svg></div>`; }
  else el.card.style.opacity = 0;
  el.labels.innerHTML = labelsAt(t, i); el.th.innerHTML = thoughtsAt(t, i);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.18) : 0;
  el.cap.style.transform = cp ? `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp((t - cp[0]) / 0.25, 0, 1)) - 0.06 * (1 - clamp((t - cp[0]) / 0.18, 0, 1))).toFixed(3)})` : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.4, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.2, ENDC + 0.6, t); el.endS.style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  // hard cuts inside a beat; a short 0.3 s dissolve when the place changes
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.3, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t; compMat.uniforms.uLook.value = 1;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, ghost]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
