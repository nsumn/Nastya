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
const T_CTA = S[S.length - 1];
const FOL_MODE = (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('fol') : null) || 'tiktok';   // her call Nov 14: the appeal restored the video, the TikTok-style follow animation is back   // 'brand' | 'tiktok' (see the FOLLOW call in renderAt)   // the last sentence is the follow call (no question to the viewers — her rule Nov 13)
const ENDC = Math.max(VO_END + 0.3, T_CTA + 2.1), T_END = ENDC + 2.2;   // the follow animation needs ~2 s; the recap at the end lasts ~2 s and has pictures
// photo framing: object-position (faces high in the frame)
const POS = { huang: '50% 34%', nvidiahq: '50% 50%', flatbush: '50% 40%', brooklyn: '50% 45%', fdny: '40% 50%', colom: '50% 22%', hydesmith: '50% 22%', peltola: '50% 22%', sullivan: '50% 22%', bessent: '50% 22%',
  tomb: '55% 50%', hegseth: '50% 20%', flame: '50% 55%', massie: '50% 22%', witkoff: '50% 22%', kushner: '50% 22%', putin: '50% 22%', kreml: '50% 50%', darchiev: '50% 22%', capitol: '50% 30%', mississippi: '50% 60%', anchorage: '50% 50%' };
// shots: [start, photo | [left, right], kicker, story #]
const N = 7, N_ST = 6;   // N_ST = number of stories in the counter
// Nov 14 MORNING edition ("Here's what happened in America in the last 12 hours")
const SH = [
  [0, 'board', '', 0],
  [S[1], 'planes', 'AIR TRAVEL', 1], [S[2], 'atc', 'AIR TRAVEL', 1], [S[3], 'board', 'AIR TRAVEL', 1], [S[4], 'duffy', 'AIR TRAVEL', 1],
  [S[5], 'nola', 'NEW ORLEANS', 2],
  [S[8], 'measles', 'HEALTH', 3], [S[10], 'vaccine', 'HEALTH', 3],
  [S[11], ['trump', 'xi'], 'SUMMIT', 4], [wordT('Vladimir', S[11]) - 0.1, 'putin', 'SUMMIT', 4], [S[12], 'shenzhen', 'SUMMIT', 4],
  [S[13], 'kreiss', 'ALASKA', 5],
  [S[14], 'huang', 'NVIDIA', 6], [wordT('earnings', S[14]) - 0.2, 'nvidiahq', 'NVIDIA', 6],
  [T_CTA, 'none', '', 7]];   // her note Nov 13: no photo under the follow call
// the 2-second recap: [photo, line] (one per story, 5–6 max)
const RECAP = [['board', 'ALL U.S. FLIGHTS GROUNDED'], ['nola', 'NEW ORLEANS: ALL SURVIVED'], ['measles', 'MEASLES-FREE STATUS LOST'], ['xi', 'TRUMP–XI–PUTIN SUMMIT'], ['kreiss', 'ALASKA FLIPS BLUE'], ['huang', 'HUANG TO BRIEF CONGRESS']];
const shotIx = t => { let i = 0; while (i < SH.length - 1 && t >= SH[i + 1][0]) i++; return i; };
// big numbers / stamps: [from, to, text, sub, colour class]
const BIG = [
  [wordT('grounded', S[1]), S[2] - 0.1, 'ALL FLIGHTS GROUNDED', 'ONLY THE 3RD TIME IN U.S. HISTORY', 'r'],
  [wordT('four', S[2]), S[3] - 0.1, '4+ HOURS', 'TELECOM OUTAGE · AIR TRAFFIC CONTROL', 'r'],
  [wordT('one', S[3]), S[4] - 0.1, '1.5M PASSENGERS', 'THOUSANDS OF FLIGHTS CANCELED', 'r'],
  [wordT('cyberattack', S[4]) - 0.3, S[5] - 0.1, 'NOT A HACK', 'OLD, OVERLOADED TECH — DUFFY', 'w'],
  [wordT('capsized', S[5]), S[6] - 0.1, 'CAPSIZED', 'TANKER HIT A RIVER CRUISE BOAT', 'r'],
  [S[6], S[8] - 0.1, 'EVERYONE SURVIVED', '“A MIRACLE” — THE MAYOR', 'b'],
  [wordT('26', S[8]), S[9] - 0.1, 'LOST AFTER 26 YEARS', 'U.S. MEASLES-FREE STATUS', 'r'],
  [wordT('5100', S[9]), S[10] - 0.1, '5,100+ CASES', 'IN 2026', 'r'],
  [wordT('first', S[12]), wordT('nuclear', S[12]) - 0.1, 'FIRST EVER', 'TRUMP · XI · PUTIN', 'b'],
  [wordT('nuclear', S[12]), S[13] - 0.1, 'NUCLEAR ARMS', 'TOP OF THE AGENDA', 'w'],
  [wordT('flipping', S[13]), S[14] - 0.1, 'FLIPPED', 'ALASKA GOVERNOR → DEMOCRAT', 'b'],
  [wordT('closed', S[14]), wordT('earnings', S[14]) - 0.3, 'CLOSED-DOOR', 'BRIEFING WITH HOUSE LAWMAKERS', 'w'],
  [wordT('earnings', S[14]), T_CTA - 0.1, 'EARNINGS TUESDAY', 'NVIDIA · NOV 17', 'b']];
