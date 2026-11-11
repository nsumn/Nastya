const V5LOOK = new URLSearchParams(location.search).get('v5') === '1';   // Nov 11 comparison: v5 light (bright land, sea not dimmed, no paper/vignette) — + v5 camera on holds; default off
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// =================== "Hegseth survived impeachment — but January could change everything" (Nov 11 2026) — first video in the v4 rules ===================
// v4 rules (her 50-point comparison with Geolyth): no static second (an event on every key word), ONE big focus, dark calm background + glowing subject (mapUni.uDim),
// oblique camera, fewer text layers (HUD = kicker + headline only), a sound on every appearance.
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { survived: wordT('survived', 0), over: S[1], vote: S[2], n211: wordT('211', S[2]), n204: wordT('204', S[2]), committee: wordT('committee', S[2]), shelves: S[3], one: S[4], massie: wordT('Thomas', S[4]), iran: S[5], stop: wordT('stop', S[5]),
  leaving: S[6], johnson: S[7], did: wordT('did', S[7]), spectacle: S[8], catch: S[9], jan: S[10], dems: wordT('Democrats', S[10]), simple: S[11], removal: S[12], s67: wordT('sixty-seven', S[12]), only: S[13], belknap: S[14], mayorkas: wordT('Alejandro', S[14]),
  single: wordT('single', S[14]), neither: S[15], ask: S[16] };
const EV = [T.survived, T.over, T.vote, T.n211, T.n204, T.committee, T.shelves, T.one, T.massie, T.iran, T.stop, T.leaving, T.johnson, T.did, T.spectacle, T.catch, T.jan, T.dems, T.simple, T.removal, T.s67, T.only, T.belknap, T.mayorkas, T.single, T.neither, T.ask];
const CUES = [[0.02, 'whoosh', 0.5], [T.survived, 'stamp', 0.7], ...EV.slice(1).map(t => [t, 'pop', 0.38]), [T.vote - 0.3, 'whoosh', 0.5], [T.n211, 'rise', 0.5], [T.iran - 0.3, 'whoosh', 0.6], [T.johnson - 0.3, 'whoosh', 0.4],
  [T.catch, 'thud', 0.6], [T.jan, 'flip', 0.6], [T.removal - 0.3, 'whoosh', 0.5], [T.s67, 'rise', 0.5], [T.only - 0.3, 'whoosh', 0.5], [T.neither, 'stamp', 0.6], [ENDC, 'thud', 0.5]];
const PL = { dc: [-77.01, 38.89], house: [-71.8, 37.4], senate: [-71.6, 40.2], tehran: [51.39, 35.69] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 1.05, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.vote - 0.3, shot(off('dc', 0, 1), 46, -0.5, 1.2), shot(off('dc', 0, 1), 38, 0.25, 1.25)],
    [T.vote + 0.2, T.iran - 0.3, shot(off('house', 0, -9), 118, -0.25, 1.05), shot(off('house', 0, -9), 104, 0.3, 1.1)],
    [T.iran + 1.4, T.leaving - 0.1, shot([51.5, 33.5], 220, 0.1, 0.8), shot([52, 33.2], 180, -0.15, 0.9)],
    [T.leaving + 1.2, T.catch - 0.2, shot(off('dc', 0, 1), 52, 0.9, 1.15), shot(off('dc', 0, 1), 42, 1.7, 1.2)],
    [T.catch + 0.4, T.removal - 0.3, shot(off('house', 0, -9), 114, 0.35, 1.05), shot(off('house', 0, -9), 100, -0.3, 1.1)],
    [T.removal + 0.3, T.only - 0.3, shot(off('senate', 0, 2), 60, 0.2, 1.15), shot(off('senate', 0, 2), 50, -0.25, 1.2)],
    [T.only + 0.4, T.ask - 0.2, shot(off('dc', 0, 1), 60, -0.6, 1.0), shot(off('dc', 0, 1), 48, 0.3, 1.1)],
    [T.ask + 0.2, T_END, shot([-77, 38.6], 260, 0, 0.6), shot([-77, 38.6], 300, 0.05, 0.55)]]; }
