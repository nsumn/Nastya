const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// =================== "Why is Alaska still counting votes?" (Nov 9 2026) — map v2, glass cards, stickers that never overlap ===================
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { q: 0, n637: wordT('637', S[1]), dist: S[2], big: S[3], road: S[4], plane: S[5], mail: S[6], ten: wordT('ten', S[6]), fifteen: wordT('fifteen', S[6]), law: S[7], scan: S[8], veto: wordT('vetoed', S[9]),
  rcv: S[10], fifty: wordT('fifty', S[11]), elim: wordT('eliminated', S[11]), move: wordT('move', S[11]), nov18: S[12], hist: S[13], twist: S[14], two: wordT('two', S[15]), flip: S[16], ask: S[17] };
const CUES = [[0.02, 'whoosh', 0.5], [T.n637, 'thud', 0.7], [T.dist - 0.3, 'whoosh', 0.55], [T.big + 0.3, 'pop', 0.4], [wordT('California', S[3]), 'pop', 0.4], [wordT('Montana', S[3]), 'pop', 0.4], [T.road - 0.2, 'whoosh', 0.45],
  [T.plane, 'whoosh', 0.35], [T.mail, 'pop', 0.5], [T.ten, 'flip', 0.5], [T.fifteen, 'flip', 0.5], [T.law - 0.3, 'whoosh', 0.55], [T.scan + 0.5, 'thud', 0.4], [T.veto, 'stamp', 0.8], [T.rcv - 0.3, 'whoosh', 0.55],
  [T.fifty, 'rise', 0.5], [T.elim, 'flip', 0.6], [T.move, 'whoosh', 0.35], [T.nov18, 'thud', 0.5], [T.twist, 'whoosh', 0.5], [T.two, 'stamp', 0.6], [T.flip, 'rise', 0.5], [T.ask, 'pop', 0.5], [ENDC, 'thud', 0.5]];
const PL = { ak: [-152, 63.5], anc: [-149.9, 61.22], jun: [-134.42, 58.3], bethel: [-161.76, 60.79], nome: [-165.41, 64.5], kotz: [-162.6, 66.9], utq: [-156.79, 71.29], dill: [-158.46, 59.04], yukon: [-145.25, 66.56], kodiak: [-152.4, 57.79], galena: [-156.93, 64.74] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.dist - 0.4, shot([-152, 62.6], 255, 0, 0.42), shot([-152, 62.8], 225, 0.06, 0.45)],
    [T.dist + 0.2, T.road - 0.3, shot([-152, 63.2], 300, -0.05, 0.36), shot([-152, 63.2], 285, 0.05, 0.38)],
    [T.road + 0.6, T.mail - 0.3, shot([-157, 61.6], 115, -0.35, 0.72), shot([-154, 61.3], 98, 0.2, 0.78)],
    [T.mail + 0.5, T.law - 0.3, shot([-151, 63.3], 230, 0, 0.4), shot([-151, 63.3], 210, 0.08, 0.43)],
    [T.law + 0.7, T.rcv - 0.3, shot(off('jun', 0, 1), 105, 0.25, 0.6), shot(off('jun', 0, 1), 88, 0.55, 0.66)],
    [T.rcv + 0.8, T.twist - 0.3, shot([-151, 62.6], 240, 0.1, 0.4), shot([-150, 62.4], 205, -0.12, 0.44)],
    [T.twist + 0.4, T.ask - 0.2, shot(off('anc', 0, 4), 115, -0.2, 0.6), shot(off('anc', 0, 4), 95, 0.25, 0.66)],
    [T.ask + 0.3, T_END, shot([-152, 63], 290, 0, 0.4), shot([-152, 63], 320, 0.05, 0.38)]]; }
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
async function stateRing(name) { const us = await fetch('node_modules/us-atlas/states-10m.json').then(r => r.json()); const f = topojson.feature(us, us.objects.states).features.find(q => q.properties.name === name);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; let best = null, ba = 0; for (const p of polys) if (p[0].length > ba) { ba = p[0].length; best = p[0]; } return best.filter((_, i) => i % 2 === 0); }
const RINGS = {};
// a state outline moved onto Alaska, drawn with ALASKA's east–west stretch (true km widths × CLAT / cos 64°), so the size comparison stays honest on this map
function ghost(name, col, at) { const ring = RINGS[name], c = ST(name); const k = CLAT / Math.cos(64 * Math.PI / 180);
  const sh = new THREE.Shape(ring.map(([lon, lat]) => new THREE.Vector2((lon - c.lon) * Math.cos(lat * Math.PI / 180) * k * SC, (lat - c.lat) * SC)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }).rotateX(-Math.PI / 2), [new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, transparent: true, opacity: 0.9, emissive: col, emissiveIntensity: 0.2 }), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })]);
  m.position.copy(llPos(at[0], at[1])); m.visible = false; MAPSC.add(m); return m; }
