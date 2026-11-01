// =================== STORY: "만약 내 박수 소리가 칠 때마다 2배가 된다면?" — graduation day in the same classroom (parts_suneung/s_class.js), MODEL: tools/clap_math.py
// 85 dB, ×2 pressure (+6 dB) per clap, a clap every 1.2 s from 2.0 s; clap 18 (22.4 s) ≈ 193 dB = the limit of sound in air; clap 19 = a shock wave over Seoul.
const C0 = 2.0, CDT = 1.2, CN = 19, END0 = 27.5;
const TC = k => C0 + CDT * (k - 1);
const nC = t => clamp(Math.floor((t - C0) / CDT) + 1, 0, CN);
const dB = n => 85 + 20 * Math.log10(Math.pow(2, n));
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const sinceClap = t => { const n = nC(t); return n ? t - TC(n) : 99; };
// ---- graduation dressing: board text, no exam papers, bouquets on the desks, a banner ----
bd.material.map = canvasTex(1600, 600, (g, w, h) => { g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#35503f', '#2a4434', '#3a5646'], 3);
  g.fillStyle = 'rgba(240,240,232,.95)'; g.textAlign = 'center'; g.font = '500 110px "Noto Sans KR"'; g.fillText('졸업을 축하합니다!', w / 2, 230);
  g.font = '400 56px "Noto Sans KR"'; g.fillText('한강고등학교 제48회 졸업식', w / 2, 360); g.fillStyle = 'rgba(255,200,210,.9)'; g.font = '400 60px "Noto Sans KR"'; g.fillText('♥  3학년 2반 사랑해  ♥', w / 2, 480); });
bd.material.needsUpdate = true;
SEATS.forEach(s => { s.omr.visible = s.book.visible = false; });
const bouquet = () => { const g = new THREE.Group(); const wrap = mesh(new THREE.ConeGeometry(0.07, 0.22, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#f3e7d8', side: THREE.DoubleSide, roughness: 0.8 })); wrap.rotation.x = Math.PI; wrap.position.y = 0.11; g.add(wrap);
  for (let i = 0; i < 9; i++) { const f = mesh(new THREE.IcosahedronGeometry(0.028, 1), M(['#ff7aa2', '#ffd36a', '#ffffff', '#ff9a5a'][i % 4], { roughness: 0.7 })); f.position.set((hash(i) - 0.5) * 0.09, 0.24 + hash(i * 2) * 0.04, (hash(i * 3) - 0.5) * 0.09); g.add(f); } return g; };
const BQ = SEATS.map((s, i) => { const b = bouquet(); b.position.set(s.x + 0.12, 0.74, s.z); b.rotation.set(Math.PI / 2 - 0.2, 0, 0.6 + hash(i)); room.add(b); return { b, p0: b.position.clone(), r0: b.rotation.clone(), k: hash(i * 7) }; });
// ---- people ----
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, y, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
function settle(P, hipY) { P.outer.updateMatrixWorld(true); P.outer.position.y += hipY - boneW(P, 'pelvis').y; P.outer.updateMatrixWorld(true); }
function sitChair(P, lean = 0) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.5); rotL(P, 'calf_' + s, [1, 0, 0], 1.45); } rotL(P, 'thigh_l', [0, 0, 1], 0.08); rotL(P, 'thigh_r', [0, 0, 1], -0.08); rotL(P, 'spine_01', [1, 0, 0], 0.18 - lean); }
function handsOnLap(P) { armsDown(P, 1); for (const s of ['l', 'r']) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.35); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.9); fingers(P, s, 0.4, 0.2); } }
function earsCovered(P, k = 1, t = 0) { armsDown(P, 1); for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], q * 1.15 * k); rotL(P, 'upperarm_' + s, [1, 0, 0], -0.25 * k); rotL(P, 'lowerarm_' + s, [0, 0, 1], q * 2.2 * k); rotL(P, 'lowerarm_' + s, [0, 1, 0], -q * 0.6 * k); fingers(P, s, 0.15, 0.1); }
  rotL(P, 'head', [1, 0, 0], 0.3 * k + 0.05 * Math.sin(t * 20) * k); rotL(P, 'spine_03', [1, 0, 0], 0.2 * k); }
// clapping: hands come together at each clap instant (and a small "ready" swing in between)
function clapPose(P, t) { armsDown(P, 1); const sc = sinceClap(t), open = t < C0 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 5)) : Math.min(1, sc / 0.35) * (sc < CDT - 0.25 ? 1 : 1 - (sc - (CDT - 0.25)) / 0.25);
  for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.45); rotL(P, 'upperarm_' + s, [0, 1, 0], -0.2 * q); rotL(P, 'lowerarm_' + s, [1, 0, 0], -0.95); rotL(P, 'lowerarm_' + s, [0, 1, 0], -q * (0.72 - 0.45 * open)); fingers(P, s, 0.08, 0.1); } }
