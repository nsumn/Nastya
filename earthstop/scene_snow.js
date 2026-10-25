import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you got stuck in your car in a snowstorm?" (64 s, US, survival): POV from the driver's seat + exterior shots of a snowed-in interstate.
// Facts: I-95 Virginia 3-4 Jan 2022 (~50 mi closed, some drivers ~27 h); CDC (snow-blocked tailpipe -> carbon monoxide inside the car); NWS (stay in the car, run the engine
// a few minutes each hour, crack a window, dome light at night, bright cloth on the antenna); DOE via KBB (idling 1/4-1/2 gal/h); hypothermia < 95 F (tools/snowcar_math.py).
// =================== timeline ===================
const JAM = 4.0, PIPE = 10.0, CLEAR = 17.0, FUEL = 24.0, NIGHT = 31.0, COLD = 38.0, WALK = 45.0, DAWN = 52.0, T_END = 60.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 1212;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed;
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB); c=mix(a,b,uMix); }
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
// =================== the hero: same look in every scene (own seed so the height/hair never change) ===================
function makeHero() { const sv = seed; seed = 4242; const p = makePerson(rnd, { top: '#2fa89a', bottom: '#2a2e3a', hair: '#4a2f1b', skin: '#e9c4a2', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, cap: false, hairStyle: 0.3 }); seed = sv; return p; }
// =================== THE INTERSTATE (meters): a snowed-in jam, your car (left lane, z = 0, facing -z), its tailpipe, the night, the whiteout, the plow at dawn.
// One scene, many modes: updateRoad(t, mode) sets light, fog, snowfall and props for that beat; roadCamera(t, mode) frames it ===================
const hw = new THREE.Scene(); const hwCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 600); hw.fog = new THREE.Fog(0xc9d2dc, 15, 140);
const hwHemi = new THREE.HemisphereLight(0xe8f0ff, 0x8a909a, 1.0); hw.add(hwHemi);
const hwSun = new THREE.DirectionalLight(0xf0f4ff, 0.8); hwSun.position.set(-20, 30, 15); hwSun.castShadow = true; hwSun.shadow.mapSize.set(2048, 2048); hwSun.shadow.bias = -0.0005; Object.assign(hwSun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 120 }); hw.add(hwSun, hwSun.target);
const domeL = new THREE.PointLight(0xffd090, 0, 4, 1.4); domeL.position.set(-2, 1.3, 0); hw.add(domeL);
const beaconL = new THREE.PointLight(0xff9a20, 0, 30, 1.2); hw.add(beaconL);
{ const snowTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#eef2f6'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#e2e8ee', '#f6f9fb', '#dfe5ec'], 4); }, [40, 40]);
  const gnd = mesh(new THREE.PlaneGeometry(600, 600), M('#ffffff', { map: snowTex, roughness: 0.9 }), false, true); gnd.rotation.x = -Math.PI / 2; hw.add(gnd);
  const road = mesh(new THREE.PlaneGeometry(9, 600), M('#d4d9e0', { roughness: 0.8 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -250); hw.add(road);
  for (const x of [-2.35, -1.65, 1.65, 2.35]) { const tr = mesh(new THREE.PlaneGeometry(0.28, 600), M('#a8b0ba', { roughness: 0.9 }), false, true); tr.rotation.x = -Math.PI / 2; tr.position.set(x, 0.015, -250); hw.add(tr); }
  for (const x of [-6, 6]) { const bank = mesh(new THREE.BoxGeometry(3, 1.1, 600), M('#f2f5f8', { roughness: 1 }), true, true); bank.position.set(x, 0.4, -250); hw.add(bank); }
  for (let i = 0; i < 140; i++) { const sx = pick([-1, 1]), x = sx * R(10, 40), z = R(-300, 30), hgt = R(4, 9); const tr = mesh(new THREE.ConeGeometry(hgt * 0.32, hgt, 7), M(pick(['#2a4a36', '#30503a', '#26422f']), { flatShading: true })); tr.position.set(x, hgt / 2, z); hw.add(tr);
    const cap = mesh(new THREE.ConeGeometry(hgt * 0.17, hgt * 0.35, 7), M('#f4f8fb', { flatShading: true })); cap.position.set(x, hgt * 0.86, z); hw.add(cap); } }
// cars: a body, dark glass cabin, snow on the roof and hood, red tail lights (they glow at night)
const tailMats = [];
function sedan(color, snowAmt = 1) { const g = new THREE.Group(); bx(1.85, 0.7, 4.5, color, 0, 0.6, 0, g); const glass = bx(1.6, 0.55, 2.4, '#2a3240', 0, 1.22, -0.1, g, { roughness: 0.2, metalness: 0.3 });
  bx(1.62, 0.14 * snowAmt, 2.3, '#f4f8fb', 0, 1.56, -0.1, g); bx(1.8, 0.1 * snowAmt, 1.2, '#f4f8fb', 0, 1.0, -1.6, g); bx(1.8, 0.1 * snowAmt, 0.9, '#f4f8fb', 0, 1.0, 1.75, g);
  const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.08, 0.06) }); tailMats.push(tm); for (const x of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.04), tm); l.position.set(x, 0.78, 2.26); g.add(l); }
  for (const [x, z] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) { const w = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.33, z); g.add(w); }
  g.userData.glass = glass; return g; }
