import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// "What if today you met the love of your life?" (Nov 7 2026, US series look; head = copy of parts_mind/m_head.js). Cut to her TikTok sound (Benny Bellson "theclubrock", NOT in the repo): 118 BPM grid b(n)=1.93+0.50847n,
// bass drops out at 34.0 (the "it's her" moment), near silence 41.0–42.0, the beat returns at 42.1 (the life montage). Facts: reward system / dopamine (Ortigue 2010 meta-analysis),
// heart-rate + skin-conductance synchrony predicts attraction on blind dates (Prochazkova et al. 2022), cortisol higher when newly in love (Marazziti & Canale 2004).
// =================== timeline (s) ===================
const BEAT = 0.50847, bt = n => 1.93 + n * BEAT; const WAKE = 0, STREET = bt(8), CAFE = bt(20), OUT = bt(32), MEET = bt(48), BUMP = bt(56), MAGIC = bt(63), BRAIN = bt(65), HEART = bt(69), BUTTER = bt(73), HI = bt(77), LIFE = bt(79), ENDC = 59.0, T_END = 62.0;
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
// =================== SETS for "What if today you met the love of your life?" ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
const PMREM = new THREE.PMREMGenerator(renderer);
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18, env = 0.55 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const skyM = new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false }); sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), skyM));
  { const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyM)); sc.environment = PMREM.fromScene(es, 0.02, 1, 400).texture; sc.environmentIntensity = env; }
  sc.fog = new THREE.Fog(fog, near, far); const hm = new THREE.HemisphereLight(...hemi); sc.add(hm);
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 160 }); sc.add(s, s.target); sc.userData.sun = s; sc.userData.hemi = hm; sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D();
const WOODL = M('#a8784a', { roughness: 0.55 }), WOODD = M('#5a3a24', { roughness: 0.55 }), LINEN = M('#f2eee6', { roughness: 0.95 }), CREAM = M('#ece4d2', { roughness: 0.85 }), DARK = M('#15171b', { roughness: 0.5 }), BRASS = M('#c8a050', { roughness: 0.35, metalness: 0.8 });
const floorW = (() => { const t = canvasTex(512, 512, (g, w, h) => { for (let r = 0; r < 16; r++) { let x = -(r % 3) * 70; while (x < w) { const L = 120 + 90 * rnd(); g.fillStyle = `hsl(30,${30 + 12 * rnd()}%,${44 + 12 * rnd()}%)`; g.fillRect(x, r * 32, L - 2, 30); x += L; } } speckle(g, w, h, 12000, ['rgba(0,0,0,.06)', 'rgba(255,255,255,.04)'], 2); }, [3, 3]); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }); })();
function room(par, x0, w, d, h, wallC, floorM) { const g = grp(x0, 0, 0, 0, par); const wm = M(wallC, { roughness: 0.9 }); bx(w, 0.1, d, floorM, 0, -0.05, 0, g); bx(w, 0.1, d, M('#f6f3ec'), 0, h + 0.05, 0, g);
  bx(0.1, h, d, wm, -w / 2, h / 2, 0, g); bx(w, h, 0.1, wm, 0, h / 2, -d / 2, g); bx(w, h, 0.1, wm, 0, h / 2, d / 2, g); for (const sx of [-1, 1]) bx(0.04, 0.12, d, M('#f6f3ec'), sx * (w / 2 - 0.05), 0.06, 0, g); return { g, wm }; }
// a window in the +x wall of a room: bright sky pane + frame + dust-mote beam (sun comes through it)
function sunWindow(g, x, y, z, w, h, beamRot = 1.0) { bx(0.04, h, w, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.4, 2.1) }), x, y, z, g); bx(0.08, 0.06, w, M('#f6f3ec'), x - 0.02, y, z, g); bx(0.08, h, 0.06, M('#f6f3ec'), x - 0.02, y, z, g);
  bx(0.14, 0.08, w + 0.2, M('#f6f3ec'), x - 0.06, y - h / 2 - 0.04, z, g); for (const s of [-1, 1]) bx(0.1, h + 0.5, 0.4, M('#e8d8c0', { roughness: 1 }), x - 0.1, y + 0.1, z + s * (w / 2 + 0.25), g);
  const beam = mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.8, 5.0, 4, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe8c0', transparent: true, opacity: 0.02, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), false, false); beam.rotation.set(0, 0, beamRot); beam.position.set(x - 1.9, y - 0.9, z); g.add(beam);
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 300 * 3 }, (_, i) => [x - 0.5 - 3 * rnd(), y - 1.6 + 2.2 * rnd(), z + (rnd() - 0.5) * w][i % 3]), 3)), new THREE.PointsMaterial({ color: '#fff4dc', size: 0.012, transparent: true, opacity: 0.7, depthWrite: false })); g.add(motes); return beam; }
// ======================= 1) HOME: bedroom (x 0), bathroom (x 10), living room (x 20 — move-in boxes, the crib, years later the couch) =======================
const HOME = mkSet({ top: '#d8e4f0', bot: '#f6e8d0', fog: 0xf4ead8, near: 60, far: 400, hemi: [0xfff2e0, 0x8a7a60, 0.5], sun: [0xffd8a8, 3.2, V3(9, 6, 2)], shadow: 8, env: 0.4 });
const HL = {};
{ const { g } = room(HOME.sc, 0, 5, 5, 3.0, '#d8cfc0', floorW); bx(3.0, 0.02, 2.2, M('#7a8a9a', { roughness: 1 }), -0.4, 0.01, 0.5, g);
  const bed = grp(-0.6, 0, -1.2, 0, g); bx(1.7, 0.35, 2.1, WOODL, 0, 0.22, 0, bed); bx(1.65, 0.22, 2.0, LINEN, 0, 0.5, 0, bed); bx(1.7, 0.1, 1.3, M('#4a6a8a', { roughness: 1 }), 0, 0.64, 0.35, bed); bx(1.7, 0.9, 0.08, WOODL, 0, 0.75, -1.05, bed);
  for (const x of [-0.4, 0.4]) bx(0.6, 0.14, 0.38, M('#fbfaf6'), x, 0.68, -0.72, bed);
  const ns = grp(0.6, 0, -1.9, 0, g); bx(0.45, 0.5, 0.4, WOODD, 0, 0.25, 0, ns); const clk = canvasTex(256, 128, (q, w, h) => { q.fillStyle = '#0b0b0d'; q.fillRect(0, 0, w, h); q.fillStyle = '#ff5a3a'; q.font = '300 96px Inter'; q.textAlign = 'center'; q.fillText('7:00', w / 2, 98); });
  bx(0.22, 0.1, 0.08, DARK, 0, 0.55, 0, ns); const cf = mesh(new THREE.PlaneGeometry(0.2, 0.08), new THREE.MeshBasicMaterial({ map: clk, color: new THREE.Color(2.2, 2.2, 2.2) }), false, false); cf.position.set(0, 0.55, 0.042); ns.add(cf); HL.clock = cf;
  const lamp = mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#f4ead0', emissive: '#ffd090', emissiveIntensity: 0.5, side: THREE.DoubleSide })); lamp.position.set(0.75, 0.82, -1.9); g.add(lamp);
  HL.beamBed = sunWindow(g, 2.45, 1.6, -0.2, 1.4, 1.7);
  for (let k = 0; k < 3; k++) { const pot = mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.18, 12), M('#c86a4a')); pot.position.set(2.2, 0.82, 0.8 + k * 0.3); g.add(pot); for (let j = 0; j < 6; j++) { const lf = mesh(new THREE.IcosahedronGeometry(0.07, 0), F_('#4a8a3a')); lf.scale.set(1, 1.6, 0.5); lf.position.set(2.2 + (hash(k * 9 + j) - 0.5) * 0.12, 0.98 + 0.06 * j, 0.8 + k * 0.3 + (hash(k + j) - 0.5) * 0.12); g.add(lf); } }
  bx(0.4, 0.82, 0.04, M('#f6f3ec'), 2.2, 0.41, 0.8 + 0.3, g).scale.set(0.5, 0.82, 1.2);
  const ps = canvasTex(256, 320, (q, w, h) => { const gr = q.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e8a060'); gr.addColorStop(1, '#3a4a7a'); q.fillStyle = gr; q.fillRect(0, 0, w, h); q.fillStyle = '#1a2440'; q.fillRect(0, h * 0.7, w, h * 0.3); }); bx(0.6, 0.8, 0.03, new THREE.MeshStandardMaterial({ map: ps, roughness: 0.6 }), -0.6, 1.95, -2.44, g);
  HL.bedL = new THREE.PointLight(0xffd8a8, 2.5, 6, 1.4); HL.bedL.position.set(-0.4, 2.6, 0.5); g.add(HL.bedL); }
{ const { g } = room(HOME.sc, 10, 3, 3, 2.8, '#e6ecef', M('#e0e4e6', { roughness: 0.3 })); for (let y = 0; y < 10; y++) for (let z = 0; z < 10; z++) bx(0.012, 0.13, 0.13, M(((y + z) % 2) ? '#f2f6f8' : '#e6eef2', { roughness: 0.2 }), -1.44, 0.75 + y * 0.14, -0.7 + z * 0.14, g);
  bx(0.5, 0.15, 0.7, M('#f8f8f8', { roughness: 0.15 }), -1.2, 0.85, 0, g); bx(0.45, 0.78, 0.6, WOODD, -1.2, 0.39, 0, g); const tap = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), M('#d8dce0', { metalness: 1, roughness: 0.1 })); tap.position.set(-1.38, 1.0, 0); g.add(tap);
  const mir = mesh(new THREE.PlaneGeometry(0.75, 0.9), new THREE.MeshStandardMaterial({ color: '#d8e4ec', metalness: 1, roughness: 0.04, envMapIntensity: 1.2 }), false, false); mir.rotation.y = Math.PI / 2; mir.position.set(-1.43, 1.65, 0); g.add(mir); bx(0.03, 0.96, 0.81, BRASS, -1.445, 1.65, 0, g);
  const brush = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.19, 6), M('#3a8ad8')); HOME.sc.add(brush); HL.brush = brush;
  HL.bath = new THREE.PointLight(0xfff0e0, 4, 5, 1.4); HL.bath.position.set(-0.6, 2.4, 0); g.add(HL.bath); }
