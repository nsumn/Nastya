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

// "What if you were a cat for one day?" — a cat's-eye day in a realistic house + street (Poly Haven CC0 scans/HDRIs),
// cat-vision post pass (dichromat colour, low acuity, wide view, night gain), split-screen YOU / CAT comparisons.
// Assets: python3 tools/fetch_ph.py cat ... (see HANDOFF.md) -> assets/cat/ (git-ignored)
// =================== timeline ===================
const HEAR = 3.0, CHASE = 8.0, POUNCE = 14.0, COLOR = 17.0, BLUR = 28.0, OUT = 32.0, NIGHT = 41.0, TASTE = 47.0, SLEEP = 52.0, T_END = 59.0;
const A = 'assets/cat/';
// =================== helpers ===================
let seed = 4242;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const fadeWin = (t, a, b, f = 0.35) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// =================== renderer + composers ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const CAT_SHADER = {
  uniforms: { tDiffuse: { value: null }, uCat: { value: 0 }, uNight: { value: 0 }, uMotion: { value: 0 }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) }, uWide: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uCat, uNight, uMotion, uT, uWide; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT*31.7)*43758.5453); }
    vec3 samp(vec2 uv, float r){ vec3 c=vec3(0.0); float w=0.0; for(int i=-3;i<=3;i++) for(int j=-3;j<=3;j++){ vec2 o=vec2(float(i),float(j)); float k=exp(-dot(o,o)/6.0); c+=texture2D(tDiffuse,uv+o*r/uRes).rgb*k; w+=k; } return c/w; }
    void main(){ vec2 q=vUv-0.5; q.x*=uRes.x/uRes.y; float r2=dot(q,q);
      vec2 uv=0.5+(vUv-0.5)*(1.0-uCat*(0.07+0.2*uWide)*r2*4.0);
      vec3 c=texture2D(tDiffuse,uv).rgb;
      float blur=uCat*(0.8+3.0*smoothstep(0.03,0.2,r2));
      if(blur>0.05) c=samp(uv,blur);
      if(uMotion>0.001){ vec3 m=vec3(0.0); for(int k=0;k<8;k++){ float s=1.0-float(k)*0.012*uMotion; m+=texture2D(tDiffuse,0.5+(uv-0.5)*s).rgb; } c=mix(c,m/8.0,0.85); }
      vec3 d=mat3(0.367322,0.280085,-0.011820, 0.860646,0.672501,0.042940, -0.227968,0.047413,0.968881)*c;   // dichromat (Machado 2009)
      d=mix(d, vec3(dot(d,vec3(0.3,0.6,0.1))), 0.12); d.b=mix(d.b, c.b*1.05, 0.5);
      d*=vec3(0.9,0.96,1.18); c=mix(c,d,uCat*0.92);
      vec3 nv=c*4.2; nv=mix(nv, vec3(dot(nv,vec3(0.3,0.59,0.11)))*vec3(0.85,0.95,1.1), 0.6); c=mix(c, nv+(h(vUv*uRes)-0.5)*0.07, uNight);
      gl_FragColor=vec4(c,1.0); }`,
};
const GRAIN_SHADER = {
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uGrain: { value: 0.03 }, uVig: { value: 0.3 }, uCon: { value: 1.08 }, uSat: { value: 1.1 }, uLid: { value: 0 }, uAsp: { value: 0.5625 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uGrain, uVig, uCon, uSat, uLid, uAsp; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT*61.7)*43758.5453); }
    void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 q=vUv-0.5; q.x*=uAsp;
      c.rgb*=1.0-uVig*smoothstep(0.18,0.75,length(q)*1.35);
      float l=dot(c.rgb,vec3(0.299,0.587,0.114)); c.rgb=mix(vec3(l),c.rgb,uSat); c.rgb=(c.rgb-0.5)*uCon+0.5;
      c.rgb+=(h(vUv*vec2(1080.0,1920.0))-0.5)*uGrain;
      float lid=smoothstep(uLid-0.06,uLid,abs(vUv.y-0.5)*2.0*(1.0+0.15*q.x*q.x)); c.rgb*=1.0-lid*smoothstep(0.0,0.02,uLid);   // eyelids closing
      gl_FragColor=c; }`,
};
function makeComp(w, h, toScreen) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const c = new EffectComposer(renderer, rt); c.setPixelRatio(1); c.setSize(w, h); c.renderToScreen = toScreen;
  const rp = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera()); c.addPass(rp);
  const bk = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 1, aperture: 0.002, maxblur: 0.005 }); c.addPass(bk);
  const bl = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.25, 0.6, 1.2); c.addPass(bl);
  c.addPass(new OutputPass());
  const cp = new ShaderPass(CAT_SHADER); cp.uniforms.uRes.value.set(w, h); c.addPass(cp);
  const gr = new ShaderPass(GRAIN_SHADER); gr.uniforms.uAsp.value = w / h; c.addPass(gr);
  return { c, rp, bk, bl, cp, gr, w, h };
}
const FULL = makeComp(W, H, true), TOP = makeComp(W, H / 2, false), BOT = makeComp(W, H / 2, false);
function post(comp, scene, cam, o, t) {
  cam.aspect = comp.w / comp.h; cam.updateProjectionMatrix();
  comp.rp.scene = scene; comp.rp.camera = cam;
  comp.bk.enabled = !!o.dof; if (o.dof) { comp.bk.scene = scene; comp.bk.camera = cam; const u = comp.bk.uniforms; u.focus.value = o.dof.focus; u.aperture.value = o.dof.aperture; u.maxblur.value = o.dof.maxblur; u.aspect.value = cam.aspect; u.nearClip.value = cam.near; u.farClip.value = cam.far; }
  comp.bl.strength = o.bloom ?? 0.25; comp.bl.threshold = o.bloomT ?? 1.2; comp.bl.radius = 0.6;
  renderer.toneMappingExposure = o.exp ?? 1.0;
  const cu = comp.cp.uniforms; cu.uCat.value = o.cat ?? 0; cu.uNight.value = o.night ?? 0; cu.uMotion.value = o.motion ?? 0; cu.uWide.value = o.wide ?? 0; cu.uT.value = t;
  const gu = comp.gr.uniforms; gu.uT.value = t; gu.uCon.value = o.con ?? 1.08; gu.uSat.value = o.sat ?? 1.1; gu.uLid.value = o.lid ?? 0;
  comp.c.render();
}
// split screen: two half-height composers composited to the canvas
const splitScene = new THREE.Scene(), splitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const splitMat = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, tB: { value: null } }, depthTest: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: 'uniform sampler2D tA, tB; varying vec2 vUv; void main(){ vec4 c = vUv.y>0.5 ? texture2D(tA, vec2(vUv.x,(vUv.y-0.5)*2.0)) : texture2D(tB, vec2(vUv.x,vUv.y*2.0)); if(abs(vUv.y-0.5)<0.0016) c=vec4(1.0); gl_FragColor=c; }' });
splitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), splitMat));
function presentSplit() { splitMat.uniforms.tA.value = TOP.c.readBuffer.texture; splitMat.uniforms.tB.value = BOT.c.readBuffer.texture; renderer.setRenderTarget(null); renderer.toneMapping = THREE.NoToneMapping; renderer.render(splitScene, splitCam); renderer.toneMapping = THREE.ACESFilmicToneMapping; }

