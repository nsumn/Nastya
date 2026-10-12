import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
/* global topojson */

// "What if everything that can fart… farted at the same time?" (reply to @ErikShawnz)
// Facts: median flatus ~90 mL (Tomlin, Lewis & Read, Gut 1991); 8.2e9 x 90 mL = 738,000 m3 = 26M cu ft = cube ~90 m (Statue of Liberty 93 m w/ pedestal);
// ~95% of cow (forestomach) methane is belched; herring communicate with FRT bubble sounds (Wilson, Batty & Dill 2003); sloths & most birds don't fart.
// v2 (story order): bus -> plane (NZ Med J 2013: more gas at altitude, charcoal-cushion suggestion) -> Earth -> cow burps -> herring -> sloth
// -> cube by the Statue of Liberty -> lighter -> held-in gas is partly reabsorbed and exhaled (basis of hydrogen breath tests).
// =================== timeline ===================
const POP = 3.0, AWK = 6.0, SMELL = 10.0, PLANE = 15.0, EARTH = 22.0, COW = 27.0, FISH = 32.0, SLOTH = 36.0, CUBE = 40.0, LIGHT = 47.0, HOLD = 53.0, T_END = 61.0;
const FPS = 30;
// =================== rng / helpers ===================
let seed = 5151;
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

// =================== helpers ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(parent, w, h, d, mat, x, y, z) { const m = mesh(BOX, mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const puffTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 64 + R(-26, 26), y = 64 + R(-20, 20), r = R(18, 34); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(215,240,120,0.95)'); gr.addColorStop(0.6, 'rgba(170,210,80,0.5)'); gr.addColorStop(1, 'rgba(150,190,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
const GASC = '#b8dc4a';
function skyDome(scene, top, bot, r = 4000) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uT: { value: new THREE.Color(top) }, uB: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uT, uB; varying vec3 vD; void main(){ float e=clamp(normalize(vD).y,-0.2,1.0); vec3 c=mix(uB,uT,pow(max(e,0.0),0.55)); gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
  m.frustumCulled = false; scene.add(m); return m;
}

// =================== GLOBE ===================
const gScene = new THREE.Scene(); gScene.background = new THREE.Color('#020308');
const gCam = new THREE.PerspectiveCamera(32, W / H, 0.1, 3000);
{
  const n = 5000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gScene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false })));
}
gScene.add(new THREE.AmbientLight(0x405070, 0.6)); const gSun = new THREE.DirectionalLight(0xfff2e0, 2.8); gSun.position.set(-8, 5, 10); gScene.add(gSun);
const ER = 10; const globe = new THREE.Group(); gScene.add(globe);
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
let landImg = null;
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json(); const land = topojson.feature(topo, topo.objects.land);
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry]; const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) { if (ring.every(([, la]) => la < -55)) continue; let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } }
  landImg = g.getImageData(0, 0, MW, MH).data;
  const isLand = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return landImg[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 44); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI; const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6'); else if (isLand(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); } else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  // puffs + sound rings at land points
  const pts = []; let tries = 0; while (pts.length < 420 && tries < 20000) { tries++; const lat = R(-50, 65), lon = R(-180, 180); if (isLand(lat, lon)) pts.push([lat, lon]); }
  for (const [lat, lon] of pts) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.position.copy(ll2v(lat, lon, ER * 1.01)); s.scale.setScalar(0.01); globe.add(s); gPuffs.push({ s, lat, lon, ph: rnd() }); }
  for (let i = 0; i < 160; i++) { const [lat, lon] = pts[i]; const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); const n = ll2v(lat, lon, 1).normalize(); r.position.copy(n.clone().multiplyScalar(ER * 1.004)); r.lookAt(n.clone().multiplyScalar(ER * 2)); globe.add(r); gRings.push({ r, ph: rnd() }); }
}
const gPuffs = [], gRings = [];
const gAtm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.07, 64, 48), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uG: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uG; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.2); gl_FragColor=vec4(mix(vec3(0.45,0.7,1.0),vec3(0.75,0.95,0.3),uG),1.0)*f*1.4; }' })); gScene.add(gAtm);
// sweeping green wave: a shell that lights up behind a moving front (the terminator of the "moment")
const gWave = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.012, 96, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uFront: { value: -1.2 }, uA: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uFront, uA; varying vec3 vP; void main(){ float d=dot(vP,normalize(vec3(1.0,0.2,0.6))); float ring=exp(-pow((d-uFront)/0.05,2.0)); float behind=smoothstep(uFront+0.05,uFront-0.1,d)*0.18; gl_FragColor=vec4(vec3(0.75,1.0,0.3)*(ring*1.4+behind)*uA,1.0); }' }));
globe.add(gWave);

// =================== NEW YORK HARBOR (meters) ===================
const ny = new THREE.Scene(); ny.fog = new THREE.Fog('#b8cde0', 600, 5200);
const nyCam = new THREE.PerspectiveCamera(50, W / H, 0.5, 9000);
skyDome(ny, '#4f86c6', '#cfe0ee', 6000);
ny.add(new THREE.HemisphereLight(0xcfe2ff, 0x5a6a60, 1.0));
const nySun = new THREE.DirectionalLight(0xfff0dc, 2.8); nySun.position.set(-300, 420, 260); nySun.castShadow = true; nySun.shadow.mapSize.set(2048, 2048);
Object.assign(nySun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 10, far: 1500 }); ny.add(nySun, nySun.target);
const water = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000, 1, 1), new THREE.MeshStandardMaterial({ color: '#3d6f8e', roughness: 0.25, metalness: 0.1 })); water.rotation.x = -Math.PI / 2; water.receiveShadow = true; ny.add(water);
// Liberty Island: grass + star-ish fort base
const island = new THREE.Group(); ny.add(island);
{ const isl = mesh(new THREE.CylinderGeometry(120, 125, 3, 10), '#6f9a52'); isl.position.y = 1.0; island.add(isl);
  const star = new THREE.Shape(); for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; const r = i % 2 ? 26 : 38; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); } star.closePath();
  const fort = mesh(new THREE.ExtrudeGeometry(star, { depth: 8, bevelEnabled: false }), '#b9b2a2'); fort.rotation.x = -Math.PI / 2; fort.position.y = 2.5; island.add(fort);
  // pedestal (granite) ~ 47 m to the statue's feet
  box(island, 28, 6, 28, '#a9a194', 0, 13.5, 0); box(island, 20, 22, 20, '#bdb5a6', 0, 27.5, 0); box(island, 22, 2.5, 22, '#a9a194', 0, 39.5, 0); box(island, 16, 6, 16, '#bdb5a6', 0, 43.7, 0);
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) box(island, 0.6 + Math.abs(z) * 14, 9, 0.6 + Math.abs(x) * 14, '#9a9284', x * 10.1, 27, z * 10.1);
  // statue (copper patina) ~46 m
  const cu = M('#6fae9a', { flatShading: true, roughness: 0.7 });
  const st = new THREE.Group(); st.position.y = 46.7; island.add(st);
  const robe = mesh(new THREE.CylinderGeometry(4.3, 6.8, 26, 9), cu); robe.position.y = 13; st.add(robe);
  const torso = mesh(new THREE.CylinderGeometry(3.4, 4.3, 8, 9), cu); torso.position.y = 30; st.add(torso);
  const head = mesh(new THREE.SphereGeometry(2.5, 10, 8), cu); head.position.y = 36.8; head.scale.set(1, 1.15, 1); st.add(head);
  for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; const ray = mesh(new THREE.ConeGeometry(0.35, 3.2, 4), cu); ray.position.set(Math.sin(a) * 2.6, 39.2 + Math.cos(a) * 0.4, Math.cos(a) * 1.2); ray.rotation.set(-0.3 + Math.cos(a) * -0.2, 0, -Math.sin(a) * 0.9); st.add(ray); }
  const arm = mesh(new THREE.CylinderGeometry(1.0, 1.3, 13, 7), cu); arm.position.set(3.4, 39, 0.4); arm.rotation.z = -0.12; st.add(arm);
  const torch = mesh(new THREE.CylinderGeometry(1.1, 0.6, 3, 8), cu); torch.position.set(4.3, 46.5, 0.4); st.add(torch);
  const flame = mesh(new THREE.ConeGeometry(1.2, 3.0, 8), M('#e9c46a', { emissive: '#ffb030', emissiveIntensity: 0.8, flatShading: true })); flame.position.set(4.4, 49.4, 0.4); st.add(flame);
  const tab = mesh(BOX, cu); tab.scale.set(1.2, 7, 4.5); tab.position.set(-4.2, 27, 1.2); tab.rotation.z = 0.15; st.add(tab);
}
// Manhattan skyline far away
{ const cols = ['#9aa7b4', '#8b98a6', '#b4bec8', '#7d8a98', '#a6a39a'];
  for (let i = 0; i < 260; i++) { const x = R(-1600, 1400), z = R(-3600, -2500); const h = R(40, 260) * (rnd() < 0.08 ? 1.8 : 1); box(ny, R(30, 70), h, R(30, 70), pick(cols), x, h / 2, z); }
  const one = box(ny, 60, 541, 60, '#a9bccc', 250, 270, -2550); }