function standAt(P, x, z, ry) { place(P, x, z, ry); }
const ME = SEATS.find(s => s.r === 1 && s.c === 2);
const hero = makeHuman('hero', { tee: 'mustard' }); cls.add(hero.outer);
const LOOKS = [['girl', 'cream'], ['hero', 'white'], ['man2', null], ['girl', 'pink'], ['hero', 'navy']];
const mates = SEATS.filter(s => s !== ME).map((s, i) => { const [nm, tee] = LOOKS[(i * 3 + s.r) % LOOKS.length]; const P = makeHuman(nm, tee ? { tee } : {}); cls.add(P.outer); return { P, s, ph: hash(i * 2.1) * 6, d: Math.hypot(s.x - ME.x, s.z - ME.z) }; });
const teacher = makeHuman('woman2'); cls.add(teacher.outer);
// sound rings: a transparent sphere shell bursting from his hands on every clap, stronger each time
const ringM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending, uniforms: { opacity: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform float opacity; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); float r=pow(1.0-abs(dot(v,vN)),4.0); gl_FragColor=vec4(vec3(1.0)*r*opacity, 1.0); }' });
const RINGS = []; for (let i = 0; i < 3; i++) { const r = mesh(new THREE.SphereGeometry(1, 40, 20), ringM.clone(), false, false); cls.add(r); RINGS.push(r); }
// shards (windows at clap 13), petals (bouquets explode from clap 9)
const shardM2 = new THREE.MeshStandardMaterial({ color: '#e6f3fa', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
const SH = []; for (let i = 0; i < 160; i++) { const m = mesh(new THREE.PlaneGeometry(0.05 + hash(i) * 0.12, 0.04 + hash(i * 2) * 0.1), shardM2, false, false); room.add(m); const p = panes[i % panes.length].position; SH.push({ m, p0: p.clone().add(V3(0, (hash(i * 3) - 0.5) * 1.5, (hash(i * 5) - 0.5) * 0.9)), v: V3(-3 - hash(i * 7) * 9, (hash(i * 11) - 0.3) * 4, (hash(i * 13) - 0.5) * 4) }); }
const PET = []; for (let i = 0; i < 220; i++) { const m = mesh(new THREE.PlaneGeometry(0.03, 0.025), M(['#ff7aa2', '#ffd36a', '#ffffff', '#ff9a5a'][i % 4], { side: THREE.DoubleSide }), false, false); room.add(m); const s = SEATS[i % SEATS.length]; PET.push({ m, p0: V3(s.x + 0.12, 0.98, s.z), v: V3((hash(i) - 0.5) * 3, 1 + hash(i * 2) * 3, (hash(i * 3) - 0.5) * 3) }); }
// exterior shock wave (kw, around the school at z = 160)
const shockM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { op: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform float op; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); float r=pow(1.0-abs(dot(v,vN)),3.0); gl_FragColor=vec4(mix(vec3(0.85,0.92,1.0),vec3(1.0),r), (0.08+0.85*r)*op); }' });
const shockRing = mesh(new THREE.RingGeometry(0.97, 1.0, 96), new THREE.MeshBasicMaterial({ color: '#c8b89a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), false, false); shockRing.rotation.x = -Math.PI / 2; kw.add(shockRing);
const shock = mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), shockM, false, false); kw.add(shock);
// ---- text ----
const CAPS = [[0.05, 1.95, ''], [2.05, 4.3, '<span class="hl">짝.</span>'], [4.4, 6.7, '…옆자리가 <span class="hl">쳐다봅니다.</span>'], [6.8, 9.1, '<span class="hl">고통</span>의 경계(약 120dB).'], [9.2, 11.5, '<span class="hl">제트기</span> 옆 소리(약 140dB).'],
  [11.6, 13.9, '꽃다발이 <span class="hl">터집니다.</span>'], [14.0, 16.3, '<span class="hl">고막</span> 위험(약 150dB).'], [16.4, 18.7, '<span class="hl">유리창</span>이 깨집니다.'], [18.8, 20.0, '책상이 <span class="hl">튀어오릅니다.</span>'], [20.0, 22.3, '<span class="hl">로켓 발사</span> 소리(약 180dB).'],
  [22.4, 23.5, '<span class="hl">193dB</span>: 공기로 낼 수 있는<br>가장 큰 소리.'], [23.6, 25.6, '그 다음 박수는…<br><span class="hl">충격파.</span>'], [25.6, 27.4, '<span class="hl">졸업식 박수</span>는 적당히. 👏']];
const $ = id => document.getElementById(id);
function text(t) {
  const n = nC(t), pulse = n > 0 ? Math.max(0, 1 - sinceClap(t) / 0.3) : 0;
  $('lab').textContent = '박수 소리'; $('val').textContent = (n < 19 ? Math.round(dB(n)) : '>194') + ' dB'; $('val').style.transform = `scale(${1 + 0.2 * pulse})`; $('val').style.transformOrigin = 'left center';
  $('sub').textContent = n ? `${n}번째 박수 · 압력 ×${Math.pow(2, n).toLocaleString('ko-KR')}` : '칠 때마다 ×2';
  for (const id of ['hud', 'mark']) $(id).style.opacity = 1 - smooth(27.3, 27.7, t); $('title').style.opacity = 1 - smooth(1.6, 2.0, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1] && c[2]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  if (c) { const k = clamp((t - c[0]) / 0.25, 0, 1); $('cap').style.transform = `scale(${k >= 1 ? 1 : 0.82 + 0.18 * easeOutBack(k)})`; }
  $('flash').style.opacity = Math.max(n >= 8 ? 0.35 * Math.max(0, 1 - sinceClap(t) / 0.1) * Math.min(1, (n - 7) / 8) : 0, 0.9 * Math.max(0, 1 - Math.abs(t - 23.6) / 0.15));
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function classAt(t) {
  const n = nC(t), sc = sinceClap(t), kick = n ? Math.max(0, 1 - sc / 0.25) : 0, lvl = n / 18;
  // the hero stands at his seat and claps
  const P = hero; poseRest(P); standAt(P, ME.x, ME.z + 0.62, Math.PI); clapPose(P, t); rotL(P, 'head', [1, 0, 0], -0.05);
  P.outer.position.x += 0.01 * Math.sin(t * 50) * kick * lvl; P.outer.updateMatrixWorld(true);
  face(P, t < 6 ? 'happy' : t < 12 ? 'proud' : t < 17 ? 'worried' : 'shocked', t);
  // classmates: sit → turn and stare → cover ears → duck (and desks hop on the claps late)
  for (const m of mates) { const Q = m.P, s = m.s; poseRest(Q); const hop = n >= 14 ? kick * 0.06 * (n - 13) : 0;
    s.desk.position.set(s.x, hop, s.z); s.chair.position.set(s.x, hop * 0.6, s.z + 0.48); s.desk.rotation.set(0, 0, hop * 0.5 * (hash(s.c) - 0.5));
    place(Q, s.x, s.z + 0.48, Math.PI); sitChair(Q, n >= 10 ? -0.25 : 0);
    const look = t > 4.2 && n < 6 ? smooth(4.2 + m.d * 0.15, 4.8 + m.d * 0.15, t) : 0, ang = Math.atan2(ME.x - s.x, ME.z - s.z) - Math.PI;
    if (n >= 6) earsCovered(Q, smooth(TC(6) + m.d * 0.05, TC(6) + 0.4 + m.d * 0.05, t), t + m.ph); else { handsOnLap(Q); rotL(Q, 'head', [0, 1, 0], clamp(ang, -1.3, 1.3) * look); }
    settle(Q, 0.5 + hop * 0.6); face(Q, n < 3 ? 'happy' : n < 6 ? 'surprised' : n < 11 ? 'worried' : 'scared', t + m.ph); }
  { const Q = teacher; poseRest(Q); place(Q, 1.0, -RD / 2 + 1.5, 0.25); if (n >= 6) earsCovered(Q, smooth(TC(6), TC(6) + 0.5, t), t); else { armsDown(Q, 1); rotL(Q, 'upperarm_l', [1, 0, 0], -0.3); rotL(Q, 'upperarm_r', [1, 0, 0], -0.3); }
    face(Q, n < 3 ? 'happy' : n < 6 ? 'surprised' : 'shocked', t); }
  // rings from the hands on each of the last 3 claps
  const hands = boneW(P, 'hand_l').lerp(boneW(P, 'hand_r'), 0.5);
  RINGS.forEach((r, i) => { const k = n - i; if (k < 1) { r.visible = false; return; } const a = t - TC(k), life = 0.9; r.visible = a > 0 && a < life; if (!r.visible) return;
    r.position.copy(hands); r.scale.setScalar(0.1 + a * (2 + k * 0.6)); r.material.uniforms.opacity.value = 0.9 * (1 - a / life) * Math.min(1, 0.2 + k / 10); });
  // bouquets burst from clap 9, petals fly
  const bq = n >= 9; BQ.forEach(o => { o.b.visible = !bq; });
  PET.forEach((p, i) => { const a = t - TC(9); p.m.visible = a > 0 && a < 4; if (!p.m.visible) return; p.m.position.copy(p.p0).addScaledVector(p.v, a).add(V3(0, -1.2 * a * a, 0)); if (p.m.position.y < 0.01) p.m.position.y = 0.01; p.m.rotation.set(a * 7 * hash(i), a * 5, a * 3); });
  // windows at clap 13
  const broke = t >= TC(13); panes.forEach(p => p.visible = !broke);
  SH.forEach((s, i) => { const a = t - TC(13); s.m.visible = a > 0 && a < 2.5; if (!s.m.visible) return; s.m.position.copy(s.p0).addScaledVector(s.v, a).add(V3(0, -4.9 * a * a, 0)); s.m.rotation.set(a * 9 * hash(i), a * 7, a * 5 * hash(i * 2)); });
  return { hands, kick, n };
}
function frameAt(t) {
  compMat.uniforms.uLook.value = 0.0;
  if (t < 23.6) {
    if (hero.outer.parent !== cls) cls.add(hero.outer);
    const { hands, kick, n } = classAt(t), H = boneW(hero, 'head');
    const sh = Math.min(9, Math.floor(t / 2.4)), u = (t % 2.4) / 2.4, U = u * u * (3 - 2 * u);
    if (sh === 0) LOOK(cCam, V3(2.6 - 0.6 * U, 1.9, -3.2 + 0.8 * U), V3(ME.x, 1.2, ME.z + 0.6), 46);                                 // the ceremony, push to him
    else if (sh === 1) LOOK(cCam, V3(ME.x - 0.6 + 0.3 * U, 1.45, ME.z - 0.75), V3(ME.x + 0.05, 1.3, ME.z + 0.6), 46);                   // close on the clapping hands + face
    else if (sh === 2) LOOK(cCam, V3(-2.6 + 1.2 * U, 1.3, ME.z + 2.4), V3(ME.x, 1.2, ME.z + 0.4), 50);                                  // the row behind turns to look
    else if (sh === 3) LOOK(cCam, V3(3.4, 1.6 + 0.3 * U, ME.z + 1.8 - 1.0 * U), V3(-1.0, 1.0, ME.z + 1.0), 54);                         // everyone covers their ears
    else if (sh === 4) LOOK(cCam, V3(0.3, 2.4 - 0.6 * U, -3.3), V3(ME.x, 1.1, ME.z + 1.0), 56);                                       // front wide: rings
    else if (sh === 5) LOOK(cCam, V3(ME.x + 0.5, 1.0, ME.z + 0.9 - 0.3 * U), V3(ME.x + 2.0, 1.0, ME.z + 2.5), 58);                      // petals explode
    else if (sh === 6) LOOK(cCam, V3(2.4 - 0.6 * U, 1.3, -1.2 + 0.6 * U), V3(-4.5, 1.6, 0.2), 52);                                     // windows burst
    else if (sh === 7) LOOK(cCam, V3(-3.4 + 0.6 * U, 0.6, 2.6), V3(0, 0.9, -0.5), 60);                                                // low: desks hop
    else if (sh === 8) LOOK(cCam, V3(ME.x + 0.45, 1.45 + 0.1 * U, ME.z - 0.55), H.clone().add(V3(0, -0.15, 0)), 40);                   // his face: 193 dB
    else LOOK(cCam, V3(ME.x + 0.8, 1.6, ME.z - 1.4), hands, 44);
    const sk = kick * Math.min(1, n / 10) * 0.06; cCam.position.add(V3(sk * Math.sin(t * 91), sk * Math.cos(t * 77), 0));
    shootTo(RTA, cls, cCam); return true;
  }
  // ----- the shock wave leaves the school and rolls over Seoul -----
  const a = t - 23.6; shock.visible = true; const R = 30 + 110 * a + 160 * a * a; shock.position.set(0, 0, 160); shock.scale.set(R, R * 0.55, R); shockM.uniforms.op.value = Math.max(0, 1 - a / 4.2); shockRing.position.set(0, 0.5, 160); shockRing.scale.setScalar(R); shockRing.material.opacity = 0.7 * Math.max(0, 1 - a / 4.2);
  roofHole.visible = false; cloudDeck.visible = false;
  if (a < 1.6) LOOK(kCam, V3(90 - 10 * a, 8 + 10 * a, 620 + 60 * a), V3(0, 20 + 40 * a, 160), 56);
  else { const k = (a - 1.6) / 2.4; LOOK(kCam, V3(-2600 + 500 * k, 1500 + 400 * k, 4800 + 600 * k), V3(0, 200, 300), 46); }
  kCam.near = 0.5; kCam.far = 90000; kw.fog.near = 900; kw.fog.far = 16000;
  shootTo(RTA, kw, kCam); return true;
}
// ---- motion blur on the loud part ----
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => t >= 11 && t < 27.5;
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0.06 * Math.max(0, 1 - Math.abs(t - 23.6) / 0.12);
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