// =================== loaders ===================
const texLoader = new THREE.TextureLoader(), rgbe = new RGBELoader(), gltfLoader = new GLTFLoader();
function texP(path, srgb = true, rep = null) { return new Promise((ok, bad) => texLoader.load(A + path, t => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } ok(t); }, undefined, () => bad(new Error('missing ' + path)))); }
async function pbrSet(name, rep) { const [map, nor, arm] = await Promise.all([texP(`tex/${name}_diff.jpg`, true, rep), texP(`tex/${name}_nor.jpg`, false, rep), texP(`tex/${name}_arm.jpg`, false, rep)]); return { map, nor, arm }; }
const gltf = path => new Promise((ok, bad) => gltfLoader.load(A + path, ok, undefined, () => bad(new Error('missing ' + path))));
const hdrP = path => new Promise((ok, bad) => rgbe.load(A + path, ok, undefined, () => bad(new Error('missing ' + path))));
const pmrem = new THREE.PMREMGenerator(renderer);

// =================== LIVING ROOM (meters): parquet, plaster walls, a sunny window, scanned furniture ===================
const room = new THREE.Scene();
const rCam = new THREE.PerspectiveCamera(60, W / H, 0.02, 60);
const sun = new THREE.DirectionalLight(0xfff0e2, 6.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
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
  const floorM = await pbrMat('diagonal_parquet', [1, 1], { color: new THREE.Color('#b4aca4') }); for (const t of [floorM.map, floorM.normalMap, floorM.roughnessMap]) t.repeat.set(ROOM.w / 1.2, ROOM.d / 1.2);
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
  props.duck = await placeModel('rubber_duck_toy', 0.42, 0.012, 0.95, 2.6, 0.45);
  // colour line-up on the rug (real objects + a pumpkin and a blue ball)
  props.apple = await placeModel('food_apple_01', -0.62, 0.012, 0.95, 0.3, 1.3);
  props.lime = await placeModel('food_lime_01', -0.38, 0.012, 1.0, 0, 1.4);
  props.lemon = await placeModel('lemon', 0.15, 0.06, 1.02, 0.4, 1.3);
  { const g = new THREE.Group(); const pg = new THREE.SphereGeometry(0.09, 48, 24); const pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); const a = Math.atan2(z, x); const k = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 5)), 0.5); pp.setXYZ(i, x * k, y * 0.78 * (1 - 0.15 * Math.pow(Math.abs(y / 0.09), 6)), z * k); }
    pg.computeVertexNormals(); const pm = new THREE.MeshStandardMaterial({ color: '#e8701a', roughness: 0.55 }); const pu = new THREE.Mesh(pg, pm); pu.position.y = 0.07; pu.castShadow = pu.receiveShadow = true; g.add(pu);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#4a6a2a', roughness: 0.8 })); st.position.y = 0.15; st.rotation.z = 0.25; g.add(st);
    g.position.set(-0.1, 0.012, 0.98); room.add(g); props.pumpkin = g; }
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 40, 24), new THREE.MeshPhysicalMaterial({ color: '#1f5fe0', roughness: 0.25, clearcoat: 0.6 })); b.position.set(0.72, 0.062, 0.98); b.castShadow = b.receiveShadow = true; room.add(b); props.blue = b; }
  // the mouse (a photoscanned rodent, mouse-sized) and its hole in the left baseboard
  props.mouse = await placeModel('street_rat', 2.3, 0.0, -1.0, 0, 1.0);
  { const hole = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#050403' })); hole.position.set(-ROOM.w / 2 + 0.025, 0.0, 0.6); hole.rotation.y = Math.PI / 2; room.add(hole); props.hole = hole; }
  // the front door (right wall) with a cat flap
  { const dm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.45 }); const g = new THREE.Group(); g.position.set(ROOM.w / 2 - 0.04, 0, 1.8); g.rotation.y = -Math.PI / 2; room.add(g);
    const piece = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), dm); m.position.set(x, y, 0); m.castShadow = m.receiveShadow = true; g.add(m); };
    const FW = 0.2, FY0 = 0.05, FY1 = 0.27; piece(0.9, 2.05 - FY1, 0, (FY1 + 2.05) / 2); piece(0.9, FY0, 0, FY0 / 2); piece((0.9 - FW) / 2, FY1 - FY0, -(0.9 + FW) / 4, (FY0 + FY1) / 2); piece((0.9 - FW) / 2, FY1 - FY0, (0.9 + FW) / 4, (FY0 + FY1) / 2);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: '#b8a070', metalness: 0.9, roughness: 0.3 })); knob.position.set(0.36, 1.0, 0.05); g.add(knob);
    const flapPivot = new THREE.Group(); flapPivot.position.set(0, FY1, 0); g.add(flapPivot);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(FW, FY1 - FY0, 0.006), new THREE.MeshPhysicalMaterial({ color: '#c8c0b0', roughness: 0.2, transmission: 0.3, transparent: true, opacity: 0.85 })); flap.position.y = -(FY1 - FY0) / 2; flapPivot.add(flap);
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(FW, FY1 - FY0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 3.0, 2.8) })); outside.position.set(0, (FY0 + FY1) / 2, -0.03); g.add(outside);
    for (const [w, h, x, y] of [[0.06, 2.1, -0.48, 1.05], [0.06, 2.1, 0.48, 1.05], [1.02, 0.06, 0, 2.08]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameM); m.position.set(x, y, 0.01); g.add(m); }
    props.door = g; props.flap = flapPivot; }
  // food corner: bowl + a slice of cake on the floor
  props.bowl = await placeModel('wooden_bowl_01', 2.35, 0, 2.55, 0, 0.8);
  props.cake = await placeModel('strawberry_chocolate_cake', 2.0, 0, 2.62, 0.6, 0.8);
}

