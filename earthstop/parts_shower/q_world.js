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
const _o = new THREE.Object3D(), _c = new THREE.Color();
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
// ---- your hair goes greasy (the same material, wetter and darker), stink lines, flies, the dark patches on your neck ----
let hairMat = null; hero.torso.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '4a3020') hairMat = o.material; });
const HAIR0 = hairMat ? { c: hairMat.color.clone(), r: hairMat.roughness } : null;
function greasy(k) { if (!hairMat) return; hairMat.color.copy(HAIR0.c).lerp(new THREE.Color('#2a1a0e'), k); hairMat.roughness = lerp(HAIR0.r, 0.18, k); hairMat.metalness = 0.35 * k; }
const stinkTex = canvasTex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(150,200,60,0.95)'; g.lineWidth = 9; g.lineCap = 'round'; for (const x of [34, 64, 94]) { g.beginPath(); for (let y = 240; y > 16; y -= 4) g.lineTo(x + 12 * Math.sin(y * 0.06 + x), y); g.stroke(); } });
const STINK = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: stinkTex, transparent: true, depthWrite: false })); s.renderOrder = 6; return s; });
function stinkAt(scene, pos, t, n, size = 0.35, k = 1) { for (let i = 0; i < STINK.length; i++) { const s = STINK[i]; if (i >= n || k <= 0) { s.visible = false; continue; } if (s.parent !== scene) scene.add(s);
    const u = ((t * 0.6 + i / n) % 1), a = i * 2.4; s.visible = true; s.position.copy(pos).add(V3(Math.cos(a) * 0.18, 0.1 + 0.45 * u, Math.sin(a) * 0.18)); s.scale.set(size * 0.5, size, 1); s.material.opacity = Math.sin(Math.PI * u) * k; } }