// two-photo tags
const TAGS = { trump: ['PRESIDENT', 'w'], xi: ['XI JINPING', 'w'] };
const NAMES = { nola: 'NEW ORLEANS', riverboat: 'MISSISSIPPI RIVER CRUISE', duffy: 'SEAN DUFFY', xi: 'XI JINPING', trump: 'DONALD TRUMP', putin: 'VLADIMIR PUTIN', kreiss: 'JONATHAN KREISS-TOMKINS', huang: 'JENSEN HUANG', atc: 'AIR TRAFFIC CONTROL', shenzhen: 'SHENZHEN, CHINA', nvidiahq: 'NVIDIA HQ · SANTA CLARA' };
const src = k => `assets/news/big/${k}.jpg`;
const ASP = {};
const ORIG = {};   // per-photo zoom origin (% of height): 70 = push toward the chin so the forehead goes (Huang, her note) — default 40   // photo aspect w/h, filled in sceneReady
// her rule (Nov 13 2026): soften death/violence words ON SCREEN (stamps, captions, end card) — TikTok's text scan can cut reach; the VOICE stays natural
const SOFT = [[/\bkill(ed|ing|s)?\b/gi, m => m[0] + '*' + m.slice(2)], [/\bdead\b/gi, m => m[0] + '*' + m.slice(2)], [/\bdie(d|s)?\b/gi, m => m[0] + '*' + m.slice(2)], [/\bdeath(s)?\b/gi, m => m[0] + '*' + m.slice(2)],
  [/\bshoot(ing|er)?\b/gi, m => m.slice(0, 2) + '**' + m.slice(4)], [/\bmurder(ed|s)?\b/gi, m => m[0] + '*' + m.slice(2)], [/\bsuicide\b/gi, () => 'su*cide']];
