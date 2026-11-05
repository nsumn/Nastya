// =================== THE SETS for "hear everyone's thoughts": your bedroom (morning + night), the NYC avenue by day (gone-video set + crowds), a packed subway car,
// an office meeting room, the burger place as a cafe (gone-video diner, nobody vanishes), Times Square (the avenue's billboard end), the city at night from above
// (the gone-video tower grid re-lit), and an MRI lab with the mind-reading decoder on a monitor. Thought bubbles themselves are DOM (m_main.js, bubblesAt). ===================
friend.outer.visible = false;
for (const o of [HW.car, HW.bikeA, HW.bikeB, ...HW.smoke, WHS.box, ...WHS.slips]) o.visible = false;
const headP = p => { p.outer.updateMatrixWorld(true); return p.root.localToWorld(V3(0, 1.63, 0)); };   // people.js head (world)
// every set keeps a list of "thinkers": { head: () => Vector3, pool, rate (bubbles/s), k (seed) }
const THINK = {};
const GEN = ['Did I lock the door?', 'pizza', 'is my fly open?', 'act natural', 'what if I just screamed right now', 'I could take him in a fight', 'pretend to be on the phone', 'he waved… not at me', 'walk normal. WALK NORMAL', 'I could be a pro athlete', 'is that my ex?! hide', 'if I trip, I move to Canada', 'that dog is cuter than my kids', 'I\'m the main character', 'he looks like a potato', 'tacos tonight?', 'did I say "you too" to the waiter?', 'smile. no, not like that', 'I need a nap', 'rent is due…', 'SKIBIDI', '67', 'is it Friday yet?', 'that cloud looks like a cat', 'I hope nobody heard that'];
const SUBP = ['who farted', 'is that my stop?', 'why is it SO hot', 'don\'t make eye contact', 'phone at 2%', 'stop leaning on me', 'I want that seat', 'he\'s cute… wedding ring', 'if I fall asleep I end up in Brooklyn', 'is he reading my texts?', 'hold it in. HOLD IT IN', 'pretend to be asleep', 'smells like pizza', 'is he asleep on me?', 'SKIBIDI', '67'];
const OFFP = ['lunch?', 'not listening', 'this could be an email', 'nod. just nod.', 'I have no idea what my job is', 'if he says "synergy" again…', 'am I muted?', 'act busy', 'I could sleep under this table', 'pretend to take notes', 'what did he just say', 'did he say pizza party?', 'quiet quitting rn', '5 pm please', 'why is he so tall'];
const CAFEP = ['$7 for a latte?!', 'that\'s NOT oat milk', 'is "Ashley" my order?', 'pretend to type something smart', 'one more cookie', 'is she on a date?', 'he\'s loud', 'should I quit my job', 'I came here to be seen', 'the wifi is my landlord', 'I need sugar'];
const LIEP = ["I'm 5 minutes away", 'I love it!', "I'm fine", 'I read your email', 'on my way!', 'sorry, I was busy', 'great idea!'];
const SQP = ['pizza', 'my feet hurt', 'I\'m in a movie', 'Elmo looks tired', 'act like a local', '$9 for water?!', 'selfie time', 'lost my group', 'I need a bathroom', 'hot dog?', 'tickets cost WHAT?!', 'where did I park', 'pretzel!', '67', 'SKIBIDI', 'is that a famous guy?'];
const NIGHTP = ['is that a spider?', 'snack time…', 'why did I say that in 2014', 'can\'t sleep', '3 am cereal?', 'was that a noise?'];

