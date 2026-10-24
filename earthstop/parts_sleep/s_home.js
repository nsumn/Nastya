// =================== APARTMENT (meters): bedroom on the left, kitchen corner on the right ===================
const home = new THREE.Scene(); const hCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);
const hemiH = new THREE.HemisphereLight(0xe0e8ff, 0x403a48, 0.5); home.add(hemiH);
const moonH = new THREE.DirectionalLight(0x8aa0e0, 1.6); moonH.position.set(-1.6, 3.5, -6); moonH.castShadow = true; moonH.shadow.mapSize.set(1024, 1024); Object.assign(moonH.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); home.add(moonH, moonH.target);
const sunH = new THREE.DirectionalLight(0xffe0b0, 0); sunH.position.set(-1.0, 3.0, -6); sunH.castShadow = true; sunH.shadow.mapSize.set(1024, 1024); Object.assign(sunH.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); home.add(sunH, sunH.target);
const fillH = new THREE.PointLight(0xffd8b8, 3, 8, 1.6); fillH.position.set(1.0, 2.0, 2.2); home.add(fillH);
const clockL = new THREE.PointLight(0x7affb0, 0.3, 1.1, 1.5); clockL.position.set(-0.35, 0.75, -2.0); home.add(clockL);
const fridgeLH = new THREE.PointLight(0xdfefff, 0, 4, 1.4); fridgeLH.position.set(2.5, 1.2, -1.2); home.add(fridgeLH);
{ const tile = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8b49a'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = pick(['#c2ae94', '#cdb9a0', '#bfa98e']); g.fillRect(x + 2, y + 2, 60, 60); } }, [4, 4]);
  const fl = mesh(new THREE.PlaneGeometry(7, 6), M('#ffffff', { map: tile, roughness: 0.8 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0.3, 0, -0.5); home.add(fl);
  bx(7, 3, 0.1, '#5a8a8e', 0.3, 1.5, -2.6, home); bx(0.1, 3, 6, '#4f7e82', -3.1, 1.5, -0.5, home); bx(0.1, 3, 6, '#e8dccb', 3.4, 1.5, -0.5, home); bx(7, 0.1, 6, '#f0ece4', 0.3, 3.0, -0.5, home);
  bx(3.4, 3, 0.09, '#f0e6d4', 2.0, 1.5, -2.55, home); }   // kitchen wall
const winH = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.16, 0.35) })); winH.position.set(-1.7, 1.9, -2.54); home.add(winH);
const BLINDS = []; for (let k = 0; k < 10; k++) { const b = bx(1.7, 0.1, 0.02, '#e8e4dc', -1.7, 2.45 - k * 0.12, -2.5, home); b.rotation.x = 0.6; BLINDS.push(b); }
// bed with a duvet, pillows; nightstand + digital alarm clock (canvas), lamp; a plant
bx(1.7, 0.32, 2.2, '#6a4a34', -1.7, 0.16, -1.45, home); bx(1.62, 0.22, 2.1, '#f2f0ec', -1.7, 0.43, -1.45, home); bx(1.75, 0.9, 0.1, '#6a4a34', -1.7, 0.7, -2.55, home);
for (const sx of [-0.4, 0.4]) bx(0.65, 0.16, 0.38, '#ffffff', -1.7 + sx, 0.62, -2.2, home);
const duvet = bx(1.7, 0.12, 1.45, '#f2b84a', -1.7, 0.6, -1.0, home);
bx(0.5, 0.55, 0.45, '#8a6a4e', -0.45, 0.275, -2.25, home); bx(0.36, 0.14, 0.12, '#1a1a1e', -0.42, 0.62, -2.15, home);
const ckCv = document.createElement('canvas'); ckCv.width = 256; ckCv.height = 96; const ckTex = new THREE.CanvasTexture(ckCv); ckTex.colorSpace = THREE.SRGBColorSpace;
const ckFace = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.12), new THREE.MeshBasicMaterial({ map: ckTex, color: new THREE.Color(1.8, 1.8, 1.8) })); ckFace.position.set(-0.42, 0.62, -2.088); home.add(ckFace);
function drawAlarm(txt, col = '#3aff8a') { const g = ckCv.getContext('2d'); g.fillStyle = '#060806'; g.fillRect(0, 0, 256, 96); g.fillStyle = col; g.textAlign = 'center'; const al = txt.startsWith('ALARM'); if (al) { g.font = 'bold 22px Inter, sans-serif'; g.fillText('ALARM', 128, 24); txt = txt.slice(6); } g.font = `bold ${al ? 60 : 74}px "JetBrains Mono", monospace`; g.fillText(txt, 128, al ? 86 : 74); ckTex.needsUpdate = true; }
{ const pot = mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 10), M('#c86a4a')); pot.position.set(-2.8, 0.15, -0.3); home.add(pot); for (let k = 0; k < 7; k++) { const lf = mesh(new THREE.ConeGeometry(0.06, 0.6, 4), M('#4a9a5a')); lf.position.set(-2.8 + Math.cos(k) * 0.08, 0.55, -0.3 + Math.sin(k) * 0.08); lf.rotation.set(Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5); home.add(lf); } }
// kitchen: counter, fridge (door swings), mugs that pile up, snacks
bx(2.2, 0.9, 0.62, '#f4f0e8', 1.7, 0.45, -2.2, home); bx(2.2, 0.05, 0.64, '#3a3e46', 1.7, 0.92, -2.2, home);
const fridgeH = new THREE.Group(); fridgeH.position.set(3.05, 0, -1.6); fridgeH.rotation.y = -Math.PI / 2; home.add(fridgeH); bx(0.75, 1.9, 0.68, '#dfe4ea', 0, 0.95, 0, fridgeH, { roughness: 0.3 });
const fDoorH = new THREE.Group(); fDoorH.position.set(-0.375, 0, 0.35); fridgeH.add(fDoorH); bx(0.75, 1.9, 0.05, '#e8ecf2', 0.375, 0.95, 0, fDoorH, { roughness: 0.3 }); bx(0.03, 0.5, 0.04, '#8a9098', 0.66, 1.1, 0.04, fDoorH);
const MUGS = []; for (let k = 0; k < 3; k++) { const g = new THREE.Group(); const m = mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.11, 12), M(['#e8584a', '#3a7ac8', '#f2c84a'][k])); m.position.y = 0.055; g.add(m); const hd = mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 12), M(['#e8584a', '#3a7ac8', '#f2c84a'][k])); hd.position.set(0.065, 0.06, 0); g.add(hd); g.position.set(1.1 + k * 0.2, 0.945, -2.05); home.add(g); MUGS.push(g); }
const SNK = []; for (let i = 0; i < 22; i++) { const g = new THREE.Group(); const c = pick(['#e2b33a', '#d8442e', '#3a7ac8', '#f08a2a', '#6ab04a', '#c24a8a']); if (rnd() < 0.5) bx(R(0.14, 0.22), R(0.18, 0.26), 0.05, c, 0, 0, 0, g); else { const m = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 10), M(c)); g.add(m); }
  g.position.set(1.5 + R(-0.6, 0.6), 1.02 + Math.floor(i / 8) * 0.07, -2.15 + R(-0.18, 0.18)); g.rotation.set(R(-0.4, 0.4), R(0, 6), R(-1, 1)); home.add(g); SNK.push({ g, at: SNACK + 0.8 + i * 0.22 }); }
