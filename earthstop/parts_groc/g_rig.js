// =================== THE RIG (local: origin on the ground, front = +z). It grows stage by stage: wheels → legs → suspension → seat + motor → a kitchen ===================
// our own palette (not the reference channel's yellow tubes + blue panels): matte black tubes, orange joints, light wood deck, mint seat + motor, chrome springs
const BLK = M('#2b2d31', { roughness: 0.55, metalness: 0.35 }), ORG = M('#ff7a2a', { roughness: 0.45 }), MINT = M('#7fd1b9', { roughness: 0.55 }), STEEL = M('#c8ccd2', { roughness: 0.3, metalness: 0.6 }), DARK = M('#25272c', { roughness: 0.6 });
const WOOD = new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(256, 128, (g, w, h) => { for (let y = 0; y < h; y += 21) { g.fillStyle = pick(['#d8b48a', '#cfa97e', '#dcba92']); g.fillRect(0, y, w, 20); g.fillStyle = 'rgba(90,60,30,0.35)'; g.fillRect(0, y + 20, w, 1); } }) });
const tube = (a, b, r, mat, par) => { const A = V3(...a), B = V3(...b), d = B.clone().sub(A), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); par.add(m); return m; };
const rig = new THREE.Group(); st.add(rig);
const body = new THREE.Group(); rig.add(body);   // everything above the running gear; its y = deck height
const deck = bx(1.4, 0.1, 1.0, WOOD, 0, 0, 0, body);
const deckX = bx(2.3, 0.1, 1.5, WOOD, 0, -0.005, 0, body);   // the bigger deck once the kitchen arrives
const frame = new THREE.Group(); body.add(frame);
for (const x of [-0.65, 0.65]) for (const z of [-0.45, 0.45]) tube([x, 0.05, z], [x, 2.25, z], 0.03, BLK, frame);
for (const z of [-0.45, 0.45]) tube([-0.68, 2.25, z], [0.68, 2.25, z], 0.03, BLK, frame);
for (const x of [-0.65, 0.65]) tube([x, 2.25, -0.48], [x, 2.25, 0.48], 0.03, BLK, frame);
for (const x of [-0.65, 0.65]) for (const z of [-0.45, 0.45]) { const j = mesh(new THREE.SphereGeometry(0.05, 10, 8), ORG); j.position.set(x, 2.25, z); frame.add(j); }
const RIG_HOOKS = []; for (const x of [-0.65, 0.65]) for (let k = 0; k < 6; k++) RIG_HOOKS.push(V3(x, 2.23, -0.4 + 0.16 * k));   // bags hang along the SIDES: the front stays clear for your face
// running gear: wheels | legs (+ springs)
const wheels = new THREE.Group(); rig.add(wheels);
const WH = [[-0.62, -0.42], [0.62, -0.42], [-0.62, 0.42], [0.62, 0.42]].map(([x, z]) => { const w = new THREE.Group(); w.position.set(x, 0.2, z); wheels.add(w);
  const t = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), DARK); t.rotation.z = Math.PI / 2; w.add(t); const hub = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), ORG); hub.rotation.z = Math.PI / 2; w.add(hub); return w; });
const legs = new THREE.Group(); rig.add(legs);
const LEGS = [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].map(([x, z], i) => { const hip = new THREE.Group(); hip.position.set(x, 0, z); legs.add(hip);
  const spring = new THREE.Group(); hip.add(spring); for (let k = 0; k < 5; k++) { const r = mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 14), STEEL); r.rotation.x = Math.PI / 2; r.position.y = -0.03 - k * 0.035; spring.add(r); }
  const thigh = new THREE.Group(); thigh.position.y = -0.2; hip.add(thigh); tube([0, 0, 0], [0, -0.42, 0], 0.035, BLK, thigh); const kj = mesh(new THREE.SphereGeometry(0.055, 10, 8), ORG); kj.position.y = -0.42; thigh.add(kj);
  const shin = new THREE.Group(); shin.position.y = -0.42; thigh.add(shin); tube([0, 0, 0], [0, -0.42, 0], 0.03, BLK, shin); bx(0.14, 0.04, 0.2, DARK, 0, -0.44, 0.02, shin);
  return { hip, thigh, shin, spring, ph: i === 0 || i === 3 ? 0 : Math.PI }; });
// seat + steering bar, the motor (+ exhaust), the kitchen
const seat = new THREE.Group(); body.add(seat); seat.position.set(0, 0.05, -0.2); { bx(0.5, 0.1, 0.45, MINT, 0, 0.42, 0, seat); bx(0.5, 0.55, 0.08, MINT, 0, 0.72, -0.22, seat); tube([0, 0, 0], [0, 0.37, 0], 0.04, BLK, seat);
  tube([0, 0.05, 0.35], [0, 0.75, 0.42], 0.025, BLK, seat); tube([-0.2, 0.75, 0.42], [0.2, 0.75, 0.42], 0.025, DARK, seat); }