const myCar = sedan('#c8302a', 1.4); myCar.position.set(-2, 0, 0); hw.add(myCar);
{ const pipe = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), M('#6a6a70', { metalness: 0.6, roughness: 0.4 })); pipe.rotation.x = Math.PI / 2; pipe.position.set(0.55, 0.3, 2.3); myCar.add(pipe);
  const ant = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 6), M('#2a2a30')); ant.position.set(0.5, 1.95, 0.9); myCar.add(ant); }
const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2, 6, 2), new THREE.MeshStandardMaterial({ color: '#e0202a', side: THREE.DoubleSide, emissive: '#3a0606' })); cloth.position.set(0.5 + 0.17, 2.18, 0.9); myCar.add(cloth);
const winPane = bx(0.03, 0.42, 0.9, '#2a3240', -0.81, 1.2, 0.3, myCar, { roughness: 0.15, metalness: 0.3 });   // the driver's window (it gets cracked open)
const pile = mesh(new THREE.SphereGeometry(1, 16, 10), M('#f4f8fb', { roughness: 1 })); hw.add(pile);
const JAMCARS = []; for (const lane of [-2, 2]) for (let k = 0; k < 40; k++) { const z = 7.5 - k * 7.6 + (lane > 0 ? 3 : 0); if (lane < 0 && Math.abs(z) < 3) continue; const c = sedan(pick(['#3a6ad0', '#e8e8e8', '#2a2a30', '#8a8a92', '#4a6a3a', '#d8a030', '#6a2a3a']), R(0.8, 1.5)); c.position.set(lane + R(-0.15, 0.15), 0, z); c.rotation.y = R(-0.04, 0.04); hw.add(c); JAMCARS.push(c); }
// the plow (dawn): yellow truck with a blade and an orange beacon
const plow = new THREE.Group(); hw.add(plow); { bx(2.5, 2.6, 6, '#e8b020', 0, 1.6, 0, plow); bx(2.4, 1.3, 2, '#e8b020', 0, 2.2, -3.4, plow); bx(3.6, 1.1, 0.25, '#5a5a62', 0, 0.6, -4.8, plow).rotation.y = 0.35; }
const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.2) })); beacon.position.set(0, 3.05, -3.0); plow.add(beacon);
// the hero, out in the snow to clear the pipe
const meS = makePerson(rnd, { top: '#2a4a8a', bottom: '#2a2a30', hair: '#3a2a1a', skin: '#e0b896', shoe: '#1a1a1a', dress: false, shorts: false, longSleeve: true, cap: true, hairStyle: 0.3 }); hw.add(meS.outer);
// snowfall: points that fall and drift; and the gas (carbon monoxide in grey, normal exhaust in white)
const SN_N = 4000; const snGeo = new THREE.BufferGeometry(); const snPos = new Float32Array(SN_N * 3), SN0 = []; for (let i = 0; i < SN_N; i++) SN0.push([R(-14, 14), R(0, 12), R(-40, 12), R(0.6, 1.4)]);
snGeo.setAttribute('position', new THREE.BufferAttribute(snPos, 3)); const snowPts = new THREE.Points(snGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.07, transparent: true, opacity: 0.95, depthWrite: false })); snowPts.frustumCulled = false; hw.add(snowPts);
const gasS = makeSmoke(hw, 260); const _sv = new THREE.Vector3();
const pileAt = t => t < CLEAR + 1.0 ? lerp(0.15, 1.0, smooth(PIPE - 0.5, PIPE + 4.0, t)) : lerp(1.0, 0.12, smooth(CLEAR + 1.0, CLEAR + 3.0, t));
function updateRoad(t, mode) { const night = mode === 'night', white = mode === 'whiteout', dawn = mode === 'dawn';
  const bg = night ? '#141a2a' : white ? '#e6ecf2' : dawn ? '#d9c6d4' : mode === 'jam' ? '#c9d2dc' : '#b8c2ce'; hw.background = new THREE.Color(bg); hw.fog.color.set(bg);
  hw.fog.near = white ? 1.5 : night ? 6 : 14; hw.fog.far = white ? 20 : night ? 55 : dawn ? 170 : 130;
  hwHemi.intensity = night ? 0.3 : white ? 1.25 : dawn ? 0.9 : 1.0; hwHemi.color.set(dawn ? '#ffe0e8' : '#e8f0ff'); hwSun.intensity = night ? 0 : dawn ? 1.3 : 0.7; hwSun.color.set(dawn ? '#ffc8a0' : '#f0f4ff');
  tailMats.forEach(m => m.color.setRGB(night ? 3.0 : 1.2, night ? 0.15 : 0.08, night ? 0.1 : 0.06));
  domeL.intensity = night ? 2.5 : 0; myCar.userData.glass.material = night ? M('#6a5030', { emissive: '#5a3a10', roughness: 0.3 }) : M('#2a3240', { roughness: 0.2, metalness: 0.3 });
  cloth.visible = night || dawn || white; const pos = cloth.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = (i % 7) / 6; pos.setZ(i, 0.05 * Math.sin(t * 9 + x * 6) * x); } pos.needsUpdate = true;
  // the snow pile behind the tailpipe grows, then gets cleared; the window gets cracked
  const p = pileAt(t); pile.position.set(-1.45, 0.12 * p, 2.75); pile.scale.set(0.34 * p + 0.04, 0.3 * p + 0.04, 0.38 * p + 0.04); winPane.position.y = 1.2 - 0.09 * smooth(CLEAR + 3.4, CLEAR + 4.2, t);
  // the hero clears it (clear mode only)
  meS.outer.visible = mode === 'clear'; if (mode === 'clear') { const P = meS; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.outer.position.set(-0.95, 0.55, 3.25); P.outer.rotation.y = -2.4; P.legs[0].rotation.x = -1.3; P.legs[1].rotation.x = -0.7; P.knees[0].rotation.x = 1.9; P.knees[1].rotation.x = 1.2; P.root.rotation.x = 0.35;
    const sweep = fadeWin(t, CLEAR + 0.6, CLEAR + 3.2, 0.3); P.arms[1].rotation.x = -1.2 - 0.25 * sweep; P.arms[1].rotation.z = -0.6 * Math.sin(t * 7) * sweep; P.arms[0].rotation.x = -0.6; if (t > CLEAR + 3.4) { P.outer.position.set(-0.95, 0.95, 3.0); P.legs.forEach(l => l.rotation.x = 0); P.knees.forEach(k => k.rotation.x = 0); P.root.rotation.x = 0; } }
  // gas: grey CO creeping up into the car while the pipe is blocked; white exhaust drifting away once it is clear and the engine runs
  gasS.begin(); const blocked = smooth(PIPE + 2.0, PIPE + 4.0, t) * (1 - smooth(CLEAR + 2.2, CLEAR + 3.0, t)), clean = smooth(CLEAR + 3.0, CLEAR + 3.6, t) * (mode === 'clear' || mode === 'night' ? 1 : 0) * (t < FUEL || mode === 'night' ? 1 : 0);
  if (blocked > 0.01) { smokeMat.uniforms.uTint.value.set('#6a6e78'); for (let k = 0; k < 120; k++) { const u = (t * 0.25 + k / 120) % 1; _sv.set(-1.45 + 0.4 * Math.sin(k * 1.7 + t), 0.35 + u * 1.2, 2.5 - u * 1.6 + 0.2 * Math.cos(k)); gasS.add(_sv, 0.35 + u * 0.6, 0.35 * blocked * Math.sin(Math.PI * u)); } }
  else if (clean > 0.01) { smokeMat.uniforms.uTint.value.set('#f4f6f8'); for (let k = 0; k < 60; k++) { const u = (t * 0.5 + k / 60) % 1; _sv.set(-1.45 + 0.3 * Math.sin(k), 0.35 + u * 0.8, 2.5 + u * 3.0); gasS.add(_sv, 0.3 + u * 0.8, 0.3 * clean * (1 - u)); } }
  gasS.end();
  // the plow arrives at dawn, beacon flashing
  plow.visible = dawn; const pz = lerp(-140, -16, ease(clamp((t - DAWN) / 6, 0, 1))); plow.position.set(4.2, 0, pz); plow.rotation.y = Math.PI; const fl = Math.sin(t * 12) > 0 ? 1 : 0.2; beacon.material.color.setRGB(3 * fl, 1.2 * fl, 0.2 * fl); beaconL.position.set(4.2, 3.3, pz + 3); beaconL.intensity = dawn ? 20 * fl : 0;
  // snowfall: heavy in the whiteout, wind-driven
  const sp = white ? 3.2 : night ? 1.2 : 1.6, wind = white ? 2.5 : 0.5; for (let i = 0; i < SN_N; i++) { const [x0, y0, z0, s] = SN0[i]; snPos[i * 3] = wrapR(x0 + t * wind * s, -14, 14); snPos[i * 3 + 1] = wrapR(y0 - t * sp * s, 0, 12); snPos[i * 3 + 2] = z0; } snGeo.attributes.position.needsUpdate = true;
  snowPts.material.size = white ? 0.11 : 0.07; }
