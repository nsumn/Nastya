// =================== POV rig: you are a rigid body turning around your own eye ===================
const YOU0 = V3(1.6, 0.85, -3.3), EYE_L = V3(0, 1.89, 0.1), SUN_YAW = Math.atan2(SUN_DIR.x, SUN_DIR.z), SUN_PITCH = Math.asin(SUN_DIR.y);
const _c = new THREE.Color(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function setFace(A, t, o) { // o: mouth (0..1), swell (0..1), burn (0..1), eyes (0 closed .. 1 open), bubbles (0..1)
  if (!A.face) return; const sw = 1 + 0.12 * o.swell; A.head.scale.setScalar(sw); A.skin.color.set('#eebc98').lerp(_c.set('#e8806a'), o.burn * 0.75);
  A.mouth.scale.set(1.2 + 0.2 * o.mouth, 0.25 + 1.1 * o.mouth, 0.4 + 0.3 * o.mouth); A.tongue.position.y = -0.006 - 0.015 * o.mouth;
  for (const E of A.eyes) { E.lid.rotation.x = lerp(-0.25, -1.6, o.eyes); }
  for (const B of A.bubbles) { const k = (t * 1.3 + B.ph) % 1; const on = o.bubbles > 0.01; B.b.visible = on; B.b.scale.setScalar(on ? (0.5 + 1.6 * k) * o.bubbles : 0.001); B.b.position.set(B.x * (1 + k), 0.002 + 0.03 * k, B.z + 0.008 + 0.02 * k); B.b.material.opacity = 0.85 * (1 - Math.pow(k, 4)); }
  A.armL.glove.scale.setScalar(1 + 0.25 * o.swell); A.armR.glove.scale.setScalar(1 + 0.25 * o.swell); }
function poseAstro(A, o) { A.armL.sh.rotation.set(o.aL ?? 0.3, 0, o.zL ?? 0.25); A.armL.el.rotation.x = o.eL ?? -0.6; A.armR.sh.rotation.set(o.aR ?? 0.2, 0, o.zR ?? -0.25); A.armR.el.rotation.x = o.eR ?? -0.5;
  A.legL.sh.rotation.x = o.lL ?? 0.1; A.legR.sh.rotation.x = o.lR ?? -0.1; A.legL.el.rotation.x = 0.25; A.legR.el.rotation.x = 0.2; }
const bump = (t, a, b) => (t > a && t < b) ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
const shake = (t, f) => V3(Math.sin(t * 37.1) * 0.6 + Math.sin(t * 23.3 + 1) * 0.4, Math.sin(t * 29.7 + 2) * 0.6 + Math.sin(t * 17.9) * 0.4, 0).multiplyScalar(f);
// heartbeat times: same rule as audio_pov.py (fast while panicking, slowing into the blackout)
const HB = []; { let at = OFF + 0.8, per = 0.62; while (at < LOCK + 8) { if (at < DARK) per = 0.62 + 0.4 * Math.max(0, (at - FADE) / (DARK - FADE)); else if (at < LOCK) per = 1.2; else per = Math.max(0.8, per - 0.05); HB.push(at); at += per; } }
const pulseAt = t => { let v = 0; for (const h of HB) { const d = t - h; if (d >= 0 && d < 0.5) v = Math.max(v, Math.exp(-d * 9) + 0.6 * Math.exp(-Math.max(0, d - 0.22) * 9) * (d > 0.22)); } return v; };
// drift: the recoil pushes you slowly back and up
function eyeOutside(t) { const k = Math.max(0, t - OFF); return YOU0.clone().add(EYE_L).add(V3(0.0, 0.02 * k + 0.12 * smooth(OFF, OFF + 1.5, t), 0.03 * k + 0.25 * smooth(OFF, OFF + 1.5, t))); }
// the view: yaw (pi = toward the Earth horizon), pitch, roll, fov — keyed per beat, all blended so it is one continuous move
function viewAt(t) { let yaw = Math.PI + 0.08 * Math.sin(t * 0.5), pitch = -0.28 + 0.012 * Math.sin(t * 2.2), roll = 0, fov = 68;
  if (VAR === 2) { const o = smooth(0.2, 3.1, t); pitch = lerp(0.62, pitch, o); yaw += lerp(0.22, 0, o); roll += lerp(-0.12, 0, o); }   // v2 opening: look up into the Milky Way, then tilt down to the Earth
  pitch += 0.16 * bump(t, OFF - 0.1, OFF + 1.2) - 0.06 * bump(t, OFF + 1.0, OFF + 2.6);            // jolt as the helmet lets go
  roll += 0.10 * smooth(OFF, SPIT, t);
  const lookDown = fadeWin(t, SWELL - 0.4, SUNB, 1.4); pitch = lerp(pitch, -0.62, lookDown);
  const sun = smooth(SUNB + 0.2, SUNB + 2.8, t) * (1 - smooth(FADE + 0.5, FADE + 6, t)); yaw = lerp(yaw, SUN_YAW - 0.12, sun); pitch = lerp(pitch, SUN_PITCH - 0.12, sun);
  roll += 0.35 * Math.sin((t - FADE) * 0.45) * smooth(FADE, FADE + 3, t) + 0.25 * smooth(SUNB, FADE, t);
  yaw += 0.35 * smooth(FADE + 2, DARK, t) + 0.05 * Math.sin(t * 0.9) * smooth(FADE, DARK, t); pitch -= 0.25 * smooth(FADE + 3, DARK, t);
  return { yaw, pitch, roll, fov }; }
function setRig(eye, yaw, pitch, roll, bodyPitch = 0) { // body yaw = view yaw (forward +z), the camera looks along the body's +z
  you.g.quaternion.setFromEuler(_e.set(bodyPitch, yaw, roll, 'YXZ')); you.g.position.copy(eye).sub(EYE_L.clone().applyQuaternion(you.g.quaternion)); you.g.updateMatrixWorld(true);
  cam.quaternion.copy(you.g.quaternion).multiply(_q.setFromEuler(_e.set(pitch, Math.PI, 0, 'YXZ'))); cam.position.copy(eye); }
const PATH = { curve: null };
you.helmet.children.forEach(c => { if (c.geometry && c.geometry.type === 'BoxGeometry') c.scale.multiplyScalar(0.5); });
function updateOutside(t) { you.head.visible = false; you.g.visible = true; let fov = 68;
  const v = viewAt(t); const eye = eyeOutside(t); setRig(eye, v.yaw, v.pitch, v.roll);
  // arms: rest -> reach up into view to the latches -> push the helmet off -> hands drift; look at swelling gloves; shield the Sun
  const reach = fadeWin(t, 1.2, OFF + 0.4, 0.8), push = smooth(OFF - 0.3, OFF + 0.2, t) * (1 - smooth(OFF + 0.6, OFF + 1.8, t));
  const hands = fadeWin(t, SWELL - 0.3, SUNB + 0.2, 1.2), shield = fadeWin(t, SUNB + 2.4, FADE + 1.0, 0.8), limp = smooth(FADE + 4, DARK, t);
  const o = { aL: lerp(0.3, -1.75, reach), eL: lerp(-0.6, -1.35, reach), aR: lerp(0.2, -1.8, reach), eR: lerp(-0.5, -1.3, reach), zL: 0.25 + 0.45 * reach, zR: -0.25 - 0.45 * reach };
  o.aL += -0.4 * push; o.aR += -0.4 * push; o.eL += 0.6 * push; o.eR += 0.6 * push;
  o.aL = lerp(o.aL, -1.45 + 0.05 * Math.sin(t * 2), hands); o.eL = lerp(o.eL, -0.9, hands); o.zL = lerp(o.zL, 0.7, hands); o.aR = lerp(o.aR, -1.4 + 0.05 * Math.sin(t * 2.3), hands); o.eR = lerp(o.eR, -0.95, hands); o.zR = lerp(o.zR, -0.7, hands);
  o.aR = lerp(o.aR, -1.8, shield); o.eR = lerp(o.eR, -1.25, shield); o.zR = lerp(o.zR, -0.85, shield);
  o.aL = lerp(o.aL, -0.6, limp); o.aR = lerp(o.aR, -0.7, limp); poseAstro(you, o);
  const swell = smooth(SWELL, SWELL + 4, t); you.armL.glove.scale.setScalar(1 + 0.3 * swell); you.armR.glove.scale.setScalar(1 + 0.3 * swell);
  // the helmet: on your head (not drawn — the shader draws its rim), lifted off, tumbling away; turns its visor to you as a mirror
  const off = smooth(OFF - 0.25, OFF + 0.7, t);
  if (t < OFF - 0.25) you.helmet.visible = false;
  else { you.helmet.visible = true; const fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion), up = V3(0, 1, 0).applyQuaternion(cam.quaternion);
    const k = Math.max(0, t - OFF); const H0 = eyeOutside(OFF + 0.7);
    // fixed world anchor after it leaves: in front of you and slightly up, drifting farther
    const anchor = YOU0.clone().add(EYE_L).add(V3(0.12, 0.2, -0.7)).add(V3(0.01, 0.015, -0.035).multiplyScalar(Math.min(k, SWELL - OFF))).add(V3(0.02, 0.03, -0.12).multiplyScalar(Math.max(0, t - SWELL)));
    const lifted = eye.clone().addScaledVector(up, 0.3 * off).addScaledVector(fwd, 0.25 + 0.2 * off);
    you.helmet.position.copy(lifted).lerp(anchor, smooth(OFF + 0.2, OFF + 2.0, t));
    const spin = V3(0.9 * k, 0.7 * k + 0.6, 0.4 * k);
    _q.setFromEuler(_e.set(spin.x, spin.y, spin.z)); you.helmet.quaternion.copy(_q);
    const face = fadeWin(t, SPIT - 1.0, SWELL + 0.5, 1.2);  // visor turns to face you
    if (face > 0) { const m = new THREE.Matrix4().lookAt(you.helmet.position, eye, V3(0, 1, 0)); const qf = new THREE.Quaternion().setFromRotationMatrix(m);
      qf.multiply(_q.clone().setFromEuler(_e.set(0.012 * Math.sin(t * 1.3), Math.PI + 0.015 * Math.sin(t * 0.8), 0.04 * Math.sin(t)))); you.helmet.quaternion.slerp(qf, face); }
    mirror.visible = face > 0.02; }
  // your face (only seen in the mirror)
  const mouth = Math.max(fadeWin(t, EXHALE, EXHALE + 3.0, 0.4), fadeWin(t, SPIT - 0.5, SWELL + 0.5, 0.4) * 0.75, fadeWin(t, OFF, OFF + 1.2, 0.3) * 0.5);
  setFace(you, t, { mouth, swell: smooth(SWELL - 1.5, SWELL + 4, t), burn: smooth(SUNB, SUNB + 4, t), eyes: 1, bubbles: fadeWin(t, SPIT, SWELL + 2, 0.6) });
  you.armL.glove.scale.setScalar(1 + 0.3 * swell); you.armR.glove.scale.setScalar(1 + 0.3 * swell);
  // mirror shot: look at the helmet and zoom in on the reflection
  let yaw = v.yaw, pitch = v.pitch, roll = v.roll; const mz = fadeWin(t, SPIT - 0.6, SWELL - 0.3, 1.0);
  setRig(eye, yaw, pitch, roll);
  if (mz > 0) { const d = you.helmet.position.clone().add(V3(0, -0.02, 0)).sub(eye).normalize(); const qy = Math.atan2(d.x, d.z), qp = Math.asin(d.y);
    let dy = qy - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); setRig(eye, yaw + dy * mz, lerp(pitch, qp, mz), roll * (1 - 0.7 * mz)); fov = lerp(68, lerp(30, 19, smooth(SPIT, SWELL - 1, t)), mz); }
  // shakes: helmet burst, heartbeat
  const sh = shake(t, 0.03 * bump(t, OFF - 0.1, OFF + 1.0) + 0.004 * pulseAt(t) * (t > OFF && t < DARK) + 0.006 * smooth(FADE, DARK, t));
  cam.rotateX(sh.y); cam.rotateY(sh.x); cam.fov = fov;
  // gas: air bursting out of the suit around you, then your own breath leaving as a white cloud
  nearSmoke.begin(); smokeMat.uniforms.uTint.value.set('#f2f6fa'); const fwd = V3(0, 0, -1).applyQuaternion(cam.quaternion), up = V3(0, 1, 0).applyQuaternion(cam.quaternion), right = V3(1, 0, 0).applyQuaternion(cam.quaternion);
  for (let k = 0; k < 50; k++) { const age = t - (OFF - 0.15) - k * 0.03; if (age > 0 && age < 1.5) { const a = hash(k * 3.1) * 6.283, r = 0.25 + 0.5 * hash(k * 1.7);
    _p.copy(eye).addScaledVector(fwd, 0.35 + age * 1.6).addScaledVector(right, Math.cos(a) * r * (0.4 + age)).addScaledVector(up, Math.sin(a) * r * (0.4 + age) + 0.15); nearSmoke.add(_p, 0.1 + age * 0.5, 0.45 * (1 - age / 1.5)); } }
  for (let k = 0; k < 30; k++) { const age = t - (EXHALE + 0.15) - k * 0.07; if (age > 0 && age < 1.8) { _p.copy(eye).addScaledVector(up, -0.16 + 0.05 * age).addScaledVector(fwd, 0.12 + age * 0.75).addScaledVector(right, (hash(k) - 0.5) * 0.18 * age); nearSmoke.add(_p, 0.05 + age * 0.3, 0.5 * (1 - age / 1.8)); } }
  nearSmoke.end();
  mate.g.visible = false; hatchGlow.visible = false;
  nSun.target.position.copy(you.g.position); nSun.target.updateMatrixWorld(); nSun.position.copy(you.g.position).addScaledVector(SUN_DIR, 50);
}
// rescue: eyes flicker open three times — the crewmate's visor, the handrails rushing by, the open hatch
function updateRescue(t) { you.head.visible = false; you.g.visible = false; mirror.visible = false; hatchGlow.visible = true; nearSmoke.begin(); nearSmoke.end();
  if (!PATH.curve) { const e0 = eyeOutside(RESCUE); PATH.curve = new THREE.CatmullRomCurve3([e0, V3(3.4, 0.9, -0.9), V3(6.3, -0.35, 1.0), V3(8.5, -1.6, 2.0), V3(8.1, -2.95, 2.0)]); }
  const u = smooth(RESCUE + 1.6, LOCK - 0.1, t) * 0.97; const eye = PATH.curve.getPointAt(u), tan = PATH.curve.getTangentAt(Math.min(0.99, u + 0.02));
  // the crewmate: first facing you up close, then ahead of you on the route, towing you by the arm
  mate.g.visible = true; const grab = smooth(RESCUE, RESCUE + 1.4, t);
  if (t < RESCUE + 2.35) { const q = new THREE.Quaternion().setFromEuler(_e.set(0, Math.PI + 0.3, 0)); const f = V3(0, 0, 1).applyQuaternion(q);
    const mh = eye.clone().add(V3(-0.35, 0.05, -lerp(1.6, 0.75, grab))); mate.g.position.copy(mh).sub(V3(0, 1.86, 0)); mate.g.rotation.set(0, 0.35, 0); poseAstro(mate, { aR: -1.5 + 0.2 * grab, eR: -0.3, aL: -0.5, zR: 0.1 }); }
  else { const u2 = Math.min(1, u + 0.07), p2 = PATH.curve.getPointAt(u2), d = PATH.curve.getTangentAt(u2); mate.g.position.copy(p2).add(V3(0.0, -1.6, 0.0)).addScaledVector(d, 0.35);
    mate.g.rotation.set(0.9, Math.atan2(d.x, d.z), 0); poseAstro(mate, { aR: 1.2, eR: -0.2, aL: -2.4, eL: -0.6, lL: 0.4, lR: -0.2 }); }
  let look;
  if (t < RESCUE + 2.35) look = mate.head.localToWorld(V3(0, 0, 0));
  else if (t < RESCUE + 4.9) look = eye.clone().addScaledVector(tan, 1.0).add(V3(0, -1.1, 0.35));
  else look = V3(6.83, -3.0, 2.0);
  cam.position.copy(eye); cam.up.set(0, 1, 0); cam.lookAt(look); cam.rotateZ(0.25 * Math.sin(t * 0.7)); cam.fov = 62;
  const sh = shake(t, 0.004); cam.rotateX(sh.y); cam.rotateY(sh.x);
  nSun.target.position.copy(eye); nSun.target.updateMatrixWorld(); nSun.position.copy(eye).addScaledVector(SUN_DIR, 50); }
