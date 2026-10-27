// =================== "YOU" at 1, 6, 13 and 16 (gender-neutral: bangs, yellow tops) ===================
const YOU = { skin: '#e9b98f', hair: '#4a3020', bottom: '#3a4a6a', shoe: '#f4f4f4', hairStyle: 'bangs' };
const you1 = makeBlock({ ...YOU, top: '#f8e8a0', h: 0.5 }), you6 = makeBlock({ ...YOU, top: '#f2c040', h: 0.66 }), you13 = makeBlock({ ...YOU, top: '#e8a83a', h: 0.88 }), you16 = makeBlock({ ...YOU, top: '#d89030', h: 0.97 });
room.add(you1.outer, you13.outer, you16.outer); yard.add(you6.outer);
const you24 = makeBlock({ ...YOU, top: '#c88a3a' });   // only on the video call (a drawn face in the DOM tile)
// cream on the baby's face (year 1)
const cream = new THREE.Group(); { const cm = M('#fff6ec', { roughness: 0.6 }); for (const [x, y, s] of [[-0.08, 0.06, 0.035], [0.06, -0.05, 0.03], [0.1, 0.09, 0.025], [-0.02, -0.1, 0.04], [0.0, 0.17, 0.03]]) { const c = mesh(new THREE.SphereGeometry(s, 10, 8), cm); c.position.set(x, HEAD_Y + y, HEAD_D / 2 + 0.01); cream.add(c); } } you1.torso.add(cream);
// =================== kitchen additions: table + chairs, high chair with a smash cake, laptop, the little cake with a candle, Mom's phone on the counter ===================
{ bx(1.2, 0.05, 0.8, '#8a5a3a', 1.6, 0.75, -1.05, room); for (const [dx, dz] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) bx(0.05, 0.75, 0.05, '#6a4a30', 1.6 + dx, 0.375, -1.05 + dz, room);
  bx(0.45, 0.05, 0.45, '#6a4a30', 1.6, 0.47, -1.75, room); bx(0.45, 0.6, 0.05, '#6a4a30', 1.6, 0.78, -1.98, room); for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) bx(0.04, 0.47, 0.04, '#6a4a30', 1.6 + dx, 0.235, -1.75 + dz, room); }
const highChair = grp(1.6, 0, -0.25, 0, room); { const w = '#f2f0ea'; bx(0.4, 0.05, 0.4, w, 0, 0.72, 0, highChair); bx(0.4, 0.45, 0.05, w, 0, 0.95, -0.2, highChair); bx(0.46, 0.04, 0.22, w, 0, 0.92, 0.22, highChair); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.22, 0.22], [0.22, 0.22]]) bx(0.035, 0.72, 0.035, w, x, 0.36, z, highChair); }
const smash = new THREE.Group(); smash.position.set(1.6, 0.94, -0.05); room.add(smash); { const c = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), M('#f8e4ec', { roughness: 0.7 })); c.position.y = 0.04; smash.add(c); const tp = mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.015, 16), M('#7ac0e8', { roughness: 0.7 })); tp.position.y = 0.085; smash.add(tp); }
const laptop = new THREE.Group(); laptop.position.set(1.6, 0.775, -1.2); room.add(laptop); { bx(0.36, 0.02, 0.25, '#b8bcc4', 0, 0.01, 0, laptop); const lid = grp(0, 0.02, -0.12, 0, laptop); lid.rotation.x = -0.25; bx(0.36, 0.24, 0.015, '#b8bcc4', 0, 0.12, 0, lid);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.21), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.4, 1.6) })); scr.position.set(0, 0.12, 0.009); lid.add(scr); }
laptop.rotation.y = Math.PI;   // screen faces Mom (she sits on the far side, facing +z)
const lapGlow = new THREE.PointLight(0xc8dcff, 0, 1.4, 1.5); lapGlow.position.set(1.6, 1.05, -1.4); room.add(lapGlow);
const miniCake = new THREE.Group(); miniCake.position.set(3.15, 0.95, -0.95); room.add(miniCake); { const c = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16), M('#6a3a24', { roughness: 0.8 })); c.position.y = 0.035; miniCake.add(c); const ic = mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.012, 16), M('#f4ece0')); ic.position.y = 0.072; miniCake.add(ic); bx(0.008, 0.06, 0.008, '#7ac0e8', 0, 0.11, 0, miniCake); }
const flame = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 2.0, 0.6) })); flame.position.set(3.15, 0.95 + 0.155, -0.95); room.add(flame);
const candleL = new THREE.PointLight(0xffa850, 0, 1.6, 1.5); candleL.position.set(3.15, 1.15, -0.95); room.add(candleL);
const counterPhone = makePhone(); counterPhone.rotation.x = -Math.PI / 2; counterPhone.position.set(3.15, 0.958, -1.05); room.add(counterPhone);
const mug = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), M('#f4f4f2')); mug.position.set(3.1, 1.0, -1.6); room.add(mug);
// =================== backyard additions: 30 balloons on the porch railing, the one she is blowing up ===================
const BAL_C = ['#e84a5a', '#4a8ae8', '#f2c040', '#5ac87a', '#c86ae8', '#f28a3a'];
const balloons = Array.from({ length: 30 }, (_, i) => { const g = new THREE.Group(), x = -2.85 + (i % 15) * 0.3 + 0.08 * (i >= 15), y = 1.75 + 0.35 * hash(i * 2.3) + (i >= 15 ? 0.35 : 0), z = 2.15 + 0.12 * (hash(i * 5.1) - 0.5);
  const b = mesh(new THREE.SphereGeometry(0.15, 14, 10), M(BAL_C[i % 6], { roughness: 0.35 })); b.scale.set(1, 1.18, 1); b.position.set(x, y, z); g.add(b); const s = bx(0.006, y - 1.18, 0.006, '#f4f4f4', x, (y + 1.18) / 2 - 0.08, z, g); yard.add(g); return g; });
