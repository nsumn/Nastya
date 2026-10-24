import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you could REALLY touch someone?" — remake for @wowwwwhatif with all-new scenes: a man's and a woman's fingers interlacing in a café at golden hour,
// a scope that zooms into the contact (1 mm -> 0.1 nm), atoms with buzzing electrons pushing back, a hammock, an airport hug, the electron push dialled to 0%,
// sinking through the floor and the ground, Earth collapsing to a ball next to the Empire State Building, you squeezed to the size of a blood cell.
// Physics: touch = electromagnetic repulsion of electron clouds; gap ~1 angstrom = 1e-8 cm; at nuclear density Earth = 367 m (1,205 ft), a 70 kg person = 8.3 um (tools/collapse_math.py).
// =================== timeline ===================
const LENS = 4.0, ATOM = 8.0, LAT0 = 11.4, HAM = 15.0, HUG = 22.0, OFF = 28.0, SINK = 31.0, EARTH = 37.0, ESB = 43.0, CELL = 49.0, ENDS = 56.0, T_END = 64.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 707;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uCirc: { value: new THREE.Vector3(0.5, 0.5, 0) }, uCircOn: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uCircOn; uniform vec3 uCirc;
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA); vec3 c=a; float m=uMix, ring=0.0;
      // scope reveal: scene B shows inside a growing circle with a thin glowing rim
      if(uCircOn>0.5){ float r=length((vUv-uCirc.xy)*vec2(1.0,1.7778)); m=1.0-smoothstep(uCirc.z-0.003,uCirc.z+0.003,r); ring=exp(-pow((r-uCirc.z)/0.005,2.0))*step(0.001,uCirc.z); }
      if(m>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB); c=mix(a,b,m); } c+=vec3(0.75,0.9,1.0)*ring*0.9;
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      gl_FragColor=vec4(srgb(c),1.0); }` });
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
// =================== smoke (cold-gas plumes): one Points cloud per scene, rebuilt every frame from emitters ===================
const smokeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uScale: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `attribute float aSize; attribute float aA; uniform float uScale; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(aSize*uScale/(-mv.z), 700.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uTint; varying float vA; void main(){ vec2 q=gl_PointCoord-0.5; float d=dot(q,q)*4.0; float a=exp(-d*3.0)*vA; if(a<0.01) discard; gl_FragColor=vec4(uTint*(0.9+0.1*(1.0-d)),a); }` });
function makeSmoke(scene, n) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3), sz = new Float32Array(n), al = new Float32Array(n);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(al, 1));
  const pts = new THREE.Points(geo, smokeMat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  let k = 0;
  return { begin() { k = 0; }, add(p, size, a) { if (k >= n) return; pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; sz[k] = size; al[k] = a; k++; },
    end() { for (let i = k; i < n; i++) al[i] = 0; geo.attributes.position.needsUpdate = true; geo.attributes.aSize.needsUpdate = true; geo.attributes.aA.needsUpdate = true; geo.setDrawRange(0, Math.max(1, k)); } };
}
// =================== the couple: same look in every scene (own seeds so height/hair never change) ===================
function makeHer() { const sv = seed; seed = 5151; const p = makePerson(rnd, { top: '#e86a9a', bottom: '#34385a', hair: '#7a4a22', skin: '#f1d2b6', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.85 }); seed = sv; return p; }
function makeHim() { const sv = seed; seed = 6262; const p = makePerson(rnd, { top: '#2a3a6a', bottom: '#5a4632', hair: '#1a1a1a', skin: '#b98260', shoe: '#1b1b1b', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.3 }); seed = sv; return p; }
// =================== CAFÉ HANDS (meters, close-up): his and her fingers interlace at golden hour; at the end the same hands at sunset with the glowing gap ===================
const cafe = new THREE.Scene(); const cfCam = new THREE.PerspectiveCamera(38, W / H, 0.01, 50);
const cfHemi = new THREE.HemisphereLight(0xfff0e0, 0x5a4038, 0.8); cafe.add(cfHemi);
const cfKey = new THREE.DirectionalLight(0xffc890, 2.6); cfKey.position.set(-1.5, 1.2, 1.0); cfKey.castShadow = true; cfKey.shadow.mapSize.set(2048, 2048); cfKey.shadow.bias = -0.0002; Object.assign(cfKey.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 6 }); cafe.add(cfKey);
const cfRim = new THREE.DirectionalLight(0xffa070, 1.4); cfRim.position.set(1.2, 0.6, -1.4); cafe.add(cfRim);
const cfFill = new THREE.PointLight(0xffe0c8, 0.6, 3, 1.5); cfFill.position.set(0.4, 0.2, 0.6); cafe.add(cfFill);
// soft bokeh backdrop (café window + string lights), drawn once; tinted per mode
const bokehTex = canvasTex(1024, 1820, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f0b070'); gr.addColorStop(0.55, '#c8784a'); gr.addColorStop(1, '#4a2a22'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { const x = rnd() * w, y = rnd() * h * 0.75, r = R(30, 110); const rg = g.createRadialGradient(x, y, 0, x, y, r); const c = pick(['255,230,180', '255,200,140', '255,170,120', '255,245,220', '200,220,255']);
    rg.addColorStop(0, `rgba(${c},0.55)`); rg.addColorStop(0.7, `rgba(${c},0.35)`); rg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
const cfBack = new THREE.Mesh(new THREE.SphereGeometry(4, 48, 24, 0, Math.PI * 2, 0.25, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: bokehTex, color: new THREE.Color(1, 1, 1), side: THREE.BackSide, fog: false })); cfBack.rotation.y = 0.6; cafe.add(cfBack);
{ const wood = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7a4a2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${pick(['40,20,10', '140,90,60'])},0.25)`; g.lineWidth = R(1, 4); g.beginPath(); g.moveTo(0, rnd() * h); g.bezierCurveTo(w * 0.3, rnd() * h, w * 0.7, rnd() * h, w, rnd() * h); g.stroke(); } }, [2, 2]);
  const tb = mesh(new THREE.CircleGeometry(0.9, 40), M('#ffffff', { map: wood, roughness: 0.35 }), false, true); tb.rotation.x = -Math.PI / 2; tb.position.y = -0.22; cafe.add(tb);
  const cup = mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.09, 20), M('#f4f0e8', { roughness: 0.3 })); cup.position.set(0.16, -0.175, -0.12); cafe.add(cup); const cf = mesh(new THREE.CircleGeometry(0.036, 20), M('#5a3420')); cf.rotation.x = -Math.PI / 2; cf.position.set(0.16, -0.132, -0.12); cafe.add(cf); }
