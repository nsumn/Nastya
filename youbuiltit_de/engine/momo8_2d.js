// ===================== 28 Momo Tag 2 — sad hook (alone on the beach at night), then +70 residents, names + jobs + pets from the comments (photos local only), Bruno jealous, Döner shop, goal +100 -> cinema, cliffhanger: the captain's letter. Built from momo7_2d.js (isoMap).
// 1 follow = own house with your name, pick a job in the comments, small goals (+10 jetty, +30 lighthouse), "tomorrow your name is on the beach". Built from momo5_2d.js.

await document.fonts.load('700 96px Fredoka');
const W = 1080, H = 1920;
const WORDS = await (await fetch('../28_momo_tag2/words.json')).json();
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const END = WORDS[WORDS.length - 1][2] + 1.8;
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a)), sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b)), lerp = (a, b, k) => a + (b - a) * k;
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; const rr = (a, b) => a + (b - a) * rnd();
const fmt = n => Math.round(n).toLocaleString('de-DE');

// commenter data is local only (gitignored); without it the crowd uses generic coats and no handles are shown
const CATS = await fetch('../15_momo_tag2/cats.json').then(r => r.ok ? r.json() : null).catch(() => null)
  || ['tabby', 'ginger', 'black', 'white', 'calico', 'grey', 'tuxedo', 'siamese', 'pink', 'golden', 'tabwhite', 'lilac', 'gingerwhite', 'bengal', 'greywhite', 'tortie'].map((look, i) => ({ uid: '', look, fluffy: i % 3 === 0, acc: null }));
const PHOTO = CATS.map(() => null);
const ROLES = await fetch('../28_momo_tag2/roles.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));   // local only (gitignored)
const PET = {}; for (const n of ['yoda', 'mini', 'max', 'oskar', 'milo', 'flecki', 'socke', 'dog']) PET[n] = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `../28_momo_tag2/photos/${n}.jpg`; });
const FOLLOWERS = 6092, YESTERDAY = 6022, GOAL = 100, GOALN = 10000, NWALL = 0;
const LADDER = [['Steg', '+10', 1], ['Leuchtturm', '+30', 1], ['Kino', '+100', 0]];
const tw = {
  gestern: T('Gestern'), allein: T('allein'), traurig: T('traurig'), keiner: T('Keiner'), moewe: T('Möwe'), geschrieben: T('geschrieben'),
  dann: T('dann'), kamt: T('kamt'), siebzig: T('Siebzig'), tag: T('Tag'), steg: T('Steg'), leucht: T('Leuchtturm'),
  wie: T('wie'), namen: T('Namen'), strand2: T('Strand', 2), feuer: T('Feuerwehr'), taucher: T('Taucher'), sheriff: T('Sheriff'),
  yoda: T('Yoda'), kiosk: T('Kiosk'), mini: T('Mini'), max: T('Max'), oskar: T('Oskar'), milo: T('Milo'), flecki: T('Flecki'), socke: T('Socke'), eingez: T('eingezogen'),
  hund: T('Hund'), bruno: T('Bruno'), eifer: T('eifersüchtig'), ihr: T('Ihr'), doener: T('Dönerladen'), steht: T('steht'),
  ziel: T('Nächstes'), hundert: T('hundert'), kino: T('Kino'), doch: T('Doch'), gisela: T('Gisela'), brief: T('Brief'), gefressen: T('gefressen'),
  darauf: T('Darauf'), komme: T('komme'), kapitaen: T('Kapitän'), lassen: T('Lassen'), land: T('Land'), top: T('Top-Kommentar'), entsch: T('entscheidet'), heute: T('Siebzig') };

const SFX = { end: END, music_gain: .13, events: [], beds: [[0, tw.dann, 'wind', .5]] };
const e = (t, n, g = 1) => SFX.events.push([+t.toFixed(3), n, g]);
e(.1, 'meow_sad', .9); e(tw.traurig, 'meow_sad', .6); e(tw.moewe, 'whoosh', .5);
e(tw.dann - .1, 'swoosh_up', .8); e(tw.kamt, 'tada', .9); for (let i = 0; i < 14; i++) e(tw.siebzig + i * .07, i % 4 ? 'tick' : 'pop', .45); e(tw.steg, 'pop', .9); e(tw.leucht, 'tada', .9);
e(tw.namen, 'sparkle', .8); for (let i = 0; i < 10; i++) e(tw.strand2 + i * .08, 'pop', .35);
e(tw.feuer, 'pop', .8); e(tw.taucher, 'splash', .6); e(tw.sheriff, 'ding', .7); e(tw.yoda, 'meow_happy', .7);
for (const k of ['mini', 'max', 'oskar', 'milo', 'flecki', 'socke']) e(tw[k], 'sparkle', .5);
e(tw.hund, 'boing', .8); e(tw.eifer, 'boing', .8); e(tw.doener, 'pop', .9); e(tw.steht, 'stamp', .9);
e(tw.ziel - .1, 'whoosh', .7); e(tw.kino, 'swoosh_up', .7);
e(tw.doch - .1, 'boom', .7); e(tw.brief, 'whoosh', .5); e(tw.komme, 'boom', .6); e(tw.kapitaen, 'boom', .9);
e(tw.lassen - .1, 'whoosh', .7); e(tw.top, 'pop', .9);
window.SFX = SFX;
// ---------- canvas helpers ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out); const g = out.getContext('2d', { willReadFrequently: true });   // CPU canvas: the GPU one sometimes lost its content mid-frame
const OUT = '#3a2350';
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
  if (!(s > .004)) return;   // a zero scale (kitten not popped in yet) corrupted later frames in SwiftShader
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
  if (o.acc === 'bee') { g.save(); g.setLineDash([16, 16]); g.strokeStyle = '#2f2a33'; g.lineWidth = 28; g.stroke(); g.restore(); }
  // body
  ell(0, -70, 100, 82); fillStroke(o.acc === 'bee' ? '#ffd23f' : c, 7);
  if (o.acc === 'bee') { g.save(); ell(0, -70, 100, 82); g.clip(); g.fillStyle = '#2f2a33'; for (const y of [-120, -70, -20]) g.fillRect(-110, y, 220, 22); g.restore(); ell(0, -70, 100, 82); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
    g.globalAlpha = .8; for (const sx of [-1, 1]) { ell(sx * 95, -150, 42, 26, sx * .6); fillStroke('#e6f6ff', 5); } g.globalAlpha = 1; }
  else pat(o, 'body', () => ell(0, -70, 100, 82));
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
  if (o.acc === 'antenna') for (const sx of [-1, 1]) { g.lineWidth = 6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(sx * 30, -100); g.quadraticCurveTo(sx * 40, -170, sx * 60, -190); g.stroke(); ell(sx * 60, -192, 16, 16); fillStroke('#d8f03a', 5); }
  if (o.acc === 'hat') { g.save(); g.translate(0, -100); g.beginPath(); g.arc(0, 0, 80, Math.PI, 0); g.closePath(); fillStroke('#ff5a5a', 6); g.beginPath(); g.arc(0, 0, 80, Math.PI, Math.PI * 1.33); g.lineTo(0, 0); g.fillStyle = '#ffd23f'; g.fill(); g.beginPath(); g.arc(0, 0, 80, Math.PI * 1.66, 0); g.lineTo(0, 0); g.fillStyle = '#4fb4ff'; g.fill(); g.restore(); }
  if (o.acc === 'bow') { g.save(); g.translate(70, -96); g.rotate(.3); for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(sx * 46, -24); g.lineTo(sx * 46, 24); g.closePath(); fillStroke('#ff5c8a', 5); } ell(0, 0, 12, 12); fillStroke('#ff8fb1', 4); g.restore(); }
  if (o.acc === 'glasses') { g.lineWidth = 7; g.strokeStyle = OUT; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 48, -2, 34, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(-14, -4); g.lineTo(14, -4); g.stroke(); }
  if (o.acc === 'hat' && o.chef) { }
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
  if (o.pat === 'flag') { const cols = ['#7fcff5', '#f6a8c0', '#ffffff', '#f6a8c0', '#7fcff5']; for (let k = 0; k < 5; k++) { g.fillStyle = cols[k]; g.fillRect(-160, (part === 'head' ? -110 : -160) + k * (part === 'head' ? 46 : 38), 320, part === 'head' ? 46 : 38); } }
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
  alien: { c: '#d8f03a', c2: '#f4ffb0' }, greywhite: { c: '#8e97a6', c2: '#ffffff', big: 1, paw: '#ffffff' }, blue: { c: '#9cc8ff', c2: '#e6f2ff' }, mint: { c: '#9ff0c8', c2: '#e9fff4' },
  cow: { c: '#ffffff', c2: '#ffffff', pat: 'patches', pc: ['#2f2a33'] }, transflag: { c: '#7fcff5', c2: '#ffffff', pat: 'flag' }, white: { c: '#fbfaf8', c2: '#ffffff' }, sphynx: { c: '#e9c3b4', c2: '#f3d9cf', pat: 'wrinkles' } };
const lookOf = (cat, i) => Object.assign({ seed: i + 1, fluffy: cat.fluffy, acc: cat.acc, crown: cat.acc === 'crown' ? 1 : 0 }, LOOKS[cat.look] || LOOKS.tabby);

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

