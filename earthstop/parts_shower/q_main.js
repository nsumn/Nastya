// =================== SHOTS (every framing dollies), HUD = DAYS WITHOUT A SHOWER, captions in the series style (fade + pop) ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const sp = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
const home = m => t => { updateHome(t, m); fx(t, room, m); }, bathU = m => t => { updateBath(t, m); fx(t, bath, m); };
// the smell / flies / grease / patches by day
function fx(t, scene, m) { const day = t < DAY3 ? 0 : t < DAY7 ? 3 : t < DAY14 ? 7 : t < DAY30 ? 14 : 30, shower = t >= SHOWER;
  greasy(shower ? 0 : day >= 3 ? Math.min(1, 0.5 + day / 30) : 0); PATCHES.forEach(p => p.visible = day >= 30 && !shower);
  hero.outer.updateMatrixWorld(true); const hd = H_(hero);
  if (m === 'day14') { stinkAt(scene, shoes.position.clone().add(V3(0, 0.1, 0)), t, 6, 0.3, 1); fliesAt(scene, shoes.position.clone().add(V3(0, 0.25, 0)), t, 5, 0.18); }
  else if (!shower && day >= 3 && m !== 'mirror' && m !== 'doc') { stinkAt(scene, hd.clone().add(V3(0, -0.75, 0)), t, Math.min(10, 2 + day), 0.22, Math.min(1, 0.4 + day / 14)); fliesAt(scene, hd, t, day >= 14 ? 4 : 0); }
  else { stinkAt(scene, hd, t, 0); fliesAt(scene, hd, t, 0); } }
