import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// "What if the Sun was a blue star?" — model star = Spica A (25,300 K, 7.47 R_sun, ~20,500 L_sun, 10.25 M_sun).
// numbers: tools/bluestar_math.py (1 AU: x20,500 sunlight, ~5,000 F; safe orbit 143 AU = 4.8x Neptune, year 535 yr;
// dot 19x smaller; 92% UV, daylight ~14%, UV ~8x; sunsets still orange; lifespan < 30 Myr vs ~10 Gyr).
// =================== timeline ===================
const SWAP = 6.0, SPACE1 = 10.0, HOT = 17.0, MAP = 24.0, MEADOW2 = 31.0, DUSK = 40.0, AGE = 46.0, SN = 53.0, T_END = 60.0;
const FPS = 30;
// =================== rng / helpers ===================
let seed = 2531;
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


// =================== shared helpers ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const glowTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const col3 = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), clamp(k, 0, 1));
const fadeWin = (t, a, b, f = 0.35) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
// value noise (build time, deterministic)
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
function fbm2(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); a *= 0.5; f *= 2.03; } return s; }

// =================== MEADOW (meters): rolling hills, a stream, grass, flowers, trees, mountains, birds, butterflies ===================
const meadow = new THREE.Scene();
meadow.fog = new THREE.Fog(new THREE.Color('#e8c8b0'), 400, 7000);
const mCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 9000);
const mHemi = new THREE.HemisphereLight(0x9ab8e0, 0x4a5a30, 0.8); meadow.add(mHemi);
const mSun = new THREE.DirectionalLight(0xffc488, 2.2); mSun.castShadow = true; mSun.shadow.mapSize.set(2048, 2048);
Object.assign(mSun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 600 }); mSun.shadow.bias = -0.0004; mSun.shadow.normalBias = 0.02; mSun.shadow.radius = 2;
meadow.add(mSun, mSun.target);

// ---- terrain height
const xr = z => 4 + 10 * Math.sin(z / 35) + 4 * Math.sin(z / 13 + 2);          // stream centerline
const WL = -0.75;                                                                 // water level
function hills(x, z) { return 2.5 * fbm2(x / 40, z / 40) + 9 * fbm2(x / 160 + 3, z / 160 - 1) - 2.6; }
function mountains(x, z) {
  const r = Math.hypot(x, z + 200); if (r < 500) return 0;
  let h = 0, a = 1, f = 1 / 420; for (let o = 0; o < 5; o++) { const n = 1 - Math.abs(vnoise(x * f + 5.1, z * f - 2.7) * 2 - 1); h += n * n * a; a *= 0.5; f *= 2.1; }
  const az = Math.atan2(x, -z);                                        // gaps in the range where the sun rises and sets
  const gap = 1 - 0.88 * Math.exp(-(((az - 0.16) / 0.22) ** 2)) - 0.97 * Math.exp(-(((az + 0.29) / 0.2) ** 2));
  return h * 300 * smooth(700, 1700, r) * gap;
}
function th(x, z) {
  const d = Math.abs(x - xr(z));
  const k = smooth(4, 34, d);
  return hills(x, z) * k - 1.5 * (1 - smooth(1.6, 5.6, d)) + mountains(x, z);
}
function terrainMesh(w, d, cx, cz, seg, drop) {
  const g = new THREE.PlaneGeometry(w, d, Math.round(w / seg), Math.round(d / seg)); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); let h = th(x, z);
    if (drop && Math.abs(x) < 196 && z > -496 && z < 56) h -= 0.6;
    p.setY(i, h);
    const dR = Math.abs(x - xr(z)), n = fbm2(x / 9, z / 9, 3), m = mountains(x, z);
    c.set('#6aa63e').lerp(new THREE.Color('#9cc552'), n * 0.9).lerp(new THREE.Color('#4f8a35'), smooth(0.55, 0.8, fbm2(x / 50 + 9, z / 50, 3)));
    if (dR < 6.5) c.lerp(new THREE.Color('#b9a77a'), 1 - smooth(3.6, 6.5, dR));
    if (m > 25) { c.lerp(new THREE.Color('#3f6a3a'), smooth(25, 60, m)); c.lerp(new THREE.Color('#7d8088'), smooth(90, 160, m)); c.lerp(new THREE.Color('#f2f5fa'), smooth(215, 250, m + n * 30)); }
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); m.receiveShadow = true; meadow.add(m); return m;
}
terrainMesh(400, 560, 0, -220, 1.6, false);
terrainMesh(6000, 6000, 0, -1500, 30, true);

// ---- sky dome: gradient + sun glow + disc + glare (the star's look is driven per frame)
const skyU = {
  uSun: { value: new THREE.Vector3(0, 0.1, -1).normalize() }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlowCol: { value: new THREE.Color() },
  uDiscCol: { value: new THREE.Color() }, uDisc: { value: 0.008 }, uDiscI: { value: 20 }, uGlowK: { value: 40 }, uGlowI: { value: 1 }, uHorGlow: { value: 1 }, uGlare: { value: 0 },
};
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD=(modelMatrix*vec4(position,1.0)).xyz-cameraPosition; gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 uSun, uZen, uHor, uGlowCol, uDiscCol; uniform float uDisc, uDiscI, uGlowK, uGlowI, uHorGlow, uGlare; varying vec3 vD;
  void main(){ vec3 d=normalize(vD); float e=d.y;
    vec3 c=mix(uHor,uZen,pow(max(e,0.0),0.55));
    vec3 dh=normalize(vec3(d.x,0.0,d.z)+1e-5), sh=normalize(vec3(uSun.x,0.0,uSun.z)+1e-5);
    c+=uGlowCol*pow(max(dot(dh,sh),0.0),4.0)*exp(-max(e,0.0)*7.0)*uHorGlow;
    float sd=dot(d,uSun); c+=uGlowCol*pow(max(sd,0.0),uGlowK)*uGlowI;
    float ang=acos(clamp(sd,-1.0,1.0));
    c+=uDiscCol*(1.0-smoothstep(uDisc*0.8,uDisc,ang))*uDiscI;
    c+=uDiscCol*uGlare*(0.00002/(ang*ang+0.0000012)+0.01*pow(max(sd,0.0),300.0));
    float streak=exp(-abs(d.y-uSun.y)*900.0)*exp(-abs(ang)*9.0); c+=uDiscCol*streak*uGlare*0.6;
    if(e<0.0) c=uHor*0.9;
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(8000, 64, 32), skyMat); skyMesh.frustumCulled = false; skyMesh.renderOrder = -1; meadow.add(skyMesh);

