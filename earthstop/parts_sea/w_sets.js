// =================== SETS (each its own scene + camera; you are re-parented into whichever set is shot) ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false })));
  sc.fog = new THREE.Fog(fog, near, far); const hm = new THREE.HemisphereLight(...hemi); sc.add(hm);
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 80 }); sc.add(s, s.target); sc.userData.sun = s; sc.userData.hemi = hm;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D(), _c = new THREE.Color();
// bake a group (people.js person, makeCar…) into ONE geometry with vertex colours, so thousands can be instanced cheaply
const BAKE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
function bake(group) { group.updateMatrixWorld(true); const gs = [];
  group.traverse(o => { if (!o.isMesh || !o.visible) return; let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.color) { const c = (Array.isArray(o.material) ? o.material[0] : o.material).color || new THREE.Color(1, 1, 1), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    gs.push(g); }); return mergeGeometries(gs); }
// the crowd: 12 beachgoers (people.js, built from simple shapes like on our streets) × 4 poses
const POSES = ['stand', 'jump', 'hug', 'walk'], NV = 12;
const PEOPLE_GEO = (() => { const r0 = seed; seed = 777; const out = [];
  for (let v = 0; v < NV; v++) { const o = { shorts: v % 3 !== 0, longSleeve: false, dress: v % 5 === 4 }; const s0 = seed; const row = [];
    for (const ps of POSES) { seed = s0; const p = makePerson(rnd, o); poseIdle(p, 0, 0);
      if (ps === 'jump') { p.arms.forEach((a, i) => a.rotation.set(-2.9, 0, i ? -0.35 : 0.35)); p.elbows.forEach(e => e.rotation.x = -0.15); p.legs.forEach((l, i) => l.rotation.x = i ? 0.35 : -0.15); p.knees.forEach(k => k.rotation.x = 0.7); }
      if (ps === 'hug') { p.arms.forEach((a, i) => a.rotation.set(-0.9, 0, i ? 0.9 : -0.9)); p.elbows.forEach(e => e.rotation.x = -2.0); }
      if (ps === 'walk') poseWalk(p, 1.2, 1);
      row.push(bake(p.outer)); }
    out.push(row); } seed = r0; return out; })();
const SKIN = ['#f2c8a0', '#e0a878', '#c08458', '#8a5a3a', '#5a3a28', '#f4d4b4'], SUITS = ['#e8463a', '#2a6ad8', '#f4c430', '#2a9a5a', '#e86aa0', '#f08a2a', '#1a1a22', '#8a3aa8', '#30b8c8', '#f4f4f0'];

