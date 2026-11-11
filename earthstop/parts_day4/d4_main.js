// =================== "The last 24 hours" — Nov 11 2026 (Veterans Day) — the first daily built on the v5 rules (QUALITY_NOV11.md) ===================
// v5: steady push-in camera + turn on every hold, bright map (uV5), cut-out portraits, a first-frame hook with the date, subject SFX, 60 fps.
// Stories: 11 Democrats (incl. Pelosi) skipped the 211–204 Hegseth vote → Jim Jordan beats Scalise by 33 for House GOP leader → Thune stays; Sanders + ≥5 senators-elect won't back Schumer
// → the U.S. may lose measles-elimination status (held since 2000), PAHO decision as early as next week → U.S.-hosted Russia–Ukraine talks in Abu Dhabi (prisoner swap) → Veterans Day at Arlington.
// Sources: Democracy Now headlines Nov 11; Just Security Early Edition Nov 11; NBC/CNN live blogs; NBC/NPR/PBS (Abu Dhabi talks, Nov 10).
const V5LOOK = true;
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { pelosi: S[1], rubric: S[2], vote: S[3], n211: wordT('211', S[3]), n204: wordT('204', S[3]), margin: S[4], seven: wordT('seven', S[4]), ifall: S[5], alive: wordT('alive', S[5]), trump: S[6], exon: wordT('exoneration', S[6]),
  jordan: S[7], scalise: S[8], n33: wordT('33', S[8]), johnson: wordT('Mike', S[8]), jan: wordT('January', S[8]), senate: S[9], thune: wordT('John', S[9]), fight: S[10], sanders: S[11], schumer: wordT('Chuck', S[11]), five: wordT('five', S[11]),
  measles: S[12], y2000: wordT('2000', S[12]), decision: S[13], world: S[14], abu: wordT('Abu', S[14]), swap: S[15], vets: S[16], ask: S[17] };
const EV = Object.values(T).sort((a, b) => a - b);
const CUES = [[0.02, 'whoosh', 0.5], [0.08, 'stamp', 0.7], ...EV.slice(1).map(t => [t, 'pop', 0.5]),
  [T.pelosi, 'shutter', 0.9], [T.rubric - 0.3, 'whoosh', 0.6], [T.vote, 'gavel', 0.8], [T.n211, 'rise', 0.6], [T.ifall + 0.6, 'flip', 0.7], [T.alive, 'ding', 0.7], [T.trump, 'shutter', 0.9],
  [T.jordan - 0.3, 'whoosh', 0.6], [T.jordan, 'shutter', 0.9], [T.n33, 'cheer', 0.5], [T.senate - 0.3, 'whoosh', 0.6], [T.thune, 'shutter', 0.9], [T.fight, 'crowd', 0.6], [T.sanders, 'shutter', 0.9],
  [T.measles - 0.3, 'whoosh', 0.6], [T.measles, 'alarm', 0.6], [T.decision, 'paper', 0.8], [T.world - 0.3, 'jet', 0.6], [T.swap, 'ding', 0.7], [T.vets - 0.3, 'whoosh', 0.6], [T.ask, 'thud', 0.6], [ENDC, 'thud', 0.5]];
