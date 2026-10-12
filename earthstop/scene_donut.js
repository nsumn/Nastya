import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle } from './people.js';

// "What if Earth was shaped like a donut?"  — facts: Anders Sandberg, "Torus-Earth" (2014)
// donut: inner equator 1,305 km, outer 10,633 km, half-thickness 1,953 km, day 2.84 h, ~0.29 G at equators
// =================== timeline ===================
const LAND = 3.07, ROUL_END = 4.4, SPACE_END = 10.5, DIVE_END = 14.5, REVEAL = 21, GRAV = 27.5, TL = 35, NIGHT = 42.5, OUT = 49, OUT_SPACE = 51.6, SPIN = 55, CRUSH = 59.3, T_END = 60.5;
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
uniform vec3 uSun; uniform vec3 uCam; uniform vec3 uSunCol; uniform float uClouds; uniform float uNS, uAmb, uHeat, uMode, uSkyK, uSkyS, uNear, uLights, uCloudT, uIceAxis;
varying vec3 vB; varying vec3 vN; varying vec3 vW; varying vec3 vON;
void main(){
  if(uMode>0.5 && distance(vW,uCam)<uNear) discard;
  vec3 p=vB*uNS;
  float c=fbm(p*1.15+vec3(3.1,0.7,5.3))+0.12*snoise(p*7.0);
  float land=smoothstep(0.04,0.075,c);
  vec3 ocean=mix(vec3(0.012,0.06,0.17),vec3(0.03,0.22,0.36),smoothstep(-0.3,0.06,c));
  float dry=snoise(p*2.1+7.0)+0.3*snoise(p*9.0);
  vec3 green=mix(vec3(0.10,0.24,0.07),vec3(0.24,0.33,0.12),0.5+0.5*snoise(p*6.0));
  vec3 lnd=mix(green,vec3(0.58,0.46,0.29),smoothstep(0.15,0.55,dry));
  lnd=mix(lnd,vec3(0.40,0.36,0.32),smoothstep(0.32,0.55,c));
  vec3 alb=mix(ocean,lnd,land);
  float ice=smoothstep(0.86,0.93,abs(normalize(vON).z))*uIceAxis; alb=mix(alb,vec3(0.86,0.9,0.95),ice);
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
      uOct: { value: o.oct || 6 }, uClouds: { value: o.clouds ?? 1 }, uSunS: { value: new THREE.Vector3(0, 1, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uDusk: { value: 0 },
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
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); const b = R(0.35, 1); const w = rnd(); col.set([b * (w < 0.2 ? 1 : 0.85), b * 0.9, b * (w > 0.8 ? 1 : 0.8)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9 })));
}
const SUN_SPACE = new THREE.Vector3(-0.75, 0.42, 0.52).normalize();
// sun glow sprite far away
function glowTex(inner = 'rgba(255,248,230,1)', mid = 'rgba(255,210,140,0.35)') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(0.08, inner); gr.addColorStop(0.25, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
sunSprite.position.copy(SUN_SPACE).multiplyScalar(1200); sunSprite.scale.setScalar(260); space.add(sunSprite);

// ---- roulette shapes
const SHAPE_NS = 0.16;
function shapeMesh(geo, shellScale = 1.045, ice = 1) {
  withBase(geo); const mat = planetMat({ ns: SHAPE_NS, ice }); const m = new THREE.Mesh(geo, mat);
  const g = new THREE.Group(); g.add(m); const sh = atmoShell(geo, shellScale); g.add(sh); g.userData = { mat, sh }; g.visible = false; space.add(g); return g;
}
function lathe(pts, seg = 96) { return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); }
const shapes = {};
shapes.Sphere = shapeMesh(new THREE.IcosahedronGeometry(7.2, 40));
shapes.Cube = shapeMesh(new THREE.BoxGeometry(11, 11, 11, 40, 40, 40), 1.035, 0);
{ // the "rocket"
  const prof = [];
  for (let i = 0; i <= 10; i++) prof.push([2.05 + 0.08 * Math.sin(i / 10 * Math.PI), -4.5 + i * 0.95]);  // shaft
  for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; prof.push([2.55 * Math.cos(a) * (i === 0 ? 0.86 : 1), 5.4 + 2.5 * Math.sin(a)]); }
  prof.splice(11, 0, [2.4, 5.0], [2.62, 5.35]);
  prof.unshift([0.001, -4.6]);
  const shaft = lathe(prof, 72); shaft.deleteAttribute('uv');
  const b1 = new THREE.SphereGeometry(2.55, 48, 32); b1.translate(-1.95, -5.4, 0.3); b1.deleteAttribute('uv');
  const b2 = new THREE.SphereGeometry(2.55, 48, 32); b2.translate(1.95, -5.4, -0.3); b2.deleteAttribute('uv');
  const g = mergeGeometries([shaft.toNonIndexed(), b1.toNonIndexed(), b2.toNonIndexed()]); g.computeVertexNormals();
  shapes.Rocket = shapeMesh(g, 1.04, 0);
}
shapes.Pyramid = shapeMesh((() => { const g = new THREE.ConeGeometry(8.5, 11.5, 4, 30); g.translate(0, -1.2, 0); return g.toNonIndexed(); })(), 1.04, 0);
shapes.Disc = shapeMesh(new THREE.CylinderGeometry(9.5, 9.5, 1.5, 128, 6), 1.03, 0);
shapes.Pear = shapeMesh(lathe((() => { const p = []; for (let i = 0; i <= 40; i++) { const u = i / 40; const y = -6.2 + u * 13; const r = Math.sqrt(Math.max(0, Math.sin(u * Math.PI))) * (5.6 - 3.0 * smooth(0.35, 0.8, u)) + 0.001; p.push([r, y]); } return p; })(), 96));
{
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 3.6 : 8.6; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.9, bevelSize: 0.7, bevelSegments: 4, curveSegments: 4 }); g.translate(0, 0, -1.2); g.deleteAttribute('uv');
  shapes.Star = shapeMesh(g.toNonIndexed(), 1.04, 0);
}
// ---- the donut (units: 1000 km). R = 5.969, r = 4.664, axial scale 0.419 -> inner 1.305, outer 10.633, half-thickness 1.954
const DR = 5.969, Dr = 4.664, DZ = 0.419, TU = 256, TV = 96;
const donutGeo = new THREE.TorusGeometry(DR, Dr, TV, TU); donutGeo.scale(1, 1, DZ); withBase(donutGeo);
const donutBase = donutGeo.attributes.position.array.slice();
const sphereTarget = new Float32Array(donutBase.length);
const morphDelay = new Float32Array(donutBase.length / 3);
for (let j = 0; j <= TV; j++) for (let i = 0; i <= TU; i++) {
  const k = j * (TU + 1) + i; const u = i / TU * Math.PI * 2, v = j / TV * Math.PI * 2;
  const lat = v <= Math.PI ? v / Math.PI * Math.PI / 2 : -((2 * Math.PI - v) / Math.PI) * Math.PI / 2;
  const RS = 6.371;
  sphereTarget[k * 3] = RS * Math.cos(lat) * Math.cos(u); sphereTarget[k * 3 + 1] = RS * Math.cos(lat) * Math.sin(u); sphereTarget[k * 3 + 2] = RS * Math.sin(lat);
  morphDelay[k] = 0.5 - 0.5 * Math.cos(v); // inner rim moves first
}
const donutMat = planetMat({ ns: SHAPE_NS * 1.0, ice: 0 });
const donut = new THREE.Mesh(donutGeo, donutMat);
const donutShellGeo = new THREE.TorusGeometry(DR, Dr * 1.035, 48, 160); donutShellGeo.scale(1, 1, DZ * 1.07);
const donutShell = atmoShell(donutShellGeo, 1.0);
const donutG = new THREE.Group(); donutG.add(donut); donutG.add(donutShell); donutG.visible = false; space.add(donutG);
shapes.Donut = donutG; donutG.userData = { mat: donutMat, sh: donutShell };
// debris for the crush
const debrisN = 900;
const debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: '#8a6a4a', emissive: '#ff6a1a', emissiveIntensity: 1.4, roughness: 1, flatShading: true }), debrisN);
debris.frustumCulled = false; space.add(debris);
const debrisP = []; for (let i = 0; i < debrisN; i++) { const up = rnd() < 0.5 ? 1 : -1; const a = R(0, Math.PI * 2); debrisP.push({ t0: R(57.9, 59.0), up, a, vz: R(1.5, 5.5) * up, vr: R(-0.6, 1.4), s: R(0.5, 2.6), w: R(-6, 6) }); }
space.add(new THREE.AmbientLight(0x334055, 0.6));
const spaceDir = new THREE.DirectionalLight(0xfff2e0, 2.5); spaceDir.position.copy(SUN_SPACE).multiplyScalar(50); space.add(spaceDir);

