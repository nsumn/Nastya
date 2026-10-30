// =================== THE STREET (g_world, autumn afternoon): you + your friend on the front walk; neighbors walking by and cars driving past vanish in puffs ===================
for (const o of [nb1.outer, nb2.outer, carKeys, eggDrop, ...BAGS, ...eggs, ...splats]) o.visible = false;   // (makeBlock returns {outer, …})
car.traverse(o => { if (o.isGroup && Math.abs(o.rotation.x + 1.25) < 0.01) o.rotation.x = 0; });   // close the SUV hatch
const friend = makeBlock({ head: 'human', body: 'human', fat: true, chubbyHead: true, skin: '#f4caa0', hair: '#c8642a', browCol: '#a04a1e', top: '#d8342a', jeans: true, bottom: '#3d5f8f', shoe: '#2a2a2e', hairStyle: 'mop', freckles: true, eyeS: 0.8, browW: 1.5, blush: 0.6, headS: 0.95, h: 0.86 });
st.add(friend.outer);
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
// a low-poly car body (used on the street, the highway and as wrecks): body, cabin, glass, 4 wheels
function makeCar(col, o = {}) { const g = new THREE.Group(), pm = M(col, { roughness: 0.35, metalness: 0.3, flatShading: true }), dark = M('#1c1e24', { flatShading: true });
  const L = o.L || 4.2, Wd = o.W || 1.8; rb(Wd, 0.7, L, pm, 0, 0.7, 0, g, 0.15); rb(Wd - 0.15, 0.55, L * 0.52, pm, 0, 1.28, -0.1, g, 0.14); rb(Wd - 0.12, 0.42, L * 0.48, M('#2a3440', { roughness: 0.1, flatShading: true }), 0, 1.3, -0.1, g, 0.1);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12), dark); w.rotation.z = Math.PI / 2; w.position.set(x * (Wd / 2 - 0.08), 0.34, z * L * 0.31); g.add(w); }
  for (const x of [-0.6, 0.6]) { const hl = mesh(new THREE.BoxGeometry(0.34, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: '#fff6d8' })); hl.position.set(x, 0.85, L / 2 + 0.01); g.add(hl); }
  return g; }
// neighbors walking on the sidewalk + cars on the road (all vanish between 1.4 s and 3.6 s)
const walkers = [];
{ const r0 = seed; seed = 777;
  for (let i = 0; i < 7; i++) { const p = makePerson(rnd); p.outer.scale.setScalar(1.0); st.add(p.outer); walkers.push({ p, x0: -14 + i * 4.6 + R(-1, 1), z: 8.6 + R(-0.4, 0.5), dir: i % 2 ? 1 : -1, sp: R(1.0, 1.4), ph: R(0, 6), tv: 1.4 + i * 0.3 }); }
  seed = r0; }
const movers = [['#3a6ab8', -30, 12.0, 1, 1.6], ['#e8e4dc', 26, 15.2, -1, 2.3], ['#c8402a', -45, 12.0, 1, 3.0]].map(([c, x0, z, dir, tv]) => { const g = makeCar(c); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; st.add(g); return { g, x0, z, dir, tv }; });
const puffTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 9; i++) { const x = 64 + Math.cos(i * 0.7) * 26 * (i % 3) / 2, y = 64 + Math.sin(i * 1.3) * 22 * (i % 3) / 2, r = 26 + 8 * (i % 3), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
const puffs = []; function puffAt(scene, pos, t, t0, size = 1.6) { const k = (t - t0) / 0.7; if (k < 0 || k > 1) return; let s = puffs.find(p => !p.used && p.scene === scene);
  if (!s) { s = { scene, sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })) }; scene.add(s.sp); puffs.push(s); }
  s.used = true; s.sp.visible = true; s.sp.position.copy(pos); s.sp.scale.setScalar(size * (0.5 + 1.2 * Math.sqrt(k))); s.sp.material.opacity = (1 - k) * (1 - k); s.sp.material.rotation = k * 0.8; }
function puffsReset() { puffs.forEach(p => { p.used = false; p.sp.visible = false; }); }
function updateStreet(t) {
  walkers.forEach(w => { const gone = t >= w.tv; w.p.outer.visible = !gone; const x = w.x0 + w.dir * w.sp * t; w.p.outer.position.set(x, 0.95, w.z); w.p.outer.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; poseWalk(w.p, t * 7 + w.ph, 1);
    puffAt(st, V3(x, 1.0, w.z), t, w.tv, 1.8); });
  movers.forEach(m => { const x = m.x0 + m.dir * 11 * Math.min(t, m.tv); m.g.position.set(x, 0, m.z); m.g.visible = t < m.tv; puffAt(st, V3(x, 1.0, m.z), t, m.tv, 4.5); }); }