function roadCamera(t, mode) { let pos, look, fov = 50;
  if (mode === 'jam') { const k = smooth(JAM - 0.5, PIPE + 0.5, t); pos = V3(lerp(7, 5, k), lerp(7.5, 5.5, k), lerp(16, 11, k)); look = V3(-1, 0.5, -36); }
  else if (mode === 'pipe') { const k = smooth(PIPE - 0.5, CLEAR + 0.5, t); pos = V3(lerp(-0.4, -0.8, k), lerp(1.0, 0.8, k), lerp(6.6, 5.4, k)); look = V3(-1.5, 0.5, 1.8); }
  else if (mode === 'clear') { const k = smooth(CLEAR - 0.5, FUEL + 0.5, t); pos = V3(lerp(0.4, 0.8, k), lerp(1.3, 1.5, k), lerp(5.6, 6.2, k)); look = V3(-1.6, 0.8, 1.4); }
  else if (mode === 'night') { const k = smooth(NIGHT - 0.5, COLD + 0.5, t); pos = V3(lerp(-0.2, -0.6, k), lerp(2.6, 2.4, k), lerp(4.0, 3.2, k)); look = V3(-1.9, 1.5, 0.6); }
  else if (mode === 'whiteout') { const k = smooth(WALK - 0.5, DAWN + 0.5, t); pos = V3(-3.3, 1.6, lerp(0.8, -1.2, k)); look = V3(-3.6, 1.4, -20); }
  else { const k = smooth(DAWN - 0.5, T_END, t); pos = V3(lerp(1.2, 0.8, k), lerp(3.4, 3.0, k), lerp(9.5, 7.5, k)); look = V3(1.5, 1.2, -24); }
  hwCam.position.copy(pos); hwCam.lookAt(look); hwCam.fov = fov; }
