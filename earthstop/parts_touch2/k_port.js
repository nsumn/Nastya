// =================== AIRPORT ARRIVALS + CUT-AWAY GROUND (meters): she walks out of the gate, he runs to her, they hug; the electron push is dialled to 0 %,
// and they sink through the floor and down past the layers of rock (a diorama cut at z = 0.5, so they fall just in front of the cut face) ===================
const port = new THREE.Scene(); port.background = new THREE.Color('#0c0a10'); const ptCam = new THREE.PerspectiveCamera(48, W / H, 0.05, 600);
port.add(new THREE.HemisphereLight(0xf0f4ff, 0x6a6058, 1.0));
{ const s = new THREE.DirectionalLight(0xfff4e0, 1.6); s.position.set(3, 9, 6); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; Object.assign(s.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); port.add(s); }
const ptFill = new THREE.PointLight(0xfff0e0, 3, 12, 1.2); port.add(ptFill);
// terminal: glossy tiles in front of the cut, back wall with tall windows + parked plane, arrivals board, gate doors, ceiling light strips, a few travellers
{ const tile = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.fillStyle = pick(['#d8dce2', '#e2e6ea', '#d2d6dc']); g.fillRect(x + 2, y + 2, 124, 124); } }, [10, 5]);
  const fl = mesh(new THREE.PlaneGeometry(40, 12), M('#ffffff', { map: tile, roughness: 0.25, metalness: 0.1 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -4.5); port.add(fl);
  bx(40, 0.3, 6, '#c8ccd2', 0, -0.15, 3.5, port);   // floor slab in front of the cut (seen from below on the way down)
  bx(40, 7, 0.2, '#e8ecf0', 0, 3.5, -10.5, port); for (let x = -15; x <= 15; x += 3.2) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 5.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.8, 2.2) })); w.position.set(x, 3.2, -10.39); port.add(w); }
  const pl = grp(-3, 0, -16, 0.3, port); bx(14, 1.8, 1.8, '#f4f6f8', 0, 2.6, 0, pl); bx(1.5, 2.4, 0.3, '#2a6ad0', 6.2, 4.4, 0, pl); bx(3, 0.3, 9, '#e8eaee', 0, 2.4, 0, pl);
  const board = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#10141c'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c84a'; g.font = 'bold 34px Inter, sans-serif'; g.fillText('ARRIVALS', 20, 44);
    g.font = '24px Inter, sans-serif'; [['10:05', 'CHICAGO', 'LANDED'], ['10:20', 'DENVER', 'LANDED'], ['10:35', 'MIAMI', 'ON TIME'], ['10:50', 'SEATTLE', 'DELAYED']].forEach((r, i) => { g.fillStyle = '#e8e8e8'; g.fillText(r[0], 20, 94 + i * 40); g.fillText(r[1], 120, 94 + i * 40); g.fillStyle = r[2] === 'DELAYED' ? '#ff6a5a' : '#5fd27a'; g.fillText(r[2], 340, 94 + i * 40); }); });
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: board, color: new THREE.Color(1.3, 1.3, 1.3) })); bd.position.set(1.8, 3.4, -6.0); port.add(bd); bx(0.1, 2.6, 0.1, '#5a5e66', 1.8, 1.3, -6.05, port);
  bx(0.25, 3.2, 0.4, '#8a9098', -4.6, 1.6, -3.0, port); bx(0.25, 3.2, 0.4, '#8a9098', -2.4, 1.6, -3.0, port); bx(2.45, 0.3, 0.4, '#8a9098', -3.5, 3.2, -3.0, port);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#1a3a7a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 34px Inter, sans-serif'; g.fillText('GATE B4  →', 20, 44); }), color: new THREE.Color(1.3, 1.3, 1.3) })); sg.position.set(-3.5, 3.6, -2.95); port.add(sg);
  for (let x = -12; x <= 12; x += 4) { const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 1.9) })); l.position.set(x, 5.8, -3); port.add(l); } }
const travellers = []; for (let k = 0; k < 6; k++) { const p = makePerson(rnd); port.add(p.outer); travellers.push({ p, x: R(-6, 6), z: R(-6, -2.5), ry: R(-1, 1), walk: rnd() < 0.5 }); }
const herP = makeHer(), himP = makeHim(); port.add(herP.outer, himP.outer);
const suitcase = grp(0, 0, 0, 0, port); bx(0.38, 0.55, 0.22, '#d84a6a', 0, 0.33, 0, suitcase); bx(0.02, 0.4, 0.02, '#3a3a40', 0, 0.8, 0, suitcase); for (const x of [-0.13, 0.13]) { const w = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), M('#1a1a1e')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.03, 0); suitcase.add(w); }
// the gap between them: soft sparkles where the two bodies meet
const GSP_N = 120; const gapSpk = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.012, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 2.4, 3.0) }), GSP_N); gapSpk.frustumCulled = false; port.add(gapSpk);
// underground: strata in a cut-away block (front face at z = 0.5), a gas pipe, an ammonite, groundwater
const STRATA = [[0, -2, '#7a5a3a'], [-2, -7, '#a0683a'], [-7, -9, '#4a7ab0'], [-9, -30, '#c8a878'], [-30, -60, '#9a8a80'], [-60, -170, '#8a6a6a']];
for (const [a, b, c] of STRATA) { const tx = canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); speckle(g, w, h, 1600, [new THREE.Color(c).offsetHSL(0, 0, 0.06).getStyle(), new THREE.Color(c).offsetHSL(0, 0, -0.07).getStyle()], 5); }, [10, Math.max(1, (a - b) / 4)]);
  const s = mesh(BOX, M('#ffffff', { map: tx, roughness: 0.95 }), false, true); s.scale.set(40, a - b - 0.02, 10); s.position.set(0, (a + b) / 2 - 0.3, -4.5); port.add(s); }
{ const pipe = mesh(new THREE.CylinderGeometry(0.18, 0.18, 40, 16), M('#e8c040', { metalness: 0.5, roughness: 0.4 })); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, -1.4, 0.45); port.add(pipe);
  const am = mesh(new THREE.TorusGeometry(0.5, 0.18, 10, 40, Math.PI * 3.4), M('#e8d8b8', { roughness: 0.7 })); am.position.set(1.6, -16, 0.55); am.scale.set(1, 1, 0.5); port.add(am);
  for (let i = 0; i < 40; i++) { const r = mesh(new THREE.DodecahedronGeometry(R(0.15, 0.5), 0), M(pick(['#6a5a50', '#8a7a6a', '#5a4a44']), { flatShading: true })); r.position.set(R(-6, 6), R(-160, -12), 0.55); port.add(r); } }
