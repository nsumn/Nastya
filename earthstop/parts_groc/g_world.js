// =================== THE STREET (meters; x → right, z → toward the street): a brick house with a porch (2 steps) and a panelled red door, the driveway with
// an SUV (hatch up, groceries inside), the front walk, lawns + hedges, a neighbor's house with two neighbors who stare, trees, fence, mailbox, lamps, street.
// Look: textured materials (brick, paving, shingles, grass) with bump maps, bevelled edges everywhere, soft sun + ambient occlusion (GTAO, in g_main) ===================
const STYLE = new URLSearchParams(location.search).get('style') || 'lowpoly';   // 'lowpoly' (faceted, golden hour) | 'clay' (soft matte miniature) | 'smooth' (textured; too close to the reference channel)
const LOW = STYLE === 'lowpoly', CLAY = STYLE === 'clay';
const st = new THREE.Scene(); const stCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 300);
{ const skyT = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); if (LOW) { gr.addColorStop(0, '#5a8ed0'); gr.addColorStop(0.55, '#b8cce0'); gr.addColorStop(1, '#ffd8b4'); } else if (CLAY) { gr.addColorStop(0, '#8cc0ec'); gr.addColorStop(1, '#f4e8dc'); } else { gr.addColorStop(0, '#4f8fd8'); gr.addColorStop(0.5, '#9cc8f0'); gr.addColorStop(1, '#e6f0f8'); } g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  st.add(new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false }))); }
st.fog = new THREE.Fog(LOW ? 0xf4dcc4 : CLAY ? 0xf0e8de : 0xdfeaf4, LOW ? 35 : 50, 150);
st.add(LOW ? new THREE.HemisphereLight(0xdfe6ff, 0x8a6a4a, 1.0) : CLAY ? new THREE.HemisphereLight(0xfff4ea, 0x9a8a6a, 1.35) : new THREE.HemisphereLight(0xe8f2ff, 0x7a8a5a, 1.15));
const stSun = new THREE.DirectionalLight(LOW ? 0xffcf9a : CLAY ? 0xfff2e4 : 0xfff0dc, LOW ? 2.8 : CLAY ? 1.9 : 2.4); if (LOW) stSun.position.set(12, 7, 8); else stSun.position.set(8, 13, 9); stSun.castShadow = true; stSun.shadow.mapSize.set(4096, 4096); stSun.shadow.bias = -0.0003; stSun.shadow.normalBias = 0.02;
Object.assign(stSun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 45 }); st.add(stSun, stSun.target);
const camKey = new THREE.PointLight(0xfff0e0, 0.9, 7, 1.3); stCam.add(camKey); st.add(stCam);   // soft fill riding with the camera
const PORCH_Y = 0.54, STEP = [[-4.4, -4.08, 0.36], [-4.08, -3.76, 0.18]];   // [z0, z1, top]: deck at z -6..-4.4
// ---- texture kit: a colour map + a matching bump map from the same drawing ----
function texPair(w, h, draw, repeat) { const mk = (bump) => canvasTex(w, h, (g, W_, H_) => draw(g, W_, H_, bump), repeat); const map = mk(false), bump = mk(true); bump.colorSpace = THREE.NoColorSpace; return { map, bump }; }
const noise = (g, w, h, n, cols, s = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(mr() * cols.length) | 0]; g.fillRect(mr() * w, mr() * h, 1 + mr() * s, 1 + mr() * s); } };
const mr = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();   // deterministic textures / scatter
const BRICK = texPair(512, 512, (g, w, h, bump) => { g.fillStyle = bump ? '#202020' : '#d8d0c4'; g.fillRect(0, 0, w, h); const bw = 64, bh = 24;
  for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0) + 2, y = r * bh + 2;
    g.fillStyle = bump ? `rgb(${200 + (mr() * 40 | 0)},${200},${200})` : ['#a8503a', '#9a4632', '#b25a40', '#8e4030', '#a24c38', '#b86448'][(mr() * 6) | 0]; g.fillRect(x, y, bw - 4, bh - 4);
    if (!bump) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x, y + bh - 9, bw - 4, 5); } } if (!bump) noise(g, w, h, 2500, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.07)']); }, [3, 3]);
