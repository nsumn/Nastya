// =================== EXTRAS (more to look at): the formula aura, street life + lightning + rays at the jump, a fuller classroom (falling mug),
// the book tornado, the library lights draining into the bulb, more friends, the sibling storming off with Mom laughing ===================
// ---- the aura: glowing formulas orbiting your head once the IQ jumps (one set per scene) ----
const FORMULAS = ['E=mc²', 'π', '∑', '√2', 'a²+b²=c²', '∫x dx', '∞', 'Δx', 'φ', 'e^iπ+1=0', '42', 'x̄'];
const formTex = FORMULAS.map(f => canvasTex(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = 'bold 54px "Source Serif 4", serif'; g.textAlign = 'center'; g.shadowColor = '#7ae8ff'; g.shadowBlur = 14; g.fillStyle = '#e8fcff'; g.fillText(f, w / 2, 66); }));
function makeAura(scene) { return FORMULAS.map((f, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: formTex[i], color: new THREE.Color(1.6, 1.9, 2.2), transparent: true, depthWrite: false })); s.visible = false; scene.add(s); return { s, a: i / FORMULAS.length * Math.PI * 2, y: 0.25 * Math.sin(i * 2.1), r: 0.55 + 0.15 * hash(i * 7) }; }); }
function aura(A, h, t, k) { A.forEach(({ s, a, y, r }, i) => { s.visible = k > 0.01; if (!s.visible) return; const ang = a + t * 0.6, fall = 1 - k;
  s.position.set(h.x + Math.cos(ang) * r, h.y + 0.1 + y + 0.05 * Math.sin(t * 2 + i) - fall * 0.8, h.z + Math.sin(ang) * r * 0.7); s.material.opacity = k * (0.55 + 0.45 * (Math.sin(ang) * 0.5 + 0.5)); s.scale.set(0.34, 0.13, 1); }); }