// ---- the stream: reflective water (sky colour by fresnel, little ripples, sun glints)
const waterU = { uTime: { value: 0 }, uSun: skyU.uSun, uZen: skyU.uZen, uHor: skyU.uHor, uDiscCol: skyU.uDiscCol, uSunI: { value: 1 }, uFog: { value: new THREE.Color() }, uFogN: { value: 140 }, uFogF: { value: 2600 } };
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterU, transparent: false,
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform float uTime, uSunI, uFogN, uFogF; uniform vec3 uSun, uZen, uHor, uDiscCol, uFog; varying vec3 vW;
  void main(){
    vec2 p=vW.xz; float t=uTime;
    vec3 n=normalize(vec3(0.05*sin(p.x*2.1+p.y*0.7+t*2.3)+0.035*sin(p.x*4.7-p.y*3.1+t*3.1)+0.02*sin(p.y*9.0+t*4.0), 1.0,
                          0.05*cos(p.y*1.9-p.x*0.5+t*2.0)+0.03*sin(p.y*5.3+p.x*2.2-t*2.7)+0.02*cos(p.x*8.0-t*3.5)));
    vec3 V=normalize(cameraPosition-vW); vec3 Rf=reflect(-V,n); float e=max(Rf.y,0.0);
    vec3 sky=mix(uHor,uZen,pow(e,0.55));
    float fr=0.06+0.94*pow(1.0-max(dot(n,V),0.0),5.0);
    vec3 deep=vec3(0.03,0.10,0.12);
    vec3 c=mix(deep,sky,fr*0.9+0.08);
    c+=uDiscCol*pow(max(dot(Rf,uSun),0.0),600.0)*30.0*uSunI;
    float dist=length(cameraPosition-vW); c=mix(c,uFog,smoothstep(uFogN,uFogF,dist));
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = WL; meadow.add(water);

// ---- grass: instanced blades swaying in the breeze
const GRASS_T = { value: 0 };
function swayMat(color) {
  const m = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => { sh.uniforms.uTime = GRASS_T; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    vec2 ip=vec2(instanceMatrix[3][0],instanceMatrix[3][2]);
    float sw=sin(uTime*1.5+ip.x*0.31+ip.y*0.23)*0.16+sin(uTime*3.3+ip.x*1.7)*0.04;
    transformed.x+=sw*position.y*position.y*2.2; transformed.z+=sw*0.4*position.y*position.y*2.2;`); };
  return m;
}
{
  const bg = new THREE.BufferGeometry(); const w = 0.035, hh = 0.5;
  bg.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.65, hh * 0.5, 0.01, w * 0.65, hh * 0.5, 0.01, 0, hh, 0.04], 3));
  bg.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]); bg.computeVertexNormals();
  const N = 90000, im = new THREE.InstancedMesh(bg, swayMat('#ffffff'), N); const o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
  for (let i = 0; i < N * 3 && k < N; i++) {
    const x = R(-26, 30), z = R(-70, 14); const h = th(x, z); if (h < WL + 0.12) continue;
    if (k > N * 0.55 && (x < -12 || x > 18 || z < -40)) continue;               // densest near the camera paths
    o.position.set(x, h - 0.02, z); o.rotation.set(R(-0.15, 0.15), R(0, 6.28), R(-0.15, 0.15)); const s = R(0.6, 1.5); o.scale.set(s, s * R(0.8, 1.3), s); o.updateMatrix();
    im.setMatrixAt(k, o.matrix); c.set('#5f9e35').lerp(new THREE.Color('#a8cc58'), rnd() * 0.8).lerp(new THREE.Color('#3f7a2a'), rnd() * 0.35); im.setColorAt(k, c); k++;
  }
  im.count = k; im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false; meadow.add(im);
}
// ---- wildflowers
{
  const fg = new THREE.OctahedronGeometry(0.06, 0); fg.scale(1, 0.55, 1);
  const N = 6000, im = new THREE.InstancedMesh(fg, swayMat('#ffffff'), N); const o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
  const FL = ['#ffffff', '#fff3a0', '#ffd23a', '#f6a6c8', '#c9a0ff', '#ff8a5a', '#ffffff', '#fff7d6'];
  for (let i = 0; i < N * 3 && k < N; i++) {
    const cx = R(-24, 28), cz = R(-65, 12); const patch = fbm2(cx / 7 + 40, cz / 7, 2); if (patch < 0.48) continue;
    const h = th(cx, cz); if (h < WL + 0.3) continue;
    o.position.set(cx, h + R(0.22, 0.42), cz); o.rotation.set(0, R(0, 6.28), 0); o.scale.setScalar(R(0.7, 1.4)); o.updateMatrix(); im.setMatrixAt(k, o.matrix);
    c.set(FL[Math.floor(fbm2(cx / 4, cz / 4, 1) * 7.99)]); im.setColorAt(k, c); k++;
  }
  im.count = k; im.frustumCulled = false; meadow.add(im);
}
// ---- trees: round broadleaf trees + pines (instanced), a few big framing trees near the camera
{
  const leafG = new THREE.IcosahedronGeometry(1, 0), pineG = mergeGeometries([new THREE.ConeGeometry(1, 1.4, 7).translate(0, 0.7, 0), new THREE.ConeGeometry(0.8, 1.2, 7).translate(0, 1.4, 0), new THREE.ConeGeometry(0.55, 1.0, 7).translate(0, 2.0, 0)]);
  const trunkG = new THREE.CylinderGeometry(0.12, 0.18, 1, 6).translate(0, 0.5, 0);
  const NB = 900, NP = 1300;
  const leaf = new THREE.InstancedMesh(leafG, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), NB * 3);
  const pine = new THREE.InstancedMesh(pineG, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), NP);
  const trunk = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: '#6b4f36' }), NB + NP);
  const o = new THREE.Object3D(), c = new THREE.Color(); let kl = 0, kp = 0, kt = 0;
  const place = (x, z, big, kind) => {
    const h = th(x, z); if (h < WL + 0.5) return; const m = mountains(x, z); if (m > 150) return;
    const s = big ? R(1.3, 1.8) : R(0.7, 1.3);
    if (kind === 'b') {
      o.position.set(x, h, z); o.rotation.set(0, R(0, 6), 0); o.scale.set(s * 2.6, s * 2.8, s * 2.6); o.updateMatrix(); trunk.setMatrixAt(kt++, o.matrix);
      for (let j = 0; j < 3; j++) { o.position.set(x + R(-1.2, 1.2) * s, h + s * (3.2 + j * 0.9 + R(-0.3, 0.3)), z + R(-1.2, 1.2) * s); o.rotation.set(R(0, 3), R(0, 3), 0); o.scale.setScalar(s * R(1.5, 2.2) * (1 - j * 0.15)); o.updateMatrix(); leaf.setMatrixAt(kl, o.matrix);
        c.set('#4f8f34').lerp(new THREE.Color('#8fbf48'), rnd() * 0.7); leaf.setColorAt(kl++, c); }
    } else {
      o.position.set(x, h, z); o.rotation.set(0, R(0, 6), 0); o.scale.set(s * 1.4, s * 2.0, s * 1.4); o.updateMatrix(); trunk.setMatrixAt(kt++, o.matrix);
      o.position.set(x, h + s * 1.4, z); o.scale.set(s * 2.4, s * 3.6, s * 2.4); o.updateMatrix(); pine.setMatrixAt(kp, o.matrix); c.set('#2f6b3a').lerp(new THREE.Color('#4f8a45'), rnd() * 0.6); pine.setColorAt(kp++, c);
    }
  };
  for (let i = 0; i < 6000 && (kl < NB * 3 - 3 || kp < NP); i++) {
    const x = R(-900, 900), z = R(-1300, -60); if (Math.abs(x - xr(z)) < 10) continue;
    const grove = fbm2(x / 120, z / 120, 3); if (grove < 0.5) continue;
    const kind = mountains(x, z) > 15 || rnd() < 0.35 ? 'p' : 'b'; if (kind === 'b' && kl > NB * 3 - 3) continue; if (kind === 'p' && kp >= NP) continue;
    place(x, z, false, kind);
  }
  for (const [x, z] of [[-17, -14], [-22, -32], [26, -24], [-30, -6], [31, -48], [-12, -58], [22, -66], [-35, -40]]) place(x, z, true, 'b');
  leaf.count = kl; pine.count = kp; trunk.count = kt;
  for (const m of [leaf, pine, trunk]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; meadow.add(m); }
}
// ---- rocks along the stream
for (let i = 0; i < 70; i++) { const z = R(-120, 12), side = rnd() < 0.5 ? -1 : 1, x = xr(z) + side * R(2.6, 5.5); const r = mesh(new THREE.DodecahedronGeometry(R(0.2, 0.7), 0), M('#8d8a84', { flatShading: true })); r.position.set(x, th(x, z) + 0.05, z); r.rotation.set(R(0, 3), R(0, 3), 0); r.scale.y = R(0.5, 0.8); meadow.add(r); }

// ---- clouds (soft sprites tinted by the light)
const cloudTex = canvasTex(256, 128, (g, w, h) => {
  for (let i = 0; i < 28; i++) { const x = R(40, w - 40), y = R(50, h - 30), r = R(16, 40); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
});
const mClouds = [];
for (let i = 0; i < 16; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, opacity: 0.85 }));
  const a = rnd() < 0.5 ? R(0.6, 1.3) : -R(0.8, 1.3);                     // well clear of the sunrise (0.16) and sunset/noon (-0.3) directions
  const d = R(2400, 3600); s.position.set(Math.sin(a) * d, d * Math.tan(R(10, 24) * Math.PI / 180), -Math.cos(a) * d); const sc = R(600, 1100); s.scale.set(sc, sc * 0.33, 1);
  s.userData.x0 = s.position.x; meadow.add(s); mClouds.push(s);
}
// ---- birds (far silhouettes) and butterflies (near)
const birds = [];
{
  const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.18, 1.0, 0.05, 0.05], 3)); wingG.computeVertexNormals();
  const bm = new THREE.MeshBasicMaterial({ color: '#2a2a33', side: THREE.DoubleSide, fog: true });
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4).scale(2.2, 0.8, 0.8), bm); g.add(body);
    const wl = new THREE.Mesh(wingG, bm), wr = new THREE.Mesh(wingG, bm); wr.scale.x = -1; g.add(wl, wr); g.scale.setScalar(1.0);
    meadow.add(g); birds.push({ g, wl, wr, i, ph: R(0, 6), y: R(18, 34), z: R(-110, -60), x0: R(-30, 10) });
  }
}
const flies = [];
{
  const wg = new THREE.PlaneGeometry(0.13, 0.11).translate(0.065, 0, 0);
  const FC = ['#ff9a2e', '#ffffff', '#7fb8ff', '#ffe066', '#ff9a2e', '#ffffff', '#c9a0ff'];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); const m = new THREE.MeshLambertMaterial({ color: FC[i % FC.length], side: THREE.DoubleSide });
    const l = new THREE.Mesh(wg, m), r = new THREE.Mesh(wg, m); r.scale.x = -1; g.add(l, r); meadow.add(g);
    flies.push({ g, l, r, ph: R(0, 6), c: new THREE.Vector3(R(-3, 4), 0, R(-14, 2)), a: R(0.3, 0.6), b: R(0.4, 0.8) });
  }
}

// meadow update: grass/water time, birds, butterflies, clouds; L = light state from the timeline
function updateMeadow(t, L) {
  GRASS_T.value = t; waterU.uTime.value = t;
  skyU.uSun.value.copy(L.sun); skyU.uZen.value.copy(L.zen); skyU.uHor.value.copy(L.hor); skyU.uGlowCol.value.copy(L.glow); skyU.uDiscCol.value.copy(L.disc);
  skyU.uDisc.value = L.discR; skyU.uDiscI.value = L.discI; skyU.uGlowK.value = L.glowK; skyU.uGlowI.value = L.glowI; skyU.uHorGlow.value = L.horGlow; skyU.uGlare.value = L.glare;
  waterU.uSunI.value = L.sunI / 2; waterU.uFog.value.copy(L.fog);
  meadow.fog.color.copy(L.fog); meadow.fog.near = 400; meadow.fog.far = 7000; waterU.uFogN.value = 400; waterU.uFogF.value = 7000;
  mSun.color.copy(L.light); mSun.intensity = L.sunI; mHemi.color.copy(L.hemiSky); mHemi.groundColor.copy(L.hemiGnd); mHemi.intensity = L.hemiI;
  mSun.position.copy(mCam.position).addScaledVector(L.sun, 300); mSun.target.position.copy(mCam.position).add(new THREE.Vector3(0, 0, -18)); mSun.target.updateMatrixWorld();
  mSun.shadow.radius = L.shadowR;
  for (const s of mClouds) { s.position.x = s.userData.x0 + t * 6; s.material.color.copy(L.cloud); }
  for (const B of birds) {
    const x = B.x0 + 60 - (t * 7 + B.i * 4) % 140, y = B.y + Math.sin(t * 0.7 + B.ph) * 1.5 + (B.i % 3) * 1.2, z = B.z - (B.i % 4) * 3;
    B.g.position.set(x, y, z); B.g.rotation.set(0, Math.PI, 0); const f = Math.sin(t * 9 + B.ph) * 0.6; B.wl.rotation.z = f; B.wr.rotation.z = -f;
  }
  for (const F of flies) {
    const u = t + F.ph * 3; const p = F.c.clone().add(new THREE.Vector3(Math.sin(u * F.a) * 2.2 + Math.sin(u * 1.7) * 0.3, 0, Math.cos(u * F.b) * 1.8));
    p.y = th(p.x, p.z) + 0.6 + 0.35 * Math.sin(u * 1.3) + 0.08 * Math.sin(u * 7);
    F.g.position.copy(p); F.g.rotation.set(0.3, u * 0.6, 0); const f = 0.2 + 1.1 * Math.abs(Math.sin(t * 13 + F.ph)); F.l.rotation.y = -f; F.r.rotation.y = f;
  }
}

// =================== SPACE scenes ===================
// shared star field
const starGeo = (() => { const n = 6000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); const c = new THREE.Color();
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(5000); pos.set([v.x, v.y, v.z], i * 3); c.set(pick(['#ffffff', '#cfe0ff', '#ffe9c8', '#ffffff', '#bcd2ff'])).multiplyScalar(R(0.35, 1)); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; })();
const starPtMat = new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false });
function addStars(scene) { const p = new THREE.Points(starGeo, starPtMat); p.frustumCulled = false; scene.add(p); return p; }

// star surface: boiling granulation + limb darkening (HDR, the tone mapper makes it glow)
const STAR_VS = 'varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }';
const STAR_FS = NOISE + `uniform vec3 uCol; uniform float uT, uI, uBoil; varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){ vec3 p=normalize(vP); float n=fbm6(p*6.0+vec3(0.0,uT*0.08,uT*0.05))*0.6+0.4*snoise(p*22.0+uT*0.3);
  float mu=max(dot(normalize(vN),vV),0.0); float limb=0.35+0.65*pow(mu,0.5);
  vec3 c=uCol*(1.0+uBoil*n)*limb*uI; c+=uCol*pow(1.0-mu,3.0)*0.6*uI;
  gl_FragColor=vec4(c,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function makeStar(r, col, glowCol, glowS = 3.2) {
  const g = new THREE.Group();
  const m = new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, uniforms: { uCol: { value: new THREE.Color(col) }, uT: { value: 0 }, uI: { value: 2.2 }, uBoil: { value: 0.35 }, uOct: { value: 6 } } });
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), m); g.add(s);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(glowCol), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 }));
  gl.scale.setScalar(glowS * 2); g.add(gl);
  g.scale.setScalar(r); g.userData = { mat: m, glow: gl, sphere: s }; return g;
}

