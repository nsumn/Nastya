// =================== TIMELINE from the voice (g_times.js: SENT / WORDS / VO_END) ===================
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const T = { stop: S[1], twice: S[2], why: S[3], centers: S[4], talk: S[5], down: S[6], ctrl: S[7], froze: S[8], air: S[9], cancel: S[10], hack: S[11], duffy: S[12], again: S[13], cta: S[14] };
const T_CTA = T.cta, ENDC = Math.max(VO_END + 0.3, T_CTA + 2.1), T_END = ENDC + 3.0;
const FOL_MODE = new URLSearchParams(location.search).get('fol') || 'tiktok';
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const vlerp = (a, b, k) => a.clone().lerp(b, k);
// ---- per-set updates ----
function upHall(t, crowd) { drawBoard(t, t < T.cancel - 1 ? 0.5 : -1, 0); if (t >= T.cancel - 1) drawBoard(t, 0, 0) ;
  HL.crowd.forEach((p, i) => { p.outer.visible = crowd; if (crowd && !p.bag && !p.outer.userData.sit) poseIdle(p, t, p.outer.userData.ph); }); }
function upApron(t) { AP.stop.forEach((m, i) => { m.material.color.set(Math.floor(t * 3 + i * 0.2) % 2 ? '#ff2020' : '#ff6a50'); });
  const k = span(t, T.again, T.again + 3.2); AP.takeoff.position.set(-300 + 520 * Math.pow(k, 1.6), 5.3 + Math.max(0, k - 0.55) * 160, 260); AP.takeoff.rotation.z = Math.max(0, k - 0.5) * 0.25; AP.takeoff.visible = t >= T.again - 0.2; }
function upNet(t) { const f0 = T.down; NT.sparks.begin();
  NT.cables.forEach((c, i) => { const tf = f0 + c.fail; const dead = t > tf + 0.25, flick = t > tf && !dead ? (Math.sin(t * 90 + i) > 0 ? 1 : 0.15) : 1;
    c.m.color.set(dead ? '#3a1218' : '#3af0ff'); c.m.opacity = dead ? 0.55 : 0.85 * flick;
    c.pulses.forEach((s, k) => { const u = (t * c.sp + c.ph + k / 3) % 1; s.position.copy(c.cur.getPoint(u)); s.visible = !dead && flick > 0.5; });
    if (t > tf && t < tf + 0.9) for (let k = 0; k < 10; k++) { const a = (t - tf) * 2 + k * 0.7; const p = c.mid.clone().add(V3(Math.sin(k * 3.1) * 6 * (t - tf) * 8, -((t - tf) * 25) + Math.cos(k) * 4, Math.cos(k * 1.7) * 6 * (t - tf) * 8)); NT.sparks.add(p, 6 + 6 * Math.sin(k), 1 - (t - tf) / 0.9); } });
  NT.towers.forEach((w, i) => { const off = t > f0 + 0.6 + (i % 7) * 0.15; w.win.emissiveIntensity = off ? 0.06 : 1.6; w.bc.material.color.set(off ? (Math.floor(t * 2 + i) % 2 ? '#ff2020' : '#400808') : '#ff3030'); });
  NT.sparks.end(); smokeMat.uniforms.uTint.value.set('#ffd080'); }
function upSky(t) { SK.planes.forEach((p, i) => { const k = span(t, T.air - 0.3, T.cancel + 0.2), d = 260 * i; p.position.set(-200 + 380 * k - d * 0.4, 120 - i * 25 - 95 * k * k, -120 - d); p.rotation.set(0, 0, -0.12 * (0.4 + k)); }); }
function upSrv(t) { drawError(t); SV.leds.forEach((l, i) => { const bad = hash(i * 7.1) < 0.45; l.material.color.set(bad ? (Math.floor(t * 4 + i) % 2 ? '#ff2a20' : '#401010') : (hash(i + Math.floor(t * 6)) < 0.5 ? '#30ff60' : '#106020')); });
  SV.warn.intensity = 4 * (0.5 + 0.5 * Math.sin(t * 7)); SV.lamp.intensity = 6 * (Math.sin(t * 37) > 0.93 ? 0.4 : 1);
  SV.smoke.begin(); for (let k = 0; k < 60; k++) { const u = ((t * 0.35) + k / 60) % 1; SV.smoke.add(V3(-3 + Math.sin(k * 2.3) * 0.3 * (1 + u * 2), 4.1 + u * 2.4, -3.8 + Math.cos(k) * 0.3 * u), 0.4 + u * 1.2, 0.35 * (1 - u)); } SV.smoke.end(); smokeMat.uniforms.uTint.value.set('#9aa0a8'); }