// ---------- garden (Flocke's world) ----------
function garden(t, night = 0) {
  const gr = g.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, night ? '#5b4fb0' : '#c9b8ff'); gr.addColorStop(1, night ? '#e2a0b8' : '#ffd9c7'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  ell(830, 360, 80, 80); fillStroke('#ffe08a', 6);
  for (const [cx, cy, s_] of [[200, 300, 1], [640, 220, .8], [960, 520, .7]]) { g.save(); g.translate(cx + (t * 8) % 60, cy); g.scale(s_, s_); g.beginPath(); for (const [dx, dy, r] of [[-70, 10, 50], [-20, -20, 64], [40, 0, 56], [90, 16, 40]]) { g.moveTo(dx + r, dy); g.arc(dx, dy, r, 0, 7); } fillStroke('#ffffff', 6); g.restore(); }
  g.fillStyle = '#9fe0c4'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 1100 - 70 * Math.sin(x * .005)); g.lineTo(W, H); g.closePath(); fillStroke('#9fe0c4', 6);
  for (let i = 0; i < 7; i++) { const x = 60 + i * 165; g.fillStyle = '#c79a7a'; g.fillRect(x - 12, 1080, 24, 120); ell(x, 1040, 75, 80); fillStroke(i % 2 ? '#6ccaa0' : '#86d8b0', 6); }
  g.fillStyle = '#b8ecc9'; g.fillRect(0, 1240, W, H - 1240);
  g.fillStyle = '#f6e3c8'; g.beginPath(); g.moveTo(470, 1240); g.lineTo(610, 1240); g.lineTo(900, H); g.lineTo(180, H); g.closePath(); g.fill();
  for (let i = 0; i < 10; i++) { const x = 40 + i * 112; g.beginPath(); g.moveTo(x - 30, 1460); g.lineTo(x - 30, 1290); g.lineTo(x, 1255); g.lineTo(x + 30, 1290); g.lineTo(x + 30, 1460); g.closePath(); fillStroke('#fff3e6', 5); }
}
const FLOCKE = { c: '#f7f3fb', c2: '#ffffff', fluffy: true, collar: true };
seed = 5; const CROWD = []; for (let i = 0; i < 170; i++) CROWD.push({ x: rr(60, W - 60), y: rr(1250, 1720), s: rr(.3, .44), k: i % CATS.length, ph: rr(0, 6) });
CROWD.sort((a, b) => a.y - b.y);
function polaroid(x, y, r, k, i, t, m = 0) { if (k <= .01) return; g.save(); g.translate(x, y); g.rotate(r); g.scale(k, k); rrect(-130, -150, 260, 300, 10); fillStroke('#ffffff', 6);
  g.fillStyle = '#efe9ff'; g.fillRect(-110, -130, 220, 210); g.save(); g.beginPath(); g.rect(-110, -130, 220, 210); g.clip();
  if (PHOTO[i] && m < 1) { g.globalAlpha = 1 - m; g.drawImage(PHOTO[i], -110, -130, 220, 220); g.globalAlpha = 1; }
  if (m > 0) { g.globalAlpha = m; const o = lookOf(CATS[i], i); o.mood = 'happy'; cat(0, 80, .55 * (.6 + .4 * back(m)), o, t + i); g.globalAlpha = 1; }
  if (m > 0 && m < 1) for (let j = 0; j < 8; j++) { const a = j / 8 * 7 + i; star(Math.cos(a) * 90 * m, -30 + Math.sin(a) * 90 * m, 14 * (1 - m) + 4); }
  g.restore(); text('@' + CATS[i].uid, 0, 118, 24, OUT, null, 0); g.restore(); }
function nameWall(t, scroll, dim) {
  const cols = 4, cw = W / cols, rh = 290, n = Math.min(NWALL, CATS.length);
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#efe9ff'); gr.addColorStop(1, '#ffe6ee'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) { const r = Math.floor(i / cols), cx = (i % cols) * cw + cw / 2, cy = 520 + r * rh - scroll; if (cy < 150 || cy > H + 300) continue;
    rrect(cx - cw / 2 + 10, cy - 250, cw - 20, 284, 26); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(58,35,80,.3)'; g.stroke();
    const o = lookOf(CATS[i], i); o.mood = 'happy'; cat(cx + 14, cy - 50, .44, o, t + i * .7);
    if (PHOTO[i]) { const px = cx - cw / 2 + 22, py = cy - 236; g.save(); rrect(px, py, 76, 76, 14); g.clip(); g.drawImage(PHOTO[i], px, py, 76, 76); g.restore(); rrect(px, py, 76, 76, 14); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); }
    else { const px = cx - cw / 2 + 22, py = cy - 236; rrect(px, py, 70, 52, 14); fillStroke('#ffffff', 3); text('💬', px + 35, py + 27, 28, OUT, null, 0); }
    let nm = '@' + CATS[i].uid; g.font = '700 24px Fredoka'; while (g.measureText(nm).width > cw - 30) nm = nm.slice(0, -2) + '…'; text(nm, cx, cy + 2, 24, OUT, null, 0);
    if (CATS[i].name) text('„' + CATS[i].name + '"', cx, cy - 214, 26, '#c4384f', null, 0); }
  if (dim > 0) { g.fillStyle = `rgba(40,20,60,${.55 * dim})`; g.fillRect(0, 0, W, H); }
}
function karton(x, y, k, t) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-330, -420, 660, 420, 12); fillStroke('#e1b27a', 7); g.fillStyle = 'rgba(150,100,50,.35)'; g.fillRect(-310, -230, 620, 14);
  for (const sx of [-1, 1]) { g.save(); g.translate(sx * 330, -420); g.rotate(sx * -.6 + Math.sin(t * 3) * .03); rrect(sx > 0 ? 0 : -250, -24, 250, 48, 8); fillStroke('#d9a86a', 6); g.restore(); }
  text('FÜR ALLE', 0, -300, 84, '#8a5a2a', null, 0); text('♥', 0, -150, 90, '#ff7ab6', null, 0); g.restore(); }

// ===================== Tag 3 scenes =====================
const PINK = '#ff7ab6', RED = '#ff3b4f', GREEN = '#3fbf6a';
// scene label: tape strip at the top (with an optional small white sub-label)
function tape(txt, k, sub, col = PINK) { if (k <= .01) return; g.save(); g.translate(W / 2, 330); g.rotate(-.035); g.scale(k, k);
  g.font = '700 66px Fredoka'; const w = g.measureText(txt).width + 90; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 12; g.shadowOffsetY = 6;
  g.beginPath(); g.moveTo(-w / 2, -50); g.lineTo(w / 2, -50); g.lineTo(w / 2 - 18, 0); g.lineTo(w / 2, 50); g.lineTo(-w / 2, 50); g.lineTo(-w / 2 + 18, 0); g.closePath(); g.fillStyle = col; g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); text(txt, 0, 3, 66, '#ffffff', OUT, 10);
  if (sub) { g.font = '700 36px Fredoka'; const sw = g.measureText(sub).width + 40; rrect(-sw / 2, 66, sw, 54, 10); fillStroke('#ffffff', 5); text(sub, 0, 94, 36, OUT, null, 0); }
  g.restore(); }
function sticker(txt, x, y, k, col = RED, rot = -.06, size = 44) { if (k <= .01) return; g.save(); g.translate(x, y); g.rotate(rot); g.scale(k, k); g.font = `700 ${size}px Fredoka`;
  const w = g.measureText(txt).width + 46; rrect(-w / 2, -size * .8, w, size * 1.6, 12); fillStroke(col, 5); text(txt, 0, 2, size, '#ffffff', OUT, 8); g.restore(); }
function confetti(t, t0, k) { if (k <= .01) return; for (let i = 0; i < 50; i++) { const ph = ((t - t0) * .45 + i / 50) % 1; g.save(); g.globalAlpha = k; g.translate((i * 173) % W, ph * H); g.rotate(t * 3 + i); g.fillStyle = ['#ff7ab6', '#a98bff', '#5fd3a8', '#ffe08a'][i % 4]; g.fillRect(-12, -6, 24, 12); g.restore(); } }
const headTop = (y, s) => y - 300 * s;   // top of a kitten head drawn with cat(x, y, s)
function chefHat(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); rrect(-62, -10, 124, 40, 10); fillStroke('#ffffff', 6);
  g.beginPath(); for (const [dx, r] of [[-46, 40], [0, 54], [46, 40]]) { g.moveTo(dx + r, -40); g.arc(dx, -40, r, 0, 7); } fillStroke('#ffffff', 6); g.fillStyle = '#fff'; g.fillRect(-60, -30, 120, 28); g.restore(); }
function helmet(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.arc(0, 20, 118, Math.PI, 0); g.closePath(); fillStroke('#e8352f', 7);
  ell(0, 22, 150, 22); fillStroke('#c42620', 6); rrect(-30, -84, 60, 74, 12); fillStroke('#ffd23f', 5); text('1', 0, -46, 44, OUT, null, 0); g.restore(); }
function doener(x, y, s, r = .2) { g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s);
  g.beginPath(); g.arc(0, 0, 110, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); fillStroke('#f2c27a', 7);
  g.beginPath(); g.arc(0, 4, 84, Math.PI * 1.1, Math.PI * 1.9); g.lineTo(60, -10); g.lineTo(-60, -10); g.closePath(); g.fillStyle = '#9a5a2e'; g.fill();
  for (let i = 0; i < 7; i++) { ell(-60 + i * 20, -52 - (i % 2) * 8, 13, 9); g.fillStyle = i % 3 ? '#6ccf5a' : '#ff5a4a'; g.fill(); }
  ell(0, -16, 70, 10); g.fillStyle = '#ffffff'; g.fill(); g.restore(); }
// buildings of the village
function well(x, y, k) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-120, -120, 240, 120, 18); fillStroke('#b7aab8', 7); for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { rrect(-110 + i * 56 + (r % 2) * 26, -110 + r * 56, 50, 46, 8); g.lineWidth = 4; g.strokeStyle = 'rgba(58,35,80,.4)'; g.stroke(); }
  ell(0, -120, 120, 26); fillStroke('#6fc2ff', 7);
  for (const sx of [-1, 1]) { g.fillStyle = '#8a5230'; g.fillRect(sx * 100 - 10, -320, 20, 200); g.lineWidth = 6; g.strokeStyle = OUT; g.strokeRect(sx * 100 - 10, -320, 20, 200); }
  g.beginPath(); g.moveTo(-160, -300); g.lineTo(0, -410); g.lineTo(160, -300); g.closePath(); fillStroke('#e8735a', 7); g.fillStyle = '#8a5230'; g.fillRect(-100, -250, 200, 14);
  g.lineWidth = 4; g.strokeStyle = OUT; g.beginPath(); g.moveTo(0, -244); g.lineTo(0, -170); g.stroke(); rrect(-24, -172, 48, 40, 8); fillStroke('#c98a52', 5); g.restore(); }
