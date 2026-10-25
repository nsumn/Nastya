// =================== THE INTERSTATE (meters): a snowed-in jam, your car (left lane, z = 0, facing -z), its tailpipe, the night, the whiteout, the plow at dawn.
// One scene, many modes: updateRoad(t, mode) sets light, fog, snowfall and props for that beat; roadCamera(t, mode) frames it ===================
const hw = new THREE.Scene(); const hwCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 600); hw.fog = new THREE.Fog(0xc9d2dc, 15, 140);
const hwHemi = new THREE.HemisphereLight(0xe8f0ff, 0x8a909a, 1.0); hw.add(hwHemi);
const hwSun = new THREE.DirectionalLight(0xf0f4ff, 0.8); hwSun.position.set(-20, 30, 15); hwSun.castShadow = true; hwSun.shadow.mapSize.set(2048, 2048); hwSun.shadow.bias = -0.0005; Object.assign(hwSun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 120 }); hw.add(hwSun, hwSun.target);
const domeL = new THREE.PointLight(0xffd090, 0, 4, 1.4); domeL.position.set(-2, 1.3, 0); hw.add(domeL);
const beaconL = new THREE.PointLight(0xff9a20, 0, 30, 1.2); hw.add(beaconL);
{ const snowTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#eef2f6'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#e2e8ee', '#f6f9fb', '#dfe5ec'], 4); }, [40, 40]);
  const gnd = mesh(new THREE.PlaneGeometry(600, 600), M('#ffffff', { map: snowTex, roughness: 0.9 }), false, true); gnd.rotation.x = -Math.PI / 2; hw.add(gnd);
  const road = mesh(new THREE.PlaneGeometry(9, 600), M('#d4d9e0', { roughness: 0.8 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -250); hw.add(road);
  for (const x of [-2.35, -1.65, 1.65, 2.35]) { const tr = mesh(new THREE.PlaneGeometry(0.28, 600), M('#a8b0ba', { roughness: 0.9 }), false, true); tr.rotation.x = -Math.PI / 2; tr.position.set(x, 0.015, -250); hw.add(tr); }
  for (const x of [-6, 6]) { const bank = mesh(new THREE.BoxGeometry(3, 1.1, 600), M('#f2f5f8', { roughness: 1 }), true, true); bank.position.set(x, 0.4, -250); hw.add(bank); }
  for (let i = 0; i < 140; i++) { const sx = pick([-1, 1]), x = sx * R(10, 40), z = R(-300, 30), hgt = R(4, 9); const tr = mesh(new THREE.ConeGeometry(hgt * 0.32, hgt, 7), M(pick(['#2a4a36', '#30503a', '#26422f']), { flatShading: true })); tr.position.set(x, hgt / 2, z); hw.add(tr);
    const cap = mesh(new THREE.ConeGeometry(hgt * 0.17, hgt * 0.35, 7), M('#f4f8fb', { flatShading: true })); cap.position.set(x, hgt * 0.86, z); hw.add(cap); } }
// cars: a body, dark glass cabin, snow on the roof and hood, red tail lights (they glow at night)
const tailMats = [];
function sedan(color, snowAmt = 1) { const g = new THREE.Group(); bx(1.85, 0.7, 4.5, color, 0, 0.6, 0, g); const glass = bx(1.6, 0.55, 2.4, '#2a3240', 0, 1.22, -0.1, g, { roughness: 0.2, metalness: 0.3 });
  bx(1.62, 0.14 * snowAmt, 2.3, '#f4f8fb', 0, 1.56, -0.1, g); bx(1.8, 0.1 * snowAmt, 1.2, '#f4f8fb', 0, 1.0, -1.6, g); bx(1.8, 0.1 * snowAmt, 0.9, '#f4f8fb', 0, 1.0, 1.75, g);
  const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.08, 0.06) }); tailMats.push(tm); for (const x of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.04), tm); l.position.set(x, 0.78, 2.26); g.add(l); }
  for (const [x, z] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) { const w = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12), M('#151518')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.33, z); g.add(w); }
  g.userData.glass = glass; return g; }
const myCar = sedan('#c8302a', 1.4); myCar.position.set(-2, 0, 0); hw.add(myCar);
{ const pipe = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 10), M('#6a6a70', { metalness: 0.6, roughness: 0.4 })); pipe.rotation.x = Math.PI / 2; pipe.position.set(0.55, 0.3, 2.3); myCar.add(pipe);
  const ant = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 6), M('#2a2a30')); ant.position.set(0.5, 1.95, 0.9); myCar.add(ant); }
