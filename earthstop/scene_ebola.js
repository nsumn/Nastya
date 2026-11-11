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
// generated by tools/news_timing.py — do not edit
const SENT = [0.0, 2.786, 4.819, 8.616, 12.68, 18.15, 21.331, 23.526, 26.94, 32.56, 34.522, 36.334, 39.481, 42.048, 45.462, 48.296, 53.243, 58.468, 63.44, 65.449];
const WORDS = [[0.0, 0.476, "Ebola"], [0.534, 0.708, "just"], [0.743, 1.057, "passed"], [1.126, 1.672, "eleven"], [1.73, 2.194, "thousand"], [2.252, 2.728, "cases."], [2.786, 3.1, "Here's"], [3.158, 3.286, "how"], [3.344, 3.669, "close"], [3.704, 3.773, "it"], [3.82, 3.913, "is"], [3.971, 4.052, "to"], [4.156, 4.679, "America."], [4.819, 4.982, "It"], [5.04, 5.458, "started"], [5.539, 5.678, "in"], [5.794, 6.247, "May,"], [6.305, 6.468, "in"], [6.514, 7.095, "Ituri,"], [7.153, 7.315, "in"], [7.42, 7.849, "eastern"], [7.907, 8.476, "Congo."], [8.616, 8.837, "Two"], [8.895, 9.115, "days"], [9.173, 9.498, "later,"], [9.522, 9.638, "the"], [9.707, 9.951, "World"], [10.009, 10.195, "Health"], [10.253, 10.833, "Organization"], [10.892, 11.275, "declared"], [11.309, 11.333, "a"], [11.402, 11.82, "global"], [11.878, 12.54, "emergency."], [12.68, 12.936, "Six"], [13.006, 13.249, "months"], [13.307, 13.493, "on,"], [13.516, 13.586, "it"], [13.632, 13.725, "has"], [13.76, 14.039, "spread"], [14.074, 14.132, "to"], [14.236, 14.457, "eight"], [14.503, 15.084, "provinces,"], [15.13, 15.27, "and"], [15.328, 15.792, "officials"], [15.85, 16.071, "say"], [16.129, 16.361, "there's"], [16.419, 16.616, "no"], [16.698, 16.976, "sign"], [17.023, 17.069, "of"], [17.116, 17.185, "it"], [17.232, 17.592, "slowing"], [17.65, 18.01, "down."], [18.15, 18.487, "Five"], [18.533, 18.928, "thousand"], [18.986, 19.242, "three"], [19.3, 19.613, "hundred"], [19.718, 20.333, "eighty-seven"], [20.391, 20.716, "people"], [20.774, 20.96, "have"], [21.006, 21.308, "died."], [21.331, 21.552, "That's"], [21.61, 21.981, "almost"], [22.04, 22.318, "half"], [22.376, 22.434, "of"], [22.504, 22.875, "everyone"], [22.91, 23.386, "infected."], [23.526, 23.758, "It's"], [23.816, 23.99, "now"], [24.06, 24.141, "the"], [24.199, 24.536, "second"], [24.583, 24.896, "biggest"], [24.954, 25.314, "Ebola"], [25.372, 25.802, "outbreak"], [25.941, 26.231, "ever"], [26.301, 26.8, "recorded."], [26.94, 27.125, "And"], [27.183, 27.334, "this"], [27.392, 27.799, "strain,"], [27.834, 28.089, "called"], [28.159, 29.157, "Bundibugyo,"], [29.297, 29.518, "has"], [29.622, 29.843, "no"], [29.982, 30.702, "vaccine"], [30.841, 31.062, "and"], [31.131, 31.282, "no"], [31.34, 31.828, "approved"], [31.909, 32.42, "treatment."], [32.56, 32.722, "It"], [32.769, 32.908, "has"], [32.966, 33.314, "already"], [33.372, 33.779, "crossed"], [33.848, 34.382, "borders."], [34.522, 34.917, "Kenya"], [34.975, 35.172, "has"], [35.276, 35.613, "nine"], [35.671, 36.194, "cases."], [36.334, 36.404, "A"], [36.474, 36.915, "traveler"], [36.973, 37.286, "carried"], [37.333, 37.403, "it"], [37.437, 37.495, "to"], [37.565, 38.215, "Nigeria,"], [38.262, 38.575, "through"], [38.645, 39.341, "Ethiopia."], [39.481, 39.562, "A"], [39.667, 40.038, "doctor"], [40.096, 40.34, "brought"], [40.375, 40.433, "it"], [40.479, 40.642, "home"], [40.677, 40.735, "to"], [40.793, 41.176, "France,"], [41.211, 41.362, "and"], [41.42, 41.908, "recovered."], [42.048, 42.246, "And"], [42.304, 42.49, "from"], [42.594, 43.024, "Africa,"], [43.07, 43.476, "America"], [43.534, 43.639, "is"], [43.709, 43.86, "one"], [43.906, 44.336, "connecting"], [44.394, 44.672, "flight"], [44.73, 45.322, "away."], [45.462, 45.822, "About"], [45.903, 46.449, "thirteen"], [46.553, 47.238, "hours,"], [47.296, 47.412, "to"], [47.482, 48.156, "Washington."], [48.296, 48.61, "That's"], [48.656, 48.819, "why"], [48.877, 48.958, "the"], [49.039, 49.376, "United"], [49.411, 49.701, "States"], [49.759, 50.072, "banned"], [50.142, 50.525, "foreign"], [50.572, 51.117, "travelers"], [51.152, 51.245, "who"], [51.291, 51.373, "had"], [51.396, 51.535, "been"], [51.57, 51.628, "in"], [51.686, 52.22, "Congo,"], [52.278, 52.545, "back"], [52.603, 52.673, "in"], [52.731, 53.103, "May."], [53.243, 53.383, "And"], [53.441, 53.661, "since"], [53.719, 54.149, "November"], [54.207, 54.59, "third,"], [54.73, 55.089, "every"], [55.148, 55.624, "passenger"], [55.67, 56.018, "flying"], [56.076, 56.192, "in"], [56.262, 56.436, "must"], [56.471, 56.715, "sign"], [56.75, 56.773, "a"], [56.843, 57.086, "form"], [57.144, 57.411, "saying"], [57.481, 57.725, "they"], [57.806, 58.108, "weren't"], [58.155, 58.433, "there."], [58.468, 58.642, "So"], [58.712, 59.072, "far,"], [59.212, 59.409, "there"], [59.444, 59.56, "are"], [59.618, 59.978, "zero"], [60.036, 60.385, "cases"], [60.431, 60.489, "in"], [60.536, 61.046, "America,"], [61.151, 61.302, "and"], [61.36, 61.43, "the"], [61.476, 62.022, "CDC"], [62.162, 62.371, "says"], [62.43, 62.499, "the"], [62.58, 62.813, "risk"], [62.871, 62.964, "is"], [63.045, 63.37, "low."], [63.44, 63.625, "Would"], [63.66, 63.741, "you"], [63.799, 64.148, "close"], [64.183, 64.252, "the"], [64.31, 64.647, "borders"], [64.693, 65.309, "completely?"], [65.449, 65.669, "Tell"], [65.727, 65.797, "me"], [65.855, 65.913, "in"], [65.948, 66.017, "the"], [66.052, 66.795, "comments."]];
const VO_END = 66.842;
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
// =================== "Ebola just passed 11,000 cases — how close is it to America?" — Nov 11 2026, v5 news map (QUALITY_NOV11.md) ===================
// Facts: DRC govt data Nov 10: 11,042 confirmed cases, 5,387 deaths (AFP/Daily Sabah); Bundibugyo strain, no vaccine/treatment; declared Ituri May 15, WHO PHEIC May 17 (ECDC);
// 8 of 26 provinces; 2nd-largest outbreak on record; Kenya 9 cases (ECDC Oct 26); Nigeria 1 case via Addis Ababa from Uganda (Oct 20); France 1 imported (doctor, recovered July);
// US: CDC entry suspension for foreign nationals in DRC since May 18; attestation form on every US-bound international flight since Nov 3; 0 US cases, CDC: risk low.
// 13 h = Addis Ababa → Washington Dulles 7,185 mi great circle at 550 mph (computed in chat).
const V5LOOK = true;
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff3a3a', GOLD = '#ffc23a', TEAL = '#2ad0b0', ORANGE = '#ff8a3a';
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { close: S[1], may: S[2], who: S[3], six: S[4], eight: wordT('eight', S[4]), slow: wordT('slowing', S[4]), deaths: S[5], half: S[6], second: S[7], strain: S[8], vaccine: wordT('vaccine', S[8]),
  borders: S[9], kenya: S[10], nigeria: S[11], ethiopia: wordT('Ethiopia', S[11]), france: S[12], recovered: wordT('recovered', S[12]), flight: S[13], hours: S[14], wash: wordT('Washington', S[14]),
  ban: S[15], form: S[16], zero: S[17], cdc: wordT('CDC', S[17]), ask: S[18] };
