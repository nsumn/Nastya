import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "What if EVERY trick-or-treater in America came to YOUR house?" — TikTok "SPOOKY Season!" challenge (Oct 30, 2026). Captions only, no narration:
// the challenge song (SPOOKY 3, 130 BPM) must be clearly heard, so every cut and caption sits on its beat grid. The song clip is 25.08 s; the rest of the
// track is re-cut from its own phrases (tools/spooky_music.py). Numbers: tools/spooky_math.py (Census 41.0M kids 5–14, 126.8M occupied homes; NRF 2025 costumes).
// =================== beat grid / timeline ===================
// Re-timed (Oct 30) to the sound she picked: 131 BPM, 59.0 s — intro 0–32, drop 32–64, break 64–88, build 88–96, drop 96–128 (its beat numbers).
// The story was written on the first clip's grid ("old" beat numbers below); OLD2NEW maps them onto this song's phrases.
const BP = 0.458, B0 = 0.024;
const OLD2NEW = [[0, 0], [2, 4], [6, 8], [10, 8], [14, 12], [18, 16], [26, 24], [30, 28], [34, 32], [130, 128]];
const remap = k => { for (let i = 0; i < OLD2NEW.length - 1; i++) { const [a, A] = OLD2NEW[i], [b, B] = OLD2NEW[i + 1]; if (k <= b) return A + (k - a) * (B - A) / (b - a); } return k - 2; };
const beat = k => B0 + remap(k) * BP;
const P1 = beat(2), P2 = beat(18), DROP = beat(34), P4 = beat(50), BRK = beat(66), BLD = beat(82), DROP2 = beat(98), P8 = beat(114), ENDC = beat(122), HIT = beat(130), T_END = 61.2;
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
// =================== HALLOWEEN NIGHT on the groceries street (g_world): moon + stars, warm windows, porch lamp, jack-o'-lanterns, street lamps;
// the street is extended for miles (instanced houses + lamps) so the line of kids can run to the horizon. setEnv(day, season) drives the time-lapse. ===================
for (const o of [nb1, nb2, carKeys, eggDrop, ...BAGS, ...eggs, ...splats]) o.visible = false;
car.traverse(o => { if (o.isGroup && Math.abs(o.rotation.x + 1.25) < 0.01) o.rotation.x = 0; });   // close the SUV hatch
const skyMesh = st.children.find(o => o.isMesh && o.geometry.type === 'SphereGeometry' && o.material.isMeshBasicMaterial);
const nightSky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060a1c'); gr.addColorStop(0.45, '#141c3e'); gr.addColorStop(0.75, '#3a2a58'); gr.addColorStop(0.92, '#6a3a4a'); gr.addColorStop(1, '#8a4a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const daySky = skyMesh.material.map; skyMesh.material.map = nightSky;
skyMesh.scale.setScalar(20); skyMesh.material.fog = false;   // big enough for the aerial shots
const hemi = st.children.find(o => o.isHemisphereLight);
// clouds off; far hills/tree ring off where the extended street runs (-x)
st.traverse(o => { if (!o.isMesh) return; const m = o.material; if (m && m.emissive && m.emissive.getHexString() === 'f8c0a0') o.visible = false; });
st.traverse(o => { if (o.isMesh && o.position.length() > 45 && o.position.x < -30 && Math.abs(o.position.z) < 45) o.visible = false; });
// windows glow warm (every glass pane of the set shares the blue-glass colour)
const winMats = new Set(); st.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '8ab4d8') winMats.add(o.material); });
winMats.forEach(m => { m.color.set('#2a2018'); m.emissive.set('#ffb25a'); m.emissiveIntensity = 1.6; m.metalness = 0; m.roughness = 0.6; });
// moon + stars (far, fog-free)
const moonS = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.42, 'rgba(255,230,180,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f6eed8'; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(170,160,140,0.45)'; for (const [x, y, r] of [[112, 116, 12], [142, 140, 9], [132, 106, 6], [118, 146, 7]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } }), fog: false, depthWrite: false, transparent: true }));
moonS.position.set(-900, 1100, 1900); moonS.scale.setScalar(520); st.add(moonS);
const stars = (() => { const n = 1500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(0.12, 1), R(-1, 1)).normalize().multiplyScalar(2800); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#d8e0ff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })); st.add(p); return p; })();
// porch lamp (the one she switches off at the end) + the lamp's emissive shade from g_world
const porchLamp = st.children.find(o => o.isMesh && o.material.emissive && o.material.emissive.getHexString() === 'ffd890');
const porchL = new THREE.PointLight(0xffc070, 9, 11, 1.5); porchL.position.set(0.6, PORCH_Y + 2.1, -4.8); st.add(porchL);
const doorL = new THREE.SpotLight(0xffd8a0, 30, 16, 0.75, 0.6, 1.4); doorL.position.set(0, PORCH_Y + 2.4, -4.6); doorL.target.position.set(0, 0, 1.5); st.add(doorL, doorL.target);
// jack-o'-lanterns with carved glowing faces
const faceEmi = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb030'; const fx = 64;
  g.beginPath(); g.moveTo(fx - 22, 50); g.lineTo(fx - 8, 50); g.lineTo(fx - 15, 36); g.fill(); g.beginPath(); g.moveTo(fx + 8, 50); g.lineTo(fx + 22, 50); g.lineTo(fx + 15, 36); g.fill();
  g.beginPath(); g.moveTo(fx - 26, 66); for (let i = 0; i <= 8; i++) g.lineTo(fx - 26 + i * 6.5, 66 + (i % 2 ? 10 : 2) + Math.sin(i / 8 * Math.PI) * 10); g.lineTo(fx + 26, 66); g.quadraticCurveTo(fx, 72, fx - 26, 66); g.fill(); });
const jackMat = new THREE.MeshStandardMaterial({ color: '#e0701c', roughness: 0.7, emissiveMap: faceEmi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.4, flatShading: true });
const jackGeo = (() => { const g = new THREE.SphereGeometry(1, 14, 10); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = 1 + 0.07 * Math.cos(Math.atan2(z, x) * 8); p.setX(i, x * r); p.setZ(i, z * r); } g.computeVertexNormals(); return g; })();
function jackO(x, y, z, s, yaw = Math.PI, light = false) { const b = mesh(jackGeo, jackMat); b.scale.set(s, s * 0.78, s); b.rotation.y = yaw; b.position.set(x, y + s * 0.78, z); st.add(b);
  const stc = mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.1, 6), M('#4b5a22')); stc.scale.setScalar(s * 5); stc.position.set(x, y + s * 1.56 + 0.03, z); st.add(stc);
  if (light) { const l = new THREE.PointLight(0xff8a2a, 2.5, 4, 1.6); l.position.set(x, y + s + 0.2, z + 0.3); st.add(l); } }
