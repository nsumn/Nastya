function skyHorizon(day, dusk) { const a = new THREE.Color(0.016, 0.024, 0.05).lerp(new THREE.Color(0.62, 0.74, 0.88), day); return a.lerp(new THREE.Color(0.95, 0.52, 0.26), dusk); }

// =================== sun ===================
const SUN_CITY = new THREE.Vector3(0.45, 0.6, -0.66).normalize();
const sunSky = () => SUN_CITY.clone().applyQuaternion(Q_CITY2SKY);

// =================== roulette ===================
const ROUL = [['Sphere', 0], ['Cube', 0.3], ['Donut', 0.6], ['Pyramid', 0.9], ['Heart', 1.2], ['Pizza', 1.5], ['Star', 1.8], ['Diamond', 2.1], ['Cube', 2.4], ['Heart', 2.7], ['Tsunami', TSU], ['Spoon', LAND]];
const shapeLabel = { Sphere: 'Sphere', Cube: 'Cube', Pyramid: 'Pyramid', Heart: 'Heart', Donut: 'Donut', Pizza: 'Pizza slice', Star: 'Star', Diamond: 'Diamond', Tsunami: 'Tsunami', Spoon: 'Spoon' };
function rouletteAt(t) { let cur = ROUL[0]; ROUL.forEach(r => { if (t >= r[1]) cur = r; }); return { name: cur[0], since: t - cur[1] }; }

// spoon pose in space: tilt the bowl toward the camera, handle up to the right
function poseSpoon(t) {
  spoonPivot.rotation.order = 'ZYX';
  let tilt = 0.95, yaw = 0, roll = 0.62, sc = t < ROUL_END ? 0.9 : lerp(0.9, 1.0, smooth(ROUL_END, ROUL_END + 1.5, t));
  if (t < ROUL_END) { const k = t - LAND; yaw = -0.6 * Math.exp(-k * 4) + k * 0.06; }
  else if (t < SPACE_END) { yaw = (ROUL_END - LAND) * 0.06 + (t - ROUL_END) * 0.035; }
  else if (t < CRACK) { yaw = (ROUL_END - LAND) * 0.06 + (SPACE_END - ROUL_END) * 0.035; }
  else { yaw = 0.48 + (t - CRACK) * 0.02; }
  spoonPivot.rotation.set(tilt, yaw, roll); spoonPivot.scale.setScalar(sc); spoonPivot.position.set(1.3, 1.0, 0);
  spoonPivot.updateMatrixWorld(true);
}
const W_ = (x, y, z) => spoonG.localToWorld(new THREE.Vector3(x, y, z));     // spoonG local (scene-ordered) -> world

