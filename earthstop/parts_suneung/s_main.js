// =================== THE STORY: "만약 수능 시험장에서 방귀 위력이 2초마다 2배가 된다면?" (MODEL: exit wind 1.5 m/s ×2 every 2 s from t = 2; tools/suneung_math.py)
// 0–16 s exam room · 16–22 s out through the roof, up over Seoul (meters, kw) · 22–30 s stratosphere → escape velocity (km, sp; hero drawn in an overlay pass) · 30–33 end card
const F0 = 2.0, FDT = 2.0, FN = 14, END0 = 30.0, LIFT = 16.0;
const fN = t => clamp(Math.floor((t - F0) / FDT) + 1, 0, FN);
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function wind(t) { let e = 0; for (let k = 1; k <= FN; k++) { const x = (t - (F0 + FDT * (k - 1))) / 0.35; e += x <= 0 ? 0 : x >= 1 ? 1 : easeOutBack(x); } return e; }   // smooth "n"
const vAt = t => 1.5 * Math.pow(2, fN(t));
// altitude after lift-off: ∫ v dt with v doubling every 2 s (piecewise), metres
function altAt(t) { if (t <= LIFT) return 0; let a = 0; for (let k = 8; k <= FN; k++) { const t0 = F0 + FDT * (k - 1), t1 = t0 + FDT; if (t <= t0) break; a += 1.5 * Math.pow(2, k) * (Math.min(t, t1) - t0); } return a; }
// ---- people ----
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, y, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
function settle(P, hipY) { P.outer.updateMatrixWorld(true); P.outer.position.y += hipY - boneW(P, 'pelvis').y; P.outer.updateMatrixWorld(true); }
function sitChair(P, lean = 0) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.5); rotL(P, 'calf_' + s, [1, 0, 0], 1.45); } rotL(P, 'thigh_l', [0, 0, 1], 0.08); rotL(P, 'thigh_r', [0, 0, 1], -0.08); rotL(P, 'spine_01', [1, 0, 0], 0.18 - lean); }
function write(P, t, ph = 0) { armsDown(P, 1); rotL(P, 'upperarm_r', [1, 0, 0], -0.55); rotL(P, 'lowerarm_r', [1, 0, 0], -1.25 + 0.06 * Math.sin(t * 7 + ph)); rotL(P, 'lowerarm_r', [0, 1, 0], 0.5); fingers(P, 'r', 0.55, 0.5);
  rotL(P, 'upperarm_l', [1, 0, 0], -0.45); rotL(P, 'lowerarm_l', [1, 0, 0], -1.2); rotL(P, 'lowerarm_l', [0, 1, 0], -0.6); fingers(P, 'l', 0.3, 0.2); rotL(P, 'head', [1, 0, 0], 0.4); }
function brace(P, t, k = 1) { armsDown(P, 0.5); for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -1.1 * k); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.6 * k); rotL(P, 'upperarm_' + s, [0, 0, 1], q * 0.5 * k * (1 + 0.15 * Math.sin(t * 13 + q))); fingers(P, s, 0.2, 0.1); } rotL(P, 'head', [1, 0, 0], -0.25 * k); }
function flail(P, t) { for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], q * (1.6 + 0.5 * Math.sin(t * 11 + q))); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.6 + 0.4 * Math.sin(t * 9)); fingers(P, s, 0.1, 0); }
  rotL(P, 'thigh_l', [1, 0, 0], -0.4 + 0.5 * Math.sin(t * 10)); rotL(P, 'thigh_r', [1, 0, 0], -0.4 - 0.5 * Math.sin(t * 10)); rotL(P, 'calf_l', [1, 0, 0], 0.6); rotL(P, 'calf_r', [1, 0, 0], 0.6); }
function rocket(P, t) { for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], q * 2.55); rotL(P, 'lowerarm_' + s, [0, 0, 1], q * 0.15); fingers(P, s, 0.05, 0); }
  rotL(P, 'thigh_l', [1, 0, 0], 0.08 * Math.sin(t * 17)); rotL(P, 'thigh_r', [1, 0, 0], -0.08 * Math.sin(t * 17)); rotL(P, 'head', [1, 0, 0], 0.25); }