// ---- 1) size line-up: the Sun next to Spica (R_sun = 1 unit)
const lineup = new THREE.Scene(); lineup.background = new THREE.Color('#010207'); addStars(lineup);
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 20000);
const SPICA_R = 7.47;
const sunStar = makeStar(1, '#ffa424', '#ff8a1e', 3.0); sunStar.userData.mat.uniforms.uI.value = 1.15; sunStar.position.set(-11.5, 0, 0); lineup.add(sunStar);
const spica = makeStar(SPICA_R, '#6f9cff', '#4f7dff', 2.6); spica.userData.mat.uniforms.uI.value = 1.1; spica.position.set(3.0, 0, 0); lineup.add(spica);
// supernova pieces (same scene, around Spica)
const SN_FS = NOISE + `uniform float uT, uA; uniform vec3 uC1, uC2, uC3; varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){ vec3 p=normalize(vP); float n=fbm6(p*3.2+vec3(uT*0.05)); float f=abs(snoise(p*7.0+n*2.0)); float fil=pow(1.0-f,6.0);
  float rim=pow(1.0-abs(dot(normalize(vN),vV)),1.6);
  vec3 c=mix(uC1,uC2,smoothstep(-0.2,0.5,n)); c=mix(c,uC3,smoothstep(0.35,0.8,fil*rim+0.2*n));
  float a=(0.25*rim+fil*(0.4+rim))*uA; gl_FragColor=vec4(c*a,a); }`;
