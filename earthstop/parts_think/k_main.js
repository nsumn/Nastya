// =================== SHOTS (moving cameras: every framing dollies), HUD = NIGHT x OF 30 + the clock, captions in the series style (fade + pop, no word-by-word) ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const home = m => t => updateHome(t, m);
const heartW = () => heartG.getWorldPosition(V3(0, 0, 0)), brainW = () => brainG.getWorldPosition(V3(0, 0, 0)), adrW = () => V3(0, 1.08, -0.03);
const sp = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
// [start, scene, camera, update(t), framing(t)]
const SHOTS = [
  [0.0, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(0.05, 1, 0.55), lerp(2.5, 2.0, sp(t, 0, THINK)), 0.66)],   // in bed, eyes open; the title above
  [THINK, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(0.2, 1, 0.75), lerp(2.0, 1.75, sp(t, THINK, 7)), 0.6)],   // the thoughts pop up
  [7.0, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(-0.35, 1, 0.6), lerp(1.75, 2.0, sp(t, 7, CORT)), 0.6)],
  [CORT, xr, () => xCam, updateXray, t => { const a = lerp(Math.PI * 0.85, 0.3, sp(t, CORT, CORT + 3)); return fr(brainW(), V3(Math.sin(a), 0.12, Math.cos(a)), lerp(1.2, 0.5, sp(t, CORT, CORT + 3)), 0.5); }],   // spiral in to the alarm centre
  [CORT + 3.0, xr, () => xCam, updateXray, t => fr(brainW().lerp(adrW(), sp(t, CORT + 3, CORT + 4.6)), V3(0.45, 0.1, 1), lerp(0.62, 0.8, sp(t, CORT + 3, HEART)), 0.5)],   // follow the signal down to the adrenals
  [HEART, xr, () => xCam, updateXray, t => fr(heartW(), V3(0.5, 0.15, 1), lerp(0.62, 0.45, sp(t, HEART, HEART + 3)), 0.5)],
  [HEART + 3.0, xr, () => xCam, updateXray, t => fr(heartW(), V3(-0.35, 0.1, 1), lerp(0.75, 0.62, sp(t, HEART + 3, FORCE)), 0.86)],   // under the heart-rate card
  [FORCE, room, () => rmCam, home('force'), t => fr(V3(-2.35, 0.6, 0.95), V3(2.0, 0.85, 0.7), lerp(3.6, 3.2, sp(t, FORCE, FORCE + 3.4)), 0.64)],   // from beside the bed: the sheep hop across the frame   // you + the sheep hopping the fence
  [FORCE + 3.4, room, () => rmCam, home('force'), t => fr(V3(-2.4, 0.6, 0.9), V3(1.6, 0.5, 0.35), lerp(2.8, 2.5, sp(t, FORCE + 3.4, MID)), 0.55)],   // they stop and stare
  [MID, room, () => rmCam, home('mid'), t => fr(H_(hero), V3(0.1, 1, 0.6), lerp(2.4, 2.0, sp(t, MID, MID + 3)), 0.6)],
  [MID + 3.0, room, () => rmCam, home('mid'), t => fr(H_(hero), V3(-0.3, 1, 0.5), lerp(2.0, 1.75, sp(t, MID + 3, MORN)), 0.6)],
  [MORN, room, () => rmCam, home('morn'), t => fr(H_(hero), V3(1, 0.15, 0.45), lerp(2.0, 1.7, sp(t, MORN, MORN + 3)), 0.6)],
  [MORN + 3.0, room, () => rmCam, home('morn'), t => fr(H_(hero), V3(0.85, 0.05, -0.35), lerp(1.35, 1.2, sp(t, MORN + 3, FOG)), 0.6)],
  [FOG, room, () => rmCam, home('fog'), t => fr(V3(3.3, 1.45, -1.5), V3(-0.3, 0.22, 1), lerp(3.1, 2.8, sp(t, FOG, FOG + 4)), 0.74)],   // you + the overflowing cup
  [FOG + 4.0, room, () => rmCam, home('fog'), t => fr(H_(hero), V3(0.5, 0.06, 1), lerp(1.4, 1.2, sp(t, FOG + 4, WALL)), 0.62)],
  [WALL, room, () => rmCam, home('wall'), t => fr(V3(-3.9, 1.55, 1.3), V3(1, 0.12, 0.3), lerp(2.6, 2.25, sp(t, WALL, WALL + 3.4)), 0.47)],   // the wall fills up
  [WALL + 3.4, room, () => rmCam, home('wall'), t => fr(V3(-3.9, 1.5, 1.4), V3(1, 0.1, 0.75), lerp(3.0, 2.8, sp(t, WALL + 3.4, WALL + 5.6)), 0.5)],   // over your shoulder: crossed out
  [WALL + 5.6, room, () => rmCam, home('wall'), t => fr(H_(hero), V3(-0.85, 0.08, -0.5), lerp(1.3, 1.15, sp(t, WALL + 5.6, LIST)), 0.6)],
  [LIST, room, () => rmCam, home('list'), t => fr(H_(hero), V3(0.5, 0.02, 1), lerp(1.6, 1.4, sp(t, LIST, LIST + 2.9)), 0.6)],   // writing tomorrow's list
  [LIST + 2.9, room, () => rmCam, home('list'), t => fr(H_(hero), V3(0.1, 1, 0.6), lerp(1.8, 2.3, sp(t, LIST + 2.9, T_END)), 0.6)]];   // asleep (under the end card too)
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); applyF(c, frm(t)); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'tl', 'tlN', 'tlC', 'pop', 'card', 'labels', 'th'].map(k => [k, $(k)]));
const CAPS = [
  [THINK + 0.2, 7.0, 'Your body is tired.'], [7.0, CORT - 0.15, 'Your brain: “Let’s talk about everything.”'],
  [CORT + 0.3, CORT + 3.0, 'Replaying a stress fires up your brain’s alarm…'], [CORT + 3.2, HEART - 0.15, '…and keeps your stress hormone, cortisol, high at bedtime.'],
  [HEART + 0.3, HEART + 3.0, 'Worry follows you into sleep:'], [HEART + 3.2, FORCE - 0.15, 'your heart beats faster all night.'],
  [FORCE + 0.3, FORCE + 3.3, 'You try HARD to fall asleep.'], [FORCE + 3.5, MID - 0.15, 'Trying hard can make it slower.'],
  [MID + 0.3, MID + 3.0, 'Scientists think that after midnight…'], [MID + 3.2, MORN - 0.15, '…the brain leans negative.'],
  [MORN + 0.3, MORN + 3.0, 'Tired brains overthink more.'], [MORN + 3.2, FOG - 0.15, 'It’s a loop.'],
  [FOG + 0.3, FOG + 4.0, '2 weeks of 6-hour nights: as foggy as an all-nighter.'], [FOG + 4.2, WALL - 0.15, 'And you don’t even notice.'],
  [WALL + 0.3, WALL + 3.4, 'Night 30. A wall of worries.'], [WALL + 3.6, LIST - 0.15, 'In one study, <b>91%</b> of worries never came true.'],
  [LIST + 0.3, LIST + 2.8, 'Try this: write tomorrow’s to-do list.'], [LIST + 3.0, ENDC - 0.15, 'People fell asleep <b>~9 min</b> faster.']];
