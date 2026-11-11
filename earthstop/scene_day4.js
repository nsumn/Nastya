import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// DAILY NEWS format "The last 24 hours" (Nov 8 2026) — head = copy of parts_news/n_head.js. Voice-over (Lumean "Andrew", speed 1.15), timeline in parts_day/y_times.js.
// Map: world relief + bathymetry (data/world_dem.png, tools/world_dem.py) with a finer US plane (data/us_dem.png); countries (world-atlas 50m) + states (us-atlas 10m) in one id texture.
// =================== timeline (s) ===================
const DESIGN = new URLSearchParams(location.search).get("design");
const HOMES = 999, PRES = 999;   // (constants read by the reused gone-video sets; not used here)
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 4242;
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
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uSepia: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 }, uTilt: { value: 0 }, uWhip: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook, uWhip, uTilt, uSepia;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    // soft glow around bright HDR spots (lamps, the sun, emissive bits): two rings of taps on the over-1.0 part
    vec3 glow(sampler2D tx, vec2 uv, float ex){ vec3 g=vec3(0.0); for(int i=0;i<8;i++){ float a=float(i)*0.785398+0.39; vec2 d=vec2(cos(a),sin(a))*vec2(1.0,0.5625);
      g+=max(texture2D(tx,uv+d*0.012).rgb*ex-1.0,0.0)*0.6+max(texture2D(tx,uv+d*0.03).rgb*ex-1.0,0.0)*0.4; } return g/8.0; }
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA+0.35*uLook*glow(tA,uv,uExpA)); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB+0.35*uLook*glow(tB,uv,uExpB)); c=mix(a,b,uMix); }
      // whip pan: a horizontal smear along the cut (uWhip = smear length in uv, signed = direction)
      if(abs(uWhip)>0.0005){ vec3 acc=c; for(int i=1;i<=14;i++){ float o=uWhip*(float(i)/14.0-0.5)*2.0; vec2 q=vec2(clamp(uv.x+o,0.0,1.0),uv.y); vec3 sa=aces(texture2D(tA,q).rgb*uExpA); if(uMix>0.001) sa=mix(sa,aces(texture2D(tB,q).rgb*uExpB),uMix); acc+=sa; } c=acc/15.0; }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      // fake tilt-shift (clay look): blur grows above and below a sharp middle band, like a macro shot of a miniature
      if(uTilt>0.001){ float bl=uTilt*smoothstep(0.12,0.42,abs(vUv.y-0.56)); if(bl>0.0005){ vec3 acc=c; for(int i=0;i<12;i++){ float a=float(i)*0.5236; vec2 o=vec2(cos(a),sin(a)*0.5625)*bl*(0.5+0.5*mod(float(i),2.0)); acc+=aces(texture2D(tA,uv+o).rgb*uExpA); } c=acc/13.0; } }
      c=mix(c, vec3(dot(c,vec3(0.3,0.59,0.11)))*vec3(1.08,0.93,0.72), uSepia);   // 1862 flashback
      c=srgb(c);
      // "storybook" finish: softer contrast with lifted blacks and a STATIC paper texture (moving grain gets mangled by TikTok's re-encode)
      vec2 px=vUv*vec2(1080.0,1920.0); float paper=vn(px/90.0)*0.5+vn(px/23.0)*0.3+vn(px/6.0)*0.2, grain=vn(px/1.7)-0.5;
      vec3 l=mix(c, c*0.93+vec3(0.035,0.03,0.025), uLook); l*=1.0+uLook*(0.07*(paper-0.5)+0.05*grain);
      float vg=length((vUv-0.5)*vec2(1.0,0.75)); l*=1.0-uLook*0.18*smoothstep(0.35,0.75,vg);
      gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }` });
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
// PLACEHOLDER timing (estimated) — replaced by tools/news_timing.py once the voice exists
const SENT = [0.0, 4.286, 6.308, 9.755, 12.548, 14.961, 20.016, 21.958, 25.934, 32.656, 35.31, 37.39, 43.434, 48.34, 51.362, 57.694, 62.715, 66.266, 68.391];
const WORDS = [[0.0, 0.345, "Eleven"], [0.391, 0.839, "Democrats"], [0.885, 1.264, "skipped"], [1.31, 1.551, "the"], [1.597, 1.873, "vote"], [1.919, 2.195, "that"], [2.241, 2.551, "could"], [2.597, 2.873, "have"], [2.919, 3.367, "impeached"], [3.413, 3.688, "Pete"], [3.734, 4.148, "Hegseth."], [4.286, 4.527, "One"], [4.573, 4.78, "of"], [4.826, 5.102, "them"], [5.148, 5.389, "was"], [5.435, 5.745, "Nancy"], [5.791, 6.17, "Pelosi."], [6.308, 6.653, "Here's"], [6.699, 6.975, "what"], [7.021, 7.434, "happened"], [7.48, 7.687, "in"], [7.733, 8.112, "America"], [8.158, 8.365, "in"], [8.411, 8.652, "the"], [8.698, 8.974, "last"], [9.02, 9.227, "24"], [9.273, 9.618, "hours."], [9.755, 10.272, "Republicans"], [10.318, 10.698, "shelved"], [10.744, 10.985, "the"], [11.031, 11.548, "impeachment"], [11.594, 11.835, "211"], [11.881, 12.088, "to"], [12.134, 12.41, "204."], [12.548, 12.892, "That's"], [12.938, 13.111, "a"], [13.157, 13.501, "margin"], [13.547, 13.754, "of"], [13.8, 14.076, "just"], [14.122, 14.432, "seven"], [14.478, 14.823, "votes."], [14.961, 15.167, "If"], [15.213, 15.455, "all"], [15.501, 15.845, "eleven"], [15.891, 16.133, "had"], [16.179, 16.489, "shown"], [16.535, 16.742, "up"], [16.788, 17.029, "and"], [17.075, 17.385, "voted"], [17.431, 17.672, "no,"], [17.718, 17.96, "the"], [18.006, 18.419, "articles"], [18.465, 18.775, "would"], [18.821, 19.097, "have"], [19.143, 19.488, "stayed"], [19.534, 19.879, "alive."], [20.016, 20.327, "Trump"], [20.373, 20.717, "called"], [20.763, 20.97, "it"], [21.016, 21.223, "an"], [21.269, 21.82, "exoneration."], [21.958, 22.165, "In"], [22.211, 22.452, "the"], [22.498, 22.843, "House,"], [22.889, 23.406, "Republicans"], [23.452, 23.797, "picked"], [23.843, 24.084, "Jim"], [24.13, 24.475, "Jordan"], [24.521, 24.728, "as"], [24.773, 25.084, "their"], [25.13, 25.371, "new"], [25.417, 25.796, "leader."], [25.934, 26.141, "He"], [26.187, 26.463, "beat"], [26.509, 26.819, "Steve"], [26.865, 27.244, "Scalise"], [27.29, 27.497, "by"], [27.543, 27.75, "33"], [27.795, 28.14, "votes,"], [28.186, 28.427, "and"], [28.473, 28.68, "he"], [28.726, 29.14, "replaces"], [29.186, 29.462, "Mike"], [29.508, 29.887, "Johnson"], [29.933, 30.14, "in"], [30.185, 30.599, "January,"], [30.645, 30.921, "when"], [30.967, 31.415, "Democrats"], [31.461, 31.737, "take"], [31.783, 32.024, "the"], [32.07, 32.518, "majority."], [32.656, 32.863, "In"], [32.909, 33.15, "the"], [33.196, 33.575, "Senate,"], [33.621, 34.138, "Republicans"], [34.184, 34.46, "kept"], [34.506, 34.782, "John"], [34.828, 35.172, "Thune."], [35.31, 35.552, "But"], [35.598, 36.046, "Democrats"], [36.092, 36.333, "are"], [36.379, 36.758, "already"], [36.804, 37.252, "fighting."], [37.39, 37.735, "Bernie"], [37.781, 38.16, "Sanders"], [38.206, 38.482, "says"], [38.528, 38.734, "he"], [38.78, 39.091, "won't"], [39.137, 39.412, "back"], [39.458, 39.769, "Chuck"], [39.815, 40.228, "Schumer,"], [40.274, 40.515, "and"], [40.561, 40.768, "at"], [40.814, 41.124, "least"], [41.17, 41.446, "five"], [41.492, 41.906, "incoming"], [41.952, 42.365, "senators"], [42.411, 42.653, "say"], [42.699, 42.94, "the"], [42.986, 43.296, "same."], [43.434, 43.813, "America"], [43.859, 44.169, "could"], [44.215, 44.491, "also"], [44.537, 44.813, "lose"], [44.859, 45.1, "its"], [45.146, 45.525, "measles"], [45.571, 45.847, "free"], [45.893, 46.272, "status,"], [46.318, 46.628, "which"], [46.674, 46.881, "it"], [46.927, 47.168, "has"], [47.214, 47.49, "held"], [47.536, 47.846, "since"], [47.892, 48.203, "2000."], [48.34, 48.513, "A"], [48.559, 48.972, "decision"], [49.018, 49.225, "is"], [49.271, 49.685, "expected"], [49.731, 49.938, "as"], [49.984, 50.294, "early"], [50.34, 50.547, "as"], [50.593, 50.868, "next"], [50.914, 51.225, "week."], [51.362, 51.604, "And"], [51.65, 51.994, "around"], [52.04, 52.282, "the"], [52.328, 52.672, "world,"], [52.718, 52.96, "the"], [53.006, 53.35, "United"], [53.396, 53.741, "States"], [53.787, 54.132, "hosted"], [54.178, 54.522, "almost"], [54.568, 54.844, "four"], [54.89, 55.2, "hours"], [55.246, 55.453, "of"], [55.499, 55.844, "Russia"], [55.89, 56.269, "Ukraine"], [56.315, 56.625, "talks"], [56.671, 56.878, "in"], [56.924, 57.165, "Abu"], [57.211, 57.556, "Dhabi."], [57.694, 57.866, "A"], [57.912, 58.222, "large"], [58.268, 58.682, "prisoner"], [58.728, 59.004, "swap"], [59.05, 59.256, "is"], [59.302, 59.509, "on"], [59.555, 59.796, "the"], [59.842, 60.187, "table,"], [60.233, 60.474, "and"], [60.52, 60.796, "more"], [60.842, 61.152, "talks"], [61.198, 61.44, "are"], [61.486, 61.899, "expected"], [61.945, 62.221, "next"], [62.267, 62.577, "week."], [62.715, 63.025, "Today"], [63.071, 63.278, "is"], [63.324, 63.738, "Veterans"], [63.784, 64.059, "Day,"], [64.105, 64.347, "and"], [64.393, 64.703, "Trump"], [64.749, 65.094, "marked"], [65.14, 65.346, "it"], [65.392, 65.599, "at"], [65.645, 66.128, "Arlington."], [66.266, 66.507, "So,"], [66.553, 66.898, "should"], [66.944, 67.288, "Pelosi"], [67.334, 67.61, "have"], [67.656, 67.966, "shown"], [68.012, 68.253, "up?"], [68.391, 68.667, "Tell"], [68.713, 68.92, "me"], [68.966, 69.173, "in"], [69.219, 69.46, "the"], [69.506, 69.954, "comments."]];
const VO_END = 70.0;
// =================== MAP v3 (Nov 10 2026, her note: Geolyth's picture is much better) = map v2 + NASA Blue Marble satellite colour, punchier grade, glossy raised regions ===================
// textures: data/sat_world.jpg, data/sat_us.jpg, data/sat_ak.jpg (tools/sat_tex.py; NASA Blue Marble Next Generation, public domain)
// = parts_day/y_map.js + crisp VECTOR borders (LineSegments2, pixel width), per-pixel normals with fine detail noise, finer relief:
//   US plane data/us_dem2.png (z6, 0.02°), Alaska patch data/ak_dem.png (z6, 0.02°) — both from tools/patch_dem.py.
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
// One coordinate system for both planes: x = (lon + 96)·cos38°·SC, z = (38 − lat)·SC  (1 unit ≈ 18.5 km north–south)
const SC = 6, CLAT = Math.cos(38 * Math.PI / 180);
const ll2xz = (lon, lat) => V3((lon + 96) * CLAT * SC, 0, (38 - lat) * SC);
const WB = { lon0: -180, lon1: 180, lat0: -60, lat1: 84, cw: 8192, ch: 3277 };            // world plane
const UB = { lon0: -132, lon1: -58, lat0: 13, lat1: 53, cw: 7400, ch: 4000 };              // detailed US plane (lower 48)
const AKB = { lon0: -172, lon1: -129, lat0: 51, lat1: 72, cw: 4300, ch: 2100 };            // detailed Alaska patch
const MAPSC = new THREE.Scene(); MAPSC.background = new THREE.Color('#07111d');
const mCam = new THREE.PerspectiveCamera(36, W / H, 0.5, 6000); MAPSC.add(mCam);
MAPSC.add(new THREE.HemisphereLight(0xb8c8e8, 0x182018, 0.9));
const sunM = new THREE.DirectionalLight(0xfff0dc, 2.4); sunM.position.set(-120, 160, -90); MAPSC.add(sunM);
// palette texture: row 0 = country colour (rgb, a = mix), row 1 = state colour, row 2 = lift (r = country, g = state, b = county), row 3 = county colour
// optional counties of ONE state on the US plane (id texture B channel): define `const COUNTY_FIPS = '48'` before this part
const PAL = new Float32Array(256 * 4 * 4), palTex = new THREE.DataTexture(PAL, 256, 4, THREE.RGBAFormat, THREE.FloatType); palTex.magFilter = palTex.minFilter = THREE.NearestFilter; palTex.needsUpdate = true;
const COUNTRIES = [], STATES = [], COUNTIES = [];   // { id, name, lon, lat }
const mapUni = { uSun: { value: V3(-0.55, 0.62, -0.55).normalize() }, uFade: { value: new THREE.Vector2(400, 900) }, uT: { value: 0 }, uCty: { value: 0 }, uDim: { value: 0 }, uV5: { value: 0 } };   // uV5: v5 grade (brighter, more saturated land — see parts_hilab)
function mapMaterial(B, dem, idTex, us, sat) {
  const dx = (B.lon1 - B.lon0) * CLAT * SC / dem.image.width, dz = (B.lat1 - B.lat0) * SC / dem.image.height;
  return new THREE.ShaderMaterial({ uniforms: { tDem: { value: dem }, tId: { value: idTex }, tPal: { value: palTex }, tSat: { value: sat }, uSun: mapUni.uSun, uFade: mapUni.uFade, uT: mapUni.uT, uCty: mapUni.uCty, uDim: mapUni.uDim, uV5: mapUni.uV5,
      uE: { value: new THREE.Vector2(1 / dem.image.width, 1 / dem.image.height) }, uD: { value: new THREE.Vector2(dx, dz) }, uP: { value: new THREE.Vector2(1 / B.cw, 1 / B.ch) } }, fog: false,
    defines: us ? { US: 1 } : {},
    vertexShader: `uniform sampler2D tDem, tId, tPal; uniform vec2 uE, uD; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vHt, vDp;
      float hh(vec2 uv){ vec4 d = texture2D(tDem, uv);
      #ifdef US
        return d.r * d.r * 11.0;
      #else
        return d.r * d.r * 13.1 - d.g * d.g * 3.0;
      #endif
      }
      void main(){ vUv = uv; vec4 idc = texture2D(tId, uv); float cid = floor(idc.r * 255.0 + 0.5), sid = floor(idc.g * 255.0 + 0.5), kid = floor(idc.b * 255.0 + 0.5);
        float h = hh(uv); vN = vec3(0.0, 1.0, 0.0);
        vec4 lf = texture2D(tPal, vec2((sid > 0.5 ? sid : cid) / 256.0 + 0.5 / 256.0, 2.5 / 4.0)); float lift = sid > 0.5 ? lf.g : lf.r;
        if (kid > 0.5) lift += texture2D(tPal, vec2(kid / 256.0 + 0.5 / 256.0, 2.5 / 4.0)).b;
        vec4 d = texture2D(tDem, uv); vHt = d.r; vDp = d.g;
        vec3 p = position; p.y += h + lift;
      #ifndef US
        if (sid > 0.5 && uv.y > 0.5833) p.y -= 0.6;   // tuck the world's US (lower 48 + Alaska; not Hawaii) under the finer planes
      #endif
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tId, tPal, tDem, tSat; uniform vec3 uSun; uniform vec2 uFade, uP, uE, uD; uniform float uT, uCty, uDim, uV5; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vHt, vDp;
      float hh(vec2 uv){ vec4 d = texture2D(tDem, uv);
      #ifdef US
        return d.r * d.r * 11.0;
      #else
        return d.r * d.r * 13.1 - d.g * d.g * 3.0;
      #endif
      }
      float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ return 0.5 * vn(p) + 0.25 * vn(p * 2.03) + 0.125 * vn(p * 4.11) + 0.0625 * vn(p * 8.3); }
      vec3 ids(vec2 o){ vec4 c = texture2D(tId, vUv + o); return floor(c.rgb * 255.0 + 0.5); }
      float liftOf(vec3 c){ vec4 lf = texture2D(tPal, vec2((c.g > 0.5 ? c.g : c.r) / 256.0 + 0.5 / 256.0, 2.5 / 4.0)); float l = c.g > 0.5 ? lf.g : lf.r; if (c.b > 0.5) l += texture2D(tPal, vec2(c.b / 256.0 + 0.5 / 256.0, 2.5 / 4.0)).b; return l; }
      void main(){ vec3 id = ids(vec2(0.0)); float cid = id.x, sid = id.y, kid = id.z;
      #ifdef US
        if (sid < 0.5) discard;
      #endif
        float hx = hh(vUv + vec2(uE.x, 0.0)) - hh(vUv - vec2(uE.x, 0.0)), hz = hh(vUv - vec2(0.0, uE.y)) - hh(vUv + vec2(0.0, uE.y));
        vec3 n = vec3(-hx / (2.0 * uD.x), 1.0, -hz / (2.0 * uD.y));
        // fine detail when the camera is close (keeps close-ups from looking soft): fbm bumps scaled by relief and distance
        float dist0 = length(vW - cameraPosition), dk = 1.0 - smoothstep(30.0, 260.0, dist0);
        if (dk > 0.0) { vec2 q = vW.xz * 2.6; float e1 = fbm(q), ex = fbm(q + vec2(0.07, 0.0)), ez = fbm(q + vec2(0.0, 0.07)); float amp = dk * (0.15 + 1.2 * vHt) * 0.5; n.x -= (ex - e1) / 0.07 * amp * 0.25; n.z -= (ez - e1) / 0.07 * amp * 0.25; }
        n = normalize(n); float dif = max(dot(n, uSun), 0.0), sh = 0.3 + 1.05 * dif;
        float e = vHt; vec3 land = mix(vec3(0.24, 0.33, 0.18), vec3(0.40, 0.40, 0.24), smoothstep(0.06, 0.32, e)); land = mix(land, vec3(0.50, 0.40, 0.28), smoothstep(0.32, 0.55, e));
        land = mix(land, vec3(0.42, 0.33, 0.26), smoothstep(0.55, 0.75, e)); land = mix(land, vec3(0.86, 0.86, 0.88), smoothstep(0.78, 0.92, e));
        vec3 sat = texture2D(tSat, vUv).rgb; float lum = dot(sat, vec3(0.3, 0.59, 0.11)); sat = mix(vec3(lum), sat, 1.25 + 0.35 * uV5); land = sat * (1.4 + 0.5 * uV5);
        bool sea = cid < 0.5 && vHt < 0.03 && vDp > 0.0;
        vec3 col;
        if (sea) { float dp = vDp; col = mix(vec3(0.10, 0.30, 0.38), vec3(0.04, 0.12, 0.22), smoothstep(0.02, 0.3, dp)); col = mix(col, vec3(0.02, 0.06, 0.13), smoothstep(0.3, 0.8, dp)); col *= 0.55 + 0.6 * dif; }
        else { float sh2 = 0.22 + 1.35 * pow(dif, 1.15); if (uV5 > 0.0) sh2 = mix(sh2, 0.12 + 1.6 * pow(dif, 1.4), uV5); col = land * sh2; }   // v5: deeper relief shading (Geolyth-like embossed look)
        // v4: a darker, calmer background so the painted subject glows (mapUni.uDim 0..1)
        if (uDim > 0.0) { float lm = dot(col, vec3(0.3, 0.59, 0.11)); if (sea) col *= 1.0 - 0.45 * uDim; else col = mix(col, vec3(lm), 0.25 * uDim) * (1.0 - 0.12 * uDim); }   // v4: deeper sea, land only slightly calmer (she found the full dim too dark)
        if (cid > 0.5 || sid > 0.5) { vec4 c = sid > 0.5 ? texture2D(tPal, vec2(sid / 256.0 + 0.5 / 256.0, 1.5 / 4.0)) : texture2D(tPal, vec2(cid / 256.0 + 0.5 / 256.0, 0.5 / 4.0));
          vec3 V = normalize(cameraPosition - vW), Hh = normalize(uSun + V); float spec = pow(max(dot(n, Hh), 0.0), 40.0) * 0.6;
          vec3 pc = c.rgb * (0.42 + 0.95 * dif) * 1.15 + spec; if (uV5 > 0.0) pc = mix(pc, c.rgb * (0.16 + 1.3 * pow(dif, 1.35)) + spec * 0.2, uV5);   // v5: deep saturated paint, relief shows through (Geolyth-like)
          col = mix(col, pc, c.a); col += c.rgb * c.a * 0.12 * (1.0 - 0.6 * uV5); }
        if (kid > 0.5) { vec4 c = texture2D(tPal, vec2(kid / 256.0 + 0.5 / 256.0, 3.5 / 4.0)); col = mix(col, c.rgb * (0.5 + 0.8 * dif), c.a); col += c.rgb * c.a * 0.1; }
        // borders: compare ids with the neighbours (states thin, countries brighter, coasts soft)
        vec3 a = ids(vec2(uP.x, 0.0)), b = ids(vec2(-uP.x, 0.0)), c2 = ids(vec2(0.0, uP.y)), d = ids(vec2(0.0, -uP.y)); bool kb = a.z != kid || b.z != kid || c2.z != kid || d.z != kid;
        bool cb = a.x != cid || b.x != cid || c2.x != cid || d.x != cid; bool sb = a.y != sid || b.y != sid || c2.y != sid || d.y != sid;
        bool coast = cb && (cid < 0.5 || a.x < 0.5 || b.x < 0.5 || c2.x < 0.5 || d.x < 0.5);
        if (coast) col = mix(col, vec3(0.75, 0.85, 0.9), 0.18);
        { float myL = liftOf(id); float sh3 = 0.0; for (int k = 1; k <= 4; k++) { vec2 o = normalize(vec2(uSun.x, -uSun.z)) * uP * (3.0 * float(k)); float l = liftOf(ids(o)); sh3 = max(sh3, smoothstep(0.25, 1.2, l - myL) * (1.0 - 0.18 * float(k))); } col *= 1.0 - 0.5 * sh3; }
        float dist = length(vW - cameraPosition); col = mix(col, vec3(0.027, 0.067, 0.114), clamp((dist - uFade.x) / (uFade.y - uFade.x), 0.0, 0.9));
        gl_FragColor = vec4(col, 1.0); }` }); }
function planeFor(B, mat, sx, sz) { const w = (B.lon1 - B.lon0) * CLAT * SC, d = (B.lat1 - B.lat0) * SC, c = ll2xz((B.lon0 + B.lon1) / 2, (B.lat0 + B.lat1) / 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, sx, sz).rotateX(-Math.PI / 2), mat); m.position.copy(c); m.frustumCulled = false; MAPSC.add(m); return m; }
function d3c(geom) { const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let best = null, ba = -1;
  for (const p of polys) { const r = p[0]; let a = 0, cx = 0, cy = 0; for (let i = 0; i < r.length - 1; i++) { const [x0, y0] = r[i], [x1, y1] = r[i + 1], k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k; } if (Math.abs(a) > ba) { ba = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; } } return best; }
function idCanvas(B, countries, states, usaId, counties = []) { const cv = document.createElement('canvas'); cv.width = B.cw; cv.height = B.ch; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, B.cw, B.ch);
  const P = ([lon, lat]) => [(lon - B.lon0) / (B.lon1 - B.lon0) * B.cw, (B.lat1 - lat) / (B.lat1 - B.lat0) * B.ch];
  const draw = (geom, col) => { g.fillStyle = col; g.beginPath(); const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) for (const ring of poly) { let px = null; ring.forEach((pt, i) => { let [lon, lat] = pt; if (px !== null && Math.abs(lon - px) > 180) lon += lon < px ? 360 : -360; px = lon; const [x, y] = P([lon, lat]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } g.fill('evenodd'); };
  countries.forEach(f => f.geometry && draw(f.geometry, `rgb(${f.cid},0,0)`)); states.forEach(f => draw(f.geometry, `rgb(${usaId},${f.sid},0)`)); counties.forEach(f => draw(f.geometry, `rgb(${usaId},${f.sid},${f.kid})`));
  const tx = new THREE.CanvasTexture(cv); tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.colorSpace = THREE.NoColorSpace; return tx; }
let worldMesh = null, usMesh = null, akMesh = null, WORLD_CV = null, HGT = () => 0; const BORDERS = {}, TOPO = {}, RIMS = {};
// a thick white rim around a raised state / country (built on first use); call rims(t) once per frame after painting
function rim(kind, name) { const key = kind + ':' + name; if (RIMS[key]) return RIMS[key]; const topo = kind === 'state' ? TOPO.us : TOPO.wd, obj = kind === 'state' ? topo.objects.states : topo.objects.countries;
  const g = obj.geometries.find(q => q.properties && q.properties.name === name); if (!g) return null; const l = TOPO.lines(topojson.mesh(topo, obj, (a, b) => a === g || b === g), 4.2, 0xffffff, 0, 1); l.renderOrder = 1.5; return (RIMS[key] = l); }
function rims(list) { for (const k in RIMS) RIMS[k].material.opacity = 0; for (const [kind, name, a] of list) { const l = rim(kind, name); if (l) l.material.opacity = a; } }
function countryAt(lon, lat) { const x = Math.floor((lon - WB.lon0) / (WB.lon1 - WB.lon0) * WB.cw), y = Math.floor((WB.lat1 - lat) / (WB.lat1 - WB.lat0) * WB.ch); const d = WORLD_CV.getContext("2d").getImageData(x, y, 1, 1).data; const c = COUNTRIES.find(q => q.id === d[0]); return c ? c.name : ""; }
const mapReady = (async () => {
  const [us, wd] = await Promise.all([fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()), fetch('node_modules/world-atlas/countries-50m.json').then(r => r.json())]);
  const cf = topojson.feature(wd, wd.objects.countries).features; cf.forEach((f, i) => { f.cid = i + 1; if (f.geometry) { const c = d3c(f.geometry); COUNTRIES.push({ id: f.cid, name: f.properties.name, lon: c[0], lat: c[1] }); } });
  const usa = cf.find(f => f.properties.name === 'United States of America');
  const sf = topojson.feature(us, us.objects.states).features; sf.forEach((f, i) => { f.sid = i + 1; const c = d3c(f.geometry); STATES.push({ id: f.sid, name: f.properties.name, lon: c[0], lat: c[1] }); });
  const L = new THREE.TextureLoader(); const [wdem, udem, adem, wsat, usat, asat] = await Promise.all([L.loadAsync('data/world_dem.png'), L.loadAsync('data/us_dem2.png'), L.loadAsync('data/ak_dem.png'), L.loadAsync('data/sat_world.jpg'), L.loadAsync('data/sat_us.jpg'), L.loadAsync('data/sat_ak.jpg')]);
  for (const t of [wsat, usat, asat]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; }
  for (const d of [wdem, udem, adem]) { d.colorSpace = THREE.NoColorSpace; d.minFilter = THREE.LinearFilter; d.generateMipmaps = false; }
  worldMesh = planeFor(WB, mapMaterial(WB, wdem, idCanvas(WB, cf, sf, usa.cid), false, wsat), 1500, 580);
  WORLD_CV = worldMesh.material.uniforms.tId.value.image;
  let kf = [];
  if (typeof COUNTY_FIPS === 'string') { const cj = await fetch('node_modules/us-atlas/counties-10m.json').then(r => r.json()); const st = sf.find(f => f.id === COUNTY_FIPS);
    kf = topojson.feature(cj, cj.objects.counties).features.filter(f => String(f.id).startsWith(COUNTY_FIPS)); kf.forEach((f, i) => { f.kid = i + 1; f.sid = st.sid; const c = d3c(f.geometry); COUNTIES.push({ id: f.kid, name: f.properties.name, fips: f.id, lon: c[0], lat: c[1] }); }); }
  usMesh = planeFor(UB, mapMaterial(UB, udem, idCanvas(UB, [], sf, usa.cid, kf), true, usat), 1100, 600); usMesh.position.y = 0.02;
  akMesh = planeFor(AKB, mapMaterial(AKB, adem, idCanvas(AKB, [], sf.filter(f => f.properties.name === 'Alaska'), usa.cid), true, asat), 700, 340); akMesh.position.y = 0.02;
  // ---- vector borders: heights sampled from the same DEMs; drawn after the terrain without depth test (props draw over them) ----
  const sampler = (img, B, k, sea) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    return (lon, lat) => { if (lon < B.lon0 || lon >= B.lon1 || lat <= B.lat0 || lat > B.lat1) return null; const x = Math.floor((lon - B.lon0) / (B.lon1 - B.lon0) * c.width), y = Math.floor((B.lat1 - lat) / (B.lat1 - B.lat0) * c.height); const r = d[(y * c.width + x) * 4] / 255; return r * r * k; }; };
  const hU = sampler(udem.image, UB, 11), hA = sampler(adem.image, AKB, 11), hW = sampler(wdem.image, WB, 13.1);
  HGT = (lon, lat) => hU(lon, lat) ?? hA(lon, lat) ?? hW(lon, lat) ?? 0;
  const segs = (mesh) => { const pos = []; for (const line of mesh.coordinates) { for (let i = 0; i < line.length - 1; i++) { let [a0, b0] = line[i], [a1, b1] = line[i + 1]; if (Math.abs(a1 - a0) > 180) continue;
        const n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, b1 - b0) / 0.05)); for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n; const p = [a0 + (a1 - a0) * u0, b0 + (b1 - b0) * u0], q = [a0 + (a1 - a0) * u1, b0 + (b1 - b0) * u1];
          const P = ll2xz(p[0], p[1]), Q = ll2xz(q[0], q[1]); pos.push(P.x, HGT(p[0], p[1]) + 0.3, P.z, Q.x, HGT(q[0], q[1]) + 0.3, Q.z); } } } return pos; };
  // the lines ride on the painted lift: the vertex shader looks up the ids around each vertex in the planes' id textures and adds the biggest lift
  const idU = usMesh.material.uniforms.tId.value, idA = akMesh.material.uniforms.tId.value, idW = worldMesh.material.uniforms.tId.value;
  const liftGLSL = `uniform sampler2D tIdU, tIdA, tIdW, tPal; uniform vec4 bU, bA, bW;
    float liftId(vec3 c){ vec4 lf = texture2D(tPal, vec2((c.g > 0.5 ? c.g : c.r) / 256.0 + 0.5 / 256.0, 2.5 / 4.0)); float l = c.g > 0.5 ? lf.g : lf.r; if (c.b > 0.5) l += texture2D(tPal, vec2(c.b / 256.0 + 0.5 / 256.0, 2.5 / 4.0)).b; return l; }
    float liftTex(sampler2D t, vec2 uv, vec2 px){ float m = 0.0; for (int i = 0; i < 5; i++) { vec2 o = i == 0 ? vec2(0.0) : i == 1 ? vec2(px.x, 0.0) : i == 2 ? vec2(-px.x, 0.0) : i == 3 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
      m = max(m, liftId(floor(texture2D(t, uv + o).rgb * 255.0 + 0.5))); } return m; }
    float liftAt(vec3 p){ float lon = p.x / ${(CLAT * SC).toFixed(6)} - 96.0, lat = 38.0 - p.z / ${SC.toFixed(1)};
      if (lon > bU.x && lon < bU.y && lat > bU.z && lat < bU.w) return liftTex(tIdU, vec2((lon - bU.x) / (bU.y - bU.x), (lat - bU.z) / (bU.w - bU.z)), vec2(2.0 / ${UB.cw}.0, 2.0 / ${UB.ch}.0));
      if (lon > bA.x && lon < bA.y && lat > bA.z && lat < bA.w) return liftTex(tIdA, vec2((lon - bA.x) / (bA.y - bA.x), (lat - bA.z) / (bA.w - bA.z)), vec2(2.0 / ${AKB.cw}.0, 2.0 / ${AKB.ch}.0));
      return liftTex(tIdW, vec2((lon - bW.x) / (bW.y - bW.x), (lat - bW.z) / (bW.w - bW.z)), vec2(2.0 / ${WB.cw}.0, 2.0 / ${WB.ch}.0)); }