const FLIES = Array.from({ length: 6 }, () => { const f = new THREE.Group(); f.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), M('#111'))); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.012), new THREE.MeshBasicMaterial({ color: '#c8d8e8', transparent: true, opacity: 0.6, side: THREE.DoubleSide })); w.position.set(s * 0.012, 0.006, 0); f.add(w); } return f; });
function fliesAt(scene, c, t, n, r = 0.25) { FLIES.forEach((f, i) => { if (i >= n) { f.visible = false; return; } if (f.parent !== scene) scene.add(f); f.visible = true; const a = t * (3 + i) + i * 1.7; f.position.copy(c).add(V3(Math.cos(a) * r, 0.08 * Math.sin(t * 7 + i), Math.sin(a * 1.3) * r)); }); }
const patchTex = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const x = 40 + hash(i) * 176, y = 40 + hash(i * 3) * 176, r = 10 + 26 * hash(i * 7); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,38,20,0.9)'); gr.addColorStop(1, 'rgba(70,45,25,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
const PATCHES = [[0.0, 0.05, 0.175, 0.0], [0.13, 0.09, 0.13, 0.7], [-0.13, 0.09, 0.13, -0.7], [0.125, 0.15, 0.155, 0.6]].map(([x, y, z, ry]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.09), new THREE.MeshBasicMaterial({ map: patchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  hero.head.add(p); p.position.set(x / 0.42, (y - 0.17) / 0.42, z / 0.42); p.scale.setScalar(1 / 0.42); p.rotation.y = ry; p.visible = false; return p; });
// ---- 1) THE BATHROOM: white subway tiles, a shower stall with a curtain, sink + mirror, a towel; the shower running at the end ----
const bath = new THREE.Scene(); bath.background = new THREE.Color('#d8dce0'); const bathCam = new THREE.PerspectiveCamera(40, W / H, 0.03, 60); bath.add(bathCam);
bath.add(new THREE.HemisphereLight(0xfff6ec, 0x8a8278, 1.2)); { const l = new THREE.PointLight(0xfff0dc, 6, 8, 1.2); l.position.set(0, 2.5, 0.5); bath.add(l); const k = new THREE.PointLight(0xfff0e0, 1.2, 6, 1.2); bathCam.add(k); }
const BT = {}; { const tile = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f2f4f2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8ccd0'; g.lineWidth = 4; for (let r = 0; r < 8; r++) { g.beginPath(); g.moveTo(0, r * 32); g.lineTo(w, r * 32); g.stroke(); for (let c = 0; c < 4; c++) { const x = c * 64 + (r % 2) * 32; g.beginPath(); g.moveTo(x, r * 32); g.lineTo(x, r * 32 + 32); g.stroke(); } } }, [6, 4]);
  const floorT = canvasTex(256, 256, (g, w, h) => { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 2 ? '#3a4a5a' : '#e8e8e4'; g.fillRect(c * 32, r * 32, 32, 32); } }, [6, 6]);
  const fl = mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.4 }), false, true); fl.rotation.x = -Math.PI / 2; bath.add(fl);
  const wm = new THREE.MeshStandardMaterial({ map: tile, roughness: 0.3 }); for (const [x, z, ry] of [[0, -2, 0], [-2, 0, Math.PI / 2], [2, 0, -Math.PI / 2]]) { const w = mesh(new THREE.PlaneGeometry(4, 2.8), wm, false, true); w.position.set(x, 1.4, z); w.rotation.y = ry; bath.add(w); }
  const ceil = mesh(new THREE.PlaneGeometry(4, 4), F_('#f4f4f2'), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = 2.8; bath.add(ceil);
  // shower stall (back-left): tray, glass side, curtain rail + a striped curtain that slides, pipe + head
  bx(1.3, 0.1, 1.3, '#f8f8f6', -1.3, 0.05, -1.3, bath); bx(0.02, 2.0, 1.3, new THREE.MeshStandardMaterial({ color: '#c8e0f0', transparent: true, opacity: 0.25, roughness: 0.05 }), -0.65, 1.1, -1.3, bath);
  bx(1.3, 0.03, 0.03, '#c8ccd4', -1.3, 2.15, -0.65, bath, { metalness: 0.8, roughness: 0.2 });
  const cur = canvasTex(256, 256, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#5ab0c8' : '#f4f8f8'; g.fillRect(x, 0, 32, h); } });
  BT.curtain = mesh(new THREE.PlaneGeometry(1.3, 1.95, 12, 1), new THREE.MeshStandardMaterial({ map: cur, side: THREE.DoubleSide, roughness: 0.7 }), false, true); BT.curtain.position.set(-1.3, 1.15, -0.65); bath.add(BT.curtain);
  { const p = BT.curtain.geometry.attributes.position; BT.cur0 = p.array.slice(); }
  bx(0.04, 0.5, 0.04, '#c8ccd4', -1.3, 2.2, -1.9, bath, { metalness: 0.8 }); BT.head = mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.06, 14), F_('#c8ccd4', { metalness: 0.8, roughness: 0.2 })); BT.head.position.set(-1.3, 2.0, -1.72); BT.head.rotation.x = 0.5; bath.add(BT.head);
  // sink + mirror (right wall), towel
  bx(0.5, 0.18, 0.4, '#f8f8f6', 1.75, 0.85, 0.2, bath); bx(0.12, 0.85, 0.12, '#f0f0ee', 1.8, 0.42, 0.2, bath); BT.mirror = bx(0.02, 0.8, 0.6, new THREE.MeshStandardMaterial({ color: '#b8c8d4', roughness: 0.05, metalness: 0.9 }), 1.98, 1.55, 0.2, bath);
  bx(0.05, 0.03, 0.6, '#c8ccd4', 1.97, 1.2, -1.0, bath, { metalness: 0.8 }); bx(0.04, 0.6, 0.45, '#e8603a', 1.95, 0.92, -1.0, bath);
  BT.water = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.9, 1.0), transparent: true, opacity: 0.7 }), 160); BT.water.frustumCulled = false; bath.add(BT.water);
  BT.drain = mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ color: '#6a4a2a', transparent: true, opacity: 0.6, depthWrite: false }), false, false); BT.drain.rotation.x = -Math.PI / 2; BT.drain.position.set(-1.3, 0.106, -1.3); bath.add(BT.drain);
  BT.foam = Array.from({ length: 18 }, (_, i) => { const b = mesh(new THREE.SphereGeometry(0.03 + 0.03 * hash(i), 8, 6), F_('#ffffff', { roughness: 0.3, flatShading: false })); bath.add(b); return b; }); }