const blowing = mesh(new THREE.SphereGeometry(0.15, 14, 10), M('#4a8ae8', { roughness: 0.35 })); yard.add(blowing);
yard.add(mom.outer);
// =================== the takes ===================
const STOOL = V3(1.6, 0.47, -1.75);
function seat(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
function resetCast(t) { for (const P of [mom, dad, you1, you6, you13, you16]) { P.outer.visible = false; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); if (P.phone) P.phone.visible = false; }
  dog.g.visible = false; keys.visible = false; cream.visible = false; smash.visible = false; highChair.visible = false; laptop.visible = false; lapGlow.intensity = 0; miniCake.visible = false; flame.visible = false; candleL.intensity = 0; counterPhone.visible = true; counterPhone.scr.material.color.setRGB(0.05, 0.05, 0.06); spatula.visible = false; }
// modes: intro / b5 / tw (kitchen counter, morning), b1 (high chair), b3 (living room), b4 (night, laptop), b6 (evening, the little cake)
function updateHome(t, mode) { resetCast(t); if (mom.outer.parent !== room) room.add(mom.outer); const P = mom, o = P.outer; o.visible = true;
  lightRoom({ b4: 'night', b6: 'eve' }[mode] || 'day'); mug.visible = mode !== 'b6';
  const atCounter = (ry = 0.3) => { o.position.set(2.85, 0.95, -1.3); o.rotation.y = ry; };
  if (mode === 'intro') { atCounter(); holdPhone(P, t, 'type'); P.face(t > 1.6 ? 'happy' : 'reading', t); }
  else if (mode === 'b1') {   // the smash cake: the baby wears it, she can't stop taking photos
    highChair.visible = smash.visible = true; you1.outer.visible = true; seat(you1, 1.6, 0.745, -0.3); you1.arms[0].rotation.set(-1.0 - 0.5 * Math.max(0, Math.sin(t * 5)), 0, 0.2); you1.arms[1].rotation.set(-0.9 - 0.4 * Math.max(0, Math.sin(t * 5 + 1.5)), 0, -0.2);
    const sm = smooth(B1 + 1.0, B1 + 3.0, t); smash.scale.set(1 + 0.4 * sm, 1 - 0.55 * sm, 1 + 0.3 * sm); cream.visible = t > B1 + 1.6; you1.face(t > B1 + 1.0 ? 'laugh' : 'surprised', t);
    o.position.set(2.45, 0.95, -0.15); o.rotation.y = -1.45; holdPhone(P, t, 'up'); P.face(t > B1 + 1.4 ? 'laugh' : 'happy', t + 0.4); }
  else if (mode === 'b3') {   // thirteen: you in the recliner, mortified; she posts the bathtub photo and laughs
    you13.outer.visible = true; seat(you13, -1.0, 0.42, -1.3); you13.root.rotation.x = -0.1; you13.arms[0].rotation.set(-0.5, 0, -0.4); you13.arms[1].rotation.set(-0.5, 0, 0.4); you13.elbows.forEach(e => e.rotation.x = -1.3);
    you13.face(t < B3 + 3.6 ? 'neutral' : t < B3 + 4.6 ? 'surprised' : 'angry', t);
    o.position.set(-0.15, 0.95, -0.95); o.rotation.y = -0.55; holdPhone(P, t, t < B3 + 3.2 ? 'type' : 'near'); P.face(t < B3 + 3.2 ? 'happy' : 'laugh', t + 0.3); }
  else if (mode === 'b4') {   // the night before sixteen: "I want nothing" — she searches until she finds it
    laptop.visible = true; lapGlow.intensity = 1.6; seat(P, STOOL.x, STOOL.y, STOOL.z); P.arms.forEach(a => a.rotation.set(-0.85, 0, 0)); P.elbows[0].rotation.x = -0.6 - 0.15 * Math.max(0, Math.sin(t * 7)); P.elbows[1].rotation.x = -0.6;
    P.face(t < B4 + 2.0 ? 'reading' : t < B4 + 4.2 ? 'squint' : t < B4 + 5.2 ? 'surprised' : 'proud', t); }
  else if (mode === 'b5') { atCounter(); holdPhone(P, t, 'type'); P.face(t < B5 + 1.2 ? 'reading' : t < B5 + 4.4 ? 'happy' : 'laugh', t); }
  else if (mode === 'b6') {   // 24: she video-calls at 7 a.m. and sings (you pick up, you laugh), then lights a candle and blows it out for you on camera
    atCounter(0.5); miniCake.visible = true; counterPhone.visible = false; const lit = t > B6 + 4.6 && t < B6 + 6.15; flame.visible = lit; candleL.intensity = lit ? 0.45 + 0.08 * Math.sin(t * 17) : 0; flame.scale.y = 1 + 0.15 * Math.sin(t * 13);
    holdPhone(P, t, 'far'); P.arms[1].rotation.z = lerp(0.05, -0.35, smooth(B6 + 3.8, B6 + 4.4, t));
    if (t > B6 + 4.0) { const k = smooth(B6 + 4.0, B6 + 4.6, t) * (1 - smooth(B6 + 5.2, B6 + 5.7, t)); P.arms[0].rotation.set(-0.9 * k, 0, -0.3 * k); P.elbows[0].rotation.x = -0.6 * k; }
    P.root.rotation.x = 0.08 * smooth(B6 + 5.6, B6 + 5.9, t) * (1 - smooth(B6 + 6.3, B6 + 6.8, t));
    // she lifts the little cake up to her face (and the phone camera), then blows
    o.updateMatrixWorld(true); const hd = P.head.getWorldPosition(V3(0, 0, 0)), up = smooth(B6 + 4.0, B6 + 4.6, t), dir = V3(Math.sin(0.5), 0, Math.cos(0.5));
    miniCake.position.copy(V3(3.15, 0.95, -0.95)).lerp(hd.clone().addScaledVector(dir, 0.3).add(V3(0.08, -0.32, 0)), up); flame.position.copy(miniCake.position).add(V3(0, 0.155, 0)); candleL.position.copy(miniCake.position).add(V3(0, 0.2, 0));
    P.face(t < B6 + 0.5 ? 'happy' : t < B6 + 3.8 ? 'laugh' : t < B6 + 5.8 ? 'proud' : t < B6 + 6.25 ? 'surprised' : 'laugh', t); }
  else {   // tw: twenty-five — before she can reach for her phone, it lights up: you texted first
    atCounter(); const pick = t > TW + 1.7, lit = t > TW + 0.9; counterPhone.visible = !pick; if (lit && !pick) counterPhone.scr.material.color.setRGB(1.6, 1.7, 1.9);
    if (!pick) { P.arms[1].rotation.set(lerp(0, -0.7, smooth(TW + 0.2, TW + 1.6, t)), 0, -0.25 * smooth(TW + 0.2, TW + 1.6, t)); P.face(lit ? 'surprised' : 'happy', t); }
    else if (t < REP) { holdPhone(P, t, 'near'); P.face(t < TW + 3.2 ? 'reading' : 'crying', t); }
    else { holdPhone(P, t, 'near'); P.arms[1].rotation.set(-0.7, 0, 0.45); P.elbows[1].rotation.x = -1.6; P.face(t < REP + 1.0 ? 'crying' : 'happy', t); } }
  P.outer.updateMatrixWorld(true); if (P.phone.visible) { P.phone.getWorldPosition(rmGlow.position); rmGlow.position.y += 0.05; } }
