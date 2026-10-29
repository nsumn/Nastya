// =================== THE STORY, driven by the narration cues (g_times.js) + FAST CUTS (1.5–2.5 s) ===================
const wordT = (w, after) => (WORDS.find(([t, x]) => t >= after - 0.01 && x.toLowerCase().replace(/[^a-z]/g, '') === w) || [99])[0];
const T = { fix: CUE.letsfixthat, hooks: CUE.firsthookson, allin: CUE.nowitall, back: CUE.movethehooks, backsad: CUE.yourarmsare,
  wheels: CUE.putiton, better: CUE.muchbetter, steps: CUE.excepttheporch, legs: CUE.giveitlegs, climbs: CUE.nowitclimbs, eggs: CUE.unfortunatelys, susp: CUE.addsuspension,
  smooth: CUE.smooth, stare: CUE.theneighborsar, film: CUE.oneofthem, walking: CUE.butyourestill, seat: CUE.addaseat, fast: CUE.nowitsfast, toofast: CUE.toofast,
  milk: CUE.themilkgoes, belts: CUE.addseatbelts, formilk: CUE.forthemilk, leaves: CUE.thentheleaves, roof: CUE.addaroof, thanks: CUE.thanksgivingis, twolegs: CUE.addtwomore,
  melt: CUE.nowtheice, freezer: CUE.installafreeze, fridge: CUE.andafridge, pantry: CUE.apantry, counter: CUE.acounterfor, dish: CUE.adishwasher, obv: CUE.obviously,
  coffee: CUE.andacoffee, tv: CUE.andatv, congr: CUE.congratulation, built: CUE.youvebuilta, onetrip: CUE.onetrip, drive: CUE.youdriveit, two: CUE.lookslikeits };
T.knees = wordT('until', T.allin); T.motor = wordT('motor', T.seat); T.keys = wordT('and', T.drive + 0.5);
const groundY = z => z < -4.4 ? PORCH_Y : z < -4.08 ? 0.36 : z < -3.76 ? 0.18 : 0;
const knob = mesh(new THREE.SphereGeometry(0.045, 10, 8), M('#d8b050', { metalness: 0.8, roughness: 0.25 })); knob.position.set(0.42, PORCH_Y + 1.0, -5.9); st.add(knob);
const pop = (t, a) => { const k = clamp((t - a) / 0.3, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };   // ease-out pop-in
const handW = (P, i) => P.elbows[i].localToWorld(V3(0, -0.36, 0.02));
function sitOn(P, p, ry) { poseSit(P); P.outer.position.set(p.x, p.y + 0.95 - 0.87 * P.h, p.z); P.outer.rotation.set(0, ry, 0); }
const nbPhone = makePhone(); nb2.elbows[1].add(nbPhone); nb2.phone = nbPhone;
const FALLING = Array.from({ length: 30 }, (_, i) => { const l = mesh(new THREE.CircleGeometry(0.08, 3), new THREE.MeshStandardMaterial({ color: ['#e07a2a', '#d4562a', '#f0a63a', '#c8402a', '#e8c050'][i % 5], flatShading: true, side: THREE.DoubleSide }), false, false); st.add(l); return l; });
// the rig's path: [t, x, z, heading-at-rest]; while moving it faces where it goes; y follows the porch steps
const PARK = [-3.4, 1.4];   // open lawn: no tree over the camera
const PATH = {
  wheels: [[T.wheels, 1.4, 1.6, Math.PI], [T.steps - 0.15, 0, -2.95, Math.PI], [99, 0, -2.95, Math.PI]],
  legs: [[T.legs, 0, -2.95, Math.PI], [T.climbs, 0, -2.95, Math.PI], [T.eggs + 1.2, 0, -5.0, Math.PI], [99, 0, -5.0, Math.PI]],
  susp: [[T.susp, 0, -1.2, 0], [T.stare, 0, 2.2, 0], [T.seat, -2.6, 3.4, 0], [99, -2.6, 3.4, 0]],
  ride: [[T.seat, -2.6, 3.4, 0], [T.motor + 0.2, -2.6, 3.4, 0], [T.fast, -3.4, 2.8, 0], [99, -3.4, 2.8, 0]],
  fast: [[T.fast, -3.4, 2.8, 0], [T.toofast, -1.3, 4.6, 0], [T.milk, -1.7, 2.0, 0], [T.belts, -4.4, 3.0, 0], [T.formilk, PARK[0], PARK[1], 0], [99, PARK[0], PARK[1], 0]],
  park: [[0, PARK[0], PARK[1], 0], [99, PARK[0], PARK[1], 0]],
  home: [[T.onetrip, PARK[0], PARK[1], 0], [T.onetrip + 1.4, -2.0, 0.4, 0], [T.keys - 0.3, -2.4, -3.3, 0], [99, -2.4, -3.3, 0]] };
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; };
for (const P of Object.values(PATH)) { let h = P[0][3]; for (let i = 0; i < P.length - 1; i++) { const dx = P[i + 1][1] - P[i][1], dz = P[i + 1][2] - P[i][2]; P[i].hd = Math.hypot(dx, dz) > 0.01 ? (h = Math.atan2(dx, dz)) : h; P[i].h0 = i ? P[i - 1].hd : P[0][3]; } P[P.length - 1].hd = h; }
function pathAt(P, t) { let i = 0; while (i < P.length - 2 && t >= P[i + 1][0]) i++; const [a, x0, z0] = P[i], [b, x1, z1] = P[i + 1], k = ease(clamp((t - a) / (b - a), 0, 1));
  return { x: lerp(x0, x1, k), z: lerp(z0, z1, k), h: angLerp(P[i].h0, P[i].hd, clamp((t - a) / 0.35, 0, 1)), moving: k > 0 && k < 1 }; }
