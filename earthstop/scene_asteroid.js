import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
/* global d3, topojson */

// "What if a 1-mile asteroid hit Times Square?" — Times Square at night -> Empire State scale -> entry over the East Coast
// -> flash -> fireball / crater on a real map (km around ground zero) -> heat, quake, air-blast rings -> debris -> dust on the globe.
// Numbers: Impact: Earth! (Collins, Melosh & Marcus 2005; impact.ese.ic.ac.uk) for a 1-mile stony asteroid (3000 kg/m3),
// 17 km/s, 45 degrees, crystalline rock; cross-checked in tools/asteroid_math.py. Times below follow the real fall (17 km/s).
// =================== timeline ===================
const T_SCALE = 3.2, T_SPACE = 8.0, T_DESC = 11.2, IMPACT = 12.6, T_MAP = 13.6, T_FIREB = 20.0, T_CRATER = 26.0, T_HEAT = 33.0,
  T_QUAKE = 39.0, T_BLAST = 45.0, T_EJECT = 52.0, T_DUST = 54.5, T_CALM = 57.0, T_END = 61.0;
const V_KMS = 17, ENTRY_DEG = 45;
// =================== rng / helpers ===================
let seed = 3131;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const wrapR = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));
// log-interpolated keyframes [[t, v], ...]
function logKey(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t <= b) { const k = ease((t - a) / (b - a)); return Math.exp(lerp(Math.log(va), Math.log(vb), k)); } }
  return keys[keys.length - 1][1];
}
function linKey(keys, t, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t <= b) return lerp(va, vb, e((t - a) / (b - a))); }
  return keys[keys.length - 1][1];
}