const LIV = (() => { const { g } = room(HOME.sc, 20, 7, 6, 3.0, '#d4c8b4', floorW); bx(3.4, 0.02, 2.4, M('#9a6a4a', { roughness: 1 }), 0, 0.01, 0.4, g);
  HL.beamLiv = sunWindow(g, 3.45, 1.6, -0.6, 1.8, 1.8, 1.1);
  const couch = grp(-0.6, 0, -1.6, 0, g); rb(2.4, 0.42, 0.9, M('#5a6e8a', { roughness: 1 }), 0, 0.3, 0, couch, 0.08); rb(2.4, 0.6, 0.25, M('#5a6e8a', { roughness: 1 }), 0, 0.65, -0.35, couch, 0.08); for (const sx of [-1, 1]) rb(0.25, 0.55, 0.9, M('#5a6e8a', { roughness: 1 }), sx * 1.15, 0.42, 0, couch, 0.08);
  for (const x of [-0.6, 0.0, 0.6]) rb(0.5, 0.4, 0.14, M(pick(['#c8a050', '#d8c8b0', '#8a4a3a'])), x, 0.68, -0.22, couch, 0.06);
  bx(1.1, 0.06, 0.6, WOODD, -0.6, 0.42, -0.4, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.04, 0.4, 0.04, WOODD, -0.6 + sx * 0.5, 0.2, -0.4 + sz * 0.25, g);
  const sh = grp(-3.4, 0, 0.6, Math.PI / 2, g); for (let r = 0; r < 4; r++) { bx(1.6, 0.04, 0.3, WOODD, 0, 0.4 + r * 0.5, 0, sh); let x = -0.75; while (x < 0.75) { const w = R(0.03, 0.07), h = R(0.2, 0.32); bx(w, h, 0.22, M(pick(['#8a2a2a', '#2a4a7a', '#3a6a3a', '#c8a040', '#ddd'])), x + w / 2, 0.42 + r * 0.5 + h / 2, 0, sh); x += w + 0.005; } }
  const fl = grp(1.9, 0, -2.4, 0, g); const st = mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8), BRASS); st.position.y = 0.75; fl.add(st); const shd = mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#f4ead0', emissive: '#ffc880', emissiveIntensity: 0.9, side: THREE.DoubleSide })); shd.position.y = 1.55; fl.add(shd);
  HL.livL = new THREE.PointLight(0xffc890, 4, 6, 1.4); HL.livL.position.set(1.9, 1.6, -2.2); g.add(HL.livL); HL.livL2 = new THREE.PointLight(0xffe0c0, 3, 8, 1.4); HL.livL2.position.set(0, 2.7, 0.5); g.add(HL.livL2);
  // photo frames that fill up over the years
  HL.frames = []; for (let k = 0; k < 6; k++) { const f = grp(-1.6 + k * 0.5, 1.55 + (k % 2) * 0.35, -2.94, 0, g); bx(0.36, 0.28, 0.03, WOODD, 0, 0, 0, f); bx(0.3, 0.22, 0.01, M(pick(['#e8c8a0', '#a8c8e8', '#c8e0a8', '#f0d0c0'])), 0, 0, 0.02, f); HL.frames.push(f); }
  // the move-in boxes, the crib
  HL.boxes = grp(0, 0, 0, 0, g); [[0.8, 0.5, 0.6], [1.3, 0.3, 0.9], [0.9, 1.0, 1.2], [1.6, 0.6, 0.0], [0.6, 0.5, 1.6]].forEach(([x, s, z], i) => { const b = rb(0.55, 0.42, 0.45, M('#b88a5a', { roughness: 0.9 }), x, 0.21, z, HL.boxes, 0.02); b.rotation.y = hash(i) - 0.5; bx(0.56, 0.02, 0.06, M('#c8b890'), x, 0.425, z, HL.boxes).rotation.y = b.rotation.y; if (i === 2) { rb(0.5, 0.36, 0.4, M('#c09060'), x, 0.6, z, HL.boxes, 0.02); } });
  HL.crib = grp(1.6, 0, 0.3, 0.3, g); bx(1.0, 0.05, 0.6, LINEN, 0, 0.42, 0, HL.crib); for (let k = 0; k < 11; k++) for (const sz of [-1, 1]) { const b = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), M('#f8f6f0')); b.position.set(-0.48 + k * 0.096, 0.65, sz * 0.3); HL.crib.add(b); } for (const sz of [-1, 1]) bx(1.02, 0.04, 0.04, M('#f8f6f0'), 0, 0.95, sz * 0.3, HL.crib);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.04, 0.95, 0.04, M('#f8f6f0'), sx * 0.5, 0.47, sz * 0.3, HL.crib);
  return g; })();
const BABY = new THREE.Group(); { const bl = mesh(new THREE.CapsuleGeometry(0.11, 0.22, 6, 12), M('#f4e4c8', { roughness: 1 })); bl.rotation.z = Math.PI / 2; BABY.add(bl); const hd = mesh(new THREE.SphereGeometry(0.075, 14, 10), M('#f0c8a8')); hd.position.set(0.21, 0.02, 0); BABY.add(hd); const hat = mesh(new THREE.SphereGeometry(0.078, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#f8c8d8')); hat.position.copy(hd.position); hat.rotation.z = -1.2; BABY.add(hat); HOME.sc.add(BABY); }
// ======================= 2) THE STREET: a West Village–style brownstone block, golden morning, the cafe front =======================
const STR = mkSet({ top: '#7aa6d8', bot: '#f8d8b0', fog: 0xf0d8b8, near: 30, far: 220, hemi: [0xfff0e0, 0x6a5a48, 0.75], sun: [0xffc890, 3.4, V3(-30, 14, -24)], shadow: 22, env: 0.5 });
const SL = {};
{ const sc = STR.sc; gplane(sc, 400, 400, M('#3a3c42', { roughness: 0.9 }), 0, 0, -0.02); const walkM = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b8b0a4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(60,50,40,.35)'; g.lineWidth = 2; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke(); g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, h); g.stroke(); } speckle(g, w, h, 6000, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.06)'], 2); }, [2, 60]);
  for (const sx of [-1, 1]) { const w = mesh(new THREE.BoxGeometry(4, 0.16, 240), new THREE.MeshStandardMaterial({ map: walkM, roughness: 0.85 })); w.position.set(sx * 6, 0.08, 0); w.receiveShadow = true; sc.add(w); bx(0.2, 0.17, 240, M('#8a8680'), sx * 4.05, 0.085, 0, sc); }
  const fac = (x, z, side, i) => { const g = grp(x, 0, z, side > 0 ? -Math.PI / 2 : Math.PI / 2, sc); const col = pick(['#8a4a34', '#7a3e2e', '#9a5a40', '#6a3a2a', '#a8826a']); const h = 12 + 4 * hash(i); bx(7.6, h, 10, M(col, { roughness: 0.9 }), 0, h / 2, -5, g);
    for (let fl = 0; fl < 4; fl++) for (let c = 0; c < 3; c++) { const wx = -2.4 + c * 2.4, wy = 2.6 + fl * 3.0; if (wy > h - 1) continue; bx(1.1, 1.8, 0.1, new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.1, metalness: 0.4, emissive: '#ffcf90', emissiveIntensity: hash(i * 7 + fl * 3 + c) < 0.2 ? 0.5 : 0 }), wx, wy, 0.02, g); bx(1.35, 0.18, 0.25, M('#d8cfc0'), wx, wy + 1.0, 0.1, g); bx(1.3, 0.12, 0.3, M('#d8cfc0'), wx, wy - 0.95, 0.12, g); }
    bx(7.8, 0.5, 0.5, M('#d8cfc0'), 0, h - 0.25, 0.15, g); const stoop = grp(-2.2, 0, 1.2, 0, g); for (let s = 0; s < 6; s++) bx(1.6, 0.2, 0.32, M('#8a7a6a'), 0, 0.1 + s * 0.2, 1.0 - s * 0.32, stoop); bx(1.1, 2.2, 0.1, WOODD, 0, 2.3, -0.9, stoop);
    for (const sx of [-1, 1]) { bx(0.05, 1.0, 2.0, DARK, sx * 0.85, 1.0, 0.0, stoop).rotation.x = 0.55; } return g; };
  for (let k = -9; k <= 9; k++) for (const side of [-1, 1]) { if (side < 0 && k === 0) continue; fac(side * 10.0, k * 7.8, side, k * 2 + (side > 0 ? 1 : 0)); }
  // the cafe front (left side, k = 0): big window, awning, warm interior glow, sign, bistro tables
  const cf = grp(-10, 0, 0, Math.PI / 2, sc); bx(7.6, 13, 10, M('#2f3a34', { roughness: 0.8 }), 0, 6.5, -5, cf); bx(6.0, 2.6, 0.1, new THREE.MeshStandardMaterial({ color: '#3a2a1a', emissive: '#ffb060', emissiveIntensity: 0.6, roughness: 0.1 }), -0.4, 1.9, 0.02, cf);
  for (let k = 0; k < 6; k++) bx(0.06, 2.6, 0.12, BRASS, -3.4 + k * 1.2, 1.9, 0.06, cf); const aw = mesh(new THREE.BoxGeometry(7.2, 0.08, 1.6), canvasTex ? new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (g, w, h) => { for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#f4efe6' : '#2f5a46'; g.fillRect(k * 16, 0, 16, h); } }), roughness: 0.9 }) : null); aw.position.set(0, 3.6, 0.8); aw.rotation.x = 0.35; cf.add(aw);
  const sign = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#1e2a24'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8d8b0'; g.font = 'italic 600 72px "Source Serif 4"'; g.textAlign = 'center'; g.fillText('Corner Café', w / 2, 90); }); bx(3.2, 0.8, 0.08, new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), 0, 4.6, 0.06, cf);
  bx(1.1, 2.4, 0.1, M('#2a1e16'), 3.0, 1.2, 0.03, cf); for (const x of [-2.6, 1.2]) { const tb = grp(x, 0, 1.6, 0, cf); const top = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 18), M('#e8e4dc', { metalness: 0.3 })); top.position.y = 0.74; tb.add(top); const lg = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.74, 8), DARK); lg.position.y = 0.37; tb.add(lg);
    for (const s of [-1, 1]) { const ch = grp(s * 0.55, 0, 0, 0, tb); bx(0.36, 0.04, 0.36, M('#2f5a46'), 0, 0.46, 0, ch); bx(0.36, 0.45, 0.03, M('#2f5a46'), 0, 0.7, s * 0.17, ch); } }
  SL.cafeL = new THREE.PointLight(0xffb060, 6, 6, 1.4); SL.cafeL.position.set(-8.5, 2.0, 0); sc.add(SL.cafeL);
  // trees, lamps, parked cars, a hydrant
  const treeM = F_('#5a8a34'), treeM2 = F_('#c8a040'), trunkM = F_('#4a3424'); for (let k = -12; k <= 12; k++) for (const sx of [-1, 1]) { if ((k + (sx > 0 ? 1 : 0)) % 2) continue; const tg = grp(sx * 4.9, 0, k * 6.5 + 2, 0, sc); const tr = mesh(new THREE.CylinderGeometry(0.1, 0.16, 3.2, 7), trunkM); tr.position.y = 1.6; tg.add(tr); for (let j = 0; j < 5; j++) { const c = mesh(new THREE.IcosahedronGeometry(0.9 + 0.5 * hash(k * 7 + j), 0), hash(k + j * 3) < 0.3 ? treeM2 : treeM); c.position.set((hash(k + j) - 0.5) * 1.6, 3.6 + j * 0.45, (hash(k * 2 + j) - 0.5) * 1.6); tg.add(c); } }
  for (let k = -6; k <= 6; k++) for (const sx of [-1, 1]) { const lp = grp(sx * 4.6, 0, k * 13 + 6, 0, sc); const p = mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.2, 8), DARK); p.position.y = 2.1; lp.add(p); const hd = mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: '#ffd090', emissiveIntensity: 0.4 })); hd.position.y = 4.3; lp.add(hd); }
  for (let k = -10; k <= 10; k++) for (const sx of [-1, 1]) { if (hash(k * 3 + sx) < 0.3) continue; const car = makeCar(pick(['#c8322a', '#2a4f8a', '#e8e4dc', '#3a3c42', '#5a7a5a', '#f2c42a']), { L: 4.3 }); car.position.set(sx * 2.9, 0, k * 6.2 + 3); car.rotation.y = sx > 0 ? Math.PI : 0; sc.add(car); }
  const hyd = grp(-4.3, 0.16, -3, 0, sc); const hb = mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 10), M('#c8322a')); hb.position.y = 0.3; hyd.add(hb); }