function homeCamera(t, mode) { updateHome(t, mode); const h = headOf(mom); let F;
  if (mode === 'intro') F = framing(h, V3(-0.2 + 0.04 * Math.sin(t * 0.5), 0.0, 1), lerp(2.8, 2.4, smooth(0, B1, t)), 0.55);
  else if (mode === 'b1') { const b = headOf(you1); F = blendF(framing(b, V3(0.1, 0.12, 1), 1.6, 0.6), framing(h.clone().lerp(b, 0.5), V3(0.25, 0.12, 1), 2.6, 0.55), smooth(B1 + 2.6, B1 + 5.0, t)); }
  else if (mode === 'b3') { const y = headOf(you13); F = blendF(framing(h, V3(0.3, 0.06, 1), 2.3, 0.64), framing(y.clone().lerp(h, 0.5), V3(0.15, 0.08, 1), 2.9, 0.62), smooth(B3 + 3.0, B3 + 5.0, t)); }
  else if (mode === 'b4') F = framing(h, V3(0.2 + 0.05 * Math.sin(t * 0.4), 0.12, 1), lerp(2.6, 2.1, smooth(B4, B5, t)), 0.66);
  else if (mode === 'b5') F = framing(h, V3(-0.15, 0.05, 1), lerp(2.6, 2.2, smooth(B5, B6, t)), 0.66);
  else if (mode === 'b6') F = blendF(framing(h, V3(-0.1, 0.05, 1), 2.5, 0.64), framing(h, V3(0.05, 0.08, 1), 2.4, 0.6), smooth(B6 + 3.6, B6 + 5.6, t));
  else F = blendF(framing(h, V3(-0.2, 0.05, 1), 2.6, 0.64), framing(h, V3(-0.05, 0.05, 1), 2.0, 0.66), smooth(TW + 1.0, REP + 1.0, t));
  applyF(rmCam, F); }
