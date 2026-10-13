import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// "What if you were a cat for a day?" — cat's-eye view of a realistic living room (Poly Haven scans), cat vision post pass.
// (head copied from parts_hole/h_head.js) realistic look: Poly Haven HDRI + photoscanned PBR textures + glTF scans,
// Solar System Scope 8k Earth maps, three.js Water/Sky, post: depth of field, bloom, grain, vignette (AgX tone mapping).
// Numbers: tools/hole_math.py (PREM): 7,919 mi through, 38.1 min fall, 22,188 mph at the center, 1.09 G at the core boundary.
// Assets: python3 tools/fetch_hole_assets.py  (-> assets/hole/, git-ignored)
const A = 'assets/cat/';
// =================== rng / helpers ===================
let seed = 7741;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const fadeWin = (t, a, b, f = 0.35) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const fmt = n => Math.round(n).toLocaleString('en-US');

// =================== renderer + post ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera()); composer.addPass(renderPass);
const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 1.5, aperture: 0.004, maxblur: 0.008 }); composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.25, 0.6, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
// cat vision: dichromat colour (no red/green cones), lower acuity (blur), barrel distortion of a wide field of view, night gain + noise
const catPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uCat: { value: 0 }, uNight: { value: 0 }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uCat, uNight, uT; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT*31.7)*43758.5453); }
    vec3 samp(vec2 uv, float r){ vec3 c=vec3(0.0); float w=0.0; for(int i=-3;i<=3;i++) for(int j=-3;j<=3;j++){ vec2 o=vec2(float(i),float(j)); float k=exp(-dot(o,o)/6.0); c+=texture2D(tDiffuse,uv+o*r/uRes).rgb*k; w+=k; } return c/w; }
    void main(){ vec2 q=vUv-0.5; q.x*=0.5625; float r2=dot(q,q);
      vec2 uv=0.5+(vUv-0.5)*(1.0-uCat*0.07*r2*4.0);                      // barrel: a wider field of view squeezed in
      vec3 c=texture2D(tDiffuse,uv).rgb;
      float blur=uCat*(0.9+3.0*smoothstep(0.03,0.2,r2));               // acuity ~20/100 – 20/200, worse at the edges
      if(blur>0.05) c=samp(uv,blur);
      // dichromat (deuteranope-like) matrix, Machado et al. 2009, severity 1
      vec3 d=mat3(0.367322,0.280085,-0.011820, 0.860646,0.672501,0.042940, -0.227968,0.047413,0.968881)*c;
      d=mix(d, vec3(dot(d,vec3(0.3,0.6,0.1))), 0.12); d.b=mix(d.b, c.b*1.05, 0.5);
      c=mix(c,d,uCat*0.9);
      vec3 nv=c*4.2; nv=mix(nv, vec3(dot(nv,vec3(0.3,0.59,0.11)))*vec3(0.85,0.95,1.1), 0.6); c=mix(c, nv+(h(vUv*uRes)-0.5)*0.07, uNight);                     // ~6x less light needed
      gl_FragColor=vec4(c,1.0); }`,
}); composer.addPass(catPass);
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uGrain: { value: 0.03 }, uVig: { value: 0.32 }, uCon: { value: 1.1 }, uSat: { value: 1.15 }, uWarm: { value: 0.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uGrain, uVig, uCon, uSat, uWarm; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT*61.7)*43758.5453); }
    void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 q=vUv-0.5; q.x*=0.5625;
      float v=1.0-uVig*smoothstep(0.18,0.75,length(q)*1.35); c.rgb*=v;
      float l=dot(c.rgb,vec3(0.299,0.587,0.114)); c.rgb=mix(vec3(l),c.rgb,uSat); c.rgb=(c.rgb-0.5)*uCon+0.5; c.rgb*=vec3(1.0+uWarm,1.0,1.0-uWarm);
      c.rgb+=(h(vUv*vec2(1080.0,1920.0))-0.5)*uGrain; gl_FragColor=c; }`,
}); composer.addPass(grain);
function post(scene, cam, o) {
  renderPass.scene = scene; renderPass.camera = cam;
  bokeh.enabled = !!o.dof; if (o.dof) { bokeh.scene = scene; bokeh.camera = cam; bokeh.uniforms.focus.value = o.dof.focus; bokeh.uniforms.aperture.value = o.dof.aperture; bokeh.uniforms.maxblur.value = o.dof.maxblur; bokeh.uniforms.aspect.value = cam.aspect; bokeh.uniforms.nearClip.value = cam.near; bokeh.uniforms.farClip.value = cam.far; }
  bloom.strength = o.bloom ?? 0.25; bloom.radius = o.bloomR ?? 0.6; bloom.threshold = o.bloomT ?? 0.92;
  renderer.toneMappingExposure = o.exp ?? 1.0;
  grain.uniforms.uCon.value = o.con ?? 1.1; grain.uniforms.uSat.value = o.sat ?? 1.15; grain.uniforms.uWarm.value = o.warm ?? 0;
}