function plane3() { const g = new THREE.Group(), w = new THREE.MeshStandardMaterial({ color: '#f4f4f6', roughness: 0.5, flatShading: true }), r = new THREE.MeshStandardMaterial({ color: '#d83a3a', roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 3.2, 10).rotateZ(Math.PI / 2), w); g.add(body); const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 10).rotateZ(-Math.PI / 2), r); nose.position.x = 1.9; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 4.2), w); wing.position.set(0.3, 0.25, 0); g.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 1.5), w); tail.position.set(-1.45, 0.1, 0); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.05), r); fin.position.set(-1.45, 0.45, 0); g.add(fin); for (const z of [-0.9, 0.9]) { const fl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.18), r); fl.position.set(0.2, -0.55, z); g.add(fl); }   // floats: a bush plane
  const ballot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); ballot.position.set(0, 0.45, 0); ballot.rotation.y = 0.4; g.add(ballot); g.visible = false; MAPSC.add(g); return g; }
function boat3() { const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: '#2c5d8a', roughness: 0.5 })); hull.position.y = 0.25; g.add(hull);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), new THREE.MeshStandardMaterial({ color: '#f2f2f2' })); cab.position.set(-0.3, 0.75, 0); g.add(cab); g.visible = false; MAPSC.add(g); return g; }
function buildProps() { const P = {};
  P.ghosts = [ghost('Texas', '#ff8a3a', [-149.5, 63.4]), ghost('California', '#ffd23a', [-158.5, 61.6]), ghost('Montana', '#8fd36a', [-145.8, 66.2])];
  P.villages = ['bethel', 'nome', 'kotz', 'utq', 'dill', 'yukon', 'galena'];
  P.vPins = P.villages.map(() => makePin(GOLD)); P.ancPin = makePin('#ffffff');
  P.planes = P.villages.map(k => { const a = P3(k, 0.5), b = P3('anc', 0.5); const cur = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(14), b); return { cur, m: plane3() }; });
  P.boat = boat3(); P.boatCur = new THREE.CatmullRomCurve3([P3('kodiak', 0.4), llPos(-152.0, 58.6, 0.4), llPos(-151.6, 59.4, 0.4), llPos(-151.4, 60.3, 0.4), llPos(-150.6, 61.0, 0.4)]);
  // the scanner, locked until election night
  P.scan = new THREE.Group(); { const g = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o }); const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 3.6), g('#d9dce2')); body.position.y = 1.6; P.scan.add(body);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.5), g('#20242b')); slot.position.set(0, 3.25, 0.6); P.scan.add(slot); const scr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.1), new THREE.MeshBasicMaterial({ color: '#ff4a4a' })); scr.position.set(1.7, 2.2, 1.82); P.scan.add(scr); P.scr = scr;
    P.lock = new THREE.Group(); const lb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 0.6), g('#c9a33a', { metalness: 0.8, roughness: 0.3 })); P.lock.add(lb); const sh = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.16, 10, 24, Math.PI), g('#bfc5cc', { metalness: 0.9, roughness: 0.25 })); sh.position.y = 0.75; P.lock.add(sh); P.lock.position.set(-1.2, 2.0, 2.2); P.scan.add(P.lock); }
  P.scan.visible = false; MAPSC.add(P.scan);
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
function pulsePin(p, pos, t, t0, sc) { p.visible = true; p.position.copy(pos); p.scale.setScalar(pop(t, t0, 0.35) * sc); p.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); p.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  const grey = t < T.dist || (t >= T.rcv && t < T.ask + 0.3); const pl = 0.42 + 0.22 * Math.sin(t * 6);
  paintState('Alaska', grey ? GREY : '#9fb7c9', grey ? pl : 0.22, grey ? 0.9 : 0.4);
  // size comparison: Texas, California, Montana dropped onto Alaska
  P.ghosts.forEach((g, i) => { const a = [wordT('Texas', S[3]), wordT('California', S[3]), wordT('Montana', S[3])][i]; const on = t >= a - 0.05 && t < T.road + 0.3; g.visible = on; if (on) { const k = easeOut(span(t, a, a + 0.45)), o = 1 - smooth(T.road - 0.1, T.road + 0.3, t); g.position.y = 2.5 + 14 * (1 - k); g.scale.set(1, Math.max(0.01, o), 1); } });
  // villages off the road system, bush planes and a boat bringing ballots to Anchorage
  P.vPins.forEach((p, i) => { const a = T.road + 0.3 + i * 0.18; if (t >= a && t < T.mail + 0.2) pulsePin(p, P3(P.villages[i]), t, a, mCam.position.y / 45); else p.visible = false; });
  if (t >= T.road + 0.3 && t < T.mail + 0.2) pulsePin(P.ancPin, P3('anc'), t, T.road + 0.3, mCam.position.y / 40); else P.ancPin.visible = false;
  P.planes.forEach((q, i) => { const a = T.plane - 0.6 + i * 0.22, u = span(t, a, a + 2.6); const on = t >= a && u < 1 && t < T.mail + 0.2; q.m.visible = on; if (on) { const e = ease(u); q.cur.getPoint(e, v1); q.cur.getPoint(Math.min(1, e + 0.01), v2);
      q.m.position.copy(v1); q.m.lookAt(v2); q.m.rotateY(-Math.PI / 2); q.m.scale.setScalar(mCam.position.y / 40); } });
  { const u = span(t, T.plane - 0.2, T.mail + 0.2), on = t >= T.plane - 0.2 && t < T.mail + 0.2; P.boat.visible = on; if (on) { P.boatCur.getPoint(u, v1); P.boatCur.getPoint(Math.min(1, u + 0.01), v2); P.boat.position.copy(v1); P.boat.lookAt(v2); P.boat.rotateY(-Math.PI / 2); P.boat.scale.setScalar(mCam.position.y / 45); } }
  // Juneau: the locked scanner
  { const on = t >= T.law && t < T.rcv + 0.3; P.scan.visible = on; if (on) { const k = easeOut(span(t, T.law + 0.4, T.law + 1.1)); P.scan.position.copy(off('jun', 0, 0)).setY(4.5 + 8 * (1 - k)); P.scan.scale.setScalar(1.7 * k + 0.01); P.scan.rotation.y = -0.35;
      P.lock.rotation.z = 0.15 * Math.sin(t * 8) * (t > T.scan + 0.5 && t < T.scan + 1.2 ? 1 : 0); P.scr.material.color.set(Math.sin(t * 5) > 0 ? '#ff4a4a' : '#7a1f1f'); } }
  if (t >= T.law && t < T.rcv + 0.3) paintState('Alaska', '#9fb7c9', 0.18, 0.4);
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { peltola: ['Mary Peltola', 'DEMOCRAT · LEADS BY 637'], sullivan: ['Dan Sullivan', 'REPUBLICAN · U.S. SENATOR'] };
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
  if (t < T.dist) return ['ALASKA · U.S. SENATE', t < T.n637 ? 'STILL COUNTING?' : `${cnt(t, T.n637, T.n637 + 0.9, 637)} VOTES`, t < T.n637 ? 'ALMOST A WEEK AFTER ELECTION DAY' : 'APART · COUNT FROZEN SINCE NOV 4'];
  if (t < T.mail) return ['1 · DISTANCE', t < T.road ? 'BIGGER THAN TX + CA + MT' : 'NO ROADS', t < T.road ? '665,000 SQ MI · ALASKA' : 'BALLOTS FLY IN BY PLANE · OR COME BY BOAT'];
  if (t < T.law) return ['MAIL DEADLINES', t < T.ten ? 'BALLOTS STILL COMING' : t < T.fifteen ? '+10 DAYS' : '+15 DAYS', t < T.fifteen ? 'MAILED FROM THE U.S.' : 'MAILED FROM OVERSEAS'];
  if (t < T.rcv) return ['2 · THE LAW', t < T.veto ? 'NO EARLY SCANNING' : 'FIX: VETOED', t < T.veto ? 'ABSENTEE BALLOTS WAIT FOR ELECTION NIGHT' : 'A BIPARTISAN BILL · 2026'];
  if (t < T.twist) return ['3 · RANKED CHOICE', t < T.elim ? '50% + 1 TO WIN' : t < T.nov18 ? 'LAST PLACE OUT' : t < T.hist ? '≈ NOV 18' : '2008 · 2010', t < T.elim ? 'NOBODY HAS IT YET' : t < T.nov18 ? 'VOTES MOVE TO THE NEXT CHOICE' : t < T.hist ? 'THE RANKED-CHOICE COUNT' : '~2 WEEKS TO CALL THE SENATE RACE'];
  if (t < T.ask) return ['THE TWIST', t < T.flip ? '2 DAN SULLIVANS' : 'COULD FLIP', t < T.flip ? 'ON THE SAME BALLOT' : 'PELTOLA LEADS ON FIRST CHOICES'];
  return null; }
