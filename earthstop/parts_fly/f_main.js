// =================== THE STORY: wake up floating (bonk), out over Manhattan at golden hour, pigeons, bugs, cold, a jet, a latte through a window, lost, the pool, the roof ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const mid = () => H_(hero).lerp(H_(friend), 0.5); const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
// seated: hips on a seat at height y (hip joint sits 0.9·h above the body origin, which is 0.95 below outer)
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1)), span = (t, a, b) => (t - a) / (b - a), Y_ = V3(0, 1, 0);
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
for (const o of [friend.outer]) o.visible = false;
const latte = new THREE.Group(); { const c = mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.12, 14), F_('#f4f0e8', { flatShading: false })); latte.add(c); const sl = mesh(new THREE.CylinderGeometry(0.041, 0.036, 0.04, 14), F_('#8a5a3a')); sl.position.y = -0.01; latte.add(sl); const lid = mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.015, 14), F_('#f4f4f4')); lid.position.y = 0.066; latte.add(lid); }
const phone = new THREE.Group(); { bx(0.075, 0.15, 0.01, '#1a1a1e', 0, 0, 0, phone); const scr = mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshBasicMaterial({ color: '#0a0a0e' })); scr.position.z = 0.006; phone.add(scr); phone.userData.scr = scr; }
const frost = new THREE.Group(); for (let k = 0; k < 14; k++) { const f = mesh(new THREE.ConeGeometry(0.008, 0.03, 4), F_('#e8f4ff', { emissive: '#406080' })); f.position.set(-0.09 + k * 0.014, 0.1 + 0.01 * Math.sin(k), 0.19); f.rotation.x = Math.PI; frost.add(f); } hero.head.add(frost); frost.scale.setScalar(1 / 0.42); frost.position.set(0, 0, 0); frost.visible = false;
const bugs = new THREE.Group(); for (let k = 0; k < 7; k++) { const b = mesh(new THREE.SphereGeometry(0.006, 6, 4), F_('#151515')); b.position.set(-0.03 + k * 0.01, -0.085 + 0.006 * Math.sin(k * 2), 0.205); bugs.add(b); } hero.head.add(bugs); bugs.scale.setScalar(1 / 0.42); bugs.visible = false;
function attach(obj, P, k = 1) { P.outer.updateMatrixWorld(true); obj.position.copy(P.elbows[k].localToWorld(V3(0, -0.3, 0.06))); }
function flyPose(P, t, pos, dir, wob = 1) { place(P, 0, 0, 0, 0); P.outer.position.copy(pos); P.outer.rotation.order = 'YXZ'; P.outer.rotation.set(Math.PI / 2 - 0.25 + 0.05 * Math.sin(t * 2.3) * wob, Math.atan2(dir.x, dir.z), 0.08 * Math.sin(t * 1.7) * wob);
  P.arms[1].rotation.set(-3.0, 0, -0.1); P.elbows[1].rotation.x = -0.1; P.arms[0].rotation.set(-0.1, 0, 0.12); P.legs.forEach((l, i) => l.rotation.x = 0.08 * Math.sin(t * 3 + i * 3)); P.knees.forEach(k => k.rotation.x = 0.1); }
