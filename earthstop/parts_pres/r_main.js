// =================== THE STORY: one day as President — poses, shots (moving cameras, DOF, motion blur, whips), captions/HUD, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
const CAST = [hero, ...AGENTS, aide, butler];
function hideCast() { CAST.forEach(P => P.outer.visible = false); KEYRING.visible = false; BILL.visible = false; BALL.visible = false; }
function stand(P, x, z, ry, t, face) { poseReset(P, t); place(P, x, z, ry); if (face) P.face(face, t); }
// ---- poses per beat ----
function pose(t, k) { hideCast(); BEASTG.door.rotation.y = 0;
  if (k === 'in' && t < WHX) { const P = hero; poseReset(P, t); place(P, -0.9, -1.75, 0, seatY(P, 0.72) - 0.95); poseSit(P); P.legs.forEach(l => l.rotation.x = -1.45); P.knees.forEach(q => q.rotation.x = 0.05);
    P.arms.forEach((a, i) => a.rotation.set(-0.35, 0, (i ? -1 : 1) * 0.15)); P.face(t < 1.0 ? 'sleep' : t < 1.6 ? 'sleepy' : 'surprised', t);
    stand(AGENTS[0], -1.52, 0.5, Math.PI * 0.95, t, 'neutral'); stand(AGENTS[1], -0.28, 0.5, -Math.PI * 0.95, t, t > 1.4 ? 'smirk' : 'neutral'); }
  else if (k === 'in' && t >= AIDE && t < KEYS) { const z = 9 - 1.15 * (t - AIDE); stand(hero, 40.2, z, Math.PI, t); poseWalk(hero, t * 6.5, 1); hero.face(t < 10.4 ? 'happy' : 'worried', t);
    stand(aide, 40.75, z + 1.5, Math.PI, t, 'neutral'); poseWalk(aide, t * 6.5 + 1.2, 0.9); aide.arms[1].rotation.set(0.05, 0, 0.05); aide.elbows[1].rotation.x = -0.1;
    stand(AGENTS[2], 38.9, z + 2.6, Math.PI, t, 'neutral'); poseWalk(AGENTS[2], t * 6.5 + 2.4, 0.9); }
  else if (k === 'ex' && t >= KEYS && t < BEAST) { const u = clamp(span(t, KEYS, 15.6), 0, 1); const hx = lerp(-3.5, -7.2, esin(u)), hz = lerp(-12, -15.4, esin(u)); stand(hero, hx, hz, Math.atan2(-9 - hx, -18 - hz), t); poseWalk(hero, t * 6, 1 - smooth(15.2, 15.6, t));
    hero.arms[1].rotation.set(-0.55 * smooth(14.6, 15.2, t), 0, 0.1); hero.elbows[1].rotation.x = -0.6 * smooth(14.6, 15.2, t); hero.face(t < 16.3 ? 'happy' : 'sad', t);
    const A = AGENTS[3]; const ax = lerp(-2.0, hx + 0.9, esin(span(t, 15.0, 16.0))), az = lerp(-10.5, hz + 0.6, esin(span(t, 15.0, 16.0))); stand(A, ax, az, Math.atan2(hx - ax, hz - az), t, 'neutral'); if (t < 16.0) poseWalk(A, t * 7, 1);
    A.arms[1].rotation.set(-0.6 * smooth(15.8, 16.2, t), 0, -0.1); A.elbows[1].rotation.x = -0.5 * smooth(15.8, 16.2, t);
    const hand = (P, side) => (P.outer.updateMatrixWorld(true), P.elbows[side].localToWorld(V3(0, -0.3, 0.02)));
    KEYRING.visible = true; KEYRING.position.copy(t < 16.3 ? hand(hero, 1) : hand(A, 1)); KEYRING.rotation.set(0, t * 0.5, 0.3); }
  else if (k === 'ex' && t >= BEAST && t < AF1) { const dw = BEASTG.door; const open = smooth(21.6, 23.8, t) * 1.0; dw.rotation.y = open;
    BEASTG.updateMatrixWorld(true); const hp = BEASTG.localToWorld(V3(-1.06 - 1.25 * Math.sin(open) - 0.45, 0, 0.35 - 1.25 * Math.cos(open) - 0.35));
    stand(hero, hp.x, hp.z, Math.PI / 2 - open * 0.8, t); hero.outer.rotation.x = 0; hero.outer.rotation.order = 'YXZ'; hero.outer.rotation.x = -0.12 * smooth(21.3, 21.8, t);
    hero.arms.forEach((a, i) => a.rotation.set(-0.6 * smooth(20.8, 21.4, t), 0, (i ? -1 : 1) * 0.05)); hero.elbows.forEach(e => e.rotation.x = -0.35); hero.face(t < 21.3 ? 'proud' : t < 23 ? 'angry' : 'squint', t);
    stand(AGENTS[4], 8.6, -11.0, -2.6, t, 'neutral'); }
  else if (k === 'sky' && t >= 28 && t < MAIL) { const P = hero; poseReset(P, t); place(P, 2000 - 0.9, 0.6, Math.PI, seatY(P, 0.53) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.x = -0.9); P.elbows.forEach(e => e.rotation.x = -0.5);
    if (t > 33.6) { P.arms[1].rotation.set(-0.6, 0, 0.2); P.elbows[1].rotation.x = -1.1; } P.face(t < 29.6 ? 'happy' : t < PAY ? 'surprised' : t < 33.6 ? 'worried' : 'crying', t); }
  else if (k === 'in' && t >= MAIL && t < DINE) { stand(hero, 120, -0.6, 0, t); const r = smooth(MAIL + 0.6, MAIL + 1.2, t); hero.arms.forEach((a, i) => a.rotation.set(-0.5 * r, 0, (i ? -1 : 1) * (0.1 + 0.3 * r))); hero.elbows.forEach(e => e.rotation.x = -0.9 * r);
    hero.face(t < MAIL + 0.8 ? 'happy' : t < MAIL + 3 ? 'surprised' : 'crying', t); }
  else if (k === 'in' && t >= DINE && t < BOWL) { const P = hero; poseReset(P, t); place(P, 80 - 0.95, 1.38, Math.PI / 2, seatY(P, 0.52) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.x = -1.0); P.elbows.forEach(e => e.rotation.x = -0.55);
    P.face(t < 46.4 ? 'happy' : t < 47.4 ? 'surprised' : 'sad', t);
    const bu = butler; const bz = lerp(4.0, 1.9, esin(span(t, 44.6, 46.2))); stand(bu, 80 - 0.25, bz, Math.PI, t, 'neutral'); if (t < 46.2) poseWalk(bu, t * 6, 1); const lift = smooth(45.6, 46.2, t) * (1 - smooth(46.6, 47.0, t));
    bu.arms[1].rotation.set(-0.6 * lift, 0, 0); bu.elbows[1].rotation.x = -1.0 * lift; BILL.visible = true;
    if (t < 46.6) { bu.outer.updateMatrixWorld(true); BILL.position.copy(bu.elbows[1].localToWorld(V3(0, -0.3, 0.12))); BILL.rotation.set(0, 0, 0); } else BILL.position.set(80 - 0.48, 0.81, 1.05); }
  else if (k === 'in' && t >= BOWL && t < SNEAK) { const u = t - BOWL; stand(hero, 160 + 0.12, 8.4 - 0.9 * smooth(0.2, 1.2, u), Math.PI, t); if (u < 1.2) poseWalk(hero, t * 7, 0.8);
    const sw = smooth(0.6, 1.2, u) * (1 - smooth(1.3, 1.8, u)); hero.arms[1].rotation.set(0.45 * sw - 0.6 * smooth(1.2, 1.4, u) * (1 - smooth(1.8, 2.2, u)), 0, 0.05); hero.outer.rotation.order = 'YXZ'; hero.outer.rotation.x = 0.18 * sw;
    const cheer = smooth(3.7, 4.0, u); if (cheer > 0) { hero.arms.forEach((a, i) => a.rotation.set(-0.6 * cheer, 0, (i ? -1 : 1) * 0.45 * cheer)); hero.elbows.forEach(e => e.rotation.x = -1.6 * cheer); hero.outer.position.y += 0.08 * Math.abs(Math.sin((u - 3.7) * 7)) * cheer; }
    hero.face(u < 3.6 ? 'squint' : 'laugh', t); bowlAt(t, BOWL, BOWL + 3.575); }
  else if (k === 'in' && t >= SNEAK && t < ENDC) { const z = -9 + 1.6 * (t - SNEAK); stand(hero, 40.1, z, 0, t); poseWalk(hero, t * 4, 0.45); hero.outer.rotation.order = 'YXZ'; hero.outer.rotation.x = 0.12; hero.knees.forEach(q => q.rotation.x += 0.25);
    hero.face(t < 56.4 ? 'smirk' : 'surprised', t);
    const pops = [[56.0, -1, -6], [57.0, 1, -2], [58.0, -1, 2], [59.0, 1, 6]]; pops.forEach(([tp, sx, dz], i) => { const A = AGENTS[i + 1]; const k2 = smooth(tp, tp + 0.25, t); if (k2 <= 0) return; const hz2 = -9 + 1.6 * (t - SNEAK); stand(A, 40.1 + sx * lerp(2.6, 0.8, k2), Math.min(dz, hz2 + 1.0), -sx * Math.PI / 2, t, 'neutral'); A.shades.visible = false; });
    if (t > 59.0) { const A = AGENTS[4]; stand(A, 40.1, z + 1.3 - 0.2 * smooth(59, 59.3, t), Math.PI, t, 'smirk'); } }
}
// ---- shots: [start, set, camera(t), opts{mb, dof, whip, ao}] ----
const SETS = { in: IN, ex: EX, sky: SKY };
const BEDH = () => H_(hero);
const SHOTS = [
  [WAKE, 'in', t => { const u = esin(span(t, WAKE, WHX)); return LOOK(-0.9, lerp(1.7, 1.45, u), lerp(2.9, 1.5, u), -0.9, lerp(1.62, 1.66, u), -1.75, lerp(54, 40, u)); }],
  [WHX, 'ex', t => { const u = esin(span(t, WHX, AIDE)); return LOOK(lerp(-30, 6, u), lerp(70, 14, u), lerp(170, 30, u), 0, lerp(8, 12, u), -30, 44); }, { whip: 1, far: true }],
  [AIDE, 'in', t => { const z = 9 - 1.15 * (t - AIDE); return LOOK(40.3 + 0.4 * Math.sin(t * 0.6), 1.5, z - 3.4 + 0.5 * esin(span(t, AIDE, 10.4)), 40.4, 1.25, z + 0.8, 42); }, { dof: () => H_(hero) }],
  [10.4, 'in', t => { aide.outer.updateMatrixWorld(true); const b = football.getWorldPosition(V3(0, 0, 0)); const u = esin(span(t, 10.4, KEYS)); return LOOK(b.x + 1.1 - 0.3 * u, b.y + 0.25, b.z - 1.2 + 0.2 * u, b.x, b.y + 0.1, b.z, 40); }, { dof: () => football.getWorldPosition(V3(0, 0, 0)) }],
  [KEYS, 'ex', t => { const u = esin(span(t, KEYS, BEAST)); const h = H_(hero); const d = V3(-5.5, 0, -6).normalize(), pp = V3(-d.z, 0, d.x); return LOOK(h.x + d.x * lerp(3.2, 2.4, u) + pp.x * 1.2, 1.55, h.z + d.z * lerp(3.2, 2.4, u) + pp.z * 1.2, h.x + 0.3, 1.25, h.z + 0.3, 44); }, { dof: () => H_(hero) }],
  [BEAST, 'ex', t => { const u = esin(span(t, BEAST, 21.4)); BEASTG.updateMatrixWorld(true); return LOOK(...BEASTG.localToWorld(V3(-4.2, 0.5, lerp(6.5, 0.5, u))).toArray(), ...BEASTG.localToWorld(V3(0, 1.1, lerp(1.5, -0.8, u))).toArray(), 46); }, { mb: true }],
  [21.4, 'ex', t => { const u = esin(span(t, 21.4, AF1)); BEASTG.updateMatrixWorld(true); const p = BEASTG.localToWorld(V3(-5.4 + 0.8 * u, 1.7, 4.2 - 0.6 * u)), l = BEASTG.localToWorld(V3(-1.7, 1.05, -0.9)); return LOOK(p.x, p.y, p.z, l.x, l.y, l.z, 42); }, { dof: () => H_(hero) }],
  [AF1, 'sky', t => { const u = esin(span(t, AF1, 28)); return LOOK(lerp(150, 95, u), lerp(-25, 12, u), JET.position.z + lerp(170, 70, u), 0, 2, JET.position.z - 5, 44); }, { whip: -1, mb: true, far: true }],
  [28, 'sky', t => orbit(H_(hero), V3(0.4, 0.05, -1), -0.3, 0.2, 2.0, 1.5, 0.62, span(t, 28, PAY), 42), { dof: () => H_(hero) }],
  [PAY, 'sky', t => orbit(H_(hero), V3(-0.5, 0.06, -1), 0.25, -0.2, 1.6, 1.15, 0.6, span(t, PAY, MAIL), 40), { dof: () => H_(hero) }],
  [MAIL, 'in', t => { const u = esin(span(t, MAIL, DINE)); return LOOK(120 + lerp(1.0, 0.4, u), lerp(1.7, 1.55, u), lerp(2.8, 2.0, u), 120, 1.25, -0.6, 44); }, { dof: () => H_(hero) }],
  [DINE, 'in', t => { const u = esin(span(t, DINE, BOWL)); return LOOK(80 + lerp(0.9, 0.6, u), lerp(1.45, 1.3, u), lerp(-0.2, 0.2, u), 80 - 0.8, 1.05, 1.45, 42); }, { dof: () => H_(hero) }],
  [BOWL, 'in', t => { const u = esin(span(t, BOWL, 52.0)); return LOOK(160 + 0.9 - 0.5 * u, lerp(1.3, 0.75, u), lerp(10.5, 9.0, u) - 2.5 * u * u, 160, lerp(1.0, 0.3, u), lerp(7, -4, u), 46); }, { mb: true, whip: 1 }],
  [52.0, 'in', t => { const u = esin(span(t, 52.0, 53.6)); return LOOK(160 + 0.6, 0.4, -7.2 - 0.6 * u, 160, 0.2, -9.9, 44); }, { mb: true }],
  [53.6, 'in', t => orbit(H_(hero), V3(0.3, 0.05, -1), -0.25, 0.25, 2.3, 1.9, 0.62, span(t, 53.6, SNEAK), 42), { dof: () => H_(hero) }],
  [SNEAK, 'in', t => { const h = H_(hero); const u = esin(span(t, SNEAK, ENDC)); return LOOK(40.1 + 0.6 * Math.sin(t * 0.7), 1.45, h.z + lerp(3.6, 2.6, u), 40.1, 1.3, h.z - 0.2, 44); }, { dof: () => H_(hero) }],
  [ENDC, 'in', t => { const h = H_(hero); return LOOK(40.1, 1.45, h.z + 2.6, 40.1, 1.3, h.z, 44); }]];