const PL = { dc: [-77.01, 38.89], house: [-71.8, 37.4], senate: [-71.6, 40.2], ohio: [-82.8, 40.3], louisiana: [-91.9, 31.0], sd: [-100.2, 44.4], abu: [54.37, 24.45], moscow: [37.62, 55.75], kyiv: [30.52, 50.45], arlington: [-77.07, 38.876] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 1.05, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.rubric - 0.35, shot(off('house', 0, -9), 120, -0.3, 1.05), shot(off('house', 0, -9), 104, 0.15, 1.1)],
    [T.rubric + 0.15, T.vote - 0.3, shot([-96, 38.5], 900, 0, 0.75), shot([-96, 38.5], 760, 0.08, 0.8)],
    [T.vote + 0.15, T.jordan - 0.35, shot(off('house', 0, -9), 118, -0.25, 1.05), shot(off('house', 0, -9), 104, 0.3, 1.1)],
    [T.jordan + 0.15, T.senate - 0.35, shot([-87, 36.5], 300, -0.2, 0.95), shot([-87, 36.5], 260, 0.15, 1.0)],
    [T.senate + 0.15, T.five - 0.35, shot(off('senate', 0, 2), 64, 0.2, 1.15), shot(off('senate', 0, 2), 54, -0.25, 1.2)],
    [T.five + 0.15, T.measles - 0.35, shot([-84, 43], 420, 0.1, 0.9), shot([-84, 43], 360, -0.1, 0.95)],
    [T.measles + 0.15, T.world - 0.35, shot([-96, 38.5], 820, 0, 0.75), shot([-96, 38.5], 700, -0.08, 0.8)],
    [T.world + 1.1, T.vets - 0.35, shot([45, 40], 1150, 0.1, 0.75), shot([47, 38], 980, -0.1, 0.8)],
    [T.vets + 1.0, T.ask - 0.3, shot('arlington', 70, 0.4, 1.1), shot('arlington', 56, -0.2, 1.15)],
    [T.ask + 0.15, T_END, shot([-96, 38.5], 900, 0, 0.7), shot([-96, 38.5], 980, 0.05, 0.65)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) { const sh = lerpShot(A, B, 0.25 * esin(span(t, a, b)) + 0.75 * span(t, a, b));
      const el = t - a; sh.h *= Math.exp(-0.075 * Math.min(el, 3) - 0.015 * Math.max(0, el - 3)); sh.yaw += 0.1 * el * (i % 2 ? -1 : 1); sh.tilt *= 1 + 0.03 * Math.min(el, 4);   // v5 camera
      return sh; }
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = shotAt(b), N = shotAt(nx[0]), u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.45); } }
  const L = HOLDS[HOLDS.length - 1]; return L[3]; }
function camAt(t) { const s = shotAt(t); const back = s.h * s.tilt; mCam.position.set(s.c.x + Math.sin(s.yaw) * back, s.h, s.c.z + Math.cos(s.yaw) * back);
  mCam.lookAt(s.c.x, 0, s.c.z); mCam.fov = s.fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, s.h * 0.02); mCam.far = s.h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld();
  mapUni.uFade.value.set(s.h * 2.2, s.h * 6.0); return s; }
// ---- props: the Capitol, the House (435) and Senate (100) chambers, arcs to Abu Dhabi ----
let PROPS = null;
const CAP = new THREE.Group(); MAPSC.add(CAP);
{ const wm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.5, flatShading: true });
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, wm); m.position.set(x, y, z); CAP.add(m); return m; };
  add(new THREE.BoxGeometry(9, 1.6, 2.4), 0, 0.8, 0); add(new THREE.BoxGeometry(3, 2.2, 2.8), 0, 1.1, 0); add(new THREE.CylinderGeometry(1.3, 1.4, 1.6, 16), 0, 2.9, 0);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), Math.cos(a) * 1.45, 2.8, Math.sin(a) * 1.45); }
  add(new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.6, 0).scale.y = 1.25; add(new THREE.CylinderGeometry(0.22, 0.28, 0.9, 10), 0, 5.4, 0); add(new THREE.SphereGeometry(0.16, 8, 6), 0, 6.0, 0);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), sx * (1.8 + k * 0.5), 0.9, 1.25); CAP.visible = false; }
function chamber(n, rows, r0, dr) { const seats = []; for (let r = 0; r < rows; r++) { const R = r0 + r * dr, m = Math.round(Math.PI * R / (dr * 0.95)); for (let i = 0; i < m; i++) seats.push({ a: Math.PI * (1 - (i + 0.5) / m), R, r }); }
  seats.sort((p, q) => q.a - p.a || p.R - q.R); return seats.slice(0, n); }
