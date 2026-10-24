// =================== FOR SCALE (meters): squeezed Earth (367 m ball) next to the Empire State Building (roof 381 m, tip 443 m) at dusk ===================
const nycS = new THREE.Scene(); nycS.background = new THREE.Color('#1c2440'); nycS.fog = new THREE.Fog(0x2a3458, 1800, 6000); const nyCam = new THREE.PerspectiveCamera(40, W / H, 1, 20000);
nycS.add(new THREE.HemisphereLight(0x8a9ad8, 0x2a2430, 1.0)); { const s = new THREE.DirectionalLight(0xffb070, 2.2); s.position.set(-800, 600, 900); nycS.add(s); }
{ const sky = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141c3a'); gr.addColorStop(0.55, '#3a4a8a'); gr.addColorStop(0.8, '#e88a6a'); gr.addColorStop(1, '#f8c88a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(16000, 5000), new THREE.MeshBasicMaterial({ map: sky, fog: false, depthWrite: false })); sp.position.set(0, 2000, -6000); sp.renderOrder = -1; nycS.add(sp);
  const gr = mesh(new THREE.PlaneGeometry(20000, 20000), M('#22242c', { roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; nycS.add(gr); }
const winTex = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#3a3e4a'; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) { g.fillStyle = rnd() < 0.45 ? pick(['#ffe0a0', '#ffd080', '#fff0c8']) : '#2a2e38'; g.fillRect(x, y, 4, 5); } });
function tower(w, d, h, x, z, col = '#8a8c94') { const t = winTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, w / 40), Math.max(1, h / 120));
  const m = mesh(BOX, new THREE.MeshStandardMaterial({ color: col, map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.55, roughness: 0.8 })); m.scale.set(w, h, d); m.position.set(x, h / 2, z); nycS.add(m); return m; }
// the Empire State Building: stepped tiers + mast
const ESBX = -60; [[130, 60, 0, 25], [100, 50, 25, 85], [70, 45, 85, 265], [52, 36, 265, 320], [34, 30, 320, 381]].forEach(([w, d, y0, y1]) => { const m = tower(w, d, y1 - y0, ESBX, 0, '#b8b0a0'); m.position.y = y0 + (y1 - y0) / 2; });
{ const mast = mesh(new THREE.CylinderGeometry(2, 7, 62, 10), M('#c8c0b0')); mast.position.set(ESBX, 412, 0); nycS.add(mast); const tip = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.6, 0.5) })); tip.position.set(ESBX, 444, 0); nycS.add(tip); }
for (let i = 0; i < 70; i++) { const x = R(-1600, 1400), z = R(-1800, -120); if (Math.abs(x - ESBX) < 120 && z > -300) continue; tower(R(30, 80), R(30, 80), R(40, 230), x, z); }
for (let i = 0; i < 30; i++) { const x = R(-1600, -250), z = R(-100, 300); tower(R(30, 70), R(30, 70), R(30, 140), x, z); }
// squeezed Earth: dark, impossibly dense, still glowing hot in the cracks
const crackTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#2a2a34'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ff9a4a'; g.lineWidth = 2; for (let i = 0; i < 60; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += R(-30, 30); y += R(-20, 20); g.lineTo(x, y); } g.stroke(); } });
const denseBall = mesh(new THREE.SphereGeometry(183.5, 48, 32), new THREE.MeshStandardMaterial({ color: '#5a5a6a', map: crackTex, emissive: '#ffffff', emissiveMap: crackTex, emissiveIntensity: 0.9, roughness: 0.6 })); denseBall.position.set(330, 184, 0); nycS.add(denseBall);
const ballHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 30, 64, 64, 64); rg.addColorStop(0, 'rgba(255,170,90,0.5)'); rg.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); ballHalo.scale.setScalar(560); ballHalo.visible = false; ballHalo.position.copy(denseBall.position); nycS.add(ballHalo);
function updateNyc(t) { denseBall.rotation.y = 0.15 * t; denseBall.material.emissiveIntensity = 0.75 + 0.15 * Math.sin(t * 2.3); }
function nycCamera(t) { const k = smooth(ESB - 0.5, CELL + 0.5, t); nyCam.position.set(lerp(260, 200, k), lerp(330, 260, k), lerp(2300, 1900, k)); nyCam.lookAt(150, 215, 0); }
// =================== BLOOD (micrometres): red blood cells drift by; a glowing 8-µm ball — all of you, squeezed — hangs among them ===================
const cellS = new THREE.Scene(); cellS.background = new THREE.Color('#3a0812'); cellS.fog = new THREE.Fog(0x3a0812, 20, 70); const ceCam = new THREE.PerspectiveCamera(42, W / H, 0.1, 300);
cellS.add(new THREE.HemisphereLight(0xffd0d0, 0x400810, 1.0)); { const k = new THREE.DirectionalLight(0xfff0f0, 1.8); k.position.set(5, 8, 10); cellS.add(k); }
const cellGeo = (() => { const g = new THREE.CylinderGeometry(4, 4, 1.2, 40, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z) / 4; p.setY(i, p.getY(i) * (0.45 + 1.6 * r * r)); } g.computeVertexNormals(); return g; })();
const CELLS = Array.from({ length: 34 }, (_, i) => ({ p: V3(R(-22, 22), R(-34, 34), R(-30, 6)), r: V3(R(0, 6), R(0, 6), 0), sp: R(0.6, 1.4), m: mesh(cellGeo, M('#d82a3a', { roughness: 0.45 })) }));
CELLS.forEach(C => cellS.add(C.m));
const youBall = mesh(new THREE.SphereGeometry(4.15, 32, 22), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.9) })); cellS.add(youBall);
const youHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(64, 64, 20, 64, 64, 64); rg.addColorStop(0, 'rgba(200,220,255,0.7)'); rg.addColorStop(1, 'rgba(160,190,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); cellS.add(youHalo);
const youFig = makeHer(); cellS.add(youFig.outer); youFig.outer.rotation.y = 0.4;
function updateCell(t) { CELLS.forEach((C, i) => { C.m.position.set(C.p.x + Math.sin(t * 0.3 + i) * 1.5, wrapR(C.p.y - (t - CELL) * 2.2 * C.sp, -36, 36), C.p.z); C.m.rotation.set(C.r.x + t * 0.25 * C.sp, C.r.y + t * 0.2, 0); });
  const k = smooth(CELL + 0.4, CELL + 2.6, t); poseIdle(youFig, t, 0); youFig.root.rotation.set(0, 0, 0);
  const fs = lerp(16, 0.0001, k); youFig.outer.scale.setScalar(Math.max(0.0001, fs)); youFig.outer.position.set(0, 0.1 * fs, 0); youFig.outer.visible = k < 0.98;
  youBall.scale.setScalar(Math.max(0.0001, k)); youHalo.scale.setScalar(Math.max(0.0001, k * 13 * (1 + 0.05 * Math.sin(t * 5)))); }
function cellCamera(t) { const k = smooth(CELL - 0.5, ENDS + 0.5, t); ceCam.position.set(lerp(-6, 4, k), lerp(4, 1, k), lerp(48, 32, smooth(CELL + 0.6, CELL + 3.4, t))); ceCam.lookAt(0, 0, 0); }
