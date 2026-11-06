import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "What if YOU became President for one day?" (Nov 6 2026, US series look; head = copy of parts_mind/m_head.js, the HERO.md pipeline). Our hero; no real people.
// Facts: 132 rooms / 35 bathrooms / bowling alley (White House), $400,000 salary ($1,096 a day), the nuclear football carried by a military aide, no driving since LBJ (Secret Service),
// "The Beast" doors 8 in thick (Guinness), Air Force One ~$177,843 per flight hour (FY2021), 65,000 letters a week + 100,000 emails a day (Obama-era count), the family pays for its own food.
// =================== timeline (s) ===================
const WAKE = 0.0, WHX = 3.0, AIDE = 8.0, KEYS = 13.0, BEAST = 19.0, AF1 = 25.0, PAY = 31.0, MAIL = 37.0, DINE = 43.0, BOWL = 49.0, SNEAK = 55.0, ENDC = 60.0, T_END = 64.0;
const HOMES = 999, PRES = 999;   // (constants read by the reused gone-video sets; not used here)
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uSepia: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 }, uTilt: { value: 0 }, uWhip: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook, uWhip, uTilt, uSepia;
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
      c=mix(c, vec3(dot(c,vec3(0.3,0.59,0.11)))*vec3(1.08,0.93,0.72), uSepia);   // 1862 flashback
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
// =================== SETS for "What if YOU became President for one day?" ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
const PMREM = new THREE.PMREMGenerator(renderer);
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const skyM = new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false }); sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), skyM));
  { const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyM)); es.add(new THREE.Mesh(new THREE.CircleGeometry(100, 32).rotateX(-Math.PI / 2).translate(0, -2, 0), new THREE.MeshBasicMaterial({ color: '#6a7a5a' }))); sc.environment = PMREM.fromScene(es, 0.02, 1, 400).texture; sc.environmentIntensity = 0.55; }
  sc.fog = new THREE.Fog(fog, near, far); const hm = new THREE.HemisphereLight(...hemi); sc.add(hm);
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 120 }); sc.add(s, s.target); sc.userData.sun = s; sc.userData.hemi = hm;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D();
const WHITE = M('#f4f2ec', { roughness: 0.6 }), CREAM = M('#ece4d2', { roughness: 0.8 }), GOLD = M('#c8a050', { roughness: 0.35, metalness: 0.7 }), NAVY = M('#1e2d52', { roughness: 0.8 }), REDC = M('#8e1e22', { roughness: 0.9 }), WOOD = M('#6a4228', { roughness: 0.55 }), DARK = M('#15171b', { roughness: 0.5 });
const flagTex = canvasTex(380, 200, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4f4f0' : '#b22234'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.4, h * 7 / 13);
  g.fillStyle = '#fff'; for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) { g.beginPath(); g.arc(8 + c * 25 + (r % 2 ? 12 : 0), 7 + r * 11.5, 3, 0, 7); g.fill(); } });
function flag(par, x, y, z, s = 1) { const g = new THREE.PlaneGeometry(1.9 * s, 1.0 * s, 16, 6); g.translate(0.95 * s, 0, 0); const f = mesh(g, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }), true, false); f.position.set(x, y, z); par.add(f); f.userData.p0 = g.attributes.position.array.slice(); FLAGS.push(f); return f; }
const FLAGS = []; function waveFlags(t) { for (const f of FLAGS) { const a = f.geometry.attributes.position, p0 = f.userData.p0; for (let i = 0; i < a.count; i++) { const x = p0[i * 3]; a.array[i * 3 + 2] = 0.12 * Math.sin(x * 3.2 - t * 5) * x; } a.needsUpdate = true; f.geometry.computeVertexNormals(); } }
// ---- people: Secret Service agents (black suits, white shirt + black tie print, earpiece, sunglasses), a military aide with the briefcase, a butler ----
const shirtTex = (tie) => canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f4f4f2'; g.beginPath(); g.moveTo(w * 0.36, 0); g.lineTo(w * 0.64, 0); g.lineTo(w * 0.5, h * 0.92); g.fill(); if (tie) { g.fillStyle = tie; g.beginPath(); g.moveTo(w * 0.47, h * 0.08); g.lineTo(w * 0.53, h * 0.08); g.lineTo(w * 0.555, h * 0.7); g.lineTo(w * 0.5, h * 0.8); g.lineTo(w * 0.445, h * 0.7); g.fill(); } });
function suitPrint(P, tie) { const m = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 24, 1, true, -0.24, 0.48), new THREE.MeshStandardMaterial({ map: shirtTex(tie), transparent: true, roughness: 0.8 }), false, false); m.position.set(0, 1.27, 0.152 - 0.36); P.torso.add(m); return m; }
function shades(P) { const g = new THREE.Group(); const lm = M('#07080a', { roughness: 0.1, metalness: 0.6 }); for (const x of [-0.045, 0.045]) { const l = mesh(new RoundedBoxGeometry(0.07, 0.035, 0.012, 2, 0.008), lm, false, false); l.position.set(x, 0, 0); g.add(l); }
  const br = mesh(new THREE.BoxGeometry(0.03, 0.006, 0.008), lm, false, false); g.add(br); g.position.set(0, SHADE_Y, SHADE_Z); P.head.add(g); return g; }
let SHADE_Y = 0.035, SHADE_Z = 0.118;
const SKINS = ['#e9b98f', '#c89068', '#8a5a3a', '#f0c8a8', '#a8704a'];
function agent(i) { const A = makeBlock({ head: 'human', body: 'human', skin: SKINS[i % SKINS.length], hair: ['#1a1410', '#3a2a1e', '#0c0c0c', '#5a4a3a'][i % 4], top: '#16181c', jeans: false, bottom: '#16181c', shoe: '#0a0a0b', hairStyle: i % 3 === 2 ? 'bald' : 'short', headS: 0.88, h: 1.04 + 0.03 * (i % 2) });
  suitPrint(A, '#0a0a0c'); A.shades = shades(A); const ear = mesh(new THREE.TorusGeometry(0.012, 0.003, 4, 10, Math.PI * 1.5), M('#d8d8d8'), false, false); ear.position.set(0.105, 0.0, 0.0); ear.rotation.y = Math.PI / 2; A.head.add(ear); return A; }
const AGENTS = [0, 1, 2, 3, 4, 5].map(agent);
const aide = makeBlock({ head: 'human', body: 'human', skin: '#c89068', hair: '#141210', top: '#1e2a44', jeans: false, bottom: '#1e2a44', shoe: '#0a0a0b', hairStyle: 'short', headS: 0.88, h: 1.03 }); suitPrint(aide, '#0e1528');
const football = new THREE.Group(); { const b = mesh(new RoundedBoxGeometry(0.42, 0.32, 0.14, 3, 0.03), M('#121214', { roughness: 0.45 })); b.position.y = -0.2; football.add(b); const hd = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), M('#121214')); hd.position.y = -0.03; football.add(hd);
  for (const x of [-0.13, 0.13]) bx(0.04, 0.03, 0.02, GOLD, x, -0.06, 0.075, football); }
aide.elbows[1].add(football); football.position.set(0, -0.3, 0.02);
const butler = makeBlock({ head: 'human', body: 'human', skin: '#8a5a3a', hair: '#cfcfcf', top: '#f2f0ea', jeans: false, bottom: '#16181c', shoe: '#0a0a0b', hairStyle: 'short', headS: 0.88, mustache: '#cfcfcf' }); suitPrint(butler, '#16181c');
// ======================= 1) THE WHITE HOUSE INSIDE: bedroom (x 0), Cross Hall (x 40), dining room (x 80), mail room (x 120), bowling alley (x 160) =======================
const IN = mkSet({ top: '#d8e4f0', bot: '#f4ecd8', fog: 0xf0e8d8, near: 60, far: 400, hemi: [0xfff4e4, 0x8a7a60, 0.55], sun: [0xffe8c8, 2.6, V3(8, 9, 6)], shadow: 10 });
const RL = {};   // room lights
function room(x0, w, d, h, wallC, floorM, par) { const g = grp(x0, 0, 0, 0, par); const wm = M(wallC, { roughness: 0.85 }); bx(w, 0.1, d, floorM, 0, -0.05, 0, g); bx(w, 0.1, d, M('#f6f3ec'), 0, h + 0.05, 0, g);
  bx(0.1, h, d, wm, -w / 2, h / 2, 0, g); bx(0.1, h, d, wm, w / 2, h / 2, 0, g); bx(w, h, 0.1, wm, 0, h / 2, -d / 2, g); bx(w, h, 0.1, wm, 0, h / 2, d / 2, g);
  for (const sx of [-1, 1]) bx(0.06, 0.12, d, WHITE, sx * (w / 2 - 0.05), h - 0.06, 0, g); for (const sz of [-1, 1]) bx(w, 0.12, 0.06, WHITE, 0, h - 0.06, sz * (d / 2 - 0.05), g);
  for (const sx of [-1, 1]) bx(0.05, 0.9, d, M(wallC === '#ece4d2' ? '#f2ede2' : '#f0ece4'), sx * (w / 2 - 0.06), 0.45, 0, g); return g; }