// =================== loaders ===================
const texLoader = new THREE.TextureLoader(), rgbe = new RGBELoader(), gltfLoader = new GLTFLoader();
function texP(path, srgb = true, rep = null) { return new Promise(ok => texLoader.load(A + path, t => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } ok(t); })); }
async function pbrSet(name, rep) {
  const [map, nor, arm] = await Promise.all([texP(`tex/${name}_diff.jpg`, true, rep), texP(`tex/${name}_nor.jpg`, false, rep), texP(`tex/${name}_arm.jpg`, false, rep)]);
  return { map, nor, arm };
}
const gltf = path => new Promise((ok, bad) => gltfLoader.load(A + path, ok, undefined, bad));
const hdrP = path => new Promise((ok, bad) => rgbe.load(A + path, ok, undefined, bad));
const pmrem = new THREE.PMREMGenerator(renderer);
// brightest direction of an equirect HDR (the sun) in three.js world coordinates
function hdrSunDir(hdr) {
  const { data, width: w, height: h } = hdr.image; const half = data instanceof Uint16Array; let best = -1, bi = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; const r = half ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i]; const g = half ? THREE.DataUtils.fromHalfFloat(data[i + 1]) : data[i + 1]; const l = r + g; if (l > best) { best = l; bi = y * w + x; } }
  const px = bi % w, py = Math.floor(bi / w);
  const u = (px + 0.5) / w, v = 1 - (py + 0.5) / h;               // flipY: row 0 of the data is the top of the image
  const phi = (u - 0.5) * 2 * Math.PI, th = (v - 0.5) * Math.PI;
  return new THREE.Vector3(Math.cos(th) * Math.cos(phi), Math.sin(th), Math.cos(th) * Math.sin(phi)).normalize();
}

// =================== LIVING ROOM (meters): parquet, plaster walls, a sunny window, scanned furniture ===================
const room = new THREE.Scene();
const rCam = new THREE.PerspectiveCamera(60, W / H, 0.02, 60);
const sun = new THREE.DirectionalLight(0xffe2b8, 6.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 }); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.01; sun.shadow.radius = 2;
sun.position.set(-3.5, 3.2, -6.0); sun.target.position.set(0.4, 0, 0.6); room.add(sun, sun.target);
const lampL = new THREE.PointLight(0xffb86a, 0, 6, 2); lampL.position.set(1.9, 1.1, -1.8); room.add(lampL);
const ROOM = { w: 6.0, d: 6.0, h: 2.7 };
async function pbrMat(name, rep, o = {}) { const p = await pbrSet(name, rep); return new THREE.MeshStandardMaterial({ map: p.map, normalMap: p.nor, roughnessMap: p.arm, aoMap: p.arm, roughness: 1, ...o }); }
async function placeModel(id, x, y, z, ry = 0, s = 1) {
  const g = (await gltf(`models/${id}/${id}.gltf`)).scene; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); room.add(g); return g;
}
const props = {};
async function buildRoom() {
  const hdr = await hdrP('hdri/lythwood_room_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  room.environment = pmrem.fromEquirectangular(hdr).texture; room.environmentIntensity = 0.6;
  const outHdr = await hdrP('hdri/grasslands_sunset_2k.hdr'); outHdr.mapping = THREE.EquirectangularReflectionMapping; room.background = outHdr; room.backgroundRotation.set(0, 1.9, 0); room.userData.day = outHdr;
  const floorM = await pbrMat('diagonal_parquet', [1, 1], { color: new THREE.Color('#c9b7a2') }); for (const t of [floorM.map, floorM.normalMap, floorM.roughnessMap]) t.repeat.set(ROOM.w / 1.2, ROOM.d / 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; room.add(floor);
  const wp = await pbrSet('clay_plaster', [3, 1.4]); for (const t of [wp.nor]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.4); }
  const wallM = new THREE.MeshStandardMaterial({ color: '#ebe4d8', roughness: 0.92, normalMap: wp.nor, normalScale: new THREE.Vector2(0.35, 0.35) });
  const wall = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ROOM.h), wallM); m.position.set(x, ROOM.h / 2, z); m.rotation.y = ry; m.receiveShadow = true; room.add(m); return m; };
  // back wall with a window opening (two wall pieces + lintel + sill)
  const WX0 = -1.6, WX1 = -0.2, WY0 = 0.75, WY1 = 2.2, BZ = -ROOM.d / 2;
  const seg = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), wallM); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, BZ); m.receiveShadow = true; m.castShadow = true; room.add(m); };
  seg(-ROOM.w / 2, WX0, 0, ROOM.h); seg(WX1, ROOM.w / 2, 0, ROOM.h); seg(WX0, WX1, 0, WY0); seg(WX0, WX1, WY1, ROOM.h);
  
  const frameM = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 });
  for (const [w, h, x, y] of [[WX1 - WX0 + 0.1, 0.06, (WX0 + WX1) / 2, WY0], [WX1 - WX0 + 0.1, 0.06, (WX0 + WX1) / 2, WY1], [0.06, WY1 - WY0, WX0, (WY0 + WY1) / 2], [0.06, WY1 - WY0, WX1, (WY0 + WY1) / 2], [0.04, WY1 - WY0, (WX0 + WX1) / 2, (WY0 + WY1) / 2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameM); b.position.set(x, y, BZ); b.castShadow = true; room.add(b); }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(WX1 - WX0 + 0.3, 0.04, 0.25), frameM); sill.position.set((WX0 + WX1) / 2, WY0 - 0.02, BZ + 0.1); sill.castShadow = true; room.add(sill);
  wall(ROOM.d, -ROOM.w / 2, 0, Math.PI / 2); wall(ROOM.d, ROOM.w / 2, 0, -Math.PI / 2); wall(ROOM.w, 0, ROOM.d / 2, Math.PI);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ color: '#f3efe8', roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; room.add(ceil);
  // baseboards
  for (const [w, x, z, ry] of [[ROOM.w, 0, BZ + 0.01, 0], [ROOM.d, -ROOM.w / 2 + 0.01, 0, Math.PI / 2], [ROOM.d, ROOM.w / 2 - 0.01, 0, -Math.PI / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.02), frameM); b.position.set(x, 0.05, z); b.rotation.y = ry; b.receiveShadow = true; room.add(b); }
  // rug
  const rugM = await pbrMat('fabric_pattern_05', [1, 1]); for (const t of [rugM.map, rugM.normalMap, rugM.roughnessMap]) t.repeat.set(2.2, 1.6);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.012, 1.9), rugM); rug.position.set(0.2, 0.006, 0.0); rug.receiveShadow = true; room.add(rug);
  // furniture (real sizes)
  props.sofa = await placeModel('sofa_02', 0.25, 0, -1.55, 0, 1.15);
  props.table = await placeModel('modern_coffee_table_01', 0.2, 0.012, 0.05, Math.PI / 2);
  props.chair = await placeModel('modern_arm_chair_01', 1.85, 0, 0.4, -1.2);
  props.shelf = await placeModel('wooden_bookshelf_worn', 2.6, 0, -1.6, -Math.PI / 2);
  props.plant = await placeModel('potted_plant_02', -2.2, 0.1, -2.3, 0.4, 1.5);
  props.side = await placeModel('side_table_01', 1.75, 0, -1.5, 0.2);
  props.pillow = await placeModel('throw_pillows_01', -0.9, 0.26, 1.0, 0.5);
  props.duck = await placeModel('rubber_duck_toy', 0.05, 0.012, 0.75, 2.7, 0.55);
}

