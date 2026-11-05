// =================== THE STORM: rain, lightning, wet reflections, rising floodwater; the sets (NYC avenue + subway re-lit for a storm, a flooded apartment with mould,
// Sacramento 1862 in sepia, the California map with the 300-mile lake, the Empire State Building next to a year of rain, and the sunny cloud deck above it all) ===================
// ---- shared: a dark storm environment for reflections (dark sky + warm street lamps + neon), ripple normal map, lightning ----
function envFrom(cols) { const es = new THREE.Scene(); const g = new THREE.SphereGeometry(50, 32, 16);
  es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTex(16, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, cols[0]); gr.addColorStop(0.55, cols[1]); gr.addColorStop(1, cols[2]); c.fillStyle = gr; c.fillRect(0, 0, w, h); }) })));
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, m = new THREE.Mesh(new THREE.SphereGeometry(1.6 + 2 * hash(i), 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(...[[3, 2.2, 1.2], [3, 0.6, 0.5], [0.6, 1.4, 3], [2.6, 2.4, 0.6]][i % 4]) })); m.position.set(Math.cos(a) * 40, 2 + 10 * hash(i * 3), Math.sin(a) * 40); es.add(m); }
  const pm = new THREE.PMREMGenerator(renderer); const tex = pm.fromScene(es, 0.02).texture; pm.dispose(); return tex; }
const STORM_ENV = envFrom(['#0a0e16', '#202838', '#3a3a44']);
const RIPPLE = (() => { const t = canvasTex(256, 256, (g, w, h) => { const id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let nx = 0, ny = 0; for (let k = 0; k < 6; k++) { const cx = hash(k * 3.1) * w, cy = hash(k * 5.7) * h, d = Math.hypot(((x - cx + w * 1.5) % w) - w / 2, ((y - cy + h * 1.5) % h) - h / 2);
        const s = Math.sin(d * 0.35) * Math.exp(-d * 0.02); nx += s * (x - cx) / (d + 1); ny += s * (y - cy) / (d + 1); }
      const i = (y * w + x) * 4; id.data[i] = 128 + 60 * nx; id.data[i + 1] = 128 + 60 * ny; id.data[i + 2] = 255; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0); }); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const FLASHES = [1.25, 9.55, 21.6, 30.3, 44.4, 49.6];
function flash(t) { let f = 0; for (const a of FLASHES) { const u = t - a; if (u > 0 && u < 0.5) f = Math.max(f, (u < 0.06 ? 1 : u < 0.12 ? 0.3 : u < 0.18 ? 0.9 : Math.exp(-(u - 0.18) * 9))); } return f; }
function waterMat(col = '#25343a', rep = 30) { const n = RIPPLE.clone(); n.repeat.set(rep, rep); n.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color: col, roughness: 0.05, metalness: 0.25, envMap: STORM_ENV, envMapIntensity: 1.2, normalMap: n, normalScale: new THREE.Vector2(0.6, 0.6), transparent: true, opacity: 0.93 }); }
// storm re-light of a set: sky gradient, fog, hemisphere, sun; lightning brightens the hemisphere + a cold top light
function storm(S, { top = '#121a26', bot = '#3a4452', fog = 0x323a46, near = 25, far = 240, hemi = 0.55, sun = 0.25 } = {}) { const sc = S.sc;
  const sky = sc.children.find(o => o.isMesh && o.material.isMeshBasicMaterial && o.geometry.type === 'SphereGeometry');
  if (sky) sky.material.map = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.fog.color.set(fog); sc.fog.near = near; sc.fog.far = far; const hl = sc.children.find(o => o.isHemisphereLight); hl.color.set('#8a9ab8'); hl.groundColor.set('#1a1c22'); hl.intensity = hemi;
  if (sc.userData.sun) { sc.userData.sun.intensity = sun; sc.userData.sun.color.set('#9ab0d0'); }
  const bolt = new THREE.DirectionalLight(0xd8e4ff, 0); bolt.position.set(-20, 60, 10); sc.add(bolt);
  sc.userData.storm = { sky, hl, hemi, bolt, skyCol: new THREE.Color(1, 1, 1) }; sc.environment = STORM_ENV; return S; }