// ---------- 1) YOUR BEDROOM (morning; the same room at night): bed, nightstand + clock, window, poster; neighbours think through the walls ----------
const BED = mkSet({ top: '#f8f0e4', bot: '#f8f0e4', fog: 0xf4ece0, near: 20, far: 60, hemi: [0xfff4e8, 0x8a7a68, 1.0], sun: [0xfff0d8, 2.4, V3(6, 5, 3)], shadow: 6 });
const BD = {}; {
  const sc = BED.sc, wallM = F_('#e8d8c4'), wood = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b88a5a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#a87a4a' : '#c0925e'; g.fillRect(0, i * 32, w, 30); } speckle(g, w, h, 900, ['#9a6a3a', '#c89a6a'], 3); }, [4, 4]);
  gplane(sc, 8, 8, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 }), 0, 0);
  const wall = (w, x, z, ry, col = wallM) => { const p = mesh(new THREE.PlaneGeometry(w, 3.0), col, false, true); p.position.set(x, 1.5, z); p.rotation.y = ry; sc.add(p); return p; };
  wall(8, 0, -3.0, 0); wall(8, -3.0, 0, Math.PI / 2); wall(8, 3.0, 0, -Math.PI / 2, F_('#c8d8e4'));
  const ceil = mesh(new THREE.PlaneGeometry(8, 8), F_('#f4ece0'), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.0; sc.add(ceil);
  // the window on the right wall (x = +3): bright sky + towers outside; at night a dark blue city
  const win = (night) => canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, night ? '#0a1430' : '#8ab8e8'); gr.addColorStop(1, night ? '#1a2a4a' : '#f4e2c8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { const x = i * 66, bw = 50 + 20 * hash(i), bh = 180 + 220 * hash(i * 3); g.fillStyle = night ? '#141a28' : ['#b8705a', '#d8ccb4', '#8a8c94', '#c8a07a'][i % 4]; g.fillRect(x, h - bh, bw, bh);
      for (let r = 0; r < bh / 22; r++) for (let c = 0; c < bw / 14 - 1; c++) { g.fillStyle = night ? (hash(i * 31 + r * 7 + c) < 0.35 ? '#f8d890' : '#20283a') : 'rgba(40,60,80,0.5)'; g.fillRect(x + 4 + c * 14, h - bh + 6 + r * 22, 7, 11); } } });
  BD.winDay = win(false); BD.winNight = win(true);
  BD.win = mesh(new THREE.PlaneGeometry(1.8, 1.5), new THREE.MeshBasicMaterial({ map: BD.winDay }), false, false); BD.win.position.set(2.98, 1.65, -0.6); BD.win.rotation.y = -Math.PI / 2; sc.add(BD.win);
  for (const [w, h, y, z] of [[0.08, 1.6, 1.65, -1.5], [0.08, 1.6, 1.65, 0.3], [0.08, 0.08, 2.42, -0.6], [0.08, 0.08, 0.88, -0.6], [0.06, 1.5, 1.65, -0.6]]) bx(0.06, h, w === 0.08 && h === 0.08 ? 1.9 : w, '#f4f0ea', 2.96, y, z, sc);
  // the bed against the back wall: frame, mattress, blanket, two pillows, headboard
  rb(1.7, 0.32, 2.2, F_('#8a5a3a'), -0.9, 0.2, -1.85 + 1.1, sc, 0.04); rb(1.6, 0.22, 2.1, F_('#f4f2ee'), -0.9, 0.47, -0.75, sc, 0.06);
  rb(1.8, 1.0, 0.1, F_('#7a4a2a'), -0.9, 0.85, -1.85, sc, 0.04);
  BD.blanket = rb(1.66, 0.12, 1.45, F_('#4a7ab8'), -0.9, 0.62, -0.32, sc, 0.06);
  for (const x of [-1.3, -0.5]) rb(0.62, 0.16, 0.4, F_('#f8f8f4'), x, 0.65, -1.5, sc, 0.08);
  // nightstand + clock + lamp (the lamp is the night light)
  rb(0.5, 0.55, 0.45, F_('#a87a4a'), 0.35, 0.28, -1.6, sc, 0.03);
  BD.clockT = '7:02'; BD.clockTex = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#141416'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff4a3a'; g.font = '700 40px Inter'; g.textAlign = 'center'; g.fillText('7:02', w / 2, 46); });
  rb(0.2, 0.1, 0.08, F_('#2a2a2e'), 0.28, 0.6, -1.5, sc, 0.02); const cf = mesh(new THREE.PlaneGeometry(0.17, 0.08), new THREE.MeshBasicMaterial({ map: BD.clockTex }), false, false); cf.position.set(0.28, 0.6, -1.459); sc.add(cf); BD.clockFace = cf;
  rb(0.05, 0.3, 0.05, F_('#2e3034'), 0.45, 0.7, -1.7, sc, 0.02); BD.shade = mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.18, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#f4e8c8', emissive: '#f8c870', emissiveIntensity: 0, side: THREE.DoubleSide })); BD.shade.position.set(0.45, 0.92, -1.7); sc.add(BD.shade);
  BD.lamp = new THREE.PointLight(0xffc878, 0, 6, 1.4); BD.lamp.position.set(0.45, 0.95, -1.5); sc.add(BD.lamp);
  // a poster + a shelf
  const post = canvasTex(256, 360, (g, w, h) => { g.fillStyle = '#1a2a4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f08a2a'; g.beginPath(); g.arc(w / 2, 150, 70, 0, 6.3); g.fill(); g.fillStyle = '#f4f0e6'; g.font = '800 40px Inter'; g.textAlign = 'center'; g.fillText('NEW YORK', w / 2, 290); });
  const ps = mesh(new THREE.PlaneGeometry(0.7, 0.98), new THREE.MeshStandardMaterial({ map: post, roughness: 0.6 }), false, false); ps.position.set(-2.98, 1.7, -0.9); ps.rotation.y = Math.PI / 2; sc.add(ps);
  rb(0.25, 0.04, 1.0, F_('#a87a4a'), -2.85, 1.2, 0.6, sc, 0.01); for (let i = 0; i < 6; i++) rb(0.18, 0.22 + 0.06 * hash(i), 0.05, F_(['#c8302a', '#2a6a4a', '#f4c430', '#2a4a8a'][i % 4]), -2.85, 1.33, 0.25 + i * 0.07, sc, 0.01);
  rb(1.2, 0.02, 0.8, F_('#c8b49a'), 0.9, 0.012, 0.6, sc, 0.01);   // rug
  BD.moon = new THREE.DirectionalLight(0x6a8ad8, 0); BD.moon.position.set(6, 4, -1); sc.add(BD.moon);
  // where the neighbours "are": through the left wall, the back wall, the ceiling
  BD.nb = [V3(-2.6, 1.15, -2.95), V3(-1.55, 1.75, -2.95), V3(-2.95, 0.9, -1.5), V3(-0.3, 1.5, -2.95)]; }