function fishStand(x, y, k, t) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-170, -190, 340, 190, 14); fillStroke('#c98a52', 7);
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-190 + i * 63, -380); g.lineTo(-190 + (i + 1) * 63, -380); g.lineTo(-190 + (i + 1) * 63, -330); g.quadraticCurveTo(-190 + (i + .5) * 63, -300, -190 + i * 63, -330); g.closePath(); fillStroke(i % 2 ? '#ffffff' : '#4fa8ff', 5); }
  for (const sx of [-1, 1]) { g.fillStyle = '#8a5230'; g.fillRect(sx * 160 - 9, -330, 18, 150); }
  rrect(-120, -460, 240, 80, 16); fillStroke('#ffffff', 6); text('FISCH', 0, -418, 52, '#2f7fd6', null, 0);
  for (let i = 0; i < 3; i++) { g.save(); g.translate(-90 + i * 90, -230 + Math.sin(t * 4 + i) * 4); ell(0, 0, 40, 20); fillStroke('#8fd0ff', 5); g.beginPath(); g.moveTo(36, 0); g.lineTo(64, -20); g.lineTo(64, 20); g.closePath(); fillStroke('#8fd0ff', 5); ell(-20, -4, 5, 5); g.fillStyle = OUT; g.fill(); g.restore(); }
  g.restore(); }
function fireStation(x, y, k) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-180, -330, 360, 330, 12); fillStroke('#e8463c', 7); g.beginPath(); g.moveTo(-200, -320); g.lineTo(0, -430); g.lineTo(200, -320); g.closePath(); fillStroke('#a8302a', 7);
  rrect(-120, -210, 240, 210, 14); fillStroke('#ffffff', 6); for (let i = 1; i < 5; i++) { g.fillStyle = 'rgba(58,35,80,.25)'; g.fillRect(-116, -210 + i * 42, 232, 5); }
  rrect(-150, -300, 300, 70, 14); fillStroke('#ffffff', 5); text('FEUERWEHR', 0, -264, 46, '#e8352f', null, 0);
  ell(0, -370, 26, 26); fillStroke('#ffd23f', 5); g.restore(); }
function townSign(x, y, k, name, sub) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k);
  for (const sx of [-1, 1]) { g.fillStyle = '#9aa3ad'; g.fillRect(sx * 200 - 12, -40, 24, 400); g.lineWidth = 6; g.strokeStyle = OUT; g.strokeRect(sx * 200 - 12, -40, 24, 400); }
  rrect(-360, -230, 720, 300, 22); fillStroke('#ffd23f', 8); rrect(-336, -206, 672, 252, 14); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke();
  text(name, 0, -110, 104, OUT, null, 0); text(sub, 0, -10, 46, OUT, null, 0); g.restore(); }
function stamp(x, y, k, txt) { if (k <= .01) return; const s = lerp(2.4, 1, ease(k, 0, 1)); g.save(); g.translate(x, y); g.rotate(-.18); g.scale(s, s); g.globalAlpha = cl(k * 2);
  g.font = '700 84px Fredoka'; const w = g.measureText(txt).width + 60; rrect(-w / 2, -66, w, 132, 18); g.lineWidth = 12; g.strokeStyle = '#e8352f'; g.stroke(); text(txt, 0, 4, 84, '#e8352f', null, 0); g.restore(); }
function profileCard(k, n, ring, t) { if (k <= .01) return; const x = 90, y = 450, w = W - 180, h = 300; g.save(); g.translate(0, (1 - k) * -500);
  g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 30; g.shadowOffsetY = 10; rrect(x, y, w, h, 40); g.fillStyle = '#ffffff'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
  g.save(); ell(x + w - 140, y + 140, 92, 92); g.clip(); g.fillStyle = '#d9efff'; g.fillRect(x + w - 240, y + 40, 200, 200); cat(x + w - 140, y + 310, .62, Object.assign({ mood: 'happy' }, MOMO), t); g.restore();
  ell(x + w - 140, y + 140, 92, 92); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
  text('Momo', x + 50, y + 70, 56, '#1d1d1f', null, 0, 'left'); text('@3dzebra', x + 50, y + 122, 32, '#8a8a92', null, 0, 'left');
  text(fmt(n), x + 50, y + 210, 92, '#1d1d1f', null, 0, 'left'); text('Follower', x + 50, y + 268, 34, '#8a8a92', null, 0, 'left');
  if (ring > .01) { g.save(); g.lineWidth = 9; g.strokeStyle = RED; g.beginPath(); g.ellipse(x + 175, y + 215, 160, 66, -.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); g.stroke(); g.restore(); }
  g.restore(); }
function goalCard(k, n, t) { if (k <= .01) return; const x = 110, y = 470, w = W - 220; g.save(); g.translate(W / 2, y + 230); g.scale(k, k); g.translate(-W / 2, -(y + 230));
  rrect(x, y, w, 460, 40); fillStroke('#ffffff', 7);
  text('BRÜCKE', W / 2, y + 90, 96, OUT, null, 0); text(`ab ${fmt(GOAL)} Kätzchen`, W / 2, y + 170, 44, '#8a8a92', null, 0);
  const bx = x + 60, bw = w - 120, by = y + 230; rrect(bx, by, bw, 76, 38); fillStroke('#eadccb', 5); const f = cl(n / GOAL);
  rrect(bx, by, Math.max(76, bw * f), 76, 38); const gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ff5a8e'); gr.addColorStop(1, '#ffa06a'); g.fillStyle = gr; g.fill(); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
  text(`${fmt(n)} / ${fmt(GOAL)}`, W / 2, by + 40, 46, '#ffffff', OUT, 8);
  text(`NOCH ${fmt(GOAL - n)}`, W / 2, y + 390, 58, RED, null, 0); g.restore(); }
function ladder(k, y) { if (k <= .01) return; const steps = LADDER;
  g.save(); g.globalAlpha = k; steps.forEach(([n, v, done], i) => { const x = 210 + i * 330; rrect(x - 140, y - 70, 280, 140, 30); fillStroke(done ? '#d9f7e2' : '#ffffff', 6);
    text((done ? '✓ ' : '') + n, x, y - 18, 48, done ? '#1f8a45' : OUT, null, 0); text('ab ' + v, x, y + 36, 32, '#8a8a92', null, 0);
    if (i < 2) text('›', x + 165, y, 70, OUT, null, 0); }); g.restore(); }
function ausweis(k, t) { if (k <= .01) return; const x = 120, y = 520, w = W - 240, h = 560; g.save(); g.translate(W / 2, y + h / 2); g.rotate(-.04 + Math.sin(t * 2) * .01); g.scale(k, k); g.translate(-W / 2, -(y + h / 2));
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 30; rrect(x, y, w, h, 36); g.fillStyle = '#ffe3ef'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
  rrect(x, y, w, 120, 36); g.fillStyle = PINK; g.fill(); g.fillRect(x, y + 60, w, 60); text('DORFAUSWEIS', W / 2, y + 62, 64, '#ffffff', OUT, 9);
  rrect(x + 50, y + 170, 280, 330, 20); fillStroke('#ffffff', 6); g.save(); rrect(x + 50, y + 170, 280, 330, 20); g.clip(); g.globalAlpha = .9;
  cat(x + 190, y + 560, .9, { c: '#cfc4dd', c2: '#e9e2f2', mood: 'happy' }, t); g.restore(); text('?', x + 190, y + 300, 120, '#ffffff', OUT, 10);
  text('Name:', x + 380, y + 210, 40, '#8a8a92', null, 0, 'left'); text('DU', x + 380, y + 270, 76, OUT, null, 0, 'left');
  text('Nr.', x + 380, y + 350, 40, '#8a8a92', null, 0, 'left'); text(fmt(FOLLOWERS + 1), x + 380, y + 405, 60, OUT, null, 0, 'left');
  text('Flockes Dorf · Tag 3', x + 380, y + 470, 32, '#8a8a92', null, 0, 'left'); g.restore(); }
function commentBox(k, typed, y = 1240) { if (k <= .01) return; const x = 110, w = W - 220; g.save(); g.globalAlpha = cl(k * 1.5); g.translate(0, (1 - k) * 200);
  rrect(x, y, w, 120, 60); fillStroke('#ffffff', 6); ell(x + 62, y + 60, 36, 36); g.fillStyle = '#d6cde2'; g.fill(); text('du', x + 62, y + 62, 30, '#ffffff', null, 0);
  text(typed || 'Kommentar hinzufügen…', x + 120, y + 62, 50, typed ? '#1d1d1f' : '#a8a8b0', null, 0, 'left');
  if (typed) { ell(x + w - 70, y + 60, 36, 36); g.fillStyle = PINK; g.fill(); text('↑', x + w - 70, y + 60, 44, '#fff', null, 0); }
  g.restore(); }
function fence(y, dark) { for (let i = 0; i < 10; i++) { const x = 40 + i * 112; g.beginPath(); g.moveTo(x - 30, y + 220); g.lineTo(x - 30, y + 40); g.lineTo(x, y); g.lineTo(x + 30, y + 40); g.lineTo(x + 30, y + 220); g.closePath(); fillStroke(dark ? '#6b6476' : '#fff3e6', 5); }
  g.fillStyle = dark ? '#4e4858' : '#e8d6c4'; g.fillRect(0, y + 70, W, 20); g.fillRect(0, y + 160, W, 20); }
const KATER = { c: '#26222b', c2: '#3a3442', ear: '#26222b' };
function kater(x, y, s, t, glow = 1) { cat(x, y, s, Object.assign({ mood: 'neutral', tail: t * 1.2, blink: 0 }, KATER), t);
  for (const sx of [-1, 1]) { const ex = x + sx * 48 * s, ey = y - 192 * s; g.save(); g.shadowColor = '#ffe24a'; g.shadowBlur = 30 * glow; ell(ex, ey, 26 * s, 30 * s); g.fillStyle = '#ffd21f'; g.fill(); g.shadowColor = 'transparent';
    ell(ex, ey, 7 * s, 26 * s); g.fillStyle = '#1a1420'; g.fill(); g.restore();
    g.lineWidth = 9 * s; g.strokeStyle = '#ffffff'; g.globalAlpha = .7; g.beginPath(); g.moveTo(ex - sx * 36 * s, ey - 50 * s); g.lineTo(ex + sx * 26 * s, ey - 34 * s); g.stroke(); g.globalAlpha = 1; } }