// ---------- 1) THE BEACH: shoreline along x (ocean at z < 0), the whole crowd standing ~9 rows deep (5.2 people per foot), the jump, the splash, the cold ----------
const BEACH = mkSet({ top: '#6a8ab8', bot: '#dce4ea', fog: 0xc8d4dc, near: 60, far: 420, hemi: [0xf4f0ea, 0x8a7a68, 1.25], sun: [0xfff4e4, 2.0, V3(-20, 30, 25)], shadow: 22 });
const BC = {}; {
  const sc = BEACH.sc; gplane(sc, 1400, 300, '#e8d4a8', 0, 150, 0);   // sand
  const SEG = [160, 60], wg = new THREE.PlaneGeometry(900, 360, SEG[0], SEG[1]); wg.rotateX(-Math.PI / 2); wg.translate(0, -0.25, -180);
  BC.water = mesh(wg, new THREE.MeshStandardMaterial({ color: '#2a6a98', roughness: 0.25, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.94 }), false, true); sc.add(BC.water); BC.w0 = wg.attributes.position.array.slice();
  BC.foam = mesh(new THREE.PlaneGeometry(900, 1.2), new THREE.MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.85 }), false, false); BC.foam.rotation.x = -Math.PI / 2; BC.foam.position.set(0, 0.03, -0.3); sc.add(BC.foam);
  // the crowd: rows parallel to the water; instanced bodies + heads
  const ROWS = 9, SPX = 0.6, XR = 260, body = new THREE.CapsuleGeometry(0.19, 0.75, 2, 6), head = new THREE.IcosahedronGeometry(0.13, 0);
  const n = ROWS * Math.floor(2 * XR / SPX); BC.n = n;
  BC.bodies = new THREE.InstancedMesh(body, F_('#ffffff', { roughness: 0.7 }), n); BC.heads = new THREE.InstancedMesh(head, F_('#ffffff'), n); BC.bodies.castShadow = true; sc.add(BC.bodies, BC.heads);
  const NEAR_X = 42; BC.near = []; for (let v = 0; v < NV; v++) BC.near.push(POSES.map((ps, j) => { const m = new THREE.InstancedMesh(PEOPLE_GEO[v][j], BAKE_MAT, Math.ceil(ROWS * 2 * NEAR_X / SPX / NV) + 4); m.castShadow = true; m.count = 0; m.frustumCulled = false; sc.add(m); return m; }));
  BC.P = []; let i = 0; for (let r = 0; r < ROWS; r++) for (let x = -XR; x < XR - 0.01; x += SPX) { if (i >= n) break; const p = { x: x + (hash(i) - 0.5) * 0.25 + (r % 2) * SPX / 2, z: 0.9 + r * 0.62 + (hash(i * 3) - 0.5) * 0.2, h: 0.85 + 0.25 * hash(i * 7), ph: hash(i * 11) * 6.28, d: hash(i * 13) };
    p.near = Math.abs(p.x) < NEAR_X; p.v = i % NV; BC.bodies.setColorAt(i, _c.set(SUITS[(hash(i * 5.3) * SUITS.length) | 0])); BC.heads.setColorAt(i, _c.set(SKIN[(hash(i * 2.9) * SKIN.length) | 0])); BC.P.push(p); i++; }
  // splash droplets
  BC.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.8) }), 2400); BC.drops.frustumCulled = false; sc.add(BC.drops);
  // a lifeguard tower + flags for scale/place, a towel for you
  const tw = new THREE.Group(); bx(0.12, 2.2, 0.12, '#f4f4f0', -1.2, 1.1, -1.2, tw); bx(0.12, 2.2, 0.12, '#f4f4f0', 1.2, 1.1, -1.2, tw); bx(0.12, 2.2, 0.12, '#f4f4f0', -1.2, 1.1, 1.2, tw); bx(0.12, 2.2, 0.12, '#f4f4f0', 1.2, 1.1, 1.2, tw);
  bx(2.8, 1.4, 2.8, '#e8463a', 0, 2.9, 0, tw); bx(3.2, 0.15, 3.2, '#f4f4f0', 0, 3.7, 0, tw); tw.position.set(-14, 0, 9); sc.add(tw);
  BC.towel = bx(0.9, 0.05, 0.35, '#f4c430', 0, 0, 0, sc);
  // umbrellas, towels, coolers behind the crowd; dunes with grass; the boardwalk, hotels, a pier with a Ferris wheel; gulls; wave crests
  const UC = ['#e8463a', '#f4c430', '#2a6ad8', '#2a9a5a', '#f08a2a', '#e86aa0', '#30b8c8'];
  for (let k = 0; k < 90; k++) { const x = (hash(k * 1.7) - 0.5) * 240, z = 7.5 + hash(k * 2.3) * 9, u = new THREE.Group(); bx(0.05, 2.2, 0.05, '#f4f4f0', 0, 1.1, 0, u);
    const can = mesh(new THREE.ConeGeometry(1.25, 0.55, 8), F_(UC[k % UC.length])); can.position.y = 2.25; u.add(can); u.position.set(x, 0, z); u.rotation.z = (hash(k) - 0.5) * 0.2; sc.add(u);
    bx(0.8, 0.02, 1.6, UC[(k + 3) % UC.length], x + 0.9, 0.01, z + 0.6, sc).rotation.y = hash(k * 5) - 0.5; if (k % 3 === 0) bx(0.5, 0.35, 0.32, k % 2 ? '#2a6ad8' : '#e8463a', x - 0.8, 0.18, z + 0.4, sc); }
  for (let k = 0; k < 70; k++) { const d = mesh(new THREE.IcosahedronGeometry(4 + 3 * hash(k), 0), F_('#e4cc98')); d.scale.set(1.6, 0.35, 1); d.position.set(-250 + k * 7.3, 0, 21 + 4 * hash(k * 3)); sc.add(d);
    for (let q = 0; q < 6; q++) { const g = mesh(new THREE.ConeGeometry(0.15, 0.9, 4), F_('#8aa04a')); g.position.set(-250 + k * 7.3 + (hash(k * 9 + q) - 0.5) * 6, 1.0 + 0.3 * hash(q), 20 + 4 * hash(k + q * 3)); sc.add(g); } }
  gplane(sc, 700, 5, '#a8784a', 0, 30, 0.6); for (let x = -340; x < 340; x += 3) bx(0.1, 1.0, 0.1, '#f4f4f0', x, 1.1, 27.6, sc); bx(700, 0.08, 0.08, '#f4f4f0', 0, 1.6, 27.6, sc);
  const winT = (wall, lit) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = wall; g.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = hash(r * 4 + c + lit) < 0.2 ? '#f8e0a0' : '#5a7a9a'; g.fillRect(8 + c * 30, 8 + r * 30, 20, 20); } });
  const LK = [winT('#f2ede4', 1), winT('#e8c8a0', 2), winT('#c8d8e4', 3), winT('#f4d8c8', 4)];
  for (let k = 0; k < 46; k++) { const wd = 14 + 10 * hash(k), ht = 12 + 40 * hash(k * 3) ** 1.5, tx = LK[k % 4].clone(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(wd / 5, ht / 5); tx.needsUpdate = true;
    const b = mesh(new THREE.BoxGeometry(wd, ht, 14), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); b.position.set(-300 + k * 14 + 3 * hash(k * 7), ht / 2, 46 + 10 * hash(k * 5)); sc.add(b); }
  const pier = new THREE.Group(); bx(6, 0.4, 120, '#8a6a4a', 0, 2.2, -60, pier); for (let z = 0; z > -120; z -= 6) for (const x of [-2.6, 2.6]) bx(0.35, 4, 0.35, '#5a4a3a', x, 0.4, z, pier);
  const wheel = new THREE.Group(); wheel.add(mesh(new THREE.TorusGeometry(9, 0.25, 6, 40), F_('#f4f4f0'))); for (let k = 0; k < 12; k++) { const sp2 = bx(0.12, 18, 0.12, '#f4f4f0', 0, 0, 0, wheel); sp2.rotation.z = k * Math.PI / 12;
    const cab = mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), F_(UC[k % UC.length])); cab.position.set(Math.cos(k * Math.PI / 6) * 9, Math.sin(k * Math.PI / 6) * 9, 0); wheel.add(cab); }
  wheel.position.set(0, 12, -80); wheel.rotation.y = Math.PI / 2; pier.add(wheel); BC.wheel = wheel; pier.position.set(70, 0, 0); sc.add(pier);
  BC.gulls = Array.from({ length: 10 }, (_, k) => { const g = new THREE.Group(); for (const s2 of [-1, 1]) { const w2 = bx(0.6, 0.03, 0.18, '#f4f4f0', s2 * 0.3, 0, 0, g); w2.rotation.z = s2 * 0.3; g.userData[s2] = w2; } bx(0.18, 0.12, 0.35, '#f4f4f0', 0, 0, 0, g); sc.add(g); return g; });
  BC.crests = Array.from({ length: 4 }, () => { const c = mesh(new THREE.BoxGeometry(900, 0.12, 0.8), new THREE.MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: 0.8 }), false, false); sc.add(c); return c; }); }