const fpos = t => flyPath(t), fdir = t => flyPath(t + 0.05).sub(flyPath(t)).normalize();
function pose(t, k) { const P = hero; poseReset(P, t); P.outer.rotation.order = 'XYZ'; latte.visible = phone.visible = frost.visible = bugs.visible = false; BD.stars.forEach(s => s.visible = false);
  if (k === 'bed') { const up = smooth(0.9, 1.5, t), down = smooth(1.62, 2.1, t); place(P, -0.6, -1.4, 0, lerp(0.05, 0.98, up) - 0.5 * down);
    P.outer.rotation.set(-Math.PI / 2 * (1 - smooth(1.0, 1.4, t)) * (1 - down) + (-Math.PI / 2) * down * 0.0, 0, 0); P.face(t < 0.9 ? 'sleepy' : t < 1.55 ? 'surprised' : 'dumb', t);
    if (t > 1.55) { P.outer.updateMatrixWorld(true); const hd = headOf(P); BD.stars.forEach((s, i) => { s.visible = t < 3.0; const a = t * 6 + i * 1.256; s.position.copy(hd).add(V3(Math.cos(a) * 0.22, 0.2 + 0.03 * Math.sin(a * 2), Math.sin(a) * 0.22)); }); } }
  else if (k === 'city') { const pos = fpos(t), dir = fdir(t); flyPose(P, t, pos, dir, 1);
    if (t >= PIGEON && t < BUGS) { P.arms[0].rotation.set(-2.4 + 0.5 * Math.sin(t * 12), 0, 0.8); P.elbows[0].rotation.x = -1.2; P.face(Math.sin(t * 5) > 0 ? 'angry' : 'surprised', t); }
    else if (t >= BUGS && t < COLD) { P.face(t < BUGS + 1.8 ? 'laugh' : 'dumb', t); bugs.visible = t > BUGS + 1.8; }
    else if (t >= COLD && t < JET) { P.face('worried', t); frost.visible = true; P.outer.position.x += 0.01 * Math.sin(t * 40); }
    else if (t >= JET && t < COFFEE) { const tumble = smooth(JET + 3.0, JET + 3.6, t) * (1 - smooth(JET + 5.6, JET + 6.6, t)); P.outer.rotation.z += 6.0 * tumble * (t - JET - 3); P.face(tumble > 0.1 ? 'dumb' : 'surprised', t); }
    else P.face('laugh', t); }
  else if (k === 'office') { const pos = CT.office.position.clone().add(V3(0, 102.6, 22.6)); place(P, 0, 0, 0, 0); P.outer.position.copy(pos).add(V3(0, 0.95 + 0.05 * Math.sin(t * 2), 0)); P.outer.rotation.y = Math.PI; P.legs.forEach((l, i) => l.rotation.x = 0.2 * Math.sin(t * 2 + i));
    const got = t > COFFEE + 3.4; if (got) { P.arms[1].rotation.set(-1.5, 0, -0.1); P.elbows[1].rotation.x = -1.2 - 0.3 * smooth(COFFEE + 4.8, COFFEE + 5.3, t); attach(latte, P); latte.visible = true; } else { P.arms[1].rotation.set(-1.3, 0, -0.1); P.elbows[1].rotation.x = -0.4; CT.worker.outer.updateMatrixWorld(true); latte.visible = true; latte.position.copy(CT.worker.elbows[1].localToWorld(V3(0, -0.3, 0.06))); }
    P.face(t < COFFEE + 3.4 ? 'happy' : t < COFFEE + 5 ? 'proud' : 'love', t); CT.worker.arms[1].rotation.set(got ? -0.3 : -1.5, 0, -0.1); CT.worker.elbows[1].rotation.x = -0.2; }
  else if (k === 'lost') { const pos = flyPath(COFFEE).add(V3(0, 40, 0)); place(P, 0, 0, 0, 0); P.outer.position.copy(pos).add(V3(0, 0.95 + 0.08 * Math.sin(t * 2), 0)); P.outer.rotation.y = 0.8 * Math.sin((t - LOST) * 0.9);
    P.arms[1].rotation.set(-1.2, 0, -0.2); P.elbows[1].rotation.x = -1.4; attach(phone, P); phone.visible = true; phone.lookAt(headOf(P)); phone.userData.scr.material.color.set(t < LOST + 2.2 ? '#3a7ad8' : '#050505'); P.face(t < LOST + 2.2 ? 'worried' : 'sad', t); }
  else if (k === 'yard') { const s0 = POOL + 1.9, u = clamp((t - POOL) / 1.9, 0, 1); place(P, 0, 0, 0, 0);
    if (t < s0) { P.outer.position.set(lerp(-6, 0, u), lerp(14, 0.4, u * u) + 0.95, lerp(-4, 0, u)); P.outer.rotation.set(-0.4 + 2.0 * u, 0.6, 0); P.arms.forEach((a, i) => a.rotation.set(-2.6, 0, i ? -0.7 : 0.7)); P.face('surprised', t); }
    else { const b = clamp((t - s0 - 0.6) / 0.8, 0, 1); P.outer.position.set(0.3, -0.25 + 0.55 * b, 0.2); P.outer.rotation.set(0, 0.3, 0); P.face(t < s0 + 1.6 ? 'dumb' : 'smirk', t); P.arms[1].rotation.set(-2.6, 0, -0.2); P.elbows[1].rotation.x = -0.3; attach(latte, P); latte.visible = t > s0 + 1.4; } }
  else if (k === 'roof') { const base = CT.roof.position.clone().add(V3(4, 161, 14)), fade = smooth(ROOF + 2.5, ROOF + 4.0, t), drop = smooth(ROOF + 4.0, ROOF + 4.25, t); place(P, 0, 0, 0, 0);
    P.outer.position.copy(base).add(V3(0, 0.95 + 0.6 * (1 - fade) * (1 - drop) + 0.15 * Math.sin(t * 3) * (1 - fade), 0)); P.outer.rotation.y = 0.4;
    P.face(t < ROOF + 2.5 ? 'happy' : t < ROOF + 4.2 ? 'worried' : t < ROOF + 6 ? 'surprised' : 'proud', t); if (t > ROOF + 4.2 && t < ROOF + 5) { P.knees.forEach(k2 => k2.rotation.x = 0.8); P.legs.forEach(l => l.rotation.x = -0.6); P.outer.position.y -= 0.25; } } }
