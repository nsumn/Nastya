// =================== FAST CUTS: a new shot every 2–3 s; timeline HUD (SECOND 1 → YEAR 1), big stat pop-ups, captions that pop word by word ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy, fov);
const H_ = P => headOf(P);
// [start, scene, camera, update(t), framing(t) -> F, extras key]
const SHOTS = [
  [0.0, shop, () => spCam, t => updateShop(t, 'open'), t => fr(V3(0.05, H_(hero).y, Math.max(H_(hero).z, 0.4)), V3(0.15, -0.02, -1), lerp(3.6, 3.0, t / 1.9), 0.58), 'open'],
  [1.9, shop, () => spCam, t => updateShop(t, 'open'), t => fr(H_(hero), V3(0.1, 0.0, -1), lerp(1.5, 1.25, (t - 1.9) / 1.1), 0.56), 'open'],
  [3.0, shop, () => spCam, t => updateShop(t, 'open'), t => fr(H_(hero), V3(-0.25, -0.18, -1), lerp(1.2, 1.6, (t - 3) / 1.4), 0.5, 46), 'open'],
  [4.4, shop, () => spCam, t => updateShop(t, 'open'), t => fr(H_(hero), V3(0.45 + 0.2 * (t - 4.4), 0.12, -1), 3.3, 0.6, 46), 'open'],
  [CURVE, curve, () => cvCam, updateCurve, t => fr(V3(-0.5, 1.0, -1.0), V3(0.05, 1.2, 1), lerp(8, 7, (t - CURVE) / 2.6), 0.5, 46), 'curve'],
  [CURVE + 2.6, curve, () => cvCam, updateCurve, t => fr(V3(iqX(lerp(125, 240, smooth(CURVE + 2.6, CURVE + 5.0, t))), 1.3, -1.6), V3(0.25, 0.1, 1), 3.2, 0.5, 46), 'curve'],   // the markers slide past: 130, 145, 160, 228
  [CURVE + 5.0, curve, () => cvCam, updateCurve, t => fr(H_(hero), V3(0.25, 0.08, 1), lerp(3.0, 2.2, (t - CURVE - 5) / 3), 0.6), 'curve'],
  [TEST, cls, () => clCam, updateClass, t => fr(H_(hero), V3(0.2, 0.35, -1), lerp(1.7, 1.45, (t - TEST) / 2.4), 0.66), 'test'],
  [TEST + 2.4, cls, () => clCam, updateClass, t => fr(H_(hero), V3(-0.5, 0.15, -1), lerp(3.4, 3.0, (t - TEST - 2.4) / 2.6), 0.55, 46), 'test'],
  [TEST + 5.0, cls, () => clCam, updateClass, t => fr(H_(teacher), V3(-0.6, 0.0, -1), lerp(1.9, 1.6, (t - TEST - 5) / 3), 0.6), 'test'],
  [RUBIK, room, () => rmCam, updateRubik, t => fr(rubik.position, V3(0.2, 0.25, 1), lerp(0.7, 0.55, (t - RUBIK) / 2.6), 0.62), 'room'],
  [RUBIK + 2.6, room, () => rmCam, updateRubik, t => fr(H_(hero), V3(-0.2, 0.05, 1), lerp(1.8, 1.5, (t - RUBIK - 2.6) / 2.6), 0.6), 'room'],
  [RUBIK + 5.2, room, () => rmCam, updateRubik, t => fr(H_(hero), V3(0.35, 0.12, 1), lerp(2.4, 2.8, (t - RUBIK - 5.2) / 2.8), 0.62), 'room'],
  [ARGUE, room, () => rmCam, t => updateTalk(t, 'argue'), t => fr(H_(sib), V3(-0.3, 0.1, 1), lerp(1.8, 1.5, (t - ARGUE) / 3.2), 0.6), 'argue'],
  [ARGUE + 3.2, room, () => rmCam, t => updateTalk(t, 'argue'), t => fr(H_(hero), V3(0.4, 0.05, 1), lerp(1.7, 1.5, (t - ARGUE - 3.2) / 1.9), 0.6), 'argue'],
  [ARGUE + 5.1, room, () => rmCam, t => updateTalk(t, 'argue'), t => fr(V3(2.0, 1.4, -0.5), V3(0.2, 0.25, 1), 4.2, 0.55, 46), 'argue'],
  [NOTIF, room, () => rmCam, updateNotif, t => fr(H_(hero), V3(0.3, 0.05, 1), lerp(2.2, 1.8, (t - NOTIF) / 3.6), 0.68), 'room'],
  [CHESS, room, () => rmCam, updateChess, t => fr(V3(0.9, 0.8, 0.6), V3(-0.6, 1.0, 0.3), lerp(1.1, 0.9, (t - CHESS) / 2.2), 0.5), 'room'],
  [CHESS + 2.2, room, () => rmCam, updateChess, t => fr(H_(gm), V3(0.3, 0.05, -1), lerp(1.5, 1.3, (t - CHESS - 2.2) / 2.2), 0.6), 'room'],
  [TALK, room, () => rmCam, updateJoke, t => fr(H_(hero).lerp(H_(fr1), 0.5), V3(0.12, 0.08, 1), 3.3, 0.6), 'joke'],
  [TALK + 3.0, room, () => rmCam, updateJoke, t => fr(H_(hero), V3(-0.25, 0.05, 1), lerp(1.8, 1.4, (t - TALK - 3) / 3), 0.62), 'joke'],
  [DOOR, shop, () => spCam, t => updateShop(t, 'end'), t => fr(V3(0.05, H_(hero).y, Math.max(H_(hero).z, 0.4)), V3(-0.2, 0.05, -1), lerp(4.2, 3.4, (t - DOOR) / 2.3), 0.58, 46), 'door'],
  [DOOR + 2.3, shop, () => spCam, t => updateShop(t, 'end'), t => fr(H_(hero), V3(0.12, -0.05, -1), 1.3, 0.55), 'door'],
  [DOOR + 4.0, shop, () => spCam, t => updateShop(t, 'end'), t => fr(H_(hero), V3(-0.15, 0.03, -1), lerp(2.2, 2.6, (t - DOOR - 4) / 5), 0.6), 'door']];