// g_world's plain porch pumpkins become lanterns: hide the icosahedra on the steps, put carved ones there (+ along the walk)
st.traverse(o => { if (o.isMesh && o.geometry.type === 'IcosahedronGeometry' && o.material.color && o.material.color.getHexString() === 'e8762a') o.visible = false; });
for (const [x, y, z, s, l] of [[-0.62, 0.36, -4.25, 0.17, true], [0.65, 0.18, -3.93, 0.15, false], [-1.15, PORCH_Y, -4.75, 0.2, true], [1.15, PORCH_Y, -4.8, 0.16, false], [-0.95, 0, -2.2, 0.16, true], [0.95, 0, 0.6, 0.14, false], [-0.95, 0, 3.4, 0.17, true], [0.95, 0, 6.0, 0.15, false]]) jackO(x, y, z, s, Math.PI, l);
// street lamps of g_world get bulbs + light
for (const x of [-9, 9]) { const b = mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe0a8' })); b.position.set(x, 4.05, 7.85); st.add(b); const l = new THREE.PointLight(0xffd090, 14, 16, 1.4); l.position.set(x, 3.9, 8.1); st.add(l); }
// ---- the extended street (x from -70 to -3000): ground, road, sidewalk, instanced houses with lit windows, lamps ----
const FAR_X = -3000;
{ const F = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
  const gnd = mesh(new THREE.PlaneGeometry(3000, 900), F('#6a7a3a'), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.set(-1500 - 69, -0.05, 0); st.add(gnd);
  const gnd2 = mesh(new THREE.PlaneGeometry(400, 900), F('#6a7a3a'), false, true); gnd2.rotation.x = -Math.PI / 2; gnd2.position.set(260, -0.06, 0); st.add(gnd2);
  plane(2940, 7, F('#4c4e56'), -70 - 1470, 13.6, 0.004); plane(2940, 2.0, F('#b8b2a6'), -70 - 1470, 8.95, 0.015); plane(2940, 2.0, F('#b8b2a6'), -70 - 1470, 18.3, 0.015);
  for (let x = -72; x > FAR_X; x -= 4) plane(1.8, 0.14, M('#d8cc90'), x, 13.6, 0.008);
  // houses: walls + roofs + a lit window strip, both sides of the road
  const N = 2 * Math.floor(2930 / 17), wallG = new THREE.BoxGeometry(1, 1, 1), roofG = new THREE.ConeGeometry(0.75, 1, 4, 1); roofG.rotateY(Math.PI / 4);
  const walls = new THREE.InstancedMesh(wallG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), N), roofs = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), N);
  const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffb860', fog: true }), N * 2);
  const d = new THREE.Object3D(), c = new THREE.Color(); let k = 0, w = 0;
  for (let x = -76; x > FAR_X + 10; x -= 17) for (const side of [-1, 1]) { const z = side < 0 ? -8.5 : 24, hw = 6 + 2 * hash(x), hh = 3 + 0.8 * hash(x * 1.3), hd = 5;
    d.position.set(x, hh / 2, z); d.rotation.set(0, 0, 0); d.scale.set(hw, hh, hd); d.updateMatrix(); walls.setMatrixAt(k, d.matrix); walls.setColorAt(k, c.set(['#e8d4a8', '#a8c4d8', '#f0ece2', '#d8a87a', '#b8cca0', '#c2674a'][(hash(x * 2.7 + side) * 6) | 0]));
    d.position.set(x, hh + 1.1, z); d.scale.set(hw * 1.25, 2.2, hd * 1.35); d.updateMatrix(); roofs.setMatrixAt(k, d.matrix); roofs.setColorAt(k, c.set(['#4c5060', '#7a4a3a', '#5a4a4a'][(hash(x * 3.1) * 3) | 0])); k++;
    for (const dx of [-1.6, 1.6]) { if (hash(x * 5.3 + dx + side) < 0.25) continue; d.position.set(x + dx, hh * 0.55, z - side * (hd / 2 + 0.02)); d.rotation.set(0, side < 0 ? 0 : Math.PI, 0); d.scale.set(1.0, 0.9, 1); d.updateMatrix(); wins.setMatrixAt(w++, d.matrix); } }
  walls.count = roofs.count = k; wins.count = w; for (const m of [walls, roofs]) { m.castShadow = false; m.receiveShadow = true; st.add(m); } st.add(wins);
  // street lamps every 34 m: a pole + a glowing head (no real lights out there)
  const L = Math.floor(2930 / 34), poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), M('#2e3034'), L), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe0a8' }), L);
  for (let i = 0; i < L; i++) { const x = -80 - i * 34; d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(x, 2.1, 7.6); d.updateMatrix(); poles.setMatrixAt(i, d.matrix); d.position.set(x, 4.2, 7.75); d.updateMatrix(); heads.setMatrixAt(i, d.matrix); }
  st.add(poles, heads);
  // lamp pools of light on the sidewalk (additive discs, fake)
  const pool = new THREE.InstancedMesh(new THREE.CircleGeometry(3.2, 20), new THREE.MeshBasicMaterial({ color: '#5a4020', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), L);
  for (let i = 0; i < L; i++) { d.position.set(-80 - i * 34, 0.03, 9.2); d.rotation.set(-Math.PI / 2, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); pool.setMatrixAt(i, d.matrix); } st.add(pool); }
// ---- environment: night <-> day, seasons (fall -> winter -> spring -> summer) for the time-lapse ----
const crownMats = new Set(); { const pal = ['e07a2a', 'd4562a', 'f0a63a', 'c8402a', 'e8c050', 'b8582a']; st.traverse(o => { if (o.isMesh && o.material && o.material.color && pal.includes(o.material.color.getHexString())) crownMats.add(o.material); }); }
crownMats.forEach(m => m.userData.fall = m.color.clone());
const lawnMesh = st.children.find(o => o.isMesh && o.material.vertexColors);
const snow = mesh(new THREE.PlaneGeometry(220, 120), new THREE.MeshStandardMaterial({ color: '#eef2f8', roughness: 0.9, transparent: true, opacity: 0 }), false, true); snow.rotation.x = -Math.PI / 2; snow.position.set(0, 0.035, -6); st.add(snow);
const SUMMER = new THREE.Color('#4e9a3a'), WINTER = new THREE.Color('#e8eef4'), SPRING = new THREE.Color('#f0b8d0');
const fogNight = new THREE.Color('#1a2038'), fogDay = new THREE.Color('#c8d8ec');
// day: 0 night … 1 noon; season: 0 fall, 1 winter, 2 spring, 3 summer (fractions blend)
function setEnv(day, season = 0) {
  skyMesh.material.map = day > 0.5 ? daySky : nightSky; skyMesh.material.color.setScalar(day > 0.5 ? 0.55 + 0.45 * day : 1 - 0.6 * day * 2);
  stars.material.opacity = 0.85 * (1 - clamp(day * 3, 0, 1)); moonS.visible = day < 0.4;
  hemi.color.set(0x5a6aa8).lerp(new THREE.Color(0xfff0e0), day); hemi.groundColor.set(0x1a1420).lerp(new THREE.Color(0x7a6a50), day); hemi.intensity = lerp(0.85, 1.1, day);
  stSun.color.set(0x9fb4ff).lerp(new THREE.Color(0xfff2dc), day); stSun.intensity = lerp(0.9, 2.6, day); stSun.position.set(lerp(-10, 8, day), lerp(14, 13, day), 9);
  st.fog.color.copy(fogNight).lerp(fogDay, day);
  winMats.forEach(m => m.emissiveIntensity = 1.6 * (1 - day));
  const sm = ((season % 4) + 4) % 4, cw = j => clamp(1 - Math.min(Math.abs(sm - j), 4 - Math.abs(sm - j)), 0, 1);   // circular: fall 0 → winter 1 → spring 2 → summer 3 → fall
  const fa = cw(0), w = cw(1), sp = cw(2), su = cw(3);
  crownMats.forEach(m => { m.color.copy(m.userData.fall).multiplyScalar(fa).add(WINTER.clone().multiplyScalar(w)).add(SPRING.clone().multiplyScalar(sp)).add(SUMMER.clone().multiplyScalar(su)); });
  snow.material.opacity = 0.92 * w; snow.visible = w > 0.01; }
