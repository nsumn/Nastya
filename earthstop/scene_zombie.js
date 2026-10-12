import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
/* global d3, topojson */

// "What if a real zombie showed up on Halloween?" — NYC street party -> US map spread -> northern Rockies.
// Facts: Alemi, Bierbaum, Myers & Sethna (Cornell, 2015, arXiv:1503.01104): ~300M-person US simulation; dense cities fall in days,
// the northern Rockies hold out for months; LA-SF corridor hit worse (two epicentres); zombies don't drive or fly.
// The map below is our own simplified density-front model, tuned only to show those qualitative results.
// =================== timeline ===================
const NOTICE = 4.0, BLOCK = 10.0, RISE = 16.6, MAP = 17.4, CITIES = 24.0, RURAL = 31.0, ROCKIES = 40.0, BACKMAP = 55.0, T_END = 62.0;
const FPS = 30;
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
      const h = rnd() < 0.15 ? R(38, 52) : R(16, 34);
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
for (const side of [-1, 1]) for (let x = -150; x < 1300; x += R(13, 19)) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; if (side < 0 && x > 50 && x < 96) continue; streetTree(x, side * R(8.0, 8.4)); }
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



// =================== night sky for the city ===================
const MOON_DIR = new THREE.Vector3(-0.45, 0.42, 0.78).normalize();
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSunS: { value: MOON_DIR.clone() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 0.07 }, uDusk: { value: 0.0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d); c+=vec3(0.10,0.06,0.16)*pow(1.0-max(dot(d,uUp),0.0),3.0)*0.6; gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 40, 24), domeMat); dome.frustumCulled = false; dome.renderOrder = -10; city.add(dome);
{
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(0.08, 1), R(-1, 1)).normalize().multiplyScalar(4500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  city.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
}
function moonTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.42, 'rgba(255,230,180,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4ecd6'; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(170,160,140,0.5)'; for (const [x, y, r] of [[112, 116, 12], [142, 140, 9], [132, 106, 6], [118, 146, 7], [148, 118, 5]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  });
}
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), fog: false, depthWrite: false, transparent: true })); moon.scale.setScalar(900); city.add(moon);

// =================== jack-o'-lanterns ===================
const faceEmi = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffb030';
  const fx = 64;  // face centred at u = 0.25
  g.beginPath(); g.moveTo(fx - 22, 50); g.lineTo(fx - 8, 50); g.lineTo(fx - 15, 36); g.fill();
  g.beginPath(); g.moveTo(fx + 8, 50); g.lineTo(fx + 22, 50); g.lineTo(fx + 15, 36); g.fill();
  g.beginPath(); g.moveTo(fx - 26, 66); for (let i = 0; i <= 8; i++) g.lineTo(fx - 26 + i * 6.5, 66 + (i % 2 ? 10 : 2) + Math.sin(i / 8 * Math.PI) * 10); g.lineTo(fx + 26, 66); g.quadraticCurveTo(fx, 72, fx - 26, 66); g.fill();
});
const pumpkinMat = new THREE.MeshStandardMaterial({ color: '#e0701c', roughness: 0.7, emissiveMap: faceEmi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.2, flatShading: true });
const pumpkinGeo = (() => { const g = new THREE.SphereGeometry(1, 14, 10); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(z, x); const r = 1 + 0.07 * Math.cos(a * 8); p.setX(i, x * r); p.setZ(i, z * r); } g.computeVertexNormals(); return g; })();
const stemGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.22, 6);
function jackO(x, y, z, s, faceYaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); city.add(g);
  const b = mesh(pumpkinGeo, pumpkinMat); b.scale.set(s, s * 0.78, s); b.rotation.y = faceYaw; b.position.y = s * 0.78; g.add(b);
  const st = mesh(stemGeo, M('#4b5a22')); st.scale.setScalar(s * 1.6); st.position.y = s * 1.56 + 0.05; st.rotation.z = 0.2; g.add(st);
  return g;
}
// SphereGeometry u=0.25 faces -z; rotate so the face looks across the street
for (let x = 48; x < 100; x += R(2.4, 4.2)) { jackO(x, 0.18, -11.55 + R(-0.15, 0.1), R(0.2, 0.32), Math.PI); if (rnd() < 0.5) jackO(x + 0.5, 0.18, -11.45, R(0.14, 0.2), Math.PI + 0.3); }
for (let x = 48; x < 100; x += R(3, 5)) jackO(x, 0.18, 11.55, R(0.2, 0.3), 0);
const pumpLights = [];
for (const [x, z] of [[60, -11.0], [70, -11.0], [80, -11.0], [66, 11.0]]) { const l = new THREE.PointLight(0xff8a2a, 6, 9, 1.6); l.position.set(x, 0.8, z); city.add(l); pumpLights.push(l); }
// string lights / fake cobweb? keep it clean: orange garlands on the facades
{
  const bulbs = []; for (let x = 46; x < 100; x += 0.55) { const sag = 0.35 * Math.pow(Math.sin(((x - 46) % 6.6) / 6.6 * Math.PI), 1); bulbs.push([x, 3.2 - sag, -11.92]); }
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffa040' }), bulbs.length); const d = new THREE.Object3D();
  bulbs.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); city.add(im);
}

