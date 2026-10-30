// =================== THE STORY on the beat grid: props (bowl, candy pile, trucks, the last kid), shots, captions/HUD, render ===================
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const H_ = p => headOf(p), fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
// ---- you at the door with the candy bowl ----
const HERO_Z = -5.5;
const bowl = new THREE.Group(); { const b = mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#f08a2a', { roughness: 0.6, side: THREE.DoubleSide })); bowl.add(b);
  const cc = ['#e8463a', '#f4c430', '#5a3a2a', '#3a6ad8', '#f4f4f0', '#8a3aa8']; for (let i = 0; i < 26; i++) { const a = hash(i) * 6.28, r = 0.15 * Math.sqrt(hash(i * 1.7)); const c = bx(0.07, 0.022, 0.04, cc[i % 6], Math.cos(a) * r, -0.035 + 0.03 * hash(i * 2.3), Math.sin(a) * r, bowl); c.rotation.set(hash(i * 3) * 0.6, hash(i * 4) * 3, 0); } }
st.add(bowl);
// ---- the last kid: a teenager (14 -> almost 18) in a purple hoodie + vampire cape, taller than you ----
const teen = makeBlock({ head: 'human', body: 'human', skin: '#6b4329', hair: '#080606', hoodie: '#4a2a6a', top: '#4a2a6a', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'bangs', headS: 0.86, h: 1.12 }); st.add(teen.outer);   // looks nothing like you: darker skin, black fringe, purple hoodie
{ const cape = bx(0.5, 0.95, 0.03, M('#8a1020', { roughness: 0.6 }), 0, 1.02, -0.17, teen.torso); const col = bx(0.52, 0.16, 0.06, M('#8a1020'), 0, 1.5, -0.12, teen.torso);
  const pail = new THREE.Group(); pail.add(mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.16, 10), M('#f07a1a'))); teen.elbows[1].add(pail); pail.position.set(0, -0.36, 0.05); }
// ---- candy pile on the lawn (41 million bars, shown as 2,600) ----
const PILE = V3(-2.7, 0, 1.4), CANDY_N = 2600;
const candyIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.05, 0.08), new THREE.MeshStandardMaterial({ roughness: 0.45, flatShading: true }), CANDY_N); candyIM.castShadow = true; candyIM.receiveShadow = true; st.add(candyIM);
const CANDY = []; { const c = new THREE.Color(), cols = ['#e8463a', '#f4c430', '#5a3a2a', '#3a6ad8', '#f4f4f0', '#8a3aa8', '#2a9a5a', '#f08a2a'];
  for (let i = 0; i < CANDY_N; i++) { const u = (i + 0.5) / CANDY_N, r = 1.9 * Math.sqrt(1 - Math.pow(1 - u, 0.8)) * Math.sqrt(hash(i * 1.3)), a = hash(i * 2.9) * 6.283;
    const h = 1.25 * Math.max(0, 1 - r / 1.95) * (0.75 + 0.25 * hash(i * 5.1)) + 0.03; CANDY.push({ x: PILE.x + Math.cos(a) * r, z: PILE.z + Math.sin(a) * r * 0.9, y: h * Math.min(1, 0.25 + u * 1.2), rx: hash(i * 3.7) * 3, ry: hash(i * 4.1) * 6, d: hash(i * 6.1) }); candyIM.setColorAt(i, c.set(cols[i % 8])); }
  CANDY.sort((a, b) => a.y - b.y); }
function updateCandy(t, on) { candyIM.visible = on; if (!on) return; const t0 = P4 - 0.1, t1 = beat(57); let n = 0;
  for (let i = 0; i < CANDY_N; i++) { const C = CANDY[i], ti = lerp(t0, t1, Math.pow(i / CANDY_N, 0.85)) + 0.12 * C.d, k = clamp((t - ti) / 0.45, 0, 1); if (k <= 0) continue;
    _d.position.set(C.x, C.y + 5 * (1 - k * k), C.z); _d.rotation.set(C.rx + (1 - k) * 4, C.ry, 0); _d.scale.setScalar(1); _d.updateMatrix(); candyIM.setMatrixAt(n++, _d.matrix); }
  candyIM.count = n; candyIM.instanceMatrix.needsUpdate = true; }
