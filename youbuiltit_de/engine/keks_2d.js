// ===================== 08 Keks — 2.5D "paper sticker" puppy, "Jeder Follower wird ein Welpe" =====================
// Different look from 07 Mimi: no dark outlines, soft gradient shading, white sticker border + drop shadow,
// parallax layers, pastel mint/lavender/peach palette, pill captions.  render_video.sh copies keks_2d.js -> keks.js

await document.fonts.load('700 96px Fredoka');
const W = 1080, H = 1920;
const WORDS = await (await fetch('../08_keks/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; const rr = (a, b) => a + (b - a) * rnd();

const tw = {
  wartet: T('wartet'), gartentor: T('Gartentor'), aber1: T('Aber'), niemand: T('niemand'),
  das1: T('Das'), keks1: T('Keks'), buerger: T('Bürgermeister'), naja: T('na'), von2: T('Von'), leeren: T('leeren'), hundepark: T('Hundepark'),
  komm: T('Komm'), hier1: T('Hier'), park: T('Park'), teich: T('Teich'), zaun: T('Zaun'),
  aber2: T('Aber', 2), hund: T('Hund'), spielen: T('Spielen'), toben: T('Toben'), schnueff: T('Schnüffeln'),
  und1: T('Und'), spiel: T('Spiel'),
  folgst: T('Folgst'), likest: T('Likest'), komment: T('Kommentierst'), teilst: T('Teilst'), marke: T('Hundemarke'),
  und2: T('Und', 2), rutsche: T('Rutsche'), knochen: T('Knochens'), plansch: T('Planschbecken'), tennis: T('Tennisbälle'),
  brunnen: T('Brunnen'), wuerst: T('Würstchen'), kuschel: T('Kuschelberg'), kissen: T('Kissen'), oder: T('Oder'),
  jeder: T('Jeder'), huette: T('Hundehütte'), namen: T('Namen'),
  stell: T('Stell'), hundert: T('Hundert'), wedeln: T('wedeln'),
  aber3: T('Aber', 3), nur: T('nur'), fangen: T('Fangen'),
  was: T('Was'), zuerst: T('zuerst'), schreib: T('Schreib'), likes: T('Likes', 2), gewinnen: T('gewinnen'),
  psst: T('psst'), zaun2: T('Zaun', 2), raschelt: T('raschelt'),
  folg: T('Folg', 2), neue: T('Neue'), teil: T('Teil', 2) };

// ---------- sound events ----------
const SFX = { end: END, music_gain: .15, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
SFX.beds.push([tw.hier1 - .2, tw.und1, 'wind', .35], [tw.psst - .1, tw.folg, 'rustle', .9]);
e(.2, 'whine', .8); for (let i = 0; i < 4; i++) e(.4 + i * .5, 'tick', .35); e(tw.niemand, 'boom', .45);
e(tw.das1 - .1, 'sparkle', .6); e(tw.keks1, 'bark', .8); e(tw.buerger, 'tada', .5); e(tw.naja, 'tick', .7); e(tw.naja + .35, 'tick', .7); e(tw.leeren, 'boing', .7);
e(tw.komm - .05, 'whoosh', .9); e(tw.park, 'pop', .7); e(tw.teich, 'splash', .7); e(tw.zaun, 'clack', .7);
e(tw.hund, 'buzz', .5); e(tw.spielen, 'pop', .5); e(tw.toben, 'pop', .5); e(tw.schnueff, 'sniff', .9);
e(tw.und1, 'whoosh', .6);
for (const k of ['folgst', 'likest', 'komment', 'teilst']) e(tw[k] - .05, 'pop', .9);
e(tw.folgst + .5, 'bark', .5); e(tw.likest + .4, 'heart', .6); e(tw.marke, 'sparkle', .9);
e(tw.und2, 'whoosh', .6); e(tw.rutsche, 'swoosh_up', .7); e(tw.knochen, 'boing', .7);
e(tw.plansch, 'splash', .8); for (let i = 0; i < 8; i++) e(tw.tennis + i * .08, 'tick', .45);
e(tw.brunnen, 'pop', .8); for (let i = 0; i < 5; i++) e(tw.wuerst + i * .14, 'boing', .3); e(tw.kuschel, 'pop', .8); e(tw.kissen, 'poof', .8); e(tw.oder, 'sparkle', .8);
e(tw.jeder, 'pop', 1); e(tw.huette, 'clack', .8); e(tw.namen, 'ding', .7); e(tw.namen + .3, 'bark', .6);
e(tw.stell, 'whoosh', .7); for (let i = 0; i < 24; i++) e(tw.hundert + i * .08, i % 4 ? 'pop' : 'bark', .3); e(tw.wedeln, 'tada', .8);
e(tw.aber3 - .1, 'whoosh', .8); e(tw.nur, 'boom', .5); e(tw.fangen - .2, 'boing', .5); e(tw.fangen + .2, 'boing', .5); e(tw.fangen + .6, 'whine', .6);
e(tw.was, 'ding', .7); e(tw.schreib, 'pop', .8); e(tw.schreib + .3, 'pop', .7); e(tw.likes, 'heart', .7);
e(tw.psst - .1, 'tick', .6); e(tw.raschelt + .2, 'boom', .6);
e(tw.folg - .05, 'pop', 1); e(tw.folg + .5, 'ding', .8); e(tw.teil, 'tada', .7); e(END - 1, 'bark', .7);
window.SFX = SFX;

// ---------- canvas ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out); const g = out.getContext('2d');
const INK = '#3b2b55';
const PAL = { sky0: '#c9b8ff', sky1: '#ffd9c7', hill: '#9fe0c4', hill2: '#7fd1b0', grass: '#b8ecc9', path: '#f6e3c8', fence: '#fff3e6', pond: '#8fd3ff', tree: '#6ccaa0', trunk: '#c79a7a', coral: '#ff7a8a', lav: '#a98bff', mint: '#5fd3a8', sun: '#ffe08a' };
function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ell(x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }
function shade(x, y, r, c0, c1) { const gr = g.createRadialGradient(x - r * .35, y - r * .45, r * .1, x, y, r * 1.25); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
function text(s, x, y, size, fill = '#fff', stroke = null, lw = 0, align = 'center') {
  g.font = `700 ${size}px Fredoka`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke && lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); }
function soft(fn, blur = 22, oy = 14, a = .22) { g.save(); g.shadowColor = `rgba(70,40,110,${a})`; g.shadowBlur = blur; g.shadowOffsetY = oy; fn(); g.restore(); }

// sticker: draw fn into an offscreen buffer, then white border + soft shadow + the art
const SB = document.createElement('canvas'); SB.width = 900; SB.height = 900; const sg = SB.getContext('2d');
const SW = document.createElement('canvas'); SW.width = 900; SW.height = 900; const swg = SW.getContext('2d');
function sticker(x, y, s, draw, border = 14) {
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, 900, 900); sg.setTransform(1, 0, 0, 1, 450, 700);
  const keep = g; gRef = sg; draw(); gRef = keep;
  swg.globalCompositeOperation = 'source-over'; swg.clearRect(0, 0, 900, 900); swg.drawImage(SB, 0, 0); swg.globalCompositeOperation = 'source-in'; swg.fillStyle = '#ffffff'; swg.fillRect(0, 0, 900, 900);
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-450, -700);
  g.save(); g.shadowColor = 'rgba(70,40,110,.28)'; g.shadowBlur = 28; g.shadowOffsetY = 18; g.drawImage(SW, 0, 0); g.restore();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.drawImage(SW, Math.cos(a) * border, Math.sin(a) * border); }
  g.drawImage(SB, 0, 0); g.restore();
}
let gRef = g;   // the puppy draws into gRef (main canvas or the sticker buffer)

