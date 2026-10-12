
// =================== CITY BUS (meters; front of the bus at -z, camera at the front looking back at the passengers) ===================
const bus = new THREE.Scene(); bus.background = new THREE.Color('#b9cfe3');
const busFog = new THREE.Fog(new THREE.Color('#d8dccf'), 40, 120); bus.fog = busFog;
const busCam = new THREE.PerspectiveCamera(58, W / H, 0.05, 400);
bus.add(new THREE.HemisphereLight(0xf2f6ff, 0x6a6458, 1.25));
const busSun = new THREE.DirectionalLight(0xfff2dc, 1.4); busSun.position.set(6, 8, 2); bus.add(busSun);
const busIn = new THREE.Group(); bus.add(busIn);
const BL = 12, BW = 2.5, BH = 2.35; const rails = [];
{
  const floorM = M('#4a4f55', { flatShading: false }), wallM = M('#e9e6dc', { flatShading: false }), seatM = M('#2f5d8a', { flatShading: false }), poleM = M('#e0b52a', { metalness: 0.5, roughness: 0.35, flatShading: false });
  box(busIn, BW, 0.1, BL, floorM, 0, -0.05, 0); box(busIn, BW, 0.08, BL, M('#f2f0ea', { flatShading: false }), 0, BH, 0);
  for (let k = 0; k < 5; k++) box(busIn, 0.5, 0.03, 1.2, M('#fffbe8', { emissive: '#fff4d0', emissiveIntensity: 0.8, flatShading: false }), 0, BH - 0.05, -4.8 + k * 2.4);
  for (const sx of [-1, 1]) {
    box(busIn, 0.08, 0.95, BL, wallM, sx * BW / 2, 0.475, 0); box(busIn, 0.08, 0.5, BL, wallM, sx * BW / 2, BH - 0.25, 0);
    for (let z = -BL / 2; z <= BL / 2 + 0.01; z += 1.5) box(busIn, 0.1, 1.0, 0.12, wallM, sx * BW / 2, 1.45, z);
    rails.push(box(busIn, 0.04, 0.04, BL, poleM, sx * 0.55, 1.95, 0));
  }
  box(busIn, BW, BH, 0.1, wallM, 0, BH / 2, BL / 2);
  for (let z = -4.5; z <= 4.6; z += 1.5) { const p = mesh(new THREE.CylinderGeometry(0.02, 0.02, BH, 8), poleM); p.position.set(0.32, BH / 2, z); busIn.add(p); }
  // seats: pairs both sides, facing forward (-z)
  for (let r = 0; r < 11; r++) { const z = -4.2 + r * 0.82; for (const sx of [-1, 1]) for (const k of [0, 1]) { const x = sx * (0.42 + k * 0.42); box(busIn, 0.4, 0.1, 0.42, seatM, x, 0.45, z); box(busIn, 0.4, 0.5, 0.08, seatM, x, 0.72, z + 0.2); } }
}
// glass + the window that opens
const glassM = new THREE.MeshStandardMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1 });
for (const sx of [-1, 1]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(BL, 1.0), glassM); g.rotation.y = sx * Math.PI / 2; g.position.set(sx * (BW / 2 + 0.01), 1.45, 0); busIn.add(g); }
const slidePane = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.5), new THREE.MeshStandardMaterial({ color: '#b8d8e8', transparent: true, opacity: 0.5 })); slidePane.rotation.y = Math.PI / 2; slidePane.position.set(BW / 2 - 0.03, 1.7, 1.2); busIn.add(slidePane);
// the street outside (scrolls past)
const street = new THREE.Group(); bus.add(street);
{ const cols = ['#c56d4c', '#d98c69', '#9b4632', '#d9a73c', '#e3cfab', '#a8b8a8', '#8b98a6'];
  for (const sx of [-1, 1]) for (let i = 0; i < 40; i++) { const h = R(10, 40); const b = box(street, R(6, 12), h, R(8, 14), pick(cols), sx * R(9, 14), h / 2 - 0.5, -120 + i * 7); }
  const road = mesh(new THREE.PlaneGeometry(60, 400), M('#55585e', { flatShading: false }), false, true); road.rotation.x = -Math.PI / 2; road.position.y = -0.4; bus.add(road); }