const PAVE = texPair(512, 512, (g, w, h, bump) => { g.fillStyle = bump ? '#303030' : '#9a9a98'; g.fillRect(0, 0, w, h); const s = 128;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = mr(); g.fillStyle = bump ? '#d8d8d8' : `rgb(${196 + v * 22 | 0},${194 + v * 22 | 0},${188 + v * 22 | 0})`; g.fillRect(c * s + 3, r * s + 3, s - 6, s - 6); }
  if (!bump) noise(g, w, h, 5000, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.06)', 'rgba(120,110,90,0.06)']); }, [1, 1]);
const ASPH = texPair(256, 256, (g, w, h, bump) => { g.fillStyle = bump ? '#808080' : '#55575c'; g.fillRect(0, 0, w, h); noise(g, w, h, 9000, bump ? ['#606060', '#a0a0a0'] : ['#4a4c50', '#616368', '#6a6c70', '#45474b'], 2); }, [1, 1]);
const GRASS = texPair(256, 256, (g, w, h, bump) => { g.fillStyle = bump ? '#808080' : '#6aac4c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const x = mr() * w, y = mr() * h; g.strokeStyle = bump ? (mr() > 0.5 ? '#b0b0b0' : '#505050') : ['#5a9c40', '#78ba56', '#4e8e3a', '#86c462', '#64a648'][(mr() * 5) | 0]; g.beginPath(); g.moveTo(x, y); g.lineTo(x + mr() * 2 - 1, y - 3 - mr() * 3); g.stroke(); } }, [1, 1]);
const SHING = texPair(256, 256, (g, w, h, bump) => { g.fillStyle = bump ? '#202020' : '#3e4048'; g.fillRect(0, 0, w, h); const bw = 32, bh = 20;
  for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { const v = mr(); g.fillStyle = bump ? '#c8c8c8' : `rgb(${70 + v * 20 | 0},${72 + v * 20 | 0},${80 + v * 20 | 0})`; g.fillRect(c * bw + (r % 2 ? bw / 2 : 0) + 1, r * bh + 1, bw - 2, bh - 3); } }, [5, 3]);
const SIDING = texPair(256, 256, (g, w, h, bump) => { for (let y = 0; y < h; y += 16) { g.fillStyle = bump ? '#c0c0c0' : '#e9e3d4'; g.fillRect(0, y, w, 15); g.fillStyle = bump ? '#303030' : '#c9c1ae'; g.fillRect(0, y + 14, w, 2); } }, [5, 3]);
const FLAT = new Map(); const flatCol = { BRICK: LOW ? '#c2674a' : '#e0907a', PAVE: LOW ? '#dcd4c6' : '#efe6d6', ASPH: LOW ? '#5c5e66' : '#7a7c84', GRASS: LOW ? '#7cbf5a' : '#94cc72', SHING: LOW ? '#4c5060' : '#8a6a6a', SIDING: '#b8d4e8' };
const tex = (T, rx, ry, extra = {}) => { if (!(LOW || CLAY)) return texSmooth(T, rx, ry, extra); const key = Object.keys(TEXS).find(k => TEXS[k] === T); const col = extra.color && key !== 'PAVE' && key !== 'BRICK' ? extra.color : flatCol[key];
  return new THREE.MeshStandardMaterial({ color: col, roughness: CLAY ? 1.0 : 0.85, flatShading: LOW }); };
const texSmooth = (T, rx, ry, extra = {}) => { const map = T.map.clone(), bump = T.bump.clone(); for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; }
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.6, roughness: 0.9, ...extra }); };
const TEXS = { BRICK, PAVE, ASPH, GRASS, SHING, SIDING };
// bevelled box (everything gets soft edges, like a modelled set)
const RBG = {};
function rb(w, h, d, mat, x, y, z, par = st, r = 0.04) { const rr = Math.min(r, 0.45 * Math.min(w, h, d)), k = [w, h, d, rr].map(v => v.toFixed(3)).join('_');   // true-size rounded box: the bevel stays r, never stretched
  const m = mesh(RBG[k] || (RBG[k] = new RoundedBoxGeometry(w, h, d, LOW ? 1 : CLAY ? 4 : 2, CLAY ? Math.min(rr * 2.5, 0.45 * Math.min(w, h, d)) : rr)), typeof mat === 'string' ? M(mat, { roughness: 0.75 }) : mat); m.position.set(x, y, z); par.add(m); return m; }
