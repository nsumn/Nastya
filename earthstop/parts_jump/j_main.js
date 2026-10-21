// =================== "POV: Du springst aus 39 km Höhe" — 15 s, German, metric ===================
// Reuses the helmet-video world (parts_pov p_head/p_smoke/p_space): Earth + Milky Way + stars, the POV helmet rim/FX compositor.
// Facts: Red Bull Stratos 2012 — exit 38,969 m, top speed 1,357.6 km/h (Mach 1.25), flat spin ~13 s at up to ~60 rpm;
// Alan Eustace 2014 — 41,419 m (135,890 ft). Timeline below is compressed (the real free fall lasted minutes).
const JUMP = 3.4, MACH = 7.4, SPIN = 9.0, STAB = 12.2, CARD = 14.0, J_END = 15.6;
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
function alpsH(la, lo) { const band = Math.exp(-Math.pow((la - 46.7 + 0.25 * Math.sin(lo * 0.7)) / 0.7, 2)) * smooth(5.8, 7.0, lo) * (1 - smooth(14.5, 16.0, lo));
  return band * (0.35 + 0.65 * vnoise(lo * 3.2, la * 3.2)) * (0.7 + 0.3 * vnoise(lo * 9, la * 9)) * 9.0; }   // relief x2.5 so the Alps read on the horizon
