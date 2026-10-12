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