const auras = { shop: makeAura(shop), curve: makeAura(curve), cls: makeAura(cls), lib: makeAura(lib), room: makeAura(room) };
// ---- the street (seen through the glass): storefronts with signs, people walking, cars ----
const signTex = txt => canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#1e2a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd060'; g.font = 'bold 40px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(txt, w / 2, 46); });
['PIZZA', 'BOOKS', 'LAUNDRY', 'DINER', 'GYM', 'BANK'].forEach((n, i) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: signTex(n), color: new THREE.Color(1.3, 1.3, 1.3) })); s.position.set(-8 + i * 3.2, 2.6, 22.9); s.rotation.y = Math.PI; shop.add(s); });
const walkers = [['#e84a5a', '#d7a47e', 'long'], ['#4a8ae8', '#8d5a3c', 'short'], ['#f2c040', '#f1d2b6', 'bangs'], ['#7a5ac8', '#b98260', 'curly']].map(([top, skin, hs], i) => { const p = makeBlock({ skin, top, hair: hs === 'curly' ? '#2a1d14' : pick(['#1a1a1a', '#4a2f1b', '#c8903a']), bottom: '#2a3a5c', hairStyle: hs }); shop.add(p.outer); return { p, z: 3.6 + (i % 2) * 1.3, sp: (i % 2 ? -1 : 1) * R(0.8, 1.1), x0: R(-6, 6) }; });
function makeCar(col) { const c = new THREE.Group(); bx(1.9, 0.5, 0.85, col, 0, 0.45, 0, c); bx(1.0, 0.4, 0.8, col, -0.1, 0.88, 0, c); bx(0.98, 0.34, 0.82, '#a8c8e0', -0.1, 0.88, 0, c, { roughness: 0.2 }); for (const [x, z] of [[-0.62, 0.43], [0.62, 0.43], [-0.62, -0.43], [0.62, -0.43]]) { const w = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), M('#1a1a1e')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, z); c.add(w); } return c; }
const cars = [['#e8303a', 15.8, 1], ['#f4f4f2', 18.2, -1], ['#3a6ad0', 15.8, 1]].map(([col, z, d], i) => { const c = makeCar(col); c.position.z = z; shop.add(c); return { c, d, x0: i * 9 }; });
// ---- the jump: lightning around the head + a burst of rays behind you ----
const boltM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 3.2, 4.0), transparent: true, depthWrite: false });
const bolts = Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => { const m = mesh(BOX, boltM, false, false); shop.add(m); return m; }));
const raysT = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.translate(w / 2, h / 2); for (let k = 0; k < 24; k++) { g.rotate(Math.PI / 12); const gr = g.createLinearGradient(0, 0, w / 2, 0); gr.addColorStop(0, 'rgba(255,240,180,0.9)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, -14); g.lineTo(w / 2, 14); g.closePath(); g.fill(); } });
const rays = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: raysT, transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(1.6, 1.5, 1.2) })); shop.add(rays);
function shopExtras(t, mode) { const h = headOf(hero);
  walkers.forEach(({ p, z, sp, x0 }, i) => { poseReset(p, t); const x = wrapR(x0 + sp * t, -7, 7); p.outer.position.set(x, 0.95, z); p.outer.rotation.y = sp > 0 ? Math.PI / 2 : -Math.PI / 2; poseWalk(p, t * 8 + i, 1);
    const lookAt = (mode === 'open' && t > 1.95 && t < POP + 1.5) || (mode === 'end' && t > DOOR + 2.35); if (lookAt) { p.outer.rotation.y = Math.PI + (x > 0 ? 0.4 : -0.4); poseIdle(p, t, i); p.outer.position.x = clamp(x, -2.5, 2.5); }
    p.face(lookAt ? (mode === 'open' && t > POP ? 'surprised' : 'laugh') : 'neutral', t + i); });
  cars.forEach(({ c, d, x0 }) => { c.position.x = wrapR(x0 + d * 6 * t, -20, 20); c.rotation.y = d > 0 ? 0 : Math.PI; });
  const kb = mode === 'open' ? Math.max(0, 1 - Math.abs(t - POP - 0.35) / 0.55) : 0;
  bolts.forEach((B, j) => { let p = h.clone().add(V3(0, 0.05, 0)); const ang = j * 1.57 + Math.floor(t * 15) * 0.7; B.forEach((m, i) => { m.visible = kb > 0.05; if (!m.visible) return; const q = p.clone().add(V3(Math.cos(ang) * 0.07 + (hash(i + j * 9 + Math.floor(t * 15)) - 0.5) * 0.08, 0.04 + (hash(i * 3 + j + Math.floor(t * 15)) - 0.5) * 0.08, Math.sin(ang) * 0.05));
    m.position.lerpVectors(p, q, 0.5); m.lookAt(q); m.scale.set(0.012, 0.012, p.distanceTo(q)); p = q; }); }); boltM.opacity = kb;
  rays.position.set(h.x, h.y, h.z + 0.4); rays.lookAt(spCam.position); rays.rotateZ(t * 0.8); rays.material.opacity = mode === 'open' ? 0.85 * Math.max(0, 1 - Math.abs(t - POP - 0.4) / 0.9) : 0;
  aura(auras.shop, h, t, mode === 'open' ? smooth(POP + 0.2, POP + 0.9, t) : 1 - smooth(DOOR + 2.3, DOOR + 2.9, t)); }
