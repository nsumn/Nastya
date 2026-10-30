import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "What if EVERYONE disappeared… except you and your best friend?" (her idea, Oct 30 2026). Classic captions + music, funny. The cast: you (the approved hero)
// and the friend (shorter, chubby body + own round head, ginger curls, red tee). Facts: Census housing units 2024 (146.8M), FHWA vehicles 2024 (298M),
// Weisman "The World Without Us" (NYC subway pumps ~13M gal/day, flooding within ~2 days), fuel shelf life 3–6 months; power grid "within days" (no firm number).
// =================== timeline (s) — cuts on a 120 BPM grid ===================
const GONE = 4.0, HOMES = 9.0, MARKET = 15.0, CAR = 21.0, GRID = 27.0, SUBWAY = 33.0, ROT = 39.0, GAS = 45.0, PRES = 51.0, COUCH = 56.5, ENDC = 60.5, T_END = 64.0;
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
// =================== THE STREET (g_world, autumn afternoon): you + your friend on the front walk; neighbors walking by and cars driving past vanish in puffs ===================
for (const o of [nb1.outer, nb2.outer, carKeys, eggDrop, ...BAGS, ...eggs, ...splats]) o.visible = false;   // (makeBlock returns {outer, …})
car.traverse(o => { if (o.isGroup && Math.abs(o.rotation.x + 1.25) < 0.01) o.rotation.x = 0; });   // close the SUV hatch
const friend = makeBlock({ head: 'human', body: 'human', fat: true, chubbyHead: true, skin: '#f4caa0', hair: '#c8642a', browCol: '#a04a1e', top: '#d8342a', jeans: true, bottom: '#3d5f8f', shoe: '#2a2a2e', hairStyle: 'mop', freckles: true, eyeS: 0.8, browW: 1.5, blush: 0.6, headS: 0.95, h: 0.86 });
st.add(friend.outer);
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
// a low-poly car body (used on the street, the highway and as wrecks): body, cabin, glass, 4 wheels
function makeCar(col, o = {}) { const g = new THREE.Group(), pm = M(col, { roughness: 0.35, metalness: 0.3, flatShading: true }), dark = M('#1c1e24', { flatShading: true });
  const L = o.L || 4.2, Wd = o.W || 1.8; rb(Wd, 0.7, L, pm, 0, 0.7, 0, g, 0.15); rb(Wd - 0.15, 0.55, L * 0.52, pm, 0, 1.28, -0.1, g, 0.14); rb(Wd - 0.12, 0.42, L * 0.48, M('#2a3440', { roughness: 0.1, flatShading: true }), 0, 1.3, -0.1, g, 0.1);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(x * (Wd / 2 - 0.08), 0.34, z * L * 0.31); g.add(w); }
  for (const x of [-0.6, 0.6]) { const hl = mesh(new THREE.BoxGeometry(0.34, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: '#fff6d8' })); hl.position.set(x, 0.85, L / 2 + 0.01); g.add(hl); }
  return g; }
// neighbors walking on the sidewalk + cars on the road (all vanish between 1.4 s and 3.6 s)
const walkers = [];
{ const r0 = seed; seed = 777;
  for (let i = 0; i < 7; i++) { const p = makePerson(rnd); p.outer.scale.setScalar(1.0); st.add(p.outer); walkers.push({ p, x0: -14 + i * 4.6 + R(-1, 1), z: 8.6 + R(-0.4, 0.5), dir: i % 2 ? 1 : -1, sp: R(1.0, 1.4), ph: R(0, 6), tv: 1.4 + i * 0.3 }); }
  seed = r0; }
const movers = [['#3a6ab8', -30, 12.0, 1, 1.6], ['#e8e4dc', 26, 15.2, -1, 2.3], ['#c8402a', -45, 12.0, 1, 3.0]].map(([c, x0, z, dir, tv]) => { const g = makeCar(c); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; st.add(g); return { g, x0, z, dir, tv }; });
const puffTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 64 + Math.cos(i * 0.7) * 26 * (i % 3) / 2, y = 64 + Math.sin(i * 1.3) * 22 * (i % 3) / 2, r = 26 + 8 * (i % 3), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
const puffs = []; function puffAt(scene, pos, t, t0, size = 1.6) { const k = (t - t0) / 0.7; if (k < 0 || k > 1) return; let s = puffs.find(p => !p.used && p.scene === scene);
  if (!s) { s = { scene, sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })) }; scene.add(s.sp); puffs.push(s); }
  s.used = true; s.sp.visible = true; s.sp.position.copy(pos); s.sp.scale.setScalar(size * (0.5 + 1.2 * Math.sqrt(k))); s.sp.material.opacity = (1 - k) * (1 - k); s.sp.material.rotation = k * 0.8; }
function puffsReset() { puffs.forEach(p => { p.used = false; p.sp.visible = false; }); }
function updateStreet(t) {
  walkers.forEach(w => { const gone = t >= w.tv; w.p.outer.visible = !gone; const x = w.x0 + w.dir * w.sp * t; w.p.outer.position.set(x, 0.95, w.z); w.p.outer.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; poseWalk(w.p, t * 7 + w.ph, 1);
    puffAt(st, V3(x, 1.0, w.z), t, w.tv, 1.8); });
  movers.forEach(m => { const x = m.x0 + m.dir * 11 * Math.min(t, m.tv); m.g.position.set(x, 0, m.z); m.g.visible = t < m.tv; puffAt(st, V3(x, 1.0, m.z), t, m.tv, 4.5); }); }
// =================== THE OTHER SETS (each its own scene + camera; you and the friend are re-parented into whichever scene is being shot) ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false })));
  sc.fog = new THREE.Fog(fog, near, far); sc.add(new THREE.HemisphereLight(...hemi));
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 80 }); sc.add(s, s.target); sc.userData.sun = s;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D();
// ---------- 1) SUBURB from above: 73 million homes each (a grid of houses that splits into yours / his), then a parking lot of cars ----------
const BURB = mkSet({ top: '#5a8ad0', bot: '#f0d8c0', fog: 0xe8d8c8, near: 120, far: 900, shadow: 60 });
const burbIM = {}; {
  const sc = BURB.sc; gplane(sc, 3000, 3000, '#8aa648', 0, 0, -0.02);
  const NX = 44, NZ = 44, N = NX * NZ, walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), F_('#ffffff'), N), roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1, 4), F_('#ffffff'), N);
  roofs.geometry.rotateY(Math.PI / 4); let k = 0; const c = new THREE.Color();
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const x = (i - NX / 2) * 16, z = (j - NZ / 2) * 15; if (j % 4 === 3) continue; const w = 7 + 2 * hash(i * 3 + j), h = 3 + hash(i + j * 7);
    _o.position.set(x, h / 2, z); _o.scale.set(w, h, 6); _o.rotation.set(0, 0, 0); _o.updateMatrix(); walls.setMatrixAt(k, _o.matrix); walls.setColorAt(k, c.set(['#f0ece2', '#e8d4a8', '#a8c4d8', '#d8a87a', '#b8cca0'][(hash(i * 1.3 + j * 2.1) * 5) | 0]));
    _o.position.set(x, h + 1.0, z); _o.scale.set(w * 1.25, 2.0, 7.8); _o.updateMatrix(); roofs.setMatrixAt(k, _o.matrix); roofs.setColorAt(k, c.set('#5a5a62')); k++; }
  walls.count = roofs.count = k; walls.castShadow = roofs.castShadow = true; walls.receiveShadow = true; sc.add(walls, roofs); burbIM.walls = walls; burbIM.roofs = roofs; burbIM.n = k;
  for (let j = 0; j < NZ; j += 4) gplane(sc, NX * 16, 7, '#5c5e66', 0, (j + 3 - NZ / 2) * 15, 0.01);
  // parking lot (far east): rows of cars
  gplane(sc, 300, 260, '#5c5e66', 900, 0, 0.01); const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.3, 4.2), F_('#ffffff', { roughness: 0.4 }), 60 * 26);
  let n = 0; for (let i = 0; i < 60; i++) for (let j = 0; j < 26; j++) { _o.position.set(900 + (i - 30) * 4.6, 0.65, (j - 13) * 9.5); _o.scale.set(1, 1, 1); _o.updateMatrix(); cars.setMatrixAt(n, _o.matrix); cars.setColorAt(n, c.set(['#e8e4dc', '#2a2c32', '#8a8c92', '#3a5a9a', '#c8402a'][(hash(i * 7.1 + j) * 5) | 0])); n++; }
  cars.castShadow = true; sc.add(cars); burbIM.cars = cars; burbIM.carCol = Array.from({ length: n }, (_, i) => { const cc = new THREE.Color(); cars.getColorAt(i, cc); return cc; });
  burbIM.roofCol = null; }
