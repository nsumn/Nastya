import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// US NEWS-MAP format (Nov 8 2026): "The 2026 midterms in 60 seconds" — head = copy of parts_mind/m_head.js. Voice-over (Lumean "Andrew"), timeline in parts_news/n_times.js.
// Map: 3D relief of the US from data/us_dem.png (AWS terrain tiles), states from us-atlas states-10m (lon/lat), foreign land from world-atlas land-50m; our own look (dark relief, glowing states).
// Facts (Nov 3–6 2026 coverage): Talarico (D) flips Texas Senate, first since 1988 (AP/ABC, Axios); 7 Senate flips, D 54 with AK/MS outstanding (States Newsroom, Quartz); House D 250+ (CNN, NBC 258).
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
const SENT = [1.4, 3.885, 6.974, 8.518, 15.6, 18.298, 21.398, 22.722, 26.089, 29.097, 33.356, 34.842, 40.873, 45.979, 47.372, 51.25, 55.325, 56.486];
const WORDS = [[1.4, 1.818, "Texas"], [1.888, 2.097, "just"], [2.143, 2.48, "elected"], [2.515, 2.538, "a"], [2.596, 2.991, "Democrat"], [3.037, 3.095, "to"], [3.165, 3.234, "the"], [3.281, 3.722, "Senate."], [3.885, 4.035, "For"], [4.082, 4.152, "the"], [4.233, 4.523, "first"], [4.57, 4.871, "time"], [4.906, 5.138, "since"], [5.185, 6.16, "1988."], [6.974, 7.136, "And"], [7.194, 7.252, "it"], [7.299, 7.554, "wasn't"], [7.589, 8.088, "alone."], [8.518, 9.017, "Democrats"], [9.075, 9.388, "flipped"], [9.47, 9.76, "seven"], [9.818, 10.085, "Senate"], [10.12, 10.526, "seats:"], [10.573, 11.014, "Texas,"], [11.072, 11.525, "Ohio,"], [11.571, 11.78, "North"], [11.815, 12.43, "Carolina,"], [12.697, 13.092, "Iowa,"], [13.138, 13.638, "Kansas,"], [13.707, 14.079, "Maine,"], [14.102, 14.218, "and"], [14.299, 14.543, "South"], [14.578, 15.228, "Carolina."], [15.6, 15.797, "That"], [15.855, 16.041, "gives"], [16.064, 16.18, "them"], [16.215, 16.273, "at"], [16.319, 16.493, "least"], [16.551, 17.016, "fifty-four"], [17.074, 17.527, "seats."], [18.298, 18.809, "Alaska"], [18.879, 18.995, "and"], [19.064, 19.599, "Mississippi"], [19.645, 19.749, "are"], [19.808, 20.086, "still"], [20.156, 20.318, "too"], [20.388, 20.655, "close"], [20.678, 20.725, "to"], [20.783, 21.201, "call."], [21.398, 21.503, "The"], [21.584, 21.839, "House"], [21.874, 21.955, "is"], [22.013, 22.176, "even"], [22.234, 22.582, "bigger."], [22.722, 22.861, "You"], [22.931, 23.174, "need"], [23.291, 23.511, "two"], [23.581, 23.836, "hundred"], [23.894, 24.266, "eighteen"], [24.335, 24.579, "seats"], [24.602, 24.707, "for"], [24.742, 24.765, "a"], [24.811, 25.357, "majority."], [26.089, 26.6, "Democrats"], [26.623, 26.716, "are"], [26.739, 27.157, "projected"], [27.181, 27.239, "to"], [27.285, 27.448, "win"], [27.506, 27.657, "more"], [27.68, 27.796, "than"], [27.842, 27.982, "two"], [28.051, 28.295, "hundred"], [28.342, 28.783, "fifty."], [29.097, 29.306, "More"], [29.352, 29.491, "than"], [29.573, 29.898, "thirty"], [29.967, 30.42, "Republican"], [30.467, 30.711, "members"], [30.745, 30.803, "of"], [30.861, 31.291, "Congress"], [31.488, 31.825, "lost"], [31.872, 32.046, "their"], [32.127, 32.684, "seats."], [33.356, 33.518, "And"], [33.576, 33.82, "people"], [33.843, 34.064, "showed"], [34.099, 34.354, "up."], [34.842, 35.318, "Minnesota"], [35.376, 35.759, "alone"], [35.817, 36.119, "counted"], [36.165, 36.328, "over"], [36.409, 36.618, "eight"], [36.653, 36.897, "hundred"], [36.966, 37.477, "eighty-six"], [37.535, 37.884, "thousand"], [37.953, 38.197, "early"], [38.267, 38.789, "ballots,"], [38.836, 38.905, "a"], [38.987, 39.114, "new"], [39.184, 39.567, "midterm"], [39.625, 40.043, "record."], [40.873, 41.047, "And"], [41.105, 41.163, "in"], [41.209, 41.743, "Texas,"], [41.859, 41.952, "the"], [42.01, 42.208, "first"], [42.254, 42.417, "week"], [42.452, 42.498, "of"], [42.544, 42.73, "early"], [42.788, 43.032, "voting"], [43.067, 43.229, "beat"], [43.299, 43.589, "every"], [43.659, 43.96, "recent"], [44.007, 44.367, "midterm"], [44.39, 44.46, "and"], [44.495, 45.029, "presidential"], [45.087, 45.412, "year."], [45.979, 46.118, "So"], [46.176, 46.315, "what"], [46.362, 46.942, "changes?"], [47.372, 47.732, "Starting"], [47.767, 47.813, "in"], [47.871, 48.498, "January,"], [48.626, 49.09, "Democrats"], [49.137, 49.45, "control"], [49.508, 49.694, "both"], [49.729, 49.798, "the"], [49.868, 50.158, "House"], [50.193, 50.425, "and"], [50.483, 50.553, "the"], [50.6, 51.052, "Senate."], [51.25, 51.47, "Every"], [51.517, 51.679, "bill"], [51.749, 51.935, "now"], [52.004, 52.202, "needs"], [52.237, 52.376, "their"], [52.422, 52.829, "votes,"], [52.875, 53.003, "and"], [53.038, 53.107, "the"], [53.131, 53.467, "President"], [53.49, 53.583, "can"], [53.618, 53.792, "still"], [53.839, 53.966, "say"], [54.048, 54.187, "no"], [54.245, 54.361, "with"], [54.396, 54.419, "a"], [54.466, 54.953, "veto."], [55.325, 55.464, "Did"], [55.511, 55.615, "your"], [55.65, 55.894, "state"], [55.929, 56.323, "flip?"], [56.486, 56.683, "Tell"], [56.73, 56.788, "me"], [56.822, 56.869, "in"], [56.904, 56.973, "the"], [57.008, 57.67, "comments."]];
const VO_END = 57.717;
// =================== THE 3D RELIEF MAP OF THE US ===================
const LON0 = -128, LON1 = -64, LAT0 = 22, LAT1 = 52, SC = 6, CLAT = Math.cos(38 * Math.PI / 180);
const ll2xz = (lon, lat) => V3((lon + 96) * CLAT * SC, 0, (38 - lat) * SC);
const MW = (LON1 - LON0) * CLAT * SC, MD = (LAT1 - LAT0) * SC, MCX = ((LON0 + LON1) / 2 + 96) * CLAT * SC, MCZ = (38 - (LAT0 + LAT1) / 2) * SC;
const MAPSC = new THREE.Scene(); MAPSC.background = new THREE.Color('#0b0f16'); MAPSC.fog = new THREE.Fog('#0b0f16', 220, 520);
const mCam = new THREE.PerspectiveCamera(34, W / H, 0.5, 3000); MAPSC.add(mCam);
const hemiM = new THREE.HemisphereLight(0x9ab0d8, 0x101418, 0.5); MAPSC.add(hemiM);
const sunM = new THREE.DirectionalLight(0xfff0dc, 2.2); sunM.position.set(-120, 140, -90); MAPSC.add(sunM);
const STATES = [];   // { id, name, fips, lon, lat }  index+1 = id in the id texture
const ST_COL = Array.from({ length: 64 }, () => new THREE.Vector4(0, 0, 0, 0)), ST_LIFT = new Float32Array(64);
const mapU = { tDem: { value: null }, tId: { value: null }, uCol: { value: ST_COL }, uLift: { value: ST_LIFT }, uH: { value: 11 }, uSun: { value: V3(-0.55, 0.62, -0.55).normalize() }, uT: { value: 0 }, uGlobal: { value: 0 } };
const mapMat = new THREE.ShaderMaterial({ uniforms: mapU, fog: false,
  vertexShader: `uniform sampler2D tDem, tId; uniform float uH, uLift[64]; varying vec2 vUv; varying vec3 vN; varying float vId; varying vec3 vW; varying float vHt;
    float hh(vec2 uv){ float v = texture2D(tDem, uv).r; return v * v * uH; }
    void main(){ vUv = uv; vec2 tuv = vec2(uv.x, uv.y); float id = floor(texture2D(tId, tuv).r * 255.0 + 0.5); vId = id;
      float e = 1.0 / 1600.0, f = 1.0 / 750.0; float h = hh(tuv), hx = hh(tuv + vec2(e, 0.0)) - hh(tuv - vec2(e, 0.0)), hz = hh(tuv + vec2(0.0, f)) - hh(tuv - vec2(0.0, f));
      vN = normalize(vec3(-hx / (2.0 * ${(64 * 0.788 * 6 / 1600).toFixed(5)}), 1.0, hz / (2.0 * ${(30 * 6 / 750).toFixed(5)})));
      float lift = 0.0; if (id > 0.5 && id < 63.5) lift = uLift[int(id)];
      vHt = texture2D(tDem, tuv).r; vec3 p = position; p.y += h + lift; vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tId; uniform vec4 uCol[64]; uniform vec3 uSun; uniform float uT, uGlobal; varying vec2 vUv; varying vec3 vN; varying float vId; varying vec3 vW; varying float vHt;
    float idAt(vec2 o){ return floor(texture2D(tId, vUv + o).r * 255.0 + 0.5); }
    void main(){ float id = idAt(vec2(0.0)); vec3 n = normalize(vN); float dif = max(dot(n, uSun), 0.0), sh = 0.25 + 1.1 * dif;
      // natural hypsometric tint (muted): green lowlands → olive plains → tan uplands → brown mountains → pale peaks
      float e = vHt; vec3 land = mix(vec3(0.20, 0.27, 0.16), vec3(0.33, 0.33, 0.20), smoothstep(0.08, 0.35, e)); land = mix(land, vec3(0.42, 0.34, 0.24), smoothstep(0.35, 0.6, e)); land = mix(land, vec3(0.36, 0.28, 0.22), smoothstep(0.6, 0.8, e)); land = mix(land, vec3(0.62, 0.6, 0.58), smoothstep(0.82, 0.95, e));
      land = mix(vec3(dot(land, vec3(0.3, 0.59, 0.11))), land, 0.75);
      vec3 base = id < 0.5 ? vec3(0.03, 0.05, 0.08) : id > 254.5 ? land * 0.55 : land;
      vec3 col = base * sh;
      if (id > 0.5 && id < 63.5) { vec4 c = uCol[int(id)]; col = mix(col, c.rgb * (0.55 + 0.75 * dif), c.a); col += c.rgb * c.a * 0.12; }
      // borders: state lines (thin, light), the coast (brighter)
      vec2 px = vec2(1.0 / 3200.0, 1.0 / 1500.0); float a = idAt(vec2(px.x, 0.0)), b = idAt(vec2(-px.x, 0.0)), c2 = idAt(vec2(0.0, px.y)), d = idAt(vec2(0.0, -px.y));
      float edge = (a != id || b != id || c2 != id || d != id) ? 1.0 : 0.0; bool usEdge = (id > 0.5 && id < 63.5) || (a > 0.5 && a < 63.5) || (c2 > 0.5 && c2 < 63.5);
      if (edge > 0.5) col = mix(col, usEdge ? vec3(0.9, 0.92, 0.96) : vec3(0.35, 0.4, 0.5), usEdge ? 0.55 : 0.4);
      float dist = length(vW - cameraPosition); col = mix(col, vec3(0.043, 0.059, 0.086), clamp((dist - 220.0) / 300.0, 0.0, 0.85));
      gl_FragColor = vec4(col, 1.0); }` });
