// =================== Korean version (~26 s): "POV: 39km 상공에서 뛰어내린다면?" — Korean Peninsula below, new camera/route ===================
// Reuses the helmet-video world (parts_pov p_head/p_smoke/p_space): Earth + Milky Way + stars, the POV helmet rim/FX compositor.
// Facts: Red Bull Stratos 2012 — exit 38,969 m, top speed 1,357.6 km/h (Mach 1.25), flat spin ~13 s at up to ~60 rpm;
// Alan Eustace 2014 — 41,419 m (135,890 ft). Timeline below is compressed (the real free fall lasted minutes).
const JUMP = 6.0, MACH = 10.6, SPIN = 13.0, STAB = 16.8, CARD = 22.6, J_END = 25.8;
ISS.visible = false; mate.g.visible = false; you.helmet.visible = false; mirror.visible = false; hatchGlow.visible = false; you.head.visible = false;
bg.background = new THREE.Color('#010205');
// altitude (km) and speed (km/h) profiles — compressed in time
const altKm = t => 38.969 - 14.5 * Math.pow(clamp((t - JUMP) / (J_END - JUMP), 0, 1), 1.3);
const speedKmh = t => t < JUMP ? 0 : t < MACH + 1.4 ? 1357.6 * Math.pow(smooth(JUMP, MACH + 1.4, t), 0.85) : lerp(1357.6, 1040, smooth(MACH + 1.4, J_END, t));
// Earth: rotate the globe so Germany (the lookup point n0) is straight below, at the current altitude
const EQ_UP = new THREE.Quaternion();
function placeEarth(t) { earth.quaternion.copy(EQ_UP); earth.position.set(0, -(RE + altKm(t)), 0); earth.updateMatrixWorld(true); }
function latLonWorld(la, lo, h = 0) { const q = V3(Math.cos(la * Math.PI / 180) * Math.cos(lo * Math.PI / 180), Math.sin(la * Math.PI / 180), -Math.cos(la * Math.PI / 180) * Math.sin(lo * Math.PI / 180));
  return q.applyQuaternion(window.__EQ.clone().invert()).multiplyScalar(RE + h).applyQuaternion(earth.quaternion).add(earth.position); }
// high-res local cap of the globe: fields patchwork, rivers of sea, the Alps with snow (low-poly relief)
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, h = (a, b) => hash(a * 57.1 + b * 113.7), s = k => k * k * (3 - 2 * k);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), s(xf)), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), s(xf)), s(yf)); };
function alpsH(la, lo) { const ridge = Math.exp(-Math.pow((lo - (128.75 + 0.35 * (la - 37))) / 0.45, 2)) * smooth(35.3, 36.2, la) * (1 - smooth(38.9, 39.6, la));   // Taebaek range (x2.5 relief)
  return (ridge * 3.4 + 1.1 * vnoise(lo * 4.5, la * 4.5)) * (0.55 + 0.45 * vnoise(lo * 11, la * 11)); }
