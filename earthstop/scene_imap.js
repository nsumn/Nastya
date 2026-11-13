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
const SENT = [0.0, 3.286, 7.083, 13.005, 15.839, 19.763, 23.85, 28.308, 33.36, 38.565, 46.53, 54.415, 59.437, 67.727, 76.923, 82.694, 88.083, 92.798, 93.901, 95.759];
const WORDS = [[0.0, 0.302, "Here's"], [0.337, 0.464, "what"], [0.522, 0.848, "happened"], [0.906, 0.987, "in"], [1.033, 1.486, "America"], [1.544, 1.649, "in"], [1.683, 1.753, "the"], [1.811, 2.078, "last"], [2.125, 2.694, "24"], [2.74, 3.146, "hours."], [3.286, 3.658, "Jensen"], [3.716, 4.052, "Huang"], [4.157, 4.319, "has"], [4.401, 4.888, "resigned"], [4.946, 5.086, "as"], [5.144, 5.237, "the"], [5.295, 6.142, "CEO"], [6.281, 6.386, "of"], [6.456, 6.943, "Nvidia."], [7.083, 7.211, "It"], [7.257, 7.466, "comes"], [7.524, 7.745, "after"], [7.803, 8.163, "reports"], [8.198, 8.256, "of"], [8.314, 8.465, "two"], [8.523, 9.01, "affairs,"], [9.15, 9.579, "including"], [9.661, 9.881, "one"], [9.928, 10.079, "with"], [10.113, 10.137, "a"], [10.206, 10.462, "woman"], [10.497, 11.007, "officials"], [11.147, 11.367, "say"], [11.472, 11.681, "may"], [11.75, 11.901, "have"], [11.936, 12.261, "spied"], [12.296, 12.401, "for"], [12.459, 12.865, "China."], [13.005, 13.493, "Nvidia's"], [13.528, 13.83, "stock"], [13.888, 14.109, "fell"], [14.178, 14.283, "as"], [14.352, 14.55, "much"], [14.585, 14.666, "as"], [14.747, 15.177, "13"], [15.235, 15.699, "percent."], [15.839, 16.129, "Chief"], [16.164, 16.605, "Financial"], [16.663, 16.988, "Officer"], [17.058, 17.383, "Colette"], [17.418, 17.778, "Kress"], [17.847, 17.998, "is"], [18.068, 18.242, "now"], [18.3, 18.393, "the"], [18.474, 18.869, "interim"], [18.927, 19.716, "CEO."], [19.763, 19.891, "In"], [19.949, 20.413, "Brooklyn,"], [20.471, 20.541, "a"], [20.645, 21.272, "three-story"], [21.33, 21.725, "apartment"], [21.748, 22.027, "building"], [22.085, 22.561, "collapsed"], [22.607, 22.7, "on"], [22.758, 23.211, "Flatbush"], [23.269, 23.71, "Avenue."], [23.85, 24.105, "Eight"], [24.151, 24.407, "people"], [24.442, 24.581, "were"], [24.627, 24.999, "killed,"], [25.045, 25.498, "including"], [25.556, 25.73, "two"], [25.788, 26.252, "children,"], [26.392, 26.531, "and"], [26.578, 26.647, "at"], [26.694, 26.914, "least"], [26.961, 27.46, "17"], [27.518, 27.669, "were"], [27.727, 28.192, "injured."], [28.308, 28.424, "The"], [28.482, 28.807, "building"], [28.865, 29.097, "stood"], [29.155, 29.364, "next"], [29.387, 29.434, "to"], [29.515, 29.538, "a"], [29.585, 30.223, "construction"], [30.281, 30.653, "site,"], [30.793, 30.944, "and"], [31.002, 31.072, "the"], [31.13, 31.56, "cause"], [31.618, 31.815, "is"], [31.954, 32.268, "under"], [32.372, 33.22, "investigation."], [33.36, 33.499, "In"], [33.557, 34.359, "Mississippi,"], [34.499, 35.01, "Democrat"], [35.08, 35.428, "Scott"], [35.486, 35.916, "Colom"], [36.056, 36.219, "has"], [36.277, 36.671, "defeated"], [36.73, 37.101, "Senator"], [37.206, 37.554, "Cindy"], [37.658, 38.425, "Hyde-Smith."], [38.565, 38.681, "He"], [38.739, 38.844, "is"], [38.902, 38.971, "the"], [39.041, 39.319, "first"], [39.377, 39.853, "Democrat"], [39.912, 40.318, "elected"], [40.353, 40.411, "to"], [40.469, 40.538, "the"], [40.597, 40.898, "Senate"], [40.933, 41.073, "from"], [41.131, 41.688, "Mississippi"], [41.746, 41.978, "since"], [42.036, 43.081, "1982,"], [43.221, 43.383, "and"], [43.43, 43.511, "the"], [43.569, 43.952, "state's"], [44.057, 44.37, "first"], [44.44, 44.718, "Black"], [44.776, 45.136, "senator"], [45.206, 45.45, "since"], [45.508, 46.39, "Reconstruction."], [46.53, 46.647, "In"], [46.693, 47.111, "Alaska,"], [47.146, 47.599, "Democrat"], [47.657, 47.9, "Mary"], [47.958, 48.493, "Peltola"], [48.551, 48.713, "has"], [48.771, 49.236, "expanded"], [49.294, 49.398, "her"], [49.468, 49.712, "lead"], [49.816, 50.06, "over"], [50.118, 50.501, "Senator"], [50.571, 50.815, "Dan"], [50.919, 51.43, "Sullivan,"], [51.57, 51.745, "with"], [51.779, 51.988, "about"], [52.069, 52.522, "15"], [52.58, 52.905, "percent"], [52.952, 52.998, "of"], [53.056, 53.416, "ballots"], [53.451, 53.683, "still"], [53.741, 54.275, "uncounted."], [54.415, 54.867, "Treasury"], [54.925, 55.39, "Secretary"], [55.436, 55.703, "Scott"], [55.75, 56.063, "Bessent"], [56.11, 56.226, "has"], [56.295, 56.528, "moved"], [56.551, 56.62, "to"], [56.69, 56.713, "a"], [56.771, 57.189, "military"], [57.247, 57.561, "base,"], [57.642, 58.014, "after"], [58.072, 58.385, "threats"], [58.42, 58.559, "from"], [58.606, 59.302, "Iran."], [59.437, 59.6, "At"], [59.658, 60.157, "Arlington"], [60.215, 60.598, "National"], [60.656, 61.225, "Cemetery,"], [61.248, 61.318, "a"], [61.422, 61.701, "guard"], [61.747, 61.84, "at"], [61.875, 61.945, "the"], [62.014, 62.316, "Tomb"], [62.363, 62.432, "of"], [62.49, 62.572, "the"], [62.688, 63.152, "Unknown"], [63.257, 63.721, "Soldier"], [63.861, 64.139, "told"], [64.197, 64.499, "Pete"], [64.545, 65.056, "Hegseth's"], [65.114, 65.405, "group"], [65.463, 65.521, "to"], [65.579, 65.869, "stop"], [65.985, 66.45, "laughing"], [66.519, 66.67, "and"], [66.728, 67.053, "taking"], [67.111, 67.587, "photos."], [67.727, 68.063, "Members"], [68.11, 68.168, "of"], [68.214, 68.284, "the"], [68.33, 68.679, "Kennedy"], [68.737, 69.073, "family"], [69.131, 69.306, "have"], [69.364, 69.677, "joined"], [69.747, 70.316, "lawsuits"], [70.374, 70.792, "against"], [70.85, 71.221, "Trump's"], [71.279, 71.616, "planned"], [71.639, 72.8, "250-foot"], [72.858, 73.253, "arch,"], [73.393, 73.683, "saying"], [73.73, 73.788, "it"], [73.822, 73.973, "would"], [74.02, 74.287, "block"], [74.345, 74.426, "the"], [74.484, 74.705, "view"], [74.763, 74.914, "from"], [74.972, 75.761, "JFK's"], [75.843, 76.284, "eternal"], [76.342, 76.783, "flame."], [76.923, 77.074, "In"], [77.121, 77.19, "the"], [77.248, 77.504, "House,"], [77.539, 77.852, "Thomas"], [77.922, 78.212, "Massie"], [78.258, 78.433, "got"], [78.479, 79.582, "218"], [79.64, 80.139, "signatures"], [80.186, 80.255, "to"], [80.313, 80.546, "force"], [80.58, 80.917, "another"], [80.975, 81.242, "vote"], [81.3, 81.451, "on"], [81.486, 81.556, "the"], [81.637, 82.032, "Epstein"], [82.101, 82.554, "files."], [82.694, 82.833, "And"], [82.891, 83.181, "around"], [83.216, 83.286, "the"], [83.332, 83.634, "world,"], [83.681, 83.982, "Steve"], [84.017, 84.389, "Witkoff"], [84.447, 84.586, "and"], [84.644, 84.946, "Jared"], [85.004, 85.375, "Kushner"], [85.445, 85.851, "arrived"], [85.898, 85.956, "in"], [86.014, 86.386, "Russia"], [86.526, 86.642, "to"], [86.712, 86.898, "meet"], [86.956, 87.455, "Vladimir"], [87.513, 87.943, "Putin."], [88.083, 88.454, "Russia's"], [88.501, 89.023, "ambassador"], [89.07, 89.128, "to"], [89.186, 89.256, "the"], [89.314, 89.627, "United"], [89.674, 90.022, "States,"], [90.126, 90.695, "Alexander"], [90.753, 91.38, "Darchiev,"], [91.52, 91.694, "has"], [91.775, 92.112, "died"], [92.17, 92.658, "suddenly."], [92.798, 92.937, "No"], [93.006, 93.274, "cause"], [93.308, 93.401, "was"], [93.448, 93.761, "given."], [93.901, 94.133, "Which"], [94.191, 94.516, "story"], [94.574, 94.981, "surprised"], [95.004, 95.085, "you"], [95.143, 95.213, "the"], [95.248, 95.619, "most?"], [95.759, 96.072, "Follow"], [96.13, 96.223, "for"], [96.269, 96.339, "the"], [96.374, 96.594, "next"], [96.641, 97.233, "update."]];
const VO_END = 97.265;
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
// =================== 3D-map INTROS for the photo-news format: ?v=A dive from the whole US down to the White House; ?v=B today's stories pop up across the US ===================
// Built like the news maps (y_head + m3_map + m5_hi + this). The date/title/captions come from index_intro.html?v=O (transparent PNGs composited on top).
const V = (new URLSearchParams(location.search).get('v') || 'A')[0];
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const T1 = SENT[1], WHLL = [-77.0365, 38.8977];
const PINS5 = [['NVIDIA', -121.96, 37.35, '#ff4a4a'], ['BROOKLYN', -73.95, 40.65, '#ff4a4a'], ['MISSISSIPPI', -90.18, 32.3, '#3d7dff'], ['WASHINGTON', -77.03, 38.9, '#ffc23a'], ['KENTUCKY', -84.5, 38.2, '#3d7dff']];
function camAt(t) { let c, h, yaw, tilt;
  if (V === 'A') { const u = span(t, 0, T1 + 0.2), uc = easeOut(Math.min(1, u * 1.25)), uh = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    c = llPos(-96, 38.5).lerp(llPos(WHLL[0], WHLL[1] - 0.01), uc); h = Math.exp(Math.log(950) + (Math.log(13) - Math.log(950)) * uh); yaw = 0.7 * u * u; tilt = 0.7 + 0.35 * u; }
  else { const u = span(t, 0, T1 + 0.2); c = llPos(-98, 36.5); h = 660 * Math.exp(-0.12 * u * 3.3); yaw = -0.08 + 0.16 * u; tilt = 0.5 + 0.06 * u; }
  const back = h * tilt; mCam.position.set(c.x + Math.sin(yaw) * back, h, c.z + Math.cos(yaw) * back); mCam.lookAt(c.x, 0, c.z); mCam.fov = 36; mCam.aspect = W / H; mCam.near = Math.max(0.05, h * 0.02); mCam.far = h * 12 + 500;
  mCam.updateProjectionMatrix(); mCam.updateMatrixWorld(); mapUni.uFade.value.set(h * 2.2, h * 6.0); }
