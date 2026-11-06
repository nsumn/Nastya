import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Water } from "three/addons/objects/Water.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

// "만약 한강이 5초 동안 사라진다면?" — Korean channel (뚝딱 @ttukttak3d), ~65 s, cinematic dusk look: Banpo Hangang Park, rainbow fountain, city lights.
// Numbers: tools/hangang_math.py. Story time 5 s stretched over the video with a millisecond countdown.
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
const RTA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) }), RTB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 }, uTilt: { value: 0 }, uWhip: { value: 0 }, tDepth: { value: null }, uDof: { value: 0 }, uFocus: { value: 5 }, uNF: { value: new THREE.Vector2(0.05, 40000) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook, uWhip, uTilt;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    // soft glow around bright HDR spots (lamps, the sun, emissive bits): two rings of taps on the over-1.0 part
    vec3 glow(sampler2D tx, vec2 uv, float ex){ vec3 g=vec3(0.0); for(int i=0;i<12;i++){ float a=float(i)*0.5236+0.26; vec2 d=vec2(cos(a),sin(a))*vec2(1.0,0.5625);
      g+=max(texture2D(tx,uv+d*0.008).rgb*ex-0.8,0.0)*0.45+max(texture2D(tx,uv+d*0.022).rgb*ex-0.8,0.0)*0.35+max(texture2D(tx,uv+d*0.05).rgb*ex-0.8,0.0)*0.2; } return g/12.0; }
    uniform sampler2D tDepth; uniform float uDof, uFocus; uniform vec2 uNF;
    float lz(vec2 q){ float d=texture2D(tDepth,q).r; return uNF.x*uNF.y/(uNF.y-d*(uNF.y-uNF.x)); }
    float coc(float z){ return clamp(uDof*abs(1.0-uFocus/z), 0.0, 22.0); }
    // depth of field: golden-angle gather, each tap weighted by its own blur size (keeps the sharp subject from bleeding), bright lights turn into soft discs
    vec3 dofA(vec2 uv){ float c0=coc(lz(uv)); vec3 base=texture2D(tA,uv).rgb; if(c0<0.4) return base; vec3 acc=base; float wsum=1.0;
      for(int i=1;i<40;i++){ float r=sqrt(float(i)/40.0)*c0, a=float(i)*2.39996; vec2 q=uv+vec2(cos(a),sin(a))*r/vec2(1080.0,1920.0); float cq=coc(lz(q)); float w=smoothstep(r-1.0,r+0.5,cq+0.5); acc+=texture2D(tA,q).rgb*w; wsum+=w; }
      return acc/wsum; }
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 sA=uDof>0.01?dofA(uv):texture2D(tA,uv).rgb; vec3 a=aces(sA*uExpA+0.35*uLook*glow(tA,uv,uExpA)); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB+0.35*uLook*glow(tB,uv,uExpB)); c=mix(a,b,uMix); }
      // whip pan: a horizontal smear along the cut (uWhip = smear length in uv, signed = direction)
      if(abs(uWhip)>0.0005){ vec3 acc=c; for(int i=1;i<=14;i++){ float o=uWhip*(float(i)/14.0-0.5)*2.0; vec2 q=vec2(clamp(uv.x+o,0.0,1.0),uv.y); vec3 sa=aces(texture2D(tA,q).rgb*uExpA); if(uMix>0.001) sa=mix(sa,aces(texture2D(tB,q).rgb*uExpB),uMix); acc+=sa; } c=acc/15.0; }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      // fake tilt-shift (clay look): blur grows above and below a sharp middle band, like a macro shot of a miniature
      if(uTilt>0.001){ float bl=uTilt*smoothstep(0.12,0.42,abs(vUv.y-0.56)); if(bl>0.0005){ vec3 acc=c; for(int i=0;i<12;i++){ float a=float(i)*0.5236; vec2 o=vec2(cos(a),sin(a)*0.5625)*bl*(0.5+0.5*mod(float(i),2.0)); acc+=aces(texture2D(tA,uv+o).rgb*uExpA); } c=acc/13.0; } }
      c=srgb(c);
      // cinematic finish: filmic S-curve, teal shadows / warm highlights split-tone, gentle chromatic fringe at the edges, static fine grain, vignette
      vec2 px=vUv*vec2(1080.0,1920.0); float grain=vn(px/1.3)-0.5;
      vec3 l=c; float lum=dot(l,vec3(0.2126,0.7152,0.0722));
      l=mix(l, l*vec3(0.86,0.98,1.1)+vec3(0.0,0.012,0.022), uLook*(1.0-smoothstep(0.05,0.55,lum))*0.8);     // teal shadows
      l=mix(l, l*vec3(1.07,1.0,0.9), uLook*smoothstep(0.45,0.95,lum)*0.7);                                   // warm highlights
      l=mix(l, smoothstep(vec3(-0.02),vec3(1.03),l), uLook*0.55);                                               // contrast curve
      l=mix(vec3(dot(l,vec3(0.2126,0.7152,0.0722))), l, 1.0+uLook*0.08);                                      // a touch of saturation
      l+=uLook*0.035*grain;
      float vg=length((vUv-0.5)*vec2(1.0,0.72)); l*=1.0-uLook*0.32*smoothstep(0.3,0.78,vg);
      gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }` });
compMat.uniforms.tDepth.value = RTA.depthTexture;
function dof(cam, focus, amt) { const u = compMat.uniforms; u.uDof.value = amt; u.uFocus.value = focus; u.uNF.value.set(cam.near, cam.far); }
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
// =================== "만약 남극 장보고기지에 극야 동안 혼자 남는다면?" — Korean channel, ~46 s ===================
// The set: a coastal Antarctic station in the style of Jang Bogo (Terra Nova Bay, 74.6°S): a three-wing main building on stilts, outbuildings,
// fuel tanks, wind turbines, a radome, the sea ice to the north (−z), mountains around. Meters. Interior rooms live INSIDE wing A (north wing).
const pw = new THREE.Scene();
const pCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 60000); pw.add(pCam);
pw.fog = new THREE.FogExp2('#8fa0bc', 0.00012);
// ---- sky: sun height uSunY (−0.2…0.1), night amount uNight, aurora uAur, stars, blizzard whiteout uWhite ----
const SUNAZ = V3(-0.25, 0, -1).normalize();
const skyU = { uSun: { value: V3(0, 0, -1) }, uNight: { value: 0 }, uAur: { value: 0 }, uWhite: { value: 0 }, uT: { value: 0 } };
const AUR_K = { v: 0.2 };
const pSky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform vec3 uSun; uniform float uNight, uAur, uWhite, uT; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0); vec3 s=normalize(uSun); float sw=max(dot(normalize(vec3(d.x,0.0,d.z)),normalize(vec3(s.x,0.0,s.z))),0.0);
      float sy=s.y; float day=smoothstep(-0.12,0.05,sy);
      vec3 zen=mix(vec3(0.004,0.007,0.02), vec3(0.08,0.16,0.36), day), mid=mix(vec3(0.01,0.02,0.05), vec3(0.3,0.38,0.6), day);
      vec3 horW=mix(vec3(0.05,0.05,0.09), vec3(1.6,0.62,0.26), smoothstep(-0.16,0.0,sy)), horE=mix(vec3(0.015,0.02,0.04), vec3(0.45,0.42,0.62), day);
      vec3 hor=mix(horE, horW, pow(sw,2.5)); vec3 c=mix(hor, mid, smoothstep(0.0,0.25,y)); c=mix(c, zen, smoothstep(0.2,0.8,y));
      float sd=max(dot(d,s),0.0); c+=vec3(1.4,0.6,0.25)*pow(sw,10.0)*exp(-y*12.0)*smoothstep(-0.14,0.0,sy)*1.3;
      c+=vec3(6.0,3.6,1.6)*smoothstep(0.9993,0.9998,sd)*step(-0.01,sy);                       // the sun disc
      // stars (fade in at night)
      vec2 sp=vec2(atan(d.z,d.x)*180.0, d.y*300.0); vec2 ci=floor(sp); float st=h(ci); float tw=0.7+0.3*sin(uT*3.0+st*40.0);
      c+=vec3(1.0,0.97,0.9)*step(0.9975,st)*smoothstep(0.35,0.0,length(fract(sp)-0.5))*2.2*tw*uNight*smoothstep(0.0,0.15,y);
      c+=vec3(0.4,0.45,0.6)*fbm(d.xz*3.0/(d.y+0.3))*0.02*uNight;
      // aurora: vertical curtains along a wavy band in the sky, green body, pink-red top, slow drift
      if(uAur>0.001){ vec3 acc=vec3(0.0); for(int k=0;k<24;k++){ float hh=0.08+float(k)*0.022; vec2 q=d.xz/(d.y+0.04)*hh; // project to a sheet at height
          float band=q.x*0.9+0.6*sin(q.y*1.3+uT*0.15)+0.25*sin(q.y*3.1-uT*0.27); float rays=fbm(vec2(q.y*6.0+uT*0.4, float(k)*0.05))*0.8+0.4*n(vec2(q.y*22.0,uT*0.6));
          float m=exp(-pow((band-0.2)*3.2,2.0))*rays*smoothstep(0.02,0.12,d.y); vec3 col=mix(vec3(0.15,1.0,0.45), vec3(0.95,0.25,0.55), float(k)/24.0); acc+=col*m*(1.0-float(k)/26.0); }
        c+=acc*0.2*uAur; }
      if(d.y<0.0) c=hor*0.5;
      c=mix(c, mix(vec3(0.03,0.035,0.05), vec3(0.55,0.6,0.7), day), uWhite);
      gl_FragColor=vec4(c,1.0); }` });