// per-set state: room lights for the active beat, night hall, flags, window glow
function setState(t, k) { waveFlags(t);
  if (k === 'in') { const night = t >= SNEAK; RL.hall.forEach((L, i) => L.intensity = night ? (i === 1 ? 2 : 0.6) : 14); RL.moon.intensity = night ? 8 : 0; IN.sc.userData.hemi.intensity = night ? 0.12 : 0.55; IN.sc.userData.sun.intensity = night ? 0 : 2.6;
    const s = IN.sc.userData.sun; const roomX = t < WHX ? 0 : t < KEYS || t >= SNEAK ? 40 : t < DINE ? 120 : t < BOWL ? 80 : 160; s.target.position.set(roomX, 0, 0); s.position.set(roomX + 9, 9, 6); mailAt(t, MAIL + 0.5); }
  if (k === 'ex') { EX.winM.emissiveIntensity = 0.15; }
  if (k === 'sky') { JET.position.set(0, 0, 120 * (t - AF1)); JET.rotation.set(0.02 * Math.sin(t * 0.7), 0, 0.03 * Math.sin(t * 0.5)); SKY.sc.userData.sun.target.position.copy(JET.position); SKY.sc.userData.sun.position.copy(JET.position).add(V3(80, 120, 60)); } }
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rim = new THREE.PointLight(0xcfe0ff, 0, 5, 1.5);
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, k, cf, o = {}] = SHOTS[i], S = SETS[k]; puffsReset(); CAST.forEach(P => S.sc.add(P.outer)); S.sc.add(rim);
  setState(t, k); pose(t, k); const F = cf(t); applyF(S.cam, F); S.cam.near = o.far ? 0.5 : 0.06; S.cam.far = o.far ? 3000 : 1700; S.cam.updateProjectionMatrix(); S.cam.updateMatrixWorld();
  if (hero.outer.visible) { const h = H_(hero), back = h.clone().sub(S.cam.position).setY(0).normalize(); rim.position.copy(h).add(back.multiplyScalar(1.0)).add(V3(0, 0.45, 0)); rim.intensity = t >= SNEAK ? 4 : 7; rim.color.set(k === 'ex' ? '#ffe0b8' : t >= SNEAK ? '#8aa8ff' : '#ffe8d0'); } else rim.intensity = 0;
  if (o.far) { shootTo(rt, S.sc, S.cam); return; } shootTo(RTS, S.sc, S.cam);
  const hid = []; S.sc.traverse(q => { if (q.isSprite && q.visible) { hid.push(q); q.visible = false; } }); aoFor(k).render(renderer, rt, RTS); hid.forEach(q => { q.visible = true; }); }