let PP = null;
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function mapAt(t) { if (!PP) PP = { pins: PINS5.map(p => makePin(p[3])) }; clearPaint(); mapUni.uDim.value = 0; mapUni.uV5.value = 1;
  STATES.forEach((s, i) => { if (s.name !== 'Alaska' && s.name !== 'Hawaii') paintState(s.name, '#ffffff', 0, 0); });
  paintState('District of Columbia', '#ffc23a', V === 'A' ? 0.5 : 0.9, 0);
  WH.visible = V === 'A'; if (WH.visible) { const p = llPos(WHLL[0], WHLL[1], 0); WH.position.set(p.x, (typeof HGT === 'function' ? HGT(WHLL[0], WHLL[1]) : 0) + 0.05, p.z); WH.rotation.y = 0; WH.scale.setScalar(0.2 * easeOut(span(t, 1.2, 1.9)) + 0.001); }
  PP.pins.forEach((g, i) => { const a = 0.25 + i * 0.42; g.visible = V === 'B' && t >= a; if (g.visible) { g.position.copy(llPos(PINS5[i][1], PINS5[i][2], 0)); g.scale.setScalar(9 * easeOut(span(t, a, a + 0.35)) + 0.01); const ph = (t * 0.9 + i * 0.2) % 1; g.userData.ring.scale.setScalar(1 + ph * 2.2); g.userData.ring.material.opacity = 1 - ph; } });
  if (typeof GLAB !== 'undefined') GLAB.forEach(o => { o.visible = V === 'A' && t > 1.4; });
  palTex.needsUpdate = true; }
