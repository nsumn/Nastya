// =================== TIMES SQUARE: 1904 (Longacre -> Times Square) and TODAY share the street; buildings, signs and people differ ===================
const WORDS = ['SHOW', 'LIVE', 'NYC', 'TONIGHT', 'BROADWAY', 'SALE', 'NEW', 'COLA', 'MUSIC', 'DANCE', 'NEWS', 'TICKETS', 'WOW', 'SNACKS', 'PLAY', 'FUN'];
const BB_COLS = [['#ff2a6a', '#ffb02a'], ['#2a6aff', '#2affe0'], ['#8a2aff', '#ff2ad8'], ['#ff5a1a', '#ffe02a'], ['#1aff6a', '#1a8aff'], ['#ff1a1a', '#ff9a9a'], ['#ffe01a', '#ff6a1a'], ['#1ad8ff', '#ffffff']];
const bbTex = WORDS.map((w, i) => canvasTex(256, 320, (g, W_, H_) => { const [a, b] = BB_COLS[i % BB_COLS.length]; const gr = g.createLinearGradient(0, 0, W_, H_); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W_, H_);
  g.fillStyle = 'rgba(255,255,255,0.25)'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(R(0, W_), R(0, H_), R(20, 80), 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.font = `800 ${w.length > 6 ? 46 : 72}px Inter`; g.textAlign = 'center'; g.fillText(w, W_ / 2, H_ / 2 + 20); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, H_ - 40, W_, 40); g.fillStyle = '#fff'; g.font = '600 20px Inter'; g.fillText('TIMES SQ', W_ / 2, H_ - 13); }));