function updateBED(t, night) { const sc = BED.sc, sun = sc.userData.sun, hl = sc.children.find(o => o.isHemisphereLight);
  sun.intensity = night ? 0 : 2.4; hl.intensity = night ? 0.12 : 1.0; BD.moon.intensity = night ? 0.5 : 0; BD.lamp.intensity = night ? 3.2 : 0; BD.shade.material.emissiveIntensity = night ? 1.6 : 0;
  BD.win.material.map = night ? BD.winNight : BD.winDay; sc.fog.color.set(night ? 0x0a0e18 : 0xf4ece0);
  const tt = night ? '3:12' : '7:02'; if (BD.clockT !== tt) { BD.clockT = tt; const c = BD.clockTex.image.getContext('2d'); c.fillStyle = '#141416'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ff4a3a'; c.font = '700 40px Inter'; c.textAlign = 'center'; c.fillText(tt, 64, 46); BD.clockTex.needsUpdate = true; } }

// ---------- 2) THE AVENUE BY DAY: the gone-video New York, crowds on both sidewalks (nobody vanishes), more walkers near Times Square ----------
NY.walkers.forEach(w => { w.tv = 999; });
NY.cabs.forEach(c => { c.userData.tv = 999; });
NY.crowd = []; { const r0 = seed; seed = 777;
  for (let i = 0; i < 70; i++) { const p = makePerson(rnd); NYC.sc.add(p.outer); const s = rnd() < 0.5 ? -1 : 1, sq = i >= 40;
    NY.crowd.push({ p, x: sq ? (rnd() - 0.5) * 12 : s * (8.2 + 2.6 * rnd()), z0: sq ? -66 - 52 * rnd() : 30 - 110 * rnd(), dir: rnd() < 0.5 ? 1 : -1, sp: sq ? 0.5 + 0.5 * rnd() : 1.0 + 0.5 * rnd(), ph: rnd() * 6, side: sq ? 0 : s, look: rnd() * 6.28 }); }
  seed = r0; }
function updateDayNYC(t) { NY.walkers.forEach(w => { const z = w.z0 + w.dir * w.sp * t; w.p.outer.visible = true; w.p.outer.position.set(w.x, 0.95 + 0.16, z); w.p.outer.rotation.y = w.dir > 0 ? 0 : Math.PI; poseWalk(w.p, t * 7 + w.ph, 1); });
  NY.crowd.forEach(w => { w.p.outer.visible = true; const sq = w.side === 0, z = w.z0 + w.dir * w.sp * (t - STREET) * (sq ? 0.4 : 1), x = sq ? w.x + 0.6 * Math.sin(t * 0.3 + w.ph) : w.x; w.p.outer.position.set(x, 0.95 + (sq ? 0.0 : 0.16), z);
    w.p.outer.rotation.y = sq ? w.look + 0.4 * Math.sin(t * 0.4 + w.ph) : (w.dir > 0 ? 0 : Math.PI); if (sq && (w.ph % 1) < 0.5) poseIdle(w.p, t, w.ph); else poseWalk(w.p, t * 7 * (sq ? 0.6 : 1) + w.ph, sq ? 0.6 : 1); });
  NY.cabs.forEach(c => { const u = c.userData; c.position.z = u.z0 + u.v * 9 * (t - STREET) * 0.6; c.rotation.y = u.lane > 0 ? Math.PI : 0; c.visible = true; });
  NY.steam.forEach((s, i) => { const k = ((t * 0.5 + i / 6) % 1); s.position.set(-3.2 + 0.3 * Math.sin(i + t), 1.5 + 4 * k, -20 + 0.4 * Math.cos(i)); s.scale.setScalar(1 + 3 * k); s.material.opacity = 0.55 * (1 - k); });
  const lit = Math.floor(t / 3) % 3; NY.lights.forEach((b, i) => b.material.color.set(i % 3 === lit ? ['#e8302a', '#f0b030', '#30d060'][i % 3] : '#2a2a2a')); }
THINK.nyc = [...NY.walkers, ...NY.crowd].map((w, i) => ({ head: () => headP(w.p), pool: GEN, rate: 0.42, k: i * 1.31, sq: w.side === 0 }));
THINK.nyc.forEach((th, i) => { if (th.sq) th.pool = SQP; });

// ---------- 3) THE SUBWAY CAR (rush hour): benches along both walls, poles + grab rails, light strips, ads, the tunnel streaking past the windows; ~40 people ----------
const TRN = mkSet({ top: '#1a1c22', bot: '#1a1c22', fog: 0x2a2c30, near: 14, far: 40, hemi: [0xf0f4ff, 0x5a5a60, 1.15], sun: [0xf4f8ff, 0.6, V3(0, 8, 2)], shadow: 10 });
const TR = {}; {
  const sc = TRN.sc, L = 18, Wd = 2.9, Hh = 2.3, metal = F_('#c8ccd4', { metalness: 0.6, roughness: 0.3, flatShading: false });
  const floor = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6a6a70'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#5a5a60', '#7a7a80', '#8a8a8a'], 3); }, [3, 9]);
  gplane(sc, Wd, L, new THREE.MeshStandardMaterial({ map: floor, roughness: 0.6 }), 0, 0);
  const ceil = mesh(new THREE.PlaneGeometry(Wd, L), F_('#e8eaee'), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = Hh; sc.add(ceil);
  for (const x of [-0.55, 0.55]) { const l = mesh(new THREE.BoxGeometry(0.16, 0.03, L - 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.4) }), false, false); l.position.set(x, Hh - 0.02, 0); sc.add(l); }
  for (const z of [-L / 2, L / 2]) { const e = mesh(new THREE.PlaneGeometry(Wd, Hh), F_('#b8bcc4'), false, true); e.position.set(0, Hh / 2, z); e.rotation.y = z > 0 ? Math.PI : 0; sc.add(e); rb(0.8, 1.9, 0.04, F_('#9aa0aa', { metalness: 0.5 }), 0, 0.95, z + (z > 0 ? -0.03 : 0.03), sc, 0.02); }
  // the tunnel outside: a dark texture with streaking lights (scrolled per frame)
  TR.tun = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#121418'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const x = i * 120 + 30 * hash(i); const gr = g.createLinearGradient(x, 0, x + 70, 0); gr.addColorStop(0, 'rgba(255,220,150,0)'); gr.addColorStop(0.7, 'rgba(255,220,150,0.9)'); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.fillRect(x, 40 + 30 * hash(i * 2), 70, 6); }
    g.strokeStyle = '#2a2c32'; g.lineWidth = 6; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } });
  TR.tun.wrapS = THREE.RepeatWrapping; TR.tun.repeat.set(3, 1);
  for (const s of [-1, 1]) { const wall = mesh(new THREE.PlaneGeometry(L, Hh), F_('#d8dce2'), false, true); wall.position.set(s * Wd / 2, Hh / 2, 0); wall.rotation.y = -s * Math.PI / 2; sc.add(wall);
    const glass = mesh(new THREE.PlaneGeometry(L - 1, 0.62), new THREE.MeshBasicMaterial({ map: TR.tun }), false, false); glass.position.set(s * (Wd / 2 - 0.01), 1.45, 0); glass.rotation.y = -s * Math.PI / 2; sc.add(glass);
    for (let z = -L / 2 + 0.5; z <= L / 2 - 0.5; z += 1.4) bx(0.03, 0.66, 0.08, '#b8bcc4', s * (Wd / 2 - 0.03), 1.45, z, sc);
    // bench (blue-grey) + the ad strip above the windows
    rb(0.48, 0.1, L - 2.4, F_('#5a7aa8', { roughness: 0.4 }), s * (Wd / 2 - 0.26), 0.45, 0, sc, 0.04); rb(0.44, 0.4, L - 2.4, F_('#8a9098'), s * (Wd / 2 - 0.24), 0.2, 0, sc, 0.02);
    const ADV = [['#f4c430', '#1a1a1a', 'LEARN CODING'], ['#2a6ad8', '#fff', 'HURT? CALL US'], ['#e8463a', '#fff', 'DENTIST'], ['#2ab87a', '#fff', 'MATTRESS SALE'], ['#8a3ad8', '#fff', 'BROADWAY']];
    for (let k = 0; k < 8; k++) { const a = ADV[(k + (s > 0 ? 2 : 0)) % ADV.length], tx = canvasTex(320, 96, (g, w, h) => { g.fillStyle = a[0]; g.fillRect(0, 0, w, h); g.fillStyle = a[1]; g.font = '800 34px Inter'; g.textAlign = 'center'; g.fillText(a[2], w / 2, 60); });
      const p = mesh(new THREE.PlaneGeometry(1.4, 0.36), new THREE.MeshBasicMaterial({ map: tx }), false, false); p.position.set(s * (Wd / 2 - 0.02), 1.98, -7.5 + k * 2.1); p.rotation.y = -s * Math.PI / 2; sc.add(p); }
    // grab rail along the ceiling
    const rail = mesh(new THREE.CylinderGeometry(0.018, 0.018, L - 0.6, 8), metal); rail.rotation.x = Math.PI / 2; rail.position.set(s * 0.7, 2.0, 0); sc.add(rail); }
  for (let z = -7.5; z <= 7.5; z += 2.5) { const p = mesh(new THREE.CylinderGeometry(0.02, 0.02, Hh, 8), metal); p.position.set(0, Hh / 2, z); sc.add(p); }
  // the people: seated on both benches, standing in the aisle (holding rails / poles), some on phones
  TR.people = []; const r0 = seed; seed = 3131;
  for (const s of [-1, 1]) for (let z = -7.6; z <= 7.6; z += 0.62) { if (rnd() < 0.08) continue; const p = makePerson(rnd); sc.add(p.outer); TR.people.push({ p, sit: true, x: s * (Wd / 2 - 0.36), z: z + 0.08 * rnd(), ry: -s * Math.PI / 2, ph: rnd() * 6, phone: rnd() < 0.45 }); }
  for (let i = 0; i < 24; i++) { const p = makePerson(rnd); sc.add(p.outer); const z = -7.8 + i * 0.68 + 0.2 * rnd(), x = (i % 3 - 1) * 0.42 + 0.1 * (rnd() - 0.5);
    if (Math.abs(z - 1.2) < 0.7 && Math.abs(x) < 0.5) continue;   // keep the hero's spot by the pole at z ≈ 1.2
    TR.people.push({ p, sit: false, x, z, ry: rnd() < 0.5 ? 0 : Math.PI, ph: rnd() * 6, phone: rnd() < 0.4, hold: rnd() < 0.6 ? (x < 0 ? -1 : 1) : 0 }); }
  seed = r0; }
