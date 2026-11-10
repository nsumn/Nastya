const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const BLUE = '#3d7dff', RED = '#ff4a4a', GREY = '#c8c8d0', GOLD = '#ffc23a', TEAL = '#2ad0b0';
// =================== "The last 24 hours" — Tue Nov 10 2026 (map v2, glass cards, non-overlapping stickers) ===================
const S = SENT, wordT = (w, after = 0) => { const q = WORDS.find(x => x[0] >= after - 0.01 && x[2].replace(/[^A-Za-z0-9-]/g, '').toLowerCase().startsWith(w.toLowerCase())); return q ? q[0] : after; };
const ENDC = VO_END + 0.35, T_END = ENDC + 4.9;
const T = { intro: 0.05, wash: S[1] - 0.45, massie: wordT('Thomas', S[1]), eight: wordT('eight', S[1]), iranw: wordT('Iran', S[1]), act: S[2], four: wordT('four-seat', S[2]), farce: wordT('farce', S[3]), johnson: wordT('Mike', S[3]), fail: wordT('fail', S[3]),
  senate: S[4], wh: S[5] - 0.2, dana: wordT('Dana', S[5]), down: wordT('turned', S[5]), joke: wordT('joke', S[6]), iran: S[7] - 0.2, over: wordT('effectively', S[7]), denies: S[8], ships: wordT('ships', S[8]), boeing: S[9] - 0.2, five: wordT('five', S[9]),
  abu: S[10] - 0.2, ukr: wordT('Ukraine', S[10]), first: wordT('first', S[10]), follow: S[11] };
const CUES = [[0.02, 'whoosh', 0.6], [T.intro + 0.08, 'thud', 0.7], [T.wash, 'whoosh', 0.6], [T.massie, 'pop', 0.5], [T.eight, 'stamp', 0.7], [T.four, 'thud', 0.5], [T.farce, 'pop', 0.4], [T.fail, 'stamp', 0.5], [T.senate, 'rise', 0.5],
  [T.wh - 0.1, 'whoosh', 0.45], [T.dana, 'pop', 0.5], [T.down, 'stamp', 0.7], [T.joke, 'pop', 0.4], [T.iran - 0.1, 'whoosh', 0.6], [T.over, 'thud', 0.5], [T.ships, 'flip', 0.5], [T.boeing - 0.1, 'whoosh', 0.6], [T.five, 'thud', 0.5],
  [T.abu - 0.1, 'whoosh', 0.6], [T.first, 'pop', 0.5], [T.follow, 'whoosh', 0.6], [ENDC, 'thud', 0.5]];
