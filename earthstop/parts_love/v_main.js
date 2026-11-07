// =================== THE STORY: the day you meet her — poses, shots on the beat grid, x-ray, the life montage, captions/HUD/bubbles, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const LOOKV = (p, l, fov = 40) => ({ pos: p.clone(), look: l.clone(), fov });
const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
const CAST = [hero, her, herWed, heroOld, herOld, kidA, kidB, gkA, gkB, barista];
const SW = 0.16;   // sidewalk top
function hideCast() { CAST.forEach(P => P.outer.visible = false); CUP.visible = false; BOOKS.forEach(b => b.visible = false); SPLASH.visible = false; BABY.visible = false; HL.brush.visible = false; GROOM.set(false); DATECUPS.forEach(c => c.visible = false); PL.ball.visible = false; PL.kite.visible = false; }
function stand(P, x, z, ry, t, face, y = 0) { poseReset(P, t); place(P, x, z, ry, y); if (face) P.face(face, t); }
const handW = (P, s) => (P.outer.updateMatrixWorld(true), P.elbows[s].localToWorld(V3(0, -0.3, 0.03)));
function squat(P, k, lean = 0.3) { P.legs.forEach(l => l.rotation.x = -1.25 * k); P.knees.forEach(q => q.rotation.x = 1.95 * k); P.outer.position.y -= 0.5 * k; P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = lean * k; }
function sitDown(P, x, z, ry, seat, t, face) { poseReset(P, t); place(P, x, z, ry, seatY(P, seat) - 0.95); poseSit(P); if (face) P.face(face, t); }
// story positions on the street: he comes out of the cafe and walks +z on the left sidewalk; she walks -z toward him; they meet at z ≈ 12.4 at BUMP
const HX = -6.3, MZ = 12.4;
const hisZ = t => t < BUMP ? lerp(-0.8, MZ - 0.45, clamp((t - OUT) / (BUMP - OUT), 0, 1)) : MZ - 0.45 - 0.12 * smooth(BUMP, BUMP + 0.3, t);
const herZ = t => t < BUMP ? MZ + 0.45 + 1.0 * (BUMP - t) : MZ + 0.45 + 0.1 * smooth(BUMP, BUMP + 0.3, t);
// ---- poses ----
function pose(t, k) { hideCast();
  if (k === 'home' && t < bt(0)) { sitDown(hero, -0.6, -1.7, 0, 0.62, t, t < 0.9 ? 'sleep' : t < 1.4 ? 'sleepy' : 'happy'); hero.legs.forEach(l => l.rotation.x = -1.45); hero.arms.forEach((a, i) => a.rotation.set(-0.3, 0, (i ? -1 : 1) * 0.2)); hero.outer.rotation.x = -0.25 + 0.25 * smooth(0.6, 1.4, t); }
  else if (k === 'home' && t < bt(2)) { stand(hero, 10 - 0.7, 0, -Math.PI / 2, t, 'squint'); hero.arms[1].rotation.set(-0.6, 0, 0.35); hero.elbows[1].rotation.x = -1.9; HL.brush.visible = true; const hd = H_(hero); HL.brush.position.set(hd.x - 0.12, hd.y - 0.06, hd.z + 0.02 * Math.sin(t * 30)); HL.brush.rotation.set(Math.PI / 2, 0, 0); }
  else if (k === 'home' && t < bt(4)) { stand(hero, 0.7, 0.7, Math.PI / 2 + 0.3, t, 'proud'); hero.arms.forEach((a, i) => a.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.35)); hero.elbows.forEach(e => e.rotation.x = -1.8); }
  else if (k === 'home' && t < STREET) { const u = span(t, bt(4), STREET); stand(hero, 20 + lerp(1.2, -2.6, u), 0.8, -Math.PI / 2, t, 'happy'); poseWalk(hero, t * 7, 1); }
  else if (k === 'str' && t < CAFE) { const z = 9 - 1.35 * (t - STREET); stand(hero, HX, z, Math.PI, t, 'happy', SW); poseWalk(hero, t * 6.6, 1); }
  else if (k === 'caf' && t < OUT) { stand(hero, 0.2, -1.1, Math.PI, t, t < bt(28) ? 'happy' : 'love'); stand(barista, -0.4, -2.75, 0, t, 'happy'); const give = smooth(bt(26), bt(27.5), t);
    barista.arms[1].rotation.set(-0.6 * give, 0, -0.1); barista.elbows[1].rotation.x = -0.7 * give; hero.arms[1].rotation.set(-0.55 * smooth(bt(27), bt(28), t), 0, 0.1); hero.elbows[1].rotation.x = -0.8 * smooth(bt(27), bt(28), t);
    CUP.visible = true; CAFS.sc.add(CUP); CUP.position.copy(t < bt(27.6) ? handW(barista, 1) : handW(hero, 1)); CUP.rotation.set(0, 0, 0); }
  else if (k === 'str' && t >= OUT && t < BRAIN || k === 'str' && t >= HI && t < LIFE) { STR.sc.add(CUP); const hz = hisZ(t), sz = herZ(t);
    // him: phone in the left hand, cup in the right, eyes down; the bump; squat to pick up the books; stand up for "hi"
    stand(hero, HX, hz, 0, t, 'neutral', SW); const walking = t < BUMP; if (walking) poseWalk(hero, t * 6.2, 0.9);
    hero.arms[0].rotation.set(-0.55, 0, 0.1); hero.elbows[0].rotation.x = -1.3; hero.head.rotation.x = walking ? 0.25 : 0; hero.arms[1].rotation.set(walking ? -0.3 : -0.1, 0, 0.1); hero.elbows[1].rotation.x = walking ? -1.0 : -0.3;
    if (t >= MEET) { stand(her, HX + 0.1, sz, Math.PI, t, 'happy', SW); if (walking) poseWalk(her, t * 6.4 + 1, 0.9); her.arms.forEach((a, i) => a.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.15)); her.elbows.forEach(e => e.rotation.x = -1.5); her.head.rotation.x = walking ? 0.2 : 0; }
    const sq = smooth(bt(60), bt(61.5), t) * (1 - smooth(HI, HI + 0.5, t)); if (sq > 0) { squat(hero, sq, 0.35); squat(her, sq, 0.35); const reach = smooth(bt(61), bt(62.6), t); hero.arms[1].rotation.set(-0.62 * reach, 0, -0.05); hero.elbows[1].rotation.x = -0.2; her.arms[0].rotation.set(-0.62 * reach, 0, 0.05); her.elbows[0].rotation.x = -0.2; hero.head.rotation.x = -0.15 * smooth(MAGIC - 0.3, MAGIC, t); her.head.rotation.x = -0.15 * smooth(MAGIC - 0.3, MAGIC, t); }
    if (t > BUMP) { hero.face(t < bt(60) ? 'surprised' : t < MAGIC ? 'worried' : 'love', t); her.face(t < bt(60) ? 'surprised' : t < MAGIC ? 'happy' : 'love', t); }
    if (t >= HI) { her.face('happy', t); hero.face('love', t); }
    // the cup: in his hand → flies at the bump (ballistic) → lies on the sidewalk; the splash
    CUP.visible = true; const a = t - BUMP, h0 = V3(HX + 0.12, SW + 1.05, MZ - 0.2);
    if (a < 0) { CUP.position.copy(handW(hero, 1)); CUP.rotation.set(0, 0, 0); } else { const tl = 0.62, u = Math.min(a, tl); CUP.position.set(h0.x + 0.9 * u, Math.max(SW + 0.05, h0.y + 2.2 * u - 4.9 * u * u * 1.6), h0.z + 0.5 * u); CUP.rotation.set(9 * u, 0, a < tl ? 7 * u : Math.PI / 2); }
    SPLASH.visible = a > 0 && a < 1.6; if (SPLASH.visible) { const P = SPLASH.geometry.attributes.position.array; for (let i = 0; i < 160; i++) { const v = V3(hash(i) - 0.3, 0.6 + hash(i * 3), hash(i * 5) - 0.5).multiplyScalar(2.2), u = Math.min(a, 0.55); P[i * 3] = h0.x + v.x * u; P[i * 3 + 1] = Math.max(SW + 0.01, h0.y + v.y * u - 4.9 * u * u); P[i * 3 + 2] = h0.z + v.z * u; } SPLASH.geometry.attributes.position.needsUpdate = true; }
    // the books: in her arms → fly → scattered; the red one lies between them (both reach for it)
    if (t >= MEET) BOOKS.forEach((b, i) => { b.visible = true; const rest = [V3(HX - 0.05, SW + 0.02, MZ), V3(HX + 0.45, SW + 0.02, MZ + 0.35), V3(HX - 0.4, SW + 0.02, MZ + 0.55)][i];
      if (a < 0) { b.position.copy(her.outer.position).add(V3(0.02, 0.18 + i * 0.04 - 0.95 + 1.12, -0.2)); b.rotation.set(0.2, 0, 0); } else { const u = clamp(a / 0.7, 0, 1); const st = her.outer.position.clone().add(V3(0, 0.2, -0.2)); b.position.lerpVectors(st, rest, u); b.position.y += 0.6 * Math.sin(Math.PI * u); b.rotation.set(0, 2 * i + 4 * u, (1 - u) * 6 * u); } }); }
  else if (k === 'xr') { [xHim, xHer].forEach((P, i) => { poseReset(P, t); place(P, i ? 0.3 : -0.3, 0, i ? -Math.PI / 2 : Math.PI / 2); P.face('love', t); P.head.rotation.x = -0.05; });
    const beatK = t => Math.pow(Math.max(0, Math.sin(Math.PI * ((t - 1.93) / BEAT))), 8);
    [xHim, xHer].forEach((P, i) => { P.outer.updateMatrixWorld(true); const hd = H_(P); BRAINS[i].position.copy(hd).add(V3(0, 0.07, 0)); const glow = smooth(BRAIN, BRAIN + 0.6, t); BRAINS[i].scale.setScalar(0.4 + 0.7 * glow + 0.15 * glow * beatK(t)); BRAINS[i].rotation.y = t * 0.6;
      const ch = P.torso.localToWorld(V3(0.03, 1.26, 0.06)); HEARTS[i].position.copy(ch); HEARTS[i].lookAt(XR.cam.position); const sync = smooth(HEART + 0.4, BUTTER - 0.3, t), ph = i ? 0.37 * (1 - sync) : 0; HEARTS[i].scale.setScalar(1.0 + 0.35 * beatK(t + ph * BEAT));
      HEARTS[i].visible = t >= HEART - 0.3; BRAINS[i].visible = true; });
    FLIES.forEach((f, j) => { const P = j % 2 ? xHer : xHim; const c = P.torso.localToWorld(V3(0, 1.02, 0.02)); const on = smooth(BUTTER, BUTTER + 0.5, t); f.visible = on > 0.01; const a = t * (2 + hash(j)) + j; f.position.copy(c).add(V3(Math.cos(a) * 0.1, Math.sin(a * 1.3) * 0.08, Math.sin(a) * 0.1)); f.lookAt(c); f.children.forEach(w => w.rotation.y = w.userData.s * (0.3 + 0.9 * Math.abs(Math.sin(t * 22 + j)))); f.scale.setScalar(on); }); }
  else if (k === 'caf' && t >= LIFE) { sitDown(hero, 2.2 - 0.62, 1.4, Math.PI / 2, 0.48, t, 'laugh'); sitDown(her, 2.2 + 0.62, 1.4, -Math.PI / 2, 0.48, t, 'laugh'); [hero, her].forEach(P => { P.arms.forEach(a => a.rotation.x = -0.9); P.elbows.forEach(e => e.rotation.x = -0.6); });
    DATECUPS.forEach((c, i) => { c.visible = true; c.position.set(2.2 + (i ? 0.2 : -0.2), 0.8, 1.42 + (i ? 0.05 : -0.05)); }); }
  else if (k === 'home' && t >= LIFE) { const yr = t < bt(87) ? 1 : t < bt(99) ? 5 : 35; HL.boxes.visible = yr === 1; HL.crib.visible = yr === 5; HL.frames.forEach((f, i) => f.visible = i < (yr === 1 ? 1 : yr === 5 ? 3 : 6));
    if (yr === 1) { stand(hero, 19.75, 0.7, Math.PI / 2, t, 'laugh'); stand(her, 20.95, 0.7, -Math.PI / 2, t, 'laugh'); [hero, her].forEach(P => { P.arms.forEach((a, i) => a.rotation.set(-0.55, 0, (i ? -1 : 1) * 0.05)); P.elbows.forEach(e => e.rotation.x = -1.0); });
      if (!LIV.userData.carry) { LIV.userData.carry = rb(0.55, 0.42, 0.45, M('#b88a5a', { roughness: 0.9 }), 0, 0, 0, HOME.sc, 0.02); } LIV.userData.carry.visible = true; LIV.userData.carry.position.set(20.35, 1.05 + 0.03 * Math.sin(t * 6), 0.7); }
    else { if (LIV.userData.carry) LIV.userData.carry.visible = false; }
    if (yr === 5) { stand(her, 20.55, 0.4, -0.25, t, 'love'); her.arms.forEach((a, i) => a.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.3)); her.elbows.forEach(e => e.rotation.x = -1.5); BABY.visible = true; BABY.position.copy(her.torso.localToWorld(V3(0, 1.12, 0.22))); BABY.rotation.set(0, -0.25 + Math.PI / 2, 0.15);
      stand(hero, 20.0, 0.55, 0.5, t, 'love'); hero.head.rotation.x = 0.25; hero.arms[1].rotation.set(-0.45, 0, 0.3); hero.elbows[1].rotation.x = -1.1; }
    if (yr === 35) { sitDown(heroOld, 19.25, -1.45, 0, 0.5, t, 'laugh'); sitDown(herOld, 19.8, -1.45, 0, 0.5, t, 'laugh'); [heroOld, herOld].forEach(P => { P.arms.forEach(a => a.rotation.x = -0.8); P.elbows.forEach(e => e.rotation.x = -0.6); }); heroOld.arms[1].rotation.set(-0.3, 0, -0.4); herOld.arms[0].rotation.set(-0.3, 0, 0.4); } }
  else if (k === 'park') { const wed = t < bt(91); PL.arch.visible = wed; petalsAt(t, wed);
    if (wed) { stand(hero, -0.33, -5.4, Math.PI / 2, t, 'love'); GROOM.set(true); stand(herWed, 0.33, -5.4, -Math.PI / 2, t, 'love'); [hero, herWed].forEach((P, i) => { P.arms.forEach((a, j) => a.rotation.set(-0.5, 0, (j ? -1 : 1) * 0.1)); P.elbows.forEach(e => e.rotation.x = -0.6); P.head.rotation.x = 0.1; }); }
    else if (t < bt(99)) { stand(hero, -0.5, -2.4, 0.25, t, 'laugh'); stand(her, 0.2, -2.4, -0.2, t, 'laugh'); her.arms[0].rotation.set(-0.3, 0, 0.2); hero.arms[1].rotation.set(-0.3, 0, -0.2);
      [kidA, kidB].forEach((P, i) => { const a = t * 1.6 + i * Math.PI; stand(P, Math.cos(a) * 1.3, -0.6 + Math.sin(a) * 0.9, a + (i ? Math.PI : 0) + Math.PI / 2, t, 'laugh'); poseWalk(P, t * 10 + i, 1); P.outer.position.y += 0.06 * Math.abs(Math.sin(t * 10 + i)); });
      PL.ball.visible = true; const ba = t * 2.3; PL.ball.position.set(Math.cos(ba) * 0.9, 0.11 + 0.5 * Math.abs(Math.sin(t * 4)), -0.5 + Math.sin(ba) * 0.6); }
    else { sitDown(heroOld, -0.32, -3.15, 0, 0.47, t, 'happy'); sitDown(herOld, 0.32, -3.15, 0, 0.47, t, 'happy'); heroOld.arms[1].rotation.set(-0.35, 0, -0.42); heroOld.elbows[1].rotation.x = -0.4; herOld.arms[0].rotation.set(-0.35, 0, 0.42); herOld.elbows[0].rotation.x = -0.4; herOld.head.rotation.z = 0.15 * smooth(55.5, 56.5, t);
      [gkA, gkB].forEach((P, i) => { const a = t * 1.3 + i * Math.PI; stand(P, Math.cos(a) * 1.4, 0.6 + Math.sin(a) * 0.8, a + (i ? Math.PI : 0) + Math.PI / 2, t, 'laugh'); poseWalk(P, t * 10 + i, 1); P.outer.position.y += 0.05 * Math.abs(Math.sin(t * 10 + i)); });
      PL.ball.visible = true; const ba = t * 1.9; PL.ball.position.set(Math.cos(ba) * 1.0, 0.11 + 0.4 * Math.abs(Math.sin(t * 3.5)), 0.6 + Math.sin(ba) * 0.6); } }
}
// ---- shots: [start, set, camera(t), opts{mb, dof, whip, far, noao, frozen}] ----
const SETS = { home: HOME, str: STR, caf: CAFS, xr: XR, park: PARK };
const SHOTS = [
  [WAKE, 'home', t => { const u = esin(span(t, 0, bt(0))); return LOOK(1.15 - 0.15 * u, 0.95 + 0.15 * u, -0.95 + 0.1 * u, lerp(0.6, -0.6, smooth(0.3, 1.0, u)), lerp(0.6, 1.2, smooth(0.3, 1.0, u)), lerp(-1.9, -1.7, u), 42); }, { dof: () => t0F() }],
  [bt(0), 'home', t => { const hd = H_(hero); return LOOK(hd.x + 0.35, hd.y + 0.05, 1.25 + 0.04 * Math.sin(t * 2), hd.x - 0.25, hd.y - 0.12, hd.z, 46); }, { dof: () => H_(hero) }],
  [bt(2), 'home', t => { const u = esin(span(t, bt(2), bt(4))); const hd = H_(hero); return LOOK(hd.x + 1.5 - 0.2 * u, hd.y - 0.1, hd.z + 1.2 - 0.3 * u, hd.x, hd.y - 0.2, hd.z, 44); }, { dof: () => H_(hero) }],
  [bt(4), 'home', t => { const u = esin(span(t, bt(4), STREET)); return LOOK(20 - 3.2, 1.35, 2.4 - 0.4 * u, 20 + lerp(1.0, -2.0, u), 1.1, 0.8, 46); }, { mb: true, whip: 1 }],
  [STREET, 'str', t => { const hd = H_(hero); return LOOK(HX + 0.3 + 0.2 * Math.sin(t * 0.8), 0.75, hd.z - 2.6, hd.x, hd.y - 0.15, hd.z, 44); }, { mb: true, whip: -1 }],
  [bt(14), 'str', t => { const hd = H_(hero); const u = esin(span(t, bt(14), CAFE)); return LOOK(hd.x + 1.2, hd.y - 0.3, hd.z - lerp(2.6, 2.0, u), hd.x, hd.y - 0.2, hd.z, 42); }, { dof: () => H_(hero) }],
  [CAFE, 'caf', t => { const u = esin(span(t, CAFE, bt(24))); return LOOK(lerp(2.6, 1.9, u), 1.5, lerp(1.2, 0.4, u), -0.2, 1.3, -1.9, 44); }],
  [bt(24), 'caf', t => { const u = esin(span(t, bt(24), bt(26))); return LOOK(-1.2 + 0.35, 1.48, -2.2 + 0.85 - 0.1 * u, -1.2, 1.32, -2.3, 36); }, { dof: () => V3(-1.2, 1.35, -2.25) }],
  [bt(26), 'caf', t => orbit(H_(hero), V3(0.7, 0.05, -1), -0.25, 0.2, 1.5, 1.2, 0.6, span(t, bt(26), OUT), 40), { dof: () => H_(hero) }],
  [OUT, 'str', t => { const hd = H_(hero); return LOOK(HX - 0.2 + 0.3 * Math.sin(t * 0.7), hd.y - 0.05, hd.z + 2.3, hd.x, hd.y - 0.25, hd.z, 42); }, { dof: () => H_(hero) }],
  [bt(40), 'str', t => { const u = esin(span(t, bt(40), MEET)); const hd = H_(hero); return LOOK(lerp(-0.6, -1.0, u), lerp(6.5, 4.5, u), hd.z - lerp(4.5, 3.5, u), HX, 1.5, hd.z + 3.5, 44); }, { far: true }],
  [MEET, 'str', t => { const hd = H_(her); const u = esin(span(t, MEET, bt(52))); return LOOK(HX + 0.2 - 0.3 * u, hd.y - 0.05, hd.z - 2.2 + 0.3 * u, hd.x, hd.y - 0.2, hd.z, 38); }, { dof: () => H_(her) }],
  [bt(52), 'str', t => { const u = esin(span(t, bt(52), BUMP)); return LOOK(HX + 1.55, 1.75, lerp(MZ - 2.4, MZ - 0.5, u), HX, 1.6, MZ + 0.6, 44); }, { mb: true }],
  [BUMP, 'str', t => { const u = esin(span(t, BUMP, bt(60))); return LOOK(HX + 2.2 - 0.4 * u, lerp(1.4, 0.9, u), MZ + 1.7, HX + 0.2, lerp(1.3, 0.7, u), MZ - 0.1, 46); }, { mb: true, whip: 1 }],
  [bt(60), 'str', t => { const u = esin(span(t, bt(60), bt(62.4))); return LOOK(HX + 1.6 - 0.5 * u, 0.85, MZ + 0.1, HX, 0.45, MZ, 40); }, { dof: () => V3(HX, 0.45, MZ) }],
  [bt(62.4), 'str', t => LOOK(HX + 0.55, 0.42, MZ + 0.05, HX - 0.02, SW + 0.15, MZ, 34), { dof: () => V3(HX - 0.02, SW + 0.15, MZ) }],
  [MAGIC, 'str', t => { const c = V3(HX + 0.05, 1.33, MZ); const a = lerp(-0.45, 0.45, esin(span(t, MAGIC, BRAIN))); return LOOK(c.x + Math.cos(a) * 2.7, 1.42, c.z + Math.sin(a) * 2.7, c.x, 1.32, c.z, 40); }, { dof: () => H_(her), frozen: true }],
  [BRAIN, 'xr', t => { const u = esin(span(t, BRAIN, HEART)); return LOOK(lerp(0.6, 0.3, u), 1.62, lerp(2.9, 1.7, u), 0, 1.55, 0, 44); }, { noao: true }],
  [HEART, 'xr', t => { const u = esin(span(t, HEART, BUTTER)); return LOOK(lerp(-0.2, 0.15, u), 1.3, lerp(2.2, 1.6, u), 0, 1.25, 0, 44); }, { noao: true }],
  [BUTTER, 'xr', t => { const u = esin(span(t, BUTTER, HI)); return LOOK(lerp(0.5, 0.3, u), 1.1, lerp(2.0, 1.6, u), 0, 1.05, 0, 44); }, { noao: true }],
  [HI, 'str', t => { const u = esin(span(t, HI, LIFE)); return LOOK(HX + lerp(3.4, 3.0, u), 1.95, MZ + 0.1, HX, 1.75, MZ, 44); }, { dof: () => H_(her) }],
  [LIFE, 'caf', t => { const u = esin(span(t, LIFE, bt(83))); return LOOK(2.2 + lerp(-0.2, 0.2, u), 1.65, 1.4 + lerp(2.0, 1.8, u), 2.2, 1.25, 1.4, 60); }, { dof: () => V3(2.2, 1.05, 1.4), whip: 1 }],
  [bt(83), 'home', t => { const u = esin(span(t, bt(83), bt(87))); return LOOK(20.35 + lerp(-0.4, 0.3, u), 1.75, 2.85 - 0.2 * u, 20.35, 1.45, 0.7, 60); }, { dof: () => V3(20.35, 1.3, 0.7), whip: -1 }],
  [bt(87), 'park', t => { const u = esin(span(t, bt(87), bt(91))); return LOOK(lerp(1.0, 0.6, u), 1.55, -2.6 - 0.4 * u, 0, 1.45, -5.4, 40); }, { dof: () => V3(0, 1.5, -5.4), whip: 1 }],
  [bt(91), 'home', t => { const u = esin(span(t, bt(91), bt(95))); return LOOK(20.3 + lerp(0.5, 0.1, u), 1.7, 2.6 - 0.3 * u, 20.3, 1.55, 0.45, 44); }, { dof: () => V3(20.4, 1.2, 0.45), whip: -1 }],
  [bt(95), 'park', t => { const u = esin(span(t, bt(95), bt(99))); return LOOK(lerp(-2.4, -1.6, u), 1.1, 3.2 - 0.3 * u, 0, 0.8, -1.0, 46); }, { mb: true, whip: 1 }],
  [bt(99), 'home', t => { const u = esin(span(t, bt(99), bt(103))); return LOOK(19.5 + 0.4 * u, 1.4, 1.3 - 0.2 * u, 19.5, 1.25, -1.45, 42); }, { dof: () => H_(herOld), whip: -1 }],
  [bt(103), 'park', t => { const u = esin(span(t, bt(103), ENDC)); return LOOK(lerp(0.8, 0.0, u), lerp(0.9, 2.4, u), lerp(2.4, 4.6, u), 0, lerp(0.9, 1.2, u), -3.1, lerp(40, 46, u)); }, { dof: () => V3(0, 1.0, -3.1) }],
  [ENDC, 'park', t => LOOK(0, 2.4, 4.6, 0, 1.2, -3.1, 46)]];