// a stylised hand: forearm sleeve + cuff, palm, 4 three-joint fingers, 2-joint thumb. Wrist at the origin, fingers along +y, palm faces +z
function makeHand(skin, sleeve, cuff) { const g = new THREE.Group(), S = M(skin, { roughness: 0.6 }), SL = M(sleeve, { roughness: 0.8 });
  const arm = mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.34, 18), SL); arm.position.y = -0.19; g.add(arm); const cf = mesh(new THREE.TorusGeometry(0.031, 0.006, 8, 20), M(cuff, { roughness: 0.4, metalness: cuff === '#d8b860' ? 0.7 : 0 })); cf.rotation.x = Math.PI / 2; cf.position.y = -0.03; g.add(cf);
  const wr = mesh(new THREE.CylinderGeometry(0.026, 0.029, 0.04, 16), S); wr.position.y = -0.005; g.add(wr);
  const palm = mesh(new THREE.CapsuleGeometry(0.02, 0.06, 4, 12), S); palm.scale.set(2.05, 1, 0.62); palm.position.y = 0.055; g.add(palm);
  const fingers = [], base = [], LEN = [[0.042, 0.026, 0.02], [0.046, 0.03, 0.022], [0.044, 0.028, 0.021], [0.034, 0.022, 0.018]];
  for (let f = 0; f < 4; f++) { const rad = f === 3 ? 0.0074 : 0.0083; const j1 = grp(-0.03 + f * 0.02, 0.098, 0, 0, g); base.push(j1); let par = j1; const js = [j1];
    LEN[f].forEach((l, s) => { const c = mesh(new THREE.CapsuleGeometry(rad * (1 - s * 0.08), l - rad, 3, 10), S); c.position.y = l / 2; par.add(c); if (s < 2) { const j = grp(0, l, 0, 0, par); js.push(j); par = j; } });
    fingers.push(js); }
  const t1 = grp(0.04, 0.03, 0.008, 0, g); t1.rotation.z = -0.75; t1.rotation.x = 0.35; const tc1 = mesh(new THREE.CapsuleGeometry(0.0095, 0.026, 3, 10), S); tc1.position.y = 0.018; t1.add(tc1);
  const t2 = grp(0, 0.036, 0, 0, t1); const tc2 = mesh(new THREE.CapsuleGeometry(0.0088, 0.018, 3, 10), S); tc2.position.y = 0.014; t2.add(tc2);
  return { g, fingers, base, thumb: [t1, t2] }; }
const hisH = makeHand('#b98260', '#2a3a6a', '#d8b860'); cafe.add(hisH.g);   // his: navy sleeve, gold watch-ring
const herH = makeHand('#f1d2b6', '#e86a9a', '#f4f0e8'); cafe.add(herH.g);   // hers: pink sleeve, pearl cuff
const gapGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.15), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ vec2 q=(vUv-0.5)*vec2(1.0,0.75); float d=length(q); gl_FragColor=vec4(vec3(1.0,0.85,0.6)*uA*exp(-d*d*28.0),1.0); }' }));
gapGlow.material.depthTest = false; gapGlow.renderOrder = 10; gapGlow.position.set(0.0, 0.0, 0.0); gapGlow.rotation.y = Math.PI / 2 * 0; cafe.add(gapGlow);
// pose: approach (0-1.8), fingers spread and slide between each other (1.8-2.6), then curl around the other hand (2.4-3.4)
function poseHands(t) { const app = ease(clamp(t / 1.9, 0, 1)), spread = smooth(1.2, 2.2, t), curl = smooth(2.3, 3.4, t) * 0.92;
  const breathe = 0.002 * Math.sin(t * 1.6);
  hisH.g.position.set(0.004, -0.11 + breathe, lerp(-0.1, -0.0135, app)); hisH.g.rotation.set(-0.28 - 0.2 * (1 - app), 0, -0.12);
  herH.g.position.set(-0.006, -0.11 - breathe, lerp(0.1, 0.0135, app)); herH.g.rotation.set(0.28 + 0.2 * (1 - app), Math.PI, -0.12);
  for (const Hh of [hisH, herH]) { Hh.base.forEach((b, f) => { b.position.x = (-1.5 + f) * lerp(0.02, 0.0205, spread) * lerp(1, 1.6, spread); b.rotation.z = (-1.5 + f) * 0.06 * spread; });
    Hh.fingers.forEach((js, f) => { js[0].rotation.x = lerp(0.15, 1.0, curl); js[1].rotation.x = lerp(0.1, 1.05, curl); js[2].rotation.x = lerp(0.05, 0.7, curl); });
    Hh.thumb[0].rotation.x = lerp(0.35, 0.9, curl); Hh.thumb[1].rotation.x = lerp(0.1, 0.6, curl); } }
const _cp = new THREE.Vector3();
function updateCafe(t, mode) { poseHands(mode === 'end' ? 3.6 + (t - ENDS) : t); const end = mode === 'end';
  cfKey.color.set(end ? '#ff9a5a' : '#ffc890'); cfKey.intensity = end ? 2.2 : 2.6; cfRim.color.set(end ? '#ff6a8a' : '#ffa070'); cfHemi.intensity = end ? 0.55 : 0.8;
  cfBack.material.color.set(end ? '#ff9a8a' : '#ffffff').multiplyScalar(end ? 0.75 : 1);
  gapGlow.material.uniforms.uA.value = end ? (0.35 + 0.15 * Math.sin(t * 3)) * smooth(ENDS + 0.8, ENDS + 2.4, t) : 0; gapGlow.lookAt(cfCam.position); }
function cafeCamera(t, mode) { if (mode === 'end') { const k = smooth(ENDS - 0.5, T_END, t); cfCam.position.set(lerp(-0.34, -0.26, k), lerp(0.08, 0.04, k), lerp(0.2, 0.16, k)); cfCam.lookAt(0, 0.0, 0); cfCam.fov = 38; return; }
  const k = smooth(0, ATOM, t); cfCam.position.set(lerp(0.36, 0.26, k), lerp(0.12, 0.05, k), lerp(0.3, 0.2, k)); cfCam.lookAt(0, lerp(0.0, 0.02, k), 0); cfCam.fov = lerp(40, 30, smooth(LENS, ATOM, t)); }
// =================== ATOMS (1 unit ≈ 1 Å): two lattices — hers (warm electrons) above, his (cool) below. Seen from far they are a field of dots;
// up close every atom is a tiny nucleus in a cloud with three buzzing electrons. They come together, the facing clouds squash and spark — and stop ===================
const atomS = new THREE.Scene(); atomS.background = new THREE.Color('#050a1c'); const atCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);
atomS.add(new THREE.AmbientLight(0x8090c0, 0.6)); { const k = new THREE.DirectionalLight(0xffffff, 1.0); k.position.set(2, 4, 5); atomS.add(k); }
const AX = 21, AY = 3, AZ = 3, ASP = 1.15, ATOMS = [];
for (const side of [1, -1]) for (let i = 0; i < AX; i++) for (let j = 0; j < AY; j++) for (let k = 0; k < AZ; k++)
  ATOMS.push({ side, x: (i - (AX - 1) / 2) * ASP + (side > 0 ? ASP * 0.5 : 0), y: side * (0.62 + j * ASP), z: (k - (AZ - 1) / 2) * ASP, layer: j, ph: R(0, 6.28), orb: [0, 1, 2].map(() => ({ ax: V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), sp: R(5, 9), ph: R(0, 6.28) })) });
