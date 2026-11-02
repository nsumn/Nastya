// =================== TIMELINE (see STORYBOARD.md). Video t (s) → story s = seconds after the river vanished (5 s stretched ×7.2 between t=6 and t=42) ===================
const T_VAN = 6.0, T_RET = 42.0, SLOW = 7.2, END0 = 58.0;
const storyS = t => (t - T_VAN) / SLOW;
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
// ---- hero path on the ground: mat → bank lip → down the stone slope → across the mud to the phone ----
const PATH = [V3(HERO_MAT.x, 0, HERO_MAT.z), V3(-1.5, 0, -9.2), V3(-2.6, 0, -18.6), V3(-4.0, 0, -23.4)];
const BRIDGE_AIM = V3(-150, 9, -330);
const PHONE_L = V3(-4.3, 0, -24.3); PHONE_L.y = bedHeight(PHONE_L.x, PHONE_L.z) + 0.006;
// a few fish right where the macro shot looks
FISH.slice(0, 7).forEach((f, i) => { const x = PHONE_L.x - 1.2 + i * 0.7 + Math.sin(i * 3.1) * 0.5, z = PHONE_L.z + 1.0 + (i % 3) * 0.9; f.position.set(x, bedHeight(x, z) + 0.05, z); f.userData.y0 = f.position.y; });
function groundY(x, z) { return z > -9 ? 0 : bedHeight(x, z); }
function heading(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
function holdPhone(P) { P.arms[1].rotation.set(-0.55, 0, 0.05); P.elbows[1].rotation.x = -1.35; }
function standPose(P) { for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02; P.torso.rotation.set(0, 0, 0); }
function heroAt(s, t) {
  const P = hero; P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = 0; P.head.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); P.arms[0].rotation.set(0, 0, 0); P.arms[1].rotation.set(0, 0, 0); P.elbows[0].rotation.x = -0.15; P.elbows[1].rotation.x = -0.15;
  const facing = Math.PI + 0.42;
  if (s < 1.0) {   // sitting on the mat, filming; the wind hits at 0.15, rips the phone at 0.3
    P.outer.position.set(HERO_MAT.x - 0.1, 0.17, HERO_MAT.z + 0.15); P.outer.rotation.y = facing; sitPose(P, t, 0); holdPhone(P);
    const w = smooth(0.12, 0.3, s) * (1 - smooth(0.8, 1.0, s));
    P.outer.rotation.x = -0.12 * w + 0.015 * w * Math.sin(t * 9); P.head.rotation.x = 0.1 * w;
    if (s >= 0.3) { const k = smooth(0.3, 0.45, s); P.arms[1].rotation.set(lerp(-0.55, -0.75, k), 0, 0.08); P.elbows[1].rotation.x = lerp(-1.35, -0.3, k); }
    P.arms[0].rotation.set(-0.45 * w, 0, 0); P.elbows[0].rotation.x = -0.15 - 1.55 * w;
    return; }
  if (s < 1.6) {   // gets up
    const k = smooth(1.0, 1.6, s); P.outer.position.set(HERO_MAT.x - 0.1, lerp(0.17, 0.95, k), HERO_MAT.z + 0.15); P.outer.rotation.y = lerp(facing, heading(PATH[0], PATH[1]), k);
    sitPose(P, t, 0); for (let i = 0; i < 2; i++) { P.legs[i].rotation.x = lerp(-1.35, 0, k); P.knees[i].rotation.x = lerp(0.35, 0.02, k) + 0.9 * Math.sin(k * Math.PI); }
    P.outer.rotation.x = 0.25 * Math.sin(k * Math.PI); P.arms[1].rotation.set(lerp(-0.3, 0, k), 0, 0); return; }
  const seg = (a, b, s0, s1) => { const k = clamp((s - s0) / (s1 - s0), 0, 1); return [V3(lerp(a.x, b.x, k), 0, lerp(a.z, b.z, k)), k]; };
  if (s < 2.7 || (s >= 3.9 && s < 4.6)) {   // running (slow motion)
    const [a, b, s0, s1] = s < 2.7 ? [PATH[0], PATH[1], 1.6, 2.7] : [PATH[2], PATH[3], 3.9, 4.6]; const [p] = seg(a, b, s0, s1);
    P.outer.position.set(p.x, groundY(p.x, p.z) + 0.95, p.z); P.outer.rotation.y = heading(a, b); standPose(P); poseWalk(P, (s - s0) * 10.5, 1.8); P.arms[0].rotation.x *= 0.6; P.arms[1].rotation.x *= 0.6; P.outer.rotation.x = 0.12; return; }
  if (s < 3.9) {   // sliding down the stone slope on his backside, arms up for balance
    const [p, k] = seg(PATH[1], PATH[2], 2.7, 3.9); const ee = smooth(0, 1, k); const q = V3(lerp(PATH[1].x, PATH[2].x, ee), 0, lerp(PATH[1].z, PATH[2].z, ee));
    P.outer.position.set(q.x, groundY(q.x, q.z) + 0.3, q.z); P.outer.rotation.y = heading(PATH[1], PATH[2]); sitPose(P, t, 0);
    for (let i = 0; i < 2; i++) { P.legs[i].rotation.x = -1.15; P.knees[i].rotation.x = 0.25; } P.outer.rotation.x = -0.25 + 0.03 * Math.sin(t * 3);
    P.arms[0].rotation.set(0.45, 0, -0.08); P.arms[1].rotation.set(0.45, 0, 0.08); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.1; return; }
  // picks the phone up, straightens, looks up
  const p = PATH[3], k = smooth(4.6, 4.75, s) * (1 - smooth(4.82, 4.95, s));
  P.outer.position.set(p.x, groundY(p.x, p.z) + 0.95 - 0.38 * k, p.z); P.outer.rotation.y = heading(PATH[2], PATH[3]) + 0.4 * smooth(4.85, 5.0, s); standPose(P);
  for (let i = 0; i < 2; i++) { P.legs[i].rotation.x = -0.9 * k; P.knees[i].rotation.x = 1.4 * k; } P.outer.rotation.x = 0.3 * k;
  P.arms[1].rotation.set(lerp(-0.65, -0.55, smooth(4.85, 4.95, s)), 0, 0.05); P.elbows[1].rotation.x = -0.9 - 0.45 * smooth(4.85, 4.95, s);
  P.head.rotation.x = -0.55 * smooth(4.88, 5.0, s);
}
function heroFace(t, s) { const f = t < 6 ? 'happy' : s < 0.2 ? 'neutral' : s < 0.45 ? 'surprised' : s < 1.6 ? 'anxious' : s < 4.7 ? 'angry' : s < 4.9 ? 'happy' : 'surprised'; hero.face(f, t); }
// the phone: in his hand → ripped away by the wind at s=0.3 → tumbles into the canyon (lands s=2.4) → back in his hand at s=4.75
const handPos = () => { hero.outer.updateMatrixWorld(true); const v = V3(0, -0.28, 0.05); hero.elbows[1].localToWorld(v); return v; };
let RIP = null;
function phoneAt(s, t) {
  const ph = heroPhone, hd = headW(hero);
  if (s < 0.3 || s >= 4.75) { ph.position.copy(handPos()); if (s < 0.3) { ph.lookAt(BRIDGE_AIM); ph.rotateY(Math.PI); } else { ph.lookAt(hd); } return; }
  if (!RIP) { heroAt(0.3, T_VAN + 0.3 * SLOW); RIP = handPos(); heroAt(s, t); }
  if (s < 2.4) { const k = (s - 0.3) / 2.1, a = RIP, b = PHONE_L; ph.position.set(lerp(a.x, b.x, k), lerp(a.y, b.y, k) + 2.6 * Math.sin(Math.min(k * 1.25, 1) * Math.PI * 0.62) * (1 - k * k * 0.2), lerp(a.z, b.z, k));
    if (k > 0.55) ph.position.y = Math.max(PHONE_L.y, lerp(a.y, b.y, k) + 2.6 * (1 - (k - 0.55) / 0.45) ** 1.6 * 0.9);
    ph.rotation.set(s * 7.0, s * 4.2, s * 2.6); return; }
  const b = Math.max(0, Math.sin(Math.min(1, (s - 2.4) / 0.25) * Math.PI)) * 0.25 * Math.max(0, 1 - (s - 2.4) / 0.25);
  ph.position.set(PHONE_L.x, PHONE_L.y + 0.004 + b, PHONE_L.z); ph.rotation.set(-Math.PI / 2, 0, 0.6);
}
function headW(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
// ---- the world state at time t ----
let RIPPED = false;
function worldAt(t) {
  const s = storyS(t), dry = t >= T_VAN && t < T_RET, back = t >= T_RET, dtR = t - T_RET;
  carsAt(t); fishAt(t); grassU.uT.value = t;
  // water + the vanish ring
  const r = t < T_VAN ? -1 : t < T_VAN + 0.7 ? 2600 * Math.pow((t - T_VAN) / 0.7, 2.2) : 99999;
  river.material.uniforms.uHR.value = back ? -1 : r; riverFar.visible = !(t >= T_VAN + 0.45 && !back); river.visible = !(dry && t > T_VAN + 0.7);
  vanishRing.visible = t >= T_VAN && t < T_VAN + 0.75; vanishRing.scale.setScalar(Math.max(1, r)); vanishRing.material.opacity = 0.9 * (1 - span(t, T_VAN + 0.3, T_VAN + 0.75));
  bedStuff.visible = t >= T_VAN && t < T_RET + 0.5;
  // fountain: jets fall to the bed once the water is gone, pumps lose water from s=2.5 (sputter)
  const pw = !dry ? 1 : 1 - 0.85 * smooth(2.4, 3.6, s) + (s > 2.4 ? 0.12 * Math.max(0, Math.sin(t * 13) * Math.sin(t * 5.3)) : 0);
  setJets(t, 32, pw, dry && t > T_VAN + 0.2 ? BED_Y : WATER_Y);
  // ferry: hangs where the water was, falls (lands at s≈0.98), tossed up by the returning water
  const fBed = bedHeight(ferry.position.x, ferry.position.z) + 1.35;
  if (t < T_VAN) ferry.position.y = WATER_Y + 0.05 * Math.sin(t * 1.3); else if (!back) ferry.position.y = Math.max(fBed, WATER_Y - 4.905 * Math.max(0, s - 0.02) ** 2);
  else ferry.position.y = dtR < 2.6 ? lerp(fBed, WATER_Y, smooth(0, 0.25, dtR)) + 5.5 * Math.sin(Math.PI * clamp(dtR / 2.6, 0, 1)) : WATER_Y + 0.4 * Math.sin(dtR * 2.0) * Math.exp(-(dtR - 2.6) * 0.5);
  ferry.rotation.z = back ? 0.12 * Math.sin(dtR * 1.8) * Math.exp(-dtR * 0.25) : (dry && s > 0.97 ? 0.04 * Math.exp(-(s - 0.97) * 6) : 0);
  splashAt(dry ? (t - (T_VAN + 0.98 * SLOW)) / SLOW * 3.0 : 0, ferry.position.x, ferry.position.z, fBed - 1.2);
  // wind + debris + the crowd leaning away
  const wind = dry ? smooth(0.12, 0.3, s) * (1 - smooth(0.8, 1.3, s)) : 0; grassU.uWind.value = wind; debrisAt(dry ? s : t < T_VAN ? -1 : 9, t);
  CROWD.forEach((P, i) => { sitPose(P, t, i); P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = -0.12 * wind; if (wind > 0.3 && i % 3 === 0) { P.arms[0].rotation.set(-0.45, 0, 0); P.arms[1].rotation.set(-0.5, 0, 0); P.elbows[0].rotation.x = -1.7; P.elbows[1].rotation.x = -1.6; } if (back && dtR > 1) P.head.rotation.x = -0.1; });
  // foam
  foamAt(back ? dtR : -1);
  // hero + phone
  if (t < T_RET) { hero.outer.visible = true; heroAt(Math.max(s, -1), t); heroFace(t, s); phoneAt(Math.max(s, -1), t); heroPhone.visible = true; }
  else if (t >= 52) { const P = hero; P.outer.visible = true; standPose(P); P.head.rotation.set(0, 0, 0); const k = smooth(52, 52.8, t);
    P.outer.position.set(PATH[3].x, WATER_Y - 0.3 - 1.4 * (1 - k) + 0.06 * Math.sin(t * 2.2), PATH[3].z); P.outer.rotation.y = 0.5; P.arms[1].rotation.set(-0.6, 0, 0.05); P.elbows[1].rotation.x = -1.9; P.arms[0].rotation.set(-0.3, 0, 0); P.elbows[0].rotation.x = -0.6;
    P.face(t < 53.2 ? 'surprised' : 'laugh', t); P.outer.updateMatrixWorld(true); const hp = V3(0, -0.3, 0.02); P.elbows[1].localToWorld(hp); heroPhone.position.copy(hp); heroPhone.rotation.set(0, 0.5 + Math.PI, 0.1); heroPhone.visible = true; }
  else { hero.outer.visible = false; heroPhone.visible = false; }
  return s;
}
// ---- cameras per shot ----
const LOOKC = (p, l, fov) => { hCam.position.copy(p); hCam.up.set(0, 1, 0); hCam.lookAt(l); hCam.fov = fov; };
function camAt(t, s) {
  dof(hCam, 1, 0); const hd = headW(hero);
  if (t < 3) {   // S1: from inside the phone screen, pulling back past his head to over-the-shoulder
    const ph = heroPhone.position, n = V3(0, 0, 1).applyQuaternion(heroPhone.quaternion), u = ease(span(t, 0.2, 3.0));
    const f = V3(Math.sin(Math.PI + 0.42), 0, Math.cos(Math.PI + 0.42)), right = V3(-f.z, 0, f.x);
    const p0 = ph.clone().addScaledVector(n, 0.3).add(V3(0, 0.05, 0)), p2 = hd.clone().addScaledVector(f, -0.8).addScaledVector(right, 0.2).add(V3(0, 0.08, 0)), mid = ph.clone().lerp(p2, 0.5).addScaledVector(right, 0.55);
    const p = p0.clone().multiplyScalar((1 - u) ** 2).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(p2, u * u);
    LOOKC(p, ph.clone().lerp(hd.clone().addScaledVector(f, 30).add(V3(0, 2.5, 0)), smooth(0.35, 1, u)), 34); window.__dbg = [hd, p, ph, hero.outer.position].map(v => v.toArray().map(a => a.toFixed(2)).join(",")).join(" | "); dof(hCam, p.distanceTo(ph), lerp(6, 4, u)); aimSun(hd.x, hd.z); return; }
  if (t < 6) {   // S2: orbit from behind-right to front-right, food in the foreground
    const a = lerp(2.2, 0.75, ease(span(t, 3, 6))) , f0 = Math.PI + 0.42, ang = f0 + a, rad = lerp(1.6, 1.9, span(t, 3, 6));
    const p = hd.clone().add(V3(Math.sin(ang) * rad, lerp(0.15, -0.1, span(t, 3, 6)), Math.cos(ang) * rad)); LOOKC(p, hd.clone().add(V3(0, -0.12, 0)), 36); dof(hCam, rad, 8); aimSun(hd.x, hd.z); return; }
  if (t < 7.2) {   // S3: low wide on the lip, the ring races out from the bridge
    const u = span(t, 6, 7.2), sh = 0.06 * Math.exp(-(t - 6) * 3) * Math.sin(t * 60);
    LOOKC(V3(lerp(10, 7, u), 1.5 + sh, lerp(-7.4, -8.4, u)), V3(-150, 4 + sh * 10, -380), lerp(40, 37, u)); aimSun(0, -6); return; }
  if (t < 11) {   // S4: close on him from the river side as the wind hits; the phone flies past the lens
    const f = V3(Math.sin(Math.PI + 0.42), 0, Math.cos(Math.PI + 0.42)), right = V3(-f.z, 0, f.x), u = span(t, 7.2, 11), sh = 0.012 * smooth(7.3, 8, t) * (1 - smooth(10, 11, t));
    const p = hd.clone().addScaledVector(f, lerp(1.9, 1.45, ease(u))).addScaledVector(right, lerp(-0.6, -0.35, u)).add(V3(sh * Math.sin(t * 41), -0.18 + sh * Math.cos(t * 37), 0));
    LOOKC(p, hd.clone().add(V3(0, -0.15, 0)), 34); dof(hCam, p.distanceTo(hd), 9); aimSun(hd.x, hd.z); return; }
  if (t < 14) {   // S5: the ferry drops onto the bed
    const u = span(t, 11, 14), fc = ferry.position; LOOKC(V3(lerp(-196, -205, u), lerp(7, 3, u), lerp(-238, -246, u)), V3(fc.x, fc.y + 1, fc.z), 40); aimSun(fc.x, fc.z); return; }
  if (t < 19) {   // S6: drone glide down the empty canyon toward the sunset and the 63 Building
    const u = ease(span(t, 14, 19)), p = V3(lerp(40, -760, u), lerp(30, 14, u) + 6 * Math.sin(u * Math.PI), lerp(-60, -430, u) + 40 * Math.sin(u * Math.PI));
    LOOKC(p, V3(p.x - 260, -14, p.z - 70 + 60 * (1 - u)), 42); aimSun(p.x - 100, p.z - 50); return; }
  if (t < 24) {   // S7: macro over the bed: fish, a bike, cans; the phone lands in front of the lens
    const u = ease(span(t, 19, 24)), x = lerp(1.8, -2.4, u), z = lerp(-27.8, -25.9, u), p = V3(x, bedHeight(x, z) + lerp(0.5, 0.3, u), z);
    LOOKC(p, V3(PHONE_L.x, PHONE_L.y + 0.12, PHONE_L.z), 34); dof(hCam, p.distanceTo(PHONE_L), 12); aimSun(p.x, p.z); return; }
  if (t < 29) {   // S8: low at the foot of the slope, he slides down toward us
    const x = -3.4, z = -21.2, p = V3(x, bedHeight(x, z) + 0.55, z); LOOKC(p, hd.clone().add(V3(0, -0.4, 0)), lerp(36, 30, span(t, 24, 29))); dof(hCam, p.distanceTo(hd), 6); aimSun(hd.x, hd.z); return; }
  if (t < 35) {   // S9: follow behind him across the mud; the fountain sputters in the distance
    const dir = V3(PATH[3].x - PATH[2].x, 0, PATH[3].z - PATH[2].z).normalize(), side = V3(-dir.z, 0, dir.x), u = span(t, 29, 35);
    const p = hd.clone().addScaledVector(dir, -lerp(2.6, 3.2, u)).addScaledVector(side, lerp(1.1, 1.6, u)).add(V3(0, 0.25, 0)); LOOKC(p, hd.clone().addScaledVector(dir, 1.2).add(V3(0, -0.35, 0)), 38); dof(hCam, p.distanceTo(hd), 4); aimSun(hd.x, hd.z); return; }
  if (t < 40.2) {   // S10a: front, low, push in as he reaches the phone and picks it up
    const dir = V3(PATH[3].x - PATH[2].x, 0, PATH[3].z - PATH[2].z).normalize(), u = ease(span(t, 35, 40.2)), tgt = V3(PATH[3].x, groundY(PATH[3].x, PATH[3].z) + 1.0, PATH[3].z);
    const p = tgt.clone().addScaledVector(dir, lerp(4.6, 2.7, u)).add(V3(0.7, lerp(-0.1, 0.15, u), 0)); LOOKC(p, tgt.clone().add(V3(0, -0.05, 0)), 36); dof(hCam, p.distanceTo(tgt), 7); aimSun(tgt.x, tgt.z); return; }
  if (t < T_RET) {   // S10b: crane up — the tiny hero in the empty canyon, the last half second
    const u = ease(span(t, 40.2, 42)), tgt = V3(PATH[3].x, groundY(PATH[3].x, PATH[3].z), PATH[3].z), p = tgt.clone().add(V3(lerp(2.0, 4.5, u), lerp(1.6, 9, u), lerp(2.6, 11, u)));
    LOOKC(p, tgt.clone().lerp(BRIDGE_AIM, 0.03 * u).add(V3(0, 0.9 * (1 - u), 0)), lerp(40, 46, u)); aimSun(tgt.x, tgt.z); return; }
  if (t < 46.5) {   // S11a: the water is back — and erupts
    const u = span(t, 42, 46.5), sh = 0.15 * Math.exp(-(t - 42) * 1.2) * Math.sin(t * 50);
    LOOKC(V3(lerp(12, 9, u), 2.2 + sh, lerp(-6.2, -7.2, u)), V3(-120, 6 + lerp(0, 8, u) + sh * 4, -380), 40); aimSun(0, -6); return; }
  if (t < 52) {   // S11b: crane up and back over the fizzing river toward the sunset
    const u = ease(span(t, 46.5, 52)); LOOKC(V3(lerp(30, 140, u), lerp(14, 130, u), lerp(10, 170, u)), V3(-320, 0, -420), 42); aimSun(0, -60); return; }
  // S12: he surfaces with the phone held up
  const u = span(t, 52, END0), p = hd.clone().add(V3(lerp(1.7, 1.3, u), lerp(-0.25, -0.15, u), lerp(1.6, 1.25, u))); p.y = Math.max(p.y, WATER_Y + 0.25);
  LOOKC(p, hd.clone().add(V3(0, 0.05, 0)), 36); dof(hCam, p.distanceTo(hd), 8); aimSun(hd.x, hd.z);
}
// ---- overlay text ----
const TITLE = ['만약', '<span class="hl">한강</span>이', '<br>', '5초', '동안', '사라진다면?'];
const CAPS = [[3.2, 5.8, '반포한강공원, 저녁 7시'], [7.4, 9.15, '물이 있던 자리는 <span class="hl">진공</span>'], [9.25, 11.0, '<span class="hl">20만 톤</span>의 공기가 쏟아진다'],
  [11.2, 13.9, '유람선이 <span class="hl">바닥</span>으로 떨어진다'], [14.3, 18.7, '폭 <span class="hl">800m</span> · 깊이 <span class="hl">6m</span> · 길이 <span class="hl">41km</span>'],
  [19.3, 23.0, '강바닥엔 <span class="hl">잃어버린 것들</span>'], [24.3, 28.6, '너는 <span class="hl">휴대폰</span>을 주우러 간다'], [29.4, 34.2, '분수 펌프는 이제 <span class="hl">공기</span>만 빨아들인다'],
  [42.6, 46.8, '<span class="m">MODEL</span>물이 돌아오자, 갇힌 공기가 <span class="hl">터져 나온다</span>'], [47.0, 51.6, '한강 전체가 <span class="hl">탄산처럼</span> 끓는다'], [52.6, 57.6, '휴대폰은 <span class="hl">방수</span>였다']];
const fmtT = x => '0:0' + Math.max(0, x).toFixed(3);
let lastCap = '';
function kineticHTML(html) { // wrap words (outside tags) in spans for the word-by-word entrance
  const out = []; let i = 0; const parts = html.split(/(<[^>]+>)/); let depth = 0;
  for (const p of parts) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } }
  return out.join(''); }
