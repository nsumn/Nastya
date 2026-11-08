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
const SENT = [0.0, 3.948, 4.633, 6.363, 8.024, 10.51, 11.671, 17.442, 19.114, 23.63, 24.896, 27.45, 30.875, 31.85, 35.868, 37.692, 41.639, 43.23, 49.847, 55.921, 57.465];
const WORDS = [[0.0, 0.639, "Seven"], [0.743, 1.149, "states"], [1.289, 1.579, "just"], [1.637, 1.846, "took"], [1.904, 1.997, "the"], [2.067, 2.438, "Senate"], [2.496, 2.961, "away"], [3.019, 3.204, "from"], [3.274, 3.808, "Trump."], [3.948, 4.168, "Here"], [4.215, 4.342, "they"], [4.4, 4.586, "are."], [4.633, 4.923, "Number"], [4.993, 5.41, "seven:"], [5.515, 6.223, "Ohio."], [6.363, 6.758, "Sherrod"], [6.816, 7.187, "Brown"], [7.257, 7.419, "is"], [7.489, 7.884, "back."], [8.024, 8.164, "He"], [8.268, 8.442, "beat"], [8.5, 8.872, "Senator"], [8.942, 9.185, "Jon"], [9.243, 9.592, "Husted"], [9.65, 9.812, "by"], [9.894, 10.37, "five."], [10.51, 11.056, "Six:"], [11.137, 11.613, "Iowa."], [11.671, 12.008, "Josh"], [12.066, 12.414, "Turek"], [12.495, 12.611, "won"], [12.669, 12.728, "an"], [12.809, 13.111, "open"], [13.169, 13.366, "seat"], [13.424, 13.587, "by"], [13.668, 14.109, "four,"], [14.249, 14.353, "the"], [14.411, 14.736, "state's"], [14.794, 15.061, "first"], [15.108, 15.607, "Democratic"], [15.653, 16.013, "senator"], [16.071, 16.315, "since"], [16.35, 17.302, "2008."], [17.442, 17.952, "Five:"], [18.011, 18.289, "South"], [18.336, 18.974, "Carolina."], [19.114, 19.845, "Pediatrician"], [19.95, 20.275, "Annie"], [20.333, 20.786, "Andrews"], [20.844, 20.983, "won"], [21.041, 21.145, "by"], [21.203, 21.401, "four"], [21.436, 21.505, "and"], [21.54, 21.563, "a"], [21.621, 21.865, "half,"], [21.888, 21.993, "the"], [22.051, 22.388, "state's"], [22.457, 22.748, "first"], [22.806, 23.096, "woman"], [23.154, 23.572, "senator."], [23.63, 24.013, "Four:"], [24.118, 24.756, "Kansas."], [24.896, 25.209, "Adam"], [25.267, 25.708, "Hamilton"], [25.766, 25.964, "beat"], [26.022, 26.37, "Senator"], [26.428, 26.742, "Roger"], [26.8, 27.311, "Marshall."], [27.45, 27.845, "Kansas"], [27.903, 28.17, "hadn't"], [28.216, 28.414, "sent"], [28.46, 28.483, "a"], [28.541, 28.982, "Democrat"], [29.028, 29.075, "to"], [29.133, 29.203, "the"], [29.249, 29.551, "Senate"], [29.586, 29.655, "in"], [29.713, 30.027, "nearly"], [30.085, 30.108, "a"], [30.166, 30.735, "century."], [30.875, 31.351, "Three:"], [31.42, 31.815, "Maine."], [31.85, 32.163, "Troy"], [32.221, 32.686, "Jackson"], [32.825, 33.15, "ended"], [33.197, 33.475, "Susan"], [33.533, 34.009, "Collins's"], [34.067, 34.601, "thirty-year"], [34.659, 34.985, "run,"], [35.043, 35.252, "by"], [35.333, 35.728, "seven."], [35.868, 36.367, "Two:"], [36.507, 36.82, "North"], [36.879, 37.552, "Carolina."], [37.692, 37.947, "Roy"], [38.005, 38.284, "Cooper"], [38.342, 38.481, "won"], [38.539, 38.644, "by"], [38.702, 38.98, "almost"], [39.015, 39.514, "twenty,"], [39.654, 39.781, "the"], [39.886, 40.246, "biggest"], [40.304, 40.641, "margin"], [40.722, 40.838, "of"], [40.908, 41.117, "all"], [41.186, 41.581, "seven."], [41.639, 41.813, "And"], [41.871, 42.115, "number"], [42.185, 42.394, "one:"], [42.44, 43.09, "Texas."], [43.23, 43.578, "James"], [43.636, 44.216, "Talarico"], [44.332, 44.553, "beat"], [44.623, 44.855, "Ken"], [44.936, 45.435, "Paxton"], [45.493, 45.633, "by"], [45.691, 46.237, "twelve,"], [46.341, 46.434, "the"], [46.48, 46.689, "first"], [46.736, 47.154, "Democrat"], [47.2, 47.258, "to"], [47.316, 47.467, "win"], [47.525, 47.874, "Texas"], [47.92, 48.524, "statewide"], [48.559, 48.651, "in"], [48.756, 49.325, "thirty-two"], [49.394, 49.789, "years."], [49.847, 50.068, "Add"], [50.091, 50.161, "it"], [50.219, 50.521, "up:"], [50.661, 51.195, "Democrats"], [51.253, 51.416, "now"], [51.486, 51.683, "hold"], [51.729, 51.788, "at"], [51.822, 52.008, "least"], [52.078, 52.635, "fifty-four"], [52.693, 53.088, "seats,"], [53.192, 53.343, "and"], [53.401, 53.831, "Alaska"], [53.889, 53.97, "and"], [54.028, 54.597, "Mississippi"], [54.678, 54.818, "are"], [54.876, 55.154, "still"], [55.224, 55.781, "counting."], [55.921, 56.141, "Which"], [56.176, 56.385, "flip"], [56.432, 56.803, "surprised"], [56.826, 56.908, "you"], [56.966, 57.384, "most?"], [57.465, 57.79, "Comment"], [57.825, 58.487, "below."]];
const VO_END = 58.513;
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
// =================== "The 7 states that flipped the Senate" (Nov 8 2026) — countdown 7 → 1, camera hops state to state ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a';
const S = SENT;
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 5.2;
// [state, rank, section start, winner photo key, winner, D %, R %, loser, fact, camera height, bar offset (lon, lat)]
const SEVEN = [['Ohio', 7, S[2], 'brown', 'Sherrod Brown', 50.0, 45.2, 'Jon Husted', 'BACK IN THE SENATE', 72, [3.4, 0.4]],
  ['Iowa', 6, S[5], 'turek', 'Josh Turek', 50.5, 46.4, 'Ashley Hinson', 'FIRST DEM SENATOR SINCE 2008', 72, [4.2, 0.2]],
  ['South Carolina', 5, S[7], 'andrews', 'Annie Andrews', 51.1, 46.6, 'Darline Graham', 'FIRST WOMAN SENATOR', 66, [3.2, -1.0]],
  ['Kansas', 4, S[9], 'hamilton', 'Adam Hamilton', 51.0, 46.0, 'Roger Marshall', 'FIRST DEM IN ~100 YEARS', 82, [4.6, -0.6]],
  ['Maine', 3, S[12], 'jackson', 'Troy Jackson', 53.4, 46.5, 'Susan Collins', 'ENDS COLLINS’S 30-YEAR RUN', 74, [3.4, -1.6]],
  ['North Carolina', 2, S[14], 'cooper', 'Roy Cooper', 58.7, 39.1, 'Michael Whatley', 'BIGGEST MARGIN: +20', 84, [4.4, -1.6]],
  ['Texas', 1, S[16], 'talarico', 'James Talarico', 55.1, 43.0, 'Ken Paxton', 'FIRST STATEWIDE WIN IN 32 YEARS', 150, [8.5, -3.5]]].map(a => ({ st: a[0], n: a[1], t0: a[2], key: a[3], win: a[4], d: a[5], r: a[6], opp: a[7], fact: a[8], h: a[9], bo: a[10] }));