setEnv(0, 0);
// =================== TRICK-OR-TREATERS: one instanced mesh per costume (merged vertex-coloured low-poly kid, ~1.2 m), re-filled every frame.
// The line runs from the front door down the steps, down the front walk, then along the sidewalk toward -x for 3 km (2 ft = 0.61 m per kid). ===================
const KID_STEP = 0.61;
const KC = (geo, col, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => { const g = geo.clone(); g.scale(sx, sy, sz); if (rx || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz))); g.translate(x, y, z);
  const n = g.index ? g.toNonIndexed() : g, c = new THREE.Color(col), a = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } n.setAttribute('color', new THREE.BufferAttribute(a, 3)); n.deleteAttribute('uv'); return n; };
const kSph = (r, w = 9, h = 7) => new THREE.SphereGeometry(r, w, h), kCap = (r, l) => new THREE.CapsuleGeometry(r, l, 2, 7), kCyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n), kCone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n), kBox = new THREE.BoxGeometry(1, 1, 1);
function kidParts(kind, skin) {
  const P = [], add = (...a) => P.push(KC(...a));
  const legs = c => { for (const x of [-0.07, 0.07]) add(kCap(0.05, 0.3), c, x, 0.22, 0); for (const x of [-0.07, 0.07]) add(kBox, '#1c1c20', x, 0.03, 0.03, 0.09, 0.06, 0.16); };
  const body = (c, w = 1) => { add(kCap(0.13, 0.22), c, 0, 0.62, 0, 1.1 * w, 1, 0.8); for (const x of [-0.17, 0.17]) add(kCap(0.045, 0.3), c, x * w, 0.6, 0.02, 1, 1, 1, 0, x > 0 ? 0.18 : -0.18); };
  const head = (hair) => { add(kSph(0.13), skin, 0, 0.98, 0, 1, 1.08, 1); add(kBox, '#1a1a1e', -0.045, 0.99, 0.12, 0.025, 0.035, 0.01); add(kBox, '#1a1a1e', 0.045, 0.99, 0.12, 0.025, 0.035, 0.01); if (hair) add(new THREE.SphereGeometry(0.138, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.03, -0.035, 1, 0.95, 1.0); add(kBox, '#b0503a', 0, 0.93, 0.125, 0.06, 0.018, 0.01); };
  const bucket = () => { add(kCyl(0.08, 0.065, 0.12, 9), '#f07a1a', 0.21, 0.36, 0.07); add(new THREE.TorusGeometry(0.06, 0.008, 4, 10, Math.PI), '#2a2a2a', 0.21, 0.42, 0.07); };
  if (kind === 'ghost') { add(kCyl(0.16, 0.3, 0.86, 12), '#f4f4f6', 0, 0.45, 0); add(kSph(0.17, 12, 9), '#f4f4f6', 0, 0.92, 0); add(kBox, '#141414', -0.055, 0.95, 0.155, 0.05, 0.07, 0.02); add(kBox, '#141414', 0.055, 0.95, 0.155, 0.05, 0.07, 0.02); bucket(); }
  else if (kind === 'witch') { legs('#1d1d22'); add(kCone(0.26, 0.55, 10), '#4a2a6a', 0, 0.36, 0); body('#4a2a6a'); head('#2a1d14'); add(kCone(0.13, 0.36, 8), '#18181c', 0, 1.27, 0, 1, 1, 1, -0.12); add(kCyl(0.24, 0.24, 0.02, 12), '#18181c', 0, 1.09, 0); add(kCyl(0.135, 0.135, 0.035, 10), '#7a3aa8', 0, 1.115, 0); bucket(); }
  else if (kind === 'pumpkin') { legs('#1d1d22'); add(kSph(0.27, 12, 9), '#ec7a1e', 0, 0.58, 0, 1, 0.85, 1); add(kSph(0.06, 6, 5), '#ec7a1e', 0.2, 0.6, 0.05); head('#4a2f1b'); add(kCyl(0.03, 0.04, 0.09, 5), '#4b6a22', 0, 1.15, 0); bucket(); }
  else if (kind === 'vampire') { legs('#151518'); body('#151518'); add(kBox, '#8a1020', 0, 0.62, -0.13, 0.4, 0.62, 0.03); add(kBox, '#8a1020', 0, 0.86, -0.08, 0.38, 0.14, 0.04); head('#111114'); bucket(); }
  else if (kind === 'skeleton') { legs('#18181c'); body('#18181c'); for (let i = 0; i < 4; i++) add(kBox, '#f0f0ea', 0, 0.54 + i * 0.07, 0.11, 0.2 - i * 0.012, 0.025, 0.01); add(kBox, '#f0f0ea', 0, 0.64, 0.115, 0.03, 0.3, 0.01); add(kSph(0.135), '#f2f0ea', 0, 0.98, 0, 1, 1.08, 1); add(kBox, '#141414', -0.05, 1.0, 0.125, 0.05, 0.05, 0.01); add(kBox, '#141414', 0.05, 1.0, 0.125, 0.05, 0.05, 0.01); bucket(); }
  else if (kind === 'cat') { legs('#18181c'); body('#18181c'); head('#18181c'); for (const x of [-0.07, 0.07]) add(kCone(0.04, 0.09, 4), '#18181c', x, 1.12, 0); add(kCap(0.02, 0.3), '#18181c', 0, 0.4, -0.16, 1, 1, 1, -0.9); bucket(); }
  else if (kind === 'princess') { legs('#e8e2f0'); add(kCone(0.27, 0.62, 12), '#e88ab8', 0, 0.36, 0); body('#e88ab8', 0.9); head('#d9b36a'); add(kCyl(0.07, 0.07, 0.05, 8), '#f0c040', 0, 1.12, 0); bucket(); }
  else if (kind === 'hero') { legs('#2a4fb0'); body('#2a4fb0'); add(kBox, '#c8202a', 0, 0.62, -0.13, 0.36, 0.55, 0.025); head('#2a1d14'); add(kBox, '#1a1a1e', 0, 0.99, 0.11, 0.2, 0.05, 0.03); bucket(); }
  return P;
}
const KINDS = ['ghost', 'witch', 'pumpkin', 'vampire', 'skeleton', 'cat', 'princess', 'hero'];
const KID_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
const KID_MAX = 5200;
const kidIM = {};
for (const k of KINDS) { const im = new THREE.InstancedMesh(mergeGeometries(kidParts(k, '#e2b490')), KID_MAT, KID_MAX); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; st.add(im); kidIM[k] = im; }
// each kid: a costume, a size, a phase; NRF-ish mix (witches and ghosts are common)
const KIDS = Array.from({ length: KID_MAX }, (_, i) => ({ kind: KINDS[[0, 1, 1, 2, 3, 4, 5, 6, 7, 0, 2, 4][(hash(i * 1.37) * 12) | 0]], s: 0.85 + 0.3 * hash(i * 2.11), ph: hash(i * 3.3) * 6.28, dx: (hash(i * 4.7) - 0.5) * 0.18 }));
// the line path: door -> steps -> walk -> sidewalk (-x). s = metres from the door. Exit path (s < 0): along the porch to the right, onto the lawn, out to the street.
const LINE = [[0, -4.95], [0, -3.7], [0, 8.6], [-1.0, 8.95], [FAR_X, 8.95]];
const EXIT = [[0, -4.95], [1.3, -4.95], [1.8, -4.0], [3.4, 8.4], [4.5, 8.95], [400, 8.95]];
const NEXT = [[-13, -5.6], [-13, 8.4], [-14, 8.95], [FAR_X, 8.95]];   // next year: the neighbor's door
function polyAt(path, s) { s = Math.max(0, s); for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1], L = Math.hypot(bx - ax, bz - az);
  if (s <= L || i === path.length - 2) { const k = s / L; return { x: lerp(ax, bx, k), z: lerp(az, bz, k), h: Math.atan2(bx - ax, bz - az) }; } s -= L; } }