// =================== SKY scene (km) — the far side of the donut seen from the inner equator ===================
const sky = new THREE.Scene();
const skyCam = new THREE.PerspectiveCamera(60, W / H, 1, 80000);
const SKY_POS = new THREE.Vector3(1305 - 1.5, 0, 0);       // 1.5 km above the inner equator
const SKY_UP = new THREE.Vector3(-1, 0, 0);
const Q_CITY2SKY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2); // city x(east)->+Y, y(up)->-X, z(north)->+Z
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uStars: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform float uStars; varying vec3 vD;
  float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    float sd=max(dot(d,uSunS),0.0); float vis=smoothstep(-0.02,0.01,dot(uSunS,uUp));
    c+=vec3(1.0,0.95,0.85)*smoothstep(0.99985,0.99993,sd)*vis*12.0 + vec3(1.0,0.85,0.6)*pow(sd,900.0)*vis*2.0;
    vec3 g=floor(d*420.0); float s=h3(g); c+=vec3(0.9,0.92,1.0)*step(0.9975,s)*uStars*(0.4+0.6*h3(g+3.1))*smoothstep(0.0,0.2,dot(d,uUp));
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(60000, 48, 32), domeMat); sky.add(dome);
const archGeo = (() => { const NU = 720, NV = 110, v0 = Math.PI - 1.35, v1 = Math.PI + 1.35; const pos = [], nor = [], uv = [], idx = [];
  const Rm = DR * 1000, rm = Dr * 1000;
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU * Math.PI * 2, v = v0 + (v1 - v0) * j / NV;
    pos.push((Rm + rm * Math.cos(v)) * Math.cos(u), (Rm + rm * Math.cos(v)) * Math.sin(u), rm * Math.sin(v) * DZ);
    const n = new THREE.Vector3(Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v) / DZ).normalize(); nor.push(n.x, n.y, n.z); uv.push(i / NU, v / (Math.PI * 2)); }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; })();
