import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if you were a cat for one day?" — CLASSIC series style (low-poly, vertex colours, soft shadows), cat's-eye camera.
// Same script as the realistic try (parts_cat/), which she rejected after TikTok pixelation: mouse squeak → chase → miss,
// split-screen YOU / CAT colours, 200° view, street (giant people, cars, pigeons), night split, cake, nap.
// =================== timeline ===================
const HEAR = 3.0, CHASE = 8.0, POUNCE = 14.0, COLOR = 17.0, BLUR = 28.0, OUT = 32.0, NIGHT = 41.0, TASTE = 47.0, SLEEP = 52.0, T_END = 59.0;
// =================== helpers ===================
let seed = 2718;
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
// =================== renderer + cat-vision pipeline ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
const RT_FULL = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const RT_HALF = [new THREE.WebGLRenderTarget(W, H / 2, { type: THREE.HalfFloatType, samples: 4 }), new THREE.WebGLRenderTarget(W, H / 2, { type: THREE.HalfFloatType, samples: 4 })];
const catMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
  uniforms: { tSrc: { value: null }, uCat: { value: 0 }, uNight: { value: 0 }, uMotion: { value: 0 }, uWide: { value: 0 }, uLid: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) }, uT: { value: 0 }, uExp: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tSrc; uniform float uCat, uNight, uMotion, uWide, uLid, uT, uExp; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT*31.7)*43758.5453); }
    vec3 tex(vec2 uv){ return texture2D(tSrc,uv).rgb*uExp; }
    vec3 samp(vec2 uv, float r){ vec3 c=vec3(0.0); float w=0.0; for(int i=-2;i<=2;i++) for(int j=-2;j<=2;j++){ vec2 o=vec2(float(i),float(j)); float k=exp(-dot(o,o)/3.0); c+=tex(uv+o*r/uRes)*k; w+=k; } return c/w; }
    void main(){ vec2 q=vUv-0.5; q.x*=uRes.x/uRes.y; float r2=dot(q,q);
      vec2 uv=0.5+(vUv-0.5)*(1.0-uCat*(0.05+0.2*uWide)*r2*4.0);
      vec3 c=tex(uv); float blur=uCat*(0.6+2.4*smoothstep(0.04,0.22,r2)); if(blur>0.05) c=samp(uv,blur);
      if(uMotion>0.001){ vec3 m=vec3(0.0); for(int k=0;k<8;k++){ float s=1.0-float(k)*0.012*uMotion; m+=tex(0.5+(uv-0.5)*s); } c=mix(c,m/8.0,0.8); }
      // tone map first, then the cat's colour space (works on display colours)
      vec4 o=vec4(c,1.0);
      #include <tonemapping_fragment>
      vec3 s=pow(clamp(c*0.0+o.rgb,0.0,1.0),vec3(1.0));
      gl_FragColor=vec4(s,1.0);
      #include <colorspace_fragment>
      vec3 d=gl_FragColor.rgb;
      vec3 dc=mat3(0.367322,0.280085,-0.011820, 0.860646,0.672501,0.042940, -0.227968,0.047413,0.968881)*d;
      dc=mix(dc, vec3(dot(dc,vec3(0.3,0.6,0.1))), 0.1); dc.b=mix(dc.b, d.b*1.05, 0.5); dc*=vec3(0.92,0.97,1.14);
      d=mix(d,dc,uCat*0.92);
      vec3 nv=d*2.6; nv=mix(nv, vec3(dot(nv,vec3(0.3,0.59,0.11)))*vec3(0.88,0.96,1.08), 0.5); d=mix(d, nv+(h(vUv*uRes)-0.5)*0.05, uNight);
      float op=1.0-uLid; float lid=smoothstep(op-0.05,op,abs(vUv.y-0.5)*2.0*(1.0+0.15*q.x*q.x)); d*=1.0-lid*smoothstep(0.0,0.02,uLid);
      d*=1.0-0.28*smoothstep(0.2,0.8,length(q)*1.3);
      gl_FragColor=vec4(clamp(d,0.0,1.0),1.0);
    }` });
// tone mapping chunk reads gl_FragColor? we keep it explicit: three's chunk tone-maps gl_FragColor.rgb — so assign first
catMat.fragmentShader = catMat.fragmentShader.replace('vec4 o=vec4(c,1.0);\n      #include <tonemapping_fragment>\n      vec3 s=pow(clamp(c*0.0+o.rgb,0.0,1.0),vec3(1.0));\n      gl_FragColor=vec4(s,1.0);\n      #include <colorspace_fragment>',
  'gl_FragColor=vec4(c,1.0);\n      #include <tonemapping_fragment>\n      #include <colorspace_fragment>');
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), catMat));
function shoot(scene, camera, rt, o, t) {
  camera.aspect = rt.width / rt.height; camera.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
}
function present(rt, o, t, vp) {           // vp: null = full screen, 0 = top half, 1 = bottom half
  const u = catMat.uniforms; u.tSrc.value = rt.texture; u.uCat.value = o.cat ?? 0; u.uNight.value = o.night ?? 0; u.uMotion.value = o.motion ?? 0; u.uWide.value = o.wide ?? 0; u.uLid.value = o.lid ?? 0; u.uT.value = t; u.uExp.value = o.exp ?? 1;
  u.uRes.value.set(rt.width, rt.height);
  renderer.setRenderTarget(null);
  if (vp === null || vp === undefined) renderer.setViewport(0, 0, W, H); else renderer.setViewport(0, vp === 0 ? H / 2 : 0, W, H / 2);
  renderer.render(quadScene, quadCam); renderer.setViewport(0, 0, W, H);
}
// =================== materials / builders ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }

// =================== LIVING ROOM (meters), low-poly: planks, painted walls, window, sofa, table, shelf, plant, rug, door with a cat flap ===================
const room = new THREE.Scene(); room.background = new THREE.Color('#9ec9ee');
const rCam = new THREE.PerspectiveCamera(70, W / H, 0.02, 80);
room.add(new THREE.HemisphereLight(0xdfe9ff, 0x8a6a4a, 1.0));
const sun = new THREE.DirectionalLight(0xfff0dc, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.01; sun.shadow.radius = 3;
sun.position.set(-3.5, 3.2, -6.0); sun.target.position.set(0.4, 0, 0.6); room.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xffe8d0, 0.6); fill.position.set(2, 2.5, 4); room.add(fill);
const ROOM = { w: 6.0, d: 6.0, h: 2.7 };
const props = {};
function bx(w, h, d, col, x, y, z, parent = room, opts = {}) { const m = mesh(BOX, M(col, { flatShading: true, ...opts })); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function grp(x, y, z, ry = 0, parent = room) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
{
  const planks = canvasTex(512, 512, (g, w, h) => { for (let r = 0; r < 8; r++) { let x = (r % 2) * -90; while (x < w) { const L = R(120, 260); g.fillStyle = pick(['#b98552', '#c8955f', '#a8744a', '#c08a55', '#b07b4c']); g.fillRect(x, r * 64, L - 3, 61); g.fillStyle = 'rgba(70,40,20,0.12)'; for (let k = 0; k < 6; k++) g.fillRect(x, r * 64 + R(4, 57), L - 3, 1.5); x += L; } } }, [3, 3]);
  const floor = mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.55 }), false, true); floor.rotation.x = -Math.PI / 2; room.add(floor);
  const wallM = M('#efe6d8', { roughness: 0.95 });
  const wall = (w, h, x, y, z, ry) => { const m = mesh(new THREE.PlaneGeometry(w, h), wallM, true, true); m.position.set(x, y, z); m.rotation.y = ry; room.add(m); return m; };
  const BZ = -ROOM.d / 2, WX0 = -1.6, WX1 = -0.2, WY0 = 0.75, WY1 = 2.2;
  wall(WX0 + ROOM.w / 2, ROOM.h, (-ROOM.w / 2 + WX0) / 2, ROOM.h / 2, BZ, 0); wall(ROOM.w / 2 - WX1, ROOM.h, (WX1 + ROOM.w / 2) / 2, ROOM.h / 2, BZ, 0);
  wall(WX1 - WX0, WY0, (WX0 + WX1) / 2, WY0 / 2, BZ, 0); wall(WX1 - WX0, ROOM.h - WY1, (WX0 + WX1) / 2, (WY1 + ROOM.h) / 2, BZ, 0);
  wall(ROOM.d, ROOM.h, -ROOM.w / 2, ROOM.h / 2, 0, Math.PI / 2); wall(ROOM.d, ROOM.h, ROOM.w / 2, ROOM.h / 2, 0, -Math.PI / 2); wall(ROOM.w, ROOM.h, 0, ROOM.h / 2, ROOM.d / 2, Math.PI);
  const ceil = mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), M('#f6f1e8'), false, false); ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; room.add(ceil);
  for (const [w, h, x, y] of [[WX1 - WX0 + 0.1, 0.07, (WX0 + WX1) / 2, WY0], [WX1 - WX0 + 0.1, 0.07, (WX0 + WX1) / 2, WY1], [0.07, WY1 - WY0, WX0, (WY0 + WY1) / 2], [0.07, WY1 - WY0, WX1, (WY0 + WY1) / 2], [0.045, WY1 - WY0, (WX0 + WX1) / 2, (WY0 + WY1) / 2]]) bx(w, h, 0.12, '#fbf8f2', x, y, BZ);
  bx(WX1 - WX0 + 0.3, 0.05, 0.26, '#fbf8f2', (WX0 + WX1) / 2, WY0 - 0.02, BZ + 0.1);
  // outside the window: sky, a lawn, a tree, a neighbour's house
  const out = grp(0, 0, BZ - 0.2); bx(30, 0.1, 20, '#7fbf55', 0, 0.3, -10, out); const tr = grp(-2.4, 0.3, -5, 0, out); bx(0.25, 1.6, 0.25, '#6b4a2e', 0, 0.8, 0, tr); const crown = mesh(new THREE.IcosahedronGeometry(1.1, 0), M('#4f9a3c', { flatShading: true })); crown.position.y = 2.2; tr.add(crown);
  const hs = grp(1.2, 0.3, -9, 0, out); bx(4, 2.6, 3, '#e8c7a0', 0, 1.3, 0, hs); const roof = mesh(new THREE.ConeGeometry(3.0, 1.4, 4), M('#a8473a', { flatShading: true })); roof.rotation.y = Math.PI / 4; roof.position.y = 3.3; roof.scale.set(1, 1, 0.75); hs.add(roof);
  for (const [w, x, z, ry] of [[ROOM.w, 0, BZ + 0.012, 0], [ROOM.d, -ROOM.w / 2 + 0.012, 0, Math.PI / 2], [ROOM.d, ROOM.w / 2 - 0.012, 0, -Math.PI / 2], [ROOM.w, 0, ROOM.d / 2 - 0.012, Math.PI]]) { const b = bx(w, 0.1, 0.025, '#fbf8f2', x, 0.05, z); b.rotation.y = ry; }
  // rug: bold red / cream zigzags (the red will vanish for the cat)
  const rugT = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#efe2c8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8302a'; g.lineWidth = 26; for (let row = 0; row < 5; row++) { g.beginPath(); for (let x = -20; x <= w + 40; x += 64) g.lineTo(x, 50 + row * 72 + ((x / 64) % 2 ? 22 : -22)); g.stroke(); } g.strokeStyle = '#2f5d8a'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28); });
  const rug = mesh(new THREE.BoxGeometry(2.6, 0.014, 1.9), new THREE.MeshStandardMaterial({ map: rugT, roughness: 1 }), false, true); rug.position.set(0.2, 0.007, 0.0); room.add(rug);
  // sofa
  const so = grp(0.25, 0, -1.55); const SC = '#3e7aa8'; bx(2.1, 0.32, 0.9, SC, 0, 0.22, 0, so); bx(2.1, 0.7, 0.22, SC, 0, 0.55, -0.36, so); for (const sx of [-1, 1]) bx(0.2, 0.55, 0.9, SC, sx * 0.95, 0.38, 0, so);
  for (const sx of [-0.48, 0.48]) bx(0.92, 0.14, 0.62, '#4c8cbc', sx, 0.44, 0.08, so); for (const sx of [-0.85, 0.85]) for (const sz of [-0.38, 0.38]) bx(0.06, 0.08, 0.06, '#3a2a1c', sx, 0.04, sz, so);
  bx(0.4, 0.34, 0.12, '#f0b23e', -0.55, 0.65, -0.22, so).rotation.z = 0.15; bx(0.4, 0.34, 0.12, '#e05a6a', 0.6, 0.65, -0.22, so).rotation.z = -0.12;
  props.sofa = so;
  // coffee table
  const ta = grp(0.2, 0.014, 0.05); bx(1.1, 0.05, 0.6, '#9a6a40', 0, 0.42, 0, ta); for (const sx of [-0.5, 0.5]) for (const sz of [-0.25, 0.25]) bx(0.05, 0.4, 0.05, '#7a5030', sx, 0.2, sz, ta); bx(0.2, 0.25, 0.14, '#e8e8e8', 0.25, 0.57, 0.05, ta); props.table = ta;
  // armchair
  const ch = grp(-1.75, 0, -1.25, 0.9); const CC = '#d9a63a'; bx(0.85, 0.36, 0.8, CC, 0, 0.26, 0, ch); bx(0.85, 0.6, 0.18, CC, 0, 0.62, -0.32, ch); for (const sx of [-1, 1]) bx(0.15, 0.5, 0.8, CC, sx * 0.38, 0.35, 0, ch); props.chair = ch;
  // bookshelf with colourful books
  const sh = grp(2.75, 0, -1.6, -Math.PI / 2); bx(1.3, 2.0, 0.34, '#8a5a34', 0, 1.0, -0.02, sh);
  for (let s = 0; s < 4; s++) { bx(1.22, 0.03, 0.3, '#a8754a', 0, 0.12 + s * 0.48, 0.02, sh); let x = -0.58; while (x < 0.56) { const bw = R(0.03, 0.07), bh = R(0.24, 0.38); bx(bw, bh, 0.24, pick(['#c8302a', '#2f5d8a', '#e0b040', '#3c8a52', '#7a4a8c', '#e8e2d0', '#d46a3a', '#1f2a3a']), x + bw / 2, 0.135 + s * 0.48 + bh / 2, 0.04, sh); x += bw + 0.004; } }
  props.shelf = sh;
  // plant
  const pl = grp(-2.2, 0, -2.3); const pot = mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.38, 10), M('#c46a3a', { flatShading: true })); pot.position.y = 0.19; pl.add(pot);
  for (let i = 0; i < 9; i++) { const lf = mesh(new THREE.IcosahedronGeometry(R(0.16, 0.26), 0), M(pick(['#3f8a3a', '#4f9a44', '#2f7a34']), { flatShading: true })); lf.position.set(R(-0.25, 0.25), R(0.5, 1.15), R(-0.25, 0.25)); lf.scale.y = R(0.6, 1.0); pl.add(lf); }
  props.plant = pl;
  // pillow on the floor
  const pw = bx(0.5, 0.14, 0.45, '#8c5ab0', -0.9, 0.07, 1.0); pw.rotation.y = 0.5;
}
// colour line-up on the rug
{
  const ap = grp(-0.62, 0.014, 0.95); const a = mesh(new THREE.IcosahedronGeometry(0.05, 2), M('#d0201c', { roughness: 0.45 })); a.scale.y = 0.9; a.position.y = 0.045; ap.add(a);
  const st = mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.03, 6), M('#5a3a1c')); st.position.y = 0.1; ap.add(st); const lf = mesh(new THREE.SphereGeometry(0.018, 8, 6), M('#3c8a32')); lf.scale.set(1, 0.3, 0.5); lf.position.set(0.012, 0.105, 0); ap.add(lf); props.apple = ap;
  const li = mesh(new THREE.IcosahedronGeometry(0.035, 2), M('#4caa2c', { roughness: 0.5 })); li.scale.set(1, 0.85, 1.2); li.position.set(-0.38, 0.045, 1.0); room.add(li); props.lime = li;
  const pk = grp(-0.1, 0.014, 0.98); const pg = new THREE.SphereGeometry(0.09, 40, 20); const pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); const k = 1 - 0.08 * Math.pow(Math.abs(Math.cos(Math.atan2(z, x) * 5)), 0.5); pp.setXYZ(i, x * k, y * 0.78, z * k); }
  pg.computeVertexNormals(); const pu = mesh(pg, M('#ee7420', { roughness: 0.55 })); pu.position.y = 0.07; pk.add(pu); const ps = mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.05, 6), M('#4a6a2a')); ps.position.y = 0.15; pk.add(ps); props.pumpkin = pk;
  const le = mesh(new THREE.IcosahedronGeometry(0.038, 2), M('#f2d21c', { roughness: 0.5 })); le.scale.set(1.35, 0.95, 0.95); le.position.set(0.15, 0.05, 1.02); le.rotation.y = 0.4; room.add(le); props.lemon = le;
  const du = grp(0.42, 0.014, 0.95, 2.6); const body = mesh(new THREE.SphereGeometry(0.06, 16, 12), M('#f6d020', { roughness: 0.4 })); body.scale.set(1.25, 0.85, 1); body.position.y = 0.05; du.add(body);
  const hd = mesh(new THREE.SphereGeometry(0.038, 14, 10), M('#f6d020', { roughness: 0.4 })); hd.position.set(0.05, 0.12, 0); du.add(hd); const bk = mesh(new THREE.BoxGeometry(0.035, 0.012, 0.03), M('#f08a20')); bk.position.set(0.09, 0.115, 0); du.add(bk);
  for (const sz of [-0.018, 0.018]) { const e = mesh(new THREE.SphereGeometry(0.006, 6, 4), M('#111')); e.position.set(0.075, 0.13, sz); du.add(e); } props.duck = du;
  const bl = mesh(new THREE.SphereGeometry(0.05, 24, 16), M('#1f5fe0', { roughness: 0.3 })); bl.position.set(0.72, 0.064, 0.98); room.add(bl); props.blue = bl;
}
// the mouse + its hole
{
  const m = new THREE.Group(); const fur = M('#8d8680', { flatShading: true }); const pink = M('#e9a0a8');
  const b = mesh(new THREE.SphereGeometry(0.03, 12, 8), fur); b.scale.set(1, 0.8, 1.7); b.position.y = 0.025; m.add(b);
  const hd = mesh(new THREE.ConeGeometry(0.022, 0.05, 10), fur); hd.rotation.x = -Math.PI / 2; hd.position.set(0, 0.03, -0.065); m.add(hd);
  const nose = mesh(new THREE.SphereGeometry(0.005, 6, 4), pink); nose.position.set(0, 0.03, -0.09); m.add(nose);
  for (const sx of [-1, 1]) { const ear = mesh(new THREE.CircleGeometry(0.014, 10), pink); ear.position.set(sx * 0.016, 0.052, -0.05); ear.rotation.set(-0.2, sx * 0.4, 0); m.add(ear); const e = mesh(new THREE.SphereGeometry(0.004, 6, 4), M('#111')); e.position.set(sx * 0.012, 0.038, -0.075); m.add(e); }
  const tail = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0.02, 0.05), V3(0.01, 0.015, 0.09), V3(-0.01, 0.01, 0.13), V3(0.015, 0.008, 0.17)]), 12, 0.003, 5), pink); m.add(tail);
  room.add(m); props.mouse = m;
  const hole = mesh(new THREE.CircleGeometry(0.05, 20, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#0a0806' }), false, false); hole.position.set(-ROOM.w / 2 + 0.03, 0.0, 0.6); hole.rotation.y = Math.PI / 2; room.add(hole);
}
// front door with a cat flap
{
  const g = grp(ROOM.w / 2 - 0.04, 0, 1.8, -Math.PI / 2); const DC = '#f4f1ea';
  const FW = 0.2, FY0 = 0.05, FY1 = 0.27; bx(0.9, 2.05 - FY1, 0.04, DC, 0, (FY1 + 2.05) / 2, 0, g); bx(0.9, FY0, 0.04, DC, 0, FY0 / 2, 0, g); bx((0.9 - FW) / 2, FY1 - FY0, 0.04, DC, -(0.9 + FW) / 4, (FY0 + FY1) / 2, 0, g); bx((0.9 - FW) / 2, FY1 - FY0, 0.04, DC, (0.9 + FW) / 4, (FY0 + FY1) / 2, 0, g);
  for (const [w, h, x, y] of [[0.06, 2.1, -0.48, 1.05], [0.06, 2.1, 0.48, 1.05], [1.02, 0.06, 0, 2.08]]) bx(w, h, 0.06, '#e9e2d4', x, y, 0.01, g);
  const knob = mesh(new THREE.SphereGeometry(0.03, 12, 8), M('#c8a050', { metalness: 0.8, roughness: 0.3 })); knob.position.set(0.36, 1.0, 0.05); g.add(knob);
  const fp = new THREE.Group(); fp.position.set(0, FY1, 0); g.add(fp); const flap = bx(FW, FY1 - FY0, 0.008, '#9a9a9a', 0, -(FY1 - FY0) / 2, 0, fp, { transparent: true, opacity: 0.75 });
  const outside = mesh(new THREE.PlaneGeometry(FW, FY1 - FY0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.6, 2.4) }), false, false); outside.position.set(0, (FY0 + FY1) / 2, -0.03); g.add(outside);
  props.flap = fp;
}
// food corner: a bowl and a slice of cake on the floor
{
  const bw = mesh(new THREE.LatheGeometry([new THREE.Vector2(0.05, 0), new THREE.Vector2(0.11, 0.01), new THREE.Vector2(0.13, 0.06), new THREE.Vector2(0.12, 0.065), new THREE.Vector2(0.1, 0.02)], 24), M('#3a8ad0', { roughness: 0.35, side: THREE.DoubleSide })); bw.position.set(2.35, 0, 2.55); room.add(bw);
  const kib = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20), M('#8a5a2a', { flatShading: true })); kib.position.set(2.35, 0.045, 2.55); room.add(kib);
  const ck = grp(2.0, 0, 2.62, 0.6); const wedge = s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.14, -0.05); sh.lineTo(0.14, 0.05); sh.lineTo(0, 0); return new THREE.ExtrudeGeometry(sh, { depth: s, bevelEnabled: false }); };
  [['#5a3220', 0.03], ['#f4e0e8', 0.012], ['#6a3a24', 0.03], ['#f6c8d4', 0.016]].reduce((y, [c, hgt]) => { const m = mesh(wedge(hgt), M(c, { flatShading: true })); m.rotation.x = -Math.PI / 2; m.position.y = y; ck.add(m); return y + hgt; }, 0.01);
  const plate = mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.01, 24), M('#f6f6f2')); plate.position.set(0.07, 0.005, 0); ck.add(plate);
  const sb = mesh(new THREE.ConeGeometry(0.015, 0.03, 8), M('#e02a3a')); sb.position.set(0.1, 0.12, 0); sb.rotation.z = Math.PI; ck.add(sb); props.cake = ck;
}
// =================== STREET (meters): the classic low-poly city street (copied from parts_rocket/r_city.js) ===================
const city = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.1, 5000);
city.fog = new THREE.Fog(new THREE.Color(0.6, 0.7, 0.85), 180, 2400);
const hemi = new THREE.HemisphereLight(0xbfd6f2, 0x5b4e40, 1.0); city.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0dc, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 600 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.02;
city.add(sunL, sunL.target);
const archL = new THREE.DirectionalLight(0xc8d8ff, 0); archL.position.set(0, 100, -10); city.add(archL, archL.target);

function box(w, h, d, mat, x, y, z, parent = city) { const m = mesh(BOX, typeof mat === 'string' ? M(mat) : mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }

// ---- ground: asphalt, sidewalks, markings
const XA = -600, XB = 1400;
const asphalt = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#55585e', '#41444a', '#5c5f64', '#3b3e43'], 3);
  for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(30,32,36,0.25)'; g.fillRect(R(0, w), R(0, h), R(40, 140), R(20, 80)); }
  g.strokeStyle = 'rgba(25,26,30,0.7)'; g.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) { let x = R(0, w), y = R(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += R(-22, 22); y += R(-22, 22); g.lineTo(x, y); } g.stroke(); }
}, [(XB - XA) / 18, 2]);
const ground = mesh(new THREE.PlaneGeometry(XB - XA, 14), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); ground.rotation.x = -Math.PI / 2; ground.position.set((XA + XB) / 2, 0, 0); city.add(ground);
const sideTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#b3b1ac', '#9f9d98', '#bab8b2'], 2);
  g.strokeStyle = 'rgba(70,70,70,0.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
}, [(XB - XA) / 4, 5 / 4]);
for (const s of [-1, 1]) {
  const sw = mesh(new THREE.BoxGeometry(XB - XA, 0.18, 5), M('#ffffff', { map: sideTex, roughness: 0.9 }), false, true); sw.position.set((XA + XB) / 2, 0.09, s * 9.5); city.add(sw);
  box(XB - XA, 0.2, 0.25, '#8f8d88', (XA + XB) / 2, 0.1, s * 7.05);
}
const far = mesh(new THREE.PlaneGeometry(9000, 9000), M('#6d6a62', { roughness: 1 }), false, true); far.rotation.x = -Math.PI / 2; far.position.y = -0.05; city.add(far);
// lane markings (instanced)
{
  const dash = [], dy = [];
  for (let x = XA; x < XB; x += 9) { dash.push([x, 3.5]); dash.push([x, -3.5]); }
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.15), M('#e8e6df', { roughness: 0.6 }), dash.length); const d = new THREE.Object3D();
  dash.forEach(([x, z], i) => { d.position.set(x, 0.02, z); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.receiveShadow = true; city.add(im);
  for (const z of [-0.14, 0.14]) { const l = mesh(new THREE.PlaneGeometry(XB - XA, 0.12), M('#e3b23c', { roughness: 0.6 }), false, true); l.rotation.x = -Math.PI / 2; l.position.set((XA + XB) / 2, 0.021, z); city.add(l); }
}
// cross streets
const CROSS = [-170, 30, 165, 300, 435, 570, 705, 840, 975, 1110];
const crossRoads = [];
for (const cx of CROSS) {
  const r = mesh(new THREE.PlaneGeometry(14, 2400), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); r.rotation.x = -Math.PI / 2; r.position.set(cx, 0.005, 0); city.add(r);
  // crosswalks
  for (const xs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(2.6, 0.5), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + xs * 8.6, 0.025, k * 1.05); city.add(s); }
  for (const zs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(0.5, 2.6), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + k * 1.05, 0.026, zs * 8.6); city.add(s); }
  crossRoads.push(cx);
}

// ---- facades
const WALLS = [
  { wall: '#c56d4c', band: '#e5c27a', trim: '#f0e2c4', brick: true }, { wall: '#d98c69', band: '#f2d8a8', trim: '#f6eedc', brick: false },
  { wall: '#9b4632', band: '#d8b88a', trim: '#e9dcc0', brick: true }, { wall: '#d9a73c', band: '#efd27c', trim: '#7a4a2a', brick: false },
  { wall: '#e3cfab', band: '#c9b48c', trim: '#ffffff', brick: false }, { wall: '#b85a40', band: '#e8cf92', trim: '#efe3c8', brick: true },
  { wall: '#a8b8a8', band: '#e8e2d0', trim: '#ffffff', brick: false }, { wall: '#cf7b5a', band: '#d9a73c', trim: '#f5e9cf', brick: true },
];
const SIGNS = ['#2a6b4f', '#b83a2e', '#1f3d6b', '#e0a81e', '#3a3a3a', '#6b2f5a', '#d46a2a', '#2f7a8a'];
const AWN = ['#2f7a4a', '#c43b2e', '#e2b13a', '#2b5f8a', '#d97a2a', '#3d8a7a'];
function facade(wM, hM, o, store = true) {
  const PPM = 9, cw = Math.ceil(wM * PPM), ch = Math.ceil(hM * PPM);
  const groundH = store ? 4.6 : 3.4, floorH = 3.35;
  const floors = Math.max(1, Math.floor((hM - groundH - 0.9) / floorH));
  const bays = Math.max(2, Math.round(wM / 3.3)), bw = cw / bays;
  const lit = [];
  const map = canvasTex(cw, ch, (g) => {
    g.fillStyle = o.wall; g.fillRect(0, 0, cw, ch);
    const base = new THREE.Color(o.wall);
    speckle(g, cw, ch, cw * ch / 14, ['#' + base.clone().offsetHSL(0, 0, 0.04).getHexString(), '#' + base.clone().offsetHSL(0, 0, -0.05).getHexString()], 2);
    if (o.brick) { g.strokeStyle = 'rgba(60,25,15,0.18)'; g.lineWidth = 1; for (let y = 0; y < ch; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); } }
    // cornice
    g.fillStyle = o.band; g.fillRect(0, 0, cw, PPM * 0.9); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, PPM * 0.9, cw, 3);
    const winStyle = rnd();
    for (let f = 0; f < floors; f++) {
      const y0 = ch - (groundH + (f + 1) * floorH) * PPM;
      if (o.bandEvery || winStyle < 0.35) { g.fillStyle = o.band; g.fillRect(0, y0 + floorH * PPM - 4, cw, 4); }
      for (let b = 0; b < bays; b++) {
        const ww = bw * (winStyle < 0.5 ? 0.5 : 0.62), wh = floorH * PPM * (winStyle < 0.5 ? 0.62 : 0.55);
        const x = b * bw + (bw - ww) / 2, y = y0 + floorH * PPM * 0.2;
        g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
        const gr = g.createLinearGradient(x, y, x + ww, y + wh); const sky = rnd();
        gr.addColorStop(0, sky < 0.3 ? '#9fb8cc' : '#44505c'); gr.addColorStop(1, sky < 0.3 ? '#5d7387' : '#262d35');
        g.fillStyle = gr; g.fillRect(x, y, ww, wh);
        if (rnd() < 0.55) { g.fillStyle = pick(['#d9cbb0', '#e8e0d0', '#b8a890', '#6d5a4a']); g.fillRect(x, y, ww, wh * R(0.2, 0.6)); } // curtains
        g.fillStyle = o.trim; g.fillRect(x + ww / 2 - 1, y, 2, wh); g.fillRect(x - 5, y + wh + 2, ww + 10, 4);
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, y, ww, 3); g.fillRect(x, y, 3, wh);
        if (rnd() < 0.3) lit.push([x, y, ww, wh]);
      }
    }
    if (store) {
      const y = ch - groundH * PPM;
      g.fillStyle = pick(SIGNS); g.fillRect(0, y, cw, PPM * 0.95);
      g.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = PPM; x < cw - PPM * 2; x += R(PPM * 1.2, PPM * 2.2)) if (rnd() < 0.7) g.fillRect(x, y + PPM * 0.3, R(PPM * 0.4, PPM * 1.1), PPM * 0.35);
      const gy = y + PPM * 0.95, gh = groundH * PPM - PPM * 0.95;
      g.fillStyle = '#3a3f3f'; g.fillRect(0, gy, cw, gh);
      const panes = Math.max(2, Math.round(wM / 2.4));
      for (let p = 0; p < panes; p++) {
        const x = p * cw / panes + 4, w = cw / panes - 8;
        const gr = g.createLinearGradient(x, gy, x + w * 0.6, gy + gh); gr.addColorStop(0, '#7f9a9e'); gr.addColorStop(0.5, '#3c4c50'); gr.addColorStop(1, '#2a3436');
        g.fillStyle = gr; g.fillRect(x, gy + 4, w, gh - 10);
        if (rnd() < 0.5) { g.fillStyle = pick(['#c8a070', '#8fb0a0', '#d0c0a0', '#a07060']); g.fillRect(x + 4, gy + gh * 0.55, w - 8, gh * 0.3); }
      }
      g.fillStyle = '#c9c2b5'; g.fillRect(0, ch - 5, cw, 5);
    } else {
      for (let b = 0; b < bays; b++) { const ww = bw * 0.5, wh = groundH * PPM * 0.5, x = b * bw + (bw - ww) / 2, y = ch - groundH * PPM * 0.8; g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6); g.fillStyle = '#39434c'; g.fillRect(x, y, ww, wh); }
    }
  });
  const emi = canvasTex(cw, ch, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
    for (const [x, y, ww, wh] of lit) { g.fillStyle = pick(['#ffd28a', '#ffc070', '#ffe0a8', '#f0b060']); g.fillRect(x, y, ww, wh); }
    if (store) { g.fillStyle = '#ffcf8a'; g.fillRect(0, ch - groundH * PPM + PPM * 0.95 + 4, cw, groundH * PPM - PPM * 0.95 - 12); g.fillStyle = '#ffffff'; g.fillRect(0, ch - groundH * PPM + PPM * 0.3, cw, PPM * 0.35); }
  });
  return { map, emi };
}
const winMats = [];
function wallMat(tex) { const m = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.88 }); winMats.push(m); return m; }
const roofMat = M('#77736c', { roughness: 1 });
const sharedFacades = WALLS.map(o => ({ o, side: facade(16, 30, o, false) }));
const buildings = [];
function building(x0, x1, side, h, o, unique) {
  const w = x1 - x0, d = R(14, 22), x = (x0 + x1) / 2, z = side * (12 + d / 2);
  const front = unique ? facade(w, h, o, true) : null;
  const sh = sharedFacades.find(s => s.o === o) || sharedFacades[0];
  const sideMat = wallMat(sh.side); sideMat.map = sh.side.map.clone(); sideMat.map.needsUpdate = true; sideMat.map.wrapS = sideMat.map.wrapT = THREE.RepeatWrapping; sideMat.map.repeat.set(d / 16, h / 30);
  sideMat.emissiveMap = sh.side.emi.clone(); sideMat.emissiveMap.needsUpdate = true; sideMat.emissiveMap.wrapS = sideMat.emissiveMap.wrapT = THREE.RepeatWrapping; sideMat.emissiveMap.repeat.copy(sideMat.map.repeat);
  const frontMat = front ? wallMat(front) : sideMat;
  const mats = [sideMat, sideMat, roofMat, roofMat, side < 0 ? frontMat : sideMat, side > 0 ? frontMat : sideMat];
  const b = mesh(BOX, mats); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  // cornice + parapet
  box(w + 0.6, 0.7, d + 0.6, M(o.band), x, h - 0.35, z);
  box(w, 0.9, 0.3, M(o.band), x, h + 0.45, z - side * (d / 2 - 0.15));
  if (rnd() < 0.6) { const ty = h + 0.9; const tank = new THREE.Group(); tank.position.set(x + R(-w / 4, w / 4), ty, z + R(-d / 5, d / 5)); city.add(tank);
    const tk = mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 12), M('#8a6a4a')); tk.position.y = 3.6; tank.add(tk); const cone = mesh(new THREE.ConeGeometry(1.6, 1.2, 12), M('#5c4a38')); cone.position.y = 5.7; tank.add(cone);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 5), M('#3a3a3a')); l.position.set(lx, 1.05, lz); tank.add(l); } }
  for (let k = 0; k < 3; k++) box(R(1.5, 3), R(1, 2), R(1.5, 3), '#9a968e', x + R(-w / 3, w / 3), h + 0.7, z + R(-d / 3, d / 3));
  // awning
  if (unique && rnd() < 0.8) {
    const ac = pick(AWN); const aw = mesh(BOX, M(ac)); aw.scale.set(w * R(0.6, 0.95), 0.12, 2.2); aw.position.set(x, 3.85, side * (12 - 1.0)); aw.rotation.x = side * 0.28; aw.castShadow = true; city.add(aw);
    box(w * R(0.6, 0.9), 0.5, 0.06, M(ac), x, 3.5, side * (12 - 2.05));
  }
  buildings.push({ x, z, w, d, h, side });
  return b;
}
for (const side of [-1, 1]) {
  for (let bi = 0; bi < CROSS.length - 1; bi++) {
    const a = CROSS[bi] + 7, bEnd = CROSS[bi + 1] - 7;
    let x = a;
    while (x < bEnd - 6) {
      const w = Math.min(bEnd - x, R(13, 26)); const near = x < 420 && x > -120;
      const h = rnd() < 0.15 ? R(38, 52) : R(16, 34);
      building(x, x + w, side, h, pick(WALLS), near);
      x += w;
    }
  }
}
// second row + glass towers
function glassTex() {
  return canvasTex(128, 512, (g, w, h) => {
    const base = pick(['#5f7f99', '#6f8ea6', '#4f6a80', '#7d97a8', '#56707a']);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const c = new THREE.Color(base).offsetHSL(R(-0.01, 0.01), 0, R(-0.12, 0.14)); g.fillStyle = '#' + c.getHexString(); g.fillRect(x, y, 7, 7); }
    g.fillStyle = 'rgba(20,30,40,0.5)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y + 7, w, 1);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
const glassPool = [0, 1, 2, 3, 4].map(() => { const map = glassTex(); const emi = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (rnd() < 0.22) { g.fillStyle = pick(['#ffd28a', '#fff0d0', '#ffc070']); g.fillRect(x, y, 7, 7); } }); return { map, emi }; });
function tower(x, z, w, d, h) {
  const t = pick(glassPool); const mp = t.map.clone(); mp.needsUpdate = true; mp.wrapS = mp.wrapT = THREE.RepeatWrapping; mp.repeat.set(w / 30, h / 120);
  const em = t.emi.clone(); em.needsUpdate = true; em.wrapS = em.wrapT = THREE.RepeatWrapping; em.repeat.copy(mp.repeat);
  const m = new THREE.MeshStandardMaterial({ map: mp, emissiveMap: em, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.35, metalness: 0.25 }); winMats.push(m);
  const b = mesh(BOX, [m, m, roofMat, roofMat, m, m]); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  box(w * 0.7, 3, d * 0.7, '#8d9aa3', x, h + 1.5, z);
}
for (const side of [-1, 1]) for (let x = -200; x < 1300; x += R(22, 40)) {
  const z = side * R(48, 70), h = R(28, 60); const o = pick(WALLS); const tex = pick(sharedFacades).side;
  const m = wallMat(tex); m.map = tex.map.clone(); m.map.needsUpdate = true; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(1.4, h / 30);
  m.emissiveMap = tex.emi.clone(); m.emissiveMap.needsUpdate = true; m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping; m.emissiveMap.repeat.copy(m.map.repeat);
  const b = mesh(BOX, m); b.scale.set(R(18, 30), h, R(16, 26)); b.position.set(x, h / 2, z); city.add(b); box(b.scale.x + 0.5, 0.8, b.scale.z + 0.5, M(o.band), x, h, z);
}
for (let i = 0; i < 46; i++) { const side = rnd() < 0.5 ? -1 : 1; tower(R(120, 1500), side * R(30, 260), R(22, 40), R(22, 40), R(70, 210)); }
for (let i = 0; i < 160; i++) { const side = rnd() < 0.5 ? -1 : 1; const h = R(20, 90); box(R(20, 50), h, R(20, 50), pick(['#a99b8a', '#8f8a84', '#b49a80', '#9aa3aa', '#c2b49c']), R(-300, 2600), h / 2, side * R(80, 900)); }

// ---- street props
const poleMat = M('#3b3e42', { roughness: 0.6, metalness: 0.3 });
function streetLamp(x, z, side) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 6), poleMat); p.position.y = 3.5; g.add(p);
  const arm = mesh(BOX, poleMat); arm.scale.set(0.1, 0.1, 1.6); arm.position.set(0, 6.9, -side * 0.8); g.add(arm);
  const head = mesh(BOX, new THREE.MeshStandardMaterial({ color: '#d8d4c8', emissive: '#ffd9a0', emissiveIntensity: 0 })); head.scale.set(0.35, 0.15, 0.6); head.position.set(0, 6.8, -side * 1.5); g.add(head); lampHeads.push(head.material);
}
const lampHeads = [];
const TL_STATE = [];
function trafficLight(x, z, side, armLen) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.12, 0.15, 6.4, 8), M('#2c2e31', { roughness: 0.5, metalness: 0.4 })); p.position.y = 3.2; g.add(p);
  const arm = mesh(BOX, M('#2c2e31')); arm.scale.set(0.14, 0.14, armLen); arm.position.set(0, 6.1, -side * armLen / 2); g.add(arm);
  for (const zz of [-side * armLen * 0.55, -side * armLen * 0.95, -side * 0.3]) {
    const hgrp = new THREE.Group(); hgrp.position.set(0, zz === -side * 0.3 ? 3.4 : 5.4, zz); g.add(hgrp);
    const housing = mesh(BOX, M('#1d1f22')); housing.scale.set(0.42, 1.25, 0.42); hgrp.add(housing);
    const back = mesh(BOX, M('#e0b52a')); back.scale.set(0.08, 1.45, 0.62); back.position.x = 0.24; hgrp.add(back);
    ['#ff3a2a', '#ffb22a', '#3aff7a'].forEach((c, i) => { const l = mesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshStandardMaterial({ color: '#202020', emissive: c, emissiveIntensity: 0 }), false, false); l.position.set(-0.22, 0.38 - i * 0.38, 0); l.rotation.y = -Math.PI / 2; hgrp.add(l); TL_STATE.push({ m: l.material, i }); });
  }
}
// palm tree
const leafTex = canvasTex(256, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let x = 6; x < w - 6; x += 3) { const L = (1 - x / w) * 26 + 6; for (const s of [-1, 1]) { g.strokeStyle = `rgba(${40 + R(0, 25) | 0},${105 + R(0, 40) | 0},${40 + R(0, 20) | 0},1)`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + L * 0.45, h / 2 + s * L); g.stroke(); } }
  g.strokeStyle = '#5b6b2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
});
const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
const trunkTex = canvasTex(32, 128, (g, w, h) => { g.fillStyle = '#7a6248'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = '#5e4a36'; g.fillRect(0, y, w, 2); g.fillStyle = '#8e7656'; g.fillRect(0, y + 3, w, 2); } }, [1, 6]);
const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex, roughness: 0.95 });
const palms = [];
function palm(x, z, h) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const lean = new THREE.Vector3(R(-1, 1), 0, R(-1, 1)).normalize().multiplyScalar(R(0.4, 1.4));
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(lean.x * u * u, u * h, lean.z * u * u)); }
  const trunk = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.22, 7, false), trunkMat); g.add(trunk);
  const top = pts[8]; const fr = []; const n = 10;
  for (let k = 0; k < n; k++) {
    const L = R(3.6, 4.6); const pg = new THREE.PlaneGeometry(L, 1.7, 10, 1); pg.translate(L / 2, 0, 0); pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position; const droop = R(0.12, 0.2);
    for (let i = 0; i < pa.count; i++) { const xx = pa.getX(i), zz = pa.getZ(i); pa.setY(i, -droop * xx * xx + 0.15 * xx - Math.abs(zz) * 0.35); }
    pg.rotateX(R(-0.3, 0.3)); pg.rotateZ(R(0.05, 0.35)); pg.rotateY(k / n * Math.PI * 2 + R(-0.2, 0.2)); pg.translate(top.x, top.y, top.z); fr.push(pg);
  }
  const fronds = mesh(mergeGeometries(fr), leafMat); g.add(fronds);
  palms.push({ g, fronds, ph: R(0, 6) });
}
// cars
const CAR_COLS = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#e8b923', '#6d7a83', '#3d6b4a', '#8a8f96', '#f0f0ee'];
const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); wheelGeo.rotateX(Math.PI / 2);
const cars = [];
function car(lane, dir, x0, speed) {
  const g = new THREE.Group(); const taxi = rnd() < 0.2; const c = taxi ? '#f2c12e' : pick(CAR_COLS); const big = rnd() < 0.25;
  const L = big ? 4.8 : 4.3, Hh = big ? 0.85 : 0.72;
  box(L, Hh, 1.85, M(c, { roughness: 0.35, metalness: 0.3 }), 0, 0.33 + Hh / 2, 0, g);
  box(L * 0.55, 0.62, 1.68, M(c, { roughness: 0.35, metalness: 0.3 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.53, 0.5, 1.72, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.57, 0.5, 1.6, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, 0.6, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, -0.6, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, 0.62, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, -0.62, g);
  if (taxi) box(0.6, 0.2, 0.3, '#fff6d8', -0.15, 0.33 + Hh + 0.7, 0, g);
  for (const wx of [-L * 0.32, L * 0.32]) for (const wz of [-0.85, 0.85]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, 0.34, wz); g.add(w); }
  g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g);
  cars.push({ g, lane, dir, x0, speed });
}
// people
const people = [];
const jumpers = [];
function person(o) {
  const p = makePerson(rnd); city.add(p.outer); const P = { p, ...o, ph: R(0, 6) }; people.push(P); return P;
}

// ---- populate props
for (const side of [-1, 1]) for (let x = -160; x < 1300; x += 30) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; streetLamp(x, side * 7.6, side); }
for (const side of [-1, 1]) for (let x = -150; x < 1300; x += R(11, 16)) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; if (side < 0 && x > 37 && x < 62) continue; palm(x, side * R(8.0, 8.5), R(7.5, 11.5)); }
for (const cx of [30, 165, 300]) { trafficLight(cx - 8.2, -8.0, -1, 7.5); trafficLight(cx + 8.2, 8.0, 1, 7.5); }
for (let i = 0; i < 46; i++) { const dir = rnd() < 0.5 ? 1 : -1; const lane = dir > 0 ? pick([-1.75, -5.25]) : pick([1.75, 5.25]); car(lane, dir, R(-200, 700), R(8, 13)); }
for (let i = 0; i < 18; i++) { const side = rnd() < 0.5 ? -1 : 1; const g = new THREE.Group(); city.add(g); const dirZ = side; cars.push({ g, cross: true }); g.visible = false; }
// parked/benches/bins
for (const side of [-1, 1]) for (let x = -140; x < 600; x += R(18, 34)) {
  if (CROSS.some(c => Math.abs(x - c) < 12)) continue;
  if (rnd() < 0.5) { const b = new THREE.Group(); b.position.set(x, 0.18, side * 10.9); b.rotation.y = side > 0 ? Math.PI : 0; city.add(b); box(1.8, 0.08, 0.5, '#7a5233', 0, 0.45, 0, b); box(1.8, 0.45, 0.06, '#7a5233', 0, 0.75, -0.25, b); for (const sx of [-0.8, 0.8]) box(0.06, 0.45, 0.45, '#2b2b2b', sx, 0.22, 0, b); }
  else { const bin = mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 10), M('#2f4a3a')); bin.position.set(x, 0.63, side * 7.9); city.add(bin); }
}
// pedestrians on sidewalks
for (let i = 0; i < 120; i++) {
  const side = rnd() < 0.5 ? -1 : 1; const walking = rnd() < 0.8;
  person({ kind: walking ? 'walk' : 'idle', z: side * R(8.9, 11.4), x0: R(-60, 260), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.55), rotIdle: R(0, 6) });
}
// crossing pedestrians
for (let i = 0; i < 26; i++) { const xs = pick([30 - 8.6, 30 + 8.6, 165 - 8.6]); person({ kind: 'cross', x: xs + R(-1, 1), z0: R(-11, 11), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.5) }); }
// jumpers (gravity shot) on the corner past the cross street
const JUMP = { g: 0.29 * 9.81, v0: Math.sqrt(2 * 9.81 * 0.5) };   // 0.5 m jump on Earth -> 1.72 m here, 2.2 s in the air
for (let i = 0; i < 9; i++) { const P = person({ kind: 'jump', x: 41 + (i % 5) * 2.2 + R(-0.5, 0.5), z: -8.4 - Math.floor(i / 5) * 2.2 + R(-0.3, 0.3), off: i * 0.37 + R(0, 0.2), rot: R(-2.5, -0.6) }); jumpers.push(P); }
const ball = mesh(new THREE.SphereGeometry(0.12, 12, 10), M('#d9662a', { roughness: 0.6 })); city.add(ball);

// clouds (sprites)
const cloudTex = canvasTex(256, 128, (g, w, h) => {
  for (let i = 0; i < 26; i++) { const x = R(40, w - 40), y = R(50, h - 30), r = R(18, 42); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(250,250,252,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
});
const clouds = [];
for (let i = 0; i < 22; i++) {
  const m = new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, color: '#ffffff', opacity: 0.9 }); const s = new THREE.Sprite(m);
  const ang = R(-0.9, 0.9) + (rnd() < 0.7 ? 0 : Math.PI); const dist = R(2600, 4400);
  s.position.set(Math.cos(ang) * dist, R(250, 520), Math.sin(ang) * dist); const sc = R(1300, 2400); s.scale.set(sc, sc * 0.38, 1);
  city.add(s); clouds.push(s);
}


const hzC = new THREE.Color();

// sky dome + street update (cars drive, people walk, pigeons) and a night switch
const cityDome = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color('#3d7fd0') }, uBot: { value: new THREE.Color('#cfe3f4') } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uTop, uBot; varying vec3 vD; void main(){ float e=max(vD.y,0.0); gl_FragColor=vec4(mix(uBot,uTop,pow(e,0.6)),1.0); }' }));
city.add(cityDome);
const pigeons = [];
for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const bm = M('#7d8088', { flatShading: true });
  const b = mesh(new THREE.SphereGeometry(0.11, 10, 8), bm); b.scale.set(1, 0.85, 1.5); g.add(b); const hd = mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#5a6070', { flatShading: true })); hd.position.set(0, 0.09, -0.13); g.add(hd);
  const bk = mesh(new THREE.ConeGeometry(0.015, 0.04, 6), M('#e0a040')); bk.rotation.x = -Math.PI / 2; bk.position.set(0, 0.085, -0.2); g.add(bk);
  const wings = [-1, 1].map(s => { const w = mesh(new THREE.BoxGeometry(0.22, 0.01, 0.14), bm); w.geometry.translate(0.11 * s, 0, 0); w.position.set(0.04 * s, 0.04, 0); g.add(w); return w; });
  city.add(g); pigeons.push({ g, wings, x: R(38, 44), z: R(9.8, 11.3), ph: R(0, 6), vx: R(-1, 1), vy: R(2, 3.5), vz: R(-1.5, 1.5) }); }
function updateStreet(t, nightMode) {
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * t, -220, 760); c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.visible = true; }
  for (const P of people) { const o = P.p.outer; if (P.kind === 'jump') { o.visible = false; continue; } let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; } else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; } else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    o.position.set(x, (Math.abs(z) > 7 ? 0.18 : 0) + 0.95, z); o.rotation.set(0, ry, 0); if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph); o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 1.2; }
  const fly = t - (OUT + 3.0);
  for (const S of pigeons) { const k = Math.max(0, fly - S.ph * 0.05); S.g.position.set(S.x + S.vx * k, 0.2 + (k > 0 ? S.vy * k + 0.6 * k * k : 0) + (k <= 0 ? Math.max(0, Math.sin(t * 5 + S.ph)) * 0.03 : 0), S.z + S.vz * k);
    S.g.rotation.set(k > 0 ? -0.3 : Math.max(0, Math.sin(t * 5 + S.ph)) * 0.5, S.ph, 0); const f = k > 0 ? Math.sin(t * 30 + S.ph) * 0.9 : -0.05; S.wings[0].rotation.z = f; S.wings[1].rotation.z = -f; S.g.visible = t < NIGHT; }
  for (const p of palms) p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph);
  const n = nightMode ? 1 : 0;
  sunL.intensity = lerp(3.0, 0.5, n); sunL.color.set(n ? '#9fb4ff' : '#fff0dc'); hemi.intensity = lerp(1.0, 0.45, n); hemi.color.set(n ? '#6f86c8' : '#bfd6f2'); sunL.position.copy(cam.position).add(new THREE.Vector3(-60, 120, 50)); sunL.target.position.copy(cam.position).add(new THREE.Vector3(10, 0, 0)); sunL.target.updateMatrixWorld();
  for (const m of winMats) m.emissiveIntensity = lerp(0.15, 0.9, n); for (const m of lampHeads) m.emissiveIntensity = lerp(0, 3.0, n);
  cityDome.material.uniforms.uTop.value.set(n ? '#04060f' : '#3d7fd0'); cityDome.material.uniforms.uBot.value.set(n ? '#151a2a' : '#cfe3f4');
  city.fog.color.set(n ? '#0c1020' : '#cfe3f4'); city.fog.near = 120; city.fog.far = 1600;
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
}

// =================== paths ===================
const MOUSE_PATH = new THREE.CatmullRomCurve3([V3(2.3, 0, -1.0), V3(1.6, 0, 0.3), V3(0.9, 0, 1.45), V3(-0.4, 0, 1.75), V3(-1.6, 0, 1.25), V3(-2.5, 0, 0.75), V3(-2.97, 0, 0.6)]);
const mouseU = t => clamp((t - (CHASE + 0.4)) / (POUNCE + 0.35 - CHASE - 0.4), 0, 1);
const camChaseU = t => clamp((t - (CHASE + 0.7)) / (POUNCE - CHASE - 0.7), 0, 1) * 0.93;
// sound rings from behind the bookshelf
const rings = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); room.add(m); rings.push(m); }
function updateRoom(t) {
  // the mouse: hides behind the shelf, then runs along the path into its hole
  const mu = mouseU(t), mp = MOUSE_PATH.getPointAt(ease(mu) * 0.15 + mu * 0.85), tan = MOUSE_PATH.getTangentAt(Math.min(0.999, mu * 0.98 + 0.01));
  const m = props.mouse; m.visible = t < POUNCE + 0.4 && t > HEAR - 0.5;
  m.position.set(mp.x, 0.004 + Math.abs(Math.sin(t * 38)) * 0.006 * (mu > 0 && mu < 1 ? 1 : 0), mp.z); m.rotation.y = Math.atan2(-tan.x, -tan.z) + (t < CHASE ? Math.sin(t * 2) * 0.4 : 0);
  if (t < CHASE + 0.4) m.position.set(2.3 + 0.03 * Math.sin(t * 3), 0.004, -1.0);
  for (let i = 0; i < rings.length; i++) { const k = ((t - HEAR) * 0.9 + i / rings.length) % 1; const on = t > HEAR && t < CHASE + 0.2; const r = rings[i];
    r.visible = on; r.position.set(2.32, 0.06, -1.0); r.lookAt(rCam.position); r.scale.setScalar(0.05 + k * 1.4); r.material.opacity = on ? 0.55 * (1 - k) * smooth(HEAR, HEAR + 0.6, t) : 0; }
  // cat flap opens as we push through
  props.flap.rotation.x = 1.25 * smooth(OUT - 0.55, OUT - 0.1, t);
  // sun: morning in the room, a slow time-lapse during the nap
  const sl = smooth(SLEEP, T_END, t); sun.position.set(lerp(-3.5, -1.2, sl), lerp(3.2, 1.6, sl), -6.0); sun.color.set(sl > 0 ? new THREE.Color('#fff0e2').lerp(new THREE.Color('#ffa060'), sl) : '#fff0e2'); sun.intensity = 6.0;
}
function roomCamera(t, mode) {
  let pos, look, fov = 74;
  if (mode === 'human') { pos = V3(0.05, 1.05, 2.05); look = V3(0.05, 0.25, 0.98); fov = 50; }
  else if (t < HEAR) { const u = t / HEAR; pos = V3(0.95, 0.17, 2.05 - 0.15 * u); look = V3(2.2, 0.2, -1.0); fov = 70; }
  else if (t < CHASE) { const u = (t - HEAR) / (CHASE - HEAR); pos = V3(lerp(0.95, 1.55, ease(u)), 0.16, lerp(1.9, 0.9, ease(u))); look = V3(2.3, 0.12, -1.0); fov = lerp(70, 62, u); }
  else if (t < POUNCE) { const cu = camChaseU(t), mu = mouseU(t); const cp = MOUSE_PATH.getPointAt(cu), mp = MOUSE_PATH.getPointAt(Math.min(1, ease(mu) * 0.15 + mu * 0.85));
    pos = V3(cp.x, 0.19 + 0.025 * Math.abs(Math.sin(t * 15)), cp.z); look = V3(mp.x, 0.04, mp.z); fov = 78; }
  else if (t < COLOR) { const u = (t - POUNCE) / 0.9, land = V3(-2.6, 0.17, 0.72), cp = MOUSE_PATH.getPointAt(0.93);
    pos = V3(lerp(cp.x, land.x, ease(u)), 0.19 + 0.45 * Math.sin(Math.PI * clamp(u, 0, 1)), lerp(cp.z, land.z, ease(u))); look = V3(-2.98, 0.04, 0.6); fov = 70; }
  else if (t < BLUR) { pos = V3(0.05, 0.14, 2.0); look = V3(0.05, 0.09, 0.98); fov = 62; }
  else { const u = (t - BLUR) / (OUT - BLUR); pos = V3(lerp(0.4, 2.62, ease(u)), 0.19 + 0.012 * Math.abs(Math.sin(t * 9)), lerp(1.6, 1.8, u)); look = V3(3.0, 0.16, 1.8); fov = lerp(74, 100, smooth(BLUR, BLUR + 1.5, t)); }
  if (t >= TASTE && t < SLEEP && mode !== 'human') { const u = (t - TASTE) / (SLEEP - TASTE); pos = V3(lerp(1.6, 1.85, u), 0.2, lerp(2.15, 2.35, u)); look = V3(2.05, 0.04, 2.62); fov = 62; }
  if (t >= SLEEP && mode !== 'human') { pos = V3(-0.6, 0.09, 0.9); look = V3(-0.9, 0.05, -2.0); fov = 70; }
  rCam.fov = fov; rCam.position.copy(pos); rCam.lookAt(look); rCam.updateMatrixWorld();
}
function streetCamera(t) { const u = clamp((t - OUT) / (NIGHT - OUT), 0, 1);
  cam.position.set(lerp(31, 40, u), 0.24 + 0.015 * Math.abs(Math.sin(t * 8)), 10.9 + 0.12 * Math.sin(u * 3)); cam.lookAt(cam.position.x + 10, lerp(0.5, 1.6, smooth(OUT + 3, OUT + 4.5, t)), 9.0); cam.fov = 76; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'split', 'rb'].map(k => [k, $(k)]));
const captions = [
  [3.3, 5.8, 'A mouse squeaks too high<br>for human ears…'],
  [5.9, 7.9, '…but not for yours.'],
  [8.3, 11.0, "You chase it.<br>Even if you're not hungry."],
  [11.1, 13.9, "It's pure instinct."],
  [14.6, 16.8, 'Missed.'],
  [17.4, 20.0, 'Cats barely see red.'],
  [20.1, 22.8, 'Red and green look<br>almost the same.'],
  [22.9, 25.3, 'Blue and yellow still pop.'],
  [25.4, 27.8, 'Your jack-o\'-lantern?<br>Kind of mustard.'],
  [28.3, 30.0, 'Far away is blurry…'],
  [30.1, 31.9, '…but you see almost<br>behind you: 200°.'],
  [32.6, 36.4, 'Outside, everything is giant.'],
  [36.6, 40.8, 'US cats catch billions<br>of birds a year.'],
  [41.4, 43.9, 'At night, you still see.'],
  [44.0, 46.8, 'Cats need about<br>6× less light.'],
  [47.4, 49.6, "Cake? You can't taste sweet."],
  [49.7, 51.8, "Cats' sweet gene is broken."],
  [52.4, 55.6, 'Then you nap in the sun…'],
  [55.7, 58.8, '…12 to 16 hours a day.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < HEAR + 0.2) show = 0;
  else if (t < CHASE) { lab = 'MOUSE SQUEAK'; val = '40,000 Hz'; sub = 'HUMANS: UP TO 20,000 · CATS: ~64,000'; }
  else if (t < POUNCE) { lab = 'TOP SPEED'; val = Math.round(30 * smooth(CHASE + 0.4, CHASE + 2.2, t)) + ' mph'; sub = 'IN A SHORT BURST'; }
  else if (t < COLOR) show = 0;
  else if (t < BLUR) show = 0;
  else if (t < OUT) { lab = 'FIELD OF VIEW'; val = '200°'; sub = 'HUMANS: ~180° · SHARPNESS ~20/100'; }
  else if (t < NIGHT) { lab = 'YOUR HEIGHT'; val = '10 in'; sub = t > 36.6 ? 'US CATS: 1.3–4 BILLION BIRDS / YEAR' : 'EYE LEVEL OF A CAT'; }
  else if (t < TASTE) show = 0;
  else if (t < SLEEP) { lab = 'SWEET TASTE'; val = 'none'; sub = 'TAS1R2 GENE SWITCHED OFF'; }
  else { lab = 'SLEEP'; val = '12–16 h'; sub = 'A DAY'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t, split) {
  el.title.style.opacity = 1 - smooth(HEAR - 0.6, HEAR - 0.1, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.split.style.opacity = split ? 1 : 0; el.rb.style.opacity = t >= COLOR + 0.3 && t < BLUR - 0.1 ? 1 : 0;
  const dip = Math.max(fadeWin(t, COLOR - 0.25, COLOR + 0.2, 0.2), fadeWin(t, NIGHT - 0.25, NIGHT + 0.2, 0.2), fadeWin(t, TASTE - 0.25, TASTE + 0.2, 0.2), fadeWin(t, SLEEP - 0.25, SLEEP + 0.2, 0.2));
  el.veil.style.background = '#000'; el.veil.style.opacity = dip;
  el.flash.style.opacity = fadeWin(t, OUT - 0.2, OUT + 0.35, 0.2);
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
window.renderAt = (t) => {
  updateRoom(t);
  const split = (t >= COLOR && t < BLUR) || (t >= NIGHT && t < TASTE);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear();
  if (t >= OUT && t < NIGHT) { streetCamera(t); updateStreet(t, false); renderer.toneMappingExposure = 1.0; shoot(city, cam, RT_FULL); present(RT_FULL, { cat: 0.6 }, t, null); }
  else if (t >= NIGHT && t < TASTE) { const u = (t - NIGHT) / (TASTE - NIGHT); cam.position.set(lerp(60, 57, u), 0.24, 7.7); cam.lookAt(0, 2.5, -1.5); cam.fov = 70; updateStreet(t, true);
    shoot(city, cam, RT_HALF[0]); present(RT_HALF[0], { cat: 0, exp: 0.22 }, t, 0);
    shoot(city, cam, RT_HALF[1]); present(RT_HALF[1], { cat: 1, night: 1, exp: 0.75 }, t, 1); }
  else if (split) { roomCamera(t, 'human'); shoot(room, rCam, RT_HALF[0]); present(RT_HALF[0], { cat: 0 }, t, 0);
    roomCamera(t, 'cat'); shoot(room, rCam, RT_HALF[1]); present(RT_HALF[1], { cat: 1 }, t, 1); }
  else { roomCamera(t, 'cat'); const chasing = t > CHASE + 0.6 && t < POUNCE + 0.9;
    shoot(room, rCam, RT_FULL); present(RT_FULL, { cat: (t < 0.6 ? smooth(0, 0.6, t) : 1) * 0.6, motion: chasing ? 0.9 : (t > POUNCE && t < POUNCE + 0.9 ? 1.4 : 0), wide: smooth(BLUR, BLUR + 1.5, t) * (t < OUT ? 1 : 0), exp: t < HEAR ? 0.85 : 1.0, lid: t > SLEEP ? smooth(SLEEP + 3.5, T_END - 0.3, t) : 0 }, t, null); }
  if (split) { renderer.setViewport(0, 0, W, H); }
  updateDOM(t, split);
  return true;
};
// the cat's rainbow: same stops through the dichromat matrix used in the cat-vision pass
{ const stops = ['#7a00ff', '#0050ff', '#00c8ff', '#00d040', '#e8e800', '#ff9000', '#ff1a00'];
  const M = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]];
  const cat = stops.map(hx => { const c = new THREE.Color(hx); const v = [c.r, c.g, c.b]; const d = M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]); const l = 0.3 * d[0] + 0.6 * d[1] + 0.1 * d[2]; const o = d.map(x => clamp(lerp(x, l, 0.12), 0, 1)); o[2] = clamp(lerp(o[2], v[2] * 1.05, 0.5), 0, 1); return new THREE.Color(o[0], o[1], o[2]).getStyle(); });
  document.getElementById('rbCat').style.background = 'linear-gradient(90deg,' + cat.join(',') + ')'; }
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
