
// =================== paths ===================
const MOUSE_PATH = new THREE.CatmullRomCurve3([V3(2.3, 0, -1.0), V3(1.6, 0, 0.3), V3(0.9, 0, 1.45), V3(-0.4, 0, 1.75), V3(-1.6, 0, 1.25), V3(-2.5, 0, 0.75), V3(-2.97, 0, 0.6)]);
const mouseU = t => clamp((t - (CHASE + 0.4)) / (POUNCE + 0.35 - CHASE - 0.4), 0, 1);
const camChaseU = t => clamp((t - (CHASE + 0.7)) / (POUNCE - CHASE - 0.7), 0, 1) * 0.93;
// sound rings from behind the bookshelf
const rings = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); room.add(m); rings.push(m); }
function updateRoom(t) {
  // the mouse: hides behind the shelf, then runs along the path into its hole
  const mu = mouseU(t), mp = MOUSE_PATH.getPointAt(ease(mu) * 0.15 + mu * 0.85), tan = MOUSE_PATH.getTangentAt(Math.min(0.999, mu * 0.98 + 0.01));
  const m = props.mouse; m.visible = t < POUNCE + 0.4 && t > HEAR - 0.5;
  m.position.set(mp.x, 0.004 + Math.abs(Math.sin(t * 38)) * 0.006 * (mu > 0 && mu < 1 ? 1 : 0), mp.z); m.rotation.y = Math.atan2(-tan.x, -tan.z) + (t < CHASE ? Math.sin(t * 2) * 0.4 : 0);
  if (t < CHASE + 0.4) m.position.set(2.3 + 0.03 * Math.sin(t * 3), 0.004, -1.0);
  for (let i = 0; i < rings.length; i++) { const k = ((t - HEAR) * 0.9 + i / rings.length) % 1; const on = t > HEAR && t < CHASE + 0.2; const r = rings[i];
    r.visible = on; r.position.set(2.32, 0.06, -1.0); r.lookAt(rCam.position); r.scale.setScalar(0.05 + k * 1.4); r.material.opacity = on ? 0.55 * (1 - k) * smooth(HEAR, HEAR + 0.6, t) : 0; }
  // cat flap opens as we push through
  props.flap.rotation.x = 1.25 * smooth(OUT - 0.55, OUT - 0.1, t);
  // sun: morning in the room, a slow time-lapse during the nap
  const sl = smooth(SLEEP, T_END, t); sun.position.set(lerp(-3.5, -1.2, sl), lerp(3.2, 1.6, sl), -6.0); sun.color.set(sl > 0 ? new THREE.Color('#fff0e2').lerp(new THREE.Color('#ffa060'), sl) : '#fff0e2'); sun.intensity = 6.0;
}
function roomCamera(t, mode) {
  let pos, look, fov = 74;
  if (mode === 'human') { pos = V3(0.05, 1.05, 2.05); look = V3(0.05, 0.25, 0.98); fov = 50; }
  else if (t < HEAR) { const u = t / HEAR; pos = V3(0.95, 0.17, 2.05 - 0.15 * u); look = V3(2.2, 0.2, -1.0); fov = 70; }
  else if (t < CHASE) { const u = (t - HEAR) / (CHASE - HEAR); pos = V3(lerp(0.95, 1.55, ease(u)), 0.16, lerp(1.9, 0.9, ease(u))); look = V3(2.3, 0.12, -1.0); fov = lerp(70, 62, u); }
  else if (t < POUNCE) { const cu = camChaseU(t), mu = mouseU(t); const cp = MOUSE_PATH.getPointAt(cu), mp = MOUSE_PATH.getPointAt(Math.min(1, ease(mu) * 0.15 + mu * 0.85));
    pos = V3(cp.x, 0.19 + 0.025 * Math.abs(Math.sin(t * 15)), cp.z); look = V3(mp.x, 0.04, mp.z); fov = 78; }
  else if (t < COLOR) { const u = (t - POUNCE) / 0.9, land = V3(-2.6, 0.17, 0.72), cp = MOUSE_PATH.getPointAt(0.93);
    pos = V3(lerp(cp.x, land.x, ease(u)), 0.19 + 0.45 * Math.sin(Math.PI * clamp(u, 0, 1)), lerp(cp.z, land.z, ease(u))); look = V3(-2.98, 0.04, 0.6); fov = 70; }
  else if (t < BLUR) { pos = V3(0.05, 0.14, 2.0); look = V3(0.05, 0.09, 0.98); fov = 62; }
  else { const u = (t - BLUR) / (OUT - BLUR); pos = V3(lerp(0.4, 2.62, ease(u)), 0.19 + 0.012 * Math.abs(Math.sin(t * 9)), lerp(1.6, 1.8, u)); look = V3(3.0, 0.16, 1.8); fov = lerp(74, 100, smooth(BLUR, BLUR + 1.5, t)); }
  if (t >= TASTE && t < SLEEP && mode !== 'human') { const u = (t - TASTE) / (SLEEP - TASTE); pos = V3(lerp(1.6, 1.85, u), 0.2, lerp(2.15, 2.35, u)); look = V3(2.05, 0.04, 2.62); fov = 62; }
  if (t >= SLEEP && mode !== 'human') { pos = V3(-0.6, 0.09, 0.9); look = V3(-0.9, 0.05, -2.0); fov = 70; }
  rCam.fov = fov; rCam.position.copy(pos); rCam.lookAt(look); rCam.updateMatrixWorld();
}
function streetCamera(t) { const u = clamp((t - OUT) / (NIGHT - OUT), 0, 1);
  cam.position.set(lerp(31, 40, u), 0.24 + 0.015 * Math.abs(Math.sin(t * 8)), 10.9 + 0.12 * Math.sin(u * 3)); cam.lookAt(cam.position.x + 10, lerp(0.5, 1.6, smooth(OUT + 3, OUT + 4.5, t)), 9.0); cam.fov = 76; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'split', 'rb'].map(k => [k, $(k)]));
