
// =================== cameras ===================
function yardCamera(t) {
  const sh = new THREE.Vector3(SUN_Y.x, 0, SUN_Y.z).normalize();             // look toward the low sun (backlit, golden)
  const side = new THREE.Vector3(-sh.z, 0, sh.x);
  const u = clamp(t / 2.6, 0, 1), dive = smooth(2.5, SHAFT, t);
  const pos = new THREE.Vector3().addScaledVector(sh, -lerp(1.75, 1.35, ease(u))).addScaledVector(side, 0.35); pos.y = lerp(1.05, 0.95, u);
  const look = new THREE.Vector3(0.05, -0.3, 0).addScaledVector(sh, 2.4).addScaledVector(side, -0.1);
  // the dive: glide over the pit, tip straight down and drop in
  const over = new THREE.Vector3(0.02, lerp(0.9, -0.35, smooth(3.1, SHAFT, t)), 0.0), lookDown = new THREE.Vector3(0.02, -3, 0.001);
  pos.lerp(over, ease(dive)); look.lerp(lookDown, ease(smooth(2.5, 3.4, t)));
  yCam.fov = 58; yCam.updateProjectionMatrix(); yCam.position.copy(pos); yCam.lookAt(look); yCam.updateMatrixWorld();
  return Math.max(0.3, pos.distanceTo(new THREE.Vector3(0.2, 0, 0)) * (1 - dive) + 0.5 * dive);
}
function shaftCamera(t, D) {
  const fallMode = t >= CUT;
  const roll = fallMode ? (t - FALL) * 0.35 : t * 0.08;
  let shake = 0; if (!fallMode) { const bt = t - 18.75; if (bt > 0 && bt < 1.4) shake = 0.03 * Math.exp(-bt * 3) * 1; }
  sCam.position.set(Math.sin(t * 37) * shake, Math.cos(t * 41) * shake, Math.sin(t * 29 + 1) * shake);
  // weightless at the center: a slow tumble
  const center = fallMode ? Math.exp(-(((t - (FALL + FALL_LEN / 2)) / 1.6) ** 2)) : 0;
  const tilt = 0.18 + 0.9 * center;
  sCam.up.set(Math.sin(roll), 0, Math.cos(roll));
  sCam.lookAt(Math.sin(roll + 1) * tilt, -1, Math.cos(roll + 1) * tilt);
  sCam.fov = fallMode ? 80 : 72; sCam.updateProjectionMatrix();
}
function earthCamera(t) {
  const u = clamp((t - CUT) / (FALL - CUT), 0, 1), k = ease(smooth(0.05, 0.95, u));
  const d = Math.exp(lerp(Math.log(0.55), Math.log(7.8), k)), a = 0.12 * u;
  const tgt = new THREE.Vector3(0, lerp(0.97, -0.42, k), 0);
  eCam.position.set(Math.sin(a) * d * 0.9, tgt.y + lerp(0.25, 2.2, k), Math.cos(a) * d); eCam.lookAt(tgt);
}
function oceanCamera(t) {
  const sh = new THREE.Vector3(OSUN.x, 0, OSUN.z).normalize(), side = new THREE.Vector3(-sh.z, 0, sh.x);
  const rise = smooth(OCEAN, OCEAN + 1.35, t); const bob = 0.12 * Math.sin((t - OCEAN) * 1.7) * smooth(OCEAN + 1.4, OCEAN + 2.4, t);
  const y = lerp(-3.2, 0.45, ease(rise)) + bob + 0.4 * smooth(OCEAN + 1.3, OCEAN + 1.5, t) * (1 - smooth(OCEAN + 1.5, OCEAN + 2.3, t));
  oCam.position.set(0, y, 0);
  const lookUp = lerp(30, 4, smooth(OCEAN + 0.6, OCEAN + 1.6, t));
  oCam.lookAt(sh.clone().multiplyScalar(100).addScaledVector(side, 30).setY(lookUp));
}