const SHORE_LAND = 1.6;
const JT = t => t < JUMP ? -1 : Math.min(t - JUMP, 5.2) * 0.38 + Math.max(0, t - JUMP - 5.2);   // slow motion (0.38×) from the jump through the splash   // how far into the water everyone lands (m)
function updateBeach(t, mode) {
  const P = BC.P, pos = BC.water.geometry.attributes.position, a = pos.array, w0 = BC.w0, calm = mode === 'space' ? 0 : 1;
  for (let k = 0; k < a.length; k += 3) { const x = w0[k], z = w0[k + 2]; let y = w0[k + 1] + 0.12 * Math.sin(x * 0.35 + t * 1.3) + 0.1 * Math.sin(z * 0.5 - t * 1.7);
    if (mode === 'jump' && t > JUMP + 0.9) { const r = Math.abs(z + SHORE_LAND), k2 = t - JUMP - 0.9; y += 0.6 * Math.exp(-r * 0.25) * Math.sin(r * 1.4 - k2 * 6) * Math.exp(-k2 * 0.6); }
    a[k + 1] = y; } pos.needsUpdate = true; BC.water.geometry.computeVertexNormals();
  BC.foam.position.z = -0.3 + 0.35 * Math.sin(t * 1.1); BC.wheel.rotation.x = t * 0.08;
  BC.crests.forEach((c, k) => { const u = ((t * 0.12 + k / 4) % 1); c.position.set(0, -0.05, -40 + 38 * u); c.material.opacity = 0.8 * Math.sin(Math.PI * u); });
  BC.gulls.forEach((g, k) => { const a = t * 0.3 + k * 0.63; g.position.set(-20 + 30 * Math.cos(a) + k * 4, 9 + 2 * Math.sin(k + t * 0.7), -6 + 8 * Math.sin(a)); g.rotation.y = -a; const f = 0.5 * Math.sin(t * 8 + k); g.userData[-1].rotation.z = -0.3 - f; g.userData[1].rotation.z = 0.3 + f; });
  // slow motion during the jump: 0.35× between JUMP and JUMP + 2.6 s of film time
  const jt = JT(t);
  let nd = 0; BC.near.forEach(row => row.forEach(m => { m.count = 0; }));
  const pi = mode === 'cold' ? 2 : mode === 'back' ? 3 : (mode === 'jump' && jt > 0 && jt < 0.85) ? 1 : 0;   // which pose the near crowd uses
  P.forEach((p, i) => { let x = p.x, y = 0, z = p.z, s = 1, lean = 0; const h = p.h;
    if (mode === 'crowd') { y = 0.02 * Math.sin(t * 3 + p.ph); }
    else if (mode === 'jump') { const t0 = (p.d - 0.5) * 0.06; const u = clamp((jt - t0) / 0.75, 0, 1);   // almost everyone at the same second
      if (jt < 0) { y = 0; lean = -0.15 * smooth(COUNT, JUMP, t); }
      else { const zEnd = -SHORE_LAND - (8 - p.z) * 0.18; z = lerp(p.z, zEnd, u); y = 1.6 * Math.sin(Math.PI * Math.min(u, 1)) - 0.75 * smooth(0.85, 1, u); lean = -0.5 * Math.sin(Math.PI * u); }
      if (u >= 1) { y = -0.75 + 0.05 * Math.sin(t * 2 + p.ph); z = -SHORE_LAND - (8 - p.z) * 0.18; } }
    else if (mode === 'cold') { z = -SHORE_LAND - (8 - p.z) * 0.18; y = -0.75 + 0.02 * Math.sin(t * 40 + p.ph); x += 0.015 * Math.sin(t * 37 + p.ph); }
    else if (mode === 'back') { const u = clamp((t - BACK - p.d * 0.8) / 2.0, 0, 1); z = lerp(-SHORE_LAND - (8 - p.z) * 0.18, p.z + 2.5, u); y = lerp(-0.75, 0, Math.min(1, u * 2.5)) + 0.04 * Math.abs(Math.sin(t * 6 + p.ph)); }
    if (p.near) { _o.position.set(x, y + 0.95, z); _o.rotation.set(lean, Math.PI + 0.25 * (p.d - 0.5), 0); _o.scale.setScalar(h); _o.updateMatrix(); const m = BC.near[p.v][pi]; m.setMatrixAt(m.count++, _o.matrix);
      _o.scale.setScalar(0.0001); _o.updateMatrix(); BC.bodies.setMatrixAt(i, _o.matrix); BC.heads.setMatrixAt(i, _o.matrix); return; }
    _o.position.set(x, y + 0.56 * h, z); _o.rotation.set(lean, 0, 0); _o.scale.set(1, h, 1); _o.updateMatrix(); BC.bodies.setMatrixAt(i, _o.matrix);
    _o.position.set(x, y + 1.18 * h + 0.06, z + lean * 0.4); _o.scale.setScalar(1); _o.updateMatrix(); BC.heads.setMatrixAt(i, _o.matrix); });
  BC.bodies.instanceMatrix.needsUpdate = BC.heads.instanceMatrix.needsUpdate = true; BC.near.forEach(row => row.forEach(m => { m.instanceMatrix.needsUpdate = true; }));
  // the splash: droplets thrown up where people land
  for (let k = 0; k < 2400; k++) { const p = P[(k * 37) % P.length], ts = 0.75 + (p.d - 0.5) * 0.06, u = mode === 'jump' ? (jt - ts) / 1.1 : -1;
    if (u > 0 && u < 1 && Math.abs(p.x) < 160) { const a2 = hash(k) * 6.28, v = 2.5 + 5.5 * hash(k * 3); _o.position.set(p.x + Math.cos(a2) * 0.8 * u, -0.2 + v * u - 4.0 * u * u, -SHORE_LAND - (8 - p.z) * 0.18 + Math.sin(a2) * 0.8 * u); _o.scale.setScalar(1.0 + 1.4 * hash(k * 7)); nd++; }
    else { _o.position.set(0, -50, 0); _o.scale.setScalar(0.001); } _o.updateMatrix(); BC.drops.setMatrixAt(k, _o.matrix); } BC.drops.instanceMatrix.needsUpdate = true;
  // colour: November grey on the cold beat
  const cold = mode === 'cold' || mode === 'back'; BEACH.sc.userData.hemi.color.set(cold ? '#c8d8f0' : '#f4f0ea'); BC.water.material.color.set(cold ? '#2a5070' : '#2a6a98'); }

