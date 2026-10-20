// =================== BACKGROUND (km): Earth 400 km below, stars, the Sun ===================
const bg = new THREE.Scene(); bg.background = new THREE.Color('#020308');
const bgCam = new THREE.PerspectiveCamera(50, W / H, 5, 60000);
const RE = 6371, ALT = 420;
bg.add(new THREE.AmbientLight(0x404a60, 0.6)); const bgSun = new THREE.DirectionalLight(0xfff4e8, 3.2); bgSun.position.set(3000, 2600, 5000); bg.add(bgSun);
const SUN_DIR = new THREE.Vector3(3000, 2600, 5000).normalize();
{ const n = 5000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(50000); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false }))); }
// the sky: a Milky Way band crossing the opening view (yaw pi, looking up), coloured stars, a low-poly Moon
const MW_N = (() => { const d = V3(0, Math.sin(0.5), -Math.cos(0.5)); return d.clone().cross(V3(1, 0.55, 0.15)).normalize(); })();
const MW_Q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), MW_N);
{ const n = 26000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const lon = R(0, Math.PI * 2), g = (R(-1, 1) + R(-1, 1) + R(-1, 1)) / 3, lat = g * 0.32 * (0.6 + 0.4 * Math.abs(Math.sin(lon * 1.7)));
    const v = V3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).applyQuaternion(MW_Q).multiplyScalar(48000); pos.set([v.x, v.y, v.z], i * 3);
    const core = Math.exp(-Math.pow(Math.atan2(Math.sin(lon - 0.6), Math.cos(lon - 0.6)) / 0.7, 2)); c.setHSL(lerp(0.6, 0.1, core * rnd()), R(0.2, 0.6), R(0.55, 0.95)).multiplyScalar(R(0.5, 1.4)); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  bg.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })));
  const nb = 420, pb = new Float32Array(nb * 3), cb = new Float32Array(nb * 3);
  for (let i = 0; i < nb; i++) { const v = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(47000); pb.set([v.x, v.y, v.z], i * 3); c.set(pick(['#ffffff', '#cfe0ff', '#ffe6c0', '#ffd0a0', '#bcd4ff'])).multiplyScalar(R(1.2, 3.0)); cb.set([c.r, c.g, c.b], i * 3); }
  const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.BufferAttribute(pb, 3)); gb.setAttribute('color', new THREE.BufferAttribute(cb, 3));
  bg.add(new THREE.Points(gb, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })));
  const glow = canvasTex(2048, 1024, (g2, w, h) => { g2.fillStyle = '#000'; g2.fillRect(0, 0, w, h); g2.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5000; i++) { const x = R(0, w), core = Math.exp(-Math.pow(((x / w * 6.283 - 0.6 + 9.42) % 6.283 - 3.14) / 0.8, 2)); const y = h / 2 + (R(-1, 1) + R(-1, 1) + R(-1, 1)) * h * 0.05 * (1 + core * 0.8), r = R(10, 46) * (1 + core);
        const gr = g2.createRadialGradient(x, y, 0, x, y, r); const hue = core > 0.4 && rnd() < 0.6 ? `rgba(255,${Math.floor(R(170, 215))},${Math.floor(R(120, 170))},` : rnd() < 0.18 ? 'rgba(200,120,190,' : 'rgba(150,175,255,';
        gr.addColorStop(0, hue + (0.05 + 0.07 * core) + ')'); gr.addColorStop(1, hue + '0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); }
      g2.globalCompositeOperation = 'multiply'; for (let i = 0; i < 900; i++) { const x = R(0, w), y = h / 2 + R(-1, 1) * h * 0.018 + Math.sin(x / w * 25) * h * 0.008, r = R(6, 22); const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(40,30,40,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); } });
  const band = new THREE.Mesh(new THREE.SphereGeometry(49000, 64, 32), new THREE.MeshBasicMaterial({ map: glow, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, color: new THREE.Color(1.6, 1.6, 1.6) }));
  band.quaternion.copy(MW_Q); bg.add(band); }