const steam = makeSmoke(bath, 120);
// the hook (her idea): a real-looking shampoo bottle (oval, glossy, flip-top cap, bubbly label) in a real hand (palm, 4 curled fingers, thumb), squeezed… pfrrt
const BOT_H = 0.17, bottle = new THREE.Group(); let botGeo, bot0;
{ const lab = canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#36c8d8'); gr.addColorStop(1, '#1670b8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(80 + 230 * hash(i), 40 + 180 * hash(i * 3), 4 + 14 * hash(i * 5), 0, 6.3); g.fill(); }
    g.fillStyle = '#fff'; g.fillRect(70, 96, 250, 4); g.font = '900 46px Inter'; g.textAlign = 'center'; g.fillText('SHAMPOO', 195, 150); g.font = '600 20px Inter'; g.fillText('FRESH OCEAN · 400 ml', 195, 182); });
  botGeo = new THREE.CylinderGeometry(0.042, 0.042, BOT_H, 40, 24); botGeo.scale(1, 1, 0.55); bot0 = botGeo.attributes.position.array.slice();
  const b = mesh(botGeo, [new THREE.MeshPhysicalMaterial({ map: lab, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }), new THREE.MeshPhysicalMaterial({ color: '#1670b8', roughness: 0.2, clearcoat: 1 }), new THREE.MeshPhysicalMaterial({ color: '#1670b8', roughness: 0.2, clearcoat: 1 })]); bottle.add(b);
  const capM = new THREE.MeshPhysicalMaterial({ color: '#f6f6f2', roughness: 0.25, clearcoat: 1 });
  const cap = mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.035, 32), capM); cap.scale.z = 0.62; cap.position.y = BOT_H / 2 + 0.017; bottle.add(cap);
  const lid = mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.012, 32), capM); lid.scale.z = 0.62; lid.position.set(0, BOT_H / 2 + 0.04, 0); bottle.add(lid);
  const hinge = mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), capM); hinge.position.set(0, BOT_H / 2 + 0.035, -0.019); bottle.add(hinge);
  const spout = mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.01, 12), capM); spout.position.set(0, BOT_H / 2 + 0.052, 0.006); bottle.add(spout); }
bath.add(bottle); bottle.visible = false;
function squeezeBottle(k) { const p = botGeo.attributes.position, a = p.array; for (let i = 0; i < a.length; i += 3) { const y = bot0[i + 1], pin = 1 - 0.42 * k * Math.exp(-Math.pow((y + 0.005) / 0.035, 2)); a[i] = bot0[i] * pin; a[i + 2] = bot0[i + 2] * (1 - 0.25 * k * Math.exp(-Math.pow((y + 0.005) / 0.035, 2))); } p.needsUpdate = true; botGeo.computeVertexNormals(); }
const sadBubble = mesh(new THREE.SphereGeometry(0.009, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 0.6, thickness: 0.01, clearcoat: 1, transparent: true, opacity: 0.9 }), false, false); bath.add(sadBubble); sadBubble.visible = false;
const skinM2 = new THREE.MeshStandardMaterial({ color: '#e9b98f', roughness: 0.6 });
// a fist wrapped around the bottle: palm on the back (−z), four fingers curling round the front (+z), the thumb over the top; joints bend more on the squeeze
const fist = new THREE.Group(); const FING = [];
{ const palmM = mesh(new RoundedBoxGeometry(0.085, 0.09, 0.028, 4, 0.012), skinM2); palmM.position.set(0, 0, -0.04); palmM.visible = false; fist.add(palmM);
  const fore = mesh(new THREE.CapsuleGeometry(0.032, 0.22, 6, 14), skinM2); fore.rotation.x = Math.PI / 2 - 0.25; fore.position.set(0.01, -0.04, -0.17); fist.add(fore);
  for (let f = 0; f < 4; f++) { const root = new THREE.Group(); root.position.set(0.03, 0.033 - f * 0.022, -0.03); fist.add(root); const segs = []; let par = root;
    for (const [L, r] of [[0.042, 0.0105], [0.03, 0.0098], [0.024, 0.009]]) { const j = new THREE.Group(); par.add(j); const sg = mesh(new THREE.CapsuleGeometry(r, L, 4, 10), skinM2); sg.rotation.z = Math.PI / 2; sg.position.x = L / 2 + r * 0.4; j.add(sg); const nx = new THREE.Group(); nx.position.x = L + r * 0.6; j.add(nx); segs.push(j); par = nx; }
    root.rotation.y = -0.15; FING.push(segs); }
  const th = new THREE.Group(); th.position.set(-0.035, 0.04, -0.03); fist.add(th); const t1 = mesh(new THREE.CapsuleGeometry(0.012, 0.035, 4, 10), skinM2); t1.rotation.z = Math.PI / 2; t1.position.x = 0.022; th.add(t1); const t2g = new THREE.Group(); t2g.position.x = 0.045; th.add(t2g); const t2 = mesh(new THREE.CapsuleGeometry(0.011, 0.026, 4, 10), skinM2); t2.rotation.z = Math.PI / 2; t2.position.x = 0.016; t2g.add(t2);
  th.rotation.set(0, -1.25, 0.2); fist.userData.thumb = [th, t2g]; }