const groundAt = (x, z) => (Math.abs(x) < 1.55 && z < -4.4 && z > -6) ? PORCH_Y : (Math.abs(x) < 0.85 && z < -4.08 && z >= -4.4) ? 0.36 : (Math.abs(x) < 0.85 && z < -3.76 && z >= -4.08) ? 0.18 : 0;
const _d = new THREE.Object3D();
// place the kids: front(t) = metres the line has advanced; opts: { from, n, walkIn (metres still to walk), kindAt(i, t), pop(i), droop, path }
function layoutKids(t, o) {
  for (const k of KINDS) kidIM[k].count = 0;
  const path = o.path || LINE, n = Math.min(o.n ?? KID_MAX, KID_MAX);
  for (let i = o.from || 0; i < n; i++) {
    const K = KIDS[i]; let s = i * KID_STEP - (o.adv || 0) + (o.walkIn || 0), q, moving = (o.walkIn || 0) > 0.01 || o.moving;
    if (s < 0) { if (!o.exit) continue; q = polyAt(EXIT, -s); moving = true; if (-s > 30) continue; } else q = polyAt(path, s);
    const kind = o.kindAt ? o.kindAt(i, t) : K.kind, im = kidIM[kind]; if (im.count >= KID_MAX) continue;
    const side = s >= 0 && s > 14 ? K.dx : K.dx * 0.4, x = q.x + Math.cos(q.h) * side, z = q.z - Math.sin(q.h) * side;
    const bob = moving ? Math.abs(Math.sin(t * 9 + K.ph)) * 0.05 : Math.max(0, Math.sin(t * 2 * Math.PI / (BP * 2) + K.ph)) * 0.02;   // standing kids bounce on half-time
    const p = o.pop ? o.pop(i, t) : 1, sc = K.s * p;
    _d.position.set(x, groundAt(x, z) + bob, z); _d.rotation.set((o.droop || 0) + (moving ? 0.08 : 0), (s < 0 ? q.h : q.h + Math.PI) + 0.15 * Math.sin(K.ph)   /* in line: facing the door */, 0.04 * Math.sin(t * 3 + K.ph), 'YXZ');
    _d.scale.setScalar(sc); _d.updateMatrix(); im.setMatrixAt(im.count++, _d.matrix); }
  for (const k of KINDS) kidIM[k].instanceMatrix.needsUpdate = true; }
function hideKids() { for (const k of KINDS) kidIM[k].count = 0; }
// =================== US MAP (us-atlas states-albers: x right, y down, 975 x 610 → map plane x, z): dark slab, state borders, 14k glowing kid dots
// (population-weighted: metro gaussians + every state's area by its population) that fly to YOUR HOUSE; then the 15,500-mile line zig-zagging NYC <-> LA. ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#070a14');
const mapCam = new THREE.PerspectiveCamera(30, W / H, 5, 9000);
mapScene.add(new THREE.HemisphereLight(0x9fb0d0, 0x101018, 1.1)); { const k = new THREE.DirectionalLight(0xc8d4ff, 1.4); k.position.set(-300, 900, 700); mapScene.add(k); }
const MW = 975, MH = 610, toMap = (x, y, h = 11) => V3(x - MW / 2, h, y - MH / 2);
const STATE_POP = { Alabama: 5.0, Arizona: 7.2, Arkansas: 3.0, California: 39.5, Colorado: 5.8, Connecticut: 3.6, Delaware: 1.0, 'District of Columbia': 0.69, Florida: 21.5, Georgia: 10.7, Idaho: 1.8, Illinois: 12.8, Indiana: 6.8, Iowa: 3.2, Kansas: 2.9, Kentucky: 4.5, Louisiana: 4.7, Maine: 1.4, Maryland: 6.2, Massachusetts: 7.0, Michigan: 10.1, Minnesota: 5.7, Mississippi: 3.0, Missouri: 6.2, Montana: 1.1, Nebraska: 2.0, Nevada: 3.1, 'New Hampshire': 1.4, 'New Jersey': 9.3, 'New Mexico': 2.1, 'New York': 20.2, 'North Carolina': 10.4, 'North Dakota': 0.78, Ohio: 11.8, Oklahoma: 4.0, Oregon: 4.2, Pennsylvania: 13.0, 'Rhode Island': 1.1, 'South Carolina': 5.1, 'South Dakota': 0.89, Tennessee: 6.9, Texas: 29.1, Utah: 3.3, Vermont: 0.64, Virginia: 8.6, Washington: 7.7, 'West Virginia': 1.8, Wisconsin: 5.9, Wyoming: 0.58 };
let HOUSE = toMap(560, 300), NYC = toMap(870, 216), LA = toMap(86, 364);
const DOTS = 14000; let dotGeo, dotPts, zig, zigLen = 0;
const dotMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uConv: { value: 0 }, uHouse: { value: V3() }, uSize: { value: 5 }, uFade: { value: 1 } },
  vertexShader: `attribute vec3 aEnd; attribute float aDel; uniform float uT, uConv, uSize; uniform vec3 uHouse; varying float vA;
    void main(){ float k=clamp((uConv-aDel)/0.45,0.0,1.0); k=k*k*(3.0-2.0*k); vec3 p=mix(position,aEnd,k); p.y+=sin(k*3.14159)*60.0*(0.4+aDel);
      vA=1.0-0.6*k*step(0.999,k); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=1.6*uSize*(1.0+0.6*sin(uT*7.0+aDel*40.0)*0.3)*900.0/(-mv.z); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float uFade; varying float vA; void main(){ vec2 q=gl_PointCoord-0.5; float d=dot(q,q)*4.0; float a=exp(-d*2.5)*vA*uFade; if(a<0.02) discard; gl_FragColor=vec4(vec3(1.0,0.62,0.22)*a*1.6,a); }` });