// =================== THE DRIVER'S SEAT (POV, meters): dashboard, wheel, wipers, the fuel gauge, the dome light, snow piling on the glass, frost, your breath ===================
const cab = new THREE.Scene(); const cbCam = new THREE.PerspectiveCamera(58, W / H, 0.02, 300); cab.fog = new THREE.Fog(0xc9d2dc, 6, 60);
const cbHemi = new THREE.HemisphereLight(0xe8f0ff, 0x6a6a70, 0.9); cab.add(cbHemi);
const cbDome = new THREE.PointLight(0xffd8a0, 0, 2.5, 1.5); cbDome.position.set(0, 1.42, -0.05); cab.add(cbDome);
const cbDash = new THREE.PointLight(0x7ac8ff, 0.12, 0.8, 1.5); cbDash.position.set(0, 1.0, -0.45); cab.add(cbDash);
{ bx(1.7, 0.32, 0.65, '#24262c', 0, 0.82, -0.78, cab, { roughness: 0.7 }); bx(0.6, 0.12, 0.28, '#1a1c22', 0, 1.02, -0.62, cab);
  for (const x of [-0.78, 0.78]) { const p = bx(0.08, 0.7, 0.08, '#2a2c32', x, 1.25, -0.82, cab); p.rotation.x = -0.45; }
  bx(1.7, 0.08, 1.2, '#3a3c42', 0, 1.5, -0.25, cab); bx(0.08, 0.6, 1.6, '#2a2c32', -0.84, 1.15, 0.1, cab); bx(0.08, 0.6, 1.6, '#2a2c32', 0.84, 1.15, 0.1, cab);
  const wheel = mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 28), M('#1a1a1e')); wheel.position.set(0, 0.86, -0.45); wheel.rotation.x = -0.35; cab.add(wheel); bx(0.05, 0.05, 0.3, '#1a1a1e', 0, 0.8, -0.55, cab); }