SEVEN.forEach((s, i) => { s.t1 = i < 6 ? SEVEN[i + 1].t0 : S[18]; s.flip = wordT(s.win.split(' ')[0], s.t0); s.factT = Math.min(s.t1 - 1.2, s.flip + 2.2); });
const T = { add: S[18], fifty: wordT('fifty-four', S[18]), alaska: wordT('Alaska', S[18]), q: S[19] };
const CUES = [[0.05, 'whoosh', 0.5], ...SEVEN.flatMap((s, i) => [[0.4 + i * 0.42, 'pop', 0.35]]), ...SEVEN.flatMap(s => [[s.t0 - 0.35, 'whoosh', 0.55], [s.flip, 'flip', 0.7], [s.flip + 0.4, 'rise', 0.45]]), [T.add - 0.3, 'whoosh', 0.6], [T.fifty, 'thud', 0.7], [T.q, 'pop', 0.5], [ENDC, 'thud', 0.5]];
// ---- camera ----
const CEN = (st) => { const s = ST(st); return [s.lon, s.lat]; };
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { const H = [[0, SEVEN[0].t0 - 0.5, shot([-92, 37.5], 470, 0, 0.3), shot([-91, 37.5], 420, 0.05, 0.34)]];
  SEVEN.forEach((s, i) => { const c = CEN(s.st), cc = [c[0] + s.bo[0] * 0.2, c[1] - 0.9]; const y0 = (i % 2 ? -1 : 1) * 0.35;
    H.push([s.t0 + 0.45, s.t1 - 0.45, shot(cc, s.h * 1.1, y0, 0.55), shot(cc, s.h * 0.9, y0 + (i % 2 ? 0.45 : -0.45), 0.62)]); });
  H.push([T.add + 0.6, T_END, shot([-95, 39], 520, 0, 0.3), shot([-95, 39], 470, 0.06, 0.33)]); return H; }
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
async function texasShape() { const us = await fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()); const f = topojson.feature(us, us.objects.states).features.find(q => q.properties.name === 'Texas');
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = 0; for (const p of polys) { if (p[0].length > ba) { ba = p[0].length; best = p[0]; } } return best.filter((_, i) => i % 3 === 0); }
// ---- the Capitol (white, low-poly) on Washington, D.C. ----
const CAP = new THREE.Group(); MAPSC.add(CAP);
{ const wm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.5, flatShading: true });
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, wm); m.position.set(x, y, z); CAP.add(m); return m; };
  add(new THREE.BoxGeometry(9, 1.6, 2.4), 0, 0.8, 0); add(new THREE.BoxGeometry(3, 2.2, 2.8), 0, 1.1, 0); add(new THREE.CylinderGeometry(1.3, 1.4, 1.6, 16), 0, 2.9, 0);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), Math.cos(a) * 1.45, 2.8, Math.sin(a) * 1.45); }
  add(new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.6, 0).scale.y = 1.25; add(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10), 0, 5.4, 0); add(new THREE.SphereGeometry(0.16, 8, 6), 0, 6.0, 0);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), sx * (1.8 + k * 0.5), 0.9, 1.25); CAP.visible = false; }