// her walk out of the gate, his run, the hug; after OFF they sink (they fall from SINK-0.6 with g scaled for drama)
const hugAt = HUG + 1.6, fallT0 = OFF + 2.4, fallY = t => t < fallT0 ? 0 : -3.2 * (t - fallT0) ** 2;
function updatePort(t) { travellers.forEach((T, k) => { const P = T.p; P.root.rotation.set(0, 0, 0); if (T.walk) { const x = wrapR(T.x + (k % 2 ? 1 : -1) * (t - HUG) * 1.1, -9, 9); P.outer.position.set(x, 0.95, T.z); P.outer.rotation.set(0, k % 2 ? Math.PI / 2 : -Math.PI / 2, 0); poseWalk(P, t * 7 + k, 1); } else { P.outer.position.set(T.x, 0.95, T.z); P.outer.rotation.set(0, T.ry, 0); poseIdle(P, t, k); } });
  const H1 = herP, H2 = himP; for (const P of [H1, H2]) { P.root.rotation.set(0, 0, 0); P.outer.rotation.set(0, 0, 0); }
  const fy = fallY(t);
  if (t < hugAt) { const k = clamp((t - HUG) / 1.6, 0, 1);
    H1.outer.position.set(lerp(-3.4, -0.2, ease(k)), 0.95, lerp(-2.6, 0.9, ease(k))); H1.outer.rotation.y = Math.atan2(3.2, 3.5); poseWalk(H1, t * 8, 1); H1.arms[1].rotation.x = 0.3;
    H2.outer.position.set(lerp(3.6, 0.2, ease(k)), 0.95, 0.9); H2.outer.rotation.y = -Math.PI / 2; poseWalk(H2, t * 13, 1.3);
    suitcase.position.set(H1.outer.position.x - 0.35, 0, H1.outer.position.z - 0.25); }
  else { const sq = smooth(hugAt, hugAt + 0.4, t); H1.outer.position.set(-0.17, 0.95 + fy, 0.9); H1.outer.rotation.y = Math.PI / 2; H2.outer.position.set(0.17, 0.95 + fy, 0.9); H2.outer.rotation.y = -Math.PI / 2;
    for (const P of [H1, H2]) { poseIdle(P, t, 0); P.arms[0].rotation.set(-1.45 * sq, 0, 0.55 * sq); P.arms[1].rotation.set(-1.25 * sq, 0, -0.5 * sq); P.elbows[0].rotation.x = -1.1 * sq; P.elbows[1].rotation.x = -1.2 * sq; }
    H1.root.rotation.x = 0.04 * Math.sin(t * 2); suitcase.position.set(-0.8, 0, 0.4); }
  const spk = smooth(hugAt + 0.8, hugAt + 1.6, t) * (1 - smooth(OFF + 1.2, OFF + 2.2, t));
  for (let i = 0; i < GSP_N; i++) { const a = i * 2.39, h = 1.0 + (i / GSP_N) * 0.62; _o2.position.set(0.0 + 0.012 * Math.sin(t * 5 + i), h + fy, 0.9 + Math.sin(a) * 0.16); _o2.rotation.set(t * 3 + i, t * 2, 0);
    _o2.scale.setScalar(Math.max(0.0001, spk * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)))); _o2.updateMatrix(); gapSpk.setMatrixAt(i, _o2.matrix); } gapSpk.instanceMatrix.needsUpdate = true;
  ptFill.position.set(1.0, 1.8 + fy, 3.0); }
function portCamera(t) { const fy = fallY(t); let pos, look;
  if (t < OFF) { const k = smooth(HUG - 0.5, OFF, t); pos = V3(lerp(1.6, 0.9, k), lerp(1.7, 1.55, k), lerp(5.8, 3.4, k)); look = V3(0, 1.25, lerp(-0.5, 0.6, k)); }
  else { const k = smooth(OFF, OFF + 2.0, t); pos = V3(lerp(0.9, 1.4, k), 1.55 + fy * 0.96 + lerp(0, 0.6, smooth(fallT0, SINK + 1, t)), lerp(3.4, 4.6, k)); look = V3(0, 1.2 + fy, 0.6); }
  ptCam.position.copy(pos); ptCam.lookAt(look); }