function plane(w, d, mat, x, z, y = 0.01, par = st) { const p = mesh(new THREE.PlaneGeometry(w, d), mat, false, true); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); par.add(p); return p; }
{ // ground: lawn, street + curbs, sidewalk, front walk, driveway
  if (LOW) { const g = new THREE.PlaneGeometry(140, 70, 120, 60).toNonIndexed(), P = g.attributes.position, cols = [], c = new THREE.Color();
    for (let i = 0; i < P.count; i++) P.setZ(i, 0.05 * (hash(Math.round(P.getX(i) * 10) * 7.1 + Math.round(P.getY(i) * 10) * 3.3) - 0.5));
    for (let i = 0; i < P.count; i += 3) { c.set(['#74b852', '#7cc05a', '#6aae4a', '#84c662'][(hash(i * 0.37) * 4) | 0]); for (let k = 0; k < 3; k++) cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); const lawn = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), false, true); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, -0.02, -6); st.add(lawn); }
  else plane(140, 70, tex(GRASS, 70, 35), 0, -6, 0);
  plane(140, 7, tex(ASPH, 35, 2), 0, 13.6, 0.004); for (let x = -50; x < 50; x += 4) plane(1.8, 0.14, M('#f0e6a6', { roughness: 0.7 }), x, 13.6, 0.008);
  for (const z of [10.0, 7.85]) rb(140, 0.16, 0.22, M('#c8c4bc', { roughness: 0.9 }), 0, 0.06, z, st, 0.03);
  plane(140, 2.0, tex(PAVE, 70, 1), 0, 8.95, 0.015);
  plane(1.4, 12.0, tex(PAVE, 1, 8.5), 0, 1.9, 0.018); plane(3.8, 14.6, tex(PAVE, 2.7, 10.4, { color: '#e8e4dc' }), 5.3, 0.6, 0.016);
  plane(1.4, 12.0, tex(PAVE, 1, 8.5), -13, 2, 0.018); }
{ // the house: brick, white trim, shingle roof, gutters
  const brick = tex(BRICK, 4, 2.2), trim = M('#f6f4ee', { roughness: 0.6 }), roofM = tex(SHING, 4, 2);
  rb(7.4, 3.3, 4.2, brick, -0.4, 1.65, -8.1, st, 0.02); rb(4.6, 2.8, 4.2, tex(BRICK, 2.6, 1.9), 5.3, 1.4, -8.1, st, 0.02);
  for (const [w, x, y, z] of [[7.9, -0.4, 3.3, -8.1], [5.1, 5.3, 2.8, -8.1]]) { for (const s of [-1, 1]) { const r = rb(w, 0.12, 2.75, roofM, x, y + 0.75, z + s * 1.05, st, 0.02); r.rotation.x = s * 0.58; }
    rb(w, 0.12, 0.14, trim, x, y + 0.02, -5.95, st, 0.04); rb(w + 0.1, 0.1, 0.12, M('#d8d8d4'), x, y - 0.04, -5.86, st, 0.03); }
  rb(7.45, 0.16, 0.1, trim, -0.4, 0.08, -5.98, st, 0.03);
  // windows: white frame, sill, mullions, glass with a sky reflection, curtains
  const glass = new THREE.MeshStandardMaterial({ color: '#8ab4d8', roughness: 0.08, metalness: 0.5, emissive: '#2a4258', emissiveIntensity: 0.35 });
  for (const [x, y, w, h] of [[-3.1, 1.85, 1.0, 1.2], [-1.8, 1.85, 1.0, 1.2], [1.4, 1.85, 1.0, 1.2], [2.55, 1.85, 0.7, 1.2]]) {
    rb(w + 0.16, h + 0.16, 0.1, trim, x, y, -5.96, st, 0.03); rb(w, h, 0.05, glass, x, y, -5.93, st, 0.01); rb(w + 0.3, 0.07, 0.2, trim, x, y - h / 2 - 0.1, -5.88, st, 0.02);
    rb(0.05, h, 0.06, trim, x, y, -5.9, st, 0.01); rb(w, 0.05, 0.06, trim, x, y + 0.08, -5.9, st, 0.01); for (const s of [-1, 1]) rb(w * 0.22, h * 0.9, 0.02, M('#e8d8b8'), x + s * w * 0.36, y + 0.02, -5.95, st, 0.005); }
  // the front door: frame, 6 panels, knocker plate, lamp, house number, mat
  rb(1.36, 2.42, 0.12, trim, 0, PORCH_Y + 1.18, -5.97, st, 0.03); const dm = M('#a8302c', { roughness: 0.45 });
  rb(1.08, 2.2, 0.08, dm, 0, PORCH_Y + 1.1, -5.92, st, 0.02); for (let r = 0; r < 3; r++) for (const s of [-1, 1]) rb(0.36, r === 0 ? 0.44 : 0.6, 0.03, M('#922824', { roughness: 0.5 }), s * 0.24, PORCH_Y + 0.42 + r * 0.66 + (r === 0 ? -0.06 : 0), -5.875, st, 0.012);
  rb(0.24, 0.06, 0.12, M('#2a2a2e'), 0.95, PORCH_Y + 1.8, -5.9, st, 0.02); const lamp = mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 8), new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffd890', emissiveIntensity: 0.6 })); lamp.position.set(0.95, PORCH_Y + 1.65, -5.84); st.add(lamp);
  rb(0.28, 0.14, 0.03, M('#2a2a2e'), -0.95, PORCH_Y + 1.85, -5.9, st, 0.01); rb(0.9, 0.02, 0.55, M('#7a5a3a', { roughness: 1 }), 0, PORCH_Y + 0.01, -5.5, st, 0.01);
  // porch: paved deck + 2 steps with nosings, columns, a little roof
  const pv = tex(PAVE, 2, 1.1, { color: '#e8e4dc' }); rb(3.1, PORCH_Y, 1.65, pv, 0, PORCH_Y / 2, -5.2, st, 0.03); for (const [z0, z1, top] of STEP) rb(1.7, top, z1 - z0 + 0.02, pv, 0, top / 2, (z0 + z1) / 2, st, 0.025);
  for (const x of [-1.42, 1.42]) { rb(0.16, 2.45, 0.16, trim, x, PORCH_Y + 1.22, -4.52, st, 0.03); rb(0.24, 0.12, 0.24, trim, x, PORCH_Y + 0.06, -4.52, st, 0.03); }
  rb(3.3, 0.16, 1.95, trim, 0, PORCH_Y + 2.5, -5.1, st, 0.04); { const pr = rb(3.4, 0.1, 2.2, roofM, 0, PORCH_Y + 2.72, -5.05, st, 0.02); pr.rotation.x = 0.18; }
  // garage door with panels + a wall lamp
  rb(3.6, 2.35, 0.08, trim, 5.3, 1.17, -5.96, st, 0.02); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rb(0.78, 0.46, 0.03, M('#eceae2'), 3.97 + c * 0.89, 0.3 + r * 0.57, -5.91, st, 0.015); }
{ // greenery: hedges in front of the house (many leafy lumps), trees, flowers; a white picket fence; mailbox; street lamps
  const leaf = [M('#3f8a3a', { roughness: 0.85 }), M('#4b9a42', { roughness: 0.85 }), M('#36803a', { roughness: 0.85 }), M('#56a64a', { roughness: 0.85 })], LG = new THREE.IcosahedronGeometry(1, LOW ? 0 : CLAY ? 3 : 1);
  const hedge = (x0, x1, z, h = 0.75) => { for (let x = x0; x <= x1; x += 0.22) for (let k = 0; k < 3; k++) { const m = mesh(LG, leaf[(mr() * 4) | 0]); const s = 0.22 + mr() * 0.1; m.scale.setScalar(s); m.position.set(x + mr() * 0.1, h * (0.35 + 0.33 * k) + mr() * 0.08, z + (mr() - 0.5) * 0.35); st.add(m); } };
  hedge(-3.9, -1.7, -5.45); hedge(1.7, 3.0, -5.45); hedge(-17.2, -14.0, -5.45); hedge(-12.4, -10.8, -5.45);
  const tree = (x, z, s = 1) => { const tr = mesh(new THREE.CylinderGeometry(0.11 * s, 0.17 * s, 2.0 * s, 9), M('#6e4e34', { roughness: 0.9 })); tr.position.set(x, 1.0 * s, z); st.add(tr);
    for (let k = 0; k < 9; k++) { const a = k * 2.4, r = k ? 0.75 * s : 0, c = mesh(LG, leaf[k % 4]); c.scale.setScalar((0.75 + 0.25 * Math.sin(k * 3)) * s); c.position.set(x + Math.cos(a) * r, (2.5 + 0.45 * Math.sin(k * 1.7) + (k ? 0 : 0.5)) * s, z + Math.sin(a) * r * 0.8); st.add(c); } };
  tree(-6.5, 3.5, 1.15); tree(9.8, 2.0, 1.0); tree(-2.9, 7.2, 0.85); tree(12.5, -4, 1.3); tree(-17, -1.5, 1.2); tree(-21, 6, 1.1); tree(16, 6.5, 1.0);
  const fl = ['#f06a8a', '#f8d040', '#ffffff', '#b87ae8'];
  for (let i = 0; i < 40; i++) { const f = mesh(new THREE.IcosahedronGeometry(0.05, 0), M(fl[i % 4], { roughness: 0.6 })); f.position.set(-3.8 + mr() * 2.0, 0.22 + mr() * 0.1, -4.9 + mr() * 0.4); st.add(f); }
  for (let x = -9.6; x <= -2.0; x += 0.24) rb(0.08, 0.9, 0.04, M('#f8f6f0', { roughness: 0.6 }), x, 0.45, -1.2, st, 0.015);
  for (const y of [0.3, 0.7]) rb(7.7, 0.07, 0.03, M('#f0eee8'), -5.8, y, -1.17, st, 0.01);
  rb(0.1, 1.0, 0.1, M('#4a3a2e'), 2.4, 0.5, 8.0, st, 0.02); rb(0.24, 0.26, 0.48, M('#2a3a5a', { roughness: 0.4, metalness: 0.3 }), 2.4, 1.1, 8.0, st, 0.08); rb(0.03, 0.14, 0.08, M('#e83a3a'), 2.55, 1.2, 7.9, st, 0.01);
  for (const x of [-9, 9]) { const p = mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8), M('#2e3034', { roughness: 0.5, metalness: 0.4 })); p.position.set(x, 2.1, 7.6); st.add(p); rb(0.5, 0.16, 0.28, M('#2e3034'), x, 4.2, 7.75, st, 0.04); } }
{ // the neighbor's house (blue siding)
  const sid = tex(SIDING, 5, 2.5, { color: '#b8d4e8' }); rb(7.2, 3.1, 5, sid, -14, 1.55, -8.6, st, 0.02);
  for (const s of [-1, 1]) { const r = rb(7.7, 0.12, 3.2, tex(SHING, 4, 2, { color: '#8a6a5a' }), -14, 3.85, -8.6 + s * 1.25, st, 0.02); r.rotation.x = s * 0.6; }
  rb(1.2, 2.3, 0.1, M('#f6f4ee'), -13, 1.15, -6.06, st, 0.03); rb(0.98, 2.12, 0.06, M('#2f5a8a', { roughness: 0.5 }), -13, 1.06, -6.0, st, 0.02);
  for (const x of [-16, -11.4]) { rb(1.16, 1.16, 0.1, M('#f6f4ee'), x, 1.8, -6.06, st, 0.03); rb(1.0, 1.0, 0.05, new THREE.MeshStandardMaterial({ color: '#8ab4d8', roughness: 0.08, metalness: 0.5, emissive: '#2a4258', emissiveIntensity: 0.35 }), x, 1.8, -6.02, st, 0.01); } }