// ---- 35 semi trucks lined up down the street (1.5 million lb at ~44,000 lb each) ----
const TRUCKS = []; { const side = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#f07a1a'; g.fillRect(0, 92, w, 16); g.fillStyle = '#2a1a3a'; g.font = '700 70px Inter'; g.textAlign = 'center'; g.fillText('CANDY', w / 2, 76); });
  const trailerM = [M('#f6f2ea'), M('#f6f2ea'), M('#f6f2ea'), M('#e8e4dc'), new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 })];
  const tg = new THREE.BoxGeometry(14, 3.6, 2.6); tg.rotateY(Math.PI / 2);
  for (let i = 0; i < 35; i++) { const g = new THREE.Group(); g.position.set(-14 - i * 21, 0, 12.0); g.rotation.y = -Math.PI / 2; st.add(g);
    const tr = new THREE.Mesh(tg, [trailerM[4], trailerM[5], trailerM[0], trailerM[1], trailerM[2], trailerM[3]]); tr.position.set(0, 2.35, -3.0); tr.castShadow = true; g.add(tr);
    const cab = ['#c8302a', '#2a5aa8', '#f0b030', '#3a8a5a'][i % 4]; rb(2.5, 2.4, 3.2, M(cab, { roughness: 0.4, metalness: 0.3 }), 0, 1.75, 5.9, g, 0.2); rb(2.3, 0.9, 0.08, M('#1e2a36', { roughness: 0.1, metalness: 0.5 }), 0, 2.45, 7.52, g, 0.03);
    for (const z of [6.6, 2.4, -6.5, -8.1]) for (const x of [-1.15, 1.15]) { const w = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 10), M('#1c1e24')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); }
    for (const x of [-0.85, 0.85]) { const hl = mesh(new THREE.BoxGeometry(0.4, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: '#fff6d8' })); hl.position.set(x, 1.0, 7.52); g.add(hl); }
    g.visible = false; TRUCKS.push(g); } }
function updateTrucks(t, on) { TRUCKS.forEach((g, i) => { const ti = beat(58) + Math.floor(i / 2) * BP / 4; g.visible = on && t >= ti; if (g.visible) { const k = clamp((t - ti) / 0.25, 0, 1); g.position.y = 9 * (1 - k) * (1 - k); } }); }
// ---- per-frame world state ----
let PORCH_ON = 1;
function lights(on) { porchL.intensity = 9 * on; doorL.intensity = 14 * on; porchLamp.material.emissiveIntensity = 0.6 * on + 0.02; jackMat.emissiveIntensity = 2.4 * on + 0.05; }
const advAt = t => t < beat(31) ? 0 : t < BRK ? (t - beat(31)) / 3 * KID_STEP : t < BLD ? (BRK - beat(31)) / 3 * KID_STEP + Math.pow((t - BRK) / (BLD - BRK), 1.25) * 70 : (BRK - beat(31)) / 3 * KID_STEP + 70 + (t - BLD) / 3 * KID_STEP;
function heroPose(t, how) { const P = hero; poseReset(P, t); place(P, 0, HERO_Z, 0, PORCH_Y);
  P.arms.forEach((a, i) => a.rotation.set(-0.75, 0, i ? 0.22 : -0.22)); P.elbows.forEach(e => e.rotation.x = -0.75);
  let give = 0; if (how === 'give') give = Math.max(0, Math.sin(((t - beat(31)) / 3) * Math.PI * 2)); else if (how === 'fast') give = Math.max(0, Math.sin(t * 14));
  if (give > 0) { P.arms[1].rotation.set(-0.75 - 0.6 * give, 0, 0.1); P.elbows[1].rotation.x = -0.75 + 0.55 * give; }
  P.outer.updateMatrixWorld(true); bowl.visible = how !== 'nobowl'; bowl.position.copy(P.outer.localToWorld(V3(-0.03, 0.12, 0.36))); bowl.rotation.y = 0; }
function update(t, shot) {
  setEnv(0, 0); lights(1); bowl.visible = true; teen.outer.visible = false; zig && (zig.visible = false);
  const tl = t >= BRK && t < BLD;   // time-lapse: 1,424 days at one day per 2 beats … seasons roll through 3.9 years
  if (tl) { const k = (t - BRK) / (BLD - BRK), day = 0.5 - 0.5 * Math.cos((t - BRK) / (2 * BP) * Math.PI * 2); setEnv(day * 0.95, k * 3.9 * 4); }
  heroPose(t, t >= beat(31) && t < BRK ? 'give' : tl ? 'fast' : t >= DROP2 ? 'hold' : 'hold');
  hero.face(t < beat(26) ? 'happy' : t < DROP ? 'surprised' : t < BRK ? 'worried' : tl ? (Math.floor((t - BRK) / BP) % 3 ? 'sleepy' : 'worried') : t < DROP2 ? 'sleepy' : t < beat(110) ? 'surprised' : t < P8 ? 'smirk' : 'proud', t);
  updateCandy(t, t >= P4 && t < BRK); updateTrucks(t, t >= beat(58) && t < BRK);
  // kids
  if (t < beat(26)) hideKids();
  else if (t < DROP) { const w = 42 * (1 - ease(clamp((t - beat(26)) / (beat(31) - beat(26)), 0, 1))); layoutKids(t, { walkIn: w, adv: 0 }); }
  else if (t < BLD) layoutKids(t, { adv: advAt(t), exit: true, moving: tl });
  else if (t < DROP2) { const wave = (i, t0) => t0 + i * 0.0009; const kindAt = (i, tt) => tt >= wave(i, beat(90)) && tt < beat(94) ? 'ghost' : tt >= wave(i, BLD) && tt < beat(94) ? 'witch' : KIDS[i].kind;
    layoutKids(t, { adv: advAt(t), exit: true, kindAt, pop: (i, tt) => tt < beat(94) ? pop(tt, tt >= wave(i, beat(90)) ? wave(i, beat(90)) : wave(i, BLD), 0.25) : 1 }); }
  else if (t < beat(118)) hideKids();
  else layoutKids(t, { path: NEXT, adv: (t - beat(118)) * 1.3 + 2, moving: true, n: 400 });
  // the last kid: walks up to the door, gets told he's too old, leaves
  if (t >= DROP2 - 0.5 && t < beat(118)) { const P = teen; poseReset(P, t); P.outer.visible = true; const z0 = 4.0, z1 = HERO_Z + 0.72;
    if (t < beat(101)) { const k = clamp((t - DROP2 + 0.5) / (beat(101) - DROP2 + 0.5), 0, 1), z = lerp(z0, z1, k); place(P, 0, z, Math.PI, groundAt(0, z)); if (k < 1) poseWalk(P, t * 9, 1); }
    else if (t < P8 + 0.6) { place(P, 0, z1, Math.PI, PORCH_Y); P.arms[1].rotation.set(-0.9, 0, 0); P.elbows[1].rotation.x = -0.5; }
    else { const k = clamp((t - P8 - 0.6) / 3.2, 0, 1), z = lerp(z1, 6, k); place(P, 0.05, z, k > 0.02 ? 0 : Math.PI, groundAt(0, z)); poseWalk(P, t * 7, 0.8); P.torso.rotation.x = 0.25; }
    P.face(t < beat(110) ? 'smirk' : 'sad', t); }
  if (t >= beat(116)) { const k = clamp((t - beat(116)) / 0.12, 0, 1); lights(1 - k); }
  // map
  if (dotPts) { dotMat.uniforms.uT.value = t; dotMat.uniforms.uConv.value = clamp((t - P2) / (beat(26) - P2 - 0.3), 0, 1.6); }
  if (zig) { zig.visible = t >= beat(42) && t < P4; zig.geometry.setDrawRange(0, Math.floor(zigLen * ease(clamp((t - beat(42) - 0.2) / (P4 - beat(42) - 0.7), 0, 1)) / 3) * 3); dotPts.visible = !zig.visible; }
  pin.visible = true; pin.position.copy(HOUSE); pin.children[0].position.y = 18 + 3 * Math.abs(Math.sin(t * Math.PI / BP)); pin.userData.ring.scale.setScalar(1 + 0.6 * ((t / BP) % 1)); pin.userData.ring.material.opacity = 1 - ((t / BP) % 1); }
// ---- shots: [start, scene, camera(t)] — cut on downbeats ----
const AER = (t, a, b, k0, k1) => lerpF(a, b, ease(clamp((t - k0) / (k1 - k0), 0, 1)));
const SHOTS = [
  [0, 'st', t => lerpF(LOOK(7.5, 2.3, 15.5, 0, 1.8, -5), LOOK(5.2, 1.9, 11.0, 0, 1.7, -5), t / P1)],
  [P1, 'st', t => fr(H_(hero), V3(0.35, 0.05, 1), lerp(2.9, 2.6, (t - P1) / (beat(6) - P1)), 0.8)],
  [beat(6), 'st', t => LOOK(2.6 - 0.1 * (t - beat(6)), 0.55, -1.2, 0, 1.3, -5.2, 44)],
  [beat(10), 'map', t => LOOK(0, 2900 - 80 * (t - beat(10)), 1500, 0, 0, 40, 30)],
  [P2, 'map', t => { const k = ease(clamp((t - P2) / (beat(26) - P2), 0, 1)); return LOOK(lerp(0, HOUSE.x * 0.85, k), lerp(2650, 520, k), lerp(1400, HOUSE.z + 300, k), lerp(0, HOUSE.x, k), 0, lerp(40, HOUSE.z, k), 30); }],
  [beat(26), 'st', t => LOOK(1.7, 2.3, -4.0, -0.3, 0.8, 4.5 - 0.4 * (t - beat(26)), 42)],
  [beat(30), 'st', t => LOOK(2.6, 1.15, 12.5 - 0.3 * (t - beat(30)), -0.6, 0.9, 0, 40)],
  [DROP, 'st', t => AER(t, LOOK(2.2, 2.0, 6.0, -2, 1.0, 0, 50), LOOK(45, 120, 70, -160, 0, 9, 42), DROP, beat(37))],
  [beat(38), 'st', t => { const x = -12 - 3.2 * (t - beat(38)); return LOOK(x, 2.1, 5.6, x - 9, 0.7, 9.0, 40); }],
  [beat(42), 'map', t => LOOK(0, 3000 - 40 * (t - beat(42)), 1500, 0, 0, 20, 30)],
  [P4, 'st', t => LOOK(-0.4 - 0.1 * (t - P4), 1.5, 5.4, -2.7, 0.7, 1.3, 42)],
  [beat(54), 'st', t => LOOK(2.6, 3.4, 8.2 + 0.4 * (t - beat(54)), -1.6, 0.9, -1.2, 40)],
  [beat(58), 'st', t => LOOK(12 - 2 * (t - beat(58)), 24, 32, -90, 0, 11, 40)],
  [beat(62), 'st', t => LOOK(-8 - 4 * (t - beat(62)), 3.0, 15.4, -70, 2.0, 11.5, 38)],
  [BRK, 'st', t => LOOK(3.5, 1.75, -2.3, -0.2, 1.2, -4.6, 42)],
  [beat(74), 'st', t => LOOK(5.6, 3.1, 12.5 - 0.15 * (t - beat(74)), -0.5, 1.4, -3, 40)],
  [BLD, 'st', t => LOOK(-14 - 2 * (t - BLD), 3.0, 11.6, -36, 0.5, 8.6, 40)],
  [beat(86), 'st', t => LOOK(-28 - 1.2 * (t - beat(86)), 1.9, 6.4, -36 - 1.2 * (t - beat(86)), 0.8, 9.0, 42)],
  [beat(90), 'st', t => LOOK(-44 - 2.5 * (t - beat(90)), 3.0, 11.6, -66, 0.5, 8.6, 40)],
  [beat(94), 'st', t => { const k = clamp((t - beat(94)) / (DROP2 - beat(94)), 0, 1), x = -60 - 2700 * Math.pow(k, 2.2); return LOOK(x, 3.2 + 2 * k, 5.6, x - 22, 0.8, 9, 44); }],
  [DROP2, 'st', t => LOOK(2.8, 1.9, -1.4, 0, 1.5, -4.4 + 0.25 * (t - DROP2), 42)],
  [beat(102), 'st', t => fr(H_(teen), V3(1, 0.08, -0.62), lerp(1.55, 1.4, (t - beat(102)) / 1.8), 0.6)],
  [beat(106), 'st', t => LOOK(3.6, 1.75, -5.0, 0, 1.75, -5.15, 36)],
  [beat(110), 'st', t => fr(H_(hero), V3(0.85, 0.08, 0.55), 1.55, 0.6)],
  [P8, 'st', t => LOOK(4.8, 2.1, 11.5 - 0.3 * (t - P8), 0, 1.6, -4, 40)],
  [beat(118), 'st', t => LOOK(9 + 0.6 * (t - beat(118)), 21, 24, -7, 0, -1, 40)],
  [ENDC, 'st', t => LOOK(9 + 0.6 * (t - beat(118)), 21, 24, -7, 0, -1, 40)]];
// ambient occlusion like the groceries set; aerial shots skip it (far geometry) and push the fog out
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const gtao = new GTAOPass(st, stCam, W / 2, H / 2); gtao.renderToScreen = false; gtao.blendIntensity = 1.0;
gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, sc, cf] = SHOTS[i]; update(t, i); const F = cf(t);
  if (sc === 'map') { applyF(mapCam, F); dotMat.uniforms.uSize.value = 5; shootTo(rt, mapScene, mapCam); return; }
  applyF(stCam, F); const far = F.pos.y > 7 || F.pos.x < -40; camKey.intensity = F.pos.x < -10 ? 6 : 0.9; camKey.distance = F.pos.x < -10 ? 40 : 7; stCam.near = far ? 0.5 : 0.08; stCam.far = 6000; st.fog.near = far ? 60 : 35; st.fog.far = far ? 1400 : 220;
  if (far) { shootTo(rt, st, stCam); return; } shootTo(RTS, st, stCam); gtao.render(renderer, rt, RTS); }