function curl(k) { FING.forEach((segs, f) => segs.forEach((j, s2) => { j.rotation.y = -(0.95 + 0.35 * k) * (s2 === 0 ? 0.9 : 1.05); })); fist.userData.thumb[1].rotation.y = -0.6 - 0.4 * k; }
bath.add(fist); fist.visible = false;
// the other hand, cupped, waiting under the cap
const palm = new THREE.Group(); { const pb = mesh(new RoundedBoxGeometry(0.09, 0.024, 0.085, 4, 0.01), skinM2); palm.add(pb);
  for (let f = 0; f < 4; f++) { const fg = mesh(new THREE.CapsuleGeometry(0.0095, 0.055, 4, 10), skinM2); fg.rotation.set(0, 0, Math.PI / 2 - 0.2); fg.position.set(0.075, 0.006, -0.03 + f * 0.02); palm.add(fg); }
  const tb = mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 10), skinM2); tb.rotation.set(0.6, 0, Math.PI / 2); tb.position.set(0.02, 0.01, 0.055); palm.add(tb);
  const fore = mesh(new THREE.CapsuleGeometry(0.032, 0.22, 6, 14), skinM2); fore.rotation.z = Math.PI / 2 - 0.1; fore.position.set(-0.17, -0.01, 0); palm.add(fore); } bath.add(palm); palm.visible = false;
