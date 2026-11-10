const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// =================== "Can the House actually impeach Hegseth?" (Nov 10 2026) — explainer: 3D House + Senate chambers on the map ===================
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { math: S[1], massie: S[2], eight: wordT('eight', S[2]), priv: S[3], two: wordT('two', S[3]), table: S[4], kills: wordT('kills', S[4]), r218: S[5], d214: S[6], few: S[7], fails: wordT('fails', S[7]), vote: S[8], simple: wordT('simple', S[8]),
  senate: S[9], thirds: wordT('two', S[9]), s67: S[10], before: S[11], only: S[12], belknap: S[13], mayorkas: wordT('Alejandro', S[13]), single: wordT('single', S[13]), resigned: S[14], neither: S[15], ask: S[16] };
const CUES = [[0.02, 'whoosh', 0.5], [T.math, 'thud', 0.6], [T.eight, 'stamp', 0.6], [T.two, 'pop', 0.5], [T.table, 'whoosh', 0.4], [T.kills, 'thud', 0.5], [T.r218, 'rise', 0.5], [T.d214, 'rise', 0.5], [T.few, 'flip', 0.6], [T.fails, 'stamp', 0.6],
  [T.vote, 'pop', 0.5], [T.senate - 0.2, 'whoosh', 0.55], [T.s67, 'rise', 0.6], [T.before - 0.2, 'whoosh', 0.5], [T.belknap, 'pop', 0.5], [T.mayorkas, 'pop', 0.5], [T.single, 'thud', 0.5], [T.neither, 'stamp', 0.5], [T.ask, 'pop', 0.5], [ENDC, 'thud', 0.5]];
const PL = { dc: [-77.01, 38.89], house: [-74.2, 37.6], senate: [-73.6, 39.7] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.massie - 0.2, shot([-77, 38.6], 330, 0, 0.4), shot([-76.8, 38.6], 250, 0.1, 0.45)],
    [T.massie + 0.3, T.r218 - 0.4, shot(off('dc', 0, 2), 95, -0.4, 0.62), shot(off('dc', 0, 2), 80, 0.3, 0.68)],
    [T.r218 - 0.1, T.senate - 0.3, shot(off('house', 0, 6), 135, 0, 0.75), shot(off('house', 0, 6), 118, 0.18, 0.8)],
    [T.senate + 0.4, T.before - 0.2, shot(off('senate', 0, 4), 95, 0.1, 0.75), shot(off('senate', 0, 4), 82, -0.15, 0.8)],
    [T.before + 0.4, T.ask - 0.2, shot(off('dc', 0, 2), 105, 0.9, 0.6), shot(off('dc', 0, 2), 90, 1.6, 0.66)],
    [T.ask + 0.2, T_END, shot([-77, 38.6], 300, 0, 0.4), shot([-77, 38.6], 340, 0.05, 0.38)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) return lerpShot(A, B, esin(span(t, a, b)));
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = HOLDS[i][3], N = nx[2], u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.55); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
// ---- props ----
let PROPS = null;
// ---- the Capitol (white, low-poly) on Washington, D.C. ----
const CAP = new THREE.Group(); MAPSC.add(CAP);
{ const wm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.5, flatShading: true });
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, wm); m.position.set(x, y, z); CAP.add(m); return m; };
  add(new THREE.BoxGeometry(9, 1.6, 2.4), 0, 0.8, 0); add(new THREE.BoxGeometry(3, 2.2, 2.8), 0, 1.1, 0); add(new THREE.CylinderGeometry(1.3, 1.4, 1.6, 16), 0, 2.9, 0);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), Math.cos(a) * 1.45, 2.8, Math.sin(a) * 1.45); }
  add(new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.6, 0).scale.y = 1.25; add(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10), 0, 5.4, 0); add(new THREE.SphereGeometry(0.16, 8, 6), 0, 6.0, 0);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), sx * (1.8 + k * 0.5), 0.9, 1.25); CAP.visible = false; }

function chamber(n, rows, r0, dr) { const seats = []; for (let r = 0; r < rows; r++) { const R = r0 + r * dr, m = Math.round(Math.PI * R / (dr * 0.95)); for (let i = 0; i < m; i++) seats.push({ a: Math.PI * (1 - (i + 0.5) / m), R, r }); }
  seats.sort((p, q) => q.a - p.a || p.R - q.R); return seats.slice(0, n); }