// ---- DOM: title fades, captions pop (series style), HUD (clock / counters), end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[0.2, WHX, 'You wake up. You’re the <b>President</b>.'], [WHX, AIDE, '<b>132</b> rooms. <b>35</b> bathrooms.<br>You live here now.'], [AIDE, 10.4, 'This guy follows you <b>everywhere</b>.'], [10.4, KEYS, 'He carries the <b>nuclear football</b>.'],
  [KEYS, BEAST, 'Presidents aren’t allowed to <b>drive</b>.<br>Not since LBJ.'], [BEAST, AF1, 'Your ride: <b>“The Beast.”</b><br>Doors <b>8 inches</b> thick.'], [AF1, PAY, 'Air Force One: about<br><b>$178,000</b> per flight hour.'],
  [PAY, MAIL, 'Your pay: <b>$1,096</b> a day.<br>One flight hour = <b>162 days</b> of salary.'], [MAIL, DINE, '<b>65,000</b> letters a week.<br><b>100,000</b> emails a day.'], [DINE, BOWL, 'Plot twist: you pay for<br>your own <b>groceries</b>.'],
  [BOWL, SNEAK, 'Yes, there’s a <b>bowling alley</b>.'], [SNEAK, ENDC, 'You can’t go anywhere <b>alone</b>. Ever.']];