function t0F() { return V3(0.6, 0.55, -1.9).lerp(H_(hero), smooth(0.5, 1.2, curT)); }
let curT = 0;
// per-set state: lights by time of day, steam, the clock, frozen world in the "it's her" beat
function setState(t, k, o) { const tw = o.frozen ? MAGIC : t;
  if (k === 'str') { pedsAt(tw > HI && tw < LIFE ? MAGIC : tw, [V3(HX, 0, hisZ(t)), V3(HX, 0, herZ(t))]); }
  if (k === 'caf') { const night = t >= LIFE; CL.pend.forEach(L => L.intensity = night ? 1.2 : 3.5); CL.candle.intensity = night ? 1.6 + 0.2 * Math.sin(t * 13) : 0; CAFS.sc.userData.sun.intensity = night ? 0 : 2.0; CAFS.sc.userData.hemi.intensity = night ? 0.08 : 0.35;
    CL.win.material.color.setRGB(...(night ? [0.04, 0.06, 0.14] : [1.8, 1.7, 1.5])); const P = CL.steam.geometry.attributes.position.array; for (let i = 0; i < P.length / 3; i++) P[i * 3 + 1] = 0.5 + wrapR(hash(i) * 0.6 + t * 0.25, 0, 0.6); CL.steam.geometry.attributes.position.needsUpdate = true; }
  if (k === 'home') { const eve = t >= bt(99); HOME.sc.userData.sun.intensity = eve ? 0.6 : 3.2; HOME.sc.userData.sun.color.set(eve ? '#ff9a5a' : '#ffd8a8'); HL.livL.intensity = eve ? 6 : 2; const s = HOME.sc.userData.sun, rx = t < bt(0) || (t >= bt(2) && t < bt(4)) ? 0 : t < bt(2) ? 10 : 20; s.target.position.set(rx, 0, 0); s.position.set(rx + 9, 6, 2); }
  if (k === 'park') { const lateDay = t >= bt(103); PL.bulbs.forEach(b => b.visible = lateDay || t < bt(91)); PL.lamp.intensity = lateDay ? 4 : 1.5; }
  if (k === 'xr') { SPARK.rotation.y = t * 0.05; } }
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const RTD = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
const rim = new THREE.PointLight(0xffe0c0, 0, 5, 1.5), rim2 = new THREE.PointLight(0xffd0d8, 0, 5, 1.5);
function lerpF(A, B, k) { return { pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) }; }
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
let lastDepth = null;
function shoot(i, t, rt) { const [, k, cf, o = {}] = SHOTS[i], S = SETS[k]; curT = t; puffsReset(); if (k !== 'xr') CAST.forEach(P => S.sc.add(P.outer)); S.sc.add(rim, rim2);
  setState(t, k, o); pose(t, k); const F = cf(t); applyF(S.cam, F); S.cam.near = o.far ? 0.3 : 0.05; S.cam.far = o.far ? 2000 : 1700; S.cam.updateProjectionMatrix(); S.cam.updateMatrixWorld();
  const lit = [hero, her, herWed, heroOld, herOld].filter(P => P.outer.visible); [rim, rim2].forEach((L, j) => { const P = lit[j]; if (!P || k === 'xr') { L.intensity = 0; return; } const h = H_(P), back = h.clone().sub(S.cam.position).setY(0).normalize(); L.position.copy(h).add(back.multiplyScalar(0.9)).add(V3(0, 0.4, 0)); L.intensity = k === 'str' ? 9 : 6; });
  if (o.far || o.noao) { shootTo(RTD, S.sc, S.cam); lastDepth = RTD.depthTexture; renderer.setRenderTarget(rt); accMat.uniforms.tSrc.value = RTD.texture; accMat.uniforms.uW.value = 1; renderer.setClearColor(0, 1); renderer.clear(); renderer.render(accSc, compCam); return; }
  shootTo(RTS, S.sc, S.cam); const hid = []; S.sc.traverse(q => { if ((q.isSprite || q.isPoints) && q.visible) { hid.push(q); q.visible = false; } }); aoFor(k).render(renderer, rt, RTS); hid.forEach(q => { q.visible = true; }); lastDepth = aoFor(k).depthTexture;
  // points (motes, steam, splash) were hidden for the AO pass — add them on top
  if (hid.length) { const keep = []; S.sc.traverse(q => { if (q.isMesh && q.visible && !q.isPoints) { keep.push(q); q.visible = false; } }); const bg = S.sc.background; renderer.setRenderTarget(rt); renderer.autoClear = false; const sky = S.sc.children.find(c => c.geometry && c.geometry.type === 'SphereGeometry'); renderer.render(S.sc, S.cam); renderer.autoClear = true; keep.forEach(q => q.visible = true); } }
