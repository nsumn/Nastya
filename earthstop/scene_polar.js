import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "What if you were left ALONE at the South Pole all winter?" (Nov 6 2026, US series look — this head is a copy of parts_mind/m_head.js, the HERO.md quality pipeline).
// Facts: last flight mid-Feb / next early Nov (Live Science), sun sets in March and rises in September, winter gusts 52–54 mph and ≤¼-mile visibility days (AMRC monthly reports),
// winter lows −105…−108 °F, the hydroponic Food Growth Chamber (Univ. of Arizona CEAC), dogs removed by April 1994 (Protocol, Annex II). Alone = invented (40–50 people winter there).
// =================== timeline (s) ===================
const T_END = 62.5;
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
// =================== "What if you were left ALONE at the South Pole all winter?" — US channel, 62.5 s ===================
// (first built as a Korean Jang Bogo video; switched to the US South Pole station — flat ice plateau: no mountains, no sea)
// The set: a coastal Antarctic station in the style of Jang Bogo (Terra Nova Bay, 74.6°S): a three-wing main building on stilts, outbuildings,
// fuel tanks, wind turbines, a radome, the sea ice to the north (−z), mountains around. Meters. Interior rooms live INSIDE wing A (north wing).
const pw = new THREE.Scene();
const pCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 60000); pw.add(pCam);
pw.fog = new THREE.FogExp2('#8fa0bc', 0.00012);
// ---- sky: sun height uSunY (−0.2…0.1), night amount uNight, aurora uAur, stars, blizzard whiteout uWhite ----
const SUNAZ = V3(-0.25, 0, -1).normalize();
const skyU = { uSun: { value: V3(0, 0, -1) }, uNight: { value: 0 }, uAur: { value: 0 }, uWhite: { value: 0 }, uT: { value: 0 } };
const AUR_K = { v: 0.2 };
const pSky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform vec3 uSun; uniform float uNight, uAur, uWhite, uT; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0); vec3 s=normalize(uSun); float sw=max(dot(normalize(vec3(d.x,0.0,d.z)),normalize(vec3(s.x,0.0,s.z))),0.0);
      float sy=s.y; float day=smoothstep(-0.12,0.05,sy);
      vec3 zen=mix(vec3(0.004,0.007,0.02), vec3(0.08,0.16,0.36), day), mid=mix(vec3(0.01,0.02,0.05), vec3(0.3,0.38,0.6), day);
      vec3 horW=mix(vec3(0.05,0.05,0.09), vec3(1.6,0.62,0.26), smoothstep(-0.16,0.0,sy)), horE=mix(vec3(0.015,0.02,0.04), vec3(0.45,0.42,0.62), day);
      vec3 hor=mix(horE, horW, pow(sw,2.5)); vec3 c=mix(hor, mid, smoothstep(0.0,0.25,y)); c=mix(c, zen, smoothstep(0.2,0.8,y));
      float sd=max(dot(d,s),0.0); c+=vec3(1.4,0.6,0.25)*pow(sw,10.0)*exp(-y*12.0)*smoothstep(-0.14,0.0,sy)*1.3;
      c+=vec3(6.0,3.6,1.6)*smoothstep(0.9993,0.9998,sd)*step(-0.01,sy);                       // the sun disc
      // stars (fade in at night)
      vec2 sp=vec2(atan(d.z,d.x)*180.0, d.y*300.0); vec2 ci=floor(sp); float st=h(ci); float tw=0.7+0.3*sin(uT*3.0+st*40.0);
      c+=vec3(1.0,0.97,0.9)*step(0.9975,st)*smoothstep(0.35,0.0,length(fract(sp)-0.5))*2.2*tw*uNight*smoothstep(0.0,0.15,y);
      c+=vec3(0.4,0.45,0.6)*fbm(d.xz*3.0/(d.y+0.3))*0.02*uNight;
      // aurora: vertical curtains along a wavy band in the sky, green body, pink-red top, slow drift
      if(uAur>0.001){ vec3 acc=vec3(0.0); for(int k=0;k<24;k++){ float hh=0.08+float(k)*0.022; vec2 q=d.xz/(d.y+0.04)*hh; // project to a sheet at height
          float band=q.x*0.9+0.6*sin(q.y*1.3+uT*0.15)+0.25*sin(q.y*3.1-uT*0.27); float rays=fbm(vec2(q.y*6.0+uT*0.4, float(k)*0.05))*0.8+0.4*n(vec2(q.y*22.0,uT*0.6));
          float m=exp(-pow((band-0.2)*3.2,2.0))*rays*smoothstep(0.02,0.12,d.y); vec3 col=mix(vec3(0.15,1.0,0.45), vec3(0.95,0.25,0.55), float(k)/24.0); acc+=col*m*(1.0-float(k)/26.0); }
        c+=acc*0.2*uAur; }
      if(d.y<0.0) c=hor*0.5;
      c=mix(c, mix(vec3(0.03,0.035,0.05), vec3(0.55,0.6,0.7), day), uWhite);
      gl_FragColor=vec4(c,1.0); }` });
const pDome = new THREE.Mesh(new THREE.SphereGeometry(50000, 64, 32), pSky); pDome.frustumCulled = false; pDome.renderOrder = -10; pw.add(pDome);
{ const envScene = new THREE.Scene(); skyU.uSun.value.set(-0.2, 0.08, -0.97).normalize(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), pSky)); pw.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 1, 400).texture; pw.environmentIntensity = 0.35; }
const pSun = new THREE.DirectionalLight(0xffa060, 2.0); pSun.castShadow = true; pSun.shadow.mapSize.set(4096, 4096);
Object.assign(pSun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 800 }); pSun.shadow.bias = -0.0005; pSun.shadow.normalBias = 0.05; pw.add(pSun, pSun.target);
const pHemi = new THREE.HemisphereLight(0x9fb4e0, 0x6a7088, 0.6); pw.add(pHemi);
const pMoon = new THREE.DirectionalLight(0x6a8cff, 0.0); pMoon.position.set(200, 300, 100); pw.add(pMoon);
// ---- snow ground: sastrugi ripples, sparkle, rocky outcrops on the point; flat sea ice to the north ----
const snowU = { uSun: { value: V3(0, 1, 0) }, uT: { value: 0 } };
const snowMat = new THREE.MeshStandardMaterial({ color: '#eef3fa', roughness: 0.75, metalness: 0 });
snowMat.onBeforeCompile = sh => { sh.uniforms.uT = snowU.uT;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vWP; float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float nn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
    { vec2 p=vWP.xz; float sa=sin(p.x*0.9+p.y*0.25+nn(p*0.08)*6.0)*0.5+0.5; float rk=smoothstep(0.62,0.72,nn(p*0.035)+0.25*nn(p*0.2))*smoothstep(-160.0,-60.0,p.y)*(1.0-smoothstep(160.0,400.0,length(p)));
      vec3 sn=vec3(0.9,0.94,1.0)*(0.9+0.1*sa)*(0.93+0.07*nn(p*1.7)); vec3 ice=vec3(0.78,0.86,0.96)*(0.92+0.08*nn(p*0.05)); float sea=0.0;
      vec3 rock=mix(vec3(0.16,0.14,0.13), vec3(0.3,0.27,0.25), nn(p*0.9)); diffuseColor.rgb=mix(sn,ice,0.25*nn(p*0.01)); }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { float sp=step(0.9985, hh(floor(vWP.xz*9.0))); totalEmissiveRadiance+=vec3(1.2,1.25,1.4)*sp*0.6; }`); };
{ const g = new THREE.PlaneGeometry(9000, 9000, 220, 220); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const land = smooth(-180, -60, z); const r = Math.hypot(x, z);
    p.setY(i, (0.35) * (2.5 * Math.sin(x * 0.02) * Math.cos(z * 0.017) + 4 * smooth(80, 600, r) * (0.5 + 0.5 * Math.sin(x * 0.006 + 1.3) * Math.sin(z * 0.008))) * (r < 70 ? r / 70 : 1)); }
  g.computeVertexNormals(); const gm = mesh(g, snowMat, false, true); pw.add(gm); }
