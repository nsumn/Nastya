// =================== THE DRIVER'S SEAT (POV, meters): dashboard, wheel, wipers, the fuel gauge, the dome light, snow piling on the glass, frost, your breath ===================
const cab = new THREE.Scene(); const cbCam = new THREE.PerspectiveCamera(58, W / H, 0.02, 300); cab.fog = new THREE.Fog(0xc9d2dc, 6, 60);
const cbHemi = new THREE.HemisphereLight(0xe8f0ff, 0x6a6a70, 0.9); cab.add(cbHemi);
const cbDome = new THREE.PointLight(0xffd8a0, 0, 2.5, 1.5); cbDome.position.set(0, 1.42, -0.05); cab.add(cbDome);
const cbDash = new THREE.PointLight(0x7ac8ff, 0.12, 0.8, 1.5); cbDash.position.set(0, 1.0, -0.45); cab.add(cbDash);
{ bx(1.7, 0.32, 0.65, '#24262c', 0, 0.82, -0.78, cab, { roughness: 0.7 }); bx(0.6, 0.12, 0.28, '#1a1c22', 0, 1.02, -0.62, cab);
  for (const x of [-0.78, 0.78]) { const p = bx(0.08, 0.7, 0.08, '#2a2c32', x, 1.25, -0.82, cab); p.rotation.x = -0.45; }
  bx(1.7, 0.08, 1.2, '#3a3c42', 0, 1.5, -0.25, cab); bx(0.08, 0.6, 1.6, '#2a2c32', -0.84, 1.15, 0.1, cab); bx(0.08, 0.6, 1.6, '#2a2c32', 0.84, 1.15, 0.1, cab);
  const wheel = mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 28), M('#1a1a1e')); wheel.position.set(0, 0.86, -0.45); wheel.rotation.x = -0.35; cab.add(wheel); bx(0.05, 0.05, 0.3, '#1a1a1e', 0, 0.8, -0.55, cab); }
// outside, seen through the glass: the snowy road, the car ahead with its brake lights, falling snow
{ const gnd = mesh(new THREE.PlaneGeometry(200, 200), M('#eef2f6', { roughness: 1 }), false, true); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.05; cab.add(gnd);
  for (const x of [-5, 5]) { const b = mesh(new THREE.BoxGeometry(3, 1.0, 200), M('#f2f5f8'), false, true); b.position.set(x, 0.4, -80); cab.add(b); } }
const ahead = sedan('#3a6ad0', 1.2); ahead.position.set(0, 0, -12); cab.add(ahead);
const CS_N = 1500; const csGeo = new THREE.BufferGeometry(); const csPos = new Float32Array(CS_N * 3), CS0 = []; for (let i = 0; i < CS_N; i++) CS0.push([R(-6, 6), R(0, 6), R(-20, -1.1), R(0.6, 1.4)]);
csGeo.setAttribute('position', new THREE.BufferAttribute(csPos, 3)); const csPts = new THREE.Points(csGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.04, transparent: true, depthWrite: false })); csPts.frustumCulled = false; cab.add(csPts);
// snow on the windshield (alpha grows), wipers, frost on the side glass
const flakeTex = canvasTex(512, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const x = rnd() * w, y = rnd() * h, r = R(4, 18); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
const wsSnow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.75), new THREE.MeshBasicMaterial({ map: flakeTex, transparent: true, opacity: 0, depthWrite: false, color: new THREE.Color(1.1, 1.1, 1.15) })); wsSnow.position.set(0, 1.2, -0.95); wsSnow.rotation.x = -0.45; cab.add(wsSnow);
const wipers = [-0.35, 0.3].map(x => { const p = grp(x, 0.98, -0.88, 0, cab); bx(0.012, 0.55, 0.012, '#111', 0, 0.27, 0, p); p.rotation.x = -0.45; return p; });
const frostTex = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = rnd() * w, y = rnd() * h; g.strokeStyle = 'rgba(230,240,255,0.55)'; g.lineWidth = R(1, 2.5); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) g.lineTo(x + R(-30, 30), y + R(-30, 30)); g.stroke(); } });
const frostL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false })); frostL.position.set(-0.8, 1.2, 0.05); frostL.rotation.y = Math.PI / 2; cab.add(frostL);
const frostR = frostL.clone(); frostR.material = frostL.material; frostR.position.x = 0.8; frostR.rotation.y = -Math.PI / 2; cab.add(frostR);
const frostW = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.72), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false })); frostW.position.set(0, 1.2, -0.93); frostW.rotation.x = -0.45; cab.add(frostW);
// the fuel gauge (drawn every frame), placed in the cluster
const fgCv = document.createElement('canvas'); fgCv.width = 256; fgCv.height = 256; const fgTex = new THREE.CanvasTexture(fgCv); fgTex.colorSpace = THREE.SRGBColorSpace;
function drawGauge(level) { const g = fgCv.getContext('2d'); g.fillStyle = '#0c0e12'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#e8e8e8'; g.lineWidth = 6; g.beginPath(); g.arc(128, 150, 96, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.fillStyle = '#e8e8e8'; g.font = 'bold 30px Inter, sans-serif'; g.fillText('E', 30, 150); g.fillText('F', 206, 150); g.fillStyle = '#ff9a3a'; g.font = '26px Inter, sans-serif'; g.fillText('⛽', 112, 200);
  const a = Math.PI * (1.15 + 0.7 * level); g.strokeStyle = '#ff5a3a'; g.lineWidth = 7; g.beginPath(); g.moveTo(128, 150); g.lineTo(128 + Math.cos(a) * 86, 150 + Math.sin(a) * 86); g.stroke(); fgTex.needsUpdate = true; }
