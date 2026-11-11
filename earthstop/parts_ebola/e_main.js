// =================== "Ebola just passed 11,000 cases — how close is it to America?" — Nov 11 2026, v5 news map (QUALITY_NOV11.md) ===================
// Facts: DRC govt data Nov 10: 11,042 confirmed cases, 5,387 deaths (AFP/Daily Sabah); Bundibugyo strain, no vaccine/treatment; declared Ituri May 15, WHO PHEIC May 17 (ECDC);
// 8 of 26 provinces; 2nd-largest outbreak on record; Kenya 9 cases (ECDC Oct 26); Nigeria 1 case via Addis Ababa from Uganda (Oct 20); France 1 imported (doctor, recovered July);
// US: CDC entry suspension for foreign nationals in DRC since May 18; attestation form on every US-bound international flight since Nov 3; 0 US cases, CDC: risk low.
// 13 h = Addis Ababa → Washington Dulles 7,185 mi great circle at 550 mph (computed in chat).
const V5LOOK = true;
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff3a3a', GOLD = '#ffc23a', TEAL = '#2ad0b0', ORANGE = '#ff8a3a';
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { close: S[1], may: S[2], who: S[3], six: S[4], eight: wordT('eight', S[4]), slow: wordT('slowing', S[4]), deaths: S[5], half: S[6], second: S[7], strain: S[8], vaccine: wordT('vaccine', S[8]),
  borders: S[9], kenya: S[10], nigeria: S[11], ethiopia: wordT('Ethiopia', S[11]), france: S[12], recovered: wordT('recovered', S[12]), flight: S[13], hours: S[14], wash: wordT('Washington', S[14]),
  ban: S[15], form: S[16], zero: S[17], cdc: wordT('CDC', S[17]), ask: S[18] };
const EV = Object.values(T).sort((a, b) => a - b);
const CUES = [[0.02, 'whoosh', 0.5], [0.08, 'stamp', 0.7], ...EV.slice(1).map(t => [t, 'pop', 0.45]),
  [T.may - 0.3, 'whoosh', 0.6], [T.who, 'alarm', 0.55], [T.six - 0.3, 'whoosh', 0.5], [T.eight, 'rise', 0.6], [T.deaths, 'thud', 0.7], [T.second, 'paper', 0.7], [T.vaccine, 'stamp', 0.8],
  [T.borders - 0.3, 'whoosh', 0.6], [T.kenya, 'ding', 0.6], [T.nigeria, 'jet', 0.45], [T.france, 'jet', 0.45], [T.flight - 0.2, 'jet', 0.8], [T.hours, 'tick', 0.4], [T.ban - 0.3, 'whoosh', 0.6], [T.ban, 'gavel', 0.7],
  [T.form, 'type', 0.6], [T.form + 0.6, 'paper', 0.6], [T.zero, 'ding', 0.8], [T.cdc, 'stamp', 0.7], [T.ask, 'thud', 0.6], [ENDC, 'thud', 0.5]];
