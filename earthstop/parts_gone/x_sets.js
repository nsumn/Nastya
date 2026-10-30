// =================== THE OTHER SETS (each its own scene + camera; you and the friend are re-parented into whichever scene is being shot) ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false })));
  sc.fog = new THREE.Fog(fog, near, far); sc.add(new THREE.HemisphereLight(...hemi));
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 80 }); sc.add(s, s.target); sc.userData.sun = s;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D();
// ---------- 1) MANHATTAN from above: 73 million homes each (a grid of towers whose roofs split into yours / his), then a parking lot of cars ----------
const BURB = mkSet({ top: '#5a8ad0', bot: '#f0d8c0', fog: 0xe8d8c8, near: 120, far: 900, shadow: 60 });
const burbIM = {}; {
  const sc = BURB.sc; gplane(sc, 3000, 3000, '#7a7c82', 0, 0, -0.02);
  const NX = 44, NZ = 44, N = NX * NZ, walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), F_('#ffffff'), N), roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), F_('#ffffff'), N);
  let k = 0; const c = new THREE.Color();
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const x = (i - NX / 2) * 16, z = (j - NZ / 2) * 15; if (j % 4 === 3 || i % 5 === 4) continue; const w = 13 + 2 * hash(i * 3 + j), h = 14 + 110 * Math.pow(hash(i + j * 7), 2.2);
    _o.position.set(x, h / 2, z); _o.scale.set(w, h, 12); _o.rotation.set(0, 0, 0); _o.updateMatrix(); walls.setMatrixAt(k, _o.matrix); walls.setColorAt(k, c.set(['#d8ccb4', '#b8705a', '#8a8c94', '#a8c4d8', '#e8e2d6'][(hash(i * 1.3 + j * 2.1) * 5) | 0]));
    _o.position.set(x, h + 0.5, z); _o.scale.set(w * 1.02, 1.0, 12.3); _o.updateMatrix(); roofs.setMatrixAt(k, _o.matrix); roofs.setColorAt(k, c.set('#5a5a62')); k++; }
  walls.count = roofs.count = k; walls.castShadow = roofs.castShadow = true; walls.receiveShadow = true; sc.add(walls, roofs); burbIM.walls = walls; burbIM.roofs = roofs; burbIM.n = k;
  for (let j = 0; j < NZ; j += 4) gplane(sc, NX * 16, 12, '#5c5e66', 0, (j + 3 - NZ / 2) * 15, 0.01); for (let i = 4; i < NX; i += 5) gplane(sc, 14, NZ * 15, '#5c5e66', (i - NX / 2) * 16, 0, 0.012);
  // parking lot (far east): rows of cars
  gplane(sc, 300, 260, '#5c5e66', 900, 0, 0.01); const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 1.3, 4.2), F_('#ffffff', { roughness: 0.4 }), 60 * 26);
  let n = 0; for (let i = 0; i < 60; i++) for (let j = 0; j < 26; j++) { _o.position.set(900 + (i - 30) * 4.6, 0.65, (j - 13) * 9.5); _o.scale.set(1, 1, 1); _o.updateMatrix(); cars.setMatrixAt(n, _o.matrix); cars.setColorAt(n, c.set(['#e8e4dc', '#2a2c32', '#8a8c92', '#3a5a9a', '#c8402a'][(hash(i * 7.1 + j) * 5) | 0])); n++; }
  cars.castShadow = true; sc.add(cars); burbIM.cars = cars; burbIM.carCol = Array.from({ length: n }, (_, i) => { const cc = new THREE.Color(); cars.getColorAt(i, cc); return cc; });
  burbIM.roofCol = null; }
const YOURS = new THREE.Color('#f08a2a'), HIS = new THREE.Color('#d8342a');
function updateBurb(t) { const c = new THREE.Color(), wipe = smooth(HOMES + 0.4, HOMES + 2.2, t), wc = smooth(HOMES + 3.2, HOMES + 4.6, t);
  for (let k = 0; k < burbIM.n; k++) { burbIM.roofs.getMatrixAt(k, _o.matrix); _o.matrix.decompose(_o.position, _o.quaternion, _o.scale); const u = (_o.position.x + 352) / 704;
    c.set('#5a5a62'); if (Math.abs(u - 0.5) < wipe * 0.5) c.copy(u < 0.5 ? YOURS : HIS); burbIM.roofs.setColorAt(k, c); }   // the split grows from the middle: left = yours, right = his
  burbIM.roofs.instanceColor.needsUpdate = true;
  for (let n = 0; n < burbIM.carCol.length; n++) { const i = Math.floor(n / 26), u = i / 59; c.copy(burbIM.carCol[n]); if (Math.abs(u - 0.5) < wc * 0.5) c.lerp(u < 0.5 ? YOURS : HIS, 0.85); burbIM.cars.setColorAt(n, c); }
  burbIM.cars.instanceColor.needsUpdate = true; }