const EV = Object.values(T).sort((a, b) => a - b);
const CUES = [[0.02, 'whoosh', 0.5], [0.08, 'stamp', 0.7], ...EV.slice(1).map(t => [t, 'pop', 0.45]),
  [T.may - 0.3, 'whoosh', 0.6], [T.who, 'alarm', 0.55], [T.six - 0.3, 'whoosh', 0.5], [T.eight, 'rise', 0.6], [T.deaths, 'thud', 0.7], [T.second, 'paper', 0.7], [T.vaccine, 'stamp', 0.8],
  [T.borders - 0.3, 'whoosh', 0.6], [T.kenya, 'ding', 0.6], [T.nigeria, 'jet', 0.45], [T.france, 'jet', 0.45], [T.flight - 0.2, 'jet', 0.8], [T.hours, 'tick', 0.4], [T.ban - 0.3, 'whoosh', 0.6], [T.ban, 'gavel', 0.7],
  [T.form, 'type', 0.6], [T.form + 0.6, 'paper', 0.6], [T.zero, 'ding', 0.8], [T.cdc, 'stamp', 0.7], [T.ask, 'thud', 0.6], [ENDC, 'thud', 0.5]];
const PL = { ituri: [30.25, 1.56], nairobi: [36.82, -1.29], kampala: [32.58, 0.35], addis: [38.8, 8.98], lagos: [3.38, 6.52], paris: [2.35, 48.86], dulles: [-77.45, 38.95] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const PROV = [[30.25, 1.56], [29.29, 0.14], [29.22, -1.68], [27.62, 2.77], [28.86, -2.5], [25.19, 0.52], [25.92, -2.95], [24.73, 2.8]];   // 8 outbreak markers spreading out from Ituri (markers only, not province labels)
const AIRPORTS = [['JFK', -73.78, 40.64], ['IAD', -77.45, 38.95], ['ATL', -84.43, 33.64], ['ORD', -87.9, 41.98], ['LAX', -118.41, 33.94], ['IAH', -95.34, 29.98], ['MIA', -80.29, 25.8]];
function shot(where, h, yaw = 0, tilt = 1.05, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.may - 0.35, shot([25, -1], 640, -0.1, 0.9), shot([25, -1], 560, 0.1, 0.95)],
    [T.may + 0.15, T.six - 0.35, shot([29.6, 0.6], 190, 0.2, 1.0), shot([29.6, 0.6], 160, -0.2, 1.05)],
    [T.six + 0.15, T.borders - 0.35, shot([27, -0.5], 470, -0.15, 0.9), shot([27, -0.5], 400, 0.15, 0.95)],
    [T.borders + 0.15, T.flight - 0.35, shot([20, 20], 1150, 0.05, 0.65), shot([20, 20], 1000, -0.05, 0.7)],
    [T.flight + 1.0, T.ban - 0.35, shot([-20, 22], 1900, 0, 0.42), shot([-20, 22], 1700, 0.05, 0.45)],
    [T.ban + 1.0, T.ask - 0.3, shot([-95, 37.5], 880, 0, 0.6), shot([-95, 37.5], 760, -0.08, 0.65)],
    [T.ask + 0.15, T_END, shot([-95, 37.5], 900, 0, 0.6), shot([-95, 37.5], 980, 0.05, 0.55)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) { const sh = lerpShot(A, B, 0.25 * esin(span(t, a, b)) + 0.75 * span(t, a, b));
      const el = t - a; sh.h *= Math.exp(-0.075 * Math.min(el, 3) - 0.015 * Math.max(0, el - 3)); sh.yaw += (0.1 * Math.min(el, 4) + 0.02 * Math.max(0, el - 4)) * (i % 2 ? -1 : 1); sh.tilt *= 1 + 0.03 * Math.min(el, 4);   // v5 camera
      return sh; }
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = shotAt(b), N = shotAt(nx[0]), u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.35); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
// ---- props: outbreak markers, spread arcs, the flight with a plane, airport pins ----
let PROPS = null;
function hotspot(col, r) { const g = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false })); disc.position.y = 0.4; g.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.92, r * 1.12, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false })); ring.position.y = 0.5; g.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' })); core.position.y = r * 0.25; g.add(core); g.userData = { disc, ring }; g.visible = false; MAPSC.add(g); return g; }
function hotAt(g, pos, t, t0, s) { if (t < t0) { g.visible = false; return; } g.visible = true; g.position.copy(pos); const k = easeOut(span(t, t0, t0 + 0.5)); g.scale.setScalar(s * (0.01 + k));
  const ph = ((t - t0) * 0.9) % 1; g.userData.ring.scale.setScalar(1 + ph * 1.6); g.userData.ring.material.opacity = 0.9 * (1 - ph); g.userData.disc.material.opacity = 0.45 + 0.15 * Math.sin(t * 5); }