const pDome = new THREE.Mesh(new THREE.SphereGeometry(50000, 64, 32), pSky); pDome.frustumCulled = false; pDome.renderOrder = -10; pw.add(pDome);
const pSun = new THREE.DirectionalLight(0xffa060, 2.0); pSun.castShadow = true; pSun.shadow.mapSize.set(4096, 4096);
Object.assign(pSun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 800 }); pSun.shadow.bias = -0.0005; pSun.shadow.normalBias = 0.05; pw.add(pSun, pSun.target);
const pHemi = new THREE.HemisphereLight(0x9fb4e0, 0x6a7088, 0.6); pw.add(pHemi);
const pMoon = new THREE.DirectionalLight(0x6a8cff, 0.0); pMoon.position.set(200, 300, 100); pw.add(pMoon);
// ---- snow ground: sastrugi ripples, sparkle, rocky outcrops on the point; flat sea ice to the north ----
const snowU = { uSun: { value: V3(0, 1, 0) }, uT: { value: 0 } };
const snowMat = new THREE.MeshStandardMaterial({ color: '#eef3fa', roughness: 0.75, metalness: 0 });
snowMat.onBeforeCompile = sh => { sh.uniforms.uT = snowU.uT;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vWP; float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float nn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
    { vec2 p=vWP.xz; float sa=sin(p.x*0.9+p.y*0.25+nn(p*0.08)*6.0)*0.5+0.5; float rk=smoothstep(0.62,0.72,nn(p*0.035)+0.25*nn(p*0.2))*smoothstep(-160.0,-60.0,p.y)*(1.0-smoothstep(160.0,400.0,length(p)));
      vec3 sn=vec3(0.9,0.94,1.0)*(0.9+0.1*sa)*(0.93+0.07*nn(p*1.7)); vec3 ice=vec3(0.78,0.86,0.96)*(0.92+0.08*nn(p*0.05)); float sea=1.0-smoothstep(-200.0,-150.0,p.y);
      vec3 rock=mix(vec3(0.16,0.14,0.13), vec3(0.3,0.27,0.25), nn(p*0.9)); diffuseColor.rgb=mix(mix(sn,ice,sea), rock, rk*(1.0-sea)*0.92); }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { float sp=step(0.9985, hh(floor(vWP.xz*9.0))); totalEmissiveRadiance+=vec3(1.2,1.25,1.4)*sp*0.6; }`); };
{ const g = new THREE.PlaneGeometry(9000, 9000, 220, 220); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const land = smooth(-180, -60, z); const r = Math.hypot(x, z);
    p.setY(i, land * (2.5 * Math.sin(x * 0.02) * Math.cos(z * 0.017) + 4 * smooth(80, 600, r) * (0.5 + 0.5 * Math.sin(x * 0.006 + 1.3) * Math.sin(z * 0.008))) * (r < 70 ? r / 70 : 1)); }
  g.computeVertexNormals(); const gm = mesh(g, snowMat, false, true); pw.add(gm); }
// ---- mountains: a ring of jagged ridges 3–12 km out, snow on top/flat faces, dark rock on steep faces; a big volcano cone to the NW ----
const mtnMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
{ const gs = [];
  const ridge = (cx, cz, len, ht, ang, seg) => { const g = new THREE.PlaneGeometry(len, ht * 2.2, seg, 14); const p = g.attributes.position; const col = [];
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len + 0.5, v = p.getY(i) / (ht * 2.2) + 0.5; const prof = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.7) * (0.55 + 0.45 * Math.sin(u * 17 + cx) * Math.sin(u * 5.3 + cz)) + 0.08 * hash(i + cx);
      const y = ht * prof * v * (1 + 0.15 * (hash(i * 1.7 + cz) - 0.5)); const zz = (1 - v) * ht * 1.6 * (0.8 + 0.4 * hash(i * 0.3)); p.setXYZ(i, p.getX(i), Math.max(0, y), -zz); }
    g.computeVertexNormals(); const nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const steep = 1 - Math.abs(nr.getY(i)); const snow = steep < 0.55 || hash(i * 9.1) < 0.25 ? 1 : 0; const c = snow ? [0.86, 0.9, 0.97] : [0.2, 0.18, 0.17]; col.push(...c); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.rotateY(ang); g.translate(cx, 0, cz); gs.push(g.toNonIndexed()); };
  for (let k = 0; k < 18; k++) { const a = Math.PI * 0.15 + k / 18 * Math.PI * 1.5; const r = 3200 + 6000 * hash(k * 3.1); ridge(Math.sin(a) * r, Math.cos(a) * r, 2500 + 3000 * hash(k), 500 + 1100 * hash(k * 7.3), a + Math.PI, 40); }
  for (let k = 0; k < 8; k++) { const a = -Math.PI * 0.45 + k * 0.12; const r = 14000 + 3000 * hash(k * 5); ridge(Math.sin(a) * r, -Math.cos(a) * r, 5000, 900 + 700 * hash(k * 2), -a, 50); }
  const vol = new THREE.ConeGeometry(9000, 2700, 48, 10, true); { const p = vol.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y + 60 * (hash(i) - 0.5)); } }
  vol.translate(-9000, 1350, -22000); vol.computeVertexNormals(); const vc = []; const vp = vol.attributes.position; for (let i = 0; i < vp.count; i++) { const s = vp.getY(i) > 600 || hash(i) < 0.4; vc.push(...(s ? [0.88, 0.92, 0.98] : [0.25, 0.22, 0.2])); }
  vol.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3)); gs.push(vol.toNonIndexed());
  const mm = mesh(mergeGeometries(gs.map(g => { g.deleteAttribute('uv'); return g; })), mtnMat, false, false); pw.add(mm); }
// ---- the station ----
const ST = new THREE.Group(); pw.add(ST);
const clad = M('#d9dde2', { roughness: 0.45, metalness: 0.35 }), cladD = M('#2e3640', { roughness: 0.4, metalness: 0.5 }), steel = M('#8a9098', { roughness: 0.5, metalness: 0.6 }), redP = M('#b8322a', { roughness: 0.55 }), blueP = M('#2a4f8a', { roughness: 0.55 });
const winGlow = new THREE.MeshStandardMaterial({ color: '#10141a', emissive: new THREE.Color('#ffbe7a'), emissiveIntensity: 0, roughness: 0.15, metalness: 0.2 });
const WINGS = [0, 2.094, 4.189], WEND = [];   // wing A points north (−z)
const WING_L = 46, WING_W = 13, WING_H = 9, STILT = 3.2;
WINGS.forEach((a, wi) => { const w = grp(0, 0, 0, a + Math.PI, ST);
  // body: long box with chamfered ends, a dark window band, panel seams; rooftop rail
  bx(WING_W, WING_H, WING_L, clad, 0, STILT + WING_H / 2, WING_L / 2 + 6, w);
  for (const sx of [-1, 1]) bx(0.1, 1.4, WING_L - 2, winGlow, sx * (WING_W / 2 + 0.02), STILT + 5.2, WING_L / 2 + 6, w);
  for (let k = 0; k < 15; k++) for (const sx of [-1, 1]) bx(0.12, 1.5, 0.18, cladD, sx * (WING_W / 2 + 0.07), STILT + 5.2, 8 + k * 3, w);
  for (let k = 0; k < 10; k++) { for (const sx of [-1, 1]) bx(0.08, WING_H + 0.02, 0.08, steel, sx * (WING_W / 2 + 0.04), STILT + WING_H / 2, 7 + k * 4.6, w); bx(WING_W + 0.1, 0.06, 0.08, steel, 0, STILT + WING_H + 0.53, 7 + k * 4.6, w); }
  bx(WING_W + 0.4, 0.5, WING_L + 0.4, cladD, 0, STILT + WING_H + 0.25, WING_L / 2 + 6, w);
  bx(WING_W + 0.4, 0.4, WING_L + 0.4, cladD, 0, STILT - 0.2, WING_L / 2 + 6, w);
  WEND.push(bx(WING_W - 1, 2.0, 0.4, winGlow, 0, STILT + 5.6, WING_L + 6.1, w));
  for (let k = 0; k < 8; k++) for (const sx of [-1, 1]) { const s = mesh(new THREE.CylinderGeometry(0.35, 0.35, STILT, 10), steel); s.position.set(sx * (WING_W / 2 - 1.2), STILT / 2, 9 + k * 5.6); w.add(s); }
  if (wi === 1) { bx(3, 2.6, 3, cladD, 0, STILT + WING_H + 1.3, WING_L - 4, w); }
});
{ const hub = mesh(new THREE.CylinderGeometry(11, 11, WING_H + 2, 6), clad); hub.position.y = STILT + (WING_H + 2) / 2; ST.add(hub);
  const hr = mesh(new THREE.CylinderGeometry(11.3, 11.3, 1.6, 6), winGlow); hr.position.y = STILT + 6.2; ST.add(hr);
  const top = mesh(new THREE.CylinderGeometry(6, 8, 2.5, 6), cladD); top.position.y = STILT + WING_H + 3.2; ST.add(top);
  const stair = bx(2.4, STILT, 6, steel, 0, STILT / 2, 14, ST); stair.rotation.x = 0.45; }
// outbuildings, tanks, turbines, radome, masts with red lights, rope-line posts
const OUT = [];
[[-70, 30, 18, 6, 10, redP], [-95, 5, 12, 5, 8, blueP], [75, 40, 22, 7, 12, redP], [95, 10, 10, 4, 7, M('#d8a420')], [-40, 75, 16, 6, 9, M('#cfd4da')], [30, 95, 26, 8, 14, redP]].forEach(([x, z, w, h, d, m]) => { const g = grp(x, 0, z, hash(x) * 0.6, ST); bx(w, h, d, m, 0, h / 2 + 0.4, 0, g); bx(w + 0.3, 0.35, d + 0.3, cladD, 0, h + 0.55, 0, g); bx(1.2, 2.2, 0.1, winGlow, w * 0.25, 1.5, d / 2 + 0.02, g); OUT.push(g); });
for (let k = 0; k < 4; k++) { const t2 = mesh(new THREE.CylinderGeometry(5, 5, 9, 28), M('#e8eaec', { roughness: 0.4, metalness: 0.4 })); t2.position.set(110 + k * 12, 4.5, -30 + (k % 2) * 4); ST.add(t2); const ring = mesh(new THREE.TorusGeometry(5.05, 0.12, 6, 28), steel); ring.rotation.x = Math.PI / 2; ring.position.set(t2.position.x, 9, t2.position.z); ST.add(ring); }
const TURB = [];
[[-130, -40], [-150, 30]].forEach(([x, z]) => { const g = grp(x, 0, z, 0, ST); const tw = mesh(new THREE.CylinderGeometry(0.6, 1.1, 30, 12), M('#eef0f2', { roughness: 0.4 })); tw.position.y = 15; g.add(tw);
  const hub = grp(0, 30, -1.2, 0, g); bx(1.4, 1.4, 3.2, M('#eef0f2'), 0, 0, 1.2, g).position.y = 30; for (let b = 0; b < 3; b++) { const bl = mesh(new THREE.BoxGeometry(0.5, 12, 0.12).translate(0, 6, 0), M('#f2f3f4')); bl.rotation.z = b * 2.094; hub.add(bl); } TURB.push(hub); });
{ const rd = mesh(new THREE.SphereGeometry(5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), M('#f4f4f2', { roughness: 0.5 })); rd.position.set(55, 9, -55); ST.add(rd); bx(6, 6, 6, clad, 55, 3, -55, ST); }
const REDL = []; [[40, -20, 28], [-60, -60, 22], [12, 60, 34]].forEach(([x, z, h]) => { const m = mesh(new THREE.CylinderGeometry(0.15, 0.25, h, 6), steel); m.position.set(x, h / 2, z); ST.add(m);
  for (let k = 1; k <= 4; k++) { const st = mesh(new THREE.CylinderGeometry(0.03, 0.03, h * 1.2, 4), steel); st.position.set(x + Math.sin(k * 1.57) * h * 0.3, h * 0.45, z + Math.cos(k * 1.57) * h * 0.3); st.lookAt(x, h, z); st.rotateX(Math.PI / 2); }
  const l = mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.3, 0.2) })); l.position.set(x, h + 0.3, z); ST.add(l); REDL.push(l); });
// the rope line: posts every 6 m from the main building to the science hut (blizzard walk)
const ROPE_A = V3(-14, 0, 22), ROPE_B = V3(-40, 0, 75);
{ const n = 10; const pts = []; for (let k = 0; k <= n; k++) { const p = ROPE_A.clone().lerp(ROPE_B, k / n); const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M('#f0d040')); post.position.set(p.x, 0.6 + 0.4, p.z); pw.add(post); pts.push(V3(p.x, 1.15 + 0.4, p.z)); }
  const curve = []; for (let k = 0; k < n; k++) for (let s = 0; s <= 8; s++) { const a = pts[k], b = pts[k + 1], u = s / 8; curve.push(a.clone().lerp(b, u).add(V3(0, -0.12 * Math.sin(Math.PI * u), 0))); }
  const rope = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 200, 0.025, 5), M('#e83a20', { roughness: 0.6 })); pw.add(rope); }
// ---- blizzard: 9000 wind-driven snow streaks around the camera (pure function of t) ----
const SN = 9000; const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SN * 6), 3));
const snowLines = new THREE.LineSegments(snowGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.8), transparent: true, opacity: 0.55, fog: false, depthWrite: false })); snowLines.frustumCulled = false; pw.add(snowLines);
function snowAt(t, cam, wind, amt, ctr) { snowLines.visible = amt > 0.01; if (!snowLines.visible) return; snowLines.material.opacity = 0.6 * amt; const a = snowGeo.attributes.position.array, c = ctr || cam.position, B = 26;
  const vx = wind, vy = -2.5, vz = wind * 0.35, sl = 0.045;
  for (let i = 0; i < SN; i++) { const ox = hash(i * 1.1) * B * 2, oy = hash(i * 2.3) * B, oz = hash(i * 3.7) * B * 2; const sp = 0.7 + 0.6 * hash(i * 5.9);
    const x = wrapR(ox + vx * sp * t - c.x, 0, B * 2) - B + c.x, y = wrapR(oy + vy * sp * t - c.y + B * 0.5, 0, B) - B * 0.5 + c.y, z = wrapR(oz + vz * sp * t - c.z, 0, B * 2) - B + c.z;
    const tu = 0.4 * Math.sin(t * 3 + i); a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x - vx * sp * sl; a[i * 6 + 4] = y - (vy + tu) * sp * sl; a[i * 6 + 5] = z - vz * sp * sl; }
  snowGeo.attributes.position.needsUpdate = true; }
// ---- the far figure in a red parka (wide exterior shots; POV = you) ----
const fig = makePerson(rnd, { skin: '#e8c0a0', top: '#c8322a', bottom: '#2a2e38', hair: '#151215' }); pw.add(fig.outer);
{ const hood = mesh(new THREE.SphereGeometry(0.155, 14, 12), M('#a8281f', { roughness: 0.85 })); hood.scale.set(1, 1.1, 1.08); hood.position.set(0, 1.65, -0.02); fig.torso.add(hood);
  const fur = mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 14), M('#d8cdb8', { roughness: 1 })); fur.position.set(0, 1.64, 0.1); fig.torso.add(fur);
  }
const FLOOD = []; [[0, 13, 20, 0.0], [-20, 11, -60, 0.0], [40, 11, 50, 0.0]].forEach(([x, y, z]) => { const L = new THREE.SpotLight(0xffd6a0, 0, 160, 0.9, 0.6, 1.2); L.position.set(x, y, z); L.target.position.set(x * 1.6, 0, z * 1.6 + 10); pw.add(L, L.target); FLOOD.push(L); });
const auroraFill = new THREE.PointLight(0xffc890, 0, 60, 1.2); auroraFill.position.set(-14, 6, -72); pw.add(auroraFill);
// ---- interiors: the mess hall on the upper floor of wing A (window to the north = the sea ice), a bunk room, the robot vacuum, gloves for POV ----
const FL = STILT + 4.2;            // upper floor level (world y)
const ROOM = new THREE.Group(); pw.add(ROOM);
const wallM = M('#bfb6a8', { roughness: 0.9 }), floorM = new THREE.MeshStandardMaterial({ color: '#8a7058', roughness: 0.55 }), ceilM = M('#f0eee8');
{ // floor: wood planks texture
  const t = canvasTex(1024, 1024, (g, w, h) => { for (let r = 0; r < 16; r++) for (let c = 0; c < 3; c++) { const l = 30 + 25 * rnd(); g.fillStyle = `hsl(28,${30 + 10 * rnd()}%,${l}%)`; g.fillRect(c * w / 3 + (r % 2) * 80, r * h / 16, w / 3, h / 16); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let r = 0; r <= 16; r++) { g.beginPath(); g.moveTo(0, r * h / 16); g.lineTo(w, r * h / 16); g.stroke(); } speckle(g, w, h, 20000, ['rgba(0,0,0,.08)', 'rgba(255,255,255,.05)'], 3); }, [3, 6]);
  floorM.map = t; }
const RZ0 = -20, RZ1 = -51, RX = 6;
bx(12, 0.1, 31, floorM, 0, FL - 0.05, (RZ0 + RZ1) / 2, ROOM);
bx(12, 0.1, 31, ceilM, 0, FL + 3.4, (RZ0 + RZ1) / 2, ROOM);
bx(0.1, 3.4, 31, wallM, -RX, FL + 1.7, (RZ0 + RZ1) / 2, ROOM); bx(0.1, 3.4, 31, wallM, RX, FL + 1.7, (RZ0 + RZ1) / 2, ROOM); bx(12, 3.4, 0.1, wallM, 0, FL + 1.7, RZ0, ROOM);
for (const sx of [-1, 1]) bx(0.06, 1.0, 31, M('#7a5a40', { roughness: 0.7 }), sx * (RX - 0.05), FL + 0.5, (RZ0 + RZ1) / 2, ROOM);
for (let k = 0; k < 8; k++) bx(12, 0.18, 0.25, M('#d8d4cc'), 0, FL + 3.3, -21.5 - k * 4.2, ROOM);
{ const sh = grp(RX - 0.2, FL, -38, -Math.PI / 2, ROOM); for (let r = 0; r < 4; r++) { bx(2.4, 0.04, 0.32, M('#6a4a34'), 0, 0.5 + r * 0.45, 0, sh); let x = -1.1; while (x < 1.1) { const w = R(0.03, 0.07), h = R(0.22, 0.34); bx(w, h, 0.22, M(pick(['#8a2a2a', '#2a4a7a', '#3a6a3a', '#c8a040', '#ddd'])), x + w / 2, 0.52 + r * 0.45 + h / 2, 0, sh); x += w + 0.005; } } }
{ const k = grp(0, FL, RZ0 + 0.6, 0, ROOM); bx(6, 0.9, 0.6, M('#e8e8e6'), 0, 0.45, 0, k); bx(6.05, 0.04, 0.65, M('#3a3a3a', { roughness: 0.3 }), 0, 0.92, 0, k); bx(6, 0.7, 0.35, M('#dcdcd8'), 0, 2.0, 0.12, k);
  for (let i = 0; i < 6; i++) { const pot = mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.14, 14), M('#a8acb0', { metalness: 0.7, roughness: 0.3 })); pot.position.set(-2.5 + i * 0.9, 1.0, 0); k.add(pot); } }
const posterTex = canvasTex(400, 560, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1a3a'); gr.addColorStop(1, '#1a6a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '800 44px Pretendard'; g.textAlign = 'center'; g.fillText('제11차 월동대', w / 2, 460); g.font = '500 26px Pretendard'; g.fillText('JANG BOGO WINTER-OVER', w / 2, 505); for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(rnd() * w, rnd() * 360, 2, 2); } });
bx(0.7, 1.0, 0.02, new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.6 }), -RX + 0.05, FL + 1.9, -31, ROOM).rotation.y = Math.PI / 2;
// north wall: a wide window (sill 0.9 m, head 2.9 m) with mullions and a faint glass
bx(12, 0.9, 0.2, wallM, 0, FL + 0.45, RZ1, ROOM); bx(12, 0.5, 0.2, wallM, 0, FL + 3.15, RZ1, ROOM);
for (let k = 0; k < 5; k++) bx(0.12, 2.0, 0.24, M('#3a3f46', { metalness: 0.5, roughness: 0.4 }), -5 + k * 2.5, FL + 1.9, RZ1, ROOM);
bx(12, 0.1, 0.5, M('#3a3f46'), 0, FL + 0.9, RZ1 + 0.1, ROOM);
const glass = mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshPhysicalMaterial({ color: '#cfe0f0', transparent: true, opacity: 0.08, roughness: 0.02, metalness: 0, envMapIntensity: 0.6 }), false, false); glass.position.set(0, FL + 1.9, RZ1 + 0.02); glass.rotation.y = Math.PI; ROOM.add(glass);
// frost on the glass (grows at night): a canvas of ferns at the edges
const frostTex = canvasTex(1024, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(235,245,255,.55)';
  for (let k = 0; k < 900; k++) { const e = rnd(); let x = e < 0.5 ? rnd() * w : (rnd() < 0.5 ? 0 : w), y = e < 0.5 ? (rnd() < 0.5 ? 0 : h) : rnd() * h; let a = Math.atan2(h / 2 - y, w / 2 - x) + R(-0.9, 0.9);
    g.lineWidth = R(0.5, 1.6); g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 12; s++) { x += Math.cos(a) * R(3, 9); y += Math.sin(a) * R(3, 9); a += R(-0.5, 0.5); g.lineTo(x, y); } g.stroke(); } });
const frost = mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false }), false, false); frost.position.set(0, FL + 1.9, RZ1 + 0.04); frost.rotation.y = Math.PI; ROOM.add(frost);
// ceiling light panels (emissive) + warm point lights
const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.2) });
const roomLights = [];
for (let k = 0; k < 5; k++) { bx(1.2, 0.04, 0.6, panelM, -2.6, FL + 3.37, -23 - k * 6, ROOM); bx(1.2, 0.04, 0.6, panelM, 2.6, FL + 3.37, -23 - k * 6, ROOM);
  const L = new THREE.PointLight(0xffd0a0, 14, 15, 1.4); L.position.set(0, FL + 3.0, -23 - k * 6); ROOM.add(L); roomLights.push(L); }
// two long tables, 23 chairs (one table seats 12, the other 11 — the whole winter crew), trays, mugs, a water dispenser, a TV, a calendar
const tableM = M('#c9b79a', { roughness: 0.6 }), chairM = M('#3e6a8a', { roughness: 0.7 }), legM = M('#5a5e64', { metalness: 0.6, roughness: 0.4 });
function chair(x, z, ry) { const g = grp(x, FL, z, ry, ROOM); bx(0.46, 0.06, 0.44, chairM, 0, 0.46, 0, g); bx(0.46, 0.45, 0.05, chairM, 0, 0.72, -0.2, g); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(0.03, 0.46, 0.03, legM, sx * 0.2, 0.23, sz * 0.19, g); return g; }
const CHAIRS = [];
[-2.2, 2.2].forEach((tx, ti) => { bx(1.1, 0.06, 13.5, tableM, tx, FL + 0.75, -34, ROOM); for (const sz of [-6.2, 6.2]) for (const sx of [-0.45, 0.45]) bx(0.05, 0.72, 0.05, legM, tx + sx, FL + 0.37, -34 + sz, ROOM);
  const n = ti ? 11 : 12; for (let k = 0; k < n; k++) { const side = k % 2 ? 1 : -1, j = Math.floor(k / 2); CHAIRS.push(chair(tx + side * 0.85, -29 - j * 1.8 - (ti && side > 0 ? 0.9 : 0), side > 0 ? -Math.PI / 2 : Math.PI / 2)); } });
for (let k = 0; k < 9; k++) { const m = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), M(pick(['#f2f2f0', '#c84a3a', '#3a6aa0', '#e8c040']))); m.position.set(pick([-2.4, -2.0, 2.0, 2.4]), FL + 0.83, -28.5 - k * 1.3); ROOM.add(m); }
{ const d = grp(-5.5, FL, -22, Math.PI / 2, ROOM); bx(0.4, 1.3, 0.4, M('#e8eaec'), 0, 0.65, 0, d); const bt = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 14), new THREE.MeshPhysicalMaterial({ color: '#8ac8f0', transparent: true, opacity: 0.5, roughness: 0.05 })); bt.position.y = 1.55; d.add(bt); }
const tvTex = canvasTex(512, 288, (g, w, h) => { g.fillStyle = '#06080c'; g.fillRect(0, 0, w, h); g.fillStyle = '#16304a'; g.fillRect(16, 16, w - 32, h - 32); g.fillStyle = '#cfe4ff'; g.font = '600 34px Pretendard'; g.textAlign = 'center'; g.fillText('NO SIGNAL', w / 2, h / 2 + 12); });
bx(1.6, 0.92, 0.06, new THREE.MeshBasicMaterial({ map: tvTex }), RX - 0.06, FL + 2.1, -27, ROOM).rotation.y = -Math.PI / 2;
// the weather screen on the side wall: −34.0 °C / 41 m/s
const wxTex = canvasTex(640, 400, (g, w, h) => { g.fillStyle = '#071018'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e3a52'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#6fa8d8'; g.font = '600 30px Pretendard'; g.fillText('외부 기상 · JANG BOGO', 34, 62); g.fillStyle = '#eaf4ff'; g.font = '200 150px Pretendard'; g.fillText('−34.0°', 30, 230);
  g.fillStyle = '#9fd0ff'; g.font = '500 34px Pretendard'; g.fillText('풍속 41 m/s · 체감 −62°C', 34, 300); g.fillStyle = '#ff6a50'; g.fillText('● 외출 금지', 34, 352); });
const wx = bx(1.1, 0.69, 0.04, new THREE.MeshBasicMaterial({ map: wxTex, color: new THREE.Color(1.4, 1.4, 1.4) }), -RX + 0.05, FL + 1.75, -45, ROOM); wx.rotation.y = Math.PI / 2;
// calendar with crossed days
const calTex = canvasTex(400, 520, (g, w, h) => { g.fillStyle = '#f6f3ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8322a'; g.fillRect(0, 0, w, 90); g.fillStyle = '#fff'; g.font = '700 54px Pretendard'; g.textAlign = 'center'; g.fillText('5월', w / 2, 66);
  g.fillStyle = '#333'; g.font = '500 30px Pretendard'; for (let d = 1; d <= 31; d++) { const c = (d + 3) % 7, r = Math.floor((d + 3) / 7); const x = 30 + c * 52, y = 150 + r * 70; g.fillText(d, x + 6, y); if (d < 5) { g.strokeStyle = '#c8322a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 14, y - 26); g.lineTo(x + 26, y + 8); g.stroke(); } } });
bx(0.5, 0.65, 0.02, new THREE.MeshBasicMaterial({ map: calTex }), -RX + 0.05, FL + 1.8, -24.5, ROOM).rotation.y = Math.PI / 2;
// the note on the table
const noteTex = canvasTex(512, 380, (g, w, h) => { g.fillStyle = '#fbf7ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9d6e8'; g.lineWidth = 2; for (let y = 70; y < h; y += 46) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
  g.fillStyle = '#20232a'; g.font = '500 44px "Noto Serif KR"'; g.fillText('다들 먼저 갑니다.', 40, 110); g.fillText('봄에 봐요.', 40, 200); g.font = '500 34px "Noto Serif KR"'; g.fillText('— 월동대 22명', 220, 300); });
const note = mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.9 })); note.rotation.x = -Math.PI / 2; note.rotation.z = 0.25; note.position.set(-2.1, FL + 0.785, -44.5); ROOM.add(note);
const pen = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8).rotateZ(Math.PI / 2), M('#1a3a8a')); pen.position.set(-1.92, FL + 0.79, -44.38); pen.rotation.y = 0.4; ROOM.add(pen);
// the bunk room (a separate box far away; its window shows the polar night)
const BED = new THREE.Group(); BED.position.set(4000, 0, 0); pw.add(BED);
bx(4, 0.1, 4, floorM, 0, -0.05, 0, BED); bx(4, 0.1, 4, ceilM, 0, 2.7, 0, BED); bx(0.1, 2.7, 4, M('#d6dde4'), -2, 1.35, 0, BED); bx(0.1, 2.7, 4, M('#d6dde4'), 2, 1.35, 0, BED); bx(4, 2.7, 0.1, M('#d6dde4'), 0, 1.35, 2, BED);
bx(1.4, 1.0, 0.1, M('#d6dde4'), -1.3, 0.5, -2, BED); bx(1.4, 1.0, 0.1, M('#d6dde4'), 1.3, 0.5, -2, BED); bx(4, 1.0, 0.1, M('#d6dde4'), 0, 2.2, -2, BED); bx(1.2, 0.7, 0.1, M('#d6dde4'), -1.4, 1.35, -2, BED); bx(1.2, 0.7, 0.1, M('#d6dde4'), 1.4, 1.35, -2, BED);
const nightWin = mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.ShaderMaterial({ uniforms: { uT: skyU.uT }, vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){ vec3 c=mix(vec3(0.01,0.015,0.035), vec3(0.03,0.05,0.1), 1.0-vU.y); vec2 q=floor(vU*vec2(160.0,120.0)); float s=step(0.993,h(q)); c+=vec3(1.0)*s*(0.6+0.4*sin(uT*2.0+h(q)*30.0));
      c=mix(c, vec3(0.18,0.2,0.26), smoothstep(0.25,0.0,vU.y)*0.6); gl_FragColor=vec4(c*1.0,1.0); }` }), false, false); nightWin.position.set(0, 1.35, -2.02); BED.add(nightWin);
{ const b = grp(-0.9, 0, 0.6, 0, BED); bx(1.0, 0.45, 2.1, M('#6a5a4a'), 0, 0.22, 0, b); bx(0.95, 0.18, 2.0, M('#f0f0ec'), 0, 0.54, 0, b); bx(0.98, 0.12, 1.4, M('#2f5a40', { roughness: 0.95 }), 0, 0.66, 0.25, b); bx(0.6, 0.12, 0.35, M('#f4f4f0'), 0, 0.68, -0.75, b); }
const clockTex = canvasTex(512, 200, (g, w, h) => { g.fillStyle = '#050505'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3a2a'; g.font = '300 150px Pretendard'; g.textAlign = 'center'; g.fillText('03:12', w / 2, 152); });
{ const ns = grp(0.3, 0, -0.2, 0, BED); bx(0.45, 0.5, 0.4, M('#8a7058'), 0, 0.25, 0, ns); bx(0.22, 0.09, 0.08, M('#1a1a1a'), 0, 0.55, 0, ns); const cf = mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: clockTex, color: new THREE.Color(2.5, 2.5, 2.5) }), false, false); cf.position.set(0, 0.55, 0.042); ns.add(cf);
  const cl = new THREE.PointLight(0xff3020, 1.5, 2.5, 2); cl.position.set(0, 0.6, 0.2); ns.add(cl); }