// ---- the SUV (rounded body, rear to the street, hatch up) + the keys left on the driver's seat ----
const car = new THREE.Group(); car.position.set(5.3, 0, 1.2); st.add(car);
{ const paint = M('#3a4e6a', { roughness: 0.28, metalness: 0.45 }), dark = M('#1c1e24', { roughness: 0.6 }), glass = new THREE.MeshStandardMaterial({ color: '#1e2a36', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55 }), chrome = M('#d8dce2', { roughness: 0.2, metalness: 0.9 });
  rb(1.95, 0.8, 4.6, paint, 0, 0.78, 0, car, 0.18); rb(1.8, 0.65, 2.95, paint, 0, 1.45, 0.35, car, 0.16); rb(1.84, 0.5, 2.7, glass, 0, 1.47, 0.35, car, 0.12);
  rb(1.97, 0.14, 4.62, dark, 0, 0.42, 0, car, 0.06);
  for (const [x, z] of [[-0.86, -1.45], [0.86, -1.45], [-0.86, 1.45], [0.86, 1.45]]) { const w = mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.26, 24), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.37, z); car.add(w);
    const rim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.27, 12), chrome); rim.rotation.z = Math.PI / 2; rim.position.set(x, 0.37, z); car.add(rim); }
  const hatch = new THREE.Group(); hatch.position.set(0, 1.75, 1.8); car.add(hatch); hatch.rotation.x = -1.25; rb(1.8, 0.07, 1.12, paint, 0, 0, 0.55, hatch, 0.03); rb(1.5, 0.05, 0.7, glass, 0, -0.04, 0.5, hatch, 0.02);
  rb(1.72, 0.05, 1.3, '#2a2c32', 0, 0.85, 1.55, car, 0.02);
  for (const x of [-0.75, 0.75]) { rb(0.32, 0.14, 0.06, new THREE.MeshStandardMaterial({ color: '#e83a3a', emissive: '#7a0a0a' }), x, 1.0, 2.29, car, 0.02); rb(0.36, 0.12, 0.06, new THREE.MeshStandardMaterial({ color: '#f8f8f0', emissive: '#a8a890' }), x, 0.92, -2.29, car, 0.02); }
  rb(1.0, 0.18, 0.05, chrome, 0, 0.7, -2.3, car, 0.02); }
