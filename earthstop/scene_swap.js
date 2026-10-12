import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
/* global d3, topojson */

// "What if every American and every Brit swapped places for one day?" — globe swap -> 5:1 crowds -> airlift (31 days)
// -> teleport -> packed Britain map -> packed London street (left-hand traffic) -> emptying shop -> empty Times Square
// -> sparse US map -> pants/chips -> midnight swap back. Numbers: tools/swap_math.py (Census, ONS, IATA, FHWA, DfT, Defra, UKTIA).
// =================== timeline ===================
const T_RATIO = 3.0, T_AIR = 8.0, T_TELE = 14.0, T_UKMAP = 16.0, T_LONDON = 26.0, T_SHOP = 34.0, T_TIMES = 40.0, T_USMAP = 45.0,
  T_TALK = 50.0, T_MID = 57.0, T_END = 61.0;
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
      const ts = x > 20 && x < 170; const h = ts ? R(40, 78) : (x > 290 && x < 580) ? R(13, 19) : rnd() < 0.15 ? R(38, 52) : R(16, 34);
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


// =================== street props: day sky, Times Square billboards, London block, people ===================
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 uTop, uHor; varying vec3 vD; void main(){ float e=max(vD.y,0.0); vec3 c=mix(uHor,uTop,pow(e,0.5)); gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMat); skyDome.renderOrder = -10; skyDome.frustumCulled = false; city.add(skyDome);
// ---- Times Square billboards (made-up ads)
const ADS = [
  ['NOVA COLA', '#e8322a', '#ffd23a'], ['BROADWAY', '#1b1b3a', '#ffd86a'], ['LIVE TONIGHT', '#6a1fd0', '#ffffff'], ['MEGA SALE', '#ff7a1a', '#ffffff'],
  ['PIZZA 24/7', '#d9261c', '#fff2c0'], ['SKYLINE', '#0c6fd9', '#ffffff'], ['CINEMA', '#111111', '#ff3355'], ['ZOOM PHONE', '#13c2a3', '#04202a'],
  ['NEW YORK', '#ffffff', '#e8322a'], ['PLANET FM', '#2b2bff', '#9ef0ff'], ['SNACKZ', '#ffcc00', '#c4161c'], ['GALAXY TV', '#000000', '#38f5ff'],
  ['HOTEL 42', '#7a0f3a', '#ffd6e6'], ['RUN FAST', '#00b34a', '#ffffff'], ['ICE CREAM', '#ff8fc8', '#ffffff'], ['THE SHOW', '#b30000', '#ffe08a'],
];
function signTex(word, bg, fg, w, h, style = 0) {
  return canvasTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#' + new THREE.Color(bg).offsetHSL(R(-0.08, 0.08), 0, R(-0.2, 0.15)).getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (style === 1) { g.fillStyle = 'rgba(255,255,255,0.18)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(R(0, w), R(0, h), R(20, h * 0.6), 0, Math.PI * 2); g.fill(); } }
    if (style === 2) { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 10, h); }
    let fs = h * 0.42; g.font = `900 ${fs}px Inter, Arial, sans-serif`; while (g.measureText(word).width > w * 0.86 && fs > 10) { fs -= 4; g.font = `900 ${fs}px Inter, Arial, sans-serif`; }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2);
    g.strokeStyle = fg; g.lineWidth = 6; g.globalAlpha = 0.6; g.strokeRect(6, 6, w - 12, h - 12); g.globalAlpha = 1;
  });
}
function billboard(i, w, h, pos, rotY) {
  const [word, bg, fg] = ADS[i % ADS.length]; const th = Math.max(64, Math.round(512 / (w / h)));
  const m = new THREE.MeshBasicMaterial({ map: signTex(word, bg, fg, 512, th, i % 3) }); m.color.setScalar(1.25);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.copy(pos); p.rotation.y = rotY; city.add(p);
  const fr = mesh(BOX, M('#1a1a1c')); fr.scale.set(w + 0.6, h + 0.6, 0.4); fr.position.copy(pos); fr.rotation.y = rotY;
  if (rotY === 0) fr.position.z -= 0.25; else if (rotY === Math.PI) fr.position.z += 0.25; else fr.position.x += 0.25; city.add(fr);
}
{
  let k = 0;
  for (const side of [-1, 1]) for (let x = 36; x < 160; x += R(11, 20)) {
    if (CROSS.some(c => Math.abs(x - c) < 9)) continue;
    let y = R(7, 11);
    while (y < 42) { const w = R(8, 16), h = R(4, 9); billboard(k++, w, h, new THREE.Vector3(x + R(-2, 2), y + h / 2, side * 11.7), side < 0 ? 0 : Math.PI); y += h + R(1.5, 6); }
  }
  const TX = 186; const tw = mesh(BOX, M('#2a2c30', { roughness: 0.6 })); tw.scale.set(20, 64, 24); tw.position.set(TX + 10, 32, 0); city.add(tw);
  let y = 9; while (y < 54) { const h = R(7, 13); billboard(k++, 21, h, new THREE.Vector3(TX - 0.3, y + h / 2, 0), -Math.PI / 2); y += h + 1.2; }
  for (let i = 0; i < 7; i++) box(10, 0.45, 1.4, M('#b3261e', { roughness: 0.5 }), 128, 0.25 + i * 0.45, -3.5 - i * 1.2);
}
// ---- London block (x 300..430): double-deckers, black cabs, phone boxes, bunting, shop signs
function windowsTex(w, h, rows, col) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) { const y = h * (0.12 + r * 0.45); for (let x = w * 0.04; x < w * 0.92; x += w * 0.1) { g.fillStyle = '#26333d'; g.fillRect(x, y, w * 0.085, h * 0.28); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w * 0.085, h * 0.05); } }
    g.fillStyle = '#f2c12e'; g.font = `700 ${h * 0.09}px Inter, Arial`; g.fillText('CITY TOUR', w * 0.06, h * 0.97);
  });
}
const busTex = windowsTex(512, 256, 2, '#c8102e');
function dbus(x, lane, dir) {
  const g = new THREE.Group(); g.position.set(x, 0, lane); g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g);
  const side = new THREE.MeshStandardMaterial({ map: busTex, roughness: 0.5 });
  const body = mesh(BOX, [M('#c8102e', { roughness: 0.5 }), M('#c8102e', { roughness: 0.5 }), M('#b30d27'), M('#222'), side, side]); body.scale.set(11, 4.0, 2.5); body.position.y = 2.45; g.add(body);
  box(0.06, 1.0, 2.2, M('#26333d', { roughness: 0.2 }), 5.52, 3.2, 0, g); box(0.06, 1.0, 2.2, M('#26333d', { roughness: 0.2 }), 5.52, 1.5, 0, g);
  for (const wx of [-3.6, 3.4]) for (const wz of [-1.15, 1.15]) { const w = mesh(wheelGeo, M('#151515')); w.scale.setScalar(1.45); w.position.set(wx, 0.5, wz); g.add(w); }
  return g;
}
function phoneBox(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.18, z); city.add(g);
  const pt = canvasTex(64, 192, (c) => { c.fillStyle = '#c8102e'; c.fillRect(0, 0, 64, 192); c.fillStyle = '#26333d'; for (let r = 0; r < 6; r++) for (let q = 0; q < 3; q++) c.fillRect(8 + q * 17, 30 + r * 22, 14, 18); c.fillStyle = '#111'; c.fillRect(4, 6, 56, 14); c.fillStyle = '#fff'; c.font = '700 10px Inter'; c.fillText('TELEPHONE', 6, 17); });
  const m = new THREE.MeshStandardMaterial({ map: pt, roughness: 0.5 });
  const b = mesh(BOX, m); b.scale.set(1.0, 2.5, 1.0); b.position.y = 1.25; g.add(b);
  const top = mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.3, 4, 1), M('#c8102e')); top.rotation.y = Math.PI / 4; top.position.y = 2.65; g.add(top);
}
const bunting = [];
function buntingLine(x, z0, z1, y) {
  const n = 22; const cols = ['#c8102e', '#ffffff', '#012169'];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n; const z = lerp(z0, z1, u); const yy = y - Math.sin(u * Math.PI) * 1.6;
    const tri = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.32), new THREE.Vector3(0, 0, 0.32), new THREE.Vector3(0, -0.75, 0)]), new THREE.MeshStandardMaterial({ color: cols[i % 3], side: THREE.DoubleSide, roughness: 0.8 }));
    tri.position.set(x, yy, z); city.add(tri); bunting.push({ tri, ph: R(0, 6) });
  }
}
for (const bx of [318, 352, 386, 420]) buntingLine(bx, -11.5, 11.5, 9.5);
for (const [x, z] of [[311, -8.6], [347, 8.6], [404, -8.6]]) phoneBox(x, z);
const shopSigns = [['FISH & CHIPS', '#0b3d2e', '#f5e6b8'], ['THE CROWN', '#1b1b1b', '#e8c060'], ['TEA ROOM', '#4a1f3a', '#ffe1ef'], ['NEWSAGENT', '#123a6b', '#ffffff'], ['BAKERY', '#7a3b12', '#ffe2b0'], ['PHARMACY', '#0b6b3a', '#ffffff']];
{ let k = 0; for (const side of [-1, 1]) for (let x = 304; x < 432; x += R(12, 17)) { if (CROSS.some(c => Math.abs(x - c) < 9)) continue; const [w, bg, fg] = shopSigns[k++ % shopSigns.length]; const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshStandardMaterial({ map: signTex(w, bg, fg, 512, 74), roughness: 0.6 })); p.position.set(x, 4.3, side * 11.86); p.rotation.y = side < 0 ? 0 : Math.PI; city.add(p); } }
// traffic jam (left-hand traffic: cars moving +x keep to the -z side, which is the camera's left)
const jam = [];
{
  const make = (x, lane, dir, cab) => { const g = new THREE.Group(); const c = cab ? '#141414' : pick(CAR_COLS);
    box(4.4, 0.8, 1.85, M(c, { roughness: 0.35, metalness: 0.3 }), 0, 0.73, 0, g); box(cab ? 2.8 : 2.4, cab ? 0.85 : 0.62, 1.7, M(c, { roughness: 0.35, metalness: 0.3 }), -0.15, cab ? 1.55 : 1.42, 0, g);
    box(cab ? 2.82 : 2.42, cab ? 0.6 : 0.48, 1.72, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, cab ? 1.6 : 1.42, 0, g);
    if (cab) box(0.5, 0.18, 0.28, '#f2c12e', 0.2, 2.06, 0, g);
    for (const wx of [-1.4, 1.4]) for (const wz of [-0.85, 0.85]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, 0.34, wz); g.add(w); }
    g.position.set(x, 0, lane); g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g); jam.push({ g, x, lane }); };
  for (const [lane, dir] of [[-1.75, 1], [-5.25, 1], [1.75, -1], [5.25, -1]]) for (let x = 304; x < 432; x += R(6.5, 9)) { if (CROSS.some(c => Math.abs(x - c) < 9)) continue; if (lane === -1.75 && (Math.abs(x - 330) < 7 || Math.abs(x - 392) < 7)) continue; make(x, lane, dir, rnd() < 0.35); }
  dbus(330, -1.75, 1); dbus(392, -1.75, 1); dbus(372, 1.75, -1);
}
// ---- people: packed London crowd (sidewalks + between the jammed cars), Times Square Brit, talk pair
const londonCrowd = [];
const blocked = (x, z) => jam.some(c => Math.abs(x - c.x) < 2.6 && Math.abs(z - c.lane) < 1.2) || [330, 392].some(bx => Math.abs(x - bx) < 6 && Math.abs(z + 1.75) < 1.6) || (Math.abs(x - 372) < 6 && Math.abs(z - 1.75) < 1.6);
for (let i = 0; i < 1150; i++) {
  const x = i < 900 ? R(300, 372) : R(372, 430), z = R(-11.6, 11.6); if (blocked(x, z) || CROSS.some(c => Math.abs(x - c) < 7.5 && Math.abs(z) < 7)) { i--; continue; }
  const p = makePerson(rnd); city.add(p.outer); londonCrowd.push({ p, x, z, ry: R(0, 6.28), ph: R(0, 6), walk: rnd() < 0.3 });
}
const cupGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.09, 10);
function teaPerson(rndOpts) { const p = makePerson(rnd, rndOpts); const cup = mesh(cupGeo, M('#f4f1ea')); cup.position.set(0, -0.3, 0.06); p.elbows[1].add(cup); return p; }
const brit = teaPerson({ top: '#2b3a67', bottom: '#3a3a3a' }); city.add(brit.outer);
// tumbleweed: a ball of twigs (line segments on a sphere)
const weed = new THREE.Group(); city.add(weed);
{ const pts = []; for (let i = 0; i < 160; i++) { const a = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(0.35, 0.6)); const b = a.clone().add(new THREE.Vector3(R(-0.5, 0.5), R(-0.5, 0.5), R(-0.5, 0.5))).normalize().multiplyScalar(R(0.35, 0.6)); pts.push(a, b); }
  weed.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#8a6a3c' }))); }
{ const p = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.5), new THREE.MeshStandardMaterial({ map: signTex('FISH & CHIPS', '#0b3d2e', '#f5e6b8', 512, 110), roughness: 0.6 })); p.position.set(360, 5.3, 11.84); p.rotation.y = Math.PI; city.add(p); }
const yank = makePerson(rnd, { top: '#b22234', bottom: '#2a3a5c', cap: true }); city.add(yank.outer);
const clerk = makePerson(rnd, { top: '#0b3d2e', bottom: '#2b2b2e' }); city.add(clerk.outer);
// =================== GLOBE (ER = 10): US + UK highlighted, swap arcs, airlift planes ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#05070f');
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 3000);
{
  const n = 4000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(900); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7 })));
}
space.add(new THREE.AmbientLight(0x6a7590, 0.9));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 2.6); spaceSun.position.set(-40, 30, 60); space.add(spaceSun);
const ER = 10;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const US_C = [39.5, -98.5], UK_C = [53.5, -1.8];
const globe = new THREE.Group(); space.add(globe);
const glowTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
let countryTopo = null;
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json(); countryTopo = topo;
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH);
  const drawGeo = (geom, col) => {
    g.fillStyle = col; const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
    for (const poly of polys) for (const ring of poly) {
      let prev = ring[0][0], off = 0; const pts = [];
      for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); }
    }
  };
  const feats = topojson.feature(topo, topo.objects.countries).features;
  for (const f of feats) if (f.geometry) drawGeo(f.geometry, '#ffffff');
  for (const f of feats) if (f.id === '840') drawGeo(f.geometry, '#ff0000'); else if (f.id === '826') drawGeo(f.geometry, '#0000ff');
  const img = g.getImageData(0, 0, MW, MH).data;
  const at = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); const i = (y * MW + x) * 4; return [img[i], img[i + 1], img[i + 2]]; };
  const geo = new THREE.IcosahedronGeometry(ER, 48); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI; const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    const [r, gg, b] = at(lat, lon); const land = r > 128 || b > 128;
    if (lat < -62 || lat > 80 || (al > 72 && land)) c.set('#eef3f6');
    else if (r > 128 && gg < 100) c.set('#d8a24a').offsetHSL(0, 0, j);            // USA: warm gold
    else if (b > 128 && r < 100) c.set('#4fb6e0').offsetHSL(0, 0, j);            // UK: bright blue
    else if (land) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); c.multiplyScalar(0.8); }
    else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.04, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.3; }'
  })); globe.add(atm);
}
// great-circle arc between the two countries, lifted above the surface
function arcPoint(u, lift = 2.2) {
  const a = ll2v(...US_C).normalize(), b = ll2v(...UK_C).normalize(); const om = Math.acos(a.dot(b));
  const p = a.clone().multiplyScalar(Math.sin((1 - u) * om) / Math.sin(om)).add(b.clone().multiplyScalar(Math.sin(u * om) / Math.sin(om)));
  return p.normalize().multiplyScalar(ER * (1.01 + 0.0) + lift * Math.sin(Math.PI * u));
}
const arcs = [];
for (const [lift, col] of [[2.6, '#ffd166'], [1.6, '#8fd3ff']]) {
  const pts = []; for (let i = 0; i <= 80; i++) pts.push(arcPoint(i / 80, lift));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.035, 6, false), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 }));
  globe.add(m); arcs.push({ m, lift, col });
}
// streams of people (glow dots) flowing both ways
const STREAM = [];
for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(0.32); globe.add(s); STREAM.push({ s, dir: i % 5 === 0 ? -1 : 1, ph: rnd() }); }
// airlift planes (low-poly), many along the arc
function planeGeo() {
  const parts = [new THREE.CylinderGeometry(0.06, 0.05, 0.9, 6).rotateZ(Math.PI / 2), new THREE.BoxGeometry(0.2, 0.015, 0.9), new THREE.BoxGeometry(0.12, 0.012, 0.32).translate(-0.4, 0.02, 0), new THREE.BoxGeometry(0.12, 0.16, 0.012).translate(-0.4, 0.08, 0)];
  return mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g));
}
const PLANES = []; const pGeo = planeGeo(); const pMat = new THREE.MeshStandardMaterial({ color: '#f4f6fa', roughness: 0.5, flatShading: true });
for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(pGeo, pMat); globe.add(m); PLANES.push({ m, dir: i % 5 === 0 ? -1 : 1, ph: rnd(), lift: R(1.5, 2.7) }); }
function updateGlobe(t, mode) {
  // mode: 'intro' | 'air' | 'tele' | 'back'
  const arcA = mode === 'intro' ? smooth(0.6, 2.0, t) : mode === 'back' ? smooth(T_MID + 0.2, T_MID + 1.2, t) : 1;
  arcs.forEach(a => { a.m.material.opacity = arcA * 0.9; });
  const speed = mode === 'tele' ? 2.2 : 0.35;
  STREAM.forEach(S => {
    const vis = mode !== 'air'; S.s.visible = vis; if (!vis) return;
    let u = (S.ph + t * speed) % 1; const dir = mode === 'back' ? -S.dir : S.dir; if (dir < 0) u = 1 - u;
    S.s.position.copy(arcPoint(u, S.dir > 0 ? 2.6 : 1.6)); S.s.material.color.set(S.dir > 0 ? '#ffd166' : '#8fd3ff'); S.s.material.opacity = arcA * Math.sin(Math.PI * u) ** 0.3;
  });
  PLANES.forEach(P => {
    P.m.visible = mode === 'air'; if (!P.m.visible) return;
    let u = (P.ph + (t - T_AIR) * 0.12) % 1; if (P.dir < 0) u = 1 - u;
    const p = arcPoint(u, P.lift), q = arcPoint(Math.min(1, Math.max(0, u + 0.01 * P.dir)), P.lift);
    P.m.position.copy(p); P.m.up.copy(p.clone().normalize()); P.m.lookAt(q); P.m.rotateY(-Math.PI / 2);
    P.m.scale.setScalar(0.75);
  });
}
function globeCamera(t, mode) {
  let center, dist, fov = 40;
  const mid = arcPoint(0.5, 0).normalize();
  if (mode === 'intro') { center = mid.clone(); dist = lerp(66, 60, smooth(0, T_RATIO, t)); }
  else if (mode === 'air') { const u = (t - T_AIR) / (T_TELE - T_AIR); center = mid.clone().lerp(ll2v(48, -40).normalize(), 0.3); dist = lerp(40, 34, ease(u)); }
  else if (mode === 'tele') { center = mid.clone(); dist = 50; }
  else { const u = (t - T_MID) / (T_END - T_MID); center = mid.clone(); dist = lerp(60, 66, u); }
  // slow drift
  const ang = 0.05 * Math.sin(t * 0.3);
  const pos = center.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).multiplyScalar(dist);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(mid.clone().multiplyScalar(ER * 0.15).add(new THREE.Vector3(0, mode === 'air' ? 0 : 4.5, 0)));
}
// =================== STUDIO: 49 Americans vs 10 Brits (4.9 : 1) ===================
const studio = new THREE.Scene(); studio.background = new THREE.Color('#141a26'); studio.fog = new THREE.Fog('#141a26', 30, 70);
const stCam = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
studio.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 1.3));
const stKey = new THREE.DirectionalLight(0xffffff, 2.2); stKey.position.set(6, 12, 10); stKey.castShadow = true; stKey.shadow.mapSize.set(1024, 1024);
Object.assign(stKey.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); studio.add(stKey);
{
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#2a3142', roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; studio.add(fl);
  const plat = (x, w, d, col) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 48), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })); m.scale.set(w, 1, d); m.position.set(x, 0.15, col === '#b22234' ? -3.4 : 3.6); m.receiveShadow = true; studio.add(m); };
  plat(0, 3.4, 3.0, '#b22234'); plat(0, 1.7, 1.5, '#012169');
}
const usGroup = [], ukGroup = [];
for (let i = 0; i < 49; i++) { const p = makePerson(rnd); studio.add(p.outer); const r = Math.sqrt((i + 0.5) / 49) * 2.9, a = i * 2.39996; usGroup.push({ p, x: Math.cos(a) * r, z: -3.4 + Math.sin(a) * r * 0.85, ph: R(0, 6), t0: T_RATIO + 0.3 + R(0, 1.6) }); }
for (let i = 0; i < 10; i++) { const p = makePerson(rnd); studio.add(p.outer); const r = Math.sqrt((i + 0.5) / 10) * 1.25, a = i * 2.39996; ukGroup.push({ p, x: Math.cos(a) * r * 1.2, z: 3.6 + Math.sin(a) * r * 0.9, ph: R(0, 6), t0: T_RATIO }); }
function updateStudio(t) {
  for (const g of [usGroup, ukGroup]) for (const P of g) {
    const k = smooth(P.t0, P.t0 + 0.35, t); const pop = k < 1 ? k * (1 + 0.25 * Math.sin(k * Math.PI)) : 1;
    P.p.outer.visible = k > 0.01; P.p.outer.position.set(P.x, 0.3 + 0.95 * pop, P.z); P.p.outer.scale.setScalar(Math.max(pop, 0.01)); P.p.outer.rotation.set(0, Math.atan2(stCam.position.x - P.x, stCam.position.z - P.z) + Math.sin(P.ph) * 0.4, 0);
    poseIdle(P.p, t, P.ph);
  }
  const u = (t - T_RATIO) / (T_AIR - T_RATIO);
  stCam.position.set(lerp(0.4, -0.4, u), lerp(12.5, 11.5, u), lerp(17.5, 16.5, u)); stCam.fov = 44; stCam.lookAt(0, -1.6, 0.2); stCam.updateProjectionMatrix();
}

