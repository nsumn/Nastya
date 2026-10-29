// =================== FAST CUTS (2–3 s): timeline HUD (12 PM → TONIGHT) with an ENERGY bar, stat pop-ups, word-pop captions ===================
// faces sit between the top HUD and the captions (1250 px): fr() lifts the head 0.15 of the frame above the given headY
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const canW = () => { hero.outer.updateMatrixWorld(true); return can.getWorldPosition(V3(0, 0, 0)); };
const heartW = () => heartG.getWorldPosition(V3(0, 0, 0));
const home = m => t => updateHome(t, m);
// [start, scene, camera, update(t), framing(t)]
const SHOTS = [
  [0.0, room, () => rmCam, home('open'), t => framing(H_(hero), V3(0.25, 0.02, 1), lerp(2.0, 1.6, t / 1.6), 0.6)],   // under the title: face low
  [1.6, room, () => rmCam, home('open'), t => framing(H_(hero), V3(-0.5, 0.12, 1), lerp(2.1, 1.85, (t - 1.6) / 1.1), 0.45)],   // the crack
  [2.7, room, () => rmCam, home('open'), t => framing(H_(hero), V3(-0.55, 0.05, 1), lerp(1.45, 1.6, (t - 2.7) / 1.3), 0.55)],   // eyes snap open
  [MIN30, xr, () => xCam, t => updateXray(t, 'x'), t => { const a = lerp(Math.PI * 0.95, 0.35, ease((t - MIN30) / 2.6)); return fr(heartW(), V3(Math.sin(a), 0.15, Math.cos(a)), lerp(2.6, 1.3, ease((t - MIN30) / 2.6)), 0.5); }],   // spirals in from behind
  [MIN30 + 2.6, xr, () => xCam, t => updateXray(t, 'x'), t => fr(heartW(), V3(0.5, 0.15, 1), lerp(0.55, 0.42, (t - MIN30 - 2.6) / 2.4), 0.5)],
  [HOUR1, room, () => rmCam, home('sugar'), t => fr(V3(3.3, 0.96, -0.6), V3(-0.55, 1.1, 0.35), lerp(1.15, 1.0, (t - HOUR1) / 2.4), 0.5)],   // 13 spoons, from above
  [HOUR1 + 2.4, room, () => rmCam, home('sugar'), t => fr(H_(hero), V3(-0.55, 0.05, 1), lerp(1.5, 1.3, (t - HOUR1 - 2.4) / 1.6), 0.6)],
  [HOUR1 + 4.0, xr, () => xCam, t => updateXray(t, 'sugarx'), t => fr(V3(0.18, 1.2, 0.02), V3(0.35, 0.1, 1), lerp(0.75, 0.6, (t - HOUR1 - 4) / 2), 0.5)],   // sugar riding the blood
  [HOUR4, room, () => rmCam, home('crash'), t => fr(H_(hero), V3(0.25, 0.12, 1), lerp(2.6, 2.2, (t - HOUR4) / 2.6), 0.6)],
  [HOUR4 + 2.6, room, () => rmCam, home('crash'), t => fr(H_(hero), V3(-0.45, 0.05, 1), lerp(1.3, 1.15, (t - HOUR4 - 2.6) / 1.4), 0.6)],
  [HOUR4 + 4.0, room, () => rmCam, home('crash'), t => fr(H_(hero), V3(0.5, 0.1, 1), lerp(1.6, 1.9, (t - HOUR4 - 4) / 2), 0.6)],   // the second can
  [NIGHT, room, () => rmCam, home('night'), t => fr(H_(hero), V3(0.05, 1, 0.55), lerp(2.0, 1.6, (t - NIGHT) / 2.5), 0.55)],   // in bed, from above
  [NIGHT + 2.5, room, () => rmCam, home('night'), t => fr(V3(-3.93, 0.75, 0.15), V3(1, 0.1, 0.25), lerp(0.75, 0.6, (t - NIGHT - 2.5) / 1.7), 0.5)],   // 2:00
  [NIGHT + 4.2, room, () => rmCam, home('night'), t => fr(H_(hero), V3(-0.1, 1, 0.4), lerp(1.0, 0.85, (t - NIGHT - 4.2) / 2.8), 0.55)],
  [WEEK, toothS, () => tCam, updateTooth, t => fr(V3(0, 0.32, 0), V3(0.45, 0.3, 1), lerp(2.2, 1.8, (t - WEEK) / 2.8), 0.5)],
  [WEEK + 2.8, toothS, () => tCam, updateTooth, t => fr(V3(0, 0.4, 0.05), V3(-0.3, 0.55, 1), lerp(1.1, 0.95, (t - WEEK - 2.8) / 3.2), 0.5)],
  [MONTH, room, () => rmCam, home('month'), t => fr(H_(hero), V3(0.2, 0.08, 1), lerp(1.9, 1.6, (t - MONTH) / 2.8), 0.6)],
  [MONTH + 2.8, room, () => rmCam, home('month'), t => fr(H_(hero), V3(-0.45, 0.1, 1), lerp(1.3, 1.15, (t - MONTH - 2.8) / 3.2), 0.6)],
  [YEAR, room, () => rmCam, home('year'), t => fr(V3(2.1, 0.95, -0.8), V3(0.25, 0.25, 1), lerp(4.3, 3.9, (t - YEAR) / 2.6), 0.5)],
  [YEAR + 2.6, room, () => rmCam, home('year'), t => fr(H_(hero), V3(-0.3, 0.05, 1), lerp(1.6, 1.4, (t - YEAR - 2.6) / 1.4), 0.6)],
  [YEAR + 4.0, room, () => rmCam, home('year'), t => fr(V3(1.3, 0.1, -0.35), V3(0.15, 0.9, 1), lerp(1.0, 0.85, (t - YEAR - 4) / 3), 0.5)],   // the cash
  [ER, erS, () => eCam, updateER, t => fr(V3(0, 1.2, 0), V3(0.15, 0.5, 1), lerp(15, 12, (t - ER) / 3.4), 0.5, 46)],
  [ER + 3.4, erS, () => eCam, updateER, t => fr(V3(-0.5, 0.8, 2.5), V3(-0.45, 0.2, 1), lerp(5.5, 4.8, (t - ER - 3.4) / 3.6), 0.5, 46)],
  [SLEEP, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(0.05, 1, 0.6), lerp(2.2, 1.8, (t - SLEEP) / 3.2), 0.55)],
  [SLEEP + 3.2, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(0.1, 1, 0.45), lerp(1.0, 1.15, (t - SLEEP - 3.2) / 1.4), 0.55)],   // morning
  [SLEEP + 4.6, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(0.3, 0.05, 1), lerp(2.3, 2.0, (t - SLEEP - 4.6) / 2.4), 0.6)],   // up, stretching
  [CTA, room, () => rmCam, home('sleep'), t => fr(H_(hero), V3(-0.2, 0.05, 1), lerp(1.6, 1.4, (t - CTA) / 3), 0.62)]];
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'hud', 'flash', 'tl', 'tlBar', 'tlT', 'tlV', 'pop'].map(k => [k, $(k)]));
el.title.innerHTML = 'What happens if you drink<br>an <span class="hl">energy drink</span> every day?'; el.endT.innerHTML = 'What happens if you drink an <span class="hl">energy drink</span> every day?';
el.endS.innerHTML = 'ONE CAN A DAY: 13 TSP OF SUGAR,<br>160 MG OF CAFFEINE.<br>A YEAR: 43 LB OF SUGAR, ~$1,100.<br>AT BEDTIME IT’S STILL IN YOU.';
const captions = [
  [MIN30 + 0.3, MIN30 + 2.5, 'Within 30 minutes your heart speeds up.'], [MIN30 + 2.7, HOUR1 - 0.2, '2 big cans: blood pressure up 4–5 points for hours.'],
  [HOUR1 + 0.3, HOUR1 + 2.6, 'One can: 13 teaspoons of sugar.'], [HOUR1 + 2.8, HOUR4 - 0.2, 'That’s 1.5–2× your whole daily limit.'],
  [HOUR4 + 0.3, HOUR4 + 2.8, 'When it wears off…'], [HOUR4 + 3.2, NIGHT - 0.2, '…you reach for another.'],
  [NIGHT + 0.3, NIGHT + 2.8, 'Caffeine’s half-life is about 5 hours.'], [NIGHT + 3.0, WEEK - 0.2, 'A 4 pm can: still 40 mg in you at 2 am.'],
  [WEEK + 0.3, WEEK + 2.6, 'Energy drinks are acidic.'], [WEEK + 2.8, MONTH - 0.2, 'In a lab test, they wore away enamel 2× faster than sports drinks.'],
  [MONTH + 0.3, MONTH + 2.8, 'Skip one day — headache.'], [MONTH + 3.0, YEAR - 0.2, 'Your body is hooked on caffeine.'],
  [YEAR + 0.3, YEAR + 3.4, 'A year of one can a day: 43 lb of sugar.'], [YEAR + 3.6, ER - 0.2, 'And about $1,100.'],
  [ER + 0.3, ER + 3.8, 'In 2011, energy drinks sent 20,783 Americans to the ER.'], [ER + 4.0, SLEEP - 0.2, 'Twice as many as in 2007.'],
  [SLEEP + 0.3, SLEEP + 3.0, 'Your body isn’t out of energy.'], [SLEEP + 3.2, CTA - 0.2, 'It’s out of sleep.'],
  [CTA + 0.2, T_END - 0.1, 'How many cans a day do you drink? 👇'],
];
const TIMELINE = [[0, '12 PM'], [MIN30, '12:30 PM'], [HOUR1, '1 PM'], [HOUR4, '4 PM'], [NIGHT, '2 AM'], [WEEK, 'WEEK 1'], [MONTH, 'MONTH 1'], [YEAR, 'YEAR 1'], [ER, 'IN THE US'], [SLEEP, 'TONIGHT']];
// how you FEEL (a story meter, not a measurement): tired → jolt → crash → second can → wired at night → headache → after a real night's sleep
const EN = [[0, 0.22], [CRACK + 0.4, 0.22], [MIN30 + 1.2, 0.95], [HOUR1, 0.9], [HOUR4, 0.55], [HOUR4 + 1.2, 0.15], [HOUR4 + 4.0, 0.15], [HOUR4 + 5.2, 0.8], [NIGHT, 0.75], [WEEK, 0.5],
  [MONTH, 0.45], [MONTH + 0.8, 0.08], [YEAR, 0.35], [SLEEP + 3.0, 0.3], [SLEEP + 3.6, 1.0], [99, 1.0]];
