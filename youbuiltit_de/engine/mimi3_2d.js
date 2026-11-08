// ===================== 18 Mimi Stadt — ~24 s: Mimi's house is full, she builds a city; the map has 10.000 houses (100x100), each follower lights one =====================
// Reuses mimi2_2d.js helpers; coats from ../13_mimi_tag2/cats.json (local data).
// Data: ../13_mimi_tag2/cats.json (uid + look per photo), comments_show.json. render_video.sh copies mimi2_2d.js -> mimi2.js; captions: captions.json
// Pure canvas 2D (no three.js). render_video.sh copies mimi_2d.js -> mimi.js.  Page: index_mimi.html
// Exports window.renderAt(t), window.END, window.SFX (word-synced sound events for sfx.py).

await document.fonts.load('700 96px Fredoka');
const W = 1080, H = 1920;
const WORDS = await (await fetch('../18_mimi_traum/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; const rr = (a, b) => a + (b - a) * rnd();

const CATS = await (await fetch('../13_mimi_tag2/cats.json')).json();
const PHOTO = await Promise.all(CATS.map(c => new Promise(res => { if (!c.photo) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = '../13_mimi_tag2/' + c.photo; })));
const SHOWC = await (await fetch('../13_mimi_tag2/comments_show.json')).json();
const FOLLOWERS = 4258, GOALN = 10000;
const tw = { voll: T('voll'), vier: T('viertausend'), platz: T('Platz'), draussen: T('Draußen'), zuhause: T('Zuhause'), stadt: T('Stadt'), karte: T('Karte'),
  jedes: T('Jedes'), namen: T('Namen'), napf: T('Napf'), zehn: T('zehntausend'), mimistadt: T('Mimistadt'), offiz: T('offizielle'), jeder: T('Jeder'), haus2: T('Haus', 2),
  schreib: T('Schreib'), folg: T('Folg') };
const SFX = { end: END, music_gain: .16, events: [], beds: [[T('Draußen') - .2, T('Stadt'), 'rain', .9]] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
e(.1, 'meow_sad', .8); e(tw.vier, 'tick', .5); e(tw.platz, 'boing', .5); e(tw.draussen - .1, 'whoosh', .6); e(tw.zuhause, 'meow_sad', .6);
e(tw.stadt - .1, 'swoosh_up', .7); e(tw.stadt + .2, 'tada', .7); e(tw.karte - .1, 'whoosh', .7); for (let i = 0; i < 20; i++) e(tw.karte + .1 + i * .05, 'tick', .25);
e(tw.jedes, 'pop', .7); e(tw.namen, 'pop', .6); e(tw.napf, 'pop', .6); e(tw.mimistadt - .1, 'stamp', 1); e(tw.offiz, 'ding', .8);
e(tw.jeder, 'pop', .8); e(tw.haus2, 'sparkle', .9); e(tw.haus2 + .1, 'meow_happy', .7); e(tw.schreib, 'pop', .7); e(tw.folg - .05, 'pop', 1); e(tw.folg + .5, 'ding', .8);
window.SFX = SFX;

// ---------- canvas helpers ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out); const g = out.getContext('2d');
const OUT = '#3b2416';
function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ell(x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }
function fillStroke(f, lw = 6, s = OUT) { g.fillStyle = f; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = s; g.lineJoin = 'round'; g.stroke(); } }
function text(s, x, y, size, fill = '#fff', stroke = '#1a0f08', lw = 14, align = 'center') {
  g.font = `700 ${size}px Fredoka`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y);
}
function off(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }

// ---------- kitten ----------
// o: {c: body colour, c2: belly/muzzle, mood: 'sad'|'happy'|'neutral'|'wow'|'tired', blink, tail(phase), sq(squash), tear, crown, collar, label, look(-1..1), paw}
const COLORS = [['#f3a35b', '#fff4e6'], ['#9aa3ad', '#f1f3f5'], ['#3d3a3c', '#e9e2dd'], ['#f6efe6', '#ffffff'], ['#c98a52', '#f7e3cc'], ['#e7c79c', '#fff6ea'], ['#6f6a72', '#e8e4ea'], ['#f4c06a', '#fff6e0'], ['#b9b0a8', '#ffffff'], ['#ee9d7c', '#fff0e8']];
function cat(x, y, s, o = {}, t = 0) {
  const [c, c2] = [o.c || '#f3a35b', o.c2 || '#fff4e6'];
  g.save(); g.translate(x, y); g.scale(s, s);
  const sq = o.sq || 0; g.scale(1 + sq * .12, 1 - sq * .12);
  // shadow
  g.globalAlpha = .18; ell(0, 6, 120, 22); g.fillStyle = '#000'; g.fill(); g.globalAlpha = 1;
  // tail
  const tp = o.tail ?? t * 2.4, tw_ = Math.sin(tp) * 26;
  g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 40; g.beginPath(); g.moveTo(70, -40); g.bezierCurveTo(150, -40, 150 + tw_ * .4, -130, 120 + tw_, -190); g.stroke();
  g.strokeStyle = o.tailc || c; g.lineWidth = 28; g.stroke();
  if (o.pat === 'stripes' || o.pat === 'tabwhite') { g.save(); g.setLineDash([14, 16]); g.strokeStyle = o.sc; g.lineWidth = 28; g.stroke(); g.restore(); }
  // body
  ell(0, -70, 100, 82); fillStroke(c, 7);
  pat(o, 'body', () => ell(0, -70, 100, 82));
  ell(0, -55, o.big ? 72 : 58, o.big ? 64 : 56); g.fillStyle = c2; g.fill();
  if (o.fluffy) { g.fillStyle = c2; g.beginPath(); for (let i = 0; i <= 8; i++) { const a = Math.PI * (.15 + .7 * i / 8); g.lineTo(Math.cos(a) * 70, -118 + Math.sin(a) * 40 + (i % 2) * 16); } g.fill(); }
  // paws
  for (const sx of [-1, 1]) { ell(sx * 48, -6 - (o.paw && sx === 1 ? 50 : 0), 34, 22); fillStroke(o.paw || c2, 6); }
  // head
  const hx = (o.look || 0) * 10, hy = -190 + (o.mood === 'sad' ? 8 : 0);
  g.save(); g.translate(hx, hy); g.rotate((o.tilt || 0) + (o.mood === 'sad' ? -.06 : 0));
  // ears
  const ed = o.mood === 'sad' ? .5 : 0;
  for (const sx of [-1, 1]) { g.save(); g.translate(sx * 72, -66); g.rotate(sx * (.25 + ed));
    g.beginPath(); g.moveTo(-40, 20); g.quadraticCurveTo(-8, -86, 10, -78); g.quadraticCurveTo(40, -40, 42, 22); g.closePath(); fillStroke(o.ear || c, 7);
    g.beginPath(); g.moveTo(-22, 12); g.quadraticCurveTo(-4, -50, 6, -48); g.quadraticCurveTo(24, -24, 24, 14); g.closePath(); g.fillStyle = '#ff9fb4'; g.fill(); g.restore(); }
  ell(0, 0, 128, 108); fillStroke(c, 7);
  pat(o, 'head', () => ell(0, 0, 128, 108));
  if (o.fluffy) { g.fillStyle = c; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 118, 10); g.lineTo(sx * 150, 40); g.lineTo(sx * 122, 50); g.lineTo(sx * 146, 78); g.lineTo(sx * 100, 76); g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); } }
  ell(0, 42, 66, 44); g.fillStyle = c2; g.fill();
  // blush
  g.globalAlpha = .6; for (const sx of [-1, 1]) { ell(sx * 78, 36, 24, 13); g.fillStyle = '#ff8fa8'; g.fill(); } g.globalAlpha = 1;
  // eyes
  const blink = o.blink ?? (Math.sin(t * 1.9 + x) > .985 ? 1 : 0);
  for (const sx of [-1, 1]) {
    const ex = sx * 48 + (o.look || 0) * 6, ey = -2;
    if (o.mood === 'happy' && !o.open) { g.lineWidth = 9; g.strokeStyle = OUT; g.lineCap = 'round'; g.beginPath(); g.arc(ex, ey + 10, 22, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); continue; }
    if (blink > .5) { g.lineWidth = 8; g.strokeStyle = OUT; g.beginPath(); g.moveTo(ex - 20, ey + 4); g.quadraticCurveTo(ex, ey + 14, ex + 20, ey + 4); g.stroke(); continue; }
    const big = o.mood === 'wow' ? 1.2 : 1;
    ell(ex, ey, 25 * big, 31 * big); g.fillStyle = '#1b120d'; g.fill();
    ell(ex + 8 * sx * 0 + 7, ey - 11, 9 * big, 10 * big); g.fillStyle = '#fff'; g.fill();
    ell(ex - 8, ey + 10, 4.5 * big, 4.5 * big); g.fillStyle = '#fff'; g.fill();
    if (o.mood === 'sad' || o.mood === 'tired') { // heavy upper lid + sad brows
      g.fillStyle = c; g.beginPath(); g.ellipse(ex, ey - 26, 30, 18, 0, 0, Math.PI * 2); g.fill();
      g.lineWidth = 7; g.strokeStyle = OUT; g.beginPath(); g.moveTo(ex - 22 * sx * -1 - (sx > 0 ? 0 : 0), ey - 40); g.lineTo(ex + 20 * sx, ey - 48 + 12); g.stroke(); }
  }
  // nose + mouth
  g.beginPath(); g.moveTo(-10, 24); g.lineTo(10, 24); g.lineTo(0, 34); g.closePath(); g.fillStyle = '#ff7f9a'; g.fill();
  g.lineWidth = 6; g.strokeStyle = OUT; g.lineCap = 'round';
  if (o.mood === 'happy' || o.mood === 'wow') { g.beginPath(); g.moveTo(-22, 42); g.quadraticCurveTo(0, 78, 22, 42); g.closePath(); g.fillStyle = '#c4384f'; g.fill(); g.stroke(); }
  else if (o.mood === 'sad') { g.beginPath(); g.moveTo(-18, 56); g.quadraticCurveTo(0, 40, 18, 56); g.stroke(); }
  else { g.beginPath(); g.moveTo(0, 34); g.quadraticCurveTo(-8, 48, -20, 42); g.moveTo(0, 34); g.quadraticCurveTo(8, 48, 20, 42); g.stroke(); }
  if (o.meow) { ell(0, 50, 16, 14 + o.meow * 10); g.fillStyle = '#7a1d2c'; g.fill(); g.stroke(); }
  // whiskers
  g.lineWidth = 3.5; g.strokeStyle = 'rgba(59,36,22,.8)';
  for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(sx * 64, 34 + k * 9); g.lineTo(sx * 128, 26 + k * 18); g.stroke(); }
  if (o.acc === 'antenna') for (const sx of [-1, 1]) { g.lineWidth = 6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(sx * 30, -100); g.quadraticCurveTo(sx * 40, -170, sx * 60, -190); g.stroke(); ell(sx * 60, -192, 16, 16); fillStroke('#d8f03a', 5); }
  if (o.acc === 'hat') { g.save(); g.translate(0, -100); g.beginPath(); g.arc(0, 0, 80, Math.PI, 0); g.closePath(); fillStroke('#ff5a5a', 6); g.beginPath(); g.arc(0, 0, 80, Math.PI, Math.PI * 1.33); g.lineTo(0, 0); g.fillStyle = '#ffd23f'; g.fill(); g.beginPath(); g.arc(0, 0, 80, Math.PI * 1.66, 0); g.lineTo(0, 0); g.fillStyle = '#4fb4ff'; g.fill(); g.restore(); }
  if (o.acc === 'wings') { g.save(); g.globalAlpha = .85; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 150, 60, 50, 80, sx * .5, 0, 7); fillStroke('#cdb8ff', 5); } g.restore(); }
  // tear
  if (o.tear) { const ph = (t * .9) % 1; ell(-52, 30 + ph * 60, 9, 13); g.fillStyle = `rgba(120,190,255,${(1 - ph) * o.tear})`; g.fill(); }
  // crown
  if (o.crown) { g.save(); g.translate(0, -118); g.rotate(-.12 + (o.crownTilt || 0)); g.scale(o.crown, o.crown);
    g.beginPath(); g.moveTo(-52, 20); g.lineTo(-58, -36); g.lineTo(-26, -6); g.lineTo(0, -46); g.lineTo(26, -6); g.lineTo(58, -36); g.lineTo(52, 20); g.closePath(); fillStroke('#ffd23f', 6);
    for (const dx of [-26, 0, 26]) { ell(dx, 6, 7, 7); g.fillStyle = '#ff4f7b'; g.fill(); } g.restore(); }
  g.restore();
  // collar
  if (o.collar) { g.lineWidth = 16; g.strokeStyle = '#ffc933'; g.beginPath(); g.arc(0, -120, 70, Math.PI * .2, Math.PI * .8); g.stroke(); ell(0, -50, 14, 14); fillStroke('#ffe27a', 4); }
  g.restore();
  if (o.label) { const [txt, col] = o.label; g.save(); g.font = '700 38px Fredoka'; const w = g.measureText(txt).width + 40; rrect(x - w / 2, y + 22 * s + 10, w, 56, 28); g.fillStyle = col || '#ffffff'; g.fill(); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
    text(txt, x, y + 22 * s + 39, 38, OUT, null, 0); g.restore(); }
}


