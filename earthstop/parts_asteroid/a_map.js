// =================== MAP scene: 1 unit = 1 km around ground zero (azimuthal equidistant; x east, z south) ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#03050b');
const mapCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 20000);
mapScene.add(new THREE.HemisphereLight(0x8fa0c8, 0x101018, 0.8));
const mapKey = new THREE.DirectionalLight(0xc8d4ff, 0.9); mapKey.position.set(-300, 900, 700); mapScene.add(mapKey);
const fireLight = new THREE.PointLight(0xffa050, 0, 0, 1.2); fireLight.position.set(0, 8, 0); mapScene.add(fireLight);
const CRATER_R = 10.7, FIRE_R = 19.6, HEAT_R = 211;          // km (Impact: Earth!)
// air-blast arrival time (s) vs distance (km), and peak wind (mph) — Impact: Earth! text outputs for this impact
const BLAST_T = [[0, 0], [16, 151], [40, 187], [130, 419], [300, 920], [1000, 3033]];
const BLAST_WIND = [[16, 5427], [40, 1853], [130, 369], [300, 96], [1000, 17.7]];
function blastR(s) { for (let i = 1; i < BLAST_T.length; i++) if (s <= BLAST_T[i][1]) { const [ra, ta] = BLAST_T[i - 1], [rb, tb] = BLAST_T[i]; return lerp(ra, rb, (s - ta) / (tb - ta)); } return 1000; }
function windAt(r) { r = clamp(r, 16, 1000); for (let i = 1; i < BLAST_WIND.length; i++) if (r <= BLAST_WIND[i][0]) { const [ra, wa] = BLAST_WIND[i - 1], [rb, wb] = BLAST_WIND[i]; const k = Math.log(r / ra) / Math.log(rb / ra); return Math.exp(lerp(Math.log(wa), Math.log(wb), k)); } return 17.7; }
let azProj = null; const kmXY = (lat, lon) => { const [x, y] = azProj([lon, lat]); return [x, y]; };
const NEAR = 64;
async function buildMap() {
  const data = await (await fetch('data/asteroid_land.json')).json();
  azProj = d3.geoAzimuthalEquidistant().rotate([-data.center[0], -data.center[1]]).scale(6371).translate([0, 0]);
  const LIM = data.lim;
  const drawPolys = (g, polys, s, o) => { for (const poly of polys) { g.beginPath(); for (const ring of poly) { ring.forEach(([x, y], i) => { const px = (x + o) * s, py = (y + o) * s; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); } g.fill('evenodd'); } };
  // --- regional texture (R land, G lights, B state borders)
  const RN = 4096, rs = RN / (2 * LIM);
  const mask = document.createElement('canvas'); mask.width = mask.height = RN; let g = mask.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, RN, RN); g.fillStyle = '#fff';
  drawPolys(g, data.canada, rs, LIM); drawPolys(g, data.land, rs, LIM);
  const bord = document.createElement('canvas'); bord.width = bord.height = RN; const gb = bord.getContext('2d'); gb.strokeStyle = '#fff'; gb.lineWidth = 2.2;
  for (const l of data.borders) { gb.beginPath(); l.forEach(([x, y], i) => { const px = (x + LIM) * rs, py = (y + LIM) * rs; i ? gb.lineTo(px, py) : gb.moveTo(px, py); }); gb.stroke(); }
  const LN = 2048, ls = LN / (2 * LIM); const lights = new Float32Array(LN * LN);
  const mets = METROS_LL.map(([n, la, lo, pop]) => { const [x, y] = kmXY(la, lo); return { x, y, pop }; }).concat(TOWNS.map(([la, lo, pop]) => { const [x, y] = kmXY(la, lo); return { x, y, pop }; }));
  for (const m of mets) {
    const sig = 2.5 + 4.5 * Math.sqrt(m.pop), cx = (m.x + LIM) * ls, cy = (m.y + LIM) * ls, rp = Math.ceil(sig * 3 * ls);
    for (let y = Math.max(0, Math.floor(cy - rp)); y < Math.min(LN, cy + rp); y++) for (let x = Math.max(0, Math.floor(cx - rp)); x < Math.min(LN, cx + rp); x++) {
      const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (ls * ls); lights[y * LN + x] += Math.min(1.4, 0.45 + 0.3 * Math.sqrt(m.pop)) * Math.exp(-d2 / (2 * sig * sig));
    }
  }
  const lc = document.createElement('canvas'); lc.width = lc.height = LN; const glc = lc.getContext('2d'); const lid = glc.createImageData(LN, LN);
  let sd = 7; const hrand = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < LN * LN; i++) { const v = Math.min(1, lights[i] + 0.04) * (0.35 + 0.65 * hrand() ** 2); lid.data[i * 4] = lid.data[i * 4 + 1] = lid.data[i * 4 + 2] = v * 255; lid.data[i * 4 + 3] = 255; }
  glc.putImageData(lid, 0, 0);
  const lbig = document.createElement('canvas'); lbig.width = lbig.height = RN; const glb = lbig.getContext('2d'); glb.imageSmoothingEnabled = true; glb.drawImage(lc, 0, 0, RN, RN);
  regTex = packTex(RN, mask, lbig, bord);
  // --- near texture (±64 km, R land, G lights, B Manhattan)
  const NN = 2048, ns = NN / (2 * NEAR);
  const m2 = document.createElement('canvas'); m2.width = m2.height = NN; g = m2.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, NN, NN); g.fillStyle = '#fff'; drawPolys(g, data.land, ns, NEAR);
  const mh = document.createElement('canvas'); mh.width = mh.height = NN; const gm = mh.getContext('2d'); gm.fillStyle = '#000'; gm.fillRect(0, 0, NN, NN); gm.fillStyle = '#fff'; drawPolys(gm, data.manhattan, ns, NEAR);
  const l2 = document.createElement('canvas'); l2.width = l2.height = NN; const gl2 = l2.getContext('2d'); const id2 = gl2.createImageData(NN, NN);
  for (let y = 0; y < NN; y++) for (let x = 0; x < NN; x++) {
    const kx = x / ns - NEAR, ky = y / ns - NEAR; const d = Math.hypot(kx, ky + 3);
    const dens = 0.25 + 0.75 * Math.exp(-d / 22);                       // brightest over Midtown, dimmer toward the suburbs
    const grid = (Math.abs(((kx * 0.87 - ky * 0.48) / 0.27) % 1) < 0.2 || Math.abs(((kx * 0.48 + ky * 0.87) / 0.08) % 1) < 0.25) ? 1 : 0.45; // street grid tilted like Manhattan's
    const v = Math.min(1, dens * grid * (0.4 + 0.6 * hrand() ** 1.5)); const i = (y * NN + x) * 4; id2.data[i] = id2.data[i + 1] = id2.data[i + 2] = v * 255; id2.data[i + 3] = 255;
  }
  gl2.putImageData(id2, 0, 0);
  nearTex = packTex(NN, m2, l2, mh);
  mapMat.uniforms.uReg.value = regTex; mapMat.uniforms.uNear.value = nearTex; mapMat.uniforms.uLim.value = LIM;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2 * LIM, 2 * LIM, 1, 1), mapMat); plane.rotation.x = -Math.PI / 2; mapScene.add(plane);
  buildLabels();
}
const TOWNS = [[40.22, -74.76, 0.4], [41.31, -72.92, 0.8], [40.6, -75.47, 0.8], [41.18, -73.19, 0.9], [42.1, -72.59, 0.7], [39.16, -75.52, 0.2], [39.74, -75.55, 0.6], [40.27, -76.88, 0.6],
  [41.41, -75.66, 0.5], [43.05, -76.15, 0.6], [43.1, -75.23, 0.3], [41.5, -74.01, 0.3], [40.92, -73.2, 1.2], [40.73, -73.6, 1.5], [39.36, -74.42, 0.3], [42.27, -71.8, 0.9], [42.99, -71.46, 0.4], [38.98, -76.49, 0.4], [39.96, -76.73, 0.4], [40.04, -76.31, 0.5]];