const NA = ATOMS.length;
const nucM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.6) }), NA); nucM.frustumCulled = false; atomS.add(nucM);
const cloudM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.46, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending }), NA); cloudM.frustumCulled = false; atomS.add(cloudM);
const elM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NA * 3); elM.frustumCulled = false; atomS.add(elM);
const SPK_A = 160; const sparkA = new THREE.InstancedMesh(new THREE.BoxGeometry(0.02, 0.22, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.4, 3.2) }), SPK_A); sparkA.frustumCulled = false; atomS.add(sparkA);
const HERC = new THREE.Color('#ff8ab0'), HISC = new THREE.Color('#5ad8ff'), _ac = new THREE.Color(), _o2 = new THREE.Object3D(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Vector3();
// her lattice comes down from LAT0 and settles with a little bounce: the clouds never merge
const latDrop = t => { const k = ease(clamp((t - LAT0 + 0.3) / 2.4, 0, 1)); return 2.6 * (1 - k) + 0.12 * Math.sin(clamp(t - LAT0 - 2.1, 0, 3) * 5) * Math.exp(-Math.max(0, t - LAT0 - 2.1) * 1.6); };
const pushAt = t => smooth(LAT0 + 1.2, LAT0 + 2.2, t);
function updateAtoms(t) { const dy = latDrop(t), push = pushAt(t);
  ATOMS.forEach((A, i) => { const y = A.y + (A.side > 0 ? dy : 0) + 0.015 * Math.sin(t * 7 + A.ph), face = A.layer === 0 ? push : 0, sq = 1 - 0.32 * face;
    _o2.position.set(A.x, y, A.z); _o2.rotation.set(0, 0, 0); _o2.scale.setScalar(1); _o2.updateMatrix(); nucM.setMatrixAt(i, _o2.matrix);
    _o2.position.y = y + A.side * 0.06 * face; _o2.scale.set(1 + 0.12 * face, sq, 1 + 0.12 * face); _o2.updateMatrix(); cloudM.setMatrixAt(i, _o2.matrix); cloudM.setColorAt(i, _ac.copy(A.side > 0 ? HERC : HISC).multiplyScalar(1 + 0.8 * face));
    A.orb.forEach((O, k) => { const a = t * O.sp + O.ph; _e2.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.42); _q2.setFromUnitVectors(V3(0, 1, 0), O.ax); _e2.applyQuaternion(_q2); _e2.y *= sq;
      _o2.position.set(A.x + _e2.x, y + _e2.y + A.side * 0.06 * face, A.z + _e2.z); _o2.scale.setScalar(1); _o2.updateMatrix(); elM.setMatrixAt(i * 3 + k, _o2.matrix); elM.setColorAt(i * 3 + k, A.side > 0 ? HERC : HISC); }); });
  nucM.instanceMatrix.needsUpdate = cloudM.instanceMatrix.needsUpdate = elM.instanceMatrix.needsUpdate = true; cloudM.instanceColor.needsUpdate = elM.instanceColor.needsUpdate = true;
  for (let s = 0; s < SPK_A; s++) { const on = push > 0.2 && hash(s * 7.1 + Math.floor(t * 18)) < 0.45 * push; const x = (hash(s * 3.3) - 0.5) * AX * ASP * 0.9, z = (hash(s * 5.7) - 0.5) * AZ * ASP * 0.9;
    _o2.position.set(x, dy * 0.5 + 0.0, z); _o2.rotation.set(0, hash(s) * 3, (hash(s * 9.1 + Math.floor(t * 18)) - 0.5) * 0.8); _o2.scale.setScalar(on ? 1 : 0.0001); _o2.updateMatrix(); sparkA.setMatrixAt(s, _o2.matrix); } sparkA.instanceMatrix.needsUpdate = true; }
// camera: a log-scale dolly from "1 mm away" (a field of dots) down to the gap between two atoms
const atDist = t => t < ATOM + 1 ? Math.exp(lerp(Math.log(150), Math.log(14), smooth(LENS + 0.3, ATOM, t))) : Math.exp(lerp(Math.log(9), Math.log(4.2), smooth(LAT0 - 0.4, LAT0 + 3.2, t)));
function atomCamera(t) { const d = atDist(t), a = 0.5 + 0.12 * Math.sin(t * 0.3); atCam.position.set(Math.sin(a) * d, d * 0.12 + 0.2, Math.cos(a) * d); atCam.lookAt(0, 0.25, 0); }
// =================== ONE ATOM, the textbook picture: a nucleus (6 protons + 6 neutrons) and electrons racing round three tilted orbits — mostly nothing ===================
const bohrS = new THREE.Scene(); bohrS.background = new THREE.Color('#050a1c'); const bhCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
bohrS.add(new THREE.AmbientLight(0x8090c0, 0.7)); { const k = new THREE.DirectionalLight(0xffffff, 1.8); k.position.set(2, 3, 4); bohrS.add(k); }
{ const n = 1200, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(40, 80)); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bohrS.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#5a6ab0', size: 2, sizeAttenuation: false }))); }
const bohrNuc = new THREE.Group(); bohrS.add(bohrNuc);
for (let i = 0; i < 12; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(i ? R(0.12, 0.2) : 0); const b = mesh(new THREE.SphereGeometry(0.13, 18, 12), new THREE.MeshStandardMaterial({ color: i % 2 ? '#ff5a4a' : '#9ab0d8', roughness: 0.35, emissive: i % 2 ? '#3a0a06' : '#0a1020' })); b.position.copy(v); bohrNuc.add(b); }
const nucGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,220,180,0.9)'); rg.addColorStop(1, 'rgba(255,120,80,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); nucGlow.scale.setScalar(0.9); bohrS.add(nucGlow);
const ORB = [0, 1, 2].map(k => { const g = new THREE.Group(); g.rotation.set(Math.PI / 2 + 0.35 * (k - 1), k * Math.PI / 3, 0); bohrS.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.006, 6, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.6, 1.1) })); ring.scale.set(1, 0.62, 1); g.add(ring);
  const els = [0, 1].map(() => { const e = mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 2.4, 3.2) })); g.add(e); return e; }); return { g, els, sp: 1.6 + k * 0.35 }; });
const bohrTrail = makeSmoke(bohrS, 200);
function updateBohr(t) { bohrNuc.rotation.set(t * 0.4, t * 0.6, 0);
  bohrTrail.begin(); smokeMat.uniforms.uTint.value.set('#7ad8ff');
  ORB.forEach((O, k) => { O.els.forEach((e, j) => { const a = t * O.sp * 2 + j * Math.PI + k; e.position.set(Math.cos(a) * 2.0, Math.sin(a) * 2.0 * 0.62, 0);
    for (let s = 1; s < 12; s++) { const b = a - s * 0.06; bohrTrail.add(O.g.localToWorld(V3(Math.cos(b) * 2.0, Math.sin(b) * 1.24, 0)), 0.09 * (1 - s / 12), 0.5 * (1 - s / 12)); } }); });
  bohrTrail.end(); }
function bohrCamera(t) { const k = smooth(ATOM, LAT0 + 0.4, t), a = 0.3 + 0.5 * k; bhCam.position.set(Math.sin(a) * lerp(7.4, 9.0, k), lerp(1.6, 0.8, k), Math.cos(a) * lerp(7.4, 9.0, k)); bhCam.lookAt(0, 0, 0); }
// =================== BACKYARD HAMMOCK (meters): she naps in a striped hammock between two trees; a glowing strip marks the one-atom gap under her ===================
const yard = new THREE.Scene(); yard.background = new THREE.Color('#9ad0f2'); yard.fog = new THREE.Fog(0xbfe0f4, 18, 60); const ydCam = new THREE.PerspectiveCamera(45, W / H, 0.05, 200);
yard.add(new THREE.HemisphereLight(0xe8f4ff, 0x6a8a4a, 1.0));
{ const s = new THREE.DirectionalLight(0xfff0d8, 2.8); s.position.set(4, 8, 5); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; Object.assign(s.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); yard.add(s); }
{ const grass = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6aa84a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#5a9a3e', '#7ab85a', '#62a046', '#82c060'], 3); }, [12, 12]);
  const gr = mesh(new THREE.PlaneGeometry(80, 80), M('#ffffff', { map: grass, roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; yard.add(gr);
  for (const x of [-1.62, 1.62]) { const tr = mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.6, 10), M('#7a5234')); tr.position.set(x, 1.3, -0.05); yard.add(tr);
    for (let k = 0; k < 4; k++) { const c = mesh(new THREE.IcosahedronGeometry(R(0.7, 1.0), 1), M(pick(['#4a9a3a', '#5aaa44', '#3e8a34']), { flatShading: true })); c.position.set(x + R(-0.4, 0.4), R(2.6, 3.3), R(-0.5, 0.3)); yard.add(c); } }
  for (let i = 0; i < 26; i++) { const x = R(-14, 14), z = R(-16, -5); const c = mesh(new THREE.IcosahedronGeometry(R(0.8, 1.6), 1), M(pick(['#4a9a3a', '#5aaa44', '#3e8a34', '#6ab04a']), { flatShading: true })); c.position.set(x, R(0.6, 1.6), z); yard.add(c); }
  bx(30, 1.2, 0.08, '#f2e8d8', 0, 0.6, -6, yard); for (let x = -15; x <= 15; x += 0.5) bx(0.1, 1.3, 0.1, '#f8f0e4', x, 0.65, -5.95, yard);   // a white picket fence
  const lem = grp(-2.4, 0, 0.9, 0.4, yard); bx(0.32, 0.5, 0.32, '#e8d8c0', 0, 0.25, 0, lem); const gl = mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.12, 12), M('#f2e04a', { transparent: true, opacity: 0.85 })); gl.position.set(0, 0.56, 0); lem.add(gl); }
