// =================== THE STORY: poses per beat, shots, captions/HUD, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const mid = () => H_(hero).lerp(H_(friend), 0.5); const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
// seated: hips on a seat at height y (hip joint sits 0.9·h above the body origin, which is 0.95 below outer)
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const CAR_V = 34;   // m/s (~75 mph) on the empty interstate
function carZ(t) { return t < GAS ? 100 - CAR_V * (t - CAR) : -58; }   // down the avenue; it dies just before the square
function pose(t) {
  const P = hero, Q = friend; for (const X of [P, Q]) { poseReset(X, t); X.torso.scale.set(1, 1, 1); }
  MK.bag.visible = MK.donut.visible = MK.can.visible = false;
  if (t < HOMES) {   // the street
    place(P, 8.0, 0.0, 0.35, 0.16); place(Q, 9.0, 0.1, -0.35, 0.16);
    if (t < GONE) { P.face('happy', t); Q.face('laugh', t); Q.arms[1].rotation.set(-0.5 - 0.3 * Math.sin(t * 6), 0, 0.2); }   // chatting
    else if (t < 6.0) { P.face('surprised', t); Q.face('surprised', t); P.outer.rotation.y = 0.35 + 0.6 * Math.sin((t - GONE) * 2.2); Q.outer.rotation.y = -0.35 - 0.7 * Math.sin((t - GONE) * 2.0 + 1); }
    else { P.face('wired', t); Q.face('laugh', t); Q.arms[1].rotation.set(-2.6, 0, -0.2 + 0.4 * Math.sin(t * 10)); P.arms.forEach((a, i) => a.rotation.set(-2.7, 0, i ? -0.3 : 0.3)); P.outer.position.y += 0.25 * Math.abs(Math.sin((t - 6.0) * 6)); }
  } else if (t < MARKET) { /* aerial: nobody */ }
  else if (t < CAR || (t >= ROT && t < GAS)) {   // supermarket
    if (t < CAR) { place(P, 0.35, 2.6 - 0.8 * (t - MARKET), Math.PI); MK.cart.position.set(0.35, 0, P.outer.position.z - 0.75); MK.cart.rotation.y = 0; P.arms.forEach(a => a.rotation.set(-0.9, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.6); poseWalk(P, t * 7, 0.5); P.arms.forEach(a => a.rotation.x = -0.9);
      P.face(t < 18 ? 'happy' : 'laugh', t);
      place(Q, -0.45, 1.8, 0.3); Q.face(Math.sin(t * 9) > 0 ? 'happy' : 'laugh', t); Q.arms[1].rotation.set(-2.0 + 0.35 * Math.max(0, Math.sin(t * 9)), 0.2, 0.35); Q.elbows[1].rotation.x = -1.7;
      Q.arms[0].rotation.set(-1.0, 0, -0.3); Q.elbows[0].rotation.x = -1.0; Q.outer.updateMatrixWorld(true); MK.bag.visible = true; MK.bag.position.copy(Q.elbows[0].localToWorld(V3(0, -0.3, 0.05))); MK.bag.rotation.set(0.3, 0.3, 0);
      MK.wr.count = Math.min(60, Math.floor((t - MARKET) * 11)); }
    else { // rot: at the produce stand; the friend holds a mouldy donut, then you hold up a can
      MK.wr.count = 60; place(Q, -0.2, 10.4, Math.PI * 0.95); place(P, 0.75, 10.2, Math.PI * 1.1); MK.cart.position.set(1.6, 0, 9.4);
      Q.arms[0].rotation.set(-1.25, 0, -0.35); Q.elbows[0].rotation.x = -1.75; Q.outer.updateMatrixWorld(true); MK.donut.visible = true; MK.donut.position.copy(Q.elbows[0].localToWorld(V3(0, -0.3, 0.06))); MK.donut.rotation.set(0.9, 0, 0);
      Q.face(t < 42 ? 'crying' : 'sad', t); P.face(t < 42 ? 'squint' : 'proud', t);
      if (t >= 42) { P.arms[1].rotation.set(-1.6, 0, 0.25); P.elbows[1].rotation.x = -0.6; P.outer.updateMatrixWorld(true); MK.can.visible = true; MK.can.position.copy(P.elbows[1].localToWorld(V3(0, -0.3, 0.06))); } }
    const rot = smooth(ROT, ROT + 2.2, t) * (t < GAS ? 1 : 0); MK.icing.color.set('#f088b8').lerp(new THREE.Color('#6a8a3a'), rot);
    MK.fruit.forEach((f, i) => { f.material.color.copy(f.userData.c0).lerp(new THREE.Color(i % 3 ? '#5a4a2a' : '#6a7a3a'), rot * (0.6 + 0.4 * hash(i))); f.scale.setScalar(1 - 0.25 * rot * hash(i * 2)); });
  }
  else if (t < GRID || (t >= GAS && t < PRES)) {   // highway
    if (t < 47.5 || t < GRID) { const z = carZ(t); HW.car.position.set(0, 0, z); HW.car.rotation.y = Math.PI; HW.car.visible = true; HW.bikeA.visible = HW.bikeB.visible = false;
      place(P, 0.42, z + 0.25, Math.PI, seatY(P, 0.78) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.set(-1.15, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.4);
      place(Q, -0.42, z + 0.25, Math.PI, seatY(Q, 0.78) - 0.95); poseSit(Q);
      if (t < GRID) { P.face('wired', t); const scream = t >= 24; Q.face(scream ? 'surprised' : 'laugh', t); if (scream) { Q.arms.forEach((a, i) => a.rotation.set(-2.9, 0, (i ? -1 : 1) * (0.3 + 0.15 * Math.sin(t * 13)))); Q.outer.position.x += 0.03 * Math.sin(t * 40); } else Q.arms[0].rotation.set(-2.6, 0, 0.4); }
      else { P.face('dumb', t); Q.face('dumb', t); HW.smoke.forEach((s, i) => { const k = ((t - GAS - 0.3 - i * 0.18) / 1.6); s.visible = k > 0 && k < 1; s.position.set(0.4 * Math.sin(i), 0.6 + 2.2 * k, z + 2.4 + 0.8 * k); s.scale.setScalar(0.6 + 2.2 * k); s.material.opacity = 0.85 * (1 - k); }); } }
    else { HW.smoke.forEach(s => s.visible = false); HW.car.position.set(0, 0, carZ(t)); HW.bikeA.visible = HW.bikeB.visible = true; const z0 = -60 - 4.2 * (t - 47.5), ph = t * 7;
      HW.bikeA.position.set(-0.8, 0, z0); HW.bikeA.rotation.y = Math.PI; HW.bikeB.position.set(0.9, 0, z0 + 1.2); HW.bikeB.rotation.y = Math.PI;
      for (const [X, b, s] of [[P, HW.bikeA, 1], [Q, HW.bikeB, 0.66]]) { b.userData.wheels.forEach(w => w.rotation.x = ph); place(X, b.position.x, b.position.z + 0.1 * s, Math.PI, seatY(X, 1.02 * s) - 0.95); poseSit(X);
        X.legs[0].rotation.x = -1.0 + 0.45 * Math.sin(ph); X.legs[1].rotation.x = -1.0 - 0.45 * Math.sin(ph); X.knees[0].rotation.x = 1.2 - 0.4 * Math.sin(ph); X.knees[1].rotation.x = 1.2 + 0.4 * Math.sin(ph);
        X.arms.forEach(a => a.rotation.set(-1.0, 0, 0)); X.torso.rotation.x = 0.25; }
      P.face('neutral', t); Q.face('worried', t); Q.outer.position.x += 0.04 * Math.sin(t * 9); } }
  else if (t >= SUBWAY && t < ROT) {   // subway entrance: at the railing, looking down
    place(P, 1.75, 0.55, -Math.PI / 2 - 0.25, 0.2); place(Q, 1.65, -0.35, -Math.PI / 2 + 0.2, 0.2);
    for (const X of [P, Q]) { X.torso.rotation.x = 0.15; X.arms.forEach(a => a.rotation.set(-0.9, 0, 0)); X.elbows.forEach(e => e.rotation.x = -0.4); }
    P.face(t < 36 ? 'surprised' : 'worried', t); Q.face(t < 36 ? 'surprised' : 'anxious', t); }
  else if (t >= PRES && t < COUCH) {   // White House lawn: each votes for themselves
    place(P, -0.48, -86.6, 0.2); place(Q, 0.48, -86.6, -0.2); WHS.box.position.set(0, 0, -88.0); const vote = t >= 53.8;
    for (const [X, s] of [[P, 1], [Q, -1]]) { if (vote) { X.arms[1].rotation.set(-2.9, 0, -0.15); X.elbows[1].rotation.x = -0.1; } }
    P.face(vote ? 'smirk' : 'proud', t); Q.face(vote ? 'angry' : 'happy', t);
    WHS.slips.forEach((s, i) => { const k = clamp((t - PRES - 0.6 - i * 0.7) / 0.6, 0, 1); s.visible = k < 1 && t < 53.8; s.position.set((i ? 1 : -1) * 0.25 * (1 - k), 1.2 + 0.4 * (1 - k), -88.0 + 0.2); s.rotation.set(-0.3, i * 0.4, 0); }); }
  else if (t >= COUCH) {   // mansion: the friend asleep on a tiny couch, you standing over him
    Q.outer.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'); Q.outer.position.set(0.32, 0.72, 0.22); Q.face('sleep', t); Q.torso.scale.set(1, 1, 1 + 0.04 * Math.sin(t * 2.2));
    Q.arms.forEach((a, i) => a.rotation.set(-0.6, 0, (i ? -1 : 1) * 0.4)); Q.elbows.forEach(e => e.rotation.x = -1.2); Q.legs.forEach(l => l.rotation.x = -0.2); Q.knees.forEach(k => k.rotation.x = 0.9);
    place(P, 0.55, -0.7, 0.6); P.arms.forEach((a, i) => a.rotation.set(0.05, 0, (i ? -1 : 1) * 0.12)); P.elbows.forEach(e => e.rotation.x = -0.3); P.face(t < 58.5 ? 'squint' : 'smirk', t); }   // you stand behind the couch, out of the line to his head (the Zs rise from HIM)
}
// ---- shots: [start, set, camera(t)] ----
const SETS = { nyc: NYC, st: { sc: st, cam: stCam }, burb: BURB, mkt: MKT, hwy: HWY, sub: SUB, wh: WH, man: MAN, map: { sc: mapScene, cam: mapCam } };
// vizavi_motion pass (Oct 30): every active shot moves (dolly / arc / crane with eased speed waves), fast shots get real motion blur (sub-frame accumulation),
// close-ups get depth of field from the AO depth buffer, and three energetic cuts are whip-pans on a whoosh. opts: { mb, dof: () => focus point, whip: ±1 }
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
const SHOTS = [
  [0, 'nyc', t => lerpF(LOOK(1.2, 5.2, 15, 8.4, 1.6, -2.5), LOOK(3.6, 1.8, 8.6, 8.5, 1.6, -0.6), 1 - Math.pow(1 - clamp(t / 2, 0, 1), 2.4))],   // crane down into the crowd
  [2.0, 'nyc', t => LOOK(8.7 + 0.5 * esin(span(t, 2, 4)), 1.15, 4.5 - 0.5 * span(t, 2, 4), 8.5, 1.7, 0.0, 44)],
  [GONE, 'nyc', t => orbit(mid(), V3(-0.15, 0.06, 1), -0.55, 0.3, 2.7, 2.2, 0.62, span(t, GONE, 6.0)), { dof: () => mid() }],
  [6.0, 'nyc', t => lerpF(LOOK(6.0, 2.4, 6.5, 8.5, 1.3, 0), LOOK(1.0, 42, 38, 0, 14, -220), esin(span(t, 6.0, 8.8))), { mb: true }],
  [HOMES, 'burb', t => { const u = span(t, HOMES, 12); return LOOK(-60 + 40 * u, 340 - 20 * u, 300 - 30 * u, 10 * u, 0, -40, 40); }],
  [12.0, 'burb', t => LOOK(840 + 40 * esin(span(t, 12, 15)), 120, 190, 900 + 20 * span(t, 12, 15), 0, 0, 40), { mb: true }],
  [MARKET, 'mkt', t => { const u = span(t, MARKET, 18); return LOOK(0.25 - 0.3 * u, 1.7 + 0.5 * u, -4.2 - 1.2 * u, 0, 1.0, 3.0, 44); }],
  [18.0, 'mkt', t => orbit(H_(friend), V3(0.75, 0.05, 1), -0.35, 0.3, 1.7, 1.35, 0.62, span(t, 18, CAR)), { dof: () => H_(friend) }],
  [CAR, 'nyc', t => { const z = carZ(t), u = span(t, CAR, 24); return LOOK(1.2 - 2.0 * esin(u), 1.4 + 0.5 * u, z - 8.5 + 1.5 * u, 0, 1.1, z, 42); }, { mb: true, whip: 1 }],
  [24.0, 'nyc', t => { const h = H_(friend), a = -0.4 + 0.5 * span(t, 24, GRID); return LOOK(h.x - 1.9 * Math.cos(a), h.y + 0.2, h.z - 1.2 + 1.9 * Math.sin(a), h.x, h.y - 0.1, h.z, 42); }, { mb: true }],
  [GRID, 'map', t => { const u = span(t, GRID, SUBWAY); return LOOK(-120 * u, 3000 - 600 * esin(u), 1500 - 250 * u, -40 * u, 0, 30, 30); }],
  [SUBWAY, 'sub', t => { const u = esin(span(t, SUBWAY, 36)); return LOOK(5.8 - 1.6 * u, 3.8 - 0.6 * u, 6.2 + 1.2 * u, 0.3, 0.0, 0, 40); }],
  [36.0, 'sub', t => { const u = esin(span(t, 36, ROT)); return LOOK(-0.8 + 0.3 * u, 3.3 - 0.6 * u, 3.4 - 0.3 * u, 1.45, 0.45, 0.0, 44); }],
  [ROT, 'mkt', t => orbit(H_(friend), V3(-0.25, 0.04, -1), 0.25, -0.15, 1.6, 1.2, 0.62, span(t, ROT, 42)), { dof: () => H_(friend) }],
  [42.0, 'mkt', t => orbit(H_(hero).lerp(H_(friend), 0.4), V3(0.2, 0.06, -1), -0.3, 0.25, 2.8, 2.4, 0.62, span(t, 42, GAS)), { dof: () => H_(hero) }],
  [GAS, 'nyc', t => { const z = carZ(t), a = 0.5 * esin(span(t, GAS, 47.5)); return LOOK(3.0 * Math.cos(a), 1.6, z - 5.0 * Math.cos(a) + 3 * Math.sin(a), 0, 1.0, z, 40); }, { whip: -1 }],
  [47.5, 'nyc', t => { const z = -60 - 4.2 * (t - 47.5); return LOOK(3.6 - 1.2 * span(t, 47.5, PRES), 1.7, z - 6.5, 0.1, 1.0, z, 40); }, { mb: true, whip: 1 }],
  [PRES, 'nyc', t => { const u = esin(span(t, PRES, 53.8)); return LOOK(0.9, 1.6 + 2.6 * u, -69 - 2.5 * u, 0, 7 + 5 * u, -122, 46); }, { whip: -1 }],
  [53.8, 'nyc', t => orbit(mid(), V3(0.05, 0.32, 1), -0.2, 0.15, 3.8, 3.2, 0.6, span(t, 53.8, COUCH)), { dof: () => mid() }],
  [COUCH, 'man', t => { const u = esin(span(t, COUCH, 58.5)); return LOOK(4.2 - 0.9 * u, 2.8 - 0.4 * u, 5.4 - 0.8 * u, 0.3, 0.95, 0.0, 40); }],
  [58.5, 'man', t => orbit(H_(hero), V3(0.5, 0.1, 1), 0.35, -0.1, 2.8, 2.3, 0.62, span(t, 58.5, ENDC)), { dof: () => H_(hero) }],
  [ENDC, 'man', t => LOOK(3.3 - 0.1 * (t - ENDC), 2.4, 4.6, 0, 0.8, 0.3, 40)]];
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, k, cf] = SHOTS[i], S = SETS[k]; puffsReset();
  if (k !== 'map') { S.sc.add(hero.outer); S.sc.add(friend.outer); hero.outer.visible = friend.outer.visible = k !== 'burb'; }
  if (k === 'nyc') updateNYC(t); if (k === 'burb') updateBurb(t); pose(t);
  if (k === 'map') { lightsMat.uniforms.uOff.value = clamp((t - GRID - 0.8) / 4.6, 0, 1); lightsMat.uniforms.uT.value = t; }
  if (k === 'sub') { const wl = lerp(-3.2, 0.24, smooth(SUBWAY + 0.3, 37.6, t)); SB.water.position.set(0, wl, 0); const sp = smooth(37.2, 38.8, t); SB.sheet.visible = sp > 0.01; SB.sheet.position.set(0, 0.215, 0); SB.sheet.scale.setScalar(0.5 + 4.5 * sp); }
  if (k === 'wh') { const P = WHS.flag.geometry.attributes.position, p0 = WHS.flag.userData.p0; for (let j = 0; j < P.count; j++) { const x = p0[j * 3] + 1.5; P.setZ(j, 0.25 * Math.sin(x * 2.2 - t * 6) * x / 3); } P.needsUpdate = true; WHS.box.position.y = 0; }
  const F = cf(t); applyF(S.cam, F);
  if (k === 'map') { shootTo(rt, S.sc, S.cam); return; }
  const far = F.pos.y > 30 || k === 'nyc' && F.pos.y > 20; if (far) { shootTo(rt, S.sc, S.cam); return; } shootTo(RTS, S.sc, S.cam); aoFor(k).render(renderer, rt, RTS); }