let STAGE = '';
function hideAll() { BAGS.forEach(b => b.visible = false); eggs.forEach(e => e.visible = false); splats.forEach(s => s.visible = false); eggDrop.visible = false; rig.visible = false; backFrame.visible = false;
  ARM_HOOKS.forEach(h => h.visible = false); Object.values(KIT).forEach(k => k.visible = false); meltPuddle.visible = false; meltDrops.forEach(d => d.visible = false); seat.visible = motor.visible = false; deckX.visible = false;
  roof.visible = milk.visible = strap.visible = turkey.visible = coffee.visible = tv.visible = false; FALLING.forEach(l => l.visible = false); nbPhone.visible = false; EXTRA_LEGS = false; }
function trunkBags(n, t) { for (let i = 0; i < n; i++) { const b = BAGS[11 - i]; hang(b, car.localToWorld(V3(-0.6 + 0.4 * (i % 4), 1.29, 1.25 + 0.3 * Math.floor(i / 4))), t, 0.0); b.rotation.y = 0.3 * hash(i); } }
function rigBags(t, amp) { rig.updateMatrixWorld(true); BAGS.forEach((b, i) => hang(b, body.localToWorld(RIG_HOOKS[i].clone()), t, amp, 2.6)); }
function ridePose(P, q) { rig.updateMatrixWorld(true); sitOn(P, body.localToWorld(V3(0, 0.52, -0.2)), q.h); P.arms.forEach(a => a.rotation.set(-1.0, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.5); }
function exhaust(t, rate = 2.2) { const ex = motor.localToWorld(V3(0.18, 0.78, -0.18)); for (let k = 0; k < 8; k++) { const u = ((t * rate + k / 8) % 1); puffs.add(ex.clone().add(V3(0.1 * Math.sin(k * 3), u * 0.6, -u * 0.3)), 0.06 + u * 0.15, 0.45 * (1 - u)); } }
// what is on the rig at time t (each upgrade stays once added)
function rigKit(t) { if (milk.parent !== body) { body.add(milk); milk.rotation.set(0, 0, 0); } seat.visible = t >= T.seat; seat.scale.setScalar(pop(t, T.seat)); motor.visible = t >= T.motor; motor.scale.setScalar(pop(t, T.motor));
  milk.visible = t >= T.seat && !(t >= T.milk && t < T.belts); milk.position.set(-0.35, 0.05, 0.42); strap.visible = t >= T.belts; strap.scale.setScalar(pop(t, T.belts));
  roof.visible = t >= T.roof; roof.scale.setScalar(pop(t, T.roof)); EXTRA_LEGS = t >= T.twolegs; turkey.visible = t >= T.twolegs; turkey.scale.setScalar(pop(t, T.twolegs + 0.1));
  turkey.position.set(0.8, t >= T.counter ? 0.87 : 0.05, -0.42);
  deckX.visible = t >= T.freezer; const dk = ease(clamp((t - T.freezer) / 0.4, 0, 1)); deckX.scale.set(lerp(0.6, 1, dk), 1, lerp(0.67, 1, dk));
  for (const [k, at] of [['freezer', T.freezer], ['fridge', T.fridge], ['pantry', T.pantry], ['counter', T.counter], ['dish', T.dish]]) { KIT[k].visible = t >= at; KIT[k].scale.setScalar(pop(t, at)); }
  coffee.visible = t >= T.coffee; coffee.scale.setScalar(pop(t, T.coffee)); tv.visible = t >= T.tv; tv.scale.setScalar(pop(t, T.tv)); }
function update(t) {
  hideAll(); [hero, nb1, nb2].forEach(p => poseReset(p, t)); puffs.begin(); smokeMat.uniforms.uTint.value.set('#d8d8d8');
  place(nb1, -11.6, 0.6, 1.2); place(nb2, -12.4, 1.4, 1.3); nb1.face('neutral', t); nb2.face('happy', t + 1);
  if (t >= T.stare) { const look = (P, k) => { P.outer.rotation.y = Math.atan2(rig.position.x - P.outer.position.x, rig.position.z - P.outer.position.z); P.face(k, t); }; look(nb1, 'surprised'); look(nb2, t >= T.film ? 'smirk' : 'dumb'); }
  if (t >= T.film) { nb2.phone = nbPhone; holdPhone(nb2, t, 'up'); }
  const P = hero; let s;
  if (t < T.fix) {   // five trips: two bags at a time, the trunk still full
    s = 'trips'; trunkBags(10, t); const mid = 1.6;
    if (t < mid) walk(P, [3.2, 1.6], [0.6, -1.4], -1.0, mid, t); else walk(P, [0.5, -1.0], [3.6, 2.4], mid, T.fix + 0.6, t);
    P.face(t < mid ? 'neutral' : 'sleepy', t); if (t < mid) { P.outer.updateMatrixWorld(true); hang(BAGS[0], handW(P, 0), t, 0.15, 6); hang(BAGS[1], handW(P, 1), t, 0.15, 6); P.elbows.forEach(e => e.rotation.x = -0.1); }
  } else if (t < T.hooks) { s = 'fix'; trunkBags(12, t); place(P, 4.7, 3.6, 0.4); P.face('smirk', t); }
  else if (t < T.knees) {   // hooks on the arms, every bag at once
    s = 'hooks'; ARM_HOOKS.forEach(h => h.visible = true);
    if (t < T.allin) place(P, 4.7, 3.6, 0.4); else walk(P, [4.6, 3.4], [1.0, 0.0], T.allin, T.knees + 0.5, t);
    P.arms.forEach((a, i) => a.rotation.set(-0.25 + a.rotation.x * 0.3, 0, i ? 0.08 : -0.08)); P.elbows.forEach(e => e.rotation.x = -1.35); P.face('proud', t);
    P.outer.updateMatrixWorld(true); BAGS.forEach((b, i) => { const side = i % 2, k = Math.floor(i / 2), p = handW(P, side).add(V3(0, -0.02 * k, 0)); hang(b, p, t, 0.1 + 0.02 * k, 4); b.position.x += (k - 2.5) * 0.035; b.position.z += (k % 2 ? 0.05 : -0.05); });
  } else if (t < T.back) {   // the bags hang at your knees: a waddle, the bags slam
    s = 'knees'; ARM_HOOKS.forEach(h => h.visible = true); const ph = (t - T.knees) * 8;
    place(P, lerp(1.0, 0.4, (t - T.knees) / 2), lerp(0.0, -1.0, (t - T.knees) / 2), Math.PI * 0.82); poseWalk(P, ph, 0.45); P.arms.forEach(a => a.rotation.set(a.rotation.x * 0.2, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.1);
    P.root.rotation.z = 0.08 * Math.sin(ph); P.face(Math.sin(ph) > 0 ? 'worried' : 'surprised', t);
    P.outer.updateMatrixWorld(true); BAGS.forEach((b, i) => { const side = i % 2, k = Math.floor(i / 2); hang(b, handW(P, side), t, 0.35, 8); b.position.x += (k - 2.5) * 0.035; b.position.z += (k % 2 ? 0.05 : -0.05); });
  } else if (t < T.wheels) {   // a frame on your back
    s = 'back'; backFrame.visible = true; const sad = t >= T.backsad;
    walk(P, [0.2, 3.0], [0.0, -0.4], T.back, T.wheels, t); if (sad) { P.torso.rotation.x = 0.3; P.root.rotation.x = 0.08; } P.face(sad ? 'sad' : 'happy', t);
    P.outer.updateMatrixWorld(true); BAGS.forEach((b, i) => hang(b, P.torso.localToWorld(BACK_HOOKS[i].clone()), t, 0.12, 4));
  } else if (t < T.legs) {   // on wheels: push it to the porch… and the steps stop it
    s = 'wheels'; rig.visible = true; const q = pathAt(PATH.wheels, t), bump = t > T.steps - 0.15 ? 0.06 * Math.exp(-(t - T.steps + 0.15) * 6) * Math.sin((t - T.steps) * 30) : 0;
    rig.position.set(q.x, 0, q.z + bump); rig.rotation.y = q.h; rigGear('wheels', t, -(t - T.wheels) * 4 * (q.moving ? 1 : 0));
    const back = V3(Math.sin(q.h), 0, Math.cos(q.h)).multiplyScalar(-1.0); place(P, q.x + back.x, q.z + back.z, q.h); if (q.moving) poseWalk(P, t * 9, 1);
    P.arms.forEach(a => a.rotation.set(-1.2, 0, 0)); P.elbows.forEach(e => e.rotation.x = -0.3); P.face(t >= T.steps ? 'surprised' : t >= T.better ? 'happy' : 'proud', t); rigBags(t, q.moving ? 0.12 : 0.05 + (t > T.steps - 0.2 && t < T.steps + 0.8 ? 0.2 : 0));
  } else if (t < T.susp) {   // legs: it climbs the steps; the eggs jump out
    s = 'legs'; rig.visible = true; const q = pathAt(PATH.legs, t), ph = (t - T.legs) * 7;
    rig.position.set(q.x, groundY(q.z + 0.3) * 0.5 + groundY(q.z - 0.3) * 0.5, q.z); rig.rotation.y = q.h; rigGear('legs', t, q.moving ? ph : 0, 0.14);
    walk(P, [0.25, -1.4], [0.25, -2.3], T.climbs, T.eggs + 1.2, t); P.outer.rotation.y = Math.PI; P.face(t >= T.eggs ? 'surprised' : 'proud', t); rigBags(t, q.moving ? 0.3 : 0.1);
    if (t > T.eggs) { const src = BAGS[EGG_BAG].position.clone().add(V3(0, -0.2, 0)); eggs.forEach((e, i) => { const u = clamp((t - T.eggs - i * 0.08) / 0.7, 0, 1), dx = (hash(i * 3.1) - 0.5) * 1.6, dz = 1.2 + hash(i * 5.3) * 1.4;
        const p = src.clone().add(V3(dx * u, 0.9 * u - 1.6 * u * u, dz * u)); p.y = Math.max(p.y, groundY(p.z) + 0.04); e.visible = u > 0 && u < 1; e.position.copy(p); e.rotation.set(t * 9 + i, 0, t * 7);
        const sp = splats[i]; sp.visible = u >= 1; if (sp.visible) { const sz = src.z + dz; sp.position.set(src.x + dx, groundY(sz) + 0.012, sz); sp.scale.setScalar(0.8 + 0.5 * hash(i)); } }); }
  } else if (t < T.seat) {   // suspension: smooth; the neighbors stare (one films); you still walk beside it
    s = 'susp'; rig.visible = true; const q = pathAt(PATH.susp, t);
    rig.position.set(q.x, 0, q.z); rig.rotation.y = q.h; rigGear('spring', t, q.moving ? (t - T.susp) * 7 : 0); rigBags(t, 0.04);
    const side = V3(Math.cos(q.h), 0, -Math.sin(q.h)).multiplyScalar(-1.05); place(P, q.x + side.x, q.z + side.z, q.h); if (q.moving) poseWalk(P, t * 9, 1);
    P.face(t >= T.walking ? 'sleepy' : t >= T.stare ? 'smirk' : 'happy', t);
  } else if (t < T.leaves) {   // a seat + a motor; then FAST — the milk flies, gets a seat belt
    s = 'ride'; rig.visible = true; rigKit(t); const q = pathAt(t >= T.fast ? PATH.fast : PATH.ride, t), spd = t >= T.fast ? 14 : 9;
    rig.position.set(q.x, 0, q.z); rig.rotation.y = q.h; rig.rotation.z = t >= T.toofast && q.moving ? 0.06 * Math.sin(t * 13) : 0; rigGear('spring', t, q.moving ? (t - T.seat) * spd : 0); rigBags(t, t >= T.fast && q.moving ? 0.35 : 0.05);
    ridePose(P, q); P.face(t >= T.belts ? 'proud' : t >= T.toofast ? 'surprised' : t >= T.motor ? 'laugh' : 'happy', t); if (t >= T.motor) exhaust(t, t >= T.fast ? 4 : 2.2);
    if (t >= T.milk && t < T.belts) { milk.visible = true; const u = clamp((t - T.milk) / 0.8, 0, 1); rig.updateMatrixWorld(true); const p0 = body.localToWorld(V3(-0.35, 0.05, 0.42)); milk.removeFromParent(); st.add(milk);
      milk.position.set(p0.x - 1.6 * u, Math.max(0, p0.y + 1.4 * u - 2.6 * u * u), p0.z + 0.8 * u); milk.rotation.set(t * 8, 0, t * 6); } else if (milk.parent !== body) { body.add(milk); milk.rotation.set(0, 0, 0); }
  } else if (t < T.onetrip) {   // parked under the tree: leaves fall into the bags → a roof; Thanksgiving → two more legs; the kitchen; coffee + TV; congratulations
    s = t >= T.congr ? 'congr' : 'kitchen'; rig.visible = true; rigKit(t); const q = pathAt(PATH.park, t); rig.position.set(q.x, 0, q.z); rig.rotation.y = PATH.fast[PATH.fast.length - 1].hd; rigGear('spring', t, t >= T.twolegs && t < T.twolegs + 1.2 ? (t - T.twolegs) * 6 : 0); rigBags(t, 0.03);
    ridePose(P, { h: rig.rotation.y }); if (t >= T.motor) exhaust(t, 1.2);
    if (t < T.roof + 1.5) { rig.updateMatrixWorld(true); const top = body.localToWorld(V3(0, 2.36, 0)); FALLING.forEach((l, i) => { const u = ((t - T.leaves) * 0.45 + i / 30) % 1, landed = t >= T.roof && u > 0.75; l.visible = true;
        const y = landed ? top.y + 0.01 : lerp(top.y + 2.4, top.y - 0.4, u / 0.9); l.position.set(top.x + 1.3 * (hash(i) - 0.5), y, top.z + 1.0 * (hash(i * 3) - 0.5)); l.rotation.set(landed ? -Math.PI / 2 : t * 3 + i, i, t * 2); }); }
    KIT.icecream.visible = t >= T.melt && t < T.freezer + 0.3; if (KIT.icecream.visible) { const ic = KIT.icecream.localToWorld(V3(0, 0, 0)); meltPuddle.visible = true; meltPuddle.position.set(ic.x, 0.008, ic.z); meltPuddle.scale.setScalar(0.05 + 0.25 * smooth(T.melt, T.freezer, t));
      meltDrops.forEach((d, i) => { const u = ((t * 1.6 + i / 4) % 1); d.visible = true; d.position.set(ic.x + 0.08 * Math.sin(i * 2), lerp(ic.y + 0.05, 0.02, u), ic.z + 0.08 * Math.cos(i * 2)); }); }
    P.face(t >= T.congr ? 'proud' : t >= T.tv ? 'laugh' : t >= T.obv ? 'smirk' : t >= T.freezer ? 'proud' : t >= T.melt ? 'worried' : t >= T.thanks ? 'happy' : t >= T.leaves ? 'surprised' : 'proud', t);
  } else {   // one trip: ride up to the door… locked. The keys are in the car.
    s = 'home'; rig.visible = true; rigKit(t); KIT.icecream.visible = false;
    const q = pathAt(PATH.home, t); rig.position.set(q.x, groundY(q.z + 0.4) * 0.5 + groundY(q.z - 0.4) * 0.5, q.z); rig.rotation.y = q.h; rigGear('spring', t, q.moving ? (t - T.onetrip) * 8 : 0); rigBags(t, q.moving ? 0.08 : 0.03);
    rig.updateMatrixWorld(true); if (q.moving) exhaust(t, 3);
    if (t < T.keys) { ridePose(P, q); P.face('proud', t); }
    else if (t < T.two) { place(P, 0.15, -5.5, Math.PI, PORCH_Y); const jig = t < T.keys + 0.8;
      if (jig) { P.arms[1].rotation.set(-1.25, 0, 0.15); P.elbows[1].rotation.x = -0.25 + 0.08 * Math.sin(t * 40); P.face('neutral', t); }
      else { P.outer.rotation.y = 0.2; P.arms.forEach((a, i) => a.rotation.set(0.15, 0, i ? 0.25 : -0.25)); P.elbows.forEach((e, i) => e.rotation.x = -0.9 - 0.3 * Math.max(0, Math.sin(t * 14 + i * 2))); P.face('surprised', t); } }
    else { walk(P, [0.4, -5.2], [4.4, 3.2], T.two, T.two + 6.2, t, PORCH_Y, 0); P.outer.position.y = 0.95 + groundY(P.outer.position.z); P.face('sleepy', t); }
    splats.forEach(sp => { sp.visible = true; }); }
  STAGE = s; puffs.end(); }
// cameras: [start, framing(t)] — every shot in the one street scene; a new angle every 1.5–2.5 s
const H_ = p => headOf(p), rigC = (dy = 1.2) => rig.position.clone().add(V3(0, dy, 0));
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
const fwd = (P, side = 0, up = 0.1) => { const h = P.outer.rotation.y; return V3(Math.sin(h) + side * Math.cos(h), up, Math.cos(h) - side * Math.sin(h)); };   // in front of P (+ a bit to its left/right)
const SHOTS = [
  [0, t => fr(H_(hero), V3(-0.35, 0.15, -1), lerp(3.4, 3.0, t / 1.6), 0.6)],   // trip 2: two bags to the porch
  [1.6, t => fr(H_(hero), V3(0.25, 0.1, 1), lerp(3.0, 2.7, (t - 1.6) / 1.5), 0.6)],   // back to the car for trip 3
  [T.fix, t => fr(H_(hero), V3(-0.2, 0.05, 1), lerp(1.2, 1.05, (t - T.fix) / 1.0), 0.6)],
  [T.hooks, t => fr(H_(hero), V3(0.45, 0.12, 1), lerp(2.4, 2.7, (t - T.hooks) / 1.9), 0.55)],
  [T.allin, t => fr(H_(hero), V3(-0.55, 0.25, -1), 3.5, 0.6)],
  [T.knees, t => fr(hero.outer.position.clone().add(V3(0, -0.35, 0)), V3(0.6, 0.05, -1), 1.7, 0.5)],
  [T.back, t => fr(H_(hero), V3(0.75, 0.3, 0.7), lerp(3.2, 2.9, (t - T.back) / 2.3), 0.52)],
  [T.backsad, t => fr(H_(hero), V3(0.6, 0.15, -1), 3.0, 0.62)],
  [T.wheels, t => fr(rigC(1.1), V3(0.55, 0.35, -1), lerp(4.0, 3.7, (t - T.wheels) / 1.0), 0.55)],
  [T.better, t => fr(H_(hero), V3(-0.5, 0.1, -1), 2.2, 0.62)],
  [T.steps, t => fr(V3(0, 1.0, -3.6), V3(1, 0.2, 0.25), 4.2, 0.55)],
  [T.legs, t => fr(rigC(0.9), V3(1, 0.25, 0.35), lerp(3.6, 3.9, (t - T.legs) / 0.9), 0.52)],
  [T.climbs, t => fr(V3(0, 1.6, -4.0), V3(1, 0.25, 0.35), 6.5, 0.6)],
  [T.eggs, t => fr(V3(0.2, 1.1, -3.4), V3(0.9, 0.15, 0.7), 3.4, 0.5)],
  [T.susp, t => { rig.updateMatrixWorld(true); return fr(LEGS[3].hip.localToWorld(V3(0, -0.1, 0)), V3(0.7, 0.1, 1), 1.4, 0.5); }],
  [T.smooth, t => fr(rigC(1.0), V3(-0.5, 0.3, 1), 5.0, 0.55)],
  [T.stare, t => fr(H_(nb1).lerp(H_(nb2), 0.5), V3(1, 0.05, 0.15), 3.3, 0.6)],
  [T.film, t => fr(H_(nb2).add(V3(0.15, 0.1, 0)), V3(1, 0.1, -0.35), 1.6, 0.6)],   // she's filming
  [T.walking, t => fr(H_(hero), V3(-1, 0.1, 0.3), 2.6, 0.6)],
  [T.seat, t => fr(H_(hero), fwd(hero, 0.35, 0.25), 3.0, 0.6)],
  [T.fast, t => fr(rigC(1.3), V3(-0.4, 0.3, 1), 6.2, 0.55)],
  [T.toofast, t => fr(H_(hero), fwd(hero, 0.2), 2.2, 0.6)],
  [T.milk, t => fr(rigC(1.0).add(V3(-0.9, 0, 0)), V3(0.25, 0.3, -1), 6.2, 0.5)],
  [T.belts, t => { rig.updateMatrixWorld(true); return fr(body.localToWorld(V3(-0.35, 0.25, 0.42)), V3(0.3, 0.5, 1), 1.0, 0.5); }],
  [T.formilk, t => fr(H_(hero), fwd(hero, -0.3, 0.05), 1.5, 0.6)],
  [T.leaves, t => fr(rigC(2.0), fwd(hero, 0.6, 0.25), 4.2, 0.45)],
  [T.roof, t => fr(rigC(1.6), fwd(hero, -0.6, 0.6), 5.0, 0.5)],
  [T.thanks, t => fr(H_(hero), fwd(hero, 0.3), 2.2, 0.6)],
  [T.twolegs, t => fr(rigC(0.6), fwd(hero, 4, 0.8), 4.4, 0.5)],
  [T.melt, t => { rig.updateMatrixWorld(true); return fr(KIT.icecream.localToWorld(V3(0, 0.1, 0)), fwd(hero, 0.3, 0.6), 1.0, 0.5); }],
  [T.freezer, t => fr(rigC(1.0), fwd(hero, 0.4, 0.45), 4.6, 0.55)],
  [T.pantry, t => fr(rigC(1.0), fwd(hero, -0.75, 0.35), 4.4, 0.55)],
  [T.dish, t => { rig.updateMatrixWorld(true); return fr(KIT.dish.localToWorld(V3(0, 0.4, 0)), fwd(hero, 0.25, 0.3), 1.6, 0.5); }],
  [T.obv, t => fr(H_(hero), fwd(hero, -0.3, 0.05), 1.4, 0.6)],
  [T.coffee, t => { rig.updateMatrixWorld(true); return fr(coffee.localToWorld(V3(0, 0.15, 0)), fwd(hero, -0.3, 0.3), 1.1, 0.5); }],
  [T.tv, t => fr(H_(hero), fwd(hero, 0.75, 0.35), 2.0, 0.62)],   // front-side: you + the TV
  [T.congr, t => fr(rigC(1.2), fwd(hero, 0.8, 0.45), lerp(5.8, 7.2, (t - T.congr) / 1.3), 0.55)],
  [T.built, t => fr(rigC(1.0), fwd(hero, -0.9, 0.3), lerp(6.5, 6.0, (t - T.built) / 1.6), 0.55)],
  [T.onetrip, t => fr(rigC(1.4), V3(0.35, 0.4, 1), 5.4, 0.55)],
  [T.drive, t => fr(rigC(1.2), V3(0.8, 0.3, 0.7), 5.8, 0.55)],
  [T.keys, t => fr(H_(hero), V3(1, 0.1, 0.45), 2.4, 0.6)],
  [T.keys + 0.8, t => fr(H_(hero), V3(0.15, 0.05, 1), 1.35, 0.6)],
  [T.keys + 1.5, t => fr(carKeys.position, V3(0.5, 0.7, 0.3), 0.5, 0.5)],   // inside the car: the keys on the seat
  [T.two, t => fr(H_(hero), V3(0.4, 0.25, 1), lerp(3.6, 4.0, (t - T.two) / 3.3), 0.6)]];
// ambient occlusion (GTAO at half res) between the scene render and the tone-mapping composite: soft contact shading in every corner, like a modelled set
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const gtao = new GTAOPass(st, stCam, W / 2, H / 2); gtao.renderToScreen = false; gtao.blendIntensity = 1.0;
gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
function shoot(i, t, rt) { update(t); const F = SHOTS[i][1](t); applyF(stCam, F); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(stCam.fov * Math.PI / 360)); shootTo(RTS, st, stCam); gtao.render(renderer, rt, RTS); }
// captions: their style — bold white with a black outline, the phrase's words revealed as they're spoken
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['cap', 'end'].map(k => [k, $(k)]));
const CTA_T = T.two + 1.5;
function updateDOM(t) {
  let cp = CAPS.find(([a, b]) => t >= a && t < b), html = '';
  if (cp) { const ws = WORDS.filter(([wt]) => wt >= cp[0] - 0.01 && wt <= cp[1]); html = ws.map(([wt, w]) => `<span style="opacity:${t >= wt ? 1 : 0}">${w}</span>`).join(' '); }
  else if (t >= CTA_T) html = 'Would you build one? 👇';
  el.cap.innerHTML = html; el.cap.style.opacity = html ? 1 : 0; }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t); return true; }
  shoot(i, t, RTA); compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = CLAY ? 0.012 : 0; composite(0, 1.0, 1.0); updateDOM(t); return true; };   // a clean look: almost no paper grain / vignette
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, nb1, nb2]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
