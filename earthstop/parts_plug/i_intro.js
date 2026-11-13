// =================== INTRO VARIANTS for the photo-news format (0 → S[1] ≈ 3.3 s, "Here's what happened in America in the last 24 hours") ===================
// index_intro.html?v=D|E|F|C|O  — D story mosaic, E flag + flip calendar + ticker, F White House 2.5D parallax, C real footage frames, O overlay only (transparent, over the 3D map intros A/B)
// Every intro shows the date (her rule Nov 13: a date like dailyplug; NO channel name yet).
const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const smooth = (a, b, x) => { const k = span(x, a, b); return k * k * (3 - 2 * k); };
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const V = (new URLSearchParams(location.search).get('v') || 'D')[0];
const T1 = SENT[1];   // story 1 starts
document.documentElement.classList.add('v' + V);
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 5; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.2)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.08 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const STORIES = ['huang', 'flatbush', 'colom', 'peltola', 'bessent', 'tomb', 'flame', 'massie', 'putin', 'darchiev', 'hegseth', 'brooklyn'];
const TICK = 'NVIDIA CEO JENSEN HUANG RESIGNS  •  BROOKLYN BUILDING COLLAPSE: 8 DEAD  •  MISSISSIPPI ELECTS A DEMOCRAT  •  ALASKA STILL COUNTING  •  BESSENT MOVES TO A MILITARY BASE  •  KENNEDYS SUE OVER TRUMP’S ARCH  •  ';
// ---- E: waving flag on a 2D canvas ----
const FC = document.createElement('canvas'); FC.width = 1080; FC.height = 1920; FC.id = 'flag';
function drawFlag(t) { const g = FC.getContext('2d'); g.clearRect(0, 0, 1080, 1920); const W0 = 1500, H0 = 790, x0 = -210, y0 = 520, NX = 60, NY = 13;
  const P = (u, v) => { const ph = u * 7 - t * 5.5, a = 26 * u + 6; return [x0 + u * W0 + 8 * Math.sin(ph * 0.7), y0 + v * H0 + a * Math.sin(ph) + 14 * u * Math.sin(ph * 0.5 + v * 2), 0.78 + 0.22 * Math.cos(ph)]; };
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const u0 = i / NX, u1 = (i + 1) / NX, v0 = j / NY, v1 = (j + 1) / NY; const a = P(u0, v0), b = P(u1, v0), c = P(u1, v1), d = P(u0, v1);
    const inCanton = u0 < 0.4 && j < 7, base = inCanton ? [30, 45, 110] : j % 2 ? [245, 245, 245] : [200, 30, 45], L = a[2];
    g.fillStyle = `rgb(${base.map(x => Math.round(x * L)).join(',')})`; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
    if (inCanton && (i + j) % 2 === 0 && i % 2 === 0) { const m = P(u0 + 0.5 / NX, v0 + 0.5 / NY); g.fillStyle = `rgba(255,255,255,${0.9 * L})`; g.font = '22px Inter'; g.fillText('★', m[0] - 8, m[1] + 8); } } }
