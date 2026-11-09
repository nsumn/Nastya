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
const SENT = [0.0, 2.671, 7.849, 10.357, 13.852, 15.036, 20.238, 23.164, 26.312, 34.846, 38.26, 44.207, 48.549, 53.913, 57.536];
const WORDS = [[0.0, 0.302, "Here's"], [0.337, 0.464, "what"], [0.522, 0.824, "happened"], [0.859, 0.917, "in"], [0.975, 1.045, "the"], [1.103, 1.405, "last"], [1.451, 2.043, "24"], [2.101, 2.531, "hours."], [2.671, 3.228, "Nvidia's"], [3.333, 4.331, "CEO"], [4.47, 4.877, "Jensen"], [4.958, 5.387, "Huang"], [5.527, 6.015, "admitted"], [6.049, 6.119, "to"], [6.2, 6.258, "an"], [6.293, 6.63, "affair"], [6.688, 6.839, "with"], [6.874, 6.908, "a"], [6.978, 7.28, "woman"], [7.396, 7.791, "U.S."], [7.849, 8.337, "officials"], [8.406, 8.778, "believe"], [8.824, 8.963, "was"], [9.021, 9.056, "a"], [9.126, 9.625, "Chinese"], [9.66, 10.217, "spy."], [10.357, 10.833, "Nvidia's"], [10.891, 11.123, "board"], [11.17, 11.262, "is"], [11.321, 12.04, "investigating,"], [12.064, 12.226, "and"], [12.296, 12.783, "Congress"], [12.841, 13.12, "wants"], [13.178, 13.712, "answers."], [13.852, 14.223, "China"], [14.281, 14.652, "denies"], [14.71, 14.896, "it."], [15.036, 15.175, "In"], [15.233, 15.953, "Washington,"], [16.092, 16.208, "the"], [16.266, 16.499, "House"], [16.533, 16.684, "could"], [16.731, 16.94, "vote"], [16.986, 17.195, "this"], [17.265, 17.486, "week"], [17.532, 17.602, "to"], [17.683, 18.031, "impeach"], [18.089, 18.484, "Defense"], [18.519, 19.041, "Secretary"], [19.146, 19.471, "Pete"], [19.517, 20.098, "Hegseth."], [20.238, 20.784, "Democratic"], [20.842, 21.074, "leader"], [21.132, 21.446, "Hakeem"], [21.504, 21.864, "Jeffries"], [21.899, 22.119, "says"], [22.177, 22.363, "he's"], [22.409, 22.444, "a"], [22.525, 22.758, "hard"], [22.816, 23.118, "yes."], [23.164, 23.327, "But"], [23.385, 23.872, "removing"], [23.942, 24.128, "him"], [24.268, 24.477, "would"], [24.512, 24.721, "take"], [24.779, 25.058, "two"], [25.162, 25.51, "thirds"], [25.545, 25.603, "of"], [25.661, 25.731, "the"], [25.789, 26.172, "Senate."], [26.312, 26.66, "Today,"], [26.706, 27.055, "Stephen"], [27.101, 27.357, "Miller"], [27.415, 27.728, "starts"], [27.763, 27.868, "as"], [27.937, 28.193, "White"], [28.227, 28.46, "House"], [28.506, 28.773, "chief"], [28.831, 28.878, "of"], [28.936, 29.423, "staff,"], [29.563, 29.725, "and"], [29.795, 30.317, "UFC"], [30.457, 30.805, "boss"], [30.921, 31.316, "Dana"], [31.374, 31.792, "White"], [31.85, 32.164, "meets"], [32.268, 32.628, "Trump"], [32.698, 33.058, "about"], [33.104, 33.185, "the"], [33.267, 33.592, "press"], [33.65, 34.219, "secretary"], [34.277, 34.706, "job."], [34.846, 35.345, "Alaska"], [35.403, 35.507, "and"], [35.565, 36.134, "Mississippi"], [36.192, 36.366, "are"], [36.413, 36.692, "still"], [36.761, 37.144, "counting"], [37.202, 37.365, "their"], [37.411, 37.702, "Senate"], [37.736, 38.12, "votes."], [38.26, 38.655, "Europe"], [38.678, 38.817, "will"], [38.864, 39.049, "join"], [39.084, 39.154, "the"], [39.212, 39.595, "Ukraine"], [39.63, 39.967, "talks"], [40.013, 40.118, "in"], [40.222, 40.501, "Abu"], [40.57, 40.837, "Dhabi"], [40.895, 41.0, "on"], [41.047, 41.616, "Tuesday,"], [41.756, 42.0, "even"], [42.035, 42.232, "though"], [42.279, 42.604, "Russia"], [42.662, 42.883, "says"], [42.941, 43.068, "they"], [43.126, 43.347, "don't"], [43.405, 43.707, "belong"], [43.765, 44.067, "there."], [44.207, 44.381, "In"], [44.462, 44.903, "Israel,"], [44.961, 45.286, "Gadi"], [45.391, 46.006, "Eisenkot"], [46.111, 46.296, "now"], [46.354, 46.517, "has"], [46.598, 47.225, "28"], [47.272, 47.481, "days"], [47.527, 47.585, "to"], [47.643, 47.852, "form"], [47.887, 47.91, "a"], [47.968, 48.409, "government."], [48.549, 48.688, "And"], [48.746, 48.769, "a"], [48.874, 49.42, "magnitude"], [49.466, 49.721, "5.7"], [49.756, 50.848, "earthquake"], [50.894, 51.045, "hit"], [51.103, 51.475, "central"], [51.533, 51.985, "Japan,"], [52.125, 52.52, "injuring"], [52.566, 52.798, "about"], [52.845, 53.019, "two"], [53.077, 53.321, "dozen"], [53.379, 53.773, "people."], [53.913, 54.168, "There's"], [54.203, 54.307, "no"], [54.366, 54.818, "tsunami"], [54.876, 55.143, "risk,"], [55.178, 55.318, "but"], [55.352, 55.805, "officials"], [55.863, 56.084, "warn"], [56.119, 56.177, "of"], [56.235, 56.862, "aftershocks"], [56.908, 57.071, "all"], [57.129, 57.396, "week."], [57.536, 57.919, "Follow"], [57.989, 58.093, "for"], [58.151, 58.616, "tomorrow's"], [58.674, 59.196, "24"], [59.254, 59.939, "hours."]];
const VO_END = 59.986;
// =================== timeline constants — "The last 24 hours", Mon Nov 9 2026 (scene + tools/day2_cues.mjs) ===================
const S = SENT.filter((x, i) => i !== 2);   // the period in "U.S." split sentence 1 — merge it back
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-.]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { intro: 0.05, wash: S[1] - 0.45, nv: S[1], huang: wordT('Jensen', S[1]), spy: wordT('spy', S[1]), board: S[2], congress: wordT('Congress', S[2]), china: S[3],
  dc: S[4] - 0.2, impeach: wordT('impeach', S[4]), hegseth: wordT('Pete', S[4]), jeffries: wordT('Hakeem', S[5]), yes: wordT('hard', S[5]), senate: S[6], twothirds: wordT('two', S[6]),
  wh: S[7] - 0.2, miller: wordT('Stephen', S[7]), dana: wordT('Dana', S[7]), count: S[8] - 0.2, abu: S[9] - 0.2, europe: wordT('Europe', S[9]), russia: wordT('Russia', S[9]),
  il: S[10] - 0.2, eisenkot: wordT('Gadi', S[10]), d28: wordT('28', S[10]), jp: S[11] - 0.2, quake: wordT('earthquake', S[11]), tsunami: S[12], follow: S[13] };