function text(t) {
  const s = storyS(t);
  // title, word by word
  const tt = $('title'); if (!tt.dataset.ok) { tt.innerHTML = TITLE.map((w, i) => w === '<br>' ? '<br>' : `<span class="w" data-i="${i}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.25 - i * 0.2) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(5.2, 5.8, t);
  // HUD timer
  let lab, val, sub = ''; if (t < T_VAN) { lab = '한강 사라지기까지'; val = fmtT(T_VAN - t); } else if (t < T_RET) { lab = '한강 복귀까지'; val = fmtT(5 - s); sub = '시간 ×7 느리게'; } else { lab = '한강 복귀'; val = fmtT(0); sub = '실제 시간'; }
  $('lab').innerHTML = '<b></b>' + lab; $('val').textContent = val; $('sub').textContent = sub;
  const pop = Math.max(0, 1 - Math.abs(t - T_VAN) / 0.25) + Math.max(0, 1 - Math.abs(t - T_RET) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pop})`; $('val').style.transformOrigin = 'left center';
  const big = smooth(38.4, 38.9, t) * (1 - smooth(42.0, 42.15, t)); $('big').textContent = fmtT(t < T_RET ? 5 - s : 0); $('big').style.opacity = big; $('big').style.transform = `scale(${1 + 0.05 * Math.sin(Math.max(0, t - 38.4) * 9) * big})`;
  $('hud').style.opacity = (1 - big * 0.9) * (1 - smooth(51.4, 51.9, t)) * smooth(0.1, 0.4, t); $('mark').style.opacity = 1 - smooth(END0, END0 + 0.4, t);
  // captions, word by word
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); }
  else { cp.style.opacity = 0; }
  $('flash').style.opacity = 0.55 * Math.max(0, 1 - Math.abs(t - T_VAN) / 0.12) + 0.75 * Math.max(0, 1 - (t - T_RET) / 0.35) * (t >= T_RET ? 1 : 0);
  $('end').style.opacity = smooth(END0, END0 + 0.5, t); $('endT').style.opacity = smooth(END0 + 0.3, END0 + 0.9, t); $('endS').style.opacity = smooth(END0 + 0.9, END0 + 1.6, t);
}
// ---- render: phone screen pass, scene, sub-frame motion blur on the fast shots ----
function frameAt(t) { const s = worldAt(t); camAt(t, s);
  if (t < 6.2) { heroPhone.updateMatrixWorld(true); phoneCam.position.copy(heroPhone.position); phoneCam.lookAt(BRIDGE_AIM); heroPhone.visible = false; const hv = hero.outer.visible; hero.outer.visible = false;
    renderer.setRenderTarget(phoneRT); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(hw, phoneCam); heroPhone.visible = true; hero.outer.visible = hv; }
  shootTo(RTA, hw, hCam); }
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => (t >= 6 && t < 7.2) || (t >= 11 && t < 19) || (t >= 42 && t < 46.5) || (t >= 40.2 && t < 42);
window.renderAt = (t) => {
  if (window.PASS !== 'text') { const s0 = worldAt(t); camAt(t, s0); }
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0;
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
