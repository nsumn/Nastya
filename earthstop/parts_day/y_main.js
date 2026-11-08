// =================== "The last 24 hours" — camera, map state, DOM; every frame is a pure function of t ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// ---- places (lon, lat) ----
const PL = { dc: [-77.04, 38.9], ak: [-152, 63.5], ms: [-89.7, 32.7], us: [-97, 38.5], austin: [-97.74, 30.27], israel: [34.9, 31.4], europe: [16, 50.5], abu: [54.37, 24.45],
  moscow: [37.62, 55.75], kyiv: [30.52, 50.45], ukr: [31.4, 49.0], jer: [35.21, 31.77], brussels: [4.35, 50.85] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
// ---- camera: holds (slow push / orbit) joined by flights (ease + a hop in height ∝ distance) ----
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
let HOLDS = null;
function holds() { const dc = P3('dc');
  return [[0, T.wash, shot([-50, 34], 1500, 0, 0.16), shot([-62, 35], 1050, 0.06, 0.2)],
    [T.wash + 1.0, T.press - 0.05, shot(off('dc', 0, 1), 78, -0.45, 0.6), shot(off('dc', 0, 1), 62, 0.05, 0.65)],
    [T.press + 0.35, T.doj, shot(off('dc', -1, 1), 66, 0.35, 0.65), shot(off('dc', -1, 1), 56, 0.7, 0.7)],
    [T.doj + 0.5, T.mid, shot(off('dc', 6, 4), 60, 1.2, 0.65), shot(off('dc', 6, 4), 50, 1.5, 0.7)],
    [T.mid + 1.1, T.ms, shot('ak', 270, 0, 0.42), shot('ak', 225, 0.12, 0.45)],
    [T.ms + 1.0, T.house, shot('ms', 120, 0, 0.45), shot('ms', 95, -0.1, 0.5)],
    [T.house + 0.55, T.texas, shot(off('us', 0, 4), 470, 0, 0.42), shot(off('us', 0, 4), 410, 0.08, 0.45)],
    [T.texas + 0.85, T.over, shot(off('austin', 0, 1), 62, 0.5, 0.6), shot(off('austin', 0, 1), 50, 0.9, 0.65)],
    [T.over + 2.4, T.europe, shot(off('israel', -1, 1), 120, 0, 0.45), shot(off('israel', -1, 1), 92, 0.15, 0.5)],
    [T.europe + 0.85, T.abu, shot('europe', 640, 0, 0.42), shot('europe', 560, 0.06, 0.45)],
    [T.abu + 0.8, T.zel, shot([44, 40], 780, 0, 0.42), shot([40, 43], 700, -0.05, 0.45)],
    [T.zel + 0.7, T.outro, shot('ukr', 240, 0, 0.45), shot('ukr', 200, 0.12, 0.5)],
    [T.outro + 1.1, T_END, shot([-35, 38], 1500, 0, 0.16), shot([-35, 38], 1700, 0.05, 0.16)]]; }
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
// ---- props timeline ----
let PROPS = null;
function buildProps() { const P = {};
  P.intro = ['dc', 'austin', 'ak', 'jer', 'brussels', 'abu', 'kyiv'].map(k => makePin(GOLD));
  P.whP = off('dc', -3, 0.5); P.dojP = off('dc', 9, 5);
  P.akD = makeBar(BLUE); P.akR = makeBar(RED); P.hD = makeBar(BLUE); P.hR = makeBar(RED); P.ilE = makeBar(BLUE); P.ilN = makeBar('#8a90a0');
  P.abuPin = makePin(GOLD); P.austinPin = makePin(GOLD);
  P.arcIL = makeArc(P3('austin', 0.5), P3('jer', 0.5), 260, GOLD); P.arcMo = makeArc(P3('moscow', 0.5), P3('abu', 0.5), 70, '#ff7a5a'); P.arcKy = makeArc(P3('kyiv', 0.5), P3('abu', 0.5), 70, '#ffd84a'); P.arcUS = makeArc(P3('dc', 0.5), P3('abu', 0.5), 420, '#8fb6ff');
  // the Ukrainian grid: lights scattered over the country (sampled from the id canvas)
  const pts = []; let tries = 0; while (pts.length < 70 && tries++ < 4000) { const lon = R(22.2, 40.2), lat = R(44.4, 52.3); if (countryAt(lon, lat) === 'Ukraine') pts.push(llPos(lon, lat, 0)); }
  P.grid = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), pts.length); P.gridPts = pts; P.gridPh = pts.map(() => rnd()); P.grid.visible = false; P.grid.frustumCulled = false; MAPSC.add(P.grid);
  const m4 = new THREE.Matrix4(); pts.forEach((p, i) => { m4.makeTranslation(p.x, 3.2, p.z); P.grid.setMatrixAt(i, m4); P.grid.setColorAt(i, new THREE.Color(GOLD)); });
  P.EU = ['Germany', 'France', 'Italy', 'Spain', 'Poland', 'Netherlands', 'Belgium', 'Austria', 'Czechia', 'Sweden', 'Finland', 'Denmark', 'Ireland', 'Portugal', 'Greece', 'Romania', 'Bulgaria', 'Hungary', 'Slovakia', 'Croatia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia', 'Luxembourg', 'United Kingdom', 'Norway', 'Switzerland'];
  return P; }
