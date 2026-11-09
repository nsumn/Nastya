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
const SENT = [0.0, 4.262, 10.869, 12.147, 15.793, 19.032, 21.703, 28.193, 29.389, 32.349, 34.532, 36.217, 42.661, 44.891, 49.64, 50.732, 52.717, 56.166];
const WORDS = [[0.0, 0.302, "Why"], [0.383, 0.488, "is"], [0.546, 0.998, "Alaska"], [1.103, 1.382, "still"], [1.451, 1.846, "counting"], [1.904, 2.264, "votes,"], [2.31, 2.682, "almost"], [2.728, 2.763, "a"], [2.868, 3.146, "week"], [3.204, 3.437, "after"], [3.483, 3.553, "the"], [3.611, 4.122, "election?"], [4.262, 4.482, "Its"], [4.54, 4.889, "Senate"], [4.935, 5.202, "race"], [5.249, 5.353, "is"], [5.411, 5.957, "separated"], [6.015, 6.143, "by"], [6.201, 6.398, "just"], [6.456, 6.711, "637"], [6.77, 8.302, "votes,"], [8.418, 8.569, "and"], [8.616, 8.685, "the"], [8.743, 9.01, "count"], [9.068, 9.417, "hasn't"], [9.475, 9.73, "moved"], [9.788, 10.032, "since"], [10.078, 10.729, "Wednesday."], [10.869, 11.322, "First,"], [11.426, 12.007, "distance."], [12.147, 12.693, "Alaska"], [12.751, 12.844, "is"], [12.902, 13.111, "bigger"], [13.146, 13.262, "than"], [13.32, 13.808, "Texas,"], [13.843, 14.481, "California"], [14.539, 14.679, "and"], [14.737, 15.201, "Montana"], [15.259, 15.747, "combined."], [15.793, 16.153, "Tens"], [16.199, 16.258, "of"], [16.316, 16.745, "thousands"], [16.78, 16.826, "of"], [16.884, 17.372, "Alaskans"], [17.442, 17.686, "live"], [17.72, 17.929, "where"], [17.987, 18.173, "no"], [18.278, 18.51, "road"], [18.568, 18.928, "goes."], [19.032, 19.253, "Their"], [19.311, 19.717, "ballots"], [19.775, 20.124, "travel"], [20.182, 20.309, "by"], [20.391, 20.809, "plane"], [20.867, 21.087, "or"], [21.192, 21.563, "boat."], [21.703, 21.819, "So"], [21.877, 22.295, "Alaska"], [22.353, 22.817, "accepts"], [22.887, 23.189, "mailed"], [23.235, 23.618, "ballots"], [23.723, 23.885, "up"], [23.943, 24.013, "to"], [24.117, 24.373, "ten"], [24.442, 24.71, "days"], [24.756, 24.977, "after"], [25.035, 25.383, "Election"], [25.441, 25.696, "Day,"], [25.836, 25.987, "and"], [26.056, 26.649, "overseas"], [26.707, 27.078, "ballots"], [27.148, 27.31, "up"], [27.368, 27.438, "to"], [27.519, 28.053, "fifteen."], [28.193, 28.645, "Second,"], [28.715, 28.831, "the"], [28.901, 29.249, "law."], [29.389, 29.957, "Absentee"], [30.004, 30.352, "ballots"], [30.41, 30.712, "can't"], [30.77, 30.863, "be"], [30.909, 31.293, "scanned"], [31.339, 31.618, "before"], [31.676, 32.059, "election"], [32.105, 32.326, "night."], [32.349, 32.395, "A"], [32.5, 32.709, "bill"], [32.767, 32.825, "to"], [32.93, 33.185, "fix"], [33.243, 33.371, "that"], [33.406, 33.498, "was"], [33.556, 33.882, "vetoed"], [33.916, 34.079, "this"], [34.137, 34.392, "year."], [34.532, 35.043, "Third,"], [35.183, 35.497, "ranked"], [35.601, 36.077, "choice."], [36.217, 36.368, "If"], [36.472, 36.832, "nobody"], [36.879, 37.053, "gets"], [37.099, 37.355, "fifty"], [37.413, 37.749, "percent,"], [37.772, 37.865, "the"], [37.935, 38.504, "last-place"], [38.55, 39.096, "candidate"], [39.154, 39.305, "is"], [39.363, 40.071, "eliminated,"], [40.176, 40.315, "and"], [40.362, 40.501, "their"], [40.559, 40.815, "votes"], [40.873, 41.082, "move"], [41.116, 41.174, "to"], [41.279, 41.523, "each"], [41.581, 41.929, "voter's"], [42.069, 42.301, "next"], [42.347, 42.638, "choice."], [42.661, 42.812, "That"], [42.87, 43.137, "count"], [43.195, 43.566, "happens"], [43.601, 43.822, "around"], [43.88, 44.228, "November"], [44.286, 44.751, "eighteenth."], [44.891, 45.019, "In"], [45.065, 45.588, "2008"], [45.646, 45.925, "and"], [45.948, 46.575, "2010,"], [46.61, 47.132, "Alaska's"], [47.155, 47.434, "Senate"], [47.469, 47.852, "races"], [47.992, 48.189, "took"], [48.224, 48.433, "about"], [48.491, 48.711, "two"], [48.793, 49.036, "weeks"], [49.083, 49.141, "to"], [49.199, 49.536, "call."], [49.64, 49.768, "And"], [49.814, 50.035, "here's"], [50.07, 50.139, "the"], [50.174, 50.592, "twist."], [50.732, 50.929, "There"], [50.964, 51.08, "are"], [51.127, 51.312, "two"], [51.382, 51.591, "Dan"], [51.649, 52.067, "Sullivans"], [52.125, 52.195, "on"], [52.23, 52.299, "the"], [52.334, 52.659, "ballot."], [52.717, 53.251, "Peltola"], [53.298, 53.553, "leads"], [53.623, 53.843, "right"], [53.901, 54.296, "now,"], [54.436, 54.587, "but"], [54.645, 54.923, "second"], [54.97, 55.365, "choices"], [55.423, 55.585, "could"], [55.62, 55.852, "flip"], [55.899, 56.026, "it."], [56.166, 56.352, "Who"], [56.398, 56.445, "do"], [56.503, 56.584, "you"], [56.642, 56.816, "think"], [56.874, 57.164, "wins"], [57.269, 58.175, "Alaska?"]];
const VO_END = 58.2;
// =================== MAP v2 (Nov 9 2026, her notes: blocky borders, soft "soapy" close-ups, overlapping stickers) ===================
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
const mapUni = { uSun: { value: V3(-0.55, 0.62, -0.55).normalize() }, uFade: { value: new THREE.Vector2(400, 900) }, uT: { value: 0 }, uCty: { value: 0 } };
function mapMaterial(B, dem, idTex, us) {
  const dx = (B.lon1 - B.lon0) * CLAT * SC / dem.image.width, dz = (B.lat1 - B.lat0) * SC / dem.image.height;
  return new THREE.ShaderMaterial({ uniforms: { tDem: { value: dem }, tId: { value: idTex }, tPal: { value: palTex }, uSun: mapUni.uSun, uFade: mapUni.uFade, uT: mapUni.uT, uCty: mapUni.uCty,
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
    fragmentShader: `uniform sampler2D tId, tPal, tDem; uniform vec3 uSun; uniform vec2 uFade, uP, uE, uD; uniform float uT, uCty; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vHt, vDp;
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
        bool sea = cid < 0.5 && vHt < 0.03 && vDp > 0.0;
        vec3 col;
        if (sea) { float dp = vDp; col = mix(vec3(0.10, 0.30, 0.38), vec3(0.04, 0.12, 0.22), smoothstep(0.02, 0.3, dp)); col = mix(col, vec3(0.02, 0.06, 0.13), smoothstep(0.3, 0.8, dp)); col *= 0.55 + 0.6 * dif; }
        else col = land * sh;
        if (cid > 0.5 || sid > 0.5) { vec4 c = sid > 0.5 ? texture2D(tPal, vec2(sid / 256.0 + 0.5 / 256.0, 1.5 / 4.0)) : texture2D(tPal, vec2(cid / 256.0 + 0.5 / 256.0, 0.5 / 4.0));
          col = mix(col, c.rgb * (0.5 + 0.8 * dif), c.a); col += c.rgb * c.a * 0.1; }
        if (kid > 0.5) { vec4 c = texture2D(tPal, vec2(kid / 256.0 + 0.5 / 256.0, 3.5 / 4.0)); col = mix(col, c.rgb * (0.5 + 0.8 * dif), c.a); col += c.rgb * c.a * 0.1; }
        // borders: compare ids with the neighbours (states thin, countries brighter, coasts soft)
        vec3 a = ids(vec2(uP.x, 0.0)), b = ids(vec2(-uP.x, 0.0)), c2 = ids(vec2(0.0, uP.y)), d = ids(vec2(0.0, -uP.y)); bool kb = a.z != kid || b.z != kid || c2.z != kid || d.z != kid;
        bool cb = a.x != cid || b.x != cid || c2.x != cid || d.x != cid; bool sb = a.y != sid || b.y != sid || c2.y != sid || d.y != sid;
        bool coast = cb && (cid < 0.5 || a.x < 0.5 || b.x < 0.5 || c2.x < 0.5 || d.x < 0.5);
        if (coast) col = mix(col, vec3(0.75, 0.85, 0.9), 0.18);
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
let worldMesh = null, usMesh = null, akMesh = null, WORLD_CV = null, HGT = () => 0; const BORDERS = {};
function countryAt(lon, lat) { const x = Math.floor((lon - WB.lon0) / (WB.lon1 - WB.lon0) * WB.cw), y = Math.floor((WB.lat1 - lat) / (WB.lat1 - WB.lat0) * WB.ch); const d = WORLD_CV.getContext("2d").getImageData(x, y, 1, 1).data; const c = COUNTRIES.find(q => q.id === d[0]); return c ? c.name : ""; }
const mapReady = (async () => {
  const [us, wd] = await Promise.all([fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()), fetch('node_modules/world-atlas/countries-50m.json').then(r => r.json())]);
  const cf = topojson.feature(wd, wd.objects.countries).features; cf.forEach((f, i) => { f.cid = i + 1; if (f.geometry) { const c = d3c(f.geometry); COUNTRIES.push({ id: f.cid, name: f.properties.name, lon: c[0], lat: c[1] }); } });
  const usa = cf.find(f => f.properties.name === 'United States of America');
  const sf = topojson.feature(us, us.objects.states).features; sf.forEach((f, i) => { f.sid = i + 1; const c = d3c(f.geometry); STATES.push({ id: f.sid, name: f.properties.name, lon: c[0], lat: c[1] }); });
  const L = new THREE.TextureLoader(); const [wdem, udem, adem] = await Promise.all([L.loadAsync('data/world_dem.png'), L.loadAsync('data/us_dem2.png'), L.loadAsync('data/ak_dem.png')]);
  for (const d of [wdem, udem, adem]) { d.colorSpace = THREE.NoColorSpace; d.minFilter = THREE.LinearFilter; d.generateMipmaps = false; }
  worldMesh = planeFor(WB, mapMaterial(WB, wdem, idCanvas(WB, cf, sf, usa.cid), false), 1500, 580);
  WORLD_CV = worldMesh.material.uniforms.tId.value.image;
  let kf = [];
  if (typeof COUNTY_FIPS === 'string') { const cj = await fetch('node_modules/us-atlas/counties-10m.json').then(r => r.json()); const st = sf.find(f => f.id === COUNTY_FIPS);
    kf = topojson.feature(cj, cj.objects.counties).features.filter(f => String(f.id).startsWith(COUNTY_FIPS)); kf.forEach((f, i) => { f.kid = i + 1; f.sid = st.sid; const c = d3c(f.geometry); COUNTIES.push({ id: f.kid, name: f.properties.name, fips: f.id, lon: c[0], lat: c[1] }); }); }
  usMesh = planeFor(UB, mapMaterial(UB, udem, idCanvas(UB, [], sf, usa.cid, kf), true), 1100, 600); usMesh.position.y = 0.02;
  akMesh = planeFor(AKB, mapMaterial(AKB, adem, idCanvas(AKB, [], sf.filter(f => f.properties.name === 'Alaska'), usa.cid), true), 700, 340); akMesh.position.y = 0.02;
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
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// =================== "Why is Alaska still counting votes?" (Nov 9 2026) — map v2, glass cards, stickers that never overlap ===================
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { q: 0, n637: wordT('637', S[1]), dist: S[2], big: S[3], road: S[4], plane: S[5], mail: S[6], ten: wordT('ten', S[6]), fifteen: wordT('fifteen', S[6]), law: S[7], scan: S[8], veto: wordT('vetoed', S[9]),
  rcv: S[10], fifty: wordT('fifty', S[11]), elim: wordT('eliminated', S[11]), move: wordT('move', S[11]), nov18: S[12], hist: S[13], twist: S[14], two: wordT('two', S[15]), flip: S[16], ask: S[17] };
const CUES = [[0.02, 'whoosh', 0.5], [T.n637, 'thud', 0.7], [T.dist - 0.3, 'whoosh', 0.55], [T.big + 0.3, 'pop', 0.4], [wordT('California', S[3]), 'pop', 0.4], [wordT('Montana', S[3]), 'pop', 0.4], [T.road - 0.2, 'whoosh', 0.45],
  [T.plane, 'whoosh', 0.35], [T.mail, 'pop', 0.5], [T.ten, 'flip', 0.5], [T.fifteen, 'flip', 0.5], [T.law - 0.3, 'whoosh', 0.55], [T.scan + 0.5, 'thud', 0.4], [T.veto, 'stamp', 0.8], [T.rcv - 0.3, 'whoosh', 0.55],
  [T.fifty, 'rise', 0.5], [T.elim, 'flip', 0.6], [T.move, 'whoosh', 0.35], [T.nov18, 'thud', 0.5], [T.twist, 'whoosh', 0.5], [T.two, 'stamp', 0.6], [T.flip, 'rise', 0.5], [T.ask, 'pop', 0.5], [ENDC, 'thud', 0.5]];
const PL = { ak: [-152, 63.5], anc: [-149.9, 61.22], jun: [-134.42, 58.3], bethel: [-161.76, 60.79], nome: [-165.41, 64.5], kotz: [-162.6, 66.9], utq: [-156.79, 71.29], dill: [-158.46, 59.04], yukon: [-145.25, 66.56], kodiak: [-152.4, 57.79], galena: [-156.93, 64.74] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.dist - 0.4, shot([-152, 62.6], 255, 0, 0.42), shot([-152, 62.8], 225, 0.06, 0.45)],
    [T.dist + 0.2, T.road - 0.3, shot([-152, 63.2], 300, -0.05, 0.36), shot([-152, 63.2], 285, 0.05, 0.38)],
    [T.road + 0.6, T.mail - 0.3, shot([-157, 61.6], 115, -0.35, 0.72), shot([-154, 61.3], 98, 0.2, 0.78)],
    [T.mail + 0.5, T.law - 0.3, shot([-151, 63.3], 230, 0, 0.4), shot([-151, 63.3], 210, 0.08, 0.43)],
    [T.law + 0.7, T.rcv - 0.3, shot(off('jun', 0, 1), 105, 0.25, 0.6), shot(off('jun', 0, 1), 88, 0.55, 0.66)],
    [T.rcv + 0.8, T.twist - 0.3, shot([-151, 62.6], 240, 0.1, 0.4), shot([-150, 62.4], 205, -0.12, 0.44)],
    [T.twist + 0.4, T.ask - 0.2, shot(off('anc', 0, 4), 115, -0.2, 0.6), shot(off('anc', 0, 4), 95, 0.25, 0.66)],
    [T.ask + 0.3, T_END, shot([-152, 63], 290, 0, 0.4), shot([-152, 63], 320, 0.05, 0.38)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) return lerpShot(A, B, esin(span(t, a, b)));
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = HOLDS[i][3], N = nx[2], u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.55); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
// ---- props ----
let PROPS = null;
async function stateRing(name) { const us = await fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()); const f = topojson.feature(us, us.objects.states).features.find(q => q.properties.name === name);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = 0; for (const p of polys) if (p[0].length > ba) { ba = p[0].length; best = p[0]; } return best.filter((_, i) => i % 2 === 0); }
const RINGS = {};
// a state outline moved onto Alaska, drawn with ALASKA's east–west stretch (true km widths × CLAT / cos 64°), so the size comparison stays honest on this map
function ghost(name, col, at) { const ring = RINGS[name], c = ST(name); const k = CLAT / Math.cos(64 * Math.PI / 180);
  const sh = new THREE.Shape(ring.map(([lon, lat]) => new THREE.Vector2((lon - c.lon) * Math.cos(lat * Math.PI / 180) * k * SC, (lat - c.lat) * SC)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }).rotateX(-Math.PI / 2), [new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, transparent: true, opacity: 0.9, emissive: col, emissiveIntensity: 0.2 }), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })]);
  m.position.copy(llPos(at[0], at[1])); m.visible = false; MAPSC.add(m); return m; }
function plane3() { const g = new THREE.Group(), w = new THREE.MeshStandardMaterial({ color: '#f4f4f6', roughness: 0.5, flatShading: true }), r = new THREE.MeshStandardMaterial({ color: '#d83a3a', roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 3.2, 10).rotateZ(Math.PI / 2), w); g.add(body); const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 10).rotateZ(-Math.PI / 2), r); nose.position.x = 1.9; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 4.2), w); wing.position.set(0.3, 0.25, 0); g.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 1.5), w); tail.position.set(-1.45, 0.1, 0); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.05), r); fin.position.set(-1.45, 0.45, 0); g.add(fin); for (const z of [-0.9, 0.9]) { const fl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.18), r); fl.position.set(0.2, -0.55, z); g.add(fl); }   // floats: a bush plane
  const ballot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); ballot.position.set(0, 0.45, 0); ballot.rotation.y = 0.4; g.add(ballot); g.visible = false; MAPSC.add(g); return g; }
function boat3() { const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: '#2c5d8a', roughness: 0.5 })); hull.position.y = 0.25; g.add(hull);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), new THREE.MeshStandardMaterial({ color: '#f2f2f2' })); cab.position.set(-0.3, 0.75, 0); g.add(cab); g.visible = false; MAPSC.add(g); return g; }
function buildProps() { const P = {};
  P.ghosts = [ghost('Texas', '#ff8a3a', [-149.5, 63.4]), ghost('California', '#ffd23a', [-158.5, 61.6]), ghost('Montana', '#8fd36a', [-145.8, 66.2])];
  P.villages = ['bethel', 'nome', 'kotz', 'utq', 'dill', 'yukon', 'galena'];
  P.vPins = P.villages.map(() => makePin(GOLD)); P.ancPin = makePin('#ffffff');
  P.planes = P.villages.map(k => { const a = P3(k, 0.5), b = P3('anc', 0.5); const cur = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(14), b); return { cur, m: plane3() }; });
  P.boat = boat3(); P.boatCur = new THREE.CatmullRomCurve3([P3('kodiak', 0.4), llPos(-152.0, 58.6, 0.4), llPos(-151.6, 59.4, 0.4), llPos(-151.4, 60.3, 0.4), llPos(-150.6, 61.0, 0.4)]);
  // the scanner, locked until election night
  P.scan = new THREE.Group(); { const g = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o }); const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 3.6), g('#d9dce2')); body.position.y = 1.6; P.scan.add(body);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.5), g('#20242b')); slot.position.set(0, 3.25, 0.6); P.scan.add(slot); const scr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.1), new THREE.MeshBasicMaterial({ color: '#ff4a4a' })); scr.position.set(1.7, 2.2, 1.82); P.scan.add(scr); P.scr = scr;
    P.lock = new THREE.Group(); const lb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 0.6), g('#c9a33a', { metalness: 0.8, roughness: 0.3 })); P.lock.add(lb); const sh = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 10, 24, Math.PI), g('#bfc5cc', { metalness: 0.9, roughness: 0.25 })); sh.position.y = 0.75; P.lock.add(sh); P.lock.position.set(-1.2, 2.0, 2.2); P.scan.add(P.lock); }
  P.scan.visible = false; MAPSC.add(P.scan);
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
function pulsePin(p, pos, t, t0, sc) { p.visible = true; p.position.copy(pos); p.scale.setScalar(pop(t, t0, 0.35) * sc); p.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); p.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  const grey = t < T.dist || (t >= T.rcv && t < T.ask + 0.3); const pl = 0.42 + 0.22 * Math.sin(t * 6);
  paintState('Alaska', grey ? GREY : '#9fb7c9', grey ? pl : 0.22, grey ? 0.9 : 0.4);
  // size comparison: Texas, California, Montana dropped onto Alaska
  P.ghosts.forEach((g, i) => { const a = [wordT('Texas', S[3]), wordT('California', S[3]), wordT('Montana', S[3])][i]; const on = t >= a - 0.05 && t < T.road + 0.3; g.visible = on; if (on) { const k = easeOut(span(t, a, a + 0.45)), o = 1 - smooth(T.road - 0.1, T.road + 0.3, t); g.position.y = 2.5 + 14 * (1 - k); g.scale.set(1, Math.max(0.01, o), 1); } });
  // villages off the road system, bush planes and a boat bringing ballots to Anchorage
  P.vPins.forEach((p, i) => { const a = T.road + 0.3 + i * 0.18; if (t >= a && t < T.mail + 0.2) pulsePin(p, P3(P.villages[i]), t, a, mCam.position.y / 45); else p.visible = false; });
  if (t >= T.road + 0.3 && t < T.mail + 0.2) pulsePin(P.ancPin, P3('anc'), t, T.road + 0.3, mCam.position.y / 40); else P.ancPin.visible = false;
  P.planes.forEach((q, i) => { const a = T.plane - 0.6 + i * 0.22, u = span(t, a, a + 2.6); const on = t >= a && u < 1 && t < T.mail + 0.2; q.m.visible = on; if (on) { const e = ease(u); q.cur.getPoint(e, v1); q.cur.getPoint(Math.min(1, e + 0.01), v2);
      q.m.position.copy(v1); q.m.lookAt(v2); q.m.rotateY(-Math.PI / 2); q.m.scale.setScalar(mCam.position.y / 40); } });
  { const u = span(t, T.plane - 0.2, T.mail + 0.2), on = t >= T.plane - 0.2 && t < T.mail + 0.2; P.boat.visible = on; if (on) { P.boatCur.getPoint(u, v1); P.boatCur.getPoint(Math.min(1, u + 0.01), v2); P.boat.position.copy(v1); P.boat.lookAt(v2); P.boat.rotateY(-Math.PI / 2); P.boat.scale.setScalar(mCam.position.y / 45); } }
  // Juneau: the locked scanner
  { const on = t >= T.law && t < T.rcv + 0.3; P.scan.visible = on; if (on) { const k = easeOut(span(t, T.law + 0.4, T.law + 1.1)); P.scan.position.copy(off('jun', 0, 0)).setY(4.5 + 8 * (1 - k)); P.scan.scale.setScalar(1.7 * k + 0.01); P.scan.rotation.y = -0.35;
      P.lock.rotation.z = 0.15 * Math.sin(t * 8) * (t > T.scan + 0.5 && t < T.scan + 1.2 ? 1 : 0); P.scr.material.color.set(Math.sin(t * 5) > 0 ? '#ff4a4a' : '#7a1f1f'); } }
  if (t >= T.law && t < T.rcv + 0.3) paintState('Alaska', '#9fb7c9', 0.18, 0.4);
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { peltola: ['Mary Peltola', 'DEMOCRAT · LEADS BY 637'], sullivan: ['Dan Sullivan', 'REPUBLICAN · U.S. SENATOR'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const fx = o.fx ?? 0;
  const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function stickerRaw(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
function barLabel(b, txt, t, t0, cls = '') { if (!b.visible) return ''; const top = b.position.clone().setY(b.scale.y + 1.5); return sticker(txt, top, t, t0, cls); }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
// stickers are collected, then pushed apart so they never overlap (her note) — greedy, top to bottom
let STK = [];
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const fs = /\bsm\b/.test(cls) ? 20 : 30, w = txt.length * fs * 0.68 + (fs > 20 ? 36 : 24), h = fs * 1.25 + (fs > 20 ? 16 : 10);
  STK.push({ txt, cls, x: clamp(q[0], 70 + w / 2, 1010 - w / 2), y: q[1], w, h, k: pop(t, t0, 0.25) }); return ''; }
function layoutStickers() { const placed = []; STK.sort((a, b) => a.y - b.y);
  for (const s of STK) { let moved = true, n = 0; while (moved && n++ < 12) { moved = false; for (const p of placed) { if (Math.abs(s.x - p.x) < (s.w + p.w) / 2 + 8 && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 6) { s.y = p.y + (s.h + p.h) / 2 + 8; moved = true; } } } placed.push(s); }
  return placed.map(s => `<div class="stk ${s.cls}" style="left:${s.x.toFixed(0)}px;top:${s.y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${s.k.toFixed(3)})">${s.txt}</div>`).join(''); }
function hudAt(t) {
  if (t < T.dist) return ['ALASKA · U.S. SENATE', t < T.n637 ? 'STILL COUNTING?' : `${cnt(t, T.n637, T.n637 + 0.9, 637)} VOTES`, t < T.n637 ? 'ALMOST A WEEK AFTER ELECTION DAY' : 'APART · COUNT FROZEN SINCE NOV 4'];
  if (t < T.mail) return ['1 · DISTANCE', t < T.road ? 'BIGGER THAN TX + CA + MT' : 'NO ROADS', t < T.road ? '665,000 SQ MI · ALASKA' : 'BALLOTS FLY IN BY PLANE · OR COME BY BOAT'];
  if (t < T.law) return ['MAIL DEADLINES', t < T.ten ? 'BALLOTS STILL COMING' : t < T.fifteen ? '+10 DAYS' : '+15 DAYS', t < T.fifteen ? 'MAILED FROM THE U.S.' : 'MAILED FROM OVERSEAS'];
  if (t < T.rcv) return ['2 · THE LAW', t < T.veto ? 'NO EARLY SCANNING' : 'FIX: VETOED', t < T.veto ? 'ABSENTEE BALLOTS WAIT FOR ELECTION NIGHT' : 'A BIPARTISAN BILL · 2026'];
  if (t < T.twist) return ['3 · RANKED CHOICE', t < T.elim ? '50% + 1 TO WIN' : t < T.nov18 ? 'LAST PLACE OUT' : t < T.hist ? '≈ NOV 18' : '2008 · 2010', t < T.elim ? 'NOBODY HAS IT YET' : t < T.nov18 ? 'VOTES MOVE TO THE NEXT CHOICE' : t < T.hist ? 'THE RANKED-CHOICE COUNT' : '~2 WEEKS TO CALL THE SENATE RACE'];
  if (t < T.ask) return ['THE TWIST', t < T.flip ? '2 DAN SULLIVANS' : 'COULD FLIP', t < T.flip ? 'ON THE SAME BALLOT' : 'PELTOLA LEADS ON FIRST CHOICES'];
  return null; }
function calHTML(t) { if (t < T.mail - 0.2 || t >= T.law) return ''; const a = smooth(T.mail - 0.2, T.mail + 0.2, t) * (1 - smooth(T.law - 0.3, T.law, t)); let h = '';
  for (let d = 3; d <= 18; d++) { const lit = d === 3 ? t >= T.mail : d <= 13 ? t >= T.ten - 0.6 + (d - 4) * 0.06 : t >= T.fifteen - 0.4 + (d - 14) * 0.08; const mark = d === 13 ? 'm10' : d === 18 ? 'm15' : d === 3 ? 'm0' : '';
    h += `<div class="day ${lit ? 'lit' : ''} ${mark}"><b>${d}</b>${d === 3 ? '<i>ELECTION</i>' : d === 13 ? '<i>+10 U.S.</i>' : d === 18 ? '<i>+15 ABROAD</i>' : ''}</div>`; }
  return `<div id="cal" style="opacity:${a.toFixed(2)}"><div class="calh">NOVEMBER 2026</div><div class="days">${h}</div></div>`; }
function rcvHTML(t) { if (t < T.fifty - 0.3 || t >= T.twist) return ''; const a = smooth(T.fifty - 0.3, T.fifty + 0.1, t) * (1 - smooth(T.twist - 0.3, T.twist, t)); const g = easeOut(span(t, T.fifty - 0.2, T.fifty + 0.6)), el = easeOut(span(t, T.elim, T.elim + 0.5)), mv = easeOut(span(t, T.move, T.move + 0.8));
  const W0 = 760, bar = (pct, cls, label, extra = 0) => `<div class="rrow"><div class="rlab">${label}</div><div class="rbar ${cls}" style="width:${(W0 * (pct / 60) * g).toFixed(0)}px"></div>${extra ? `<div class="rbar add" style="width:${(W0 * (extra / 60) * mv).toFixed(0)}px"></div><b class="rq" style="opacity:${mv.toFixed(2)}">?</b>` : ''}<span class="rpct">${pct}%</span></div>`;
  return `<div id="rcv" style="opacity:${a.toFixed(2)}"><div class="rline" style="left:${(170 + W0 * 50 / 60).toFixed(0)}px"><span>50%</span></div>${bar(48.2, 'b', 'PELTOLA (D)', 1.95)}${bar(47.9, 'r', 'SULLIVAN (R)', 1.95)}<div class="rrow" style="opacity:${(1 - el).toFixed(2)}"><div class="rlab">OTHERS</div><div class="rbar g" style="width:${(W0 * (3.9 / 60) * g * (1 - el)).toFixed(0)}px"></div><span class="rpct">~4%</span></div><div class="rnote">FIRST CHOICES · 74% COUNTED · NBC</div></div>`; }
function ballotHTML(t) { if (t < T.twist + 0.2 || t >= T.flip + 0.2) return ''; const k = pop(t, T.twist + 0.2, 0.35), a = 1 - smooth(T.flip - 0.1, T.flip + 0.2, t), hl = t >= T.two;
  return `<div id="ballot" style="opacity:${a.toFixed(2)};transform:translateX(-50%) rotate(-2deg) scale(${k.toFixed(3)})"><div class="bh">U.S. SENATOR · RANK UP TO 4</div><div class="bro">○ MARY PELTOLA</div><div class="bro ${hl ? 'hl' : ''}">○ DAN SULLIVAN <i>THE SENATOR</i></div><div class="bro ${hl ? 'hl' : ''}">○ DANIEL J. SULLIVAN <i>A DIFFERENT CANDIDATE</i></div><div class="bro dim">○ …</div></div>`; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  h += card('peltola', T.n637 - 0.1, T.dist, 110, 640, t, { tag: 'LEADS', tagc: 'b', tagT: T.n637 + 0.3 });
  h += card('sullivan', T.n637 + 0.1, T.dist, 650, 660, t, { small: true });
  h += card('peltola', T.flip - 0.05, T.ask, 110, 640, t, { tag: 'LEADS NOW', tagc: 'b', tagT: T.flip + 0.2 });
  h += card('sullivan', T.flip + 0.1, T.ask, 650, 660, t, { small: true, tag: '2ND CHOICES?', tagc: 'r', tagT: wordT('second', T.flip) });
  if (P) {
    if (t >= wordT('Texas', S[3]) && t < T.road) { sticker('TEXAS', P.ghosts[0].position.clone().setY(4), t, wordT('Texas', S[3]) + 0.3, 'sm w'); sticker('CALIFORNIA', P.ghosts[1].position.clone().setY(4), t, wordT('California', S[3]) + 0.3, 'sm w'); sticker('MONTANA', P.ghosts[2].position.clone().setY(4), t, wordT('Montana', S[3]) + 0.3, 'sm w'); }
    if (t >= T.road + 0.3 && t < T.mail) { const nm = { bethel: 'BETHEL', nome: 'NOME', kotz: 'KOTZEBUE', utq: 'UTQIAĠVIK', dill: 'DILLINGHAM', yukon: 'FORT YUKON', galena: 'GALENA' }; P.villages.forEach((k, i) => sticker(nm[k], P3(k, 4), t, T.road + 0.4 + i * 0.18, 'sm w')); sticker('ANCHORAGE', P3('anc', 5), t, T.road + 0.4, 'b sm'); sticker('NO ROAD', P3('bethel', 9), t, T.road + 1.0, 'r sm'); }
    if (t >= T.law + 1.0 && t < T.rcv) { sticker('JUNEAU · STATE CAPITAL', off('jun', 0, -6).setY(16), t, T.law + 1.0, 'sm w'); if (t >= T.scan + 0.4) sticker('LOCKED UNTIL ELECTION NIGHT', off('jun', 0, 3).setY(3), t, T.scan + 0.4, 'r sm'); }
  }
  h += layoutStickers() + calHTML(t) + rcvHTML(t) + ballotHTML(t);
  if (t >= T.veto && t < T.rcv) h += `<div class="stamp" style="font-size:120px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.veto, T.veto + 0.18)))).toFixed(3)})">VETOED</div>`;
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Who wins<br><span class="hl">Alaska?</span> 👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.n637, T.dist, T.road, T.mail, T.ten, T.fifteen, T.law, T.veto, T.rcv, T.elim, T.nov18, T.hist, T.twist, T.flip]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.n637, T.veto, T.two]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.7; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; for (const n of ['Texas', 'California', 'Montana']) RINGS[n] = await stateRing(n); await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
