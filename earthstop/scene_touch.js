import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if we could actually touch each other?" — you never touch anything: electron clouds repel ~0.1 nm apart.
// Fall through Earth with repulsion off (layered PREM-like density, tools/tunnel.py): 38.3 min one way, 22,000 mph at the centre.
// =================== timeline ===================
const HOOK = 2.6, DIVE_END = 7.0, ATOM_END = 15.0, BENCH_END = 22.0, HUG_END = 28.0, FLIP = 29.0, SWITCH_END = 30.0,
  SLOWMO_END = 31.5, SINK_END = 34.0, CUT = 35.6, ARRIVE = 41.8, EARTH_END = 50.0, FUSE = 56.4, FUSE_END = 58.0, T_END = 63.6;
const FPS = 30;
// =================== rng / helpers ===================
let seed = 4242;
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
for (const side of [-1, 1]) for (let x = -150; x < 1300; x += R(11, 16)) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; if (side < 0 && x > 37 && x < 100) continue; palm(x, side * R(8.0, 8.5), R(7.5, 11.5)); }
for (const cx of [30, 165, 300]) { trafficLight(cx - 8.2, -8.0, -1, 7.5); trafficLight(cx + 8.2, 8.0, 1, 7.5); }
for (let i = 0; i < 46; i++) { const dir = rnd() < 0.5 ? 1 : -1; const lane = dir > 0 ? pick([-1.75, -5.25]) : pick([1.75, 5.25]); car(lane, dir, R(-200, 700), R(8, 13)); }
for (let i = 0; i < 18; i++) { const side = rnd() < 0.5 ? -1 : 1; const g = new THREE.Group(); city.add(g); const dirZ = side; cars.push({ g, cross: true }); g.visible = false; }
// parked/benches/bins
for (const side of [-1, 1]) for (let x = -140; x < 600; x += R(18, 34)) {
  if (CROSS.some(c => Math.abs(x - c) < 12)) continue;
  if (side < 0 && x > 45 && x < 100) continue;
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



// =================== sky dome for the city ===================
const SUN_DAY = new THREE.Vector3(-0.45, 0.85, 0.3).normalize();
const HAND_SUN = new THREE.Vector3(-0.62, 0.62, -0.5).normalize();
const SUN_DUSK = new THREE.Vector3(-0.45, 0.07, -0.89).normalize();
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSunS: { value: SUN_DAY.clone() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uDusk: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `varying vec3 vD; void main(){ vec3 c=skyColor(normalize(vD)); gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 40, 24), domeMat); dome.frustumCulled = false; dome.renderOrder = -10; city.add(dome);

// =================== heroes ===================
// A = "you" (blue, cool glow) · B = the other person (orange, warm glow)
const HERO = new THREE.Vector3(76, 0.18, -9.7);     // hug spot on the sidewalk (side -1)
const BENCH = new THREE.Vector3(62, 0.18, -10.9);
const COL_A = '#2f6fd0', COL_B = '#f07a2a';
const heroA = makePerson(rnd, { skin: '#e9c4a2', hair: '#2a1d14', top: COL_A, bottom: '#23324d', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, hairStyle: 0.3, cap: false });
const heroB = makePerson(rnd, { skin: '#b98260', hair: '#1a1a1a', top: COL_B, bottom: '#2a2a30', shoe: '#1b1b1b', dress: false, shorts: false, longSleeve: true, hairStyle: 0.7, cap: false });
city.add(heroA.outer, heroB.outer);
// bench for the "hovering" shot
const benchG = new THREE.Group(); benchG.position.copy(BENCH); city.add(benchG);
const woodM = M('#8a5a34', { roughness: 0.8 });
box(1.9, 0.07, 0.48, woodM, 0, 0.46, 0, benchG); box(1.9, 0.07, 0.1, woodM, 0, 0.62, -0.25, benchG); box(1.9, 0.07, 0.1, woodM, 0, 0.78, -0.27, benchG);
for (const sx of [-0.85, 0.85]) { box(0.06, 0.46, 0.06, '#2b2b2b', sx, 0.23, 0.18, benchG); box(0.06, 0.82, 0.06, '#2b2b2b', sx, 0.41, -0.24, benchG); box(0.06, 0.06, 0.48, '#2b2b2b', sx, 0.44, 0, benchG); }
// glow shells (fresnel rim, normal-extruded) — the gap made visible
function glowMat(col) {
  return new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 0 }, uPush: { value: 0.012 } },
    vertexShader: 'uniform float uPush; varying vec3 vN; varying vec3 vV; void main(){ vec3 p=position+normal*uPush; vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0); gl_FragColor=vec4(uCol*(0.25+1.6*f)*uA,1.0); }',
  });
}
const glowA = glowMat('#5fb4ff'), glowB = glowMat('#ffab5a');
function addGlow(p, mat) { const list = []; p.outer.traverse(o => { if (o.isMesh) list.push(o); }); for (const m of list) { const g = new THREE.Mesh(m.geometry, mat); g.renderOrder = 5; m.add(g); } }
addGlow(heroA, glowA); addGlow(heroB, glowB);

// hug pose: arms forward and wrapped around the other person
function poseHug(p, k, high) {
  const s = high ? 1 : -1;
  p.legs[0].rotation.x = 0.05; p.legs[1].rotation.x = -0.05; p.knees[0].rotation.x = 0.06; p.knees[1].rotation.x = 0.06;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1;  // arms[0] is at x=-0.215
    p.arms[i].rotation.set(lerp(0.0, -1.25 - 0.18 * s, k), lerp(0, side * -0.55, k), lerp(side * 0.08, side * 0.12, k));
    p.elbows[i].rotation.set(lerp(-0.15, -0.35, k), 0, lerp(0, side * 1.25, k));
  }
}
function poseReach(p, k) { // one arm reaching forward-up (hook continuity)
  poseIdle(p, 0, 0); p.arms[1].rotation.set(-1.4 * k, 0, -0.1 * k); p.elbows[1].rotation.set(-0.2 * k, 0, 0);
}

// =================== hands (close-up, meters) ===================
const handMats = {};
function handMat(c) { return handMats[c] || (handMats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0, flatShading: true, side: THREE.DoubleSide })); }
function segFinger(g, mat, base, dir, lens, rad, bends, axis) {
  // chain of capsules; bends rotate around `axis` (local) at each joint
  let p = base.clone(); let d = dir.clone().normalize(); const parts = [];
  for (let i = 0; i < lens.length; i++) {
    d.applyAxisAngle(axis, bends[i]);
    const L = lens[i], r = rad * (1 - i * 0.07);
    const c = new THREE.CapsuleGeometry(r, L, 3, 8); c.translate(0, L / 2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); c.translate(p.x, p.y, p.z);
    parts.push(c); p = p.clone().addScaledVector(d, L);
  }
  return { parts, tip: p, dir: d };
}
function makeHand(skin, sleeve, nail) {
  const g = new THREE.Group();
  const sk = [], sl = [];
  const palm = new THREE.SphereGeometry(1, 12, 9); palm.scale(0.043, 0.056, 0.021); palm.translate(0, 0.0, 0); sk.push(palm);
  const heel = new THREE.SphereGeometry(1, 10, 8); heel.scale(0.036, 0.03, 0.02); heel.translate(0, -0.04, 0.002); sk.push(heel);
  const wrist = new THREE.CylinderGeometry(0.026, 0.028, 0.08, 10); wrist.translate(0, -0.085, 0); sk.push(wrist);
  const X = new THREE.Vector3(1, 0, 0);
  // index: extended, slight natural bend
  const idx = segFinger(g, null, new THREE.Vector3(0.024, 0.048, 0.0), new THREE.Vector3(0.08, 1, 0), [0.046, 0.027, 0.021], 0.0098, [0, 0.06, 0.05], X);
  sk.push(...idx.parts);
  // curled middle / ring / pinky (bend toward +z = palm side)
  for (const [x, L, r] of [[0.008, 0.047, 0.0102], [-0.008, 0.044, 0.0098], [-0.024, 0.036, 0.0088]]) {
    const f = segFinger(g, null, new THREE.Vector3(x, 0.046, 0.002), new THREE.Vector3(0, 1, 0), [L * 0.85, L * 0.55, L * 0.42], r, [-1.25, -1.5, -1.15], X); sk.push(...f.parts);
  }
  // thumb tucked over the curled fingers
  const th = segFinger(g, null, new THREE.Vector3(0.033, -0.02, -0.008), new THREE.Vector3(-0.3, 0.85, -0.55), [0.036, 0.028, 0.023], 0.0115, [0, 0.3, 0.35], new THREE.Vector3(0, 0, 1)); sk.push(...th.parts);
  const skinMesh = new THREE.Mesh(mergeGeometries(sk.map(x => x.index ? x.toNonIndexed() : x).map(x => { x.deleteAttribute('uv'); return x; })), handMat(skin)); skinMesh.castShadow = true; skinMesh.receiveShadow = true; g.add(skinMesh);
  // nail on the index fingertip (back of the finger = -z)
  const nl = new THREE.SphereGeometry(1, 8, 6); nl.scale(0.0062, 0.0075, 0.0018);
  const nailM = new THREE.Mesh(nl, handMat(nail)); nailM.position.copy(idx.tip).addScaledVector(idx.dir, -0.006).add(new THREE.Vector3(0, 0, 0.0084)); g.add(nailM);
  // sleeve + cuff
  const s1 = new THREE.CylinderGeometry(0.039, 0.05, 0.42, 12); s1.translate(0, -0.34, 0); sl.push(s1);
  const cuff = new THREE.CylinderGeometry(0.041, 0.041, 0.035, 12); cuff.translate(0, -0.13, 0); sl.push(cuff);
  const sleeveMesh = new THREE.Mesh(mergeGeometries(sl), new THREE.MeshStandardMaterial({ color: sleeve, roughness: 0.9, flatShading: true })); sleeveMesh.castShadow = true; g.add(sleeveMesh);
  g.userData.tip = idx.tip.clone().addScaledVector(idx.dir, 0.0098 * 0.86);
  return g;
}
const hands = new THREE.Scene();
const handHemi = new THREE.HemisphereLight(0xcfe0ff, 0x6a5848, 1.1); hands.add(handHemi);
const handSun = new THREE.DirectionalLight(0xfff0dc, 2.6); hands.add(handSun, handSun.target);
const handRim = new THREE.DirectionalLight(0xffd0a0, 1.2); hands.add(handRim, handRim.target);
const CONTACT = new THREE.Vector3(HERO.x, 1.42, HERO.z + 0.25);
const handTop = makeHand('#f2c09a', COL_A, '#f6d2c4');   // A, from above (pointing down)
const handBot = makeHand('#c27f55', COL_B, '#e6b9a4');   // B, from below (pointing up)
const TIP = handTop.userData.tip.y;
handTop.scale.x = -1;                                    // mirror: a left hand meets a right hand
hands.add(handTop, handBot);
// glowing gap between the fingertips (only in the outro)
const gapGlow = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.ShaderMaterial({
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(max(dot(normalize(vN),normalize(vV)),0.0),2.5); gl_FragColor=vec4(vec3(1.0,0.85,0.6)*f*uA,1.0); }',
}));
hands.add(gapGlow);
function placeHands(gap, t) {
  const wob = 0.0015 * Math.sin(t * 2.1);
  handBot.position.set(CONTACT.x, CONTACT.y - gap / 2 - TIP + wob, CONTACT.z); handBot.rotation.set(0.12, 0.35, -0.06);
  handTop.position.set(CONTACT.x, CONTACT.y + gap / 2 + TIP - wob, CONTACT.z); handTop.rotation.set(0.1, -0.4, Math.PI - 0.06);
  // keep fingertips exactly on the contact axis: correct for rotation of the tip
  for (const h of [handBot, handTop]) { h.updateMatrixWorld(); const tip = h.userData.tip.clone().applyMatrix4(h.matrixWorld); const want = new THREE.Vector3(CONTACT.x, CONTACT.y + (h === handTop ? gap / 2 : -gap / 2), CONTACT.z); h.position.add(want.sub(tip)); }
  gapGlow.position.copy(CONTACT); gapGlow.scale.set(0.012, Math.max(gap, 0.002) * 0.9 + 0.004, 0.012);
}

// =================== MICRO layers: skin ridges (mm) · skin cells (µm) · atoms (Å) ===================
// the contact gap is horizontal (top = A's fingertip, bottom = B's), the camera looks along -z into it
const FOV_MICRO = 34;
function camForField(camera, fieldW, target, back = new THREE.Vector3(0, 0, 1), up = new THREE.Vector3(0, 1, 0)) {
  const hgt = fieldW * H / W; const d = hgt / 2 / Math.tan(camera.fov * Math.PI / 360);
  camera.position.copy(target).addScaledVector(back.clone().normalize(), d); camera.up.copy(up); camera.lookAt(target);
  camera.near = d * 0.02; camera.far = d * 60 + 50; camera.updateProjectionMatrix();
}
// ---- skin (units: mm)
const skin = new THREE.Scene(); skin.background = new THREE.Color('#1a0d0a');
const skinCam = new THREE.PerspectiveCamera(FOV_MICRO, W / H, 0.01, 1000);
skin.add(new THREE.HemisphereLight(0xffe6d6, 0x3a1a14, 0.9));
const skinKey = new THREE.DirectionalLight(0xfff2e6, 2.2); skinKey.position.set(3, 1.2, 6); skin.add(skinKey);
const skinBack = new THREE.PointLight(0xffd6b0, 30, 0, 1.4); skinBack.position.set(0, 0, -3); skin.add(skinBack);
function ridgeDome(r, colA, colB, flip, cx, cz) {
  const geo = new THREE.SphereGeometry(r, 420, 150, 0, Math.PI * 2, 0, Math.PI / 3);
  const p = geo.attributes.position, n = geo.attributes.normal; const cols = new Float32Array(p.count * 3);
  const ca = new THREE.Color(colA), cb = new THREE.Color(colB), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // whorl: distance to an off-centre core, warped
    const dx = x - cx, dz = z - cz; const ang = Math.atan2(dz, dx);
    const d = Math.sqrt(dx * dx * 1.0 + dz * dz * 1.35) + 0.12 * Math.sin(ang * 3 + x * 0.8) + 0.05 * Math.sin(z * 4.1 + x * 2.3);
    const ph = d / 0.46 * Math.PI * 2; const ridge = 0.5 + 0.5 * Math.cos(ph);
    const pore = Math.pow(Math.max(0, Math.cos(ph)), 6) * Math.pow(0.5 + 0.5 * Math.sin(ang * d * 13.0), 30);
    const h = 0.055 * Math.pow(ridge, 0.7) - 0.03 * pore;
    p.setXYZ(i, x + n.getX(i) * h, y + n.getY(i) * h, z + n.getZ(i) * h);
    c.copy(cb).lerp(ca, Math.pow(ridge, 0.8)); c.multiplyScalar(1 - 0.5 * pore);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, flatShading: false }));
  if (flip) m.rotation.z = Math.PI;
  return m;
}
const SKIN_R = 7.5, SKIN_GAP = 0.012;
const domeTop = ridgeDome(SKIN_R, '#f0c9ae', '#b9806a', true, 0.9, -0.6); domeTop.position.y = SKIN_R + SKIN_GAP / 2 + 0.055; skin.add(domeTop);
const domeBot = ridgeDome(SKIN_R, '#c98c6a', '#7d4a34', false, -0.7, 0.4); domeBot.position.y = -(SKIN_R + SKIN_GAP / 2 + 0.055); skin.add(domeBot);

// ---- cells (units: µm) — flattened corneocytes stacked in layers
const cells = new THREE.Scene(); cells.background = new THREE.Color('#1d0f0c');
const cellCam = new THREE.PerspectiveCamera(FOV_MICRO, W / H, 0.01, 4000);
cells.add(new THREE.HemisphereLight(0xffeedd, 0x402018, 1.0));
const cellKey = new THREE.DirectionalLight(0xfff0e0, 1.8); cellKey.position.set(2, 3, 5); cells.add(cellKey);
const cellBack = new THREE.PointLight(0xffc89a, 400, 0, 1.2); cellBack.position.set(0, 0, -60); cells.add(cellBack);
{
  const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1); const N = 2 * 7 * 15 * 15;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, flatShading: true });
  const im = new THREE.InstancedMesh(g, mat, N); const d = new THREE.Object3D(); const c = new THREE.Color(); let k = 0;
  for (const s of [1, -1]) for (let L = 0; L < 7; L++) for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) {
    const x = (i - 7 + (j % 2) * 0.5) * 30 + R(-3, 3) + L * 9, z = (j - 7) * 26 + R(-3, 3) - L * 7;
    const sag = 0.0012 * (x * x + z * z);                       // the surfaces curve away from the contact point
    const y = s * (1.6 + L * 1.25 + sag + R(0, 0.35));
    d.position.set(x, y, z); d.rotation.set(R(-0.05, 0.05), R(0, 1), R(-0.05, 0.05) + s * x * 0.0025); d.scale.set(R(15.5, 18), R(0.55, 0.8), R(15.5, 18)); d.updateMatrix(); im.setMatrixAt(k, d.matrix);
    if (s > 0) c.setHSL(0.06 + R(-0.01, 0.01), 0.45, 0.72 - L * 0.04 + R(-0.04, 0.04)); else c.setHSL(0.045 + R(-0.01, 0.01), 0.5, 0.55 - L * 0.04 + R(-0.04, 0.04));
    im.setColorAt(k, c); k++;
  }
  cells.add(im);
}

// ---- atoms (units: Å). Electron clouds = soft additive spheres; nuclei = tiny bright points (not to scale)
const atoms = new THREE.Scene(); atoms.background = new THREE.Color('#05070f');
const atomCam = new THREE.PerspectiveCamera(FOV_MICRO, W / H, 0.05, 2000);
const insetCam = new THREE.PerspectiveCamera(30, 1, 0.05, 2000);
const CLOUD_VS = `
  attribute vec3 aCol; attribute float aSide;
  uniform float uPlaneT, uPlaneB, uSquash, uTime, uShiftT, uShiftB;
  varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vSide; varying vec3 vW;
  void main(){
    vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0);
    w.y+=aSide>0.5?uShiftT:uShiftB;
    // clouds are squashed against the interface instead of overlapping (the repulsion)
    if(aSide>0.5 && w.y<uPlaneT) w.y=uPlaneT-(uPlaneT-w.y)*uSquash;
    if(aSide<0.5 && w.y>uPlaneB) w.y=uPlaneB+(w.y-uPlaneB)*uSquash;
    vW=w.xyz; vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); vV=normalize(cameraPosition-w.xyz); vCol=aCol; vSide=aSide;
    gl_Position=projectionMatrix*viewMatrix*w;
  }`;
const CLOUD_FS = `
  uniform float uTime, uGlow, uMid, uBright, uFogNear, uFogFar;
  varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vSide; varying vec3 vW;
  void main(){
    float nv=abs(dot(normalize(vN),normalize(vV)));
    float dens=0.05*pow(nv,1.2)+0.34*pow(nv,10.0);
    float shim=0.85+0.15*sin(vW.x*5.0+uTime*3.1)*sin(vW.y*6.0-uTime*2.3)*sin(vW.z*4.0+uTime*1.7);
    vec3 c=vCol*dens*shim*uBright;
    float g=exp(-abs(vW.y-uMid)*2.2)*uGlow; c+=vec3(1.0,0.45,0.25)*g*dens*2.0;
    float fog=1.0-smoothstep(uFogNear,uFogFar,distance(vW,cameraPosition)); c*=fog;
    gl_FragColor=vec4(c,1.0);
  }`;
const cloudUni = { uShiftT: { value: 0 }, uShiftB: { value: 0 }, uPlaneT: { value: 0.3 }, uPlaneB: { value: -0.3 }, uSquash: { value: 1 }, uTime: { value: 0 }, uGlow: { value: 0 }, uMid: { value: 0 }, uBright: { value: 1 }, uFogNear: { value: 20 }, uFogFar: { value: 70 } };
const cloudMat = new THREE.ShaderMaterial({ uniforms: cloudUni, vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const atomList = []; let nucTop, nucBot;
{
  // two amorphous slabs (protein-like: C, N, O, H). Jittered packing, ~1.5 Å bonds
  const EL = { C: { r: 0.95, c: [0.5, 0.75, 1.0] }, N: { r: 0.9, c: [0.45, 0.6, 1.0] }, O: { r: 0.85, c: [0.7, 0.55, 1.0] }, H: { r: 0.62, c: [0.85, 0.95, 1.0] } };
  const SP = 1.75;
  for (const s of [1, -1]) {
    for (let iy = 0; iy < 4; iy++) for (let ix = -20; ix <= 20; ix++) for (let iz = -6; iz <= 2; iz++) {
      const surf = iy === 0;
      const el = surf ? (rnd() < 0.7 ? 'H' : 'O') : pick(['C', 'C', 'C', 'N', 'O', 'H', 'H']);
      const x = ix * SP + (iy % 2) * SP * 0.5 + R(-0.35, 0.35), z = iz * SP * 1.05 + R(-0.35, 0.35);
      const y = s * (1.55 + iy * SP * 0.92 + R(-0.15, 0.15) + (surf ? 0.08 * Math.sin(ix * 1.3) : 0));
      atomList.push({ x, y, z, s, el, r: EL[el].r * R(0.95, 1.08) });
    }
  }
  // hero pair (fusion close-up) at x=0,z=0 on the interface
  for (const a of atomList) if (Math.abs(a.x) < 1.0 && Math.abs(a.z) < 1.0 && Math.abs(a.y) < 2.2) { a.hide = true; }
  const N = atomList.length; const geo = new THREE.SphereGeometry(1, 18, 12);
  const im = new THREE.InstancedMesh(geo, cloudMat, N); im.frustumCulled = false;
  const aCol = new Float32Array(N * 3), aSide = new Float32Array(N); const d = new THREE.Object3D();
  const tintA = new THREE.Color('#58a8ff'), tintB = new THREE.Color('#ff9a4a');
  atomList.forEach((a, i) => {
    d.position.set(a.x, a.y, a.z); d.scale.setScalar(a.hide ? 0 : a.r * 1.25); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    const base = new THREE.Color(...EL[a.el].c); const c = (a.s > 0 ? tintA : tintB).clone().lerp(base, a.s > 0 ? 0.35 : 0.0); if (a.s < 0) c.lerp(new THREE.Color(1, 0.75 + 0.1 * (a.el === 'H'), 0.45), 0.3);
    aCol.set([c.r, c.g, c.b], i * 3); aSide[i] = a.s > 0 ? 1 : 0;
  });
  geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3)); geo.setAttribute('aSide', new THREE.InstancedBufferAttribute(aSide, 1));
  atoms.add(im);
  // nuclei (one mesh per side so a slab can be pushed)
  for (const sd of [1, -1]) {
    const list = atomList.filter(a => a.s === sd);
    const nuc = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), list.length); nuc.frustumCulled = false;
    list.forEach((a, i) => { d.position.set(a.x, a.y, a.z); d.scale.setScalar(a.hide ? 0 : 0.055); d.updateMatrix(); nuc.setMatrixAt(i, d.matrix); });
    atoms.add(nuc); if (sd > 0) nucTop = nuc; else nucBot = nuc;
  }
}
// faint background specks (depth)
{
  const n = 900, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([R(-120, 120), R(-200, 200), R(-160, -40)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  atoms.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#3a4a7a', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.6 })));
}
// hero pair: one hydrogen atom from each side, for the fusion close-up
const heroMat = (col) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 1 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float nv=abs(dot(normalize(vN),normalize(vV))); gl_FragColor=vec4(uCol*(0.08*pow(nv,1.2)+0.4*pow(nv,10.0))*uA,1.0); }',
});
const heroCloudT = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), heroMat('#7cc0ff')); heroCloudT.scale.setScalar(0.62 * 1.25); atoms.add(heroCloudT);
const heroCloudB = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), heroMat('#ffa860')); heroCloudB.scale.setScalar(0.62 * 1.25); atoms.add(heroCloudB);
const nucMat = (col) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 1 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float nv=abs(dot(normalize(vN),normalize(vV))); gl_FragColor=vec4(uCol*(0.4+2.5*pow(nv,3.0))*uA,1.0); }',
});
const heroNucT = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), nucMat('#ffffff')); atoms.add(heroNucT);
const heroNucB = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), nucMat('#ffffff')); atoms.add(heroNucB);
// repulsion arcs between the two nuclei (field-line style)
const arcs = new THREE.Group(); atoms.add(arcs);
const arcMat = new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
for (let k = 0; k < 10; k++) {
  const a = k / 10 * Math.PI * 2; const pts = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; const bulge = Math.sin(u * Math.PI); pts.push(new THREE.Vector3(Math.cos(a) * bulge * 0.9, lerp(0.5, -0.5, u), Math.sin(a) * bulge * 0.9)); }
  arcs.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.02, 4, false), arcMat));
}
// fusion fireball
const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float nv=abs(dot(normalize(vN),normalize(vV))); vec3 c=mix(vec3(1.0,0.45,0.1),vec3(1.0,0.97,0.9),pow(nv,2.0)); gl_FragColor=vec4(c*(0.3+2.0*pow(nv,1.5))*uA,1.0); }',
})); atoms.add(fireball);
const heatBg = new THREE.Color('#05070f');
// fraction of the radius vs minutes since leaving the surface (surface -> centre), tools/tunnel.py
const TUN_HALF = 19.1703;
const TUN_R = [1.0000,0.9990,0.9980,0.9969,0.9958,0.9947,0.9937,0.9926,0.9915,0.9904,0.9885,0.9859,0.9834,0.9809,0.9779,0.9746,0.9713,0.9676,0.9637,0.9597,0.9553,0.9508,0.9460,0.9411,0.9358,0.9305,0.9247,0.9189,0.9128,0.9064,0.9000,0.8931,0.8861,0.8790,0.8715,0.8638,0.8559,0.8479,0.8395,0.8310,0.8222,0.8132,0.8040,0.7945,0.7849,0.7750,0.7649,0.7546,0.7440,0.7332,0.7223,0.7111,0.6996,0.6880,0.6761,0.6640,0.6517,0.6391,0.6263,0.6133,0.6001,0.5867,0.5730,0.5591,0.5449,0.5305,0.5159,0.5011,0.4860,0.4707,0.4552,0.4395,0.4236,0.4075,0.3913,0.3748,0.3582,0.3414,0.3244,0.3073,0.2900,0.2726,0.2551,0.2374,0.2196,0.2017,0.1837,0.1656,0.1474,0.1292,0.1108,0.0925,0.0740,0.0555,0.0371,0.0185,0.0000];

// =================== SPACE: cut-away Earth with the fall line (LA -> centre -> Indian Ocean) ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#020308');
const spaceCam = new THREE.PerspectiveCamera(35, W / H, 0.05, 3000);
{
  const n = 5000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
}
space.add(new THREE.AmbientLight(0x404a60, 0.7));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 3.0); spaceSun.position.set(-6, 4, 10); space.add(spaceSun);
const ER = 10;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const LA = ll2v(34.05, -118.24).normalize();
// rotate the globe so LA is straight up (+y), then spin about y so North America faces the camera side of the cut
const Q_GLOBE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 2.3).multiply(new THREE.Quaternion().setFromUnitVectors(LA, new THREE.Vector3(0, 1, 0)));
const globe = new THREE.Group(); space.add(globe);
// wedge cut: remove x>0 && z>0 (world), camera looks into the notch from (+x,+z)
const CUTX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), CUTZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const KEEPX = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), KEEPZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let globeMain, globeWedge;
const wedge = new THREE.Group(); space.add(wedge);
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
  const geo = new THREE.IcosahedronGeometry(ER, 48); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
    const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6');
    else if (isLand(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 36) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); }
    else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.applyQuaternion(Q_GLOBE);
  const mMain = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, clippingPlanes: [CUTX, CUTZ], clipIntersection: true, side: THREE.DoubleSide });
  globeMain = new THREE.Mesh(geo, mMain); globe.add(globeMain);
  const mWedge = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, clippingPlanes: [KEEPX, KEEPZ], clipIntersection: false, transparent: true, side: THREE.DoubleSide });
  globeWedge = new THREE.Mesh(geo, mWedge); wedge.add(globeWedge);
}
// cross-section faces (unlit, layered): inner core 1,221 km · outer core 3,480 km · mantle · crust
const SECT_FS = `uniform float uT; varying vec3 vP;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    float r=length(vP)/${ER.toFixed(1)};
    vec3 c;
    if(r<0.192) c=mix(vec3(1.1,1.05,0.85),vec3(1.0,0.88,0.45),r/0.192);
    else if(r<0.546) c=mix(vec3(1.0,0.62,0.12),vec3(0.95,0.42,0.06),(r-0.192)/0.354);
    else if(r<0.895) c=mix(vec3(0.58,0.15,0.06),vec3(0.42,0.10,0.05),(r-0.546)/0.349);
    else if(r<0.99) c=mix(vec3(0.36,0.11,0.06),vec3(0.27,0.10,0.07),(r-0.895)/0.095);
    else c=vec3(0.36,0.30,0.26);
    // faceted low-poly feel: quantised jitter
    vec2 q=floor(vP.xy*1.6+vP.zz*1.6); c*=0.93+0.1*h(q);
    float edge=smoothstep(0.004,0.0,abs(r-0.192))+smoothstep(0.004,0.0,abs(r-0.546))+smoothstep(0.004,0.0,abs(r-0.895));
    c=mix(c,vec3(1.0,0.95,0.85),edge*0.35);
    gl_FragColor=vec4(c*1.15,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const sectMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT: { value: 0 } }, vertexShader: 'varying vec3 vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.0); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }', fragmentShader: SECT_FS });
{
  const f1 = new THREE.CircleGeometry(ER * 0.999, 128, -Math.PI / 2, Math.PI); f1.rotateY(-Math.PI / 2); globe.add(new THREE.Mesh(f1, sectMat)); // plane x=0, z>=0
  const f2 = new THREE.CircleGeometry(ER * 0.999, 128, -Math.PI / 2, Math.PI); globe.add(new THREE.Mesh(f2, sectMat));                       // plane z=0, x>=0
}
// atmosphere glow
const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.06, 64, 48), new THREE.ShaderMaterial({
  transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.3; }'
})); space.add(atm);
// tunnel line (on the notch edge = the y axis) + markers
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ER * 2, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, depthTest: false })); tunnel.renderOrder = 8; space.add(tunnel);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(160,210,255,0.9)'); gr.addColorStop(0.5, 'rgba(70,140,255,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
const youDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true })); youDot.renderOrder = 10; youDot.scale.setScalar(1.6); space.add(youDot);
const TRAIL_N = 90;
const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#8fd0ff', transparent: true, opacity: 0.9, depthTest: false, blending: THREE.AdditiveBlending })); trail.renderOrder = 9; space.add(trail);
const trailWide = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#4fa0ff', transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending })); trailWide.renderOrder = 9; space.add(trailWide);
const splash = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 48), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false })); splash.rotation.x = Math.PI / 2; splash.renderOrder = 9; space.add(splash);
// fraction of radius at time tau (minutes), signed: + = LA side
function tunY(tau) {
  const P = TUN_HALF * 4; let u = ((tau % P) + P) % P;
  const half = (x) => { const k = clamp(x / TUN_HALF, 0, 1) * (TUN_R.length - 1); const i = Math.min(Math.floor(k), TUN_R.length - 2); return lerp(TUN_R[i], TUN_R[i + 1], k - i); };
  if (u < TUN_HALF) return half(u); if (u < 2 * TUN_HALF) return -half(2 * TUN_HALF - u); if (u < 3 * TUN_HALF) return -half(u - 2 * TUN_HALF); return half(4 * TUN_HALF - u);
}
const FALL_A = 36.6, FALL_RATE = TUN_HALF * 2 / (ARRIVE - FALL_A), FALL_K = 0.537;
function tauAt(t) {
  if (t < FALL_A) return 0;
  if (t < ARRIVE) return (t - FALL_A) * FALL_RATE;
  return TUN_HALF * 2 + FALL_RATE / FALL_K * (Math.exp(FALL_K * (t - ARRIVE)) - 1);
}
function tauRate(t) { return t < FALL_A ? 0 : t < ARRIVE ? FALL_RATE : FALL_RATE * Math.exp(FALL_K * (t - ARRIVE)); }

