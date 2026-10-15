// =================== the phone screen ===================
const CALLS = [{ a: 0.0, b: 4.6, act: 'decline' }, { a: 5.3, b: 6.7, act: 'decline' }, { a: 7.3, b: 8.5, act: 'decline' }, { a: 9.0, b: 10.1, act: 'accept' }];
const RING2 = 55.0;
const BTN = { decline: [0.27, 0.83], accept: [0.73, 0.83] };
function phoneAt(t) {
  if (t >= DAWN) return t >= RING2 ? { mode: 'incoming', ring: RING2, night: false } : { mode: 'lock', missed: 4, clock: '6:42', night: false };
  const acc = CALLS[3]; if (t >= acc.b) return { mode: 'call', since: acc.b };
  for (const c of CALLS) { if (t >= c.a && t < c.b) return { mode: 'incoming', ring: c.a }; if (c.act === 'decline' && t >= c.b && t < c.b + 0.45) return { mode: 'declined' }; }
  return { mode: 'lock', missed: CALLS.filter(c => c.act === 'decline' && t >= c.b).length, clock: '3:07' };
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function phoneIcon(g, x, y, s, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-s * 0.45, -s * 0.12, s * 0.2, s * 0.13, 0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(s * 0.45, -s * 0.12, s * 0.2, s * 0.13, -0.5, 0, 7); g.fill(); g.fillRect(-s * 0.45, -s * 0.3, s * 0.9, s * 0.16); g.restore(); }
function voiceEnv(t) { return Math.max(fadeWin(t, 11.6, 12.7, 0.15), fadeWin(t, 13.2, 14.7, 0.15)); }
function drawScreen(t) {
  const g = scrG, w = 540, h = 1154, s = phoneAt(t);
  g.clearRect(0, 0, w, h); g.save(); rr(g, 0, 0, w, h, 62); g.clip();
  const bgr = g.createLinearGradient(0, 0, w * 0.4, h); bgr.addColorStop(0, s.night === false ? '#3a5aa0' : '#1d2c62'); bgr.addColorStop(1, s.night === false ? '#c07a6a' : '#5a3a80'); g.fillStyle = bgr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.arc(w * 0.8, h * 0.3, 260, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.1, h * 0.75, 200, 0, 7); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.fillStyle = 'rgba(0,0,0,0.85)'; rr(g, w / 2 - 70, 22, 140, 38, 19); g.fill();      // camera pill
  if (s.mode === 'incoming') {
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 30px Inter'; g.fillText('incoming call', w / 2, 170);
    g.fillStyle = '#fff'; g.font = '600 74px Inter'; g.fillText('Scam Likely', w / 2, 262);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 34px Inter'; g.fillText('(202) 555-0148', w / 2, 318);
    const pr = (t - s.ring) % 1.2; g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pr / 1.2)})`; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, 540, 96 + pr * 60, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(w / 2, 540, 92, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '600 110px Inter'; g.fillText('?', w / 2, 578);
    const [dx, dy] = BTN.decline, [ax, ay] = BTN.accept;
    g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(dx * w, dy * h, 64, 0, 7); g.fill(); phoneIcon(g, dx * w, dy * h + 6, 60, Math.PI * 0.75);
    const wob = Math.sin(t * 12) * 0.12 * (((t - s.ring) % 1.2) < 0.7 ? 1 : 0);
    g.fillStyle = '#34c759'; g.beginPath(); g.arc(ax * w, ay * h, 64, 0, 7); g.fill(); phoneIcon(g, ax * w, ay * h + 4, 60, wob);
    g.fillStyle = '#fff'; g.font = '500 28px Inter'; g.fillText('Decline', dx * w, dy * h + 110); g.fillText('Accept', ax * w, ay * h + 110);
  } else if (s.mode === 'declined') {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '600 60px Inter'; g.fillText('Scam Likely', w / 2, 500); g.fillStyle = '#ff6a60'; g.font = '500 40px Inter'; g.fillText('Call Declined', w / 2, 570);
  } else if (s.mode === 'lock') {
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 32px Inter'; g.fillText(s.clock === '3:07' ? 'Thursday, October 16' : 'Thursday, October 16', w / 2, 150);
    g.fillStyle = '#fff'; g.font = '300 170px Inter'; g.fillText(s.clock, w / 2, 320);
    const n = Math.min(4, s.missed);
    for (let i = 0; i < n; i++) { const y = 420 + i * 128; g.fillStyle = 'rgba(255,255,255,0.24)'; rr(g, 30, y, w - 60, 112, 28); g.fill();
      g.fillStyle = '#34c759'; rr(g, 52, y + 26, 60, 60, 14); g.fill(); phoneIcon(g, 82, y + 60, 40);
      g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = '600 30px Inter'; g.fillText('Missed Call', 132, y + 48); g.font = '400 30px Inter'; g.fillText('Scam Likely', 132, y + 88);
      g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '400 24px Inter'; g.fillText(i === 0 ? 'now' : (s.clock === '3:07' ? i + 'm ago' : (3 * i + 3) + 'h ago'), w - 54, y + 48); g.textAlign = 'center'; }
  } else if (s.mode === 'call') {
    const sec = Math.floor(t - s.since); g.fillStyle = '#0c0f18'; g.globalAlpha = 0.55; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    g.fillStyle = '#fff'; g.font = '600 64px Inter'; g.fillText('Scam Likely', w / 2, 230); g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 36px Inter'; g.fillText('00:0' + Math.min(9, sec), w / 2, 288);
    const env = voiceEnv(t);
    for (let i = 0; i < 28; i++) { const x = 60 + i * 15.5, k = 0.06 + env * (0.35 + 0.65 * Math.abs(Math.sin(t * 9 + i * 0.7) * Math.sin(t * 5.3 + i * 1.9))) * (1 - Math.abs(i - 13.5) / 16);
      g.fillStyle = env > 0.05 ? '#9fd0ff' : 'rgba(255,255,255,0.5)'; rr(g, x, 540 - k * 150, 9, Math.max(9, k * 300), 4.5); g.fill(); }
    const lab = ['mute', 'keypad', 'speaker', 'add', 'video', 'contacts'];
    lab.forEach((l, i) => { const x = w * (0.22 + 0.28 * (i % 3)), y = 720 + Math.floor(i / 3) * 150; g.fillStyle = i === 2 ? '#fff' : 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(x, y, 46, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 22px Inter'; g.fillText(l, x, y + 78); });
    g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(w / 2, 0.88 * h, 60, 0, 7); g.fill(); phoneIcon(g, w / 2, 0.88 * h + 6, 56, Math.PI * 0.75);
  }
  g.restore(); scrTex.needsUpdate = true;
}
// =================== bedroom animation + camera ===================
const TAPS = [[4.6, 'decline'], [6.7, 'decline'], [8.5, 'decline'], [10.1, 'accept']];
function updateBed(t) {
  const dawn = t >= DAWN; const s = phoneAt(t);
  drawScreen(t);
  const buzz = s.mode === 'incoming' && ((t - s.ring) % 1.2) < 0.7 ? 1 : 0;
  phoneBody.position.set(Math.sin(t * 170) * 0.0011 * buzz, 0, Math.cos(t * 150) * 0.0007 * buzz); phoneBody.rotation.y = Math.sin(t * 130) * 0.018 * buzz;
  // hand taps
  let best = 0, tgt = null; for (const [T, b] of TAPS) { const k = smooth(T - 0.55, T - 0.05, t) * (1 - smooth(T + 0.12, T + 0.65, t)); if (k > best) { best = k; tgt = scrUV(...BTN[b]); } }
  hand.visible = !dawn && best > 0.001;
  if (tgt) { const rest = V3(0.07, 0.14, 0.42); const p = tgt.clone().sub(TIP).add(V3(0, 0.002 + 0.03 * (1 - smooth(0.6, 1, best)), 0)); hand.position.copy(rest.lerp(p, ease(best))); hand.rotation.set(-0.1 * (1 - best), 0.15, 0); }
  // light
  screenLight.position.copy(PH.pos).add(V3(0, 0.12, 0)); screenLight.intensity = (dawn ? 0.1 : 0.45) * (s.mode === 'call' ? 0.7 : 1);
  bedProps.skyM.map = dawn ? bedProps.skyD : bedProps.skyN; bedProps.moonS.visible = !dawn; bedProps.sunS.visible = dawn; for (const m of bedProps.skyline) { m.emissiveIntensity = dawn ? 0.08 : 1.0; m.color.set(dawn ? '#6a6a88' : '#1a2038'); }
  moon.color.set(dawn ? '#ffc890' : '#a9bbff'); moon.intensity = dawn ? 3.0 : 1.6; moon.position.set(dawn ? 2.4 : 1.6, dawn ? 1.9 : 3.2, -4.0);
  bHemi.color.set(dawn ? '#ffe2c8' : '#8fa6e0'); bHemi.intensity = dawn ? 1.0 : 0.55; bed.background.set(dawn ? '#e8b8a8' : '#0b1020'); bedProps.wallM.color.set(dawn ? '#b4a2b0' : '#7a86a8');
}
const PDIR = V3(-0.8, 0, 0.6).normalize();
function bedCamera(t) {
  let e, d, fov, look = PH.pos.clone();
  const at = (e_, d_) => PH.pos.clone().add(PDIR.clone().multiplyScalar(Math.cos(e_) * d_)).add(V3(0, Math.sin(e_) * d_, 0));
  if (t < DAWN) {
    if (t < 3.8) { const u = ease(t / 3.8); e = lerp(0.36, 1.05, u); d = lerp(1.15, 0.42, u); fov = lerp(55, 38, u); look.add(V3(0, lerp(0.16, -0.02, u), 0)).add(PDIR.clone().multiplyScalar(lerp(0, 0.012, u))); }
    else if (t < 10.1) { const u = (t - 3.8) / 6.3; e = 1.05 + 0.03 * u; d = 0.42 - 0.015 * u; fov = 38; look.add(V3(0, -0.02, 0)).add(PDIR.clone().multiplyScalar(0.012)); }
    else { const u = ease((t - 10.1) / 4.9); e = lerp(1.08, 1.15, u); d = lerp(0.405, 0.33, u); fov = 38; look.add(V3(0, -0.02, 0)).add(PDIR.clone().multiplyScalar(0.012)); }
  } else { const u = (t - DAWN) / (RING2 - 0.4 - DAWN), v = ease((t - (RING2 - 0.4)) / 1.6);
    const e0 = lerp(0.3, 0.36, Math.min(1, u)), d0 = lerp(1.3, 1.1, Math.min(1, u)); e = lerp(e0, 1.05, v); d = lerp(d0, 0.42, v); fov = lerp(55, 38, v);
    look.add(V3(lerp(0.25, 0, v), lerp(0.38, -0.02, v), lerp(-0.1, 0, v))).add(PDIR.clone().multiplyScalar(0.012 * v)); }
  bCam.fov = fov; bCam.position.copy(at(e, d)); bCam.lookAt(look);
}
// =================== city / street cameras ===================
function cityCamera(t) { const u = ease((t - CITY) / (MAP - CITY));
  cam.fov = 60; cam.position.set(lerp(-25, -60, u), lerp(12, 46, u), lerp(-1.5, 0, u)); cam.lookAt(lerp(90, 120, u), lerp(14, 4, u), 0); }
function streetCamera(t) { const u = (t - STREET) / (CENTER - STREET);
  cam.fov = 62; cam.position.set(lerp(18, 30, u), 1.62 + 0.02 * Math.sin(t * 7), -10.15); cam.lookAt(cam.position.x + 10, 1.35, lerp(-8.0, -6.5, u)); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.2, 6.9, 'You decline. Again.'],
  [7.0, 9.0, "80% of Americans don't<br>answer unknown numbers."],
  [9.3, 11.3, 'This time, you answer.'],
  [11.5, 13.1, 'Not a robot.'],
  [13.2, 15.0, '“Please… I need help.”'],
  [15.4, 18.8, 'What if every spam call<br>was someone like that?'],
  [19.4, 21.8, '52.5 billion spam calls<br>a year in the US.'],
  [21.9, 23.9, "That's 154 for<br>every American."],
  [24.3, 26.4, 'The US has 93,447<br>missing people.'],
  [26.5, 28.6, 'If spam calls were them…'],
  [28.8, 31.0, '…each would call<br>1,500 times a day.'],
  [31.1, 32.9, 'One call every minute.'],
  [33.4, 35.8, 'Suddenly, everyone answers.'],
  [35.9, 38.6, 'Every unknown number<br>could be someone.'],
  [38.7, 41.8, 'If just 1 in 5 picked up…'],
  [42.4, 45.0, '…911 would get 10.5 billion<br>extra calls a year.'],
  [45.1, 48.0, '49 times more<br>than it gets today.'],
  [48.1, 50.8, 'Real emergencies<br>would wait in line.'],
  [51.4, 54.2, 'In real life,<br>spam calls are just spam.'],
  [54.3, 56.1, "Don't call back<br>unknown numbers."],
  [56.2, 58.0, 'But if someone needs help —<br>call 911.'],
];
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < CITY + 0.3 || t >= DAWN) show = 0;
  else if (t < DIVIDE) { stat = '<b></b>LIVE RATE'; lab = 'US SPAM CALLS'; val = fmt(1665 * (t - CITY - 0.3)); sub = t < MAP ? '1,665 EVERY SECOND' : '1,665 EVERY SECOND · 52.5 BILLION A YEAR'; }
  else if (t < DIVIDE + 4.6) { stat = '<b></b>MODEL'; lab = '52.5 BILLION ÷ 93,447'; val = fmt(561816 * smooth(DIVIDE + 0.4, DIVIDE + 3.2, t)); sub = 'CALLS PER MISSING PERSON, EVERY YEAR'; }
  else if (t < STREET) { stat = '<b></b>MODEL'; lab = 'ONE PERSON'; val = '1,539 a day'; sub = 'ONE CALL EVERY 56 SECONDS'; }
  else if (t < STREET + 0.4) show = 0;
  else if (t < CENTER) { stat = '<b></b>MODEL'; lab = t < 38.7 ? 'SPAM CALLS PER AMERICAN' : 'IF 1 IN 5 PICK UP'; val = t < 38.7 ? '3 a week' : (10.5 * smooth(38.9, 41.2, t)).toFixed(1) + ' billion'; sub = t < 38.7 ? '154 A YEAR' : 'CALLS FOR HELP A YEAR'; }
  else if (t < CENTER + 0.4) show = 0;
  else { stat = '<b></b>MODEL'; lab = '911 CALLS A YEAR'; const k = smooth(CENTER + 1.5, CENTER + 5.5, t); val = k < 0.02 ? '213 million' : (0.213 + 10.5 * k).toFixed(1) + ' billion'; sub = 'TODAY: 212.9 MILLION (FCC) · 49× MORE'; }
  return { stat, lab, val, sub, show };
}
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(3.4, 3.9, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  el.cap.style.top = (t > 3.6 && t < CITY) || t >= RING2 + 1.0 ? '1440px' : '1250px';
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const dip = Math.max(...[CITY, MAP, STREET, CENTER, DAWN].map(T => fadeWin(t, T - 0.3, T + 0.25, 0.25)));
  el.veil.style.background = '#000'; el.veil.style.opacity = dip;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
window.renderAt = (t) => {
  if (t < CITY || t >= DAWN) { updateBed(t); bedCamera(t); shoot(bed, bCam, t >= DAWN ? 1.2 : 1.15); }
  else if (t < MAP) { cityCamera(t); updateStreet(t, true); updateCalls(t, 'city'); shoot(city, cam, 1.1); }
  else if (t < STREET) { mapCamera(t); updateMap(t); shoot(mapScene, mapCam, 1.0); }
  else if (t < CENTER) { streetCamera(t); updateStreet(t, true); updateCalls(t, 'street'); camLight.position.copy(cam.position).add(V3(2, 1.5, 1.5)); camLight.intensity = 30; shoot(city, cam, 1.5); camLight.intensity = 0; }
  else { centerCamera(t); updateCenter(t); shoot(ctr, cCam, 1.0); }
  updateDOM(t);
  return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildMap(); window.renderAt(0); return true; })();
