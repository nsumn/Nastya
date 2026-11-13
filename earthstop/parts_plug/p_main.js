// =================== PHOTO NEWS ("What happened in America in the last 24 hours") — Nov 13 2026 — dailyplug-style pace, our own look ===================
// No WebGL: every frame is DOM only (photos with a slow Ken Burns push, blurred backdrop, Anton plates, word-highlight captions). Frames = pure function of t.
// Photos: assets/news/big/<key>.jpg via tools/plug_photo.py (Wikimedia Commons; credits in the TikTok description).
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const smooth = (a, b, x) => { const k = span(x, a, b); return k * k * (3 - 2 * k); };
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
// photo framing: object-position (faces high in the frame)
const POS = { huang: '50% 25%', nvidiahq: '50% 50%', flatbush: '50% 40%', brooklyn: '50% 45%', fdny: '40% 50%', colom: '50% 22%', hydesmith: '50% 22%', peltola: '50% 22%', sullivan: '50% 22%', bessent: '50% 22%',
  tomb: '55% 50%', hegseth: '50% 20%', flame: '50% 55%', massie: '50% 22%', witkoff: '50% 22%', kushner: '50% 22%', putin: '50% 22%', kreml: '50% 50%', darchiev: '50% 22%', capitol: '50% 30%', mississippi: '50% 60%', anchorage: '50% 50%' };
// shots: [start, photo | [left, right], kicker, story #]
const N = 11;
const SH = [
  [0, 'capitol', '', 0],
  [S[1], 'huang', 'NVIDIA', 1], [S[2], 'huang2', 'NVIDIA', 1], [S[3], 'nvidiahq', 'NVIDIA', 1],
  [S[5], 'flatbush', 'BROOKLYN, NY', 2], [S[6], 'brooklyn', 'BROOKLYN, NY', 2], [S[7], 'fdny', 'BROOKLYN, NY', 2],
  [S[8], ['colom', 'hydesmith'], 'MISSISSIPPI', 3], [S[9], 'colom', 'MISSISSIPPI', 3],
  [S[10], ['peltola', 'sullivan'], 'ALASKA', 4],
  [S[11], 'bessent', 'TREASURY', 5],
  [S[12], 'tomb', 'ARLINGTON', 6], [wordT('Hegseth', S[12]) - 0.1, 'hegseth', 'ARLINGTON', 6],
  [S[13], 'flame', 'KENNEDY FAMILY', 7],
  [S[14], 'massie', 'EPSTEIN FILES', 8],
  [S[15], ['witkoff', 'kushner'], 'RUSSIA', 9], [wordT('Vladimir', S[15]) - 0.1, 'putin', 'RUSSIA', 9],
  [S[16], 'darchiev', 'RUSSIA', 10],
  [S[18], 'capitol', '', 11]];
const shotIx = t => { let i = 0; while (i < SH.length - 1 && t >= SH[i + 1][0]) i++; return i; };
// big numbers / stamps: [from, to, text, sub, colour class]
const BIG = [
  [wordT('resigned', S[1]), S[2], 'RESIGNED', 'CEO SINCE 1993', 'r'],
  [wordT('spied', S[2]) - 0.1, S[3], 'ALLEGED SPY', 'TWO AFFAIRS REPORTED', 'r'],
  [wordT('13', S[3]), S[4], '−13%', 'NVIDIA STOCK, AT ONE POINT', 'r'],
  [S[4] + 0.2, S[5], 'INTERIM CEO', 'COLETTE KRESS · CFO', 'w'],
  [wordT('Eight', S[6]), S[7], '8 DEAD', '2 CHILDREN · 17+ INJURED', 'r'],
  [wordT('investigation', S[7]) - 0.2, S[8], 'CAUSE?', 'UNDER INVESTIGATION', 'w'],
  [wordT('1982', S[9]), S[10], '1ST SINCE 1982', 'FIRST BLACK SENATOR SINCE RECONSTRUCTION', 'b'],
  [wordT('15', S[10]), S[11], '15% LEFT', 'BALLOTS STILL UNCOUNTED', 'b'],
  [wordT('military', S[11]), S[12], 'MILITARY BASE', 'AFTER THREATS FROM IRAN', 'r'],
  [wordT('stop', S[12]), S[13], '“SILENCE AND RESPECT”', 'THE TOMB GUARD', 'w'],
  [wordT('250', S[13]), S[14], '250 FT', 'TRUMP’S PLANNED ARCH', 'r'],
  [wordT('218', S[14]), S[15], '218', 'SIGNATURES — A NEW VOTE', 'b'],
  [wordT('died', S[16]), S[18] - 0.1, 'DIED SUDDENLY', 'NO CAUSE GIVEN', 'r']];