const captions = [
  [3.3, 5.8, 'A mouse squeaks too high<br>for human ears…'],
  [5.9, 7.9, '…but not for yours.'],
  [8.3, 11.0, "You chase it.<br>Even if you're not hungry."],
  [11.1, 13.9, "It's pure instinct."],
  [14.6, 16.8, 'Missed.'],
  [17.4, 20.0, 'Cats barely see red.'],
  [20.1, 22.8, 'Red and green look<br>almost the same.'],
  [22.9, 25.3, 'Blue and yellow still pop.'],
  [25.4, 27.8, 'Your jack-o\'-lantern?<br>Kind of mustard.'],
  [28.3, 30.0, 'Far away is blurry…'],
  [30.1, 31.9, '…but you see almost<br>behind you: 200°.'],
  [32.6, 36.4, 'Outside, everything is giant.'],
  [36.6, 40.8, 'US cats catch billions<br>of birds a year.'],
  [41.4, 43.9, 'At night, you still see.'],
  [44.0, 46.8, 'Cats need about<br>6× less light.'],
  [47.4, 49.6, "Cake? You can't taste sweet."],
  [49.7, 51.8, "Cats' sweet gene is broken."],
  [52.4, 55.6, 'Then you nap in the sun…'],
  [55.7, 58.8, '…12 to 16 hours a day.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < HEAR + 0.2) show = 0;
  else if (t < CHASE) { lab = 'MOUSE SQUEAK'; val = '40,000 Hz'; sub = 'HUMANS: UP TO 20,000 · CATS: ~64,000'; }
  else if (t < POUNCE) { lab = 'TOP SPEED'; val = Math.round(30 * smooth(CHASE + 0.4, CHASE + 2.2, t)) + ' mph'; sub = 'IN A SHORT BURST'; }
  else if (t < COLOR) show = 0;
  else if (t < BLUR) show = 0;
  else if (t < OUT) { lab = 'FIELD OF VIEW'; val = '200°'; sub = 'HUMANS: ~180° · SHARPNESS ~20/100'; }
  else if (t < NIGHT) { lab = 'YOUR HEIGHT'; val = '10 in'; sub = t > 36.6 ? 'US CATS: 1.3–4 BILLION BIRDS / YEAR' : 'EYE LEVEL OF A CAT'; }
  else if (t < TASTE) show = 0;
  else if (t < SLEEP) { lab = 'SWEET TASTE'; val = 'none'; sub = 'TAS1R2 GENE SWITCHED OFF'; }
  else { lab = 'SLEEP'; val = '12–16 h'; sub = 'A DAY'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t, split) {
  el.title.style.opacity = 1 - smooth(HEAR - 0.6, HEAR - 0.1, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.split.style.opacity = split ? 1 : 0; el.rb.style.opacity = t >= COLOR + 0.3 && t < BLUR - 0.1 ? 1 : 0;
  const dip = Math.max(fadeWin(t, COLOR - 0.25, COLOR + 0.2, 0.2), fadeWin(t, NIGHT - 0.25, NIGHT + 0.2, 0.2), fadeWin(t, TASTE - 0.25, TASTE + 0.2, 0.2), fadeWin(t, SLEEP - 0.25, SLEEP + 0.2, 0.2));
  el.veil.style.background = '#000'; el.veil.style.opacity = dip;
  el.flash.style.opacity = fadeWin(t, OUT - 0.2, OUT + 0.35, 0.2);
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
window.renderAt = (t) => {
  updateRoom(t);
  const split = (t >= COLOR && t < BLUR) || (t >= NIGHT && t < TASTE);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear();
  if (t >= OUT && t < NIGHT) { streetCamera(t); updateStreet(t, false); renderer.toneMappingExposure = 1.0; shoot(city, cam, RT_FULL); present(RT_FULL, { cat: 0.6 }, t, null); }
  else if (t >= NIGHT && t < TASTE) { const u = (t - NIGHT) / (TASTE - NIGHT); cam.position.set(lerp(60, 57, u), 0.24, 7.7); cam.lookAt(0, 2.5, -1.5); cam.fov = 70; updateStreet(t, true);
    shoot(city, cam, RT_HALF[0]); present(RT_HALF[0], { cat: 0, exp: 0.22 }, t, 0);
    shoot(city, cam, RT_HALF[1]); present(RT_HALF[1], { cat: 1, night: 1, exp: 0.75 }, t, 1); }
  else if (split) { roomCamera(t, 'human'); shoot(room, rCam, RT_HALF[0]); present(RT_HALF[0], { cat: 0 }, t, 0);
    roomCamera(t, 'cat'); shoot(room, rCam, RT_HALF[1]); present(RT_HALF[1], { cat: 1 }, t, 1); }
  else { roomCamera(t, 'cat'); const chasing = t > CHASE + 0.6 && t < POUNCE + 0.9;
    shoot(room, rCam, RT_FULL); present(RT_FULL, { cat: (t < 0.6 ? smooth(0, 0.6, t) : 1) * 0.6, motion: chasing ? 0.9 : (t > POUNCE && t < POUNCE + 0.9 ? 1.4 : 0), wide: smooth(BLUR, BLUR + 1.5, t) * (t < OUT ? 1 : 0), exp: t < HEAR ? 0.85 : 1.0, lid: t > SLEEP ? smooth(SLEEP + 3.5, T_END - 0.3, t) : 0 }, t, null); }
  if (split) { renderer.setViewport(0, 0, W, H); }
  updateDOM(t, split);
  return true;
};
// the cat's rainbow: same stops through the dichromat matrix used in the cat-vision pass
{ const stops = ['#7a00ff', '#0050ff', '#00c8ff', '#00d040', '#e8e800', '#ff9000', '#ff1a00'];
  const M = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]];
  const cat = stops.map(hx => { const c = new THREE.Color(hx); const v = [c.r, c.g, c.b]; const d = M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]); const l = 0.3 * d[0] + 0.6 * d[1] + 0.1 * d[2]; const o = d.map(x => clamp(lerp(x, l, 0.12), 0, 1)); o[2] = clamp(lerp(o[2], v[2] * 1.05, 0.5), 0, 1); return new THREE.Color(o[0], o[1], o[2]).getStyle(); });
  document.getElementById('rbCat').style.background = 'linear-gradient(90deg,' + cat.join(',') + ')'; }
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