const YOURS = new THREE.Color('#f08a2a'), HIS = new THREE.Color('#d8342a');
function updateBurb(t) { const c = new THREE.Color(), wipe = smooth(HOMES + 0.4, HOMES + 2.2, t), wc = smooth(HOMES + 3.2, HOMES + 4.6, t);
  for (let k = 0; k < burbIM.n; k++) { burbIM.roofs.getMatrixAt(k, _o.matrix); _o.matrix.decompose(_o.position, _o.quaternion, _o.scale); const u = (_o.position.x + 352) / 704;
    c.set('#5a5a62'); if (Math.abs(u - 0.5) < wipe * 0.5) c.copy(u < 0.5 ? YOURS : HIS); burbIM.roofs.setColorAt(k, c); }   // the split grows from the middle: left = yours, right = his
  burbIM.roofs.instanceColor.needsUpdate = true;
  for (let n = 0; n < burbIM.carCol.length; n++) { const i = Math.floor(n / 26), u = i / 59; c.copy(burbIM.carCol[n]); if (Math.abs(u - 0.5) < wc * 0.5) c.lerp(u < 0.5 ? YOURS : HIS, 0.85); burbIM.cars.setColorAt(n, c); }
  burbIM.cars.instanceColor.needsUpdate = true; }
// ---------- 2) SUPERMARKET aisle: shelves of products, ceiling lights, a cart; produce stand + cans for the "rot" beat ----------
const MKT = mkSet({ top: '#f4f4f0', bot: '#f4f4f0', fog: 0xf0f0ea, near: 30, far: 90, hemi: [0xffffff, 0xb0a890, 1.3], sun: [0xfff8f0, 1.0, V3(4, 12, 6)], shadow: 14 });
const MK = {}; {
  const sc = MKT.sc; const tile = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#cfccc4'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [40, 40]);
  gplane(sc, 80, 80, new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35 }), 0, 0);
  const ceil = mesh(new THREE.PlaneGeometry(80, 80), F_('#f4f4f2'), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = 5.2; sc.add(ceil);
  for (let z = -30; z <= 30; z += 4) for (const x of [-4.5, 0, 4.5]) { const l = mesh(new THREE.BoxGeometry(0.6, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), false, false); l.position.set(x, 5.15, z); sc.add(l); }
  // two long shelf units facing the aisle at x = 0
  const prodCols = ['#e8463a', '#f4c430', '#3a6ad8', '#2a9a5a', '#f08a2a', '#8a3aa8', '#f4f4f0', '#5a3a2a', '#e86aa0', '#30b8c8'];
  const NP = 2 * 30 * 5 * 9, prods = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), F_('#ffffff', { roughness: 0.5 }), NP); let n = 0; const c = new THREE.Color();
  for (const side of [-1, 1]) { const x0 = side * 1.9;
    rb(0.9, 2.3, 30, F_('#d8d8dc'), x0 + side * 0.25, 1.15, -6, sc, 0.03);
    for (let lv = 0; lv < 5; lv++) { rb(0.62, 0.04, 30, F_('#b8b8be'), x0, 0.2 + lv * 0.46, -6, sc, 0.01);
      for (let i = 0; i < 30 * 9; i++) { const z = -21 + i * (30 / 270) + 0.05, hh = 0.2 + 0.18 * hash(i * 1.7 + lv); _o.position.set(x0 - side * 0.05, 0.22 + lv * 0.46 + hh / 2, z); _o.scale.set(0.42, hh, 0.1); _o.rotation.set(0, 0, 0); _o.updateMatrix();
        prods.setMatrixAt(n, _o.matrix); prods.setColorAt(n, c.set(prodCols[((i / 9) | 0) * 3 % 10 === 0 ? 0 : ((hash(((i / 9) | 0) * 2.3 + lv * 5.1) * 10) | 0)])); n++; } } }
  prods.count = n; prods.castShadow = true; sc.add(prods); MK.prods = prods;
  // aisle sign
  const sign = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#2a5ab8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 84px Inter'; g.textAlign = 'center'; g.fillText('3', w / 2, 98); });
  const sg = mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: sign }), false, false); sg.position.set(0, 4.2, 6.5); sc.add(sg);
  // the cart
  const cart = new THREE.Group(); const wire = F_('#b8bcc4', { metalness: 0.6, roughness: 0.3 }); rb(0.55, 0.45, 0.85, F_('#c8ccd4', { transparent: true, opacity: 0.55, metalness: 0.4 }), 0, 0.85, 0, cart, 0.02);
  for (const [x, z] of [[-0.25, -0.38], [0.25, -0.38], [-0.25, 0.38], [0.25, 0.38]]) { const w = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), M('#2a2a2e')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.06, z); cart.add(w); const lg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6), wire); lg.position.set(x, 0.38, z); cart.add(lg); }
  const hnd = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), wire); hnd.rotation.z = Math.PI / 2; hnd.position.set(0, 1.12, -0.48); cart.add(hnd);
  for (let i = 0; i < 9; i++) bx(0.2, 0.24, 0.14, prodCols[i], -0.15 + (i % 3) * 0.15, 0.8 + 0.12 * Math.floor(i / 3), -0.2 + 0.18 * (i % 2), cart).rotation.y = i;
  sc.add(cart); MK.cart = cart;
  // wrappers on the floor around the friend (they pile up)
  const wr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.01, 0.09), F_('#ffffff'), 60); for (let i = 0; i < 60; i++) { _o.position.set(-0.6 + 1.1 * hash(i * 3.3), 0.006, 1.4 + 1.2 * hash(i * 5.1)); _o.rotation.set(0, hash(i) * 6, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); wr.setMatrixAt(i, _o.matrix); wr.setColorAt(i, c.set(prodCols[i % 10])); }
  wr.count = 0; sc.add(wr); MK.wr = wr;
  // a chip bag in the friend's hand
  MK.bag = new THREE.Group(); rb(0.2, 0.28, 0.07, F_('#f4c430', { roughness: 0.4 }), 0, 0, 0, MK.bag, 0.03); bx(0.12, 0.08, 0.075, '#e8463a', 0, 0.02, 0, MK.bag);
  // the produce stand (for "week 1: the fresh food rots"): crates of apples, bananas, lettuce at the end of the aisle
  MK.fruit = []; const fruitG = new THREE.IcosahedronGeometry(0.09, 1);
  for (let k = 0; k < 3; k++) { const cx = -1.6 + k * 1.6; rb(1.3, 0.5, 0.9, F_('#a8783a'), cx, 0.65, 11.5, sc, 0.03);
    for (let i = 0; i < 40; i++) { const fm = new THREE.MeshStandardMaterial({ color: ['#d8302a', '#f4d040', '#5ab040'][k], roughness: 0.6, flatShading: true }); const f = mesh(fruitG, fm); f.position.set(cx - 0.55 + (i % 8) * 0.155, 0.97 + 0.08 * Math.floor(i / 16), 11.15 + Math.floor((i % 16) / 8) * 0.25 + 0.2 * hash(i)); if (k === 1) f.scale.set(0.7, 0.7, 1.8); f.userData.c0 = fm.color.clone(); sc.add(f); MK.fruit.push(f); } }
  // the donut (frosting turns green and fuzzy)
  MK.donut = new THREE.Group(); const dn = mesh(new THREE.TorusGeometry(0.075, 0.04, 8, 16), F_('#c88a4a')); dn.rotation.x = Math.PI / 2; MK.donut.add(dn); MK.icing = F_('#f088b8'); const ic = mesh(new THREE.TorusGeometry(0.075, 0.03, 6, 16, Math.PI * 2), MK.icing); ic.rotation.x = Math.PI / 2; ic.position.y = 0.022; MK.donut.add(ic);
  // a can of beans for "canned food? good for years"
  MK.can = new THREE.Group(); { const lab = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4e8c8'; g.fillRect(0, 34, w, 60); g.fillStyle = '#5a2a1a'; g.font = '700 40px Inter'; g.textAlign = 'center'; g.fillText('BEANS', w / 2, 78); });
    const cn = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 16), [new THREE.MeshStandardMaterial({ map: lab, roughness: 0.4 }), M('#c8ccd4', { metalness: 0.8, roughness: 0.3 }), M('#c8ccd4', { metalness: 0.8, roughness: 0.3 })]); MK.can.add(cn); } }