// ---------- 2) THE US MAP: city lights = where people live; 7,000 dots each run to the nearest ocean coast (data/sea_dots.json) ----------
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#04060c');
const mapCam = new THREE.PerspectiveCamera(30, W / H, 5, 9000);
const MW = 975, MH = 610;
const mapMat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: null }, uDim: { value: 0 } },
  vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D uTex; uniform float uDim; varying vec3 vW; varying vec3 vN;
    void main(){ vec2 uv=vec2((vW.x+${(MW / 2).toFixed(1)})/${MW.toFixed(1)}, 1.0-(vW.z+${(MH / 2).toFixed(1)})/${MH.toFixed(1)}); vec4 tx=texture2D(uTex,uv);
      vec3 col=mix(vec3(0.06,0.08,0.12),vec3(0.1,0.13,0.19),tx.a)+vec3(1.0,0.78,0.42)*pow(tx.b,2.2)*1.4*(1.0-0.85*uDim);
      if(vN.y<0.5) col=vec3(0.03,0.04,0.06); gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const DOTS = { pts: null, data: null };
async function buildMap() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii', 'Puerto Rico'].includes(g.properties.name));
  const info = await (await fetch('zmap.json')).json(), bin = new Uint8Array(await (await fetch('zmap.bin')).arrayBuffer());
  const tex = new THREE.DataTexture(bin, info.GW, info.GH, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; mapMat.uniforms.uTex.value = tex;
  const merged = topojson.merge(topo, L48), shapes = [];
  for (const poly of merged.coordinates) { const o = poly[0]; if (o.length < 8) continue; const sh = new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2)))); shapes.push(sh); }
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); mapScene.add(new THREE.Mesh(g, mapMat));
  const ms = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b), pts = [];
  for (const line of ms.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; pts.push(a[0] - MW / 2, 10.4, a[1] - MH / 2, b[0] - MW / 2, 10.4, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); mapScene.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#3a4258', transparent: true, opacity: 0.7 })));
  // the ocean around the map, glowing at the coast as people arrive
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: new THREE.Color('#0a1830') })); sea.rotation.x = -Math.PI / 2; sea.position.y = -1; mapScene.add(sea);
  DOTS.data = await (await fetch('data/sea_dots.json')).json(); const n = DOTS.data.length, p = new Float32Array(n * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  DOTS.pts = new THREE.Points(dg, new THREE.PointsMaterial({ color: new THREE.Color(2.2, 1.5, 0.6), size: 4.5, sizeAttenuation: true, transparent: true, depthWrite: false })); DOTS.pts.frustumCulled = false; mapScene.add(DOTS.pts); }
