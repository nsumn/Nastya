// =================== US MAP (us-atlas states-albers: x right, y down, 975 x 610 → map plane x, z): dark slab, state borders, 14k glowing kid dots
// (population-weighted: metro gaussians + every state's area by its population) that fly to YOUR HOUSE; then the 15,500-mile line zig-zagging NYC <-> LA. ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#070a14');
const mapCam = new THREE.PerspectiveCamera(30, W / H, 5, 9000);
mapScene.add(new THREE.HemisphereLight(0x9fb0d0, 0x101018, 1.1)); { const k = new THREE.DirectionalLight(0xc8d4ff, 1.4); k.position.set(-300, 900, 700); mapScene.add(k); }
const MW = 975, MH = 610, toMap = (x, y, h = 11) => V3(x - MW / 2, h, y - MH / 2);
const STATE_POP = { Alabama: 5.0, Arizona: 7.2, Arkansas: 3.0, California: 39.5, Colorado: 5.8, Connecticut: 3.6, Delaware: 1.0, 'District of Columbia': 0.69, Florida: 21.5, Georgia: 10.7, Idaho: 1.8, Illinois: 12.8, Indiana: 6.8, Iowa: 3.2, Kansas: 2.9, Kentucky: 4.5, Louisiana: 4.7, Maine: 1.4, Maryland: 6.2, Massachusetts: 7.0, Michigan: 10.1, Minnesota: 5.7, Mississippi: 3.0, Missouri: 6.2, Montana: 1.1, Nebraska: 2.0, Nevada: 3.1, 'New Hampshire': 1.4, 'New Jersey': 9.3, 'New Mexico': 2.1, 'New York': 20.2, 'North Carolina': 10.4, 'North Dakota': 0.78, Ohio: 11.8, Oklahoma: 4.0, Oregon: 4.2, Pennsylvania: 13.0, 'Rhode Island': 1.1, 'South Carolina': 5.1, 'South Dakota': 0.89, Tennessee: 6.9, Texas: 29.1, Utah: 3.3, Vermont: 0.64, Virginia: 8.6, Washington: 7.7, 'West Virginia': 1.8, Wisconsin: 5.9, Wyoming: 0.58 };
let HOUSE = toMap(560, 300), NYC = toMap(870, 216), LA = toMap(86, 364);
const DOTS = 14000; let dotGeo, dotPts, zig, zigLen = 0;
const dotMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uConv: { value: 0 }, uHouse: { value: V3() }, uSize: { value: 5 }, uFade: { value: 1 } },
  vertexShader: `attribute vec3 aEnd; attribute float aDel; uniform float uT, uConv, uSize; uniform vec3 uHouse; varying float vA;
    void main(){ float k=clamp((uConv-aDel)/0.45,0.0,1.0); k=k*k*(3.0-2.0*k); vec3 p=mix(position,aEnd,k); p.y+=sin(k*3.14159)*60.0*(0.4+aDel);
      vA=1.0-0.6*k*step(0.999,k); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=1.6*uSize*(1.0+0.6*sin(uT*7.0+aDel*40.0)*0.3)*900.0/(-mv.z); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform float uFade; varying float vA; void main(){ vec2 q=gl_PointCoord-0.5; float d=dot(q,q)*4.0; float a=exp(-d*2.5)*vA*uFade; if(a<0.02) discard; gl_FragColor=vec4(vec3(1.0,0.62,0.22)*a*1.6,a); }` });
