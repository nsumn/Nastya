// =================== city cameras ===================
const CHASE = LAUNCH[9];
function cityCamera(t, shot) {
  if (shot === 'launch') { if (t < 8.0) { const u = t / 8; cam.fov = 56; cam.position.set(31.5 - 1.0 * u, 1.05, 0.0); cam.lookAt(10, 1.15, -3.0); }
    else { const s = CHASE.state(t); cam.fov = 62; cam.position.set(s.x - 11, 3.0, s.z + 5.0); cam.lookAt(s.x + 8, 0.8, s.z - 0.5); } }
  else if (shot === 'jam') { const u = (t - JAM) / (SKY - JAM); cam.fov = 58; cam.position.set(380 - 4 * u, 6.5, 6.0); cam.lookAt(lerp(334, 344, u), 4.2, -3.5); }
  else if (shot === 'sky') { const u = (t - SKY) / (AIR - SKY); cam.fov = 58; cam.position.set(lerp(20, 52, u), lerp(11, 15, u), -3.0); cam.lookAt(lerp(70, 105, u), 1, 0); }
  else { const u = (t - BUMP) / (REAL - BUMP); cam.fov = 58; cam.position.set(142 - 2 * u, 2.6, 5.5); cam.lookAt(118, lerp(4.4, 3.8, u), -1.75); }
}
function cityLook(t, shot) {
  // traffic lights: red until GREEN, then green
  TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (t < GREEN ? i === 0 : i === 2) ? 2.4 : 0.05; });
  for (const P of people) if (P.kind === 'cross') P.p.outer.visible = false;
  if (shot === 'bump') { sunL.color.set('#ffb070'); sunL.intensity = 2.4; sunL.position.copy(cam.position).add(V3(120, 55, 70)); sunL.target.position.copy(cam.position).add(V3(-30, 0, -8)); sunL.target.updateMatrixWorld(); hemi.color.set('#ffd2a8'); hemi.intensity = 0.85;
    cityDome.material.uniforms.uTop.value.set('#4f62b0'); cityDome.material.uniforms.uBot.value.set('#ffb07a'); city.fog.color.set('#f2b48a'); for (const m of winMats) m.emissiveIntensity = 0.45; for (const m of lampHeads) m.emissiveIntensity = 1.2;
    for (const c of clouds) c.material.color.set('#ffc8a8'); smokeMat.uniforms.uTint.value.set('#ffe2cc'); }
  else { for (const c of clouds) c.material.color.set('#ffffff'); smokeMat.uniforms.uTint.value.set('#ffffff'); }
}
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.3, 7.0, '0 to 60 in 0.9 seconds.'],
  [7.1, 9.6, "That's 3 G —<br>like a Space Shuttle launch."],
  [9.7, 11.8, 'Everyone. At once.'],
  [12.4, 15.2, 'Traffic jam?<br>Just hop over it.'],
  [15.3, 18.5, '298 million vehicles<br>in the US.'],
  [18.6, 21.8, 'All of them jumping.'],
  [22.4, 25.4, "But it's not really flying."],
  [25.5, 28.7, 'The air runs out<br>in about a second.'],
  [28.8, 31.8, "It's a hop, not a flight."],
  [32.4, 35.0, 'Then you need more air.'],
  [35.1, 38.2, 'Lines at every<br>air station.'],
  [38.3, 41.8, 'Each refill: ~9 kWh —<br>like driving 32 miles.'],
  [42.4, 44.9, 'Mid-air fender benders.'],
  [45.0, 47.4, 'Insurance would be…<br>interesting.'],
  [47.5, 49.8, 'And just the deposits?'],
  [50.4, 52.8, 'The real one did this.'],
  [52.9, 55.4, 'Production: 2028.<br>(In 2017 they said 2020.)'],
  [55.5, 58.0, "The flying version<br>isn't street legal."],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < GREEN + 0.2 || t >= REAL) show = 0;
  else if (t < 8.0) { lab = '0–60 MPH'; val = '0.9 s'; sub = 'THRUST VERSION · 3 G'; }
  else if (t < JAM) { lab = 'SPEED'; val = Math.round(CHASE.state(t).v * 2.2369) + ' mph'; sub = 'TOP SPEED: OVER 230 MPH'; }
  else if (t < JAM + 0.3) show = 0;
  else if (t < SKY) { lab = 'US VEHICLES'; val = '298 million'; sub = 'FHWA, 2024'; }
  else if (t < SKY + 0.3) show = 0;
  else if (t < AIR) { stat = '<b></b>MODEL'; lab = 'HOVER TIME'; val = '~1.2 s'; sub = 'PER TANK OF COMPRESSED AIR'; }
  else if (t < AIR + 0.3) show = 0;
  else if (t < BUMP) { stat = '<b></b>MODEL'; lab = 'ONE REFILL'; val = '~9 kWh'; sub = '34 KG OF AIR AT 4,500 PSI'; }
  else if (t < BUMP + 0.3) show = 0;
  else { lab = '$50,000 × 298 MILLION'; val = '$' + (14.9 * smooth(BUMP + 0.4, 49.2, t)).toFixed(1) + ' trillion'; sub = 'RESERVATION DEPOSITS ALONE'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(3.4, 3.9, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const dip = Math.max(...[JAM, SKY, AIR, BUMP, REAL].map(T => fadeWin(t, T - 0.3, T + 0.25, 0.25)));
  el.veil.style.background = '#000'; el.veil.style.opacity = dip;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
const smokeScale = c => H / (2 * Math.tan(c.fov * Math.PI / 360));
window.renderAt = (t) => {
  if (DEBUG === 'car') { debugCar(t); return true; }
  if (t < AIR || (t >= BUMP && t < REAL)) {
    const shot = t < JAM ? 'launch' : t < SKY ? 'jam' : t < AIR ? 'sky' : 'bump';
    cityCamera(t, shot); updateStreet(t, false); cityLook(t, shot); updateFleet(t, shot); smokeMat.uniforms.uScale.value = smokeScale(cam); shoot(city, cam, shot === 'bump' ? 1.05 : 1.0);
  } else if (t < BUMP) { stationCamera(t); updateStation(t); smokeMat.uniforms.uTint.value.set('#ffffff'); smokeMat.uniforms.uScale.value = smokeScale(stCam); shoot(st, stCam, 1.0); }
  else { realCamera(t); updateReal(t); smokeMat.uniforms.uTint.value.set('#c8d4ff'); smokeMat.uniforms.uScale.value = smokeScale(aCam); shoot(arena, aCam, 1.1); }
  updateDOM(t);
  return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
