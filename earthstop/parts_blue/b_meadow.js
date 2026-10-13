
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
  let a; do { a = R(-1.2, 1.2); } while (Math.abs(a - 0.16) < 0.3 || Math.abs(a + 0.3) < 0.3);   // keep clear of the sunrise / sunset
  const d = R(1800, 3600); s.position.set(Math.sin(a) * d, d * Math.tan(R(12, 26) * Math.PI / 180), -Math.cos(a) * d); const sc = R(900, 1800); s.scale.set(sc, sc * 0.33, 1);
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