// ---------- 2) SUPERMARKET aisle: shelves of products, ceiling lights, a cart; produce stand + cans for the "rot" beat ----------
const MKT = mkSet({ top: '#f4f4f0', bot: '#f4f4f0', fog: 0xf0f0ea, near: 30, far: 90, hemi: [0xffffff, 0xb0a890, 1.3], sun: [0xfff8f0, 1.0, V3(4, 12, 6)], shadow: 14 });
const MK = {}; {
  const sc = MKT.sc; const tile = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#cfccc4'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, [40, 40]);
  gplane(sc, 80, 80, new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35 }), 0, 0);
  const ceil = mesh(new THREE.PlaneGeometry(80, 80), F_('#f4f4f2'), false, true); ceil.rotation.x = Math.PI / 2; ceil.position.y = 5.2; sc.add(ceil);
  for (let z = -30; z <= 30; z += 4) for (const x of [-4.5, 0, 4.5]) { const l = mesh(new THREE.BoxGeometry(0.6, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), false, false); l.position.set(x, 5.15, z); sc.add(l); }
  // two long shelf units facing the aisle at x = 0
  const prodCols = ['#e8463a', '#f4c430', '#3a6ad8', '#2a9a5a', '#f08a2a', '#8a3aa8', '#f4f4f0', '#5a3a2a', '#e86aa0', '#30b8c8'];
  const NP = 2 * 30 * 5 * 9, prods = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), F_('#ffffff', { roughness: 0.5 }), NP); let n = 0; const c = new THREE.Color();
  for (const side of [-1, 1]) { const x0 = side * 1.9;
    rb(0.9, 2.3, 30, F_('#d8d8dc'), x0 + side * 0.25, 1.15, -6, sc, 0.03);
    for (let lv = 0; lv < 5; lv++) { rb(0.62, 0.04, 30, F_('#b8b8be'), x0, 0.2 + lv * 0.46, -6, sc, 0.01);
      for (let i = 0; i < 30 * 9; i++) { const z = -21 + i * (30 / 270) + 0.05, hh = 0.2 + 0.18 * hash(i * 1.7 + lv); _o.position.set(x0 - side * 0.05, 0.22 + lv * 0.46 + hh / 2, z); _o.scale.set(0.42, hh, 0.1); _o.rotation.set(0, 0, 0); _o.updateMatrix();
        prods.setMatrixAt(n, _o.matrix); prods.setColorAt(n, c.set(prodCols[((i / 9) | 0) * 3 % 10 === 0 ? 0 : ((hash(((i / 9) | 0) * 2.3 + lv * 5.1) * 10) | 0)])); n++; } } }
  prods.count = n; prods.castShadow = true; sc.add(prods); MK.prods = prods;
  // aisle sign
  const sign = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#2a5ab8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 84px Inter'; g.textAlign = 'center'; g.fillText('3', w / 2, 98); });
  const sg = mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: sign }), false, false); sg.position.set(0, 4.2, 6.5); sc.add(sg);
  // the cart
  const cart = new THREE.Group(); const wire = F_('#b8bcc4', { metalness: 0.6, roughness: 0.3 }); rb(0.55, 0.45, 0.85, F_('#c8ccd4', { transparent: true, opacity: 0.55, metalness: 0.4 }), 0, 0.85, 0, cart, 0.02);
  for (const [x, z] of [[-0.25, -0.38], [0.25, -0.38], [-0.25, 0.38], [0.25, 0.38]]) { const w = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), M('#2a2a2e')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.06, z); cart.add(w); const lg = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6), wire); lg.position.set(x, 0.38, z); cart.add(lg); }
  const hnd = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), wire); hnd.rotation.z = Math.PI / 2; hnd.position.set(0, 1.12, -0.48); cart.add(hnd);
  for (let i = 0; i < 9; i++) bx(0.2, 0.24, 0.14, prodCols[i], -0.15 + (i % 3) * 0.15, 0.8 + 0.12 * Math.floor(i / 3), -0.2 + 0.18 * (i % 2), cart).rotation.y = i;
  sc.add(cart); MK.cart = cart;
  // wrappers on the floor around the friend (they pile up)
  const wr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.01, 0.09), F_('#ffffff'), 60); for (let i = 0; i < 60; i++) { _o.position.set(-0.6 + 1.1 * hash(i * 3.3), 0.006, 1.4 + 1.2 * hash(i * 5.1)); _o.rotation.set(0, hash(i) * 6, 0); _o.scale.set(1, 1, 1); _o.updateMatrix(); wr.setMatrixAt(i, _o.matrix); wr.setColorAt(i, c.set(prodCols[i % 10])); }
  wr.count = 0; sc.add(wr); MK.wr = wr;
  // a chip bag in the friend's hand
  MK.bag = new THREE.Group(); rb(0.2, 0.28, 0.07, F_('#f4c430', { roughness: 0.4 }), 0, 0, 0, MK.bag, 0.03); bx(0.12, 0.08, 0.075, '#e8463a', 0, 0.02, 0, MK.bag);
  // the produce stand (for "week 1: the fresh food rots"): crates of apples, bananas, lettuce at the end of the aisle
  MK.fruit = []; const fruitG = new THREE.IcosahedronGeometry(0.09, 1);
  for (let k = 0; k < 3; k++) { const cx = -1.6 + k * 1.6; rb(1.3, 0.5, 0.9, F_('#a8783a'), cx, 0.65, 11.5, sc, 0.03);
    for (let i = 0; i < 40; i++) { const fm = new THREE.MeshStandardMaterial({ color: ['#d8302a', '#f4d040', '#5ab040'][k], roughness: 0.6, flatShading: true }); const f = mesh(fruitG, fm); f.position.set(cx - 0.55 + (i % 8) * 0.155, 0.97 + 0.08 * Math.floor(i / 16), 11.15 + Math.floor((i % 16) / 8) * 0.25 + 0.2 * hash(i)); if (k === 1) f.scale.set(0.7, 0.7, 1.8); f.userData.c0 = fm.color.clone(); sc.add(f); MK.fruit.push(f); } }
  // the donut (frosting turns green and fuzzy)
  MK.donut = new THREE.Group(); const dn = mesh(new THREE.TorusGeometry(0.075, 0.04, 8, 16), F_('#c88a4a')); dn.rotation.x = Math.PI / 2; MK.donut.add(dn); MK.icing = F_('#f088b8'); const ic = mesh(new THREE.TorusGeometry(0.075, 0.03, 6, 16, Math.PI * 2), MK.icing); ic.rotation.x = Math.PI / 2; ic.position.y = 0.022; MK.donut.add(ic);
  // a can of beans for "canned food? good for years"
  MK.can = new THREE.Group(); { const lab = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4e8c8'; g.fillRect(0, 34, w, 60); g.fillStyle = '#5a2a1a'; g.font = '700 40px Inter'; g.textAlign = 'center'; g.fillText('BEANS', w / 2, 78); });
    const cn = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 16), [new THREE.MeshStandardMaterial({ map: lab, roughness: 0.4 }), M('#c8ccd4', { metalness: 0.8, roughness: 0.3 }), M('#c8ccd4', { metalness: 0.8, roughness: 0.3 })]); MK.can.add(cn); } }
