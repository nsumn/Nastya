// =================== THE STORY: one day of hearing everyone think — shots (moving cameras, DOF, motion blur, whips), thought bubbles, captions/HUD, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const H_ = p => p.head ? headOf(p) : headP(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const seatY = (P, y) => y + 0.95 - 0.9 * (P.o ? P.o.h : P.h);
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
// the "I ♥ MY MOM" tee print (Times Square beat): a slightly curved decal on your chest
const SHIRT = (() => { const tx = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '900 96px Inter'; g.fillText('I', 78, 108);
    g.fillStyle = '#ff4a5a'; g.beginPath(); const x = 164, y = 62, s = 40; g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.3, y, x - s * 0.6, y - s * 1.0, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.3, y, x, y + s * 0.9); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 56px Inter'; g.fillText('MY MOM', w / 2, 196); });
  const geo = new THREE.CylinderGeometry(0.36, 0.36, 0.17, 24, 1, true, -0.24, 0.48); const m = mesh(geo, new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: 0.9 }), false, false);
  m.position.set(0, 1.22, 0.152 - 0.36); hero.torso.add(m); m.visible = false; return m; })();
// you: in bed, on the sidewalk, in the subway, at the meeting, in the booth, in Times Square, in bed again at night
function pose(t, k) {
  const P = hero; poseReset(P, t); SHIRT.visible = false; pal.outer.visible = k === 'din';
  if (k === 'bed' && t < STREET) { place(P, -0.9, -1.05, 0, seatY(P, 0.58) - 0.95); poseSit(P); P.arms.forEach((a, i) => a.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.2)); P.torso.rotation.x = -0.12 + 0.12 * smooth(0.4, 1.2, t);
    P.face(t < 1.25 ? 'sleepy' : t < 2.3 ? 'surprised' : 'anxious', t); }
  else if (k === 'bed') { place(P, -0.9, -1.05, 0, seatY(P, 0.58) - 0.95); poseSit(P); P.arms.forEach((a, i) => a.rotation.set(-2.5, 0, (i ? -1 : 1) * 0.55)); P.elbows.forEach(e => e.rotation.x = -1.9); P.face('anxious', t); }
  else if (k === 'nyc' && t < SQUARE) { const z = 2 - 1.25 * (t - 7.0); place(P, 8.7, z, Math.PI); poseWalk(P, t * 7.5, 1); P.face(t < 8.4 ? 'surprised' : 'wired', t); }
  else if (k === 'nyc') { const z = -60 - 1.05 * (t - SQUARE); place(P, -1.0, z, Math.PI); poseWalk(P, t * 7, 0.9); SHIRT.visible = true; P.face(t < 38.4 ? 'worried' : 'happy', t); }
  else if (k === 'trn') { place(P, 0.16, 1.2, Math.PI + 0.3); P.arms[0].rotation.set(-2.85, 0, 0.25); P.elbows[0].rotation.x = -0.25; P.outer.rotation.z = 0.012 * Math.sin(t * 2.1); P.face(t < 14.6 ? 'anxious' : 'worried', t); }
  else if (k === 'off') { const [x, z, ry] = OF.heroSeat; place(P, x, z, ry, seatY(P, 0.52) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.x = -1.0); P.elbows.forEach(e => e.rotation.x = -0.5); P.face(t < 21 ? 'squint' : 'smirk', t); }
  else if (k === 'din') { place(P, 5.6, 3.6, Math.PI, seatY(P, 0.5) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.x = -1.05); P.elbows.forEach(e => e.rotation.x = -0.45);
    P.face(t < 25.6 ? 'happy' : t < 28 ? 'sad' : 'squint', t);
    const Q = pal; poseReset(Q, t); place(Q, 5.6, 2.42, 0, seatY(Q, 0.5) - 0.95); poseSit(Q); Q.arms.forEach(a => a.rotation.x = -1.05); Q.elbows.forEach(e => e.rotation.x = -0.45);
    if (t > 24.4 && t < 25.6) { Q.arms[1].rotation.set(-1.5, 0, -0.3); Q.elbows[1].rotation.x = -0.9; } Q.face(t < 25.6 ? 'laugh' : 'smirk', t); }
  else P.outer.visible = false;
}
// ---- shots: [start, set, camera(t), opts{mb, dof, whip}] ----
const SETS = { bed: BED, nyc: NYC, trn: TRN, off: OFF, din: DIN, burb: BURB, lab: LABS };
const SHOTS = [
  [WAKE, 'bed', t => { const u = esin(span(t, WAKE, STREET)); return LOOK(0.9 - 0.4 * u, 1.55 - 0.1 * u, 1.9 - 0.6 * u, -0.95, 1.25, -1.0, 44); }],
  [STREET, 'nyc', t => { const u = 1 - Math.pow(1 - clamp(span(t, STREET, 7.0), 0, 1), 2.2); return lerpF(LOOK(2.0, 16, 34, 4, 3, -30, 44), LOOK(5.2, 2.6, 12, 7.5, 2.2, -14, 44), u); }],
  [7.0, 'nyc', t => orbit(H_(hero), V3(-0.45, 0.06, -1), -0.25, 0.25, 3.6, 3.0, 0.6, span(t, 7.0, TRAIN)), { dof: () => H_(hero) }],
  [TRAIN, 'trn', t => { const u = esin(span(t, TRAIN, 13.5)); return LOOK(-0.25, 2.05, -8.4 + 5.6 * u, 0.1, 1.55, 4 + 2 * u, 50); }, { mb: true, whip: 1 }],
  [13.5, 'trn', t => orbit(H_(hero), V3(0.35, 0.04, -1), -0.3, 0.3, 2.1, 1.7, 0.62, span(t, 13.5, OFFICE), 44), { dof: () => H_(hero) }],
  [OFFICE, 'off', t => { const u = esin(span(t, OFFICE, 20.5)); return LOOK(0.35 - 0.5 * u, 1.95 - 0.1 * u, 3.6 - 0.6 * u, 0, 1.45, -1.6, 46); }],
  [20.5, 'off', t => orbit(H_(hero), V3(-1, 0.08, 0.3), -0.2, 0.2, 2.3, 1.9, 0.6, span(t, 20.5, CAFE), 42), { dof: () => H_(hero) }],
  [CAFE, 'din', t => { const u = esin(span(t, CAFE, LIARS)); return LOOK(4.35 + 0.15 * u, 1.42, 1.25 + 0.3 * u, 5.6, 1.12, 3.15, 44); }, { dof: () => H_(hero) }],
  [LIARS, 'din', t => { const u = esin(span(t, LIARS, SQUARE)); return LOOK(-6.4 + 2 * u, 3.3 - 0.2 * u, 8.6 - 0.8 * u, 0.5, 0.7, -2.5, 46); }, { whip: -1 }],
  [SQUARE, 'nyc', t => { hero.outer.updateMatrixWorld(true); return orbit(H_(hero), V3(0.25, 0.05, -1), -0.2, 0.2, 3.4, 2.7, 0.66, span(t, SQUARE, 36.5)); }, { dof: () => H_(hero) }],
  [36.5, 'nyc', t => { const u = esin(span(t, 36.5, NIGHT)); return LOOK(6.5 - 2 * u, 9.5 - 1.5 * u, -114 + 8 * u, -1, 1.2, -66 - 4 * u, 46); }],
  [NIGHT, 'bed', t => { const u = esin(span(t, NIGHT, CITY)); return LOOK(0.7 - 0.3 * u, 1.5, 1.6 - 0.5 * u, -0.95, 1.2, -1.0, 46); }],
  [CITY, 'burb', t => { const u = esin(span(t, CITY, LAB)); return LOOK(-40 + 60 * u, 50 + 210 * u, 380 + 40 * u, 0, 30, -120, 46); }, { whip: 1 }],
  [LAB, 'lab', t => { const u = esin(span(t, LAB, 54.5)); return LOOK(-2.4 + 0.6 * u, 1.9 - 0.15 * u, 2.9 - 0.6 * u, 0.1, 1.0, -1.1, 44); }],
  [54.5, 'lab', t => { const u = esin(span(t, 54.5, ENDC)); const n = V3(-0.343, 0, 0.939), d = 3.5 - 0.25 * u; return LOOK(2.4 + n.x * d + 0.1 * u, 1.36, -0.82 + n.z * d, 2.4, 1.26 - 0.1 + 0.0 * u, -0.82, 46); }],
  [ENDC, 'lab', t => { const n = V3(-0.343, 0, 0.939), d = 3.25; return LOOK(2.4 + n.x * d + 0.1, 1.36, -0.82 + n.z * d, 2.4, 1.16, -0.82, 46); }]];
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
const F_cam = (t, i) => SHOTS[i][2](t).pos;
function shoot(i, t, rt) { const [, k, cf] = SHOTS[i], S = SETS[k]; puffsReset();
  if (['bed', 'nyc', 'trn', 'off', 'din'].includes(k)) S.sc.add(hero.outer);
  if (k === 'nyc') { updateDayNYC(t); NY.cabs.forEach(c => { if (t >= SQUARE && c.position.z < -40 && c.position.z > -135) c.visible = false; }); }
  if (k === 'bed') updateBED(t, t >= NIGHT); if (k === 'trn') updateTRN(t); if (k === 'off') updateOFF(t); if (k === 'din') updateDiner(t); if (k === 'burb') updateCITY(t); if (k === 'lab') updateLAB(t);
  pose(t, k); if (k === 'nyc') for (const w of [...NY.walkers, ...NY.crowd]) if (w !== NY.butt && (w.p.outer.position.distanceTo(hero.outer.position) < 0.8 || w.p.outer.position.distanceTo(F_cam(t, i)) < 1.6)) w.p.outer.visible = false;   // nobody walks through you
  const F = cf(t); applyF(S.cam, F); S.cam.updateMatrixWorld();
  if (k === 'burb') { shootTo(rt, S.sc, S.cam); return; }
  const far = F.pos.y > 20; if (far) { shootTo(rt, S.sc, S.cam); return; } shootTo(RTS, S.sc, S.cam);
  const hid = []; S.sc.traverse(o => { if (o.isSprite && o.visible) { hid.push(o); o.visible = false; } });
  aoFor(k).render(renderer, rt, RTS); hid.forEach(o => { o.visible = true; }); }