// =================== look test: t<1 human eye height, 1-2 cat day, 2-3 cat night ===================
const $ = id => document.getElementById(id);
window.renderAt = (t) => {
  grain.uniforms.uT.value = t; catPass.uniforms.uT.value = t;
  const cat = t >= 1, night = t >= 2;
  if (!cat) { rCam.fov = 55; rCam.position.set(0.9, 1.62, 2.4); rCam.lookAt(-0.2, 0.55, -1.2); }
  else { rCam.fov = 74; rCam.position.set(0.42, 0.2, 1.5); rCam.lookAt(-0.05, 0.3, -0.9); }
  rCam.updateProjectionMatrix();
  sun.intensity = night ? 1.1 : 6.0; sun.color.set(night ? '#8fa8ff' : '#ffe2b8'); room.background = night ? new THREE.Color('#0a1226') : room.userData.day; room.environmentIntensity = night ? 0.03 : 0.55; lampL.intensity = 0;
  catPass.uniforms.uCat.value = cat ? 1 : 0; catPass.uniforms.uNight.value = night ? 1 : 0;
  const fd = cat ? rCam.position.distanceTo(props.duck.position) : rCam.position.distanceTo(new THREE.Vector3(0.2, 0.4, 0));
  post(room, rCam, { dof: { focus: fd, aperture: cat ? 0.012 : 0.002, maxblur: cat ? 0.01 : 0.004 }, bloom: night ? 0.1 : 0.25, bloomT: 1.2, exp: night ? 1.0 : 0.9, con: 1.08, sat: 1.1, warm: cat ? 0 : 0.03 });
  composer.render();
  $('lbl').textContent = !cat ? 'HUMAN · 5 FT 4 IN' : night ? 'CAT · NIGHT (6× LESS LIGHT NEEDED)' : 'CAT · 10 IN OFF THE FLOOR';
  $('wh').style.opacity = 0;
  return true;
};
window.sceneReady = (async () => { await buildRoom(); await document.fonts.ready; window.renderAt(0); return true; })();
