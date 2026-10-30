// =================== HALLOWEEN NIGHT on the groceries street (g_world): moon + stars, warm windows, porch lamp, jack-o'-lanterns, street lamps;
// the street is extended for miles (instanced houses + lamps) so the line of kids can run to the horizon. setEnv(day, season) drives the time-lapse. ===================
for (const o of [nb1, nb2, carKeys, eggDrop, ...BAGS, ...eggs, ...splats]) o.visible = false;
car.traverse(o => { if (o.isGroup && Math.abs(o.rotation.x + 1.25) < 0.01) o.rotation.x = 0; });   // close the SUV hatch
const skyMesh = st.children.find(o => o.isMesh && o.geometry.type === 'SphereGeometry' && o.material.isMeshBasicMaterial);
const nightSky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060a1c'); gr.addColorStop(0.45, '#141c3e'); gr.addColorStop(0.75, '#3a2a58'); gr.addColorStop(0.92, '#6a3a4a'); gr.addColorStop(1, '#8a4a3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const daySky = skyMesh.material.map; skyMesh.material.map = nightSky;
skyMesh.scale.setScalar(20); skyMesh.material.fog = false;   // big enough for the aerial shots
const hemi = st.children.find(o => o.isHemisphereLight);
// clouds off; far hills/tree ring off where the extended street runs (-x)
st.traverse(o => { if (!o.isMesh) return; const m = o.material; if (m && m.emissive && m.emissive.getHexString() === 'f8c0a0') o.visible = false; });
st.traverse(o => { if (o.isMesh && o.position.length() > 45 && o.position.x < -30 && Math.abs(o.position.z) < 45) o.visible = false; });
// windows glow warm (every glass pane of the set shares the blue-glass colour)
const winMats = new Set(); st.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '8ab4d8') winMats.add(o.material); });
winMats.forEach(m => { m.color.set('#2a2018'); m.emissive.set('#ffb25a'); m.emissiveIntensity = 1.6; m.metalness = 0; m.roughness = 0.6; });
// moon + stars (far, fog-free)
const moonS = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.42, 'rgba(255,230,180,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f6eed8'; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(170,160,140,0.45)'; for (const [x, y, r] of [[112, 116, 12], [142, 140, 9], [132, 106, 6], [118, 146, 7]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } }), fog: false, depthWrite: false, transparent: true }));
moonS.position.set(-900, 1100, 1900); moonS.scale.setScalar(520); st.add(moonS);
const stars = (() => { const n = 1500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(R(-1, 1), R(0.12, 1), R(-1, 1)).normalize().multiplyScalar(2800); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#d8e0ff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })); st.add(p); return p; })();
// porch lamp (the one she switches off at the end) + the lamp's emissive shade from g_world
const porchLamp = st.children.find(o => o.isMesh && o.material.emissive && o.material.emissive.getHexString() === 'ffd890');
const porchL = new THREE.PointLight(0xffc070, 9, 11, 1.5); porchL.position.set(0.6, PORCH_Y + 2.1, -4.8); st.add(porchL);
const doorL = new THREE.SpotLight(0xffd8a0, 30, 16, 0.75, 0.6, 1.4); doorL.position.set(0, PORCH_Y + 2.4, -4.6); doorL.target.position.set(0, 0, 1.5); st.add(doorL, doorL.target);
// jack-o'-lanterns with carved glowing faces
const faceEmi = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb030'; const fx = 64;
  g.beginPath(); g.moveTo(fx - 22, 50); g.lineTo(fx - 8, 50); g.lineTo(fx - 15, 36); g.fill(); g.beginPath(); g.moveTo(fx + 8, 50); g.lineTo(fx + 22, 50); g.lineTo(fx + 15, 36); g.fill();
  g.beginPath(); g.moveTo(fx - 26, 66); for (let i = 0; i <= 8; i++) g.lineTo(fx - 26 + i * 6.5, 66 + (i % 2 ? 10 : 2) + Math.sin(i / 8 * Math.PI) * 10); g.lineTo(fx + 26, 66); g.quadraticCurveTo(fx, 72, fx - 26, 66); g.fill(); });