// =================== underground (for the sink) ===================
const under = new THREE.Group(); city.add(under);
{
  const ug = new THREE.BoxGeometry(16, 200, 16); ug.translate(HERO.x, -100.03, HERO.z);
  const um = new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `varying vec3 vW;
      float h(float x){ return fract(sin(x*127.1)*43758.5453); }
      void main(){
        float y=-vW.y; float band=floor(y/1.7+0.6*sin(vW.x*0.15+vW.z*0.11));
        vec3 c=mix(vec3(0.42,0.30,0.20),vec3(0.30,0.24,0.20),h(band));
        c=mix(c,vec3(0.36,0.34,0.33),smoothstep(6.0,20.0,y)); c=mix(c,vec3(0.22,0.20,0.20),smoothstep(25.0,80.0,y));
        float n=sin(vW.x*3.1+vW.y*1.7)*sin(vW.z*2.7-vW.y*2.3)*sin(vW.y*5.3+vW.x*1.1); c*=0.82+0.18*n;
        c*=exp(-max(y-3.0,0.0)*0.012);
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  under.add(new THREE.Mesh(ug, um));
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M('#6e655c', { flatShading: true, roughness: 1 }), 900); const d = new THREE.Object3D();
  for (let i = 0; i < 900; i++) { const a = R(0, 6.283), r = R(1.0, 7.5); d.position.set(HERO.x + Math.cos(a) * r, -R(0.6, 120), HERO.z + Math.sin(a) * r); d.rotation.set(R(0, 3), R(0, 3), R(0, 3)); d.scale.set(R(0.1, 0.5), R(0.08, 0.35), R(0.1, 0.5)); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); }
  under.add(rocks);
  for (const [y, z, r, c] of [[-1.6, 0.0, 0.35, '#4a5a66'], [-3.4, 1.3, 0.6, '#5b524a'], [-5.2, -1.0, 0.18, '#a07a2a']]) { const p = mesh(new THREE.CylinderGeometry(r, r, 80, 14), M(c, { roughness: 0.6, metalness: 0.2 })); p.rotation.z = Math.PI / 2; p.position.set(HERO.x, y, HERO.z + z); under.add(p); }
}
const lightUnder = new THREE.PointLight(0xffe0c0, 0, 30, 1.2); city.add(lightUnder);

// =================== state helpers ===================
const G0 = 9.8;
function sinkTau(t) { if (t < SWITCH_END) return 0; if (t < SLOWMO_END) return 0.35 * (t - SWITCH_END); return 0.35 * (SLOWMO_END - SWITCH_END) + (t - SLOWMO_END); }
function sinkDepth(t) { const tau = sinkTau(t); return 0.5 * G0 * tau * tau; }
const baseY = (p) => 0.18 + 0.95;
function sitY(p) { return 0.18 + 0.47 + 0.035 + 0.08 + 0.95 - 0.96 * p.h; }

// =================== cameras ===================
const BACK_HANDS = new THREE.Vector3(0.14, 0.06, -1).normalize();
const handsCam = new THREE.PerspectiveCamera(30, W / H, 0.002, 50);
function hookField(t) { return logKey([[0, 0.21], [1.7, 0.095], [2.6, 0.013]], t); }
function hookGap(t) { return logKey([[0, 0.12], [1.7, 0.006], [2.6, 0.0006]], t); }
function outroField(t) { return logKey([[FUSE_END - 0.4, 0.05], [T_END + 0.6, 0.2]], t); }
function diveField(t) { return logKey([[2.6, 0.013], [4.3, 0.0006], [5.7, 1.1e-5], [7.0, 1.4e-9], [15, 1.15e-9]], t); }
function fmtLen(m) {
  if (m >= 0.01) return (m * 100).toFixed(m >= 0.1 ? 0 : 1) + ' cm';
  if (m >= 0.001) return (m * 1000).toFixed(1) + ' mm';
  if (m >= 1e-6) { const u = m * 1e6; return (u >= 10 ? Math.round(u) : u.toFixed(1)) + ' µm'; }
  const n = m * 1e9; return (n >= 10 ? Math.round(n) : n.toFixed(1)) + ' nm';
}
function layerName(m) { return m > 2e-3 ? 'FINGERTIPS' : m > 5e-5 ? 'SKIN RIDGES' : m > 4e-7 ? 'SKIN CELLS' : m > 6e-9 ? 'MOLECULES' : 'ATOMS'; }

function setDayDusk(dusk) {
  const sun = SUN_DAY.clone().lerp(SUN_DUSK, dusk).normalize();
  domeMat.uniforms.uSunS.value.copy(sun); domeMat.uniforms.uDay.value = lerp(1, 0.55, dusk); domeMat.uniforms.uDusk.value = dusk;
  sunL.color.set(dusk > 0.5 ? 0xffb070 : 0xfff0dc); sunL.intensity = lerp(3.0, 2.2, dusk); hemi.intensity = lerp(1.0, 0.6, dusk);
  hemi.color.set(dusk > 0.5 ? 0xd0a8a0 : 0xbfd6f2);
  city.fog.color.setRGB(lerp(0.62, 0.86, dusk), lerp(0.74, 0.55, dusk), lerp(0.88, 0.42, dusk)); city.fog.near = 160; city.fog.far = 2600;
  for (const m of winMats) m.emissiveIntensity = 0.12 + 0.6 * dusk;
  for (const m of lampHeads) m.emissiveIntensity = 1.6 * dusk;
  clouds.forEach(c => c.material.color.setRGB(1, lerp(1, 0.78, dusk), lerp(1, 0.62, dusk)));
  handSun.color.set(dusk > 0.5 ? 0xffb878 : 0xfff0dc); handSun.intensity = lerp(2.6, 2.4, dusk); handHemi.intensity = lerp(1.1, 0.75, dusk);
  return sun;
}

// =================== update: city ===================
const hideSpots = [HERO, BENCH];
function updateCity(t, camera, dusk) {
  const sun = setDayDusk(dusk);
  sunL.position.copy(camera.position).addScaledVector(sun, 300); sunL.target.position.copy(camera.position).add(new THREE.Vector3(0, 0, 0)); sunL.target.updateMatrixWorld();
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); });
  for (const c of cars) {
    if (c.cross) continue;
    const x = wrapR(c.x0 + c.dir * c.speed * t, -220, 760);
    c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0);
    c.g.visible = Math.hypot(x - camera.position.x, c.lane - camera.position.z) > 6;
  }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const gy = Math.abs(z) > 7 ? 0.18 : 0;
    o.position.set(x, gy + 0.95, z); o.rotation.set(0, ry, 0);
    if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph);
    o.visible = !hideSpots.some(s => Math.hypot(x - s.x, z - s.z) < 3.2) && Math.hypot(x - camera.position.x, z - camera.position.z) > 2.5;
  }
  ball.visible = false;
  under.visible = camera.position.y < 0.5;
}
// heroes per shot
function poseHeroes(t) {
  const A = heroA, B = heroB;
  A.outer.visible = B.outer.visible = true; A.outer.rotation.set(0, 0, 0); B.outer.rotation.set(0, Math.PI, 0);
  glowA.uniforms.uA.value = 0; glowB.uniforms.uA.value = 0;
  if (t < BENCH_END) {
    // A on the bench, B out of shot
    A.outer.position.set(BENCH.x - 0.15, sitY(A), BENCH.z + 0.02); poseSit(A); A.arms[0].rotation.x = -0.45; A.arms[1].rotation.x = -0.25; A.elbows[0].rotation.x = -0.9; A.elbows[1].rotation.x = -0.7;
    B.outer.visible = false;
    return;
  }
  const HD = 0.125;
  A.outer.position.set(HERO.x, baseY(A), HERO.z - HD); B.outer.position.set(HERO.x, baseY(B), HERO.z + HD);
  const k = smooth(BENCH_END - 0.2, BENCH_END + 0.8, t);
  poseHug(A, k, true); poseHug(B, k, false);
  const g = 0.6 * smooth(22.8, 24.8, t) * (1 - smooth(SWITCH_END + 0.2, SWITCH_END + 1.0, t));
  glowA.uniforms.uA.value = g * (1 + 0.15 * Math.sin(t * 5)); glowB.uniforms.uA.value = g * (1 + 0.15 * Math.sin(t * 5 + 1.3));
  if (t >= SWITCH_END) {
    const d = sinkDepth(t); A.outer.position.y = baseY(A) - d;
    const s = t - SWITCH_END;
    if (s < 0.5) { poseHug(A, 1 - s * 1.2, true); A.arms[0].rotation.x -= s * 2; A.arms[1].rotation.x -= s * 2; }
    else poseFlail(A, t, 0.3);
    // B's arms close on nothing and B stumbles forward into the empty space
    const c = smooth(0.1, 0.9, s);
    poseHug(B, 1, false); B.elbows[0].rotation.z = lerp(B.elbows[0].rotation.z, 1.9, c); B.elbows[1].rotation.z = lerp(B.elbows[1].rotation.z, -1.9, c);
    B.outer.position.z = HERO.z + HD - 0.22 * smooth(0.2, 1.2, s); B.outer.rotation.x = -0.18 * smooth(0.2, 0.8, s) * (1 - 0.6 * smooth(1.0, 1.6, s));
  }
}
function cityCamera(t) {
  cam.fov = 50; cam.near = 0.05; cam.far = 5000;
  if (t < BENCH_END) { // bench: low side view, slow dolly in
    const u = (t - ATOM_END) / (BENCH_END - ATOM_END);
    cam.position.set(BENCH.x + lerp(3.3, 2.8, u), lerp(1.0, 0.95, u), BENCH.z + lerp(2.4, 2.0, u)); cam.lookAt(BENCH.x - 0.15, 1.22, BENCH.z);
  } else if (t < SWITCH_END) { // hug orbit
    const u = (t - BENCH_END) / (SWITCH_END - BENCH_END); const a = lerp(0.35, 1.25, u); const r = lerp(2.6, 2.0, ease(u));
    cam.position.set(HERO.x + Math.sin(a) * r, lerp(1.55, 1.42, u), HERO.z + Math.cos(a) * r); cam.lookAt(HERO.x, 1.28, HERO.z);
    cam.fov = 46;
  } else if (t < SLOWMO_END) { // sink: side view at waist height
    const u = (t - SWITCH_END) / (SLOWMO_END - SWITCH_END);
    cam.position.set(HERO.x + lerp(2.9, 2.4, u), lerp(1.35, 1.0, u), HERO.z + lerp(1.3, 1.7, u)); cam.lookAt(HERO.x, lerp(0.85, 0.35, u), HERO.z - 0.1);
  } else { // follow A down through the ground, looking down
    const Ay = heroA.outer.position.y; const u = smooth(SLOWMO_END, SLOWMO_END + 0.6, t);
    const from = new THREE.Vector3(HERO.x + 2.4, 1.0, HERO.z + 1.7), to = new THREE.Vector3(HERO.x + 1.0, Ay + 3.0, HERO.z + 1.5);
    cam.position.copy(from).lerp(to, u); cam.lookAt(HERO.x, lerp(0.3, Ay - 0.8, u), HERO.z - 0.1);
    cam.fov = lerp(50, 62, u);
  }
  cam.updateProjectionMatrix();
}
function spaceCamera(t) {
  const u = ease((t - SINK_END) / 2.2);
  const d0 = new THREE.Vector3(0.25, 1.0, 0.45).normalize(), d1 = new THREE.Vector3(1, 0.34, 1).normalize();
  const dir = d0.clone().lerp(d1, u).normalize();
  const orbit = 0.32 * smooth(36.5, EARTH_END, t); dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -orbit);
  const dist = Math.exp(lerp(Math.log(ER * 1.75), Math.log(ER * 7.4), u));
  const target = new THREE.Vector3(0, ER, 0).lerp(new THREE.Vector3(0, -0.15 * ER, 0), u);
  spaceCam.position.copy(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, u < 1 ? 0 : 0, 0)); spaceCam.lookAt(target); spaceCam.updateProjectionMatrix();
}

// =================== update: micro layers ===================
function updateSkin(t, field) { camForField(skinCam, field * 1000, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.02, 1)); }
function updateCells(t, field) { camForField(cellCam, field * 1e6, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 0.03, 1)); }
function atomState(t) {
  // defaults
  let shift = 0, glow = 0.25, squash = 0.25, bright = 1;
  if (t < ATOM_END) {
    glow = 0.25 + 0.15 * Math.sin(t * 3);
    if (t > 11.2) { const s = t - 11.4; const p = s > 0 ? Math.exp(-s * 1.4) * Math.sin(s * 5.0) : 0; shift = -0.42 * Math.max(0, p) - 0.25 * smooth(11.2, 11.4, t) * (s < 0 ? 1 : Math.exp(-s * 3)); glow += 1.4 * Math.max(0, -shift) / 0.42; }
  } else if (t >= EARTH_END) {
    shift = -0.62 * ease((t - EARTH_END) / 1.6); glow = 0.4 + 1.6 * smooth(EARTH_END, EARTH_END + 1.6, t) + 2.5 * smooth(53.5, FUSE, t);
  }
  cloudUni.uShiftT.value = shift; cloudUni.uShiftB.value = -shift; cloudUni.uGlow.value = glow; cloudUni.uSquash.value = squash; cloudUni.uBright.value = bright; cloudUni.uTime.value = t;
  nucTop.position.y = shift; nucBot.position.y = -shift;
  // hero pair (hydrogen atoms at the interface)
  let yh = 1.55 + shift, nucS = 0.055, sq = 1, arcA = 0, fb = 0, jit = 0, cloudA = 1;
  if (t >= EARTH_END) {
    const a = smooth(53.0, FUSE, t); yh = lerp(1.55 - 0.62, 0.42, Math.pow(a, 1.3)); nucS = lerp(0.055, 0.32, smooth(51.6, 53.4, t)); sq = lerp(1, 0.55, smooth(EARTH_END, 52, t));
    arcA = smooth(52.6, 54.2, t) * (0.7 + 0.3 * Math.sin(t * 23)); jit = 0.05 * a; cloudA = 1 - 0.5 * a;
    if (t >= FUSE) { const f = t - FUSE; yh = 0; fb = Math.exp(-f * 0.8); }
  }
  const jx = jit * Math.sin(t * 61), jz = jit * Math.cos(t * 53);
  heroCloudT.position.set(jx, yh, jz); heroCloudB.position.set(-jx, -yh, -jz);
  heroCloudT.scale.set(0.78, 0.78 * sq, 0.78); heroCloudB.scale.set(0.78, 0.78 * sq, 0.78);
  heroCloudT.material.uniforms.uA.value = cloudA; heroCloudB.material.uniforms.uA.value = cloudA;
  heroNucT.position.copy(heroCloudT.position); heroNucB.position.copy(heroCloudB.position); heroNucT.scale.setScalar(nucS); heroNucB.scale.setScalar(nucS);
  heroNucT.visible = heroNucB.visible = t < FUSE || t >= ATOM_END && t < EARTH_END;
  arcs.visible = arcA > 0.01; arcMat.opacity = arcA; arcs.scale.set(0.5 + yh * 0.4, Math.max(yh * 2 - nucS * 2, 0.05), 0.5 + yh * 0.4);
  fireball.visible = fb > 0.001; const fr = t >= FUSE ? 0.4 + 9 * Math.pow(t - FUSE, 0.6) : 0; fireball.scale.setScalar(fr); fireball.material.uniforms.uA.value = fb * 1.5;
  const heat = t >= EARTH_END ? smooth(52.5, FUSE, t) : 0; atoms.background = heatBg.clone().lerp(new THREE.Color('#3a0c04'), heat);
}
function updateAtomCam(t) {
  if (t < ATOM_END) {
    const f = diveField(t) * 1e10; const a = 0.22 * Math.sin((t - 7) * 0.35);
    camForField(atomCam, f, new THREE.Vector3(0, 0, -1.5), new THREE.Vector3(Math.sin(a) + 0.08, 0.06, Math.cos(a)));
  } else {
    const f = logKey([[EARTH_END, 15], [51.6, 13], [53.6, 4.6], [FUSE, 3.6], [FUSE_END, 5.5]], t);
    const a = 0.25 + 0.1 * Math.sin(t * 0.4); const tgt = new THREE.Vector3(0, 0, lerp(-1.5, 0, smooth(51.6, 53.6, t)));
    camForField(atomCam, f, tgt, new THREE.Vector3(Math.sin(a), 0.1, Math.cos(a)));
  }
  atomCam.near = 0.05; atomCam.far = 400; atomCam.updateProjectionMatrix();
  cloudUni.uFogNear.value = atomCam.position.distanceTo(new THREE.Vector3()) + 6; cloudUni.uFogFar.value = cloudUni.uFogNear.value + 40;
}
// =================== update: space ===================
const _v = new THREE.Vector3();
function updateSpace(t) {
  const wk = ease((t - CUT) / 1.0);
  wedge.position.set(1, 0.2, 1).multiplyScalar(ER * 1.8 * wk);
  if (globeWedge) { globeWedge.material.opacity = 1 - smooth(CUT + 0.3, CUT + 1.0, t); globeWedge.visible = wk < 0.999; }
  tunnel.material.opacity = 0.5 * smooth(CUT + 0.6, CUT + 1.1, t);
  const tau = tauAt(t); const y = tunY(tau) * ER;
  youDot.position.set(0, y, 0); youDot.scale.setScalar(lerp(0.45, 1.5, smooth(SINK_END, SINK_END + 2, t)) * (1 + 0.1 * Math.sin(t * 9)));
  const rate = tauRate(t); const L = Math.min(TUN_HALF * 4, Math.max(0.01, rate * 0.3));
  const pa = trailGeo.attributes.position;
  for (let i = 0; i < TRAIL_N; i++) { const tt = tau - L * i / (TRAIL_N - 1); pa.setXYZ(i, 0, tunY(Math.max(tt, 0)) * ER, 0); }
  pa.needsUpdate = true; trail.visible = t > FALL_A; trailGeo.computeBoundingSphere();
  const fast = smooth(44.5, 47.5, t); trailWide.material.opacity = 0.35 * fast; trailWide.scale.set(1, ER * 2, 1); trailWide.position.set(0, 0, 0);
  const sp = t - ARRIVE; splash.material.opacity = sp > 0 && sp < 1.4 ? (1 - sp / 1.4) : 0; splash.scale.setScalar(1 + sp * 2.5); splash.position.set(0, -ER * 1.002, 0);
  spaceSun.position.copy(spaceCam.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.9).add(new THREE.Vector3(0, ER * 2, 0));
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'cracks', 'veil', 'sw', 'swKnob', 'swState', 'labels', 'lead', 'inlab'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [2.75, 6.85, 'Plot twist:<br>you never have. Not once.'],
  [7.2, 10.8, 'Atoms are mostly<br>empty space.'],
  [11.0, 14.8, 'What you feel as touch is<br>electrons pushing back.'],
  [15.3, 18.4, "You're not sitting<br>on your chair."],
  [18.6, 21.8, "You're hovering above it,<br>about one atom high."],
  [22.3, 25.0, "Every hug you've ever had…"],
  [25.2, 27.9, '…had a gap of<br>a hundred-millionth<br>of a centimeter.'],
  [28.2, 29.95, 'Now flip the switch.'],
  [30.4, 33.7, "You'd fall through<br>the floor…"],
  [34.1, 37.3, '…and through<br>the planet.'],
  [37.5, 41.6, 'About 38 minutes<br>to the other side.'],
  [42.2, 45.8, 'Then you fall back.<br>Again. And again.'],
  [46.0, 49.8, 'No air, no friction.<br>It never stops.'],
  [50.3, 53.2, 'Or squeeze harder:<br>the nuclei push back.'],
  [53.4, 56.3, "Fusing them takes conditions<br>like the Sun's core."],
  [58.3, 60.8, 'That tiny gap is what<br>makes things solid.'],
  [61.0, 63.45, "And it's as close as two<br>people can ever get."],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < HOOK) show = 0;
  else if (t < DIVE_END) { const f = diveField(t); lab = 'SCALE'; val = fmtLen(f); sub = layerName(f); }
  else if (t < ATOM_END) { lab = 'THE GAP'; val = '0.1 nm'; sub = '≈ 0.000000004 INCHES'; }
  else if (t < BENCH_END) { lab = 'YOUR HOVER HEIGHT'; val = '0.1 nm'; sub = 'ABOUT ONE ATOM'; }
  else if (t < HUG_END) { lab = 'CLOSEST CONTACT'; val = '0.1 nm'; sub = 'A HUNDRED-MILLIONTH OF A CM'; }
  else if (t < SWITCH_END) show = 0;
  else if (t < SINK_END) { if (t < SLOWMO_END) stat = '<b></b>SLOW MOTION'; lab = 'FALLING'; val = fmtInt(sinkDepth(t) * 3.281) + ' ft'; sub = 'NOTHING HOLDS YOU UP'; }
  else if (t < FALL_A) { lab = 'STARTING POINT'; val = 'Los Angeles'; sub = 'STRAIGHT DOWN, THROUGH THE CENTER'; }
  else if (t < ARRIVE) {
    stat = '<b></b>TIME-LAPSE'; const tau = tauAt(t); lab = 'FALL TIME'; val = Math.floor(tau) + ' min';
    const dy = Math.abs(tunY(tau + 0.05) - tunY(tau - 0.05)) / 0.1 * 6371; sub = 'SPEED ' + fmtInt(Math.round(dy * 37.28 / 100) * 100) + ' MPH';
  }
  else if (t < 43.2) { lab = 'YOU POP OUT IN THE'; val = 'Indian Ocean'; sub = '38 MIN AFTER LEAVING L.A.'; }
  else if (t < EARTH_END) { stat = '<b></b>TIME-LAPSE'; lab = 'TRIPS THROUGH EARTH'; val = fmtInt(Math.floor(tauAt(t) / (TUN_HALF * 2))); sub = 'ONE EVERY 38 MIN · FOREVER'; }
  else if (t < FUSE_END) { const k = smooth(EARTH_END + 0.5, FUSE - 0.3, t); lab = 'TEMPERATURE NEEDED'; val = fmtInt(Math.round(Math.pow(k, 2.2) * 27e6 / 1000) * 1000) + ' °F'; sub = k > 0.98 ? "THE SUN'S CORE · 15 MILLION °C" : 'PUSHING HARDER…'; }
  else { lab = 'THE GAP'; val = '0.1 nm'; sub = 'AS CLOSE AS IT GETS'; }
  return { stat, lab, val, sub, show };
}
function buildCracks() {
  let s = '';
  for (const [cx, cy, n] of [[560, 900, 14], [250, 1420, 9], [820, 520, 9]]) {
    for (let i = 0; i < n; i++) {
      let a = i / n * Math.PI * 2 + R(-0.2, 0.2), x = cx, y = cy; let d = `M${cx},${cy}`; const L = R(160, 520);
      for (let l = 0; l < L; l += R(25, 60)) { a += R(-0.35, 0.35); x += Math.cos(a) * R(25, 60); y += Math.sin(a) * R(25, 60); d += ` L${x.toFixed(1)},${y.toFixed(1)}`; }
      s += `<path d="${d}" stroke="rgba(255,255,255,.85)" stroke-width="${R(1.5, 3).toFixed(1)}" fill="none"/>`;
    }
    for (const rr of [R(40, 70), R(110, 160)]) { let d = ''; const a0 = R(0, 6), a1 = a0 + R(2, 4.5); for (let a = a0; a < a1; a += 0.3) { const r = rr * R(0.85, 1.15); d += `${d ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `; } s += `<path d="${d}" stroke="rgba(255,255,255,.7)" stroke-width="1.6" fill="none"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(255,255,255,.9)"/>`;
  }
  el.cracks.innerHTML = s;
}
function proj(v, camera) { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (1 - (p.y * 0.5 + 0.5)) * H, p.z]; }
const INSET = { cx: 560, cy: 600, r: 250 };
function labelHTML(x, y, text, cls = '', op = 1) { return `<div class="lbl ${cls}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;opacity:${op.toFixed(3)}">${text}</div>`; }
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(HOOK - 0.25, HOOK + 0.05, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - fadeWin(t, FUSE - 0.05, FUSE_END + 0.25, 0.15)) * (1 - smooth(T_END, T_END + 0.4, t)) * smooth(HOOK, HOOK + 0.3, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  // switch
  el.sw.style.opacity = fadeWin(t, HUG_END + 0.1, SWITCH_END + 0.6, 0.3);
  const on = t < FLIP; el.sw.classList.toggle('off', !on); el.swState.textContent = on ? 'ON' : 'OFF';
  // veils / flashes
  const cut1 = fadeWin(t, ATOM_END - 0.3, ATOM_END + 0.3, 0.3);           // atoms -> bench
  const cut2 = fadeWin(t, SINK_END - 0.35, SINK_END + 0.35, 0.35);        // underground -> space
  const cut3 = fadeWin(t, EARTH_END - 0.3, EARTH_END + 0.3, 0.3);         // space -> atoms
  el.veil.style.background = t < 20 ? '#e8eef6' : '#05070c'; el.veil.style.opacity = Math.max(cut1 * 0.95, cut2, cut3);
  const flip = t >= FLIP ? Math.exp(-(t - FLIP) * 5) * 0.75 : 0;
  const fuse = t >= FUSE ? (t < FUSE_END ? 1 - smooth(FUSE_END - 0.5, FUSE_END + 0.35, t) * 1 : 1 - smooth(FUSE_END - 0.5, FUSE_END + 0.35, t)) : 0;
  el.flash.style.opacity = Math.max(flip, Math.max(0, fuse) * (t < FUSE + 0.25 ? smooth(FUSE, FUSE + 0.12, t) : 1));
  el.cracks.style.opacity = t >= FUSE + 0.05 && t < FUSE_END + 0.8 ? 1 - smooth(FUSE_END + 0.3, FUSE_END + 0.8, t) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  // labels
  let L = '';
  const insetOn = t >= ATOM_END + 0.6 && t < BENCH_END;
  if (insetOn) {
    const op = fadeWin(t, ATOM_END + 0.6, BENCH_END, 0.4);
    L += labelHTML(INSET.cx, INSET.cy - INSET.r * 0.72, 'YOUR JEANS', 'blue', op) + labelHTML(INSET.cx, INSET.cy + INSET.r * 0.6, 'THE BENCH', 'orange', op) + labelHTML(INSET.cx + 105, INSET.cy - 4, '↕ 0.1 nm', 'big', op);
  }
  if (t >= SINK_END && t < EARTH_END) {
    const op = fadeWin(t, SINK_END + 0.4, EARTH_END, 0.4);
    const you = proj(youDot.position, spaceCam); L += labelHTML(you[0] - 70, you[1] - 8, 'YOU', 'you', op);
    const la = proj(new THREE.Vector3(0, ER * 1.02, 0), spaceCam); L += labelHTML(la[0], la[1] - 46, 'LOS ANGELES', '', op * smooth(SINK_END + 1.6, SINK_END + 2.2, t));
    const io = proj(new THREE.Vector3(0, -ER * 1.02, 0), spaceCam); L += labelHTML(io[0], io[1] + 22, 'INDIAN OCEAN', '', op * smooth(CUT + 0.8, CUT + 1.4, t));
    const lop = op * smooth(CUT + 1.0, CUT + 1.6, t) * (1 - smooth(42.6, 43.4, t));
    for (const [r, a, name] of [[0.74, 0.55, 'MANTLE'], [0.37, 0.75, 'OUTER CORE'], [0.0, 0, 'INNER CORE']]) {
      const p = r ? new THREE.Vector3(0, Math.sin(a) * r * ER, Math.cos(a) * r * ER) : new THREE.Vector3(0, 0, 0.6);
      const q = proj(p, spaceCam); L += labelHTML(q[0] - (r ? 0 : 0), q[1] + (r ? 0 : -30), name, 'small', lop);
    }
  }
  el.labels.innerHTML = L;
  // inset leader line (bench)
  if (insetOn) {
    const p = proj(new THREE.Vector3(BENCH.x - 0.15, 0.69, BENCH.z + 0.05), cam);
    const ang = Math.atan2(p[1] - INSET.cy, p[0] - INSET.cx); const sx = INSET.cx + Math.cos(ang) * INSET.r, sy = INSET.cy + Math.sin(ang) * INSET.r;
    el.lead.innerHTML = `<line x1="${sx}" y1="${sy}" x2="${p[0]}" y2="${p[1]}" stroke="rgba(255,255,255,.9)" stroke-width="3"/><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="none" stroke="#fff" stroke-width="3"/>`;
    el.lead.style.opacity = fadeWin(t, ATOM_END + 0.6, BENCH_END, 0.4);
  } else el.lead.style.opacity = 0;
}