// ---- DOM ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[GONE, 6.0, '<b>8 billion</b> people. Gone.'], [6.0, HOMES, 'Just you two.'],
  [HOMES, 12.0, 'You each get <b>73 million</b> homes…'], [12.0, MARKET, '…and <b>149 million</b> cars.'],
  [MARKET, 18.0, 'Every store is free. Forever.'], [18.0, CAR, 'He’s already on aisle 3.'],
  [CAR, 24.0, 'Speed limits? Nobody’s left to care.'], [24.0, GRID, 'He is not okay.'],
  [GRID, 30.0, 'But within days, the power grid shuts down.'], [30.0, SUBWAY, 'Nobody’s left to run the power plants.'],
  [SUBWAY, 36.0, 'Day 2: New York’s subways flood.'], [36.0, ROT, 'Its pumps moved <b>13 million gallons</b> of water a day. Not anymore.'],
  [ROT, 42.0, 'Week 1: all the fresh food rots.'], [42.0, GAS, 'Canned food? Good for <b>years</b>.'],
  [GAS, 47.5, 'A few months later, the gas goes stale.'], [47.5, PRES, 'Cars won’t start. Bikes it is.'],
  [PRES, 53.8, 'Year 1: you hold an election for President.'], [53.8, COUCH, 'It’s a tie.'],
  [COUCH, 58.5, 'You own <b>73 million</b> homes.'], [58.5, ENDC, 'He still sleeps on <b>your</b> couch.']];