// ---- mountains: a ring of jagged ridges 3–12 km out, snow on top/flat faces, dark rock on steep faces; a big volcano cone to the NW ----
const mtnMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
{ const gs = [];
  const ridge = (cx, cz, len, ht, ang, seg) => { const g = new THREE.PlaneGeometry(len, ht * 2.2, seg, 14); const p = g.attributes.position; const col = [];
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len + 0.5, v = p.getY(i) / (ht * 2.2) + 0.5; const prof = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.7) * (0.55 + 0.45 * Math.sin(u * 17 + cx) * Math.sin(u * 5.3 + cz)) + 0.08 * hash(i + cx);
      const y = ht * prof * v * (1 + 0.15 * (hash(i * 1.7 + cz) - 0.5)); const zz = (1 - v) * ht * 1.6 * (0.8 + 0.4 * hash(i * 0.3)); p.setXYZ(i, p.getX(i), Math.max(0, y), -zz); }
    g.computeVertexNormals(); const nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const steep = 1 - Math.abs(nr.getY(i)); const snow = steep < 0.55 || hash(i * 9.1) < 0.25 ? 1 : 0; const c = snow ? [0.86, 0.9, 0.97] : [0.2, 0.18, 0.17]; col.push(...c); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.rotateY(ang); g.translate(cx, 0, cz); gs.push(g.toNonIndexed()); };
  for (let k = 0; k < 18; k++) { const a = Math.PI * 0.15 + k / 18 * Math.PI * 1.5; const r = 3200 + 6000 * hash(k * 3.1); ridge(Math.sin(a) * r, Math.cos(a) * r, 2500 + 3000 * hash(k), 500 + 1100 * hash(k * 7.3), a + Math.PI, 40); }
  for (let k = 0; k < 8; k++) { const a = -Math.PI * 0.45 + k * 0.12; const r = 14000 + 3000 * hash(k * 5); ridge(Math.sin(a) * r, -Math.cos(a) * r, 5000, 900 + 700 * hash(k * 2), -a, 50); }
  const vol = new THREE.ConeGeometry(9000, 2700, 48, 10, true); { const p = vol.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y + 60 * (hash(i) - 0.5)); } }
  vol.translate(-9000, 1350, -22000); vol.computeVertexNormals(); const vc = []; const vp = vol.attributes.position; for (let i = 0; i < vp.count; i++) { const s = vp.getY(i) > 600 || hash(i) < 0.4; vc.push(...(s ? [0.88, 0.92, 0.98] : [0.25, 0.22, 0.2])); }
  vol.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3)); gs.push(vol.toNonIndexed());
  }
// ---- the station ----
const ST = new THREE.Group(); pw.add(ST);
const clad = M('#d9dde2', { roughness: 0.45, metalness: 0.35 }), cladD = M('#2e3640', { roughness: 0.4, metalness: 0.5 }), steel = M('#8a9098', { roughness: 0.5, metalness: 0.6 }), redP = M('#b8322a', { roughness: 0.55 }), blueP = M('#2a4f8a', { roughness: 0.55 });
const winGlow = new THREE.MeshStandardMaterial({ color: '#10141a', emissive: new THREE.Color('#ffbe7a'), emissiveIntensity: 0, roughness: 0.15, metalness: 0.2 });
const WINGS = [0, 2.094, 4.189], WEND = [];   // wing A points north (−z)
const WING_L = 46, WING_W = 13, WING_H = 9, STILT = 3.2;
WINGS.forEach((a, wi) => { const w = grp(0, 0, 0, a + Math.PI, ST);
  // body: long box with chamfered ends, a dark window band, panel seams; rooftop rail
  bx(WING_W, WING_H, WING_L, clad, 0, STILT + WING_H / 2, WING_L / 2 + 6, w);
  for (const sx of [-1, 1]) bx(0.1, 1.4, WING_L - 2, winGlow, sx * (WING_W / 2 + 0.02), STILT + 5.2, WING_L / 2 + 6, w);
  for (let k = 0; k < 15; k++) for (const sx of [-1, 1]) bx(0.12, 1.5, 0.18, cladD, sx * (WING_W / 2 + 0.07), STILT + 5.2, 8 + k * 3, w);
  for (let k = 0; k < 10; k++) { for (const sx of [-1, 1]) bx(0.08, WING_H + 0.02, 0.08, steel, sx * (WING_W / 2 + 0.04), STILT + WING_H / 2, 7 + k * 4.6, w); bx(WING_W + 0.1, 0.06, 0.08, steel, 0, STILT + WING_H + 0.53, 7 + k * 4.6, w); }
  bx(WING_W + 0.4, 0.5, WING_L + 0.4, cladD, 0, STILT + WING_H + 0.25, WING_L / 2 + 6, w);
  bx(WING_W + 0.4, 0.4, WING_L + 0.4, cladD, 0, STILT - 0.2, WING_L / 2 + 6, w);
  WEND.push(bx(WING_W - 1, 2.0, 0.4, winGlow, 0, STILT + 5.6, WING_L + 6.1, w));
  for (let k = 0; k < 8; k++) for (const sx of [-1, 1]) { const s = mesh(new THREE.CylinderGeometry(0.35, 0.35, STILT, 10), steel); s.position.set(sx * (WING_W / 2 - 1.2), STILT / 2, 9 + k * 5.6); w.add(s); }
  if (wi === 1) { bx(3, 2.6, 3, cladD, 0, STILT + WING_H + 1.3, WING_L - 4, w); }
});
{ const hub = mesh(new THREE.CylinderGeometry(11, 11, WING_H + 2, 6), clad); hub.position.y = STILT + (WING_H + 2) / 2; ST.add(hub);
  const hr = mesh(new THREE.CylinderGeometry(11.3, 11.3, 1.6, 6), winGlow); hr.position.y = STILT + 6.2; ST.add(hr);
  const top = mesh(new THREE.CylinderGeometry(6, 8, 2.5, 6), cladD); top.position.y = STILT + WING_H + 3.2; ST.add(top);
  const stair = bx(2.4, STILT, 6, steel, 0, STILT / 2, 14, ST); stair.rotation.x = 0.45; }
// outbuildings, tanks, turbines, radome, masts with red lights, rope-line posts
const OUT = [];
[[-70, 30, 18, 6, 10, redP], [-95, 5, 12, 5, 8, blueP], [75, 40, 22, 7, 12, redP], [95, 10, 10, 4, 7, M('#d8a420')], [-40, 75, 16, 6, 9, M('#cfd4da')], [30, 95, 26, 8, 14, redP]].forEach(([x, z, w, h, d, m]) => { const g = grp(x, 0, z, hash(x) * 0.6, ST); bx(w, h, d, m, 0, h / 2 + 0.4, 0, g); bx(w + 0.3, 0.35, d + 0.3, cladD, 0, h + 0.55, 0, g); bx(1.2, 2.2, 0.1, winGlow, w * 0.25, 1.5, d / 2 + 0.02, g); OUT.push(g); });
for (let k = 0; k < 4; k++) { const t2 = mesh(new THREE.CylinderGeometry(5, 5, 9, 28), M('#e8eaec', { roughness: 0.4, metalness: 0.4 })); t2.position.set(110 + k * 12, 4.5, -30 + (k % 2) * 4); ST.add(t2); const ring = mesh(new THREE.TorusGeometry(5.05, 0.12, 6, 28), steel); ring.rotation.x = Math.PI / 2; ring.position.set(t2.position.x, 9, t2.position.z); ST.add(ring); }
const TURB = [];
[[-130, -40], [-150, 30]].forEach(([x, z]) => { const g = grp(x, 0, z, 0, ST); const tw = mesh(new THREE.CylinderGeometry(0.6, 1.1, 30, 12), M('#eef0f2', { roughness: 0.4 })); tw.position.y = 15; g.add(tw);
  const hub = grp(0, 30, -1.2, 0, g); bx(1.4, 1.4, 3.2, M('#eef0f2'), 0, 0, 1.2, g).position.y = 30; for (let b = 0; b < 3; b++) { const bl = mesh(new THREE.BoxGeometry(0.5, 12, 0.12).translate(0, 6, 0), M('#f2f3f4')); bl.rotation.z = b * 2.094; hub.add(bl); } TURB.push(hub); });
{ const rd = mesh(new THREE.SphereGeometry(5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), M('#f4f4f2', { roughness: 0.5 })); rd.position.set(55, 9, -55); ST.add(rd); bx(6, 6, 6, clad, 55, 3, -55, ST); }
const REDL = []; [[40, -20, 28], [-60, -60, 22], [12, 60, 34]].forEach(([x, z, h]) => { const m = mesh(new THREE.CylinderGeometry(0.15, 0.25, h, 6), steel); m.position.set(x, h / 2, z); ST.add(m);
  for (let k = 1; k <= 4; k++) { const st = mesh(new THREE.CylinderGeometry(0.03, 0.03, h * 1.2, 4), steel); st.position.set(x + Math.sin(k * 1.57) * h * 0.3, h * 0.45, z + Math.cos(k * 1.57) * h * 0.3); st.lookAt(x, h, z); st.rotateX(Math.PI / 2); }
  const l = mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.3, 0.2) })); l.position.set(x, h + 0.3, z); ST.add(l); REDL.push(l); });
// the rope line: posts every 6 m from the main building to the science hut (blizzard walk)
const ROPE_A = V3(-14, 0, 22), ROPE_B = V3(-40, 0, 75);
{ const n = 10; const pts = []; for (let k = 0; k <= n; k++) { const p = ROPE_A.clone().lerp(ROPE_B, k / n); const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M('#f0d040')); post.position.set(p.x, 0.6 + 0.4, p.z); pw.add(post); pts.push(V3(p.x, 1.15 + 0.4, p.z)); }
  const curve = []; for (let k = 0; k < n; k++) for (let s = 0; s <= 8; s++) { const a = pts[k], b = pts[k + 1], u = s / 8; curve.push(a.clone().lerp(b, u).add(V3(0, -0.12 * Math.sin(Math.PI * u), 0))); }
  const rope = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 200, 0.025, 5), M('#e83a20', { roughness: 0.6 })); pw.add(rope); }