function shootShot(S, t, rt) { const [, scene, cam, upd, frm, key] = S; upd(t); extras(key, t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'hud', 'flash', 'sb1', 'sb2', 'tl', 'tlBar', 'tlT', 'tlV', 'pop', 'card'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if your <span class="hl">IQ</span><br>jumped to 500?'; el.endT.innerHTML = 'What if your <span class="hl">IQ</span> jumped to 500?';
el.endS.innerHTML = 'AN IQ OF 500 IS SO RARE<br>THAT NO HUMAN HAS EVER HAD IT.<br>REAL TESTS STOP AT ~160.<br>THE HIGHEST EVER LISTED: 228.';
const captions = [
  [4.4, 5.9, 'Your IQ just hit 500.'],
  [6.3, 9.8, '100 is average.'], [10.1, 13.8, '500 is 1 in 10¹⁵⁶. No human has ever had it.'],
  [14.3, 17.8, 'Real IQ tests stop at about 160.'], [18.1, 21.8, 'The highest ever listed: 228. You’re off the chart.'],
  [22.3, 25.8, 'A Rubik’s cube?'], [26.1, 29.8, 'One look. Solved.'],
  [30.3, 33.8, 'You win every argument —'], [34.1, 37.8, '— in one sentence.'],
  [38.3, 41.3, 'Everyone needs your help.'], [41.8, 45.8, 'A grandmaster? Checkmate in one move.'],
  [46.3, 49.2, 'But nobody gets your jokes.'], [49.4, 51.8, 'It’s lonely at 500.'],
  [52.4, 54.3, 'And some things'], [54.4, 57.8, 'no IQ can fix.'],
  [58.2, 60.9, 'What would you do first? 👇'],
];
const TIMELINE = [[0, 'SECOND 1'], [CURVE, 'MINUTE 1'], [TEST, 'HOUR 1'], [RUBIK, 'DAY 1'], [ARGUE, 'WEEK 1'], [NOTIF, 'MONTH 1'], [TALK, 'YEAR 1'], [DOOR, 'EVERY DAY']];
const POPS = [[11.0, 13.7, '1 in 10¹⁵⁶'], [14.3, 17.6, '≈160'], [18.1, 21.6, '228'], [26.1, 29.6, '1 LOOK'], [41.8, 45.6, '1 MOVE']];
const BUBBLES = [[ARGUE + 0.4, ARGUE + 3.2, () => sib, 'It’s MY turn to pick the movie!'], [ARGUE + 3.3, ARGUE + 5.1, () => hero, 'You picked last Friday. And the one before.'],
  [TALK + 0.4, TALK + 3.0, () => hero, '…and THAT’S why the integral diverged! 😂'], [TALK + 2.4, TALK + 3.0, () => fr1, '…what?']];
const NOTES = [['Mom', 'how do i turn off caps lock'], ['Boss', 'can u fix the budget by 5'], ['Neighbor', 'whats 15% of $84.50'], ['Sam', 'help w my homework??'], ['Grandpa', 'the TV says NO SIGNAL'], ['Group chat', 'settle this: is a hot dog a sandwich'], ['Unknown', 'Hi! Are you the genius?'], ['Mom', 'never mind i turned the computer off']];
const scr = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
const popWords = (txt, t, a, b) => { const ws = txt.split(' '), span = Math.min(1.2, (b - a) * 0.4); return ws.map((w, i) => { const k = clamp((t - a - i * span / ws.length) / 0.12, 0, 1); return `<span style="display:inline-block;opacity:${k.toFixed(2)};transform:scale(${(0.6 + 0.4 * k + 0.1 * Math.sin(Math.PI * k)).toFixed(3)})">${w}</span>`; }).join(' '); };
const popStyle = (t, at) => { const k = clamp((t - at) / 0.2, 0, 1); return `transform:scale(${(0.7 + 0.3 * k).toFixed(3)});opacity:${k.toFixed(2)};transform-origin:50% 0`; };
function updateDOM(t, cam) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t); el.hud.style.opacity = 0;
  // timeline HUD: YOUR IQ bar + the time label
  el.tl.style.opacity = smooth(0.3, 0.7, t) * (1 - smooth(T_END - 0.4, T_END, t)); const roll = clamp((t - POP) / 0.5, 0, 1), iq = t < POP ? 100 : Math.round(100 + 400 * roll * roll);
  el.tlV.textContent = iq; el.tlV.style.color = t > POP ? '#ffd060' : '#ffffff'; el.tlBar.style.width = (20 + 80 * (iq - 100) / 400) + '%'; el.tlT.textContent = [...TIMELINE].reverse().find(([a]) => t >= a)[1];
  el.flash.style.opacity = Math.exp(-Math.pow((t - POP - 0.05) / 0.12, 2)) * 0.85;
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.textContent = pp ? pp[2] : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0; el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  [el.sb1, el.sb2].forEach(b => b.style.opacity = 0); let k = 0;
  for (const [a, b, who, txt] of BUBBLES) { if (t < a || t >= b || k > 1) continue; const box = k ? el.sb2 : el.sb1; k++; const [x, y] = scr(headOf(who()).add(V3(0, 0.36, 0)), cam);
    box.textContent = txt; box.style.left = clamp(x, 300, 780) + 'px'; box.style.top = clamp(y, 470, 1300) + 'px'; box.style.opacity = fadeWin(t, a, b, 0.15); box.style.transform = `translate(-50%,-100%) scale(${(0.8 + 0.2 * smooth(a, a + 0.15, t)).toFixed(3)})`; }
  // the "help me" flood (month 1)
  if (t >= NOTIF + 0.6 && t < CHESS) { const n = Math.min(NOTES.length, Math.floor((t - NOTIF - 0.6) / 0.38) + 1); el.card.style.opacity = 1;
    el.card.innerHTML = `<div class="hd ls"><span>Your phone</span></div><div class="bd">` + NOTES.slice(0, n).reverse().slice(0, 5).map(([who, msg], i) => `<div class="nt"${i === 0 ? ` style="${popStyle(t, NOTIF + 0.6 + (n - 1) * 0.38)}"` : ''}><b class="av">${who[0]}</b><div><div class="nh"><span>${who}</span><i>now</i></div><div class="nb">${msg}</div></div></div>`).join('') + '</div>'; }
  else el.card.style.opacity = 0;
  const cp = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? popWords(cp[2], t, cp[0], cp[1]) : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.2) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  // hard cuts inside a beat; a short 0.25 s dissolve when the place changes
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.25, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t, S[2]()); return true;
};
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, fr1, fr2, fr3, fr4, sib, teacher, mom, gm, ...mates, ...mates2, ...walkers.map(w => w.p)]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