function updateMap(t) { if (!DOTS.pts) return; const a = DOTS.pts.geometry.attributes.position.array, k0 = MAP + 0.6;
  DOTS.data.forEach((d, i) => { const delay = 0.8 * hash(i * 1.3), u = ease(clamp((t - k0 - delay) / 4.0, 0, 1)); a[i * 3] = lerp(d[0], d[2], u); a[i * 3 + 1] = 12; a[i * 3 + 2] = lerp(d[1], d[3], u); });
  DOTS.pts.geometry.attributes.position.needsUpdate = true; mapMat.uniforms.uDim.value = smooth(k0, k0 + 4.5, t); }

// ---------- 3) ALLEN, SOUTH DAKOTA: flat prairie to the horizon, a farmhouse, a barn, a road sign, your car ----------
const FARM = mkSet({ top: '#5a8ad8', bot: '#f4e4c4', fog: 0xe8dcc4, near: 60, far: 600, hemi: [0xfff4e4, 0x8a7a50, 1.15], sun: [0xfff0d8, 2.4, V3(15, 20, 12)], shadow: 25 });
const FM = {}; {
  const sc = FARM.sc; gplane(sc, 2000, 2000, '#c8b46a', 0, 0); gplane(sc, 7, 2000, '#4a4c54', 0, 0, 0.01);   // prairie + the road (along z)
  for (let z = -990; z < 990; z += 9) gplane(sc, 0.15, 3.5, '#f0e6a0', 0, z, 0.02);
  const house = new THREE.Group(); bx(8, 4.5, 6, '#f2ede4', 0, 2.25, 0, house); const roof = mesh(new THREE.ConeGeometry(6.2, 2.8, 4), F_('#6a3a2a')); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.75); roof.position.y = 5.9; house.add(roof);
  for (const x of [-2.2, 2.2]) bx(1.2, 1.3, 0.1, '#3a4a5a', x, 2.6, 3.02, house); bx(1.1, 2.2, 0.1, '#8a3a2a', 0, 1.1, 3.02, house); house.position.set(-16, 0, -14); sc.add(house);
  const barn = new THREE.Group(); bx(9, 6, 12, '#b8302a', 0, 3, 0, barn); const br = mesh(new THREE.CylinderGeometry(4.6, 4.6, 12, 6, 1, false, 0, Math.PI), F_('#4a4a52')); br.rotation.z = Math.PI / 2; br.rotation.y = Math.PI / 2; br.position.y = 6; barn.add(br); barn.position.set(-30, 0, -40); sc.add(barn);
  const sign = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#1e6a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '700 64px Inter'; g.fillText('ALLEN, SD', w / 2, 92); g.font = '600 40px Inter'; g.fillText('PACIFIC OCEAN  1,018 MI', w / 2, 162); g.fillText('ATLANTIC  1,500+ MI', w / 2, 218); });
  const sp = mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), false, false); sp.position.set(5.2, 3.2, 2); sp.rotation.y = -0.35; sc.add(sp); for (const x of [-1.2, 1.2]) bx(0.12, 2.6, 0.12, '#8a8a92', 5.2 + x * 0.94, 1.3, 2 + x * 0.34, sc);
  FM.car = makeCar('#2a6ad8'); FM.car.position.set(1.8, 0, 6); sc.add(FM.car);
  const silo = new THREE.Group(); silo.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 14, 14), F_('#c8ccd4', { metalness: 0.4 }))); silo.children[0].position.y = 7; const dome = mesh(new THREE.SphereGeometry(2.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), F_('#a8acb4', { metalness: 0.4 })); dome.position.y = 14; silo.add(dome); silo.position.set(-22, 0, -48); sc.add(silo);
  const trac = new THREE.Group(); bx(1.6, 1.0, 2.6, '#2a8a3a', 0, 1.1, 0, trac); bx(1.4, 1.2, 1.2, '#2a8a3a', 0, 2.2, -0.5, trac); bx(1.3, 1.0, 1.1, '#2a3440', 0, 2.25, -0.5, trac);
  for (const [x, z, r] of [[-0.9, -0.8, 0.9], [0.9, -0.8, 0.9], [-0.85, 1.0, 0.5], [0.85, 1.0, 0.5]]) { const w = mesh(new THREE.CylinderGeometry(r, r, 0.4, 14), F_('#1c1e24')); w.rotation.z = Math.PI / 2; w.position.set(x, r, z); trac.add(w); } trac.position.set(-8, 0, -6); trac.rotation.y = 0.7; sc.add(trac);
  for (let k = 0; k < 18; k++) { const b = mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 12), F_('#d8b860')); b.rotation.z = Math.PI / 2; b.position.set(-40 + (k % 6) * 4 + hash(k) * 2, 0.75, -20 - Math.floor(k / 6) * 6); sc.add(b); }
  for (let z = 20; z > -600; z -= 30) { bx(0.22, 8, 0.22, '#6a4a32', 5.5, 4, z, sc); bx(1.6, 0.12, 0.12, '#6a4a32', 5.5, 7.5, z, sc); const wire = mesh(new THREE.CylinderGeometry(0.02, 0.02, 30, 4), F_('#2a2a30')); wire.rotation.x = Math.PI / 2; wire.position.set(5.5, 7.4, z - 15); sc.add(wire); }
  for (let z = 15; z > -200; z -= 3) bx(0.12, 1.1, 0.12, '#8a6a4a', -5.5, 0.55, z, sc); bx(0.06, 0.06, 215, '#8a6a4a', -5.5, 0.9, -92, sc); bx(0.06, 0.06, 215, '#8a6a4a', -5.5, 0.5, -92, sc);
  for (let i = 0; i < 40; i++) { const tr = mesh(new THREE.IcosahedronGeometry(1.2 + hash(i) * 1.2, 0), F_('#5a7a3a')); tr.position.set((hash(i * 3) - 0.5) * 600, 1.2, -100 - hash(i * 7) * 500); sc.add(tr); } }