const CUES = [[0.02, 'whoosh', 0.6], [T.intro + 0.08, 'thud', 0.7], [T.wash, 'whoosh', 0.6], [T.huang, 'pop', 0.6], [T.spy, 'stamp', 0.6], [T.congress, 'pop', 0.4], [T.china, 'flip', 0.4],
  [T.dc - 0.1, 'whoosh', 0.5], [T.impeach + 0.1, 'stamp', 0.8], [T.jeffries, 'pop', 0.5], [T.twothirds, 'rise', 0.5], [T.wh, 'whoosh', 0.35], [T.miller, 'pop', 0.5], [T.dana, 'pop', 0.5],
  [T.count, 'whoosh', 0.6], [T.count + 0.8, 'rise', 0.4], [T.abu, 'whoosh', 0.7], [T.europe + 0.3, 'pop', 0.5], [T.russia, 'pop', 0.4], [T.il, 'whoosh', 0.5], [T.d28, 'thud', 0.5],
  [T.jp, 'whoosh', 0.6], [T.quake + 0.2, 'thud', 0.8], [T.follow, 'whoosh', 0.6], [ENDC, 'thud', 0.5]];
// =================== THE WORLD + US RELIEF MAP (daily news) ===================
// One coordinate system for both planes: x = (lon + 96)·cos38°·SC, z = (38 − lat)·SC  (1 unit ≈ 18.5 km north–south)
const SC = 6, CLAT = Math.cos(38 * Math.PI / 180);
const ll2xz = (lon, lat) => V3((lon + 96) * CLAT * SC, 0, (38 - lat) * SC);
const WB = { lon0: -180, lon1: 180, lat0: -60, lat1: 84, cw: 8192, ch: 3277 };            // world plane
const UB = { lon0: -132, lon1: -58, lat0: 13, lat1: 53, cw: 3700, ch: 2000 };              // detailed US plane (lower 48)
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
        float h = hh(uv), hx = hh(uv + vec2(uE.x, 0.0)) - hh(uv - vec2(uE.x, 0.0)), hz = hh(uv - vec2(0.0, uE.y)) - hh(uv + vec2(0.0, uE.y));
        vN = normalize(vec3(-hx / (2.0 * uD.x), 1.0, -hz / (2.0 * uD.y)));
        vec4 lf = texture2D(tPal, vec2((sid > 0.5 ? sid : cid) / 256.0 + 0.5 / 256.0, 2.5 / 4.0)); float lift = sid > 0.5 ? lf.g : lf.r;
        if (kid > 0.5) lift += texture2D(tPal, vec2(kid / 256.0 + 0.5 / 256.0, 2.5 / 4.0)).b;
        vec4 d = texture2D(tDem, uv); vHt = d.r; vDp = d.g;
        vec3 p = position; p.y += h + lift;
      #ifndef US
        if (sid > 0.5 && uv.x > 0.132 && uv.x < 0.34 && uv.y > 0.505 && uv.y < 0.787) p.y -= 0.5;   // tuck the world's lower 48 under the finer US plane
      #endif
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D tId, tPal; uniform vec3 uSun; uniform vec2 uFade, uP; uniform float uT, uCty; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying float vHt, vDp;
      vec3 ids(vec2 o){ vec4 c = texture2D(tId, vUv + o); return floor(c.rgb * 255.0 + 0.5); }
      void main(){ vec3 id = ids(vec2(0.0)); float cid = id.x, sid = id.y, kid = id.z;
      #ifdef US
        if (sid < 0.5) discard;
      #endif
        vec3 n = normalize(vN); float dif = max(dot(n, uSun), 0.0), sh = 0.3 + 1.05 * dif;
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
        if (coast) col = mix(col, vec3(0.75, 0.85, 0.9), 0.25);
        else if (cb) col = mix(col, vec3(0.95, 0.95, 0.92), 0.6);
        else if (sb) col = mix(col, vec3(0.92, 0.94, 0.98), 0.45);
        else if (kb && uCty > 0.0) col = mix(col, vec3(0.92, 0.94, 0.98), 0.2 * uCty);
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
let worldMesh = null, usMesh = null, WORLD_CV = null;
function countryAt(lon, lat) { const x = Math.floor((lon - WB.lon0) / (WB.lon1 - WB.lon0) * WB.cw), y = Math.floor((WB.lat1 - lat) / (WB.lat1 - WB.lat0) * WB.ch); const d = WORLD_CV.getContext("2d").getImageData(x, y, 1, 1).data; const c = COUNTRIES.find(q => q.id === d[0]); return c ? c.name : ""; }
const mapReady = (async () => {
  const [us, wd] = await Promise.all([fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()), fetch('node_modules/world-atlas/countries-50m.json').then(r => r.json())]);
  const cf = topojson.feature(wd, wd.objects.countries).features; cf.forEach((f, i) => { f.cid = i + 1; if (f.geometry) { const c = d3c(f.geometry); COUNTRIES.push({ id: f.cid, name: f.properties.name, lon: c[0], lat: c[1] }); } });
  const usa = cf.find(f => f.properties.name === 'United States of America');
  const sf = topojson.feature(us, us.objects.states).features; sf.forEach((f, i) => { f.sid = i + 1; const c = d3c(f.geometry); STATES.push({ id: f.sid, name: f.properties.name, lon: c[0], lat: c[1] }); });
  const L = new THREE.TextureLoader(); const [wdem, udem] = await Promise.all([L.loadAsync('data/world_dem.png'), L.loadAsync('data/us_dem.png')]);
  for (const d of [wdem, udem]) { d.colorSpace = THREE.NoColorSpace; d.minFilter = THREE.LinearFilter; d.generateMipmaps = false; }
  worldMesh = planeFor(WB, mapMaterial(WB, wdem, idCanvas(WB, cf, sf, usa.cid), false), 1500, 580);
  WORLD_CV = worldMesh.material.uniforms.tId.value.image;
  let kf = [];
  if (typeof COUNTY_FIPS === 'string') { const cj = await fetch('node_modules/us-atlas/counties-10m.json').then(r => r.json()); const st = sf.find(f => f.id === COUNTY_FIPS);
    kf = topojson.feature(cj, cj.objects.counties).features.filter(f => String(f.id).startsWith(COUNTY_FIPS)); kf.forEach((f, i) => { f.kid = i + 1; f.sid = st.sid; const c = d3c(f.geometry); COUNTIES.push({ id: f.kid, name: f.properties.name, fips: f.id, lon: c[0], lat: c[1] }); }); }
  usMesh = planeFor(UB, mapMaterial(UB, udem, idCanvas(UB, [], sf, usa.cid, kf), true), 740, 400); usMesh.position.y = 0.02; })();
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
// =================== "The last 24 hours" — Mon Nov 9 2026: topic props (GPU card, Pentagon + gavel, ballots, Abu Dhabi table, quake rings) ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// ---- places ----
const PL = { sc: [-121.96, 37.37], pent: [-77.056, 38.871], dc: [-77.04, 38.9], ak: [-152, 63.5], ms: [-89.7, 32.7], abu: [54.37, 24.45], paris: [2.35, 48.86], moscow: [37.62, 55.75], kyiv: [30.52, 50.45],
  jer: [35.21, 31.77], jp: [138.2, 34.95] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
let HOLDS = null;
function holds() { return [[0, T.wash, shot([-60, 32], 1500, 0, 0.16), shot([-75, 34], 1050, 0.06, 0.2)],
    [T.wash + 1.1, T.dc - 0.1, shot(off('sc', 0, 2), 78, -0.45, 0.6), shot(off('sc', 0, 2), 64, 0.2, 0.66)],
    [T.dc + 0.9, T.wh, shot(off('pent', 0, 1), 44, 0.6, 0.62), shot(off('pent', 0, 1), 34, 1.1, 0.7)],
    [T.wh + 0.55, T.count, shot(off('dc', -2, 1.5), 40, 1.3, 0.65), shot(off('dc', -2, 1.5), 32, 1.75, 0.7)],
    [T.count + 1.1, T.abu, shot([-121, 48], 640, 1.0, 0.3), shot([-121, 48], 580, 0.92, 0.32)],
    [T.abu + 1.5, T.il, shot([44, 39], 700, 0, 0.36), shot([50, 30], 380, 0.1, 0.45)],
    [T.il + 0.8, T.jp, shot([34.9, 31.4], 110, 0, 0.45), shot([34.9, 31.4], 92, 0.15, 0.5)],
    [T.jp + 1.3, T.follow, shot([138.5, 36.0], 170, 0, 0.42), shot([138.5, 35.6], 140, -0.1, 0.48)],
    [T.follow + 1.1, T_END, shot([-40, 36], 1500, 0, 0.16), shot([-40, 36], 1700, 0.05, 0.16)]]; }
// ---- props ----
let PROPS = null;
function flagTex(draw) { return canvasTex(96, 64, (g, w, h) => draw(g, w, h)); }
function buildProps() { const P = {};
  // a generic GPU card (no logo): green board, black shroud, two spinning fans, silver fins, a green light strip
  P.gpu = new THREE.Group(); const gm = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 6), gm('#1f6b3c')); pcb.position.y = 0.2; P.gpu.add(pcb);
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(13.4, 1.6, 5.6), gm('#16181d', { metalness: 0.6, roughness: 0.35 })); shroud.position.y = 1.2; P.gpu.add(shroud);
  for (let k = 0; k < 18; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 5.0), gm('#c9ced6', { metalness: 0.9, roughness: 0.25 })); f.position.set(-6.2 + k * 0.73, 0.9, 0); P.gpu.add(f); }
  P.fans = [-3.3, 3.3].map(x => { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.18, 8, 32).rotateX(Math.PI / 2), gm('#2a2d33', { metalness: 0.5 })); g.add(ring);
    for (let b = 0; b < 9; b++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.55), gm('#0d0f12')); bl.position.x = 0.95; const pv = new THREE.Group(); pv.rotation.y = b / 9 * Math.PI * 2; bl.rotation.x = 0.5; pv.add(bl); g.add(pv); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 20), gm('#3a3e46', { metalness: 0.7 })); g.add(hub); g.position.set(x, 2.08, 0); P.gpu.add(g); return g; });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: '#7dff4a' })); strip.position.set(0, 1.95, 2.85); P.gpu.add(strip);
  const die = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 2.2), gm('#b08a3a', { metalness: 0.9, roughness: 0.3 })); die.position.set(0, 0.42, -3.2); P.gpu.add(die);
  P.gpu.visible = false; MAPSC.add(P.gpu);
  // magnifier ("investigation") circling the card
  P.mag = new THREE.Group(); const mr = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.22, 10, 32), gm('#e8e8ea', { metalness: 0.8, roughness: 0.25 })); P.mag.add(mr);
  const gl = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.35, roughness: 0.05 })); P.mag.add(gl);
  const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.6, 10), gm('#3a2a1c')); hd.position.set(0, -2.9, 0); P.mag.add(hd); P.mag.visible = false; MAPSC.add(P.mag);
  // the Pentagon (pentagonal ring) + a judge's gavel
  { const sh = new THREE.Shape(), hole = new THREE.Path(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * 6, Math.sin(a) * 6) : sh.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); }
    for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? hole.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6) : hole.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); } sh.holes.push(hole);
    P.pent = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.6, flatShading: true })); P.pent.visible = false; MAPSC.add(P.pent); }
  P.gavel = new THREE.Group(); { const wood = gm('#6b3f1f'), band = gm('#c8a24a', { metalness: 0.8 }); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 20).rotateZ(Math.PI / 2), wood); head.position.y = 0; P.gavel.add(head);
    for (const x of [-1.1, 1.1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.3, 20).rotateZ(Math.PI / 2), band); b.position.x = x; P.gavel.add(b); }
    const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 5.0, 12), wood); hdl.position.set(0, 0, 2.6); hdl.rotation.x = Math.PI / 2; P.gavel.add(hdl); }
  P.block = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.7, 24), gm('#5a3418')); P.gavel.visible = P.block.visible = false; MAPSC.add(P.gavel); MAPSC.add(P.block);
  // ballots raining on Alaska and Mississippi
  const balls = []; for (let i = 0; i < 260; i++) { const ak = i < 150; const c = ak ? PL.ak : PL.ms; balls.push({ p: llPos(c[0] + R(-1, 1) * (ak ? 7 : 1.6), c[1] + R(-1, 1) * (ak ? 3.2 : 1.8)), ph: rnd(), ry: R(0, 6) }); }
  P.balls = balls; P.bMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.1, 1.8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.25 }), balls.length); P.bMesh.frustumCulled = false; P.bMesh.visible = false; MAPSC.add(P.bMesh);
  // Abu Dhabi: a round table with four flags; arcs from Paris, Moscow, Kyiv and Washington
  P.table = new THREE.Group(); const top = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.8, 40), gm('#f2efe6')); top.position.y = 3.2; P.table.add(top); const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 3.2, 20), gm('#8a8f99')); leg.position.y = 1.6; P.table.add(leg);
  const flags = [flagTex((g, w, h) => { for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#fff' : '#c8303a'; g.fillRect(0, k * h / 7, w, h / 7 + 1); } g.fillStyle = '#25356e'; g.fillRect(0, 0, w * 0.42, h * 0.54); }),
    flagTex((g, w, h) => { g.fillStyle = '#0057b7'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#ffd700'; g.fillRect(0, h / 2, w, h / 2); }),
    flagTex((g, w, h) => { ['#fff', '#0039a6', '#d52b1e'].forEach((c, k) => { g.fillStyle = c; g.fillRect(0, k * h / 3, w, h / 3 + 1); }); }),
    flagTex((g, w, h) => { g.fillStyle = '#003399'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcc00'; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.arc(w / 2 + Math.cos(a) * 18, h / 2 + Math.sin(a) * 18, 3, 0, 7); g.fill(); } })];
  P.flagMeshes = flags.map((tx, k) => { const a = k / 4 * Math.PI * 2 + 0.4, g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 8), gm('#d9d9dd', { metalness: 0.8 })); pole.position.y = 3; g.add(pole);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide, roughness: 0.7 })); f.position.set(1.85, 4.8, 0); g.add(f); g.userData.f = f; g.position.set(Math.cos(a) * 7.2, 3.6, Math.sin(a) * 7.2); g.rotation.y = -a; P.table.add(g); return g; });
  P.table.visible = false; MAPSC.add(P.table);
  P.arcs = [['paris', '#5f8dff'], ['moscow', '#ff6a5a'], ['kyiv', '#ffd84a'], ['dc', '#bcd0ff']].map(([k, c], i) => makeArc(P3(k, 0.5), P3('abu', 0.5), k === 'dc' ? 480 : 90, c));
  P.abuPin = makePin(GOLD);
  // Japan: expanding quake rings at the epicentre
  P.rings = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff7a3a', transparent: true, depthWrite: false })); m.visible = false; MAPSC.add(m); return m; });
  P.intro = ['sc', 'dc', 'ak', 'abu', 'jer', 'jp'].map(() => makePin(GOLD));
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
let SHAKE = 0;
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  P.intro.forEach((p, i) => { const keys = ['sc', 'dc', 'ak', 'abu', 'jer', 'jp']; const a = 0.9 + i * 0.22, on = (t >= a && t < T.wash + 0.5) || t >= T.follow + 0.3; p.visible = on; if (on) { const k = t >= T.follow ? pop(t, T.follow + 0.3 + i * 0.12, 0.35) : pop(t, a, 0.35);
    const kp = t >= T.follow ? 1 - smooth(T_END - 0.5, T_END, t) : 1 - smooth(T.wash, T.wash + 0.5, t); p.position.copy(P3(keys[i])); p.scale.setScalar(mCam.position.y / 50 * k * Math.max(0.01, kp)); p.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3 + i * 0.3) % 1)); p.userData.ring.material.opacity = 1 - ((t * 1.3 + i * 0.3) % 1); } });
  // Nvidia: the card rises out of Santa Clara, fans spin; after "spy" it pulses red; the magnifier circles it during "investigating"
  { const on = t >= T.wash + 0.6 && t < T.dc + 0.6; P.gpu.visible = on; if (on) { const k = easeOut(span(t, T.wash + 0.8, T.wash + 1.6)); P.gpu.position.copy(off('sc', 0, 0)).setY(1.2 + 7 * (1 - k) + 0.4 * Math.sin(t * 1.7)); P.gpu.scale.setScalar(1.25 * k + 0.01); P.gpu.rotation.set(0.12 * Math.sin(t * 0.9), 0.35 + 0.25 * Math.sin(t * 0.5), 0);
      P.fans.forEach((f, i) => f.rotation.y = t * (14 + i * 2)); const red = t >= T.spy ? 0.5 + 0.5 * Math.sin(t * 9) : 0; P.gpu.children[1].material.emissive.setRGB(red * 0.6, 0, 0); }
    const mo = t >= T.board && t < T.dc + 0.4; P.mag.visible = mo; if (mo) { const a = (t - T.board) * 1.6; const k = pop(t, T.board, 0.35); P.mag.position.copy(off('sc', Math.cos(a) * 7, Math.sin(a) * 4)).setY(7.5); P.mag.scale.setScalar(1.3 * k); P.mag.rotation.set(-0.9, a, 0.3); } }
  if (t >= T.wash + 0.6 && t < T.dc + 0.4) paintState('California', '#7dff4a', 0.18, 0.2);
  if (t >= T.china && t < T.dc + 0.4) paintCountry('China', RED, 0.5 * smooth(T.china, T.china + 0.4, t), 0.4);
  // the Pentagon + the gavel slamming on "impeach" and again on "hard yes"
  { const on = t >= T.dc && t < T.wh + 0.6; P.pent.visible = P.gavel.visible = P.block.visible = on; if (on) { const k = easeOut(span(t, T.dc + 0.4, T.dc + 1.1)); P.pent.position.copy(off('pent', -1, 0)).setY(0.4 + 6 * (1 - k)); P.pent.scale.setScalar(1.15 * k + 0.01); P.pent.rotation.y = 0.2;
      const b = off('pent', 9.5, 3.5); P.block.position.copy(b).setY(0.6); P.block.scale.setScalar(k + 0.01);
      const hit = (a) => { const u = span(t, a - 0.35, a); const back = span(t, a + 0.05, a + 0.5); return u < 1 ? -1.1 * Math.sin(u * Math.PI * 0.5) * 0 + lerp(-1.15, 0, u * u) : lerp(0, -0.9, easeOut(back)); };
      const ang = t < T.impeach - 0.35 ? -0.9 : t < T.yes - 0.35 ? hit(T.impeach + 0.15) : hit(T.yes + 0.1); P.gavel.position.copy(b).add(V3(0, 2.0, 3.2)); P.gavel.rotation.set(ang, 0.4, 0); P.gavel.scale.setScalar(k + 0.01); } }
  // White House
  WH.visible = t >= T.wh && t < T.count + 0.6; if (WH.visible) { const k = easeOut(span(t, T.wh + 0.3, T.wh + 1.0)); WH.position.copy(off('dc', -3, 0.5)).setY(0.3 + 6 * (1 - k)); WH.scale.setScalar(1.8 * k + 0.01); WH.rotation.y = 0; }
  if (t >= T.dc && t < T.count + 0.6) { paintState('District of Columbia', GOLD, 0.9, 0.6); paintState('Virginia', '#26324a', 0.3); paintState('Maryland', '#26324a', 0.3); }
  // still counting
  if (t >= T.count && t < T.abu + 0.4) { const pl = 0.45 + 0.25 * Math.sin(t * 6); paintState('Alaska', GREY, pl, 0.8); paintState('Mississippi', GREY, pl, 0.8); }
  { const on = t >= T.count + 0.6 && t < T.abu + 0.3; P.bMesh.visible = on; if (on) { P.balls.forEach((b, i) => { const a = T.count + 0.6 + b.ph * 2.4, k = span(t, a, a + 0.9), y = lerp(60, 2.0 + 0.1 * (i % 7), easeOut(k)); const sc = t < a ? 0.001 : (1 - smooth(T.abu - 0.1, T.abu + 0.3, t)) * 1.0 + 0.001;
      s4.setScalar(sc * 3.2); q4.setFromEuler(e4.set(0.6 * (1 - k) * Math.sin(i), b.ry + 3 * (1 - k), 0.5 * (1 - k))); m4.compose(V3(b.p.x, y * 3, b.p.z), q4, s4); P.bMesh.setMatrixAt(i, m4); }); P.bMesh.instanceMatrix.needsUpdate = true; } }
  // Abu Dhabi
  const arcK = (a) => t < a || t > T.il + 0.2 ? 0 : easeOut(span(t, a, a + 0.9)); arcShow(P.arcs[0], arcK(T.europe + 0.2)); arcShow(P.arcs[1], arcK(T.russia - 0.1)); arcShow(P.arcs[2], arcK(T.abu + 1.2)); arcShow(P.arcs[3], arcK(T.abu + 1.5));
  if (t >= T.abu && t < T.il + 0.3) { const EU = ['France', 'Germany', 'Italy', 'Spain', 'Poland', 'Netherlands', 'Belgium', 'Austria', 'Czechia', 'Sweden', 'Finland', 'Denmark', 'Ireland', 'Portugal', 'Greece', 'Romania', 'Bulgaria', 'Hungary', 'Slovakia', 'Croatia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia', 'Luxembourg'];
    const ek = smooth(T.europe, T.europe + 0.5, t); EU.forEach(n => paintCountry(n, BLUE, 0.75 * ek, 0.6 * ek)); paintCountry('Russia', RED, 0.45 * smooth(T.russia - 0.2, T.russia + 0.3, t), 0.4); paintCountry('Ukraine', GOLD, 0.45, 0.4); paintCountry('United Arab Emirates', GOLD, 0.8, 0.8); }
  { const on = false; P.table.visible = on; if (on) { const k = easeOut(span(t, T.abu + 0.9, T.abu + 1.6)); P.table.position.copy(off('abu', 0, -6)); P.table.scale.setScalar(mCam.position.y / 300 * k + 0.01); P.table.rotation.y = t * 0.25;
      P.flagMeshes.forEach((g, i) => { g.userData.f.rotation.y = 0.25 * Math.sin(t * 3 + i); g.visible = i !== 3 || t >= T.europe + 0.2; if (i === 3) g.scale.setScalar(pop(t, T.europe + 0.2, 0.35)); }); } }
  P.abuPin.visible = t >= T.abu + 0.6 && t < T.il + 0.3; if (P.abuPin.visible) { P.abuPin.position.copy(P3('abu')); P.abuPin.scale.setScalar(pop(t, T.abu + 0.6, 0.35) * mCam.position.y / 45); P.abuPin.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); P.abuPin.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
  // Israel
  if (t >= T.il && t < T.jp + 0.4) paintCountry('Israel', BLUE, 0.9 * smooth(T.il, T.il + 0.4, t), 1.2);
  // Japan: the quake
  if (t >= T.jp && t < T.follow + 0.4) paintCountry('Japan', '#ff9a5a', 0.45, 0.4);
  P.rings.forEach((r, i) => { const a = T.quake + 0.1 + i * 0.55; const on = t >= a && t < T.follow; r.visible = on; if (on) { const u = ((t - a) % 2.2) / 2.2; r.position.copy(P3('jp', 1.5 + i * 0.05)); r.scale.setScalar(2 + u * 38); r.material.opacity = (1 - u) * 0.9; } });
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { huang: ['Jensen Huang', 'NVIDIA CEO'], hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'], jeffries: ['Hakeem Jeffries', 'HOUSE DEMOCRATIC LEADER'], miller: ['Stephen Miller', 'CHIEF OF STAFF · DAY 1'],
  dana_white: ['Dana White', 'UFC BOSS'], trump: ['Donald Trump', 'PRESIDENT'], peltola: ['Mary Peltola', 'ALASKA · D'], colom: ['Scott Colom', 'MISSISSIPPI · D'], eisenkot: ['Gadi Eisenkot', 'TAPPED TO LEAD ISRAEL'] };
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) return lerpShot(A, B, esin(span(t, a, b)));
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = HOLDS[i][3], N = nx[2], u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.55); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { SHAKE = t >= T.quake && t < T.quake + 1.4 ? (1 - span(t, T.quake, T.quake + 1.4)) * 1.6 : 0; const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back + SHAKE * Math.sin(t * 61), s.h + SHAKE * Math.sin(t * 47) * 0.5, s.c.z + Math.cos(s.yaw) * back + SHAKE * Math.sin(t * 53));
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const fx = o.fx ?? 0;
  const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
