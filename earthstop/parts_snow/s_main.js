// =================== schedule, DOM, render ===================
const SCN = { drive: [t => updateCab(t, 'drive'), t => cabCamera(t, 'drive'), cab, () => cbCam], jam: [t => updateRoad(t, 'jam'), t => roadCamera(t, 'jam'), hw, () => hwCam],
  pipe: [t => updateRoad(t, 'pipe'), t => roadCamera(t, 'pipe'), hw, () => hwCam], clear: [t => updateRoad(t, 'clear'), t => roadCamera(t, 'clear'), hw, () => hwCam],
  fuel: [t => updateCab(t, 'fuel'), t => cabCamera(t, 'fuel'), cab, () => cbCam], night: [t => updateRoad(t, 'night'), t => roadCamera(t, 'night'), hw, () => hwCam],
  cold: [t => updateCab(t, 'cold'), t => cabCamera(t, 'cold'), cab, () => cbCam], whiteout: [t => updateRoad(t, 'whiteout'), t => roadCamera(t, 'whiteout'), hw, () => hwCam],
  dawn: [t => updateRoad(t, 'dawn'), t => roadCamera(t, 'dawn'), hw, () => hwCam] };
const SEQ = [[0, 'drive'], [JAM, 'jam'], [PIPE, 'pipe'], [CLEAR, 'clear'], [FUEL, 'fuel'], [NIGHT, 'night'], [COLD, 'cold'], [WALK, 'whiteout'], [DAWN, 'dawn']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return 1.0; }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you got stuck<br>in your car in a<br><span class="hl">snowstorm</span>?'; el.endT.innerHTML = 'What if you got stuck in your car in a <span class="hl">snowstorm</span>?';
el.endS.innerHTML = 'I-95, VIRGINIA, JAN 2022: ~50 MILES CLOSED, SOME DRIVERS STUCK ~27 HOURS.<br>NWS: STAY IN THE CAR, RUN THE ENGINE A FEW MINUTES EACH HOUR, KEEP THE TAILPIPE CLEAR.<br>HYPOTHERMIA = BODY TEMPERATURE BELOW 95°F (35°C).';
const captions = [
  [4.4, 7.0, '2022, Virginia: 50 miles<br>of I-95 froze.'],
  [7.1, 9.8, 'Some drivers were stuck<br>for 27 hours.'],
  [10.4, 12.8, 'The real danger<br>isn’t the cold.'],
  [12.9, 16.8, 'Snow blocks the tailpipe —<br>carbon monoxide fills the car.<br>You can’t smell it.'],
  [17.4, 20.4, 'Clear the tailpipe.<br>Crack a window.'],
  [20.5, 23.8, 'Run the engine<br>~10 minutes an hour.'],
  [24.4, 27.4, 'Idling burns ¼–½<br>gallon an hour.'],
  [27.5, 30.8, 'In 10-minute bursts, a full tank<br>lasts days, not hours.'],
  [31.4, 37.8, 'At night: dome light on.<br>Tie something bright<br>to the antenna.'],
  [38.4, 41.3, 'Body temperature below 95°F<br>= hypothermia.'],
  [41.4, 44.8, 'Shivering. Confusion.<br>Slurred speech.'],
  [45.4, 48.3, 'Don’t walk away.'],
  [48.4, 51.8, 'Your car is easier<br>to find than you are.'],
  [52.4, 55.8, 'Stay put. Stay ventilated.<br>Stay visible.'],
  [56.0, 59.8, 'Do you keep a blanket<br>in your car?'],
];
const RED = '<b></b>', GREEN = '<b style="background:#5fd27a"></b>', BLUE = '<b style="background:#5ad8ff"></b>';
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < JAM) return [BLUE + 'SNOWSTORM', 'OUTSIDE', '10°F', 'AND FALLING'];
  if (t < PIPE) return [RED + 'VIRGINIA · JAN 2022', 'STUCK FOR UP TO', '27 hours', '50 MILES OF I-95'];
  if (t < CLEAR) return [RED + 'TAILPIPE BLOCKED', 'DANGER', 'CO gas', 'NO SMELL · NO COLOR'];
  if (t < FUEL) return [GREEN + 'FIXED', 'ENGINE', '10 min/hr', 'WINDOW CRACKED OPEN'];
  if (t < FUEL + 3.5) return [RED + 'IDLING NONSTOP', 'FUEL BURN', '¼–½ gal/h', 'FULL TANK: ~1–2 DAYS'];
  if (t < NIGHT) return [GREEN + '10 MINUTES EVERY HOUR', 'FULL TANK', '~6–12 days', 'INSTEAD OF 1–2'];
  if (t < COLD) return [BLUE + 'NIGHT', 'BE SEEN', 'light + red', 'DOME LIGHT · CLOTH ON ANTENNA'];
  if (t < WALK) return [RED + 'BODY TEMPERATURE', 'HYPOTHERMIA', '< 95°F', 'SHIVERING · CONFUSION'];
  if (t < DAWN) return [RED + 'WHITEOUT', 'VISIBILITY', 'near zero', 'STAY WITH THE CAR'];
  return [GREEN + 'MORNING', 'THE RULE', 'stay put', 'VENTILATED · VISIBLE']; }
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
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0.22 * fadeWin(t, PIPE + 2.5, CLEAR + 0.4, 0.6) + 0.15 * fadeWin(t, COLD + 1.5, WALK + 0.2, 0.8);   // CO danger, then the cold
  composite(B ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
