// =================== STUDIO: 49 Americans vs 10 Brits (4.9 : 1) ===================
const studio = new THREE.Scene(); studio.background = new THREE.Color('#141a26'); studio.fog = new THREE.Fog('#141a26', 30, 70);
const stCam = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
studio.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 1.3));
const stKey = new THREE.DirectionalLight(0xffffff, 2.2); stKey.position.set(6, 12, 10); stKey.castShadow = true; stKey.shadow.mapSize.set(1024, 1024);
Object.assign(stKey.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); studio.add(stKey);
{
  const fl = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#2a3142', roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; studio.add(fl);
  const plat = (x, w, d, col) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 48), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })); m.scale.set(w, 1, d); m.position.set(x, 0.15, col === '#b22234' ? -3.4 : 3.6); m.receiveShadow = true; studio.add(m); };
  plat(0, 3.4, 3.0, '#b22234'); plat(0, 1.7, 1.5, '#012169');
}
const usGroup = [], ukGroup = [];
for (let i = 0; i < 49; i++) { const p = makePerson(rnd); studio.add(p.outer); const r = Math.sqrt((i + 0.5) / 49) * 2.9, a = i * 2.39996; usGroup.push({ p, x: Math.cos(a) * r, z: -3.4 + Math.sin(a) * r * 0.85, ph: R(0, 6), t0: T_RATIO + 0.3 + R(0, 1.6) }); }
for (let i = 0; i < 10; i++) { const p = makePerson(rnd); studio.add(p.outer); const r = Math.sqrt((i + 0.5) / 10) * 1.25, a = i * 2.39996; ukGroup.push({ p, x: Math.cos(a) * r * 1.2, z: 3.6 + Math.sin(a) * r * 0.9, ph: R(0, 6), t0: T_RATIO }); }
function updateStudio(t) {
  for (const g of [usGroup, ukGroup]) for (const P of g) {
    const k = smooth(P.t0, P.t0 + 0.35, t); const pop = k < 1 ? k * (1 + 0.25 * Math.sin(k * Math.PI)) : 1;
    P.p.outer.visible = k > 0.01; P.p.outer.position.set(P.x, 0.3 + 0.95 * pop, P.z); P.p.outer.scale.setScalar(Math.max(pop, 0.01)); P.p.outer.rotation.set(0, Math.atan2(stCam.position.x - P.x, stCam.position.z - P.z) + Math.sin(P.ph) * 0.4, 0);
    poseIdle(P.p, t, P.ph);
  }
  const u = (t - T_RATIO) / (T_AIR - T_RATIO);
  stCam.position.set(lerp(0.4, -0.4, u), lerp(12.5, 11.5, u), lerp(17.5, 16.5, u)); stCam.fov = 44; stCam.lookAt(0, -1.6, 0.2); stCam.updateProjectionMatrix();
}

// =================== SHOP: one supermarket aisle emptying out ===================
const shop = new THREE.Scene(); shop.background = new THREE.Color('#e9ecef'); shop.fog = new THREE.Fog('#e9ecef', 25, 60);
const shopCam = new THREE.PerspectiveCamera(60, W / H, 0.05, 200);
shop.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.6));
const shopKey = new THREE.DirectionalLight(0xffffff, 1.2); shopKey.position.set(2, 8, 4); shop.add(shopKey);
const PROD = [];
{
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ color: '#cfd3d6', roughness: 0.4 })); fl.rotation.x = -Math.PI / 2; fl.position.z = -20; shop.add(fl);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ color: '#f2f2f0' })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.2, -20); shop.add(ceil);
  for (let z = -2; z > -44; z -= 4) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: '#ffffff' })); l.position.set(0, 4.15, z); shop.add(l); }
  const shelfM = new THREE.MeshStandardMaterial({ color: '#7d8790', roughness: 0.5, metalness: 0.3 });
  const PCOL = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#457b9d', '#ffb4a2', '#8ac926', '#ff595e', '#6a4c93', '#1982c4', '#ffca3a', '#f1faee'];
  const geo = new THREE.BoxGeometry(1, 1, 1); const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), 2400); const d = new THREE.Object3D(); let n = 0;
  for (const side of [-1, 1]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 40), shelfM); back.position.set(side * 2.2, 1.2, -22); shop.add(back);
    for (let lv = 0; lv < 5; lv++) {
      const y = 0.15 + lv * 0.48; const sh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 40), shelfM); sh.position.set(side * 1.9, y, -22); shop.add(sh);
      for (let z = -2.2; z > -41.8 && n < 2400;) { const w = R(0.14, 0.3), h = R(0.2, 0.38); d.position.set(side * 1.88, y + h / 2 + 0.02, z - w / 2); d.scale.set(R(0.3, 0.45), h, w); d.updateMatrix(); im.setMatrixAt(n, d.matrix); im.setColorAt(n, new THREE.Color(pick(PCOL))); PROD.push({ m: d.matrix.clone(), t: T_SHOP + 0.4 + Math.pow(rnd(), 0.8) * 4.6 }); n++; z -= w + 0.02; }
    }
  }
  im.count = n; shop.add(im); PROD.im = im;
}
const shoppers = [];
for (let i = 0; i < 18; i++) { const p = makePerson(rnd); shop.add(p.outer); shoppers.push({ p, x: R(-1.2, 1.2), z: R(-30, -4), v: R(-1.6, 1.6), ph: R(0, 6) }); }
const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
function updateShop(t) {
  const im = PROD.im; for (let i = 0; i < PROD.length; i++) im.setMatrixAt(i, t < PROD[i].t ? PROD[i].m : zeroM); im.instanceMatrix.needsUpdate = true;
  for (const S of shoppers) { const z = wrapR(S.z + S.v * (t - T_SHOP), -40, -3); S.p.outer.position.set(S.x, 0.95, z); S.p.outer.rotation.set(0, S.v > 0 ? 0 : Math.PI, 0); poseWalk(S.p, t * 5 + S.ph, 1); }
  const u = (t - T_SHOP) / (T_TIMES - T_SHOP);
  shopCam.position.set(0.15, 1.7, lerp(1.5, -3.5, u)); shopCam.lookAt(0, 1.2, -30); shopCam.updateProjectionMatrix();
}