const HOOKP = V3(-1.0, 1.32, -0.95);   // where the squeeze happens (in the stall, near the camera)
function updateBath(t, mode) { if (hero.outer.parent !== bath) bath.add(hero.outer); const P = hero; poseReset(P, t); BT.water.visible = BT.drain.visible = false; bottle.visible = sadBubble.visible = fist.visible = palm.visible = false; BT.foam.forEach(b => b.visible = false); steam.begin();
  const curOpen = mode === 'shower' || mode === 'hook' ? 1 : mode === 'title' ? 1 - smooth(T0 + 1.6, T0 + 2.6, t) : 0; { const p = BT.curtain.geometry.attributes.position, a = p.array, c0 = BT.cur0; for (let i = 0; i < a.length; i += 3) { const u = (c0[i] + 0.65) / 1.3; a[i] = -0.65 + 1.3 * u * (1 - 0.8 * curOpen); a[i + 2] = 0.06 * Math.sin(u * 30) * (1 - 0.6 * curOpen); } p.needsUpdate = true; BT.curtain.geometry.computeVertexNormals(); }
  if (mode === 'title') { P.outer.position.set(0.1, 0.95, 0.2); P.outer.rotation.y = -0.6 + 0.3 * smooth(T0 + 1.6, T0 + 2.6, t); P.face(t < T0 + 1.6 ? 'squint' : t < T0 + 2.8 ? 'smirk' : 'happy', t); if (t > T0 + 1.4 && t < T0 + 2.8) { P.arms[1].rotation.set(-1.4, 0, -0.6); P.elbows[1].rotation.x = -0.3; } }
  else if (mode === 'hook') {   // in the shower, water running: squeeze… nothing
    P.outer.position.set(-1.3, 1.05, -1.3); P.outer.rotation.y = 0.3; P.face(t < 2.2 ? 'neutral' : 'sleepy', t); P.outer.position.x -= 0.25;
    bottle.visible = fist.visible = palm.visible = true; bottle.position.copy(HOOKP); bottle.rotation.set(0, Math.PI - 0.35, Math.PI + 0.05);
    const sq = smooth(0.5, 1.5, t) * (1 - smooth(1.9, 2.2, t)); squeezeBottle(sq); curl(sq); fist.position.copy(HOOKP).add(V3(0, 0.005, 0)); fist.rotation.set(0, 0.1, 0); palm.position.copy(HOOKP).add(V3(-0.02, -0.19, 0.0)); palm.rotation.set(0, 0.2, 0.08);
    const bt = t - 1.55; sadBubble.visible = bt > 0 && bt < 0.9; bottle.updateMatrixWorld(true); const tip = bottle.localToWorld(V3(0, BOT_H / 2 + 0.058, 0.006)); sadBubble.position.copy(tip).add(V3(0, -0.006 - 0.03 * bt - 0.12 * bt * bt, 0)); sadBubble.scale.setScalar(bt < 0.75 ? Math.min(1, bt * 6) : Math.max(0.01, 1 - (bt - 0.75) * 8));
    BT.water.visible = true; for (let k = 0; k < 160; k++) { const u = ((t * 2.2 + hash(k)) % 1), a = hash(k * 3) * 6.28, r = 0.05 + 0.25 * hash(k * 7) + 0.15 * u; _o.position.set(-1.3 + Math.cos(a) * r, 1.95 - 1.9 * u, -1.65 + Math.sin(a) * r * 0.8 + 0.35 * u); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); BT.water.setMatrixAt(k, _o.matrix); } BT.water.instanceMatrix.needsUpdate = true; }
  else if (mode === 'mirror') { P.outer.position.set(0.55, 0.95, 0.2); P.outer.rotation.y = Math.PI / 2; P.face(t < DAY30 + 3 ? 'worried' : 'surprised', t); P.arms[0].rotation.set(-1.9, 0, -0.5); P.elbows[0].rotation.x = -1.5; }
  else { P.outer.position.set(-1.3, 1.05, -1.3); P.outer.rotation.y = 0.3; P.face('love', t); P.arms.forEach((a, i) => a.rotation.set(-2.6, 0, i ? -0.4 : 0.4)); P.elbows.forEach(e => e.rotation.x = -1.6);
    BT.water.visible = true; for (let k = 0; k < 160; k++) { const u = ((t * 2.2 + hash(k)) % 1), a = hash(k * 3) * 6.28, r = 0.05 + 0.25 * hash(k * 7) + 0.15 * u; _o.position.set(-1.3 + Math.cos(a) * r, 1.95 - 1.9 * u, -1.65 + Math.sin(a) * r * 0.8 + 0.35 * u); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); BT.water.setMatrixAt(k, _o.matrix); } BT.water.instanceMatrix.needsUpdate = true;
    BT.drain.visible = true; BT.drain.material.opacity = 0.65 * (1 - smooth(SHOWER + 1.5, SHOWER + 4.5, t)); BT.drain.scale.setScalar(0.6 + 0.4 * Math.sin(t * 3) ** 2);
    P.outer.updateMatrixWorld(true); const hd = headOf(P); BT.foam.forEach((b, i) => { b.visible = t < SHOWER + 3.5; b.position.copy(hd).add(V3((hash(i) - 0.5) * 0.22, 0.12 + 0.06 * hash(i * 3), (hash(i * 5) - 0.5) * 0.22)); });
    smokeMat.uniforms.uTint.value.set('#ffffff'); for (let k = 0; k < 60; k++) { const u = ((t * 0.25 + k / 60) % 1); steam.add(V3(-1.3 + (hash(k) - 0.5) * 1.2, 0.4 + 2.2 * u, -1.3 + (hash(k * 3) - 0.5) * 1.0), 0.25 + 0.3 * u, 0.22 * Math.sin(Math.PI * u) * smooth(SHOWER, SHOWER + 1.5, t)); } }
  steam.end(); }