// =================== costumes + zombies ===================
const ZSKIN = '#8fb860';
const COSTUMES = {
  witch: { top: '#3a1f4a', bottom: '#1d1d22', dress: true, add: (r, c) => { addPart(r, new THREE.ConeGeometry(0.15, 0.45, 8), c.hat || '#1a1a1e', 0, 1.93, 0); addPart(r, new THREE.CylinderGeometry(0.27, 0.27, 0.02, 12), c.hat || '#1a1a1e', 0, 1.72, 0); } },
  pumpkin: { top: '#e0701c', bottom: '#2a2a2a', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.21, 10, 8), c.z ? '#9a8a3a' : '#e8781e', 0, 1.64, 0); addPart(r, new THREE.CylinderGeometry(0.025, 0.035, 0.08, 5), '#4b5a22', 0, 1.88, 0); } },
  ghost: { top: '#f2f2f2', bottom: '#f2f2f2', ghost: true, add: (r, c) => { addPart(r, new THREE.CylinderGeometry(0.17, 0.4, 1.5, 12, 1, true), c.z ? '#cfe6b8' : '#f4f4f6', 0, 0.98, 0); addPart(r, new THREE.SphereGeometry(0.19, 12, 9), c.z ? '#cfe6b8' : '#f4f4f6', 0, 1.66, 0); addPart(r, new THREE.BoxGeometry(0.05, 0.06, 0.02), '#111', -0.06, 1.68, 0.18); addPart(r, new THREE.BoxGeometry(0.05, 0.06, 0.02), '#111', 0.06, 1.68, 0.18); } },
  vampire: { top: '#151518', bottom: '#151518', add: (r, c) => { addPart(r, new THREE.BoxGeometry(0.52, 1.0, 0.03), '#7a0f1a', 0, 1.0, -0.14); addPart(r, new THREE.BoxGeometry(0.5, 0.18, 0.04), '#7a0f1a', 0, 1.5, -0.1); } },
  devil: { top: '#b0202a', bottom: '#1d1d22', add: (r, c) => { for (const sx of [-0.07, 0.07]) addPart(r, new THREE.ConeGeometry(0.025, 0.1, 6), '#d02a2a', sx, 1.78, 0.02); } },
  hero: { top: '#2a4fb0', bottom: '#2a4fb0', add: (r, c) => { addPart(r, new THREE.BoxGeometry(0.46, 0.9, 0.025), '#c8202a', 0, 1.02, -0.13); } },
  cat: { top: '#1a1a1e', bottom: '#1a1a1e', add: (r, c) => { for (const sx of [-0.07, 0.07]) addPart(r, new THREE.ConeGeometry(0.04, 0.09, 4), '#1a1a1e', sx, 1.77, 0); } },
  cowboy: { top: '#8a5a32', bottom: '#2a3a5c', add: (r, c) => { addPart(r, new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14), '#6b4a2e', 0, 1.73, 0); addPart(r, new THREE.CylinderGeometry(0.12, 0.14, 0.14, 10), '#6b4a2e', 0, 1.8, 0); } },
  astronaut: { top: '#e8e8ea', bottom: '#e8e8ea', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.2, 12, 9), '#f2f2f2', 0, 1.64, -0.01); addPart(r, new THREE.BoxGeometry(0.2, 0.1, 0.02), '#2a3a5a', 0, 1.65, 0.19); addPart(r, new THREE.BoxGeometry(0.3, 0.4, 0.14), '#d8d8dc', 0, 1.22, -0.2); } },
  princess: { top: '#e88ab8', bottom: '#e88ab8', dress: true, add: (r, c) => { addPart(r, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8, 1, true), '#f0c040', 0, 1.79, 0); } },
  pirate: { top: '#e8e2d0', bottom: '#1d1d22', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.128, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#b0202a', 0, 1.655, 0); addPart(r, new THREE.BoxGeometry(0.06, 0.05, 0.02), '#111', 0.05, 1.65, 0.11); } },
  mummy: { top: '#e2d6b8', bottom: '#e2d6b8', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.125, 10, 8), '#e8dcc0', 0, 1.64, 0.005); } },
};
function addPart(root, geo, col, x, y, z) { const m = new THREE.Mesh(geo, M(col, { flatShading: true })); m.position.set(x, y, z); m.castShadow = true; root.add(m); return m; }
const SKINS_C = ['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c', '#6b4329'];
function darken(hex, k) { return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString(); }
function makeCostumed(kind, skin, kid, zombie) {
  const c = COSTUMES[kind];
  const o = { skin: zombie ? ZSKIN : skin, top: zombie ? darken(c.top, 0.75) : c.top, bottom: zombie ? darken(c.bottom, 0.75) : c.bottom, dress: !!c.dress, shorts: false, longSleeve: true, hairStyle: 0.3, cap: false, hair: zombie ? '#3a3a2a' : '#2a1d14', shoe: '#1b1b1b' };
  const p = makePerson(rnd, o);
  c.add(p.root, { z: zombie });
  if (c.ghost) p.outer.traverse(m => { if (m.isMesh && m.geometry.type === 'CapsuleGeometry') m.visible = false; });
  if (kid) p.outer.scale.setScalar(0.66);
  city.add(p.outer); p.outer.visible = false;
  return p;
}
// cast: positions on the sidewalk (side -1) around the party
const KINDS = Object.keys(COSTUMES);
const cast = [];
{
  const spots = [[66.0, -10.2], [67.7, -10.9], [64.6, -9.0], [68.8, -10.6], [63.2, -10.4], [70.2, -9.2], [62.0, -9.4], [71.6, -10.3], [65.4, -11.0], [69.4, -8.6],
    [60.6, -10.6], [73.0, -9.0], [61.4, -8.6], [74.4, -10.4], [58.8, -9.6], [75.6, -8.9], [57.4, -10.8], [77.0, -10.0], [59.6, -11.2], [72.4, -11.1], [76.4, -11.0], [56.4, -9.2]];
  // infection order (the party block): times in seconds
  const tinf = [5.6, 8.1, 8.9, 10.4, 10.9, 11.6, 12.1, 12.6, 13.0, 13.4, 13.8, 14.1, 14.4, 14.7, 15.0, 15.3, 15.6, 15.9, 16.1, 16.3, 99, 99];
  spots.forEach(([x, z], i) => {
    const kind = KINDS[i % KINDS.length]; const skin = pick(SKINS_C); const kid = i % 5 === 3 || i % 7 === 6;
    const s = seed; const human = makeCostumed(kind, skin, kid, false); const zom = makeCostumed(kind, skin, kid, true);
    cast.push({ x, z, kind, kid, human, zom, tinf: tinf[i], yaw: R(-Math.PI, Math.PI), ph: R(0, 6), biter: -1 });
  });
  // who bites whom: the nearest already-infected cast member (index 0 is bitten by patient zero)
  for (let i = 0; i < cast.length; i++) {
    if (i === 0) continue; let best = 0, bd = 1e9;
    for (let j = 0; j < cast.length; j++) if (cast[j].tinf < cast[i].tinf - 0.9) { const d = Math.hypot(cast[j].x - cast[i].x, cast[j].z - cast[i].z); if (d < bd) { bd = d; best = j; } }
    cast[i].biter = best;
  }
}
// patient zero: a real zombie in a torn suit, arriving from down the sidewalk
const zero = makePerson(rnd, { skin: ZSKIN, top: '#3a3f2e', bottom: '#2a2a22', dress: false, shorts: false, longSleeve: true, hairStyle: 0.0, cap: false, shoe: '#1b1b1b' });
city.add(zero.outer);
// green "turn" flashes
const flashTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(220,255,180,1)'); gr.addColorStop(0.3, 'rgba(120,255,90,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const flashes = cast.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); s.visible = false; city.add(s); return s; });