function hudAt(t) { const cnt = (a, b, v0, v1) => lerp(v0, v1, ease(clamp((t - a) / (b - a), 0, 1)));
  if (t >= HOMES && t < 12) return ['HOMES EACH', fmt(cnt(HOMES + 0.3, 11.6, 0, 73.4e6)), 'U.S. CENSUS: 146.8M HOMES'];
  if (t >= 12 && t < MARKET) return ['CARS EACH', fmt(cnt(12.3, 14.6, 0, 149e6)), 'FHWA: 298M REGISTERED VEHICLES'];
  if (t >= GRID && t < SUBWAY) return ['HOMES WITH POWER', Math.round(100 * (1 - clamp((t - GRID - 0.8) / 4.6, 0, 1))) + '%', 'NO OPERATORS → PLANTS TRIP OFFLINE'];
  if (t >= PRES && t < COUCH && t >= 53.8) return ['VOTES', 'YOU 1 · HIM 1', ''];
  return null; }
// Zs only in the wide couch shot (in the close-up his head is behind yours)
function labelsAt(t, i) { if (SHOTS[i][1] !== 'man' || t >= 58.5) return ''; const h = H_(friend).add(V3(0.1, 0.3, 0)); const v = h.project(SETS.man.cam), out = [];
  for (let k = 0; k < 3; k++) { const ph = ((t * 0.7 + k / 3) % 1); out.push(`<div class="lb" style="left:${((v.x + 1) / 2 * W + 30 + 60 * ph + 20 * k).toFixed(0)}px;top:${((1 - v.y) / 2 * H - 40 - 140 * ph).toFixed(0)}px;opacity:${(1 - ph).toFixed(2)};font-size:${(36 + 26 * ph).toFixed(0)}px">Z</div>`); } return out.join(''); }