// pedestrians: the cheap people.js persons, walking both ways on the sidewalks
const PEDS = []; for (let i = 0; i < 14; i++) { const P = makePerson(rnd, { skin: pick(['#f0c8a8', '#c89068', '#8a5a3a', '#e9b98f']), top: pick(['#3a4a6a', '#8a3a3a', '#d8c8a8', '#2f5a46', '#5a5a62', '#c8a040']), bottom: pick(['#2a2e38', '#3d5f8f', '#5a4a3a']), hair: pick(['#1a1410', '#5a3a1e', '#c8a060']) }); STR.sc.add(P.outer); PEDS.push({ P, x: (hash(i) < 0.5 ? -1 : 1) * (5.2 + 1.4 * hash(i * 3)), z0: -60 + 120 * hash(i * 5), dir: hash(i * 7) < 0.5 ? -1 : 1, sp: 1.1 + 0.3 * hash(i * 9) }); }
function pedsAt(t, avoid) { for (const w of PEDS) { const z = wrapR(w.z0 + w.dir * w.sp * t, -60, 60); w.P.outer.position.set(w.x, 0.16, z); w.P.outer.rotation.y = w.dir > 0 ? 0 : Math.PI; poseWalk(w.P, t * 6 * w.sp + w.z0, 1); w.P.outer.visible = !avoid || avoid.every(a => Math.hypot(a.x - w.x, a.z - z) > 1.6); } }
// the collision props: his coffee cup, her books
const CUP = new THREE.Group(); { const c = mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.14, 16), M('#f4efe6', { roughness: 0.7 })); CUP.add(c); const sl = mesh(new THREE.CylinderGeometry(0.047, 0.042, 0.05, 16, 1, true), M('#8a5a34')); sl.position.y = -0.01; CUP.add(sl); const lid = mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.015, 16), M('#f8f8f6')); lid.position.y = 0.075; CUP.add(lid); STR.sc.add(CUP); }
const BOOKS = [0, 1, 2].map(i => { const b = rb(0.16, 0.035, 0.23, M(['#8a2a2a', '#2a4a7a', '#c8a040'][i], { roughness: 0.7 }), 0, 0, 0, STR.sc, 0.006); return b; });
const SPLASH = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(160 * 3), 3)), new THREE.PointsMaterial({ color: '#6a3e1e', size: 0.025, transparent: true, opacity: 0.9, depthWrite: false })); SPLASH.frustumCulled = false; STR.sc.add(SPLASH);
// ======================= 3) THE CAFE inside (also the first date at night) =======================
const CAFS = mkSet({ top: '#d8c8b0', bot: '#f4e4c8', fog: 0xf0e0c8, near: 40, far: 200, hemi: [0xfff0e0, 0x6a5040, 0.35], sun: [0xffd0a0, 2.0, V3(-6, 8, 6)], shadow: 8, env: 0.35 });
const CL = {};
{ const { g } = room(CAFS.sc, 0, 8, 7, 3.4, '#3a4a40', floorW); for (let y = 0; y < 8; y++) for (let x = 0; x < 18; x++) bx(0.21, 0.1, 0.02, M(((x + y) % 2) ? '#f4efe6' : '#e8e2d6', { roughness: 0.3 }), -3.6 + x * 0.22 + (y % 2) * 0.11, 1.1 + y * 0.11, -3.43, g);
  const ct = grp(0, 0, -2.2, 0, g); rb(5.4, 1.05, 0.7, M('#5a3a24', { roughness: 0.5 }), 0, 0.52, 0, ct, 0.03); bx(5.5, 0.05, 0.8, M('#e8e4dc', { roughness: 0.2 }), 0, 1.07, 0, ct);
  const esp = grp(-1.2, 1.1, -0.1, 0, ct); rb(0.8, 0.45, 0.45, M('#c8ccd2', { metalness: 1, roughness: 0.15 }), 0, 0.23, 0, esp, 0.04); for (const x of [-0.2, 0.2]) { const gh = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), DARK); gh.position.set(x, 0.05, 0.2); esp.add(gh); }
  const steam = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 120 * 3 }, (_, i) => [(rnd() - 0.5) * 0.2, 0.5 + rnd() * 0.6, 0.1 + (rnd() - 0.5) * 0.1][i % 3]), 3)), new THREE.PointsMaterial({ color: '#ffffff', size: 0.03, transparent: true, opacity: 0.25, depthWrite: false })); esp.add(steam); CL.steam = steam;
  for (let k = 0; k < 6; k++) { const pc = mesh(new THREE.TorusGeometry(0.06, 0.03, 8, 14), M(pick(['#c8823a', '#8a5a2a', '#e8c070']))); pc.rotation.x = Math.PI / 2; pc.position.set(1.0 + (k % 3) * 0.22, 1.14, -0.05 + Math.floor(k / 3) * 0.18); ct.add(pc); }
  const menu = canvasTex(512, 300, (q, w, h) => { q.fillStyle = '#1a1e1c'; q.fillRect(0, 0, w, h); q.fillStyle = '#f2ead8'; q.font = 'italic 600 44px "Source Serif 4"'; q.fillText('Coffee', 30, 60); q.font = '500 30px Inter'; ['Espresso   3.50', 'Latte        5.25', 'Cold brew  4.75', 'Croissant  3.95'].forEach((s, i) => q.fillText(s, 30, 120 + i * 44)); });
  bx(2.2, 1.3, 0.05, new THREE.MeshStandardMaterial({ map: menu, roughness: 0.6, emissive: '#ffffff', emissiveMap: menu, emissiveIntensity: 0.35 }), 0.6, 2.55, -3.4, g);
  CL.pend = []; for (let k = 0; k < 4; k++) { const x = -2.4 + k * 1.6; const c = mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.0, 4), DARK); c.position.set(x, 2.9, -1.4); g.add(c); const sh = mesh(new THREE.ConeGeometry(0.16, 0.2, 16, 1, true), M('#c8a050', { metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); sh.position.set(x, 2.35, -1.4); g.add(sh);
    const bulb = mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.8, 1.4) })); bulb.position.set(x, 2.25, -1.4); g.add(bulb); const L = new THREE.PointLight(0xffb870, 3.5, 5, 1.5); L.position.set(x, 2.1, -1.4); g.add(L); CL.pend.push(L); }
  // the date table by the window (night)
  const tb = grp(2.2, 0, 1.4, 0, g); const top = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 20), M('#3a2a1e', { roughness: 0.4 })); top.position.y = 0.75; tb.add(top); const lg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), DARK); lg.position.y = 0.37; tb.add(lg);
  const cnd = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), new THREE.MeshPhysicalMaterial({ color: '#f0c070', transparent: true, opacity: 0.6 })); cnd.position.y = 0.8; tb.add(cnd); const fl = mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1.2) })); fl.scale.y = 2; fl.position.y = 0.86; tb.add(fl);
  CL.candle = new THREE.PointLight(0xff9a4a, 0, 2.5, 1.6); CL.candle.position.set(2.2, 0.95, 1.4); g.add(CL.candle);
  for (const s of [-1, 1]) { const ch = grp(2.2 + s * 0.62, 0, 1.4, s > 0 ? -Math.PI / 2 : Math.PI / 2, g); bx(0.4, 0.05, 0.4, WOODD, 0, 0.46, 0, ch); bx(0.4, 0.5, 0.04, WOODD, 0, 0.72, -0.18, ch); }
  bx(0.04, 2.2, 3.0, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.3, 0.45) }), 3.94, 1.6, 1.2, g); CL.win = g.children[g.children.length - 1];
  for (let k = 0; k < 40; k++) { const b = mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(...pick([[3, 2, 1], [2.6, 2.2, 1.6], [3, 1.4, 0.8]])) })); b.position.set(4.2 + 3 * hash(k), 0.4 + 2.5 * hash(k * 3), -0.3 + 3 * hash(k * 5)); g.add(b); } }