// ---- DOM: title fades, captions pop, HUD (clock / years), speech bubbles, the ECG, end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS', 'ecg'].map(k => [k, $(k)]));
const CAPS = [[0.25, bt(0), 'Just a <b>normal</b> day.'], [MAGIC, BRAIN, '<b>Yes. It’s her.</b>'], [BRAIN, HEART, 'Your brain’s reward system lights up — <b>dopamine</b>.'],
  [HEART, BUTTER, 'Your heart rate rises… and starts to <b>sync</b> with hers.'], [BUTTER, HI, 'Stress hormone up. Those are the <b>butterflies</b>.']];
const clockAt = t => { const m = 7 * 60 + clamp(t / BUMP, 0, 1) * 102; return `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')} AM`; };
const YEARS = [[LIFE, 'DAY 1', 'FIRST DATE'], [bt(83), 'YEAR 1', 'MOVING IN'], [bt(87), 'YEAR 3', 'THE WEDDING'], [bt(91), 'YEAR 5', 'BABY'], [bt(95), 'YEAR 12', 'THE KIDS'], [bt(99), 'YEAR 35', 'STILL LAUGHING'], [bt(103), 'YEAR 50', 'THE GRANDKIDS']];
function hudAt(t) { if (t >= bt(0) && t < MAGIC) return ['TODAY', clockAt(t), 'A NORMAL WEEKDAY · NEW YORK'];
  if (t >= HEART && t < BUTTER) return ['HEART RATES', t < HEART + 1.2 ? 'RISING' : 'IN SYNC', 'HIS · HERS'];
  if (t >= LIFE && t < ENDC) { let y = YEARS[0]; for (const q of YEARS) if (t >= q[0]) y = q; return ['TOGETHER', y[1], y[2]]; } return null; }
