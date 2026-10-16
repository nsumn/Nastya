// =================== AIR STATION (meters): canopy, air pumps, a queue of Roadsters down the road ===================
const st = new THREE.Scene(); st.background = new THREE.Color('#9cc6ec'); st.fog = new THREE.Fog(new THREE.Color('#cfe3f4'), 80, 700);
const stCam = new THREE.PerspectiveCamera(55, W / H, 0.1, 3000);
st.add(new THREE.HemisphereLight(0xcfe0ff, 0x6a5a48, 1.1));
const stSun = new THREE.DirectionalLight(0xfff0dc, 3.0); stSun.position.set(-40, 80, 50); stSun.castShadow = true; stSun.shadow.mapSize.set(2048, 2048);
Object.assign(stSun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 }); stSun.shadow.bias = -0.0004; stSun.shadow.normalBias = 0.02; st.add(stSun);
const stSmoke = makeSmoke(st, 2500);
const STATION = { pumps: [], queue: [] };
{
  const dome = cityDome.clone(); st.add(dome);
  const gr = mesh(new THREE.PlaneGeometry(2000, 2000), M('#7a9a58', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; gr.position.y = -0.02; st.add(gr);
  const road = mesh(new THREE.PlaneGeometry(1200, 9), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.0, 14); st.add(road);
  const lot = mesh(new THREE.PlaneGeometry(60, 26), M('#5a5d62', { roughness: 0.95 }), false, true); lot.rotation.x = -Math.PI / 2; lot.position.set(0, 0.01, -2); st.add(lot);
  for (let x = -600; x < 600; x += 9) { const d = mesh(new THREE.PlaneGeometry(3, 0.15), M('#e8e6df'), false, true); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.02, 14); st.add(d); }
  // canopy
  const cg = grp(0, 0, -2, 0, st); for (const [x, z] of [[-10, -4], [10, -4], [-10, 4], [10, 4]]) bx(0.6, 5.2, 0.6, '#d8d8d8', x, 2.6, z, cg);
  bx(26, 0.9, 13, '#f4f4f2', 0, 5.6, 0, cg); bx(26.1, 0.35, 13.1, '#2f6fd0', 0, 5.3, 0, cg);
  const sign = canvasTex(512, 160, (g, w, h) => { g.fillStyle = '#2f6fd0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 104px Inter'; g.textAlign = 'center'; g.fillText('AIR', w / 2, 112); });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshStandardMaterial({ map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.35 })); p.position.set(0, 5.6, s * 6.56); p.rotation.y = s > 0 ? 0 : Math.PI; cg.add(p); }
  // price pylon
  const py = grp(-24, 0, 7.5, 0.4, st); bx(0.5, 7, 0.5, '#555', 0, 3.5, 0, py);
  const pt = canvasTex(256, 384, (g, w, h) => { g.fillStyle = '#1b2a44'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 64px Inter'; g.textAlign = 'center'; g.fillText('AIR', w / 2, 80); g.font = '600 30px Inter'; g.fillStyle = '#9fc5ff'; g.fillText('4,500 PSI', w / 2, 140);
    g.fillStyle = '#ffd24a'; g.font = '700 70px Inter'; g.fillText('9 kWh', w / 2, 250); g.fillStyle = '#cfd8e6'; g.font = '500 26px Inter'; g.fillText('PER FILL', w / 2, 300); });
  const pb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 0.4), [M('#1b2a44'), M('#1b2a44'), M('#1b2a44'), M('#1b2a44'), new THREE.MeshStandardMaterial({ map: pt, emissive: '#fff', emissiveMap: pt, emissiveIntensity: 0.5 }), M('#1b2a44')]); pb.position.y = 8.6; py.add(pb);
  // pumps on two islands
  for (const z of [-3.2, 2.2]) for (const x of [-6, 0, 6]) { const p = grp(x, 0, z - 2, 0, st); bx(1.6, 0.25, 0.9, '#cfcfcf', 0, 0.12, 0, p); bx(0.8, 1.9, 0.6, '#2f6fd0', 0, 1.2, 0, p); bx(0.62, 0.4, 0.02, M('#0f1a2a'), 0, 1.65, 0.31, p);
    const tank = mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 10), M('#e0e0e0', { metalness: 0.5, roughness: 0.3 })); tank.position.set(0.55, 0.85, 0); p.add(tank); STATION.pumps.push(p.position.clone().add(V3(0, 0, -2))); }
  // shop + trees + far houses
  bx(14, 4.2, 8, '#e9dcc0', 22, 2.1, -10, st); bx(14.4, 0.4, 8.4, '#b85a40', 22, 4.3, -10, st); bx(6, 2, 0.1, M('#3a4c50', { roughness: 0.2 }), 22, 1.6, -5.95, st);
  for (let i = 0; i < 40; i++) { const x = R(-300, 300), z = R(-140, -30); const tr = grp(x, 0, z, 0, st); bx(0.5, 3, 0.5, '#6b4a2e', 0, 1.5, 0, tr); const c = mesh(new THREE.IcosahedronGeometry(R(2, 3.2), 0), M(pick(['#4f9a3c', '#3f8a3a', '#5aa048']), { flatShading: true })); c.position.y = 4; tr.add(c); }
  for (let i = 0; i < 30; i++) { const x = R(-500, 500), z = R(40, 160); const h = R(5, 9); bx(R(8, 14), h, R(8, 12), pick(['#e8c7a0', '#d9a07a', '#c8d0d8', '#efe2c8']), x, h / 2, z, st); }
}
// cars: 6 at the pumps (hissing), the queue: a line back down the road (+x) and around, inching forward
const STQ = [];
for (let i = 0; i < 6; i++) { const r = makeRoadster(); st.add(r.g); const p = STATION.pumps[i]; r.g.position.set(p.x + 0.0, 0, p.z + (p.z < -3 ? -1.9 : 1.9)); r.g.rotation.y = Math.PI; STQ.push({ r, pump: i }); }
for (let i = 0; i < 46; i++) { const r = makeRoadster(); st.add(r.g); STQ.push({ r, q: i }); }
function updateStation(t) {
  const u = t - AIR; stSmoke.begin();
  for (const c of STQ) { if (c.pump !== undefined) { const p = c.r.g.position; const pulse = 0.5 + 0.5 * Math.sin(u * 3 + c.pump);
      for (let k = 0; k < 10; k++) { const age = ((u * 1.3 + k / 10 + c.pump * 0.17) % 1); smokeAddTmp.set(p.x - 2.2 - age * 1.5, 0.7 + age * 1.6, p.z + (hash(k + c.pump * 9) - 0.5) * 1.2); stSmoke.add(smokeAddTmp, 0.6 + age * 2.5, 0.35 * (1 - age) * pulse); } continue; }
    // queue: a line in the right lane from the lot entrance out to x = +300, creeping forward 1.5 m/s in steps
    const s = c.q * 5.6 + 6 - Math.min(5.6, ((u * 1.2) % 5.6)) * (c.q < 30 ? 1 : 0);
    const x = 14 + s, z = 15.8; c.r.g.position.set(x, 0, z); c.r.g.rotation.y = Math.PI; for (const w of c.r.wheels) w.rotation.z = 0; }
  stSmoke.end();
}
const smokeAddTmp = new THREE.Vector3();
function stationCamera(t) { const u = (t - AIR) / (BUMP - AIR); stCam.fov = 55; stCam.position.set(lerp(-26, -14, ease(u)), lerp(9, 6.5, u), lerp(-26, -22, u)); stCam.lookAt(lerp(8, 18, u), 1.5, 8); }