// =================== HUD / captions ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels', 'mini', 'miniDot', 'here'].map(k => [k, $(k)]));
const captions = [
  [4.3, 7.8, 'Problem #1: buried gas lines.<br>Call 811 before you dig.'],
  [8.2, 11.8, 'Problem #2: groundwater.<br>Your hole starts to flood.'],
  [12.2, 16.8, 'Kansas was once a sea floor.<br>The rock is full of shells.'],
  [17.3, 20.4, 'Problem #3: rock bursts.<br>Walls explode under pressure.'],
  [20.6, 22.3, 'The deepest mine: 2.5 miles.'],
  [22.5, 25.3, 'Problem #4: heat.<br>356°F at 7.6 miles.'],
  [25.5, 26.9, 'The rock flows and<br>squeezes the hole shut.'],
  [27.3, 29.6, "That's the deepest hole ever.<br>0.1% of the way."],
  [29.8, 31.9, 'At that pace: 20,000 years<br>to dig through.'],
  [32.3, 35.3, 'Now jump into a magic tube<br>all the way through.'],
  [35.5, 38.6, "The mantle isn't lava.<br>It's solid rock that slowly flows."],
  [38.8, 40.8, 'Then: a sea of liquid iron.'],
  [41.0, 43.6, "The core: 10,800°F.<br>As hot as the Sun's surface."],
  [43.8, 47.4, 'Weightless at the center,<br>flying 22,000 mph.'],
  [47.6, 51.8, '38 minutes later…'],
  [53.6, 56.2, 'Not China.'],
  [56.4, 59.8, "From Kansas, you'd pop out<br>in the Indian Ocean."],
];
const rockF = d => d < 4000 ? lerp(55, 140, d / 4000) : lerp(140, 356, (d - 4000) / 8262);
function depthStr(m) { const ft = m / 0.3048; return ft < 5280 ? fmt(ft) + ' ft' : (ft / 5280).toFixed(ft < 52800 ? 1 : 0) + ' mi'; }
function hudAt(t, S) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < SHAFT + 0.2) show = 0;
  else if (t < CUT) {
    const D = S.D; lab = 'DEPTH'; val = depthStr(D); sub = 'ROCK: ' + fmt(rockF(D)) + '°F';
    if (t < 8) stat = '<b></b>PROBLEM #1'; else if (t < 12) stat = '<b></b>PROBLEM #2'; else if (t > 17.2 && t < 22.3) stat = '<b></b>PROBLEM #3'; else if (t > 22.3) stat = '<b></b>PROBLEM #4';
    if (t > 20.4 && t < 22.3) sub = 'MPONENG MINE · ROCK 140°F'; if (t > 24.5) { val = '7.6 mi'; sub = 'KOLA SUPERDEEP BOREHOLE · 356°F'; }
  }
  else if (t < FALL) { lab = 'DEEPEST HOLE EVER'; val = '7.6 mi'; sub = 'OF 7,900 MILES · 19 YEARS OF DRILLING'; if (t > 29.8) { stat = '<b></b>MODEL'; } }
  else if (t < OCEAN) { const f = S.f; stat = '<b></b>MODEL · NO AIR, HEAT-PROOF TUBE'; lab = 'SPEED'; val = fmt(f.mph) + ' mph'; sub = `${Math.floor(f.min)} MIN · GRAVITY ${f.g.toFixed(2)} G`; }
  else if (t < T_END) { if (t < OCEAN + 1.4) show = 0; lab = 'YOU COME OUT IN'; val = 'Indian Ocean'; sub = '38°S 82°E · OPPOSITE KANSAS'; }
  else show = 0;
  return { stat, lab, val, sub, show };
}
function updateDOM(t, S) {
  el.title.style.opacity = 1 - smooth(2.4, 2.9, t);
  const h = hudAt(t, S); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.3) : 0;
  const dip = Math.max(fadeWin(t, SHAFT - 0.18, SHAFT + 0.18, 0.18), fadeWin(t, CUT - 0.3, CUT + 0.3, 0.3), fadeWin(t, FALL - 0.3, FALL + 0.25, 0.25));
  el.veil.style.background = '#000000'; el.veil.style.opacity = dip;
  el.flash.style.opacity = Math.max(0.85 * fadeWin(t, OCEAN + 1.2, OCEAN + 1.75, 0.2), 0.6 * fadeWin(t, OCEAN - 0.35, OCEAN + 0.15, 0.2), 0.35 * fadeWin(t, 18.72, 19.05, 0.12));
  // mini-map of the cut Earth with your position during the fall
  const mA = smooth(FALL + 0.2, FALL + 0.8, t) * (1 - smooth(OCEAN - 0.6, OCEAN - 0.2, t)); el.mini.style.opacity = mA;
  if (mA > 0) { const f = S.f || fallState(t); el.miniDot.setAttribute('cy', (20 + 200 * f.depthKm / 12742).toFixed(1)); }
  // "you are here" on the cut Earth
  const hA = fadeWin(t, CUT + 0.4, FALL - 0.4, 0.4); el.here.style.opacity = hA;
  if (hA > 0) { eCam.updateMatrixWorld(); const p = new THREE.Vector3(0, 0.998, 0).project(eCam); el.here.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.here.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px'; }
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
window.renderAt = (t) => {
  grain.uniforms.uT.value = t;
  const S = {};
  if (t < SHAFT) { poseSpade(t); const fd = yardCamera(t);
    post(yard, yCam, { dof: { focus: fd, aperture: 0.0035 * (1 - smooth(2.5, 3.2, t)) + 0.0001, maxblur: 0.006 }, bloom: 0.25, exp: 0.85, con: 1.12, sat: 1.2, warm: 0.04 }); }
  else if (t < CUT || (t >= FALL && t < OCEAN)) { const r = updateShaft(t); S.D = r.D; if (t >= FALL) S.f = fallState(t); shaftCamera(t, r.D);
    post(shaft, sCam, t < CUT ? { bloom: 0.15, bloomT: 1.5, exp: 1.5, con: 1.1, sat: 1.05, warm: 0.02 } : { bloom: 0.45, bloomR: 0.7, bloomT: 1.2, exp: 0.78, con: 1.1, sat: 1.15 }); }
  else if (t < FALL) { earthCamera(t); layerU.uT.value = t; traveler.visible = false; travGlow.visible = false;
    tunnel.visible = t > FALL - 2.2; tunnel.scale.y = smooth(FALL - 2.2, FALL - 0.4, t); tunnel.position.y = 1 - tunnel.scale.y;
    post(space, eCam, { bloom: 0.45, bloomR: 0.5, bloomT: 1.1, exp: 1.0, con: 1.05, sat: 1.1 }); }
  else { oceanCamera(t); updateOcean(t); water.material.uniforms.time.value = t * 0.6;
    post(ocean, oCam, oCam.position.y < 0 ? { bloom: 0.3, bloomT: 1.2, exp: 0.55, con: 1.12, sat: 1.2 } : { bloom: 0.2, bloomR: 0.4, bloomT: 4.0, exp: 0.5, con: 1.16, sat: 1.22 }); }
  composer.render();
  updateDOM(t, S);
  return true;
};
window.sceneReady = (async () => {
  FALLT = await (await fetch('data/hole_fall.json')).json();
  await buildYard(); await buildShaft(); await buildEarth(); await buildOcean(); await document.fonts.ready; window.renderAt(0); return true; })();