function grey(k) { if (k <= .01) return; g.save(); g.globalCompositeOperation = 'saturation'; g.globalAlpha = k; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); g.restore(); g.fillStyle = `rgba(30,25,50,${.35 * k})`; g.fillRect(0, 0, W, H); }
function crowd(t, n, mood = 'happy', frozen = 0) { for (let i = 0; i < Math.min(n, CROWD.length); i++) { const c = CROWD[i]; const o = lookOf(CATS[c.k], c.k); o.mood = mood;
  cat(c.x, c.y - (frozen ? 0 : Math.abs(Math.sin(t * 6 + c.ph)) * 16), c.s * pop(t, tw.heute + i * .012, .25), o, frozen ? 0 : t + c.ph); } }
function star5(x, y, r, col) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); fillStroke(col, 5); }


// ===================== Momo scenes =====================
const BLUE = '#3f9bff', TEAL = '#2fb8c8';
const MOMO = { c: '#8e97a6', c2: '#e8ecf2' };
const momo = (x, y, s, o, t) => cat(x, y, s, Object.assign({}, MOMO, o), t);
// sea + island (day / night / storm)
function sea(t, mode = 'day', top = 1080) {
  const sk = g.createLinearGradient(0, 0, 0, top); const c = { day: ['#8fd3ff', '#e9f7ff'], night: ['#0b1230', '#26305e'], storm: ['#2a3046', '#56607a'] }[mode];
  sk.addColorStop(0, c[0]); sk.addColorStop(1, c[1]); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  if (mode === 'day') { ell(860, 420, 80, 80); fillStroke('#ffe08a', 6); for (const [cx, cy, s_] of [[220, 560, 1], [720, 640, .8]]) { g.save(); g.translate(cx + (t * 8) % 60, cy); g.scale(s_, s_); g.beginPath(); for (const [dx, dy, r] of [[-70, 10, 50], [-20, -20, 64], [40, 0, 56], [90, 16, 40]]) { g.moveTo(dx + r, dy); g.arc(dx, dy, r, 0, 7); } fillStroke('#ffffff', 6); g.restore(); } }
  if (mode === 'night') { for (let i = 0; i < 40; i++) { g.fillStyle = '#fff'; g.fillRect((i * 137) % W, 260 + (i * 71) % 700, 3, 3); } ell(840, 420, 50, 50); g.fillStyle = '#fff6cf'; g.fill(); }
  const sw = g.createLinearGradient(0, top, 0, H); sw.addColorStop(0, mode === 'day' ? '#4fb4e6' : mode === 'night' ? '#14204a' : '#2c4058'); sw.addColorStop(1, mode === 'day' ? '#2f7fc6' : mode === 'night' ? '#0a1028' : '#1c2a3e');
  g.fillStyle = sw; g.fillRect(0, top, W, H - top);
  const amp = mode === 'storm' ? 30 : mode === 'night' ? 2 : 8; g.strokeStyle = mode === 'day' ? 'rgba(255,255,255,.7)' : 'rgba(180,200,255,.35)'; g.lineWidth = 6;
  for (let r = 0; r < 9; r++) { const y = top + 40 + r * 95; g.beginPath(); for (let x = -40; x <= W + 40; x += 30) g.lineTo(x, y + Math.sin(x * .02 + t * (mode === 'storm' ? 5 : 2) + r) * amp); g.stroke(); }
}
function island(t, night = 0, cx = W / 2, cy = 1430, s = 1) { g.save(); g.translate(cx, cy); g.scale(s, s);
  ell(0, 20, 560, 150); fillStroke(night ? '#6a6150' : '#f3d79a', 7); ell(0, 0, 500, 120); g.fillStyle = night ? '#7a705c' : '#f8e3b0'; g.fill();
  // palm
  g.save(); g.translate(-330, -10); g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 46; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(40, -220, 10, -430); g.stroke(); g.strokeStyle = night ? '#6a5040' : '#b07a4a'; g.lineWidth = 34; g.stroke();
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .55 + Math.sin(t * 2 + i) * .04; g.save(); g.translate(10, -430); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(110, -60, 230, 20); g.quadraticCurveTo(110, 10, 0, 0); fillStroke(night ? '#2f5a40' : '#4fbf6a', 6); g.restore(); }
  ell(30, -420, 22, 22); fillStroke('#8a5a3a', 5); g.restore(); g.restore(); }
function boatBasket(x, y, s, t) { g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3) * .12); g.scale(s, s); g.beginPath(); g.moveTo(-170, -60); g.quadraticCurveTo(0, 90, 170, -60); g.lineTo(150, 20); g.quadraticCurveTo(0, 110, -150, 20); g.closePath(); fillStroke('#c98a52', 7);
  g.strokeStyle = 'rgba(80,40,10,.35)'; g.lineWidth = 5; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 40, -40 + Math.abs(i) * 4); g.lineTo(i * 40, 40 - Math.abs(i) * 6); g.stroke(); } g.restore(); }
function rain(t, k = 1) { g.save(); g.globalAlpha = k; g.strokeStyle = 'rgba(200,215,255,.5)'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 220; i++) { const x = (i * 97.3 + t * 160) % (W + 200) - 100, y = (i * 211.7 + t * 1600) % (H + 200) - 100; g.moveTo(x, y); g.lineTo(x - 16, y + 50); } g.stroke(); g.restore(); }
function catHouse(x, y, k) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k); rrect(-150, -220, 300, 220, 12); fillStroke('#ffd3e2', 7); g.beginPath(); g.moveTo(-180, -210); g.lineTo(0, -360); g.lineTo(180, -210); g.closePath(); fillStroke('#ff6f91', 7);
  ell(0, -80, 60, 70); g.fillStyle = '#5a3a2a'; g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 30, -330); g.lineTo(sx * 52, -390); g.lineTo(sx * 74, -320); fillStroke('#ff6f91', 6); } g.restore(); }
function kiosk(x, y, k, t, label = 'KIOSK') { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k);
  rrect(-160, -260, 320, 260, 10); fillStroke('#cde9ff', 7); rrect(-120, -170, 240, 120, 8); fillStroke('#ffffff', 5);
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-180 + i * 72, -290); g.lineTo(-180 + (i + 1) * 72, -290); g.lineTo(-180 + (i + 1) * 72, -245); g.quadraticCurveTo(-180 + (i + .5) * 72, -215, -180 + i * 72, -245); g.closePath(); fillStroke(i % 2 ? '#ffffff' : '#ff6f91', 5); }
  rrect(-150, -380, 300, 76, 16); fillStroke('#ffffff', 6); text(label, 0, -341, 46, BLUE, null, 0);
  for (let i = 0; i < 3; i++) { const cx = -70 + i * 70, cy = -110 + Math.sin(t * 3 + i) * 2; rrect(cx - 24, cy - 28, 48, 56, 6); fillStroke(['#ffc75f', '#6fd3ff', '#a98bff'][i], 4); text('🐟', cx, cy, 24, OUT, null, 0); } g.restore(); }
function bigTree(x, y, k) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(1, k);
  for (const [py, w] of [[0, 220], [-300, 190], [-600, 170], [-880, 150]]) { rrect(-w / 2, py - 50, w, 50, 16); fillStroke('#7fb4e6', 6); }
  for (let i = 0; i < 3; i++) { rrect(-28, -300 * (i + 1), 56, 250, 8); fillStroke('#d9b98a', 6); }
  g.restore(); if (k > .9) { g.save(); g.translate(x, y - 950); for (const [dx, dy, r] of [[-60, 0, 50], [0, -30, 64], [60, 0, 50]]) { ell(dx, dy, r, r * .7); fillStroke('#ffffff', 6); } g.restore(); } }
function dog(x, y, s, t, helmet = 1) { g.save(); g.translate(x, y); g.scale(s, s);
  g.globalAlpha = .18; ell(0, 6, 130, 22); g.fillStyle = '#000'; g.fill(); g.globalAlpha = 1;
  g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 36; g.beginPath(); g.moveTo(80, -60); g.quadraticCurveTo(170, -100 + Math.sin(t * 12) * 30, 150, -180); g.stroke(); g.strokeStyle = '#c98a52'; g.lineWidth = 24; g.stroke();
  ell(0, -80, 110, 90); fillStroke('#c98a52', 7); ell(0, -60, 64, 58); g.fillStyle = '#f3dcc0'; g.fill();
  for (const sx of [-1, 1]) { ell(sx * 50, -8, 36, 22); fillStroke('#f3dcc0', 6); }
  g.save(); g.translate(0, -210); for (const sx of [-1, 1]) { g.save(); g.translate(sx * 112, -10); g.rotate(sx * .25); ell(0, 40, 40, 80); fillStroke('#8a5a3a', 7); g.restore(); }
  ell(0, 0, 125, 110); fillStroke('#c98a52', 7); ell(0, 50, 72, 54); g.fillStyle = '#f3dcc0'; g.fill();
  for (const sx of [-1, 1]) { ell(sx * 46, -14, 20, 24); g.fillStyle = '#1b120d'; g.fill(); ell(sx * 46 + 6, -22, 7, 8); g.fillStyle = '#fff'; g.fill(); }
  ell(0, 26, 26, 18); g.fillStyle = '#1b120d'; g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(-26, 62); g.quadraticCurveTo(0, 84, 26, 62); g.stroke();
  ell(18, 84, 18, 22 + Math.sin(t * 10) * 3); g.fillStyle = '#ff7f9a'; g.fill();
  if (helmet) { g.beginPath(); g.arc(0, -50, 112, Math.PI, 0); g.closePath(); fillStroke('#2f6fe0', 7); rrect(-40, -150, 80, 60, 10); fillStroke('#ffd23f', 5); text('★', 0, -118, 40, OUT, null, 0); ell(0, -48, 140, 18); fillStroke('#1f4fb0', 5); }
  g.restore(); g.restore(); }
function chickenHat(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); ell(0, 0, 70, 50); fillStroke('#ffffff', 6); ell(40, -40, 34, 34); fillStroke('#ffffff', 6);
  for (const dx of [28, 42, 56]) { ell(dx, -80, 10, 14); fillStroke('#ff4a4a', 4); } g.beginPath(); g.moveTo(70, -40); g.lineTo(96, -32); g.lineTo(70, -26); g.closePath(); fillStroke('#ffb020', 4); ell(48, -46, 5, 5); g.fillStyle = OUT; g.fill(); g.restore(); }
