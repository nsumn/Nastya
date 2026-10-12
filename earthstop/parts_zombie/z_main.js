
// =================== city: night setup ===================
const cityFill = new THREE.DirectionalLight(0xffc89a, 0.0); city.add(cityFill, cityFill.target);
function setNight(t) {
  sunL.color.set(0x9fb4ff); sunL.intensity = 0.6; hemi.intensity = 0.7;
  cityFill.intensity = 1.3; cityFill.position.copy(cam.position).add(new THREE.Vector3(2, 3, 4)); cityFill.target.position.set(66, 1, -10); cityFill.target.updateMatrixWorld(); hemi.color.set(0x6a7cb0); hemi.groundColor.set(0x2a2018);
  city.fog.color.set('#141a2c'); city.fog.near = 60; city.fog.far = 1400;
  for (const m of winMats) m.emissiveIntensity = 0.45;
  for (const m of lampHeads) m.emissiveIntensity = 1.8;
  clouds.forEach(c => { c.visible = false; });
  pumpkinMat.emissiveIntensity = 2.0 + 0.4 * Math.sin(t * 11) * Math.sin(t * 7.3);
  pumpLights.forEach((l, i) => { l.intensity = 5 + 1.2 * Math.sin(t * 9 + i * 2); });
}
function updateCityZ(t) {
  setNight(t);
  sunL.position.copy(cam.position).addScaledVector(MOON_DIR, 300); sunL.target.position.copy(cam.position); sunL.target.updateMatrixWorld();
  moon.position.copy(MOON_DIR).multiplyScalar(3800).add(cam.position);
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * 0.6 * t, -220, 760); c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 6; }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const gy = Math.abs(z) > 7 ? 0.18 : 0; o.position.set(x, gy + 0.95, z); o.rotation.set(0, ry, 0);
    if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph);
    o.visible = !(x > 52 && x < 82 && z < -7) && Math.hypot(x - cam.position.x, z - cam.position.z) > 2.5;   // keep the party block clear
  }
  ball.visible = false;
  updateCast(t);
}
function cityCamera(t) {
  let pos, look, fov = 50;
  if (t < NOTICE) { const u = t / NOTICE; pos = new THREE.Vector3(lerp(80.5, 78.5, u), 2.3, lerp(-6.2, -6.6, u)); look = new THREE.Vector3(65, 1.0, -10.2); fov = 44; }
  else if (t < BLOCK) { const u = (t - NOTICE) / (BLOCK - NOTICE); pos = new THREE.Vector3(lerp(66.9, 68.6, u), lerp(1.75, 2.2, u), lerp(-6.5, -6.0, u)); look = new THREE.Vector3(lerp(65.2, 65.8, u), 1.1, -10.1); fov = lerp(44, 52, u); }
  else { const u = ease((t - BLOCK) / (RISE + 0.8 - BLOCK)); pos = new THREE.Vector3(lerp(76, 72, u), lerp(2.0, 60, Math.pow(u, 1.6)), lerp(-6.5, 10, u)); look = new THREE.Vector3(lerp(67, 67, u), lerp(1.2, 0, u), lerp(-10, -9.5, u)); fov = lerp(50, 58, u); }
  cam.fov = fov; cam.near = 0.1; cam.far = 6000; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
}
// =================== map camera ===================
let NYC_MAP = new THREE.Vector3(), MT_MAP = new THREE.Vector3();
function mapCamera(t) {
  let pos, look, fov = 36;
  const whole = new THREE.Vector3(0, 0, 25); const WH = 2700, WZ = 1350;
  if (t < CITIES) { const u = ease((t - MAP) / (CITIES - MAP)); look = NYC_MAP.clone().lerp(whole, u); const h = Math.exp(lerp(Math.log(40), Math.log(WH), u)); pos = look.clone().add(new THREE.Vector3(0, h, h * lerp(0.15, WZ / WH, u))); fov = 36; }
  else if (t < ROCKIES - 1.2) { const u = (t - CITIES) / (ROCKIES - 1.2 - CITIES); const a = 0.08 * Math.sin(u * 3); look = whole.clone(); pos = new THREE.Vector3(Math.sin(a) * 900, WH, WZ + 25); fov = 36; }
  else if (t < ROCKIES + 0.2) { const u = ease((t - (ROCKIES - 1.2)) / 1.4); look = whole.clone().lerp(MT_MAP, u); const h = Math.exp(lerp(Math.log(WH), Math.log(60), u)); pos = look.clone().add(new THREE.Vector3(0, h, h * lerp(WZ / WH, 0.9, u))); }
  else { const u = (t - BACKMAP) / (T_END - BACKMAP); look = whole.clone(); pos = new THREE.Vector3(lerp(-200, 150, u), lerp(WH * 0.95, WH, u), lerp(WZ + 60, WZ, u)); fov = 36; }
  mapCam.fov = fov; mapCam.near = 1; mapCam.far = 6000; mapCam.updateProjectionMatrix(); mapCam.position.copy(pos); mapCam.up.set(0, 1, 0); mapCam.lookAt(look);
}
function updateMap(t) {
  const day = dayAt(t); mapMat.uniforms.uDay.value = day; mapMat.uniforms.uTime.value = t;
  for (const b of beacons) { const inf = b.m.arr <= day; b.s.material.color.set(inf ? '#ff4a2a' : '#ffd28a'); const pulse = inf ? 1 + 0.5 * Math.exp(-(day - b.m.arr) * 2) : 1; b.s.scale.setScalar((6 + 2.5 * Math.sqrt(b.m.pop)) * pulse); }
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [4.3, 7.2, 'Nobody would notice.'],
  [7.4, 10.0, "Everyone's already<br>dressed as one."],
  [10.4, 13.6, 'One bite, and the costume<br>party turns real.'],
  [13.8, 16.6, 'By midnight,<br>the whole block.'],
  [17.6, 20.6, "And it's Halloween<br>in every city."],
  [20.8, 23.8, 'Cornell physicists actually<br>simulated this.'],
  [24.2, 27.4, 'Big cities fall<br>within days.'],
  [27.6, 30.8, 'L.A. to San Francisco gets<br>hit from both ends.'],
  [31.2, 34.6, "But zombies walk.<br>They don't drive or fly."],
  [34.8, 39.6, 'So the countryside holds<br>out for months.'],
  [40.3, 43.8, 'The safest place<br>in America?'],
  [44.0, 47.4, 'The northern Rockies.'],
  [47.8, 51.2, 'Too few people,<br>too far apart.'],
  [51.4, 54.8, 'Zombies take months<br>to get up here.'],
  [55.4, 58.4, 'So… where would<br>you hide?'],
  [58.6, 61.8, 'Comment your state.'],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const US_POP = 335e6;
function streetInfected(t) { let n = 1; for (const c of cast) if (t >= c.tinf) n++; return n; }
function clockAt(t) { const mins = 20 * 60 + 47 + Math.floor(lerp(0, 190, smooth(0, RISE, t))); const h = Math.floor(mins / 60) % 24, m = mins % 60; const hh = ((h + 11) % 12) + 1; return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 && h < 24 ? 'PM' : 'AM'}`; }
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < NOTICE) { stat = '<b></b>OCT 31 · NEW YORK'; lab = 'ZOMBIES'; val = '1'; sub = 'EVERYONE THINKS IT\'S A COSTUME'; show = smooth(0.6, 1.2, t); }
  else if (t < RISE) { stat = '<b></b>' + clockAt(t); lab = 'INFECTED'; const n = t < 13.2 ? streetInfected(t) : Math.round(streetInfected(t) * Math.pow(10, (t - 13.2) * 0.9)); val = fmtInt(n); sub = t < BLOCK ? 'STILL LOOKS LIKE A PARTY' : 'ONE BLOCK, THEN THE NEXT'; }
  else if (t < MAP + 0.3) show = 0;
  else if (t < ROCKIES) { const d = dayAt(t); stat = '<b></b>MODEL · DAY ' + Math.max(1, Math.ceil(d)); lab = 'INFECTED'; val = fmtInt(Math.round(infectedFrac(d) * US_POP / 1e5) * 1e5); sub = t < RURAL ? 'CITIES GO FIRST' : 'THE COUNTRYSIDE HOLDS ON'; }
  else if (t < BACKMAP) { const d = dayAt(t); stat = '<b></b>DAY ' + Math.ceil(d); lab = 'NORTHERN ROCKIES'; val = 'Still safe'; sub = 'MONTANA · IDAHO · WYOMING'; }
  else { const d = dayAt(t); stat = '<b></b>DAY ' + Math.ceil(d); lab = 'INFECTED'; val = fmtInt(Math.round(infectedFrac(d) * US_POP / 1e6) * 1e6); sub = 'THE MOUNTAINS HOLD OUT LONGEST'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(NOTICE - 0.35, NOTICE, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const v1 = fadeWin(t, RISE, MAP + 0.25, 0.4), v2 = fadeWin(t, ROCKIES - 0.25, ROCKIES + 0.35, 0.3), v3 = fadeWin(t, BACKMAP - 0.3, BACKMAP + 0.3, 0.3);
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(v1, v2, v3);
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (t < RISE + 0.4) { cityCamera(t); updateCityZ(t); renderer.render(city, cam); }
  else if (t < ROCKIES || t >= BACKMAP) { mapCamera(t); updateMap(t); renderer.render(mapScene, mapCam); }
  else { mountCamera(t); updateMount(t); renderer.render(mount, mountCam); }
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildMap()]).then(() => {
  mapMat.uniforms.uTex.value = arrivalTex; buildBeacons();
  const nyc = metroPts.find(m => m.n === 'New York'); NYC_MAP = toMap(nyc.x * GS, nyc.y * GS).setY(10);
  const proj = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]); const mt = proj([-111.5, 46.6]); MT_MAP = toMap(mt[0], mt[1]).setY(10);
  window.renderAt(0); return true;
});
