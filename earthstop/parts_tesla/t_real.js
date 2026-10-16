// =================== THE REAL DEMO (dark arena): a ramp that curls over until upside down, fan suction, thrusters, flip, landing ===================
const arena = new THREE.Scene(); arena.background = new THREE.Color('#06070a'); arena.fog = new THREE.Fog(new THREE.Color('#06070a'), 40, 140);
const aCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
arena.add(new THREE.HemisphereLight(0x7f8db0, 0x101014, 0.55));
const aKey = new THREE.SpotLight(0xdfe8ff, 900, 120, 0.6, 0.5, 1.2); aKey.position.set(18, 30, 26); aKey.target.position.set(0, 4, 0); aKey.castShadow = true; aKey.shadow.mapSize.set(2048, 2048); arena.add(aKey, aKey.target);
const aBack = new THREE.SpotLight(0x6f9cff, 500, 100, 0.5, 0.6, 1.2); aBack.position.set(-20, 26, -18); aBack.target.position.set(0, 6, 0); arena.add(aBack, aBack.target);
const aSmoke = makeSmoke(arena, 3000);
const RAMP = { r: 6.2, cx: 12 };   // circle centre (cx, r); the car enters at x < cx, climbs the curl and ends upside down at the top
{ const fl = mesh(new THREE.PlaneGeometry(300, 300), M('#26282d', { roughness: 0.6, metalness: 0.2 }), false, true); fl.rotation.x = -Math.PI / 2; arena.add(fl);
  // the curl: a tube-like strip following the circle from the bottom to the top (180 deg)
  const segs = 40, wdt = 3.4, pos = [], idx = [];
  for (let i = 0; i <= segs; i++) { const a = Math.PI * i / segs; const x = RAMP.cx + RAMP.r * Math.sin(a), y = RAMP.r - RAMP.r * Math.cos(a); for (const z of [-wdt / 2, wdt / 2]) pos.push(x, y, z); if (i < segs) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  const ramp = mesh(rg, M('#2c3550', { side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3, flatShading: true })); arena.add(ramp);
  // back frame (truss) and side rails
  for (const z of [-wdt / 2 - 0.1, wdt / 2 + 0.1]) for (let i = 0; i < segs; i++) { const a0 = Math.PI * i / segs, a1 = Math.PI * (i + 1) / segs; const p0 = V3(RAMP.cx + RAMP.r * Math.sin(a0), RAMP.r - RAMP.r * Math.cos(a0), z), p1 = V3(RAMP.cx + RAMP.r * Math.sin(a1), RAMP.r - RAMP.r * Math.cos(a1), z);
    const b = mesh(BOX, M('#5a6aa8', { flatShading: true })); b.scale.set(p0.distanceTo(p1) + 0.05, 0.25, 0.2); b.position.copy(p0).lerp(p1, 0.5); b.rotation.z = Math.atan2(p1.y - p0.y, p1.x - p0.x); arena.add(b); }
  for (const z of [-2.2, 2.2]) { bx(0.5, 13, 0.5, '#2a2c34', RAMP.cx + RAMP.r + 0.6, 6.5, z, arena); bx(0.5, 1, 0.5, '#2a2c34', RAMP.cx + 0.5, 12.9, z, arena); }
  bx(RAMP.r + 1, 0.4, 0.4, '#2a2c34', RAMP.cx + RAMP.r / 2, 12.8, 0, arena);
  // red light strips on the floor + a line-up of other cars (blue sedan, red sedan, a white semi) like at the reveal
  for (const z of [-6, 6]) { const s = bx(60, 0.05, 0.12, new THREE.MeshStandardMaterial({ color: '#400', emissive: '#ff1a10', emissiveIntensity: 2 }), -10, 0.03, z, arena); }
  const semi = makeSemi('#f2f2f2'); semi.position.set(-14, 0, -9); arena.add(semi);
  for (const [x, c] of [[-26, '#2a4f9a'], [-31, '#b8241c'], [-36, '#2a2c30']]) { const g = grp(x, 0, -9, 0, arena); bx(4.6, 0.8, 1.9, M(c, { roughness: 0.3, metalness: 0.4 }), 0, 0.75, 0, g); bx(2.6, 0.55, 1.7, M('#1e262e', { roughness: 0.15, metalness: 0.6 }), -0.2, 1.4, 0, g); }
}
const hero = makeRoadster(); arena.add(hero.g);
const R_IN = REAL + 2.0, R_TOP = REAL + 3.4, R_DROP = REAL + 4.4, R_LAND = R_DROP + 1.55;
function heroState(t) {
  const r = RAMP.r, cx = RAMP.cx;
  if (t < R_IN) { const u = (t - REAL) / (R_IN - REAL); const x = lerp(-34, cx - 0.01, u * u * 0.3 + u * 0.7); return { x, y: 0, z: 0, yaw: 0, rear: u > 0.3 ? 0.8 : 0, dist: x }; }
  if (t < R_TOP) { const u = ease((t - R_IN) / (R_TOP - R_IN)); const a = Math.PI * u; const x = cx + (r - 0.0) * Math.sin(a), y = r - r * Math.cos(a);
    return { x, y, z: 0, yaw: 0, pitch: a, rear: 0.5, dist: 30 + a * r }; }   // pitch = curl angle: at the top the car hangs upside down
  if (t < R_DROP) return { x: cx, y: 2 * r, z: 0, yaw: 0, pitch: Math.PI, rear: 0, dist: 30 + Math.PI * r };
  if (t < R_LAND) { const u = (t - R_DROP) / (R_LAND - R_DROP); const y = 2 * r * (1 - u * u);
    return { x: cx - 6 * u, y: Math.max(0, y), z: 0, yaw: 0, pitch: Math.PI * (1 + ease(u)), down: u < 0.35 ? 1 : 0, rear: u < 0.5 ? 0.8 : 0, dist: 0 }; }
  const u = t - R_LAND; return { x: cx - 6 - 14 * u, y: 0, z: 0, yaw: 0, pitch: 0, down: u < 0.25 ? 0.8 : 0, dist: -14 * u };
}
const heroActor = { id: 777, state: heroState };
function updateReal(t) { const s = heroState(t); placeCar(hero, s);
  // at the top the car's body hangs below the curl: offset the car by its height along its own up axis so the wheels touch the ramp
  aSmoke.begin(); emitPlumes(aSmoke, heroActor, t, 1.3); aSmoke.end(); }
function realCamera(t) { const u = (t - REAL) / (T_END - REAL); aCam.fov = 50; const hs = heroState(t), k = smooth(REAL + 1.0, REAL + 2.4, t); const lx = t < R_TOP ? lerp(hs.x, 11, k) : 11; aCam.position.set(lx - 3, lerp(3.0, 6.0, k), lerp(24, 30, k)); aCam.lookAt(lx, lerp(1.5, 6.0, k), 0); }