const SETS = { bed: BED, city: CITY, office: CITY, lost: CITY, yard: YARD, roof: CITY };
const UPD = { bed: updateBed, city: updateCity, office: updateCity, lost: updateCity, yard: updateYard, roof: updateCity };
const hd = () => headOf(hero);
const chase = (back, up, side, look = 0.0) => t => { const p = fpos(t), d = fdir(t), s = V3(d.z, 0, -d.x); return { pos: p.clone().addScaledVector(d, -back).add(V3(0, up, 0)).addScaledVector(s, side), look: p.clone().addScaledVector(d, look), fov: 50 }; };
// first person (her ask): the camera sits just in front of your face, looking where you look; your outstretched arm/hand is in frame
const povFly = (pitch = -0.35) => t => { const h = hd(), d = fdir(t), look = h.clone().addScaledVector(d, 10).add(V3(0, 10 * Math.tan(pitch), 0)); return { pos: h.clone().addScaledVector(d, 0.22).add(V3(0, 0.12, 0)), look, fov: 62 }; };
const SHOTS = [   // [start, set, camera(t), opts]
  [0, 'bed', t => lerpF(LOOK(1.6, 0.7, 1.4, -0.6, 1.6, -1.4), LOOK(0.6, 1.3, 0.2, -0.6, 2.2, -1.3), esin(span(t, 0, 1.6))), { dof: hd }],   // you float up out of bed… into the fan
  [1.6, 'bed', t => fr(hd(), V3(0.6, -0.1, 1), lerp(0.9, 0.75, span(t, 1.6, OUT)), 0.6), { dof: hd, whip: 1 }],   // BONK: dizzy stars
  [OUT, 'city', t => chase(4.5, 1.2, 1.4, 6)(t), { mb: true, whip: 1 }],   // out over Manhattan
  [OUT + 1.4, 'city', t => povFly(-0.45)(t), { mb: true }],   // POV: Manhattan below, your arm out front
  [OUT + 2.8, 'city', t => orbit(fpos(t), V3(1, 0.25, 0.2), -0.6, 0.5, 9, 7, 0.55, span(t, OUT + 2.8, PIGEON)), { dof: () => fpos(t0g) }],   // golden hour orbit
  [PIGEON, 'city', t => povFly(-0.1)(t), { mb: true }],   // POV: pigeons straight at your face
  [PIGEON + 1.5, 'city', t => chase(2.6, 0.5, 1.6, 1)(t), { dof: hd }],   // pigeons attack
  [PIGEON + 3.0, 'city', t => orbit(hd(), V3(-1, 0.1, 0.4), -0.3, 0.3, 2.0, 1.6, 0.55, span(t, PIGEON + 3, BUGS)), { dof: hd, whip: -1 }],
  [BUGS, 'city', t => { const h = hd(), d = fdir(t); return { pos: h.clone().addScaledVector(d, 0.42).add(V3(0, -0.62, 0)), look: h.clone().add(V3(0, -0.05, 0)), fov: 42 }; }, { dof: hd }],   // face first: bugs in the teeth
  [COLD, 'city', t => { const h = hd(), d = fdir(t), a = lerp(-0.4, 0.4, span(t, COLD, JET)); const s2 = V3(d.z, 0, -d.x); return { pos: h.clone().addScaledVector(d, 0.6 * Math.cos(a)).addScaledVector(s2, 0.6 * Math.sin(a)).add(V3(0, -0.7, 0)), look: h, fov: 42 }; }, { dof: hd, whip: 1 }],   // frost on your brows
  [JET, 'city', t => { const p = fpos(t); return { pos: p.clone().add(V3(14, 3, 26)), look: p.clone().add(V3(-6, 1, 0)), fov: 52 }; }, { mb: true }],   // a jet roars past behind you
  [COFFEE, 'office', t => { const h = hd(); return { pos: h.clone().add(V3(0, 0.08, -0.18)), look: CT.office.position.clone().add(V3(0.4, 103.75, 20.9)), fov: 58 }; }, { whip: -1 }],   // POV: you at the window, your hand reaching for the latte
  [COFFEE + 2.2, 'office', t => { const r = CT.office.position.clone().add(V3(0.8, 103.9, 18.6)); return { pos: r, look: CT.office.position.clone().add(V3(0, 103.6, 22)), fov: 48 }; }, { dof: hd }],   // reverse: from inside the office   // from inside the office: a latte, please
  [COFFEE + 3.6, 'office', t => fr(hd(), V3(0.5, 0.05, -1), lerp(1.4, 1.2, span(t, COFFEE + 3.6, LOST)), 0.6), { dof: hd }],
  [LOST, 'lost', t => orbit(hd(), V3(0.4, 0.15, 1), -0.4, 0.4, 2.4, 1.8, 0.58, span(t, LOST, POOL)), { dof: hd, whip: 1 }],   // the phone dies
  [POOL, 'yard', t => { const h = hd(); return { pos: h.clone().add(V3(0.15, -0.15, 0.1)), look: V3(0, 0, 0), fov: 64 }; }, { mb: true }],   // POV: the pool rushing up at you
  [POOL + 1.3, 'yard', t => lerpF(LOOK(7, 3, 8, -1, 2, -1), LOOK(5, 1.6, 6, 0, 0.6, 0), esin(span(t, POOL + 1.3, POOL + 2.2))), { mb: true }],   // incoming… SPLASH
  [POOL + 3.0, 'yard', t => fr(hd(), V3(0.5, 0.1, 1), lerp(1.8, 1.5, span(t, POOL + 3, ROOF)), 0.6), { dof: hd }],
  [ROOF, 'roof', t => orbit(hd(), V3(0.7, 0.12, 1), -0.25, 0.3, 3.2, 2.4, 0.56, span(t, ROOF, ENDC)), { dof: hd, whip: -1 }]];   // sunset on the roof: the power fades