const PL = { pent: [-77.056, 38.871], dc: [-77.04, 38.9], hormuz: [56.4, 26.6], tehran: [51.39, 35.69], everett: [-122.27, 47.98], abu: [54.37, 24.45], kyiv: [30.52, 50.45], moscow: [37.62, 55.75], seattle: [-122.33, 47.6] };
const P3 = (k, y = 0) => llPos(PL[k][0], PL[k][1], y);
const off = (k, dx, dz) => P3(k).add(V3(dx, 0, dz));
function shot(where, h, yaw = 0, tilt = 0.42, fov = 36) { const c = Array.isArray(where) ? llPos(where[0], where[1]) : typeof where === 'string' ? P3(where) : where.clone(); return { c, h, yaw, tilt, fov }; }
let HOLDS = null;
function holds() { return [[0, T.wash, shot([-60, 34], 1500, 0, 0.16), shot([-72, 35], 1050, 0.06, 0.2)],
    [T.wash + 1.1, T.senate - 0.2, shot(off('pent', 2, 2), 100, 0.5, 0.6), shot(off('pent', 2, 2), 88, 0.95, 0.66)],
    [T.senate + 0.4, T.wh, shot([-96, 38.5], 460, 0, 0.32), shot([-94, 38.5], 420, 0.06, 0.35)],
    [T.wh + 1.0, T.iran, shot(off('dc', -2, 1.5), 92, 1.2, 0.62), shot(off('dc', -2, 1.5), 84, 1.6, 0.66)],
    [T.iran + 1.6, T.boeing, shot([54, 29.5], 260, 0, 0.42), shot([55.5, 27.5], 190, 0.12, 0.5)],
    [T.boeing + 1.6, T.abu, shot(off('everett', 0, 2), 100, -0.4, 0.62), shot(off('everett', 0, 2), 88, 0.15, 0.68)],
    [T.abu + 1.6, T.follow, shot([44, 39], 700, 0, 0.36), shot([50, 31], 420, 0.1, 0.45)],
    [T.follow + 1.1, T_END, shot([-40, 36], 1500, 0, 0.16), shot([-40, 36], 1700, 0.05, 0.16)]]; }
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
function gm(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o }); }
function ship3() { const g = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 2.2), gm('#3a3f48')); hull.position.y = 0.6; g.add(hull); const deck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 2.0), gm('#8a3a2a')); deck.position.y = 1.3; g.add(deck);
  const br = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.8), gm('#e8e8ea')); br.position.set(-3.4, 2.1, 0); g.add(br);
  const fire = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: 0.85 })); fire.position.set(1.2, 2.0, 0); g.add(fire); g.userData.fire = fire;
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#3a3a3e', transparent: true, opacity: 0.7, roughness: 1 })); smoke.position.set(1.6, 4.5, 0); g.add(smoke); g.userData.smoke = smoke; g.visible = false; MAPSC.add(g); return g; }
function jet3() { const g = new THREE.Group(), w = gm('#f2f3f5', { flatShading: true }), b = gm('#2a5ad8');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 9, 14).rotateZ(Math.PI / 2), w); g.add(body); const nose = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), w); nose.position.x = 4.5; nose.scale.set(1.3, 1, 1); g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 10), w); wing.position.set(0.3, -0.2, 0); wing.rotation.y = 0.0; g.add(wing); const tail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 3.4), w); tail.position.set(-4.0, 0.3, 0); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.12), b); fin.position.set(-4.0, 1.2, 0); g.add(fin); for (const z of [-2.6, 2.6]) { const en = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 12).rotateZ(Math.PI / 2), gm('#c9ced6', { metalness: 0.6 })); en.position.set(0.8, -0.65, z); g.add(en); }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.18, 1.52), b); stripe.position.set(0, -0.1, 0); g.add(stripe); g.visible = false; MAPSC.add(g); return g; }
function buildProps() { const P = {};
  { const sh = new THREE.Shape(), hole = new THREE.Path(); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * 6, Math.sin(a) * 6) : sh.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); }
    for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; k ? hole.lineTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6) : hole.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); } sh.holes.push(hole);
    P.pent = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.5, bevelEnabled: false }).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.6, flatShading: true })); P.pent.visible = false; MAPSC.add(P.pent); }
  P.gavel = new THREE.Group(); { const wood = gm('#6b3f1f'), band = gm('#c8a24a', { metalness: 0.8 }); const head = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 20).rotateZ(Math.PI / 2), wood); P.gavel.add(head);
    for (const x of [-1.1, 1.1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.3, 20).rotateZ(Math.PI / 2), band); b.position.x = x; P.gavel.add(b); }
    const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 5.0, 12), wood); hdl.position.set(0, 0, 2.6); hdl.rotation.x = Math.PI / 2; P.gavel.add(hdl); }
  P.block = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.7, 24), gm('#5a3418')); P.gavel.visible = P.block.visible = false; MAPSC.add(P.gavel); MAPSC.add(P.block);
  // House seats: 218 R vs 214 D as two rising columns of small seats over the middle of the country
  P.seatR = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), gm('#ff4a4a', { emissive: '#ff4a4a', emissiveIntensity: 0.2 }), 218); P.seatD = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), gm('#3d7dff', { emissive: '#3d7dff', emissiveIntensity: 0.2 }), 214);
  for (const m of [P.seatR, P.seatD]) { m.frustumCulled = false; m.visible = false; MAPSC.add(m); }
  P.ships = [ship3(), ship3()]; P.jet = jet3(); P.hormuzPin = makePin('#ff7a1a');
  P.arcs = [['kyiv', '#ffd84a'], ['moscow', '#ff6a5a'], ['dc', '#bcd0ff']].map(([k, c]) => makeArc(P3(k, 0.5), P3('abu', 0.5), k === 'dc' ? 480 : 90, c)); P.abuPin = makePin(GOLD);
  P.intro = ['dc', 'pent', 'hormuz', 'everett', 'abu'].map(() => makePin(GOLD));
  return P; }