// =================== STREET (meters): suburban street HDRI on a grounded skybox + scanned grass, a fire hydrant, a trash can, sparrows ===================
const street = new THREE.Scene();
const sCam = new THREE.PerspectiveCamera(70, W / H, 0.02, 400);
const stSun = new THREE.DirectionalLight(0xfff4e6, 4.0); stSun.castShadow = true; stSun.shadow.mapSize.set(2048, 2048);
Object.assign(stSun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 40 }); stSun.shadow.bias = -0.0003; street.add(stSun, stSun.target);
const night = new THREE.Scene();
const STREET = {};
const sparrows = [];
async function buildStreet() {
  const hdr = await hdrP('hdri/suburban_garden_4k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  street.environment = pmrem.fromEquirectangular(hdr).texture; street.environmentIntensity = 1.0;
  const sky = new GroundedSkybox(hdr, 1.7, 80); sky.position.y = 1.7 - 0.01; street.add(sky);
  stSun.position.set(-8, 10, -4); stSun.target.position.set(0, 0, -2);
  // a real grass verge under the paws (scanned grass clumps on a lawn texture), faded into the photo
  const g = await pbrSet('leafy_grass', [6, 6]);
  const fadeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(5, 64), new THREE.MeshStandardMaterial({ map: g.map, normalMap: g.nor, roughnessMap: g.arm, roughness: 1, color: new THREE.Color('#8fbf5a'), alphaMap: fadeTex, transparent: true, depthWrite: false }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.002; lawn.receiveShadow = true; street.add(lawn);
  const clumps = []; for (const f of ['grass_medium_01', 'grass_medium_02']) { const gl = await gltf(`models/${f}/${f}.gltf`); gl.scene.traverse(o => { if (o.isMesh && /small|tiny|grass_medium_02/.test(o.name) && !/LOD[12]/.test(o.name)) clumps.push(o); }); }
  const o3 = new THREE.Object3D(); const per = Math.round(6000 / clumps.length);
  for (const c of clumps) { const im = new THREE.InstancedMesh(c.geometry, c.material, per); c.material.side = THREE.DoubleSide; c.material.alphaTest = 0.5;
    for (let k = 0; k < per; k++) { const a = R(0, 6.28), r = Math.pow(rnd(), 0.6) * 3.6; o3.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1.0); o3.rotation.set(0, R(0, 6.28), 0); const s = R(0.6, 1.0); o3.scale.set(s, s * R(0.8, 1.2), s); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); }
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false; street.add(im); }
  const hyd = (await gltf('models/fire_hydrant/fire_hydrant.gltf')).scene; hyd.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); hyd.position.set(0.55, 0, -2.4); hyd.rotation.y = 0.6; hyd.visible = false; street.add(hyd); STREET.hyd = hyd;
  const can = (await gltf('models/metal_trash_can/metal_trash_can.gltf')).scene; can.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); can.visible = false; street.add(can);
  // sparrows: simple but shaded birds (body, head, beak, two wings) pecking on the lawn, then flying off
  const bm = new THREE.MeshStandardMaterial({ color: '#7a5a3e', roughness: 0.8 }), bb = new THREE.MeshStandardMaterial({ color: '#d8c8b0', roughness: 0.8 }), bk = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.6 });
  for (let i = 0; i < 6; i++) { const gB = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), bm); body.scale.set(1, 0.85, 1.5); gB.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), bb); belly.position.set(0, -0.012, 0.005); belly.scale.set(0.9, 0.7, 1.3); gB.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), bm); head.position.set(0, 0.025, -0.045); gB.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.016, 8), bk); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.022, -0.068); gB.add(beak);
    const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.05), bm); w.geometry.translate(0.035 * s, 0, 0); w.position.set(0.012 * s, 0.012, 0); gB.add(w); return w; });
    gB.traverse(o => { if (o.isMesh) o.castShadow = true; }); street.add(gB);
    sparrows.push({ g: gB, wings, x: R(-0.8, 0.8), z: R(-3.4, -1.9), ph: R(0, 6), vx: R(-1, 1), vy: R(1.2, 2.2), vz: R(-2.5, -1) }); }
  // night street
  const nh = await hdrP('hdri/street_lamp_2k.hdr'); nh.mapping = THREE.EquirectangularReflectionMapping; night.environment = pmrem.fromEquirectangular(nh).texture; night.environmentIntensity = 1.0;
  const nsky = new GroundedSkybox(nh, 1.7, 80); nsky.position.y = 1.7 - 0.01; night.add(nsky);
}
function updateStreet(t) {
  const fly = t - (OUT + 3.0);
  for (const S of sparrows) { const k = Math.max(0, fly - S.ph * 0.05);
    const peck = k <= 0 ? Math.max(0, Math.sin(t * 6 + S.ph * 3)) * 0.4 : 0;
    S.g.position.set(S.x + S.vx * k * 0.8, 0.03 + (k > 0 ? S.vy * k + 0.5 * k * k : 0), S.z + S.vz * k);
    S.g.rotation.set(peck + (k > 0 ? -0.4 : 0), S.ph + (k > 0 ? 0.0 : Math.sin(t + S.ph) * 0.5), 0);
    const f = k > 0 ? Math.sin(t * 40 + S.ph) * 0.9 : -0.1; S.wings[0].rotation.z = f; S.wings[1].rotation.z = -f; }
}