const soft = s => SOFT.reduce((a, [re, f]) => a.replace(re, f), s);
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 5; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.2)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.08 ? 'y' : ''}">${soft(w[2])}</span>`).join(' '); }
// AUTO-FRAMING for photos with a face (tools/plug_faces.py → faces.json), the photographers' rules (Nov 13 research):
//  eyes on the upper-third line (a touch lower, 0.36, under our kicker plate) · face ≈ 46% of the card height at the end of the push (medium close-up)
//  · if it's tight, crop the FOREHEAD / top of the head, never the chin: chin stays ≥ 7% above the bottom edge for the whole push (chin ≈ eyes + 0.76 face-box heights) · no gaps: the photo always covers the card
//  · the push zooms around the eyes, so the face never drifts out · scenes without a face keep cover + POS/ORIG.
let FACES = {};
function faceLayout(key, W, H, u, dir) { const F = FACES[key]; if (!F || !F.faces.length) return null; const [x, y, fw, fh] = F.faces[0], iw = F.w, ih = F.h; if (fw < 0.15 * iw) return null;
  const eye = y + 0.42 * fh, chin = y + 1.18 * fh, cx = x + fw / 2, c0 = Math.max(W / iw, H / ih);   // Haar boxes stop at the mouth: the chin is ~1.18 box heights down
  // cover the card whenever the chin can stay in with the eyes no higher than 0.2 H (tight close-ups crop the forehead — fine); only a headshot too tight even for that floats on its own blurred copy
  const fill = (chin - eye) * c0 * 1.06 <= 0.73 * H, sMax = 0.73 * H / (chin - eye);
  let sEnd = fill ? Math.min(Math.max(c0 * 1.12, 0.46 * H / fh), sMax) : 0.5 * H / (chin - eye), sStart = fill ? Math.max(c0, sEnd / 1.12) : sEnd / 1.1;
  if (fill && sEnd < c0 * 1.04) sEnd = c0 * 1.04;
  const sc = sStart + (sEnd - sStart) * u, eyeT = fill ? Math.min(0.36 * H, 0.93 * H - (chin - eye) * sEnd) : 0.36 * H;
  let L = W / 2 + dir * 8 * (u - 0.5) - cx * sc, T = eyeT - eye * sc; if (fill) { L = Math.min(0, Math.max(W - iw * sc, L)); T = Math.min(0, Math.max(H - ih * sc, T)); }
  return (fill ? '' : 'FLOAT') + `left:${L.toFixed(1)}px;top:${T.toFixed(1)}px;width:${(iw * sc).toFixed(1)}px;height:${(ih * sc).toFixed(1)}px;max-width:none;object-fit:fill`; }
function photoHTML(key, t, a, b, w, x) { const u = span(t, a, b + 0.4), dir = (Math.round(a * 10) % 2) ? 1 : -1, asp = ASP[key] || 1.4;
  const fl = faceLayout(key, w, 720, u, dir);
  const sc = 1.04 + 0.14 * u, tx = dir * 18 * (u - 0.5), ty = 0;   // scenes: the push she likes (Nov 13), zoom origin per photo (ORIG)
  const nm = NAMES[key] && w > 600 ? `<div class="nm">${NAMES[key]}</div>` : NAMES[key] ? `<div class="nm sm">${NAMES[key]}</div>` : '';
  const tg = TAGS[key] ? `<div class="tg ${TAGS[key][1]}" style="transform:scale(${pop(t, a + 0.35, 0.25).toFixed(3)})">${TAGS[key][0]}</div>` : '';
  const flt = fl && fl.startsWith('FLOAT'), st = fl ? `position:absolute;${fl.replace('FLOAT', '')}${flt ? ';-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' : ''}` : `transform-origin:50% ${ORIG[key] || 40}%;object-position:${POS[key] || (asp < 1.2 ? '50% 22%' : '50% 40%')};transform:translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${sc.toFixed(4)})`;
  return `<div class="ph" style="left:${x}px;width:${w}px">${flt ? `<img src="${src(key)}" style="filter:blur(26px) brightness(.7);transform:scale(1.2)">` : ''}<img src="${src(key)}" style="${st}">${nm}${tg}</div>`; }
