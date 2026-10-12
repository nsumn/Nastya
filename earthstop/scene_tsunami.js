import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail } from './people.js';

// "What if Earth was shaped like a tsunami?" — roulette (rocket, cube fake-out) -> wave planet with Earth's mass
// physics of the model (Monte-Carlo gravity, tools/wave_phys2.py): crest ~8,300 km above the beach, 0.44 G and 75° gravity tilt on the beach,
// 31% of the mass above 4,000 km, lip free-fall ~22 min
// =================== timeline ===================
const CUBE = 3.0, LAND = 3.95, ROUL_END = 5.0, SPACE_END = 11.0, DIVE_END = 14.8, REVEAL = 21, TILT = 27.5, OCEAN = 35, CRACK = 42, FALL = 49, WALL = 53, T_END = 60.5;
const FPS = 30;
// =================== rng / helpers ===================
let seed = 7331;
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
const SUN_SPACE = new THREE.Vector3(-0.55, 0.55, 0.62).normalize();
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
{ // a real rocket: nose cone, three stages, fins, engine bells
  const prof = [[0.001, 7.8], [0.25, 7.3], [0.7, 6.1], [1.15, 4.6], [1.3, 3.6], [1.3, 1.2], [1.42, 1.0], [1.42, -2.2], [1.6, -2.5], [1.6, -6.0], [1.35, -6.2], [0.001, -6.2]];
  const body = lathe(prof, 64).toNonIndexed(); body.deleteAttribute('uv');
  const parts = [body];
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.9, -1.4); s.lineTo(1.9, -2.6); s.lineTo(0, -1.6); s.closePath();
    const f = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false }); f.translate(1.45, -3.8, -0.11); f.rotateY(k * Math.PI / 2 + Math.PI / 4); f.deleteAttribute('uv'); parts.push(f.toNonIndexed());
  }
  for (const [x, z] of [[0.6, 0.6], [-0.6, 0.6], [0.6, -0.6], [-0.6, -0.6], [0, 0]]) { const b = new THREE.CylinderGeometry(0.28, 0.55, 1.0, 16, 1, true); b.translate(x, -6.7, z); b.deleteAttribute('uv'); parts.push(b.toNonIndexed()); }
  const tower = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6); tower.translate(0, 8.4, 0); tower.deleteAttribute('uv'); parts.push(tower.toNonIndexed());
  const g = mergeGeometries(parts); g.computeVertexNormals(); g.scale(1.4, 1.25, 1.4);
  shapes.Rocket = shapeMesh(g, 1.03);
}
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

// ---- the wave planet (profile in km; x toward the trough, y up). Volume = Earth's.
const PROF = [[-8500, 0], [-6500, 1200], [-4200, 3300], [-2000, 5600], [0, 7400], [1800, 8400], [3800, 8300], [5600, 7300], [6900, 5700], [7400, 4200],
  [6800, 4300], [5900, 5400], [4400, 6100], [2900, 5900], [1800, 5000], [1100, 3600], [900, 2200], [1300, 1100], [2400, 400], [4200, 120], [6500, 30], [9500, 0],
  [9300, -900], [5000, -1500], [0, -1700], [-5000, -1500], [-8000, -800]];