function updateTRN(t) { TR.tun.offset.x = -t * 2.6; const sway = 0.012 * Math.sin(t * 2.1) + 0.006 * Math.sin(t * 5.3);
  TR.people.forEach(w => { const p = w.p; p.outer.rotation.set(0, w.ry, w.sit ? 0 : sway);
    if (w.sit) { p.outer.position.set(w.x, 0.56, w.z); poseSit(p); } else { p.outer.position.set(w.x + sway * 2, 0.95, w.z); poseIdle(p, t, w.ph); if (w.hold) { p.arms[w.hold > 0 ? 1 : 0].rotation.set(-2.9, 0, 0); p.elbows[w.hold > 0 ? 1 : 0].rotation.x = -0.2; } }
    if (w.phone) { p.arms[1].rotation.x = -0.9; p.elbows[1].rotation.x = -1.4; } }); }
THINK.trn = TR.people.map((w, i) => ({ head: () => headP(w.p), pool: SUBP, rate: 0.62, k: i * 2.17 }));

// ---------- 4) THE OFFICE MEETING: a glass room high up (skyline outside), long table, 7 people + you, the boss at a screen with a chart ----------
const OFF = mkSet({ top: '#f4f6f8', bot: '#f4f6f8', fog: 0xeef0f4, near: 20, far: 70, hemi: [0xffffff, 0x8a8a90, 1.2], sun: [0xfff4e8, 1.6, V3(-8, 7, 4)], shadow: 8 });
const OF = {}; {
  const sc = OFF.sc; const carpet = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a6270'; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, ['#4a525e', '#6a7280'], 2); }, [6, 6]);
  gplane(sc, 12, 12, new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.9 }), 0, 0);
  const ceil = mesh(new THREE.PlaneGeometry(12, 12), F_('#f0f0ee'), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = 2.9; sc.add(ceil);
  for (const z of [-1.5, 1.5]) { const l = mesh(new THREE.BoxGeometry(2.6, 0.03, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }), false, false); l.position.set(0, 2.88, z); sc.add(l); }
  const sky = canvasTex(1024, 384, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7ab0e8'); gr.addColorStop(1, '#e8eef4'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) { const x = i * 48 + 10 * hash(i), bw = 30 + 30 * hash(i * 2), bh = 80 + 220 * hash(i * 3); g.fillStyle = ['#a8b4c4', '#c8ccd4', '#8a96a8', '#b8a898'][i % 4]; g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = 'rgba(40,60,90,0.35)'; for (let r = 0; r < bh / 12; r++) g.fillRect(x + 3, h - bh + 4 + r * 12, bw - 6, 5); } });
  const win = mesh(new THREE.PlaneGeometry(10, 2.9), new THREE.MeshBasicMaterial({ map: sky }), false, false); win.position.set(-3.6, 1.45, 0); win.rotation.y = Math.PI / 2; sc.add(win);
  for (let z = -5; z <= 5; z += 1.25) bx(0.06, 2.9, 0.06, '#2e3034', -3.55, 1.45, z, sc);
  const wl = mesh(new THREE.PlaneGeometry(12, 2.9), F_('#e4e2de'), false, true); wl.position.set(0, 1.45, -3.2); sc.add(wl); const wr = mesh(new THREE.PlaneGeometry(12, 2.9), F_('#e4e2de'), false, true); wr.position.set(3.6, 1.45, 0); wr.rotation.y = -Math.PI / 2; sc.add(wr);
  const wb = mesh(new THREE.PlaneGeometry(12, 2.9), F_('#e4e2de'), false, true); wb.position.set(0, 1.45, 4.5); wb.rotation.y = Math.PI; sc.add(wb);
  // the table (long, along z), chairs, laptops, cups
  rb(1.4, 0.06, 4.2, F_('#f4f2ee', { roughness: 0.35 }), 0, 0.75, 0.4, sc, 0.03); for (const z of [-1.4, 2.2]) rb(0.9, 0.72, 0.1, F_('#2e3034'), 0, 0.36, z, sc, 0.02);
  // the screen on the back wall with a bar chart ("Q3 GROWTH")
  const chart = canvasTex(640, 360, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a2a4a'; g.font = '800 42px Inter'; g.fillText('Q3 GROWTH', 30, 60);
    for (let i = 0; i < 6; i++) { g.fillStyle = i === 5 ? '#f08a2a' : '#3a6ad8'; const bh = 60 + i * 38; g.fillRect(50 + i * 95, h - 30 - bh, 60, bh); } g.strokeStyle = '#8a8a90'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, h - 28); g.lineTo(w - 30, h - 28); g.stroke(); });
  const scr = mesh(new THREE.PlaneGeometry(1.9, 1.07), new THREE.MeshBasicMaterial({ map: chart }), false, false); scr.position.set(0, 1.6, -3.15); sc.add(scr); bx(2.0, 1.15, 0.05, '#1a1a1e', 0, 1.6, -3.2, sc);
  OF.people = []; const r0 = seed; seed = 4545; const chairs = [];
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) chairs.push([s * 1.0, -0.8 + k * 1.0, s > 0 ? -Math.PI / 2 : Math.PI / 2]);
  chairs.forEach(([x, z, ry], i) => { rb(0.5, 0.08, 0.5, F_('#1a1a1e'), x, 0.48, z, sc, 0.03); rb(0.08, 0.6, 0.5, F_('#1a1a1e'), x + (x > 0 ? 0.25 : -0.25), 0.85, z, sc, 0.03); rb(0.06, 0.44, 0.06, F_('#5a5a60'), x, 0.22, z, sc, 0.01);
    const lt = rb(0.34, 0.02, 0.24, F_('#b8bcc4', { metalness: 0.5 }), x * 0.45, 0.79, z, sc, 0.01); const ls = rb(0.34, 0.22, 0.015, F_('#2a2c32'), x * 0.45 + (x > 0 ? 0.1 : -0.1), 0.9, z, sc, 0.01); ls.rotation.z = 0; ls.rotation.y = Math.PI / 2; ls.position.x = x * 0.45 + (x > 0 ? 0.12 : -0.12); ls.rotation.order = 'YXZ'; ls.rotation.x = 0.25 * (x > 0 ? 1 : -1);
    if (i === 5) { OF.heroSeat = [x, z, ry]; return; }   // your chair (right side, 2nd from the window end)
    const p = makePerson(rnd, { cap: false }); sc.add(p.outer); OF.people.push({ p, x, z, ry, ph: rnd() * 6, nod: rnd() < 0.7 }); });
  OF.boss = makePerson(rnd, { top: '#2a3a5a', bottom: '#2a2e3a', cap: false, dress: false, shorts: false, longSleeve: true }); sc.add(OF.boss.outer);
  seed = r0; }