const me = makePerson(rnd, { top: '#f2c84a', bottom: '#3a4a6a', hair: '#2a1d16', skin: '#d8a07a', dress: false, shorts: false, longSleeve: false, cap: false, hairStyle: 0.3 }); home.add(me.outer);
const steamH = makeSmoke(home, 200); const _hv = new THREE.Vector3();
function lightHome(t) { const dk = t < SNACK - 0.5 ? smooth(MORN - 0.4, MORN + 1.8, t) : smooth(FIX - 0.45, FIX + 0.6, t), bright = t >= FIX - 0.45 ? 1.3 : 0.9;   // dawn behind the alarm; night raid; rested morning
  hemiH.intensity = lerp(0.42, 0.9 * bright, dk); moonH.intensity = 2.2 * (1 - dk); sunH.intensity = 3.0 * bright * dk; fillH.intensity = lerp(1.4, t >= FIX - 0.45 ? 6 : 3, dk);
  winH.material.color.setRGB(lerp(0.12, 1.6 * bright, dk), lerp(0.16, 1.4 * bright, dk), lerp(0.35, 1.0 * bright, dk)); BLINDS.forEach(b => b.rotation.x = lerp(0.6, 1.2, dk)); clockL.intensity = lerp(0.3, 0.1, dk);
  const open = fadeWin(t, SNACK + 0.3, COLD - 0.2, 0.5); fDoorH.rotation.y = -1.9 * open; fridgeLH.intensity = 3 * open; }