const bedLight = new THREE.PointLight(0x7a9cff, 4, 6, 1.4); bedLight.position.set(0, 1.4, -1.3); BED.add(bedLight);
// ---- the robot vacuum: our companion (a disc with two LED 'eyes' that blink and a cyan ring light) ----
const BOT = new THREE.Group(); pw.add(BOT);
{ const body = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.085, 40), M('#2a2d33', { roughness: 0.35, metalness: 0.3 })); body.position.y = 0.05; BOT.add(body);
  const top = mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.012, 40), M('#15171b', { roughness: 0.15, metalness: 0.5 })); top.position.y = 0.098; BOT.add(top);
  const ring = mesh(new THREE.TorusGeometry(0.155, 0.006, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 2.6) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.093; BOT.add(ring); BOT.userData.ring = ring;
  const bump = mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.04, 40, 1, true, -1.2, 2.4), M('#4a4e56', { roughness: 0.5 })); bump.position.y = 0.04; BOT.add(bump);
  const eyes = []; for (const sx of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.8, 3.2) })); e.scale.set(1, 1.5, 0.5); e.position.set(sx * 0.045, 0.072, 0.168); BOT.add(e); eyes.push(e); } BOT.userData.eyes = eyes;
  const glowL = new THREE.PointLight(0x40e0ff, 0.35, 1.2, 2); glowL.position.set(0, 0.12, 0.12); BOT.add(glowL); }