function bubbles(t) { if (t < HI || t >= LIFE) return ''; const S = STR, out = []; const add = (P, txt, a) => { if (t < a) return; const v = H_(P).add(V3(0, 0.32, 0)).project(S.cam); if (v.z > 1) return; const x = clamp((v.x + 1) / 2 * W, 180, 900), y = (1 - v.y) / 2 * H;
    out.push(`<div class="bub" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, a, 0.25).toFixed(3)})">${txt}</div>`); }; add(her, 'Hi.', HI + 0.15); add(hero, '…hi.', HI + 0.55); return out.join(''); }
function ecgPath(t, ph, y0) { let d = ''; for (let i = 0; i <= 120; i++) { const x = 140 + i * 6.7, tt = t - (120 - i) * 0.012 + ph; const k = ((tt - 1.93) / BEAT) % 1, kk = k < 0 ? k + 1 : k; const sp = kk < 0.06 ? -kk * 900 : kk < 0.12 ? -54 + (kk - 0.06) * 2200 : kk < 0.18 ? 78 - (kk - 0.12) * 1300 : 0; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (y0 + sp).toFixed(1); } return d; }
function updateDOM(t) {
  el.title.style.opacity = fadeWin(t, 0.2, bt(2), 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : ''; el.cap.classList.toggle('big', !!cp && cp[0] === MAGIC);
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; const yp = YEARS.some(q => Math.abs(t - q[0]) < 0.25) ? pop(t, YEARS.reduce((a, q) => t >= q[0] ? q[0] : a, 0), 0.25) : 1; el.val.style.transform = `scale(${yp.toFixed(3)})`; }
  el.labels.innerHTML = bubbles(t);
  const ecgOn = t >= HEART && t < BUTTER; el.ecg.style.opacity = ecgOn ? 1 : 0; if (ecgOn) { const sync = smooth(HEART + 0.4, BUTTER - 0.3, t); el.ecg.innerHTML = `<path d="${ecgPath(t, 0, 70)}" stroke="#9fd0ff" stroke-width="5" fill="none"/><path d="${ecgPath(t, 0.37 * BEAT * (1 - sync), 70 + 70 * (1 - sync))}" stroke="#ff9ac0" stroke-width="5" fill="none"/>`; }
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); }
// ---- optics ----
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
  if (window.PASS === 'text') { if (t >= HI && t < LIFE) shoot(i, t, RTA); updateDOM(t); return true; }
  updateDOM(t);
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#120e16', 1); renderer.clear(); return true; }
  const o = SHOTS[i][3] || {}; let src = RTA;
  if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA); } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && !o.mb) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = lastDepth; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); dofMat.uniforms.uAmt.value = o.frozen ? 40 : 26; renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  const u = compMat.uniforms; u.tA.value = src.texture; u.uWhip.value = whipAt(t); u.uPixOn.value = 0; u.uRed.value = 0; u.uT.value = t; u.uSepia.value = 0; u.uLook.value = 0.12; u.uTilt.value = 0;
  const flash = Math.max(0, 1 - Math.abs(t - MAGIC) / 0.25), exp = SHOTS[i][1] === 'xr' ? 1.0 : 1.0;
  composite(0, exp * (1 + 0.8 * flash) * (1 - 0.8 * Math.max(0, 1 - Math.abs(t - LIFE) / 0.12)), 1.0); u.tA.value = RTA.texture; return true; };
window.DBG = { THREE, hero, her, SETS, SHOTS, H_ };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const P of [...CAST, xHim, xHer]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(P.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