const parquet = (() => { const t = canvasTex(512, 512, (g, w, h) => { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { g.fillStyle = `hsl(28,${35 + 10 * hash(r * 9 + c)}%,${30 + 10 * hash(r * 3 + c * 7)}%)`; g.save(); g.translate(c * 64, r * 64); if ((r + c) % 2) { for (let k = 0; k < 4; k++) g.fillRect(0, k * 16, 64, 15); } else { for (let k = 0; k < 4; k++) g.fillRect(k * 16, 0, 15, 64); } g.restore(); } }, [3, 3]); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }); })();
const carpetR = new THREE.MeshStandardMaterial({ color: '#9a1e24', roughness: 0.95 });
// -- bedroom: four-poster bed, tall window with navy-gold drapes, morning sun beam, portraits, rug, nightstands --
const BR = room(0, 6, 6.5, 3.6, '#ece4d2', parquet, IN.sc);
{ bx(3.6, 0.02, 2.8, M('#2a3a6a', { roughness: 1 }), 0, 0.01, 0.4, BR);
  const bed = grp(-0.9, 0, -1.2, 0, BR); bx(1.9, 0.45, 2.2, WOOD, 0, 0.3, 0, bed); bx(1.85, 0.25, 2.1, M('#f6f4ee'), 0, 0.62, 0, bed); bx(1.95, 0.12, 1.5, NAVY, 0, 0.8, 0.3, bed); bx(1.9, 1.4, 0.12, WOOD, 0, 1.1, -1.08, bed);
  for (const x of [-0.6, 0.6]) bx(0.7, 0.18, 0.4, M('#fbfaf6'), x, 0.82, -0.75, bed); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 10), WOOD); p.position.set(sx * 0.92, 1.2, sz * 1.05); bed.add(p); }
  bx(1.95, 0.25, 2.25, REDC, 0, 2.4, 0, bed);
  for (const sx of [-1, 1]) { const ns = grp(-0.9 + sx * 1.35, 0, -1.9, 0, BR); bx(0.5, 0.6, 0.45, WOOD, 0, 0.3, 0, ns); const lb = mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 12), GOLD); lb.position.y = 0.78; ns.add(lb); const sh = mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.25, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#f4ead0', emissive: '#ffd8a0', emissiveIntensity: 0.6, side: THREE.DoubleSide })); sh.position.y = 1.05; ns.add(sh); }
  // the tall window on the right wall + drapes + light beam
  const wx = 2.95; bx(0.06, 2.6, 1.5, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 2.1) }), wx, 1.75, 0.6, BR); for (let k = 0; k < 3; k++) bx(0.08, 0.05, 1.5, WHITE, wx - 0.02, 0.9 + k * 0.85, 0.6, BR); bx(0.08, 2.6, 0.05, WHITE, wx - 0.02, 1.75, 0.6, BR);
  for (const sz of [-1, 1]) bx(0.12, 3.1, 0.5, NAVY, wx - 0.1, 1.75, 0.6 + sz * 0.95, BR); bx(0.2, 0.35, 2.6, GOLD, wx - 0.12, 3.3, 0.6, BR);
  const beam = mesh(new THREE.CylinderGeometry(0.75, 1.3, 5.5, 4, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2d8', transparent: true, opacity: 0.025, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), false, false); beam.rotation.set(0, 0, 1.0); beam.position.set(0.9, 1.3, 0.6); BR.add(beam);
  const pt = canvasTex(256, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7a9ac8'); gr.addColorStop(0.6, '#d8c8a0'); gr.addColorStop(1, '#4a6a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2a4a2a'; g.beginPath(); g.moveTo(0, h * 0.75); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.6 + 0.1 * Math.sin(x * 0.05))); g.lineTo(w, h); g.lineTo(0, h); g.fill(); });
  for (const [x, z, ry] of [[-2.95, -0.5, Math.PI / 2], [-2.95, 1.5, Math.PI / 2]]) { const f = grp(x, 1.9, z, ry, BR); bx(0.9, 1.1, 0.06, GOLD, 0, 0, 0, f); bx(0.78, 0.98, 0.02, new THREE.MeshStandardMaterial({ map: pt, roughness: 0.6 }), 0, 0, 0.035, f); }
  const ch = grp(0, 3.0, 0.3, 0, BR); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const c = mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.6) })); c.position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35); ch.add(c); } const ring = mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 24), GOLD); ring.rotation.x = Math.PI / 2; ch.add(ring);
  RL.bed = new THREE.PointLight(0xffd8a8, 6, 9, 1.4); RL.bed.position.set(0, 2.6, 0.3); BR.add(RL.bed); }
// -- the Cross Hall: red carpet, white columns, chandeliers, portraits; doors along it (the night sneak) --
const HL = room(40, 6, 30, 5, '#f2eee6', M('#d8d2c4', { roughness: 0.3 }), IN.sc);
{ bx(2.2, 0.02, 29, carpetR, 0, 0.012, 0, HL); for (const sx of [-1, 1]) bx(0.1, 0.022, 29, GOLD, sx * 1.1, 0.013, 0, HL);
  for (let k = 0; k < 7; k++) for (const sx of [-1, 1]) { const z = -12 + k * 4; const c = mesh(new THREE.CylinderGeometry(0.22, 0.25, 4.6, 16), WHITE); c.position.set(sx * 2.4, 2.3, z); HL.add(c); bx(0.6, 0.25, 0.6, WHITE, sx * 2.4, 4.75, z, HL); bx(0.6, 0.2, 0.6, WHITE, sx * 2.4, 0.1, z, HL);
    if (k < 6) { const d = grp(sx * 2.94, 0, z + 2, -sx * Math.PI / 2, HL); bx(1.3, 2.6, 0.08, WOOD, 0, 1.3, 0, d); bx(1.5, 0.2, 0.12, WHITE, 0, 2.7, 0, d); bx(0.05, 0.05, 0.08, GOLD, 0.5, 1.2, 0.06, d); } }
  RL.hall = []; for (let k = 0; k < 4; k++) { const ch = grp(0, 4.1, -10.5 + k * 7, 0, HL); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const c = mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.7) })); c.position.set(Math.cos(a) * 0.5, -0.2, Math.sin(a) * 0.5); ch.add(c); }
    const r1 = mesh(new THREE.TorusGeometry(0.5, 0.025, 6, 30), GOLD); r1.rotation.x = Math.PI / 2; r1.position.y = -0.2; ch.add(r1); const st = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), GOLD); st.position.y = 0.3; ch.add(st);
    const L = new THREE.PointLight(0xffd8a8, 14, 12, 1.4); L.position.set(0, -0.4, 0); ch.add(L); RL.hall.push(L); }
  RL.moon = new THREE.PointLight(0x7a9cff, 0, 30, 1.2); RL.moon.position.set(0, 4, 0); HL.add(RL.moon); }
// -- the State Dining Room: long table, white cloth, candelabras, the burger --
const DR = room(80, 7, 9, 4.2, '#f0ead8', parquet, IN.sc);
{ bx(1.4, 0.06, 5.5, M('#fbfaf6', { roughness: 0.9 }), 0, 0.78, 0, DR); bx(1.42, 0.3, 5.52, M('#fbfaf6', { roughness: 0.9 }), 0, 0.62, 0, DR);
  for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) { const c = grp(sx * 0.95, 0, -2.3 + k * 0.92, sx > 0 ? -Math.PI / 2 : Math.PI / 2, DR); bx(0.46, 0.08, 0.46, M('#c8a050', { roughness: 0.5 }), 0, 0.48, 0, c); bx(0.46, 0.7, 0.06, M('#c8a050'), 0, 0.85, -0.2, c); bx(0.36, 0.5, 0.04, REDC, 0, 0.88, -0.17, c); }
  for (const z of [-1.6, 1.6]) { const cd = grp(0, 0.81, z, 0, DR); const st = mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.45, 10), GOLD); st.position.y = 0.22; cd.add(st); for (let i = -1; i <= 1; i++) { const cn = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), M('#f8f4e8')); cn.position.set(i * 0.14, 0.52, 0); cd.add(cn); const fl = mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2) })); fl.scale.y = 1.8; fl.position.set(i * 0.14, 0.63, 0); cd.add(fl); } const L = new THREE.PointLight(0xffb070, 2.5, 4, 1.6); L.position.set(0, 0.7, 0); cd.add(L); }
  const fp = grp(0, 0, -4.4, 0, DR); bx(1.8, 1.3, 0.35, M('#e8e2d8', { roughness: 0.4 }), 0, 0.65, 0, fp); bx(1.1, 0.8, 0.36, DARK, 0, 0.45, 0.01, fp); const pt2 = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8a878'; g.beginPath(); g.ellipse(w / 2, h * 0.38, 50, 62, 0, 0, 7); g.fill(); g.fillStyle = '#1a1a22'; g.fillRect(w * 0.25, h * 0.58, w * 0.5, h * 0.42); });
  const fr2 = grp(0, 2.55, -4.35, 0, DR); bx(1.2, 1.5, 0.06, GOLD, 0, 0, 0, fr2); bx(1.05, 1.35, 0.02, new THREE.MeshStandardMaterial({ map: pt2, roughness: 0.7 }), 0, 0, 0.035, fr2);
  RL.dine = new THREE.PointLight(0xffd8a8, 9, 10, 1.4); RL.dine.position.set(0, 3.4, 0); DR.add(RL.dine);
  const chD = grp(0, 3.5, 0, 0, DR); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const c = mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.5, 1.7) })); c.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); chD.add(c); } const rD = mesh(new THREE.TorusGeometry(0.6, 0.03, 6, 30), GOLD); rD.rotation.x = Math.PI / 2; chD.add(rD); }