const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2, 6, 2), new THREE.MeshStandardMaterial({ color: '#e0202a', side: THREE.DoubleSide, emissive: '#3a0606' })); cloth.position.set(0.5 + 0.17, 2.18, 0.9); myCar.add(cloth);
const winPane = bx(0.03, 0.42, 0.9, '#2a3240', -0.81, 1.2, 0.3, myCar, { roughness: 0.15, metalness: 0.3 });   // the driver's window (it gets cracked open)
const pile = mesh(new THREE.SphereGeometry(1, 16, 10), M('#f4f8fb', { roughness: 1 })); hw.add(pile);
const JAMCARS = []; for (const lane of [-2, 2]) for (let k = 0; k < 40; k++) { const z = 7.5 - k * 7.6 + (lane > 0 ? 3 : 0); if (lane < 0 && Math.abs(z) < 3) continue; const c = sedan(pick(['#3a6ad0', '#e8e8e8', '#2a2a30', '#8a8a92', '#4a6a3a', '#d8a030', '#6a2a3a']), R(0.8, 1.5)); c.position.set(lane + R(-0.15, 0.15), 0, z); c.rotation.y = R(-0.04, 0.04); hw.add(c); JAMCARS.push(c); }
// the plow (dawn): yellow truck with a blade and an orange beacon
const plow = new THREE.Group(); hw.add(plow); { bx(2.5, 2.6, 6, '#e8b020', 0, 1.6, 0, plow); bx(2.4, 1.3, 2, '#e8b020', 0, 2.2, -3.4, plow); bx(3.6, 1.1, 0.25, '#5a5a62', 0, 0.6, -4.8, plow).rotation.y = 0.35; }
const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.2) })); beacon.position.set(0, 3.05, -3.0); plow.add(beacon);
// the hero, out in the snow to clear the pipe
const meS = makePerson(rnd, { top: '#2a4a8a', bottom: '#2a2a30', hair: '#3a2a1a', skin: '#e0b896', shoe: '#1a1a1a', dress: false, shorts: false, longSleeve: true, cap: true, hairStyle: 0.3 }); hw.add(meS.outer);
// snowfall: points that fall and drift; and the gas (carbon monoxide in grey, normal exhaust in white)
const SN_N = 4000; const snGeo = new THREE.BufferGeometry(); const snPos = new Float32Array(SN_N * 3), SN0 = []; for (let i = 0; i < SN_N; i++) SN0.push([R(-14, 14), R(0, 12), R(-40, 12), R(0.6, 1.4)]);
snGeo.setAttribute('position', new THREE.BufferAttribute(snPos, 3)); const snowPts = new THREE.Points(snGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.07, transparent: true, opacity: 0.95, depthWrite: false })); snowPts.frustumCulled = false; hw.add(snowPts);
const gasS = makeSmoke(hw, 260); const _sv = new THREE.Vector3();
const pileAt = t => t < CLEAR + 1.0 ? lerp(0.15, 1.0, smooth(PIPE - 0.5, PIPE + 4.0, t)) : lerp(1.0, 0.12, smooth(CLEAR + 1.0, CLEAR + 3.0, t));
function updateRoad(t, mode) { const night = mode === 'night', white = mode === 'whiteout', dawn = mode === 'dawn';
  const bg = night ? '#141a2a' : white ? '#e6ecf2' : dawn ? '#d9c6d4' : mode === 'jam' ? '#c9d2dc' : '#b8c2ce'; hw.background = new THREE.Color(bg); hw.fog.color.set(bg);
  hw.fog.near = white ? 1.5 : night ? 6 : 14; hw.fog.far = white ? 20 : night ? 55 : dawn ? 170 : 130;
  hwHemi.intensity = night ? 0.3 : white ? 1.25 : dawn ? 0.9 : 1.0; hwHemi.color.set(dawn ? '#ffe0e8' : '#e8f0ff'); hwSun.intensity = night ? 0 : dawn ? 1.3 : 0.7; hwSun.color.set(dawn ? '#ffc8a0' : '#f0f4ff');
  tailMats.forEach(m => m.color.setRGB(night ? 3.0 : 1.2, night ? 0.15 : 0.08, night ? 0.1 : 0.06));
  domeL.intensity = night ? 2.5 : 0; myCar.userData.glass.material = night ? M('#6a5030', { emissive: '#5a3a10', roughness: 0.3 }) : M('#2a3240', { roughness: 0.2, metalness: 0.3 });
  cloth.visible = night || dawn || white; const pos = cloth.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const x = (i % 7) / 6; pos.setZ(i, 0.05 * Math.sin(t * 9 + x * 6) * x); } pos.needsUpdate = true;
  // the snow pile behind the tailpipe grows, then gets cleared; the window gets cracked
  const p = pileAt(t); pile.position.set(-1.45, 0.12 * p, 2.75); pile.scale.set(0.34 * p + 0.04, 0.3 * p + 0.04, 0.38 * p + 0.04); winPane.position.y = 1.2 - 0.09 * smooth(CLEAR + 3.4, CLEAR + 4.2, t);
  // the hero clears it (clear mode only)
  meS.outer.visible = mode === 'clear'; if (mode === 'clear') { const P = meS; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.outer.position.set(-0.95, 0.55, 3.25); P.outer.rotation.y = -2.4; P.legs[0].rotation.x = -1.3; P.legs[1].rotation.x = -0.7; P.knees[0].rotation.x = 1.9; P.knees[1].rotation.x = 1.2; P.root.rotation.x = 0.35;
    const sweep = fadeWin(t, CLEAR + 0.6, CLEAR + 3.2, 0.3); P.arms[1].rotation.x = -1.2 - 0.25 * sweep; P.arms[1].rotation.z = -0.6 * Math.sin(t * 7) * sweep; P.arms[0].rotation.x = -0.6; if (t > CLEAR + 3.4) { P.outer.position.set(-0.95, 0.95, 3.0); P.legs.forEach(l => l.rotation.x = 0); P.knees.forEach(k => k.rotation.x = 0); P.root.rotation.x = 0; } }
  // gas: grey CO creeping up into the car while the pipe is blocked; white exhaust drifting away once it is clear and the engine runs
  gasS.begin(); const blocked = smooth(PIPE + 2.0, PIPE + 4.0, t) * (1 - smooth(CLEAR + 2.2, CLEAR + 3.0, t)), clean = smooth(CLEAR + 3.0, CLEAR + 3.6, t) * (mode === 'clear' || mode === 'night' ? 1 : 0) * (t < FUEL || mode === 'night' ? 1 : 0);
  if (blocked > 0.01) { smokeMat.uniforms.uTint.value.set('#6a6e78'); for (let k = 0; k < 120; k++) { const u = (t * 0.25 + k / 120) % 1; _sv.set(-1.45 + 0.4 * Math.sin(k * 1.7 + t), 0.35 + u * 1.2, 2.5 - u * 1.6 + 0.2 * Math.cos(k)); gasS.add(_sv, 0.35 + u * 0.6, 0.35 * blocked * Math.sin(Math.PI * u)); } }
  else if (clean > 0.01) { smokeMat.uniforms.uTint.value.set('#f4f6f8'); for (let k = 0; k < 60; k++) { const u = (t * 0.5 + k / 60) % 1; _sv.set(-1.45 + 0.3 * Math.sin(k), 0.35 + u * 0.8, 2.5 + u * 3.0); gasS.add(_sv, 0.3 + u * 0.8, 0.3 * clean * (1 - u)); } }
  gasS.end();
  // the plow arrives at dawn, beacon flashing
  plow.visible = dawn; const pz = lerp(-140, -16, ease(clamp((t - DAWN) / 6, 0, 1))); plow.position.set(4.2, 0, pz); plow.rotation.y = Math.PI; const fl = Math.sin(t * 12) > 0 ? 1 : 0.2; beacon.material.color.setRGB(3 * fl, 1.2 * fl, 0.2 * fl); beaconL.position.set(4.2, 3.3, pz + 3); beaconL.intensity = dawn ? 20 * fl : 0;
  // snowfall: heavy in the whiteout, wind-driven
  const sp = white ? 3.2 : night ? 1.2 : 1.6, wind = white ? 2.5 : 0.5; for (let i = 0; i < SN_N; i++) { const [x0, y0, z0, s] = SN0[i]; snPos[i * 3] = wrapR(x0 + t * wind * s, -14, 14); snPos[i * 3 + 1] = wrapR(y0 - t * sp * s, 0, 12); snPos[i * 3 + 2] = z0; } snGeo.attributes.position.needsUpdate = true;
  snowPts.material.size = white ? 0.11 : 0.07; }