// two-photo tags
const TAGS = { colom: ['WON', 'b'], hydesmith: ['LOST', 'g'], peltola: ['LEADS', 'b'], sullivan: ['TRAILS', 'g'], witkoff: ['WITKOFF', 'w'], kushner: ['KUSHNER', 'w'] };
const NAMES = { huang: 'JENSEN HUANG', huang2: 'JENSEN HUANG', colom: 'SCOTT COLOM', hydesmith: 'CINDY HYDE-SMITH', peltola: 'MARY PELTOLA', sullivan: 'DAN SULLIVAN', bessent: 'SCOTT BESSENT', hegseth: 'PETE HEGSETH', massie: 'THOMAS MASSIE', putin: 'VLADIMIR PUTIN', darchiev: 'ALEXANDER DARCHIEV', flame: 'JFK’S ETERNAL FLAME', tomb: 'TOMB OF THE UNKNOWN SOLDIER', flatbush: 'FLATBUSH AVENUE', nvidiahq: 'NVIDIA HQ · SANTA CLARA' };
const src = k => `assets/news/big/${k === 'huang2' ? 'huang' : k}.jpg`;
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 5; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.2)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.08 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
function photoHTML(key, t, a, b, w, x) { const u = span(t, a, b + 0.4), dir = (key.length % 2) ? 1 : -1, k = key === 'huang2' ? 1.35 : 1.0;
  const sc = k * (1.04 + 0.14 * u), tx = dir * 18 * (u - 0.5), ty = key === 'huang2' ? 60 : -8 * u;
  const nm = NAMES[key] && w > 600 ? `<div class="nm">${NAMES[key]}</div>` : NAMES[key] ? `<div class="nm sm">${NAMES[key]}</div>` : '';
  const tg = TAGS[key] ? `<div class="tg ${TAGS[key][1]}" style="transform:scale(${pop(t, a + 0.35, 0.25).toFixed(3)})">${TAGS[key][0]}</div>` : '';
  return `<div class="ph" style="left:${x}px;width:${w}px"><img src="${src(key)}" style="object-position:${POS[key] || POS[key.replace(/\d$/, '')] || '50% 30%'};transform:translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${sc.toFixed(4)})">${nm}${tg}</div>`; }
function shotHTML(i, t) { const [a, p] = SH[i], b = i < SH.length - 1 ? SH[i + 1][0] : T_END;
  return Array.isArray(p) ? photoHTML(p[0], t, a, b, 487, 40) + photoHTML(p[1], t, a, b, 487, 553) : photoHTML(p, t, a, b, 1000, 40); }
const bgKey = p => Array.isArray(p) ? p[0] : p === 'huang2' ? 'huang' : p;
function renderAt(t) { const i = shotIx(t), [a, p, kick, n] = SH[i];
  // slide-in of the new shot over the old one (0.28 s), with a short blur
  const k = i > 0 ? easeOut(span(t, a, a + 0.28)) : 1;
  let h = '';
  if (k < 1) h += `<div class="band" style="transform:translateX(${(-1080 * k * 0.35).toFixed(0)}px);opacity:${(1 - k).toFixed(2)}">${shotHTML(i - 1, t)}</div>`;
  h += `<div class="band" style="transform:translateX(${(1080 * (1 - k)).toFixed(0)}px);filter:blur(${(10 * (1 - k)).toFixed(1)}px)">${shotHTML(i, t)}</div>`;
  $('bands').innerHTML = h; $('bands').className = BIG.some(x => t >= x[0] - 0.1 && t < x[1]) ? 'hidenm' : '';
  $('bg').src = src(bgKey(p)); $('bg').style.transform = `scale(${(1.35 + 0.05 * Math.sin(t * 0.2)).toFixed(3)})`;
  // header + kicker + counter
  const kk = kick && t < ENDC ? pop(t, SH.find(s => s[2] === kick)[0], 0.3) : 0;
  $('kick').style.opacity = kick && t < ENDC ? 1 : 0; $('kick').textContent = kick; $('kick').style.transform = `skewX(-8deg) scale(${kk.toFixed(3)})`;
  $('cnt').style.opacity = n >= 1 && n <= 10 ? 1 : 0; $('cnt').textContent = `${n}/10`;
  $('head').style.opacity = t < 1.7 || t >= ENDC ? 0 : 1;
  // big number / stamp
  const B = BIG.find(x => t >= x[0] && t < x[1]); if (B) { const q = pop(t, B[0], 0.32), f = 1 - smooth(B[1] - 0.2, B[1], t);
    $('big').innerHTML = `<div class="bv ${B[4]}" style="font-size:${B[2].length > 12 ? 74 : B[2].length > 8 ? 96 : 130}px">${B[2]}</div><div class="bs">${B[3]}</div>`; $('big').style.opacity = f; $('big').style.transform = `rotate(-3deg) scale(${q.toFixed(3)})`; }
  else $('big').style.opacity = 0;
  // hook (frame 0) and CTA
  $('hook').style.opacity = 1 - smooth(1.45, 1.75, t); $('hook').style.transform = `scale(${pop(t, 0, 0.3).toFixed(3)})`;
  $('cta').style.opacity = t >= S[18] - 0.1 && t < ENDC ? smooth(S[18] - 0.1, S[18] + 0.2, t) : 0; $('cta').style.transform = `scale(${pop(t, S[18] - 0.1, 0.35).toFixed(3)})`;
  $('cap').innerHTML = t < ENDC ? capHTML(t) : '';
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t); $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.7, ENDC + 1.1, t);
  return true; }
window.renderAt = renderAt;
const ALL = [...new Set(SH.flatMap(s => Array.isArray(s[1]) ? s[1] : [s[1]]).map(src))];
window.sceneReady = (async () => { await document.fonts.ready; await Promise.all(['900', '800', '700'].map(w => document.fonts.load(`${w} 60px Inter`)).concat([document.fonts.load('400 60px Anton')]));
  await Promise.all(ALL.map(f => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = f; }))); renderAt(0); return true; })();
// audio cues for tools/plug_cues.mjs
const CUES = [[0.02, 'whoosh', 0.5], [0.06, 'stamp', 0.6], ...SH.slice(1).map(s => [s[0], 'whoosh', 0.45]), ...BIG.map(b => [b[0], /DEAD|DIED/.test(b[2]) ? 'thud' : /RESIGNED|SPY|SILENCE/.test(b[2]) ? 'stamp' : 'pop', 0.6]),
  [S[1], 'shutter', 0.7], [S[3], 'coins', 0.5], [S[8], 'cheer', 0.4], [S[14], 'paper', 0.6], [S[18], 'ding', 0.6], [ENDC, 'thud', 0.5]];
