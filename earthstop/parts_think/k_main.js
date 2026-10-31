// =================== SHOTS (moving cameras: every framing dollies), HUD = NIGHT x OF 30 + the clock, captions in the series style (fade + pop, no word-by-word) ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const home = m => t => updateHome(t, m);
const heartW = () => heartG.getWorldPosition(V3(0, 0, 0)), brainW = () => brainG.getWorldPosition(V3(0, 0, 0)), adrW = () => V3(0, 1.08, -0.03);
const sp = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
// [start, scene, camera, update(t), framing(t)]
const B = beat, wallF = (dir, d0, d1, a, b) => t => fr(V3(-3.9, 1.5, 1.35), dir, lerp(d0, d1, sp(t, a, b)), 0.48);
const faceW = (dir, d0, d1, a, b) => t => fr(H_(hero), dir, lerp(d0, d1, sp(t, a, b)), 0.64);
const SHOTS = [   // every cut sits on a beat of her sound; the edit gets faster as the music speeds up (8 beats → 4 → 2 → every hit)
  [0.0, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(0.05, 1, 0.55), lerp(2.5, 2.0, sp(t, 0, THINK)), 0.66)],   // in bed, eyes open; the title above
  [THINK, room, () => rmCam, home('bed'), t => fr(H_(hero), V3(0.2, 1, 0.75), lerp(2.0, 1.75, sp(t, THINK, B(11))), 0.6)],   // thoughts pop on the beats
  [B(11), room, () => rmCam, home('bed'), t => fr(H_(hero), V3(-0.35, 1, 0.6), lerp(1.75, 2.0, sp(t, B(11), CORT)), 0.6)],
  [CORT, xr, () => xCam, updateXray, t => { const a = lerp(Math.PI * 0.85, 0.3, sp(t, CORT, B(21))); return fr(brainW(), V3(Math.sin(a), 0.12, Math.cos(a)), lerp(1.2, 0.62, sp(t, CORT, B(21))), 0.5); }],   // into the alarm centre
  [B(21), xr, () => xCam, updateXray, t => fr(brainW().lerp(adrW(), sp(t, B(21), B(23))), V3(0.45, 0.1, 1), lerp(0.9, 1.05, sp(t, B(21), HEART)), 0.45)],   // the signal runs down to the adrenals
  [HEART, xr, () => xCam, updateXray, t => fr(heartW(), V3(0.5, 0.15, 1), lerp(0.62, 0.45, sp(t, HEART, B(28))), 0.5)],   // the heart beats WITH the music
  [B(28), xr, () => xCam, updateXray, t => fr(heartW(), V3(-0.35, 0.1, 1), lerp(0.75, 0.62, sp(t, B(28), FORCE)), 0.86)],
  [FORCE, room, () => rmCam, home('force'), t => fr(V3(-2.35, 0.6, 0.95), V3(2.0, 0.85, 0.7), lerp(3.6, 3.2, sp(t, FORCE, B(35))), 0.64)],   // the orchestra kicks in: a sheep on every beat
  [B(35), room, () => rmCam, home('force'), t => fr(H_(hero), V3(0.9, 0.75, 0.9), lerp(2.0, 1.8, sp(t, B(35), B(39))), 0.55)],   // you, squeezing your eyes shut
  [B(39), room, () => rmCam, home('force'), t => fr(V3(-2.4, 0.6, 0.9), V3(1.6, 0.5, 0.35), lerp(2.8, 2.5, sp(t, B(39), MID)), 0.55)],   // they stop and stare
  [MID, room, () => rmCam, home('mid'), t => fr(H_(hero), V3(0.1, 1, 0.6), lerp(2.4, 2.0, sp(t, MID, B(45))), 0.6)],
  [B(45), room, () => rmCam, home('mid'), t => fr(H_(hero), V3(-0.3, 1, 0.5), lerp(2.0, 1.75, sp(t, B(45), MORN)), 0.6)],
  [MORN, room, () => rmCam, home('morn'), t => fr(H_(hero), V3(1, 0.15, 0.45), lerp(2.0, 1.7, sp(t, MORN, B(53))), 0.6)],
  [B(53), room, () => rmCam, home('morn'), t => fr(H_(hero), V3(0.85, 0.05, -0.35), lerp(1.35, 1.2, sp(t, B(53), FOG)), 0.6)],
  [FOG, room, () => rmCam, home('fog'), t => fr(V3(3.3, 1.45, -1.5), V3(-0.3, 0.22, 1), lerp(3.1, 2.8, sp(t, FOG, B(61))), 0.74)],
  [B(61), room, () => rmCam, home('fog'), t => fr(H_(hero), V3(0.5, 0.06, 1), lerp(1.4, 1.2, sp(t, B(61), WALL)), 0.62)],
  [WALL, room, () => rmCam, home('wall'), wallF(V3(1, 0.12, 0.3), 2.6, 2.3, WALL, B(69))],   // the notes slap on, two per beat
  [B(69), room, () => rmCam, home('wall'), faceW(V3(-0.75, 0.1, -0.6), 1.35, 1.27, B(69), B(73))],
  [B(73), room, () => rmCam, home('wall'), wallF(V3(1, 0.1, -0.2), 2.3, 2.0, B(73), B(77))],
  [B(77), room, () => rmCam, home('wall'), faceW(V3(-0.55, 0.12, -0.83), 1.3, 1.23, B(77), B(79))],
  [B(79), room, () => rmCam, home('wall'), wallF(V3(1, 0.12, 0.5), 2.0, 1.8, B(79), B(81))],
  [B(81), room, () => rmCam, home('wall'), faceW(V3(-0.85, 0.05, -0.45), 1.23, 1.13, B(81), CROSS)],   // closer and closer…
  [HITS[0], room, () => rmCam, home('wall'), wallF(V3(1, 0.12, 0.3), 2.5, 2.4, HITS[0], HITS[2])],   // the hammer blows: crossed out, cut on every pair of hits
  [HITS[2], room, () => rmCam, home('wall'), faceW(V3(-0.75, 0.1, -0.6), 1.3, 1.25, HITS[2], HITS[4])],
  [HITS[4], room, () => rmCam, home('wall'), wallF(V3(1, 0.1, 0.75), 2.9, 2.8, HITS[4], HITS[7])],
  [HITS[7], room, () => rmCam, home('wall'), faceW(V3(-0.55, 0.12, -0.83), 1.35, 1.3, HITS[7], HITS[8])],
  [HITS[8], room, () => rmCam, home('wall'), wallF(V3(1, 0.15, 0.3), 2.7, 2.6, HITS[8], HITS[10])],
  [HITS[10], room, () => rmCam, home('wall'), faceW(V3(-0.7, 0.1, -0.7), 1.25, 1.35, HITS[10], LIST)],   // the music ends; you breathe out
  [LIST, room, () => rmCam, home('list'), t => fr(H_(hero), V3(0.5, 0.02, 1), lerp(1.6, 1.4, sp(t, LIST, LIST + 2.9)), 0.6)],   // writing tomorrow's list (silence)
  [LIST + 2.9, room, () => rmCam, home('list'), t => fr(H_(hero), V3(0.1, 1, 0.6), lerp(1.8, 2.3, sp(t, LIST + 2.9, T_END)), 0.6)]];   // asleep (under the end card too)