// ---- THOUGHT BUBBLES (DOM): every thinker of the set pops a bubble now and then; scripted ones (neighbours, your friend, "nice shirt") on top ----
const SPECIAL = [
  [1.25, STREET, 'bed', () => BD.nb[0], 'Is it Friday yet?'], [2.1, STREET, 'bed', () => BD.nb[1], 'where are my socks'], [2.8, STREET, 'bed', () => BD.nb[3], 'pancakes?'],
  [24.45, 25.9, 'din', () => H_(pal), 'Love your haircut!', 'sp'], [25.75, LIARS, 'din', () => H_(pal), "…it's fine.", 'lie'],
  [14.6, 16.7, 'trn', () => headP(TR.people[TR.kid].p), 'SKIBIDI'], [18.2, 20.3, 'off', () => headP(OF.people[1].p), '67'],
  [7.5, 9.2, 'nyc', () => headP(NY.butt.p), 'nice a**'],
  [38.7, NIGHT, 'nyc', () => headP(NY.crowd[NY.sqFan].p), 'lol, nice shirt'],
  [41.3, CITY, 'bed', () => BD.nb[0], 'is that a spider?'], [41.9, CITY, 'bed', () => BD.nb[2], "can't sleep"], [42.6, CITY, 'bed', () => BD.nb[1], '3 am cereal?'], [43.3, CITY, 'bed', () => BD.nb[3], 'why did I say that in 2014']];