// kinetic type: words arrive one after another (rise + de-blur + settle), key numbers land with an overshoot, the whole line leaves with a quick lift-blur
const tokens = html => html.replace(/<span class="hl">(.*?)<\/span>/g, (m, x) => x.split(' ').map(w => '\u0001' + w + '\u0002').join(' ')).replace(/<b>(.*?)<\/b>/g, (m, x) => x.split(' ').map(w => '<b>' + w + '</b>').join(' '))
  .split(' ').map(w => w.replace('\u0001', '<span class="hl">').replace('\u0002', '</span>'));   // one token per word, tags kept per word
function kinetic(html, t0, t1, t, o = {}) { const st = o.stagger ?? 0.055, out = smooth(t1 - 0.16, t1, t);
  return tokens(html).map((w, i) => { const k = clamp((t - t0 - i * st) / (o.dur ?? 0.3), 0, 1), e = 1 - Math.pow(1 - k, 3), big = /^<b>|class="hl"/.test(w);
    const sc = big ? 1 + 0.35 * Math.sin(Math.PI * k) * (1 - k * 0.5) : 0.9 + 0.1 * e, y = (1 - e) * (o.rise ?? 34) - out * 26, bl = (1 - e) * 7 + out * 5, rot = (o.tilt ? (1 - e) * (i % 2 ? 8 : -8) : 0);
    return `<span style="display:inline-block;opacity:${(e * (1 - out)).toFixed(3)};transform:translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)}) rotate(${rot.toFixed(1)}deg);filter:blur(${bl.toFixed(1)}px)">${w}</span>`; }).join(' '); }
