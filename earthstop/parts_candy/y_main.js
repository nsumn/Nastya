// =================== SHOTS (every framing dollies), HUD = the calorie counter (miles on the treadmill), captions in the series style (fade + pop) ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const home = m => t => updateHome(t, m);
const heartW = () => heartG.getWorldPosition(V3(0, 0, 0)), pancW = () => panc.getWorldPosition(V3(0, 0, 0));
const sp = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
const SHOTS = [
  [0.0, room, () => rmCam, home('pile'), t => fr(V3(-1.15, 0.55, 1.45), V3(0.15, 0.55, 1), lerp(3.0, 2.6, sp(t, 0, EAT)), 0.62)],   // the candy mountain + you; the title above
  [EAT, room, () => rmCam, home('pile'), t => fr(H_(hero), V3(0.35, 0.1, 1), lerp(1.5, 1.3, sp(t, EAT, 8)), 0.6)],   // eating, wrappers flying
  [8.0, room, () => rmCam, home('pile'), t => fr(V3(-1.15, 0.5, 1.45), V3(-0.4, 0.8, 1), lerp(2.4, 2.8, sp(t, 8, XRAY)), 0.58)],   // the mountain shrinks
  [XRAY, xr, () => xCam, updateXray, t => fr(heartW(), V3(0.45, 0.12, 1), lerp(0.9, 0.6, sp(t, XRAY, XRAY + 4)), 0.5)],   // sugar floods the blood
  [XRAY + 4.0, xr, () => xCam, updateXray, t => fr(pancW(), V3(-0.4, 0.1, 1), lerp(0.85, 0.7, sp(t, XRAY + 4, RUSH)), 0.5)],   // the pancreas answers with insulin
  [RUSH, room, () => rmCam, home('rush'), t => fr(V3(-0.6, 1.3, 0.9), V3(0.3, 0.15, 1), lerp(3.4, 3.1, sp(t, RUSH, RUSH + 3.3)), 0.66)],   // bouncing…
  [RUSH + 3.3, room, () => rmCam, home('rush'), t => fr(H_(hero), V3(0.2, 0.05, 1), lerp(1.2, 1.1, sp(t, RUSH + 3.3, CRASH)), 0.6)],   // …record scratch: frozen
  [CRASH, room, () => rmCam, home('crash'), t => fr(H_(hero), V3(1, 0.2, 0.4), lerp(2.0, 1.6, sp(t, CRASH, TOOTH)), 0.6)],
  [TOOTH, toothS, () => tCam, updateTooth, t => fr(V3(0, 0.32, 0), V3(0.45, 0.3, 1), lerp(2.2, 1.8, sp(t, TOOTH, TOOTH + 4)), 0.5)],
  [TOOTH + 4.0, toothS, () => tCam, updateTooth, t => fr(V3(0, 0.4, 0.05), V3(-0.3, 0.55, 1), lerp(1.1, 0.95, sp(t, TOOTH + 4, DENT)), 0.5)],
  [DENT, room, () => rmCam, home('dent'), t => fr(H_(hero), V3(-0.3, 0.15, 1), lerp(1.9, 1.7, sp(t, DENT, WALK)), 0.82)],   // under the calendar card
  [WALK, room, () => rmCam, home('walk'), t => fr(H_(hero), V3(0.6, 0.25, 1), lerp(3.4, 3.0, sp(t, WALK, WALK + 4)), 0.4)],
  [WALK + 4.0, room, () => rmCam, home('walk'), t => fr(H_(hero), V3(-0.2, 0.05, 1), lerp(1.3, 1.15, sp(t, WALK + 4, ACHE)), 0.6)],
  [ACHE, room, () => rmCam, home('ache'), t => fr(H_(hero), V3(0.1, 1, 0.6), lerp(1.9, 2.3, sp(t, ACHE, T_END)), 0.6)]];
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'tl', 'tlN', 'tlC', 'pop', 'card', 'flash'].map(k => [k, $(k)]));
const CAPS = [
  [EAT + 0.2, 8.0, 'The average haul: about <b>4,800</b> calories.'], [8.0, XRAY - 0.15, 'That’s 2 days of food. Over 2 lb of candy.'],
  [XRAY + 0.3, XRAY + 4.0, '~380 g of sugar: <b>15×</b> a kid’s daily limit.'], [XRAY + 4.0, RUSH - 0.15, 'Your pancreas floods your blood with insulin.'],
  [RUSH + 0.3, RUSH + 3.3, 'Now the sugar rush, right?'], [RUSH + 3.4, CRASH - 0.15, 'In 23 studies, sugar did NOT make kids hyper.'],
  [CRASH + 0.3, TOOTH - 0.15, 'Within an hour, people feel MORE tired — not less.'],
  [TOOTH + 0.3, TOOTH + 4.0, 'Every sweet snack starts an acid attack on your teeth…'], [TOOTH + 4.0, DENT - 0.15, '…that lasts about 20 minutes.'],
  [DENT + 0.3, WALK - 0.15, 'Twist: dentists say one sitting beats snacking all week.'],
  [WALK + 0.3, WALK + 4.0, 'To burn it all off…'], [WALK + 4.0, ACHE - 0.15, '…walk about <b>51 miles</b>.'],
  [ACHE + 0.2, ENDC - 0.1, 'Your teeth liked it. Your stomach didn’t.']];