function renderAt(t) { let h = '';
  const out = smooth(T1 - 0.25, T1, t);   // the intro hands over to story 1 with a quick push + fade to white
  if (V === 'D') {   // story mosaic: today's photos land on a tilted grid, then the camera dives into story 1
    const cols = 3, w = 330, hh = 420; h += `<div id="mos" style="transform:translate(-50%,-50%) rotate(${(-8 + 4 * t).toFixed(2)}deg) scale(${(1.0 + 0.12 * t + 2.2 * ease(span(t, T1 - 0.55, T1))).toFixed(3)})">`;
    STORIES.forEach((k, i) => { const a = 0.05 + i * 0.13, kk = pop(t, a, 0.28); const r = Math.floor(i / cols), c = i % cols;
      h += `<div class="tile" style="left:${c * (w + 18)}px;top:${r * (hh + 18)}px;width:${w}px;height:${hh}px;transform:scale(${kk.toFixed(3)}) rotate(${((i % 2 ? 1 : -1) * 3 * (1 - easeOut(span(t, a, a + 0.4)))).toFixed(2)}deg);opacity:${t < a ? 0 : 1}"><img src="assets/news/big/${k}.jpg"></div>`; });
    h += '</div><div id="vig"></div>'; }
  if (V === 'E') {   // flag + flip calendar + ticker
    drawFlag(t); const flip = span(t, 0.55, 0.95); const d0 = flip < 0.5 ? '12' : '13', ang = flip < 0.5 ? -180 * flip : 180 * (1 - flip);
    h += `<div id="sweep" style="background-position:${(-600 + 1400 * ((t * 0.45) % 1)).toFixed(0)}px 0"></div><div id="cal" style="transform:translateX(-50%) scale(${pop(t, 0.05, 0.35).toFixed(3)}) rotate(-3deg)"><div class="m">NOVEMBER 2026</div><div class="dd"><span style="display:inline-block;transform:perspective(600px) rotateX(${ang.toFixed(1)}deg)">${d0}</span></div><div class="dw">${flip < 0.5 ? 'THURSDAY' : 'FRIDAY'}</div></div>`;
    h += `<div id="tick"><div class="lbl">BREAKING</div><div class="crawl" style="transform:translateX(${(-380 * t).toFixed(0)}px)">${TICK + TICK}</div></div>`; }
  if (V === 'F') {   // 2.5D parallax: sky slower than the building, building slower than the lawn (three crops of one photo)
    const u = ease(span(t, 0, T1)); h += `<div class="lay" style="transform:scale(${(1.08 + 0.05 * u).toFixed(3)}) translateY(${(10 * u).toFixed(1)}px)"><img src="assets/news/big/wh.jpg"></div>`;
    h += `<div class="lay mid" style="transform:scale(${(1.1 + 0.16 * u).toFixed(3)}) translateY(${(-6 * u).toFixed(1)}px)"><img src="assets/news/big/wh.jpg"></div>`;
    h += `<div class="lay low" style="transform:scale(${(1.12 + 0.3 * u).toFixed(3)}) translateY(${(-30 * u).toFixed(1)}px)"><img src="assets/news/big/wh.jpg"></div><div id="glow" style="opacity:${(0.35 + 0.25 * Math.sin(t * 2)).toFixed(2)}"></div><div id="vig"></div>`; }
  if (V === 'C') {   // real footage (public-domain frames in assets/news/wh_clip/f_NNNN.jpg, 30 fps source played at 0.75×) with a slow push
    const n = Math.min(CLIPN - 1, Math.floor(t * 30 * 0.75)); h += `<div class="lay" style="transform:scale(${(1.05 + 0.06 * t / T1).toFixed(3)})"><img src="assets/news/wh_clip/f_${String(n + 1).padStart(4, '0')}.jpg"></div><div id="vig"></div>`; }
  // common overlay: date plate + title + captions (+ white flash at the hand-over)
  const k1 = pop(t, 0.12, 0.35), k2 = pop(t, 0.4, 0.35);
  h += `<div id="date" style="transform:skewX(-8deg) scale(${k1.toFixed(3)})">FRIDAY · NOV 13, 2026</div>`;
  h += `<div id="tt" style="transform:scale(${k2.toFixed(3)})">What happened in <span class="r">America</span><br><span class="s">in the last 24 hours</span></div>`;
  h += `<div id="cap">${capHTML(t)}</div><div id="wf" style="opacity:${(0.85 * Math.max(0, 1 - Math.abs(t - T1) / 0.12)).toFixed(2)}"></div>`;
  $('ov').innerHTML = h; $('ov').style.transform = V !== 'O' ? `scale(${(1 + 0.25 * out * out).toFixed(3)})` : ''; return true; }
window.renderAt = renderAt;
window.sceneReady = (async () => { await document.fonts.ready; await Promise.all(['900', '800'].map(w => document.fonts.load(`${w} 60px Inter`)).concat([document.fonts.load('400 60px Anton')]));
  if (V === 'E') document.getElementById('wrap').prepend(FC);
  const imgs = V === 'D' ? STORIES.map(k => `assets/news/big/${k}.jpg`) : V === 'F' ? ['assets/news/big/wh.jpg'] : V === 'C' ? Array.from({ length: CLIPN }, (_, i) => `assets/news/wh_clip/f_${String(i + 1).padStart(4, '0')}.jpg`) : [];
  await Promise.all(imgs.map(f => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = f; }))); renderAt(0); return true; })();
