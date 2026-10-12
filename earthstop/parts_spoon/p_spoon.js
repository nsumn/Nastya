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
{ // "Rocket:" — only the nose of the meme rocket (rounded, stylised)
  const prof = [[0.001, 6.6], [1.2, 6.35], [2.3, 5.6], [3.0, 4.5], [3.25, 3.3], [3.35, 2.5], [3.5, 2.0], [3.15, 1.6], [2.6, 1.3], [2.5, -1.2], [2.5, -4.5], [0.001, -4.5]];
  const g = lathe(prof, 72).toNonIndexed(); g.deleteAttribute('uv'); g.computeVertexNormals(); g.scale(1.1, 1.1, 1.1);
  shapes.RocketHead = shapeMesh(g, 1.035);
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
