// =================== schedule, DOM, render ===================
const SCN = { kitchen: [t => updateHome(t, 'kitchen'), t => homeCamera(t, 'kitchen'), home, () => hmCam], brain: [updateBrainC, brainCamC, brC, () => brCam],
  yawn: [t => updateHome(t, 'yawn'), t => homeCamera(t, 'yawn'), home, () => hmCam], couch: [t => updateHome(t, 'couch'), t => homeCamera(t, 'couch'), home, () => hmCam],
  fade: [t => updateHome(t, 'fade'), t => homeCamera(t, 'fade'), home, () => hmCam], bed: [t => updateHome(t, 'bed'), t => homeCamera(t, 'bed'), home, () => hmCam],
  split: [updateSplit, splitCam, split, () => spCam], curtains: [t => updateHome(t, 'curtains'), t => homeCamera(t, 'curtains'), home, () => hmCam] };
const SEQ = [[0, 'kitchen'], [BRAIN, 'brain'], [QUIT, 'yawn'], [PEAK, 'couch'], [FADE, 'fade'], [SLEEP, 'bed'], [TWIST, 'split'], [FREE, 'curtains']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[1](t); S[0](t);   // camera first: the headache rings face it
  const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you quit<br><span class="hl">caffeine</span> today?'; el.endT.innerHTML = 'What if you quit <span class="hl">caffeine</span> today?';
el.endS.innerHTML = 'JULIANO & GRIFFITHS 2004: WITHDRAWAL STARTS AT 12–24 H, PEAKS AT 20–51 H, LASTS 2–9 DAYS; HEADACHE IN ~50%.<br>ROGERS ET AL. 2010 (379 PEOPLE): DAILY DRINKERS GET NO NET ALERTNESS BOOST.<br>DRAKE ET AL. 2013: 400 MG 6 H BEFORE BED CUT SLEEP BY OVER 1 HOUR.';
const captions = [
  [4.4, 7.6, 'Caffeine doesn’t give you energy.'],
  [7.7, 10.8, 'It blocks the signal that<br>says you’re tired.'],
  [11.4, 14.0, 'Drink it every day and<br>your brain adapts —'],
  [14.1, 16.8, 'you need it just<br>to feel normal.'],
  [17.4, 20.4, 'Hour 12–24:<br>withdrawal kicks in.'],
  [20.5, 23.8, '1 in 2 people<br>get a headache.'],
  [24.4, 27.4, 'Hours 20–51: the peak.'],
  [27.5, 30.8, 'Foggy, grumpy,<br>can’t focus.'],
  [31.4, 34.0, 'Day 2–9: it fades.'],
  [34.1, 36.8, 'Caffeine withdrawal is an<br>official medical diagnosis.'],
  [37.4, 39.8, 'Week 2: deeper sleep.'],
  [39.9, 42.8, 'A strong dose even 6 hours<br>before bed can steal<br>an hour of sleep.'],
  [43.4, 46.4, 'The twist: daily coffee drinkers<br>after their morning cup…'],
  [46.5, 49.8, '…are no more alert than<br>people who never drink it.'],
  [50.4, 55.8, 'That “boost” is mostly<br>just ending the withdrawal.'],
  [56.4, 58.6, 'Quit, and after ~9 days you’re<br>back to that same level —'],
  [58.7, 60.8, 'no cup needed.'],
];
const RED = '<b></b>', GREEN = '<b style="background:#5fd27a"></b>', BLUE = '<b style="background:#5ad8ff"></b>';
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < BRAIN) return [RED + '7:30 AM', 'LAST CUP', 'now', '~95 MG OF CAFFEINE'];
  if (t < ADAPT) return [BLUE + 'YOUR BRAIN', '“TIRED” SIGNAL', 'blocked', 'CAFFEINE SITS IN THE RECEPTORS'];
  if (t < QUIT) return [RED + 'EVERY DAY', 'DEPENDENCE', 'building', 'YOU NEED IT TO FEEL NORMAL'];
  if (t < PEAK) return [RED + 'NO COFFEE · HOUR 12–24', 'HEADACHE', '1 in 2', 'IN STUDIES'];
  if (t < FADE) return [RED + 'HOUR 20–51', 'WITHDRAWAL', 'peak', 'FOG · GRUMPY · NO FOCUS'];
  if (t < SLEEP) return [GREEN + 'DAY 2–9', 'WITHDRAWAL', 'fading', 'A DSM-5 DIAGNOSIS'];
  if (t < TWIST) return [GREEN + 'WEEK 2', 'SLEEP', 'deeper', '400 MG 6 H BEFORE BED: −1 H'];
  if (t < BOOST) return [BLUE + 'BRISTOL STUDY · 379 PEOPLE', 'ALERTNESS', 'equal', 'DAILY DRINKER vs. NEVER'];
  if (t < FREE) return [RED + 'DAILY DRINKER · 7 AM', 'BEFORE THE CUP', 'below normal', 'THE CUP ONLY BRINGS IT BACK'];
  return [GREEN + '~9 DAYS LATER', 'MORNING', 'normal', 'NO CUP NEEDED']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(0.9, 1.4, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  if (!B || mix < 1) shootScene(A, t, RTA); if (B) shootScene(B, t, RTB);
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = (0.22 + 0.1 * Math.sin(t * 6)) * fadeWin(t, PEAK, FADE + 0.6, 0.6);   // the throbbing peak
  compMat.uniforms.uT.value = t; composite(B ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
