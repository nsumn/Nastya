// =================== scene schedule + dissolves ===================
const SCN = { home: [updateHome, homeCamera, home, () => hCam, 1.0], brain: [updateBrainS, brainCamera, brs, () => bCam, 1.2],
  road: [updateRoad, roadCamera, road, () => rdCam, 1.0], office: [updateOffice, officeCamera, office, () => oCam, 1.0] };
const SEQ = [[0, 'home'], [BRAIN, 'brain'], [MORN, 'home'], [DRIVE, 'road'], [OFFICE, 'office'], [SNACK, 'home'], [COLD, 'office'], [FIX, 'home']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you only slept<br><span class="hl">5 hours</span> a night?'; el.endT.innerHTML = 'What if you only slept <span class="hl">5 hours</span> a night?';
el.endS.innerHTML = 'AAA FOUNDATION 2016: 4–5 HOURS OF SLEEP → ~4.3× THE CRASH RATE.<br>PRATHER ET AL., SLEEP 2015: UNDER 6 HOURS → 4.2× MORE COLDS.<br>VAN DONGEN ET AL. 2003: 2 WEEKS OF SHORT SLEEP ≈ 1–2 NIGHTS WITH NONE.';
const captions = [
  [4.4, 7.0, 'While you sleep,<br>your brain washes itself.'],
  [7.1, 9.8, '5 hours = the job<br>isn’t done.'],
  [10.4, 16.6, 'Day 1: you feel… kind of fine.'],
  [17.4, 20.9, 'Sleep 4–5 hours →<br>crash risk ×4.3.'],
  [21.1, 24.7, 'Close to driving at<br>the legal alcohol limit.'],
  [25.4, 28.6, 'Your brain’s alarm center gets<br>~60% more reactive.'],
  [28.8, 31.7, 'Small things feel huge.'],
  [32.4, 35.6, 'You eat ~385 extra<br>calories a day.'],
  [35.8, 38.7, 'That’s ~3 lb a month.'],
  [39.4, 45.7, 'Under 6 hours: 4.2× more<br>likely to catch a cold.'],
  [46.4, 50.6, '2 weeks of short sleep =<br>your brain after 1–2 nights<br>of NO sleep…'],
  [50.8, 53.7, '…and you barely notice.'],
  [54.4, 57.2, 'A month on 5 hours:<br>60–90 hours of sleep debt.'],
  [57.4, 59.8, '1 in 3 Americans already<br>sleep less than 7.'],
];
// sleep debt vs. 7–8 h: 2–3 h per night, shown as the low–high pair
const debt = t => t < MORN ? 0 : t < FOG ? 2.5 * lerp(1, 14, smooth(MORN + 1, FOG, t)) : t < FIX ? 35 : lerp(75, 0, smooth(FIX + 3.2, FIX + 5.6, t));
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < MORN) return [`<b style="background:#5a8ae8"></b>${t < BRAIN + 3.6 ? 'ASLEEP' : 'ALARM · 6:00 AM'}`, 'BRAIN CLEANUP', Math.round(100 * cleanAt(t)) + '%', t < BRAIN + 3.6 ? 'WASHING OUT WASTE' : 'ONLY 5 HOURS · NOT DONE'];
  if (t < DRIVE) return ['<b></b>DAY 1', 'SLEEP DEBT', '2–3 h', 'VS. 7–8 H YOU NEED'];
  if (t < OFFICE) return ['<b></b>DAY 2 · DRIVING', 'CRASH RISK', '×4.3', 'AAA FOUNDATION 2016'];
  if (t < SNACK) return ['<b></b>DAY 4', 'AMYGDALA', '+60%', 'THE BRAIN’S ALARM CENTER'];
  if (t < COLD) return ['<b style="background:#e8b030"></b>DAY 7 · 2:40 AM', 'EXTRA FOOD', '+385 kcal', '≈ 3 LB A MONTH (MODEL)'];
  if (t < FOG) return ['<b></b>DAY 10', 'COLD RISK', '×4.2', 'UNDER 6 H · PRATHER 2015'];
  if (t < FIX) return ['<b></b>DAY 14', 'YOUR BRAIN', t < FOG + 4.6 ? '≈ 1–2' : 'BARELY', t < FOG + 4.6 ? 'NIGHTS WITH NO SLEEP' : 'NOTICE IT'];
  if (t < FIX + 3.0) return ['<b></b>30 NIGHTS × 5 H', 'SLEEP DEBT', '60–90 h', 'VS. 7–8 H A NIGHT'];
  return ['<b style="background:#5fd27a"></b>SLEEP 8 H', 'SLEEP DEBT', Math.round(debt(t)) + ' h', 'PAYING IT BACK']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(3.8, 4.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  let eA = 1, eB = 1; if (!B || mix < 1) eA = shootScene(A, t, RTA); if (B) eB = shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0;
  // the outburst: a red flash of the amygdala; a faint grey-red edge in the brain fog
  compMat.uniforms.uRed.value = (0.42 + 0.12 * Math.sin(t * 6)) * fadeWin(t, OFFICE + 2.0, OFFICE + 4.0, 0.4) + 0.12 * fadeWin(t, FOG + 0.5, FIX - 0.3, 1.2);
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