function plane() { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 7, 10).rotateX(Math.PI / 2), m); g.add(body); const nose = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), m); nose.position.z = 3.5; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 1.6), m); wing.position.z = 0.3; g.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.9), m); tail.position.z = -3.1; g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 1.1), new THREE.MeshStandardMaterial({ color: GOLD, flatShading: true })); fin.position.set(0, 0.8, -3.0); g.add(fin); g.visible = false; MAPSC.add(g); return g; }
function buildProps() { const P = {};
  P.hot = PROV.map((p, i) => hotspot(RED, i === 0 ? 9 : 6));
  P.big = hotspot(RED, 26);
  P.out = { kenya: hotspot(ORANGE, 10), nigeria: hotspot(ORANGE, 10), france: hotspot(ORANGE, 10) };
  P.arcs = { kenya: makeArc(P3('ituri', 0.5), P3('nairobi', 0.5), 50, ORANGE), uganda: makeArc(P3('kampala', 0.5), P3('addis', 0.5), 60, ORANGE), nigeria: makeArc(P3('addis', 0.5), P3('lagos', 0.5), 150, ORANGE),
    france: makeArc(P3('ituri', 0.5), P3('paris', 0.5), 260, ORANGE), usa: makeArc(P3('addis', 0.5), P3('dulles', 0.5), 520, GOLD) };
  P.plane = plane();
  P.air = AIRPORTS.map(() => makePin(TEAL));
  return P; }