const CITIES = [[52.52, 13.40, 0.22], [53.55, 9.99, 0.17], [48.14, 11.58, 0.16], [50.94, 6.96, 0.14], [50.11, 8.68, 0.13], [48.78, 9.18, 0.11], [51.23, 6.78, 0.1], [51.34, 12.37, 0.1], [51.05, 13.74, 0.1], [52.37, 9.73, 0.1], [49.45, 11.08, 0.1], [51.45, 7.0, 0.16]];
const cityAt = (la, lo) => { let v = 0; for (const [a, b, r] of CITIES) { const d = Math.hypot(la - a, (lo - b) * Math.cos(a * Math.PI / 180)); v = Math.max(v, 1 - d / r); } return v; };
const lakeAt = (la, lo) => Math.hypot((la - 47.62) / 0.11, (lo - 9.35) / 0.33) < 1 || Math.hypot((la - 47.85) / 0.06, (lo - 12.47) / 0.08) < 1;
function buildCap() { const n0 = window.__n0.clone(), EQ = window.__EQ, land = window.__land; const e1 = new THREE.Vector3(1, 0, 0).cross(n0).normalize(), e2 = n0.clone().cross(e1).normalize();
  const N = 520, A = 0.11, P = [], LL = []; for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = Math.tan(-A + 2 * A * i / N), y = Math.tan(-A + 2 * A * j / N); const d = n0.clone().addScaledVector(e1, x).addScaledVector(e2, y).normalize(); const q = d.clone().applyQuaternion(EQ);
    const la = Math.asin(q.y) * 180 / Math.PI, lo = Math.atan2(-q.z, q.x) * 180 / Math.PI; const isL = land(la, lo) && !lakeAt(la, lo); const h = isL ? 0.35 + alpsH(la, lo) + 0.25 * vnoise(lo * 6, la * 6) : 0.05; P.push(d.multiplyScalar(RE + h)); LL.push([la, lo, h, isL]); }
  const pos = [], col = [], c = new THREE.Color(); const fields = ['#5f8a3e', '#6f9447', '#86a24e', '#a5a957', '#7d9a45', '#8f8a4a', '#567f3a'];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, cc = a + N + 1, dd = cc + 1;
    for (const tri of [[a, b, cc], [b, dd, cc]]) { let h = 0, nl = 0, la = 0, lo = 0; for (const k of tri) { h += LL[k][2] / 3; nl += LL[k][3] ? 1 : 0; la += LL[k][0] / 3; lo += LL[k][1] / 3; }
      if (nl < 2) c.set(Math.abs(la) > 53 ? '#24506e' : '#1f5f92').offsetHSL(0, 0, R(-0.02, 0.02));
      else if (h > 2.3) c.set('#f2f5f8').offsetHSL(0, 0, R(-0.05, 0.0)); else if (h > 1.6) c.set('#8c8a86').offsetHSL(0, 0, R(-0.05, 0.05)); else if (h > 1.0) c.set('#4f6e38');
      else { const forest = vnoise(lo * 2.2, la * 2.2) * 0.65 + vnoise(lo * 7, la * 7) * 0.35, city = cityAt(la, lo);
        if (forest > 0.62) c.set(rnd() < 0.5 ? '#3c5a2c' : '#456533'); else c.set(fields[Math.floor(hash(i * 7.3 + j * 3.1 + (tri[0] === a ? 0 : 0.5)) * fields.length)]);
        if (city > 0 && rnd() < 0.35 + 0.6 * city) c.set(rnd() < 0.5 ? '#8e8a84' : '#a29d94'); else if (rnd() < 0.006) c.set('#9a9690'); }
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
{ bx(1.7, 0.12, 1.3, M('#8a8e94', { metalness: 0.4, roughness: 0.5 }), 0, -0.06, 0.1, step); bx(1.7, 0.02, 0.1, '#e8b030', 0, 0.005, 0.7, step); bx(1.7, 0.5, 0.06, '#d8d8d2', 0, -0.37, 0.74, step);
  for (const sx of [-1, 1]) { bx(0.12, 2.4, 0.14, '#d8d8d2', sx * 0.9, 1.2, 0.68, step); bx(0.05, 1.3, 0.05, '#e8b030', sx * 0.78, 1.2, 0.6, step); } bx(1.92, 0.14, 0.14, '#d8d8d2', 0, 2.4, 0.68, step);
  bx(1.9, 2.6, 0.1, '#30343a', 0, 1.2, -0.62, step); for (const sx of [-1, 1]) bx(0.1, 2.6, 1.3, '#3a3e46', sx * 0.98, 1.2, 0.0, step); }
const EYE_L = V3(0, 1.89, 0.1), _e = new THREE.Euler(), _q = new THREE.Quaternion();
function poseAstro(A, o) { A.armL.sh.rotation.set(o.aL ?? 0.3, 0, o.zL ?? 0.25); A.armL.el.rotation.x = o.eL ?? -0.6; A.armR.sh.rotation.set(o.aR ?? 0.2, 0, o.zR ?? -0.25); A.armR.el.rotation.x = o.eR ?? -0.5;
  A.legL.sh.rotation.x = o.lL ?? 0.1; A.legR.sh.rotation.x = o.lR ?? -0.1; A.legL.el.rotation.x = o.kL ?? 0.25; A.legR.el.rotation.x = o.kR ?? 0.2; }
const bump = (t, a, b) => (t > a && t < b) ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
let YAW0 = Math.PI;
// spin angle = integral of the spin rate (pure function of t)
const spinRate = t => 2 * Math.PI * 1.0 * smooth(SPIN - 0.3, SPIN + 0.9, t) * (1 - smooth(STAB - 0.9, STAB + 0.4, t));
const spinAt = t => { let a = 0; const dt = 1 / 120; for (let x = SPIN - 0.4; x < t; x += dt) a += spinRate(x) * dt; return a; };
function update(t) { placeEarth(t);
  const fall = Math.max(0, t - JUMP), lean = smooth(JUMP - 0.3, JUMP + 1.1, t);
  // the step drops away above you (you fall; drawn relative to your eye)
  step.position.set(0, 0.5 * 9.8 * fall * fall, 0); step.rotation.y = YAW0; step.visible = fall < 4;
  let yaw = YAW0 + 0.05 * Math.sin(t * 0.6), pitch = lerp(lerp(-0.08, -0.85, smooth(1.6, 3.0, t)) + 0.01 * Math.sin(t * 2.1), -1.25, lean), roll = 0, bodyPitch = lerp(0, 1.2, lean);
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
document.documentElement.lang = 'de';
el.title.innerHTML = 'POV: Du springst aus<br><span class="hl">39 km</span> Höhe'; el.endT.innerHTML = 'POV: Du springst aus <span class="hl">39 km</span> Höhe';
el.endS.innerHTML = 'REKORD 2012: ABSPRUNG AUS 38.969 M, 1.357 KM/H — MACH 1,25.<br>REKORD 2014: ALAN EUSTACE, 41.419 M ÜBER NEW MEXICO.<br>OHNE DRUCKANZUG KOCHT ÜBER ~19 KM DEINE KÖRPERFLÜSSIGKEIT.';
const captions = [
  [JUMP + 0.1, 6.4, 'Hier oben ist fast keine Luft.<br>Ohne Anzug würde dein Blut kochen.'],
  [6.6, 8.8, 'Du durchbrichst die Schallmauer —<br>und hörst… nichts.'],
  [SPIN + 0.2, STAB, 'Flachtrudeln: bis zu 60 Umdrehungen pro Minute.<br>Das Blut schießt dir in den Kopf.'],
  [STAB + 0.15, CARD - 0.05, 'Arme raus, Rücken durchdrücken —<br>stabil.'],
];
const fmtDE = n => Math.round(n).toLocaleString('de-DE');
function updateDOM(t) { el.title.style.opacity = 1 - smooth(JUMP - 0.5, JUMP + 0.1, t);
  const v = speedKmh(t), h = altKm(t) * 1000, mach = v / 1085;
  el.stat.innerHTML = t < JUMP ? '<b style="background:#5fd27a"></b>STRATOSPHÄRE · ANZUG OK' : mach >= 1 ? '<b></b>ÜBERSCHALL · MACH ' + mach.toFixed(2).replace('.', ',') : '<b></b>FREIER FALL';
  el.lab.textContent = t < JUMP ? 'HÖHE' : 'GESCHWINDIGKEIT'; el.val.textContent = t < JUMP ? fmtDE(h) + ' m' : fmtDE(v) + ' km/h'; el.sub.textContent = t < JUMP ? 'LUFTDRUCK < 1 %' : 'HÖHE ' + fmtDE(h) + ' m';
  el.hud.style.opacity = 1 - smooth(CARD - 0.3, CARD + 0.1, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.2) : 0;
  el.end.style.opacity = smooth(CARD, CARD + 0.4, t); el.endT.style.opacity = smooth(CARD + 0.2, CARD + 0.6, t); el.endS.style.opacity = smooth(CARD + 0.5, CARD + 0.9, t); }
function postFX(t) { const u = compMat.uniforms;
  u.uFrame.value = 1; u.uFrameK.value = 0; u.uFog.value = 0.55 * (fadeWin(t, 0.9, 2.1, 0.35) + fadeWin(t, 2.7, 3.3, 0.2) + 0.6 * fadeWin(t, 5.0, 5.6, 0.2) + 0.6 * fadeWin(t, 12.6, 13.6, 0.3));
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
  const eye = V3(0, 0, 0), s = latLonWorld(47.0, 10.5).sub(eye); YAW0 = Math.atan2(s.x, s.z);
  window.renderAt(0); return true; })();