function calHTML(t) { if (t < T.mail - 0.2 || t >= T.law) return ''; const a = smooth(T.mail - 0.2, T.mail + 0.2, t) * (1 - smooth(T.law - 0.3, T.law, t)); let h = '';
  for (let d = 3; d <= 18; d++) { const lit = d === 3 ? t >= T.mail : d <= 13 ? t >= T.ten - 0.6 + (d - 4) * 0.06 : t >= T.fifteen - 0.4 + (d - 14) * 0.08; const mark = d === 13 ? 'm10' : d === 18 ? 'm15' : d === 3 ? 'm0' : '';
    h += `<div class="day ${lit ? 'lit' : ''} ${mark}"><b>${d}</b>${d === 3 ? '<i>ELECTION</i>' : d === 13 ? '<i>+10 U.S.</i>' : d === 18 ? '<i>+15 ABROAD</i>' : ''}</div>`; }
  return `<div id="cal" style="opacity:${a.toFixed(2)}"><div class="calh">NOVEMBER 2026</div><div class="days">${h}</div></div>`; }
function rcvHTML(t) { if (t < T.fifty - 0.3 || t >= T.twist) return ''; const a = smooth(T.fifty - 0.3, T.fifty + 0.1, t) * (1 - smooth(T.twist - 0.3, T.twist, t)); const g = easeOut(span(t, T.fifty - 0.2, T.fifty + 0.6)), el = easeOut(span(t, T.elim, T.elim + 0.5)), mv = easeOut(span(t, T.move, T.move + 0.8));
  const W0 = 760, bar = (pct, cls, label, extra = 0) => `<div class="rrow"><div class="rlab">${label}</div><div class="rbar ${cls}" style="width:${(W0 * (pct / 60) * g).toFixed(0)}px"></div>${extra ? `<div class="rbar add" style="width:${(W0 * (extra / 60) * mv).toFixed(0)}px"></div><b class="rq" style="opacity:${mv.toFixed(2)}">?</b>` : ''}<span class="rpct">${pct}%</span></div>`;
  return `<div id="rcv" style="opacity:${a.toFixed(2)}"><div class="rline" style="left:${(170 + W0 * 50 / 60).toFixed(0)}px"><span>50%</span></div>${bar(48.2, 'b', 'PELTOLA (D)', 1.95)}${bar(47.9, 'r', 'SULLIVAN (R)', 1.95)}<div class="rrow" style="opacity:${(1 - el).toFixed(2)}"><div class="rlab">OTHERS</div><div class="rbar g" style="width:${(W0 * (3.9 / 60) * g * (1 - el)).toFixed(0)}px"></div><span class="rpct">~4%</span></div><div class="rnote">FIRST CHOICES · 74% COUNTED · NBC</div></div>`; }