const snMat = new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: SN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC1: { value: new THREE.Color('#3f7dff') }, uC2: { value: new THREE.Color('#ff4fa8') }, uC3: { value: new THREE.Color('#ffb060') }, uOct: { value: 6 } } });
const snShell = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), snMat); lineup.add(snShell); snShell.visible = false;
const snShell2 = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), snMat.clone()); snShell2.material.uniforms.uC1.value = new THREE.Color('#40e0ff'); snShell2.material.uniforms.uC2.value = new THREE.Color('#7f5bff'); snShell2.material.uniforms.uC3.value = new THREE.Color('#ffffff'); lineup.add(snShell2); snShell2.visible = false;
const snCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#cfe4ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); lineup.add(snCore); snCore.visible = false;
const sparks = (() => { const n = 2600, dir = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(0.55, 1.05)); dir.set([v.x, v.y, v.z], i * 3); c.set(pick(['#9fd0ff', '#ff8fd0', '#ffd08a', '#ffffff'])); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dir.slice(), 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.userData.dir = dir;
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; lineup.add(p); p.visible = false; return p; })();
function updateSN(t) {
  const on = t >= SN; snShell.visible = snShell2.visible = snCore.visible = sparks.visible = on; spica.visible = !on || t < SN + 0.25;
  if (!on) return;
  const u = t - SN; const r = SPICA_R * 1.3 + 17 * (1 - Math.exp(-u * 0.6)) + u * 1.0;
  snShell.position.copy(spica.position); snShell.scale.setScalar(r); snShell.rotation.set(u * 0.03, u * 0.05, 0);
  snShell2.position.copy(spica.position); snShell2.scale.setScalar(r * 0.72); snShell2.rotation.set(-u * 0.04, u * 0.02, 0.5);
  snMat.uniforms.uT.value = t; snMat.uniforms.uA.value = 1.1 * smooth(0, 0.6, u); snShell2.material.uniforms.uT.value = t + 40; snShell2.material.uniforms.uA.value = 0.9 * smooth(0.1, 0.9, u);
  snCore.position.copy(spica.position); snCore.scale.setScalar(SPICA_R * (10 * Math.exp(-u * 1.6) + 2.2)); snCore.material.opacity = 0.35 + 0.65 * Math.exp(-u * 0.9);
  const pa = sparks.geometry.attributes.position, d = sparks.geometry.userData.dir; for (let i = 0; i < pa.count; i++) pa.setXYZ(i, spica.position.x + d[i * 3] * r * 1.08, d[i * 3 + 1] * r * 1.08, d[i * 3 + 2] * r * 1.08); pa.needsUpdate = true;
  sparks.material.opacity = smooth(0.2, 1.0, u);
}