const bbMats = bbTex.map(tx => new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, fog: false, color: new THREE.Color(0.95, 0.95, 0.95) }));
function facadeTex(base, win, lit, cols = 8, rows = 12) { return canvasTex(256, 384, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = rnd() < lit ? pick(['#ffd88a', '#ffe8b8', '#cfe4ff']) : win; g.fillRect(c * w / cols + 5, r * h / rows + 6, w / cols - 10, h / rows - 12); } }); }
const STREET_W = 34;
function streetBase(g, old) {
  const road = mesh(new THREE.PlaneGeometry(STREET_W, 900).rotateX(-Math.PI / 2), M(old ? '#7a6e60' : '#2c2e33', { roughness: 0.9 }), false, true); road.position.set(0, old ? 0.012 : 0.02, -380); road.userData.sink = true; g.add(road);
  for (const s of [-1, 1]) { const sw = mesh(new THREE.BoxGeometry(5, 0.2, 900), M(old ? '#9a8e7e' : '#8e8c88'), false, true); sw.position.set(s * (STREET_W / 2 - 2.5), old ? 0.1 : 0.11, -380); sw.userData.sink = true; g.add(sw); }
  if (!old) { const plaza = mesh(new THREE.PlaneGeometry(14, 140).rotateX(-Math.PI / 2), M('#c84a3a', { roughness: 0.8 }), false, true); plaza.position.set(0, 0.03, -40); plaza.userData.sink = true; g.add(plaza);
    for (let z = 20; z > -500; z -= 9) for (const x of [-7.5, 7.5]) { const d = mesh(new THREE.PlaneGeometry(0.2, 3).rotateX(-Math.PI / 2), M('#e8e6df'), false, true); d.position.set(x, 0.04, z); d.userData.sink = true; g.add(d); } }
  else for (const x of [-4, -2.6]) { const rail = mesh(new THREE.BoxGeometry(0.12, 0.08, 900), M('#3a3a3a', { metalness: 0.6 })); rail.position.set(x, 0.05, -380); rail.userData.sink = true; g.add(rail); }
}
function buildings(g, old) {
  const texs = old ? ['#8a4a34', '#9a5a3c', '#7a3e2e', '#a8846a', '#b89a7a'].map(c => facadeTex(c, '#2a2420', 0.05, 6, 8)) : ['#3a4450', '#5a6470', '#2a3038', '#6a6a70', '#4a5560'].map(c => facadeTex(c, '#1a2028', 0.55, 8, 14));
  for (const s of [-1, 1]) { let z = 22;
    while (z > -470) { const len = R(14, 28), h = old ? R(14, 30) : R(45, 190), d = 30; const x = s * (STREET_W / 2 + d / 2), cz = z - len / 2;
      const tx = pick(texs).clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(Math.max(1, len / 14), Math.max(1, h / (old ? 24 : 40)));
      const mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85, emissive: old ? '#000000' : '#ffffff', emissiveMap: old ? null : tx, emissiveIntensity: old ? 0 : 0.35 });
      const b = mesh(BOX, mat); b.scale.set(d, h, len - 0.6); b.position.set(x, h / 2, cz); g.add(b);
      if (old) { bx(d + 0.8, 0.8, len - 0.2, '#d8c8a8', x, h, cz, g); if (rnd() < 0.35) { const sg = canvasTex(256, 64, (gg, w, hh) => { gg.fillStyle = pick(['#f2e8d0', '#2a3a2a', '#5a2a1a']); gg.fillRect(0, 0, w, hh); gg.fillStyle = gg.fillStyle === '#f2e8d0' ? '#3a2a1a' : '#f2e8d0'; gg.font = '700 30px "Source Serif 4"'; gg.textAlign = 'center'; gg.fillText(pick(['HOTEL', 'THEATRE', 'CIGARS', 'OYSTERS', 'HARDWARE', 'CAFE']), w / 2, 44); });
          const p = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(12, len - 2), 3), new THREE.MeshStandardMaterial({ map: sg })); p.position.set(s * (STREET_W / 2 - 0.05), R(4.5, 8), cz); p.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(p); } }
      else { const nB = 1 + Math.floor(rnd() * 3); for (let k = 0; k < nB; k++) { const bw = Math.min(len - 2, R(9, 20)), bh = R(8, 26), y = R(7, Math.min(h - bh / 2 - 2, 80)); if (y < bh / 2 + 4) continue;
          const p = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), pick(bbMats)); p.position.set(s * (STREET_W / 2 - 0.1 - k * 0.02), y, cz + R(-1, 1)); p.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(p); } }
      z -= len; } }
  // the tower at the end of the square (One Times Square / the 1904 Times Building), splitting the street
  const tw = new THREE.Group(); tw.position.set(0, 0, -190); g.add(tw);
  if (old) { const tx = facadeTex('#d8ccb0', '#4a4438', 0.0, 4, 26); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; const b = mesh(BOX, new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); b.scale.set(16, 111, 22); b.position.y = 55.5; tw.add(b);
    bx(17, 3, 23, '#c8bca0', 0, 111, 0, tw); bx(0.4, 14, 0.4, '#3a3a3a', 0, 118, 0, tw); const flag = bx(5, 3, 0.1, '#c83a2a', 2.6, 123, 0, tw); }
  else { const b = mesh(BOX, M('#2a2c32')); b.scale.set(16, 111, 22); b.position.y = 55.5; tw.add(b);
    for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(15, 14), pick(bbMats)); p.position.set(0, 14 + k * 15, 11.05); tw.add(p); }
    bx(0.6, 12, 0.6, '#9a9a9a', 0, 117, 0, tw); const ball = mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.6), fog: false })); ball.position.y = 124; tw.add(ball); }
}
function crowd(g, n, old) { const list = [];
  for (let i = 0; i < n; i++) { const opts = old ? { top: pick(['#2a2a2e', '#3a3028', '#4a3a2a', '#1e2230', '#5a4a3a', '#e8e0d0']), bottom: pick(['#2a2a2e', '#3a3028', '#1e1e22']), cap: rnd() < 0.5, dress: rnd() < 0.3, shorts: false } : {};
    const p = makePerson(rnd, opts); p.outer.userData.anim = true; g.add(p.outer); const onSide = rnd() < 0.6; const side = rnd() < 0.5 ? -1 : 1;
    list.push({ p, x: onSide ? side * R(13.5, 16.5) : R(-6, 6), z0: R(-260, 25), v: (rnd() < 0.5 ? 1 : -1) * R(1.0, 1.5), ph: R(0, 6), idle: rnd() < 0.25 }); }
  return list; }