// =================== renderer + compositing ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.autoClear = false;
const mkTarget = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 0, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
const rtA = mkTarget(W, H), rtB = mkTarget(W, H), rtSmall = mkTarget(270, 480), rtInset = mkTarget(640, 640);
// fullscreen / rect blit: mixes two linear HDR textures, then tone-maps like the scene pass
const blitScene = new THREE.Scene(); const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const blitMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, transparent: true,
  uniforms: { uA: { value: null }, uB: { value: null }, uK: { value: 0 }, uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uCircle: { value: 0 }, uBlur: { value: 0 }, uTexel: { value: new THREE.Vector2(1 / 270, 1 / 480) }, uAlpha: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uRing: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: 'uniform vec4 uRect; varying vec2 vUv; void main(){ vUv=uv; vec2 p=uRect.xy+uv*uRect.zw; gl_Position=vec4(p*2.0-1.0,0.0,1.0); }',
  fragmentShader: `uniform sampler2D uA; uniform sampler2D uB; uniform float uK, uCircle, uBlur, uAlpha; uniform vec2 uTexel; uniform vec3 uTint, uRing; varying vec2 vUv;
  vec3 tap(sampler2D s, vec2 uv){
    if(uBlur<0.5) return texture2D(s,uv).rgb;
    vec3 c=vec3(0.0); float w=0.0;
    for(int i=-2;i<=2;i++) for(int j=-2;j<=2;j++){ float k=exp(-float(i*i+j*j)/3.0); c+=texture2D(s,uv+vec2(float(i),float(j))*uTexel*uBlur).rgb*k; w+=k; }
    return c/w; }
  void main(){
    vec3 c=tap(uA,vUv); if(uK>0.0) c=mix(c,tap(uB,vUv),uK);
    c*=uTint; float a=uAlpha;
    if(uCircle>0.5){ float r=length(vUv-0.5)*2.0; if(r>1.0) discard; float ring=smoothstep(0.93,0.955,r); c=mix(c,uRing,ring); c*=1.0-0.35*smoothstep(0.6,0.93,r)*(1.0-ring); }
    gl_FragColor=vec4(c,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat));
function blit(a, o = {}) {
  const u = blitMat.uniforms; u.uA.value = a; u.uB.value = o.b || a; u.uK.value = o.k || 0; u.uCircle.value = o.circle ? 1 : 0; u.uBlur.value = o.blur || 0; u.uAlpha.value = o.alpha ?? 1;
  u.uRect.value.set(...(o.rect || [0, 0, 1, 1])); u.uTint.value.set(...(o.tint || [1, 1, 1])); u.uRing.value.set(...(o.ring || [1, 1, 1]));
  if (o.texel) u.uTexel.value.set(...o.texel); else u.uTexel.value.set(1 / 270, 1 / 480);
  renderer.render(blitScene, blitCam);
}
function toRT(rt, scene, camera, clearColor) {
  renderer.setRenderTarget(rt); renderer.setClearColor(clearColor ?? 0x000000, 1); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
}
const SKYFN = `
uniform vec3 uSunS; uniform vec3 uUp; uniform float uDay; uniform float uDusk;
vec3 skyColor(vec3 d){
  float e=dot(d,uUp); float eh=max(e,0.0);
  vec3 zen=mix(vec3(0.004,0.007,0.018),vec3(0.13,0.30,0.66),uDay);
  vec3 hor=mix(vec3(0.016,0.024,0.05),vec3(0.62,0.74,0.88),uDay);
  hor=mix(hor,vec3(0.98,0.55,0.28),uDusk); zen=mix(zen,vec3(0.20,0.22,0.46),uDusk*0.7);
  vec3 c=mix(hor,zen,pow(eh,0.42));
  float sd=max(dot(d,uSunS),0.0);
  c+=vec3(1.0,0.78,0.5)*pow(sd,6.0)*0.32*(uDay*0.6+uDusk);
  c+=vec3(1.0,0.9,0.7)*smoothstep(0.9993,0.9997,sd)*6.0;
  if(e<0.0) c=hor*0.85;
  return c;
}`;
// =================== CITY scene (meters) ===================
const city = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.004, 6000);
city.fog = new THREE.Fog(new THREE.Color(0.6, 0.7, 0.85), 180, 2400);
const hemi = new THREE.HemisphereLight(0xbfd6f2, 0x5b4e40, 1.0); city.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0dc, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 600 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.02;
city.add(sunL, sunL.target);

const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, mat, x, y, z, parent = city) { const m = mesh(BOX, typeof mat === 'string' ? M(mat) : mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 1; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }

// ---- ground: asphalt, sidewalks, markings
const XA = -600, XB = 1400;
const asphalt = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#55585e', '#41444a', '#5c5f64', '#3b3e43'], 3);
  for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(30,32,36,0.25)'; g.fillRect(R(0, w), R(0, h), R(40, 140), R(20, 80)); }
  g.strokeStyle = 'rgba(25,26,30,0.7)'; g.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) { let x = R(0, w), y = R(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += R(-22, 22); y += R(-22, 22); g.lineTo(x, y); } g.stroke(); }
}, [(XB - XA) / 18, 2]);
const ground = mesh(new THREE.PlaneGeometry(XB - XA, 14), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); ground.rotation.x = -Math.PI / 2; ground.position.set((XA + XB) / 2, 0, 0); city.add(ground);
const sideTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#b3b1ac', '#9f9d98', '#bab8b2'], 2);
  g.strokeStyle = 'rgba(70,70,70,0.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
}, [(XB - XA) / 4, 5 / 4]);
for (const s of [-1, 1]) {
  const sw = mesh(new THREE.BoxGeometry(XB - XA, 0.18, 5), M('#ffffff', { map: sideTex, roughness: 0.9 }), false, true); sw.position.set((XA + XB) / 2, 0.09, s * 9.5); city.add(sw);
  box(XB - XA, 0.2, 0.25, '#8f8d88', (XA + XB) / 2, 0.1, s * 7.05);
}
const far = mesh(new THREE.PlaneGeometry(9000, 9000), M('#6d6a62', { roughness: 1 }), false, true); far.rotation.x = -Math.PI / 2; far.position.y = -0.05; city.add(far);
// lane markings (instanced)
{
  const dash = [], dy = [];
  for (let x = XA; x < XB; x += 9) { dash.push([x, 3.5]); dash.push([x, -3.5]); }
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.15), M('#e8e6df', { roughness: 0.6 }), dash.length); const d = new THREE.Object3D();
  dash.forEach(([x, z], i) => { d.position.set(x, 0.02, z); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.receiveShadow = true; city.add(im);
  for (const z of [-0.14, 0.14]) { const l = mesh(new THREE.PlaneGeometry(XB - XA, 0.12), M('#e3b23c', { roughness: 0.6 }), false, true); l.rotation.x = -Math.PI / 2; l.position.set((XA + XB) / 2, 0.021, z); city.add(l); }
}
// cross streets
const CROSS = [-170, 30, 165, 300, 435, 570, 705, 840, 975, 1110];
const crossRoads = [];
for (const cx of CROSS) {
  const r = mesh(new THREE.PlaneGeometry(14, 2400), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); r.rotation.x = -Math.PI / 2; r.position.set(cx, 0.005, 0); city.add(r);
  // crosswalks
  for (const xs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(2.6, 0.5), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + xs * 8.6, 0.025, k * 1.05); city.add(s); }
  for (const zs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(0.5, 2.6), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + k * 1.05, 0.026, zs * 8.6); city.add(s); }
  crossRoads.push(cx);
}

// ---- facades
const WALLS = [
  { wall: '#c56d4c', band: '#e5c27a', trim: '#f0e2c4', brick: true }, { wall: '#d98c69', band: '#f2d8a8', trim: '#f6eedc', brick: false },
  { wall: '#9b4632', band: '#d8b88a', trim: '#e9dcc0', brick: true }, { wall: '#d9a73c', band: '#efd27c', trim: '#7a4a2a', brick: false },
  { wall: '#e3cfab', band: '#c9b48c', trim: '#ffffff', brick: false }, { wall: '#b85a40', band: '#e8cf92', trim: '#efe3c8', brick: true },
  { wall: '#a8b8a8', band: '#e8e2d0', trim: '#ffffff', brick: false }, { wall: '#cf7b5a', band: '#d9a73c', trim: '#f5e9cf', brick: true },
];
const SIGNS = ['#2a6b4f', '#b83a2e', '#1f3d6b', '#e0a81e', '#3a3a3a', '#6b2f5a', '#d46a2a', '#2f7a8a'];
const AWN = ['#2f7a4a', '#c43b2e', '#e2b13a', '#2b5f8a', '#d97a2a', '#3d8a7a'];
function facade(wM, hM, o, store = true) {
  const PPM = 9, cw = Math.ceil(wM * PPM), ch = Math.ceil(hM * PPM);
  const groundH = store ? 4.6 : 3.4, floorH = 3.35;
  const floors = Math.max(1, Math.floor((hM - groundH - 0.9) / floorH));
  const bays = Math.max(2, Math.round(wM / 3.3)), bw = cw / bays;
  const lit = [];
  const map = canvasTex(cw, ch, (g) => {
    g.fillStyle = o.wall; g.fillRect(0, 0, cw, ch);
    const base = new THREE.Color(o.wall);
    speckle(g, cw, ch, cw * ch / 14, ['#' + base.clone().offsetHSL(0, 0, 0.04).getHexString(), '#' + base.clone().offsetHSL(0, 0, -0.05).getHexString()], 2);
    if (o.brick) { g.strokeStyle = 'rgba(60,25,15,0.18)'; g.lineWidth = 1; for (let y = 0; y < ch; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); } }
    // cornice
    g.fillStyle = o.band; g.fillRect(0, 0, cw, PPM * 0.9); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, PPM * 0.9, cw, 3);
    const winStyle = rnd();
    for (let f = 0; f < floors; f++) {
      const y0 = ch - (groundH + (f + 1) * floorH) * PPM;
      if (o.bandEvery || winStyle < 0.35) { g.fillStyle = o.band; g.fillRect(0, y0 + floorH * PPM - 4, cw, 4); }
      for (let b = 0; b < bays; b++) {
        const ww = bw * (winStyle < 0.5 ? 0.5 : 0.62), wh = floorH * PPM * (winStyle < 0.5 ? 0.62 : 0.55);
        const x = b * bw + (bw - ww) / 2, y = y0 + floorH * PPM * 0.2;
        g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
        const gr = g.createLinearGradient(x, y, x + ww, y + wh); const sky = rnd();
        gr.addColorStop(0, sky < 0.3 ? '#9fb8cc' : '#44505c'); gr.addColorStop(1, sky < 0.3 ? '#5d7387' : '#262d35');
        g.fillStyle = gr; g.fillRect(x, y, ww, wh);
        if (rnd() < 0.55) { g.fillStyle = pick(['#d9cbb0', '#e8e0d0', '#b8a890', '#6d5a4a']); g.fillRect(x, y, ww, wh * R(0.2, 0.6)); } // curtains
        g.fillStyle = o.trim; g.fillRect(x + ww / 2 - 1, y, 2, wh); g.fillRect(x - 5, y + wh + 2, ww + 10, 4);
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, y, ww, 3); g.fillRect(x, y, 3, wh);
        if (rnd() < 0.3) lit.push([x, y, ww, wh]);
      }
    }
    if (store) {
      const y = ch - groundH * PPM;
      g.fillStyle = pick(SIGNS); g.fillRect(0, y, cw, PPM * 0.95);
      g.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = PPM; x < cw - PPM * 2; x += R(PPM * 1.2, PPM * 2.2)) if (rnd() < 0.7) g.fillRect(x, y + PPM * 0.3, R(PPM * 0.4, PPM * 1.1), PPM * 0.35);
      const gy = y + PPM * 0.95, gh = groundH * PPM - PPM * 0.95;
      g.fillStyle = '#3a3f3f'; g.fillRect(0, gy, cw, gh);
      const panes = Math.max(2, Math.round(wM / 2.4));
      for (let p = 0; p < panes; p++) {
        const x = p * cw / panes + 4, w = cw / panes - 8;
        const gr = g.createLinearGradient(x, gy, x + w * 0.6, gy + gh); gr.addColorStop(0, '#7f9a9e'); gr.addColorStop(0.5, '#3c4c50'); gr.addColorStop(1, '#2a3436');
        g.fillStyle = gr; g.fillRect(x, gy + 4, w, gh - 10);
        if (rnd() < 0.5) { g.fillStyle = pick(['#c8a070', '#8fb0a0', '#d0c0a0', '#a07060']); g.fillRect(x + 4, gy + gh * 0.55, w - 8, gh * 0.3); }
      }
      g.fillStyle = '#c9c2b5'; g.fillRect(0, ch - 5, cw, 5);
    } else {
      for (let b = 0; b < bays; b++) { const ww = bw * 0.5, wh = groundH * PPM * 0.5, x = b * bw + (bw - ww) / 2, y = ch - groundH * PPM * 0.8; g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6); g.fillStyle = '#39434c'; g.fillRect(x, y, ww, wh); }
    }
  });
  const emi = canvasTex(cw, ch, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
    for (const [x, y, ww, wh] of lit) { g.fillStyle = pick(['#ffd28a', '#ffc070', '#ffe0a8', '#f0b060']); g.fillRect(x, y, ww, wh); }
    if (store) { g.fillStyle = '#ffcf8a'; g.fillRect(0, ch - groundH * PPM + PPM * 0.95 + 4, cw, groundH * PPM - PPM * 0.95 - 12); g.fillStyle = '#ffffff'; g.fillRect(0, ch - groundH * PPM + PPM * 0.3, cw, PPM * 0.35); }
  });
  return { map, emi };
}
const winMats = [];
function wallMat(tex) { const m = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.88 }); winMats.push(m); return m; }
const roofMat = M('#77736c', { roughness: 1 });
const sharedFacades = WALLS.map(o => ({ o, side: facade(16, 30, o, false) }));
const buildings = [];
function building(x0, x1, side, h, o, unique) {
  const w = x1 - x0, d = R(14, 22), x = (x0 + x1) / 2, z = side * (12 + d / 2);
  const front = unique ? facade(w, h, o, true) : null;
  const sh = sharedFacades.find(s => s.o === o) || sharedFacades[0];
  const sideMat = wallMat(sh.side); sideMat.map = sh.side.map.clone(); sideMat.map.needsUpdate = true; sideMat.map.wrapS = sideMat.map.wrapT = THREE.RepeatWrapping; sideMat.map.repeat.set(d / 16, h / 30);
  sideMat.emissiveMap = sh.side.emi.clone(); sideMat.emissiveMap.needsUpdate = true; sideMat.emissiveMap.wrapS = sideMat.emissiveMap.wrapT = THREE.RepeatWrapping; sideMat.emissiveMap.repeat.copy(sideMat.map.repeat);
  const frontMat = front ? wallMat(front) : sideMat;
  const mats = [sideMat, sideMat, roofMat, roofMat, side < 0 ? frontMat : sideMat, side > 0 ? frontMat : sideMat];
  const b = mesh(BOX, mats); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  // cornice + parapet
  box(w + 0.6, 0.7, d + 0.6, M(o.band), x, h - 0.35, z);
  box(w, 0.9, 0.3, M(o.band), x, h + 0.45, z - side * (d / 2 - 0.15));
  if (rnd() < 0.6) { const ty = h + 0.9; const tank = new THREE.Group(); tank.position.set(x + R(-w / 4, w / 4), ty, z + R(-d / 5, d / 5)); city.add(tank);
    const tk = mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 12), M('#8a6a4a')); tk.position.y = 3.6; tank.add(tk); const cone = mesh(new THREE.ConeGeometry(1.6, 1.2, 12), M('#5c4a38')); cone.position.y = 5.7; tank.add(cone);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 5), M('#3a3a3a')); l.position.set(lx, 1.05, lz); tank.add(l); } }
  for (let k = 0; k < 3; k++) box(R(1.5, 3), R(1, 2), R(1.5, 3), '#9a968e', x + R(-w / 3, w / 3), h + 0.7, z + R(-d / 3, d / 3));
  // awning
  if (unique && rnd() < 0.8) {
    const ac = pick(AWN); const aw = mesh(BOX, M(ac)); aw.scale.set(w * R(0.6, 0.95), 0.12, 2.2); aw.position.set(x, 3.85, side * (12 - 1.0)); aw.rotation.x = side * 0.28; aw.castShadow = true; city.add(aw);
    box(w * R(0.6, 0.9), 0.5, 0.06, M(ac), x, 3.5, side * (12 - 2.05));
  }
  buildings.push({ x, z, w, d, h, side });
  return b;
}
for (const side of [-1, 1]) {
  for (let bi = 0; bi < CROSS.length - 1; bi++) {
    const a = CROSS[bi] + 7, bEnd = CROSS[bi + 1] - 7;
    let x = a;
    while (x < bEnd - 6) {
      const w = Math.min(bEnd - x, R(13, 26)); const near = x < 420 && x > -120;
      const ts = x > 20 && x < 170; const h = ts ? R(40, 78) : rnd() < 0.15 ? R(38, 52) : R(16, 34);
      building(x, x + w, side, h, pick(WALLS), near);
      x += w;
    }
  }
}
// second row + glass towers
function glassTex() {
  return canvasTex(128, 512, (g, w, h) => {
    const base = pick(['#5f7f99', '#6f8ea6', '#4f6a80', '#7d97a8', '#56707a']);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const c = new THREE.Color(base).offsetHSL(R(-0.01, 0.01), 0, R(-0.12, 0.14)); g.fillStyle = '#' + c.getHexString(); g.fillRect(x, y, 7, 7); }
    g.fillStyle = 'rgba(20,30,40,0.5)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y + 7, w, 1);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
const glassPool = [0, 1, 2, 3, 4].map(() => { const map = glassTex(); const emi = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (rnd() < 0.22) { g.fillStyle = pick(['#ffd28a', '#fff0d0', '#ffc070']); g.fillRect(x, y, 7, 7); } }); return { map, emi }; });
function tower(x, z, w, d, h) {
  const t = pick(glassPool); const mp = t.map.clone(); mp.needsUpdate = true; mp.wrapS = mp.wrapT = THREE.RepeatWrapping; mp.repeat.set(w / 30, h / 120);
  const em = t.emi.clone(); em.needsUpdate = true; em.wrapS = em.wrapT = THREE.RepeatWrapping; em.repeat.copy(mp.repeat);
  const m = new THREE.MeshStandardMaterial({ map: mp, emissiveMap: em, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.35, metalness: 0.25 }); winMats.push(m);
  const b = mesh(BOX, [m, m, roofMat, roofMat, m, m]); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  box(w * 0.7, 3, d * 0.7, '#8d9aa3', x, h + 1.5, z);
}
for (const side of [-1, 1]) for (let x = -200; x < 1300; x += R(22, 40)) {
  const z = side * R(48, 70), h = R(28, 60); const o = pick(WALLS); const tex = pick(sharedFacades).side;
  const m = wallMat(tex); m.map = tex.map.clone(); m.map.needsUpdate = true; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(1.4, h / 30);
  m.emissiveMap = tex.emi.clone(); m.emissiveMap.needsUpdate = true; m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping; m.emissiveMap.repeat.copy(m.map.repeat);
  const b = mesh(BOX, m); b.scale.set(R(18, 30), h, R(16, 26)); b.position.set(x, h / 2, z); city.add(b); box(b.scale.x + 0.5, 0.8, b.scale.z + 0.5, M(o.band), x, h, z);
}
for (let i = 0; i < 46; i++) { const side = rnd() < 0.5 ? -1 : 1; tower(R(120, 1500), side * R(30, 260), R(22, 40), R(22, 40), R(70, 210)); }
for (let i = 0; i < 160; i++) { const side = rnd() < 0.5 ? -1 : 1; const h = R(20, 90); box(R(20, 50), h, R(20, 50), pick(['#a99b8a', '#8f8a84', '#b49a80', '#9aa3aa', '#c2b49c']), R(-300, 2600), h / 2, side * R(80, 900)); }

// ---- street props
const poleMat = M('#3b3e42', { roughness: 0.6, metalness: 0.3 });
function streetLamp(x, z, side) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 6), poleMat); p.position.y = 3.5; g.add(p);
  const arm = mesh(BOX, poleMat); arm.scale.set(0.1, 0.1, 1.6); arm.position.set(0, 6.9, -side * 0.8); g.add(arm);
  const head = mesh(BOX, new THREE.MeshStandardMaterial({ color: '#d8d4c8', emissive: '#ffd9a0', emissiveIntensity: 0 })); head.scale.set(0.35, 0.15, 0.6); head.position.set(0, 6.8, -side * 1.5); g.add(head); lampHeads.push(head.material);
}
const lampHeads = [];
const TL_STATE = [];
function trafficLight(x, z, side, armLen) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.12, 0.15, 6.4, 8), M('#2c2e31', { roughness: 0.5, metalness: 0.4 })); p.position.y = 3.2; g.add(p);
  const arm = mesh(BOX, M('#2c2e31')); arm.scale.set(0.14, 0.14, armLen); arm.position.set(0, 6.1, -side * armLen / 2); g.add(arm);
  for (const zz of [-side * armLen * 0.55, -side * armLen * 0.95, -side * 0.3]) {
    const hgrp = new THREE.Group(); hgrp.position.set(0, zz === -side * 0.3 ? 3.4 : 5.4, zz); g.add(hgrp);
    const housing = mesh(BOX, M('#1d1f22')); housing.scale.set(0.42, 1.25, 0.42); hgrp.add(housing);
    const back = mesh(BOX, M('#e0b52a')); back.scale.set(0.08, 1.45, 0.62); back.position.x = 0.24; hgrp.add(back);
    ['#ff3a2a', '#ffb22a', '#3aff7a'].forEach((c, i) => { const l = mesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshStandardMaterial({ color: '#202020', emissive: c, emissiveIntensity: 0 }), false, false); l.position.set(-0.22, 0.38 - i * 0.38, 0); l.rotation.y = -Math.PI / 2; hgrp.add(l); TL_STATE.push({ m: l.material, i }); });
  }
}
// palm tree
const leafTex = canvasTex(256, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let x = 6; x < w - 6; x += 3) { const L = (1 - x / w) * 26 + 6; for (const s of [-1, 1]) { g.strokeStyle = `rgba(${40 + R(0, 25) | 0},${105 + R(0, 40) | 0},${40 + R(0, 20) | 0},1)`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + L * 0.45, h / 2 + s * L); g.stroke(); } }
  g.strokeStyle = '#5b6b2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
});
const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
const trunkTex = canvasTex(32, 128, (g, w, h) => { g.fillStyle = '#7a6248'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = '#5e4a36'; g.fillRect(0, y, w, 2); g.fillStyle = '#8e7656'; g.fillRect(0, y + 3, w, 2); } }, [1, 6]);
const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex, roughness: 0.95 });
const palms = [];
function palm(x, z, h) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const lean = new THREE.Vector3(R(-1, 1), 0, R(-1, 1)).normalize().multiplyScalar(R(0.4, 1.4));
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(lean.x * u * u, u * h, lean.z * u * u)); }
  const trunk = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.22, 7, false), trunkMat); g.add(trunk);
  const top = pts[8]; const fr = []; const n = 10;
  for (let k = 0; k < n; k++) {
    const L = R(3.6, 4.6); const pg = new THREE.PlaneGeometry(L, 1.7, 10, 1); pg.translate(L / 2, 0, 0); pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position; const droop = R(0.12, 0.2);
    for (let i = 0; i < pa.count; i++) { const xx = pa.getX(i), zz = pa.getZ(i); pa.setY(i, -droop * xx * xx + 0.15 * xx - Math.abs(zz) * 0.35); }
    pg.rotateX(R(-0.3, 0.3)); pg.rotateZ(R(0.05, 0.35)); pg.rotateY(k / n * Math.PI * 2 + R(-0.2, 0.2)); pg.translate(top.x, top.y, top.z); fr.push(pg);
  }
  const fronds = mesh(mergeGeometries(fr), leafMat); g.add(fronds);
  palms.push({ g, fronds, ph: R(0, 6) });
}
// cars
const CAR_COLS = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#e8b923', '#6d7a83', '#3d6b4a', '#8a8f96', '#f0f0ee'];
const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); wheelGeo.rotateX(Math.PI / 2);
const cars = [];
function car(lane, dir, x0, speed) {
  const g = new THREE.Group(); const taxi = rnd() < 0.2; const c = taxi ? '#f2c12e' : pick(CAR_COLS); const big = rnd() < 0.25;
  const L = big ? 4.8 : 4.3, Hh = big ? 0.85 : 0.72;
  box(L, Hh, 1.85, M(c, { roughness: 0.35, metalness: 0.3 }), 0, 0.33 + Hh / 2, 0, g);
  box(L * 0.55, 0.62, 1.68, M(c, { roughness: 0.35, metalness: 0.3 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.53, 0.5, 1.72, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.57, 0.5, 1.6, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, 0.6, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, -0.6, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, 0.62, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, -0.62, g);
  if (taxi) box(0.6, 0.2, 0.3, '#fff6d8', -0.15, 0.33 + Hh + 0.7, 0, g);
  for (const wx of [-L * 0.32, L * 0.32]) for (const wz of [-0.85, 0.85]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, 0.34, wz); g.add(w); }
  g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g);
  cars.push({ g, lane, dir, x0, speed });
}
// people
const people = [];
const jumpers = [];
function person(o) {
  const p = makePerson(rnd); city.add(p.outer); const P = { p, ...o, ph: R(0, 6) }; people.push(P); return P;
}

// ---- populate props
for (const side of [-1, 1]) for (let x = -160; x < 1300; x += 30) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; streetLamp(x, side * 7.6, side); }
// NYC street trees instead of palms (low-poly canopy, autumn colours)
const treeTrunkM = M('#4a3a2c', { roughness: 1 });
const treeLeafMs = ['#b8642a', '#c98a2e', '#8a5a2a', '#a4412a', '#6f7a34'].map(c => M(c, { flatShading: true, roughness: 0.9 }));
const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
function streetTree(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.18, z); city.add(g);
  const tr = mesh(new THREE.CylinderGeometry(0.12, 0.17, 3.2, 6), treeTrunkM); tr.position.y = 1.6; g.add(tr);
  const lm = pick(treeLeafMs);
  for (let k = 0; k < 3; k++) { const c = mesh(canopyGeo, lm); c.position.set(R(-0.6, 0.6), R(3.4, 4.4), R(-0.6, 0.6)); c.scale.set(R(1.3, 1.9), R(1.1, 1.6), R(1.3, 1.9)); c.rotation.set(R(0, 3), R(0, 3), 0); g.add(c); }
}
for (const side of [-1, 1]) for (let x = -150; x < 1300; x += R(13, 19)) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; if (x > 15 && x < 200) continue; streetTree(x, side * R(8.0, 8.4)); }
for (const cx of [30, 165, 300]) { trafficLight(cx - 8.2, -8.0, -1, 7.5); trafficLight(cx + 8.2, 8.0, 1, 7.5); }
for (let i = 0; i < 46; i++) { const dir = rnd() < 0.5 ? 1 : -1; const lane = dir > 0 ? pick([-1.75, -5.25]) : pick([1.75, 5.25]); car(lane, dir, R(-200, 700), R(8, 13)); }
for (let i = 0; i < 18; i++) { const side = rnd() < 0.5 ? -1 : 1; const g = new THREE.Group(); city.add(g); const dirZ = side; cars.push({ g, cross: true }); g.visible = false; }
// parked/benches/bins
for (const side of [-1, 1]) for (let x = -140; x < 600; x += R(18, 34)) {
  if (CROSS.some(c => Math.abs(x - c) < 12)) continue;
    if (rnd() < 0.5) { const b = new THREE.Group(); b.position.set(x, 0.18, side * 10.9); b.rotation.y = side > 0 ? Math.PI : 0; city.add(b); box(1.8, 0.08, 0.5, '#7a5233', 0, 0.45, 0, b); box(1.8, 0.45, 0.06, '#7a5233', 0, 0.75, -0.25, b); for (const sx of [-0.8, 0.8]) box(0.06, 0.45, 0.45, '#2b2b2b', sx, 0.22, 0, b); }
  else { const bin = mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 10), M('#2f4a3a')); bin.position.set(x, 0.63, side * 7.9); city.add(bin); }
}
// pedestrians on sidewalks
for (let i = 0; i < 120; i++) {
  const side = rnd() < 0.5 ? -1 : 1; const walking = rnd() < 0.8;
  person({ kind: walking ? 'walk' : 'idle', z: side * R(8.9, 11.4), x0: R(-60, 260), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.55), rotIdle: R(0, 6) });
}
// crossing pedestrians
for (let i = 0; i < 26; i++) { const xs = pick([30 - 8.6, 30 + 8.6, 165 - 8.6]); person({ kind: 'cross', x: xs + R(-1, 1), z0: R(-11, 11), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.5) }); }
// jumpers (gravity shot) on the corner past the cross street
const JUMP = { g: 0.29 * 9.81, v0: Math.sqrt(2 * 9.81 * 0.5) };   // 0.5 m jump on Earth -> 1.72 m here, 2.2 s in the air
for (let i = 0; i < 9; i++) { const P = person({ kind: 'jump', x: 41 + (i % 5) * 2.2 + R(-0.5, 0.5), z: -8.4 - Math.floor(i / 5) * 2.2 + R(-0.3, 0.3), off: i * 0.37 + R(0, 0.2), rot: R(-2.5, -0.6) }); jumpers.push(P); }
const ball = mesh(new THREE.SphereGeometry(0.12, 12, 10), M('#d9662a', { roughness: 0.6 })); city.add(ball);

// clouds (sprites)
const cloudTex = canvasTex(256, 128, (g, w, h) => {
  for (let i = 0; i < 26; i++) { const x = R(40, w - 40), y = R(50, h - 30), r = R(18, 42); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(250,250,252,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
});
const clouds = [];
for (let i = 0; i < 22; i++) {
  const m = new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, color: '#ffffff', opacity: 0.9 }); const s = new THREE.Sprite(m);
  const ang = R(-0.9, 0.9) + (rnd() < 0.7 ? 0 : Math.PI); const dist = R(2600, 4400);
  s.position.set(Math.cos(ang) * dist, R(250, 520), Math.sin(ang) * dist); const sc = R(1300, 2400); s.scale.set(sc, sc * 0.38, 1);
  city.add(s); clouds.push(s);
}


// =================== Times Square: night sky, billboards, crowd, the incoming asteroid ===================
const ASTEROID_DIR = new THREE.Vector3(Math.cos(ENTRY_DEG * Math.PI / 180), Math.sin(ENTRY_DEG * Math.PI / 180), 0.02).normalize(); // comes in over the end of the street
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSunS: { value: new THREE.Vector3(-0.45, 0.42, 0.78).normalize() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 0.07 }, uDusk: { value: 0.0 },
    uAst: { value: ASTEROID_DIR.clone() }, uGlow: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform vec3 uAst; uniform float uGlow; varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    c+=vec3(0.16,0.08,0.20)*pow(1.0-max(dot(d,uUp),0.0),3.0)*0.6;               // Times Square light dome
    float a=max(dot(d,uAst),0.0);
    c=mix(c, c*vec3(1.0,0.55,0.35), clamp(uGlow,0.0,1.0)*0.5); c+=vec3(1.0,0.32,0.06)*(pow(a,5.0)*0.45+pow(a,30.0)*0.8)*uGlow + vec3(0.55,0.16,0.04)*uGlow*uGlow*0.25;
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 40, 24), domeMat); dome.frustumCulled = false; dome.renderOrder = -10; city.add(dome);
const starMat = new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.55 });
{
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(0.1, 1), R(-1, 1)).normalize().multiplyScalar(4500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  city.add(new THREE.Points(g, starMat));
}

// ---- billboards (made-up ads, no real brands)
const ADS = [
  ['NOVA COLA', '#e8322a', '#ffd23a'], ['BROADWAY', '#1b1b3a', '#ffd86a'], ['LIVE TONIGHT', '#6a1fd0', '#ffffff'], ['MEGA SALE', '#ff7a1a', '#ffffff'],
  ['PIZZA 24/7', '#d9261c', '#fff2c0'], ['SKYLINE', '#0c6fd9', '#ffffff'], ['CINEMA', '#111111', '#ff3355'], ['ZOOM PHONE', '#13c2a3', '#04202a'],
  ['NEW YORK', '#ffffff', '#e8322a'], ['PLANET FM', '#2b2bff', '#9ef0ff'], ['SNACKZ', '#ffcc00', '#c4161c'], ['GALAXY TV', '#000000', '#38f5ff'],
  ['HOTEL 42', '#7a0f3a', '#ffd6e6'], ['RUN FAST', '#00b34a', '#ffffff'], ['ICE CREAM', '#ff8fc8', '#ffffff'], ['THE SHOW', '#b30000', '#ffe08a'],
];
function adTex(i, w, h) {
  const [word, bg, fg] = ADS[i % ADS.length];
  return canvasTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#' + new THREE.Color(bg).offsetHSL(R(-0.08, 0.08), 0, R(-0.2, 0.15)).getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const style = i % 4;
    if (style === 1) { g.fillStyle = 'rgba(255,255,255,0.18)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(R(0, w), R(0, h), R(20, h * 0.6), 0, Math.PI * 2); g.fill(); } }
    if (style === 2) { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 10, h); }
    if (style === 3) { g.fillStyle = fg; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.4, 0); g.lineTo(w * 0.6, 0); g.lineTo(w * 0.2, h); g.fill(); g.globalAlpha = 1; }
    let fs = h * 0.42; g.font = `900 ${fs}px Inter, Arial, sans-serif`; while (g.measureText(word).width > w * 0.86 && fs > 10) { fs -= 4; g.font = `900 ${fs}px Inter, Arial, sans-serif`; }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2);
    g.strokeStyle = fg; g.lineWidth = 6; g.globalAlpha = 0.6; g.strokeRect(6, 6, w - 12, h - 12); g.globalAlpha = 1;
  });
}
const adMats = [];
function billboard(i, w, h, pos, rotY) {
  const ratio = w / h, tw = 512, th = Math.max(64, Math.round(512 / ratio));
  const m = new THREE.MeshBasicMaterial({ map: adTex(i, tw, th), fog: false, toneMapped: true }); m.color.setScalar(1.5); adMats.push(m);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.copy(pos); p.rotation.y = rotY; city.add(p);
  const fr = mesh(BOX, M('#1a1a1c')); fr.scale.set(w + 0.6, h + 0.6, 0.4); fr.position.copy(pos); fr.rotation.y = rotY; if (rotY === 0) fr.position.z -= 0.25; else if (rotY === Math.PI) fr.position.z += 0.25; else fr.position.x += 0.25; city.add(fr);
  return p;
}
{
  let k = 0;
  for (const side of [-1, 1]) for (let x = 36; x < 160; x += R(11, 20)) {
    if (CROSS.some(c => Math.abs(x - c) < 9)) continue;
    let y = R(7, 11);
    while (y < 46) { const w = R(8, 16), h = R(4, 9); billboard(k++, w, h, new THREE.Vector3(x + R(-2, 2), y + h / 2, side * 11.7), side < 0 ? 0 : Math.PI); y += h + R(1.5, 6); }
  }
  // the tower at the end of the square, covered in screens
  const TX = 186;
  const tw = mesh(BOX, M('#2a2c30', { roughness: 0.6 })); tw.scale.set(20, 64, 24); tw.position.set(TX + 10, 32, 0); city.add(tw);
  let y = 9; while (y < 54) { const h = R(7, 13); const p = billboard(k++, 21, h, new THREE.Vector3(TX - 0.3, y + h / 2, 0), -Math.PI / 2); y += h + 1.2; }
  box(14, 6, 14, '#3a3c40', TX + 10, 67, 0); const pole = mesh(new THREE.CylinderGeometry(0.4, 0.6, 22, 6), M('#5a5c60')); pole.position.set(TX + 10, 81, 0); city.add(pole);
  // red steps stand in the square (Duffy Square style)
  for (let i = 0; i < 7; i++) box(10, 0.45, 1.4, M('#b3261e', { roughness: 0.5 }), 128, 0.25 + i * 0.45, -3.5 - i * 1.2);
}
// ---- crowd standing in the square, looking up the street
const crowd = [];
for (let i = 0; i < 90; i++) {
  const p = makePerson(rnd); city.add(p.outer);
  const x = R(84, 150), z = R(-6.2, 6.2);
  if (Math.abs(x - 128) < 7 && z < -2) { city.remove(p.outer); continue; }
  crowd.push({ p, x, z, ry: Math.PI / 2 + R(-0.5, 0.5), ph: R(0, 6) });
}
function updateCrowd(t) {
  for (const c of crowd) { c.p.outer.position.set(c.x, 0.95, c.z); c.p.outer.rotation.set(0, c.ry, 0); poseIdle(c.p, t, c.ph); c.p.outer.visible = Math.hypot(c.x - cam.position.x, c.z - cam.position.z) > 2.2; }
}
// ---- the asteroid seen from the street: real angular size for 1 mile at the real distance
function astRockGeo(detail, amp, sd) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; const v = new THREE.Vector3();
  const bumps = Array.from({ length: 14 }, () => [new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), R(0.15, 0.5), R(-1, 1)]);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); let r = 1; for (const [c, w, a] of bumps) r += a * amp * Math.exp(-(1 - v.dot(c)) / (w * w * 0.25)); r += (Math.sin(v.x * 9 + sd) * Math.sin(v.y * 7) * Math.sin(v.z * 8)) * amp * 0.25; v.multiplyScalar(r); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
const skyRock = new THREE.Mesh(astRockGeo(2, 0.12, 1), new THREE.MeshStandardMaterial({ color: '#6a5f55', emissive: '#ff7a1e', emissiveIntensity: 0.6, roughness: 0.95, flatShading: true, fog: false }));
city.add(skyRock);
const glowTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,236,200,0.9)'); gr.addColorStop(0.45, 'rgba(255,150,60,0.35)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const skyGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); skyGlow.renderOrder = 5; city.add(skyGlow);
// plasma tail: a stretched glow pointing back along the path (camera-facing ribbon)
const tailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float w=1.0-abs(vUv.y-0.5)*2.0; float f=pow(w,2.0)*pow(1.0-vUv.x,1.5); vec3 c=mix(vec3(1.0,0.32,0.06),vec3(1.0,0.75,0.4),pow(1.0-vUv.x,6.0)*w); gl_FragColor=vec4(c*f*uA*0.7,1.0); }',
});
const tail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), tailMat); tail.frustumCulled = false; city.add(tail);
const astLight = new THREE.DirectionalLight(0xffb070, 0); city.add(astLight, astLight.target);
const distKm = t => Math.max(0.05, V_KMS * (IMPACT - t));          // distance along the path to ground zero
function updateSky(t, camPos) {
  const d = distKm(t); const RD = 3200;                             // rendered at 3.2 km, scaled to the true angular size
  const ang = 1.609 / d;                                             // radians
  const p = camPos.clone().addScaledVector(ASTEROID_DIR, RD);
  skyRock.position.copy(p); skyRock.scale.setScalar(Math.max(RD * ang / 2, 3)); skyRock.rotation.set(t * 0.3, t * 0.5, 0);
  const alt = d * Math.sin(ENTRY_DEG * Math.PI / 180);
  const hot = smooth(110, 40, alt);                                  // glowing once it is in the thick air
  skyRock.material.emissiveIntensity = 0.4 + 1.6 * hot;
  const gs = RD * Math.max(ang * 4.5, 0.03 + 0.03 * hot); skyGlow.position.copy(p).addScaledVector(ASTEROID_DIR, -RD * 0.02); skyGlow.scale.setScalar(gs); skyGlow.material.opacity = 1; skyGlow.material.color.set(hot > 0.3 ? '#ff8a3a' : '#ffe8c8'); if (hot > 0.3) skyGlow.material.color.multiplyScalar(0.75);
  // tail
  const len = RD * Math.min(1.2, 0.05 + hot * 0.9) * (0.3 + ang * 4);
  const dir2 = ASTEROID_DIR.clone(); const mid = p.clone().addScaledVector(dir2, len / 2);
  tail.position.copy(mid); tail.scale.set(len, gs * 0.45, 1);
  // orient: x axis along the path, facing the camera
  const xa = dir2.clone(); const toCam = camPos.clone().sub(mid).normalize(); const ya = new THREE.Vector3().crossVectors(toCam, xa).normalize(); const za = new THREE.Vector3().crossVectors(xa, ya);
  tail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, za));
  tailMat.uniforms.uA.value = hot * 1.4;
  const glow = clamp(Math.pow(ang * 6, 1.3), 0, 1.6) * hot;
  domeMat.uniforms.uGlow.value = glow; starMat.opacity = 0.55 * (1 - clamp(glow, 0, 1));
  astLight.intensity = glow * 2.2; astLight.position.copy(camPos).addScaledVector(ASTEROID_DIR, 300); astLight.target.position.copy(camPos); astLight.target.updateMatrixWorld();
  return glow;
}
// =================== SCALE scene: the asteroid parked next to the Empire State Building (meters, true scale) ===================
const scaleScene = new THREE.Scene(); scaleScene.background = new THREE.Color('#070a14'); scaleScene.fog = new THREE.Fog('#0b1020', 2500, 14000);
const scaleCam = new THREE.PerspectiveCamera(46, W / H, 5, 30000);
scaleScene.add(new THREE.HemisphereLight(0x7d8fc8, 0x4a3420, 1.7));
const scMoon = new THREE.DirectionalLight(0xaebcff, 1.5); scMoon.position.set(-2000, 2500, 3000); scaleScene.add(scMoon);
const scCity = new THREE.PointLight(0xffb070, 2.2, 0, 0); scCity.position.set(400, 120, 900); scaleScene.add(scCity);
const ESB_TIP = 443.2, ROCK_D = 1609.3;
{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 1 })); g.rotation.x = -Math.PI / 2; scaleScene.add(g);
  // window texture for the skyline
  const winTex = canvasTex(64, 256, (g2, w, h) => { g2.fillStyle = '#1b1d24'; g2.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 5) for (let x = 2; x < w; x += 5) if (rnd() < 0.42) { g2.fillStyle = pick(['#ffd28a', '#ffe6b0', '#ffc070', '#d8e4ff']); g2.fillRect(x, y, 3, 3); } });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const bm = new THREE.MeshStandardMaterial({ color: '#4a4c55', map: winTex, emissiveMap: winTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.9, roughness: 0.8 });
  // Manhattan-ish grid of blocks around (0,0); keep the plaza where the rock sits empty
  const N = 1500; const im = new THREE.InstancedMesh(BOX, bm, N); const d = new THREE.Object3D(); let n = 0;
  for (let gx = -40; gx <= 40 && n < N; gx++) for (let gz = -60; gz <= 12 && n < N; gz++) {
    const x = gx * 80 + R(-8, 8), z = gz * 60 + R(-6, 6);
    if (Math.hypot(x + 1010, z) < 900) continue; if (Math.abs(x) < 70 && Math.abs(z) < 50) continue;
    if (rnd() < 0.25) continue;
    const far = Math.hypot(x, z); const h = rnd() < 0.08 ? R(150, 320) : R(25, 110) * (far < 1500 ? 1.2 : 0.8);
    d.position.set(x, h / 2, z); d.scale.set(R(35, 62), h, R(30, 45)); d.updateMatrix(); im.setMatrixAt(n++, d.matrix);
  }
  im.count = n; scaleScene.add(im);
  // Empire State Building: setback tiers + mast (to the tip 1,454 ft)
  const esbTex = canvasTex(64, 256, (g2, w, h) => { g2.fillStyle = '#8a8478'; g2.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 4) for (let x = 3; x < w; x += 5) { g2.fillStyle = rnd() < 0.5 ? '#ffe0a0' : '#3a3a40'; g2.fillRect(x, y, 2, 2); } g2.fillStyle = 'rgba(200,190,170,0.7)'; for (let x = 0; x < w; x += 5) g2.fillRect(x, 0, 1, h); });
  esbTex.wrapS = esbTex.wrapT = THREE.RepeatWrapping;
  const tiers = [[128, 57, 0, 25], [86, 52, 25, 72], [70, 46, 72, 260], [56, 38, 260, 320], [42, 30, 320, 352], [26, 22, 352, 373], [16, 16, 373, 381]];
  for (const [w, dd, y0, y1] of tiers) {
    const mt = new THREE.MeshStandardMaterial({ color: '#c8c0b0', map: esbTex.clone(), emissiveMap: esbTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.7 });
    mt.map.needsUpdate = true; mt.map.repeat.set(w / 40, (y1 - y0) / 30); mt.emissiveMap = mt.map;
    const b = new THREE.Mesh(BOX, mt); b.scale.set(w, y1 - y0, dd); b.position.set(0, (y0 + y1) / 2, 0); scaleScene.add(b);
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 22, 8), new THREE.MeshStandardMaterial({ color: '#e8e0ff', emissive: '#e8e8ff', emissiveIntensity: 1.6 })); crown.position.set(0, 392, 0); scaleScene.add(crown);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.5, ESB_TIP - 403, 6), new THREE.MeshStandardMaterial({ color: '#c0c0c8', emissive: '#ff5050', emissiveIntensity: 0.25 })); mast.position.set(0, 403 + (ESB_TIP - 403) / 2, 0); scaleScene.add(mast);
}
const bigRock = new THREE.Mesh(astRockGeo(4, 0.1, 2), new THREE.MeshStandardMaterial({ color: '#7a7066', roughness: 0.95, flatShading: true }));
bigRock.scale.setScalar(ROCK_D / 2 / 1.06); bigRock.position.set(-1010, ROCK_D / 2 * 0.97, 0); scaleScene.add(bigRock);
// craters / dark patches on the rock via vertex colours
{
  const g = bigRock.geometry, p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), v = new THREE.Vector3();
  const spots = Array.from({ length: 22 }, () => [new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), R(0.08, 0.25)]);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); let k = 0; for (const [s, r] of spots) k = Math.max(k, smooth(r, r * 0.4, v.distanceTo(s))); c.set('#8a8076').lerp(new THREE.Color('#4a423c'), k * 0.8).offsetHSL(0, 0, R(-0.04, 0.04)); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); bigRock.material.vertexColors = true; bigRock.material.color.set('#ffffff');
}
function scaleCamera(t) {
  const u = ease((t - T_SCALE) / (T_SPACE - T_SCALE));
  const look = new THREE.Vector3(lerp(-760, -800, u), lerp(1020, 960, u), 0);
  const pos = new THREE.Vector3(lerp(-620, -820, u), lerp(420, 300, u), lerp(5900, 5500, u));
  scaleCam.position.copy(pos); scaleCam.lookAt(look); scaleCam.updateProjectionMatrix();
  bigRock.rotation.set(0.2, t * 0.04, 0.1);
}
// =================== SPACE scene: low-poly globe (ER = 10 units = 6,371 km) ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#020308');
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.002, 3000);
{
  const n = 5000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(900); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
}
space.add(new THREE.AmbientLight(0x5a6a90, 1.1));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 3.0); space.add(spaceSun);
const ER = 10, KM = ER / 6371;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const GZ = ll2v(40.758, -73.9855);                       // ground zero on the globe
const GZn = GZ.clone().normalize();
// local frame at ground zero: east / north
const EAST = new THREE.Vector3(0, 1, 0).cross(GZn).normalize(), NORTH = GZn.clone().cross(EAST).normalize();
// the path comes in from the east-southeast at 45 degrees
const PATH_H = EAST.clone().multiplyScalar(0.94).addScaledVector(NORTH, -0.34).normalize();
const PATH = PATH_H.clone().multiplyScalar(Math.cos(ENTRY_DEG * Math.PI / 180)).addScaledVector(GZn, Math.sin(ENTRY_DEG * Math.PI / 180)).normalize();
const globe = new THREE.Group(); space.add(globe);
const cityDots = [];
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry];
  const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) {
    if (ring.every(([, la]) => la < -55)) continue;
    let prev = ring[0][0], off = 0; const pts = [];
    for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); }
  }
  const img = g.getImageData(0, 0, MW, MH).data;
  const isLand = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 60); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
    const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6');
    else if (isLand(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); }
    else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.035, 96, 64), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vW=normalize((modelMatrix*vec4(position,1.)).xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.4); float l=0.25+0.75*smoothstep(-0.3,0.4,dot(vW,uSun)); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.3*l; }'
  })); globe.add(atm); atmMesh = atm;
  // city lights on the night side (metros from the zombie map list)
  for (const [n, la, lo, pop] of METROS_LL) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc77a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.copy(ll2v(la, lo, ER * 1.002)); s.scale.setScalar(0.012 + 0.012 * Math.sqrt(pop)); globe.add(s); cityDots.push(s);
  }
  for (let i = 0; i < 160; i++) {
    const v2 = ll2v(R(-60, 65), R(-180, 180), ER * 1.012); const s = mesh(cloudGeo, cloudMat, false, false); cloudWisps.push(s);
    s.position.copy(v2); s.lookAt(0, 0, 0); s.scale.set(R(0.3, 0.9), R(0.15, 0.4), 0.05); globe.add(s);
  }
}
let atmMesh = null; const cloudWisps = [];
const cloudGeo = new THREE.IcosahedronGeometry(1, 0), cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, flatShading: true });
const METROS_LL = [['New York', 40.71, -74.0, 19.8], ['Philadelphia', 39.95, -75.17, 6.2], ['Boston', 42.36, -71.06, 4.9], ['Washington', 38.9, -77.04, 6.4], ['Baltimore', 39.29, -76.61, 2.8],
  ['Pittsburgh', 40.44, -79.99, 2.4], ['Chicago', 41.88, -87.63, 9.6], ['Detroit', 42.33, -83.05, 4.4], ['Atlanta', 33.75, -84.39, 6.1], ['Miami', 25.76, -80.19, 6.1], ['Toronto', 43.65, -79.38, 6.4],
  ['Montreal', 45.5, -73.57, 4.3], ['Charlotte', 35.23, -80.84, 2.7], ['Cleveland', 41.5, -81.69, 2.1], ['Columbus', 39.96, -83.0, 2.1], ['Raleigh', 35.78, -78.64, 1.4], ['Richmond', 37.54, -77.44, 1.3],
  ['Hartford', 41.76, -72.67, 1.2], ['Providence', 41.82, -71.41, 1.7], ['Buffalo', 42.89, -78.88, 1.2], ['Orlando', 28.54, -81.38, 2.7], ['Tampa', 27.95, -82.46, 3.2], ['Nashville', 36.16, -86.78, 2.0],
  ['St. Louis', 38.63, -90.2, 2.8], ['Minneapolis', 44.98, -93.27, 3.7], ['Dallas', 32.78, -96.8, 7.6], ['Houston', 29.76, -95.37, 7.1], ['Denver', 39.74, -104.99, 3.0], ['Indianapolis', 39.77, -86.16, 2.1],
  ['Cincinnati', 39.1, -84.51, 2.3], ['Jacksonville', 30.33, -81.66, 1.6], ['Albany', 42.65, -73.75, 0.9], ['Norfolk', 36.85, -75.98, 1.8], ['Ottawa', 45.42, -75.69, 1.4], ['Quebec', 46.81, -71.21, 0.8]];
// ---- the asteroid on the globe: glowing head + plasma trail along the real path (true scale, 1 unit = 637 km)
const gHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffe2b0' })); space.add(gHead);
const gTrailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float w=1.0-abs(vUv.y-0.5)*2.0; float f=pow(w,1.6)*pow(1.0-vUv.x,1.2); vec3 c=mix(vec3(1.0,0.4,0.12),vec3(1.0,0.92,0.75),pow(1.0-vUv.x,4.0)); gl_FragColor=vec4(c*f*uA,1.0); }',
});
const gTrail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), gTrailMat); gTrail.frustumCulled = false; space.add(gTrail);
const ENTRY_KM = 100 / Math.sin(ENTRY_DEG * Math.PI / 180);          // path length inside 100 km of air
function updateGlobeAsteroid(t, show) {
  gHead.visible = gTrail.visible = show; if (!show) return;
  const d = distKm(t) * KM; const head = GZ.clone().addScaledVector(PATH, d);
  gHead.position.copy(head); gHead.scale.setScalar(0.07 + 0.02 * Math.sin(t * 40) ** 2);
  const len = Math.max(0.001, (ENTRY_KM * KM - d) * 1.0); const mid = head.clone().addScaledVector(PATH, len / 2);
  gTrail.position.copy(mid); gTrail.scale.set(len, 0.03, 1);
  const xa = PATH.clone(); const toCam = spaceCam.position.clone().sub(mid).normalize(); const ya = new THREE.Vector3().crossVectors(toCam, xa).normalize(); const za = new THREE.Vector3().crossVectors(xa, ya);
  gTrail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, za));
}
// ---- dust shell (MODEL): spreads from ground zero over the whole planet
const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uGZ: { value: GZn.clone() }, uSpread: { value: 0 }, uA: { value: 0 }, uTime: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 uGZ; uniform float uSpread, uA, uTime; varying vec3 vP;
    float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){ float a=acos(clamp(dot(vP,uGZ),-1.0,1.0));
      float n=n3(vP*4.0+vec3(uTime*0.05,0.0,0.0))*0.6+n3(vP*11.0)*0.4;
      float cov=smoothstep(uSpread+0.25,uSpread-0.35,a+(n-0.5)*0.9);
      vec3 c=mix(vec3(0.36,0.30,0.25),vec3(0.55,0.48,0.40),n);
      gl_FragColor=vec4(c,cov*uA*(0.55+0.4*n)); }`,
});
const dustShell = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.02, 96, 64), dustMat); space.add(dustShell);
// ---- calm finale: tracked near-Earth asteroids (stylised orbits, not to scale)
const orbits = new THREE.Group(); space.add(orbits);
const orbitDots = [];
{
  const lm = new THREE.LineBasicMaterial({ color: '#5fd3c8', transparent: true, opacity: 0.28 });
  for (let i = 0; i < 26; i++) {
    const a = R(16, 40), e = R(0.1, 0.5), b = a * Math.sqrt(1 - e * e); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R(-0.6, 0.6), R(0, 6.28), R(-0.6, 0.6)));
    const pts = []; for (let k = 0; k <= 128; k++) { const th = k / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(th) * a - a * e, 0, Math.sin(th) * b).applyQuaternion(q)); }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm); orbits.add(ln);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#8ff5e8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(0.9); orbits.add(s);
    orbitDots.push({ s, a, b, e, q, ph: R(0, 6.28), w: R(0.15, 0.35) });
  }
}
function updateOrbits(t, k) {
  orbits.visible = k > 0.001; orbits.children.forEach(o => { if (o.material) o.material.opacity = (o.isLine ? 0.28 : 1) * k; });
  for (const o of orbitDots) { const th = o.ph + t * o.w; o.s.position.set(Math.cos(th) * o.a - o.a * o.e, 0, Math.sin(th) * o.b).applyQuaternion(o.q); }
}
function spaceCamera(t) {
  let pos, look, up = new THREE.Vector3(0, 1, 0), fov = 40;
  // sun just set over New York: the East Coast sits on the night side, close to the terminator
  const sunDir = GZn.clone().multiplyScalar(-0.15).addScaledVector(EAST, -0.98).addScaledVector(NORTH, -0.1).normalize();
  spaceSun.position.copy(sunDir.clone().multiplyScalar(100)); if (atmMesh) atmMesh.material.uniforms.uSun.value.copy(sunDir);
  if (t < T_DESC) {           // entry over the East Coast: low orbit-ish view looking down the path
    const u = (t - T_SPACE) / (T_DESC - T_SPACE);
    const alt = lerp(1300, 950, ease(u)) * KM;
    pos = GZ.clone().addScaledVector(GZn, alt).addScaledVector(NORTH, lerp(-1100, -850, u) * KM).addScaledVector(EAST, lerp(-500, -380, u) * KM);
    look = GZ.clone().addScaledVector(PATH, 50 * KM).addScaledVector(NORTH, 120 * KM); up = GZn.clone(); fov = 44;
  } else if (t < T_CALM) {    // dust spreading
    const u = (t - T_DUST) / (T_CALM - T_DUST);
    const dir = GZn.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.35, -0.25, u)).normalize();
    pos = dir.multiplyScalar(lerp(34, 40, u)).add(new THREE.Vector3(0, 6, 0)); look = new THREE.Vector3(0, 0, 0); fov = 40;
  } else {                    // calm: pull back, tracked asteroids around Earth
    const u = (t - T_CALM) / (T_END + 1 - T_CALM);
    const dir = GZn.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.25 - 0.35 * u).normalize();
    pos = dir.multiplyScalar(lerp(48, 105, ease(u))).add(new THREE.Vector3(0, lerp(10, 30, u), 0)); look = new THREE.Vector3(0, 0, 0); fov = 40;
  }
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos); spaceCam.up.copy(up); spaceCam.lookAt(look);
}
function updateSpace(t) {
  spaceCamera(t);
  updateGlobeAsteroid(t, t < T_DESC);
  const dk = smooth(T_DUST, T_DUST + 0.4, t) * (1 - smooth(T_CALM - 0.3, T_CALM + 0.6, t));
  dustMat.uniforms.uA.value = dk; dustMat.uniforms.uTime.value = t; dustMat.uniforms.uSpread.value = lerp(0.15, 2.9, smooth(T_DUST, T_CALM - 0.2, t));
  dustShell.visible = dk > 0.001;
  updateOrbits(t, smooth(T_CALM + 0.3, T_CALM + 1.5, t));
  for (const s of cityDots) s.material.opacity = 1;
  for (const c of cloudWisps) c.visible = !dustShell.visible && t >= T_DESC;
}
// =================== MAP scene: 1 unit = 1 km around ground zero (azimuthal equidistant; x east, z south) ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#03050b');
const mapCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 20000);
mapScene.add(new THREE.HemisphereLight(0x8fa0c8, 0x101018, 0.8));
const mapKey = new THREE.DirectionalLight(0xc8d4ff, 0.9); mapKey.position.set(-300, 900, 700); mapScene.add(mapKey);
const fireLight = new THREE.PointLight(0xffa050, 0, 0, 1.2); fireLight.position.set(0, 8, 0); mapScene.add(fireLight);
const CRATER_R = 10.7, FIRE_R = 19.6, HEAT_R = 211;          // km (Impact: Earth!)
// air-blast arrival time (s) vs distance (km), and peak wind (mph) — Impact: Earth! text outputs for this impact
const BLAST_T = [[0, 0], [16, 151], [40, 187], [130, 419], [300, 920], [1000, 3033]];
const BLAST_WIND = [[16, 5427], [40, 1853], [130, 369], [300, 96], [1000, 17.7]];
function blastR(s) { for (let i = 1; i < BLAST_T.length; i++) if (s <= BLAST_T[i][1]) { const [ra, ta] = BLAST_T[i - 1], [rb, tb] = BLAST_T[i]; return lerp(ra, rb, (s - ta) / (tb - ta)); } return 1000; }
function windAt(r) { r = clamp(r, 16, 1000); for (let i = 1; i < BLAST_WIND.length; i++) if (r <= BLAST_WIND[i][0]) { const [ra, wa] = BLAST_WIND[i - 1], [rb, wb] = BLAST_WIND[i]; const k = Math.log(r / ra) / Math.log(rb / ra); return Math.exp(lerp(Math.log(wa), Math.log(wb), k)); } return 17.7; }
let azProj = null; const kmXY = (lat, lon) => { const [x, y] = azProj([lon, lat]); return [x, y]; };
const NEAR = 64;
async function buildMap() {
  const data = await (await fetch('data/asteroid_land.json')).json();
  azProj = d3.geoAzimuthalEquidistant().rotate([-data.center[0], -data.center[1]]).scale(6371).translate([0, 0]);
  const LIM = data.lim;
  const drawPolys = (g, polys, s, o) => { for (const poly of polys) { g.beginPath(); for (const ring of poly) { ring.forEach(([x, y], i) => { const px = (x + o) * s, py = (y + o) * s; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); } g.fill('evenodd'); } };
  // --- regional texture (R land, G lights, B state borders)
  const RN = 4096, rs = RN / (2 * LIM);
  const mask = document.createElement('canvas'); mask.width = mask.height = RN; let g = mask.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, RN, RN); g.fillStyle = '#fff';
  drawPolys(g, data.canada, rs, LIM); drawPolys(g, data.land, rs, LIM);
  const bord = document.createElement('canvas'); bord.width = bord.height = RN; const gb = bord.getContext('2d'); gb.strokeStyle = '#fff'; gb.lineWidth = 2.2;
  for (const l of data.borders) { gb.beginPath(); l.forEach(([x, y], i) => { const px = (x + LIM) * rs, py = (y + LIM) * rs; i ? gb.lineTo(px, py) : gb.moveTo(px, py); }); gb.stroke(); }
  const LN = 2048, ls = LN / (2 * LIM); const lights = new Float32Array(LN * LN);
  const mets = METROS_LL.map(([n, la, lo, pop]) => { const [x, y] = kmXY(la, lo); return { x, y, pop }; }).concat(TOWNS.map(([la, lo, pop]) => { const [x, y] = kmXY(la, lo); return { x, y, pop }; }));
  for (const m of mets) {
    const sig = 2.5 + 4.5 * Math.sqrt(m.pop), cx = (m.x + LIM) * ls, cy = (m.y + LIM) * ls, rp = Math.ceil(sig * 3 * ls);
    for (let y = Math.max(0, Math.floor(cy - rp)); y < Math.min(LN, cy + rp); y++) for (let x = Math.max(0, Math.floor(cx - rp)); x < Math.min(LN, cx + rp); x++) {
      const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (ls * ls); lights[y * LN + x] += Math.min(1.4, 0.45 + 0.3 * Math.sqrt(m.pop)) * Math.exp(-d2 / (2 * sig * sig));
    }
  }
  const lc = document.createElement('canvas'); lc.width = lc.height = LN; const glc = lc.getContext('2d'); const lid = glc.createImageData(LN, LN);
  let sd = 7; const hrand = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < LN * LN; i++) { const v = Math.min(1, lights[i] + 0.04) * (0.35 + 0.65 * hrand() ** 2); lid.data[i * 4] = lid.data[i * 4 + 1] = lid.data[i * 4 + 2] = v * 255; lid.data[i * 4 + 3] = 255; }
  glc.putImageData(lid, 0, 0);
  const lbig = document.createElement('canvas'); lbig.width = lbig.height = RN; const glb = lbig.getContext('2d'); glb.imageSmoothingEnabled = true; glb.drawImage(lc, 0, 0, RN, RN);
  regTex = packTex(RN, mask, lbig, bord);
  // --- near texture (±64 km, R land, G lights, B Manhattan)
  const NN = 2048, ns = NN / (2 * NEAR);
  const m2 = document.createElement('canvas'); m2.width = m2.height = NN; g = m2.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, NN, NN); g.fillStyle = '#fff'; drawPolys(g, data.land, ns, NEAR);
  const mh = document.createElement('canvas'); mh.width = mh.height = NN; const gm = mh.getContext('2d'); gm.fillStyle = '#000'; gm.fillRect(0, 0, NN, NN); gm.fillStyle = '#fff'; drawPolys(gm, data.manhattan, ns, NEAR);
  const l2 = document.createElement('canvas'); l2.width = l2.height = NN; const gl2 = l2.getContext('2d'); const id2 = gl2.createImageData(NN, NN);
  for (let y = 0; y < NN; y++) for (let x = 0; x < NN; x++) {
    const kx = x / ns - NEAR, ky = y / ns - NEAR; const d = Math.hypot(kx, ky + 3);
    const dens = 0.25 + 0.75 * Math.exp(-d / 22);                       // brightest over Midtown, dimmer toward the suburbs
    const grid = (Math.abs(((kx * 0.87 - ky * 0.48) / 0.27) % 1) < 0.2 || Math.abs(((kx * 0.48 + ky * 0.87) / 0.08) % 1) < 0.25) ? 1 : 0.45; // street grid tilted like Manhattan's
    const v = Math.min(1, dens * grid * (0.4 + 0.6 * hrand() ** 1.5)); const i = (y * NN + x) * 4; id2.data[i] = id2.data[i + 1] = id2.data[i + 2] = v * 255; id2.data[i + 3] = 255;
  }
  gl2.putImageData(id2, 0, 0);
  nearTex = packTex(NN, m2, l2, mh);
  mapMat.uniforms.uReg.value = regTex; mapMat.uniforms.uNear.value = nearTex; mapMat.uniforms.uLim.value = LIM;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * LIM, 2 * LIM, 1, 1), mapMat); plane.rotation.x = -Math.PI / 2; mapScene.add(plane);
  buildLabels();
}
const TOWNS = [[40.22, -74.76, 0.4], [41.31, -72.92, 0.8], [40.6, -75.47, 0.8], [41.18, -73.19, 0.9], [42.1, -72.59, 0.7], [39.16, -75.52, 0.2], [39.74, -75.55, 0.6], [40.27, -76.88, 0.6],
  [41.41, -75.66, 0.5], [43.05, -76.15, 0.6], [43.1, -75.23, 0.3], [41.5, -74.01, 0.3], [40.92, -73.2, 1.2], [40.73, -73.6, 1.5], [39.36, -74.42, 0.3], [42.27, -71.8, 0.9], [42.99, -71.46, 0.4], [38.98, -76.49, 0.4], [39.96, -76.73, 0.4], [40.04, -76.31, 0.5]];