// =================== SHOP: one supermarket aisle emptying out ===================
const shop = new THREE.Scene(); shop.background = new THREE.Color('#e9ecef'); shop.fog = new THREE.Fog('#e9ecef', 25, 60);
const shopCam = new THREE.PerspectiveCamera(60, W / H, 0.05, 200);
shop.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.6));
const shopKey = new THREE.DirectionalLight(0xffffff, 1.2); shopKey.position.set(2, 8, 4); shop.add(shopKey);
const PROD = [];
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ color: '#cfd3d6', roughness: 0.4 })); fl.rotation.x = -Math.PI / 2; fl.position.z = -20; shop.add(fl);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ color: '#f2f2f0' })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.2, -20); shop.add(ceil);
  for (let z = -2; z > -44; z -= 4) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); l.position.set(0, 4.15, z); shop.add(l); }
  const shelfM = new THREE.MeshStandardMaterial({ color: '#7d8790', roughness: 0.5, metalness: 0.3 });
  const PCOL = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#457b9d', '#ffb4a2', '#8ac926', '#ff595e', '#6a4c93', '#1982c4', '#ffca3a', '#f1faee'];
  const geo = new THREE.BoxGeometry(1, 1, 1); const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), 2400); const d = new THREE.Object3D(); let n = 0;
  for (const side of [-1, 1]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 40), shelfM); back.position.set(side * 2.2, 1.2, -22); shop.add(back);
    for (let lv = 0; lv < 5; lv++) {
      const y = 0.15 + lv * 0.48; const sh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 40), shelfM); sh.position.set(side * 1.9, y, -22); shop.add(sh);
      for (let z = -2.2; z > -41.8 && n < 2400;) { const w = R(0.14, 0.3), h = R(0.2, 0.38); d.position.set(side * 1.88, y + h / 2 + 0.02, z - w / 2); d.scale.set(R(0.3, 0.45), h, w); d.updateMatrix(); im.setMatrixAt(n, d.matrix); im.setColorAt(n, new THREE.Color(pick(PCOL))); PROD.push({ m: d.matrix.clone(), t: T_SHOP + 0.4 + Math.pow(rnd(), 0.8) * 4.6 }); n++; z -= w + 0.02; }
    }
  }
  im.count = n; shop.add(im); PROD.im = im;
}
const shoppers = [];
for (let i = 0; i < 18; i++) { const p = makePerson(rnd); shop.add(p.outer); shoppers.push({ p, x: R(-1.2, 1.2), z: R(-30, -4), v: R(-1.6, 1.6), ph: R(0, 6) }); }
const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
function updateShop(t) {
  const im = PROD.im; for (let i = 0; i < PROD.length; i++) im.setMatrixAt(i, t < PROD[i].t ? PROD[i].m : zeroM); im.instanceMatrix.needsUpdate = true;
  for (const S of shoppers) { const z = wrapR(S.z + S.v * (t - T_SHOP), -40, -3); S.p.outer.position.set(S.x, 0.95, z); S.p.outer.rotation.set(0, S.v > 0 ? 0 : Math.PI, 0); poseWalk(S.p, t * 5 + S.ph, 1); }
  const u = (t - T_SHOP) / (T_TIMES - T_SHOP);
  shopCam.position.set(0.15, 1.7, lerp(1.5, -3.5, u)); shopCam.lookAt(0, 1.2, -30); shopCam.updateProjectionMatrix();
}
// =================== MAPS: Great Britain filling up, the USA emptying out ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#0a1424');
const mapCam = new THREE.PerspectiveCamera(40, W / H, 1, 20000);
mapScene.add(new THREE.HemisphereLight(0xcfe0ff, 0x203040, 1.2));
const mapKey = new THREE.DirectionalLight(0xffffff, 1.4); mapKey.position.set(-300, 900, 600); mapScene.add(mapKey);
const ukGroupM = new THREE.Group(), usGroupM = new THREE.Group(); mapScene.add(ukGroupM, usGroupM);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: '#13304f', roughness: 0.6 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -1; mapScene.add(sea);
function slabFrom(polys, toXY, depth, color) {
  const shapes = [];
  for (const poly of polys) { const outer = poly[0].map(toXY); if (outer.length < 4) continue; const sh = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, -y))); for (const h of poly.slice(1)) sh.holes.push(new THREE.Path(h.map(toXY).map(([x, y]) => new THREE.Vector2(x, -y)))); shapes.push(sh); }
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }));
}
const polysOf = (geom) => geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
function maskSampler(polys, toXY, cell) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of polys) for (const [x, y] of p[0].map(toXY)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cw = Math.ceil((x1 - x0) / cell), ch = Math.ceil((y1 - y0) / cell); const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d'); g.fillStyle = '#fff';
  for (const poly of polys) { g.beginPath(); for (const ring of poly) ring.map(toXY).forEach(([x, y], i) => { const px = (x - x0) / cell, py = (y - y0) / cell; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.fill('evenodd'); }
  const d = g.getImageData(0, 0, cw, ch).data; const ok = (x, y) => { const px = Math.floor((x - x0) / cell), py = Math.floor((y - y0) / cell); return px >= 0 && py >= 0 && px < cw && py < ch && d[(py * cw + px) * 4 + 3] > 128; };
  return { ok, x0, y0, x1, y1 };
}
// ---- UK (km, equirectangular around 54.5N 2.5W)
const UKLAT = 54.5, UKLON = -2.5, KX = 111.32 * Math.cos(UKLAT * Math.PI / 180), KY = 111.32;
const ukXY = ([lo, la]) => [(lo - UKLON) * KX, (UKLAT - la) * KY];
const UK_CITIES = [[51.51, -0.13, 9.0], [52.49, -1.89, 2.9], [53.48, -2.24, 2.8], [53.8, -1.55, 1.9], [55.86, -4.25, 1.7], [53.41, -2.98, 1.4], [51.45, -2.59, 1.0], [54.97, -1.61, 1.1], [55.95, -3.19, 0.9], [51.48, -3.18, 0.8], [54.6, -5.93, 0.7], [52.95, -1.15, 1.0], [53.38, -1.47, 1.0], [50.9, -1.4, 0.9]];
const DOT_N = 6000;
const dotGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
const ukDots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), DOT_N); ukDots.frustumCulled = false; ukGroupM.add(ukDots);
const usDots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), DOT_N); usDots.frustumCulled = false; usGroupM.add(usDots);
const UKD = [], USD = [];
async function buildMaps() {
  const topo = countryTopo; const feats = topojson.feature(topo, topo.objects.countries).features;
  const uk = feats.find(f => f.id === '826'), ie = feats.find(f => f.id === '372'), fr = feats.find(f => f.id === '250');
  const ukP = polysOf(uk.geometry); ukGroupM.add(slabFrom(ukP, ukXY, 6, '#4fb6e0'));
  ukGroupM.add(slabFrom(polysOf(ie.geometry), ukXY, 4, '#3d5a48'));
  ukGroupM.add(slabFrom(polysOf(fr.geometry).filter(p => p[0].some(([lo, la]) => la > 47 && lo < 4)), ukXY, 4, '#3d5a48'));
  const S = maskSampler(ukP, ukXY, 2);
  const cities = UK_CITIES.map(([la, lo, w]) => { const [x, y] = ukXY([lo, la]); return { x, y, w }; }); const wsum = cities.reduce((a, c) => a + c.w, 0);
  for (let i = 0; i < DOT_N; i++) {
    let x, y, tries = 0;
    do { if (rnd() < 0.55) { let r = rnd() * wsum, c = cities[0]; for (const cc of cities) { r -= cc.w; if (r <= 0) { c = cc; break; } } x = c.x + R(-1, 1) * 28 * Math.sqrt(c.w) * rnd(); y = c.y + R(-1, 1) * 28 * Math.sqrt(c.w) * rnd(); } else { x = R(S.x0, S.x1); y = R(S.y0, S.y1); } tries++; } while (!S.ok(x, y) && tries < 50);
    UKD.push({ x, z: y, t: T_UKMAP + 1.6 + Math.pow(i / DOT_N, 1.1) * 5.5, today: i < DOT_N / 4.93 });
  }
  // ---- US (Albers USA units, as the zombie map)
  const ust = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = ust.objects.states.geometries.filter(g => !['Alaska', 'Hawaii'].includes(g.properties.name));
  const merged = topojson.merge(ust, L48); const MWu = 975, MHu = 610; const usXY = ([x, y]) => [x - MWu / 2, y - MHu / 2];
  const usP = merged.coordinates; usGroupM.add(slabFrom(usP, usXY, 10, '#d8a24a'));
  const meshB = topojson.mesh(ust, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b);
  const pts = []; for (const line of meshB.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = usXY(line[i]), b = usXY(line[i + 1]); pts.push(a[0], 10.3, a[1], b[0], 10.3, b[1]); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); usGroupM.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#8a6a30', transparent: true, opacity: 0.6 })));
  const S2 = maskSampler(usP, usXY, 2);
  const proj = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
  const met = [[40.71, -74.0, 19.8], [34.05, -118.24, 13.2], [41.88, -87.63, 9.6], [32.78, -96.8, 7.6], [29.76, -95.37, 7.1], [38.9, -77.04, 6.4], [39.95, -75.17, 6.2], [25.76, -80.19, 6.1], [33.75, -84.39, 6.1], [42.36, -71.06, 4.9], [33.45, -112.07, 4.8], [37.77, -122.42, 4.7], [42.33, -83.05, 4.4], [47.61, -122.33, 4.0], [44.98, -93.27, 3.7], [32.72, -117.16, 3.3], [27.95, -82.46, 3.2], [39.74, -104.99, 3.0], [38.63, -90.2, 2.8], [35.23, -80.84, 2.7], [29.42, -98.49, 2.6], [45.52, -122.68, 2.5], [40.44, -79.99, 2.4], [36.17, -115.14, 2.3], [39.1, -84.51, 2.3], [39.1, -94.58, 2.2], [36.16, -86.78, 2.0], [39.96, -83.0, 2.1]]
    .map(([la, lo, w]) => { const p = proj([lo, la]); return p ? { x: p[0] - MWu / 2, y: p[1] - MHu / 2, w } : null; }).filter(Boolean);
  const ws = met.reduce((a, c) => a + c.w, 0);
  for (let i = 0; i < DOT_N; i++) {
    const brit = i < DOT_N / 4.93; let x, y, tries = 0;
    do { if (!brit && rnd() < 0.7) { let r = rnd() * ws, c = met[0]; for (const cc of met) { r -= cc.w; if (r <= 0) { c = cc; break; } } x = c.x + R(-1, 1) * 9 * Math.sqrt(c.w) * rnd(); y = c.y + R(-1, 1) * 9 * Math.sqrt(c.w) * rnd(); } else { x = R(S2.x0, S2.x1); y = R(S2.y0, S2.y1); } tries++; } while (!S2.ok(x, y) && tries < 60);
    USD.push({ x, z: y, brit, t: T_USMAP + 0.6 + rnd() * 1.6 });
  }
}
const dm = new THREE.Object3D(), cUS = new THREE.Color('#ff5a4a'), cUK = new THREE.Color('#ffffff');
function updateMaps(t, which) {
  ukGroupM.visible = which === 'uk'; usGroupM.visible = which === 'us';
  if (which === 'uk') {
    for (let i = 0; i < DOT_N; i++) {
      const D = UKD[i]; let s = 0, y = 6.5, col = cUK;
      if (t < T_UKMAP + 1.2) { s = D.today ? 1 : 0; }                               // today: Brits (white)
      else if (t < T_UKMAP + 1.6) { s = D.today ? 1 - smooth(T_UKMAP + 1.2, T_UKMAP + 1.6, t) : 0; }
      else { const k = smooth(D.t - 0.25, D.t, t); s = k; y = 6.5 + (1 - k) * 60; col = cUS; }
      dm.position.set(D.x, y, D.z); dm.scale.set(2.2 * s, 1.2, 2.2 * s); dm.updateMatrix(); ukDots.setMatrixAt(i, dm.matrix); ukDots.setColorAt(i, col);
    }
    ukDots.instanceMatrix.needsUpdate = true; ukDots.instanceColor.needsUpdate = true;
    const u = (t - T_UKMAP) / (T_LONDON - T_UKMAP);
    mapCam.position.set(lerp(-60, 40, u), lerp(1500, 1250, ease(u)), lerp(760, 620, ease(u))); mapCam.lookAt(lerp(-30, -10, u), 0, lerp(-40, -20, u));
  } else {
    for (let i = 0; i < DOT_N; i++) {
      const D = USD[i]; let s;
      if (D.brit) s = smooth(T_USMAP + 1.4, T_USMAP + 2.4, t + (i % 7) * 0.08); else s = 1 - smooth(D.t - 0.3, D.t, t);
      dm.position.set(D.x, 10.6, D.z); dm.scale.set(1.3 * s, 0.8, 1.3 * s); dm.updateMatrix(); usDots.setMatrixAt(i, dm.matrix); usDots.setColorAt(i, D.brit ? cUK : cUS);
    }
    usDots.instanceMatrix.needsUpdate = true; usDots.instanceColor.needsUpdate = true;
    const u = (t - T_USMAP) / (T_TALK - T_USMAP);
    mapCam.position.set(lerp(-120, 80, u), lerp(2350, 2200, u), lerp(1500, 1350, u)); mapCam.lookAt(0, 0, 10);
  }
  mapCam.near = 1; mapCam.far = 20000; mapCam.updateProjectionMatrix();
}
// =================== street update + cameras ===================
function setDay(london) {
  if (london) { skyMat.uniforms.uTop.value.set('#8f99a6'); skyMat.uniforms.uHor.value.set('#c9ced4'); sunL.intensity = 1.1; sunL.color.set('#f2f0ec'); hemi.intensity = 1.7; hemi.color.set(0xd8dde4); hemi.groundColor.set(0x6a625a); city.fog.color.set('#c2c7cd'); city.fog.near = 120; city.fog.far = 1100; }
  else { skyMat.uniforms.uTop.value.set('#3d78c8'); skyMat.uniforms.uHor.value.set('#bcd6ee'); sunL.intensity = 3.0; sunL.color.set('#fff2dc'); hemi.intensity = 1.1; hemi.color.set(0xbfd6f2); hemi.groundColor.set(0x5b4e40); city.fog.color.set('#bcd0e4'); city.fog.near = 200; city.fog.far = 2400; }
  for (const m of winMats) m.emissiveIntensity = 0; for (const m of lampHeads) m.emissiveIntensity = 0;
  clouds.forEach(c => { c.visible = london; c.material.color.set('#e4e6ea'); });
}
function updateStreet(t, shot) {
  const london = shot !== 'times'; setDay(london);
  sunL.position.copy(cam.position).add(new THREE.Vector3(-90, 160, 120)); sunL.target.position.copy(cam.position); sunL.target.updateMatrixWorld();
  for (const c of cars) { if (c.cross) continue; c.g.visible = false; }
  for (const P of people) P.p.outer.visible = false;
  ball.visible = false;
  for (const J of jam) J.g.visible = london && !(shot === 'talk' && Math.abs(J.x - 360) < 7 && J.lane > 3);
  for (const B of bunting) B.tri.rotation.x = 0.25 * Math.sin(t * 3 + B.ph);
  const pairX = 360;
  for (const C of londonCrowd) {
    const o = C.p.outer; const show = london && Math.hypot(C.x - cam.position.x, C.z - cam.position.z) > 2.4 && !(shot === 'talk' && Math.abs(C.x - pairX) < 4.0 && C.z > 0.5);
    o.visible = show; if (!show) continue;
    const x = C.walk ? C.x + Math.sin(t * 0.4 + C.ph) * 0.6 : C.x;
    o.position.set(x, (Math.abs(C.z) > 7 ? 0.18 : 0) + 0.95, C.z); o.rotation.set(0, C.ry, 0);
    if (C.walk) poseWalk(C.p, t * 4 + C.ph, 0.6); else poseIdle(C.p, t, C.ph);
  }
  // Times Square: one Brit with a cup of tea, a tumbleweed
  brit.outer.visible = weed.visible = shot === 'times';
  if (shot === 'times') {
    brit.outer.position.set(78.5, 0.95, 0.9); brit.outer.rotation.set(0, -Math.PI / 2 + 0.25, 0); poseIdle(brit, t, 0);
    const sip = 0.5 + 0.5 * Math.sin((t - T_TIMES) * 1.6); brit.arms[1].rotation.x = -0.5 - 0.5 * sip; brit.elbows[1].rotation.x = -1.3 - 0.4 * sip;
    const wx = lerp(150, 70, (t - T_TIMES) / (T_USMAP - T_TIMES)); weed.position.set(wx, 0.5 + Math.abs(Math.sin(t * 3.2)) * 0.6, -3.2); weed.rotation.set(0, 0, t * 3.0);
  }
  yank.outer.visible = clerk.outer.visible = shot === 'talk';
  if (shot === 'talk') {
    yank.outer.position.set(pairX - 0.5, 1.13, 9.9); yank.outer.rotation.set(0, Math.PI * 0.3, 0); poseIdle(yank, t, 1);
    clerk.outer.position.set(pairX + 0.55, 1.13, 10.1); clerk.outer.rotation.set(0, -Math.PI * 0.3, 0); poseIdle(clerk, t, 2);
    const talkA = Math.sin(t * 6) > 0 ? 1 : 0; yank.arms[0].rotation.x = -0.4 - 0.5 * talkA * (t < 53.6 ? 1 : 0.3);
  }
}
function streetCamera(t, shot) {
  let pos, look, fov = 62;
  if (shot === 'london') { const u = (t - T_LONDON) / (T_SHOP - T_LONDON); pos = new THREE.Vector3(lerp(292, 297, u), lerp(7.5, 6.8, u), lerp(-1.0, 0.0, u)); look = new THREE.Vector3(lerp(330, 336, u), 0.5, lerp(-0.5, 0.5, u)); fov = 60; }
  else if (shot === 'times') { const u = (t - T_TIMES) / (T_USMAP - T_TIMES); pos = new THREE.Vector3(lerp(70, 73, u), 1.6, 1.6); look = pos.clone().add(new THREE.Vector3(1, 0.32, -0.04)); fov = 70; }
  else { const u = (t - T_TALK) / (T_MID - T_TALK); pos = new THREE.Vector3(lerp(359.6, 360.3, u), 1.9, 5.4); look = new THREE.Vector3(360.0, 2.05, 11.0); fov = 56; }
  cam.fov = fov; cam.near = 0.1; cam.far = 6000; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'b1', 'b2', 'l1', 'l2'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [3.3, 5.6, 'Problem one: there are<br>5 Americans for every Brit.'],
  [5.8, 7.8, 'And Britain is smaller<br>than Oregon.'],
  [8.3, 10.9, 'By plane? Every airliner on Earth<br>would need a month.'],
  [11.1, 13.8, "So let's say everyone<br>teleports at midnight."],
  [16.6, 20.8, 'Britain gets denser<br>than Bangladesh.'],
  [21.0, 25.6, '11 Americans in every<br>British home.'],
  [26.3, 29.8, 'And they all drive<br>on the left.'],
  [30.0, 33.7, 'Good news: the road signs<br>are still in miles.'],
  [34.3, 36.9, 'British farms could feed<br>about 1 in 8 of them.'],
  [37.1, 39.7, 'By lunch, the shelves<br>are empty.'],
  [40.3, 42.6, 'Meanwhile, 69 million Brits<br>get all of America.'],
  [42.8, 44.8, 'Still making 100 million<br>cups of tea a day.'],
  [45.3, 47.4, 'America gets emptier<br>than Idaho.'],
  [47.6, 49.8, 'Every Brit gets<br>two houses.'],
  [50.3, 53.5, 'Ask for "pants" in London —<br>you get underwear.'],
  [53.7, 56.8, 'Chips are fries.<br>Crisps are chips.'],
  [57.3, 59.1, 'At midnight,<br>everyone goes home.'],
  [59.2, 60.9, 'Who had the<br>better day?'],
];
const BUBBLES = [
  [50.4, 52.0, 'b1', 'Where can I buy pants?'], [51.9, 53.5, 'b2', "Underwear's in aisle 3."],
  [53.8, 55.3, 'b1', 'Chips, please!'], [55.2, 56.8, 'b2', 'Crisps or chips?'],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < T_RATIO) show = 0;
  else if (t < T_AIR) { stat = '<b></b>🇺🇸 342M · 🇬🇧 69M'; lab = 'AMERICANS PER BRIT'; val = '4.9'; sub = 'UK: 93,410 SQ MI · OREGON: 95,988'; }
  else if (t < T_TELE) { const d = Math.max(1, Math.ceil(31 * smooth(T_AIR + 0.3, T_TELE - 1.2, t))); stat = '<b></b>EVERY AIRLINE ON EARTH'; lab = 'AIRLIFT'; val = 'Day ' + d; sub = '13.4M PASSENGERS A DAY'; }
  else if (t < T_UKMAP + 0.3) show = 0;
  else if (t < T_LONDON) { const k = smooth(T_UKMAP + 1.6, T_UKMAP + 7.2, t); stat = '<b></b>🇬🇧 GREAT BRITAIN'; lab = 'PEOPLE / SQ MI'; val = fmtInt(lerp(741, 3659, k)); sub = 'BANGLADESH: 3,417'; }
  else if (t < T_SHOP) { stat = '<b></b>🇬🇧 LONDON'; lab = 'AMERICAN DRIVERS'; val = '237.7M'; sub = 'FOR 41.7M UK VEHICLES'; }
  else if (t < T_TIMES) { stat = '<b></b>MODEL'; lab = 'FOOD'; val = '1 in 8'; sub = 'UK GROWS ~60% OF ITS OWN FOOD'; }
  else if (t < T_USMAP) { stat = '<b></b>🇺🇸 TIMES SQUARE'; lab = 'BRITS'; val = '69M'; sub = 'IN A COUNTRY BUILT FOR 342M'; }
  else if (t < T_TALK) { const k = smooth(T_USMAP + 0.6, T_USMAP + 2.4, t); stat = '<b></b>🇺🇸 USA'; lab = 'PEOPLE / SQ MI'; val = lerp(96.8, 19.6, k).toFixed(1); sub = 'IDAHO: ~24'; }
  else if (t < T_MID) show = 0;
  else show = 0;
  return { stat, lab, val, sub, show };
}
function placeTag(e, v3, camera, dy, a) {
  camera.updateMatrixWorld();
  const p = v3.clone().project(camera); const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
  e.style.left = clamp(x, 200, W - 200) + 'px'; e.style.top = (y + dy) + 'px'; e.style.opacity = p.z < 1 ? a : 0;
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(T_RATIO - 0.35, T_RATIO, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const cuts = [T_RATIO, T_AIR, T_UKMAP, T_LONDON, T_SHOP, T_TIMES, T_USMAP, T_TALK, T_MID];
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(...cuts.map(x => fadeWin(t, x - 0.18, x + 0.18, 0.18)));
  el.flash.style.opacity = fadeWin(t, T_TELE + 0.6, T_UKMAP + 0.2, 0.5) * 0.95;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  for (const id of ['b1', 'b2']) el[id].style.opacity = 0;
}
function updateTags(t, shot) {
  // speech bubbles in the talk shot, group labels in the studio / globe
  if (shot === 'talk') for (const [a, b, id, txt] of BUBBLES) if (t >= a - 0.2 && t < b + 0.2) { el[id].textContent = txt; const who = id === 'b1' ? yank : clerk; placeTag(el[id], who.outer.position.clone().add(new THREE.Vector3(0, 0.95, 0)), cam, -30, fadeWin(t, a, b, 0.2)); }
  const showS = shot === 'studio' ? fadeWin(t, T_RATIO + 0.3, T_AIR, 0.3) : 0, showG = shot === 'globe-intro' ? smooth(0.8, 1.4, t) : shot === 'globe-back' ? fadeWin(t, T_MID + 0.4, T_END, 0.3) : 0;
  if (showS > 0) { el.l1.innerHTML = '🇺🇸 342 MILLION'; el.l2.innerHTML = '🇬🇧 69 MILLION'; placeTag(el.l1, new THREE.Vector3(0, 3.0, -3.4), stCam, -20, showS * smooth(T_RATIO + 1.0, T_RATIO + 1.6, t)); placeTag(el.l2, new THREE.Vector3(0, 2.6, 3.6), stCam, -20, showS); }
  else if (showG > 0) { el.l1.innerHTML = '🇺🇸 USA'; el.l2.innerHTML = '🇬🇧 UK'; placeTag(el.l1, ll2v(...US_C, ER * 1.05), spaceCam, -30, showG); placeTag(el.l2, ll2v(...UK_C, ER * 1.05), spaceCam, -30, showG); }
  else { el.l1.style.opacity = 0; el.l2.style.opacity = 0; }
}

// =================== main ===================
function shotAt(t) {
  return t < T_RATIO ? 'globe-intro' : t < T_AIR ? 'studio' : t < T_TELE ? 'globe-air' : t < T_UKMAP ? 'globe-tele' : t < T_LONDON ? 'ukmap' : t < T_SHOP ? 'london'
    : t < T_TIMES ? 'shop' : t < T_USMAP ? 'times' : t < T_TALK ? 'usmap' : t < T_MID ? 'talk' : 'globe-back';
}
window.renderAt = (t) => {
  updateDOM(t);
  const shot = shotAt(t);
  if (shot.startsWith('globe')) globeCamera(t, shot.slice(6) === 'tele' ? 'tele' : shot.slice(6));
  else if (shot === 'studio') updateStudio(t);
  else if (shot === 'london' || shot === 'times' || shot === 'talk') { streetCamera(t, shot); updateStreet(t, shot); }
  updateTags(t, shot);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (shot.startsWith('globe')) { updateGlobe(t, shot.slice(6)); renderer.render(space, spaceCam); }
  else if (shot === 'studio') renderer.render(studio, stCam);
  else if (shot === 'ukmap') { updateMaps(t, 'uk'); renderer.render(mapScene, mapCam); }
  else if (shot === 'usmap') { updateMaps(t, 'us'); renderer.render(mapScene, mapCam); }
  else if (shot === 'shop') { updateShop(t); renderer.render(shop, shopCam); }
  else renderer.render(city, cam);
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe().then(buildMaps)]).then(() => { window.renderAt(0); return true; });