function buildProps() { const P = {};
  P.house = chamber(435, 10, 9, 2.0); P.hMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.25, 1.0, 1.25), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45 }), 435); P.hMesh.frustumCulled = false; P.hMesh.visible = false; MAPSC.add(P.hMesh);
  P.senateS = chamber(100, 5, 6, 2.0); P.sMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.35, 1.0, 1.35), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45 }), 100); P.sMesh.frustumCulled = false; P.sMesh.visible = false; MAPSC.add(P.sMesh);
  // seat order: from the left (Democrats 214) to the right (Republicans 218); 3 vacant in the middle
  P.hCol = P.house.map((s, i) => i < 214 ? '#3d7dff' : i < 217 ? '#8a909a' : '#ff4a4a');
  P.swing = [217, 219, 223, 228];   // a few Republican seats that "side with Democrats" (illustration, not real members)
  P.sCol = P.senateS.map((s, i) => '#c8c8d0');
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), col = new THREE.Color();
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  paintState('District of Columbia', GOLD, 0.9, 0.6); if (t < T.r218) { paintState('Virginia', '#26324a', 0.3); paintState('Maryland', '#26324a', 0.3); }
  CAP.visible = true; { const k = easeOut(span(t, 0.2, 1.0)); CAP.position.copy(P3('dc', 0.8 + 8 * (1 - k))); CAP.scale.setScalar(2.6 * k + 0.01); CAP.rotation.y = 0.25; }
  // the House: seats rise row by row; R on "218", D on "214"; a few R seats turn gold on "a few Republicans"
  { const on = t >= T.r218 - 0.4 && t < T.senate + 0.3; P.hMesh.visible = on; if (on) { const c0 = P3('house'), out = 1 - smooth(T.senate - 0.1, T.senate + 0.3, t);
      P.house.forEach((s, i) => { const isD = i < 214, a = (isD ? T.d214 - 0.2 : T.r218 - 0.3) + (isD ? (213 - i) : (i - 214)) / 218 * 1.2; const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001;
        const sw = P.swing.includes(i) && t >= T.few + 0.2 + P.swing.indexOf(i) * 0.12; const hop = sw ? Math.max(0, Math.sin(Math.PI * span(t, T.few + 0.2 + P.swing.indexOf(i) * 0.12, T.few + 0.7 + P.swing.indexOf(i) * 0.12))) * 2.5 : 0;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); m4.compose(V3(c0.x + Math.cos(s.a) * s.R, 0.9 + s.r * 0.35 + hop, c0.z - Math.sin(s.a) * s.R * 0.85), q4, s4); P.hMesh.setMatrixAt(i, m4);
        col.set(sw ? GOLD : P.hCol[i]); P.hMesh.setColorAt(i, col); }); P.hMesh.instanceMatrix.needsUpdate = true; P.hMesh.instanceColor.needsUpdate = true; } }
  // the Senate: 100 seats, 67 light up gold
  { const on = t >= T.senate - 0.2 && t < T.before + 0.3; P.sMesh.visible = on; if (on) { const c0 = P3('senate'), out = 1 - smooth(T.before - 0.1, T.before + 0.3, t);
      P.senateS.forEach((s, i) => { const a = T.senate + i / 100 * 0.8; const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001; const lit = i < 67 && t >= T.s67 + i / 67 * 0.9;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); m4.compose(V3(c0.x + Math.cos(s.a) * s.R, 0.9 + s.r * 0.35, c0.z - Math.sin(s.a) * s.R * 0.85), q4, s4); P.sMesh.setMatrixAt(i, m4); col.set(lit ? GOLD : '#c8c8d0'); P.sMesh.setColorAt(i, col); });
      P.sMesh.instanceMatrix.needsUpdate = true; P.sMesh.instanceColor.needsUpdate = true; } }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { massie: ['Thomas Massie', 'REPUBLICAN · KENTUCKY'], hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const fx = o.fx ?? 0;
  const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function stickerRaw(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
function barLabel(b, txt, t, t0, cls = '') { if (!b.visible) return ''; const top = b.position.clone().setY(b.scale.y + 1.5); return sticker(txt, top, t, t0, cls); }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
// stickers are collected, then pushed apart so they never overlap (her note) — greedy, top to bottom
let STK = [];
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const fs = /\bsm\b/.test(cls) ? 20 : 30, w = txt.length * fs * 0.68 + (fs > 20 ? 36 : 24), h = fs * 1.25 + (fs > 20 ? 16 : 10);
  STK.push({ txt, cls, x: clamp(q[0], 70 + w / 2, 1010 - w / 2), y: q[1], w, h, k: pop(t, t0, 0.25) }); return ''; }
function layoutStickers() { const placed = []; STK.sort((a, b) => a.y - b.y);
  for (const s of STK) { let moved = true, n = 0; while (moved && n++ < 12) { moved = false; for (const p of placed) { if (Math.abs(s.x - p.x) < (s.w + p.w) / 2 + 8 && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 6) { s.y = p.y + (s.h + p.h) / 2 + 8; moved = true; } } } placed.push(s); }
  return placed.map(s => `<div class="stk ${s.cls}" style="left:${s.x.toFixed(0)}px;top:${s.y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${s.k.toFixed(3)})">${s.txt}</div>`).join(''); }
function hudAt(t) {
  if (t < T.massie) return ['THE HOUSE · THIS WEEK', t < T.math ? 'IMPEACH HEGSETH?' : 'HERE’S THE MATH', 'DEFENSE SECRETARY PETE HEGSETH'];
  if (t < T.table) return ['STEP 0 · THE RESOLUTION', t < T.priv ? '8 ARTICLES' : '2 LEGISLATIVE DAYS', t < T.priv ? 'FILED BY THOMAS MASSIE (R) · OVER THE IRAN WAR' : 'A PRIVILEGED RESOLUTION: THE HOUSE MUST ACT'];
  if (t < T.r218) return ['STEP 1 · MOTION TO TABLE', 'KILL IT FIRST', 'NO VOTE ON IMPEACHMENT ITSELF'];
  if (t < T.vote) return ['STEP 1 · THE HOUSE', t < T.d214 ? '218 R' : t < T.few ? '218 · 214' : 'A FEW FLIPS', t < T.few ? 'REPUBLICANS · DEMOCRATS · 3 VACANT' : 'AND TABLING FAILS'];
  if (t < T.senate) return ['STEP 2 · IMPEACHMENT', 'SIMPLE MAJORITY', 'MORE YES THAN NO IN THE HOUSE'];
  if (t < T.before) return ['STEP 3 · THE SENATE', t < T.s67 ? '2/3 TO REMOVE' : `${cnt(t, T.s67, T.s67 + 0.9, 67)} / 100`, 'SENATORS NEEDED TO CONVICT'];
  if (t < T.ask) return ['IN U.S. HISTORY', t < T.belknap ? 'ONLY 2' : t < T.neither ? '1876 · 2024' : 'NEITHER REMOVED', 'CABINET SECRETARIES EVER IMPEACHED'];
  return null; }
function histHTML(t) { if (t < T.belknap - 0.2 || t >= T.ask) return ''; const a = 1 - smooth(T.ask - 0.3, T.ask, t);
  const c = (t0, yr, name, role, note, x, hl) => t < t0 ? '' : `<div class="hcard" style="left:${x}px;transform:scale(${pop(t, t0, 0.35).toFixed(3)}) rotate(${x < 500 ? -2 : 2}deg)"><div class="hy">${yr}</div><div class="hn">${name}</div><div class="hr">${role}</div><div class="hx ${hl ? 'on' : ''}">${note}</div></div>`;
  return `<div style="opacity:${a.toFixed(2)}">${c(T.belknap - 0.1, '1876', 'WILLIAM BELKNAP', 'SECRETARY OF WAR', t >= T.resigned ? 'RESIGNED HOURS BEFORE · IMPEACHED ANYWAY' : 'IMPEACHED BY THE HOUSE', 70, t >= T.resigned)}${c(T.mayorkas - 0.1, '2024', 'ALEJANDRO MAYORKAS', 'HOMELAND SECURITY', t >= T.single ? 'IMPEACHED 214–213' : 'IMPEACHED BY THE HOUSE', 550, t >= T.single)}${t >= T.neither ? `<div class="hst" style="transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 1.2 * (1 - easeOut(span(t, T.neither, T.neither + 0.2)))).toFixed(3)})">NOT REMOVED</div>` : ''}</div>`; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  h += card('hegseth', 0.15, T.massie, 110, 640, t, { tag: 'IMPEACH?', tagc: 'r', tagT: 0.9 });
  h += card('massie', T.massie - 0.05, T.table, 650, 660, t, { small: true, tag: '8 ARTICLES', tagc: 'r', tagT: T.eight });
  if (P) {
    if (t < T.r218 - 0.3) sticker('THE CAPITOL', P3('dc', 12), t, 0.9, 'sm w');
    if (t >= T.r218 && t < T.senate) { sticker('REPUBLICANS 218', off('house', 15, -3).setY(9), t, T.r218 + 0.4, 'r'); sticker('DEMOCRATS 214', off('house', -15, -3).setY(9), t, T.d214 + 0.4, 'b'); }
    if (t >= T.senate + 0.4 && t < T.before) sticker('U.S. SENATE · 100', off('senate', 0, -6).setY(7), t, T.senate + 0.4, 'w');
  }
  h += layoutStickers() + histHTML(t);
  if (t >= T.kills && t < T.r218) h += `<div class="stamp" style="font-size:120px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.kills, T.kills + 0.18)))).toFixed(3)})">TABLED?</div>`;
  if (t >= T.fails && t < T.vote) h += `<div class="stamp" style="font-size:120px;top:1090px;color:#3d7dff;border-color:#3d7dff;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.fails, T.fails + 0.18)))).toFixed(3)})">FAILS</div>`;
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Impeach <span class="hl">Hegseth?</span><br>👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.math, T.massie, T.priv, T.table, T.r218, T.d214, T.few, T.vote, T.senate, T.s67, T.before, T.belknap, T.neither]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.kills, T.fails, T.neither]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.7; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