function homeLights(x, y, t, k = 1) { g.save(); g.globalAlpha = k; ell(x, y + 30, 240, 50); g.fillStyle = '#5fa36a'; g.fill();
  for (let i = 0; i < 9; i++) { const hx = x - 180 + i * 45, hh = 40 + (i * 37) % 50; g.fillStyle = '#e8d6c4'; g.fillRect(hx - 16, y + 10 - hh, 32, hh); g.fillStyle = '#ffd23f'; g.globalAlpha = k * (.6 + .4 * Math.sin(t * 3 + i)); g.fillRect(hx - 6, y - hh + 22, 12, 12); g.globalAlpha = k; }
  g.restore(); }
function passCard(k, t) { if (k <= .01) return; const x = 120, y = 460, w = W - 240, h = 560; g.save(); g.translate(W / 2, y + h / 2); g.rotate(-.04 + Math.sin(t * 2) * .01); g.scale(k, k); g.translate(-W / 2, -(y + h / 2));
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 30; rrect(x, y, w, h, 36); g.fillStyle = '#e6f6ff'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
  rrect(x, y, w, 120, 36); g.fillStyle = BLUE; g.fill(); g.fillRect(x, y + 60, w, 60); text('INSELPASS', W / 2, y + 62, 64, '#ffffff', OUT, 9);
  rrect(x + 50, y + 170, 280, 330, 20); fillStroke('#ffffff', 6); g.save(); rrect(x + 50, y + 170, 280, 330, 20); g.clip(); cat(x + 190, y + 560, .9, { c: '#cfd8e6', c2: '#eef3fa', mood: 'happy' }, t); g.restore(); text('?', x + 190, y + 300, 120, '#ffffff', OUT, 10);
  text('Name:', x + 380, y + 210, 40, '#8a8a92', null, 0, 'left'); text('DU', x + 380, y + 270, 76, OUT, null, 0, 'left');
  text('Nr.', x + 380, y + 350, 40, '#8a8a92', null, 0, 'left'); text(fmt(FOLLOWERS + 1), x + 380, y + 405, 60, OUT, null, 0, 'left');
  text('Momos Insel · 🐟', x + 380, y + 470, 32, '#8a8a92', null, 0, 'left'); g.restore(); }
function shadowFish(x, y, s, t, k = 1) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = .8 * k; g.fillStyle = '#02040c';
  g.beginPath(); g.ellipse(0, 0, 420, 150, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(380, 0); g.lineTo(560, -120 + Math.sin(t * 3) * 20); g.lineTo(560, 120 + Math.sin(t * 3) * 20); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-60, -140); g.lineTo(40, -250); g.lineTo(120, -140); g.closePath(); g.fill(); g.restore(); }

function mayorChain(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 0; i <= 10; i++) { const a = Math.PI * (.12 + .76 * i / 10); ell(Math.cos(a) * 82, -150 + Math.sin(a) * 70, 13, 10, a); fillStroke('#ffd23f', 4); }
  ell(0, -64, 34, 34); fillStroke('#ffc21f', 5); star5(0, -64, 20, '#fff3a0'); g.restore(); }
function mayorHat(x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); ell(0, 0, 120, 26); fillStroke('#3a6b46', 6); rrect(-70, -110, 140, 112, 30); fillStroke('#3a6b46', 6);
  g.fillStyle = '#c9a050'; g.fillRect(-70, -30, 140, 18); g.save(); g.translate(50, -100); g.rotate(.5); ell(0, -40, 10, 46); fillStroke('#ffffff', 4); g.restore(); g.restore(); }
// Momo the mayor: grey kitten with hat + golden chain; wave = raised paw
function mayor(x, y, s, t, o = {}) { momo(x, y, s, Object.assign({ mood: 'happy', paw: o.wave ? '#e8ecf2' : undefined }, o), t); mayorChain(x, y, s); mayorHat(x + 6 * s, headTop(y, s) + 50 * s, s * .95);
  if (o.wave) { g.save(); g.translate(x + 120 * s, y - 200 * s); g.rotate(-.5 + Math.sin(t * 10) * .35); ell(0, -60 * s, 34 * s, 60 * s); fillStroke(MOMO.c, 6); ell(0, -110 * s, 30 * s, 24 * s); fillStroke('#e8ecf2', 5); g.restore(); } }
function gull(x, y, s, t, letter = 0) { g.save(); g.translate(x, y); g.scale(s, s); const fl = Math.sin(t * 9) * .4;
  for (const sx of [-1, 1]) { g.save(); g.translate(sx * 30, -120); g.rotate(sx * (.5 + fl)); ell(sx * 70, 0, 90, 30); fillStroke('#e9eef3', 6); ell(sx * 140, 0, 30, 18); g.fillStyle = '#4a4f5a'; g.fill(); g.restore(); }
  ell(0, -100, 80, 60); fillStroke('#ffffff', 7); ell(0, -190, 60, 55); fillStroke('#ffffff', 7);
  for (const sx of [-1, 1]) { ell(sx * 22, -200, 9, 11); g.fillStyle = OUT; g.fill(); }
  g.beginPath(); g.moveTo(-10, -175); g.lineTo(60, -165); g.lineTo(-10, -150); g.closePath(); fillStroke('#ffb020', 5);
  g.lineWidth = 7; g.strokeStyle = '#ffb020'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 20, -45); g.lineTo(sx * 24, 0); g.stroke(); }
  rrect(-62, -260, 124, 40, 10); fillStroke('#2f6fe0', 5); text('POST', 0, -239, 28, '#fff', null, 0);
  if (letter > 0) { g.save(); g.translate(56, -166); g.rotate(-.2); g.scale(1 - letter * .7, 1 - letter * .7); rrect(-36, -24, 72, 48, 4); fillStroke('#fff6dc', 4); g.beginPath(); g.moveTo(-36, -24); g.lineTo(0, 4); g.lineTo(36, -24); g.lineWidth = 3; g.stroke(); g.restore(); }
  g.restore(); }
function hut(x, y, s, col, name, k = 1, hi = 0) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(s * k, s * k);
  rrect(-60, -80, 120, 80, 6); fillStroke(col[0], 5); g.beginPath(); g.moveTo(-76, -76); g.lineTo(0, -140); g.lineTo(76, -76); g.closePath(); fillStroke(col[1], 5); rrect(-16, -46, 32, 46, 6); fillStroke('#8a5a3a', 4);
  if (name) { g.font = '700 30px Fredoka'; const w = g.measureText(name).width + 26; rrect(-w / 2, 8, w, 42, 21); fillStroke(hi ? '#ffd23f' : '#ffffff', 4); text(name, 0, 30, 30, OUT, null, 0); } g.restore(); }
const HUTC = [['#ffd3e2', '#ff6f91'], ['#d9ccff', '#8f74e8'], ['#c9f0dc', '#3fbf8a'], ['#ffe9b8', '#f0a030'], ['#cde9ff', '#4a9be0']];
const HUTS = []; { let s_ = 3; const r = () => { s_ = (s_ * 16807) % 2147483647; return s_ / 2147483647; }; const NAMES = ['@lina', '@ben_07', '@sara.k', '@jonas', '@mia', '@tom_x', '@lea', '@paul', '@emma', '@finn', '@ella', '@noah'];
  for (let i = 0; i < 36; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); HUTS.push({ x: W / 2 + Math.cos(a) * d * 430, y: 1380 + Math.sin(a) * d * 100, c: HUTC[i % 5], n: i < 12 ? NAMES[i] : '' }); } HUTS.sort((a, b) => a.y - b.y); }
function jobCard(x, y, k, icon, label, col) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k); rrect(-150, -130, 300, 260, 30); fillStroke('#ffffff', 6); text(icon, 0, -40, 96, OUT, null, 0);
  rrect(-130, 40, 260, 66, 20); fillStroke(col, 5); text(label, 0, 74, label.length > 10 ? 30 : 40, '#ffffff', OUT, 6); g.restore(); }
function jetty(k) { if (k <= .01) return; g.save(); g.globalAlpha = cl(k); g.fillStyle = '#b07a4a'; for (let i = 0; i < 8; i++) { const kk = cl(k * 8 - i); if (kk <= 0) break; g.fillRect(700 + i * 45, 1430, 42, 22); g.fillRect(712 + i * 45, 1452, 8, 60); } g.restore(); }
function lighthouse(x, y, k, t) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(1, k);
  g.beginPath(); g.moveTo(-70, 0); g.lineTo(-44, -420); g.lineTo(44, -420); g.lineTo(70, 0); g.closePath(); fillStroke('#ffffff', 7);
  for (const yy of [-90, -250]) { g.fillStyle = '#e8352f'; g.fillRect(-64 + (yy === -250 ? 10 : 0), yy - 40, 128 - (yy === -250 ? 20 : 0), 60); }
  rrect(-56, -500, 112, 80, 10); fillStroke('#ffd23f', 6); g.beginPath(); g.moveTo(-70, -500); g.lineTo(0, -560); g.lineTo(70, -500); g.closePath(); fillStroke('#e8352f', 6); g.restore();
  if (k > .95) { g.save(); g.globalAlpha = .35; g.fillStyle = '#fff6b0'; g.translate(x, y - 460); g.rotate(Math.sin(t * 1.5) * .6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-700, -120); g.lineTo(-700, 120); g.closePath(); g.fill(); g.restore(); } }
function nameplate(k, t) { if (k <= .01) return; g.save(); g.translate(W / 2, 760); g.rotate(-.03 + Math.sin(t * 2) * .01); g.scale(k, k);
  g.fillStyle = '#8a5a3a'; g.fillRect(-14, 80, 28, 300); rrect(-380, -130, 760, 230, 20); fillStroke('#c98a52', 8); rrect(-350, -100, 700, 170, 14); g.lineWidth = 5; g.strokeStyle = '#7a4a2a'; g.stroke();
  text('MORGEN HIER:', 0, -48, 52, '#fff6dc', OUT, 8); text('DEIN NAME', 0, 30, 84, '#ffd23f', OUT, 10); g.restore(); }


