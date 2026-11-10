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
const SENT = [0.0, 2.426, 10.522, 15.945, 21.473, 25.305, 30.928, 34.238, 37.408, 42.354, 47.823, 54.024];
const WORDS = [[0.0, 0.325, "Here's"], [0.36, 0.488, "what"], [0.546, 0.871, "happened"], [0.906, 0.964, "in"], [1.022, 1.091, "the"], [1.149, 1.393, "last"], [1.428, 2.009, "24"], [2.067, 2.368, "hours."], [2.426, 3.1, "Republican"], [3.158, 3.506, "Thomas"], [3.587, 4.122, "Massie"], [4.262, 4.703, "filed"], [4.842, 5.133, "eight"], [5.202, 5.702, "articles"], [5.748, 5.806, "of"], [5.864, 6.387, "impeachment"], [6.445, 6.805, "against"], [6.839, 7.199, "Defense"], [7.234, 7.791, "Secretary"], [7.896, 8.209, "Pete"], [8.267, 8.86, "Hegseth,"], [9.0, 9.29, "over"], [9.348, 9.418, "the"], [9.476, 9.685, "war"], [9.743, 9.894, "with"], [9.94, 10.382, "Iran."], [10.522, 10.65, "The"], [10.708, 10.928, "House"], [10.963, 11.114, "has"], [11.161, 11.219, "to"], [11.288, 11.544, "act"], [11.59, 11.869, "within"], [11.927, 12.147, "two"], [12.252, 12.832, "legislative"], [12.856, 13.123, "days,"], [13.169, 13.286, "and"], [13.344, 13.924, "Republicans"], [13.971, 14.156, "hold"], [14.214, 14.423, "just"], [14.47, 14.505, "a"], [14.609, 15.143, "four-seat"], [15.201, 15.805, "majority."], [15.945, 16.398, "Hegseth"], [16.445, 16.689, "calls"], [16.735, 16.793, "it"], [16.828, 16.851, "a"], [16.909, 17.362, "farce,"], [17.466, 17.629, "and"], [17.699, 18.059, "Speaker"], [18.117, 18.314, "Mike"], [18.36, 18.709, "Johnson"], [18.767, 18.987, "says"], [19.045, 19.115, "the"], [19.173, 19.37, "vote"], [19.405, 19.475, "to"], [19.533, 19.823, "block"], [19.881, 19.963, "it"], [20.021, 20.172, "is"], [20.276, 20.543, "not"], [20.601, 20.81, "going"], [20.857, 20.903, "to"], [20.961, 21.333, "fail."], [21.473, 21.752, "Even"], [21.798, 21.856, "if"], [21.914, 22.088, "he's"], [22.135, 22.657, "impeached,"], [22.727, 23.203, "removing"], [23.261, 23.412, "him"], [23.47, 23.749, "takes"], [23.807, 24.051, "two"], [24.155, 24.503, "thirds"], [24.538, 24.608, "of"], [24.666, 24.736, "the"], [24.782, 25.165, "Senate."], [25.305, 25.456, "At"], [25.49, 25.56, "the"], [25.607, 25.851, "White"], [25.874, 26.257, "House,"], [26.397, 26.85, "UFC"], [26.99, 27.269, "boss"], [27.338, 27.617, "Dana"], [27.675, 27.942, "White"], [27.989, 28.302, "turned"], [28.325, 28.476, "down"], [28.511, 28.581, "the"], [28.639, 28.906, "press"], [28.952, 29.417, "secretary"], [29.475, 29.8, "job,"], [29.94, 30.126, "live"], [30.149, 30.196, "at"], [30.23, 30.3, "the"], [30.335, 30.788, "briefing."], [30.928, 31.229, "Trump"], [31.287, 31.462, "said"], [31.52, 31.578, "he"], [31.636, 31.752, "was"], [31.833, 32.553, "devastated,"], [32.693, 32.902, "then"], [32.96, 33.204, "called"], [33.227, 33.296, "the"], [33.354, 33.598, "offer"], [33.656, 33.68, "a"], [33.738, 34.098, "joke."], [34.238, 34.563, "Trump"], [34.633, 34.946, "also"], [35.004, 35.225, "says"], [35.295, 35.399, "the"], [35.457, 35.782, "Iran"], [35.852, 36.061, "war"], [36.142, 36.235, "is"], [36.281, 36.874, "effectively"], [36.932, 37.268, "over."], [37.408, 37.779, "Iran"], [37.837, 38.139, "denies"], [38.22, 38.464, "any"], [38.522, 38.894, "talks,"], [38.94, 39.068, "and"], [39.126, 39.3, "two"], [39.358, 39.555, "more"], [39.59, 39.857, "ships"], [39.904, 40.043, "are"], [40.09, 40.194, "on"], [40.252, 40.612, "fire"], [40.658, 40.833, "near"], [40.891, 40.96, "the"], [41.018, 41.367, "Strait"], [41.425, 41.494, "of"], [41.552, 42.214, "Hormuz."], [42.354, 42.69, "Boeing"], [42.748, 42.83, "is"], [42.876, 43.132, "cutting"], [43.166, 43.375, "about"], [43.48, 43.817, "five"], [43.863, 44.223, "percent"], [44.258, 44.316, "of"], [44.362, 44.467, "its"], [44.525, 44.989, "commercial"], [45.047, 45.454, "airplane"], [45.477, 45.941, "division,"], [46.081, 46.487, "according"], [46.534, 46.603, "to"], [46.673, 46.731, "an"], [46.777, 47.207, "internal"], [47.277, 47.683, "email."], [47.823, 47.963, "And"], [48.021, 48.079, "in"], [48.16, 48.439, "Abu"], [48.497, 48.845, "Dhabi,"], [48.903, 49.379, "Ukraine"], [49.402, 49.484, "and"], [49.553, 49.936, "Russia"], [50.076, 50.367, "sat"], [50.425, 50.622, "down"], [50.68, 50.773, "for"], [50.808, 50.959, "their"], [51.017, 51.307, "first"], [51.446, 52.375, "U.S.-brokered"], [52.41, 52.851, "talks"], [52.932, 53.187, "since"], [53.234, 53.884, "February."], [54.024, 54.326, "Follow"], [54.384, 54.477, "for"], [54.535, 54.941, "tomorrow's"], [54.987, 55.498, "24"], [55.545, 56.16, "hours."]];
const VO_END = 56.749;
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
// =================== "The last 24 hours" — Tue Nov 10 2026 (map v2, glass cards, non-overlapping stickers) ===================
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { intro: 0.05, wash: S[1] - 0.45, massie: wordT('Thomas', S[1]), eight: wordT('eight', S[1]), iranw: wordT('Iran', S[1]), act: S[2], four: wordT('four-seat', S[2]), farce: wordT('farce', S[3]), johnson: wordT('Mike', S[3]), fail: wordT('fail', S[3]),
  senate: S[4], wh: S[5] - 0.2, dana: wordT('Dana', S[5]), down: wordT('turned', S[5]), joke: wordT('joke', S[6]), iran: S[7] - 0.2, over: wordT('effectively', S[7]), denies: S[8], ships: wordT('ships', S[8]), boeing: S[9] - 0.2, five: wordT('five', S[9]),
  abu: S[10] - 0.2, ukr: wordT('Ukraine', S[10]), first: wordT('first', S[10]), follow: S[11] };