function updateOFF(t) { OF.people.forEach(w => { const p = w.p; p.outer.position.set(w.x, 0.56, w.z); p.outer.rotation.set(0, w.ry, 0); poseSit(p); p.arms.forEach(a => a.rotation.x = -1.0); p.elbows.forEach(e => e.rotation.x = -0.5);
    p.root.rotation.x = w.nod ? 0.08 * Math.max(0, Math.sin(t * 2.6 + w.ph)) : 0.02; });
  const b = OF.boss; b.outer.position.set(0.55, 0.95, -2.55); b.outer.rotation.set(0, Math.PI + 0.5 + 0.25 * Math.sin(t * 0.7), 0); poseIdle(b, t, 1); b.arms[0].rotation.set(-1.3 - 0.2 * Math.sin(t * 2.2), 0, 0.5); b.elbows[0].rotation.x = -0.3; }
THINK.off = OF.people.map((w, i) => ({ head: () => headP(w.p), pool: OFFP, rate: 0.5, k: i * 3.7 }));
THINK.off.push({ head: () => headP(OF.boss), pool: ['nobody is listening', 'do they like me?', 'I need a vacation', 'wait, is this slide upside down?'], rate: 0.35, k: 99 });

// ---------- 5) THE CAFE = the gone-video burger place, full (nobody vanishes); your friend across the booth; a few customers are lying (red bubbles) ----------
DN.people.forEach(w => { w.tv = 999; });
const pal = makeBlock({ head: 'human', body: 'human', skin: '#f2c6a2', hair: '#2a1a12', top: '#e86a9a', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'long', headS: 0.86, lip: '#c8404a', h: 0.95 });
DIN.sc.add(pal.outer);
THINK.din = DN.people.map((w, i) => ({ head: () => headP(w.p), pool: CAFEP, rate: 0.3, k: i * 1.9, lie: hash(i * 5.31) < 0.09 }));   // ~1 in 11 → "half of all lies: 5% of people"