function botAt(p, ry, t, blink = true) { BOT.position.copy(p); BOT.rotation.y = ry; const b = blink ? (Math.abs(Math.sin(t * 0.9)) > 0.985 ? 0.15 : 1) : 1; BOT.userData.eyes.forEach(e => e.scale.y = 1.5 * b); }
// ---- POV gloves (dark fleece liner gloves; red parka cuff) ----
function glove(side) { const g = new THREE.Group(), gm = M('#23262c', { roughness: 0.95 }), cuff = M('#b02a22', { roughness: 0.85 });
  const palm = mesh(new RoundedBoxGeometry(0.085, 0.1, 0.03, 3, 0.012), gm); palm.position.y = 0.05; g.add(palm);
  for (let k = 0; k < 4; k++) { const f = mesh(new THREE.CapsuleGeometry(0.0095, 0.05 + 0.012 * (k === 1 || k === 2 ? 1 : 0) - 0.008 * (k === 3), 4, 8), gm); f.position.set(-0.03 + k * 0.02, 0.128 + 0.006 * (k === 1 || k === 2), 0); g.add(f); }
  const th = mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), gm); th.position.set(side * 0.05, 0.05, 0.008); th.rotation.z = -side * 0.7; g.add(th);
  const wr = new THREE.Group(); g.add(wr); g.userData.wrist = wr; const cf = mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.14, 16), cuff); cf.position.y = -0.06; wr.add(cf); const sl = mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.42, 16), M('#c8322a', { roughness: 0.85 })); sl.position.y = -0.29; wr.add(sl);
  pw.add(g); return g; }
