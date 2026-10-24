// =================== EARTH COLLAPSING: a smooth cartoon globe (real coastlines, built in two halves); with nothing keeping atoms apart it squeezes down
// to a white-hot speck (at nuclear density Earth would be ~1,200 ft wide) ===================
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
const hotGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,250,235,1)'); rg.addColorStop(0.35, 'rgba(255,190,120,0.55)'); rg.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); earthS.add(hotGlow);
const squeezeAt = t => smooth(EARTH + 0.8, EARTH + 5.2, t);
const earthDiam = t => Math.exp(lerp(Math.log(12742e3), Math.log(367), squeezeAt(t)));   // metres, for the HUD
function updateEarth(t) { const k = squeezeAt(t), sc = Math.exp(lerp(0, Math.log(0.02), k)); earthG.scale.setScalar(sc); atm.scale.setScalar(sc); atm.material.uniforms.uA.value = 1 - k;
  earthG.rotation.y = 0.2 + 0.5 * k + 0.08 * t; faller.visible = false; trail.begin(); trail.end();
  for (const hh of [halfA, halfB]) hh.children.forEach(c => { if (c.userData.groove) c.visible = false; else if (c.material.emissive) c.material.emissive.setRGB(1.6 * k, 0.8 * k * k, 0.3 * k * k * k); });
  const g = smooth(EARTH + 2.5, EARTH + 5.4, t); hotGlow.scale.setScalar(lerp(0.1, 5.0, g) * (1 + 0.06 * Math.sin(t * 9))); hotGlow.material.opacity = g; }
function earthCamera(t) { eaCam.position.set(0, 1.5, lerp(33, 27, smooth(EARTH, ESB + 0.5, t))); eaCam.lookAt(0, 0, 0); }