// ---- shots: [start, set, update(t), camera(t) → [pos, look, fov]] ----
const camAt = (pos, look, fov = 40) => [pos, look, fov];
const SHOTS = [
  [0, HALL, t => upHall(t, false), t => camAt(V3(lerp(-1.5, 1.0, span(t, 0, T.stop)), 6.6, lerp(34, 30, span(t, 0, T.stop))), V3(0, 7.9, 2), 40)],
  [T.stop, APRON, upApron, t => { const k = span(t, T.stop, T.twice); return camAt(V3(lerp(400, 372, k), 5 + 4 * k, lerp(160, 150, k)), V3(200, 7, 120), 38); }],
  [T.twice, APRON, upApron, t => { const k = span(t, T.twice, T.why), a = -0.5 + 0.35 * k; return camAt(V3(Math.sin(a) * 520, 190 - 30 * k, 60 + Math.cos(a) * 520), V3(60, 0, 80), 40); }],
  [T.why, NET, upNet, t => { const k = span(t, T.why, T.talk), a = 0.2 + 0.5 * k; return camAt(V3(Math.sin(a) * 760, 520 - 120 * k, Math.cos(a) * 760), V3(0, 30, 0), 42); }],
  [T.talk, NET, upNet, t => { const k = span(t, T.talk, T.down), p = NT.towers[0].p; return camAt(p.clone().add(V3(lerp(90, 70, k), 34, lerp(120, 90, k))), p.clone().add(V3(-40, 0, -30)), 44); }],
  [T.down, NET, upNet, t => { const k = span(t, T.down, T.ctrl), a = 0.9 + 0.25 * k; return camAt(V3(Math.sin(a) * 560, 380 - 60 * k, Math.cos(a) * 560), V3(0, 30, 0), 42); }],
  [T.ctrl, NET, upNet, t => { const k = span(t, T.ctrl, T.froze), p = NT.towers[3].p; return camAt(p.clone().add(V3(lerp(30, 22, k), 4 + 2 * k, lerp(34, 26, k))), p.clone().add(V3(0, -2, 0)), 46); }],
  [T.froze, APRON, upApron, t => { const k = span(t, T.froze, T.air); return camAt(V3(lerp(352, 344, k), 3.2, lerp(96, 100, k)), V3(290, 6, 120), 36); }],
  [T.air, SKY, upSky, t => { const p = SK.planes[0].position; return camAt(p.clone().add(V3(-40, 16, 70)), p.clone().add(V3(10, -4, 0)), 42); }],
  [T.cancel, HALL, t => upHall(t, true), t => { const k = span(t, T.cancel, T.hack); return camAt(V3(lerp(-5, 3, k), lerp(5.5, 4.8, k), lerp(34, 30, k)), V3(0, 4.5, 6), 46); }],
  [T.hack, SRV, upSrv, t => { const k = span(t, T.hack, T.duffy); return camAt(V3(lerp(3.2, 2.2, k), 2.5, lerp(5.6, 4.4, k)), V3(-0.8, 1.9, -2.6), 44); }],
  [T.duffy, SRV, upSrv, t => { const k = span(t, T.duffy, T.again); return camAt(V3(lerp(2.9, 2.5, k), 1.85, lerp(2.4, 2.0, k)), V3(1.3, 1.6, -0.7), 40); }],
  [T.again, APRON, upApron, t => { const k = span(t, T.again, T_END); const p = AP.takeoff.position; return camAt(V3(p.x * 0.5 - 60, 10 + p.y * 0.4, 470), p.clone().add(V3(0, 6, 0)), 32); }]];
function shootShot(Sh, t, rt) { const [, set, upd, cam] = Sh; upd(t); const [p, l, f] = cam(t); set.cam.position.copy(p); set.cam.lookAt(l); set.cam.fov = f;
  smokeMat.uniforms.uScale.value = H / (2 * Math.tan(f * Math.PI / 360)); shootTo(rt, set.sc, set.cam); }
