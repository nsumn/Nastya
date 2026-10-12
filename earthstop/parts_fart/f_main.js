
// =================== updates ===================
const WAVE_DIR = new THREE.Vector3(1.0, 0.2, 0.6).normalize();
function globeAt(t) {
  const sound = t >= SOUND;
  globe.rotation.y = sound ? 1.2 + (t - SOUND) * 0.05 : -0.6 + t * 0.06;
  const d = sound ? 66 : lerp(80, 70, smooth(0, NYC, t));
  gCam.position.set(sound ? 12 : 0, sound ? 22 : 6, d); gCam.lookAt(0, 0, 0); gCam.updateProjectionMatrix();
  // the moment: a front sweeps the planet
  const front = lerp(-1.25, 1.25, smooth(3.4, 6.6, t)); gWave.material.uniforms.uFront.value = front; gWave.material.uniforms.uA.value = sound ? 0 : smooth(3.2, 3.6, t) * (1 - smooth(7.0, 8.0, t));
  gAtm.material.uniforms.uG.value = sound ? 0.25 : smooth(4.5, 7.5, t) * 0.7;
  const inv = globe.matrixWorld.clone().invert(); globe.updateMatrixWorld();
  for (const p of gPuffs) {
    const n = p.s.position.clone().normalize(); const dw = n.dot(WAVE_DIR);
    const age = sound ? -1 : (front - dw) * 2.2;   // seconds-ish after the front passes
    const on = age > 0 && age < 3; p.s.material.opacity = on ? Math.min(1, age * 4) * (1 - smooth(1.6, 3, age)) : 0;
    p.s.scale.setScalar(on ? (0.25 + 0.9 * Math.min(age, 1.2)) * (0.7 + 0.6 * p.ph) : 0.01);
    p.s.position.copy(n.multiplyScalar(ER * (1.01 + (on ? age * 0.04 : 0))));
  }
  for (const r of gRings) { const u = sound ? ((t - SOUND) * 0.7 + r.ph) % 1 : -1; r.r.material.opacity = u > 0 ? 0.8 * (1 - u) : 0; r.r.scale.setScalar(u > 0 ? 0.05 + u * 0.35 : 0.01); }
}
function nyAt(t) {
  const fin = t >= LIGHT;
  const grow = ease((t - (NYC + 0.6)) / 4.6);
  gasCube.scale.set(lerp(0.2, 1, grow), Math.max(grow, 0.001), lerp(0.2, 1, grow));
  gasCube.position.set(GAS_X, CUBE_S / 2 * grow, GAS_Z); cubeEdges.position.copy(gasCube.position); cubeEdges.scale.copy(gasCube.scale);
  gasMat.uniforms.uT.value = t; gasMat.uniforms.uA.value = smooth(NYC + 0.4, NYC + 1.4, t); cubeEdges.material.opacity = 0.55 * smooth(NYC + 4.5, NYC + 6, t);
  streams.forEach(o => { const u = ((t - NYC) * 0.35 + o.ph) % 1; const on = t > NYC + 0.3 && t < NYC + 6.5 && !fin; const r = o.r * (1 - u); const a = o.a + u * 2.5;
    o.s.position.set(GAS_X + Math.cos(a) * r, o.y0 + 20 + u * 40, GAS_Z + Math.sin(a) * r); o.s.scale.setScalar(18 + 30 * u); o.s.material.opacity = on ? 0.8 * Math.sin(u * Math.PI) : 0; });
  let pos, look, fov = 50;
  if (t < WEIGH) { const u = ease((t - NYC) / (WEIGH - NYC)); pos = new THREE.Vector3(lerp(10, 40, u), lerp(24, 40, u), lerp(400, 440, u)); look = new THREE.Vector3(lerp(30, 42, u), lerp(52, 48, u), lerp(-10, -15, u)); fov = 48; }
  else if (!fin) { const u = (t - WEIGH) / (SOUND - WEIGH); const a = lerp(-0.55, -0.25, u); pos = new THREE.Vector3(40 + Math.sin(a) * 470, 60, -15 + Math.cos(a) * 470); look = new THREE.Vector3(40, 48, -15); fov = 40; }
  else { // the lighter, then pull back
    const u = (t - LIGHT) / (T_END - LIGHT); const base = new THREE.Vector3(GAS_X - 30, 3.2, GAS_Z + 95);
    const back = ease((t - (LIGHT + 4.2)) / 3.2);
    pos = base.clone().lerp(new THREE.Vector3(GAS_X - 230, 70, GAS_Z + 430), back); look = new THREE.Vector3(GAS_X, lerp(35, 45, back), GAS_Z); fov = lerp(55, 46, back);
    lighter.visible = back < 0.2; const dir = look.clone().sub(pos).normalize(); const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    lighter.position.copy(pos).addScaledVector(dir, 0.36).addScaledVector(right, 0.07).add(new THREE.Vector3(0, -0.085, 0)); lighter.quaternion.copy(nyCam.quaternion);
    const lit = t > LIGHT + 1.6; lFlame.visible = lit; lFlame.scale.set(0.022 * (1 + 0.15 * Math.sin(t * 31)), 0.045 * (1 + 0.2 * Math.sin(t * 23)), 1);
  }
  if (!fin) lighter.visible = false;
  nyCam.fov = fov; nyCam.near = fin && t < LIGHT + 4.6 ? 0.02 : 0.5; nyCam.updateProjectionMatrix(); nyCam.position.copy(pos); nyCam.lookAt(look);
  nySun.position.copy(look).add(new THREE.Vector3(-300, 420, 260)); nySun.target.position.copy(look); nySun.target.updateMatrixWorld();
}
function farmAt(t) {
  const u = (t - COW) / (FISH - COW);
  farmCam.position.set(lerp(4.6, 4.0, u), lerp(1.9, 1.7, u), lerp(5.6, 4.9, u)); farmCam.lookAt(0.3, 1.25, 0); farmCam.fov = 42; farmCam.updateProjectionMatrix();
  const head = cow.userData.head; head.rotation.z = -0.15 + 0.08 * Math.sin(t * 1.5) + (t > COW + 2.6 && t < COW + 4.2 ? 0.25 * Math.sin((t - COW - 2.6) / 1.6 * Math.PI) : 0);
  herd.forEach((c, i) => { c.userData.head.rotation.z = -0.5 + 0.1 * Math.sin(t + i); });
  // tiny "pfft" at the back first, then the real thing comes out the front
  const tp = t - (COW + 1.0); tailPuff.material.opacity = tp > 0 && tp < 1.2 ? 0.5 * (1 - tp / 1.2) : 0; tailPuff.scale.setScalar(0.2 + tp * 0.4); tailPuff.position.set(-1.25 - tp * 0.3, 1.3, 0).applyMatrix4(cow.matrixWorld);
  const hp = new THREE.Vector3(0.95, -0.1, 0).applyMatrix4(cow.userData.head.matrixWorld);
  burps.forEach(o => { const a = t - (COW + 2.7) - o.ph * 1.4; const on = a > 0 && a < 2.6; o.s.material.opacity = on ? 0.85 * Math.min(1, a * 5) * (1 - a / 2.6) : 0; o.s.scale.setScalar(0.4 + a * 0.9);
    o.s.position.copy(hp).add(new THREE.Vector3(0.6 * a + 0.1 * Math.sin(o.ph * 20), 0.25 * a + 0.1 * Math.cos(o.ph * 13), 0.35 * a * Math.sin(o.ph * 9))); });
  cow.updateMatrixWorld(true);
}
function seaAt(t) {
  const u = (t - FISH) / (SLOTH - FISH);
  seaCam.position.set(Math.sin(u * 0.6) * 1.2, lerp(-0.2, 0.3, u), lerp(5.6, 4.4, u)); seaCam.lookAt(0, 0, -1.5); seaCam.updateProjectionMatrix();
  let bi = 0;
  fishP.forEach((f, i) => { const a = f.ph + t * 0.35 * f.s; const r = 3.2 + 0.6 * Math.sin(f.ph * 3);
    const x = Math.cos(a) * r * 1.4 + f.x * 0.25, z = Math.sin(a) * r - 2.5 + f.z * 0.2, y = f.y + 0.2 * Math.sin(t * 1.3 + f.ph);
    D3.position.set(x, y, z); D3.rotation.set(0, -a - Math.PI / 2 + 0.15 * Math.sin(t * 9 + f.ph), 0); D3.scale.setScalar(f.s); D3.updateMatrix(); fishIM.setMatrixAt(i, D3.matrix);
    if (f.bub) for (let k = 0; k < 4 && bi < 1600; k++) { const age = ((t * 0.7 + f.ph + k * 0.25) % 1); const burst = Math.sin(t * 2.0 + f.ph * 7) > 0.4;
      D3.position.set(x - Math.cos(a + Math.PI / 2) * 0.12, y + age * 1.6, z - Math.sin(a + Math.PI / 2) * 0.12); D3.rotation.set(0, 0, 0); D3.scale.setScalar(burst ? 0.6 + age : 0.001); D3.updateMatrix(); bubIM.setMatrixAt(bi++, D3.matrix); } });
  for (; bi < 1600; bi++) { D3.position.set(0, -99, 0); D3.scale.setScalar(0); D3.updateMatrix(); bubIM.setMatrixAt(bi, D3.matrix); }
  fishIM.instanceMatrix.needsUpdate = true; bubIM.instanceMatrix.needsUpdate = true;
  rays.forEach((r, i) => { r.material.opacity = 0.05 + 0.03 * Math.sin(t * 0.8 + i); });
}
function jungleAt(t) {
  const u = (t - SLOTH) / (BIRDS - SLOTH);
  jCam.position.set(lerp(2.4, 2.0, u), lerp(1.8, 1.9, u), lerp(4.2, 3.5, u)); jCam.lookAt(0.2, 1.85, 0); jCam.updateProjectionMatrix();
  sloth.rotation.x = 0.05 * Math.sin(t * 0.6); sloth.position.x = 0.02 * Math.sin(t * 0.4);
  const nose = new THREE.Vector3(0.62, -0.57, 0.4).applyMatrix4(sloth.matrixWorld);
  slothBreath.forEach(o => { const a = ((t - SLOTH) * 0.45 + o.ph) % 1; const on = t > SLOTH + 2.4; o.s.material.opacity = on ? 0.35 * Math.sin(a * Math.PI) : 0; o.s.scale.setScalar(0.06 + a * 0.22); o.s.position.copy(nose).add(new THREE.Vector3(0.08 * a, -0.05 * a, 0.25 * a)); });
  sloth.updateMatrixWorld(true);
}
function birdsAt(t) {
  const u = (t - BIRDS) / (LIGHT - BIRDS);
  bCam.position.set(0, 0, 4); bCam.lookAt(0, 0.6, -10); bCam.updateProjectionMatrix();
  birds.forEach(b => { const x = b.x + lerp(-30, 30, u) + 4 * Math.sin(b.ph); b.g.position.set(x, b.y + 0.3 * Math.sin(t * 2 + b.ph), b.z); b.g.rotation.set(0, -Math.PI / 2, 0); const f = 0.7 * Math.sin(t * 9 + b.ph); b.wr.rotation.z = f; b.wl.rotation.z = -f; });
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [3.3, 7.8, '8 billion people.<br>One moment.'],
  [8.3, 11.4, 'All of it together:<br>a cube of gas…'],
  [11.6, 14.8, '…as tall as the<br>Statue of Liberty.'],
  [15.2, 18.0, 'It weighs about<br>1,000 tons.'],
  [18.2, 20.8, "About as heavy as<br>the air it's floating in."],
  [21.3, 24.0, 'But nobody hears<br>one giant boom.'],
  [24.2, 26.8, 'You only hear the ones<br>near you.'],
  [27.3, 30.0, 'Cows? Hold on…'],
  [30.2, 33.8, 'About 95% of their methane<br>comes out the front.'],
  [34.3, 37.2, 'Herring fart to<br>talk to each other.'],
  [37.4, 39.8, 'Really. Scientists won<br>an Ig Nobel for it.'],
  [40.3, 43.6, "Sloths can't fart<br>at all."],
  [43.8, 46.8, 'The gas soaks into their blood,<br>and they breathe it out.'],
  [47.3, 50.8, 'Most birds can’t<br>either.'],
  [51.3, 54.4, 'So… can you light it?'],
  [54.6, 58.3, 'Nope. Spread through the air,<br>it’s less than a trillionth.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < GLOBE) { lab = 'EVERYONE, ON'; val = String(3 - Math.floor(t)); sub = 'ALL AT ONCE'; show = smooth(0.15, 0.5, t); }
  else if (t < NYC) { lab = 'PEOPLE'; val = '8.2 billion'; sub = '≈ 90 ML EACH (MEDIAN)'; }
  else if (t < WEIGH) { const k = ease((t - (NYC + 0.6)) / 4.6); lab = 'TOTAL GAS'; val = (Math.round(26 * k * 10) / 10).toFixed(1) + 'M cu ft'; sub = '≈ 738,000 M³ · A CUBE 297 FT TALL'; }
  else if (t < SOUND) { lab = 'WEIGHT'; val = '≈ 1,000 tons'; sub = 'ROUGHLY AS DENSE AS AIR'; }
  else if (t < COW) { lab = 'LOUDEST SPOT'; val = 'Next to you'; sub = "8 BILLION SOURCES DON'T ADD UP TO ONE BOOM"; }
  else if (t < FISH) { lab = 'COW METHANE'; val = t < 30 ? '…' : '~95%'; sub = t < 30 ? 'WAIT FOR IT' : 'COMES OUT AS BURPS'; }
  else if (t < SLOTH) { lab = 'HERRING'; val = 'FRT'; sub = '"FAST REPETITIVE TICK"'; }
  else if (t < BIRDS) { lab = 'SLOTH FARTS'; val = '0'; sub = 'THEY BREATHE IT OUT INSTEAD'; }
  else if (t < LIGHT) { lab = 'MOST BIRDS'; val = '0'; sub = 'FOOD PASSES THROUGH TOO FAST'; }
  else { lab = 'SHARE OF THE AIR'; val = '< 1 ppt'; sub = 'LESS THAN ONE TRILLIONTH'; }
  return { stat, lab, val, sub, show };
}
function proj(v, camera) { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (1 - (p.y * 0.5 + 0.5)) * H, p.z]; }
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(GLOBE - 0.3, GLOBE, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const cuts = [NYC, SOUND, COW, FISH, SLOTH, BIRDS, LIGHT].map(x => fadeWin(t, x - 0.22, x + 0.22, 0.2));
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(...cuts) * 0.9;
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  // height labels in the harbor
  let L = '';
  if (t >= NYC + 4.2 && t < SOUND) {
    const op = smooth(NYC + 4.2, NYC + 5.2, t) * (1 - smooth(SOUND - 0.4, SOUND, t));
    const a = proj(new THREE.Vector3(4, 99, 0), nyCam), b = proj(new THREE.Vector3(GAS_X, CUBE_S + 6, GAS_Z), nyCam);
    if (a[2] < 1) L += `<div class="lbl" style="left:${a[0].toFixed(0)}px;top:${a[1].toFixed(0)}px;opacity:${op}">STATUE OF LIBERTY<br><span class="big">305 ft</span></div>`;
    if (b[2] < 1) L += `<div class="lbl gas" style="left:${b[0].toFixed(0)}px;top:${b[1].toFixed(0)}px;opacity:${op}">ALL THE GAS<br><span class="big">297 ft</span></div>`;
  }
  el.labels.innerHTML = L;
}

// =================== main ===================
window.renderAt = (t) => {
  if (window.PASS !== 'text' || (t >= NYC && t < SOUND)) { if (t >= NYC && t < SOUND) nyAt(t); }
  updateDOM(t);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (t < NYC || (t >= SOUND && t < COW)) { globeAt(t); renderer.render(gScene, gCam); }
  else if (t < SOUND || t >= LIGHT) { nyAt(t); renderer.render(ny, nyCam); }
  else if (t < FISH) { farmAt(t); renderer.render(farm, farmCam); }
  else if (t < SLOTH) { seaAt(t); renderer.render(sea, seaCam); }
  else if (t < BIRDS) { jungleAt(t); renderer.render(jungle, jCam); }
  else { birdsAt(t); renderer.render(birdsS, bCam); }
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe()]).then(() => { window.renderAt(0); return true; });