const TITLE_HTML = el.title.innerHTML, END_HTML = el.endT.innerHTML;
function updateDOM(t, i) {
  // title: words drop in on the crowd shot, then blow away like the people (3.6–4.0 s)
  el.title.style.opacity = t < GONE ? 1 : 0; if (t < GONE) el.title.innerHTML = kinetic(TITLE_HTML, 0.15, GONE, t, { stagger: 0.09, dur: 0.4, rise: -60, tilt: true });
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? kinetic(cp[2], cp[0] + 0.04, cp[1], t) : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2];
    const hs = [[HOMES, 11.6], [12.0, 14.6], [GRID, GRID + 5.4], [53.8, 53.8]].find(([a, b]) => t >= a && t < b + 0.6); const land = hs ? clamp((t - hs[1]) / 0.35, 0, 1) : 1, inn = hs ? clamp((t - hs[0]) / 0.3, 0, 1) : 1;
    el.val.style.transform = `scale(${(1 + 0.18 * Math.sin(Math.PI * land) * (land < 1 ? 1 : 0)) * (0.85 + 0.15 * (1 - Math.pow(1 - inn, 3)))})`; el.val.style.display = 'inline-block'; el.hud.style.filter = `blur(${((1 - inn) * 6).toFixed(1)}px)`; }
  el.labels.innerHTML = labelsAt(t, i);
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = 1; el.endT.innerHTML = t >= ENDC ? kinetic(END_HTML, ENDC + 0.1, 99, t, { stagger: 0.06 }) : '';
  el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); el.endS.style.transform = `translateY(${(20 * (1 - smooth(ENDC + 0.9, ENDC + 1.4, t))).toFixed(1)}px)`; }
