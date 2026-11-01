import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "What if you took an elevator from New York to space?" (64 s, US): POV in a glass cabin rising from Times Square at night at 47 mph (Hitachi record) — One WTC,
// the clouds, Everest height (FAA useful consciousness), airliners (−65°F), the Armstrong limit (63,000 ft), the Kármán line (62 mi, 79 min), the ISS height (5 h 19 min);
// the twist: gravity there is still ~90% (astronauts float because they fall around Earth at 17,500 mph); then you jump — with a parachute — and come home.
// Numbers: tools/elevator_math.py. Look (her ask): @man_ia_c-style night city glow, bloom, wide POV, a "to scale" minimap.
// =================== timeline (s) ===================
const UP = 4.0, CLOUD = 9.0, EVER = 14.0, JET = 20.0, ARM = 26.0, KAR = 32.0, ISS = 38.0, FLOAT = 44.0, JUMP = 50.0, DROP = 53.0, LAND = 59.0, ENDC = 61.0, T_END = 64.0;
// altitude (m) over time: real milestones, story pacing (the HUD clock shows the real elevator time at 21 m/s)
const ALT_K = [[0, 0], [UP, 2], [CLOUD - 0.5, 541], [EVER - 1, 2900], [EVER + 2, 8849], [JET + 2, 10668], [ARM + 2, 19202], [KAR + 2, 100000], [ISS + 2, 400000], [JUMP, 400000]];
const altAt = t => { if (t >= JUMP) return 400000; for (let i = 1; i < ALT_K.length; i++) if (t < ALT_K[i][0]) { const [a, va] = ALT_K[i - 1], [b, vb] = ALT_K[i], u = (t - a) / (b - a), e = u * u * (3 - 2 * u); return va > 0 && vb > va * 4 ? va * Math.pow(vb / va, e) : va + (vb - va) * e; } return 400000; };
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
// =================== THE CAST + shared props: the friend, a low-poly car, vanish puffs (g_world is kept only for the hero + its builders; the street itself is New York, x_nyc.js) ===================
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
const puffTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 64 + Math.cos(i * 0.7) * 26 * (i % 3) / 2, y = 64 + Math.sin(i * 1.3) * 22 * (i % 3) / 2, r = 26 + 8 * (i % 3), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
const puffs = []; function puffAt(scene, pos, t, t0, size = 1.6) { const k = (t - t0) / 0.7; if (k < 0 || k > 1) return; let s = puffs.find(p => !p.used && p.scene === scene);
  if (!s) { s = { scene, sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })) }; scene.add(s.sp); puffs.push(s); }
  s.used = true; s.sp.visible = true; s.sp.position.copy(pos); s.sp.scale.setScalar(size * (0.5 + 1.2 * Math.sqrt(k))); s.sp.material.opacity = (1 - k) * (1 - k); s.sp.material.rotation = k * 0.8; }
function puffsReset() { puffs.forEach(p => { p.used = false; p.sp.visible = false; }); }
// =================== SETS: night Manhattan (procedural lit windows on ~15,000 towers), the sky (clouds lit by the city, an airliner), space (night Earth with
// city lights, the ISS), the glass cabin (POV frame + your hand; and the cabin seen from outside), the parachute ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
const _o = new THREE.Object3D(), _c = new THREE.Color();
const GLSL_HASH = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`;
const FOG_NIGHT = new THREE.Color('#0d1424');

// ---------- 1) MANHATTAN AT NIGHT (meters; x = east, z = south; you start at Times Square = origin; One WTC downtown at z ≈ +6.5 km) ----------
const CITY = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(70, W / H, 0.05, 60000) };
const towerMat = new THREE.ShaderMaterial({ uniforms: { uFog: { value: FOG_NIGHT }, uCam: { value: new THREE.Vector3() }, uT: { value: 0 } },
  vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed;
    void main(){ mat4 im = instanceMatrix; vec4 w = modelMatrix * im * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * im) * normal);
      vC = vec3(1.0); \n#ifdef USE_INSTANCING_COLOR\n vC = instanceColor; \n#endif\n vSeed = im[3].xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uFog, uCam; uniform float uT; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed; ${GLSL_HASH}
    void main(){ vec3 n = normalize(vN); float side = 1.0 - step(0.5, abs(n.y)); vec3 col = vC * (0.05 + 0.10 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.3))), 0.0));
      if (side > 0.5) { float u = abs(n.x) > 0.5 ? vW.z : vW.x; vec2 g = vec2(u / 3.0, vW.y / 3.6); vec2 c = floor(g), f = fract(g);
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.78);
        float r = h21(c + vSeed * 0.37), lit = step(r, 0.42 + 0.25 * h21(floor(vSeed / 40.0)));
        vec3 warm = mix(vec3(1.0, 0.72, 0.38), vec3(0.75, 0.88, 1.0), step(0.78, h21(c * 1.7 + vSeed)));
        col = mix(col, mix(vec3(0.03, 0.045, 0.07), warm * (1.6 + 1.6 * h21(c + 3.1)), lit), win); }
      else col += vec3(0.02);
      float d = length(vW - uCam); float fg = 1.0 - exp(-d * 0.00011); col = mix(col, uFog, clamp(fg, 0.0, 0.92));
      gl_FragColor = vec4(col, 1.0); }` });