function barLabel(b, txt, t, t0, cls = '') { if (!b.visible) return ''; const top = b.position.clone().setY(b.scale.y + 1.5); return sticker(txt, top, t, t0, cls); }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
function hudAt(t) {
  if (t < T.wash + 0.6) return null;
  if (t < T.dc) return ['01 · SILICON VALLEY', t < T.spy ? 'NVIDIA’S CEO' : t < T.board ? 'A SUSPECTED SPY' : t < T.china ? 'UNDER INVESTIGATION' : 'CHINA DENIES IT', t < T.spy ? 'JENSEN HUANG ADMITS AN AFFAIR' : t < T.board ? 'U.S. OFFICIALS BELIEVE SHE SPIED FOR CHINA' : t < T.china ? 'NVIDIA’S BOARD + CONGRESS' : '“GROUNDLESS SPECULATION”'];
  if (t < T.wh) return ['02 · THE PENTAGON', t < T.impeach ? 'HEGSETH' : t < T.senate ? 'IMPEACHMENT VOTE?' : '2/3 TO REMOVE', t < T.jeffries ? 'THE HOUSE COULD VOTE THIS WEEK' : t < T.senate ? 'JEFFRIES: “HARD YES”' : 'THE SENATE HAS THE FINAL SAY'];
  if (t < T.count) return ['03 · WHITE HOUSE', t < T.dana ? 'MILLER: DAY 1' : 'PRESS SECRETARY?', t < T.dana ? 'NEW CHIEF OF STAFF STARTS TODAY' : 'DANA WHITE MEETS TRUMP TODAY'];
  if (t < T.abu) return ['04 · MIDTERMS 2026', 'STILL COUNTING', 'ALASKA + MISSISSIPPI · SENATE'];
  if (t < T.il) return ['05 · ABU DHABI', t < T.europe + 0.2 ? 'UKRAINE TALKS' : t < T.russia ? 'EUROPE JOINS' : '“NO PLACE”', t < T.russia ? 'TUESDAY · U.S. MEDIATES' : 'RUSSIA ON EUROPE AT THE TABLE'];
  if (t < T.jp) return ['06 · ISRAEL', t < T.d28 ? 'EISENKOT' : `${Math.max(1, 28 - Math.floor(span(t, T.d28, T.d28 + 1.2) * 0))} DAYS`, 'TO FORM A GOVERNMENT'];
  if (t < T.follow) return ['07 · JAPAN', t < T.quake + 0.2 ? 'EARTHQUAKE' : 'M 5.7', t < T.tsunami ? '~24 INJURED · CENTRAL JAPAN' : 'NO TSUNAMI · AFTERSHOCKS ALL WEEK'];
  return null; }