const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), s4 = new THREE.Vector3();
function pulsePin(p, pos, t, t0, sc) { p.visible = true; p.position.copy(pos); p.scale.setScalar(pop(t, t0, 0.35) * sc); p.userData.ring.scale.setScalar(1 + 1.5 * ((t * 1.3) % 1)); p.userData.ring.material.opacity = 1 - ((t * 1.3) % 1); }
function mapAt(t) { if (!PROPS) PROPS = buildProps(); const P = PROPS; clearPaint();
  P.intro.forEach((p, i) => { const keys = ['dc', 'pent', 'hormuz', 'everett', 'abu']; const a = 0.9 + i * 0.25, on = (t >= a && t < T.wash + 0.5) || t >= T.follow + 0.3; if (!on) { p.visible = false; return; } const k0 = t >= T.follow ? T.follow + 0.3 + i * 0.12 : a; const kp = t >= T.follow ? 1 - smooth(T_END - 0.5, T_END, t) : 1 - smooth(T.wash, T.wash + 0.5, t); pulsePin(p, P3(keys[i]), t, k0, mCam.position.y / 50 * Math.max(0.01, kp)); });
  // Pentagon + gavel (slams on "eight" and on "fail")
  { const on = t >= T.wash + 0.5 && t < T.senate + 0.6; P.pent.visible = P.gavel.visible = P.block.visible = on; if (on) { const k = easeOut(span(t, T.wash + 0.9, T.wash + 1.6)); P.pent.position.copy(off('pent', -3, 0)).setY(0.6 + 6 * (1 - k)); P.pent.scale.setScalar(2.4 * k + 0.01); P.pent.rotation.y = 0.2;
      const b = off('pent', 17, 6); P.block.position.copy(b).setY(1.0); P.block.scale.setScalar(1.9 * k + 0.01);
      const hit = (a) => { const u = span(t, a - 0.35, a); const back = span(t, a + 0.05, a + 0.5); return u < 1 ? lerp(-1.15, 0, u * u) : lerp(0, -0.9, easeOut(back)); };
      const ang = t < T.eight - 0.35 ? -0.9 : t < T.fail - 0.35 ? hit(T.eight + 0.1) : hit(T.fail + 0.1); P.gavel.position.copy(b).add(V3(0, 3.6, 6)); P.gavel.rotation.set(ang, 0.4, 0); P.gavel.scale.setScalar(1.9 * k + 0.01); } }
  if (t >= T.wash && t < T.senate + 0.4) { paintState('District of Columbia', GOLD, 0.9, 0.6); paintState('Virginia', '#26324a', 0.3); paintState('Maryland', '#26324a', 0.3); paintCountry('Iran', RED, 0.0); }
  // 218 vs 214
  { const on = t >= T.senate - 0.3 && t < T.wh + 0.6; P.seatR.visible = P.seatD.visible = on; if (on) { const out = 1 - smooth(T.wh, T.wh + 0.5, t);
      const fill = (m, n, base, t0) => { for (let i = 0; i < n; i++) { const a = t0 + (i / n) * 1.3, k = t < a ? 0.001 : easeOut(span(t, a, a + 0.25)) * out + 0.001, c = i % 10, r = Math.floor(i / 10) % 2, lvl = Math.floor(i / 20);
          s4.setScalar(k); m4.compose(V3(base.x + (c - 4.5) * 2.0, 1.0 + lvl * 1.15, base.z + (r - 0.5) * 2.0), q4.identity(), s4); m.setMatrixAt(i, m4); } m.instanceMatrix.needsUpdate = true; };
      fill(P.seatR, 218, llPos(-101, 39.5), T.senate - 0.2); fill(P.seatD, 214, llPos(-89, 39.5), T.senate - 0.1); } }
  // White House
  WH.visible = t >= T.wh && t < T.iran + 0.6; if (WH.visible) { const k = easeOut(span(t, T.wh + 0.3, T.wh + 1.0)); WH.position.copy(off('dc', -3, 0.5)).setY(0.3 + 6 * (1 - k)); WH.scale.setScalar(3.2 * k + 0.01); WH.rotation.y = 0; }
  if (t >= T.wh && t < T.iran + 0.6) { paintState('District of Columbia', GOLD, 0.9, 0.6); }
  // Iran + Hormuz: ships on fire
  if (t >= T.iran && t < T.boeing + 0.4) { paintCountry('Iran', '#ff9a5a', 0.45 * smooth(T.iran, T.iran + 0.5, t), 0.6); }
  P.ships.forEach((s, i) => { const on = t >= T.ships - 0.4 + i * 0.25 && t < T.boeing + 0.3; s.visible = on; if (on) { const k = easeOut(span(t, T.ships - 0.4 + i * 0.25, T.ships + 0.2 + i * 0.25)); s.position.copy(llPos(56.6 + i * 0.9, 26.0 - i * 0.55, 0.2)); s.rotation.y = 0.5 + i * 0.4; s.scale.setScalar(mCam.position.y / 70 * k + 0.01);
      const f = 1 + 0.25 * Math.sin(t * 13 + i); s.userData.fire.scale.setScalar(f); s.userData.smoke.position.y = 4.5 + ((t * 0.8 + i) % 2) * 1.5; s.userData.smoke.scale.setScalar(1.2 + ((t * 0.8 + i) % 2)); s.userData.smoke.material.opacity = 0.7 * (1 - ((t * 0.8 + i) % 2) / 2); } });
  if (t >= T.iran + 0.8 && t < T.boeing) pulsePin(P.hormuzPin, P3('hormuz'), t, T.iran + 0.8, mCam.position.y / 45); else P.hormuzPin.visible = false;
  // Boeing: a jet climbing out of Everett
  { const on = t >= T.boeing + 0.5 && t < T.abu + 0.4; P.jet.visible = on; if (on) { const u = span(t, T.boeing + 0.5, T.abu + 0.4); P.jet.position.copy(off('everett', -6 + 16 * u, 4 - 10 * u)).setY(2 + 7 * u); P.jet.rotation.set(0, 0.6, 0.12 + 0.1 * u); P.jet.scale.setScalar(1.25 * pop(t, T.boeing + 0.5, 0.4)); } }
  if (t >= T.boeing && t < T.abu + 0.4) paintState('Washington', '#3d7dff', 0.25, 0.3);
  // Abu Dhabi talks
  const arcK = (a) => t < a || t > T.follow + 0.2 ? 0 : easeOut(span(t, a, a + 0.9)); arcShow(P.arcs[0], arcK(T.ukr - 0.1)); arcShow(P.arcs[1], arcK(T.ukr + 0.4)); arcShow(P.arcs[2], arcK(T.first - 0.2));
  if (t >= T.abu && t < T.follow + 0.3) { paintCountry('Ukraine', GOLD, 0.55, 0.5); paintCountry('Russia', RED, 0.4, 0.4); paintCountry('United Arab Emirates', GOLD, 0.85, 0.8); }
  if (t >= T.abu + 0.6 && t < T.follow + 0.3) pulsePin(P.abuPin, P3('abu'), t, T.abu + 0.6, mCam.position.y / 45); else P.abuPin.visible = false;
  palTex.needsUpdate = true; }