const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(MW, MD, 640, 300).rotateX(-Math.PI / 2), mapMat); mapMesh.position.set(MCX, 0, MCZ); mapMesh.frustumCulled = false; MAPSC.add(mapMesh);
// the sea: a dark glossy plane just under the land with a faint grid
{ const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: {}, fog: false, vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; void main(){ vec2 g = abs(fract(vW.xz / ${SC * 5}.0) - 0.5); float l = smoothstep(0.49, 0.5, max(g.x, g.y)); float dist = length(vW - cameraPosition);
      vec3 c = mix(vec3(0.035, 0.055, 0.085), vec3(0.06, 0.09, 0.13), l * 0.5); c = mix(c, vec3(0.043, 0.059, 0.086), clamp((dist - 200.0) / 300.0, 0.0, 0.9)); gl_FragColor = vec4(c, 1.0); }` })); sea.position.y = 0.02; MAPSC.add(sea); }
// build the id texture + state list from us-atlas / world-atlas (lon/lat), and load the DEM
const mapReady = (async () => {
  const [us, wd] = await Promise.all([fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()), fetch('node_modules/world-atlas/land-50m.json').then(r => r.json())]);
  const cv = document.createElement('canvas'); cv.width = 3200; cv.height = 1500; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  const P = ([lon, lat]) => [(lon - LON0) / (LON1 - LON0) * cv.width, (LAT1 - lat) / (LAT1 - LAT0) * cv.height];
  const draw = (geom, col) => { g.fillStyle = col; g.beginPath(); const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; for (const poly of polys) for (const ring of poly) { ring.forEach((pt, i) => { const [x, y] = P(pt); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } g.fill('evenodd'); };
  const land = topojson.feature(wd, wd.objects.land); for (const f of land.features || [land]) draw(f.geometry || f, 'rgb(255,0,0)');
  const st = topojson.feature(us, us.objects.states).features;
  st.forEach((f, i) => { const id = i + 1; draw(f.geometry, `rgb(${id},0,0)`); const c = d3c(f); STATES.push({ id, name: f.properties.name, fips: f.id, lon: c[0], lat: c[1] }); });
  const tId = new THREE.CanvasTexture(cv); tId.magFilter = tId.minFilter = THREE.NearestFilter; tId.generateMipmaps = false; tId.colorSpace = THREE.NoColorSpace; tId.flipY = true; mapU.tId.value = tId;
  const dem = await new THREE.TextureLoader().loadAsync('data/us_dem.png'); dem.colorSpace = THREE.NoColorSpace; dem.minFilter = THREE.LinearFilter; dem.generateMipmaps = false; mapU.tDem.value = dem; })();
// a simple area-weighted centroid of the biggest polygon (lon/lat), enough to anchor labels and cameras
function d3c(f) { const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = -1;
  for (const p of polys) { const r = p[0]; let a = 0, cx = 0, cy = 0; for (let i = 0; i < r.length - 1; i++) { const [x0, y0] = r[i], [x1, y1] = r[i + 1], k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k; } if (Math.abs(a) > ba) { ba = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; } } return best; }
const ST = name => STATES.find(s => s.name === name);
const stPos = (name, y = 4) => { const s = ST(name); return ll2xz(s.lon, s.lat).setY(y); };
function paint(name, hex, a, lift = 0) { const s = ST(name); if (!s) return; const c = new THREE.Color(hex); ST_COL[s.id].set(c.r, c.g, c.b, a); ST_LIFT[s.id] = lift; }
function clearPaint() { ST_COL.forEach(v => v.set(0, 0, 0, 0)); ST_LIFT.fill(0); }
// =================== design frames (index_news.html?design=N) ===================
const $ = id => document.getElementById(id);
function card(img, name, role, x, y) { return `<div class="card" style="left:${x}px;top:${y}px"><img src="assets/news/photos/${img}.jpg"><div class="cn">${name}</div><div class="cr">${role}</div></div>`; }
function sticker(txt, pos, cls = '') { const v = pos.clone().project(mCam); const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${txt}</div>`; }
function look(p, l, fov) { mCam.position.copy(p); mCam.lookAt(l); mCam.fov = fov; mCam.aspect = W / H; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld(); }
const BLUE = '#3d7dff', RED = '#ff4a4a';
window.renderAt = (t) => { clearPaint(); mapU.uT.value = t; let html = '';
  const d = +(DESIGN || 1);
  if (d === 1) { paint('Texas', BLUE, 0.95, 1.2); const tx = stPos('Texas', 2); look(tx.clone().add(V3(-6, 150, 48)), tx.clone().add(V3(0, 0, 4)), 34);
    html = sticker('TEXAS · FLIPPED', stPos('Texas', 14), 'b') + card('talarico', 'James Talarico', 'SENATOR-ELECT · TEXAS (D)', 170, 1380 - 600);
    $('stat').innerHTML = '<b></b>MIDTERMS 2026 · SENATE'; $('val').textContent = 'FIRST SINCE 1988'; $('sub').textContent = 'TEXAS ELECTS A DEMOCRAT';
    $('cap').innerHTML = 'Texas just elected a <span class="y">Democrat</span> to the Senate.'; }
  if (d === 2) { ['Texas', 'Ohio', 'North Carolina', 'Iowa', 'Kansas', 'Maine', 'South Carolina'].forEach(n => paint(n, BLUE, 0.95, 1.0)); ['Alaska', 'Mississippi'].forEach(n => paint(n, '#c8c8d0', 0.55, 0.6));
    const c = V3(MCX + 20, 0, MCZ + 6); look(c.clone().add(V3(0, 330, 95)), c.clone().add(V3(0, 0, 8)), 40);
    html = ['Texas', 'Ohio', 'North Carolina', 'Iowa', 'Kansas', 'Maine', 'South Carolina'].map(n => sticker(n.toUpperCase(), stPos(n, 10), 'b sm')).join('') + sticker('TOO CLOSE', stPos('Mississippi', 10), 'g sm') + card('schumer', 'Chuck Schumer', 'SENATE DEMOCRATIC LEADER', 640, 1380 - 600);
    $('stat').innerHTML = '<b></b>U.S. SENATE · CONTROL'; $('val').innerHTML = '<span style="color:#7aa8ff">54</span> · <span style="color:#ff7a7a">44</span>'; $('sub').textContent = 'ALASKA & MISSISSIPPI STILL COUNTING';
    $('cap').innerHTML = 'Democrats flipped <span class="y">seven</span> Senate seats.'; }
  if (d === 3) { STATES.forEach(s => paint(s.name, '#2a3550', 0.5)); const c = V3(MCX, 0, MCZ); look(c.clone().add(V3(0, 300, 120)), c.clone().add(V3(0, 0, 18)), 40);
    html = card('jeffries', 'Hakeem Jeffries', 'EXPECTED HOUSE SPEAKER', 170, 1380 - 600) + `<div id="hemi" style="top:520px">${hemiSVG(250, 435)}</div>`;
    $('stat').innerHTML = '<b></b>U.S. HOUSE · 435 SEATS'; $('val').innerHTML = '<span style="color:#7aa8ff">250+</span>'; $('sub').textContent = '218 NEEDED FOR A MAJORITY';
    $('cap').innerHTML = 'Democrats are projected to win <span class="y">more than 250</span>.'; }
  $('labels').innerHTML = html; $('hud').style.opacity = 1; $('cap').style.opacity = 1; $('title').style.opacity = 0;
  if (window.PASS === 'text') return true;
  shootTo(RTA, MAPSC, mCam); const u = compMat.uniforms; u.tA.value = RTA.texture; u.uLook.value = 0.12; u.uWhip.value = 0; composite(0, 1.0, 1.0); return true; };
