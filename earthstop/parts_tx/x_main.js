// =================== "Why Texas turned blue" — camera, map state, DOM ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a';
const TXC = [-99.3, 31.3];
// ---- camera (same hold/flight scheme as the daily video) ----
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [
  [0, T.years - 0.1, shot([-99.0, 30.2], 125, 0.35, 0.75), shot([-99.2, 30.6], 150, 0.05, 0.6)],
  [T.years + 0.4, T.y2024 - 0.1, shot(TXC, 165, 0.0, 0.35), shot(TXC, 145, 0.15, 0.38)],
  [T.y2024 + 0.4, T.r1 - 0.3, shot([-97.6, 30.0], 160, -0.12, 0.4), shot([-97.6, 30.0], 140, 0.1, 0.42)],
  [T.r1 + 0.3, T.r2 - 0.3, shot([-98.0, 30.6], 100, 0.35, 0.55), shot([-98.0, 30.6], 84, 0.65, 0.6)],
  [T.r2 + 0.4, T.austin - 0.25, shot([-97.0, 32.85], 36, 0.3, 0.7), shot([-97.0, 32.85], 29, 0.6, 0.75)],
  [T.austin + 0.45, T.r3 - 0.3, shot([-97.65, 30.6], 34, -0.2, 0.7), shot([-97.65, 30.6], 28, 0.1, 0.75)],
  [T.r3 + 0.45, T.r4 - 0.5, shot([-98.0, 26.5], 70, -0.25, 0.65), shot([-98.0, 26.5], 56, 0.15, 0.7)],
  [T.r4 + 0.7, T.rural - 0.6, shot([-77.04, 39.2], 80, -0.3, 0.6), shot([-77.04, 39.2], 64, 0.15, 0.65)],
  [T.rural + 0.4, T.q - 0.2, shot([-98.6, 30.0], 120, 0.5, 0.95), shot([-98.4, 30.2], 100, 0.95, 1.0)],
  [T.q + 0.3, T_END, shot(TXC, 165, 0.3, 0.55), shot(TXC, 200, 0.1, 0.5)]]; }
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
function countyLookup() { const cv = usMesh.material.uniforms.tId.value.image, d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  return (lon, lat) => { const x = Math.floor((lon - UB.lon0) / (UB.lon1 - UB.lon0) * cv.width), y = Math.floor((UB.lat1 - lat) / (UB.lat1 - UB.lat0) * cv.height); const k = d[(y * cv.width + x) * 4 + 2]; const c = COUNTIES.find(q => q.id === k); return c ? c.name : ''; }; }
async function texasShape() { const us = await fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()); const f = topojson.feature(us, us.objects.states).features.find(q => q.properties.name === 'Texas');
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = 0; for (const p of polys) { if (p[0].length > ba) { ba = p[0].length; best = p[0]; } } return best.filter((_, i) => i % 3 === 0); }
function buildProps(ring) { const P = {}; const c0 = llPos(TXC[0], TXC[1]);
  // the coin: red face up, blue face (mirrored N–S) underneath; flipping it about x shows blue in the right orientation
  const mk = (sign) => new THREE.Shape(ring.map(([lon, lat]) => { const p = ll2xz(lon, lat).sub(c0); return new THREE.Vector2(p.x, sign * p.z); }));
  P.coin = new THREE.Group(); const red = new THREE.Mesh(new THREE.ExtrudeGeometry(mk(-1), { depth: 1.2, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 0, 0), [new THREE.MeshStandardMaterial({ color: RED, roughness: 0.45, emissive: RED, emissiveIntensity: 0.15 }), new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 })]);
  red.position.y = -0.6; P.coin.add(red); const blue = new THREE.Mesh(new THREE.ShapeGeometry(mk(1)).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.45, emissive: BLUE, emissiveIntensity: 0.15 })); blue.position.y = -0.62; P.coin.add(blue);
  P.coin.position.copy(c0); MAPSC.add(P.coin);
  // 3D vote bars in the Gulf
  const bar = (col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, emissive: col, emissiveIntensity: 0.25 })); m.visible = false; MAPSC.add(m); return m; };
  P.bR = bar(RED); P.bB = bar(BLUE);
  // suburbs: little houses scattered in the four DFW counties + Williamson
  const look = countyLookup(); const houses = []; const want = ['Collin', 'Denton', 'Tarrant', 'Kaufman', 'Williamson']; let tries = 0;
  while (houses.length < 420 && tries++ < 20000) { const lon = R(-98.2, -95.9), lat = R(30.2, 33.45); const n = look(lon, lat); if (want.includes(n)) houses.push({ p: llPos(lon, lat), n, ph: rnd(), ry: R(0, 3) }); }
  P.houses = houses; const hg = mergeGeometries([new THREE.BoxGeometry(1, 0.7, 1).translate(0, 0.35, 0), new THREE.ConeGeometry(0.85, 0.55, 4).rotateY(Math.PI / 4).translate(0, 0.97, 0)]);
  P.hMesh = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, flatShading: true }), houses.length); P.hMesh.frustumCulled = false; MAPSC.add(P.hMesh);
  houses.forEach((h, i) => P.hMesh.setColorAt(i, new THREE.Color(rnd() < 0.5 ? '#f2efe6' : '#dfe7f2')));
  // ballots raining onto the Rio Grande Valley
  const ballots = []; tries = 0; const rgv = ['Hidalgo', 'Cameron', 'Starr', 'Willacy'];
  while (ballots.length < 360 && tries++ < 20000) { const lon = R(-99.2, -97.1), lat = R(25.85, 27.0); if (rgv.includes(look(lon, lat))) ballots.push({ p: llPos(lon, lat), ph: rnd(), ry: R(0, 6) }); }
  P.ballots = ballots; P.bMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.25 }), ballots.length); P.bMesh.frustumCulled = false; MAPSC.add(P.bMesh);
  // White House at DC for "timing"
  P.whP = llPos(-77.04, 38.9); return P; }