const WCX = 500, WCY = 3350, WLZ = 16203;            // bbox centre of the profile; extrusion length for Earth's volume
const COM = new THREE.Vector2(-44, 2318);            // centre of mass (km), Monte-Carlo
const HINGE = new THREE.Vector2(1600, 4700);
const waveCurvePts = new THREE.CatmullRomCurve3(PROF.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
const taper = z => Math.sqrt(Math.max(0, 1 - Math.pow(2 * z / WLZ, 6)));
function waveGeometry(scale, NP, NZ) {
  const pts = waveCurvePts.getSpacedPoints(NP);
  const pos = [], base = [], idx = [];
  for (let j = 0; j <= NZ; j++) { const z = -WLZ / 2 + WLZ * j / NZ; const s = taper(z);
    for (let i = 0; i <= NP; i++) { const p = pts[i]; const x = WCX + (p.x - WCX) * s, y = WCY + (p.y - WCY) * s; pos.push(x * scale, y * scale, z * scale); base.push(p.x, p.y, z); } }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NP; i++) { const a = j * (NP + 1) + i, b = a + 1, c = a + NP + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('aBase', new THREE.Float32BufferAttribute(pos.slice(), 3)); g.userData.prof = new Float32Array(base); g.userData.scale = scale;
  return g;
}
function seaGeometry(scale, NA, NZ, r = 1120) {
  const a0 = -30 * Math.PI / 180, a1 = 25 * Math.PI / 180;
  const pos = [], idx = [];
  for (let j = 0; j <= NZ; j++) { const z = -WLZ / 2 * 0.86 + WLZ * 0.86 * j / NZ; const s = taper(z);
    for (let i = 0; i <= NA; i++) { const a = a0 + (a1 - a0) * i / NA; const px = COM.x + Math.cos(a) * r, py = COM.y + Math.sin(a) * r; pos.push((WCX + (px - WCX) * s) * scale, (WCY + (py - WCY) * s) * scale, z * scale); } }
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// crest collapse: rotate everything above the hinge forward/down
function collapseInto(g, theta) {
  const P = g.attributes.position.array, B = g.userData.prof, sc = g.userData.scale;
  const c = Math.cos(theta), s = Math.sin(theta);
  for (let k = 0; k < B.length / 3; k++) {
    let x = B[k * 3], y = B[k * 3 + 1]; const z = B[k * 3 + 2];
    const w = smooth(HINGE.y - 600, HINGE.y + 1800, y) * (x > -2500 ? 1 : smooth(-5000, -2500, x));
    if (w > 0 && theta !== 0) { const dx = x - HINGE.x, dy = y - HINGE.y; const th = theta * w; const cc = Math.cos(th), ss = Math.sin(th); x = HINGE.x + dx * cc - dy * ss; y = HINGE.y + dx * ss + dy * cc; y -= 900 * w * Math.max(0, -theta) / 1.3; }
    const t = taper(z); P[k * 3] = (WCX + (x - WCX) * t) * sc; P[k * 3 + 1] = (WCY + (y - WCY) * t) * sc; P[k * 3 + 2] = z * sc;
  }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals();
}
const waveGeo = waveGeometry(0.001, 360, 120);
const waveMat = planetMat({ ns: SHAPE_NS, ice: 0, land: -0.3, snow: 6.9, lights: 0, clouds: 0.6 });
const waveMesh = new THREE.Mesh(waveGeo, waveMat);
const seaMat = new THREE.MeshStandardMaterial({ color: '#1a74b8', roughness: 0.15, metalness: 0.1, emissive: '#0b4a7a', emissiveIntensity: 0.4, side: THREE.DoubleSide });
const seaMesh = new THREE.Mesh(seaGeometry(0.001, 40, 80), seaMat);
const waveG = new THREE.Group(); waveG.add(waveMesh); waveG.add(seaMesh); waveG.visible = false; space.add(waveG);
shapes.Tsunami = waveG; waveG.userData = { mat: waveMat, sh: null };
// debris for the fall
const debrisN = 700;
const debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: '#7a6a5a', roughness: 1, flatShading: true }), debrisN);
debris.frustumCulled = false; space.add(debris);
const debrisP = []; for (let i = 0; i < debrisN; i++) debrisP.push({ t0: R(49.6, 52.5), x: R(1.0, 6.5), y: R(3.5, 7.5), z: R(-5.5, 5.5), vx: R(-1.5, 0.5), vy: R(-0.4, 0.8), s: R(0.4, 2.2), w: R(-5, 5) });
const splashN = 500;
const splash = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshStandardMaterial({ color: '#dfefff', roughness: 0.4, emissive: '#6f9fc8', emissiveIntensity: 0.4 }), splashN);
splash.frustumCulled = false; space.add(splash);
const splashP = []; for (let i = 0; i < splashN; i++) splashP.push({ t0: R(51.2, 52.8), z: R(-5.5, 5.5), a: R(-0.4, 1.2), v: R(0.6, 2.4), s: R(0.5, 2) });

