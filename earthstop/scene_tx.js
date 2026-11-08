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
// "Why Texas turned blue" (Nov 8 2026): counties of Texas on the US plane (y_map.js reads COUNTY_FIPS)
const COUNTY_FIPS = '48';
// metro / border counties carried by Talarico that the coverage names (Dallas News, Newsweek, Axios, Houston Public Media), with rough 2023 populations (millions, Census estimates) for the "where the people are" columns
const METRO = { Harris: 4.8, Dallas: 2.6, Tarrant: 2.2, Bexar: 2.1, Travis: 1.3, Collin: 1.2, Denton: 1.0, 'Fort Bend': 0.9, Hidalgo: 0.9, 'El Paso': 0.87, Williamson: 0.7, Cameron: 0.43, Kaufman: 0.17, Starr: 0.066, Willacy: 0.02 };
// generated by tools/news_timing.py — do not edit
const SENT = [0.0, 1.881, 4.041, 8.256, 11.682, 15.212, 18.776, 21.958, 23.653, 26.707, 29.168, 32.163, 34.151, 38.075, 41.234, 43.708, 47.551, 52.277, 53.845, 59.419, 61.43, 64.914, 67.666, 69.478];
const WORDS = [[0.0, 0.546, "Texas"], [0.65, 0.917, "just"], [0.998, 1.393, "flipped"], [1.451, 1.811, "blue."], [1.881, 2.206, "Nobody"], [2.264, 2.426, "saw"], [2.485, 2.543, "it"], [2.601, 2.972, "coming,"], [3.03, 3.146, "so"], [3.204, 3.425, "here's"], [3.483, 3.901, "why."], [4.041, 4.191, "For"], [4.261, 4.772, "thirty-two"], [4.876, 5.202, "years,"], [5.271, 5.445, "no"], [5.515, 5.979, "Democrat"], [6.037, 6.154, "won"], [6.2, 6.223, "a"], [6.328, 6.688, "single"], [6.722, 7.198, "statewide"], [7.245, 7.454, "race"], [7.489, 7.558, "in"], [7.616, 8.116, "Texas."], [8.256, 8.396, "The"], [8.5, 8.802, "last"], [8.86, 9.359, "Democratic"], [9.406, 9.742, "senator"], [9.801, 9.917, "was"], [9.975, 10.323, "elected"], [10.369, 10.439, "in"], [10.497, 11.542, "1988."], [11.682, 11.809, "In"], [11.856, 12.761, "2024,"], [12.796, 13.087, "Trump"], [13.145, 13.319, "won"], [13.377, 13.818, "Texas"], [13.888, 14.016, "by"], [14.12, 14.573, "fourteen"], [14.643, 15.072, "points."], [15.212, 15.409, "Two"], [15.467, 15.688, "years"], [15.746, 16.036, "later,"], [16.083, 16.373, "James"], [16.419, 16.953, "Talarico"], [17.023, 17.151, "won"], [17.197, 17.267, "the"], [17.337, 17.662, "Senate"], [17.685, 17.894, "seat"], [17.952, 18.068, "by"], [18.126, 18.637, "twelve."], [18.776, 18.927, "And"], [18.997, 19.287, "Gina"], [19.333, 20.03, "Hinojosa"], [20.135, 20.355, "beat"], [20.46, 20.831, "Governor"], [20.901, 21.191, "Greg"], [21.296, 21.818, "Abbott."], [21.958, 22.26, "Reason"], [22.341, 22.666, "one:"], [22.747, 22.863, "the"], [22.921, 23.513, "opponent."], [23.653, 24.222, "Republicans"], [24.268, 24.501, "picked"], [24.559, 24.733, "Ken"], [24.802, 25.174, "Paxton"], [25.232, 25.395, "over"], [25.453, 25.789, "Senator"], [25.847, 26.068, "John"], [26.138, 26.567, "Cornyn."], [26.707, 27.078, "Paxton"], [27.124, 27.241, "was"], [27.287, 27.705, "impeached"], [27.751, 27.821, "in"], [27.867, 29.028, "2023."], [29.168, 29.423, "Even"], [29.47, 29.644, "two"], [29.714, 30.027, "members"], [30.062, 30.12, "of"], [30.167, 30.236, "the"], [30.294, 30.515, "Bush"], [30.573, 30.898, "family"], [30.968, 31.281, "backed"], [31.362, 32.105, "Talarico."], [32.163, 32.523, "Reason"], [32.593, 33.081, "two:"], [33.221, 33.337, "the"], [33.396, 34.011, "suburbs."], [34.151, 34.592, "Collin,"], [34.627, 35.01, "Denton,"], [35.045, 35.451, "Tarrant"], [35.497, 35.579, "and"], [35.637, 35.985, "Kaufman"], [36.043, 36.357, "counties"], [36.403, 36.647, "around"], [36.693, 37.018, "Dallas"], [37.088, 37.425, "flipped"], [37.483, 37.935, "blue."], [38.075, 38.296, "Near"], [38.365, 38.783, "Austin,"], [38.806, 39.306, "Williamson"], [39.352, 39.515, "went"], [39.561, 39.77, "blue"], [39.817, 39.921, "by"], [39.979, 40.2, "about"], [40.246, 40.56, "twenty"], [40.618, 41.094, "points."], [41.234, 41.559, "Reason"], [41.617, 41.966, "three:"], [42.024, 42.488, "Latino"], [42.558, 42.883, "voters"], [42.941, 43.162, "came"], [43.208, 43.568, "back."], [43.708, 44.009, "Trump"], [44.067, 44.265, "won"], [44.335, 44.602, "all"], [44.66, 44.903, "four"], [44.961, 45.17, "Rio"], [45.217, 45.461, "Grande"], [45.484, 45.728, "Valley"], [45.774, 46.088, "counties"], [46.134, 46.18, "in"], [46.227, 47.411, "2024."], [47.551, 47.783, "This"], [47.841, 48.19, "time,"], [48.259, 48.712, "turnout"], [48.758, 48.944, "there"], [49.014, 49.292, "jumped"], [49.397, 50.024, "thirty-eight"], [50.059, 50.477, "percent,"], [50.512, 50.628, "and"], [50.674, 50.755, "the"], [50.813, 51.185, "Valley"], [51.289, 51.638, "swung"], [51.707, 52.137, "back."], [52.277, 52.59, "Reason"], [52.648, 53.031, "four:"], [53.101, 53.705, "timing."], [53.845, 54.356, "Midterms"], [54.414, 54.704, "punish"], [54.762, 54.832, "the"], [54.879, 55.355, "president's"], [55.401, 55.749, "party,"], [55.796, 55.947, "and"], [56.016, 56.376, "voters"], [56.423, 56.574, "were"], [56.643, 57.224, "frustrated"], [57.27, 57.479, "two"], [57.584, 57.886, "years"], [57.932, 58.106, "into"], [58.164, 58.512, "Trump's"], [58.559, 58.896, "second"], [58.942, 59.279, "term."], [59.419, 59.756, "Rural"], [59.826, 60.372, "Texas"], [60.512, 60.86, "stayed"], [60.93, 61.29, "red."], [61.43, 61.988, "Talarico"], [62.046, 62.173, "won"], [62.255, 62.464, "only"], [62.545, 62.87, "forty"], [62.94, 63.033, "of"], [63.091, 63.265, "two"], [63.346, 63.671, "hundred"], [63.729, 64.24, "fifty-four"], [64.298, 64.774, "counties."], [64.914, 65.076, "But"], [65.111, 65.192, "the"], [65.262, 65.61, "cities"], [65.668, 65.796, "and"], [65.877, 66.342, "suburbs"], [66.376, 66.504, "are"], [66.539, 66.69, "where"], [66.725, 66.794, "the"], [66.864, 67.201, "people"], [67.236, 67.526, "are."], [67.666, 67.864, "So,"], [67.887, 67.992, "is"], [68.05, 68.549, "Texas"], [68.607, 68.851, "blue"], [68.897, 69.025, "for"], [69.083, 69.373, "good?"], [69.478, 69.687, "Tell"], [69.733, 69.803, "me"], [69.849, 69.907, "in"], [69.942, 70.012, "the"], [70.047, 70.766, "comments."]];
const VO_END = 70.805;
// =================== timeline constants (scene + tools/tx_cues.mjs) ===================
const S = SENT;
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 5.6;
const T = { blue: wordT('blue', 0), why: S[1], years: S[2], senator: S[3], y2024: S[4], trump: wordT('Trump', S[4]), later: S[5], talarico: wordT('James', S[5]), gina: wordT('Gina', S[6]), abbott: wordT('Abbott', S[6]),
  r1: S[7], paxton: wordT('Ken', S[8]), cornyn: wordT('John', S[8]), impeached: wordT('impeached', S[9]), bush: wordT('Bush', S[10]),
  r2: S[11], collin: wordT('Collin', S[12]), denton: wordT('Denton', S[12]), tarrant: wordT('Tarrant', S[12]), kaufman: wordT('Kaufman', S[12]), flipped: wordT('flipped', S[12]), austin: S[13], williamson: wordT('Williamson', S[13]),
  r3: S[14], valley: S[15], thistime: S[16], jumped: wordT('jumped', S[16]), swung: wordT('swung', S[16]), r4: S[17], midterms: S[18], rural: S[19], forty: wordT('forty', S[20]), cities: S[21], q: S[22] };