// outside, seen through the glass: the snowy road, the car ahead with its brake lights, falling snow
{ const gnd = mesh(new THREE.PlaneGeometry(200, 200), M('#eef2f6', { roughness: 1 }), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.05; cab.add(gnd);
  for (const x of [-5, 5]) { const b = mesh(new THREE.BoxGeometry(3, 1.0, 200), M('#f2f5f8'), false, true); b.position.set(x, 0.4, -80); cab.add(b); } }
const ahead = sedan('#3a6ad0', 1.2); ahead.position.set(0, 0, -12); cab.add(ahead);
const CS_N = 1500; const csGeo = new THREE.BufferGeometry(); const csPos = new Float32Array(CS_N * 3), CS0 = []; for (let i = 0; i < CS_N; i++) CS0.push([R(-6, 6), R(0, 6), R(-20, -1.1), R(0.6, 1.4)]);
csGeo.setAttribute('position', new THREE.BufferAttribute(csPos, 3)); const csPts = new THREE.Points(csGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.04, transparent: true, depthWrite: false })); csPts.frustumCulled = false; cab.add(csPts);
// snow on the windshield (alpha grows), wipers, frost on the side glass
const flakeTex = canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const x = rnd() * w, y = rnd() * h, r = R(4, 18); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
const wsSnow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.75), new THREE.MeshBasicMaterial({ map: flakeTex, transparent: true, opacity: 0, depthWrite: false, color: new THREE.Color(1.1, 1.1, 1.15) })); wsSnow.position.set(0, 1.2, -0.95); wsSnow.rotation.x = -0.45; cab.add(wsSnow);
const wipers = [-0.35, 0.3].map(x => { const p = grp(x, 0.98, -0.88, 0, cab); bx(0.012, 0.55, 0.012, '#111', 0, 0.27, 0, p); p.rotation.x = -0.45; return p; });
const frostTex = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = rnd() * w, y = rnd() * h; g.strokeStyle = 'rgba(230,240,255,0.55)'; g.lineWidth = R(1, 2.5); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) g.lineTo(x + R(-30, 30), y + R(-30, 30)); g.stroke(); } });
const frostL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false })); frostL.position.set(-0.8, 1.2, 0.05); frostL.rotation.y = Math.PI / 2; cab.add(frostL);
const frostR = frostL.clone(); frostR.material = frostL.material; frostR.position.x = 0.8; frostR.rotation.y = -Math.PI / 2; cab.add(frostR);
const frostW = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.72), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false })); frostW.position.set(0, 1.2, -0.93); frostW.rotation.x = -0.45; cab.add(frostW);
// the fuel gauge (drawn every frame), placed in the cluster
const fgCv = document.createElement('canvas'); fgCv.width = 256; fgCv.height = 256; const fgTex = new THREE.CanvasTexture(fgCv); fgTex.colorSpace = THREE.SRGBColorSpace;
function drawGauge(level) { const g = fgCv.getContext('2d'); g.fillStyle = '#0c0e12'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#e8e8e8'; g.lineWidth = 6; g.beginPath(); g.arc(128, 150, 96, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.fillStyle = '#e8e8e8'; g.font = 'bold 30px Inter, sans-serif'; g.fillText('E', 30, 150); g.fillText('F', 206, 150); g.fillStyle = '#ff9a3a'; g.font = '26px Inter, sans-serif'; g.fillText('⛽', 112, 200);
  const a = Math.PI * (1.15 + 0.7 * level); g.strokeStyle = '#ff5a3a'; g.lineWidth = 7; g.beginPath(); g.moveTo(128, 150); g.lineTo(128 + Math.cos(a) * 86, 150 + Math.sin(a) * 86); g.stroke(); fgTex.needsUpdate = true; }