// ---------- 6) THE CITY AT NIGHT from above (the gone-video tower grid re-lit): lit windows, and a glowing dot rising from every window = a thought ----------
{ const sc = BURB.sc, sky = sc.children.find(o => o.isMesh && o.material.isMeshBasicMaterial && o.geometry.type === 'SphereGeometry');
  sky.material.map = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#04060e'); gr.addColorStop(0.7, '#0e1630'); gr.addColorStop(1, '#2a2a48'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.fog.color.set(0x0c1020); sc.fog.near = 300; sc.fog.far = 1300; const hl = sc.children.find(o => o.isHemisphereLight); hl.color.set('#3a4a7a'); hl.groundColor.set('#0a0a12'); hl.intensity = 0.35; sc.userData.sun.intensity = 0.15; sc.userData.sun.color.set('#6a8ad8');
  const wt = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#1a1c24'; g.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 4; c++) { g.fillStyle = hash(r * 4 + c + 0.3) < 0.42 ? '#ffd890' : '#0e1018'; g.fillRect(4 + c * 15, 3 + r * 8, 9, 4); } });
  wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2, 6); burbIM.walls.material.map = wt; burbIM.walls.material.emissiveMap = wt; burbIM.walls.material.emissive = new THREE.Color(1.0, 0.85, 0.6); burbIM.walls.material.emissiveIntensity = 0.9; burbIM.walls.material.needsUpdate = true;
  const c = new THREE.Color(); for (let k = 0; k < burbIM.n; k++) { burbIM.walls.setColorAt(k, c.set(['#3a3c48', '#4a3a36', '#34363e', '#3a4250'][k % 4])); burbIM.roofs.setColorAt(k, c.set('#14161c')); }
  burbIM.walls.instanceColor.needsUpdate = burbIM.roofs.instanceColor.needsUpdate = true; burbIM.cars.visible = false;
  for (let i = 0; i < 40; i++) { const L = new THREE.PointLight(0xffc880, 900, 120, 1.6); L.position.set((hash(i * 3.1) - 0.5) * 640, 12, (hash(i * 5.3) - 0.5) * 620); sc.add(L); }
  // the thought dots: additive glowing sprites rising from random roofs (instanced quads facing the camera via a shader)
  const N = 6000, g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const seedA = new Float32Array(N * 4); for (let i = 0; i < N; i++) { const k = (hash(i * 1.37) * burbIM.n) | 0; burbIM.walls.getMatrixAt(k, _o.matrix); _o.matrix.decompose(_o.position, _o.quaternion, _o.scale);
    seedA.set([_o.position.x + (hash(i * 2.1) - 0.5) * _o.scale.x, _o.scale.y * (0.3 + 0.7 * hash(i * 4.4)), _o.position.z + (hash(i * 3.3) - 0.5) * 12, hash(i * 7.7)], i * 4); }
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seedA, 4)); g.instanceCount = N;
  BURB.dots = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uOn: { value: 0 } },
    vertexShader: `attribute vec4 aSeed; uniform float uT, uOn; varying vec2 vQ; varying float vA;
      void main(){ float on = step(aSeed.w, uOn); float ph = fract(uT * 0.35 + aSeed.w * 7.0); vec3 p = aSeed.xyz + vec3(0.0, ph * 40.0, 0.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); float s = 1.6 + 1.2 * aSeed.w; mv.xy += position.xy * s; vQ = position.xy; vA = on * sin(3.14159 * ph); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vQ; varying float vA; void main(){ float d = length(vQ); float a = exp(-d * d * 4.0) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(1.0, 0.85, 0.5) * a * 2.2, a); }` }));
  BURB.dots.frustumCulled = false; sc.add(BURB.dots); }