// =================== cameras ===================
function spaceCamera(t) {
  let pos, look = new THREE.Vector3(0, 0.6, 0), fov = 36;
  if (t < ROUL_END) { pos = new THREE.Vector3(0, 3.5, 56); look = new THREE.Vector3(0, 1.0, 0); }
  else if (t < OCEANS) { const u = ease((t - ROUL_END) / (OCEANS - ROUL_END)); pos = new THREE.Vector3(lerp(0, 2, u), lerp(3.5, 3.0, u), lerp(56, 47, u)); look = new THREE.Vector3(0, lerp(1.0, 0.6, u), 0); }
  else if (t < SPACE_END) { const u = ease((t - OCEANS) / 3.5); const bowl = W_(0, -1.0, 0); pos = new THREE.Vector3(2, 3.0, 47).lerp(bowl.clone().add(new THREE.Vector3(1.5, 6.5, 17)), u); look = new THREE.Vector3(0, 0.6, 0).lerp(bowl, u); fov = lerp(36, 40, u); }
  else if (t < DIVE_END) {
    const u = ease((t - SPACE_END) / (DIVE_END - SPACE_END)); const bowl = W_(0, -1.0, 0); const shore = W_(SHORE_X, SEA_Z, 0); const up = W_(SHORE_X, SEA_Z + 1, 0).sub(shore).normalize();
    const p0 = bowl.clone().add(new THREE.Vector3(1.5, 6.5, 17)), p1 = shore.clone().addScaledVector(up, 3.2).add(new THREE.Vector3(-1.5, 0, 2.5)), p2 = shore.clone().addScaledVector(up, 0.12);
    pos = u < 0.5 ? p0.clone().lerp(p1, ease(u / 0.5)) : p1.clone().lerp(p2, ease((u - 0.5) / 0.5));
    look = bowl.clone().lerp(W_(SHORE_X + 2.0, SEA_Z + 0.3, 0), smooth(0.35, 1, u)); fov = lerp(40, 58, smooth(0.5, 1, u));
  }
  else if (t < CRACK) {        // TIP: at the handle tip, looking back along the handle to the bowl
    const u = (t - TIP) / (CRACK - TIP); const tip = W_(HX0 + HL * 0.97, handleZ(0.97) + 0.25, 0); const back = W_(HX0 + HL * 0.4, handleZ(0.4), 0);
    const side = W_(HX0 + HL * 0.97, handleZ(0.97), 1.4).sub(W_(HX0 + HL * 0.97, handleZ(0.97), 0));
    pos = tip.clone().add(side.multiplyScalar(lerp(3.2, 4.0, u))).add(new THREE.Vector3(0, lerp(2.6, 3.2, u), 0)).add(tip.clone().sub(back).normalize().multiplyScalar(lerp(5.0, 6.5, u)));
    look = tip.clone().lerp(back, 0.55); fov = 46;
  }
  else if (t < ROUND) { const u = (t - CRACK) / (ROUND - CRACK); pos = new THREE.Vector3(lerp(4, 2.5, u), lerp(3.0, 1.5, u), lerp(50, 38, ease(u))); look = new THREE.Vector3(0, 0.6, 0).lerp(W_(SCOM.x, SCOM.y, SCOM.z), ease(u)); fov = 36; }
  else { const u = (t - ROUND) / (T_END - ROUND); const c = W_(SCOM.x, SCOM.y, SCOM.z); pos = c.clone().add(new THREE.Vector3(lerp(1.5, 1.0, u), lerp(0.8, 0.5, u), lerp(17, 14, u))); look = c; fov = 38; }
  let sh = 0; if (t > CRACK + 1.0 && t < ROUND) sh = 0.04 + 0.12 * smooth(CRACK + 3, CRACK + 5.5, t) * (1 - smooth(ROUND - 1.5, ROUND, t));
  const s = new THREE.Vector3(Math.sin(t * 41) + Math.sin(t * 23), Math.sin(t * 37 + 1), Math.sin(t * 29 + 2)).multiplyScalar(sh);
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos).add(s); spaceCam.up.set(0, 1, 0); spaceCam.lookAt(look.clone().add(s.multiplyScalar(0.3)));
}
const TILT_MAX = 54 * Math.PI / 180;
function tiltAngle(t) { return TILT_MAX * ease((t - TILT - 0.6) / 2.4); }
const BEACH_T = 24.6;
function cityCamera(t) {
  let pos, look, fov = 62, up = new THREE.Vector3(0, 1, 0);
  if (t < BEACH_T) { const u = (t - DIVE_END) / (BEACH_T - DIVE_END); const k = 0.25 * u + 0.75 * ease(u);   // fly down the street to the shore
    pos = new THREE.Vector3(lerp(-20, 200, k), lerp(10, 6, k), lerp(-0.5, -1.5, k)); look = pos.clone().add(new THREE.Vector3(100, lerp(-5, -7, k), lerp(0, -2, k))); fov = 68; }
  else if (t < UP) { const u = (t - BEACH_T) / (UP - BEACH_T); const k = ease(u);      // on the beach: look up at the walls
    pos = new THREE.Vector3(200 + u * 4, lerp(6, 4.5, k), -1.5); look = pos.clone().add(new THREE.Vector3(100, lerp(-7, 40, k), -2)); fov = lerp(68, 66, k); }
  else if (t < TILT) { const u = (t - UP) / (TILT - UP); const k = ease(clamp(u * 1.4, 0, 1)); pos = new THREE.Vector3(204 + u * 4, lerp(4.5, 60, k), -1.5); look = pos.clone().add(new THREE.Vector3(100, lerp(40, 60, k), lerp(-2, -10, k))); fov = lerp(66, 76, k); }
  else { const u = t - TILT; const a = tiltAngle(t); pos = new THREE.Vector3(48 + u * 0.4, 3.0, -4.5); look = new THREE.Vector3(48 + u * 0.4, 3.0, 12); up = new THREE.Vector3(Math.sin(a), Math.cos(a), 0); fov = 70; }
  cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.copy(up); cam.lookAt(look);
}

