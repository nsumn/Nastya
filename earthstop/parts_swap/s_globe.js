// =================== GLOBE (ER = 10): US + UK highlighted, swap arcs, airlift planes ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#05070f');
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 3000);
{
  const n = 4000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(900); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7 })));
}
space.add(new THREE.AmbientLight(0x6a7590, 0.9));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 2.6); spaceSun.position.set(-40, 30, 60); space.add(spaceSun);
const ER = 10;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const US_C = [39.5, -98.5], UK_C = [53.5, -1.8];
const globe = new THREE.Group(); space.add(globe);
const glowTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
let countryTopo = null;
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json(); countryTopo = topo;
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH);
  const drawGeo = (geom, col) => {
    g.fillStyle = col; const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
    for (const poly of polys) for (const ring of poly) {
      let prev = ring[0][0], off = 0; const pts = [];
      for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); }
    }
  };
  const feats = topojson.feature(topo, topo.objects.countries).features;
  for (const f of feats) if (f.geometry) drawGeo(f.geometry, '#ffffff');
  for (const f of feats) if (f.id === '840') drawGeo(f.geometry, '#ff0000'); else if (f.id === '826') drawGeo(f.geometry, '#0000ff');
  const img = g.getImageData(0, 0, MW, MH).data;
  const at = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); const i = (y * MW + x) * 4; return [img[i], img[i + 1], img[i + 2]]; };
  const geo = new THREE.IcosahedronGeometry(ER, 48); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI; const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    const [r, gg, b] = at(lat, lon); const land = r > 128 || b > 128;
    if (lat < -62 || lat > 80 || (al > 72 && land)) c.set('#eef3f6');
    else if (r > 128 && gg < 100) c.set('#d8a24a').offsetHSL(0, 0, j);            // USA: warm gold
    else if (b > 128 && r < 100) c.set('#4fb6e0').offsetHSL(0, 0, j);            // UK: bright blue
    else if (land) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 34) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); c.multiplyScalar(0.8); }
    else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  globe.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.04, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.3; }'
  })); globe.add(atm);
}
// great-circle arc between the two countries, lifted above the surface
function arcPoint(u, lift = 2.2) {
  const a = ll2v(...US_C).normalize(), b = ll2v(...UK_C).normalize(); const om = Math.acos(a.dot(b));
  const p = a.clone().multiplyScalar(Math.sin((1 - u) * om) / Math.sin(om)).add(b.clone().multiplyScalar(Math.sin(u * om) / Math.sin(om)));
  return p.normalize().multiplyScalar(ER * (1.01 + 0.0) + lift * Math.sin(Math.PI * u));
}
const arcs = [];
for (const [lift, col] of [[2.6, '#ffd166'], [1.6, '#8fd3ff']]) {
  const pts = []; for (let i = 0; i <= 80; i++) pts.push(arcPoint(i / 80, lift));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.035, 6, false), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 }));
  globe.add(m); arcs.push({ m, lift, col });
}
// streams of people (glow dots) flowing both ways
const STREAM = [];
for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(0.32); globe.add(s); STREAM.push({ s, dir: i % 5 === 0 ? -1 : 1, ph: rnd() }); }
// airlift planes (low-poly), many along the arc
function planeGeo() {
  const parts = [new THREE.CylinderGeometry(0.06, 0.05, 0.9, 6).rotateZ(Math.PI / 2), new THREE.BoxGeometry(0.2, 0.015, 0.9), new THREE.BoxGeometry(0.12, 0.012, 0.32).translate(-0.4, 0.02, 0), new THREE.BoxGeometry(0.12, 0.16, 0.012).translate(-0.4, 0.08, 0)];
  return mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g));
}
const PLANES = []; const pGeo = planeGeo(); const pMat = new THREE.MeshStandardMaterial({ color: '#f4f6fa', roughness: 0.5, flatShading: true });
for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(pGeo, pMat); globe.add(m); PLANES.push({ m, dir: i % 5 === 0 ? -1 : 1, ph: rnd(), lift: R(1.5, 2.7) }); }
function updateGlobe(t, mode) {
  // mode: 'intro' | 'air' | 'tele' | 'back'
  const arcA = mode === 'intro' ? smooth(0.6, 2.0, t) : mode === 'back' ? smooth(T_MID + 0.2, T_MID + 1.2, t) : 1;
  arcs.forEach(a => { a.m.material.opacity = arcA * 0.9; });
  const speed = mode === 'tele' ? 2.2 : 0.35;
  STREAM.forEach(S => {
    const vis = mode !== 'air'; S.s.visible = vis; if (!vis) return;
    let u = (S.ph + t * speed) % 1; const dir = mode === 'back' ? -S.dir : S.dir; if (dir < 0) u = 1 - u;
    S.s.position.copy(arcPoint(u, S.dir > 0 ? 2.6 : 1.6)); S.s.material.color.set(S.dir > 0 ? '#ffd166' : '#8fd3ff'); S.s.material.opacity = arcA * Math.sin(Math.PI * u) ** 0.3;
  });
  PLANES.forEach(P => {
    P.m.visible = mode === 'air'; if (!P.m.visible) return;
    let u = (P.ph + (t - T_AIR) * 0.12) % 1; if (P.dir < 0) u = 1 - u;
    const p = arcPoint(u, P.lift), q = arcPoint(Math.min(1, Math.max(0, u + 0.01 * P.dir)), P.lift);
    P.m.position.copy(p); P.m.up.copy(p.clone().normalize()); P.m.lookAt(q); P.m.rotateY(-Math.PI / 2);
    P.m.scale.setScalar(0.75);
  });
}
function globeCamera(t, mode) {
  let center, dist, fov = 40;
  const mid = arcPoint(0.5, 0).normalize();
  if (mode === 'intro') { center = mid.clone(); dist = lerp(66, 60, smooth(0, T_RATIO, t)); }
  else if (mode === 'air') { const u = (t - T_AIR) / (T_TELE - T_AIR); center = mid.clone().lerp(ll2v(48, -40).normalize(), 0.3); dist = lerp(40, 34, ease(u)); }
  else if (mode === 'tele') { center = mid.clone(); dist = 50; }
  else { const u = (t - T_MID) / (T_END - T_MID); center = mid.clone(); dist = lerp(60, 66, u); }
  // slow drift
  const ang = 0.05 * Math.sin(t * 0.3);
  const pos = center.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).multiplyScalar(dist);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(mid.clone().multiplyScalar(ER * 0.15).add(new THREE.Vector3(0, mode === 'air' ? 0 : 4.5, 0)));
}