// the gas cube: 90.4 m on a side (738,000 m3), translucent, softly boiling
const CUBE_S = 90.4;
const gasMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
  vertexShader: 'uniform float uT; varying vec3 vP; varying vec3 vN; void main(){ vP=position; vec3 p=position+normal*(0.6*sin(position.y*0.18+uT*2.0)*sin(position.x*0.15+uT*1.3)); vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
  fragmentShader: `uniform float uT, uA; varying vec3 vP; varying vec3 vN; void main(){ float n=0.5+0.5*sin(vP.x*0.08+uT)*sin(vP.y*0.07-uT*0.7)*sin(vP.z*0.09+uT*0.4); vec3 c=mix(vec3(0.42,0.66,0.08),vec3(0.70,0.88,0.22),n); float edge=pow(1.0-abs(vN.z),2.0)*0.2; gl_FragColor=vec4(c,(0.5+0.2*n+edge)*uA);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const gasCube = new THREE.Mesh(new THREE.BoxGeometry(CUBE_S, CUBE_S, CUBE_S, 12, 12, 12), gasMat); gasCube.renderOrder = 5; ny.add(gasCube);
const GAS_X = 82, GAS_Z = -30;
const cubeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_S, CUBE_S, CUBE_S)), new THREE.LineBasicMaterial({ color: '#e8ff9a', transparent: true, opacity: 0 })); ny.add(cubeEdges);
// gas streams rising into the cube (puff sprites)
const streams = []; for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); ny.add(s); streams.push({ s, a: R(0, 6.28), r: R(300, 1400), ph: rnd(), y0: R(0, 40) }); }
// a boat for scale
{ const boat = new THREE.Group(); boat.position.set(-60, 0, 120); boat.rotation.y = 0.4; ny.add(boat); box(boat, 36, 4, 9, '#f2f2f0', 0, 2, 0); box(boat, 22, 5, 7, '#e8e4dc', -2, 6.5, 0); box(boat, 22, 0.6, 7.4, '#2b5f8a', -2, 9.2, 0); }
// lighter (finale): a hand-held lighter by the cube base, close to camera
const lighter = new THREE.Group(); ny.add(lighter); lighter.visible = false;
{ box(lighter, 0.022, 0.072, 0.011, M('#c8202a', { roughness: 0.35 }), 0, 0, 0); box(lighter, 0.02, 0.014, 0.011, M('#c0c0c8', { metalness: 0.8, roughness: 0.3 }), 0, 0.043, 0); const wh = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.009, 10), M('#555')); wh.rotation.x = Math.PI / 2; wh.position.set(-0.005, 0.053, 0); lighter.add(wh); }
const lFlame = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 80, 2, 32, 70, 40); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,0.9)'); gr.addColorStop(0.7, 'rgba(255,90,20,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 72, 18, 46, 0, 0, Math.PI * 2); g.fill(); }), transparent: true, depthWrite: false })); lFlame.scale.set(0.022, 0.045, 1); lFlame.material.depthTest = false; lFlame.renderOrder = 12; lighter.add(lFlame); lighter.traverse(o => { if (o.isMesh) o.renderOrder = 11; }); lFlame.position.y = 0.068;

// =================== PASTURE (cow) ===================
const farm = new THREE.Scene(); farm.fog = new THREE.Fog('#cfe2f0', 80, 600);
const farmCam = new THREE.PerspectiveCamera(42, W / H, 0.1, 3000);
skyDome(farm, '#5a93d0', '#dbe9f3', 2500);
farm.add(new THREE.HemisphereLight(0xdbeaff, 0x6a7a40, 1.0)); const farmSun = new THREE.DirectionalLight(0xfff0d8, 2.6); farmSun.position.set(-20, 30, 18); farmSun.castShadow = true; farmSun.shadow.mapSize.set(2048, 2048); Object.assign(farmSun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 100 }); farm.add(farmSun, farmSun.target);
{ const gGeo = new THREE.PlaneGeometry(1200, 1200, 120, 120); gGeo.rotateX(-Math.PI / 2); const p = gGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x * 0.02) * Math.cos(z * 0.017) * 6 * smooth(30, 160, Math.hypot(x, z))); } gGeo.computeVertexNormals();
  const gr = mesh(gGeo, M('#6fa046', { flatShading: true }), false, true); farm.add(gr);
  for (let x = -40; x <= 40; x += 3) { box(farm, 0.15, 1.2, 0.15, '#7a5a3a', x, 0.6, -9); } box(farm, 82, 0.12, 0.08, '#8a6a4a', 0, 1.0, -9); box(farm, 82, 0.12, 0.08, '#8a6a4a', 0, 0.6, -9);
  const barn = new THREE.Group(); barn.position.set(-26, 0, -40); farm.add(barn); box(barn, 14, 8, 10, '#a8322a', 0, 4, 0); for (const sx of [-1, 1]) { const rf = box(barn, 8.4, 0.4, 10.8, '#4a4a50', sx * 3.4, 9.9, 0); rf.rotation.z = -sx * 0.55; }
  for (let i = 0; i < 40; i++) { const tr = new THREE.Group(); const a = R(0, 6.28), r = R(60, 260); tr.position.set(Math.cos(a) * r, 0, -Math.abs(Math.sin(a)) * r - 30); farm.add(tr); const t1 = mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), '#5a4030'); t1.position.y = 1.5; tr.add(t1); const c1 = mesh(new THREE.IcosahedronGeometry(2.6, 0), '#4f8a3a'); c1.position.y = 4.4; tr.add(c1); }
}
function makeCow(spots) {
  const g = new THREE.Group(); const W_ = '#f2f0ea', B_ = '#2a2622';
  box(g, 2.2, 1.1, 0.95, W_, 0, 1.25, 0);
  for (const [x, y, z, s] of spots) box(g, s, s * 0.6, 0.97, B_, x, y, z);
  const head = new THREE.Group(); head.position.set(1.3, 1.6, 0); g.add(head); box(head, 0.7, 0.6, 0.55, W_, 0.2, 0, 0); box(head, 0.32, 0.36, 0.5, '#e9a8a0', 0.62, -0.12, 0); box(head, 0.1, 0.1, 0.05, B_, 0.35, 0.12, 0.28); box(head, 0.1, 0.1, 0.05, B_, 0.35, 0.12, -0.28);
  for (const z of [0.3, -0.3]) { const horn = mesh(new THREE.ConeGeometry(0.06, 0.28, 5), '#e8dcc0'); horn.position.set(0.05, 0.38, z); horn.rotation.x = z > 0 ? -0.4 : 0.4; head.add(horn); box(head, 0.12, 0.22, 0.32, W_, -0.05, 0.16, z * 1.5); }
  for (const [x, z] of [[0.8, 0.32], [0.8, -0.32], [-0.8, 0.32], [-0.8, -0.32]]) box(g, 0.24, 0.8, 0.24, W_, x, 0.4, z);
  box(g, 0.06, 0.7, 0.06, W_, -1.12, 1.2, 0); box(g, 0.5, 0.18, 0.4, '#e9a8a0', 0.1, 0.62, 0);
  g.userData.head = head; return g;
}
const cow = makeCow([[0.3, 1.45, 0, 0.7], [-0.6, 1.1, 0, 0.5], [0.7, 1.0, 0, 0.35]]); farm.add(cow); cow.rotation.y = -0.35;
const herd = []; for (let i = 0; i < 9; i++) { const c = makeCow([[R(-0.6, 0.6), R(1.0, 1.5), 0, R(0.35, 0.7)], [R(-0.8, 0.8), R(1.0, 1.5), 0, R(0.3, 0.5)]]); c.position.set(R(-30, 30), 0, R(-35, -14)); c.rotation.y = R(0, 6.28); farm.add(c); herd.push(c); }
const burps = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); farm.add(s); burps.push({ s, ph: i / 26 }); }
const tailPuff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); farm.add(tailPuff);

// =================== UNDERWATER (herring) ===================
const sea = new THREE.Scene(); sea.background = new THREE.Color('#0d4a66'); sea.fog = new THREE.Fog('#0d4a66', 8, 70);
const seaCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 400);
sea.add(new THREE.HemisphereLight(0x9fe0ff, 0x08202c, 1.3)); const seaSun = new THREE.DirectionalLight(0xc8f0ff, 1.6); seaSun.position.set(4, 30, 6); sea.add(seaSun);
const fishGeo = (() => { const s = new THREE.Shape(); s.moveTo(0.16, 0); s.quadraticCurveTo(0.06, 0.045, -0.08, 0.02); s.lineTo(-0.15, 0.05); s.lineTo(-0.13, 0); s.lineTo(-0.15, -0.05); s.lineTo(-0.08, -0.02); s.quadraticCurveTo(0.06, -0.045, 0.16, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 }); g.translate(0, 0, -0.015); return g; })();
const FISH_N = 420; const fishIM = new THREE.InstancedMesh(fishGeo, new THREE.MeshStandardMaterial({ color: '#b8c8d4', metalness: 0.6, roughness: 0.3, flatShading: true }), FISH_N); fishIM.frustumCulled = false; sea.add(fishIM);
const fishP = []; for (let i = 0; i < FISH_N; i++) fishP.push({ x: R(-6, 6), y: R(-2.2, 2.2), z: R(-6, 3), ph: R(0, 6.28), s: R(0.8, 1.3), bub: rnd() < 0.35 });
const bubIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.012, 1), new THREE.MeshStandardMaterial({ color: '#e8fbff', roughness: 0.1, transparent: true, opacity: 0.85, emissive: '#6fc0e0', emissiveIntensity: 0.3 }), 1600); bubIM.frustumCulled = false; sea.add(bubIM);
const rays = []; for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 40), new THREE.MeshBasicMaterial({ color: '#bfefff', transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.position.set(R(-10, 10), 6, R(-14, -2)); r.rotation.set(0, R(0, 3), 0.25); sea.add(r); rays.push(r); }
{ const sand = mesh(new THREE.PlaneGeometry(200, 200, 40, 40), '#c8b48a', false, true); sand.rotation.x = -Math.PI / 2; sand.position.y = -6; sea.add(sand); }
const D3 = new THREE.Object3D();

// =================== JUNGLE (sloth) ===================
const jungle = new THREE.Scene(); jungle.fog = new THREE.Fog('#9fc49a', 6, 60);
const jCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
skyDome(jungle, '#8fc0a8', '#d8ecd0', 300);
jungle.add(new THREE.HemisphereLight(0xe8ffe0, 0x3a4a2a, 1.1)); const jSun = new THREE.DirectionalLight(0xfff4d8, 2.2); jSun.position.set(-4, 10, 6); jungle.add(jSun);
const branch = mesh(new THREE.CylinderGeometry(0.11, 0.14, 7, 8), '#6b4a32'); branch.rotation.z = Math.PI / 2 - 0.08; branch.position.set(0, 2.4, 0); jungle.add(branch);
for (let i = 0; i < 70; i++) { const l = mesh(new THREE.IcosahedronGeometry(R(0.6, 1.6), 0), pick(['#3f7a3a', '#4f8f40', '#2f6a34', '#5a9a48'])); l.position.set(R(-6, 6), R(2.8, 7), R(-6, -0.8)); jungle.add(l); }
for (let i = 0; i < 14; i++) { const v = mesh(new THREE.CylinderGeometry(0.02, 0.02, R(2, 5), 4), '#3f6a2a'); v.position.set(R(-4, 4), R(2, 4), R(-3, -0.5)); jungle.add(v); }
const sloth = new THREE.Group(); jungle.add(sloth); sloth.position.set(0, 2.4, 0);
{ const fur = M('#8a7458'), face = M('#d8c8a8');
  const body = mesh(new THREE.CapsuleGeometry(0.28, 0.6, 4, 8), fur); body.rotation.z = Math.PI / 2; body.position.y = -0.42; sloth.add(body);
  for (const [x, a] of [[-0.3, 0.1], [0.3, -0.1], [-0.38, 0.05], [0.38, -0.05]]) { const limb = mesh(new THREE.CapsuleGeometry(0.06, 0.38, 3, 6), fur); limb.position.set(x, -0.17, x > 0 ? 0.12 : -0.12); limb.rotation.z = a; sloth.add(limb); }
  const head = mesh(new THREE.SphereGeometry(0.22, 12, 10), fur); head.position.set(0.55, -0.5, 0.12); sloth.add(head);
  const mask = mesh(new THREE.SphereGeometry(0.17, 12, 10), face); mask.scale.set(1, 0.85, 0.5); mask.position.set(0.6, -0.52, 0.27); sloth.add(mask);
  for (const z of [-0.07, 0.07]) { const patch = mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#3a2a1c')); patch.scale.set(1.4, 0.8, 0.4); patch.position.set(0.6 + z, -0.5, 0.33); sloth.add(patch); const eye = mesh(new THREE.SphereGeometry(0.018, 6, 5), M('#0a0a0a')); eye.position.set(0.6 + z, -0.5, 0.36); sloth.add(eye); }
  const nose = mesh(new THREE.SphereGeometry(0.03, 6, 5), M('#2a1a12')); nose.position.set(0.6, -0.57, 0.36); sloth.add(nose);
}
const slothBreath = []; for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); jungle.add(s); slothBreath.push({ s, ph: i / 6 }); }

// =================== SKY (birds) ===================
const birdsS = new THREE.Scene(); birdsS.fog = new THREE.Fog('#d8e8f4', 100, 900);
const bCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 3000);
skyDome(birdsS, '#3f7fc8', '#e6eff6', 2000);
birdsS.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.2));
const cloudTex2 = canvasTex(256, 128, (g, w, h) => { for (let i = 0; i < 24; i++) { const x = R(40, w - 40), y = R(50, h - 30), r = R(18, 42); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex2, transparent: true, depthWrite: false, fog: false })); s.position.set(R(-600, 600), R(-150, 200), R(-900, -200)); const sc = R(160, 380); s.scale.set(sc, sc * 0.45, 1); birdsS.add(s); }
const BIRD_N = 60; const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.14, 0, 0, -0.1, 0.55, 0, -0.05], 3)); wingGeo.computeVertexNormals();
const wingMat = new THREE.MeshStandardMaterial({ color: '#2a2a30', side: THREE.DoubleSide, flatShading: true });
const birds = []; for (let i = 0; i < BIRD_N; i++) { const g = new THREE.Group(); const body = mesh(new THREE.ConeGeometry(0.07, 0.45, 5), '#2a2a30'); body.rotation.x = -Math.PI / 2; g.add(body);
  const wr = new THREE.Mesh(wingGeo, wingMat); const wl = new THREE.Mesh(wingGeo, wingMat); wl.scale.x = -1; g.add(wr, wl); g.scale.setScalar(2.4); birdsS.add(g);
  birds.push({ g, wr, wl, x: R(-14, 14), y: R(-6, 6), z: R(-30, -8), ph: R(0, 6.28) }); }

// =================== CITY BUS (meters; front of the bus at -z, camera at the front looking back at the passengers) ===================
const bus = new THREE.Scene(); bus.background = new THREE.Color('#b9cfe3');
const busFog = new THREE.Fog(new THREE.Color('#d8dccf'), 40, 120); bus.fog = busFog;
const busCam = new THREE.PerspectiveCamera(58, W / H, 0.05, 400);
bus.add(new THREE.HemisphereLight(0xf2f6ff, 0x6a6458, 1.25));
const busSun = new THREE.DirectionalLight(0xfff2dc, 1.4); busSun.position.set(6, 8, 2); bus.add(busSun);
const busIn = new THREE.Group(); bus.add(busIn);
const BL = 12, BW = 2.5, BH = 2.35; const rails = [];
{
  const floorM = M('#4a4f55', { flatShading: false }), wallM = M('#e9e6dc', { flatShading: false }), seatM = M('#2f5d8a', { flatShading: false }), poleM = M('#e0b52a', { metalness: 0.5, roughness: 0.35, flatShading: false });
  box(busIn, BW, 0.1, BL, floorM, 0, -0.05, 0); box(busIn, BW, 0.08, BL, M('#f2f0ea', { flatShading: false }), 0, BH, 0);
  for (let k = 0; k < 5; k++) box(busIn, 0.5, 0.03, 1.2, M('#fffbe8', { emissive: '#fff4d0', emissiveIntensity: 0.8, flatShading: false }), 0, BH - 0.05, -4.8 + k * 2.4);
  for (const sx of [-1, 1]) {
    box(busIn, 0.08, 0.95, BL, wallM, sx * BW / 2, 0.475, 0); box(busIn, 0.08, 0.5, BL, wallM, sx * BW / 2, BH - 0.25, 0);
    for (let z = -BL / 2; z <= BL / 2 + 0.01; z += 1.5) box(busIn, 0.1, 1.0, 0.12, wallM, sx * BW / 2, 1.45, z);
    rails.push(box(busIn, 0.04, 0.04, BL, poleM, sx * 0.55, 1.95, 0));
  }
  box(busIn, BW, BH, 0.1, wallM, 0, BH / 2, BL / 2);
  for (let z = -4.5; z <= 4.6; z += 1.5) { const p = mesh(new THREE.CylinderGeometry(0.02, 0.02, BH, 8), poleM); p.position.set(0.32, BH / 2, z); busIn.add(p); }
  // seats: pairs both sides, facing forward (-z)
  for (let r = 0; r < 11; r++) { const z = -4.2 + r * 0.82; for (const sx of [-1, 1]) for (const k of [0, 1]) { const x = sx * (0.42 + k * 0.42); box(busIn, 0.4, 0.1, 0.42, seatM, x, 0.45, z); box(busIn, 0.4, 0.5, 0.08, seatM, x, 0.72, z + 0.2); } }
}
// glass + the window that opens
const glassM = new THREE.MeshStandardMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1 });
for (const sx of [-1, 1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(BL, 1.0), glassM); g.rotation.y = sx * Math.PI / 2; g.position.set(sx * (BW / 2 + 0.01), 1.45, 0); busIn.add(g); }
const slidePane = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.5), new THREE.MeshStandardMaterial({ color: '#b8d8e8', transparent: true, opacity: 0.5 })); slidePane.rotation.y = Math.PI / 2; slidePane.position.set(BW / 2 - 0.03, 1.7, 1.2); busIn.add(slidePane);
// the street outside (scrolls past)
const street = new THREE.Group(); bus.add(street);
{ const cols = ['#c56d4c', '#d98c69', '#9b4632', '#d9a73c', '#e3cfab', '#a8b8a8', '#8b98a6'];
  for (const sx of [-1, 1]) for (let i = 0; i < 40; i++) { const h = R(10, 40); const b = box(street, R(6, 12), h, R(8, 14), pick(cols), sx * R(9, 14), h / 2 - 0.5, -120 + i * 7); }
  const road = mesh(new THREE.PlaneGeometry(60, 400), M('#55585e', { flatShading: false }), false, true); road.rotation.x = -Math.PI / 2; road.position.y = -0.4; bus.add(road); }
// passengers
const riders = [];
{
  const SK = ['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c', '#6b4329'];
  const TP = ['#e24b3b', '#2f5d8a', '#f2f0ea', '#e0b040', '#4b8b5a', '#1f2a3a', '#7a4a8c', '#f08a4b', '#5aa0c8', '#c8c2b4', '#d46a8a', '#2b2b2e'];
  for (let r = 0; r < 11; r++) for (const sx of [-1, 1]) for (const k of [0, 1]) {
    if (rnd() < 0.18) continue;
    const p = makePerson(rnd, { skin: pick(SK), top: pick(TP) }); busIn.add(p.outer);
    const x = sx * (0.42 + k * 0.42), z = -4.2 + r * 0.82;
    riders.push({ p, x, z, seated: true, ph: R(0, 6.28), look: sx * (k === 0 ? 1 : -1), react: R(0, 1.8) });
  }
  for (let i = 0; i < 4; i++) { const p = makePerson(rnd, { skin: pick(SK), top: pick(TP) }); busIn.add(p.outer); riders.push({ p, x: R(-0.12, 0.2), z: 1.2 + i * 1.2 + R(-0.2, 0.2), seated: false, ph: R(0, 6.28), look: rnd() < 0.5 ? 1 : -1, react: R(0, 1.8) }); }
}
// faces: eyes (+ a mouth line) so the passengers read as looking at you
{ const eyeM = M('#141414'), mouthM = M('#5a2a24');
  for (const r of riders) { for (const ex of [-0.042, 0.042]) { const e = mesh(BOX, eyeM, false, false); e.scale.set(0.026, 0.03, 0.01); e.position.set(ex, 1.665, 0.112); r.p.root.add(e); } const m = mesh(BOX, mouthM, false, false); m.scale.set(0.05, 0.012, 0.01); m.position.set(0, 1.575, 0.106); r.p.root.add(m); r.mouth = m; } }
// the one who held it in (front-centre aisle seat, faces the camera)
const holder = riders.reduce((best, r) => (r.seated && r.x < 0 && Math.abs(r.x) < 0.5 && r.z > -2 && (!best || r.z < best.z)) ? r : best, null);
const busPuffs = riders.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); bus.add(s); return s; });
const haze = []; for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); s.position.set(R(-1.1, 1.1), R(0.3, 2.0), R(-5, 5.5)); bus.add(s); haze.push({ s, ph: rnd() }); }
const mouthPuff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); bus.add(mouthPuff);

// =================== PLANE (cut-away cabin) ===================
const plane = new THREE.Scene(); plane.fog = new THREE.Fog('#cfe2f2', 220, 1600);
const planeCam = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000);
skyDome(plane, '#2f6fbf', '#d9e8f4', 2500);
plane.add(new THREE.HemisphereLight(0xffffff, 0x9fb0c0, 1.3)); const plSun = new THREE.DirectionalLight(0xfff6e8, 1.8); plSun.position.set(-10, 20, 20); plane.add(plSun);
const cloudsBelow = []; for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex2, transparent: true, depthWrite: false })); s.position.set(R(-300, 300), R(-60, -25), R(-300, 80)); const sc = R(60, 140); s.scale.set(sc, sc * 0.4, 1); plane.add(s); cloudsBelow.push(s); }
const aircraft = new THREE.Group(); plane.add(aircraft);
const CUTP = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0);   // cut away the half facing the camera (z>0)
const skinM = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: [CUTP], flatShading: true });
{
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 30, 28, 1, true), skinM); fus.rotation.z = Math.PI / 2; aircraft.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.0, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skinM); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1.8, 1); nose.position.x = 15; aircraft.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(2.0, 7, 28, 1, true), skinM); tail.rotation.z = Math.PI / 2; tail.position.x = -18.5; aircraft.add(tail);
  const fin = box(aircraft, 4, 5, 0.3, M('#2b5f8a'), -19, 3.5, 0); fin.rotation.z = 0.35;
  const wingM = M('#dfe3e8'); const w1 = box(aircraft, 8, 0.4, 26, wingM, 1, -1.2, -13); w1.rotation.y = -0.35;
  box(aircraft, 0.3, 0.3, 30, M('#2b5f8a'), 0, -0.2, 2.02);
  const cabinFloor = box(aircraft, 28, 0.12, 3.6, M('#5a6470'), 0, -0.9, 0);
}
const planeSeatM = new THREE.MeshStandardMaterial({ color: '#2f5d8a', roughness: 0.8, flatShading: true });
const planeRiders = [];
{
  const SK = ['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c'];
  const TP = ['#e24b3b', '#2f5d8a', '#f2f0ea', '#e0b040', '#4b8b5a', '#7a4a8c', '#f08a4b', '#5aa0c8'];
  for (let r = 0; r < 22; r++) { const x = 12 - r * 1.05; for (const z of [-1.35, -0.85, -0.35, 0.45, 0.95]) {
    const s = mesh(BOX, planeSeatM); s.scale.set(0.5, 0.12, 0.45); s.position.set(x, -0.55, z); aircraft.add(s); const b = mesh(BOX, planeSeatM); b.scale.set(0.12, 0.75, 0.45); b.position.set(x - 0.22, -0.2, z); aircraft.add(b);
    const body = mesh(new THREE.CapsuleGeometry(0.17, 0.35, 3, 7), pick(TP)); body.position.set(x + 0.02, -0.15, z); aircraft.add(body);
    const head = mesh(new THREE.SphereGeometry(0.12, 8, 6), pick(SK)); head.position.set(x + 0.04, 0.25, z); aircraft.add(head);
    planeRiders.push({ x, z, head, ph: rnd() }); } }
}
const planePuffs = planeRiders.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); aircraft.add(s); return s; });
const V1_GLOBE = 3.0, V1_NYC = 8.0, V1_WEIGH = 15.0, V1_SOUND = 21.0, V1_COW = 27.0, V1_FISH = 34.0, V1_SLOTH = 40.0, V1_BIRDS = 47.0, V1_LIGHT = 51.0, V1_T_END = 58.5;
// =================== updates ===================
const WAVE_DIR = new THREE.Vector3(1.0, 0.2, 0.6).normalize();
function globeAt(t) {
  const sound = t >= V1_SOUND;
  globe.rotation.y = sound ? 1.2 + (t - V1_SOUND) * 0.05 : -0.6 + t * 0.06;
  const d = sound ? 66 : lerp(80, 70, smooth(0, V1_NYC, t));
  gCam.position.set(sound ? 12 : 0, sound ? 22 : 6, d); gCam.lookAt(0, 0, 0); gCam.updateProjectionMatrix();
  // the moment: a front sweeps the planet
  const front = lerp(-1.25, 1.25, smooth(3.4, 6.6, t)); gWave.material.uniforms.uFront.value = front; gWave.material.uniforms.uA.value = sound ? 0 : smooth(3.2, 3.6, t) * (1 - smooth(7.0, 8.0, t));
  gAtm.material.uniforms.uG.value = sound ? 0.25 : smooth(4.5, 7.5, t) * 0.7;
  const inv = globe.matrixWorld.clone().invert(); globe.updateMatrixWorld();
  for (const p of gPuffs) {
    const n = p.s.position.clone().normalize(); const dw = n.dot(WAVE_DIR);
    const age = sound ? -1 : (front - dw) * 2.2;   // seconds-ish after the front passes
    const on = age > 0 && age < 3; p.s.material.opacity = on ? Math.min(1, age * 4) * (1 - smooth(1.6, 3, age)) : 0;
    p.s.scale.setScalar(on ? (0.25 + 0.9 * Math.min(age, 1.2)) * (0.7 + 0.6 * p.ph) : 0.01);
    p.s.position.copy(n.multiplyScalar(ER * (1.01 + (on ? age * 0.04 : 0))));
  }
  for (const r of gRings) { const u = sound ? ((t - V1_SOUND) * 0.7 + r.ph) % 1 : -1; r.r.material.opacity = u > 0 ? 0.8 * (1 - u) : 0; r.r.scale.setScalar(u > 0 ? 0.05 + u * 0.35 : 0.01); }
}
function nyAt(t) {
  const fin = t >= V1_LIGHT;
  const grow = ease((t - (V1_NYC + 0.6)) / 4.6);
  gasCube.scale.set(lerp(0.2, 1, grow), Math.max(grow, 0.001), lerp(0.2, 1, grow));
  gasCube.position.set(GAS_X, CUBE_S / 2 * grow, GAS_Z); cubeEdges.position.copy(gasCube.position); cubeEdges.scale.copy(gasCube.scale);
  gasMat.uniforms.uT.value = t; gasMat.uniforms.uA.value = smooth(V1_NYC + 0.4, V1_NYC + 1.4, t); cubeEdges.material.opacity = 0.55 * smooth(V1_NYC + 4.5, V1_NYC + 6, t);
  streams.forEach(o => { const u = ((t - V1_NYC) * 0.35 + o.ph) % 1; const on = t > V1_NYC + 0.3 && t < V1_NYC + 6.5 && !fin; const r = o.r * (1 - u); const a = o.a + u * 2.5;
    o.s.position.set(GAS_X + Math.cos(a) * r, o.y0 + 20 + u * 40, GAS_Z + Math.sin(a) * r); o.s.scale.setScalar(18 + 30 * u); o.s.material.opacity = on ? 0.8 * Math.sin(u * Math.PI) : 0; });
  let pos, look, fov = 50;
  if (t < V1_WEIGH) { const u = ease((t - V1_NYC) / (V1_WEIGH - V1_NYC)); pos = new THREE.Vector3(lerp(10, 40, u), lerp(24, 40, u), lerp(400, 440, u)); look = new THREE.Vector3(lerp(30, 42, u), lerp(52, 48, u), lerp(-10, -15, u)); fov = 48; }
  else if (!fin) { const u = (t - V1_WEIGH) / (V1_SOUND - V1_WEIGH); const a = lerp(-0.55, -0.25, u); pos = new THREE.Vector3(40 + Math.sin(a) * 470, 60, -15 + Math.cos(a) * 470); look = new THREE.Vector3(40, 48, -15); fov = 40; }
  else { // the lighter, then pull back
    const u = (t - V1_LIGHT) / (V1_T_END - V1_LIGHT); const base = new THREE.Vector3(GAS_X - 30, 3.2, GAS_Z + 95);
    const back = ease((t - (V1_LIGHT + 4.2)) / 3.2);
    pos = base.clone().lerp(new THREE.Vector3(GAS_X - 230, 70, GAS_Z + 430), back); look = new THREE.Vector3(GAS_X, lerp(35, 45, back), GAS_Z); fov = lerp(55, 46, back);
    lighter.visible = back < 0.2; const dir = look.clone().sub(pos).normalize(); const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    lighter.position.copy(pos).addScaledVector(dir, 0.36).addScaledVector(right, 0.07).add(new THREE.Vector3(0, -0.085, 0)); lighter.quaternion.copy(nyCam.quaternion);
    const lit = t > V1_LIGHT + 1.6; lFlame.visible = lit; lFlame.scale.set(0.022 * (1 + 0.15 * Math.sin(t * 31)), 0.045 * (1 + 0.2 * Math.sin(t * 23)), 1);
  }
  if (!fin) lighter.visible = false;
  nyCam.fov = fov; nyCam.near = fin && t < V1_LIGHT + 4.6 ? 0.02 : 0.5; nyCam.updateProjectionMatrix(); nyCam.position.copy(pos); nyCam.lookAt(look);
  nySun.position.copy(look).add(new THREE.Vector3(-300, 420, 260)); nySun.target.position.copy(look); nySun.target.updateMatrixWorld();
}
function farmAt(t) {
  const u = (t - V1_COW) / (V1_FISH - V1_COW);
  farmCam.position.set(lerp(4.6, 4.0, u), lerp(1.9, 1.7, u), lerp(5.6, 4.9, u)); farmCam.lookAt(0.3, 1.25, 0); farmCam.fov = 42; farmCam.updateProjectionMatrix();
  const head = cow.userData.head; head.rotation.z = -0.15 + 0.08 * Math.sin(t * 1.5) + (t > V1_COW + 2.6 && t < V1_COW + 4.2 ? 0.25 * Math.sin((t - V1_COW - 2.6) / 1.6 * Math.PI) : 0);
  herd.forEach((c, i) => { c.userData.head.rotation.z = -0.5 + 0.1 * Math.sin(t + i); });
  // tiny "pfft" at the back first, then the real thing comes out the front
  const tp = t - (V1_COW + 1.0); tailPuff.material.opacity = tp > 0 && tp < 1.2 ? 0.5 * (1 - tp / 1.2) : 0; tailPuff.scale.setScalar(0.2 + tp * 0.4); tailPuff.position.set(-1.25 - tp * 0.3, 1.3, 0).applyMatrix4(cow.matrixWorld);
  const hp = new THREE.Vector3(0.95, -0.1, 0).applyMatrix4(cow.userData.head.matrixWorld);
  burps.forEach(o => { const a = t - (V1_COW + 2.7) - o.ph * 1.4; const on = a > 0 && a < 2.6; o.s.material.opacity = on ? 0.85 * Math.min(1, a * 5) * (1 - a / 2.6) : 0; o.s.scale.setScalar(0.4 + a * 0.9);
    o.s.position.copy(hp).add(new THREE.Vector3(0.6 * a + 0.1 * Math.sin(o.ph * 20), 0.25 * a + 0.1 * Math.cos(o.ph * 13), 0.35 * a * Math.sin(o.ph * 9))); });
  cow.updateMatrixWorld(true);
}
function seaAt(t) {
  const u = (t - V1_FISH) / (V1_SLOTH - V1_FISH);
  seaCam.position.set(Math.sin(u * 0.6) * 1.2, lerp(-0.2, 0.3, u), lerp(5.6, 4.4, u)); seaCam.lookAt(0, 0, -1.5); seaCam.updateProjectionMatrix();
  let bi = 0;
  fishP.forEach((f, i) => { const a = f.ph + t * 0.35 * f.s; const r = 3.2 + 0.6 * Math.sin(f.ph * 3);
    const x = Math.cos(a) * r * 1.4 + f.x * 0.25, z = Math.sin(a) * r - 2.5 + f.z * 0.2, y = f.y + 0.2 * Math.sin(t * 1.3 + f.ph);
    D3.position.set(x, y, z); D3.rotation.set(0, -a - Math.PI / 2 + 0.15 * Math.sin(t * 9 + f.ph), 0); D3.scale.setScalar(f.s); D3.updateMatrix(); fishIM.setMatrixAt(i, D3.matrix);
    if (f.bub) for (let k = 0; k < 4 && bi < 1600; k++) { const age = ((t * 0.7 + f.ph + k * 0.25) % 1); const burst = Math.sin(t * 2.0 + f.ph * 7) > 0.4;
      D3.position.set(x - Math.cos(a + Math.PI / 2) * 0.12, y + age * 1.6, z - Math.sin(a + Math.PI / 2) * 0.12); D3.rotation.set(0, 0, 0); D3.scale.setScalar(burst ? 0.6 + age : 0.001); D3.updateMatrix(); bubIM.setMatrixAt(bi++, D3.matrix); } });
  for (; bi < 1600; bi++) { D3.position.set(0, -99, 0); D3.scale.setScalar(0); D3.updateMatrix(); bubIM.setMatrixAt(bi, D3.matrix); }
  fishIM.instanceMatrix.needsUpdate = true; bubIM.instanceMatrix.needsUpdate = true;
  rays.forEach((r, i) => { r.material.opacity = 0.05 + 0.03 * Math.sin(t * 0.8 + i); });
}
function jungleAt(t) {
  const u = (t - V1_SLOTH) / (V1_BIRDS - V1_SLOTH);
  jCam.position.set(lerp(2.4, 2.0, u), lerp(1.8, 1.9, u), lerp(4.2, 3.5, u)); jCam.lookAt(0.2, 1.85, 0); jCam.updateProjectionMatrix();
  sloth.rotation.x = 0.05 * Math.sin(t * 0.6); sloth.position.x = 0.02 * Math.sin(t * 0.4);
  const nose = new THREE.Vector3(0.62, -0.57, 0.4).applyMatrix4(sloth.matrixWorld);
  slothBreath.forEach(o => { const a = ((t - V1_SLOTH) * 0.45 + o.ph) % 1; const on = t > V1_SLOTH + 2.4; o.s.material.opacity = on ? 0.35 * Math.sin(a * Math.PI) : 0; o.s.scale.setScalar(0.06 + a * 0.22); o.s.position.copy(nose).add(new THREE.Vector3(0.08 * a, -0.05 * a, 0.25 * a)); });
  sloth.updateMatrixWorld(true);
}
function birdsAt(t) {
  const u = (t - V1_BIRDS) / (V1_LIGHT - V1_BIRDS);
  bCam.position.set(0, 0, 4); bCam.lookAt(0, 0.6, -10); bCam.updateProjectionMatrix();
  birds.forEach(b => { const x = b.x + lerp(-30, 30, u) + 4 * Math.sin(b.ph); b.g.position.set(x, b.y + 0.3 * Math.sin(t * 2 + b.ph), b.z); b.g.rotation.set(0, -Math.PI / 2, 0); const f = 0.7 * Math.sin(t * 9 + b.ph); b.wr.rotation.z = f; b.wl.rotation.z = -f; });
}


// =================== bus ===================
function busAt(t) {
  const hold = t >= HOLD;
  rails.forEach(r => { r.visible = !hold; });
  street.position.z = ((t * 6) % 7);                                     // driving
  busIn.position.y = 0.012 * Math.sin(t * 13) + 0.008 * Math.sin(t * 7.3) + (t > POP && t < POP + 0.4 ? 0.03 * Math.sin((t - POP) * 40) : 0);
  for (const [i, r] of riders.entries()) {
    const o = r.p.outer; o.visible = true; const y0 = r.seated ? 0.52 + 0.95 - 0.96 * r.p.h + 0.08 : 0.95;
    o.position.set(r.x, y0, r.z); o.rotation.set(0, Math.PI, 0);
    if (r.seated) poseSit(r.p); else { poseIdle(r.p, t, r.ph); r.p.arms[0].rotation.set(-2.9, 0, 0.1); r.p.elbows[0].rotation.x = -0.2; }
    if (!hold) {
      // awkward glances after the moment
      const g = t - (AWK - 0.6 + r.react * 0.6);
      if (g > 0) o.rotation.y = Math.PI + r.look * 0.75 * Math.max(0, Math.sin(Math.min(g, 2.2) / 2.2 * Math.PI)) + 0.15 * Math.sin(t * 0.8 + r.ph) * smooth(0, 0.5, g);
      // smell: hand to the nose, staggered
      const s = smooth(SMELL + 0.6 + r.react * 1.2, SMELL + 1.2 + r.react * 1.2, t);
      if (s > 0) { r.p.arms[1].rotation.set(lerp(r.p.arms[1].rotation.x, -2.25, s), 0, lerp(0, 0.35, s)); r.p.elbows[1].rotation.x = lerp(r.p.elbows[1].rotation.x, -2.1, s); }
    } else {
      o.rotation.y = Math.PI + 0.1 * Math.sin(t * 0.6 + r.ph);
      if (holder && r !== holder) o.visible = !(Math.abs(r.x - holder.x) < 0.6 && r.z < holder.z && r.z > holder.z - 2.0);
      if (r === holder) { if (r.mouth) r.mouth.scale.set(0.05 * (t < HOLD + 5.4 ? 0.6 : 1.4), t < HOLD + 5.4 ? 0.008 : 0.03, 0.01); o.rotation.y = Math.PI; poseSit(r.p); r.p.arms[0].rotation.x = -0.15; r.p.arms[1].rotation.x = -0.15; r.p.elbows[0].rotation.x = -0.05; r.p.elbows[1].rotation.x = -0.05; o.position.y += 0.02 * Math.sin(t * 20) * smooth(HOLD + 1, HOLD + 4.5, t) * (t < HOLD + 5.3 ? 1 : 0); }
    }
    // the puff under each rider
    const pa = t - POP - (i % 7) * 0.035; const on = !hold && pa > 0 && pa < 2.5; const sp = busPuffs[i];
    sp.material.opacity = on ? 0.75 * Math.min(1, pa * 6) * (1 - smooth(0.8, 2.5, pa)) : 0; sp.scale.setScalar(0.25 + 0.6 * Math.min(pa, 1.2));
    sp.position.set(r.x + (r.seated ? 0 : 0), r.seated ? 0.45 + 0.25 * pa : 0.85 + 0.2 * pa, r.z + (r.seated ? -0.22 : -0.15) - 0.15 * pa);
  }
  // haze builds up, then the window opens
  const hz = !hold ? smooth(POP + 1.5, SMELL + 3.5, t) : 0;
  haze.forEach(h => { h.s.material.opacity = hz * (0.28 + 0.12 * Math.sin(t * 0.7 + h.ph * 6)); h.s.scale.setScalar(1.6 + 0.6 * Math.sin(h.ph * 9 + t * 0.3)); h.s.position.x += 0; });
  busFog.color.set('#d8dccf').lerp(new THREE.Color('#bcd27a'), hz * 0.85); busFog.near = lerp(40, 1.5, hz); busFog.far = lerp(120, 14, hz);
  slidePane.position.z = 1.2 - 0.9 * smooth(SMELL + 2.5, SMELL + 3.4, t) * (hold ? 0 : 1);
  // the one who held it: breathe out
  const ex = t - (HOLD + 5.4); mouthPuff.material.opacity = ex > 0 && ex < 2.4 ? 0.9 * Math.min(1, ex * 5) * (1 - smooth(1.2, 2.4, ex)) : 0;
  if (holder) { const hp = new THREE.Vector3(0, 0.66, 0.22); holder.p.root.updateMatrixWorld(true); const head = holder.p.root.localToWorld(new THREE.Vector3(0, 1.575, 0.12)); const e2 = Math.max(ex, 0); mouthPuff.position.copy(head).add(new THREE.Vector3(0.12 * e2, 0.04 * e2, -0.4 * e2)); mouthPuff.scale.setScalar(0.08 + 0.32 * Math.max(0, Math.min(ex, 1.5))); }
  // camera: at the front, looking down the aisle; the hold shot pushes in on one face
  if (!hold) { const u = smooth(0, SMELL + 5, t); busCam.position.set(lerp(0.05, -0.15, u), lerp(1.62, 1.55, u), -5.6 + 0.4 * u); busCam.lookAt(0.05, 1.05, 3.0); busCam.fov = 58; }
  else { const k = ease((t - HOLD) / 5.0); const hz2 = holder ? holder.p.root.localToWorld(new THREE.Vector3(0, 1.6, 0)) : new THREE.Vector3(0, 1.3, 0); busCam.position.set(lerp(-0.1, hz2.x + 0.05, k), lerp(1.6, hz2.y + 0.02, k), lerp(-5.4, hz2.z - 1.6, k)); busCam.lookAt(hz2.x, hz2.y - 0.12 * (1 - k), hz2.z); busCam.fov = lerp(58, 40, k); }
  busCam.updateProjectionMatrix();
}
// =================== plane ===================
function planeAt(t) {
  const u = (t - PLANE) / (EARTH - PLANE);
  aircraft.position.set(0, 0.25 * Math.sin(t * 0.9), 0); aircraft.rotation.set(0.02 * Math.sin(t * 0.7), 0.0, 0.32 + 0.01 * Math.sin(t * 0.5));
  cloudsBelow.forEach(c => { c.position.x -= 0; });
  const k = ease(clamp((u - 0.12) * 1.6, 0, 1));
  planeCam.position.set(lerp(-4, 2.6, k), lerp(-8, 1.4, k), lerp(78, 8.0, k)); planeCam.lookAt(lerp(-1, 2.6, k), lerp(-1, 0.6, k), 0); planeCam.fov = lerp(44, 40, k); planeCam.updateProjectionMatrix();
  planeRiders.forEach((r, i) => { const pa = t - (PLANE + 2.2) - (i % 9) * 0.04; const on = pa > 0 && pa < 2.8; const s = planePuffs[i];
    s.material.opacity = on ? 0.8 * Math.min(1, pa * 6) * (1 - smooth(1.0, 2.8, pa)) : 0; s.scale.setScalar(0.3 + 0.5 * Math.min(pa, 1.2)); s.position.set(r.x + 0.1, -0.45 + 0.3 * pa, r.z); });
  const ch = smooth(PLANE + 4.4, PLANE + 5.2, t); planeSeatM.color.set('#2f5d8a').lerp(new THREE.Color('#2a2a2c'), ch);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [3.2, 5.9, '50 people. One bus.<br>One second.'],
  [6.2, 9.8, 'Nobody makes<br>eye contact.'],
  [10.2, 12.4, 'Will you smell it?<br>Oh yes.'],
  [12.6, 14.8, 'Your nose catches rotten-egg<br>gas at under a billionth.'],
  [15.3, 18.6, 'Worst seat: a plane.<br>Up there, your gut makes more gas.'],
  [18.8, 21.8, 'Doctors actually suggested<br>charcoal seat cushions.'],
  [22.3, 26.8, 'Now everyone on Earth.<br>The same second.'],
  [27.3, 29.0, 'Cows? Hold on…'],
  [29.2, 31.8, 'About 95% of their methane<br>comes out the front.'],
  [32.3, 35.8, 'Herring fart to<br>talk to each other.'],
  [36.3, 39.8, "Sloths can't fart<br>at all."],
  [40.3, 43.6, 'All of it together:<br>a cube of gas…'],
  [43.8, 46.8, '…as tall as the<br>Statue of Liberty.'],
  [47.3, 49.8, 'Can you light it?'],
  [50.0, 52.8, 'Nope. In the open air,<br>it’s less than a trillionth.'],
  [53.3, 55.8, 'And if you hold<br>it in?'],
  [56.0, 58.2, "It doesn't disappear."],
  [58.4, 60.9, 'Some seeps into your blood…<br>and you breathe it out.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < POP) { lab = 'EVERYONE, ON'; val = String(3 - Math.floor(t)); sub = 'THE SAME SECOND'; show = smooth(0.15, 0.5, t); }
  else if (t < SMELL) { lab = 'GAS IN THIS BUS'; val = (Math.min(1, (t - POP) / 1.2) * 4.5).toFixed(1) + ' L'; sub = '50 PEOPLE × ~90 ML'; }
  else if (t < PLANE) { lab = 'YOUR NOSE DETECTS'; val = '< 1 ppb'; sub = 'ROTTEN-EGG GAS (H₂S)'; }
  else if (t < EARTH) { stat = '<b></b>NZ MEDICAL JOURNAL, 2013'; lab = 'AT 35,000 FT'; val = 'More gas'; sub = t < PLANE + 4.4 ? 'LOWER CABIN PRESSURE' : 'FIX: CHARCOAL CUSHIONS'; }
  else if (t < COW) { lab = 'PEOPLE'; val = '8.2 billion'; sub = 'ONE SECOND'; }
  else if (t < FISH) { lab = 'COW METHANE'; val = t < 29.2 ? '…' : '~95%'; sub = t < 29.2 ? 'WAIT FOR IT' : 'COMES OUT AS BURPS'; }
  else if (t < SLOTH) { lab = 'HERRING'; val = 'FRT'; sub = '"FAST REPETITIVE TICK"'; }
  else if (t < CUBE) { lab = 'SLOTH FARTS'; val = '0'; sub = 'THEY BREATHE IT OUT INSTEAD'; }
  else if (t < LIGHT) { const k = ease((t - (CUBE + 0.6)) / 3.8); lab = 'ALL OF EARTH'; val = (Math.round(26 * k * 10) / 10).toFixed(1) + 'M cu ft'; sub = t < CUBE + 4.5 ? '≈ 738,000 M³' : '≈ 1,000 TONS'; }
  else if (t < HOLD) { lab = 'SHARE OF THE AIR'; val = '< 1 ppt'; sub = 'LESS THAN ONE TRILLIONTH'; }
  else { lab = 'HELD IN'; val = 'Breathed out'; sub = "IT'S HOW HYDROGEN BREATH TESTS WORK"; show = smooth(HOLD + 2.5, HOLD + 3.2, t); }
  return { stat, lab, val, sub, show };
}
function proj(v, camera) { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (1 - (p.y * 0.5 + 0.5)) * H, p.z]; }
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(POP - 0.3, POP, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const cuts = [PLANE, EARTH, COW, FISH, SLOTH, CUBE, HOLD].map(x => fadeWin(t, x - 0.22, x + 0.22, 0.2));
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(...cuts) * 0.9;
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  let L = '';
  if (t >= CUBE + 3.6 && t < LIGHT) {
    const op = smooth(CUBE + 3.6, CUBE + 4.4, t) * (1 - smooth(LIGHT - 0.4, LIGHT, t));
    const a = proj(new THREE.Vector3(4, 99, 0), nyCam), b = proj(new THREE.Vector3(GAS_X, CUBE_S + 6, GAS_Z), nyCam);
    if (a[2] < 1) L += `<div class="lbl" style="left:${a[0].toFixed(0)}px;top:${a[1].toFixed(0)}px;opacity:${op}">STATUE OF LIBERTY<br><span class="big">305 ft</span></div>`;
    if (b[2] < 1) L += `<div class="lbl gas" style="left:${b[0].toFixed(0)}px;top:${b[1].toFixed(0)}px;opacity:${op}">EVERYONE'S GAS<br><span class="big">297 ft</span></div>`;
  }
  el.labels.innerHTML = L;
}
// re-timed views of the shared scenes (they were written for the v1 timeline: remap t)
const remap = (t, from, to) => to + (t - from);
function render2(t) {
  renderer.setRenderTarget(null); renderer.clear();
  if (t < PLANE || t >= HOLD) { busAt(t); renderer.render(bus, busCam); }
  else if (t < EARTH) { planeAt(t); renderer.render(plane, planeCam); }
  else if (t < COW) { globeAt(remap(t, EARTH, 2.3)); renderer.render(gScene, gCam); }
  else if (t < FISH) { farmAt(remap(t, COW, 26.6)); renderer.render(farm, farmCam); }
  else if (t < SLOTH) { seaAt(remap(t, FISH, 34.0)); renderer.render(sea, seaCam); }
  else if (t < CUBE) { jungleAt(remap(t, SLOTH, 40.0)); renderer.render(jungle, jCam); }
  else if (t < LIGHT) { nyAt(remap(t, CUBE, 8.0)); renderer.render(ny, nyCam); }
  else { nyAt(remap(t, LIGHT, 51.0)); renderer.render(ny, nyCam); }
}
window.renderAt = (t) => {
  if (t >= CUBE && t < LIGHT) nyAt(remap(t, CUBE, 8.0));
  updateDOM(t);
  if (window.PASS === 'text') return true;
  render2(t);
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe()]).then(() => { window.renderAt(0); return true; });