// ---- cast: the student (centre, row 2) + 19 classmates + the proctor ----
const ME = SEATS.find(s => s.r === 1 && s.c === 2);
const hero = makeHuman('hero', { tee: 'mustard' }); cls.add(hero.outer);
const LOOKS = [['girl', 'cream'], ['hero', 'white'], ['man2', null], ['girl', 'pink'], ['hero', 'navy']];
const mates = SEATS.filter(s => s !== ME).map((s, i) => { const [nm, tee] = LOOKS[(i * 3 + s.r) % LOOKS.length]; const P = makeHuman(nm, tee ? { tee } : {}); cls.add(P.outer); return { P, s, ph: hash(i * 2.1) * 6, d: Math.hypot(s.x - ME.x, s.z - ME.z), behind: s.z > ME.z + 0.1 }; });
const proctor = makeHuman('woman2'); cls.add(proctor.outer);
// ---- papers: every desk's 답안지 + 문제지 lift off and join a loop (back wall → ceiling → front) once the wind reaches them ----
const PAPERS = []; SEATS.forEach((s, i) => { for (const m of [s.omr, s.book]) PAPERS.push({ m, p0: m.position.clone(), r0: m.rotation.clone(), rel: 2.6 + Math.hypot(s.x - ME.x, s.z - ME.z) * 0.32 + hash(i * 7 + m.id) * 0.4 + (s.z < ME.z ? 0.8 : 0), k: hash(i * 3 + m.id * 0.1) }); });
const extraSheets = []; for (let i = 0; i < 70; i++) { const m = mesh(new THREE.PlaneGeometry(0.2, 0.28), i % 2 ? omrM : bookM, true, false); room.add(m); extraSheets.push({ m, k: hash(i * 1.37), x: -3.8 + hash(i * 2.9) * 7.6, off: hash(i * 4.1) * 30 }); }
function loopPos(x, s, out) {   // s = distance along the loop (back along the floor-ish level, up the back wall, forward under the ceiling, down the front wall)
  const L1 = 3.6 - ME.z, L2 = 2.2, L3 = 7.0, L4 = 2.2, L = L1 + L2 + L3 + L4; s = ((s % L) + L) % L;
  if (s < L1) out.set(x, 0.9 + 0.3 * Math.sin(s * 2), ME.z + s); else if ((s -= L1) < L2) out.set(x, 0.9 + s, 3.6); else if ((s -= L2) < L3) out.set(x, 2.8, 3.6 - s); else { s -= L3; out.set(x, 2.8 - s, -3.4 + s * (ME.z + 3.4) / L4); }
  return out; }