// ---------- 3) HIGHWAY (desert interstate): the supercar, abandoned cars, then two bikes ----------
const HWY = mkSet({ top: '#3a7ad8', bot: '#f8e0c0', fog: 0xf0d8b8, near: 80, far: 700, hemi: [0xfff4e0, 0x9a7a50, 1.15], sun: [0xfff0d0, 2.6, V3(-12, 16, 6)], shadow: 16 });
const HW = {}; {
  const sc = HWY.sc; gplane(sc, 3000, 3000, '#d8b07a', 0, 0, -0.03); gplane(sc, 14, 3000, '#4c4e56', 0, 0, 0.0);
  for (let z = -1500; z < 1500; z += 9) gplane(sc, 0.18, 3.5, '#f0ead0', 0, z, 0.006); for (const x of [-6.6, 6.6]) gplane(sc, 0.16, 3000, '#f0ead0', x, 0, 0.006);
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, r = 420 + 140 * hash(i), m = mesh(new THREE.CylinderGeometry(1, 1.3, 1, 6), F_(['#c87a4a', '#b8683a', '#d89060'][i % 3])); m.scale.set(40 + 40 * hash(i * 2), 25 + 40 * hash(i * 3), 40 + 30 * hash(i * 4)); m.position.set(Math.cos(a) * r, 12, Math.sin(a) * r); sc.add(m); }   // mesas
  for (let i = 0; i < 160; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.5, 0), F_(['#7a8a4a', '#8a9a5a', '#6a7a3a'][i % 3])); const x = (hash(i * 3.1) - 0.5) * 300; if (Math.abs(x) < 12) continue; b.position.set(x, 0.2, (hash(i * 5.7) - 0.5) * 1200); b.scale.set(1 + hash(i), 0.7, 1 + hash(i * 2)); sc.add(b); }   // sagebrush
  // abandoned cars on the shoulders, doors open, at angles
  for (let i = 0; i < 14; i++) { const g = makeCar(['#e8e4dc', '#3a5a9a', '#8a8c92', '#2a2c32', '#c8b040'][i % 5]); g.position.set((i % 2 ? 1 : -1) * (8 + 1.5 * hash(i)), 0, -40 - i * 55 + 20 * hash(i * 3)); g.rotation.y = (i % 2 ? 0.3 : -0.25) + Math.PI * (i % 3 === 0 ? 1 : 0); sc.add(g); }
  // the supercar: low orange wedge, open top (both of you visible)
  const car2 = new THREE.Group(), pm = F_('#f07a1a', { roughness: 0.3, metalness: 0.4 }), dk = F_('#1c1e24');
  rb(2.0, 0.5, 4.5, pm, 0, 0.5, 0, car2, 0.18); const nose = rb(1.95, 0.32, 1.4, pm, 0, 0.62, 1.7, car2, 0.15); nose.rotation.x = 0.12; rb(1.9, 0.42, 1.2, pm, 0, 0.82, -1.5, car2, 0.15);
  rb(1.8, 0.45, 0.08, F_('#2a3440', { roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.6 }), 0, 1.05, 0.75, car2, 0.03).rotation.x = -0.6;
  rb(1.6, 0.12, 0.4, dk, 0, 1.0, -2.05, car2, 0.04);   // spoiler
  for (const x of [-0.42, 0.42]) { rb(0.55, 0.5, 0.12, F_('#2a2a2e'), x, 0.95, -0.55, car2, 0.05); rb(0.55, 0.1, 0.6, F_('#2a2a2e'), x, 0.72, -0.25, car2, 0.04); }   // seats
  for (const [x, z] of [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]]) { const w = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 14), dk); w.rotation.z = Math.PI / 2; w.position.set(x * 0.95, 0.36, z); car2.add(w); }
  const sw = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), dk); sw.position.set(-0.42, 1.0, 0.25); sw.rotation.x = -0.5; car2.add(sw);
  sc.add(car2); HW.car = car2;
  // bikes (you: normal; the friend: tiny)
  const bike = (col) => { const g = new THREE.Group(), fm = F_(col, { roughness: 0.4 }), tb = (a, b, r = 0.025) => { const d = b.clone().sub(a), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), fm); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(m); };
    const wheels = []; for (const z of [-0.52, 0.52]) { const w = mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 20), M('#1c1e24')); w.rotation.y = Math.PI / 2; w.position.set(0, 0.36, z); g.add(w); wheels.push(w); }
    const S = V3(0, 0.95, -0.15), Hh = V3(0, 1.05, 0.42), Bb = V3(0, 0.42, 0.02); tb(V3(0, 0.36, -0.52), S); tb(S, Hh); tb(Hh, V3(0, 0.36, 0.52)); tb(Bb, S); tb(Bb, V3(0, 0.36, -0.52)); tb(S, V3(0, 0.36, 0.52));
    rb(0.14, 0.05, 0.26, M('#2a2a2e'), 0, 1.0, -0.17, g, 0.02); const hb = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M('#2a2a2e')); hb.rotation.z = Math.PI / 2; hb.position.copy(Hh).add(V3(0, 0.05, 0)); g.add(hb);
    g.userData.wheels = wheels; sc.add(g); return g; };
  HW.bikeA = bike('#2a8ad8'); HW.bikeB = bike('#e84a8a'); HW.bikeB.scale.setScalar(0.66);
  // stale-gas smoke: dark puffs from the exhaust
  HW.smoke = []; for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#3a3a3e', transparent: true, depthWrite: false })); sc.add(s); HW.smoke.push(s); } }