// the SKIBIDI kid in the subway: the person nearest to you (but not touching) — visible behind you in the close-up
TR.kid = (() => { let b = 0, bd = 1e9; TR.people.forEach((w, i) => { const d = Math.hypot(w.x - 0.16, w.z - 2.0); if (d > 0.5 && d < bd && !w.sit) { bd = d; b = i; } }); return b; })();
// on the sidewalk: the one walker right behind you (in the street close-up) thinks "nice a**"
NY.butt = (() => { let b = NY.walkers[0], bd = 1e9; [...NY.walkers, ...NY.crowd].forEach(w => { if (w.side === 0) return; const z = (w.z0 ?? 0) + w.dir * w.sp * (8.5 - (w.side === undefined ? 0 : STREET)), hz = 2 - 1.25 * 1.5, d = Math.hypot(w.x - 8.7, z - hz - 1.6); if (d < bd && z > hz + 0.9 && w.dir < 0) { bd = d; b = w; } }); return b; })();
// in Times Square the one person who notices the shirt: the crowd member closest to your path at 38.7 s
NY.sqFan = (() => { let b = 0, bd = 1e9; NY.crowd.forEach((w, i) => { if (w.side !== 0) return; const z = w.z0 + w.dir * w.sp * (38.7 - STREET) * 0.4, d = Math.hypot(w.x - 0.6, z - (-60 - 1.05 * 6.7 - 3)); if (d < bd) { bd = d; b = i; } }); return b; })();
function bubbleOf(th, t) { const T = 1 / th.rate, c = Math.floor((t + th.k * 3.3) / T), on = c * T - th.k * 3.3 + hash(th.k + c * 1.7) * T * 0.35, d = Math.min(1.7, T * 0.8);
  if (t < on || t > on + d) return null; const pool = th.lie ? LIEP : th.pool; return { a: on, b: on + d, txt: pool[(hash(th.k * 3.1 + c * 1.7) * pool.length) | 0], cls: th.lie ? 'lie' : '' }; }
