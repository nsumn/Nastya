import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "What if you could fly for one day?" (her idea, made funny: everything goes wrong). Golden-hour Manhattan, cinematic (DOF, motion blur, whips, chase cams).
// Facts: ~3.5°F colder per 1,000 ft (standard lapse 2°C/1,000 ft), drones must stay under 400 ft (FAA Part 107), ~19,600 wildlife strikes on US civil aircraft in 2023 (FAA).
// =================== timeline (s) ===================
const OUT = 3.0, PIGEON = 9.0, BUGS = 15.0, COLD = 20.5, JET = 26.0, COFFEE = 33.0, LOST = 40.0, POOL = 45.5, ROOF = 52.0, ENDC = 61.0, T_END = 64.0;
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
// =================== SETS (each its own scene + camera; you are re-parented into whichever set is shot) ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false })));
  sc.fog = new THREE.Fog(fog, near, far); const hm = new THREE.HemisphereLight(...hemi); sc.add(hm);
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 80 }); sc.add(s, s.target); sc.userData.sun = s; sc.userData.hemi = hm;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D(), _c = new THREE.Color();
// bake a group (people.js person, makeCar…) into ONE geometry with vertex colours, so thousands can be instanced cheaply
const BAKE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
function bake(group) { group.updateMatrixWorld(true); const gs = [];
  group.traverse(o => { if (!o.isMesh || !o.visible) return; let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.color) { const c = (Array.isArray(o.material) ? o.material[0] : o.material).color || new THREE.Color(1, 1, 1), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    gs.push(g); }); return mergeGeometries(gs); }
// the crowd: 12 beachgoers (people.js, built from simple shapes like on our streets) × 4 poses
const GLSL_HASH = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`;
const SUN_DIR = V3(-0.55, 0.32, -0.77).normalize(), HAZE = new THREE.Color('#f0b47a');
// ---------- 1) THE BEDROOM (hook): you wake up, float… and bonk the ceiling fan ----------
const BED = mkSet({ top: '#9cc4ec', bot: '#f4dcc0', fog: 0xf4e4d0, near: 30, far: 200, hemi: [0xfff0e0, 0x8a6a50, 1.0], sun: [0xffd8a8, 2.6, V3(6, 5, 4)], shadow: 6 });
const BD = {}; { const sc = BED.sc, wall = F_('#e8dcc8'), wood = F_('#b88a60');
  gplane(sc, 6, 6, wood, 0, 0); bx(6, 0.1, 6, '#f4f0e8', 0, 2.8, 0, sc); bx(0.1, 2.8, 6, wall, -3, 1.4, 0, sc); bx(6, 2.8, 0.1, wall, 0, 1.4, -3, sc);
  bx(0.1, 2.8, 1.4, wall, 3, 1.4, -2.3, sc); bx(0.1, 2.8, 1.4, wall, 3, 1.4, 2.3, sc); bx(0.1, 0.8, 3.2, wall, 3, 0.4, 0, sc); bx(0.1, 0.5, 3.2, wall, 3, 2.55, 0, sc);   // a big window on the right (+x)
  const bed = new THREE.Group(); bx(1.6, 0.4, 2.2, '#6a4a34', 0, 0.2, 0, bed); bx(1.5, 0.18, 2.1, '#f4f2ee', 0, 0.48, 0, bed); bx(1.5, 0.12, 1.3, '#e8603a', 0, 0.6, 0.35, bed); bx(0.6, 0.12, 0.4, '#fff', -0.4, 0.62, -0.8, bed); bx(0.6, 0.12, 0.4, '#fff', 0.4, 0.62, -0.8, bed); bx(1.6, 0.9, 0.1, '#6a4a34', 0, 0.65, -1.1, bed); bed.position.set(-0.6, 0, -1.6); sc.add(bed);
  BD.fan = new THREE.Group(); bx(0.04, 0.35, 0.04, '#d8d8dc', 0, -0.17, 0, BD.fan); const hub = mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.14, 14), F_('#e8e8ec', { metalness: 0.4 })); hub.position.y = -0.38; BD.fan.add(hub);
  BD.blades = new THREE.Group(); BD.blades.position.y = -0.42; BD.fan.add(BD.blades); for (let k = 0; k < 5; k++) { const b = bx(0.7, 0.02, 0.14, '#8a6a4a', 0.42, 0, 0, BD.blades); const g = new THREE.Group(); g.add(b); g.rotation.y = k * Math.PI * 2 / 5; BD.blades.add(g); }
  BD.fan.position.set(-0.6, 2.75, -1.2); sc.add(BD.fan);
  const city = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8ab8e8'); gr.addColorStop(1, '#f8d8b0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const x = hash(i) * w, bw = 20 + 40 * hash(i * 3), bh = 120 + 300 * hash(i * 5); g.fillStyle = ['#c8b8a8', '#a8b0c0', '#d8c8b0', '#8a98b0'][i % 4]; g.fillRect(x, h - bh, bw, bh); } });
  const cp = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshBasicMaterial({ map: city }), false, false); cp.position.set(9, 2, 0); cp.rotation.y = -Math.PI / 2; sc.add(cp);
  BD.stars = Array.from({ length: 5 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffd040'; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 12 : 30, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); }), transparent: true, depthWrite: false })); s.scale.setScalar(0.12); sc.add(s); return s; }); }
function updateBed(t) { BD.blades.rotation.y = -t * (t < 1.55 ? 14 : 3); BD.fan.rotation.z = t > 1.55 ? 0.15 * Math.exp(-(t - 1.55) * 3) * Math.sin((t - 1.55) * 30) : 0; }
// ---------- 2) MANHATTAN AT GOLDEN HOUR (meters): ~12,000 towers with a DAY window shader (sky reflections, warm sun, haze), streets, the park, the river ----------
const CITY = mkSet({ top: '#5a8ad0', bot: '#f6c896', fog: 0xf2c89a, near: 300, far: 5200, hemi: [0xffe4c8, 0x6a6058, 1.0], sun: [0xffd0a0, 3.2, SUN_DIR.clone().multiplyScalar(300)], shadow: 60 });
CITY.cam.far = 30000;
// a sky dome big enough for the whole flight: golden-hour gradient + a sun glow
{ const dome = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: SUN_DIR } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSun; varying vec3 vD; void main(){ float h = clamp(vD.y, -0.1, 1.0); vec3 c = mix(vec3(0.97, 0.78, 0.58), vec3(0.33, 0.52, 0.82), smoothstep(0.0, 0.55, h)); float s = max(dot(normalize(vD), uSun), 0.0); c += vec3(1.0, 0.75, 0.45) * (pow(s, 12.0) * 0.6 + pow(s, 400.0) * 3.0); gl_FragColor = vec4(c, 1.0); }' }));
  dome.frustumCulled = false; CITY.sc.add(dome); }
const towerDay = new THREE.ShaderMaterial({ uniforms: { uSun: { value: SUN_DIR }, uHaze: { value: HAZE }, uCam: { value: new THREE.Vector3() } },
  vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed;
    void main(){ mat4 im = instanceMatrix; vec4 w = modelMatrix * im * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * im) * normal); vC = vec3(1.0);
      \n#ifdef USE_INSTANCING_COLOR\n vC = instanceColor; \n#endif\n vSeed = im[3].xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uSun, uHaze, uCam; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed; ${GLSL_HASH}
    void main(){ vec3 n = normalize(vN), v = normalize(uCam - vW); float dif = max(dot(n, uSun), 0.0), side = 1.0 - step(0.5, abs(n.y));
      vec3 col = vC * (0.42 + 0.9 * dif * vec3(1.0, 0.86, 0.68)) + vec3(0.04, 0.05, 0.08);
      if (side > 0.5) { float u = abs(n.x) > 0.5 ? vW.z : vW.x; vec2 g = vec2(u / 3.0, vW.y / 3.6); vec2 c = floor(g), f = fract(g);
        float win = step(0.14, f.x) * step(f.x, 0.86) * step(0.2, f.y) * step(f.y, 0.8);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.0); vec3 sky = mix(vec3(0.42, 0.55, 0.72), vec3(1.0, 0.82, 0.6), 0.4 + 0.4 * fres);
        vec3 glass = mix(vec3(0.12, 0.16, 0.22), sky, 0.35 + 0.55 * fres) * (0.85 + 0.3 * h21(c + vSeed));
        float glint = pow(max(dot(reflect(-uSun, n), v), 0.0), 40.0) * 3.0; col = mix(col, glass + glint * vec3(1.0, 0.85, 0.6), win * 0.9); }
      else col *= 1.05;
      float d = length(vW - uCam); col = mix(col, uHaze, clamp(1.0 - exp(-d * 0.00011), 0.0, 0.85)); gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }` });