// a punch-in on every beat (and on every final hammer blow) + a shake that grows with the music
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); const F = frm(t), dv = drive(t), k = Math.exp(-(t - Math.max(lastBeat(t), lastHit(t) + 0.0)) * 7), hk = t >= CROSS && t < SONG_END ? Math.exp(-(t - lastHit(t)) * 6) : 0;
  F.fov *= 1 - 0.05 * dv * k - 0.07 * hk; F.pos.add(V3(Math.sin(t * 37), Math.sin(t * 29 + 1), Math.sin(t * 23 + 2)).multiplyScalar(0.012 * dv * dv + 0.02 * hk)); applyF(c, F); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'tl', 'tlN', 'tlC', 'pop', 'card', 'labels', 'th'].map(k => [k, $(k)]));
const CAPS = [
  [THINK + 0.2, B(11), 'Your body is tired.'], [B(11), CORT - 0.15, 'Your brain: “Let’s talk about everything.”'],
  [CORT + 0.3, B(21), 'Replaying a stress fires up your brain’s alarm…'], [B(21), HEART - 0.15, '…and keeps your stress hormone, cortisol, high at bedtime.'],
  [HEART + 0.3, B(28), 'Worry follows you into sleep:'], [B(28), FORCE - 0.15, 'your heart beats faster all night.'],
  [FORCE + 0.3, B(39), 'You try HARD to fall asleep.'], [B(39), MID - 0.15, 'Trying hard can make it slower.'],
  [MID + 0.3, B(45), 'Scientists think that after midnight…'], [B(45), MORN - 0.15, '…the brain leans negative.'],
  [MORN + 0.3, B(53), 'Tired brains overthink more.'], [B(53), FOG - 0.15, 'It’s a loop.'],
  [FOG + 0.3, B(61), '2 weeks of 6-hour nights: as foggy as an all-nighter.'], [B(61), WALL - 0.15, 'And you don’t even notice.'],
  [WALL + 0.3, B(77), 'Night 30. A wall of worries.'], [B(77), CROSS - 0.1, 'Every night, more.'],
  [CROSS + 0.05, HITS[10], 'In one study, <b>91%</b> of worries never came true.'], [HITS[10], LIST - 0.05, 'Breathe.'],
  [LIST + 0.3, LIST + 2.8, 'Try this: write tomorrow’s to-do list.'], [LIST + 3.0, ENDC - 0.15, 'People fell asleep <b>~9 min</b> faster.']];