// =================== paths ===================
const MOUSE_PATH = new THREE.CatmullRomCurve3([V3(2.3, 0, -1.0), V3(1.6, 0, 0.3), V3(0.9, 0, 1.45), V3(-0.4, 0, 1.75), V3(-1.6, 0, 1.25), V3(-2.5, 0, 0.75), V3(-2.97, 0, 0.6)]);
const mouseU = t => clamp((t - (CHASE + 0.4)) / (POUNCE + 0.35 - CHASE - 0.4), 0, 1);
const camChaseU = t => clamp((t - (CHASE + 0.7)) / (POUNCE - CHASE - 0.7), 0, 1) * 0.93;
// sound rings from behind the bookshelf
const rings = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); room.add(m); rings.push(m); }
function updateRoom(t) {
  // the mouse: hides behind the shelf, then runs along the path into its hole
  const mu = mouseU(t), mp = MOUSE_PATH.getPointAt(ease(mu) * 0.15 + mu * 0.85), tan = MOUSE_PATH.getTangentAt(Math.min(0.999, mu * 0.98 + 0.01));
  const m = props.mouse; m.visible = t < POUNCE + 0.4 && t > HEAR - 0.5;
  m.position.set(mp.x, 0.004 + Math.abs(Math.sin(t * 38)) * 0.006 * (mu > 0 && mu < 1 ? 1 : 0), mp.z); m.rotation.y = Math.atan2(-tan.x, -tan.z) + (t < CHASE ? Math.sin(t * 2) * 0.4 : 0);
  if (t < CHASE + 0.4) m.position.set(2.3 + 0.03 * Math.sin(t * 3), 0.004, -1.0);
  for (let i = 0; i < rings.length; i++) { const k = ((t - HEAR) * 0.9 + i / rings.length) % 1; const on = t > HEAR && t < CHASE + 0.2; const r = rings[i];
    r.visible = on; r.position.set(2.32, 0.06, -1.0); r.lookAt(rCam.position); r.scale.setScalar(0.05 + k * 1.4); r.material.opacity = on ? 0.55 * (1 - k) * smooth(HEAR, HEAR + 0.6, t) : 0; }
  // cat flap opens as we push through
  props.flap.rotation.x = 1.25 * smooth(OUT - 0.55, OUT - 0.1, t);
  // sun: morning in the room, a slow time-lapse during the nap
  const sl = smooth(SLEEP, T_END, t); sun.position.set(lerp(-3.5, -1.2, sl), lerp(3.2, 1.6, sl), -6.0); sun.color.set(sl > 0 ? new THREE.Color('#fff0e2').lerp(new THREE.Color('#ffa060'), sl) : '#fff0e2'); sun.intensity = 6.0;
}
function roomCamera(t, mode) {
  let pos, look, fov = 74;
  if (mode === 'human') { pos = V3(0.05, 1.05, 2.05); look = V3(0.05, 0.25, 0.98); fov = 50; }
  else if (t < HEAR) { const u = t / HEAR; pos = V3(0.95, 0.17, 2.05 - 0.15 * u); look = V3(2.2, 0.2, -1.0); fov = 70; }
  else if (t < CHASE) { const u = (t - HEAR) / (CHASE - HEAR); pos = V3(lerp(0.95, 1.55, ease(u)), 0.16, lerp(1.9, 0.9, ease(u))); look = V3(2.3, 0.12, -1.0); fov = lerp(70, 62, u); }
  else if (t < POUNCE) { const cu = camChaseU(t), mu = mouseU(t); const cp = MOUSE_PATH.getPointAt(cu), mp = MOUSE_PATH.getPointAt(Math.min(1, ease(mu) * 0.15 + mu * 0.85));
    pos = V3(cp.x, 0.19 + 0.025 * Math.abs(Math.sin(t * 15)), cp.z); look = V3(mp.x, 0.04, mp.z); fov = 78; }
  else if (t < COLOR) { const u = (t - POUNCE) / 0.9, land = V3(-2.6, 0.17, 0.72), cp = MOUSE_PATH.getPointAt(0.93);
    pos = V3(lerp(cp.x, land.x, ease(u)), 0.19 + 0.45 * Math.sin(Math.PI * clamp(u, 0, 1)), lerp(cp.z, land.z, ease(u))); look = V3(-2.98, 0.04, 0.6); fov = 70; }
  else if (t < BLUR) { pos = V3(0.05, 0.14, 2.0); look = V3(0.05, 0.09, 0.98); fov = 62; }
  else { const u = (t - BLUR) / (OUT - BLUR); pos = V3(lerp(0.4, 2.62, ease(u)), 0.19 + 0.012 * Math.abs(Math.sin(t * 9)), lerp(1.6, 1.8, u)); look = V3(3.0, 0.16, 1.8); fov = lerp(74, 100, smooth(BLUR, BLUR + 1.5, t)); }
  if (t >= TASTE && t < SLEEP && mode !== 'human') { const u = (t - TASTE) / (SLEEP - TASTE); pos = V3(lerp(1.6, 1.85, u), 0.2, lerp(2.15, 2.35, u)); look = V3(2.05, 0.04, 2.62); fov = 62; }
  if (t >= SLEEP && mode !== 'human') { pos = V3(-0.6, 0.09, 0.9); look = V3(-0.9, 0.05, -2.0); fov = 70; }
  rCam.fov = fov; rCam.position.copy(pos); rCam.lookAt(look); rCam.updateMatrixWorld();
}
function streetCamera(t, cam) { const u = (t - OUT) / (NIGHT - OUT);
  cam.position.set(Math.sin(u * 2) * 0.12, 0.2 + 0.012 * Math.abs(Math.sin(t * 8)), lerp(0.6, -0.6, ease(u))); cam.lookAt(lerp(0.2, -0.1, u), lerp(0.25, 0.45, smooth(OUT + 3, OUT + 4.5, t)), -4); cam.fov = 74; }

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'split', 'rb'].map(k => [k, $(k)]));
const captions = [
  [3.3, 5.8, 'A mouse squeaks too high<br>for human ears…'],
  [5.9, 7.9, '…but not for yours.'],
  [8.3, 11.0, "You chase it.<br>Even if you're not hungry."],
  [11.1, 13.9, "It's pure instinct."],
  [14.6, 16.8, 'Missed.'],
  [17.4, 20.0, 'Cats barely see red.'],
  [20.1, 22.8, 'Red and green look<br>almost the same.'],
  [22.9, 25.3, 'Blue and yellow still pop.'],
  [25.4, 27.8, 'Your jack-o\'-lantern?<br>Kind of mustard.'],
  [28.3, 30.0, 'Far away is blurry…'],
  [30.1, 31.9, '…but you see almost<br>behind you: 200°.'],
  [32.6, 36.4, 'Outside, everything is giant.'],
  [36.6, 40.8, 'US cats catch billions<br>of birds a year.'],
  [41.4, 43.9, 'At night, you still see.'],
  [44.0, 46.8, 'Cats need about<br>6× less light.'],
  [47.4, 49.6, "Cake? You can't taste sweet."],
  [49.7, 51.8, "Cats' sweet gene is broken."],
  [52.4, 55.6, 'Then you nap in the sun…'],
  [55.7, 58.8, '…12 to 16 hours a day.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < HEAR + 0.2) show = 0;
  else if (t < CHASE) { lab = 'MOUSE SQUEAK'; val = '40,000 Hz'; sub = 'HUMANS: UP TO 20,000 · CATS: ~64,000'; }
  else if (t < POUNCE) { lab = 'TOP SPEED'; val = Math.round(30 * smooth(CHASE + 0.4, CHASE + 2.2, t)) + ' mph'; sub = 'IN A SHORT BURST'; }
  else if (t < COLOR) show = 0;
  else if (t < BLUR) show = 0;
  else if (t < OUT) { lab = 'FIELD OF VIEW'; val = '200°'; sub = 'HUMANS: ~180° · SHARPNESS ~20/100'; }
  else if (t < NIGHT) { lab = 'YOUR HEIGHT'; val = '10 in'; sub = t > 36.6 ? 'US CATS: 1.3–4 BILLION BIRDS / YEAR' : 'EYE LEVEL OF A CAT'; }
  else if (t < TASTE) show = 0;
  else if (t < SLEEP) { lab = 'SWEET TASTE'; val = 'none'; sub = 'TAS1R2 GENE SWITCHED OFF'; }
  else { lab = 'SLEEP'; val = '12–16 h'; sub = 'A DAY'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t, split) {
  el.title.style.opacity = 1 - smooth(HEAR - 0.6, HEAR - 0.1, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.split.style.opacity = split ? 1 : 0; el.rb.style.opacity = t >= COLOR + 0.3 && t < BLUR - 0.1 ? 1 : 0;
  const dip = Math.max(fadeWin(t, COLOR - 0.25, COLOR + 0.2, 0.2), fadeWin(t, NIGHT - 0.25, NIGHT + 0.2, 0.2), fadeWin(t, TASTE - 0.25, TASTE + 0.2, 0.2), fadeWin(t, SLEEP - 0.25, SLEEP + 0.2, 0.2));
  el.veil.style.background = '#000'; el.veil.style.opacity = dip;
  el.flash.style.opacity = fadeWin(t, OUT - 0.2, OUT + 0.35, 0.2);
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
window.renderAt = (t) => {
  updateRoom(t);
  const split = (t >= COLOR && t < BLUR) || (t >= NIGHT && t < TASTE);
  if (t >= OUT && t < NIGHT) {                                                      // street, day
    updateStreet(t); streetCamera(t, sCam);
    post(FULL, street, sCam, { cat: 0.6, dof: { focus: 1.6, aperture: 0.006, maxblur: 0.008 }, bloom: 0.2, bloomT: 1.5, exp: 1.0 }, t);
  } else if (t >= NIGHT && t < TASTE) {                                             // street, night: you vs cat
    streetCamera(OUT + 4 + (t - NIGHT) * 0.4, sCam);
    post(TOP, night, sCam, { cat: 0, exp: 0.07, bloom: 0.3, bloomT: 3 }, t);
    post(BOT, night, sCam, { cat: 1, night: 1, exp: 0.28, bloom: 0.2, bloomT: 3 }, t);
    presentSplit();
  } else if (split) {                                                              // colours: you vs cat
    roomCamera(t, 'human'); post(TOP, room, rCam, { cat: 0, dof: { focus: rCam.position.distanceTo(V3(0.05, 0.05, 0.98)), aperture: 0.003, maxblur: 0.005 }, exp: 0.95 }, t);
    roomCamera(t, 'cat'); post(BOT, room, rCam, { cat: 1, dof: { focus: rCam.position.distanceTo(V3(0.05, 0.07, 0.98)), aperture: 0.004, maxblur: 0.006 }, exp: 0.95 }, t);
    presentSplit();
  } else {
    roomCamera(t, 'cat');
    const chasing = t > CHASE + 0.6 && t < POUNCE + 0.9;
    const tgt = t < HEAR + 0.5 ? V3(2.2, 0.2, -1.0) : (props.mouse.visible ? props.mouse.position : V3(-2.98, 0.04, 0.6));
    post(FULL, room, rCam, { cat: (t < 0.6 ? smooth(0, 0.6, t) : 1) * 0.6, motion: chasing ? 0.9 : (t > POUNCE && t < POUNCE + 0.9 ? 1.4 : 0), wide: smooth(BLUR, BLUR + 1.5, t) * (t < OUT ? 1 : 0),
      dof: { focus: Math.max(0.15, rCam.position.distanceTo(tgt)), aperture: 0.012, maxblur: 0.01 }, exp: t < HEAR ? 0.75 : 0.95, lid: t > SLEEP ? smooth(SLEEP + 3.5, T_END - 0.3, t) : 0 }, t);
  }
  updateDOM(t, split);
  return true;
};
// the cat's rainbow: same stops through the dichromat matrix used in the cat-vision pass
{ const stops = ['#7a00ff', '#0050ff', '#00c8ff', '#00d040', '#e8e800', '#ff9000', '#ff1a00'];
  const M = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]];
  const cat = stops.map(hx => { const c = new THREE.Color(hx); const v = [c.r, c.g, c.b]; const d = M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]); const l = 0.3 * d[0] + 0.6 * d[1] + 0.1 * d[2]; const o = d.map(x => clamp(lerp(x, l, 0.12), 0, 1)); o[2] = clamp(lerp(o[2], v[2] * 1.05, 0.5), 0, 1); return new THREE.Color(o[0], o[1], o[2]).getStyle(); });
  document.getElementById('rbCat').style.background = 'linear-gradient(90deg,' + cat.join(',') + ')'; }
window.sceneReady = (async () => { await buildRoom(); await buildStreet(); await document.fonts.ready; window.renderAt(0); return true; })();