const groundDay = new THREE.ShaderMaterial({ uniforms: { uHaze: { value: HAZE }, uCam: { value: new THREE.Vector3() }, uT: { value: 0 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uHaze, uCam; uniform float uT; varying vec3 vW; ${GLSL_HASH}
    void main(){ vec2 p = vW.xz; float water = (abs(p.x) > 1750.0 && abs(p.x) < 2350.0) || p.y > 7600.0 ? 1.0 : 0.0;
      float park = step(abs(p.x - 100.0), 400.0) * step(-4600.0, p.y) * step(p.y, -1500.0);
      float av = 1.0 - smoothstep(4.0, 7.0, abs(mod(p.x + 70.0, 140.0) - 70.0)), st = 1.0 - smoothstep(3.0, 5.0, abs(mod(p.y + 35.0, 70.0) - 35.0));
      vec3 col = mix(vec3(0.62, 0.6, 0.56), vec3(0.32, 0.32, 0.34), max(av, st));
      float cab = step(0.82, h21(floor(vec2(p.x / 4.0, (p.y - uT * 9.0) / 9.0)))) * av; col = mix(col, vec3(0.95, 0.75, 0.15), cab);
      col = mix(col, mix(vec3(0.28, 0.48, 0.22), vec3(0.36, 0.56, 0.26), vn(p * 0.02)), park);
      col = mix(col, vec3(0.2, 0.36, 0.5) + 0.12 * vn(p * 0.05 + uT * 0.2), water);
      float d = length(vW - uCam); col = mix(col, uHaze, clamp(1.0 - exp(-d * 0.00011), 0.0, 0.85)); gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }` });
const CT = {}; { const sc = CITY.sc; const gnd = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), groundDay); gnd.rotation.x = -Math.PI / 2; sc.add(gnd);
  const T = []; for (let bx2 = -11; bx2 <= 11; bx2++) for (let bz = -60; bz <= 108; bz++) { const cx = bx2 * 140, cz = bz * 70; if (Math.abs(cx - 100) < 420 && cz > -4620 && cz < -1480) continue;
    const mid = Math.exp(-((cz / 1800) ** 2)), down = Math.exp(-(((cz - 6200) / 900) ** 2)), k = (bx2 + 20) * 1000 + bz, n = 2 + ((hash(k) * 3) | 0);
    for (let q = 0; q < n; q++) { const w = Math.min(22 + 30 * hash(k * 3 + q), 112 / n - 6), d = Math.min(18 + 22 * hash(k * 5 + q), 52), x = cx + (q - (n - 1) / 2) * (112 / n), z = cz + (hash(k * 7 + q) - 0.5) * 18;
      T.push([x, z, w, d, 18 + (40 + 300 * mid + 260 * down) * Math.pow(hash(k * 11 + q), 2.2) + 30 * hash(k * 13 + q)]); } }
  for (let k = 0; k < 2000; k++) { const s2 = k % 2 ? 1 : -1; T.push([s2 * (2600 + 9000 * hash(k)), -8000 + 18000 * hash(k * 3), 20 + 25 * hash(k * 5), 20 + 25 * hash(k * 7), 12 + 50 * hash(k * 9) ** 2]); }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerDay, T.length); T.forEach(([x, z, w, d, h], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.set(w, h, d); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); im.setColorAt(i, _c.setHSL(0.06 + 0.06 * hash(i), 0.18 + 0.2 * hash(i * 5), 0.5 + 0.25 * hash(i * 3))); });
  im.castShadow = true; sc.add(im); CT.towers = T;
  // the hero's rooftop: a water tower + AC units on a 160 m tower near the park's south end
  CT.roofY = 160; const rt = new THREE.Group(); bx(46, 160, 40, '#c8a888', 0, 80, 0, rt); bx(46.4, 1.0, 40.4, '#8a7a6a', 0, 160.5, 0, rt);
  const wt = new THREE.Group(); for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) bx(0.3, 5, 0.3, '#5a4a3a', x, 2.5, z, wt); const tank = mesh(new THREE.CylinderGeometry(2.8, 2.8, 5, 18), F_('#9a6a44')); tank.position.y = 7.5; wt.add(tank); const cone = mesh(new THREE.ConeGeometry(3.0, 2, 18), F_('#5a4030')); cone.position.y = 11; wt.add(cone); wt.position.set(-12, 161, -8); rt.add(wt);
  for (let k = 0; k < 5; k++) bx(3, 1.6, 2.2, '#b8bcc4', 6 + (k % 3) * 4.5, 161.8, 6 + Math.floor(k / 3) * 5, rt); rt.position.set(840, 0, -2800); sc.add(rt); CT.roof = rt;
  // the office tower with an open window on floor 30 (the latte)
  const of = new THREE.Group(); bx(50, 220, 40, '#a8b8c8', 0, 110, 0, of); const room = new THREE.Group(); bx(10, 0.2, 6, '#8a8a92', 0, 0, 0, room); bx(10, 3.2, 0.2, '#e8e8ec', 0, 1.6, -3, room); bx(4, 0.8, 1.6, '#c8b8a0', 0, 0.75, -1.5, room);
  const mon = bx(1.2, 0.7, 0.06, '#1a1a22', 0, 1.6, -2.0, room); room.position.set(0, 102, 20.3); of.add(room); { const ot = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fffbe8'; for (let x = 20; x < w; x += 90) g.fillRect(x, 10, 60, 8); g.fillStyle = '#c8c2b8'; g.fillRect(0, 150, w, 106);
    for (let x = 10; x < w; x += 120) { g.fillStyle = '#b89a78'; g.fillRect(x, 140, 90, 14); g.fillStyle = '#2a2a30'; g.fillRect(x + 25, 100, 40, 32); g.fillStyle = '#5a9ad8'; g.fillRect(x + 28, 103, 34, 26); g.fillStyle = '#3a8a4a'; g.beginPath(); g.arc(x + 100, 120, 18, 0, 6.3); g.fill(); } });
  const op = mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: ot, color: new THREE.Color(1.1, 1.1, 1.1) }), false, false); op.position.set(0, 2.2, -0.25); room.add(op); }
  CT.officeRoom = room; of.position.set(-420, 0, -600); sc.add(of); CT.office = of;
  { const r0 = seed; seed = 5150; const p = makePerson(rnd, { top: '#f4f4f0', longSleeve: true }); seed = r0; room.add(p.outer); p.outer.position.set(0.4, 0.95 + 0.1, 0.6); poseIdle(p, 0, 0); CT.worker = p; }
  // pigeons: 30 birds (body + 2 flapping wings)
  CT.birds = Array.from({ length: 30 }, (_, k) => { const g = new THREE.Group(), gm = F_(k % 5 ? '#8a8e9a' : '#6a6e7a'); const b = mesh(new THREE.SphereGeometry(0.16, 8, 6), gm); b.scale.set(1, 0.9, 1.7); g.add(b); const hd = mesh(new THREE.SphereGeometry(0.09, 8, 6), F_('#5a6a7a')); hd.position.set(0, 0.08, -0.26); g.add(hd);
    const beak = mesh(new THREE.ConeGeometry(0.025, 0.07, 4), F_('#e8a040')); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.07, -0.36); g.add(beak); const wings = []; for (const s2 of [-1, 1]) { const w = new THREE.Group(); const wm = mesh(new THREE.BoxGeometry(0.42, 0.02, 0.2), gm); wm.position.x = s2 * 0.21; w.add(wm); w.position.x = s2 * 0.1; g.add(w); wings.push(w); } g.userData.w = wings; g.scale.setScalar(0.6); sc.add(g); return g; });
  // the airliner (white, wings, tail, windows), a long way bigger than you
  const pl = new THREE.Group(), white = F_('#eef2f6', { roughness: 0.4 }); const fus = mesh(new THREE.CylinderGeometry(2.0, 2.0, 60, 16), white); fus.rotation.z = Math.PI / 2; pl.add(fus); const nose = mesh(new THREE.SphereGeometry(2.0, 14, 10), white); nose.scale.set(2.2, 1, 1); nose.position.x = 30; pl.add(nose);
  const wing = mesh(new THREE.BoxGeometry(10, 0.5, 64), white); wing.position.set(2, -0.6, 0); wing.rotation.y = 0.25; pl.add(wing); const tl = mesh(new THREE.BoxGeometry(6, 9, 0.5), F_('#2a5ad8')); tl.position.set(-27, 5, 0); pl.add(tl); const hs = mesh(new THREE.BoxGeometry(5, 0.4, 20), white); hs.position.set(-27, 1, 0); pl.add(hs);
  bx(56, 0.9, 4.1, '#2a5ad8', 0, -0.6, 0, pl); for (let k = 0; k < 34; k++) for (const s2 of [-1, 1]) bx(0.6, 0.5, 0.05, '#1a2230', -20 + k * 1.3, 0.7, s2 * 2.0, pl); for (const s2 of [-1, 1]) { const en = mesh(new THREE.CylinderGeometry(1.2, 1.1, 4.4, 14), F_('#d8dce0')); en.rotation.z = Math.PI / 2; en.position.set(4, -2.0, s2 * 9); pl.add(en); }
  CT.plane = pl; sc.add(pl); }
function updateCity(t, cam) { towerDay.uniforms.uCam.value.copy(cam.position); groundDay.uniforms.uCam.value.copy(cam.position); groundDay.uniforms.uT.value = t; }
// the flight path: P(t) in the city, your body pointing along the velocity
function flyPath(t) { const k = clamp((t - OUT) / (COFFEE - OUT), 0, 1); const z = lerp(-1200, -900, k) - 900 * Math.sin(k * 2.2), x = 160 - 600 * k + 120 * Math.sin(k * 7), y = lerp(170, 520, Math.min(1, k * 1.6)) + 20 * Math.sin(k * 11); return V3(x, y, z); }
// ---------- 3) THE BACKYARD POOL: a lawn, a fence, a house, the neighbors on loungers ----------
const YARD = mkSet({ top: '#6aa0e0', bot: '#f8d8b0', fog: 0xf0d8b8, near: 40, far: 300, hemi: [0xfff0e0, 0x6a7050, 1.1], sun: [0xffd8a8, 2.8, V3(8, 10, 6)], shadow: 14 });
const YD = {}; { const sc = YARD.sc; gplane(sc, 200, 200, '#6aa04a', 0, 0); const deck = bx(9, 0.1, 7, '#e8dcc4', 0, 0.05, 0, sc);
  const wm = new THREE.MeshStandardMaterial({ color: '#4ac0e8', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88 }); YD.water = mesh(new THREE.PlaneGeometry(6, 3.6, 40, 24), wm, false, true); YD.water.rotation.x = -Math.PI / 2; YD.water.position.set(0, 0.06, 0); sc.add(YD.water); YD.w0 = YD.water.geometry.attributes.position.array.slice();
  bx(6.2, 0.12, 0.12, '#f4f4f0', 0, 0.12, 1.85, sc); bx(6.2, 0.12, 0.12, '#f4f4f0', 0, 0.12, -1.85, sc); bx(0.12, 0.12, 3.8, '#f4f4f0', 3.05, 0.12, 0, sc); bx(0.12, 0.12, 3.8, '#f4f4f0', -3.05, 0.12, 0, sc);
  const house = new THREE.Group(); bx(12, 6, 8, '#f2e4cc', 0, 3, 0, house); const roof = mesh(new THREE.ConeGeometry(8.6, 3, 4), F_('#8a4a3a')); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.7); roof.position.y = 7.5; house.add(roof); house.position.set(0, 0, -12); sc.add(house);
  for (let x = -15; x <= 15; x += 1.2) bx(0.1, 1.6, 0.1, '#f4f4f0', x, 0.8, 7, sc); bx(30, 0.1, 0.06, '#f4f4f0', 0, 1.4, 7, sc);
  YD.ppl = [-2.8, 2.8].map((x, i) => { const l = new THREE.Group(); bx(0.7, 0.3, 1.9, i ? '#e8463a' : '#2a6ad8', 0, 0.3, 0, l); l.position.set(x, 0, 3.0); sc.add(l); const r0 = seed; seed = 9100 + i; const p = makePerson(rnd, { shorts: true, longSleeve: false }); seed = r0; sc.add(p.outer); p.outer.position.set(x, 0.5, 3.0); p.outer.rotation.y = Math.PI; poseSit(p); return p; });
  YD.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.8, 2.0) }), 400); YD.drops.frustumCulled = false; sc.add(YD.drops); }
function updateYard(t) { const pos = YD.water.geometry.attributes.position, a = pos.array, w0 = YD.w0, s0 = POOL + 1.9; for (let k = 0; k < a.length; k += 3) { const x = w0[k], y = w0[k + 1], r = Math.hypot(x, y); a[k + 2] = 0.02 * Math.sin(x * 3 + t * 2) + (t > s0 ? 0.18 * Math.exp(-(t - s0) * 0.8) * Math.sin(r * 5 - (t - s0) * 9) * Math.exp(-r * 0.4) : 0); } pos.needsUpdate = true; YD.water.geometry.computeVertexNormals();
  const u = t - s0; for (let k = 0; k < 400; k++) { const a2 = hash(k) * 6.28, v = 2 + 4 * hash(k * 3), q = u / 1.2; if (q > 0 && q < 1) { _o.position.set(Math.cos(a2) * v * 0.4 * q, 0.1 + v * q * 1.2 - 4.9 * q * q * 1.4, Math.sin(a2) * v * 0.4 * q); _o.scale.setScalar(1); } else { _o.position.set(0, -10, 0); _o.scale.setScalar(0.001); } _o.updateMatrix(); YD.drops.setMatrixAt(k, _o.matrix); } YD.drops.instanceMatrix.needsUpdate = true;
  YD.ppl.forEach((p, i) => { poseSit(p); if (t > s0 + 0.2) { p.arms.forEach(a2 => a2.rotation.set(-2.6, 0, i ? -0.4 : 0.4)); p.elbows.forEach(e => e.rotation.x = -0.4); } }); }
// =================== THE STORY: wake up floating (bonk), out over Manhattan at golden hour, pigeons, bugs, cold, a jet, a latte through a window, lost, the pool, the roof ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const mid = () => H_(hero).lerp(H_(friend), 0.5); const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
// seated: hips on a seat at height y (hip joint sits 0.9·h above the body origin, which is 0.95 below outer)
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1)), span = (t, a, b) => (t - a) / (b - a), Y_ = V3(0, 1, 0);
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
for (const o of [friend.outer]) o.visible = false;
const latte = new THREE.Group(); { const c = mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.12, 14), F_('#f4f0e8', { flatShading: false })); latte.add(c); const sl = mesh(new THREE.CylinderGeometry(0.041, 0.036, 0.04, 14), F_('#8a5a3a')); sl.position.y = -0.01; latte.add(sl); const lid = mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.015, 14), F_('#f4f4f4')); lid.position.y = 0.066; latte.add(lid); }
const phone = new THREE.Group(); { bx(0.075, 0.15, 0.01, '#1a1a1e', 0, 0, 0, phone); const scr = mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ color: '#0a0a0e' })); scr.position.z = 0.006; phone.add(scr); phone.userData.scr = scr; }
const frost = new THREE.Group(); for (let k = 0; k < 14; k++) { const f = mesh(new THREE.ConeGeometry(0.008, 0.03, 4), F_('#e8f4ff', { emissive: '#406080' })); f.position.set(-0.09 + k * 0.014, 0.1 + 0.01 * Math.sin(k), 0.19); f.rotation.x = Math.PI; frost.add(f); } hero.head.add(frost); frost.scale.setScalar(1 / 0.42); frost.position.set(0, 0, 0); frost.visible = false;
const bugs = new THREE.Group(); for (let k = 0; k < 7; k++) { const b = mesh(new THREE.SphereGeometry(0.006, 6, 4), F_('#151515')); b.position.set(-0.03 + k * 0.01, -0.085 + 0.006 * Math.sin(k * 2), 0.205); bugs.add(b); } hero.head.add(bugs); bugs.scale.setScalar(1 / 0.42); bugs.visible = false;
function attach(obj, P, k = 1) { P.outer.updateMatrixWorld(true); obj.position.copy(P.elbows[k].localToWorld(V3(0, -0.3, 0.06))); }
function flyPose(P, t, pos, dir, wob = 1) { place(P, 0, 0, 0, 0); P.outer.position.copy(pos); P.outer.rotation.order = 'YXZ'; P.outer.rotation.set(Math.PI / 2 - 0.25 + 0.05 * Math.sin(t * 2.3) * wob, Math.atan2(dir.x, dir.z), 0.08 * Math.sin(t * 1.7) * wob);
  P.arms[1].rotation.set(-3.0, 0, -0.1); P.elbows[1].rotation.x = -0.1; P.arms[0].rotation.set(-0.1, 0, 0.12); P.legs.forEach((l, i) => l.rotation.x = 0.08 * Math.sin(t * 3 + i * 3)); P.knees.forEach(k => k.rotation.x = 0.1); }
const fpos = t => flyPath(t), fdir = t => flyPath(t + 0.05).sub(flyPath(t)).normalize();
function pose(t, k) { const P = hero; poseReset(P, t); P.outer.rotation.order = 'XYZ'; latte.visible = phone.visible = frost.visible = bugs.visible = false; BD.stars.forEach(s => s.visible = false);
  if (k === 'bed') { const up = smooth(0.9, 1.5, t), down = smooth(1.62, 2.1, t); place(P, -0.6, -1.4, 0, lerp(0.05, 0.98, up) - 0.5 * down);
    P.outer.rotation.set(-Math.PI / 2 * (1 - smooth(1.0, 1.4, t)) * (1 - down) + (-Math.PI / 2) * down * 0.0, 0, 0); P.face(t < 0.9 ? 'sleepy' : t < 1.55 ? 'surprised' : 'dumb', t);
    if (t > 1.55) { P.outer.updateMatrixWorld(true); const hd = headOf(P); BD.stars.forEach((s, i) => { s.visible = t < 3.0; const a = t * 6 + i * 1.256; s.position.copy(hd).add(V3(Math.cos(a) * 0.22, 0.2 + 0.03 * Math.sin(a * 2), Math.sin(a) * 0.22)); }); } }
  else if (k === 'city') { const pos = fpos(t), dir = fdir(t); flyPose(P, t, pos, dir, 1);
    if (t >= PIGEON && t < BUGS) { P.arms[0].rotation.set(-2.4 + 0.5 * Math.sin(t * 12), 0, 0.8); P.elbows[0].rotation.x = -1.2; P.face(Math.sin(t * 5) > 0 ? 'angry' : 'surprised', t); }
    else if (t >= BUGS && t < COLD) { P.face(t < BUGS + 1.8 ? 'laugh' : 'dumb', t); bugs.visible = t > BUGS + 1.8; }
    else if (t >= COLD && t < JET) { P.face('worried', t); frost.visible = true; P.outer.position.x += 0.01 * Math.sin(t * 40); }
    else if (t >= JET && t < COFFEE) { const tumble = smooth(JET + 3.0, JET + 3.6, t) * (1 - smooth(JET + 5.6, JET + 6.6, t)); P.outer.rotation.z += 6.0 * tumble * (t - JET - 3); P.face(tumble > 0.1 ? 'dumb' : 'surprised', t); }
    else P.face('laugh', t); }
  else if (k === 'office') { const pos = CT.office.position.clone().add(V3(0, 102.6, 22.6)); place(P, 0, 0, 0, 0); P.outer.position.copy(pos).add(V3(0, 0.95 + 0.05 * Math.sin(t * 2), 0)); P.outer.rotation.y = Math.PI; P.legs.forEach((l, i) => l.rotation.x = 0.2 * Math.sin(t * 2 + i));
    const got = t > COFFEE + 3.4; if (got) { P.arms[1].rotation.set(-1.5, 0, -0.1); P.elbows[1].rotation.x = -1.2 - 0.3 * smooth(COFFEE + 4.8, COFFEE + 5.3, t); attach(latte, P); latte.visible = true; } else { P.arms[1].rotation.set(-1.3, 0, -0.1); P.elbows[1].rotation.x = -0.4; CT.worker.outer.updateMatrixWorld(true); latte.visible = true; latte.position.copy(CT.worker.elbows[1].localToWorld(V3(0, -0.3, 0.06))); }
    P.face(t < COFFEE + 3.4 ? 'happy' : t < COFFEE + 5 ? 'proud' : 'love', t); CT.worker.arms[1].rotation.set(got ? -0.3 : -1.5, 0, -0.1); CT.worker.elbows[1].rotation.x = -0.2; }
  else if (k === 'lost') { const pos = flyPath(COFFEE).add(V3(0, 40, 0)); place(P, 0, 0, 0, 0); P.outer.position.copy(pos).add(V3(0, 0.95 + 0.08 * Math.sin(t * 2), 0)); P.outer.rotation.y = 0.8 * Math.sin((t - LOST) * 0.9);
    P.arms[1].rotation.set(-1.2, 0, -0.2); P.elbows[1].rotation.x = -1.4; attach(phone, P); phone.visible = true; phone.lookAt(headOf(P)); phone.userData.scr.material.color.set(t < LOST + 2.2 ? '#3a7ad8' : '#050505'); P.face(t < LOST + 2.2 ? 'worried' : 'sad', t); }
  else if (k === 'yard') { const s0 = POOL + 1.9, u = clamp((t - POOL) / 1.9, 0, 1); place(P, 0, 0, 0, 0);
    if (t < s0) { P.outer.position.set(lerp(-6, 0, u), lerp(14, 0.4, u * u) + 0.95, lerp(-4, 0, u)); P.outer.rotation.set(-0.4 + 2.0 * u, 0.6, 0); P.arms.forEach((a, i) => a.rotation.set(-2.6, 0, i ? -0.7 : 0.7)); P.face('surprised', t); }
    else { const b = clamp((t - s0 - 0.6) / 0.8, 0, 1); P.outer.position.set(0.3, -0.25 + 0.55 * b, 0.2); P.outer.rotation.set(0, 0.3, 0); P.face(t < s0 + 1.6 ? 'dumb' : 'smirk', t); P.arms[1].rotation.set(-2.6, 0, -0.2); P.elbows[1].rotation.x = -0.3; attach(latte, P); latte.visible = t > s0 + 1.4; } }
  else if (k === 'roof') { const base = CT.roof.position.clone().add(V3(4, 161, 14)), fade = smooth(ROOF + 2.5, ROOF + 4.0, t), drop = smooth(ROOF + 4.0, ROOF + 4.25, t); place(P, 0, 0, 0, 0);
    P.outer.position.copy(base).add(V3(0, 0.95 + 0.6 * (1 - fade) * (1 - drop) + 0.15 * Math.sin(t * 3) * (1 - fade), 0)); P.outer.rotation.y = 0.4;
    P.face(t < ROOF + 2.5 ? 'happy' : t < ROOF + 4.2 ? 'worried' : t < ROOF + 6 ? 'surprised' : 'proud', t); if (t > ROOF + 4.2 && t < ROOF + 5) { P.knees.forEach(k2 => k2.rotation.x = 0.8); P.legs.forEach(l => l.rotation.x = -0.6); P.outer.position.y -= 0.25; } } }
const SETS = { bed: BED, city: CITY, office: CITY, lost: CITY, yard: YARD, roof: CITY };
const UPD = { bed: updateBed, city: updateCity, office: updateCity, lost: updateCity, yard: updateYard, roof: updateCity };
const hd = () => headOf(hero);
const chase = (back, up, side, look = 0.0) => t => { const p = fpos(t), d = fdir(t), s = V3(d.z, 0, -d.x); return { pos: p.clone().addScaledVector(d, -back).add(V3(0, up, 0)).addScaledVector(s, side), look: p.clone().addScaledVector(d, look), fov: 50 }; };
// first person (her ask): the camera sits just in front of your face, looking where you look; your outstretched arm/hand is in frame
const povFly = (pitch = -0.35) => t => { const h = hd(), d = fdir(t), look = h.clone().addScaledVector(d, 10).add(V3(0, 10 * Math.tan(pitch), 0)); return { pos: h.clone().addScaledVector(d, 0.22).add(V3(0, 0.12, 0)), look, fov: 62 }; };
const SHOTS = [   // [start, set, camera(t), opts]
  [0, 'bed', t => lerpF(LOOK(1.6, 0.7, 1.4, -0.6, 1.6, -1.4), LOOK(0.6, 1.3, 0.2, -0.6, 2.2, -1.3), esin(span(t, 0, 1.6))), { dof: hd }],   // you float up out of bed… into the fan
  [1.6, 'bed', t => fr(hd(), V3(0.6, -0.1, 1), lerp(0.9, 0.75, span(t, 1.6, OUT)), 0.6), { dof: hd, whip: 1 }],   // BONK: dizzy stars
  [OUT, 'city', t => chase(4.5, 1.2, 1.4, 6)(t), { mb: true, whip: 1 }],   // out over Manhattan
  [OUT + 1.4, 'city', t => povFly(-0.45)(t), { mb: true }],   // POV: Manhattan below, your arm out front
  [OUT + 2.8, 'city', t => orbit(fpos(t), V3(1, 0.25, 0.2), -0.6, 0.5, 9, 7, 0.55, span(t, OUT + 2.8, PIGEON)), { dof: () => fpos(t0g) }],   // golden hour orbit
  [PIGEON, 'city', t => povFly(-0.1)(t), { mb: true }],   // POV: pigeons straight at your face
  [PIGEON + 1.5, 'city', t => chase(2.6, 0.5, 1.6, 1)(t), { dof: hd }],   // pigeons attack
  [PIGEON + 3.0, 'city', t => orbit(hd(), V3(-1, 0.1, 0.4), -0.3, 0.3, 2.0, 1.6, 0.55, span(t, PIGEON + 3, BUGS)), { dof: hd, whip: -1 }],
  [BUGS, 'city', t => { const h = hd(), d = fdir(t); return { pos: h.clone().addScaledVector(d, 0.42).add(V3(0, -0.62, 0)), look: h.clone().add(V3(0, -0.05, 0)), fov: 42 }; }, { dof: hd }],   // face first: bugs in the teeth
  [COLD, 'city', t => { const h = hd(), d = fdir(t), a = lerp(-0.4, 0.4, span(t, COLD, JET)); const s2 = V3(d.z, 0, -d.x); return { pos: h.clone().addScaledVector(d, 0.6 * Math.cos(a)).addScaledVector(s2, 0.6 * Math.sin(a)).add(V3(0, -0.7, 0)), look: h, fov: 42 }; }, { dof: hd, whip: 1 }],   // frost on your brows
  [JET, 'city', t => { const p = fpos(t); return { pos: p.clone().add(V3(14, 3, 26)), look: p.clone().add(V3(-6, 1, 0)), fov: 52 }; }, { mb: true }],   // a jet roars past behind you
  [COFFEE, 'office', t => { const h = hd(); return { pos: h.clone().add(V3(0, 0.08, -0.18)), look: CT.office.position.clone().add(V3(0.4, 103.75, 20.9)), fov: 58 }; }, { whip: -1 }],   // POV: you at the window, your hand reaching for the latte
  [COFFEE + 2.2, 'office', t => { const r = CT.office.position.clone().add(V3(0.8, 103.9, 18.6)); return { pos: r, look: CT.office.position.clone().add(V3(0, 103.6, 22)), fov: 48 }; }, { dof: hd }],   // reverse: from inside the office   // from inside the office: a latte, please
  [COFFEE + 3.6, 'office', t => fr(hd(), V3(0.5, 0.05, -1), lerp(1.4, 1.2, span(t, COFFEE + 3.6, LOST)), 0.6), { dof: hd }],
  [LOST, 'lost', t => orbit(hd(), V3(0.4, 0.15, 1), -0.4, 0.4, 2.4, 1.8, 0.58, span(t, LOST, POOL)), { dof: hd, whip: 1 }],   // the phone dies
  [POOL, 'yard', t => { const h = hd(); return { pos: h.clone().add(V3(0.15, -0.15, 0.1)), look: V3(0, 0, 0), fov: 64 }; }, { mb: true }],   // POV: the pool rushing up at you
  [POOL + 1.3, 'yard', t => lerpF(LOOK(7, 3, 8, -1, 2, -1), LOOK(5, 1.6, 6, 0, 0.6, 0), esin(span(t, POOL + 1.3, POOL + 2.2))), { mb: true }],   // incoming… SPLASH
  [POOL + 3.0, 'yard', t => fr(hd(), V3(0.5, 0.1, 1), lerp(1.8, 1.5, span(t, POOL + 3, ROOF)), 0.6), { dof: hd }],
  [ROOF, 'roof', t => orbit(hd(), V3(0.7, 0.12, 1), -0.25, 0.3, 3.2, 2.4, 0.56, span(t, ROOF, ENDC)), { dof: hd, whip: -1 }]];   // sunset on the roof: the power fades
let t0g = 0;
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { t0g = t; const [, k, cf] = SHOTS[i], S = SETS[k]; puffsReset(); S.sc.add(hero.outer); hero.outer.visible = true; for (const o of [latte, phone]) if (o.parent !== S.sc) S.sc.add(o);
  UPD[k](t, S.cam); pose(t, k); birds(t, k);
  if (k === 'city' || k === 'office' || k === 'lost' || k === 'roof') CT.plane.visible = k === 'city' && t >= JET && t < COFFEE;
  if (CT.plane.visible) { const u = (t - JET - 1.2) / 4.0, p = fpos(t); CT.plane.position.set(p.x + 90 - 180 * u, p.y + 6, p.z - 18); CT.plane.rotation.set(0, 0.1, 0.05); }
  const F = cf(t); applyF(S.cam, F); if (k !== 'bed' && k !== 'yard') updateCity(t, S.cam);
  if (k === 'cold') {}
  if (S === CITY && !(k === 'roof' || k === 'office')) { shootTo(rt, S.sc, S.cam); return; }
  shootTo(RTS, S.sc, S.cam); const spr = []; S.sc.traverse(o => { if (o.isSprite && o.visible) { spr.push(o); o.visible = false; } }); aoFor(k).render(renderer, rt, RTS); spr.forEach(o => { o.visible = true; }); }
function birds(t, k) { const on = k === 'city' && t >= PIGEON - 0.5 && t < BUGS; CT.birds.forEach((b, i) => { b.visible = on; if (!on) return; const h = fpos(t), a = t * (1.6 + 0.3 * hash(i)) + i * 0.7, r = 1.0 + 1.6 * hash(i * 3);
    b.position.copy(h).add(V3(Math.cos(a) * r, 0.4 * Math.sin(t * 2 + i) + 0.3, Math.sin(a) * r)); b.lookAt(h); const f = Math.sin(t * 22 + i); b.userData.w[0].rotation.z = 0.7 * f; b.userData.w[1].rotation.z = -0.7 * f; }); }
// ---- DOM ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS', 'flash'].map(k => [k, $(k)]));
const CAPS = [[OUT + 0.2, OUT + 2.8, 'You wake up. You can fly.'], [OUT + 2.8, PIGEON - 0.1, 'For one day.'],
  [PIGEON + 0.2, PIGEON + 3.0, 'Problem #1: pigeons think you’re competition.'], [PIGEON + 3.0, BUGS - 0.1, 'They do not share the sky.'],
  [BUGS + 0.2, COLD - 0.1, 'At 40 mph, every bug ends up in your teeth.'],
  [COLD + 0.2, COLD + 2.8, 'Every 1,000 ft up: about <b>3.5°F</b> colder.'], [COLD + 2.8, JET - 0.1, 'Your eyebrows freeze first.'],
  [JET + 0.2, JET + 3.4, 'Drones must stay under <b>400 ft</b>. You’re not a drone.'], [JET + 3.4, COFFEE - 0.1, 'US planes hit wildlife ~<b>19,600</b> times a year. Don’t be #19,601.'],
  [COFFEE + 0.2, COFFEE + 3.6, 'Floor 30: “One oat latte, please.”'], [COFFEE + 3.6, LOST - 0.1, 'HR has questions.'],
  [LOST + 0.2, LOST + 2.4, 'Your phone dies at 4%.'], [LOST + 2.4, POOL - 0.1, 'No map. Every roof looks the same.'],
  [POOL + 0.2, POOL + 3.0, 'So you land… in the neighbors’ pool.'], [POOL + 3.0, ROOF - 0.1, 'The latte survived.'],
  [ROOF + 0.2, ROOF + 2.5, 'Sunset. The power is fading…'], [ROOF + 2.5, ROOF + 5.5, '…while you’re 1 foot above the roof.'], [ROOF + 5.5, ENDC - 0.1, 'Tomorrow: the stairs. All 40 floors.']];
function hudAt(t) { if (t >= COLD && t < JET) { const ft = lerp(1100, 1800, smooth(COLD, JET, t)); return ['ALTITUDE · TEMP', fmt(ft) + ' FT', 'AIR: ' + Math.round(48 - ft / 1000 * 3.5) + '°F · STREET: 48°F']; }
  if (t >= JET && t < COFFEE) return ['ALTITUDE', '1,800 FT', 'DRONE LIMIT: 400 FT']; if (t >= LOST && t < POOL) return ['BATTERY', t < LOST + 2.2 ? '4%' : '0%', ''];
  if (t >= OUT && t < COLD) return ['FLIGHT TIME', '0:' + String(Math.floor((t - OUT) * 2.5)).padStart(2, '0'), 'DAY 1 OF 1']; return null; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0.1, OUT, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.flash.style.opacity = 0.7 * Math.exp(-Math.pow((t - 1.56) / 0.06, 2)) + 0.4 * Math.exp(-Math.pow((t - POOL - 1.9) / 0.08, 2));
  el.labels.innerHTML = t > 1.5 && t < 2.6 ? `<div class="lb" style="left:540px;top:760px;font-size:120px;letter-spacing:.05em;color:#ffd040;opacity:${(1 - smooth(2.2, 2.6, t)).toFixed(2)};transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 0.3 * Math.exp(-(t - 1.55) * 8)).toFixed(2)})">BONK!</div>` : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.7, ENDC + 1.0, t); }
// ---- optics: sub-frame motion blur (accumulate K renders across a 180° shutter), depth of field from the AO depth buffer, whip-pan smear ----
const RTACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }), RTDOF = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsq = (mat) => { const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return sc; };
const accMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, uniforms: { tSrc: { value: null }, uW: { value: 0.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0); }' });
const dofMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, tDepth: { value: null }, uNear: { value: 0.08 }, uFar: { value: 3000 }, uFocus: { value: 2 }, uAmt: { value: 26 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tSrc, tDepth; uniform float uNear, uFar, uFocus, uAmt; varying vec2 vUv;
    float dist(vec2 uv){ float d=texture2D(tDepth,uv).x; return uNear*uFar/(uFar-d*(uFar-uNear)); }
    float coc(vec2 uv){ float z=dist(uv); return clamp(abs(z-uFocus)/max(z,0.001)*uAmt,0.0,16.0); }
    void main(){ float c0=coc(vUv); vec3 acc=texture2D(tSrc,vUv).rgb; float w=1.0; vec2 px=vec2(1.0/1080.0,1.0/1920.0);
      for(int i=0;i<24;i++){ float a=float(i)*2.39996; float r=sqrt((float(i)+0.5)/24.0); vec2 o=vec2(cos(a),sin(a))*r*c0*px; float cs=coc(vUv+o);
        float k=smoothstep(r*c0-1.5,r*c0+0.5,cs+0.5*c0); acc+=texture2D(tSrc,vUv+o).rgb*k; w+=k; }
      gl_FragColor=vec4(acc/w,1.0); }` });
const accSc = fsq(accMat), dofSc = fsq(dofMat), MB_K = 4, SHUTTER = 0.5 / 30;
function shotOpts(i) { return SHOTS[i][3] || {}; }
function whipAt(t) { let w = 0; for (const [c, , , o] of SHOTS) if (o && o.whip) { const k = Math.max(0, 1 - Math.abs(t - c) / 0.14); w += o.whip * 0.11 * k * k; } return w; }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  const o = shotOpts(i); let src = RTA;
  if (o.mb) {   // motion blur: average MB_K renders spread over the shutter (stay inside this shot)
    renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA);   // leave the scene posed at t (DOM labels project from it)
  } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && AO[SHOTS[i][1]] && !o.mb) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = AO[SHOTS[i][1]].depthTexture; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  compMat.uniforms.tA.value = src.texture; compMat.uniforms.uWhip.value = whipAt(t); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