const BURGER = new THREE.Group(); { const plate = mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.02, 24), M('#fbfaf6', { roughness: 0.2 })); BURGER.add(plate); bx(0.07, 0.005, 0.07, GOLD, 0.12, 0.012, 0.0, BURGER);
  const bun = M('#c8823a', { roughness: 0.6 }); const b1 = mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.03, 18), bun); b1.position.y = 0.03; BURGER.add(b1); const pat = mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.025, 18), M('#4a2a18')); pat.position.y = 0.058; BURGER.add(pat);
  const ch = mesh(new THREE.BoxGeometry(0.15, 0.006, 0.15), M('#f2b420')); ch.position.y = 0.073; ch.rotation.y = 0.4; BURGER.add(ch); const le = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.008, 18), M('#5aa83a')); le.position.y = 0.08; BURGER.add(le);
  const top = mesh(new THREE.SphereGeometry(0.08, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), bun); top.scale.y = 0.65; top.position.y = 0.085; BURGER.add(top); BURGER.position.set(80 + 0.0, 0.82, 1.7); IN.sc.add(BURGER); }
const billTex = canvasTex(360, 480, (g, w, h) => { g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e2d52'; g.font = '700 30px Inter'; g.textAlign = 'center'; g.fillText('THE WHITE HOUSE', w / 2, 56); g.font = '600 22px Inter'; g.fillText('PERSONAL MEALS · MONTHLY', w / 2, 92);
  g.fillStyle = '#333'; g.font = '500 22px Inter'; g.textAlign = 'left'; const items = ['Cheeseburger', 'Fries', 'Soda', 'Breakfast ×1', 'Coffee ×4', 'Toothpaste']; items.forEach((s, i) => { g.fillText(s, 30, 150 + i * 40); g.fillText('$ ··.··', 250, 150 + i * 40); });
  g.fillStyle = '#b22234'; g.font = '800 34px Inter'; g.fillText('PLEASE PAY', 30, 430); });
const BILL = new THREE.Group(); { const tray = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 28), M('#d8dce0', { metalness: 1, roughness: 0.15 })); BILL.add(tray); const pp = mesh(new THREE.PlaneGeometry(0.16, 0.21), new THREE.MeshStandardMaterial({ map: billTex, roughness: 0.9 })); pp.rotation.x = -Math.PI / 2; pp.position.y = 0.012; BILL.add(pp); IN.sc.add(BILL); }
// -- the mail room: shelves of bins, a chute, an avalanche of envelopes (instanced) --
const MR = room(120, 6, 6, 3.4, '#e8e4dc', M('#8a8e94', { roughness: 0.6 }), IN.sc);
{ for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) { bx(0.5, 0.04, 5.6, M('#9aa0a8', { metalness: 0.6, roughness: 0.4 }), sx * 2.7, 0.4 + r * 0.7, 0, MR); for (let k = 0; k < 9; k++) { const bn = bx(0.42, 0.3, 0.5, M(pick(['#2a4f8a', '#c8a040', '#8a8e94'])), sx * 2.7, 0.57 + r * 0.7, -2.4 + k * 0.6, MR); } }
  bx(1.2, 1.0, 1.2, M('#9aa0a8', { metalness: 0.5 }), 0, 3.0, -1.5, MR); RL.mail = new THREE.PointLight(0xfff0d8, 8, 9, 1.4); RL.mail.position.set(0, 3.0, 0.5); MR.add(RL.mail); }
const ENV_N = 2600, envIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.004, 0.11), new THREE.MeshStandardMaterial({ color: '#f6f2e6', roughness: 0.85 }), ENV_N); envIM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ENV_N * 3), 3);
for (let i = 0; i < ENV_N; i++) { const c = new THREE.Color(pick(['#f6f2e6', '#f0e6cc', '#e8eef6', '#fbf8f0', '#f2d8c8'])); envIM.setColorAt(i, c); } envIM.castShadow = true; envIM.frustumCulled = false; IN.sc.add(envIM);
const heapTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#d8d0bc'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const x = rnd() * w, y = rnd() * h, a = rnd() * 3; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = pick(['#f6f2e6', '#f0e6cc', '#e8eef6', '#fbf8f0', '#f2d8c8']); g.fillRect(-14, -7, 28, 14); g.strokeStyle = 'rgba(0,0,0,.18)'; g.strokeRect(-14, -7, 28, 14); g.beginPath(); g.moveTo(-14, -7); g.lineTo(0, 1); g.lineTo(14, -7); g.stroke(); g.restore(); } }, [4, 1]);
const HEAP = mesh(new THREE.ConeGeometry(1.6, 1, 40, 4, false), new THREE.MeshStandardMaterial({ map: heapTex, roughness: 0.9 }), true, true); HEAP.position.set(120, 0, -0.6); IN.sc.add(HEAP);
function mailAt(t, t0) { const u = Math.max(0, t - t0), hh = Math.min(1.25, 0.22 * u); HEAP.scale.set(1, Math.max(0.01, hh), 1); HEAP.position.y = Math.max(0.01, hh) / 2; HEAP.visible = u > 0;
  for (let i = 0; i < ENV_N; i++) { const st = hash(i * 1.3) * 5.5, a = u - st; let x, y, z, rx, ry, rz;
    if (a < 0) { y = -10; x = z = rx = ry = rz = 0; } else { const fall = Math.min(a, 0.9); x = 120 + (hash(i * 2.1) - 0.5) * 1.0 + (hash(i * 4.7) - 0.5) * 1.6 * fall; z = -1.5 + (hash(i * 3.3) - 0.5) * 1.0 + (hash(i * 5.9) - 0.2) * 1.8 * fall;
      y = 2.6 - 3.0 * fall * fall; const ground = a > 0.9; if (ground) { const r = Math.hypot(x - 120, z + 0.6), surf = Math.max(0, hh * (1 - r / 1.6)); y = surf + 0.01 + 0.02 * hash(i); } else y = Math.max(y, 0);
      rx = a * 6 * hash(i * 7) * (ground ? 0 : 1); ry = hash(i * 8) * 6; rz = a * 5 * hash(i * 9) * (ground ? 0 : 1); }
    _o.position.set(x, y, z); _o.rotation.set(rx, ry, rz); _o.scale.setScalar(1); _o.updateMatrix(); envIM.setMatrixAt(i, _o.matrix); } envIM.instanceMatrix.needsUpdate = true; }
// -- the bowling alley: one lane, wooden boards, gutters, pins, a ball, presidential-blue walls --
const BW = room(160, 5, 24, 3.2, '#2a3a6a', M('#3a3a40'), IN.sc);
const laneTex = canvasTex(256, 1024, (g, w, h) => { for (let k = 0; k < 20; k++) { g.fillStyle = `hsl(32,${45 + 8 * hash(k)}%,${58 + 8 * hash(k * 3)}%)`; g.fillRect(k * w / 20, 0, w / 20 - 1, h); } g.fillStyle = 'rgba(60,30,10,.6)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(w * (0.2 + i * 0.1) - 6, 300); g.lineTo(w * (0.2 + i * 0.1), 280); g.lineTo(w * (0.2 + i * 0.1) + 6, 300); g.fill(); } });
{ bx(1.05, 0.06, 19, new THREE.MeshStandardMaterial({ map: laneTex, roughness: 0.15, metalness: 0.05 }), 0, 0.03, -1.5, BW); for (const sx of [-1, 1]) { bx(0.24, 0.02, 19, M('#202226', { metalness: 0.5 }), sx * 0.65, 0.0, -1.5, BW); bx(0.6, 0.5, 19, M('#5a3a24'), sx * 1.2, 0.25, -1.5, BW); }
  bx(5, 1.2, 0.3, DARK, 0, 2.2, -10.8, BW); for (let k = 0; k < 6; k++) bx(4, 0.06, 0.4, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.9) }), 0, 3.15, 8 - k * 3.4, BW);
  RL.bowl = [new THREE.PointLight(0xfff0d8, 9, 12, 1.4), new THREE.PointLight(0xfff0d8, 7, 10, 1.4)]; RL.bowl[0].position.set(0, 2.8, 6); RL.bowl[1].position.set(0, 2.8, -8); BW.add(...RL.bowl);
  const seal = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2a3a6a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8a050'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, 100, 0, 7); g.stroke(); g.fillStyle = '#c8a050'; g.font = '800 120px Inter'; g.textAlign = 'center'; g.fillText('★', w / 2, h / 2 + 42); });
  bx(1.2, 1.2, 0.02, new THREE.MeshStandardMaterial({ map: seal, roughness: 0.5 }), 0, 2.2, -10.64, BW); }