// big numbers (MODEL = our own assumption: ~1 extra hour awake a night, tools/overthink_math.py)
const POPS = [[FOG + 0.3, FOG + 4.0, () => '14 H', 'SLEEP LOST · MODEL'], [WALL + 3.6, LIST - 0.2, () => '91%', 'NEVER HAPPENED'], [LIST + 3.0, ENDC - 0.2, () => '−9 MIN', 'TO FALL ASLEEP']];
const sheepAt = t => Math.floor(1 + Math.min(t - FORCE, 3.4) * 3.75 + 1240);
function labelsAt(t, i) { if (SHOTS[i][1] !== xr || t >= HEART) return ''; const out = [], put = (p, txt, a) => { const v = p.clone().project(xCam); if (v.z > 1) return; out.push(`<div class="lb" style="left:${((v.x + 1) / 2 * W).toFixed(0)}px;top:${((1 - v.y) / 2 * H).toFixed(0)}px;opacity:${a.toFixed(2)}">${txt}</div>`); };
  brainG.updateMatrixWorld(true); put(AMY[1].getWorldPosition(V3(0, 0, 0)).add(V3(0.04, 0.09, 0)), 'ALARM CENTER', fadeWin(t, CORT + 0.6, CORT + 3.0, 0.25));
  put(adrW().add(V3(0.08, 0.06, 0)), 'ADRENAL GLANDS', fadeWin(t, CORT + 4.0, CORT + 6.0, 0.25)); put(V3(-0.2, 1.24, 0.03), 'CORTISOL', fadeWin(t, CORT + 4.6, HEART, 0.25)); return out.join(''); }
