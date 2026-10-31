// =================== THE STORY: "만약 내 키가 1.5초마다 2배가 된다면?" — doubling k (1…18) lands at t = 2.0 + 1.5·(k−1) ===================
const TK = k => T0 + DT * (k - 1);
const nAt = t => clamp(Math.floor((t - T0) / DT) + 1, 0, NDBL);
const easeOutBack = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// smooth growth: each doubling takes 0.42 s with a small overshoot
function expo(t) { let e = 0; for (let k = 1; k <= NDBL; k++) { const x = (t - TK(k)) / 0.42; e += x <= 0 ? 0 : x >= 1 ? 1 : easeOutBack(x); } return e; }
// ---- people helpers ----
function place(P, x, z, ry, dy = 0) { P.outer.position.set(x, dy, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
function sitGround(P, knee = 0.35) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.45 + knee * 0.5); rotL(P, 'calf_' + s, [1, 0, 0], knee); rotL(P, 'foot_' + s, [1, 0, 0], -0.3); }
  rotL(P, 'thigh_l', [0, 0, 1], 0.12); rotL(P, 'thigh_r', [0, 0, 1], -0.12); rotL(P, 'spine_01', [1, 0, 0], 0.12); }
function holdBowl(P, eat = 0) { armsDown(P, 1.0);
  rotL(P, 'upperarm_l', [1, 0, 0], -0.5); rotL(P, 'lowerarm_l', [1, 0, 0], -1.0); rotL(P, 'lowerarm_l', [0, 1, 0], -0.95); rotL(P, 'hand_l', [0, 0, 1], -1.3); fingers(P, 'l', 0.55, 0.35);
  rotL(P, 'upperarm_r', [1, 0, 0], -0.55 - 0.25 * eat); rotL(P, 'lowerarm_r', [1, 0, 0], -1.35 - 0.3 * eat); rotL(P, 'lowerarm_r', [0, 1, 0], 0.8); fingers(P, 'r', 0.5, 0.5); }
function settle(P, hipY = 0.1) { P.outer.updateMatrixWorld(true); const py = boneW(P, 'pelvis').y; P.outer.position.y += hipY - py; P.outer.updateMatrixWorld(true); }
// standing poses (after poseRest + place)
const STAND = {
  look:  (P, t) => { armsDown(P, 0.85); for (const [s, k] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.35); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.9); rotL(P, 'lowerarm_' + s, [0, 1, 0], -0.3 * k); fingers(P, s, 0.15, 0.1); }
    rotL(P, 'head', [1, 0, 0], 0.35); rotL(P, 'spine_03', [1, 0, 0], 0.08); },
  cheer: (P, t) => { armsDown(P, 0.3); for (const [s, k] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], k * (1.25 + 0.12 * Math.sin(t * 7))); rotL(P, 'lowerarm_' + s, [0, 0, 1], k * 0.5); fingers(P, s, 0.9, 0.6); }
    rotL(P, 'head', [1, 0, 0], -0.12); },
  down:  (P, t) => { armsDown(P, 0.9); fingers(P, 'l', 0.3, 0.2); fingers(P, 'r', 0.3, 0.2); rotL(P, 'head', [1, 0, 0], 0.65); rotL(P, 'spine_03', [1, 0, 0], 0.25); },
  wow:   (P, t) => { armsDown(P, 0.6); for (const [s, k] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], k * 0.35); fingers(P, s, 0.05, 0.0); } rotL(P, 'head', [1, 0, 0], 0.25); },
  shy:   (P, t) => { armsDown(P, 1.0); for (const [s, k] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.2); fingers(P, s, 0.5, 0.3); } rotL(P, 'head', [1, 0, 0], 0.2); },
  wave:  (P, t) => { armsDown(P, 1.0); fingers(P, 'l', 0.4, 0.3); rotL(P, 'upperarm_r', [0, 0, 1], -2.35); rotL(P, 'lowerarm_r', [0, 0, 1], -0.35 + 0.45 * Math.sin(t * 9)); fingers(P, 'r', 0.05, 0.0); rotL(P, 'head', [0, 1, 0], -0.15); },
};
// blend two poses bone by bone (each pose fn runs on a fresh rest pose)
function poseMix(P, A, B, k) { poseRest(P); A(); const qa = {}; for (const n in P.bones) qa[n] = P.bones[n].quaternion.clone(); const ya = P.outer.position.y;
  poseRest(P); const keep = P.outer.position.y; B(); const yb = P.outer.position.y; for (const n in P.bones) P.bones[n].quaternion.copy(qa[n]).slerp(P.bones[n].quaternion, k); P.outer.position.y = lerp(ya, yb, k); P.outer.updateMatrixWorld(true); }