const PIN_G = new THREE.LatheGeometry([[0, 0], [0.026, 0], [0.05, 0.08], [0.06, 0.14], [0.04, 0.25], [0.022, 0.29], [0.03, 0.34], [0.03, 0.37], [0, 0.39]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
const PINS = []; { const pm = M('#f8f6f0', { roughness: 0.25 }); let k = 0; for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) { const p = mesh(PIN_G, pm); const x = (c - r / 2) * 0.3, z = -9.6 - r * 0.26; p.position.set(160 + x, 0.06, z); p.userData.p0 = p.position.clone(); IN.sc.add(p); PINS.push(p);
  const st = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12, 1, true), M('#c8322a')); st.position.y = 0.27; p.add(st); k++; } }
const BALL = mesh(new THREE.SphereGeometry(0.11, 24, 16), M('#1e3a8a', { roughness: 0.1, metalness: 0.2 })); IN.sc.add(BALL);
function bowlAt(t, t0, tHit) { const u = t - t0; const zb = u < 1.2 ? 7.5 : 7.5 - (u - 1.2) * 7.2; BALL.position.set(160 + 0.06 * Math.sin(u * 0.8), 0.17, Math.max(-10.6, zb)); BALL.rotation.x = -(Math.max(0, u - 1.2)) * 60;
  if (u < 1.2) BALL.visible = false; else BALL.visible = true;
  PINS.forEach((p, i) => { const a = t - tHit - 0.04 * i; if (a <= 0) { p.position.copy(p.userData.p0); p.rotation.set(0, 0, 0); return; } const dir = V3(hash(i * 3) - 0.5, 0, -0.6 - hash(i * 5)).normalize(), sp = 2.5 + 2 * hash(i * 7);
    const k = Math.min(a, 1.4); p.position.set(p.userData.p0.x + dir.x * sp * k * (1 - k / 3), Math.max(0.03, 0.06 + 1.6 * k - 3.6 * k * k), p.userData.p0.z + dir.z * sp * k * 0.6); p.rotation.set(-(2 + 6 * hash(i)) * k, hash(i * 2) * 3 * k, (hash(i * 9) - 0.5) * 8 * k); }); }
// ======================= 2) THE WHITE HOUSE OUTSIDE: north facade + portico, lawn, fountain, driveway, fence, trees; a red convertible; THE BEAST =======================
const EX = mkSet({ top: '#5a8ad0', bot: '#f4dcc0', fog: 0xe8dcc8, near: 80, far: 700, hemi: [0xfff0e0, 0x5a6a40, 0.9], sun: [0xffe0b8, 2.8, V3(-30, 26, 40)], shadow: 40 });
const lawnTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4e8a32'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'; g.fillRect(i * w / 9, 0, w / 9, h); } speckle(g, w, h, 30000, ['rgba(20,50,10,.25)', 'rgba(140,190,90,.2)'], 2); }, [12, 12]);
gplane(EX.sc, 900, 900, new THREE.MeshStandardMaterial({ map: lawnTex, roughness: 0.95 }), 0, 0);
const WHG = grp(0, 0, -40, 0, EX.sc);
{ const wallW = M('#f6f4ee', { roughness: 0.55 }); bx(52, 16, 26, wallW, 0, 8, 0, WHG); bx(53, 0.7, 27, wallW, 0, 16.3, 0, WHG); bx(53, 0.5, 27, M('#e8e4dc'), 0, 0.25, 0, WHG);
  for (let k = 0; k < 52; k++) bx(0.25, 1.0, 0.25, wallW, -25.6 + k, 17.15, 13.3, WHG); bx(52.5, 0.2, 0.4, wallW, 0, 17.7, 13.3, WHG);
  const winM = new THREE.MeshStandardMaterial({ color: '#2a3442', roughness: 0.1, metalness: 0.3, emissive: '#ffcf90', emissiveIntensity: 0 }); EX.winM = winM;
  for (let fl = 0; fl < 2; fl++) for (let c = 0; c < 11; c++) { const x = -22.5 + c * 4.5; if (Math.abs(x) < 5) continue; const y = 4.2 + fl * 6.2; bx(1.5, 2.8, 0.2, winM, x, y, 13.05, WHG); bx(1.9, 0.25, 0.4, wallW, x, y + 1.65, 13.15, WHG); bx(1.8, 0.2, 0.3, wallW, x, y - 1.5, 13.1, WHG);
    if (fl === 0) { const pd = mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.35, 3, 1, false, 0, Math.PI * 2), wallW); pd.rotation.set(Math.PI / 2, 0, Math.PI / 2); pd.scale.set(1, 1, 0.35); pd.position.set(x, y + 2.15, 13.2); WHG.add(pd); } }
  // the north portico: 8 columns, entablature, pediment, lantern
  const por = grp(0, 0, 13, 0, WHG); bx(12, 0.8, 7, M('#e8e4dc'), 0, 0.4, 3.5, por);
  for (let k = 0; k < 4; k++) for (const zz of [6.4, 4.0]) { const c = mesh(new THREE.CylinderGeometry(0.42, 0.48, 12.5, 20), wallW); c.position.set(-4.5 + k * 3, 7.05, zz); por.add(c); bx(1.1, 0.5, 1.1, wallW, -4.5 + k * 3, 13.55, zz, por); }
  bx(12.6, 1.5, 7.2, wallW, 0, 14.5, 3.6, por); const ped = mesh(new THREE.CylinderGeometry(7.2, 7.2, 7.0, 3), wallW); ped.rotation.set(Math.PI / 2, 0, Math.PI / 2); ped.scale.set(1, 0.4, 1); ped.position.set(0, 16.2, 3.6); por.add(ped);
  bx(2.4, 3.6, 0.2, M('#30261e'), 0, 2.6, 0.05, por); const lan = mesh(new THREE.CylinderGeometry(0.35, 0.3, 1.0, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.0, 1.3) })); lan.position.set(0, 9.6, 4.6); por.add(lan);
  const fp = mesh(new THREE.CylinderGeometry(0.08, 0.1, 12, 8), M('#e8e8e8', { metalness: 0.8, roughness: 0.3 })); fp.position.set(0, 23.5, 0); WHG.add(fp); flag(WHG, 0.05, 28.6, 0, 3.2); }
// fountain, driveway, fence, trees
{ const ft = grp(0, 0, 22, 0, EX.sc); const basin = mesh(new THREE.CylinderGeometry(9, 9.3, 0.7, 48), M('#e8e4dc')); basin.position.y = 0.35; ft.add(basin); const wat = mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.05, 48), new THREE.MeshStandardMaterial({ color: '#5a8ab0', roughness: 0.05, metalness: 0.4 })); wat.position.y = 0.6; ft.add(wat);
  const jet = mesh(new THREE.CylinderGeometry(0.05, 0.35, 5, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.0), transparent: true, opacity: 0.5, depthWrite: false })); jet.position.y = 3.0; ft.add(jet);
  const drv = mesh(new THREE.RingGeometry(14, 19, 64, 1, Math.PI, Math.PI), M('#c8c0b0', { roughness: 0.8 }), false, true); drv.rotation.x = -Math.PI / 2; drv.position.set(0, 0.02, -22); EX.sc.add(drv);
  bx(5, 0.02, 30, M('#c8c0b0'), 0, 0.02, -14, EX.sc).position.z = -12;
  for (let k = 0; k < 60; k++) { const x = -90 + k * 3; const b = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), M('#1a1a1c', { metalness: 0.6 })); b.position.set(x, 1.1, 48); EX.sc.add(b); } bx(180, 0.1, 0.1, M('#1a1a1c'), 0, 2.1, 48, EX.sc); bx(180, 0.1, 0.1, M('#1a1a1c'), 0, 0.3, 48, EX.sc);
  const treeM = F_('#3e7a2a'), trunkM = F_('#5a3a24'); for (let k = 0; k < 40; k++) { const s = hash(k) < 0.5 ? -1 : 1, x = s * (30 + 60 * hash(k * 3)), z = -80 + 120 * hash(k * 5); const tg = grp(x, 0, z, 0, EX.sc); const tr = mesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 7), trunkM); tr.position.y = 2.5; tg.add(tr);
    for (let j = 0; j < 4; j++) { const c = mesh(new THREE.IcosahedronGeometry(3 + 1.5 * hash(k * 7 + j), 0), treeM); c.position.set((hash(k + j) - 0.5) * 3, 6 + j * 1.3, (hash(k * 2 + j) - 0.5) * 3); tg.add(c); } } }