// ---- 2) YOUR SKIN, up close: pores, hairs, sweat droplets that bacteria swarm and turn into green stink ----
const micro = new THREE.Scene(); micro.background = new THREE.Color('#2a1418'); const microCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100); micro.fog = new THREE.Fog(0x2a1418, 6, 22);
micro.add(new THREE.HemisphereLight(0xffe0d8, 0x502030, 1.3)); { const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(2, 4, 3); micro.add(k); }
const MC = {}; { const g = new THREE.PlaneGeometry(30, 30, 90, 90); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.12 * Math.sin(x * 2.1 + Math.sin(z * 1.3)) * Math.sin(z * 1.7) + 0.05 * Math.sin(x * 7 + z * 5)); } g.computeVertexNormals();
  micro.add(mesh(g, F_('#e8a890', { roughness: 0.55 }), false, true));
  MC.pores = []; for (let k = 0; k < 14; k++) { const x = (hash(k) - 0.5) * 8, z = -1 - hash(k * 3) * 8; const pr = mesh(new THREE.CircleGeometry(0.18, 16), M('#5a2a2a'), false, false); pr.rotation.x = -Math.PI / 2; pr.position.set(x, 0.14, z); micro.add(pr); MC.pores.push(V3(x, 0.14, z));
    if (k % 2) { const h = mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.5, 6), M('#4a3020')); h.position.set(x + 0.8, 1.6, z); h.rotation.z = -0.5; micro.add(h); } }
  MC.drops = MC.pores.map(() => { const d = mesh(new THREE.SphereGeometry(0.3, 18, 12), new THREE.MeshStandardMaterial({ color: '#c8e8ff', transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2 }), false, false); micro.add(d); return d; });
  MC.bugs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.12, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.4 }), 260); MC.bugs.frustumCulled = false; for (let k = 0; k < 260; k++) MC.bugs.setColorAt(k, _c.set(k % 3 ? '#8a4ad8' : '#4ab86a')); micro.add(MC.bugs); }
const microSmoke = makeSmoke(micro, 160);
function updateMicro(t) { const u = clamp((t - MICRO - 0.3) / 2.5, 0, 1), eat = smooth(MICRO + 3.0, MICRO + 4.5, t);
  MC.drops.forEach((d, i) => { const p = MC.pores[i]; d.position.copy(p).add(V3(0, 0.18 + 0.12 * u, 0)); d.scale.setScalar(Math.max(0.01, u * (1 - 0.6 * eat) * (0.8 + 0.4 * hash(i)))); });
  for (let k = 0; k < 260; k++) { const p = MC.pores[k % MC.pores.length], a = hash(k) * 6.28 + t * (0.5 + hash(k * 3)), r = lerp(1.2 + 0.8 * hash(k * 5), 0.38, eat); _o.position.set(p.x + Math.cos(a) * r, 0.2 + 0.08 * Math.sin(t * 5 + k), p.z + Math.sin(a) * r); _o.rotation.set(Math.PI / 2, a, 0); _o.scale.setScalar(1); _o.updateMatrix(); MC.bugs.setMatrixAt(k, _o.matrix); } MC.bugs.instanceMatrix.needsUpdate = true;
  microSmoke.begin(); smokeMat.uniforms.uTint.value.set('#9ad04a'); if (eat > 0.05) MC.pores.forEach((p, i) => { for (let q = 0; q < 8; q++) { const v = ((t * 0.4 + q / 8 + hash(i)) % 1); microSmoke.add(p.clone().add(V3(0.2 * Math.sin(q + t), 0.3 + 2.0 * v, 0.2 * Math.cos(q))), 0.25 + 0.5 * v, 0.5 * eat * Math.sin(Math.PI * v)); } }); microSmoke.end(); }
// ---- 3) THE SUBWAY CAR: benches, poles, light strips, the tunnel streaking past; people edge away from you ----
const sub = new THREE.Scene(); sub.background = new THREE.Color('#0a0c10'); const subCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 80); sub.add(subCam);
sub.add(new THREE.HemisphereLight(0xeef4ff, 0x3a3a40, 1.3)); { const k = new THREE.PointLight(0xfff4e8, 1.2, 6, 1.2); subCam.add(k); }
const SB = {}; { bx(3.0, 0.05, 14, '#5a5c64', 0, 0, 0, sub); bx(3.0, 0.05, 14, '#e8e8ea', 0, 2.3, 0, sub); for (const x of [-0.6, 0.6]) bx(0.2, 0.03, 13, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.1) }), x, 2.27, 0, sub);
  for (const s of [-1, 1]) { bx(0.05, 2.3, 14, '#c8ccd0', s * 1.5, 1.15, 0, sub); bx(0.45, 0.45, 12, s > 0 ? '#e8a030' : '#3a6ad8', s * 1.25, 0.25, 0, sub); bx(0.08, 0.5, 12, s > 0 ? '#e8a030' : '#3a6ad8', s * 1.45, 0.65, 0, sub);
    for (let z = -6; z <= 6; z += 2.4) bx(0.02, 0.7, 1.6, new THREE.MeshBasicMaterial({ color: '#05070a' }), s * 1.47, 1.35, z, sub); }
  for (let z = -5; z <= 5; z += 2.5) { const pl = mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 8), F_('#d8dce0', { metalness: 0.8, roughness: 0.2 })); pl.position.set(0, 1.15, z); sub.add(pl); }
  SB.streaks = Array.from({ length: 8 }, (_, k) => { const s = bx(0.01, 0.06, 0.8, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.0, 1.2) }), (k % 2 ? 1 : -1) * 1.49, 1.2 + 0.25 * hash(k), 0, sub); return s; });
  const r0 = seed; seed = 4040; SB.ppl = Array.from({ length: 9 }, (_, k) => { const p = makePerson(rnd); sub.add(p.outer); return { p, side: k % 2 ? 1 : -1, z0: -4.5 + k * 1.15, sit: k % 3 !== 0 }; }); seed = r0; }