// ===================== Isometric island town (always moving): water shimmer, sand, grass, roads, houses with name tags,
// cars on the roads, kittens walking, boats, seagulls, swaying palms, a crane building the next house, jetty + lighthouse.
// isoMap(t, opts) draws it; the camera is opts.z (zoom), opts.fx/fy (focus tile), opts.cy (screen y of the focus).
const TWI = 120, THI = 60, NI = 18, CI = (NI - 1) / 2;
const isoNoise = (i, j) => { const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return v - Math.floor(v); };
const LAND = [], ROAD = [];
for (let i = 0; i < NI; i++) { LAND.push([]); ROAD.push([]); for (let j = 0; j < NI; j++) {
  const d = Math.hypot(i - CI, (j - CI) * 1.05) + (isoNoise(i, j) - .5) * 1.1; LAND[i].push(d < 7.4 ? (d > 6.4 ? 1 : 2) : 0);   // 1 = sand, 2 = grass
  ROAD[i].push(LAND[i][j] === 2 && (i === 6 || i === 11 || j === 6 || j === 11)); } }
const SPECIAL = { hall: [8, 8], kiosk: [9, 5], lighthouse: [3, 13], crane: [12, 9] };
const isSpecial = (i, j) => Object.values(SPECIAL).some(([a, b]) => a === i && b === j);
const PLOTS7 = []; for (let i = 0; i < NI; i++) for (let j = 0; j < NI; j++) if (LAND[i][j] === 2 && !ROAD[i][j] && !isSpecial(i, j)) PLOTS7.push({ i, j, d: Math.hypot(i - SPECIAL.hall[0], j - SPECIAL.hall[1]) + isoNoise(j, i) * .6 });
PLOTS7.sort((a, b) => a.d - b.d);
const PALMS = []; for (let i = 0; i < NI; i++) for (let j = 0; j < NI; j++) if (LAND[i][j] === 1 && isoNoise(i * 3, j * 7) > .72) PALMS.push([i, j]);
const HNAMES = ['@lina', '@ben_07', '@sara.k', '@jonas', '@mia', '@tom_x', '@lea', '@paul', '@emma', '@finn', '@ella', '@noah', '@ida', '@max', '@luca', '@zoe', '@ben', '@nele', '@timo', '@lia'];
const HCOL = [['#ffd3e2', '#ff6f91'], ['#d9ccff', '#8f74e8'], ['#c9f0dc', '#3fbf8a'], ['#ffe9b8', '#f0a030'], ['#cde9ff', '#4a9be0'], ['#ffd9c2', '#e0702a']];
// road loops for cars / walking kittens: [fixed axis, value, from, to]
const LANES = [['i', 6, 3, 14], ['i', 11, 3, 14], ['j', 6, 3, 14], ['j', 11, 3, 14]].map(([ax, v, a, b]) => { const pts = []; for (let k = a; k <= b; k++) { const [i, j] = ax === 'i' ? [v, k] : [k, v]; if (ROAD[i] && ROAD[i][j]) pts.push([i, j]); } return pts; }).filter(p => p.length > 3);
let ISO = { ox: 0, oy: 0 }, ISOCAM = { z: 1, cx0: 0, cy0: 0, cy: 1100 };
const isoScreen = (i, j, h = 0) => { const [x, y] = iso(i, j, h); return [W / 2 + (x - ISOCAM.cx0) * ISOCAM.z, ISOCAM.cy + (y - ISOCAM.cy0) * ISOCAM.z]; };
const iso = (i, j, h = 0) => [ISO.ox + (i - j) * TWI / 2, ISO.oy + (i + j) * THI / 2 - h];
function rhomb(i, j, fill, stroke = 'rgba(0,0,0,.08)') { const [x, y] = iso(i, j); g.beginPath(); g.moveTo(x, y - THI / 2); g.lineTo(x + TWI / 2, y); g.lineTo(x, y + THI / 2); g.lineTo(x - TWI / 2, y); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = 2; g.strokeStyle = stroke; g.stroke(); } }
function isoBox(i, j, w, hgt, top, left, right, ix = 0, jx = 0) { const [x, y] = iso(i + ix, j + jx); const hw = TWI / 2 * w, hh = THI / 2 * w;
  g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = OUT;
  g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x, y + hh); g.lineTo(x, y + hh - hgt); g.lineTo(x - hw, y - hgt); g.closePath(); g.fillStyle = left; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x + hw, y); g.lineTo(x, y + hh); g.lineTo(x, y + hh - hgt); g.lineTo(x + hw, y - hgt); g.closePath(); g.fillStyle = right; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x, y - hh - hgt); g.lineTo(x + hw, y - hgt); g.lineTo(x, y + hh - hgt); g.lineTo(x - hw, y - hgt); g.closePath(); g.fillStyle = top; g.fill(); g.stroke(); return [x, y - hgt]; }
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(Math.min(255, v * f))); return `rgb(${c[0]},${c[1]},${c[2]})`; };
function isoHouse(i, j, k, col, name, hi = 0, t = 0) { if (k <= .01) return; const hgt = 46 * k; const [x, y] = iso(i, j);
  g.save(); g.translate(x, y); g.scale(k, k); g.translate(-x, -y);
  isoBox(i, j, .62, hgt / k, col[0], shade(col[0], .86), shade(col[0], .72));
  const [rx, ry] = iso(i, j, hgt / k); const hw = TWI / 2 * .62, hh = THI / 2 * .62;   // gable roof
  g.beginPath(); g.moveTo(rx - hw - 6, ry); g.lineTo(rx, ry - 44); g.lineTo(rx + hw + 6, ry); g.lineTo(rx, ry + hh + 4); g.closePath(); g.fillStyle = col[1]; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.moveTo(rx, ry - 44); g.lineTo(rx, ry + hh + 4); g.strokeStyle = shade(col[1], .7); g.lineWidth = 3; g.stroke();
  g.fillStyle = '#fff3c4'; g.fillRect(x - 22, y - 26, 12, 12); g.fillRect(x + 10, y - 22, 12, 12);
  g.restore();
  if (name && k > .6) { g.font = '700 22px Fredoka'; const w = g.measureText(name).width + 18; rrect(x - w / 2, y - 112, w, 30, 15); g.fillStyle = hi ? '#ffd23f' : 'rgba(255,255,255,.92)'; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); text(name, x, y - 97, 22, OUT, null, 0); } }
function isoHall(t) { const [i, j] = SPECIAL.hall; isoBox(i, j, .95, 70, '#f6e6c8', '#e3cfa8', '#cdb88f'); const [x, y] = iso(i, j, 70);
  g.beginPath(); g.moveTo(x - 62, y); g.lineTo(x, y - 60); g.lineTo(x + 62, y); g.lineTo(x, y + 30); g.closePath(); g.fillStyle = '#c4384f'; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = OUT; g.fillRect(x - 2, y - 110, 4, 52); g.fillStyle = '#ffd23f'; g.fillRect(x + 2, y - 110, 34 + Math.sin(t * 5) * 4, 20);
  rrect(x - 52, y + 8, 104, 26, 8); fillStroke('#ffffff', 3); text('RATHAUS', x, y + 21, 18, '#c4384f', null, 0); }
function isoKiosk(t) { const [i, j] = SPECIAL.kiosk; isoBox(i, j, .6, 40, '#cde9ff', '#b2d6f2', '#97c2e6'); const [x, y] = iso(i, j, 40);
  for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#fff' : '#ff6f91'; g.fillRect(x - 36 + k * 18, y - 12, 18, 14); } rrect(x - 40, y - 44, 80, 26, 8); fillStroke('#ffffff', 3); text('KIOSK', x, y - 31, 18, BLUE, null, 0); }
function isoCrane(t, k) { const [i, j] = SPECIAL.crane; const [x, y] = iso(i, j); rhomb(i, j, '#e6d6b8');
  const bh = 40 * cl(k); if (k > 0) isoBox(i, j, .6, Math.max(4, bh), '#fff3c4', '#e8dcae', '#d6c890');
  g.lineWidth = 6; g.strokeStyle = '#f0a030'; g.beginPath(); g.moveTo(x + 40, y + 6); g.lineTo(x + 40, y - 220); g.stroke(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
  const a = Math.sin(t * .7) * .9; g.save(); g.translate(x + 40, y - 220); g.scale(1, .5); g.rotate(a); g.lineWidth = 8; g.strokeStyle = '#f0a030'; g.beginPath(); g.moveTo(-50, 0); g.lineTo(170, 0); g.stroke(); g.restore();
  const hx = x + 40 + Math.cos(a) * 120, hy = y - 220 + Math.sin(a) * 60; g.lineWidth = 2; g.strokeStyle = OUT; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx, hy + 60 + Math.sin(t * 2) * 10); g.stroke();
  g.fillStyle = '#ff8fb1'; g.fillRect(hx - 12, hy + 60 + Math.sin(t * 2) * 10, 24, 14); }
function isoLighthouse(t, k) { if (k <= .01) return; const [i, j] = SPECIAL.lighthouse; const [x, y] = iso(i, j); const h = 190 * k;
  g.beginPath(); g.moveTo(x - 24, y); g.lineTo(x - 16, y - h); g.lineTo(x + 16, y - h); g.lineTo(x + 24, y); g.closePath(); fillStroke('#ffffff', 4); for (const f of [.25, .65]) { g.fillStyle = '#e8352f'; g.fillRect(x - 22 + f * 6, y - h * f - 16, 44 - f * 12, 22); }
  if (k > .95) { rrect(x - 20, y - h - 30, 40, 30, 6); fillStroke('#ffd23f', 4); g.save(); g.globalAlpha = .3; g.fillStyle = '#fff6b0'; g.translate(x, y - h - 15); g.rotate(t * 1.2); g.beginPath(); g.moveTo(0, 0); g.lineTo(500, -40); g.lineTo(500, 40); g.closePath(); g.fill(); g.restore(); } }
function isoJetty(k) { if (k <= .01) return; const n = Math.round(6 * cl(k)); for (let s = 0; s < n; s++) { const [x, y] = iso(16.2 + s * .55, 9); g.fillStyle = '#b07a4a'; g.beginPath(); g.moveTo(x - 30, y); g.lineTo(x, y - 15); g.lineTo(x + 30, y); g.lineTo(x, y + 15); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); } }
function isoPalm(i, j, t) { const [x, y] = iso(i, j); g.lineCap = 'round'; g.lineWidth = 10; g.strokeStyle = OUT; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 50, x + 4, y - 90); g.stroke(); g.lineWidth = 6; g.strokeStyle = '#b07a4a'; g.stroke();
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .7 + Math.sin(t * 2 + i + j) * .08; g.save(); g.translate(x + 4, y - 90); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(30, -16, 56, 6); g.quadraticCurveTo(30, 2, 0, 0); fillStroke('#4fbf6a', 3); g.restore(); } }
function isoCar(lane, u, col) { const L = LANES[lane]; const f = u * (L.length - 1), k = Math.floor(f), r = f - k; const a = L[Math.min(k, L.length - 1)], b = L[Math.min(k + 1, L.length - 1)];
  const [x, y] = iso(lerp(a[0], b[0], r) + .15, lerp(a[1], b[1], r) - .15); g.save(); g.translate(x, y - 10); rrect(-20, -12, 40, 22, 7); fillStroke(col, 3); g.fillStyle = '#bfe6ff'; g.fillRect(-10, -9, 20, 8); g.fillStyle = OUT; g.fillRect(-16, 8, 8, 5); g.fillRect(8, 8, 8, 5); g.restore(); }
