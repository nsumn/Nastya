// =================== roulette ===================
const ROUL = [['Sphere', 0], ['Cube', 0.3], ['Rocket', 0.55], ['Donut', 0.85], ['Tsunami', 1.15], ['RocketHead', 1.45], ['Pizza', 1.8], ['Heart', 2.1], ['Star', 2.4], ['Diamond', 2.7], ['Fork', FORK], ['Spoon', LAND]];
const shapeLabel = { Sphere: 'Sphere', Cube: 'Cube', Rocket: 'Rocket', Donut: 'Donut', Tsunami: 'Tsunami', RocketHead: 'Rocket:', Pizza: 'Pizza slice', Heart: 'Heart', Star: 'Star', Diamond: 'Diamond', Fork: 'Fork', Spoon: 'Spoon' };
function rouletteAt(t) { let cur = ROUL[0]; ROUL.forEach(r => { if (t >= r[1]) cur = r; }); return { name: cur[0], since: t - cur[1] }; }
const Q_BASE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
const heroQ = (yaw, pitch) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0)).multiply(Q_BASE);   // handle up, bowl facing the camera

// =================== space: update + camera ===================
function updateSpace(t) {
  for (const k in shapes) shapes[k].visible = false; scaleEarth.visible = false; ballSphere.visible = false;
  let g;
  if (t < ROUL_END) {
    const r = rouletteAt(t); g = shapes[r.name]; g.visible = true;
    let popS = 1 + 0.22 * Math.exp(-r.since * 16) * Math.cos(r.since * 30) - 0.12 * Math.exp(-r.since * 30);
    let ang; if (t < FORK) ang = t * 4.4; else if (t < LAND) ang = FORK * 4.4 + (1 - Math.exp(-(t - FORK) * 3)) * 1.1; else ang = 0;
    g.quaternion.identity();
    if (r.name === 'Fork') { const w = Math.sin((t - FORK) * 9) * Math.exp(-(t - FORK) * 2.2); g.quaternion.copy(heroQ(0.25 + w * 0.15 + (t - FORK) * 0.2, -0.3)); popS = 0.9 * (1 + 0.15 * Math.exp(-r.since * 10) * Math.cos(r.since * 20)); g.position.set(0, 0.8, 0); }
    else if (r.name === 'Spoon') { g.quaternion.copy(heroQ(0.25 - 0.4 * Math.exp(-r.since * 5) + r.since * 0.08, -0.3)); popS = 0.9 * (1 + 0.2 * Math.exp(-r.since * 6) * Math.cos(r.since * 14)); g.position.set(0, 0.8, 0); }
    else if (r.name === 'Tsunami') { popS = 0.62; g.rotation.set(0.06, ang * 0.3, 0); g.position.set(-0.4, -1.2, 0); }
    else { if (r.name === 'Donut') g.rotation.set(0.55, 0.35, ang); else g.rotation.set(0.35 + 0.2 * Math.sin(t * 1.3), ang, r.name.startsWith('Rocket') ? -0.25 : 0.15); g.position.set(0, 1.0, 0); }
    g.scale.setScalar(popS);
  } else {
    const coll = t >= T_COLL;
    if (t < T_BALL + 0.15) { g = spoonG; g.visible = true; g.scale.setScalar(0.9); g.position.set(0, 0.8, 0);
      const yaw = t < T_SEA ? 0.25 + (t - LAND) * 0.08 : t < T_HANDLE ? 0.25 + (T_SEA - LAND) * 0.08 : 0.55 + (t - T_COLL) * 0.03; g.quaternion.copy(heroQ(yaw, -0.3)); }
    scaleEarth.visible = t >= T_SIZE + 0.6 && t < T_SEA + 0.2; scaleEarth.position.set(-2.6, -3.4, 0.6); scaleEarth.rotation.y = t * 0.2;
    if (coll) { const k = smooth(T_COLL + 0.6, T_BALL - 0.3, t); collapseSpoon(k); spoonMat.uniforms.uHeat.value = smooth(T_COLL + 1.0, T_COLL + 3.0, t) * 0.8;
      if (t >= T_BALL) { ballSphere.visible = true; ballSphere.position.copy(spoonG.localToWorld(COM_S.clone())); ballSphere.scale.setScalar(0.9 * (1 + 0.05 * Math.exp(-(t - T_BALL) * 3) * Math.cos((t - T_BALL) * 12))); ballSphere.userData.mat.uniforms.uHeat.value = 0.8 * Math.exp(-(t - T_BALL) * 0.8); }
      if (t >= T_BALL + 0.15) spoonG.visible = false; }
    else if (t < T_COLL && spoonMat.uniforms.uHeat.value !== 0) { spoonMat.uniforms.uHeat.value = 0; collapseSpoon(0); }
    airHalo.visible = !coll || t < T_COLL + 1.5; airHalo.material.uniforms.uA.value = coll ? 1 - smooth(T_COLL + 0.5, T_COLL + 1.5, t) : 1;
  }
  deb.visible = t > T_COLL && t < T_BALL + 0.5; if (deb.visible) { updateDebris(t); deb.position.copy(spoonG.position); deb.quaternion.copy(spoonG.quaternion); deb.scale.copy(spoonG.scale); }
}
function spaceUniforms(t) {
  spoonMat.uniforms.uCam.value.copy(spaceCam.position); spoonMat.uniforms.uSun.value.copy(SUN_SPACE); spoonMat.uniforms.uT.value = t;
  for (const s of [...Object.values(shapes), scaleEarth, ballSphere]) { if (!s.visible || !s.userData.mat) continue; const mat = s.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; if (s.userData.sh) s.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
}
function spaceCamera(t) {
  let pos, look = new THREE.Vector3(0, 0.8, 0), fov = 36;
  if (t < ROUL_END) { pos = new THREE.Vector3(0, 3.5, 56); look = new THREE.Vector3(0, 1.0, 0); }
  else if (t < T_SEA) { const u = (t - T_SIZE) / (T_SEA - T_SIZE); const dz = lerp(56, 31, ease((t - T_SIZE) / 2.2)) - u * 2; pos = new THREE.Vector3(lerp(0, 1.5, u), lerp(3.5, 4.5, u), dz); look = new THREE.Vector3(0.2, lerp(1.0, 1.8, ease((t - T_SIZE) / 2.2)), 0); }
  else if (t < T_HANDLE) {
    const u = ease((t - T_SEA) / (T_HANDLE - T_SEA - 0.8)); const bb = spoonG.localToWorld(BOWL_BOTTOM.clone());
    const far = new THREE.Vector3(1.5, 4.5, 29), near = bb.clone().add(new THREE.Vector3(1.2, 3.2, 6.5));
    pos = far.clone().lerp(near, u); look = new THREE.Vector3(0.2, 1.8, 0).lerp(bb, u); fov = lerp(36, 44, u);
  } else if (t < T_COLL) {    // T_HANDLE..T_TILT: glide along the handle toward the bowl
    const u = (t - T_HANDLE) / (T_TILT - T_HANDLE); const tip = spoonG.localToWorld(toScene(SP.X1 + 1.0, 0, handleZ(SP.X1) + 3.2)); const mid = spoonG.localToWorld(toScene(SP.X1 - 4.0, 0, handleZ(SP.X1) + 2.6));
    pos = tip.clone().lerp(mid, ease(u)); look = spoonG.localToWorld(toScene(1.0, 0, 0.3)); fov = 46;
  } else { const u = (t - T_COLL) / (T_END - T_COLL); pos = new THREE.Vector3(lerp(2.5, 1, u), lerp(4.5, 2.5, u), lerp(28, 20, u)); look = new THREE.Vector3(0.6, lerp(1.4, 0.2, smooth(T_COLL + 2, T_BALL, t)), 0); fov = 36; }
  let sh = 0; if (t > T_COLL + 1 && t < T_BALL + 0.4) sh = 0.05 + 0.1 * smooth(T_COLL + 3, T_BALL - 0.5, t);
  const s = new THREE.Vector3(Math.sin(t * 41) + Math.sin(t * 23), Math.sin(t * 37 + 1), Math.sin(t * 29 + 2)).multiplyScalar(sh);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos).add(s); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(look.clone().add(s.multiplyScalar(0.3)));
}
// =================== ground shots ===================
const TILT0 = 27, TILT1 = 59;
const tiltDeg = t => lerp(TILT0, TILT1, ease((t - T_TILT - 1.5) / 4.5));
function updateBare(t) {
  const walk = t < T_SUIT; groundMat.uniforms.uBrown.value = walk ? 1 : 0; slope.userData.rocks.material.color.set(walk ? '#6b5a4a' : '#5a5a5c');
  const sunDir = walk ? new THREE.Vector3(-0.5, 0.75, 0.45).normalize() : new THREE.Vector3(-0.8, 0.22, 0.55).normalize();
  groundMat.uniforms.uSun.value.copy(sunDir);
  if (walk) {
    const a = tiltDeg(t) * Math.PI / 180; slope.rotation.set(0, 0, a);
    const sAlong = (t - T_TILT) * 0.75; const p = new THREE.Vector3(Math.cos(a) * sAlong, Math.sin(a) * sAlong, 0);
    astro.outer.position.copy(p).add(new THREE.Vector3(-Math.sin(a) * 0.95, Math.cos(a) * 0.95, 0)); astro.outer.position.y = p.y + 0.95 / Math.cos(a) * Math.cos(a) + 0.02; astro.outer.position.x = p.x;
    astro.outer.rotation.set(0, Math.PI / 2, 0); astro.outer.rotateX(0.12 + 0.25 * (a / (TILT1 * Math.PI / 180)));
    poseWalk(astro, t * 4.2, 0.9 + 0.3 * a);
    bareCam.fov = 50; const ap = astro.outer.position; bareCam.position.copy(ap).add(new THREE.Vector3(-0.8, 0.9, 6.0)); bareCam.up.set(0, 1, 0); bareCam.lookAt(ap.clone().add(new THREE.Vector3(0.4, 0.1, 0)));
  } else {
    slope.rotation.set(0, 0, 0); const u = t - T_SUIT;
    const gH = 0.24 * 9.81, v0 = Math.sqrt(2 * 9.81 * 0.5), air = 2 * v0 / gH;      // a 0.5 m hop on Earth -> 2.1 m here, 2.7 s in the air
    const jt = (u - 1.6) % (air + 0.9); const y = u > 1.6 && jt < air ? v0 * jt - 0.5 * gH * jt * jt : 0;
    astro.outer.position.set(u * 0.5, 0.95 + y + 0.4, 0); astro.outer.rotation.set(0, Math.PI / 2 + 0.4, 0);
    if (y > 0) poseFlail(astro, t * 0.4, 1); else poseIdle(astro, t, 0);
    bareCam.fov = 52; bareCam.position.set(u * 0.5 - 2.5, 1.0, 7.5); bareCam.up.set(0, 1, 0); bareCam.lookAt(u * 0.5 + 0.5, 2.2, 0);
  }
  bareCam.updateProjectionMatrix(); bareSun.position.copy(astro.outer.position).addScaledVector(sunDir, 100); bareSun.target.position.copy(astro.outer.position); bareSun.target.updateMatrixWorld();
  sunDisc.position.copy(bareCam.position).addScaledVector(sunDir, 8000);
}
function beachCamera(t) {
  const u = (t - T_BEACH) / (T_SUIT - T_BEACH);
  const x = lerp(-9, -8, u), z = lerp(-14, -6, u); cam.position.set(x, -SLOPE * x + 2.1, z);
  cam.fov = 64; cam.up.set(0, 1, 0); cam.lookAt(x + lerp(42, 48, u), -SLOPE * x + 2.1 + 9, z + 100); cam.updateProjectionMatrix();
  bowlCam.fov = cam.fov; bowlCam.aspect = cam.aspect; bowlCam.updateProjectionMatrix(); bowlCam.position.copy(SHORE); bowlCam.quaternion.copy(cam.quaternion); bowlDome.position.copy(SHORE);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'titleEnd', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'earthLab'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [5.2, 7.9, 'Same rock as Earth,<br>shaped like a tablespoon.'],
  [8.1, 10.8, '57,000 miles long.<br>Seven Earths, end to end.'],
  [11.2, 13.9, 'The lowest point on the spoon<br>is the bottom of the bowl.'],
  [14.1, 16.8, 'So every ocean drains<br>into one sea.'],
  [17.3, 20.4, 'The air drains<br>there too.'],
  [20.6, 23.7, 'The handle has<br>no air at all.'],
  [24.3, 27.4, 'Walk toward the rim…'],
  [27.6, 30.7, '…and the ground tilts<br>like a ski slope.'],
  [31.3, 34.0, '8 billion people.<br>One beach.'],
  [34.2, 36.9, 'About 590 people<br>per meter.'],
  [37.1, 39.8, 'And you weigh 1/7<br>of normal.'],
  [40.3, 43.8, "Out on the handle<br>you'd weigh a quarter…"],
  [44.0, 47.7, "…but there's nothing<br>to breathe."],
  [48.3, 51.6, 'No rock can hold<br>this shape.'],
  [51.8, 55.7, 'The handle folds in.<br>The tip lands in about 6 hours.'],
  [56.2, 60.8, 'Earth is a ball again…<br>with one very crowded beach.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '';
  if (t < ROUL_END) { const r = rouletteAt(t); lab = "EARTH'S SHAPE"; val = shapeLabel[r.name]; sub = t < FORK ? 'SPINNING THE WHEEL…' : (t < LAND ? 'NOT QUITE…' : 'THERE IT IS.'); }
  else if (t < T_SEA) { lab = 'LENGTH'; val = '57,400 mi'; sub = '7 EARTHS END TO END · 741 MI THICK'; }
  else if (t < T_HANDLE) { stat = '<b></b>MODEL'; lab = 'SEA DEPTH'; val = '120 mi'; sub = '18× THE MARIANA TRENCH'; }
  else if (t < T_TILT) { stat = '<b></b>MODEL'; lab = 'AIR ON THE HANDLE'; val = '0'; sub = 'IT ALL POOLS IN THE BOWL'; }
  else if (t < T_BEACH) { stat = '<b></b>MODEL'; lab = 'GRAVITY TILT'; val = Math.round(tiltDeg(t)) + '°'; sub = 'WALKING UP THE BOWL'; }
  else if (t < 37.0) { stat = '<b></b>MODEL'; lab = 'PEOPLE PER METER'; val = '590'; sub = '8 BILLION · ONE SHORELINE'; }
  else if (t < T_SUIT) { stat = '<b></b>MODEL'; lab = 'YOUR WEIGHT'; val = '14%'; sub = 'ON THE ONLY BEACH'; }
  else if (t < T_COLL) { stat = '<b></b>MODEL'; lab = 'ON THE HANDLE'; val = '0.24 G'; sub = 'A 1.6 FT HOP ON EARTH = 6.8 FT HERE'; }
  else if (t < T_BALL) { stat = '<b></b>MODEL · TIME-LAPSE'; lab = 'COLLAPSE'; val = 'T+ ' + (6.4 * smooth(T_COLL + 0.6, T_BALL - 0.3, t)).toFixed(1) + ' h'; sub = 'HANDLE TIP LANDS AT ≈ 6.4 H'; }
  else { lab = "EARTH'S SHAPE"; val = 'Sphere'; sub = 'AGAIN.'; }
  return { stat, lab, val, sub };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(ROUL_END, ROUL_END + 0.3, t);
  el.titleEnd.style.opacity = smooth(LAND + 0.02, LAND + 0.18, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = 1 - smooth(T_END, T_END + 0.4, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  el.veil.style.background = '#03050a'; el.veil.style.opacity = Math.max(...[T_TILT, T_BEACH, T_SUIT, T_COLL].map(x => fadeWin(t, x - 0.2, x + 0.2, 0.2)));
  el.flash.style.opacity = t >= T_BALL ? Math.exp(-(t - T_BALL) * 2.4) * 0.9 : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  const eA = fadeWin(t, T_SIZE + 1.0, T_SEA, 0.4);
  if (eA > 0) { spaceCam.updateMatrixWorld(); const p = scaleEarth.position.clone().add(new THREE.Vector3(0, -earthR * 1.25, 0)).project(spaceCam); el.earthLab.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.earthLab.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px'; }
  el.earthLab.style.opacity = eA;
}

// =================== main ===================
window.renderAt = (t) => {
  const shot = t < T_TILT ? 'space' : t < T_BEACH ? 'bare' : t < T_SUIT ? 'beach' : t < T_COLL ? 'bare' : 'space';
  if (shot === 'space') { updateSpace(t); spaceCamera(t); spaceUniforms(t); }
  updateDOM(t);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (shot === 'space') renderer.render(space, spaceCam);
  else if (shot === 'bare') { updateBare(t); renderer.render(bare, bareCam); }
  else { beachCamera(t); updateBeach(t); renderer.render(bowlSky, bowlCam); renderer.clearDepth(); renderer.render(beach, cam); }
  return true;
};
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
