import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you were a cat for one day?" — CLASSIC series style (low-poly, vertex colours, soft shadows), cat's-eye camera.
// Same script as the realistic try (parts_cat/), which she rejected after TikTok pixelation: mouse squeak → chase → miss,
// split-screen YOU / CAT colours, 200° view, street (giant people, cars, pigeons), night split, cake, nap.
// =================== timeline ===================
const HEAR = 3.0, CHASE = 8.0, POUNCE = 14.0, COLOR = 17.0, BLUR = 28.0, OUT = 32.0, NIGHT = 41.0, TASTE = 47.0, SLEEP = 52.0, T_END = 59.0;
// =================== helpers ===================
let seed = 2718;
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
// =================== renderer + cat-vision pipeline ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
const RT_FULL = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const RT_HALF = [new THREE.WebGLRenderTarget(W, H / 2, { type: THREE.HalfFloatType, samples: 4 }), new THREE.WebGLRenderTarget(W, H / 2, { type: THREE.HalfFloatType, samples: 4 })];
const catMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
  uniforms: { tSrc: { value: null }, uCat: { value: 0 }, uNight: { value: 0 }, uMotion: { value: 0 }, uWide: { value: 0 }, uLid: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) }, uT: { value: 0 }, uExp: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tSrc; uniform float uCat, uNight, uMotion, uWide, uLid, uT, uExp; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT*31.7)*43758.5453); }
    vec3 tex(vec2 uv){ return texture2D(tSrc,uv).rgb*uExp; }
    vec3 samp(vec2 uv, float r){ vec3 c=vec3(0.0); float w=0.0; for(int i=-2;i<=2;i++) for(int j=-2;j<=2;j++){ vec2 o=vec2(float(i),float(j)); float k=exp(-dot(o,o)/3.0); c+=tex(uv+o*r/uRes)*k; w+=k; } return c/w; }
    void main(){ vec2 q=vUv-0.5; q.x*=uRes.x/uRes.y; float r2=dot(q,q);
      vec2 uv=0.5+(vUv-0.5)*(1.0-uCat*(0.05+0.2*uWide)*r2*4.0);
      vec3 c=tex(uv); float blur=uCat*(0.6+2.4*smoothstep(0.04,0.22,r2)); if(blur>0.05) c=samp(uv,blur);
      if(uMotion>0.001){ vec3 m=vec3(0.0); for(int k=0;k<8;k++){ float s=1.0-float(k)*0.012*uMotion; m+=tex(0.5+(uv-0.5)*s); } c=mix(c,m/8.0,0.8); }
      // tone map first, then the cat's colour space (works on display colours)
      vec4 o=vec4(c,1.0);
      #include <tonemapping_fragment>
      vec3 s=pow(clamp(c*0.0+o.rgb,0.0,1.0),vec3(1.0));
      gl_FragColor=vec4(s,1.0);
      #include <colorspace_fragment>
      vec3 d=gl_FragColor.rgb;
      vec3 dc=mat3(0.367322,0.280085,-0.011820, 0.860646,0.672501,0.042940, -0.227968,0.047413,0.968881)*d;
      dc=mix(dc, vec3(dot(dc,vec3(0.3,0.6,0.1))), 0.1); dc.b=mix(dc.b, d.b*1.05, 0.5); dc*=vec3(0.92,0.97,1.14);
      d=mix(d,dc,uCat*0.92);
      vec3 nv=d*2.6; nv=mix(nv, vec3(dot(nv,vec3(0.3,0.59,0.11)))*vec3(0.88,0.96,1.08), 0.5); d=mix(d, nv+(h(vUv*uRes)-0.5)*0.05, uNight);
      float op=1.0-uLid; float lid=smoothstep(op-0.05,op,abs(vUv.y-0.5)*2.0*(1.0+0.15*q.x*q.x)); d*=1.0-lid*smoothstep(0.0,0.02,uLid);
      d*=1.0-0.28*smoothstep(0.2,0.8,length(q)*1.3);
      gl_FragColor=vec4(clamp(d,0.0,1.0),1.0);
    }` });
// tone mapping chunk reads gl_FragColor? we keep it explicit: three's chunk tone-maps gl_FragColor.rgb — so assign first
catMat.fragmentShader = catMat.fragmentShader.replace('vec4 o=vec4(c,1.0);\n      #include <tonemapping_fragment>\n      vec3 s=pow(clamp(c*0.0+o.rgb,0.0,1.0),vec3(1.0));\n      gl_FragColor=vec4(s,1.0);\n      #include <colorspace_fragment>',
  'gl_FragColor=vec4(c,1.0);\n      #include <tonemapping_fragment>\n      #include <colorspace_fragment>');
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), catMat));
function shoot(scene, camera, rt, o, t) {
  camera.aspect = rt.width / rt.height; camera.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
}
function present(rt, o, t, vp) {           // vp: null = full screen, 0 = top half, 1 = bottom half
  const u = catMat.uniforms; u.tSrc.value = rt.texture; u.uCat.value = o.cat ?? 0; u.uNight.value = o.night ?? 0; u.uMotion.value = o.motion ?? 0; u.uWide.value = o.wide ?? 0; u.uLid.value = o.lid ?? 0; u.uT.value = t; u.uExp.value = o.exp ?? 1;
  u.uRes.value.set(rt.width, rt.height);
  renderer.setRenderTarget(null);
  if (vp === null || vp === undefined) renderer.setViewport(0, 0, W, H); else renderer.setViewport(0, vp === 0 ? H / 2 : 0, W, H / 2);
  renderer.render(quadScene, quadCam); renderer.setViewport(0, 0, W, H);
}
// =================== materials / builders ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }
