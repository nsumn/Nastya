// =================== THE CAST: you (the low-poly human she approved) in the family-house set (m_sets.js), now a bedroom corner on the left ===================
const hero = makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 });
room.add(hero.outer); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false;
const camKey = new THREE.PointLight(0xfff0e0, 1.4, 6, 1.2); rmCam.add(camKey); room.add(rmCam);   // soft key riding with the camera: faces never go dark
function poseReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.elbows.forEach(e => e.rotation.set(-0.15, 0, 0)); }
function seatAt(P, x, y, z, ry = 0) { P.outer.position.set(x, y + 0.95 - 0.87 * P.h, z); P.outer.rotation.set(0, ry, 0); poseSit(P); }
const LIE = V3(-2.9, 0.72, 1.34);   // lying in bed on your back, head at the headboard (-z)
// ---- the bed, a nightstand with a red digital clock and a little lamp, a blue "night" light from the window ----
const bed = new THREE.Group(); room.add(bed); bed.position.set(-2.9, 0, 1.3);
{ bx(1.1, 0.35, 2.0, '#6a4a34', 0, 0.18, 0, bed); bx(1.04, 0.16, 1.92, '#f2f0ec', 0, 0.43, 0, bed); bx(1.1, 0.8, 0.08, '#6a4a34', 0, 0.55, -1.0, bed); bx(0.55, 0.1, 0.3, '#ffffff', 0, 0.56, -0.78, bed); }
const duvet = bx(1.08, 0.2, 1.25, '#5a7ab0', 0, 0.8, 0.38, bed);
const clkCv = document.createElement('canvas'); clkCv.width = 256; clkCv.height = 96; const clkTex = new THREE.CanvasTexture(clkCv); clkTex.colorSpace = THREE.SRGBColorSpace; let clkLast = '';
function drawClock(txt) { if (txt === clkLast) return; clkLast = txt; const g = clkCv.getContext('2d'); g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#ff5a4a'; g.font = 'bold 64px Inter, monospace'; g.textAlign = 'center'; g.fillText(txt, 128, 72); clkTex.needsUpdate = true; }
{ const ck = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.13), new THREE.MeshBasicMaterial({ map: clkTex, color: new THREE.Color(1.6, 1.6, 1.6) })); ck.position.set(-3.6, 0.6, 0.0); ck.rotation.y = 0.5; room.add(ck);
  bx(0.4, 0.5, 0.4, '#6a4a30', -3.7, 0.25, 0.0, room); bx(0.36, 0.14, 0.2, '#1a1c22', -3.62, 0.57, 0.02, room).rotation.y = 0.5; }
const bedLamp = new THREE.PointLight(0xffc078, 0, 3.5, 1.4); bedLamp.position.set(-3.75, 1.0, 0.25); room.add(bedLamp);
{ bx(0.03, 0.3, 0.03, '#2a2a30', -3.8, 0.65, 0.12, room); const sh = mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.14, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#5a3a10' })); sh.position.set(-3.8, 0.85, 0.12); room.add(sh); }
const blueL = new THREE.PointLight(0x5a78ff, 0, 6, 1.2); blueL.position.set(-1.5, 2.2, 2.4); room.add(blueL);
// ---- thoughts: speech-bubble cards that pop up around your head (billboard sprites); after midnight they turn dark and bigger ----
const THOUGHTS = [   // [appear t, text, dark] — drawn as speech bubbles in the DOM text layer (k_main.js), so they stay readable and never cover the caption
  [beat(5), 'Did I lock the door?'], [beat(7), 'Why did I say “you too”<br>to the waiter?'], [beat(9), 'That thing I said<br>in 7th grade…'],
  [beat(11), 'Did they read my text?'], [beat(13), 'Is that a new mole?'], [beat(15), 'Wait… what’s my purpose?'],
  [beat(42), 'What if I fail?', 1], [beat(44), 'What if they’re all<br>mad at me?', 1], [beat(46), 'What if I’m wasting<br>my life?', 1], [beat(48), 'What if I never<br>sleep again?', 1]];   // each pops on a beat
// ---- counting sheep: a little fence beside the bed, sheep hop over it toward your head; when trying too hard, they stop and turn to stare at you ----
function makeSheep() { const g = new THREE.Group(); const wool = M('#f4f2ec', { flatShading: true, roughness: 1, emissive: '#4a4a46' }), blk = M('#2a2626', { flatShading: true });
  for (let i = 0; i < 7; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.11, 0), wool); b.position.set((hash(i) - 0.5) * 0.12, 0.3 + (hash(i * 3) - 0.5) * 0.06, -0.12 + i * 0.04); g.add(b); }
  const hd = mesh(new THREE.BoxGeometry(0.09, 0.1, 0.12), blk); hd.position.set(0, 0.36, -0.24); g.add(hd); for (const s of [-1, 1]) { const e = mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), blk); e.position.set(s * 0.065, 0.39, -0.22); g.add(e); }
  const legs = []; for (const [x, z] of [[-0.05, -0.1], [0.05, -0.1], [-0.05, 0.12], [0.05, 0.12]]) { const l = mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), blk); l.position.set(x, 0.1, z); g.add(l); legs.push(l); } g.userData.legs = legs; g.scale.setScalar(0.72); room.add(g); return g; }
const SHEEP = Array.from({ length: 6 }, makeSheep);
const fence = new THREE.Group(); room.add(fence); fence.position.set(-1.75, 0, 1.3); { const wd = M('#c89a5a', { flatShading: true }); for (const x of [-0.25, 0.25]) bx(0.05, 0.32, 0.05, wd, x, 0.16, 0, fence); for (const y of [0.12, 0.26]) bx(0.6, 0.04, 0.03, wd, 0, y, 0, fence); }
// ---- night 30: sticky notes all over the wall above the bed; then 91% get a red line through them ----
const NOTE_TXT = ['the email', 'rent', 'that text', 'my hair?', 'the exam', 'lock?', 'her face', 'the meeting', 'money', 'my back', 'the dog?', 'job', 'the party', 'what he said', 'teeth', 'taxes', 'the car', 'my mom', 'the stove', 'heart?', 'grades', 'the date', 'boss', 'weird mole', 'the trip', 'friends', 'the call', 'my phone', 'Monday', 'the future'];
const NOTES = NOTE_TXT.map((txt, i) => { const col = ['#fff27a', '#ffb0c8', '#9fe2ff', '#b8f59a', '#ffcf7a'][i % 5];
  const tex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, w, 34); g.fillStyle = '#2a2430'; g.font = '600 40px Inter'; g.textAlign = 'center'; g.fillText(txt, w / 2, 145); });
  const strike = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#e8202a'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(26, 190); g.lineTo(230, 70); g.stroke(); });
  const n = new THREE.Group(); const p = mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), false, true); n.add(p);
  const s = mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: strike, transparent: true, depthWrite: false }), false, false); s.position.z = 0.002; n.add(s);
  const col_ = i % 6, row = Math.floor(i / 6); n.position.set(-3.92, 1.05 + row * 0.27 + 0.04 * (hash(i * 5) - 0.5), 0.45 + col_ * 0.33 + 0.05 * (hash(i * 7) - 0.5)); n.rotation.set(0, Math.PI / 2, (hash(i * 3) - 0.5) * 0.25);
  room.add(n); return { n, s, i, cross: i !== 4 && i !== 17 && i !== 26 }; });   // 27 of 30 = 90% (≈ the study's 91%): three stay
const CROSSED = NOTES.filter(o => o.cross).map(o => o.i);   // struck out in this order, 2–3 per final hammer blow (HITS)
// ---- coffee: a mug in your hand in the morning; week 2 you pour and miss (the cup overflows) ----
const mug = new THREE.Group(); { const m = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 14), M('#e8603a')); m.position.y = 0.05; mug.add(m); const hdl = mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 10), M('#e8603a')); hdl.position.set(0.05, 0.05, 0); mug.add(hdl);
  const cf = mesh(new THREE.CircleGeometry(0.04, 14), M('#4a2a18', { roughness: 0.3 })); cf.rotation.x = -Math.PI / 2; cf.position.y = 0.095; mug.add(cf); } room.add(mug);
const pot = new THREE.Group(); { const b = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 14), M('#d8e4ec', { transparent: true, opacity: 0.6, roughness: 0.1 })); b.position.y = 0.08; pot.add(b); const c = mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.09, 14), M('#3a1e10')); c.position.y = 0.05; pot.add(c); bx(0.03, 0.12, 0.03, '#1a1a1e', -0.09, 0.09, 0, pot); } room.add(pot);
const coffeeM = M('#4a2a18', { roughness: 0.2 }), stream = mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), coffeeM), spillP = mesh(new THREE.CircleGeometry(1, 20), coffeeM, false, true); room.add(stream); spillP.rotation.x = -Math.PI / 2; room.add(spillP);
const haze = makeSmoke(room, 90);
// ---- the to-do list: a notepad on your knees + a pen in your hand ----
const pad = new THREE.Group(); { const pg = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9ac0e8'; g.lineWidth = 2; for (let y = 60; y < h; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.strokeStyle = '#e88a8a'; g.beginPath(); g.moveTo(34, 0); g.lineTo(34, h); g.stroke();
    g.fillStyle = '#1a2a6a'; g.font = '600 26px Inter'; ['TOMORROW:', '1. email Sam', '2. pay rent', '3. call mom', '4. gym 6pm'].forEach((l, i) => g.fillText(l, 44, 50 + i * 34 + (i ? 10 : 0))); });
  const p = mesh(new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: pg, roughness: 0.9 }), false, true); p.rotation.x = -Math.PI / 2; pad.add(p); } room.add(pad);
const pen = bx(0.012, 0.012, 0.14, '#2a5ad8', 0, 0, 0, room);
const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.font = 'bold 54px Inter, sans-serif'; g.fillText('z', 20, 110); g.font = 'bold 40px Inter, sans-serif'; g.fillText('z', 62, 70); g.font = 'bold 28px Inter, sans-serif'; g.fillText('z', 92, 38); }), transparent: true, depthWrite: false })); zzz.scale.setScalar(0.2); room.add(zzz);
function hideProps() { SHEEP.forEach(s => s.visible = false); fence.visible = false; NOTES.forEach(o => o.n.visible = false); mug.visible = pot.visible = stream.visible = spillP.visible = false; pad.visible = pen.visible = zzz.visible = false; }
// ---- the clock + night counter (also drives the HUD): [t, night, minutes after midnight (can exceed 24 h for PM→AM)] ----
const CLK = [[0, 1, 23 * 60 + 2], [CORT, 1, 23 * 60 + 41], [FORCE, 1, 25 * 60 + 47], [MID, 1, 26 * 60 + 31], [MORN, 7, 7 * 60], [FOG, 14, 9 * 60 + 30], [WALL, 30, 23 * 60 + 30], [LIST, 30, 23 * 60 + 36], [ENDC, 30, 23 * 60 + 44]];
function clockAt(t) { let i = 0; while (i < CLK.length - 2 && t >= CLK[i + 1][0]) i++; const [a, n, m0] = CLK[i], [b, , m1] = CLK[i + 1]; const m = CLK[i + 1][1] === n && m1 > m0 ? lerp(m0, m1, clamp((t - a) / (b - a), 0, 1)) : m0;
  const mm = Math.floor(m) % (24 * 60), h24 = Math.floor(mm / 60), h12 = (h24 + 11) % 12 + 1; return { night: n, txt: `${h12}:${String(mm % 60).padStart(2, '0')}`, ap: h24 < 12 ? 'AM' : 'PM' }; }
// ---- home beats ----
function updateHome(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); hideProps(); const P = hero; poseReset(P, t); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false;
  const night = ['bed', 'force', 'mid', 'wall', 'list'].includes(mode); lightRoom(night ? 'night' : 'day'); camKey.intensity = night ? 0.55 : 1.4; bedLamp.intensity = 0; blueL.intensity = 0; duvet.visible = true;
  drawClock(clockAt(t).txt); haze.begin(); smokeMat.uniforms.uTint.value.set('#d8dce4');
  const lie = (roll = 0) => { P.outer.position.copy(LIE); P.outer.rotation.set(-Math.PI / 2, 0, roll); };
  const popS = (t0, k = 1) => { const u = clamp((t - t0) / 0.28, 0, 1); return u <= 0 ? 0 : k * (1 + 0.3 * Math.sin(Math.PI * u) * (1 - u) - (1 - u) * (1 - u) * 0.95); };
  if (mode === 'bed' || mode === 'mid') {   // eyes open; the thoughts pop up around your head (after midnight: blue room, dark big thoughts)
    const dark = mode === 'mid'; lie(0.12 * Math.sin(t * 0.9) * (t > THINK ? 1 : 0.3)); blueL.intensity = dark ? 2.4 * smooth(MID, MID + 1.2, t) : 0; bedLamp.intensity = dark ? 0 : t < 1.2 ? 1.2 * (1 - smooth(0.6, 1.2, t)) : 0;
    P.face(dark ? 'anxious' : t < THINK ? 'neutral' : t < THINK + 3 ? 'worried' : 'surprised', t); }
  else if (mode === 'force') {   // 1:47: squeezing your eyes shut, counting sheep — then the sheep give up and stare
    const stop = beat(39); lie(); P.face(t < stop - 0.2 ? 'squint' : 'angry', t); fence.visible = true; const tq = Math.min(t, stop), v = 0.86;   // one sheep clears the fence on every beat
    SHEEP.forEach((s, i) => { s.visible = true; let c = beat(31 + i - 6), best = 99; for (let j = -1; j <= 2; j++) { const cc = beat(31 + i + 6 * j); if (Math.abs(tq - cc) < best) { best = Math.abs(tq - cc); c = cc; } }
      const z = 1.3 - (tq - c) * v, hop = Math.max(0, 1 - Math.pow((z - 1.3) / 0.45, 2)); s.position.set(-1.75 + 0.06 * Math.sin(i * 2), 0.42 * hop, z); s.rotation.set(-0.35 * hop * Math.sign(1.3 - z), 0, 0);
      const run = t < stop; s.userData.legs.forEach((l, k) => l.rotation.x = run ? 0.6 * Math.sin(t * 16 + k * Math.PI) : 0); s.visible = z > -0.4 && z < 3.2;
      if (!run) { s.rotation.set(0, lerp(0, Math.PI / 2 + 0.25 * (hash(i) - 0.5), smooth(stop, stop + 0.4, t)), 0); s.position.y = 0; } }); }
  else if (mode === 'morn') {   // night 7, 7:00 AM: sitting on the bed edge, wrecked, coffee
    seatAt(P, -2.3, 0.45, 1.5, Math.PI / 2); duvet.visible = false; P.root.rotation.x = 0.25; P.face(t < MORN + 3 ? 'sleepy' : 'worried', t);
    P.arms[1].rotation.set(-0.9, 0, -0.2); P.elbows[1].rotation.x = -1.1; P.outer.updateMatrixWorld(true); mug.visible = true; mug.position.copy(P.elbows[1].localToWorld(V3(0, -0.3, 0.05))).add(V3(0, -0.05, 0)); mug.rotation.set(0, 0, 0); }
  else if (mode === 'fog') {   // night 14, 9:30 AM: at the kitchen counter, pouring coffee… past the cup; grey haze around your head
    P.outer.position.set(3.0, 0.95, -1.5); P.outer.rotation.set(0, Math.PI / 2, 0); P.face('sleepy', t); P.arms[1].rotation.set(-1.3, 0, 0.1); P.elbows[1].rotation.x = -0.35; P.outer.updateMatrixWorld(true);
    pot.visible = true; const hand = P.elbows[1].localToWorld(V3(0, -0.32, 0.04)); pot.position.copy(hand).add(V3(0, -0.12, 0)); pot.rotation.set(0, 0, -0.9);
    mug.visible = true; mug.position.set(3.55, 0.95, -1.5); const lip = pot.localToWorld(V3(-0.09, 0.15, 0)); stream.visible = true; const sh = lip.y - 0.95; stream.scale.set(1, sh, 1); stream.position.set(lip.x, 0.95 + sh / 2, lip.z);
    spillP.visible = true; spillP.position.set(3.55, 0.953, -1.5); spillP.scale.setScalar(0.06 + 0.22 * smooth(FOG + 1.0, FOG + 6.0, t));
    const hd = headOf(P); for (let k = 0; k < 40; k++) { const u = (t * 0.15 + k / 40) % 1, a = k * 2.4; haze.add(hd.clone().add(V3(Math.cos(a) * (0.15 + 0.25 * u), 0.05 + 0.25 * u, Math.sin(a) * (0.15 + 0.25 * u))), 0.12 + 0.1 * u, 0.32 * Math.sin(Math.PI * u)); } }
  else if (mode === 'wall') {   // night 30: standing at the foot of the bed facing a wall of worries; they get crossed out one by one
    P.outer.position.set(-2.3, 0.95, 3.25); P.outer.rotation.set(0, -Math.PI * 0.62, 0); camKey.intensity = 1.0; bedLamp.intensity = 1.6; P.face(t < CROSS ? 'worried' : t < HITS[7] ? 'surprised' : 'happy', t);
    NOTES.forEach((o, i) => { const k = 65 + (i >> 1), t0 = beat(k) + (i & 1) * 0.5 * (beat(k + 1) - beat(k)), sc = popS(t0); o.n.visible = sc > 0; o.n.scale.setScalar(Math.max(0.001, sc)); const tc = HITS[Math.floor(CROSSED.indexOf(i) * HITS.length / CROSSED.length)] ?? 99; o.s.visible = o.cross && t > tc; o.s.scale.set(clamp((t - tc) / 0.12, 0.01, 1), 1, 1); }); }
  else if (mode === 'list') {   // 11:36 PM: write tomorrow's list on paper, lamp on; then lights out, asleep
    const asleep = t > LIST + 2.9; bedLamp.intensity = asleep ? 1.4 * (1 - smooth(LIST + 2.9, LIST + 3.4, t)) : 1.8;
    if (!asleep) { seatAt(P, -2.75, 0.62, 1.55, 0); duvet.visible = false; P.root.rotation.x = 0.18; P.face('reading', t); P.arms[1].rotation.set(-0.7, 0, -0.25); P.elbows[1].rotation.x = -1.0 + 0.08 * Math.sin(t * 14); P.arms[0].rotation.set(-0.6, 0, 0.25); P.elbows[0].rotation.x = -0.9;
      P.outer.updateMatrixWorld(true); pad.visible = true; pad.position.copy(P.elbows[0].localToWorld(V3(0, -0.3, 0.06))).lerp(P.elbows[1].localToWorld(V3(0, -0.3, 0.06)), 0.5); pad.rotation.set(0.5, 0, 0);
      pen.visible = true; pen.position.copy(P.elbows[1].localToWorld(V3(0, -0.32, 0.05))).add(V3(0.02 * Math.sin(t * 9), 0.03, 0)); pen.rotation.set(0.8, 0.3, 0); }
    else { lie(); P.face('sleep', t); zzz.visible = true; zzz.position.copy(headOf(P)).add(V3(0.2, 0.35, 0.1)); pad.visible = true; pad.position.set(-3.62, 0.54, 0.25); pad.rotation.set(0, 0.4, 0); } }
  haze.end(); }

// =================== THE X-RAY BODY: your ghost silhouette; the brain glass-clear with the ALARM centre (amygdala) glowing; a signal runs down to the adrenal glands,
// which pour cortisol (orange) into the blood; then the heart beating fast ===================
const xr = new THREE.Scene(); xr.background = new THREE.Color('#0a0c18'); const xCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
xr.add(new THREE.AmbientLight(0x8a9ab8, 0.8)); { const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(1, 2, 3); xr.add(k); }
{ const ringT = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(120,160,255,0.35)'; g.lineWidth = 2; for (let r = 40; r < 256; r += 36) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); } });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; xr.add(floor); }
const ghost = makeBlock({ head: 'human', body: 'human', skin: '#ffffff', hair: '#ffffff', top: '#ffffff', bottom: '#ffffff', shoe: '#ffffff', hairStyle: 'short', headS: 0.88 }); xr.add(ghost.outer); ghost.outer.position.set(0, 0.95, 0); poseIdle(ghost, 0, 0);
const ghostMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.6, 1.2), transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending });
ghost.outer.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; } });
const brainC = headOf(ghost).add(V3(0, 0.03, -0.03)), BR = 0.105;
const brainG = new THREE.Group(); brainG.position.copy(brainC); xr.add(brainG);
const brainM = new THREE.MeshStandardMaterial({ color: '#f29ab8', emissive: '#3a1428', roughness: 0.5, flatShading: true, transparent: true, opacity: 0.42, depthWrite: false });
{ const g = new THREE.SphereGeometry(BR, 22, 16), q = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i).divideScalar(BR); const f = Math.sin(v.z * 9 + Math.sin(v.y * 7) * 2) * Math.sin(v.y * 10 + Math.sin(v.x * 6) * 1.6), d = 1 + 0.06 * Math.abs(f) - 0.12 * Math.exp(-v.x * v.x / 0.004) * Math.max(0, v.y + 0.3);
    q.setXYZ(i, v.x * 0.92 * d * BR, v.y * 0.8 * d * BR, v.z * 1.12 * d * BR); } g.computeVertexNormals(); brainG.add(new THREE.Mesh(g, brainM)); }
const amyM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.2) }), AMY = [-1, 1].map(s => { const a = mesh(new THREE.SphereGeometry(0.014, 12, 8), amyM, false, false); a.scale.set(1, 0.8, 1.6); a.position.set(s * 0.035, -0.035, 0.02); brainG.add(a); return a; });
const pulseM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.3, 0.25), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), PULSE = [0, 1, 2].map(() => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), pulseM.clone()); brainG.add(p); return p; });
// adrenal glands on top of the kidneys; the signal path brain → spine → adrenals; cortisol rides the vessels
const kidM = M('#8a2a3a', { emissive: '#2a0810', roughness: 0.5 }), adrM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, 0.2) });
const ADR = [-1, 1].map(s => { const k = mesh(new THREE.SphereGeometry(0.035, 12, 10), kidM, false, false); k.scale.set(0.8, 1.3, 0.7); k.position.set(s * 0.07, 1.02, -0.03); xr.add(k);
  const a = mesh(new THREE.ConeGeometry(0.022, 0.03, 4), adrM, false, false); a.position.set(s * 0.07, 1.08, -0.03); xr.add(a); return a; });
const SIG = new THREE.CatmullRomCurve3([brainC.clone().add(V3(0, -0.05, 0.01)), V3(0, 1.48, -0.04), V3(0, 1.25, -0.06), V3(0.035, 1.12, -0.04), V3(0.07, 1.09, -0.03)]);
const sigDot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.2, 1.2) })); xr.add(sigDot);
xr.add(new THREE.Mesh(new THREE.TubeGeometry(SIG, 40, 0.003, 5, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.8, 0.5), transparent: true, opacity: 0.4 })));
const heartG = new THREE.Group(); heartG.position.set(0.035, 1.3, 0.04); xr.add(heartG);
{ const hm = M('#e8283a', { emissive: '#7a0a14', roughness: 0.35 }); for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(0.034, 16, 12), hm); l.position.set(s * 0.024, 0.016, 0); heartG.add(l); } const tip = mesh(new THREE.ConeGeometry(0.05, 0.075, 16), hm); tip.rotation.x = Math.PI; tip.position.y = -0.03; heartG.add(tip); }
const VES = [[[0.035, 1.3, 0.04], [0.0, 1.5, 0.03], [0.0, 1.62, 0.02]], [[0.035, 1.3, 0.04], [0.16, 1.4, 0.02], [0.23, 1.18, 0.0], [0.26, 0.95, 0.02]], [[0.035, 1.3, 0.04], [-0.15, 1.4, 0.02], [-0.23, 1.18, 0.0], [-0.26, 0.95, 0.02]],
  [[0.07, 1.08, -0.03], [0.05, 1.2, 0.02], [0.035, 1.3, 0.04]], [[-0.07, 1.08, -0.03], [-0.05, 1.2, 0.02], [0.035, 1.3, 0.04]],
  [[0.035, 1.3, 0.04], [0.05, 1.05, 0.04], [0.1, 0.86, 0.02], [0.1, 0.42, 0.03], [0.1, 0.08, 0.05]], [[0.035, 1.3, 0.04], [0.0, 1.05, 0.04], [-0.1, 0.86, 0.02], [-0.1, 0.42, 0.03], [-0.1, 0.08, 0.05]]].map(pts => new THREE.CatmullRomCurve3(pts.map(p => V3(...p))));
const vesMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.25, 0.15), transparent: true, opacity: 0.45 }); for (const c of VES) xr.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.007, 5, false), vesMat));
const CN = 260, cellM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.2, 0.15) }), CN), corM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 0.85, 0.12) }), CN);
cellM.frustumCulled = corM.frustumCulled = false; xr.add(cellM, corM);
const CL = Array.from({ length: CN }, (_, i) => ({ v: i % VES.length, u0: rnd(), sp: R(0.25, 0.45), off: V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(0.007), s: rnd() }));
const beatPulse = t => Math.exp(-(t - lastBeat(t)) * 9);   // the heart and the alarm centre pulse on the song's beats
const _o = new THREE.Object3D(), _v = new THREE.Vector3();
function updateXray(t) { brainG.rotation.y = 0.25 * Math.sin(t * 0.5); const alarm = smooth(CORT + 0.3, CORT + 1.2, t);
  AMY.forEach(a => a.scale.set(1 + 0.4 * alarm * Math.abs(Math.sin(t * 6)), 0.8, 1.6)); amyM.color.setRGB(0.8 + 2.0 * alarm, 0.25, 0.2);
  PULSE.forEach((p, k) => { const u = clamp((t - lastBeat(t)) / 0.6 + k / 3, 0, 1); p.visible = alarm > 0.1; p.position.set(0, -0.035, 0.02); p.scale.setScalar(0.4 + 1.4 * u); p.material.opacity = (1 - u) * 0.22 * alarm * (1 - smooth(beat(21), beat(22), t)); });
  const su = clamp((t - beat(21)) / (beat(23) - beat(21)), 0, 1); sigDot.visible = su > 0 && su < 1; SIG.getPointAt(su, sigDot.position); const cort = smooth(beat(23), HEART, t) + (t >= HEART ? 1 : 0);
  ADR.forEach(a => a.scale.setScalar(1 + 0.5 * smooth(beat(23) - 0.1, beat(23) + 0.3, t) * (0.6 + 0.4 * Math.sin(t * 8))));
  const sp = 1.3 + 0.4 * smooth(HEART, FORCE, t); heartG.scale.setScalar(1 + 0.28 * beatPulse(t));
  CL.forEach((C, i) => { const u = (C.u0 + t * C.sp * sp) % 1; VES[C.v].getPointAt(u, _v).add(C.off); _o.position.copy(_v); _o.rotation.set(t + i, t * 0.7 + i, 0); _o.scale.setScalar(1); _o.updateMatrix(); cellM.setMatrixAt(i, _o.matrix);
    _o.position.add(V3(0.009, 0.005, 0.004)); _o.scale.setScalar(C.s < Math.min(1, cort) * 0.75 ? 1 : 0.0001); _o.updateMatrix(); corM.setMatrixAt(i, _o.matrix); }); cellM.instanceMatrix.needsUpdate = corM.instanceMatrix.needsUpdate = true; }