const gauge = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: fgTex, color: new THREE.Color(1.3, 1.3, 1.3) })); gauge.position.set(0, 1.0, -0.47); gauge.rotation.x = -0.2; cab.add(gauge);
const breath = makeSmoke(cab, 120);
function updateCab(t, mode) { const night = mode === 'cold', dusk = mode === 'fuel';
  const bg = night ? '#121828' : dusk ? '#8a90a8' : '#c9d2dc'; cab.background = new THREE.Color(bg); cab.fog.color.set(bg); cbHemi.intensity = night ? 0.15 : dusk ? 0.5 : 0.9; cbDome.intensity = night ? 1.2 : dusk ? 0.8 : 0;
  tailMats.forEach(m => m.color.setRGB(night || dusk || t < JAM ? 3.0 : 1.2, 0.12, 0.08));
  // driving in: the car ahead brakes and stops; wipers sweep
  ahead.position.z = mode === 'drive' ? lerp(-16, -7, ease(clamp(t / 3.6, 0, 1))) : -7;
  wipers.forEach((w, k) => { w.rotation.z = mode === 'drive' ? (k ? -1 : 1) * (0.2 + 0.9 * (0.5 + 0.5 * Math.sin(t * 5))) : (k ? -0.2 : 0.2); });
  wsSnow.material.opacity = mode === 'drive' ? 0.18 : dusk ? 0.5 : 0.55; frostL.material.opacity = night ? 0.8 * smooth(COLD, COLD + 3, t) : 0; frostW.material.opacity = night ? 0.5 * smooth(COLD + 1, COLD + 4, t) : 0;
  // fuel: one hour of idling vs ten minutes an hour (the needle barely moves in bursts)
  drawGauge(dusk ? (t < FUEL + 3.5 ? lerp(0.85, 0.35, smooth(FUEL + 0.6, FUEL + 3.2, t)) : lerp(0.85, 0.78, smooth(FUEL + 3.8, FUEL + 6.6, t))) : 0.85);
  // breath puffs in the cold
  breath.begin(); smokeMat.uniforms.uTint.value.set('#e8eef8'); if (night) for (let k = 0; k < 40; k++) { const ph = ((t - COLD) / 2.2) % 1, u = (ph + k * 0.004) % 1; if (u > 0.6) continue; breath.add(V3(0.02 * Math.sin(k), 1.1 + u * 0.12, -0.35 - u * 0.5), 0.02 + u * 0.07, 0.5 * (1 - u / 0.6) * smooth(COLD + 0.3, COLD + 1, t)); } breath.end();
  const sp = night ? 1.0 : 1.6; for (let i = 0; i < CS_N; i++) { const [x0, y0, z0, s] = CS0[i]; csPos[i * 3] = x0 + 0.3 * Math.sin(t + i); csPos[i * 3 + 1] = wrapR(y0 - t * sp * s, 0, 6); csPos[i * 3 + 2] = z0; } csGeo.attributes.position.needsUpdate = true; }