// ---- 2) Earth at 1 AU next to Spica: it heats until the rocks glow
const hotS = new THREE.Scene(); hotS.background = new THREE.Color('#010207'); addStars(hotS);
const earthGeo = withBase(new THREE.SphereGeometry(1, 128, 96));
const earthMat = planetMat({ ns: 1.25, ice: 1, land: 0, lights: 0, clouds: 1, amb: 0.03 });
const earth = new THREE.Mesh(earthGeo, earthMat); hotS.add(earth);
const earthAir = atmoShell(new THREE.SphereGeometry(1, 64, 48), 1.035); hotS.add(earthAir);
const HOT_DIR = new THREE.Vector3(-0.75, 0.35, 0.55).normalize();                    // toward Spica
const hotStar = makeStar(1, '#a9c6ff', '#6f9bff', 3.4); hotStar.position.copy(HOT_DIR).multiplyScalar(260); hotStar.scale.setScalar(260 * Math.tan(2.0 * Math.PI / 180)); hotS.add(hotStar);
const hotGlow = atmoShell(new THREE.SphereGeometry(1, 64, 48), 1.06, [1.0, 0.45, 0.12], 2.2); hotS.add(hotGlow);

// ---- 3) orbit map, true scale (1 unit = 1 AU), rings drawn by a pixel-width shader
const mapS = new THREE.Scene(); mapS.background = new THREE.Color('#010207'); addStars(mapS);
const RINGS = [1, 1.52, 5.2, 9.58, 19.2, 30.07, 143];
const mapMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { uR: { value: RINGS }, uNew: { value: 0 } },
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uR[7]; uniform float uNew; varying vec2 vP;
  void main(){ float r=length(vP); float fw=fwidth(r); vec3 c=vec3(0.0); float a=0.0;
    for(int i=0;i<6;i++){ float l=1.0-smoothstep(0.6*fw,2.0*fw,abs(r-uR[i])); vec3 rc=i==0?vec3(0.45,0.75,1.0):(i==5?vec3(0.55,0.75,1.0):vec3(0.75)); float ra=i==0?0.85:(i==5?0.8:0.4); c+=rc*l*ra; a=max(a,l*ra); }
    float ln=1.0-smoothstep(1.2*fw,3.6*fw,abs(r-uR[6])); c+=vec3(0.96,0.70,0.24)*ln*uNew; a=max(a,ln*uNew);
    gl_FragColor=vec4(c,a); }` });
const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mapMat); mapPlane.rotation.x = -Math.PI / 2; mapS.add(mapPlane);
const mapStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#9cc0ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); mapS.add(mapStar);
const mapEarth = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#6fd0ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); mapS.add(mapEarth);
const mapPlanets = [[5.2, 2.2, '#e8c89a'], [9.58, 4.1, '#f0dca0'], [19.2, 0.9, '#a8e0e8'], [30.07, 5.3, '#7fa6ff']].map(([a, ph, c]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.position.set(Math.cos(ph) * a, 0, Math.sin(ph) * a); mapS.add(s); return { s, a }; });
const mapCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 20000);

// =================== light states for the meadow ===================
const sunDirEA = (el, az) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
const D2R = Math.PI / 180;
const ST = {
  dawn: { el: 4.5, az: 0.16, zen: '#2a58b0', hor: '#ffc396', glow: '#ffb070', glowK: 8, glowI: 0.55, horGlow: 0.9, disc: '#fff0d0', discR: 0.0085, discI: 30, glare: 0.25,
    light: '#ffc890', sunI: 2.4, hemiSky: '#a8c4e8', hemiGnd: '#5a6a35', hemiI: 0.9, fog: '#f0d2b8', cloud: '#ffe4cf', exp: 1.0, shadowR: 3 },
  swap: { el: 6.5, az: 0.16, zen: '#2f5fe0', hor: '#8fb0ff', glow: '#6f9cff', glowK: 4, glowI: 1.0, horGlow: 0.8, disc: '#8fb2ff', discR: 0.0085 * 7.5, discI: 6, glare: 0.5,
    light: '#b0c8ff', sunI: 5.0, hemiSky: '#9fb8ff', hemiGnd: '#506070', hemiI: 1.6, fog: '#a8c0f0', cloud: '#e8f0ff', exp: 1.1, shadowR: 3 },
  far: { el: 22, az: -0.34, zen: '#2140c4', hor: '#8ea6ee', glow: '#9ab8ff', glowK: 60, glowI: 0.45, horGlow: 0.25, disc: '#dfe9ff', discR: 0.0026, discI: 260, glare: 1.6,
    light: '#c8d8ff', sunI: 2.0, hemiSky: '#7d98ee', hemiGnd: '#4a5a48', hemiI: 1.25, fog: '#9fb2ea', cloud: '#e6ecff', exp: 0.95, shadowR: 0.6 },
  low: { el: 10, az: -0.29, zen: '#2a3aa8', hor: '#f3b08a', glow: '#ffb070', glowK: 7, glowI: 0.7, horGlow: 1.1, disc: '#ffd0a0', discR: 0.0024, discI: 40, glare: 1.0,
    light: '#ffb070', sunI: 1.3, hemiSky: '#5466c0', hemiGnd: '#3a3a40', hemiI: 0.6, fog: '#c09090', cloud: '#ffc8b0', exp: 1.0, shadowR: 0.8 },
  set: { el: 6.8, az: -0.29, zen: '#121c66', hor: '#ff8f50', glow: '#ff7a28', glowK: 90, glowI: 2.6, horGlow: 1.4, disc: '#ff7a18', discR: 0.0065, discI: 3.5, glare: 1.2,
    light: '#ff8040', sunI: 0.35, hemiSky: '#34449a', hemiGnd: '#2a2a35', hemiI: 0.42, fog: '#a86a62', cloud: '#ff9a78', exp: 1.05, shadowR: 1 },
};
function mixState(a, b, k) {
  k = clamp(k, 0, 1); const o = {};
  for (const key in a) o[key] = typeof a[key] === 'number' ? lerp(a[key], b[key], k) : col3(a[key], b[key], k);
  // the disc radius and brightness blend in log space so the shrink/grow looks even
  o.discR = Math.exp(lerp(Math.log(a.discR), Math.log(b.discR), k)); o.discI = Math.exp(lerp(Math.log(a.discI), Math.log(b.discI), k));
  return o;
}
function lightAt(t) {
  let L;
  if (t < SPACE1) { L = mixState(ST.dawn, ST.swap, smooth(SWAP, SWAP + 3.3, t)); const fl = smooth(SWAP, SWAP + 0.8, t) * (1 - smooth(SWAP + 0.8, SWAP + 1.6, t)); L.discI *= 1 + 0.6 * fl * Math.sin(t * 40); L.el = lerp(4.5, 6.5, smooth(0, SPACE1, t)); }
  else if (t < DUSK) L = mixState(ST.far, ST.far, 0);
  else { const u = t - DUSK; L = u < 3 ? mixState(ST.far, ST.low, smooth(0, 3, u)) : mixState(ST.low, ST.set, smooth(3, 5.6, u)); }
  L.sun = sunDirEA(L.el * D2R, L.az);
  return L;
}

// =================== cameras ===================
function meadowCamera(t) {
  let pos, look, fov = 50;
  if (t < SPACE1) { const u = t / SPACE1; pos = new THREE.Vector3(lerp(1.0, 1.9, u), lerp(1.15, 1.45, ease(u)), lerp(15, 5.5, 0.6 * u + 0.4 * ease(u)));
    pos.y += th(pos.x, pos.z); look = pos.clone().add(new THREE.Vector3(0.06, lerp(0.05, 0.085, smooth(SWAP, SWAP + 3, t)), -1).multiplyScalar(100)); }
  else if (t < DUSK) { const u = (t - MEADOW2) / (DUSK - MEADOW2); pos = new THREE.Vector3(lerp(-2.5, -1.0, u), 1.25, lerp(-2, -7, u)); pos.y += th(pos.x, pos.z);
    const d = sunDirEA(ST.far.el * D2R * 0.62, -0.30 + 0.05 * u); look = pos.clone().addScaledVector(d, 100); }
  else { const u = (t - DUSK) / (AGE - DUSK); pos = new THREE.Vector3(-1.0 - u * 0.6, lerp(1.25, 1.6, u), lerp(-7, -8.5, u)); pos.y += th(pos.x, pos.z);
    look = pos.clone().add(sunDirEA(lerp(13, 3.2, ease(u)) * D2R, -0.33).multiplyScalar(100)); fov = lerp(50, 54, u); }
  mCam.fov = fov; mCam.updateProjectionMatrix(); mCam.position.copy(pos); mCam.up.set(0, 1, 0); mCam.lookAt(look);
}
function lineupCamera(t) {
  let pos, look, fov = 40;
  if (t < HOT) {
    const u = smooth(SPACE1 + 1.6, HOT - 1.2, t);
    const close = new THREE.Vector3(-11.5, -1.6, 7.5), far = new THREE.Vector3(-3.0, -9.0, 74);
    pos = close.clone().lerp(far, u); pos.x += (t - SPACE1) * 0.15;
    look = new THREE.Vector3(-11.5, -0.9, 0).lerp(new THREE.Vector3(-3.0, -8.6, 0), u);
  } else {   // aging + supernova: Spica in the upper half, slow push, then pull back for the blast
    const u = (t - AGE) / (T_END - AGE); const back = smooth(SN, SN + 4.5, t);
    pos = new THREE.Vector3(3.0 + 6 * u, lerp(-14, -7, back), lerp(64, 190, back) - 4 * u); look = new THREE.Vector3(3.0, lerp(-10, -7, back), 0);
  }
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos); spaceCam.lookAt(look);
}
const hotCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 5000);
function hotCamera(t) { const u = (t - HOT) / (MAP - HOT); const a = 0.9 + u * 0.35; const d = lerp(8.4, 7.6, ease(u));
  hotCam.position.set(Math.sin(a) * d, -0.3, Math.cos(a) * d); hotCam.lookAt(0, -0.95, 0); }
function mapCamera(t) { const u = (t - MAP) / (MEADOW2 - MAP); const H = Math.exp(lerp(Math.log(4.2), Math.log(820), smooth(0.12, 0.92, u)));
  mapCam.position.set(0, H, H * 0.42); mapCam.lookAt(0, 0, H * 0.06); return H; }

// =================== per-scene updates ===================
const STAR_T = t => t;
function updateLineup(t) {
  for (const s of [sunStar, spica]) s.userData.mat.uniforms.uT.value = t;
  sunStar.visible = t < HOT;
  if (t >= AGE) {    // ageing time-lapse: swells and cools before the end
    const a = smooth(AGE + 2.0, SN - 0.3, t);
    spica.scale.setScalar(SPICA_R * (1 + 0.55 * a));
    spica.userData.mat.uniforms.uCol.value.copy(col3('#6f9cff', '#ff8a4a', a)); spica.userData.glow.material.color.copy(col3('#4f7dff', '#ff6a30', a));
    spica.userData.mat.uniforms.uBoil.value = 0.35 + 0.5 * a; spica.userData.mat.uniforms.uT.value = t * (1 + 3 * a);
    const pre = smooth(SN - 0.6, SN, t); spica.userData.mat.uniforms.uI.value = 1.1 + 30 * pre;
  } else { spica.scale.setScalar(SPICA_R); spica.userData.mat.uniforms.uCol.value.set('#6f9cff'); spica.userData.glow.material.color.set('#4f7dff'); spica.userData.mat.uniforms.uBoil.value = 0.35; spica.userData.mat.uniforms.uI.value = 1.1; }
  updateSN(t);
}
function updateHot(t) {
  const u = t - HOT;
  earthMat.uniforms.uSun.value.copy(HOT_DIR); earthMat.uniforms.uCam.value.copy(hotCam.position); earthMat.uniforms.uSunCol.value.setRGB(0.85, 0.95, 1.3).multiplyScalar(1.5);
  const steam = smooth(0.5, 3.0, u) * (1 - smooth(4.2, 6.2, u)), heat = smooth(3.3, 6.6, u);
  earthMat.uniforms.uClouds.value = 1 + 0.9 * steam - 1.0 * smooth(4.4, 6.4, u); earthMat.uniforms.uCloudT.value = t * 0.05;
  earthMat.uniforms.uLand.value = 0.55 * smooth(2.5, 5.5, u); earthMat.uniforms.uHeat.value = 1.15 * heat; earthMat.uniforms.uAmb.value = 0.03 + 0.12 * heat;
  earth.rotation.y = t * 0.08; earthAir.material.uniforms.uS.value.copy(HOT_DIR); earthAir.material.uniforms.uA.value = 1 - 0.8 * heat;
  hotGlow.material.uniforms.uS.value.copy(HOT_DIR.clone().negate()); hotGlow.material.uniforms.uA.value = heat;
  hotStar.userData.mat.uniforms.uT.value = t;
}
function updateMap(t, H) {
  const u = t - MAP;
  const r = u < 1.6 ? 1 : Math.max(1, 0.185 * H);                       // Earth glides out at a steady place on screen
  const k = Math.min(r, 143); const a = 0.6 + 0.4 / Math.sqrt(k);
  mapEarth.position.set(Math.cos(a) * k, 0, -Math.sin(a) * k); mapEarth.scale.setScalar(H * 0.045);
  mapStar.scale.setScalar(Math.max(0.6, H * 0.06)); for (const p of mapPlanets) p.s.scale.setScalar(H * 0.022);
  mapMat.uniforms.uNew.value = smooth(MAP + 4.0, MAP + 5.2, t);
  return k;
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels'].map(k => [k, $(k)]));
const labelEls = {};
function label(key, text, p3, cam, a, dy = -40) {
  let e = labelEls[key]; if (!e) { e = document.createElement('div'); e.className = 'lb'; e.textContent = text; el.labels.appendChild(e); labelEls[key] = e; }
  if (a <= 0.001) { e.style.opacity = 0; return; }
  cam.updateMatrixWorld(); const p = p3.clone().project(cam); const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H + dy;
  e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.opacity = (p.z < 1 && x > 60 && x < W - 60 && y > 330 && y < 1600) ? a : 0;
}
const captions = [
  [6.3, 9.6, 'Swap our Sun for Spica,<br>a real blue star.'],
  [10.3, 13.3, "It's 7.5 times wider<br>and 10 times heavier…"],
  [13.5, 16.8, '…and 20,500 times brighter.'],
  [17.3, 20.6, 'At our distance, Earth would<br>get 20,500× the sunlight.'],
  [20.8, 23.8, 'Its rocks would melt.'],
  [24.3, 27.4, 'To feel like home, Earth<br>would have to move away…'],
  [27.6, 30.8, '…143 times farther.<br>Almost 5× past Neptune.'],
  [31.3, 35.3, 'Our sun would shrink<br>to a blinding blue dot…'],
  [35.5, 39.8, '…and one year would last<br>535 years.'],
  [40.3, 42.9, 'Daylight as dim as shade,<br>with 8× the UV.'],
  [43.1, 45.8, 'And sunsets?<br>Still orange.'],
  [46.3, 49.6, 'But blue stars burn out<br>300 times faster.'],
  [49.8, 52.8, 'Life on Earth needed<br>800 million years just to start.'],
  [53.3, 56.2, 'Then it explodes.'],
  [56.4, 59.8, 'Long before anyone could<br>see a blue sunrise.'],
];
const fmt = n => Math.round(n).toLocaleString('en-US');
function hudAt(t, extra) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < SWAP + 0.3) show = 0;
  else if (t < SPACE1) { lab = 'YOUR NEW STAR'; val = 'Spica'; sub = 'A REAL BLUE STAR · 250 LIGHT-YEARS AWAY'; }
  else if (t < SPACE1 + 3.4) { lab = 'SURFACE'; val = '45,000°F'; sub = 'OUR SUN: 9,900°F'; }
  else if (t < HOT) { lab = 'BRIGHTNESS'; val = '20,500×'; sub = 'OUR SUN'; }
  else if (t < MAP) { stat = '<b></b>MODEL'; lab = 'EARTH AT 1 AU'; const k = smooth(HOT + 1.0, MAP - 1.2, t); val = fmt(lerp(59, 5000, k * k)) + '°F'; sub = 'ROCK MELTS ABOVE ~2,000°F'; }
  else if (t < MEADOW2) { lab = 'DISTANCE'; val = (extra.au < 9.95 ? extra.au.toFixed(1) : fmt(extra.au)) + ' AU'; sub = 'NEPTUNE: 30 AU · EARTH TODAY: 1 AU'; }
  else if (t < MEADOW2 + 4.3) { stat = '<b></b>MODEL'; lab = 'SUN IN THE SKY'; val = '19× smaller'; sub = '…BUT 370× BRIGHTER PER INCH'; }
  else if (t < DUSK) { stat = '<b></b>MODEL'; lab = 'ONE YEAR'; val = '535 years'; sub = 'ONE ORBIT AT 143 AU'; }
  else if (t < AGE) { stat = '<b></b>MODEL'; lab = 'DAYLIGHT'; val = '14%'; sub = '92% OF ITS LIGHT IS ULTRAVIOLET'; }
  else if (t < SN) { stat = '<b></b>TIME-LAPSE'; lab = 'STAR AGE'; val = fmt(lerp(0, 25, smooth(AGE + 0.3, SN - 0.3, t))) + ' million yr'; sub = 'OUR SUN: ~10 BILLION YEARS'; }
  else show = 0;
  return { stat, lab, val, sub, show };
}
function updateDOM(t, extra) {
  el.title.style.opacity = fadeWin(t, -1, SWAP + 0.2, 0.5);
  const h = hudAt(t, extra); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  // veils: white at the blue swap, dark between the other shots
  const white = smooth(SPACE1 - 0.9, SPACE1 - 0.05, t) * (1 - smooth(SPACE1, SPACE1 + 0.6, t));
  const dark = Math.max(fadeWin(t, HOT - 0.3, HOT + 0.3, 0.3), fadeWin(t, MAP - 0.3, MAP + 0.3, 0.3), fadeWin(t, MEADOW2 - 0.3, MEADOW2 + 0.3, 0.3), fadeWin(t, AGE - 0.35, AGE + 0.35, 0.35));
  el.veil.style.background = white > 0.001 ? '#eef4ff' : '#03050a'; el.veil.style.opacity = Math.max(white, dark);
  el.flash.style.opacity = smooth(SN - 0.25, SN, t) * (1 - smooth(SN + 0.05, SN + 0.9, t));
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
window.renderAt = (t) => {
  renderer.clear();
  let extra = { au: 1 };
  for (const k in labelEls) labelEls[k].style.opacity = 0;
  if (t < SPACE1 || (t >= MEADOW2 && t < AGE)) {
    meadowCamera(t); const L = lightAt(t); updateMeadow(t, L); renderer.toneMappingExposure = L.exp;
    renderer.render(meadow, mCam);
  } else if (t < HOT || t >= AGE) {
    renderer.toneMappingExposure = 1.0; lineupCamera(t); updateLineup(t); renderer.render(lineup, spaceCam);
    if (t < HOT) { const a = smooth(SPACE1 + 0.4, SPACE1 + 1.0, t) * (1 - smooth(HOT - 0.5, HOT - 0.2, t)); label('sun', 'SUN', sunStar.position.clone().add(new THREE.Vector3(0, 1.5, 0)), spaceCam, a);
      label('spica', 'SPICA', spica.position.clone().add(new THREE.Vector3(0, SPICA_R + 0.8, 0)), spaceCam, a * smooth(SPACE1 + 3.2, SPACE1 + 4.0, t)); }
  } else if (t < MAP) {
    renderer.toneMappingExposure = 1.0; hotCamera(t); updateHot(t); renderer.render(hotS, hotCam);
  } else {
    renderer.toneMappingExposure = 1.0; const Hc = mapCamera(t); extra.au = updateMap(t, Hc); renderer.render(mapS, mapCam);
    const la = smooth(MAP + 0.4, MAP + 1.0, t) * (1 - smooth(MEADOW2 - 0.5, MEADOW2 - 0.2, t));
    const ringLab = (key, txt, r, ang) => { const px = r / (Hc * 0.42) * W; label(key, txt, new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r), mapCam, la * smooth(70, 140, px) * (1 - smooth(1400, 2600, px)), -18); };
    ringLab('earth0', 'EARTH TODAY', 1, -1.9); ringLab('jup', 'JUPITER', 5.2, -2.0); ringLab('sat', 'SATURN', 9.58, -1.7); ringLab('ura', 'URANUS', 19.2, -2.1); ringLab('nep', 'NEPTUNE', 30.07, -1.8);
    label('newe', 'EARTH', mapEarth.position, mapCam, la * smooth(MAP + 1.6, MAP + 2.2, t), -30);
  }
  updateDOM(t, extra);
  return true;
};
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