const energyAt = t => { for (let i = 1; i < EN.length; i++) if (t < EN[i][0]) return lerp(EN[i - 1][1], EN[i][1], smooth(EN[i - 1][0], EN[i][0], t)); return 1; };
const spoonsAt = t => clamp(Math.floor((t - HOUR1 - 0.3) / 0.18) + 1, 0, 13);
const POPS = [[MIN30 + 2.7, HOUR1 - 0.3, () => 'BP +4–5'], [HOUR1 + 0.3, HOUR1 + 2.3, t => spoonsAt(t) + ' TSP'], [HOUR1 + 2.8, HOUR4 - 0.3, () => '1.5–2×'],
  [NIGHT + 3.0, WEEK - 0.3, () => '40 mg'], [WEEK + 2.8, MONTH - 0.3, () => '2×'], [YEAR + 0.3, YEAR + 3.4, () => '43 LB'], [YEAR + 3.6, ER - 0.3, () => '$1,095'],
  [ER + 0.3, ER + 3.8, t => fmt(20783 * smooth(ER + 0.3, ER + 3.2, t))], [ER + 4.0, SLEEP - 0.3, () => '2× 2007']];
const popWords = (txt, t, a, b) => { const ws = txt.split(' '), span = Math.min(1.2, (b - a) * 0.4); return ws.map((w, i) => { const k = clamp((t - a - i * span / ws.length) / 0.12, 0, 1); return `<span style="display:inline-block;opacity:${k.toFixed(2)};transform:scale(${(0.6 + 0.4 * k + 0.1 * Math.sin(Math.PI * k)).toFixed(3)})">${w}</span>`; }).join(' '); };
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t); el.hud.style.opacity = 0;
  el.tl.style.opacity = smooth(0.3, 0.7, t) * (1 - smooth(T_END - 0.4, T_END, t)); const e = energyAt(t);
  el.tlV.textContent = Math.round(e * 100) + '%'; el.tlBar.style.width = (e * 100).toFixed(1) + '%';
  el.tlBar.style.background = e < 0.3 ? 'linear-gradient(90deg,#ff4a3a,#ff7a4a)' : e < 0.6 ? 'linear-gradient(90deg,#ffb030,#ffd060)' : 'linear-gradient(90deg,#4ad86a,#9af07a)';
  el.tlT.textContent = [...TIMELINE].reverse().find(([a]) => t >= a)[1];
  el.flash.style.opacity = Math.exp(-Math.pow((t - CRACK - 1.7) / 0.1, 2)) * 0.6;   // the jolt
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.textContent = pp ? pp[2](t) : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0;
  el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  const cp = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? popWords(cp[2], t, cp[0], cp[1]) : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.2) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t); return true; }   // text pass: no 3D
  // hard cuts inside a beat; a short 0.25 s dissolve when the place changes
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.25, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, ghost]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