const groundMat = new THREE.ShaderMaterial({ uniforms: { uFog: { value: FOG_NIGHT }, uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uScale: { value: 1 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uFog, uCam; uniform float uT, uScale; varying vec3 vW; ${GLSL_HASH}
    void main(){ vec2 p = vW.xz; float water = (abs(p.x + 150.0 * sin(p.y * 0.0004)) > 1750.0 && abs(p.x) < 2350.0) || p.y > 7600.0 ? 1.0 : 0.0;
      // avenues (along z) every 140 m, streets (along x) every 70 m: glowing with headlights / streetlights
      float av = 1.0 - smoothstep(0.0, 3.0, abs(mod(p.x + 70.0, 140.0) - 70.0)), st = 1.0 - smoothstep(0.0, 2.0, abs(mod(p.y + 35.0, 70.0) - 35.0));
      float cars = step(0.55, fract(p.y * 0.05 - uT * 0.6 + h21(vec2(floor(p.x / 140.0), 1.0)))) * av;
      float suburb = smoothstep(2300.0, 2600.0, abs(p.x)), dens = mix(1.0, 0.45 + 0.4 * vn(p * 0.002), suburb);
      vec3 col = vec3(0.025, 0.03, 0.04) + vec3(1.0, 0.7, 0.35) * (av * 1.6 + st * 0.9 + cars * 2.2) * dens;
      col = mix(col, vec3(0.01, 0.02, 0.04) + 0.08 * vec3(1.0, 0.75, 0.4) * vn(p * 0.05 + uT), water);
      float d = length(vW - uCam); col = mix(col, uFog, clamp(1.0 - exp(-d * 0.00011), 0.0, 0.92)); gl_FragColor = vec4(col, 1.0); }` });
const CT = {}; {
  const sc = CITY.sc; sc.background = FOG_NIGHT;
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), groundMat); gnd.rotation.x = -Math.PI / 2; sc.add(gnd);
  sc.add(new THREE.HemisphereLight(0x8aa0ff, 0x2a2018, 0.5)); const moon = new THREE.DirectionalLight(0xb8c8ff, 0.6); moon.position.set(-300, 800, 200); sc.add(moon);
  const T = []; const towerAt = (x, z, w, d, h) => T.push([x, z, w, d, h]);
  for (let bx2 = -10; bx2 <= 10; bx2++) for (let bz = -140; bz <= 108; bz++) { const cx = bx2 * 140, cz = bz * 70, mid = Math.exp(-((cz / 1800) ** 2)), down = Math.exp(-(((cz - 6200) / 900) ** 2));
    if (Math.abs(cx) < 15 && Math.abs(cz) < 120) continue;   // Times Square: open plaza around the cabin
    const k = (bx2 + 20) * 1000 + bz; const n = 2 + ((hash(k) * 3) | 0);
    for (let q = 0; q < n; q++) { const w = 22 + 30 * hash(k * 3 + q), d = 18 + 22 * hash(k * 5 + q), x = cx + (q - (n - 1) / 2) * (112 / n), z = cz + (hash(k * 7 + q) - 0.5) * 18;
      const h = 18 + (40 + 300 * mid + 260 * down) * Math.pow(hash(k * 11 + q), 2.2) + 30 * hash(k * 13 + q); towerAt(x, z, Math.min(w, 112 / n - 6), Math.min(d, 52), h); } }
  for (let k = 0; k < 2600; k++) { const side = k % 2 ? 1 : -1; towerAt(side * (2600 + 9000 * hash(k)), -12000 + 22000 * hash(k * 3), 20 + 25 * hash(k * 5), 20 + 25 * hash(k * 7), 12 + 50 * hash(k * 9) ** 2); }   // NJ + Brooklyn/Queens
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerMat, T.length + 2);
  T.forEach(([x, z, w, d, h], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.set(w, h, d); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); im.setColorAt(i, _c.setHSL(0.08 + 0.5 * hash(i), 0.15, 0.25 + 0.3 * hash(i * 3))); });
  // One World Trade Center: 541 m with the spire
  _o.position.set(-600, 0, 6500); _o.scale.set(62, 417, 62); _o.updateMatrix(); im.setMatrixAt(T.length, _o.matrix); im.setColorAt(T.length, _c.set('#8ab0d0'));
  _o.position.set(-600, 417, 6500); _o.scale.set(3, 124, 3); _o.updateMatrix(); im.setMatrixAt(T.length + 1, _o.matrix); im.setColorAt(T.length + 1, _c.set('#c8d0d8')); sc.add(im);
  CT.wtcTip = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.5, 3) })); CT.wtcTip.position.set(-600, 541, 6500); sc.add(CT.wtcTip);
  // Times Square billboards around the plaza (bright emissive → bloom)
  const ADS = [['#ff1a5a', '#ffd040', 'SODA'], ['#1a8aff', '#ffffff', 'NEW PHONE'], ['#ffc020', '#1a1a1a', 'BURGERS'], ['#7a2aff', '#fff', 'MUSICAL'], ['#00c870', '#fff', 'SALE 50%'], ['#ff6a1a', '#fff', 'SNEAKERS'], ['#111', '#ff2a6a', 'TONIGHT'], ['#e0e0f0', '#e8202a', 'NEWS']];
  const adTex = ADS.map(([bg, fg, txt]) => canvasTex(256, 384, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText(txt.split(' ')[0], w / 2, h * 0.45); if (txt.includes(' ')) { g.font = '800 40px Inter'; g.fillText(txt.split(' ')[1], w / 2, h * 0.58); }
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.beginPath(); g.arc(w / 2, h * 0.78, 30, 0, 6.3); g.fillStyle = fg; g.fill(); }));
  for (let k = 0; k < 34; k++) { const side = k % 2 ? 1 : -1, z = -60 + (k >> 1) * 7.5, wd = 6 + 6 * hash(k * 3), ht = wd * 1.5, m = new THREE.MeshBasicMaterial({ map: adTex[k % ADS.length], color: new THREE.Color(1.5, 1.5, 1.5), side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), m); b.position.set(side * (16 + 1.5 * hash(k * 5)), 8 + 30 * hash(k * 7), z); b.rotation.y = -side * Math.PI / 2; sc.add(b); }
  CT.heroLight = new THREE.PointLight(0xffd0a0, 60, 40, 1.5); sc.add(CT.heroLight);   // the glow of the ads on you as you land
  // the elevator rail rising from the plaza
  CT.rail = new THREE.Group(); for (const x of [-1.3, 1.3]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6000, 0.25), F_('#5a6070', { metalness: 0.6 })); r.position.set(x, 3000, -1.4); CT.rail.add(r); } sc.add(CT.rail);
  CT.lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.8) }), 400); for (let k = 0; k < 400; k++) { _o.position.set(-1.3, 15 * k, -1.4); _o.scale.setScalar(1); _o.updateMatrix(); CT.lamps.setMatrixAt(k, _o.matrix); } sc.add(CT.lamps); }
function updateCity(t, cam) { towerMat.uniforms.uCam.value.copy(cam.position); groundMat.uniforms.uCam.value.copy(cam.position); groundMat.uniforms.uT.value = t; CT.wtcTip.material.color.setScalar(2 + 2 * (Math.sin(t * 4) > 0 ? 1 : 0)); }

// ---------- 2) THE SKY (meters, 1.5–19 km): the lit city far below (same ground shader, wider), clouds lit orange from below, a dark sky + stars, an airliner ----------
const SKY = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(70, W / H, 1, 400000) };
const skyDome = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uAlt: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uAlt; varying vec3 vD; ${GLSL_HASH}
    void main(){ float h = clamp(vD.y, -0.2, 1.0), k = clamp(uAlt / 20000.0, 0.0, 1.0);
      vec3 top = mix(vec3(0.03, 0.05, 0.12), vec3(0.0, 0.0, 0.01), k), hor = mix(vec3(0.35, 0.22, 0.25), vec3(0.08, 0.12, 0.35), k);
      vec3 c = mix(hor, top, smoothstep(-0.05, 0.45, h)); vec2 sp = vD.xz / max(0.15, vD.y + 0.3) * 300.0; float st = step(0.997, h21(floor(sp))) * smoothstep(0.0, 0.3, h) * (0.3 + k);
      gl_FragColor = vec4(c + vec3(st) * 2.0, 1.0); }` });
const skyGround = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uCam; varying vec3 vW; ${GLSL_HASH}
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){ vec2 p = vW.xz; float ocean = smoothstep(-2000.0, 2000.0, p.x * 0.9 + p.y * 0.45 - 16000.0);
      float metro = exp(-length(p) / 22000.0) * 1.6 + smoothstep(0.55, 0.85, fbm(p * 0.00006)) * 0.8;
      vec2 c = floor(p / 55.0), f = fract(p / 55.0) - 0.5 + 0.3 * (vec2(h21(c * 2.1), h21(c * 3.7)) - 0.5); float spark = step(1.0 - 0.3 * metro, h21(c)) * (0.6 + h21(c * 1.3)) * (1.0 - smoothstep(0.03, 0.09, length(f)));
      float hw = 0.0; for (int i = 0; i < 5; i++) { float a = float(i) * 1.1 + 0.3; vec2 d = vec2(cos(a), sin(a)); hw += 1.0 - smoothstep(0.0, 60.0, abs(dot(p, vec2(-d.y, d.x)) - float(i - 2) * 9000.0)); }
      vec3 col = vec3(0.012, 0.016, 0.025) + vec3(1.0, 0.62, 0.3) * (spark * 3.0 * metro + hw * 0.5 * min(metro + 0.2, 1.0) + metro * 0.06);
      col = mix(col, vec3(0.005, 0.01, 0.025), ocean); float d = length(vW - uCam); col = mix(col, vec3(0.02, 0.03, 0.07), clamp(1.0 - exp(-d * 0.000005), 0.0, 0.8)); gl_FragColor = vec4(col, 1.0); }` });
const SK = {}; {
  const sc = SKY.sc; sc.add(new THREE.Mesh(new THREE.SphereGeometry(300000, 32, 16), skyDome));
  const g = new THREE.Mesh(new THREE.PlaneGeometry(600000, 600000), skyGround); g.rotation.x = -Math.PI / 2; sc.add(g);
  sc.add(new THREE.HemisphereLight(0x9ab0ff, 0x6a4020, 0.9));
  // clouds: big soft puffs between 1.6 and 2.6 km, warm underneath from the city glow
  const ct = canvasTex(128, 128, (g2, w, h) => { const gr = g2.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); });
  SK.clouds = []; for (let k = 0; k < 700; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, color: new THREE.Color().setRGB(0.42 + 0.2 * hash(k), 0.36 + 0.12 * hash(k), 0.42 + 0.08 * hash(k * 3)), opacity: 0.75 }));
    const r = 400 + 9000 * Math.sqrt(hash(k * 3)), a = hash(k * 5) * 6.283; s.position.set(Math.cos(a) * r, 1700 + 900 * hash(k * 7), Math.sin(a) * r); s.scale.setScalar(500 + 900 * hash(k * 9)); sc.add(s); SK.clouds.push(s); }
  // the airliner: fuselage, wings, tail, lit windows, blinking lights
  const pl = new THREE.Group(), white = F_('#e8ecf0', { roughness: 0.4 }); const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 60, 14), white); fus.rotation.z = Math.PI / 2; pl.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.0, 12, 8), white); nose.scale.set(2.2, 1, 1); nose.position.x = 30; pl.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 64), white); wing.position.set(2, -0.6, 0); wing.rotation.y = 0.25; pl.add(wing); const tl = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 0.5), white); tl.position.set(-27, 5, 0); pl.add(tl);
  const hs = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 20), white); hs.position.set(-27, 1, 0); pl.add(hs);
  for (let k = 0; k < 36; k++) for (const s of [-1, 1]) { const wdw = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.3), side: THREE.DoubleSide })); wdw.position.set(-22 + k * 1.3, 0.6, s * 2.02); pl.add(wdw); }
  SK.navR = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.3) })); SK.navR.position.set(4, -0.6, -33); pl.add(SK.navR);
  SK.navG = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 4, 0.5) })); SK.navG.position.set(4, -0.6, 33); pl.add(SK.navG);
  SK.plane = pl; sc.add(pl);
  SK.frost = null; }
function updateSky(t, cam, alt) { skyGround.uniforms.uCam.value.copy(cam.position); skyDome.uniforms.uAlt.value = alt;
  const blink = Math.sin(t * 6) > 0.6 ? 1 : 0.15; SK.navR.material.color.setRGB(4 * blink, 0.3, 0.3); SK.navG.material.color.setRGB(0.3, 4 * blink, 0.5);
  const u = (t - JET - 0.5) / 5; SK.plane.position.set(-300 + 600 * u, alt - 14, -230 + 30 * u); SK.plane.rotation.set(0, 0.12, 0); }

// ---------- 3) SPACE (km): the night Earth with city lights, a blue atmosphere rim and a thin dawn on the limb; stars; the ISS ----------
const SPACE = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(70, W / H, 0.0005, 200000) };
const R_E = 6371, EARTH = new THREE.Group(); SPACE.sc.add(EARTH); EARTH.position.set(0, -R_E, 0); SPACE.sc.background = new THREE.Color('#010205');
async function buildEarth() { const topo = await (await fetch('node_modules/world-atlas/land-110m.json')).json(), land = topojson.feature(topo, topo.objects.land), us = await (await fetch('data/us_lights.json')).json();
  const W2 = 4096, H2 = 2048, P = (lo, la) => [(lo + 180) / 360 * W2, (90 - la) / 180 * H2];
  const mask = document.createElement('canvas'); mask.width = W2; mask.height = H2; const mg = mask.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, W2, H2); mg.fillStyle = '#fff';
  for (const f of land.features) for (const poly of (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) { mg.beginPath(); for (const ring of poly) ring.forEach(([lo, la], i) => { const [x, y] = P(lo, la); if (i) mg.lineTo(x, y); else mg.moveTo(x, y); }); mg.fill(); }
  const md = mg.getImageData(0, 0, W2, H2).data;
  const tex = canvasTex(W2, H2, (g, w, h) => { g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#141c24'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#060c1c'; g.fillRect(0, 0, w, h);
    const dot = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,190,110,${a})`); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
    for (const [lo, la] of us) { const [x, y] = P(lo, la); dot(x, y, 1.0, 0.35); }
    let n = 0; for (let k = 0; k < 400000 && n < 26000; k++) { const x = (hash(k * 1.3) * W2) | 0, y = (H2 * (0.18 + 0.5 * hash(k * 2.7))) | 0; if (md[(y * W2 + x) * 4] > 128 && hash(k * 9.1) < 0.35) { dot(x, y, 0.9, 0.25); n++; } } });
  const mat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: tex }, uSun: { value: new THREE.Vector3(-0.2, -0.15, -1).normalize() } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 c = texture2D(uTex, vUv).rgb; vec3 lights = max(c - vec3(0.06, 0.09, 0.14), 0.0) * vec3(1.6, 1.15, 0.7); float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
        float dawn = pow(max(dot(vN, -uSun), 0.0), 2.0) * rim; vec3 col = c * 0.6 + lights + vec3(0.1, 0.25, 0.7) * rim * 0.9 + vec3(1.2, 0.55, 0.2) * dawn * 1.6;
        gl_FragColor = vec4(col, 1.0); }` });
  const e = new THREE.Mesh(new THREE.SphereGeometry(R_E, 160, 96), mat); EARTH.add(e);
  const lo = -74.0 * Math.PI / 180, la = 40.75 * Math.PI / 180, phi = lo + Math.PI, th = Math.PI / 2 - la, dir = V3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
  e.quaternion.setFromUnitVectors(dir, V3(0, 1, 0));   // New York at the top, right under the cabin
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R_E * 1.012, 96, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float r = pow(1.0 - abs(dot(vN, vV)), 6.0); gl_FragColor = vec4(vec3(0.25, 0.5, 1.2) * r * 1.4, r); }' })); EARTH.add(atm);
  const n = 4000, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(hash(i) - 0.5, hash(i * 3) - 0.5, hash(i * 7) - 0.5).normalize().multiplyScalar(150000); p.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3)); SPACE.sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, sizeAttenuation: false })));
  SPACE.sc.add(new THREE.AmbientLight(0x8890a0, 1.2)); const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(2, 1, -4); SPACE.sc.add(sun); }
// the ISS (km units: ~0.109 km wide): truss, 8 solar wings, modules, radiators
const ISSM = new THREE.Group(); { const k = 0.001, gold = new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.6, roughness: 0.35, emissive: '#3a2a10' }), white = F_('#e8ecf0', { roughness: 0.5 });
  const tr = new THREE.Mesh(new THREE.BoxGeometry(109 * k, 3 * k, 3 * k), white); ISSM.add(tr);
  for (const x of [-48, -36, 36, 48]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(11 * k, 0.2 * k, 34 * k), gold); w.position.set(x * k, 0, s * 19 * k); ISSM.add(w); }
  for (const [x, z, l] of [[0, 0, 40], [0, 12, 14], [6, -10, 12]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * k, 2.2 * k, l * k, 12), white); m.rotation.x = Math.PI / 2; m.position.set(x * k, -3 * k, z * k); ISSM.add(m); }
  for (const x of [-20, 20]) { const r = new THREE.Mesh(new THREE.BoxGeometry(6 * k, 0.2 * k, 14 * k), white); r.position.set(x * k, 0, -10 * k); ISSM.add(r); } SPACE.sc.add(ISSM); }
function updateSpace(t, cam) { const u = (t - ISS - 1.4) / 1.6; ISSM.visible = t >= ISS && t < ISS + 6; ISSM.position.set(-0.4 + 0.8 * u, 400 - 0.03, -0.6); ISSM.rotation.set(0.2, 0.3, 0.1); }

// ---------- 4) THE CABIN: a POV frame + your hand (an overlay scene drawn on top of every POV shot), and the cabin seen from outside (meters) ----------
const POVS = new THREE.Scene(), povCam = new THREE.PerspectiveCamera(70, W / H, 0.02, 50); POVS.add(povCam);
POVS.add(new THREE.HemisphereLight(0xcfd8ff, 0x3a3028, 1.1)); const povKey = new THREE.DirectionalLight(0xffe0c0, 1.6); povKey.position.set(1, 2, 1); POVS.add(povKey);
const POV = {}; { const metal = F_('#2a2e36', { metalness: 0.7, roughness: 0.35 });
  for (const x of [-0.235, 0.235]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2, 0.03), metal); b.position.set(x, 0, -0.6); povCam.add(b); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.03), metal); top.position.set(0, 0.405, -0.6); povCam.add(top);
  POV.rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 10), F_('#c8ccd4', { metalness: 0.9, roughness: 0.2 })); POV.rail.rotation.z = Math.PI / 2; POV.rail.position.set(0, -0.33, -0.58); povCam.add(POV.rail);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.65, 0.8), transparent: true, opacity: 0.06, depthWrite: false })); glass.position.set(0, 0, -0.62); povCam.add(glass); POV.glass = glass;
  POV.frost = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 384, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const ex = hash(i * 5) < 0.5 ? hash(i * 11) * 40 : w - hash(i * 11) * 40, x = hash(i * 13) < 0.6 ? ex : hash(i * 5) * w, y = hash(i * 7) < 0.6 ? h - hash(i * 17) * 60 : hash(i * 7) * h; if (Math.abs(x - w / 2) < 70 && Math.abs(y - h / 2) < 120) continue; g.strokeStyle = `rgba(225,242,255,${0.2 + 0.35 * hash(i)})`; g.lineWidth = 0.6 + 0.8 * hash(i * 3); g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 3; s++) g.lineTo(x + (hash(i + s) - 0.5) * 14, y + (hash(i * 3 + s) - 0.5) * 14); g.stroke(); } }), transparent: true, opacity: 0, depthWrite: false })); POV.frost.position.set(0, 0, -0.61); POV.frost.scale.set(0.24, 0.27, 1); povCam.add(POV.frost);
  // your hand on the rail (charcoal sleeve, as the hero's tee)
  const arm = new THREE.Group(); const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 10), F_('#4b4f57')); sleeve.rotation.x = Math.PI / 2 - 0.5; sleeve.position.set(0, 0.05, 0.22); arm.add(sleeve);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), F_('#e9b98f', { flatShading: false })); fist.scale.set(1.15, 0.85, 0.9); arm.add(fist);
  arm.position.set(0.13, -0.32, -0.56); arm.rotation.set(0.15, -0.35, 0); arm.scale.setScalar(0.55); povCam.add(arm); POV.arm = arm;
  POV.mug = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 14), F_('#e8603a')); m.position.y = 0.055; POV.mug.add(m); } POV.mug.position.set(-0.08, -0.36, -0.62); POV.mug.scale.setScalar(0.7); povCam.add(POV.mug); }
// the cabin from outside (meters), with you inside, hanging on its cable over the night Earth
const CAB = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(50, W / H, 0.05, 5000) };
const CB = {}; { const sc = CAB.sc; sc.add(new THREE.HemisphereLight(0xcfd8ff, 0x302820, 1.2)); const k2 = new THREE.DirectionalLight(0xfff0e0, 2.0); k2.position.set(-4, 3, 5); sc.add(k2);
  const metal = F_('#3a3e48', { metalness: 0.7, roughness: 0.3 }), box = new THREE.Group(); sc.add(box); CB.box = box;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(0.08, 2.6, 0.08, metal, x, 1.3, z, box); for (const y of [0, 2.6]) { bx(2.08, 0.1, 0.08, metal, 0, y, -1, box); bx(2.08, 0.1, 0.08, metal, 0, y, 1, box); bx(0.08, 0.1, 2.08, metal, -1, y, 0, box); bx(0.08, 0.1, 2.08, metal, 1, y, 0, box); }
  bx(2, 0.06, 2, '#4a4e58', 0, 0, 0, box); bx(2, 0.06, 2, '#4a4e58', 0, 2.6, 0, box);
  const gl = new THREE.MeshStandardMaterial({ color: '#a8c8e8', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false });
  CB.doorL = bx(1.0, 2.5, 0.02, gl, -0.5, 1.3, 1, box); CB.doorR = bx(1.0, 2.5, 0.02, gl, 0.5, 1.3, 1, box); bx(2, 2.5, 0.02, gl, 0, 1.3, -1, box); bx(0.02, 2.5, 2, gl, -1, 1.3, 0, box); bx(0.02, 2.5, 2, gl, 1, 1.3, 0, box);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4000, 6), metal); cab.position.set(0, 2000, -1.2); sc.add(cab); const cab2 = cab.clone(); cab2.position.set(0, -2000 + 0.02, -1.2); sc.add(cab2); CB.cables = [cab, cab2];
  CB.mug = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 14), F_('#e8603a')); m.position.y = 0.055; CB.mug.add(m); } CB.mug.position.set(0.4, 0.03, -0.4); box.add(CB.mug);
  // the parachute (canopy + lines), the pack, re-entry glow
  const canopy = new THREE.Group(); for (let k = 0; k < 12; k++) { const seg = new THREE.Mesh(new THREE.SphereGeometry(3.2, 4, 6, k * Math.PI / 6, Math.PI / 6, 0, Math.PI / 2.4), F_(k % 2 ? '#f4f4f0' : '#e8463a', { side: THREE.DoubleSide })); canopy.add(seg); }
  canopy.scale.set(1, 0.55, 1); CB.canopy = canopy; sc.add(canopy); CB.lines = new THREE.Group(); for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 4.2, 3), F_('#d8d8d8')); const a = k * Math.PI / 4; l.position.set(Math.cos(a) * 1.4, 2.1, Math.sin(a) * 1.4); l.rotation.set(Math.sin(a) * 0.33, 0, -Math.cos(a) * 0.33); CB.lines.add(l); } sc.add(CB.lines);
  CB.pack = bx(0.36, 0.48, 0.18, '#2a2a30', 0, 0, 0, sc);
  CB.glow = Array.from({ length: 40 }, (_, k) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: new THREE.Color(1.6, 0.45 + 0.35 * hash(k), 0.12), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sc.add(s); return s; }); }
// =================== THE STORY: POV shots (world + the cabin frame drawn on top), the cabin from outside over the night Earth, the jump, the parachute ===================
for (const o of [friend.outer]) o.visible = false;
const sp = (t, a, b) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const dirOf = (yaw, pitch) => V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));   // yaw 0 = north (−z), π = south
// [start, kind, (t) => { yaw, pitch, fov } | camera for 'cab'/'fall'/'land', { mb }]
const SHOTS = [
  [0, 'city', t => ({ yaw: 0.35 - 0.1 * sp(t, 0, UP), pitch: 0.22 - 0.1 * sp(t, 0, UP), fov: 74 })],   // Times Square at night, looking up from the cabin
  [UP, 'city', t => ({ yaw: Math.PI * 0.93, pitch: lerp(0.05, -0.22, sp(t, UP, CLOUD)), fov: 74 }), { mb: true }],   // shooting up past the towers, One WTC downtown
  [CLOUD, 'sky', t => ({ yaw: Math.PI * 0.9, pitch: lerp(-0.35, -0.55, sp(t, CLOUD, EVER)), fov: 72 }), { mb: true }],   // through the clouds, the city glowing below
  [EVER, 'sky', t => ({ yaw: Math.PI * 0.8, pitch: lerp(-0.7, -0.45, sp(t, EVER, JET)), fov: 70 })],   // Everest height: frost creeps over the glass
  [JET, 'sky', t => ({ yaw: 0.02, pitch: lerp(-0.08, -0.02, sp(t, JET, ARM)), fov: 66 })],   // an airliner slides past
  [ARM, 'sky', t => ({ yaw: 0.0, pitch: lerp(-0.12, -0.3, sp(t, ARM, KAR)), fov: 70 })],   // the sky goes black, the horizon curves
  [KAR, 'space', t => ({ yaw: 0.25, pitch: lerp(-0.3, -0.45, sp(t, KAR, ISS)), fov: 72 })],   // space: the night US in lights
  [ISS, 'space', t => ({ yaw: 0.0, pitch: -0.06, fov: 66 })],   // the ISS whips past
  [FLOAT, 'space', t => ({ yaw: 0.1, pitch: lerp(-0.6, -1.15, sp(t, FLOAT, FLOAT + 2)), fov: 70 })],   // you look down: your mug is still on the floor
  [FLOAT + 3.0, 'cab', t => { const a = lerp(0.6, 1.3, sp(t, FLOAT + 3, JUMP)); return { pos: V3(Math.sin(a) * 6.5, 2.2 + 0.6 * sp(t, FLOAT + 3, JUMP), Math.cos(a) * 6.5), look: V3(0, 1.2, 0), fov: 50 }; }],   // the cabin, alone over the Earth
  [JUMP, 'cab', t => ({ pos: V3(0.3, 1.55, 4.2 - 0.8 * sp(t, JUMP, JUMP + 2)), look: V3(0, 1.45, 0), fov: 50 })],   // doors open… a wink… a parachute pack
  [JUMP + 2.3, 'cab', t => ({ pos: V3(4.5, 0.5, 5.5), look: V3(0, -1.5 * sp(t, JUMP + 2.3, DROP), 2.5), fov: 55 })],   // he jumps
  [DROP, 'fall', t => ({ pos: V3(1.6, 2.6, 1.9), look: V3(0, -2.5, 0), fov: 62 })],   // from above: you + the night Earth below   // falling head-first toward the glowing Earth
  [DROP + 3.0, 'fall', t => ({ pos: V3(-1.2, 2.2, 2.0), look: V3(0, -1.8, 0), fov: 62 })],   // the air catches fire around him
  [LAND, 'land', t => { const y = lerp(130, 0, sp(t, LAND, LAND + 1.7)); return { pos: V3(6, y + 0.4, 32), look: V3(0, y + 2.6, 20), fov: 60 }; }]];   // under the canopy, the ads behind   // the parachute over Times Square
// ---- per-frame poses / props ----
function heroIn(scene) { if (hero.outer.parent !== scene) scene.add(hero.outer); hero.outer.visible = true; }
function poseHero(t, kind) { const P = hero; poseReset(P, t); CB.canopy.visible = CB.lines.visible = false; CB.pack.visible = false; CB.glow.forEach(s => s.visible = false);
  if (kind === 'cab') { heroIn(CAB.sc); const open = sp(t, JUMP + 0.2, JUMP + 0.8); CB.doorL.position.x = -0.5 - 0.95 * open; CB.doorR.position.x = 0.5 + 0.95 * open; CB.box.visible = true;
    const jt = t - (JUMP + 2.3); if (jt < 0) { place(P, 0, 0.0, t < JUMP + 0.6 ? Math.PI * 0.85 : 0, 0.0); P.face(t < FLOAT + 3 + 2.5 || t < JUMP ? 'neutral' : t < JUMP + 1.0 ? 'surprised' : 'smirk', t);
        if (t >= JUMP + 1.0 && t < JUMP + 1.8) { P.arms[1].rotation.set(-2.2, 0, -0.2); P.elbows[1].rotation.x = -1.6; }   // a little salute
        if (t >= JUMP + 1.8) { P.arms.forEach((a, i) => a.rotation.set(-0.4, 0, i ? -0.5 : 0.5)); P.root.rotation.x = 0.2 * sp(t, JUMP + 1.8, JUMP + 2.3); } }
    else { const u = jt; place(P, 0, 1.2 + 2.4 * u, 0, 1.0 * u - 4.9 * u * u * 0.5); P.root.rotation.x = 0.6 + 1.2 * u; P.arms.forEach((a, i) => a.rotation.set(-2.6, 0, i ? -0.6 : 0.6)); P.face('laugh', t); }
    P.outer.updateMatrixWorld(true); CB.pack.visible = true; CB.pack.position.copy(P.torso.localToWorld(V3(0, 0.15, -0.22))); CB.pack.quaternion.copy(P.torso.getWorldQuaternion(new THREE.Quaternion())); }
  else if (kind === 'fall') { heroIn(CAB.sc); CB.box.visible = false; place(P, 0, 0, 0, 0); P.outer.rotation.set(Math.PI * 0.55, 0.3 * Math.sin(t * 0.7), 0.15 * Math.sin(t * 1.3)); P.arms.forEach((a, i) => a.rotation.set(-1.4, 0, i ? -1.1 : 1.1)); P.legs.forEach((l, i) => l.rotation.x = 0.2 * Math.sin(t * 9 + i * 3)); P.face(t < DROP + 3 ? 'wired' : 'surprised', t);
    P.outer.updateMatrixWorld(true); CB.pack.visible = true; CB.pack.position.copy(P.torso.localToWorld(V3(0, 0.15, -0.22))); CB.pack.quaternion.copy(P.torso.getWorldQuaternion(new THREE.Quaternion()));
    const heat = sp(t, DROP + 1.5, DROP + 4.0) * (1 - sp(t, LAND - 0.6, LAND)); CB.glow.forEach((s, k) => { const u = ((t * 2.2 + k / 40) % 1); s.visible = heat > 0.02; s.position.set((hash(k) - 0.5) * 0.9 * (1 + u), -0.9 + 2.6 * u, (hash(k * 3) - 0.5) * 0.9 * (1 + u)); s.scale.setScalar((0.35 + 0.9 * u) * heat); s.material.opacity = 0.7 * (1 - u) * heat; }); }
  else if (kind === 'land') { heroIn(CITY.sc); const y = lerp(130, 0, sp(t, LAND, LAND + 1.7)); place(P, 0, 20, 0, y); P.arms.forEach((a, i) => a.rotation.set(-2.7, 0, i ? -0.25 : 0.25)); P.face(y > 1 ? 'happy' : 'laugh', t);
    CB.canopy.visible = CB.lines.visible = y > 0.5; if (CB.canopy.parent !== CITY.sc) { CITY.sc.add(CB.canopy); CITY.sc.add(CB.lines); CITY.sc.add(CB.pack); } CB.canopy.position.set(0, y + 0.95 + 4.4, 20); CB.lines.position.set(0, y + 0.95 + 0.3, 20);
    P.outer.updateMatrixWorld(true); CB.pack.visible = true; CB.pack.position.copy(P.torso.localToWorld(V3(0, 0.15, -0.22))); CT.heroLight.position.set(2, y + 3, 24); }
  if (kind !== 'land' && CB.canopy.parent !== CAB.sc) { CAB.sc.add(CB.canopy); CAB.sc.add(CB.lines); CAB.sc.add(CB.pack); } }
// ---- render one shot into rt: the world, then (POV) the cabin frame on top / (cab, fall) the meters scene on top of space ----
const RTB2 = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function renderWorld(scene, cam, rt, clear = true) { cam.aspect = W / H; cam.updateProjectionMatrix(); renderer.setRenderTarget(rt); if (clear) { renderer.setClearColor(0x000000, 1); renderer.clear(); } else renderer.clearDepth(); renderer.render(scene, cam); }
function shoot(i, t, rt) { const [, kind, cf] = SHOTS[i], alt = altAt(t), F = cf(t); renderer.autoClear = false; puffsReset(); hero.outer.visible = false;
  if (kind === 'city' || kind === 'sky' || kind === 'space') {
    const W_ = kind === 'city' ? CITY : kind === 'sky' ? SKY : SPACE, cam = W_.cam, k = kind === 'space' ? 0.001 : 1, d = dirOf(F.yaw, F.pitch);
    cam.fov = F.fov; cam.position.set(0, (alt + 1.6) * k, 0); cam.lookAt(cam.position.clone().add(d));
    if (kind === 'city') updateCity(t, cam); else if (kind === 'sky') updateSky(t, cam, alt); else updateSpace(t, cam);
    renderWorld(W_.sc, cam, rt);
    povCam.fov = F.fov; povCam.position.set(0, 0, 0); povCam.quaternion.copy(cam.quaternion); povCam.updateMatrixWorld(true);
    POV.frost.material.opacity = 0.55 * sp(t, EVER + 0.5, EVER + 2.5) * (1 - sp(t, ARM - 0.5, ARM + 1.5)); POV.mug.visible = t >= FLOAT;
    renderWorld(POVS, povCam, rt, false); }
  else if (kind === 'cab' || kind === 'fall') {
    poseHero(t, kind); const c = CAB.cam; c.fov = F.fov; c.position.copy(F.pos); c.lookAt(F.look); c.updateMatrixWorld(true);
    CB.cables.forEach(c => { c.visible = kind === 'cab'; }); const altKm = kind === 'fall' ? lerp(400, 70, Math.pow(sp(t, DROP, LAND), 0.8)) : 400, sc = SPACE.cam; sc.fov = F.fov; sc.position.set(c.position.x / 1000, altKm + c.position.y / 1000, c.position.z / 1000); sc.quaternion.copy(c.quaternion); updateSpace(t, sc);
    renderWorld(SPACE.sc, sc, rt); renderWorld(CAB.sc, c, rt, false); }
  else { poseHero(t, 'land'); const c = CITY.cam; c.fov = F.fov; c.position.copy(F.pos); c.lookAt(F.look); updateCity(t, c); renderWorld(CITY.sc, c, rt); }
  renderer.autoClear = true; }
// ---- motion blur (sub-frame accumulation) for the rush shots ----
const RTACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, uniforms: { tSrc: { value: null }, uW: { value: 0.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0); }' });
const accSc = new THREE.Scene(); accSc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat)); const MB_K = 4, SHUTTER = 0.5 / 30;
// ---- DOM: HUD (altitude + the elevator clock), the to-scale minimap, captions ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS', 'flash', 'mini'].map(k => [k, $(k)]));
const CAPS = [[UP + 0.2, UP + 2.6, 'The fastest elevator on Earth: <b>47 mph</b>.'], [UP + 2.6, CLOUD - 0.1, '26 seconds: you pass One World Trade.'],
  [CLOUD + 0.3, EVER - 0.1, '6,500 ft. Your ears pop.'],
  [EVER + 0.3, EVER + 3.0, 'Everest height: the air is <b>1/3</b> as thick.'], [EVER + 3.0, JET - 0.1, 'Without the cabin: 3–5 minutes before you pass out.'],
  [JET + 0.3, JET + 3.0, 'Airliners. Outside: <b>−65°F</b>.'], [JET + 3.0, ARM - 0.1, 'Out there you’d have about 30 seconds.'],
  [ARM + 0.3, ARM + 3.0, '63,000 ft: the Armstrong limit.'], [ARM + 3.0, KAR - 0.1, 'Above it, your saliva would boil.'],
  [KAR + 0.3, KAR + 3.0, '62 miles: officially <b>SPACE</b>.'], [KAR + 3.0, ISS - 0.1, '79 minutes after Times Square.'],
  [ISS + 0.3, ISS + 3.0, '5 hours 19 minutes: the ISS’s height.'], [ISS + 3.0, FLOAT - 0.1, 'It flies past at <b>17,500 mph</b>.'],
  [FLOAT + 0.3, FLOAT + 3.0, 'But you don’t float. Gravity here: still <b>~90%</b>.'], [FLOAT + 3.0, JUMP - 0.1, 'Astronauts float because they’re falling around Earth at 17,500 mph.'],
  [JUMP + 2.3, DROP - 0.1, '…'], [DROP + 0.2, DROP + 3.0, 'You’d hit the air at <b>~5,200 mph</b>: 6× the record jump.'], [DROP + 3.0, LAND - 0.1, 'In real life you’d need a heat shield. Let’s pretend.'],
  [LAND + 0.1, ENDC - 0.05, 'Total trip: 5 h 19 min up, ~15 min down.']];
const fmtClock = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`; };
function hudAt(t) { if (t < UP - 0.2 || t >= LAND) return null; const alt = altAt(t);
  if (t >= DROP && t < LAND) return ['FALLING', fmt(5200 * sp(t, DROP, DROP + 2.5)) + ' MPH', 'FROM 250 MILES UP'];
  if (t >= JUMP) return ['ALTITUDE', '250 MI', 'DOORS OPEN'];
  const v = alt < 30000 ? fmt(alt * 3.281) + ' FT' : (alt / 1609.34 < 10 ? (alt / 1609.34).toFixed(1) : fmt(alt / 1609.34)) + ' MI';
  return ['ALTITUDE', v, 'TIME IN ELEVATOR ' + fmtClock(alt / 21) + ' · 47 MPH']; }
