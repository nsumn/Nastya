// =================== "The 7 states that flipped the Senate" (Nov 8 2026) — countdown 7 → 1, camera hops state to state ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a';
const S = SENT;
const wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 5.2;
// [state, rank, section start, winner photo key, winner, D %, R %, loser, fact, camera height, bar offset (lon, lat)]
const SEVEN = [['Ohio', 7, S[2], 'brown', 'Sherrod Brown', 50.0, 45.2, 'Jon Husted', 'BACK IN THE SENATE', 72, [3.4, 0.4]],
  ['Iowa', 6, S[5], 'turek', 'Josh Turek', 50.5, 46.4, 'Ashley Hinson', 'FIRST DEM SENATOR SINCE 2008', 72, [4.2, 0.2]],
  ['South Carolina', 5, S[7], 'andrews', 'Annie Andrews', 51.1, 46.6, 'Darline Graham', 'FIRST WOMAN SENATOR', 66, [3.2, -1.0]],
  ['Kansas', 4, S[9], 'hamilton', 'Adam Hamilton', 51.0, 46.0, 'Roger Marshall', 'FIRST DEM IN ~100 YEARS', 82, [4.6, -0.6]],
  ['Maine', 3, S[12], 'jackson', 'Troy Jackson', 53.4, 46.5, 'Susan Collins', 'ENDS COLLINS’S 30-YEAR RUN', 74, [3.4, -1.6]],
  ['North Carolina', 2, S[14], 'cooper', 'Roy Cooper', 58.7, 39.1, 'Michael Whatley', 'BIGGEST MARGIN: +20', 84, [4.4, -1.6]],
  ['Texas', 1, S[16], 'talarico', 'James Talarico', 55.1, 43.0, 'Ken Paxton', 'FIRST STATEWIDE WIN IN 32 YEARS', 150, [8.5, -3.5]]].map(a => ({ st: a[0], n: a[1], t0: a[2], key: a[3], win: a[4], d: a[5], r: a[6], opp: a[7], fact: a[8], h: a[9], bo: a[10] }));
SEVEN.forEach((s, i) => { s.t1 = i < 6 ? SEVEN[i + 1].t0 : S[18]; s.flip = wordT(s.win.split(' ')[0], s.t0); s.factT = Math.min(s.t1 - 1.2, s.flip + 2.2); });
const T = { add: S[18], fifty: wordT('fifty-four', S[18]), alaska: wordT('Alaska', S[18]), q: S[19] };
const CUES = [[0.05, 'whoosh', 0.5], ...SEVEN.flatMap((s, i) => [[0.4 + i * 0.42, 'pop', 0.35]]), ...SEVEN.flatMap(s => [[s.t0 - 0.35, 'whoosh', 0.55], [s.flip, 'flip', 0.7], [s.flip + 0.4, 'rise', 0.45]]), [T.add - 0.3, 'whoosh', 0.6], [T.fifty, 'thud', 0.7], [T.q, 'pop', 0.5], [ENDC, 'thud', 0.5]];
// ---- camera ----
const CEN = (st) => { const s = ST(st); return [s.lon, s.lat]; };
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { const H = [[0, SEVEN[0].t0 - 0.5, shot([-92, 37.5], 470, 0, 0.3), shot([-91, 37.5], 420, 0.05, 0.34)]];
  SEVEN.forEach((s, i) => { const c = CEN(s.st), cc = [c[0] + s.bo[0] * 0.2, c[1] - 0.9]; const y0 = (i % 2 ? -1 : 1) * 0.35;
    H.push([s.t0 + 0.45, s.t1 - 0.45, shot(cc, s.h * 1.1, y0, 0.55), shot(cc, s.h * 0.9, y0 + (i % 2 ? 0.45 : -0.45), 0.62)]); });
  H.push([T.add + 0.6, T_END, shot([-95, 39], 520, 0, 0.3), shot([-95, 39], 470, 0.06, 0.33)]); return H; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) return lerpShot(A, B, esin(span(t, a, b)));
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = HOLDS[i][3], N = nx[2], u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u) * clamp(d / 40, 0, 1); return lerpShot(E, N, u, d * 0.5); } }
  return HOLDS[HOLDS.length - 1][3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.6, s.h * 7.0); return s; }