function stormTick(S, t) { const s = S.sc.userData.storm; if (!s) return; const f = flash(t); s.hl.intensity = s.hemi + 2.4 * f; s.bolt.intensity = 5 * f; if (s.sky) s.sky.material.color.setScalar(1 + 3 * f); }
// rain: thin streaks in a box that follows the camera (falls 9 m/s, slightly slanted by wind), + splash rings on the ground/water around the camera
const RAINM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.62, 0.68, 0.8), transparent: true, opacity: 0.22, depthWrite: false, fog: false });
const RINGM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.8, 0.9), transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
function makeRain(sc, n = 2600, rings = 260) { const r = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 1, 0.008), RAINM, n); r.frustumCulled = false; sc.add(r);
  const g = new THREE.InstancedMesh(new THREE.RingGeometry(0.7, 1.0, 16).rotateX(-Math.PI / 2), RINGM, rings); g.frustumCulled = false; sc.add(g); return { r, g, n, rings }; }
function rainTick(R, cam, t, o = {}) { const S = o.size || 14, Hh = o.height || 14, L = o.len || 0.55, gy = o.ground ?? 0, on = o.on ?? 1, c = cam.position;
  for (let i = 0; i < R.n; i++) { const hx = hash(i * 1.71), hz = hash(i * 2.93), hy = hash(i * 3.37); const fall = (hy * Hh + t * 9.5) % Hh;
    const x = c.x + (((hx * S - c.x) % S + S) % S) - S / 2, z = c.z + (((hz * S - c.z) % S + S) % S) - S / 2, y = c.y + Hh / 2 - fall;
    _o.position.set(x + 0.15 * (y - c.y), on > hash(i * 7.7) ? y : -999, z); _o.rotation.set(0, 0, 0.15); _o.scale.set(o.thick || 1, L, o.thick || 1); _o.updateMatrix(); R.r.setMatrixAt(i, _o.matrix); }
  R.r.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < R.rings; i++) { const ph = (t * 2.2 + hash(i * 5.1)) % 1, cyc = Math.floor(t * 2.2 + hash(i * 5.1)); const x = c.x + (hash(i * 3.3 + cyc * 1.7) - 0.5) * (o.ringR || 12), z = c.z + (hash(i * 4.9 + cyc * 2.3) - 0.5) * (o.ringR || 12);
    _o.position.set(x, (typeof gy === 'function' ? gy(x, z) : gy) + 0.02, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(0.02 + 0.1 * ph); _o.updateMatrix(); R.g.setMatrixAt(i, _o.matrix); }
  R.g.instanceMatrix.needsUpdate = true; RINGM.opacity = 0.28 * (1 - 0.0) * (o.on ?? 1); }

// ---------- 1) NEW YORK IN THE STORM (the gone-video avenue): wet street, lamps, cabs, rising water, the overflowing storm drain, you under an umbrella ----------
storm(NYC, { near: 20, far: 230 });
for (const w of NY.walkers) w.p.outer.visible = false;
for (const o of [HW.car, HW.bikeA, HW.bikeB, ...HW.smoke, WHS.box, ...WHS.slips]) o.visible = false;
NYC.sc.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
  for (const m of ms) { if (!m.isMeshStandardMaterial) continue; const y = o.position.y;
    if (m.color && m.color.getHexString() === '4a4c54') { m.roughness = 0.1; m.metalness = 0.15; m.color.set('#2a2c32'); }   // the asphalt: soaked, mirror-ish
    else if (m.color && ['b8b4ac', 'd0ccc4'].includes(m.color.getHexString())) { m.roughness = 0.25; m.color.set('#6a6a6e'); }   // sidewalks + curbs, dark and wet
    if (m.map && m.map.repeat && o.geometry.type === 'BoxGeometry' && !m.userData.lit) { m.emissiveMap = m.map; m.emissive = new THREE.Color(0.9, 0.7, 0.45); m.emissiveIntensity = 0.22; m.userData.lit = 1; } } });
