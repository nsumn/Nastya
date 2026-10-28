// =================== schedule, HUD, speech bubbles, captions, render ===================
const SCN = { open: [t => updateShop(t, 'open'), t => shopCamera(t, 'open'), shop, () => spCam], curve: [updateCurve, curveCamera, curve, () => cvCam], test: [updateClass, classCamera, cls, () => clCam],
  books: [t => updateLib(t, 'books'), t => libCamera(t, 'books'), lib, () => lbCam], bulb: [t => updateLib(t, 'bulb'), t => libCamera(t, 'bulb'), lib, () => lbCam],
  talk: [t => updateTalk(t, 'talk'), t => talkCamera(t, 'talk'), room, () => rmCam], argue: [t => updateTalk(t, 'argue'), t => talkCamera(t, 'argue'), room, () => rmCam], door: [t => updateShop(t, 'end'), t => shopCamera(t, 'end'), shop, () => spCam] };
const SEQ = [[0, 'open'], [CURVE, 'curve'], [TEST, 'test'], [LIB, 'books'], [BULB, 'bulb'], [TALK, 'talk'], [ARGUE, 'argue'], [DOOR, 'door']]; const XF = 0.7;
function shootScene(id, t, rt) { const S = SCN[id]; S[1](t); S[0](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud', 'flash', 'sb1', 'sb2'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if your <span class="hl">IQ</span><br>jumped to 500?'; el.endT.innerHTML = 'What if your <span class="hl">IQ</span> jumped to 500?';
el.endS.innerHTML = 'AN IQ OF 500 IS SO RARE<br>THAT NO HUMAN HAS EVER HAD IT.<br>REAL TESTS STOP AT ~160.<br>THE HIGHEST EVER LISTED: 228.';
const captions = [
  [4.4, 7.9, 'IQ is ranked on a curve.<br>100 is average.'], [8.1, 11.8, '500 is 1 in 10<sup>156</sup>.<br>No human has ever been born with it.'],
  [12.4, 15.9, 'Real IQ tests stop<br>at about 160.'], [16.2, 19.8, 'The highest IQ ever listed:<br>228.'],
  [20.4, 23.9, 'Average reader: 238 words a minute —<br>a book in about 6 hours.'], [24.2, 27.8, 'You’d finish the library<br>by lunch.'],
  [28.4, 31.9, 'Your brain is 2% of your body<br>but burns 20% of your energy.'], [32.2, 35.8, 'About 20 watts.<br>Yours would need a lot more.'],
  [36.4, 39.9, 'You’d know how every<br>sentence ends.'], [40.2, 43.8, 'Small talk would feel<br>like a kids’ puzzle.'],
  [44.4, 47.9, 'You’d win every argument.'], [48.2, 51.8, 'In one sentence.'],
  [52.4, 54.9, 'Even with an IQ of 500…'], [55.0, 57.8, '…some doors just say PULL.'],
  [58.2, 60.9, 'What would you do first? 👇'],
];
const SUBS = [[0, 'AVERAGE'], [CURVE, '1 IN 10¹⁵⁶ PEOPLE'], [TEST, 'TEST LIMIT ≈ 160'], [LIB, 'AVERAGE: 238 WORDS/MIN'], [BULB, 'BRAIN ≈ 20 WATTS'], [TALK, 'SMALL TALK: SOLVED'], [ARGUE, 'ARGUMENTS WON: ALL'], [DOOR, 'DOORS: STILL HARD']];
// speech bubbles above heads (projected from 3D)
const BUBBLES = [[TALK + 0.6, TALK + 3.1, () => fr1, 'So I went to the store, and guess what—'], [TALK + 2.6, TALK + 4.8, () => hero, '—they were out of oat milk.'],
  [ARGUE + 0.5, ARGUE + 3.4, () => sib, 'It’s MY turn to pick the movie!'], [ARGUE + 3.4, ARGUE + 6.6, () => hero, 'You picked last Friday. And the one before.']];
const scr = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  el.hud.style.opacity = smooth(0.4, 0.8, t) * (1 - smooth(T_END - 0.4, T_END, t)) * (t < 3.0 ? 1 - smooth(1.0, 1.2, t) * 0 : 1);
  el.hud.style.setProperty('top', t < CURVE - 0.35 ? '600px' : '350px', 'important'); el.stat.textContent = 'YOUR IQ'; const roll = clamp((t - POP) / 0.5, 0, 1); el.val.textContent = t < POP ? '100' : String(Math.round(100 + 400 * roll * roll)); el.val.style.color = t > POP ? '#ffd060' : '';
  el.sub.textContent = [...SUBS].reverse().find(([a]) => t >= a)[1];
  el.flash.style.opacity = Math.exp(-Math.pow((t - POP - 0.05) / 0.12, 2)) * 0.85;
  [el.sb1, el.sb2].forEach(b => b.style.opacity = 0); let k = 0;
  for (const [a, b, who, txt] of BUBBLES) { if (t < a || t >= b || k > 1) continue; const box = k ? el.sb2 : el.sb1; k++; const P = who(), cam = rmCam, [x, y] = scr(headOf(P).add(V3(0, 0.32, 0)), cam);
    box.textContent = txt; box.style.left = clamp(x, 300, 780) + 'px'; box.style.top = clamp(y, 420, 1300) + 'px'; box.style.opacity = fadeWin(t, a, b, 0.2); box.style.transform = `translate(-50%,-100%) scale(${(0.85 + 0.15 * smooth(a, a + 0.2, t)).toFixed(3)})`; }
  const cp = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
window.renderAt = (t) => {
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
  for (const p of [hero, fr1, fr2, sib, teacher, ...mates]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (const [t0, id] of SEQ) shootScene(id, t0 + 1, RTA); window.renderAt(0); return true; })();