// coat patterns (drawn clipped inside the body / head outline)
function pat(o, part, shape) {
  if (!o.pat) return; g.save(); shape(); g.clip(); const sc = o.sc;
  const R_ = (i) => { const v = Math.sin((o.seed || 1) * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };
  if (o.pat === 'stripes' || o.pat === 'tabwhite') { g.strokeStyle = sc; g.lineCap = 'round';
    if (part === 'head') { g.lineWidth = 12; for (const dx of [-26, 0, 26]) { g.beginPath(); g.moveTo(dx, -104); g.lineTo(dx * .8, -60); g.stroke(); } g.lineWidth = 9; for (const sx of [-1, 1]) for (const k of [0, 1]) { g.beginPath(); g.moveTo(sx * 128, -10 + k * 24); g.lineTo(sx * 92, -4 + k * 22); g.stroke(); } }
    else { g.lineWidth = 16; for (const k of [-1, 0, 1]) for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 100, -110 + k * 34); g.quadraticCurveTo(sx * 70, -96 + k * 34, sx * 58, -80 + k * 34); g.stroke(); } } }
  if (o.pat === 'patches' || o.pat === 'mottle') { const cols = o.pc; const n = o.pat === 'mottle' ? 22 : 5;
    for (let i = 0; i < n; i++) { const x = (R_(i) - .5) * (part === 'head' ? 230 : 200), y = (part === 'head' ? 0 : -70) + (R_(i + 50) - .5) * 170, r = o.pat === 'mottle' ? 14 + R_(i + 9) * 20 : 30 + R_(i + 9) * 34;
      if (part === 'head' && Math.abs(x) < 40 && y > 0) continue; ell(x, y, r, r * .8, R_(i + 3) * 3); g.fillStyle = cols[i % cols.length]; g.fill(); } }
  if (o.pat === 'spots') { for (let i = 0; i < 16; i++) { const x = (R_(i) - .5) * 220, y = (part === 'head' ? -40 : -70) + (R_(i + 30) - .5) * 160; if (part === 'head' && y > -20) continue; ell(x, y, 13, 10); g.fillStyle = sc; g.fill(); ell(x + 2, y, 6, 4); g.fillStyle = o.c; g.fill(); } }
  if (o.pat === 'points' && part === 'head') { ell(0, 36, 74, 62); g.fillStyle = sc; g.globalAlpha = .85; g.fill(); g.globalAlpha = 1; }
  if (o.pat === 'blaze' && part === 'head') { g.beginPath(); g.moveTo(-14, -108); g.lineTo(14, -108); g.lineTo(40, 30); g.lineTo(-40, 30); g.closePath(); g.fillStyle = o.c2; g.fill(); }
  if (o.pat === 'wrinkles') { g.strokeStyle = 'rgba(160,100,90,.5)'; g.lineWidth = 5; for (const k of [0, 1, 2]) { g.beginPath(); g.arc(0, (part === 'head' ? -70 : -110) + k * 16, 40 + k * 8, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); } }
  g.restore(); shape(); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
}
const LOOKS = {
  tabby: { c: '#a48a6a', c2: '#efe3cf', pat: 'stripes', sc: '#5a4632' }, tabwhite: { c: '#9c8566', c2: '#ffffff', pat: 'tabwhite', sc: '#4f3d2b', big: 1, paw: '#ffffff' },
  silver: { c: '#c7c9cf', c2: '#f4f4f6', pat: 'stripes', sc: '#5d6068' }, ginger: { c: '#f19a4c', c2: '#fff1e0', pat: 'stripes', sc: '#c96f2a' },
  gingerwhite: { c: '#f19a4c', c2: '#ffffff', pat: 'tabwhite', sc: '#d27a30', big: 1, paw: '#ffffff' }, golden: { c: '#e8c99a', c2: '#fbf1e2', pat: 'stripes', sc: '#cfa66e' },
  black: { c: '#2f2a33', c2: '#4a4350' }, tuxedo: { c: '#2f2a33', c2: '#ffffff', pat: 'blaze', big: 1, paw: '#ffffff' }, grey: { c: '#8e97a6', c2: '#b9c0cc' },
  white: { c: '#fbfaf8', c2: '#ffffff' }, calico: { c: '#ffffff', c2: '#ffffff', pat: 'patches', pc: ['#f0a050', '#2f2a33'] }, tortie: { c: '#3a2c2a', c2: '#5a4030', pat: 'mottle', pc: ['#c9783a', '#8a4a26'] },
  siamese: { c: '#f3e6d2', c2: '#fbf4ea', pat: 'points', sc: '#5a4334', ear: '#5a4334', paw: '#5a4334', tailc: '#5a4334' }, bengal: { c: '#e2a55c', c2: '#f7e2c0', pat: 'spots', sc: '#5a3a22' },
  lilac: { c: '#c4b0d6', c2: '#efe6f7' }, cinnamon: { c: '#b88e72', c2: '#e8d6c6' }, pink: { c: '#ffb3c0', c2: '#fff0f2', pat: 'stripes', sc: '#d9708a' },
  alien: { c: '#d8f03a', c2: '#f4ffb0' }, sphynx: { c: '#e9c3b4', c2: '#f3d9cf', pat: 'wrinkles' } };
