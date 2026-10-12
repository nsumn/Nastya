// =================== street update + cameras ===================
function setDay(london) {
  if (london) { skyMat.uniforms.uTop.value.set('#8f99a6'); skyMat.uniforms.uHor.value.set('#c9ced4'); sunL.intensity = 1.1; sunL.color.set('#f2f0ec'); hemi.intensity = 1.7; hemi.color.set(0xd8dde4); hemi.groundColor.set(0x6a625a); city.fog.color.set('#c2c7cd'); city.fog.near = 120; city.fog.far = 1100; }
  else { skyMat.uniforms.uTop.value.set('#3d78c8'); skyMat.uniforms.uHor.value.set('#bcd6ee'); sunL.intensity = 3.0; sunL.color.set('#fff2dc'); hemi.intensity = 1.1; hemi.color.set(0xbfd6f2); hemi.groundColor.set(0x5b4e40); city.fog.color.set('#bcd0e4'); city.fog.near = 200; city.fog.far = 2400; }
  for (const m of winMats) m.emissiveIntensity = 0; for (const m of lampHeads) m.emissiveIntensity = 0;
  clouds.forEach(c => { c.visible = london; c.material.color.set('#e4e6ea'); });
}
function updateStreet(t, shot) {
  const london = shot !== 'times'; setDay(london);
  sunL.position.copy(cam.position).add(new THREE.Vector3(-90, 160, 120)); sunL.target.position.copy(cam.position); sunL.target.updateMatrixWorld();
  for (const c of cars) { if (c.cross) continue; c.g.visible = false; }
  for (const P of people) P.p.outer.visible = false;
  ball.visible = false;
  for (const J of jam) J.g.visible = london && !(shot === 'talk' && Math.abs(J.x - 360) < 7 && J.lane > 3);
  for (const B of bunting) B.tri.rotation.x = 0.25 * Math.sin(t * 3 + B.ph);
  const pairX = 360;
  for (const C of londonCrowd) {
    const o = C.p.outer; const show = london && Math.hypot(C.x - cam.position.x, C.z - cam.position.z) > 2.4 && !(shot === 'talk' && Math.abs(C.x - pairX) < 4.0 && C.z > 0.5);
    o.visible = show; if (!show) continue;
    const x = C.walk ? C.x + Math.sin(t * 0.4 + C.ph) * 0.6 : C.x;
    o.position.set(x, (Math.abs(C.z) > 7 ? 0.18 : 0) + 0.95, C.z); o.rotation.set(0, C.ry, 0);
    if (C.walk) poseWalk(C.p, t * 4 + C.ph, 0.6); else poseIdle(C.p, t, C.ph);
  }
  // Times Square: one Brit with a cup of tea, a tumbleweed
  brit.outer.visible = weed.visible = shot === 'times';
  if (shot === 'times') {
    brit.outer.position.set(78.5, 0.95, 0.9); brit.outer.rotation.set(0, -Math.PI / 2 + 0.25, 0); poseIdle(brit, t, 0);
    const sip = 0.5 + 0.5 * Math.sin((t - T_TIMES) * 1.6); brit.arms[1].rotation.x = -0.5 - 0.5 * sip; brit.elbows[1].rotation.x = -1.3 - 0.4 * sip;
    const wx = lerp(150, 70, (t - T_TIMES) / (T_USMAP - T_TIMES)); weed.position.set(wx, 0.5 + Math.abs(Math.sin(t * 3.2)) * 0.6, -3.2); weed.rotation.set(0, 0, t * 3.0);
  }
  yank.outer.visible = clerk.outer.visible = shot === 'talk';
  if (shot === 'talk') {
    yank.outer.position.set(pairX - 0.5, 1.13, 9.9); yank.outer.rotation.set(0, Math.PI * 0.3, 0); poseIdle(yank, t, 1);
    clerk.outer.position.set(pairX + 0.55, 1.13, 10.1); clerk.outer.rotation.set(0, -Math.PI * 0.3, 0); poseIdle(clerk, t, 2);
    const talkA = Math.sin(t * 6) > 0 ? 1 : 0; yank.arms[0].rotation.x = -0.4 - 0.5 * talkA * (t < 53.6 ? 1 : 0.3);
  }
}
function streetCamera(t, shot) {
  let pos, look, fov = 62;
  if (shot === 'london') { const u = (t - T_LONDON) / (T_SHOP - T_LONDON); pos = new THREE.Vector3(lerp(292, 297, u), lerp(7.5, 6.8, u), lerp(-1.0, 0.0, u)); look = new THREE.Vector3(lerp(330, 336, u), 0.5, lerp(-0.5, 0.5, u)); fov = 60; }
  else if (shot === 'times') { const u = (t - T_TIMES) / (T_USMAP - T_TIMES); pos = new THREE.Vector3(lerp(70, 73, u), 1.6, 1.6); look = pos.clone().add(new THREE.Vector3(1, 0.32, -0.04)); fov = 70; }
  else { const u = (t - T_TALK) / (T_MID - T_TALK); pos = new THREE.Vector3(lerp(359.6, 360.3, u), 1.9, 5.4); look = new THREE.Vector3(360.0, 2.05, 11.0); fov = 56; }
  cam.fov = fov; cam.near = 0.1; cam.far = 6000; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'b1', 'b2', 'l1', 'l2'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [3.3, 5.6, 'Problem one: there are<br>5 Americans for every Brit.'],
  [5.8, 7.8, 'And Britain is smaller<br>than Oregon.'],
  [8.3, 10.9, 'By plane? Every airliner on Earth<br>would need a month.'],
  [11.1, 13.8, "So let's say everyone<br>teleports at midnight."],
  [16.6, 20.8, 'Britain gets denser<br>than Bangladesh.'],
  [21.0, 25.6, '11 Americans in every<br>British home.'],
  [26.3, 29.8, 'And they all drive<br>on the left.'],
  [30.0, 33.7, 'Good news: the road signs<br>are still in miles.'],
  [34.3, 36.9, 'British farms could feed<br>about 1 in 8 of them.'],
  [37.1, 39.7, 'By lunch, the shelves<br>are empty.'],
  [40.3, 42.6, 'Meanwhile, 69 million Brits<br>get all of America.'],
  [42.8, 44.8, 'Still making 100 million<br>cups of tea a day.'],
  [45.3, 47.4, 'America gets emptier<br>than Idaho.'],
  [47.6, 49.8, 'Every Brit gets<br>two houses.'],
  [50.3, 53.5, 'Ask for "pants" in London —<br>you get underwear.'],
  [53.7, 56.8, 'Chips are fries.<br>Crisps are chips.'],
  [57.3, 59.1, 'At midnight,<br>everyone goes home.'],
  [59.2, 60.9, 'Who had the<br>better day?'],
];
const BUBBLES = [
  [50.4, 52.0, 'b1', 'Where can I buy pants?'], [51.9, 53.5, 'b2', "Underwear's in aisle 3."],
  [53.8, 55.3, 'b1', 'Chips, please!'], [55.2, 56.8, 'b2', 'Crisps or chips?'],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < T_RATIO) show = 0;
  else if (t < T_AIR) { stat = '<b></b>🇺🇸 342M · 🇬🇧 69M'; lab = 'AMERICANS PER BRIT'; val = '4.9'; sub = 'UK: 93,410 SQ MI · OREGON: 95,988'; }
  else if (t < T_TELE) { const d = Math.max(1, Math.ceil(31 * smooth(T_AIR + 0.3, T_TELE - 1.2, t))); stat = '<b></b>EVERY AIRLINE ON EARTH'; lab = 'AIRLIFT'; val = 'Day ' + d; sub = '13.4M PASSENGERS A DAY'; }
  else if (t < T_UKMAP + 0.3) show = 0;
  else if (t < T_LONDON) { const k = smooth(T_UKMAP + 1.6, T_UKMAP + 7.2, t); stat = '<b></b>🇬🇧 GREAT BRITAIN'; lab = 'PEOPLE / SQ MI'; val = fmtInt(lerp(741, 3659, k)); sub = 'BANGLADESH: 3,417'; }
  else if (t < T_SHOP) { stat = '<b></b>🇬🇧 LONDON'; lab = 'AMERICAN DRIVERS'; val = '237.7M'; sub = 'FOR 41.7M UK VEHICLES'; }
  else if (t < T_TIMES) { stat = '<b></b>MODEL'; lab = 'FOOD'; val = '1 in 8'; sub = 'UK GROWS ~60% OF ITS OWN FOOD'; }
  else if (t < T_USMAP) { stat = '<b></b>🇺🇸 TIMES SQUARE'; lab = 'BRITS'; val = '69M'; sub = 'IN A COUNTRY BUILT FOR 342M'; }
  else if (t < T_TALK) { const k = smooth(T_USMAP + 0.6, T_USMAP + 2.4, t); stat = '<b></b>🇺🇸 USA'; lab = 'PEOPLE / SQ MI'; val = lerp(96.8, 19.6, k).toFixed(1); sub = 'IDAHO: ~24'; }
  else if (t < T_MID) show = 0;
  else show = 0;
  return { stat, lab, val, sub, show };
}
function placeTag(e, v3, camera, dy, a) {
  camera.updateMatrixWorld();
  const p = v3.clone().project(camera); const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
  e.style.left = clamp(x, 200, W - 200) + 'px'; e.style.top = (y + dy) + 'px'; e.style.opacity = p.z < 1 ? a : 0;
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(T_RATIO - 0.35, T_RATIO, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const cuts = [T_RATIO, T_AIR, T_UKMAP, T_LONDON, T_SHOP, T_TIMES, T_USMAP, T_TALK, T_MID];
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(...cuts.map(x => fadeWin(t, x - 0.18, x + 0.18, 0.18)));
  el.flash.style.opacity = fadeWin(t, T_TELE + 0.6, T_UKMAP + 0.2, 0.5) * 0.95;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  for (const id of ['b1', 'b2']) el[id].style.opacity = 0;
}
function updateTags(t, shot) {
  // speech bubbles in the talk shot, group labels in the studio / globe
  if (shot === 'talk') for (const [a, b, id, txt] of BUBBLES) if (t >= a - 0.2 && t < b + 0.2) { el[id].textContent = txt; const who = id === 'b1' ? yank : clerk; placeTag(el[id], who.outer.position.clone().add(new THREE.Vector3(0, 0.95, 0)), cam, -30, fadeWin(t, a, b, 0.2)); }
  const showS = shot === 'studio' ? fadeWin(t, T_RATIO + 0.3, T_AIR, 0.3) : 0, showG = shot === 'globe-intro' ? smooth(0.8, 1.4, t) : shot === 'globe-back' ? fadeWin(t, T_MID + 0.4, T_END, 0.3) : 0;
  if (showS > 0) { el.l1.innerHTML = '🇺🇸 342 MILLION'; el.l2.innerHTML = '🇬🇧 69 MILLION'; placeTag(el.l1, new THREE.Vector3(0, 3.0, -3.4), stCam, -20, showS * smooth(T_RATIO + 1.0, T_RATIO + 1.6, t)); placeTag(el.l2, new THREE.Vector3(0, 2.6, 3.6), stCam, -20, showS); }
  else if (showG > 0) { el.l1.innerHTML = '🇺🇸 USA'; el.l2.innerHTML = '🇬🇧 UK'; placeTag(el.l1, ll2v(...US_C, ER * 1.05), spaceCam, -30, showG); placeTag(el.l2, ll2v(...UK_C, ER * 1.05), spaceCam, -30, showG); }
  else { el.l1.style.opacity = 0; el.l2.style.opacity = 0; }
}

// =================== main ===================
function shotAt(t) {
  return t < T_RATIO ? 'globe-intro' : t < T_AIR ? 'studio' : t < T_TELE ? 'globe-air' : t < T_UKMAP ? 'globe-tele' : t < T_LONDON ? 'ukmap' : t < T_SHOP ? 'london'
    : t < T_TIMES ? 'shop' : t < T_USMAP ? 'times' : t < T_TALK ? 'usmap' : t < T_MID ? 'talk' : 'globe-back';
}
window.renderAt = (t) => {
  updateDOM(t);
  const shot = shotAt(t);
  if (shot.startsWith('globe')) globeCamera(t, shot.slice(6) === 'tele' ? 'tele' : shot.slice(6));
  else if (shot === 'studio') updateStudio(t);
  else if (shot === 'london' || shot === 'times' || shot === 'talk') { streetCamera(t, shot); updateStreet(t, shot); }
  updateTags(t, shot);
  if (window.PASS === 'text') return true;
  renderer.setRenderTarget(null); renderer.clear();
  if (shot.startsWith('globe')) { updateGlobe(t, shot.slice(6)); renderer.render(space, spaceCam); }
  else if (shot === 'studio') renderer.render(studio, stCam);
  else if (shot === 'ukmap') { updateMaps(t, 'uk'); renderer.render(mapScene, mapCam); }
  else if (shot === 'usmap') { updateMaps(t, 'us'); renderer.render(mapScene, mapCam); }
  else if (shot === 'shop') { updateShop(t); renderer.render(shop, shopCam); }
  else renderer.render(city, cam);
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe().then(buildMaps)]).then(() => { window.renderAt(0); return true; });
