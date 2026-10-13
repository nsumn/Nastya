import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// "What if you dug a hole through the Earth?" — realistic look: Poly Haven HDRI + photoscanned PBR textures + glTF scans,
// Solar System Scope 8k Earth maps, three.js Water/Sky, post: depth of field, bloom, grain, vignette (AgX tone mapping).
// Numbers: tools/hole_math.py (PREM): 7,919 mi through, 38.1 min fall, 22,188 mph at the center, 1.09 G at the core boundary.
// Assets: python3 tools/fetch_hole_assets.py  (-> assets/hole/, git-ignored)
// =================== timeline ===================
const DIG = 0.0, SHAFT = 4.0, CUT = 27.0, FALL = 32.0, OCEAN = 52.0, T_END = 60.0;
const A = 'assets/hole/';
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
