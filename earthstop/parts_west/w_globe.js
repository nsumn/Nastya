// =================== GLOBE (units: Earth radius 10): spins BACKWARDS; regions recolour with the MPI model results ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#03040a'); const gCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 5000);
const ER = 10; const earthG = new THREE.Group(); space.add(earthG);
const ll = (lat, lon, r = ER) => { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return V3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)).multiplyScalar(r); };
space.add(new THREE.AmbientLight(0x404a66, 0.35)); const gSun = new THREE.DirectionalLight(0xfff4e6, 3.0); space.add(gSun, gSun.target);
{ const n = 4000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color(); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(2500); pos.set([v.x, v.y, v.z], i * 3); c.set(pick(['#ffffff', '#cfe0ff', '#ffe6c0'])).multiplyScalar(R(0.4, 1.6)); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true }))); }
// regions that change colour (weights animated in updateGlobe)
const REG = { sus: { w: 0, idx: [] }, sah: { w: 0, idx: [] }, eur: { w: 0, idx: [] }, ind: { w: 0, idx: [] } };
let earthGeo = null, baseCol = null, altCol = null, thrArr = null; const cityPts = [];
const vn2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, h = (a, b) => hash(a * 57.1 + b * 113.7), s = k => k * k * (3 - 2 * k); return lerp(lerp(h(xi, yi), h(xi + 1, yi), s(xf)), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), s(xf)), s(yf)); };
// spread order inside each region (0 = first to change); edges stay > 1 so the region boundary is organic, not a box
const edgeT = (lat, lon, la0, la1, lo0, lo1) => { const e = Math.min(lat - la0, la1 - lat, (lon - lo0) * Math.cos(lat * Math.PI / 180), (lo1 - lon) * Math.cos(lat * Math.PI / 180)); return clamp(1.65 - e / 4.5, 0, 1.7); };   // ~0 deep inside, > 1.35 within ~1.5 deg of the box edge
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json();
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  for (const f of topojson.feature(topo, topo.objects.countries).features) { if (!f.geometry) continue; const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } } }
  const img = g.getImageData(0, 0, MW, MH).data; const land = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 72); const p = geo.attributes.position; baseCol = new Float32Array(p.count * 3); altCol = new Float32Array(p.count * 3); thrArr = new Float32Array(p.count); const c = new THREE.Color(), a = new THREE.Color(), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(w.fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI, al = Math.abs(lat), j = rnd() * 0.06 - 0.03, isL = land(lat, lon);
    if (lat < -62 || lat > 76) c.set('#eef3f6'); else if (isL) { if (al > 55) c.set('#7c8a62'); else if (al > 14 && al < 34 && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.multiplyScalar(0.85); }
    else c.set(al > 45 ? '#24506e' : '#1f5f92'); c.offsetHSL(0, 0, j); a.copy(c); let reg = null;
    if (isL && lat > 25 && lat < 36.5 && lon > -106 && lon < -76) { reg = 'sus'; a.set(rnd() < 0.6 ? '#d4b97c' : '#c6a46a').offsetHSL(0, 0, j); }
    else if (isL && lat > 9 && lat < 34 && lon > -17 && lon < 60) { reg = 'sah'; a.set(rnd() < 0.5 ? '#5f8a3e' : '#78a04c').multiplyScalar(0.9).offsetHSL(0, 0, j); }
    else if ((isL && lat > 42 && lat < 64 && lon > -11 && lon < 22) || (!isL && lat > 48 && lat < 68 && lon > -45 && lon < 8)) { reg = 'eur'; a.set(isL ? '#f2f5f8' : '#dfe9f0').offsetHSL(0, 0, j); }
    else if (!isL && lat > -15 && lat < 24 && lon > 45 && lon < 100) { reg = 'ind'; a.set(rnd() < 0.5 ? '#2f8f6a' : '#3a9a5a').offsetHSL(0, 0, j); }
    let thr = 0; const nz = vn2(lon / 4, lat / 4) * 0.6 + vn2(lon / 1.3, lat / 1.3) * 0.4;
    if (reg === 'sus') thr = Math.max(edgeT(lat, lon, 25, 36.5, -106, -76), 0.15 + 0.5 * (36.5 - lat) / 11 + nz * 0.4);
    else if (reg === 'sah') thr = Math.max(edgeT(lat, lon, 9, 34, -17, 60), nz * 0.9);
    else if (reg === 'eur') thr = Math.max(edgeT(lat, lon, 42, isL ? 64 : 68, isL ? -11 : -45, isL ? 22 : 8), (isL ? 0.05 : 0.35) + (64 - lat) / 28 + Math.max(0, lon) / 45 + nz * 0.45 + (isL ? 0 : (lon + 45) / 120));
    else if (reg === 'ind') thr = Math.max(edgeT(lat, lon, -15, 24, 45, 100), nz * 0.9);
    for (let k = 0; k < 3; k++) { baseCol.set([c.r, c.g, c.b], (f + k) * 3); altCol.set([a.r, a.g, a.b], (f + k) * 3); thrArr[f + k] = thr; if (reg) REG[reg].idx.push(f + k); } }
  geo.setAttribute('color', new THREE.BufferAttribute(baseCol.slice(), 3)); earthGeo = geo;
  earthG.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 })));
  // night-side city lights (fade in where it is dark)
  const cp = []; for (let i = 0; i < 26000 && cp.length < 5200; i++) { const la = Math.asin(R(-0.6, 0.95)) * 180 / Math.PI, lo = R(-180, 180); if (!land(la, lo)) continue; const dens = (lo > -125 && lo < -65 && la > 25 && la < 50) || (lo > -10 && lo < 40 && la > 36 && la < 60) || (lo > 68 && lo < 122 && la > 8 && la < 40) ? 1 : 0.25; if (rnd() > dens) continue; cp.push(ll(la, lo, ER * 1.002)); }
  const pg = new THREE.BufferGeometry().setFromPoints(cp); earthG.add(new THREE.Points(pg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uL: { value: V3(1, 0, 0) } },
    vertexShader: 'uniform vec3 uL; varying float vA; void main(){ vec3 wp = (modelMatrix*vec4(position,1.0)).xyz; vA = smoothstep(0.05, -0.15, dot(normalize(wp), uL)); gl_PointSize = 2.6; gl_Position = projectionMatrix*viewMatrix*vec4(wp,1.0); }',
    fragmentShader: 'varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(vec3(1.6,1.15,0.6)*vA, 1.0); }' })));
  cityMat = earthG.children[earthG.children.length - 1].material;
  // clouds + atmosphere
  const cl = canvasTex(2048, 1024, (g2, w2, h2) => { g2.clearRect(0, 0, w2, h2); for (let i = 0; i < 1600; i++) { const x = R(0, w2), y = R(h2 * 0.08, h2 * 0.92), r = R(2, 8); const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); } });
  clouds = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.012, 96, 64), new THREE.MeshStandardMaterial({ map: cl, transparent: true, depthWrite: false, opacity: 0.42, roughness: 1 })); earthG.add(clouds);
  space.add(new THREE.Mesh(new THREE.SphereGeometry(ER * 1.06, 96, 64), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { uL: { value: V3(1, 0, 0) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vW = normalize((modelMatrix*vec4(position,1.)).xyz); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uL; varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 6.0); float s = dot(vW, uL); vec3 col = mix(vec3(0.35,0.62,1.0), vec3(1.0,0.55,0.25), smoothstep(0.35, 0.0, s) * smoothstep(-0.35, 0.0, s)); gl_FragColor = vec4(col * f * 1.3 * smoothstep(-0.4, 0.2, s), 1.0); }' })));
  atmoMat = space.children[space.children.length - 1].material;
}
let cityMat = null, atmoMat = null, clouds = null;
function setRegions(w) { let dirty = false; for (const k in w) if (Math.abs(REG[k].w - w[k]) > 1e-4) { REG[k].w = w[k]; dirty = true; } if (!dirty) return; const col = earthGeo.attributes.color.array;
  for (const k in REG) { const ww = REG[k].w * 1.35; for (const i of REG[k].idx) { const m = clamp((ww - thrArr[i]) / 0.12, 0, 1); for (let q = 0; q < 3; q++) col[i * 3 + q] = baseCol[i * 3 + q] + (altCol[i * 3 + q] - baseCol[i * 3 + q]) * m; } } earthGeo.attributes.color.needsUpdate = true; }
// spin arrows around the equator (clockwise seen from the north = backwards)
const spinRing = new THREE.Group(); earthG.add(spinRing); { const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.4), transparent: true });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ER * 1.18, 0.06, 6, 120), tm); ring.rotation.x = Math.PI / 2; spinRing.add(ring);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const cn = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 10), tm); cn.position.set(Math.cos(a) * ER * 1.18, 0, -Math.sin(a) * ER * 1.18); cn.lookAt(V3(Math.cos(a - 0.1) * ER * 1.18, 0, -Math.sin(a - 0.1) * ER * 1.18)); cn.rotateX(Math.PI / 2); spinRing.add(cn); } }
// winds: arrows riding the mid-latitude bands, flowing WEST (they flip with the spin)
const WIND_N = 260; const windMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.6, 5).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.0), transparent: true, opacity: 0.9 }), WIND_N); windMesh.frustumCulled = false; earthG.add(windMesh);
const WIND = Array.from({ length: WIND_N }, (_, i) => ({ lat: (i % 2 ? 1 : -1) * R(30, 58), lon0: R(-180, 180), sp: R(18, 30), ph: R(0, 1) }));
const _o = new THREE.Object3D();
// the plane NYC -> LA with a contrail; the hurricane (spins clockwise); the Gulf Stream; the rocket from California heading west
const plane = new THREE.Group(); { const m = M('#f4f6fa', { roughness: 0.4 }); bx(0.05, 0.05, 0.36, m, 0, 0, 0, plane); bx(0.34, 0.012, 0.08, m, 0, 0, 0.02, plane); bx(0.12, 0.012, 0.05, m, 0, 0, 0.16, plane); bx(0.012, 0.07, 0.05, m, 0, 0.035, 0.16, plane); } earthG.add(plane);
const NYC = [40.71, -74.0], LA = [34.05, -118.24];
const gcPoint = (u, lift = 0.35) => { const a = ll(NYC[0], NYC[1], 1), b = ll(LA[0], LA[1], 1); const om = a.angleTo(b); const p = a.clone().multiplyScalar(Math.sin((1 - u) * om) / Math.sin(om)).add(b.clone().multiplyScalar(Math.sin(u * om) / Math.sin(om))); return p.normalize().multiplyScalar(ER + lift * Math.sin(Math.PI * u) + 0.08); };
const spiralTex = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 260; i++) { const k = i / 260, a = arm * Math.PI / 2 + k * 7.5, r = 14 + k * 230; const x = Math.cos(a) * r, y = Math.sin(a) * r, s = 10 + 26 * k;
  const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - k * 0.6)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } }, null);