function lerpShot(A, B, u, hop = 0) { const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), u)) + hop * Math.sin(Math.PI * u);
  return { c: A.c.clone().lerp(B.c, u), h, yaw: lerp(A.yaw, B.yaw, u), tilt: lerp(A.tilt, B.tilt, u), fov: lerp(A.fov, B.fov, u) }; }
let FLYING = 0;
function shotAt(t) { if (!HOLDS) HOLDS = holds(); FLYING = 0;
  for (let i = 0; i < HOLDS.length; i++) { const [a, b, A, B] = HOLDS[i]; if (t >= a && t <= b) { const sh = lerpShot(A, B, V5LOOK ? 0.25 * esin(span(t, a, b)) + 0.75 * span(t, a, b) : esin(span(t, a, b)));
      if (V5LOOK) { const dir = i % 2 ? 1 : -1, el = t - a; sh.h *= Math.exp(dir * 0.16 * el); sh.yaw += 0.11 * el * (i % 3 === 1 ? -1 : 1); sh.tilt *= 1 + 0.04 * el * (dir < 0 ? 1 : 0); }   // v5 camera: never a still hold — ~16 %/s zoom (in/out alternating) + a slow turn
      return sh; }
    const nx = HOLDS[i + 1]; if (nx && t > b && t < nx[0]) { const E = V5LOOK ? shotAt(b) : HOLDS[i][3], N = V5LOOK ? shotAt(nx[0]) : nx[2], u = ease(span(t, b, nx[0])); const d = E.c.distanceTo(N.c); FLYING = Math.sin(Math.PI * u); return lerpShot(E, N, u, d * 0.55); } }
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
  P.house = chamber(435, 13, 9, 2.0); P.hMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 1.1, 1.3), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.05 }), 435); P.hMesh.frustumCulled = false; P.hMesh.visible = false; MAPSC.add(P.hMesh);
  P.senateS = chamber(100, 7, 6, 2.0); P.sMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.05 }), 100); P.sMesh.frustumCulled = false; P.sMesh.visible = false; MAPSC.add(P.sMesh);
  P.massieSeat = 300; P.arc = makeArc(P3('dc', 0.5), P3('tehran', 0.5), 420, '#ff7a2a'); P.ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, depthWrite: false })); P.ring.visible = false; MAPSC.add(P.ring);
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(), col = new THREE.Color();
function seatPos(s, c0) { return V3(c0.x + Math.cos(s.a) * s.R, 0.9 + s.r * 0.38, c0.z - Math.sin(s.a) * s.R * 0.85); }
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint(); mapUni.uDim.value = V5LOOK ? 0 : 0.6; mapUni.uV5.value = V5LOOK ? 1 : 0;
  paintState('District of Columbia', GOLD, 0.95, 1.2);
  CAP.visible = true; { const k = easeOut(span(t, 0.0, 0.6)), bump = 1 + 0.08 * Math.max(0, Math.sin(Math.PI * span(t, T.survived, T.survived + 0.35))); CAP.position.copy(P3('dc', 0.8 + 10 * (1 - k))); CAP.scale.setScalar(2.1 * k * bump + 0.01); CAP.rotation.y = 0.25 + 0.05 * t; }
  // House: the vote to send it to committee (211 shelve · 204 keep), Massie's lone seat; then January (Democrats take the majority)
  { const on = t >= T.vote - 0.3 && t < T.removal + 0.2; P.hMesh.visible = on; P.ring.visible = false; if (on) { const c0 = P3('house'), out = 1 - smooth(T.removal - 0.2, T.removal + 0.2, t);
      P.house.forEach((s, i) => { let c, a;
        if (t < T.catch) { const keep = i < 204, vacant = i >= 415; a = keep ? T.n204 - 0.3 + (203 - i) / 204 * 1.0 : T.n211 - 0.4 + (i - 204) / 211 * 1.0; c = vacant ? '#555b66' : keep ? '#3d7dff' : '#ff4a4a'; if (i === P.massieSeat && t >= T.massie) c = GOLD; }
        else { a = T.catch; const dem = i < 253; const flip = smooth(T.dems - 0.2 + (i / 435) * 0.8, T.dems + 0.1 + (i / 435) * 0.8, t); c = flip > 0.5 ? (dem ? '#3d7dff' : '#ff4a4a') : (i < 204 ? '#3d7dff' : '#ff4a4a'); }
        const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001; const hop = i === P.massieSeat && t >= T.massie && t < T.iran ? Math.abs(Math.sin((t - T.massie) * 6)) * 2.2 : 0;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); const p = seatPos(s, c0); p.y += hop; m4.compose(p, q4, s4); P.hMesh.setMatrixAt(i, m4); col.set(c); P.hMesh.setColorAt(i, col); });
      P.hMesh.instanceMatrix.needsUpdate = true; P.hMesh.instanceColor.needsUpdate = true;
      if (t >= T.massie && t < T.iran) { P.ring.visible = true; P.ring.position.copy(seatPos(P.house[P.massieSeat], c0)).setY(0.6); const u = ((t - T.massie) * 1.4) % 1; P.ring.scale.setScalar(1 + u * 2.5); P.ring.material.opacity = 1 - u; } } }
  // Iran: an arc from Washington, Iran glows
  arcShow(P.arc, t < T.iran - 0.2 || t > T.leaving + 0.8 ? 0 : easeOut(span(t, T.iran - 0.2, T.iran + 1.2)));
  if (t >= T.iran && t < T.leaving + 0.8) paintCountry('Iran', '#ff7a2a', 0.85 * smooth(T.iran, T.iran + 0.4, t), 2.2 * smooth(T.iran, T.iran + 0.4, t));
  // Senate: 67 of 100 light up
  { const on = t >= T.removal - 0.2 && t < T.only + 0.3; P.sMesh.visible = on; if (on) { const c0 = P3('senate'), out = 1 - smooth(T.only - 0.1, T.only + 0.3, t);
      P.senateS.forEach((s, i) => { const a = T.removal - 0.1 + i / 100 * 0.8; const k = t < a ? 0.001 : easeOut(span(t, a, a + 0.3)) * out + 0.001; const lit = i < 67 && t >= T.s67 - 0.2 + i / 67 * 0.9;
        s4.setScalar(k); q4.setFromAxisAngle(V3(0, 1, 0), -s.a + Math.PI / 2); m4.compose(seatPos(s, c0), q4, s4); P.sMesh.setMatrixAt(i, m4); col.set(lit ? GOLD : '#c8c8d0'); P.sMesh.setColorAt(i, col); });
      P.sMesh.instanceMatrix.needsUpdate = true; P.sMesh.instanceColor.needsUpdate = true; } }
  if (typeof rims === 'function') rims([...(t >= T.iran && t < T.leaving + 0.8 ? [['country', 'Iran', 0.9]] : [])]);
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'], massie: ['Thomas Massie', 'REPUBLICAN · KENTUCKY'], johnson: ['Mike Johnson', 'HOUSE SPEAKER'] };
function card(key, t0, t1, x, y, t, o = {}) { if (t < t0 || t > t1) return ''; const k = pop(t, t0, 0.3), a = 1 - smooth(t1 - 0.25, t1, t); const [n, r] = photo[key]; const fx = o.fx ?? 0;
  const dy = -8 * esin(span(t, t0, t1));
  return `<div class="card${o.small ? ' small' : ''}${o.dim ? ' dim' : ''}${o.ring ? ' ring-' + o.ring : ''}${o.big ? ' big' : ''}" style="left:${x}px;top:${(y + dy).toFixed(1)}px;opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)}) rotate(${(o.rot ?? 0)}deg)"><img src="assets/news/photos/${key}.jpg">${o.flag === false ? '' : '<div class="flag"></div>'}${o.tag ? `<div class="tag ${o.tagc || ''}" style="transform:scale(${pop(t, o.tagT ?? t0, 0.25).toFixed(3)})">${o.tag}</div>` : ''}${o.quote && t >= (o.qT ?? t0) ? `<div class="quote" style="transform:scale(${pop(t, o.qT ?? t0, 0.25).toFixed(3)})">${o.quote}</div>` : ''}<div class="cn">${n}</div><div class="cr">${r}</div></div>`; }
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
  if (t < T.vote) return ['THE HOUSE · TUESDAY', t < T.over ? 'HEGSETH SURVIVES' : 'NOT OVER?'];
  if (t < T.one) return ['THE VOTE', t < T.n211 ? 'TO COMMITTEE' : t < T.shelves ? `${cnt(t, T.n211 - 0.2, T.n211 + 0.6, 211)} · ${cnt(t, T.n204 - 0.2, T.n204 + 0.5, 204)}` : 'SHELVED'];
  if (t < T.iran) return ['ONE REPUBLICAN', 'THOMAS MASSIE'];
  if (t < T.leaving) return ['THE CHARGE', 'THE IRAN WAR'];
  if (t < T.johnson) return ['THOMAS MASSIE', 'LEAVING IN JANUARY'];
  if (t < T.catch) return ['SPEAKER JOHNSON', t < T.spectacle ? '“ONE WAY OR THE OTHER”' : '“A SPECTACLE”'];
  if (t < T.simple) return ['THE CATCH', t < T.dems ? 'JANUARY 3' : 'DEMOCRATS TAKE THE HOUSE'];
  if (t < T.removal) return ['IMPEACH', 'SIMPLE MAJORITY'];
  if (t < T.only) return ['REMOVE', t < T.s67 ? '2/3 OF THE SENATE' : `${cnt(t, T.s67 - 0.2, T.s67 + 0.8, 67)} / 100`];
  if (t < T.ask) return ['IN U.S. HISTORY', t < T.belknap ? 'ONLY 2 EVER' : t < T.neither ? '1876 · 2024' : 'NEITHER REMOVED'];
  return null; }