// ---- DOM: captions (spoken word highlighted), stamps, clock, timeline, follow call, end card ----
const $ = id => document.getElementById(id);
const SOFT = [[/\bkill(ed|ing|s)?\b/gi, m => m[0] + '*' + m.slice(2)], [/\bdead\b/gi, m => m[0] + '*' + m.slice(2)], [/\bdie(d|s)?\b/gi, m => m[0] + '*' + m.slice(2)]];
const soft = s => SOFT.reduce((a, [re, f]) => a.replace(re, f), s);
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 5; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.2)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.08 ? 'y' : ''}">${soft(w[2])}</span>`).join(' '); }
const BIG = [[wordT('ground', S[1]), S[2] - 0.1, 'GROUND STOP', 'FRIDAY · 3:54 PM ET', 'r'], [wordT('twice', S[2]), S[3] - 0.1, 'ONLY 3RD TIME', 'IN U.S. HISTORY', 'w'],
  [wordT('20', S[4]), S[5] - 0.1, '20 CENTERS', 'AIR TRAFFIC CONTROL', 'b'], [wordT('one', S[5]), S[6] - 0.1, 'ONE NETWORK', 'TELECOM LINKS', 'b'], [wordT('down', S[6]), S[8] - 0.1, 'NETWORK DOWN', 'FRIDAY AFTERNOON', 'r'],
  [wordT('froze', S[8]), S[9] - 0.1, 'NO DEPARTURES', 'NATIONWIDE', 'r'], [wordT('thousands', S[10]), wordT('one', S[10]) - 0.1, 'THOUSANDS', 'OF FLIGHTS CANCELED', 'r'], [wordT('one', S[10]), S[11] - 0.1, '1.5M STUCK', 'PASSENGERS', 'r'],
  [wordT('not', S[11]), S[12] - 0.1, 'NOT A HACK', 'NO SIGN OF A CYBERATTACK', 'w'], [wordT('old', S[12]), S[13] - 0.1, 'OLD, OVERLOADED', 'EQUIPMENT — SEAN DUFFY', 'r'], [wordT('again', S[13]), T_CTA - 0.1, 'AGAIN?', 'HE WON’T RULE IT OUT', 'w']];