function shootSpace(rt) { cam.aspect = W / H; cam.updateProjectionMatrix(); bgCam.fov = cam.fov; bgCam.aspect = cam.aspect; bgCam.quaternion.copy(cam.quaternion); bgCam.position.set(0, 0, 0); bgCam.updateProjectionMatrix();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bg, bgCam); renderer.setRenderTarget(rt); renderer.clearDepth(); renderer.render(near, cam); }
// airlock: you wake up, blurred white light, the crewmate in front of you gives a thumbs-up
you2.head.visible = false; you2.g.visible = false; mate2.g.rotation.y = -0.85;
function updateLock(t) { const u = t - LOCK;
  poseAstro(you2, { aL: -0.4, aR: -0.6 }); poseAstro(mate2, { aR: smooth(LOCK + 4.0, LOCK + 5.0, t) * -2.6, eR: -0.2 - 0.6 * smooth(LOCK + 4.0, LOCK + 5.0, t), aL: -0.5 });
  mate2.g.position.set(0.85 - 0.12 * smooth(LOCK + 1, LOCK + 4, t), -1.15 + 0.03 * Math.sin(t * 0.8), -1.0);
  lockSmoke.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); for (let k = 0; k < 60; k++) { const age = ((t * 0.7 + k / 60) % 1); _p.set(-2.3 + age * 1.2, 0.8 + (hash(k) - 0.5) * 1.2, (hash(k * 3) - 0.5) * 1.2); lockSmoke.add(_p, 0.2 + age * 0.8, 0.25 * (1 - age) * (1 - smooth(LOCK + 1, LOCK + 3, t))); } lockSmoke.end();
  you2.g.updateMatrixWorld(true); const eye = you2.head.localToWorld(V3(0, 0.03, 0.1)); const back = smooth(BACK, T_END, t);
  const mh = mate2.head.localToWorld(V3(0, 0, 0)); lockCam.position.copy(eye).addScaledVector(eye.clone().sub(mh).setY(0).normalize(), 0.5 + 0.35 * back).add(V3(0, 0.05 + 0.05 * back, 0)); const look = mate2.head.localToWorld(V3(0, -0.3, 0)).add(V3(-0.1 * back, 0, 0));
  lockCam.up.set(0, 1, 0); lockCam.lookAt(look); lockCam.rotateZ(0.06 * Math.sin(t * 0.6) - 0.15 * (1 - smooth(LOCK, LOCK + 3, t)));
  lockCam.rotateX(0.05 * bump(t, LOCK + 2.25, LOCK + 3.0) + 0.02 * Math.sin(t * 0.9)); lockCam.fov = lerp(64, 56, smooth(LOCK, BACK, t)); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = VAR === 2 ? [
  [4.2, 6.6, 'And just like that —<br>total silence.'],
  [6.7, 8.9, 'Let the air OUT.<br>Holding your breath would rip your lungs.'],
  [9.3, 11.9, 'Look — your spit is boiling.'],
  [12.0, 14.8, 'Not from heat. With almost no pressure,<br>water boils at 98 °F.'],
  [15.3, 20.8, 'Your body puffs up…<br>but your skin is tough enough. No explosion.'],
  [21.3, 23.9, 'You won\'t freeze solid —<br>there\'s no air to steal your heat.'],
  [24.0, 26.8, 'The Sun is the real danger:<br>raw UV, instant sunburn.'],
  [27.3, 31.4, 'About 10 seconds in,<br>your blood has no oxygen left.'],
  [31.5, 35.6, 'The world goes gray…<br>and closes in.'],
  [36.4, 39.8, 'Around 15 seconds — lights out.<br>The clock: ~90 seconds to save you.'],
  [40.4, 47.6, 'Your crewmate drags you<br>back to the airlock.'],
  [48.6, 53.8, 'Pressure comes back.<br>You open your eyes. You made it.'],
  [54.2, 57.0, 'Real story: 1966, Houston. NASA engineer<br>Jim LeBlanc\'s suit lost pressure in a test chamber.'],
  [57.1, 59.9, 'He remembered his saliva bubbling.<br>He woke up 87 seconds later — and was fine.'],
] : [
  [4.2, 6.6, 'Instantly: silence.<br>No air, no sound.'],
  [6.7, 8.9, 'Breathe OUT —<br>holding it would tear your lungs.'],
  [9.3, 11.9, 'Your spit starts to boil…'],
  [12.0, 14.8, '…at body temperature.<br>In a vacuum, water boils without heat.'],
  [15.3, 20.8, 'You swell up…<br>but you don\'t explode. Your skin holds you together.'],
  [21.3, 23.9, 'You don\'t freeze instantly —<br>a vacuum holds heat in.'],
  [24.0, 26.8, 'But the Sun burns your skin.<br>Nothing blocks the UV.'],
  [27.3, 31.4, '~10 seconds: your blood<br>runs out of oxygen.'],
  [31.5, 35.6, 'Colors fade.<br>Your vision narrows…'],
  [36.4, 39.8, '~15 seconds: you black out.<br>Now you have about 90 seconds.'],
  [40.4, 47.6, 'Your crewmate has one job:<br>get you inside.'],
  [48.6, 53.8, 'Air rushes back in.<br>You wake up. You\'re alive.'],
  [54.2, 57.0, 'This really happened: in 1966, NASA engineer<br>Jim LeBlanc\'s suit leaked in a vacuum chamber.'],
  [57.1, 59.9, 'His last memory: spit bubbling on his tongue.<br>He was fine.'],
];
function hudAt(t) { let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < OFF - 0.4) { stat = '<b style="background:#5fd27a"></b>EVA · SUIT OK'; lab = 'SUIT PRESSURE'; val = '4.3 psi'; sub = 'O2 100%'; }
  else if (t < OFF + 0.6) { stat = '<b></b>HELMET UNLOCKED'; lab = 'SUIT PRESSURE'; val = (4.3 * (1 - smooth(OFF - 0.4, OFF + 0.3, t))).toFixed(1) + ' psi'; sub = 'WARNING'; }
  else if (t < BACK) { const secs = t < DARK ? Math.min(15, Math.floor((t - OFF) * 15 / (DARK - OFF))) : Math.floor(15 + (t - DARK) * 72 / (LOCK - DARK)); const shown = t < LOCK ? secs : 87;
    stat = '<b></b>NO HELMET'; lab = 'TIME IN VACUUM'; val = 'T+' + shown + ' s'; sub = t < SPIT ? 'EXHALE!' : t < SWELL ? 'SALIVA BOILING' : t < SUNB ? 'SWELLING (EBULLISM)' : t < FADE ? 'UV BURN' : t < DARK ? 'LOSING CONSCIOUSNESS' : t < LOCK ? 'UNCONSCIOUS · ~90 s WINDOW' : 'REPRESSURIZED'; }
  else show = 0;
  return { stat, lab, val, sub, show }; }
