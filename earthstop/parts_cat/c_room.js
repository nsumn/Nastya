
// =================== LIVING ROOM (meters): parquet, plaster walls, a sunny window, scanned furniture ===================
const room = new THREE.Scene();
const rCam = new THREE.PerspectiveCamera(60, W / H, 0.02, 60);
const sun = new THREE.DirectionalLight(0xfff0e2, 6.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 30 }); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.01; sun.shadow.radius = 2;
sun.position.set(-3.5, 3.2, -6.0); sun.target.position.set(0.4, 0, 0.6); room.add(sun, sun.target);
const lampL = new THREE.PointLight(0xffb86a, 0, 6, 2); lampL.position.set(1.9, 1.1, -1.8); room.add(lampL);
const ROOM = { w: 6.0, d: 6.0, h: 2.7 };
async function pbrMat(name, rep, o = {}) { const p = await pbrSet(name, rep); return new THREE.MeshStandardMaterial({ map: p.map, normalMap: p.nor, roughnessMap: p.arm, aoMap: p.arm, roughness: 1, ...o }); }
async function placeModel(id, x, y, z, ry = 0, s = 1) {
  const g = (await gltf(`models/${id}/${id}.gltf`)).scene; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); room.add(g); return g;
}
const props = {};
async function buildRoom() {
  const hdr = await hdrP('hdri/lythwood_room_2k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  room.environment = pmrem.fromEquirectangular(hdr).texture; room.environmentIntensity = 0.6;
  const outHdr = await hdrP('hdri/grasslands_sunset_2k.hdr'); outHdr.mapping = THREE.EquirectangularReflectionMapping; room.background = outHdr; room.backgroundRotation.set(0, 1.9, 0); room.userData.day = outHdr;
  const floorM = await pbrMat('diagonal_parquet', [1, 1], { color: new THREE.Color('#b4aca4') }); for (const t of [floorM.map, floorM.normalMap, floorM.roughnessMap]) t.repeat.set(ROOM.w / 1.2, ROOM.d / 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; room.add(floor);
  const wp = await pbrSet('clay_plaster', [3, 1.4]); for (const t of [wp.nor]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.4); }
  const wallM = new THREE.MeshStandardMaterial({ color: '#ebe4d8', roughness: 0.92, normalMap: wp.nor, normalScale: new THREE.Vector2(0.35, 0.35) });
  const wall = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, ROOM.h), wallM); m.position.set(x, ROOM.h / 2, z); m.rotation.y = ry; m.receiveShadow = true; room.add(m); return m; };
  // back wall with a window opening (two wall pieces + lintel + sill)
  const WX0 = -1.6, WX1 = -0.2, WY0 = 0.75, WY1 = 2.2, BZ = -ROOM.d / 2;
  const seg = (x0, x1, y0, y1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), wallM); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, BZ); m.receiveShadow = true; m.castShadow = true; room.add(m); };
  seg(-ROOM.w / 2, WX0, 0, ROOM.h); seg(WX1, ROOM.w / 2, 0, ROOM.h); seg(WX0, WX1, 0, WY0); seg(WX0, WX1, WY1, ROOM.h);
  
  const frameM = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 });
  for (const [w, h, x, y] of [[WX1 - WX0 + 0.1, 0.06, (WX0 + WX1) / 2, WY0], [WX1 - WX0 + 0.1, 0.06, (WX0 + WX1) / 2, WY1], [0.06, WY1 - WY0, WX0, (WY0 + WY1) / 2], [0.06, WY1 - WY0, WX1, (WY0 + WY1) / 2], [0.04, WY1 - WY0, (WX0 + WX1) / 2, (WY0 + WY1) / 2]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameM); b.position.set(x, y, BZ); b.castShadow = true; room.add(b); }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(WX1 - WX0 + 0.3, 0.04, 0.25), frameM); sill.position.set((WX0 + WX1) / 2, WY0 - 0.02, BZ + 0.1); sill.castShadow = true; room.add(sill);
  wall(ROOM.d, -ROOM.w / 2, 0, Math.PI / 2); wall(ROOM.d, ROOM.w / 2, 0, -Math.PI / 2); wall(ROOM.w, 0, ROOM.d / 2, Math.PI);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), new THREE.MeshStandardMaterial({ color: '#f3efe8', roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; room.add(ceil);
  // baseboards
  for (const [w, x, z, ry] of [[ROOM.w, 0, BZ + 0.01, 0], [ROOM.d, -ROOM.w / 2 + 0.01, 0, Math.PI / 2], [ROOM.d, ROOM.w / 2 - 0.01, 0, -Math.PI / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.02), frameM); b.position.set(x, 0.05, z); b.rotation.y = ry; b.receiveShadow = true; room.add(b); }
  // rug
  const rugM = await pbrMat('fabric_pattern_05', [1, 1]); for (const t of [rugM.map, rugM.normalMap, rugM.roughnessMap]) t.repeat.set(2.2, 1.6);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.012, 1.9), rugM); rug.position.set(0.2, 0.006, 0.0); rug.receiveShadow = true; room.add(rug);
  // furniture (real sizes)
  props.sofa = await placeModel('sofa_02', 0.25, 0, -1.55, 0, 1.15);
  props.table = await placeModel('modern_coffee_table_01', 0.2, 0.012, 0.05, Math.PI / 2);
  props.chair = await placeModel('modern_arm_chair_01', 1.85, 0, 0.4, -1.2);
  props.shelf = await placeModel('wooden_bookshelf_worn', 2.6, 0, -1.6, -Math.PI / 2);
  props.plant = await placeModel('potted_plant_02', -2.2, 0.1, -2.3, 0.4, 1.5);
  props.side = await placeModel('side_table_01', 1.75, 0, -1.5, 0.2);
  props.pillow = await placeModel('throw_pillows_01', -0.9, 0.26, 1.0, 0.5);
  props.duck = await placeModel('rubber_duck_toy', 0.42, 0.012, 0.95, 2.6, 0.45);
  // colour line-up on the rug (real objects + a pumpkin and a blue ball)
  props.apple = await placeModel('food_apple_01', -0.62, 0.012, 0.95, 0.3, 1.3);
  props.lime = await placeModel('food_lime_01', -0.38, 0.012, 1.0, 0, 1.4);
  props.lemon = await placeModel('lemon', 0.15, 0.06, 1.02, 0.4, 1.3);
  { const g = new THREE.Group(); const pg = new THREE.SphereGeometry(0.09, 48, 24); const pp = pg.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); const a = Math.atan2(z, x); const k = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 5)), 0.5); pp.setXYZ(i, x * k, y * 0.78 * (1 - 0.15 * Math.pow(Math.abs(y / 0.09), 6)), z * k); }
    pg.computeVertexNormals(); const pm = new THREE.MeshStandardMaterial({ color: '#e8701a', roughness: 0.55 }); const pu = new THREE.Mesh(pg, pm); pu.position.y = 0.07; pu.castShadow = pu.receiveShadow = true; g.add(pu);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#4a6a2a', roughness: 0.8 })); st.position.y = 0.15; st.rotation.z = 0.25; g.add(st);
    g.position.set(-0.1, 0.012, 0.98); room.add(g); props.pumpkin = g; }
  { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 40, 24), new THREE.MeshPhysicalMaterial({ color: '#1f5fe0', roughness: 0.25, clearcoat: 0.6 })); b.position.set(0.72, 0.062, 0.98); b.castShadow = b.receiveShadow = true; room.add(b); props.blue = b; }
  // the mouse (a photoscanned rodent, mouse-sized) and its hole in the left baseboard
  props.mouse = await placeModel('street_rat', 2.3, 0.0, -1.0, 0, 1.0);
  { const hole = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#050403' })); hole.position.set(-ROOM.w / 2 + 0.025, 0.0, 0.6); hole.rotation.y = Math.PI / 2; room.add(hole); props.hole = hole; }
  // the front door (right wall) with a cat flap
  { const dm = new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.45 }); const g = new THREE.Group(); g.position.set(ROOM.w / 2 - 0.04, 0, 1.8); g.rotation.y = -Math.PI / 2; room.add(g);
    const piece = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), dm); m.position.set(x, y, 0); m.castShadow = m.receiveShadow = true; g.add(m); };
    const FW = 0.2, FY0 = 0.05, FY1 = 0.27; piece(0.9, 2.05 - FY1, 0, (FY1 + 2.05) / 2); piece(0.9, FY0, 0, FY0 / 2); piece((0.9 - FW) / 2, FY1 - FY0, -(0.9 + FW) / 4, (FY0 + FY1) / 2); piece((0.9 - FW) / 2, FY1 - FY0, (0.9 + FW) / 4, (FY0 + FY1) / 2);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: '#b8a070', metalness: 0.9, roughness: 0.3 })); knob.position.set(0.36, 1.0, 0.05); g.add(knob);
    const flapPivot = new THREE.Group(); flapPivot.position.set(0, FY1, 0); g.add(flapPivot);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(FW, FY1 - FY0, 0.006), new THREE.MeshPhysicalMaterial({ color: '#c8c0b0', roughness: 0.2, transmission: 0.3, transparent: true, opacity: 0.85 })); flap.position.y = -(FY1 - FY0) / 2; flapPivot.add(flap);
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(FW, FY1 - FY0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 3.0, 2.8) })); outside.position.set(0, (FY0 + FY1) / 2, -0.03); g.add(outside);
    for (const [w, h, x, y] of [[0.06, 2.1, -0.48, 1.05], [0.06, 2.1, 0.48, 1.05], [1.02, 0.06, 0, 2.08]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameM); m.position.set(x, y, 0.01); g.add(m); }
    props.door = g; props.flap = flapPivot; }
  // food corner: bowl + a slice of cake on the floor
  props.bowl = await placeModel('wooden_bowl_01', 2.35, 0, 2.55, 0, 0.8);
  props.cake = await placeModel('strawberry_chocolate_cake', 2.0, 0, 2.62, 0.6, 0.8);
}