function updateFarm(t) { const go = smooth(ALLEN + 3.6, ALLEN + 6, t); FM.car.position.z = 6 - 40 * go * go; }

// ---------- 4) THE JAM: a 6-lane interstate to the horizon, bumper to bumper, crawling ----------
const HWY = mkSet({ top: '#e8905a', bot: '#f8d8a8', fog: 0xf0c8a0, near: 80, far: 700, hemi: [0xffe8d0, 0x7a6048, 1.1], sun: [0xffc898, 2.2, V3(-30, 18, -40)], shadow: 30 });
const HW = {}; {
  const sc = HWY.sc; gplane(sc, 3000, 3000, '#b8a868', 0, 0); gplane(sc, 26, 3000, '#4a4c54', 0, 0, 0.01); gplane(sc, 2, 3000, '#6a7a4a', 0, 0, 0.02);
  for (const x of [-9, -5.5, 5.5, 9]) for (let z = -1490; z < 1490; z += 9) gplane(sc, 0.15, 3.0, '#e8e6e0', x, z, 0.03);
  const LANES = [-10.8, -7.2, -3.6, 3.6, 7.2, 10.8], N = LANES.length * 260; HW.lanes = LANES;
  const bodyG = new THREE.BoxGeometry(1.8, 0.75, 4.2); bodyG.translate(0, 0.65, 0); const cabG = new THREE.BoxGeometry(1.6, 0.55, 2.1); cabG.translate(0, 1.3, -0.2);
  const CC = ['#e8463a', '#f4f4f0', '#2a6ad8', '#1a1a22', '#c8c8d0', '#f4c430', '#2a9a5a', '#8a3a2a']; HW.cars = CC.map(c => { const m = new THREE.InstancedMesh(bake(makeCar(c)), BAKE_MAT, N); m.castShadow = true; m.count = 0; m.frustumCulled = false; sc.add(m); return m; });
  const gan = new THREE.Group(); for (const x of [-14, 14]) bx(0.5, 8, 0.5, '#8a8a92', x, 4, 0, gan); bx(29, 0.6, 0.6, '#8a8a92', 0, 7.8, 0, gan);
  const sg = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#1e6a3a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 92px Inter'; g.fillText('I-90 WEST', w / 2, 110); g.font = '600 58px Inter'; g.fillText('SEATTLE · PACIFIC OCEAN  1,190', w / 2, 200); });
  const sm = mesh(new THREE.PlaneGeometry(13, 3.25), new THREE.MeshStandardMaterial({ map: sg, roughness: 0.6 }), false, false); sm.position.set(-6.5, 9.6, 0.32); gan.add(sm); gan.position.z = -30; sc.add(gan);
  HW.C = []; let i = 0; for (const x of LANES) for (let k = 0; k < 260; k++) { HW.C.push({ x, z: -k * 6.4 + 60 + hash(i) * 1.2, dir: x < 0 ? 1 : -1, ph: hash(i * 3), c: (hash(i * 5) * 8) | 0 }); i++; } }