function isoWalker(lane, u, look, t) { const L = LANES[lane]; const f = u * (L.length - 1), k = Math.floor(f), r = f - k; const a = L[Math.min(k, L.length - 1)], b = L[Math.min(k + 1, L.length - 1)];
  const [x, y] = iso(lerp(a[0], b[0], r) - .25, lerp(a[1], b[1], r) + .25); cat(x, y - Math.abs(Math.sin(t * 8 + lane)) * 4, .085, Object.assign({ mood: 'happy' }, LOOKS[look]), t); }
function isoBoat(t, ph, r0) { const a = t * .12 + ph, i = CI + Math.cos(a) * r0, j = CI + Math.sin(a) * r0; const [x, y] = iso(i, j); g.save(); g.translate(x, y + Math.sin(t * 3 + ph) * 3);
  g.beginPath(); g.moveTo(-30, -6); g.lineTo(30, -6); g.lineTo(20, 8); g.lineTo(-20, 8); g.closePath(); fillStroke('#ffffff', 3); g.fillStyle = OUT; g.fillRect(-1, -46, 3, 40); g.beginPath(); g.moveTo(2, -44); g.lineTo(26, -12); g.lineTo(2, -12); g.closePath(); fillStroke('#ff8fb1', 3); g.restore(); }
function isoGull(t, ph) { const x = ((t * 70 + ph * 300) % (W + 400)) - 200, y = 520 + Math.sin(t + ph) * 60 + ph * 90, f = Math.sin(t * 9 + ph) * 8; g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 18, y - f); g.quadraticCurveTo(x - 8, y - 10, x, y); g.quadraticCurveTo(x + 8, y - 10, x + 18, y - f); g.stroke(); }
// opts: z, fx, fy (tile coords of the focus), cy, houses (how many plots have houses), named (how many show a name), du (index of "your" house), pop0 (time the newest houses start popping), crane, jetty, light
function isoMap(t, o = {}) {
  const z = o.z || 1, fx = o.fx ?? CI, fy = o.fy ?? CI, cy = o.cy ?? 1100;
  const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#8fd3ff'); sk.addColorStop(1, '#2f8fd0'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, cy); g.scale(z, z); ISO = { ox: 0, oy: 0 }; const [cx0, cy0] = iso(fx, fy); g.translate(-cx0, -cy0); ISOCAM = { z, cx0, cy0, cy };
  for (let i = -6; i < NI + 6; i++) for (let j = -6; j < NI + 6; j++) { if (i >= 0 && j >= 0 && i < NI && j < NI && LAND[i][j]) continue; const s = Math.sin(t * 1.6 + i * .9 + j * 1.3); rhomb(i, j, s > .82 ? '#9fe0ff' : (i + j) % 2 ? '#4fb4e6' : '#47acdf', null); }
  isoJetty(o.jetty || 0);
  const items = [];
  for (let i = 0; i < NI; i++) for (let j = 0; j < NI; j++) { const L = LAND[i][j]; if (!L) continue; rhomb(i, j, ROAD[i][j] ? '#c9c2b8' : L === 1 ? '#f3d79a' : ((i + j) % 2 ? '#8fd67a' : '#86cf72'));
    if (ROAD[i][j]) { const [x, y] = iso(i, j); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x - 6, y - 2, 12, 4); } }
  const nH = o.houses || 0;
  PLOTS7.forEach((p, k) => { if (k < nH) items.push([p.i + p.j, () => isoHouse(p.i, p.j, o.pop0 != null && k >= (o.popFrom || 0) ? pop(t, o.pop0 + (k - (o.popFrom || 0)) * .06, .3) : 1, HCOL[k % 6], k === o.du ? '@DU' : k < (o.named || 0) ? HNAMES[k % HNAMES.length] : '', k === o.du, t)]); });
  PALMS.forEach(([i, j]) => items.push([i + j, () => isoPalm(i, j, t)]));
  items.push([SPECIAL.hall[0] + SPECIAL.hall[1], () => isoHall(t)], [SPECIAL.kiosk[0] + SPECIAL.kiosk[1], () => isoKiosk(t)], [SPECIAL.crane[0] + SPECIAL.crane[1], () => isoCrane(t, o.crane || 0)], [SPECIAL.lighthouse[0] + SPECIAL.lighthouse[1], () => isoLighthouse(t, o.light || 0)]);
  for (let c = 0; c < 5; c++) { const lane = c % LANES.length, u = ((t * (.05 + c * .012) + c * .37) % 2); items.push([0, () => isoCar(lane, u > 1 ? 2 - u : u, ['#ff5a5a', '#ffd23f', '#5fd3a8', '#4a9be0', '#ffffff'][c])]); }
  for (let c = 0; c < 8; c++) { const lane = (c + 1) % LANES.length, u = ((t * (.025 + c * .006) + c * .21) % 2); items.push([0, () => isoWalker(lane, u > 1 ? 2 - u : u, ['ginger', 'tabby', 'calico', 'white', 'black', 'siamese', 'grey', 'tuxedo'][c], t + c)]); }
  items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  for (let b = 0; b < 3; b++) isoBoat(t, b * 2.1, 9.5 + b * .7);
  g.restore();
  for (let k = 0; k < 4; k++) isoGull(t, k);
}

if (ROLES.names) HNAMES.splice(0, HNAMES.length, ...ROLES.names.map(n => '@' + (n.length > 13 ? n.slice(0, 12) + '…' : n)));
const PETLOOK = { yoda: 'black', mini: 'calico', max: 'silver', oskar: 'tabby', milo: 'tabby', flecki: 'golden', socke: 'gingerwhite' };
function petCard(x, y, r, k, name, m, t) { if (k <= .01) return; g.save(); g.translate(x, y); g.rotate(r); g.scale(k, k);
  rrect(-120, -140, 240, 290, 10); fillStroke('#ffffff', 6); g.fillStyle = '#c8d4e0'; g.fillRect(-100, -120, 200, 200);
  g.save(); g.beginPath(); g.rect(-100, -120, 200, 200); g.clip();
  if (PET[name] && m < 1) { g.globalAlpha = 1 - m; g.drawImage(PET[name], -100, -120, 200, 200); g.globalAlpha = 1; } else if (m < 1) { text('📷', 0, -20, 70, OUT, null, 0); }
  if (m > 0) { g.globalAlpha = m; g.fillStyle = '#e6f6ff'; g.fillRect(-100, -120, 200, 200); cat(0, 70, .46 * (.6 + .4 * back(m)), Object.assign({ mood: 'happy', fluffy: name === 'flecki' }, LOOKS[PETLOOK[name]]), t); g.globalAlpha = 1;
    for (let j = 0; j < 6; j++) { const a = j / 6 * 7 + t * 2; star(Math.cos(a) * 70 * m, -20 + Math.sin(a) * 60 * m, 10); } }
  g.restore(); text(name[0].toUpperCase() + name.slice(1), 0, 118, 36, OUT, null, 0); g.restore(); }
function roleCard(x, y, k, icon, label, who, col) { if (k <= .01) return; g.save(); g.translate(x, y); g.scale(k, k); rrect(-420, -70, 840, 140, 40); fillStroke('#ffffff', 6); text(icon, -350, 4, 74, OUT, null, 0);
  text(label, -280, -18, 48, col, null, 0, 'left'); if (who) text(who, -280, 34, 34, '#6a6a72', null, 0, 'left'); g.restore(); }
function letter(k, t, open) { if (k <= .01) return; g.save(); g.translate(W / 2, 760); g.rotate(-.04); g.scale(k, k);
  rrect(-380, -230, 760, 460, 16); fillStroke('#fff6dc', 7); g.lineWidth = 3; g.strokeStyle = 'rgba(120,90,50,.3)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-320, -120 + i * 60); g.lineTo(320, -120 + i * 60); g.stroke(); }
  if (open > 0) { g.globalAlpha = cl(open * 2); text('Ich komme morgen.', 0, -60, 72, '#3a2a6a', null, 0); g.globalAlpha = cl(open * 2 - 1); text('– Der Kapitän', 120, 70, 60, '#c4384f', null, 0); g.globalAlpha = 1; }
  ell(300, -180, 46, 46); fillStroke('#c4384f', 5); text('⚓', 300, -178, 50, '#fff', null, 0); g.restore(); }
function ship(x, y, s, t) { g.save(); g.translate(x, y + Math.sin(t * 2) * 6); g.scale(s, s); g.fillStyle = '#0a0f24'; g.beginPath(); g.moveTo(-220, 0); g.lineTo(220, 0); g.lineTo(170, 70); g.lineTo(-170, 70); g.closePath(); g.fill();
  g.fillRect(-12, -260, 16, 260); g.beginPath(); g.moveTo(8, -250); g.lineTo(170, -40); g.lineTo(8, -40); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-14, -230); g.lineTo(-150, -50); g.lineTo(-14, -50); g.closePath(); g.fill();
  ell(150, 30, 8, 8); g.save(); g.shadowColor = '#ffe28a'; g.shadowBlur = 20; g.fillStyle = '#ffe28a'; g.fill(); g.restore(); g.restore(); }