// ---- a fuller classroom: more students, a window wall, a clock, the teacher's mug drops ----
const mates2 = [['#e8a83a', '#f1d2b6', 'long'], ['#5a6ae8', '#6b4329', 'short'], ['#e84a8a', '#d7a47e', 'curly']].map(([top, skin, hs]) => { const p = makeBlock({ skin, top, hair: pick(['#1a1a1a', '#4a2f1b', '#7a4a22']), bottom: '#2a2e3a', hairStyle: hs }); cls.add(p.outer); return p; });
{ for (const [x, z] of [[-1.3, 2.4], [1.3, 2.4], [0, 2.4]]) { bx(0.7, 0.04, 0.5, '#c89a6a', x, 0.72, z + 0.32, cls); }
  bx(0.1, 3, 8, '#e8e0c8', -3.0, 1.5, 0, cls); for (const z of [-1.8, 0.2, 2.2]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.8, 2.0) })); w.position.set(-2.94, 1.8, z); w.rotation.y = Math.PI / 2; cls.add(w); }
  const clockT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#2a2a30'; g.lineWidth = 6; g.stroke(); g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 22); g.moveTo(64, 64); g.lineTo(94, 64); g.stroke(); });
  const ck = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ map: clockT })); ck.position.set(1.9, 2.3, -3.44); cls.add(ck);
  const eqT = canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#f4f4ec'; g.font = '36px "Source Serif 4", serif'; ['x² − 5x + 6 = 0', '∫₀¹ x² dx = ⅓', 'e^{iπ} + 1 = 0', 'F = ma'].forEach((s, i) => g.fillText(s, 20, 50 + i * 58)); });
  const eq = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: eqT, transparent: true })); eq.position.set(-1.9, 1.75, -3.43); cls.add(eq); bx(1.8, 1.0, 0.03, '#2f4a3a', -1.9, 1.75, -3.46, cls); }
const tMug = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 12), M('#e84a3a')); cls.add(tMug);
function classExtras(t) { mates2.forEach((m, i) => { poseReset(m, t); seatAt(m, [-1.3, 1.3, 0][i], 0.47, 3.0, Math.PI); m.arms[1].rotation.set(-0.9, 0, 0.1); m.elbows[1].rotation.x = -0.8; m.face(t < TEST + 1.9 ? (i % 2 ? 'reading' : 'squint') : 'surprised', t + i * 0.7); });
  teacher.outer.updateMatrixWorld(true); const hand = teacher.elbows[1].localToWorld(V3(0, -0.3, 0.05)), fall = clamp((t - TEST - 1.8) / 0.45, 0, 1);
  if (t < TEST + 1.8) { teacher.arms[1].rotation.set(-0.7, 0, 0); teacher.elbows[1].rotation.x = -1.2; tMug.position.copy(teacher.elbows[1].localToWorld(V3(0, -0.3, 0.06))); tMug.rotation.set(0, 0, 0); }
  else { tMug.position.set(hand.x + 0.1 * fall, Math.max(0.05, hand.y - 4.9 * Math.pow(fall * 0.45, 2) * 4.5), hand.z + 0.1 * fall); tMug.rotation.set(0, 0, fall * 1.6); }
  aura(auras.cls, headOf(hero), t, 1); }
// ---- the book tornado; the library lights drain into the bulb ----
const TORN = Array.from({ length: 44 }, (_, i) => { const b = mesh(BOX, M(pick(['#a83a2a', '#2a5a8a', '#3a7a4a', '#c8902a', '#6a3a7a', '#d8c8a8']), { roughness: 0.8 })); b.scale.set(0.14, 0.2, 0.035); lib.add(b); return { b, a: i * 0.77, y: 0.2 + (i / 44) * 2.0, r: 0.55 + 0.45 * (i / 44), sp: 2.2 + hash(i) * 1.2 }; });
const ceilLamps = [-1.2, 0, 1.2].map(x => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.8) })); m.position.set(x, 2.9, 0.6); lib.add(m); bx(0.01, 0.3, 0.01, '#2a2a2a', x, 3.1, 0.6, lib); return m; });
function libExtras(t, mode) { const h = headOf(hero);
  const k = mode === 'books' ? smooth(LIB + 2.2, LIB + 3.2, t) : 0; TORN.forEach(({ b, a, y, r, sp }) => { b.visible = k > 0.01; if (!b.visible) return; const ang = a + t * sp; b.position.set(h.x + Math.cos(ang) * r * k, y * (0.4 + 0.6 * k), h.z + Math.sin(ang) * r * k); b.rotation.set(ang, ang * 0.7, 0.3); });
  let drain = 0, dark = 0; if (mode === 'bulb') { drain = smooth(BULB + 1.0, BULB + 5.2, t); dark = t > BULB + 5.4 ? Math.max(0, 1 - (t - BULB - 5.6) / 1.4) : 0; }
  const flick = drain > 0.5 ? 0.85 + 0.15 * Math.sin(t * 37) * Math.sin(t * 11) : 1, lv = (1 - 0.8 * drain) * flick * (1 - 0.8 * dark);
  lbLamp.intensity = 4 * lv; ceilLamps.forEach(m => m.material.color.setRGB(3 * lv, 2.6 * lv, 1.8 * lv)); lbHemi.intensity = (mode === 'bulb' ? 0.6 : 0.9) * (0.4 + 0.6 * lv);
  aura(auras.lib, h, t, 1); }