const PL = { ituri: [30.25, 1.56], nairobi: [36.82, -1.29], kampala: [32.58, 0.35], addis: [38.8, 8.98], lagos: [3.38, 6.52], paris: [2.35, 48.86], dulles: [-77.45, 38.95] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const PROV = [[30.25, 1.56], [29.29, 0.14], [29.22, -1.68], [27.62, 2.77], [28.86, -2.5], [25.19, 0.52], [25.92, -2.95], [24.73, 2.8]];   // 8 outbreak markers spreading out from Ituri (markers only, not province labels)
const AIRPORTS = [['JFK', -73.78, 40.64], ['IAD', -77.45, 38.95], ['ATL', -84.43, 33.64], ['ORD', -87.9, 41.98], ['LAX', -118.41, 33.94], ['IAH', -95.34, 29.98], ['MIA', -80.29, 25.8]];
function shot(where, h, yaw = 0, tilt = 1.05, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.may - 0.35, shot([25, -1], 640, -0.1, 0.9), shot([25, -1], 560, 0.1, 0.95)],
    [T.may + 0.15, T.six - 0.35, shot([29.6, 0.6], 190, 0.2, 1.0), shot([29.6, 0.6], 160, -0.2, 1.05)],
    [T.six + 0.15, T.borders - 0.35, shot([27, -0.5], 470, -0.15, 0.9), shot([27, -0.5], 400, 0.15, 0.95)],
    [T.borders + 0.15, T.flight - 0.35, shot([20, 20], 1150, 0.05, 0.65), shot([20, 20], 1000, -0.05, 0.7)],
    [T.flight + 1.0, T.ban - 0.35, shot([-20, 22], 1900, 0, 0.42), shot([-20, 22], 1700, 0.05, 0.45)],
    [T.ban + 1.0, T.ask - 0.3, shot([-95, 37.5], 880, 0, 0.6), shot([-95, 37.5], 760, -0.08, 0.65)],
    [T.ask + 0.15, T_END, shot([-95, 37.5], 900, 0, 0.6), shot([-95, 37.5], 980, 0.05, 0.55)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) { const sh = lerpShot(A, B, 0.25 * esin(span(t, a, b)) + 0.75 * span(t, a, b));
      const el = t - a; sh.h *= Math.exp(-0.075 * Math.min(el, 3) - 0.015 * Math.max(0, el - 3)); sh.yaw += (0.1 * Math.min(el, 4) + 0.02 * Math.max(0, el - 4)) * (i % 2 ? -1 : 1); sh.tilt *= 1 + 0.03 * Math.min(el, 4);   // v5 camera
      return sh; }
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = shotAt(b), N = shotAt(nx[0]), u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.35); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
// ---- props: outbreak markers, spread arcs, the flight with a plane, airport pins ----
let PROPS = null;
function hotspot(col, r) { const g = new THREE.Group(); const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false })); disc.position.y = 0.4; g.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.92, r * 1.12, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false })); ring.position.y = 0.5; g.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' })); core.position.y = r * 0.25; g.add(core); g.userData = { disc, ring }; g.visible = false; MAPSC.add(g); return g; }
function hotAt(g, pos, t, t0, s) { if (t < t0) { g.visible = false; return; } g.visible = true; g.position.copy(pos); const k = easeOut(span(t, t0, t0 + 0.5)); g.scale.setScalar(s * (0.01 + k));
  const ph = ((t - t0) * 0.9) % 1; g.userData.ring.scale.setScalar(1 + ph * 1.6); g.userData.ring.material.opacity = 0.9 * (1 - ph); g.userData.disc.material.opacity = 0.45 + 0.15 * Math.sin(t * 5); }
function plane() { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, flatShading: true });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 7, 10).rotateX(Math.PI / 2), m); g.add(body); const nose = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), m); nose.position.z = 3.5; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 1.6), m); wing.position.z = 0.3; g.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.9), m); tail.position.z = -3.1; g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 1.1), new THREE.MeshStandardMaterial({ color: GOLD, flatShading: true })); fin.position.set(0, 0.8, -3.0); g.add(fin); g.visible = false; MAPSC.add(g); return g; }
function buildProps() { const P = {};
  P.hot = PROV.map((p, i) => hotspot(RED, i === 0 ? 9 : 6));
  P.big = hotspot(RED, 26);
  P.out = { kenya: hotspot(ORANGE, 10), nigeria: hotspot(ORANGE, 10), france: hotspot(ORANGE, 10) };
  P.arcs = { kenya: makeArc(P3('ituri', 0.5), P3('nairobi', 0.5), 50, ORANGE), uganda: makeArc(P3('kampala', 0.5), P3('addis', 0.5), 60, ORANGE), nigeria: makeArc(P3('addis', 0.5), P3('lagos', 0.5), 150, ORANGE),
    france: makeArc(P3('ituri', 0.5), P3('paris', 0.5), 260, ORANGE), usa: makeArc(P3('addis', 0.5), P3('dulles', 0.5), 520, GOLD) };
  P.plane = plane();
  P.air = AIRPORTS.map(() => makePin(TEAL));
  return P; }