function placeBar(b, pos, w, h) { b.visible = h > 0.05; b.position.copy(pos); b.scale.set(w, Math.max(0.01, h), w); }
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  // intro pins (preview of today's places) — back again at the outro
  P.intro.forEach((p, i) => { const a = 1.15 + i * 0.22, on = (t >= a && t < T.wash + 0.5) || t >= T.outro + 0.3; p.visible = on; if (on) { const k = t >= T.outro ? pop(t, T.outro + 0.3 + i * 0.12, 0.35) : pop(t, a, 0.35); const kp = (t >= T.outro ? (1 - smooth(T_END - 0.5, T_END, t)) : 1 - smooth(T.wash, T.wash + 0.5, t));
    p.position.copy(P3(['dc', 'austin', 'ak', 'jer', 'brussels', 'abu', 'kyiv'][i], 0)); const s = mCam.position.y / 50 * k * Math.max(0.01, kp); p.scale.setScalar(s); p.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3 + i * 0.3) % 1)); p.userData.ring.material.opacity = 1 - ((t * 1.3 + i * 0.3) % 1); } });
  // Washington: White House + Justice Department
  WH.visible = t >= T.wash + 0.3 && t < T.mid + 0.6; if (WH.visible) { const k = easeOut(span(t, T.wash + 0.5, T.wash + 1.2)); WH.position.copy(P.whP).setY(0.3 + 6 * (1 - k)); WH.scale.setScalar(1.7 * k + 0.01); WH.rotation.y = 0; }
  DOJ.visible = t >= T.doj && t < T.mid + 0.6; if (DOJ.visible) { const k = easeOut(span(t, T.doj + 0.3, T.doj + 0.9)); DOJ.position.copy(P.dojP).setY(0.3 + 6 * (1 - k)); DOJ.scale.setScalar(1.5 * k + 0.01); DOJ.rotation.y = 0.2; }
  if (t >= T.wash && t < T.mid + 0.6) { paintState('District of Columbia', GOLD, 0.9, 0.6); paintState('Maryland', '#26324a', 0.35); paintState('Virginia', '#26324a', 0.35); }
  // Alaska: grey pulsing (still counting) + two close bars
  const akOn = t >= T.mid && t < T.ms + 0.8; if (akOn) { paintState('Alaska', GREY, 0.45 + 0.2 * Math.sin(t * 6), 0.8); }
  { const g = easeOut(span(t, T.peltola, T.peltola + 1.0)), vis = t >= T.peltola && t < T.ms + 0.6; const s = 1 - smooth(T.ms, T.ms + 0.6, t);
    placeBar(P.akD, off('ak', -5, 6), 7, vis ? (48.2 - 38) * 4.2 * g * s : 0); placeBar(P.akR, off('ak', 5, 6), 7, vis ? (47.9 - 38) * 4.2 * g * s : 0); }
  // Mississippi
  if (t >= T.ms && t < T.house + 0.4) paintState('Mississippi', t >= T.votes ? BLUE : GREY, (t >= T.votes ? 0.85 : 0.45 + 0.2 * Math.sin(t * 6)), t >= T.votes ? 1.2 * easeOut(span(t, T.votes, T.votes + 0.4)) : 0.6);
  // House: everything tinted + two big bars over Kansas
  if (t >= T.house && t < T.texas + 0.4) { const k = smooth(T.house, T.house + 0.5, t); STATES.forEach(s => { if (s.name !== 'Alaska' && s.name !== 'Hawaii') paintState(s.name, '#1e2a48', 0.4 * k); }); }
  { const vis = t >= T.house + 0.3 && t < T.texas + 0.4, g = easeOut(span(t, T.house + 0.4, T.h253 + 1.2)), s = 1 - smooth(T.texas, T.texas + 0.4, t);
    placeBar(P.hD, off('us', -9, 6), 14, vis ? 253 * 0.32 * g * s : 0); placeBar(P.hR, off('us', 9, 6), 14, vis ? 157 * 0.32 * g * s : 0); }
  // Texas: Austin pin, the truck drives, then turns into a robotaxi pod
  const txOn = t >= T.texas && t < T.over + 0.5; if (txOn) paintState('Texas', '#c9a46a', 0.18);
  P.austinPin.visible = txOn; if (txOn) { P.austinPin.position.copy(off('austin', -5, -3)); P.austinPin.scale.setScalar(pop(t, T.texas + 0.6, 0.35) * 2.6); P.austinPin.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); P.austinPin.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
  { const on = t >= T.texas + 0.5 && t < T.over + 0.5, k = smooth(T.robo - 0.15, T.robo + 0.25, t); const x = lerp(-14, 10, span(t, T.texas + 0.5, T.over));
    TRUCK.visible = on && k < 0.999; POD.visible = on && k > 0.001; const base = off('austin', x, 2);
    if (TRUCK.visible) { TRUCK.position.copy(base).setY(0.35); TRUCK.scale.setScalar(2.4 * (1 - k) + 0.001); TRUCK.rotation.y = 0; }
    if (POD.visible) { POD.position.copy(base).setY(0.35); POD.scale.setScalar(2.6 * pop(t, T.robo, 0.35)); POD.rotation.y = 0; } }
  // the hop to Israel: an arc drawn during the flight
  arcShow(P.arcIL, t < T.over || t > T.europe + 0.3 ? 0 : easeOut(span(t, T.over + 0.1, T.over + 2.2)) * (1 - smooth(T.europe - 0.2, T.europe + 0.3, t) * 0.999));
  if (t >= T.israel - 0.3 && t < T.europe + 0.6) { paintCountry('Israel', BLUE, 0.9 * smooth(T.israel - 0.3, T.israel + 0.2, t), 1.2); }
  { const vis = t >= T.n67 - 0.2 && t < T.europe + 0.4, g = easeOut(span(t, T.n67, T.n67 + 1.0)), s = 1 - smooth(T.europe, T.europe + 0.4, t);
    placeBar(P.ilE, llPos(32.2, 32.6, 0), 3.2, vis ? 67 * 0.2 * g * s : 0); placeBar(P.ilN, llPos(32.9, 31.6, 0), 3.2, vis ? 46 * 0.2 * g * s : 0); }
  // Europe lights up west → east; Russia warm
  if (t >= T.europe && t < T.zel + 0.5) { P.EU.forEach(n => { const c = CT(n); if (!c) return; const k = smooth(T.europe + 0.1 + (c.lon + 10) * 0.012, T.europe + 0.45 + (c.lon + 10) * 0.012, t); paintCountry(n, BLUE, 0.8 * k, 0.8 * k); });
    paintCountry('Russia', RED, 0.45 * smooth(T.russia - 0.2, T.russia + 0.3, t), 0.4); paintCountry('Ukraine', GOLD, 0.35 * smooth(T.abu, T.abu + 0.5, t)); }
  // Abu Dhabi: pin + three arcs converging
  P.abuPin.visible = t >= T.abu + 0.3 && t < T.outro + 0.3; if (P.abuPin.visible) { P.abuPin.position.copy(P3('abu')); P.abuPin.scale.setScalar(pop(t, T.abu + 0.3, 0.35) * mCam.position.y / 45); P.abuPin.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); P.abuPin.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
  const arcK = (a) => t < a || t > T.outro + 0.3 ? 0 : easeOut(span(t, a, a + 0.9)); arcShow(P.arcMo, arcK(T.abu + 0.5)); arcShow(P.arcKy, arcK(T.abu + 0.7)); arcShow(P.arcUS, arcK(T.abu + 0.9));
  // Ukraine's grid: lights on, then flicker and go dark after "fired"
  P.grid.visible = t >= T.zel - 0.3 && t < T.outro + 0.5; if (P.grid.visible) { paintCountry('Ukraine', GOLD, 0.4, 0.5); const c = new THREE.Color(), m4 = new THREE.Matrix4();
    P.gridPts.forEach((p, i) => { const off = T.fired + 0.25 + P.gridPh[i] * 1.6; const dark = t > off ? 1 : 0, fl = t > off - 0.25 && t < off ? (Math.sin(t * 60 + i) > 0 ? 1 : 0.2) : 1; const k = dark ? 0.08 : fl;
      c.set(GOLD).multiplyScalar(k * 1.6); P.grid.setColorAt(i, c); const s = mCam.position.y / 220 * pop(t, T.zel - 0.3 + P.gridPh[i] * 0.4, 0.3); m4.makeScale(s, s, s).setPosition(p.x, 3.2, p.z); P.grid.setMatrixAt(i, m4); });
    P.grid.instanceColor.needsUpdate = true; P.grid.instanceMatrix.needsUpdate = true; }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { miller: ['Stephen Miller', 'NEW CHIEF OF STAFF'], wiles: ['Susie Wiles', 'OUTGOING'], dana_white: ['Dana White', 'UFC PRESIDENT'], trump: ['Donald Trump', 'PRESIDENT'],
  peltola: ['Mary Peltola', 'ALASKA · DEMOCRAT'], colom: ['Scott Colom', 'MISSISSIPPI · DEMOCRAT'], musk: ['Elon Musk', 'TESLA CEO'], eisenkot: ['Gadi Eisenkot', 'TAPPED TO LEAD'],
  netanyahu: ['Benjamin Netanyahu', 'CARETAKER PM'], zelensky: ['Volodymyr Zelensky', 'PRESIDENT OF UKRAINE'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const fx = o.fx ?? 0;
  const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/photos/${key}.jpg">${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const x = clamp(q[0], 160, 900);
  return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${q[1].toFixed(0)}px;transform:translate(-50%,-100%) scale(${pop(t, t0, 0.25).toFixed(3)})">${txt}</div>`; }
function barLabel(b, txt, t, t0, cls = '') { if (!b.visible) return ''; const top = b.position.clone().setY(b.scale.y + 1.5); return sticker(txt, top, t, t0, cls); }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
function hudAt(t) {
  if (t < T.wash + 0.6) return null;
  if (t < T.press) return ['01 · WHITE HOUSE', 'NEW CHIEF OF STAFF', t < T.replaces ? 'STEPHEN MILLER' : 'REPLACES SUSIE WILES · MONDAY'];
  if (t < T.doj) return ['02 · WHITE HOUSE', 'PRESS SECRETARY?', t < T.dana ? 'THE JOB IS OPEN' : 'OFFERED TO UFC BOSS DANA WHITE'];
  if (t < T.mid) return ['03 · JUSTICE DEPARTMENT', t < T.extortion ? 'PROBE ORDERED' : '“EXTORTION”', 'INTO DEMOCRATS WHO THREATENED IMPEACHMENT'];
  if (t < T.alaska) return ['04 · MIDTERMS 2026', 'STILL COUNTING', 'TWO SENATE SEATS UNDECIDED'];
  if (t < T.ms) return ['04 · ALASKA · SENATE', t < T.peltola + 0.2 ? '48.2 · 47.9' : `${(cnt(t, T.peltola, T.peltola + 1.0, 482) / 10).toFixed(1)} · ${(cnt(t, T.peltola, T.peltola + 1.0, 479) / 10).toFixed(1)}`, t < T.suing ? 'PELTOLA (D) · SULLIVAN (R) · % OF VOTE' : 'LAWSUIT OVER REJECTED BALLOTS'];
  if (t < T.house) return ['05 · MISSISSIPPI · SENATE', t < T.votes ? 'TOO CLOSE' : `+${fmt(cnt(t, T.votes, T.votes + 0.9, 2500))}`, t < T.votes ? 'STILL COUNTING' : 'VOTES · COLOM (D) AHEAD'];
  if (t < T.texas) return ['06 · U.S. HOUSE · 435 SEATS', String(cnt(t, T.house + 0.4, T.h253 + 1.2, 253)), 'DEMOCRATS SO FAR · 218 NEEDED'];
  if (t < T.over) return ['07 · TEXAS · TESLA', t < T.robo ? 'CYBERTRUCK ENDS' : '→ ROBOTAXIS', 'PRODUCTION STOPS BY MID-2027'];
  if (t < T.europe) return ['08 · ISRAEL', t < T.n67 ? 'NOT NETANYAHU' : `${cnt(t, T.n67, T.n67 + 1.0, 67)} / 120`, t < T.n67 ? 'EISENKOT TAPPED TO FORM A GOVERNMENT' : 'LAWMAKERS BACK EISENKOT'];
  if (t < T.abu) return ['09 · EUROPE', t < T.no ? 'A U.S.–RUSSIA DEAL?' : '“NO.”', 'NOT OVER EUROPE’S HEAD'];
  if (t < T.zel) return ['10 · ABU DHABI', t < T.close ? 'TALKS TUESDAY' : '“VERY CLOSE”', t < T.close ? 'RUSSIA · UKRAINE · U.S. MEDIATES' : 'TRUMP ON A UKRAINE DEAL'];
  if (t < T.outro) return ['11 · UKRAINE', 'POWER GRID HIT', 'BALLISTIC MISSILES, ZELENSKY SAYS'];
  return null; }
function introHTML(t) { if (t > T.wash + 0.5) return ''; const k = pop(t, T.intro, 0.35), a = 1 - smooth(T.wash + 0.1, T.wash + 0.5, t), bar = easeOut(span(t, T.intro + 0.2, T.intro + 0.8));
  const hh = Math.max(0, 24 - span(t, T.intro + 0.3, T.wash) * 24), clock = `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}:${String(Math.floor((hh * 3600) % 60)).padStart(2, '0')}`;
  return `<div id="intro" style="opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><div class="idate"><b>●</b> SUNDAY · NOV 8, 2026</div><div class="ititle">The last</div><div class="iplate" style="transform:skewX(-8deg) scale(${(0.6 + 0.4 * easeOut(span(t, T.intro + 0.15, T.intro + 0.45))).toFixed(3)})"><span>24 HOURS</span></div>
    <div><div class="isub" style="opacity:${smooth(T.intro + 0.5, T.intro + 0.8, t)}">IN AMERICA <i>&</i> AROUND THE WORLD</div></div><div class="iclock">${clock}</div></div>`; }
function domAt(t) { const P = PROPS; let h = introHTML(t);
  // cards (left x 100 / right x 640, y ≈ 640: between the HUD and the captions)
  h += card('wiles', T.wiles - 0.6, T.press, 110, 650, t, { small: true, dim: t >= T.replaces, tag: t >= T.replaces ? 'OUT' : '', tagc: 'r', tagT: T.replaces });
  h += card('miller', T.miller - 0.05, T.press, 600, 620, t, { tag: t >= T.replaces ? 'IN' : '', tagc: 'b', tagT: T.replaces + 0.15 });
  h += card('dana_white', T.dana - 0.05, T.doj, 600, 620, t, { tag: t >= T.monday2 ? 'MEETING MONDAY' : '', tagc: 'b', tagT: T.monday2 });
  h += card('trump', T.justice - 0.1, T.mid, 110, 640, t, { quote: '“EXTORTION”', qT: T.extortion });
  h += card('peltola', T.peltola - 0.05, T.ms, 110, 640, t, { tag: t >= T.suing ? 'SUING' : '', tagc: 'b', tagT: T.suing + 0.1 });
  h += card('trump', T.trumpAK - 0.05, T.ms, 640, 660, t, { small: true, quote: '“IT’S OVER”', qT: T.trumpAK + 0.4 });
  h += card('colom', T.colom - 0.05, T.house, 600, 640, t);
  h += card('musk', T.tesla - 0.05, T.over, 110, 640, t, { small: true });
  h += card('eisenkot', T.eisenkot - 0.05, T.europe, 110, 640, t, { tag: t >= T.n67 ? '67 SEATS' : '', tagc: 'b', tagT: T.n67 + 0.2 });
  h += card('netanyahu', T.netanyahu - 0.05, T.europe, 660, 690, t, { small: true, dim: true });
  h += card('trump', T.vclose - 0.2, T.zel, 640, 650, t, { small: true, quote: '“VERY CLOSE”', qT: T.vclose });
  h += card('zelensky', wordT('Zelensky', T.zel) - 0.05, T.outro, 110, 640, t, { small: true });
  if (P) {
    if (t >= T.wash + 1.0 && t < T.mid) h += sticker('WHITE HOUSE', P.whP.clone().setY(9), t, T.wash + 1.0, 'sm w');
    if (t >= T.doj + 0.6 && t < T.mid) h += sticker('JUSTICE DEPT.', P.dojP.clone().setY(7), t, T.doj + 0.6, 'sm w');
    if (t >= T.alaska && t < T.ms) { h += barLabel(P.akD, 'PELTOLA (D) 48.2%', t, T.peltola + 0.6, 'b sm'); h += barLabel(P.akR, 'SULLIVAN (R) 47.9%', t, T.peltola + 0.8, 'r sm'); }
    if (t >= T.ms + 0.8 && t < T.house) h += sticker(t >= T.votes ? 'COLOM +2,500' : 'TOO CLOSE TO CALL', stPos('Mississippi', 8), t, t >= T.votes ? T.votes : T.ms + 0.8, t >= T.votes ? 'b' : 'g');
    if (t >= T.house + 0.4 && t < T.texas) { h += barLabel(P.hD, `DEM ${cnt(t, T.house + 0.4, T.h253 + 1.2, 253)}`, t, T.house + 0.5, 'b'); h += barLabel(P.hR, `GOP ${cnt(t, T.house + 0.4, T.h253 + 1.2, 157)}`, t, T.house + 0.6, 'r'); }
    if (t >= T.texas + 0.9 && t < T.over) h += sticker('AUSTIN · GIGAFACTORY', off('austin', -5, -3).setY(12), t, T.texas + 0.9, 'sm w');
    if (t >= T.n67 && t < T.europe) { h += barLabel(P.ilE, 'EISENKOT 67', t, T.n67 + 0.4, 'b sm'); h += barLabel(P.ilN, 'NETANYAHU 46', t, T.n67 + 0.6, 'g sm'); }
    if (t >= T.abu + 0.5 && t < T.zel) { h += sticker('ABU DHABI · TUE', P3('abu', 14), t, T.abu + 0.5, 'w'); h += sticker('MOSCOW', P3('moscow', 3), t, T.abu + 0.6, 'r sm'); h += sticker('KYIV', P3('kyiv', 3), t, T.abu + 0.8, 'sm'); }
  }
  if (t >= T.no && t < T.abu) h += `<div class="stamp" style="transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.no, T.no + 0.18)))).toFixed(3)})">NO</div>`;
  if (t >= T.follow - 0.2 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.follow - 0.2, T.follow + 0.1, t)};transform:scale(${pop(t, T.follow - 0.2, 0.35).toFixed(3)})">Follow for <span class="hl">tomorrow’s</span><br>24 hours</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.wash + 0.6, T.press, T.doj, T.extortion, T.mid, T.alaska, T.ms, T.votes, T.house, T.texas, T.robo, T.over, T.n67, T.europe, T.no, T.abu, T.close, T.zel]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.extortion, T.no]) f = Math.max(f, 1 - Math.abs(t - k - 0.05) / 0.15); for (const k of [T.intro]) f = Math.max(f, 1 - Math.abs(t - k - 0.05) / 0.2); return Math.max(0, f); }
window.renderAt = (t) => { mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
