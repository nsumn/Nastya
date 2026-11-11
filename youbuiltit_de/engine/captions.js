// Caption layer, rendered separately from the scene (transparent PNG frames -> qtrle .mov, overlaid by ffmpeg).
// Page: captions.html?dir=10_insel   reads ../<dir>/words.json and ../<dir>/captions.json
// captions.json: { "style": "word" | "phrase", "y": 1450, "size": 96, "color": "#fff", "hi": "#5ff0ff", "outline": "#000",
//                  "keys": ["Momo", ...] (word style: these words get the highlight colour),
//                  "show": {"zehn": "10"} (display replacements), "hide": [["Folg", 2]] (hide from that word to the end),
//                  "moves": [[["Folgst", 1], ["Zusammen", 1], 1400]] (between two words use another y) }
const W = 1080, H = 1920, Q = new URLSearchParams(location.search), DIR = Q.get('dir');
const WORDS = await (await fetch(`../${DIR}/words.json`)).json();
const C = Object.assign({ font: 'Fredoka', style: 'word', y: 1450, size: 96, color: '#ffffff', hi: '#ffd23f', outline: '#000000', keys: [], show: {}, hide: [], moves: [] }, await (await fetch(`../${DIR}/captions.json`)).json());
await document.fonts.load(`700 96px ${C.font}`);
const clean = w => w.replace(/[.,!?:]/g, '');
function T(word, n = 1) { let k = 0; for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s; throw new Error('word not found: ' + word + ' #' + n); }
const cl = x => Math.max(0, Math.min(1, x)), ramp = (t, a, b) => cl((t - a) / (b - a));
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const hides = C.hide.map(([w, n]) => T(w, n)), moves = C.moves.map(([[w1, n1], [w2, n2], y]) => [T(w1, n1), T(w2, n2), y]);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
function text(s, x, y, size, fill) { g.font = `700 ${size}px ${C.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size / 6; g.strokeStyle = C.outline; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); }
const PHR = []; { let cur = []; WORDS.forEach((w, i) => { cur.push(i); if (/[.,!?]$/.test(w[0]) || cur.length >= 3) { PHR.push(cur); cur = []; } }); if (cur.length) PHR.push(cur); }
const disp = w => C.show[clean(w)] || w.replace(/,$/, '');
function frame(t) {
  g.clearRect(0, 0, W, H);
  if (hides.some(h => t >= h - .2)) return;
  let y = C.y; for (const [a, b, yy] of moves) if (t >= a - .1 && t < b + .1) y = yy;
  let wi = -1; for (let i = 0; i < WORDS.length; i++) if (WORDS[i][1] <= t + .02) wi = i; if (wi < 0 || t > WORDS[wi][2] + .5) return;
  if (C.style === 'word') {
    let w = clean(WORDS[wi][0]); const hi = C.keys.includes(w); w = C.show[w] || w;
    let fs = C.size; g.font = `700 ${fs}px ${C.font}`; while (g.measureText(w).width > W - 120) { fs -= 4; g.font = `700 ${fs}px ${C.font}`; }
    text(w, W / 2, y, fs, hi ? C.hi : C.color); return;
  }
  const ph = PHR.find(p => p.includes(wi)); if (!ph) return; const ws = ph.map(i => disp(WORDS[i][0]));
  let fs = C.size; g.font = `700 ${fs}px ${C.font}`; const sp = fs * .46, tot = () => ws.reduce((a, w) => a + g.measureText(w).width, 0) + sp * (ws.length - 1);
  while (tot() > W - 100) { fs -= 4; g.font = `700 ${fs}px ${C.font}`; }
  let x = W / 2 - tot() / 2;
  ph.forEach((i, j) => { g.font = `700 ${fs}px ${C.font}`; const w = ws[j], mw = g.measureText(w).width; if (i > wi) { x += mw + sp; return; }
    const on = i === wi, k = on ? pop(t, WORDS[i][1], .18) : 1, s = on ? 1 + .14 * k : 1;
    g.save(); g.translate(x + mw / 2, y); g.scale(s, s); text(w, 0, 0, fs, on ? C.hi : C.color); g.restore(); x += mw + sp; });
}
window.END = WORDS[WORDS.length - 1][2] + 1.8;
window.renderAt = t => { frame(t); return out.toDataURL('image/png'); };
window.__done = true;
