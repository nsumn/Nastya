
// =================== light states for the meadow ===================
const sunDirEA = (el, az) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
const D2R = Math.PI / 180;
const ST = {
  dawn: { el: 4.5, az: 0.16, zen: '#2a58b0', hor: '#ffc396', glow: '#ffb070', glowK: 8, glowI: 0.55, horGlow: 0.9, disc: '#fff0d0', discR: 0.0085, discI: 30, glare: 0.25,
    light: '#ffc890', sunI: 2.4, hemiSky: '#a8c4e8', hemiGnd: '#5a6a35', hemiI: 0.9, fog: '#f0d2b8', cloud: '#ffe4cf', exp: 1.0, shadowR: 3 },
  swap: { el: 6.5, az: 0.16, zen: '#2f5fe0', hor: '#8fb0ff', glow: '#6f9cff', glowK: 4, glowI: 1.0, horGlow: 0.8, disc: '#8fb2ff', discR: 0.0085 * 7.5, discI: 6, glare: 0.5,
    light: '#b0c8ff', sunI: 5.0, hemiSky: '#9fb8ff', hemiGnd: '#506070', hemiI: 1.6, fog: '#a8c0f0', cloud: '#e8f0ff', exp: 1.1, shadowR: 3 },
  far: { el: 22, az: -0.34, zen: '#2140c4', hor: '#8ea6ee', glow: '#9ab8ff', glowK: 60, glowI: 0.45, horGlow: 0.25, disc: '#dfe9ff', discR: 0.0016, discI: 420, glare: 1.3,
    light: '#c8d8ff', sunI: 2.0, hemiSky: '#7d98ee', hemiGnd: '#4a5a48', hemiI: 1.25, fog: '#9fb2ea', cloud: '#e6ecff', exp: 0.95, shadowR: 0.6 },
  low: { el: 10, az: -0.29, zen: '#2a3aa8', hor: '#f3b08a', glow: '#ffb070', glowK: 7, glowI: 0.7, horGlow: 1.1, disc: '#ffd0a0', discR: 0.0024, discI: 40, glare: 1.0,
    light: '#ffb070', sunI: 1.3, hemiSky: '#5466c0', hemiGnd: '#3a3a40', hemiI: 0.6, fog: '#c09090', cloud: '#ffc8b0', exp: 1.0, shadowR: 0.8 },
  set: { el: 6.8, az: -0.29, zen: '#121c66', hor: '#ff8f50', glow: '#ff7a28', glowK: 90, glowI: 2.6, horGlow: 1.4, disc: '#ff7a18', discR: 0.0065, discI: 3.5, glare: 1.2,
    light: '#ff8040', sunI: 0.35, hemiSky: '#34449a', hemiGnd: '#2a2a35', hemiI: 0.42, fog: '#a86a62', cloud: '#ff9a78', exp: 1.05, shadowR: 1 },
};
function mixState(a, b, k) {
  k = clamp(k, 0, 1); const o = {};
  for (const key in a) o[key] = typeof a[key] === 'number' ? lerp(a[key], b[key], k) : col3(a[key], b[key], k);
  // the disc radius and brightness blend in log space so the shrink/grow looks even
  o.discR = Math.exp(lerp(Math.log(a.discR), Math.log(b.discR), k)); o.discI = Math.exp(lerp(Math.log(a.discI), Math.log(b.discI), k));
  return o;
}
function lightAt(t) {
  let L;
  if (t < SPACE1) { L = mixState(ST.dawn, ST.swap, smooth(SWAP, SWAP + 3.3, t)); const fl = smooth(SWAP, SWAP + 0.8, t) * (1 - smooth(SWAP + 0.8, SWAP + 1.6, t)); L.discI *= 1 + 0.6 * fl * Math.sin(t * 40); L.el = lerp(4.5, 6.5, smooth(0, SPACE1, t)); }
  else if (t < DUSK) L = mixState(ST.far, ST.far, 0);
  else { const u = t - DUSK; L = u < 3 ? mixState(ST.far, ST.low, smooth(0, 3, u)) : mixState(ST.low, ST.set, smooth(3, 5.6, u)); }
  L.sun = sunDirEA(L.el * D2R, L.az);
  return L;
}