// b2: year six in the backyard — thirty balloons on the railing; she blows up the last ones on the porch, you run in circles, Dad at the grill
function updateParty(t) { resetCast(t); if (mom.outer.parent !== yard) yard.add(mom.outer); if (dad.outer.parent !== yard) yard.add(dad.outer); const P = mom; P.outer.visible = you6.outer.visible = dad.outer.visible = true;
  const n = Math.min(30, 24 + Math.floor((t - B2) / 1.3)); balloons.forEach((b, i) => b.visible = i < n);
  P.outer.position.set(-0.6, 0.95, 2.95); P.outer.rotation.y = 0.1; P.arms[0].rotation.set(-0.5, 0, -0.3); P.arms[1].rotation.set(-0.5, 0, 0.3); P.elbows.forEach(e => e.rotation.x = -1.5);
  const cyc = ((t - B2) % 1.3) / 1.3; P.outer.updateMatrixWorld(true); const hh = headOf(P); blowing.position.copy(hh).add(V3(0.02, -0.17, 0.2 + 0.06 * cyc)); blowing.scale.setScalar(0.2 + 0.4 * cyc); P.face(cyc < 0.85 ? 'surprised' : 'happy', t);
  const a = (t - B2) * 1.6, cx = 0.9, cz = 3.7; you6.outer.position.set(cx + Math.cos(a) * 0.9, 0.95, cz + Math.sin(a) * 0.9); you6.outer.rotation.y = -a; poseWalk(you6, t * 13, 1); you6.face('laugh', t);
  dad.outer.position.set(1.6, 0.95, 4.35); dad.outer.rotation.y = 0; spatula.visible = true; dad.arms[0].rotation.set(-0.9 - 0.25 * Math.max(0, Math.sin(t * 2.2)), 0, -0.15); dad.elbows[0].rotation.x = -0.5; dad.face('happy', t + 0.8);
  grillSmoke.begin(); smokeMat.uniforms.uTint.value.set('#d8d4d0'); for (let k = 0; k < 40; k++) { const u = ((t * 0.35 + k / 40) % 1); grillSmoke.add(V3(1.6 + 0.1 * Math.sin(k * 3.1 + t) - u * 0.5, 0.95 + u * 1.6, 5.0 + u * 0.5), 0.12 + u * 0.4, 0.2 * (1 - u) * smooth(0, 0.1, u)); } grillSmoke.end(); }
function partyCamera(t) { updateParty(t); const h = headOf(mom); applyF(ydCam, blendF(framing(h, V3(-0.25, 0.05, 1), 2.5, 0.6), framing(V3(0.2, 1.4, 3.3), V3(-0.12, 0.25, 1), 5.6, 0.5), smooth(B2 + 2.6, B2 + 6.2, t))); }
