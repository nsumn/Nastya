// =================== BEDROOM (meters), night / dawn: bed, nightstand, the phone, a window onto the city ===================
const bed = new THREE.Scene(); bed.background = new THREE.Color('#0b1020');
const bCam = new THREE.PerspectiveCamera(50, W / H, 0.01, 200);
const bHemi = new THREE.HemisphereLight(0x8fa6e0, 0x2a2438, 0.55); bed.add(bHemi);
const moon = new THREE.DirectionalLight(0xa9bbff, 1.6); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 20 }); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.01; moon.shadow.radius = 4;
moon.position.set(1.6, 3.2, -4.0); moon.target.position.set(-0.3, 0.4, 0.3); bed.add(moon, moon.target);
const bFill = new THREE.DirectionalLight(0x8090c0, 0.35); bFill.position.set(-2, 2, 3); bed.add(bFill);
const screenLight = new THREE.PointLight(0xcfe0ff, 0, 2.2, 1.6); bed.add(screenLight);
const bedProps = {};
{
  const planks = canvasTex(512, 512, (g, w, h) => { for (let r = 0; r < 8; r++) { let x = (r % 2) * -90; while (x < w) { const L = R(120, 260); g.fillStyle = pick(['#8a6444', '#94704c', '#7d5a3e', '#8e6848']); g.fillRect(x, r * 64, L - 3, 61); x += L; } } }, [3, 3]);
  const floor = mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.6 }), false, true); floor.rotation.x = -Math.PI / 2; floor.position.set(-0.5, 0, 2.5); bed.add(floor);
  const og = mesh(new THREE.PlaneGeometry(80, 40), M('#1c1a28'), false, false); og.rotation.x = -Math.PI / 2; og.position.set(0, -4.2, -20); bed.add(og);
  const wallM = M('#7a86a8', { roughness: 0.95 }); bedProps.wallM = wallM;
  const wall = (w, h, x, y, z, ry) => { const m = mesh(new THREE.PlaneGeometry(w, h), wallM, false, true); m.position.set(x, y, z); m.rotation.y = ry; bed.add(m); return m; };
  const BZ = -0.5, WX0 = 0.45, WX1 = 1.45, WY0 = 0.85, WY1 = 2.15;
  wall(WX0 + 3.5, 2.6, (WX0 - 3.5) / 2, 1.3, BZ, 0); wall(3.5 - WX1, 2.6, (WX1 + 3.5) / 2, 1.3, BZ, 0); wall(WX1 - WX0, WY0, (WX0 + WX1) / 2, WY0 / 2, BZ, 0); wall(WX1 - WX0, 2.6 - WY1, (WX0 + WX1) / 2, (WY1 + 2.6) / 2, BZ, 0);
  wall(4, 2.6, 2.2, 1.3, 1.5, -Math.PI / 2); wall(4, 2.6, -3.2, 1.3, 1.5, Math.PI / 2);
  for (const [w, h, x, y] of [[WX1 - WX0 + 0.08, 0.06, (WX0 + WX1) / 2, WY0], [WX1 - WX0 + 0.08, 0.06, (WX0 + WX1) / 2, WY1], [0.06, WY1 - WY0, WX0, (WY0 + WY1) / 2], [0.06, WY1 - WY0, WX1, (WY0 + WY1) / 2], [0.04, WY1 - WY0, (WX0 + WX1) / 2, (WY0 + WY1) / 2]]) bx(w, h, 0.1, '#e8e6ee', x, y, BZ, bed);
  // curtains
  for (const sx of [WX0 - 0.16, WX1 + 0.16]) { const c = bx(0.3, 2.0, 0.06, '#3c4a78', sx, 1.35, BZ + 0.08, bed); }
  // outside: sky (night <-> dawn), skyline with lit windows, the moon
  const skyN = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1440'); gr.addColorStop(1, '#2a3a78'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) g.fillRect(R(0, w), R(0, h * 0.6), 1.5, 1.5); });
  const skyD = canvasTex(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a8ad0'); gr.addColorStop(0.55, '#f0a8a0'); gr.addColorStop(1, '#ffd08a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const skyM = new THREE.MeshBasicMaterial({ map: skyN, fog: false }); const sky = new THREE.Mesh(new THREE.PlaneGeometry(140, 30), skyM); sky.position.set(20, 7, -14); bed.add(sky); bedProps.skyM = skyM; bedProps.skyN = skyN; bedProps.skyD = skyD;
  const moonS = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.0) })); moonS.position.set(3.2, 6.4, -13.9); bed.add(moonS); bedProps.moonS = moonS;
  const sunS = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.0, 1.0) })); sunS.position.set(9.0, 1.4, -13.8); bed.add(sunS); bedProps.sunS = sunS;
  const winE = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 12) for (let x = 4; x < w; x += 10) if (rnd() < 0.3) { g.fillStyle = pick(['#ffd28a', '#ffc070', '#bcd4ff']); g.fillRect(x, y, 6, 7); } });
  bedProps.skyline = [];
  for (let i = 0; i < 18; i++) { const h = R(3, 7.5), w = R(1.2, 2.2); const mt = new THREE.MeshStandardMaterial({ color: '#1a2038', emissive: '#ffffff', emissiveMap: winE, emissiveIntensity: 1.0, roughness: 1 }); const b = mesh(BOX, mt, false, false); b.scale.set(w, h, 1); b.position.set(-6 + i * 2.1 + R(-0.4, 0.4), h / 2 - 4.5, -11 - R(0, 2)); bed.add(b); bedProps.skyline.push(mt); }
  // bed (you are lying in it): headboard against the back wall, mattress, blanket, pillows
  const bd = grp(-1.25, 0, 0.55, 0, bed);
  bx(1.7, 0.32, 2.15, '#5a4030', 0, 0.16, 0, bd); bx(1.66, 0.22, 2.08, '#e8e8f0', 0, 0.42, 0, bd); bx(1.8, 1.05, 0.08, '#5a4030', 0, 0.52, -1.08, bd);
  const blanket = bx(1.74, 0.12, 1.5, '#4a63a8', 0, 0.56, 0.32, bd); bedProps.blanket = blanket;
  bx(1.74, 0.13, 0.25, '#e6e9f4', 0, 0.565, -0.45, bd);
  for (const sx of [-0.42, 0.42]) { const p = bx(0.62, 0.14, 0.38, '#f2f2f8', sx, 0.6, -0.82, bd); p.rotation.x = -0.12; }
  // nightstand + lamp (off) + glass + book
  const ns = grp(0, 0, -0.27, 0, bed); bx(0.5, 0.56, 0.42, '#8a6040', 0, 0.28, 0, ns); bx(0.52, 0.03, 0.44, '#9a6c48', 0, 0.575, 0, ns); bx(0.44, 0.2, 0.01, '#7a5236', 0, 0.38, 0.215, ns);
  const knob = mesh(new THREE.SphereGeometry(0.015, 8, 6), M('#d8c090', { metalness: 0.7, roughness: 0.3 })); knob.position.set(0, 0.38, 0.23); ns.add(knob);
  const lampG = grp(-0.16, 0.59, -0.13, 0, ns); const lb = mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.03, 12), M('#d8d0c0')); lb.position.y = 0.015; lampG.add(lb);
  const lst = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 6), M('#c8b890', { metalness: 0.6 })); lst.position.y = 0.15; lampG.add(lst);
  const shade = mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.13, 14, 1, true), M('#efe4cc', { side: THREE.DoubleSide })); shade.position.y = 0.3; lampG.add(shade);
  const glass = mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14), new THREE.MeshStandardMaterial({ color: '#cfe4ff', transparent: true, opacity: 0.45, roughness: 0.05 })); glass.position.set(0.19, 0.64, -0.03); ns.add(glass);
  
}
// the phone: body + screen (canvas, redrawn each frame) + a hand that taps it
const PH = { w: 0.0716, l: 0.147, sw: 0.066, sl: 0.141, pos: V3(0.03, 0.592, -0.24), yaw: Math.atan2(-0.8, 0.6) };
const phoneRoot = grp(PH.pos.x, PH.pos.y, PH.pos.z, PH.yaw, bed);
const phoneBody = new THREE.Group(); phoneRoot.add(phoneBody);
{ const shp = new THREE.Shape(); const w = PH.w / 2, l = PH.l / 2, r = 0.011; shp.moveTo(-w + r, -l); shp.lineTo(w - r, -l); shp.quadraticCurveTo(w, -l, w, -l + r); shp.lineTo(w, l - r); shp.quadraticCurveTo(w, l, w - r, l); shp.lineTo(-w + r, l); shp.quadraticCurveTo(-w, l, -w, l - r); shp.lineTo(-w, -l + r); shp.quadraticCurveTo(-w, -l, -w + r, -l);
  const g = new THREE.ExtrudeGeometry(shp, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 6 }); g.rotateX(Math.PI / 2); g.translate(0, 0.009, 0);
  const b = mesh(g, M('#1c1d22', { roughness: 0.35, metalness: 0.5 })); phoneBody.add(b); }