function domAt(t) { let h = '';
  if (V === 'B') PINS5.forEach((p, i) => { const a = 0.25 + i * 0.42; if (t < a + 0.1) return; const q = proj(llPos(p[1], p[2], [30, 75, 30, 18, 52][i])); if (!q) return; h += `<div class="stk2" style="left:${Math.max(150, Math.min(930, q[0])).toFixed(0)}px;top:${q[1].toFixed(0)}px;background:${p[3]};transform:translate(-50%,-100%) scale(${pop(t, a + 0.1, 0.25).toFixed(3)})">${p[0]}</div>`; });
  if (V === 'A' && t > 1.9) { const q = proj(WH.position.clone().add(V3(0, 3.2, 0))); if (q) h += `<div class="stk2" style="left:${q[0].toFixed(0)}px;top:${q[1].toFixed(0)}px;background:rgba(10,14,22,.85);transform:translate(-50%,-100%) scale(${pop(t, 1.9, 0.25).toFixed(3)})">THE WHITE HOUSE</div>`; }
  $('labels').innerHTML = h; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture;
  const u = compMat.uniforms; u.uLook.value = 0.0; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0; composite(0, 1.0, 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(['900', '800', '700', '600'].map(w => document.fonts.load(`${w} 160px Inter`)));
  try { await addHiPatch('dc'); groundLabel('Washington', -77.03, 38.95, 0.5, { font: '800' }); groundLabel('Potomac River', -77.1, 38.84, 0.28, { font: '600', italic: true, color: '#e8f4ff', rot: 0.6 }); } catch (e) { console.log('no hi patch', e); }
  window.renderAt(0); return true; })();