function updateCITY(t) { BURB.dots.material.uniforms.uT.value = t; BURB.dots.material.uniforms.uOn.value = smooth(CITY + 0.3, LAB - 1.0, t); }

// ---------- 7) THE MRI LAB: white room, the scanner (a box with a round bore), the bed sliding in with a volunteer, a monitor with the decoded text ----------
const LABS = mkSet({ top: '#eef2f6', bot: '#eef2f6', fog: 0xe8eef4, near: 20, far: 60, hemi: [0xf4f8ff, 0x8a9098, 1.25], sun: [0xf8fbff, 1.4, V3(4, 8, 6)], shadow: 7 });
const LB = {}; {
  const sc = LABS.sc; const tile = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#dfe4ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c4cad2'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [10, 10]);
  gplane(sc, 14, 14, new THREE.MeshStandardMaterial({ map: tile, roughness: 0.3 }), 0, 0);
  for (const [x, z, ry] of [[0, -4, 0], [-4.5, 0, Math.PI / 2], [4.5, 0, -Math.PI / 2]]) { const w = mesh(new THREE.PlaneGeometry(14, 3.2), F_('#eef0f2'), false, true); w.position.set(x, 1.6, z); w.rotation.y = ry; sc.add(w); }
  const ceil = mesh(new THREE.PlaneGeometry(14, 14), F_('#f4f6f8'), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.2; sc.add(ceil);
  for (const x of [-1.5, 1.5]) { const l = mesh(new THREE.BoxGeometry(1.2, 0.03, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.4) }), false, false); l.position.set(x, 3.18, -1); sc.add(l); }
  // scanner: a rounded square with a round hole, extruded along z (the bore runs along z)
  const sq = new THREE.Shape(); const r = 0.35, a = 1.1; sq.moveTo(-a + r, -a); sq.lineTo(a - r, -a); sq.quadraticCurveTo(a, -a, a, -a + r); sq.lineTo(a, a - r); sq.quadraticCurveTo(a, a, a - r, a); sq.lineTo(-a + r, a); sq.quadraticCurveTo(-a, a, -a, a - r); sq.lineTo(-a, -a + r); sq.quadraticCurveTo(-a, -a, -a + r, -a);
  const hole = new THREE.Path(); hole.absarc(0, 0.05, 0.36, 0, Math.PI * 2, true); sq.holes.push(hole);
  const sg = new THREE.ExtrudeGeometry(sq, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 32 }); sg.translate(0, 0, -0.75);
  const scn = mesh(sg, new THREE.MeshStandardMaterial({ color: '#f8f8fa', roughness: 0.25 })); scn.position.set(0, 1.15, -2.0); sc.add(scn);
  const ring = mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 40), new THREE.MeshStandardMaterial({ color: '#3a8ad8', emissive: '#3a8ad8', emissiveIntensity: 0.8 })); ring.position.set(0, 1.2, -1.15); sc.add(ring);
  const bore = mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.5, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#d8dce2', side: THREE.BackSide, roughness: 0.4 })); bore.rotation.x = Math.PI / 2; bore.position.set(0, 1.2, -2.0); sc.add(bore);
  // the bed (a base + a sliding top) and the volunteer lying on it, head first into the bore
  rb(0.7, 0.62, 1.8, F_('#e8eaee'), 0, 0.31, 0.2, sc, 0.06); LB.top = new THREE.Group(); sc.add(LB.top); rb(0.56, 0.08, 2.2, F_('#5a8ac8', { roughness: 0.4 }), 0, 0, 0, LB.top, 0.04); rb(0.3, 0.08, 0.25, F_('#f4f4f4'), 0, 0.08, -0.95, LB.top, 0.04);
  { const r0 = seed; seed = 6262; LB.vol = makePerson(rnd, { top: '#8ab8e8', bottom: '#5a6a8a', cap: false, hairStyle: 0.5, dress: false, shorts: false }); seed = r0; LB.top.add(LB.vol.outer); }
  // the monitor on a desk to the right: brain slices + the decoded text (redrawn when the typed length changes)
  rb(1.4, 0.05, 0.7, F_('#f4f2ee'), 2.4, 0.78, -0.6, sc, 0.02); rb(0.05, 0.76, 0.6, F_('#9aa0aa'), 1.8, 0.38, -0.6, sc, 0.01); rb(0.05, 0.76, 0.6, F_('#9aa0aa'), 3.0, 0.38, -0.6, sc, 0.01);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 600; LB.cv = cv; LB.tex = new THREE.CanvasTexture(cv); LB.tex.colorSpace = THREE.SRGBColorSpace; LB.tex.anisotropy = 8; LB.typed = -1;
  LB.mon = mesh(new THREE.PlaneGeometry(1.3, 0.76), new THREE.MeshBasicMaterial({ map: LB.tex }), false, false); LB.mon.position.set(2.4, 1.32, -0.82); LB.mon.rotation.y = -0.35; sc.add(LB.mon);
  const fr = rb(1.36, 0.82, 0.04, F_('#1a1a1e'), 0, 0, 0, sc, 0.02); fr.position.copy(LB.mon.position).add(V3(0.012, 0, -0.03)); fr.rotation.y = -0.35; rb(0.06, 0.4, 0.06, F_('#2a2a2e'), 2.42, 0.98, -0.88, sc, 0.01);
  // a lab assistant at the desk
  { const r0 = seed; seed = 7171; LB.doc = makePerson(rnd, { top: '#f4f4f4', bottom: '#3a4a6a', cap: false, longSleeve: true, dress: false, shorts: false }); seed = r0; sc.add(LB.doc.outer); } }