const CITIES = [[37.57, 126.98, 0.24], [37.46, 126.71, 0.12], [37.26, 127.03, 0.1], [35.18, 129.08, 0.17], [35.87, 128.6, 0.13], [36.35, 127.38, 0.11], [35.16, 126.85, 0.1], [35.54, 129.31, 0.09], [36.64, 127.49, 0.07], [37.75, 128.9, 0.06]];
const CITIES_DE = [[52.52, 13.40, 0.22], [53.55, 9.99, 0.17], [48.14, 11.58, 0.16], [50.94, 6.96, 0.14], [50.11, 8.68, 0.13], [48.78, 9.18, 0.11], [51.23, 6.78, 0.1], [51.34, 12.37, 0.1], [51.05, 13.74, 0.1], [52.37, 9.73, 0.1], [49.45, 11.08, 0.1], [51.45, 7.0, 0.16]];
const cityAt = (la, lo) => { let v = 0; for (const [a, b, r] of CITIES) { const d = Math.hypot(la - a, (lo - b) * Math.cos(a * Math.PI / 180)); v = Math.max(v, 1 - d / r); } return v; };
const lakeAt = (la, lo) => false;
function buildCap() { const n0 = window.__n0.clone(), EQ = window.__EQ, land = window.__land; const e1 = new THREE.Vector3(1, 0, 0).cross(n0).normalize(), e2 = n0.clone().cross(e1).normalize();
  const N = 520, A = 0.11, P = [], LL = []; for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = Math.tan(-A + 2 * A * i / N), y = Math.tan(-A + 2 * A * j / N); const d = n0.clone().addScaledVector(e1, x).addScaledVector(e2, y).normalize(); const q = d.clone().applyQuaternion(EQ);
    const la = Math.asin(q.y) * 180 / Math.PI, lo = Math.atan2(-q.z, q.x) * 180 / Math.PI; const isL = land(la, lo) && !lakeAt(la, lo); const h = isL ? 0.35 + alpsH(la, lo) + 0.25 * vnoise(lo * 6, la * 6) : 0.05; P.push(d.multiplyScalar(RE + h)); LL.push([la, lo, h, isL]); }
  const pos = [], col = [], c = new THREE.Color(); const fields = ['#b9a95a', '#a8a254', '#c2b065', '#8f9a4c', '#9fa356', '#b5a65e', '#7d9446'];   // autumn rice paddies
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, cc = a + N + 1, dd = cc + 1;
    for (const tri of [[a, b, cc], [b, dd, cc]]) { let h = 0, nl = 0, la = 0, lo = 0; for (const k of tri) { h += LL[k][2] / 3; nl += LL[k][3] ? 1 : 0; la += LL[k][0] / 3; lo += LL[k][1] / 3; }
      if (nl < 2) c.set(Math.abs(la) > 53 ? '#24506e' : '#1f5f92').offsetHSL(0, 0, R(-0.02, 0.02));
      else if (h > 3.4) c.set('#8c8a86').offsetHSL(0, 0, R(-0.04, 0.04)); else if (h > 1.2) { const q = vnoise(lo * 9, la * 9) * 0.7 + vnoise(lo * 23, la * 23) * 0.3; c.set(q > 0.74 ? '#9a5a34' : q > 0.62 ? '#b08a3c' : q > 0.45 ? '#46663a' : '#3e5c2c').offsetHSL(0, R(-0.03, 0.03), R(-0.025, 0.025)); }   // forested mountains, autumn colour in clusters
      else { const forest = vnoise(lo * 2.2, la * 2.2) * 0.65 + vnoise(lo * 7, la * 7) * 0.35, city = cityAt(la, lo);
        if (forest > 0.45) c.set(hash(Math.floor(i / 3) * 3.7 + Math.floor(j / 3) * 17.9) < 0.5 ? '#405f2e' : '#476734'); else c.set(fields[Math.floor(clamp(vnoise(lo * 14, la * 14) * 0.75 + vnoise(lo * 37, la * 37) * 0.25, 0, 0.999) * fields.length)]).offsetHSL(0, 0, R(-0.02, 0.02));
        if (city > 0 && rnd() < 0.35 + 0.6 * city) c.set(rnd() < 0.5 ? '#8e8a84' : '#a29d94'); }
      c.multiplyScalar(0.85); for (const k of tri) { pos.push(P[k].x, P[k].y, P[k].z); col.push(c.r, c.g, c.b); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  earth.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 })));
  const cg = new THREE.IcosahedronGeometry(1, 1), cm = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.88, emissive: '#3a4250' });
  const up = n0.clone(); for (let k = 0; k < 900; k++) { const x = R(-A, A) * 0.95, y = R(-A, A) * 0.95; if (vnoise(x * 60 + 3, y * 60 + 7) < 0.52) continue;
    const d = n0.clone().addScaledVector(e1, Math.tan(x)).addScaledVector(e2, Math.tan(y)).normalize(); const alt = R(2.5, 8.5); const grpC = new THREE.Group(); grpC.position.copy(d).multiplyScalar(RE + alt); grpC.quaternion.setFromUnitVectors(V3(0, 1, 0), d);
    const sz = R(4, 16); for (let b = 0; b < 4; b++) { const m = new THREE.Mesh(cg, cm); m.position.set(R(-1, 1) * sz, R(0, 0.4) * sz * 0.2, R(-1, 1) * sz); m.scale.set(sz * R(0.6, 1.1), sz * R(0.12, 0.22), sz * R(0.6, 1.1)); grpC.add(m); }
    earth.add(grpC); } }
