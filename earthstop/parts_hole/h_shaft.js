
// =================== SHAFT (meters): the camera rides down the hole; walls are textured by their true depth ===================
// Local frame: camera at y=0 looking down -Y; a wall point at local y has depth D(t) - y.  uMode 0 = digging (photoscanned rock),
// uMode 1 = the magic tube through the mantle / core (glowing, from the PREM fall table).
const shaft = new THREE.Scene(); shaft.background = new THREE.Color('#000000');
const sCam = new THREE.PerspectiveCamera(72, W / H, 0.02, 400);
const RS = 0.45;                                                       // hole radius (a 3 ft hole)
const shaftU = {
  uD: { value: 0 }, uDv: { value: 0 }, uMode: { value: 0 }, uR: { value: RS }, uT: { value: 0 }, uSky: { value: 1 }, uWet: { value: 0 }, uHeat: { value: 0 }, uSqueeze: { value: 0 },
  tSoil: { value: null }, tClay: { value: null }, tLime: { value: null }, tGran: { value: null }, tGran2: { value: null },
  nSoil: { value: null }, nClay: { value: null }, nLime: { value: null }, nGran: { value: null }, uLamp: { value: 1 },
};
const SHAFT_VS = `uniform float uR, uSqueeze, uT, uD; varying vec3 vP; varying float vAng;
  void main(){ vec3 p=position; float a=atan(p.z,p.x); vAng=a;
    float bulge=uSqueeze*(0.10*sin(a*3.0+1.3)+0.07*sin(a*5.0-(uD-p.y)*0.9)+0.06)*smoothstep(-0.5,-6.0,p.y);   // rock creeping in
    p.xz*= (1.0-bulge);
    vP=p; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
const SHAFT_FS = `uniform float uD, uDv, uMode, uR, uT, uSky, uWet, uHeat, uLamp; uniform sampler2D tSoil, tClay, tLime, tGran, tGran2, nSoil, nClay, nLime, nGran;
  varying vec3 vP; varying float vAng;
  float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
  float fb(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
  vec3 layerCol(vec2 uv, float d){
    vec3 c=texture2D(tSoil,uv).rgb;
    c=mix(c, texture2D(tClay,uv*1.2).rgb*vec3(1.7,1.55,1.4), smoothstep(2.0,3.2,d));
    c=mix(c, texture2D(tLime,uv*0.7).rgb*vec3(1.25,1.2,1.08)+0.05, smoothstep(16.0,20.0,d));
    vec3 gr=mix(texture2D(tGran,uv).rgb*1.9, texture2D(tGran2,uv*1.3).rgb, 0.4); c=mix(c, gr*vec3(0.88,0.9,0.98), smoothstep(450.0,700.0,d));
    return c;
  }
  void main(){
    float d=uD-vP.y;                                                   // true depth of this wall point (m)
    float circ=6.2831853*uR; vec2 uv=vec2((vAng/6.2831853)*circ/1.6, d/1.6);
    vec3 N=normalize(vec3(-vP.x,0.0,-vP.z)); vec3 Tn=normalize(vec3(-vP.z,0.0,vP.x)); vec3 Bn=vec3(0.0,1.0,0.0);
    vec3 col; vec3 V=normalize(cameraPosition-vP);
    if(uMode<0.5){
      // motion blur along the shaft: average the wall over the distance travelled this frame
      float blurV=min(uDv/1.6,3.0); vec3 alb=vec3(0.0); for(int k=0;k<10;k++){ float o=(float(k)/9.0-0.5)*blurV; alb+=layerCol(uv+vec2(0.0,o), d+o*1.6); } alb/=10.0;
      alb=pow(alb,vec3(2.2));
      vec2 nuv=uv; vec3 nm; if(d<2.5) nm=texture2D(nSoil,nuv).xyz; else if(d<17.0) nm=texture2D(nClay,nuv).xyz; else if(d<600.0) nm=texture2D(nLime,nuv*0.8).xyz; else nm=texture2D(nGran,nuv).xyz; nm=nm*2.0-1.0; nm.xy*=1.0-smoothstep(0.3,1.5,blurV);
      vec3 Np=normalize(N+(Tn*nm.x+Bn*nm.y)*0.9);
      // wet clay band: darker, glossy, with running streaks
      float wet=uWet*smoothstep(5.0,7.0,d)*(1.0-smoothstep(16.0,19.0,d)); float run=smoothstep(0.55,0.8,fb(vec2(vAng*7.0,d*0.6+uT*1.5)));
      alb*=1.0-0.45*wet; float rough=mix(0.9,0.25,wet*(0.4+0.6*run));
      vec3 L=normalize(-vP); float dist=length(vP); float fall=uLamp*7.0/(1.0+dist*dist*0.22);
      float dif=max(dot(Np,L),0.0); vec3 Hh=normalize(L+V); float sp=pow(max(dot(Np,Hh),0.0),mix(8.0,90.0,1.0-rough))*(1.0-rough)*2.5;
      vec3 lamp=vec3(1.0,0.93,0.82);
      col=alb*(dif*fall*lamp+0.035) + sp*fall*lamp*0.6;
      // daylight from the opening (only near the surface)
      float sky=uSky*exp(-max(d,0.0)/1.4)*(0.5+0.5*max(dot(Np,vec3(0.0,1.0,0.0)),0.0)+0.4); col+=alb*vec3(1.0,0.82,0.62)*sky*1.2;
      // heat: deep granite starts to look hot and hazy (no glow below ~900 F)
      col=mix(col, col*vec3(1.25,0.95,0.75)+vec3(0.06,0.015,0.0)*uHeat, uHeat*smoothstep(5000.0,12000.0,d));
    } else {
      // the tube through the planet: glowing walls by layer (depth in km = d/1000)
      float km=d/1000.0; float blurV=min(uDv/40.0,6.0);
      vec2 q=vec2(vAng*3.0, d/40.0);
      float n=0.0; for(int k=0;k<8;k++){ float o=(float(k)/7.0-0.5)*blurV; n+=fb(q+vec2(0.0,o)+vec2(0.0,uT*0.05)); } n/=8.0;
      vec3 c;
      float mant=1.0-smoothstep(2850.0,2930.0,km); float outer=smoothstep(2850.0,2930.0,km)*(1.0-smoothstep(5110.0,5190.0,km)); float inner=smoothstep(5110.0,5190.0,km);
      float tmp=smoothstep(30.0,2890.0,km);
      vec3 mc=mix(vec3(0.55,0.10,0.02),vec3(1.6,0.45,0.08),tmp)*(0.35+1.1*smoothstep(0.35,0.75,n));
      vec3 oc=vec3(1.7,0.72,0.14)*(0.7+0.6*sin(n*12.0+uT*2.0)*0.5+0.4*n);
      vec3 ic=vec3(1.35,1.1,0.72)*(0.85+0.3*n);
      c=mc*mant+oc*outer+ic*inner;
      c=mix(vec3(0.12,0.08,0.06)*0.3, c, smoothstep(10.0,45.0,km));    // the crust at both ends is dark
      float far=smoothstep(8.0,60.0,length(vP)); vec3 fogc=mix(vec3(0.5,0.12,0.03),vec3(1.4,0.6,0.15),outer+inner*1.2)*(0.6+0.4*tmp); col=mix(c,fogc,far);
    }
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const shaftMat = new THREE.ShaderMaterial({ uniforms: shaftU, vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, side: THREE.BackSide });
const shaftGeo = new THREE.CylinderGeometry(RS, RS, 90, 96, 360, true); shaftGeo.translate(0, -41, 0);
const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat); shaftMesh.frustumCulled = false; shaft.add(shaftMesh);
// the dig face below + flood water
const faceMat = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 });
const digFace = new THREE.Mesh(new THREE.CircleGeometry(RS, 64), faceMat); digFace.rotation.x = -Math.PI / 2; shaft.add(digFace);
const floodMat = new THREE.MeshStandardMaterial({ color: '#2b2116', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.92 });
const flood = new THREE.Mesh(new THREE.CircleGeometry(RS * 0.999, 64), floodMat); flood.rotation.x = -Math.PI / 2; shaft.add(flood);
const lamp = new THREE.PointLight(0xffeedd, 14, 30, 1.6); shaft.add(lamp);
shaft.add(new THREE.AmbientLight(0x403028, 0.15));
// utilities in the wall (problem #1): a yellow gas line and a black power cable, crossing just behind the wall
const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.4, 24), new THREE.MeshStandardMaterial({ color: '#f2c200', roughness: 0.45 })); pipe.rotation.z = Math.PI / 2; shaft.add(pipe);
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.4, 16), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5 })); cable.rotation.x = Math.PI / 2; shaft.add(cable);
const cableTape = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.08, 16), new THREE.MeshStandardMaterial({ color: '#e64a19', roughness: 0.5 })); cableTape.rotation.x = Math.PI / 2; shaft.add(cableTape);
const PIPE_D = 1.7, CABLE_D = 1.2;
// fossils in the limestone: brachiopod / crinoid decals
const fossilMats = (() => { const out = [];
  for (let k = 0; k < 3; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256); g.translate(128, 150);
    if (k < 2) { const ribs = 14 + k * 6; for (let i = 0; i <= ribs; i++) { const a = -2.4 + i * (1.68 * 2 / ribs) * 1.43; const r = 95; g.strokeStyle = `rgba(${235 - i % 2 * 25},${222 - i % 2 * 22},${196 - i % 2 * 20},0.95)`; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 20); g.quadraticCurveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 + 10, Math.cos(a) * r, Math.sin(a) * r * 0.9); g.stroke(); }
      g.fillStyle = 'rgba(210,195,165,0.95)'; g.beginPath(); g.ellipse(0, 18, 16, 10, 0, 0, 7); g.fill(); }
    else { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? 'rgba(215,200,170,0.95)' : 'rgba(185,170,140,0.95)'; g.fillRect(-26, -110 + i * 36, 52, 32); g.fillStyle = 'rgba(120,105,85,0.9)'; g.beginPath(); g.arc(0, -94 + i * 36, 6, 0, 7); g.fill(); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    out.push(new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); }
  return out; })();