// ---------- 4) NYC SIDEWALK + SUBWAY ENTRANCE: stairs going down between green railings, water rising up the steps ----------
const SUB = mkSet({ top: '#7a9ac8', bot: '#e8e0d8', fog: 0xd8d4d0, near: 30, far: 160, hemi: [0xf0f0ff, 0x6a6058, 1.1], sun: [0xfff4e8, 1.8, V3(8, 16, 10)], shadow: 14 });
const SB = {}; {
  const sc = SUB.sc; gplane(sc, 200, 200, '#5a5c64', 0, 0, -0.02);   // street
  // sidewalk with a hole for the stairwell (x -1..1, z -2..2)
  const sw = F_('#b8b4ac'); for (const [w, d, x, z] of [[40, 8, 0, -7], [40, 8, 0, 7.0], [19, 4, -10.5, 0], [19, 4, 10.5, 0]]) rb(w, 0.2, d, sw, x, 0.1, z, sc, 0.02);
  for (let i = 0; i < 16; i++) { const y = 0.2 - (i + 1) * 0.19, z = -2 + i * 0.28; rb(2, 0.19, 0.3, F_('#9a968e'), 0, y + 0.095, z, sc, 0.01); }   // steps down toward +z
  rb(0.15, 3.4, 4.2, F_('#8a8680'), -1.08, -1.5, 0, sc, 0.01); rb(0.15, 3.4, 4.2, F_('#8a8680'), 1.08, -1.5, 0, sc, 0.01); rb(2.3, 3.4, 0.15, F_('#8a8680'), 0, -1.5, 2.08, sc, 0.01);
  const green = F_('#1f5a3a', { roughness: 0.5, metalness: 0.3 });
  for (const x of [-1.15, 1.15]) { rb(0.06, 0.06, 4.2, green, x, 1.05, 0, sc, 0.02); for (let z = -2; z <= 2.01; z += 0.5) rb(0.04, 0.85, 0.04, green, x, 0.62, z, sc, 0.01); }
  rb(2.36, 0.06, 0.06, green, 0, 1.05, 2.1, sc, 0.02);
  for (const x of [-1.15, 1.15]) { const p = mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2), green); p.position.set(x, 1.1, -2.05); sc.add(p); const gl = mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshStandardMaterial({ color: '#5ad08a', emissive: '#3aa060', emissiveIntensity: 0.9 })); gl.position.set(x, 2.3, -2.05); sc.add(gl); }
  const sign = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#1a1a1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '600 56px Inter'; g.textAlign = 'center'; g.fillText('SUBWAY', w / 2, 66); });
  const sgn = mesh(new THREE.BoxGeometry(2.2, 0.36, 0.06), new THREE.MeshStandardMaterial({ map: sign }), false, false); sgn.position.set(0, 1.7, -2.12); sc.add(sgn);
  // facades (behind) + a few parked cabs
  for (let i = 0; i < 9; i++) { const x = -24 + i * 6, h = 14 + 20 * hash(i), b = rb(5.8, h, 8, F_(['#b8705a', '#c8b89a', '#8a8a92', '#a87a5a'][i % 4]), x, h / 2, -15, sc, 0.05);
    const wt = canvasTex(64, 128, (g, w, hh) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, hh); g.fillStyle = '#3a4a5a'; for (let r = 0; r < 8; r++) for (let c2 = 0; c2 < 3; c2++) g.fillRect(6 + c2 * 20, 6 + r * 15, 12, 9); });
    const wm = mesh(new THREE.PlaneGeometry(5.2, h - 2), new THREE.MeshStandardMaterial({ map: wt, transparent: true }), false, false); wt.repeat.set(1, Math.round(h / 6)); wt.wrapT = THREE.RepeatWrapping; wm.position.set(x, h / 2 + 0.5, -10.98); sc.add(wm); }
  for (const x of [-8, 6]) { const cab = makeCar('#f4c430'); cab.rotation.y = Math.PI / 2; cab.position.set(x, 0, 12.5); sc.add(cab); }
  // the water: a plane inside the stairwell that rises, then a sheet spreading over the sidewalk
  SB.water = mesh(new THREE.PlaneGeometry(2.1, 4.1), new THREE.MeshStandardMaterial({ color: '#3a5a6a', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.88 }), false, true); SB.water.rotation.x = -Math.PI / 2; sc.add(SB.water);
  SB.sheet = mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: '#4a6a7a', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.75 }), false, true); SB.sheet.rotation.x = -Math.PI / 2; sc.add(SB.sheet); }