// near scene: the capsule step (platform + door frame) — it falls away above you
const step = new THREE.Group(); near.add(step);
{ bx(1.7, 0.12, 1.3, M('#b4b8be', { metalness: 0.3, roughness: 0.55 }), 0, -0.06, 0.1, step); bx(1.7, 0.02, 0.1, '#e8b030', 0, 0.005, 0.7, step); bx(1.7, 0.5, 0.06, '#d8d8d2', 0, -0.37, 0.74, step);
  for (const sx of [-1, 1]) { bx(0.12, 2.4, 0.14, '#d8d8d2', sx * 0.9, 1.2, 0.68, step); bx(0.05, 1.3, 0.05, '#e8b030', sx * 0.78, 1.2, 0.6, step); } 
  bx(1.9, 2.6, 0.1, '#30343a', 0, 1.2, -0.62, step); for (const sx of [-1, 1]) bx(0.1, 2.6, 1.3, '#3a3e46', sx * 0.98, 1.2, 0.0, step); }
const EYE_L = V3(0, 1.89, 0.1), _e = new THREE.Euler(), _q = new THREE.Quaternion();
function poseAstro(A, o) { A.armL.sh.rotation.set(o.aL ?? 0.3, 0, o.zL ?? 0.25); A.armL.el.rotation.x = o.eL ?? -0.6; A.armR.sh.rotation.set(o.aR ?? 0.2, 0, o.zR ?? -0.25); A.armR.el.rotation.x = o.eR ?? -0.5;
  A.legL.sh.rotation.x = o.lL ?? 0.1; A.legR.sh.rotation.x = o.lR ?? -0.1; A.legL.el.rotation.x = o.kL ?? 0.25; A.legR.el.rotation.x = o.kR ?? 0.2; }