const CUES = [[0.02, 'whoosh', 0.6], [T.intro + 0.08, 'thud', 0.7], [T.wash, 'whoosh', 0.6], [T.massie, 'pop', 0.5], [T.eight, 'stamp', 0.7], [T.four, 'thud', 0.5], [T.farce, 'pop', 0.4], [T.fail, 'stamp', 0.5], [T.senate, 'rise', 0.5],
  [T.wh - 0.1, 'whoosh', 0.45], [T.dana, 'pop', 0.5], [T.down, 'stamp', 0.7], [T.joke, 'pop', 0.4], [T.iran - 0.1, 'whoosh', 0.6], [T.over, 'thud', 0.5], [T.ships, 'flip', 0.5], [T.boeing - 0.1, 'whoosh', 0.6], [T.five, 'thud', 0.5],
  [T.abu - 0.1, 'whoosh', 0.6], [T.first, 'pop', 0.5], [T.follow, 'whoosh', 0.6], [ENDC, 'thud', 0.5]];
const PL = { pent: [-77.056, 38.871], dc: [-77.04, 38.9], hormuz: [56.4, 26.6], tehran: [51.39, 35.69], everett: [-122.27, 47.98], abu: [54.37, 24.45], kyiv: [30.52, 50.45], moscow: [37.62, 55.75], seattle: [-122.33, 47.6] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.wash, shot([-60, 34], 1500, 0, 0.16), shot([-72, 35], 1050, 0.06, 0.2)],
    [T.wash + 1.1, T.senate - 0.2, shot(off('pent', 2, 2), 100, 0.5, 0.6), shot(off('pent', 2, 2), 88, 0.95, 0.66)],
    [T.senate + 0.4, T.wh, shot([-96, 38.5], 460, 0, 0.32), shot([-94, 38.5], 420, 0.06, 0.35)],
    [T.wh + 1.0, T.iran, shot(off('dc', -2, 1.5), 92, 1.2, 0.62), shot(off('dc', -2, 1.5), 84, 1.6, 0.66)],
    [T.iran + 1.6, T.boeing, shot([54, 29.5], 260, 0, 0.42), shot([55.5, 27.5], 190, 0.12, 0.5)],
    [T.boeing + 1.6, T.abu, shot(off('everett', 0, 2), 100, -0.4, 0.62), shot(off('everett', 0, 2), 88, 0.15, 0.68)],
    [T.abu + 1.6, T.follow, shot([44, 39], 700, 0, 0.36), shot([50, 31], 420, 0.1, 0.45)],
    [T.follow + 1.1, T_END, shot([-40, 36], 1500, 0, 0.16), shot([-40, 36], 1700, 0.05, 0.16)]]; }
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
function gm(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o }); }
function ship3() { const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 2.2), gm('#3a3f48')); hull.position.y = 0.6; g.add(hull); const deck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 2.0), gm('#8a3a2a')); deck.position.y = 1.3; g.add(deck);
  const br = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.8), gm('#e8e8ea')); br.position.set(-3.4, 2.1, 0); g.add(br);
  const fire = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.85 })); fire.position.set(1.2, 2.0, 0); g.add(fire); g.userData.fire = fire;
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#3a3a3e', transparent: true, opacity: 0.7, roughness: 1 })); smoke.position.set(1.6, 4.5, 0); g.add(smoke); g.userData.smoke = smoke; g.visible = false; MAPSC.add(g); return g; }
function jet3() { const g = new THREE.Group(), w = gm('#f2f3f5', { flatShading: true }), b = gm('#2a5ad8');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 9, 14).rotateZ(Math.PI / 2), w); g.add(body); const nose = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), w); nose.position.x = 4.5; nose.scale.set(1.3, 1, 1); g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 10), w); wing.position.set(0.3, -0.2, 0); wing.rotation.y = 0.0; g.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 3.4), w); tail.position.set(-4.0, 0.3, 0); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.12), b); fin.position.set(-4.0, 1.2, 0); g.add(fin); for (const z of [-2.6, 2.6]) { const en = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 12).rotateZ(Math.PI / 2), gm('#c9ced6', { metalness: 0.6 })); en.position.set(0.8, -0.65, z); g.add(en); }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.18, 1.52), b); stripe.position.set(0, -0.1, 0); g.add(stripe); g.visible = false; MAPSC.add(g); return g; }
function buildProps() { const P = {};
  { const sh = new THREE.Shape(), hole = new THREE.Path(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * 6, Math.sin(a) * 6) : sh.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); }
    for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? hole.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6) : hole.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); } sh.holes.push(hole);
    P.pent = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.6, flatShading: true })); P.pent.visible = false; MAPSC.add(P.pent); }
  P.gavel = new THREE.Group(); { const wood = gm('#6b3f1f'), band = gm('#c8a24a', { metalness: 0.8 }); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 20).rotateZ(Math.PI / 2), wood); P.gavel.add(head);
    for (const x of [-1.1, 1.1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.3, 20).rotateZ(Math.PI / 2), band); b.position.x = x; P.gavel.add(b); }
    const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 5.0, 12), wood); hdl.position.set(0, 0, 2.6); hdl.rotation.x = Math.PI / 2; P.gavel.add(hdl); }
  P.block = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.7, 24), gm('#5a3418')); P.gavel.visible = P.block.visible = false; MAPSC.add(P.gavel); MAPSC.add(P.block);
  // House seats: 218 R vs 214 D as two rising columns of small seats over the middle of the country
  P.seatR = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), gm('#ff4a4a', { emissive: '#ff4a4a', emissiveIntensity: 0.2 }), 218); P.seatD = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), gm('#3d7dff', { emissive: '#3d7dff', emissiveIntensity: 0.2 }), 214);
  for (const m of [P.seatR, P.seatD]) { m.frustumCulled = false; m.visible = false; MAPSC.add(m); }
  P.ships = [ship3(), ship3()]; P.jet = jet3(); P.hormuzPin = makePin('#ff7a1a');
  P.arcs = [['kyiv', '#ffd84a'], ['moscow', '#ff6a5a'], ['dc', '#bcd0ff']].map(([k, c]) => makeArc(P3(k, 0.5), P3('abu', 0.5), k === 'dc' ? 480 : 90, c)); P.abuPin = makePin(GOLD);
  P.intro = ['dc', 'pent', 'hormuz', 'everett', 'abu'].map(() => makePin(GOLD));
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
function pulsePin(p, pos, t, t0, sc) { p.visible = true; p.position.copy(pos); p.scale.setScalar(pop(t, t0, 0.35) * sc); p.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); p.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  P.intro.forEach((p, i) => { const keys = ['dc', 'pent', 'hormuz', 'everett', 'abu']; const a = 0.9 + i * 0.25, on = (t >= a && t < T.wash + 0.5) || t >= T.follow + 0.3; if (!on) { p.visible = false; return; } const k0 = t >= T.follow ? T.follow + 0.3 + i * 0.12 : a; const kp = t >= T.follow ? 1 - smooth(T_END - 0.5, T_END, t) : 1 - smooth(T.wash, T.wash + 0.5, t); pulsePin(p, P3(keys[i]), t, k0, mCam.position.y / 50 * Math.max(0.01, kp)); });
  // Pentagon + gavel (slams on "eight" and on "fail")
  { const on = t >= T.wash + 0.5 && t < T.senate + 0.6; P.pent.visible = P.gavel.visible = P.block.visible = on; if (on) { const k = easeOut(span(t, T.wash + 0.9, T.wash + 1.6)); P.pent.position.copy(off('pent', -3, 0)).setY(0.6 + 6 * (1 - k)); P.pent.scale.setScalar(2.4 * k + 0.01); P.pent.rotation.y = 0.2;
      const b = off('pent', 17, 6); P.block.position.copy(b).setY(1.0); P.block.scale.setScalar(1.9 * k + 0.01);
      const hit = (a) => { const u = span(t, a - 0.35, a); const back = span(t, a + 0.05, a + 0.5); return u < 1 ? lerp(-1.15, 0, u * u) : lerp(0, -0.9, easeOut(back)); };
      const ang = t < T.eight - 0.35 ? -0.9 : t < T.fail - 0.35 ? hit(T.eight + 0.1) : hit(T.fail + 0.1); P.gavel.position.copy(b).add(V3(0, 3.6, 6)); P.gavel.rotation.set(ang, 0.4, 0); P.gavel.scale.setScalar(1.9 * k + 0.01); } }
  if (t >= T.wash && t < T.senate + 0.4) { paintState('District of Columbia', GOLD, 0.9, 0.6); paintState('Virginia', '#26324a', 0.3); paintState('Maryland', '#26324a', 0.3); paintCountry('Iran', RED, 0.0); }
  // 218 vs 214
  { const on = t >= T.senate - 0.3 && t < T.wh + 0.6; P.seatR.visible = P.seatD.visible = on; if (on) { const out = 1 - smooth(T.wh, T.wh + 0.5, t);
      const fill = (m, n, base, t0) => { for (let i = 0; i < n; i++) { const a = t0 + (i / n) * 1.3, k = t < a ? 0.001 : easeOut(span(t, a, a + 0.25)) * out + 0.001, c = i % 10, r = Math.floor(i / 10) % 2, lvl = Math.floor(i / 20);
          s4.setScalar(k); m4.compose(V3(base.x + (c - 4.5) * 2.0, 1.0 + lvl * 1.15, base.z + (r - 0.5) * 2.0), q4.identity(), s4); m.setMatrixAt(i, m4); } m.instanceMatrix.needsUpdate = true; };
      fill(P.seatR, 218, llPos(-101, 39.5), T.senate - 0.2); fill(P.seatD, 214, llPos(-89, 39.5), T.senate - 0.1); } }
  // White House
  WH.visible = t >= T.wh && t < T.iran + 0.6; if (WH.visible) { const k = easeOut(span(t, T.wh + 0.3, T.wh + 1.0)); WH.position.copy(off('dc', -3, 0.5)).setY(0.3 + 6 * (1 - k)); WH.scale.setScalar(3.2 * k + 0.01); WH.rotation.y = 0; }
  if (t >= T.wh && t < T.iran + 0.6) { paintState('District of Columbia', GOLD, 0.9, 0.6); }
  // Iran + Hormuz: ships on fire
  if (t >= T.iran && t < T.boeing + 0.4) { paintCountry('Iran', '#ff9a5a', 0.45 * smooth(T.iran, T.iran + 0.5, t), 0.6); }
  P.ships.forEach((s, i) => { const on = t >= T.ships - 0.4 + i * 0.25 && t < T.boeing + 0.3; s.visible = on; if (on) { const k = easeOut(span(t, T.ships - 0.4 + i * 0.25, T.ships + 0.2 + i * 0.25)); s.position.copy(llPos(56.6 + i * 0.9, 26.0 - i * 0.55, 0.2)); s.rotation.y = 0.5 + i * 0.4; s.scale.setScalar(mCam.position.y / 70 * k + 0.01);
      const f = 1 + 0.25 * Math.sin(t * 13 + i); s.userData.fire.scale.setScalar(f); s.userData.smoke.position.y = 4.5 + ((t * 0.8 + i) % 2) * 1.5; s.userData.smoke.scale.setScalar(1.2 + ((t * 0.8 + i) % 2)); s.userData.smoke.material.opacity = 0.7 * (1 - ((t * 0.8 + i) % 2) / 2); } });
  if (t >= T.iran + 0.8 && t < T.boeing) pulsePin(P.hormuzPin, P3('hormuz'), t, T.iran + 0.8, mCam.position.y / 45); else P.hormuzPin.visible = false;
  // Boeing: a jet climbing out of Everett
  { const on = t >= T.boeing + 0.5 && t < T.abu + 0.4; P.jet.visible = on; if (on) { const u = span(t, T.boeing + 0.5, T.abu + 0.4); P.jet.position.copy(off('everett', -6 + 16 * u, 4 - 10 * u)).setY(2 + 7 * u); P.jet.rotation.set(0, 0.6, 0.12 + 0.1 * u); P.jet.scale.setScalar(1.25 * pop(t, T.boeing + 0.5, 0.4)); } }
  if (t >= T.boeing && t < T.abu + 0.4) paintState('Washington', '#3d7dff', 0.25, 0.3);
  // Abu Dhabi talks
  const arcK = (a) => t < a || t > T.follow + 0.2 ? 0 : easeOut(span(t, a, a + 0.9)); arcShow(P.arcs[0], arcK(T.ukr - 0.1)); arcShow(P.arcs[1], arcK(T.ukr + 0.4)); arcShow(P.arcs[2], arcK(T.first - 0.2));
  if (t >= T.abu && t < T.follow + 0.3) { paintCountry('Ukraine', GOLD, 0.55, 0.5); paintCountry('Russia', RED, 0.4, 0.4); paintCountry('United Arab Emirates', GOLD, 0.85, 0.8); }
  if (t >= T.abu + 0.6 && t < T.follow + 0.3) pulsePin(P.abuPin, P3('abu'), t, T.abu + 0.6, mCam.position.y / 45); else P.abuPin.visible = false;
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { massie: ['Thomas Massie', 'REPUBLICAN · KENTUCKY'], hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'], dana_white: ['Dana White', 'UFC BOSS'], trump: ['Donald Trump', 'PRESIDENT'] };
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
  if (t < T.wash + 0.6) return null;
  if (t < T.senate) return ['01 · THE PENTAGON', t < T.eight ? 'IMPEACHMENT' : t < T.act ? '8 ARTICLES' : t < T.farce ? '2 LEGISLATIVE DAYS' : t < T.johnson ? '“A FARCE”' : '“NOT GOING TO FAIL”', t < T.act ? 'MASSIE (R) VS. HEGSETH · OVER THE IRAN WAR' : t < T.farce ? 'THE HOUSE MUST ACT' : t < T.johnson ? 'HEGSETH' : 'SPEAKER JOHNSON ON THE VOTE TO BLOCK IT'];
  if (t < T.wh) return ['01 · THE HOUSE', '218 · 214', 'REPUBLICANS · DEMOCRATS · 2/3 OF THE SENATE TO REMOVE'];
  if (t < T.iran) return ['02 · WHITE HOUSE', t < T.down ? 'PRESS SECRETARY?' : t < T.joke ? 'DANA WHITE: NO' : '“A JOKE”', t < T.down ? 'UFC BOSS AT THE BRIEFING' : t < T.joke ? 'TRUMP: “DEVASTATED”' : 'TRUMP ON HIS OWN OFFER'];
  if (t < T.boeing) return ['03 · IRAN', t < T.denies ? '“EFFECTIVELY OVER”' : 'SHIPS ON FIRE', t < T.denies ? 'TRUMP ON THE IRAN WAR' : 'IRAN DENIES TALKS · STRAIT OF HORMUZ'];
  if (t < T.abu) return ['04 · BOEING', t < T.five ? 'LAYOFFS' : '−5%', 'COMMERCIAL AIRPLANES · INTERNAL EMAIL'];
  if (t < T.follow) return ['05 · ABU DHABI', t < T.first ? 'UKRAINE · RUSSIA' : 'FIRST TALKS', t < T.first ? 'AT ONE TABLE' : 'U.S.-BROKERED · FIRST SINCE FEBRUARY'];
  return null; }