// ---- DOM ----
const photo = { massie: ['Thomas Massie', 'REPUBLICAN · KENTUCKY'], hegseth: ['Pete Hegseth', 'DEFENSE SECRETARY'], dana_white: ['Dana White', 'UFC BOSS'], trump: ['Donald Trump', 'PRESIDENT'] };
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
  if (t < T.wash + 0.6) return null;
  if (t < T.senate) return ['01 · THE PENTAGON', t < T.eight ? 'IMPEACHMENT' : t < T.act ? '8 ARTICLES' : t < T.farce ? '2 LEGISLATIVE DAYS' : t < T.johnson ? '“A FARCE”' : '“NOT GOING TO FAIL”', t < T.act ? 'MASSIE (R) VS. HEGSETH · OVER THE IRAN WAR' : t < T.farce ? 'THE HOUSE MUST ACT' : t < T.johnson ? 'HEGSETH' : 'SPEAKER JOHNSON ON THE VOTE TO BLOCK IT'];
  if (t < T.wh) return ['01 · THE HOUSE', '218 · 214', 'REPUBLICANS · DEMOCRATS · 2/3 OF THE SENATE TO REMOVE'];
  if (t < T.iran) return ['02 · WHITE HOUSE', t < T.down ? 'PRESS SECRETARY?' : t < T.joke ? 'DANA WHITE: NO' : '“A JOKE”', t < T.down ? 'UFC BOSS AT THE BRIEFING' : t < T.joke ? 'TRUMP: “DEVASTATED”' : 'TRUMP ON HIS OWN OFFER'];
  if (t < T.boeing) return ['03 · IRAN', t < T.denies ? '“EFFECTIVELY OVER”' : 'SHIPS ON FIRE', t < T.denies ? 'TRUMP ON THE IRAN WAR' : 'IRAN DENIES TALKS · STRAIT OF HORMUZ'];
  if (t < T.abu) return ['04 · BOEING', t < T.five ? 'LAYOFFS' : '−5%', 'COMMERCIAL AIRPLANES · INTERNAL EMAIL'];
  if (t < T.follow) return ['05 · ABU DHABI', t < T.first ? 'UKRAINE · RUSSIA' : 'FIRST TALKS', t < T.first ? 'AT ONE TABLE' : 'U.S.-BROKERED · FIRST SINCE FEBRUARY'];
  return null; }