function updateDOM(t) {
  $('hook').style.opacity = 1 - smooth(T.stop - 0.4, T.stop, t); $('hook').style.transform = `scale(${pop(t, 0, 0.35).toFixed(3)})`;
  $('head').style.opacity = t < T.stop || t >= ENDC ? 0 : 1;
  const B = BIG.find(x => t >= x[0] && t < x[1]); if (B) { const q = pop(t, B[0], 0.32), f = 1 - smooth(B[1] - 0.2, B[1], t); $('big').innerHTML = `<div class="bv ${B[4]}" style="font-size:${B[2].length > 12 ? 84 : 110}px">${B[2]}</div><div class="bs">${B[3]}</div>`; $('big').style.opacity = f; $('big').style.transform = `rotate(-3deg) scale(${q.toFixed(3)})`; } else $('big').style.opacity = 0;
  // the 3 nationwide ground stops (on "twice before")
  { const on = t >= T.twice && t < T.why; $('tline').style.opacity = on ? smooth(T.twice, T.twice + 0.2, t) * (1 - smooth(T.why - 0.2, T.why, t)) : 0; if (on) $('tline').innerHTML = [['SEP 11, 2001', wordT('9', T.twice)], ['JAN 11, 2023', wordT('January', T.twice)], ['NOV 13, 2026', wordT('January', T.twice) + 0.8]].map(([l, a], i) => `<div class="tp${i === 2 ? ' now' : ''}" style="opacity:${t >= a ? 1 : 0.15};transform:scale(${(t >= a ? pop(t, a, 0.3) : 1).toFixed(3)})">${l}</div>`).join(''); }
  // the clock 3:54 → 8:15 PM while "nothing took off for more than four hours"
  { const on = t >= T.air && t < T.cancel; $('clock').style.opacity = on ? smooth(T.air, T.air + 0.2, t) * (1 - smooth(T.cancel - 0.2, T.cancel, t)) : 0; if (on) { const m = Math.round(lerp(15 * 60 + 54, 20 * 60 + 15, easeOut(span(t, T.air + 0.3, T.cancel - 0.6)))); const h = Math.floor(m / 60), mm = m % 60; $('clock').innerHTML = `<div class="cl">${h - 12}:${String(mm).padStart(2, '0')} PM</div><div class="cs">NOTHING TAKES OFF</div>`; } }
  // the follow call (TikTok-style by default, see parts_plug)
  { const f0 = T_CTA + 0.05, on = t >= f0 && t < ENDC, OUT = 1 - smooth(ENDC - 0.25, ENDC, t); $('fol').style.opacity = on ? smooth(f0, f0 + 0.2, t) * OUT : 0;
    if (on) { const tap = f0 + 1.0, k = pop(t, f0, 0.35), fu = easeOut(span(t, f0 + 0.35, tap - 0.05)), press = t >= tap - 0.05 && t < tap + 0.15 ? 0.82 : 1, done = t >= tap + 0.12;
      $('fol').style.transform = `translateX(-50%) scale(${k.toFixed(3)})`; $('folPlus').style.transform = `translateX(-50%) scale(${(press * (done ? pop(t, tap + 0.12, 0.3) : 1)).toFixed(3)})`; $('folPlus').className = done ? 'ok' : ''; $('folPlus').textContent = done ? '✓' : '+';
      $('folRip').style.opacity = t >= tap ? (1 - span(t, tap, tap + 0.5)).toFixed(2) : 0; $('folRip').style.transform = `translateX(-50%) scale(${(1 + 1.6 * span(t, tap, tap + 0.5)).toFixed(3)})`;
      $('folHand').style.transform = `translate(${(160 * (1 - fu)).toFixed(0)}px, ${(220 * (1 - fu) + (press < 1 ? 10 : 0)).toFixed(0)}px) rotate(-14deg)`; } }
  $('cta').style.opacity = t >= T_CTA - 0.1 && t < ENDC ? smooth(T_CTA - 0.1, T_CTA + 0.2, t) * (1 - smooth(ENDC - 0.25, ENDC, t)) : 0; $('cta').style.transform = `scale(${pop(t, T_CTA - 0.1, 0.35).toFixed(3)})`;
  $('veil').style.opacity = t >= T_CTA - 0.1 ? 0.55 * smooth(T_CTA - 0.1, T_CTA + 0.3, t) : 0;
  $('cap').innerHTML = t < ENDC ? capHTML(t) : ''; $('cap').style.opacity = t >= T_CTA ? 1 - smooth(ENDC - 0.25, ENDC, t) : 1;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.3, t); $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.4, t); $('endS').style.opacity = smooth(ENDC + 0.5, ENDC + 0.9, t); $('endB').style.opacity = smooth(ENDC + 0.1, ENDC + 0.4, t); }
const CUES = [[0.02, 'whoosh', 0.5], [0.5, 'flip', 0.7], [T.stop, 'alarm', 0.5], [wordT('ground', S[1]), 'stamp', 0.7], [T.why - 0.2, 'whoosh', 0.5], [T.centers, 'ding', 0.4], [T.down, 'boom', 0.35], [T.down + 0.1, 'alarm', 0.4],
  [T.froze, 'stamp', 0.6], [T.air - 0.2, 'jet', 0.6], [T.cancel, 'crowd', 0.5], [T.hack - 0.2, 'whoosh', 0.5], [T.hack, 'type', 0.5], [T.again, 'jet', 0.7], ...BIG.map(b => [b[0], 'pop', 0.5]), ...(FOL_MODE === 'tiktok' ? [[T_CTA + 1.05, 'follow', 0.9]] : []), [ENDC, 'whoosh', 0.5]];
window.renderAt = (t) => { let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS !== 'text') { const Sh = SHOTS[i], P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== Sh[1] ? smooth(Sh[0] - 0.001, Sh[0] + 0.25, t) : 1;
    if (t >= ENDC + 0.35) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); }
    else { if (mix < 1) { shootShot(P, t, RTA); shootShot(Sh, t, RTB); } else shootShot(Sh, t, RTA);
      const u = compMat.uniforms; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = t >= T.down && t < T.froze ? 0.35 * Math.max(0, Math.sin((t - T.down) * 4)) : 0; u.uT.value = t; u.uLook.value = 0.35; if (u.uTilt) u.uTilt.value = 0;
      composite(mix < 1 ? mix : 0, 1.0, 1.0); } }
  updateDOM(t); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await Promise.all(['900', '800', '700'].map(w => document.fonts.load(`${w} 60px Inter`)).concat([document.fonts.load('400 60px Anton')]));
  drawBoard(0, -1); drawError(0); for (const Sh of SHOTS) shootShot(Sh, Sh[0] + 0.3, RTA); window.renderAt(0); return true; })();