const DATECUPS = [0, 1].map(i => { const c = mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.08, 14), M('#f8f6f0', { roughness: 0.3 })); CAFS.sc.add(c); return c; });
// ======================= 4) THE X-RAY: two glowing bodies in the dark; brain, hearts, butterflies =======================
const XR = mkSet({ top: '#04060c', bot: '#0a1020', fog: 0x060a14, near: 20, far: 120, hemi: [0x4a6aff, 0x000000, 0.05], sun: [0xffffff, 0, V3(0, 10, 5)], shadow: 4, env: 0.0 });
const XRM = new THREE.MeshStandardMaterial({ color: '#0a1830', emissive: '#3a8aff', emissiveIntensity: 0.55, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, roughness: 1 });
const XRM2 = XRM.clone(); XRM2.emissive = new THREE.Color('#ff6aa8');
function xrayBody(P, mat) { P.outer.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(() => mat) : mat; o.castShadow = false; } }); XR.sc.add(P.outer); return P; }
const BRAINS = [0, 1].map(i => { const g = new THREE.Group(); for (let k = 0; k < 26; k++) { const b = mesh(new THREE.IcosahedronGeometry(0.03 + 0.02 * hash(k + i), 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }), false, false); const a = hash(k * 3) * 6.28, r = 0.04 + 0.04 * hash(k * 5); b.position.set(Math.cos(a) * r, (hash(k * 7) - 0.5) * 0.08, Math.sin(a) * r); g.add(b); } XR.sc.add(g); return g; });
const heartShape = (() => { const s = new THREE.Shape(); s.moveTo(0, -0.06); s.bezierCurveTo(0.09, 0.0, 0.07, 0.07, 0.0, 0.04); s.bezierCurveTo(-0.07, 0.07, -0.09, 0.0, 0, -0.06); return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.01, bevelSegments: 3 }).translate(0, 0, -0.015); })();
const HEARTS = [0, 1].map(() => { const m = mesh(heartShape, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.15, 0.25) }), false, false); m.scale.setScalar(1.3); XR.sc.add(m); return m; });
const FLIES = Array.from({ length: 14 }, (_, i) => { const g = new THREE.Group(); for (const s of [-1, 1]) { const w = mesh(new THREE.CircleGeometry(0.028, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(...(i % 2 ? [1.6, 0.7, 0.15] : [1.5, 0.35, 0.8])), side: THREE.DoubleSide }), false, false); w.position.x = s * 0.018; w.userData.s = s; g.add(w); } XR.sc.add(g); return g; });
const SPARK = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 * 3 }, (_, i) => [(rnd() - 0.5) * 8, rnd() * 4, (rnd() - 0.5) * 6 - 2][i % 3]), 3)), new THREE.PointsMaterial({ color: '#8ab8ff', size: 0.02, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })); XR.sc.add(SPARK);
// ======================= 5) THE PARK: sunset lawn, a bench, old trees, string lights; the wedding arch =======================
const PARK = mkSet({ top: '#5a6aa8', bot: '#ffb070', fog: 0xf0a878, near: 25, far: 160, hemi: [0xffd8b0, 0x5a4a3a, 0.6], sun: [0xffa060, 3.0, V3(-20, 6, -30)], shadow: 14, env: 0.5 });
const PL = {};
{ const sc = PARK.sc; const grass = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5a8a3a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 40000, ['rgba(20,50,10,.3)', 'rgba(170,200,90,.25)', 'rgba(90,130,40,.3)'], 3); }, [16, 16]); gplane(sc, 300, 300, new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }), 0, 0);
  const path = mesh(new THREE.PlaneGeometry(2.2, 120), M('#c8b8a0', { roughness: 0.9 }), false, true); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, -2.0); path.rotation.z = 0.1; sc.add(path);
  const bench = grp(0, 0, -3.2, 0, sc); for (let k = 0; k < 4; k++) bx(1.8, 0.04, 0.09, WOODL, 0, 0.45, -0.15 + k * 0.1, bench); for (let k = 0; k < 3; k++) { const s = bx(1.8, 0.09, 0.04, WOODL, 0, 0.62 + k * 0.12, -0.24, bench); s.rotation.x = -0.15; }
  for (const sx of [-0.8, 0.8]) { bx(0.06, 0.45, 0.4, DARK, sx, 0.22, 0, bench); bx(0.06, 0.4, 0.06, DARK, sx, 0.65, -0.26, bench); bx(0.06, 0.05, 0.4, DARK, sx, 0.6, 0.0, bench); }
  const treeM = F_('#4a7a2e'), treeM2 = F_('#c8803a'), trunkM = F_('#4a3424'); for (let k = 0; k < 30; k++) { const a = hash(k) * 6.28, r = 8 + 25 * hash(k * 3); const x = Math.cos(a) * r, z = Math.sin(a) * r - 6; if (Math.abs(x) < 3 && z > -6) continue; const tg = grp(x, 0, z, 0, sc); const s = 0.8 + 0.6 * hash(k * 5); const tr = mesh(new THREE.CylinderGeometry(0.2 * s, 0.35 * s, 4 * s, 7), trunkM); tr.position.y = 2 * s; tg.add(tr);
    for (let j = 0; j < 6; j++) { const c = mesh(new THREE.IcosahedronGeometry((1.2 + 0.8 * hash(k * 7 + j)) * s, 0), hash(k * 2 + j) < 0.35 ? treeM2 : treeM); c.position.set((hash(k + j) - 0.5) * 2.5 * s, (4.2 + j * 0.5) * s, (hash(k * 2 + j) - 0.5) * 2.5 * s); tg.add(c); } }
  const lp = grp(1.6, 0, -3.6, 0, sc); const p = mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.6, 8), DARK); p.position.y = 1.8; lp.add(p); const hd = mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) })); hd.position.y = 3.7; lp.add(hd);
  PL.lamp = new THREE.PointLight(0xffb060, 3, 7, 1.4); PL.lamp.position.set(1.6, 3.5, -3.6); sc.add(PL.lamp);
  PL.bulbs = []; for (let k = 0; k < 24; k++) { const u = k / 23, x = -6 + 12 * u, y = 3.2 - 0.6 * Math.sin(Math.PI * u), b = mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.4, 1.2) })); b.position.set(x, y, -6.5); sc.add(b); PL.bulbs.push(b); }
  // the wedding arch: white frame + flowers; petals in the air
  PL.arch = grp(0, 0, -6, 0, sc); for (const sx of [-1, 1]) bx(0.12, 2.6, 0.12, M('#f8f6f0'), sx * 1.0, 1.3, 0, PL.arch); const ar = mesh(new THREE.TorusGeometry(1.0, 0.06, 8, 24, Math.PI), M('#f8f6f0')); ar.position.y = 2.6; PL.arch.add(ar);
  for (let k = 0; k < 60; k++) { const a = k / 59 * Math.PI, fl = mesh(new THREE.IcosahedronGeometry(0.07 + 0.04 * hash(k), 0), F_(pick(['#f4c8d0', '#ffffff', '#e8a0b0', '#f8e0a0']))); fl.position.set(Math.cos(a) * 1.0 + (hash(k) - 0.5) * 0.15, 2.6 + Math.sin(a) * 1.0 + (hash(k * 3) - 0.5) * 0.15, (hash(k * 5) - 0.5) * 0.2); PL.arch.add(fl); }
  PL.petals = new THREE.InstancedMesh(new THREE.CircleGeometry(0.025, 6), new THREE.MeshBasicMaterial({ color: '#ffd0dc', side: THREE.DoubleSide }), 300); PL.petals.frustumCulled = false; sc.add(PL.petals);
  PL.ball = mesh(new THREE.SphereGeometry(0.11, 18, 12), M('#e8432a', { roughness: 0.4 })); sc.add(PL.ball); PL.kite = grp(0, 0, 0, 0, sc); { const k = mesh(new THREE.ConeGeometry(0.35, 0.5, 4), F_('#3a8ad8', { side: THREE.DoubleSide })); k.rotation.z = Math.PI / 2; k.scale.set(1, 1, 0.1); PL.kite.add(k); } }