// the hammock: a sagging, cupped striped sheet + ropes to the trunks
const hamGeo = (() => { const g = new THREE.PlaneGeometry(2.5, 0.95, 50, 14); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.82 - 0.36 * (1 - (x / 1.25) ** 2) + 0.16 * (z / 0.475) ** 2 * (1 - 0.6 * (x / 1.25) ** 2)); } g.computeVertexNormals(); return g; })();
const hamY = x => 0.82 - 0.36 * (1 - (x / 1.25) ** 2);
const stripe = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#f08a3a', '#f8f0e0', '#3aa8c8', '#f8f0e0'][i % 4]; g.fillRect(0, i * 8, w, 8); } });
const hammock = mesh(hamGeo, M('#ffffff', { map: stripe, side: THREE.DoubleSide, roughness: 0.9 })); yard.add(hammock);
{ const rope = new THREE.LineBasicMaterial({ color: '#e8dcc0' }); for (const s of [-1, 1]) for (const z of [-0.47, 0, 0.47]) { const g = new THREE.BufferGeometry().setFromPoints([V3(s * 1.25, 0.82 + 0.16 * (z / 0.475) ** 2 * 0.4, z), V3(s * 1.56, 1.25, -0.02)]); yard.add(new THREE.Line(g, rope)); } }
const herY = makeHer(); const herYG = grp(0, 0, 0, Math.PI / 2, yard); herYG.add(herY.outer);
const gapStrip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-0.85, -0.45, 0, 0.4, 0.75].map(x => V3(x, 0.82 - 0.36 * (1 - (x / 1.25) ** 2) + 0.06, 0.2))), 40, 0.02, 6, false), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA, uT; varying vec2 vUv; void main(){ float e=smoothstep(0.0,0.1,vUv.x)*smoothstep(1.0,0.9,vUv.x); float s=0.7+0.3*sin(vUv.x*60.0-uT*6.0); gl_FragColor=vec4(vec3(0.6,0.9,1.0)*e*s*uA*2.0,1.0); }' }));
yard.add(gapStrip);
function updateYard(t) { const sway = 0.035 * Math.sin((t - HAM) * 1.4); hammock.rotation.x = sway; hammock.position.z = 0;
  const P = herY; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms[0].rotation.set(-0.2, 0, 0.25); P.arms[1].rotation.set(-2.8, 0, -0.3); P.elbows[1].rotation.x = -1.9; P.knees[0].rotation.x = 0.35; P.legs[0].rotation.x = -0.2;   // one hand behind the head
  herY.outer.rotation.set(-Math.PI / 2 + 0.12, 0, 0); herY.outer.position.set(0, hamY(0) + 0.13, -0.05); herYG.rotation.set(sway, Math.PI / 2, 0);
  gapStrip.position.set(0, 0, 0); gapStrip.rotation.set(sway, 0, 0); gapStrip.material.uniforms.uA.value = (0.9 + 0.3 * Math.sin(t * 4)) * smooth(HAM + 2.6, HAM + 3.6, t); gapStrip.material.uniforms.uT.value = t; }
function yardCamera(t) { const k = smooth(HAM - 0.5, HUG + 0.5, t); ydCam.position.set(lerp(2.6, 1.7, k), lerp(1.45, 1.05, k), lerp(3.0, 2.1, k)); ydCam.lookAt(lerp(-0.1, -0.15, k), lerp(0.7, 0.58, k), 0); }
// =================== AIRPORT ARRIVALS + CUT-AWAY GROUND (meters): she walks out of the gate, he runs to her, they hug; the electron push is dialled to 0 %,
// and they sink through the floor and down past the layers of rock (a diorama cut at z = 0.5, so they fall just in front of the cut face) ===================
const port = new THREE.Scene(); port.background = new THREE.Color('#0c0a10'); const ptCam = new THREE.PerspectiveCamera(48, W / H, 0.05, 600);
port.add(new THREE.HemisphereLight(0xf0f4ff, 0x6a6058, 1.0));
{ const s = new THREE.DirectionalLight(0xfff4e0, 1.6); s.position.set(3, 9, 6); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; Object.assign(s.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); port.add(s); }
const ptFill = new THREE.PointLight(0xfff0e0, 3, 12, 1.2); port.add(ptFill);
// terminal: glossy tiles in front of the cut, back wall with tall windows + parked plane, arrivals board, gate doors, ceiling light strips, a few travellers
{ const tile = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.fillStyle = pick(['#d8dce2', '#e2e6ea', '#d2d6dc']); g.fillRect(x + 2, y + 2, 124, 124); } }, [10, 5]);
  const fl = mesh(new THREE.PlaneGeometry(40, 12), M('#ffffff', { map: tile, roughness: 0.25, metalness: 0.1 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -4.5); port.add(fl);
  bx(40, 0.3, 6, '#c8ccd2', 0, -0.15, 3.5, port);   // floor slab in front of the cut (seen from below on the way down)
  bx(40, 7, 0.2, '#e8ecf0', 0, 3.5, -10.5, port); for (let x = -15; x <= 15; x += 3.2) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 5.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.8, 2.2) })); w.position.set(x, 3.2, -10.39); port.add(w); }
  const pl = grp(-3, 0, -16, 0.3, port); bx(14, 1.8, 1.8, '#f4f6f8', 0, 2.6, 0, pl); bx(1.5, 2.4, 0.3, '#2a6ad0', 6.2, 4.4, 0, pl); bx(3, 0.3, 9, '#e8eaee', 0, 2.4, 0, pl);
  const board = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#10141c'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c84a'; g.font = 'bold 34px Inter, sans-serif'; g.fillText('ARRIVALS', 20, 44);
    g.font = '24px Inter, sans-serif'; [['10:05', 'CHICAGO', 'LANDED'], ['10:20', 'DENVER', 'LANDED'], ['10:35', 'MIAMI', 'ON TIME'], ['10:50', 'SEATTLE', 'DELAYED']].forEach((r, i) => { g.fillStyle = '#e8e8e8'; g.fillText(r[0], 20, 94 + i * 40); g.fillText(r[1], 120, 94 + i * 40); g.fillStyle = r[2] === 'DELAYED' ? '#ff6a5a' : '#5fd27a'; g.fillText(r[2], 340, 94 + i * 40); }); });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: board, color: new THREE.Color(1.3, 1.3, 1.3) })); bd.position.set(1.8, 3.4, -6.0); port.add(bd); bx(0.1, 2.6, 0.1, '#5a5e66', 1.8, 1.3, -6.05, port);
  bx(0.25, 3.2, 0.4, '#8a9098', -4.6, 1.6, -3.0, port); bx(0.25, 3.2, 0.4, '#8a9098', -2.4, 1.6, -3.0, port); bx(2.45, 0.3, 0.4, '#8a9098', -3.5, 3.2, -3.0, port);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#1a3a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 34px Inter, sans-serif'; g.fillText('GATE B4  →', 20, 44); }), color: new THREE.Color(1.3, 1.3, 1.3) })); sg.position.set(-3.5, 3.6, -2.95); port.add(sg);
  for (let x = -12; x <= 12; x += 4) { const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 1.9) })); l.position.set(x, 5.8, -3); port.add(l); } }