// ---------- 5) THE WHITE HOUSE (north facade): white block, portico with columns, flag, lawn, fountain; a ballot box ----------
const WH = mkSet({ top: '#4a86d8', bot: '#eaf0f8', fog: 0xdce6f0, near: 60, far: 400, sun: [0xfff4e4, 2.4, V3(8, 14, 12)], shadow: 22 });
const WHS = {}; {
  const sc = WH.sc, wm = F_('#f4f2ec', { roughness: 0.7 }); gplane(sc, 800, 800, '#6aac4c', 0, 0, -0.02); gplane(sc, 6, 60, '#d8d0c0', 0, 20, 0.01);
  rb(34, 10, 14, wm, 0, 5, -14, sc, 0.05); rb(34.5, 0.6, 14.5, wm, 0, 10.2, -14, sc, 0.05); rb(33, 1.2, 13, wm, 0, 11.1, -14, sc, 0.05);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 11; i++) { if (Math.abs(i - 5) < 2) continue; const x = -15 + i * 3; rb(1.3, 2.0, 0.1, F_('#3a4a5a', { roughness: 0.2 }), x, 3 + r * 4, -6.94, sc, 0.02); rb(1.6, 0.25, 0.3, wm, x, 4.2 + r * 4, -6.85, sc, 0.03); }
  rb(12, 0.6, 5, wm, 0, 0.3, -4.5, sc, 0.03); for (let i = 0; i < 4; i++) { const c = mesh(new THREE.CylinderGeometry(0.42, 0.48, 9.2, 12), wm); c.position.set(-4.5 + i * 3, 5.2, -2.6); sc.add(c); }
  const ped = new THREE.Shape([new THREE.Vector2(-6.4, 0), new THREE.Vector2(6.4, 0), new THREE.Vector2(0, 2.4)]); const pg = new THREE.ExtrudeGeometry(ped, { depth: 4.6, bevelEnabled: false }); const pdm = mesh(pg, wm); pdm.position.set(0, 9.8, -7.0); sc.add(pdm); rb(13, 0.6, 4.8, wm, 0, 9.8, -4.7, sc, 0.03);
  rb(2.2, 4.0, 0.2, F_('#3a4a5a'), 0, 2.6, -6.92, sc, 0.03);   // door
  const pole = mesh(new THREE.CylinderGeometry(0.08, 0.08, 6), F_('#d8d8dc', { metalness: 0.6 })); pole.position.set(0, 14.7, -14); sc.add(pole);
  const flagT = canvasTex(192, 100, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8202a'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#2a3a7a'; g.fillRect(0, 0, w * 0.4, h * 7 / 13); g.fillStyle = '#fff'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.fillRect(6 + c * 12, 5 + r * 10, 3, 3); });
  WHS.flag = mesh(new THREE.PlaneGeometry(3.0, 1.6, 12, 1), new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide, roughness: 0.8 }), false, false); WHS.flag.position.set(1.55, 16.6, -14); sc.add(WHS.flag); WHS.flag.userData.p0 = WHS.flag.geometry.attributes.position.array.slice();
  const fn = mesh(new THREE.CylinderGeometry(4, 4.2, 0.6, 24), wm); fn.position.set(0, 0.3, 14); sc.add(fn); const fw = mesh(new THREE.CircleGeometry(3.7, 24), new THREE.MeshStandardMaterial({ color: '#5a8ab8', roughness: 0.05, metalness: 0.4 })); fw.rotation.x = -Math.PI / 2; fw.position.set(0, 0.58, 14); sc.add(fw);
  for (let i = 0; i < 20; i++) { const tr = mesh(new THREE.IcosahedronGeometry(2.4, 0), F_(['#4a8a3a', '#5a9a42'][i % 2])); tr.position.set((i % 2 ? 1 : -1) * (22 + 10 * hash(i)), 3.5, -30 + i * 5); sc.add(tr); }
  // ballot box with two slips
  WHS.box = new THREE.Group(); rb(0.7, 0.6, 0.5, F_('#2a4a9a'), 0, 0.85, 0, WHS.box, 0.04); rb(0.3, 0.02, 0.05, F_('#101010'), 0, 1.16, 0, WHS.box, 0.01); rb(0.72, 0.55, 0.52, F_('#f4f2ec'), 0, 0.28, 0, WHS.box, 0.03);
  const vt = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8202a'; g.font = '700 46px Inter'; g.textAlign = 'center'; g.fillText('VOTE', w / 2, 64); });
  const vp = mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: vt })); vp.position.set(0, 0.85, 0.252); WHS.box.add(vp); WHS.box.position.set(0, 0, 9); sc.add(WHS.box);
  WHS.slips = [0, 1].map(() => { const s = mesh(new THREE.PlaneGeometry(0.16, 0.22), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide })); sc.add(s); return s; }); }
// ---------- 6) THE MANSION living room: huge room, tall windows, chandelier, fireplace, a far-too-small couch with the friend asleep ----------
const MAN = mkSet({ top: '#f8f0e4', bot: '#f8f0e4', fog: 0xf0e8dc, near: 30, far: 120, hemi: [0xfff4e8, 0x8a7a68, 1.0], sun: [0xfff0d8, 2.2, V3(-14, 10, 4)], shadow: 16 });
const MS = {}; {
  const sc = MAN.sc; const wood = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = ['#a8743e', '#b8824a', '#9a6a38', '#b07a44'][i % 4]; g.fillRect(0, i * 16, w, 16); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, i * 16 + 15, w, 1); } }, [8, 8]);
  gplane(sc, 30, 30, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5 }), 0, 0);
  const wall = F_('#efe6d6'); rb(30, 9, 0.3, wall, 0, 4.5, -8, sc, 0.02); rb(0.3, 9, 30, wall, 8, 4.5, 0, sc, 0.02);
  const winW = rb(0.3, 9, 30, wall, -8, 4.5, 0, sc, 0.02); winW.visible = true;
  for (const z of [-4.5, 0, 4.5]) { const g = mesh(new THREE.PlaneGeometry(2.6, 6.2), new THREE.MeshBasicMaterial({ color: '#dff0ff' }), false, false); g.rotation.y = Math.PI / 2; g.position.set(-7.83, 4.4, z); sc.add(g); rb(0.12, 6.4, 0.16, F_('#ffffff'), -7.82, 4.4, z, sc, 0.02); }
  const crown = F_('#ffffff'); rb(30, 0.3, 0.4, crown, 0, 8.8, -7.8, sc, 0.02);
  // fireplace
  rb(3.2, 2.4, 0.6, F_('#e8e2d6'), 2, 1.2, -7.6, sc, 0.03); rb(2.0, 1.4, 0.3, F_('#2a2420'), 2, 0.8, -7.4, sc, 0.02); rb(3.6, 0.2, 0.8, F_('#f4f0e8'), 2, 2.45, -7.55, sc, 0.03);
  const art = canvasTex(128, 96, (g, w, h) => { g.fillStyle = '#e8c88a'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a8ab8'; g.fillRect(8, 8, w - 16, h / 2); g.fillStyle = '#4a7a3a'; g.fillRect(8, h / 2, w - 16, h / 2 - 8); });
  const pic = mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshStandardMaterial({ map: art }), false, false); pic.position.set(2, 4.6, -7.84); sc.add(pic);
  // chandelier
  const ch = new THREE.Group(); ch.position.set(0, 7.6, -1); sc.add(ch); const gold = F_('#d8b050', { metalness: 0.8, roughness: 0.3 }); const rod = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4), gold); rod.position.y = 0.7; ch.add(rod);
  const ring = mesh(new THREE.TorusGeometry(0.9, 0.04, 6, 24), gold); ring.rotation.x = Math.PI / 2; ch.add(ring); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, b = mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff4d0' })); b.position.set(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9); ch.add(b); }
  // rug + the tiny couch
  gplane(sc, 7, 5, F_('#8a3a3a'), 0, 0.5, 0.01); MS.couch = new THREE.Group(); MS.couch.position.set(0, 0, 0.2); sc.add(MS.couch);
  const cm = F_('#5a7a9a', { roughness: 0.95 }); rb(1.6, 0.42, 0.85, cm, 0, 0.3, 0, MS.couch, 0.1); rb(1.6, 0.6, 0.22, cm, 0, 0.65, -0.34, MS.couch, 0.1); for (const x of [-0.85, 0.85]) rb(0.2, 0.55, 0.85, cm, x, 0.4, 0, MS.couch, 0.08);
  rb(0.5, 0.3, 0.4, F_('#e8d8b8'), -0.55, 0.62, -0.05, MS.couch, 0.12);   // pillow
  // a side table with a lamp, a plant, the empty chip bags
  rb(0.6, 0.6, 0.6, F_('#6a4a32'), 1.3, 0.3, 0.2, sc, 0.03); for (let i = 0; i < 5; i++) { const b = rb(0.2, 0.26, 0.06, F_(['#f4c430', '#e8463a', '#3a6ad8'][i % 3]), 0.4 + 0.3 * hash(i * 2), 0.03, 1.0 + 0.4 * hash(i * 3), sc, 0.02); b.rotation.set(-Math.PI / 2, 0, hash(i) * 3); } }