function petalsAt(t, on) { PL.petals.visible = on; if (!on) return; for (let i = 0; i < 300; i++) { const y = wrapR(4 - (t * 0.6 + hash(i) * 4), 0, 4); _o.position.set((hash(i * 3) - 0.5) * 6 + 0.3 * Math.sin(t + i), y, -6 + (hash(i * 5) - 0.5) * 5); _o.rotation.set(t * 2 + i, t + i * 2, 0); _o.scale.setScalar(1); _o.updateMatrix(); PL.petals.setMatrixAt(i, _o.matrix); } PL.petals.instanceMatrix.needsUpdate = true; }
// ======================= the cast =======================
const HERO_O = hero.o;
const HER_O = { head: 'human', body: 'human', skin: '#f2cdb0', hair: '#5a3018', top: '#b8463a', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'long', headS: 0.86, h: 0.95, lip: '#c4505a', blush: 0.55 };
const her = makeBlock(HER_O), herWed = makeBlock({ ...HER_O, top: '#fbfaf6', jeans: false, bottom: '#fbfaf6', shoe: '#fbfaf6' }), heroOld = makeBlock({ ...HERO_O, hair: '#d8d8d4', glasses: '#3a3a3a' }), herOld = makeBlock({ ...HER_O, hair: '#e4e2de', top: '#8a6a9a', glasses: '#5a4a3a' });
const kidA = makeBlock({ ...HERO_O, hair: '#5a3018', top: '#3a8ad8', h: 0.62, hairStyle: 'mop' }), kidB = makeBlock({ ...HER_O, top: '#f2c42a', h: 0.56, hairStyle: 'bangs' });
const gkA = makeBlock({ ...HERO_O, hair: '#c8a060', top: '#e8432a', h: 0.52, hairStyle: 'curly' }), gkB = makeBlock({ ...HER_O, hair: '#3a2a1e', top: '#5aa070', h: 0.5, hairStyle: 'long' });
const barista = makeBlock({ head: 'human', body: 'human', skin: '#c89068', hair: '#1a1410', top: '#2f5a46', jeans: false, bottom: '#2a2e38', shoe: '#1a1a1c', hairStyle: 'short', headS: 0.88, mustache: '#1a1410' });
const xHim = xrayBody(makeBlock(HERO_O), XRM), xHer = xrayBody(makeBlock(HER_O), XRM2);
// the groom's suit (wedding beat): same method as the President video
function suitFor(P, col = '#1f2a44') { const navy = new THREE.Color(col), cTop = new THREE.Color(P.o.top), cTop2 = cTop.clone().multiplyScalar(0.82), mats = [];
  P.outer.traverse(o => { if (!o.isSkinnedMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.color && (m.color.equals(cTop) || m.color.equals(cTop2))) mats.push([m, m.color.clone(), m.color.equals(cTop) ? navy.clone() : navy.clone().multiplyScalar(0.8)]); }); });
  const jm = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }), wm = M('#f6f6f2'), parts = [];
  P.arms.forEach(a => { const s = mesh(new THREE.CylinderGeometry(0.072, 0.064, 0.33, 14), jm); s.position.y = -0.14; a.add(s); parts.push(s); });
  P.elbows.forEach(e => { const s = mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.235, 14), jm); s.position.y = -0.105; e.add(s); parts.push(s); const c = mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.03, 14), wm); c.position.y = -0.235; e.add(c); parts.push(c); });
  const tx = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f6f6f2'; g.beginPath(); g.moveTo(w * 0.33, 0); g.lineTo(w * 0.67, 0); g.lineTo(w * 0.5, h * 0.78); g.fill(); g.fillStyle = '#1a1a22'; g.beginPath(); g.moveTo(w * 0.4, h * 0.06); g.lineTo(w * 0.5, h * 0.1); g.lineTo(w * 0.6, h * 0.06); g.lineTo(w * 0.6, h * 0.16); g.lineTo(w * 0.5, h * 0.12); g.lineTo(w * 0.4, h * 0.16); g.fill();
    g.strokeStyle = '#0e1424'; g.lineWidth = 7; g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(w * 0.5, h * 0.8); g.lineTo(w * 0.7, 0); g.stroke(); g.fillStyle = '#f8d8e0'; g.beginPath(); g.arc(w * 0.3, h * 0.24, 10, 0, 7); g.fill(); });
  const pr = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.36, 24, 1, true, -0.26, 0.52), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.8 }), false, false); pr.position.set(0, 1.25, 0.154 - 0.36); P.torso.add(pr); parts.push(pr);
  const api = { set(on) { mats.forEach(([m, c0, c1]) => m.color.copy(on ? c1 : c0)); parts.forEach(p => p.visible = on); } }; api.set(false); return api; }
