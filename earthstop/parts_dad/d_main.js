// =================== schedule, the phone cards (DOM), HUD, captions, render ===================
const SCN = {}; for (const m of ['b1', 'b2', 'b3', 'b4', 'tw']) SCN[m] = [t => updateRoom(t, m), t => roomCamera(t, m), room, () => rmCam];
for (const m of ['b5', 'b6']) SCN[m] = [t => updateYard(t, m), t => yardCamera(t, m), yard, () => ydCam];
// one continuous take per beat; between the years a soft dissolve (no whip)
const SEQ = [[0, 'b1'], [B2, 'b2'], [B3, 'b3'], [B4, 'b4'], [B5, 'b5'], [B6, 'b6'], [TW, 'tw']]; const XF = 0.8;
function shootScene(id, t, rt) { const S = SCN[id]; S[1](t); S[0](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud', 'card'].map(k => [k, $(k)]));
el.title.innerHTML = 'What your <span class="hl">dad’s texts</span><br>actually mean'; el.endT.innerHTML = 'What your <span class="hl">dad’s texts</span> actually mean';
el.endS.innerHTML = 'EVERY TEXT MEANS THE SAME THING:<br>I’M THINKING ABOUT YOU.<br>HE JUST TYPES IT<br>WITH ONE FINGER.';
// ---- the cards ----
const pop = (t, at) => { const k = clamp((t - at) / 0.22, 0, 1); return `transform:scale(${(0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + 0.06 * Math.sin(k * Math.PI)).toFixed(3)});opacity:${Math.min(1, k * 3).toFixed(2)}`; };
const bubble = (m, t) => { if (t < m.at) return ''; const st = pop(t, m.at);
  if (m.kind === 'weather') return `<div class="bub dad wx" style="${st}"><div class="wxI">❄️</div><div><div class="wxT">34°F</div><div class="wxS">Snow tonight · 6 in</div></div></div>`;
  if (m.kind === 'photo') return `<div class="bub dad ph" style="${st}"><div class="phS">🔥</div><div class="phB">🍔🍔<br>🍔🍔</div></div>`;
  if (m.kind === 'typing') { const k = clamp((t - m.at) / (m.dur || 2.6), 0, 1), s = Math.round(k * 372); return `<div class="bub dad typ" style="${st}"><i></i><i></i><i></i></div><div class="tyT">Dad is typing… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</div>`; }
  return `<div class="bub ${m.from}${m.big ? ' big' : ''}" style="${st}">${m.html}</div>`; };
const chat = (msgs, t) => `<div class="hd"><b class="av">D</b><span>Dad</span></div><div class="bd">${msgs.map(m => bubble(m, t)).join('')}</div>`;
const DRAFT = 'I am so proud of you. I remember the day you learned to ride a bike. You fell eleven times and got back up eleven times. Your mom cried. I did too.';
function draft(t) { const a = B4 + 4.0; let txt;
  if (t < a + 1.7) txt = DRAFT.slice(0, Math.round(DRAFT.length * clamp((t - a) / 1.7, 0, 1)));
  else if (t < a + 2.1) txt = DRAFT; else if (t < a + 3.0) txt = DRAFT.slice(0, Math.round(DRAFT.length * (1 - clamp((t - a - 2.1) / 0.9, 0, 1)))); else txt = 'ok'.slice(0, Math.round(clamp((t - a - 3.05) / 0.25, 0, 1) * 2));
  const sent = t > a + 3.45; return `<div class="hd dp"><span>To: ⭐ MY KID ⭐</span></div><div class="bd"><div class="draft">${txt}<u></u></div>${sent ? `<div class="sent" style="${pop(t, a + 3.45)}">Sent ✓</div>` : ''}</div>`; }
// Dad's side of B3: your long text arrives, he opens the emoji row, taps 👍, taps send — and 👍 flies into the chat
function thumbs(t) { const a = B3, pick = t > a + 1.7, sent = t > a + 2.45, tapS = t > a + 2.2 && t < a + 2.6;
  const emo = ['😀', '😂', '❤️', '👍', '🙏', '😢'].map(e => `<span class="em${e === '👍' && pick ? ' on' : ''}">${e}</span>`).join('');
  const field = sent ? '<span class="phd">Text Message</span>' : pick ? `<span style="${pop(t, a + 1.7)}" class="fe">👍</span>` : '<span class="phd">Text Message</span>';
  return `<div class="hd dp"><span>⭐ MY KID ⭐</span><em>DAD’S PHONE</em></div><div class="bd">` +
    bubble({ at: a + 0.5, from: 'dad', html: 'I know I messed up this semester. I talked to my professor and I’m retaking the class. I really want to make you proud.' }, t).replace('bub dad', 'bub dad sm') +
    (sent ? `<div class="bub you big" style="${pop(t, a + 2.45)}">👍</div><div class="dl" style="opacity:${smooth(a + 2.8, a + 3.0, t)}">Delivered</div>` : '') +
    `</div><div class="kb"><div class="fld">${field}<b class="snd${pick && !sent ? ' go' : ''}${tapS ? ' tap' : ''}">↑</b></div>${t > a + 1.2 && !sent ? `<div class="emr">${emo}</div>` : ''}</div>`; }
function contacts(t) { const hl = t > B1 + 5.0; return `<div class="hd dp"><span>Contacts</span><em>Text size: LARGEST</em></div><div class="bd ct">` +
  ['Bob (work)', 'Dentist', '⭐ MY KID ⭐', 'Pizza Place', 'Steve next door'].map((n, i) => `<div class="row${i === 2 && hl ? ' on' : ''}">${n}</div>`).join('') + '</div>'; }
function storage(t) { const rows = [['🍬', 'Candy Crush', '1.2 GB', TW + 1.6], ['🎣', 'Fishing Clash', '0.9 GB', TW + 2.3], ['🖼️', 'Photos: lawn', '2.1 GB', TW + 3.0], ['💬', '⭐ MY KID ⭐', '4,218 texts', 0]];
  return `<div class="hd dp"><span>iPhone Storage</span></div><div class="bd st"><div class="full">Storage Full</div>` + rows.map(([ic, n, sz, del]) => { const k = del ? clamp((t - del) / 0.35, 0, 1) : 0, keep = !del && t > TW + 3.6;
    return `<div class="row${keep ? ' on' : ''}" style="opacity:${(1 - k).toFixed(2)};max-height:${(110 * (1 - k)).toFixed(0)}px;transform:translateX(${(-260 * k).toFixed(0)}px)"><span>${ic} ${n}</span><b>${del ? (t > del - 0.5 ? '<i class="del">Delete</i>' : sz) : keep ? '❤️ Keep' : sz}</b></div>`; }).join('') + '</div>'; }
// [from, to, content(t)]
const CARDS = [[B1 + 0.2, B1 + 4.0, t => chat([{ at: B1 + 0.7, from: 'dad', html: 'Hello this is Dad.<br>– Dad' }], t)], [B1 + 4.0, B1 + 7.8, contacts],
  [B2 + 0.2, B2 + 3.9, t => chat([{ at: B2 + 0.6, from: 'dad', kind: 'weather' }, { at: B2 + 1.5, from: 'dad', html: 'Snow tonight. 34°F.' }], t)],
  [B3 + 0.2, B3 + 3.9, thumbs],
  [B4 + 0.2, B4 + 4.0, t => chat([{ at: B4 + 0.5, from: 'you', html: 'I GOT THE JOB!!! 🎉' }, { at: B4 + 1.1, from: 'dad', kind: 'typing', dur: 2.6 }], t)], [B4 + 4.0, B4 + 7.8, draft],
  [B5 + 0.2, B5 + 3.9, t => chat([{ at: B5 + 0.6, from: 'dad', html: 'Call me. Not urgent.' }], t)],
  [B6 + 0.2, B6 + 3.9, t => chat([{ at: B6 + 0.6, from: 'dad', kind: 'photo' }], t)],
  [TW + 0.2, REP - 0.2, storage],
  [REP + 0.15, T_END - 0.1, t => chat([{ at: REP + 0.3, from: 'you', html: 'Love you dad ❤️' }, { at: REP + 1.0, from: 'dad', html: '👍', big: true }, { at: REP + 1.8, from: 'dad', html: 'Love you too.<br>– Dad' }], t)]];
const captions = [
  [4.5, 7.9, 'He signs every text.<br>Just in case.'], [8.3, 11.8, 'Translation: you’re the only<br>contact with stars.'],
  [12.5, 15.9, 'Just a weather report…'], [16.3, 19.8, 'Translation: please<br>don’t drive tonight.'],
  [20.5, 23.9, 'You wrote a whole page.<br>He wrote 👍.'], [24.3, 27.8, 'Translation: he read it four times<br>and showed it to Mom.'],
  [28.5, 31.9, 'Dad is typing…<br>for six minutes.'], [32.3, 35.8, 'He wrote a whole paragraph.<br>Then deleted it.'],
  [36.5, 39.9, '“Not urgent.”'], [40.3, 43.8, 'Translation: he just wants<br>to hear your voice.'],
  [44.5, 47.9, 'No words.<br>Just a photo of the grill.'], [48.3, 51.8, 'Translation:<br>I wish you were here.'],
  [52.4, 54.9, 'His phone is full.'], [55.0, 57.8, 'He deletes everything<br>but you.'],
  [58.3, 60.9, 'Text your dad.<br>He’ll reply 👍'],
];
const YEARS = [[B1, 2016, 46], [B2, 2018, 48], [B3, 2019, 49], [B4, 2021, 51], [B5, 2023, 53], [B6, 2024, 54], [TW, 2026, 56]];
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const y = [...YEARS].reverse().find(([a]) => t >= a - 0.2); el.hud.style.opacity = y ? smooth(3.8, 4.3, t) * (1 - smooth(T_END - 0.4, T_END, t)) : 0;
  if (y) { el.stat.textContent = 'DAD’S TEXTS'; el.val.textContent = y[1]; el.sub.textContent = 'DAD IS ' + y[2]; }
  const c = CARDS.find(([a, b]) => t >= a && t < b);
  if (c) { const [a, b, f] = c, kin = smooth(a, a + 0.3, t), kout = smooth(b - 0.3, b, t); el.card.innerHTML = f(t); el.card.style.opacity = Math.min(kin, 1 - kout); el.card.style.transform = `translateX(${(260 * (1 - kin) - 260 * kout).toFixed(0)}px) rotate(${(-1.5 + 1.5 * kin).toFixed(2)}deg)`; }
  else el.card.style.opacity = 0;
  const cp = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  ageDad(clamp((t - B1) / (TW - B1), 0, 1) * 0.75);
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0, cut = -1;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; cut = i + 1; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; cut = i; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  if (!B || mix < 1) shootScene(A, t, RTA); if (B) shootScene(B, t, RTB);
  compMat.uniforms.uWhip.value = 0;
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  composite(B ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
// warm-up: upload every face texture and render every take once, so all textures reach the GPU before the frame loop
// (lazy uploads in the middle of a run once showed another canvas's picture on the yard siding)
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [dad, mom]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const [t0, id] of SEQ) shootScene(id, t0 + 1, RTA); window.renderAt(0); return true; })();