// thought bubbles in fixed screen slots around your face (left / right, clear of the right-hand icon column below y 950 and of the caption band)
const SLOTS = [[60, 560, 'l'], [560, 610, 'r'], [70, 760, 'l'], [560, 800, 'r'], [80, 960, 'l'], [330, 1110, 'l']], DSLOTS = [[60, 560, 'l'], [520, 640, 'r'], [70, 860, 'l'], [300, 1080, 'l']];
function thoughtsAt(t, i) { const k = SHOTS[i][1] === room ? (t < CORT ? 0 : t >= MID && t < MORN ? 1 : -1) : -1; if (k < 0) return ''; let n = 0;
  return THOUGHTS.filter(o => !!o[2] === !!k).map(([t0, txt, dark]) => { const [x, y, side] = (dark ? DSLOTS : SLOTS)[n++]; const u = clamp((t - t0) / 0.28, 0, 1); if (u <= 0) return '';
    const sc = 1 + 0.3 * Math.sin(Math.PI * u) * (1 - u) - (1 - u) * (1 - u) * 0.95, bob = 6 * Math.sin(t * 1.4 + n);
    return `<div class="tb${dark ? ' dk' : ''} ${side}" style="left:${x}px;top:${(y + bob).toFixed(0)}px;transform:scale(${sc.toFixed(3)})">${txt}</div>`; }).join(''); }
function ecg(t) { const bpm = bpmAt(t), ph = t * bpm / 60 * 0.5; let d = ''; for (let x = 0; x <= 640; x += 4) { const u = ((x / 160 + ph) % 1), y = 170 - 80 * Math.exp(-Math.pow((u - 0.2) / 0.015, 2)) + 24 * Math.exp(-Math.pow((u - 0.24) / 0.012, 2)) - 14 * Math.exp(-Math.pow((u - 0.08) / 0.03, 2)) - 22 * Math.exp(-Math.pow((u - 0.5) / 0.06, 2)); d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1); } return d; }
function updateDOM(t, i) { el.title.style.opacity = fadeWin(t, 0, THINK, 0.35);
  const c = clockAt(t); el.tl.style.opacity = smooth(0.4, 0.8, t) * (1 - smooth(ENDC - 0.3, ENDC, t)) * (SHOTS[i][1] === xr ? 0 : 1); el.tlN.textContent = `NIGHT ${c.night} OF 30`; el.tlC.innerHTML = `${c.txt}<small>${c.ap}</small>`;
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.innerHTML = pp ? `${pp[2](t)}<div class="ps">${pp[3]}</div>` : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0;
  el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  if (t >= FORCE + 0.3 && t < MID) { el.pop.innerHTML = `<span style="font-size:80px">${fmt(sheepAt(t))}</span><div class="ps">SHEEP COUNTED</div>`; el.pop.style.opacity = fadeWin(t, FORCE + 0.3, MID, 0.2); el.pop.style.transform = 'translateX(-50%) translateY(-60px)'; }
  if (t >= HEART + 3.0 && t < FORCE) { el.card.style.opacity = fadeWin(t, HEART + 3.0, FORCE, 0.2); el.card.innerHTML = `<div class="hd dp"><span>Your heart at night</span><em>WORRY DAY → FASTER ALL NIGHT</em></div><div class="bd" style="background:#0c1420"><svg viewBox="0 0 640 240" width="640" height="240"><path d="${ecg(t)}" stroke="#30e070" stroke-width="6" fill="none" stroke-linejoin="round"/></svg></div>`; }
  else el.card.style.opacity = 0;
  el.labels.innerHTML = labelsAt(t, i); el.th.innerHTML = thoughtsAt(t, i);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.18) : 0;
  el.cap.style.transform = cp ? `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp((t - cp[0]) / 0.25, 0, 1)) - 0.06 * (1 - clamp((t - cp[0]) / 0.18, 0, 1))).toFixed(3)})` : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.4, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.2, ENDC + 0.6, t); el.endS.style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  // hard cuts inside a beat; a short 0.3 s dissolve when the place changes
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.3, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t; compMat.uniforms.uLook.value = 1;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, ghost]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