function packTex(N, rC, gC, bC) {
  const r = rC.getContext('2d').getImageData(0, 0, N, N).data, gg = gC.getContext('2d').getImageData(0, 0, N, N).data, b = bC.getContext('2d').getImageData(0, 0, N, N).data;
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4, o = ((N - 1 - y) * N + x) * 4; out[o] = r[i]; out[o + 1] = Math.min(r[i], gg[i]); out[o + 2] = b[i]; out[o + 3] = 255; }
  const t = new THREE.DataTexture(out, N, N, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return t;
}
let regTex = null, nearTex = null;
const mapMat = new THREE.ShaderMaterial({
  uniforms: { uReg: { value: null }, uNear: { value: null }, uLim: { value: 900 }, uTime: { value: 0 }, uLW: { value: 1 },
    uFire: { value: new THREE.Vector2(0, 0) }, uShock: { value: new THREE.Vector2(0, 0) }, uCrat: { value: 0 }, uMelt: { value: 0 }, uManh: { value: 0 },
    uHeat: { value: new THREE.Vector2(0, 0) }, uQuake: { value: new THREE.Vector2(0, 0) }, uBlast: { value: new THREE.Vector2(0, 0) }, uOut: { value: 0 }, uEj: { value: 0 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D uReg, uNear; uniform float uLim, uTime, uLW, uCrat, uMelt, uManh, uOut, uEj; uniform vec2 uFire, uShock, uHeat, uQuake, uBlast; varying vec3 vW;
    float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
    float ring(float d, float r, float w){ return exp(-pow((d-r)/w,2.0)); }
    void main(){
      vec2 p=vW.xz; float d=length(p);
      vec4 rg=texture2D(uReg, vec2(p.x/(2.0*uLim)+0.5, 1.0-(p.y/(2.0*uLim)+0.5)));
      float nk=smoothstep(${NEAR.toFixed(1)}, ${(NEAR - 8).toFixed(1)}, max(abs(p.x),abs(p.y)));
      vec4 nr=texture2D(uNear, vec2(p.x/${(2 * NEAR).toFixed(1)}+0.5, 1.0-(p.y/${(2 * NEAR).toFixed(1)}+0.5)));
      float land=mix(rg.r, nr.r, nk), lit=mix(rg.g, nr.g, nk), bord=rg.b*(1.0-nk), manh=nr.b*nk;
      vec3 water=vec3(0.018,0.032,0.065)+vec3(0.0,0.01,0.02)*n2(p*0.05);
      vec3 ground=vec3(0.065,0.078,0.10)+vec3(0.02)*n2(p*0.3);
      vec3 col=mix(water, ground, land);
      float out_=uOut>0.0 ? smoothstep(uOut, uOut-6.0, d)*(d<170.0?1.0:0.55) : 0.0;
      col+=vec3(1.0,0.72,0.38)*pow(lit,1.6)*1.5*land*(1.0-out_);
      col+=vec3(0.45,0.5,0.62)*bord*0.35;
      // scorched ground after the fireball, ejecta blanket
      float sc=smoothstep(45.0, 12.0, d)*step(0.001,uOut);
      col=mix(col, vec3(0.05,0.035,0.03)+vec3(0.5,0.12,0.02)*pow(n2(p*1.7),6.0)*0.8, sc*0.85);
      float ej=uEj*clamp(pow(${CRATER_R.toFixed(1)}/max(d,1.0),1.4),0.0,1.0);
      col=mix(col, vec3(0.30,0.26,0.22)*(0.7+0.5*n2(p*2.0)), ej*0.9);
      // crater: bowl, melt, rim
      if(uCrat>0.0){
        float bowl=smoothstep(${CRATER_R.toFixed(1)}+0.4, ${CRATER_R.toFixed(1)}-1.2, d);
        vec3 bc=vec3(0.07,0.055,0.05)*(0.6+0.8*smoothstep(0.0,${CRATER_R.toFixed(1)},d))+vec3(0.08)*n2(p*3.0)*0.4;
        float mn=n2(p*1.3+vec2(uTime*0.15,0.0))*0.6+n2(p*4.0-vec2(0.0,uTime*0.2))*0.4;
        bc+=vec3(1.0,0.32,0.06)*uMelt*smoothstep(0.38,0.75,mn)*smoothstep(${(CRATER_R * 0.85).toFixed(1)},2.0,d)*1.6;
        col=mix(col, bc, bowl*uCrat);
        col+=vec3(0.45,0.4,0.36)*ring(d, ${CRATER_R.toFixed(1)}, 0.35)*uCrat*0.35;
      }
      // Manhattan outline (drawn over the crater for scale)
      col=mix(col, vec3(0.2,0.75,0.85), manh*uManh*0.22); col+=vec3(0.4,1.0,1.0)*manh*(1.0-manh)*4.0*uManh*1.2;
      // fireball light on the ground
      col+=vec3(1.0,0.55,0.22)*uFire.y*exp(-d/max(uFire.x*1.3,1.0))*1.4;
      col+=vec3(1.0,0.95,0.85)*ring(d,uShock.x,max(uLW*1.5,0.6))*uShock.y;
      // heat (light-speed): orange disc + ring
      col=mix(col, vec3(0.9,0.3,0.06), uHeat.y*0.28*smoothstep(uHeat.x+2.0,uHeat.x-6.0,d));
      col+=vec3(1.0,0.5,0.15)*ring(d,uHeat.x,uLW*1.2)*uHeat.y*1.2;
      // quake ring (blue) with trailing ripples
      float qr=ring(d,uQuake.x,uLW*1.3)+0.45*ring(d,uQuake.x-uLW*7.0,uLW*1.0)+0.2*ring(d,uQuake.x-uLW*14.0,uLW*0.9);
      col+=vec3(0.4,0.75,1.0)*qr*uQuake.y*1.3; col=mix(col, col*vec3(0.85,0.95,1.15), uQuake.y*0.5*smoothstep(uQuake.x,uQuake.x-30.0,d)*step(0.5,uQuake.x));
      // air blast (white front, haze behind)
      col+=vec3(1.0,1.0,1.0)*ring(d,uBlast.x,uLW*1.6)*uBlast.y*1.4;
      col=mix(col, vec3(0.55,0.5,0.48), uBlast.y*0.22*smoothstep(uBlast.x,uBlast.x-uLW*25.0,d)*step(0.5,uBlast.x));
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
// ---- crater rim + central peak (rim height exaggerated ~2x so it reads from the air)
const rimMat = new THREE.MeshStandardMaterial({ color: '#4a4038', roughness: 1, flatShading: true });
const rimGeo = new THREE.LatheGeometry([[CRATER_R - 1.6, -0.02], [CRATER_R - 0.6, 0.35], [CRATER_R, 0.55], [CRATER_R + 1.2, 0.3], [CRATER_R + 4.5, 0.0]].map(([x, y]) => new THREE.Vector2(x, y)), 96);
{ const p = rimGeo.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) * (1 + 0.35 * Math.sin(a * 7) * Math.sin(a * 3 + 1))); } rimGeo.computeVertexNormals(); }
const rim = new THREE.Mesh(rimGeo, rimMat); mapScene.add(rim);
const peak = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.5, 9), new THREE.MeshStandardMaterial({ color: '#3a2f28', roughness: 1, flatShading: true, emissive: '#ff5a10', emissiveIntensity: 0 })); peak.scale.set(0.6, 1, 0.6); peak.position.y = 0.25; /* central peak left out: reads as a dot from the air */
// ---- fireball: expanding dome, then a rising plume of smoke
const fireMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uHot: { value: 1 }, uA: { value: 1 } },
  vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: `uniform float uT, uHot, uA; varying vec3 vP; varying vec3 vN; varying vec3 vV;
    float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){ float n=n3(vP*4.0+vec3(0.0,-uT*0.8,0.0))*0.55+n3(vP*9.0-vec3(uT*0.5))*0.3+n3(vP*20.0)*0.15;
      float rim=pow(1.0-abs(dot(vN,vV)),1.5);
      vec3 hot=mix(vec3(1.0,0.55,0.15),vec3(1.0,0.97,0.85),smoothstep(0.35,0.8,n)*uHot);
      vec3 smoke=mix(vec3(0.16,0.12,0.10),vec3(0.55,0.25,0.10),n*n);
      vec3 c=mix(smoke,hot*2.2,uHot*(0.5+0.5*n));
      float a=uA*(0.75+0.25*n)*(1.0-0.5*rim*(1.0-uHot));
      gl_FragColor=vec4(c,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), fireMat); mapScene.add(fireball);
const plume = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), fireMat); mapScene.add(plume);
const stemGeo = new THREE.CylinderGeometry(0.55, 1, 1, 32, 1, true); stemGeo.translate(0, 0.5, 0); const stem = new THREE.Mesh(stemGeo, fireMat); mapScene.add(stem);
const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffb070' })); mapScene.add(fireGlow);
// ---- rock rain (re-entering ejecta), 52 - 54.5 s
const DEB_N = 2200;
const debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffb36a' }), DEB_N); debris.frustumCulled = false; mapScene.add(debris);
const DEB = []; for (let i = 0; i < DEB_N; i++) { const r = CRATER_R + 4 + 150 * Math.pow(rnd(), 1.8), a = R(0, Math.PI * 2); DEB.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, a, t: R(T_EJECT + 0.1, T_DUST - 0.1), h: R(25, 60), s: R(0.5, 1.3) }); debris.setColorAt(i, new THREE.Color().setHSL(R(0.03, 0.09), 1, R(0.55, 0.75))); }
const dmy = new THREE.Object3D();
function updateDebris(t) {
  debris.visible = t > T_EJECT - 0.2 && t < T_DUST + 0.2;
  if (!debris.visible) return;
  for (let i = 0; i < DEB_N; i++) {
    const D = DEB[i]; const k = (t - (D.t - 0.9)) / 0.9;           // 0.9 s fall
    if (k < 0 || k > 1.25) { dmy.position.set(0, -99, 0); dmy.scale.setScalar(0); }
    else if (k <= 1) { const back = (1 - k) * D.h * 0.6; dmy.position.set(D.x - Math.cos(D.a) * back, (1 - k) * D.h, D.z - Math.sin(D.a) * back); dmy.lookAt(D.x, 0, D.z); dmy.scale.set(D.s * 0.6, D.s * 0.6, D.s * 4.5); }
    else { dmy.position.set(D.x, 0.2, D.z); dmy.scale.set(D.s * 2 * (1.25 - k) * 4, 0.1, D.s * 2 * (1.25 - k) * 4); }
    dmy.updateMatrix(); debris.setMatrixAt(i, dmy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;
}
// ---- labels (DOM, projected)
const LABELS = [
  { t: 'NEWARK · 10 MI', ll: [40.7357, -74.1724], a: T_MAP + 1.5, b: T_CRATER - 0.4, cls: 'small' },
  { t: 'BROOKLYN', ll: [40.6501, -73.9496], a: T_MAP + 1.5, b: T_CRATER - 0.4, cls: 'small' },
  { t: 'MANHATTAN · 13.4 MI LONG', ll: [40.875, -73.925], a: T_CRATER + 3.0, b: T_HEAT - 0.3, cls: 'blue', dz: -2.5 },
  { t: 'CRATER · 13 MI', ll: [40.758, -73.9855], a: T_CRATER + 0.6, b: T_HEAT - 0.3, cls: 'orange', dz: 12.5 },
  { t: 'NEW YORK', ll: [40.758, -73.9855], a: T_HEAT + 1.0, b: T_EJECT + 2.4, cls: 'you', dz: -40 },
  { t: 'PHILADELPHIA · 83 MI', ll: [39.9526, -75.1652], a: T_HEAT + 1.2, b: T_DUST - 0.3, cls: '' },
  { t: 'BOSTON · 187 MI', ll: [42.3601, -71.0589], a: T_HEAT + 1.6, b: T_EJECT - 0.3, cls: '' },
  { t: 'WASHINGTON · 206 MI', ll: [38.9072, -77.0369], a: T_HEAT + 1.6, b: T_EJECT - 0.3, cls: '' },
  { t: 'TRENTON', ll: [40.2206, -74.7597], a: T_EJECT + 0.3, b: T_DUST - 0.3, cls: 'small' },
  { t: 'NEW HAVEN', ll: [41.3083, -72.9279], a: T_EJECT + 0.3, b: T_DUST - 0.3, cls: 'small' },
];
function buildLabels() {
  const box = document.getElementById('labels');
  for (const L of LABELS) { const [x, y] = kmXY(L.ll[0], L.ll[1]); L.p = new THREE.Vector3(x, 0.5, y + (L.dz || 0)); L.el = document.createElement('div'); L.el.className = 'lbl ' + L.cls; L.el.innerHTML = L.t; box.appendChild(L.el); }
}
function updateLabels(t, active) {
  for (const L of LABELS) {
    if (!L.el) continue;
    const a = active ? fadeWin(t, L.a, L.b, 0.35) : 0;
    if (a <= 0) { L.el.style.opacity = 0; continue; }
    const v = L.p.clone().project(mapCam); const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
    const capOn = +document.getElementById('cap').style.opacity > 0.05; const ok = v.z < 1 && x > 140 && x < W - 140 && y > 330 && y < 1640 && !(capOn && y > 1190 && y < 1430);
    L.el.style.left = x + 'px'; L.el.style.top = y + 'px'; L.el.style.opacity = ok ? a : 0;
  }
}
// ---- camera keyframes: [t, lookX, lookZ, dist km, pitch deg, heading deg (screen-up direction, from north)]
const MAPKEYS = [[T_MAP, 0, 0, 150, 26, 0], [T_FIREB, 0, -2, 140, 32, 8], [T_CRATER - 1.6, 0, 0, 105, 50, 20], [T_CRATER + 0.4, 0, 0, 70, 64, 29], [T_HEAT - 0.5, 0, 0, 64, 66, 29],
  [T_HEAT + 1.6, -12, 10, 760, 60, 48], [T_QUAKE, -14, 8, 1300, 66, 52.8], [T_EJECT - 0.5, -14, 8, 1340, 67, 52.8], [T_EJECT + 0.7, -10, 15, 330, 48, 38], [T_DUST, -6, 10, 300, 46, 36]];
function mapCamera(t) {
  let k = MAPKEYS.length - 2; for (let i = 0; i < MAPKEYS.length - 1; i++) if (t < MAPKEYS[i + 1][0]) { k = i; break; }
  const A = MAPKEYS[k], B = MAPKEYS[k + 1]; const u = ease(clamp((t - A[0]) / (B[0] - A[0]), 0, 1));
  const lx = lerp(A[1], B[1], u), lz = lerp(A[2], B[2], u), dist = Math.exp(lerp(Math.log(A[3]), Math.log(B[3]), u)), pitch = lerp(A[4], B[4], u) * Math.PI / 180, hd = lerp(A[5], B[5], u) * Math.PI / 180;
  const fwd = new THREE.Vector3(Math.sin(hd), 0, -Math.cos(hd));
  const look = new THREE.Vector3(lx, 0, lz); const pos = look.clone().addScaledVector(fwd, -Math.cos(pitch) * dist); pos.y = Math.sin(pitch) * dist;
  mapCam.near = dist * 0.01; mapCam.far = dist * 20; mapCam.fov = 40; mapCam.updateProjectionMatrix(); mapCam.position.copy(pos); mapCam.up.set(0, 1, 0); mapCam.lookAt(look);
  return dist;
}
// quake: surface waves ~5 km/s; shown over 70 s of real time during the QUAKE shot
const quakeSim = t => lerp(0, 70, clamp((t - T_QUAKE - 0.3) / (T_BLAST - T_QUAKE - 0.6), 0, 1));
const blastSim = t => lerp(0, 1000, clamp((t - T_BLAST - 0.3) / (T_EJECT - T_BLAST - 0.8), 0, 1));
function updateMap(t) {
  const dist = mapCamera(t); const U = mapMat.uniforms; U.uTime.value = t; U.uLW.value = dist * 0.0028;
  // fireball
  const tf = t - (T_MAP - 0.8);
  const fr = FIRE_R * (1 - Math.exp(-Math.max(tf, 0) / 0.9));
  const rise = smooth(T_MAP + 3.0, T_CRATER - 1.0, t);
  const hot = 1 - smooth(T_MAP + 2.0, T_MAP + 9.0, t);
  const fa = 1 - smooth(T_CRATER - 3.0, T_CRATER + 0.2, t); const domeA = 1 - smooth(T_MAP + 5.0, T_FIREB + 2.0, t);
  fireball.visible = fa > 0.01 && t < T_CRATER + 0.5; fireball.scale.set(fr * (1 + 0.15 * rise), fr * (1 - 0.4 * rise), fr * (1 + 0.15 * rise));
  fireMat.uniforms.uT.value = t; fireMat.uniforms.uHot.value = hot; fireMat.uniforms.uA.value = fa * 0.95; fireball.visible = fireball.visible && domeA > 0.02; fireball.scale.y *= Math.max(domeA, 0.05);
  plume.visible = fireball.visible && rise > 0.01; plume.position.set(0, lerp(10, 42, rise), 0); plume.scale.set(lerp(8, 26, rise), lerp(5, 9, rise), lerp(8, 26, rise)); stem.visible = plume.visible; stem.scale.set(lerp(9, 7, rise), Math.max(0.1, lerp(10, 42, rise)), lerp(9, 7, rise));
  fireGlow.visible = fireball.visible; fireGlow.position.set(0, fr * 0.4, 0); fireGlow.scale.setScalar(fr * 5 * (0.4 + hot)); fireGlow.material.opacity = hot * fa;
  fireLight.intensity = hot * 4000 * fa; fireLight.position.set(0, fr * 0.6, 0);
  U.uFire.value.set(fr, hot * fa);
  U.uShock.value.set(lerp(2, 55, smooth(T_MAP - 0.6, T_MAP + 5.0, t)), (1 - smooth(T_MAP + 2.0, T_MAP + 5.0, t)) * 0.9);
  U.uOut.value = t > T_MAP ? (t < T_BLAST ? 46 : Math.max(46, blastR(blastSim(t)))) : 0;
  // crater
  const ck = smooth(T_CRATER - 3.5, T_CRATER - 0.5, t); U.uCrat.value = ck; rim.visible = peak.visible = ck > 0.01; rim.scale.set(1, ck, 1);
  U.uMelt.value = 1 - 0.6 * smooth(T_CRATER, T_EJECT, t); peak.material.emissiveIntensity = U.uMelt.value * 0.15;
  U.uManh.value = fadeWin(t, T_CRATER + 2.6, T_HEAT - 0.2, 0.5);
  // heat, quake, blast
  const hk = fadeWin(t, T_HEAT + 0.2, T_QUAKE + 0.2, 0.4); U.uHeat.value.set(HEAT_R * smooth(T_HEAT + 0.2, T_HEAT + 1.0, t), hk * (0.85 + 0.15 * Math.sin(t * 6)));
  const qs = quakeSim(t); U.uQuake.value.set(5 * qs, fadeWin(t, T_QUAKE + 0.1, T_BLAST + 0.1, 0.3));
  const bs = blastSim(t); U.uBlast.value.set(blastR(bs), fadeWin(t, T_BLAST + 0.1, T_EJECT + 0.1, 0.3));
  U.uEj.value = 0.5 * smooth(T_CRATER - 2, T_CRATER + 1, t) + 0.5 * smooth(T_EJECT, T_DUST, t);
  updateDebris(t);
}