// ---- props ----
let PR = null;
async function texasShape() { const us = await fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()); const f = topojson.feature(us, us.objects.states).features.find(q => q.properties.name === 'Texas');
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = 0; for (const p of polys) { if (p[0].length > ba) { ba = p[0].length; best = p[0]; } } return best.filter((_, i) => i % 3 === 0); }
// ---- the Capitol (white, low-poly) on Washington, D.C. ----
const CAP = new THREE.Group(); MAPSC.add(CAP);
{ const wm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.5, flatShading: true });
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, wm); m.position.set(x, y, z); CAP.add(m); return m; };
  add(new THREE.BoxGeometry(9, 1.6, 2.4), 0, 0.8, 0); add(new THREE.BoxGeometry(3, 2.2, 2.8), 0, 1.1, 0); add(new THREE.CylinderGeometry(1.3, 1.4, 1.6, 16), 0, 2.9, 0);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), Math.cos(a) * 1.45, 2.8, Math.sin(a) * 1.45); }
  add(new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.6, 0).scale.y = 1.25; add(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10), 0, 5.4, 0); add(new THREE.SphereGeometry(0.16, 8, 6), 0, 6.0, 0);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), sx * (1.8 + k * 0.5), 0.9, 1.25); CAP.visible = false; }

function buildProps(ring) { const P = {}; const tc = CEN('Texas'), c0 = llPos(tc[0], tc[1]);
  const mk = (sign) => new THREE.Shape(ring.map(([lon, lat]) => { const p = ll2xz(lon, lat).sub(c0); return new THREE.Vector2(p.x, sign * p.z); }));
  P.coin = new THREE.Group(); const red = new THREE.Mesh(new THREE.ExtrudeGeometry(mk(-1), { depth: 1.2, bevelEnabled: false }).rotateX(-Math.PI / 2), [new THREE.MeshStandardMaterial({ color: RED, roughness: 0.45, emissive: RED, emissiveIntensity: 0.15 }), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 })]);
  red.position.y = -0.6; P.coin.add(red); const blue = new THREE.Mesh(new THREE.ShapeGeometry(mk(1)).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.45, emissive: BLUE, emissiveIntensity: 0.15 })); blue.position.y = -0.62; P.coin.add(blue);
  P.coin.position.copy(c0); P.coin.visible = false; MAPSC.add(P.coin);
  const bar = (col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 })); m.visible = false; MAPSC.add(m); return m; };
  P.bD = bar(BLUE); P.bR = bar(RED); return P; }