// ---------- 3) HIGHWAY (desert interstate): the supercar, abandoned cars, then two bikes ----------
const HWY = mkSet({ top: '#3a7ad8', bot: '#f8e0c0', fog: 0xf0d8b8, near: 80, far: 700, hemi: [0xfff4e0, 0x9a7a50, 1.15], sun: [0xfff0d0, 2.6, V3(-12, 16, 6)], shadow: 16 });
const HW = {}; {
  const sc = HWY.sc; gplane(sc, 3000, 3000, '#d8b07a', 0, 0, -0.03); gplane(sc, 14, 3000, '#4c4e56', 0, 0, 0.0);
  for (let z = -1500; z < 1500; z += 9) gplane(sc, 0.18, 3.5, '#f0ead0', 0, z, 0.006); for (const x of [-6.6, 6.6]) gplane(sc, 0.16, 3000, '#f0ead0', x, 0, 0.006);
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, r = 420 + 140 * hash(i), m = mesh(new THREE.CylinderGeometry(1, 1.3, 1, 6), F_(['#c87a4a', '#b8683a', '#d89060'][i % 3])); m.scale.set(40 + 40 * hash(i * 2), 25 + 40 * hash(i * 3), 40 + 30 * hash(i * 4)); m.position.set(Math.cos(a) * r, 12, Math.sin(a) * r); sc.add(m); }   // mesas
  for (let i = 0; i < 160; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.5, 0), F_(['#7a8a4a', '#8a9a5a', '#6a7a3a'][i % 3])); const x = (hash(i * 3.1) - 0.5) * 300; if (Math.abs(x) < 12) continue; b.position.set(x, 0.2, (hash(i * 5.7) - 0.5) * 1200); b.scale.set(1 + hash(i), 0.7, 1 + hash(i * 2)); sc.add(b); }   // sagebrush
  // abandoned cars on the shoulders, doors open, at angles
  for (let i = 0; i < 14; i++) { const g = makeCar(['#e8e4dc', '#3a5a9a', '#8a8c92', '#2a2c32', '#c8b040'][i % 5]); g.position.set((i % 2 ? 1 : -1) * (8 + 1.5 * hash(i)), 0, -40 - i * 55 + 20 * hash(i * 3)); g.rotation.y = (i % 2 ? 0.3 : -0.25) + Math.PI * (i % 3 === 0 ? 1 : 0); sc.add(g); }
  // the supercar: a real-looking Italian V12 roadster in lime green (no badges) — side-profile shape extruded across the width, nose tapered in plan;
  // black sills + big side intakes, Y-shaped head/tail lights, engine louvres, hexagonal exhaust, diffuser fins, open cockpit with two roll hoops
  const car2 = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color: '#8ad41a', roughness: 0.22, metalness: 0.55, flatShading: true }), dk = F_('#16171b', { roughness: 0.5 }), carb = F_('#26272c', { roughness: 0.35, metalness: 0.3 });
  { const P2 = [], arch = (zc, a0, a1) => { for (let k = 0; k <= 10; k++) { const a = a0 + (a1 - a0) * k / 10; P2.push([zc + 0.47 * Math.cos(a), 0.36 + 0.47 * Math.sin(a)]); } };
    P2.push([2.42, 0.36], [2.3, 0.2]); P2.push([1.95, 0.17]); arch(1.42, 0, Math.PI); P2.push([0.85, 0.17], [-0.9, 0.17]); arch(-1.48, 0, Math.PI); P2.push([-2.1, 0.17], [-2.42, 0.3], [-2.46, 0.55], [-2.38, 0.86], [-2.15, 0.97]);
    P2.push([-1.0, 0.98], [-0.55, 0.88], [0.45, 0.84], [1.3, 0.7], [2.1, 0.52], [2.42, 0.4]);
    const shp = new THREE.Shape(P2.map(([z, y]) => new THREE.Vector2(z, y))), g = new THREE.ExtrudeGeometry(shp, { depth: 2.0, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 4, steps: 3 });
    g.translate(0, 0, -1.0); g.rotateY(-Math.PI / 2);   // shape x -> car z (forward), extrude -> car x (width)
    const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); let k = 1;
      if (z > 0.8) k *= 1 - 0.3 * Math.pow((z - 0.8) / 1.65, 1.4); if (y > 0.7) k *= 1 - 0.14 * (y - 0.7) / 0.3; if (z < -0.5 && z > -2.3 && y > 0.45) k *= 1 + 0.07 * Math.sin(Math.PI * (-0.5 - z) / 1.8); if (z < -2.0) k *= 1 - 0.06 * (-2.0 - z) / 0.5;
      if (z > 0.5 && y > 0.5) pa.setY(i, y - 0.05 * Math.abs(x) * (z - 0.5) / 1.9 * 0 + 0.04 * (1 - Math.min(1, Math.abs(x) / 0.25)) * (z - 0.5) / 1.9);   // a raised centre crease on the hood
      pa.setX(i, x * k); }
    g.computeVertexNormals(); const body = mesh(g, paint); car2.add(body); }
  // cockpit tub (dark interior) + windshield frame + glass, roll hoops, seats
  rb(1.5, 0.06, 1.25, dk, 0, 0.86, -0.18, car2, 0.03);
  for (const x of [-0.74, 0.74]) { const ap = rb(0.04, 0.62, 0.04, carb, x, 1.0, 0.55, car2, 0.015); ap.rotation.x = -1.05; }
  { const ws = rb(1.44, 0.62, 0.03, new THREE.MeshStandardMaterial({ color: '#2a3a4a', roughness: 0.03, metalness: 0.7, transparent: true, opacity: 0.72 }), 0, 1.0, 0.55, car2, 0.02); ws.rotation.x = -1.05; }   // steeply raked screen
  for (const x of [-0.42, 0.42]) { rb(0.5, 0.26, 0.4, paint, x, 1.02, -0.92, car2, 0.12); rb(0.5, 0.62, 0.12, F_('#2a2a2e'), x, 1.0, -0.62, car2, 0.06); }
  // engine cover louvres + rear wing lip
  for (let k = 0; k < 6; k++) rb(1.1, 0.03, 0.08, dk, 0, 1.0, -1.25 - k * 0.14, car2, 0.01);
  rb(1.7, 0.05, 0.3, carb, 0, 0.99, -2.25, car2, 0.02);
  // black sills and the big side intakes behind the doors
  for (const s2 of [-1, 1]) { rb(0.06, 0.18, 2.6, carb, s2 * 1.03, 0.28, 0, car2, 0.03);
    const tri = new THREE.Shape([new THREE.Vector2(0.15, 0.32), new THREE.Vector2(-0.95, 0.32), new THREE.Vector2(-0.95, 0.8), new THREE.Vector2(-0.2, 0.74)]); const tg = new THREE.ShapeGeometry(tri); tg.rotateY(s2 * Math.PI / 2);
    const it = mesh(tg, dk, false, false); it.position.x = s2 * 1.0; car2.add(it);
    const mir = rb(0.08, 0.1, 0.22, paint, s2 * 0.98, 1.02, 0.35, car2, 0.03); }
  // Y-shaped head lights + Y-shaped tail lights (emissive strips), front intakes, hexagon exhaust, diffuser fins
  const hlM = new THREE.MeshBasicMaterial({ color: '#f4fbff' }), tlM = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
  for (const s2 of [-1, 1]) { const a = rb(0.44, 0.045, 0.03, hlM, s2 * 0.6, 0.55, 2.31, car2, 0.01); a.rotation.z = s2 * -0.15; const b = rb(0.22, 0.04, 0.03, hlM, s2 * 0.74, 0.5, 2.3, car2, 0.01); b.rotation.z = s2 * 0.6; const b2 = rb(0.2, 0.04, 0.03, hlM, s2 * 0.5, 0.5, 2.31, car2, 0.01); b2.rotation.z = s2 * -0.7;
    const c = rb(0.03, 0.5, 0.03, tlM, s2 * 0.72, 0.72, -2.44, car2, 0.01); c.rotation.z = s2 * 0.25; const d = rb(0.32, 0.03, 0.03, tlM, s2 * 0.58, 0.83, -2.42, car2, 0.01); d.rotation.z = s2 * -0.35;
    const fi = new THREE.Shape([new THREE.Vector2(0.25, 0.2), new THREE.Vector2(0.78, 0.2), new THREE.Vector2(0.72, 0.44), new THREE.Vector2(0.4, 0.36)]); const fg = new THREE.ShapeGeometry(fi); if (s2 < 0) fg.scale(-1, 1, 1); const fm = mesh(fg, dk, false, false); fm.material.side = THREE.DoubleSide; fm.position.z = 2.41; car2.add(fm);   // big black corner intakes
    const hb = rb(0.5, 0.12, 0.05, dk, s2 * 0.6, 0.53, 2.27, car2, 0.02); hb.rotation.z = s2 * -0.15; }
  { const ex = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 6), F_('#5a5c62', { metalness: 0.8, roughness: 0.3 })); ex.rotation.x = Math.PI / 2; ex.position.set(0, 0.42, -2.48); car2.add(ex);
    for (let k = -2; k <= 2; k++) rb(0.03, 0.14, 0.4, carb, k * 0.28, 0.24, -2.3, car2, 0.01); }
  // wheels: low-profile tyres, black multi-spoke rims, red calipers
  for (const [x, z] of [[-1, -1.48], [1, -1.48], [-1, 1.42], [1, 1.42]]) { const w = new THREE.Group(); w.position.set(x * 0.9, 0.38, z); car2.add(w);
    const ty = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.32, 20), F_('#141416')); ty.rotation.z = Math.PI / 2; w.add(ty); const rim = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.33, 10), F_('#2a2c30', { metalness: 0.7, roughness: 0.3 })); rim.rotation.z = Math.PI / 2; w.add(rim);
    for (let k = 0; k < 5; k++) { const sp = rb(0.02, 0.5, 0.06, F_('#3a3c42', { metalness: 0.8 }), x * 0.17, 0, 0, w, 0.01); sp.rotation.x = k * Math.PI / 5; }
    rb(0.05, 0.14, 0.2, F_('#d8202a'), x * 0.1, 0.12, 0.08, w, 0.02); }
  const sw = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 16), dk); sw.position.set(-0.42, 1.0, 0.18); sw.rotation.x = -0.5; car2.add(sw);   // the car is turned 180° in the world: the driver (world x +0.42) sits at local -0.42
  sc.add(car2); HW.car = car2;
  // bikes (you: normal; the friend: tiny)
  const bike = (col) => { const g = new THREE.Group(), fm = F_(col, { roughness: 0.4 }), tb = (a, b, r = 0.025) => { const d = b.clone().sub(a), m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), fm); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(m); };
    const wheels = []; for (const z of [-0.52, 0.52]) { const w = mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 20), M('#1c1e24')); w.rotation.y = Math.PI / 2; w.position.set(0, 0.36, z); g.add(w); wheels.push(w); }
    const S = V3(0, 0.95, -0.15), Hh = V3(0, 1.05, 0.42), Bb = V3(0, 0.42, 0.02); tb(V3(0, 0.36, -0.52), S); tb(S, Hh); tb(Hh, V3(0, 0.36, 0.52)); tb(Bb, S); tb(Bb, V3(0, 0.36, -0.52)); tb(S, V3(0, 0.36, 0.52));
    rb(0.14, 0.05, 0.26, M('#2a2a2e'), 0, 1.0, -0.17, g, 0.02); const hb = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M('#2a2a2e')); hb.rotation.z = Math.PI / 2; hb.position.copy(Hh).add(V3(0, 0.05, 0)); g.add(hb);
    g.userData.wheels = wheels; sc.add(g); return g; };
  HW.bikeA = bike('#2a8ad8'); HW.bikeB = bike('#e84a8a'); HW.bikeB.scale.setScalar(0.66);
  // stale-gas smoke: dark puffs from the exhaust
  HW.smoke = []; for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#3a3a3e', transparent: true, depthWrite: false })); sc.add(s); HW.smoke.push(s); } }
