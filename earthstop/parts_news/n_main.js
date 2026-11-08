// =================== "The 2026 midterms in 60 seconds" — timeline driven by the voice-over (SENT / WORDS from n_times.js) ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.6;
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', TEAL = '#2ad0b0';
const FLIPS = [['Texas', 'Texas'], ['Ohio', 'Ohio'], ['North Carolina', 'North'], ['Iowa', 'Iowa'], ['Kansas', 'Kansas'], ['Maine', 'Maine'], ['South Carolina', 'South']].map(([n, w]) => [n, wordT(w, SENT[3])]);
const T_TX = wordT('Democrat', SENT[0]);
// ---- the camera path: keyed views [t, centre(x,z), height, back, fov] eased between ----
const MAPC = () => V3(MCX + 6, 0, MCZ - 6);
function view(c, hgt, back, fov) { return { p: c.clone().add(V3(0, hgt, back)), l: c.clone().add(V3(0, 0, Math.max(4, back * 0.12))), fov }; }
function keys() { const tx = stPos('Texas', 0), mn = stPos('Minnesota', 0), dc = stPos('District of Columbia', 0), ms = stPos('Mississippi', 0), m = MAPC();
  return [[0, view(tx, 95, 70, 34)], [SENT[1] + 0.3, view(tx, 150, 60, 36)], [SENT[3] - 0.2, view(m, 330, 95, 40)], [SENT[5] - 0.3, view(m, 330, 95, 40)],
    [SENT[5] + 0.5, view(ms.clone().lerp(akPos().setY(0), 0.5), 400, 90, 40)], [SENT[6] - 0.2, view(ms.clone().lerp(akPos().setY(0), 0.5), 400, 90, 40)],
    [SENT[6] + 0.6, view(m, 360, 110, 40)], [SENT[10] - 0.3, view(m, 360, 110, 40)], [SENT[11] + 0.2, view(mn, 150, 60, 36)], [SENT[12] - 0.3, view(mn, 150, 60, 36)],
    [SENT[12] + 0.5, view(tx, 160, 60, 36)], [SENT[13] - 0.2, view(tx, 160, 60, 36)], [SENT[13] + 0.8, view(dc, 70, 55, 34)], [SENT[16] - 0.4, view(dc, 85, 65, 34)],
    [SENT[16] + 0.6, view(m, 340, 100, 40)], [T_END, view(m, 360, 105, 40)]]; }
let KEYS = null;
function camAt(t) { if (!KEYS) KEYS = keys(); let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++; const [ta, A] = KEYS[i], [tb, B] = KEYS[i + 1], u = esin(span(t, ta, tb));
  const p = A.p.clone().lerp(B.p, u), l = A.l.clone().lerp(B.l, u); p.x += 2.5 * Math.sin(t * 0.31); p.z += 2 * Math.sin(t * 0.23); mCam.position.copy(p); mCam.lookAt(l); mCam.fov = lerp(A.fov, B.fov, u); mCam.aspect = W / H; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld(); }
// ---- DOM helpers ----
const photo = { talarico: ['James Talarico', 'SENATOR-ELECT · TEXAS (D)'], schumer: ['Chuck Schumer', 'SENATE DEMOCRATIC LEADER'], jeffries: ['Hakeem Jeffries', 'EXPECTED HOUSE SPEAKER'], trump: ['Donald Trump', 'PRESIDENT · VETO POWER'] };
function card(key, t0, t1, x, y, t) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key];
  return `<div class="card" style="left:${x}px;top:${y}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><img src="assets/news/photos/${key}.jpg"><div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const v = pos.clone().project(mCam); if (v.z > 1) return ''; let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; x = clamp(x, 150, 930);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
function hemiSVG(n, total, t) { let s = '<svg width="720" height="380" viewBox="0 0 760 400">'; const seats = []; for (let r = 0; r < 12; r++) { const R = 160 + r * 17, m = Math.round(Math.PI * R / 15.5); for (let i = 0; i < m; i++) seats.push([Math.PI * (1 - (i + 0.5) / m), R]); }
  seats.sort((p, q) => q[0] - p[0]); seats.slice(0, total).forEach(([a, R], i) => { const x = 380 + Math.cos(a) * R, y = 370 - Math.sin(a) * R; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.2" fill="${i < n ? '#3d7dff' : i >= total - 160 ? '#ff4a4a' : '#4a505c'}"/>`; });
  const lineA = Math.PI * (1 - 218 / total); s += `<line x1="${380 + Math.cos(lineA) * 150}" y1="${370 - Math.sin(lineA) * 150}" x2="${380 + Math.cos(lineA) * 365}" y2="${370 - Math.sin(lineA) * 365}" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/>`;
  s += `<text x="380" y="352" text-anchor="middle" font-family="Source Serif 4" font-size="70" fill="#fff">${n}</text><text x="380" y="390" text-anchor="middle" font-family="Inter" font-weight="600" font-size="20" letter-spacing="3" fill="#cfd6e4">218 TO CONTROL THE HOUSE</text></svg>`; return s; }