const lookOf = (cat, i) => Object.assign({ seed: i + 1, fluffy: cat.fluffy, acc: cat.acc }, LOOKS[cat.look] || LOOKS.tabby);

// ---------- backgrounds ----------
const wallpaper = off(240, 240, (c, w, h) => { c.fillStyle = '#f7e2c4'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(214,170,120,.35)'; for (const [px, py] of [[60, 60], [180, 180]]) { c.beginPath(); c.ellipse(px, py + 8, 20, 16, 0, 0, 7); c.fill(); for (const [dx, dy] of [[-22, -18], [-8, -28], [8, -28], [22, -18]]) { c.beginPath(); c.ellipse(px + dx, py + dy, 7, 9, 0, 0, 7); c.fill(); } }
  c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) c.fillRect(i * 40, 0, 6, h); });
const wallPat = g.createPattern(wallpaper, 'repeat');
function room(t, night = 0, opts = {}) {
  // wall
  g.fillStyle = wallPat; g.fillRect(0, 0, W, 1420);
  g.fillStyle = 'rgba(80,40,10,.06)'; g.fillRect(0, 0, W, 1420);
  // ceiling beams
  g.fillStyle = '#a8683a'; g.fillRect(0, 0, W, 70); g.fillStyle = '#8a5230'; for (let i = 0; i < 6; i++) g.fillRect(i * 200 + 40, 0, 50, 90);
  // attic hatch
  rrect(380, 10, 320, 80, 12); fillStroke('#7a4a28', 6); g.fillStyle = '#5a3418'; g.fillRect(400, 30, 280, 6); g.fillRect(400, 56, 280, 6);
  // round window
  const wx = 840, wy = 640; ell(wx, wy, 140, 140); fillStroke('#b77a44', 10);
  g.save(); ell(wx, wy, 116, 116); g.clip();
  const sk = g.createLinearGradient(0, wy - 116, 0, wy + 116); sk.addColorStop(0, night > .5 ? '#0d1438' : '#7cc7ff'); sk.addColorStop(1, night > .5 ? '#283a7a' : '#d8f1ff'); g.fillStyle = sk; g.fillRect(wx - 120, wy - 120, 240, 240);
  if (night > .5) { ell(wx + 40, wy - 40, 26, 26); g.fillStyle = '#fff6cf'; g.fill(); for (let i = 0; i < 12; i++) { g.fillStyle = '#fff'; g.fillRect(wx - 100 + (i * 37) % 200, wy - 90 + (i * 53) % 150, 3, 3); } }
  else { for (const [cx, cy, r] of [[wx - 40, wy - 20, 30], [wx - 10, wy - 32, 36], [wx + 26, wy - 18, 28]]) { ell(cx + (t * 6) % 60, cy, r, r * .7); g.fillStyle = '#fff'; g.fill(); }
    g.fillStyle = '#7fc45a'; g.beginPath(); g.ellipse(wx, wy + 130, 160, 70, 0, 0, 7); g.fill(); }
  g.restore(); g.lineWidth = 8; g.strokeStyle = '#b77a44'; g.beginPath(); g.moveTo(wx - 116, wy); g.lineTo(wx + 116, wy); g.moveTo(wx, wy - 116); g.lineTo(wx, wy + 116); g.stroke();
  // baseboard + floor
  g.fillStyle = '#8a5230'; g.fillRect(0, 1400, W, 40);
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#c98a52' : '#bd7f48'; g.fillRect(0, 1440 + i * 52, W, 52); g.fillStyle = 'rgba(60,30,10,.25)'; g.fillRect(0, 1440 + i * 52, W, 4);
    for (let k = 0; k < 4; k++) g.fillRect(((i * 173 + k * 290) % (W + 100)) - 50, 1440 + i * 52, 4, 52); }
  if (night > 0) { g.fillStyle = `rgba(10,15,50,${.55 * night})`; g.fillRect(0, 0, W, H); }
}
function exterior(t, k) {
  // night, rain, big empty house, moving van driving off
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0b1230'); sky.addColorStop(.6, '#24305e'); sky.addColorStop(1, '#2f3c63'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // far trees
  g.fillStyle = '#17203f'; for (let i = 0; i < 9; i++) { const x = i * 140 - 40; g.beginPath(); g.moveTo(x, 1250); g.lineTo(x + 70, 950 - (i % 3) * 60); g.lineTo(x + 140, 1250); g.fill(); }
  // house
  g.fillStyle = '#5b4a5e'; g.fillRect(150, 700, 780, 640); g.fillStyle = '#463549'; g.beginPath(); g.moveTo(100, 720); g.lineTo(540, 380); g.lineTo(980, 720); g.closePath(); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#2a1f2c'; g.strokeRect(150, 700, 780, 640);
  for (const [x, y] of [[230, 800], [720, 800], [230, 1030], [720, 1030]]) { g.fillStyle = '#1c1730'; g.fillRect(x, y, 130, 150); g.strokeRect(x, y, 130, 150); g.beginPath(); g.moveTo(x + 65, y); g.lineTo(x + 65, y + 150); g.moveTo(x, y + 75); g.lineTo(x + 130, y + 75); g.stroke(); }
  g.fillStyle = '#3a2a22'; rrect(460, 1050, 160, 290, 14); g.fill(); g.stroke();
  // ground + puddles
  g.fillStyle = '#2b3a33'; g.fillRect(0, 1330, W, H - 1330); g.fillStyle = '#3a4a6e'; ell(300, 1560, 160, 26); g.fill(); ell(820, 1700, 120, 20); g.fill();
  // moving van leaving
  const vx = lerp(560, 1500, ease(t, tw.umgez - .3, tw.vergessen + .5));
  g.save(); g.translate(vx, 1500); g.fillStyle = '#d9d2c6'; rrect(0, -190, 330, 190, 18); g.fill(); g.lineWidth = 7; g.strokeStyle = '#1a1420'; g.stroke();
  g.fillStyle = '#c9584a'; rrect(330, -130, 120, 130, 16); g.fill(); g.stroke(); g.fillStyle = '#9fd0ff'; rrect(370, -112, 60, 50, 8); g.fill();
  for (const wx of [70, 370]) { ell(wx, 4, 36, 36); g.fillStyle = '#222'; g.fill(); ell(wx, 4, 14, 14); g.fillStyle = '#888'; g.fill(); }
  text('UMZUG', 165, -100, 54, '#c9584a', '#1a1420', 0); g.restore();
  // rain
  g.strokeStyle = 'rgba(180,200,255,.45)'; g.lineWidth = 3; g.beginPath();
  for (let i = 0; i < 220; i++) { const x = (i * 97.3 + t * 140) % (W + 200) - 100, y = (i * 211.7 + t * 1500) % (H + 200) - 100; g.moveTo(x, y); g.lineTo(x - 14, y + 46); } g.stroke();
}
function darkPanel(k) { g.fillStyle = `rgba(30,18,10,${.6 * k})`; g.fillRect(0, 0, W, H); }