const bump = (t, a, b) => (t > a && t < b) ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
let YAW0 = Math.PI;
// spin angle = integral of the spin rate (pure function of t)
const spinRate = t => 2 * Math.PI * 1.0 * smooth(SPIN - 0.3, SPIN + 0.9, t) * (1 - smooth(STAB - 0.9, STAB + 0.4, t));
const spinAt = t => { let a = 0; const dt = 1 / 120; for (let x = SPIN - 0.4; x < t; x += dt) a -= spinRate(x) * dt; return a; };
function update(t) { placeEarth(t);
  const fall = Math.max(0, t - JUMP), lean = smooth(JUMP - 0.3, JUMP + 1.1, t);
  // the step drops away above you (you fall; drawn relative to your eye)
  const push = 1.6 * smooth(JUMP - 0.25, JUMP + 0.7, t); step.position.set(-Math.sin(YAW0) * push, 0.5 * 9.8 * fall * fall, -Math.cos(YAW0) * push); step.rotation.y = YAW0; step.visible = fall < 4;
  let yaw = YAW0 + 0.05 * Math.sin(t * 0.6) + lerp(-0.35, 0, smooth(0.3, 3.2, t)), pitch = lerp(lerp(lerp(0.5, -0.06, smooth(0.3, 2.8, t)), -0.85, smooth(4.0, 5.6, t)) + 0.01 * Math.sin(t * 2.1), -1.25, lean), roll = 0, bodyPitch = lerp(0, 1.2, lean);
  pitch = lerp(pitch, -0.55, smooth(JUMP + 1.6, MACH, t)); bodyPitch = lerp(bodyPitch, 0.75, smooth(JUMP + 1.6, MACH, t));
  yaw += spinAt(t); roll += 0.25 * Math.sin(t * 1.7) * smooth(SPIN, SPIN + 1, t) * (1 - smooth(STAB - 0.5, STAB + 0.5, t));
  pitch = lerp(pitch, -0.7, smooth(STAB, STAB + 1.2, t));
  const buf = Math.min(1, speedKmh(t) / 1357.6); // buffeting grows with speed and thicker air
  pitch += (Math.sin(t * 31) * 0.6 + Math.sin(t * 19.3) * 0.4) * 0.006 * buf * (1 + 1.5 * smooth(SPIN, SPIN + 0.5, t)); yaw += Math.sin(t * 27.7) * 0.005 * buf;
  // body: hands on the door posts, then arms spread (stable free-fall arch)
  const spread = smooth(JUMP - 0.1, JUMP + 0.8, t);
  poseAstro(you, { aL: lerp(-1.25, -0.45, spread), eL: lerp(-0.5, -0.4, spread), zL: lerp(-0.85, -1.35, spread), aR: lerp(-1.25, -0.45, spread), eR: lerp(-0.5, -0.4, spread), zR: lerp(0.85, 1.35, spread), lL: lerp(0.1, 0.5, spread), lR: lerp(-0.1, 0.45, spread), kL: lerp(0.25, 1.0, spread), kR: lerp(0.2, 1.0, spread) });
  you.g.quaternion.setFromEuler(_e.set(bodyPitch, yaw, roll, 'YXZ')); you.g.position.copy(V3(0, 1.89, 0)).sub(EYE_L.clone().applyQuaternion(you.g.quaternion)); you.g.updateMatrixWorld(true);
  cam.quaternion.copy(you.g.quaternion).multiply(_q.setFromEuler(_e.set(pitch + bodyPitch, Math.PI, 0, 'YXZ'))); cam.position.set(0, 1.89, 0); cam.fov = 72;
  nearSmoke.begin(); nearSmoke.end();
  nSun.target.position.set(0, 1, 0); nSun.target.updateMatrixWorld(); nSun.position.copy(SUN_DIR).multiplyScalar(50); }
function shootJump(rt) { cam.aspect = W / H; cam.updateProjectionMatrix(); bgCam.fov = cam.fov; bgCam.aspect = cam.aspect; bgCam.quaternion.copy(cam.quaternion); bgCam.position.set(0, 0, 0); bgCam.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bg, bgCam); renderer.setRenderTarget(rt); renderer.clearDepth(); renderer.render(near, cam); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
document.documentElement.lang = 'ko';
el.title.innerHTML = 'POV: 39km 상공에서<br><span class="hl">뛰어내린다면</span>?'; el.endT.innerHTML = 'POV: 39km 상공에서 <span class="hl">뛰어내린다면</span>?';
el.endS.innerHTML = '2012년 기록: 38,969m에서 낙하, 최고 시속 1,357km (마하 1.25)<br>2014년 기록: 앨런 유스터스, 41,419m<br>약 19km 이상에서는 여압복 없이 체액이 끓는다';
const captions = [
  [0.8, 5.6, '고도 39km. 하늘은 검고,<br>지구는 둥글게 보여요.'],
  [JUMP + 0.1, 9.4, '여기엔 공기가 거의 없어요.<br>우주복이 없으면 피가 끓어요.'],
  [9.6, 12.8, '음속을 돌파해도<br>아무 소리도 들리지 않아요.'],
  [SPIN + 0.2, STAB, '플랫 스핀: 1분에 최대 60바퀴.<br>피가 머리로 쏠려요.'],
  [STAB + 0.2, 20.0, '팔을 펴고 등을 젖히면 —<br>안정!'],
  [20.2, CARD - 0.1, '아래는 한반도.<br>최고 속도 시속 1,357km.'],
];
{ const pre = document.createElement('div'); pre.style.cssText = 'position:absolute;left:-9999px;top:0;font-family:"Noto Serif KR";'; pre.innerHTML = captions.map(c => c[2]).join(' ') + el.title.innerHTML + el.endS.innerHTML + ' 성층권 우주복 정상 고도 기압 자유 낙하 초음속 마하 속도'; document.body.appendChild(pre);
  const pre2 = pre.cloneNode(true); pre2.style.fontFamily = '"Noto Sans KR"'; document.body.appendChild(pre2); }