function histHTML(t) { if (t < T.belknap - 0.2 || t >= T.ask) return ''; const a = 1 - smooth(T.ask - 0.3, T.ask, t);
  const c = (t0, yr, name, role, note, x) => t < t0 ? '' : `<div class="hcard" style="left:${x}px;transform:scale(${pop(t, t0, 0.35).toFixed(3)}) rotate(${x < 500 ? -2 : 2}deg)"><div class="hy">${yr}</div><div class="hn">${name}</div><div class="hr">${role}</div><div class="hx on">${note}</div></div>`;
  return `<div style="opacity:${a.toFixed(2)}">${c(T.belknap - 0.1, '1876', 'WILLIAM BELKNAP', 'SECRETARY OF WAR', 'IMPEACHED', 70)}${c(T.mayorkas - 0.1, '2024', 'ALEJANDRO MAYORKAS', 'HOMELAND SECURITY', t >= T.single ? 'IMPEACHED 214–213' : 'IMPEACHED', 550)}${t >= T.neither ? `<div class="hst" style="transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 1.2 * (1 - easeOut(span(t, T.neither, T.neither + 0.2)))).toFixed(3)})">NOT REMOVED</div>` : ''}</div>`; }
function bigHTML(t) { // one big centered focus element per beat
  if (t >= T.jan - 0.1 && t < T.simple) { const k = pop(t, T.jan - 0.1, 0.35); return `<div class="bigcal" style="transform:translateX(-50%) scale(${k.toFixed(3)}) rotate(-3deg)"><div class="bm">JANUARY</div><div class="bd">3</div><div class="by">2027 · NEW CONGRESS</div></div>`; }
  return ''; }
