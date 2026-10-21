import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you took off your helmet in space?" — FIRST-PERSON version (one continuous POV, blinks instead of cuts); classic low-poly; Earth/stars render in km in a background pass, the ISS + astronauts in meters on top.
// Facts: awareness ~10-15 s (NASA/USAF studies, Barratt ~12 s); ~90 s survivable if recompressed; exhale; saliva boils (Armstrong limit);
// swelling (ebullism) but no explosion; no instant freezing; severe sunburn; Jim LeBlanc 1966 chamber accident, woke after 87 s, no lasting harm.
// =================== timeline ===================
const OFF = 4.0, EXHALE = 5.2, SPIT = 9.0, SWELL = 15.0, SUNB = 21.0, FADE = 27.0, DARK = 36.0, RESCUE = 40.0, LOCK = 48.0, BACK = 54.0, T_END = 60.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
// ?v=2: re-upload variant (different Earth view, cloud/star layout, wording, grade)
const VAR = 4;   // jump video: Germany below
let seed = VAR === 3 ? 1990 : VAR === 2 ? 2024 : 1966;   // ?v=3: German version (mirrored picture, North Sea view, metric)
const DE = VAR === 3;
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
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true }); renderer.autoClear = false;
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
// every scene renders into a linear HDR target; one full-screen pass tone-maps both and dissolves between them
const RTA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }), RTB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uFrame: { value: 0 }, uFrameK: { value: 0 }, uFog: { value: 0 }, uPulse: { value: 0 }, uGhost: { value: new THREE.Vector2() }, uGhostA: { value: 0 }, uSat: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uVig: { value: 3 }, uLid: { value: 0 }, uBright: { value: 1 }, uFlash: { value: 0 }, uSunUV: { value: new THREE.Vector2(-9, -9) }, uSunA: { value: 0 }, uFlipX: { value: VAR === 3 ? 1 : 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform float uFlipX; uniform float uFrame, uFrameK, uFog, uPulse, uGhostA, uSat, uVig, uLid, uBright, uFlash, uSunA; uniform vec2 uGhost, uSunUV; uniform vec3 uTint;
    void main(){ vec2 uv = (vUv - 0.5) * (1.0 - 0.014 * uPulse) + 0.5; uv.x = mix(uv.x, 1.0 - uv.x, uFlipX);
      vec3 c = aces(texture2D(tA, uv).rgb * uExpA);
      if (uGhostA > 0.001) { vec3 g = aces(texture2D(tA, uv + uGhost).rgb * uExpA); c = mix(c, g, 0.45 * uGhostA); }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0);                       // p.y in [-1,1], p.x in [-0.56,0.56] (square pixels)
      // sun glare
      vec2 sd = (vUv - uSunUV) * vec2(1.125, 2.0); float d = length(sd);
      c += uSunA * (vec3(1.0, 0.93, 0.8) * exp(-d * 3.5) * 0.55 + vec3(1.0) * exp(-d * 22.0) * 1.5 + vec3(1.0, 0.95, 0.85) * exp(-abs(sd.y) * 60.0) * exp(-abs(sd.x) * 2.5) * 0.35);
      // visor fog from your breath
      vec2 fq = (p - vec2(0.0, -0.62)) / vec2(0.5, 0.32); c = mix(c, vec3(0.86, 0.9, 0.93), clamp(uFog * exp(-dot(fq, fq)) * 0.75, 0.0, 1.0));
      // helmet rim (dark padded edge) — grows + fades as the helmet comes off
      vec2 hq = p / (vec2(0.66, 1.02) * (1.0 + 2.2 * uFrameK)); float e = length(hq);
      float rim = smoothstep(0.9, 1.0, e); vec3 rimC = vec3(0.045, 0.05, 0.06) + vec3(0.5, 0.55, 0.6) * exp(-abs(e - 0.985) * 70.0) * 0.35;
      c = mix(c, rimC, rim * uFrame); c += vec3(0.6, 0.75, 0.9) * 0.05 * uFrame * exp(-pow((p.x + p.y * 0.4 - 0.25) * 6.0, 2.0)) * (1.0 - rim);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, uSat) * uTint;
      float r = length(p * vec2(1.3, 0.8)); c *= 1.0 - smoothstep(uVig * 0.45, uVig, r);
      float hl = 1.1 * (1.0 - uLid) - 0.35 * p.x * p.x; c *= 1.0 - smoothstep(hl - 0.1, hl + 0.02, abs(p.y));
      c = c * uBright + uFlash; gl_FragColor = vec4(srgb(clamp(c, 0.0, 1.0)), 1.0); }` });
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