function bubblesAt(t, i) { const [t0, k] = SHOTS[i], cam = SETS[k].cam, out = []; if (t >= ENDC) return '';
  const add = (p, b, sc0 = 1) => { const v = p.clone().add(V3(0, 0.32, 0)), dist = cam.position.distanceTo(v); v.project(cam); if (v.z > 1 || Math.abs(v.x) > (sc0 > 1 ? 1.6 : 1.05) || v.y > 1.1 || v.y < -1.1) return;
    const s = clamp(3.2 / dist, 0.66, 1.3) * sc0, hw = (b.txt.length * 16 + 50 + (b.cls === 'lie' ? 70 : 0)) * s / 2;   // half width of the bubble
    let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; x = clamp(x, 70 + hw, Math.min(1010, 880 + (y > 1650 || y < 950 ? 130 : 0)) - hw); if (sc0 > 1) y = clamp(y, 720, 1130);   // scripted bubbles always stay readable
    const band = (y > 1150 && y < 1520) ? 0.0 : 1, top = smooth(k === 'bed' && t < STREET ? 640 : 560, (k === 'bed' && t < STREET ? 640 : 560) + 80, y);   // keep the caption band and the HUD clear
    const al = Math.min(band, top) * smooth(b.a - 0.01, b.a + 0.08, t) * (1 - smooth(b.b - 0.18, b.b, t)); if (al < 0.02) return;
    const sp = s * pop(t, b.a, 0.26); out.push({ dist, pri: sc0 > 1 ? 0 : dist, x, y, hw, hh: 62 * s, h: `<div class="tb ${b.cls || ''}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;opacity:${al.toFixed(2)};transform:translate(-50%,-100%) scale(${sp.toFixed(3)})"><div class="c">${b.txt}</div><div class="d1"></div><div class="d2"></div></div>` }); };
  const ths = (k === 'bed' || k === 'lab' || k === 'burb') ? [] : (THINK[k] || []);
  if (!(k === 'din' && t < LIARS)) for (const th of ths) { const b = bubbleOf(th, t); if (b) add(th.head(), b); }
  for (const [a, b, kk, hf, txt, cls] of SPECIAL) if (kk === k && t >= a && t < b) add(hf(), { a, b, txt, cls }, 1.45);
  // no pile-ups: nearest (and scripted) bubbles win; a bubble that would cover another one or your face is skipped
  const keep = [], hb = (hero.outer.visible && hero.outer.parent === SETS[k].sc) ? (() => { const v = H_(hero).project(cam); return v.z < 1 ? { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H } : null; })() : null;
  out.sort((p, q) => p.pri - q.pri);
  for (const o of out) { if (keep.length >= 18) break; const over = keep.some(q => Math.abs(o.x - q.x) < (o.hw + q.hw) * 0.92 && Math.abs(o.y - q.y) < (o.hh + q.hh) * 0.5);
    const face = hb && o.pri > 0 && Math.abs(o.x - hb.x) < o.hw + 110 && o.y > hb.y - 190 && o.y - o.hh < hb.y + 120; if (!over && !face) keep.push(o); }
  keep.sort((p, q) => q.dist - p.dist); return keep.map(o => o.h).join(''); }