const CUES = [[0.05, 'whoosh', 0.5], [T.blue, 'flip', 0.8], [T.blue + 0.9, 'thud', 0.7], [T.years, 'whoosh', 0.35], [T.senator + 1.2, 'pop', 0.5], [T.y2024, 'rise', 0.6], [T.later + 0.3, 'flip', 0.6], [T.talarico, 'pop', 0.6], [T.gina, 'pop', 0.5],
  [T.r1 - 0.3, 'whoosh', 0.5], [T.paxton, 'pop', 0.6], [T.cornyn, 'pop', 0.4], [T.impeached, 'stamp', 0.8], [T.bush, 'pop', 0.5],
  [T.r2 - 0.3, 'whoosh', 0.55], [T.collin, 'pop', 0.5], [T.denton, 'pop', 0.5], [T.tarrant, 'pop', 0.5], [T.kaufman, 'pop', 0.5], [T.austin - 0.2, 'whoosh', 0.4], [T.williamson, 'flip', 0.5],
  [T.r3 - 0.3, 'whoosh', 0.55], [T.thistime, 'rise', 0.6], [T.swung, 'flip', 0.6], [T.r4 - 0.5, 'whoosh', 0.7], [T.rural - 0.6, 'whoosh', 0.6], [T.forty, 'rise', 0.6], [T.q, 'thud', 0.6], [ENDC, 'thud', 0.5]];
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
// =================== "Why Texas turned blue" — camera, map state, DOM ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a';
const TXC = [-99.3, 31.3];
// ---- camera (same hold/flight scheme as the daily video) ----
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [
  [0, T.years - 0.1, shot([-99.0, 30.2], 125, 0.35, 0.75), shot([-99.2, 30.6], 150, 0.05, 0.6)],
  [T.years + 0.4, T.y2024 - 0.1, shot(TXC, 165, 0.0, 0.35), shot(TXC, 145, 0.15, 0.38)],
  [T.y2024 + 0.4, T.r1 - 0.3, shot([-97.6, 30.0], 160, -0.12, 0.4), shot([-97.6, 30.0], 140, 0.1, 0.42)],
  [T.r1 + 0.3, T.r2 - 0.3, shot([-98.0, 30.6], 100, 0.35, 0.55), shot([-98.0, 30.6], 84, 0.65, 0.6)],
  [T.r2 + 0.4, T.austin - 0.25, shot([-97.0, 32.85], 36, 0.3, 0.7), shot([-97.0, 32.85], 29, 0.6, 0.75)],
  [T.austin + 0.45, T.r3 - 0.3, shot([-97.65, 30.6], 34, -0.2, 0.7), shot([-97.65, 30.6], 28, 0.1, 0.75)],
  [T.r3 + 0.45, T.r4 - 0.5, shot([-98.0, 26.5], 70, -0.25, 0.65), shot([-98.0, 26.5], 56, 0.15, 0.7)],
  [T.r4 + 0.7, T.rural - 0.6, shot([-77.04, 39.2], 80, -0.3, 0.6), shot([-77.04, 39.2], 64, 0.15, 0.65)],
  [T.rural + 0.4, T.q - 0.2, shot([-98.6, 30.0], 120, 0.5, 0.95), shot([-98.4, 30.2], 100, 0.95, 1.0)],
  [T.q + 0.3, T_END, shot(TXC, 165, 0.3, 0.55), shot(TXC, 200, 0.1, 0.5)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) return lerpShot(A, B, esin(span(t, a, b)));
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = HOLDS[i][3], N = nx[2], u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u) * clamp(d / 40, 0, 1); return lerpShot(E, N, u, d * 0.5); } }
  return HOLDS[HOLDS.length - 1][3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.6, s.h * 7.0); return s; }