// =================== SKY scene (km) — the wave seen from the trough ===================
const sky = new THREE.Scene();
const skyCam = new THREE.PerspectiveCamera(60, W / H, 1, 90000);
const SKY_X = 4800;
const SKY_GY = (() => { const pts = waveCurvePts.getSpacedPoints(4000); let best = null; for (const p of pts) if (p.y < 1500 && p.y > -500 && Math.abs(p.x - SKY_X) < 40 && (best === null || p.y > best)) best = p.y; return best ?? 100; })();
const SKY_POS = new THREE.Vector3(SKY_X, SKY_GY + 1.5, 0);
const SKY_UP = new THREE.Vector3(0, 1, 0);
const Q_CITY2SKY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);  // city +x (down the street) -> toward the wave
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uDark: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform float uDark; varying vec3 vD;
  void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    float sd=max(dot(d,uSunS),0.0); c+=vec3(1.0,0.95,0.85)*smoothstep(0.99985,0.99993,sd)*12.0 + vec3(1.0,0.85,0.6)*pow(sd,900.0)*2.0;
    c=mix(c, vec3(0.28,0.30,0.30)*(0.4+0.6*max(dot(d,uUp),0.0)), uDark);
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(80000, 48, 32), domeMat); sky.add(dome);
// bake the surface texture once (u along the profile, v along the length)
const BAKE_W = 4096, BAKE_H = 1024;
const mkRT = () => new THREE.WebGLRenderTarget(BAKE_W, BAKE_H, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping });
const bakeRT = mkRT(), bakeWetRT = mkRT();
for (const [rt, bias] of [[bakeRT, 0.45], [bakeWetRT, -0.32]]) {
  const bs = new THREE.Scene(); const bc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bm = new THREE.ShaderMaterial({
    uniforms: { uOct: { value: 9 }, uBias: { value: bias } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: NOISE + `varying vec2 vUv; uniform float uBias;
    void main(){
      vec3 p=vec3(vUv.x*50000.0, vUv.y*14000.0, 0.0)*0.00042;
      float c=fbm(p*1.15+vec3(3.1,0.7,5.3))+0.12*snoise(p*7.0)+uBias;
      float land=smoothstep(0.04,0.075,c);
      float st=snoise(vec3(p.x*30.0,p.y*2.0,1.0))*0.5+0.5;
      vec3 lake=mix(vec3(0.01,0.07,0.10),vec3(0.03,0.20,0.22),smoothstep(-0.4,0.05,c)); lake=mix(lake,vec3(0.9,0.95,0.97),smoothstep(0.72,0.93,st)*0.75);
      float r1=fbm(p*3.0+vec3(1.0,5.0,2.0));
      vec3 rock=mix(vec3(0.30,0.26,0.23),vec3(0.46,0.38,0.31),0.5+0.5*r1);
      rock=mix(rock,vec3(0.52,0.36,0.25),smoothstep(0.2,0.6,snoise(p*1.7+9.0)));
      vec3 green=mix(vec3(0.12,0.22,0.08),vec3(0.24,0.30,0.12),0.5+0.5*snoise(p*6.0));
      vec3 lnd=mix(rock,green,smoothstep(0.25,0.6,snoise(p*2.2+3.0))*0.7);
      float strata=0.5+0.5*sin(p.x*40.0+snoise(p*4.0)*3.0); lnd*=0.88+0.18*strata;
      vec3 alb=mix(lake,lnd,land);
      float cl=smoothstep(0.38,0.75,fbm6(p*2.4+vec3(0.0,0.0,11.0)))*0.55;
      alb=mix(alb,vec3(0.92),cl*0.8);
      float cr=1.0-smoothstep(0.0,0.035,abs(snoise(p*3.5+vec3(4.0,1.0,2.0))));
      gl_FragColor=vec4(sqrt(alb),cr);
    }`,
  });
  bs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bm)); renderer.setRenderTarget(rt); renderer.render(bs, bc); renderer.setRenderTarget(null); bm.dispose();
}
const skyWaveGeo = waveGeometry(1, 400, 140);
{ const uv = []; for (let j = 0; j <= 140; j++) for (let i = 0; i <= 400; i++) uv.push(i / 400, j / 140); skyWaveGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); }
const ARCH_FS = SKYFN + `uniform sampler2D uTex; uniform sampler2D uTexWet; uniform float uDry; uniform vec3 uSun; uniform vec3 uCam; uniform float uAmb, uSkyK, uSkyS, uNear, uCrack, uSea, uSnowY;
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main(){
    if(distance(vW,uCam)<uNear) discard;
    vec4 tx = uDry < 0.001 ? texture2D(uTexWet,vUv) : (uDry > 0.999 ? texture2D(uTex,vUv) : mix(texture2D(uTexWet,vUv),texture2D(uTex,vUv),uDry)); vec3 alb=tx.rgb*tx.rgb;
    alb=mix(alb, vec3(0.88,0.92,0.96), smoothstep(uSnowY, uSnowY+500.0, vW.y)*0.9);
    if(uSea>0.5) alb=vec3(0.05,0.22,0.38);
    vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; float dif=max(dot(N,uSun),0.0);
    vec3 col=alb*(vec3(1.0,0.97,0.92)*dif*1.45+uAmb);
    if(uSea>0.5){ vec3 V=normalize(uCam-vW); vec3 Hh=normalize(uSun+V); col+=pow(max(dot(N,Hh),0.0),60.0)*0.8; }
    col+=vec3(2.4,0.7,0.12)*tx.a*uCrack*smoothstep(3500.0,5000.0,vW.y);
    vec3 d=normalize(vW-uCam); float e=dot(d,uUp); float air=1.0/max(e+0.035,0.035); float T=exp(-uSkyK*air);
    col=col*T+skyColor(d)*uSkyS;
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function archMaterial(sea) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTex: { value: bakeRT.texture }, uTexWet: { value: bakeWetRT.texture }, uDry: { value: 0 }, uSun: { value: new THREE.Vector3() }, uCam: { value: SKY_POS }, uAmb: { value: 0.06 }, uSkyK: { value: 0.07 }, uSkyS: { value: 0.22 }, uNear: { value: 320 }, uCrack: { value: 0 }, uSea: { value: sea ? 1 : 0 }, uSnowY: { value: 5200 },
      uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: ARCH_FS,
  });
}
const archMat = archMaterial(false);
const arch = new THREE.Mesh(skyWaveGeo, archMat); sky.add(arch);
const skySeaGeo = seaGeometry(1, 60, 120); { const uv = []; const n = skySeaGeo.attributes.position.count; for (let i = 0; i < n; i++) uv.push(0, 0); skySeaGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); }
const seaSkyMat = archMaterial(true);
const skySea = new THREE.Mesh(skySeaGeo, seaSkyMat); sky.add(skySea);
// rock chunks breaking off the crest
const chunkN = 260;
const chunks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#3a332e' }), chunkN); chunks.frustumCulled = false; sky.add(chunks);
const chunkP = []; for (let i = 0; i < chunkN; i++) chunkP.push({ t0: R(43, 49), x: R(3600, 6900), y: R(4400, 7600), z: R(-5500, 5500), s: R(25, 90) });

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
const SUN_CITY = new THREE.Vector3(-0.82, 0.42, -0.38).normalize();
const SUN_SKY = SUN_CITY.clone().applyQuaternion(Q_CITY2SKY);

// =================== roulette ===================
const ROUL = [['Sphere', 0], ['Cube', 0.3], ['Rocket', 0.55], ['Pyramid', 1.15], ['Heart', 1.4], ['Donut', 1.65], ['Pizza', 1.9], ['Star', 2.15], ['Diamond', 2.42], ['Heart', 2.72], ['Cube', CUBE], ['Tsunami', LAND]];
const shapeLabel = { Sphere: 'Sphere', Cube: 'Cube', Rocket: 'Rocket', Pyramid: 'Pyramid', Heart: 'Heart', Donut: 'Donut', Pizza: 'Pizza slice', Star: 'Star', Diamond: 'Diamond', Tsunami: 'Tsunami' };
function rouletteAt(t) { let cur = ROUL[0]; ROUL.forEach(r => { if (t >= r[1]) cur = r; }); return { name: cur[0], since: t - cur[1] }; }

// =================== cameras ===================
function spaceCamera(t) {
  let pos, look = new THREE.Vector3(0, 0, 0), fov = 36;
  if (t < ROUL_END) { pos = new THREE.Vector3(0, 3.5, 56); look = new THREE.Vector3(0, 1.0, 0); }
  else if (t < SPACE_END) { const u = (t - ROUL_END) / (SPACE_END - ROUL_END); const a = 0.12 - u * 0.12; pos = new THREE.Vector3(Math.sin(a) * 44 + 0.5, 4 - u * 1.5, Math.cos(a) * 44); look = new THREE.Vector3(0.5, 1.6, 0); fov = 38; }
  else if (t < DIVE_END) {
    const u = ease((t - SPACE_END) / (DIVE_END - SPACE_END));
    const p0 = new THREE.Vector3(0.5, 2.5, 44), p1 = new THREE.Vector3(9.0, 3.5, 14), p2 = new THREE.Vector3(5.2, 0.4, 3.2);
    pos = u < 0.5 ? p0.clone().lerp(p1, ease(u / 0.5)) : p1.clone().lerp(p2, ease((u - 0.5) / 0.5));
    look = new THREE.Vector3(0.5, 1.6, 0).lerp(new THREE.Vector3(1.0, 2.6, 0), smooth(0.4, 1, u)); fov = lerp(40, 58, smooth(0.5, 1, u));
  }
  else if (t < CRACK) { const u = (t - OCEAN) / (CRACK - OCEAN); pos = new THREE.Vector3(26 - u * 4, 6, 84 - u * 10); look = new THREE.Vector3(0.6, 1.0, 0); fov = lerp(28, 26, u); }
  else { const u = (t - FALL) / (WALL - FALL); pos = new THREE.Vector3(Math.sin(0.15) * 40 + 1, 4 - u, Math.cos(0.15) * 40); look = new THREE.Vector3(0.8, 1.6, 0); fov = 38; }
  let sh = 0; if (t > FALL && t < WALL) sh = 0.06 + 0.12 * smooth(51, 52.5, t);
  const s = new THREE.Vector3(Math.sin(t * 41) + Math.sin(t * 23), Math.sin(t * 37 + 1), Math.sin(t * 29 + 2)).multiplyScalar(sh);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos).add(s); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(look.clone().add(s.multiplyScalar(0.3)));
}
const TILT_MAX = 75 * Math.PI / 180;
function tiltAngle(t) { return TILT_MAX * ease((t - 28.0) / 2.6); }
function cityCamera(t) {
  let pos, look, fov = 62, up = new THREE.Vector3(0, 1, 0);
  if (t < REVEAL) { const u = t - DIVE_END; const tilt = ease((t - 18.0) / 4.4); pos = new THREE.Vector3(2 + u * 1.2, 6.5 + tilt * 0.8, -0.5); look = new THREE.Vector3(pos.x + 100, lerp(12, 110, tilt), 0); fov = lerp(62, 74, tilt); }
  else if (t < TILT) { const u = t - REVEAL; pos = new THREE.Vector3(2 + (REVEAL - DIVE_END) * 1.2 + u * 0.8, 7.3, -0.5); look = new THREE.Vector3(pos.x + 100, 110 - u * 3, 0); fov = 74; }
  else if (t < OCEAN) { const u = t - TILT; const a = tiltAngle(t); pos = new THREE.Vector3(48 + u * 0.4, 3.0, -4.5); look = new THREE.Vector3(48 + u * 0.4, 3.0, 12); up = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0); fov = 66; }
  else if (t < FALL) { const u = t - CRACK; pos = new THREE.Vector3(30 + u * 0.6, 6.8, -0.5); look = new THREE.Vector3(pos.x + 100, 120 + u * 2, 1); fov = 74; }
  else { const u = t - WALL; pos = new THREE.Vector3(26 + u * 0.3, 4.5, -0.5); look = new THREE.Vector3(pos.x + 100, lerp(22, 60, smooth(54, 59, t)), 0); fov = 70; }
  let sh = 0; if (t > CRACK && t < FALL) sh = 0.04 + 0.08 * smooth(44, 48.5, t); if (t > WALL) sh = 0.05 + 0.5 * smooth(56.5, 59.3, t);
  const s = new THREE.Vector3(Math.sin(t * 43) + Math.sin(t * 21), Math.sin(t * 37 + 1), 0).multiplyScalar(sh);
  cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos).add(s); cam.up.copy(up); cam.lookAt(look.clone().add(s));
}

// =================== tsunami twall (city scale, meters) ===================
const WALL_W = 9000, WALL_H = 1400;
const twGeo = new THREE.PlaneGeometry(1, 1, 160, 48);
const twMat = new THREE.ShaderMaterial({
  transparent: true, side: THREE.DoubleSide, depthWrite: true,
  uniforms: { uT: { value: 0 }, uFog: { value: new THREE.Color() }, uFogK: { value: 0 }, uOct: { value: 4 } },
  vertexShader: `varying vec2 vUv; varying vec3 vW; uniform float uT;
    void main(){ vUv=uv; vec3 p=position; vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: NOISE + `varying vec2 vUv; varying vec3 vW; uniform float uT; uniform vec3 uFog; uniform float uFogK;
    void main(){
      float v=vUv.y, u=vUv.x;
      float streak=snoise(vec3(u*90.0, v*3.0 - uT*0.9, uT*0.2))*0.5+0.5;
      float n2=snoise(vec3(u*30.0, v*8.0 - uT*1.5, 3.0))*0.5+0.5;
      vec3 deep=vec3(0.02,0.10,0.11), mid=vec3(0.10,0.30,0.28), foam=vec3(0.93,0.96,0.96);
      vec3 c=mix(deep,mid,smoothstep(0.1,0.8,v)*0.8+streak*0.25);
      c=mix(c,foam,smoothstep(0.55,0.9,streak)*smoothstep(0.35,0.95,v)*0.8);
      c=mix(c,foam,smoothstep(0.86,0.97,v+n2*0.06));
      c=mix(c,foam,smoothstep(0.18,0.0,v)*(0.6+0.4*n2));
      c*=0.85+0.25*v;
      c=mix(c,uFog,uFogK);
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const twall = new THREE.Mesh(twGeo, twMat); twall.frustumCulled = false; twall.visible = false; city.add(twall);
const twBase = twGeo.attributes.position.array.slice();
function updateWall(t) {
  const on = t > WALL; twall.visible = on; if (!on) return;
  const u = clamp((t - WALL) / (59.3 - WALL), 0, 1);
  const X = lerp(5200, 30, Math.pow(u, 1.25)) + 26;     // distance down the street toward the wave
  const Hh = WALL_H * (0.75 + 0.35 * u);
  const p = twGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    const bu = twBase[i] + 0.5, bv = twBase[i + 1] + 0.5;   // 0..1
    const z = (bu - 0.5) * WALL_W; const y = bv * Hh; const curl = -Math.pow(bv, 3) * Hh * 0.45 + Math.sin(z * 0.002 + t) * 20;
    p[i] = X + curl + Math.abs(z) * 0.08; p[i + 1] = y; p[i + 2] = z;
  }
  twGeo.attributes.position.needsUpdate = true;
  twMat.uniforms.uT.value = t; twMat.uniforms.uFog.value.copy(city.fog.color); twMat.uniforms.uFogK.value = 0.45 * (1 - smooth(800, 3000, 5200 - (X - 26)));
}
const spray = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#f1f6f7', roughness: 0.6, emissive: '#9fb4b8', emissiveIntensity: 0.35, transparent: true, opacity: 0.85 }), 500);
spray.frustumCulled = false; city.add(spray);
const sprayP = []; for (let i = 0; i < 500; i++) sprayP.push({ z: R(-1800, 1800), top: rnd() < 0.6, ph: R(0, 6), s: R(15, 70), dx: R(-40, 120), dy: R(-60, 160) });

// =================== update: space ===================
const dmy = new THREE.Object3D();
let lastTheta = -1;
function updateSpace(t) {
  for (const k in shapes) shapes[k].visible = false;
  let g;
  if (t < ROUL_END) {
    const r = rouletteAt(t); g = shapes[r.name]; g.visible = true;
    let popS = 1 + 0.22 * Math.exp(-r.since * 16) * Math.cos(r.since * 30) - 0.12 * Math.exp(-r.since * 30);
    // spin: fast, slowing hard on the cube, then a final click to the tsunami
    let ang;
    if (t < CUBE) ang = t * 4.4; else if (t < LAND) ang = CUBE * 4.4 + (1 - Math.exp(-(t - CUBE) * 3)) * 1.1; else ang = CUBE * 4.4 + 1.05 + (t - LAND) * 0.35 + 0.4 * (1 - Math.exp(-(t - LAND) * 6));
    if (r.name === 'Cube' && t >= CUBE) { const w = Math.sin((t - CUBE) * 9) * Math.exp(-(t - CUBE) * 2.2); g.rotation.set(0.35 + w * 0.08, ang, 0.12 + w * 0.12); popS = 1 + 0.18 * Math.exp(-r.since * 10) * Math.cos(r.since * 20); }
    else if (r.name === 'Tsunami') { popS = 0.78 * (1 + 0.2 * Math.exp(-r.since * 6) * Math.cos(r.since * 14)); g.rotation.set(0.06, -0.18 + 0.12 * Math.sin(r.since * 0.8), 0); }
    else if (r.name === 'Donut') g.rotation.set(0.55, 0.35, ang); else g.rotation.set(0.35 + 0.2 * Math.sin(t * 1.3), ang, r.name === 'Rocket' ? -0.25 : 0.15);
    g.scale.setScalar(popS); g.position.set(r.name === 'Tsunami' ? -0.5 : 0, r.name === 'Tsunami' ? -1.6 : 1.0, 0);
  } else {
    g = waveG; g.visible = true; g.position.set(-0.6, -1.5, 0);
    const k = smooth(ROUL_END, ROUL_END + 0.6, t); g.scale.setScalar(lerp(0.78, 1, ease(k)));
    g.rotation.set(0.06, -0.18 + (t < SPACE_END ? (t - ROUL_END) * 0.035 : 0.03), 0);
    if (t >= OCEAN && t < CRACK) g.rotation.set(0.05, -0.12, 0);
    if (t >= FALL) g.rotation.set(0.06, -0.15, 0);
  }
  for (const k in shapes) { const s = shapes[k]; if (!s.visible) continue; const mat = s.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; if (s.userData.sh) s.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
  // crest collapse
  const theta = -1.25 * ease((t - 49.6) / 2.6);
  if (theta !== lastTheta) { collapseInto(waveGeo, theta); lastTheta = theta; }
  waveMat.uniforms.uHeat.value = smooth(49.8, 51.5, t) * 0.5;
  waveMat.uniforms.uAmb.value = 0.025 + 0.55 * smooth(12.2, 13.6, t) * (t < DIVE_END ? 1 : 0);
  const dry = smooth(35.6, 39.2, t); waveMat.uniforms.uLand.value = lerp(-0.3, 0.32, dry);
  seaMesh.visible = dry > 0.02; seaMesh.scale.setScalar(1); seaMat.emissiveIntensity = 0.6 + 1.4 * dry;
  for (let i = 0; i < debrisN; i++) {
    const p = debrisP[i]; const age = t - p.t0;
    if (age < 0 || t < 49.5) { dmy.position.set(0, 0, -9999); dmy.scale.setScalar(0); }
    else { dmy.position.set(p.x + p.vx * age - 1.2 * age * age, p.y + p.vy * age - 1.6 * age * age, p.z); dmy.position.y = Math.max(dmy.position.y, 0.5); dmy.scale.setScalar(p.s * (1 - smooth(2.0, 3.0, age))); dmy.rotation.set(age * p.w, age * p.w, 0); }
    dmy.updateMatrix(); debris.setMatrixAt(i, dmy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true; debris.position.copy(waveG.position); debris.rotation.copy(waveG.rotation); debris.scale.copy(waveG.scale);
  for (let i = 0; i < splashN; i++) {
    const p = splashP[i]; const age = t - p.t0;
    if (age < 0 || t < 51) { dmy.position.set(0, 0, -9999); dmy.scale.setScalar(0); }
    else { const r = p.v * age; dmy.position.set(1.05 + Math.cos(p.a) * r * 1.4, 1.75 + Math.sin(p.a) * r * 1.2 - 0.5 * age * age, p.z); dmy.scale.setScalar(p.s * (1 - smooth(1.0, 1.8, age))); }
    dmy.updateMatrix(); splash.setMatrixAt(i, dmy.matrix);
  }
  splash.instanceMatrix.needsUpdate = true; splash.position.copy(waveG.position); splash.rotation.copy(waveG.rotation); splash.scale.copy(waveG.scale);
}

// =================== update: city ===================
let lastSkyTheta = 0;
function updateCity(t) {
  // sky uniforms
  for (const mat of [domeMat, archMat, seaSkyMat]) { mat.uniforms.uSunS.value.copy(SUN_SKY); mat.uniforms.uDay.value = 1; mat.uniforms.uDusk.value = 0; }
  for (const mat of [archMat, seaSkyMat]) { mat.uniforms.uSun.value.copy(SUN_SKY); }
  archMat.uniforms.uCrack.value = smooth(43, 47, t) * (t < WALL ? 1 : 0.6); archMat.uniforms.uDry.value = smooth(35.5, 39, t);
  const dark = smooth(WALL, 58.5, t); domeMat.uniforms.uDark.value = dark * 0.7;
  // crest falling over the city during the twall section
  const st = t > WALL ? -1.25 * ease((t - WALL + 1.5) / 4.0) : 0;
  if (st !== lastSkyTheta) { collapseInto(skyWaveGeo, st); lastSkyTheta = st; }
  // chunks
  for (let i = 0; i < chunkN; i++) {
    const p = chunkP[i]; const age = t - p.t0;
    if (age < 0 || t < 42) { dmy.position.set(0, -1e6, 0); dmy.scale.setScalar(0); }
    else { dmy.position.set(p.x - 25 * age * age, p.y - 8 * age * age, p.z); dmy.scale.setScalar(p.s); dmy.rotation.set(age, age * 0.7, 0); }
    dmy.updateMatrix(); chunks.setMatrixAt(i, dmy.matrix);
  }
  chunks.instanceMatrix.needsUpdate = true;
  // lights
  sunL.position.copy(cam.position).addScaledVector(SUN_CITY, 300); sunL.target.position.copy(cam.position).add(new THREE.Vector3(30, 0, 0)); sunL.target.updateMatrixWorld();
  sunL.intensity = 3.0 * (1 - 0.75 * dark); hemi.intensity = 1.0 - 0.45 * dark; archL.intensity = 0;
  city.fog.color.copy(skyHorizon(1, 0)).lerp(new THREE.Color(0.32, 0.34, 0.34), dark); city.fog.near = 160; city.fog.far = 2600;
  for (const m of winMats) m.emissiveIntensity = 0.15 + 0.5 * dark;
  for (const m of lampHeads) m.emissiveIntensity = 1.5 * dark;
  clouds.forEach(c => c.material.color.setRGB(1 - 0.5 * dark, 1 - 0.5 * dark, 1 - 0.48 * dark));
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); p.g.rotation.z = -0.25 * smooth(30.5, 32, t) * (1 + 0.1 * Math.sin(t * 6 + p.ph)) - 0.2 * smooth(55, 59, t); });
  // sliding (gravity tilted 65° toward the wave = +x in the city)
  const slide = (t0, a) => t > t0 ? 0.5 * a * (t - t0) * (t - t0) : 0;
  for (const c of cars) {
    if (c.cross) continue;
    const tt = Math.min(t, 30.4); let x = wrapR(c.x0 + c.dir * c.speed * tt, -220, 760);
    const t0 = 30.4 + (c.x0 % 1 + 1) % 1 * 0.6; const d = slide(t0, 3.4); x += d;
    c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, d > 0 ? -Math.min(0.5, d * 0.004) : 0);
    c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 7 && d < 3000;
  }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * Math.min(t, 30.4), -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * Math.min(t, 30.4), -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const t0 = 30.2 + (P.ph % 1) * 0.8; const d = slide(t0, 2.6 + (P.ph % 1)); const gy = Math.abs(z) > 7 ? 0.18 : 0;
    if (d <= 0) { o.position.set(x, gy + 0.95, z); o.rotation.set(0, ry, 0); if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph); }
    else { const tt = t - t0; o.position.set(x + d, gy + 0.95 + Math.abs(Math.sin(tt * 3 + P.ph)) * 0.6, z); o.rotation.set(Math.sin(tt * 4 + P.ph) * 0.8, ry + tt * 1.5, -0.6 - tt * 1.2); poseFlail(P.p, t, P.ph); }
    o.visible = d < 2500;
  }
  ball.visible = false;
  updateWall(t);
  if (t > WALL) {
    const u = clamp((t - WALL) / (59.3 - WALL), 0, 1); const X = lerp(5200, 30, Math.pow(u, 1.25)) + 26;
    sprayP.forEach((p, i) => { const k = 0.5 + 0.5 * Math.sin(t * 2 + p.ph); dmy.position.set(X - (p.top ? WALL_H * 0.4 : 0) + p.dx * k, p.top ? WALL_H * (0.8 + 0.3 * u) + p.dy * k : 40 + p.dy * 0.5 * k, p.z * (WALL_W / 3600)); dmy.scale.setScalar(p.s * (1 + u)); dmy.updateMatrix(); spray.setMatrixAt(i, dmy.matrix); });
    spray.visible = true; spray.instanceMatrix.needsUpdate = true; spray.material.color.copy(new THREE.Color('#f1f6f7').lerp(city.fog.color, 0.6 * (1 - u)));
  } else spray.visible = false;
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'titleEnd', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'cracks', 'veil'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [5.2, 7.9, "Of course it's a tsunami."],
  [8.1, 10.8, 'Same mass as Earth,<br>shaped like a 5,000-mile wave.'],
  [11.2, 14.5, 'You live on the flat beach<br>in front of it.'],
  [15.1, 17.9, 'From the street, the horizon<br>looks… wrong.'],
  [18.2, 20.8, 'Then you look up.'],
  [21.3, 24.2, "That's the crest,<br>curling over your head."],
  [24.5, 27.3, 'Its top sticks out of<br>the atmosphere, into space.'],
  [27.8, 31.0, 'But gravity here pulls<br>toward the wave.'],
  [31.3, 34.8, 'Flat ground feels like<br>a 75° slope.'],
  [35.3, 38.6, 'Every ocean on Earth drains<br>into one sea…'],
  [38.9, 41.8, '…stuck halfway up<br>the wave.'],
  [42.3, 45.6, 'But no rock can hold<br>a 5,000-mile overhang.'],
  [45.9, 48.8, 'Anything this big gets pulled<br>into a ball by its own gravity.'],
  [49.3, 52.6, 'The crest falls.<br>It takes about 20 minutes.'],
  [53.3, 56.3, "A third of Earth's mass<br>slams into the sea…"],
  [56.6, 60.3, '…so yes.<br>It\'s a tsunami.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '';
  if (t < ROUL_END) { const r = rouletteAt(t); lab = "EARTH'S SHAPE"; val = shapeLabel[r.name]; sub = t < CUBE ? 'SPINNING THE WHEEL…' : (t < LAND ? 'SLOWING DOWN…' : 'OF COURSE.'); }
  else if (t < SPACE_END) { lab = 'CREST HEIGHT'; val = '5,200 mi'; sub = 'MOUNT EVEREST · 5.5 MI'; }
  else if (t < REVEAL) { lab = 'YOU ARE HERE'; val = 'The beach'; sub = 'ABOUT 1,500 MI FROM THE WAVE'; }
  else if (t < TILT) { lab = 'CREST HEIGHT'; val = '5,200 mi'; sub = 'SPACE STARTS AT 62 MI'; }
  else if (t < OCEAN) { lab = 'GRAVITY TILT'; val = Math.round(75 * ease((t - 28.0) / 2.6)) + '°'; sub = 'AND YOU WEIGH LESS THAN HALF'; }
  else if (t < CRACK) { lab = 'ALL OCEANS'; val = 'One sea'; sub = '321 MILLION CUBIC MILES'; }
  else if (t < FALL) { lab = 'MOUNT EVEREST'; val = '5.5 mi'; sub = 'THIS CREST · 5,200 MI'; }
  else if (t < WALL) { stat = '<b></b>TIME-LAPSE'; lab = 'CREST FALLS IN'; val = '≈ 20 min'; sub = "ALMOST A THIRD OF EARTH'S MASS"; }
  else { lab = 'INCOMING'; val = 'Tsunami'; sub = 'OF COURSE.'; }
  return { stat, lab, val, sub };
}
function buildCracks() {
  let s = '';
  for (const [cx, cy, n] of [[300, 620, 13], [780, 1180, 11], [210, 1500, 9]]) {
    for (let i = 0; i < n; i++) {
      let a = i / n * Math.PI * 2 + R(-0.2, 0.2), x = cx, y = cy; let d = `M${cx},${cy}`; const L = R(160, 520);
      for (let l = 0; l < L; l += R(25, 60)) { a += R(-0.35, 0.35); x += Math.cos(a) * R(25, 60); y += Math.sin(a) * R(25, 60); d += ` L${x.toFixed(1)},${y.toFixed(1)}`; }
      s += `<path d="${d}" stroke="rgba(255,255,255,.85)" stroke-width="${R(1.5, 3).toFixed(1)}" fill="none"/>`;
    }
    for (const rr of [R(40, 70), R(110, 160)]) { let d = ''; const a0 = R(0, 6), a1 = a0 + R(2, 4.5); for (let a = a0; a < a1; a += 0.3) { const r = rr * R(0.85, 1.15); d += `${d ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `; } s += `<path d="${d}" stroke="rgba(255,255,255,.7)" stroke-width="1.6" fill="none"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(255,255,255,.9)"/>`;
  }
  el.cracks.innerHTML = s;
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(ROUL_END, ROUL_END + 0.3, t);
  el.titleEnd.style.opacity = smooth(LAND + 0.02, LAND + 0.18, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = 1 - smooth(T_END, T_END + 0.4, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const f1 = smooth(DIVE_END - 1.0, DIVE_END - 0.1, t) * (1 - smooth(DIVE_END, DIVE_END + 0.55, t));
  const f2 = smooth(OCEAN - 0.4, OCEAN, t) * (1 - smooth(OCEAN, OCEAN + 0.4, t)) * 0.0;
  el.veil.style.opacity = Math.max(f1, f2) * 0.97;
  el.flash.style.opacity = t >= 59.3 ? Math.exp(-(t - 59.3) * 2.4) * 0.95 : 0;
  el.cracks.style.opacity = t >= 59.3 ? 1 - smooth(T_END + 2.5, T_END + 3.2, t) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  if (window.PASS === 'text') return true;
  const inSpace = t < DIVE_END || (t >= OCEAN && t < CRACK) || (t >= FALL && t < WALL);
  renderer.clear();
  if (inSpace) { spaceCamera(t); updateSpace(t); renderer.render(space, spaceCam); }
  else {
    cityCamera(t); updateCity(t);
    skyCam.fov = cam.fov; skyCam.aspect = cam.aspect; skyCam.updateProjectionMatrix();
    skyCam.position.copy(SKY_POS); skyCam.quaternion.copy(Q_CITY2SKY).multiply(cam.quaternion);
    dome.position.copy(SKY_POS);
    renderer.render(sky, skyCam); renderer.clearDepth(); renderer.render(city, cam);
  }
  return true;
};
buildCracks();
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });

