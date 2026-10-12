import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if Earth was shaped like a spoon?" — roulette (fork fake-out) -> spoon planet with Earth's volume and mass.
// Physics: tools/spoon_phys.py (Monte-Carlo gravity): 57,400 mi long, 741 mi thick; the bottom of the bowl is the lowest potential,
// so all water and all air pool there: one sea ~Russia-sized, ~120 mi deep; 0.14 G at the sea, tilt 27-59 deg toward the rim; handle airless.
// =================== timeline ===================
const FORK = 3.0, LAND = 3.95, ROUL_END = 5.0, T_SIZE = 5.0, T_SEA = 11.0, T_HANDLE = 17.0, T_TILT = 24.0, T_BEACH = 31.0, T_SUIT = 40.0, T_COLL = 48.0, T_BALL = 56.0, T_END = 61.0;
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
// =================== the spoon planet (model cm -> scene units; same shape as tools/spoon_phys.py) ===================
const SP = { a: 3.25, b: 2.1, d: 1.2, t: 0.25, X0: 2.6, X1: 16.1 };
const KM_PER_CM = 4772;                                   // from spoon_phys.py (Earth's volume)
const U_PER_CM = 0.827, KM_PER_U = KM_PER_CM / U_PER_CM;  // 16 scene units long
const SP_CX = (-SP.a + SP.X1) / 2;                        // centre the spoon on the origin
const bowlTop = (x, y) => SP.d * ((x / SP.a) ** 2 + (y / SP.b) ** 2);
const handleW = x => { const xs = [SP.X0, SP.X0 + 3, SP.X1 - 3, SP.X1], ws = [0.9, 0.55, 0.75, 0.8]; if (x <= xs[0]) return ws[0]; for (let i = 1; i < 4; i++) if (x <= xs[i]) return lerp(ws[i - 1], ws[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1])); return ws[3]; };
const handleZ = x => SP.d + 0.35 * clamp((x - SP.X0) / 4, 0, 1);
const SEA_R_CM = 2200 / KM_PER_CM;                        // sea radius ~2,200 km
// model (x along, y across, z up) -> scene (x, y=z, z=y)
const toScene = (x, y, z) => new THREE.Vector3((x - SP_CX) * U_PER_CM, z * U_PER_CM, y * U_PER_CM);
function spoonGeometry() {
  const pos = [], mdl = [], idx = []; let n = 0;
  const vert = (x, y, z) => { const p = toScene(x, y, z); pos.push(p.x, p.y, p.z); mdl.push(x, y, z); return n++; };
  const quad = (a, b, c, d) => idx.push(a, b, c, b, d, c);
  // bowl: elliptical polar grid, top and bottom surfaces + rim band
  const NR = 48, NT = 160;
  const top = [], bot = [];
  for (let i = 0; i <= NR; i++) { const r = Math.pow(i / NR, 0.85); top.push([]); bot.push([]);
    for (let j = 0; j <= NT; j++) { const th = j / NT * Math.PI * 2; const x = SP.a * r * Math.cos(th), y = SP.b * r * Math.sin(th); const z = bowlTop(x, y); top[i].push(vert(x, y, z)); bot[i].push(vert(x, y, z - SP.t)); } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NT; j++) { quad(top[i][j], top[i][j + 1], top[i + 1][j], top[i + 1][j + 1]); quad(bot[i][j], bot[i + 1][j], bot[i][j + 1], bot[i + 1][j + 1]); }
  for (let j = 0; j < NT; j++) quad(top[NR][j], top[NR][j + 1], bot[NR][j], bot[NR][j + 1]);
  // handle: from just inside the rim to the tip; top, bottom, two sides, end cap
  const NX = 120, NY = 10; const ht = [], hb = [];
  for (let i = 0; i <= NX; i++) { const x = lerp(SP.X0 - 0.15, SP.X1, i / NX); const w = handleW(x); const tip = x > SP.X1 - 0.8 ? Math.sqrt(Math.max(0, 1 - ((x - (SP.X1 - 0.8)) / 0.8) ** 2)) : 1; ht.push([]); hb.push([]);
    for (let k = 0; k <= NY; k++) { const y = lerp(-w, w, k / NY) * Math.max(tip, 0.02); const z = handleZ(x); ht[i].push(vert(x, y, z)); hb[i].push(vert(x, y, z - SP.t)); } }
  for (let i = 0; i < NX; i++) for (let k = 0; k < NY; k++) { quad(ht[i][k], ht[i + 1][k], ht[i][k + 1], ht[i + 1][k + 1]); quad(hb[i][k], hb[i][k + 1], hb[i + 1][k], hb[i + 1][k + 1]); }
  for (let i = 0; i < NX; i++) { quad(ht[i][0], hb[i][0], ht[i + 1][0], hb[i + 1][0]); quad(ht[i][NY], ht[i + 1][NY], hb[i][NY], hb[i + 1][NY]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aModel', new THREE.Float32BufferAttribute(mdl, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.userData.p0 = new Float32Array(pos); return g;
}
const SPOON_FS = NOISE + `
uniform vec3 uSun; uniform vec3 uCam; uniform float uSeaR, uBelt, uHeat, uT; varying vec3 vM; varying vec3 vN; varying vec3 vW; varying vec3 vMN;
void main(){
  vec3 p=vM; float e=(p.x/3.25)*(p.x/3.25)+(p.y/2.1)*(p.y/2.1);
  bool inBowl = e<=1.02 && p.x<2.75; bool topS = vMN.z>0.2;
  float r=length(p.xy);
  float n1=fbm6(p*2.2+vec3(3.0,1.0,7.0)), n2=snoise(p*9.0);
  vec3 rock=mix(vec3(0.24,0.18,0.13),vec3(0.50,0.38,0.27),0.5+0.5*n1); rock*=0.85+0.2*n2;
  vec3 grey=mix(vec3(0.26,0.26,0.27),vec3(0.48,0.47,0.45),0.5+0.5*n1);
  float crater=smoothstep(0.55,0.62,snoise(p*6.0+11.0)); grey*=1.0-0.25*crater;
  vec3 alb = inBowl ? rock : grey;
  float sea=0.0, belt=0.0;
  if(inBowl && topS){ float rr=r+0.05*snoise(vec3(p.xy*5.0,1.0)); sea=1.0-smoothstep(uSeaR-0.015,uSeaR+0.015,rr); belt=(1.0-smoothstep(uSeaR+uBelt*0.6,uSeaR+uBelt,rr))*(1.0-sea);
    vec3 green=mix(vec3(0.12,0.28,0.09),vec3(0.62,0.55,0.36),smoothstep(0.0,1.0,(rr-uSeaR)/uBelt)); alb=mix(alb,green,belt);
    vec3 water=mix(vec3(0.02,0.12,0.30),vec3(0.05,0.30,0.48),smoothstep(uSeaR,0.0,rr)); alb=mix(alb,water,sea); }
  float cl=0.0; if(inBowl && topS){ cl=smoothstep(0.25,0.7,fbm6(vec3(p.xy*6.0,uT*0.03)))*(1.0-smoothstep(uSeaR*1.1,uSeaR+uBelt*1.2,r))*0.8; alb=mix(alb,vec3(0.95),cl); }
  vec3 N=normalize(vN); float dif=max(dot(N,uSun),0.0);
  vec3 col=alb*(vec3(1.0,0.97,0.92)*dif*1.3+0.035);
  vec3 V=normalize(uCam-vW); vec3 Hh=normalize(uSun+V); col+=sea*(1.0-cl)*pow(max(dot(N,Hh),0.0),80.0)*0.8*dif;
  col+=vec3(0.3,0.55,1.0)*pow(1.0-max(dot(N,V),0.0),3.0)*0.35*(sea+belt)*(0.3+dif);
  float cr=1.0-smoothstep(0.0,0.05,abs(snoise(p*3.0+5.0))); col=mix(col,vec3(2.2,0.7,0.12),cr*uHeat); col+=vec3(0.45,0.1,0.02)*uHeat*0.4;
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const spoonMat = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: SUN_SPACE.clone() }, uCam: { value: new THREE.Vector3() }, uSeaR: { value: SEA_R_CM * 1.6 }, uBelt: { value: 0.22 }, uHeat: { value: 0 }, uT: { value: 0 }, uOct: { value: 6 } },
  vertexShader: 'attribute vec3 aModel; varying vec3 vM; varying vec3 vN; varying vec3 vW; varying vec3 vMN; void main(){ vM=aModel; vMN=vec3(normal.x,normal.z,normal.y); vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: SPOON_FS,
});
const spoonGeo = spoonGeometry();
const spoonMesh = new THREE.Mesh(spoonGeo, spoonMat);
const spoonG = new THREE.Group(); spoonG.add(spoonMesh); spoonG.visible = false; space.add(spoonG);
// the pooled air: a soft blue halo sitting in the bottom of the bowl
const BOWL_BOTTOM = toScene(0, 0, 0);
const airHalo = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),1.6); gl_FragColor=vec4(0.35,0.62,1.0,1.0)*f*0.9*uA; }',
  uniforms: { uA: { value: 1 } },
}));
airHalo.position.copy(BOWL_BOTTOM).add(new THREE.Vector3(0, 0.05, 0)); airHalo.scale.set(SEA_R_CM * U_PER_CM * 2.2, 0.16, SEA_R_CM * U_PER_CM * 2.2); spoonG.add(airHalo);
// roulette version of the spoon (planet shader) + extra shapes
shapes.Spoon = spoonG;
{ // fork: flat outline with four tines, extruded and bent like the spoon handle
  const s = new THREE.Shape(); const pts = [];
  const hw = x => (x < 3.4 ? 0 : handleW(x - 0.8 + SP.X0 - 2.6));
  const P2 = [[1.6, -1.7], [-3.2, -1.7], [-3.2, -1.15], [-0.4, -1.15], [-0.4, -0.75], [-3.2, -0.75], [-3.2, -0.2], [-0.4, -0.2], [-0.4, 0.2], [-3.2, 0.2], [-3.2, 0.75], [-0.4, 0.75], [-0.4, 1.15], [-3.2, 1.15], [-3.2, 1.7], [1.6, 1.7]];
  s.moveTo(...P2[0]); for (const q of P2.slice(1)) s.lineTo(...q);
  s.quadraticCurveTo(2.8, 1.5, 3.0, 0.8); s.lineTo(16.1, 0.8); s.lineTo(16.1, -0.8); s.lineTo(3.0, -0.8); s.quadraticCurveTo(2.8, -1.5, 1.6, -1.7);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 10, steps: 1 });
  g.deleteAttribute('uv'); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const v = toScene(x, y, z + handleZ(Math.max(x, 2.6)) - 0.3); p.setXYZ(i, v.x, v.y, v.z); }
  const gn = g.toNonIndexed(); gn.computeVertexNormals(); shapes.Fork = shapeMesh(gn, 1.03);
}
// ---- cameo: the original meme rocket (from parts_rocket/r_space.js) flies past behind the roulette, not part of it
const cameoGeo = (() => {
  const prof = [];
  for (let i = 0; i <= 20; i++) prof.push([2.05 + 0.08 * Math.sin(i / 20 * Math.PI), -4.5 + i * 0.475]);
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI / 2; prof.push([2.55 * Math.cos(a) * (i === 0 ? 0.86 : 1), 5.4 + 2.5 * Math.sin(a)]); }
  prof.splice(21, 0, [2.4, 5.0], [2.62, 5.35]);
  prof.unshift([0.001, -4.6]);
  const shaft = lathe(prof, 96); shaft.deleteAttribute('uv');
  const b1 = new THREE.SphereGeometry(2.55, 64, 40); b1.translate(-1.95, -5.4, 0.3); b1.deleteAttribute('uv');
  const b2 = new THREE.SphereGeometry(2.55, 64, 40); b2.translate(1.95, -5.4, -0.3); b2.deleteAttribute('uv');
  const g = mergeGeometries([shaft.toNonIndexed(), b1.toNonIndexed(), b2.toNonIndexed()]); g.computeVertexNormals();
  return g;
})();
const cameo = shapeMesh(cameoGeo, 1.035);
const cameoFlame = new THREE.Mesh(new THREE.ConeGeometry(2.4, 11, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffc06a', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
cameoFlame.rotation.x = Math.PI; cameoFlame.position.y = -13.5; cameo.add(cameoFlame);
const CAMEO_T0 = 1.0, CAMEO_T1 = 3.6;
const cameoPos = t => { const u = (t - CAMEO_T0) / (CAMEO_T1 - CAMEO_T0); return new THREE.Vector3(lerp(-62, 62, u), lerp(-27, -23, u) + 2.0 * Math.sin(u * Math.PI), -70); };
function updateCameo(t) {
  cameo.visible = t > CAMEO_T0 && t < CAMEO_T1; if (!cameo.visible) return;
  const p = cameoPos(t), q = cameoPos(t + 0.02); cameo.position.copy(p); cameo.scale.setScalar(0.95);
  const dir = q.clone().sub(p).normalize(); cameo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); cameo.rotateY(t * 2.0);
  cameoFlame.scale.set(1, 0.8 + 0.3 * Math.sin(t * 47) * Math.sin(t * 31), 1);
}
// Earth to scale (6,371 km radius)
const earthR = 6371 / KM_PER_U;
const scaleEarth = shapeMesh(new THREE.IcosahedronGeometry(earthR, 24), 1.06, 1, { ns: 2.0 }); scaleEarth.visible = false;
// ---- collapse: every vertex falls toward the centre of mass; farther parts arrive later (handle tip ~6.4 h)
const COM_S = toScene(21205 / KM_PER_CM, 0, 4251 / KM_PER_CM);
const BALL_R = 6371 / KM_PER_U;
function collapseSpoon(k) {   // k: 0 (spoon) .. 1 (ball)
  const P = spoonGeo.attributes.position.array, P0 = spoonGeo.userData.p0; const v = new THREE.Vector3();
  for (let i = 0; i < P.length; i += 3) {
    v.set(P0[i] - COM_S.x, P0[i + 1] - COM_S.y, P0[i + 2] - COM_S.z); const r = v.length();
    const delay = Math.pow(r / 11, 1.5) * 0.55; const kk = smooth(delay * 0.9, delay * 0.9 + 0.45, k);
    const target = v.clone().normalize().multiplyScalar(BALL_R * (0.92 + 0.08 * Math.sin(i * 0.37)));
    const bend = Math.sin(kk * Math.PI) * 0.25 * r;     // the handle swings and folds as it falls
    const q = v.clone().lerp(target, kk); q.y += bend * 0.3;
    P[i] = COM_S.x + q.x; P[i + 1] = COM_S.y + q.y; P[i + 2] = COM_S.z + q.z;
  }
  spoonGeo.attributes.position.needsUpdate = true; spoonGeo.computeVertexNormals();
}
const ballSphere = shapeMesh(new THREE.IcosahedronGeometry(BALL_R, 30), 1.05, 0, { ns: 0.9, land: 0.05 }); ballSphere.visible = false; ballSphere.position.copy(COM_S);
// rock rain while folding
const debN = 600;
const deb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: '#7a6a5a', roughness: 1, flatShading: true }), debN); deb.frustumCulled = false; space.add(deb);
const debP = []; for (let i = 0; i < debN; i++) debP.push({ t0: R(T_COLL + 1, T_BALL - 0.5), x: R(-4, 8), y: R(-0.5, 2.0), z: R(-1.5, 1.5), s: R(0.5, 2.0) });
const dmy = new THREE.Object3D();
function updateDebris(t) {
  for (let i = 0; i < debN; i++) { const D = debP[i]; const k = (t - D.t0) / 2.2;
    if (k < 0 || k > 1) { dmy.position.set(0, -999, 0); dmy.scale.setScalar(0); }
    else { const p = new THREE.Vector3(D.x, D.y, D.z); p.lerp(COM_S, k * k); dmy.position.copy(p); dmy.scale.setScalar(D.s * (1 - k * 0.6)); dmy.rotation.set(t * 2 + i, t * 1.3, 0); }
    dmy.updateMatrix(); deb.setMatrixAt(i, dmy.matrix); }
  deb.instanceMatrix.needsUpdate = true;
}
// =================== BOWL VIEW (km): standing on the shore at the bottom of the bowl ===================
const bowlSky = new THREE.Scene();
const bowlCam = new THREE.PerspectiveCamera(62, W / H, 0.4, 200000);
const A_KM = SP.a * KM_PER_CM, B_KM = SP.b * KM_PER_CM, D_KM = SP.d * KM_PER_CM;
const HW = 115;                                             // sea level above the bottom (km)
const SHORE_X = -A_KM * Math.sqrt(HW / D_KM);               // shore on the far side from the handle
const SHORE = new THREE.Vector3(SHORE_X, HW + 0.003, 0);
const SUN_B = new THREE.Vector3(0.35, 0.62, -0.7).normalize();
const bowlDomeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSunS: { value: SUN_B }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uDusk: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d); float sd=max(dot(d,uSunS),0.0);
    c+=vec3(1.0,0.95,0.85)*smoothstep(0.99985,0.99993,sd)*12.0+vec3(1.0,0.85,0.6)*pow(sd,900.0)*2.0;
    c*=mix(1.0,0.55,smoothstep(0.2,0.9,dot(d,uUp)));                       // thin air overhead: a deeper blue
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const bowlDome = new THREE.Mesh(new THREE.SphereGeometry(150000, 48, 32), bowlDomeMat); bowlSky.add(bowlDome);
const BOWL_FS = NOISE + SKYFN + `uniform vec3 uSun; uniform vec3 uCam; uniform float uSkyK, uWater; varying vec3 vW; varying vec3 vN;
  void main(){
    vec3 p=vW*0.0006; float n1=fbm6(p+vec3(2.0,5.0,1.0)), n2=snoise(p*6.0);
    vec3 rock=mix(vec3(0.36,0.29,0.23),vec3(0.58,0.46,0.34),0.5+0.5*n1); rock*=0.88+0.12*n2;
    float rr=length(vW.xz)/1000.0;                                          // thousands of km from the bottom
    float belt=1.0-smoothstep(2.35,2.9,rr+0.15*n1);
    vec3 green=mix(vec3(0.13,0.26,0.09),vec3(0.55,0.5,0.33),smoothstep(2.0,2.7,rr));
    vec3 alb=mix(rock,green,belt);
    if(uWater>0.5) alb=vec3(0.04,0.20,0.34);
    vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; float dif=max(dot(N,uSun),0.0);
    vec3 col=alb*(vec3(1.0,0.97,0.92)*dif*1.6+0.05)*(0.8+0.4*smoothstep(-0.4,0.6,n1));
    if(uWater>0.5){ vec3 V=normalize(uCam-vW); vec3 Hh=normalize(uSun+V); col+=pow(max(dot(N,Hh),0.0),90.0)*0.7; }
    vec3 d=normalize(vW-uCam); float e=dot(d,uUp); float air=1.0/max(e+0.03,0.03); float T=exp(-uSkyK*air);
    col=col*T+skyColor(d)*(1.0-T)*0.95;
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function bowlMat(water) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uSun: { value: SUN_B }, uCam: { value: SHORE }, uSkyK: { value: 0.07 }, uWater: { value: water ? 1 : 0 }, uOct: { value: 6 },
    uSunS: { value: SUN_B }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uDusk: { value: 0 } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: BOWL_FS });
}
{ // bowl surface on a polar grid around the shore point (fine near the camera, coarse far away)
  const NR = 150, NT = 240, pos = [], idx = [];
  for (let i = 0; i <= NR; i++) { const rho = 0.3 * Math.pow(60000 / 0.3, i / NR);
    for (let j = 0; j <= NT; j++) { const ph = j / NT * Math.PI * 2; const cx = Math.cos(ph), cz = Math.sin(ph);
      // clip to the rim ellipse along this ray
      const qa = (cx / A_KM) ** 2 + (cz / B_KM) ** 2, qb = 2 * SHORE_X * cx / A_KM ** 2, qc = (SHORE_X / A_KM) ** 2 - 1; const rmax = (-qb + Math.sqrt(qb * qb - 4 * qa * qc)) / (2 * qa);
      const r = Math.min(rho, rmax); const x = SHORE_X + cx * r, z = cz * r; pos.push(x, D_KM * ((x / A_KM) ** 2 + (z / B_KM) ** 2), z); } }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + 1, c = a + NT + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  bowlSky.add(new THREE.Mesh(g, bowlMat(false)));
  // the sea: a flat disc at sea level (an equipotential, flat enough at this size)
  const sea = new THREE.Mesh(new THREE.CircleGeometry(2400, 160), bowlMat(true)); sea.rotation.x = -Math.PI / 2; sea.position.y = HW; sea.scale.set(A_KM / B_KM, 1, 1); sea.renderOrder = 1;
  sea.material.polygonOffset = true; sea.material.polygonOffsetFactor = -2; bowlSky.add(sea);
  // the handle rising over the far rim
  const hp = [], hi = []; const NX = 80; for (let i = 0; i <= NX; i++) { const x = lerp(SP.X0 - 0.15, SP.X1, i / NX); const w = handleW(x) * KM_PER_CM; const y = handleZ(x) * KM_PER_CM;
    hp.push(x * KM_PER_CM, y, -w, x * KM_PER_CM, y, w, x * KM_PER_CM, y - SP.t * KM_PER_CM, -w, x * KM_PER_CM, y - SP.t * KM_PER_CM, w); }
  for (let i = 0; i < NX; i++) { const o = i * 4, q = o + 4; hi.push(o, q, o + 1, o + 1, q, q + 1, o + 2, o + 3, q + 2, o + 3, q + 3, q + 2, o, o + 2, q, o + 2, q + 2, q, o + 1, q + 1, o + 3, o + 3, q + 1, q + 3); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setIndex(hi); hg.computeVertexNormals(); bowlSky.add(new THREE.Mesh(hg, bowlMat(false)));
}

// =================== BEACH (meters): the only beach on the planet ===================
const beach = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.05, 30000);
const SLOPE = 0.105;                                         // the bowl floor rises gently away from the sea
beach.add(new THREE.HemisphereLight(0xcfe3ff, 0x8a7a5a, 1.1));
const beachSun = new THREE.DirectionalLight(0xfff2dc, 2.6); beachSun.position.copy(SUN_B).multiplyScalar(200); beachSun.castShadow = true; beachSun.shadow.mapSize.set(2048, 2048);
Object.assign(beachSun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 600 }); beach.add(beachSun, beachSun.target);
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const fadeVS = 'varying vec3 vW; varying vec3 vN; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';
const sandMat = new THREE.ShaderMaterial({ transparent: true, uniforms: { uCam: { value: new THREE.Vector3() }, uSun: { value: SUN_B }, uFade: { value: 900 }, uOct: { value: 6 } }, vertexShader: fadeVS,
  fragmentShader: NOISE + `uniform vec3 uCam; uniform vec3 uSun; uniform float uFade; varying vec3 vW; varying vec3 vN;
  void main(){ float n=snoise(vW*0.35)*0.5+snoise(vW*2.5)*0.25; vec3 alb=mix(vec3(0.78,0.68,0.50),vec3(0.86,0.77,0.58),0.5+0.5*n);
    alb=mix(alb,vec3(0.62,0.52,0.38),smoothstep(-0.5,0.4,-vW.y*3.0)*0.6);             // wet sand at the waterline
    float dif=max(dot(normalize(vN),uSun),0.0); vec3 col=alb*(vec3(1.0,0.97,0.92)*dif*1.3+0.35);
    float a=1.0-smoothstep(uFade*0.6,uFade,distance(vW.xz,uCam.xz)); gl_FragColor=vec4(col,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const waterMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uCam: { value: new THREE.Vector3() }, uSun: { value: SUN_B }, uT: { value: 0 }, uFade: { value: 2500 }, uOct: { value: 6 } }, vertexShader: fadeVS,
  fragmentShader: NOISE + `uniform vec3 uCam; uniform vec3 uSun; uniform float uT, uFade; varying vec3 vW;
  void main(){ vec2 q=vW.xz; float h1=snoise(vec3(q*0.25,uT*0.6)), h2=snoise(vec3(q*1.3,uT*1.1));
    vec3 N=normalize(vec3(h1*0.08+h2*0.04,1.0,snoise(vec3(q*0.25+7.0,uT*0.6))*0.08+snoise(vec3(q*1.3+3.0,uT))*0.04));
    vec3 V=normalize(uCam-vW); float fr=pow(1.0-max(dot(N,V),0.0),4.0);
    vec3 deep=vec3(0.03,0.22,0.36), shallow=vec3(0.14,0.52,0.58); float sh=smoothstep(60.0,0.0,vW.x);
    vec3 col=mix(deep,shallow,sh)*(0.55+0.5*max(dot(N,uSun),0.0)) + vec3(0.6,0.75,0.9)*fr*0.5;
    col+=pow(max(dot(N,normalize(uSun+V)),0.0),180.0)*1.6;
    float foam=smoothstep(0.55,0.8,sin(vW.x*1.6-uT*2.2+h1*2.0)*0.5+0.5)*smoothstep(6.0,0.0,vW.x); col=mix(col,vec3(0.95),foam*0.7);
    float a=(1.0-smoothstep(uFade*0.5,uFade,distance(vW.xz,uCam.xz)))*smoothstep(-0.2,0.6,vW.x);
    gl_FragColor=vec4(col,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
{
  const g = new THREE.PlaneGeometry(2400, 2400, 240, 240); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, -SLOPE * x + 0.12 * Math.sin(x * 0.4 + p.getZ(i) * 0.3)); }
  g.computeVertexNormals(); const sand = new THREE.Mesh(g, sandMat); sand.receiveShadow = true; beach.add(sand);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), waterMat); w.rotation.x = -Math.PI / 2; w.position.set(3000, 0.02, 0); w.renderOrder = 2; beach.add(w);
}
// the stream running down the beach into the sea
const streamMat = new THREE.ShaderMaterial({ transparent: true, uniforms: { uT: { value: 0 }, uOct: { value: 6 } }, vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: NOISE + `uniform float uT; varying vec2 vUv; varying vec3 vW; void main(){ float r=snoise(vec3(vUv.x*4.0,vUv.y*80.0-uT*6.0,0.0)); vec3 c=mix(vec3(0.10,0.42,0.55),vec3(0.75,0.9,0.95),smoothstep(0.45,0.9,r));
    float edge=smoothstep(0.0,0.2,vUv.x)*smoothstep(1.0,0.8,vUv.x); gl_FragColor=vec4(c,edge*0.95);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
{
  const path = []; for (let i = 0; i <= 60; i++) { const x = lerp(-260, 0.5, i / 60); path.push(new THREE.Vector3(x, 0, 30 + 9 * Math.sin(x * 0.045) + 4 * Math.sin(x * 0.13))); }
  const pos = [], uv = [], idx = []; const width = x => lerp(1.2, 3.4, (x + 260) / 260);
  path.forEach((p, i) => { const q = path[Math.min(i + 1, path.length - 1)], o = path[Math.max(i - 1, 0)]; const dir = q.clone().sub(o).normalize(); const nrm = new THREE.Vector3(-dir.z, 0, dir.x); const w = width(p.x);
    for (const s of [-1, 1]) { const v = p.clone().addScaledVector(nrm, s * w / 2); pos.push(v.x, -SLOPE * v.x + 0.06, v.z); uv.push(s < 0 ? 0 : 1, i / 60); } });
  for (let i = 0; i < 60; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const s = new THREE.Mesh(g, streamMat); s.renderOrder = 3; beach.add(s);
}
// umbrellas, towels, people (near, articulated) and a far crowd (instanced pawns)
const UMB = ['#e63946', '#ffb703', '#2a9d8f', '#3a86ff', '#ff70a6', '#8338ec', '#fb5607', '#06d6a0'];
const umbTex = UMB.map(c => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 16; const g = cv.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : c; g.fillRect(i * 32, 0, 32, 16); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; });
const umbGeo = new THREE.ConeGeometry(1.25, 0.55, 16, 1, true);
function umbrella(x, z) { const g = new THREE.Group(); const y = -SLOPE * x; g.position.set(x, y, z); beach.add(g);
  const top = mesh(umbGeo, new THREE.MeshStandardMaterial({ map: pick(umbTex), side: THREE.DoubleSide, roughness: 0.7 })); top.position.y = 2.15; g.add(top);
  const pole = mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 5), M('#eeeeee')); pole.position.y = 1.1; g.add(pole);
  const towel = mesh(new THREE.PlaneGeometry(0.8, 1.8), M(pick(UMB)), false, true); towel.rotation.x = -Math.PI / 2; towel.rotation.z = R(-0.4, 0.4); towel.position.set(R(-0.6, 0.6), 0.03, R(-0.6, 0.6)); g.add(towel); }
const beachPeople = [];
for (let i = 0; i < 750; i++) {
  const x = -Math.pow(rnd(), 1.4) * 60 - 0.5 + (rnd() < 0.18 ? R(3, 14) : 0), z = R(-10, 190); if (Math.abs(z - 30 - 9 * Math.sin(x * 0.045)) < 2.5 && x < 0) continue;
  const p = makePerson(rnd, { shorts: rnd() < 0.6, longSleeve: false }); beach.add(p.outer);
  beachPeople.push({ p, x, z, ry: R(0, 6.28), ph: R(0, 6), kind: x > 0 ? 'wade' : rnd() < 0.35 ? 'sit' : rnd() < 0.3 ? 'walk' : 'idle' });
}
for (let i = 0; i < 170; i++) umbrella(-R(3, 60), R(-10, 190));
const pawnGeo = mergeGeometries([new THREE.CapsuleGeometry(0.2, 0.9, 2, 6).translate(0, 0.65, 0).toNonIndexed(), new THREE.SphereGeometry(0.13, 6, 4).translate(0, 1.42, 0).toNonIndexed()]);
const PAWN_N = 9000;
const pawns = new THREE.InstancedMesh(pawnGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), PAWN_N);
{ const d = new THREE.Object3D(); const cols = ['#e63946', '#ffb703', '#2a9d8f', '#3a86ff', '#f1faee', '#ff70a6', '#1d3557', '#fb5607', '#8d5a3c', '#f1d2b6'];
  for (let i = 0; i < PAWN_N; i++) { const z = 190 + Math.pow(rnd(), 1.6) * 2600, x = -R(0.5, 70) * (1 + z / 500); d.position.set(x, -SLOPE * x, z); d.rotation.y = R(0, 6); d.scale.setScalar(R(0.9, 1.1)); d.updateMatrix(); pawns.setMatrixAt(i, d.matrix); pawns.setColorAt(i, new THREE.Color(pick(cols))); }
  beach.add(pawns); }
{ // houses packed up the slope behind the beach
  const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 1400); const d = new THREE.Object3D(); const cols = ['#f4e3c1', '#e8c9a0', '#ffffff', '#d9b38c', '#f2a65a', '#b5d6e8', '#e3e3e3'];
  for (let i = 0; i < 1400; i++) { const x = -R(95, 900), z = R(-700, 2600); const h = R(4, 14); d.position.set(x, -SLOPE * x + h / 2, z); d.scale.set(R(6, 14), h, R(6, 14)); d.rotation.y = R(-0.3, 0.3); d.updateMatrix(); hm.setMatrixAt(i, d.matrix); hm.setColorAt(i, new THREE.Color(pick(cols))); }
  hm.castShadow = true; hm.receiveShadow = true; beach.add(hm); }
function updateBeach(t) {
  sandMat.uniforms.uCam.value.copy(cam.position); waterMat.uniforms.uCam.value.copy(cam.position); waterMat.uniforms.uT.value = t; streamMat.uniforms.uT.value = t;
  beachSun.target.position.copy(cam.position); beachSun.position.copy(cam.position).addScaledVector(SUN_B, 200); beachSun.target.updateMatrixWorld();
  for (const B of beachPeople) {
    const o = B.p.outer; let x = B.x, z = B.z;
    if (B.kind === 'walk') { z = wrapR(B.z + (t - T_BEACH) * 1.1 * (B.ph > 3 ? 1 : -1), -10, 190); }
    const gy = B.kind === 'wade' ? -0.55 : -SLOPE * x; o.position.set(x, gy + (B.kind === 'sit' ? 0.5 : 0.95), z); o.rotation.set(0, B.kind === 'walk' ? (B.ph > 3 ? 0 : Math.PI) : B.ry, 0);
    if (B.kind === 'sit') poseSit(B.p); else if (B.kind === 'walk') poseWalk(B.p, t * 4.5 + B.ph, 1); else poseIdle(B.p, t, B.ph);
    o.visible = o.position.distanceTo(cam.position) > 1.4;
  }
}

// =================== AIRLESS (meters): up the bowl wall and out on the handle ===================
const bare = new THREE.Scene(); bare.background = new THREE.Color('#000000');
const bareCam = new THREE.PerspectiveCamera(55, W / H, 0.05, 20000);
const bareSun = new THREE.DirectionalLight(0xffffff, 3.2); bare.add(bareSun, bareSun.target); bareSun.castShadow = true; bareSun.shadow.mapSize.set(2048, 2048);
Object.assign(bareSun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 400 });
bare.add(new THREE.AmbientLight(0x202430, 0.5));
{ const n = 3000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-0.3, 1), R(-1, 1)).normalize().multiplyScalar(9000); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bare.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false }))); }
const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#fffbe8', fog: false })); sunDisc.scale.setScalar(120); bare.add(sunDisc);
const groundMat = new THREE.ShaderMaterial({ uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uBrown: { value: 1 }, uOct: { value: 6 } }, vertexShader: fadeVS,
  fragmentShader: NOISE + `uniform vec3 uSun; uniform float uBrown; varying vec3 vW; varying vec3 vN;
  void main(){ float n=fbm6(vW*0.08)+0.3*snoise(vW*1.5); vec3 brown=mix(vec3(0.30,0.24,0.19),vec3(0.52,0.41,0.31),0.5+0.5*n); vec3 grey=mix(vec3(0.33,0.33,0.34),vec3(0.55,0.55,0.54),0.5+0.5*n);
    vec3 alb=mix(grey,brown,uBrown); float dif=max(dot(normalize(vN),uSun),0.0); vec3 col=alb*(dif*1.7+0.03); gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const slope = new THREE.Group(); bare.add(slope);
{ const g = new THREE.PlaneGeometry(3000, 3000, 200, 200); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.25 * Math.sin(x * 0.3) * Math.sin(z * 0.27) + 0.6 * Math.sin(x * 0.05 + z * 0.04)); } g.computeVertexNormals();
  const gm = new THREE.Mesh(g, groundMat); gm.receiveShadow = true; slope.add(gm);
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#6b5a4a', roughness: 1, flatShading: true }), 500); const d = new THREE.Object3D();
  for (let i = 0; i < 500; i++) { d.position.set(R(-120, 120), 0, R(-120, 40)); d.scale.set(R(0.2, 1.4), R(0.15, 0.9), R(0.2, 1.4)); d.rotation.set(R(0, 3), R(0, 3), 0); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); }
  rocks.castShadow = true; slope.add(rocks); slope.userData.rocks = rocks; }