function buildProps(ring) { const P = {}; const tc = CEN('Texas'), c0 = llPos(tc[0], tc[1]);
  const mk = (sign) => new THREE.Shape(ring.map(([lon, lat]) => { const p = ll2xz(lon, lat).sub(c0); return new THREE.Vector2(p.x, sign * p.z); }));
  P.coin = new THREE.Group(); const red = new THREE.Mesh(new THREE.ExtrudeGeometry(mk(-1), { depth: 1.2, bevelEnabled: false }).rotateX(-Math.PI / 2), [new THREE.MeshStandardMaterial({ color: RED, roughness: 0.45, emissive: RED, emissiveIntensity: 0.15 }), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 })]);
  red.position.y = -0.6; P.coin.add(red); const blue = new THREE.Mesh(new THREE.ShapeGeometry(mk(1)).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.45, emissive: BLUE, emissiveIntensity: 0.15 })); blue.position.y = -0.62; P.coin.add(blue);
  P.coin.position.copy(c0); P.coin.visible = false; MAPSC.add(P.coin);
  const bar = (col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 })); m.visible = false; MAPSC.add(m); return m; };
  P.bD = bar(BLUE); P.bR = bar(RED); return P; }
const BASE = (s) => { const c = CEN(s.st); return llPos(c[0] + s.bo[0] * 0.45, c[1] + s.bo[1] * 0.45 - 0.6); };
function mapAt(t) { const P = PR; clearPaint();
  // intro: the seven light up one after another; later each flips on its winner's name and stays blue
  SEVEN.forEach((s, i) => { const a = 0.4 + i * 0.42;
    if (t < SEVEN[0].t0 - 0.3) { const k = easeOut(span(t, a, a + 0.3)); paintState(s.st, BLUE, 0.85 * k, 1.6 * k - 0.6 * smooth(a + 0.3, a + 0.7, t)); return; }
    if (t < s.t0 - 0.3) return;
    if (t < s.flip) { paintState(s.st, RED, 0.75 * smooth(s.t0 - 0.3, s.t0 + 0.2, t), 0.6); return; }
    const k = easeOut(span(t, s.flip, s.flip + 0.35)); const cur = t < s.t1; paintState(s.st, BLUE, 0.9, cur ? 0.6 + 1.6 * k - 0.6 * smooth(s.flip + 0.35, s.flip + 0.8, t) : (t >= T.add ? 0.6 + 0.6 * easeOut(span(t, T.add + 0.4 + i * 0.12, T.add + 0.8 + i * 0.12)) : 0.5)); });
  if (t >= T.alaska - 0.2 && t < ENDC + 0.5) { const pl = 0.45 + 0.25 * Math.sin(t * 6); paintState('Mississippi', GREY, pl, 0.6); paintState('Alaska', GREY, pl, 0.6); }
  // vote bars for the current state
  const cur = SEVEN.find(s => t >= s.t0 && t < s.t1); P.bD.visible = P.bR.visible = !!cur;
  if (cur) { const g = easeOut(span(t, cur.flip + 0.1, cur.flip + 1.0)), out = 1 - smooth(cur.t1 - 0.5, cur.t1 - 0.1, t), sc = cur.h / 72 * 0.2, b = BASE(cur), w = 2.2 * cur.h / 72;
    P.bD.position.copy(b).add(V3(-w * 0.6, 0, 0)); P.bR.position.copy(b).add(V3(w * 0.6, 0, 0)); P.bD.scale.set(w, Math.max(0.01, cur.d * sc * g * out), w); P.bR.scale.set(w, Math.max(0.01, cur.r * sc * g * out), w); }
  // Texas coin
  { const s = SEVEN[6], on = t >= s.t0 - 0.2 && t < s.flip + 1.2; P.coin.visible = on; if (on) { const k = ease(span(t, s.flip - 0.2, s.flip + 0.35)); const land = ease(span(t, s.flip + 0.4, s.flip + 0.9));
      P.coin.rotation.set(Math.PI * k, 0, 0.05 * Math.sin(t * 2.1)); P.coin.position.y = lerp(9 + 0.8 * Math.sin(t * 2.4) + 6 * Math.sin(Math.PI * k), 1.0, land); if (t < s.flip + 0.9) paintState('Texas', RED, 0, 0); } }
  // the Capitol for the tally
  CAP.visible = t >= T.add; if (CAP.visible) { const k = easeOut(span(t, T.add + 0.6, T.add + 1.4)); CAP.position.copy(stPos('District of Columbia', 0.8 + 10 * (1 - k))); CAP.scale.setScalar(3.2 * k + 0.01); CAP.rotation.y = 0.3; }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { brown: ['Sherrod Brown', 'OHIO · D'], turek: ['Josh Turek', 'IOWA · D'], andrews: ['Annie Andrews', 'SOUTH CAROLINA · D'], hamilton: ['Adam Hamilton', 'KANSAS · D'], jackson: ['Troy Jackson', 'MAINE · D'],
  cooper: ['Roy Cooper', 'NORTH CAROLINA · D'], talarico: ['James Talarico', 'TEXAS · D'], collins: ['Susan Collins', 'SINCE 1997 · R'], paxton: ['Ken Paxton', 'TEXAS · R'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
function hudAt(t) { if (t < SEVEN[0].t0) return ['MIDTERMS 2026 · U.S. SENATE', `${Math.min(7, Math.floor(span(t, 0.4, 0.4 + 7 * 0.42) * 7 + (t >= 0.4 ? 1 : 0)))} FLIPS`, 'REPUBLICAN → DEMOCRAT'];
  const s = SEVEN.find(q => t >= q.t0 && t < q.t1); if (s) return [`#${s.n} · ${s.st.toUpperCase()}`, t < s.flip + 0.3 ? s.st.toUpperCase() : `D +${(s.d - s.r).toFixed(1).replace('.0', '')}`, t < s.factT ? `${s.win.toUpperCase()} ${s.d}% · ${s.opp.toUpperCase()} ${s.r}%` : s.fact];
  if (t < T.q) return ['U.S. SENATE · FROM JANUARY', t < T.fifty ? '7 FLIPS' : '54 · 44', t < T.alaska ? 'DEMOCRATS · REPUBLICANS' : 'ALASKA & MISSISSIPPI STILL COUNTING'];
  return null; }
function domAt(t) { const P = PR; let h = '';
  for (const s of SEVEN) { h += card(s.key, s.flip - 0.05, s.t1 - 0.15, 110, 650, t, { tag: 'FLIPPED', tagc: 'b', tagT: s.flip + 0.3 });
    if (t >= s.t0 - 0.1 && t < s.t1 - 0.2) { const k = pop(t, s.t0 - 0.1, 0.35); h += `<div class="rank" style="transform:translate(-50%,0) scale(${k.toFixed(3)}) rotate(-6deg);opacity:${(1 - smooth(s.t1 - 0.45, s.t1 - 0.2, t)).toFixed(2)}">#${s.n}</div>`; }
    if (P && t >= s.flip + 0.5 && t < s.t1 - 0.2 && P.bD.visible) { h += sticker(`${s.win.split(' ').pop().toUpperCase()} ${s.d}%`, P.bD.position.clone().setY(P.bD.scale.y + 1.5 * s.h / 72), t, s.flip + 0.6, 'b sm'); h += sticker(`${s.opp.split(' ').pop().toUpperCase()} ${s.r}%`, P.bR.position.clone().setY(P.bR.scale.y + 1.5 * s.h / 72), t, s.flip + 0.7, 'r sm'); }
  }
  h += card('collins', wordT('Susan', SEVEN[4].t0) - 0.05, SEVEN[4].t1 - 0.15, 650, 830, t, { small: true, dim: true, tag: '30 YRS → OUT', tagc: 'r', tagT: wordT('run', SEVEN[4].t0) });
  h += card('paxton', wordT('Ken', SEVEN[6].t0) - 0.05, SEVEN[6].t1 - 0.15, 650, 830, t, { small: true, dim: true });
  if (t >= T.add + 0.8 && t < ENDC) SEVEN.forEach((s, i) => { h += sticker(`#${s.n}`, stPos(s.st, 8), t, T.add + 0.8 + i * 0.12, 'b sm'); });
  if (t >= T.q - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.q - 0.1, T.q + 0.2, t)};transform:scale(${pop(t, T.q - 0.1, 0.35).toFixed(3)})">Which flip<br><span class="hl">surprised you?</span> 👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [...SEVEN.flatMap(s => [s.t0, s.flip + 0.3, s.factT]), T.add, T.fifty]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render (motion blur during flights) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const s of SEVEN) f = Math.max(f, 1 - Math.abs(t - s.flip - 0.05) / 0.14); return Math.max(0, f) * 0.6; }
window.renderAt = (t) => { mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; PR = buildProps(await texasShape()); await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