const GROOM = suitFor(hero);
// =================== THE STORY: the day you meet her — poses, shots on the beat grid, x-ray, the life montage, captions/HUD/bubbles, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const LOOKV = (p, l, fov = 40) => ({ pos: p.clone(), look: l.clone(), fov });
const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
const CAST = [hero, her, herWed, heroOld, herOld, kidA, kidB, gkA, gkB, barista];
const SW = 0.16;   // sidewalk top
function hideCast() { CAST.forEach(P => P.outer.visible = false); CUP.visible = false; BOOKS.forEach(b => b.visible = false); SPLASH.visible = false; BABY.visible = false; HL.brush.visible = false; GROOM.set(false); DATECUPS.forEach(c => c.visible = false); PL.ball.visible = false; PL.kite.visible = false; }
function stand(P, x, z, ry, t, face, y = 0) { poseReset(P, t); place(P, x, z, ry, y); if (face) P.face(face, t); }
const handW = (P, s) => (P.outer.updateMatrixWorld(true), P.elbows[s].localToWorld(V3(0, -0.3, 0.03)));
function squat(P, k, lean = 0.3) { P.legs.forEach(l => l.rotation.x = -1.25 * k); P.knees.forEach(q => q.rotation.x = 1.95 * k); P.outer.position.y -= 0.5 * k; P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = lean * k; }
function sitDown(P, x, z, ry, seat, t, face) { poseReset(P, t); place(P, x, z, ry, seatY(P, seat) - 0.95); poseSit(P); if (face) P.face(face, t); }
// story positions on the street: he comes out of the cafe and walks +z on the left sidewalk; she walks -z toward him; they meet at z ≈ 12.4 at BUMP
const HX = -6.3, MZ = 12.4;
const hisZ = t => t < BUMP ? lerp(-0.8, MZ - 0.45, clamp((t - OUT) / (BUMP - OUT), 0, 1)) : MZ - 0.45 - 0.12 * smooth(BUMP, BUMP + 0.3, t);
const herZ = t => t < BUMP ? MZ + 0.45 + 1.0 * (BUMP - t) : MZ + 0.45 + 0.1 * smooth(BUMP, BUMP + 0.3, t);
// ---- poses ----
function pose(t, k) { hideCast();
  if (k === 'home' && t < bt(0)) { sitDown(hero, -0.6, -1.7, 0, 0.62, t, t < 0.9 ? 'sleep' : t < 1.4 ? 'sleepy' : 'happy'); hero.legs.forEach(l => l.rotation.x = -1.45); hero.arms.forEach((a, i) => a.rotation.set(-0.3, 0, (i ? -1 : 1) * 0.2)); hero.outer.rotation.x = -0.25 + 0.25 * smooth(0.6, 1.4, t); }
  else if (k === 'home' && t < bt(2)) { stand(hero, 10 - 0.7, 0, -Math.PI / 2, t, 'squint'); hero.arms[1].rotation.set(-0.6, 0, 0.35); hero.elbows[1].rotation.x = -1.9; HL.brush.visible = true; const hd = H_(hero); HL.brush.position.set(hd.x - 0.12, hd.y - 0.06, hd.z + 0.02 * Math.sin(t * 30)); HL.brush.rotation.set(Math.PI / 2, 0, 0); }
  else if (k === 'home' && t < bt(4)) { stand(hero, 0.7, 0.7, Math.PI / 2 + 0.3, t, 'proud'); hero.arms.forEach((a, i) => a.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.35)); hero.elbows.forEach(e => e.rotation.x = -1.8); }
  else if (k === 'home' && t < STREET) { const u = span(t, bt(4), STREET); stand(hero, 20 + lerp(1.2, -2.6, u), 0.8, -Math.PI / 2, t, 'happy'); poseWalk(hero, t * 7, 1); }
  else if (k === 'str' && t < CAFE) { const z = 9 - 1.35 * (t - STREET); stand(hero, HX, z, Math.PI, t, 'happy', SW); poseWalk(hero, t * 6.6, 1); }
  else if (k === 'caf' && t < OUT) { stand(hero, 0.2, -1.1, Math.PI, t, t < bt(28) ? 'happy' : 'love'); stand(barista, -0.4, -2.75, 0, t, 'happy'); const give = smooth(bt(26), bt(27.5), t);
    barista.arms[1].rotation.set(-0.6 * give, 0, -0.1); barista.elbows[1].rotation.x = -0.7 * give; hero.arms[1].rotation.set(-0.55 * smooth(bt(27), bt(28), t), 0, 0.1); hero.elbows[1].rotation.x = -0.8 * smooth(bt(27), bt(28), t);
    CUP.visible = true; CAFS.sc.add(CUP); CUP.position.copy(t < bt(27.6) ? handW(barista, 1) : handW(hero, 1)); CUP.rotation.set(0, 0, 0); }
  else if (k === 'str' && t >= OUT && t < BRAIN || k === 'str' && t >= HI && t < LIFE) { STR.sc.add(CUP); const hz = hisZ(t), sz = herZ(t);
    // him: phone in the left hand, cup in the right, eyes down; the bump; squat to pick up the books; stand up for "hi"
    stand(hero, HX, hz, 0, t, 'neutral', SW); const walking = t < BUMP; if (walking) poseWalk(hero, t * 6.2, 0.9);
    hero.arms[0].rotation.set(-0.55, 0, 0.1); hero.elbows[0].rotation.x = -1.3; hero.head.rotation.x = walking ? 0.25 : 0; hero.arms[1].rotation.set(walking ? -0.3 : -0.1, 0, 0.1); hero.elbows[1].rotation.x = walking ? -1.0 : -0.3;
    if (t >= MEET) { stand(her, HX + 0.1, sz, Math.PI, t, 'happy', SW); if (walking) poseWalk(her, t * 6.4 + 1, 0.9); her.arms.forEach((a, i) => a.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.15)); her.elbows.forEach(e => e.rotation.x = -1.5); her.head.rotation.x = walking ? 0.2 : 0; }
    const sq = smooth(bt(60), bt(61.5), t) * (1 - smooth(HI, HI + 0.5, t)); if (sq > 0) { squat(hero, sq, 0.35); squat(her, sq, 0.35); const reach = smooth(bt(61), bt(62.6), t); hero.arms[1].rotation.set(-0.62 * reach, 0, -0.05); hero.elbows[1].rotation.x = -0.2; her.arms[0].rotation.set(-0.62 * reach, 0, 0.05); her.elbows[0].rotation.x = -0.2; hero.head.rotation.x = -0.15 * smooth(MAGIC - 0.3, MAGIC, t); her.head.rotation.x = -0.15 * smooth(MAGIC - 0.3, MAGIC, t); }
    if (t > BUMP) { hero.face(t < bt(60) ? 'surprised' : t < MAGIC ? 'worried' : 'love', t); her.face(t < bt(60) ? 'surprised' : t < MAGIC ? 'happy' : 'love', t); }
    if (t >= HI) { her.face('happy', t); hero.face('love', t); }
    // the cup: in his hand → flies at the bump (ballistic) → lies on the sidewalk; the splash
    CUP.visible = true; const a = t - BUMP, h0 = V3(HX + 0.12, SW + 1.05, MZ - 0.2);
    if (a < 0) { CUP.position.copy(handW(hero, 1)); CUP.rotation.set(0, 0, 0); } else { const tl = 0.62, u = Math.min(a, tl); CUP.position.set(h0.x + 0.9 * u, Math.max(SW + 0.05, h0.y + 2.2 * u - 4.9 * u * u * 1.6), h0.z + 0.5 * u); CUP.rotation.set(9 * u, 0, a < tl ? 7 * u : Math.PI / 2); }
    SPLASH.visible = a > 0 && a < 1.6; if (SPLASH.visible) { const P = SPLASH.geometry.attributes.position.array; for (let i = 0; i < 160; i++) { const v = V3(hash(i) - 0.3, 0.6 + hash(i * 3), hash(i * 5) - 0.5).multiplyScalar(2.2), u = Math.min(a, 0.55); P[i * 3] = h0.x + v.x * u; P[i * 3 + 1] = Math.max(SW + 0.01, h0.y + v.y * u - 4.9 * u * u); P[i * 3 + 2] = h0.z + v.z * u; } SPLASH.geometry.attributes.position.needsUpdate = true; }
    // the books: in her arms → fly → scattered; the red one lies between them (both reach for it)
    if (t >= MEET) BOOKS.forEach((b, i) => { b.visible = true; const rest = [V3(HX - 0.05, SW + 0.02, MZ), V3(HX + 0.45, SW + 0.02, MZ + 0.35), V3(HX - 0.4, SW + 0.02, MZ + 0.55)][i];
      if (a < 0) { b.position.copy(her.outer.position).add(V3(0.02, 0.18 + i * 0.04 - 0.95 + 1.12, -0.2)); b.rotation.set(0.2, 0, 0); } else { const u = clamp(a / 0.7, 0, 1); const st = her.outer.position.clone().add(V3(0, 0.2, -0.2)); b.position.lerpVectors(st, rest, u); b.position.y += 0.6 * Math.sin(Math.PI * u); b.rotation.set(0, 2 * i + 4 * u, (1 - u) * 6 * u); } }); }
  else if (k === 'xr') { [xHim, xHer].forEach((P, i) => { poseReset(P, t); place(P, i ? 0.3 : -0.3, 0, i ? -Math.PI / 2 : Math.PI / 2); P.face('love', t); P.head.rotation.x = -0.05; });
    const beatK = t => Math.pow(Math.max(0, Math.sin(Math.PI * ((t - 1.93) / BEAT))), 8);
    [xHim, xHer].forEach((P, i) => { P.outer.updateMatrixWorld(true); const hd = H_(P); BRAINS[i].position.copy(hd).add(V3(0, 0.07, 0)); const glow = smooth(BRAIN, BRAIN + 0.6, t); BRAINS[i].scale.setScalar(0.4 + 0.7 * glow + 0.15 * glow * beatK(t)); BRAINS[i].rotation.y = t * 0.6;
      const ch = P.torso.localToWorld(V3(0.03, 1.26, 0.06)); HEARTS[i].position.copy(ch); HEARTS[i].lookAt(XR.cam.position); const sync = smooth(HEART + 0.4, BUTTER - 0.3, t), ph = i ? 0.37 * (1 - sync) : 0; HEARTS[i].scale.setScalar(1.0 + 0.35 * beatK(t + ph * BEAT));
      HEARTS[i].visible = t >= HEART - 0.3; BRAINS[i].visible = true; });
    FLIES.forEach((f, j) => { const P = j % 2 ? xHer : xHim; const c = P.torso.localToWorld(V3(0, 1.02, 0.02)); const on = smooth(BUTTER, BUTTER + 0.5, t); f.visible = on > 0.01; const a = t * (2 + hash(j)) + j; f.position.copy(c).add(V3(Math.cos(a) * 0.1, Math.sin(a * 1.3) * 0.08, Math.sin(a) * 0.1)); f.lookAt(c); f.children.forEach(w => w.rotation.y = w.userData.s * (0.3 + 0.9 * Math.abs(Math.sin(t * 22 + j)))); f.scale.setScalar(on); }); }
  else if (k === 'caf' && t >= LIFE) { sitDown(hero, 2.2 - 0.62, 1.4, Math.PI / 2, 0.48, t, 'laugh'); sitDown(her, 2.2 + 0.62, 1.4, -Math.PI / 2, 0.48, t, 'laugh'); [hero, her].forEach(P => { P.arms.forEach(a => a.rotation.x = -0.9); P.elbows.forEach(e => e.rotation.x = -0.6); });
    DATECUPS.forEach((c, i) => { c.visible = true; c.position.set(2.2 + (i ? 0.2 : -0.2), 0.8, 1.42 + (i ? 0.05 : -0.05)); }); }
  else if (k === 'home' && t >= LIFE) { const yr = t < bt(87) ? 1 : t < bt(99) ? 5 : 35; HL.boxes.visible = yr === 1; HL.crib.visible = yr === 5; HL.frames.forEach((f, i) => f.visible = i < (yr === 1 ? 1 : yr === 5 ? 3 : 6));
    if (yr === 1) { stand(hero, 19.75, 0.7, Math.PI / 2, t, 'laugh'); stand(her, 20.95, 0.7, -Math.PI / 2, t, 'laugh'); [hero, her].forEach(P => { P.arms.forEach((a, i) => a.rotation.set(-0.55, 0, (i ? -1 : 1) * 0.05)); P.elbows.forEach(e => e.rotation.x = -1.0); });
      if (!LIV.userData.carry) { LIV.userData.carry = rb(0.55, 0.42, 0.45, M('#b88a5a', { roughness: 0.9 }), 0, 0, 0, HOME.sc, 0.02); } LIV.userData.carry.visible = true; LIV.userData.carry.position.set(20.35, 1.05 + 0.03 * Math.sin(t * 6), 0.7); }
    else { if (LIV.userData.carry) LIV.userData.carry.visible = false; }
    if (yr === 5) { stand(her, 20.55, 0.4, -0.25, t, 'love'); her.arms.forEach((a, i) => a.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.3)); her.elbows.forEach(e => e.rotation.x = -1.5); BABY.visible = true; BABY.position.copy(her.torso.localToWorld(V3(0, 1.12, 0.22))); BABY.rotation.set(0, -0.25 + Math.PI / 2, 0.15);
      stand(hero, 20.0, 0.55, 0.5, t, 'love'); hero.head.rotation.x = 0.25; hero.arms[1].rotation.set(-0.45, 0, 0.3); hero.elbows[1].rotation.x = -1.1; }
    if (yr === 35) { sitDown(heroOld, 19.25, -1.45, 0, 0.5, t, 'laugh'); sitDown(herOld, 19.8, -1.45, 0, 0.5, t, 'laugh'); [heroOld, herOld].forEach(P => { P.arms.forEach(a => a.rotation.x = -0.8); P.elbows.forEach(e => e.rotation.x = -0.6); }); heroOld.arms[1].rotation.set(-0.3, 0, -0.4); herOld.arms[0].rotation.set(-0.3, 0, 0.4); } }
  else if (k === 'park') { const wed = t < bt(91); PL.arch.visible = wed; petalsAt(t, wed);
    if (wed) { stand(hero, -0.33, -5.4, Math.PI / 2, t, 'love'); GROOM.set(true); stand(herWed, 0.33, -5.4, -Math.PI / 2, t, 'love'); [hero, herWed].forEach((P, i) => { P.arms.forEach((a, j) => a.rotation.set(-0.5, 0, (j ? -1 : 1) * 0.1)); P.elbows.forEach(e => e.rotation.x = -0.6); P.head.rotation.x = 0.1; }); }
    else if (t < bt(99)) { stand(hero, -0.5, -2.4, 0.25, t, 'laugh'); stand(her, 0.2, -2.4, -0.2, t, 'laugh'); her.arms[0].rotation.set(-0.3, 0, 0.2); hero.arms[1].rotation.set(-0.3, 0, -0.2);
      [kidA, kidB].forEach((P, i) => { const a = t * 1.6 + i * Math.PI; stand(P, Math.cos(a) * 1.3, -0.6 + Math.sin(a) * 0.9, a + (i ? Math.PI : 0) + Math.PI / 2, t, 'laugh'); poseWalk(P, t * 10 + i, 1); P.outer.position.y += 0.06 * Math.abs(Math.sin(t * 10 + i)); });
      PL.ball.visible = true; const ba = t * 2.3; PL.ball.position.set(Math.cos(ba) * 0.9, 0.11 + 0.5 * Math.abs(Math.sin(t * 4)), -0.5 + Math.sin(ba) * 0.6); }
    else { sitDown(heroOld, -0.32, -3.15, 0, 0.47, t, 'happy'); sitDown(herOld, 0.32, -3.15, 0, 0.47, t, 'happy'); heroOld.arms[1].rotation.set(-0.35, 0, -0.42); heroOld.elbows[1].rotation.x = -0.4; herOld.arms[0].rotation.set(-0.35, 0, 0.42); herOld.elbows[0].rotation.x = -0.4; herOld.head.rotation.z = 0.15 * smooth(55.5, 56.5, t);
      [gkA, gkB].forEach((P, i) => { const a = t * 1.3 + i * Math.PI; stand(P, Math.cos(a) * 1.4, 0.6 + Math.sin(a) * 0.8, a + (i ? Math.PI : 0) + Math.PI / 2, t, 'laugh'); poseWalk(P, t * 10 + i, 1); P.outer.position.y += 0.05 * Math.abs(Math.sin(t * 10 + i)); });
      PL.ball.visible = true; const ba = t * 1.9; PL.ball.position.set(Math.cos(ba) * 1.0, 0.11 + 0.4 * Math.abs(Math.sin(t * 3.5)), 0.6 + Math.sin(ba) * 0.6); } }
}
// ---- shots: [start, set, camera(t), opts{mb, dof, whip, far, noao, frozen}] ----
const SETS = { home: HOME, str: STR, caf: CAFS, xr: XR, park: PARK };
const SHOTS = [
  [WAKE, 'home', t => { const u = esin(span(t, 0, bt(0))); return LOOK(1.15 - 0.15 * u, 0.95 + 0.15 * u, -0.95 + 0.1 * u, lerp(0.6, -0.6, smooth(0.3, 1.0, u)), lerp(0.6, 1.2, smooth(0.3, 1.0, u)), lerp(-1.9, -1.7, u), 42); }, { dof: () => t0F() }],
  [bt(0), 'home', t => { const hd = H_(hero); return LOOK(hd.x + 0.35, hd.y + 0.05, 1.25 + 0.04 * Math.sin(t * 2), hd.x - 0.25, hd.y - 0.12, hd.z, 46); }, { dof: () => H_(hero) }],
  [bt(2), 'home', t => { const u = esin(span(t, bt(2), bt(4))); const hd = H_(hero); return LOOK(hd.x + 1.5 - 0.2 * u, hd.y - 0.1, hd.z + 1.2 - 0.3 * u, hd.x, hd.y - 0.2, hd.z, 44); }, { dof: () => H_(hero) }],
  [bt(4), 'home', t => { const u = esin(span(t, bt(4), STREET)); return LOOK(20 - 3.2, 1.35, 2.4 - 0.4 * u, 20 + lerp(1.0, -2.0, u), 1.1, 0.8, 46); }, { mb: true, whip: 1 }],
  [STREET, 'str', t => { const hd = H_(hero); return LOOK(HX + 0.3 + 0.2 * Math.sin(t * 0.8), 0.75, hd.z - 2.6, hd.x, hd.y - 0.15, hd.z, 44); }, { mb: true, whip: -1 }],
  [bt(14), 'str', t => { const hd = H_(hero); const u = esin(span(t, bt(14), CAFE)); return LOOK(hd.x + 1.2, hd.y - 0.3, hd.z - lerp(2.6, 2.0, u), hd.x, hd.y - 0.2, hd.z, 42); }, { dof: () => H_(hero) }],
  [CAFE, 'caf', t => { const u = esin(span(t, CAFE, bt(24))); return LOOK(lerp(2.6, 1.9, u), 1.5, lerp(1.2, 0.4, u), -0.2, 1.3, -1.9, 44); }],
  [bt(24), 'caf', t => { const u = esin(span(t, bt(24), bt(26))); return LOOK(-1.2 + 0.35, 1.48, -2.2 + 0.85 - 0.1 * u, -1.2, 1.32, -2.3, 36); }, { dof: () => V3(-1.2, 1.35, -2.25) }],
  [bt(26), 'caf', t => orbit(H_(hero), V3(0.7, 0.05, -1), -0.25, 0.2, 1.5, 1.2, 0.6, span(t, bt(26), OUT), 40), { dof: () => H_(hero) }],
  [OUT, 'str', t => { const hd = H_(hero); return LOOK(HX - 0.2 + 0.3 * Math.sin(t * 0.7), hd.y - 0.05, hd.z + 2.3, hd.x, hd.y - 0.25, hd.z, 42); }, { dof: () => H_(hero) }],
  [bt(40), 'str', t => { const u = esin(span(t, bt(40), MEET)); const hd = H_(hero); return LOOK(lerp(-0.6, -1.0, u), lerp(6.5, 4.5, u), hd.z - lerp(4.5, 3.5, u), HX, 1.5, hd.z + 3.5, 44); }, { far: true }],
  [MEET, 'str', t => { const hd = H_(her); const u = esin(span(t, MEET, bt(52))); return LOOK(HX + 0.2 - 0.3 * u, hd.y - 0.05, hd.z - 2.2 + 0.3 * u, hd.x, hd.y - 0.2, hd.z, 38); }, { dof: () => H_(her) }],
  [bt(52), 'str', t => { const u = esin(span(t, bt(52), BUMP)); return LOOK(HX + 1.55, 1.75, lerp(MZ - 2.4, MZ - 0.5, u), HX, 1.6, MZ + 0.6, 44); }, { mb: true }],
  [BUMP, 'str', t => { const u = esin(span(t, BUMP, bt(60))); return LOOK(HX + 2.2 - 0.4 * u, lerp(1.4, 0.9, u), MZ + 1.7, HX + 0.2, lerp(1.3, 0.7, u), MZ - 0.1, 46); }, { mb: true, whip: 1 }],
  [bt(60), 'str', t => { const u = esin(span(t, bt(60), bt(62.4))); return LOOK(HX + 1.6 - 0.5 * u, 0.85, MZ + 0.1, HX, 0.45, MZ, 40); }, { dof: () => V3(HX, 0.45, MZ) }],
  [bt(62.4), 'str', t => LOOK(HX + 0.55, 0.42, MZ + 0.05, HX - 0.02, SW + 0.15, MZ, 34), { dof: () => V3(HX - 0.02, SW + 0.15, MZ) }],
  [MAGIC, 'str', t => { const c = V3(HX + 0.05, 1.33, MZ); const a = lerp(-0.45, 0.45, esin(span(t, MAGIC, BRAIN))); return LOOK(c.x + Math.cos(a) * 2.7, 1.42, c.z + Math.sin(a) * 2.7, c.x, 1.32, c.z, 40); }, { dof: () => H_(her), frozen: true }],
  [BRAIN, 'xr', t => { const u = esin(span(t, BRAIN, HEART)); return LOOK(lerp(0.6, 0.3, u), 1.62, lerp(2.9, 1.7, u), 0, 1.55, 0, 44); }, { noao: true }],
  [HEART, 'xr', t => { const u = esin(span(t, HEART, BUTTER)); return LOOK(lerp(-0.2, 0.15, u), 1.3, lerp(2.2, 1.6, u), 0, 1.25, 0, 44); }, { noao: true }],
  [BUTTER, 'xr', t => { const u = esin(span(t, BUTTER, HI)); return LOOK(lerp(0.5, 0.3, u), 1.1, lerp(2.0, 1.6, u), 0, 1.05, 0, 44); }, { noao: true }],
  [HI, 'str', t => { const u = esin(span(t, HI, LIFE)); return LOOK(HX + lerp(3.4, 3.0, u), 1.95, MZ + 0.1, HX, 1.75, MZ, 44); }, { dof: () => H_(her) }],
  [LIFE, 'caf', t => { const u = esin(span(t, LIFE, bt(83))); return LOOK(2.2 + lerp(-0.2, 0.2, u), 1.65, 1.4 + lerp(2.0, 1.8, u), 2.2, 1.25, 1.4, 60); }, { dof: () => V3(2.2, 1.05, 1.4), whip: 1 }],
  [bt(83), 'home', t => { const u = esin(span(t, bt(83), bt(87))); return LOOK(20.35 + lerp(-0.4, 0.3, u), 1.75, 2.85 - 0.2 * u, 20.35, 1.45, 0.7, 60); }, { dof: () => V3(20.35, 1.3, 0.7), whip: -1 }],
  [bt(87), 'park', t => { const u = esin(span(t, bt(87), bt(91))); return LOOK(lerp(1.0, 0.6, u), 1.55, -2.6 - 0.4 * u, 0, 1.45, -5.4, 40); }, { dof: () => V3(0, 1.5, -5.4), whip: 1 }],
  [bt(91), 'home', t => { const u = esin(span(t, bt(91), bt(95))); return LOOK(20.3 + lerp(0.5, 0.1, u), 1.7, 2.6 - 0.3 * u, 20.3, 1.55, 0.45, 44); }, { dof: () => V3(20.4, 1.2, 0.45), whip: -1 }],
  [bt(95), 'park', t => { const u = esin(span(t, bt(95), bt(99))); return LOOK(lerp(-2.4, -1.6, u), 1.1, 3.2 - 0.3 * u, 0, 0.8, -1.0, 46); }, { mb: true, whip: 1 }],
  [bt(99), 'home', t => { const u = esin(span(t, bt(99), bt(103))); return LOOK(19.5 + 0.4 * u, 1.4, 1.3 - 0.2 * u, 19.5, 1.25, -1.45, 42); }, { dof: () => H_(herOld), whip: -1 }],
  [bt(103), 'park', t => { const u = esin(span(t, bt(103), ENDC)); return LOOK(lerp(0.8, 0.0, u), lerp(0.9, 2.4, u), lerp(2.4, 4.6, u), 0, lerp(0.9, 1.2, u), -3.1, lerp(40, 46, u)); }, { dof: () => V3(0, 1.0, -3.1) }],
  [ENDC, 'park', t => LOOK(0, 2.4, 4.6, 0, 1.2, -3.1, 46)]];