// ---- blizzard: 9000 wind-driven snow streaks around the camera (pure function of t) ----
const SN = 9000; const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SN * 6), 3));
const snowLines = new THREE.LineSegments(snowGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.8), transparent: true, opacity: 0.55, fog: false, depthWrite: false })); snowLines.frustumCulled = false; pw.add(snowLines);
function snowAt(t, cam, wind, amt, ctr) { snowLines.visible = amt > 0.01; if (!snowLines.visible) return; snowLines.material.opacity = 0.6 * amt; const a = snowGeo.attributes.position.array, c = ctr || cam.position, B = 26;
  const vx = wind, vy = -2.5, vz = wind * 0.35, sl = 0.045;
  for (let i = 0; i < SN; i++) { const ox = hash(i * 1.1) * B * 2, oy = hash(i * 2.3) * B, oz = hash(i * 3.7) * B * 2; const sp = 0.7 + 0.6 * hash(i * 5.9);
    const x = wrapR(ox + vx * sp * t - c.x, 0, B * 2) - B + c.x, y = wrapR(oy + vy * sp * t - c.y + B * 0.5, 0, B) - B * 0.5 + c.y, z = wrapR(oz + vz * sp * t - c.z, 0, B * 2) - B + c.z;
    const tu = 0.4 * Math.sin(t * 3 + i); a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x - vx * sp * sl; a[i * 6 + 4] = y - (vy + tu) * sp * sl; a[i * 6 + 5] = z - vz * sp * sl; }
  snowGeo.attributes.position.needsUpdate = true; }
// ---- our hero — EXACTLY the approved line from HERO.md (tee). Outside (−100°F) the same hero in the approved hoodie outfit, same charcoal colour.
const HERO_O = { head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 };
const heroIn = makeBlock(HERO_O), heroOut = heroIn; pw.add(heroIn.outer); heroIn.outer.visible = false;   // the hoodie mesh tears — always the approved tee hero (HERO.md)
for (const H of [heroIn]) for (const n of Object.keys(FACE)) for (const bl of [false, true]) renderer.initTexture(faceTex(H.o, n, bl));
let hero = heroOut;
function heroBase(x, z, ry, inside = false) { heroIn.outer.visible = heroOut.outer.visible = false; hero = inside ? heroIn : heroOut; const P = hero; P.outer.visible = true; P.outer.rotation.order = 'YXZ'; P.outer.rotation.set(0, ry, 0); P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02; P.arms[0].rotation.set(0, 0, -0.1); P.arms[1].rotation.set(0, 0, 0.1); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.25; P.outer.position.set(x, 0.95 + 0.35, z); }
// ---- the ceremonial South Pole: a striped pole with a chrome ball ----
const POLE = V3(-6, 0.35, -120);
{ const st = canvasTex(64, 512, (g, w, h) => { for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#c8322a' : '#f4f2ee'; g.save(); g.translate(0, k * 32); g.transform(1, 0.5, 0, 1, 0, 0); g.fillRect(0, -32, w, 32); g.restore(); } });
  const pl = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 20), new THREE.MeshStandardMaterial({ map: st, roughness: 0.4 })); pl.position.set(POLE.x, POLE.y + 0.65, POLE.z); pw.add(pl);
  const ball = mesh(new THREE.SphereGeometry(0.2, 32, 20), new THREE.MeshStandardMaterial({ color: '#e8ecf2', metalness: 1, roughness: 0.05, envMapIntensity: 1.4 })); ball.position.set(POLE.x, POLE.y + 1.5, POLE.z); pw.add(ball);
  const base = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 16), M('#3a3c42')); base.position.set(POLE.x, POLE.y + 0.06, POLE.z); pw.add(base);
  // a ring of plain colored pennants on bamboo poles around it (no national flags)
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, x = POLE.x + Math.cos(a) * 3.2, z = POLE.z + Math.sin(a) * 3.2; const bp = mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), M('#c8b080')); bp.position.set(x, POLE.y + 0.8, z); pw.add(bp);
    const f = mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshStandardMaterial({ color: pick(['#2a4f9a', '#e8e4dc', '#c8322a', '#2f7a4a', '#e8b030']), side: THREE.DoubleSide, roughness: 0.8 })); f.position.set(x + 0.17, POLE.y + 1.49, z); f.rotation.y = 0.3; pw.add(f); } }
// the station env map was made before; refresh it so the chrome ball reflects the plateau sky
// ---- the last plane: a ski-equipped four-engine turboprop (grey, orange tail band; no markings) ----
const PLANE = new THREE.Group(); pw.add(PLANE);
{ const gr = M('#9aa0a8', { roughness: 0.5, metalness: 0.3 }), dk = M('#30343a', { roughness: 0.5 });
  const fus = mesh(new THREE.CylinderGeometry(2.1, 2.1, 26, 20).rotateX(Math.PI / 2), gr); fus.position.set(0, 3.2, 0); PLANE.add(fus);
  const nose = mesh(new THREE.SphereGeometry(2.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), gr); nose.scale.set(1, 0.9, 1.4); nose.position.set(0, 3.1, 13); PLANE.add(nose);
  bx(2.4, 0.7, 1.6, dk, 0, 4.6, 12.6, PLANE);
  const tail = mesh(new THREE.CylinderGeometry(2.1, 0.6, 10, 16).rotateX(-Math.PI / 2), gr); tail.position.set(0, 3.9, -17.8); PLANE.add(tail);
  bx(0.4, 8, 5, M('#d8642a'), 0, 8.5, -21.5, PLANE); bx(13, 0.3, 3.4, gr, 0, 4.6, -21.5, PLANE);
  bx(40, 0.5, 4.2, gr, 0, 5.4, 2, PLANE);
  for (const x of [-12, -6, 6, 12]) { const en = mesh(new THREE.CylinderGeometry(0.75, 0.9, 4.5, 14).rotateX(Math.PI / 2), gr); en.position.set(x, 4.9, 3.4); PLANE.add(en);
    const pr = mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#202428', transparent: true, opacity: 0.35, depthWrite: false })); pr.position.set(x, 4.9, 5.75); PLANE.add(pr); }
  for (const x of [-2.4, 2.4]) { bx(0.9, 0.3, 7, M('#2a2a2e'), x, 0.25, 0, PLANE); } bx(0.9, 0.3, 4, M('#2a2a2e'), 0, 0.25, 10, PLANE);
  for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) bx(0.05, 0.5, 0.5, dk, sx * 2.08, 4.0, 7 - k * 1.6, PLANE); }
const planeCloud = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(1500 * 3), 3)), new THREE.PointsMaterial({ color: '#f4f6fa', size: 2.2, transparent: true, opacity: 0.5, depthWrite: false })); planeCloud.frustumCulled = false; pw.add(planeCloud);
function planeAt(t, t0) { const u = t - t0; const z = -260, x = 60 - 30 * u - 3 * u * u; const y = Math.max(0, 1.8 * (u - 2.2) * (u - 2.2) * (u > 2.2 ? 1 : 0)); PLANE.position.set(x, 0.35 + y, z); PLANE.rotation.set(0, -Math.PI / 2, 0); PLANE.rotateX(-Math.min(0.2, y * 0.02));
  const a = planeCloud.geometry.attributes.position.array; for (let i = 0; i < 1500; i++) { const age = hash(i) * 3, uu = u - age, px = 60 - 30 * uu - 3 * uu * uu + 6; const sp = age * 4; a[i * 3] = px + (hash(i * 3) - 0.5) * sp + 10 * age; a[i * 3 + 1] = 0.5 + hash(i * 5) * sp * 0.6 + (uu > 2.2 ? 1.8 * (uu - 2.2) ** 2 * 0.6 : 0); a[i * 3 + 2] = z + (hash(i * 7) - 0.5) * (sp + 6); }
  planeCloud.geometry.attributes.position.needsUpdate = true; }
