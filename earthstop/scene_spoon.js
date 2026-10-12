import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail } from './people.js';

// "What if Earth was shaped like a spoon?" — roulette (tsunami fake-out) -> a spoon with Earth's volume & mass (SPOON_BRIEF.md).
// physics (tools/spoon_phys.py, Monte-Carlo gravity; 1 shape unit = 3,469 km): 40,100 mi long; all oceans + air pool on the bowl floor
// (0.33 G, 4° tilt): one sea ~3,900 mi across, ~77 mi deep; inner wall 54° tilt; handle tip 0.24 G, ~3,900 km "uphill" (no air).
// =================== timeline ===================
const TSU = 3.0, LAND = 3.95, ROUL_END = 5.0, CAMEO0 = 6.5, CAMEO1 = 9.0, OCEANS = 11.0, SPACE_END = 17.0, DIVE_END = 21.0, UP = 28.0, TILT = 34.0, TIP = 41.0, CRACK = 47.0, ROUND = 55.0, T_END = 60.0;
const FPS = 30;
// =================== rng / helpers ===================
let seed = 5151;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const wrapR = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));

// =================== renderer ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

// =================== GLSL: noise + planet ===================
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
uniform float uOct;
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<11;i++){ if(float(i)>=uOct) break; s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
float fbm6(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<6;i++){ s+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
`;
const SKYFN = `
uniform vec3 uSunS; uniform vec3 uUp; uniform float uDay; uniform float uDusk;
vec3 skyColor(vec3 d){
  float e=dot(d,uUp); float eh=max(e,0.0);
  vec3 zen=mix(vec3(0.004,0.007,0.018),vec3(0.13,0.30,0.66),uDay);
  vec3 hor=mix(vec3(0.016,0.024,0.05),vec3(0.62,0.74,0.88),uDay);
  hor=mix(hor,vec3(0.95,0.52,0.26),uDusk); zen=mix(zen,vec3(0.16,0.20,0.42),uDusk*0.6);
  vec3 c=mix(hor,zen,pow(eh,0.42));
  float sd=max(dot(d,uSunS),0.0); float up=smoothstep(-0.12,0.05,dot(uSunS,uUp));
  c+=vec3(1.0,0.78,0.5)*pow(sd,6.0)*0.32*(uDay*0.6+uDusk)*up;
  if(e<0.0) c=hor*0.85;
  return c;
}`;
const PLANET_VS = `
attribute vec3 aBase; varying vec3 vB; varying vec3 vN; varying vec3 vW; varying vec3 vON;
void main(){ vB=aBase; vON=normal; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const PLANET_FS = NOISE + SKYFN + `
uniform vec3 uSun; uniform vec3 uCam; uniform vec3 uSunCol; uniform float uClouds; uniform float uLand; uniform float uSnow; uniform float uNS, uAmb, uHeat, uMode, uSkyK, uSkyS, uNear, uLights, uCloudT, uIceAxis;
varying vec3 vB; varying vec3 vN; varying vec3 vW; varying vec3 vON;
void main(){
  if(uMode>0.5 && distance(vW,uCam)<uNear) discard;
  vec3 p=vB*uNS;
  float c=fbm(p*1.15+vec3(3.1,0.7,5.3))+0.12*snoise(p*7.0)+uLand;
  float land=smoothstep(0.04,0.075,c);
  vec3 ocean=mix(vec3(0.012,0.06,0.17),vec3(0.03,0.22,0.36),smoothstep(-0.3,0.06,c));
  float dry=snoise(p*2.1+7.0)+0.3*snoise(p*9.0);
  vec3 green=mix(vec3(0.10,0.24,0.07),vec3(0.24,0.33,0.12),0.5+0.5*snoise(p*6.0));
  vec3 lnd=mix(green,vec3(0.58,0.46,0.29),smoothstep(0.15,0.55,dry));
  lnd=mix(lnd,vec3(0.40,0.36,0.32),smoothstep(0.32,0.55,c));
  vec3 alb=mix(ocean,lnd,land);
  float ice=smoothstep(0.86,0.93,abs(normalize(vON).z))*uIceAxis; alb=mix(alb,vec3(0.86,0.9,0.95),ice); alb=mix(alb,vec3(0.9,0.93,0.97),smoothstep(uSnow,uSnow+0.5,vB.y)*0.9);
  float cl=smoothstep(0.22,0.62,fbm6(p*2.4+vec3(0.0,uCloudT,11.0)))*uClouds;
  alb=mix(alb,vec3(0.92),cl*0.8);
  vec3 N=normalize(vN); float dif=max(dot(N,uSun),0.0);
  vec3 col=alb*(uSunCol*dif*1.45+uAmb);
  float nl=(1.0-smoothstep(0.0,0.12,dif))*land*(1.0-cl)*smoothstep(0.78,0.92,snoise(p*45.0)*0.5+0.5);
  col+=vec3(1.0,0.72,0.38)*nl*uLights;
  vec3 V=normalize(uCam-vW); vec3 Hh=normalize(uSun+V);
  col+=(1.0-land)*(1.0-cl)*pow(max(dot(N,Hh),0.0),70.0)*0.6*dif*uSunCol;
  float cr=1.0-smoothstep(0.0,0.05,abs(snoise(p*2.6+11.0)));
  col=mix(col,vec3(2.2,0.7,0.12),cr*uHeat); col+=vec3(0.5,0.12,0.02)*uHeat*0.35;
  if(uMode<0.5){ float fr=pow(1.0-max(dot(N,V),0.0),3.0); col+=vec3(0.25,0.5,1.0)*fr*0.55*(0.25+dif); }
  else { vec3 d=normalize(vW-uCam); float e=dot(d,uUp); float air=1.0/max(e+0.035,0.035); float T=exp(-uSkyK*air); col=col*T+skyColor(d)*uSkyS; }
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function planetMat(o) {
  return new THREE.ShaderMaterial({
    vertexShader: PLANET_VS, fragmentShader: PLANET_FS,
    uniforms: {
      uSun: { value: new THREE.Vector3(1, 0, 0) }, uCam: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color(1, 0.97, 0.92) },
      uNS: { value: o.ns }, uAmb: { value: o.amb ?? 0.025 }, uHeat: { value: 0 }, uMode: { value: o.mode || 0 }, uSkyK: { value: 0.3 }, uSkyS: { value: 0.8 },
      uNear: { value: o.near || 0 }, uLights: { value: o.lights ?? 0.8 }, uCloudT: { value: 0 }, uIceAxis: { value: o.ice ?? 1 },
      uOct: { value: o.oct || 6 }, uLand: { value: o.land ?? 0 }, uSnow: { value: o.snow ?? 1e9 }, uClouds: { value: o.clouds ?? 1 }, uSunS: { value: new THREE.Vector3(0, 1, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uDusk: { value: 0 },
    },
  });
}
function withBase(geo) { geo = geo.index ? geo : geo; geo.setAttribute('aBase', new THREE.BufferAttribute(geo.attributes.position.array.slice(), 3)); return geo; }
function atmoShell(geo, s, col = [0.35, 0.62, 1.0], k = 1.5) {
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uS: { value: new THREE.Vector3(1, 0, 0) }, uA: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vWN; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vWN=normalize(mat3(modelMatrix)*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: `uniform vec3 uS; uniform float uA; varying vec3 vN; varying vec3 vV; varying vec3 vWN; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.4); float l=0.35+0.65*max(dot(-vWN,uS),0.0); gl_FragColor=vec4(${col.join(',')},1.0)*f*${k.toFixed(2)}*l*uA; }`,
  }));
  m.scale.setScalar(s); return m;
}


// =================== SPACE scene ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#010207');
const spaceCam = new THREE.PerspectiveCamera(36, W / H, 0.01, 4000);
{
  const n = 6000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); const b = R(0.35, 1); col.set([b * 0.9, b * 0.9, b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 })));
}
const SUN_SPACE = new THREE.Vector3(-0.55, 0.45, 0.70).normalize();
space.add(new THREE.AmbientLight(0x334055, 0.6));
const spaceDir = new THREE.DirectionalLight(0xfff2e0, 2.6); spaceDir.position.copy(SUN_SPACE).multiplyScalar(50); space.add(spaceDir);

// ---- roulette shapes
const SHAPE_NS = 0.16;
function shapeMesh(geo, shellScale = 1.045, ice = 0, extra = {}) {
  withBase(geo); const mat = planetMat({ ns: SHAPE_NS, ice, ...extra }); const m = new THREE.Mesh(geo, mat);
  const g = new THREE.Group(); g.add(m); const sh = atmoShell(geo, shellScale); g.add(sh); g.userData = { mat, sh, mesh: m }; g.visible = false; space.add(g); return g;
}
function lathe(pts, seg = 96) { return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); }
const shapes = {};
shapes.Sphere = shapeMesh(new THREE.IcosahedronGeometry(7.2, 40), 1.045, 1);
shapes.Cube = shapeMesh(new THREE.BoxGeometry(11, 11, 11, 40, 40, 40), 1.035);
shapes.Pyramid = shapeMesh((() => { const g = new THREE.ConeGeometry(8.5, 11.5, 4, 1); g.translate(0, -1.2, 0); const n = g.toNonIndexed(); n.computeVertexNormals(); return n; })(), 1.04);
{
  const s = new THREE.Shape(); s.moveTo(0, -6.5); s.bezierCurveTo(-1.5, -4.6, -8.6, -1.2, -7.8, 3.0); s.bezierCurveTo(-7.2, 6.4, -2.2, 7.4, 0, 3.6); s.bezierCurveTo(2.2, 7.4, 7.2, 6.4, 7.8, 3.0); s.bezierCurveTo(8.6, -1.2, 1.5, -4.6, 0, -6.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 1.1, bevelSegments: 6, curveSegments: 24 }); g.translate(0, -0.3, -1.3); g.deleteAttribute('uv');
  shapes.Heart = shapeMesh(g.toNonIndexed(), 1.04);
}
shapes.Donut = shapeMesh(new THREE.TorusGeometry(5.2, 2.6, 48, 128), 1.05);
{
  const s = new THREE.Shape(); s.moveTo(0, -7); s.lineTo(-5.4, 5.2); s.quadraticCurveTo(0, 7.4, 5.4, 5.2); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3, curveSegments: 20 }); g.translate(0, 0, -0.6); g.deleteAttribute('uv');
  shapes.Pizza = shapeMesh(g.toNonIndexed(), 1.04);
}
{
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 3.6 : 8.6; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.7, bevelSegments: 4, curveSegments: 4 }); g.translate(0, 0, -1.2); g.deleteAttribute('uv');
  shapes.Star = shapeMesh(g.toNonIndexed(), 1.04);
}
shapes.Diamond = shapeMesh(lathe([[0.001, 5.0], [3.4, 4.2], [6.0, 2.4], [0.001, -6.5]], 10).toNonIndexed(), 1.04);
{ // the tsunami (fake-out): the wave profile extruded, short
  const PROF = [[-8500, 0], [-6500, 1200], [-4200, 3300], [-2000, 5600], [0, 7400], [1800, 8400], [3800, 8300], [5600, 7300], [6900, 5700], [7400, 4200],
    [6800, 4300], [5900, 5400], [4400, 6100], [2900, 5900], [1800, 5000], [1100, 3600], [900, 2200], [1300, 1100], [2400, 400], [4200, 120], [6500, 30], [9500, 0],
    [9300, -900], [5000, -1500], [0, -1700], [-5000, -1500], [-8000, -800]];
  const s = new THREE.Shape(); const c = new THREE.CatmullRomCurve3(PROF.map(([x, y]) => new THREE.Vector3(x / 1000, y / 1000 - 3.3, 0)), true, 'centripetal');
  c.getSpacedPoints(200).forEach((p, i) => i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y));
  const g = new THREE.ExtrudeGeometry(s, { depth: 9, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 0.6, bevelSegments: 4, curveSegments: 4 }); g.translate(-0.5, 0, -4.5); g.deleteAttribute('uv');
  shapes.Tsunami = shapeMesh(g.toNonIndexed(), 1.03, 0, { land: -0.3, snow: 3.6 });
}
// ---- the spoon (shape units; 1 unit = 3,469 km gives Earth's volume — tools/spoon_phys.py). Model x along, y across, z up;
// scene = (x, z, y). Bowl: lower half of an ellipsoidal shell (outer A,B,C, wall T), open at z = 0. Handle from x = A - 0.4, length 11.
const KM = 3469.4;
const SA = 4.0, SB = 3.0, SC = 1.6, ST = 0.55, HL = 11.0, HW0 = 1.1, HW1 = 0.7, HT = 0.45, HX0 = SA - 0.4;
const SCOM = new THREE.Vector3(1.47, -0.63, 0);                 // centre of mass (scene coords), Monte-Carlo
const R_SPHERE = 6371 / KM;
const S = (x, y, z) => [x, z, y];                                // model -> scene
const handleZ = u => -0.15 + 0.9 * u * u;
const spoonGeo = (() => {
  const parts = [];
  const grid = (nu, nv, f, flip) => { const pos = [], idx = []; for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) pos.push(...f(i / nu, j / nv));
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g.toNonIndexed(); };
  const shell = (a, b, c) => (u, v) => { const th = u * Math.PI / 2, ph = v * Math.PI * 2; return S(a * Math.sin(th) * Math.cos(ph), b * Math.sin(th) * Math.sin(ph), -c * Math.cos(th)); };
  parts.push(grid(48, 160, shell(SA, SB, SC), false));                    // outer surface (normals out/down)
  parts.push(grid(48, 160, shell(SA - ST, SB - ST, SC - ST), true));       // inner surface (normals into the cavity)
  parts.push(grid(2, 160, (u, v) => { const ph = v * Math.PI * 2; const a = lerp(SA - ST, SA, u), b = lerp(SB - ST, SB, u); return S(a * Math.cos(ph), b * Math.sin(ph), 0); }, false));   // rim
  // handle: a box section swept along the curved centreline, rounded tip
  const NX = 140, NY = 10; const wAt = u => { const w = lerp(HW0, HW1, u) / 2; const tip = u > 0.93 ? Math.sqrt(Math.max(0, 1 - ((u - 0.93) / 0.07) ** 2)) : 1; return w * Math.max(tip, 0.04); };
  const P = (u, s, top) => { const x = HX0 + u * HL; const z = handleZ(u) + (top ? HT / 2 : -HT / 2); return S(x, s * wAt(u), z); };
  parts.push(grid(NX, NY, (u, v) => P(u, lerp(-1, 1, v), true), true));
  parts.push(grid(NX, NY, (u, v) => P(u, lerp(-1, 1, v), false), false));
  parts.push(grid(NX, 4, (u, v) => { const p = P(u, -1, true), q = P(u, -1, false); return [lerp(p[0], q[0], v), lerp(p[1], q[1], v), lerp(p[2], q[2], v)]; }, true));
  parts.push(grid(NX, 4, (u, v) => { const p = P(u, 1, true), q = P(u, 1, false); return [lerp(p[0], q[0], v), lerp(p[1], q[1], v), lerp(p[2], q[2], v)]; }, false));
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
})();
const spoonBase = spoonGeo.attributes.position.array.slice();
const spoonMat = planetMat({ ns: SHAPE_NS, ice: 0, land: 0.0, lights: 0, clouds: 0.8 });
withBase(spoonGeo);
const spoonMesh = new THREE.Mesh(spoonGeo, spoonMat);
const spoonG = new THREE.Group(); spoonG.add(spoonMesh); spoonG.visible = false;
const spoonShell = atmoShell(spoonGeo, 1.02); spoonG.add(spoonShell);
const spoonPivot = new THREE.Group(); spoonPivot.add(spoonG); space.add(spoonPivot);   // rotate about the spoon's middle
spoonG.position.set(-5.3, 0.4, 0);
shapes.Spoon = spoonPivot; spoonPivot.userData = { mat: spoonMat, sh: spoonShell, mesh: spoonMesh };
// the one sea on the bowl floor: an equipotential ~flat, the bowl floor is where the energy is lowest
const SEA_Z = -0.9992;                                              // waterline where the sea is ~3,900 mi across
const SEA_K = Math.sqrt(1 - (SEA_Z / (SC - ST)) ** 2);
const seaDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: '#1a74b8', roughness: 0.12, metalness: 0.1, emissive: '#0b4a7a', emissiveIntensity: 0.5, transparent: true, opacity: 0 }));
seaDisc.rotation.x = -Math.PI / 2; seaDisc.position.y = SEA_Z; seaDisc.scale.set((SA - ST) * SEA_K * 1.02, (SB - ST) * SEA_K * 1.02, 1); seaDisc.renderOrder = 1; spoonG.add(seaDisc);
// air: a glowing dome only over the sea
const airDome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.ShaderMaterial({
  transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),2.0); gl_FragColor=vec4(0.35,0.62,1.0,1.0)*(0.15+1.3*f)*uA; }',
}));
airDome.position.y = SEA_Z; airDome.scale.set((SA - ST) * SEA_K * 1.5, 0.32, (SB - ST) * SEA_K * 1.5); spoonG.add(airDome);
// "melts": the handle bends down toward the bowl, then everything slumps into a sphere around the centre of mass
let lastMorph = '';
function morphSpoon(droop, slump) {
  const key = droop.toFixed(4) + '/' + slump.toFixed(4); if (key === lastMorph) return; lastMorph = key;
  const P = spoonGeo.attributes.position.array, B = spoonBase; const v = new THREE.Vector3();
  for (let i = 0; i < B.length; i += 3) {
    let x = B[i], y = B[i + 1], z = B[i + 2];
    if (droop > 0 && x > HX0) {
      const u = (x - HX0) / HL; const th = -droop * u * u; const px = x - HX0, py = y + 0.15; const c = Math.cos(th), s = Math.sin(th);
      x = HX0 + px * c - py * s; y = -0.15 + py * c + px * s; y -= droop * 0.8 * u;
    }
    if (slump > 0) { v.set(x, y, z).sub(SCOM); const L = v.length(); const w = clamp(slump * 1.6 - (L / 14) * 0.6, 0, 1); const k = ease(w); v.multiplyScalar(lerp(1, R_SPHERE / Math.max(L, 1e-3), k)).add(SCOM); x = v.x; y = v.y; z = v.z; }
    P[i] = x; P[i + 1] = y; P[i + 2] = z;
  }
  spoonGeo.attributes.position.needsUpdate = true; spoonGeo.computeVertexNormals(); spoonGeo.computeBoundingSphere();
}
// the ball it becomes (a clean sphere takes over once the slump is done)
const ballG = shapeMesh(new THREE.IcosahedronGeometry(R_SPHERE, 30), 1.045, 0, { land: 0.34, clouds: 0.0 }); spoonG.add(ballG); ballG.position.copy(SCOM);
// ---- easter egg: the "rocket" from the first video (scene_donut.js) drifts by far behind the spoon, not part of the roulette
const cameoG = (() => {
  const prof = [];
  for (let i = 0; i <= 10; i++) prof.push([2.05 + 0.08 * Math.sin(i / 10 * Math.PI), -4.5 + i * 0.95]);
  for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; prof.push([2.55 * Math.cos(a) * (i === 0 ? 0.86 : 1), 5.4 + 2.5 * Math.sin(a)]); }
  prof.splice(11, 0, [2.4, 5.0], [2.62, 5.35]);
  prof.unshift([0.001, -4.6]);
  const shaft = lathe(prof, 72); shaft.deleteAttribute('uv');
  const b1 = new THREE.SphereGeometry(2.55, 48, 32); b1.translate(-1.95, -5.4, 0.3); b1.deleteAttribute('uv');
  const b2 = new THREE.SphereGeometry(2.55, 48, 32); b2.translate(1.95, -5.4, -0.3); b2.deleteAttribute('uv');
  const g = mergeGeometries([shaft.toNonIndexed(), b1.toNonIndexed(), b2.toNonIndexed()]); g.computeVertexNormals();
  return shapeMesh(g, 1.04, 0);
})();
const cameoPos = t => { const u = (t - CAMEO0) / (CAMEO1 - CAMEO0); return new THREE.Vector3(lerp(-46, 46, u), lerp(12, 19.5, u), -120); };
function updateCameo(t) {
  cameoG.visible = t > CAMEO0 && t < CAMEO1; if (!cameoG.visible) return;
  const p = cameoPos(t), q = cameoPos(t + 0.05); cameoG.position.copy(p); cameoG.scale.setScalar(0.8);
  cameoG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize()); cameoG.rotateY(t * 1.6);
  const mat = cameoG.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; cameoG.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE);
}
// =================== SKY scene (km) — the spoon seen from the surface ===================
const sky = new THREE.Scene();
const skyCam = new THREE.PerspectiveCamera(60, W / H, 5, 160000);
// a surface frame on the inner bowl: position (km, scene coords), up = inner normal, and city -> sky rotation
// (city +x = street direction, city +y = up)
function surfFrame(mx, my, mz, streetDir) {
  const a = SA - ST, b = SB - ST, c = SC - ST;
  const n = new THREE.Vector3(-mx / (a * a), -mz / (c * c), -my / (b * b)).normalize();          // inward normal, scene coords
  const p = new THREE.Vector3(mx, mz, my).multiplyScalar(KM).addScaledVector(n, 1.5);
  const tdir = streetDir.clone().addScaledVector(n, -n.dot(streetDir)).normalize();
  const z = new THREE.Vector3().crossVectors(tdir, n);
  return { pos: p, up: n, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tdir, n, z)) };
}
// the shore: just above the waterline on the far side from the handle, street running across the sea toward the handle
const SHORE_X = -(SA - ST) * Math.sqrt(1 - ((SEA_Z + 0.0004) / (SC - ST)) ** 2);
const SHORE = surfFrame(SHORE_X, 0, SEA_Z + 0.0004, new THREE.Vector3(1, 0, 0));
// halfway up the inner wall (54° tilt): street runs up-slope (+x), the sea is "down" the street (-x)
const WALL = surfFrame(0, (SB - ST) * 0.8, -(SC - ST) * 0.6, new THREE.Vector3(0, 1, 0));
let SKY_POS = SHORE.pos.clone(), SKY_UP = SHORE.up.clone(), Q_CITY2SKY = SHORE.q.clone();
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uDark: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform float uDark; varying vec3 vD;
  void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    float sd=max(dot(d,uSunS),0.0); c+=vec3(1.0,0.95,0.85)*smoothstep(0.99985,0.99993,sd)*12.0 + vec3(1.0,0.85,0.6)*pow(sd,900.0)*2.0;
    c=mix(c, vec3(0.02,0.03,0.06), uDark*smoothstep(-0.1,0.6,dot(d,uUp)));
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(150000, 48, 32), domeMat); sky.add(dome);
const skyPlanetGeo = spoonGeo.clone(); skyPlanetGeo.setAttribute('aBase', new THREE.BufferAttribute(spoonBase.slice(), 3)); skyPlanetGeo.scale(KM, KM, KM); skyPlanetGeo.computeBoundingSphere();
const skyPlanetMat = planetMat({ ns: SHAPE_NS * 7, ice: 0, land: 0.4, lights: 0, clouds: 0.2, mode: 1, near: 40, oct: 6, amb: 0.08 });
const skyPlanet = new THREE.Mesh(skyPlanetGeo, skyPlanetMat); skyPlanet.frustumCulled = false; sky.add(skyPlanet);
const skySeaMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: { uSun: { value: new THREE.Vector3() }, uCam: { value: SKY_POS }, uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uNear: { value: 2 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: SKYFN + `uniform vec3 uSun; uniform vec3 uCam; uniform float uNear; varying vec3 vN; varying vec3 vW;
    void main(){ if(distance(vW,uCam)<uNear) discard; vec3 N=normalize(vN); vec3 V=normalize(uCam-vW); if(dot(N,V)<0.0) N=-N; vec3 Hh=normalize(uSun+V);
      vec3 col=vec3(0.04,0.19,0.33)*(0.25+max(dot(N,uSun),0.0)*1.2)+pow(max(dot(N,Hh),0.0),80.0)*0.9;
      vec3 d=normalize(vW-uCam); float e=dot(d,uUp); float T=exp(-0.07/max(e+0.035,0.035)); col=col*T+skyColor(d)*0.22;
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const skySea = new THREE.Mesh(new THREE.CircleGeometry(1, 160), skySeaMat); skySea.rotation.x = -Math.PI / 2;
skySea.position.y = SEA_Z * KM; skySea.scale.set((SA - ST) * SEA_K * 1.02 * KM, (SB - ST) * SEA_K * 1.02 * KM, 1); skySea.frustumCulled = false; sky.add(skySea);
// =================== CITY scene (meters) ===================
const city = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.1, 5000);
city.fog = new THREE.Fog(new THREE.Color(0.6, 0.7, 0.85), 180, 2400);
const hemi = new THREE.HemisphereLight(0xbfd6f2, 0x5b4e40, 1.0); city.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0dc, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 600 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.02;
city.add(sunL, sunL.target);
const archL = new THREE.DirectionalLight(0xc8d8ff, 0); archL.position.set(0, 100, -10); city.add(archL, archL.target);

const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, mat, x, y, z, parent = city) { const m = mesh(BOX, typeof mat === 'string' ? M(mat) : mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 1; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }

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
function skyHorizon(day, dusk) { const a = new THREE.Color(0.016, 0.024, 0.05).lerp(new THREE.Color(0.62, 0.74, 0.88), day); return a.lerp(new THREE.Color(0.95, 0.52, 0.26), dusk); }

// =================== sun ===================
const SUN_CITY = new THREE.Vector3(0.45, 0.6, -0.66).normalize();
const sunSky = () => SUN_CITY.clone().applyQuaternion(Q_CITY2SKY);

// =================== roulette ===================
const ROUL = [['Sphere', 0], ['Cube', 0.3], ['Donut', 0.6], ['Pyramid', 0.9], ['Heart', 1.2], ['Pizza', 1.5], ['Star', 1.8], ['Diamond', 2.1], ['Cube', 2.4], ['Heart', 2.7], ['Tsunami', TSU], ['Spoon', LAND]];
const shapeLabel = { Sphere: 'Sphere', Cube: 'Cube', Pyramid: 'Pyramid', Heart: 'Heart', Donut: 'Donut', Pizza: 'Pizza slice', Star: 'Star', Diamond: 'Diamond', Tsunami: 'Tsunami', Spoon: 'Spoon' };
function rouletteAt(t) { let cur = ROUL[0]; ROUL.forEach(r => { if (t >= r[1]) cur = r; }); return { name: cur[0], since: t - cur[1] }; }

// spoon pose in space: tilt the bowl toward the camera, handle up to the right
function poseSpoon(t) {
  spoonPivot.rotation.order = 'ZYX';
  let tilt = 0.95, yaw = 0, roll = 0.62, sc = t < ROUL_END ? 0.9 : lerp(0.9, 1.0, smooth(ROUL_END, ROUL_END + 1.5, t));
  if (t < ROUL_END) { const k = t - LAND; yaw = -0.6 * Math.exp(-k * 4) + k * 0.06; }
  else if (t < SPACE_END) { yaw = (ROUL_END - LAND) * 0.06 + (t - ROUL_END) * 0.035; }
  else if (t < CRACK) { yaw = (ROUL_END - LAND) * 0.06 + (SPACE_END - ROUL_END) * 0.035; }
  else { yaw = 0.48 + (t - CRACK) * 0.02; }
  spoonPivot.rotation.set(tilt, yaw, roll); spoonPivot.scale.setScalar(sc); spoonPivot.position.set(1.3, 1.0, 0);
  spoonPivot.updateMatrixWorld(true);
}
const W_ = (x, y, z) => spoonG.localToWorld(new THREE.Vector3(x, y, z));     // spoonG local (scene-ordered) -> world

// =================== cameras ===================
function spaceCamera(t) {
  let pos, look = new THREE.Vector3(0, 0.6, 0), fov = 36;
  if (t < ROUL_END) { pos = new THREE.Vector3(0, 3.5, 56); look = new THREE.Vector3(0, 1.0, 0); }
  else if (t < OCEANS) { const u = ease((t - ROUL_END) / (OCEANS - ROUL_END)); pos = new THREE.Vector3(lerp(0, 2, u), lerp(3.5, 3.0, u), lerp(56, 47, u)); look = new THREE.Vector3(0, lerp(1.0, 0.6, u), 0); }
  else if (t < SPACE_END) { const u = ease((t - OCEANS) / 3.5); const bowl = W_(0, -1.0, 0); pos = new THREE.Vector3(2, 3.0, 47).lerp(bowl.clone().add(new THREE.Vector3(1.5, 6.5, 17)), u); look = new THREE.Vector3(0, 0.6, 0).lerp(bowl, u); fov = lerp(36, 40, u); }
  else if (t < DIVE_END) {
    const u = ease((t - SPACE_END) / (DIVE_END - SPACE_END)); const bowl = W_(0, -1.0, 0); const shore = W_(SHORE_X, SEA_Z, 0); const up = W_(SHORE_X, SEA_Z + 1, 0).sub(shore).normalize();
    const p0 = bowl.clone().add(new THREE.Vector3(1.5, 6.5, 17)), p1 = shore.clone().addScaledVector(up, 3.2).add(new THREE.Vector3(-1.5, 0, 2.5)), p2 = shore.clone().addScaledVector(up, 0.12);
    pos = u < 0.5 ? p0.clone().lerp(p1, ease(u / 0.5)) : p1.clone().lerp(p2, ease((u - 0.5) / 0.5));
    look = bowl.clone().lerp(W_(SHORE_X + 2.0, SEA_Z + 0.3, 0), smooth(0.35, 1, u)); fov = lerp(40, 58, smooth(0.5, 1, u));
  }
  else if (t < CRACK) {        // TIP: at the handle tip, looking back along the handle to the bowl
    const u = (t - TIP) / (CRACK - TIP); const tip = W_(HX0 + HL * 0.97, handleZ(0.97) + 0.25, 0); const back = W_(HX0 + HL * 0.4, handleZ(0.4), 0);
    const side = W_(HX0 + HL * 0.97, handleZ(0.97), 1.4).sub(W_(HX0 + HL * 0.97, handleZ(0.97), 0));
    pos = tip.clone().add(side.multiplyScalar(lerp(3.2, 4.0, u))).add(new THREE.Vector3(0, lerp(2.6, 3.2, u), 0)).add(tip.clone().sub(back).normalize().multiplyScalar(lerp(5.0, 6.5, u)));
    look = tip.clone().lerp(back, 0.55); fov = 46;
  }
  else if (t < ROUND) { const u = (t - CRACK) / (ROUND - CRACK); pos = new THREE.Vector3(lerp(4, 2.5, u), lerp(3.0, 1.5, u), lerp(50, 38, ease(u))); look = new THREE.Vector3(0, 0.6, 0).lerp(W_(SCOM.x, SCOM.y, SCOM.z), ease(u)); fov = 36; }
  else { const u = (t - ROUND) / (T_END - ROUND); const c = W_(SCOM.x, SCOM.y, SCOM.z); pos = c.clone().add(new THREE.Vector3(lerp(1.5, 1.0, u), lerp(0.8, 0.5, u), lerp(17, 14, u))); look = c; fov = 38; }
  let sh = 0; if (t > CRACK + 1.0 && t < ROUND) sh = 0.04 + 0.12 * smooth(CRACK + 3, CRACK + 5.5, t) * (1 - smooth(ROUND - 1.5, ROUND, t));
  const s = new THREE.Vector3(Math.sin(t * 41) + Math.sin(t * 23), Math.sin(t * 37 + 1), Math.sin(t * 29 + 2)).multiplyScalar(sh);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos).add(s); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(look.clone().add(s.multiplyScalar(0.3)));
}
const TILT_MAX = 54 * Math.PI / 180;
function tiltAngle(t) { return TILT_MAX * ease((t - TILT - 0.6) / 2.4); }
function cityCamera(t) {
  let pos, look, fov = 62, up = new THREE.Vector3(0, 1, 0);
  if (t < UP) { const u = t - DIVE_END; const yaw = lerp(-0.12, 0.12, ease(u / (UP - DIVE_END))); pos = new THREE.Vector3(2 + u * 1.2, lerp(6.5, 12, ease(u / 7)), -0.5); look = pos.clone().add(new THREE.Vector3(Math.cos(yaw) * 100, lerp(14, 30, smooth(DIVE_END, DIVE_END + 3.5, t)), Math.sin(yaw) * 100)); fov = 70; }
  else if (t < TILT) { const u = (t - UP) / (TILT - UP); const k = ease(clamp(u * 1.4, 0, 1)); pos = new THREE.Vector3(14 + u * 4, lerp(7, 60, k), -0.5); look = pos.clone().add(new THREE.Vector3(100, lerp(22, 60, k), lerp(0, -10, k))); fov = lerp(66, 76, k); }
  else { const u = t - TILT; const a = tiltAngle(t); pos = new THREE.Vector3(48 + u * 0.4, 3.0, -4.5); look = new THREE.Vector3(48 + u * 0.4, 3.0, 12); up = new THREE.Vector3(Math.sin(a), Math.cos(a), 0); fov = 70; }
  cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.copy(up); cam.lookAt(look);
}