function isoDoener(t, k) { if (k <= .01) return; const [x, y] = isoScreen(10, 12); g.save(); g.translate(x, y); g.scale(k * ISOCAM.z, k * ISOCAM.z); g.translate(-x, -y);
  rrect(x - 70, y - 90, 140, 90, 8); fillStroke('#ffd9a8', 5); g.fillStyle = '#c4384f'; g.fillRect(x - 76, y - 112, 152, 26); rrect(x - 66, y - 150, 132, 36, 10); fillStroke('#ffffff', 4); text('DÖNER', x, y - 132, 26, '#c4384f', null, 0);
  g.fillStyle = '#9a5a2e'; g.fillRect(x - 10, y - 80, 20, 60); g.restore(); }

function frame(t) {
  if (g.reset) g.reset();
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.globalAlpha = 1;
  const bob = Math.abs(Math.sin(t * 6)) * 14;
  // A: sad hook — last night I sat all alone on the beach and was so sad; nobody wanted to come; not even the seagull wrote
  if (t < tw.dann - .05) { const z = lerp(1.25, 1.05, ease(t, 0, tw.dann)); g.save(); g.translate(W / 2, 1500); g.scale(z, z); g.translate(-W / 2, -1500); sea(t, 'night'); island(t, 1); g.restore();
    momo(W / 2, 1520, 1.05, { mood: 'sad', tear: 1, look: Math.sin(t * .6) * .2 }, t);
    if (t > tw.moewe - .3) { const gx = lerp(1300, -300, ease(t, tw.moewe - .3, tw.dann)); g.save(); g.globalAlpha = .9; gull(gx, 620, .5, t, 0); g.restore(); }
    if (t > tw.keiner - .1) sticker('0 BESUCHER', W / 2, 600, pop(t, tw.keiner - .1), '#6b7a96', -.04, 50); return; }
  // B: and then you came — 70 new residents in one day: jetty AND lighthouse
  if (t < tw.wie - .05) { const sun = ease(t, tw.dann - .1, tw.kamt + .4); isoMap(t, { houses: 70, named: 0, crane: 1, jetty: ramp(t, tw.steg - .2, tw.steg + .5), light: ramp(t, tw.leucht - .2, tw.leucht + .4), z: 1.2, cy: 1250 });
    g.fillStyle = `rgba(10,15,45,${.7 * (1 - sun)})`; g.fillRect(0, 0, W, H);
    const nk = ease(t, tw.siebzig - .1, tw.tag + .4); profileCard(pop(t, tw.siebzig - .2, .3), lerp(YESTERDAY, FOLLOWERS, nk), ease(t, tw.tag, tw.tag + .4), t);
    sticker(`+${FOLLOWERS - YESTERDAY} NEUE`, W / 2, 840, pop(t, tw.tag), GREEN, .06, 60); tape(t < tw.siebzig ? 'UND DANN…' : 'ZIELE ERREICHT ✓✓', 1, null, t < tw.siebzig ? '#a98bff' : GREEN);
    if (t > tw.steg - .1) sticker('STEG ✓', 300, 980, pop(t, tw.steg - .1), '#b07a4a', -.06, 50); if (t > tw.leucht - .1) sticker('LEUCHTTURM ✓', 760, 980, pop(t, tw.leucht - .1), RED, .06, 50); return; }
  // C: as promised — your names are on the beach; we now have a fire brigade, a diver and a sheriff
  if (t < tw.yoda - .05) { const zk = ease(t, tw.namen - .2, tw.strand2 + .4); isoMap(t, { houses: 70, named: t > tw.namen - .2 ? 34 : 0, crane: 1, jetty: 1, light: 1, z: lerp(1.2, 1.7, zk), cy: 1250 });
    tape('WIE VERSPROCHEN', pop(t, tw.wie - .05), 'eure Namen stehen am Strand', BLUE);
    roleCard(W / 2, 600, pop(t, tw.feuer - .1, .3), '🚒', 'FEUERWEHR', ROLES.fire, '#e8352f'); roleCard(W / 2, 760, pop(t, tw.taucher - .1, .3), '🤿', 'TAUCHER', ROLES.diver, '#2f9bff'); roleCard(W / 2, 920, pop(t, tw.sheriff - .1, .3), '⭐', 'SHERIFF', ROLES.sheriff, '#d9a21f'); return; }
  // D: Yoda delivers for the kiosk from today (photo -> drawn black kitten with a cap)
  if (t < tw.mini - .05) { isoMap(t, { houses: 70, named: 34, crane: 1, jetty: 1, light: 1, z: 1.5, fx: 9, fy: 5, cy: 1300 }); g.fillStyle = 'rgba(230,246,255,.35)'; g.fillRect(0, 0, W, H);
    petCard(W / 2, 760, -.04, pop(t, tw.yoda - .15, .35), 'yoda', ramp(t, tw.kiosk - .2, tw.kiosk + .4), t);
    tape('KIOSK-LIEFERANT', pop(t, tw.yoda - .1), ROLES.yoda || 'Yoda', '#f0a030'); sticker('🛵 ab heute', W / 2, 1120, pop(t, tw.kiosk), GREEN, .05, 50); return; }
  // E: Mini, Max, Oskar, Milo, Flecki and Socke moved in too
  if (t < tw.hund - .05) { isoMap(t, { houses: 70, named: 34, crane: 1, jetty: 1, light: 1, z: 1.2, cy: 1250 }); g.fillStyle = 'rgba(230,246,255,.45)'; g.fillRect(0, 0, W, H);
    const P = ['mini', 'max', 'oskar', 'milo', 'flecki', 'socke']; P.forEach((n, i) => { const x = 210 + (i % 3) * 330, y = 640 + Math.floor(i / 3) * 330; petCard(x, y, (i % 2 ? .05 : -.05), pop(t, tw[n] - .15, .3), n, ramp(t, tw.eingez - .3, tw.eingez + .5), t); });
    tape('NEU EINGEZOGEN', pop(t, tw.mini - .1), 'eure Katzen', '#a98bff'); return; }
  // F: and a dog came — Bruno is very jealous now
  if (t < tw.ihr - .05) { sea(t, 'day'); island(t); dog(330, 1500, .8, t, 0); if (t > tw.bruno - .1) sticker('😤 BRUNO', 330, 1180, pop(t, tw.bruno - .1), '#2f6fe0', -.05, 46);
    g.save(); g.translate(760, 1500); const k = pop(t, tw.hund - .1, .4); g.scale(k, k); g.translate(-760, -1500); g.filter = 'saturate(0)'; dog(760, 1500, .8, t + 1, 0); g.filter = 'none'; g.restore();
    if (ROLES.dog) sticker(ROLES.dog, 760, 1180, pop(t, tw.hund), '#ffffff', .05, 36); tape('EIN HUND!', pop(t, tw.hund - .1), null, RED); sticker('SEHR EIFERSÜCHTIG', W / 2, 620, pop(t, tw.eifer), RED, -.04, 54); return; }
  // G: you wanted a Döner shop — it stands
  if (t < tw.ziel - .05) { isoMap(t, { houses: 70, named: 34, crane: 1, jetty: 1, light: 1, z: 1.2, cy: 1250 }); g.fillStyle = 'rgba(255,240,220,.45)'; g.fillRect(0, 0, W, H); kiosk(W / 2, 1450, 1.5 * pop(t, tw.doener - .2, .45), t, 'DÖNER');
    tape('IHR WOLLTET…', pop(t, tw.ihr - .05), null, '#e0702a'); if (ROLES.doener) sticker('Idee: ' + ROLES.doener, W / 2, 620, pop(t, tw.doener), '#ffffff', .03, 40); stamp(W / 2, 1220, ramp(t, tw.steht, tw.steht + .25), 'STEHT ✓'); return; }
  // H: next goal: 100 new residents -> the island gets a cinema
  if (t < tw.doch - .05) { isoMap(t, { houses: 70, named: 34, crane: 1, jetty: 1, light: 1, z: 1.2, cy: 1250 }); g.fillStyle = 'rgba(40,20,60,.4)'; g.fillRect(0, 0, W, H);
    ladder(ramp(t, tw.ziel - .1, tw.ziel + .2), 560); tape('NÄCHSTES ZIEL', pop(t, tw.ziel - .05), null, '#a98bff'); sticker('+100 = KINO 🎬', W / 2, 780, pop(t, tw.kino - .1), GREEN, .05, 64); return; }
  // I: but tonight Gisela didn't eat one letter: "I'm coming tomorrow. — The captain."
  if (t < tw.lassen - .05) { sea(t, 'night', 1180); ship(lerp(1250, 830, ease(t, tw.komme - .3, tw.kapitaen + .6)), 1170, .7, t); island(t, 1, 300, 1520, .6); gull(320, 1440, .55, t, 0);
    letter(pop(t, tw.brief - .1, .4), t, ramp(t, tw.darauf, tw.kapitaen + .2)); tape('HEUTE NACHT', pop(t, tw.doch - .05), null, '#3a3456'); return; }
  // J: do we let him come ashore? the top comment decides
  const dark = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200); dark.addColorStop(0, '#10306a'); dark.addColorStop(1, '#040818'); g.fillStyle = dark; g.fillRect(0, 0, W, H);
  ship(W / 2, 1300, .8, t); mayor(W / 2, 1580, .55, t, { mood: 'wow' });
  const v1 = pop(t, tw.lassen, .3), v2 = pop(t, tw.land, .3);
  for (const [x, lab, col, k] of [[300, 'JA ✓', GREEN, v1], [780, 'NEIN ✗', RED, v2]]) { if (k <= .01) continue; g.save(); g.translate(x, 600); g.scale(k, k); rrect(-200, -90, 400, 180, 40); fillStroke(col, 7); text(lab, 0, 4, 76, '#fff', OUT, 10); g.restore(); }
  tape('AN LAND LASSEN?', pop(t, tw.lassen - .05), null, BLUE); sticker('TOP-KOMMENTAR ENTSCHEIDET 👇', W / 2, 820, pop(t, tw.top), '#ffffff', -.03, 46);
}
window.END = END; window.TW = tw;
window.renderAt = (t, q = .92) => { frame(t); return out.toDataURL('image/jpeg', q); };
window.__done = true;