function poseZombie(p, t, ph, amt = 1) {
  const s = Math.sin(t * 3.2 + ph);
  p.legs[0].rotation.x = s * 0.32 * amt; p.legs[1].rotation.x = -s * 0.32 * amt;
  p.knees[0].rotation.x = Math.max(0, -Math.cos(t * 3.2 + ph)) * 0.45 * amt; p.knees[1].rotation.x = Math.max(0, Math.cos(t * 3.2 + ph)) * 0.45 * amt;
  p.arms[0].rotation.set(-1.45 + 0.08 * Math.sin(t * 2.1 + ph), 0, 0.12); p.arms[1].rotation.set(-1.38 + 0.08 * Math.cos(t * 1.9 + ph), 0, -0.12);
  p.elbows[0].rotation.x = -0.12; p.elbows[1].rotation.x = -0.2;
}
// position of a cast zombie after it turns: shuffle toward its next victim, then drift down the sidewalk
const ZSPEED = 0.55;
function castPos(i, t) {
  const c = cast[i];
  const targets = cast.map((v, k) => ({ v, k })).filter(o => o.v.biter === i && o.v.tinf < 98).sort((a, b) => a.v.tinf - b.v.tinf);
  let px = c.x, pz = c.z, pt = c.tinf;
  for (const { v } of targets) {
    if (t < pt) break;
    const arrive = v.tinf - 0.1; const ax = v.x + 0.42 * Math.cos(c.yaw), az = v.z + 0.3 * Math.sin(c.yaw);
    if (t <= arrive) { const u = clamp((t - pt) / Math.max(arrive - pt, 0.01), 0, 1); return { x: lerp(px, ax, u), z: lerp(pz, az, u), yaw: Math.atan2(ax - px, az - pz), lean: smooth(arrive - 0.35, arrive, t) * 0.35 }; }
    px = ax; pz = az; pt = v.tinf + 0.4;
  }
  const dt = Math.max(0, t - pt); return { x: px + ZSPEED * dt, z: pz + 0.15 * Math.sin(dt * 0.7 + c.ph), yaw: Math.PI / 2, lean: 0 };
}
function zeroPos(t) {
  const v = cast[0]; const ax = v.x - 0.45, az = v.z + 0.12;
  if (t < 5.5) { const u = smooth(0, 5.5, t); return { x: lerp(61.2, ax, u), z: lerp(-9.9, az, u), yaw: Math.PI / 2, lean: smooth(5.15, 5.5, t) * 0.4 }; }
  if (t < 6.2) return { x: ax, z: az, yaw: Math.PI / 2, lean: 0.4 * (1 - smooth(5.8, 6.2, t)) };
  // then go for #1 (if zero is its biter) — otherwise drift
  const dt = t - 6.2; return { x: ax + ZSPEED * dt, z: az + 0.1 * Math.sin(dt), yaw: Math.PI / 2, lean: 0 };
}
function updateCast(t) {
  // patient zero
  const zp = zeroPos(t); zero.outer.visible = t < RISE + 0.5; zero.outer.position.set(zp.x, 0.18 + 0.95, zp.z); zero.outer.rotation.set(zp.lean, zp.yaw, 0, 'YXZ'); poseZombie(zero, t, 0.4);
  for (let i = 0; i < cast.length; i++) {
    const c = cast[i]; const turned = t >= c.tinf;
    c.human.outer.visible = !turned && t < RISE + 0.5; c.zom.outer.visible = turned && t < RISE + 0.5;
    const bob = c.kid ? 0.66 : 1; const y0 = 0.18 + 0.95 * bob;
    if (!turned) {
      // partying: idle, little bounces, facing a neighbour; a beat of "shock" right before being bitten
      const o = c.human.outer; o.position.set(c.x, y0, c.z); o.rotation.set(0, c.yaw + 0.2 * Math.sin(t * 0.7 + c.ph), 0);
      poseIdle(c.human, t, c.ph); c.human.arms[1].rotation.x = -0.4 - 0.25 * Math.max(0, Math.sin(t * 2.4 + c.ph));
      o.position.y += 0.03 * Math.max(0, Math.sin(t * 6 + c.ph));
    } else {
      const p = castPos(i, t); const o = c.zom.outer; o.position.set(p.x, y0, p.z); o.rotation.set(p.lean, p.yaw, 0, 'YXZ'); poseZombie(c.zom, t, c.ph);
      if (t - c.tinf < 0.5) { const k = (t - c.tinf) / 0.5; o.rotation.x = -0.25 * Math.sin(k * Math.PI); }
    }
    const f = flashes[i]; const ft = t - c.tinf; f.visible = ft >= -0.05 && ft < 0.7 && t < RISE;
    if (f.visible) { f.position.set(c.x, y0 + 0.5 * bob, c.z); const s = (0.4 + 2.2 * clamp(ft + 0.05, 0, 1)) * bob; f.scale.set(s, s, 1); f.material.opacity = 1 - clamp(ft / 0.7, 0, 1); }
  }
}