// =================== cameras ===================
function meadowCamera(t) {
  let pos, look, fov = 50;
  if (t < SPACE1) { const u = t / SPACE1; pos = new THREE.Vector3(lerp(1.0, 1.9, u), lerp(1.15, 1.45, ease(u)), lerp(15, 5.5, 0.6 * u + 0.4 * ease(u)));
    pos.y += th(pos.x, pos.z); look = pos.clone().add(new THREE.Vector3(0.06, lerp(0.05, 0.085, smooth(SWAP, SWAP + 3, t)), -1).multiplyScalar(100)); }
  else if (t < DUSK) { const u = (t - MEADOW2) / (DUSK - MEADOW2); pos = new THREE.Vector3(lerp(-2.5, -1.0, u), 1.25, lerp(-2, -7, u)); pos.y += th(pos.x, pos.z);
    const d = sunDirEA(ST.far.el * D2R * 0.62, -0.30 + 0.05 * u); look = pos.clone().addScaledVector(d, 100); }
  else { const u = (t - DUSK) / (AGE - DUSK); pos = new THREE.Vector3(-1.0 - u * 0.6, lerp(1.25, 1.6, u), lerp(-7, -8.5, u)); pos.y += th(pos.x, pos.z);
    look = pos.clone().add(sunDirEA(lerp(13, 3.2, ease(u)) * D2R, -0.33).multiplyScalar(100)); fov = lerp(50, 54, u); }
  mCam.fov = fov; mCam.updateProjectionMatrix(); mCam.position.copy(pos); mCam.up.set(0, 1, 0); mCam.lookAt(look);
}
function lineupCamera(t) {
  let pos, look, fov = 40;
  if (t < HOT) {
    const u = smooth(SPACE1 + 1.6, HOT - 1.2, t);
    const close = new THREE.Vector3(-11.5, -1.6, 7.5), far = new THREE.Vector3(-3.0, -9.0, 74);
    pos = close.clone().lerp(far, u); pos.x += (t - SPACE1) * 0.15;
    look = new THREE.Vector3(-11.5, -0.9, 0).lerp(new THREE.Vector3(-3.0, -8.6, 0), u);
  } else {   // aging + supernova: Spica in the upper half, slow push, then pull back for the blast
    const u = (t - AGE) / (T_END - AGE); const back = smooth(SN, SN + 4.5, t);
    pos = new THREE.Vector3(3.0 + 6 * u, lerp(-12, -7, back), lerp(52, 190, back) - 4 * u); look = new THREE.Vector3(3.0, lerp(-10, -7, back), 0);
  }
  spaceCam.fov = fov; spaceCam.updateProjectionMatrix(); spaceCam.position.copy(pos); spaceCam.lookAt(look);
}
const hotCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 5000);
function hotCamera(t) { const u = (t - HOT) / (MAP - HOT); const a = 0.9 + u * 0.35; const d = lerp(8.4, 7.6, ease(u));
  hotCam.position.set(Math.sin(a) * d, -0.3, Math.cos(a) * d); hotCam.lookAt(0, -0.95, 0); }
function mapCamera(t) { const u = (t - MAP) / (MEADOW2 - MAP); const H = Math.exp(lerp(Math.log(4.2), Math.log(820), smooth(0.12, 0.92, u)));
  mapCam.position.set(0, H, H * 0.42); mapCam.lookAt(0, 0, H * 0.06); return H; }