function t0F() { return V3(0.6, 0.55, -1.9).lerp(H_(hero), smooth(0.5, 1.2, curT)); }
let curT = 0;
// per-set state: lights by time of day, steam, the clock, frozen world in the "it's her" beat
function setState(t, k, o) { const tw = o.frozen ? MAGIC : t;
  if (k === 'str') { pedsAt(tw > HI && tw < LIFE ? MAGIC : tw, [V3(HX, 0, hisZ(t)), V3(HX, 0, herZ(t))]); }
  if (k === 'caf') { const night = t >= LIFE; CL.pend.forEach(L => L.intensity = night ? 1.2 : 3.5); CL.candle.intensity = night ? 1.6 + 0.2 * Math.sin(t * 13) : 0; CAFS.sc.userData.sun.intensity = night ? 0 : 2.0; CAFS.sc.userData.hemi.intensity = night ? 0.08 : 0.35;
    CL.win.material.color.setRGB(...(night ? [0.04, 0.06, 0.14] : [1.8, 1.7, 1.5])); const P = CL.steam.geometry.attributes.position.array; for (let i = 0; i < P.length / 3; i++) P[i * 3 + 1] = 0.5 + wrapR(hash(i) * 0.6 + t * 0.25, 0, 0.6); CL.steam.geometry.attributes.position.needsUpdate = true; }
  if (k === 'home') { const eve = t >= bt(99); HOME.sc.userData.sun.intensity = eve ? 0.6 : 3.2; HOME.sc.userData.sun.color.set(eve ? '#ff9a5a' : '#ffd8a8'); HL.livL.intensity = eve ? 6 : 2; const s = HOME.sc.userData.sun, rx = t < bt(0) || (t >= bt(2) && t < bt(4)) ? 0 : t < bt(2) ? 10 : 20; s.target.position.set(rx, 0, 0); s.position.set(rx + 9, 6, 2); }
  if (k === 'park') { const lateDay = t >= bt(103); PL.bulbs.forEach(b => b.visible = lateDay || t < bt(91)); PL.lamp.intensity = lateDay ? 4 : 1.5; }
  if (k === 'xr') { SPARK.rotation.y = t * 0.05; } }
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const RTD = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
const rim = new THREE.PointLight(0xffe0c0, 0, 5, 1.5), rim2 = new THREE.PointLight(0xffd0d8, 0, 5, 1.5);
function lerpF(A, B, k) { return { pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) }; }
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
let lastDepth = null;
function shoot(i, t, rt) { const [, k, cf, o = {}] = SHOTS[i], S = SETS[k]; curT = t; puffsReset(); if (k !== 'xr') CAST.forEach(P => S.sc.add(P.outer)); S.sc.add(rim, rim2);
  setState(t, k, o); pose(t, k); const F = cf(t); applyF(S.cam, F); S.cam.near = o.far ? 0.3 : 0.05; S.cam.far = o.far ? 2000 : 1700; S.cam.updateProjectionMatrix(); S.cam.updateMatrixWorld();
  const lit = [hero, her, herWed, heroOld, herOld].filter(P => P.outer.visible); [rim, rim2].forEach((L, j) => { const P = lit[j]; if (!P || k === 'xr') { L.intensity = 0; return; } const h = H_(P), back = h.clone().sub(S.cam.position).setY(0).normalize(); L.position.copy(h).add(back.multiplyScalar(0.9)).add(V3(0, 0.4, 0)); L.intensity = k === 'str' ? 9 : 6; });
  if (o.far || o.noao) { shootTo(RTD, S.sc, S.cam); lastDepth = RTD.depthTexture; renderer.setRenderTarget(rt); accMat.uniforms.tSrc.value = RTD.texture; accMat.uniforms.uW.value = 1; renderer.setClearColor(0, 1); renderer.clear(); renderer.render(accSc, compCam); return; }
  shootTo(RTS, S.sc, S.cam); const hid = []; S.sc.traverse(q => { if ((q.isSprite || q.isPoints) && q.visible) { hid.push(q); q.visible = false; } }); aoFor(k).render(renderer, rt, RTS); hid.forEach(q => { q.visible = true; }); lastDepth = aoFor(k).depthTexture;
  // points (motes, steam, splash) were hidden for the AO pass — add them on top
  if (hid.length) { const keep = []; S.sc.traverse(q => { if (q.isMesh && q.visible && !q.isPoints) { keep.push(q); q.visible = false; } }); const bg = S.sc.background; renderer.setRenderTarget(rt); renderer.autoClear = false; const sky = S.sc.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry'); renderer.render(S.sc, S.cam); renderer.autoClear = true; keep.forEach(q => q.visible = true); } }
// ---- DOM: title fades, captions pop, HUD (clock / years), speech bubbles, the ECG, end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS', 'ecg'].map(k => [k, $(k)]));
const CAPS = [[0.25, bt(0), 'Just a <b>normal</b> day.'], [MAGIC, BRAIN, '<b>Yes. It’s her.</b>'], [BRAIN, HEART, 'Your brain’s reward system lights up — <b>dopamine</b>.'],
  [HEART, BUTTER, 'Your heart rate rises… and starts to <b>sync</b> with hers.'], [BUTTER, HI, 'Stress hormone up. Those are the <b>butterflies</b>.']];
const clockAt = t => { const m = 7 * 60 + clamp(t / BUMP, 0, 1) * 102; return `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')} AM`; };
const YEARS = [[LIFE, 'DAY 1', 'FIRST DATE'], [bt(83), 'YEAR 1', 'MOVING IN'], [bt(87), 'YEAR 3', 'THE WEDDING'], [bt(91), 'YEAR 5', 'BABY'], [bt(95), 'YEAR 12', 'THE KIDS'], [bt(99), 'YEAR 35', 'STILL LAUGHING'], [bt(103), 'YEAR 50', 'THE GRANDKIDS']];
function hudAt(t) { if (t >= bt(0) && t < MAGIC) return ['TODAY', clockAt(t), 'A NORMAL WEEKDAY · NEW YORK'];
  if (t >= HEART && t < BUTTER) return ['HEART RATES', t < HEART + 1.2 ? 'RISING' : 'IN SYNC', 'HIS · HERS'];
  if (t >= LIFE && t < ENDC) { let y = YEARS[0]; for (const q of YEARS) if (t >= q[0]) y = q; return ['TOGETHER', y[1], y[2]]; } return null; }
function bubbles(t) { if (t < HI || t >= LIFE) return ''; const S = STR, out = []; const add = (P, txt, a) => { if (t < a) return; const v = H_(P).add(V3(0, 0.32, 0)).project(S.cam); if (v.z > 1) return; const x = clamp((v.x + 1) / 2 * W, 180, 900), y = (1 - v.y) / 2 * H;
    out.push(`<div class="bub" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, a, 0.25).toFixed(3)})">${txt}</div>`); }; add(her, 'Hi.', HI + 0.15); add(hero, '…hi.', HI + 0.55); return out.join(''); }
function ecgPath(t, ph, y0) { let d = ''; for (let i = 0; i <= 120; i++) { const x = 140 + i * 6.7, tt = t - (120 - i) * 0.012 + ph; const k = ((tt - 1.93) / BEAT) % 1, kk = k < 0 ? k + 1 : k; const sp = kk < 0.06 ? -kk * 900 : kk < 0.12 ? -54 + (kk - 0.06) * 2200 : kk < 0.18 ? 78 - (kk - 0.12) * 1300 : 0; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (y0 + sp).toFixed(1); } return d; }
function updateDOM(t) {
  el.title.style.opacity = fadeWin(t, 0.2, bt(2), 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : ''; el.cap.classList.toggle('big', !!cp && cp[0] === MAGIC);
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; const yp = YEARS.some(q => Math.abs(t - q[0]) < 0.25) ? pop(t, YEARS.reduce((a, q) => t >= q[0] ? q[0] : a, 0), 0.25) : 1; el.val.style.transform = `scale(${yp.toFixed(3)})`; }
  el.labels.innerHTML = bubbles(t);
  const ecgOn = t >= HEART && t < BUTTER; el.ecg.style.opacity = ecgOn ? 1 : 0; if (ecgOn) { const sync = smooth(HEART + 0.4, BUTTER - 0.3, t); el.ecg.innerHTML = `<path d="${ecgPath(t, 0, 70)}" stroke="#9fd0ff" stroke-width="5" fill="none"/><path d="${ecgPath(t, 0.37 * BEAT * (1 - sync), 70 + 70 * (1 - sync))}" stroke="#ff9ac0" stroke-width="5" fill="none"/>`; }
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); }
// ---- optics ----
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
  if (window.PASS === 'text') { if (t >= HI && t < LIFE) shoot(i, t, RTA); updateDOM(t); return true; }
  updateDOM(t);
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#120e16', 1); renderer.clear(); return true; }
  const o = SHOTS[i][3] || {}; let src = RTA;
  if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA); } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && !o.mb) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = lastDepth; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); dofMat.uniforms.uAmt.value = o.frozen ? 40 : 26; renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  const u = compMat.uniforms; u.tA.value = src.texture; u.uWhip.value = whipAt(t); u.uPixOn.value = 0; u.uRed.value = 0; u.uT.value = t; u.uSepia.value = 0; u.uLook.value = 0.12; u.uTilt.value = 0;
  const flash = Math.max(0, 1 - Math.abs(t - MAGIC) / 0.25), exp = SHOTS[i][1] === 'xr' ? 1.0 : 1.0;
  composite(0, exp * (1 + 0.8 * flash) * (1 - 0.8 * Math.max(0, 1 - Math.abs(t - LIFE) / 0.12)), 1.0); u.tA.value = RTA.texture; return true; };
window.DBG = { THREE, hero, her, SETS, SHOTS, H_ };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const P of [...CAST, xHim, xHer]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(P.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
