// =================== EARTH CUT LIKE AN APPLE: a smooth cartoon globe (real coastlines) with Chicago on top; it splits into two halves that turn their
// layered faces to us; a glowing dot falls Chicago -> centre -> Indian Ocean in 38 min, then back, and again ===================
const earthS = new THREE.Scene(); earthS.background = new THREE.Color('#04060e'); const eaCam = new THREE.PerspectiveCamera(38, W / H, 0.1, 500);
{ const n = 2500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(120, 200)); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); earthS.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe8ff', size: 2, sizeAttenuation: false }))); }
earthS.add(new THREE.AmbientLight(0x6070a0, 0.8)); { const s = new THREE.DirectionalLight(0xfff2e0, 2.4); s.position.set(-5, 4, 9); earthS.add(s); }
const ER2 = 5, CHI = [41.88, -87.63];
function llv(lat, lon) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)); }
const Q_UP = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -0.5).multiply(new THREE.Quaternion().setFromUnitVectors(llv(...CHI), V3(0, 1, 0)));   // Chicago straight up, North America toward us
const earthG = new THREE.Group(); earthS.add(earthG);
const halfA = new THREE.Group(), halfB = new THREE.Group(); earthG.add(halfA, halfB);
let landImg = null; const MW2 = 2048, MH2 = 1024;
const sectTex = canvasTex(1024, 1024, (g, w, h) => { const c = w / 2; const L = [[1.0, '#7a5a3a'], [0.985, '#e0582a'], [0.546, '#f29a2a'], [0.192, '#ffe46a']];   // crust, mantle, outer core, inner core (PREM radii)
  for (const [r, col] of L) { const rg = g.createRadialGradient(c, c, 0, c, c, r * c); rg.addColorStop(0, new THREE.Color(col).offsetHSL(0, 0, 0.08).getStyle()); rg.addColorStop(1, col); g.fillStyle = rg; g.beginPath(); g.arc(c, c, r * c, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; for (const r of [0.985, 0.546, 0.192]) { g.beginPath(); g.arc(c, c, r * c, 0, 7); g.stroke(); } });
async function buildEarth() {
  const topo = await (await fetch('node_modules/world-atlas/land-110m.json')).json(); const land = topojson.feature(topo, topo.objects.land);
  const cv = document.createElement('canvas'); cv.width = MW2; cv.height = MH2; const g = cv.getContext('2d');
  const oc = g.createLinearGradient(0, 0, 0, MH2); oc.addColorStop(0, '#2a6ab8'); oc.addColorStop(0.5, '#3a90e0'); oc.addColorStop(1, '#2a6ab8'); g.fillStyle = oc; g.fillRect(0, 0, MW2, MH2);
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry]; const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW2, y = (90 - la) / 180 * MH2; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
      const ice = pts.every(([, la]) => la < -60) || pts.every(([, la]) => la > 60); g.fillStyle = ice ? '#f4f8fa' : '#6ac24a'; g.fill('evenodd'); } }
  g.fillStyle = 'rgba(214,180,110,0.85)'; for (const [x0, y0, w0, h0] of [[0.5, 0.36, 0.08, 0.06], [0.56, 0.38, 0.06, 0.04], [0.78, 0.6, 0.1, 0.07]]) { g.beginPath(); g.ellipse(x0 * MW2, y0 * MH2, w0 * MW2 / 2, h0 * MH2 / 2, 0, 0, 7); g.fill(); }   // Sahara, Arabia, Australia's outback
  g.fillStyle = '#f4f8fa'; g.fillRect(0, MH2 * 0.94, MW2, MH2 * 0.06); g.fillRect(0, 0, MW2, MH2 * 0.025);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // split a fine sphere into two halves (by triangle centroid, in the Chicago-up frame) so each half can move on its own
  const sph = new THREE.SphereGeometry(ER2, 160, 110).toNonIndexed(); sph.applyQuaternion(Q_UP); const P = sph.attributes.position, UV = sph.attributes.uv, NR = sph.attributes.normal;
  const parts = [[], []]; for (let f = 0; f < P.count; f += 3) { const cx = (P.getX(f) + P.getX(f + 1) + P.getX(f + 2)) / 3; parts[cx < 0 ? 0 : 1].push(f); }
  parts.forEach((list, s) => { const pos = new Float32Array(list.length * 9), uv = new Float32Array(list.length * 6), nr = new Float32Array(list.length * 9);
    list.forEach((f, i) => { for (let k = 0; k < 3; k++) { pos.set([P.getX(f + k), P.getY(f + k), P.getZ(f + k)], (i * 3 + k) * 3); nr.set([NR.getX(f + k), NR.getY(f + k), NR.getZ(f + k)], (i * 3 + k) * 3); uv.set([UV.getX(f + k), UV.getY(f + k)], (i * 3 + k) * 2); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gg.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); gg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); (s ? halfB : halfA).add(m);
    const face = new THREE.Mesh(new THREE.CircleGeometry(ER2 * 0.997, 96), new THREE.MeshBasicMaterial({ map: sectTex, color: new THREE.Color(1.15, 1.15, 1.15) })); face.rotation.y = s ? -Math.PI / 2 : Math.PI / 2; (s ? halfB : halfA).add(face);
    const groove = new THREE.Mesh(new THREE.PlaneGeometry(0.07, ER2 * 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.5, 2.4), transparent: true, opacity: 0.0 })); groove.rotation.y = s ? -Math.PI / 2 : Math.PI / 2; groove.position.x = s ? -0.01 : 0.01; groove.userData.groove = true; (s ? halfB : halfA).add(groove); }); }