// bake the far-side surface once (procedural noise is far too slow per pixel in software GL)
const BAKE_W = 4096, BAKE_H = 2048;
const bakeRT = new THREE.WebGLRenderTarget(BAKE_W, BAKE_H, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
bakeRT.texture.anisotropy = 2;
{
  const bs = new THREE.Scene(); const bc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bm = new THREE.ShaderMaterial({
    uniforms: { uOct: { value: 10 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: NOISE + `varying vec2 vUv;
    void main(){
      float u=vUv.x*6.2831853, v=vUv.y*6.2831853;
      vec3 pk=vec3((${(DR * 1000).toFixed(1)}+${(Dr * 1000).toFixed(1)}*cos(v))*cos(u),(${(DR * 1000).toFixed(1)}+${(Dr * 1000).toFixed(1)}*cos(v))*sin(u),${(Dr * 1000 * DZ).toFixed(1)}*sin(v));
      vec3 p=pk*${(SHAPE_NS * 2.6 / 1000).toFixed(8)};
      float c=fbm(p*1.15+vec3(3.1,0.7,5.3))+0.12*snoise(p*7.0);
      float land=smoothstep(0.04,0.075,c);
      vec3 ocean=mix(vec3(0.012,0.06,0.17),vec3(0.03,0.22,0.36),smoothstep(-0.3,0.06,c));
      float dry=snoise(p*2.1+7.0)+0.3*snoise(p*9.0);
      vec3 green=mix(vec3(0.10,0.24,0.07),vec3(0.24,0.33,0.12),0.5+0.5*snoise(p*6.0));
      vec3 lnd=mix(green,vec3(0.58,0.46,0.29),smoothstep(0.15,0.55,dry));
      lnd=mix(lnd,vec3(0.40,0.36,0.32),smoothstep(0.32,0.55,c));
      vec3 alb=mix(ocean,lnd,land);
      float cl=smoothstep(0.22,0.62,fbm6(p*2.4+vec3(0.0,0.0,11.0)))*0.85;
      alb=mix(alb,vec3(0.92),cl*0.8);
      float nl=land*(1.0-cl)*smoothstep(0.78,0.92,snoise(p*45.0)*0.5+0.5);
      gl_FragColor=vec4(sqrt(alb),nl);
    }`,
  });
  bs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bm));
  renderer.setRenderTarget(bakeRT); renderer.render(bs, bc); renderer.setRenderTarget(null);
  bm.dispose();
}
const archMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: bakeRT.texture }, uSun: { value: new THREE.Vector3() }, uCam: { value: SKY_POS }, uSunCol: { value: new THREE.Color(1, 0.97, 0.92) }, uAmb: { value: 0.04 }, uLights: { value: 0.22 }, uSkyK: { value: 0.14 }, uSkyS: { value: 0.6 }, uNear: { value: 260 },
    uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 } },
  vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: SKYFN + `uniform sampler2D uTex; uniform vec3 uSun; uniform vec3 uCam; uniform vec3 uSunCol; uniform float uAmb, uLights, uSkyK, uSkyS, uNear;
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main(){
    if(distance(vW,uCam)<uNear) discard;
    vec4 tx=texture2D(uTex,vUv); vec3 alb=tx.rgb*tx.rgb;
    vec3 N=normalize(vN); float dif=max(dot(N,uSun),0.0);
    vec3 col=alb*(uSunCol*dif*1.45+uAmb);
    col+=vec3(1.0,0.72,0.38)*tx.a*(1.0-smoothstep(0.0,0.12,dif))*uLights;
    vec3 d=normalize(vW-uCam); float e=dot(d,uUp); float air=1.0/max(e+0.035,0.035); float T=exp(-uSkyK*air);
    col=col*T+skyColor(d)*uSkyS;
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const arch = new THREE.Mesh(archGeo, archMat); sky.add(arch);

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

// =================== day/night ===================
const DEC = -23.4 * Math.PI / 180;
function sunCity(wt) { return new THREE.Vector3(Math.cos(DEC) * Math.sin(wt), -Math.cos(DEC) * Math.cos(wt), Math.sin(DEC)); }
function wtAt(t) {
  const base = Math.PI + 1.1;
  if (t < TL) return base + 0.004 * (t - DIVE_END);
  if (t < NIGHT) return lerp(base + 0.004 * (TL - DIVE_END), 2 * Math.PI, ease((t - TL) / (NIGHT - TL - 0.3)));
  return 2 * Math.PI + 0.01 * (t - NIGHT);
}
const hz = new THREE.Color(); const tmpV = new THREE.Vector3();
function skyHorizon(day, dusk) { const a = new THREE.Color(0.016, 0.024, 0.05).lerp(new THREE.Color(0.62, 0.74, 0.88), day); return a.lerp(new THREE.Color(0.95, 0.52, 0.26), dusk); }

// =================== shots ===================
function cityCamera(t) {
  let pos, look, fov = 62;
  if (t < REVEAL) {             // street, then tilt up
    const u = t - DIVE_END; const tilt = ease((t - 17.6) / 5.4);
    pos = new THREE.Vector3(2 + u * 1.2, 6.5 + tilt * 0.8, -3.2);
    look = new THREE.Vector3(pos.x + 100, lerp(10, 105, tilt), -1 + tilt * 2);
    fov = lerp(62, 72, tilt);
  } else if (t < GRAV) {
    const u = t - REVEAL; const tilt = 1;
    pos = new THREE.Vector3(2 + (REVEAL - DIVE_END) * 1.2 + u * 0.9, 7.3, -3.2);
    look = new THREE.Vector3(pos.x + 100, 105 - u * 3, 1 + u * 0.3);
    fov = 72;
  } else if (t < TL) {
    const u = t - GRAV;
    pos = new THREE.Vector3(35.2 + u * 0.12, 1.75, -9.9);
    look = new THREE.Vector3(50, 5.2 + u * 0.15, -8.6);
    fov = 60;
  } else if (t < NIGHT) {
    const u = t - TL;
    pos = new THREE.Vector3(-30 + u * 0.4, 3.2, 3.0);
    look = new THREE.Vector3(80, 62, -1);
    fov = 74;
  } else if (t < OUT) {
    const u = t - NIGHT;
    pos = new THREE.Vector3(55 + u * 0.8, 6.0, -3.0);
    look = new THREE.Vector3(pos.x + 100, 110 - u * 3, 2);
    fov = 72;
  } else {
    const u = t - OUT;
    pos = new THREE.Vector3(70, 6 + Math.pow(u, 2.6) * 18, -2);
    look = new THREE.Vector3(170, 60 + Math.pow(u, 2.6) * 18 * 0.9, 0);
    fov = 70;
  }
  cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
  return { pos, look };
}
function spaceCamera(t) {
  let pos, look = new THREE.Vector3(0, 0, 0), fov = 36;
  if (t < ROUL_END) { pos = new THREE.Vector3(0, 5.5, 54); look = new THREE.Vector3(0, 4.5, 0); }
  else if (t < SPACE_END) { const u = (t - ROUL_END) / (SPACE_END - ROUL_END); const a = -0.5 + u * 0.7; pos = new THREE.Vector3(Math.sin(a) * 52, 22 - u * 6, Math.cos(a) * 52); look = new THREE.Vector3(0, 1 - u, 0); }
  else if (t < DIVE_END) {
    const u = ease((t - SPACE_END) / (DIVE_END - SPACE_END));
    const p0 = new THREE.Vector3(Math.sin(0.2) * 52, 16, Math.cos(0.2) * 52);
    const p1 = new THREE.Vector3(0.4, 19, 2.0), p2 = new THREE.Vector3(-0.2, 1.3, 0.25);
    pos = u < 0.55 ? p0.clone().lerp(p1, ease(u / 0.55)) : p1.clone().lerp(p2, ease((u - 0.55) / 0.45));
    look = new THREE.Vector3(0, 0, 0).lerp(new THREE.Vector3(1.3, -0.6, 0.0), smooth(0.4, 1, u)); fov = lerp(36, 70, smooth(0.5, 1, u));
  }
  else if (t < SPIN) { const u = ease((t - OUT_SPACE) / (SPIN - OUT_SPACE)); pos = new THREE.Vector3(-0.3, lerp(1.2, 15, u), lerp(0.3, 34, u)).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6 * u); look = new THREE.Vector3(lerp(1.3, 0, u), lerp(-0.5, 0, u), 0); fov = lerp(70, 38, u); }
  else { const u = (t - SPIN) / (T_END - SPIN); pos = new THREE.Vector3(Math.sin(0.6 + u * 0.3) * (40 - u * 8), 15 - u * 4, Math.cos(0.6 + u * 0.3) * (40 - u * 8)); }
  // shake during crush
  let sh = 0; if (t > 57.6 && t < T_END) sh = 0.12 * smooth(57.6, 58.6, t) + 0.5 * Math.exp(-Math.abs(t - 58.75) * 3);
  const s = new THREE.Vector3(Math.sin(t * 41) + Math.sin(t * 23), Math.sin(t * 37 + 1), Math.sin(t * 29 + 2)).multiplyScalar(sh);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos).add(s); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(look.clone().add(s.multiplyScalar(0.3)));
}

// =================== roulette ===================
const ROUL = [['Sphere', 0], ['Cube', 0.3], ['Rocket', 0.55], ['Pyramid', 1.2], ['Disc', 1.45], ['Pear', 1.7], ['Star', 1.97], ['Cube', 2.27], ['Disc', 2.63], ['Donut', LAND]];
window.ROUL = ROUL;
const shapeLabel = { Sphere: 'Sphere', Cube: 'Cube', Rocket: 'Rocket?', Pyramid: 'Pyramid', Disc: 'Flat disc', Pear: 'Pear', Star: 'Star', Donut: 'Donut' };
function rouletteAt(t) { let cur = ROUL[0], i0 = 0; ROUL.forEach((r, i) => { if (t >= r[1]) { cur = r; i0 = i; } }); return { name: cur[0], since: t - cur[1], i: i0 }; }
function spinAngle(t) { // donut spin (visual, time-lapse). 1 turn per ~9 s, slowing during the crush
  const w0 = 2 * Math.PI / 9; if (t < SPIN) return w0 * t;
  let a = w0 * SPIN; const n = 60, dt = (t - SPIN) / n; for (let i = 0; i < n; i++) { const tt = SPIN + (i + 0.5) * dt; a += w0 * (1 - 0.85 * smooth(SPIN, 58.4, tt)) * dt; } return a;
}

// =================== updates ===================
function updateSpace(t) {
  const isRoul = t < ROUL_END;
  for (const k in shapes) shapes[k].visible = false;
  let g, popS = 1;
  if (isRoul) {
    const r = rouletteAt(t); g = shapes[r.name]; g.visible = true;
    popS = 1 + 0.22 * Math.exp(-r.since * 16) * Math.cos(r.since * 30) - 0.12 * Math.exp(-r.since * 30);
    if (r.name === 'Donut') popS = 0.76 * (1 + 0.18 * Math.exp(-r.since * 6) * Math.cos(r.since * 14));
    const spinRate = t < LAND ? 4.2 : 4.2 * Math.exp(-(t - LAND) * 2.2) + 0.25;
    const ang = t < LAND ? t * 4.2 : LAND * 4.2 + (4.2 - 0.25) / 2.2 * (1 - Math.exp(-(t - LAND) * 2.2)) + 0.25 * (t - LAND);
    g.scale.setScalar(popS); g.position.set(0, 4.5, 0);
    if (r.name === 'Donut') { g.rotation.set(-1.15, 0, 0); donut.rotation.z = ang * 0.6; donutShell.rotation.z = 0; }
    else { g.rotation.set(0.35 + 0.2 * Math.sin(t * 1.3), ang, r.name === 'Rocket' ? -0.32 : 0.15); }
    void spinRate;
  } else {
    g = donutG; g.visible = true; g.position.set(0, 0, 0);
    const k = smooth(ROUL_END, ROUL_END + 0.6, t); g.scale.setScalar(lerp(0.76, 1, ease(k)));
    g.rotation.set(-1.15, 0, 0.0); donut.rotation.z = LAND * 4.2 * 0.6 + spinAngle(t) - spinAngle(ROUL_END);
  }
  // planet uniforms
  for (const k in shapes) {
    const s = shapes[k]; if (!s.visible) continue; const mat = s.userData.mat;
    mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03;
    s.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE);
  }
  // crush
  const pos = donutGeo.attributes.position.array;
  const m = smooth(55.6, 58.75, t);
  if (m > 0 || donutGeo.userData.dirty) {
    for (let k = 0; k < morphDelay.length; k++) {
      const d = morphDelay[k]; const mk = ease(clamp((m - (1 - d) * 0.35) / 0.65, 0, 1));
      const wob = 0.12 * Math.sin(k * 0.37 + t * 9) * mk * (1 - mk) * 4;
      for (let c = 0; c < 3; c++) pos[k * 3 + c] = lerp(donutBase[k * 3 + c], sphereTarget[k * 3 + c], mk) * (1 + wob * 0.02);
    }
    donutGeo.attributes.position.needsUpdate = true; donutGeo.computeVertexNormals(); donutGeo.userData.dirty = m > 0;
  }
  donutMat.uniforms.uHeat.value = smooth(56.2, 58.6, t) * (1 - 0.6 * smooth(59.5, 60.5, t));
  donutShell.material.uniforms.uA.value = 1 - 0.7 * smooth(56, 58.5, t) + 0.7 * smooth(59, 60.4, t);
  donutShell.visible = m < 0.02 || t > 59.6;
  // debris
  const dm = new THREE.Object3D();
  for (let i = 0; i < debrisN; i++) {
    const p = debrisP[i]; const age = t - p.t0;
    if (age < 0 || t < 57) { dm.position.set(0, 0, -9999); dm.scale.setScalar(0); }
    else { const r = 0.3 + p.vr * age; dm.position.set(Math.cos(p.a) * r, Math.sin(p.a) * r, p.up * 1.0 + p.vz * age - Math.sign(p.vz) * 0.9 * age * age); dm.position.applyEuler(donutG.rotation); dm.scale.setScalar(p.s * (1 - smooth(1.2, 2.2, age))); dm.rotation.set(age * p.w, age * p.w * 0.7, 0); }
    dm.updateMatrix(); debris.setMatrixAt(i, dm.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;
}

function updateCity(t) {
  const wt = wtAt(t); const s = sunCity(wt); const e = s.y;
  const day = smooth(-0.1, 0.25, e), dusk = smooth(-0.22, -0.02, e) * (1 - smooth(0.05, 0.32, e));
  const night = 1 - smooth(-0.2, 0.05, e);
  // sky uniforms (sky frame)
  const sS = s.clone().applyQuaternion(Q_CITY2SKY);
  for (const mat of [domeMat, archMat]) { mat.uniforms.uSunS.value.copy(sS); mat.uniforms.uDay.value = day; mat.uniforms.uDusk.value = dusk; }
  domeMat.uniforms.uStars.value = night; archMat.uniforms.uLights.value = 0.2 * night;
  archMat.uniforms.uSun.value.copy(sS);
  archMat.uniforms.uSkyS.value = lerp(0.9, 0.5, day); archMat.uniforms.uSkyK.value = 0.14;
  // lights
  sunL.position.copy(cam.position).addScaledVector(s, 300); sunL.target.position.copy(cam.position).add(new THREE.Vector3(50, 0, 0)); sunL.target.updateMatrixWorld();
  const sunUp = smooth(-0.03, 0.12, e);
  sunL.intensity = 3.1 * sunUp; sunL.color.setRGB(1, lerp(0.62, 0.95, smooth(0, 0.35, e)), lerp(0.38, 0.86, smooth(0, 0.35, e)));
  hemi.intensity = 0.25 + 0.85 * day + 0.25 * dusk;
  hemi.color.setRGB(lerp(0.35, 0.75, day) + dusk * 0.3, lerp(0.42, 0.84, day), lerp(0.62, 0.95, day));
  // the far side lights the night (up to ~12,000 lux)
  archL.intensity = 2.2 * night; archL.position.copy(cam.position).add(new THREE.Vector3(10, 200, -40)); archL.target.position.copy(cam.position); archL.target.updateMatrixWorld();
  hz.copy(skyHorizon(day, dusk)); city.fog.color.copy(hz).multiplyScalar(lerp(1, 1.0, night));
  city.fog.near = 160; city.fog.far = 2600;
  const glow = smooth(0.15, -0.1, e);
  for (const m of winMats) m.emissiveIntensity = 0.75 * glow;
  for (const m of lampHeads) m.emissiveIntensity = 2.5 * glow;
  const cc = new THREE.Color().setRGB(lerp(0.05, 1, day) + dusk * 0.5, lerp(0.055, 0.98, day) + dusk * 0.2, lerp(0.07, 0.97, day));
  clouds.forEach((c, i) => { c.material.color.copy(cc); c.position.x += 0; });
  // traffic lights cycle
  const phase = Math.floor((t + 3) / 6) % 2;
  TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  // cars
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * t, -220, 760); c.g.position.set(x, 0, c.lane); c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 7; }
  // palms sway
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); });
  // people
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'walk') { const x = wrapR(P.x0 + P.v * t, -60, 260); o.position.set(x, 0.95 + 0.18, P.z); o.rotation.set(0, P.v > 0 ? Math.PI / 2 : -Math.PI / 2, 0); poseWalk(P.p, t * Math.abs(P.v) * 4.4 + P.ph); }
    else if (P.kind === 'idle') { o.position.set(P.x0, 0.95 + 0.18, P.z); o.rotation.set(0, P.rotIdle, 0); poseIdle(P.p, t, P.ph); }
    else if (P.kind === 'cross') { const z = wrapR(P.z0 + P.v * t, -12, 12); o.position.set(P.x, 0.95 + (Math.abs(z) > 7 ? 0.18 : 0), z); o.rotation.set(0, P.v > 0 ? 0 : Math.PI, 0); poseWalk(P.p, t * Math.abs(P.v) * 4.4 + P.ph); }
    else if (P.kind === 'jump') {
      const per = 2 * JUMP.v0 / JUMP.g + 0.55; const tt = ((t + P.off) % per + per) % per; const air = tt - 0.55;
      let y = 0, crouch = 0;
      if (air > 0) y = JUMP.v0 * air - 0.5 * JUMP.g * air * air; else crouch = Math.sin(Math.PI * tt / 0.55);
      o.position.set(P.x, 0.95 + 0.18 + Math.max(0, y) - crouch * 0.18, P.z); o.rotation.set(0, P.rot, 0);
      const p = P.p; const inAir = air > 0 ? 1 : 0;
      p.legs[0].rotation.x = -0.5 * inAir - 0.6 * crouch; p.legs[1].rotation.x = -0.3 * inAir - 0.6 * crouch;
      p.knees[0].rotation.x = 0.9 * inAir + 1.1 * crouch; p.knees[1].rotation.x = 0.6 * inAir + 1.1 * crouch;
      p.arms[0].rotation.x = -2.7 * inAir + 0.5 * crouch; p.arms[1].rotation.x = -2.5 * inAir + 0.5 * crouch;
      p.arms[0].rotation.z = 0.35 * inAir; p.arms[1].rotation.z = -0.35 * inAir; p.elbows[0].rotation.x = -0.2; p.elbows[1].rotation.x = -0.2;
    }
  }
  { // ball: bounces 3.4x higher than on Earth
    const per = 2 * 6.0 / JUMP.g; const tt = (t % per); const y = 6.0 * tt - 0.5 * JUMP.g * tt * tt;
    ball.position.set(47 + 0.4 * Math.sin(t), 0.12 + 0.18 + y, -10.4);
  }
  return { s, day, dusk, night };
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'titleEnd', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'cracks', 'veil'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [4.7, 7.3, 'Same mass. Same water.<br>Just a new shape.'],
  [7.5, 10.3, 'To keep this shape, it has to spin<br>8 times faster than Earth.'],
  [10.7, 14.2, 'And you live on the inside,<br>at the edge of the hole.'],
  [14.8, 17.6, 'Down here, it looks<br>like any other city.'],
  [17.9, 20.8, 'Until you look up.'],
  [21.2, 24.2, "That's the other side<br>of the planet."],
  [24.5, 27.3, '1,600 miles away,<br>arching across your sky.'],
  [27.8, 31.0, "Gravity here is less than<br>a third of Earth's."],
  [31.3, 34.8, 'Jump, and you fly 3× higher<br>and hang there 3× longer.'],
  [35.3, 38.7, 'A full day lasts just<br>2 hours 50 minutes.'],
  [39.0, 42.3, 'The sun races across the sky.<br>Sunset takes 15 seconds.'],
  [42.8, 45.8, 'But the night is never dark.'],
  [46.1, 48.8, 'The other side is still in sunlight,<br>and it lights up your streets.'],
  [49.3, 52.0, 'All of this depends<br>on one thing.'],
  [52.3, 54.8, 'The spin.'],
  [55.3, 57.7, 'Slow it down,<br>and the hole closes.'],
  [57.9, 60.3, 'Gravity crushes it<br>back into a ball.'],
];
function dayStr(h) { let hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return mm === 0 ? `${hh} h` : `${hh} h ${mm} min`; }
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '';
  if (t < ROUL_END) { const r = rouletteAt(t); lab = "EARTH'S SHAPE"; val = shapeLabel[r.name]; sub = t < LAND ? 'SPINNING THE WHEEL…' : 'SAME MASS AS EARTH'; }
  else if (t < SPACE_END) { lab = 'ONE DAY'; const h = lerp(24, 2.84, ease((t - 7.6) / 1.8)); val = dayStr(h); sub = t < 9.4 ? 'EARTH TODAY · 24 H' : 'ABOUT 8.5× FASTER SPIN'; }
  else if (t < DIVE_END) { lab = 'THE HOLE'; val = '1,622 mi'; sub = 'ABOUT NEW YORK → DENVER'; }
  else if (t < REVEAL) { lab = 'YOU ARE HERE'; val = 'Inner equator'; sub = 'INSIDE THE HOLE'; }
  else if (t < GRAV) { lab = 'OTHER SIDE'; val = '1,622 mi'; sub = 'ACROSS THE HOLE · ~30° OF SKY'; }
  else if (t < TL) { lab = 'GRAVITY'; val = '0.29 G'; sub = '165 LB ON EARTH = 48 LB HERE'; }
  else if (t < NIGHT) { stat = '<b></b>TIME-LAPSE'; lab = 'ONE DAY'; val = '2 h 50 min'; sub = 'THE SUN MOVES 127° PER HOUR'; }
  else if (t < OUT) { lab = 'NIGHT SKY'; val = '12,000 lux'; sub = 'FULL MOON ON EARTH · UNDER 1 LUX'; }
  else if (t < SPIN) { lab = 'ONE TURN EVERY'; val = '2 h 50 min'; sub = 'THE SPIN HOLDS THE HOLE OPEN'; }
  else if (t < CRUSH) { stat = '<b></b>SPIN SLOWING'; lab = 'ONE TURN EVERY'; val = dayStr(lerp(2.84, 24, Math.pow(smooth(SPIN, 58.6, t), 1.6))); sub = 'TOO SLOW TO HOLD THE HOLE OPEN'; }
  else { lab = "EARTH'S SHAPE"; val = 'Sphere'; sub = 'BACK TO A BALL'; }
  return { stat, lab, val, sub };
}
function buildCracks() {
  let s = '';
  for (const [cx, cy, n] of [[300, 620, 13], [820, 1180, 11], [190, 1560, 9]]) {
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
  el.titleEnd.style.opacity = smooth(LAND + 0.02, LAND + 0.2, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = 1 - smooth(T_END, T_END + 0.4, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  // transitions: space->city (white haze), city->space, crush flash
  const f1 = smooth(DIVE_END - 0.55, DIVE_END - 0.05, t) * (1 - smooth(DIVE_END, DIVE_END + 0.55, t));
  const f2 = smooth(OUT_SPACE - 0.6, OUT_SPACE - 0.05, t) * (1 - smooth(OUT_SPACE, OUT_SPACE + 0.6, t));
  const f3 = t >= 58.7 ? Math.exp(-(t - 58.7) * 2.2) * 0.95 : 0;
  el.veil.style.opacity = Math.max(f1, f2) * 0.97; el.flash.style.opacity = f3;
  el.cracks.style.opacity = t >= 59.2 ? 1 - smooth(T_END + 2.5, T_END + 3.2, t) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  const inSpace = t < DIVE_END || t >= OUT_SPACE;
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