NY.lampL = []; for (let k = 0; k < 7; k++) { const L = new THREE.PointLight(0xffd8a0, 26, 22, 1.6); L.position.set((k % 2 ? 1 : -1) * 4.0, 6.0, 40 - k * 20); NYC.sc.add(L); NY.lampL.push(L); }
NY.rain = makeRain(NYC.sc);
NY.flood = mesh(new THREE.PlaneGeometry(40, 1400), waterMat('#26343a', 140), false, true); NY.flood.rotation.x = -Math.PI / 2; NY.flood.position.set(0, -1, -500); NYC.sc.add(NY.flood);
// the storm drain at the curb (x = 6.9) that overflows: grate + a geyser of droplets + a spreading foam disc
NY.drainP = V3(6.75, 0, 3.0); bx(0.5, 0.06, 1.0, '#141518', NY.drainP.x, 0.02, NY.drainP.z, NYC.sc); for (let k = 0; k < 6; k++) bx(0.46, 0.065, 0.04, '#2a2c30', NY.drainP.x, 0.03, NY.drainP.z - 0.42 + k * 0.17, NYC.sc);
NY.spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.9, 1.0), transparent: true, opacity: 0.55, depthWrite: false }), 600); NY.spray.frustumCulled = false; NYC.sc.add(NY.spray);
NY.foam = mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: '#9aa8b0', roughness: 0.3, transparent: true, opacity: 0.55 }), false, true); NY.foam.rotation.x = -Math.PI / 2; NYC.sc.add(NY.foam);
// your umbrella (canopy + shaft), held in the right hand
const UMB = new THREE.Group(); { const can = mesh(new THREE.SphereGeometry(0.62, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: '#1e2a48', roughness: 0.35, side: THREE.DoubleSide, envMap: STORM_ENV })); can.position.y = 0.72; can.scale.y = 0.55; UMB.add(can);
  const sh = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 6), M('#2a2a2e')); sh.position.y = 0.3; UMB.add(sh); const hk = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 10, Math.PI), M('#5a3a2a')); hk.position.y = -0.17; UMB.add(hk); }
NYC.sc.add(UMB);
const wlNYC = t => t < RIVER ? -1 : t < SUBWAY ? lerp(0.0, 0.95, smooth(RIVER, SUBWAY - 0.5, t)) : t < AERIAL ? 0.95 : lerp(1.2, 4.2, smooth(AERIAL, AERIAL + 4.5, t));
function updateStormNYC(t, cam) { stormTick(NYC, t); const wl = wlNYC(t);
  NY.flood.position.y = wl; NY.flood.visible = wl > -0.5; NY.flood.material.normalMap.offset.set(t * 0.02, -t * 0.35);
  rainTick(NY.rain, cam, t, { size: cam.position.y > 15 ? 60 : 14, height: cam.position.y > 15 ? 70 : 14, len: cam.position.y > 15 ? 3 : 0.55, thick: cam.position.y > 15 ? 6 : 1, ground: x => Math.max(Math.abs(x) > 7.1 ? 0.16 : 0, wl) });
  NY.cabs.forEach((c, i) => { const u = c.userData; c.visible = true; let y = 0, rx = 0, rz = 0, dz = 0;
    if (wl > 0.55) { const fl = smooth(0.55, 0.9, wl); y = (wl - 0.45) * fl + 0.05 * Math.sin(t * 1.7 + i); rx = 0.06 * Math.sin(t * 1.3 + i) * fl; rz = 0.08 * Math.sin(t * 1.1 + i * 2) * fl; dz = (t - RIVER - 3) * 0.6 * fl * (i % 3 ? 1 : -0.6); }
    c.position.set(u.lane + 0.3 * Math.sin(i + t * 0.3) * (wl > 0.55 ? 1 : 0), y, u.z0 + (t < RIVER ? u.v * 5 * t : u.v * 5 * RIVER) + dz); c.rotation.set(rx, (u.lane > 0 ? Math.PI : 0) + (wl > 0.55 ? u.abandon * 0.5 * smooth(0.6, 0.9, wl) : 0), rz); });
  const g = clamp((t - DRAIN - 0.4) / 0.6, 0, 1) * (t < SUBWAY ? 1 : 0);
  for (let k = 0; k < 600; k++) { const ph = (t * 1.6 + hash(k * 3.3)) % 1, v = 3.0 + 2.0 * hash(k * 5.1), a = hash(k * 7.7) * 6.28, s = 0.3 * hash(k * 9.1);
    if (g > 0 && wl < 0.4) { const yy = v * ph * 1.1 - 4.9 * ph * ph * 0.9; _o.position.set(NY.drainP.x + Math.cos(a) * s * ph * 1.6, Math.max(0.02, yy) * g, NY.drainP.z + Math.sin(a) * s * ph * 2.4); _o.scale.setScalar(0.6 + hash(k) * 0.8); } else { _o.position.set(0, -50, 0); _o.scale.setScalar(0.001); }
    _o.updateMatrix(); NY.spray.setMatrixAt(k, _o.matrix); } NY.spray.instanceMatrix.needsUpdate = true;
  NY.foam.visible = g > 0 && wl < 0.3; NY.foam.position.set(NY.drainP.x - 1.0, 0.03, NY.drainP.z); NY.foam.scale.setScalar(0.4 + 3.2 * smooth(DRAIN, RIVER, t)); }