function updateHome(t) { lightHome(t); const o = me.outer, P = me; o.rotation.set(0, 0, 0); o.rotation.order = 'XYZ'; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0);
  if (t < MORN - 0.4) { drawAlarm(t < 2.5 ? '1:00' : 'ALARM 6:00', t < 2.5 ? '#3aff8a' : '#ffb03a'); o.position.set(-1.7, 0.78, -1.35); o.rotation.set(-Math.PI / 2, 0, 0); duvet.position.y = 0.66; }
  else if (t < SNACK - 0.5) { const ring = t < MORN + 2.2; drawAlarm(ring ? (Math.floor(t * 3) % 2 ? '6:00' : '    ') : '6:0' + Math.min(9, Math.floor((t - MORN) * 1.2)), '#ff4a3a');
    if (t < MORN + 3.2) { o.position.set(-1.0, 0.62, -1.35); o.rotation.y = 1.4; poseSit(P); P.root.rotation.x = 0.35; P.arms[0].rotation.x = -2.2 * smooth(MORN + 0.6, MORN + 1.2, t); P.elbows[0].rotation.x = -2.0; }   // sits up, hand on the face
    else { o.position.set(0.75, 0.95, -1.62); o.rotation.y = 0.5; P.arms[1].rotation.x = -1.0 - 0.5 * (0.5 + 0.5 * Math.sin(t * 2)); P.elbows[1].rotation.x = -1.4; P.root.rotation.x = 0.18; } }   // slumped against the counter, coffee in hand
  else if (t < FIX - 0.4) { drawAlarm('2:40'); o.position.set(1.95, 0.95, -1.35); o.rotation.y = Math.PI / 2; P.arms[1].rotation.x = -1.1 + 0.25 * Math.sin(t * 4); P.elbows[1].rotation.x = -2.0; }
  else { drawAlarm('8:00', '#3aff8a'); o.position.set(-0.5, 0.95, -0.4); o.rotation.y = 0.6; const up = smooth(FIX + 0.6, FIX + 1.6, t); P.arms[0].rotation.set(-3.0 * up, 0, 0.3 * up); P.arms[1].rotation.set(-3.0 * up, 0, -0.3 * up); }
  MUGS.forEach((m, k) => m.visible = t > MORN + 3.4 + k * 0.9 && t < SNACK - 0.5); SNK.forEach(S => S.g.visible = t > S.at && t < FIX - 0.4);
  steamH.begin(); smokeMat.uniforms.uTint.value.set('#ffffff'); if (t > MORN + 3.4 && t < SNACK - 0.5) for (let k = 0; k < 30; k++) { const age = (t * 0.5 + k / 30) % 1; const mk = MUGS[k % 3]; if (!mk.visible) continue; _hv.copy(mk.position).add(V3(Math.sin(k * 2.1 + age * 5) * 0.03, 0.12 + age * 0.4, 0)); steamH.add(_hv, 0.02 + age * 0.06, 0.3 * (1 - age)); } steamH.end(); }
function homeCamera(t) { let pos, look, fov = 50;
  if (t < MORN - 0.4) { const k = smooth(0, 3.6, t); pos = V3(0.6, 2.1, 1.2).lerp(V3(0.15, 1.12, -0.8), k); look = V3(-1.4, 0.6, -1.7).lerp(V3(-0.42, 0.66, -2.1), k); fov = lerp(52, 44, k); }
  else if (t < SNACK - 0.5) { const k = ease(clamp((t - MORN - 2.8) / 1.4, 0, 1)); pos = V3(0.4, 1.5, 0.9).lerp(V3(2.2, 1.5, 0.5), k); look = V3(-1.1, 0.9, -1.4).lerp(V3(1.05, 1.15, -1.9), k); }
  else if (t < FIX - 0.4) { pos = V3(2.6, 1.55, 0.4).lerp(V3(2.5, 1.45, 0.0), smooth(SNACK, COLD, t)); look = V3(1.9, 1.15, -1.55); }
  else { pos = V3(1.2, 1.6, 1.6).lerp(V3(0.9, 1.5, 1.2), smooth(FIX, T_END, t)); look = V3(-0.6, 1.2, -1.0); }
  hCam.position.copy(pos); hCam.lookAt(look); hCam.fov = fov; }