function cabCamera(t, mode) { let pos, look, fov = 58;
  if (mode === 'drive') { pos = V3(0.01 * Math.sin(t * 13), 1.27 + 0.006 * Math.sin(t * 17), 0.2); look = V3(0, 1.12, -8); }
  else if (mode === 'fuel') { const k = smooth(FUEL - 0.4, FUEL + 1.2, t); pos = V3(0, lerp(1.27, 1.08, k), lerp(0.2, -0.12, k)); look = V3(0, lerp(1.12, 0.93, k), lerp(-8, -0.47, k)); fov = lerp(58, 44, k); }
  else { const k = smooth(COLD - 0.4, WALK, t); pos = V3(0.02 * Math.sin(t * 9) * smooth(COLD + 3, COLD + 5, t), 1.17, 0.2); look = V3(lerp(-0.2, -0.9, k), 1.12, lerp(-3, -1.5, k)); }
  cbCam.position.copy(pos); cbCam.lookAt(look); cbCam.fov = fov; }
// =================== schedule, DOM, render ===================
const SCN = { drive: [t => updateCab(t, 'drive'), t => cabCamera(t, 'drive'), cab, () => cbCam], jam: [t => updateRoad(t, 'jam'), t => roadCamera(t, 'jam'), hw, () => hwCam],
  pipe: [t => updateRoad(t, 'pipe'), t => roadCamera(t, 'pipe'), hw, () => hwCam], clear: [t => updateRoad(t, 'clear'), t => roadCamera(t, 'clear'), hw, () => hwCam],
  fuel: [t => updateCab(t, 'fuel'), t => cabCamera(t, 'fuel'), cab, () => cbCam], night: [t => updateRoad(t, 'night'), t => roadCamera(t, 'night'), hw, () => hwCam],
  cold: [t => updateCab(t, 'cold'), t => cabCamera(t, 'cold'), cab, () => cbCam], whiteout: [t => updateRoad(t, 'whiteout'), t => roadCamera(t, 'whiteout'), hw, () => hwCam],
  dawn: [t => updateRoad(t, 'dawn'), t => roadCamera(t, 'dawn'), hw, () => hwCam] };