// ---- optics: sub-frame motion blur (accumulate K renders across a 180° shutter), depth of field from the AO depth buffer, whip-pan smear ----
const RTACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }), RTDOF = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsq = (mat) => { const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return sc; };
const accMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, uniforms: { tSrc: { value: null }, uW: { value: 0.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0); }' });
const dofMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, tDepth: { value: null }, uNear: { value: 0.08 }, uFar: { value: 3000 }, uFocus: { value: 2 }, uAmt: { value: 26 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tSrc, tDepth; uniform float uNear, uFar, uFocus, uAmt; varying vec2 vUv;
    float dist(vec2 uv){ float d=texture2D(tDepth,uv).x; return uNear*uFar/(uFar-d*(uFar-uNear)); }
    float coc(vec2 uv){ float z=dist(uv); return clamp(abs(z-uFocus)/max(z,0.001)*uAmt,0.0,16.0); }
    void main(){ float c0=coc(vUv); vec3 acc=texture2D(tSrc,vUv).rgb; float w=1.0; vec2 px=vec2(1.0/1080.0,1.0/1920.0);
      for(int i=0;i<24;i++){ float a=float(i)*2.39996; float r=sqrt((float(i)+0.5)/24.0); vec2 o=vec2(cos(a),sin(a))*r*c0*px; float cs=coc(vUv+o);
        float k=smoothstep(r*c0-1.5,r*c0+0.5,cs+0.5*c0); acc+=texture2D(tSrc,vUv+o).rgb*k; w+=k; }
      gl_FragColor=vec4(acc/w,1.0); }` });
const accSc = fsq(accMat), dofSc = fsq(dofMat), MB_K = 4, SHUTTER = 0.5 / 30;
function shotOpts(i) { return SHOTS[i][3] || {}; }
function whipAt(t) { let w = 0; for (const [c, , , o] of SHOTS) if (o && o.whip) { const k = Math.max(0, 1 - Math.abs(t - c) / 0.14); w += o.whip * 0.11 * k * k; } return w; }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  const o = shotOpts(i); let src = RTA;
  if (o.mb) {   // motion blur: average MB_K renders spread over the shutter (stay inside this shot)
    renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA);   // leave the scene posed at t (DOM labels project from it)
  } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && AO[SHOTS[i][1]] && !o.mb) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = AO[SHOTS[i][1]].depthTexture; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  compMat.uniforms.tA.value = src.texture; compMat.uniforms.uWhip.value = whipAt(t); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildMap();
  for (const p of [hero, friend]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