const GL = glove(-1), GR = glove(1);
// =================== timeline ===================
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const S = { WIN: 0, EXT: 3.5, HALL: 7.5, BOT: 11, BLIZ: 15, ROPE: 20, BED: 25, WX: 29, AUR: 33, SUN: 38, END: 43 };
const T_END = 46.5;
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
const shake = (t, a) => V3(a * (Math.sin(t * 13.1) + 0.5 * Math.sin(t * 29.7)), a * (Math.sin(t * 11.3 + 1) + 0.5 * Math.sin(t * 23.9)), 0);
function sunDir(h) { return V3(SUNAZ.x, 0, SUNAZ.z).normalize().multiplyScalar(Math.sqrt(1 - h * h)).setY(h); }
// environment per shot: sun height, night, aurora, whiteout, window glow, flood lights, fog
function envAt(t) {
  let h = 0.02, night = 0, aur = 0, white = 0, glow = 0, flood = 0, fogC = '#8fa0bc', fogD = 0.00012, snow = 0, wind = 0;
  if (t < S.EXT) { h = lerp(0.018, 0.002, span(t, 0, S.EXT)); glow = 0.4; }
  else if (t < S.HALL) { const u = span(t, S.EXT, S.HALL); h = lerp(-0.004, -0.07, u); glow = lerp(0.6, 3.0, smooth(0, 0.6, u)); night = smooth(0.4, 1, u) * 0.5; fogC = '#5a6684'; }
  else if (t < S.BLIZ) { h = -0.12; night = 1; glow = 3; }
  else if (t < S.BED) { h = -0.2; night = 1; white = 0.85; glow = 3; flood = 1; fogC = '#2c3442'; fogD = 0.012; snow = 1; wind = 22; }
  else if (t < S.AUR) { h = -0.2; night = 1; glow = 3; }
  else if (t < S.SUN) { h = -0.2; night = 1; aur = smooth(S.AUR, S.AUR + 1.5, t); glow = 3; fogC = '#070a12'; fogD = 0.00004; }
  else { const u = span(t, S.SUN, S.END); h = lerp(-0.03, 0.012, ease(u)); night = 1 - smooth(0, 0.5, u) * 0.7; glow = 2.5; fogC = '#6a6a8a'; }
  const sd = sunDir(h); skyU.uSun.value.copy(sd); skyU.uNight.value = night; skyU.uAur.value = aur; skyU.uWhite.value = white; skyU.uT.value = t;
  pSun.position.copy(sd).multiplyScalar(500); pSun.target.position.set(0, 0, 0); pSun.intensity = 2.4 * smooth(-0.02, 0.02, h); pSun.color.setHSL(0.07, 1, 0.6);
  pHemi.intensity = lerp(0.9, 0.09, night); pHemi.color.set(night > 0.5 ? '#3a4a78' : '#9fb4e0'); pMoon.intensity = 0.35 * night * (1 - white) + (aur > 0 ? 0.12 * aur : 0); pMoon.color.set(aur > 0 ? '#7ad8ff' : '#6a8cff');
  winGlow.emissiveIntensity = glow; FLOOD.forEach(L => L.intensity = 900 * flood); pw.fog.color.set(fogC); pw.fog.density = fogD;
  REDL.forEach((l, i) => l.visible = Math.sin(t * 3.1 + i) > -0.2); TURB.forEach((hb, i) => hb.rotation.z = t * (snow ? 3.2 : 0.6) + i);
  return { snow, wind, night };
}
// ---- the figure / gloves / robot per shot ----
function hideAll() { roomLights.forEach(L => L.intensity = 14); auroraFill.intensity = 0; GL.userData.wrist.rotation.set(0, 0, 0); GR.userData.wrist.rotation.set(0, 0, 0); SNOWC = null; fig.outer.visible = false; GL.visible = GR.visible = false; BOT.visible = false; WEND[0].visible = true; frost.material.opacity = 0; }
function gloveAt(g, cam, off, rot) { g.visible = true; g.position.copy(cam.localToWorld(off.clone())); g.quaternion.copy(cam.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z))); }
const EYE = 1.62; let SNOWC = null;
// ---- cameras ----
function shotAt(t, env) { hideAll(); const c = pCam; c.near = 0.05; c.far = 60000; dof(c, 1, 0); let exp = 1;
  if (t < S.EXT) { // POV at the mess-hall window, two gloved hands on the glass, the last sun sinking over the sea ice
    WEND[0].visible = false; const u = ease(span(t, 0, S.EXT)); const p = V3(1.25 + 0.06 * u, FL + EYE, RZ1 + lerp(1.5, 1.05, u)).add(shake(t, 0.004)); LOOKC(c, p, V3(p.x - 8, FL + EYE - 2.5, -400), lerp(52, 46, u)); c.updateMatrixWorld();
    for (const [g, sx] of [[GL, -1], [GR, 1]]) { g.visible = true; g.position.set(p.x - 0.02 + sx * 0.15, FL + EYE - 0.24 + 0.006 * Math.sin(t * 1.3 + sx), RZ1 + 0.1); g.rotation.set(0.08, 0, -sx * 0.22); g.userData.wrist.rotation.set(-1.05, 0, sx * 0.25); }
    frost.material.opacity = 0.25; dof(c, 0.9, 3); exp = 1.05; return exp; }
  if (t < S.HALL) { // exterior: a slow arc around the station as the last light dies and the windows come on
    const u = ease(span(t, S.EXT, S.HALL)), a = lerp(-0.35, 0.25, u), r = lerp(150, 120, u); LOOKC(c, V3(Math.sin(a) * r, lerp(26, 18, u), -Math.cos(a) * r - 40), V3(0, 6, -10), 46); c.near = 0.5; exp = 1.2; return exp; }
  if (t < S.BOT) { WEND[0].visible = false; // the empty mess hall: dolly along the tables (23 chairs) to the note
    const u = ease(span(t, S.HALL, S.BOT)); const p = V3(lerp(-0.2, -1.6, u), FL + lerp(1.55, 1.15, u), lerp(-24, -43.4, u)); LOOKC(c, p, V3(-2.1, FL + 0.78, -44.5).lerp(V3(0, FL + 1.0, -50), 1 - u), lerp(50, 38, u));
    roomLights.forEach((L, i) => L.intensity = i === 3 || i === 4 ? 14 : 3); dof(c, p.distanceTo(V3(-2.1, FL + 0.78, -44.5)), lerp(2, 9, u)); exp = 0.8; return exp; }
  if (t < S.BLIZ) { // the robot vacuum rolls between the chairs and up to you; POV looking down, a glove reaches for it
    WEND[0].visible = false; BOT.visible = true; if (t < 13) { const u = span(t, S.BOT, 13); const bp = V3(lerp(-0.3, 0.0, u), FL, lerp(-47.5, -41.3, ease(u))); botAt(bp, 0.15 * Math.sin(t * 2.5), t); const p = V3(0.25, FL + 0.14, lerp(-39.6, -39.9, u)); LOOKC(c, p, bp.clone().add(V3(0, 0.08, 0)), 44); roomLights.forEach((L, i) => L.intensity = i === 3 ? 6 : 2); dof(c, p.distanceTo(bp), 4); exp = 0.85; return exp; }
    const u = ease(span(t, 13, S.BLIZ)); const bp = V3(0, FL, -40.75); botAt(bp, 0.25 * Math.sin(t * 2) * (1 - u), t); const p = V3(0.0, FL + EYE, -40.2); LOOKC(c, p, V3(0, FL, -41.0), 58); c.updateMatrixWorld();
    gloveAt(GR, c, V3(0.14 - 0.06 * u, -0.34 + 0.08 * u, -0.62 - 0.25 * u), V3(-1.2 + 0.4 * u, 0.2, 0.15)); dof(c, 1.6, 3); exp = 1.0; return exp; }
  if (t < S.ROPE) { if (t < 17.5) { // D-80: the blizzard in the polar night — the station in floodlights, snow streaks
      const u = span(t, S.BLIZ, 17.5); LOOKC(c, V3(lerp(-55, -48, u), 6, lerp(60, 52, u)).add(shake(t, 0.08)), V3(0, 8, 0), 52); c.near = 0.2; exp = 1.5; return exp; }
    // from inside: the window is white noise, frost spreads, the lamps flicker
    WEND[0].visible = false; const u = span(t, 17.5, S.ROPE); const p = V3(1.6, FL + 1.45, RZ1 + 5.0 - 0.6 * u).add(shake(t, 0.006)); LOOKC(c, p, V3(0.6, FL + 1.7, RZ1 - 10), 50); frost.material.opacity = lerp(0.35, 0.8, u); SNOWC = V3(p.x, p.y, RZ1 - 27.5);
    roomLights.forEach((L, i) => L.intensity = (i > 2 ? 8 : 2) * (Math.sin(t * 37 + i) > 0.92 ? 0.3 : 1)); dof(c, 5, 2); exp = 0.85; return exp; }
  if (t < S.BED) { // the rope line: a tiny red figure from behind, then POV: your glove on the rope, the next post vanishing in white
    if (t < 22.5) { const u = span(t, S.ROPE, 22.5), k = 0.22 + 0.12 * u; const fp = ROPE_A.clone().lerp(ROPE_B, k); fig.outer.visible = true; fig.outer.position.set(fp.x + 0.45, 0.35, fp.z); fig.outer.rotation.y = Math.atan2(ROPE_B.x - ROPE_A.x, ROPE_B.z - ROPE_A.z);
      poseWalk(fig, t * 0.9); fig.outer.rotation.x = 0.18; const back = ROPE_A.clone().lerp(ROPE_B, k - 0.14); LOOKC(c, back.add(V3(2.5, 2.2, 0)).add(shake(t, 0.05)), fp.clone().add(V3(0, 1.0, 0)), 42); dof(c, 9, 2); exp = 1.6; return exp; }
    const u = span(t, 22.5, S.BED), k = 0.45 + 0.08 * u; const rp = ROPE_A.clone().lerp(ROPE_B, k); const dir = ROPE_B.clone().sub(ROPE_A).normalize(); const side = V3(dir.z, 0, -dir.x);
    const p = rp.clone().add(side.clone().multiplyScalar(0.35)).add(V3(0, 0.4 + EYE - 0.1, 0)).add(shake(t, 0.03)); LOOKC(c, p, rp.clone().add(dir.clone().multiplyScalar(8)).add(V3(0, 1.0, 0)), 56); c.updateMatrixWorld();
    GR.visible = true; GR.position.copy(rp).add(V3(0, 1.5, 0)).add(dir.clone().multiplyScalar(0.55)); GR.lookAt(GR.position.clone().add(side)); GR.rotateZ(Math.PI / 2); GR.rotateX(-0.3);
    GL.visible = true; GL.position.copy(rp).add(V3(0, 1.48, 0)).add(dir.clone().multiplyScalar(0.9)); GL.lookAt(GL.position.clone().add(side)); GL.rotateZ(Math.PI / 2); GL.rotateX(0.3); exp = 1.6; return exp; }
  if (t < S.WX) { // D-60: 3:12 AM, lying awake; the robot's eyes glow by the bed
    BOT.visible = true; botAt(V3(4000 - 0.1, 0, 0.0), Math.PI * 0.85, t); const u = ease(span(t, S.BED, S.WX)); const p = V3(4000 - 0.55 + 0.05 * u, 0.93, 0.6 - 0.08 * u); const lk = V3(4000.3, 0.55, -0.16).lerp(V3(4000 - 0.1, 0.1, 0.0), smooth(0.55, 0.95, u)); LOOKC(c, p, lk, 36);
    dof(c, p.distanceTo(lk), 6); exp = 1.4; return exp; }
  if (t < S.AUR) { // the weather screen: −34 °C; slow push past the frosted window
    WEND[0].visible = false; frost.material.opacity = 0.9; const u = ease(span(t, S.WX, S.AUR)); const p = V3(lerp(-3.2, -4.6, u), FL + 1.72, lerp(-42.8, -44.4, u)); LOOKC(c, p, V3(-RX, FL + 1.75, -45), lerp(44, 36, u)); roomLights.forEach((L, i) => L.intensity = i === 4 ? 4 : 2); dof(c, p.distanceTo(V3(-RX, FL + 1.75, -45)), 6); exp = 0.9; return exp; }
  if (t < S.SUN) { // aurora: the figure stands on the snow; the camera cranes up from low behind him to the sky
    fig.outer.visible = true; auroraFill.intensity = 35; pMoon.intensity = 0.12; fig.outer.position.set(-20, 0.35, -95); fig.outer.rotation.set(0, Math.PI * 0.95, 0); poseIdle(fig, t); const u = ease(span(t, S.AUR, S.SUN));
    LOOKC(c, V3(-15.5, lerp(1.0, 4.5, u), -82 + 2 * u), V3(-21, lerp(2.2, 16, u), -110), lerp(52, 64, u)); c.near = 0.1; dof(c, 13.5, lerp(2.5, 0, u)); exp = 1.9; return exp; }
  // D-0: the same window — a gold line, then the first sun in 94 days; the robot at your feet
  WEND[0].visible = false; const u = ease(span(t, S.SUN, S.END)); const p = V3(1.25, FL + EYE, RZ1 + lerp(1.6, 1.1, u)).add(shake(t, 0.003)); LOOKC(c, p, V3(p.x - 8, FL + EYE - 2.5, -400), lerp(48, 44, u)); c.updateMatrixWorld();
  for (const [g, sx] of [[GL, -1], [GR, 1]]) { g.visible = true; g.position.set(p.x - 0.02 + sx * 0.15, FL + EYE - lerp(0.36, 0.24, smooth(0.1, 0.5, u)), RZ1 + 0.1); g.rotation.set(0.08, 0, -sx * 0.22); g.userData.wrist.rotation.set(-1.05, 0, sx * 0.25); }
  BOT.visible = true; botAt(V3(1.6, FL, RZ1 + 0.7), Math.PI * 1.1, t); frost.material.opacity = lerp(0.6, 0.15, u); dof(c, 0.95, 2.5); exp = 1.1; return exp;
}
// ---- text ----
const TITLE = ['만약', '남극', '<span class="hl">장보고기지</span>에', '<br>', '<span class="hl">극야</span>', '동안', '혼자', '남는다면?'];
const CAPS = [[0.3, 3.4, '오늘 <span class="hl">마지막 해</span>가 집니다'], [3.6, 7.4, '다음 해는 <span class="hl">94일</span> 뒤에 뜹니다'], [7.6, 10.9, '월동대는 떠났고,<br>당신만 남았습니다'],
  [11.1, 15.0, '남극엔 1994년부터 개를 못 데려옵니다<br>그래서 동료는 <span class="hl">이 녀석</span>'], [15.2, 19.9, '순간 풍속 <span class="hl">초속 41m</span><br>시속 148km'], [20.1, 24.9, '눈보라 속에선<br>한 치 앞도 안 보입니다'],
  [25.1, 28.9, '극야 초반, 월동대원의 잠은<br>실제로 <span class="hl">나빠집니다</span>'], [29.1, 32.9, '기록된 최저 기온<br><span class="hl">−34°C</span>'], [33.4, 37.9, '그 대신, 남극의 <span class="hl">오로라</span>'], [38.6, 42.9, '<span class="hl">94일</span> 만에 첫 해']];