const jackMat = new THREE.MeshStandardMaterial({ color: '#e0701c', roughness: 0.7, emissiveMap: faceEmi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.4, flatShading: true });
const jackGeo = (() => { const g = new THREE.SphereGeometry(1, 14, 10); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = 1 + 0.07 * Math.cos(Math.atan2(z, x) * 8); p.setX(i, x * r); p.setZ(i, z * r); } g.computeVertexNormals(); return g; })();
function jackO(x, y, z, s, yaw = Math.PI, light = false) { const b = mesh(jackGeo, jackMat); b.scale.set(s, s * 0.78, s); b.rotation.y = yaw; b.position.set(x, y + s * 0.78, z); st.add(b);
  const stc = mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.1, 6), M('#4b5a22')); stc.scale.setScalar(s * 5); stc.position.set(x, y + s * 1.56 + 0.03, z); st.add(stc);
  if (light) { const l = new THREE.PointLight(0xff8a2a, 2.5, 4, 1.6); l.position.set(x, y + s + 0.2, z + 0.3); st.add(l); } }
// g_world's plain porch pumpkins become lanterns: hide the icosahedra on the steps, put carved ones there (+ along the walk)
st.traverse(o => { if (o.isMesh && o.geometry.type === 'IcosahedronGeometry' && o.material.color && o.material.color.getHexString() === 'e8762a') o.visible = false; });
for (const [x, y, z, s, l] of [[-0.62, 0.36, -4.25, 0.17, true], [0.65, 0.18, -3.93, 0.15, false], [-1.15, PORCH_Y, -4.75, 0.2, true], [1.15, PORCH_Y, -4.8, 0.16, false], [-0.95, 0, -2.2, 0.16, true], [0.95, 0, 0.6, 0.14, false], [-0.95, 0, 3.4, 0.17, true], [0.95, 0, 6.0, 0.15, false]]) jackO(x, y, z, s, Math.PI, l);
// street lamps of g_world get bulbs + light
for (const x of [-9, 9]) { const b = mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe0a8' })); b.position.set(x, 4.05, 7.85); st.add(b); const l = new THREE.PointLight(0xffd090, 14, 16, 1.4); l.position.set(x, 3.9, 8.1); st.add(l); }
// ---- the extended street (x from -70 to -3000): ground, road, sidewalk, instanced houses with lit windows, lamps ----
const FAR_X = -3000;
{ const F = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
  const gnd = mesh(new THREE.PlaneGeometry(3000, 900), F('#6a7a3a'), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.set(-1500 - 69, -0.05, 0); st.add(gnd);
  const gnd2 = mesh(new THREE.PlaneGeometry(400, 900), F('#6a7a3a'), false, true); gnd2.rotation.x = -Math.PI / 2; gnd2.position.set(260, -0.06, 0); st.add(gnd2);
  plane(2940, 7, F('#4c4e56'), -70 - 1470, 13.6, 0.004); plane(2940, 2.0, F('#b8b2a6'), -70 - 1470, 8.95, 0.015); plane(2940, 2.0, F('#b8b2a6'), -70 - 1470, 18.3, 0.015);
  for (let x = -72; x > FAR_X; x -= 4) plane(1.8, 0.14, M('#d8cc90'), x, 13.6, 0.008);
  // houses: walls + roofs + a lit window strip, both sides of the road
  const N = 2 * Math.floor(2930 / 17), wallG = new THREE.BoxGeometry(1, 1, 1), roofG = new THREE.ConeGeometry(0.75, 1, 4, 1); roofG.rotateY(Math.PI / 4);
  const walls = new THREE.InstancedMesh(wallG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), N), roofs = new THREE.InstancedMesh(roofG, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), N);
  const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffb860', fog: true }), N * 2);
  const d = new THREE.Object3D(), c = new THREE.Color(); let k = 0, w = 0;
  for (let x = -76; x > FAR_X + 10; x -= 17) for (const side of [-1, 1]) { const z = side < 0 ? -8.5 : 24, hw = 6 + 2 * hash(x), hh = 3 + 0.8 * hash(x * 1.3), hd = 5;
    d.position.set(x, hh / 2, z); d.rotation.set(0, 0, 0); d.scale.set(hw, hh, hd); d.updateMatrix(); walls.setMatrixAt(k, d.matrix); walls.setColorAt(k, c.set(['#e8d4a8', '#a8c4d8', '#f0ece2', '#d8a87a', '#b8cca0', '#c2674a'][(hash(x * 2.7 + side) * 6) | 0]));
    d.position.set(x, hh + 1.1, z); d.scale.set(hw * 1.25, 2.2, hd * 1.35); d.updateMatrix(); roofs.setMatrixAt(k, d.matrix); roofs.setColorAt(k, c.set(['#4c5060', '#7a4a3a', '#5a4a4a'][(hash(x * 3.1) * 3) | 0])); k++;
    for (const dx of [-1.6, 1.6]) { if (hash(x * 5.3 + dx + side) < 0.25) continue; d.position.set(x + dx, hh * 0.55, z - side * (hd / 2 + 0.02)); d.rotation.set(0, side < 0 ? 0 : Math.PI, 0); d.scale.set(1.0, 0.9, 1); d.updateMatrix(); wins.setMatrixAt(w++, d.matrix); } }
  walls.count = roofs.count = k; wins.count = w; for (const m of [walls, roofs]) { m.castShadow = false; m.receiveShadow = true; st.add(m); } st.add(wins);
  // street lamps every 34 m: a pole + a glowing head (no real lights out there)
  const L = Math.floor(2930 / 34), poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), M('#2e3034'), L), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe0a8' }), L);
  for (let i = 0; i < L; i++) { const x = -80 - i * 34; d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.position.set(x, 2.1, 7.6); d.updateMatrix(); poles.setMatrixAt(i, d.matrix); d.position.set(x, 4.2, 7.75); d.updateMatrix(); heads.setMatrixAt(i, d.matrix); }
  st.add(poles, heads);
  // lamp pools of light on the sidewalk (additive discs, fake)
  const pool = new THREE.InstancedMesh(new THREE.CircleGeometry(3.2, 20), new THREE.MeshBasicMaterial({ color: '#5a4020', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), L);
  for (let i = 0; i < L; i++) { d.position.set(-80 - i * 34, 0.03, 9.2); d.rotation.set(-Math.PI / 2, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); pool.setMatrixAt(i, d.matrix); } st.add(pool); }