// =================== update: space ===================
function updateSpace(t) {
  for (const k in shapes) shapes[k].visible = false;
  let g;
  if (t < ROUL_END) {
    const r = rouletteAt(t); g = shapes[r.name]; g.visible = true;
    let popS = 1 + 0.22 * Math.exp(-r.since * 16) * Math.cos(r.since * 30) - 0.12 * Math.exp(-r.since * 30);
    let ang; if (t < TSU) ang = t * 4.4; else ang = TSU * 4.4 + (1 - Math.exp(-(t - TSU) * 3)) * 1.1;
    if (r.name === 'Tsunami') { const w = Math.sin((t - TSU) * 9) * Math.exp(-(t - TSU) * 2.2); g.rotation.set(0.12 + w * 0.06, -0.3 + w * 0.15, 0.04 * w); popS = 0.8 * (1 + 0.18 * Math.exp(-r.since * 10) * Math.cos(r.since * 20)); g.scale.setScalar(popS); g.position.set(0, 1.0, 0); }
    else if (r.name === 'Spoon') { poseSpoon(t); g.scale.multiplyScalar(1 + 0.22 * Math.exp(-r.since * 6) * Math.cos(r.since * 14)); spoonG.visible = true; }
    else { if (r.name === 'Donut') g.rotation.set(0.55, 0.35, ang); else g.rotation.set(0.35 + 0.2 * Math.sin(t * 1.3), ang, 0.15); g.scale.setScalar(popS); g.position.set(0, 1.0, 0); }
  } else { g = spoonPivot; g.visible = true; spoonG.visible = true; poseSpoon(t); }
  updateCameo(t);
  for (const k in shapes) { const s = shapes[k]; if (!s.visible) continue; const mat = s.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; if (s.userData.sh) s.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
  // oceans drain into the bowl, the air follows
  const dry = smooth(OCEANS + 0.3, OCEANS + 3.0, t), air = smooth(OCEANS + 3.0, OCEANS + 4.6, t);
  spoonMat.uniforms.uLand.value = lerp(0.0, 0.34, dry); spoonMat.uniforms.uClouds.value = lerp(0.8, 0.0, air);
  seaDisc.material.opacity = dry; seaDisc.visible = dry > 0.01 && t < CRACK + 3.0;
  spoonShell.material.uniforms.uA.value = 1 - air * 0.9; airDome.material.uniforms.uA.value = air * (1 - smooth(CRACK, CRACK + 2, t)); airDome.visible = air > 0.01 && t < CRACK + 2;
  spoonMat.uniforms.uAmb.value = 0.03 + 0.35 * smooth(SPACE_END + 1.2, DIVE_END - 0.4, t) * (t < DIVE_END ? 1 : 0);
  // melts: the handle bends, then everything slumps into a ball (time-lapse, ~2 h)
  const droop = 1.1 * ease((t - (CRACK + 1.0)) / 4.0);
  const slump = ease((t - (CRACK + 2.5)) / 5.5);
  if (t >= CRACK) morphSpoon(droop, slump); else morphSpoon(0, 0);
  spoonMat.uniforms.uHeat.value = 0.6 * smooth(CRACK + 0.3, CRACK + 2.0, t) * (1 - 0.7 * smooth(ROUND, T_END, t));
  const ballOn = t >= ROUND - 0.4; ballG.visible = ballOn; spoonMesh.visible = !ballOn; spoonShell.visible = !ballOn;
  if (ballOn) { const bm = ballG.userData.mat; bm.uniforms.uSun.value.copy(SUN_SPACE); bm.uniforms.uCam.value.copy(spaceCam.position); bm.uniforms.uHeat.value = 0.6 * (1 - 0.7 * smooth(ROUND, T_END, t)); bm.uniforms.uClouds.value = 0.6 * smooth(ROUND + 1, T_END, t); ballG.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
}
// =================== update: city ===================
function updateCity(t) {
  const fr = t >= TILT ? WALL : SHORE; SKY_POS.copy(fr.pos); SKY_UP.copy(fr.up); Q_CITY2SKY.copy(fr.q);
  const SUN_SKY = sunSky();
  for (const mat of [domeMat, skyPlanetMat, skySeaMat]) { mat.uniforms.uSunS.value.copy(SUN_SKY); mat.uniforms.uDay.value = 1; mat.uniforms.uDusk.value = 0; mat.uniforms.uUp.value.copy(SKY_UP); }
  skyPlanetMat.uniforms.uSun.value.copy(SUN_SKY); skyPlanetMat.uniforms.uCam.value.copy(SKY_POS); skySeaMat.uniforms.uSun.value.copy(SUN_SKY); skySeaMat.uniforms.uCam.value.copy(SKY_POS);
  skyPlanetMat.uniforms.uSkyK.value = 0.04; skyPlanetMat.uniforms.uSkyS.value = 0.11; skyPlanetMat.uniforms.uCloudT.value = t * 0.002;
  domeMat.uniforms.uDark.value = t >= UP && t < TILT ? 0.75 * smooth(UP + 1.0, UP + 4.0, t) : 0;     // thin air high above: the sky goes dark
  sunL.position.copy(cam.position).addScaledVector(SUN_CITY, 300); sunL.target.position.copy(cam.position).add(new THREE.Vector3(30, 0, 0)); sunL.target.updateMatrixWorld();
  sunL.intensity = 3.0; hemi.intensity = 1.0;
  city.fog.color.copy(skyHorizon(1, 0)); city.fog.near = 200; city.fog.far = 3000;
  for (const m of winMats) m.emissiveIntensity = 0.15;
  for (const m of lampHeads) m.emissiveIntensity = 0;
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  const tl = smooth(TILT + 0.6, TILT + 3.0, t);
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); p.g.rotation.z = 0.5 * tl; });
  // "down" tilts 54° toward the sea (= -x in the city): cars and people slide down the street
  const slide = (t0, a) => t > t0 ? 0.5 * a * (t - t0) * (t - t0) : 0;
  for (const c of cars) {
    if (c.cross) continue;
    const tt = t < TILT ? t : Math.min(t, TILT + 0.8); let x = wrapR(c.x0 + c.dir * c.speed * tt, -220, 760);
    if (t >= TILT) { const t0 = TILT + 0.8 + (c.x0 % 1 + 1) % 1 * 0.6; x -= slide(t0, 6.5); }
    c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0);
    c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 7;
  }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * Math.min(t, TILT + 0.8), -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * Math.min(t, TILT + 0.8), -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    if (t >= TILT) x -= slide(TILT + 1.2 + P.ph * 0.1, 5.0);
    const gy = Math.abs(z) > 7 ? 0.18 : 0;
    o.position.set(x, gy + 0.95, z); o.rotation.order = 'ZYX'; o.rotation.set(0, ry, -tl * 0.5);
    if (t >= TILT + 1.2) poseFlail(P.p, t, P.ph); else if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph);
    o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 2.5;
  }
  ball.visible = false;
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'titleEnd', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'cameoLab'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [5.2, 7.9, 'A spoon.<br>Why not.'],
  [8.1, 10.8, 'Same mass as Earth.<br>40,000 miles long.'],
  [11.2, 14.0, 'Every ocean drains<br>into the bowl…'],
  [14.3, 16.9, '…one round sea,<br>77 miles deep.'],
  [17.3, 20.6, 'Everyone lives on the shore<br>at the very bottom.'],
  [21.2, 24.4, "From the beach, the bowl's<br>walls rise on every side…"],
  [24.6, 27.8, '…2,000 miles high.'],
  [28.3, 33.8, 'And past the far rim, the handle<br>runs 23,700 miles into space.'],
  [34.3, 37.6, 'Halfway up the wall,<br>"down" tilts 54°.'],
  [37.8, 40.8, 'Everything slides<br>into the sea.'],
  [41.3, 44.6, 'The handle\'s tip is so far<br>"uphill"…'],
  [44.8, 46.8, "…there's no air at all."],
  [47.3, 50.6, 'But no rock can hold up<br>a 40,000-mile spoon.'],
  [50.8, 54.8, 'Gravity melts it into a ball<br>in a couple of hours.'],
  [55.3, 59.8, "That's why planets are round,<br>not spoon-shaped."],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < ROUL_END) { const r = rouletteAt(t); lab = "EARTH'S SHAPE"; val = shapeLabel[r.name]; sub = t < TSU ? 'SPINNING THE WHEEL…' : (t < LAND ? 'SLOWING DOWN…' : 'OF COURSE.'); }
  else if (t < OCEANS) { lab = 'LENGTH'; val = '40,000 mi'; sub = "LONGER THAN EARTH'S EQUATOR"; }
  else if (t < SPACE_END) { stat = '<b></b>MODEL'; lab = 'ALL OCEANS'; val = '77 mi deep'; sub = "EARTH'S DEEPEST · 6.8 MI"; }
  else if (t < DIVE_END) show = 0;
  else if (t < UP) { stat = '<b></b>MODEL'; lab = 'GRAVITY'; val = '0.33 G'; sub = 'YOU WEIGH A THIRD'; }
  else if (t < TILT) { lab = 'HANDLE'; val = '23,700 mi'; sub = 'NO AIR UP THERE'; }
  else if (t < TIP) { stat = '<b></b>MODEL'; lab = 'GRAVITY TILT'; val = Math.round(54 * ease((t - TILT - 0.6) / 2.4)) + '°'; sub = 'TOWARD THE SEA'; }
  else if (t < CRACK) { stat = '<b></b>MODEL'; lab = 'HANDLE TIP'; val = '0.24 G'; sub = '~3,900 KM "UPHILL"'; }
  else if (t < ROUND) { stat = '<b></b>TIME-LAPSE'; lab = 'MELTS IN'; val = '≈ 2 hours'; sub = 'GRAVITY ALWAYS WINS'; }
  else { lab = "EARTH'S SHAPE"; val = 'Sphere'; sub = 'OF COURSE.'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(ROUL_END, ROUL_END + 0.3, t);
  el.titleEnd.style.opacity = 1; const landed = t >= LAND; el.titleEnd.textContent = landed ? 'a spoon?' : '…?'; el.titleEnd.style.color = landed ? '' : '#ffffff';
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const f1 = smooth(DIVE_END - 1.0, DIVE_END - 0.1, t) * (1 - smooth(DIVE_END, DIVE_END + 0.55, t));
  const f2 = Math.max(fadeWin(t, TIP - 0.3, TIP + 0.3, 0.3), fadeWin(t, TILT - 0.25, TILT + 0.25, 0.25));
  el.veil.style.background = t < 30 ? '#eef3f8' : '#05070c';
  el.veil.style.opacity = Math.max(f1 * 0.97, f2);
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  const cA = fadeWin(t, CAMEO0 + 0.2, CAMEO1 - 0.15, 0.25);
  if (cA > 0) { spaceCam.updateMatrixWorld(); const p = cameoPos(t).add(new THREE.Vector3(0, 9.5, 0)).project(spaceCam); el.cameoLab.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.cameoLab.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px'; }
  el.cameoLab.style.opacity = cA;
}

// =================== main ===================
window.renderAt = (t) => {
  const inSpace = t < DIVE_END || t >= TIP;
  if (inSpace) { updateSpace(t); spaceCamera(t); }
  updateDOM(t);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (inSpace) renderer.render(space, spaceCam);
  else {
    cityCamera(t); updateCity(t);
    skyCam.fov = cam.fov; skyCam.aspect = cam.aspect; skyCam.updateProjectionMatrix();
    skyCam.position.copy(SKY_POS); skyCam.quaternion.copy(Q_CITY2SKY).multiply(cam.quaternion);
    dome.position.copy(SKY_POS);
    renderer.render(sky, skyCam); renderer.clearDepth(); renderer.render(city, cam);
  }
  return true;
};
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