const FLOOD = []; [[0, 13, 20, 0.0], [-20, 11, -60, 0.0], [40, 11, 50, 0.0]].forEach(([x, y, z]) => { const L = new THREE.SpotLight(0xffd6a0, 0, 160, 0.9, 0.6, 1.2); L.position.set(x, y, z); L.target.position.set(x * 1.6, 0, z * 1.6 + 10); pw.add(L, L.target); FLOOD.push(L); });
const auroraFill = new THREE.PointLight(0xffc890, 0, 60, 1.2); auroraFill.position.set(-14, 6, -72); pw.add(auroraFill);
const _ghO = new THREE.Object3D();
// ---- interiors: the mess hall on the upper floor of wing A (window to the north = the sea ice), a bunk room, the robot vacuum, gloves for POV ----
const FL = STILT + 4.2;            // upper floor level (world y)
const ROOM = new THREE.Group(); pw.add(ROOM);
const wallM = M('#bfb6a8', { roughness: 0.9 }), floorM = new THREE.MeshStandardMaterial({ color: '#8a7058', roughness: 0.55 }), ceilM = M('#f0eee8');
{ // floor: wood planks texture
  const t = canvasTex(1024, 1024, (g, w, h) => { for (let r = 0; r < 16; r++) for (let c = 0; c < 3; c++) { const l = 30 + 25 * rnd(); g.fillStyle = `hsl(28,${30 + 10 * rnd()}%,${l}%)`; g.fillRect(c * w / 3 + (r % 2) * 80, r * h / 16, w / 3, h / 16); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let r = 0; r <= 16; r++) { g.beginPath(); g.moveTo(0, r * h / 16); g.lineTo(w, r * h / 16); g.stroke(); } speckle(g, w, h, 20000, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.05)'], 3); }, [3, 6]);
  floorM.map = t; }
const RZ0 = -20, RZ1 = -51, RX = 6;
bx(12, 0.1, 31, floorM, 0, FL - 0.05, (RZ0 + RZ1) / 2, ROOM);
bx(12, 0.1, 31, ceilM, 0, FL + 3.4, (RZ0 + RZ1) / 2, ROOM);
bx(0.1, 3.4, 31, wallM, -RX, FL + 1.7, (RZ0 + RZ1) / 2, ROOM); bx(0.1, 3.4, 31, wallM, RX, FL + 1.7, (RZ0 + RZ1) / 2, ROOM); bx(12, 3.4, 0.1, wallM, 0, FL + 1.7, RZ0, ROOM);
for (const sx of [-1, 1]) bx(0.06, 1.0, 31, M('#7a5a40', { roughness: 0.7 }), sx * (RX - 0.05), FL + 0.5, (RZ0 + RZ1) / 2, ROOM);
for (let k = 0; k < 8; k++) bx(12, 0.18, 0.25, M('#d8d4cc'), 0, FL + 3.3, -21.5 - k * 4.2, ROOM);
{ const sh = grp(RX - 0.2, FL, -38, -Math.PI / 2, ROOM); for (let r = 0; r < 4; r++) { bx(2.4, 0.04, 0.32, M('#6a4a34'), 0, 0.5 + r * 0.45, 0, sh); let x = -1.1; while (x < 1.1) { const w = R(0.03, 0.07), h = R(0.22, 0.34); bx(w, h, 0.22, M(pick(['#8a2a2a', '#2a4a7a', '#3a6a3a', '#c8a040', '#ddd'])), x + w / 2, 0.52 + r * 0.45 + h / 2, 0, sh); x += w + 0.005; } } }
{ const k = grp(0, FL, RZ0 + 0.6, 0, ROOM); bx(6, 0.9, 0.6, M('#e8e8e6'), 0, 0.45, 0, k); bx(6.05, 0.04, 0.65, M('#3a3a3a', { roughness: 0.3 }), 0, 0.92, 0, k); bx(6, 0.7, 0.35, M('#dcdcd8'), 0, 2.0, 0.12, k);
  for (let i = 0; i < 6; i++) { const pot = mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.14, 14), M('#a8acb0', { metalness: 0.7, roughness: 0.3 })); pot.position.set(-2.5 + i * 0.9, 1.0, 0); k.add(pot); } }
const posterTex = canvasTex(400, 560, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1a3a'); gr.addColorStop(1, '#1a6a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 46px Inter'; g.textAlign = 'center'; g.fillText('WINTER CREW', w / 2, 460); g.font = '500 26px Inter'; g.fillText('90° SOUTH · 2026', w / 2, 505); for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(rnd() * w, rnd() * 360, 2, 2); } });
bx(0.7, 1.0, 0.02, new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.6 }), -RX + 0.05, FL + 1.9, -31, ROOM).rotation.y = Math.PI / 2;
// north wall: a wide window (sill 0.9 m, head 2.9 m) with mullions and a faint glass
bx(12, 0.9, 0.2, wallM, 0, FL + 0.45, RZ1, ROOM); bx(12, 0.5, 0.2, wallM, 0, FL + 3.15, RZ1, ROOM);
for (let k = 0; k < 5; k++) bx(0.12, 2.0, 0.24, M('#3a3f46', { metalness: 0.5, roughness: 0.4 }), -5 + k * 2.5, FL + 1.9, RZ1, ROOM);
bx(12, 0.1, 0.5, M('#3a3f46'), 0, FL + 0.9, RZ1 + 0.1, ROOM);
const glass = mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshPhysicalMaterial({ color: '#cfe0f0', transparent: true, opacity: 0.08, roughness: 0.02, metalness: 0, envMapIntensity: 0.6 }), false, false); glass.position.set(0, FL + 1.9, RZ1 + 0.02); glass.rotation.y = Math.PI; ROOM.add(glass);
// frost on the glass (grows at night): a canvas of ferns at the edges
const frostTex = canvasTex(1024, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(235,245,255,.55)';
  for (let k = 0; k < 900; k++) { const e = rnd(); let x = e < 0.5 ? rnd() * w : (rnd() < 0.5 ? 0 : w), y = e < 0.5 ? (rnd() < 0.5 ? 0 : h) : rnd() * h; let a = Math.atan2(h / 2 - y, w / 2 - x) + R(-0.9, 0.9);
    g.lineWidth = R(0.5, 1.6); g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 12; s++) { x += Math.cos(a) * R(3, 9); y += Math.sin(a) * R(3, 9); a += R(-0.5, 0.5); g.lineTo(x, y); } g.stroke(); } });
const frost = mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false }), false, false); frost.position.set(0, FL + 1.9, RZ1 + 0.04); frost.rotation.y = Math.PI; ROOM.add(frost);
// ceiling light panels (emissive) + warm point lights
const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.2) });
const roomLights = [];
for (let k = 0; k < 5; k++) { bx(1.2, 0.04, 0.6, panelM, -2.6, FL + 3.37, -23 - k * 6, ROOM); bx(1.2, 0.04, 0.6, panelM, 2.6, FL + 3.37, -23 - k * 6, ROOM);
  const L = new THREE.PointLight(0xffd0a0, 14, 15, 1.4); L.position.set(0, FL + 3.0, -23 - k * 6); ROOM.add(L); roomLights.push(L); }
// two long tables, 23 chairs (one table seats 12, the other 11 — the whole winter crew), trays, mugs, a water dispenser, a TV, a calendar
const tableM = M('#c9b79a', { roughness: 0.6 }), chairM = M('#3e6a8a', { roughness: 0.7 }), legM = M('#5a5e64', { metalness: 0.6, roughness: 0.4 });
function chair(x, z, ry) { const g = grp(x, FL, z, ry, ROOM); bx(0.46, 0.06, 0.44, chairM, 0, 0.46, 0, g); bx(0.46, 0.45, 0.05, chairM, 0, 0.72, -0.2, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.03, 0.46, 0.03, legM, sx * 0.2, 0.23, sz * 0.19, g); return g; }
const CHAIRS = [];
[-2.2, 2.2].forEach((tx, ti) => { bx(1.1, 0.06, 13.5, tableM, tx, FL + 0.75, -34, ROOM); for (const sz of [-6.2, 6.2]) for (const sx of [-0.45, 0.45]) bx(0.05, 0.72, 0.05, legM, tx + sx, FL + 0.37, -34 + sz, ROOM);
  const n = ti ? 11 : 12; for (let k = 0; k < n; k++) { const side = k % 2 ? 1 : -1, j = Math.floor(k / 2); CHAIRS.push(chair(tx + side * 0.85, -29 - j * 1.8 - (ti && side > 0 ? 0.9 : 0), side > 0 ? -Math.PI / 2 : Math.PI / 2)); } });
for (let k = 0; k < 9; k++) { const m = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), M(pick(['#f2f2f0', '#c84a3a', '#3a6aa0', '#e8c040']))); m.position.set(pick([-2.4, -2.0, 2.0, 2.4]), FL + 0.83, -28.5 - k * 1.3); ROOM.add(m); }
{ const d = grp(-5.5, FL, -22, Math.PI / 2, ROOM); bx(0.4, 1.3, 0.4, M('#e8eaec'), 0, 0.65, 0, d); const bt = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 14), new THREE.MeshPhysicalMaterial({ color: '#8ac8f0', transparent: true, opacity: 0.5, roughness: 0.05 })); bt.position.y = 1.55; d.add(bt); }
const tvTex = canvasTex(512, 288, (g, w, h) => { g.fillStyle = '#06080c'; g.fillRect(0, 0, w, h); g.fillStyle = '#16304a'; g.fillRect(16, 16, w - 32, h - 32); g.fillStyle = '#cfe4ff'; g.font = '600 34px Inter'; g.textAlign = 'center'; g.fillText('NO SIGNAL', w / 2, h / 2 + 12); });
bx(1.6, 0.92, 0.06, new THREE.MeshBasicMaterial({ map: tvTex }), RX - 0.06, FL + 2.1, -27, ROOM).rotation.y = -Math.PI / 2;
// the weather screen on the side wall: −34.0 °C / 41 m/s
const wxTex = canvasTex(640, 400, (g, w, h) => { g.fillStyle = '#071018'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e3a52'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#6fa8d8'; g.font = '600 28px Inter'; g.fillText('OUTSIDE · SOUTH POLE', 34, 62); g.fillStyle = '#eaf4ff'; g.font = '300 140px Inter'; g.fillText('−104°F', 26, 222);
  g.fillStyle = '#9fd0ff'; g.font = '500 32px Inter'; g.fillText('WIND 12 mph · FEELS LIKE −148°F', 34, 296); g.fillStyle = '#ff6a50'; g.fillText('● STAY INSIDE', 34, 350); });