function domAt(t) { const P = PROPS; STK = []; let h = '';
  h += card('hegseth', 0.0, T.vote - 0.1, 340, 560, t, { big: true, tag: t >= T.survived ? 'SURVIVED' : '', tagc: 'b', tagT: T.survived });
  h += card('massie', T.massie - 0.1, T.johnson - 0.1, 110, 600, t, { tag: t >= T.leaving ? 'LEAVING IN JAN.' : 'THE ONLY R', tagc: 'r', tagT: T.massie + 0.2 });
  h += card('hegseth', T.iran - 0.2, T.leaving, 620, 640, t, { small: true });
  h += card('johnson', T.johnson - 0.1, T.catch - 0.1, 110, 600, t, { quote: t >= T.did ? '“DEFEAT IT”' : '', qT: T.did });
  h += card('hegseth', T.spectacle - 0.1, T.catch - 0.1, 620, 640, t, { small: true, quote: '“A SPECTACLE”', qT: T.spectacle + 0.3 });
  if (P) {
    if (t >= T.n211 && t < T.one) { sticker('SHELVE IT · 211', off('house', 12, -2).setY(10), t, T.n211 + 0.2, 'r'); sticker('KEEP IT · 204', off('house', -12, -2).setY(10), t, T.n204 + 0.2, 'b'); }
    if (t >= T.massie && t < T.iran) sticker('MASSIE', seatPos(P.house[P.massieSeat], P3('house')).setY(6), t, T.massie, 'w');
    if (t >= T.dems + 0.6 && t < T.removal) sticker('DEMOCRATS · MAJORITY', off('house', -10, -2).setY(10), t, T.dems + 0.6, 'b');
    if (t >= T.iran + 0.8 && t < T.leaving) sticker('IRAN', P3('tehran', 6), t, T.iran + 0.8, 'w');
  }
  h += layoutStickers() + histHTML(t) + bigHTML(t);
  if (t >= T.survived && t < T.over + 0.6) h += `<div class="stamp" style="font-size:118px;top:1110px;color:#3d7dff;border-color:#3d7dff;transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.survived, T.survived + 0.18)))).toFixed(3)})">SURVIVED</div>`;
  if (t >= T.shelves && t < T.one) h += `<div class="stamp" style="font-size:120px;top:1110px;transform:translate(-50%,-50%) rotate(-8deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.shelves, T.shelves + 0.18)))).toFixed(3)})">SHELVED</div>`;
  if (t >= T.ask - 0.1 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.ask - 0.1, T.ask + 0.2, t)};transform:scale(${pop(t, T.ask - 0.1, 0.35).toFixed(3)})">Try again in<br><span class="hl">January?</span> 👇</div>`;
  $('labels').innerHTML = h;