let t0g = 0;
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { t0g = t; const [, k, cf] = SHOTS[i], S = SETS[k]; puffsReset(); S.sc.add(hero.outer); hero.outer.visible = true; for (const o of [latte, phone]) if (o.parent !== S.sc) S.sc.add(o);
  UPD[k](t, S.cam); pose(t, k); birds(t, k);
  if (k === 'city' || k === 'office' || k === 'lost' || k === 'roof') CT.plane.visible = k === 'city' && t >= JET && t < COFFEE;
  if (CT.plane.visible) { const u = (t - JET - 1.2) / 4.0, p = fpos(t); CT.plane.position.set(p.x + 90 - 180 * u, p.y + 6, p.z - 18); CT.plane.rotation.set(0, 0.1, 0.05); }
  const F = cf(t); applyF(S.cam, F); if (k !== 'bed' && k !== 'yard') updateCity(t, S.cam);
  if (k === 'cold') {}
  if (S === CITY && !(k === 'roof' || k === 'office')) { shootTo(rt, S.sc, S.cam); return; }
  shootTo(RTS, S.sc, S.cam); const spr = []; S.sc.traverse(o => { if (o.isSprite && o.visible) { spr.push(o); o.visible = false; } }); aoFor(k).render(renderer, rt, RTS); spr.forEach(o => { o.visible = true; }); }