const fossils = [];
for (let i = 0; i < 70; i++) { const a = R(0, 6.28), dpt = R(18.5, 34), s = R(0.05, 0.12); const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), pick(fossilMats));
  fossils.push({ m, a, d: dpt, rot: R(0, 6.28) }); shaft.add(m); }
// rock burst (problem #3): fragments + dust blown out of the wall
const burstRock = new THREE.MeshStandardMaterial({ color: '#2e2a27', roughness: 0.95, flatShading: true });
const frags = []; for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.006, 0.03), 0), burstRock); shaft.add(m); frags.push({ m, v: new THREE.Vector3(R(-0.4, 0.4), R(-0.6, 0.9), R(0.3, 1.0)).normalize().multiplyScalar(R(2, 6)), sp: new THREE.Vector3(R(-9, 9), R(-9, 9), R(-9, 9)) }); }
const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(90,82,74,0.3)'); gr.addColorStop(1, 'rgba(120,108,96,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const dust = []; for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 })); shaft.add(s); dust.push({ s, v: new THREE.Vector3(R(-0.3, 0.3), R(-0.3, 0.5), R(0.2, 0.8)), ph: R(0, 1) }); }
// drips (problem #2)
const dripMat = new THREE.MeshBasicMaterial({ color: '#9fb0bc', transparent: true, opacity: 0.35 });
const drips = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05, 6), dripMat); shaft.add(m); drips.push({ m, a: R(0, 6.28), ph: R(0, 1), sp: R(1.2, 2.2) }); }
async function buildShaft() {
  const L = async (n, rep) => { const p = await pbrSet(n, rep); for (const t of [p.map, p.nor]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return p; };
  const [soil, clay, lime, gran, gran2] = await Promise.all([L('excavated_soil_wall'), L('brown_mud_02'), L('granite_wall'), L('dark_rock_02'), L('rock_06')]);
  Object.assign(shaftU, {}); shaftU.tSoil.value = soil.map; shaftU.tClay.value = clay.map; shaftU.tLime.value = lime.map; shaftU.tGran.value = gran.map; shaftU.tGran2.value = gran2.map;
  shaftU.nSoil.value = soil.nor; shaftU.nClay.value = clay.nor; shaftU.nLime.value = lime.nor; shaftU.nGran.value = gran.nor;
  faceMat.map = soil.map; faceMat.normalMap = soil.nor; faceMat.needsUpdate = true;
}
// depth keyframes for the dig ride (t s, depth m), interpolated in log-depth with a monotone cubic
const DKEY = [[4.0, 0.6], [8.0, 3.0], [12.0, 18.0], [14.6, 26.0], [17.2, 600], [18.3, 3800], [20.6, 3835], [22.0, 4150], [25.0, 11700], [27.0, 12262]];
function digDepth(t) {
  const X = DKEY.map(k => k[0]), Y = DKEY.map(k => Math.log(k[1])); const n = X.length;
  if (t <= X[0]) return Math.exp(Y[0]); if (t >= X[n - 1]) return Math.exp(Y[n - 1]);
  const dl = []; for (let i = 0; i < n - 1; i++) dl.push((Y[i + 1] - Y[i]) / (X[i + 1] - X[i]));
  const m = [dl[0]]; for (let i = 1; i < n - 1; i++) m.push(dl[i - 1] * dl[i] <= 0 ? 0 : 3 * (X[i + 1] - X[i - 1]) / ((2 * X[i + 1] - X[i] - X[i - 1]) / dl[i - 1] + (X[i + 1] + X[i] - 2 * X[i - 1]) / dl[i])); m.push(dl[n - 2]);
  let i = 0; while (t > X[i + 1]) i++; const h = X[i + 1] - X[i], s = (t - X[i]) / h;
  const h00 = 2 * s ** 3 - 3 * s * s + 1, h10 = s ** 3 - 2 * s * s + s, h01 = -2 * s ** 3 + 3 * s * s, h11 = s ** 3 - s * s;
  return Math.exp(h00 * Y[i] + h10 * h * m[i] + h01 * Y[i + 1] + h11 * h * m[i + 1]);
}
let FALLT = null;                                                       // PREM fall table (data/hole_fall.json)
const FALL_MIN = 38.1, FALL_LEN = 20.0;                                 // 38.1 real minutes shown in 20 s
function fallState(t) {
  const tm = clamp((t - FALL) / FALL_LEN, 0, 1) * FALL_MIN; const half = FALLT.t[FALLT.t.length - 1]; const back = tm > half; const tt = back ? FALL_MIN - tm : tm;
  const T = FALLT.t; let i = 0; while (i < T.length - 2 && T[i + 1] < tt) i++; const k = clamp((tt - T[i]) / Math.max(T[i + 1] - T[i], 1e-6), 0, 1);
  const dpt = lerp(FALLT.d[i], FALLT.d[i + 1], k), mph = lerp(FALLT.mph[i], FALLT.mph[i + 1], k), gg = lerp(FALLT.g[i], FALLT.g[i + 1], k);
  return { min: tm, depthKm: back ? 12742 - dpt : dpt, layerKm: dpt, mph, g: gg, back };
}
function updateShaft(t) {
  shaftU.uT.value = t;
  let D, Dv;
  if (t < CUT) {
    D = digDepth(t); Dv = Math.abs(digDepth(t + 1 / 30) - D); shaftU.uMode.value = 0; shaftU.uR.value = RS; shaft.background = new THREE.Color(0, 0, 0);
    shaftU.uSky.value = 1; shaftU.uWet.value = smooth(7.5, 9.0, t); shaftU.uHeat.value = smooth(22.0, 26.0, t); shaftU.uSqueeze.value = smooth(24.6, 26.8, t) * 1.1;
    shaftMesh.scale.set(1, 1, 1); lamp.intensity = 14; shaftU.uLamp.value = 1;
    digFace.visible = t < 12.8; digFace.position.y = -lerp(2.6, 4.5, smooth(5.0, 12, t)); flood.visible = t > 8.0 && t < 12.6;
    flood.position.y = digFace.position.y + 0.02 + 1.4 * smooth(8.6, 12.0, t);
  } else {
    const f = fallState(t); D = f.layerKm * 1000; Dv = 40 * Math.min(60, f.mph / 400); shaftU.uMode.value = 1;
    shaftU.uR.value = 2.0; shaftMesh.scale.set(2.0 / RS, 1, 2.0 / RS); digFace.visible = false; flood.visible = false; lamp.intensity = 0; shaftU.uSqueeze.value = 0;
    const km = f.layerKm, oc = smooth(2850, 2930, km) * (1 - smooth(5110, 5190, km)), ic = smooth(5110, 5190, km), tp = smooth(30, 2890, km);
    shaft.background = new THREE.Color(0.5, 0.12, 0.03).lerp(new THREE.Color(1.4, 0.6, 0.15), oc + ic * 1.2).multiplyScalar(0.6 + 0.4 * tp);
  }
  shaftU.uD.value = D; shaftU.uDv.value = Dv;
  // utilities, fossils, burst, drips — positioned by their true depth relative to the camera
  pipe.visible = t < 9; pipe.position.set(0, D - PIPE_D, RS - 0.012);
  cable.visible = t < 9; cable.position.set(-RS + 0.006, D - CABLE_D, 0); cableTape.position.copy(cable.position).add(new THREE.Vector3(0, 0, 0.12));
  for (const F of fossils) { const y = D - F.d; F.m.visible = t > 11 && t < 16 && y < 1 && y > -20; if (!F.m.visible) continue; F.m.position.set(Math.cos(F.a) * (RS - 0.004), y, Math.sin(F.a) * (RS - 0.004)); F.m.lookAt(0, y, 0); F.m.rotateZ(F.rot); }
  const bt = t - 18.75, bOn = bt > 0 && bt < 2.2 && t < CUT; const bA = 0.6;                       // the burst bursts out of the wall at azimuth bA
  for (const F of frags) { F.m.visible = bOn; if (!bOn) continue; const p0 = new THREE.Vector3(Math.cos(bA) * RS, -1.6, Math.sin(bA) * RS);
    const inward = new THREE.Vector3(-Math.cos(bA), 0, -Math.sin(bA)); const v = inward.clone().multiplyScalar(F.v.z).add(new THREE.Vector3(-Math.sin(bA), 0, Math.cos(bA)).multiplyScalar(F.v.x)).add(new THREE.Vector3(0, F.v.y, 0)).multiplyScalar(F.v.length() / 1.0);
    const p = p0.clone().addScaledVector(v, bt * 0.35).add(new THREE.Vector3(0, -4.9 * bt * bt * 0.3, 0)); p.x = clamp(p.x, -RS * 0.97, RS * 0.97); p.z = clamp(p.z, -RS * 0.97, RS * 0.97);
    F.m.position.copy(p); F.m.rotation.set(F.sp.x * bt, F.sp.y * bt, F.sp.z * bt); }
  for (const P of dust) { P.s.visible = bOn; if (!bOn) continue; const k = bt + P.ph * 0.4; const p = new THREE.Vector3(Math.cos(bA) * RS * 0.9, -1.6, Math.sin(bA) * RS * 0.9).addScaledVector(new THREE.Vector3(-Math.cos(bA), 0.2, -Math.sin(bA)), k * 0.35).add(P.v.clone().multiplyScalar(k * 0.3));
    P.s.position.copy(p); P.s.scale.setScalar(0.08 + k * 0.22); P.s.material.opacity = 0.55 * smooth(0, 0.15, bt) * (1 - smooth(0.8, 2.2, bt)); }
  for (const Dp of drips) { const on = t > 8.2 && t < 12.6; Dp.m.visible = on; if (!on) continue; const k = ((t * Dp.sp + Dp.ph) % 1); const y = -0.3 - k * 4.2; Dp.m.position.set(Math.cos(Dp.a) * (RS - 0.01), y, Math.sin(Dp.a) * (RS - 0.01)); }
  return { D, Dv };
}