const NUP = new THREE.Vector3();
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint(); mapUni.uDim.value = 0; mapUni.uV5.value = 1;
  // Congo: red, pulsing; deeper as the outbreak grows
  if (t < T.ban + 0.5) { const k = 0.55 + 0.25 * smooth(T.six, T.deaths, t) + 0.08 * Math.sin(t * 4); paintCountry('Dem. Rep. Congo', RED, k * (t < T.borders ? 1 : 0.85), 2.2); }
  // markers: Ituri first, then the 8 points spreading out
  P.hot.forEach((g, i) => { const t0 = i === 0 ? T.may + 0.2 : T.six + 0.25 + (T.eight - T.six) * (i / 7); hotAt(g, llPos(PROV[i][0], PROV[i][1], 1), t < T.borders + 0.3 ? t : -1, t0, 1); });
  hotAt(P.big, P3('ituri', 1), t < T.may - 0.2 || (t >= T.borders && t < T.ban + 0.5) ? t : -1, t < T.may ? 0.1 : T.borders, t < T.may ? 1 : 0.6);
  // spread out of Congo
  const kk = smooth(T.kenya, T.kenya + 0.4, t), nk = smooth(T.nigeria, T.nigeria + 0.4, t), fk = smooth(T.france, T.france + 0.4, t), on = t >= T.borders && t < T.ban + 0.5;
  if (on) { paintCountry('Kenya', ORANGE, 0.9 * kk, 2.4 * kk); paintCountry('Nigeria', ORANGE, 0.9 * nk, 2.4 * nk); paintCountry('France', ORANGE, 0.85 * fk, 2.0 * fk); paintCountry('Uganda', '#ffd2a0', 0.45 * nk, 0.8 * nk);
    if (t >= T.ethiopia) paintCountry('Ethiopia', GOLD, 0.6 * smooth(T.ethiopia, T.ethiopia + 0.4, t), 1.2); if (t >= T.flight) paintCountry('Ethiopia', GOLD, 0.8, 1.6); }
  if (t >= T.flight) paintCountry('United States of America', BLUE, 0.35 * smooth(T.flight + 0.5, T.flight + 1.5, t), 0.6);
  arcShow(P.arcs.kenya, on ? easeOut(span(t, T.kenya - 0.1, T.kenya + 0.9)) : 0);
  arcShow(P.arcs.uganda, on ? easeOut(span(t, T.nigeria - 0.1, T.nigeria + 0.6)) : 0); arcShow(P.arcs.nigeria, on ? easeOut(span(t, T.ethiopia - 0.2, T.ethiopia + 0.8)) : 0);
  arcShow(P.arcs.france, on ? easeOut(span(t, T.france - 0.1, T.france + 1.1)) : 0);
  const fu = t >= T.flight - 0.2 && t < T.ban + 0.6 ? ease(span(t, T.flight + 0.2, T.wash + 0.6)) : 0; arcShow(P.arcs.usa, fu);
  hotAt(P.out.kenya, P3('nairobi', 1), on ? t : -1, T.kenya + 0.6, 1); hotAt(P.out.nigeria, P3('lagos', 1), on ? t : -1, T.ethiopia + 0.6, 1); hotAt(P.out.france, P3('paris', 1), on ? t : -1, T.france + 0.9, 1);
  // the plane rides the flight arc
  P.plane.visible = fu > 0.01 && fu < 0.999; if (P.plane.visible) { const c = P.arcs.usa.userData.cur, p = c.getPoint(fu), q = c.getPoint(Math.min(1, fu + 0.01)); P.plane.position.copy(p).add(V3(0, 4, 0)); P.plane.lookAt(q.clone().add(V3(0, 4, 0))); P.plane.scale.setScalar(7); }
  // US: airports, then calm green at "zero cases"
  P.air.forEach((g, i) => { const t0 = T.ban + 0.6 + i * 0.12; g.visible = t >= t0 && t < T.ask; if (g.visible) { g.position.copy(llPos(AIRPORTS[i][1], AIRPORTS[i][2], 0)); g.scale.setScalar(5 * easeOut(span(t, t0, t0 + 0.35)) + 0.01); const ph = (t * 0.8 + i * 0.13) % 1; g.userData.ring.scale.setScalar(1 + ph * 2); g.userData.ring.material.opacity = 1 - ph; } });
  if (t >= T.zero - 0.1) { const k = smooth(T.zero - 0.1, T.zero + 0.6, t); STATES.forEach((s, i) => { if (s.name !== 'Alaska' && s.name !== 'Hawaii') paintState(s.name, TEAL, 0.5 * k, (0.4 + 0.6 * ((i * 37) % 11) / 11) * k * (1 - smooth(T.ask + 0.5, T.ask + 1.5, t) * 0.5)); }); }
  if (typeof rims === 'function') rims([...(t < T.borders ? [['country', 'Dem. Rep. Congo', 1]] : []), ...(t >= T.kenya && t < T.flight ? [['country', 'Kenya', 0.8]] : []), ...(t >= T.nigeria && t < T.flight ? [['country', 'Nigeria', 0.8]] : []), ...(t >= T.france && t < T.flight ? [['country', 'France', 0.8]] : [])]);
  palTex.needsUpdate = true; }
