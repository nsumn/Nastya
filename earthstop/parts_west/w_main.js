// =================== globe camera: one continuous flight between the beats (keys in Earth-local lat/lon, so the camera rides with the spin) ===================
const KEYS = [ // [time, lat, lon, distance above surface, northward tilt]
  [ZONES, 37, -96, 26, 0.2], [WINDS + 0.6, 39, -92, 22, 0.25], [HURR + 0.4, 27, -66, 8.5, 0.35], [DRY + 0.6, 31, -90, 7.5, 0.3], [DRY + 4.3, 34, -80, 8.5, 0.3],
  [EURO + 0.5, 44, -38, 13, 0.2], [EURO + 4.0, 50, 4, 10, 0.25], [SAHARA + 0.5, 22, 15, 12, 0.2], [INDIAN + 0.5, 6, 75, 14, 0.15], [ROCKET + 0.5, 30, -128, 9.5, 0.3], [T_END - 0.6, 26, -140, 26, 0.2]];
const angLerp = (a, b, k) => { let d = ((b - a + 540) % 360) - 180; return a + d * k; };
function keyAt(t) { if (t <= KEYS[0][0]) return KEYS[0].slice(1); for (let i = 0; i < KEYS.length - 1; i++) { const A = KEYS[i], B = KEYS[i + 1]; if (t <= B[0]) { const hold = Math.max(0, (B[0] - A[0]) - 2.0); const k = ease(clamp((t - A[0] - hold) / (B[0] - A[0] - hold), 0, 1));
      return [lerp(A[1], B[1], k), angLerp(A[2], B[2], k), lerp(A[3], B[3], k), lerp(A[4], B[4], k)]; } } return KEYS[KEYS.length - 1].slice(1); }
function localCam(lat, lon, dist, tilt) { const p = earthG.localToWorld(ll(lat, lon, ER)); const n = p.clone().normalize(); const north = earthG.localToWorld(ll(lat + 8, lon, ER)).sub(p).normalize();
  return { pos: n.clone().multiplyScalar(ER + dist).addScaledVector(north, -dist * tilt), look: p.clone().multiplyScalar(0.92) }; }