// astronaut
const astro = makePerson(rnd, { skin: '#f1d2b6', top: '#f2f2ee', bottom: '#f2f2ee', shoe: '#9a9a9a', longSleeve: true, hairStyle: 0.05, cap: false, shorts: false, dress: false });
{ const helm = mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.4 })); helm.position.set(0, 1.64, 0); astro.root.add(helm);
  const visor = mesh(new THREE.SphereGeometry(0.165, 20, 12, -Math.PI * 0.45, Math.PI * 0.9, Math.PI * 0.25, Math.PI * 0.42), new THREE.MeshStandardMaterial({ color: '#c08a2a', metalness: 0.9, roughness: 0.15 })); visor.position.set(0, 1.64, 0.05); astro.root.add(visor);
  const pack = mesh(new THREE.BoxGeometry(0.42, 0.55, 0.22), M('#dcdcd6')); pack.position.set(0, 1.2, -0.22); astro.root.add(pack); }
bare.add(astro.outer);
// =================== roulette ===================
const ROUL = [['Sphere', 0], ['Cube', 0.3], ['Rocket', 0.55], ['Donut', 0.85], ['Tsunami', 1.15], ['Pyramid', 1.45], ['Pizza', 1.8], ['Heart', 2.1], ['Star', 2.4], ['Diamond', 2.7], ['Fork', FORK], ['Spoon', LAND]];
const shapeLabel = { Sphere: 'Sphere', Cube: 'Cube', Rocket: 'Rocket', Donut: 'Donut', Tsunami: 'Tsunami', Pyramid: 'Pyramid', Pizza: 'Pizza slice', Heart: 'Heart', Star: 'Star', Diamond: 'Diamond', Fork: 'Fork', Spoon: 'Spoon' };
function rouletteAt(t) { let cur = ROUL[0]; ROUL.forEach(r => { if (t >= r[1]) cur = r; }); return { name: cur[0], since: t - cur[1] }; }
const Q_BASE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
const heroQ = (yaw, pitch) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0)).multiply(Q_BASE);   // handle up, bowl facing the camera