const clockAt = t => { const m = 6 * 60 + clamp(t / ENDC, 0, 1) * (17 * 60 + 59); const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); const ap = h < 12 ? 'AM' : 'PM', h12 = ((h + 11) % 12) + 1; return `${h12}:${String(mm).padStart(2, '0')} ${ap}`; };
function hudAt(t) { const cnt = (a, b, v) => v * ease(clamp((t - a) / (b - a), 0, 1));
  if (t >= 28 && t < PAY) return ['AIR FORCE ONE · COST', '$' + fmt(cnt(28.2, 29.6, 177843)) + ' / HR', 'FUEL, CREW, UPKEEP · FY2021'];
  if (t >= PAY && t < MAIL) return ['YOUR SALARY', t < 33.6 ? '$' + fmt(cnt(PAY + 0.2, PAY + 1.2, 1096)) + ' / DAY' : fmt(cnt(33.6, 34.6, 162)) + ' DAYS', t < 33.6 ? '$400,000 A YEAR' : '= ONE HOUR IN THE AIR'];
  if (t >= MAIL && t < DINE) return ['MAIL TO THE PRESIDENT', fmt(cnt(MAIL + 0.3, MAIL + 2.5, 65000)) + ' / WK', '+ 100,000 EMAILS A DAY'];
  if (t < ENDC && t >= WHX) return ['DAY 1 OF 1', clockAt(t), 'PRESIDENT OF THE UNITED STATES'];
  return null; }
function updateDOM(t) {
  el.title.style.opacity = fadeWin(t, 0, WHX, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp && t > 0.15 ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); }
// ---- optics: sub-frame motion blur, depth of field from the AO depth buffer, whip-pan smear ----
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
function whipAt(t) { let w = 0; for (const [c, , , o] of SHOTS) if (o && o.whip) { const k = Math.max(0, 1 - Math.abs(t - c) / 0.14); w += o.whip * 0.11 * k * k; } return w; }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  updateDOM(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#120e16', 1); renderer.clear(); return true; }
  const o = SHOTS[i][3] || {}; let src = RTA;
  if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA); } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && !o.mb && !o.far) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = aoFor(SHOTS[i][1]).depthTexture; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  const u = compMat.uniforms; u.tA.value = src.texture; u.uWhip.value = whipAt(t); u.uPixOn.value = 0; u.uRed.value = 0; u.uT.value = t; u.uSepia.value = 0; u.uLook.value = 0.12; u.uTilt.value = 0;
  composite(0, t >= SNEAK ? 1.35 : 1.0, 1.0); u.tA.value = RTA.texture; return true; };
window.DBG = { THREE, hero, AGENTS, SETS, SHOTS };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const P of CAST) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(P.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