const motor = new THREE.Group(); body.add(motor); motor.position.set(0, 0.05, -0.52); { bx(0.5, 0.36, 0.3, MINT, 0, 0.18, 0, motor); bx(0.4, 0.06, 0.24, DARK, 0, 0.39, 0, motor); tube([0.18, 0.3, -0.12], [0.18, 0.75, -0.18], 0.03, STEEL, motor); }
const puffs = makeSmoke(st, 60);
const KIT = {}; { const k = (name, f) => { const g = new THREE.Group(); body.add(g); f(g); KIT[name] = g; };
  k('freezer', g => { g.position.set(-0.75, 0.05, 0.38); bx(0.62, 0.55, 0.5, '#f4f6f8', 0, 0.28, 0, g); bx(0.64, 0.05, 0.52, '#dfe4ea', 0, 0.58, 0, g); bx(0.2, 0.03, 0.03, STEEL, 0, 0.5, 0.26, g); });
  k('fridge', g => { g.position.set(0.78, 0.05, 0.35); bx(0.6, 1.35, 0.55, STEEL, 0, 0.68, 0, g); bx(0.02, 1.25, 0.56, '#9aa0a8', 0, 0.68, 0, g); for (const s of [-1, 1]) bx(0.03, 0.4, 0.04, '#e0e4ea', s * 0.06, 0.85, 0.29, g); });
  k('pantry', g => { g.position.set(-0.8, 0.05, -0.42); for (let s = 0; s < 4; s++) bx(0.6, 0.03, 0.3, '#b88a5a', 0, 0.05 + s * 0.32, 0, g); for (const x of [-0.29, 0.29]) bx(0.03, 1.1, 0.3, '#a07a4a', x, 0.55, 0, g);
    for (let s = 0; s < 3; s++) for (let q = 0; q < 3; q++) bx(0.12, 0.18 + 0.05 * ((s + q) % 2), 0.12, pick(['#e8463a', '#f2c040', '#4a8ae8', '#5ac87a', '#f4f4f0']), -0.18 + q * 0.18, 0.16 + s * 0.32, 0, g); });
  k('counter', g => { g.position.set(0.8, 0.05, -0.42); bx(0.62, 0.8, 0.45, '#f4f0e6', 0, 0.4, 0, g); bx(0.66, 0.05, 0.48, '#5a5a62', 0, 0.82, 0, g);
    const bowl = mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#e8463a')); bowl.position.set(0, 0.95, 0); g.add(bowl); for (let q = 0; q < 6; q++) { const c = mesh(new THREE.SphereGeometry(0.03, 6, 5), M('#f2c040')); c.position.set(-0.04 + 0.03 * (q % 3), 0.92, -0.02 + 0.03 * Math.floor(q / 3)); g.add(c); } });
  k('dish', g => { g.position.set(0.0, 0.05, 0.5); bx(0.56, 0.62, 0.42, STEEL, 0, 0.31, 0, g); bx(0.5, 0.08, 0.02, '#2a2c32', 0, 0.55, 0.215, g); for (let q = 0; q < 3; q++) bx(0.04, 0.02, 0.01, '#30e070', -0.12 + 0.06 * q, 0.55, 0.23, g, { emissive: '#1a8a3a' }); });
  k('icecream', g => { g.position.set(-0.3, 0.05, 0.42); const c = mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.14, 14), M('#f4d8e8')); c.position.y = 0.07; g.add(c); const top = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14), M('#e85a8a')); top.position.y = 0.15; g.add(top); }); }
const meltPuddle = mesh(new THREE.CircleGeometry(1, 20), M('#f8d8e4', { roughness: 0.3 }), false, true); meltPuddle.rotation.x = -Math.PI / 2; st.add(meltPuddle);
const meltDrops = Array.from({ length: 4 }, () => { const d = mesh(new THREE.SphereGeometry(0.02, 6, 5), M('#f8d0e0')); d.scale.y = 1.6; st.add(d); return d; });
// the back frame (stage 2): two posts up the back + a crossbar above the head with hooks at both ends
const backFrame = new THREE.Group(); hero.torso.add(backFrame);
{ for (const x of [-0.12, 0.12]) tube([x, 1.0, -0.2], [x, 2.25, -0.2], 0.025, BLK, backFrame); tube([-0.85, 2.25, -0.2], [0.85, 2.25, -0.2], 0.03, BLK, backFrame); bx(0.34, 0.06, 0.06, DARK, 0, 1.3, -0.17, backFrame); }
const BACK_HOOKS = []; for (const s of [-1, 1]) for (let k = 0; k < 6; k++) BACK_HOOKS.push(V3(s * (0.32 + 0.1 * k), 2.22, -0.2 + (k % 2 ? 0.06 : -0.06)));
// arm hooks (stage 1): a little hook at each wrist
const ARM_HOOKS = [0, 1].map(i => { const h = mesh(new THREE.TorusGeometry(0.04, 0.01, 5, 12, Math.PI * 1.3), STEEL); hero.elbows[i].add(h); h.position.set(0, -0.31, 0.02); h.rotation.y = Math.PI / 2; return h; });
// the rig's pose: deck height (wheels 0.45 / legs 0.85), gait phase; legs step with ph
function rigGear(kind, t, ph, bob = 0.05) { wheels.visible = kind === 'wheels'; legs.visible = kind !== 'wheels';
  if (kind === 'wheels') { body.position.y = 0.45; WH.forEach(w => w.rotation.x = ph); return; }
  const spr = kind === 'spring'; body.position.y = 0.95 + (spr ? 0.04 : 0) + (spr ? 0.006 : bob) * Math.abs(Math.sin(ph));
  legs.position.y = body.position.y;
  LEGS.forEach(L => { const a = Math.sin(ph + L.ph); L.spring.visible = spr; L.thigh.position.y = spr ? -0.2 : -0.08; L.thigh.rotation.x = 0.35 * a; L.shin.rotation.x = -0.25 - 0.35 * Math.max(0, Math.cos(ph + L.ph)); }); }