// ---------- props ----------
function dashed(fn, k, col = 'rgba(110,60,25,.85)') { g.save(); g.globalAlpha = k; g.setLineDash([22, 16]); g.lineWidth = 9; g.strokeStyle = col; fn(); g.stroke(); g.restore(); }
function cross(x, y, k) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.lineCap = 'round'; g.lineWidth = 30; g.strokeStyle = '#1a0f08'; g.beginPath(); g.moveTo(-60, -60); g.lineTo(60, 60); g.moveTo(60, -60); g.lineTo(-60, 60); g.stroke(); g.lineWidth = 18; g.strokeStyle = '#ff3b3b'; g.stroke(); g.restore(); }
function scratchTree(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(1, k); const hgt = 1300;
  for (const [py, w] of [[0, 260], [-420, 220], [-820, 200], [-1180, 180]]) { rrect(-w / 2, py - 60, w, 60, 18); fillStroke('#7fb4e6', 6); }
  for (let i = 0; i < 3; i++) { rrect(-34, -420 * (i + 1) + 0, 68, 420 - 60, 10); fillStroke('#d9b98a', 6); g.strokeStyle = '#b8935f'; g.lineWidth = 4; for (let j = 0; j < 9; j++) { g.beginPath(); g.moveTo(-34, -420 * (i + 1) + 30 + j * 38); g.lineTo(34, -420 * (i + 1) + 46 + j * 38); g.stroke(); } }
  ell(110, -1210, 30, 30); fillStroke('#ff6fa0', 5); g.restore(); }
function ballPit(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-230, -150, 460, 150, 40); fillStroke('#56c1c9', 7); g.save(); rrect(-210, -260, 420, 250, 30); g.clip();
  const cols = ['#ff6f91', '#ffc75f', '#6fd3ff', '#a98bff', '#8ee07a', '#ff9a5a'];
  for (let i = 0; i < 46; i++) { const bx = -190 + (i * 53) % 380, by = -40 - Math.floor(i / 8) * 34 - Math.abs(Math.sin(t * 3 + i)) * 6; ell(bx, by, 26, 26); fillStroke(cols[i % 6], 4); g.lineWidth = 2.5; g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(bx, by, 16, .4, 2.2); g.stroke(); }
  g.restore(); g.restore(); }
function slide(x, y, k) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  g.lineWidth = 16; g.strokeStyle = OUT; g.beginPath(); g.moveTo(-120, -620); g.lineTo(-120, 0); g.moveTo(-40, -620); g.lineTo(-40, 0); g.stroke(); g.lineWidth = 10; g.strokeStyle = '#ffd23f'; g.stroke();
  for (let i = 0; i < 6; i++) { g.lineWidth = 8; g.strokeStyle = OUT; g.beginPath(); g.moveTo(-120, -560 + i * 95); g.lineTo(-40, -560 + i * 95); g.stroke(); }
  g.beginPath(); g.moveTo(-40, -620); g.bezierCurveTo(200, -560, 160, -120, 330, -90); g.lineWidth = 52; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 40; g.strokeStyle = '#ff6f91'; g.stroke();
  ell(380, -40, 90, 34); fillStroke('#7fb4e6', 6); ell(380, -54, 72, 18); g.fillStyle = '#b06a36'; g.fill(); for (let i = 0; i < 9; i++) { ell(330 + i * 12, -60 - (i % 3) * 6, 9, 7); g.fillStyle = '#8a4c22'; g.fill(); }
  g.restore(); }