const travellers = []; for (let k = 0; k < 6; k++) { const p = makePerson(rnd); port.add(p.outer); travellers.push({ p, x: R(-6, 6), z: R(-6, -2.5), ry: R(-1, 1), walk: rnd() < 0.5 }); }
const herP = makeHer(), himP = makeHim(); port.add(herP.outer, himP.outer);
const suitcase = grp(0, 0, 0, 0, port); bx(0.38, 0.55, 0.22, '#d84a6a', 0, 0.33, 0, suitcase); bx(0.02, 0.4, 0.02, '#3a3a40', 0, 0.8, 0, suitcase); for (const x of [-0.13, 0.13]) { const w = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), M('#1a1a1e')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.03, 0); suitcase.add(w); }
// the gap between them: soft sparkles where the two bodies meet
const GSP_N = 120; const gapSpk = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.012, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 2.4, 3.0) }), GSP_N); gapSpk.frustumCulled = false; port.add(gapSpk);
// underground: strata in a cut-away block (front face at z = 0.5), a gas pipe, an ammonite, groundwater
const STRATA = [[0, -2, '#7a5a3a'], [-2, -7, '#a0683a'], [-7, -9, '#4a7ab0'], [-9, -30, '#c8a878'], [-30, -60, '#9a8a80'], [-60, -170, '#8a6a6a']];
for (const [a, b, c] of STRATA) { const tx = canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); speckle(g, w, h, 1600, [new THREE.Color(c).offsetHSL(0, 0, 0.06).getStyle(), new THREE.Color(c).offsetHSL(0, 0, -0.07).getStyle()], 5); }, [10, Math.max(1, (a - b) / 4)]);
  const s = mesh(BOX, M('#ffffff', { map: tx, roughness: 0.95 }), false, true); s.scale.set(40, a - b - 0.02, 10); s.position.set(0, (a + b) / 2 - 0.3, -4.5); port.add(s); }
{ const pipe = mesh(new THREE.CylinderGeometry(0.18, 0.18, 40, 16), M('#e8c040', { metalness: 0.5, roughness: 0.4 })); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, -1.4, 0.45); port.add(pipe);
  const am = mesh(new THREE.TorusGeometry(0.5, 0.18, 10, 40, Math.PI * 3.4), M('#e8d8b8', { roughness: 0.7 })); am.position.set(1.6, -16, 0.55); am.scale.set(1, 1, 0.5); port.add(am);
  for (let i = 0; i < 40; i++) { const r = mesh(new THREE.DodecahedronGeometry(R(0.15, 0.5), 0), M(pick(['#6a5a50', '#8a7a6a', '#5a4a44']), { flatShading: true })); r.position.set(R(-6, 6), R(-160, -12), 0.55); port.add(r); } }
// her walk out of the gate, his run, the hug; after OFF they sink (they fall from SINK-0.6 with g scaled for drama)
const hugAt = HUG + 1.6, fallT0 = OFF + 2.4, fallY = t => t < fallT0 ? 0 : -3.2 * (t - fallT0) ** 2;
function updatePort(t) { travellers.forEach((T, k) => { const P = T.p; P.root.rotation.set(0, 0, 0); if (T.walk) { const x = wrapR(T.x + (k % 2 ? 1 : -1) * (t - HUG) * 1.1, -9, 9); P.outer.position.set(x, 0.95, T.z); P.outer.rotation.set(0, k % 2 ? Math.PI / 2 : -Math.PI / 2, 0); poseWalk(P, t * 7 + k, 1); } else { P.outer.position.set(T.x, 0.95, T.z); P.outer.rotation.set(0, T.ry, 0); poseIdle(P, t, k); } });
  const H1 = herP, H2 = himP; for (const P of [H1, H2]) { P.root.rotation.set(0, 0, 0); P.outer.rotation.set(0, 0, 0); }
  const fy = fallY(t);
  if (t < hugAt) { const k = clamp((t - HUG) / 1.6, 0, 1);
    H1.outer.position.set(lerp(-3.4, -0.2, ease(k)), 0.95, lerp(-2.6, 0.9, ease(k))); H1.outer.rotation.y = Math.atan2(3.2, 3.5); poseWalk(H1, t * 8, 1); H1.arms[1].rotation.x = 0.3;
    H2.outer.position.set(lerp(3.6, 0.2, ease(k)), 0.95, 0.9); H2.outer.rotation.y = -Math.PI / 2; poseWalk(H2, t * 13, 1.3);
    suitcase.position.set(H1.outer.position.x - 0.35, 0, H1.outer.position.z - 0.25); }
  else { const sq = smooth(hugAt, hugAt + 0.4, t); H1.outer.position.set(-0.17, 0.95 + fy, 0.9); H1.outer.rotation.y = Math.PI / 2; H2.outer.position.set(0.17, 0.95 + fy, 0.9); H2.outer.rotation.y = -Math.PI / 2;
    for (const P of [H1, H2]) { poseIdle(P, t, 0); P.arms[0].rotation.set(-1.45 * sq, 0, 0.55 * sq); P.arms[1].rotation.set(-1.25 * sq, 0, -0.5 * sq); P.elbows[0].rotation.x = -1.1 * sq; P.elbows[1].rotation.x = -1.2 * sq; }
    H1.root.rotation.x = 0.04 * Math.sin(t * 2); suitcase.position.set(-0.8, 0, 0.4); }
  const spk = smooth(hugAt + 0.8, hugAt + 1.6, t) * (1 - smooth(OFF + 1.2, OFF + 2.2, t));
  for (let i = 0; i < GSP_N; i++) { const a = i * 2.39, h = 1.0 + (i / GSP_N) * 0.62; _o2.position.set(0.0 + 0.012 * Math.sin(t * 5 + i), h + fy, 0.9 + Math.sin(a) * 0.16); _o2.rotation.set(t * 3 + i, t * 2, 0);
    _o2.scale.setScalar(Math.max(0.0001, spk * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)))); _o2.updateMatrix(); gapSpk.setMatrixAt(i, _o2.matrix); } gapSpk.instanceMatrix.needsUpdate = true;
  ptFill.position.set(1.0, 1.8 + fy, 3.0); }
