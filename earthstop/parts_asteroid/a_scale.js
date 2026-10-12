// =================== SCALE scene: the asteroid parked next to the Empire State Building (meters, true scale) ===================
const scaleScene = new THREE.Scene(); scaleScene.background = new THREE.Color('#070a14'); scaleScene.fog = new THREE.Fog('#0b1020', 2500, 14000);
const scaleCam = new THREE.PerspectiveCamera(46, W / H, 5, 30000);
scaleScene.add(new THREE.HemisphereLight(0x7d8fc8, 0x4a3420, 1.7));
const scMoon = new THREE.DirectionalLight(0xaebcff, 1.5); scMoon.position.set(-2000, 2500, 3000); scaleScene.add(scMoon);
const scCity = new THREE.PointLight(0xffb070, 2.2, 0, 0); scCity.position.set(400, 120, 900); scaleScene.add(scCity);
const ESB_TIP = 443.2, ROCK_D = 1609.3;
{
  const g = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 1 })); g.rotation.x = -Math.PI / 2; scaleScene.add(g);
  // window texture for the skyline
  const winTex = canvasTex(64, 256, (g2, w, h) => { g2.fillStyle = '#1b1d24'; g2.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 5) for (let x = 2; x < w; x += 5) if (rnd() < 0.42) { g2.fillStyle = pick(['#ffd28a', '#ffe6b0', '#ffc070', '#d8e4ff']); g2.fillRect(x, y, 3, 3); } });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  const bm = new THREE.MeshStandardMaterial({ color: '#4a4c55', map: winTex, emissiveMap: winTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.9, roughness: 0.8 });
  // Manhattan-ish grid of blocks around (0,0); keep the plaza where the rock sits empty
  const N = 1500; const im = new THREE.InstancedMesh(BOX, bm, N); const d = new THREE.Object3D(); let n = 0;
  for (let gx = -40; gx <= 40 && n < N; gx++) for (let gz = -60; gz <= 12 && n < N; gz++) {
    const x = gx * 80 + R(-8, 8), z = gz * 60 + R(-6, 6);
    if (Math.hypot(x + 1010, z) < 900) continue; if (Math.abs(x) < 70 && Math.abs(z) < 50) continue;
    if (rnd() < 0.25) continue;
    const far = Math.hypot(x, z); const h = rnd() < 0.08 ? R(150, 320) : R(25, 110) * (far < 1500 ? 1.2 : 0.8);
    d.position.set(x, h / 2, z); d.scale.set(R(35, 62), h, R(30, 45)); d.updateMatrix(); im.setMatrixAt(n++, d.matrix);
  }
  im.count = n; scaleScene.add(im);
  // Empire State Building: setback tiers + mast (to the tip 1,454 ft)
  const esbTex = canvasTex(64, 256, (g2, w, h) => { g2.fillStyle = '#8a8478'; g2.fillRect(0, 0, w, h); for (let y = 2; y < h; y += 4) for (let x = 3; x < w; x += 5) { g2.fillStyle = rnd() < 0.5 ? '#ffe0a0' : '#3a3a40'; g2.fillRect(x, y, 2, 2); } g2.fillStyle = 'rgba(200,190,170,0.7)'; for (let x = 0; x < w; x += 5) g2.fillRect(x, 0, 1, h); });
  esbTex.wrapS = esbTex.wrapT = THREE.RepeatWrapping;
  const tiers = [[128, 57, 0, 25], [86, 52, 25, 72], [70, 46, 72, 260], [56, 38, 260, 320], [42, 30, 320, 352], [26, 22, 352, 373], [16, 16, 373, 381]];
  for (const [w, dd, y0, y1] of tiers) {
    const mt = new THREE.MeshStandardMaterial({ color: '#c8c0b0', map: esbTex.clone(), emissiveMap: esbTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.7 });
    mt.map.needsUpdate = true; mt.map.repeat.set(w / 40, (y1 - y0) / 30); mt.emissiveMap = mt.map;
    const b = new THREE.Mesh(BOX, mt); b.scale.set(w, y1 - y0, dd); b.position.set(0, (y0 + y1) / 2, 0); scaleScene.add(b);
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 22, 8), new THREE.MeshStandardMaterial({ color: '#e8e0ff', emissive: '#e8e8ff', emissiveIntensity: 1.6 })); crown.position.set(0, 392, 0); scaleScene.add(crown);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 3.5, ESB_TIP - 403, 6), new THREE.MeshStandardMaterial({ color: '#c0c0c8', emissive: '#ff5050', emissiveIntensity: 0.25 })); mast.position.set(0, 403 + (ESB_TIP - 403) / 2, 0); scaleScene.add(mast);
}
const bigRock = new THREE.Mesh(astRockGeo(4, 0.1, 2), new THREE.MeshStandardMaterial({ color: '#7a7066', roughness: 0.95, flatShading: true }));
bigRock.scale.setScalar(ROCK_D / 2 / 1.06); bigRock.position.set(-1010, ROCK_D / 2 * 0.97, 0); scaleScene.add(bigRock);
// craters / dark patches on the rock via vertex colours
{
  const g = bigRock.geometry, p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), v = new THREE.Vector3();
  const spots = Array.from({ length: 22 }, () => [new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), R(0.08, 0.25)]);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); let k = 0; for (const [s, r] of spots) k = Math.max(k, smooth(r, r * 0.4, v.distanceTo(s))); c.set('#8a8076').lerp(new THREE.Color('#4a423c'), k * 0.8).offsetHSL(0, 0, R(-0.04, 0.04)); col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); bigRock.material.vertexColors = true; bigRock.material.color.set('#ffffff');
}
function scaleCamera(t) {
  const u = ease((t - T_SCALE) / (T_SPACE - T_SCALE));
  const look = new THREE.Vector3(lerp(-760, -800, u), lerp(1020, 960, u), 0);
  const pos = new THREE.Vector3(lerp(-620, -820, u), lerp(420, 300, u), lerp(5900, 5500, u));
  scaleCam.position.copy(pos); scaleCam.lookAt(look); scaleCam.updateProjectionMatrix();
  bigRock.rotation.set(0.2, t * 0.04, 0.1);
}