// =================== layers ===================
function drawHands(t, rt, outro) {
  const field = outro ? outroField(t) : hookField(t), gap = outro ? 0.0016 : hookGap(t);
  const dusk = outro ? 1 : 0;
  placeHands(gap, t);
  handsCam.fov = 30;
  camForField(handsCam, field, CONTACT, BACK_HANDS); handsCam.near = Math.max(0.002, handsCam.position.distanceTo(CONTACT) * 0.05); handsCam.far = 40; handsCam.updateProjectionMatrix();
  // blurred city behind (low-res render = cheap bokeh)
  cam.position.copy(handsCam.position); cam.quaternion.copy(handsCam.quaternion); cam.fov = handsCam.fov; cam.near = 0.3; cam.far = 4000; cam.updateProjectionMatrix();
  heroA.outer.visible = heroB.outer.visible = false; benchG.visible = true;
  updateCity(t, cam, dusk);
  toRT(rtSmall, city, cam);
  handSun.position.copy(CONTACT).addScaledVector(dusk ? SUN_DUSK : HAND_SUN, 5); handSun.target.position.copy(CONTACT); handSun.target.updateMatrixWorld();
  handRim.position.copy(CONTACT).add(new THREE.Vector3(-1, 0.6, 3)); handRim.target.position.copy(CONTACT); handRim.target.updateMatrixWorld(); handRim.intensity = outro ? 2.0 : 1.0;
  gapGlow.material.uniforms.uA.value = outro ? 1.6 * smooth(FUSE_END, FUSE_END + 1.2, t) : 0;
  renderer.setRenderTarget(rt); renderer.clear();
  blit(rtSmall.texture, { blur: 1.6 });
  renderer.clearDepth(); renderer.render(hands, handsCam);
}
function drawAtoms(t, rt) { atomState(t); updateAtomCam(t); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(atoms, atomCam); }
function drawSkin(t, rt) { updateSkin(t, diveField(t)); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(skin, skinCam); }
function drawCells(t, rt) { updateCells(t, Math.max(diveField(t), 7e-6)); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(cells, cellCam); }
function drawCity(t, rt) {
  poseHeroes(t); cityCamera(t); benchG.visible = true; updateCity(t, cam, 0);
  lightUnder.position.copy(heroA.outer.position).add(new THREE.Vector3(0.5, 1.5, 0.8)); lightUnder.intensity = cam.position.y < 0 ? 6 : 0;
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(city, cam);
  if (t >= ATOM_END + 0.6 && t < BENCH_END) {           // magnifier: atoms between jeans and bench
    const k = fadeWin(t, ATOM_END + 0.6, BENCH_END, 0.4);
    atomState(9.0); const ia = 0.12 + 0.03 * (t - ATOM_END); camForField(insetCam, 8.5, new THREE.Vector3(0, 0, -1.5), new THREE.Vector3(Math.sin(ia), 0.05, Math.cos(ia)));
    insetCam.aspect = 1; insetCam.updateProjectionMatrix(); cloudUni.uFogNear.value = insetCam.position.length() + 6; cloudUni.uFogFar.value = cloudUni.uFogNear.value + 40;
    const s = 0.82 + 0.18 * ease(k);
    // insetCam was framed for portrait height; for a square inset use the width
    cloudUni.uBright.value = 0.55; toRT(rtInset, atoms, insetCam, 0x05070f);
    renderer.setRenderTarget(rt);
    const r = INSET.r * s;
    blit(rtInset.texture, { rect: [(INSET.cx - r) / W, 1 - (INSET.cy + r) / H, 2 * r / W, 2 * r / H], circle: true, alpha: k, ring: [1.6, 1.6, 1.6] });
  }
}
function drawSpace(t, rt) { spaceCamera(t); updateSpace(t); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(space, spaceCam); }
const LAYERS = { hands: (t, rt) => drawHands(t, rt, false), outro: (t, rt) => drawHands(t, rt, true), skin: drawSkin, cells: drawCells, atoms: drawAtoms, city: drawCity, space: drawSpace };
// [name, from, to] — overlapping ranges crossfade
const SHOTS = [['hands', 0, 2.75], ['skin', 2.45, 4.5], ['cells', 4.2, 6.35], ['atoms', 6.05, ATOM_END], ['city', ATOM_END, SINK_END], ['space', SINK_END, EARTH_END], ['atoms', EARTH_END, FUSE_END], ['outro', FUSE_END - 0.4, T_END + 1.5]];
function shotsAt(t) { return SHOTS.filter(([, a, b]) => t >= a && t < b); }

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  if (window.PASS === 'text') {
    // labels need the cameras even when nothing is rendered
    if (t >= ATOM_END && t < SINK_END) { poseHeroes(t); cityCamera(t); }
    if (t >= SINK_END && t < EARTH_END) { spaceCamera(t); updateSpace(t); updateDOM(t); }
    if (t >= ATOM_END && t < BENCH_END) updateDOM(t);
    return true;
  }
  const s = shotsAt(t);
  renderer.setRenderTarget(null); renderer.clear();
  if (s.length === 1) LAYERS[s[0][0]](t, null);
  else if (s.length >= 2) {
    const [a, b] = s; const k = smooth(b[1], a[2], t);
    LAYERS[a[0]](t, rtA); LAYERS[b[0]](t, rtB);
    renderer.setRenderTarget(null); renderer.clear(); blit(rtA.texture, { b: rtB.texture, k });
  }
  renderer.setRenderTarget(null);
  updateDOM(t);
  return true;
};
buildCracks();
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe()]).then(() => { window.renderAt(0); return true; });
