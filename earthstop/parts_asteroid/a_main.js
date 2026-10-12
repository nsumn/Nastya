// =================== city: night setup + camera ===================
const cityFill = new THREE.DirectionalLight(0xffc89a, 1.2); city.add(cityFill, cityFill.target);
function setNight() {
  sunL.color.set(0x9fb4ff); sunL.intensity = 0.5; hemi.intensity = 0.8; hemi.color.set(0x7a7cc0); hemi.groundColor.set(0x3a2a20);
  city.fog.color.set('#1a1830'); city.fog.near = 80; city.fog.far = 1600;
  for (const m of winMats) m.emissiveIntensity = 0.5;
  for (const m of lampHeads) m.emissiveIntensity = 1.8;
  clouds.forEach(c => { c.visible = false; });
}
function updateCity(t, glow) {
  setNight();
  sunL.position.copy(cam.position).add(new THREE.Vector3(-120, 160, 220)); sunL.target.position.copy(cam.position); sunL.target.updateMatrixWorld();
  cityFill.position.copy(cam.position).add(new THREE.Vector3(-4, 3, 2)); cityFill.target.position.set(cam.position.x + 20, 3, 0); cityFill.target.updateMatrixWorld();
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * 0.6 * t, -220, 158); c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.visible = Math.hypot(x - cam.position.x, c.lane - cam.position.z) > 6 && !(x > 80 && Math.abs(c.lane) < 6.5); }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const gy = Math.abs(z) > 7 ? 0.18 : 0; o.position.set(x, gy + 0.95, z); o.rotation.set(0, ry, 0);
    if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph, 1);
    o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 2.5;
  }
  ball.visible = false;
  updateCrowd(t);
  for (const m of adMats) m.color.setScalar(1.5 + glow * 0.5);
  hemi.intensity = 0.8 + glow * 1.2; cityFill.intensity = 1.2 + glow * 2;
}
function cityCamera(t) {
  let pos, look, fov = 75;
  if (t < T_SCALE) { const u = t / T_SCALE; pos = new THREE.Vector3(lerp(70, 74, u), 1.15, lerp(1.6, 1.2, u)); look = pos.clone().add(new THREE.Vector3(1, lerp(0.72, 0.76, u), 0.1)); fov = 80; }
  else { const u = (t - T_DESC) / (IMPACT - T_DESC); pos = new THREE.Vector3(lerp(79, 80, u), 1.3, 0.6); look = pos.clone().add(new THREE.Vector3(1, lerp(0.74, 0.82, u), 0.1)); fov = lerp(80, 84, u);
    const sh = smooth(0.2, 1, u) * 0.06; pos.x += Math.sin(t * 61) * sh; pos.y += Math.sin(t * 73 + 1) * sh; look.y += Math.sin(t * 57 + 2) * sh * 3; }
  cam.fov = fov; cam.near = 0.1; cam.far = 6000; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'lead', 'scl1', 'scl2'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [3.5, 5.6, 'Picture a rock<br>one mile wide.'],
  [5.8, 7.9, 'Taller than 3½ Empire<br>State Buildings.'],
  [8.3, 9.9, 'At 34 miles up,<br>it starts to crack.'],
  [10.0, 11.1, 'The air barely<br>slows it down.'],
  [11.3, 12.5, 'Eight seconds after<br>hitting the air…'],
  [14.2, 16.6, 'The impact itself takes<br>less than a second.'],
  [16.8, 19.8, 'The energy of thousands<br>of the biggest nukes.'],
  [20.2, 22.8, 'A fireball<br>24 miles wide.'],
  [23.0, 25.8, 'The heat flash lasts<br>about 4 minutes.'],
  [26.2, 29.0, 'When it clears: a crater<br>13 miles wide.'],
  [29.2, 32.8, 'For a moment the hole is<br>3.3 miles deep.'],
  [33.4, 36.0, 'The heat reaches<br>130 miles out.'],
  [36.2, 38.8, 'Clothes catch fire<br>in Philadelphia.'],
  [39.3, 41.8, 'Then the ground hits back:<br>magnitude 8.2.'],
  [42.0, 44.8, 'Boston starts shaking<br>a minute later.'],
  [45.2, 46.9, 'Then the air blast.'],
  [47.1, 49.3, 'Philadelphia, 7 minutes:<br>370 mph winds.'],
  [49.5, 51.8, 'Boston, 15 minutes:<br>windows shatter.'],
  [52.2, 54.3, 'Rock rains down<br>100 miles away.'],
  [54.7, 56.8, 'The dust could cool<br>the whole planet.'],
  [57.2, 59.0, 'Good news: NASA has found<br>~95% of asteroids this big.'],
  [59.2, 60.9, 'None of them are<br>headed our way.'],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < T_SCALE) { stat = '<b></b>TIMES SQUARE · NEW YORK'; lab = 'INCOMING'; val = '38,000 mph'; sub = '1 MILE WIDE · STONY ASTEROID'; show = smooth(0.5, 1.0, t); }
  else if (t < T_SPACE) { stat = '<b></b>TO SCALE'; lab = 'SIZE'; val = '5,280 ft'; sub = '3.6× THE EMPIRE STATE BUILDING'; }
  else if (t < IMPACT) { const alt = distKm(t) * Math.sin(ENTRY_DEG * Math.PI / 180) * 0.6214; stat = '<b></b>38,000 MPH · 45°'; lab = 'ALTITUDE'; val = alt.toFixed(1) + ' mi'; sub = alt > 33.6 ? 'ENTERING THE ATMOSPHERE' : 'BREAKING APART · STILL FALLING'; }
  else if (t < T_MAP + 0.2) show = 0;
  else if (t < T_FIREB) {
    stat = '<b></b>IMPACT'; lab = 'ENERGY';
    if (t < 16.8) { val = fmtInt(226000 * smooth(T_MAP + 0.2, T_MAP + 1.6, t)) + ' Mt'; sub = 'MEGATONS OF TNT'; }
    else if (t < 18.4) { val = '4,500'; sub = 'TSAR BOMBAS · BIGGEST NUKE EVER'; }
    else { val = '15 million'; sub = 'HIROSHIMA BOMBS'; }
  }
  else if (t < T_CRATER) { stat = '<b></b>IMPACT'; lab = 'FIREBALL'; val = '24 miles'; sub = 'WIDE · HEAT FLASH ~4 MIN'; }
  else if (t < T_HEAT) { stat = '<b></b>AFTER THE FIREBALL'; lab = 'CRATER'; val = '13 miles'; sub = 'WIDE · 2,400 FT DEEP'; }
  else if (t < T_QUAKE) { stat = '<b></b>SPEED OF LIGHT'; lab = 'HEAT'; val = '131 miles'; sub = 'CLOTHES IGNITE · PHILLY IS 83 MI'; }
  else if (t < T_BLAST) { const s = quakeSim(t); stat = '<b></b>T+ ' + mmss(s); lab = 'EARTHQUAKE'; val = 'M 8.2'; sub = s < 59.5 ? 'BOSTON 187 MI · HITS AT T+ 1:00' : 'BOSTON IS SHAKING'; }
  else if (t < T_EJECT) { const s = blastSim(t), r = blastR(s); stat = '<b></b>T+ ' + mmss(s); lab = 'AIR BLAST · WIND'; val = fmtInt(Math.round(windAt(r) / 5) * 5) + ' mph'; sub = s < 419 ? 'PHILADELPHIA AT T+ 7:00' : s < 920 ? 'BOSTON AT T+ 15:20' : 'BOSTON: WINDOWS SHATTER'; }
  else if (t < T_DUST) { stat = '<b></b>MINUTES LATER'; lab = 'ROCK RAIN'; val = '3+ ft'; sub = 'DEEP 47 MI OUT · 4 IN AT 100 MI'; }
  else if (t < T_CALM) { stat = '<b></b>MODEL · MONTHS LATER'; lab = 'DUST'; val = 'Global'; sub = 'A POSSIBLE "IMPACT WINTER"'; }
  else { stat = '<b></b>NASA · JPL'; lab = 'TRACKED'; val = '~95%'; sub = 'OF NEAR-EARTH ASTEROIDS OVER 1 KM'; }
  return { stat, lab, val, sub, show };
}
function updateScaleLabels(t, active) {
  const a = active ? fadeWin(t, T_SCALE + 0.6, T_SPACE - 0.1, 0.4) : 0;
  el.scl1.style.opacity = el.scl2.style.opacity = a; el.lead.style.opacity = a;
  if (a <= 0) return;
  const P = v => { const p = v.clone().project(scaleCam); return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H]; };
  const [rx, ry] = P(new THREE.Vector3(-1010, ROCK_D + 60, 0)); el.scl1.style.left = rx + 'px'; el.scl1.style.top = (ry - 40) + 'px';
  const [ex, ey] = P(new THREE.Vector3(0, ESB_TIP, 0)), [bx, by] = P(new THREE.Vector3(0, 0, 0));
  el.scl2.style.left = (ex - 150) + 'px'; el.scl2.style.top = (ey - 250) + 'px';
  el.lead.innerHTML = `<line x1="${ex}" y1="${ey - 6}" x2="${ex - 40}" y2="${ey - 175}" stroke="#fff" stroke-width="2.5" opacity="0.9"/><circle cx="${ex}" cy="${ey}" r="5" fill="#ff3b30"/>`;
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(T_SCALE - 0.35, T_SCALE, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t)) * (1 - fadeWin(t, IMPACT, T_MAP + 0.3, 0.1));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const v1 = fadeWin(t, T_SCALE - 0.2, T_SCALE + 0.2, 0.2), v2 = fadeWin(t, T_SPACE - 0.2, T_SPACE + 0.2, 0.2), v3 = fadeWin(t, T_DESC - 0.15, T_DESC + 0.15, 0.15), v4 = fadeWin(t, T_DUST - 0.3, T_DUST + 0.3, 0.3);
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(v1, v2, v3, v4);
  el.flash.style.opacity = t < IMPACT ? smooth(IMPACT - 0.25, IMPACT, t) : 1 - smooth(IMPACT + 0.4, T_MAP + 0.5, t);
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  const shot = t < T_SCALE ? 'city' : t < T_SPACE ? 'scale' : t < T_DESC ? 'space' : t < IMPACT + 0.25 ? 'city' : t < T_DUST ? 'map' : 'space';
  if (shot === 'scale') scaleCamera(t); else if (shot === 'map') mapCamera(t);
  updateScaleLabels(t, shot === 'scale');
  if (window.PASS === 'text') { updateLabels(t, shot === 'map'); return true; }
  renderer.setRenderTarget(null); renderer.clear();
  if (shot === 'city') { cityCamera(t); const glow = updateSky(t, cam.position); updateCity(t, glow); renderer.render(city, cam); }
  else if (shot === 'scale') { scaleCamera(t); renderer.render(scaleScene, scaleCam); }
  else if (shot === 'map') { updateMap(t); renderer.render(mapScene, mapCam); }
  else { updateSpace(t); renderer.render(space, spaceCam); }
  updateLabels(t, shot === 'map');
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildMap(), buildGlobe()]).then(() => { window.renderAt(0); return true; });