// =================== per-scene updates ===================
const STAR_T = t => t;
function updateLineup(t) {
  for (const s of [sunStar, spica]) s.userData.mat.uniforms.uT.value = t;
  sunStar.visible = t < HOT;
  if (t >= AGE) {    // ageing time-lapse: swells and cools before the end
    const a = smooth(AGE + 2.0, SN - 0.3, t);
    spica.scale.setScalar(SPICA_R * (1 + 1.6 * a));
    spica.userData.mat.uniforms.uCol.value.copy(col3('#6f9cff', '#ff8a4a', a)); spica.userData.glow.material.color.copy(col3('#4f7dff', '#ff6a30', a));
    spica.userData.mat.uniforms.uBoil.value = 0.35 + 0.5 * a; spica.userData.mat.uniforms.uT.value = t * (1 + 3 * a);
    const pre = smooth(SN - 0.6, SN, t); spica.userData.mat.uniforms.uI.value = 1.1 + 30 * pre;
  } else { spica.scale.setScalar(SPICA_R); spica.userData.mat.uniforms.uCol.value.set('#6f9cff'); spica.userData.glow.material.color.set('#4f7dff'); spica.userData.mat.uniforms.uBoil.value = 0.35; spica.userData.mat.uniforms.uI.value = 1.1; }
  updateSN(t);
}
function updateHot(t) {
  const u = t - HOT;
  earthMat.uniforms.uSun.value.copy(HOT_DIR); earthMat.uniforms.uCam.value.copy(hotCam.position); earthMat.uniforms.uSunCol.value.setRGB(0.85, 0.95, 1.3).multiplyScalar(1.5);
  const steam = smooth(0.5, 3.0, u) * (1 - smooth(4.2, 6.2, u)), heat = smooth(3.3, 6.6, u);
  earthMat.uniforms.uClouds.value = 1 + 0.9 * steam - 1.0 * smooth(4.4, 6.4, u); earthMat.uniforms.uCloudT.value = t * 0.05;
  earthMat.uniforms.uLand.value = 0.55 * smooth(2.5, 5.5, u); earthMat.uniforms.uHeat.value = 1.15 * heat; earthMat.uniforms.uAmb.value = 0.03 + 0.12 * heat;
  earth.rotation.y = t * 0.08; earthAir.material.uniforms.uS.value.copy(HOT_DIR); earthAir.material.uniforms.uA.value = 1 - 0.8 * heat;
  hotGlow.material.uniforms.uS.value.copy(HOT_DIR.clone().negate()); hotGlow.material.uniforms.uA.value = heat;
  hotStar.userData.mat.uniforms.uT.value = t;
}
function updateMap(t, H) {
  const u = t - MAP;
  const r = u < 1.6 ? 1 : Math.max(1, 0.185 * H);                       // Earth glides out at a steady place on screen
  const k = Math.min(r, 143); const a = 0.6 + 0.4 / Math.sqrt(k);
  mapEarth.position.set(Math.cos(a) * k, 0, -Math.sin(a) * k); mapEarth.scale.setScalar(H * 0.045);
  mapStar.scale.setScalar(Math.max(0.6, H * 0.06)); for (const p of mapPlanets) p.s.scale.setScalar(H * 0.022);
  mapMat.uniforms.uNew.value = smooth(MAP + 4.0, MAP + 5.2, t);
  return k;
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels'].map(k => [k, $(k)]));
const labelEls = {};
function label(key, text, p3, cam, a, dy = -40) {
  let e = labelEls[key]; if (!e) { e = document.createElement('div'); e.className = 'lb'; e.textContent = text; el.labels.appendChild(e); labelEls[key] = e; }
  if (a <= 0.001) { e.style.opacity = 0; return; }
  cam.updateMatrixWorld(); const p = p3.clone().project(cam); const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H + dy;
  e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.opacity = (p.z < 1 && x > 60 && x < W - 60 && y > 330 && y < 1600) ? a : 0;
}
const captions = [
  [6.3, 9.6, 'Swap our Sun for Spica,<br>a real blue star.'],
  [10.3, 13.3, "It's 7.5 times wider<br>and 10 times heavier…"],
  [13.5, 16.8, '…and 20,500 times brighter.'],
  [17.3, 20.6, 'At our distance, Earth would get<br>20,500 times the sunlight.'],
  [20.8, 23.8, 'Its rocks would melt.'],
  [24.3, 27.4, 'To feel like home, Earth<br>would have to move away…'],
  [27.6, 30.8, '…143 times farther.<br>Almost 5× past Neptune.'],
  [31.3, 35.3, 'Our sun would shrink<br>to a blinding blue dot…'],
  [35.5, 39.8, '…and one year would last<br>535 years.'],
  [40.3, 42.9, 'Daylight as dim as shade,<br>with 8× the UV.'],
  [43.1, 45.8, 'And sunsets?<br>Still orange.'],
  [46.3, 49.6, 'But blue stars burn out<br>300 times faster.'],
  [49.8, 52.8, 'Life on Earth needed<br>800 million years just to start.'],
  [53.3, 56.2, 'Then it explodes.'],
  [56.4, 59.8, 'Long before anyone could<br>see a blue sunrise.'],
];
const fmt = n => Math.round(n).toLocaleString('en-US');
function hudAt(t, extra) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < SWAP + 0.3) show = 0;
  else if (t < SPACE1) { lab = 'YOUR NEW STAR'; val = 'Spica'; sub = 'A REAL BLUE STAR · 250 LIGHT-YEARS AWAY'; }
  else if (t < SPACE1 + 3.4) { lab = 'SURFACE'; val = '45,000°F'; sub = 'OUR SUN: 9,900°F'; }
  else if (t < HOT) { lab = 'BRIGHTNESS'; val = '20,500×'; sub = 'OUR SUN'; }
  else if (t < MAP) { stat = '<b></b>MODEL'; lab = 'EARTH AT 1 AU'; const k = smooth(HOT + 1.0, MAP - 1.2, t); val = fmt(lerp(59, 5000, k * k)) + '°F'; sub = 'ROCK MELTS ABOVE ~2,000°F'; }
  else if (t < MEADOW2) { lab = 'DISTANCE'; val = (extra.au < 9.95 ? extra.au.toFixed(1) : fmt(extra.au)) + ' AU'; sub = 'NEPTUNE: 30 AU · EARTH TODAY: 1 AU'; }
  else if (t < MEADOW2 + 4.3) { stat = '<b></b>MODEL'; lab = 'SUN IN THE SKY'; val = '19× smaller'; sub = '…BUT 370× BRIGHTER PER INCH'; }
  else if (t < DUSK) { stat = '<b></b>MODEL'; lab = 'ONE YEAR'; val = '535 years'; sub = 'ONE ORBIT AT 143 AU'; }
  else if (t < AGE) { stat = '<b></b>MODEL'; lab = 'DAYLIGHT'; val = '14%'; sub = '92% OF ITS LIGHT IS ULTRAVIOLET'; }
  else if (t < SN) { stat = '<b></b>TIME-LAPSE'; lab = 'STAR AGE'; val = fmt(lerp(0, 25, smooth(AGE + 0.3, SN - 0.3, t))) + ' million yr'; sub = 'OUR SUN: ~10 BILLION YEARS'; }
  else show = 0;
  return { stat, lab, val, sub, show };
}
function updateDOM(t, extra) {
  el.title.style.opacity = fadeWin(t, -1, SWAP + 0.2, 0.5);
  const h = hudAt(t, extra); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  // veils: white at the blue swap, dark between the other shots
  const white = smooth(SPACE1 - 0.9, SPACE1 - 0.05, t) * (1 - smooth(SPACE1, SPACE1 + 0.6, t));
  const dark = Math.max(fadeWin(t, HOT - 0.3, HOT + 0.3, 0.3), fadeWin(t, MAP - 0.3, MAP + 0.3, 0.3), fadeWin(t, MEADOW2 - 0.3, MEADOW2 + 0.3, 0.3), fadeWin(t, AGE - 0.35, AGE + 0.35, 0.35));
  el.veil.style.background = white > 0.001 ? '#eef4ff' : '#03050a'; el.veil.style.opacity = Math.max(white, dark);
  el.flash.style.opacity = smooth(SN - 0.25, SN, t) * (1 - smooth(SN + 0.05, SN + 0.9, t));
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
window.renderAt = (t) => {
  renderer.clear();
  let extra = { au: 1 };
  for (const k in labelEls) labelEls[k].style.opacity = 0;
  if (t < SPACE1 || (t >= MEADOW2 && t < AGE)) {
    meadowCamera(t); const L = lightAt(t); updateMeadow(t, L); renderer.toneMappingExposure = L.exp;
    renderer.render(meadow, mCam);
  } else if (t < HOT || t >= AGE) {
    renderer.toneMappingExposure = 1.0; lineupCamera(t); updateLineup(t); renderer.render(lineup, spaceCam);
    if (t < HOT) { const a = smooth(SPACE1 + 0.4, SPACE1 + 1.0, t) * (1 - smooth(HOT - 0.5, HOT - 0.2, t)); label('sun', 'SUN', sunStar.position.clone().add(new THREE.Vector3(0, 1.5, 0)), spaceCam, a);
      label('spica', 'SPICA', spica.position.clone().add(new THREE.Vector3(0, SPICA_R + 0.8, 0)), spaceCam, a * smooth(SPACE1 + 3.2, SPACE1 + 4.0, t)); }
  } else if (t < MAP) {
    renderer.toneMappingExposure = 1.0; hotCamera(t); updateHot(t); renderer.render(hotS, hotCam);
  } else {
    renderer.toneMappingExposure = 1.0; const Hc = mapCamera(t); extra.au = updateMap(t, Hc); renderer.render(mapS, mapCam);
    const la = smooth(MAP + 0.4, MAP + 1.0, t) * (1 - smooth(MEADOW2 - 0.5, MEADOW2 - 0.2, t));
    const ringLab = (key, txt, r, ang) => { const px = r / (Hc * 0.42) * W; label(key, txt, new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r), mapCam, la * smooth(70, 140, px) * (1 - smooth(1400, 2600, px)), -18); };
    ringLab('earth0', 'EARTH TODAY', 1, -1.9); ringLab('jup', 'JUPITER', 5.2, -2.0); ringLab('sat', 'SATURN', 9.58, -1.7); ringLab('ura', 'URANUS', 19.2, -2.1); ringLab('nep', 'NEPTUNE', 30.07, -1.8);
    label('newe', 'EARTH', mapEarth.position, mapCam, la * smooth(MAP + 1.6, MAP + 2.2, t), -30);
  }
  updateDOM(t, extra);
  return true;
};
window.sceneReady = document.fonts.ready.then(() => { window.renderAt(0); return true; });
