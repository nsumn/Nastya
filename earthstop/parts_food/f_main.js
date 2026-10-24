// =================== scene schedule + dissolves (the apartment dissolves between its own modes too) ===================
const SCN = { drive: [updateDrive, driveCamera, drv, () => dCam, 1.0], art: [updateArtery, arteryCamera, artS, () => artCam, 1.15], gut: [updateGut, gutCamera, gutS, () => gutCam, 1.15], liv: [updateLiver, liverCamera, livS, () => livCam, 1.1],
  desk: [t => updateApt(t, 'desk'), t => aptCamera(t, 'desk'), apt, () => aptCam, 1.0], scale: [t => updateApt(t, 'scale'), t => aptCamera(t, 'scale'), apt, () => aptCam, 1.0],
  couch: [t => updateApt(t, 'couch'), t => aptCamera(t, 'couch'), apt, () => aptCam, 1.0], morning: [t => updateApt(t, 'morning'), t => aptCamera(t, 'morning'), apt, () => aptCam, 1.0] };
const SEQ = [[0, 'drive'], [ART, 'art'], [DAY5, 'desk'], [GUT, 'gut'], [WT, 'scale'], [LIV, 'liv'], [LAZY, 'couch'], [FIX, 'morning']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you ate only<br><span class="hl">fast food</span> for 30 days?'; el.endT.innerHTML = 'What if you ate only<br><span class="hl">fast food</span> for 30 days?';
el.endS.innerHTML = 'VOGEL 1997: ONE FAST-FOOD BREAKFAST HALVED ARTERY FLEX FOR ~4 HOURS.<br>KECHAGIAS 2008: 4 WEEKS OF FAST FOOD RAISED LIVER ENZYMES IN 14 OF 18.<br>HOLLOWAY 2011 (YOUNG MEN): 5 DAYS OF A HIGH-FAT DIET WORSENED ATTENTION AND MOOD.';
const captions = [
  [4.3, 6.9, 'Sugar rush? It’s a myth.'],
  [7.0, 9.8, 'Within an hour: more tired,<br>less alert.'],
  [10.4, 13.4, 'One fast-food breakfast →<br>arteries relax 50% less<br>for 4 hours.'],
  [13.7, 16.7, '3 combo meals ≈ 2.7×<br>your daily salt limit.'],
  [17.4, 23.7, 'Day 5: greasy food made<br>people slower, less focused<br>— and grumpier.'],
  [24.4, 26.9, '~90% of your serotonin<br>is made in your gut.'],
  [27.0, 29.4, 'Your gut bacteria eat fiber.<br>Fast food has almost none.'],
  [29.5, 31.8, '10 days: one person lost ~40%<br>of their gut bacteria species.'],
  [32.4, 35.0, 'You eat it faster than<br>your brain can say “full”.'],
  [35.2, 37.4, '+500 calories a day<br>≈ 4 lb a month.'],
  [37.5, 39.8, 'Super Size Me:<br>+24.5 lb in 30 days.'],
  [40.4, 45.7, 'Week 1: liver stress<br>in 14 of 18 people.<br>Main suspect: sugar.'],
  [46.4, 49.3, 'Rats on junk food got lazier.'],
  [49.5, 52.7, 'Their breaks before working<br>for a reward: 2× longer.'],
  [53.4, 56.3, '2 weeks of fruits & veggies:<br>more energy,<br>more motivation.'],
  [56.5, 58.0, 'Your gut changes in a day.'],
  [58.1, 59.9, '84.8 million Americans<br>eat fast food today.<br><span style="font-style:normal;font-size:1.3em">👇</span>'],
];
const GREEN = '<b style="background:#5fd27a"></b>';
const weightAt = t => t < WT + 5.5 ? 4.3 * smooth(WT + 3.3, WT + 4.8, t) : lerp(4.3, 24.5, smooth(WT + 5.6, WT + 7.4, t));
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < ART) return ['<b></b>DAY 1 · DRIVE-THRU', 'ENERGY', t < 6.8 ? 'OK' : t < 8.6 ? 'DROPPING' : 'LOW', 'AFTER SODA + FRIES'];
  if (t < SALT) return ['<b></b>DAY 1 · BREAKFAST', 'ARTERY FLEX', Math.round(100 * artFlex(t)) + '%', 'VS. NORMAL · NEXT ~4 HOURS'];
  if (t < DAY5) return ['<b></b>DAY 1 · 3 COMBOS', 'SODIUM', fmt(6200 * smooth(SALT + 0.2, SALT + 2.4, t)) + ' mg', '≈ 2.7× THE DAILY LIMIT'];
  if (t < GUT) return ['<b></b>DAY 5', 'FOCUS', 'WORSE', 'ATTENTION · SPEED · MOOD'];
  if (t < WT) return ['<b></b>DAY 10', 'GUT SPECIES', Math.round(100 - 40 * smooth(GUT + 3.2, GUT + 6.8, t)) + '%', 'LEFT · ONE-PERSON TEST'];
  if (t < LIV) return ['<b></b>DAY 30', 'WEIGHT', '+' + weightAt(t).toFixed(1) + ' lb', t < WT + 5.5 ? '+500 KCAL A DAY' : 'SUPER SIZE ME · 5,000 KCAL A DAY'];
  if (t < LAZY) return ['<b></b>WEEK 1', 'LIVER STRESS', '14 of 18', 'PEOPLE IN THE STUDY'];
  if (t < LAZY + 3.3) return ['<b></b>DAY 30 · EVENING', 'MOTIVATION', 'LOW', 'THE COUCH WINS'];
  if (t < FIX) return ['<b></b>RATS · 3 MONTHS', 'BREAKS', '2× longer', 'VS. RATS ON NORMAL FOOD'];
  if (t < FIX + 3.4) return [GREEN + 'REAL FOOD · 2 WEEKS', 'ENERGY', 'UP', 'MORE MOTIVATION · STUDY 2017'];
  if (t < FIX + 5.0) return [GREEN + 'REAL FOOD', 'GUT BACTERIA', '1 day', 'TO START CHANGING'];
  return [GREEN + 'CDC', 'AMERICANS TODAY', '84.8 M', 'EAT FAST FOOD ON A GIVEN DAY']; }
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
  compMat.uniforms.uRed.value = 0.3 * fadeWin(t, DAY5 + 5.1, DAY5 + 6.6, 0.3);   // the grumpy outburst at the desk
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
