// =================== SPACE scene: low-poly globe (ER = 10 units = 6,371 km) ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#020308');
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.002, 3000);
{
  const n = 5000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(900); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
}
space.add(new THREE.AmbientLight(0x5a6a90, 1.1));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 3.0); space.add(spaceSun);
const ER = 10, KM = ER / 6371;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const GZ = ll2v(40.758, -73.9855);                       // ground zero on the globe
const GZn = GZ.clone().normalize();
// local frame at ground zero: east / north
const EAST = new THREE.Vector3(0, 1, 0).cross(GZn).normalize(), NORTH = GZn.clone().cross(EAST).normalize();
// the path comes in from the east-southeast at 45 degrees
const PATH_H = EAST.clone().multiplyScalar(0.94).addScaledVector(NORTH, -0.34).normalize();
const PATH = PATH_H.clone().multiplyScalar(Math.cos(ENTRY_DEG * Math.PI / 180)).addScaledVector(GZn, Math.sin(ENTRY_DEG * Math.PI / 180)).normalize();
const globe = new THREE.Group(); space.add(globe);
const cityDots = [];
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry];
  const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) {
    if (ring.every(([, la]) => la < -55)) continue;
    let prev = ring[0][0], off = 0; const pts = [];
    for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); }
  }
  const img = g.getImageData(0, 0, MW, MH).data;
  const isLand = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 60); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
    const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6');
    else if (isLand(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); }
    else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.035, 96, 64), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vW=normalize((modelMatrix*vec4(position,1.)).xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.4); float l=0.25+0.75*smoothstep(-0.3,0.4,dot(vW,uSun)); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.3*l; }'
  })); globe.add(atm); atmMesh = atm;
  // city lights on the night side (metros from the zombie map list)
  for (const [n, la, lo, pop] of METROS_LL) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffc77a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.position.copy(ll2v(la, lo, ER * 1.002)); s.scale.setScalar(0.012 + 0.012 * Math.sqrt(pop)); globe.add(s); cityDots.push(s);
  }
  for (let i = 0; i < 160; i++) {
    const v2 = ll2v(R(-60, 65), R(-180, 180), ER * 1.012); const s = mesh(cloudGeo, cloudMat, false, false); cloudWisps.push(s);
    s.position.copy(v2); s.lookAt(0, 0, 0); s.scale.set(R(0.3, 0.9), R(0.15, 0.4), 0.05); globe.add(s);
  }
}
let atmMesh = null; const cloudWisps = [];
const cloudGeo = new THREE.IcosahedronGeometry(1, 0), cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, flatShading: true });
const METROS_LL = [['New York', 40.71, -74.0, 19.8], ['Philadelphia', 39.95, -75.17, 6.2], ['Boston', 42.36, -71.06, 4.9], ['Washington', 38.9, -77.04, 6.4], ['Baltimore', 39.29, -76.61, 2.8],
  ['Pittsburgh', 40.44, -79.99, 2.4], ['Chicago', 41.88, -87.63, 9.6], ['Detroit', 42.33, -83.05, 4.4], ['Atlanta', 33.75, -84.39, 6.1], ['Miami', 25.76, -80.19, 6.1], ['Toronto', 43.65, -79.38, 6.4],
  ['Montreal', 45.5, -73.57, 4.3], ['Charlotte', 35.23, -80.84, 2.7], ['Cleveland', 41.5, -81.69, 2.1], ['Columbus', 39.96, -83.0, 2.1], ['Raleigh', 35.78, -78.64, 1.4], ['Richmond', 37.54, -77.44, 1.3],
  ['Hartford', 41.76, -72.67, 1.2], ['Providence', 41.82, -71.41, 1.7], ['Buffalo', 42.89, -78.88, 1.2], ['Orlando', 28.54, -81.38, 2.7], ['Tampa', 27.95, -82.46, 3.2], ['Nashville', 36.16, -86.78, 2.0],
  ['St. Louis', 38.63, -90.2, 2.8], ['Minneapolis', 44.98, -93.27, 3.7], ['Dallas', 32.78, -96.8, 7.6], ['Houston', 29.76, -95.37, 7.1], ['Denver', 39.74, -104.99, 3.0], ['Indianapolis', 39.77, -86.16, 2.1],
  ['Cincinnati', 39.1, -84.51, 2.3], ['Jacksonville', 30.33, -81.66, 1.6], ['Albany', 42.65, -73.75, 0.9], ['Norfolk', 36.85, -75.98, 1.8], ['Ottawa', 45.42, -75.69, 1.4], ['Quebec', 46.81, -71.21, 0.8]];