function portCamera(t) { const fy = fallY(t); let pos, look;
  if (t < OFF) { const k = smooth(HUG - 0.5, OFF, t); pos = V3(lerp(1.6, 0.9, k), lerp(1.7, 1.55, k), lerp(5.8, 3.4, k)); look = V3(0, 1.25, lerp(-0.5, 0.6, k)); }
  else { const k = smooth(OFF, OFF + 2.0, t); pos = V3(lerp(0.9, 1.4, k), 1.55 + fy * 0.96 + lerp(0, 0.6, smooth(fallT0, SINK + 1, t)), lerp(3.4, 4.6, k)); look = V3(0, 1.2 + fy, 0.6); }
  ptCam.position.copy(pos); ptCam.lookAt(look); }
// =================== EARTH COLLAPSING: a smooth cartoon globe (real coastlines, built in two halves); with nothing keeping atoms apart it squeezes down
// to a white-hot speck (at nuclear density Earth would be ~1,200 ft wide) ===================
const earthS = new THREE.Scene(); earthS.background = new THREE.Color('#04060e'); const eaCam = new THREE.PerspectiveCamera(38, W / H, 0.1, 500);
{ const n = 2500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(120, 200)); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); earthS.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe8ff', size: 2, sizeAttenuation: false }))); }
earthS.add(new THREE.AmbientLight(0x6070a0, 0.8)); { const s = new THREE.DirectionalLight(0xfff2e0, 2.4); s.position.set(-5, 4, 9); earthS.add(s); }
const ER2 = 5, CHI = [41.88, -87.63];
function llv(lat, lon) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)); }
const Q_UP = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -0.5).multiply(new THREE.Quaternion().setFromUnitVectors(llv(...CHI), V3(0, 1, 0)));   // Chicago straight up, North America toward us
const earthG = new THREE.Group(); earthS.add(earthG);
const halfA = new THREE.Group(), halfB = new THREE.Group(); earthG.add(halfA, halfB);
let landImg = null; const MW2 = 2048, MH2 = 1024;
const sectTex = canvasTex(1024, 1024, (g, w, h) => { const c = w / 2; const L = [[1.0, '#7a5a3a'], [0.985, '#e0582a'], [0.546, '#f29a2a'], [0.192, '#ffe46a']];   // crust, mantle, outer core, inner core (PREM radii)
  for (const [r, col] of L) { const rg = g.createRadialGradient(c, c, 0, c, c, r * c); rg.addColorStop(0, new THREE.Color(col).offsetHSL(0, 0, 0.08).getStyle()); rg.addColorStop(1, col); g.fillStyle = rg; g.beginPath(); g.arc(c, c, r * c, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; for (const r of [0.985, 0.546, 0.192]) { g.beginPath(); g.arc(c, c, r * c, 0, 7); g.stroke(); } });
async function buildEarth() {
  const topo = await (await fetch('node_modules/world-atlas/land-110m.json')).json(); const land = topojson.feature(topo, topo.objects.land);
  const cv = document.createElement('canvas'); cv.width = MW2; cv.height = MH2; const g = cv.getContext('2d');
  const oc = g.createLinearGradient(0, 0, 0, MH2); oc.addColorStop(0, '#2a6ab8'); oc.addColorStop(0.5, '#3a90e0'); oc.addColorStop(1, '#2a6ab8'); g.fillStyle = oc; g.fillRect(0, 0, MW2, MH2);
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry]; const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW2, y = (90 - la) / 180 * MH2; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
      const ice = pts.every(([, la]) => la < -60) || pts.every(([, la]) => la > 60); g.fillStyle = ice ? '#f4f8fa' : '#6ac24a'; g.fill('evenodd'); } }
  g.fillStyle = 'rgba(214,180,110,0.85)'; for (const [x0, y0, w0, h0] of [[0.5, 0.36, 0.08, 0.06], [0.56, 0.38, 0.06, 0.04], [0.78, 0.6, 0.1, 0.07]]) { g.beginPath(); g.ellipse(x0 * MW2, y0 * MH2, w0 * MW2 / 2, h0 * MH2 / 2, 0, 0, 7); g.fill(); }   // Sahara, Arabia, Australia's outback
  g.fillStyle = '#f4f8fa'; g.fillRect(0, MH2 * 0.94, MW2, MH2 * 0.06); g.fillRect(0, 0, MW2, MH2 * 0.025);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // split a fine sphere into two halves (by triangle centroid, in the Chicago-up frame) so each half can move on its own
  const sph = new THREE.SphereGeometry(ER2, 160, 110).toNonIndexed(); sph.applyQuaternion(Q_UP); const P = sph.attributes.position, UV = sph.attributes.uv, NR = sph.attributes.normal;
  const parts = [[], []]; for (let f = 0; f < P.count; f += 3) { const cx = (P.getX(f) + P.getX(f + 1) + P.getX(f + 2)) / 3; parts[cx < 0 ? 0 : 1].push(f); }
  parts.forEach((list, s) => { const pos = new Float32Array(list.length * 9), uv = new Float32Array(list.length * 6), nr = new Float32Array(list.length * 9);
    list.forEach((f, i) => { for (let k = 0; k < 3; k++) { pos.set([P.getX(f + k), P.getY(f + k), P.getZ(f + k)], (i * 3 + k) * 3); nr.set([NR.getX(f + k), NR.getY(f + k), NR.getZ(f + k)], (i * 3 + k) * 3); uv.set([UV.getX(f + k), UV.getY(f + k)], (i * 3 + k) * 2); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gg.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); gg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); (s ? halfB : halfA).add(m);
    const face = new THREE.Mesh(new THREE.CircleGeometry(ER2 * 0.997, 96), new THREE.MeshBasicMaterial({ map: sectTex, color: new THREE.Color(1.15, 1.15, 1.15) })); face.rotation.y = s ? -Math.PI / 2 : Math.PI / 2; (s ? halfB : halfA).add(face);
    const groove = new THREE.Mesh(new THREE.PlaneGeometry(0.07, ER2 * 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.5, 2.4), transparent: true, opacity: 0.0 })); groove.rotation.y = s ? -Math.PI / 2 : Math.PI / 2; groove.position.x = s ? -0.01 : 0.01; groove.userData.groove = true; (s ? halfB : halfA).add(groove); }); }
const faller = mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.6) })); earthS.add(faller);
const trail = makeSmoke(earthS, 80);
const atm = new THREE.Mesh(new THREE.SphereGeometry(ER2 * 1.035, 64, 40), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 1 } },
  vertexShader: 'varying vec3 vN, vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN, vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),3.0); gl_FragColor=vec4(vec3(0.4,0.7,1.0)*f*1.4*uA,1.0); }' })); earthS.add(atm);
const hotGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,250,235,1)'); rg.addColorStop(0.35, 'rgba(255,190,120,0.55)'); rg.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); earthS.add(hotGlow);
const squeezeAt = t => smooth(EARTH + 0.8, EARTH + 5.2, t);
const earthDiam = t => Math.exp(lerp(Math.log(12742e3), Math.log(367), squeezeAt(t)));   // metres, for the HUD
function updateEarth(t) { const k = squeezeAt(t), sc = Math.exp(lerp(0, Math.log(0.02), k)); earthG.scale.setScalar(sc); atm.scale.setScalar(sc); atm.material.uniforms.uA.value = 1 - k;
  earthG.rotation.y = 0.2 + 0.5 * k + 0.08 * t; faller.visible = false; trail.begin(); trail.end();
  for (const hh of [halfA, halfB]) hh.children.forEach(c => { if (c.userData.groove) c.visible = false; else if (c.material.emissive) c.material.emissive.setRGB(1.6 * k, 0.8 * k * k, 0.3 * k * k * k); });
  const g = smooth(EARTH + 2.5, EARTH + 5.4, t); hotGlow.scale.setScalar(lerp(0.1, 5.0, g) * (1 + 0.06 * Math.sin(t * 9))); hotGlow.material.opacity = g; }