const HEARD = "I don't have my driver's license yet.", DECODED = 'She has not even started to learn to drive yet.';
function drawMonitor(n) { const g = LB.cv.getContext('2d'), w = 1024, h = 600; g.fillStyle = '#0c1220'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 3; k++) { const cx = 90 + k * 120, cy = 95; g.fillStyle = '#1a2438'; g.beginPath(); g.ellipse(cx, cy, 48, 62, 0, 0, 6.3); g.fill();
    for (let i = 0; i < 22; i++) { const a = hash(i * 3.1 + k) * 6.3, rr = 40 * Math.sqrt(hash(i * 1.7 + k)); g.fillStyle = `rgba(240,${120 + 100 * hash(i)},40,${0.4 + 0.5 * hash(i * 5 + k)})`; g.beginPath(); g.arc(cx + Math.cos(a) * rr * 0.8, cy + Math.sin(a) * rr, 5 + 5 * hash(i * 2), 0, 6.3); g.fill(); } }
  g.fillStyle = '#8ab0e8'; g.font = '800 40px Inter'; g.fillText('SEMANTIC DECODER', 450, 85); g.fillStyle = '#6a84a8'; g.font = '600 28px Inter'; g.fillText('reading brain scans', 450, 128);
  const wrap = (txt, x, y, lh, maxW) => { let line = '', yy = y; for (const wd of txt.split(' ')) { const tl = line ? line + ' ' + wd : wd; if (g.measureText(tl).width > maxW && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tl; } g.fillText(line, x, yy); };
  g.fillStyle = '#8a9ab8'; g.font = '700 30px Inter'; g.fillText('HEARD:', 50, 225); g.fillStyle = '#e8eef8'; g.font = '600 50px Inter'; wrap(HEARD, 50, 285, 60, 930);
  g.fillStyle = '#f0a040'; g.font = '700 30px Inter'; g.fillText('DECODED FROM THE BRAIN:', 50, 395); g.fillStyle = '#ffd08a'; g.font = '700 50px Inter';
  wrap(DECODED.slice(0, n) + (n < DECODED.length ? '▌' : ''), 50, 455, 60, 930); LB.tex.needsUpdate = true; }
function updateLAB(t) { const k = smooth(LAB + 0.2, LAB + 3.0, t); LB.top.position.set(0, 0.7, 0.2 - 1.5 * k);
  const v = LB.vol; v.outer.rotation.set(-Math.PI / 2, 0, Math.PI); v.outer.position.set(0, 0.2, 0.05); poseIdle(v, 0, 0); v.arms.forEach(a => a.rotation.set(0, 0, 0)); v.legs.forEach(l => l.rotation.x = 0); v.knees.forEach(k2 => k2.rotation.x = 0);
  const d = LB.doc; d.outer.visible = t < 54.5; d.outer.position.set(2.55, 0.56, 0.05); d.outer.rotation.set(0, Math.PI + 0.35, 0); poseSit(d); d.arms.forEach(a => a.rotation.x = -1.1); d.elbows.forEach(e => e.rotation.x = -0.5);
  const n = Math.floor(DECODED.length * clamp((t - (LAB + 4.6)) / 2.4, 0, 1)); if (n !== LB.typed) { LB.typed = n; drawMonitor(n); } }