function cinema(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-230, -330, 460, 300, 22); fillStroke('#2a2230', 9); g.save(); rrect(-205, -305, 410, 250, 12); g.clip(); g.fillStyle = '#9fe0ff'; g.fillRect(-205, -305, 410, 250);
  g.fillStyle = '#7fc45a'; g.fillRect(-205, -110, 410, 60); const bx = Math.sin(t * 1.5) * 120, by = -200 + Math.sin(t * 4) * 20, fl = Math.sin(t * 18) * 26;
  ell(bx, by, 40, 30); fillStroke('#ffcf3d', 5); g.beginPath(); g.moveTo(bx - 10, by); g.lineTo(bx - 50, by - 20 - fl); g.lineTo(bx + 10, by - 10); g.closePath(); fillStroke('#ffb020', 5);
  ell(bx + 18, by - 8, 6, 6); g.fillStyle = '#000'; g.fill(); g.beginPath(); g.moveTo(bx + 38, by - 4); g.lineTo(bx + 56, by + 2); g.lineTo(bx + 38, by + 8); g.fillStyle = '#ff8a2a'; g.fill(); g.restore();
  for (const sx of [-1, 1]) { g.fillStyle = OUT; g.fillRect(sx * 150 - 8, -30, 16, 30); } g.restore(); }
function mystery(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); dashed(() => { g.beginPath(); g.ellipse(0, -200, 200, 200, 0, 0, 7); }, k);
  text('?', 0, -200, 260 * k, '#ffd23f', '#1a0f08', 18);
  for (let i = 0; i < 10; i++) { const a = i / 10 * 7 + t; const r = 240 + Math.sin(t * 3 + i) * 20; star(Math.cos(a) * r, -200 + Math.sin(a) * r, 16 * k); } g.restore(); }
function star(x, y, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr_ = i % 2 ? r * .4 : r; g.lineTo(x + Math.cos(a) * rr_, y + Math.sin(a) * rr_); } g.closePath(); g.fillStyle = '#fff3a0'; g.fill(); }
function basket(x, y, s, name) { g.save(); g.translate(x, y); g.scale(s, s); ell(0, -30, 170, 60); fillStroke('#b77a44', 7); ell(0, -50, 140, 36); g.fillStyle = '#7fb4e6'; g.fill();
  g.strokeStyle = 'rgba(80,40,10,.35)'; g.lineWidth = 4; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 34, -2); g.lineTo(i * 34 + 10, -60); g.stroke(); }
  if (name) { rrect(-110, -6, 220, 54, 14); fillStroke('#ffffff', 5); text(name, 0, 21, 32, OUT, null, 0); } g.restore(); }
function bubble(x, y, s, txt, k) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.font = `700 ${s}px Fredoka`; const w = g.measureText(txt).width + 60;
  rrect(-w / 2, -s - 20, w, s + 40, 30); fillStroke('#ffffff', 6); g.beginPath(); g.moveTo(-20, 18); g.lineTo(-40, 60); g.lineTo(10, 18); fillStroke('#ffffff', 6); g.fillStyle = '#fff'; g.fillRect(-26, 10, 40, 12);
  text(txt, 0, -s / 2 + 2, s, OUT, null, 0); g.restore(); }
function paws(t, k) { if (k <= 0) return; g.save(); g.globalAlpha = k * .5; g.fillStyle = '#8a5230'; for (let i = 0; i < 26; i++) { const x = (i * 137 + t * 400) % (W + 200) - 100, y = 1500 + (i * 71) % 380; ell(x, y, 16, 12); g.fill(); for (const [dx, dy] of [[-14, -16], [0, -22], [14, -16]]) { ell(x + dx, y + dy, 6, 7); g.fill(); } } g.restore(); }

// ---------- UI ----------
function icon(kind, cx, cy, r) {
  g.save(); g.translate(cx, cy); const col = { follow: '#ff2d55', like: '#ff2d55', comment: '#2f9bff', share: '#ffb020' }[kind];
  ell(0, 0, r, r); g.fillStyle = col; g.fill(); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = r * .22; g.lineCap = 'round';
  if (kind === 'follow') { g.beginPath(); g.moveTo(-r * .45, 0); g.lineTo(r * .45, 0); g.moveTo(0, -r * .45); g.lineTo(0, r * .45); g.stroke(); }
  if (kind === 'like') { const s = r * .5; g.beginPath(); g.moveTo(0, s * .9); g.bezierCurveTo(-s * 1.6, -s * .2, -s * .7, -s * 1.3, 0, -s * .45); g.bezierCurveTo(s * .7, -s * 1.3, s * 1.6, -s * .2, 0, s * .9); g.fill(); }
  if (kind === 'comment') { rrect(-r * .5, -r * .42, r, r * .7, r * .2); g.fill(); g.beginPath(); g.moveTo(-r * .2, r * .25); g.lineTo(-r * .35, r * .55); g.lineTo(0, r * .25); g.fill(); g.fillStyle = col; for (const dx of [-.22, 0, .22]) { ell(dx * r, -r * .07, r * .07, r * .07); g.fill(); } }
  if (kind === 'share') { g.beginPath(); g.moveTo(-r * .45, r * .35); g.quadraticCurveTo(-r * .3, -r * .2, r * .2, -r * .2); g.stroke(); g.beginPath(); g.moveTo(r * .05, -r * .5); g.lineTo(r * .5, -r * .2); g.lineTo(r * .05, r * .1); g.fill(); }
  g.restore(); }
function card(k, y, kind, title, sub, active, t, badge) {
  if (k <= .01) return; const w = 900, h = 160, x = W / 2 - w / 2 + (1 - k) * -1100;
  g.save(); if (active) { g.translate(W / 2, y + h / 2); const p = 1 + .03 * Math.sin(t * 10); g.scale(p, p); g.translate(-W / 2, -(y + h / 2)); }
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 24; g.shadowOffsetY = 8; rrect(x, y, w, h, 40); g.fillStyle = active ? '#fff7dc' : '#ffffff'; g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = active ? 8 : 5; g.strokeStyle = active ? '#ffc21f' : '#e6d6c4'; g.stroke();
  icon(kind, x + 92, y + h / 2, 54);
  text(title, x + 175, y + 56, 60, '#1d1d1f', null, 0, 'left'); text(sub, x + 175, y + 112, 40, '#6a6a72', null, 0, 'left');
  if (badge) badge(x + w - 90, y + h / 2);
  g.restore(); }
function counter(k, n, total, label, y = 1700) {
  if (k <= .01) return; const x = 110, w = W - 220, h = 60; g.save(); g.globalAlpha = cl(k * 1.4); const yy = y + (1 - k) * 260;
  rrect(x - 24, yy - 74, w + 48, h + 110, 40); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
  text(`${Math.round(n)} / ${total} ${label}`, W / 2, yy - 30, 44, OUT, null, 0);
  rrect(x, yy, w, h, 30); g.fillStyle = '#eadccb'; g.fill(); const f = cl(n / total);
  if (f > 0) { rrect(x, yy, Math.max(h, w * f), h, 30); const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, f > .99 ? '#3fcf6a' : '#ff5a6e'); gr.addColorStop(1, f > .99 ? '#8ef07a' : '#ff8a5a'); g.fillStyle = gr; g.fill(); }
  g.restore(); }
function button(k, t, y) { if (k <= .01) return; const w = 600, h = 150, x = W / 2 - w / 2; const p = 1 + .05 * Math.sin(t * 9);
  g.save(); g.translate(W / 2, y + h / 2); g.scale(k * p, k * p); g.translate(-W / 2, -(y + h / 2)); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 26; rrect(x, y, w, h, 75); g.fillStyle = '#ff2d55'; g.fill(); g.shadowColor = 'transparent';
  text('+ Folgen', W / 2, y + h / 2 + 2, 78, '#fff', null, 0); g.restore(); }