async function buildMap() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii', 'Puerto Rico'].includes(g.properties.name));
  const merged = topojson.merge(topo, L48), shapes = [];
  for (const poly of merged.coordinates) { const o = poly[0]; if (o.length < 8) continue; const sh = new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))));
    for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))))); shapes.push(sh); }
  const slabGeo = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 }); slabGeo.rotateX(-Math.PI / 2);
  mapScene.add(new THREE.Mesh(slabGeo, [new THREE.MeshStandardMaterial({ color: '#2c3858', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#0c101a', roughness: 0.9 })]));
  const ms = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b), pts = [];
  for (const line of ms.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; pts.push(a[0] - MW / 2, 10.4, a[1] - MH / 2, b[0] - MW / 2, 10.4, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); mapScene.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#7a86a8', transparent: true, opacity: 0.7 })));
  // rasterise states (index colour) to sample the "rural" share of the dots by state population
  const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; const feats = topojson.feature(topo, { type: 'GeometryCollection', geometries: L48 }).features;
  feats.forEach((f, i) => { g.fillStyle = `rgb(${i + 1},0,0)`; g.beginPath(); const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; for (const p of polys) for (const ring of p) ring.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); });
  const img = g.getImageData(0, 0, MW, MH).data, cells = feats.map(() => []);
  for (let y = 0; y < MH; y += 2) for (let x = 0; x < MW; x += 2) { const v = img[(y * MW + x) * 4]; if (v > 0 && v <= feats.length && img[(y * MW + x) * 4 + 1] === 0) cells[v - 1].push([x, y]); }
  const wts = feats.map((f, i) => cells[i].length ? (STATE_POP[f.properties.name] || 0.5) : 0), wsum = wts.reduce((a, b) => a + b, 0);
  const metros = (await (await fetch('zmap.json')).json()).metros.filter(m => !['Honolulu', 'Anchorage'].includes(m.n)), msum = metros.reduce((a, m) => a + m.pop, 0);
  const ny = metros.find(m => m.n === 'New York'), la = metros.find(m => m.n === 'Los Angeles'), kc = metros.find(m => m.n === 'Kansas City');
  NYC = toMap(ny.x * 2, ny.y * 2); LA = toMap(la.x * 2, la.y * 2); HOUSE = toMap(kc.x * 2 + 18, kc.y * 2 + 4);
  const pos = new Float32Array(DOTS * 3), end = new Float32Array(DOTS * 3), del = new Float32Array(DOTS); let mr2 = 99; const r2 = () => (mr2 = (mr2 * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < DOTS; i++) { let x, y;
    if (r2() < 0.55) { let u = r2() * msum, m = metros[0]; for (const mm of metros) { u -= mm.pop; if (u <= 0) { m = mm; break; } } const sg = 3 + 2.2 * Math.sqrt(m.pop), a = r2() * 6.283, r = sg * Math.sqrt(-2 * Math.log(r2() + 1e-6));
      x = m.x * 2 + Math.cos(a) * r; y = m.y * 2 + Math.sin(a) * r; const v = img[((y | 0) * MW + (x | 0)) * 4]; if (!(v > 0)) { x = m.x * 2; y = m.y * 2; } }
    else { let u = r2() * wsum, s = 0; for (; s < wts.length; s++) { u -= wts[s]; if (u <= 0) break; } const c = cells[Math.min(s, cells.length - 1)]; const p = c[(r2() * c.length) | 0] || [480, 300]; x = p[0] + r2() * 2; y = p[1] + r2() * 2; }
    const p0 = toMap(x, y, 12), a = r2() * 6.283, rr = 5 * Math.sqrt(r2()); pos.set([p0.x, p0.y, p0.z], i * 3); end.set([HOUSE.x + Math.cos(a) * rr, 13, HOUSE.z + Math.sin(a) * rr], i * 3);
    del[i] = 0.55 * Math.hypot(p0.x - HOUSE.x, p0.z - HOUSE.z) / 700 + 0.05 * r2(); }
  dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dotGeo.setAttribute('aEnd', new THREE.BufferAttribute(end, 3)); dotGeo.setAttribute('aDel', new THREE.BufferAttribute(del, 1));
  dotPts = new THREE.Points(dotGeo, dotMat); dotPts.frustumCulled = false; mapScene.add(dotPts); dotMat.uniforms.uHouse.value.copy(HOUSE);
  // the line of kids as a glowing ribbon: NYC -> LA -> NYC … 5.6 legs, each leg in its own lane so the loops stay readable
  const legs = 5.57, dir = LA.clone().sub(NYC), L = dir.length(), nrm = V3(-dir.z, 0, dir.x).normalize(), path = [];
  for (let k = 0; k <= Math.ceil(legs); k++) { const off = (k - legs / 2) * 7.5, A = (k % 2 ? LA : NYC).clone().addScaledVector(nrm, off); path.push(A); }
  const last = path.length - 1, frac = legs - Math.floor(legs); path[last] = path[last - 1].clone().lerp(path[last], frac);
  const curve = new THREE.CurvePath(); for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1]; curve.add(new THREE.LineCurve3(a.clone().setY(13), b.clone().setY(13))); }
  zig = new THREE.Mesh(new THREE.TubeGeometry(curve, 1400, 2.4, 5, false), new THREE.MeshBasicMaterial({ color: '#ffb048', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  zigLen = zig.geometry.index.count; zig.geometry.setDrawRange(0, 0); mapScene.add(zig); }
// the house pin
const pin = new THREE.Group(); { const h = mesh(new THREE.ConeGeometry(5, 14, 4), new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff7a1a', emissiveIntensity: 0.8, flatShading: true })); h.rotation.x = Math.PI; h.position.y = 18; pin.add(h);
  const ring = mesh(new THREE.RingGeometry(6, 8, 24), new THREE.MeshBasicMaterial({ color: '#ffb048', transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 11.5; pin.add(ring); pin.userData.ring = ring; }
mapScene.add(pin);
// =================== THE STORY on the beat grid: props (bowl, candy pile, trucks, the last kid), shots, captions/HUD, render ===================
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const H_ = p => headOf(p), fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
// ---- you at the door with the candy bowl ----
const HERO_Z = -5.5;
const bowl = new THREE.Group(); { const b = mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#f08a2a', { roughness: 0.6, side: THREE.DoubleSide })); bowl.add(b);
  const cc = ['#e8463a', '#f4c430', '#5a3a2a', '#3a6ad8', '#f4f4f0', '#8a3aa8']; for (let i = 0; i < 26; i++) { const a = hash(i) * 6.28, r = 0.15 * Math.sqrt(hash(i * 1.7)); const c = bx(0.07, 0.022, 0.04, cc[i % 6], Math.cos(a) * r, -0.035 + 0.03 * hash(i * 2.3), Math.sin(a) * r, bowl); c.rotation.set(hash(i * 3) * 0.6, hash(i * 4) * 3, 0); } }
st.add(bowl);
// ---- the last kid: a teenager (14 -> almost 18) in a vampire cape, taller than you ----
const teen = makeBlock({ head: 'human', body: 'human', skin: '#d8a47e', hair: '#2a1d14', top: '#151518', bottom: '#1d1d22', shoe: '#1b1b1b', hairStyle: 'short', headS: 0.88, h: 1.1 }); st.add(teen.outer);
{ const cape = bx(0.5, 0.95, 0.03, M('#8a1020', { roughness: 0.6 }), 0, 1.02, -0.17, teen.torso); const col = bx(0.52, 0.16, 0.06, M('#8a1020'), 0, 1.5, -0.12, teen.torso);
  const pail = new THREE.Group(); pail.add(mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.16, 10), M('#f07a1a'))); teen.elbows[1].add(pail); pail.position.set(0, -0.36, 0.05); }
// ---- candy pile on the lawn (41 million bars, shown as 2,600) ----
const PILE = V3(-2.7, 0, 1.4), CANDY_N = 2600;
const candyIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.05, 0.08), new THREE.MeshStandardMaterial({ roughness: 0.45, flatShading: true }), CANDY_N); candyIM.castShadow = true; candyIM.receiveShadow = true; st.add(candyIM);
const CANDY = []; { const c = new THREE.Color(), cols = ['#e8463a', '#f4c430', '#5a3a2a', '#3a6ad8', '#f4f4f0', '#8a3aa8', '#2a9a5a', '#f08a2a'];
  for (let i = 0; i < CANDY_N; i++) { const u = (i + 0.5) / CANDY_N, r = 1.9 * Math.sqrt(1 - Math.pow(1 - u, 0.8)) * Math.sqrt(hash(i * 1.3)), a = hash(i * 2.9) * 6.283;
    const h = 1.25 * Math.max(0, 1 - r / 1.95) * (0.75 + 0.25 * hash(i * 5.1)) + 0.03; CANDY.push({ x: PILE.x + Math.cos(a) * r, z: PILE.z + Math.sin(a) * r * 0.9, y: h * Math.min(1, 0.25 + u * 1.2), rx: hash(i * 3.7) * 3, ry: hash(i * 4.1) * 6, d: hash(i * 6.1) }); candyIM.setColorAt(i, c.set(cols[i % 8])); }
  CANDY.sort((a, b) => a.y - b.y); }
function updateCandy(t, on) { candyIM.visible = on; if (!on) return; const t0 = P4 - 0.1, t1 = beat(57); let n = 0;
  for (let i = 0; i < CANDY_N; i++) { const C = CANDY[i], ti = lerp(t0, t1, Math.pow(i / CANDY_N, 0.85)) + 0.12 * C.d, k = clamp((t - ti) / 0.45, 0, 1); if (k <= 0) continue;
    _d.position.set(C.x, C.y + 5 * (1 - k * k), C.z); _d.rotation.set(C.rx + (1 - k) * 4, C.ry, 0); _d.scale.setScalar(1); _d.updateMatrix(); candyIM.setMatrixAt(n++, _d.matrix); }
  candyIM.count = n; candyIM.instanceMatrix.needsUpdate = true; }
// ---- 35 semi trucks lined up down the street (1.5 million lb at ~44,000 lb each) ----
const TRUCKS = []; { const side = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#f07a1a'; g.fillRect(0, 92, w, 16); g.fillStyle = '#2a1a3a'; g.font = '700 70px Inter'; g.textAlign = 'center'; g.fillText('CANDY', w / 2, 76); });
  const trailerM = [M('#f6f2ea'), M('#f6f2ea'), M('#f6f2ea'), M('#e8e4dc'), new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 })];
  const tg = new THREE.BoxGeometry(14, 3.6, 2.6); tg.rotateY(Math.PI / 2);
  for (let i = 0; i < 35; i++) { const g = new THREE.Group(); g.position.set(-14 - i * 21, 0, 12.0); g.rotation.y = -Math.PI / 2; st.add(g);
    const tr = new THREE.Mesh(tg, [trailerM[4], trailerM[5], trailerM[0], trailerM[1], trailerM[2], trailerM[3]]); tr.position.set(0, 2.35, -3.0); tr.castShadow = true; g.add(tr);
    const cab = ['#c8302a', '#2a5aa8', '#f0b030', '#3a8a5a'][i % 4]; rb(2.5, 2.4, 3.2, M(cab, { roughness: 0.4, metalness: 0.3 }), 0, 1.75, 5.9, g, 0.2); rb(2.3, 0.9, 0.08, M('#1e2a36', { roughness: 0.1, metalness: 0.5 }), 0, 2.45, 7.52, g, 0.03);
    for (const z of [6.6, 2.4, -6.5, -8.1]) for (const x of [-1.15, 1.15]) { const w = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 10), M('#1c1e24')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); }
    for (const x of [-0.85, 0.85]) { const hl = mesh(new THREE.BoxGeometry(0.4, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: '#fff6d8' })); hl.position.set(x, 1.0, 7.52); g.add(hl); }
    g.visible = false; TRUCKS.push(g); } }