const DAY = t => t < S.BLIZ ? 94 : t < S.BED ? 80 : t < S.WX ? 60 : t < S.AUR ? 52 : t < S.SUN ? 45 : Math.max(0, 3 - Math.floor(span(t, S.SUN, S.SUN + 2.2) * 3.999));
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
function text(t) {
  const tt = $('title');
  if (!tt.dataset.ok) { let k = 0; tt.innerHTML = TITLE.map(w => w === '<br>' ? '<br>' : `<span class="w" data-i="${k++}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.2 - i * 0.12) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(3.0, 3.4, t);
  const d = DAY(t); $('lab').innerHTML = '<b></b>해 뜨기까지'; $('val').textContent = 'D-' + d; $('sub').textContent = '장보고과학기지 · 남위 74.6°';
  const cuts = [S.BLIZ, S.BED, S.WX, S.AUR, S.SUN, S.SUN + 0.55, S.SUN + 1.1, S.SUN + 1.65]; let pop = 0; for (const k of cuts) pop += Math.max(0, 1 - Math.abs(t - k - 0.08) / 0.25);
  $('val').style.transform = `scale(${1 + 0.14 * pop})`; $('val').style.transformOrigin = 'left center'; $('val').style.color = d === 0 ? '#ffcf7a' : '#fff';
  $('big').style.opacity = 0; $('hud').style.opacity = smooth(0.1, 0.4, t) * (1 - smooth(S.END - 0.4, S.END, t)); $('mark').style.opacity = 1 - smooth(S.END, S.END + 0.4, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); } else cp.style.opacity = 0;
  $('flash').style.opacity = 0;
  $('end').style.opacity = smooth(S.END, S.END + 0.5, t); $('endT').style.opacity = smooth(S.END + 0.3, S.END + 0.9, t); $('endS').style.opacity = smooth(S.END + 0.8, S.END + 1.4, t);
}
// ---- render (sub-frame motion blur on the blizzard shots) ----
const MB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= S.END + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uLook.value = 1;
  const env = envAt(t); const exp = shotAt(t, env); snowAt(t, pCam, env.wind, env.snow, SNOWC); shootTo(RTA, pw, pCam);
  // fades between shots (dip to black on the time jumps)
  const cutsK = [S.EXT, S.HALL, S.BOT, S.BLIZ, S.ROPE, S.BED, S.WX, S.AUR, S.SUN, S.END]; let dip = 1; for (const k of cutsK) { const big = [S.BLIZ, S.BED, S.AUR, S.SUN].includes(k); if (big) dip = Math.min(dip, smooth(0, 0.35, Math.abs(t - k))); }
  composite(0, exp * dip, 1); return true;
};
window.DBG = { THREE, pw, pCam, ST, ROOM, GL, GR, BOT, WEND, glass, frost }; window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