function chip(x, y, txt, k, col = '#ffd23f') { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k); g.font = '700 40px Fredoka'; const w = g.measureText(txt).width + 50; rrect(-w / 2, -32, w, 64, 32); fillStroke(col, 5); text(txt, 0, 2, 40, OUT, null, 0); g.restore(); }

// ---------- captions (phrase style: up to 3 words, current word pops yellow) ----------
const PHR = []; { let cur = [];
  WORDS.forEach((w, i) => { cur.push(i); const end = /[.,!?]$/.test(w[0]) || w[0].endsWith('...'); if (end || cur.length >= 3) { PHR.push(cur); cur = []; } }); if (cur.length) PHR.push(cur); }
const SHOW = { hundert: '100', Hundert: '100', zwei: '2' };
function caption(t, y) {
  let wi = -1; for (let i = 0; i < WORDS.length; i++) if (WORDS[i][1] <= t + .02) wi = i; if (wi < 0 || t > WORDS[wi][2] + .6) return;
  const ph = PHR.find(p => p.includes(wi)); if (!ph) return;
  const ws = ph.map(i => SHOW[clean(WORDS[i][0])] || WORDS[i][0].replace(/,$/, ''));
  let fs = 92; g.font = `700 ${fs}px Fredoka`; const space = 44; let tot = () => ws.reduce((a, w) => a + g.measureText(w).width, 0) + space * (ws.length - 1);
  while (tot() > W - 100) { fs -= 4; g.font = `700 ${fs}px Fredoka`; }
  let x = W / 2 - tot() / 2;
  ph.forEach((i, j) => { const w = ws[j], mw = g.measureText(w).width; const on = i === wi, past = i < wi; if (i > wi) { x += mw + space; return; }
    const k = on ? pop(t, WORDS[i][1], .18) : 1, s = on ? 1 + .14 * k : 1;
    g.save(); g.translate(x + mw / 2, y); g.scale(s, s); text(w, 0, 0, fs, on ? '#ffd23f' : '#ffffff', '#1a0f08', 16); g.restore(); x += mw + space; });
}

// ---------- crowd: real photo cats (random looks), Mimi in the middle ----------
seed = 5; const CROWD = []; for (let i = 0; i < 120; i++) CROWD.push({ x: rr(60, W - 60), y: rr(1460, 1890), s: rr(.3, .44), k: i % CATS.length, ph: rr(0, 6) });
CROWD.sort((a, b) => a.y - b.y);
function ropes(k, t) { if (k <= 0) return; const pts = [[60, 90, 520, 760], [400, 90, 1020, 820], [700, 90, 120, 980], [1020, 90, 560, 1080]];
  pts.forEach(([x0, y0, x1, y1], i) => { const kk = cl(k * 4 - i); if (kk <= 0) return; const xe = lerp(x0, x1, kk), ye = lerp(y0, y1, kk), sag = 160 + i * 30;
    g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 22; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + xe) / 2, Math.max(y0, ye) + sag, xe, ye); g.stroke();
    g.strokeStyle = '#d9b26a'; g.lineWidth = 14; g.stroke(); g.setLineDash([10, 12]); g.strokeStyle = '#a8803e'; g.lineWidth = 14; g.stroke(); g.setLineDash([]);
    ell(xe, ye, 16, 16); fillStroke('#d9b26a', 5); }); }
function podium(k, rank, title, who, likes) { if (k <= .01) return; const w = 900, h = 250, x = W / 2 - w / 2, y = 520;
  g.save(); g.translate(W / 2, y + h / 2); g.scale(k, k); g.translate(-W / 2, -(y + h / 2)); rrect(x, y, w, h, 40); fillStroke('#ffffff', 7);
  ell(x + 110, y + h / 2, 70, 70); fillStroke(rank === 1 ? '#ffd23f' : '#d6dbe4', 7); text(String(rank), x + 110, y + h / 2 + 4, 90, OUT, null, 0);
  text(title, x + 210, y + 92, 52, OUT, null, 0, 'left'); text(who, x + 210, y + 172, 40, '#7a6a90', null, 0, 'left'); icon('like', x + w - 150, y + 172, 26); text(String(likes), x + w - 70, y + 174, 44, OUT, null, 0);
  g.restore(); }
// a real photo from the comments that turns into its cartoon kitten (m: 0 photo .. 1 kitten)
function polaroid(x, y, r, k, i, t, m = 0) { if (k <= .01) return; g.save(); g.translate(x, y); g.rotate(r); g.scale(k, k); rrect(-130, -150, 260, 300, 10); fillStroke('#ffffff', 6);
  g.fillStyle = '#d9ecff'; g.fillRect(-110, -130, 220, 210); g.save(); g.beginPath(); g.rect(-110, -130, 220, 210); g.clip();
  if (PHOTO[i] && m < 1) { g.globalAlpha = 1 - m; g.drawImage(PHOTO[i], -110, -130, 220, 220); g.globalAlpha = 1; }
  if (m > 0) { g.globalAlpha = m; const o = lookOf(CATS[i], i); o.mood = 'happy'; cat(0, 80, .55 * (.6 + .4 * back(m)), o, t + i); g.globalAlpha = 1; }
  if (m > 0 && m < 1) for (let j = 0; j < 8; j++) { const a = j / 8 * 7 + i; star(Math.cos(a) * 90 * m, -30 + Math.sin(a) * 90 * m, 14 * (1 - m) + 4); }
  g.restore();
  text('@' + CATS[i].uid, 0, 118, 24, OUT, null, 0); g.restore(); }