const L = new THREE.Vector3(1, 0.12, 0).normalize();
function updateGlobe(t) { earthG.rotation.y = rotAt(t); earthG.updateMatrixWorld(true); if (clouds) clouds.rotation.y = -t * 0.004;
  // camera: close over NYC (continuing the street crane) -> world view of the backwards spin -> follow the beats
  let cam;
  if (t < ZONES) { const near = localCam(40.7, -74.0, lerp(1.2, 6, smooth(5.2, 6.6, t)), 0.15); const far = { pos: V3(0, 15, 30), look: V3(0, 1.5, 0) }; const k = ease(clamp((t - 5.6) / 2.2, 0, 1));
    const zk = ease(clamp((t - (ZONES - 1.4)) / 1.6, 0, 1)), z = localCam(37, -96, 26, 0.2); cam = { pos: near.pos.clone().lerp(far.pos, k).lerp(z.pos, zk), look: near.look.clone().lerp(far.look, k).lerp(z.look, zk) }; }
  else { const [la, lo, d, ti] = keyAt(t); cam = localCam(la, lo, d, ti); }
  cam.pos.add(V3(Math.sin(t * 0.37) * 0.15, Math.sin(t * 0.29) * 0.12, 0)); gCam.position.copy(cam.pos); gCam.up.set(0, 1, 0); gCam.lookAt(cam.look); gCam.fov = 40; gCam.aspect = W / H; gCam.updateProjectionMatrix();
  // sunlight: the real Sun (world lon 0) while we show the spin and the dawn line; later it follows the camera so each region is lit, terminator at the side
  const Lc = gCam.position.clone().normalize().applyAxisAngle(V3(0, 1, 0), 0.75).add(V3(0, 0.25, 0)).normalize(); const lk = smooth(WINDS - 0.2, WINDS + 1.6, t);
  L.set(1, 0.12, 0).normalize().lerp(Lc, lk).normalize(); gSun.position.copy(L).multiplyScalar(60); gSun.target.position.set(0, 0, 0);
  if (cityMat) cityMat.uniforms.uL.value.copy(L); if (atmoMat) atmoMat.uniforms.uL.value.copy(L);
  // spin ring (backwards = clockwise from the north)
  spinRing.visible = t < ZONES + 0.5; spinRing.children.forEach(c => { c.material.opacity = fadeWin(t, SPIN + 0.6, ZONES + 0.4, 0.6); }); spinRing.rotation.y = -t * 0.6;
  // winds flowing west
  const wv = fadeWin(t, WINDS - 0.3, HURR + 0.6, 0.6); windMesh.visible = wv > 0.01;
  WIND.forEach((A, i) => { const life = ((t * 0.35 + A.ph) % 1); const lon = A.lon0 - A.sp * (t - WINDS) - 40 * life; const s = wv * Math.sin(Math.PI * life);
    _o.position.copy(ll(A.lat, lon, ER * 1.03)); _o.up.copy(_o.position).normalize(); _o.lookAt(ll(A.lat, lon - 2, ER * 1.03)); _o.scale.setScalar(Math.max(0.001, s)); _o.updateMatrix(); windMesh.setMatrixAt(i, _o.matrix); }); windMesh.instanceMatrix.needsUpdate = true;
  // the plane: NYC -> LA riding the tailwind
  const pu = smooth(WINDS + 1.2, HURR - 0.4, t); plane.visible = t > WINDS + 0.9 && t < HURR + 0.2; const pp = gcPoint(pu), pn = gcPoint(Math.min(1, pu + 0.01)); plane.position.copy(pp); plane.up.copy(pp).normalize(); plane.lookAt(pn); plane.scale.setScalar(1.6);
  // hurricane, clockwise
  hurrG.visible = t > HURR - 0.4 && t < DRY + 0.6; hurr.material.opacity = fadeWin(t, HURR - 0.4, DRY + 0.6, 0.6); hurr.rotation.z = -t * 2.2;
  // model results
  setRegions({ sus: smooth(DRY + 0.6, DRY + 4.0, t), eur: smooth(EURO + 3.4, EURO + 6.2, t), sah: smooth(SAHARA + 0.3, SAHARA + 3.5, t), ind: smooth(INDIAN + 0.3, INDIAN + 3.2, t) });
  gulfMat.opacity = smooth(EURO - 0.4, EURO + 0.6, t) * (1 - smooth(EURO + 1.8, EURO + 3.4, t)) * 0.95; gulf.visible = gulfMat.opacity > 0.01; paciMat.opacity = smooth(EURO + 2.4, EURO + 3.6, t) * (1 - smooth(SAHARA, SAHARA + 1, t));
  // rocket from California, heading WEST over the Pacific
  gSmoke.begin(); smokeMat.uniforms.uTint.value.set('#f4f2ee');
  if (t > ROCKET + 0.3) { rocket.visible = true; const p = ROCK(t), q = ROCK(t + 0.05); rocket.position.copy(p); rocket.quaternion.setFromUnitVectors(V3(0, 1, 0), q.clone().sub(p).lengthSq() > 1e-8 ? q.clone().sub(p).normalize() : p.clone().normalize()); rocket.scale.setScalar(2.2);
    for (let k = 0; k < 140; k++) { const tk = t - k * 0.03; if (tk < ROCKET + 0.8) break; const w = earthG.localToWorld(ROCK(tk)); gSmoke.add(w, 0.1 + k * 0.004, 0.5 * (1 - k / 140)); }
    if (t < ROCKET + 1.6) for (let k = 0; k < 30; k++) { const w = earthG.localToWorld(ll(VAND[0] + Math.sin(k) * 0.4, VAND[1] + Math.cos(k * 1.3) * 0.4, ER * 1.01)); gSmoke.add(w, 0.25, 0.4 * fadeWin(t, ROCKET + 0.5, ROCKET + 1.6, 0.3)); } }
  else rocket.visible = false;
  gSmoke.end(); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud', 'labels'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if the Sun rose<br>in the <span class="hl">West</span>?'; el.endT.innerHTML = 'What if the Sun rose in the <span class="hl">West</span>?';
el.endS.innerHTML = 'MAX PLANCK INSTITUTE, 2018: A 7,000-YEAR CLIMATE SIMULATION OF A BACKWARDS-SPINNING EARTH.<br>DESERTS SHRINK BY ~4 MILLION SQ MI OVERALL — BUT MOVE TO THE AMERICAS.<br>ON VENUS, THE SUN REALLY DOES RISE IN THE WEST.';
const captions = [
  [1.2, 5.0, 'Manhattanhenge… at sunrise.'],
  [6.5, 10.3, 'Not a sudden flip — that would throw you east at 789 mph.<br>Earth just always spun the other way.'],
  [10.8, 15.8, 'Time zones flip:<br>LA wakes up 3 hours before New York.'],
  [16.3, 22.8, 'Winds blow the other way.<br>NYC → LA becomes the fast flight.'],
  [23.3, 27.8, 'Hurricanes spin clockwise.'],
  [28.3, 31.9, 'A real climate model (Max Planck, 2018):<br>the southern US turns into desert.'],
  [32.0, 35.8, 'But New York gets milder winters.'],
  [36.3, 39.6, 'The Atlantic’s warm current<br>moves to the Pacific…'],
  [39.7, 42.8, '…and western Europe freezes.'],
  [43.3, 48.8, 'The Sahara turns green.'],
  [49.3, 53.8, 'The Indian Ocean fills<br>with cyanobacteria.'],
  [54.3, 59.7, 'Rockets launch WEST for the free boost —<br>America’s spaceport moves to California.'],
];
function hudAt(t) { const M_ = '<b></b>MODEL · MAX PLANCK 2018';
  if (t < SPIN + 0.3) return null;
  if (t < ZONES) return ['<b></b>EARTH’S SPIN', 'DIRECTION', 'REVERSED', 'THE SUN RISES IN THE WEST'];
  if (t < WINDS) return null;
  if (t < HURR) return ['<b></b>WINDS FLIP', 'FLIGHT NYC → LA', '~5 h', 'TODAY ~6 h INTO A HEADWIND'];
  if (t < DRY) return ['<b></b>CORIOLIS FLIPS', 'HURRICANES', 'CLOCKWISE', 'IN THE NORTHERN HEMISPHERE'];
  if (t < EURO) return [M_, 'SOUTHERN US', 'DESERT', t < DRY + 4 ? 'TEXAS · LOUISIANA · FLORIDA' : 'NYC: MILDER WINTERS'];
  if (t < SAHARA) return [M_, 'WESTERN EUROPE', t < EURO + 3.4 ? 'NO GULF STREAM' : 'FREEZING', 'DEEP-WATER ENGINE → N. PACIFIC'];
  if (t < INDIAN) return [M_, 'SAHARA', 'GREEN', 'ARABIA TOO'];
  if (t < ROCKET) return [M_, 'INDIAN OCEAN', 'BLOOM', 'CYANOBACTERIA TAKE OVER'];
  return ['<b></b>LAUNCH WEST', 'FREE BOOST', '856 mph', 'EARTH’S SPIN AT CALIFORNIA’S COAST']; }
const clockEls = [['LA', LA], ['NEW YORK', NYC]].map(([name, p]) => { const d = document.createElement('div'); d.className = 'lb'; d.style.fontSize = '30px'; el.labels.appendChild(d); return { name, p, d }; });
function fmtClock(h) { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); const ap = hh < 12 ? 'AM' : 'PM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.4, 4.0, t);
  const h = hudAt(t); el.hud.style.opacity = h ? fadeWin(t, Math.max(0, t - 99), T_END, 0.3) * (1 - smooth(T_END - 0.4, T_END, t)) : 0;
  if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 9 ? '72px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  // local clocks on LA / NYC while the dawn line sweeps WEST -> EAST
  const ca = fadeWin(t, ZONES + 0.3, WINDS - 0.1, 0.4); const rotDeg = rotAt(t) * 180 / Math.PI;
  for (const C of clockEls) { const eff = ((C.p[1] + rotDeg + 540) % 360) - 180; const hours = 12 - eff / 15; const day = Math.abs(eff) < 90;
    const w = earthG.localToWorld(ll(C.p[0], C.p[1], ER * 1.01)).project(gCam); C.d.style.left = ((w.x * 0.5 + 0.5) * W) + 'px'; C.d.style.top = ((-w.y * 0.5 + 0.5) * H - 14) + 'px';
    C.d.innerHTML = `${day ? '☀' : '☾'} ${C.name}<br><span style="font-size:44px;font-family:'Source Serif 4'">${fmtClock(hours)}</span>`; C.d.style.opacity = ca; C.d.style.textAlign = 'center'; }
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
window.renderAt = (t) => {
  const mix = smooth(5.2, 6.3, t);
  if (mix < 1) { updateStreet(t); streetCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(sCam.fov * Math.PI / 360)); shootTo(RTA, street, sCam); }
  if (mix > 0) { updateGlobe(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(gCam.fov * Math.PI / 360)); shootTo(mix < 1 ? RTB : RTA, space, gCam); }
  composite(mix > 0 && mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildGlobe(); window.renderAt(0); return true; })();