// captions: the current sentence (split into ≤7-word chunks), the spoken word in yellow
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 7; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.35)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.12 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
function hudAt(t) { const cnt = (a, b, v) => Math.round(v * esin(span(t, a, b)));
  if (t < SENT[3]) return ['MIDTERMS 2026 · U.S. SENATE', t < SENT[1] ? 'TEXAS FLIPS' : `FIRST SINCE ${t < SENT[1] + 0.2 ? 2026 : 2026 - cnt(SENT[1] + 0.2, SENT[1] + 1.6, 38)}`, 'A DEMOCRAT WINS TEXAS'];
  if (t < SENT[4]) { const n = FLIPS.filter(f => t >= f[1]).length; return ['SENATE SEATS FLIPPED', String(n), 'REPUBLICAN → DEMOCRAT']; }
  if (t < SENT[6]) return ['U.S. SENATE · CONTROL', '54 · 44', t < SENT[5] ? 'DEMOCRATS · REPUBLICANS' : 'ALASKA & MISSISSIPPI STILL COUNTING'];
  if (t < SENT[10]) return ['U.S. HOUSE · 435 SEATS', t < SENT[8] ? '218' : t < SENT[9] ? `${cnt(SENT[8], SENT[8] + 1.5, 250)}+` : '30+', t < SENT[9] ? 'NEEDED FOR A MAJORITY' : 'REPUBLICAN INCUMBENTS LOST'];
  if (t < SENT[12]) return ['EARLY VOTING · MINNESOTA', fmt(cnt(SENT[11], SENT[11] + 2.2, 886427)), 'BALLOTS · A NEW MIDTERM RECORD'];
  if (t < SENT[13]) return ['EARLY VOTING · TEXAS', 'RECORD', 'FIRST WEEK BEAT EVERY RECENT ELECTION'];
  if (t < SENT[16]) { const tp = wordT('President', SENT[15]); return ['FROM JANUARY 2027', t < tp ? 'HOUSE ✓ SENATE ✓' : 'VETO', t < tp ? 'DEMOCRATS CONTROL CONGRESS' : 'THE PRESIDENT CAN STILL SAY NO']; }
  if (t < ENDC) return ['MIDTERMS 2026', 'YOUR STATE?', 'COMMENT BELOW 👇']; return null; }