// ---------- 4) NYC SIDEWALK + SUBWAY ENTRANCE: stairs going down between green railings, water rising up the steps ----------
const SUB = mkSet({ top: '#7a9ac8', bot: '#e8e0d8', fog: 0xd8d4d0, near: 30, far: 160, hemi: [0xf0f0ff, 0x6a6058, 1.1], sun: [0xfff4e8, 1.8, V3(8, 16, 10)], shadow: 14 });
const SB = {}; {
  const sc = SUB.sc; gplane(sc, 200, 200, '#5a5c64', 0, 0, -0.02);   // street
  // sidewalk with a hole for the stairwell (x -1..1, z -2..2)
  const sw = F_('#b8b4ac'); for (const [w, d, x, z] of [[40, 8, 0, -7], [40, 8, 0, 7.0], [19, 4, -10.5, 0], [19, 4, 10.5, 0]]) rb(w, 0.2, d, sw, x, 0.1, z, sc, 0.02);
  for (let i = 0; i < 16; i++) { const y = 0.2 - (i + 1) * 0.19, z = -2 + i * 0.28; rb(2, 0.19, 0.3, F_('#9a968e'), 0, y + 0.095, z, sc, 0.01); }   // steps down toward +z
  rb(0.15, 3.4, 4.2, F_('#8a8680'), -1.08, -1.5, 0, sc, 0.01); rb(0.15, 3.4, 4.2, F_('#8a8680'), 1.08, -1.5, 0, sc, 0.01); rb(2.3, 3.4, 0.15, F_('#8a8680'), 0, -1.5, 2.08, sc, 0.01);
  const green = F_('#1f5a3a', { roughness: 0.5, metalness: 0.3 });
  for (const x of [-1.15, 1.15]) { rb(0.06, 0.06, 4.2, green, x, 1.05, 0, sc, 0.02); for (let z = -2; z <= 2.01; z += 0.5) rb(0.04, 0.85, 0.04, green, x, 0.62, z, sc, 0.01); }
  rb(2.36, 0.06, 0.06, green, 0, 1.05, 2.1, sc, 0.02);
  for (const x of [-1.15, 1.15]) { const p = mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2), green); p.position.set(x, 1.1, -2.05); sc.add(p); const gl = mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshStandardMaterial({ color: '#5ad08a', emissive: '#3aa060', emissiveIntensity: 0.9 })); gl.position.set(x, 2.3, -2.05); sc.add(gl); }
  const sign = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#1a1a1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = '600 56px Inter'; g.textAlign = 'center'; g.fillText('SUBWAY', w / 2, 66); });
  const sgn = mesh(new THREE.BoxGeometry(2.2, 0.36, 0.06), new THREE.MeshStandardMaterial({ map: sign }), false, false); sgn.position.set(0, 1.7, -2.12); sc.add(sgn);
  // facades (behind) + a few parked cabs
  for (let i = 0; i < 9; i++) { const x = -24 + i * 6, h = 14 + 20 * hash(i), b = rb(5.8, h, 8, F_(['#b8705a', '#c8b89a', '#8a8a92', '#a87a5a'][i % 4]), x, h / 2, -15, sc, 0.05);
    const wt = canvasTex(64, 128, (g, w, hh) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, hh); g.fillStyle = '#3a4a5a'; for (let r = 0; r < 8; r++) for (let c2 = 0; c2 < 3; c2++) g.fillRect(6 + c2 * 20, 6 + r * 15, 12, 9); });
    const wm = mesh(new THREE.PlaneGeometry(5.2, h - 2), new THREE.MeshStandardMaterial({ map: wt, transparent: true }), false, false); wt.repeat.set(1, Math.round(h / 6)); wt.wrapT = THREE.RepeatWrapping; wm.position.set(x, h / 2 + 0.5, -10.98); sc.add(wm); }
  for (const x of [-8, 6]) { const cab = makeCar('#f4c430'); cab.rotation.y = Math.PI / 2; cab.position.set(x, 0, 12.5); sc.add(cab); }
  // the water: a plane inside the stairwell that rises, then a sheet spreading over the sidewalk
  SB.water = mesh(new THREE.PlaneGeometry(2.1, 4.1), new THREE.MeshStandardMaterial({ color: '#3a5a6a', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.88 }), false, true); SB.water.rotation.x = -Math.PI / 2; sc.add(SB.water);
  SB.sheet = mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: '#4a6a7a', roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.75 }), false, true); SB.sheet.rotation.x = -Math.PI / 2; sc.add(SB.sheet); }