function updateHwy(t) { HW.cars.forEach(m => { m.count = 0; }); HW.C.forEach((c, i) => { const crawl = 0.6 * Math.max(0, Math.sin(t * 0.8 + c.ph * 6)); _o.position.set(c.x, 0, c.z - c.dir * crawl); _o.rotation.set(0, c.dir > 0 ? Math.PI : 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); const m = HW.cars[c.c]; m.setMatrixAt(m.count++, _o.matrix); });
  HW.cars.forEach(m => { m.instanceMatrix.needsUpdate = true; }); }

// ---------- 5) UNDERWATER: blue haze, the bright surface above, a forest of legs, bubbles, fish fleeing ----------
const UNDER = mkSet({ top: '#1e6a94', bot: '#0a3050', fog: 0x0e4a6a, near: 4, far: 60, hemi: [0x9ad8ff, 0x0a2a40, 1.4], sun: [0xc8f0ff, 1.6, V3(2, 30, 4)], shadow: 15 });
const UW = {}; {
  const sc = UNDER.sc; const surf = mesh(new THREE.PlaneGeometry(4000, 4000, 60, 60), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3a8ab8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(200,240,255,0.5)'; g.lineWidth = 3; g.beginPath(); const x = hash(i) * w, y = hash(i * 3) * h; g.ellipse(x, y, 20 + 30 * hash(i * 5), 8 + 10 * hash(i * 7), hash(i * 9) * 3, 0, 6.3); g.stroke(); } }, [60, 60]), side: THREE.DoubleSide }), false, false); surf.rotation.x = Math.PI / 2; surf.position.y = 0; sc.add(surf); UW.surf = surf;
  gplane(sc, 400, 400, '#c8b888', 0, 0, -4.5);
  const N = 1400; UW.ppl = PEOPLE_GEO.map(row => { const m = new THREE.InstancedMesh(row[0], BAKE_MAT, Math.ceil(N / NV) + 2); m.frustumCulled = false; sc.add(m); return m; });
  UW.school = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.22, 4), F_('#c8d8e8', { metalness: 0.5, roughness: 0.3 }), 300); UW.school.frustumCulled = false; sc.add(UW.school);
  UW.rays = Array.from({ length: 10 }, (_, k) => { const r = mesh(new THREE.PlaneGeometry(1.4, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.8, 1.0), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), false, false); r.position.set(-10 + k * 2.4, -4, -8 - (k % 3) * 4); r.rotation.z = 0.25; sc.add(r); return r; });
  UW.P = Array.from({ length: N }, (_, i) => ({ x: (hash(i) - 0.5) * 70, z: -4 - hash(i * 3) * 70, ph: hash(i * 7) * 6.28, c: SUITS[(hash(i * 5.3) * SUITS.length) | 0], s: SKIN[(hash(i * 2.9) * SKIN.length) | 0] }));

  UW.bub = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.9, 2.0), transparent: true, opacity: 0.8 }), 700); UW.bub.frustumCulled = false; sc.add(UW.bub);
  UW.fish = Array.from({ length: 14 }, (_, i) => { const f = new THREE.Group(); const b = mesh(new THREE.SphereGeometry(0.18, 8, 6), F_(['#f4c430', '#f08a2a', '#c8d8e8'][i % 3])); b.scale.set(0.5, 0.8, 1.6); f.add(b); const tl = mesh(new THREE.ConeGeometry(0.15, 0.25, 4), F_(['#f4c430', '#f08a2a', '#c8d8e8'][i % 3])); tl.rotation.x = Math.PI / 2; tl.position.z = 0.35; f.add(tl); sc.add(f); return f; }); }
function updateUnder(t) { UW.ppl.forEach(m => { m.count = 0; }); UW.P.forEach((p, i) => { const sink = smooth(SPLASH + 2.8, SPLASH + 3.6, t), m = UW.ppl[i % NV];
    _o.position.set(p.x, -0.05 - 0.7 * (1 - sink) + 0.04 * Math.sin(t * 2 + p.ph), p.z); _o.rotation.set(0.08 * Math.sin(t * 1.5 + p.ph), p.ph, 0); _o.scale.setScalar(1); _o.updateMatrix(); m.setMatrixAt(m.count++, _o.matrix); });
  UW.ppl.forEach(m => { m.instanceMatrix.needsUpdate = true; });
  for (let k = 0; k < 300; k++) { const a = t * 0.9 + k * 0.021, r = 1.2 + 0.6 * hash(k); _o.position.set(4 + Math.cos(a) * r + (hash(k * 3) - 0.5) * 0.8, -2.6 + (hash(k * 5) - 0.5) * 1.2, -7 + Math.sin(a) * r); _o.rotation.set(Math.PI / 2, 0, -a); _o.scale.setScalar(1); _o.updateMatrix(); UW.school.setMatrixAt(k, _o.matrix); } UW.school.instanceMatrix.needsUpdate = true;
  UW.rays.forEach((r, k) => { r.material.opacity = 0.08 + 0.06 * Math.sin(t * 1.3 + k); });
  for (let k = 0; k < 700; k++) { const u = ((t * 0.5 + hash(k)) % 1); _o.position.set((hash(k * 3) - 0.5) * 20, -4 + 4 * u, -3 - hash(k * 7) * 18); _o.rotation.set(0, 0, 0); _o.scale.setScalar(0.5 + hash(k * 9)); _o.updateMatrix(); UW.bub.setMatrixAt(k, _o.matrix); } UW.bub.instanceMatrix.needsUpdate = true;
  UW.fish.forEach((f, i) => { const u = t - SPLASH - 2.6; f.position.set(-3 + (i % 5) * 1.4 + Math.max(0, u) * (i % 2 ? 4 : -4), -2.4 - (i % 3) * 0.5, -6 - (i % 4) * 1.2 - Math.max(0, u) * 3); f.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2; }); }