// ---- the map state per frame ----
function mapAt(t) { clearPaint();
  const flipK = (t0) => smooth(t0, t0 + 0.35, t);
  // Texas: red at first, flips blue on "Democrat"
  if (t < T_TX) paint('Texas', RED, 0.75, 0.3); else paint('Texas', BLUE, 0.95, 1.4 * flipK(T_TX) - 0.4 * smooth(T_TX + 0.35, T_TX + 0.8, t));
  if (t >= SENT[3]) FLIPS.slice(1).forEach(([n, ft]) => { if (t >= ft) paint(n, BLUE, 0.95 * flipK(ft), 1.2 * flipK(ft) - 0.3 * smooth(ft + 0.35, ft + 0.8, t)); });
  const pend = t >= SENT[5] && t < SENT[13]; if (pend) { const pl = 0.45 + 0.25 * Math.sin(t * 6); paint('Mississippi', GREY, pl, 0.6); } AK.mat.color.setRGB(...(pend ? [0.8, 0.8, 0.85] : [0.36, 0.38, 0.34]).map(v => v * (pend ? 0.75 + 0.25 * Math.sin(t * 6) : 1)));
  if (t >= SENT[6] && t < SENT[10]) STATES.forEach(s => { if (!FLIPS.some(f => f[0] === s.name)) paint(s.name, '#1a2238', 0.45 * smooth(SENT[6], SENT[6] + 0.6, t)); });
  if (t >= SENT[11] && t < SENT[12] + 0.3) paint('Minnesota', TEAL, 0.9 * smooth(SENT[11], SENT[11] + 0.4, t), 1.2);
  if (t >= SENT[12] && t < SENT[13]) paint('Texas', TEAL, 0.9, 1.2);
  CAP.visible = t >= SENT[13]; if (CAP.visible) { const k = easeOut(span(t, SENT[13] + 0.2, SENT[13] + 1.2)); CAP.position.copy(stPos('District of Columbia', 0.8 + 6 * (1 - k))); CAP.scale.setScalar(1.3 * k + 0.01); CAP.rotation.y = 0.3 + 0.1 * Math.sin(t * 0.5); } }
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
// ---- labels + DOM ----
function domAt(t) { let h = '';
  if (t >= T_TX && t < SENT[3]) h += sticker('TEXAS · FLIPPED', stPos('Texas', 16), t, T_TX + 0.2, 'b');
  h += card('talarico', T_TX + 0.4, SENT[3] - 0.2, 150, 760, t);
  if (t >= SENT[3] && t < SENT[6]) FLIPS.forEach(([n, ft]) => { h += sticker(n.toUpperCase(), stPos(n, 10), t, ft, 'b sm'); });
  if (t >= SENT[5] && t < SENT[6] + 0.3) { h += sticker('TOO CLOSE TO CALL', stPos('Mississippi', 10), t, wordT('Mississippi', SENT[5]), 'g sm'); h += sticker('ALASKA · TOO CLOSE', akPos(), t, wordT('Alaska', SENT[5]), 'g sm'); }
  h += card('schumer', SENT[4] + 0.2, SENT[6] - 0.1, 650, 760, t);
  if (t >= SENT[7] && t < SENT[10]) { const n = t < SENT[8] ? Math.round(218 * esin(span(t, SENT[7], SENT[7] + 1.6))) : Math.round(lerp(218, 252, esin(span(t, SENT[8], SENT[8] + 1.6)))); h += `<div id="hemi" style="top:${560}px;opacity:${smooth(SENT[7], SENT[7] + 0.3, t)}">${hemiSVG(n, 435, t)}</div>`; }
  h += card('jeffries', SENT[8] + 0.2, SENT[10] - 0.1, 700, 930, t).replace('class="card"', 'class="card small"');
  if (t >= SENT[11] && t < SENT[12]) h += sticker('MINNESOTA', stPos('Minnesota', 14), t, SENT[11] + 0.2, 't');
  if (t >= SENT[12] && t < SENT[13]) h += sticker('TEXAS · RECORD TURNOUT', stPos('Texas', 14), t, SENT[12] + 0.3, 't');
  if (t >= SENT[14] && t < SENT[16]) { const dc = stPos('District of Columbia', 9); h += sticker('HOUSE ✓', dc.clone().add(V3(-4, 0, 0)), t, wordT('House', SENT[14]), 'b'); h += sticker('SENATE ✓', dc.clone().add(V3(4, 3, 0)), t, wordT('Senate', SENT[14]), 'b'); }
  h += card('trump', wordT('President', SENT[15]) - 0.1, SENT[16] - 0.1, 650, 760, t);
  if (t >= wordT('veto', SENT[15]) && t < SENT[16]) h += `<div class="stamp" style="transform:translate(-50%,-50%) rotate(-12deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, wordT('veto', SENT[15]), wordT('veto', SENT[15]) + 0.18)))).toFixed(3)})">VETO</div>`;
  if (t >= SENT[16] && t < ENDC) h += `<div class="cta" style="opacity:${smooth(SENT[16], SENT[16] + 0.3, t)}">Did your state flip? 👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('sub').textContent = hd[2]; }
  const vv = [T_TX, SENT[1], ...FLIPS.map(f => f[1]), SENT[4], SENT[8], SENT[9], SENT[11], SENT[15]]; let pp = 1; for (const k of vv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0; $('title').style.opacity = 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
window.renderAt = (t) => { mapU.uT.value = t; mapAt(t); camAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  shootTo(RTA, MAPSC, mCam); const u = compMat.uniforms; u.tA.value = RTA.texture; u.uLook.value = 0.12; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  const fl = Math.max(0, 1 - Math.abs(t - T_TX) / 0.18); composite(0, 1.0 + 0.6 * fl, 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await akReady; await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