// big numbers (MODEL = our own assumption: ~1 extra hour awake a night, tools/overthink_math.py)
const POPS = [[FOG + 0.3, B(61), () => '14 H', 'SLEEP LOST · MODEL'], [HITS[8], HITS[10] + 0.2, () => '91%', 'NEVER HAPPENED'], [LIST + 3.0, ENDC - 0.2, () => '−9 MIN', 'TO FALL ASLEEP']];
const sheepAt = t => 1243 + BEATS.filter(b => b >= FORCE && b <= Math.min(t, beat(39))).length;   // +1 per sheep = per beat
function labelsAt(t, i) { if (SHOTS[i][1] !== xr || t >= HEART) return ''; const out = [], put = (p, txt, a) => { const v = p.clone().project(xCam); if (v.z > 1) return; out.push(`<div class="lb" style="left:${((v.x + 1) / 2 * W).toFixed(0)}px;top:${((1 - v.y) / 2 * H).toFixed(0)}px;opacity:${a.toFixed(2)}">${txt}</div>`); };
  brainG.updateMatrixWorld(true); put(AMY[1].getWorldPosition(V3(0, 0, 0)).add(V3(0.04, 0.09, 0)), 'ALARM CENTER', fadeWin(t, CORT + 0.5, beat(21), 0.25));
  put(adrW().add(V3(0.08, 0.06, 0)), 'ADRENAL GLANDS', fadeWin(t, beat(22), HEART + 0.3, 0.25)); put(V3(-0.1, 1.2, 0.05), 'CORTISOL', fadeWin(t, beat(23), HEART, 0.25)); return out.join(''); }
// thought bubbles in fixed screen slots around your face (left / right, clear of the right-hand icon column below y 950 and of the caption band)
const SLOTS = [[60, 560, 'l'], [560, 610, 'r'], [70, 760, 'l'], [560, 800, 'r'], [80, 960, 'l'], [330, 1110, 'l']], DSLOTS = [[60, 560, 'l'], [520, 640, 'r'], [70, 860, 'l'], [300, 1080, 'l']];
function thoughtsAt(t, i) { const k = SHOTS[i][1] === room ? (t < CORT ? 0 : t >= MID && t < MORN ? 1 : -1) : -1; if (k < 0) return ''; let n = 0;
  return THOUGHTS.filter(o => !!o[2] === !!k).map(([t0, txt, dark]) => { const [x, y, side] = (dark ? DSLOTS : SLOTS)[n++]; const u = clamp((t - t0) / 0.28, 0, 1); if (u <= 0) return '';
    const sc = 1 + 0.3 * Math.sin(Math.PI * u) * (1 - u) - (1 - u) * (1 - u) * 0.95, bob = 6 * Math.sin(t * 1.4 + n);
    return `<div class="tb${dark ? ' dk' : ''} ${side}" style="left:${x}px;top:${(y + bob).toFixed(0)}px;transform:scale(${sc.toFixed(3)})">${txt}</div>`; }).join(''); }