function introHTML(t) { if (t > T.wash + 0.5) return ''; const k = pop(t, T.intro, 0.35), a = 1 - smooth(T.wash + 0.1, T.wash + 0.5, t), bar = easeOut(span(t, T.intro + 0.2, T.intro + 0.8));
  const hh = Math.max(0, 24 - span(t, T.intro + 0.3, T.wash) * 24), clock = `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}:${String(Math.floor((hh * 3600) % 60)).padStart(2, '0')}`;
  return `<div id="intro" style="opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><div class="idate"><b>●</b> TUESDAY · NOV 10, 2026</div><div class="ititle">The last</div><div class="iplate" style="transform:skewX(-8deg) scale(${(0.6 + 0.4 * easeOut(span(t, T.intro + 0.15, T.intro + 0.45))).toFixed(3)})"><span>24 HOURS</span></div>
    <div><div class="isub" style="opacity:${smooth(T.intro + 0.5, T.intro + 0.8, t)}">IN AMERICA <i>&</i> AROUND THE WORLD</div></div><div class="iclock">${clock}</div></div>`; }
function domAt(t) { const P = PROPS; STK = []; let h = introHTML(t);
  h += card('massie', T.massie - 0.05, T.farce - 0.05, 110, 640, t, { tag: '8 ARTICLES', tagc: 'r', tagT: T.eight });
  h += card('hegseth', T.farce - 0.25, T.senate, 650, 660, t, { small: true, quote: '“A FARCE”', qT: T.farce });
  h += card('dana_white', T.dana - 0.05, T.iran, 110, 640, t, { tag: t >= T.down ? 'SAID NO' : '', tagc: 'r', tagT: T.down });
  h += card('trump', S[6] - 0.05, T.iran, 650, 660, t, { small: true, quote: '“DEVASTATED”', qT: S[6] + 0.4 });
  h += card('trump', T.over - 0.3, T.denies, 110, 640, t, { small: true, quote: '“EFFECTIVELY OVER”', qT: T.over });
  if (P) {
    if (t >= T.wash + 1.4 && t < T.senate) sticker('THE PENTAGON', off('pent', -3, 0).setY(6), t, T.wash + 1.4, 'sm w');
    if (t >= T.senate + 0.4 && t < T.wh) { sticker('REPUBLICANS 218', llPos(-101, 39.5, 14), t, T.senate + 0.6, 'r'); sticker('DEMOCRATS 214', llPos(-89, 39.5, 14), t, T.senate + 0.8, 'b'); }
    if (t >= T.wh + 1.0 && t < T.iran) sticker('WHITE HOUSE', off('dc', -3, 4).setY(3), t, T.wh + 1.0, 'sm w');
    if (t >= T.ships && t < T.boeing) sticker('STRAIT OF HORMUZ', P3('hormuz', 8), t, T.ships + 0.2, 'r');
    if (t >= T.boeing + 1.0 && t < T.abu) sticker('BOEING · EVERETT, WA', off('everett', 0, 0).setY(4), t, T.boeing + 1.0, 'sm w');
    if (t >= T.abu + 1.0 && t < T.follow) { sticker('ABU DHABI', P3('abu', 30), t, T.abu + 1.0, 'w'); sticker('KYIV', P3('kyiv', 4), t, T.ukr, 'sm'); sticker('MOSCOW', P3('moscow', 4), t, T.ukr + 0.4, 'r sm'); }
  }
  h += layoutStickers();
  if (t >= T.down && t < T.joke) h += `<div class="stamp" style="font-size:130px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.down, T.down + 0.18)))).toFixed(3)})">NO</div>`;
  if (t >= T.follow - 0.2 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.follow - 0.2, T.follow + 0.1, t)};transform:scale(${pop(t, T.follow - 0.2, 0.35).toFixed(3)})">Follow for <span class="hl">tomorrow’s</span><br>24 hours</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.wash + 0.6, T.eight, T.act, T.farce, T.johnson, T.senate, T.wh, T.down, T.joke, T.iran, T.denies, T.boeing, T.five, T.abu, T.first]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.eight + 0.1, T.fail + 0.1, T.down]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); f = Math.max(f, 1 - Math.abs(t - T.intro - 0.05) / 0.2); return Math.max(0, f) * 0.8; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
