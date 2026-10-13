
// =================== LIVING ROOM (meters): parquet, plaster walls, a sunny window, scanned furniture ===================
const room = new THREE.Scene();
const rCam = new THREE.PerspectiveCamera(60, W / H, 0.02, 60);
const sun = new THREE.DirectionalLight(0xffe2b8, 6.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
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
  const floorM = await pbrMat('diagonal_parquet', [1, 1], { color: new THREE.Color('#c9b7a2') }); for (const t of [floorM.map, floorM.normalMap, floorM.roughnessMap]) t.repeat.set(ROOM.w / 1.2, ROOM.d / 1.2);
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
  props.duck = await placeModel('rubber_duck_toy', 0.05, 0.012, 0.75, 2.7, 0.55);
}