function introHTML(t) { if (t > T.wash + 0.5) return ''; const k = pop(t, T.intro, 0.35), a = 1 - smooth(T.wash + 0.1, T.wash + 0.5, t), bar = easeOut(span(t, T.intro + 0.2, T.intro + 0.8));
  const hh = Math.max(0, 24 - span(t, T.intro + 0.3, T.wash) * 24), clock = `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}:${String(Math.floor((hh * 3600) % 60)).padStart(2, '0')}`;
  return `<div id="intro" style="opacity:${a.toFixed(2)};transform:scale(${k.toFixed(3)})"><div class="idate"><b>●</b> TUESDAY · NOV 10, 2026</div><div class="ititle">The last</div><div class="iplate" style="transform:skewX(-8deg) scale(${(0.6 + 0.4 * easeOut(span(t, T.intro + 0.15, T.intro + 0.45))).toFixed(3)})"><span>24 HOURS</span></div>
    <div><div class="isub" style="opacity:${smooth(T.intro + 0.5, T.intro + 0.8, t)}">IN AMERICA <i>&</i> AROUND THE WORLD</div></div><div class="iclock">${clock}</div></div>`; }
function domAt(t) { const P = PROPS; STK = []; let h = introHTML(t);
  h += card('massie', T.massie - 0.05, T.farce - 0.05, 110, 640, t, { tag: '8 ARTICLES', tagc: 'r', tagT: T.eight });
  h += card('hegseth', T.farce - 0.25, T.senate, 650, 660, t, { small: true, quote: '“A FARCE”', qT: T.farce });
  h += card('dana_white', T.dana - 0.05, T.iran, 110, 640, t, { tag: t >= T.down ? 'SAID NO' : '', tagc: 'r', tagT: T.down });
  h += card('trump', S[6] - 0.05, T.iran, 650, 660, t, { small: true, quote: '“DEVASTATED”', qT: S[6] + 0.4 });
  h += card('trump', T.over - 0.3, T.denies, 110, 640, t, { small: true, quote: '“EFFECTIVELY OVER”', qT: T.over });
  if (P) {
    if (t >= T.wash + 1.4 && t < T.senate) sticker('THE PENTAGON', off('pent', -3, 0).setY(6), t, T.wash + 1.4, 'sm w');
    if (t >= T.senate + 0.4 && t < T.wh) { sticker('REPUBLICANS 218', llPos(-101, 39.5, 14), t, T.senate + 0.6, 'r'); sticker('DEMOCRATS 214', llPos(-89, 39.5, 14), t, T.senate + 0.8, 'b'); }
    if (t >= T.wh + 1.0 && t < T.iran) sticker('WHITE HOUSE', off('dc', -3, 4).setY(3), t, T.wh + 1.0, 'sm w');
    if (t >= T.ships && t < T.boeing) sticker('STRAIT OF HORMUZ', P3('hormuz', 8), t, T.ships + 0.2, 'r');
    if (t >= T.boeing + 1.0 && t < T.abu) sticker('BOEING · EVERETT, WA', off('everett', 0, 0).setY(4), t, T.boeing + 1.0, 'sm w');
    if (t >= T.abu + 1.0 && t < T.follow) { sticker('ABU DHABI', P3('abu', 30), t, T.abu + 1.0, 'w'); sticker('KYIV', P3('kyiv', 4), t, T.ukr, 'sm'); sticker('MOSCOW', P3('moscow', 4), t, T.ukr + 0.4, 'r sm'); }
  }
  h += layoutStickers();
  if (t >= T.down && t < T.joke) h += `<div class="stamp" style="font-size:130px;top:1090px;transform:translate(-50%,-50%) rotate(-10deg) scale(${(1 + 1.5 * (1 - easeOut(span(t, T.down, T.down + 0.18)))).toFixed(3)})">NO</div>`;
  if (t >= T.follow - 0.2 && t < ENDC) h += `<div class="cta" style="opacity:${smooth(T.follow - 0.2, T.follow + 0.1, t)};transform:scale(${pop(t, T.follow - 0.2, 0.35).toFixed(3)})">Follow for <span class="hl">tomorrow’s</span><br>24 hours</div>`;
  $('labels').innerHTML = h;
  const hd = hudAt(t); $('hud').style.opacity = hd ? 1 : 0; if (hd) { $('stat').innerHTML = '<b></b>' + hd[0]; $('val').textContent = hd[1]; $('val').style.fontSize = (hd[1].length > 14 ? 84 : 104) + 'px'; $('sub').textContent = hd[2]; }
  const kv = [T.wash + 0.6, T.eight, T.act, T.farce, T.johnson, T.senate, T.wh, T.down, T.joke, T.iran, T.denies, T.boeing, T.five, T.abu, T.first]; let pp = 1; for (const k of kv) if (t >= k && t < k + 0.3) pp = pop(t, k, 0.3); $('val').style.transform = `skewX(-6deg) scale(${pp.toFixed(3)})`;
  $('cap').innerHTML = capHTML(t); $('cap').style.opacity = t < ENDC ? 1 : 0;
  $('end').style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.96; $('endT').style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); $('endS').style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- render: motion blur during flights (4 sub-frames over a 180° shutter, accumulated in linear HDR) ----
const ACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tS: { value: null }, uW: { value: 0.25 } }, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform sampler2D tS; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tS, vUv).rgb * uW, 1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
function flashAt(t) { let f = 0; for (const k of [T.eight + 0.1, T.fail + 0.1, T.down]) f = Math.max(f, 1 - Math.abs(t - k - 0.03) / 0.14); f = Math.max(f, 1 - Math.abs(t - T.intro - 0.05) / 0.2); return Math.max(0, f) * 0.8; }
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
