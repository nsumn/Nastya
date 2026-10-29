// =================== THE STREET (meters; x → right, z → toward the street): a suburban house with a porch (2 steps) and a red door, the driveway with
// an SUV (hatch up, groceries inside), the front walk, lawns, a neighbor's house with two neighbors who stare, trees, mailbox, street ===================
const st = new THREE.Scene(); const stCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 300);
{ const skyT = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a9ae0'); gr.addColorStop(0.55, '#a8d0f4'); gr.addColorStop(1, '#e8f2fa'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  st.add(new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false }))); }
st.fog = new THREE.Fog(0xdfeaf4, 45, 140);
st.add(new THREE.HemisphereLight(0xeaf4ff, 0x6a8a4a, 1.0));
const stSun = new THREE.DirectionalLight(0xfff0d8, 2.3); stSun.position.set(9, 14, 10); stSun.castShadow = true; stSun.shadow.mapSize.set(2048, 2048); stSun.shadow.bias = -0.0004;
Object.assign(stSun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 50 }); st.add(stSun, stSun.target);
const camKey = new THREE.PointLight(0xfff0e0, 1.1, 7, 1.3); stCam.add(camKey); st.add(stCam);   // soft fill riding with the camera
const PORCH_Y = 0.54, STEP = [[-4.4, -4.08, 0.36], [-4.08, -3.76, 0.18]];   // [z0, z1, top]: deck at z -6..-4.4
{ const lawn = mesh(new THREE.PlaneGeometry(120, 60), M('#7cb85a', { roughness: 1 }), false, true); lawn.rotation.x = -Math.PI / 2; lawn.position.z = -6; st.add(lawn);
  const conc = M('#cfcac0', { roughness: 0.95 }), asph = M('#4a4c52', { roughness: 0.95 });
  const flat = (w, d, x, z, m, y = 0.012) => { const p = mesh(new THREE.PlaneGeometry(w, d), m, false, true); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); st.add(p); return p; };
  flat(120, 7, 0, 13.5, asph, 0.006); flat(120, 2.2, 0, 8.9, conc); flat(1.2, 12.5, 0, 2.5, conc); flat(3.6, 15, 5.3, 1.3, conc, 0.01);
  for (let x = -40; x < 40; x += 4) flat(1.6, 0.14, x, 13.5, M('#f2e8a0'), 0.01);
  // house
  const siding = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = '#e8e2d2'; g.fillRect(0, y, w, 15); g.fillStyle = '#c8c0ae'; g.fillRect(0, y + 14, w, 2); } }, [6, 4]);
  const sid = new THREE.MeshStandardMaterial({ map: siding, roughness: 0.9 });
  const wall = (w, h, d, x, y, z) => { const m = mesh(BOX, sid); m.scale.set(w, h, d); m.position.set(x, y, z); st.add(m); };
  wall(7.2, 3.2, 4, -0.4, 1.6, -8); wall(4.4, 2.7, 4, 5.3, 1.35, -8);
  const roof = (w, x, y, z, h) => { for (const s of [-1, 1]) { const r = bx(w, 0.14, 2.6, '#5a5a62', x, y, z + s * 1.0, st); r.rotation.x = s * 0.62; } };
  roof(7.6, -0.4, 3.75, -8); roof(4.8, 5.3, 3.2, -8);
  bx(7.6, 1.2, 0.12, '#e8e2d2', -0.4, 3.75, -6.05, st).visible = false;
  // garage door, windows, the front door (red, brass knob), porch with posts and two steps
  bx(3.4, 2.3, 0.08, '#f4f4f0', 5.3, 1.15, -5.97, st); for (let k = 1; k < 4; k++) bx(3.42, 0.03, 0.09, '#d8d8d0', 5.3, k * 0.575, -5.96, st);
  for (const x of [-3.0, -1.9, 1.6, 2.6]) { bx(0.9, 1.0, 0.06, '#f4f4f0', x, 1.9, -5.98, st); bx(0.78, 0.88, 0.07, '#9ac4e4', x, 1.9, -5.97, st, { roughness: 0.2, metalness: 0.2 }); bx(0.06, 0.88, 0.08, '#f4f4f0', x, 1.9, -5.96, st); }
  bx(1.25, 2.35, 0.08, '#f4f4f0', 0, PORCH_Y + 1.15, -5.98, st);
  bx(3.0, PORCH_Y, 1.6, '#b8b2a6', 0, PORCH_Y / 2, -5.2, st); for (const [z0, z1, top] of STEP) bx(1.6, top, z1 - z0, '#b8b2a6', 0, top / 2, (z0 + z1) / 2, st);
  for (const x of [-1.4, 1.4]) bx(0.12, 2.5, 0.12, '#f4f4f0', x, PORCH_Y + 1.25, -4.5, st);
  bx(3.2, 0.14, 1.9, '#f4f4f0', 0, PORCH_Y + 2.55, -5.1, st);
  // mailbox, trees, bushes, the neighbor's house (left)
  bx(0.08, 1.0, 0.08, '#5a4a3a', 2.4, 0.5, 8.0, st); bx(0.22, 0.24, 0.45, '#2a3a5a', 2.4, 1.1, 8.0, st);
  const tree = (x, z, s = 1) => { const tr = mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 1.6 * s, 7), M('#6a4a30')); tr.position.set(x, 0.8 * s, z); st.add(tr);
    for (const [dx, dy, r] of [[0, 2.2, 1.0], [0.5, 1.9, 0.7], [-0.45, 2.0, 0.75]]) { const c = mesh(new THREE.IcosahedronGeometry(r * s, 0), M('#4a9a46', { flatShading: true, roughness: 0.9 })); c.position.set(x + dx * s, dy * s, z); st.add(c); } };
  tree(-6.5, 3.5, 1.3); tree(9.5, 2.0, 1.1); tree(-2.6, 7.5, 0.9); tree(12, -4, 1.4); tree(-16, -2, 1.3);
  for (const x of [-2.6, -1.9, 1.9, 2.6]) { const b = mesh(new THREE.IcosahedronGeometry(0.42, 0), M('#3f8a3e', { flatShading: true })); b.position.set(x, 0.3, -5.6); b.scale.y = 0.75; st.add(b); }
  const nsid = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = '#b8d0e0'; g.fillRect(0, y, w, 15); g.fillStyle = '#98b0c0'; g.fillRect(0, y + 14, w, 2); } }, [6, 4]), roughness: 0.9 });
  { const m = mesh(BOX, nsid); m.scale.set(7, 3.0, 5); m.position.set(-14, 1.5, -8.5); st.add(m); for (const s of [-1, 1]) { const r = bx(7.4, 0.14, 3.0, '#6a4a3a', -14, 3.6, -8.5 + s * 1.2, st); r.rotation.x = s * 0.62; }
    bx(1.0, 2.1, 0.08, '#2f5a8a', -13, 1.05, -5.97, st); for (const x of [-16, -11.5]) bx(1.0, 1.0, 0.07, '#9ac4e4', x, 1.8, -5.97, st); }
  flat(1.2, 12, -13, 2, conc); }