const PL = { dc: [-77.04, 38.9] };
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
function mapAt(t) { const P = PR; clearPaint(); mapUni.uCty.value = 0;
  // ---- the coin flip ----
  { const on = t < T.blue + 1.15; P.coin.visible = on; if (on) { const k = ease(span(t, T.blue - 0.05, T.blue + 0.5)); const land = ease(span(t, T.blue + 0.55, T.blue + 0.95));
      P.coin.rotation.set(Math.PI * k + 0.08 * Math.sin(t * 3) * (1 - k), 0, 0.05 * Math.sin(t * 2.1)); P.coin.position.y = lerp(9 + 0.8 * Math.sin(t * 2.4) + 6 * Math.sin(Math.PI * k), 1.0, land); } }
  const txBlue = (t >= T.blue + 0.9 && t < T.years + 0.3) || t >= T.later + 0.6;
  if (t >= T.r2 - 0.3) { if (t < T.rural - 0.3) paintState('Texas', BLUE, 0.18, 0.3); }
  else if (t >= T.blue + 0.9) paintState('Texas', txBlue ? BLUE : RED, txBlue ? 0.85 : 0.7, 0.8 * (txBlue ? easeOut(span(t, t < T.years + 0.3 ? T.blue + 0.9 : T.later + 0.6, (t < T.years + 0.3 ? T.blue + 0.9 : T.later + 0.6) + 0.4)) : 0.6));
  // ---- vote bars: 2024 (R 56 / D 42) → 2026 (D 55 / R 43) ----
  { const vis = t >= T.y2024 && t < T.r1 + 0.3, g = easeOut(span(t, T.y2024 + 0.1, T.y2024 + 1.0)), m = ease(span(t, T.later + 0.2, T.later + 1.0)), out = 1 - smooth(T.r1 - 0.2, T.r1 + 0.3, t);
    const r = lerp(56.1, 43.0, m), d = lerp(42.5, 55.1, m), base = llPos(-95.0, 27.6); P.bR.visible = P.bB.visible = vis;
    if (vis) { P.bR.position.copy(base).add(V3(-4.5, 0, 0)); P.bB.position.copy(base).add(V3(4.5, 0, 0)); P.bR.scale.set(7, Math.max(0.01, r * 0.75 * g * out), 7); P.bB.scale.set(7, Math.max(0.01, d * 0.75 * g * out), 7); } }
  // ---- reason 1: Austin area glow (state capital) ----
  if (t >= T.r1 && t < T.r2) paintCounty('Travis', GOLD, 0.5, 0.6);
  // ---- reason 2: the suburbs ----
  const sub = [['Collin', T.collin], ['Denton', T.denton], ['Tarrant', T.tarrant], ['Kaufman', T.kaufman], ['Williamson', T.williamson]];
  if (t >= T.r2 - 0.3 && t < T.r3) { mapUni.uCty.value = smooth(T.r2 - 0.3, T.r2 + 0.3, t); paintCounty('Dallas', BLUE, 0.35, 0.3);
    sub.forEach(([n, a]) => { if (t >= a) { const k = easeOut(span(t, a, a + 0.35)); paintCounty(n, BLUE, 0.9 * k, 1.4 * k - 0.4 * smooth(a + 0.35, a + 0.8, t)); } else if (n !== 'Williamson') paintCounty(n, RED, 0.45, 0.3); }); }
  { const on = t >= T.r2 && t < T.r3 + 0.3; P.hMesh.visible = on; if (on) { P.houses.forEach((h, i) => { const a = sub.find(s => s[0] === h.n)[1] + h.ph * 0.6; const k = pop(t, a, 0.3) * (1 - smooth(T.r3, T.r3 + 0.3, t)); const lift = 1.0;
      s4.setScalar(0.3 * Math.max(0.001, t >= a ? k : 0.001)); q4.setFromEuler(e4.set(0, h.ry, 0)); m4.compose(V3(h.p.x, lift + 1.7, h.p.z), q4, s4); P.hMesh.setMatrixAt(i, m4); }); P.hMesh.instanceMatrix.needsUpdate = true; } }
  // ---- reason 3: the Valley ----
  if (t >= T.r3 - 0.3 && t < T.r4) { mapUni.uCty.value = smooth(T.r3 - 0.3, T.r3 + 0.3, t); const sw = easeOut(span(t, T.swung, T.swung + 0.4));
    ['Hidalgo', 'Cameron', 'Starr', 'Willacy'].forEach((n, i) => { const a = T.valley + 0.9 + i * 0.12; if (t < T.swung) paintCounty(n, RED, 0.75 * smooth(a, a + 0.25, t), 0.8 * smooth(a, a + 0.25, t)); else paintCounty(n, BLUE, 0.9, 0.8 + 0.6 * sw - 0.3 * smooth(T.swung + 0.4, T.swung + 0.9, t)); }); }
  { const on = t >= T.thistime - 0.2 && t < T.r4 + 0.2; P.bMesh.visible = on; if (on) { P.ballots.forEach((b, i) => { const a = T.thistime - 0.2 + b.ph * 2.4, k = span(t, a, a + 0.8), y = lerp(30, 2.6 + 0.08 * (i % 7), easeOut(k)); const sc = t < a ? 0.001 : 1.0 * (1 - smooth(T.r4 - 0.1, T.r4 + 0.2, t)) + 0.001;
      s4.setScalar(sc); q4.setFromEuler(e4.set(0.6 * (1 - k) * Math.sin(i), b.ry + 3 * (1 - k), 0.5 * (1 - k))); m4.compose(V3(b.p.x, y, b.p.z), q4, s4); P.bMesh.setMatrixAt(i, m4); }); P.bMesh.instanceMatrix.needsUpdate = true; } }
  // ---- reason 4: Washington ----
  WH.visible = t >= T.r4 && t < T.rural; if (WH.visible) { const k = easeOut(span(t, T.r4 + 0.5, T.r4 + 1.1)); WH.position.copy(P.whP).setY(0.3 + 6 * (1 - k)); WH.scale.setScalar(1.9 * k + 0.01); WH.rotation.y = 0; paintState('District of Columbia', GOLD, 0.9, 0.6); }
  // ---- rural red vs metro blue, metros rise with population ----
  if (t >= T.rural - 0.3) { mapUni.uCty.value = smooth(T.rural - 0.3, T.rural + 0.3, t); const rk = smooth(T.rural, T.rural + 0.5, t), mk = easeOut(span(t, T.forty - 0.3, T.forty + 0.8)), pk = easeOut(span(t, T.cities, T.cities + 1.2));
    COUNTIES.forEach(c => { if (!(c.name in METRO)) paintCounty(c.name, RED, 0.85 * rk, 0.25 * rk); });
    for (const [n, pop] of Object.entries(METRO)) paintCounty(n, mk > 0.01 ? BLUE : RED, mk > 0.01 ? 0.95 * mk + 0.85 * (1 - mk) : 0.85 * rk, 0.25 + 1.0 * mk + 7.5 * Math.sqrt(pop) * pk); }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { talarico: ['James Talarico', 'SENATOR-ELECT (D)'], hinojosa: ['Gina Hinojosa', 'GOVERNOR-ELECT (D)'], abbott: ['Greg Abbott', 'GOVERNOR (R)'], paxton: ['Ken Paxton', 'REPUBLICAN NOMINEE'],
  cornyn: ['John Cornyn', 'U.S. SENATOR (R)'], trump: ['Donald Trump', 'PRESIDENT'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
function hudAt(t) {
  if (t < T.years) return ['MIDTERMS 2026 · TEXAS', t < T.blue ? 'WHY TEXAS' : 'TURNED BLUE', t < T.blue ? 'A RED STATE FOR DECADES' : 'SENATE + GOVERNOR'];
  if (t < T.y2024) return ['TEXAS · STATEWIDE RACES', t < T.years + 0.3 ? '0 YEARS' : `${cnt(t, T.years + 0.3, T.years + 1.6, 32)} YEARS`, t < T.senator ? 'WITHOUT A DEMOCRATIC WIN · 1994–2026' : 'LAST DEM SENATOR ELECTED: 1988'];
  if (t < T.r1) return ['2024 → 2026', t < T.later ? 'TRUMP +14' : t < T.gina ? 'TALARICO +12' : 'HINOJOSA WINS', t < T.later ? 'PRESIDENT · 2024' : t < T.gina ? 'U.S. SENATE · A 26-POINT SWING' : 'GOVERNOR · BEAT GREG ABBOTT'];
  if (t < T.r2) return ['REASON 1', 'THE OPPONENT', t < T.impeached ? 'PAXTON BEAT SEN. CORNYN IN THE PRIMARY' : t < T.bush ? 'IMPEACHED BY THE TEXAS HOUSE · 2023' : 'TWO BUSH FAMILY MEMBERS BACKED TALARICO'];
  if (t < T.r3) return ['REASON 2', 'THE SUBURBS', t < T.austin ? `${[T.collin, T.denton, T.tarrant, T.kaufman].filter(a => t >= a).length} DALLAS-AREA COUNTIES FLIPPED` : 'WILLIAMSON · BLUE BY ~20 POINTS'];
  if (t < T.r4) return ['REASON 3', t < T.thistime ? 'LATINO VOTERS' : `+${cnt(t, T.jumped - 0.3, T.jumped + 0.9, 38)}% TURNOUT`, t < T.thistime ? 'TRUMP WON ALL 4 VALLEY COUNTIES IN 2024' : `${fmt(233000 + cnt(t, T.jumped - 0.3, T.jumped + 0.9, 89000))} BALLOTS · RIO GRANDE VALLEY`];
  if (t < T.rural) return ['REASON 4', 'TIMING', t < T.midterms ? 'TWO YEARS INTO TRUMP’S SECOND TERM' : 'MIDTERMS PUNISH THE PRESIDENT’S PARTY'];
  if (t < T.q) return ['RURAL VS. METRO', t < T.forty - 0.2 ? 'RURAL: RED' : `${cnt(t, T.forty - 0.2, T.forty + 0.8, 40)} / 254`, t < T.forty - 0.2 ? 'PAXTON WON MOST COUNTIES' : t < T.cities ? 'COUNTIES WON BY TALARICO' : 'BUT THAT’S WHERE THE PEOPLE ARE'];
  return null; }
function domAt(t) { const P = PR; let h = '';
  h += card('talarico', T.talarico - 0.05, T.r1, 110, 640, t, { tag: t >= T.later + 0.6 ? 'WON' : '', tagc: 'b', tagT: T.talarico + 0.4 });
  h += card('hinojosa', T.gina - 0.05, T.r1, 650, 660, t, { small: true, tag: 'WON', tagc: 'b', tagT: T.abbott });
  h += card('paxton', T.paxton - 0.05, T.r2, 110, 640, t, { tag: t >= T.impeached ? 'IMPEACHED 2023' : '', tagc: 'r', tagT: T.impeached });
  h += card('cornyn', T.cornyn - 0.05, T.impeached - 0.05, 650, 660, t, { small: true, dim: true, tag: 'LOST PRIMARY', tagc: 'r', tagT: T.cornyn + 0.25 });
  h += card('talarico', T.bush - 0.1, T.r2, 650, 660, t, { small: true, quote: '+ BUSH FAMILY', qT: T.bush + 0.15 });
  h += card('trump', wordT('Trump', T.valley) - 0.05, T.thistime, 650, 660, t, { small: true, quote: 'WON ALL 4 · 2024', qT: wordT('Trump', T.valley) + 0.3 });
  h += card('trump', T.r4 + 0.2, T.rural, 110, 640, t, { tag: 'YEAR 2 OF TERM 2', tagc: 'r', tagT: wordT('frustrated', T.midterms) });
  if (P) {
    if (t >= T.y2024 + 0.5 && t < T.r1) { const m = ease(span(t, T.later + 0.2, T.later + 1.0)); h += sticker(t < T.later + 0.6 ? 'TRUMP 56%' : 'PAXTON 43%', P.bR.position.clone().setY(P.bR.scale.y + 2), t, T.y2024 + 0.5, 'r sm'); h += sticker(t < T.later + 0.6 ? 'HARRIS 42%' : 'TALARICO 55%', P.bB.position.clone().setY(P.bB.scale.y + 2), t, T.y2024 + 0.6, 'b sm'); }
    if (t >= T.r1 + 0.6 && t < T.r2) h += sticker('AUSTIN · STATE CAPITOL', cyPos('Travis', 3), t, T.r1 + 0.6, 'sm w');
    if (t >= T.r2 && t < T.r3) { for (const [n, a] of [['Collin', T.collin], ['Denton', T.denton], ['Tarrant', T.tarrant], ['Kaufman', T.kaufman]]) h += sticker(n.toUpperCase(), cyPos(n, 3), t, a, 'b sm');
      if (t < T.austin) h += sticker('DALLAS', cyPos('Dallas', 2), t, T.r2 + 0.3, 'sm w'); else h += sticker('WILLIAMSON · ~+20', cyPos('Williamson', 3), t, T.williamson, 'b'); }
    if (t >= T.valley + 0.9 && t < T.r4) h += sticker(t < T.swung ? 'RIO GRANDE VALLEY · TRUMP 2024' : 'RIO GRANDE VALLEY · SWUNG BACK', cyPos('Hidalgo', 6), t, t < T.swung ? T.valley + 0.9 : T.swung, t < T.swung ? 'r' : 'b');
    if (t >= T.r4 + 1.0 && t < T.rural) h += sticker('WHITE HOUSE', P.whP.clone().setY(10), t, T.r4 + 1.0, 'sm w');
    if (t >= T.cities + 0.4 && t < T.q) { for (const [n, lbl] of [['Harris', 'HOUSTON'], ['Dallas', 'DALLAS'], ['Bexar', 'SAN ANTONIO'], ['Travis', 'AUSTIN']]) h += sticker(lbl, cyPos(n, 4 + 7.5 * Math.sqrt(METRO[n])), t, T.cities + 0.4, 'b sm'); }
  }
  if (t >= T.impeached && t < T.bush) h += `<div class="stamp" style="font-size:110px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.impeached, T.impeached + 0.18)))).toFixed(3)})">IMPEACHED</div>`;
  if (t >= T.q - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.q - 0.1, T.q + 0.2, t)};transform:scale(${pop(t, T.q - 0.1, 0.35).toFixed(3)})">Blue <span class="hl">for good?</span><br>👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.blue, T.years, T.y2024, T.later, T.gina, T.r1, T.impeached, T.r2, T.collin, T.denton, T.tarrant, T.kaufman, T.austin, T.r3, T.thistime, T.r4, T.rural, T.forty]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render (motion blur during flights) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.blue + 0.9, T.impeached]) f = Math.max(f, 1 - Math.abs(t - k - 0.05) / 0.15); return Math.max(0, f); }
window.renderAt = (t) => { mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.6 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; PR = buildProps(await texasShape()); await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