const gauge = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: fgTex, color: new THREE.Color(1.3, 1.3, 1.3) })); gauge.position.set(0, 1.0, -0.47); gauge.rotation.x = -0.2; cab.add(gauge);
const breath = makeSmoke(cab, 120);
function updateCab(t, mode) { const night = mode === 'cold', dusk = mode === 'fuel';
  const bg = night ? '#121828' : dusk ? '#8a90a8' : '#c9d2dc'; cab.background = new THREE.Color(bg); cab.fog.color.set(bg); cbHemi.intensity = night ? 0.15 : dusk ? 0.5 : 0.9; cbDome.intensity = night ? 1.2 : dusk ? 0.8 : 0;
  tailMats.forEach(m => m.color.setRGB(night || dusk || t < JAM ? 3.0 : 1.2, 0.12, 0.08));
  // driving in: the car ahead brakes and stops; wipers sweep
  ahead.position.z = mode === 'drive' ? lerp(-16, -7, ease(clamp(t / 3.6, 0, 1))) : -7;
  wipers.forEach((w, k) => { w.rotation.z = mode === 'drive' ? (k ? -1 : 1) * (0.2 + 0.9 * (0.5 + 0.5 * Math.sin(t * 5))) : (k ? -0.2 : 0.2); });
  wsSnow.material.opacity = mode === 'drive' ? 0.18 : dusk ? 0.5 : 0.55; frostL.material.opacity = night ? 0.8 * smooth(COLD, COLD + 3, t) : 0; frostW.material.opacity = night ? 0.5 * smooth(COLD + 1, COLD + 4, t) : 0;
  // fuel: one hour of idling vs ten minutes an hour (the needle barely moves in bursts)
  drawGauge(dusk ? (t < FUEL + 3.5 ? lerp(0.85, 0.35, smooth(FUEL + 0.6, FUEL + 3.2, t)) : lerp(0.85, 0.78, smooth(FUEL + 3.8, FUEL + 6.6, t))) : 0.85);
  // breath puffs in the cold
  breath.begin(); smokeMat.uniforms.uTint.value.set('#e8eef8'); if (night) for (let k = 0; k < 40; k++) { const ph = ((t - COLD) / 2.2) % 1, u = (ph + k * 0.004) % 1; if (u > 0.6) continue; breath.add(V3(0.02 * Math.sin(k), 1.1 + u * 0.12, -0.35 - u * 0.5), 0.02 + u * 0.07, 0.5 * (1 - u / 0.6) * smooth(COLD + 0.3, COLD + 1, t)); } breath.end();
  const sp = night ? 1.0 : 1.6; for (let i = 0; i < CS_N; i++) { const [x0, y0, z0, s] = CS0[i]; csPos[i * 3] = x0 + 0.3 * Math.sin(t + i); csPos[i * 3 + 1] = wrapR(y0 - t * sp * s, 0, 6); csPos[i * 3 + 2] = z0; } csGeo.attributes.position.needsUpdate = true; }
function cabCamera(t, mode) { let pos, look, fov = 58;
  if (mode === 'drive') { pos = V3(0.01 * Math.sin(t * 13), 1.27 + 0.006 * Math.sin(t * 17), 0.2); look = V3(0, 1.12, -8); }
  else if (mode === 'fuel') { const k = smooth(FUEL - 0.4, FUEL + 1.2, t); pos = V3(0, lerp(1.27, 1.08, k), lerp(0.2, -0.12, k)); look = V3(0, lerp(1.12, 0.93, k), lerp(-8, -0.47, k)); fov = lerp(58, 44, k); }
  else { const k = smooth(COLD - 0.4, WALK, t); pos = V3(0.02 * Math.sin(t * 9) * smooth(COLD + 3, COLD + 5, t), 1.17, 0.2); look = V3(lerp(-0.2, -0.9, k), 1.12, lerp(-3, -1.5, k)); }
  cbCam.position.copy(pos); cbCam.lookAt(look); cbCam.fov = fov; }