// ---- INFOGRAPHICS (her note Nov 13: "sometimes" — 1–2 per edition, only where a number tells the story). In SH use 'chart:<id>' instead of a photo key.
//  stock {title, from, to, label, bg}  — a price line falling/rising, area fill, the % lands at the end
//  bars  {title, rows:[[label, value, color]], unit, bg} — horizontal bars grow, values count up
//  dots  {title, total, filled, need, label, bg} — a grid of dots fills up to `filled`, a marker at `need` (e.g. 218 of 435)
//  progress {title, pct, label, bg} — a big ring fills to pct (e.g. ballots counted)
const CHARTS = { nvcap: { type: 'stock', title: 'NVIDIA VALUE', from: 100, to: 58, label: '−$2T', sub: 'SINCE EARLY OCTOBER', bg: 'nvidiahq' },
  nvda: { type: 'stock', title: 'NVIDIA STOCK', from: 100, to: 87, label: '−13%', sub: 'AT ONE POINT', bg: 'nvidiahq' },
  ak: { type: 'progress', title: 'ALASKA SENATE · BALLOTS COUNTED', pct: 85, label: '15% LEFT', bg: 'anchorage' },
  epstein: { type: 'dots', title: 'SIGNATURES TO FORCE A VOTE', total: 435, filled: 218, need: 218, label: '218 / 218 NEEDED', bg: 'capitol' } };