// =================== US MAP (Albers USA units, 975 x 610; x right, y = 610 - albersY) ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#05070d');
const mapCam = new THREE.PerspectiveCamera(36, W / H, 1, 6000);
mapScene.add(new THREE.HemisphereLight(0x9fb0d0, 0x101018, 0.9));
const mapKey = new THREE.DirectionalLight(0xc8d4ff, 1.2); mapKey.position.set(-300, 900, 700); mapScene.add(mapKey);
// approximate 2020 state population (millions) and land area (thousand sq mi) — used only for the rural density floor
const STATES = { Alabama: [5.0, 50.6], Alaska: [0.73, 571], Arizona: [7.2, 113.6], Arkansas: [3.0, 52.0], California: [39.5, 155.8], Colorado: [5.8, 103.6], Connecticut: [3.6, 4.8], Delaware: [1.0, 1.9], 'District of Columbia': [0.69, 0.06], Florida: [21.5, 53.6], Georgia: [10.7, 57.5], Hawaii: [1.46, 6.4], Idaho: [1.8, 82.6], Illinois: [12.8, 55.5], Indiana: [6.8, 35.8], Iowa: [3.2, 55.9], Kansas: [2.9, 81.8], Kentucky: [4.5, 39.5], Louisiana: [4.7, 43.2], Maine: [1.4, 30.8], Maryland: [6.2, 9.7], Massachusetts: [7.0, 7.8], Michigan: [10.1, 56.5], Minnesota: [5.7, 79.6], Mississippi: [3.0, 46.9], Missouri: [6.2, 68.7], Montana: [1.1, 145.5], Nebraska: [2.0, 76.8], Nevada: [3.1, 109.8], 'New Hampshire': [1.4, 8.95], 'New Jersey': [9.3, 7.4], 'New Mexico': [2.1, 121.3], 'New York': [20.2, 47.1], 'North Carolina': [10.4, 48.6], 'North Dakota': [0.78, 69.0], Ohio: [11.8, 40.9], Oklahoma: [4.0, 68.6], Oregon: [4.2, 95.9], Pennsylvania: [13.0, 44.7], 'Rhode Island': [1.1, 1.0], 'South Carolina': [5.1, 30.1], 'South Dakota': [0.89, 75.8], Tennessee: [6.9, 41.2], Texas: [29.1, 261.2], Utah: [3.3, 82.2], Vermont: [0.64, 9.2], Virginia: [8.6, 39.5], Washington: [7.7, 66.5], 'West Virginia': [1.8, 24.0], Wisconsin: [5.9, 54.2], Wyoming: [0.58, 97.1] };
// metro areas: [name, lat, lon, population (millions, approx.)]
const METROS = [['New York', 40.71, -74.0, 19.8], ['Los Angeles', 34.05, -118.24, 13.2], ['Chicago', 41.88, -87.63, 9.6], ['Dallas', 32.78, -96.8, 7.6], ['Houston', 29.76, -95.37, 7.1], ['Washington', 38.9, -77.04, 6.4], ['Philadelphia', 39.95, -75.17, 6.2], ['Miami', 25.76, -80.19, 6.1], ['Atlanta', 33.75, -84.39, 6.1], ['Boston', 42.36, -71.06, 4.9], ['Phoenix', 33.45, -112.07, 4.8], ['San Francisco', 37.77, -122.42, 4.7], ['Riverside', 33.95, -117.4, 4.6], ['Detroit', 42.33, -83.05, 4.4], ['Seattle', 47.61, -122.33, 4.0], ['Minneapolis', 44.98, -93.27, 3.7], ['San Diego', 32.72, -117.16, 3.3], ['Tampa', 27.95, -82.46, 3.2], ['Denver', 39.74, -104.99, 3.0], ['Baltimore', 39.29, -76.61, 2.8], ['St. Louis', 38.63, -90.2, 2.8], ['Orlando', 28.54, -81.38, 2.7], ['Charlotte', 35.23, -80.84, 2.7], ['San Antonio', 29.42, -98.49, 2.6], ['Portland', 45.52, -122.68, 2.5], ['Sacramento', 38.58, -121.49, 2.4], ['Pittsburgh', 40.44, -79.99, 2.4], ['Austin', 30.27, -97.74, 2.3], ['Las Vegas', 36.17, -115.14, 2.3], ['Cincinnati', 39.1, -84.51, 2.3], ['Kansas City', 39.1, -94.58, 2.2], ['Columbus', 39.96, -83.0, 2.1], ['Indianapolis', 39.77, -86.16, 2.1], ['Cleveland', 41.5, -81.69, 2.1], ['San Jose', 37.34, -121.89, 2.0], ['Nashville', 36.16, -86.78, 2.0], ['Virginia Beach', 36.85, -75.98, 1.8], ['Providence', 41.82, -71.41, 1.7], ['Jacksonville', 30.33, -81.66, 1.6], ['Milwaukee', 43.04, -87.91, 1.6], ['Raleigh', 35.78, -78.64, 1.4], ['Oklahoma City', 35.47, -97.52, 1.4], ['Memphis', 35.15, -90.05, 1.3], ['Richmond', 37.54, -77.44, 1.3], ['Louisville', 38.25, -85.76, 1.3], ['New Orleans', 29.95, -90.07, 1.3], ['Salt Lake City', 40.76, -111.89, 1.3], ['Hartford', 41.76, -72.67, 1.2], ['Buffalo', 42.89, -78.88, 1.2], ['Birmingham', 33.52, -86.8, 1.1], ['Rochester', 43.16, -77.61, 1.1], ['Grand Rapids', 42.96, -85.67, 1.1], ['Tucson', 32.22, -110.97, 1.0], ['Honolulu', 21.31, -157.86, 1.0], ['Tulsa', 36.15, -95.99, 1.0], ['Fresno', 36.74, -119.79, 1.0], ['Omaha', 41.26, -95.94, 0.97], ['Albuquerque', 35.08, -106.65, 0.92], ['El Paso', 31.76, -106.49, 0.87], ['Boise', 43.62, -116.2, 0.76], ['Spokane', 47.66, -117.43, 0.59], ['Anchorage', 61.22, -149.9, 0.4], ['Billings', 45.78, -108.5, 0.18], ['Missoula', 46.87, -113.99, 0.12], ['Cheyenne', 41.14, -104.82, 0.1],
  ['Des Moines', 41.59, -93.62, 0.7], ['Little Rock', 34.75, -92.29, 0.75], ['Wichita', 37.69, -97.34, 0.65], ['Knoxville', 35.96, -83.92, 0.88], ['Albany', 42.65, -73.75, 0.9], ['Charleston', 32.78, -79.93, 0.8], ['Madison', 43.07, -89.4, 0.68], ['Jackson', 32.3, -90.18, 0.59], ['Fargo', 46.88, -96.79, 0.25], ['Sioux Falls', 43.55, -96.73, 0.28], ['Reno', 39.53, -119.81, 0.49], ['Bismarck', 46.81, -100.78, 0.13], ['Rapid City', 44.08, -103.23, 0.14], ['Portland ME', 43.66, -70.26, 0.55]];