// =================== space: update + camera ===================
function updateSpace(t) {
  for (const k in shapes) shapes[k].visible = false; scaleEarth.visible = false; ballSphere.visible = false;
  let g;
  if (t < ROUL_END) {
    const r = rouletteAt(t); g = shapes[r.name]; g.visible = true;
    let popS = 1 + 0.22 * Math.exp(-r.since * 16) * Math.cos(r.since * 30) - 0.12 * Math.exp(-r.since * 30);
    let ang; if (t < FORK) ang = t * 4.4; else if (t < LAND) ang = FORK * 4.4 + (1 - Math.exp(-(t - FORK) * 3)) * 1.1; else ang = 0;
    g.quaternion.identity();
    if (r.name === 'Fork') { const w = Math.sin((t - FORK) * 9) * Math.exp(-(t - FORK) * 2.2); g.quaternion.copy(heroQ(0.25 + w * 0.15 + (t - FORK) * 0.2, -0.3)); popS = 0.9 * (1 + 0.15 * Math.exp(-r.since * 10) * Math.cos(r.since * 20)); g.position.set(0, 0.8, 0); }
    else if (r.name === 'Spoon') { g.quaternion.copy(heroQ(0.25 - 0.4 * Math.exp(-r.since * 5) + r.since * 0.08, -0.3)); popS = 0.9 * (1 + 0.2 * Math.exp(-r.since * 6) * Math.cos(r.since * 14)); g.position.set(0, 0.8, 0); }
    else if (r.name === 'Tsunami') { popS = 0.62; g.rotation.set(0.06, ang * 0.3, 0); g.position.set(-0.4, -1.2, 0); }
    else { if (r.name === 'Donut') g.rotation.set(0.55, 0.35, ang); else g.rotation.set(0.35 + 0.2 * Math.sin(t * 1.3), ang, r.name.startsWith('Rocket') ? -0.25 : 0.15); g.position.set(0, r.name === 'RocketHead' ? -1.2 : 1.0, 0); }
    g.scale.setScalar(popS);
  } else {
    const coll = t >= T_COLL;
    if (t < T_BALL + 0.15) { g = spoonG; g.visible = true; g.scale.setScalar(0.9); g.position.set(0, 0.8, 0);
      const yaw = t < T_SEA ? 0.25 + (t - LAND) * 0.08 : t < T_HANDLE ? 0.25 + (T_SEA - LAND) * 0.08 : 0.55 + (t - T_COLL) * 0.03; g.quaternion.copy(heroQ(yaw, -0.3)); }
    scaleEarth.visible = t >= T_SIZE + 0.6 && t < T_SEA + 0.2; scaleEarth.position.set(-2.6, -3.4, 0.6); scaleEarth.rotation.y = t * 0.2;
    if (coll) { const k = smooth(T_COLL + 0.6, T_BALL - 0.3, t); collapseSpoon(k); spoonMat.uniforms.uHeat.value = smooth(T_COLL + 1.0, T_COLL + 3.0, t) * 0.8;
      if (t >= T_BALL) { ballSphere.visible = true; ballSphere.position.copy(spoonG.localToWorld(COM_S.clone())); ballSphere.scale.setScalar(0.9 * (1 + 0.05 * Math.exp(-(t - T_BALL) * 3) * Math.cos((t - T_BALL) * 12))); ballSphere.userData.mat.uniforms.uHeat.value = 0.8 * Math.exp(-(t - T_BALL) * 0.8); }
      if (t >= T_BALL + 0.15) spoonG.visible = false; }
    else if (t < T_COLL && spoonMat.uniforms.uHeat.value !== 0) { spoonMat.uniforms.uHeat.value = 0; collapseSpoon(0); }
    airHalo.visible = !coll || t < T_COLL + 1.5; airHalo.material.uniforms.uA.value = coll ? 1 - smooth(T_COLL + 0.5, T_COLL + 1.5, t) : 1;
  }
  updateCameo(t);
  deb.visible = t > T_COLL && t < T_BALL + 0.5; if (deb.visible) { updateDebris(t); deb.position.copy(spoonG.position); deb.quaternion.copy(spoonG.quaternion); deb.scale.copy(spoonG.scale); }
}
function spaceUniforms(t) {
  spoonMat.uniforms.uCam.value.copy(spaceCam.position); spoonMat.uniforms.uSun.value.copy(SUN_SPACE); spoonMat.uniforms.uT.value = t;
  for (const s of [...Object.values(shapes), scaleEarth, ballSphere, cameo]) { if (!s.visible || !s.userData.mat) continue; const mat = s.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; if (s.userData.sh) s.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
}
function spaceCamera(t) {
  let pos, look = new THREE.Vector3(0, 0.8, 0), fov = 36;
  if (t < ROUL_END) { pos = new THREE.Vector3(0, 3.5, 56); look = new THREE.Vector3(0, 1.0, 0); }
  else if (t < T_SEA) { const u = (t - T_SIZE) / (T_SEA - T_SIZE); const dz = lerp(56, 31, ease((t - T_SIZE) / 2.2)) - u * 2; pos = new THREE.Vector3(lerp(0, 1.5, u), lerp(3.5, 4.5, u), dz); look = new THREE.Vector3(0.2, lerp(1.0, 1.8, ease((t - T_SIZE) / 2.2)), 0); }
  else if (t < T_HANDLE) {
    const u = ease((t - T_SEA) / (T_HANDLE - T_SEA - 0.8)); const bb = spoonG.localToWorld(BOWL_BOTTOM.clone());
    const far = new THREE.Vector3(1.5, 4.5, 29), near = bb.clone().add(new THREE.Vector3(1.2, 3.2, 6.5));
    pos = far.clone().lerp(near, u); look = new THREE.Vector3(0.2, 1.8, 0).lerp(bb, u); fov = lerp(36, 44, u);
  } else if (t < T_COLL) {    // T_HANDLE..T_TILT: glide along the handle toward the bowl
    const u = (t - T_HANDLE) / (T_TILT - T_HANDLE); const tip = spoonG.localToWorld(toScene(SP.X1 + 1.0, 0, handleZ(SP.X1) + 3.2)); const mid = spoonG.localToWorld(toScene(SP.X1 - 4.0, 0, handleZ(SP.X1) + 2.6));
    pos = tip.clone().lerp(mid, ease(u)); look = spoonG.localToWorld(toScene(1.0, 0, 0.3)); fov = 46;
  } else { const u = (t - T_COLL) / (T_END - T_COLL); pos = new THREE.Vector3(lerp(2.5, 1, u), lerp(4.5, 2.5, u), lerp(28, 20, u)); look = new THREE.Vector3(0.6, lerp(1.4, 0.2, smooth(T_COLL + 2, T_BALL, t)), 0); fov = 36; }
  let sh = 0; if (t > T_COLL + 1 && t < T_BALL + 0.4) sh = 0.05 + 0.1 * smooth(T_COLL + 3, T_BALL - 0.5, t);
  const s = new THREE.Vector3(Math.sin(t * 41) + Math.sin(t * 23), Math.sin(t * 37 + 1), Math.sin(t * 29 + 2)).multiplyScalar(sh);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos).add(s); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(look.clone().add(s.multiplyScalar(0.3)));
}
// =================== ground shots ===================
const TILT0 = 27, TILT1 = 59;
const tiltDeg = t => lerp(TILT0, TILT1, ease((t - T_TILT - 1.5) / 4.5));
function updateBare(t) {
  const walk = t < T_SUIT; groundMat.uniforms.uBrown.value = walk ? 1 : 0; slope.userData.rocks.material.color.set(walk ? '#6b5a4a' : '#5a5a5c');
  const sunDir = walk ? new THREE.Vector3(-0.5, 0.75, 0.45).normalize() : new THREE.Vector3(-0.8, 0.22, 0.55).normalize();
  groundMat.uniforms.uSun.value.copy(sunDir);
  if (walk) {
    const a = tiltDeg(t) * Math.PI / 180; slope.rotation.set(0, 0, a);
    const sAlong = (t - T_TILT) * 0.75; const p = new THREE.Vector3(Math.cos(a) * sAlong, Math.sin(a) * sAlong, 0);
    astro.outer.position.copy(p).add(new THREE.Vector3(-Math.sin(a) * 0.95, Math.cos(a) * 0.95, 0)); astro.outer.position.y = p.y + 0.95 / Math.cos(a) * Math.cos(a) + 0.02; astro.outer.position.x = p.x;
    astro.outer.rotation.set(0, Math.PI / 2, 0); astro.outer.rotateX(0.12 + 0.25 * (a / (TILT1 * Math.PI / 180)));
    poseWalk(astro, t * 4.2, 0.9 + 0.3 * a);
    bareCam.fov = 50; const ap = astro.outer.position; bareCam.position.copy(ap).add(new THREE.Vector3(-0.8, 0.9, 6.0)); bareCam.up.set(0, 1, 0); bareCam.lookAt(ap.clone().add(new THREE.Vector3(0.4, 0.1, 0)));
  } else {
    slope.rotation.set(0, 0, 0); const u = t - T_SUIT;
    const gH = 0.24 * 9.81, v0 = Math.sqrt(2 * 9.81 * 0.5), air = 2 * v0 / gH;      // a 0.5 m hop on Earth -> 2.1 m here, 2.7 s in the air
    const jt = (u - 1.6) % (air + 0.9); const y = u > 1.6 && jt < air ? v0 * jt - 0.5 * gH * jt * jt : 0;
    astro.outer.position.set(u * 0.5, 0.95 + y + 0.4, 0); astro.outer.rotation.set(0, Math.PI / 2 + 0.4, 0);
    if (y > 0) poseFlail(astro, t * 0.4, 1); else poseIdle(astro, t, 0);
    bareCam.fov = 52; bareCam.position.set(u * 0.5 - 2.5, 1.0, 7.5); bareCam.up.set(0, 1, 0); bareCam.lookAt(u * 0.5 + 0.5, 2.2, 0);
  }
  bareCam.updateProjectionMatrix(); bareSun.position.copy(astro.outer.position).addScaledVector(sunDir, 100); bareSun.target.position.copy(astro.outer.position); bareSun.target.updateMatrixWorld();
  sunDisc.position.copy(bareCam.position).addScaledVector(sunDir, 8000);
}
function beachCamera(t) {
  const u = (t - T_BEACH) / (T_SUIT - T_BEACH);
  const x = lerp(-9, -8, u), z = lerp(-14, -6, u); cam.position.set(x, -SLOPE * x + 2.1, z);
  cam.fov = 64; cam.up.set(0, 1, 0); cam.lookAt(x + lerp(42, 48, u), -SLOPE * x + 2.1 + 9, z + 100); cam.updateProjectionMatrix();
  bowlCam.fov = cam.fov; bowlCam.aspect = cam.aspect; bowlCam.updateProjectionMatrix(); bowlCam.position.copy(SHORE); bowlCam.quaternion.copy(cam.quaternion); bowlDome.position.copy(SHORE);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'titleEnd', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'earthLab', 'cameoLab'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [5.2, 7.9, 'Same rock as Earth,<br>shaped like a tablespoon.'],
  [8.1, 10.8, '57,000 miles long.<br>Seven Earths, end to end.'],
  [11.2, 13.9, 'The lowest point on the spoon<br>is the bottom of the bowl.'],
  [14.1, 16.8, 'So every ocean drains<br>into one sea.'],
  [17.3, 20.4, 'The air drains<br>there too.'],
  [20.6, 23.7, 'The handle has<br>no air at all.'],
  [24.3, 27.4, 'Walk toward the rim…'],
  [27.6, 30.7, '…and the ground tilts<br>like a ski slope.'],
  [31.3, 34.0, '8 billion people.<br>One beach.'],
  [34.2, 36.9, 'About 590 people<br>per meter.'],
  [37.1, 39.8, 'And you weigh 1/7<br>of normal.'],
  [40.3, 43.8, "Out on the handle<br>you'd weigh a quarter…"],
  [44.0, 47.7, "…but there's nothing<br>to breathe."],
  [48.3, 51.6, 'No rock can hold<br>this shape.'],
  [51.8, 55.7, 'The handle folds in.<br>The tip lands in about 6 hours.'],
  [56.2, 60.8, 'Earth is a ball again…<br>with one very crowded beach.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '';
  if (t < ROUL_END) { const r = rouletteAt(t); lab = "EARTH'S SHAPE"; val = shapeLabel[r.name]; sub = t < FORK ? 'SPINNING THE WHEEL…' : (t < LAND ? 'NOT QUITE…' : 'THERE IT IS.'); }
  else if (t < T_SEA) { lab = 'LENGTH'; val = '57,400 mi'; sub = '7 EARTHS END TO END · 741 MI THICK'; }
  else if (t < T_HANDLE) { stat = '<b></b>MODEL'; lab = 'SEA DEPTH'; val = '120 mi'; sub = '18× THE MARIANA TRENCH'; }
  else if (t < T_TILT) { stat = '<b></b>MODEL'; lab = 'AIR ON THE HANDLE'; val = '0'; sub = 'IT ALL POOLS IN THE BOWL'; }
  else if (t < T_BEACH) { stat = '<b></b>MODEL'; lab = 'GRAVITY TILT'; val = Math.round(tiltDeg(t)) + '°'; sub = 'WALKING UP THE BOWL'; }
  else if (t < 37.0) { stat = '<b></b>MODEL'; lab = 'PEOPLE PER METER'; val = '590'; sub = '8 BILLION · ONE SHORELINE'; }
  else if (t < T_SUIT) { stat = '<b></b>MODEL'; lab = 'YOUR WEIGHT'; val = '14%'; sub = 'ON THE ONLY BEACH'; }
  else if (t < T_COLL) { stat = '<b></b>MODEL'; lab = 'ON THE HANDLE'; val = '0.24 G'; sub = 'A 1.6 FT HOP ON EARTH = 6.8 FT HERE'; }
  else if (t < T_BALL) { stat = '<b></b>MODEL · TIME-LAPSE'; lab = 'COLLAPSE'; val = 'T+ ' + (6.4 * smooth(T_COLL + 0.6, T_BALL - 0.3, t)).toFixed(1) + ' h'; sub = 'HANDLE TIP LANDS AT ≈ 6.4 H'; }
  else { lab = "EARTH'S SHAPE"; val = 'Sphere'; sub = 'AGAIN.'; }
  return { stat, lab, val, sub };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(ROUL_END, ROUL_END + 0.3, t);
  el.titleEnd.style.opacity = smooth(LAND + 0.02, LAND + 0.18, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = 1 - smooth(T_END, T_END + 0.4, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  el.veil.style.background = '#03050a'; el.veil.style.opacity = Math.max(...[T_TILT, T_BEACH, T_SUIT, T_COLL].map(x => fadeWin(t, x - 0.2, x + 0.2, 0.2)));
  el.flash.style.opacity = t >= T_BALL ? Math.exp(-(t - T_BALL) * 2.4) * 0.9 : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  const eA = fadeWin(t, T_SIZE + 1.0, T_SEA, 0.4);
  if (eA > 0) { spaceCam.updateMatrixWorld(); const p = scaleEarth.position.clone().add(new THREE.Vector3(0, -earthR * 1.25, 0)).project(spaceCam); el.earthLab.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.earthLab.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px'; }
  el.earthLab.style.opacity = eA;
  const cA = fadeWin(t, CAMEO_T0 + 0.15, CAMEO_T1 - 0.1, 0.2);
  if (cA > 0) { spaceCam.updateMatrixWorld(); const p = cameoPos(t).add(new THREE.Vector3(0, 10.5, 0)).project(spaceCam); el.cameoLab.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.cameoLab.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px'; }
  el.cameoLab.style.opacity = cA;
}

// =================== main ===================
window.renderAt = (t) => {
  const shot = t < T_TILT ? 'space' : t < T_BEACH ? 'bare' : t < T_SUIT ? 'beach' : t < T_COLL ? 'bare' : 'space';
  if (shot === 'space') { updateSpace(t); spaceCamera(t); spaceUniforms(t); }
  updateDOM(t);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (shot === 'space') renderer.render(space, spaceCam);
  else if (shot === 'bare') { updateBare(t); renderer.render(bare, bareCam); }
  else { beachCamera(t); updateBeach(t); renderer.render(bowlSky, bowlCam); renderer.clearDepth(); renderer.render(beach, cam); }
  return true;
};
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