function updateTrucks(t, on) { TRUCKS.forEach((g, i) => { const ti = beat(58) + Math.floor(i / 2) * BP / 4; g.visible = on && t >= ti; if (g.visible) { const k = clamp((t - ti) / 0.25, 0, 1); g.position.y = 9 * (1 - k) * (1 - k); } }); }
// ---- per-frame world state ----
let PORCH_ON = 1;
function lights(on) { porchL.intensity = 9 * on; doorL.intensity = 14 * on; porchLamp.material.emissiveIntensity = 0.6 * on + 0.02; jackMat.emissiveIntensity = 2.4 * on + 0.05; }
const advAt = t => t < beat(31) ? 0 : t < BRK ? (t - beat(31)) / 3 * KID_STEP : t < BLD ? (BRK - beat(31)) / 3 * KID_STEP + Math.pow((t - BRK) / (BLD - BRK), 1.25) * 70 : (BRK - beat(31)) / 3 * KID_STEP + 70 + (t - BLD) / 3 * KID_STEP;
function heroPose(t, how) { const P = hero; poseReset(P, t); place(P, 0, HERO_Z, 0, PORCH_Y);
  P.arms.forEach((a, i) => a.rotation.set(-0.75, 0, i ? 0.22 : -0.22)); P.elbows.forEach(e => e.rotation.x = -0.75);
  let give = 0; if (how === 'give') give = Math.max(0, Math.sin(((t - beat(31)) / 3) * Math.PI * 2)); else if (how === 'fast') give = Math.max(0, Math.sin(t * 14));
  if (give > 0) { P.arms[1].rotation.set(-0.75 - 0.6 * give, 0, 0.1); P.elbows[1].rotation.x = -0.75 + 0.55 * give; }
  P.outer.updateMatrixWorld(true); bowl.visible = how !== 'nobowl'; bowl.position.copy(P.outer.localToWorld(V3(-0.03, 0.12, 0.36))); bowl.rotation.y = 0; }
