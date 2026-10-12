
// =================== bus ===================
function busAt(t) {
  const hold = t >= HOLD;
  rails.forEach(r => { r.visible = !hold; });
  street.position.z = ((t * 6) % 7);                                     // driving
  busIn.position.y = 0.012 * Math.sin(t * 13) + 0.008 * Math.sin(t * 7.3) + (t > POP && t < POP + 0.4 ? 0.03 * Math.sin((t - POP) * 40) : 0);
  for (const [i, r] of riders.entries()) {
    const o = r.p.outer; o.visible = true; const y0 = r.seated ? 0.52 + 0.95 - 0.96 * r.p.h + 0.08 : 0.95;
    o.position.set(r.x, y0, r.z); o.rotation.set(0, Math.PI, 0);
    if (r.seated) poseSit(r.p); else { poseIdle(r.p, t, r.ph); r.p.arms[0].rotation.set(-2.9, 0, 0.1); r.p.elbows[0].rotation.x = -0.2; }
    if (!hold) {
      // awkward glances after the moment
      const g = t - (AWK - 0.6 + r.react * 0.6);
      if (g > 0) o.rotation.y = Math.PI + r.look * 0.75 * Math.max(0, Math.sin(Math.min(g, 2.2) / 2.2 * Math.PI)) + 0.15 * Math.sin(t * 0.8 + r.ph) * smooth(0, 0.5, g);
      // smell: hand to the nose, staggered
      const s = smooth(SMELL + 0.6 + r.react * 1.2, SMELL + 1.2 + r.react * 1.2, t);
      if (s > 0) { r.p.arms[1].rotation.set(lerp(r.p.arms[1].rotation.x, -2.25, s), 0, lerp(0, 0.35, s)); r.p.elbows[1].rotation.x = lerp(r.p.elbows[1].rotation.x, -2.1, s); }
    } else {
      o.rotation.y = Math.PI + 0.1 * Math.sin(t * 0.6 + r.ph);
      if (holder && r !== holder) o.visible = !(Math.abs(r.x - holder.x) < 0.6 && r.z < holder.z && r.z > holder.z - 2.0);
      if (r === holder) { if (r.mouth) r.mouth.scale.set(0.05 * (t < HOLD + 5.4 ? 0.6 : 1.4), t < HOLD + 5.4 ? 0.008 : 0.03, 0.01); o.rotation.y = Math.PI; poseSit(r.p); r.p.arms[0].rotation.x = -0.15; r.p.arms[1].rotation.x = -0.15; r.p.elbows[0].rotation.x = -0.05; r.p.elbows[1].rotation.x = -0.05; o.position.y += 0.02 * Math.sin(t * 20) * smooth(HOLD + 1, HOLD + 4.5, t) * (t < HOLD + 5.3 ? 1 : 0); }
    }
    // the puff under each rider
    const pa = t - POP - (i % 7) * 0.035; const on = !hold && pa > 0 && pa < 2.5; const sp = busPuffs[i];
    sp.material.opacity = on ? 0.75 * Math.min(1, pa * 6) * (1 - smooth(0.8, 2.5, pa)) : 0; sp.scale.setScalar(0.25 + 0.6 * Math.min(pa, 1.2));
    sp.position.set(r.x + (r.seated ? 0 : 0), r.seated ? 0.45 + 0.25 * pa : 0.85 + 0.2 * pa, r.z + (r.seated ? -0.22 : -0.15) - 0.15 * pa);
  }
  // haze builds up, then the window opens
  const hz = !hold ? smooth(POP + 1.5, SMELL + 3.5, t) : 0;
  haze.forEach(h => { h.s.material.opacity = hz * (0.28 + 0.12 * Math.sin(t * 0.7 + h.ph * 6)); h.s.scale.setScalar(1.6 + 0.6 * Math.sin(h.ph * 9 + t * 0.3)); h.s.position.x += 0; });
  busFog.color.set('#d8dccf').lerp(new THREE.Color('#bcd27a'), hz * 0.85); busFog.near = lerp(40, 1.5, hz); busFog.far = lerp(120, 14, hz);
  slidePane.position.z = 1.2 - 0.9 * smooth(SMELL + 2.5, SMELL + 3.4, t) * (hold ? 0 : 1);
  // the one who held it: breathe out
  const ex = t - (HOLD + 5.4); mouthPuff.material.opacity = ex > 0 && ex < 2.4 ? 0.9 * Math.min(1, ex * 5) * (1 - smooth(1.2, 2.4, ex)) : 0;
  if (holder) { const hp = new THREE.Vector3(0, 0.66, 0.22); holder.p.root.updateMatrixWorld(true); const head = holder.p.root.localToWorld(new THREE.Vector3(0, 1.575, 0.12)); const e2 = Math.max(ex, 0); mouthPuff.position.copy(head).add(new THREE.Vector3(0.12 * e2, 0.04 * e2, -0.4 * e2)); mouthPuff.scale.setScalar(0.08 + 0.32 * Math.max(0, Math.min(ex, 1.5))); }
  // camera: at the front, looking down the aisle; the hold shot pushes in on one face
  if (!hold) { const u = smooth(0, SMELL + 5, t); busCam.position.set(lerp(0.05, -0.15, u), lerp(1.62, 1.55, u), -5.6 + 0.4 * u); busCam.lookAt(0.05, 1.05, 3.0); busCam.fov = 58; }
  else { const k = ease((t - HOLD) / 5.0); const hz2 = holder ? holder.p.root.localToWorld(new THREE.Vector3(0, 1.6, 0)) : new THREE.Vector3(0, 1.3, 0); busCam.position.set(lerp(-0.1, hz2.x + 0.05, k), lerp(1.6, hz2.y + 0.02, k), lerp(-5.4, hz2.z - 1.6, k)); busCam.lookAt(hz2.x, hz2.y - 0.12 * (1 - k), hz2.z); busCam.fov = lerp(58, 40, k); }
  busCam.updateProjectionMatrix();
}
// =================== plane ===================
function planeAt(t) {
  const u = (t - PLANE) / (EARTH - PLANE);
  aircraft.position.set(0, 0.25 * Math.sin(t * 0.9), 0); aircraft.rotation.set(0.02 * Math.sin(t * 0.7), 0.0, 0.32 + 0.01 * Math.sin(t * 0.5));
  cloudsBelow.forEach(c => { c.position.x -= 0; });
  const k = ease(clamp((u - 0.12) * 1.6, 0, 1));
  planeCam.position.set(lerp(-4, 2.6, k), lerp(-8, 1.4, k), lerp(78, 8.0, k)); planeCam.lookAt(lerp(-1, 2.6, k), lerp(-1, 0.6, k), 0); planeCam.fov = lerp(44, 40, k); planeCam.updateProjectionMatrix();
  planeRiders.forEach((r, i) => { const pa = t - (PLANE + 2.2) - (i % 9) * 0.04; const on = pa > 0 && pa < 2.8; const s = planePuffs[i];
    s.material.opacity = on ? 0.8 * Math.min(1, pa * 6) * (1 - smooth(1.0, 2.8, pa)) : 0; s.scale.setScalar(0.3 + 0.5 * Math.min(pa, 1.2)); s.position.set(r.x + 0.1, -0.45 + 0.3 * pa, r.z); });
  const ch = smooth(PLANE + 4.4, PLANE + 5.2, t); planeSeatM.color.set('#2f5d8a').lerp(new THREE.Color('#2a2a2c'), ch);
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [3.2, 5.9, '50 people. One bus.<br>One second.'],
  [6.2, 9.8, 'Nobody makes<br>eye contact.'],
  [10.2, 12.4, 'Will you smell it?<br>Oh yes.'],
  [12.6, 14.8, 'Your nose catches rotten-egg<br>gas at under a billionth.'],
  [15.3, 18.6, 'Worst seat: a plane.<br>Up there, your gut makes more gas.'],
  [18.8, 21.8, 'Doctors actually suggested<br>charcoal seat cushions.'],
  [22.3, 26.8, 'Now everyone on Earth.<br>The same second.'],
  [27.3, 29.0, 'Cows? Hold on…'],
  [29.2, 31.8, 'About 95% of their methane<br>comes out the front.'],
  [32.3, 35.8, 'Herring fart to<br>talk to each other.'],
  [36.3, 39.8, "Sloths can't fart<br>at all."],
  [40.3, 43.6, 'All of it together:<br>a cube of gas…'],
  [43.8, 46.8, '…as tall as the<br>Statue of Liberty.'],
  [47.3, 49.8, 'Can you light it?'],
  [50.0, 52.8, 'Nope. In the open air,<br>it’s less than a trillionth.'],
  [53.3, 55.8, 'And if you hold<br>it in?'],
  [56.0, 58.2, "It doesn't disappear."],
  [58.4, 60.9, 'Some seeps into your blood…<br>and you breathe it out.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < POP) { lab = 'EVERYONE, ON'; val = String(3 - Math.floor(t)); sub = 'THE SAME SECOND'; show = smooth(0.15, 0.5, t); }
  else if (t < SMELL) { lab = 'GAS IN THIS BUS'; val = (Math.min(1, (t - POP) / 1.2) * 4.5).toFixed(1) + ' L'; sub = '50 PEOPLE × ~90 ML'; }
  else if (t < PLANE) { lab = 'YOUR NOSE DETECTS'; val = '< 1 ppb'; sub = 'ROTTEN-EGG GAS (H₂S)'; }
  else if (t < EARTH) { stat = '<b></b>NZ MEDICAL JOURNAL, 2013'; lab = 'AT 35,000 FT'; val = 'More gas'; sub = t < PLANE + 4.4 ? 'LOWER CABIN PRESSURE' : 'FIX: CHARCOAL CUSHIONS'; }
  else if (t < COW) { lab = 'PEOPLE'; val = '8.2 billion'; sub = 'ONE SECOND'; }
  else if (t < FISH) { lab = 'COW METHANE'; val = t < 29.2 ? '…' : '~95%'; sub = t < 29.2 ? 'WAIT FOR IT' : 'COMES OUT AS BURPS'; }
  else if (t < SLOTH) { lab = 'HERRING'; val = 'FRT'; sub = '"FAST REPETITIVE TICK"'; }
  else if (t < CUBE) { lab = 'SLOTH FARTS'; val = '0'; sub = 'THEY BREATHE IT OUT INSTEAD'; }
  else if (t < LIGHT) { const k = ease((t - (CUBE + 0.6)) / 3.8); lab = 'ALL OF EARTH'; val = (Math.round(26 * k * 10) / 10).toFixed(1) + 'M cu ft'; sub = t < CUBE + 4.5 ? '≈ 738,000 M³' : '≈ 1,000 TONS'; }
  else if (t < HOLD) { lab = 'SHARE OF THE AIR'; val = '< 1 ppt'; sub = 'LESS THAN ONE TRILLIONTH'; }
  else { lab = 'HELD IN'; val = 'Breathed out'; sub = "IT'S HOW HYDROGEN BREATH TESTS WORK"; show = smooth(HOLD + 2.5, HOLD + 3.2, t); }
  return { stat, lab, val, sub, show };
}
function proj(v, camera) { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (1 - (p.y * 0.5 + 0.5)) * H, p.z]; }
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(POP - 0.3, POP, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  const cuts = [PLANE, EARTH, COW, FISH, SLOTH, CUBE, HOLD].map(x => fadeWin(t, x - 0.22, x + 0.22, 0.2));
  el.veil.style.background = '#05070d'; el.veil.style.opacity = Math.max(...cuts) * 0.9;
  el.flash.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  let L = '';
  if (t >= CUBE + 3.6 && t < LIGHT) {
    const op = smooth(CUBE + 3.6, CUBE + 4.4, t) * (1 - smooth(LIGHT - 0.4, LIGHT, t));
    const a = proj(new THREE.Vector3(4, 99, 0), nyCam), b = proj(new THREE.Vector3(GAS_X, CUBE_S + 6, GAS_Z), nyCam);
    if (a[2] < 1) L += `<div class="lbl" style="left:${a[0].toFixed(0)}px;top:${a[1].toFixed(0)}px;opacity:${op}">STATUE OF LIBERTY<br><span class="big">305 ft</span></div>`;
    if (b[2] < 1) L += `<div class="lbl gas" style="left:${b[0].toFixed(0)}px;top:${b[1].toFixed(0)}px;opacity:${op}">EVERYONE'S GAS<br><span class="big">297 ft</span></div>`;
  }
  el.labels.innerHTML = L;
}
// re-timed views of the shared scenes (they were written for the v1 timeline: remap t)
const remap = (t, from, to) => to + (t - from);
function render2(t) {
  renderer.setRenderTarget(null); renderer.clear();
  if (t < PLANE || t >= HOLD) { busAt(t); renderer.render(bus, busCam); }
  else if (t < EARTH) { planeAt(t); renderer.render(plane, planeCam); }
  else if (t < COW) { globeAt(remap(t, EARTH, 2.3)); renderer.render(gScene, gCam); }
  else if (t < FISH) { farmAt(remap(t, COW, 26.6)); renderer.render(farm, farmCam); }
  else if (t < SLOTH) { seaAt(remap(t, FISH, 34.0)); renderer.render(sea, seaCam); }
  else if (t < CUBE) { jungleAt(remap(t, SLOTH, 40.0)); renderer.render(jungle, jCam); }
  else if (t < LIGHT) { nyAt(remap(t, CUBE, 8.0)); renderer.render(ny, nyCam); }
  else { nyAt(remap(t, LIGHT, 51.0)); renderer.render(ny, nyCam); }
}
window.renderAt = (t) => {
  if (t >= CUBE && t < LIGHT) nyAt(remap(t, CUBE, 8.0));
  updateDOM(t);
  if (window.PASS === 'text') return true;
  render2(t);
  return true;
};
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe()]).then(() => { window.renderAt(0); return true; });