function roadCamera(t, mode) { let pos, look, fov = 50;
  if (mode === 'jam') { const k = smooth(JAM - 0.5, PIPE + 0.5, t); pos = V3(lerp(7, 5, k), lerp(7.5, 5.5, k), lerp(16, 11, k)); look = V3(-1, 0.5, -36); }
  else if (mode === 'pipe') { const k = smooth(PIPE - 0.5, CLEAR + 0.5, t); pos = V3(lerp(-0.4, -0.8, k), lerp(1.0, 0.8, k), lerp(6.6, 5.4, k)); look = V3(-1.5, 0.5, 1.8); }
  else if (mode === 'clear') { const k = smooth(CLEAR - 0.5, FUEL + 0.5, t); pos = V3(lerp(0.4, 0.8, k), lerp(1.3, 1.5, k), lerp(5.6, 6.2, k)); look = V3(-1.6, 0.8, 1.4); }
  else if (mode === 'night') { const k = smooth(NIGHT - 0.5, COLD + 0.5, t); pos = V3(lerp(-0.2, -0.6, k), lerp(2.6, 2.4, k), lerp(4.0, 3.2, k)); look = V3(-1.9, 1.5, 0.6); }
  else if (mode === 'whiteout') { const k = smooth(WALK - 0.5, DAWN + 0.5, t); pos = V3(-3.3, 1.6, lerp(0.8, -1.2, k)); look = V3(-3.6, 1.4, -20); }
  else { const k = smooth(DAWN - 0.5, T_END, t); pos = V3(lerp(1.2, 0.8, k), lerp(3.4, 3.0, k), lerp(9.5, 7.5, k)); look = V3(1.5, 1.2, -24); }
  hwCam.position.copy(pos); hwCam.lookAt(look); hwCam.fov = fov; }