const MARKS = [['ONE WTC', 541], ['CLOUDS', 2000], ['EVEREST', 8849], ['JETS', 10668], ['ARMSTRONG LIMIT', 19202], ['SPACE', 100000], ['ISS', 400000]];
function miniAt(t) { if (t < UP || t >= JUMP + 2.3) return ''; const yOf = a => 200 - 180 * Math.log10(1 + a / 50) / Math.log10(1 + 400000 / 50), alt = altAt(t), y = yOf(alt);
  return `<svg width="230" height="230" viewBox="0 0 230 230"><circle cx="115" cy="115" r="112" fill="rgba(8,12,24,0.72)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
    <line x1="80" y1="20" x2="80" y2="200" stroke="rgba(255,255,255,0.35)" stroke-width="2"/><line x1="80" y1="${y.toFixed(1)}" x2="80" y2="200" stroke="#ffd060" stroke-width="4"/>
    ${MARKS.map(([n, a]) => `<line x1="74" x2="86" y1="${yOf(a).toFixed(1)}" y2="${yOf(a).toFixed(1)}" stroke="rgba(255,255,255,0.6)" stroke-width="2"/><text x="92" y="${(yOf(a) + 4).toFixed(1)}" font-family="Inter" font-size="11" font-weight="600" fill="rgba(255,255,255,${alt >= a ? 0.95 : 0.45})" letter-spacing="1">${n}</text>`).join('')}
    <circle cx="80" cy="${y.toFixed(1)}" r="7" fill="#ffd060"/><text x="58" y="${(y + 4).toFixed(1)}" font-family="Inter" font-size="11" font-weight="700" fill="#ffd060" text-anchor="end">YOU</text>
    <text x="115" y="222" font-family="Inter" font-size="10" font-weight="600" fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="2">TO SCALE (LOG)</text></svg>`; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, UP, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.15) : 0;
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.mini.innerHTML = miniAt(t); el.mini.style.opacity = fadeWin(t, UP, JUMP + 2.3, 0.3);
  el.flash.style.opacity = 0.5 * Math.exp(-Math.pow((t - KAR) / 0.1, 2)) + 0.35 * Math.exp(-Math.pow((t - LAND) / 0.1, 2));
  el.labels.innerHTML = '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.7, ENDC + 1.0, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  const o = SHOTS[i][3] || {}; let src = RTA;
  if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER * 2); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; } else shoot(i, t, RTA);
  compMat.uniforms.tA.value = src.texture; compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 1.0; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth();
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