// ---------- 2) THE SUBWAY ENTRANCE (gone-video set) in the storm: water pours down the stairs ----------
storm(SUB, { near: 20, far: 150 }); SB.rain = makeRain(SUB.sc);
SUB.sc.traverse(o => { if (o.isMesh && o.material && o.material.color && ['b8b4ac', '5a5c64'].includes(o.material.color.getHexString())) { o.material.roughness = 0.15; o.material.envMap = STORM_ENV; } });
SB.fall = mesh(new THREE.PlaneGeometry(2.0, 4.6, 1, 20), waterMat('#3a4a52', 6), false, true); SB.fall.material.opacity = 0.8; SUB.sc.add(SB.fall);
{ const P = SB.fall.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const v = (P.getY(i) + 2.3) / 4.6; P.setXYZ(i, P.getX(i), 0.25 - v * 3.0, -2.0 + v * 4.3); } P.needsUpdate = true; SB.fall.geometry.computeVertexNormals(); }   // a sheet down the steps
function updateStormSUB(t, cam) { stormTick(SUB, t); rainTick(SB.rain, cam, t, { ground: 0.2 }); SB.fall.material.normalMap.offset.set(0, -t * 1.8); SB.fall.visible = true;
  const wl = lerp(-3.0, -0.4, smooth(SUBWAY, MOLD, t)); SB.water.position.set(0, wl, 0); SB.sheet.visible = false; }