// ---------- 5) THE WHITE HOUSE (north facade): white block, portico with columns, flag, lawn, fountain; a ballot box ----------
const WH = mkSet({ top: '#4a86d8', bot: '#eaf0f8', fog: 0xdce6f0, near: 60, far: 400, sun: [0xfff4e4, 2.4, V3(8, 14, 12)], shadow: 22 });
const WHS = {}; {
  const sc = WH.sc, wm = F_('#f4f2ec', { roughness: 0.7 }); gplane(sc, 800, 800, '#6aac4c', 0, 0, -0.02); gplane(sc, 6, 60, '#d8d0c0', 0, 20, 0.01);
  rb(34, 10, 14, wm, 0, 5, -14, sc, 0.05); rb(34.5, 0.6, 14.5, wm, 0, 10.2, -14, sc, 0.05); rb(33, 1.2, 13, wm, 0, 11.1, -14, sc, 0.05);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 11; i++) { if (Math.abs(i - 5) < 2) continue; const x = -15 + i * 3; rb(1.3, 2.0, 0.1, F_('#3a4a5a', { roughness: 0.2 }), x, 3 + r * 4, -6.94, sc, 0.02); rb(1.6, 0.25, 0.3, wm, x, 4.2 + r * 4, -6.85, sc, 0.03); }
  rb(12, 0.6, 5, wm, 0, 0.3, -4.5, sc, 0.03); for (let i = 0; i < 4; i++) { const c = mesh(new THREE.CylinderGeometry(0.42, 0.48, 9.2, 12), wm); c.position.set(-4.5 + i * 3, 5.2, -2.6); sc.add(c); }
  const ped = new THREE.Shape([new THREE.Vector2(-6.4, 0), new THREE.Vector2(6.4, 0), new THREE.Vector2(0, 2.4)]); const pg = new THREE.ExtrudeGeometry(ped, { depth: 4.6, bevelEnabled: false }); const pdm = mesh(pg, wm); pdm.position.set(0, 9.8, -7.0); sc.add(pdm); rb(13, 0.6, 4.8, wm, 0, 9.8, -4.7, sc, 0.03);
  rb(2.2, 4.0, 0.2, F_('#3a4a5a'), 0, 2.6, -6.92, sc, 0.03);   // door
  const pole = mesh(new THREE.CylinderGeometry(0.08, 0.08, 6), F_('#d8d8dc', { metalness: 0.6 })); pole.position.set(0, 14.7, -14); sc.add(pole);
  const flagT = canvasTex(192, 100, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#c8202a'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#2a3a7a'; g.fillRect(0, 0, w * 0.4, h * 7 / 13); g.fillStyle = '#fff'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) g.fillRect(6 + c * 12, 5 + r * 10, 3, 3); });
  WHS.flag = mesh(new THREE.PlaneGeometry(3.0, 1.6, 12, 1), new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide, roughness: 0.8 }), false, false); WHS.flag.position.set(1.55, 16.6, -14); sc.add(WHS.flag); WHS.flag.userData.p0 = WHS.flag.geometry.attributes.position.array.slice();
  const fn = mesh(new THREE.CylinderGeometry(4, 4.2, 0.6, 24), wm); fn.position.set(0, 0.3, 14); sc.add(fn); const fw = mesh(new THREE.CircleGeometry(3.7, 24), new THREE.MeshStandardMaterial({ color: '#5a8ab8', roughness: 0.05, metalness: 0.4 })); fw.rotation.x = -Math.PI / 2; fw.position.set(0, 0.58, 14); sc.add(fw);
  for (let i = 0; i < 20; i++) { const tr = mesh(new THREE.IcosahedronGeometry(2.4, 0), F_(['#4a8a3a', '#5a9a42'][i % 2])); tr.position.set((i % 2 ? 1 : -1) * (22 + 10 * hash(i)), 3.5, -30 + i * 5); sc.add(tr); }
  // ballot box with two slips
  WHS.box = new THREE.Group(); rb(0.7, 0.6, 0.5, F_('#2a4a9a'), 0, 0.85, 0, WHS.box, 0.04); rb(0.3, 0.02, 0.05, F_('#101010'), 0, 1.16, 0, WHS.box, 0.01); rb(0.72, 0.55, 0.52, F_('#f4f2ec'), 0, 0.28, 0, WHS.box, 0.03);
  const vt = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8202a'; g.font = '700 46px Inter'; g.textAlign = 'center'; g.fillText('VOTE', w / 2, 64); });
  const vp = mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: vt })); vp.position.set(0, 0.85, 0.252); WHS.box.add(vp); WHS.box.position.set(0, 0, 9); sc.add(WHS.box);
  WHS.slips = [0, 1].map(() => { const s = mesh(new THREE.PlaneGeometry(0.16, 0.22), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide })); sc.add(s); return s; }); }