function updateSub(t) { if (hero.outer.parent !== sub) sub.add(hero.outer); const P = hero; poseReset(P, t); const away = t < HOOK ? smooth(1.3, 1.9, t) : smooth(DAY7 + 1.0, DAY7 + 3.5, t);
  SB.streaks.forEach((s, k) => { s.position.z = 7 - ((t * 9 + k * 1.8) % 14); });
  P.outer.position.set(0.25, 0.95, 0.2); P.outer.rotation.y = -0.4; P.arms[0].rotation.set(-2.5, 0, 0.1); P.elbows[0].rotation.x = -0.3;
  if (t > DAY7 + 3.8) { P.arms[1].rotation.set(-1.0, 0, -1.2); P.elbows[1].rotation.x = -1.2; P.root.rotation.z = -0.15; P.face('happy', t); } else P.face('neutral', t);   // sniffs his armpit: smells fine to him
  SB.ppl.forEach((o, k) => { const p = o.p, dz = (o.z0 - 0.2), push = Math.sign(dz || 1) * away * (3.0 - Math.min(Math.abs(dz), 3.0)), z = clamp(o.z0 + push, -6.5, 6.5);
    p.outer.position.set(o.side * (o.sit ? 1.15 : 0.9), o.sit ? 0.55 : 0.95, z); p.outer.rotation.y = o.side > 0 ? -Math.PI / 2 : Math.PI / 2; if (o.sit) poseSit(p); else poseIdle(p, t, k);
    if (away > 0.3 && k % 2 === 0) { p.arms[1].rotation.set(-2.6, 0, 0.6); p.elbows[1].rotation.x = -2.2; p.outer.rotation.y += 0.6 * Math.sign(dz || 1); } }); }
// ---- the room beats (m_sets house): day 1 (fine), day 3 (greasy + stink), day 14 (shoes), the 5-year calendar ----
const shoes = new THREE.Group(); for (const s of [-1, 1]) { const sh = new THREE.Group(); bx(0.11, 0.08, 0.28, '#f4f4f4', 0, 0.04, 0, sh); bx(0.11, 0.025, 0.29, '#2a2a30', 0, 0.012, 0, sh); sh.position.set(s * 0.09, 0, 0); sh.rotation.y = s * 0.2; shoes.add(sh); } room.add(shoes);
const socks = Array.from({ length: 2 }, (_, i) => { const s = bx(0.08, 0.2, 0.06, '#d8d0b8', 0, 0, 0, room); return s; });
const calCv = document.createElement('canvas'); calCv.width = 256; calCv.height = 300; const calTex = new THREE.CanvasTexture(calCv); calTex.colorSpace = THREE.SRGBColorSpace; let calLast = '';
function drawCal(y) { if (y === calLast) return; calLast = y; const g = calCv.getContext('2d'); g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 256, 300); g.fillStyle = '#d8342a'; g.fillRect(0, 0, 256, 70); g.fillStyle = '#fff'; g.font = '800 46px Inter'; g.textAlign = 'center'; g.fillText(y, 128, 52);
  g.fillStyle = '#2a2a30'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillRect(18 + c * 32, 92 + r * 40, 22, 26); calTex.needsUpdate = true; }