const moon = new THREE.Group(); { const mg = new THREE.IcosahedronGeometry(1, 3); const p = mg.attributes.position, mc = new Float32Array(p.count * 3), c = new THREE.Color(), v = new THREE.Vector3();
  const craters = Array.from({ length: 14 }, () => [V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), R(0.15, 0.45)]);
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize(); let d = 0.78 + R(-0.05, 0.05); for (const [cn, r] of craters) if (v.distanceTo(cn) < r) d -= 0.22; c.setRGB(d, d, d * 0.98); for (let k = 0; k < 3; k++) mc.set([c.r, c.g, c.b], (f + k) * 3); }
  mg.setAttribute('color', new THREE.BufferAttribute(mc, 3)); const mm = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })); mm.scale.setScalar(620); moon.add(mm);
  moon.position.copy(V3(0.42, Math.sin(0.62), -Math.cos(0.62)).normalize().multiplyScalar(30000)); bg.add(moon); }
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.6, 5), fog: false })); sunDisc.position.copy(SUN_DIR).multiplyScalar(45000); sunDisc.lookAt(0, 0, 0); bg.add(sunDisc);
const earth = new THREE.Group(); const EA = 0.62; earth.position.set(0, -(RE + ALT) * Math.cos(EA), -(RE + ALT) * Math.sin(EA)); bg.add(earth);
async function buildEarth() {
  const topo = await (await fetch('node_modules/world-atlas/countries-50m.json')).json();
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  for (const f of topojson.feature(topo, topo.objects.countries).features) { if (!f.geometry) continue; const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const poly of polys) for (const ring of poly) { let prev = ring[0][0], off = 0; const pts = []; for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
      for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); } } }
  const img = g.getImageData(0, 0, MW, MH).data; const land = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const n0 = V3(0, Math.cos(EA), Math.sin(EA)).normalize(), la0 = (VAR === 2 ? 34 : 35) * Math.PI / 180, lo0 = (VAR === 2 ? -79 : -62) * Math.PI / 180;   // v2: the US East Coast under the station
  const EQ = new THREE.Quaternion().setFromUnitVectors(n0, V3(Math.cos(la0) * Math.cos(lo0), Math.sin(la0), -Math.cos(la0) * Math.sin(lo0)));
  const geo = new THREE.IcosahedronGeometry(RE, 90); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new THREE.Color(), v = new THREE.Vector3(), w = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) { v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(w.fromBufferAttribute(p, f + k)); v.normalize();
    // our view: the camera looks north-east over the Atlantic toward the US east coast — rotate the lookup so that region faces up
    const q = v.clone().applyQuaternion(EQ);
    const lat = Math.asin(q.y) * 180 / Math.PI, lon = Math.atan2(-q.z, q.x) * 180 / Math.PI, al = Math.abs(lat), j = rnd() * 0.06 - 0.03;
    if (lat < -62 || lat > 78) c.set('#eef3f6'); else if (land(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if (al > 14 && al < 34 && rnd() < 0.7) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.multiplyScalar(0.85); }
    else c.set(al > 45 ? '#24506e' : '#1f5f92'); c.offsetHSL(0, 0, j); for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); earth.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 })));
  const cl = canvasTex(2048, 1024, (g2, w2, h2) => { g2.clearRect(0, 0, w2, h2); for (let i = 0; i < 700; i++) { const x = R(0, w2), y = R(h2 * 0.1, h2 * 0.9), r = R(3, 14); const gr = g2.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); } });
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(RE + 8, 128, 96), new THREE.MeshStandardMaterial({ map: cl, transparent: true, depthWrite: false, opacity: 0.55, roughness: 1 })));
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(RE + 90, 128, 96), new THREE.ShaderMaterial({ transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uSun: { value: SUN_DIR } }, vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vNw; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vNw = normalize(mat3(modelMatrix)*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vV; varying vec3 vNw; void main(){ float g = 1.0 - abs(dot(vN, vV)); float s = dot(vNw, uSun);
      float day = smoothstep(-0.35, 0.15, s); float dusk = smoothstep(-0.3, -0.02, s) * (1.0 - smoothstep(0.0, 0.35, s));
      vec3 col = mix(vec3(0.38, 0.64, 1.0), vec3(1.0, 0.5, 0.22), dusk * 0.85);
      float f = pow(g, 9.0) * 1.1 + pow(g, 26.0) * 1.6; gl_FragColor = vec4(col * f * (0.15 + 0.85 * day) + vec3(1.0, 0.45, 0.18) * pow(g, 14.0) * dusk * 1.4, 1.0); }` })));
}
// =================== NEAR (meters): ISS truss + modules + arrays, two astronauts ===================
const near = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 2000);
near.add(new THREE.AmbientLight(0x8a94a8, 1.0)); const nSun = new THREE.DirectionalLight(0xfff4e8, 4.0); nSun.position.copy(SUN_DIR).multiplyScalar(50); nSun.castShadow = true; nSun.shadow.mapSize.set(2048, 2048);
Object.assign(nSun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 120 }); nSun.shadow.bias = -0.0004; nSun.shadow.normalBias = 0.01; near.add(nSun, nSun.target);
const earthShine = new THREE.DirectionalLight(0x6a9ad8, 1.2); earthShine.position.set(0, -30, -40); near.add(earthShine);
const ISS = new THREE.Group(); near.add(ISS);
{ const truss = M('#cfd2d6', { metalness: 0.4, roughness: 0.5 }); bx(60, 1.6, 1.6, truss, 0, 0, -4, ISS); for (let x = -29; x <= 29; x += 2) { const s = bx(0.08, 1.6, 2.3, '#8a8e94', x, 0, -4, ISS); s.rotation.x = 0.78; }
  const mod = (len, r, x, y, z, rx, rz) => { const m = mesh(new THREE.CylinderGeometry(r, r, len, 16), M('#e8e6e0', { roughness: 0.6 })); m.position.set(x, y, z); m.rotation.set(rx || 0, 0, rz || 0); ISS.add(m); for (let k = -1; k <= 1; k += 2) { const b = mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.25, 16), M('#9aa0a8')); b.position.copy(m.position); b.rotation.copy(m.rotation); b.translateY(k * len * 0.42); ISS.add(b); } return m; };
  mod(9, 2.1, 0, -3.2, -4, Math.PI / 2, 0); mod(7, 2.1, 0, -3.2, 4.2, Math.PI / 2, 0); mod(6, 1.9, -5.5, -3.2, 3, 0, Math.PI / 2);
  // the airlock with its hatch (Quest-like) next to the work site
  const al = mesh(new THREE.CylinderGeometry(1.8, 1.8, 4, 16), M('#e8e6e0')); al.rotation.z = Math.PI / 2; al.position.set(4.8, -3.0, 2.0); ISS.add(al);
  const hatch = mesh(new THREE.CircleGeometry(0.75, 20), M('#3a3e46', { metalness: 0.5 })); hatch.position.set(6.82, -3.0, 2.0); hatch.rotation.y = Math.PI / 2; ISS.add(hatch);
  const ring = mesh(new THREE.TorusGeometry(0.8, 0.07, 6, 24), M('#d8b030', { metalness: 0.5 })); ring.position.copy(hatch.position); ring.rotation.y = Math.PI / 2; ISS.add(ring);
  // solar arrays
  const arrT = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#1a2a4a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8a050'; g.lineWidth = 2; for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
  const arrM = new THREE.MeshStandardMaterial({ map: arrT, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const a = mesh(new THREE.PlaneGeometry(11, 34), arrM); a.position.set(sx * 24, 0, -4 + sz * 19); a.rotation.x = -Math.PI / 2; ISS.add(a); bx(0.3, 0.3, 36, '#9a9a9a', sx * 24, 0.05, -4 + sz * 19, ISS); }
  for (let x = -8; x <= 8; x += 2) bx(0.06, 0.06, 1.2, '#e8b030', x, 0.9, -4, ISS); // handrails
  for (const z of [1.55, 2.45]) { bx(3.8, 0.06, 0.06, '#e8b030', 4.8, -1.05, z, ISS); for (let x = 3.1; x <= 6.6; x += 0.7) bx(0.05, 0.16, 0.05, '#e8b030', x, -1.13, z, ISS); }   // rails along the airlock (the tow route)
}
// astronaut builder: white suit, backpack, gloves; helmet = neck ring + clear bubble + gold visor; a cartoon face under the comms cap
function makeAstronaut(withFace) { const A = { g: new THREE.Group() }; const suit = M('#eeeeea', { flatShading: true, roughness: 0.75 }), joint = M('#c8c8c2', { flatShading: true });
  const torso = mesh(new THREE.CapsuleGeometry(0.34, 0.5, 4, 10), suit); torso.position.y = 1.15; torso.scale.set(1.15, 1, 0.85); A.g.add(torso);
  bx(0.62, 0.78, 0.32, suit, 0, 1.22, -0.38, A.g); bx(0.3, 0.2, 0.05, M('#3a5a9a'), 0, 1.25, 0.31, A.g); bx(0.16, 0.08, 0.05, M('#c8302a'), -0.12, 1.42, 0.31, A.g);
  const limb = (x, y, len, r) => { const sh = new THREE.Group(); sh.position.set(x, y, 0); A.g.add(sh); const u = mesh(new THREE.CapsuleGeometry(r, len, 4, 8), suit); u.position.y = -len / 2 - r * 0.4; sh.add(u); const el = new THREE.Group(); el.position.y = -len - r * 0.6; sh.add(el); const lw = mesh(new THREE.CapsuleGeometry(r * 0.92, len * 0.9, 4, 8), suit); lw.position.y = -len * 0.45; el.add(lw); const j = mesh(new THREE.SphereGeometry(r * 1.05, 8, 6), joint); el.add(j); return { sh, el, end: lw }; };
  A.armL = limb(-0.48, 1.48, 0.32, 0.12); A.armR = limb(0.48, 1.48, 0.32, 0.12); A.legL = limb(-0.18, 0.72, 0.38, 0.14); A.legR = limb(0.18, 0.72, 0.38, 0.14);
  for (const a of [A.armL, A.armR]) { const gl = mesh(new THREE.SphereGeometry(0.11, 8, 6), M('#e8e8e2', { flatShading: true })); gl.scale.set(1, 1.2, 0.8); gl.position.y = -0.36; a.el.add(gl); a.glove = gl; }
  for (const l of [A.legL, A.legR]) { const b = bx(0.2, 0.14, 0.32, '#d8d8d2', 0, -0.4, 0.06, l.el); }
  A.head = new THREE.Group(); A.head.position.y = 1.86; A.g.add(A.head);
  const ring = mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 24), M('#c8ccd2', { metalness: 0.5, roughness: 0.3 })); ring.rotation.x = Math.PI / 2; ring.position.y = 1.7; A.g.add(ring);
  if (withFace) { const skin = new THREE.MeshStandardMaterial({ color: '#eebc98', roughness: 0.6, flatShading: true }); A.skin = skin;
    const face = mesh(new THREE.SphereGeometry(0.15, 14, 10), skin); face.scale.set(1, 1.2, 1.05); A.head.add(face); A.face = face;
    const cap = mesh(new THREE.SphereGeometry(0.158, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M('#1c1c20')); cap.scale.set(1, 1.2, 1.05); cap.rotation.x = -0.35; A.head.add(cap);
    const capW = mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0.35, 0.25), M('#f0f0f0')); capW.scale.set(1, 1.2, 1.05); capW.rotation.x = -0.35; A.head.add(capW);
    A.eyes = []; for (const sx of [-0.055, 0.055]) { const e = mesh(new THREE.SphereGeometry(0.026, 10, 8), M('#ffffff', { roughness: 0.2 })); e.position.set(sx, 0.03, 0.135); A.head.add(e); const pu = mesh(new THREE.SphereGeometry(0.013, 8, 6), M('#2a1a10')); pu.position.set(sx, 0.03, 0.158); A.head.add(pu); const lid = mesh(new THREE.SphereGeometry(0.028, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.position.set(sx, 0.031, 0.136); lid.rotation.x = -1.6; A.head.add(lid); A.eyes.push({ e, pu, lid });
      const br = bx(0.05, 0.01, 0.012, '#4a3020', sx, 0.075, 0.148, A.head); }
    const nose = mesh(new THREE.ConeGeometry(0.02, 0.05, 6), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.005, 0.165); A.head.add(nose);
    const mouth = new THREE.Group(); mouth.position.set(0, -0.075, 0.142); A.head.add(mouth); const mo = mesh(new THREE.SphereGeometry(0.035, 12, 8), M('#5a1a1a')); mo.scale.set(1.2, 0.25, 0.4); mouth.add(mo); const tongue = mesh(new THREE.SphereGeometry(0.022, 10, 8), M('#d86a6a')); tongue.scale.set(1.3, 0.4, 0.8); tongue.position.set(0, -0.006, 0.005); mouth.add(tongue);
    A.mouth = mo; A.tongue = tongue; A.bubbles = []; for (let i = 0; i < 26; i++) { const b = mesh(new THREE.SphereGeometry(0.0035, 8, 6), new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7 })); b.position.set(R(-0.022, 0.022), 0, R(0.0, 0.018)); mouth.add(b); A.bubbles.push({ b, ph: R(0, 6), x: b.position.x, z: b.position.z }); } }
  A.helmet = new THREE.Group(); A.head.add(A.helmet);
  const bubble = mesh(new THREE.SphereGeometry(0.27, 24, 18), new THREE.MeshStandardMaterial({ color: '#dfe8f2', transparent: true, opacity: withFace ? 0.18 : 0.35, roughness: 0.05, metalness: 0.2, depthWrite: false })); A.helmet.add(bubble);
  const visor = mesh(new THREE.SphereGeometry(0.275, 24, 18, Math.PI * 0.15, Math.PI * 0.7, 0.35, 1.3), new THREE.MeshStandardMaterial({ color: '#d8a040', metalness: 0.9, roughness: 0.15, transparent: true, opacity: withFace ? 0.0 : 0.92 })); A.helmet.add(visor); A.visor = visor;
  if (!withFace) { const shell = mesh(new THREE.SphereGeometry(0.285, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.32), M('#eeeeea', { flatShading: true })); shell.rotation.x = -0.7; A.helmet.add(shell); }
  for (const sx of [-1, 1]) { const lamp = bx(0.06, 0.05, 0.08, '#cfcfcf', sx * 0.22, 0.12, 0.08, A.helmet); }
  A.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return A; }
const you = makeAstronaut(true); near.add(you.g);
const mate = makeAstronaut(false); near.add(mate.g);
const nearSmoke = makeSmoke(near, 2000);
// POV: the helmet leaves your head and floats on its own; its gold visor works as a mirror (Reflector disc) so you see your own face
near.attach(you.helmet); you.visor.material = new THREE.MeshStandardMaterial({ color: '#d8a040', metalness: 0.9, roughness: 0.15, transparent: true, opacity: 0.35, depthWrite: false });
const shell = mesh(new THREE.SphereGeometry(0.285, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.32), M('#eeeeea', { flatShading: true })); shell.rotation.x = -0.7; you.helmet.add(shell);
const mirror = new Reflector(new THREE.CircleGeometry(0.2, 32), { textureWidth: 1024, textureHeight: 1024, color: 0xf2e2c4, clipBias: 0.003 }); mirror.position.set(0, -0.02, 0.262); mirror.scale.set(1, 0.85, 1); you.helmet.add(mirror);
{ const ob = mirror.onBeforeRender; mirror.onBeforeRender = function (r, s, c) { you.head.visible = true; ob.call(this, r, s, c); you.head.visible = false; }; }
const hatchGlow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.1, 2.8) })); hatchGlow.position.set(6.835, -3.0, 2.0); hatchGlow.rotation.y = Math.PI / 2; near.add(hatchGlow);