function ballotHTML(t) { if (t < T.twist + 0.2 || t >= T.flip + 0.2) return ''; const k = pop(t, T.twist + 0.2, 0.35), a = 1 - smooth(T.flip - 0.1, T.flip + 0.2, t), hl = t >= T.two;
  return `<div id="ballot" style="opacity:${a.toFixed(2)};transform:translateX(-50%) rotate(-2deg) scale(${k.toFixed(3)})"><div class="bh">U.S. SENATOR · RANK UP TO 4</div><div class="bro">○ MARY PELTOLA</div><div class="bro ${hl ? 'hl' : ''}">○ DAN SULLIVAN <i>THE SENATOR</i></div><div class="bro ${hl ? 'hl' : ''}">○ DANIEL J. SULLIVAN <i>A DIFFERENT CANDIDATE</i></div><div class="bro dim">○ …</div></div>`; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  h += card('peltola', T.n637 - 0.1, T.dist, 110, 640, t, { tag: 'LEADS', tagc: 'b', tagT: T.n637 + 0.3 });
  h += card('sullivan', T.n637 + 0.1, T.dist, 650, 660, t, { small: true });
  h += card('peltola', T.flip - 0.05, T.ask, 110, 640, t, { tag: 'LEADS NOW', tagc: 'b', tagT: T.flip + 0.2 });
  h += card('sullivan', T.flip + 0.1, T.ask, 650, 660, t, { small: true, tag: '2ND CHOICES?', tagc: 'r', tagT: wordT('second', T.flip) });
  if (P) {
    if (t >= wordT('Texas', S[3]) && t < T.road) { sticker('TEXAS', P.ghosts[0].position.clone().setY(4), t, wordT('Texas', S[3]) + 0.3, 'sm w'); sticker('CALIFORNIA', P.ghosts[1].position.clone().setY(4), t, wordT('California', S[3]) + 0.3, 'sm w'); sticker('MONTANA', P.ghosts[2].position.clone().setY(4), t, wordT('Montana', S[3]) + 0.3, 'sm w'); }
    if (t >= T.road + 0.3 && t < T.mail) { const nm = { bethel: 'BETHEL', nome: 'NOME', kotz: 'KOTZEBUE', utq: 'UTQIAĠVIK', dill: 'DILLINGHAM', yukon: 'FORT YUKON', galena: 'GALENA' }; P.villages.forEach((k, i) => sticker(nm[k], P3(k, 4), t, T.road + 0.4 + i * 0.18, 'sm w')); sticker('ANCHORAGE', P3('anc', 5), t, T.road + 0.4, 'b sm'); sticker('NO ROAD', P3('bethel', 9), t, T.road + 1.0, 'r sm'); }
    if (t >= T.law + 1.0 && t < T.rcv) { sticker('JUNEAU · STATE CAPITAL', off('jun', 0, -6).setY(16), t, T.law + 1.0, 'sm w'); if (t >= T.scan + 0.4) sticker('LOCKED UNTIL ELECTION NIGHT', off('jun', 0, 3).setY(3), t, T.scan + 0.4, 'r sm'); }
  }
  h += layoutStickers() + calHTML(t) + rcvHTML(t) + ballotHTML(t);
  if (t >= T.veto && t < T.rcv) h += `<div class="stamp" style="font-size:120px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.veto, T.veto + 0.18)))).toFixed(3)})">VETOED</div>`;
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Who wins<br><span class="hl">Alaska?</span> 👇</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.n637, T.dist, T.road, T.mail, T.ten, T.fifteen, T.law, T.veto, T.rcv, T.elim, T.nov18, T.hist, T.twist, T.flip]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.n637, T.veto, T.two]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.7; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; for (const n of ['Texas', 'California', 'Montana']) RINGS[n] = await stateRing(n); await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