const subU = t => { updateSub(t); fx(t, sub, 'sub'); };
// [start, scene, camera, update(t), framing(t)]
const SHOTS = [
  [0.0, bath, () => bathCam, bathU('title'), t => fr(H_(hero), V3(0.35, 0.05, 1), lerp(2.0, 1.6, sp(t, 0, DAY1)), 0.68)],   // you, the shower… nope
  [DAY1, room, () => rmCam, home('day1'), t => fr(H_(hero), V3(0.2, 0.08, 1), lerp(2.4, 2.0, sp(t, DAY1, MICRO)), 0.62)],   // day 1: totally fine
  [MICRO, micro, () => microCam, updateMicro, t => ({ pos: V3(lerp(-1, 1, sp(t, MICRO, DAY3)), lerp(4.5, 2.4, sp(t, MICRO, DAY3)), lerp(5, 3, sp(t, MICRO, DAY3))), look: V3(0, 0.2, -4), fov: 45 })],   // skin: sweat + bacteria = stink
  [DAY3, room, () => rmCam, home('day3'), t => fr(H_(hero), V3(-0.3, 0.12, 1), lerp(1.5, 1.25, sp(t, DAY3, DAY7)), 0.62)],   // greasy hair, the first stink lines
  [DAY7, sub, () => subCam, subU, t => fr(V3(0, 1.3, 0), V3(0.1, 0.22, 1), lerp(5.2, 4.4, sp(t, DAY7, DAY7 + 3.6)), 0.5)],   // the subway: everybody edges away
  [DAY7 + 3.6, sub, () => subCam, subU, t => fr(H_(hero), V3(0.4, 0.05, 1), lerp(1.4, 1.25, sp(t, DAY7 + 3.6, DAY14)), 0.62)],   // you sniff… smells fine to you
  [DAY14, room, () => rmCam, home('day14'), t => fr(V3(-1.7, 0.25, 1.6), V3(0.6, 0.6, 1), lerp(2.1, 1.8, sp(t, DAY14, DAY14 + 4)), 0.5)],   // the shoes
  [DAY14 + 4.0, room, () => rmCam, home('day14'), t => fr(H_(hero), V3(1, 0.1, 0.35), lerp(1.6, 1.4, sp(t, DAY14 + 4, DAY30)), 0.6)],
  [DAY30, bath, () => bathCam, bathU('mirror'), t => fr(H_(hero), V3(1, 0.02, 0.15), lerp(1.3, 1.1, sp(t, DAY30, DAY30 + 4)), 0.5)],   // the mirror: dark patches on your neck
  [DAY30 + 4.0, bath, () => bathCam, bathU('mirror'), t => fr(H_(hero), V3(0.7, 0.0, 0.7), lerp(1.2, 1.05, sp(t, DAY30 + 4, DOC)), 0.5)],
  [DOC, room, () => rmCam, home('doc'), t => fr(V3(-0.2, 1.3, -2.2), V3(0.15, 0.05, 1), lerp(3.2, 2.6, sp(t, DOC, DOC + 4)), 0.5)],   // the calendar: 5 years
  [DOC + 4.0, room, () => rmCam, home('doc'), t => fr(H_(hero), V3(0.25, 0.06, 1), lerp(1.5, 1.3, sp(t, DOC + 4, SHOWER)), 0.6)],
  [SHOWER, bath, () => bathCam, bathU('shower'), t => fr(H_(hero), V3(0.6, 0.1, 1), lerp(2.0, 1.6, sp(t, SHOWER, T_END)), 0.62)]];   // the shower, finally
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'tl', 'tlN', 'tlC', 'pop', 'flash'].map(k => [k, $(k)]));
const CAPS = [
  [DAY1 + 0.2, DAY1 + 3.0, 'Day 1: honestly? You’re fine.'], [DAY1 + 3.0, MICRO - 0.1, 'Most people don’t need a shower every day.'],
  [MICRO + 0.3, MICRO + 3.2, 'Sweat itself doesn’t smell.'], [MICRO + 3.2, DAY3 - 0.1, 'Skin bacteria turn it into stinky sulfur compounds.'],
  [DAY3 + 0.2, DAY7 - 0.1, 'Day 3: scalp oil piles up. Hair goes flat and shiny.'],
  [DAY7 + 0.2, DAY7 + 3.6, 'Day 7: everyone notices.'], [DAY7 + 3.6, DAY14 - 0.1, 'You don’t. Your nose tunes out your own smell.'],
  [DAY14 + 0.2, DAY14 + 4.0, 'Day 14: your shoes are a bacteria party.'], [DAY14 + 4.0, DAY30 - 0.1, 'Dead skin and oil just… stay on you.'],
  [DAY30 + 0.2, DAY30 + 4.0, 'Some people get dark, dirt-like patches.'], [DAY30 + 4.0, DOC - 0.1, 'Soap often won’t remove them. Rubbing alcohol does.'],
  [DOC + 0.3, DOC + 4.0, 'A doctor stopped showering for 5 years and wrote a book about it.'], [DOC + 4.0, SHOWER - 0.1, 'He still washes his hands. And he doesn’t recommend quitting cold turkey.'],
  [SHOWER + 0.2, ENDC - 0.1, 'Dermatologists: 2–3 showers a week is plenty for most people.']];
const DAYS = [[0, '0'], [DAY1, '1'], [MICRO, '2'], [DAY3, '3'], [DAY7, '7'], [DAY14, '14'], [DAY30, '30'], [DOC, '5 YEARS'], [SHOWER, '0']];
const POPS = [[DAY30 + 4.1, DOC - 0.2, () => 'TERRA FIRMA-FORME', 'DERMATOSIS · HARMLESS, RARE']];
function updateDOM(t, i) { el.title.style.opacity = fadeWin(t, 0, DAY1, 0.35);
  el.tl.style.opacity = smooth(DAY1 - 0.3, DAY1, t) * (1 - smooth(ENDC - 0.3, ENDC, t)) * (SHOTS[i][2] === undefined ? 1 : 1) * (t >= MICRO && t < DAY3 ? 0 : 1);
  const d = [...DAYS].reverse().find(([a]) => t >= a)[1]; el.tlN.textContent = t >= DOC && t < SHOWER ? 'ONE DOCTOR’S EXPERIMENT' : t >= SHOWER ? 'DAYS WITHOUT A SHOWER · RESET' : 'DAYS WITHOUT A SHOWER'; el.tlC.textContent = d;
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.innerHTML = pp ? `<span style="font-size:58px">${pp[2](t)}</span><div class="ps">${pp[3]}</div>` : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0; el.pop.style.transform = 'translateX(-50%)';
  el.flash.style.opacity = 0.35 * Math.exp(-Math.pow((t - SHOWER) / 0.1, 2));
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
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