`;
  const bv = B => new THREE.Vector4(B.lon0, B.lon1, B.lat0, B.lat1);
  const lines = (mesh, width, color, opacity, order) => { const g = new LineSegmentsGeometry(); g.setPositions(segs(mesh)); const m = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false, resolution: new THREE.Vector2(W, H) });
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, { tIdU: { value: idU }, tIdA: { value: idA }, tIdW: { value: idW }, tPal: { value: palTex }, bU: { value: bv(UB) }, bA: { value: bv(AKB) }, bW: { value: bv(WB) } });
      sh.vertexShader = sh.vertexShader.replace('void main() {', liftGLSL + '\nvoid main() {').replace('vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );', 'vec4 start = modelViewMatrix * vec4( instanceStart + vec3(0.0, liftAt(instanceStart), 0.0), 1.0 );')
        .replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );', 'vec4 end = modelViewMatrix * vec4( instanceEnd + vec3(0.0, liftAt(instanceEnd), 0.0), 1.0 );'); };
    m.customProgramCacheKey = () => 'lift-lines';
    const l = new LineSegments2(g, m); l.renderOrder = order; l.frustumCulled = false; MAPSC.add(l); return l; };
  TOPO.us = us; TOPO.wd = wd; TOPO.lines = lines;
  BORDERS.country = lines(topojson.mesh(wd, wd.objects.countries, (a, b) => a !== b), 2.4, 0xf4f1ea, 0.7, 1);
  BORDERS.state = lines(topojson.mesh(us, us.objects.states, (a, b) => a !== b), 1.8, 0xeef2fa, 0.55, 1);
  if (typeof COUNTY_FIPS === 'string') { const cj = await fetch('node_modules/us-atlas/counties-10m.json').then(r => r.json()); const geos = { type: 'GeometryCollection', geometries: cj.objects.counties.geometries.filter(g => String(g.id).startsWith(COUNTY_FIPS)) };
    BORDERS.county = lines(topojson.mesh(cj, geos, (a, b) => a !== b), 1.1, 0xeef2fa, 0, 1); }
  for (const m of [worldMesh, usMesh, akMesh]) m.renderOrder = 0; })();
function orderProps() { const base = [worldMesh, usMesh, akMesh]; MAPSC.traverse(o => { if (o.isMesh && !base.includes(o) && !o.isLineSegments2) o.renderOrder = 2; }); }
const CT = name => COUNTRIES.find(s => s.name === name), ST = name => STATES.find(s => s.name === name);
const llPos = (lon, lat, y = 0) => ll2xz(lon, lat).setY(y);
const stPos = (name, y = 4) => { const s = ST(name); return ll2xz(s.lon, s.lat).setY(y); };
const ctPos = (name, y = 4) => { const s = CT(name); return ll2xz(s.lon, s.lat).setY(y); };
function paintRow(row, id, hex, a, lift) { const c = new THREE.Color(hex), o = (row * 256 + id) * 4; PAL[o] = c.r; PAL[o + 1] = c.g; PAL[o + 2] = c.b; PAL[o + 3] = a; const l = (2 * 256 + id) * 4; PAL[l + (row === 0 ? 0 : row === 1 ? 1 : 2)] = lift; }
const CY = name => COUNTIES.find(s => s.name === name);
const cyPos = (name, y = 4) => { const s = CY(name); return ll2xz(s.lon, s.lat).setY(y); };
function paintCounty(name, hex, a, lift = 0) { const s = CY(name); if (s) paintRow(3, s.id, hex, a, lift); }
function paintState(name, hex, a, lift = 0) { const s = ST(name); if (s) paintRow(1, s.id, hex, a, lift); }
function paintCountry(name, hex, a, lift = 0) { const s = CT(name); if (s) paintRow(0, s.id, hex, a, lift); }
function clearPaint() { PAL.fill(0); }
// ---- low-poly landmarks / props ----
const WM = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.55, flatShading: true });
function whiteHouse() { const g = new THREE.Group(); const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, WM); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(8, 2.2, 3), 0, 1.1, 0); add(new THREE.BoxGeometry(8.4, 0.25, 3.3), 0, 2.3, 0); add(new THREE.BoxGeometry(3.2, 0.6, 3.6), 0, 2.6, 0);
  for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.14, 0.14, 2.2, 8), -1.25 + k * 0.5, 1.1, 1.85); add(new THREE.CylinderGeometry(1.6, 1.6, 0.3, 16, 1, false, 0, Math.PI), 0, 2.35, 1.6).rotation.y = -Math.PI / 2;
  add(new THREE.BoxGeometry(2.6, 0.2, 2.6), 0, 0.1, 3.4); const fl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.04), new THREE.MeshStandardMaterial({ color: '#c8303a' })); fl.position.set(0, 3.9, 0); g.add(fl); add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), -0.45, 3.5, 0);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(4, 1.2, 1.6), sx * 6, 0.6, -0.2); return g; }
const WH = whiteHouse(); WH.visible = false; MAPSC.add(WH);
const DOJ = (() => { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#d9d2c2', roughness: 0.6, flatShading: true }); const b = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 3.5), m); b.position.y = 1.2; g.add(b);
  for (let k = 0; k < 8; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.4, 8), m); c.position.set(-2.8 + k * 0.8, 1.2, 1.9); g.add(c); } const r = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.4, 3.9), m); r.position.y = 2.6; g.add(r); g.visible = false; MAPSC.add(g); return g; })();
// Cybertruck-like wedge pickup (generic, no logo) and a small rounded robotaxi pod
const TRUCK = (() => { const g = new THREE.Group(); const s = new THREE.Shape(); s.moveTo(-2.6, 0.35); s.lineTo(2.6, 0.35); s.lineTo(2.6, 1.0); s.lineTo(0.2, 1.75); s.lineTo(-2.6, 1.05); s.closePath();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 2.0, bevelEnabled: false }).translate(0, 0, -1.0), new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.75, roughness: 0.32, flatShading: true })); g.add(body);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 1.7), new THREE.MeshStandardMaterial({ color: '#10141a', roughness: 0.2 })); gl.position.set(0.9, 1.38, 0); gl.rotation.z = -0.29; g.add(gl);
  for (const x of [-1.7, 1.7]) for (const z of [-1.0, 1.0]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1a1a1e' })); w.position.set(x, 0.45, z); g.add(w); }
  const lb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.9), new THREE.MeshBasicMaterial({ color: '#ffffff' })); lb.position.set(-2.62, 1.0, 0); g.add(lb); g.visible = false; MAPSC.add(g); return g; })();
const POD = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.0, 6, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8dce2', metalness: 0.5, roughness: 0.3 })); b.position.y = 1.0; b.scale.set(1, 0.85, 0.9); g.add(b);
  const wdw = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.4, 6, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0e1218', roughness: 0.15 })); wdw.position.set(0.1, 1.25, 0); wdw.scale.set(1, 0.7, 0.95); g.add(wdw); g.visible = false; MAPSC.add(g); return g; })();
// map pins: a glowing disc + a ring pulse + a stick with a ball
const PINS = [];
function makePin(col) { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: col }); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 10), m); ball.position.y = 3.2; g.add(ball);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); st.position.y = 1.6; g.add(st);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false })); ring.position.y = 0.3; g.add(ring); g.userData.ring = ring; g.visible = false; MAPSC.add(g); PINS.push(g); return g; }
// 3D bars (base at y = 0)
const BARS = [];
function makeBar(col) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 })); m.visible = false; MAPSC.add(m); BARS.push(m); return m; }
// flight arcs: a tube along a raised great-circle-ish curve, revealed by drawRange
function makeArc(a, b, hgt, col) { const mid = a.clone().lerp(b, 0.5).setY(hgt); const cur = new THREE.QuadraticBezierCurve3(a, mid, b); const geo = new THREE.TubeGeometry(cur, 120, 0.45, 8, false);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col })); m.visible = false; m.userData.n = geo.index.count; MAPSC.add(m); m.userData.cur = cur; return m; }
function arcShow(m, k) { m.visible = k > 0.001; m.geometry.setDrawRange(0, Math.floor(m.userData.n * clamp(k, 0, 1) / 6) * 6); }
// =================== MAP v5 add-on (Nov 11 2026, from the Geolyth / geomapstories comparison) — include AFTER parts_map2/m3_map.js ===================
// addHiPatch(name): a high-res focus plane over the region of the story (data/hi_<name>_*.{png,jpg,json} from tools/hires_patch.py) + its rivers.
// groundLabel(text, lon, lat, size, opts): a place name lying ON the terrain in perspective. cityDot(name, lon, lat, size): white dot + ring + name.
// Also set mapUni.uV5.value = 1 (brighter land, deeper paint with the relief showing through) and mapUni.uDim.value = 0.
// Load the Inter weights before drawing label canvases: await Promise.all(['900','800','700','600'].map(w => document.fonts.load(`${w} 160px Inter`))).
let HIM = null, RIV = null;
async function addHiPatch(name) {
  const meta = await fetch(`data/hi_${name}_rivers.json`).then(r => r.json()); const [lon0, lon1, lat0, lat1] = meta.bbox; const HB = { lon0, lon1, lat0, lat1, cw: meta.w, ch: meta.h };
  const L = new THREE.TextureLoader(); const [dem, sat] = await Promise.all([L.loadAsync(`data/hi_${name}_dem.png`), L.loadAsync(`data/hi_${name}_sat.jpg`)]);
  sat.colorSpace = THREE.SRGBColorSpace; sat.anisotropy = 8; sat.generateMipmaps = true; sat.minFilter = THREE.LinearMipmapLinearFilter; dem.colorSpace = THREE.NoColorSpace; dem.minFilter = THREE.LinearFilter; dem.generateMipmaps = false;
  const sf = topojson.feature(TOPO.us, TOPO.us.objects.states).features; sf.forEach((f, i) => { f.sid = i + 1; }); const usaId = COUNTRIES.find(c => c.name === 'United States of America').id;
  HIM = planeFor(HB, mapMaterial(HB, dem, idCanvas(HB, [], sf, usaId), true, sat), 1400, 1150); HIM.position.y = 0.06; HIM.renderOrder = 0;
  RIV = TOPO.lines({ coordinates: meta.rivers }, 1.7, 0x8fd0ff, 0.85, 1); }
// v5: place names lying ON the terrain in perspective (theirs: 'Zaporizhzhia', 'Black Sea', 'Gulf of Mexico') + city dots with a pill label
const GLAB = [];
function groundLabel(text, lon, lat, size, { font = '800', italic = false, color = '#ffffff', shadow = 0.55, rot = 0, spacing = 0.08 } = {}) {
  const cv = document.createElement('canvas'), g = cv.getContext('2d'); const fs = 160; g.font = `${italic ? 'italic ' : ''}${font} ${fs}px Inter`; const w = Math.ceil(g.measureText(text).width * (1 + spacing) + fs * 0.6);
  cv.width = w; cv.height = Math.ceil(fs * 1.5); g.font = `${italic ? 'italic ' : ''}${font} ${fs}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${spacing * fs}px`;
  g.shadowColor = `rgba(0,0,0,${shadow})`; g.shadowBlur = fs * 0.12; g.shadowOffsetY = fs * 0.06; g.fillStyle = color; g.fillText(text, cv.width / 2, cv.height / 2);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * cv.width / cv.height, size), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }));
  m.rotation.set(-Math.PI / 2, 0, rot); const p = ll2xz(lon, lat); m.position.set(p.x, HGT(lon, lat) + 2.2, p.z); m.renderOrder = 3; m.visible = false; MAPSC.add(m); GLAB.push(m); return m; }
function cityDot(name, lon, lat, size) { const g = new THREE.Group(); const p = ll2xz(lon, lat); g.position.set(p.x, HGT(lon, lat) + 1.6, p.z);
  const d = new THREE.Mesh(new THREE.CircleGeometry(size * 0.16, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false })); d.renderOrder = 3; g.add(d);
  const r = new THREE.Mesh(new THREE.RingGeometry(size * 0.2, size * 0.27, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthTest: false })); r.renderOrder = 3; g.add(r);
  g.visible = false; MAPSC.add(g); GLAB.push(g); const l = groundLabel(name, lon, lat, size * 0.36, { font: '700', shadow: 0.8 }); l.position.x += size * 0.95 + l.geometry.parameters.width / 2 - size * 0.5; return g; }
// =================== "The last 24 hours" — Nov 11 2026 (Veterans Day) — the first daily built on the v5 rules (QUALITY_NOV11.md) ===================
// v5: steady push-in camera + turn on every hold, bright map (uV5), cut-out portraits, a first-frame hook with the date, subject SFX, 60 fps.
// Stories: 11 Democrats (incl. Pelosi) skipped the 211–204 Hegseth vote → Jim Jordan beats Scalise by 33 for House GOP leader → Thune stays; Sanders + ≥5 senators-elect won't back Schumer
// → the U.S. may lose measles-elimination status (held since 2000), PAHO decision as early as next week → U.S.-hosted Russia–Ukraine talks in Abu Dhabi (prisoner swap) → Veterans Day at Arlington.
// Sources: Democracy Now headlines Nov 11; Just Security Early Edition Nov 11; NBC/CNN live blogs; NBC/NPR/PBS (Abu Dhabi talks, Nov 10).
const V5LOOK = true;
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { pelosi: S[1], rubric: S[2], vote: S[3], n211: wordT('211', S[3]), n204: wordT('204', S[3]), margin: S[4], seven: wordT('seven', S[4]), ifall: S[5], alive: wordT('alive', S[5]), trump: S[6], exon: wordT('exoneration', S[6]),
  jordan: S[7], scalise: S[8], n33: wordT('33', S[8]), johnson: wordT('Mike', S[8]), jan: wordT('January', S[8]), senate: S[9], thune: wordT('John', S[9]), fight: S[10], sanders: S[11], schumer: wordT('Chuck', S[11]), five: wordT('five', S[11]),
  measles: S[12], y2000: wordT('2000', S[12]), decision: S[13], world: S[14], abu: wordT('Abu', S[14]), swap: S[15], vets: S[16], ask: S[17] };
const EV = Object.values(T).sort((a, b) => a - b);
const CUES = [[0.02, 'whoosh', 0.5], [0.08, 'stamp', 0.7], ...EV.slice(1).map(t => [t, 'pop', 0.5]),
  [T.pelosi, 'shutter', 0.9], [T.rubric - 0.3, 'whoosh', 0.6], [T.vote, 'gavel', 0.8], [T.n211, 'rise', 0.6], [T.ifall + 0.6, 'flip', 0.7], [T.alive, 'ding', 0.7], [T.trump, 'shutter', 0.9],
  [T.jordan - 0.3, 'whoosh', 0.6], [T.jordan, 'shutter', 0.9], [T.n33, 'cheer', 0.5], [T.senate - 0.3, 'whoosh', 0.6], [T.thune, 'shutter', 0.9], [T.fight, 'crowd', 0.6], [T.sanders, 'shutter', 0.9],
  [T.measles - 0.3, 'whoosh', 0.6], [T.measles, 'alarm', 0.6], [T.decision, 'paper', 0.8], [T.world - 0.3, 'jet', 0.6], [T.swap, 'ding', 0.7], [T.vets - 0.3, 'whoosh', 0.6], [T.ask, 'thud', 0.6], [ENDC, 'thud', 0.5]];
const PL = { dc: [-77.01, 38.89], house: [-71.8, 37.4], senate: [-71.6, 40.2], ohio: [-82.8, 40.3], louisiana: [-91.9, 31.0], sd: [-100.2, 44.4], abu: [54.37, 24.45], moscow: [37.62, 55.75], kyiv: [30.52, 50.45], arlington: [-77.07, 38.876] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 1.05, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.rubric - 0.35, shot(off('house', 0, -9), 120, -0.3, 1.05), shot(off('house', 0, -9), 104, 0.15, 1.1)],
    [T.rubric + 0.15, T.vote - 0.3, shot([-96, 38.5], 900, 0, 0.75), shot([-96, 38.5], 760, 0.08, 0.8)],
    [T.vote + 0.15, T.jordan - 0.35, shot(off('house', 0, -9), 118, -0.25, 1.05), shot(off('house', 0, -9), 104, 0.3, 1.1)],
    [T.jordan + 0.15, T.senate - 0.35, shot([-87, 36.5], 300, -0.2, 0.95), shot([-87, 36.5], 260, 0.15, 1.0)],
    [T.senate + 0.15, T.five - 0.35, shot(off('senate', 0, 2), 64, 0.2, 1.15), shot(off('senate', 0, 2), 54, -0.25, 1.2)],
    [T.five + 0.15, T.measles - 0.35, shot([-84, 43], 420, 0.1, 0.9), shot([-84, 43], 360, -0.1, 0.95)],
    [T.measles + 0.15, T.world - 0.35, shot([-96, 38.5], 820, 0, 0.75), shot([-96, 38.5], 700, -0.08, 0.8)],
    [T.world + 1.1, T.vets - 0.35, shot([45, 40], 1150, 0.1, 0.75), shot([47, 38], 980, -0.1, 0.8)],
    [T.vets + 1.0, T.ask - 0.3, shot('arlington', 70, 0.4, 1.1), shot('arlington', 56, -0.2, 1.15)],
    [T.ask + 0.15, T_END, shot([-96, 38.5], 900, 0, 0.7), shot([-96, 38.5], 980, 0.05, 0.65)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) { const sh = lerpShot(A, B, 0.25 * esin(span(t, a, b)) + 0.75 * span(t, a, b));
      const el = t - a; sh.h *= Math.exp(-0.075 * Math.min(el, 3) - 0.015 * Math.max(0, el - 3)); sh.yaw += 0.1 * el * (i % 2 ? -1 : 1); sh.tilt *= 1 + 0.03 * Math.min(el, 4);   // v5 camera
      return sh; }
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = shotAt(b), N = shotAt(nx[0]), u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.45); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
// ---- props: the Capitol, the House (435) and Senate (100) chambers, arcs to Abu Dhabi ----
let PROPS = null;
const CAP = new THREE.Group(); MAPSC.add(CAP);
{ const wm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.5, flatShading: true });
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, wm); m.position.set(x, y, z); CAP.add(m); return m; };
  add(new THREE.BoxGeometry(9, 1.6, 2.4), 0, 0.8, 0); add(new THREE.BoxGeometry(3, 2.2, 2.8), 0, 1.1, 0); add(new THREE.CylinderGeometry(1.3, 1.4, 1.6, 16), 0, 2.9, 0);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), Math.cos(a) * 1.45, 2.8, Math.sin(a) * 1.45); }
  add(new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.6, 0).scale.y = 1.25; add(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10), 0, 5.4, 0); add(new THREE.SphereGeometry(0.16, 8, 6), 0, 6.0, 0);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), sx * (1.8 + k * 0.5), 0.9, 1.25); CAP.visible = false; }
function chamber(n, rows, r0, dr) { const seats = []; for (let r = 0; r < rows; r++) { const R = r0 + r * dr, m = Math.round(Math.PI * R / (dr * 0.95)); for (let i = 0; i < m; i++) seats.push({ a: Math.PI * (1 - (i + 0.5) / m), R, r }); }
  seats.sort((p, q) => q.a - p.a || p.R - q.R); return seats.slice(0, n); }
// House on the vote: seats 0–203 = 204 "keep" (Democrats + Massie), 204–414 = 211 "shelve", 415–425 = the 11 Democrats who skipped (grey, then blue in the what-if), the rest vacant
const SKIP0 = 193, SKIP1 = 204;   // the 11 absent Democrats sit at the right end of the blue block
function buildProps() { const P = {};
  P.house = chamber(435, 13, 9, 2.0); P.hMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.05 }), 435); P.hMesh.frustumCulled = false; P.hMesh.visible = false; MAPSC.add(P.hMesh);
  P.senateS = chamber(100, 7, 6, 2.0); P.sMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.05 }), 100); P.sMesh.frustumCulled = false; P.sMesh.visible = false; MAPSC.add(P.sMesh);
  P.arcs = [makeArc(P3('dc', 0.5), P3('abu', 0.5), 900, GOLD), makeArc(P3('moscow', 0.5), P3('abu', 0.5), 380, '#ff4a4a'), makeArc(P3('kyiv', 0.5), P3('abu', 0.5), 340, '#ffd23a')];
  P.ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, depthWrite: false })); P.ring.visible = false; MAPSC.add(P.ring);
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), col = new THREE.Color();
function seatPos(s, c0) { return V3(c0.x + Math.cos(s.a) * s.R, 0.9 + s.r * 0.38, c0.z - Math.sin(s.a) * s.R * 0.85); }
const NEWSEN = ['Minnesota', 'Maine', 'Michigan', 'Illinois', 'Kansas'];
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint(); mapUni.uDim.value = 0; mapUni.uV5.value = 1;
  paintState('District of Columbia', GOLD, 0.95, 1.2);
  CAP.visible = t < T.rubric || (t > T.vote && t < T.senate) || t > T.ask; { const k = easeOut(span(t, 0.0, 0.5)); CAP.position.copy(P3('dc', 0.8)); CAP.scale.setScalar(2.1 * k + 0.01); CAP.rotation.y = 0.25 + 0.05 * t; }
  // the House: on the hook (11 grey gaps blinking), then the vote and the what-if
  { const on = t < T.rubric + 0.2 || (t >= T.vote - 0.3 && t < T.jordan + 0.2); P.hMesh.visible = on; if (on) { const c0 = P3('house'), out = t < T.rubric + 0.2 ? 1 - smooth(T.rubric - 0.2, T.rubric + 0.2, t) : 1 - smooth(T.jordan - 0.2, T.jordan + 0.2, t);
      const a0 = t < T.rubric + 0.2 ? 0.05 : T.vote - 0.2;
      P.house.forEach((s, i) => { const keep = i < 204, skip = i >= SKIP0 + 211 && i < SKIP1 + 211 + 0 ? false : false; let c;
        const absent = i >= 415 && i < 426, vacant = i >= 426; const a = a0 + (i / 435) * 0.8;
        if (absent) { const blink = 0.5 + 0.5 * Math.sin(t * 9); c = t >= T.ifall + 0.6 && t < T.trump ? BLUE : blink > 0.5 ? '#9aa3b2' : '#5a616e'; }
        else c = vacant ? '#555b66' : keep ? BLUE : RED;
        const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001; const hop = absent && (t < T.rubric || (t >= T.ifall + 0.6 && t < T.ifall + 1.4)) ? Math.abs(Math.sin(t * 7)) * 1.6 : 0;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); const p = seatPos(s, c0); p.y += hop; m4.compose(p, q4, s4); P.hMesh.setMatrixAt(i, m4); col.set(c); P.hMesh.setColorAt(i, col); });
      P.hMesh.instanceMatrix.needsUpdate = true; P.hMesh.instanceColor.needsUpdate = true; } }
  // Jordan (Ohio) vs Scalise (Louisiana)
  if (t >= T.jordan && t < T.senate + 0.2) { const k = smooth(T.jordan, T.jordan + 0.4, t); paintState('Ohio', RED, 0.9 * k, 2.4 * k); paintState('Louisiana', '#b8bcc8', 0.7 * smooth(T.scalise, T.scalise + 0.4, t), 1.0 * smooth(T.scalise, T.scalise + 0.4, t)); }
  // the Senate: 100 seats, Thune's South Dakota; then the five senators-elect's states
  { const on = t >= T.senate - 0.2 && t < T.five + 0.3; P.sMesh.visible = on; if (on) { const c0 = P3('senate'), out = 1 - smooth(T.five - 0.1, T.five + 0.3, t);
      P.senateS.forEach((s, i) => { const a = T.senate - 0.1 + i / 100 * 0.8; const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001; const dem = i < 54; const rebel = dem && i % 9 === 4 && t >= T.sanders;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); const p = seatPos(s, c0); if (rebel) p.y += Math.abs(Math.sin(t * 6 + i)) * 1.4; m4.compose(p, q4, s4); P.sMesh.setMatrixAt(i, m4); col.set(rebel ? GOLD : dem ? BLUE : RED); P.sMesh.setColorAt(i, col); });
      P.sMesh.instanceMatrix.needsUpdate = true; P.sMesh.instanceColor.needsUpdate = true; } }
  if (t >= T.five - 0.2 && t < T.measles + 0.2) NEWSEN.forEach((n, i) => { const k = smooth(T.five - 0.2 + i * 0.25, T.five + 0.2 + i * 0.25, t); paintState(n, BLUE, 0.92 * k, 2.6 * k); });
  // measles: the whole country pulses red
  if (t >= T.measles - 0.1 && t < T.world) { const k = smooth(T.measles - 0.1, T.measles + 0.5, t) * (0.75 + 0.25 * Math.sin(t * 5)); STATES.forEach(s => { if (s.name !== 'District of Columbia' && s.name !== 'Alaska' && s.name !== 'Hawaii') paintState(s.name, '#ff4a4a', 0.55 * k, 0.6 * k); }); }
  // Abu Dhabi: arcs from Washington, Moscow and Kyiv
  const ak = t < T.world - 0.2 || t > T.vets + 0.5 ? 0 : easeOut(span(t, T.world - 0.2, T.world + 1.6)); P.arcs.forEach((a, i) => arcShow(a, clamp(ak * 1.3 - i * 0.15, 0, 1)));
  if (t >= T.world && t < T.vets + 0.5) { const k = smooth(T.world, T.world + 0.5, t); paintCountry('United Arab Emirates', GOLD, 0.95 * k, 3 * k); paintCountry('Russia', '#ff4a4a', 0.55 * k, 1 * k); paintCountry('Ukraine', '#ffd23a', 0.75 * k, 1.6 * k); }
  if (typeof rims === 'function') rims([...(t >= T.jordan && t < T.senate ? [['state', 'Ohio', 1]] : []), ...(t >= T.world && t < T.vets ? [['country', 'United Arab Emirates', 1], ['country', 'Ukraine', 0.8]] : [])]);
  GLAB.forEach(o => { o.visible = false; }); if (HI_LAB.arl) { const on = t >= T.vets && t < T.ask; HI_LAB.arl.forEach(o => { o.visible = on; }); }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { pelosi: ['Nancy Pelosi', 'DEMOCRAT · CALIFORNIA'], trump: ['Donald Trump', 'PRESIDENT'], jordan: ['Jim Jordan', 'REPUBLICAN · OHIO'], scalise: ['Steve Scalise', 'REPUBLICAN · LOUISIANA'], johnson: ['Mike Johnson', 'HOUSE SPEAKER'],
  thune: ['John Thune', 'SENATE GOP LEADER'], sanders: ['Bernie Sanders', 'INDEPENDENT · VERMONT'], schumer: ['Chuck Schumer', 'SENATE DEM LEADER'], hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'] };
const HASCUT = { pelosi: 1, trump: 1, jordan: 1, scalise: 1, thune: 1, sanders: 1, schumer: 1 };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key];
  const dy = -8 * esin(span(t, t0, t1)); const cut = HASCUT[key] && !o.small; if (cut) { x -= o.big ? 15 : 10; y += o.big ? 10 : -70; }
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}${o.big ? ' big' : ''}${cut ? ' cut' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/${cut ? 'cutouts' : 'photos'}/${key}.${cut ? 'png' : 'jpg'}">${o.flag === false ? '' : '<div class="flag"></div>'}${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
let STK = [];
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const fs = /\bsm\b/.test(cls) ? 20 : 30, w = txt.length * fs * 0.68 + (fs > 20 ? 36 : 24), h = fs * 1.25 + (fs > 20 ? 16 : 10);
  STK.push({ txt, cls, x: clamp(q[0], 70 + w / 2, 1010 - w / 2), y: q[1], w, h, k: pop(t, t0, 0.25) }); return ''; }
function layoutStickers() { const placed = []; STK.sort((a, b) => a.y - b.y);
  for (const s of STK) { let moved = true, n = 0; while (moved && n++ < 12) { moved = false; for (const p of placed) { if (Math.abs(s.x - p.x) < (s.w + p.w) / 2 + 8 && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 6) { s.y = p.y + (s.h + p.h) / 2 + 8; moved = true; } } } placed.push(s); }
  return placed.map(s => `<div class="stk ${s.cls}" style="left:${s.x.toFixed(0)}px;top:${s.y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${s.k.toFixed(3)})">${s.txt}</div>`).join(''); }
function hudAt(t) {
  if (t < T.rubric) return null;
  if (t < T.vote) return ['WEDNESDAY · NOV 11', 'THE LAST 24 HOURS'];
  if (t < T.trump) return ['HEGSETH VOTE', t < T.margin ? `${cnt(t, T.n211 - 0.2, T.n211 + 0.6, 211)} · ${cnt(t, T.n204 - 0.2, T.n204 + 0.5, 204)}` : t < T.ifall ? 'MARGIN: 7' : t < T.ifall + 0.6 ? 'WHAT IF…' : '215 · 211'];
  if (t < T.jordan) return ['THE PRESIDENT', '“EXONERATION”'];
  if (t < T.senate) return ['HOUSE GOP', t < T.n33 ? 'JIM JORDAN' : t < T.johnson ? '+33 VOTES' : 'LEADER IN JANUARY'];
  if (t < T.fight) return ['SENATE GOP', 'THUNE STAYS'];
  if (t < T.measles) return ['DEMOCRATS', t < T.five ? 'NO TO SCHUMER' : 'AT LEAST 5 NEW SENATORS'];
  if (t < T.world) return ['HEALTH', t < T.decision ? 'MEASLES-FREE SINCE 2000' : 'DECISION NEXT WEEK'];
  if (t < T.vets) return ['ABU DHABI', t < T.swap ? 'RUSSIA · UKRAINE TALKS' : 'PRISONER SWAP?'];
  if (t < T.ask) return ['NOV 11', 'VETERANS DAY'];
  return null; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  h += card('pelosi', T.pelosi - 0.1, T.rubric - 0.1, 330, 600, t, { big: true, tag: 'SKIPPED THE VOTE', tagc: 'r', tagT: T.pelosi + 0.25 });
  h += card('trump', T.trump - 0.1, T.jordan - 0.15, 330, 560, t, { big: true, quote: '“EXONERATION”', qT: T.exon });
  h += card('jordan', T.jordan - 0.05, T.senate - 0.15, 90, 560, t, { tag: t >= T.n33 ? '+33 VOTES' : 'NEW LEADER', tagc: 'r', tagT: T.jordan + 0.3 });
  h += card('scalise', T.scalise - 0.05, T.senate - 0.15, 640, 620, t, { small: true, dim: true });
  h += card('johnson', T.johnson - 0.05, T.senate - 0.15, 640, 980, t, { small: true, dim: true });
  h += card('thune', T.thune - 0.1, T.fight - 0.05, 330, 560, t, { big: true, tag: 'STAYS', tagc: 'r', tagT: T.thune + 0.3 });
  h += card('sanders', T.sanders - 0.1, T.measles - 0.15, 80, 560, t, { tag: 'NO TO SCHUMER', tagc: 'b', tagT: T.schumer });
  h += card('schumer', T.schumer - 0.1, T.measles - 0.15, 640, 640, t, { small: true, dim: t >= T.five });
  h += card('trump', T.vets - 0.05, T.ask - 0.1, 620, 600, t, { small: true });
  h += card('pelosi', T.ask - 0.05, ENDC, 330, 600, t, { big: true });
  if (P) {
    if (t >= T.n211 && t < T.trump) { sticker(t < T.ifall + 0.6 ? 'SHELVE IT · 211' : 'SHELVE IT · 211', off('house', 12, -2).setY(10), t, T.n211 + 0.2, 'r'); sticker(t < T.ifall + 0.6 ? 'KEEP IT · 204' : 'KEEP IT · 215', off('house', -12, -2).setY(10), t, T.n204 + 0.2, 'b'); }
    if ((t >= T.pelosi && t < T.rubric) || (t >= T.ifall && t < T.trump)) sticker('11 SKIPPED', seatPos(P.house[420], P3('house')).setY(7), t, t < T.rubric ? T.pelosi : T.ifall, 'w');
    if (t >= T.five && t < T.measles) NEWSEN.forEach((n, i) => sticker(n.toUpperCase(), stPos(n, 6), t, T.five + i * 0.25, 'b sm'));
    if (t >= T.abu && t < T.vets) sticker('ABU DHABI', P3('abu', 6), t, T.abu, 'w');
    if (t >= T.world + 0.8 && t < T.vets) { sticker('MOSCOW', P3('moscow', 6), t, T.world + 0.9, 'r sm'); sticker('KYIV', P3('kyiv', 6), t, T.world + 1.1, 'w sm'); sticker('WASHINGTON', P3('dc', 6), t, T.world + 0.8, 'b sm'); }
  }
  h += layoutStickers();
  if (t < 1.8) h += `<div class="hook" style="opacity:${(1 - smooth(1.5, 1.8, t)).toFixed(2)};transform:scale(${pop(t, 0, 0.3).toFixed(3)})"><span class="date">NOV 11 · THE HOUSE</span>11 Democrats <span class="hl">skipped</span></div>`;
  if (t >= T.vote && t < T.margin) h += `<div class="stamp" style="font-size:120px;top:1110px;transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.vote, T.vote + 0.18)))).toFixed(3)})">SHELVED</div>`;
  if (t >= T.alive && t < T.trump) h += `<div class="stamp" style="font-size:110px;top:1110px;color:#3d7dff;border-color:#3d7dff;transform:translate(-50%,-50%) rotate(-6deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.alive, T.alive + 0.18)))).toFixed(3)})">STILL ALIVE</div>`;
  if (t >= T.measles - 0.1 && t < T.world) { const k = pop(t, T.measles - 0.1, 0.35), x = t >= T.decision; h += `<div class="bigcal" style="transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-3deg)"><div class="bm">MEASLES-FREE</div><div class="bd" style="font-size:150px">${x ? '?' : '2000'}</div><div class="by">${x ? 'DECISION · NEXT WEEK' : 'U.S. STATUS SINCE'}</div></div>`; }
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Should Pelosi have<br><span class="hl">shown up?</span> 👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 16 ? 80 : 100) + 'px'; $('sub').textContent = ''; $('sub').style.display = 'none'; }
  let pp = 1; for (const k of EV) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [0.08, T.vote, T.alive, T.measles]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.6; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.0; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
const HI_LAB = {};
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(['900', '800', '700', '600'].map(w => document.fonts.load(`${w} 160px Inter`)));
  try { await addHiPatch('dc'); const n0 = GLAB.length; groundLabel('Washington', -77.03, 38.93, 1.6, { font: '800' }); groundLabel('Potomac River', -77.12, 38.84, 0.9, { font: '600', italic: true, color: '#e8f4ff', rot: 0.6 });
    cityDot('Arlington National Cemetery', -77.07, 38.876, 1.1); HI_LAB.arl = GLAB.slice(n0); } catch (e) { console.log('no hi patch', e); }
  await Promise.all(Object.keys(photo).flatMap(k => [`photos/${k}.jpg`, `cutouts/${k}.png`]).map(f => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/${f}`; }))); window.renderAt(0); return true; })();
