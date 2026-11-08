// ===================== 12 Flocke kurz — ~25 s re-cut of 09 (stronger hook: 'wartet seit 37 Tagen'), caption layer =====================
// render_video.sh copies fkurz_2d.js -> fkurz.js; captions: ../12_flocke_kurz/captions.json
// Scene/timeline from the sticker version (flocke_sticker_2d.js); drawing switched to flat fills + dark purple outlines,
// white kitten Flocke drawn with the Mimi rig (catM), pink caption highlight, garden instead of a room.
// Different look from 07 Mimi: no dark outlines, soft gradient shading, white sticker border + drop shadow,
// parallax layers, pastel mint/lavender/peach palette, pill captions.  render_video.sh copies flocke_2d.js -> flocke.js

await document.fonts.load('700 96px Fredoka');
const W = 1080, H = 1920;
const WORDS = await (await fetch('../12_flocke_kurz/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; const rr = (a, b) => a + (b - a) * rnd();


const tw = { flocke: T('Flocke'), tagen: T('Tag'), gartentor: T('Gartentor'), aber1: T('Aber'), niemand: T('niemand'),
  dabei: T('Dabei'), garten: T('Garten', 2), riesig: T('riesig'), leer: T('leer'),
  folgst: T('Folgst'), ein1: T('ein'), schreib: T('Schreib'), farbe: T('Farbe'), name: T('Name'), alles: T('alles'),
  dann: T('Dann'), malen: T('malen'), teil: T('Teil'), fuenf: T('Fünftausend'), stadt: T('Katzenstadt'),
  folg: T('Folg', 2), wartet2: T('wartet', 2) };
const SFX = { end: END, music_gain: .15, events: [], beds: [] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
SFX.beds.push([tw.dabei - .1, tw.folgst, 'wind', .35]);
e(.15, 'meow_sad', .8);  e(tw.niemand, 'boom', .5);
e(tw.dabei - .1, 'whoosh', .8); e(tw.riesig, 'swoosh_up', .5); e(tw.leer, 'tick', .6);
e(tw.folgst - .05, 'pop', 1); e(tw.ein1 - .3, 'boing', .7); e(tw.ein1, 'meow_happy', .8);
e(tw.schreib, 'pop', .8); for (const k of ['farbe', 'name', 'alles']) { e(tw[k] - .05, 'pop', .7); e(tw[k] + .25, 'meow_happy', .45); }
e(tw.malen - .1, 'whoosh', .6); for (let i = 0; i < 5; i++) e(tw.malen + i * .12, 'tick', .5); e(tw.teil, 'sparkle', .8);
e(tw.fuenf, 'whoosh', .7); for (let i = 0; i < 18; i++) e(tw.fuenf + .1 + i * .07, i % 4 ? 'pop' : 'meow_happy', .3); e(tw.stadt, 'tada', .8);
e(tw.folg - .05, 'pop', 1); e(tw.folg + .5, 'ding', .8); e(tw.wartet2, 'meow_sad', .6);
window.SFX = SFX;

// ---------- canvas ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out); const g = out.getContext('2d');
const INK = '#3b2b55';
const PAL = { sky0: '#c9b8ff', sky1: '#ffd9c7', hill: '#9fe0c4', hill2: '#7fd1b0', grass: '#b8ecc9', path: '#f6e3c8', fence: '#fff3e6', pond: '#8fd3ff', tree: '#6ccaa0', trunk: '#c79a7a', coral: '#ff7a8a', lav: '#a98bff', mint: '#5fd3a8', sun: '#ffe08a' };
function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ell(x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }
function shade(x, y, r, c0, c1) { return c1; }
function text(s, x, y, size, fill = '#fff', stroke = null, lw = 0, align = 'center') {
  g.font = `700 ${size}px Fredoka`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke && lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y); }
const OUT = '#3a2350';
function fillStroke(f, lw = 6, s = OUT) { g.fillStyle = f; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = s; g.lineJoin = 'round'; g.stroke(); } }
function soft(fn) { const f0 = g.fill; g.save(); g.fill = function (...a) { f0.apply(g, a); g.lineWidth = 6; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(); }; try { fn(); } finally { g.fill = f0; g.restore(); } }

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

function catM(x, y, s, o = {}, t = 0) {
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
      g.fillStyle = c; g.beginPath(); g.ellipse(ex + 4 * sx, ey - 30, 32, 14, sx * .38, 0, Math.PI * 2); g.fill();
      g.lineWidth = 7; g.strokeStyle = OUT; g.lineCap = 'round'; g.beginPath(); g.moveTo(ex - 18 * sx, ey - 56); g.lineTo(ex + 22 * sx, ey - 42); g.stroke(); }
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


// ---------- puppy (sticker rig, unused for the main character) ----------
// o: {c, c2 (muzzle), ear, mood 'sad'|'happy'|'neutral'|'wow'|'tired', blink, wag(speed), tongue, tear, hat, sash, tag, look, spin, sniff}
const DOGS_OLD = [['#f4dcb8', '#fff6ea', '#a8703f'], ['#ffffff', '#fff7f0', '#d9b08a'], ['#e0b07a', '#fff0dc', '#8a5530'], ['#d8d2de', '#ffffff', '#8f8799'], ['#fbe7d3', '#ffffff', '#f0a070'],
  ['#c88f5a', '#f6dcc0', '#6e4325'], ['#2f2b33', '#d9d3dd', '#1d1a20'], ['#f7d58a', '#fff4d6', '#c68a3a'], ['#e9e4dc', '#ffffff', '#b9a68e'], ['#f0c2a8', '#fff2ea', '#c27a5a']];
function puppy(o = {}, t = 0) {   // (kitten rig, name kept so the rest of the scene stays the same)
  const c = gRef; const [b0, b1, ea] = [o.c || '#fbf8ff', o.c2 || '#ffffff', o.ear || '#c9bfe0'];
  const dk = (hex, f) => { const n = parseInt(hex.slice(1), 16); return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`; };
  const sh = (x, y, r, col) => { const gr = c.createRadialGradient(x - r * .35, y - r * .45, r * .1, x, y, r * 1.3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.3, col); gr.addColorStop(1, dk(col, .8)); return gr; };
  const E = (x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); };
  const sway = Math.sin(t * (o.wag ?? 3) * .6) * (o.mood === 'sad' ? .1 : .3);
  c.save(); c.rotate(o.spin || 0);
  // long curled tail
  c.save(); c.translate(80, -60); c.rotate(sway); c.lineCap = 'round'; c.lineWidth = 34; c.strokeStyle = dk(b0, .92);
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(90, -10, 110, -150, 50, -210); c.stroke(); c.lineWidth = 24; c.strokeStyle = b0; c.stroke();
  c.lineWidth = 34; c.strokeStyle = ea; c.beginPath(); c.moveTo(62, -190); c.lineTo(50, -210); c.stroke(); c.restore();
  // body
  E(0, -90, 92, 88); c.fillStyle = sh(0, -90, 92, b0); c.fill();
  E(0, -66, 52, 50); c.fillStyle = b1; c.fill();
  for (const sx of [-1, 1]) { E(sx * 44, -10, 34, 22); c.fillStyle = sh(sx * 44, -10, 32, b1); c.fill(); c.fillStyle = '#ffc2d2'; for (const d of [-11, 0, 11]) { E(sx * 44 + d, -2, 5, 4); c.fill(); } }
  // collar + bell
  c.fillStyle = '#a98bff'; rrectC(c, -66, -172, 132, 20, 10); c.fill();
  if (o.tag) { E(0, -144, 19, 19); c.fillStyle = sh(0, -144, 19, '#ffd84a'); c.fill(); c.fillStyle = '#9a6e10'; E(0, -138, 4, 4); c.fill(); c.fillRect(-14, -150, 28, 3); }
  if (o.sash) { c.save(); c.rotate(-.5); c.fillStyle = PAL.coral; c.fillRect(-110, -136, 220, 32); c.fillStyle = '#fff'; c.font = '700 22px Fredoka'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KÖNIGIN', 0, -119); c.restore(); }
  // head
  const hx = (o.look || 0) * 12, hy = -255 + (o.mood === 'sad' ? 10 : 0) + (o.sniff ? 50 * o.sniff : 0);
  c.save(); c.translate(hx, hy); c.rotate((o.tilt || 0) + Math.sin(t * 1.3) * .04);
  // pointy ears (fold back when sad, perk up when wow)
  const ed = o.mood === 'sad' ? .45 : o.mood === 'wow' ? -.12 : 0;
  for (const sx of [-1, 1]) { c.save(); c.translate(sx * 70, -62); c.rotate(sx * (.28 + ed) + (Math.sin(t * 4 + sx) > .97 ? sx * .2 : 0));
    c.beginPath(); c.moveTo(-42, 24); c.quadraticCurveTo(-10, -92, 8, -86); c.quadraticCurveTo(40, -40, 44, 26); c.closePath(); c.fillStyle = sh(0, -20, 70, b0); c.fill();
    c.beginPath(); c.moveTo(-24, 14); c.quadraticCurveTo(-6, -56, 4, -54); c.quadraticCurveTo(24, -26, 24, 16); c.closePath(); c.fillStyle = '#ffc2d2'; c.fill(); c.restore(); }
  E(0, 0, 124, 106); c.fillStyle = sh(0, 0, 124, b0); c.fill();
  // fluffy cheeks
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 110, 20); c.lineTo(sx * 138, 44); c.lineTo(sx * 112, 52); c.lineTo(sx * 130, 74); c.lineTo(sx * 96, 70); c.closePath(); c.fillStyle = b0; c.fill(); }
  // forehead stripes in the ear colour
  c.fillStyle = ea; c.globalAlpha = .6; for (const dx of [-22, 0, 22]) { E(dx, -82, 7, 20); c.fill(); } c.globalAlpha = 1;
  E(0, 44, 56, 38); c.fillStyle = b1; c.fill();
  c.globalAlpha = .5; for (const sx of [-1, 1]) { E(sx * 80, 36, 22, 12); c.fillStyle = '#ff9fb8'; c.fill(); } c.globalAlpha = 1;
  // eyes (big, glossy, lavender-tinted)
  const blink = o.blink ?? (Math.sin(t * 1.7 + 1) > .985 ? 1 : 0);
  for (const sx of [-1, 1]) {
    const ex = sx * 46 + (o.look || 0) * 6, ey = -8;
    if (o.mood === 'happy' && !o.open) { c.lineWidth = 9; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey + 12, 20, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); continue; }
    if (blink > .5 || o.closed) { c.lineWidth = 8; c.strokeStyle = INK; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 18, ey + 4); c.quadraticCurveTo(ex, ey + 14, ex + 18, ey + 4); c.stroke(); continue; }
    const big = o.mood === 'wow' ? 1.18 : 1;
    E(ex, ey, 26 * big, 30 * big); const eg = c.createLinearGradient(0, ey - 30, 0, ey + 30); eg.addColorStop(0, '#2b2050'); eg.addColorStop(1, '#6a58b8'); c.fillStyle = eg; c.fill();
    E(ex + 8, ey - 11, 10 * big, 11 * big); c.fillStyle = '#fff'; c.fill(); E(ex - 9, ey + 12, 4.5 * big, 4.5 * big); c.fill();
    if (o.mood === 'sad' || o.mood === 'tired') { c.lineWidth = 6; c.strokeStyle = dk(ea, .75); c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 20 * sx, ey - 46); c.lineTo(ex + 14 * sx, ey - 38); c.stroke();
      c.globalAlpha = .55; E(ex, ey + 26, 20, 6); c.fillStyle = '#aee0ff'; c.fill(); c.globalAlpha = 1; }
  }
  // nose + mouth
  c.beginPath(); c.moveTo(-11, 22); c.lineTo(11, 22); c.lineTo(0, 33); c.closePath(); c.fillStyle = '#ff8fa8'; c.fill();
  c.lineWidth = 5; c.strokeStyle = INK; c.lineCap = 'round';
  if (o.mood === 'sad') { c.beginPath(); c.moveTo(-15, 58); c.quadraticCurveTo(0, 46, 15, 58); c.stroke(); }
  else if (o.mood === 'wow' || o.bark) { E(0, 52, 14, 12 + (o.bark || 0) * 8); c.fillStyle = '#c44a6a'; c.fill(); }
  else { c.beginPath(); c.moveTo(0, 33); c.quadraticCurveTo(-8, 46, -20, 41); c.moveTo(0, 33); c.quadraticCurveTo(8, 46, 20, 41); c.stroke(); }
  c.lineWidth = 3; c.strokeStyle = 'rgba(59,43,85,.55)'; for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(sx * 60, 32 + k * 9); c.lineTo(sx * 132, 22 + k * 16); c.stroke(); }
  if (o.tear) { const ph = (t * .9) % 1; E(-46, 22 + ph * 70, 8, 12); c.fillStyle = `rgba(130,200,255,${(1 - ph) * o.tear})`; c.fill(); }
  // crown (Königin)
  if (o.hat) { c.save(); c.translate(0, -108 + (o.hatDrop || 0)); c.rotate(-.1 + (o.hatTilt || 0)); c.scale(o.hat, o.hat);
    c.beginPath(); c.moveTo(-54, 18); c.lineTo(-60, -40); c.lineTo(-27, -8); c.lineTo(0, -50); c.lineTo(27, -8); c.lineTo(60, -40); c.lineTo(54, 18); c.closePath(); c.fillStyle = sh(0, -10, 60, '#ffd84a'); c.fill();
    for (const dx of [-27, 0, 27]) { E(dx, 4, 7, 7); c.fillStyle = PAL.coral; c.fill(); } c.restore(); }
  c.restore(); c.restore();
}
const DOGS = [['#fbf8ff', '#ffffff', '#c9bfe0'], ['#ffd9b0', '#fff4e6', '#f0a060'], ['#c9c3d6', '#f6f3fb', '#8f86a6'], ['#3e3848', '#d9d3e6', '#2a2433'], ['#ffe9c7', '#ffffff', '#e0b070'], ['#e7d0ff', '#ffffff', '#b28cf0'], ['#f3c2a0', '#fff0e6', '#c98060'], ['#ffffff', '#ffffff', '#ffb3c7'], ['#d6b38c', '#fbefe0', '#8a6040'], ['#b8d8f0', '#f3faff', '#7fa8d0']];
function rrectC(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function dog(x, y, s, o, t) {
  const mo = { c: o.c || '#f7f3fb', c2: o.c2 || '#ffffff', mood: o.mood, blink: o.blink, tear: o.tear, crown: o.hat, crownTilt: o.hatTilt, collar: o.tag, meow: o.bark, look: o.look, open: o.open, tilt: (o.tilt || 0) + (o.sniff ? .35 * o.sniff : 0) };
  g.save(); g.translate(x, y); g.rotate(o.spin || 0); catM(0, 0, s * 1.15, mo, t); g.restore();
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
function boneSlide_old(x, y, k) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  soft(() => { g.fillStyle = '#c7b8ff'; rrect(-170, -560, 34, 560, 14); g.fill(); rrect(-80, -560, 34, 560, 14); g.fill(); }, 14, 8, .2);
  g.fillStyle = '#e4dcff'; for (let i = 0; i < 6; i++) rrect(-150, -520 + i * 90, 90, 16, 8), g.fill();
  soft(() => { g.lineCap = 'round'; g.strokeStyle = '#fff6ea'; g.lineWidth = 80; g.beginPath(); g.moveTo(-60, -560); g.bezierCurveTo(140, -520, 120, -120, 300, -60); g.stroke();
    for (const [bx, by] of [[-60, -560], [300, -60]]) { g.fillStyle = '#fff6ea'; ell(bx - 34, by - 30, 44, 44); g.fill(); ell(bx + 34, by + 30, 44, 44); g.fill(); ell(bx + 30, by - 34, 44, 44); g.fill(); ell(bx - 30, by + 34, 44, 44); g.fill(); } }, 22, 12, .25);
  g.strokeStyle = 'rgba(200,170,140,.4)'; g.lineWidth = 6; g.beginPath(); g.moveTo(-40, -540); g.bezierCurveTo(150, -500, 130, -110, 290, -48); g.stroke(); g.restore(); }
function pool_old(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  soft(() => { ell(0, -40, 230, 80); g.fillStyle = shade(0, -40, 230, '#ffc2cf', '#ff8fa8'); g.fill(); }, 20, 10, .22); ell(0, -56, 200, 56); g.fillStyle = '#9fe3ff'; g.fill();
  for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 30 + (i * 37) % 160; const bx = Math.cos(a) * r, by = -56 + Math.sin(a) * r * .28 - Math.abs(Math.sin(t * 3 + i)) * 6;
    ell(bx, by, 22, 22); g.fillStyle = shade(bx, by, 22, '#f6ffb0', '#cfe84a'); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(bx - 8, by, 16, -.9, .9); g.stroke(); } g.restore(); }
function fountain(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  soft(() => { ell(0, -30, 180, 50); g.fillStyle = shade(0, -30, 180, '#f1ecff', '#c9bdf0'); g.fill(); rrect(-30, -260, 60, 230, 24); g.fillStyle = '#e4dcff'; g.fill(); ell(0, -260, 90, 26); g.fillStyle = '#d8ceff'; g.fill(); }, 18, 10, .2);
  for (let i = 0; i < 7; i++) { const ph = (t * .9 + i / 7) % 1, dir = i % 2 ? 1 : -1; const sx = dir * ph * 200, sy = -280 - Math.sin(ph * Math.PI) * 220 + ph * 200;
    g.save(); g.translate(sx, sy); g.rotate(ph * 5 * dir); g.scale(dir, 1); soft(() => { ell(0, 0, 34, 18); g.fillStyle = shade(0, 0, 34, '#ffffff', i % 3 ? '#ffb648' : '#7fc8ff'); g.fill(); g.beginPath(); g.moveTo(-28, 0); g.lineTo(-52, -16); g.lineTo(-52, 16); g.closePath(); g.fill(); }, 8, 4, .2); ell(16, -4, 4, 4); g.fillStyle = INK; g.fill(); g.restore(); } g.restore(); }
function pillows_old(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); const cols = ['#ffb3c7', '#b9a6ff', '#9fe0c4', '#ffe08a', '#a8dcff'];
  let i = 0; for (let row = 0; row < 5; row++) for (let j = 0; j < 5 - row; j++) { const px = (j - (4 - row) / 2) * 100, py = -40 - row * 64; const c = cols[i++ % 5];
    soft(() => { rrect(px - 54, py - 34, 108, 68, 30); g.fillStyle = shade(px, py, 60, '#ffffff', c); g.fill(); }, 12, 6, .18); } g.restore(); }
function boneSlide(x, y, k) {   // castle of cardboard boxes
  if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  const box = (bx, by, w, h) => { soft(() => { rrect(bx - w / 2, by - h, w, h, 10); g.fillStyle = shade(bx, by - h / 2, w * .6, '#f7dcb0', '#d9a86a'); g.fill(); }, 12, 6, .2);
    g.fillStyle = 'rgba(150,100,50,.35)'; g.fillRect(bx - w / 2 + 8, by - h + h * .45, w - 16, 8); };
  for (const [bx, by, w, h] of [[-150, 0, 150, 130], [0, 0, 160, 150], [150, 0, 150, 130], [-80, -140, 140, 120], [80, -150, 140, 130], [0, -280, 150, 140], [-150, -130, 90, 90], [150, -140, 90, 90]]) box(bx, by, w, h);
  g.fillStyle = '#5a4a7a'; g.beginPath(); g.arc(0, -40, 46, Math.PI, 0); g.lineTo(46, 0); g.lineTo(-46, 0); g.fill();
  g.fillStyle = PAL.coral; g.fillRect(-4, -520, 8, 110); g.beginPath(); g.moveTo(4, -520); g.lineTo(70, -495); g.lineTo(4, -470); g.fill(); g.restore(); }
function pool(x, y, k, t) {   // roller coaster made of yarn
  if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  const track = s => [s * 700 - 350, -60 - 260 * Math.abs(Math.sin(s * Math.PI * 2)) * (1 - s * .4)];
  g.lineCap = 'round'; g.lineWidth = 26; g.strokeStyle = '#ff9fb8'; g.beginPath(); for (let i = 0; i <= 60; i++) { const [px, py] = track(i / 60); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke();
  for (let i = 0; i <= 8; i++) { const [px, py] = track(i / 8); g.fillStyle = '#e4dcff'; g.fillRect(px - 6, py, 12, -py); }
  const cols = ['#a98bff', '#5fd3a8', '#ffe08a'];
  for (let j = 0; j < 3; j++) { const s = ((t * .25 + j * .05) % 1); const [px, py] = track(s); soft(() => { ell(px, py - 30, 30, 30); g.fillStyle = shade(px, py - 30, 30, '#ffffff', cols[j]); g.fill(); }, 8, 4, .2);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; for (let q = -1; q <= 1; q++) { g.beginPath(); g.arc(px, py - 30, 18 + q * 6, -1, 1.2); g.stroke(); } }
  g.restore(); }
function pillows(x, y, k, t) {   // sun lounger that never gets cold
  if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k);
  soft(() => { g.fillStyle = '#c79a7a'; g.fillRect(-150, -30, 14, 30); g.fillRect(136, -30, 14, 30); rrect(-170, -70, 340, 44, 22); g.fillStyle = shade(0, -50, 170, '#ffffff', '#ffb3c7'); g.fill();
    g.save(); g.translate(-150, -60); g.rotate(-.5); rrect(-10, -130, 44, 140, 20); g.fillStyle = '#ffb3c7'; g.fill(); g.restore(); }, 16, 8, .2);
  for (let i = 0; i < 3; i++) { const ph = (t * .6 + i / 3) % 1; g.strokeStyle = `rgba(255,170,90,${.7 * (1 - ph)})`; g.lineWidth = 6; g.beginPath(); g.moveTo(-60 + i * 60, -90 - ph * 120); g.quadraticCurveTo(-40 + i * 60, -110 - ph * 120, -60 + i * 60, -130 - ph * 120); g.stroke(); }
  g.restore(); }
function mystery(x, y, k, t) { if (k <= 0) return; g.save(); g.translate(x, y); g.globalAlpha = k; g.setLineDash([24, 18]); g.lineWidth = 10; g.strokeStyle = PAL.lav; g.beginPath(); g.arc(0, -180, 170, 0, 7); g.stroke(); g.setLineDash([]);
  text('?', 0, -180, 240 * k, PAL.lav); for (let i = 0; i < 8; i++) { const a = i / 8 * 7 + t; spark(Math.cos(a) * 220, -180 + Math.sin(a) * 210, 16); } g.restore(); }
function spark(x, y, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, q = i % 2 ? r * .4 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fillStyle = '#fff6b0'; g.fill(); }
function doghouse_old(x, y, s, name, col = '#ffb3c7') { g.save(); g.translate(x, y); g.scale(s, s);
  soft(() => { g.fillStyle = shade(0, -120, 160, '#ffffff', col); rrect(-130, -230, 260, 230, 24); g.fill(); g.fillStyle = '#9b8cff'; g.beginPath(); g.moveTo(-160, -210); g.lineTo(0, -340); g.lineTo(160, -210); g.closePath(); g.fill(); }, 20, 10, .22);
  g.fillStyle = '#5a4a7a'; g.beginPath(); g.arc(0, -70, 70, Math.PI, 0); g.lineTo(70, 0); g.lineTo(-70, 0); g.fill();
  if (name) { soft(() => { rrect(-120, -300, 240, 56, 18); g.fillStyle = '#fff'; g.fill(); }, 8, 4, .2); text(name, 0, -271, 34, INK); } g.restore(); }
function doghouse(x, y, s, name, col = '#ffb3c7') { g.save(); g.translate(x, y); g.scale(s, s);
  soft(() => { ell(0, -40, 170, 64); g.fillStyle = shade(0, -40, 170, '#ffffff', '#e0b88a'); g.fill(); }, 18, 10, .22); ell(0, -62, 140, 38); g.fillStyle = col; g.fill();
  g.strokeStyle = 'rgba(150,100,60,.35)'; g.lineWidth = 4; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 34, 10); g.lineTo(i * 34 + 10, -60); g.stroke(); }
  if (name) { soft(() => { rrect(-120, -6, 240, 56, 18); g.fillStyle = '#fff'; g.fill(); }, 8, 4, .2); text(name, 0, 23, 34, INK); } g.restore(); }
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
  text(`${Math.round(n).toLocaleString('de-DE')} / ${total.toLocaleString('de-DE')} ${label}`, W / 2, yy - 32, 46, INK);
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
const SHOW = { Fünftausend: '5.000', tausend: '1000', zwei: '2' };
function caption(t, y) {
  let wi = -1; for (let i = 0; i < WORDS.length; i++) if (WORDS[i][1] <= t + .02) wi = i; if (wi < 0 || t > WORDS[wi][2] + .6) return;
  const ph = PHR.find(p => p.includes(wi)); if (!ph) return;
  const ws = ph.map(i => SHOW[clean(WORDS[i][0])] || WORDS[i][0].replace(/,$/, ''));
  let fs = 92; g.font = `700 ${fs}px Fredoka`; const space = 44; const tot = () => ws.reduce((a, w) => a + g.measureText(w).width, 0) + space * (ws.length - 1);
  while (tot() > W - 100) { fs -= 4; g.font = `700 ${fs}px Fredoka`; }
  let x = W / 2 - tot() / 2;
  ph.forEach((i, j) => { g.font = `700 ${fs}px Fredoka`; const w = ws[j], mw = g.measureText(w).width; if (i > wi) { x += mw + space; return; }
    const on = i === wi, k = on ? pop(t, WORDS[i][1], .18) : 1, sc = on ? 1 + .14 * k : 1;
    g.save(); g.translate(x + mw / 2, y); g.scale(sc, sc); g.rotate(on ? -.04 : 0); text(w, 0, 0, fs, on ? '#ff7ab6' : '#ffffff', OUT, 16); g.restore(); x += mw + space; });
}
// ---------- crowd ----------
seed = 9; const CROWD = []; for (let i = 0; i < 170; i++) CROWD.push({ x: rr(70, W - 70), y: rr(1400, 1890), s: rr(.34, .46), d: DOGS[i % DOGS.length], ph: rr(0, 6) });
CROWD.sort((a, b) => a.y - b.y);


// ---------- frame ----------
function gate(t, z) {
  const gr = g.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, '#6f63c9'); gr.addColorStop(1, '#f2a7b7'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const a = (t * 1.1) % 1 * Math.PI; soft(() => { ell(540 - Math.cos(a) * 520, 1150 - Math.sin(a) * 520, 70, 70); g.fillStyle = PAL.sun; g.fill(); });
  g.fillStyle = PAL.hill; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 1150 - 60 * Math.sin(x * .005)); g.lineTo(W, H); g.fill();
  g.fillStyle = PAL.grass; g.fillRect(0, 1250, W, H); g.fillStyle = PAL.path; g.beginPath(); g.moveTo(480, 1250); g.lineTo(600, 1250); g.lineTo(900, H); g.lineTo(180, H); g.fill();
  g.save(); g.translate(W / 2, 1500); g.scale(z, z); g.translate(-W / 2, -1500);
  dog(540, 1560, 1.3, { mood: 'sad', tear: ramp(t, tw.niemand - .4, tw.niemand), look: Math.sin(t * .8) * .6 }, t);
  soft(() => { g.fillStyle = '#ffe9cf'; for (let i = 0; i < 9; i++) { const x = 70 + i * 110; g.beginPath(); g.moveTo(x - 32, 1800); g.lineTo(x - 32, 1560); g.lineTo(x, 1520); g.lineTo(x + 32, 1560); g.lineTo(x + 32, 1800); g.fill(); } g.fillRect(0, 1600, W, 26); g.fillRect(0, 1710, W, 26); });
  g.restore();
}
function bubble(x, y, s, k, col) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k); g.font = '700 46px Fredoka'; const w = g.measureText(s).width + 130;
  soft(() => { rrect(-w / 2, -50, w, 100, 50); g.fillStyle = '#fff'; g.fill(); }); g.fillStyle = col; ell(-w / 2 + 55, 0, 26, 26); g.fill(); text(s, 30, 3, 46, INK); g.restore(); }
const KIT = [['#9aa3ad', '#f1f3f5', 'Socke', 'farbe', 260, 1790], ['#ff8a8a', '#fff0f0', 'Punkt', 'name', 820, 1800], ['#3d3a3c', '#e9e2dd', 'Nacht', 'alles', 540, 1880]];
function frame(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); gRef = g;
  if (t < tw.dabei - .1) {   // waiting at the gate, day counter ticks up to 37
    gate(t, 1 + ease(t, 0, tw.dabei) * .12);
    const lf = ramp(t, tw.aber1, tw.dabei); if (lf > 0) leaf(lerp(-40, 1120, lf), 1350 - Math.sin(lf * 9) * 40, lf * 12);
    return;
  }
  // the big empty garden; camera pans, then follows the action
  const cam = lerp(0, 700, ease(t, tw.dabei, tw.leer + .4)) - lerp(0, 700, ease(t, tw.folgst - .3, tw.folgst + .3));
  park(t, cam, { gate: 1 });
  pill(W / 2, 1080, 'leer', win(t, tw.leer - .1, tw.folgst - .1, .2), '#fff', INK, 60);
  const crowdK = ramp(t, tw.fuenf - .1, tw.stadt + .2);
  // houses of the cat city on the hills
  const ck = ease(t, tw.stadt - .4, tw.stadt + .3);
  if (ck > 0) for (let i = 0; i < 26; i++) { const hx = (i * 97) % W + 20, hy = 1150 + (i % 4) * 34, k = pop(t, tw.stadt - .4 + i * .02, .3); if (k <= .01) continue; g.save(); g.translate(hx, hy); g.scale(.32 * k, .32 * k);
    soft(() => { rrect(-90, -150, 180, 150, 14); g.fillStyle = ['#ffd3e2', '#d9ccff', '#c9f0dc', '#ffe9b8'][i % 4]; g.fill(); g.beginPath(); g.moveTo(-110, -140); g.lineTo(0, -240); g.lineTo(110, -140); g.closePath(); g.fillStyle = ['#ff8fb1', '#a98bff', '#5fd3a8', '#ffb648'][i % 4]; g.fill(); }); g.restore(); }
  if (t > tw.fuenf - .1 && t < tw.folg) {
    const n = Math.round(170 * crowdK);
    for (let i = 0; i < n; i++) { const c = CROWD[i]; g.save(); g.translate(c.x, c.y - Math.abs(Math.sin(t * 6 + c.ph)) * 14); const s = c.s * pop(t, tw.fuenf - .1 + i * .008, .25); g.scale(s, s); catM(0, 0, 1.15, { c: c.d[0], c2: c.d[1], mood: i % 3 ? 'happy' : 'wow' }, t + c.ph); g.restore(); }
    dog(540, 1640, .85, { mood: 'happy', hat: 1 }, t);
    pill(W / 2, 1000, 'Katzenstadt', pop(t, tw.stadt - .1, .35), '#ff7ab6', '#fff', 64);
  } else {
    // Flocke + new kittens
    const fx = t > tw.folgst - .1 ? 330 : 540;
    dog(fx, 1720, t < tw.folgst ? 1.15 : 1.0, { mood: t < tw.folgst ? 'sad' : 'happy' }, t);
    const du = pop(t, tw.ein1 - .3, .4); if (du > .01) { const yy = 1720 - (1 - ramp(t, tw.ein1 - .4, tw.ein1)) * 900; dog(760, Math.min(1720, yy), 1.0 * Math.min(1, du + .3), { mood: 'happy', c: '#d9c2a8', c2: '#fff6ea', label: ramp(t, tw.ein1, tw.ein1 + .2) > .5 ? ['DU', '#ffe08a'] : null }, t + 1); }
    KIT.forEach(([c, c2, nm, w, x, y], i) => { const k = pop(t, tw[w] + .2, .35); if (k <= .01) return; dog(x, y, .7 * k, { mood: 'happy', c, c2, label: k > .9 ? [nm, '#fff'] : null }, t + i * 1.7); });
  }
  // overlays
  card(back(ramp(t, tw.folgst - .1, tw.folgst + .3)) * (1 - ease(t, tw.schreib - .3, tw.schreib)), 470, 'follow', 'FOLGEN', 'Du ziehst als Kätzchen ein', true, t, -.02);
  const cm = win(t, tw.schreib - .1, tw.dann, .3);
  card(back(ramp(t, tw.schreib - .1, tw.schreib + .3)) * cm, 450, 'comment', 'KOMMENTIEREN', 'Wie soll dein Kätzchen aussehen?', true, t, .02);
  bubble(W / 2 - 60, 720, 'grau, heißt Socke', pop(t, tw.farbe - .1, .3) * cm, '#9aa3ad'); bubble(W / 2 + 70, 850, 'rosa mit Punkten 😂', pop(t, tw.name - .1, .3) * cm, '#ff8a8a'); bubble(W / 2 - 30, 980, 'schwarz, Name Nacht', pop(t, tw.alles - .1, .3) * cm, '#3d3a3c');
  // "we paint it": dashed kitten gets coloured in
  const pk = win(t, tw.dann - .1, tw.fuenf - .1, .25);
  if (pk > .01) { g.fillStyle = `rgba(255,240,246,${.85 * pk})`; g.fillRect(0, 0, W, H); const fill = ramp(t, tw.malen, tw.teil);
    g.save(); g.globalAlpha = pk; g.beginPath(); g.rect(0, 1500 - fill * 900, W, 900); g.clip(); catM(W / 2, 1450, 1.6, { mood: 'happy', c: '#b9a6ff', c2: '#f3efff' }, t); g.restore();
    g.save(); g.globalAlpha = pk * (1 - fill * .8); g.setLineDash([22, 16]); g.lineWidth = 10; g.strokeStyle = '#a98bff'; g.beginPath(); g.ellipse(W / 2, 1150, 230, 200, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(W / 2, 1360, 170, 140, 0, 0, 7); g.stroke(); g.restore();
    const bx = W / 2 + 260 - fill * 300, by = 1500 - fill * 800 + Math.sin(t * 20) * 20; g.save(); g.globalAlpha = pk; g.translate(bx, by); g.rotate(.6); soft(() => { rrect(-14, 0, 28, 200, 12); g.fillStyle = '#ffd36b'; g.fill(); ell(0, -10, 24, 36); g.fillStyle = '#a98bff'; g.fill(); }); g.restore();
    pill(W / 2, 1700, 'Teil 2', pop(t, tw.teil - .05, .3) * pk, '#ffe08a', INK, 60); }
  meter(win(t, tw.fuenf - .1, tw.folg, .3), Math.max(2, crowdK * 5000), 5000, 'Kätzchen', 1180);
  const endK = ramp(t, tw.folg - .2, tw.folg + .3);
  if (endK > 0) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffd9e6'); gr.addColorStop(1, '#c9b8ff'); g.globalAlpha = endK; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    if (endK > .3) { pill(W / 2, 560, 'Folg mir!', 1, '#fff', INK, 84); button(pop(t, tw.folg + .05, .35), t, 680);
      const tp = ramp(t, tw.folg + .35, tw.folg + .9); if (tp > 0 && tp < 1) { g.save(); g.globalAlpha = 1 - tp; g.lineWidth = 10; g.strokeStyle = '#fff'; g.beginPath(); g.arc(W / 2 + 170, 758, 30 + tp * 140, 0, 7); g.stroke(); g.restore(); }
      dog(540, 1420, 1.1, { mood: t > tw.wartet2 ? 'sad' : 'happy', tag: true, look: t > tw.wartet2 ? .5 : 0 }, t);
      pill(W / 2, 1600, 'Flocke wartet schon…', pop(t, tw.wartet2 - .1, .3), '#ff7ab6', '#fff', 52); } }
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => { frame(t); return out.toDataURL('image/jpeg', q); };
window.__done = true;