const blur = t => t < DARK ? 2.2 * smooth(FADE + 3, DARK - 1, t) : t < LOCK ? 3.5 : lerp(9, 0, smooth(LOCK, LOCK + 3.2, t));
if (VAR === 2) { el.title.innerHTML = 'POV: you take off<br>your <span class="hl">helmet</span> in space'; el.endT.innerHTML = 'POV: you take off your <span class="hl">helmet</span> in space'; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.0, 3.6, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(BACK - 0.4, BACK, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const b = blur(t); $('c').style.filter = b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none';
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// eyelids: closed in the blackout; three half-open flickers during the rescue; wake in the airlock
function lidAt(t) { if (t < DARK - 1.2) return 0.12 * bump(t, SUNB + 2.2, SUNB + 3.0) + 0.35 * smooth(FADE + 5, DARK - 1.2, t);
  if (t < LOCK) { let open = 0; for (const [a, b, m] of [[RESCUE + 0.2, RESCUE + 2.1, 0.7], [RESCUE + 2.6, RESCUE + 4.7, 0.6], [RESCUE + 5.2, LOCK - 0.3, 0.75]]) open = Math.max(open, m * fadeWin(t, a, b, 0.35));
    if (t < RESCUE) return 0.35 + 0.65 * smooth(DARK - 1.2, DARK - 0.2, t);
    return 1 - open * (1 - 0.15 * Math.sin(t * 7) ** 2); }
  return 1 - smooth(LOCK + 0.2, LOCK + 1.6, t) * (1 - 0.3 * bump(t, LOCK + 1.8, LOCK + 2.2)); }
function postFX(t, inLock) { const u = compMat.uniforms;
  u.uFrame.value = 1 - smooth(OFF - 0.15, OFF + 0.45, t); u.uFrameK.value = smooth(OFF - 0.2, OFF + 0.5, t);
  u.uFog.value = (fadeWin(t, 1.25, 2.6, 0.45) * 0.9 + fadeWin(t, 3.15, 3.7, 0.2) * 0.6) * u.uFrame.value;
  u.uPulse.value = (t > OFF && t < LOCK + 3) ? pulseAt(t) * (0.5 + 0.8 * smooth(FADE, DARK, t)) : 0;
  const hyp = smooth(FADE + 1, DARK - 1, t) * (t < LOCK ? 1 : 0); const res = t >= DARK && t < LOCK ? 1 : 0;
  u.uGhostA.value = Math.max(hyp, 0.6 * res); u.uGhost.value.set(0.012 * Math.sin(t * 1.3) + 0.006, 0.006 * Math.cos(t * 1.7));
  u.uSat.value = t < LOCK ? lerp(1, 0.12, Math.max(hyp, res)) : lerp(0.35, 1, smooth(LOCK, LOCK + 4, t));
  const burn = smooth(SUNB + 2, SUNB + 4, t) * (1 - smooth(FADE + 2, FADE + 5, t)); u.uTint.value.set(1, 1 - 0.12 * burn, 1 - 0.2 * burn); if (VAR === 2) u.uTint.value.multiply(V3(0.97, 1.0, 1.06));
  u.uVig.value = t < LOCK ? lerp(3, 0.42, smooth(FADE + 0.5, DARK - 0.8, t) * (1 - 0.35 * res)) + 0.06 * u.uPulse.value : lerp(0.8, 3, smooth(LOCK, LOCK + 3, t));
  u.uLid.value = lidAt(t);
  u.uFlash.value = inLock ? 0.7 * (1 - smooth(LOCK + 0.2, LOCK + 3.0, t)) * (1 - u.uLid.value) : 0;
  u.uBright.value = 1;
  // sun glare where the Sun is on screen
  const sp = SUN_DIR.clone().multiplyScalar(1000).project(bgCam); const inView = (!inLock && sp.z < 1 ? 1 : 0) * smooth(2.2, 1.1, Math.abs(sp.x)) * smooth(1.9, 1.1, Math.abs(sp.y));
  u.uSunUV.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5); u.uSunA.value = inView * (1.0 - 0.45 * fadeWin(t, SUNB + 2.6, FADE + 1, 0.8));
  u.uExpA.value = (inLock ? 1.05 : 1.0) * (VAR === 2 ? 1.08 : 1) * (1 + 0.5 * fadeWin(t, SUNB + 2.0, SUNB + 3.6, 0.6)); }
// =================== render ===================
window.renderAt = (t) => {
  const inLock = t >= LOCK;
  if (!inLock) { if (t < DARK) updateOutside(t); else updateRescue(t); cam.aspect = W / H; cam.updateProjectionMatrix(); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shootSpace(RTA); }
  else { updateLock(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(lockCam.fov * Math.PI / 360)); shootTo(RTA, lock, lockCam); }
  if (DEBUG === '3p' && !inLock) { you.head.visible = true; const e = cam.position.clone(); cam.position.add(V3(1.4, 0.4, -1.6)); cam.lookAt(e); cam.fov = 50; cam.updateProjectionMatrix(); shootSpace(RTA); }
  postFX(t, inLock); composite(0, compMat.uniforms.uExpA.value, 1); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth(); window.renderAt(0); return true; })();