// ---- DOM: title, captions (pop on the beat), HUD counters, map labels, end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[beat(10), beat(14), 'Normally, <b>41 million</b> kids…'], [beat(14), P2, '…spread out over <b>127 million</b> homes.'], [P2, beat(26), 'Tonight, every single one picks <span class="hl">your</span> house.'],
  [DROP, beat(42), 'The line is <b>15,500 miles</b> long.'], [beat(42), P4, 'That’s New York to LA… <b>5 times.</b>'],
  [P4, beat(58), 'One fun-size bar each = <b>41 million</b> bars.'], [beat(58), BRK, '<b>1.5 million lb</b> of candy. About <b>35 semi trucks.</b>'],
  [BRK, beat(74), 'At 3 seconds per kid…'], [beat(74), BLD, '…you’re at the door for <b>3.9 years.</b> Nonstop.'],
  [BLD, beat(90), '<b>1.7 million</b> witches.'], [beat(90), beat(94), '<b>1.6 million</b> ghosts.'], [beat(94), DROP2, 'And the last kid in line…'],
  [DROP2, beat(102), '…rings your bell in <b>2030.</b>'], [beat(102), beat(106), 'He was 14 when he got in line.'], [beat(106), beat(110), 'Now he’s almost 18.'], [beat(110), P8, 'Too old for candy.'],
  [P8, beat(118), 'Next year: porch light <b>OFF.</b>'], [beat(118), ENDC, 'Sorry, kids.']];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function hudAt(t) {
  const cnt = (a, b, v0, v1, f = x => x) => f(lerp(v0, v1, ease(clamp((t - a) / (b - a), 0, 1))));
  if (t >= beat(26) && t < DROP) return ['KIDS AT YOUR DOOR', fmt(Math.exp(cnt(beat(26), DROP - 0.1, 0, Math.log(41e6)))), 'U.S. CENSUS: AGES 5–14'];
  if (t >= DROP && t < beat(42)) return ['LINE LENGTH', fmt(cnt(DROP, beat(40), 0, 15530)) + ' mi', 'MODEL: 2 FT PER KID'];
  if (t >= P4 && t < beat(58)) return ['CANDY', fmt(cnt(P4, beat(57), 0, 41e6)) + ' bars', 'MODEL: 1 FUN-SIZE BAR PER KID'];
  if (t >= beat(58) && t < BRK) return ['SEMI TRUCKS', fmt(cnt(beat(58), beat(58) + 17 * BP / 4 + 0.2, 1, 35, Math.floor)), '≈1.5 MILLION LB · ~44,000 LB PER TRUCK'];
  if (t >= BRK && t < BLD) { const k = clamp((t - BRK) / (BLD - BRK - 0.3), 0, 1), days = 1 + k * 1423, m = 10 + Math.floor(days / 30.44); return ['DAY ' + fmt(days), `${MON[m % 12]} ${2026 + Math.floor(m / 12)}`, 'MODEL: 3 SECONDS PER KID, NO SLEEP']; }
  if (t >= DROP2 && t < beat(102)) return ['', 'SEP 2030', ''];
  return null; }
function labelsAt(t, shot) { if (SHOTS[shot][1] !== 'map') return ''; mapCam.updateMatrixWorld(); const out = [];
  const tag = (p, txt, dy = 30) => { const v = p.clone().setY(30).project(mapCam); out.push(`<div class="lb" style="left:${clamp((v.x + 1) / 2 * W, 190, 890).toFixed(0)}px;top:${((1 - v.y) / 2 * H - dy).toFixed(0)}px">${txt}</div>`); };
  if (t < beat(42)) tag(HOUSE, 'YOUR HOUSE', 46); else { tag(NYC, 'NEW YORK'); tag(LA, 'LOS ANGELES'); } return out.join(''); }
function updateDOM(t, shot) {
  const ti = fadeWin(t, 0, beat(10), 0.25); el.title.style.opacity = ti;
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = h[0] ? '<b></b>' + h[0] : ''; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.labels.innerHTML = labelsAt(t, shot);
  const e = smooth(ENDC, ENDC + 0.35, t); el.end.style.opacity = e * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(beat(124), beat(124) + 0.3, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  stCam.updateMatrixWorld(); shoot(i, t, RTA); compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildMap();
  for (const p of [hero, teen]) for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(p.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