function hemiSVG(dem, total) { let s = '<svg width="760" height="400" viewBox="0 0 760 400">'; let k = 0; const rows = 12;
  for (let r = 0; r < rows; r++) { const R = 160 + r * 17, n = Math.round(Math.PI * R / 15.5); for (let i = 0; i < n && k < total; i++, k++) { } }
  const seats = []; for (let r = 0; r < rows; r++) { const R = 160 + r * 17, n = Math.round(Math.PI * R / 15.5); for (let i = 0; i < n; i++) { const a = Math.PI * (1 - (i + 0.5) / n); seats.push([a, R]); } }
  seats.sort((p, q) => q[0] - p[0]); const use = seats.slice(0, total);
  use.forEach(([a, R], i) => { const x = 380 + Math.cos(a) * R, y = 370 - Math.sin(a) * R; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.2" fill="${i < dem ? '#3d7dff' : i < 275 ? '#5a5f6a' : '#ff4a4a'}"/>`; });
  s += `<text x="380" y="360" text-anchor="middle" font-family="Source Serif 4" font-size="64" fill="#fff">218</text><text x="380" y="392" text-anchor="middle" font-family="Inter" font-weight="600" font-size="20" letter-spacing="3" fill="#cfd6e4">TO CONTROL THE HOUSE</text></svg>`; return s; }
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; window.renderAt(0); return true; })();