// ---- DOM: title fades, captions pop (series style), HUD counters, bubbles, end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'bubs', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[STREET, TRAIN, 'Scientists estimate you have about <b>6,200</b> thoughts a day.'], [TRAIN, OFFICE, "In a packed subway car, that's <b>16</b> thoughts every second."],
  [OFFICE, CAFE, "<b>Almost half</b> the time, people aren't thinking about what they're doing."],
  [CAFE, LIARS, 'The average American tells <b>1–2 lies</b> a day…'], [LIARS, SQUARE, '…but half of all lies come from just <b>5%</b> of people.'],
  [SQUARE, 36.5, 'The scariest part? Almost nobody is thinking about <b>you</b>.'], [36.5, NIGHT, 'In one study, people thought <b>half</b> the room noticed their shirt. Only about <b>a quarter</b> did.'],
  [NIGHT, LAB, 'All of New York: about <b>900,000</b> thoughts every second.'],
  [LAB, 54.5, 'The twist? Scientists already built a machine that reads thoughts.'], [54.5, ENDC, 'It needs <b>16 hours</b> in an MRI, works on one person, and you can block it.']];
function hudAt(t) { const cnt = (a, b, v) => v * ease(clamp((t - a) / (b - a), 0, 1));
  if (t >= STREET && t < TRAIN) return ['THOUGHTS PER PERSON', fmt(cnt(STREET + 0.2, STREET + 1.6, 6200)) + ' / DAY', '≈ 6 EVERY MINUTE'];
  if (t >= TRAIN && t < OFFICE) return ['THIS SUBWAY CAR', fmt(cnt(TRAIN + 0.2, TRAIN + 1.2, 16)) + ' / SEC', '150 PEOPLE × 6.5 A MINUTE'];
  if (t >= OFFICE && t < CAFE) return ['MIND SOMEWHERE ELSE', fmt(cnt(OFFICE + 0.2, OFFICE + 1.4, 47)) + '%', 'OF WAKING HOURS'];
  if (t >= CAFE && t < SQUARE) return ['LIES PER DAY', '1.65', t < LIARS ? 'AVERAGE AMERICAN' : 'HALF OF THEM: 5% OF PEOPLE'];
  if (t >= 36.5 && t < NIGHT) return ['NOTICED THE SHIRT', '1 IN 4', 'THEY GUESSED 1 IN 2'];
  if (t >= CITY && t < LAB) return ['ALL OF NEW YORK', fmt(cnt(CITY + 0.3, LAB - 0.8, 912000)) + ' / SEC', '8.5 MILLION MINDS'];
  if (t >= LAB && t < ENDC) return ['MIND-READING AI · 2023', '16 H', 'IN AN MRI · ONE PERSON'];
  return null; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, STREET, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.bubs.innerHTML = bubblesAt(t, i); el.labels.innerHTML = '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); }
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
  document.body.classList.toggle('bright', ['off', 'lab', 'bed'].includes(SHOTS[i][1]) && t < NIGHT || SHOTS[i][1] === 'lab');   // soft dark backing under captions on bright sets
  if (window.PASS === 'text') { shoot(i, t, RTA); updateDOM(t, i); return true; }   // (bubbles project from the posed scene)
  const o = shotOpts(i); let src = RTA;
  if (o.mb) {   // motion blur: average MB_K renders spread over the shutter (stay inside this shot)
    renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA);
  } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && AO[SHOTS[i][1]] && !o.mb) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = AO[SHOTS[i][1]].depthTexture; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  compMat.uniforms.tA.value = src.texture; compMat.uniforms.uWhip.value = whipAt(t); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uSepia.value = 0; compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const n of Object.keys(FACE)) for (const b of [false, true]) { renderer.initTexture(faceTex(hero.o, n, b)); renderer.initTexture(faceTex(pal.o, n, b)); }
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