const faller = mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.6) })); earthS.add(faller);
const trail = makeSmoke(earthS, 80);
const atm = new THREE.Mesh(new THREE.SphereGeometry(ER2 * 1.035, 64, 40), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 1 } },
  vertexShader: 'varying vec3 vN, vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN, vV; void main(){ float f=pow(1.0-abs(dot(vN,vV)),3.0); gl_FragColor=vec4(vec3(0.4,0.7,1.0)*f*1.4*uA,1.0); }' })); earthS.add(atm);
// the fall: y(t) = R cos(2π t / T), one way = 38 min of story time squeezed into ~4 s, then back
const FALL0 = EARTH + 3.4, LEG = 4.0;
const fallPos = t => t < FALL0 ? 1 : Math.cos(Math.PI * (t - FALL0) / LEG);
function updateEarth(t) { const sp = ease(clamp((t - EARTH - 0.6) / 2.4, 0, 1));   // split: halves slide apart and turn their faces to the camera
  halfA.position.set(-ER2 * 1.12 * sp, 0, 0); halfA.rotation.y = -Math.PI / 2 * sp; halfB.position.set(ER2 * 1.12 * sp, 0, 0); halfB.rotation.y = Math.PI / 2 * sp;
  earthG.rotation.y = 0.25 * (1 - sp) + 0.1 * Math.sin(t * 0.2) * (1 - sp); atm.material.uniforms.uA.value = 1 - sp;
  for (const hh of [halfA, halfB]) hh.children.forEach(c => { if (c.userData.groove) c.material.opacity = 0.7 * smooth(EARTH + 2.6, EARTH + 3.4, t); });
  // the dot rides down the groove of the left half (its face now looks at us)
  const y = ER2 * 0.97 * fallPos(t); faller.position.set(halfA.position.x + 0.0, y, 0.05); faller.visible = t > EARTH + 2.8; faller.scale.setScalar(1 + 0.25 * Math.sin(t * 8));
  trail.begin(); smokeMat.uniforms.uTint.value.set('#ffd890'); if (faller.visible) for (let k = 1; k < 22; k++) { const tt2 = t - k * 0.03; if (tt2 < FALL0) break; trail.add(V3(faller.position.x, ER2 * 0.97 * fallPos(tt2), 0.06), 0.22 * (1 - k / 22), 0.5 * (1 - k / 22)); } trail.end(); }
function earthCamera(t) { const sp = smooth(EARTH + 0.6, EARTH + 3.0, t); eaCam.position.set(lerp(0, -ER2 * 1.12, smooth(EARTH + 2.6, EARTH + 3.6, t)), lerp(2, 0, sp), lerp(33, 32, sp) - lerp(0, 3, smooth(EARTH + 3.2, LIVE_END, t)));
  eaCam.lookAt(lerp(0, -ER2 * 1.12, smooth(EARTH + 2.6, EARTH + 3.6, t)), 0, 0); }
const LIVE_END = FUSE;