// ---- the SUV (rear to the street, hatch up) + the keys left on the driver's seat ----
const car = new THREE.Group(); car.position.set(5.3, 0, 1.2); st.add(car);
{ const paint = M('#3a5a8a', { roughness: 0.35, metalness: 0.3 }), dark = M('#1c1e24', { roughness: 0.6 }), glass = M('#2a3a4a', { roughness: 0.1, metalness: 0.4 });
  bx(1.9, 0.75, 4.5, paint, 0, 0.72, 0, car); bx(1.8, 0.62, 2.9, paint, 0, 1.4, 0.35, car); bx(1.82, 0.5, 2.6, glass, 0, 1.42, 0.35, car);
  bx(1.92, 0.12, 4.52, dark, 0, 0.36, 0, car); for (const [x, z] of [[-0.85, -1.45], [0.85, -1.45], [-0.85, 1.45], [0.85, 1.45]]) { const w = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); car.add(w); }
  const hatch = new THREE.Group(); hatch.position.set(0, 1.72, 1.8); car.add(hatch); hatch.rotation.x = -1.25; bx(1.78, 0.06, 1.1, paint, 0, 0, 0.55, hatch); bx(1.5, 0.05, 0.7, glass, 0, -0.04, 0.5, hatch);
  bx(1.7, 0.05, 1.3, '#2a2c32', 0, 0.82, 1.55, car);   // trunk floor
  for (const x of [-0.75, 0.75]) bx(0.3, 0.12, 0.06, '#e83a3a', x, 1.0, 2.26, car, { emissive: '#5a0a0a' }); }
const carKeys = new THREE.Group(); { const r = mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 14), M('#d8d8e0', { metalness: 0.9, roughness: 0.2 })); carKeys.add(r);
  for (const [dx, a] of [[0.03, 0.4], [-0.02, -0.5]]) { const k = bx(0.018, 0.07, 0.005, M('#d8c070', { metalness: 0.9, roughness: 0.25 }), dx, -0.05, 0, carKeys); k.rotation.z = a; }
  bx(0.05, 0.035, 0.012, "#e83a3a", 0, 0.04, 0, carKeys); }
carKeys.position.set(4.85, 1.205, 1.25); carKeys.rotation.x = -Math.PI / 2; st.add(carKeys);
bx(0.6, 0.1, 0.6, '#3a3a42', -0.45, 1.14, 0.05, car); bx(0.6, 0.55, 0.1, '#3a3a42', -0.45, 1.45, 0.4, car); { const sw = mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 20), M('#25272c')); sw.position.set(-0.45, 1.45, -0.55); sw.rotation.x = -0.4; car.add(sw); }   // driver's seat + wheel   // on the driver's seat
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
