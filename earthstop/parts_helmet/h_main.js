// =================== poses + effects for "you" outside ===================
const YOU0 = V3(1.6, 0.85, -3.3), HATCH = V3(6.8, -3.0, 2.0);
function setFace(A, t, o) { // o: mouth (0..1), swell (0..1), burn (0..1), eyes (0 closed .. 1 open), bubbles (0..1)
  if (!A.face) return; const sw = 1 + 0.12 * o.swell; A.head.scale.setScalar(sw); A.skin.color.set('#eebc98').lerp(_c.set('#e8806a'), o.burn * 0.75);
  A.mouth.scale.set(1.2 + 0.2 * o.mouth, 0.25 + 1.1 * o.mouth, 0.4 + 0.3 * o.mouth); A.tongue.position.y = -0.006 - 0.015 * o.mouth;
  for (const E of A.eyes) { E.lid.rotation.x = lerp(-0.25, -1.6, o.eyes); }
  for (const B of A.bubbles) { const k = (t * 1.3 + B.ph) % 1; const on = o.bubbles > 0.01; B.b.visible = on; B.b.scale.setScalar(on ? (0.5 + 1.6 * k) * o.bubbles : 0.001); B.b.position.set(B.x * (1 + k), 0.002 + 0.03 * k, B.z + 0.008 + 0.02 * k); B.b.material.opacity = 0.85 * (1 - Math.pow(k, 4)); }
  A.armL.glove.scale.setScalar(1 + 0.15 * o.swell); A.armR.glove.scale.setScalar(1 + 0.15 * o.swell); }
const _c = new THREE.Color();
function poseAstro(A, o) { A.armL.sh.rotation.set(o.aL ?? 0.3, 0, 0.25); A.armL.el.rotation.x = o.eL ?? -0.6; A.armR.sh.rotation.set(o.aR ?? 0.2, 0, -0.25); A.armR.el.rotation.x = o.eR ?? -0.5;
  A.legL.sh.rotation.x = o.lL ?? 0.1; A.legR.sh.rotation.x = o.lR ?? -0.1; A.legL.el.rotation.x = 0.25; A.legR.el.rotation.x = 0.2; }