function earthCamera(t) { eaCam.position.set(0, 1.5, lerp(33, 27, smooth(EARTH, ESB + 0.5, t))); eaCam.lookAt(0, 0, 0); }
// =================== FOR SCALE (meters): squeezed Earth (367 m ball) next to the Empire State Building (roof 381 m, tip 443 m) at dusk ===================
const nycS = new THREE.Scene(); nycS.background = new THREE.Color('#1c2440'); nycS.fog = new THREE.Fog(0x2a3458, 1800, 6000); const nyCam = new THREE.PerspectiveCamera(40, W / H, 1, 20000);
nycS.add(new THREE.HemisphereLight(0x8a9ad8, 0x2a2430, 1.0)); { const s = new THREE.DirectionalLight(0xffb070, 2.2); s.position.set(-800, 600, 900); nycS.add(s); }
{ const sky = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141c3a'); gr.addColorStop(0.55, '#3a4a8a'); gr.addColorStop(0.8, '#e88a6a'); gr.addColorStop(1, '#f8c88a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(16000, 5000), new THREE.MeshBasicMaterial({ map: sky, fog: false, depthWrite: false })); sp.position.set(0, 2000, -6000); sp.renderOrder = -1; nycS.add(sp);
  const gr = mesh(new THREE.PlaneGeometry(20000, 20000), M('#22242c', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; nycS.add(gr); }
const winTex = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#3a3e4a'; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) { g.fillStyle = rnd() < 0.45 ? pick(['#ffe0a0', '#ffd080', '#fff0c8']) : '#2a2e38'; g.fillRect(x, y, 4, 5); } });
function tower(w, d, h, x, z, col = '#8a8c94') { const t = winTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, w / 40), Math.max(1, h / 120));
  const m = mesh(BOX, new THREE.MeshStandardMaterial({ color: col, map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.55, roughness: 0.8 })); m.scale.set(w, h, d); m.position.set(x, h / 2, z); nycS.add(m); return m; }