// ---- wind streaks + the green-ish puff right behind the chair ----
const streakM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
const streaks = []; for (let i = 0; i < 60; i++) { const m = mesh(new THREE.PlaneGeometry(0.02, 0.9), streakM, false, false); room.add(m); streaks.push({ m, x: -4 + hash(i * 5.3) * 8, off: hash(i * 9.1) * 15 }); }
const puffT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(225,240,205,.9)'); gr.addColorStop(1, 'rgba(225,240,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const puffs = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, depthWrite: false, opacity: 0 })); room.add(s); puffs.push(s); }
// glass shards (windows burst at 12 s)
const shardM = new THREE.MeshStandardMaterial({ color: '#e6f3fa', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const shards = []; for (let i = 0; i < 160; i++) { const m = mesh(new THREE.PlaneGeometry(0.05 + hash(i) * 0.12, 0.04 + hash(i * 2) * 0.1), shardM, false, false); room.add(m); const p = panes[i % panes.length].position; shards.push({ m, p0: p.clone().add(V3(0, (hash(i * 3) - 0.5) * 1.5, (hash(i * 5) - 0.5) * 0.9)), v: V3(-3 - hash(i * 7) * 9, (hash(i * 11) - 0.3) * 4, (hash(i * 13) - 0.5) * 4) }); }
// ---- jet trail for the flight (meters; lives in whichever scene the hero is in) ----
const trailG = new THREE.Group(); const trailS = []; for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, depthWrite: false, opacity: 0.8, fog: false })); trailG.add(s); trailS.push(s); }
const boomRing = mesh(new THREE.RingGeometry(0.85, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); boomRing.rotation.x = -Math.PI / 2; kw.add(boomRing);
// overlay scene for the hero in space (metres, own lights)
const heroS = new THREE.Scene(); heroS.environment = kw.environment; heroS.environmentIntensity = 0.5;
{ const sl = new THREE.DirectionalLight(0xfff4e6, 3.0); sl.position.set(-3, 4, 6); heroS.add(sl); heroS.add(new THREE.HemisphereLight(0x9cc0ff, 0x304050, 0.6)); }
const hCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 2000);
const floatOMR = mesh(new THREE.PlaneGeometry(0.19, 0.27), omrM, false, false); heroS.add(floatOMR);
// ---- text ----
const CAPS = [[2.05, 3.95, '…<span class="hl">뿡.</span>'], [4.05, 5.95, '뒷자리가 <span class="hl">냄새</span>를 맡았습니다.'], [6.05, 7.95, '<span class="hl">답안지</span>가 날아갑니다.'], [8.05, 9.95, '뒷자리 <span class="hl">책상</span>이 밀립니다.'],
  [10.05, 11.95, '태풍 <span class="hl">매미</span>(51m/s)급 바람.'], [12.05, 13.95, '<span class="hl">KTX</span>보다 빠른 바람.<br>창문이 터집니다.'], [14.05, 15.85, '몸이 의자에서 <span class="hl">뜹니다.</span>'], [16.05, 17.95, '<span class="hl">음속 돌파!</span> (343m/s)'],
  [18.05, 19.95, '<span class="hl">여객기</span>보다 3배 빠르게.'], [20.05, 21.95, '<span class="hl">구름</span>을 뚫고…'], [22.05, 23.95, '비행기 높이(11km)까지 <span class="hl">2초.</span>'], [24.05, 25.95, '하늘이 <span class="hl">까매집니다.</span>'],
  [26.05, 27.95, '<span class="hl">지구 탈출 속도</span><br>(11.2km/s) 돌파!'], [28.05, 29.9, '답안지는… <span class="hl">아직 백지.</span>']];