// ---- cast ----
const hero = makeHuman('hero', { tee: 'mustard' }); kw.add(hero.outer);
poseRest(hero); const HH = new THREE.Box3().setFromObject(hero.outer).max.y;   // rest height of the model (≈1.76)
const cup = ramenCup(); cup.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters.radiusTop < 0.01).forEach(c => c.visible = false); kw.add(cup);
const sticks = new THREE.Group(); for (const s of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(0.0025, 0.0035, 0.21, 6), M('#d8c08a')); c.position.set(0.006 * s, 0.07, 0); c.rotation.z = 0.04 * s; sticks.add(c); } kw.add(sticks);
picnicMat(0.05, 0.2, 0.1, '#3b78c4');
const walkers = [];
for (const [nm, x, z, ry, o] of [['girl', -0.55, -8.2, 1.75, { tee: 'cream' }], ['man2', 1.35, -9.4, -1.6, {}], ['woman2', -1.2, -9.6, 1.5, {}]]) { const P = makeHuman(nm, o); kw.add(P.outer); walkers.push({ P, x, z, ry }); }
const crowd = []; { const names = ['girl', 'man2', 'woman2', 'hero']; for (let i = 0; i < 14; i++) { const a = (i % 3 ? -0.9 : 2.2) + hash(i * 3.3) * 1.8, r = 14 + hash(i * 5.1) * 26;
  const P = makeHuman(names[i % 4], i % 4 === 0 ? { tee: 'cream' } : i % 4 === 3 ? { tee: 'mustard' } : {}); kw.add(P.outer); crowd.push({ P, x: Math.sin(a) * r, z: Math.cos(a) * r, a }); } }
function walkCycle(P, ph, amp = 1) { rotL(P, 'thigh_l', [1, 0, 0], 0.35 * amp * Math.sin(ph)); rotL(P, 'thigh_r', [1, 0, 0], -0.35 * amp * Math.sin(ph)); rotL(P, 'calf_l', [1, 0, 0], 0.45 * amp * Math.max(0, Math.sin(ph + 1.6))); rotL(P, 'calf_r', [1, 0, 0], 0.45 * amp * Math.max(0, -Math.sin(ph + 1.6)));
  rotL(P, 'upperarm_l', [1, 0, 0], -0.3 * amp * Math.sin(ph)); rotL(P, 'upperarm_r', [1, 0, 0], 0.3 * amp * Math.sin(ph)); }
// ---- shots ----
const SHOTS = [0, 2.0, 5.0, 8.0, 11.0, 14.0, 17.0, 20.0, 23.0, 26.0, 29.5, K_END];
const shotAt = t => { let i = 0; while (i < SHOTS.length - 2 && t >= SHOTS[i + 1]) i++; return i; };
const CAPS = [[2.1, 3.45, '라면 먹다가… <span class="hl">갑자기.</span>'], [3.5, 4.95, '벌써 <span class="hl">가로등</span>보다 큽니다.'], [5.0, 6.45, '나무보다 <span class="hl">두 배</span>.'], [6.5, 7.95, '<span class="hl">아파트 9층</span> 높이.'],
  [8.1, 10.95, '사람들이 <span class="hl">개미</span>처럼 보여요.'], [11.1, 12.45, '서울이 <span class="hl">장난감</span> 같아요.'], [12.5, 13.95, '<span class="hl">63빌딩</span>(249m)을 넘었습니다.'],
  [14.1, 15.45, '한강이 <span class="hl">개울</span>처럼 보여요.'], [15.5, 16.95, '<span class="hl">롯데월드타워</span>(555m)의 3배.'], [17.05, 18.45, '<span class="hl">한라산</span>(1,947m)보다 높아요.'], [18.5, 19.95, '<span class="hl">구름</span> 위로.'],
  [20.2, 22.95, '<span class="hl">비행기</span>가 눈앞을 지나갑니다.'], [23.05, 24.45, '하늘이 <span class="hl">까매집니다.</span>'], [24.5, 25.95, '100km, 여기서부터 <span class="hl">우주.</span>'], [26.05, 27.45, '지구가 <span class="hl">둥글게</span> 보여요.'],
  [27.5, 29.4, '18번째: <span class="hl">우주정거장</span>과<br>눈이 마주쳤습니다.']];