function nameWall(t, scroll, dim) {
  const cols = 3, cw = W / cols, rh = 330, n = CATS.length;
  g.fillStyle = wallPat; g.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), cx = (i % cols) * cw + cw / 2, cy = 520 + r * rh - scroll; if (cy < 200 || cy > H + 300) continue;
    rrect(cx - cw / 2 + 14, cy - 270, cw - 28, 310, 30); g.fillStyle = i === 0 ? '#fff3c4' : 'rgba(255,255,255,.75)'; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(59,36,22,.35)'; g.stroke();
    const o = lookOf(CATS[i], i); o.mood = 'happy'; if (i === 0) o.crown = 1; cat(cx + 20, cy - 40, .55, o, t + i * .7);
    if (PHOTO[i]) { const px = cx - cw / 2 + 30, py = cy - 250; g.save(); rrect(px, py, 96, 96, 16); g.clip(); g.drawImage(PHOTO[i], px, py, 96, 96); g.restore(); rrect(px, py, 96, 96, 16); g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.stroke(); text('➜', px + 120, py + 52, 34, '#c98a52', null, 0); }
    let nm = '@' + CATS[i].uid; g.font = '700 30px Fredoka'; while (g.measureText(nm).width > cw - 50) nm = nm.slice(0, -2) + '…';
    text(nm, cx, cy + 10, 30, OUT, null, 0); if (i === 0) text(`Nr. 1 · ${CATS[0].likes} ❤`, cx, cy - 238, 28, '#c4384f', null, 0); }
  if (dim > 0) { g.fillStyle = `rgba(30,18,10,${.55 * dim})`; g.fillRect(0, 0, W, H); }
}
function dream(t, k) {   // Mimi's dream: a home for every kitten, in a big flower garden
  if (k <= .01) return; g.save(); g.translate(W / 2, 600); g.scale(1.2 * k, 1.2 * k);
  g.beginPath(); for (const [dx, dy, r] of [[-300, 40, 170], [-120, -80, 220], [100, -90, 230], [300, 30, 170], [0, 120, 260]]) { g.moveTo(dx + r, dy); g.arc(dx, dy, r, 0, 7); } fillStroke('#ffffff', 7);
  g.save(); g.beginPath(); for (const [dx, dy, r] of [[-300, 40, 150], [-120, -80, 200], [100, -90, 210], [300, 30, 150], [0, 120, 240]]) { g.moveTo(dx + r, dy); g.arc(dx, dy, r, 0, 7); } g.clip();
  const gr = g.createLinearGradient(0, -320, 0, 380); gr.addColorStop(0, '#bfe8ff'); gr.addColorStop(1, '#fff1d6'); g.fillStyle = gr; g.fillRect(-520, -340, 1040, 740);
  g.fillStyle = '#9fdc8a'; g.beginPath(); g.moveTo(-520, 60); for (let x = -520; x <= 520; x += 40) g.lineTo(x, 40 - 30 * Math.sin(x * .01)); g.lineTo(520, 400); g.lineTo(-520, 400); g.fill();
  // homes (little houses / beds), each with a kitten
  const hk = ramp(t, tw.zuhause - .2, tw.garten);
  for (let i = 0; i < 12; i++) { const kk = back(cl(hk * 12 - i)); if (kk <= .01) continue; const x = -400 + (i % 6) * 160, y = 120 + Math.floor(i / 6) * 120 - (i % 2) * 14;
    g.save(); g.translate(x, y); g.scale(.5 * kk, .5 * kk); rrect(-80, -120, 160, 120, 14); fillStroke(['#ffd3e2', '#d9ccff', '#c9f0dc', '#ffe9b8'][i % 4], 6);
    g.beginPath(); g.moveTo(-100, -110); g.lineTo(0, -200); g.lineTo(100, -110); g.closePath(); fillStroke(['#ff8fb1', '#a98bff', '#5fd3a8', '#ffb648'][i % 4], 6); g.restore();
    const c = COLORS[i % COLORS.length]; cat(x, y + 4, .16 * kk, { c: c[0], c2: c[1], mood: 'happy' }, t + i); }
  // flowers everywhere
  const fk = ramp(t, tw.garten - .2, tw.blumen + .4);
  for (let i = 0; i < 40; i++) { const kk = cl(fk * 40 - i); if (kk <= 0) continue; const x = -480 + (i * 97) % 960, y = 60 + (i * 53) % 300; const r = 12 * kk;
    g.fillStyle = ['#ff6f91', '#ffc75f', '#a98bff', '#ffffff', '#ff9a5a'][i % 5]; for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2 + t; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .7, 0, 7); g.fill(); } g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(x, y, r * .6, 0, 7); g.fill(); }
  g.restore(); g.restore(); }
function bar(k, v, y) { if (k <= .01) return; const x = 110, w = W - 220, h = 56; g.save(); g.globalAlpha = cl(k * 1.4);
  rrect(x - 26, y - 84, w + 52, h + 130, 36); fillStroke('#ffffff', 6); text(`${Math.round(v).toLocaleString('de-DE')} / ${GOALN.toLocaleString('de-DE')} Kätzchen`, W / 2, y - 36, 46, OUT, null, 0);
  rrect(x, y, w, h, 28); fillStroke('#eadccb', 4); const f = cl(v / GOALN); rrect(x, y, Math.max(h, w * f), h, 28); fillStroke('#ff8a5a', 4); g.restore(); }
// ---------- the city map: 100 x 100 = 10.000 houses, filled from the centre outwards ----------
const MAPN = 100, ORDER = (() => { const c = []; for (let y = 0; y < MAPN; y++) for (let x = 0; x < MAPN; x++) { const dx = x - 49.5, dy = y - 49.5; c.push([x, y, Math.hypot(dx, dy * 1.1) + ((x * 7 + y * 13) % 10) * .35]); } c.sort((a, b) => a[2] - b[2]); return c; })();
const RANK = new Int32Array(MAPN * MAPN); ORDER.forEach(([x, y], i) => { RANK[y * MAPN + x] = i; });
const HCOL = ['#ff8fb1', '#a98bff', '#5fd3a8', '#ffb648', '#7fc8ff', '#f3a35b'];
const DUCELL = ORDER[FOLLOWERS][0] + ORDER[FOLLOWERS][1] * MAPN;
function drawMap(t, lit, zoom, fx, fy, k) {
  if (k <= .01) return; g.save(); g.globalAlpha = cl(k * 1.4);
  g.fillStyle = '#e9f5e1'; g.fillRect(0, 0, W, H);
  const S = 9.6 * zoom, ox = W / 2 - fx * S, oy = 980 - fy * S;
  g.fillStyle = '#d7e8cf'; for (let i = 0; i <= MAPN; i += 10) { g.fillRect(ox + i * S - S * .15, oy, S * .3, MAPN * S); g.fillRect(ox, oy + i * S - S * .15, MAPN * S, S * .3); }
  const x0 = Math.max(0, Math.floor(-ox / S)), x1 = Math.min(MAPN, Math.ceil((W - ox) / S)), y0 = Math.max(0, Math.floor(-oy / S)), y1 = Math.min(MAPN, Math.ceil((H - oy) / S));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const r = RANK[y * MAPN + x], X = ox + x * S + S * .12, Y = oy + y * S + S * .12, sz = S * .76;
    const on = r < lit, du = y * MAPN + x === DUCELL && t > tw.haus2 - .1;
    g.fillStyle = du ? '#ffd23f' : on ? HCOL[(x * 3 + y * 5) % 6] : '#dfe2e7'; if (S > 20) g.fillRect(X, Y + sz * .35, sz, sz * .65); else g.fillRect(X - S * .06, Y - S * .06, sz + S * .12, sz + S * .12);
    if (S > 20) { g.beginPath(); g.moveTo(X - sz * .08, Y + sz * .4); g.lineTo(X + sz / 2, Y); g.lineTo(X + sz * 1.08, Y + sz * .4); g.closePath(); g.fillStyle = du ? '#e0a000' : on ? '#8a5230' : '#a9adb5'; g.fill();
      if (on && S > 60) { const ci = r % CATS.length; let nm = '@' + CATS[ci].uid; g.font = `700 ${Math.round(S * .14)}px Fredoka`; while (g.measureText(nm).width > S * .95) nm = nm.slice(0, -2) + '…'; text(nm, X + sz / 2, Y + sz * 1.08, Math.round(S * .14), OUT, null, 0);
        const c = COLORS[ci % COLORS.length]; cat(X + sz / 2, Y + sz * .9, S * .0016, { c: c[0], c2: c[1], mood: 'happy' }, t + r);
        if (t > tw.napf - .1) { g.fillStyle = '#7fb4e6'; g.beginPath(); g.ellipse(X + sz * .88, Y + sz * .95, S * .09, S * .035, 0, 0, 7); g.fill(); } } } }
  // Mimi's house in the middle
  g.restore(); }
function ortsschild(k, v) { if (k <= .01) return; g.save(); g.translate(W / 2, 520); g.scale(k, k);
  rrect(-380, -120, 760, 240, 26); g.fillStyle = '#ffd200'; g.fill(); g.lineWidth = 14; g.strokeStyle = '#111'; g.stroke(); rrect(-354, -94, 708, 188, 16); g.lineWidth = 6; g.stroke();
  text('MIMISTADT', 0, -18, 112, '#111', null, 0); text(`Einwohner: ${Math.round(v).toLocaleString('de-DE')} / 10.000`, 0, 62, 44, '#111', null, 0); g.restore(); }