function poseCrowd(list, t) { for (const c of list) { const z = c.idle ? c.z0 : wrapR(c.z0 + c.v * t, -260, 25); c.p.outer.position.set(c.x, 0.95 + (Math.abs(c.x) > 12 ? 0.2 : 0), z); c.p.outer.rotation.y = c.idle ? c.ph : (c.v > 0 ? 0 : Math.PI); if (c.idle) poseIdle(c.p, t, c.ph); else poseWalk(c.p, t * 5.5 + c.ph); c.p.outer.userData.poseHidden = Math.hypot(c.x - cam.position.x, z - cam.position.z) < 3.5; } }
{ const g = eraGroup('now'); terrain(g, () => -0.05, (c, x, y, z) => c.set('#5a5a5c'), { raw: true }); streetBase(g, false); buildings(g, false); ERA.now.crowd = crowd(g, 160, false);
  ERA.now.taxis = [];
  for (let i = 0; i < 16; i++) { const tg = new THREE.Group(); const y = M('#f2c12e', { roughness: 0.35, metalness: 0.3 }); bx(4.4, 0.75, 1.85, y, 0, 0.7, 0, tg); bx(2.4, 0.6, 1.7, y, -0.2, 1.35, 0, tg); bx(2.3, 0.5, 1.75, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.2, 1.35, 0, tg); bx(0.6, 0.2, 0.3, M('#fff6d8', { emissive: '#fff6d8', emissiveIntensity: 1 }), -0.2, 1.75, 0, tg);
    for (const [wx, wz] of [[1.4, 0.85], [1.4, -0.85], [-1.4, 0.85], [-1.4, -0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).rotateX(Math.PI / 2), M('#151515')); w.position.set(wx, 0.34, wz); tg.add(w); }
    tg.rotation.y = Math.PI / 2; tg.userData.anim = true; g.add(tg); ERA.now.taxis.push({ g: tg, x: pick([-10.5, -13, 10.5]) , z0: R(-500, 20), v: R(4, 9) }); }
  ERA.now.look = { top: '#10143a', bot: '#d8705a', sunDir: V3(0.6, 0.02, -1), sunCol: '#ff9a60', sunSize: 0.0, fog: '#3a3048', fogN: 200, fogF: 1800, hemiS: '#6a70a8', hemiG: '#ff8a5a', hemiI: 1.0, sunC: '#ffb080', sunI: 0.6, sunPos: V3(200, 60, -100), exp: 1.15, camY: 1.7 }; }
{ const g = eraGroup('old'); terrain(g, () => -0.05, (c, x, y, z) => c.set('#8a7e6c'), { raw: true }); streetBase(g, true); buildings(g, true); ERA.old.crowd = crowd(g, 70, true);
  ERA.old.carts = [];
  for (let i = 0; i < 6; i++) { const cg = new THREE.Group(); const hb = M('#5a3a24', { flatShading: true }); const horse = mesh(new THREE.BoxGeometry(2.0, 0.8, 0.6), hb); horse.position.set(2.2, 1.5, 0); cg.add(horse);
    const hh = mesh(new THREE.BoxGeometry(0.8, 0.35, 0.3), hb); hh.position.set(3.3, 2.1, 0); hh.rotation.z = 0.6; cg.add(hh);
    const legs = []; for (const [lx, lz] of [[2.9, 0.2], [2.9, -0.2], [1.5, 0.2], [1.5, -0.2]]) { const l = new THREE.Group(); l.position.set(lx, 1.1, lz); cg.add(l); const lm = mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), hb); lm.position.y = -0.55; l.add(lm); legs.push(l); }
    bx(2.4, 1.3, 1.6, M('#1e1e22', { flatShading: true }), -0.6, 1.5, 0, cg); bx(2.6, 0.1, 1.8, '#3a2a1a', -0.6, 2.2, 0, cg);
    for (const [wx, wz] of [[0.3, 0.85], [0.3, -0.85], [-1.4, 0.85], [-1.4, -0.85]]) { const w = mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 14), M('#3a2a1a')); w.position.set(wx, 0.55, wz); cg.add(w); }
    cg.rotation.y = Math.PI / 2; cg.userData.anim = true; g.add(cg); ERA.old.carts.push({ g: cg, legs, x: pick([-10, 9, 12]), z0: R(-300, 10), v: R(2.0, 3.2) * (rnd() < 0.5 ? 1 : -1) }); }
  const trolley = new THREE.Group(); bx(2.4, 2.6, 10, M('#9a2a1e', { flatShading: true }), 0, 1.8, 0, trolley); bx(2.45, 0.9, 9.6, M('#e8dcc0'), 0, 2.4, 0, trolley); bx(2.6, 0.2, 10.4, '#3a2a1a', 0, 3.2, 0, trolley); trolley.position.set(-3.3, 0, -60); trolley.userData.anim = true; g.add(trolley); ERA.old.trolley = trolley;
  ERA.old.look = { top: '#8aa8c8', bot: '#efe2c8', sunDir: V3(0.5, 0.5, -1), sunCol: '#fff4e0', sunSize: 0.003, fog: '#e2d6c0', fogN: 150, fogF: 1400, hemiS: '#efe6d8', hemiG: '#7a6a5a', hemiI: 1.1, sunC: '#fff0d8', sunI: 2.6, sunPos: V3(200, 260, -120), exp: 1.0, camY: 1.7 }; }