const fmtDE = n => Math.round(n).toLocaleString('de-DE');
const fmtKO = n => Math.round(n).toLocaleString('en-US');
function updateDOM(t) { el.title.style.opacity = 1 - smooth(JUMP - 0.6, JUMP, t);
  const v = speedKmh(t), h = altKm(t) * 1000, mach = v / 1085;
  el.stat.innerHTML = t < JUMP ? '<b style="background:#5fd27a"></b>성층권 · 우주복 정상' : mach >= 1 ? '<b></b>초음속 · 마하 ' + mach.toFixed(2) : '<b></b>자유 낙하';
  el.lab.textContent = t < JUMP ? '고도' : '속도'; el.val.textContent = t < JUMP ? fmtKO(h) + ' m' : fmtKO(v) + ' km/h'; el.sub.textContent = t < JUMP ? '기압 < 1%' : '고도 ' + fmtKO(h) + ' m';
  el.hud.style.opacity = 1 - smooth(CARD - 0.3, CARD + 0.1, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.2) : 0;
  el.end.style.opacity = smooth(CARD, CARD + 0.4, t); el.endT.style.opacity = smooth(CARD + 0.2, CARD + 0.6, t); el.endS.style.opacity = smooth(CARD + 0.5, CARD + 0.9, t); }
function postFX(t) { const u = compMat.uniforms;
  u.uFrame.value = 1; u.uFrameK.value = 0; u.uFog.value = 0.55 * (fadeWin(t, 1.1, 2.4, 0.35) + fadeWin(t, 3.6, 4.8, 0.35) + fadeWin(t, 5.3, 5.9, 0.2) + 0.6 * fadeWin(t, 8.0, 8.6, 0.2) + 0.6 * fadeWin(t, 17.4, 18.4, 0.3));
  const red = smooth(SPIN + 0.6, SPIN + 2.0, t) * (1 - smooth(STAB - 0.4, STAB + 0.8, t));
  u.uPulse.value = 0.6 * red * Math.pow(Math.max(0, Math.sin(t * 9.4)), 6); u.uGhostA.value = 0.5 * red; u.uGhost.value.set(0.01 * Math.sin(t * 5), 0.006 * Math.cos(t * 4));
  u.uSat.value = 1; u.uTint.value.set(1, 1 - 0.35 * red, 1 - 0.38 * red); u.uVig.value = lerp(3, 0.9, red); u.uLid.value = 0;
  u.uFlash.value = 0.07 * Math.exp(-Math.pow((t - MACH) / 0.08, 2)); u.uBright.value = 1;
  const sp = SUN_DIR.clone().multiplyScalar(1000).project(bgCam); const inView = (sp.z < 1 ? 1 : 0) * smooth(2.2, 1.1, Math.abs(sp.x)) * smooth(1.9, 1.1, Math.abs(sp.y));
  u.uSunUV.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); u.uSunA.value = 0.8 * inView; u.uExpA.value = 1.06; }
// =================== render ===================
window.renderAt = (t) => { update(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shootJump(RTA); postFX(t); composite(0, compMat.uniforms.uExpA.value, 1); updateDOM(t); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth();
  EQ_UP.setFromUnitVectors(window.__n0.clone().normalize(), V3(0, 1, 0)); placeEarth(0); buildCap();
  if (DEBUG === 'noglobe') earth.children[0].visible = false; if (DEBUG) console.log('earth children', earth.children.length, earth.children.map(c => c.type + ':' + (c.geometry ? c.geometry.attributes.position.count : 0)).slice(0, 6).join(' '));
  // face south, toward the Alps on the horizon
  const eye = V3(0, 0, 0), s = latLonWorld(37.2, 131.0).sub(eye); YAW0 = Math.atan2(s.x, s.z);
  window.renderAt(0); return true; })();