function frame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.globalAlpha = 1;
  // A: the house is full, Mimi is sad
  if (t < tw.draussen - .05) {
    room(t, 0); scratchTree(150, 1440, 1, t); ropes(1, t);
    for (let i = 0; i < CROWD.length; i++) { const c = CROWD[i]; const o = lookOf(CATS[c.k], c.k); o.mood = i % 4 ? 'neutral' : 'tired'; cat(c.x, c.y - 60 * (i % 3), c.s * 1.1, o, t + c.ph); }
    const sq = 1 + .04 * Math.sin(t * 20) * ramp(t, tw.platz - .2, tw.platz + .2);
    cat(W / 2, 1650, 1.35 * sq, { mood: 'sad', tear: 1, meow: win(t, .1, .8, .1) }, t);
    text('Mimis Haus', W / 2, 330, 100, '#ffffff', OUT, 16); text('ist voll 😿', W / 2, 450, 110, '#ffd23f', OUT, 18);
    chip(W / 2, 580, `${FOLLOWERS.toLocaleString('de-DE')} Kätzchen`, pop(t, tw.vier - .1, .3), '#ffffff');
    if (t > tw.platz - .1) { g.save(); g.translate(W / 2, 760); g.rotate(-.06); g.scale(pop(t, tw.platz - .1, .3), pop(t, tw.platz - .1, .3)); text('KEIN PLATZ', 0, 0, 96, '#ff5a5a', OUT, 16); g.restore(); }
    return; }
  // B: outside in the rain, kittens without a home
  if (t < tw.stadt - .1) {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1b2350'); sky.addColorStop(1, '#3a4673'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2b3a33'; g.fillRect(0, 1400, W, H - 1400);
    for (let i = 0; i < 6; i++) { const c = COLORS[(i * 3) % COLORS.length]; cat(150 + i * 160, 1520 + (i % 2) * 60, .55, { c: c[0], c2: c[1], mood: 'sad', tear: i % 2 }, t + i); }
    g.strokeStyle = 'rgba(180,200,255,.45)'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 200; i++) { const x = (i * 97.3 + t * 140) % (W + 200) - 100, y = (i * 211.7 + t * 1500) % (H + 200) - 100; g.moveTo(x, y); g.lineTo(x - 14, y + 46); } g.stroke();
    // Mimi watching from the window
    g.save(); ell(W / 2, 640, 230, 230); fillStroke('#c98a52', 14); g.clip(); g.fillStyle = '#f7e2c4'; g.fillRect(W / 2 - 240, 400, 480, 480); cat(W / 2, 880, 1.0, { mood: 'sad', look: .2 }, t); g.restore();
    chip(W / 2, 1000, 'kein Zuhause', pop(t, tw.zuhause - .1, .3), '#ffffff');
    return; }
  // C/D/E: the map
  const lit = Math.round(FOLLOWERS * ease(t, tw.karte - .1, tw.karte + 1.2)) + (t > tw.haus2 - .1 ? 1 : 0);
  const zin = ease(t, tw.jedes - .2, tw.jedes + .6) * (1 - ease(t, tw.zehn - .4, tw.zehn + .2));
  const zdu = ease(t, tw.haus2 - .4, tw.haus2 + .2) * (1 - ease(t, tw.schreib + .2, tw.schreib + .8));
  const fx0 = 50, fy0 = 50, [dx, dy] = [ORDER[FOLLOWERS][0] + .5, ORDER[FOLLOWERS][1] + .5];
  const zoom = lerp(1.05, 14, zin) * (1 - zdu) + lerp(1.05, 6, zdu) * zdu, fx = lerp(fx0, 44, zin) * (1 - zdu) + dx * zdu, fy = lerp(fy0, 47, zin) * (1 - zdu) + dy * zdu;
  // intro: Mimi decides to build a city
  const ci = win(t, tw.stadt - .15, tw.karte + .1, .2);
  drawMap(t, lit, Math.max(1, zoom), fx, fy, ramp(t, tw.karte - .3, tw.karte + .1));
  if (ci > .01) { g.save(); g.globalAlpha = ci; room(t, 0); scratchTree(150, 1440, 1, t); ropes(1, t); cat(W / 2, 1600, 1.3, { mood: 'happy', crown: 1 }, t); text('Mimi baut', W / 2, 360, 100, '#ffffff', OUT, 16); text('eine Stadt!', W / 2, 480, 110, '#ffd23f', OUT, 18); g.restore(); }
  if (t > tw.karte) { chip(W / 2, 1640, '1 Häuschen = 1 Kätzchen', win(t, tw.jedes - .1, tw.mimistadt - .1, .2), '#ffffff');
    ortsschild(back(ramp(t, tw.mimistadt - .15, tw.mimistadt + .25)) * win(t, tw.mimistadt - .15, tw.jeder, .2), lit);
    if (t > tw.offiz - .1 && t < tw.jeder) { g.save(); g.translate(W / 2, 1600); g.rotate(-.12); const k = pop(t, tw.offiz - .1, .3); g.scale(k, k); rrect(-330, -70, 660, 140, 20); g.lineWidth = 10; g.strokeStyle = '#d23a3a'; g.stroke(); text('OFFIZIELL ab 10.000', 0, 6, 64, '#d23a3a', null, 0); g.restore(); } }
  // follow = your house lights up
  const nk = win(t, tw.jeder - .1, tw.schreib, .25);
  if (nk > .01) { card(back(ramp(t, tw.jeder - .1, tw.jeder + .3)) * nk, 400, 'follow', 'FOLGEN', 'Du bekommst ein Haus auf der Karte', true, t);
    const pk = pop(t, tw.haus2 - .1, .4); if (pk > .01) { g.save(); g.translate(W / 2, 880); g.scale(pk, pk); g.beginPath(); g.moveTo(0, 60); g.lineTo(-40, 0); g.arc(0, -10, 42, Math.PI * .85, Math.PI * .15); g.closePath(); fillStroke('#ff2d55', 6); text('@du', 0, -12, 34, '#ffffff', null, 0); g.restore();
      for (let j = 0; j < 8; j++) { const a = j / 8 * 7 + t * 2; star(W / 2 + Math.cos(a) * 120, 980 + Math.sin(a) * 80, 16); } } }
  const cm = win(t, tw.schreib - .1, tw.folg + .1, .25);
  if (cm > .01) { card(back(ramp(t, tw.schreib - .1, tw.schreib + .3)) * cm, 400, 'comment', 'KOMMENTIEREN', 'Wie soll dein Kätzchen aussehen?', true, t);
    bubble(W / 2 - 60, 720, 46, 'grau mit weißen Pfoten', pop(t, tw.schreib + .3, .3) * cm); bubble(W / 2 + 60, 860, 46, 'orange, heißt Kiwi', pop(t, tw.schreib + .7, .3) * cm); }
  const ek = ramp(t, tw.folg - .15, tw.folg + .3);
  if (ek > 0) button(pop(t, tw.folg - .1, .35), t, 1250);
  chip(W / 2, 1820, `${Math.round(lit).toLocaleString('de-DE')} / 10.000 Häuser`, ramp(t, tw.karte, tw.karte + .3), '#ffd23f');
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => { frame(t); return out.toDataURL('image/jpeg', q); };
window.__done = true;