const carKeys = new THREE.Group(); { const r = mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 14), M('#d8d8e0', { metalness: 0.9, roughness: 0.2 })); carKeys.add(r);
  for (const [dx, a] of [[0.03, 0.4], [-0.02, -0.5]]) { const k = bx(0.018, 0.07, 0.005, M('#d8c070', { metalness: 0.9, roughness: 0.25 }), dx, -0.05, 0, carKeys); k.rotation.z = a; }
  bx(0.05, 0.035, 0.012, "#e83a3a", 0, 0.04, 0, carKeys); }
carKeys.position.set(4.85, 1.225, 1.25); carKeys.rotation.x = -Math.PI / 2; st.add(carKeys);
rb(0.6, 0.12, 0.6, '#3a3a42', -0.45, 1.14, 0.05, car, 0.05); rb(0.6, 0.6, 0.12, '#3a3a42', -0.45, 1.45, 0.4, car, 0.05); { const sw = mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 20), M('#25272c')); sw.position.set(-0.45, 1.45, -0.55); sw.rotation.x = -0.4; car.add(sw); }   // driver's seat + wheel
// style pass over everything built so far (the set + the car): faceted shading for low-poly, fully matte for clay
st.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial) { if (LOW) o.material.flatShading = true; if (CLAY) { o.material.roughness = Math.max(o.material.roughness, 0.92); o.material.metalness = 0; } o.material.needsUpdate = true; } });
// ---- the cast: you (the approved low-poly human) + two neighbors ----
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 }); st.add(hero.outer);
const nb1 = makeBlock({ head: 'human', body: 'human', skin: '#d8a47e', hair: '#8a8a8a', top: '#c8503a', jeans: false, bottom: '#6a6458', shoe: '#5a3a2a', hairStyle: 'short', headS: 0.88 }); st.add(nb1.outer);
const nb2 = makeBlock({ head: 'human', body: 'human', skin: '#f0c8a4', hair: '#6a3a1e', top: '#5aa070', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'bangs', headS: 0.85, h: 0.95 }); st.add(nb2.outer);
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.elbows.forEach(e => e.rotation.set(-0.15, 0, 0)); }
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, 0.95 + y, z); P.outer.rotation.y = ry; }
// walk P from A to B (x, z) between t0 and t1; facing the direction of travel
function walk(P, A, B, t0, t1, t, y0 = 0, y1 = 0) { const k = clamp((t - t0) / (t1 - t0), 0, 1), x = lerp(A[0], B[0], k), z = lerp(A[1], B[1], k);
  place(P, x, z, Math.atan2(B[0] - A[0], B[1] - A[1]), lerp(y0, y1, k)); if (k > 0 && k < 1) poseWalk(P, (t - t0) * 9, 1); }