function updateOutside(t) {
  const limp = smooth(FADE + 4, DARK, t); you.g.position.copy(YOU0); you.g.rotation.set(0, 0.25, 0);
  // hands up to the helmet, then off; then arms drift limp
  const lift = fadeWin(t, 1.4, OFF + 0.6, 0.9); poseAstro(you, { aL: lerp(0.3, -2.6, lift), aR: lerp(0.2, -2.7, lift), eL: lerp(-0.6, -1.4, lift), eR: lerp(-0.5, -1.4, lift) });
  if (limp > 0) { you.armL.sh.rotation.x = lerp(you.armL.sh.rotation.x, -0.9, limp); you.armR.sh.rotation.x = lerp(you.armR.sh.rotation.x, -1.1, limp); you.g.rotation.x = -0.25 * limp; }
  const off = smooth(OFF - 0.2, OFF + 0.6, t); const back = t >= BACK; you.helmet.visible = true;
  if (back) { you.helmet.position.set(0, 0, 0); you.helmet.rotation.set(0, 0, 0); poseAstro(you, { aR: -2.9, eR: -0.2 }); you.g.rotation.set(0, 0.25, 0); }
  else { const fl = Math.max(0, t - OFF); you.helmet.position.set(0.05 * fl + 0.2 * off, 0.35 * off + 0.12 * fl, 0.25 * off + 0.08 * fl); you.helmet.rotation.set(0.3 * fl, 0.5 * fl, 0.2 * fl); }
  const mouth = back ? 0 : Math.max(fadeWin(t, EXHALE, EXHALE + 3.5, 0.5) * 1.0, fadeWin(t, SPIT - 0.5, SWELL + 0.5, 0.4) * 0.7, fadeWin(t, OFF, OFF + 1.2, 0.3) * 0.5);
  setFace(you, t, { mouth, swell: back ? 0 : smooth(SWELL, SWELL + 4, t) * (1 - smooth(DARK, RESCUE, t) * 0), burn: back ? 0 : smooth(SUNB, SUNB + 4, t), eyes: back ? 1 : lerp(1, 0.2, smooth(SUNB + 1, SUNB + 2.5, t) * (1 - smooth(FADE - 0.5, FADE, t))) * (1 - smooth(FADE + 4.5, DARK, t)), bubbles: back ? 0 : fadeWin(t, SPIT, SWELL + 2, 0.6) });
  // rescue: the crewmate grabs you and tows you to the hatch
  const tow = smooth(RESCUE + 0.6, LOCK + 0.3, t);
  if (t > DARK && !back) { const p = YOU0.clone().lerp(HATCH.clone().add(V3(-1.2, 0.2, 0)), tow); you.g.position.copy(p); you.g.rotation.set(-0.5, 1.2, 0.3); }
  if (t < RESCUE - 0.5 || back) { mate.g.position.set(-6, -1.2, -5); mate.g.rotation.y = 0.8; poseAstro(mate, {}); }
  else { const app = smooth(RESCUE - 0.5, RESCUE + 0.8, t); const p = you.g.position.clone().add(V3(lerp(-3, -0.7, app), 0.3, lerp(-2.5, -0.3, app))); mate.g.position.copy(p); mate.g.rotation.set(-0.3, 1.4, 0); poseAstro(mate, { aR: -1.6, eR: -0.3, aL: -0.4 }); }
  // air bursting out of the suit, a breath of vapour, ice glitter
  nearSmoke.begin(); smokeMat.uniforms.uTint.value.set('#f2f6fa'); const neck = you.g.position.clone().add(V3(0, 1.72, 0));
  for (let k = 0; k < 40; k++) { const age = t - (OFF - 0.1) - k * 0.05; if (age > 0 && age < 1.6) { const d = V3(hash(k * 3.1) - 0.5, 0.6 + hash(k), hash(k * 7.7) - 0.3).normalize(); _p.copy(neck).addScaledVector(d, age * 2.2); nearSmoke.add(_p, 0.15 + age * 0.9, 0.55 * (1 - age / 1.6)); } }
  const mouthW = you.head.localToWorld(V3(0, -0.075, 0.2));
  for (let k = 0; k < 24; k++) { const age = t - (EXHALE + 0.2) - k * 0.08; if (age > 0 && age < 1.4) { _p.copy(mouthW).add(V3((hash(k) - 0.5) * 0.1 * age, 0.05 * age, 0.6 * age)); nearSmoke.add(_p, 0.05 + age * 0.35, 0.5 * (1 - age / 1.4)); } }
  nearSmoke.end();
  nSun.target.position.copy(you.g.position); nSun.target.updateMatrixWorld(); nSun.position.copy(you.g.position).addScaledVector(SUN_DIR, 50);
}
const _p = new THREE.Vector3();
function headW() { return you.head.localToWorld(V3(0, 0, 0)); }
function outsideCamera(t) { const h = headW(); let pos, look, fov = 45;
  if (t < OFF) { pos = YOU0.clone().add(V3(2.2, 2.2, 5.6)); look = YOU0.clone().add(V3(0, 0.6, 0)); fov = 50; }
  else if (t < EXHALE) { pos = h.clone().add(V3(0.6, 0.15, 1.35)); look = h.clone().add(V3(0, -0.12, 0)); fov = 42; }
  else if (t < SPIT) { pos = h.clone().add(V3(0.15, 0.08, 1.05)); look = h.clone().add(V3(0, -0.06, 0)); fov = 40; }
  else if (t < SWELL) { const m = you.head.localToWorld(V3(0, -0.07, 0.15)); pos = m.clone().add(V3(0.08, 0.06, 0.42)); look = m.clone().add(V3(0, 0.04, 0)); fov = 40; }
  else if (t < SUNB) { pos = h.clone().add(V3(0.9, 0.0, 2.6)); look = h.clone().add(V3(0, -0.55, 0)); fov = 44; }
  else if (t < FADE) { pos = h.clone().add(V3(-0.55, 0.12, 0.95)); look = h.clone().add(V3(0, -0.05, 0)); fov = 42; }
  else if (t < DARK) { pos = h.clone().add(V3(0, 0.02, 0.12)); look = h.clone().add(V3(0.6, -0.9, 3.0)); fov = 62; }
  else if (t < BACK) { const p = you.g.position; pos = p.clone().add(V3(2.5, 1.8, 6.5)); look = p.clone().add(V3(0.6, 0.0, 0)); fov = 50; }
  else { pos = YOU0.clone().add(V3(1.6, 2.0, 4.6)); look = YOU0.clone().add(V3(0, 0.9, 0)); fov = 50; }
  cam.fov = fov; cam.position.copy(pos); cam.lookAt(look); }
function shootSpace(rt) { cam.aspect = W / H; cam.updateProjectionMatrix(); bgCam.fov = cam.fov; bgCam.aspect = cam.aspect; bgCam.quaternion.copy(cam.quaternion); bgCam.position.set(0, 0, 0); bgCam.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bg, bgCam); renderer.clearDepth(); renderer.render(near, cam); }
function updateLock(t) { const u = t - LOCK; const wake = smooth(LOCK + 1.5, LOCK + 3.5, t);
  setFace(you2, t, { mouth: 0.15, swell: lerp(0.6, 0, smooth(LOCK, LOCK + 4, t)), burn: lerp(0.7, 0.4, smooth(LOCK, BACK, t)), eyes: wake, bubbles: 0 }); poseAstro(you2, { aL: -0.4, aR: -0.6 + 0 * u });
  poseAstro(mate2, { aR: smooth(LOCK + 4.5, LOCK + 5.5, t) * -2.6, eR: -0.2, aL: -0.5 });
  lockSmoke.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); for (let k = 0; k < 60; k++) { const age = ((t * 0.7 + k / 60) % 1); _p.set(-2.3 + age * 1.2, 0.8 + (hash(k) - 0.5) * 1.2, (hash(k * 3) - 0.5) * 1.2); lockSmoke.add(_p, 0.2 + age * 0.8, 0.25 * (1 - age) * (1 - smooth(LOCK + 1, LOCK + 3, t))); } lockSmoke.end(); }