const isChart = p => typeof p === 'string' && p.startsWith('chart:');
function chartHTML(id, t, a, b) { const C = CHARTS[id], u = span(t, a + 0.15, Math.min(b, a + 2.6)), W = 1000, H = 720; let g = '';
  if (C.type === 'stock') { const N = 60, pts = []; for (let i = 0; i <= N; i++) { const k = i / N, v = C.from + (C.to - C.from) * Math.pow(k, 1.8) + 1.1 * Math.sin(i * 0.9) * (1 - k * 0.5) + 0.5 * Math.sin(i * 2.3);
      pts.push([90 + k * 820, 0, v]); } const lo = Math.min(C.from, C.to) - 6, hi = Math.max(C.from, C.to) + 6; pts.forEach(q => { q[1] = 600 - (q[2] - lo) / (hi - lo) * 420; });
    const n = Math.max(2, Math.round(easeOut(u) * N) + 1), sh = pts.slice(0, n), line = sh.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(''), col = C.to < C.from ? '#ff4a4a' : '#2ad07a';
    g += [0, 1, 2, 3].map(k => `<line x1="90" x2="910" y1="${180 + k * 140}" y2="${180 + k * 140}" stroke="rgba(255,255,255,.12)" stroke-width="2"/>`).join('');
    g += `<path d="${line}L${sh[n - 1][0].toFixed(1)} 620L90 620Z" fill="${col}" opacity=".18"/><path d="${line}" stroke="${col}" stroke-width="9" fill="none" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${sh[n - 1][0]}" cy="${sh[n - 1][1]}" r="16" fill="${col}"/>`;
    if (u > 0.85) g += `<g transform="translate(${Math.min(820, sh[n - 1][0])} ${sh[n - 1][1] - 120}) scale(${pop(t, a + 0.15 + 0.85 * 2.45, 0.3).toFixed(3)})"><text text-anchor="middle" font-family="Anton" font-size="120" fill="${col}">${C.label}</text></g>`; }
  if (C.type === 'bars') { const mx = Math.max(...C.rows.map(r => r[1])); C.rows.forEach(([l, v, c], i) => { const k = easeOut(span(u, i * 0.12, 0.7 + i * 0.12)), y = 200 + i * 130;
      g += `<text x="90" y="${y - 18}" font-family="Inter" font-weight="900" font-size="34" fill="#fff" letter-spacing="2">${l}</text><rect x="90" y="${y}" width="${(780 * v / mx * k).toFixed(1)}" height="64" rx="10" fill="${c}"/><text x="${(110 + 780 * v / mx * k).toFixed(1)}" y="${y + 48}" font-family="Anton" font-size="52" fill="#fff">${Math.round(v * k).toLocaleString('en-US')}${C.unit || ''}</text>`; }); }
  if (C.type === 'dots') { const cols = 29, r = 10, f = Math.round(C.filled * easeOut(u)); for (let i = 0; i < C.total; i++) { const x = 110 + (i % cols) * 27.5, y = 190 + Math.floor(i / cols) * 27.5;
      g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${i < f ? '#ffc23a' : 'rgba(255,255,255,.16)'}"/>`; }
    const ny = 190 + Math.floor((C.need - 1) / cols) * 27.5, nx = 110 + ((C.need - 1) % cols) * 27.5; g += `<circle cx="${nx}" cy="${ny}" r="17" fill="none" stroke="#fff" stroke-width="4"/>`;
    if (u > 0.9) g += `<g transform="translate(500 650) scale(${pop(t, a + 0.15 + 0.9 * 2.45, 0.3).toFixed(3)})"><text text-anchor="middle" font-family="Anton" font-size="64" fill="#fff">${C.label}</text></g>`; }
  if (C.type === 'progress') { const R = 200, L = 2 * Math.PI * R, k = C.pct / 100 * easeOut(u);
    g += `<circle cx="500" cy="400" r="${R}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="44"/><circle cx="500" cy="400" r="${R}" fill="none" stroke="#2a7bff" stroke-width="44" stroke-linecap="round" stroke-dasharray="${(L * k).toFixed(1)} ${L}" transform="rotate(-90 500 400)"/>
      <text x="500" y="430" text-anchor="middle" font-family="Anton" font-size="130" fill="#fff">${Math.round(C.pct * easeOut(u))}%</text>`;
    if (u > 0.9) g += `<g transform="translate(500 680) scale(${pop(t, a + 0.15 + 0.9 * 2.45, 0.3).toFixed(3)})"><text text-anchor="middle" font-family="Anton" font-size="56" fill="#ffc23a">${C.label}</text></g>`; }
  return `<div class="ph chart" style="left:40px;width:${W}px"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><text x="90" y="110" font-family="Inter" font-weight="900" font-size="34" letter-spacing="4" fill="#ffc23a">${C.title}</text>${C.sub && u > 0.9 ? `<text x="910" y="110" text-anchor="end" font-family="Inter" font-weight="900" font-size="26" letter-spacing="3" fill="rgba(255,255,255,.7)">${C.sub}</text>` : ''}${g}</svg></div>`; }
function shotHTML(i, t) { const [a, p] = SH[i], b = i < SH.length - 1 ? SH[i + 1][0] : T_END;
  if (p === 'none') return '';
  if (isChart(p)) return chartHTML(p.slice(6), t, a, b);
  return Array.isArray(p) ? photoHTML(p[0], t, a, b, 487, 40) + photoHTML(p[1], t, a, b, 487, 553) : photoHTML(p, t, a, b, 1000, 40); }
const bgKey = p => Array.isArray(p) ? p[0] : isChart(p) ? CHARTS[p.slice(6)].bg : p === 'none' ? null : p;
function renderAt(t) { const i = shotIx(t), [a, p, kick, n] = SH[i];
  // slide-in of the new shot over the old one (0.28 s), with a short blur
  const k = i > 0 ? easeOut(span(t, a, a + 0.28)) : 1;
  let h = '';
  const INTRO = new URLSearchParams(location.search).get('intro') === '1';
  if (k < 1 && !(INTRO && i === 1)) h += `<div class="band" style="transform:translateX(${(-1080 * k * 0.35).toFixed(0)}px);opacity:${(1 - k).toFixed(2)}">${shotHTML(i - 1, t)}</div>`;
  h += `<div class="band" style="transform:translateX(${(1080 * (1 - k)).toFixed(0)}px);filter:blur(${(10 * (1 - k)).toFixed(1)}px)">${shotHTML(i, t)}</div>`;
  $('bands').innerHTML = h; $('bands').className = BIG.some(x => t >= x[0] - 0.1 && t < x[1]) ? 'hidenm' : '';
  { let j = i, k = bgKey(p); while (!k && j > 0) k = bgKey(SH[--j][1]); $('bg').src = src(k); }   // 'none' keeps the previous blurred backdrop $('bg').style.transform = `scale(${(1.35 + 0.05 * Math.sin(t * 0.2)).toFixed(3)})`;
  // header + kicker + counter
  const kk = kick && t < ENDC ? pop(t, SH.find(s => s[2] === kick)[0], 0.3) : 0;
  $('kick').style.opacity = kick && t < ENDC ? 1 : 0; $('kick').textContent = kick; $('kick').style.transform = `skewX(-8deg) scale(${kk.toFixed(3)})`;
  $('cnt').style.opacity = n >= 1 && n <= N_ST ? 1 : 0; $('cnt').innerHTML = `<b>${n}</b> / ${N_ST}`; $('cnt').style.transform = `scale(${(t - a < 0.4 && SH.findIndex(x => x[3] === n) === i ? pop(t, a, 0.35) : 1).toFixed(3)})`;   // bigger: viewers see more is coming (her note)
  $('head').style.opacity = t < 1.7 || t >= ENDC ? 0 : 1;
  // big number / stamp
  const B = isChart(p) ? null : BIG.find(x => t >= x[0] && t < x[1]); /* a chart carries its own number */ if (B) { const q = pop(t, B[0], 0.32), f = 1 - smooth(B[1] - 0.2, B[1], t);
    $('big').innerHTML = `<div class="bv ${B[4]}" style="font-size:${B[2].length > 12 ? 74 : B[2].length > 8 ? 96 : 130}px">${soft(B[2])}</div><div class="bs">${soft(B[3])}</div>`; $('big').style.opacity = f; $('big').style.transform = `rotate(-3deg) scale(${q.toFixed(3)})`; }
  else $('big').style.opacity = 0;
  // hook (frame 0) and CTA
  $('hook').style.opacity = 1 - smooth(1.45, 1.75, t); $('hook').style.transform = `scale(${pop(t, 0, 0.3).toFixed(3)})`;
  // FOLLOW call. FOL_MODE 'brand' (default since Nov 14): our avatar + our own red FOLLOW plate that pulses — nothing that imitates TikTok's UI.
  // 'tiktok' = the Nov 13 version (red "+", a finger taps it, it turns into ✓) — the Nov 13 evening edition with it was removed by TikTok's automod; a fake platform button is a likely trigger.
  if (FOL_MODE === 'tiktok') {
  // (tiktok mode) (her idea Nov 13, like TikTok's avatar "+"): our avatar pops in, a finger taps the red "+", it flips to a ✓
  { const f0 = T_CTA + 0.05, on = t >= f0 && t < ENDC; const OUT = 1 - smooth(ENDC - 0.25, ENDC, t); $('fol').style.opacity = on ? smooth(f0, f0 + 0.2, t) * OUT : 0;
    if (on) { const tap = f0 + 1.0, k = pop(t, f0, 0.35), fu = easeOut(span(t, f0 + 0.35, tap - 0.05)), press = t >= tap - 0.05 && t < tap + 0.15 ? 0.82 : 1, done = t >= tap + 0.12;
      $('fol').style.transform = `translateX(-50%) scale(${k.toFixed(3)})`;
      $('folPlus').style.transform = `translateX(-50%) scale(${(press * (done ? pop(t, tap + 0.12, 0.3) : 1)).toFixed(3)}) rotate(${done ? 0 : 0}deg)`; $('folPlus').className = done ? 'ok' : '';
      $('folPlus').textContent = done ? '✓' : '+'; $('folRip').style.opacity = t >= tap ? (1 - span(t, tap, tap + 0.5)).toFixed(2) : 0; $('folRip').style.transform = `translateX(-50%) scale(${(1 + 1.6 * span(t, tap, tap + 0.5)).toFixed(3)})`;
      $('folHand').style.transform = `translate(${(160 * (1 - fu)).toFixed(0)}px, ${(220 * (1 - fu) + (press < 1 ? 10 : 0)).toFixed(0)}px) rotate(-14deg)`; $('folHand').style.opacity = 1; } }
  } else { const f0 = T_CTA + 0.05, on = t >= f0 && t < ENDC, OUT = 1 - smooth(ENDC - 0.25, ENDC, t); $('fol').style.opacity = on ? smooth(f0, f0 + 0.2, t) * OUT : 0;
    if (on) { $('fol').style.transform = `translateX(-50%) scale(${pop(t, f0, 0.35).toFixed(3)})`; $('folHand').style.opacity = 0; $('folRip').style.opacity = 0; $('folPlus').className = 'brand'; $('folPlus').textContent = 'FOLLOW';
      const beat = (t - f0 - 0.5) % 0.9; $('folPlus').style.transform = `translateX(-50%) scale(${(t < f0 + 0.35 ? pop(t, f0 + 0.2, 0.3) : 1 + 0.06 * Math.max(0, Math.sin(Math.PI * Math.max(0, beat) / 0.3)) * (beat < 0.3 ? 1 : 0)).toFixed(3)})`; } }
  $('cta').style.opacity = t >= T_CTA - 0.1 && t < ENDC ? smooth(T_CTA - 0.1, T_CTA + 0.2, t) * (1 - smooth(ENDC - 0.25, ENDC, t)) : 0; $('cta').style.transform = `scale(${pop(t, T_CTA - 0.1, 0.35).toFixed(3)})`;
  $('cap').innerHTML = t < ENDC ? capHTML(t) : ''; $('cap').style.opacity = t >= T_CTA ? 1 - smooth(ENDC - 0.25, ENDC, t) : 1;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.2, t); $('endT').style.opacity = smooth(ENDC + 0.05, ENDC + 0.25, t); $('endB').style.opacity = smooth(ENDC + 0.05, ENDC + 0.25, t); $('endS').style.opacity = t >= ENDC ? 1 : 0;
  if (t >= ENDC) $('endS').innerHTML = RECAP.map(([k, l], j) => `<div class="rc" style="opacity:${smooth(ENDC + 0.1 + j * 0.08, ENDC + 0.25 + j * 0.08, t).toFixed(2)};transform:translateX(${(60 * (1 - easeOut(span(t, ENDC + 0.1 + j * 0.08, ENDC + 0.4 + j * 0.08)))).toFixed(0)}px)"><img src="${src(k)}" style="object-position:${POS[k] || '50% 25%'}"><span>${soft(l)}</span></div>`).join('');
  return true; }