// =================== US MAP AT NIGHT: city lights from the zombie video's raster (zmap.bin: b = lights, a = relief shade), going dark region by region ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#04060c');
const mapCam = new THREE.PerspectiveCamera(30, W / H, 5, 9000);
const MW = 975, MH = 610;
const lightsMat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: null }, uOff: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D uTex; uniform float uOff, uT; varying vec3 vW; varying vec3 vN;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    void main(){ vec2 uv=vec2((vW.x+${(MW / 2).toFixed(1)})/${MW.toFixed(1)}, 1.0-(vW.z+${(MH / 2).toFixed(1)})/${MH.toFixed(1)}); vec4 tx=texture2D(uTex,uv);
      float lit=tx.b, shade=tx.a; vec3 base=mix(vec3(0.05,0.065,0.1),vec3(0.09,0.11,0.16),shade);
      vec2 cell=floor(uv*vec2(26.0,16.0)); float when=0.08+0.84*h21(cell);          // each region's plants trip at a different moment
      float on=1.0-smoothstep(when-0.03,when+0.03,uOff);
      float flick=step(0.5,fract(sin(dot(cell,vec2(12.9,78.2))+uT*31.0)*43758.5)); on*=mix(1.0,0.4+0.6*flick,smoothstep(when-0.08,when-0.02,uOff)*(1.0-smoothstep(when-0.02,when,uOff)));
      vec3 col=base+vec3(1.0,0.78,0.42)*pow(lit,2.2)*1.6*on;
      if(vN.y<0.5) col=vec3(0.03,0.04,0.06);
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
async function buildMap() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii', 'Puerto Rico'].includes(g.properties.name));
  const info = await (await fetch('zmap.json')).json(), bin = new Uint8Array(await (await fetch('zmap.bin')).arrayBuffer());
  const tex = new THREE.DataTexture(bin, info.GW, info.GH, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; lightsMat.uniforms.uTex.value = tex;
  const merged = topojson.merge(topo, L48), shapes = [];
  for (const poly of merged.coordinates) { const o = poly[0]; if (o.length < 8) continue; const sh = new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))));
    for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))))); shapes.push(sh); }
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); mapScene.add(new THREE.Mesh(g, lightsMat));
  const ms = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b), pts = [];
  for (const line of ms.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; pts.push(a[0] - MW / 2, 10.4, a[1] - MH / 2, b[0] - MW / 2, 10.4, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); mapScene.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#3a4258', transparent: true, opacity: 0.6 }))); }
// =================== THE STORY: poses per beat, shots, captions/HUD, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const mid = () => H_(hero).lerp(H_(friend), 0.5); const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
// seated: hips on a seat at height y (hip joint sits 0.9·h above the body origin, which is 0.95 below outer)
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const CAR_V = 34;   // m/s (~75 mph) on the empty interstate
function carZ(t) { return t < GAS ? -CAR_V * (t - CAR) : -CAR_V * 2.6 - 6; }
function pose(t) {
  const P = hero, Q = friend; for (const X of [P, Q]) { poseReset(X, t); X.torso.scale.set(1, 1, 1); }
  MK.bag.visible = MK.donut.visible = MK.can.visible = false;
  if (t < HOMES) {   // the street
    place(P, -0.45, 5.6, 0.35); place(Q, 0.5, 5.7, -0.35);
    if (t < GONE) { P.face('happy', t); Q.face('laugh', t); Q.arms[1].rotation.set(-0.5 - 0.3 * Math.sin(t * 6), 0, 0.2); }   // chatting
    else if (t < 6.4) { P.face('surprised', t); Q.face('surprised', t); P.outer.rotation.y = 0.35 + 0.6 * Math.sin((t - GONE) * 2.2); Q.outer.rotation.y = -0.35 - 0.7 * Math.sin((t - GONE) * 2.0 + 1); }
    else { P.face('wired', t); Q.face('laugh', t); Q.arms[1].rotation.set(-2.6, 0, -0.2 + 0.4 * Math.sin(t * 10)); P.arms.forEach((a, i) => a.rotation.set(-2.7, 0, i ? -0.3 : 0.3)); P.outer.position.y += 0.25 * Math.abs(Math.sin((t - 6.4) * 6)); }
  } else if (t < MARKET) { /* aerial: nobody */ }
  else if (t < CAR || (t >= ROT && t < GAS)) {   // supermarket
    if (t < CAR) { place(P, 0.35, 2.6 - 0.8 * (t - MARKET), Math.PI); MK.cart.position.set(0.35, 0, P.outer.position.z - 0.75); MK.cart.rotation.y = 0; P.arms.forEach(a => a.rotation.set(-0.9, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.6); poseWalk(P, t * 7, 0.5); P.arms.forEach(a => a.rotation.x = -0.9);
      P.face(t < 18 ? 'happy' : 'laugh', t);
      place(Q, -0.45, 1.8, 0.3); Q.face(Math.sin(t * 9) > 0 ? 'happy' : 'laugh', t); Q.arms[1].rotation.set(-2.0 + 0.35 * Math.max(0, Math.sin(t * 9)), 0.2, 0.35); Q.elbows[1].rotation.x = -1.7;
      Q.arms[0].rotation.set(-1.0, 0, -0.3); Q.elbows[0].rotation.x = -1.0; Q.outer.updateMatrixWorld(true); MK.bag.visible = true; MK.bag.position.copy(Q.elbows[0].localToWorld(V3(0, -0.3, 0.05))); MK.bag.rotation.set(0.3, 0.3, 0);
      MK.wr.count = Math.min(60, Math.floor((t - MARKET) * 11)); }
    else { // rot: at the produce stand; the friend holds a mouldy donut, then you hold up a can
      MK.wr.count = 60; place(Q, -0.2, 10.4, Math.PI * 0.95); place(P, 0.75, 10.2, Math.PI * 1.1); MK.cart.position.set(1.6, 0, 9.4);
      Q.arms[0].rotation.set(-1.25, 0, -0.35); Q.elbows[0].rotation.x = -1.75; Q.outer.updateMatrixWorld(true); MK.donut.visible = true; MK.donut.position.copy(Q.elbows[0].localToWorld(V3(0, -0.3, 0.06))); MK.donut.rotation.set(0.9, 0, 0);
      Q.face(t < 42 ? 'crying' : 'sad', t); P.face(t < 42 ? 'squint' : 'proud', t);
      if (t >= 42) { P.arms[1].rotation.set(-1.6, 0, 0.25); P.elbows[1].rotation.x = -0.6; P.outer.updateMatrixWorld(true); MK.can.visible = true; MK.can.position.copy(P.elbows[1].localToWorld(V3(0, -0.3, 0.06))); } }
    const rot = smooth(ROT, ROT + 2.2, t) * (t < GAS ? 1 : 0); MK.icing.color.set('#f088b8').lerp(new THREE.Color('#6a8a3a'), rot);
    MK.fruit.forEach((f, i) => { f.material.color.copy(f.userData.c0).lerp(new THREE.Color(i % 3 ? '#5a4a2a' : '#6a7a3a'), rot * (0.6 + 0.4 * hash(i))); f.scale.setScalar(1 - 0.25 * rot * hash(i * 2)); });
  }
  else if (t < GRID || (t >= GAS && t < PRES)) {   // highway
    if (t < 47.5 || t < GRID) { const z = carZ(t); HW.car.position.set(-2.2, 0, z); HW.car.rotation.y = Math.PI; HW.car.visible = true; HW.bikeA.visible = HW.bikeB.visible = false;
      place(P, -2.2 + 0.42, z + 0.25, Math.PI, seatY(P, 0.78) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.set(-1.15, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.4);
      place(Q, -2.2 - 0.42, z + 0.25, Math.PI, seatY(Q, 0.78) - 0.95); poseSit(Q);
      if (t < GRID) { P.face('wired', t); const scream = t >= 24; Q.face(scream ? 'surprised' : 'laugh', t); if (scream) { Q.arms.forEach((a, i) => a.rotation.set(-2.9, 0, (i ? -1 : 1) * (0.3 + 0.15 * Math.sin(t * 13)))); Q.outer.position.x += 0.03 * Math.sin(t * 40); } else Q.arms[0].rotation.set(-2.6, 0, 0.4); }
      else { P.face('dumb', t); Q.face('dumb', t); HW.smoke.forEach((s, i) => { const k = ((t - GAS - 0.3 - i * 0.18) / 1.6); s.visible = k > 0 && k < 1; s.position.set(-2.2 + 0.4 * Math.sin(i), 0.6 + 2.2 * k, z + 2.4 + 0.8 * k); s.scale.setScalar(0.6 + 2.2 * k); s.material.opacity = 0.85 * (1 - k); }); } }
    else { HW.smoke.forEach(s => s.visible = false); HW.car.position.set(-2.2, 0, carZ(t)); HW.bikeA.visible = HW.bikeB.visible = true; const z0 = -CAR_V * 2.6 - 4 - 4.2 * (t - 47.5), ph = t * 7;
      HW.bikeA.position.set(1.0, 0, z0); HW.bikeA.rotation.y = Math.PI; HW.bikeB.position.set(2.6, 0, z0 + 1.2); HW.bikeB.rotation.y = Math.PI;
      for (const [X, b, s] of [[P, HW.bikeA, 1], [Q, HW.bikeB, 0.66]]) { b.userData.wheels.forEach(w => w.rotation.x = ph); place(X, b.position.x, b.position.z + 0.1 * s, Math.PI, seatY(X, 1.02 * s) - 0.95); poseSit(X);
        X.legs[0].rotation.x = -1.0 + 0.45 * Math.sin(ph); X.legs[1].rotation.x = -1.0 - 0.45 * Math.sin(ph); X.knees[0].rotation.x = 1.2 - 0.4 * Math.sin(ph); X.knees[1].rotation.x = 1.2 + 0.4 * Math.sin(ph);
        X.arms.forEach(a => a.rotation.set(-1.0, 0, 0)); X.torso.rotation.x = 0.25; }
      P.face('neutral', t); Q.face('worried', t); Q.outer.position.x += 0.04 * Math.sin(t * 9); } }
  else if (t >= SUBWAY && t < ROT) {   // subway entrance: at the railing, looking down
    place(P, 1.75, 0.55, -Math.PI / 2 - 0.25, 0.2); place(Q, 1.65, -0.35, -Math.PI / 2 + 0.2, 0.2);
    for (const X of [P, Q]) { X.torso.rotation.x = 0.15; X.arms.forEach(a => a.rotation.set(-0.9, 0, 0)); X.elbows.forEach(e => e.rotation.x = -0.4); }
    P.face(t < 36 ? 'surprised' : 'worried', t); Q.face(t < 36 ? 'surprised' : 'anxious', t); }
  else if (t >= PRES && t < COUCH) {   // White House lawn: each votes for themselves
    place(P, -0.48, 10.4, 0.2); place(Q, 0.48, 10.4, -0.2); const vote = t >= 53.8;
    for (const [X, s] of [[P, 1], [Q, -1]]) { if (vote) { X.arms[1].rotation.set(-2.9, 0, -0.15); X.elbows[1].rotation.x = -0.1; } }
    P.face(vote ? 'smirk' : 'proud', t); Q.face(vote ? 'angry' : 'happy', t);
    WHS.slips.forEach((s, i) => { const k = clamp((t - PRES - 0.6 - i * 0.7) / 0.6, 0, 1); s.visible = k < 1 && t < 53.8; s.position.set((i ? 1 : -1) * 0.25 * (1 - k), 1.2 + 0.4 * (1 - k), 9 + 0.2); s.rotation.set(-0.3, i * 0.4, 0); }); }
  else if (t >= COUCH) {   // mansion: the friend asleep on a tiny couch, you standing over him
    Q.outer.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'); Q.outer.position.set(0.32, 0.72, 0.22); Q.face('sleep', t); Q.torso.scale.set(1, 1, 1 + 0.04 * Math.sin(t * 2.2));
    Q.arms.forEach((a, i) => a.rotation.set(-0.6, 0, (i ? -1 : 1) * 0.4)); Q.elbows.forEach(e => e.rotation.x = -1.2); Q.legs.forEach(l => l.rotation.x = -0.2); Q.knees.forEach(k => k.rotation.x = 0.9);
    place(P, 0.6, 1.55, -0.35); P.arms.forEach((a, i) => a.rotation.set(-0.15, 0, (i ? -1 : 1) * 0.55)); P.elbows.forEach(e => e.rotation.x = -1.5); P.face(t < 58.5 ? 'squint' : 'smirk', t); }
}
// ---- shots: [start, set, camera(t)] ----
const SETS = { st: { sc: st, cam: stCam }, burb: BURB, mkt: MKT, hwy: HWY, sub: SUB, wh: WH, man: MAN, map: { sc: mapScene, cam: mapCam } };
const SHOTS = [
  [0, 'st', t => lerpF(LOOK(4.2, 1.9, 13.5, 0, 1.25, 5.4), LOOK(3.2, 1.8, 11.2, 0, 1.25, 5.5), t / 2)],
  [2.0, 'st', t => LOOK(0.6, 1.0, 9.2 - 0.2 * (t - 2), 0, 1.45, 5.6, 44)],
  [GONE, 'st', t => fr(mid(), V3(0.15, 0.06, 1), lerp(2.6, 2.3, (t - GONE) / 2.4), 0.62)],
  [6.4, 'st', t => lerpF(LOOK(1.5, 2.5, 10.5, 0, 1.2, 5.6), LOOK(10, 26, 26, -2, 0, 4), ease(clamp((t - 6.4) / 2.5, 0, 1)))],
  [HOMES, 'burb', t => LOOK(-30 + 6 * (t - HOMES), 110, 165, 0, 0, -20, 40)],
  [12.0, 'burb', t => LOOK(900 - 30 + 4 * (t - 12), 120, 190, 900, 0, 0, 40)],
  [MARKET, 'mkt', t => LOOK(0.2, 2.2, -4.5 + 0.2 * (t - MARKET), 0, 1.0, 3.5, 44)],
  [18.0, 'mkt', t => fr(H_(friend), V3(0.75, 0.05, 1), 1.5, 0.62)],
  [CAR, 'hwy', t => { const z = carZ(t); return LOOK(-2.2 + 2.2, 1.7, z - 8.5, -2.2, 1.0, z, 40); }],
  [24.0, 'hwy', t => { const h = H_(friend); return LOOK(h.x - 1.9, h.y + 0.2, h.z - 1.2, h.x, h.y - 0.1, h.z, 42); }],
  [GRID, 'map', t => LOOK(0, 2900 - 50 * (t - GRID), 1500, 0, 0, 30, 30)],
  [SUBWAY, 'sub', t => LOOK(5.5 - 0.15 * (t - SUBWAY), 3.6, 6.5, 0, 0.0, 0, 40)],
  [36.0, 'sub', t => LOOK(-0.8, 2.9, 3.3 - 0.1 * (t - 36), 1.45, 0.45, 0.0, 44)],
  [ROT, 'mkt', t => fr(H_(friend), V3(-0.25, 0.04, -1), 1.35, 0.62)],
  [42.0, 'mkt', t => fr(H_(hero).lerp(H_(friend), 0.4), V3(0.2, 0.06, -1), 2.6, 0.62)],
  [GAS, 'hwy', t => { const z = carZ(t); return LOOK(1.6, 1.6, z - 5.0, -2.2, 0.9, z, 40); }],
  [47.5, 'hwy', t => { const z = -CAR_V * 2.6 - 4 - 4.2 * (t - 47.5); return LOOK(4.5, 1.6, z - 6.5, 1.8, 0.9, z, 40); }],
  [PRES, 'wh', t => LOOK(1.5, 2.2, 21 - 0.5 * (t - PRES), 0, 4.0, -4, 40)],
  [53.8, 'wh', t => fr(mid(), V3(0.05, 0.08, 1), 3.4, 0.6)],
  [COUCH, 'man', t => LOOK(3.8 - 0.2 * (t - COUCH), 2.6, 5.0, 0, 0.8, 0.3, 40)],
  [58.5, 'man', t => fr(H_(hero), V3(0.5, 0.1, 1), 2.6, 0.62)],
  [ENDC, 'man', t => LOOK(3.8, 2.6, 5.0, 0, 0.8, 0.3, 40)]];
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, k, cf] = SHOTS[i], S = SETS[k]; puffsReset();
  if (k !== 'map') { S.sc.add(hero.outer); S.sc.add(friend.outer); hero.outer.visible = friend.outer.visible = k !== 'burb'; }
  if (k === 'st') updateStreet(t); if (k === 'burb') updateBurb(t); pose(t);
  if (k === 'map') { lightsMat.uniforms.uOff.value = clamp((t - GRID - 0.8) / 4.6, 0, 1); lightsMat.uniforms.uT.value = t; }
  if (k === 'sub') { const wl = lerp(-3.2, 0.24, smooth(SUBWAY + 0.3, 37.6, t)); SB.water.position.set(0, wl, 0); const sp = smooth(37.2, 38.8, t); SB.sheet.visible = sp > 0.01; SB.sheet.position.set(0, 0.215, 0); SB.sheet.scale.setScalar(0.5 + 4.5 * sp); }
  if (k === 'wh') { const P = WHS.flag.geometry.attributes.position, p0 = WHS.flag.userData.p0; for (let j = 0; j < P.count; j++) { const x = p0[j * 3] + 1.5; P.setZ(j, 0.25 * Math.sin(x * 2.2 - t * 6) * x / 3); } P.needsUpdate = true; WHS.box.position.y = 0; }
  const F = cf(t); applyF(S.cam, F);
  if (k === 'map') { shootTo(rt, S.sc, S.cam); return; }
  const far = F.pos.y > 30; if (far) { shootTo(rt, S.sc, S.cam); return; } shootTo(RTS, S.sc, S.cam); aoFor(k).render(renderer, rt, RTS); }
// ---- DOM ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[GONE, 6.4, '<b>8 billion</b> people. Gone.'], [6.4, HOMES, 'Just you two.'],
  [HOMES, 12.0, 'You each get <b>73 million</b> homes…'], [12.0, MARKET, '…and <b>149 million</b> cars.'],
  [MARKET, 18.0, 'Every store is free. Forever.'], [18.0, CAR, 'He’s already on aisle 3.'],
  [CAR, 24.0, 'Speed limits? Nobody’s left to care.'], [24.0, GRID, 'He is not okay.'],
  [GRID, 30.0, 'But within days, the power grid shuts down.'], [30.0, SUBWAY, 'Nobody’s left to run the power plants.'],
  [SUBWAY, 36.0, 'Day 2: New York’s subways flood.'], [36.0, ROT, 'Its pumps moved <b>13 million gallons</b> of water a day. Not anymore.'],
  [ROT, 42.0, 'Week 1: all the fresh food rots.'], [42.0, GAS, 'Canned food? Good for <b>years</b>.'],
  [GAS, 47.5, 'A few months later, the gas goes stale.'], [47.5, PRES, 'Cars won’t start. Bikes it is.'],
  [PRES, 53.8, 'Year 1: you hold an election for President.'], [53.8, COUCH, 'It’s a tie.'],
  [COUCH, 58.5, 'You own <b>73 million</b> homes.'], [58.5, ENDC, 'He still sleeps on <b>your</b> couch.']];