// ---- props ----
let PR = null;
function countyLookup() { const cv = usMesh.material.uniforms.tId.value.image, d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  return (lon, lat) => { const x = Math.floor((lon - UB.lon0) / (UB.lon1 - UB.lon0) * cv.width), y = Math.floor((UB.lat1 - lat) / (UB.lat1 - UB.lat0) * cv.height); const k = d[(y * cv.width + x) * 4 + 2]; const c = COUNTIES.find(q => q.id === k); return c ? c.name : ''; }; }
async function texasShape() { const us = await fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()); const f = topojson.feature(us, us.objects.states).features.find(q => q.properties.name === 'Texas');
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = 0; for (const p of polys) { if (p[0].length > ba) { ba = p[0].length; best = p[0]; } } return best.filter((_, i) => i % 3 === 0); }
function buildProps(ring) { const P = {}; const c0 = llPos(TXC[0], TXC[1]);
  // the coin: red face up, blue face (mirrored N–S) underneath; flipping it about x shows blue in the right orientation
  const mk = (sign) => new THREE.Shape(ring.map(([lon, lat]) => { const p = ll2xz(lon, lat).sub(c0); return new THREE.Vector2(p.x, sign * p.z); }));
  P.coin = new THREE.Group(); const red = new THREE.Mesh(new THREE.ExtrudeGeometry(mk(-1), { depth: 1.2, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 0, 0), [new THREE.MeshStandardMaterial({ color: RED, roughness: 0.45, emissive: RED, emissiveIntensity: 0.15 }), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 })]);
  red.position.y = -0.6; P.coin.add(red); const blue = new THREE.Mesh(new THREE.ShapeGeometry(mk(1)).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.45, emissive: BLUE, emissiveIntensity: 0.15 })); blue.position.y = -0.62; P.coin.add(blue);
  P.coin.position.copy(c0); MAPSC.add(P.coin);
  // 3D vote bars in the Gulf
  const bar = (col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 })); m.visible = false; MAPSC.add(m); return m; };
  P.bR = bar(RED); P.bB = bar(BLUE);
  // suburbs: little houses scattered in the four DFW counties + Williamson
  const look = countyLookup(); const houses = []; const want = ['Collin', 'Denton', 'Tarrant', 'Kaufman', 'Williamson']; let tries = 0;
  while (houses.length < 420 && tries++ < 20000) { const lon = R(-98.2, -95.9), lat = R(30.2, 33.45); const n = look(lon, lat); if (want.includes(n)) houses.push({ p: llPos(lon, lat), n, ph: rnd(), ry: R(0, 3) }); }
  P.houses = houses; const hg = mergeGeometries([new THREE.BoxGeometry(1, 0.7, 1).translate(0, 0.35, 0), new THREE.ConeGeometry(0.85, 0.55, 4).rotateY(Math.PI / 4).translate(0, 0.97, 0)]);
  P.hMesh = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, flatShading: true }), houses.length); P.hMesh.frustumCulled = false; MAPSC.add(P.hMesh);
  houses.forEach((h, i) => P.hMesh.setColorAt(i, new THREE.Color(rnd() < 0.5 ? '#f2efe6' : '#dfe7f2')));
  // ballots raining onto the Rio Grande Valley
  const ballots = []; tries = 0; const rgv = ['Hidalgo', 'Cameron', 'Starr', 'Willacy'];
  while (ballots.length < 360 && tries++ < 20000) { const lon = R(-99.2, -97.1), lat = R(25.85, 27.0); if (rgv.includes(look(lon, lat))) ballots.push({ p: llPos(lon, lat), ph: rnd(), ry: R(0, 6) }); }
  P.ballots = ballots; P.bMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.25 }), ballots.length); P.bMesh.frustumCulled = false; MAPSC.add(P.bMesh);
  // White House at DC for "timing"
  P.whP = llPos(-77.04, 38.9); return P; }
