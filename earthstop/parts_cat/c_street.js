
// =================== STREET (meters): suburban street HDRI on a grounded skybox + scanned grass, a fire hydrant, a trash can, sparrows ===================
const street = new THREE.Scene();
const sCam = new THREE.PerspectiveCamera(70, W / H, 0.02, 400);
const stSun = new THREE.DirectionalLight(0xfff4e6, 4.0); stSun.castShadow = true; stSun.shadow.mapSize.set(2048, 2048);
Object.assign(stSun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 40 }); stSun.shadow.bias = -0.0003; street.add(stSun, stSun.target);
const night = new THREE.Scene();
const STREET = {};
const sparrows = [];
async function buildStreet() {
  const hdr = await hdrP('hdri/suburban_garden_4k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  street.environment = pmrem.fromEquirectangular(hdr).texture; street.environmentIntensity = 1.0;
  const sky = new GroundedSkybox(hdr, 1.7, 80); sky.position.y = 1.7 - 0.01; street.add(sky);
  stSun.position.set(-8, 10, -4); stSun.target.position.set(0, 0, -2);
  // a real grass verge under the paws (scanned grass clumps on a lawn texture), faded into the photo
  const g = await pbrSet('leafy_grass', [6, 6]);
  const fadeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(5, 64), new THREE.MeshStandardMaterial({ map: g.map, normalMap: g.nor, roughnessMap: g.arm, roughness: 1, color: new THREE.Color('#8fbf5a'), alphaMap: fadeTex, transparent: true, depthWrite: false }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.002; lawn.receiveShadow = true; street.add(lawn);
  const clumps = []; for (const f of ['grass_medium_01', 'grass_medium_02']) { const gl = await gltf(`models/${f}/${f}.gltf`); gl.scene.traverse(o => { if (o.isMesh && /small|tiny|grass_medium_02/.test(o.name) && !/LOD[12]/.test(o.name)) clumps.push(o); }); }
  const o3 = new THREE.Object3D(); const per = Math.round(6000 / clumps.length);
  for (const c of clumps) { const im = new THREE.InstancedMesh(c.geometry, c.material, per); c.material.side = THREE.DoubleSide; c.material.alphaTest = 0.5;
    for (let k = 0; k < per; k++) { const a = R(0, 6.28), r = Math.pow(rnd(), 0.6) * 3.6; o3.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1.0); o3.rotation.set(0, R(0, 6.28), 0); const s = R(0.6, 1.0); o3.scale.set(s, s * R(0.8, 1.2), s); o3.updateMatrix(); im.setMatrixAt(k, o3.matrix); }
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false; street.add(im); }
  const hyd = (await gltf('models/fire_hydrant/fire_hydrant.gltf')).scene; hyd.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); hyd.position.set(0.55, 0, -2.4); hyd.rotation.y = 0.6; hyd.visible = false; street.add(hyd); STREET.hyd = hyd;
  const can = (await gltf('models/metal_trash_can/metal_trash_can.gltf')).scene; can.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); can.visible = false; street.add(can);
  // sparrows: simple but shaded birds (body, head, beak, two wings) pecking on the lawn, then flying off
  const bm = new THREE.MeshStandardMaterial({ color: '#7a5a3e', roughness: 0.8 }), bb = new THREE.MeshStandardMaterial({ color: '#d8c8b0', roughness: 0.8 }), bk = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.6 });
  for (let i = 0; i < 6; i++) { const gB = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), bm); body.scale.set(1, 0.85, 1.5); gB.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), bb); belly.position.set(0, -0.012, 0.005); belly.scale.set(0.9, 0.7, 1.3); gB.add(belly);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), bm); head.position.set(0, 0.025, -0.045); gB.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.016, 8), bk); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.022, -0.068); gB.add(beak);
    const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.004, 0.05), bm); w.geometry.translate(0.035 * s, 0, 0); w.position.set(0.012 * s, 0.012, 0); gB.add(w); return w; });
    gB.traverse(o => { if (o.isMesh) o.castShadow = true; }); street.add(gB);
    sparrows.push({ g: gB, wings, x: R(-0.8, 0.8), z: R(-3.4, -1.9), ph: R(0, 6), vx: R(-1, 1), vy: R(1.2, 2.2), vz: R(-2.5, -1) }); }
  // night street
  const nh = await hdrP('hdri/street_lamp_2k.hdr'); nh.mapping = THREE.EquirectangularReflectionMapping; night.environment = pmrem.fromEquirectangular(nh).texture; night.environmentIntensity = 1.0;
  const nsky = new GroundedSkybox(nh, 1.7, 80); nsky.position.y = 1.7 - 0.01; night.add(nsky);
}
function updateStreet(t) {
  const fly = t - (OUT + 3.0);
  for (const S of sparrows) { const k = Math.max(0, fly - S.ph * 0.05);
    const peck = k <= 0 ? Math.max(0, Math.sin(t * 6 + S.ph * 3)) * 0.4 : 0;
    S.g.position.set(S.x + S.vx * k * 0.8, 0.03 + (k > 0 ? S.vy * k + 0.5 * k * k : 0), S.z + S.vz * k);
    S.g.rotation.set(peck + (k > 0 ? -0.4 : 0), S.ph + (k > 0 ? 0.0 : Math.sin(t + S.ph) * 0.5), 0);
    const f = k > 0 ? Math.sin(t * 40 + S.ph) * 0.9 : -0.1; S.wings[0].rotation.z = f; S.wings[1].rotation.z = -f; }
}