// ---- grocery bags: a pivot at the handle top, the bag hangs below; a mix of white plastic and brown paper, things sticking out ----
const BAGS = Array.from({ length: 12 }, (_, i) => { const g = new THREE.Group(), paper = i % 3 === 1, body = new THREE.Group(); g.add(body); body.position.y = -0.27;
  const bm = paper ? M('#b88a5a', { roughness: 1 }) : M(i % 3 ? '#f4f4f0' : '#e8eef4', { roughness: 0.7 });
  const b = mesh(new RoundedBoxGeometry(0.3, 0.34, 0.17, 2, 0.05), bm); body.add(b);
  for (const s of [-1, 1]) { const hnd = mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 12, Math.PI), bm); hnd.position.set(s * 0.06, 0.17, 0); body.add(hnd); }
  const stuff = [['#f0c060', 0.04, 0.22, 0.04], ['#4aa04a', 0.07, 0.12, 0.07], ['#e8463a', 0.08, 0.08, 0.08], ['#f4f4f8', 0.1, 0.16, 0.06], ['#3a6ad8', 0.12, 0.1, 0.05]];
  for (let k = 0; k < 2; k++) { const [c, w, h, d] = stuff[(i * 2 + k) % stuff.length]; const s = bx(w, h, d, c, -0.06 + 0.12 * k, 0.17 + h * 0.3, 0, body); s.rotation.z = 0.2 * (k ? 1 : -1); }
  g.userData.ph = hash(i * 3.7) * 6; st.add(g); return g; });