function packTex(N, rC, gC, bC) {
  const r = rC.getContext('2d').getImageData(0, 0, N, N).data, gg = gC.getContext('2d').getImageData(0, 0, N, N).data, b = bC.getContext('2d').getImageData(0, 0, N, N).data;
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4, o = ((N - 1 - y) * N + x) * 4; out[o] = r[i]; out[o + 1] = Math.min(r[i], gg[i]); out[o + 2] = b[i]; out[o + 3] = 255; }
  const t = new THREE.DataTexture(out, N, N, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return t;
}
let regTex = null, nearTex = null;
const mapMat = new THREE.ShaderMaterial({
  uniforms: { uReg: { value: null }, uNear: { value: null }, uLim: { value: 900 }, uTime: { value: 0 }, uLW: { value: 1 },
    uFire: { value: new THREE.Vector2(0, 0) }, uShock: { value: new THREE.Vector2(0, 0) }, uCrat: { value: 0 }, uMelt: { value: 0 }, uManh: { value: 0 },
    uHeat: { value: new THREE.Vector2(0, 0) }, uQuake: { value: new THREE.Vector2(0, 0) }, uBlast: { value: new THREE.Vector2(0, 0) }, uOut: { value: 0 }, uEj: { value: 0 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D uReg, uNear; uniform float uLim, uTime, uLW, uCrat, uMelt, uManh, uOut, uEj; uniform vec2 uFire, uShock, uHeat, uQuake, uBlast; varying vec3 vW;
    float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
    float ring(float d, float r, float w){ return exp(-pow((d-r)/w,2.0)); }
    void main(){
      vec2 p=vW.xz; float d=length(p);
      vec4 rg=texture2D(uReg, vec2(p.x/(2.0*uLim)+0.5, 1.0-(p.y/(2.0*uLim)+0.5)));
      float nk=smoothstep(${NEAR.toFixed(1)}, ${(NEAR - 8).toFixed(1)}, max(abs(p.x),abs(p.y)));
      vec4 nr=texture2D(uNear, vec2(p.x/${(2 * NEAR).toFixed(1)}+0.5, 1.0-(p.y/${(2 * NEAR).toFixed(1)}+0.5)));
      float land=mix(rg.r, nr.r, nk), lit=mix(rg.g, nr.g, nk), bord=rg.b*(1.0-nk), manh=nr.b*nk;
      vec3 water=vec3(0.018,0.032,0.065)+vec3(0.0,0.01,0.02)*n2(p*0.05);
      vec3 ground=vec3(0.065,0.078,0.10)+vec3(0.02)*n2(p*0.3);
      vec3 col=mix(water, ground, land);
      float out_=uOut>0.0 ? smoothstep(uOut, uOut-6.0, d)*(d<170.0?1.0:0.55) : 0.0;
      col+=vec3(1.0,0.72,0.38)*pow(lit,1.6)*1.5*land*(1.0-out_);
      col+=vec3(0.45,0.5,0.62)*bord*0.35;
      // scorched ground after the fireball, ejecta blanket
      float sc=smoothstep(45.0, 12.0, d)*step(0.001,uOut);
      col=mix(col, vec3(0.05,0.035,0.03)+vec3(0.5,0.12,0.02)*pow(n2(p*1.7),6.0)*0.8, sc*0.85);
      float ej=uEj*clamp(pow(${CRATER_R.toFixed(1)}/max(d,1.0),1.4),0.0,1.0);
      col=mix(col, vec3(0.30,0.26,0.22)*(0.7+0.5*n2(p*2.0)), ej*0.9);
      // crater: bowl, melt, rim
      if(uCrat>0.0){
        float bowl=smoothstep(${CRATER_R.toFixed(1)}+0.4, ${CRATER_R.toFixed(1)}-1.2, d);
        vec3 bc=vec3(0.07,0.055,0.05)*(0.6+0.8*smoothstep(0.0,${CRATER_R.toFixed(1)},d))+vec3(0.08)*n2(p*3.0)*0.4;
        float mn=n2(p*1.3+vec2(uTime*0.15,0.0))*0.6+n2(p*4.0-vec2(0.0,uTime*0.2))*0.4;
        bc+=vec3(1.0,0.32,0.06)*uMelt*smoothstep(0.38,0.75,mn)*smoothstep(${(CRATER_R * 0.85).toFixed(1)},2.0,d)*1.6;
        col=mix(col, bc, bowl*uCrat);
        col+=vec3(0.45,0.4,0.36)*ring(d, ${CRATER_R.toFixed(1)}, 0.35)*uCrat*0.35;
      }
      // Manhattan outline (drawn over the crater for scale)
      col=mix(col, vec3(0.2,0.75,0.85), manh*uManh*0.22); col+=vec3(0.4,1.0,1.0)*manh*(1.0-manh)*4.0*uManh*1.2;
      // fireball light on the ground
      col+=vec3(1.0,0.55,0.22)*uFire.y*exp(-d/max(uFire.x*1.3,1.0))*1.4;
      col+=vec3(1.0,0.95,0.85)*ring(d,uShock.x,max(uLW*1.5,0.6))*uShock.y;
      // heat (light-speed): orange disc + ring
      col=mix(col, vec3(0.9,0.3,0.06), uHeat.y*0.28*smoothstep(uHeat.x+2.0,uHeat.x-6.0,d));
      col+=vec3(1.0,0.5,0.15)*ring(d,uHeat.x,uLW*1.2)*uHeat.y*1.2;
      // quake ring (blue) with trailing ripples
      float qr=ring(d,uQuake.x,uLW*1.3)+0.45*ring(d,uQuake.x-uLW*7.0,uLW*1.0)+0.2*ring(d,uQuake.x-uLW*14.0,uLW*0.9);
      col+=vec3(0.4,0.75,1.0)*qr*uQuake.y*1.3; col=mix(col, col*vec3(0.85,0.95,1.15), uQuake.y*0.5*smoothstep(uQuake.x,uQuake.x-30.0,d)*step(0.5,uQuake.x));
      // air blast (white front, haze behind)
      col+=vec3(1.0,1.0,1.0)*ring(d,uBlast.x,uLW*1.6)*uBlast.y*1.4;
      col=mix(col, vec3(0.55,0.5,0.48), uBlast.y*0.22*smoothstep(uBlast.x,uBlast.x-uLW*25.0,d)*step(0.5,uBlast.x));
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
// ---- crater rim + central peak (rim height exaggerated ~2x so it reads from the air)
const rimMat = new THREE.MeshStandardMaterial({ color: '#4a4038', roughness: 1, flatShading: true });
const rimGeo = new THREE.LatheGeometry([[CRATER_R - 1.6, -0.02], [CRATER_R - 0.6, 0.35], [CRATER_R, 0.55], [CRATER_R + 1.2, 0.3], [CRATER_R + 4.5, 0.0]].map(([x, y]) => new THREE.Vector2(x, y)), 96);
{ const p = rimGeo.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) * (1 + 0.35 * Math.sin(a * 7) * Math.sin(a * 3 + 1))); } rimGeo.computeVertexNormals(); }
const rim = new THREE.Mesh(rimGeo, rimMat); mapScene.add(rim);
const peak = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.5, 9), new THREE.MeshStandardMaterial({ color: '#3a2f28', roughness: 1, flatShading: true, emissive: '#ff5a10', emissiveIntensity: 0 })); peak.scale.set(0.6, 1, 0.6); peak.position.y = 0.25; /* central peak left out: reads as a dot from the air */
// ---- fireball: expanding dome, then a rising plume of smoke
const fireMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uHot: { value: 1 }, uA: { value: 1 } },
  vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: `uniform float uT, uHot, uA; varying vec3 vP; varying vec3 vN; varying vec3 vV;
    float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){ float n=n3(vP*4.0+vec3(0.0,-uT*0.8,0.0))*0.55+n3(vP*9.0-vec3(uT*0.5))*0.3+n3(vP*20.0)*0.15;
      float rim=pow(1.0-abs(dot(vN,vV)),1.5);
      vec3 hot=mix(vec3(1.0,0.55,0.15),vec3(1.0,0.97,0.85),smoothstep(0.35,0.8,n)*uHot);
      vec3 smoke=mix(vec3(0.16,0.12,0.10),vec3(0.55,0.25,0.10),n*n);
      vec3 c=mix(smoke,hot*2.2,uHot*(0.5+0.5*n));
      float a=uA*(0.75+0.25*n)*(1.0-0.5*rim*(1.0-uHot));
      gl_FragColor=vec4(c,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), fireMat); mapScene.add(fireball);
const plume = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), fireMat); mapScene.add(plume);
const stemGeo = new THREE.CylinderGeometry(0.55, 1, 1, 32, 1, true); stemGeo.translate(0, 0.5, 0); const stem = new THREE.Mesh(stemGeo, fireMat); mapScene.add(stem);
const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffb070' })); mapScene.add(fireGlow);
// ---- rock rain (re-entering ejecta), 52 - 54.5 s
const DEB_N = 2200;
const debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffb36a' }), DEB_N); debris.frustumCulled = false; mapScene.add(debris);
const DEB = []; for (let i = 0; i < DEB_N; i++) { const r = CRATER_R + 4 + 150 * Math.pow(rnd(), 1.8), a = R(0, Math.PI * 2); DEB.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, a, t: R(T_EJECT + 0.1, T_DUST - 0.1), h: R(25, 60), s: R(0.5, 1.3) }); debris.setColorAt(i, new THREE.Color().setHSL(R(0.03, 0.09), 1, R(0.55, 0.75))); }
const dmy = new THREE.Object3D();
function updateDebris(t) {
  debris.visible = t > T_EJECT - 0.2 && t < T_DUST + 0.2;
  if (!debris.visible) return;
  for (let i = 0; i < DEB_N; i++) {
    const D = DEB[i]; const k = (t - (D.t - 0.9)) / 0.9;           // 0.9 s fall
    if (k < 0 || k > 1.25) { dmy.position.set(0, -99, 0); dmy.scale.setScalar(0); }
    else if (k <= 1) { const back = (1 - k) * D.h * 0.6; dmy.position.set(D.x - Math.cos(D.a) * back, (1 - k) * D.h, D.z - Math.sin(D.a) * back); dmy.lookAt(D.x, 0, D.z); dmy.scale.set(D.s * 0.6, D.s * 0.6, D.s * 4.5); }
    else { dmy.position.set(D.x, 0.2, D.z); dmy.scale.set(D.s * 2 * (1.25 - k) * 4, 0.1, D.s * 2 * (1.25 - k) * 4); }
    dmy.updateMatrix(); debris.setMatrixAt(i, dmy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;
}
// ---- labels (DOM, projected)
const LABELS = [
  { t: 'NEWARK · 10 MI', ll: [40.7357, -74.1724], a: T_MAP + 1.5, b: T_CRATER - 0.4, cls: 'small' },
  { t: 'BROOKLYN', ll: [40.6501, -73.9496], a: T_MAP + 1.5, b: T_CRATER - 0.4, cls: 'small' },
  { t: 'MANHATTAN · 13.4 MI LONG', ll: [40.875, -73.925], a: T_CRATER + 3.0, b: T_HEAT - 0.3, cls: 'blue', dz: -2.5 },
  { t: 'CRATER · 13 MI', ll: [40.758, -73.9855], a: T_CRATER + 0.6, b: T_HEAT - 0.3, cls: 'orange', dz: 12.5 },
  { t: 'NEW YORK', ll: [40.758, -73.9855], a: T_HEAT + 1.0, b: T_EJECT + 2.4, cls: 'you', dz: -40 },
  { t: 'PHILADELPHIA · 83 MI', ll: [39.9526, -75.1652], a: T_HEAT + 1.2, b: T_DUST - 0.3, cls: '' },
  { t: 'BOSTON · 187 MI', ll: [42.3601, -71.0589], a: T_HEAT + 1.6, b: T_EJECT - 0.3, cls: '' },
  { t: 'WASHINGTON · 206 MI', ll: [38.9072, -77.0369], a: T_HEAT + 1.6, b: T_EJECT - 0.3, cls: '' },
  { t: 'TRENTON', ll: [40.2206, -74.7597], a: T_EJECT + 0.3, b: T_DUST - 0.3, cls: 'small' },
  { t: 'NEW HAVEN', ll: [41.3083, -72.9279], a: T_EJECT + 0.3, b: T_DUST - 0.3, cls: 'small' },
];
function buildLabels() {
  const box = document.getElementById('labels');
  for (const L of LABELS) { const [x, y] = kmXY(L.ll[0], L.ll[1]); L.p = new THREE.Vector3(x, 0.5, y + (L.dz || 0)); L.el = document.createElement('div'); L.el.className = 'lbl ' + L.cls; L.el.innerHTML = L.t; box.appendChild(L.el); }
}
function updateLabels(t, active) {
  for (const L of LABELS) {
    if (!L.el) continue;
    const a = active ? fadeWin(t, L.a, L.b, 0.35) : 0;
    if (a <= 0) { L.el.style.opacity = 0; continue; }
    const v = L.p.clone().project(mapCam); const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
    const capOn = +document.getElementById('cap').style.opacity > 0.05; const ok = v.z < 1 && x > 140 && x < W - 140 && y > 330 && y < 1640 && !(capOn && y > 1190 && y < 1430);
    L.el.style.left = x + 'px'; L.el.style.top = y + 'px'; L.el.style.opacity = ok ? a : 0;
  }
}
// ---- camera keyframes: [t, lookX, lookZ, dist km, pitch deg, heading deg (screen-up direction, from north)]
const MAPKEYS = [[T_MAP, 0, 0, 150, 26, 0], [T_FIREB, 0, -2, 140, 32, 8], [T_CRATER - 1.6, 0, 0, 105, 50, 20], [T_CRATER + 0.4, 0, 0, 70, 64, 29], [T_HEAT - 0.5, 0, 0, 64, 66, 29],
  [T_HEAT + 1.6, -12, 10, 760, 60, 48], [T_QUAKE, -14, 8, 1300, 66, 52.8], [T_EJECT - 0.5, -14, 8, 1340, 67, 52.8], [T_EJECT + 0.7, -10, 15, 330, 48, 38], [T_DUST, -6, 10, 300, 46, 36]];
function mapCamera(t) {
  let k = MAPKEYS.length - 2; for (let i = 0; i < MAPKEYS.length - 1; i++) if (t < MAPKEYS[i + 1][0]) { k = i; break; }
  const A = MAPKEYS[k], B = MAPKEYS[k + 1]; const u = ease(clamp((t - A[0]) / (B[0] - A[0]), 0, 1));
  const lx = lerp(A[1], B[1], u), lz = lerp(A[2], B[2], u), dist = Math.exp(lerp(Math.log(A[3]), Math.log(B[3]), u)), pitch = lerp(A[4], B[4], u) * Math.PI / 180, hd = lerp(A[5], B[5], u) * Math.PI / 180;
  const fwd = new THREE.Vector3(Math.sin(hd), 0, -Math.cos(hd));
  const look = new THREE.Vector3(lx, 0, lz); const pos = look.clone().addScaledVector(fwd, -Math.cos(pitch) * dist); pos.y = Math.sin(pitch) * dist;
  mapCam.near = dist * 0.01; mapCam.far = dist * 20; mapCam.fov = 40; mapCam.updateProjectionMatrix(); mapCam.position.copy(pos); mapCam.up.set(0, 1, 0); mapCam.lookAt(look);
  return dist;
}
// quake: surface waves ~5 km/s; shown over 70 s of real time during the QUAKE shot
const quakeSim = t => lerp(0, 70, clamp((t - T_QUAKE - 0.3) / (T_BLAST - T_QUAKE - 0.6), 0, 1));
const blastSim = t => lerp(0, 1000, clamp((t - T_BLAST - 0.3) / (T_EJECT - T_BLAST - 0.8), 0, 1));
function updateMap(t) {
  const dist = mapCamera(t); const U = mapMat.uniforms; U.uTime.value = t; U.uLW.value = dist * 0.0028;
  // fireball
  const tf = t - (T_MAP - 0.8);
  const fr = FIRE_R * (1 - Math.exp(-Math.max(tf, 0) / 0.9));
  const rise = smooth(T_MAP + 3.0, T_CRATER - 1.0, t);
  const hot = 1 - smooth(T_MAP + 2.0, T_MAP + 9.0, t);
  const fa = 1 - smooth(T_CRATER - 3.0, T_CRATER + 0.2, t); const domeA = 1 - smooth(T_MAP + 5.0, T_FIREB + 2.0, t);
  fireball.visible = fa > 0.01 && t < T_CRATER + 0.5; fireball.scale.set(fr * (1 + 0.15 * rise), fr * (1 - 0.4 * rise), fr * (1 + 0.15 * rise));
  fireMat.uniforms.uT.value = t; fireMat.uniforms.uHot.value = hot; fireMat.uniforms.uA.value = fa * 0.95; fireball.visible = fireball.visible && domeA > 0.02; fireball.scale.y *= Math.max(domeA, 0.05);
  plume.visible = fireball.visible && rise > 0.01; plume.position.set(0, lerp(10, 42, rise), 0); plume.scale.set(lerp(8, 26, rise), lerp(5, 9, rise), lerp(8, 26, rise)); stem.visible = plume.visible; stem.scale.set(lerp(9, 7, rise), Math.max(0.1, lerp(10, 42, rise)), lerp(9, 7, rise));
  fireGlow.visible = fireball.visible; fireGlow.position.set(0, fr * 0.4, 0); fireGlow.scale.setScalar(fr * 5 * (0.4 + hot)); fireGlow.material.opacity = hot * fa;
  fireLight.intensity = hot * 4000 * fa; fireLight.position.set(0, fr * 0.6, 0);
  U.uFire.value.set(fr, hot * fa);
  U.uShock.value.set(lerp(2, 55, smooth(T_MAP - 0.6, T_MAP + 5.0, t)), (1 - smooth(T_MAP + 2.0, T_MAP + 5.0, t)) * 0.9);
  U.uOut.value = t > T_MAP ? (t < T_BLAST ? 46 : Math.max(46, blastR(blastSim(t)))) : 0;
  // crater
  const ck = smooth(T_CRATER - 3.5, T_CRATER - 0.5, t); U.uCrat.value = ck; rim.visible = peak.visible = ck > 0.01; rim.scale.set(1, ck, 1);
  U.uMelt.value = 1 - 0.6 * smooth(T_CRATER, T_EJECT, t); peak.material.emissiveIntensity = U.uMelt.value * 0.15;
  U.uManh.value = fadeWin(t, T_CRATER + 2.6, T_HEAT - 0.2, 0.5);
  // heat, quake, blast
  const hk = fadeWin(t, T_HEAT + 0.2, T_QUAKE + 0.2, 0.4); U.uHeat.value.set(HEAT_R * smooth(T_HEAT + 0.2, T_HEAT + 1.0, t), hk * (0.85 + 0.15 * Math.sin(t * 6)));
  const qs = quakeSim(t); U.uQuake.value.set(5 * qs, fadeWin(t, T_QUAKE + 0.1, T_BLAST + 0.1, 0.3));
  const bs = blastSim(t); U.uBlast.value.set(blastR(bs), fadeWin(t, T_BLAST + 0.1, T_EJECT + 0.1, 0.3));
  U.uEj.value = 0.5 * smooth(T_CRATER - 2, T_CRATER + 1, t) + 0.5 * smooth(T_EJECT, T_DUST, t);
  updateDebris(t);
}
// =================== city: night setup + camera ===================
const cityFill = new THREE.DirectionalLight(0xffc89a, 1.2); city.add(cityFill, cityFill.target);
function setNight() {
  sunL.color.set(0x9fb4ff); sunL.intensity = 0.5; hemi.intensity = 0.8; hemi.color.set(0x7a7cc0); hemi.groundColor.set(0x3a2a20);
  city.fog.color.set('#1a1830'); city.fog.near = 80; city.fog.far = 1600;
  for (const m of winMats) m.emissiveIntensity = 0.5;
  for (const m of lampHeads) m.emissiveIntensity = 1.8;
  clouds.forEach(c => { c.visible = false; });
}
function updateCity(t, glow) {
  setNight();
  sunL.position.copy(cam.position).add(new THREE.Vector3(-120, 160, 220)); sunL.target.position.copy(cam.position); sunL.target.updateMatrixWorld();
  cityFill.position.copy(cam.position).add(new THREE.Vector3(-4, 3, 2)); cityFill.target.position.set(cam.position.x + 20, 3, 0); cityFill.target.updateMatrixWorld();
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * 0.6 * t, -220, 158); c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 6 && !(x > 80 && Math.abs(c.lane) < 6.5); }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const gy = Math.abs(z) > 7 ? 0.18 : 0; o.position.set(x, gy + 0.95, z); o.rotation.set(0, ry, 0);
    if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph, 1);
    o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 2.5;
  }
  ball.visible = false;
  updateCrowd(t);
  for (const m of adMats) m.color.setScalar(1.5 + glow * 0.5);
  hemi.intensity = 0.8 + glow * 1.2; cityFill.intensity = 1.2 + glow * 2;
}
function cityCamera(t) {
  let pos, look, fov = 75;
  if (t < T_SCALE) { const u = t / T_SCALE; pos = new THREE.Vector3(lerp(70, 74, u), 1.15, lerp(1.6, 1.2, u)); look = pos.clone().add(new THREE.Vector3(1, lerp(0.72, 0.76, u), 0.1)); fov = 80; }
  else { const u = (t - T_DESC) / (IMPACT - T_DESC); pos = new THREE.Vector3(lerp(79, 80, u), 1.3, 0.6); look = pos.clone().add(new THREE.Vector3(1, lerp(0.74, 0.82, u), 0.1)); fov = lerp(80, 84, u);
    const sh = smooth(0.2, 1, u) * 0.06; pos.x += Math.sin(t * 61) * sh; pos.y += Math.sin(t * 73 + 1) * sh; look.y += Math.sin(t * 57 + 2) * sh * 3; }
  cam.fov = fov; cam.near = 0.1; cam.far = 6000; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'lead', 'scl1', 'scl2'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [3.5, 5.6, 'Picture a rock<br>one mile wide.'],
  [5.8, 7.9, 'Taller than 3½ Empire<br>State Buildings.'],
  [8.3, 9.9, 'At 34 miles up,<br>it starts to crack.'],
  [10.0, 11.1, 'The air barely<br>slows it down.'],
  [11.3, 12.5, 'Eight seconds after<br>hitting the air…'],
  [14.2, 16.6, 'The impact itself takes<br>less than a second.'],
  [16.8, 19.8, 'The energy of thousands<br>of the biggest nukes.'],
  [20.2, 22.8, 'A fireball<br>24 miles wide.'],
  [23.0, 25.8, 'The heat flash lasts<br>about 4 minutes.'],
  [26.2, 29.0, 'When it clears: a crater<br>13 miles wide.'],
  [29.2, 32.8, 'For a moment the hole is<br>3.3 miles deep.'],
  [33.4, 36.0, 'The heat reaches<br>130 miles out.'],
  [36.2, 38.8, 'Clothes catch fire<br>in Philadelphia.'],
  [39.3, 41.8, 'Then the ground hits back:<br>magnitude 8.2.'],
  [42.0, 44.8, 'Boston starts shaking<br>a minute later.'],
  [45.2, 46.9, 'Then the air blast.'],
  [47.1, 49.3, 'Philadelphia, 7 minutes:<br>370 mph winds.'],
  [49.5, 51.8, 'Boston, 15 minutes:<br>windows shatter.'],
  [52.2, 54.3, 'Rock rains down<br>100 miles away.'],
  [54.7, 56.8, 'The dust could cool<br>the whole planet.'],
  [57.2, 59.0, 'Good news: NASA has found<br>~95% of asteroids this big.'],
  [59.2, 60.9, 'None of them are<br>headed our way.'],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < T_SCALE) { stat = '<b></b>TIMES SQUARE · NEW YORK'; lab = 'INCOMING'; val = '38,000 mph'; sub = '1 MILE WIDE · STONY ASTEROID'; show = smooth(0.5, 1.0, t); }
  else if (t < T_SPACE) { stat = '<b></b>TO SCALE'; lab = 'SIZE'; val = '5,280 ft'; sub = '3.6× THE EMPIRE STATE BUILDING'; }
  else if (t < IMPACT) { const alt = distKm(t) * Math.sin(ENTRY_DEG * Math.PI / 180) * 0.6214; stat = '<b></b>38,000 MPH · 45°'; lab = 'ALTITUDE'; val = alt.toFixed(1) + ' mi'; sub = alt > 33.6 ? 'ENTERING THE ATMOSPHERE' : 'BREAKING APART · STILL FALLING'; }
  else if (t < T_MAP + 0.2) show = 0;
  else if (t < T_FIREB) {
    stat = '<b></b>IMPACT'; lab = 'ENERGY';
    if (t < 16.8) { val = fmtInt(226000 * smooth(T_MAP + 0.2, T_MAP + 1.6, t)) + ' Mt'; sub = 'MEGATONS OF TNT'; }
    else if (t < 18.4) { val = '4,500'; sub = 'TSAR BOMBAS · BIGGEST NUKE EVER'; }
    else { val = '15 million'; sub = 'HIROSHIMA BOMBS'; }
  }
  else if (t < T_CRATER) { stat = '<b></b>IMPACT'; lab = 'FIREBALL'; val = '24 miles'; sub = 'WIDE · HEAT FLASH ~4 MIN'; }
  else if (t < T_HEAT) { stat = '<b></b>AFTER THE FIREBALL'; lab = 'CRATER'; val = '13 miles'; sub = 'WIDE · 2,400 FT DEEP'; }
  else if (t < T_QUAKE) { stat = '<b></b>SPEED OF LIGHT'; lab = 'HEAT'; val = '131 miles'; sub = 'CLOTHES IGNITE · PHILLY IS 83 MI'; }
  else if (t < T_BLAST) { const s = quakeSim(t); stat = '<b></b>T+ ' + mmss(s); lab = 'EARTHQUAKE'; val = 'M 8.2'; sub = s < 59.5 ? 'BOSTON 187 MI · HITS AT T+ 1:00' : 'BOSTON IS SHAKING'; }
  else if (t < T_EJECT) { const s = blastSim(t), r = blastR(s); stat = '<b></b>T+ ' + mmss(s); lab = 'AIR BLAST · WIND'; val = fmtInt(Math.round(windAt(r) / 5) * 5) + ' mph'; sub = s < 419 ? 'PHILADELPHIA AT T+ 7:00' : s < 920 ? 'BOSTON AT T+ 15:20' : 'BOSTON: WINDOWS SHATTER'; }
  else if (t < T_DUST) { stat = '<b></b>MINUTES LATER'; lab = 'ROCK RAIN'; val = '3+ ft'; sub = 'DEEP 47 MI OUT · 4 IN AT 100 MI'; }
  else if (t < T_CALM) { stat = '<b></b>MODEL · MONTHS LATER'; lab = 'DUST'; val = 'Global'; sub = 'A POSSIBLE "IMPACT WINTER"'; }
  else { stat = '<b></b>NASA · JPL'; lab = 'TRACKED'; val = '~95%'; sub = 'OF NEAR-EARTH ASTEROIDS OVER 1 KM'; }
  return { stat, lab, val, sub, show };
}
function updateScaleLabels(t, active) {
  const a = active ? fadeWin(t, T_SCALE + 0.6, T_SPACE - 0.1, 0.4) : 0;
  el.scl1.style.opacity = el.scl2.style.opacity = a; el.lead.style.opacity = a;
  if (a <= 0) return;
  const P = v => { const p = v.clone().project(scaleCam); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H]; };
  const [rx, ry] = P(new THREE.Vector3(-1010, ROCK_D + 60, 0)); el.scl1.style.left = rx + 'px'; el.scl1.style.top = (ry - 40) + 'px';
  const [ex, ey] = P(new THREE.Vector3(0, ESB_TIP, 0)), [bx, by] = P(new THREE.Vector3(0, 0, 0));
  el.scl2.style.left = (ex - 150) + 'px'; el.scl2.style.top = (ey - 250) + 'px';
  el.lead.innerHTML = `<line x1="${ex}" y1="${ey - 6}" x2="${ex - 40}" y2="${ey - 175}" stroke="#fff" stroke-width="2.5" opacity="0.9"/><circle cx="${ex}" cy="${ey}" r="5" fill="#ff3b30"/>`;
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(T_SCALE - 0.35, T_SCALE, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t)) * (1 - fadeWin(t, IMPACT, T_MAP + 0.3, 0.1));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const v1 = fadeWin(t, T_SCALE - 0.2, T_SCALE + 0.2, 0.2), v2 = fadeWin(t, T_SPACE - 0.2, T_SPACE + 0.2, 0.2), v3 = fadeWin(t, T_DESC - 0.15, T_DESC + 0.15, 0.15), v4 = fadeWin(t, T_DUST - 0.3, T_DUST + 0.3, 0.3);
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(v1, v2, v3, v4);
  el.flash.style.opacity = t < IMPACT ? smooth(IMPACT - 0.25, IMPACT, t) : 1 - smooth(IMPACT + 0.4, T_MAP + 0.5, t);
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  const shot = t < T_SCALE ? 'city' : t < T_SPACE ? 'scale' : t < T_DESC ? 'space' : t < IMPACT + 0.25 ? 'city' : t < T_DUST ? 'map' : 'space';
  if (shot === 'scale') scaleCamera(t); else if (shot === 'map') mapCamera(t);
  updateScaleLabels(t, shot === 'scale');
  if (window.PASS === 'text') { updateLabels(t, shot === 'map'); return true; }
  renderer.setRenderTarget(null); renderer.clear();
  if (shot === 'city') { cityCamera(t); const glow = updateSky(t, cam.position); updateCity(t, glow); renderer.render(city, cam); }
  else if (shot === 'scale') { scaleCamera(t); renderer.render(scaleScene, scaleCam); }
  else if (shot === 'map') { updateMap(t); renderer.render(mapScene, mapCam); }
  else { updateSpace(t); renderer.render(space, spaceCam); }
  updateLabels(t, shot === 'map');
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildMap(), buildGlobe()]).then(() => { window.renderAt(0); return true; });