async function buildMap() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii', 'Puerto Rico'].includes(g.properties.name));
  const merged = topojson.merge(topo, L48), shapes = [];
  for (const poly of merged.coordinates) { const o = poly[0]; if (o.length < 8) continue; const sh = new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))));
    for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))))); shapes.push(sh); }
  const slabGeo = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 }); slabGeo.rotateX(-Math.PI / 2);
  mapScene.add(new THREE.Mesh(slabGeo, [new THREE.MeshStandardMaterial({ color: '#2c3858', roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#0c101a', roughness: 0.9 })]));
  const ms = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b), pts = [];
  for (const line of ms.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; pts.push(a[0] - MW / 2, 10.4, a[1] - MH / 2, b[0] - MW / 2, 10.4, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); mapScene.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#7a86a8', transparent: true, opacity: 0.7 })));
  // rasterise states (index colour) to sample the "rural" share of the dots by state population
  const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; const feats = topojson.feature(topo, { type: 'GeometryCollection', geometries: L48 }).features;
  feats.forEach((f, i) => { g.fillStyle = `rgb(${i + 1},0,0)`; g.beginPath(); const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; for (const p of polys) for (const ring of p) ring.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); });
  const img = g.getImageData(0, 0, MW, MH).data, cells = feats.map(() => []);
  for (let y = 0; y < MH; y += 2) for (let x = 0; x < MW; x += 2) { const v = img[(y * MW + x) * 4]; if (v > 0 && v <= feats.length && img[(y * MW + x) * 4 + 1] === 0) cells[v - 1].push([x, y]); }
  const wts = feats.map((f, i) => cells[i].length ? (STATE_POP[f.properties.name] || 0.5) : 0), wsum = wts.reduce((a, b) => a + b, 0);
  const metros = (await (await fetch('zmap.json')).json()).metros.filter(m => !['Honolulu', 'Anchorage'].includes(m.n)), msum = metros.reduce((a, m) => a + m.pop, 0);
  const ny = metros.find(m => m.n === 'New York'), la = metros.find(m => m.n === 'Los Angeles'), kc = metros.find(m => m.n === 'Kansas City');
  NYC = toMap(ny.x * 2, ny.y * 2); LA = toMap(la.x * 2, la.y * 2); HOUSE = toMap(kc.x * 2 + 18, kc.y * 2 + 4);
  const pos = new Float32Array(DOTS * 3), end = new Float32Array(DOTS * 3), del = new Float32Array(DOTS); let mr2 = 99; const r2 = () => (mr2 = (mr2 * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < DOTS; i++) { let x, y;
    if (r2() < 0.55) { let u = r2() * msum, m = metros[0]; for (const mm of metros) { u -= mm.pop; if (u <= 0) { m = mm; break; } } const sg = 3 + 2.2 * Math.sqrt(m.pop), a = r2() * 6.283, r = sg * Math.sqrt(-2 * Math.log(r2() + 1e-6));
      x = m.x * 2 + Math.cos(a) * r; y = m.y * 2 + Math.sin(a) * r; const v = img[((y | 0) * MW + (x | 0)) * 4]; if (!(v > 0)) { x = m.x * 2; y = m.y * 2; } }
    else { let u = r2() * wsum, s = 0; for (; s < wts.length; s++) { u -= wts[s]; if (u <= 0) break; } const c = cells[Math.min(s, cells.length - 1)]; const p = c[(r2() * c.length) | 0] || [480, 300]; x = p[0] + r2() * 2; y = p[1] + r2() * 2; }
    const p0 = toMap(x, y, 12), a = r2() * 6.283, rr = 5 * Math.sqrt(r2()); pos.set([p0.x, p0.y, p0.z], i * 3); end.set([HOUSE.x + Math.cos(a) * rr, 13, HOUSE.z + Math.sin(a) * rr], i * 3);
    del[i] = 0.55 * Math.hypot(p0.x - HOUSE.x, p0.z - HOUSE.z) / 700 + 0.05 * r2(); }
  dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dotGeo.setAttribute('aEnd', new THREE.BufferAttribute(end, 3)); dotGeo.setAttribute('aDel', new THREE.BufferAttribute(del, 1));
  dotPts = new THREE.Points(dotGeo, dotMat); dotPts.frustumCulled = false; mapScene.add(dotPts); dotMat.uniforms.uHouse.value.copy(HOUSE);
  // the line of kids as a glowing ribbon: NYC -> LA -> NYC … 5.6 legs, each leg in its own lane so the loops stay readable
  const legs = 5.57, dir = LA.clone().sub(NYC), L = dir.length(), nrm = V3(-dir.z, 0, dir.x).normalize(), path = [];
  for (let k = 0; k <= Math.ceil(legs); k++) { const off = (k - legs / 2) * 7.5, A = (k % 2 ? LA : NYC).clone().addScaledVector(nrm, off); path.push(A); }
  const last = path.length - 1, frac = legs - Math.floor(legs); path[last] = path[last - 1].clone().lerp(path[last], frac);
  const curve = new THREE.CurvePath(); for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1]; curve.add(new THREE.LineCurve3(a.clone().setY(13), b.clone().setY(13))); }
  zig = new THREE.Mesh(new THREE.TubeGeometry(curve, 1400, 2.4, 5, false), new THREE.MeshBasicMaterial({ color: '#ffb048', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  zigLen = zig.geometry.index.count; zig.geometry.setDrawRange(0, 0); mapScene.add(zig); }
// the house pin
const pin = new THREE.Group(); { const h = mesh(new THREE.ConeGeometry(5, 14, 4), new THREE.MeshStandardMaterial({ color: '#ff9a3a', emissive: '#ff7a1a', emissiveIntensity: 0.8, flatShading: true })); h.rotation.x = Math.PI; h.position.y = 18; pin.add(h);
  const ring = mesh(new THREE.RingGeometry(6, 8, 24), new THREE.MeshBasicMaterial({ color: '#ffb048', transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 11.5; pin.add(ring); pin.userData.ring = ring; }
mapScene.add(pin);
