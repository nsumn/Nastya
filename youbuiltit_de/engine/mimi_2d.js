// ===================== 07 Mimi — 2D cartoon "Jeder Follower wird ein Kätzchen" =====================
// Pure canvas 2D (no three.js). render_video.sh copies mimi_2d.js -> mimi.js.  Page: index_mimi.html
// Exports window.renderAt(t), window.END, window.SFX (word-synced sound events for sfx.py).

await document.fonts.load('700 96px Fredoka');
const W = 1080, H = 1920;
const WORDS = await (await fetch('../07_mimi/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; const rr = (a, b) => a + (b - a) * rnd();

const tw = {
  niem: T('niemanden'), familie: T('Familie'), umgez: T('umgezogen'), vergessen: T('vergessen'),
  das1: T('Das'), mimi1: T('Mimi'), chefin: T('Chefin'), genau: T('genau'), von2: T('Von'), niem2: T('niemandem'),
  aber1: T('Aber'), komm: T('komm'), rein: T('rein'), katzenhaus: T('Katzenhaus'), riesig: T('Riesig'), leer: T('leer'),
  kein1: T('Kratzbaum'), kein2: T('Körbchen'), napf: T('Napf'), und2: T('Und', 2), spiel: T('Spiel'),
  folgst: T('Folgst'), likest: T('Likest'), komment: T('Kommentierst'), teilst: T('Teilst'), halsband: T('Halsband'),
  hier3: T('Hier'), kratz2: T('Kratzbaum', 2), baelle: T('Bällebad'), rutsche: T('Rutsche'), kino: T('Kino'), vogel: T('Vogelvideos'), oder: T('Oder'), gesehen: T('gesehen'),
  jeder: T('Jeder'), koerb2: T('Körbchen', 2), namen: T('Namen'),
  stell: T('Stell'), hundert: T('hundert'), hundert2: T('Hundert'), nachts: T('nachts'), rennen: T('rennen'),
  aber2: T('Aber', 2), nur: T('nur', 2), schafft: T('schafft'), allein: T('allein'),
  was2: T('Was'), zuerst: T('zuerst'), schreib: T('Schreib'), likes: T('Likes', 2), gebaut2: T('gebaut', 2),
  psst: T('psst'), dachboden: T('Dachboden'), augen: T('Augen'),
  folg: T('Folg', 2), neue: T('Neue'), teil: T('Teil', 2) };

// ---------- sound events ----------
const SFX = { end: END, music_gain: .15, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
SFX.beds.push([0, tw.das1 + .2, 'rain', 1.0], [tw.nachts - .3, tw.aber2, 'purr', .35]);
e(.3, 'meow_sad', .9); e(tw.umgez, 'whoosh', .6); e(tw.vergessen, 'boom', .5);
e(tw.das1 - .15, 'sparkle', .6); e(tw.mimi1, 'pop', .8); e(tw.chefin, 'ding', .6); e(tw.genau - .05, 'tick', .7); e(tw.genau + .25, 'tick', .7); e(tw.niem2, 'boing', .7);
e(tw.komm, 'whoosh', .9); e(tw.katzenhaus, 'clack', .6); e(tw.riesig, 'swoosh_up', .6); e(tw.leer, 'tick', .5);
e(tw.kein1, 'pop', .7); e(tw.kein1 + .35, 'buzz', .6); e(tw.kein2, 'pop', .7); e(tw.kein2 + .35, 'buzz', .6); e(tw.napf - .05, 'pop', .7); e(tw.napf + .3, 'buzz', .6);
e(tw.und2, 'whoosh', .6);
for (const k of ['folgst', 'likest', 'komment', 'teilst']) { e(tw[k] - .05, 'pop', .9); }
e(tw.folgst + .5, 'meow_happy', .6); e(tw.likest + .4, 'heart', .6); e(tw.halsband, 'sparkle', .9);
e(tw.hier3, 'whoosh', .6);
e(tw.kratz2, 'swoosh_up', .7); e(tw.kratz2 + .35, 'clack', .8); e(tw.baelle, 'pop', .8); for (let i = 0; i < 8; i++) e(tw.baelle + .15 + i * .07, 'tick', .5);
e(tw.rutsche, 'boing', .8); e(tw.rutsche + .6, 'clack', .6); e(tw.kino, 'pop', .8); e(tw.vogel, 'tweet', .8); e(tw.oder, 'sparkle', .8);
e(tw.jeder, 'pop', 1); e(tw.koerb2, 'meow_happy', .8); e(tw.namen, 'ding', .7);
e(tw.stell, 'whoosh', .7); for (let i = 0; i < 24; i++) e(tw.hundert + i * .09, i % 3 ? 'pop' : 'meow_happy', .35); e(tw.hundert2 + .2, 'tada', .8);
e(tw.aber2 - .1, 'whoosh', .8); e(tw.nur, 'boom', .6); e(tw.schafft, 'boing', .6); e(tw.allein, 'meow_sad', .7);
e(tw.was2, 'ding', .7); e(tw.schreib, 'pop', .8); e(tw.schreib + .3, 'pop', .7); e(tw.likes, 'heart', .7);
e(tw.psst - .1, 'tick', .6); e(tw.dachboden, 'boom', .8); e(tw.augen, 'sparkle', .5);
e(tw.folg - .05, 'pop', 1); e(tw.folg + .5, 'ding', .8); e(tw.teil, 'tada', .7);
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
  g.strokeStyle = c; g.lineWidth = 28; g.stroke();
  // body
  ell(0, -70, 100, 82); fillStroke(c, 7);
  ell(0, -55, 58, 56); g.fillStyle = c2; g.fill();
  // paws
  for (const sx of [-1, 1]) { ell(sx * 48, -6 - (o.paw && sx === 1 ? 50 : 0), 34, 22); fillStroke(c2, 6); }
  // head
  const hx = (o.look || 0) * 10, hy = -190 + (o.mood === 'sad' ? 8 : 0);
  g.save(); g.translate(hx, hy); g.rotate((o.tilt || 0) + (o.mood === 'sad' ? -.06 : 0));
  // ears
  const ed = o.mood === 'sad' ? .5 : 0;
  for (const sx of [-1, 1]) { g.save(); g.translate(sx * 72, -66); g.rotate(sx * (.25 + ed));
    g.beginPath(); g.moveTo(-40, 20); g.quadraticCurveTo(-8, -86, 10, -78); g.quadraticCurveTo(40, -40, 42, 22); g.closePath(); fillStroke(c, 7);
    g.beginPath(); g.moveTo(-22, 12); g.quadraticCurveTo(-4, -50, 6, -48); g.quadraticCurveTo(24, -24, 24, 14); g.closePath(); g.fillStyle = '#ff9fb4'; g.fill(); g.restore(); }
  ell(0, 0, 128, 108); fillStroke(c, 7);
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

// ---------- the crowd of 100 kittens ----------
seed = 5; const CROWD = []; for (let i = 0; i < 100; i++) CROWD.push({ x: rr(60, W - 60), y: rr(1460, 1880), s: rr(.32, .46), c: COLORS[i % COLORS.length], ph: rr(0, 6), d: rr(.0, 1.2), sp: rr(-1, 1) });
CROWD.sort((a, b) => a.y - b.y);
const NAMES = ['@lena_08', '@finn.k', '@mia_miau', '@jonas_x', '@emma.hh', '@ben_ber'];

// ---------- frame ----------
function frame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.globalAlpha = 1;
  // SCENE 1: rain outside, van drives away
  if (t < tw.das1) {
    exterior(t);
    const z = 1 + ease(t, 0, tw.das1) * .12; g.save(); g.translate(W / 2, 1420); g.scale(z, z); g.translate(-W / 2, -1420);
    cat(520, 1440, 1.25, { mood: 'sad', tear: ramp(t, 1.0, 1.6), look: t > tw.umgez ? .9 : 0, meow: win(t, .3, 1.0, .1), c: '#e99a55' }, t); g.restore();
    text('Katzen im Haus: 1', W / 2, 1760, 54, '#fff', '#1a0f08', 12);
    caption(t, 300); return;
  }
  // SCENE 2: "Das ist Mimi. Chefin von ... genau. Von niemandem."
  if (t < tw.aber1) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#ffcf9a'); bg.addColorStop(.6, '#ffe7c9'); bg.addColorStop(1, '#bfe39a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { g.fillStyle = ['#ff9fb4', '#fff3a0', '#ffffff', '#c9a7ff'][i % 4]; ell((i * 151) % W, 1600 + (i * 67) % 260, 12, 12); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 12; i++) { g.save(); g.translate(W / 2, 1000); g.rotate(i / 12 * Math.PI * 2 + t * .2); g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -1400); g.lineTo(60, -1400); g.fill(); g.restore(); }
    const k = pop(t, tw.das1 - .1, .4); const awk = win(t, tw.genau - .1, tw.von2, .1);
    cat(W / 2, 1380, 1.75 * k, { mood: t > tw.von2 ? 'sad' : (awk > .5 ? 'neutral' : 'happy'), crown: pop(t, tw.chefin - .1, .3), crownTilt: t > tw.von2 ? .5 * ease(t, tw.von2, tw.niem2 + .3) : 0, blink: awk > .5 && Math.sin(t * 20) > 0 ? 1 : 0, look: awk > .5 ? -.8 : 0 }, t);
    chip(W / 2, 1520, 'Mimi', pop(t, tw.mimi1 - .1, .3), '#ffffff');
    chip(W / 2, 1610, 'Katzen im Haus: 1', pop(t, tw.niem2 - .1, .3), '#ffd23f');
    if (awk > .1) { g.save(); g.globalAlpha = awk; text('...', 820, 760, 120, '#fff', '#1a0f08', 14); g.restore(); }
    caption(t, 300); return;
  }
  // SCENE 3+: inside the big empty house  (camera zoom via transform)
  let zoom = 1, cx = W / 2, cy = 1300, ay = 1300;
  if (t < tw.riesig) zoom = lerp(1.6, 1.25, ease(t, tw.aber1, tw.katzenhaus + .3));
  else if (t < tw.und2) zoom = lerp(1.25, 1, ease(t, tw.riesig - .1, tw.riesig + .5));
  const hatch = ease(t, tw.psst - .1, tw.dachboden + .2) * (1 - ramp(t, tw.folg - .2, tw.folg));
  if (hatch > 0) { zoom = lerp(zoom, 2.6, hatch); cy = lerp(1300, 50, hatch); ay = lerp(1300, 820, hatch); }
  const night = win(t, tw.nachts - .3, tw.aber2 - .05, .3) + win(t, tw.psst - .2, tw.folg - .1, .3);
  g.save(); g.translate(cx, ay); g.scale(zoom, zoom); g.translate(-cx, -cy);
  room(t, cl(night));
  // empty-room props (crossed out)
  if (t < tw.und2) {
    const items = [[tw.kein1, 220, 1420, 'tree'], [tw.kein2, 540, 1500, 'basket'], [tw.napf, 860, 1520, 'bowl']];
    for (const [a, x, y, kind] of items) { const k = pop(t, a - .1, .3); if (k <= 0) continue;
      dashed(() => { if (kind === 'tree') { g.beginPath(); g.rect(x - 70, y - 520, 140, 520); } else if (kind === 'basket') { g.beginPath(); g.ellipse(x, y - 40, 150, 55, 0, 0, 7); } else { g.beginPath(); g.ellipse(x, y - 30, 90, 36, 0, 0, 7); } }, k);
      cross(x, y - (kind === 'tree' ? 260 : 50), pop(t, a + .3, .25)); }
  }
  // ideas build up
  const ideas = t > tw.hier3 && !(t > tw.aber2 && t < tw.was2 + .1) && t < tw.psst - .1;
  if (ideas) {
    scratchTree(130, 1440, ease(t, tw.kratz2 - .15, tw.kratz2 + .35), t);
    if (!(t > tw.jeder - .1 && t < tw.aber2)) ballPit(380, 1860, pop(t, tw.baelle - .1, .35), t);
    slide(580, 1440, pop(t, tw.rutsche - .1, .35));
    cinema(560, 900, pop(t, tw.kino - .1, .35), t);
    if (t < tw.jeder) mystery(800, 1250, pop(t, tw.oder - .1, .35), t);
  }
  // Mimi in the house
  const alone = !(t > tw.jeder - .1 && t < tw.aber2);
  let mx = W / 2, my = 1650, ms = 1.0, mood = 'sad';
  if (t < tw.riesig) { ms = 1.0; mood = 'neutral'; }
  if (t > tw.und2) mood = 'happy';
  if (t > tw.folgst - .1 && t < tw.hier3) { mx = 300; ms = .9; }
  if (t > tw.hier3) { mx = 860; my = 1760; ms = .9; mood = 'wow'; }
  if (t > tw.jeder - .1) { mx = 330; mood = 'happy'; }
  if (t > tw.aber2 - .05) { mx = W / 2; my = 1700; ms = 1.25; mood = 'sad'; }
  if (t > tw.was2) { mood = 'neutral'; mx = 860; ms = 1.0; }
  if (t > tw.psst - .2) { mood = 'wow'; mx = W / 2; }
  if (t > tw.folg - .1) mood = 'happy';
  const hop = (t > tw.und2 && t < tw.folgst) || (t > tw.koerb2 && t < tw.stell) || (t > tw.teil) ? Math.abs(Math.sin(t * 7)) * 30 : 0;
  // "Mimi schafft das nicht allein": pushes a heavy box and slips
  if (t > tw.schafft - .3 && t < tw.was2) { const k = ease(t, tw.schafft - .3, tw.allein); g.save(); rrect(620 - k * 30, 1480, 260, 220, 16); fillStroke('#c98a52', 7); text('?', 750 - k * 30, 1590, 140, '#fff', OUT, 10); g.restore(); mx = 520 - k * 30; mood = 'tired'; }
  if ((t > tw.das1 && t < tw.jeder - .1 || t > tw.aber2 - .05) && !(t > tw.und2 && t < tw.hier3)) {
    if (t < tw.halsband + .6 || t > tw.hier3 || t < tw.folgst) {
      if (!(t > tw.stell - .1 && t < tw.aber2)) cat(mx, my - hop, ms, { mood, look: t > tw.psst ? 0 : 0, tilt: t > tw.psst ? -.1 : 0, collar: t > tw.halsband - .1 && t < tw.hier3 + .1, crown: t > tw.halsband - .1 && t < tw.hier3 + .1 ? 0 : 0, meow: win(t, tw.allein, tw.allein + .6, .1), tear: t > tw.nur && t < tw.was2 ? 1 : 0, sq: hop > 0 ? (1 - Math.abs(Math.sin(t * 7))) * .5 : 0 }, t);
    }
  }
  // "Hallo?" echo in the empty house
  if (t > tw.katzenhaus - .2 && t < tw.kein1) { const k = pop(t, tw.katzenhaus - .2, .3); bubble(W / 2 + 150, 1330, 80, 'Hallo?', k); const e2 = ramp(t, tw.riesig, tw.kein1); g.save(); g.globalAlpha = (1 - e2) * .6; text('hallo... hallo...', W / 2 + 120 + e2 * 80, 1120 - e2 * 60, 60, '#fff', '#1a0f08', 8); g.restore(); }
  // you join: second kitten with name basket
  if (t > tw.jeder - .1 && t < tw.stell) {
    cat(330, 1640, .95, { mood: 'happy' }, t);
    const k = pop(t, tw.jeder - .05, .4); cat(730, 1640 - Math.abs(Math.sin(t * 6)) * 20 * k, .95 * k, { mood: 'happy', c: '#9aa3ad', c2: '#f1f3f5', label: k > .9 ? ['DU', '#ffd23f'] : null }, t + 1.3);
    basket(560, 1840, .9 * pop(t, tw.koerb2 - .1, .35), t > tw.namen - .1 ? '@deinname' : '');
  }
  // 100 kittens
  const crowdK = ramp(t, tw.hundert - .1, tw.hundert2 + .4);
  if (t > tw.stell - .1 && t < tw.aber2 - .05) {
    const n = Math.round(100 * crowdK);
    for (let i = 0; i < n; i++) { const c = CROWD[i]; const run = t > tw.nachts - .2 ? (t * 160 * c.sp) : 0; const x = ((c.x + run) % (W + 120) + W + 120) % (W + 120) - 60;
      cat(x, c.y - Math.abs(Math.sin(t * 6 + c.ph)) * 18, c.s * pop(t, tw.hundert - .1 + i * .02, .25), { c: c.c[0], c2: c.c[1], mood: i % 3 ? 'happy' : 'wow' }, t + c.ph); }
    if (crowdK > .5) cat(W / 2, 1600, .9, { mood: 'happy', crown: 1 }, t);
  }
  paws(t, win(t, tw.nachts - .2, tw.aber2 - .1, .2));
  // attic eyes
  const eyes = ease(t, tw.dachboden - .1, tw.augen);
  if (t > tw.psst - .2 && t < tw.folg + .3) { g.fillStyle = `rgba(5,5,20,${.55 * ramp(t, tw.psst - .2, tw.psst + .2)})`; g.fillRect(0, 0, W, H);
    rrect(380, 10, 320, 80, 12); g.fillStyle = '#05040a'; g.fill(); const bl = Math.sin(t * 2.3) > .93 ? .1 : 1;
    for (const sx of [-1, 1]) { g.save(); g.shadowColor = '#ffe14a'; g.shadowBlur = 40; ell(540 + sx * 50, 52, 22 * eyes, 14 * eyes * bl); g.fillStyle = '#ffe14a'; g.fill(); g.restore(); ell(540 + sx * 50, 52, 5 * eyes, 12 * eyes * bl); g.fillStyle = '#000'; g.fill(); } }
  g.restore(); // end camera

  // ---- overlays (screen space) ----
  // CTA panel
  const cta = win(t, tw.und2 - .1, tw.hier3 + .1, .3);
  if (cta > .01) { darkPanel(cta); text('SO MACHST DU MIT:', W / 2, 330, 76, '#ffd23f', '#1a0f08', 16);
    const rows = [['folgst', 'follow', 'FOLGEN', 'Du wirst ein Kätzchen'], ['likest', 'like', 'LIKEN', 'Du stimmst ab'], ['komment', 'comment', 'KOMMENTIEREN', 'Deine Idee wird gebaut'], ['teilst', 'share', 'TEILEN', 'Goldenes Halsband']];
    const nxt = ['likest', 'komment', 'teilst', 'hier3'];
    rows.forEach(([k, kind, ti, su], i) => card(back(ramp(t, tw[k] - .1, tw[k] + .3)) * cta, 450 + i * 190, kind, ti, su, t > tw[k] && t < tw[nxt[i]], t,
      kind === 'share' ? (x, y) => { g.lineWidth = 12; g.strokeStyle = '#ffc933'; g.beginPath(); g.arc(x, y - 10, 34, .2, Math.PI - .2); g.stroke(); ell(x, y + 26, 12, 12); fillStroke('#ffe27a', 4); } : kind === 'follow' ? (x, y) => cat(x, y + 50, .26, { mood: 'happy' }, t) : null));
    cat(W / 2, 1720 - Math.abs(Math.sin(t * 5)) * 20, .85, { mood: 'happy', collar: t > tw.halsband - .1 }, t);
  }
  // counters
  counter(win(t, tw.jeder - .1, tw.stell, .3), 2, 100, 'Kätzchen', 1200);
  counter(win(t, tw.stell, tw.aber2, .3), crowdK * 100, 100, 'Kätzchen', 1200);
  counter(win(t, tw.aber2 - .05, tw.was2, .3), 1, 100, 'Kätzchen', 1200);
  // build-site sign + comment slots
  const site = win(t, tw.was2 - .1, tw.psst - .1, .3);
  if (site > .01) { g.save(); g.translate(W * .68, 1350); g.scale(site, site); g.fillStyle = '#7a4a28'; g.fillRect(-12, 0, 24, 360); rrect(-210, -110, 420, 140, 20); fillStroke('#e9c48a', 7); text('BAUPLATZ ???', 0, -40, 54, OUT, null, 0); g.restore();
    const slots = ['Kratzbaum?', 'Bällebad?', 'Rutsche?', 'Deine Idee?'];
    slots.forEach((s, i) => { const k = back(ramp(t, tw.schreib - .1 + i * .12, tw.schreib + .25 + i * .12)) * site; if (k <= .01) return; const y = 480 + i * 130; g.save(); g.translate(W / 2, y); g.scale(k, k);
      rrect(-420, -50, 840, 100, 30); fillStroke('#ffffff', 5); ell(-360, 0, 30, 30); g.fillStyle = '#d9d0c6'; g.fill(); text('?', -360, 2, 40, '#fff', null, 0);
      text(s, -305, 2, 44, '#3a3a40', null, 0, 'left'); const likes = Math.round(ease(t, tw.likes - .2, tw.gebaut2 + .3) * [12, 31, 7, 48][i]);
      icon('like', 330, 0, 26); text(String(likes), 385, 2, 40, '#3a3a40', null, 0); g.restore(); });
    text('Schreib es in die Kommentare', W / 2, 1050 + 0 * site, 54, '#fff', '#1a0f08', 12); }
  // end card
  const endK = ramp(t, tw.folg - .2, tw.folg + .3);
  if (endK > 0) {
    g.fillStyle = `rgba(40,22,60,${.92 * endK})`; g.fillRect(0, 0, W, H);
    if (endK > .3) {
      text('Folg mir und zieh', W / 2, 470, 88, '#fff', '#1a0f08', 16); text('als Kätzchen ein!', W / 2, 580, 88, '#ffd23f', '#1a0f08', 16);
      button(pop(t, tw.folg + .05, .35), t, 700);
      const tp = ramp(t, tw.folg + .35, tw.folg + .9); if (tp > 0 && tp < 1) { g.save(); g.globalAlpha = 1 - tp; g.lineWidth = 10; g.strokeStyle = '#fff'; g.beginPath(); g.arc(W / 2 + 160, 790, 30 + tp * 140, 0, 7); g.stroke(); g.restore(); }
      cat(W / 2, 1300 - Math.abs(Math.sin(t * 6)) * 24, 1.0, { mood: 'happy' }, t);
      for (let i = 0; i < 5; i++) { const k = pop(t, tw.neue + i * .1, .3); g.save(); g.globalAlpha = .55; cat(150 + i * 195, 1560, .38 * k, { c: '#6c6478', c2: '#8d859a', mood: 'neutral' }, t + i); g.restore(); if (k > .5) text('?', 150 + i * 195, 1490, 70, '#fff', '#1a0f08', 10); }
      chip(W / 2, 1680, 'TEIL 2', pop(t, tw.teil - .05, .3), '#ffd23f');
      counter(1, 1, 100, 'Kätzchen', 1820);
    }
  }
  // whoosh wipe into the house
  const wp = ramp(t, tw.aber1 - .1, tw.aber1 + .35); if (wp > 0 && wp < 1) { g.fillStyle = '#3b2416'; g.beginPath(); g.arc(W / 2, H / 2, (1 - Math.abs(wp * 2 - 1)) * 1300, 0, 7); g.fill(); }
  // captions: top normally, lower when the top is busy
  const capY = cta > .3 ? 1500 : site > .3 ? 300 : endK > .3 ? 1880 : 300;
  if (!(endK > .3)) caption(t, capY);
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => { frame(t); return out.toDataURL('image/jpeg', q); };
window.__done = true;