// passengers
const riders = [];
{
  const SK = ['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c', '#6b4329'];
  const TP = ['#e24b3b', '#2f5d8a', '#f2f0ea', '#e0b040', '#4b8b5a', '#1f2a3a', '#7a4a8c', '#f08a4b', '#5aa0c8', '#c8c2b4', '#d46a8a', '#2b2b2e'];
  for (let r = 0; r < 11; r++) for (const sx of [-1, 1]) for (const k of [0, 1]) {
    if (rnd() < 0.18) continue;
    const p = makePerson(rnd, { skin: pick(SK), top: pick(TP) }); busIn.add(p.outer);
    const x = sx * (0.42 + k * 0.42), z = -4.2 + r * 0.82;
    riders.push({ p, x, z, seated: true, ph: R(0, 6.28), look: sx * (k === 0 ? 1 : -1), react: R(0, 1.8) });
  }
  for (let i = 0; i < 4; i++) { const p = makePerson(rnd, { skin: pick(SK), top: pick(TP) }); busIn.add(p.outer); riders.push({ p, x: R(-0.12, 0.2), z: 1.2 + i * 1.2 + R(-0.2, 0.2), seated: false, ph: R(0, 6.28), look: rnd() < 0.5 ? 1 : -1, react: R(0, 1.8) }); }
}
// faces: eyes (+ a mouth line) so the passengers read as looking at you
{ const eyeM = M('#141414'), mouthM = M('#5a2a24');
  for (const r of riders) { for (const ex of [-0.042, 0.042]) { const e = mesh(BOX, eyeM, false, false); e.scale.set(0.026, 0.03, 0.01); e.position.set(ex, 1.665, 0.112); r.p.root.add(e); } const m = mesh(BOX, mouthM, false, false); m.scale.set(0.05, 0.012, 0.01); m.position.set(0, 1.575, 0.106); r.p.root.add(m); r.mouth = m; } }
// the one who held it in (front-centre aisle seat, faces the camera)
const holder = riders.reduce((best, r) => (r.seated && r.x < 0 && Math.abs(r.x) < 0.5 && r.z > -2 && (!best || r.z < best.z)) ? r : best, null);
const busPuffs = riders.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); bus.add(s); return s; });
const haze = []; for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); s.position.set(R(-1.1, 1.1), R(0.3, 2.0), R(-5, 5.5)); bus.add(s); haze.push({ s, ph: rnd() }); }
const mouthPuff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); bus.add(mouthPuff);

// =================== PLANE (cut-away cabin) ===================
const plane = new THREE.Scene(); plane.fog = new THREE.Fog('#cfe2f2', 220, 1600);
const planeCam = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000);
skyDome(plane, '#2f6fbf', '#d9e8f4', 2500);
plane.add(new THREE.HemisphereLight(0xffffff, 0x9fb0c0, 1.3)); const plSun = new THREE.DirectionalLight(0xfff6e8, 1.8); plSun.position.set(-10, 20, 20); plane.add(plSun);
const cloudsBelow = []; for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex2, transparent: true, depthWrite: false })); s.position.set(R(-300, 300), R(-60, -25), R(-300, 80)); const sc = R(60, 140); s.scale.set(sc, sc * 0.4, 1); plane.add(s); cloudsBelow.push(s); }
const aircraft = new THREE.Group(); plane.add(aircraft);
const CUTP = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0);   // cut away the half facing the camera (z>0)
const skinM = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.5, side: THREE.DoubleSide, clippingPlanes: [CUTP], flatShading: true });
{
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 30, 28, 1, true), skinM); fus.rotation.z = Math.PI / 2; aircraft.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.0, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skinM); nose.rotation.z = -Math.PI / 2; nose.scale.set(1, 1.8, 1); nose.position.x = 15; aircraft.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(2.0, 7, 28, 1, true), skinM); tail.rotation.z = Math.PI / 2; tail.position.x = -18.5; aircraft.add(tail);
  const fin = box(aircraft, 4, 5, 0.3, M('#2b5f8a'), -19, 3.5, 0); fin.rotation.z = 0.35;
  const wingM = M('#dfe3e8'); const w1 = box(aircraft, 8, 0.4, 26, wingM, 1, -1.2, -13); w1.rotation.y = -0.35;
  box(aircraft, 0.3, 0.3, 30, M('#2b5f8a'), 0, -0.2, 2.02);
  const cabinFloor = box(aircraft, 28, 0.12, 3.6, M('#5a6470'), 0, -0.9, 0);
}
const planeSeatM = new THREE.MeshStandardMaterial({ color: '#2f5d8a', roughness: 0.8, flatShading: true });
const planeRiders = [];
{
  const SK = ['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c'];
  const TP = ['#e24b3b', '#2f5d8a', '#f2f0ea', '#e0b040', '#4b8b5a', '#7a4a8c', '#f08a4b', '#5aa0c8'];
  for (let r = 0; r < 22; r++) { const x = 12 - r * 1.05; for (const z of [-1.35, -0.85, -0.35, 0.45, 0.95]) {
    const s = mesh(BOX, planeSeatM); s.scale.set(0.5, 0.12, 0.45); s.position.set(x, -0.55, z); aircraft.add(s); const b = mesh(BOX, planeSeatM); b.scale.set(0.12, 0.75, 0.45); b.position.set(x - 0.22, -0.2, z); aircraft.add(b);
    const body = mesh(new THREE.CapsuleGeometry(0.17, 0.35, 3, 7), pick(TP)); body.position.set(x + 0.02, -0.15, z); aircraft.add(body);
    const head = mesh(new THREE.SphereGeometry(0.12, 8, 6), pick(SK)); head.position.set(x + 0.04, 0.25, z); aircraft.add(head);
    planeRiders.push({ x, z, head, ph: rnd() }); } }
}
const planePuffs = planeRiders.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); aircraft.add(s); return s; });