const NUP = new THREE.Vector3();
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint(); mapUni.uDim.value = 0; mapUni.uV5.value = 1;
  // Congo: red, pulsing; deeper as the outbreak grows
  if (t < T.ban + 0.5) { const k = 0.55 + 0.25 * smooth(T.six, T.deaths, t) + 0.08 * Math.sin(t * 4); paintCountry('Dem. Rep. Congo', RED, k * (t < T.borders ? 1 : 0.85), 2.2); }
  // markers: Ituri first, then the 8 points spreading out
  P.hot.forEach((g, i) => { const t0 = i === 0 ? T.may + 0.2 : T.six + 0.25 + (T.eight - T.six) * (i / 7); hotAt(g, llPos(PROV[i][0], PROV[i][1], 1), t < T.borders + 0.3 ? t : -1, t0, 1); });
  hotAt(P.big, P3('ituri', 1), t < T.may - 0.2 || (t >= T.borders && t < T.ban + 0.5) ? t : -1, t < T.may ? 0.1 : T.borders, t < T.may ? 1 : 0.6);
  // spread out of Congo
  const kk = smooth(T.kenya, T.kenya + 0.4, t), nk = smooth(T.nigeria, T.nigeria + 0.4, t), fk = smooth(T.france, T.france + 0.4, t), on = t >= T.borders && t < T.ban + 0.5;
  if (on) { paintCountry('Kenya', ORANGE, 0.9 * kk, 2.4 * kk); paintCountry('Nigeria', ORANGE, 0.9 * nk, 2.4 * nk); paintCountry('France', ORANGE, 0.85 * fk, 2.0 * fk); paintCountry('Uganda', '#ffd2a0', 0.45 * nk, 0.8 * nk);
    if (t >= T.ethiopia) paintCountry('Ethiopia', GOLD, 0.6 * smooth(T.ethiopia, T.ethiopia + 0.4, t), 1.2); if (t >= T.flight) paintCountry('Ethiopia', GOLD, 0.8, 1.6); }
  if (t >= T.flight) paintCountry('United States of America', BLUE, 0.35 * smooth(T.flight + 0.5, T.flight + 1.5, t), 0.6);
  arcShow(P.arcs.kenya, on ? easeOut(span(t, T.kenya - 0.1, T.kenya + 0.9)) : 0);
  arcShow(P.arcs.uganda, on ? easeOut(span(t, T.nigeria - 0.1, T.nigeria + 0.6)) : 0); arcShow(P.arcs.nigeria, on ? easeOut(span(t, T.ethiopia - 0.2, T.ethiopia + 0.8)) : 0);
  arcShow(P.arcs.france, on ? easeOut(span(t, T.france - 0.1, T.france + 1.1)) : 0);
  const fu = t >= T.flight - 0.2 && t < T.ban + 0.6 ? ease(span(t, T.flight + 0.2, T.wash + 0.6)) : 0; arcShow(P.arcs.usa, fu);
  hotAt(P.out.kenya, P3('nairobi', 1), on ? t : -1, T.kenya + 0.6, 1); hotAt(P.out.nigeria, P3('lagos', 1), on ? t : -1, T.ethiopia + 0.6, 1); hotAt(P.out.france, P3('paris', 1), on ? t : -1, T.france + 0.9, 1);
  // the plane rides the flight arc
  P.plane.visible = fu > 0.01 && fu < 0.999; if (P.plane.visible) { const c = P.arcs.usa.userData.cur, p = c.getPoint(fu), q = c.getPoint(Math.min(1, fu + 0.01)); P.plane.position.copy(p).add(V3(0, 4, 0)); P.plane.lookAt(q.clone().add(V3(0, 4, 0))); P.plane.scale.setScalar(7); }
  // US: airports, then calm green at "zero cases"
  P.air.forEach((g, i) => { const t0 = T.ban + 0.6 + i * 0.12; g.visible = t >= t0 && t < T.ask; if (g.visible) { g.position.copy(llPos(AIRPORTS[i][1], AIRPORTS[i][2], 0)); g.scale.setScalar(5 * easeOut(span(t, t0, t0 + 0.35)) + 0.01); const ph = (t * 0.8 + i * 0.13) % 1; g.userData.ring.scale.setScalar(1 + ph * 2); g.userData.ring.material.opacity = 1 - ph; } });
  if (t >= T.zero - 0.1) { const k = smooth(T.zero - 0.1, T.zero + 0.6, t); STATES.forEach((s, i) => { if (s.name !== 'Alaska' && s.name !== 'Hawaii') paintState(s.name, TEAL, 0.5 * k, (0.4 + 0.6 * ((i * 37) % 11) / 11) * k * (1 - smooth(T.ask + 0.5, T.ask + 1.5, t) * 0.5)); }); }
  if (typeof rims === 'function') rims([...(t < T.borders ? [['country', 'Dem. Rep. Congo', 1]] : []), ...(t >= T.kenya && t < T.flight ? [['country', 'Kenya', 0.8]] : []), ...(t >= T.nigeria && t < T.flight ? [['country', 'Nigeria', 0.8]] : []), ...(t >= T.france && t < T.flight ? [['country', 'France', 0.8]] : [])]);
  palTex.needsUpdate = true; }