// ---------- 3) THE FLOODED APARTMENT: water on the floor, rain on the window, mould spreading over the wall (time-lapse) ----------
const APT = mkSet({ top: '#2a3240', bot: '#4a5260', fog: 0x2a2e36, near: 20, far: 60, hemi: [0x8a9ab8, 0x2a2420, 0.55], sun: [0x9ab0d0, 0.6, V3(-6, 6, 4)], shadow: 6 }); storm(APT, { near: 20, far: 60, hemi: 0.5, sun: 0.4 });
const AP = {}; { const sc = APT.sc, wall = F_('#c8bca8'), wood = F_('#7a5a3a');
  gplane(sc, 7, 7, wood, 0, 0); bx(7, 0.1, 7, '#d8d2c8', 0, 2.9, 0, sc); bx(0.1, 2.9, 7, wall, -3.5, 1.45, 0, sc); bx(7, 2.9, 0.1, wall, 0, 1.45, -3.5, sc);
  bx(0.1, 2.9, 2.6, wall, 3.5, 1.45, -2.2, sc); bx(0.1, 2.9, 2.6, wall, 3.5, 1.45, 2.2, sc); bx(0.1, 0.8, 1.8, wall, 3.5, 0.4, 0, sc); bx(0.1, 0.5, 1.8, wall, 3.5, 2.65, 0, sc);   // window in the +x wall
  const win = mesh(new THREE.PlaneGeometry(1.8, 1.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a2230'); gr.addColorStop(1, '#3a4452'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,${200 + 40 * hash(i)},150,${0.5 + 0.4 * hash(i * 2)})`; g.fillRect(hash(i * 3) * w, 120 + hash(i * 5) * 120, 6, 8); } }), color: new THREE.Color(1.2, 1.2, 1.3) }), false, false);
  win.rotation.y = -Math.PI / 2; win.position.set(3.55, 1.6, 0); sc.add(win); AP.win = win;
  AP.streaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.01, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.9), transparent: true, opacity: 0.5 }), 90); AP.streaks.frustumCulled = false; sc.add(AP.streaks);
  const couch = new THREE.Group(); bx(2.2, 0.45, 0.9, '#5a6a8a', 0, 0.35, 0, couch); bx(2.2, 0.6, 0.25, '#5a6a8a', 0, 0.7, -0.35, couch); for (const x of [-1.05, 1.05]) bx(0.2, 0.55, 0.9, '#5a6a8a', x, 0.45, 0, couch); couch.position.set(-1.2, 0, -2.6); sc.add(couch);
  bx(1.0, 0.45, 0.6, '#8a6a4a', -1.2, 0.22, -1.2, sc); const lampP = new THREE.PointLight(0xffc888, 6, 8, 1.5); lampP.position.set(-2.8, 1.9, -2.8); sc.add(lampP); const sh = mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.3, 14), new THREE.MeshStandardMaterial({ color: '#f4e4c4', emissive: '#ffcf88', emissiveIntensity: 0.8 })); sh.position.set(-2.8, 1.75, -2.8); sc.add(sh);
  const art = canvasTex(128, 96, (g, w, h) => { g.fillStyle = '#e8d8b8'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a7ab8'; g.fillRect(8, 8, w - 16, 44); g.fillStyle = '#5a8a4a'; g.fillRect(8, 52, w - 16, 36); });
  const pic = mesh(new THREE.PlaneGeometry(1.0, 0.75), new THREE.MeshStandardMaterial({ map: art }), false, false); pic.position.set(0.6, 1.8, -3.44); sc.add(pic);
  AP.flood = mesh(new THREE.PlaneGeometry(7, 7), waterMat('#3a3a30', 6), false, true); AP.flood.rotation.x = -Math.PI / 2; AP.flood.position.y = 0.32; sc.add(AP.flood);
  const moldT = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 260; i++) { const a = hash(i) * 6.28, r = Math.pow(hash(i * 2), 0.6) * 110, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r, s = 3 + 14 * hash(i * 3) * (1 - r / 130);
      const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(${20 + 30 * hash(i * 5)},${40 + 30 * hash(i * 7)},${20},0.9)`); gr.addColorStop(1, 'rgba(30,40,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, 6.3); g.fill(); } });
  AP.mold = [[-2.2, 0.8, 0.9], [0.4, 0.6, 1.2], [1.8, 1.3, 0.8], [-0.6, 2.2, 0.7], [2.8, 0.5, 1.0]].map(([x, y, s], k) => { const m = mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: moldT, transparent: true, depthWrite: false, roughness: 1 }), false, false);
    m.position.set(x, y, -3.44 + 0.002 * k); m.rotation.z = k; m.userData.s = s; sc.add(m); return m; });
  AP.rain = makeRain(sc, 10, 1); }
function updateAPT(t, cam) { stormTick(APT, t); AP.flood.material.normalMap.offset.set(t * 0.01, t * 0.03);
  for (let i = 0; i < 90; i++) { const ph = (t * 0.5 + hash(i * 3.1)) % 1; _o.position.set(3.5, 2.35 - ph * 1.5, -0.85 + 1.7 * hash(i * 5.3)); _o.rotation.set(0, -Math.PI / 2, 0); _o.scale.set(1, 1 + 2 * hash(i), 1); _o.updateMatrix(); AP.streaks.setMatrixAt(i, _o.matrix); }
  AP.streaks.instanceMatrix.needsUpdate = true; AP.win.material.color.setScalar(1.2 + 3 * flash(t));
  const g = smooth(MOLD + 0.3, AERIAL, t); AP.mold.forEach((m, k) => { const s = m.userData.s * Math.max(0.001, smooth(k * 0.12, 0.55 + k * 0.1, g)); m.scale.set(s, s, 1); }); }

// ---------- 4) SACRAMENTO, JANUARY 1862 (sepia): wooden false-front buildings with water to the porches, a rowboat with the governor in a top hat ----------
const OLDS = mkSet({ top: '#6a6a66', bot: '#a8a49a', fog: 0x8a8880, near: 20, far: 160, hemi: [0xd8d0c0, 0x3a3428, 0.9], sun: [0xe8dcc8, 0.9, V3(-8, 14, 6)], shadow: 16 }); OLDS.sc.environment = STORM_ENV;
const OD = {}; { const sc = OLDS.sc; const woods = ['#8a6a4a', '#a0805a', '#6a5038', '#b8a080', '#7a6a58'], signs = ['HOTEL', 'SALOON', 'GENERAL STORE', 'BANK', 'LIVERY', 'DRY GOODS', 'BAKERY', 'TELEGRAPH'];
  for (const s of [-1, 1]) for (let k = 0; k < 8; k++) { const z = 30 - k * 12, w = 10 + 2 * hash(k + s), h = 7 + 5 * hash(k * 3 + s), col = woods[(k + (s > 0 ? 2 : 0)) % 5];
    const b = new THREE.Group(); b.position.set(s * 11, 0, z); sc.add(b); bx(w * 0.9, h, 8, col, 0, h / 2, 0, b); bx(w * 0.92, 1.5, 0.3, col, 0, h + 0.6, -s * 4.0, b);   // the false front
    const sg = canvasTex(256, 48, (g, ww, hh) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, ww, hh); g.fillStyle = '#2a1e14'; g.font = '700 30px Source Serif 4, serif'; g.textAlign = 'center'; g.fillText(signs[(k * 2 + (s > 0 ? 1 : 0)) % 8], ww / 2, 34); });
    const sp = mesh(new THREE.PlaneGeometry(w * 0.7, 1.1), new THREE.MeshStandardMaterial({ map: sg }), false, false); sp.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; sp.position.set(-s * 4.05, h - 0.6, 0); b.add(sp);
    for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c++) { const wnd = bx(0.05, 1.3, 1.0, '#2a2a28', -s * 4.02, 2.6 + r * 3, c * 2.8, b); }
    bx(2.0, 0.15, w * 0.9, '#5a4430', -s * 4.9, 3.6, 0, b); for (const c of [-1, 1]) bx(0.15, 3.6, 0.15, '#5a4430', -s * 5.8, 1.8, c * w * 0.4, b); }   // porch roofs on posts
  const fl = canvasTex(192, 100, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8202a'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#2a3a7a'; g.fillRect(0, 0, w * 0.4, h * 7 / 13); });
  const pole = mesh(new THREE.CylinderGeometry(0.08, 0.1, 14), M('#d8d0c0')); pole.position.set(-4, 7, -70); sc.add(pole); OD.flag = mesh(new THREE.PlaneGeometry(3, 1.6, 10, 1), new THREE.MeshStandardMaterial({ map: fl, side: THREE.DoubleSide }), false, false); OD.flag.position.set(-2.5, 12.8, -70); sc.add(OD.flag);
  OD.water = mesh(new THREE.PlaneGeometry(80, 300), waterMat('#5a5040', 40), false, true); OD.water.material.opacity = 0.97; OD.water.rotation.x = -Math.PI / 2; OD.water.position.set(0, 1.1, -40); sc.add(OD.water); gplane(sc, 80, 300, '#4a3a2a', 0, -40, 0);
  // the rowboat: hull, two oars, an oarsman rowing, the governor seated in a black coat + top hat
  OD.boat = new THREE.Group(); sc.add(OD.boat); const hull = mesh(new THREE.CylinderGeometry(0.75, 0.55, 4.2, 12, 1, false, 0, Math.PI), F_('#6a4a30')); hull.rotation.set(Math.PI / 2, 0, Math.PI); hull.scale.set(1, 1, 0.55); hull.position.y = 0.3; OD.boat.add(hull);
  for (const z of [-0.6, 0.7]) bx(1.3, 0.06, 0.25, '#7a5a3a', 0, 0.32, z, OD.boat);
  OD.oars = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.7, 0.5, 0.7); const sh = bx(2.4, 0.05, 0.05, '#c8a878', s * 1.1, 0, 0, g); const bl = bx(0.5, 0.03, 0.18, '#c8a878', s * 2.3, 0, 0, g); OD.boat.add(g); return g; });
  const r0 = seed; seed = 1862; OD.oar = makePerson(rnd, { top: '#e8e2d0', bottom: '#3a3028', longSleeve: true, hairStyle: 0.3, cap: false }); OD.gov = makePerson(rnd, { top: '#1a1a1e', bottom: '#1a1a1e', longSleeve: true, hairStyle: 0.2, cap: false, skin: '#e8c4a0' }); seed = r0;
  for (const p of [OD.oar, OD.gov]) OD.boat.add(p.outer);
  const hat = new THREE.Group(); const cr = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 14), M('#121214')); cr.position.y = 0.13; hat.add(cr); const br = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), M('#121214')); hat.add(br); OD.hat = hat; OD.gov.root.add(hat); hat.position.set(0, 1.76, 0);
  OD.rain = makeRain(sc); storm(OLDS, { top: '#5a5a58', bot: '#8a8880', fog: 0x7a7870, near: 20, far: 160, hemi: 0.9, sun: 0.7 }); }
const boatZ = t => 22 - 2.2 * (t - OLD) * (t < ROW ? 1 : 0) - (t >= ROW ? 2.2 * (ROW - OLD) + 1.6 * (t - ROW) : 0);
function updateOLD(t, cam) { stormTick(OLDS, t); OD.water.material.normalMap.offset.set(t * 0.02, -t * 0.05); rainTick(OD.rain, cam, t, { ground: 1.1 });
  OD.boat.position.set(0.5 + 0.4 * Math.sin(t * 0.4), 1.0 + 0.04 * Math.sin(t * 2.1), boatZ(t)); OD.boat.rotation.set(0.02 * Math.sin(t * 1.7), Math.PI + 0.05 * Math.sin(t * 0.6), 0.03 * Math.sin(t * 1.3));
  const ph = t * 3.2; OD.oars.forEach((g, i) => { g.rotation.set(0, (i ? -1 : 1) * 0.6 * Math.sin(ph), (i ? 1 : -1) * (0.25 + 0.15 * Math.cos(ph))); });
  poseSit(OD.oar); OD.oar.outer.position.set(0, seatY(OD.oar, 0.36), 0.75); OD.oar.outer.rotation.set(0, Math.PI, 0); OD.oar.arms.forEach((a, i) => a.rotation.set(-1.3 + 0.5 * Math.sin(ph), 0, (i ? -1 : 1) * 0.3)); OD.oar.elbows.forEach(e => e.rotation.x = -0.6 - 0.5 * Math.cos(ph)); OD.oar.torso.rotation.x = 0.2 * Math.sin(ph);
  poseSit(OD.gov); OD.gov.outer.position.set(0, seatY(OD.gov, 0.36), -0.65); OD.gov.outer.rotation.set(0, Math.PI, 0); OD.gov.arms.forEach(a => a.rotation.set(-0.5, 0, 0)); OD.gov.elbows.forEach(e => e.rotation.x = -1.2);
  const P = OD.flag.geometry.attributes.position; for (let j = 0; j < P.count; j++) { const x = (j % 11) / 10 * 3; P.setZ(j, 0.2 * Math.sin(x * 2.2 - t * 6) * x / 3); } P.needsUpdate = true; }

// ---------- 5) THE CALIFORNIA MAP: the Central Valley fills into a 300-mile lake (us-atlas Albers; lake outline projected with d3-geo, tools in the chat) ----------
const CAL = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, W / H, 1, 5000) }; CAL.sc.background = new THREE.Color('#0c1018');
CAL.sc.add(new THREE.HemisphereLight(0xd8d0c0, 0x2a2420, 1.1)); { const k = new THREE.DirectionalLight(0xf8e8d0, 1.3); k.position.set(-200, 400, 300); CAL.sc.add(k); }
const LAKE = [[52.1, 199.1], [49.8, 219.8], [48.8, 236.2], [46.7, 249.9], [49.9, 265.1], [54.8, 280.7], [60, 296.3], [65.3, 311.8], [70.7, 327.4], [75.5, 334.5], [82.6, 332.7], [80.6, 318.1], [76.9, 303], [69.8, 287], [63, 271], [61.4, 256.3], [60.8, 241.9], [59.4, 227.3], [57.2, 212.4], [54.7, 199.3]];
const CA = { lakeMat: new THREE.MeshStandardMaterial({ color: '#3a8ad8', emissive: '#2a6ab8', emissiveIntensity: 1.1, roughness: 0.2 }) };
async function buildCAL() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json(); const geoms = topo.objects.states.geometries;
  const shp = (polys, depth) => { const shapes = []; for (const poly of polys) { const sh = new THREE.Shape(poly[0].map(([x, y]) => new THREE.Vector2(x, -y))); shapes.push(sh); } const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); return g; };
  for (const name of ['California', 'Nevada', 'Oregon', 'Arizona']) { const f = topojson.feature(topo, geoms.find(g => g.properties.name === name)); const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const m = new THREE.Mesh(shp(polys, name === 'California' ? 6 : 3), new THREE.MeshStandardMaterial({ color: name === 'California' ? '#b8a07a' : '#5a5448', roughness: 0.9 })); CAL.sc.add(m); }
  const lake = new THREE.Shape(LAKE.map(([x, y]) => new THREE.Vector2(x, -y))); const lg = new THREE.ShapeGeometry(lake); lg.rotateX(-Math.PI / 2); CA.lake = new THREE.Mesh(lg, CA.lakeMat); CA.lake.position.y = 6.3; CAL.sc.add(CA.lake);
  CA.clip = new THREE.Plane(V3(0, 0, -1), 0); CA.lakeMat.clippingPlanes = [CA.clip]; renderer.localClippingEnabled = true; }
function updateCAL(t) { if (!CA.lake) return; const k = smooth(MAPC + 0.3, MAPC + 2.6, t); CA.clip.constant = lerp(199, 336, k); }   // the lake floods in from the north (z = albers y) to the south

// ---------- 6) THE EMPIRE STATE BUILDING next to one year of rain (1,460 ft column, MODEL) — midtown in the storm ----------
const ESB = mkSet({ top: '#121a26', bot: '#3a4452', fog: 0x323a46, near: 300, far: 2600, shadow: 300 }); ESB.cam.far = 8000; storm(ESB, { near: 250, far: 2600, hemi: 0.7, sun: 0.35 });
const ES = {}; { const sc = ESB.sc; gplane(sc, 8000, 8000, '#22252c', 0, 0, 0);
  const winT = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#b8b2a4'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 4; x < w; x += 10) { g.fillStyle = hash(x * 0.3 + y) < 0.25 ? '#f8e0a0' : '#2a3038'; g.fillRect(x, y + 2, 4, 5); } }); winT.wrapS = winT.wrapT = THREE.RepeatWrapping;
  const em = (rx, ry) => { const t = winT.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color(0.9, 0.75, 0.5), emissiveIntensity: 0.45, roughness: 0.6 }); };
  const esb = new THREE.Group(); sc.add(esb);
  for (const [w, h, d, y] of [[130, 25, 60, 0], [56, 295, 44, 25], [46, 30, 34, 320], [34, 23, 26, 350], [22, 8, 22, 373]]) { const b = mesh(new THREE.BoxGeometry(w, h, d), em(w / 8, h / 8)); b.position.y = y + h / 2; esb.add(b); }
  const mast = mesh(new THREE.CylinderGeometry(1.2, 5, 62, 10), new THREE.MeshStandardMaterial({ color: '#c8c8cc', metalness: 0.6, roughness: 0.3 })); mast.position.y = 381 + 31; esb.add(mast);
  const tip = mesh(new THREE.SphereGeometry(2.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.5, 0.4) })); tip.position.y = 443; esb.add(tip); ES.esb = esb;
  const T = []; for (let i = 0; i < 260; i++) { const a = hash(i * 1.3) * 6.28, r = 330 + 900 * Math.sqrt(hash(i * 2.7)); const x = Math.cos(a) * r, z = Math.sin(a) * r; if (z > 120 && Math.abs(x) < 380) continue;   // keep the camera corridor (south) clear
    T.push([x, z, 30 + 26 * hash(i * 3), 30 + 26 * hash(i * 5), 40 + 160 * Math.pow(hash(i * 7), 2)]); }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), em(4, 14), T.length); T.forEach(([x, z, w, d, h], k) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.set(w, h, d); _o.updateMatrix(); im.setMatrixAt(k, _o.matrix); }); sc.add(im);
  ES.col = mesh(new THREE.BoxGeometry(60, 1, 60).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#3a7ab8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.78, envMap: STORM_ENV, emissive: '#1a5a9a', emissiveIntensity: 0.9 }), false, false);
  ES.col.position.set(-110, 0, 40); sc.add(ES.col); ES.top = mesh(new THREE.PlaneGeometry(60, 60), waterMat('#4a8ac8', 4), false, false); ES.top.rotation.x = -Math.PI / 2; sc.add(ES.top);
  ES.rain = makeRain(sc, 3000, 1); }
const colH = t => 445 * smooth(YEAR + 0.3, YEAR + 6.5, t);
function updateESB(t, cam) { stormTick(ESB, t); const h = Math.max(0.5, colH(t)); ES.col.scale.y = h; ES.top.position.set(-110, h + 0.2, 40); ES.top.material.normalMap.offset.set(t * 0.05, t * 0.08);
  rainTick(ES.rain, cam, t, { size: 260, height: 300, len: 9, thick: 40, ground: 0 }); }

// ---------- 7) ABOVE THE CLOUDS: the storm from on top, sunshine (the twist) ----------
const SKY = mkSet({ top: '#2a6ad8', bot: '#bcd8f4', fog: 0xd8e8f8, near: 800, far: 6000, hemi: [0xffffff, 0x8a9ab8, 1.2], sun: [0xfff4e0, 2.6, V3(400, 600, -300)], shadow: 10 }); SKY.cam.far = 9000;
const SK = {}; { const sc = SKY.sc; const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#f4f6fa', roughness: 1, flatShading: true }), 1400);
  for (let i = 0; i < 1400; i++) { const x = (hash(i * 1.1) - 0.5) * 7000, z = -6000 + 7000 * hash(i * 2.3), s = 120 + 260 * hash(i * 3.7); _o.position.set(x, -60 + 80 * hash(i * 5.1), z); _o.rotation.set(0, hash(i) * 3, 0); _o.scale.set(s * 1.6, s * 0.5, s); _o.updateMatrix(); puffs.setMatrixAt(i, _o.matrix); }
  sc.add(puffs); SK.gray = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: '#a8b0bc', transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false })); SK.gray.scale.setScalar(30); sc.add(SK.gray); }
function updateSKY(t, cam) { const inCloud = 1 - smooth(TWIST + 0.4, TWIST + 1.8, t); SK.gray.position.copy(cam.position); SK.gray.material.opacity = 0.95 * inCloud; }