function lockCamera(t) { const u = (t - LOCK) / (BACK - LOCK); const h = you2.head.localToWorld(V3(0, 0, 0)); lockCam.position.copy(h).add(V3(lerp(0.2, 0.35, u), lerp(0.1, 0.18, u), lerp(0.9, 1.3, u))); lockCam.lookAt(h.clone().add(V3(0.12, -0.1, 0))); lockCam.fov = 50; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const tunnel = document.createElement('div'); tunnel.className = 'ov gfx'; tunnel.style.cssText = 'top:0;bottom:0;pointer-events:none'; $('wrap').insertBefore(tunnel, $('title'));
const captions = [
  [4.3, 8.7, 'Instantly: silence.<br>No air, no sound.'],
  [9.3, 14.7, 'Rule #1: breathe OUT.<br>Holding your breath can tear your lungs.'],
  [15.3, 18.0, 'Your spit starts to boil —<br>and it isn\'t even hot.'],
  [18.1, 20.8, 'In near-vacuum, water boils<br>at body temperature.'],
  [21.3, 26.7, 'Your body swells…<br>but you don\'t explode. Your skin holds you together.'],
  [27.3, 29.9, 'You don\'t freeze instantly —<br>vacuum holds heat in.'],
  [30.0, 32.8, 'But the Sun burns your skin fast.<br>Nothing blocks the UV.'],
  [33.3, 39.6, 'About 12–15 seconds:<br>you black out. Your blood runs out of oxygen.'],
  [40.6, 47.6, 'Get back into air within ~90 seconds…<br>and you can survive.'],
  [48.4, 52.6, 'It really happened: in 1966, a NASA engineer\'s<br>suit leaked in a vacuum chamber.'],
  [52.7, 56.8, 'Jim LeBlanc felt his spit bubbling —<br>then woke up 87 seconds later. He was fine.'],
  [57.3, 60.8, 'So… keep your helmet on.'],
];
function hudAt(t) { let stat = '', lab = '', val = '', sub = '', show = 1; if (t < OFF || t >= BACK) show = 0;
  else { const s = (t - OFF) * (t < DARK ? 2.0 : 1.0) + (t >= DARK ? (DARK - OFF) * 1.0 : 0); const secs = t < DARK ? Math.min(15, Math.floor((t - OFF) * 15 / (DARK - OFF))) : Math.floor(15 + (t - DARK) * 15); const shown = t < LOCK ? secs : 87;
    stat = '<b></b>NO HELMET'; lab = 'TIME IN VACUUM'; val = 'T+' + shown + ' s'; sub = t < SPIT ? 'EXHALE!' : t < SWELL ? 'SALIVA BOILING' : t < SUNB ? 'SWELLING (EBULLISM)' : t < FADE ? 'UV BURN' : t < DARK ? 'LOSING CONSCIOUSNESS' : t < LOCK ? 'UNCONSCIOUS · ~90 s WINDOW' : 'REPRESSURIZED'; }
  return { stat, lab, val, sub, show }; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.0, 3.6, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const tv = smooth(FADE, DARK - 0.6, t) * (1 - smooth(RESCUE - 0.3, RESCUE + 0.6, t)); const r = lerp(85, 0, tv);
  tunnel.style.background = tv > 0.001 ? `radial-gradient(ellipse ${r}% ${r * 0.62}% at 50% 48%, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 100%)` : 'none';
  el.veil.style.background = '#000'; el.veil.style.opacity = smooth(DARK - 1.0, DARK - 0.2, t) * (1 - smooth(RESCUE - 0.4, RESCUE + 0.6, t));
  $('c').style.filter = t > LOCK && t < LOCK + 3 ? `blur(${lerp(6, 0, smooth(LOCK, LOCK + 3, t)).toFixed(1)}px)` : 'none';
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
window.renderAt = (t) => {
  const inLock = t >= LOCK && t < BACK;
  if (!inLock) { updateOutside(t); outsideCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shootSpace(RTA); }
  else { updateLock(t); lockCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(lockCam.fov * Math.PI / 360)); shootTo(RTA, lock, lockCam); }
  composite(0, inLock ? 1.05 : 1.0, 1); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth(); window.renderAt(0); return true; })();
