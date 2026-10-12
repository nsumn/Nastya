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