// =================== update: space ===================
function updateSpace(t) {
  for (const k in shapes) shapes[k].visible = false;
  let g;
  if (t < ROUL_END) {
    const r = rouletteAt(t); g = shapes[r.name]; g.visible = true;
    let popS = 1 + 0.22 * Math.exp(-r.since * 16) * Math.cos(r.since * 30) - 0.12 * Math.exp(-r.since * 30);
    let ang; if (t < TSU) ang = t * 4.4; else ang = TSU * 4.4 + (1 - Math.exp(-(t - TSU) * 3)) * 1.1;
    if (r.name === 'Tsunami') { const w = Math.sin((t - TSU) * 9) * Math.exp(-(t - TSU) * 2.2); g.rotation.set(0.12 + w * 0.06, -0.3 + w * 0.15, 0.04 * w); popS = 0.8 * (1 + 0.18 * Math.exp(-r.since * 10) * Math.cos(r.since * 20)); g.scale.setScalar(popS); g.position.set(0, 1.0, 0); }
    else if (r.name === 'Spoon') { poseSpoon(t); g.scale.multiplyScalar(1 + 0.22 * Math.exp(-r.since * 6) * Math.cos(r.since * 14)); spoonG.visible = true; }
    else { if (r.name === 'Donut') g.rotation.set(0.55, 0.35, ang); else g.rotation.set(0.35 + 0.2 * Math.sin(t * 1.3), ang, 0.15); g.scale.setScalar(popS); g.position.set(0, 1.0, 0); }
  } else { g = spoonPivot; g.visible = true; spoonG.visible = true; poseSpoon(t); }
  updateCameo(t);
  for (const k in shapes) { const s = shapes[k]; if (!s.visible) continue; const mat = s.userData.mat; mat.uniforms.uSun.value.copy(SUN_SPACE); mat.uniforms.uCam.value.copy(spaceCam.position); mat.uniforms.uCloudT.value = t * 0.03; if (s.userData.sh) s.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
  // oceans drain into the bowl, the air follows
  const dry = smooth(OCEANS + 0.3, OCEANS + 3.0, t), air = smooth(OCEANS + 3.0, OCEANS + 4.6, t);
  spoonMat.uniforms.uLand.value = lerp(0.0, 0.34, dry); spoonMat.uniforms.uClouds.value = lerp(0.8, 0.0, air);
  seaDisc.material.opacity = dry; seaDisc.visible = dry > 0.01 && t < CRACK + 3.0;
  spoonShell.material.uniforms.uA.value = 1 - air * 0.9; airDome.material.uniforms.uA.value = air * (1 - smooth(CRACK, CRACK + 2, t)); airDome.visible = air > 0.01 && t < CRACK + 2;
  spoonMat.uniforms.uAmb.value = 0.03 + 0.35 * smooth(SPACE_END + 1.2, DIVE_END - 0.4, t) * (t < DIVE_END ? 1 : 0);
  // melts: the handle bends, then everything slumps into a ball (time-lapse, ~2 h)
  const droop = 1.1 * ease((t - (CRACK + 1.0)) / 4.0);
  const slump = ease((t - (CRACK + 2.5)) / 5.5);
  if (t >= CRACK) morphSpoon(droop, slump); else morphSpoon(0, 0);
  spoonMat.uniforms.uHeat.value = 0.6 * smooth(CRACK + 0.3, CRACK + 2.0, t) * (1 - 0.7 * smooth(ROUND, T_END, t));
  const ballOn = t >= ROUND - 0.4; ballG.visible = ballOn; spoonMesh.visible = !ballOn; spoonShell.visible = !ballOn;
  if (ballOn) { const bm = ballG.userData.mat; bm.uniforms.uSun.value.copy(SUN_SPACE); bm.uniforms.uCam.value.copy(spaceCam.position); bm.uniforms.uHeat.value = 0.6 * (1 - 0.7 * smooth(ROUND, T_END, t)); bm.uniforms.uClouds.value = 0.6 * smooth(ROUND + 1, T_END, t); ballG.userData.sh.material.uniforms.uS.value.copy(SUN_SPACE); }
}
// =================== update: city ===================
function updateCity(t) {
  const fr = t >= TILT ? WALL : SHORE; SKY_POS.copy(fr.pos); SKY_UP.copy(fr.up); Q_CITY2SKY.copy(fr.q);
  const SUN_SKY = sunSky();
  for (const mat of [domeMat, skyPlanetMat, skySeaMat]) { mat.uniforms.uSunS.value.copy(SUN_SKY); mat.uniforms.uDay.value = 1; mat.uniforms.uDusk.value = 0; mat.uniforms.uUp.value.copy(SKY_UP); }
  skyPlanetMat.uniforms.uSun.value.copy(SUN_SKY); skyPlanetMat.uniforms.uCam.value.copy(SKY_POS); skySeaMat.uniforms.uSun.value.copy(SUN_SKY); skySeaMat.uniforms.uCam.value.copy(SKY_POS);
  skyPlanetMat.uniforms.uSkyK.value = 0.04; skyPlanetMat.uniforms.uSkyS.value = 0.11; skyPlanetMat.uniforms.uCloudT.value = t * 0.002;
  domeMat.uniforms.uDark.value = t >= UP && t < TILT ? 0.75 * smooth(UP + 1.0, UP + 4.0, t) : 0;     // thin air high above: the sky goes dark
  sunL.position.copy(cam.position).addScaledVector(SUN_CITY, 300); sunL.target.position.copy(cam.position).add(new THREE.Vector3(30, 0, 0)); sunL.target.updateMatrixWorld();
  sunL.intensity = 3.0; hemi.intensity = 1.0;
  city.fog.color.copy(skyHorizon(1, 0)); city.fog.near = 200; city.fog.far = 3000;
  for (const m of winMats) m.emissiveIntensity = 0.15;
  for (const m of lampHeads) m.emissiveIntensity = 0;
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  const tl = smooth(TILT + 0.6, TILT + 3.0, t);
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); p.g.rotation.z = 0.5 * tl; });
  // "down" tilts 54° toward the sea (= -x in the city): cars and people slide down the street
  const slide = (t0, a) => t > t0 ? 0.5 * a * (t - t0) * (t - t0) : 0;
  for (const c of cars) {
    if (c.cross) continue;
    const tt = t < TILT ? t : Math.min(t, TILT + 0.8); let x = wrapR(c.x0 + c.dir * c.speed * tt, -220, 760);
    if (t >= TILT) { const t0 = TILT + 0.8 + (c.x0 % 1 + 1) % 1 * 0.6; x -= slide(t0, 6.5); }
    let z = c.lane, ry = c.dir > 0 ? 0 : Math.PI;
    if (t < TILT && x > 158) { const ex = x - 158; x = 165 + (c.dir > 0 ? -1.75 : 1.75); z = c.lane + Math.sign(c.lane) * ex; ry = Math.PI / 2 * (c.dir > 0 ? 1 : -1); }   // turn onto the beach road
    c.g.position.set(x, 0, z); c.g.rotation.set(0, ry, 0);
    c.g.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 7;
  }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * Math.min(t, TILT + 0.8), -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * Math.min(t, TILT + 0.8), -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    if (t >= TILT) x -= slide(TILT + 1.2 + P.ph * 0.1, 5.0);
    const gy = Math.abs(z) > 7 ? 0.18 : 0;
    o.position.set(x, gy + 0.95, z); o.rotation.order = 'ZYX'; o.rotation.set(0, ry, -tl * 0.5);
    if (t >= TILT + 1.2) poseFlail(P.p, t, P.ph); else if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph);
    o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 2.5 && !(t < TILT && x > BEACH_X - 1);
  }
  const onShore = t < TILT; beach.visible = onShore; for (const o of beachHide) o.visible = !onShore; if (onShore) waveBeachPeople(t);
  ball.visible = false;
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'titleEnd', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'cameoLab'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [5.2, 7.9, 'A spoon.<br>Why not.'],
  [8.1, 10.8, 'Same mass as Earth.<br>40,000 miles long.'],
  [11.2, 14.0, 'Every ocean drains<br>into the bowl…'],
  [14.3, 16.9, '…one round sea,<br>77 miles deep.'],
  [17.3, 20.6, 'Everyone lives on the shore<br>at the very bottom.'],
  [21.2, 24.4, 'Every street runs<br>down to the beach.'],
  [24.8, 27.8, 'From here, the walls rise<br>2,000 miles on every side.'],
  [28.3, 33.8, 'And past the far rim, the handle<br>runs 23,700 miles into space.'],
  [34.3, 37.6, 'Halfway up the wall,<br>"down" tilts 54°.'],
  [37.8, 40.8, 'Everything slides<br>into the sea.'],
  [41.3, 44.6, 'The handle\'s tip is so far<br>"uphill"…'],
  [44.8, 46.8, "…there's no air at all."],
  [47.3, 50.6, 'But no rock can hold up<br>a 40,000-mile spoon.'],
  [50.8, 54.8, 'Gravity melts it into a ball<br>in a couple of hours.'],
  [55.3, 59.8, "That's why planets are round,<br>not spoon-shaped."],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < ROUL_END) { const r = rouletteAt(t); lab = "EARTH'S SHAPE"; val = shapeLabel[r.name]; sub = t < TSU ? 'SPINNING THE WHEEL…' : (t < LAND ? 'SLOWING DOWN…' : 'OF COURSE.'); }
  else if (t < OCEANS) { lab = 'LENGTH'; val = '40,000 mi'; sub = "LONGER THAN EARTH'S EQUATOR"; }
  else if (t < SPACE_END) { stat = '<b></b>MODEL'; lab = 'ALL OCEANS'; val = '77 mi deep'; sub = "EARTH'S DEEPEST · 6.8 MI"; }
  else if (t < DIVE_END) show = 0;
  else if (t < UP) { stat = '<b></b>MODEL'; lab = 'GRAVITY'; val = '0.33 G'; sub = 'YOU WEIGH A THIRD'; }
  else if (t < TILT) { lab = 'HANDLE'; val = '23,700 mi'; sub = 'NO AIR UP THERE'; }
  else if (t < TIP) { stat = '<b></b>MODEL'; lab = 'GRAVITY TILT'; val = Math.round(54 * ease((t - TILT - 0.6) / 2.4)) + '°'; sub = 'TOWARD THE SEA'; }
  else if (t < CRACK) { stat = '<b></b>MODEL'; lab = 'HANDLE TIP'; val = '0.24 G'; sub = '~3,900 KM "UPHILL"'; }
  else if (t < ROUND) { stat = '<b></b>TIME-LAPSE'; lab = 'MELTS IN'; val = '≈ 2 hours'; sub = 'GRAVITY ALWAYS WINS'; }
  else { lab = "EARTH'S SHAPE"; val = 'Sphere'; sub = 'OF COURSE.'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(ROUL_END, ROUL_END + 0.3, t);
  el.titleEnd.style.opacity = 1; const landed = t >= LAND; el.titleEnd.textContent = landed ? 'a spoon?' : '…?'; el.titleEnd.style.color = landed ? '' : '#ffffff';
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const f1 = smooth(DIVE_END - 1.0, DIVE_END - 0.1, t) * (1 - smooth(DIVE_END, DIVE_END + 0.55, t));
  const f2 = Math.max(fadeWin(t, TIP - 0.3, TIP + 0.3, 0.3), fadeWin(t, TILT - 0.25, TILT + 0.25, 0.25));
  el.veil.style.background = t < 30 ? '#eef3f8' : '#05070c';
  el.veil.style.opacity = Math.max(f1 * 0.97, f2);
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  const cA = fadeWin(t, CAMEO0 + 0.2, CAMEO1 - 0.15, 0.25);
  if (cA > 0) { spaceCam.updateMatrixWorld(); const p = cameoPos(t).add(new THREE.Vector3(0, 9.5, 0)).project(spaceCam); el.cameoLab.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.cameoLab.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px'; }
  el.cameoLab.style.opacity = cA;
}

// =================== main ===================
window.renderAt = (t) => {
  const inSpace = t < DIVE_END || t >= TIP;
  if (inSpace) { updateSpace(t); spaceCamera(t); }
  updateDOM(t);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (inSpace) renderer.render(space, spaceCam);
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