window.renderAt = renderAt;
const KEYS = [...new Set(SH.flatMap(s => Array.isArray(s[1]) ? s[1] : isChart(s[1]) ? [CHARTS[s[1].slice(6)].bg] : s[1] === 'none' ? [] : [s[1]]).concat(RECAP.map(r => r[0])))], ALL = KEYS.map(src);
window.sceneReady = (async () => { await document.fonts.ready; try { FACES = await (await fetch('assets/news/big/faces.json')).json(); } catch (e) { FACES = {}; } await Promise.all(['900', '800', '700'].map(w => document.fonts.load(`${w} 60px Inter`)).concat([document.fonts.load('400 60px Anton')]));
  await Promise.all(KEYS.map(k => new Promise(r => { const im = new Image(); im.onload = () => { ASP[k] = im.naturalWidth / im.naturalHeight; r(); }; im.onerror = r; im.src = src(k); }))); renderAt(0); return true; })();
// audio cues for tools/plug_cues.mjs
const CUES = [[0.02, 'whoosh', 0.5], [0.06, 'stamp', 0.6], ...SH.slice(1).map(s => [s[0], 'whoosh', 0.45]), ...BIG.map(b => [b[0], /DEAD|DIED/.test(b[2]) ? 'thud' : /RESIGNED|SPY|SILENCE/.test(b[2]) ? 'stamp' : 'pop', 0.6]),
  [S[1], 'jet', 0.5], [S[2], 'alarm', 0.4], [S[8], 'paper', 0.5], [S[11], 'shutter', 0.6], [S[13], 'cheer', 0.4], [S[14], 'shutter', 0.6], ...(FOL_MODE === 'tiktok' ? [[T_CTA + 1.05, 'follow', 0.9]] : [[T_CTA + 0.3, 'pop', 0.6]]), [ENDC, 'whoosh', 0.5]];