// ---------- 6) MACRO: one human hair (70 µm) next to the rise of the sea (0.06 µm) — scale 1 µm = 0.1 m ----------
const MACR = mkSet({ top: '#f4f6f8', bot: '#dfe8ee', fog: 0xe8eef2, near: 40, far: 200, hemi: [0xffffff, 0xa8b0b8, 1.5], sun: [0xffffff, 1.6, V3(5, 10, 8)], shadow: 12 });
const MC = {}; {
  const sc = MACR.sc; MC.hair = mesh(new THREE.CylinderGeometry(3.5, 3.5, 60, 28), F_('#5a3a22', { roughness: 0.6, flatShading: false })); MC.hair.rotation.z = Math.PI / 2; MC.hair.position.set(0, 3.5, -2); sc.add(MC.hair);
  for (let i = 0; i < 26; i++) { const sc2 = mesh(new THREE.TorusGeometry(3.52, 0.06, 4, 28), F_('#4a2e1a')); sc2.rotation.y = Math.PI / 2; sc2.position.set(-28 + i * 2.2, 3.5, -2); sc.add(sc2); }   // cuticle scales
  MC.water = bx(60, 0.007, 6, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.5, 2.2) }), 0, 0.0035, 5, sc); MC.base = bx(60, 0.5, 6, '#f4f6f8', 0, -0.25, 5, sc);   // the rise at true scale: 1/1000 of the hair
  const rul = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#f8f4e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a22'; for (let i = 0; i <= 100; i++) { const x = 10 + i * 10, L = i % 10 === 0 ? 60 : i % 5 === 0 ? 40 : 24; g.fillRect(x, 0, 2, L); } g.font = '600 26px Inter'; for (let i = 0; i <= 10; i++) g.fillText(i * 10 + ' µm', 4 + i * 100, 100); });
  const rp = mesh(new THREE.PlaneGeometry(10, 1.25), new THREE.MeshStandardMaterial({ map: rul, roughness: 0.6 }), false, false); rp.position.set(-6, 3.5, 1.2); rp.rotation.z = Math.PI / 2; sc.add(rp); }

// ---------- 7) SPACE: Earth (land from world-atlas painted on the globe), stars, a soft atmosphere ----------
const SPACE_S = new THREE.Scene(); SPACE_S.background = new THREE.Color('#02040a'); const spCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 100);
SPACE_S.add(new THREE.AmbientLight(0x404858, 1.0)); { const s = new THREE.DirectionalLight(0xffffff, 2.6); s.position.set(-3, 1.5, 4); SPACE_S.add(s); }
const EARTH = new THREE.Group(); SPACE_S.add(EARTH);
async function buildEarth() { const topo = await (await fetch('node_modules/world-atlas/land-110m.json')).json(), land = topojson.feature(topo, topo.objects.land);
  const tex = canvasTex(2048, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a4a7a'); gr.addColorStop(0.5, '#1f5f96'); gr.addColorStop(1, '#1a4a7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a8a4a'; for (const f of land.features) for (const poly of (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) { g.beginPath(); for (const ring of poly) ring.forEach(([lo, la], i) => { const x = (lo + 180) / 360 * w, y = (90 - la) / 180 * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.fill(); }
    g.fillStyle = 'rgba(240,244,248,0.9)'; g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.94, w, h * 0.06); });
  const e = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 })); EARTH.add(e);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.06, 48, 32), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float r=pow(1.0-abs(dot(vN,vV)),2.5); gl_FragColor=vec4(vec3(0.35,0.6,1.0)*r*1.6,r); }' })); EARTH.add(glow);
  const n = 2500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(hash(i) - 0.5, hash(i * 3) - 0.5, hash(i * 7) - 0.5).normalize().multiplyScalar(40); p.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3)); SPACE_S.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.08 }))); }
function updateSpace(t) { EARTH.rotation.set(0.45, 0.7 + 0.05 * (t - SPACE), 0); }   // North America facing the camera