// ---------- 6) THE MANSION living room: huge room, tall windows, chandelier, fireplace, a far-too-small couch with the friend asleep ----------
const MAN = mkSet({ top: '#f8f0e4', bot: '#f8f0e4', fog: 0xf0e8dc, near: 30, far: 120, hemi: [0xfff4e8, 0x8a7a68, 1.0], sun: [0xfff0d8, 2.2, V3(-14, 10, 4)], shadow: 16 });
const MS = {}; {
  const sc = MAN.sc; const wood = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = ['#a8743e', '#b8824a', '#9a6a38', '#b07a44'][i % 4]; g.fillRect(0, i * 16, w, 16); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, i * 16 + 15, w, 1); } }, [8, 8]);
  gplane(sc, 30, 30, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5 }), 0, 0);
  const wall = F_('#efe6d6'); rb(30, 9, 0.3, wall, 0, 4.5, -8, sc, 0.02); rb(0.3, 9, 30, wall, 8, 4.5, 0, sc, 0.02);
  const winW = rb(0.3, 9, 30, wall, -8, 4.5, 0, sc, 0.02); winW.visible = true;
  const sky2 = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7ab0e8'); gr.addColorStop(1, '#f4e0c8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const x = hash(i * 3.3) * w, bw = 20 + 40 * hash(i * 1.7), bh = 120 + 300 * hash(i * 2.9); g.fillStyle = ['#6a7a8e', '#7a8698', '#5a6a80', '#8a94a4'][i % 4]; g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = 'rgba(255,240,200,0.35)'; for (let y = h - bh + 8; y < h; y += 14) for (let xx = x + 4; xx < x + bw - 4; xx += 9) if (hash(xx * 0.3 + y) < 0.3) g.fillRect(xx, y, 4, 6); }
    g.fillStyle = '#8a96a8'; g.fillRect(250, 120, 34, 392); g.fillRect(258, 70, 18, 50); g.fillRect(265, 30, 4, 40); });   // a tall tower with a spire in the middle
  for (const z of [-4.5, 0, 4.5]) { const g = mesh(new THREE.PlaneGeometry(2.6, 6.2), new THREE.MeshBasicMaterial({ map: sky2 }), false, false); g.rotation.y = Math.PI / 2; g.position.set(-7.83, 4.4, z); sc.add(g); rb(0.12, 6.4, 0.16, F_('#ffffff'), -7.82, 4.4, z, sc, 0.02); }
  const crown = F_('#ffffff'); rb(30, 0.3, 0.4, crown, 0, 8.8, -7.8, sc, 0.02);
  // fireplace
  rb(3.2, 2.4, 0.6, F_('#e8e2d6'), 2, 1.2, -7.6, sc, 0.03); rb(2.0, 1.4, 0.3, F_('#2a2420'), 2, 0.8, -7.4, sc, 0.02); rb(3.6, 0.2, 0.8, F_('#f4f0e8'), 2, 2.45, -7.55, sc, 0.03);
  const art = canvasTex(128, 96, (g, w, h) => { g.fillStyle = '#e8c88a'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a8ab8'; g.fillRect(8, 8, w - 16, h / 2); g.fillStyle = '#4a7a3a'; g.fillRect(8, h / 2, w - 16, h / 2 - 8); });
  const pic = mesh(new THREE.PlaneGeometry(2.4, 1.8), new THREE.MeshStandardMaterial({ map: art }), false, false); pic.position.set(2, 4.6, -7.84); sc.add(pic);
  // chandelier
  const ch = new THREE.Group(); ch.position.set(0, 7.6, -1); sc.add(ch); const gold = F_('#d8b050', { metalness: 0.8, roughness: 0.3 }); const rod = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4), gold); rod.position.y = 0.7; ch.add(rod);
  const ring = mesh(new THREE.TorusGeometry(0.9, 0.04, 6, 24), gold); ring.rotation.x = Math.PI / 2; ch.add(ring); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, b = mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff4d0' })); b.position.set(Math.cos(a) * 0.9, 0.1, Math.sin(a) * 0.9); ch.add(b); }
  // rug + the tiny couch
  gplane(sc, 7, 5, F_('#8a3a3a'), 0, 0.5, 0.01); MS.couch = new THREE.Group(); MS.couch.position.set(0, 0, 0.2); sc.add(MS.couch);
  const cm = F_('#5a7a9a', { roughness: 0.95 }); rb(1.6, 0.42, 0.85, cm, 0, 0.3, 0, MS.couch, 0.1); rb(1.6, 0.6, 0.22, cm, 0, 0.65, -0.34, MS.couch, 0.1); for (const x of [-0.85, 0.85]) rb(0.2, 0.55, 0.85, cm, x, 0.4, 0, MS.couch, 0.08);
  rb(0.5, 0.3, 0.4, F_('#e8d8b8'), -0.55, 0.62, -0.05, MS.couch, 0.12);   // pillow
  // a side table with a lamp, a plant, the empty chip bags
  rb(0.6, 0.6, 0.6, F_('#6a4a32'), 1.3, 0.3, 0.2, sc, 0.03); for (let i = 0; i < 5; i++) { const b = rb(0.2, 0.26, 0.06, F_(['#f4c430', '#e8463a', '#3a6ad8'][i % 3]), 0.4 + 0.3 * hash(i * 2), 0.03, 1.0 + 0.4 * hash(i * 3), sc, 0.02); b.rotation.set(-Math.PI / 2, 0, hash(i) * 3); } }