function update(t, shot) {
  setEnv(0, 0); lights(1); bowl.visible = true; teen.outer.visible = false; zig && (zig.visible = false);
  const tl = t >= BRK && t < BLD;   // time-lapse: 1,424 days at one day per 2 beats … seasons roll through 3.9 years
  if (tl) { const k = (t - BRK) / (BLD - BRK), day = 0.5 - 0.5 * Math.cos((t - BRK) / (2 * BP) * Math.PI * 2); setEnv(day * 0.95, k * 3.9 * 4); }
  heroPose(t, t >= beat(31) && t < BRK ? 'give' : tl ? 'fast' : t >= DROP2 ? 'hold' : 'hold');
  hero.face(t < beat(26) ? 'happy' : t < DROP ? 'surprised' : t < BRK ? 'worried' : tl ? (Math.floor((t - BRK) / BP) % 3 ? 'sleepy' : 'worried') : t < DROP2 ? 'sleepy' : t < beat(110) ? 'surprised' : t < P8 ? 'smirk' : 'proud', t);
  updateCandy(t, t >= P4 && t < BRK); updateTrucks(t, t >= beat(58) && t < BRK);
  // kids
  if (t < beat(26)) hideKids();
  else if (t < DROP) { const w = 42 * (1 - ease(clamp((t - beat(26)) / (beat(31) - beat(26)), 0, 1))); layoutKids(t, { walkIn: w, adv: 0 }); }
  else if (t < BLD) layoutKids(t, { adv: advAt(t), exit: true, moving: tl });
  else if (t < DROP2) { const wave = (i, t0) => t0 + i * 0.0009; const kindAt = (i, tt) => tt >= wave(i, beat(90)) && tt < beat(94) ? 'ghost' : tt >= wave(i, BLD) && tt < beat(94) ? 'witch' : KIDS[i].kind;
    layoutKids(t, { adv: advAt(t), exit: true, kindAt, pop: (i, tt) => tt < beat(94) ? pop(tt, tt >= wave(i, beat(90)) ? wave(i, beat(90)) : wave(i, BLD), 0.25) : 1 }); }
  else if (t < beat(118)) hideKids();
  else layoutKids(t, { path: NEXT, adv: (t - beat(118)) * 1.3 + 2, moving: true, n: 400 });
  // the last kid: walks up to the door, gets told he's too old, leaves
  if (t >= DROP2 - 0.5 && t < beat(118)) { const P = teen; poseReset(P, t); P.outer.visible = true; const z0 = 4.0, z1 = HERO_Z + 0.72;
    if (t < beat(101)) { const k = clamp((t - DROP2 + 0.5) / (beat(101) - DROP2 + 0.5), 0, 1), z = lerp(z0, z1, k); place(P, 0, z, Math.PI, groundAt(0, z)); if (k < 1) poseWalk(P, t * 9, 1); }
    else if (t < P8 + 0.6) { place(P, 0, z1, Math.PI, PORCH_Y); P.arms[1].rotation.set(-0.9, 0, 0); P.elbows[1].rotation.x = -0.5; }
    else { const k = clamp((t - P8 - 0.6) / 3.2, 0, 1), z = lerp(z1, 6, k); place(P, 0.05, z, k > 0.02 ? 0 : Math.PI, groundAt(0, z)); poseWalk(P, t * 7, 0.8); P.torso.rotation.x = 0.25; }
    P.face(t < beat(110) ? 'smirk' : 'sad', t); }
  if (t >= beat(116)) { const k = clamp((t - beat(116)) / 0.12, 0, 1); lights(1 - k); }
  // map
  if (dotPts) { dotMat.uniforms.uT.value = t; dotMat.uniforms.uConv.value = clamp((t - P2) / (beat(26) - P2 - 0.3), 0, 1.6); }
  if (zig) { zig.visible = t >= beat(42) && t < P4; zig.geometry.setDrawRange(0, Math.floor(zigLen * ease(clamp((t - beat(42) - 0.2) / (P4 - beat(42) - 0.7), 0, 1)) / 3) * 3); dotPts.visible = !zig.visible; }
  pin.visible = true; pin.position.copy(HOUSE); pin.children[0].position.y = 18 + 3 * Math.abs(Math.sin(t * Math.PI / BP)); pin.userData.ring.scale.setScalar(1 + 0.6 * ((t / BP) % 1)); pin.userData.ring.material.opacity = 1 - ((t / BP) % 1); }
// ---- shots: [start, scene, camera(t)] — cut on downbeats ----
const AER = (t, a, b, k0, k1) => lerpF(a, b, ease(clamp((t - k0) / (k1 - k0), 0, 1)));
const SHOTS = [
  [0, 'st', t => lerpF(LOOK(7.5, 2.3, 15.5, 0, 1.8, -5), LOOK(5.2, 1.9, 11.0, 0, 1.7, -5), t / P1)],
  [P1, 'st', t => fr(H_(hero), V3(0.35, 0.05, 1), lerp(2.9, 2.6, (t - P1) / (beat(6) - P1)), 0.8)],
  [beat(6), 'st', t => LOOK(2.6 - 0.1 * (t - beat(6)), 0.55, -1.2, 0, 1.3, -5.2, 44)],
  [beat(10), 'map', t => LOOK(0, 2900 - 80 * (t - beat(10)), 1500, 0, 0, 40, 30)],
  [P2, 'map', t => { const k = ease(clamp((t - P2) / (beat(26) - P2), 0, 1)); return LOOK(lerp(0, HOUSE.x * 0.85, k), lerp(2650, 520, k), lerp(1400, HOUSE.z + 300, k), lerp(0, HOUSE.x, k), 0, lerp(40, HOUSE.z, k), 30); }],
  [beat(26), 'st', t => LOOK(1.7, 2.3, -4.0, -0.3, 0.8, 4.5 - 0.4 * (t - beat(26)), 42)],
  [beat(30), 'st', t => LOOK(2.6, 1.15, 12.5 - 0.3 * (t - beat(30)), -0.6, 0.9, 0, 40)],
  [DROP, 'st', t => AER(t, LOOK(2.2, 2.0, 6.0, -2, 1.0, 0, 50), LOOK(45, 120, 70, -160, 0, 9, 42), DROP, beat(37))],
  [beat(38), 'st', t => { const x = -12 - 3.2 * (t - beat(38)); return LOOK(x, 2.1, 5.6, x - 9, 0.7, 9.0, 40); }],
  [beat(42), 'map', t => LOOK(0, 3000 - 40 * (t - beat(42)), 1500, 0, 0, 20, 30)],
  [P4, 'st', t => LOOK(-0.4 - 0.1 * (t - P4), 1.5, 5.4, -2.7, 0.7, 1.3, 42)],
  [beat(54), 'st', t => LOOK(2.6, 3.4, 8.2 + 0.4 * (t - beat(54)), -1.6, 0.9, -1.2, 40)],
  [beat(58), 'st', t => LOOK(12 - 2 * (t - beat(58)), 24, 32, -90, 0, 11, 40)],
  [beat(62), 'st', t => LOOK(-8 - 4 * (t - beat(62)), 3.0, 15.4, -70, 2.0, 11.5, 38)],
  [BRK, 'st', t => LOOK(3.5, 1.75, -2.3, -0.2, 1.2, -4.6, 42)],
  [beat(74), 'st', t => LOOK(5.6, 3.1, 12.5 - 0.15 * (t - beat(74)), -0.5, 1.4, -3, 40)],
  [BLD, 'st', t => LOOK(-14 - 2 * (t - BLD), 3.0, 11.6, -36, 0.5, 8.6, 40)],
  [beat(86), 'st', t => LOOK(-28 - 1.2 * (t - beat(86)), 1.9, 6.4, -36 - 1.2 * (t - beat(86)), 0.8, 9.0, 42)],
  [beat(90), 'st', t => LOOK(-44 - 2.5 * (t - beat(90)), 3.0, 11.6, -66, 0.5, 8.6, 40)],
  [beat(94), 'st', t => { const k = clamp((t - beat(94)) / (DROP2 - beat(94)), 0, 1), x = -60 - 2700 * Math.pow(k, 2.2); return LOOK(x, 3.2 + 2 * k, 5.6, x - 22, 0.8, 9, 44); }],
  [DROP2, 'st', t => LOOK(2.8, 1.9, -1.4, 0, 1.5, -4.4 + 0.25 * (t - DROP2), 42)],
  [beat(102), 'st', t => fr(H_(teen), V3(1, 0.08, -0.62), lerp(1.55, 1.4, (t - beat(102)) / 1.8), 0.6)],
  [beat(106), 'st', t => LOOK(3.6, 1.75, -5.0, 0, 1.75, -5.15, 36)],
  [beat(110), 'st', t => fr(H_(hero), V3(0.85, 0.08, 0.55), 1.55, 0.6)],
  [P8, 'st', t => LOOK(4.8, 2.1, 11.5 - 0.3 * (t - P8), 0, 1.6, -4, 40)],
  [beat(118), 'st', t => LOOK(9 + 0.6 * (t - beat(118)), 21, 24, -7, 0, -1, 40)],
  [ENDC, 'st', t => LOOK(9 + 0.6 * (t - beat(118)), 21, 24, -7, 0, -1, 40)]];