// ---- DOM ----
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
const fmtN = n => n.toLocaleString('en-US');
let STK = [];
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const fs = /\bsm\b/.test(cls) ? 20 : 30, w = txt.length * fs * 0.68 + (fs > 20 ? 36 : 24), h = fs * 1.25 + (fs > 20 ? 16 : 10);
  STK.push({ txt, cls, x: clamp(q[0], 70 + w / 2, 1010 - w / 2), y: q[1], w, h, k: pop(t, t0, 0.25) }); return ''; }
function layoutStickers() { const placed = []; STK.sort((a, b) => a.y - b.y);
  for (const s of STK) { let moved = true, n = 0; while (moved && n++ < 12) { moved = false; for (const p of placed) { if (Math.abs(s.x - p.x) < (s.w + p.w) / 2 + 8 && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 6) { s.y = p.y + (s.h + p.h) / 2 + 8; moved = true; } } } placed.push(s); }
  return placed.map(s => `<div class="stk ${s.cls}" style="left:${s.x.toFixed(0)}px;top:${s.y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${s.k.toFixed(3)})">${s.txt}</div>`).join(''); }
function hudAt(t) {
  if (t < 1.8) return null;
  if (t < T.may) return ['BREAKING · NOV 11', 'EBOLA: 11,042 CASES'];
  if (t < T.who) return ['ITURI · CONGO', 'MAY 15'];
  if (t < T.six) return ['MAY 17 · WHO', 'GLOBAL EMERGENCY'];
  if (t < T.deaths) return ['CONGO', t < T.slow ? `PROVINCES: ${Math.max(1, cnt(t, T.six + 0.25, T.eight + 0.2, 8))}` : 'NO SIGN OF SLOWING'];
  if (t < T.half) return ['CONFIRMED DEATHS', fmtN(cnt(t, T.deaths, T.deaths + 2.2, 5387))];
  if (t < T.second) return ['DEATH RATE', '≈ 1 IN 2'];
  if (t < T.strain) return ['EBOLA OUTBREAKS', '#2 EVER'];
  if (t < T.borders) return ['BUNDIBUGYO STRAIN', t < T.vaccine ? 'NEW STRAIN' : 'NO VACCINE'];
  if (t < T.kenya) return ['OUTSIDE CONGO', 'CROSSED BORDERS'];
  if (t < T.nigeria) return ['KENYA', '9 CASES'];
  if (t < T.france) return ['NIGERIA', t < T.ethiopia ? '1 CASE' : 'VIA ETHIOPIA'];
  if (t < T.flight) return ['FRANCE', t < T.recovered ? '1 CASE' : 'RECOVERED'];
  if (t < T.ban) return ['AFRICA → AMERICA', t < T.hours ? 'ONE FLIGHT AWAY' : '≈ 13 HOURS'];
  if (t < T.form) return ['U.S. · SINCE MAY 18', 'ENTRY BAN'];
  if (t < T.zero) return ['SINCE NOV 3', 'A FORM FOR ALL'];
  if (t < T.ask) return [t < T.cdc ? 'CONFIRMED · U.S.' : 'CDC', t < T.cdc ? 'U.S. CASES: 0' : 'RISK: LOW'];
  return null; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  if (P) {
    if (t >= T.may && t < T.six) sticker('ITURI', P3('ituri', 8), t, T.may + 0.2, 'r');
    if (t >= T.may + 0.4 && t < T.six) sticker('CONGO', llPos(24, -3, 6), t, T.may + 0.4, 'w');
    if (t >= T.borders && t < T.flight) sticker('CONGO', P3('ituri', 8), t, T.borders + 0.1, 'r sm');
    if (t >= T.kenya && t < T.flight) sticker('KENYA · 9', P3('nairobi', 8), t, T.kenya + 0.6, 'r sm');
    if (t >= T.nigeria && t < T.flight) sticker('NIGERIA · 1', P3('lagos', 8), t, T.ethiopia + 0.6, 'r sm');
    if (t >= T.ethiopia && t < T.flight + 3) sticker('ETHIOPIA', P3('addis', 8), t, T.ethiopia, 'w sm');
    if (t >= T.france && t < T.flight) sticker('FRANCE · 1', P3('paris', 8), t, T.france + 0.9, 'r sm');
    if (t >= T.flight + 0.6 && t < T.ban) { sticker('ADDIS ABABA', P3('addis', 8), t, T.flight + 0.6, 'w sm'); sticker('WASHINGTON', P3('dulles', 8), t, T.wash, 'b'); }
    if (t >= T.flight + 1.2 && t < T.ban && PROPS.plane.visible) sticker(`${(13 * ease(span(t, T.flight + 0.2, T.wash + 0.6))).toFixed(0)} H`, PROPS.plane.position.clone().add(V3(0, 18, 0)), t, T.flight + 1.2, 'w');
    if (t >= T.ban + 0.6 && t < T.zero) AIRPORTS.forEach((a, i) => sticker(a[0], llPos(a[1], a[2], 22), t, T.ban + 0.7 + i * 0.12, 't sm'));
  }
  h += layoutStickers();
  if (t < 1.8) h += `<div class="hook" style="opacity:${(1 - smooth(1.5, 1.8, t)).toFixed(2)};transform:scale(${pop(t, 0, 0.3).toFixed(3)})"><span class="date">NOV 11 · CONGO</span>Ebola: <span class="hl">11,042</span> cases</div>`;
  if (t >= T.who && t < T.six - 0.1) h += `<div class="stamp" style="white-space:nowrap;font-size:96px;top:1110px;transform:translate(-50%,-50%) rotate(-7deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.who + 0.4, T.who + 0.58)))).toFixed(3)});opacity:${t < T.who + 0.4 ? 0 : 1}">EMERGENCY</div>`;
  if (t >= T.deaths - 0.1 && t < T.strain - 0.1) { const k = pop(t, T.deaths - 0.1, 0.35), hf = t >= T.half, sc = t >= T.second; h += `<div class="bigcal" style="transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-3deg)"><div class="bm">${sc ? 'OUTBREAK SIZE' : hf ? 'DEATH RATE' : 'DEATHS'}</div><div class="bd" style="font-size:${sc ? 190 : hf ? 150 : 140}px">${sc ? '#2' : hf ? '1 IN 2' : fmtN(cnt(t, T.deaths, T.deaths + 2.2, 5387))}</div><div class="by">${sc ? 'LARGEST EBOLA OUTBREAK EVER' : hf ? 'OF EVERYONE INFECTED' : 'OF 11,042 CONFIRMED CASES'}</div></div>`; }
  if (t >= T.vaccine && t < T.borders - 0.1) h += `<div class="stamp" style="white-space:nowrap;font-size:92px;top:1110px;transform:translate(-50%,-50%) rotate(-7deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.vaccine, T.vaccine + 0.18)))).toFixed(3)})">NO VACCINE</div>`;
  if (t >= T.form && t < T.zero - 0.1) { const k = pop(t, T.form, 0.35); h += `<div class="bigcal" style="transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-3deg)"><div class="bm" style="background:linear-gradient(#3d7dff,#2a5ad8)">EVERY PASSENGER</div><div class="bd" style="font-size:44px;font-family:Inter;font-weight:800;line-height:1.3;padding:22px 26px 6px;text-align:left">☑ I have NOT been in Congo in the last 21 days</div><div class="by">SIGN BEFORE BOARDING · SINCE NOV 3</div></div>`; }
  if (t >= T.zero && t < T.ask - 0.1) h += `<div class="stamp" style="white-space:nowrap;font-size:92px;top:1110px;color:#2ad0b0;border-color:#2ad0b0;background:rgba(0,20,16,.3);transform:translate(-50%,-50%) rotate(-6deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.zero, T.zero + 0.18)))).toFixed(3)})">0 U.S. CASES</div>`;
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Would you close<br><span class="hl">the borders?</span> 👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 16 ? 80 : 100) + 'px'; $('sub').textContent = ''; $('sub').style.display = 'none'; }
  let pp = 1; for (const k of EV) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [0.08, T.vaccine, T.zero]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.6; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.0; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(['900', '800', '700', '600'].map(w => document.fonts.load(`${w} 160px Inter`))); window.renderAt(0); return true; })();