// the Empire State Building: stepped tiers + mast
const ESBX = -60; [[130, 60, 0, 25], [100, 50, 25, 85], [70, 45, 85, 265], [52, 36, 265, 320], [34, 30, 320, 381]].forEach(([w, d, y0, y1]) => { const m = tower(w, d, y1 - y0, ESBX, 0, '#b8b0a0'); m.position.y = y0 + (y1 - y0) / 2; });
{ const mast = mesh(new THREE.CylinderGeometry(2, 7, 62, 10), M('#c8c0b0')); mast.position.set(ESBX, 412, 0); nycS.add(mast); const tip = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.6, 0.5) })); tip.position.set(ESBX, 444, 0); nycS.add(tip); }
for (let i = 0; i < 70; i++) { const x = R(-1600, 1400), z = R(-1800, -120); if (Math.abs(x - ESBX) < 120 && z > -300) continue; tower(R(30, 80), R(30, 80), R(40, 230), x, z); }
for (let i = 0; i < 30; i++) { const x = R(-1600, -250), z = R(-100, 300); tower(R(30, 70), R(30, 70), R(30, 140), x, z); }
// squeezed Earth: dark, impossibly dense, still glowing hot in the cracks
const crackTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#2a2a34'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff9a4a'; g.lineWidth = 2; for (let i = 0; i < 60; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += R(-30, 30); y += R(-20, 20); g.lineTo(x, y); } g.stroke(); } });
const denseBall = mesh(new THREE.SphereGeometry(183.5, 48, 32), new THREE.MeshStandardMaterial({ color: '#5a5a6a', map: crackTex, emissive: '#ffffff', emissiveMap: crackTex, emissiveIntensity: 0.9, roughness: 0.6 })); denseBall.position.set(330, 184, 0); nycS.add(denseBall);
const ballHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 30, 64, 64, 64); rg.addColorStop(0, 'rgba(255,170,90,0.5)'); rg.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); ballHalo.scale.setScalar(560); ballHalo.visible = false; ballHalo.position.copy(denseBall.position); nycS.add(ballHalo);
function updateNyc(t) { denseBall.rotation.y = 0.15 * t; denseBall.material.emissiveIntensity = 0.75 + 0.15 * Math.sin(t * 2.3); }
function nycCamera(t) { const k = smooth(ESB - 0.5, CELL + 0.5, t); nyCam.position.set(lerp(260, 200, k), lerp(330, 260, k), lerp(2300, 1900, k)); nyCam.lookAt(150, 215, 0); }
// =================== BLOOD (micrometres): red blood cells drift by; a glowing 8-µm ball — all of you, squeezed — hangs among them ===================
const cellS = new THREE.Scene(); cellS.background = new THREE.Color('#3a0812'); cellS.fog = new THREE.Fog(0x3a0812, 20, 70); const ceCam = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);
cellS.add(new THREE.HemisphereLight(0xffd0d0, 0x400810, 1.0)); { const k = new THREE.DirectionalLight(0xfff0f0, 1.8); k.position.set(5, 8, 10); cellS.add(k); }
const cellGeo = (() => { const g = new THREE.CylinderGeometry(4, 4, 1.2, 40, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 4; p.setY(i, p.getY(i) * (0.45 + 1.6 * r * r)); } g.computeVertexNormals(); return g; })();
const CELLS = Array.from({ length: 34 }, (_, i) => ({ p: V3(R(-22, 22), R(-34, 34), R(-30, 6)), r: V3(R(0, 6), R(0, 6), 0), sp: R(0.6, 1.4), m: mesh(cellGeo, M('#d82a3a', { roughness: 0.45 })) }));
CELLS.forEach(C => cellS.add(C.m));
const youBall = mesh(new THREE.SphereGeometry(4.15, 32, 22), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.9) })); cellS.add(youBall);
const youHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 20, 64, 64, 64); rg.addColorStop(0, 'rgba(200,220,255,0.7)'); rg.addColorStop(1, 'rgba(160,190,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); cellS.add(youHalo);
const youFig = makeHer(); cellS.add(youFig.outer); youFig.outer.rotation.y = 0.4;
function updateCell(t) { CELLS.forEach((C, i) => { C.m.position.set(C.p.x + Math.sin(t * 0.3 + i) * 1.5, wrapR(C.p.y - (t - CELL) * 2.2 * C.sp, -36, 36), C.p.z); C.m.rotation.set(C.r.x + t * 0.25 * C.sp, C.r.y + t * 0.2, 0); });
  const k = smooth(CELL + 0.4, CELL + 2.6, t); poseIdle(youFig, t, 0); youFig.root.rotation.set(0, 0, 0);
  const fs = lerp(16, 0.0001, k); youFig.outer.scale.setScalar(Math.max(0.0001, fs)); youFig.outer.position.set(0, 0.1 * fs, 0); youFig.outer.visible = k < 0.98;
  youBall.scale.setScalar(Math.max(0.0001, k)); youHalo.scale.setScalar(Math.max(0.0001, k * 13 * (1 + 0.05 * Math.sin(t * 5)))); }
function cellCamera(t) { const k = smooth(CELL - 0.5, ENDS + 0.5, t); ceCam.position.set(lerp(-6, 4, k), lerp(4, 1, k), lerp(48, 32, smooth(CELL + 0.6, CELL + 3.4, t))); ceCam.lookAt(0, 0, 0); }
// =================== scene schedule: [start, id, dissolve] — the café -> atoms change is the scope reveal, so that boundary has no dissolve ===================
const SCN = { cafe: [t => updateCafe(t, 'start'), t => cafeCamera(t, 'start'), cafe, () => cfCam, 1.0], atoms: [updateAtoms, atomCamera, atomS, () => atCam, 1.2], bohr: [updateBohr, bohrCamera, bohrS, () => bhCam, 1.2],
  yard: [updateYard, yardCamera, yard, () => ydCam, 1.0], port: [updatePort, portCamera, port, () => ptCam, 1.0], earth: [updateEarth, earthCamera, earthS, () => eaCam, 1.1], nyc: [updateNyc, nycCamera, nycS, () => nyCam, 1.0],
  cell: [updateCell, cellCamera, cellS, () => ceCam, 1.1], cafeEnd: [t => updateCafe(t, 'end'), t => cafeCamera(t, 'end'), cafe, () => cfCam, 1.0] };
const SEQ = [[0, 'cafe', 0.7], [LENS + 0.3, 'atoms', 0], [ATOM + 0.4, 'bohr', 0.7], [LAT0, 'atoms', 0.7], [HAM, 'yard', 0.7], [HUG, 'port', 0.7], [EARTH, 'earth', 0.7], [ESB, 'nyc', 0.7], [CELL, 'cell', 0.7], [ENDS, 'cafeEnd', 0.7]];
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you could<br><span class="hl">REALLY</span> touch someone?'; el.endT.innerHTML = 'What if you could<br><span class="hl">REALLY</span> touch someone?';
el.endS.innerHTML = 'TOUCH IS ELECTRON CLOUDS REPELLING — THE ATOMS NEVER MEET.<br>THAT GAP IS ABOUT 1 ÅNGSTRÖM (0.00000001 CM).<br>SQUEEZED TO NUCLEAR DENSITY, EARTH WOULD BE ~1,200 FT ACROSS.';
const captions = [
  [4.3, 7.8, 'Fun fact: you’ve never<br>touched anyone. Ever.'],
  [8.6, 11.3, 'An atom is 99.9999999%<br>empty space.'],
  [11.6, 14.8, 'What you call “touch” is<br>electrons repelling each other.'],
  [15.4, 18.4, 'This hammock? She’s not<br>really lying on it.'],
  [18.6, 21.8, 'She’s levitating —<br>by about one atom.'],
  [22.4, 24.9, 'Even the tightest hug…'],
  [25.1, 27.9, '…leaves a gap of<br>0.00000001 cm.'],
  [28.2, 30.8, 'Now switch that push off.'],
  [31.3, 33.9, 'You’d slide through<br>the floor like a ghost…'],
  [34.1, 36.8, '…and nothing<br>could stop you.'],
  [37.6, 42.7, 'Atoms would collapse.<br>All of Earth would shrink…'],
  [43.1, 48.7, '…to a ball ~1,200 ft wide.<br>Shorter than the<br>Empire State Building.'],
  [49.4, 52.6, 'And you? The size<br>of a blood cell.'],
  [52.8, 55.8, 'Same weight.<br>Zero empty space.'],
  [56.4, 59.8, 'Every touch you’ve felt<br>was a force, not contact.'],
  [60.0, 63.8, 'And that almost-touch is<br>the closest we’ll ever be.'],
];
const BLUE = '<b style="background:#5ad8ff"></b>', RED = '<b style="background:#ff6a5a"></b>', GREEN = '<b style="background:#5fd27a"></b>';
const SCALES = [[LENS, '1 mm'], [LENS + 1.3, '0.1 mm'], [LENS + 2.5, '10 µm'], [LENS + 3.3, '1 µm'], [ATOM - 0.3, '1 nm']];
const ft = m => m > 1609 ? fmt(m / 1609.34) + ' mi' : fmt(m * 3.281) + ' ft';
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < ATOM + 0.4) { let s = SCALES[0][1]; for (const [a, l] of SCALES) if (t >= a) s = l; return [BLUE + 'ZOOMING IN', 'SCALE', s, 'SKIN → CELLS → ATOMS']; }
  if (t < LAT0) return [BLUE + 'ONE ATOM', 'EMPTY SPACE', '99.9999999%', 'THE NUCLEUS IS TINY'];
  if (t < HAM) return ['<b></b>CONTACT?', 'GAP', '~0.1 nm', 'ELECTRONS PUSHING BACK'];
  if (t < HUG) return ['<b></b>THE HAMMOCK', 'GAP', '~1 atom', 'SHE NEVER QUITE TOUCHES IT'];
  if (t < OFF) return ['<b></b>ARRIVALS', 'GAP', '~0.1 nm', 'EVEN IN THE TIGHTEST HUG'];
  if (t < SINK) { const p = Math.round(100 * (1 - smooth(OFF + 0.3, OFF + 2.0, t))); return [RED + 'PHYSICS SETTINGS', 'ELECTRON PUSH', p + '%', p > 0 ? 'TURNING OFF…' : 'OFF']; }
  if (t < EARTH) return [RED + 'ELECTRON PUSH: OFF', 'DEPTH', fmt(-fallY(t) * 3.281) + ' ft', 'NOTHING STOPS YOU'];
  if (t < ESB) return [RED + 'ELECTRON PUSH: OFF', 'EARTH, ACROSS', ft(earthDiam(t)), 'ALL THE EMPTY SPACE SQUEEZED OUT'];
  if (t < CELL) return ['<b></b>FOR SCALE', 'SQUEEZED EARTH', '1,205 ft', 'EMPIRE STATE BLDG ROOF: 1,250 FT'];
  if (t < ENDS) return ['<b></b>YOU, SQUEEZED', 'SIZE', '0.0003 in', 'STILL 154 LB · LIKE A BLOOD CELL'];
  return [GREEN + 'EVERY TOUCH, EVER', 'GAP', '~0.1 nm', 'THE CLOSEST WE CAN GET']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(3.8, 4.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
const _sc = new THREE.Vector3();
window.renderAt = (t) => { const u = compMat.uniforms; u.uPixOn.value = 0; u.uCircOn.value = 0; u.uRed.value = 0;
  if (t >= LENS + 0.3 && t < ATOM) {   // the scope: atoms inside a growing circle centred on the contact point
    const eA = shootScene('cafe', t, RTA), eB = shootScene('atoms', t, RTB); _sc.set(0, 0.0, 0).project(cfCam);
    u.uCirc.value.set(_sc.x * 0.5 + 0.5, _sc.y * 0.5 + 0.5, 0.11 * smooth(LENS + 0.3, LENS + 1.2, t) + 1.25 * smooth(LENS + 2.4, ATOM, t) ** 2); u.uCircOn.value = 1; composite(1, eA, eB); updateDOM(t); return true; }
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && SEQ[i + 1][2] > 0 && t > SEQ[i + 1][0] - SEQ[i + 1][2] / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - SEQ[i + 1][2] / 2, SEQ[i + 1][0] + SEQ[i + 1][2] / 2, t); }
  else if (i > 0 && SEQ[i][2] > 0 && t < SEQ[i][0] + SEQ[i][2] / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - SEQ[i][2] / 2, SEQ[i][0] + SEQ[i][2] / 2, t); }
  let eA = 1, eB = 1; if (!B || mix < 1) eA = shootScene(A, t, RTA); if (B) eB = shootScene(B, t, RTB);
  u.uRed.value = 0.18 * fadeWin(t, OFF + 0.4, SINK + 0.6, 0.5);   // a warning tint while the push is switched off
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth(); window.renderAt(0); return true; })();