function hudAt(t) { const cnt = (a, b, v0, v1) => lerp(v0, v1, ease(clamp((t - a) / (b - a), 0, 1)));
  if (t >= HOMES && t < 12) return ['HOMES EACH', fmt(cnt(HOMES + 0.3, 11.6, 0, 73.4e6)), 'U.S. CENSUS: 146.8M HOMES'];
  if (t >= 12 && t < MARKET) return ['CARS EACH', fmt(cnt(12.3, 14.6, 0, 149e6)), 'FHWA: 298M REGISTERED VEHICLES'];
  if (t >= GRID && t < SUBWAY) return ['HOMES WITH POWER', Math.round(100 * (1 - clamp((t - GRID - 0.8) / 4.6, 0, 1))) + '%', 'NO OPERATORS → PLANTS TRIP OFFLINE'];
  if (t >= PRES && t < COUCH && t >= 53.8) return ['VOTES', 'YOU 1 · HIM 1', ''];
  return null; }
function labelsAt(t, i) { if (SHOTS[i][1] !== 'man' || t >= ENDC) return ''; const h = H_(friend).add(V3(0.1, 0.3, 0)); const v = h.project(SETS.man.cam), out = [];
  for (let k = 0; k < 3; k++) { const ph = ((t * 0.7 + k / 3) % 1); out.push(`<div class="lb" style="left:${((v.x + 1) / 2 * W + 30 + 60 * ph + 20 * k).toFixed(0)}px;top:${((1 - v.y) / 2 * H - 40 - 140 * ph).toFixed(0)}px;opacity:${(1 - ph).toFixed(2)};font-size:${(36 + 26 * ph).toFixed(0)}px">Z</div>`); } return out.join(''); }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, GONE, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.labels.innerHTML = labelsAt(t, i);
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.7, ENDC + 1.0, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  shoot(i, t, RTA); compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildMap();
  for (const p of [hero, friend]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