const wx = bx(1.1, 0.69, 0.04, new THREE.MeshBasicMaterial({ map: wxTex, color: new THREE.Color(1.4, 1.4, 1.4) }), -RX + 0.05, FL + 1.75, -45, ROOM); wx.rotation.y = Math.PI / 2;
// calendar with crossed days
const calTex = canvasTex(400, 520, (g, w, h) => { g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8322a'; g.fillRect(0, 0, w, 90); g.fillStyle = '#fff'; g.font = '700 54px Inter'; g.textAlign = 'center'; g.fillText('MARCH', w / 2, 66);
  g.fillStyle = '#333'; g.font = '500 30px Inter'; for (let d = 1; d <= 31; d++) { const c = (d + 3) % 7, r = Math.floor((d + 3) / 7); const x = 30 + c * 52, y = 150 + r * 70; g.fillText(d, x + 6, y); if (d < 5) { g.strokeStyle = '#c8322a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 14, y - 26); g.lineTo(x + 26, y + 8); g.stroke(); } } });
bx(0.5, 0.65, 0.02, new THREE.MeshBasicMaterial({ map: calTex }), -RX + 0.05, FL + 1.8, -24.5, ROOM).rotation.y = Math.PI / 2;
// the note on the table
const noteTex = canvasTex(512, 380, (g, w, h) => { g.fillStyle = '#fbf7ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9d6e8'; g.lineWidth = 2; for (let y = 70; y < h; y += 46) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
  g.fillStyle = '#20232a'; g.font = 'italic 500 46px "Source Serif 4"'; g.fillText('We all flew out.', 40, 110); g.fillText('See you in November!', 40, 200); g.font = 'italic 500 36px "Source Serif 4"'; g.fillText('— the crew', 250, 300); });
const note = mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.9 })); note.rotation.x = -Math.PI / 2; note.rotation.z = 0.25; note.position.set(-2.1, FL + 0.785, -44.5); ROOM.add(note);
const pen = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8).rotateZ(Math.PI / 2), M('#1a3a8a')); pen.position.set(-1.92, FL + 0.79, -44.38); pen.rotation.y = 0.4; ROOM.add(pen);
// the bunk room (a separate box far away; its window shows the polar night)
const BED = new THREE.Group(); BED.position.set(4000, 0, 0); pw.add(BED);
bx(4, 0.1, 4, floorM, 0, -0.05, 0, BED); bx(4, 0.1, 4, ceilM, 0, 2.7, 0, BED); bx(0.1, 2.7, 4, M('#d6dde4'), -2, 1.35, 0, BED); bx(0.1, 2.7, 4, M('#d6dde4'), 2, 1.35, 0, BED); bx(4, 2.7, 0.1, M('#d6dde4'), 0, 1.35, 2, BED);
bx(1.4, 1.0, 0.1, M('#d6dde4'), -1.3, 0.5, -2, BED); bx(1.4, 1.0, 0.1, M('#d6dde4'), 1.3, 0.5, -2, BED); bx(4, 1.0, 0.1, M('#d6dde4'), 0, 2.2, -2, BED); bx(1.2, 0.7, 0.1, M('#d6dde4'), -1.4, 1.35, -2, BED); bx(1.2, 0.7, 0.1, M('#d6dde4'), 1.4, 1.35, -2, BED);
const nightWin = mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.ShaderMaterial({ uniforms: { uT: skyU.uT }, vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){ vec3 c=mix(vec3(0.01,0.015,0.035), vec3(0.03,0.05,0.1), 1.0-vU.y); vec2 q=floor(vU*vec2(160.0,120.0)); float s=step(0.993,h(q)); c+=vec3(1.0)*s*(0.6+0.4*sin(uT*2.0+h(q)*30.0));
      c=mix(c, vec3(0.18,0.2,0.26), smoothstep(0.25,0.0,vU.y)*0.6); gl_FragColor=vec4(c*1.0,1.0); }` }), false, false); nightWin.position.set(0, 1.35, -2.02); BED.add(nightWin);
{ const b = grp(-0.9, 0, 0.6, 0, BED); bx(1.0, 0.45, 2.1, M('#6a5a4a'), 0, 0.22, 0, b); bx(0.95, 0.18, 2.0, M('#f0f0ec'), 0, 0.54, 0, b); bx(0.98, 0.12, 1.4, M('#2f5a40', { roughness: 0.95 }), 0, 0.66, 0.25, b); bx(0.6, 0.12, 0.35, M('#f4f4f0'), 0, 0.68, -0.75, b); }
const clockTex = canvasTex(512, 200, (g, w, h) => { g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3a2a'; g.font = '300 150px Inter'; g.textAlign = 'center'; g.fillText('03:12', w / 2, 152); });
{ const ns = grp(0.3, 0, -0.2, 0, BED); bx(0.45, 0.5, 0.4, M('#8a7058'), 0, 0.25, 0, ns); bx(0.22, 0.09, 0.08, M('#1a1a1a'), 0, 0.55, 0, ns); const cf = mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: clockTex, color: new THREE.Color(2.5, 2.5, 2.5) }), false, false); cf.position.set(0, 0.55, 0.042); ns.add(cf);
  const cl = new THREE.PointLight(0xff3020, 1.5, 2.5, 2); cl.position.set(0, 0.6, 0.2); ns.add(cl); }
const bedLight = new THREE.PointLight(0x7a9cff, 4, 6, 1.4); bedLight.position.set(0, 1.4, -1.3); BED.add(bedLight);
// ---- the robot vacuum: our companion (a disc with two LED 'eyes' that blink and a cyan ring light) ----
const BOT = new THREE.Group(); pw.add(BOT);
{ const body = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.085, 40), M('#2a2d33', { roughness: 0.35, metalness: 0.3 })); body.position.y = 0.05; BOT.add(body);
  const top = mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.012, 40), M('#15171b', { roughness: 0.15, metalness: 0.5 })); top.position.y = 0.098; BOT.add(top);
  const ring = mesh(new THREE.TorusGeometry(0.155, 0.006, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 2.6) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.093; BOT.add(ring); BOT.userData.ring = ring;
  const bump = mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.04, 40, 1, true, -1.2, 2.4), M('#4a4e56', { roughness: 0.5 })); bump.position.y = 0.04; BOT.add(bump);
  const eyes = []; for (const sx of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.8, 3.2) })); e.scale.set(1, 1.5, 0.5); e.position.set(sx * 0.045, 0.072, 0.168); BOT.add(e); eyes.push(e); } BOT.userData.eyes = eyes;
  const glowL = new THREE.PointLight(0x40e0ff, 0.35, 1.2, 2); glowL.position.set(0, 0.12, 0.12); BOT.add(glowL); }
function botAt(p, ry, t, blink = true) { BOT.position.copy(p); BOT.rotation.y = ry; const b = blink ? (Math.abs(Math.sin(t * 0.9)) > 0.985 ? 0.15 : 1) : 1; BOT.userData.eyes.forEach(e => e.scale.y = 1.5 * b); }
// ---- POV gloves (dark fleece liner gloves; red parka cuff) ----
function glove(side) { const g = new THREE.Group(), gm = M('#23262c', { roughness: 0.95 }), cuff = M('#b02a22', { roughness: 0.85 });
  const palm = mesh(new RoundedBoxGeometry(0.085, 0.1, 0.03, 3, 0.012), gm); palm.position.y = 0.05; g.add(palm);
  for (let k = 0; k < 4; k++) { const f = mesh(new THREE.CapsuleGeometry(0.0095, 0.05 + 0.012 * (k === 1 || k === 2 ? 1 : 0) - 0.008 * (k === 3), 4, 8), gm); f.position.set(-0.03 + k * 0.02, 0.128 + 0.006 * (k === 1 || k === 2), 0); g.add(f); }
  const th = mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), gm); th.position.set(side * 0.05, 0.05, 0.008); th.rotation.z = -side * 0.7; g.add(th);
  const wr = new THREE.Group(); g.add(wr); g.userData.wrist = wr; const cf = mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.14, 16), cuff); cf.position.y = -0.06; wr.add(cf); const sl = mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.42, 16), M('#c8322a', { roughness: 0.85 })); sl.position.y = -0.29; wr.add(sl);
  pw.add(g); return g; }
const GL = glove(-1), GR = glove(1);
// ---- the greenhouse (hydroponic food growth chamber): pink-white grow lights, racks of lettuce, tomato vines, herbs ----
const GH = new THREE.Group(); GH.position.set(6000, 0, 0); pw.add(GH);
bx(3.4, 0.1, 8, M('#d8dce0', { roughness: 0.4 }), 0, -0.05, 0, GH); bx(3.4, 0.1, 8, M('#e8eaec'), 0, 2.6, 0, GH); for (const sx of [-1, 1]) bx(0.1, 2.6, 8, M('#eef0f2', { roughness: 0.3, metalness: 0.2 }), sx * 1.7, 1.3, 0, GH); bx(3.4, 2.6, 0.1, M('#eef0f2'), 0, 1.3, -4, GH); bx(3.4, 2.6, 0.1, M('#eef0f2'), 0, 1.3, 4, GH);
const growM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 2.1) }), leafM = new THREE.MeshStandardMaterial({ color: '#5aa83a', roughness: 0.6, flatShading: true }), leafM2 = new THREE.MeshStandardMaterial({ color: '#8ac84a', roughness: 0.6, flatShading: true }), tomM = M('#d8321e', { roughness: 0.3 });
{ const lettuce = new THREE.IcosahedronGeometry(0.11, 1); const n = 2 * 4 * 22, im = new THREE.InstancedMesh(lettuce, leafM, n), im2 = new THREE.InstancedMesh(lettuce, leafM2, n); let k = 0;
  for (const sx of [-1, 1]) for (let r = 0; r < 4; r++) { bx(0.8, 0.04, 7.2, M('#b8bcc2', { metalness: 0.6, roughness: 0.4 }), sx * 1.2, 0.35 + r * 0.55, 0, GH); bx(0.7, 0.03, 7.0, growM, sx * 1.2, 0.35 + r * 0.55 + 0.48, 0, GH);
    for (const z of [-0.12, 0.12]) bx(0.02, 0.02, 7.2, M('#e0e4e8'), sx * 1.2 + z, 0.37 + r * 0.55, 0, GH);
    for (let j = 0; j < 22; j++) { const z = -3.4 + j * 0.32, y = 0.42 + r * 0.55; _ghO.position.set(6000 + sx * 1.2 + (hash(k) - 0.5) * 0.2, y, z); _ghO.rotation.set(hash(k * 3), hash(k * 5) * 3, 0); _ghO.scale.set(1, 0.7 + 0.3 * hash(k * 7), 1); _ghO.updateMatrix(); im.setMatrixAt(k, _ghO.matrix);
      _ghO.scale.multiplyScalar(0.7); _ghO.position.y += 0.04; _ghO.updateMatrix(); im2.setMatrixAt(k, _ghO.matrix); k++; } }
  im.castShadow = im2.castShadow = true; pw.add(im, im2);
  for (let v = 0; v < 6; v++) { const vx = -0.55 + (v % 3) * 0.55, vz = v < 3 ? 3.6 : -3.6; const st = mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.3, 5), M('#4a7a2a')); st.position.set(vx, 1.15, vz); GH.add(st);
    for (let l = 0; l < 14; l++) { const lf = mesh(new THREE.IcosahedronGeometry(0.09, 0), leafM); lf.scale.set(1.4, 0.4, 1); lf.position.set(vx + Math.cos(l * 2.4) * 0.15, 0.3 + l * 0.15, vz + Math.sin(l * 2.4) * 0.15); GH.add(lf); }
    for (let f = 0; f < 6; f++) { const tm = mesh(new THREE.SphereGeometry(0.045, 12, 8), tomM); tm.position.set(vx + Math.cos(f * 1.9) * 0.12, 0.6 + f * 0.25, vz + Math.sin(f * 1.9) * 0.12); GH.add(tm); } }
  for (let k2 = 0; k2 < 3; k2++) bx(2.8, 0.03, 0.25, growM, 0, 2.55, -2.5 + k2 * 2.5, GH); }
const ghL = new THREE.PointLight(0xffc8ec, 7, 8, 1.3); ghL.position.set(0, 2.2, 0); GH.add(ghL); const ghL2 = new THREE.PointLight(0xffd0f0, 8, 8, 1.3); ghL2.position.set(0, 2.2, -2.8); GH.add(ghL2);
// =================== timeline (62.5 s) ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const S = { PLANE: 0, AWAY: 3.5, SET: 8, HALL: 11.5, BOT: 15.5, BLIZ: 19.5, ROPE: 24.5, GH: 29.5, BED: 34, WX: 38.5, AUR: 42.5, SUN: 48.5, OUTS: 55, END: 58 };
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
const shake = (t, a) => V3(a * (Math.sin(t * 13.1) + 0.5 * Math.sin(t * 29.7)), a * (Math.sin(t * 11.3 + 1) + 0.5 * Math.sin(t * 23.9)), 0);
function sunDir(h) { return V3(SUNAZ.x, 0, SUNAZ.z).normalize().multiplyScalar(Math.sqrt(1 - h * h)).setY(h); }
// environment per shot: sun height, night, aurora, whiteout, window glow, flood lights, fog
function envAt(t) {
  let h = 0.02, night = 0, aur = 0, white = 0, glow = 0, flood = 0, fogC = '#a8b4cc', fogD = 0.00012, snow = 0, wind = 0;
  if (t < S.SET) { h = 0.12; glow = 0.3; }                                                     // February: the sun circles low all day
  else if (t < S.HALL) { const u = span(t, S.SET, S.HALL); h = lerp(0.012, -0.012, u); glow = lerp(0.6, 2.2, u); fogC = '#8a8aa8'; }   // the March sunset
  else if (t < S.BLIZ) { h = -0.12; night = 1; glow = 3; }
  else if (t < S.GH) { h = -0.2; night = 1; white = 0.85; glow = 3; flood = 1; fogC = '#2c3442'; fogD = 0.012; snow = 1; wind = 22; }
  else if (t < S.AUR) { h = -0.2; night = 1; glow = 3; }
  else if (t < S.SUN) { h = -0.2; night = 1; aur = smooth(S.AUR, S.AUR + 1.5, t); glow = 3; fogC = '#070a12'; fogD = 0.00004; }
  else if (t < S.OUTS) { const u = span(t, S.SUN, S.OUTS); h = lerp(-0.03, 0.0, ease(u)); night = 1 - smooth(0, 0.6, u) * 0.7; glow = 2.5; fogC = '#6a6a8a'; }
  else { const u = span(t, S.OUTS, S.END); h = lerp(0.003, 0.012, u); night = 0.25; glow = 2.2; fogC = '#9a8aa0'; }
  const sd = sunDir(h); skyU.uSun.value.copy(sd); skyU.uNight.value = night; skyU.uAur.value = aur; skyU.uWhite.value = white; skyU.uT.value = t;
  pSun.position.copy(sd).multiplyScalar(500); pSun.target.position.set(0, 0, 0); pSun.intensity = 2.4 * smooth(-0.02, 0.03, h); pSun.color.setHSL(0.07, h > 0.06 ? 0.5 : 1, h > 0.06 ? 0.8 : 0.6);
  pHemi.intensity = lerp(0.9, 0.09, night); pHemi.color.set(night > 0.5 ? '#3a4a78' : '#9fb4e0'); pMoon.intensity = 0.35 * night * (1 - white) + (aur > 0 ? 0.12 * aur : 0); pMoon.color.set(aur > 0 ? '#7ad8ff' : '#6a8cff');
  winGlow.emissiveIntensity = glow; FLOOD.forEach(L => L.intensity = 900 * flood); pw.fog.color.set(fogC); pw.fog.density = fogD;
  REDL.forEach((l, i) => l.visible = Math.sin(t * 3.1 + i) > -0.2); TURB.forEach((hb, i) => hb.rotation.z = t * (snow ? 3.2 : 0.6) + i);
  return { snow, wind, night };
}
const EYE = 1.62; let SNOWC = null;
function hideAll() { roomLights.forEach(L => L.intensity = 14); auroraFill.intensity = 0; GL.userData.wrist.rotation.set(0, 0, 0); GR.userData.wrist.rotation.set(0, 0, 0); SNOWC = null;
  heroIn.outer.visible = heroOut.outer.visible = false; GL.visible = GR.visible = false; BOT.visible = false; WEND[0].visible = true; frost.material.opacity = 0; PLANE.visible = planeCloud.visible = false; }
function gloveAt(g, cam, off, rot) { g.visible = true; g.position.copy(cam.localToWorld(off.clone())); g.quaternion.copy(cam.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z))); }
function handsOnGlass(p, t, lift = 0) { for (const [g, sx] of [[GL, -1], [GR, 1]]) { g.visible = true; g.position.set(p.x - 0.02 + sx * 0.15, FL + EYE - 0.24 - lift + 0.006 * Math.sin(t * 1.3 + sx), RZ1 + 0.1); g.rotation.set(0.08, 0, -sx * 0.22); g.userData.wrist.rotation.set(-1.05, 0, sx * 0.25); } }
const heroHead = () => (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0)));
// ---- shots ----
function shotAt(t) { hideAll(); const c = pCam; c.near = 0.05; c.far = 60000; dof(c, 1, 0);
  if (t < S.AWAY) { // POV at the mess-hall window: the last plane takes off across the snow
    WEND[0].visible = false; PLANE.visible = planeCloud.visible = true; planeAt(t, -0.4); const u = ease(span(t, 0, S.AWAY)); const p = V3(1.25 + 0.06 * u, FL + EYE, RZ1 + lerp(1.5, 1.05, u)).add(shake(t, 0.004));
    LOOKC(c, p, V3(p.x + 30 - 50 * u, FL + EYE - 4, -400), lerp(52, 46, u)); c.updateMatrixWorld(); handsOnGlass(p, t); frost.material.opacity = 0.15; dof(c, 0.9, 3); return 1.0; }
  if (t < S.SET) { // exterior: the plane climbs away over the station, the camera arcs and tilts after it
    PLANE.visible = planeCloud.visible = true; planeAt(t, -0.4); const u = ease(span(t, S.AWAY, S.SET));
    LOOKC(c, V3(lerp(14, 4, u), lerp(15, 21, u), lerp(95, 82, u)), PLANE.position.clone().add(V3(0, 4, 0)).lerp(V3(0, 8, 0), 0.35), lerp(48, 44, u)); c.near = 0.5; return 1.1; }
  if (t < S.HALL) { // the March sunset at the ceremonial pole; our hero watches it go
    heroBase(POLE.x - 1.4, POLE.z - 0.8, Math.atan2(SUNAZ.x, SUNAZ.z)); poseIdle(hero, t, 0); hero.face('sad', t); const u = ease(span(t, S.SET, S.HALL)); const hd = heroHead(); const hp = hero.outer.position;
    const perp = V3(-SUNAZ.z, 0, SUNAZ.x).normalize(); const p = hd.clone().add(perp.clone().multiplyScalar(lerp(2.6, 2.1, u))).add(V3(SUNAZ.x, 0, SUNAZ.z).multiplyScalar(lerp(-0.9, -0.5, u))).add(V3(0, lerp(-0.1, 0.05, u), 0)); LOOKC(c, p, hd.clone().add(V3(SUNAZ.x, -0.3, SUNAZ.z).multiplyScalar(0.35)), 44); dof(c, p.distanceTo(hd), 2.5); return 1.15; }
  if (t < S.BOT) { WEND[0].visible = false; // the empty mess hall: dolly along the tables to the note
    const u = ease(span(t, S.HALL, S.BOT)); const p = V3(lerp(-0.2, -1.6, u), FL + lerp(1.55, 1.15, u), lerp(-24, -43.4, u)); LOOKC(c, p, V3(-2.1, FL + 0.78, -44.5).lerp(V3(0, FL + 1.0, -50), 1 - u), lerp(50, 38, u));
    roomLights.forEach((L, i) => L.intensity = i === 3 || i === 4 ? 14 : 3); dof(c, p.distanceTo(V3(-2.1, FL + 0.78, -44.5)), lerp(2, 9, u)); return 0.8; }
  if (t < S.BLIZ) { WEND[0].visible = false; BOT.visible = true; // the robot vacuum rolls up to you; POV looking down, a glove reaches for it
    const tm = S.BOT + 2;
    if (t < tm) { const u = span(t, S.BOT, tm); const bp = V3(lerp(-0.3, 0.0, u), FL, lerp(-47.5, -41.3, ease(u))); botAt(bp, 0.15 * Math.sin(t * 2.5), t); const p = V3(0.25, FL + 0.14, lerp(-39.6, -39.9, u)); LOOKC(c, p, bp.clone().add(V3(0, 0.08, 0)), 44);
      roomLights.forEach((L, i) => L.intensity = i === 3 ? 6 : 2); dof(c, p.distanceTo(bp), 4); return 0.85; }
    const u = ease(span(t, tm, S.BLIZ)); const bp = V3(0, FL, -40.75); botAt(bp, 0.25 * Math.sin(t * 2) * (1 - u), t); const p = V3(0.0, FL + EYE, -40.2); LOOKC(c, p, V3(0, FL, -41.0), 58); c.updateMatrixWorld();
    gloveAt(GR, c, V3(0.14 - 0.06 * u, -0.34 + 0.08 * u, -0.62 - 0.25 * u), V3(-1.2 + 0.4 * u, 0.2, 0.15)); dof(c, 1.6, 3); return 1.0; }
  if (t < S.ROPE) { const tm = S.BLIZ + 2.5; if (t < tm) { // the blizzard in the polar night — the station in floodlights, snow streaks
      const u = span(t, S.BLIZ, tm); LOOKC(c, V3(lerp(-55, -48, u), 6, lerp(60, 52, u)).add(shake(t, 0.08)), V3(0, 8, 0), 52); c.near = 0.2; return 1.5; }
    WEND[0].visible = false; const u = span(t, tm, S.ROPE); const p = V3(1.6, FL + 1.45, RZ1 + 5.0 - 0.6 * u).add(shake(t, 0.006)); LOOKC(c, p, V3(0.6, FL + 1.7, RZ1 - 10), 50); frost.material.opacity = lerp(0.35, 0.8, u); SNOWC = V3(p.x, p.y, RZ1 - 27.5);
    roomLights.forEach((L, i) => L.intensity = (i > 2 ? 8 : 2) * (Math.sin(t * 37 + i) > 0.92 ? 0.3 : 1)); dof(c, 5, 2); return 0.85; }
  if (t < S.GH) { const tm = S.ROPE + 2.5; const dir = ROPE_B.clone().sub(ROPE_A).normalize(), side = V3(dir.z, 0, -dir.x);
    if (t < tm) { // our hero on the rope line, bent into the wind
      const u = span(t, S.ROPE, tm), k = 0.22 + 0.12 * u; const fp = ROPE_A.clone().lerp(ROPE_B, k); heroBase(fp.x + side.x * 0.45, fp.z + side.z * 0.45, Math.atan2(dir.x, dir.z)); poseWalk(hero, t * 0.9); hero.outer.rotation.x = 0.2;
      hero.arms[1].rotation.set(-0.6, 0, 0.35); hero.elbows[1].rotation.x = -0.5; hero.face('worried', t); const back = ROPE_A.clone().lerp(ROPE_B, k - 0.12);
      const p = back.add(side.clone().multiplyScalar(2.2)).add(V3(0, 2.0, 0)).add(shake(t, 0.05)); LOOKC(c, p, V3(hero.outer.position.x, 1.5, hero.outer.position.z), 42); dof(c, p.distanceTo(heroHead()), 2); return 1.6; }
    const u = span(t, tm, S.GH), k = 0.45 + 0.08 * u; const rp = ROPE_A.clone().lerp(ROPE_B, k);   // POV: your gloves on the rope, the next post vanishing in white
    const p = rp.clone().add(side.clone().multiplyScalar(0.35)).add(V3(0, 0.4 + EYE - 0.1, 0)).add(shake(t, 0.03)); LOOKC(c, p, rp.clone().add(dir.clone().multiplyScalar(8)).add(V3(0, 1.0, 0)), 56); c.updateMatrixWorld();
    GR.visible = true; GR.position.copy(rp).add(V3(0, 1.5, 0)).add(dir.clone().multiplyScalar(0.55)); GR.lookAt(GR.position.clone().add(side)); GR.rotateZ(Math.PI / 2); GR.rotateX(-0.3);
    GL.visible = true; GL.position.copy(rp).add(V3(0, 1.48, 0)).add(dir.clone().multiplyScalar(0.9)); GL.lookAt(GL.position.clone().add(side)); GL.rotateZ(Math.PI / 2); GL.rotateX(0.3); return 1.6; }
  if (t < S.BED) { // the greenhouse: our hero (hood down) walks between the lettuce racks, picks a tomato
    const u = ease(span(t, S.GH, S.BED)); heroBase(6000 + 0.05, lerp(1.6, 0.4, u), Math.PI, true); hero.outer.position.y = 0.95; poseWalk(hero, t * 0.8, 1 - smooth(0.6, 0.85, u)); hero.face(u > 0.7 ? 'happy' : 'neutral', t);
    if (u > 0.7) { const k = smooth(0.7, 0.9, u); hero.arms[1].rotation.set(-0.55 * k, 0, 0.25); hero.elbows[1].rotation.x = -0.9 * k; }
    const hd = heroHead(); const p = V3(6000 + lerp(0.55, 0.35, u), lerp(1.3, 1.5, u), lerp(-2.6, -1.4, u)); LOOKC(c, p, hd.clone().add(V3(0, -0.15, 0)), 40); dof(c, p.distanceTo(hd), 5); return 0.8; }
  if (t < S.WX) { // 3:12 AM, lying awake; the robot's eyes glow by the bed
    BOT.visible = true; botAt(V3(4000 - 0.1, 0, 0.0), Math.PI * 0.85, t); const u = ease(span(t, S.BED, S.WX)); const p = V3(4000 - 0.55 + 0.05 * u, 0.93, 0.6 - 0.08 * u); const lk = V3(4000.3, 0.55, -0.16).lerp(V3(4000 - 0.1, 0.1, 0.0), smooth(0.55, 0.95, u)); LOOKC(c, p, lk, 36);
    dof(c, p.distanceTo(lk), 6); return 1.4; }
  if (t < S.AUR) { // the weather screen: −104 °F
    WEND[0].visible = false; frost.material.opacity = 0.9; const u = ease(span(t, S.WX, S.AUR)); const p = V3(lerp(-3.2, -4.6, u), FL + 1.72, lerp(-42.8, -44.4, u)); LOOKC(c, p, V3(-RX, FL + 1.75, -45), lerp(44, 36, u));
    roomLights.forEach((L, i) => L.intensity = i === 4 ? 4 : 2); dof(c, p.distanceTo(V3(-RX, FL + 1.75, -45)), 6); return 0.9; }
  if (t < S.SUN) { // the southern lights: our hero stands on the snow, the camera cranes up from low behind him to the sky
    heroBase(-20, -95, Math.PI * 0.95); poseIdle(hero, t, 0); hero.head.rotation.x = -0.35 * smooth(S.AUR, S.AUR + 2, t); hero.face('surprised', t); auroraFill.intensity = 35; pMoon.intensity = 0.12; const u = ease(span(t, S.AUR, S.SUN));
    LOOKC(c, V3(-17.5, lerp(1.0, 4.5, u), -88 + 2 * u), V3(-21, lerp(2.0, 16, u), -110), lerp(50, 64, u)); c.near = 0.1; dof(c, 7.5, lerp(2.5, 0, u)); return 1.9; }
  if (t < S.OUTS) { // D-0: the same window — a gold line on the horizon; the robot at your feet
    WEND[0].visible = false; const u = ease(span(t, S.SUN, S.OUTS)); const p = V3(1.25, FL + EYE, RZ1 + lerp(1.6, 1.1, u)).add(shake(t, 0.003)); LOOKC(c, p, V3(p.x - 8, FL + EYE - 2.5, -400), lerp(48, 44, u)); c.updateMatrixWorld();
    handsOnGlass(p, t, lerp(0.12, 0, smooth(0.1, 0.5, u))); BOT.visible = true; botAt(V3(1.6, FL, RZ1 + 0.7), Math.PI * 1.1, t); frost.material.opacity = lerp(0.6, 0.15, u); dof(c, 0.95, 2.5); return 1.1; }
  // outside: the first sun in six months over the plateau; our hero at the pole, the camera arcs round to the sun
  heroBase(POLE.x - 1.4, POLE.z - 0.8, Math.atan2(SUNAZ.x, SUNAZ.z)); poseIdle(hero, t, 0); hero.face(t < S.OUTS + 1.2 ? 'surprised' : 'happy', t); hero.head.rotation.x = -0.12;
  const u = ease(span(t, S.OUTS, S.END)); const hd = heroHead(), sun = V3(SUNAZ.x, 0, SUNAZ.z).normalize(), perp = V3(-sun.z, 0, sun.x); const p = hd.clone().add(sun.clone().multiplyScalar(lerp(2.6, 2.0, u))).add(perp.clone().multiplyScalar(lerp(0.9, 0.5, u))).add(V3(0, lerp(-0.25, -0.1, u), 0));
  LOOKC(c, p, hd.clone().add(V3(0, -0.12, 0)), 42); dof(c, p.distanceTo(hd), 2.5); return 1.1;
}
// ---- text (series style: title fades, captions pop) ----
const CAPS = [[0.2, 3.4, 'The last plane just left.'], [3.6, 7.9, 'The next one lands in <b>November</b>.'], [8.1, 11.4, 'Next month, the sun sets.<br>For <b>6 months</b>.'], [11.6, 15.4, 'Everyone else is gone.<br>It’s just you.'],
  [15.6, 19.4, 'Dogs are banned in Antarctica since 1994.<br>So this is your crew.'], [19.6, 24.4, 'Gusts up to <b>54 mph</b>.'], [24.6, 29.4, 'Some days you can’t see<br>a <b>quarter mile</b>.'],
  [29.6, 33.9, 'The greenhouse: the only<br><b>fresh food</b> all winter.'], [34.1, 38.4, 'No sunrise. No sunset.<br>Your sleep falls apart.'], [38.6, 42.4, 'Outside: below <b>−100°F</b>.'], [42.8, 48.4, 'But you get this.<br>The <b>southern lights</b>.'],
  [48.8, 54.9, '6 months later…'], [55.1, 57.9, 'The sun is <b>back</b>.']];
const DAY = t => t < S.SET ? 219 : t < S.HALL ? 186 : t < S.BLIZ ? 180 : t < S.GH ? 150 : t < S.BED ? 120 : t < S.WX ? 90 : t < S.AUR ? 75 : t < S.SUN ? 60 : Math.max(0, 3 - Math.floor(span(t, S.SUN + 0.3, S.SUN + 2.6) * 3.999));
const DUMP = [S.SET, S.HALL, S.BLIZ, S.GH, S.BED, S.WX, S.AUR, S.SUN + 0.3, S.SUN + 0.88, S.SUN + 1.45, S.SUN + 2.03];
const pop = (t, a, d) => 1 + 0.08 * Math.max(0, 1 - (t - a) / d) * (t >= a ? 1 : 0);
function text(t) {
  $('title').style.opacity = smooth(0.1, 0.5, t) * (1 - smooth(3.0, 3.4, t));
  const d = DAY(t); $('stat').innerHTML = '<b></b>SUNRISE IN'; $('val').textContent = d === 0 ? 'TODAY' : d + (d === 1 ? ' DAY' : ' DAYS'); $('sub').textContent = 'SOUTH POLE · 90°S · 9,300 FT';
  let pp = 0; for (const k of DUMP) pp += Math.max(0, 1 - Math.abs(t - k - 0.08) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pp})`; $('val').style.color = d === 0 ? '#ffb048' : '#fff';
  $('hud').style.opacity = smooth(3.4, 3.8, t) * (1 - smooth(S.END - 0.4, S.END, t));
  const cp = CAPS.find(([a, b]) => t >= a && t < b), el = $('cap'); el.innerHTML = cp ? cp[2] : ''; el.style.opacity = cp ? 1 - smooth(cp[1] - 0.15, cp[1], t) : 0; el.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  $('end').style.opacity = smooth(S.END, S.END + 0.5, t); $('endT').style.opacity = smooth(S.END + 0.3, S.END + 0.9, t); $('endS').style.opacity = smooth(S.END + 0.8, S.END + 1.4, t);
}
// ---- render: GTAO on the indoor shots, depth of field from the depth buffer, sub-frame motion blur on the fast shots, a rim light that follows the hero ----
const DOFP = { f: 2, a: 0 }; function dof(cam, focus, amt) { DOFP.f = focus; DOFP.a = amt; }
const rim = new THREE.PointLight(0xcfe0ff, 0, 6, 1.5); pw.add(rim);
const AOP = new GTAOPass(pw, pCam, W / 2, H / 2); AOP.renderToScreen = false; AOP.blendIntensity = 1.0;
AOP.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); AOP.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const RTD = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
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
const SHOT_T = Object.values(S).sort((a, b) => a - b);
const shotStart = t => { let s0 = 0; for (const k of SHOT_T) if (t >= k) s0 = k; return Math.max(s0, [S.BOT + 2, S.BLIZ + 2.5, S.ROPE + 2.5].filter(k => t >= k).pop() || 0); };
const INDOOR = t => (t >= S.HALL && t < S.BLIZ) || (t >= S.BLIZ + 2.5 && t < S.ROPE) || (t >= S.GH && t < S.AUR);
const FAST = t => (t >= S.AWAY && t < S.SET) || (t >= S.BLIZ && t < S.BLIZ + 2.5) || (t >= S.ROPE && t < S.ROPE + 2.5);
function heroRim(t) { if (!heroIn.outer.visible && !heroOut.outer.visible) { rim.intensity = 0; return; } const hd = heroHead(), cp = pCam.position; const back = hd.clone().sub(cp).setY(0).normalize();
  rim.position.copy(hd).add(back.multiplyScalar(1.1)).add(V3(0, 0.45, 0)); rim.intensity = 9; rim.color.set(INDOOR(t) ? '#ffd8b0' : '#cfe0ff'); }