// Nov 11: she asked to drop the top plate (kicker + Anton headline), then changed her mind — kept. SHOW_HUD = false hides it.
const SHOW_HUD = true;
  const hd = SHOW_HUD ? hudAt(t) : null; $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 16 ? 80 : 100) + 'px'; $('sub').textContent = ''; $('sub').style.display = 'none'; }
  let pp = 1; for (const k of EV) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.survived, T.shelves, T.jan, T.neither]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); return Math.max(0, f) * 0.7; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); if (window.PASS === 'text') return true;
  if (t >= ENDC + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#0b0f16', 1); renderer.clear(); return true; }
  camAt(t); const fly = FLYING;
  if (fly > 0.05) { renderer.setRenderTarget(ACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const K = 4;
    for (let k = 0; k < K; k++) { camAt(t + (k / (K - 1) - 0.5) * 0.5 / 30); shootTo(RTB, MAPSC, mCam); renderer.setRenderTarget(ACC); renderer.autoClear = false; accMat.uniforms.tS.value = RTB.texture; accMat.uniforms.uW.value = 1 / K; renderer.render(accScene, compCam); renderer.autoClear = true; }
    camAt(t); compMat.uniforms.tA.value = ACC.texture; }
  else { shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture; }
  const u = compMat.uniforms; u.uLook.value = V5LOOK ? 0.0 : 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, 1.0 + 0.7 * flashAt(t), 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(Object.keys(photo).map(k => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = `assets/news/photos/${k}.jpg`; }))); window.renderAt(0); return true; })();