const PL = { dc: [-77.04, 38.9] };
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
function mapAt(t) { const P = PR; clearPaint(); mapUni.uCty.value = 0;
  // ---- the coin flip ----
  { const on = t < T.blue + 1.15; P.coin.visible = on; if (on) { const k = ease(span(t, T.blue - 0.05, T.blue + 0.5)); const land = ease(span(t, T.blue + 0.55, T.blue + 0.95));
      P.coin.rotation.set(Math.PI * k + 0.08 * Math.sin(t * 3) * (1 - k), 0, 0.05 * Math.sin(t * 2.1)); P.coin.position.y = lerp(9 + 0.8 * Math.sin(t * 2.4) + 6 * Math.sin(Math.PI * k), 1.0, land); } }
  const txBlue = (t >= T.blue + 0.9 && t < T.years + 0.3) || t >= T.later + 0.6;
  if (t >= T.r2 - 0.3) { if (t < T.rural - 0.3) paintState('Texas', BLUE, 0.18, 0.3); }
  else if (t >= T.blue + 0.9) paintState('Texas', txBlue ? BLUE : RED, txBlue ? 0.85 : 0.7, 0.8 * (txBlue ? easeOut(span(t, t < T.years + 0.3 ? T.blue + 0.9 : T.later + 0.6, (t < T.years + 0.3 ? T.blue + 0.9 : T.later + 0.6) + 0.4)) : 0.6));
  // ---- vote bars: 2024 (R 56 / D 42) → 2026 (D 55 / R 43) ----
  { const vis = t >= T.y2024 && t < T.r1 + 0.3, g = easeOut(span(t, T.y2024 + 0.1, T.y2024 + 1.0)), m = ease(span(t, T.later + 0.2, T.later + 1.0)), out = 1 - smooth(T.r1 - 0.2, T.r1 + 0.3, t);
    const r = lerp(56.1, 43.0, m), d = lerp(42.5, 55.1, m), base = llPos(-95.0, 27.6); P.bR.visible = P.bB.visible = vis;
    if (vis) { P.bR.position.copy(base).add(V3(-4.5, 0, 0)); P.bB.position.copy(base).add(V3(4.5, 0, 0)); P.bR.scale.set(7, Math.max(0.01, r * 0.75 * g * out), 7); P.bB.scale.set(7, Math.max(0.01, d * 0.75 * g * out), 7); } }
  // ---- reason 1: Austin area glow (state capital) ----
  if (t >= T.r1 && t < T.r2) paintCounty('Travis', GOLD, 0.5, 0.6);
  // ---- reason 2: the suburbs ----
  const sub = [['Collin', T.collin], ['Denton', T.denton], ['Tarrant', T.tarrant], ['Kaufman', T.kaufman], ['Williamson', T.williamson]];
  if (t >= T.r2 - 0.3 && t < T.r3) { mapUni.uCty.value = smooth(T.r2 - 0.3, T.r2 + 0.3, t); paintCounty('Dallas', BLUE, 0.35, 0.3);
    sub.forEach(([n, a]) => { if (t >= a) { const k = easeOut(span(t, a, a + 0.35)); paintCounty(n, BLUE, 0.9 * k, 1.4 * k - 0.4 * smooth(a + 0.35, a + 0.8, t)); } else if (n !== 'Williamson') paintCounty(n, RED, 0.45, 0.3); }); }
  { const on = t >= T.r2 && t < T.r3 + 0.3; P.hMesh.visible = on; if (on) { P.houses.forEach((h, i) => { const a = sub.find(s => s[0] === h.n)[1] + h.ph * 0.6; const k = pop(t, a, 0.3) * (1 - smooth(T.r3, T.r3 + 0.3, t)); const lift = 1.0;
      s4.setScalar(0.3 * Math.max(0.001, t >= a ? k : 0.001)); q4.setFromEuler(e4.set(0, h.ry, 0)); m4.compose(V3(h.p.x, lift + 1.7, h.p.z), q4, s4); P.hMesh.setMatrixAt(i, m4); }); P.hMesh.instanceMatrix.needsUpdate = true; } }
  // ---- reason 3: the Valley ----
  if (t >= T.r3 - 0.3 && t < T.r4) { mapUni.uCty.value = smooth(T.r3 - 0.3, T.r3 + 0.3, t); const sw = easeOut(span(t, T.swung, T.swung + 0.4));
    ['Hidalgo', 'Cameron', 'Starr', 'Willacy'].forEach((n, i) => { const a = T.valley + 0.9 + i * 0.12; if (t < T.swung) paintCounty(n, RED, 0.75 * smooth(a, a + 0.25, t), 0.8 * smooth(a, a + 0.25, t)); else paintCounty(n, BLUE, 0.9, 0.8 + 0.6 * sw - 0.3 * smooth(T.swung + 0.4, T.swung + 0.9, t)); }); }
  { const on = t >= T.thistime - 0.2 && t < T.r4 + 0.2; P.bMesh.visible = on; if (on) { P.ballots.forEach((b, i) => { const a = T.thistime - 0.2 + b.ph * 2.4, k = span(t, a, a + 0.8), y = lerp(30, 2.6 + 0.08 * (i % 7), easeOut(k)); const sc = t < a ? 0.001 : 1.0 * (1 - smooth(T.r4 - 0.1, T.r4 + 0.2, t)) + 0.001;
      s4.setScalar(sc); q4.setFromEuler(e4.set(0.6 * (1 - k) * Math.sin(i), b.ry + 3 * (1 - k), 0.5 * (1 - k))); m4.compose(V3(b.p.x, y, b.p.z), q4, s4); P.bMesh.setMatrixAt(i, m4); }); P.bMesh.instanceMatrix.needsUpdate = true; } }
  // ---- reason 4: Washington ----
  WH.visible = t >= T.r4 && t < T.rural; if (WH.visible) { const k = easeOut(span(t, T.r4 + 0.5, T.r4 + 1.1)); WH.position.copy(P.whP).setY(0.3 + 6 * (1 - k)); WH.scale.setScalar(1.9 * k + 0.01); WH.rotation.y = 0; paintState('District of Columbia', GOLD, 0.9, 0.6); }
  // ---- rural red vs metro blue, metros rise with population ----
  if (t >= T.rural - 0.3) { mapUni.uCty.value = smooth(T.rural - 0.3, T.rural + 0.3, t); const rk = smooth(T.rural, T.rural + 0.5, t), mk = easeOut(span(t, T.forty - 0.3, T.forty + 0.8)), pk = easeOut(span(t, T.cities, T.cities + 1.2));
    COUNTIES.forEach(c => { if (!(c.name in METRO)) paintCounty(c.name, RED, 0.85 * rk, 0.25 * rk); });
    for (const [n, pop] of Object.entries(METRO)) paintCounty(n, mk > 0.01 ? BLUE : RED, mk > 0.01 ? 0.95 * mk + 0.85 * (1 - mk) : 0.85 * rk, 0.25 + 1.0 * mk + 7.5 * Math.sqrt(pop) * pk); }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { talarico: ['James Talarico', 'SENATOR-ELECT (D)'], hinojosa: ['Gina Hinojosa', 'GOVERNOR-ELECT (D)'], abbott: ['Greg Abbott', 'GOVERNOR (R)'], paxton: ['Ken Paxton', 'REPUBLICAN NOMINEE'],
  cornyn: ['John Cornyn', 'U.S. SENATOR (R)'], trump: ['Donald Trump', 'PRESIDENT'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
function hudAt(t) {
  if (t < T.years) return ['MIDTERMS 2026 · TEXAS', t < T.blue ? 'WHY TEXAS' : 'TURNED BLUE', t < T.blue ? 'A RED STATE FOR DECADES' : 'SENATE + GOVERNOR'];
  if (t < T.y2024) return ['TEXAS · STATEWIDE RACES', t < T.years + 0.3 ? '0 YEARS' : `${cnt(t, T.years + 0.3, T.years + 1.6, 32)} YEARS`, t < T.senator ? 'WITHOUT A DEMOCRATIC WIN · 1994–2026' : 'LAST DEM SENATOR ELECTED: 1988'];
  if (t < T.r1) return ['2024 → 2026', t < T.later ? 'TRUMP +14' : t < T.gina ? 'TALARICO +12' : 'HINOJOSA WINS', t < T.later ? 'PRESIDENT · 2024' : t < T.gina ? 'U.S. SENATE · A 26-POINT SWING' : 'GOVERNOR · BEAT GREG ABBOTT'];
  if (t < T.r2) return ['REASON 1', 'THE OPPONENT', t < T.impeached ? 'PAXTON BEAT SEN. CORNYN IN THE PRIMARY' : t < T.bush ? 'IMPEACHED BY THE TEXAS HOUSE · 2023' : 'TWO BUSH FAMILY MEMBERS BACKED TALARICO'];
  if (t < T.r3) return ['REASON 2', 'THE SUBURBS', t < T.austin ? `${[T.collin, T.denton, T.tarrant, T.kaufman].filter(a => t >= a).length} DALLAS-AREA COUNTIES FLIPPED` : 'WILLIAMSON · BLUE BY ~20 POINTS'];
  if (t < T.r4) return ['REASON 3', t < T.jumped - 0.3 ? 'LATINO VOTERS' : `+${cnt(t, T.jumped - 0.3, T.jumped + 0.9, 38)}% TURNOUT`, t < T.thistime ? 'TRUMP WON ALL 4 VALLEY COUNTIES IN 2024' : `${fmt(233000 + cnt(t, T.jumped - 0.3, T.jumped + 0.9, 89000))} BALLOTS · RIO GRANDE VALLEY`];
  if (t < T.rural) return ['REASON 4', 'TIMING', t < T.midterms ? 'TWO YEARS INTO TRUMP’S SECOND TERM' : 'MIDTERMS PUNISH THE PRESIDENT’S PARTY'];
  if (t < T.q) return ['RURAL VS. METRO', t < T.forty - 0.2 ? 'RURAL: RED' : `${cnt(t, T.forty - 0.2, T.forty + 0.8, 40)} / 254`, t < T.forty - 0.2 ? 'PAXTON WON MOST COUNTIES' : t < T.cities ? 'COUNTIES WON BY TALARICO' : 'BUT THAT’S WHERE THE PEOPLE ARE'];
  return null; }
function domAt(t) { const P = PR; let h = '';
  h += card('talarico', T.talarico - 0.05, T.r1, 110, 640, t, { tag: t >= T.later + 0.6 ? 'WON' : '', tagc: 'b', tagT: T.talarico + 0.4 });
  h += card('hinojosa', T.gina - 0.05, T.r1, 650, 660, t, { small: true, tag: 'WON', tagc: 'b', tagT: T.abbott });
  h += card('paxton', T.paxton - 0.05, T.r2, 110, 640, t, { tag: t >= T.impeached ? 'IMPEACHED 2023' : '', tagc: 'r', tagT: T.impeached });
  h += card('cornyn', T.cornyn - 0.05, T.impeached - 0.05, 650, 660, t, { small: true, dim: true, tag: 'LOST PRIMARY', tagc: 'r', tagT: T.cornyn + 0.25 });
  h += card('talarico', T.bush - 0.1, T.r2, 650, 660, t, { small: true, quote: '+ BUSH FAMILY', qT: T.bush + 0.15 });
  h += card('trump', wordT('Trump', T.valley) - 0.05, T.thistime, 650, 660, t, { small: true, quote: 'WON ALL 4 · 2024', qT: wordT('Trump', T.valley) + 0.3 });
  h += card('trump', T.r4 + 0.2, T.rural, 110, 640, t, { tag: 'YEAR 2 OF TERM 2', tagc: 'r', tagT: wordT('frustrated', T.midterms) });
  if (P) {
    if (t >= T.y2024 + 0.5 && t < T.r1) { const m = ease(span(t, T.later + 0.2, T.later + 1.0)); h += sticker(t < T.later + 0.6 ? 'TRUMP 56%' : 'PAXTON 43%', P.bR.position.clone().setY(P.bR.scale.y + 2), t, T.y2024 + 0.5, 'r sm'); h += sticker(t < T.later + 0.6 ? 'HARRIS 42%' : 'TALARICO 55%', P.bB.position.clone().setY(P.bB.scale.y + 2), t, T.y2024 + 0.6, 'b sm'); }
    if (t >= T.r1 + 0.6 && t < T.r2) h += sticker('AUSTIN · STATE CAPITOL', cyPos('Travis', 3), t, T.r1 + 0.6, 'sm w');
    if (t >= T.r2 && t < T.r3) { for (const [n, a] of [['Collin', T.collin], ['Denton', T.denton], ['Tarrant', T.tarrant], ['Kaufman', T.kaufman]]) h += sticker(n.toUpperCase(), cyPos(n, 3), t, a, 'b sm');
      if (t < T.austin) h += sticker('DALLAS', cyPos('Dallas', 2), t, T.r2 + 0.3, 'sm w'); else h += sticker('WILLIAMSON · ~+20', cyPos('Williamson', 3), t, T.williamson, 'b'); }
    if (t >= T.valley + 0.9 && t < T.r4) h += sticker(t < T.swung ? 'RIO GRANDE VALLEY · TRUMP 2024' : 'RIO GRANDE VALLEY · SWUNG BACK', cyPos('Hidalgo', 6), t, t < T.swung ? T.valley + 0.9 : T.swung, t < T.swung ? 'r' : 'b');
    if (t >= T.r4 + 1.0 && t < T.rural) h += sticker('WHITE HOUSE', P.whP.clone().setY(10), t, T.r4 + 1.0, 'sm w');
    if (t >= T.cities + 0.4 && t < T.q) { for (const [n, lbl] of [['Harris', 'HOUSTON'], ['Dallas', 'DALLAS'], ['Bexar', 'SAN ANTONIO'], ['Travis', 'AUSTIN']]) h += sticker(lbl, cyPos(n, 4 + 7.5 * Math.sqrt(METRO[n])), t, T.cities + 0.4, 'b sm'); }
  }
  if (t >= T.impeached && t < T.bush) h += `<div class="stamp" style="font-size:110px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.impeached, T.impeached + 0.18)))).toFixed(3)})">IMPEACHED</div>`;
  if (t >= T.q - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.q - 0.1, T.q + 0.2, t)};transform:scale(${pop(t, T.q - 0.1, 0.35).toFixed(3)})">Blue <span class="hl">for good?</span><br>👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.blue, T.years, T.y2024, T.later, T.gina, T.r1, T.impeached, T.r2, T.collin, T.denton, T.tarrant, T.kaufman, T.austin, T.r3, T.thistime, T.r4, T.rural, T.forty]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render (motion blur during flights) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.blue + 0.9, T.impeached]) f = Math.max(f, 1 - Math.abs(t - k - 0.05) / 0.15); return Math.max(0, f); }
window.renderAt = (t) => { mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.6 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; PR = buildProps(await texasShape()); await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