const SEQ = [[0, 'drive'], [JAM, 'jam'], [PIPE, 'pipe'], [CLEAR, 'clear'], [FUEL, 'fuel'], [NIGHT, 'night'], [COLD, 'cold'], [WALK, 'whiteout'], [DAWN, 'dawn']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return 1.0; }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you got stuck<br>in your car in a<br><span class="hl">snowstorm</span>?'; el.endT.innerHTML = 'What if you got stuck in your car in a <span class="hl">snowstorm</span>?';
el.endS.innerHTML = 'I-95, VIRGINIA, JAN 2022: ~50 MILES CLOSED, SOME DRIVERS STUCK ~27 HOURS.<br>NWS: STAY IN THE CAR, RUN THE ENGINE A FEW MINUTES EACH HOUR, KEEP THE TAILPIPE CLEAR.<br>HYPOTHERMIA = BODY TEMPERATURE BELOW 95°F (35°C).';
const captions = [
  [4.4, 7.0, '2022, Virginia: 50 miles<br>of I-95 froze.'],
  [7.1, 9.8, 'Some drivers were stuck<br>for 27 hours.'],
  [10.4, 12.8, 'The real danger<br>isn’t the cold.'],
  [12.9, 16.8, 'Snow blocks the tailpipe —<br>carbon monoxide fills the car.<br>You can’t smell it.'],
  [17.4, 20.4, 'Clear the tailpipe.<br>Crack a window.'],
  [20.5, 23.8, 'Run the engine<br>~10 minutes an hour.'],
  [24.4, 27.4, 'Idling burns ¼–½<br>gallon an hour.'],
  [27.5, 30.8, 'In 10-minute bursts, a full tank<br>lasts days, not hours.'],
  [31.4, 37.8, 'At night: dome light on.<br>Tie something bright<br>to the antenna.'],
  [38.4, 41.3, 'Body temperature below 95°F<br>= hypothermia.'],
  [41.4, 44.8, 'Shivering. Confusion.<br>Slurred speech.'],
  [45.4, 48.3, 'Don’t walk away.'],
  [48.4, 51.8, 'Your car is easier<br>to find than you are.'],
  [52.4, 55.8, 'Stay put. Stay ventilated.<br>Stay visible.'],
  [56.0, 59.8, 'Do you keep a blanket<br>in your car?'],
];
const RED = '<b></b>', GREEN = '<b style="background:#5fd27a"></b>', BLUE = '<b style="background:#5ad8ff"></b>';
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < JAM) return [BLUE + 'SNOWSTORM', 'OUTSIDE', '10°F', 'AND FALLING'];
  if (t < PIPE) return [RED + 'VIRGINIA · JAN 2022', 'STUCK FOR UP TO', '27 hours', '50 MILES OF I-95'];
  if (t < CLEAR) return [RED + 'TAILPIPE BLOCKED', 'DANGER', 'CO gas', 'NO SMELL · NO COLOR'];
  if (t < FUEL) return [GREEN + 'FIXED', 'ENGINE', '10 min/hr', 'WINDOW CRACKED OPEN'];
  if (t < FUEL + 3.5) return [RED + 'IDLING NONSTOP', 'FUEL BURN', '¼–½ gal/h', 'FULL TANK: ~1–2 DAYS'];
  if (t < NIGHT) return [GREEN + '10 MINUTES EVERY HOUR', 'FULL TANK', '~6–12 days', 'INSTEAD OF 1–2'];
  if (t < COLD) return [BLUE + 'NIGHT', 'BE SEEN', 'light + red', 'DOME LIGHT · CLOTH ON ANTENNA'];
  if (t < WALK) return [RED + 'BODY TEMPERATURE', 'HYPOTHERMIA', '< 95°F', 'SHIVERING · CONFUSION'];
  if (t < DAWN) return [RED + 'WHITEOUT', 'VISIBILITY', 'near zero', 'STAY WITH THE CAR'];
  return [GREEN + 'MORNING', 'THE RULE', 'stay put', 'VENTILATED · VISIBLE']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(0.9, 1.4, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  if (!B || mix < 1) shootScene(A, t, RTA); if (B) shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0.22 * fadeWin(t, PIPE + 2.5, CLEAR + 0.4, 0.6) + 0.15 * fadeWin(t, COLD + 1.5, WALK + 0.2, 0.8);   // CO danger, then the cold
  composite(B ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
