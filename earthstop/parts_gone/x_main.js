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
    else if (t < 6.4) { P.face('surprised', t); Q.face('surprised', t); P.outer.rotation.y = 0.35 + 0.6 * Math.sin((t - GONE) * 2.2); Q.outer.rotation.y = -0.35 - 0.7 * Math.sin((t - GONE) * 2.0 + 1); }
    else { P.face('wired', t); Q.face('laugh', t); Q.arms[1].rotation.set(-2.6, 0, -0.2 + 0.4 * Math.sin(t * 10)); P.arms.forEach((a, i) => a.rotation.set(-2.7, 0, i ? -0.3 : 0.3)); P.outer.position.y += 0.25 * Math.abs(Math.sin((t - 6.4) * 6)); }
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
    place(P, 0.6, 1.55, -0.35); P.arms.forEach((a, i) => a.rotation.set(-0.15, 0, (i ? -1 : 1) * 0.55)); P.elbows.forEach(e => e.rotation.x = -1.5); P.face(t < 58.5 ? 'squint' : 'smirk', t); }
}
// ---- shots: [start, set, camera(t)] ----
const SETS = { nyc: NYC, st: { sc: st, cam: stCam }, burb: BURB, mkt: MKT, hwy: HWY, sub: SUB, wh: WH, man: MAN, map: { sc: mapScene, cam: mapCam } };
const SHOTS = [
  [0, 'nyc', t => lerpF(LOOK(2.5, 2.0, 11.5, 8.4, 1.8, -2), LOOK(3.4, 1.9, 9.0, 8.5, 1.7, -1), t / 2)],
  [2.0, 'nyc', t => LOOK(8.7, 1.15, 3.9 - 0.2 * (t - 2), 8.5, 1.7, 0.0, 44)],
  [GONE, 'nyc', t => fr(mid(), V3(-0.15, 0.06, 1), lerp(2.6, 2.3, (t - GONE) / 2.4), 0.62)],
  [6.4, 'nyc', t => lerpF(LOOK(6.0, 2.4, 6.5, 8.5, 1.3, 0), LOOK(1.0, 42, 38, 0, 14, -220), ease(clamp((t - 6.4) / 2.5, 0, 1)))],
  [HOMES, 'burb', t => LOOK(-40 + 6 * (t - HOMES), 330, 300, 0, 0, -40, 40)],
  [12.0, 'burb', t => LOOK(900 - 30 + 4 * (t - 12), 120, 190, 900, 0, 0, 40)],
  [MARKET, 'mkt', t => LOOK(0.2, 2.2, -4.5 + 0.2 * (t - MARKET), 0, 1.0, 3.5, 44)],
  [18.0, 'mkt', t => fr(H_(friend), V3(0.75, 0.05, 1), 1.5, 0.62)],
  [CAR, 'nyc', t => { const z = carZ(t); return LOOK(1.2, 1.7, z - 8.5, 0, 1.2, z, 42); }],
  [24.0, 'nyc', t => { const h = H_(friend); return LOOK(h.x - 1.9, h.y + 0.2, h.z - 1.2, h.x, h.y - 0.1, h.z, 42); }],
  [GRID, 'map', t => LOOK(0, 2900 - 50 * (t - GRID), 1500, 0, 0, 30, 30)],
  [SUBWAY, 'sub', t => LOOK(5.5 - 0.15 * (t - SUBWAY), 3.6, 6.5, 0, 0.0, 0, 40)],
  [36.0, 'sub', t => LOOK(-0.8, 2.9, 3.3 - 0.1 * (t - 36), 1.45, 0.45, 0.0, 44)],
  [ROT, 'mkt', t => fr(H_(friend), V3(-0.25, 0.04, -1), 1.35, 0.62)],
  [42.0, 'mkt', t => fr(H_(hero).lerp(H_(friend), 0.4), V3(0.2, 0.06, -1), 2.6, 0.62)],
  [GAS, 'nyc', t => { const z = carZ(t); return LOOK(3.0, 1.6, z - 5.0, 0, 1.0, z, 40); }],
  [47.5, 'nyc', t => { const z = -60 - 4.2 * (t - 47.5); return LOOK(3.6, 1.7, z - 6.5, 0.1, 1.0, z, 40); }],
  [PRES, 'nyc', t => LOOK(0.9, 1.9, -71 - 0.5 * (t - PRES), 0, 9.5, -122, 46)],
  [53.8, 'nyc', t => fr(mid(), V3(0.05, 0.32, 1), 3.4, 0.6)],
  [COUCH, 'man', t => LOOK(3.8 - 0.2 * (t - COUCH), 2.6, 5.0, 0, 0.8, 0.3, 40)],
  [58.5, 'man', t => fr(H_(hero), V3(0.5, 0.1, 1), 2.6, 0.62)],
  [ENDC, 'man', t => LOOK(3.8, 2.6, 5.0, 0, 0.8, 0.3, 40)]];
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
const CAPS = [[GONE, 6.4, '<b>8 billion</b> people. Gone.'], [6.4, HOMES, 'Just you two.'],
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
function labelsAt(t, i) { if (SHOTS[i][1] !== 'man' || t >= ENDC) return ''; const h = H_(friend).add(V3(0.1, 0.3, 0)); const v = h.project(SETS.man.cam), out = [];
  for (let k = 0; k < 3; k++) { const ph = ((t * 0.7 + k / 3) % 1); out.push(`<div class="lb" style="left:${((v.x + 1) / 2 * W + 30 + 60 * ph + 20 * k).toFixed(0)}px;top:${((1 - v.y) / 2 * H - 40 - 140 * ph).toFixed(0)}px;opacity:${(1 - ph).toFixed(2)};font-size:${(36 + 26 * ph).toFixed(0)}px">Z</div>`); } return out.join(''); }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, GONE, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.labels.innerHTML = labelsAt(t, i);
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.7, ENDC + 1.0, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  shoot(i, t, RTA); compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildMap();
  for (const p of [hero, friend]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