const scrCanvas = document.createElement('canvas'); scrCanvas.width = 540; scrCanvas.height = 1154; const scrG = scrCanvas.getContext('2d');
const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false });
const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(PH.sw, PH.sl), scrMat); scrMesh.rotation.x = -Math.PI / 2; scrMesh.position.y = 0.0101; phoneBody.add(scrMesh);
// hand (low-poly), index finger pointing along local -z; it comes from the camera side (+z of the phone)
const hand = new THREE.Group(); phoneRoot.add(hand);
{ const skin = M('#b9845f', { flatShading: true, roughness: 0.9 }); const sl = M('#3a4f86', { flatShading: true });
  const palm = mesh(new THREE.BoxGeometry(0.075, 0.024, 0.085), skin); palm.position.set(0, 0.03, 0.075); hand.add(palm);
  const fing = (x, len, curl) => { const f = mesh(new THREE.CapsuleGeometry(0.0085, len, 3, 6), skin); f.rotation.x = Math.PI / 2 - curl; f.position.set(x, 0.03 - Math.sin(curl) * len * 0.5, 0.032 - Math.cos(curl) * len * 0.5); hand.add(f); return f; };
  fing(-0.024, 0.06, 0.18); fing(-0.004, 0.03, 1.1); fing(0.015, 0.028, 1.15); fing(0.031, 0.024, 1.2);
  const th = mesh(new THREE.CapsuleGeometry(0.009, 0.035, 3, 6), skin); th.rotation.set(Math.PI / 2, 0, -0.9); th.position.set(-0.045, 0.025, 0.07); hand.add(th);
  const wrist = mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.06, 8), skin); wrist.rotation.x = Math.PI / 2; wrist.position.set(0, 0.035, 0.14); hand.add(wrist);
  const sleeve = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.4, 8), sl); sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0.04, 0.36); hand.add(sleeve);
  hand.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
// fingertip of the index finger in hand-local coords (for aiming taps)
const TIP = V3(-0.024, 0.03 - Math.sin(0.18) * 0.075, 0.032 - Math.cos(0.18) * 0.075 - 0.005);
const scrUV = (u, v) => V3((u - 0.5) * PH.sw, 0.0105, (v - 0.5) * PH.sl);
