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
      float op=1.0-uLid; float lid=smoothstep(op-0.06,op,abs(vUv.y-0.5)*2.0*(1.0+0.15*q.x*q.x)); c.rgb*=1.0-lid*smoothstep(0.0,0.02,uLid);   // eyelids closing
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