// ---- the asteroid on the globe: glowing head + plasma trail along the real path (true scale, 1 unit = 637 km)
const gHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffe2b0' })); space.add(gHead);
const gTrailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float w=1.0-abs(vUv.y-0.5)*2.0; float f=pow(w,1.6)*pow(1.0-vUv.x,1.2); vec3 c=mix(vec3(1.0,0.4,0.12),vec3(1.0,0.92,0.75),pow(1.0-vUv.x,4.0)); gl_FragColor=vec4(c*f*uA,1.0); }',
});
const gTrail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), gTrailMat); gTrail.frustumCulled = false; space.add(gTrail);
const ENTRY_KM = 100 / Math.sin(ENTRY_DEG * Math.PI / 180);          // path length inside 100 km of air
function updateGlobeAsteroid(t, show) {
  gHead.visible = gTrail.visible = show; if (!show) return;
  const d = distKm(t) * KM; const head = GZ.clone().addScaledVector(PATH, d);
  gHead.position.copy(head); gHead.scale.setScalar(0.07 + 0.02 * Math.sin(t * 40) ** 2);
  const len = Math.max(0.001, (ENTRY_KM * KM - d) * 1.0); const mid = head.clone().addScaledVector(PATH, len / 2);
  gTrail.position.copy(mid); gTrail.scale.set(len, 0.03, 1);
  const xa = PATH.clone(); const toCam = spaceCam.position.clone().sub(mid).normalize(); const ya = new THREE.Vector3().crossVectors(toCam, xa).normalize(); const za = new THREE.Vector3().crossVectors(xa, ya);
  gTrail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, za));
}
// ---- dust shell (MODEL): spreads from ground zero over the whole planet
const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uGZ: { value: GZn.clone() }, uSpread: { value: 0 }, uA: { value: 0 }, uTime: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 uGZ; uniform float uSpread, uA, uTime; varying vec3 vP;
    float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
    float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){ float a=acos(clamp(dot(vP,uGZ),-1.0,1.0));
      float n=n3(vP*4.0+vec3(uTime*0.05,0.0,0.0))*0.6+n3(vP*11.0)*0.4;
      float cov=smoothstep(uSpread+0.25,uSpread-0.35,a+(n-0.5)*0.9);
      vec3 c=mix(vec3(0.36,0.30,0.25),vec3(0.55,0.48,0.40),n);
      gl_FragColor=vec4(c,cov*uA*(0.55+0.4*n)); }`,
});
const dustShell = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.02, 96, 64), dustMat); space.add(dustShell);
// ---- calm finale: tracked near-Earth asteroids (stylised orbits, not to scale)
const orbits = new THREE.Group(); space.add(orbits);
const orbitDots = [];
{
  const lm = new THREE.LineBasicMaterial({ color: '#5fd3c8', transparent: true, opacity: 0.28 });
  for (let i = 0; i < 26; i++) {
    const a = R(16, 40), e = R(0.1, 0.5), b = a * Math.sqrt(1 - e * e); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R(-0.6, 0.6), R(0, 6.28), R(-0.6, 0.6)));
    const pts = []; for (let k = 0; k <= 128; k++) { const th = k / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(th) * a - a * e, 0, Math.sin(th) * b).applyQuaternion(q)); }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm); orbits.add(ln);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#8ff5e8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(0.9); orbits.add(s);
    orbitDots.push({ s, a, b, e, q, ph: R(0, 6.28), w: R(0.15, 0.35) });
  }
}
function updateOrbits(t, k) {
  orbits.visible = k > 0.001; orbits.children.forEach(o => { if (o.material) o.material.opacity = (o.isLine ? 0.28 : 1) * k; });
  for (const o of orbitDots) { const th = o.ph + t * o.w; o.s.position.set(Math.cos(th) * o.a - o.a * o.e, 0, Math.sin(th) * o.b).applyQuaternion(o.q); }
}
function spaceCamera(t) {
  let pos, look, up = new THREE.Vector3(0, 1, 0), fov = 40;
  // sun just set over New York: the East Coast sits on the night side, close to the terminator
  const sunDir = GZn.clone().multiplyScalar(-0.15).addScaledVector(EAST, -0.98).addScaledVector(NORTH, -0.1).normalize();
  spaceSun.position.copy(sunDir.clone().multiplyScalar(100)); if (atmMesh) atmMesh.material.uniforms.uSun.value.copy(sunDir);
  if (t < T_DESC) {           // entry over the East Coast: low orbit-ish view looking down the path
    const u = (t - T_SPACE) / (T_DESC - T_SPACE);
    const alt = lerp(1300, 950, ease(u)) * KM;
    pos = GZ.clone().addScaledVector(GZn, alt).addScaledVector(NORTH, lerp(-1100, -850, u) * KM).addScaledVector(EAST, lerp(-500, -380, u) * KM);
    look = GZ.clone().addScaledVector(PATH, 50 * KM).addScaledVector(NORTH, 120 * KM); up = GZn.clone(); fov = 44;
  } else if (t < T_CALM) {    // dust spreading
    const u = (t - T_DUST) / (T_CALM - T_DUST);
    const dir = GZn.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), lerp(0.35, -0.25, u)).normalize();
    pos = dir.multiplyScalar(lerp(34, 40, u)).add(new THREE.Vector3(0, 6, 0)); look = new THREE.Vector3(0, 0, 0); fov = 40;
  } else {                    // calm: pull back, tracked asteroids around Earth
    const u = (t - T_CALM) / (T_END + 1 - T_CALM);
    const dir = GZn.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.25 - 0.35 * u).normalize();
    pos = dir.multiplyScalar(lerp(48, 105, ease(u))).add(new THREE.Vector3(0, lerp(10, 30, u), 0)); look = new THREE.Vector3(0, 0, 0); fov = 40;
  }
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos); spaceCam.up.copy(up); spaceCam.lookAt(look);
}
function updateSpace(t) {
  spaceCamera(t);
  updateGlobeAsteroid(t, t < T_DESC);
  const dk = smooth(T_DUST, T_DUST + 0.4, t) * (1 - smooth(T_CALM - 0.3, T_CALM + 0.6, t));
  dustMat.uniforms.uA.value = dk; dustMat.uniforms.uTime.value = t; dustMat.uniforms.uSpread.value = lerp(0.15, 2.9, smooth(T_DUST, T_CALM - 0.2, t));
  dustShell.visible = dk > 0.001;
  updateOrbits(t, smooth(T_CALM + 0.3, T_CALM + 1.5, t));
  for (const s of cityDots) s.material.opacity = 1;
  for (const c of cloudWisps) c.visible = !dustShell.visible && t >= T_DESC;
}