const CONV = makeCar('#c8322a', { L: 4.4 }); CONV.position.set(-9, 0, -18); CONV.rotation.y = 0.3; EX.sc.add(CONV);
const KEYRING = new THREE.Group(); { const ring = mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 14), M('#d8d8d8', { metalness: 1, roughness: 0.2 })); KEYRING.add(ring); const k1 = bx(0.012, 0.055, 0.004, M('#d8d8d8', { metalness: 1, roughness: 0.2 }), 0, -0.04, 0, KEYRING); const fob = bx(0.03, 0.045, 0.012, DARK, 0.02, -0.035, 0, KEYRING); EX.sc.add(KEYRING); }
const BEASTG = new THREE.Group(); EX.sc.add(BEASTG); BEASTG.position.set(6, 0, -14);
{ const blk = M('#16181c', { roughness: 0.16, metalness: 0.75 }), chr = M('#d8dce2', { metalness: 1, roughness: 0.15 }), tint = M('#05070a', { roughness: 0.05, metalness: 0.6 });
  rb(2.1, 1.1, 5.8, blk, 0, 0.95, 0, BEASTG, 0.18); rb(1.95, 0.7, 3.2, blk, 0, 1.85, -0.3, BEASTG, 0.15); rb(1.97, 0.5, 3.0, tint, 0, 1.86, -0.3, BEASTG, 0.1);
  rb(1.2, 0.5, 0.1, chr, 0, 1.05, 2.92, BEASTG, 0.04); for (let k = 0; k < 6; k++) bx(1.1, 0.03, 0.12, blk, 0, 0.85 + k * 0.07, 2.93, BEASTG);
  for (const x of [-0.75, 0.75]) { const hl = mesh(new THREE.BoxGeometry(0.35, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: '#f4f6ff' })); hl.position.set(x, 1.15, 2.92); BEASTG.add(hl); }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const w = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 16), DARK); w.rotation.z = Math.PI / 2; w.position.set(x * 1.0, 0.45, z * 1.9); BEASTG.add(w); const hub = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 12), chr); hub.rotation.z = Math.PI / 2; hub.position.copy(w.position); BEASTG.add(hub); }
  for (const x of [-0.9, 0.9]) { const st = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.45, 6), chr); st.position.set(x, 1.7, 2.4); BEASTG.add(st); flag(BEASTG, x, 1.82, 2.4, 0.22); }
  // the heavy rear door (left side), 8 in = 0.2 m thick, hinged at its front edge
  const dg = new THREE.Group(); dg.position.set(-1.06, 0.45, 0.35); BEASTG.add(dg); BEASTG.door = dg; const df = rb(0.2, 1.5, 1.25, blk, 0, 0.8, -0.62, dg, 0.04); const dwin = rb(0.21, 0.5, 1.0, tint, 0, 1.3, -0.62, dg, 0.04);
  const edge = bx(0.205, 1.42, 0.03, M('#9a9ea6', { metalness: 0.8, roughness: 0.3 }), 0, 0.8, -1.25, dg); for (let k = 0; k < 4; k++) bx(0.21, 0.02, 0.035, M('#5a5e66'), 0, 0.3 + k * 0.35, -1.25, dg); bx(0.02, 1.2, 1.05, M('#b89a72', { roughness: 0.6 }), 0.11, 0.75, -0.62, dg); const hnd = bx(0.04, 0.04, 0.2, chr, -0.12, 0.95, -1.0, dg); }
// ======================= 3) THE SKY: Air Force One-style 747 over clouds (generic livery, no seal) + its cabin (x 2000) =======================
const SKY = mkSet({ top: '#3a6ac8', bot: '#dce8f4', fog: 0xdce6f0, near: 300, far: 2600, hemi: [0xffffff, 0x8aa0c0, 1.0], sun: [0xfff4e0, 2.6, V3(80, 120, 60)], shadow: 50 });
const JET = new THREE.Group(); SKY.sc.add(JET);
{ const wh = M('#f6f6f4', { roughness: 0.35, metalness: 0.2 }), lb = M('#86aed0', { roughness: 0.35, metalness: 0.2 }), db = M('#1e2d52', { roughness: 0.4 }), gr = M('#b8bcc4', { metalness: 0.5, roughness: 0.3 });
  const fus = mesh(new THREE.CylinderGeometry(3.2, 3.2, 62, 28).rotateX(Math.PI / 2), wh); JET.add(fus); const belly = mesh(new THREE.CylinderGeometry(3.22, 3.22, 62, 28, 1, true, Math.PI * 0.62, Math.PI * 0.76).rotateX(Math.PI / 2), lb); JET.add(belly);
  const ch = mesh(new THREE.CylinderGeometry(3.24, 3.24, 62, 28, 1, true, Math.PI * 0.56, 0.12).rotateX(Math.PI / 2), db); JET.add(ch); const ch2 = mesh(new THREE.CylinderGeometry(3.24, 3.24, 62, 28, 1, true, Math.PI * 1.32, 0.12).rotateX(Math.PI / 2), db); JET.add(ch2);
  const nose = mesh(new THREE.SphereGeometry(3.2, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), wh); nose.scale.set(1, 1, 2.2); nose.position.z = 31; JET.add(nose);
  const hump = mesh(new THREE.CylinderGeometry(2.1, 2.1, 24, 20).rotateX(Math.PI / 2), wh); hump.scale.set(0.9, 0.8, 1); hump.position.set(0, 2.6, 17); JET.add(hump); const hn = mesh(new THREE.SphereGeometry(2.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), wh); hn.scale.set(0.9, 0.8, 2.4); hn.position.set(0, 2.6, 29); JET.add(hn);
  const tail = mesh(new THREE.CylinderGeometry(3.2, 0.8, 14, 24).rotateX(-Math.PI / 2), wh); tail.position.z = -38; JET.add(tail);
  const fin = mesh(new THREE.BoxGeometry(0.6, 13, 9), lb); fin.position.set(0, 9, -40); fin.rotation.x = -0.35; JET.add(fin); const ff = mesh(new THREE.PlaneGeometry(4, 2.1), new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.6, side: THREE.DoubleSide })); ff.position.set(0.32, 10.5, -40.5); ff.rotation.y = Math.PI / 2; JET.add(ff);
  const wing = mesh(new THREE.BoxGeometry(64, 0.8, 10), wh); wing.position.set(0, -1.2, 0); JET.add(wing); for (const sx of [-1, 1]) { const tw = mesh(new THREE.BoxGeometry(22, 0.5, 5), wh); tw.position.set(sx * 9, 1.5, -39); JET.add(tw); }
  for (const x of [-22, -12, 12, 22]) { const en = mesh(new THREE.CylinderGeometry(1.5, 1.7, 6, 18).rotateX(Math.PI / 2), gr); en.position.set(x, -3.2, 4); JET.add(en); const ein = mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.1, 18).rotateX(Math.PI / 2), DARK); ein.position.set(x, -3.2, 7.05); JET.add(ein); }
  for (let k = 0; k < 40; k++) for (const sx of [-1, 1]) bx(0.05, 0.45, 0.35, M('#1a2230'), sx * 3.15, 0.9, 24 - k * 1.3, JET); }
const CLOUDS = new THREE.Group(); SKY.sc.add(CLOUDS); { const cm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }); const g = new THREE.IcosahedronGeometry(1, 1); const n = 700, im = new THREE.InstancedMesh(g, cm, n);
  for (let i = 0; i < n; i++) { const x = (hash(i * 1.1) - 0.5) * 3000, z = (hash(i * 2.3) - 0.5) * 3000, s = 25 + 60 * hash(i * 3.7); _o.position.set(x, -120 + 15 * hash(i * 4.1), z); _o.scale.set(s * 1.6, s * 0.6, s); _o.rotation.set(0, hash(i) * 3, 0); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); } CLOUDS.add(im); }