// ambient occlusion like the groceries set; aerial shots skip it (far geometry) and push the fog out
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const gtao = new GTAOPass(st, stCam, W / 2, H / 2); gtao.renderToScreen = false; gtao.blendIntensity = 1.0;
gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, sc, cf] = SHOTS[i]; update(t, i); const F = cf(t);
  if (sc === 'map') { applyF(mapCam, F); dotMat.uniforms.uSize.value = 5; shootTo(rt, mapScene, mapCam); return; }
  applyF(stCam, F); const far = F.pos.y > 7 || F.pos.x < -40; camKey.intensity = F.pos.x < -10 ? 6 : 0.9; camKey.distance = F.pos.x < -10 ? 40 : 7; stCam.near = far ? 0.5 : 0.08; stCam.far = 6000; st.fog.near = far ? 60 : 35; st.fog.far = far ? 1400 : 220;
  if (far) { shootTo(rt, st, stCam); return; } shootTo(RTS, st, stCam); gtao.render(renderer, rt, RTS); }
// ---- DOM: title, captions (pop on the beat), HUD counters, map labels, end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[beat(10), beat(14), 'Normally, <b>41 million</b> kids…'], [beat(14), P2, '…spread out over <b>127 million</b> homes.'], [P2, beat(26), 'Tonight, every single one picks <span class="hl">your</span> house.'],
  [DROP, beat(42), 'The line is <b>15,500 miles</b> long.'], [beat(42), P4, 'That’s New York to LA… <b>5 times.</b>'],
  [P4, beat(58), 'One fun-size bar each = <b>41 million</b> bars.'], [beat(58), BRK, '<b>1.5 million lb</b> of candy. About <b>35 semi trucks.</b>'],
  [BRK, beat(74), 'At 3 seconds per kid…'], [beat(74), BLD, '…you’re at the door for <b>3.9 years.</b> Nonstop.'],
  [BLD, beat(90), '<b>1.7 million</b> witches.'], [beat(90), beat(94), '<b>1.6 million</b> ghosts.'], [beat(94), DROP2, 'And the last kid in line…'],
  [DROP2, beat(102), '…rings your bell in <b>2030.</b>'], [beat(102), beat(106), 'He was 14 when he got in line.'], [beat(106), beat(110), 'Now he’s almost 18.'], [beat(110), P8, 'Too old for candy.'],
  [P8, beat(118), 'Next year: porch light <b>OFF.</b>'], [beat(118), ENDC, 'Sorry, kids.']];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function hudAt(t) {
  const cnt = (a, b, v0, v1, f = x => x) => f(lerp(v0, v1, ease(clamp((t - a) / (b - a), 0, 1))));
  if (t >= beat(26) && t < DROP) return ['KIDS AT YOUR DOOR', fmt(Math.exp(cnt(beat(26), DROP - 0.1, 0, Math.log(41e6)))), 'U.S. CENSUS: AGES 5–14'];
  if (t >= DROP && t < beat(42)) return ['LINE LENGTH', fmt(cnt(DROP, beat(40), 0, 15530)) + ' mi', 'MODEL: 2 FT PER KID'];
  if (t >= P4 && t < beat(58)) return ['CANDY', fmt(cnt(P4, beat(57), 0, 41e6)) + ' bars', 'MODEL: 1 FUN-SIZE BAR PER KID'];
  if (t >= beat(58) && t < BRK) return ['SEMI TRUCKS', fmt(cnt(beat(58), beat(58) + 17 * BP / 4 + 0.2, 1, 35, Math.floor)), '≈1.5 MILLION LB · ~44,000 LB PER TRUCK'];
  if (t >= BRK && t < BLD) { const k = clamp((t - BRK) / (BLD - BRK - 0.3), 0, 1), days = 1 + k * 1423, m = 10 + Math.floor(days / 30.44); return ['DAY ' + fmt(days), `${MON[m % 12]} ${2026 + Math.floor(m / 12)}`, 'MODEL: 3 SECONDS PER KID, NO SLEEP']; }
  if (t >= DROP2 && t < beat(102)) return ['', 'SEP 2030', ''];
  return null; }
function labelsAt(t, shot) { if (SHOTS[shot][1] !== 'map') return ''; mapCam.updateMatrixWorld(); const out = [];
  const tag = (p, txt, dy = 30) => { const v = p.clone().setY(30).project(mapCam); out.push(`<div class="lb" style="left:${clamp((v.x + 1) / 2 * W, 190, 890).toFixed(0)}px;top:${((1 - v.y) / 2 * H - dy).toFixed(0)}px">${txt}</div>`); };
  if (t < beat(42)) tag(HOUSE, 'YOUR HOUSE', 46); else { tag(NYC, 'NEW YORK'); tag(LA, 'LOS ANGELES'); } return out.join(''); }
function updateDOM(t, shot) {
  const ti = fadeWin(t, 0, beat(10), 0.25); el.title.style.opacity = ti;
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = h[0] ? '<b></b>' + h[0] : ''; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.labels.innerHTML = labelsAt(t, shot);
  const e = smooth(ENDC, ENDC + 0.35, t); el.end.style.opacity = e * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(beat(124), beat(124) + 0.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  stCam.updateMatrixWorld(); shoot(i, t, RTA); compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildMap();
  for (const p of [hero, teen]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