const MW = 975, MH = 610, GS = 2, GW = Math.ceil(MW / GS), GH = Math.ceil(MH / GS);
let arrivalTex, landTex, mapSlab, mapTop, borderLines, metroPts = [], arrival, cellPop, rockiesMask, popTotal = 0, infCurve = [];
const toMap = (x, y) => new THREE.Vector3(x - MW / 2, 0, y - MH / 2);   // albers (x, y-down) -> map plane (x, z)
async function buildMap() {
  // the spread itself is precomputed offline (tools/zombie_map.mjs -> zmap.bin / zmap.json)
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii'].includes(g.properties.name));
  const info = await (await fetch('zmap.json')).json();
  const bin = new Uint8Array(await (await fetch('zmap.bin')).arrayBuffer());
  infCurve = info.curve;
  arrivalTex = new THREE.DataTexture(bin, info.GW, info.GH, THREE.RGBAFormat); arrivalTex.magFilter = THREE.LinearFilter; arrivalTex.minFilter = THREE.LinearFilter; arrivalTex.needsUpdate = true;
  // slab: lower-48 outline extruded
  const merged = topojson.merge(topo, L48);
  const shapes = [];
  for (const poly of merged.coordinates) {
    const outer = poly[0]; if (outer.length < 8) continue;
    const sh = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))));
    for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2)))));
    shapes.push(sh);
  }
  const slabGeo = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 });
  slabGeo.rotateX(-Math.PI / 2);
  mapSlab = new THREE.Mesh(slabGeo, mapMat); mapScene.add(mapSlab);
  // state borders (interior only)
  const mesh = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b);
  const pts = []; for (const line of mesh.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; pts.push(a[0] - MW / 2, 10.3, a[1] - MH / 2, b[0] - MW / 2, 10.3, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  borderLines = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#8a94b0', transparent: true, opacity: 0.5 })); mapScene.add(borderLines);
  metroPts = info.metros.filter(m => !['Honolulu', 'Anchorage'].includes(m.n));
}
const mapMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: null }, uDay: { value: 0 }, uTime: { value: 0 } },
  vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D uTex; uniform float uDay, uTime; varying vec3 vW; varying vec3 vN;
    void main(){
      vec2 uv=vec2((vW.x+${(MW / 2).toFixed(1)})/${MW.toFixed(1)}, 1.0-(vW.z+${(MH / 2).toFixed(1)})/${MH.toFixed(1)});
      vec4 tx=texture2D(uTex,uv);
      float arr=exp(tx.r*log(401.0))-1.0;
      float lit=tx.b; float shade=tx.a;
      vec3 base=mix(vec3(0.06,0.08,0.12),vec3(0.10,0.13,0.18),shade);
      vec3 col=base+vec3(1.0,0.78,0.42)*pow(lit,2.2)*1.4;                 // city lights
      float inf=smoothstep(arr-0.15,arr+0.15,uDay);
      vec3 zc=mix(vec3(0.25,0.03,0.03),vec3(0.55,0.06,0.04),shade)+vec3(1.0,0.12,0.06)*pow(lit,2.0)*1.6;
      col=mix(col,zc,inf);
      float front=exp(-abs(uDay-arr)/max(0.6,0.12*uDay))*(1.0-step(uDay,arr-3.0));
      col+=vec3(1.0,0.35,0.1)*front*0.9*(0.85+0.15*sin(uTime*9.0));
      if(vN.y<0.5) col=vec3(0.04,0.05,0.07)+inf*vec3(0.12,0.0,0.0);
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
// glow sprites for the biggest metros (they flare red when they fall)
const beaconTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const beacons = [];
function buildBeacons() { for (const m of metroPts) { if (m.pop < 1.2) continue; m.k = 0; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: beaconTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffd28a' })); s.position.copy(toMap(m.x * GS, m.y * GS)).setY(14); s.scale.setScalar(6 + 2.5 * Math.sqrt(m.pop)); mapScene.add(s); beacons.push({ s, m }); } }
function dayAt(t) { return linKey([[MAP, 0], [CITIES, 1.2], [RURAL, 8], [ROCKIES, 60], [BACKMAP, 120], [T_END, 160]], t, x => x); }
function infectedFrac(day) { if (!infCurve.length) return 0; const i = clamp(day * 2, 0, infCurve.length - 1); const i0 = Math.floor(i); return lerp(infCurve[i0], infCurve[Math.min(i0 + 1, infCurve.length - 1)], i - i0); }

// =================== NORTHERN ROCKIES (meters): snowy ridges, pines, a lit cabin, zombies far down the slope ===================
const mount = new THREE.Scene();
mount.fog = new THREE.Fog(new THREE.Color('#1c2640'), 400, 3600);
const mountCam = new THREE.PerspectiveCamera(50, W / H, 0.5, 9000);
const mHemi = new THREE.HemisphereLight(0x8aa0d8, 0x1a1a24, 0.75); mount.add(mHemi);
const mMoon = new THREE.DirectionalLight(0xb8c8ff, 2.2); mMoon.castShadow = true; mMoon.shadow.mapSize.set(2048, 2048);
Object.assign(mMoon.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 800 }); mMoon.shadow.bias = -0.0005; mount.add(mMoon, mMoon.target);
const mDome = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec3 vD; void main(){ float e=max(normalize(vD).y,0.0); vec3 c=mix(vec3(0.10,0.13,0.22),vec3(0.015,0.02,0.05),pow(e,0.5)); gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
})); mDome.frustumCulled = false; mount.add(mDome);
{
  const n = 2500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(0.05, 1), R(-1, 1)).normalize().multiplyScalar(7000); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  mount.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.8, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
}
const mMoonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), fog: false, depthWrite: false, transparent: true })); mMoonSprite.scale.setScalar(1300); mount.add(mMoonSprite);
// terrain: value-noise ridges (deterministic)
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
function ridge(x, z) { let h = 0, a = 1, f = 1 / 900; for (let o = 0; o < 6; o++) { const n = 1 - Math.abs(vnoise(x * f, z * f) * 2 - 1); h += n * n * a; a *= 0.5; f *= 2.05; } return h; }
const CABIN = new THREE.Vector3(0, 0, 0);
function terrainH(x, z) {
  const r = Math.hypot(x, z * 0.8); const rise = smooth(170, 1100, r);       // flat valley around the cabin, peaks beyond
  return ridge(x + 4000, z + 2000) * 1250 * rise + 6 * (vnoise(x / 40, z / 40) - 0.5) * smooth(30, 120, r);
}
const TERR_S = 6000, TERR_N = 300;
const terrGeo = new THREE.PlaneGeometry(TERR_S, TERR_S, TERR_N, TERR_N); terrGeo.rotateX(-Math.PI / 2);
{
  const p = terrGeo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, terrainH(x, z)); }
  terrGeo.computeVertexNormals(); const nrm = terrGeo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), ny = nrm.getY(i); const snow = smooth(0.55, 0.78, ny) + smooth(260, 420, y) * 0.8;
    c.set('#4a4a52').lerp(new THREE.Color('#e8eef8'), clamp(snow, 0, 1)); c.offsetHSL(0, 0, (hash2(i, 7) - 0.5) * 0.05); cols.set([c.r, c.g, c.b], i * 3); }
  terrGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}