// ---- environment: night <-> day, seasons (fall -> winter -> spring -> summer) for the time-lapse ----
const crownMats = new Set(); { const pal = ['e07a2a', 'd4562a', 'f0a63a', 'c8402a', 'e8c050', 'b8582a']; st.traverse(o => { if (o.isMesh && o.material && o.material.color && pal.includes(o.material.color.getHexString())) crownMats.add(o.material); }); }
crownMats.forEach(m => m.userData.fall = m.color.clone());
const lawnMesh = st.children.find(o => o.isMesh && o.material.vertexColors);
const snow = mesh(new THREE.PlaneGeometry(220, 120), new THREE.MeshStandardMaterial({ color: '#eef2f8', roughness: 0.9, transparent: true, opacity: 0 }), false, true); snow.rotation.x = -Math.PI / 2; snow.position.set(0, 0.035, -6); st.add(snow);
const SUMMER = new THREE.Color('#4e9a3a'), WINTER = new THREE.Color('#e8eef4'), SPRING = new THREE.Color('#f0b8d0');
const fogNight = new THREE.Color('#1a2038'), fogDay = new THREE.Color('#c8d8ec');
// day: 0 night … 1 noon; season: 0 fall, 1 winter, 2 spring, 3 summer (fractions blend)
function setEnv(day, season = 0) {
  skyMesh.material.map = day > 0.5 ? daySky : nightSky; skyMesh.material.color.setScalar(day > 0.5 ? 0.55 + 0.45 * day : 1 - 0.6 * day * 2);
  stars.material.opacity = 0.85 * (1 - clamp(day * 3, 0, 1)); moonS.visible = day < 0.4;
  hemi.color.set(0x5a6aa8).lerp(new THREE.Color(0xfff0e0), day); hemi.groundColor.set(0x1a1420).lerp(new THREE.Color(0x7a6a50), day); hemi.intensity = lerp(0.85, 1.1, day);
  stSun.color.set(0x9fb4ff).lerp(new THREE.Color(0xfff2dc), day); stSun.intensity = lerp(0.9, 2.6, day); stSun.position.set(lerp(-10, 8, day), lerp(14, 13, day), 9);
  st.fog.color.copy(fogNight).lerp(fogDay, day);
  winMats.forEach(m => m.emissiveIntensity = 1.6 * (1 - day));
  const sm = ((season % 4) + 4) % 4, cw = j => clamp(1 - Math.min(Math.abs(sm - j), 4 - Math.abs(sm - j)), 0, 1);   // circular: fall 0 → winter 1 → spring 2 → summer 3 → fall
  const fa = cw(0), w = cw(1), sp = cw(2), su = cw(3);
  crownMats.forEach(m => { m.color.copy(m.userData.fall).multiplyScalar(fa).add(WINTER.clone().multiplyScalar(w)).add(SPRING.clone().multiplyScalar(sp)).add(SUMMER.clone().multiplyScalar(su)); });
  snow.material.opacity = 0.92 * w; snow.visible = w > 0.01; }
setEnv(0, 0);