const BASE = (s) => { const c = CEN(s.st); return llPos(c[0] + s.bo[0] * 0.45, c[1] + s.bo[1] * 0.45 - 0.6); };
function mapAt(t) { const P = PR; clearPaint();
  // intro: the seven light up one after another; later each flips on its winner's name and stays blue
  SEVEN.forEach((s, i) => { const a = 0.4 + i * 0.42;
    if (t < SEVEN[0].t0 - 0.3) { const k = easeOut(span(t, a, a + 0.3)); paintState(s.st, BLUE, 0.85 * k, 1.6 * k - 0.6 * smooth(a + 0.3, a + 0.7, t)); return; }
    if (t < s.t0 - 0.3) return;
    if (t < s.flip) { paintState(s.st, RED, 0.75 * smooth(s.t0 - 0.3, s.t0 + 0.2, t), 0.6); return; }
    const k = easeOut(span(t, s.flip, s.flip + 0.35)); const cur = t < s.t1; paintState(s.st, BLUE, 0.9, cur ? 0.6 + 1.6 * k - 0.6 * smooth(s.flip + 0.35, s.flip + 0.8, t) : (t >= T.add ? 0.6 + 0.6 * easeOut(span(t, T.add + 0.4 + i * 0.12, T.add + 0.8 + i * 0.12)) : 0.5)); });
  if (t >= T.alaska - 0.2 && t < ENDC + 0.5) { const pl = 0.45 + 0.25 * Math.sin(t * 6); paintState('Mississippi', GREY, pl, 0.6); paintState('Alaska', GREY, pl, 0.6); }
  // vote bars for the current state
  const cur = SEVEN.find(s => t >= s.t0 && t < s.t1); P.bD.visible = P.bR.visible = !!cur;
  if (cur) { const g = easeOut(span(t, cur.flip + 0.1, cur.flip + 1.0)), out = 1 - smooth(cur.t1 - 0.5, cur.t1 - 0.1, t), sc = cur.h / 72 * 0.2, b = BASE(cur), w = 2.2 * cur.h / 72;
    P.bD.position.copy(b).add(V3(-w * 0.6, 0, 0)); P.bR.position.copy(b).add(V3(w * 0.6, 0, 0)); P.bD.scale.set(w, Math.max(0.01, cur.d * sc * g * out), w); P.bR.scale.set(w, Math.max(0.01, cur.r * sc * g * out), w); }
  // Texas coin
  { const s = SEVEN[6], on = t >= s.t0 - 0.2 && t < s.flip + 1.2; P.coin.visible = on; if (on) { const k = ease(span(t, s.flip - 0.2, s.flip + 0.35)); const land = ease(span(t, s.flip + 0.4, s.flip + 0.9));
      P.coin.rotation.set(Math.PI * k, 0, 0.05 * Math.sin(t * 2.1)); P.coin.position.y = lerp(9 + 0.8 * Math.sin(t * 2.4) + 6 * Math.sin(Math.PI * k), 1.0, land); if (t < s.flip + 0.9) paintState('Texas', RED, 0, 0); } }
  // the Capitol for the tally
  CAP.visible = t >= T.add; if (CAP.visible) { const k = easeOut(span(t, T.add + 0.6, T.add + 1.4)); CAP.position.copy(stPos('District of Columbia', 0.8 + 10 * (1 - k))); CAP.scale.setScalar(3.2 * k + 0.01); CAP.rotation.y = 0.3; }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { brown: ['Sherrod Brown', 'OHIO · D'], turek: ['Josh Turek', 'IOWA · D'], andrews: ['Annie Andrews', 'SOUTH CAROLINA · D'], hamilton: ['Adam Hamilton', 'KANSAS · D'], jackson: ['Troy Jackson', 'MAINE · D'],
  cooper: ['Roy Cooper', 'NORTH CAROLINA · D'], talarico: ['James Talarico', 'TEXAS · D'], collins: ['Susan Collins', 'SINCE 1997 · R'], paxton: ['Ken Paxton', 'TEXAS · R'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
function hudAt(t) { if (t < SEVEN[0].t0) return ['MIDTERMS 2026 · U.S. SENATE', `${Math.min(7, Math.floor(span(t, 0.4, 0.4 + 7 * 0.42) * 7 + (t >= 0.4 ? 1 : 0)))} FLIPS`, 'REPUBLICAN → DEMOCRAT'];
  const s = SEVEN.find(q => t >= q.t0 && t < q.t1); if (s) return [`#${s.n} · ${s.st.toUpperCase()}`, t < s.flip + 0.3 ? s.st.toUpperCase() : `D +${(s.d - s.r).toFixed(1).replace('.0', '')}`, t < s.factT ? `${s.win.toUpperCase()} ${s.d}% · ${s.opp.toUpperCase()} ${s.r}%` : s.fact];
  if (t < T.q) return ['U.S. SENATE · FROM JANUARY', t < T.fifty ? '7 FLIPS' : '54 · 44', t < T.alaska ? 'DEMOCRATS · REPUBLICANS' : 'ALASKA & MISSISSIPPI STILL COUNTING'];
  return null; }
function domAt(t) { const P = PR; let h = '';
  for (const s of SEVEN) { h += card(s.key, s.flip - 0.05, s.t1 - 0.15, 110, 650, t, { tag: 'FLIPPED', tagc: 'b', tagT: s.flip + 0.3 });
    if (t >= s.t0 - 0.1 && t < s.t1 - 0.2) { const k = pop(t, s.t0 - 0.1, 0.35); h += `<div class="rank" style="transform:translate(-50%,0) scale(${k.toFixed(3)}) rotate(-6deg);opacity:${(1 - smooth(s.t1 - 0.45, s.t1 - 0.2, t)).toFixed(2)}">#${s.n}</div>`; }
    if (P && t >= s.flip + 0.5 && t < s.t1 - 0.2 && P.bD.visible) { h += sticker(`${s.win.split(' ').pop().toUpperCase()} ${s.d}%`, P.bD.position.clone().setY(P.bD.scale.y + 1.5 * s.h / 72), t, s.flip + 0.6, 'b sm'); h += sticker(`${s.opp.split(' ').pop().toUpperCase()} ${s.r}%`, P.bR.position.clone().setY(P.bR.scale.y + 1.5 * s.h / 72), t, s.flip + 0.7, 'r sm'); }
  }
  h += card('collins', wordT('Susan', SEVEN[4].t0) - 0.05, SEVEN[4].t1 - 0.15, 650, 830, t, { small: true, dim: true, tag: '30 YRS → OUT', tagc: 'r', tagT: wordT('run', SEVEN[4].t0) });
  h += card('paxton', wordT('Ken', SEVEN[6].t0) - 0.05, SEVEN[6].t1 - 0.15, 650, 830, t, { small: true, dim: true });
  if (t >= T.add + 0.8 && t < ENDC) SEVEN.forEach((s, i) => { h += sticker(`#${s.n}`, stPos(s.st, 8), t, T.add + 0.8 + i * 0.12, 'b sm'); });
  if (t >= T.q - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.q - 0.1, T.q + 0.2, t)};transform:scale(${pop(t, T.q - 0.1, 0.35).toFixed(3)})">Which flip<br><span class="hl">surprised you?</span> 👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [...SEVEN.flatMap(s => [s.t0, s.flip + 0.3, s.factT]), T.add, T.fifty]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render (motion blur during flights) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const s of SEVEN) f = Math.max(f, 1 - Math.abs(t - s.flip - 0.05) / 0.14); return Math.max(0, f) * 0.6; }
window.renderAt = (t) => { mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; PR = buildProps(await texasShape()); await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