const terrain = new THREE.Mesh(terrGeo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
terrain.geometry.computeVertexNormals(); terrain.receiveShadow = true; mount.add(terrain);
// pines (instanced cones, two tiers)
{
  const N = 5200; const coneA = new THREE.ConeGeometry(1, 1, 7); coneA.translate(0, 0.5, 0);
  const pm = new THREE.InstancedMesh(coneA, new THREE.MeshStandardMaterial({ color: '#1f3a2c', flatShading: true, roughness: 0.9 }), N); const snowCap = new THREE.InstancedMesh(coneA, new THREE.MeshStandardMaterial({ color: '#dfe8f2', flatShading: true, roughness: 0.9 }), N);
  const d = new THREE.Object3D(); let k = 0;
  for (let i = 0; i < N * 4 && k < N; i++) {
    const x = R(-1300, 1300), z = R(-1500, 700); const r = Math.hypot(x, z); if (r < 50 || (Math.abs(x) < 70 && z > -230 && z < 70)) continue;
    const y = terrainH(x, z); if (y > 260) continue; const h = R(7, 16);
    d.position.set(x, y - 0.5, z); d.scale.set(h * 0.28, h, h * 0.28); d.rotation.set(0, R(0, 6), 0); d.updateMatrix(); pm.setMatrixAt(k, d.matrix);
    d.position.y = y - 0.5 + h * 0.55; d.scale.set(h * 0.15, h * 0.46, h * 0.15); d.updateMatrix(); snowCap.setMatrixAt(k, d.matrix); k++;
  }
  pm.count = k; snowCap.count = k; pm.castShadow = true; mount.add(pm, snowCap);
}
// cabin
const cabin = new THREE.Group(); cabin.position.set(CABIN.x, terrainH(0, 0), CABIN.z); mount.add(cabin);
const logM = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.9, flatShading: true });
{ const b = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5.5), logM); b.position.y = 1.6; b.castShadow = b.receiveShadow = true; cabin.add(b);
  const roofM = new THREE.MeshStandardMaterial({ color: '#e6eef8', roughness: 0.9, flatShading: true });
  for (const sx of [-1, 1]) { const rf = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.35, 6.4), roofM); rf.position.set(sx * 1.85, 4.15, 0); rf.rotation.z = -sx * 0.62; rf.castShadow = true; cabin.add(rf); }
  const gable = new THREE.Shape(); gable.moveTo(-3.5, 0); gable.lineTo(3.5, 0); gable.lineTo(0, 2.4); gable.closePath();
  for (const zz of [2.74, -2.76]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), logM); gm.position.set(0, 3.2, zz); if (zz < 0) gm.rotation.y = Math.PI; cabin.add(gm); }
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), new THREE.MeshStandardMaterial({ color: '#5a5552', roughness: 1 })); ch.position.set(2.2, 5.6, -1.0); cabin.add(ch);
  for (const x of [-1.8, 1.8]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffb050', emissiveIntensity: 3.0 })); w.position.set(x, 1.8, 2.76); cabin.add(w); }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshStandardMaterial({ color: '#3a2a1c' })); door.position.set(0, 1.0, 2.76); cabin.add(door);
}
const cabinLight = new THREE.PointLight(0xffa850, 30, 40, 1.6); cabinLight.position.set(0, 2.0, 5); cabin.add(cabinLight);
const smoke = []; for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#b8c0cc', transparent: true, opacity: 0.3, flatShading: true })); cabin.add(s); smoke.push({ s, ph: i / 18 }); }
// zombies trudging up the far slope (months away)
const slopeZ = [];
for (let i = 0; i < 9; i++) { const p = makePerson(rnd, { skin: ZSKIN, top: pick(['#3a3f2e', '#4a2a2a', '#2a3a4a', '#5a4a2a']), bottom: '#2a2a22', dress: false, shorts: false, longSleeve: true, hairStyle: 0.2, cap: false, shoe: '#1b1b1b' }); p.outer.scale.setScalar(1.0); mount.add(p.outer); slopeZ.push({ p, x: (i % 2 ? 1 : -1) * R(9, 40), z: R(-150, -70), ph: R(0, 6), v: R(0.25, 0.45) }); }
function updateMount(t) {
  mMoon.position.set(-300, 420, -500).add(mountCam.position.clone().setY(0)); mMoon.target.position.copy(mountCam.position).setY(0); mMoon.target.updateMatrixWorld();
  mMoonSprite.position.set(-0.45, 0.32, -0.83).normalize().multiplyScalar(6500).add(mountCam.position);
  smoke.forEach(({ s, ph }) => { const u = ((t * 0.12 + ph) % 1); s.position.set(2.2 + u * 3, 7 + u * 10, -1 + u * 1.5); s.scale.setScalar(0.25 + u * 0.9); s.material.opacity = 0.3 * (1 - u); });
  for (const z of slopeZ) { const tt = Math.max(0, t - ROCKIES); const zz = z.z + z.v * tt * 3; const y = terrainH(z.x, zz); z.p.outer.position.set(z.x, y + 0.95 - 0.25, zz); z.p.outer.rotation.set(0, 0, 0); poseZombie(z.p, t, z.ph, 0.8); }
}
function mountCamera(t) {
  const u = (t - ROCKIES) / (BACKMAP - ROCKIES);
  let pos, look;
  if (t < 47.5) { // glide in over the peaks, down into the valley
    const k = ease((t - ROCKIES) / 7.5); pos = new THREE.Vector3(lerp(-300, 20, k), lerp(1700, 26, k), lerp(-1700, 85, k)); look = new THREE.Vector3(lerp(-60, 0, k), lerp(200, 4, k), lerp(-500, 0, k));
  } else { // low by the cabin, zombies small on the slope behind
    const k = ease((t - 47.5) / 7.5); pos = new THREE.Vector3(lerp(-5.5, -4.5, k), lerp(3.2, 2.6, k), lerp(30, 22, k)); look = new THREE.Vector3(lerp(-3.5, -4.5, k), lerp(5, 7, k), lerp(-60, -150, k));
  }
  pos.y = Math.max(pos.y, terrainH(pos.x, pos.z) + (t < 46 ? 150 : 2.5));
  mountCam.position.copy(pos); mountCam.lookAt(look); mountCam.fov = t < 47.5 ? 52 : 46; mountCam.updateProjectionMatrix();
}