// ---- more friends at the small talk, snacks; the sibling storms off, Mom laughs in the background ----
const fr3 = makeBlock({ skin: '#8d5a3c', hair: '#1a1a1a', top: '#5ac87a', bottom: '#3a3a40', hairStyle: 'curly' }), fr4 = makeBlock({ skin: '#f1d2b6', hair: '#a5462a', top: '#f08a4b', bottom: '#2a3a5c', hairStyle: 'short' }); room.add(fr3.outer, fr4.outer);
const snacks = new THREE.Group(); { const bowl = mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#e8e0d0')); bowl.position.y = 0.16; snacks.add(bowl); for (let i = 0; i < 14; i++) { const c = bx(0.05, 0.01, 0.05, '#e8b04a', R(-0.1, 0.1), 0.15 + R(0, 0.04), R(-0.1, 0.1), snacks); c.rotation.set(R(0, 3), R(0, 3), 0); } } snacks.position.set(-1.95, 0.6, -1.55); room.add(snacks);
function talkExtras(t, mode) { fr3.outer.visible = fr4.outer.visible = false; snacks.visible = mode === 'talk';
  if (mode === 'talk') { for (const [P, x, z, ry, ex] of [[fr3, 0.25, -2.15, -0.2, 'laugh'], [fr4, -0.75, -2.25, 0.3, 'happy']]) { poseReset(P, t); P.outer.position.set(x, 0.95, z); P.outer.rotation.y = ry; P.face(t < TALK + 3.0 ? ex : 'surprised', t + x); } }
  else { const go = smooth(ARGUE + 5.0, ARGUE + 7.4, t); if (go > 0) { sib.outer.position.set(lerp(2.95, 0.6, go), 0.95, lerp(-0.35, 0.9, go)); sib.outer.rotation.y = -2.1 + 1.2 * smooth(ARGUE + 4.8, ARGUE + 5.2, t); poseWalk(sib, t * 12, 1); }
    mom.outer.visible = true; poseReset(mom, t); mom.outer.position.set(1.2, 0.95, -2.2); mom.outer.rotation.y = 0.5; mom.face(t > ARGUE + 3.6 ? 'laugh' : 'neutral', t); }
  aura(auras.room, headOf(hero), t, 1); }
function curveExtras(t) { aura(auras.curve, headOf(hero), t, smooth(CURVE + 5, CURVE + 6, t)); }
// hide every aura except the current scene's
function extras(id, t) { Object.values(auras).forEach(A => A.forEach(a => a.s.visible = false)); bolts.forEach(B => B.forEach(m => m.visible = false));
  if (id === 'open') shopExtras(t, 'open'); else if (id === 'door') shopExtras(t, 'end'); else if (id === 'test') classExtras(t); else if (id === 'books' || id === 'bulb') libExtras(t, id); else if (id === 'talk' || id === 'argue') talkExtras(t, id); else if (id === 'curve') curveExtras(t); }