// the cabin: a warm wood-and-leather section with oval windows (x 2000)
const CAB = grp(2000, 0, 0, 0, SKY.sc);
{ const sh = mesh(new THREE.CylinderGeometry(2.6, 2.6, 12, 32, 1, true).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.8, side: THREE.BackSide })); sh.position.y = 1.2; CAB.add(sh); bx(4.4, 0.1, 12, M('#3a4a6a', { roughness: 1 }), 0, 0, 0, CAB);
  for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) { const w = mesh(new RoundedBoxGeometry(0.05, 0.42, 0.3, 3, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.8, 3.1) })); w.position.set(sx * 2.32, 1.35, -4 + k * 1.6); w.rotation.z = sx * 0.25; CAB.add(w); }
  const seat = grp(-0.9, 0, 0.6, Math.PI, CAB); const lea = M('#6a3e22', { roughness: 0.45 }); rb(0.75, 0.16, 0.7, lea, 0, 0.45, 0, seat, 0.06); rb(0.75, 0.85, 0.18, lea, 0, 0.9, -0.32, seat, 0.06); for (const sx of [-1, 1]) rb(0.14, 0.25, 0.65, lea, sx * 0.42, 0.62, 0, seat, 0.05);
  const tbl = grp(-0.9, 0, -0.35, 0, CAB); bx(0.9, 0.05, 0.6, WOOD, 0, 0.72, 0, tbl); bx(0.08, 0.7, 0.08, GOLD, 0, 0.36, 0, tbl);
  const can = mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 16), M('#c8322a', { metalness: 0.7, roughness: 0.3 })); can.position.set(-0.75, 0.81, -0.25); CAB.add(can); const gl = mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 14), new THREE.MeshPhysicalMaterial({ color: '#cfe0f0', transparent: true, opacity: 0.4, roughness: 0.05 })); gl.position.set(-0.6, 0.8, -0.35); CAB.add(gl);
  RL.cab = new THREE.PointLight(0xffe0b8, 6, 8, 1.4); RL.cab.position.set(0, 2.3, 0); CAB.add(RL.cab); const strip = bx(0.06, 0.03, 11, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.8, 1.5) }), 0, 3.6, 0, CAB); }
// ======================= the hero's suit (her ask): navy jacket over the approved hero — top recoloured, long sleeves on the arm joints, shirt + red tie + lapels print; off in bed =======================
const SUIT = (() => { const navy = new THREE.Color('#1f2a44'), cTop = new THREE.Color(hero.o.top), cTop2 = cTop.clone().multiplyScalar(0.82), mats = [];
  hero.outer.traverse(o => { if (!o.isSkinnedMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.color && (m.color.equals(cTop) || m.color.equals(cTop2))) mats.push([m, m.color.clone(), m.color.equals(cTop) ? navy.clone() : navy.clone().multiplyScalar(0.8)]); }); });
  const jm = new THREE.MeshStandardMaterial({ color: '#1f2a44', roughness: 0.7 }), wm = M('#f6f6f2'), parts = [];
  hero.arms.forEach(a => { const s = mesh(new THREE.CylinderGeometry(0.072, 0.064, 0.33, 14), jm); s.position.y = -0.14; a.add(s); parts.push(s); });
  hero.elbows.forEach(e => { const s = mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.235, 14), jm); s.position.y = -0.105; e.add(s); parts.push(s); const c = mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.03, 14), wm); c.position.y = -0.235; e.add(c); parts.push(c); });
  const tx = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f6f6f2'; g.beginPath(); g.moveTo(w * 0.33, 0); g.lineTo(w * 0.67, 0); g.lineTo(w * 0.5, h * 0.78); g.fill();
    g.fillStyle = '#b3202a'; g.beginPath(); g.moveTo(w * 0.465, h * 0.07); g.lineTo(w * 0.535, h * 0.07); g.lineTo(w * 0.56, h * 0.62); g.lineTo(w * 0.5, h * 0.72); g.lineTo(w * 0.44, h * 0.62); g.fill(); g.fillStyle = '#8a1820'; g.fillRect(w * 0.46, h * 0.04, w * 0.08, h * 0.05);
    g.strokeStyle = '#141c30'; g.lineWidth = 7; g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(w * 0.5, h * 0.8); g.lineTo(w * 0.7, 0); g.stroke(); g.fillStyle = '#0e1424'; for (const y of [0.86, 0.97]) { g.beginPath(); g.arc(w * 0.5, h * y, 6, 0, 7); g.fill(); }
    g.fillStyle = '#c8a050'; g.beginPath(); g.arc(w * 0.3, h * 0.22, 7, 0, 7); g.fill(); });
  const pr = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.36, 24, 1, true, -0.26, 0.52), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.8 }), false, false); pr.position.set(0, 1.25, 0.154 - 0.36); hero.torso.add(pr); parts.push(pr);
  return { set(on) { mats.forEach(([m, c0, c1]) => m.color.copy(on ? c1 : c0)); parts.forEach(p => p.visible = on); } }; })();