function birds(t, k) { const on = k === 'city' && t >= PIGEON - 0.5 && t < BUGS; CT.birds.forEach((b, i) => { b.visible = on; if (!on) return; const h = fpos(t), a = t * (1.6 + 0.3 * hash(i)) + i * 0.7, r = 1.0 + 1.6 * hash(i * 3);
    b.position.copy(h).add(V3(Math.cos(a) * r, 0.4 * Math.sin(t * 2 + i) + 0.3, Math.sin(a) * r)); b.lookAt(h); const f = Math.sin(t * 22 + i); b.userData.w[0].rotation.z = 0.7 * f; b.userData.w[1].rotation.z = -0.7 * f; }); }
// ---- DOM ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS', 'flash'].map(k => [k, $(k)]));
const CAPS = [[OUT + 0.2, OUT + 2.8, 'You wake up. You can fly.'], [OUT + 2.8, PIGEON - 0.1, 'For one day.'],
  [PIGEON + 0.2, PIGEON + 3.0, 'Problem #1: pigeons think you’re competition.'], [PIGEON + 3.0, BUGS - 0.1, 'They do not share the sky.'],
  [BUGS + 0.2, COLD - 0.1, 'At 40 mph, every bug ends up in your teeth.'],
  [COLD + 0.2, COLD + 2.8, 'Every 1,000 ft up: about <b>3.5°F</b> colder.'], [COLD + 2.8, JET - 0.1, 'Your eyebrows freeze first.'],
  [JET + 0.2, JET + 3.4, 'Drones must stay under <b>400 ft</b>. You’re not a drone.'], [JET + 3.4, COFFEE - 0.1, 'US planes hit wildlife ~<b>19,600</b> times a year. Don’t be #19,601.'],
  [COFFEE + 0.2, COFFEE + 3.6, 'Floor 30: “One oat latte, please.”'], [COFFEE + 3.6, LOST - 0.1, 'HR has questions.'],
  [LOST + 0.2, LOST + 2.4, 'Your phone dies at 4%.'], [LOST + 2.4, POOL - 0.1, 'No map. Every roof looks the same.'],
  [POOL + 0.2, POOL + 3.0, 'So you land… in the neighbors’ pool.'], [POOL + 3.0, ROOF - 0.1, 'The latte survived.'],
  [ROOF + 0.2, ROOF + 2.5, 'Sunset. The power is fading…'], [ROOF + 2.5, ROOF + 5.5, '…while you’re 1 foot above the roof.'], [ROOF + 5.5, ENDC - 0.1, 'Tomorrow: the stairs. All 40 floors.']];
function hudAt(t) { if (t >= COLD && t < JET) { const ft = lerp(1100, 1800, smooth(COLD, JET, t)); return ['ALTITUDE · TEMP', fmt(ft) + ' FT', 'AIR: ' + Math.round(48 - ft / 1000 * 3.5) + '°F · STREET: 48°F']; }
  if (t >= JET && t < COFFEE) return ['ALTITUDE', '1,800 FT', 'DRONE LIMIT: 400 FT']; if (t >= LOST && t < POOL) return ['BATTERY', t < LOST + 2.2 ? '4%' : '0%', ''];
  if (t >= OUT && t < COLD) return ['FLIGHT TIME', '0:' + String(Math.floor((t - OUT) * 2.5)).padStart(2, '0'), 'DAY 1 OF 1']; return null; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0.1, OUT, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.flash.style.opacity = 0.7 * Math.exp(-Math.pow((t - 1.56) / 0.06, 2)) + 0.4 * Math.exp(-Math.pow((t - POOL - 1.9) / 0.08, 2));
  el.labels.innerHTML = t > 1.5 && t < 2.6 ? `<div class="lb" style="left:540px;top:760px;font-size:120px;letter-spacing:.05em;color:#ffd040;opacity:${(1 - smooth(2.2, 2.6, t)).toFixed(2)};transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 0.3 * Math.exp(-(t - 1.55) * 8)).toFixed(2)})">BONK!</div>` : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.7, ENDC + 1.0, t); }
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
window.sceneReady = (async () => { await document.fonts.ready;
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