const EGG_BAG = 4;   // this one carries the eggs
// hang a bag from a world point with a pendulum swing (amp in radians)
function hang(b, p, t, amp = 0.08, rate = 3) { b.visible = true; b.position.copy(p); b.rotation.set(amp * Math.sin(t * rate + b.userData.ph), 0, amp * 0.7 * Math.cos(t * rate * 0.9 + b.userData.ph)); }
// the eggs: a carton + 6 eggs that fly out and splat
const eggs = Array.from({ length: 6 }, () => { const e = mesh(new THREE.SphereGeometry(0.05, 10, 8), M('#f8f0e0', { roughness: 0.5 })); e.scale.y = 1.25; st.add(e); return e; });
const splats = Array.from({ length: 6 }, () => { const s = new THREE.Group(); const w = mesh(new THREE.CircleGeometry(0.14, 12), M('#fafaf0', { roughness: 0.4 }), false, true); w.rotation.x = -Math.PI / 2; s.add(w);
  const y = mesh(new THREE.SphereGeometry(0.045, 10, 6), M('#f8b820', { roughness: 0.3, emissive: '#5a3a00' })); y.scale.y = 0.4; y.position.y = 0.01; s.add(y); st.add(s); return s; });
const eggDrop = mesh(new THREE.ConeGeometry(0.02, 0.06, 6), M('#f8c040')); st.add(eggDrop);
