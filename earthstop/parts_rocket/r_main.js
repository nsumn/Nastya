function skyHorizon(day, dusk) { const a = new THREE.Color(0.016, 0.024, 0.05).lerp(new THREE.Color(0.62, 0.74, 0.88), day); return a.lerp(new THREE.Color(0.95, 0.52, 0.26), dusk); }

// =================== sun ===================
const SUN_CITY = new THREE.Vector3(0.45, 0.6, -0.66).normalize();
const SUN_SKY = SUN_CITY.clone().applyQuaternion(Q_CITY2SKY);

// =================== roulette ===================
const ROUL = [['Sphere', 0], ['Cube', 0.3], ['Rocket', 0.55], ['Pyramid', 0.85], ['Heart', 1.12], ['Donut', 1.38], ['Pizza', 1.62], ['Star', 1.86], ['Diamond', 2.1], ['Cube', 2.38], ['Heart', 2.68], ['Tsunami', TSU], ['Rocket', LAND]];
const shapeLabel = { Sphere: 'Sphere', Cube: 'Cube', Rocket: 'Rocket?', Pyramid: 'Pyramid', Heart: 'Heart', Donut: 'Donut', Pizza: 'Pizza slice', Star: 'Star', Diamond: 'Diamond', Tsunami: 'Tsunami' };
function rouletteAt(t) { let cur = ROUL[0]; ROUL.forEach(r => { if (t >= r[1]) cur = r; }); return { name: cur[0], since: t - cur[1] }; }

// =================== cameras ===================
const CITY_PT = new THREE.Vector3(CITY_R, CITY_Y, 0);
function spaceCamera(t) {
  let pos, look = new THREE.Vector3(0, 0, 0), fov = 36;
  if (t < ROUL_END) { pos = new THREE.Vector3(0, 3.5, 56); look = new THREE.Vector3(0, 1.0, 0); }
  else if (t < OCEANS) { const u = (t - ROUL_END) / (OCEANS - ROUL_END); const k = ease(clamp(u * 1.6, 0, 1)); pos = new THREE.Vector3(lerp(0, 4, k), lerp(3.5, 2.0, k), lerp(56, 40, k)); look = new THREE.Vector3(0, lerp(1.0, 0.2, k), 0); fov = 36; }
  else if (t < SPACE_END) { const u = ease((t - OCEANS) / 1.8); pos = new THREE.Vector3(4, 2.0, 40).lerp(new THREE.Vector3(18, 0.2, 21), u); look = new THREE.Vector3(0, 0.2, 0).lerp(new THREE.Vector3(0.6, -2.8, 0), u); fov = lerp(36, 40, u); }
  else if (t < DIVE_END) {
    const u = ease((t - SPACE_END) / (DIVE_END - SPACE_END));
    const p0 = new THREE.Vector3(18, 0.2, 21), p1 = new THREE.Vector3(6.5, -2.0, 4.2), p2 = CITY_PT.clone().add(new THREE.Vector3(0.35, 0.05, 0.25));
    pos = u < 0.5 ? p0.clone().lerp(p1, ease(u / 0.5)) : p1.clone().lerp(p2, ease((u - 0.5) / 0.5));
    look = new THREE.Vector3(0.6, -2.8, 0).lerp(CITY_PT.clone().add(new THREE.Vector3(0.05, 1.5, 0)), smooth(0.35, 1, u)); fov = lerp(40, 58, smooth(0.5, 1, u));
  }
  else if (t < FALL) { const u = (t - CRACK) / (FALL - CRACK); pos = new THREE.Vector3(lerp(10, 7, u), 1.0, lerp(38, 36, u)); look = new THREE.Vector3(0, 0.0, 0); fov = 38; }
  else if (t < ROUND) { const u = (t - FALL) / (ROUND - FALL); pos = new THREE.Vector3(lerp(7, 4, u), lerp(1.0, -0.4, u), lerp(36, 28, ease(u))); look = new THREE.Vector3(0, lerp(0, RCOM.y, ease(u)), 0); fov = 38; }
  else { const u = (t - ROUND) / (T_END - ROUND); pos = new THREE.Vector3(lerp(4, 2, u), -0.4, lerp(28, 24, u)); look = RCOM.clone(); fov = 38; }
  let sh = 0; if (t > CRACK + 1.5 && t < ROUND) sh = 0.04 + 0.12 * smooth(FALL, FALL + 2.5, t) * (1 - smooth(ROUND - 1.5, ROUND, t));
  const s = new THREE.Vector3(Math.sin(t * 41) + Math.sin(t * 23), Math.sin(t * 37 + 1), Math.sin(t * 29 + 2)).multiplyScalar(sh);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos).add(s); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(look.clone().add(s.multiplyScalar(0.3)));
}
const TILT_MAX = 18 * Math.PI / 180;
function tiltAngle(t) { return TILT_MAX * ease((t - TILT - 0.6) / 2.0); }
function cityCamera(t) {
  let pos, look, fov = 62, up = new THREE.Vector3(0, 1, 0);
  if (t < BACK) { const u = t - DIVE_END; pos = new THREE.Vector3(2 + u * 1.4, 6.5, -0.5); look = new THREE.Vector3(pos.x + 100, lerp(30, 14, smooth(DIVE_END, DIVE_END + 2.5, t)), 0); fov = 64; }
  else if (t < UP) {   // turn around: the lobe behind the city
    const u = t - BACK; const k = ease(u / 1.8); const yaw = Math.PI * k;
    pos = new THREE.Vector3(2 + (BACK - DIVE_END) * 1.4 + u * 0.3, 6.5 + 1.5 * k, -0.5);
    look = pos.clone().add(new THREE.Vector3(Math.cos(yaw) * 100, lerp(14, 52, ease((u - 0.6) / 2.6)), Math.sin(yaw) * 100)); fov = lerp(64, 76, k);
  }
  else if (t < TILT) { // crane up, looking up the street toward the tip
    const u = (t - UP) / (TILT - UP); const k = ease(clamp(u * 1.5, 0, 1));
    pos = new THREE.Vector3(14 + u * 6, lerp(8, 70, k), -0.5); look = new THREE.Vector3(pos.x + 100, pos.y + lerp(10, -2, k), 0); fov = lerp(62, 54, k);
  }
  else { const u = t - TILT; const a = tiltAngle(t); pos = new THREE.Vector3(48 + u * 0.4, 3.0, -4.5); look = new THREE.Vector3(48 + u * 0.4, 3.0, 12); up = new THREE.Vector3(Math.sin(a), Math.cos(a), 0); fov = 66; }
  let sh = 0; if (t > CRACK - 2.5 && t < CRACK) sh = 0.03 + 0.06 * smooth(CRACK - 2.5, CRACK, t);
  const s = new THREE.Vector3(Math.sin(t * 43) + Math.sin(t * 21), Math.sin(t * 37 + 1), 0).multiplyScalar(sh);
  cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos).add(s); cam.up.copy(up); cam.lookAt(look.clone().add(s));
}