const hurr = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshStandardMaterial({ map: spiralTex, transparent: true, depthWrite: false, roughness: 1 })); const hurrG = new THREE.Group(); hurrG.add(hurr); earthG.add(hurrG);
{ const pos = ll(26, -62, ER * 1.02); hurrG.position.copy(pos); hurrG.quaternion.setFromUnitVectors(V3(0, 0, 1), pos.clone().normalize()); }
const GULF = new THREE.CatmullRomCurve3([[24.5, -81], [29, -79.6], [34, -75.5], [38, -70], [41, -60], [44, -47], [48, -33], [52, -20], [56, -10], [60, -4]].map(([a, b]) => ll(a, b, ER * 1.006)));
const gulfMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.35), transparent: true, opacity: 0 }); const gulf = new THREE.Mesh(new THREE.TubeGeometry(GULF, 160, 0.07, 6, false), gulfMat); earthG.add(gulf);
const PACI = new THREE.CatmullRomCurve3([[30, 135], [35, 145], [40, 160], [44, 175], [48, -170], [52, -155], [56, -145]].map(([a, b]) => ll(a, b, ER * 1.006)));
const paciMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.35), transparent: true, opacity: 0 }); earthG.add(new THREE.Mesh(new THREE.TubeGeometry(PACI, 120, 0.07, 6, false), paciMat));
const rocket = new THREE.Group(); { bx(0.05, 0.3, 0.05, '#f2f2f2', 0, 0.15, 0, rocket); const nc = mesh(new THREE.ConeGeometry(0.036, 0.09, 8), M('#d8d8d8')); nc.position.y = 0.345; rocket.add(nc); const fl = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 0.8) })); fl.rotation.x = Math.PI; fl.position.y = -0.08; rocket.add(fl); }
earthG.add(rocket); const VAND = [34.7, -120.6];
const ROCK = t => { const u = clamp((t - (ROCKET + 0.8)) / 4.5, 0, 1); const up = ll(VAND[0], VAND[1], 1); const alt = 0.05 + 3.2 * Math.pow(u, 1.5); const lon = VAND[1] - 26 * Math.pow(u, 1.8); const lat = VAND[0] - 6 * Math.pow(u, 1.8); return ll(lat, lon, ER + alt); };
const gSmoke = makeSmoke(space, 1600);
// Earth spin angle (retrograde = decreasing). Effective world longitude = lon + rot; the Sun sits at world lon 0 => dawn at effective lon +90
const ROT0 = 300 * Math.PI / 180;
const rotAt = t => { const d2r = Math.PI / 180;
  if (t < ZONES) return lerp(ROT0, 214 * d2r, ease(clamp((t - SPIN + 0.4) / (ZONES - SPIN + 0.4), 0, 1)));
  if (t < WINDS) return lerp(214 * d2r, 158 * d2r, clamp((t - ZONES) / (WINDS - ZONES), 0, 1));
  return 158 * d2r - (t - WINDS) * 1.2 * d2r; };