// =================== city: night setup ===================
const cityFill = new THREE.DirectionalLight(0xffc89a, 0.0); city.add(cityFill, cityFill.target);
function setNight(t) {
  sunL.color.set(0x9fb4ff); sunL.intensity = 0.6; hemi.intensity = 0.7;
  cityFill.intensity = 1.3; cityFill.position.copy(cam.position).add(new THREE.Vector3(2, 3, 4)); cityFill.target.position.set(66, 1, -10); cityFill.target.updateMatrixWorld(); hemi.color.set(0x6a7cb0); hemi.groundColor.set(0x2a2018);
  city.fog.color.set('#141a2c'); city.fog.near = 60; city.fog.far = 1400;
  for (const m of winMats) m.emissiveIntensity = 0.45;
  for (const m of lampHeads) m.emissiveIntensity = 1.8;
  clouds.forEach(c => { c.visible = false; });
  pumpkinMat.emissiveIntensity = 2.0 + 0.4 * Math.sin(t * 11) * Math.sin(t * 7.3);
  pumpLights.forEach((l, i) => { l.intensity = 5 + 1.2 * Math.sin(t * 9 + i * 2); });
}
function updateCityZ(t) {
  setNight(t);
  sunL.position.copy(cam.position).addScaledVector(MOON_DIR, 300); sunL.target.position.copy(cam.position); sunL.target.updateMatrixWorld();
  moon.position.copy(MOON_DIR).multiplyScalar(3800).add(cam.position);
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * 0.6 * t, -220, 760); c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 6; }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const gy = Math.abs(z) > 7 ? 0.18 : 0; o.position.set(x, gy + 0.95, z); o.rotation.set(0, ry, 0);
    if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph);
    o.visible = !(x > 52 && x < 82 && z < -7) && Math.hypot(x - cam.position.x, z - cam.position.z) > 2.5;   // keep the party block clear
  }
  ball.visible = false;
  updateCast(t);
}
function cityCamera(t) {
  let pos, look, fov = 50;
  if (t < NOTICE) { const u = t / NOTICE; pos = new THREE.Vector3(lerp(80.5, 78.5, u), 2.3, lerp(-6.2, -6.6, u)); look = new THREE.Vector3(65, 1.0, -10.2); fov = 44; }
  else if (t < BLOCK) { const u = (t - NOTICE) / (BLOCK - NOTICE); pos = new THREE.Vector3(lerp(66.9, 68.6, u), lerp(1.75, 2.2, u), lerp(-6.5, -6.0, u)); look = new THREE.Vector3(lerp(65.2, 65.8, u), 1.1, -10.1); fov = lerp(44, 52, u); }
  else { const u = ease((t - BLOCK) / (RISE + 0.8 - BLOCK)); pos = new THREE.Vector3(lerp(76, 72, u), lerp(2.0, 60, Math.pow(u, 1.6)), lerp(-6.5, 10, u)); look = new THREE.Vector3(lerp(67, 67, u), lerp(1.2, 0, u), lerp(-10, -9.5, u)); fov = lerp(50, 58, u); }
  cam.fov = fov; cam.near = 0.1; cam.far = 6000; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
}
// =================== map camera ===================
let NYC_MAP = new THREE.Vector3(), MT_MAP = new THREE.Vector3();
function mapCamera(t) {
  let pos, look, fov = 36;
  const whole = new THREE.Vector3(0, 0, 25); const WH = 2700, WZ = 1350;
  if (t < CITIES) { const u = ease((t - MAP) / (CITIES - MAP)); look = NYC_MAP.clone().lerp(whole, u); const h = Math.exp(lerp(Math.log(40), Math.log(WH), u)); pos = look.clone().add(new THREE.Vector3(0, h, h * lerp(0.15, WZ / WH, u))); fov = 36; }
  else if (t < ROCKIES - 1.2) { const u = (t - CITIES) / (ROCKIES - 1.2 - CITIES); const a = 0.08 * Math.sin(u * 3); look = whole.clone(); pos = new THREE.Vector3(Math.sin(a) * 900, WH, WZ + 25); fov = 36; }
  else if (t < ROCKIES + 0.2) { const u = ease((t - (ROCKIES - 1.2)) / 1.4); look = whole.clone().lerp(MT_MAP, u); const h = Math.exp(lerp(Math.log(WH), Math.log(60), u)); pos = look.clone().add(new THREE.Vector3(0, h, h * lerp(WZ / WH, 0.9, u))); }
  else { const u = (t - BACKMAP) / (T_END - BACKMAP); look = whole.clone(); pos = new THREE.Vector3(lerp(-200, 150, u), lerp(WH * 0.95, WH, u), lerp(WZ + 60, WZ, u)); fov = 36; }
  mapCam.fov = fov; mapCam.near = 1; mapCam.far = 6000; mapCam.updateProjectionMatrix(); mapCam.position.copy(pos); mapCam.up.set(0, 1, 0); mapCam.lookAt(look);
}
function updateMap(t) {
  const day = dayAt(t); mapMat.uniforms.uDay.value = day; mapMat.uniforms.uTime.value = t;
  for (const b of beacons) { const inf = b.m.arr <= day; b.s.material.color.set(inf ? '#ff4a2a' : '#ffd28a'); const pulse = inf ? 1 + 0.5 * Math.exp(-(day - b.m.arr) * 2) : 1; b.s.scale.setScalar((6 + 2.5 * Math.sqrt(b.m.pop)) * pulse); }
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [4.3, 7.2, 'Nobody would notice.'],
  [7.4, 10.0, "Everyone's already<br>dressed as one."],
  [10.4, 13.6, 'One bite, and the costume<br>party turns real.'],
  [13.8, 16.6, 'By midnight,<br>the whole block.'],
  [17.6, 20.6, "And it's Halloween<br>in every city."],
  [20.8, 23.8, 'Cornell physicists actually<br>simulated this.'],
  [24.2, 27.4, 'Big cities fall<br>within days.'],
  [27.6, 30.8, 'L.A. to San Francisco gets<br>hit from both ends.'],
  [31.2, 34.6, "But zombies walk.<br>They don't drive or fly."],
  [34.8, 39.6, 'So the countryside holds<br>out for months.'],
  [40.3, 43.8, 'The safest place<br>in America?'],
  [44.0, 47.4, 'The northern Rockies.'],
  [47.8, 51.2, 'Too few people,<br>too far apart.'],
  [51.4, 54.8, 'Zombies take months<br>to get up here.'],
  [55.4, 58.4, 'So… where would<br>you hide?'],
  [58.6, 61.8, 'Comment your state.'],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const US_POP = 335e6;
function streetInfected(t) { let n = 1; for (const c of cast) if (t >= c.tinf) n++; return n; }
function clockAt(t) { const mins = 20 * 60 + 47 + Math.floor(lerp(0, 190, smooth(0, RISE, t))); const h = Math.floor(mins / 60) % 24, m = mins % 60; const hh = ((h + 11) % 12) + 1; return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 && h < 24 ? 'PM' : 'AM'}`; }
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < NOTICE) { stat = '<b></b>OCT 31 · NEW YORK'; lab = 'ZOMBIES'; val = '1'; sub = 'EVERYONE THINKS IT\'S A COSTUME'; show = smooth(0.6, 1.2, t); }
  else if (t < RISE) { stat = '<b></b>' + clockAt(t); lab = 'INFECTED'; const n = t < 13.2 ? streetInfected(t) : Math.round(streetInfected(t) * Math.pow(10, (t - 13.2) * 0.9)); val = fmtInt(n); sub = t < BLOCK ? 'STILL LOOKS LIKE A PARTY' : 'ONE BLOCK, THEN THE NEXT'; }
  else if (t < MAP + 0.3) show = 0;
  else if (t < ROCKIES) { const d = dayAt(t); stat = '<b></b>MODEL · DAY ' + Math.max(1, Math.ceil(d)); lab = 'INFECTED'; val = fmtInt(Math.round(infectedFrac(d) * US_POP / 1e5) * 1e5); sub = t < RURAL ? 'CITIES GO FIRST' : 'THE COUNTRYSIDE HOLDS ON'; }
  else if (t < BACKMAP) { const d = dayAt(t); stat = '<b></b>DAY ' + Math.ceil(d); lab = 'NORTHERN ROCKIES'; val = 'Still safe'; sub = 'MONTANA · IDAHO · WYOMING'; }
  else { const d = dayAt(t); stat = '<b></b>DAY ' + Math.ceil(d); lab = 'INFECTED'; val = fmtInt(Math.round(infectedFrac(d) * US_POP / 1e6) * 1e6); sub = 'THE MOUNTAINS HOLD OUT LONGEST'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(NOTICE - 0.35, NOTICE, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const v1 = fadeWin(t, RISE, MAP + 0.25, 0.4), v2 = fadeWin(t, ROCKIES - 0.25, ROCKIES + 0.35, 0.3), v3 = fadeWin(t, BACKMAP - 0.3, BACKMAP + 0.3, 0.3);
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(v1, v2, v3);
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (t < RISE + 0.4) { cityCamera(t); updateCityZ(t); renderer.render(city, cam); }
  else if (t < ROCKIES || t >= BACKMAP) { mapCamera(t); updateMap(t); renderer.render(mapScene, mapCam); }
  else { mountCamera(t); updateMount(t); renderer.render(mount, mountCam); }
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildMap()]).then(() => {
  mapMat.uniforms.uTex.value = arrivalTex; buildBeacons();
  const nyc = metroPts.find(m => m.n === 'New York'); NYC_MAP = toMap(nyc.x * GS, nyc.y * GS).setY(10);
  const proj = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]); const mt = proj([-111.5, 46.6]); MT_MAP = toMap(mt[0], mt[1]).setY(10);
  window.renderAt(0); return true;
});