// ---------- puppy ----------
// o: {c, c2 (muzzle), ear, mood 'sad'|'happy'|'neutral'|'wow'|'tired', blink, wag(speed), tongue, tear, hat, sash, tag, look, spin, sniff}
const DOGS = [['#f4dcb8', '#fff6ea', '#a8703f'], ['#ffffff', '#fff7f0', '#d9b08a'], ['#e0b07a', '#fff0dc', '#8a5530'], ['#d8d2de', '#ffffff', '#8f8799'], ['#fbe7d3', '#ffffff', '#f0a070'],
  ['#c88f5a', '#f6dcc0', '#6e4325'], ['#2f2b33', '#d9d3dd', '#1d1a20'], ['#f7d58a', '#fff4d6', '#c68a3a'], ['#e9e4dc', '#ffffff', '#b9a68e'], ['#f0c2a8', '#fff2ea', '#c27a5a']];
function puppy(o = {}, t = 0) {
  const c = gRef; const [b0, b1, ea] = [o.c || '#f4dcb8', o.c2 || '#fff6ea', o.ear || '#a8703f'];
  const dk = (hex, f) => { const n = parseInt(hex.slice(1), 16); return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`; };
  const sh = (x, y, r, col) => { const gr = c.createRadialGradient(x - r * .35, y - r * .45, r * .1, x, y, r * 1.3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, col); gr.addColorStop(1, dk(col, .78)); return gr; };
  const E = (x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); };
  const wag = Math.sin(t * (o.wag ?? 6)) * (o.mood === 'sad' ? .15 : .55);
  c.save(); c.rotate(o.spin || 0);
  // tail
  c.save(); c.translate(70, -110); c.rotate(-.9 + wag); E(0, -40, 18, 46); c.fillStyle = sh(0, -40, 40, b0); c.fill(); c.restore();
  // body
  E(0, -95, 98, 92); c.fillStyle = sh(0, -95, 98, b0); c.fill();
  E(0, -70, 56, 52); c.fillStyle = b1; c.globalAlpha = .9; c.fill(); c.globalAlpha = 1;
  for (const sx of [-1, 1]) { E(sx * 48, -12, 36, 24); c.fillStyle = sh(sx * 48, -12, 34, b1); c.fill(); c.fillStyle = dk(b1, .8); for (const d of [-12, 0, 12]) { E(sx * 48 + d, -2, 3, 6); c.fill(); } }
  // collar + tag
  c.fillStyle = o.tag ? '#ffc933' : PAL.coral; rrectC(c, -70, -178, 140, 22, 11); c.fill();
  if (o.tag) { E(0, -146, 20, 20); c.fillStyle = sh(0, -146, 20, '#ffd84a'); c.fill(); c.fillStyle = '#b7861a'; c.font = '700 22px Fredoka'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', 0, -145); }
  if (o.sash) { c.save(); c.rotate(-.5); c.fillStyle = '#7b6cff'; c.fillRect(-120, -140, 240, 34); c.fillStyle = '#fff'; c.font = '700 22px Fredoka'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BÜRGERMEISTER', 0, -122); c.restore(); }
  // head
  const hx = (o.look || 0) * 12, hy = -260 + (o.mood === 'sad' ? 10 : 0) + (o.sniff ? 60 * o.sniff : 0);
  c.save(); c.translate(hx, hy); c.rotate((o.tilt || 0) + Math.sin(t * 1.3) * .04);
  // ears (floppy, swing)
  const sw = Math.sin(t * 3) * .08 + (o.mood === 'sad' ? .25 : 0) - (o.mood === 'wow' ? .35 : 0);
  for (const sx of [-1, 1]) { c.save(); c.translate(sx * 92, -50); c.rotate(sx * (.35 + sw)); E(0, 70, 42, 96, 0); c.fillStyle = sh(0, 70, 90, ea); c.fill(); c.restore(); }
  E(0, 0, 122, 112); c.fillStyle = sh(0, 0, 122, b0); c.fill();
  // eye patch
  E(-46, -14, 44, 40, -.3); c.fillStyle = ea; c.globalAlpha = .55; c.fill(); c.globalAlpha = 1;
  E(0, 50, 70, 50); c.fillStyle = sh(0, 50, 70, b1); c.fill();
  // cheeks
  c.globalAlpha = .45; for (const sx of [-1, 1]) { E(sx * 82, 40, 22, 13); c.fillStyle = '#ff8fa8'; c.fill(); } c.globalAlpha = 1;
  // eyes
  const blink = o.blink ?? (Math.sin(t * 1.7 + 1) > .985 ? 1 : 0);
  for (const sx of [-1, 1]) {
    const ex = sx * 46 + (o.look || 0) * 6, ey = -8;
    if (o.mood === 'happy' && !o.open) { c.lineWidth = 9; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey + 12, 20, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); continue; }
    if (blink > .5 || o.closed) { c.lineWidth = 8; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 18, ey + 4); c.quadraticCurveTo(ex, ey + 14, ex + 18, ey + 4); c.stroke(); continue; }
    const big = o.mood === 'wow' ? 1.2 : 1;
    E(ex, ey, 24 * big, 28 * big); c.fillStyle = INK; c.fill();
    E(ex + 7, ey - 10, 9 * big, 10 * big); c.fillStyle = '#fff'; c.fill(); E(ex - 8, ey + 10, 4 * big, 4 * big); c.fill();
    if (o.mood === 'sad' || o.mood === 'tired') { c.lineWidth = 7; c.strokeStyle = dk(ea, .8); c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 20 * sx, ey - 44); c.lineTo(ex + 14 * sx, ey - 36); c.stroke();
      c.globalAlpha = .55; E(ex, ey + 24, 20, 6); c.fillStyle = '#aee0ff'; c.fill(); c.globalAlpha = 1; }
  }
  // nose
  E(0, 26, 22, 15); const ng = c.createRadialGradient(-6, 20, 2, 0, 26, 22); ng.addColorStop(0, '#7a6a8a'); ng.addColorStop(1, '#2a1f33'); c.fillStyle = ng; c.fill(); E(-6, 21, 6, 3.5); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill();
  // mouth / tongue
  c.lineWidth = 6; c.strokeStyle = INK; c.lineCap = 'round';
  if (o.mood === 'sad') { c.beginPath(); c.moveTo(-16, 66); c.quadraticCurveTo(0, 54, 16, 66); c.stroke(); }
  else { c.beginPath(); c.moveTo(0, 40); c.quadraticCurveTo(-10, 58, -24, 52); c.moveTo(0, 40); c.quadraticCurveTo(10, 58, 24, 52); c.stroke();
    if (o.tongue ?? (o.mood === 'happy' || o.mood === 'wow')) { const tl = 1 + Math.sin(t * 10) * .1; E(0, 70 * tl, 15, 22 * tl); c.fillStyle = '#ff8aa0'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#e0607a'; c.beginPath(); c.moveTo(0, 56); c.lineTo(0, 78); c.stroke(); } }
  if (o.bark) { E(0, 62, 18, 10 + o.bark * 12); c.fillStyle = '#7a1d3c'; c.fill(); }
  if (o.tear) { const ph = (t * .9) % 1; E(-46, 22 + ph * 70, 8, 12); c.fillStyle = `rgba(130,200,255,${(1 - ph) * o.tear})`; c.fill(); }
  // top hat
  if (o.hat) { c.save(); c.translate(30, -112 + (o.hatDrop || 0)); c.rotate(.15 + (o.hatTilt || 0)); c.scale(o.hat, o.hat);
    rrectC(c, -62, -6, 124, 18, 9); c.fillStyle = '#4a3a6e'; c.fill(); rrectC(c, -40, -92, 80, 90, 12); c.fillStyle = sh(0, -50, 60, '#5a4a80'); c.fill(); c.fillStyle = PAL.coral; c.fillRect(-40, -26, 80, 14); c.restore(); }
  c.restore(); c.restore();
}
function rrectC(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function dog(x, y, s, o, t, stick = true) {
  if (stick) sticker(x, y, s, () => puppy(o, t), 13);
  else { g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = 1; soft(() => {}, 0); gRef = g; puppy(o, t); g.restore(); }
  if (o.label) { const [txt, col] = o.label; g.font = '700 40px Fredoka'; const w = g.measureText(txt).width + 44; soft(() => { rrect(x - w / 2, y + 16, w, 60, 30); g.fillStyle = col || '#fff'; g.fill(); }); text(txt, x, y + 47, 40, INK); }
}

// ---------- world (parallax) ----------
seed = 3; const TREES = []; for (let i = 0; i < 14; i++) TREES.push({ x: i * 230 + rr(-40, 40) - 400, y: rr(1060, 1140), r: rr(90, 140), c: rnd() < .5 ? '#6ccaa0' : '#86d8b0' });
const CLOUDS = []; for (let i = 0; i < 7; i++) CLOUDS.push({ x: rr(-200, 2200), y: rr(200, 700), s: rr(.7, 1.3) });
function sky(t, mode = 0) {
  const gr = g.createLinearGradient(0, 0, 0, 1300);
  if (mode === 1) { gr.addColorStop(0, '#2d2a6e'); gr.addColorStop(1, '#7c6ab8'); } else { gr.addColorStop(0, PAL.sky0); gr.addColorStop(1, PAL.sky1); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function cloud(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); soft(() => { g.fillStyle = 'rgba(255,255,255,.92)'; for (const [dx, dy, r] of [[-70, 10, 50], [-20, -20, 64], [40, 0, 56], [90, 16, 40]]) { ell(dx, dy, r, r * .85); g.fill(); } }, 16, 8, .12); g.restore(); }
function park(t, cam, opts = {}) {
  sky(t, opts.night ? 1 : 0);
  if (opts.night) { g.fillStyle = '#fff6cf'; ell(820, 380, 60, 60); g.fill(); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect((i * 137) % W, (i * 89) % 800, 3, 3); } }
  else { soft(() => { ell(800, 420, 90, 90); g.fillStyle = PAL.sun; g.fill(); }, 40, 0, .25); }
  CLOUDS.forEach(c => cloud(((c.x - cam * .15 + t * 12) % 2400 + 2400) % 2400 - 300, c.y, c.s));
  // far hills
  for (const [k, col, yy] of [[.3, '#b6e8d2', 1050], [.5, PAL.hill, 1120]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, yy - 90 * Math.sin((x + cam * k) * .004) - 40 * Math.sin((x + cam * k) * .011)); g.lineTo(W, H); g.fill(); }
  // trees
  TREES.forEach(tr => { const x = tr.x - cam * .7; if (x < -200 || x > W + 200) return;
    g.fillStyle = PAL.trunk; rrect(x - 14, tr.y - 40, 28, 140, 12); g.fill();
    soft(() => { ell(x, tr.y - 90, tr.r, tr.r * 1.05); g.fillStyle = shade(x, tr.y - 90, tr.r, '#c9f5dc', tr.c); g.fill(); }, 18, 10, .18); });
  // ground
  const gg = g.createLinearGradient(0, 1200, 0, H); gg.addColorStop(0, PAL.grass); gg.addColorStop(1, '#9fdfb6'); g.fillStyle = gg; g.fillRect(0, 1200, W, H - 1200);
  // pond (world x 1500)
  const px = 1500 - cam; if (px > -500 && px < W + 500) { soft(() => { ell(px, 1330, 300, 70); g.fillStyle = shade(px, 1330, 300, '#d6f3ff', PAL.pond); g.fill(); }, 10, 6, .15);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(px - 60 + i * 60, 1330, 40 + ((t * 30 + i * 20) % 40), 8, 0, 0, Math.PI * 2); g.stroke(); } }
  // path
  g.fillStyle = PAL.path; g.beginPath(); g.moveTo(W / 2 - 80 - cam * .2, 1240); g.lineTo(W / 2 + 80 - cam * .2, 1240); g.lineTo(W / 2 + 420 - cam, H); g.lineTo(W / 2 - 420 - cam, H); g.fill();
  // fence (front layer) with gate at world x 540
  for (let i = -6; i < 30; i++) { const x = i * 110 - cam * 1.15 + 20; if (x < -80 || x > W + 80) continue; if (Math.abs(i * 110 + 20 - 540) < 120) continue;
    soft(() => { g.fillStyle = PAL.fence; g.beginPath(); g.moveTo(x - 30, 1560); g.lineTo(x - 30, 1330); g.lineTo(x, 1295); g.lineTo(x + 30, 1330); g.lineTo(x + 30, 1560); g.fill(); }, 14, 8, .18); }
  const rx = -cam * 1.15; g.fillStyle = PAL.fence; g.fillRect(rx - 700, 1380, 1080 + 2600, 26); g.fillRect(rx - 700, 1480, 1080 + 2600, 26);
  if (opts.gate !== undefined) { const gx = 540 - cam * 1.15; g.save(); g.translate(gx - 110, 1300); g.scale(1 - opts.gate * .8, 1);
    soft(() => { g.fillStyle = '#ffe9cf'; for (let i = 0; i < 4; i++) { rrect(i * 58, 0, 46, 270, 16); g.fill(); } g.fillRect(0, 70, 220, 24); g.fillRect(0, 190, 220, 24); }, 14, 8, .2); g.restore(); }
}

// ---------- props ----------
function boneSlide(x, y, k) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  soft(() => { g.fillStyle = '#c7b8ff'; rrect(-170, -560, 34, 560, 14); g.fill(); rrect(-80, -560, 34, 560, 14); g.fill(); }, 14, 8, .2);
  g.fillStyle = '#e4dcff'; for (let i = 0; i < 6; i++) rrect(-150, -520 + i * 90, 90, 16, 8), g.fill();
  soft(() => { g.lineCap = 'round'; g.strokeStyle = '#fff6ea'; g.lineWidth = 80; g.beginPath(); g.moveTo(-60, -560); g.bezierCurveTo(140, -520, 120, -120, 300, -60); g.stroke();
    for (const [bx, by] of [[-60, -560], [300, -60]]) { g.fillStyle = '#fff6ea'; ell(bx - 34, by - 30, 44, 44); g.fill(); ell(bx + 34, by + 30, 44, 44); g.fill(); ell(bx + 30, by - 34, 44, 44); g.fill(); ell(bx - 30, by + 34, 44, 44); g.fill(); } }, 22, 12, .25);
  g.strokeStyle = 'rgba(200,170,140,.4)'; g.lineWidth = 6; g.beginPath(); g.moveTo(-40, -540); g.bezierCurveTo(150, -500, 130, -110, 290, -48); g.stroke(); g.restore(); }
function pool(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  soft(() => { ell(0, -40, 230, 80); g.fillStyle = shade(0, -40, 230, '#ffc2cf', '#ff8fa8'); g.fill(); }, 20, 10, .22); ell(0, -56, 200, 56); g.fillStyle = '#9fe3ff'; g.fill();
  for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 30 + (i * 37) % 160; const bx = Math.cos(a) * r, by = -56 + Math.sin(a) * r * .28 - Math.abs(Math.sin(t * 3 + i)) * 6;
    ell(bx, by, 22, 22); g.fillStyle = shade(bx, by, 22, '#f6ffb0', '#cfe84a'); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(bx - 8, by, 16, -.9, .9); g.stroke(); } g.restore(); }
function fountain(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  soft(() => { ell(0, -30, 180, 50); g.fillStyle = shade(0, -30, 180, '#f1ecff', '#c9bdf0'); g.fill(); rrect(-30, -260, 60, 230, 24); g.fillStyle = '#e4dcff'; g.fill(); ell(0, -260, 90, 26); g.fillStyle = '#d8ceff'; g.fill(); }, 18, 10, .2);
  for (let i = 0; i < 7; i++) { const ph = (t * .9 + i / 7) % 1, dir = i % 2 ? 1 : -1; const sx = dir * ph * 200, sy = -280 - Math.sin(ph * Math.PI) * 220 + ph * 200;
    g.save(); g.translate(sx, sy); g.rotate(ph * 6 * dir); soft(() => { rrect(-34, -13, 68, 26, 13); g.fillStyle = '#e8875a'; g.fill(); }, 8, 4, .2); g.restore(); } g.restore(); }
function pillows(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); const cols = ['#ffb3c7', '#b9a6ff', '#9fe0c4', '#ffe08a', '#a8dcff'];
  let i = 0; for (let row = 0; row < 5; row++) for (let j = 0; j < 5 - row; j++) { const px = (j - (4 - row) / 2) * 100, py = -40 - row * 64; const c = cols[i++ % 5];
    soft(() => { rrect(px - 54, py - 34, 108, 68, 30); g.fillStyle = shade(px, py, 60, '#ffffff', c); g.fill(); }, 12, 6, .18); } g.restore(); }
function mystery(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.globalAlpha = k; g.setLineDash([24, 18]); g.lineWidth = 10; g.strokeStyle = PAL.lav; g.beginPath(); g.arc(0, -180, 170, 0, 7); g.stroke(); g.setLineDash([]);
  text('?', 0, -180, 240 * k, PAL.lav); for (let i = 0; i < 8; i++) { const a = i / 8 * 7 + t; spark(Math.cos(a) * 220, -180 + Math.sin(a) * 210, 16); } g.restore(); }
function spark(x, y, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, q = i % 2 ? r * .4 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fillStyle = '#fff6b0'; g.fill(); }
function doghouse(x, y, s, name, col = '#ffb3c7') { g.save(); g.translate(x, y); g.scale(s, s);
  soft(() => { g.fillStyle = shade(0, -120, 160, '#ffffff', col); rrect(-130, -230, 260, 230, 24); g.fill(); g.fillStyle = '#9b8cff'; g.beginPath(); g.moveTo(-160, -210); g.lineTo(0, -340); g.lineTo(160, -210); g.closePath(); g.fill(); }, 20, 10, .22);
  g.fillStyle = '#5a4a7a'; g.beginPath(); g.arc(0, -70, 70, Math.PI, 0); g.lineTo(70, 0); g.lineTo(-70, 0); g.fill();
  if (name) { soft(() => { rrect(-120, -300, 240, 56, 18); g.fillStyle = '#fff'; g.fill(); }, 8, 4, .2); text(name, 0, -271, 34, INK); } g.restore(); }
function ghostDog(x, y, k) { if (k <= 0) return; g.save(); g.globalAlpha = .55 * k; g.translate(x, y); g.scale(.5, .5); g.setLineDash([18, 14]); g.lineWidth = 10; g.strokeStyle = '#fff';
  g.beginPath(); g.ellipse(0, -95, 98, 92, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(0, -260, 122, 112, 0, 0, 7); g.stroke(); g.restore(); g.globalAlpha = k; text('?', x, y - 130, 90, '#fff'); g.globalAlpha = 1; }
function bush(x, y, s, shake) { g.save(); g.translate(x + Math.sin(shake * 40) * 8 * shake, y); g.scale(s, s); for (const [dx, dy, r] of [[-90, 0, 90], [0, -40, 110], [100, 0, 90]]) { soft(() => { ell(dx, dy, r, r * .9); g.fillStyle = shade(dx, dy, r, '#9ff0c4', '#3fb487'); g.fill(); }, 16, 8, .2); } g.restore(); }
function leaf(x, y, r) { g.save(); g.translate(x, y); g.rotate(r); ell(0, 0, 18, 8); g.fillStyle = '#5fd3a8'; g.fill(); g.restore(); }

// ---------- UI ----------
function icon(kind, cx, cy, r) {
  g.save(); g.translate(cx, cy); const col = { follow: PAL.coral, like: '#ff5c8a', comment: '#7b6cff', share: '#ffb648' }[kind];
  ell(0, 0, r, r); g.fillStyle = shade(0, 0, r, '#ffffff', col); g.fill(); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = r * .22; g.lineCap = 'round';
  if (kind === 'follow') { g.beginPath(); g.moveTo(-r * .45, 0); g.lineTo(r * .45, 0); g.moveTo(0, -r * .45); g.lineTo(0, r * .45); g.stroke(); }
  if (kind === 'like') { const s = r * .5; g.beginPath(); g.moveTo(0, s * .9); g.bezierCurveTo(-s * 1.6, -s * .2, -s * .7, -s * 1.3, 0, -s * .45); g.bezierCurveTo(s * .7, -s * 1.3, s * 1.6, -s * .2, 0, s * .9); g.fill(); }
  if (kind === 'comment') { rrect(-r * .5, -r * .42, r, r * .7, r * .2); g.fill(); g.beginPath(); g.moveTo(-r * .2, r * .25); g.lineTo(-r * .35, r * .55); g.lineTo(0, r * .25); g.fill(); }
  if (kind === 'share') { g.beginPath(); g.moveTo(-r * .45, r * .35); g.quadraticCurveTo(-r * .3, -r * .2, r * .2, -r * .2); g.stroke(); g.beginPath(); g.moveTo(r * .05, -r * .5); g.lineTo(r * .5, -r * .2); g.lineTo(r * .05, r * .1); g.fill(); }
  g.restore(); }
const CARDCOL = { follow: '#ffe1e6', like: '#ffe6f0', comment: '#ebe6ff', share: '#fff1d9' };
function card(k, y, kind, title, sub, active, t, rot) {
  if (k <= .01) return; const w = 880, h = 170; g.save(); g.translate(W / 2 + (1 - k) * 1200, y + h / 2); g.rotate(rot + (active ? Math.sin(t * 8) * .01 : 0)); if (active) g.scale(1.05, 1.05);
  soft(() => { rrect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24, 52); g.fillStyle = '#fff'; g.fill(); }, 24, 14, .25);
  rrect(-w / 2, -h / 2, w, h, 44); g.fillStyle = CARDCOL[kind]; g.fill();
  icon(kind, -w / 2 + 95, 0, 58); text(title, -w / 2 + 185, -26, 60, INK, null, 0, 'left'); text(sub, -w / 2 + 185, 36, 40, '#7a6a90', null, 0, 'left');
  g.restore(); }
function meter(k, n, total, label, y) {
  if (k <= .01) return; g.save(); g.globalAlpha = cl(k * 1.4); const yy = y + (1 - k) * 200, x = 120, w = W - 240;
  soft(() => { rrect(x - 30, yy - 80, w + 60, 170, 56); g.fillStyle = '#fff'; g.fill(); }, 24, 12, .22);
  text(`${Math.round(n)} / ${total} ${label}`, W / 2, yy - 32, 46, INK);
  rrect(x, yy, w, 52, 26); g.fillStyle = '#efe9ff'; g.fill(); const f = cl(n / total);
  if (f > 0) { rrect(x, yy, Math.max(52, w * f), 52, 26); const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, f > .99 ? '#5fd3a8' : '#ff9aa8'); gr.addColorStop(1, f > .99 ? '#a6f0c8' : '#ffc38a'); g.fillStyle = gr; g.fill();
    for (let i = 0; i < 6; i++) { const px = x + 30 + i * (w - 60) / 5; if (px < x + w * f) { g.fillStyle = 'rgba(255,255,255,.7)'; ell(px, yy + 26, 9, 7); g.fill(); } } }
  g.restore(); }
function pill(x, y, txt, k, bg = '#fff', fg = INK, size = 42) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k); g.font = `700 ${size}px Fredoka`; const w = g.measureText(txt).width + 56;
  soft(() => { rrect(-w / 2, -size * .8, w, size * 1.6, size * .8); g.fillStyle = bg; g.fill(); }, 16, 8, .22); text(txt, 0, 2, size, fg); g.restore(); }
function button(k, t, y) { if (k <= .01) return; const w = 620, h = 156; const p = 1 + .05 * Math.sin(t * 9);
  g.save(); g.translate(W / 2, y + h / 2); g.scale(k * p, k * p); soft(() => { rrect(-w / 2, -h / 2, w, h, 78); const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#ff9aa8'); gr.addColorStop(1, '#ff5c7a'); g.fillStyle = gr; g.fill(); }, 26, 14, .3);
  text('+ Folgen', 0, 4, 80, '#fff'); g.restore(); }

// ---------- captions: phrase in a white pill, current word in a coral pill ----------
const PHR = []; { let cur = []; WORDS.forEach((w, i) => { cur.push(i); if (/[.,!?]$/.test(w[0]) || cur.length >= 3) { PHR.push(cur); cur = []; } }); if (cur.length) PHR.push(cur); }
const SHOW = { Hundert: '100', tausend: '1000', zwei: '2' };
function caption(t, y) {
  let wi = -1; for (let i = 0; i < WORDS.length; i++) if (WORDS[i][1] <= t + .02) wi = i; if (wi < 0 || t > WORDS[wi][2] + .6) return;
  const ph = PHR.find(p => p.includes(wi)); if (!ph) return;
  const ws = ph.map(i => SHOW[clean(WORDS[i][0])] || WORDS[i][0].replace(/[,]$/, ''));
  let fs = 80; g.font = `700 ${fs}px Fredoka`; const sp = 30; const tot = () => ws.reduce((a, w) => a + g.measureText(w).width, 0) + sp * (ws.length - 1);
  while (tot() > W - 180) { fs -= 4; g.font = `700 ${fs}px Fredoka`; }
  const T0 = tot(); soft(() => { rrect(W / 2 - T0 / 2 - 44, y - fs * .85, T0 + 88, fs * 1.7, fs * .85); g.fillStyle = 'rgba(255,255,255,.96)'; g.fill(); }, 20, 10, .22);
  let x = W / 2 - T0 / 2;
  ph.forEach((i, j) => { const w = ws[j]; g.font = `700 ${fs}px Fredoka`; const mw = g.measureText(w).width;
    if (i === wi) { const k = pop(t, WORDS[i][1], .18); g.save(); g.translate(x + mw / 2, y); g.rotate(-.03); g.scale(1 + .08 * k, 1 + .08 * k); rrect(-mw / 2 - 16, -fs * .62, mw + 32, fs * 1.24, fs * .5); g.fillStyle = PAL.coral; g.fill(); text(w, 0, 3, fs, '#fff'); g.restore(); }
    else text(w, x + mw / 2, y + 3, fs, i < wi ? INK : 'rgba(59,43,85,.28)');
    x += mw + sp; });
}

// ---------- crowd ----------
seed = 9; const CROWD = []; for (let i = 0; i < 100; i++) CROWD.push({ x: rr(70, W - 70), y: rr(1400, 1890), s: rr(.34, .46), d: DOGS[i % DOGS.length], ph: rr(0, 6) });
CROWD.sort((a, b) => a.y - b.y);

// ---------- frame ----------
function frame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); gRef = g;
  // S1: waiting at the garden gate, days pass
  if (t < tw.das1) {
    const day = (t * .9) % 1, nightK = Math.max(0, Math.sin(day * Math.PI * 2 - .5));
    const gr = g.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, `rgb(${lerp(201, 45, nightK)},${lerp(184, 42, nightK)},${lerp(255, 110, nightK)})`); gr.addColorStop(1, `rgb(${lerp(255, 124, nightK)},${lerp(217, 106, nightK)},${lerp(199, 184, nightK)})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const a = day * Math.PI * 2; soft(() => { ell(540 + Math.cos(a - Math.PI / 2) * 520, 900 + Math.sin(a - Math.PI / 2) * 520, 70, 70); g.fillStyle = nightK > .5 ? '#fff6cf' : PAL.sun; g.fill(); }, 30, 0, .2);
    g.fillStyle = PAL.hill; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 1150 - 60 * Math.sin(x * .005)); g.lineTo(W, H); g.fill();
    g.fillStyle = PAL.grass; g.fillRect(0, 1250, W, H); g.fillStyle = PAL.path; g.beginPath(); g.moveTo(480, 1250); g.lineTo(600, 1250); g.lineTo(900, H); g.lineTo(180, H); g.fill();
    const z = 1 + ease(t, 0, tw.das1) * .1; g.save(); g.translate(W / 2, 1500); g.scale(z, z); g.translate(-W / 2, -1500);
    dog(540, 1560, 1.25, { mood: 'sad', tear: ramp(t, tw.niemand - .4, tw.niemand), look: Math.sin(t * .8) * .6, wag: 1.5 }, t);
    // gate in front
    soft(() => { g.fillStyle = '#ffe9cf'; for (let i = 0; i < 9; i++) { const x = 70 + i * 110; g.beginPath(); g.moveTo(x - 32, 1800); g.lineTo(x - 32, 1560); g.lineTo(x, 1520); g.lineTo(x + 32, 1560); g.lineTo(x + 32, 1800); g.fill(); } g.fillRect(0, 1600, W, 26); g.fillRect(0, 1710, W, 26); }, 14, 8, .2);
    g.restore();
    // a lonely leaf on "niemand kommt"
    const lf = ramp(t, tw.aber1, tw.das1); if (lf > 0) leaf(lerp(-40, 1120, lf), 1350 - Math.sin(lf * 9) * 40, lf * 12);
    pill(W / 2, 1830, `Tag ${1 + Math.floor(t * .9)}`, 1, '#fff', INK, 44);
    caption(t, 300); return;
  }
  // S2: mayor of nothing
  if (t < tw.komm - .05) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffd9e6'); gr.addColorStop(1, '#d9ccff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) { const ph = (t * .2 + i / 24) % 1; g.save(); g.translate((i * 173) % W, ph * H); g.rotate(t * 2 + i); g.fillStyle = ['#ff9aa8', '#a98bff', '#5fd3a8', '#ffe08a'][i % 4]; g.fillRect(-10, -5, 20, 10); g.restore(); }
    const awk = win(t, tw.naja - .1, tw.von2, .1), k = pop(t, tw.das1 - .1, .4);
    dog(540, 1480, 1.5 * k, { mood: t > tw.von2 ? 'sad' : awk > .5 ? 'neutral' : 'happy', hat: pop(t, tw.buerger - .15, .3), hatDrop: t > tw.leeren ? 60 * ease(t, tw.leeren, tw.hundepark) : 0, hatTilt: t > tw.leeren ? .8 * ease(t, tw.leeren, tw.hundepark) : 0, sash: t > tw.buerger - .1, look: awk > .5 ? -.8 : 0, wag: t > tw.von2 ? 1 : 8 }, t);
    pill(540, 1590, 'Keks', pop(t, tw.keks1 - .1, .3), '#fff', INK, 48);
    pill(540, 1700, 'Hunde im Park: 1', pop(t, tw.hundepark - .1, .3), '#ffe08a', INK, 44);
    if (awk > .1) { g.save(); g.globalAlpha = awk; pill(840, 820, '...', 1, '#fff', INK, 70); g.restore(); }
    caption(t, 300); return;
  }
  // S3+: the park (camera pans)
  let cam = 0;
  cam = lerp(0, 900, ease(t, tw.hier1, tw.zaun + .3)); cam = lerp(cam, 300, ease(t, tw.aber2 - .1, tw.aber2 + .5));
  const night = win(t, tw.psst - .3, tw.folg - .1, .3) > .5;
  park(t, cam, { gate: ease(t, tw.komm, tw.komm + .6), night });
  // labels for park / pond / fence
  pill(540, 1000, 'Park', win(t, tw.park - .05, tw.teich, .15), '#fff', INK, 50);
  pill(1500 - cam, 1180, 'Teich', win(t, tw.teich - .05, tw.zaun + .2, .15), '#fff', INK, 50);
  pill(700, 1250, 'Zaun', win(t, tw.zaun - .05, tw.aber2, .15), '#fff', INK, 50);
  // empty: ghost dogs
  if (t > tw.aber2 && t < tw.und1) { ghostDog(250, 1700, pop(t, tw.spielen - .1, .3)); ghostDog(540, 1640, pop(t, tw.toben - .1, .3)); ghostDog(830, 1720, pop(t, tw.schnueff - .2, .3)); }
  // ideas
  const ideas = t > tw.und2 && !(t > tw.aber3 - .1 && t < tw.was + .1) && t < tw.psst - .1;
  if (ideas) {
    boneSlide(220, 1500, pop(t, tw.rutsche - .1, .4));
    fountain(860, 1440, pop(t, tw.brunnen - .1, .35), t);
    if (!(t > tw.jeder - .1 && t < tw.aber3)) { pool(400, 1860, pop(t, tw.plansch - .1, .35), t); pillows(880, 1880, pop(t, tw.kuschel - .1, .35), t); }
    if (t < tw.jeder) mystery(540, 1200, pop(t, tw.oder - .1, .35), t);
  }
  // Keks in the park
  let kx = 540, ky = 1780, ks = 1.15, mood = 'neutral', extra = {};
  if (t > tw.aber2) { mood = 'sad'; kx = lerp(540, 760, ease(t, tw.schnueff - .4, tw.schnueff + .3)); extra.sniff = win(t, tw.schnueff - .1, tw.und1, .2); }
  if (t > tw.und2) { mood = 'wow'; kx = 620; ky = 1820; ks = .95; }
  if (t > tw.jeder - .1) { mood = 'happy'; }
  if (t > tw.aber3 - .1) { mood = 'neutral'; kx = 540; ky = 1760; ks = 1.25; }
  if (t > tw.fangen - .35 && t < tw.was) { extra.spin = (t - tw.fangen + .35) * 9 * (1 - ease(t, tw.fangen + .5, tw.fangen + .9)); mood = t > tw.fangen + .6 ? 'tired' : 'wow'; }
  if (t > tw.was) { mood = 'neutral'; kx = 300; }
  if (t > tw.psst - .2) { mood = 'wow'; kx = 300; ks = 1.1; extra.look = .8; }
  const hop = (t > tw.jeder && t < tw.stell) ? Math.abs(Math.sin(t * 7)) * 26 : 0;
  const hideK = (t > tw.und1 - .05 && t < tw.und2 + .05) || (t > tw.stell - .1 && t < tw.aber3 - .1) || (t > tw.jeder - .1 && t < tw.stell);
  if (!hideK) dog(kx, ky - hop, ks, { mood, wag: mood === 'happy' || mood === 'wow' ? 12 : 3, ...extra }, t);
  // you join: second puppy + doghouse with name
  if (t > tw.jeder - .1 && t < tw.stell) {
    doghouse(860, 1720, .9 * pop(t, tw.huette - .1, .35), t > tw.namen - .1 ? '@deinname' : '');
    dog(250, 1820 - Math.abs(Math.sin(t * 7)) * 24, .9, { mood: 'happy', wag: 14 }, t);
    const k = pop(t, tw.jeder - .05, .4); dog(560, 1820 - Math.abs(Math.sin(t * 7 + 1)) * 24, .9 * k, { mood: 'happy', c: '#d8d2de', c2: '#ffffff', ear: '#8f8799', wag: 14, label: k > .9 ? ['DU', '#ffe08a'] : null }, t + 1.3);
  }
  // 100 puppies wagging
  const crowdK = ramp(t, tw.hundert - .1, tw.wedeln + .2);
  if (t > tw.stell - .1 && t < tw.aber3 - .1) {
    const n = Math.round(100 * crowdK);
    for (let i = 0; i < n; i++) { const c = CROWD[i]; g.save(); g.translate(c.x, c.y - Math.abs(Math.sin(t * 6 + c.ph)) * 14); const s = c.s * pop(t, tw.hundert - .1 + i * .018, .25); g.scale(s, s); gRef = g;
      puppy({ c: c.d[0], c2: c.d[1], ear: c.d[2], mood: i % 3 ? 'happy' : 'wow', wag: 22 }, t + c.ph); g.restore(); }
    if (crowdK > .4) dog(540, 1640, .8, { mood: 'happy', hat: 1, sash: true, wag: 20 }, t);
  }
  // "...rustles behind the fence"
  if (t > tw.psst - .2 && t < tw.folg + .3) {
    const sh = win(t, tw.raschelt - .2, tw.folg, .1) * (.6 + .4 * Math.sin(t * 25));
    bush(760, 1290, 1.3, sh); for (let i = 0; i < 8; i++) { const ph = (t * .8 + i / 8) % 1; if (t > tw.raschelt) leaf(660 + i * 30 + ph * 40, 1200 + ph * 300, ph * 9 + i); }
    const ey = ease(t, tw.raschelt, tw.raschelt + .4); for (const sx of [-1, 1]) { g.save(); g.shadowColor = '#fff6a0'; g.shadowBlur = 30; ell(760 + sx * 40, 1270, 16 * ey, 10 * ey); g.fillStyle = '#fff6a0'; g.fill(); g.restore(); }
    pill(960, 1060, '?', pop(t, tw.raschelt + .1, .3), '#fff', INK, 80);
  }

  // ---- overlays ----
  const cta = win(t, tw.und1 - .1, tw.und2 + .1, .3);
  if (cta > .01) {
    g.fillStyle = `rgba(201,184,255,${.82 * cta})`; g.fillRect(0, 0, W, H);
    pill(W / 2, 440, 'So machst du mit', cta, '#fff', INK, 64);
    const rows = [['folgst', 'follow', 'FOLGEN', 'Du wirst ein Welpe', -.03], ['likest', 'like', 'LIKEN', 'Du stimmst ab', .025], ['komment', 'comment', 'KOMMENTIEREN', 'Deine Idee wird gebaut', -.02], ['teilst', 'share', 'TEILEN', 'Goldene Hundemarke', .03]];
    const nxt = ['likest', 'komment', 'teilst', 'und2'];
    rows.forEach(([k, kind, ti, su, rot], i) => card(back(ramp(t, tw[k] - .1, tw[k] + .3)) * cta, 560 + i * 205, kind, ti, su, t > tw[k] && t < tw[nxt[i]], t, rot));
    dog(540, 1800 - Math.abs(Math.sin(t * 5)) * 18, .75, { mood: 'happy', tag: t > tw.marke - .1, wag: 14 }, t);
  }
  meter(win(t, tw.jeder - .1, tw.stell, .3), 2, 100, 'Welpen', 1180);
  meter(win(t, tw.stell, tw.aber3 - .1, .3), crowdK * 100, 100, 'Welpen', 1180);
  meter(win(t, tw.aber3 - .1, tw.was, .3), 1, 100, 'Welpen', 1180);
  const site = win(t, tw.was - .1, tw.psst - .1, .3);
  if (site > .01) {
    g.save(); g.translate(780, 1560); g.scale(site, site); soft(() => { g.fillStyle = '#c79a7a'; rrect(-14, -20, 28, 300, 12); g.fill(); rrect(-200, -150, 400, 150, 36); g.fillStyle = '#fff1d9'; g.fill(); }, 16, 8, .22);
    text('BAUSTELLE', 0, -96, 54, INK); text('???', 0, -44, 46, PAL.coral); g.restore();
    const slots = ['Knochenrutsche?', 'Würstchenbrunnen?', 'Kuschelberg?', 'Deine Idee?'];
    slots.forEach((s, i) => { const k = back(ramp(t, tw.schreib - .1 + i * .12, tw.schreib + .25 + i * .12)) * site; if (k <= .01) return; const y = 520 + i * 140;
      g.save(); g.translate(W / 2, y); g.scale(k, k); g.rotate(i % 2 ? .012 : -.012); soft(() => { rrect(-430, -54, 860, 108, 54); g.fillStyle = '#fff'; g.fill(); }, 16, 8, .2);
      ell(-370, 0, 32, 32); g.fillStyle = '#efe9ff'; g.fill(); text('?', -370, 2, 40, PAL.lav); text(s, -318, 2, 44, INK, null, 0, 'left');
      const likes = Math.round(ease(t, tw.likes - .2, tw.gewinnen + .3) * [24, 57, 13, 41][i]); icon('like', 300, 0, 28); text(String(likes), 365, 2, 42, INK); g.restore(); });
  }
  const endK = ramp(t, tw.folg - .2, tw.folg + .3);
  if (endK > 0) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffd9e6'); gr.addColorStop(1, '#c9b8ff'); g.globalAlpha = endK; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    if (endK > .3) {
      pill(W / 2, 400, 'Folg mir und zieh', 1, '#fff', INK, 74); pill(W / 2, 540, 'als Welpe ein!', 1, PAL.coral, '#fff', 74);
      button(pop(t, tw.folg + .05, .35), t, 650);
      const tp = ramp(t, tw.folg + .35, tw.folg + .9); if (tp > 0 && tp < 1) { g.save(); g.globalAlpha = 1 - tp; g.lineWidth = 10; g.strokeStyle = '#fff'; g.beginPath(); g.arc(W / 2 + 170, 728, 30 + tp * 140, 0, 7); g.stroke(); g.restore(); }
      dog(540, 1330 - Math.abs(Math.sin(t * 6)) * 22, .95, { mood: 'happy', wag: 16, tag: true }, t);
      for (let i = 0; i < 4; i++) { const k = pop(t, tw.neue + i * .1, .3); g.save(); g.globalAlpha = .7; doghouse(170 + i * 247, 1640, .5 * k, '?', '#e6e0f0'); g.restore(); }
      pill(W / 2, 1720, 'TEIL 2', pop(t, tw.teil - .05, .3), '#ffe08a', INK, 52);
      meter(1, 1, 100, 'Welpen', 1840);
    }
  }
  // paw-print wipe on "Komm mal mit"
  const wp = ramp(t, tw.komm - .15, tw.komm + .3); if (wp > 0 && wp < 1) { const r = (1 - Math.abs(wp * 2 - 1)) * 1500; g.fillStyle = PAL.lav; g.save(); g.translate(W / 2, H / 2);
    ell(0, r * .15, r * .55, r * .45); g.fill(); for (const [dx, dy] of [[-.5, -.4], [-.18, -.62], [.18, -.62], [.5, -.4]]) { ell(dx * r, dy * r, r * .17, r * .2); g.fill(); } g.restore(); }
  const capY = cta > .3 ? 300 : endK > .3 ? -1 : 300;
  if (capY > 0) caption(t, capY);
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => { frame(t); return out.toDataURL('image/jpeg', q); };
window.renderAvatar = (v = 0) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const gr = g.createRadialGradient(540, 540, 60, 540, 540, 760); gr.addColorStop(0, v ? '#d9f7e8' : '#efe9ff'); gr.addColorStop(1, v ? '#7fd1b0' : '#a98bff'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + .2; spark(540 + Math.cos(a) * 440, 540 + Math.sin(a) * 430, 20); }
  dog(540, 1060, 2.05, { mood: 'happy', wag: 0, tag: true, blink: 0 }, .7);
  return out.toDataURL('image/png');
};
window.__done = true;