function ecg(t) { const ph = t * 0.85; let d = ''; for (let x = 0; x <= 640; x += 4) { const u = ((x / 160 + ph) % 1), y = 170 - 80 * Math.exp(-Math.pow((u - 0.2) / 0.015, 2)) + 24 * Math.exp(-Math.pow((u - 0.24) / 0.012, 2)) - 14 * Math.exp(-Math.pow((u - 0.08) / 0.03, 2)) - 22 * Math.exp(-Math.pow((u - 0.5) / 0.06, 2)); d += (x ? 'L' : 'M') + x + ' ' + y.toFixed(1); } return d; }
function updateDOM(t, i) { el.title.style.opacity = fadeWin(t, 0, THINK, 0.35);
  const c = clockAt(t); el.tl.style.opacity = smooth(0.4, 0.8, t) * (1 - smooth(ENDC - 0.3, ENDC, t)) * (SHOTS[i][1] === xr ? 0 : 1); el.tlN.textContent = `NIGHT ${c.night} OF 30`; el.tlC.innerHTML = `${c.txt}<small>${c.ap}</small>`;
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.innerHTML = pp ? `${pp[2](t)}<div class="ps">${pp[3]}</div>` : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0;
  el.pop.style.transform = pp ? `translateX(-50%) scale(${(0.7 + 0.3 * smooth(pp[0], pp[0] + 0.2, t) + 0.08 * Math.sin(Math.PI * clamp((t - pp[0]) / 0.3, 0, 1))).toFixed(3)})` : '';
  if (t >= FORCE + 0.1 && t < MID) { el.pop.innerHTML = `<span style="font-size:80px">${fmt(sheepAt(t))}</span><div class="ps">SHEEP COUNTED</div>`; el.pop.style.opacity = fadeWin(t, FORCE + 0.1, MID, 0.2); el.pop.style.transform = `translateX(-50%) translateY(-60px) scale(${(1 + 0.12 * Math.exp(-(t - lastBeat(t)) * 8) * (t < beat(39) ? 1 : 0)).toFixed(3)})`; }
  if (t >= B(28) && t < FORCE) { el.card.style.opacity = fadeWin(t, B(28), FORCE, 0.2); el.card.innerHTML = `<div class="hd dp"><span>Your heart at night</span><em>WORRY DAY → FASTER ALL NIGHT</em></div><div class="bd" style="background:#0c1420"><svg viewBox="0 0 640 240" width="640" height="240"><path d="${ecg(t)}" stroke="#30e070" stroke-width="6" fill="none" stroke-linejoin="round"/></svg></div>`; }
  else el.card.style.opacity = 0;
  el.labels.innerHTML = labelsAt(t, i); el.th.innerHTML = thoughtsAt(t, i);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.18) : 0;
  el.cap.style.transform = cp ? `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp((t - cp[0]) / 0.25, 0, 1)) - 0.06 * (1 - clamp((t - cp[0]) / 0.18, 0, 1))).toFixed(3)})` : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.4, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.2, ENDC + 0.6, t); el.endS.style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { const [, , cam, upd, frm] = SHOTS[i]; upd(t); const c = cam(); applyF(c, frm(t)); c.aspect = W / H; c.updateProjectionMatrix(); c.updateMatrixWorld(); updateDOM(t, i); return true; }   // pose + camera only: DOM labels project from them
  // hard cuts inside a beat; a short 0.3 s dissolve when the place changes
  const S = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] ? smooth(S[0] - 0.001, S[0] + 0.3, t) : 1;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); } else shootShot(S, t, RTA);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t; compMat.uniforms.uLook.value = 1;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [hero, ghost]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