// =================== THE STORY: one day as President — poses, shots (moving cameras, DOF, motion blur, whips), captions/HUD, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
const CAST = [hero, ...AGENTS, aide, butler];
function hideCast() { CAST.forEach(P => P.outer.visible = false); KEYRING.visible = false; BILL.visible = false; BALL.visible = false; }
function stand(P, x, z, ry, t, face) { poseReset(P, t); place(P, x, z, ry); if (face) P.face(face, t); }
// ---- poses per beat ----
function pose(t, k) { hideCast(); BEASTG.door.rotation.y = 0; SUIT.set(t >= WHX);
  if (k === 'in' && t < WHX) { const P = hero; poseReset(P, t); place(P, -0.9, -1.75, 0, seatY(P, 0.72) - 0.95); poseSit(P); P.legs.forEach(l => l.rotation.x = -1.45); P.knees.forEach(q => q.rotation.x = 0.05);
    P.arms.forEach((a, i) => a.rotation.set(-0.35, 0, (i ? -1 : 1) * 0.15)); P.face(t < 1.0 ? 'sleep' : t < 1.6 ? 'sleepy' : 'surprised', t);
    stand(AGENTS[0], -1.52, 0.5, Math.PI * 0.95, t, 'neutral'); stand(AGENTS[1], -0.28, 0.5, -Math.PI * 0.95, t, t > 1.4 ? 'smirk' : 'neutral'); }
  else if (k === 'in' && t >= AIDE && t < KEYS) { const z = 9 - 1.15 * (t - AIDE); stand(hero, 40.2, z, Math.PI, t); poseWalk(hero, t * 6.5, 1); hero.face(t < 10.4 ? 'happy' : 'worried', t);
    stand(aide, 40.75, z + 1.5, Math.PI, t, 'neutral'); poseWalk(aide, t * 6.5 + 1.2, 0.9); aide.arms[1].rotation.set(0.05, 0, 0.05); aide.elbows[1].rotation.x = -0.1;
    stand(AGENTS[2], 38.9, z + 2.6, Math.PI, t, 'neutral'); poseWalk(AGENTS[2], t * 6.5 + 2.4, 0.9); }
  else if (k === 'ex' && t >= KEYS && t < BEAST) { const u = clamp(span(t, KEYS, 15.6), 0, 1); const hx = lerp(-3.5, -7.2, esin(u)), hz = lerp(-12, -15.4, esin(u)); stand(hero, hx, hz, Math.atan2(-9 - hx, -18 - hz), t); poseWalk(hero, t * 6, 1 - smooth(15.2, 15.6, t));
    hero.arms[1].rotation.set(-0.55 * smooth(14.6, 15.2, t), 0, 0.1); hero.elbows[1].rotation.x = -0.6 * smooth(14.6, 15.2, t); hero.face(t < 16.3 ? 'happy' : 'sad', t);
    const A = AGENTS[3]; const ax = lerp(-2.0, hx + 0.9, esin(span(t, 15.0, 16.0))), az = lerp(-10.5, hz + 0.6, esin(span(t, 15.0, 16.0))); stand(A, ax, az, Math.atan2(hx - ax, hz - az), t, 'neutral'); if (t < 16.0) poseWalk(A, t * 7, 1);
    A.arms[1].rotation.set(-0.6 * smooth(15.8, 16.2, t), 0, -0.1); A.elbows[1].rotation.x = -0.5 * smooth(15.8, 16.2, t);
    const hand = (P, side) => (P.outer.updateMatrixWorld(true), P.elbows[side].localToWorld(V3(0, -0.3, 0.02)));
    KEYRING.visible = true; KEYRING.position.copy(t < 16.3 ? hand(hero, 1) : hand(A, 1)); KEYRING.rotation.set(0, t * 0.5, 0.3); }
  else if (k === 'ex' && t >= BEAST && t < AF1) { const dw = BEASTG.door; const open = smooth(21.6, 23.8, t) * 1.0; dw.rotation.y = open;
    BEASTG.updateMatrixWorld(true); const hp = BEASTG.localToWorld(V3(-1.06 - 1.25 * Math.sin(open) - 0.45, 0, 0.35 - 1.25 * Math.cos(open) - 0.35));
    stand(hero, hp.x, hp.z, Math.PI / 2 - open * 0.8, t); hero.outer.rotation.x = 0; hero.outer.rotation.order = 'YXZ'; hero.outer.rotation.x = -0.12 * smooth(21.3, 21.8, t);
    hero.arms.forEach((a, i) => a.rotation.set(-0.6 * smooth(20.8, 21.4, t), 0, (i ? -1 : 1) * 0.05)); hero.elbows.forEach(e => e.rotation.x = -0.35); hero.face(t < 21.3 ? 'proud' : t < 23 ? 'angry' : 'squint', t);
    stand(AGENTS[4], 8.6, -11.0, -2.6, t, 'neutral'); }
  else if (k === 'sky' && t >= 28 && t < MAIL) { const P = hero; poseReset(P, t); place(P, 2000 - 0.9, 0.6, Math.PI, seatY(P, 0.53) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.x = -0.9); P.elbows.forEach(e => e.rotation.x = -0.5);
    if (t > 33.6) { P.arms[1].rotation.set(-0.6, 0, 0.2); P.elbows[1].rotation.x = -1.1; } P.face(t < 29.6 ? 'happy' : t < PAY ? 'surprised' : t < 33.6 ? 'worried' : 'crying', t); }
  else if (k === 'in' && t >= MAIL && t < DINE) { stand(hero, 120, -0.6, 0, t); const r = smooth(MAIL + 0.6, MAIL + 1.2, t); hero.arms.forEach((a, i) => a.rotation.set(-0.5 * r, 0, (i ? -1 : 1) * (0.1 + 0.3 * r))); hero.elbows.forEach(e => e.rotation.x = -0.9 * r);
    hero.face(t < MAIL + 0.8 ? 'happy' : t < MAIL + 3 ? 'surprised' : 'crying', t); }
  else if (k === 'in' && t >= DINE && t < BOWL) { const P = hero; poseReset(P, t); place(P, 80 - 0.95, 1.38, Math.PI / 2, seatY(P, 0.52) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.x = -1.0); P.elbows.forEach(e => e.rotation.x = -0.55);
    P.face(t < 46.4 ? 'happy' : t < 47.4 ? 'surprised' : 'sad', t);
    const bu = butler; const bz = lerp(4.0, 1.9, esin(span(t, 44.6, 46.2))); stand(bu, 80 - 0.25, bz, Math.PI, t, 'neutral'); if (t < 46.2) poseWalk(bu, t * 6, 1); const lift = smooth(45.6, 46.2, t) * (1 - smooth(46.6, 47.0, t));
    bu.arms[1].rotation.set(-0.6 * lift, 0, 0); bu.elbows[1].rotation.x = -1.0 * lift; BILL.visible = true;
    if (t < 46.6) { bu.outer.updateMatrixWorld(true); BILL.position.copy(bu.elbows[1].localToWorld(V3(0, -0.3, 0.12))); BILL.rotation.set(0, 0, 0); } else BILL.position.set(80 - 0.48, 0.81, 1.05); }
  else if (k === 'in' && t >= BOWL && t < SNEAK) { const u = t - BOWL; stand(hero, 160 + 0.12, 8.4 - 0.9 * smooth(0.2, 1.2, u), Math.PI, t); if (u < 1.2) poseWalk(hero, t * 7, 0.8);
    const sw = smooth(0.6, 1.2, u) * (1 - smooth(1.3, 1.8, u)); hero.arms[1].rotation.set(0.45 * sw - 0.6 * smooth(1.2, 1.4, u) * (1 - smooth(1.8, 2.2, u)), 0, 0.05); hero.outer.rotation.order = 'YXZ'; hero.outer.rotation.x = 0.18 * sw;
    const cheer = smooth(3.7, 4.0, u); if (cheer > 0) { hero.arms.forEach((a, i) => a.rotation.set(-0.6 * cheer, 0, (i ? -1 : 1) * 0.45 * cheer)); hero.elbows.forEach(e => e.rotation.x = -1.6 * cheer); hero.outer.position.y += 0.08 * Math.abs(Math.sin((u - 3.7) * 7)) * cheer; }
    hero.face(u < 3.6 ? 'squint' : 'laugh', t); bowlAt(t, BOWL, BOWL + 3.575); }
  else if (k === 'in' && t >= SNEAK && t < ENDC) { const z = -9 + 1.6 * (t - SNEAK); stand(hero, 40.1, z, 0, t); poseWalk(hero, t * 4, 0.45); hero.outer.rotation.order = 'YXZ'; hero.outer.rotation.x = 0.12; hero.knees.forEach(q => q.rotation.x += 0.25);
    hero.face(t < 56.4 ? 'smirk' : 'surprised', t);
    const pops = [[56.0, -1, -6], [57.0, 1, -2], [58.0, -1, 2], [59.0, 1, 6]]; pops.forEach(([tp, sx, dz], i) => { const A = AGENTS[i + 1]; const k2 = smooth(tp, tp + 0.25, t); if (k2 <= 0) return; const hz2 = -9 + 1.6 * (t - SNEAK); stand(A, 40.1 + sx * lerp(2.6, 0.8, k2), Math.min(dz, hz2 + 1.0), -sx * Math.PI / 2, t, 'neutral'); A.shades.visible = false; });
    if (t > 59.0) { const A = AGENTS[4]; stand(A, 40.1, z + 1.3 - 0.2 * smooth(59, 59.3, t), Math.PI, t, 'smirk'); } }
}
// ---- shots: [start, set, camera(t), opts{mb, dof, whip, ao}] ----
const SETS = { in: IN, ex: EX, sky: SKY };
const BEDH = () => H_(hero);
const SHOTS = [
  [WAKE, 'in', t => { const u = esin(span(t, WAKE, WHX)); return LOOK(-0.9, lerp(1.7, 1.45, u), lerp(2.9, 1.5, u), -0.9, lerp(1.62, 1.66, u), -1.75, lerp(54, 40, u)); }],
  [WHX, 'ex', t => { const u = esin(span(t, WHX, AIDE)); return LOOK(lerp(-30, 6, u), lerp(70, 14, u), lerp(170, 30, u), 0, lerp(8, 12, u), -30, 44); }, { whip: 1, far: true }],
  [AIDE, 'in', t => { const z = 9 - 1.15 * (t - AIDE); return LOOK(40.3 + 0.4 * Math.sin(t * 0.6), 1.5, z - 3.4 + 0.5 * esin(span(t, AIDE, 10.4)), 40.4, 1.25, z + 0.8, 42); }, { dof: () => H_(hero) }],
  [10.4, 'in', t => { aide.outer.updateMatrixWorld(true); const b = football.getWorldPosition(V3(0, 0, 0)); const u = esin(span(t, 10.4, KEYS)); return LOOK(b.x + 1.1 - 0.3 * u, b.y + 0.25, b.z - 1.2 + 0.2 * u, b.x, b.y + 0.1, b.z, 40); }, { dof: () => football.getWorldPosition(V3(0, 0, 0)) }],
  [KEYS, 'ex', t => { const u = esin(span(t, KEYS, BEAST)); const h = H_(hero); const d = V3(-5.5, 0, -6).normalize(), pp = V3(-d.z, 0, d.x); return LOOK(h.x + d.x * lerp(3.2, 2.4, u) + pp.x * 1.2, 1.55, h.z + d.z * lerp(3.2, 2.4, u) + pp.z * 1.2, h.x + 0.3, 1.25, h.z + 0.3, 44); }, { dof: () => H_(hero) }],
  [BEAST, 'ex', t => { const u = esin(span(t, BEAST, 21.4)); BEASTG.updateMatrixWorld(true); return LOOK(...BEASTG.localToWorld(V3(-4.2, 0.5, lerp(6.5, 0.5, u))).toArray(), ...BEASTG.localToWorld(V3(0, 1.1, lerp(1.5, -0.8, u))).toArray(), 46); }, { mb: true }],
  [21.4, 'ex', t => { const u = esin(span(t, 21.4, AF1)); BEASTG.updateMatrixWorld(true); const p = BEASTG.localToWorld(V3(-5.4 + 0.8 * u, 1.7, 4.2 - 0.6 * u)), l = BEASTG.localToWorld(V3(-1.7, 1.05, -0.9)); return LOOK(p.x, p.y, p.z, l.x, l.y, l.z, 42); }, { dof: () => H_(hero) }],
  [AF1, 'sky', t => { const u = esin(span(t, AF1, 28)); return LOOK(lerp(150, 95, u), lerp(-25, 12, u), JET.position.z + lerp(170, 70, u), 0, 2, JET.position.z - 5, 44); }, { whip: -1, mb: true, far: true }],
  [28, 'sky', t => orbit(H_(hero), V3(0.4, 0.05, -1), -0.3, 0.2, 2.0, 1.5, 0.62, span(t, 28, PAY), 42), { dof: () => H_(hero) }],
  [PAY, 'sky', t => orbit(H_(hero), V3(-0.5, 0.06, -1), 0.25, -0.2, 1.6, 1.15, 0.6, span(t, PAY, MAIL), 40), { dof: () => H_(hero) }],
  [MAIL, 'in', t => { const u = esin(span(t, MAIL, DINE)); return LOOK(120 + lerp(1.0, 0.4, u), lerp(1.7, 1.55, u), lerp(2.8, 2.0, u), 120, 1.25, -0.6, 44); }, { dof: () => H_(hero) }],
  [DINE, 'in', t => { const u = esin(span(t, DINE, BOWL)); return LOOK(80 + lerp(0.9, 0.6, u), lerp(1.45, 1.3, u), lerp(-0.2, 0.2, u), 80 - 0.8, 1.05, 1.45, 42); }, { dof: () => H_(hero) }],
  [BOWL, 'in', t => { const u = esin(span(t, BOWL, 52.0)); return LOOK(160 + 0.9 - 0.5 * u, lerp(1.3, 0.75, u), lerp(10.5, 9.0, u) - 2.5 * u * u, 160, lerp(1.0, 0.3, u), lerp(7, -4, u), 46); }, { mb: true, whip: 1 }],
  [52.0, 'in', t => { const u = esin(span(t, 52.0, 53.6)); return LOOK(160 + 0.6, 0.4, -7.2 - 0.6 * u, 160, 0.2, -9.9, 44); }, { mb: true }],
  [53.6, 'in', t => orbit(H_(hero), V3(0.3, 0.05, -1), -0.25, 0.25, 2.3, 1.9, 0.62, span(t, 53.6, SNEAK), 42), { dof: () => H_(hero) }],
  [SNEAK, 'in', t => { const h = H_(hero); const u = esin(span(t, SNEAK, ENDC)); return LOOK(40.1 + 0.6 * Math.sin(t * 0.7), 1.45, h.z + lerp(3.6, 2.6, u), 40.1, 1.3, h.z - 0.2, 44); }, { dof: () => H_(hero) }],
  [ENDC, 'in', t => { const h = H_(hero); return LOOK(40.1, 1.45, h.z + 2.6, 40.1, 1.3, h.z, 44); }]];