// House on the vote: seats 0–203 = 204 "keep" (Democrats + Massie), 204–414 = 211 "shelve", 415–425 = the 11 Democrats who skipped (grey, then blue in the what-if), the rest vacant
const SKIP0 = 193, SKIP1 = 204;   // the 11 absent Democrats sit at the right end of the blue block
function buildProps() { const P = {};
  P.house = chamber(435, 13, 9, 2.0); P.hMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.05 }), 435); P.hMesh.frustumCulled = false; P.hMesh.visible = false; MAPSC.add(P.hMesh);
  P.senateS = chamber(100, 7, 6, 2.0); P.sMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.05 }), 100); P.sMesh.frustumCulled = false; P.sMesh.visible = false; MAPSC.add(P.sMesh);
  P.arcs = [makeArc(P3('dc', 0.5), P3('abu', 0.5), 900, GOLD), makeArc(P3('moscow', 0.5), P3('abu', 0.5), 380, '#ff4a4a'), makeArc(P3('kyiv', 0.5), P3('abu', 0.5), 340, '#ffd23a')];
  P.ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, depthWrite: false })); P.ring.visible = false; MAPSC.add(P.ring);
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), col = new THREE.Color();
function seatPos(s, c0) { return V3(c0.x + Math.cos(s.a) * s.R, 0.9 + s.r * 0.38, c0.z - Math.sin(s.a) * s.R * 0.85); }
const NEWSEN = ['Minnesota', 'Maine', 'Michigan', 'Illinois', 'Kansas'];
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint(); mapUni.uDim.value = 0; mapUni.uV5.value = 1;
  paintState('District of Columbia', GOLD, 0.95, 1.2);
  CAP.visible = t < T.rubric || (t > T.vote && t < T.senate) || t > T.ask; { const k = easeOut(span(t, 0.0, 0.5)); CAP.position.copy(P3('dc', 0.8)); CAP.scale.setScalar(2.1 * k + 0.01); CAP.rotation.y = 0.25 + 0.05 * t; }
  // the House: on the hook (11 grey gaps blinking), then the vote and the what-if
  { const on = t < T.rubric + 0.2 || (t >= T.vote - 0.3 && t < T.jordan + 0.2); P.hMesh.visible = on; if (on) { const c0 = P3('house'), out = t < T.rubric + 0.2 ? 1 - smooth(T.rubric - 0.2, T.rubric + 0.2, t) : 1 - smooth(T.jordan - 0.2, T.jordan + 0.2, t);
      const a0 = t < T.rubric + 0.2 ? 0.05 : T.vote - 0.2;
      P.house.forEach((s, i) => { const keep = i < 204, skip = i >= SKIP0 + 211 && i < SKIP1 + 211 + 0 ? false : false; let c;
        const absent = i >= 415 && i < 426, vacant = i >= 426; const a = a0 + (i / 435) * 0.8;
        if (absent) { const blink = 0.5 + 0.5 * Math.sin(t * 9); c = t >= T.ifall + 0.6 && t < T.trump ? BLUE : blink > 0.5 ? '#9aa3b2' : '#5a616e'; }
        else c = vacant ? '#555b66' : keep ? BLUE : RED;
        const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001; const hop = absent && (t < T.rubric || (t >= T.ifall + 0.6 && t < T.ifall + 1.4)) ? Math.abs(Math.sin(t * 7)) * 1.6 : 0;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); const p = seatPos(s, c0); p.y += hop; m4.compose(p, q4, s4); P.hMesh.setMatrixAt(i, m4); col.set(c); P.hMesh.setColorAt(i, col); });
      P.hMesh.instanceMatrix.needsUpdate = true; P.hMesh.instanceColor.needsUpdate = true; } }
  // Jordan (Ohio) vs Scalise (Louisiana)
  if (t >= T.jordan && t < T.senate + 0.2) { const k = smooth(T.jordan, T.jordan + 0.4, t); paintState('Ohio', RED, 0.9 * k, 2.4 * k); paintState('Louisiana', '#b8bcc8', 0.7 * smooth(T.scalise, T.scalise + 0.4, t), 1.0 * smooth(T.scalise, T.scalise + 0.4, t)); }
  // the Senate: 100 seats, Thune's South Dakota; then the five senators-elect's states
  { const on = t >= T.senate - 0.2 && t < T.five + 0.3; P.sMesh.visible = on; if (on) { const c0 = P3('senate'), out = 1 - smooth(T.five - 0.1, T.five + 0.3, t);
      P.senateS.forEach((s, i) => { const a = T.senate - 0.1 + i / 100 * 0.8; const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001; const dem = i < 54; const rebel = dem && i % 9 === 4 && t >= T.sanders;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); const p = seatPos(s, c0); if (rebel) p.y += Math.abs(Math.sin(t * 6 + i)) * 1.4; m4.compose(p, q4, s4); P.sMesh.setMatrixAt(i, m4); col.set(rebel ? GOLD : dem ? BLUE : RED); P.sMesh.setColorAt(i, col); });
      P.sMesh.instanceMatrix.needsUpdate = true; P.sMesh.instanceColor.needsUpdate = true; } }
  if (t >= T.five - 0.2 && t < T.measles + 0.2) NEWSEN.forEach((n, i) => { const k = smooth(T.five - 0.2 + i * 0.25, T.five + 0.2 + i * 0.25, t); paintState(n, BLUE, 0.92 * k, 2.6 * k); });
  // measles: the whole country pulses red
  if (t >= T.measles - 0.1 && t < T.world) { const k = smooth(T.measles - 0.1, T.measles + 0.5, t) * (0.75 + 0.25 * Math.sin(t * 5)); STATES.forEach(s => { if (s.name !== 'District of Columbia' && s.name !== 'Alaska' && s.name !== 'Hawaii') paintState(s.name, '#ff4a4a', 0.55 * k, 0.6 * k); }); }
  // Abu Dhabi: arcs from Washington, Moscow and Kyiv
  const ak = t < T.world - 0.2 || t > T.vets + 0.5 ? 0 : easeOut(span(t, T.world - 0.2, T.world + 1.6)); P.arcs.forEach((a, i) => arcShow(a, clamp(ak * 1.3 - i * 0.15, 0, 1)));
  if (t >= T.world && t < T.vets + 0.5) { const k = smooth(T.world, T.world + 0.5, t); paintCountry('United Arab Emirates', GOLD, 0.95 * k, 3 * k); paintCountry('Russia', '#ff4a4a', 0.55 * k, 1 * k); paintCountry('Ukraine', '#ffd23a', 0.75 * k, 1.6 * k); }
  if (typeof rims === 'function') rims([...(t >= T.jordan && t < T.senate ? [['state', 'Ohio', 1]] : []), ...(t >= T.world && t < T.vets ? [['country', 'United Arab Emirates', 1], ['country', 'Ukraine', 0.8]] : [])]);
  GLAB.forEach(o => { o.visible = false; }); if (HI_LAB.arl) { const on = t >= T.vets && t < T.ask; HI_LAB.arl.forEach(o => { o.visible = on; }); }
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { pelosi: ['Nancy Pelosi', 'DEMOCRAT · CALIFORNIA'], trump: ['Donald Trump', 'PRESIDENT'], jordan: ['Jim Jordan', 'REPUBLICAN · OHIO'], scalise: ['Steve Scalise', 'REPUBLICAN · LOUISIANA'], johnson: ['Mike Johnson', 'HOUSE SPEAKER'],
  thune: ['John Thune', 'SENATE GOP LEADER'], sanders: ['Bernie Sanders', 'INDEPENDENT · VERMONT'], schumer: ['Chuck Schumer', 'SENATE DEM LEADER'], hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'] };
const HASCUT = { pelosi: 1, trump: 1, jordan: 1, scalise: 1, thune: 1, sanders: 1, schumer: 1 };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key];
  const dy = -8 * esin(span(t, t0, t1)); const cut = HASCUT[key] && !o.small; if (cut) { x -= o.big ? 15 : 10; y += o.big ? 10 : -70; }
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}${o.big ? ' big' : ''}${cut ? ' cut' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/${cut ? 'cutouts' : 'photos'}/${key}.${cut ? 'png' : 'jpg'}">${o.flag === false ? '' : '<div class="flag"></div>'}${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
const CHUNKS = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(w); const end = /[.?!]$/.test(w[2]) || (/[,:]$/.test(w[2]) && cur.length >= 3) || cur.length >= 6; if (end || i === WORDS.length - 1) { out.push(cur); cur = []; } }); return out; })();
function capHTML(t) { const c = CHUNKS.find(ch => t >= ch[0][0] - 0.05 && t < (ch[ch.length - 1][1] + 0.25)); if (!c) return ''; return c.map(w => `<span class="${t >= w[0] && t < w[1] + 0.1 ? 'y' : ''}">${w[2]}</span>`).join(' '); }
const cnt = (t, a, b, v) => Math.round(v * easeOut(span(t, a, b)));
let STK = [];
function sticker(txt, pos, t, t0, cls = '') { if (t < t0) return ''; const q = proj(pos); if (!q) return ''; const fs = /\bsm\b/.test(cls) ? 20 : 30, w = txt.length * fs * 0.68 + (fs > 20 ? 36 : 24), h = fs * 1.25 + (fs > 20 ? 16 : 10);
  STK.push({ txt, cls, x: clamp(q[0], 70 + w / 2, 1010 - w / 2), y: q[1], w, h, k: pop(t, t0, 0.25) }); return ''; }