let lastExp = 1, lastDepth = null;
function aimShadow(near) { const sc = pSun.shadow.camera, r = near ? 7 : 120; if (sc.right !== r) { Object.assign(sc, { left: -r, right: r, top: r, bottom: -r }); sc.updateProjectionMatrix(); }
  pSun.shadow.normalBias = near ? 0.02 : 0.05; pSun.shadow.bias = near ? -0.0002 : -0.0005;
  if (near) { const hp = hero.outer.position; pSun.target.position.set(hp.x, 0, hp.z); pSun.position.copy(skyU.uSun.value).setY(Math.max(skyU.uSun.value.y, 0.25)).normalize().multiplyScalar(60).add(pSun.target.position); } }
function shoot(t, rt) { const env = envAt(t); lastExp = shotAt(t); aimShadow(hero.outer.visible); if (!INDOOR(t) && hero.outer.visible) { pCam.near = Math.max(pCam.near, 0.4); } heroRim(t); snowAt(t, pCam, env.wind, env.snow, SNOWC);
  if (INDOOR(t)) { pCam.far = 3000; pCam.near = 0.05; shootTo(RTS, pw, pCam); AOP.render(renderer, rt, RTS); lastDepth = AOP.depthTexture; }
  else { shootTo(RTD, pw, pCam); lastDepth = RTD.depthTexture; renderer.setRenderTarget(rt); accMat.uniforms.tSrc.value = RTD.texture; accMat.uniforms.uW.value = 1; renderer.setClearColor(0, 1); renderer.clear(); renderer.render(accSc, compCam); } }
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= S.END + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#120e16', 1); renderer.clear(); return true; }
  let src = RTA;
  if (FAST(t)) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const s0 = shotStart(t);
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(s0, t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(t, RTA); }
  else { shoot(t, RTA); if (DOFP.a > 0.01) { dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = lastDepth; dofMat.uniforms.uNear.value = pCam.near; dofMat.uniforms.uFar.value = pCam.far; dofMat.uniforms.uFocus.value = DOFP.f; dofMat.uniforms.uAmt.value = DOFP.a * 3;
      renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; } }
  let dip = 1; for (const k of [S.HALL, S.BLIZ, S.GH, S.BED, S.AUR, S.SUN, S.OUTS]) dip = Math.min(dip, smooth(0, 0.35, Math.abs(t - k)));
  const u = compMat.uniforms; u.tA.value = src.texture; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uT.value = t; u.uSepia.value = 0; u.uLook.value = 0.12; u.uTilt.value = 0;
  composite(0, lastExp * dip, 1); u.tA.value = RTA.texture; return true;
};
window.DBG = { heroIn, heroOut, THREE, pw, pCam, ST, ROOM, GL, GR, BOT, WEND, glass, frost }; window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
