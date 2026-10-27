// =================== schedule, the phone cards (DOM), HUD, captions, render ===================
const SCN = {}; for (const m of ['intro', 'b1', 'b3', 'b4', 'b5', 'b6', 'tw']) SCN[m] = [t => updateHome(t, m), t => homeCamera(t, m), room, () => rmCam];
SCN.b2 = [updateParty, partyCamera, yard, () => ydCam];
// one continuous take per birthday; a soft dissolve between the years
const SEQ = [[0, 'intro'], [B1, 'b1'], [B2, 'b2'], [B3, 'b3'], [B4, 'b4'], [B5, 'b5'], [B6, 'b6'], [TW, 'tw']]; const XF = 0.8;
function shootScene(id, t, rt) { const S = SCN[id]; S[1](t); S[0](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud', 'card'].map(k => [k, $(k)]));
el.title.innerHTML = 'What your <span class="hl">mom</span> does<br>on your birthday<br>every year'; el.endT.innerHTML = 'What your <span class="hl">mom</span> does on your birthday every year';
el.endS.innerHTML = 'YOUR BIRTHDAY IS THE DAY<br>SHE BECAME A MOM.<br>SHE NEVER FORGETS IT.<br>CALL HER FIRST.';
// ---- the cards ----
const pop = (t, at) => { const k = clamp((t - at) / 0.22, 0, 1); return `transform:scale(${(0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + 0.06 * Math.sin(k * Math.PI)).toFixed(3)});opacity:${Math.min(1, k * 3).toFixed(2)}`; };
const notif = (t, at, who, time, txt) => t < at ? '' : `<div class="nt" style="${pop(t, at)}"><b class="av">${who[0]}</b><div><div class="nh"><span>${who}</span><i>${time}</i></div><div class="nb">${txt}</div></div></div>`;
const lock = (t, inner) => `<div class="hd ls"><span>Your phone</span><em>${t < B5 ? '' : ''}</em></div><div class="bd">${inner}</div>`;
function introCard(t) { return lock(t, notif(t, 0.9, 'Mom', 'now', 'HAPPY BIRTHDAY!!! 🎂🎈🎉❤️')); }
function gallery(t) { const n = Math.round(lerp(12, 214, clamp((t - B1 - 4.2) / 2.4, 0, 1)));
  return `<div class="hd dp"><span>Recents</span><em>MOM’S PHONE · ${n} PHOTOS</em></div><div class="bd gal">` + Array.from({ length: 12 }, (_, i) => `<div class="gt" style="background:${['#f8e4ec', '#d8ecf8', '#fff2c8', '#e4f4dc'][i % 4]}">${['🎂', '👶', '🎂', '😂'][(i * 7) % 4]}</div>`).join('') + '</div>'; }
function post(t) { const likes = Math.round(lerp(0, 47, clamp((t - B3 - 3.2) / 3.0, 0, 1)));
  return `<div class="hd pt"><b class="av">L</b><div><div class="pn">Linda (Mom)</div><div class="pm">Just now · 🌎</div></div></div><div class="bd"><div class="ptx">Happy 13th birthday to my BABY!!! 🎂❤️ Throwback!!!</div>` +
    (t > B3 + 1.4 ? `<div class="pph" style="${pop(t, B3 + 1.4)}">🛁👶🫧</div>` : '') + (t > B3 + 3.2 ? `<div class="pl">👍❤️ ${likes} · <span>Aunt Carol: OMG so cute!!!</span></div>` : '') + '</div>'; }
function search(t) { const q = 'gift for 16 year old who says "nothing"', k = clamp((t - B4 - 0.4) / 1.6, 0, 1), res = t > B4 + 2.2, found = t > B4 + 4.6, ordered = t > B4 + 5.6;
  const rows = ['Hoodie (they have 9)', 'Gift card (too boring)', 'Concert tickets — their favorite band'].map((r, i) => `<div class="row${found && i === 2 ? ' on' : ''}" style="${pop(t, B4 + 2.2 + i * 0.35)}">${r}</div>`).join('');
  return `<div class="hd dp"><span>Search</span><em>11:48 PM</em></div><div class="bd"><div class="sq">🔍 ${q.slice(0, Math.round(q.length * k))}</div>${res ? `<div class="ct">${rows}</div>` : ''}${ordered ? `<div class="sent" style="${pop(t, B4 + 5.6)}">Order placed ✓ Arrives tomorrow</div>` : ''}</div>`; }
function texts20(t) { return lock(t, notif(t, B5 + 0.5, 'Mom', '7:02 AM', 'HAPPY BIRTHDAY MY BABY!!! 🎂🎈🎉❤️') + notif(t, B5 + 4.2, 'Mom', '7:04 AM', '20 years ago right now I was in labor. 19 hours!! Worth every minute ❤️ – Mom') +
  notif(t, B5 + 5.4, 'Sam', '10:41 AM', 'hbd!!') + notif(t, B5 + 6.0, 'Jordan', '11:02 AM', 'happy bday 🎉')); }
function voicemail(t) { const vm = t > B6 + 1.4; return lock(t, notif(t, B6 + 0.5, 'Mom', '6:15 PM', 'Missed call') + (vm ? `<div class="vm" style="${pop(t, B6 + 1.4)}"><b>▶</b><div class="wv">${Array.from({ length: 26 }, (_, i) => `<i style="height:${(10 + 34 * Math.abs(Math.sin(i * 1.7 + (t > B6 + 2.0 ? t * 6 : 0)) * hash(i))).toFixed(0)}px"></i>`).join('')}</div><span>Voicemail · Mom · 0:48</span></div>` : '')); }
function firstText(t) { return `<div class="hd dp"><span>⭐ MY KID ⭐</span><em>MOM’S PHONE · 6:58 AM</em></div><div class="bd">` +
  (t > TW + 1.9 ? `<div class="bub dad" style="${pop(t, TW + 1.9)}">Happy birthday to you too, Mom. 25 years ago today you became a mom ❤️</div>` : '') + (t > REP + 0.4 ? `<div class="bub you" style="${pop(t, REP + 0.4)}">calling you right now 😭❤️</div>` : '') + '</div>'; }
// [from, to, content(t)]
const CARDS = [[0.6, 3.9, introCard], [B1 + 4.0, B1 + 7.8, gallery], [B3 + 0.2, B3 + 7.8, post], [B4 + 0.2, B4 + 7.8, search], [B5 + 0.2, B5 + 7.8, texts20], [B6 + 0.2, B6 + 4.6, voicemail], [TW + 1.6, T_END - 0.1, firstText]];
const captions = [
  [4.4, 7.9, 'Year 1: you wore the cake.'], [8.2, 11.8, 'She has 214 photos of it.'],
  [12.4, 15.9, 'Year 6: thirty balloons.'], [16.2, 19.8, 'She blew up every one.'],
  [20.4, 23.9, 'Year 13: the bathtub photo.'], [24.2, 27.8, 'Every. Single. Year.'],
  [28.4, 31.9, 'Year 16: you said<br>you wanted “nothing.”'], [32.2, 35.8, 'She found the perfect thing<br>anyway.'],
  [36.4, 39.9, 'You moved out.'], [40.2, 43.8, 'Her text still came first.'],
  [44.4, 47.9, 'You missed her call.'], [48.2, 51.8, 'She sang anyway.<br>Then lit a candle on your cake.'],
  [52.4, 54.9, 'This year, you were first.'], [55.0, 57.8, 'It’s her birthday too —<br>the day she became a mom.'],
  [58.2, 60.9, 'Call your mom<br>on your birthday.'],
];
const YEARS = [[B1, 1, 31], [B2, 6, 36], [B3, 13, 43], [B4, 16, 46], [B5, 20, 50], [B6, 24, 54], [TW, 25, 55]];
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const y = [...YEARS].reverse().find(([a]) => t >= a - 0.4); el.hud.style.opacity = y ? smooth(3.8, 4.3, t) * (1 - smooth(T_END - 0.4, T_END, t)) : 0;
  if (y) { el.stat.textContent = 'YOUR BIRTHDAY'; el.val.textContent = 'You turn ' + y[1]; el.sub.textContent = 'MOM IS ' + y[2]; }
  const c = CARDS.find(([a, b]) => t >= a && t < b);
  if (c) { const [a, b, f] = c, kin = smooth(a, a + 0.3, t), kout = smooth(b - 0.3, b, t); el.card.innerHTML = f(t); el.card.style.opacity = Math.min(kin, 1 - kout); el.card.style.transform = `translateY(${(40 * (1 - kin)).toFixed(0)}px) scale(${(0.96 + 0.04 * kin).toFixed(3)})`; }
  else el.card.style.opacity = 0;
  const cp = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
  ageMom(clamp((t - B1) / (TW - B1), 0, 1) * 0.6); ageDad(clamp((t - B1) / (TW - B1), 0, 1) * 0.6);
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && t > SEQ[i + 1][0] - XF / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - XF / 2, SEQ[i + 1][0] + XF / 2, t); }
  else if (i > 0 && t < SEQ[i][0] + XF / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - XF / 2, SEQ[i][0] + XF / 2, t); }
  if (!B || mix < 1) shootScene(A, t, RTA); if (B) shootScene(B, t, RTB);
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  composite(B ? mix : 0, 1.0, 1.0); updateDOM(t); return true;
};
// warm-up: upload every face texture and render every take once before the frame loop (lazy uploads once mixed up textures)
window.sceneReady = (async () => { await document.fonts.ready;
  for (const p of [mom, dad, you1, you6, you13, you16]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const [t0, id] of SEQ) shootScene(id, t0 + 1, RTA); window.renderAt(0); return true; })();
