// =================== scene schedule + dissolves ===================
const SCN = { room: [updateRoom, roomCamera, room, () => rCam, 1.0], body: [updateBody, bodyCamera, xr, () => xCam, 1.25], cash: [updateMoney, moneyCamera, cash, () => mCam, 1.0],
  hg: [updateLife, lifeCamera, hg, () => hCam, 1.1], mt: [updateLife, mountCamera, mt, () => tCam, 1.0] };
const SEQ = [[0, 'room'], [XRAY, 'body'], [NIGHT, 'room'], [LUNGS, 'body'], [MONEY, 'cash'], [YEARS, 'hg'], [MOUNT, 'mt']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== censor mosaic over the vape / pack (screen rectangle from their projected bounds) ===================
const _bb = new THREE.Box3(), _pc = new THREE.Vector3();
function censorRect(t) { const u = compMat.uniforms; if (t > NIGHT - 0.5 || (!vape.visible && !pack.visible)) { u.uPixOn.value = 0; return; }
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0; for (const o of [vape, pack]) { if (!o.visible) continue; _bb.setFromObject(o); for (let k = 0; k < 8; k++) { _pc.set(k & 1 ? _bb.max.x : _bb.min.x, k & 2 ? _bb.max.y : _bb.min.y, k & 4 ? _bb.max.z : _bb.min.z).project(rCam); const x = _pc.x * 0.5 + 0.5, y = _pc.y * 0.5 + 0.5; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max((x1 - x0) / 2 + 0.03, 0.06), hh = Math.max((y1 - y0) / 2 + 0.018, 0.036); u.uPix.value.set(cx - hw, cy - hh, cx + hw, cy + hh); u.uPixOn.value = 1; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you quit<br><span class="hl">nicotine</span> today?'; el.endT.innerHTML = 'What if you quit <span class="hl">nicotine</span> today?';
el.endS.innerHTML = 'CDC: ONE YEAR AFTER QUITTING, THE EXTRA RISK OF HEART DISEASE IS ABOUT HALF.<br>JHA ET AL., NEJM 2013: QUITTING AT 25–34 GIVES BACK ~10 YEARS OF LIFE.<br>UCL 2024: EACH CIGARETTE ≈ 20 MINUTES OF LIFE EXPECTANCY.';
const captions = [
  [4.6, 6.7, '20 minutes: your heart rate drops.'],
  [6.8, 8.8, '12 hours: carbon monoxide<br>leaves your blood.'],
  [9.3, 13.3, 'Day 1: cravings, anger, no sleep.'],
  [13.6, 17.3, 'Day 3: the nicotine is gone —<br>this is the peak.'],
  [17.6, 20.8, 'Weeks 2–4: every craving gets weaker.<br>A few extra pounds? Totally normal.'],
  [21.2, 24.3, 'Food tastes better.<br>You can smell again.'],
  [24.7, 27.8, '2 weeks – 3 months:<br>your lungs start working better.'],
  [28.3, 31.8, 'A pack a day ≈ $10.<br>That’s $309 a month.'],
  [32.0, 35.3, '$3,705 a year.<br>Vaping? Still about $1,000.'],
  [35.5, 38.8, '$37,000 in 10 years.'],
  [39.0, 41.8, 'Invest it for 30 years:<br>about $377,000.'],
  [42.3, 46.6, 'Every cigarette ≈ 20 minutes of life.<br>A pack a day = 101 days a year.'],
  [46.8, 51.2, '1 year: heart attack risk cut in half.<br>10 years: lung cancer risk cut in half.'],
  [51.8, 55.6, 'Quit before 40 —<br>and win back about 10 years.'],
  [55.8, 59.8, 'The first week is hell.<br>The rest is your life.'],
];
const money = t => t < MONEY + 4.0 ? 309 * smooth(MONEY + 0.2, MONEY + 3.6, t) : t < MONEY + 7.5 ? lerp(309, 3705, smooth(MONEY + 4.0, MONEY + 7.0, t)) : t < MONEY + 11.0 ? lerp(3705, 37048, smooth(MONEY + 7.5, MONEY + 10.5, t)) : lerp(37048, 376641, smooth(MONEY + 11.0, MONEY + 13.4, t));
const craving = t => t < PEAK ? lerp(35, 85, smooth(NIGHT, PEAK, t)) + 8 * Math.sin(t * 3) : t < WEEKS ? 96 + 4 * Math.sin(t * 7) : Math.max(8, lerp(80, 15, smooth(WEEKS, MORNING, t)) * (0.6 + 0.4 * Math.abs(Math.sin((t - WEEKS) * 2.2))));
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < NIGHT) return [`<b style="background:#5fd27a"></b>QUIT · ${t < XRAY + 2.6 ? '20 MINUTES' : '12 HOURS'} AGO`, 'HEART RATE', bpmAt(t) + ' bpm', t < XRAY + 2.6 ? 'CALMING DOWN' : 'CARBON MONOXIDE: LEAVING'];
  if (t < PEAK) return ['<b></b>DAY 1', 'CRAVING', Math.round(craving(t)) + '%', 'IRRITABLE · CAN’T SLEEP'];
  if (t < WEEKS) return ['<b></b>DAY 3 · PEAK', 'CRAVING', Math.round(craving(t)) + '%', 'WITHDRAWAL AT ITS WORST'];
  if (t < MORNING) return [`<b style="background:#e8b030"></b>WEEK ${t < WEEKS + 1.7 ? 2 : 4}`, 'CRAVING', Math.round(craving(t)) + '%', 'WAVES GET WEAKER'];
  if (t < LUNGS) return ['<b style="background:#5fd27a"></b>WEEK 4', 'TASTE & SMELL', 'BACK', 'FOOD TASTES BETTER'];
  if (t < MONEY) return ['<b style="background:#5fd27a"></b>MONTH 3', 'LUNGS', 'CLEARING', 'BREATHING GETS EASIER'];
  if (t < YEARS) { const m = money(t); return [`<b style="background:#5fd27a"></b>${t < MONEY + 4 ? '1 MONTH' : t < MONEY + 7.5 ? '1 YEAR' : t < MONEY + 11 ? '10 YEARS' : '30 YEARS · INVESTED AT 7%'}`, 'MONEY SAVED', '$' + fmt(m), 'PACK A DAY · $10.15'] ; }
  if (t < YEARS + 4.6) return ['<b style="background:#5fd27a"></b>PACK A DAY · 1 YEAR', 'LIFE WON BACK', '+' + Math.round(101 * smooth(YEARS + 0.4, YEARS + 4.4, t)) + ' days', '~20 MIN PER CIGARETTE'];
  if (t < MOUNT) return ['<b style="background:#5fd27a"></b>' + (t < YEARS + 7 ? '1 YEAR' : '10 YEARS') + ' AFTER QUITTING', t < YEARS + 7 ? 'HEART ATTACK RISK' : 'LUNG CANCER RISK', '−50%', t < YEARS + 7 ? 'EXTRA RISK, VS. STILL SMOKING' : 'RISK OF DYING, VS. STILL SMOKING'];
  return ['<b style="background:#5fd27a"></b>QUIT AT 25–34 · NEJM 2013', 'LIFE WON BACK', '~10 years', 'QUIT BEFORE 40: ~90% OF THE RISK GONE']; }
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
  if (A === 'room' || B === 'room') censorRect(t); else compMat.uniforms.uPixOn.value = 0;
  compMat.uniforms.uRed.value = 0.1 * fadeWin(t, NIGHT, PEAK, 0.5) + (0.32 + 0.18 * Math.sin(t * 5.5)) * fadeWin(t, PEAK, WEEKS + 0.8, 0.6);
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