// =================== update: space ===================
function updateSpace(t) {
  for (const k in shapes) shapes[k].visible = false;
  let g;
  if (t < ROUL_END) {
    const r = rouletteAt(t); g = shapes[r.name]; g.visible = true;
    let popS = 1 + 0.22 * Math.exp(-r.since * 16) * Math.cos(r.since * 30) - 0.12 * Math.exp(-r.since * 30);
    let ang;
    if (t < TSU) ang = t * 4.4; else if (t < LAND) ang = TSU * 4.4 + (1 - Math.exp(-(t - TSU) * 3)) * 1.1; else ang = TSU * 4.4 + 1.05 + (t - LAND) * 0.35 + 0.4 * (1 - Math.exp(-(t - LAND) * 6));
    if (r.name === 'Tsunami') { const w = Math.sin((t - TSU) * 9) * Math.exp(-(t - TSU) * 2.2); g.rotation.set(0.12 + w * 0.06, -0.3 + w * 0.15, 0.04 * w); popS = 0.8 * (1 + 0.18 * Math.exp(-r.since * 10) * Math.cos(r.since * 20)); }
    else if (r.name === 'Rocket' && t >= LAND) { g.rotation.set(0.12, ang * 0.25, -0.12 + 0.05 * Math.sin(r.since * 3)); popS = 0.95 * (1 + 0.22 * Math.exp(-r.since * 6) * Math.cos(r.since * 14)); }
    else if (r.name === 'Donut') g.rotation.set(0.55, 0.35, ang); else g.rotation.set(0.35 + 0.2 * Math.sin(t * 1.3), ang, r.name === 'Rocket' ? -0.25 : 0.15);
    g.scale.setScalar(popS); g.position.set(0, r.name === 'Rocket' ? 0.6 : 1.0, 0);
  } else {
    g = rocketG; g.visible = true; g.position.set(0, 0, 0); g.scale.setScalar(lerp(0.95, 1, smooth(ROUL_END, ROUL_END + 0.6, t)));
    const yaw = t < OCEANS ? lerp(-1.6, 0, ease((t - ROUL_END) / (OCEANS - ROUL_END))) : 0;
    const tz = t < OCEANS ? lerp(-0.12, 0, smooth(ROUL_END, OCEANS, t)) : 0;
    g.rotation.set(t < OCEANS ? lerp(0.12, 0, smooth(ROUL_END, OCEANS, t)) : 0, yaw, tz);
  }
  for (const k in shapes) { const s = shapes[k]; if (!s.visible) continue; const mat = s.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; if (s.userData.sh) s.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
  // oceans drain into the ring, air follows
  const dry = smooth(OCEANS + 0.3, OCEANS + 3.0, t), air = smooth(OCEANS + 3.0, OCEANS + 4.6, t);
  rocketMat.uniforms.uLand.value = lerp(0.0, 0.34, dry); rocketMat.uniforms.uClouds.value = lerp(0.8, 0.15, air);
  seaRing.material.opacity = dry; seaRing.visible = dry > 0.01;
  rocketShell.material.uniforms.uA.value = 1 - air * 0.85; airBand.material.uniforms.uA.value = air * (t < FALL ? 1 : 1 - smooth(FALL, FALL + 2, t));
  rocketMat.uniforms.uAmb.value = 0.03 + 0.4 * smooth(SPACE_END + 1.2, DIVE_END - 0.4, t) * (t < DIVE_END ? 1 : 0);
  // goes soft: droop, then slump into a ball
  const droop = 1.25 * ease((t - (CRACK + 2.2)) / 4.5) * (1 - smooth(FALL + 1.0, FALL + 3.5, t) * 0.0);
  const slump = ease((t - FALL) / 5.2);
  if (t >= CRACK) morphRocket(droop, slump); else morphRocket(0, 0);
  rocketMat.uniforms.uHeat.value = 0.6 * smooth(CRACK + 1.0, FALL + 1.5, t) * (1 - 0.65 * smooth(ROUND, T_END, t));
  seaRing.visible = seaRing.visible && t < CRACK + 2.2; airBand.visible = t < FALL + 2;
}
// =================== update: city ===================
function updateCity(t) {
  for (const mat of [domeMat, skyPlanetMat, skySeaMat]) { mat.uniforms.uSunS.value.copy(SUN_SKY); mat.uniforms.uDay.value = 1; mat.uniforms.uDusk.value = 0; }
  skyPlanetMat.uniforms.uSun.value.copy(SUN_SKY); skyPlanetMat.uniforms.uCam.value.copy(SKY_POS); skyPlanetMat.uniforms.uUp.value.copy(SKY_UP); skySeaMat.uniforms.uSun.value.copy(SUN_SKY);
  skyPlanetMat.uniforms.uSkyK.value = 0.04; skyPlanetMat.uniforms.uSkyS.value = 0.11; skyPlanetMat.uniforms.uCloudT.value = t * 0.002;
  const dark = smooth(CRACK - 2.5, CRACK, t) * 0.25; domeMat.uniforms.uDark.value = dark;
  sunL.position.copy(cam.position).addScaledVector(SUN_CITY, 300); sunL.target.position.copy(cam.position).add(new THREE.Vector3(30, 0, 0)); sunL.target.updateMatrixWorld();
  sunL.intensity = 3.0; hemi.intensity = 1.0;
  city.fog.color.copy(skyHorizon(1, 0)); city.fog.near = 200; city.fog.far = 3000;
  for (const m of winMats) m.emissiveIntensity = 0.15;
  for (const m of lampHeads) m.emissiveIntensity = 0;
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); p.g.rotation.z = 0.12 * smooth(TILT + 0.6, TILT + 2.6, t); });
  // gravity tilts 18° toward the base (= -x in the city): cars roll back down the street
  const slide = (t0, a) => t > t0 ? 0.5 * a * (t - t0) * (t - t0) : 0;
  for (const c of cars) {
    if (c.cross) continue;
    const tt = Math.min(t, TILT + 0.8); let x = wrapR(c.x0 + c.dir * c.speed * tt, -220, 760);
    const t0 = TILT + 0.8 + (c.x0 % 1 + 1) % 1 * 0.8; const d = slide(t0, 2.3); x -= d;
    c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0);
    c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 7;
  }
  const lean = smooth(TILT + 0.6, TILT + 2.6, t) * 0.3;
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const gy = Math.abs(z) > 7 ? 0.18 : 0;
    o.position.set(x, gy + 0.95, z); o.rotation.order = 'ZYX'; o.rotation.set(0, ry, -lean);     // stay square to the ground: lean on screen
    if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph);
    o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 2.5;
  }
  ball.visible = false;
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'titleEnd', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [5.2, 7.9, "Of course it's a rocket."],
  [8.1, 10.8, 'Same mass as Earth.<br>15,000 miles long.'],
  [11.2, 14.0, 'Every ocean drains into<br>a ring around the base.'],
  [14.3, 16.9, 'The air pools there too.<br>The rest is bare rock.'],
  [17.3, 20.5, 'So everyone lives<br>on the coast down there.'],
  [21.0, 25.6, 'Gravity is about 3/4<br>of Earth\'s. Not bad.'],
  [26.1, 30.6, 'Behind the city: a mountain<br>over 2,000 miles tall.'],
  [31.1, 35.6, 'Up the street, the shaft runs<br>10,000 miles to the tip.'],
  [36.1, 38.9, "But \"down\" tilts<br>toward the base…"],
  [39.1, 41.8, '…so flat streets feel<br>like an 18° hill.'],
  [42.3, 45.6, 'And no rock can hold up<br>a 15,000-mile shaft.'],
  [45.9, 48.8, 'Gravity pulls anything<br>this big into a ball.'],
  [49.3, 52.6, 'It would go soft in<br>under half an hour.'],
  [53.0, 56.3, 'Everything slumps back<br>into a sphere.'],
  [56.6, 60.3, "That's why every planet<br>is round."],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '';
  if (t < ROUL_END) { const r = rouletteAt(t); lab = "EARTH'S SHAPE"; val = shapeLabel[r.name]; sub = t < TSU ? 'SPINNING THE WHEEL…' : (t < LAND ? 'SLOWING DOWN…' : 'OF COURSE.'); }
  else if (t < OCEANS) { lab = 'LENGTH'; val = '15,200 mi'; sub = 'THE SHAFT IS WIDER THAN THE MOON'; }
  else if (t < SPACE_END) { lab = 'ALL OCEANS'; val = 'One ring'; sub = 'AROUND THE BASE'; }
  else if (t < BACK) { lab = 'GRAVITY'; val = '0.77 G'; sub = 'YOU LIVE ON THE COAST'; }
  else if (t < UP) { lab = 'MOUNTAIN'; val = '2,300 mi'; sub = 'MOUNT EVEREST · 5.5 MI'; }
  else if (t < TILT) { lab = 'TO THE TIP'; val = '10,000 mi'; sub = 'NO AIR UP THERE'; }
  else if (t < CRACK) { lab = 'GRAVITY TILT'; val = Math.round(18 * ease((t - TILT - 0.6) / 2.0)) + '°'; sub = 'TOWARD THE BASE'; }
  else if (t < FALL) { lab = 'SHAFT'; val = '15,200 mi'; sub = "ROCK CAN'T HOLD THIS UP"; }
  else if (t < ROUND) { stat = '<b></b>TIME-LAPSE'; lab = 'GOES SOFT IN'; val = '< 30 min'; sub = 'GRAVITY ALWAYS WINS'; }
  else { lab = "EARTH'S SHAPE"; val = 'Sphere'; sub = 'OF COURSE.'; }
  return { stat, lab, val, sub };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(ROUL_END, ROUL_END + 0.3, t);
  el.titleEnd.style.opacity = 1; const landed = t >= LAND; el.titleEnd.textContent = landed ? 'a rocket?' : '…?'; el.titleEnd.style.color = landed ? '' : '#ffffff';
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = 1 - smooth(T_END, T_END + 0.4, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const f1 = smooth(DIVE_END - 1.0, DIVE_END - 0.1, t) * (1 - smooth(DIVE_END, DIVE_END + 0.55, t));
  const f2 = fadeWin(t, CRACK - 0.3, CRACK + 0.3, 0.3);
  el.veil.style.background = t < 30 ? '#eef3f8' : '#05070c';
  el.veil.style.opacity = Math.max(f1 * 0.97, f2);
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  if (window.PASS === 'text') return true;
  const inSpace = t < DIVE_END || t >= CRACK;
  renderer.setRenderTarget(null); renderer.clear();
  if (inSpace) { spaceCamera(t); updateSpace(t); renderer.render(space, spaceCam); }
  else {
    cityCamera(t); updateCity(t);
    skyCam.fov = cam.fov; skyCam.aspect = cam.aspect; skyCam.updateProjectionMatrix();
    skyCam.position.copy(SKY_POS); skyCam.quaternion.copy(Q_CITY2SKY).multiply(cam.quaternion);
    dome.position.copy(SKY_POS);
    renderer.render(sky, skyCam); renderer.clearDepth(); renderer.render(city, cam);
  }
  return true;
};
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