function introHTML(t) { if (t > T.wash + 0.5) return ''; const k = pop(t, T.intro, 0.35), a = 1 - smooth(T.wash + 0.1, T.wash + 0.5, t), bar = easeOut(span(t, T.intro + 0.2, T.intro + 0.8));
  const hh = Math.max(0, 24 - span(t, T.intro + 0.3, T.wash) * 24), clock = `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}:${String(Math.floor((hh * 3600) % 60)).padStart(2, '0')}`;
  return `<div id="intro" style="opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><div class="idate"><b>●</b> MONDAY · NOV 9, 2026</div><div class="ititle">The last</div><div class="iplate" style="transform:skewX(-8deg) scale(${(0.6 + 0.4 * easeOut(span(t, T.intro + 0.15, T.intro + 0.45))).toFixed(3)})"><span>24 HOURS</span></div>
    <div><div class="isub" style="opacity:${smooth(T.intro + 0.5, T.intro + 0.8, t)}">IN AMERICA <i>&</i> AROUND THE WORLD</div></div><div class="iclock">${clock}</div></div>`; }
function domAt(t) { const P = PROPS; let h = introHTML(t);
  h += card('huang', T.huang - 0.05, T.dc, 640, 575, t, { tag: t >= T.spy ? 'ADMITS AFFAIR' : '', tagc: 'r', tagT: T.spy });
  h += card('hegseth', T.hegseth - 0.3, T.wh, 110, 640, t, { tag: t >= T.impeach ? 'IMPEACHMENT?' : '', tagc: 'r', tagT: T.impeach + 0.1 });
  h += card('jeffries', T.jeffries - 0.05, T.wh, 650, 680, t, { small: true, quote: 'HARD YES', qT: T.yes });
  h += card('miller', T.miller - 0.05, T.count, 110, 640, t, { tag: 'DAY 1', tagc: 'b', tagT: T.miller + 0.3 });
  h += card('dana_white', T.dana - 0.05, T.count, 650, 680, t, { small: true, tag: 'MEETING TODAY', tagc: 'b', tagT: T.dana + 0.3 });
  h += card('eisenkot', T.eisenkot - 0.05, T.jp, 110, 640, t, { tag: '28 DAYS', tagc: 'b', tagT: T.d28 });
  // Huang's letter to staff, published on NVIDIA's newsroom ("A Message to Our Company", Nov 8) — short quoted lines typed in; a quote card, not a fake screenshot
  if (t >= T.board - 0.3 && t < T.dc) { const k = pop(t, T.board - 0.3, 0.35), al = 1 - smooth(T.dc - 0.3, T.dc, t);
    const LINES = ['I owe my family and all of you an apology.', 'I was unfaithful to my wife.', 'My actions hurt her and our children.', 'There is no excuse for what I did.', 'I am deeply sorry.'];
    const per = (T.china + 0.3 - T.board) / LINES.length; let body = '';
    LINES.forEach((ln, i) => { const a0 = T.board + i * per, n = Math.floor(ln.length * span(t, a0, a0 + per * 0.75)); if (t >= a0) body += `<div class="ml">${ln.slice(0, n)}${n < ln.length ? '<i>|</i>' : ''}</div>`; });
    h += `<div class="mail" style="opacity:${al.toFixed(2)};transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-1.5deg)"><div class="mh">✉ JENSEN HUANG · “A MESSAGE TO OUR COMPANY” <span>· NOV 8</span></div><div class="mto">To my colleagues at NVIDIA,</div>${body}<div class="msrc">PUBLISHED ON NVIDIA’S NEWSROOM</div></div>`; }
  if (P) {
    if (t >= T.wash + 1.4 && t < T.dc) h += sticker('NVIDIA HQ · SANTA CLARA', off('sc', 0, 0).setY(9), t, T.wash + 1.4, 'sm w');
    if (t >= T.spy && t < T.dc) h += sticker('SUSPECTED CHINESE SPY', off('sc', 0, 3).setY(4), t, T.spy + 0.1, 'r');
    if (t >= T.dc + 0.9 && t < T.wh) h += sticker('THE PENTAGON', off('pent', -1, 0).setY(5), t, T.dc + 0.9, 'sm w');
    if (t >= T.wh + 0.6 && t < T.miller + 0.2) h += sticker('WHITE HOUSE', off('dc', -3, 4).setY(3), t, T.wh + 0.6, 'sm w');
    if (t >= T.count + 0.8 && t < T.abu) { h += sticker('ALASKA · COUNTING', P3('ak', 6), t, T.count + 0.8, 'g'); h += sticker('MISSISSIPPI · COUNTING', P3('ms', 6), t, T.count + 1.0, 'g'); }
    if (t >= T.abu + 1.0 && t < T.il) { h += sticker('ABU DHABI · TUESDAY', P3('abu', 30), t, T.abu + 1.0, 'w'); if (t >= T.europe + 0.3) h += sticker('EUROPE', P3('paris', 4), t, T.europe + 0.3, 'b sm'); if (t >= T.russia) h += sticker('RUSSIA', P3('moscow', 4), t, T.russia, 'r sm'); h += sticker('KYIV', P3('kyiv', 3), t, T.abu + 1.3, 'sm'); }
    if (t >= T.il + 0.8 && t < T.jp) h += sticker('ISRAEL', P3('jer', 6), t, T.il + 0.8, 'b');
    if (t >= T.quake + 0.3 && t < T.follow) h += sticker('EPICENTER · M 5.7', P3('jp', 5), t, T.quake + 0.3, 'r');
    if (t >= T.tsunami && t < T.follow) h += sticker('NO TSUNAMI', P3('jp', 2).add(V3(14, 0, 8)), t, T.tsunami + 0.2, 'b sm');
  }
  if (t >= T.impeach + 0.15 && t < T.jeffries) h += `<div class="stamp" style="font-size:110px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.impeach + 0.15, T.impeach + 0.33)))).toFixed(3)})">IMPEACH?</div>`;
  if (t >= T.follow - 0.2 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.follow - 0.2, T.follow + 0.1, t)};transform:scale(${pop(t, T.follow - 0.2, 0.35).toFixed(3)})">Follow for <span class="hl">tomorrow’s</span><br>24 hours</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.wash + 0.6, T.spy, T.board, T.china, T.dc, T.impeach, T.senate, T.wh, T.dana, T.count, T.abu, T.europe + 0.2, T.russia, T.il, T.d28, T.jp, T.quake + 0.2]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.impeach + 0.15, T.yes + 0.1, T.spy]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); f = Math.max(f, 1 - Math.abs(t - T.intro - 0.05) / 0.2); return Math.max(0, f); }
window.renderAt = (t) => { mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