const POPS = [[XRAY + 0.3, XRAY + 4.0, () => '15×', 'A KID’S DAILY SUGAR']];
const TOOTH_SVG = '<svg width="46" height="50" viewBox="0 0 46 50"><path d="M6 8 C6 1 17 1 23 6 C29 1 40 1 40 8 C42 20 36 26 35 38 C34 48 28 48 27 38 C26 31 20 31 19 38 C18 48 12 48 11 38 C10 26 4 20 6 8 Z" fill="#fbfaf4" stroke="#8a8a92" stroke-width="2.5"/></svg>';
function dentCard(t) { const day = d => { const k = clamp((t - DENT - 0.4 - d * 0.35) / 0.2, 0, 1); return `<div style="flex:1;text-align:center;opacity:${k.toFixed(2)}"><div style="font-size:22px;color:#8a8a92;font-weight:600">${['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][d]}</div>${TOOTH_SVG}<div style="font-size:20px;color:#e8303a;font-weight:600">ACID</div></div>`; };
  const one = clamp((t - DENT - 3.4) / 0.3, 0, 1);
  return `<div class="hd dp"><span>Your teeth vs. candy</span><em>ACID ATTACKS</em></div><div class="bd" style="gap:22px"><div style="font-size:26px;font-weight:600">A piece a day, all week: <b style="color:#e8303a">7</b></div><div style="display:flex">${[0, 1, 2, 3, 4, 5, 6].map(day).join('')}</div>
    <div style="font-size:26px;font-weight:600;opacity:${one.toFixed(2)}">All of it tonight: <b style="color:#2f9a4a">1</b></div><div style="display:flex;opacity:${one.toFixed(2)}"><div style="flex:1;text-align:center">${TOOTH_SVG}<div style="font-size:20px;color:#e8303a;font-weight:600">ACID</div></div><div style="flex:6"></div></div></div>`; }
function updateDOM(t, i) { el.title.style.opacity = fadeWin(t, 0, EAT, 0.35);
  const walking = t >= WALK && t < ACHE; el.tl.style.opacity = smooth(EAT - 0.3, EAT, t) * (1 - smooth(ENDC - 0.3, ENDC, t)) * (SHOTS[i][1] === room ? 1 : 0);
  el.tlN.textContent = walking ? 'MILES TO WALK IT OFF · MODEL' : 'CALORIES EATEN'; el.tlC.textContent = walking ? (51 * ease(clamp((t - WALK - 0.3) / 6.5, 0, 1))).toFixed(1) : fmt(calAt(t));
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.innerHTML = pp ? `${pp[2](t)}<div class="ps">${pp[3]}</div>` : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0;
  el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  if (t >= DENT && t < WALK) { el.card.style.opacity = fadeWin(t, DENT, WALK, 0.2); el.card.innerHTML = dentCard(t); } else el.card.style.opacity = 0;
  el.flash.style.opacity = 0.5 * Math.exp(-Math.pow((t - RUSH - 3.3) / 0.08, 2));   // the record scratch
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.18) : 0;
  el.cap.style.transform = cp ? `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp((t - cp[0]) / 0.25, 0, 1)) - 0.06 * (1 - clamp((t - cp[0]) / 0.18, 0, 1))).toFixed(3)})` : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.4, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.2, ENDC + 0.6, t); el.endS.style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.3, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t; compMat.uniforms.uLook.value = 1;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, ghost]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