function layoutStickers() { const placed = []; STK.sort((a, b) => a.y - b.y);
  for (const s of STK) { let moved = true, n = 0; while (moved && n++ < 12) { moved = false; for (const p of placed) { if (Math.abs(s.x - p.x) < (s.w + p.w) / 2 + 8 && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 6) { s.y = p.y + (s.h + p.h) / 2 + 8; moved = true; } } } placed.push(s); }
  return placed.map(s => `<div class="stk ${s.cls}" style="left:${s.x.toFixed(0)}px;top:${s.y.toFixed(0)}px;transform:translate(-50%,-100%) scale(${s.k.toFixed(3)})">${s.txt}</div>`).join(''); }
function hudAt(t) {
  if (t < T.rubric) return null;
  if (t < T.vote) return ['WEDNESDAY · NOV 11', 'THE LAST 24 HOURS'];
  if (t < T.trump) return ['HEGSETH VOTE', t < T.margin ? `${cnt(t, T.n211 - 0.2, T.n211 + 0.6, 211)} · ${cnt(t, T.n204 - 0.2, T.n204 + 0.5, 204)}` : t < T.ifall ? 'MARGIN: 7' : t < T.ifall + 0.6 ? 'WHAT IF…' : '215 · 211'];
  if (t < T.jordan) return ['THE PRESIDENT', '“EXONERATION”'];
  if (t < T.senate) return ['HOUSE GOP', t < T.n33 ? 'JIM JORDAN' : t < T.johnson ? '+33 VOTES' : 'LEADER IN JANUARY'];
  if (t < T.fight) return ['SENATE GOP', 'THUNE STAYS'];
  if (t < T.measles) return ['DEMOCRATS', t < T.five ? 'NO TO SCHUMER' : 'AT LEAST 5 NEW SENATORS'];
  if (t < T.world) return ['HEALTH', t < T.decision ? 'MEASLES-FREE SINCE 2000' : 'DECISION NEXT WEEK'];
  if (t < T.vets) return ['ABU DHABI', t < T.swap ? 'RUSSIA · UKRAINE TALKS' : 'PRISONER SWAP?'];
  if (t < T.ask) return ['NOV 11', 'VETERANS DAY'];
  return null; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  h += card('pelosi', T.pelosi - 0.1, T.rubric - 0.1, 330, 600, t, { big: true, tag: 'SKIPPED THE VOTE', tagc: 'r', tagT: T.pelosi + 0.25 });
  h += card('trump', T.trump - 0.1, T.jordan - 0.15, 330, 560, t, { big: true, quote: '“EXONERATION”', qT: T.exon });
  h += card('jordan', T.jordan - 0.05, T.senate - 0.15, 90, 560, t, { tag: t >= T.n33 ? '+33 VOTES' : 'NEW LEADER', tagc: 'r', tagT: T.jordan + 0.3 });
  h += card('scalise', T.scalise - 0.05, T.senate - 0.15, 640, 620, t, { small: true, dim: true });
  h += card('johnson', T.johnson - 0.05, T.senate - 0.15, 640, 980, t, { small: true, dim: true });
  h += card('thune', T.thune - 0.1, T.sanders - 0.15, 330, 560, t, { big: true, tag: 'STAYS', tagc: 'r', tagT: T.thune + 0.3 });
  h += card('sanders', T.sanders - 0.1, T.measles - 0.15, 80, 560, t, { tag: 'NO TO SCHUMER', tagc: 'b', tagT: T.schumer });
  h += card('schumer', T.schumer - 0.1, T.measles - 0.15, 640, 640, t, { small: true, dim: t >= T.five });
  h += card('trump', T.vets - 0.05, T.ask - 0.1, 620, 600, t, { small: true });
  h += card('pelosi', T.ask - 0.05, ENDC, 330, 600, t, { big: true });
  if (P) {
    if (t >= T.n211 && t < T.trump) { sticker(t < T.ifall + 0.6 ? 'SHELVE IT · 211' : 'SHELVE IT · 211', off('house', 12, -2).setY(10), t, T.n211 + 0.2, 'r'); sticker(t < T.ifall + 0.6 ? 'KEEP IT · 204' : 'KEEP IT · 215', off('house', -12, -2).setY(10), t, T.n204 + 0.2, 'b'); }
    if ((t >= T.pelosi && t < T.rubric) || (t >= T.ifall && t < T.trump)) sticker('11 SKIPPED', seatPos(P.house[420], P3('house')).setY(7), t, t < T.rubric ? T.pelosi : T.ifall, 'w');
    if (t >= T.five && t < T.measles) NEWSEN.forEach((n, i) => sticker(n.toUpperCase(), stPos(n, 6), t, T.five + i * 0.25, 'b sm'));
    if (t >= T.abu && t < T.vets) sticker('ABU DHABI', P3('abu', 6), t, T.abu, 'w');
    if (t >= T.world + 0.8 && t < T.vets) { sticker('MOSCOW', P3('moscow', 6), t, T.world + 0.9, 'r sm'); sticker('KYIV', P3('kyiv', 6), t, T.world + 1.1, 'w sm'); sticker('WASHINGTON', P3('dc', 6), t, T.world + 0.8, 'b sm'); }
  }
  h += layoutStickers();
  if (t < 1.8) h += `<div class="hook" style="opacity:${(1 - smooth(1.5, 1.8, t)).toFixed(2)};transform:scale(${pop(t, 0, 0.3).toFixed(3)})"><span class="date">NOV 11 · THE HOUSE</span>11 Democrats <span class="hl">skipped</span></div>`;
  if (t >= T.vote && t < T.margin) h += `<div class="stamp" style="font-size:120px;top:1110px;transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.vote, T.vote + 0.18)))).toFixed(3)})">SHELVED</div>`;
  if (t >= T.alive && t < T.trump) h += `<div class="stamp" style="font-size:110px;top:1110px;color:#3d7dff;border-color:#3d7dff;transform:translate(-50%,-50%) rotate(-6deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.alive, T.alive + 0.18)))).toFixed(3)})">STILL ALIVE</div>`;
  if (t >= T.measles - 0.1 && t < T.world) { const k = pop(t, T.measles - 0.1, 0.35), x = t >= T.decision; h += `<div class="bigcal" style="transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-3deg)"><div class="bm">MEASLES-FREE</div><div class="bd" style="font-size:150px">${x ? '?' : '2000'}</div><div class="by">${x ? 'DECISION · NEXT WEEK' : 'U.S. STATUS SINCE'}</div></div>`; }
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Should Pelosi have<br><span class="hl">shown up?</span> 👇</div>`;
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
function flashAt(t) { let f = 0; for (const k of [0.08, T.vote, T.alive, T.measles]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.6; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = 0.0; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
const HI_LAB = {};
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(['900', '800', '700', '600'].map(w => document.fonts.load(`${w} 160px Inter`)));
  try { await addHiPatch('dc'); const n0 = GLAB.length; groundLabel('Washington', -77.03, 38.93, 1.6, { font: '800' }); groundLabel('Potomac River', -77.12, 38.84, 0.9, { font: '600', italic: true, color: '#e8f4ff', rot: 0.6 });
    cityDot('Arlington National Cemetery', -77.07, 38.876, 1.1); HI_LAB.arl = GLAB.slice(n0); } catch (e) { console.log('no hi patch', e); }
  await Promise.all(Object.keys(photo).flatMap(k => [`photos/${k}.jpg`, `cutouts/${k}.png`]).map(f => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/${f}`; }))); window.renderAt(0); return true; })();