const $ = id => document.getElementById(id);
const fmtH = h => h < 1000 ? (h < 10 ? h.toFixed(1) : Math.round(h).toLocaleString('ko-KR')) + 'm' : (h / 1000 < 100 ? (h / 1000).toFixed(1) : Math.round(h / 1000).toLocaleString('ko-KR')) + 'km';
function text(t) {
  const n = nAt(t), pulse = n > 0 ? Math.max(0, 1 - (t - TK(n)) / 0.35) : 0;
  $('lab').textContent = '내 키'; $('val').textContent = fmtH(1.7 * Math.pow(2, n)); $('val').style.transform = `scale(${1 + 0.18 * pulse})`; $('val').style.transformOrigin = 'left center';
  $('sub').textContent = n ? `${n}번째 · 1.5초마다 ×2` : '1.5초마다 ×2';
  $('hud').style.opacity = 1 - smooth(29.3, 29.7, t);
  $('title').style.opacity = 1 - smooth(1.6, 2.05, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.12, t) * (1 - smooth(c[1] - 0.12, c[1], t)) : 0;
  const e = smooth(29.5, 30.0, t); $('end').style.opacity = e; $('endT').style.opacity = smooth(29.8, 30.3, t); $('endS').style.opacity = smooth(30.3, 30.8, t);
}
// ---- one frame ----
const CUP0 = { p: null };
function heroPose(t, s) {
  const P = hero, sh = shotAt(t);
  const SIT = () => { place(P, 0, 0, 0.35); sitGround(P); holdBowl(P, 0.5 + 0.5 * Math.sin(t * 4)); rotL(P, 'head', [0, 1, 0], -0.15); rotL(P, 'head', [1, 0, 0], 0.12); settle(P, 0.1 * s); };
  const face0 = (nm, nm2, mix) => face(P, nm, t, 1, nm2, mix);
  P.outer.scale.setScalar(s);
  if (t < 2.0) { poseRest(P); SIT(); face0('chewing'); return; }
  const ryFace = { 1: 0.45, 2: 0.6, 3: 0.2, 4: 0.25, 5: -0.25, 6: 0.15 }[sh] ?? 0.3;
  const stand = (kind) => () => { place(P, 0, 0, ryFace); STAND[kind](P, t); };
  if (t < 2.8) { poseMix(P, SIT, stand('look'), smooth(2.0, 2.7, t)); face0('surprised', 'shocked', smooth(2.0, 2.6, t)); return; }
  poseRest(P);
  if (t < 3.5) { stand('look')(); face0('shocked', 'surprised', smooth(3.0, 3.5, t)); }
  else if (t < 8.0) { stand('cheer')(); face0('laugh'); }
  else if (t < 11.0) { stand('down')(); face0('wow', 'laugh', smooth(9.4, 9.9, t)); }
  else if (t < 14.0) { stand('wow')(); face0('wow', 'surprised', smooth(12.4, 12.8, t)); }
  else if (t < 17.0) { stand('cheer')(); face0('happy', 'laugh', smooth(15.4, 15.8, t)); }
  else if (t < 20.0) { stand('wow')(); face0('wow'); }
}
const HUP = V3(0, 1, 0);
function orbitCam(cam, tgt, dist, az, el, fov = 40) { cam.position.set(tgt.x + Math.sin(az) * Math.cos(el) * dist, tgt.y + Math.sin(el) * dist, tgt.z + Math.cos(az) * Math.cos(el) * dist); cam.up.copy(HUP); cam.lookAt(tgt); cam.fov = fov; }
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  const hM = HH * Math.pow(2, expo(t)), s = hM / HH, sh = shotAt(t), u = (t - SHOTS[sh]) / (SHOTS[sh + 1] - SHOTS[sh]);
  if (t >= 29.5) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  if (t < 20.0) {
    // ----- SEOUL (meters) -----
    if (hero.outer.parent !== kw) kw.add(hero.outer);
    heroPose(t, s);
    // cup + chopsticks: in the hand while sitting, then they drop on the mat
    if (t < 2.0) { const palm = boneW(hero, 'hand_l').lerp(boneW(hero, 'middle_01_l'), 0.6), tip = boneW(hero, 'middle_03_l').lerp(boneW(hero, 'index_03_l'), 0.5); cup.position.copy(palm.lerp(tip, 0.55)).add(V3(0, 0.01, 0)); cup.rotation.set(0, 0.35, 0);
      const a = boneW(hero, 'thumb_03_r').lerp(boneW(hero, 'index_03_r'), 0.5), d = boneW(hero, 'index_03_r').sub(boneW(hero, 'index_01_r')).normalize(); sticks.position.copy(a); sticks.quaternion.setFromUnitVectors(V3(0, 1, 0), d.add(V3(0, -0.6, 0)).normalize()); CUP0.p = cup.position.clone(); CUP0.s = sticks.position.clone(); }
    else { const k = clamp((t - 2.0) / 0.42, 0, 1), p0 = CUP0.p || V3(0.1, 0.75, 0.3); cup.position.set(p0.x + 0.15 * k, Math.max(0.05, p0.y - 4.9 * Math.pow((t - 2.0), 2)), p0.z + 0.35 * k); cup.rotation.set(1.4 * k, 0.35, 0.6 * k);
      const s0 = CUP0.s || V3(0, 0.9, 0.3); sticks.position.set(s0.x - 0.2 * k, Math.max(0.01, s0.y - 4.9 * Math.pow(t - 2.0, 2)), s0.z + 0.3 * k); sticks.rotation.set(1.5 * k, 0, 0.3); }
    cup.visible = sticks.visible = t < 8.0;
    // walkers: stroll → stop and stare (2.2 s) → run away (3.6 s)
    walkers.forEach((w, i) => { const P = w.P; poseRest(P); const run = smooth(3.6, 4.0, t); let x = w.x + Math.sin(w.ry) * 0.9 * Math.min(t, 2.2);
      if (t > 3.6) x += Math.sin(w.ry) * 4.2 * (t - 3.6);
      const look = Math.atan2(-x, -w.z), ry = t < 2.2 ? w.ry : t < 3.6 ? lerp(w.ry, look, smooth(2.2, 2.7, t)) : w.ry;
      place(P, x, w.z, ry); armsDown(P, 0.9); walkCycle(P, t * (t > 3.6 ? 11 : 5.5) + i * 2, t > 2.2 && t < 3.6 ? 0.0 : t > 3.6 ? 1.6 : 1);
      if (t > 2.2 && t < 3.6) rotL(P, 'head', [1, 0, 0], -0.5 * smooth(2.2, 2.8, t));
      fingers(P, 'l', 0.3, 0.2); fingers(P, 'r', 0.3, 0.2); face(P, t < 2.2 ? 'neutral' : t < 3.6 ? 'scared' : 'shocked', t); P.outer.visible = t < 12; });
    crowd.forEach((c, i) => { const P = c.P; poseRest(P); const run = Math.max(0, t - 3.6 - hash(i) * 0.6), d = V3(c.x, 0, c.z).normalize(); place(P, c.x + d.x * 4.5 * run, c.z + d.z * 4.5 * run, run > 0 ? Math.atan2(d.x, d.z) : Math.atan2(-c.x, -c.z));
      armsDown(P, 0.9); walkCycle(P, t * 11 + i, run > 0 ? 1.6 : 0); face(P, run > 0 ? 'shocked' : 'scared', t); P.outer.visible = t > 1.0 && t < 12; });
    cloudDeck.visible = t >= 16.5;
    // camera
    const tgt = V3(0, hM * 0.6, 0); let near = 0.05;
    if (sh === 0) { kCam.position.set(0.32 - 0.05 * u, 1.45 - 0.05 * u, 3.05 - 0.3 * u); kCam.up.copy(HUP); kCam.lookAt(-0.02, -1.6, -20); kCam.fov = 40; }
    else if (sh === 1) orbitCam(kCam, V3(0, Math.max(0.9, hM * 0.62), 0), 2.2 + hM * 1.55, lerp(0.35, 0.55, u), lerp(0.05, 0.22, u));
    else if (sh === 2) orbitCam(kCam, V3(0, hM * 0.58, 0), hM * 2.0 + 3, lerp(0.55, 0.85, u), lerp(0.1, 0.2, u));
    else if (sh === 3) { kCam.up.copy(HUP); kCam.position.set(lerp(0.25, 0.15, u) * hM, 1.3, 1.45 * hM); kCam.lookAt(0, 0.24 * hM, 0); kCam.fov = 62; near = 0.1; }   // worm's-eye: the crowd runs past the camera, the giant towers above
    else if (sh === 4 || sh === 5) {   // side-on to the hero ↔ landmark line, so both stand at the same depth (fair size comparison)
      const L = sh === 4 ? B63 : LOTTE, mid = L.clone().multiplyScalar(0.5), sep = L.length(), perp = V3(-L.z, 0, L.x).normalize(); if (perp.z < 0) perp.negate();
      const D = Math.max(sep * (sh === 4 ? 3.1 : 3.8), hM * 2.5) * lerp(1.0, 0.94, u); mid.y = Math.max(hM * 0.56, (sh === 4 ? 249 : 555) * 0.5);
      kCam.up.copy(HUP); kCam.position.copy(mid).addScaledVector(perp, D).add(V3(0, D * 0.12, 0)).addScaledVector(L.clone().normalize(), lerp(-0.05, 0.05, u) * D); kCam.lookAt(mid); kCam.fov = 40; }
    else orbitCam(kCam, V3(0, hM * 0.6, 0), hM * 2.2, lerp(0.1, 0.3, u), lerp(0.22, 0.3, u));
    kCam.near = Math.max(near, kCam.position.distanceTo(tgt) * 0.004); kCam.far = 90000;
    const camD = kCam.position.length(); kw.fog.near = Math.max(900, camD * 0.7); kw.fog.far = Math.max(16000, camD * 5);
    // sun shadow follows the hero's size
    const sb = Math.max(14, hM * 0.9); Object.assign(kSun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 1, far: 60 + sb * 6 }); kSun.shadow.camera.updateProjectionMatrix();
    kSun.position.copy(SUN_DIR).multiplyScalar(30 + sb * 3); kSun.target.position.set(0, hM * 0.3, 0); kSun.shadow.normalBias = 0.03 * Math.max(1, sb / 14);
    shootTo(RTA, kw, kCam); compMat.uniforms.uLook.value = 0.0; composite(0, 1, 1); return true;
  }
  // ----- SPACE (km) -----
  const hK = hM / 1000; if (hero.outer.parent !== sp) sp.add(hero.outer);
  const P = hero; P.outer.scale.setScalar(hK / HH); poseRest(P); place(P, 0, 0, 0.25);
  if (t < 23) { STAND.wow(P, t); face(P, 'surprised', t); } else if (t < 26) { STAND.shy(P, t); face(P, 'scared', t, 1, 'wow', smooth(25.0, 25.6, t)); } else { STAND.wave(P, t); face(P, 'proud', t, 1, 'laugh', smooth(27.4, 27.8, t)); }
  const az = 0.25 + (t - 20) * 0.015, el = lerp(0.12, 0.22, smooth(20, 29, t));
  const tgtY = hK * (t >= 26 ? 0.82 : 0.6), dist = hK * (t >= 26 ? 1.25 : 2.0);
  orbitCam(spCam, V3(0, tgtY, 0), dist, az, el); spCam.near = dist * 0.002; spCam.far = 200000;
  spSky(spCam.position.y);
  // airliner at 11 km crossing in front of the face (20.2–23)
  const pk = (t - 20.2) / 2.8; plane.visible = trail.visible = pk > 0 && pk < 1;
  if (plane.visible) { const px = lerp(-9, 9, pk), pz = hK * 0.35; plane.position.set(px, 11.5, pz); plane.rotation.y = 0; const pd = plane.position.distanceTo(spCam.position); plane.scale.setScalar(Math.max(1, pd * 0.004 / 0.064));
    trail.position.set(px - 6, 11.5, pz); trail.scale.set(pd * 0.0012 / 0.06, 12, pd * 0.0012 / 0.06);
    issRing.visible = true; issRing.position.copy(plane.position); issRing.quaternion.copy(spCam.quaternion); issRing.scale.setScalar(pd * 0.022); }
  // ISS at ~420 km, sliding past the face (26.5–29.4); a gold ring marks it
  const ik = (t - 26.3) / 3.2; iss.visible = ik > 0 && ik < 1; if (!plane.visible) issRing.visible = iss.visible;
  if (iss.visible) { const hd = boneW(P, 'head'); iss.position.set(lerp(-90, 60, ik), 420, hd.z + 25); iss.rotation.set(0.3, t * 0.2, 0); const d = iss.position.distanceTo(spCam.position);
    issRing.position.copy(iss.position); issRing.quaternion.copy(spCam.quaternion); issRing.scale.setScalar(d * 0.03 * (1 + 0.08 * Math.sin(t * 8))); iss.scale.setScalar(Math.max(1, d * 0.0025 / 0.109)); }
  shootTo(RTA, sp, spCam); compMat.uniforms.uLook.value = 0.0; composite(0, 1, 1); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(1.99); window.renderAt(0); return true; })();