const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.53), new THREE.MeshStandardMaterial({ map: calTex, roughness: 0.8 })); cal.position.set(0.3, 1.6, -2.9); room.add(cal);
function updateHome(t, mode) { if (hero.outer.parent !== room) room.add(hero.outer); const P = hero; poseReset(P, t); [dad, mom].forEach(p => p.outer.visible = false); dog.g.visible = false; keys.visible = false;
  lightRoom('day'); camKey.intensity = 1.4; bedLamp.intensity = 0; blueL.intensity = 0; shoes.visible = false; socks.forEach(s => s.visible = false); drawClock('8:00'); drawCal(t >= DOC ? String(2015 + Math.min(5, Math.floor((t - DOC - 0.3) / 0.45))) : '2026');
  if (mode === 'day1') { P.outer.position.set(0.3, 0.95, -0.6); P.outer.rotation.y = 0.2; const k = smooth(DAY1 + 0.3, DAY1 + 1.5, t) * (1 - smooth(DAY1 + 3.5, DAY1 + 4.5, t)); P.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? -1 : 1) * 2.6 * k)); P.face(k > 0.5 ? 'laugh' : 'happy', t); }
  else if (mode === 'day3') { P.outer.position.set(0.3, 0.95, -0.6); P.outer.rotation.y = 0.2; P.arms[1].rotation.set(-2.7, 0, -0.3); P.elbows[1].rotation.x = -1.8 - 0.2 * Math.sin(t * 9); P.face('squint', t); }   // scratching his greasy head
  else if (mode === 'day14') { seatAt(P, -2.35, 0.45, 1.5, Math.PI / 2); P.face('neutral', t); shoes.visible = true; shoes.position.set(-1.7, 0, 1.55); socks.forEach((s, i) => { s.visible = false; s.position.set(-1.55 + i * 0.25, 0.1, 1.9 + 0.1 * i); s.rotation.set(0, i, 0.1); }); }
  else if (mode === 'doc') { seatAt(P, -1.0, 0.42, -1.3, 0); P.face(t < DOC + 2.6 ? 'surprised' : 'reading', t); } }
// ---- cinematic light (her note: "кинематографично"): sun shafts with dust through the window, a rim light that always sits behind you, mood per place ----
const shaftTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,220,160,0.0)'); gr.addColorStop(0.15, 'rgba(255,215,150,0.55)'); gr.addColorStop(1, 'rgba(255,200,130,0.0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); });
const SHAFTS = [0.8, 1.15, 1.5, 1.8].map((x, k) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.35 + 0.15 * hash(k), 4.2), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.55 }));
  s.position.set(x - 0.2, 1.1, -1.4); s.rotation.set(0.75, 0.15, 0.1); room.add(s); return s; });
const dust = (() => { const n = 300, p = new Float32Array(n * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.9, 1.4), size: 0.012, transparent: true, opacity: 0.8, depthWrite: false })); pts.frustumCulled = false; room.add(pts); return pts; })();
function updateDust(t) { const a = dust.geometry.attributes.position.array; for (let i = 0; i < 300; i++) { a[i * 3] = 0.5 + 1.6 * hash(i) + 0.05 * Math.sin(t * 0.3 + i); a[i * 3 + 1] = 0.2 + 2.2 * ((hash(i * 3) + t * 0.02 * (0.5 + hash(i * 7))) % 1); a[i * 3 + 2] = -2.6 + 2.4 * hash(i * 5) + 0.05 * Math.cos(t * 0.4 + i); } dust.geometry.attributes.position.needsUpdate = true; }
const RIMS = new Map(); function rimFor(scene, col, I) { let r = RIMS.get(scene); if (!r) { r = new THREE.PointLight(col, I, 4, 1.4); scene.add(r); RIMS.set(scene, r); } r.color.set(col); r.intensity = I; return r; }
function placeRim(scene, cam, col, I) { const r = rimFor(scene, col, I); hero.outer.updateMatrixWorld(true); const hd = headOf(hero), away = hd.clone().sub(cam.position).setY(0).normalize(); r.position.copy(hd).addScaledVector(away, 0.9).add(V3(0, 0.45, 0)); }
// moods: the bathroom cold with a warm sink light; the subway fluorescent green-white; the shower backlit warm through the steam
const sinkL = new THREE.PointLight(0xffb070, 3.0, 3, 1.3); sinkL.position.set(1.7, 1.9, 0.2); bath.add(sinkL);
const showerBack = new THREE.PointLight(0xffc890, 0, 5, 1.2); showerBack.position.set(-1.6, 2.2, -1.95); bath.add(showerBack);
sub.children.filter(o => o.isHemisphereLight).forEach(h => { h.color.set('#e8fff0'); h.intensity = 1.05; });