const $ = id => document.getElementById(id);
const fmtV = v => v < 1000 ? Math.round(v).toLocaleString('ko-KR') + ' m/s' : (v / 1000).toFixed(1) + ' km/s';
function text(t) {
  const n = fN(t), pulse = n > 0 ? Math.max(0, 1 - (t - (F0 + FDT * (n - 1))) / 0.35) : 0;
  $('lab').textContent = '방귀 위력'; $('val').textContent = '×' + Math.pow(2, n).toLocaleString('ko-KR'); $('val').style.transform = `scale(${1 + 0.2 * pulse})`; $('val').style.transformOrigin = 'left center';
  const a = altAt(t); $('sub').textContent = `바람 ${fmtV(vAt(t))}` + (a > 0 ? ` · 고도 ${a < 1000 ? Math.round(a) + 'm' : (a / 1000).toFixed(1) + 'km'}` : '');
  $('hud').style.opacity = 1 - smooth(29.8, 30.2, t); $('title').style.opacity = 1 - smooth(1.6, 2.0, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  $('flash').style.opacity = Math.max(smooth(15.75, 15.95, t) * (1 - smooth(16.0, 16.4, t)), 0.7 * Math.max(0, 1 - Math.abs(t - 12.05) / 0.12));
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
// ---- the classroom at time t ----
function classAt(t) {
  const W_ = wind(t), n = fN(t);
  // the student
  const P = hero; poseRest(P); place(P, ME.x, ME.z + 0.48, Math.PI);
  if (t < 14) { sitChair(P, t > 8 ? 0.15 : 0); if (t < 4) write(P, t); else brace(P, t, smooth(4, 6, t)); settle(P, 0.5); P.outer.position.x += 0.01 * Math.sin(t * 40) * smooth(6, 14, t); }
  else { const k = smooth(14, 15.9, t); sitChair(P, 0); flail(P, t); settle(P, 0.5 + k * 1.6); P.outer.rotation.x = 0; P.outer.position.x += 0.04 * Math.sin(t * 31) * k; }
  P.outer.updateMatrixWorld(true);
  face(P, t < 2 ? 'neutral' : t < 4 ? 'worried' : t < 8 ? 'scared' : t < 14 ? 'shocked' : 'scared', t, 1, t >= 14 ? 'shocked' : null, t >= 14 ? 0.5 + 0.5 * Math.sin(t * 6) : 0);
  ME.chair.position.set(ME.x, 0, ME.z + 0.48); ME.chair.rotation.set(0, 0, 0);
  // classmates
  for (const m of mates) { const Q = m.P, s = m.s; poseRest(Q);
    let dz = 0, lean = 0; if (m.behind) { const push = clamp((W_ - 3.6) * 0.7 / (1 + m.d * 0.25), 0, 1); dz = Math.min(3.45 - (s.z + 0.48), push * 4.0); lean = push * 0.4; }
    s.desk.position.z = s.z + dz * 0.95; s.chair.position.z = s.z + 0.48 + dz; s.desk.rotation.y = dz * 0.08 * (hash(s.c) - 0.5); s.chair.rotation.y = s.desk.rotation.y;
    place(Q, s.x, s.z + 0.48 + dz, Math.PI); sitChair(Q, lean);
    const turn = m.d < 3.2 ? smooth(m.d < 1.6 ? 2.6 : 4.0, m.d < 1.6 ? 3.1 : 4.6, t) : 0, ang = Math.atan2(ME.x - s.x, ME.z - s.z) - Math.PI;
    if (t < 4.0 || m.d > 3.2) write(Q, t, m.ph); else if (W_ < 4.2) { write(Q, t, m.ph); rotL(Q, 'head', [0, 1, 0], clamp(ang, -1.2, 1.2) * turn); rotL(Q, 'head', [1, 0, 0], -0.4 * turn); } else brace(Q, t + m.ph, 1);
    if (W_ >= 4.2 && m.d > 3.2) brace(Q, t + m.ph, smooth(9, 10, t));
    settle(Q, 0.5);
    face(Q, t < 2.5 ? 'neutral' : m.d < 1.6 && t < 5 ? 'worried' : W_ < 3.5 ? (m.d < 3.2 ? 'surprised' : 'neutral') : W_ < 5 ? 'scared' : 'shocked', t + m.ph); }
  // proctor at the front: walks along, then grabs the teacher's desk
  { const Q = proctor; poseRest(Q); const x = t < 8 ? 2.2 - 0.25 * t : 0.2; place(Q, x, -RD / 2 + 1.6, t < 8 ? -0.2 : 0.4); armsDown(Q, 1); if (t >= 8) brace(Q, t, 1); else { rotL(Q, 'upperarm_l', [1, 0, 0], -0.3); rotL(Q, 'upperarm_r', [1, 0, 0], -0.3); }
    face(Q, t < 4 ? 'neutral' : t < 8 ? 'worried' : 'shocked', t); }
  // papers
  const tmp = V3();
  for (const p of PAPERS) { const a = t - p.rel; if (a <= 0 || W_ < 2.6) { p.m.position.copy(p.p0); p.m.rotation.copy(p.r0); if (p.m === ME.omr || p.m === ME.book) p.m.position.y = 0.742; continue; }
    const sp = Math.pow(2, Math.min(W_, 7)) * 0.11 + 0.6, s = a * sp * (0.8 + 0.4 * p.k);
    const lift = Math.min(1, a / 0.5); loopPos(p.p0.x + Math.sin(a * 2 + p.k * 6) * 0.4, s, tmp); p.m.position.lerpVectors(p.p0, tmp, lift); p.m.rotation.set(a * (3 + p.k * 4), a * (2 + p.k * 3), a * 5 * p.k); }
  for (const e of extraSheets) { const on = W_ > 3.4; e.m.visible = on; if (!on) continue; const sp = Math.pow(2, Math.min(W_, 7)) * 0.11 + 0.6; loopPos(e.x, (t - 6) * sp * (0.7 + 0.5 * e.k) + e.off, tmp); e.m.position.copy(tmp); e.m.rotation.set(t * (4 + e.k * 5), t * 3 * e.k, t * 2); }
  streakM.opacity = 0.35 * smooth(3.2, 5.5, W_);
  for (const st of streaks) { const sp = Math.pow(2, Math.min(W_, 8)) * 0.2 + 1; loopPos(st.x, t * sp + st.off, tmp); st.m.position.copy(tmp); st.m.rotation.set(Math.PI / 2, 0, 0); }
  puffs.forEach((s, i) => { const a = ((t - 2.0) * 1.6 + i / puffs.length) % 1, on = t > 2.0 && t < 16; s.visible = on; if (!on) return; const k = Math.min(1, W_ / 4);
    s.position.set(ME.x + (hash(i) - 0.5) * 0.3 * (1 + a * 3), 0.42 + a * (0.3 + k * 1.2), ME.z + 0.62 + a * (0.5 + k * 3.2)); const sc = 0.15 + a * (0.3 + k * 0.7); s.scale.set(sc, sc, 1); s.material.opacity = (1 - a) * (0.18 + 0.12 * Math.min(1, W_ / 3)) * (1 - 0.6 * smooth(4, 7, W_)); });
  // windows burst at 12 s
  const broke = t >= 12.0; panes.forEach(p => p.visible = !broke);
  shards.forEach((s, i) => { const a = t - 12.0; s.m.visible = a > 0 && a < 2.5; if (!s.m.visible) return; s.m.position.copy(s.p0).addScaledVector(s.v, a).add(V3(0, -4.9 * a * a, 0)); s.m.rotation.set(a * 9 * hash(i), a * 7, a * 5 * hash(i * 2)); });
}
// ---- camera helpers ----
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function heroFlight(t, scene) {   // pose the flying student at the origin of `scene`'s local frame; returns butt position
  const P = hero; if (P.outer.parent !== scene) scene.add(P.outer); poseRest(P); place(P, 0, 0, 0.3); rocket(P, t);
  face(P, t < 20 ? 'shocked' : t < 24 ? 'laugh' : t < 28 ? 'wow' : 'proud', t); P.outer.updateMatrixWorld(true); }
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  compMat.uniforms.uLook.value = 0.0;
  if (t < LIFT) {
    if (hero.outer.parent !== cls) cls.add(hero.outer);
    classAt(t);
    const H_ = boneW(hero, 'head'), sh = Math.min(7, Math.floor(t / 2)), u = (t % 2) / 2;
    if (sh === 0) LOOK(cCam, V3(3.6 - 0.8 * u, 2.3 - 0.2 * u, -3.4 + 0.6 * u), V3(ME.x, 0.9, ME.z + 0.5), 46);                       // wide from the front corner, push in
    else if (sh === 1) LOOK(cCam, V3(ME.x - 0.75, 1.05, ME.z - 0.95 - 0.1 * u), V3(ME.x + 0.15, 1.05, ME.z + 1.2), 44);                // close: him + the classmate behind
    else if (sh === 2) LOOK(cCam, V3(3.9, 1.5, ME.z + 0.6 + 0.6 * u), V3(-1, 1.1, ME.z + 1.6), 50);                                   // side: papers lift off
    else if (sh === 3) LOOK(cCam, V3(-0.6 + 0.3 * u, 2.0, -3.6), V3(0, 1.0, 1.4), 54);                                               // front wide
    else if (sh === 4) LOOK(cCam, V3(0.5, 1.4, 3.75), V3(ME.x, 1.1, ME.z), 60);                                                    // from the back wall: everything flies at us
    else if (sh === 5) LOOK(cCam, V3(4.1, 2.4, 3.6 - 1.0 * u), V3(-2.5, 1.0, -0.5), 58);                                             // wide from the back corner
    else if (sh === 6) LOOK(cCam, V3(2.6, 1.3, -1.0 + 0.6 * u), V3(-4.5, 1.6, -0.2), 52);                                            // windows burst
    else LOOK(cCam, V3(ME.x + 0.9, 0.55, ME.z - 0.6), V3(ME.x, 1.7 + 1.2 * u, ME.z + 0.3), 64);                                      // low: he rises
    cCam.position.add(V3(0.01 * Math.sin(t * 37), 0.01 * Math.cos(t * 41), 0).multiplyScalar(smooth(8, 14, t) * 3));                 // wind shake
    shootTo(RTA, cls, cCam); composite(0, 1, 1); return true;
  }
  const a = altAt(t), base = V3(-6, 16, 161);   // the roof hole (school at z = 160)
  roofHole.visible = true;
  if (t < 22) {   // ----- out of the roof and up over Seoul (kw, metres) -----
    heroFlight(t, kw); const pos = base.clone().add(V3(0, a + Math.min(1, (t - LIFT) * 6) * 2, 0)); hero.outer.position.copy(pos); hero.outer.updateMatrixWorld(true);
    if (trailG.parent !== kw) kw.add(trailG); trailG.position.copy(pos);
    const len = Math.min(a + 2, 6 + vAt(t) * 0.05); trailS.forEach((s, i) => { const k = i / trailS.length; s.position.set((hash(i) - 0.5) * 0.4, -0.2 - k * len, 0.1); const sc = 0.6 + k * len * 0.12; s.scale.set(sc, sc, 1); s.material.opacity = 0.75 * (1 - k); s.material.fog = true; });
    const bk = (t - LIFT) / 0.7; boomRing.visible = bk > 0 && bk < 1; boomRing.position.copy(base).add(V3(0, 1, 0)); boomRing.scale.setScalar(2 + bk * 60); boomRing.material.opacity = 0.8 * (1 - bk);
    cloudDeck.visible = t >= 19.5; walkersOff();
    if (t < 16.75) LOOK(kCam, V3(36, 3, 262), V3(-6, 55, 160), 64);
    else if (t < 18) { const d = 7; LOOK(kCam, pos.clone().add(V3(d * 0.6, -d * 0.9, d * 0.6)), pos.clone().add(V3(0, 0.9, 0)), 55); }
    else { const d = 6 + Math.min(a * 0.002, 4); LOOK(kCam, pos.clone().add(V3(d * 0.45, d * 0.7, d * 0.75)), pos.clone().add(V3(0, -0.4, 0)), 50); }
    kCam.near = 0.05; kCam.far = 90000; const camD = kCam.position.distanceTo(V3(0, 0, 0)); kw.fog.near = Math.max(900, camD * 0.5); kw.fog.far = Math.max(16000, camD * 6);
    shootTo(RTA, kw, kCam); composite(0, 1, 1); return true;
  }
  // ----- stratosphere → space (Earth in km in `sp`; the student drawn on top in metres) -----
  heroFlight(t, heroS); hero.outer.position.set(0, 0, 0); hero.outer.updateMatrixWorld(true);
  if (trailG.parent !== heroS) heroS.add(trailG); trailG.position.set(0, 0, 0); trailS.forEach((s, i) => { const k = i / trailS.length; s.position.set((hash(i) - 0.5) * 0.3, -0.2 - k * 9, 0.1); const sc = 0.5 + k * 1.6; s.scale.set(sc, sc, 1); s.material.opacity = 0.7 * (1 - k); s.material.fog = false; });
  const u = smooth(22, 30, t), ang = 0.6 + (t - 22) * 0.18, off = V3(Math.sin(ang) * (3.6 + u), 0.4 - 0.6 * u, Math.cos(ang) * (3.6 + u));
  hero.outer.rotation.set(0.15 * Math.sin(t * 0.9), 0.3 + (t - 22) * 0.25, 0.1 * Math.sin(t * 1.3)); hero.outer.updateMatrixWorld(true);
  LOOK(hCam, off, V3(0, 0.9, 0), 46);
  floatOMR.visible = t > 27.5; floatOMR.position.set(0.7 + 0.1 * Math.sin(t * 2), 1.2 + 0.15 * Math.sin(t * 1.3), 0.6); floatOMR.rotation.set(t * 0.9, t * 0.6, 0.3);
  const aK = a / 1000; spCam.position.set(off.x / 1000, aK + off.y / 1000, off.z / 1000); spCam.quaternion.copy(hCam.quaternion); spCam.fov = hCam.fov; spCam.near = 0.5; spCam.far = 200000; spCam.aspect = W / H; spCam.updateProjectionMatrix();
  spSky(14 + aK * 2.2); plane.visible = trail.visible = iss.visible = issRing.visible = false;
  hCam.aspect = W / H; hCam.updateProjectionMatrix();
  renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(heroS, hCam); renderer.autoClear = ac;
  composite(0, 1, 1); return true;
};
function walkersOff() {}
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