// ---- DOM ----
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
const fmtN = n => n.toLocaleString('en-US');
let STK = [];
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const fs = /\bsm\b/.test(cls) ? 20 : 30, w = txt.length * fs * 0.68 + (fs > 20 ? 36 : 24), h = fs * 1.25 + (fs > 20 ? 16 : 10);
  STK.push({ txt, cls, x: clamp(q[0], 70 + w / 2, 1010 - w / 2), y: q[1], w, h, k: pop(t, t0, 0.25) }); return ''; }
function layoutStickers() { const placed = []; STK.sort((a, b) => a.y - b.y);
  for (const s of STK) { let moved = true, n = 0; while (moved && n++ < 12) { moved = false; for (const p of placed) { if (Math.abs(s.x - p.x) < (s.w + p.w) / 2 + 8 && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 6) { s.y = p.y + (s.h + p.h) / 2 + 8; moved = true; } } } placed.push(s); }
  return placed.map(s => `<div class="stk ${s.cls}" style="left:${s.x.toFixed(0)}px;top:${s.y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${s.k.toFixed(3)})">${s.txt}</div>`).join(''); }
function hudAt(t) {
  if (t < 1.8) return null;
  if (t < T.may) return ['BREAKING · NOV 11', 'EBOLA: 11,042 CASES'];
  if (t < T.who) return ['ITURI · CONGO', 'MAY 15'];
  if (t < T.six) return ['MAY 17 · WHO', 'GLOBAL EMERGENCY'];
  if (t < T.deaths) return ['CONGO', t < T.slow ? `PROVINCES: ${Math.max(1, cnt(t, T.six + 0.25, T.eight + 0.2, 8))}` : 'NO SIGN OF SLOWING'];
  if (t < T.half) return ['CONFIRMED DEATHS', fmtN(cnt(t, T.deaths, T.deaths + 2.2, 5387))];
  if (t < T.second) return ['DEATH RATE', '≈ 1 IN 2'];
  if (t < T.strain) return ['EBOLA OUTBREAKS', '#2 EVER'];
  if (t < T.borders) return ['BUNDIBUGYO STRAIN', t < T.vaccine ? 'NEW STRAIN' : 'NO VACCINE'];
  if (t < T.kenya) return ['OUTSIDE CONGO', 'CROSSED BORDERS'];
  if (t < T.nigeria) return ['KENYA', '9 CASES'];
  if (t < T.france) return ['NIGERIA', t < T.ethiopia ? '1 CASE' : 'VIA ETHIOPIA'];
  if (t < T.flight) return ['FRANCE', t < T.recovered ? '1 CASE' : 'RECOVERED'];
  if (t < T.ban) return ['AFRICA → AMERICA', t < T.hours ? 'ONE FLIGHT AWAY' : '≈ 13 HOURS'];
  if (t < T.form) return ['U.S. · SINCE MAY 18', 'ENTRY BAN'];
  if (t < T.zero) return ['SINCE NOV 3', 'A FORM FOR ALL'];
  if (t < T.ask) return [t < T.cdc ? 'CONFIRMED · U.S.' : 'CDC', t < T.cdc ? 'U.S. CASES: 0' : 'RISK: LOW'];
  return null; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  if (P) {
    if (t >= T.may && t < T.six) sticker('ITURI', P3('ituri', 8), t, T.may + 0.2, 'r');
    if (t >= T.may + 0.4 && t < T.six) sticker('CONGO', llPos(24, -3, 6), t, T.may + 0.4, 'w');
    if (t >= T.borders && t < T.flight) sticker('CONGO', P3('ituri', 8), t, T.borders + 0.1, 'r sm');
    if (t >= T.kenya && t < T.flight) sticker('KENYA · 9', P3('nairobi', 8), t, T.kenya + 0.6, 'r sm');
    if (t >= T.nigeria && t < T.flight) sticker('NIGERIA · 1', P3('lagos', 8), t, T.ethiopia + 0.6, 'r sm');
    if (t >= T.ethiopia && t < T.flight + 3) sticker('ETHIOPIA', P3('addis', 8), t, T.ethiopia, 'w sm');
    if (t >= T.france && t < T.flight) sticker('FRANCE · 1', P3('paris', 8), t, T.france + 0.9, 'r sm');
    if (t >= T.flight + 0.6 && t < T.ban) { sticker('ADDIS ABABA', P3('addis', 8), t, T.flight + 0.6, 'w sm'); sticker('WASHINGTON', P3('dulles', 8), t, T.wash, 'b'); }
    if (t >= T.flight + 1.2 && t < T.ban && PROPS.plane.visible) sticker(`${(13 * ease(span(t, T.flight + 0.2, T.wash + 0.6))).toFixed(0)} H`, PROPS.plane.position.clone().add(V3(0, 18, 0)), t, T.flight + 1.2, 'w');
    if (t >= T.ban + 0.6 && t < T.zero) AIRPORTS.forEach((a, i) => sticker(a[0], llPos(a[1], a[2], 22), t, T.ban + 0.7 + i * 0.12, 't sm'));
  }
  h += layoutStickers();
  if (t < 1.8) h += `<div class="hook" style="opacity:${(1 - smooth(1.5, 1.8, t)).toFixed(2)};transform:scale(${pop(t, 0, 0.3).toFixed(3)})"><span class="date">NOV 11 · CONGO</span>Ebola: <span class="hl">11,042</span> cases</div>`;
  if (t >= T.who && t < T.six - 0.1) h += `<div class="stamp" style="white-space:nowrap;font-size:96px;top:1110px;transform:translate(-50%,-50%) rotate(-7deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.who + 0.4, T.who + 0.58)))).toFixed(3)});opacity:${t < T.who + 0.4 ? 0 : 1}">EMERGENCY</div>`;
  if (t >= T.deaths - 0.1 && t < T.strain - 0.1) { const k = pop(t, T.deaths - 0.1, 0.35), hf = t >= T.half, sc = t >= T.second; h += `<div class="bigcal" style="transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-3deg)"><div class="bm">${sc ? 'OUTBREAK SIZE' : hf ? 'DEATH RATE' : 'DEATHS'}</div><div class="bd" style="font-size:${sc ? 190 : hf ? 150 : 140}px">${sc ? '#2' : hf ? '1 IN 2' : fmtN(cnt(t, T.deaths, T.deaths + 2.2, 5387))}</div><div class="by">${sc ? 'LARGEST EBOLA OUTBREAK EVER' : hf ? 'OF EVERYONE INFECTED' : 'OF 11,042 CONFIRMED CASES'}</div></div>`; }
  if (t >= T.vaccine && t < T.borders - 0.1) h += `<div class="stamp" style="white-space:nowrap;font-size:92px;top:1110px;transform:translate(-50%,-50%) rotate(-7deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.vaccine, T.vaccine + 0.18)))).toFixed(3)})">NO VACCINE</div>`;
  if (t >= T.form && t < T.zero - 0.1) { const k = pop(t, T.form, 0.35); h += `<div class="bigcal" style="transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-3deg)"><div class="bm" style="background:linear-gradient(#3d7dff,#2a5ad8)">EVERY PASSENGER</div><div class="bd" style="font-size:44px;font-family:Inter;font-weight:800;line-height:1.3;padding:22px 26px 6px;text-align:left">☑ I have NOT been in Congo in the last 21 days</div><div class="by">SIGN BEFORE BOARDING · SINCE NOV 3</div></div>`; }
  if (t >= T.zero && t < T.ask - 0.1) h += `<div class="stamp" style="white-space:nowrap;font-size:92px;top:1110px;color:#2ad0b0;border-color:#2ad0b0;background:rgba(0,20,16,.3);transform:translate(-50%,-50%) rotate(-6deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.zero, T.zero + 0.18)))).toFixed(3)})">0 U.S. CASES</div>`;
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Would you close<br><span class="hl">the borders?</span> 👇</div>`;
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
function flashAt(t) { let f = 0; for (const k of [0.08, T.vaccine, T.zero]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.6; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.0; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(['900', '800', '700', '600'].map(w => document.fonts.load(`${w} 160px Inter`))); window.renderAt(0); return true; })();