// per-set state: room lights for the active beat, night hall, flags, window glow
function setState(t, k) { waveFlags(t);
  if (k === 'in') { const night = t >= SNEAK; RL.hall.forEach((L, i) => L.intensity = night ? (i === 1 ? 2 : 0.6) : 14); RL.moon.intensity = night ? 8 : 0; IN.sc.userData.hemi.intensity = night ? 0.12 : 0.55; IN.sc.userData.sun.intensity = night ? 0 : 2.6;
    const s = IN.sc.userData.sun; const roomX = t < WHX ? 0 : t < KEYS || t >= SNEAK ? 40 : t < DINE ? 120 : t < BOWL ? 80 : 160; s.target.position.set(roomX, 0, 0); s.position.set(roomX + 9, 9, 6); mailAt(t, MAIL + 0.5); }
  if (k === 'ex') { EX.winM.emissiveIntensity = 0.15; }
  if (k === 'sky') { JET.position.set(0, 0, 120 * (t - AF1)); JET.rotation.set(0.02 * Math.sin(t * 0.7), 0, 0.03 * Math.sin(t * 0.5)); SKY.sc.userData.sun.target.position.copy(JET.position); SKY.sc.userData.sun.position.copy(JET.position).add(V3(80, 120, 60)); } }
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rim = new THREE.PointLight(0xcfe0ff, 0, 5, 1.5);
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, k, cf, o = {}] = SHOTS[i], S = SETS[k]; puffsReset(); CAST.forEach(P => S.sc.add(P.outer)); S.sc.add(rim);
  setState(t, k); pose(t, k); const F = cf(t); applyF(S.cam, F); S.cam.near = o.far ? 0.5 : 0.06; S.cam.far = o.far ? 3000 : 1700; S.cam.updateProjectionMatrix(); S.cam.updateMatrixWorld();
  if (hero.outer.visible) { const h = H_(hero), back = h.clone().sub(S.cam.position).setY(0).normalize(); rim.position.copy(h).add(back.multiplyScalar(1.0)).add(V3(0, 0.45, 0)); rim.intensity = t >= SNEAK ? 4 : 7; rim.color.set(k === 'ex' ? '#ffe0b8' : t >= SNEAK ? '#8aa8ff' : '#ffe8d0'); } else rim.intensity = 0;
  if (o.far) { shootTo(rt, S.sc, S.cam); return; } shootTo(RTS, S.sc, S.cam);
  const hid = []; S.sc.traverse(q => { if (q.isSprite && q.visible) { hid.push(q); q.visible = false; } }); aoFor(k).render(renderer, rt, RTS); hid.forEach(q => { q.visible = true; }); }
// ---- DOM: title fades, captions pop (series style), HUD (clock / counters), end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[0.2, WHX, 'You wake up. You’re the <b>President</b>.'], [WHX, AIDE, '<b>132</b> rooms. <b>35</b> bathrooms.<br>You live here now.'], [AIDE, 10.4, 'This guy follows you <b>everywhere</b>.'], [10.4, KEYS, 'He carries the <b>nuclear football</b>.'],
  [KEYS, BEAST, 'Presidents aren’t allowed to <b>drive</b>.<br>Not since LBJ.'], [BEAST, AF1, 'Your ride: <b>“The Beast.”</b><br>Doors <b>8 inches</b> thick.'], [AF1, PAY, 'Air Force One: about<br><b>$178,000</b> per flight hour.'],
  [PAY, MAIL, 'Your pay: <b>$1,096</b> a day.<br>One flight hour = <b>162 days</b> of salary.'], [MAIL, DINE, '<b>65,000</b> letters a week.<br><b>100,000</b> emails a day.'], [DINE, BOWL, 'Plot twist: you pay for<br>your own <b>groceries</b>.'],
  [BOWL, SNEAK, 'Yes, there’s a <b>bowling alley</b>.'], [SNEAK, ENDC, 'You can’t go anywhere <b>alone</b>. Ever.']];
const clockAt = t => { const m = 6 * 60 + clamp(t / ENDC, 0, 1) * (17 * 60 + 59); const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); const ap = h < 12 ? 'AM' : 'PM', h12 = ((h + 11) % 12) + 1; return `${h12}:${String(mm).padStart(2, '0')} ${ap}`; };
function hudAt(t) { const cnt = (a, b, v) => v * ease(clamp((t - a) / (b - a), 0, 1));
  if (t >= 28 && t < PAY) return ['AIR FORCE ONE · COST', '$' + fmt(cnt(28.2, 29.6, 177843)) + ' / HR', 'FUEL, CREW, UPKEEP · FY2021'];
  if (t >= PAY && t < MAIL) return ['YOUR SALARY', t < 33.6 ? '$' + fmt(cnt(PAY + 0.2, PAY + 1.2, 1096)) + ' / DAY' : fmt(cnt(33.6, 34.6, 162)) + ' DAYS', t < 33.6 ? '$400,000 A YEAR' : '= ONE HOUR IN THE AIR'];
  if (t >= MAIL && t < DINE) return ['MAIL TO THE PRESIDENT', fmt(cnt(MAIL + 0.3, MAIL + 2.5, 65000)) + ' / WK', '+ 100,000 EMAILS A DAY'];
  if (t < ENDC && t >= WHX) return ['DAY 1 OF 1', clockAt(t), 'PRESIDENT OF THE UNITED STATES'];
  return null; }
function updateDOM(t) {
  el.title.style.opacity = fadeWin(t, 0, WHX, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp && t > 0.15 ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); }
// ---- optics: sub-frame motion blur, depth of field from the AO depth buffer, whip-pan smear ----
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
function whipAt(t) { let w = 0; for (const [c, , , o] of SHOTS) if (o && o.whip) { const k = Math.max(0, 1 - Math.abs(t - c) / 0.14); w += o.whip * 0.11 * k * k; } return w; }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  updateDOM(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#120e16', 1); renderer.clear(); return true; }
  const o = SHOTS[i][3] || {}; let src = RTA;
  if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA); } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && !o.mb && !o.far) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = aoFor(SHOTS[i][1]).depthTexture; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  const u = compMat.uniforms; u.tA.value = src.texture; u.uWhip.value = whipAt(t); u.uPixOn.value = 0; u.uRed.value = 0; u.uT.value = t; u.uSepia.value = 0; u.uLook.value = 0.12; u.uTilt.value = 0;
  composite(0, t >= SNEAK ? 1.35 : 1.0, 1.0); u.tA.value = RTA.texture; return true; };
window.DBG = { THREE, hero, AGENTS, SETS, SHOTS };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const P of CAST) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(P.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
