// =================== AIRLOCK (meters): a padded white cylinder, lights, the hatch; air hisses back in ===================
const lock = new THREE.Scene(); lock.background = new THREE.Color('#1a1c22'); const lockCam = new THREE.PerspectiveCamera(55, W / H, 0.02, 100);
lock.add(new THREE.HemisphereLight(0xf2f4ff, 0x6a6a72, 1.1)); const lockKey = new THREE.PointLight(0xffffff, 6, 12, 1.4); lockKey.position.set(0, 1.3, 0); lock.add(lockKey);
{ const wallT = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#e8e8e4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b8b8b2'; g.lineWidth = 3; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 18; i++) { g.fillStyle = pick(['#3a5a9a', '#c8302a', '#e8b030', '#4a4a4a']); g.fillRect(R(0, w), R(0, h), R(10, 30), R(6, 14)); } }, [4, 2]);
  const cyl = mesh(new THREE.CylinderGeometry(1.8, 1.8, 5, 24, 1, true), new THREE.MeshStandardMaterial({ map: wallT, side: THREE.BackSide, roughness: 0.8 }), false, true); cyl.rotation.z = Math.PI / 2; lock.add(cyl);
  for (const sx of [-1, 1]) { const end = mesh(new THREE.CircleGeometry(1.8, 24), M('#d8d8d2')); end.position.x = sx * 2.5; end.rotation.y = -sx * Math.PI / 2; lock.add(end); const h = mesh(new THREE.CircleGeometry(0.7, 20), M('#5a5e66', { metalness: 0.5 })); h.position.x = sx * 2.48; h.rotation.y = -sx * Math.PI / 2; lock.add(h); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const strip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.5) })); strip.position.set(0, Math.cos(a) * 1.72, Math.sin(a) * 1.72); strip.rotation.x = -a; lock.add(strip); }
  for (const z of [-1.2, 1.2]) bx(3.6, 0.05, 0.05, '#e8b030', 0, -1.2, z, lock); }
const you2 = makeAstronaut(true), mate2 = makeAstronaut(false); lock.add(you2.g, mate2.g);
you2.helmet.visible = false; you2.g.position.set(-0.2, -1.1, 0); you2.g.rotation.set(0, 0.3, 0.12); mate2.g.position.set(0.85, -1.15, -1.0); mate2.g.rotation.y = -0.35;
const lockSmoke = makeSmoke(lock, 800);
