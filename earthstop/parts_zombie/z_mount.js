
// =================== NORTHERN ROCKIES (meters): snowy ridges, pines, a lit cabin, zombies far down the slope ===================
const mount = new THREE.Scene();
mount.fog = new THREE.Fog(new THREE.Color('#1c2640'), 400, 3600);
const mountCam = new THREE.PerspectiveCamera(50, W / H, 0.5, 9000);
const mHemi = new THREE.HemisphereLight(0x8aa0d8, 0x1a1a24, 0.75); mount.add(mHemi);
const mMoon = new THREE.DirectionalLight(0xb8c8ff, 2.2); mMoon.castShadow = true; mMoon.shadow.mapSize.set(2048, 2048);
Object.assign(mMoon.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 800 }); mMoon.shadow.bias = -0.0005; mount.add(mMoon, mMoon.target);
const mDome = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: `varying vec3 vD; void main(){ float e=max(normalize(vD).y,0.0); vec3 c=mix(vec3(0.10,0.13,0.22),vec3(0.015,0.02,0.05),pow(e,0.5)); gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
})); mDome.frustumCulled = false; mount.add(mDome);
{
  const n = 2500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(0.05, 1), R(-1, 1)).normalize().multiplyScalar(7000); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  mount.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.8, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
}
const mMoonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), fog: false, depthWrite: false, transparent: true })); mMoonSprite.scale.setScalar(1300); mount.add(mMoonSprite);
// terrain: value-noise ridges (deterministic)
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
function ridge(x, z) { let h = 0, a = 1, f = 1 / 900; for (let o = 0; o < 6; o++) { const n = 1 - Math.abs(vnoise(x * f, z * f) * 2 - 1); h += n * n * a; a *= 0.5; f *= 2.05; } return h; }
const CABIN = new THREE.Vector3(0, 0, 0);
function terrainH(x, z) {
  const r = Math.hypot(x, z * 0.8); const rise = smooth(170, 1100, r);       // flat valley around the cabin, peaks beyond
  return ridge(x + 4000, z + 2000) * 1250 * rise + 6 * (vnoise(x / 40, z / 40) - 0.5) * smooth(30, 120, r);
}
const TERR_S = 6000, TERR_N = 300;
const terrGeo = new THREE.PlaneGeometry(TERR_S, TERR_S, TERR_N, TERR_N); terrGeo.rotateX(-Math.PI / 2);
{
  const p = terrGeo.attributes.position; const cols = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, terrainH(x, z)); }
  terrGeo.computeVertexNormals(); const nrm = terrGeo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), ny = nrm.getY(i); const snow = smooth(0.55, 0.78, ny) + smooth(260, 420, y) * 0.8;
    c.set('#4a4a52').lerp(new THREE.Color('#e8eef8'), clamp(snow, 0, 1)); c.offsetHSL(0, 0, (hash2(i, 7) - 0.5) * 0.05); cols.set([c.r, c.g, c.b], i * 3); }
  terrGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}
const terrain = new THREE.Mesh(terrGeo.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
terrain.geometry.computeVertexNormals(); terrain.receiveShadow = true; mount.add(terrain);
// pines (instanced cones, two tiers)
{
  const N = 5200; const coneA = new THREE.ConeGeometry(1, 1, 7); coneA.translate(0, 0.5, 0);
  const pm = new THREE.InstancedMesh(coneA, new THREE.MeshStandardMaterial({ color: '#1f3a2c', flatShading: true, roughness: 0.9 }), N); const snowCap = new THREE.InstancedMesh(coneA, new THREE.MeshStandardMaterial({ color: '#dfe8f2', flatShading: true, roughness: 0.9 }), N);
  const d = new THREE.Object3D(); let k = 0;
  for (let i = 0; i < N * 4 && k < N; i++) {
    const x = R(-1300, 1300), z = R(-1500, 700); const r = Math.hypot(x, z); if (r < 50 || (Math.abs(x) < 70 && z > -230 && z < 70)) continue;
    const y = terrainH(x, z); if (y > 260) continue; const h = R(7, 16);
    d.position.set(x, y - 0.5, z); d.scale.set(h * 0.28, h, h * 0.28); d.rotation.set(0, R(0, 6), 0); d.updateMatrix(); pm.setMatrixAt(k, d.matrix);
    d.position.y = y - 0.5 + h * 0.55; d.scale.set(h * 0.15, h * 0.46, h * 0.15); d.updateMatrix(); snowCap.setMatrixAt(k, d.matrix); k++;
  }
  pm.count = k; snowCap.count = k; pm.castShadow = true; mount.add(pm, snowCap);
}
// cabin
const cabin = new THREE.Group(); cabin.position.set(CABIN.x, terrainH(0, 0), CABIN.z); mount.add(cabin);
const logM = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.9, flatShading: true });
{ const b = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 5.5), logM); b.position.y = 1.6; b.castShadow = b.receiveShadow = true; cabin.add(b);
  const roofM = new THREE.MeshStandardMaterial({ color: '#e6eef8', roughness: 0.9, flatShading: true });
  for (const sx of [-1, 1]) { const rf = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.35, 6.4), roofM); rf.position.set(sx * 1.85, 4.15, 0); rf.rotation.z = -sx * 0.62; rf.castShadow = true; cabin.add(rf); }
  const gable = new THREE.Shape(); gable.moveTo(-3.5, 0); gable.lineTo(3.5, 0); gable.lineTo(0, 2.4); gable.closePath();
  for (const zz of [2.74, -2.76]) { const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), logM); gm.position.set(0, 3.2, zz); if (zz < 0) gm.rotation.y = Math.PI; cabin.add(gm); }
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), new THREE.MeshStandardMaterial({ color: '#5a5552', roughness: 1 })); ch.position.set(2.2, 5.6, -1.0); cabin.add(ch);
  for (const x of [-1.8, 1.8]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffb050', emissiveIntensity: 3.0 })); w.position.set(x, 1.8, 2.76); cabin.add(w); }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshStandardMaterial({ color: '#3a2a1c' })); door.position.set(0, 1.0, 2.76); cabin.add(door);
}
const cabinLight = new THREE.PointLight(0xffa850, 30, 40, 1.6); cabinLight.position.set(0, 2.0, 5); cabin.add(cabinLight);
const smoke = []; for (let i = 0; i < 18; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#b8c0cc', transparent: true, opacity: 0.3, flatShading: true })); cabin.add(s); smoke.push({ s, ph: i / 18 }); }
// zombies trudging up the far slope (months away)
const slopeZ = [];
for (let i = 0; i < 9; i++) { const p = makePerson(rnd, { skin: ZSKIN, top: pick(['#3a3f2e', '#4a2a2a', '#2a3a4a', '#5a4a2a']), bottom: '#2a2a22', dress: false, shorts: false, longSleeve: true, hairStyle: 0.2, cap: false, shoe: '#1b1b1b' }); p.outer.scale.setScalar(1.0); mount.add(p.outer); slopeZ.push({ p, x: (i % 2 ? 1 : -1) * R(9, 40), z: R(-150, -70), ph: R(0, 6), v: R(0.25, 0.45) }); }
function updateMount(t) {
  mMoon.position.set(-300, 420, -500).add(mountCam.position.clone().setY(0)); mMoon.target.position.copy(mountCam.position).setY(0); mMoon.target.updateMatrixWorld();
  mMoonSprite.position.set(-0.45, 0.32, -0.83).normalize().multiplyScalar(6500).add(mountCam.position);
  smoke.forEach(({ s, ph }) => { const u = ((t * 0.12 + ph) % 1); s.position.set(2.2 + u * 3, 7 + u * 10, -1 + u * 1.5); s.scale.setScalar(0.25 + u * 0.9); s.material.opacity = 0.3 * (1 - u); });
  for (const z of slopeZ) { const tt = Math.max(0, t - ROCKIES); const zz = z.z + z.v * tt * 3; const y = terrainH(z.x, zz); z.p.outer.position.set(z.x, y + 0.95 - 0.25, zz); z.p.outer.rotation.set(0, 0, 0); poseZombie(z.p, t, z.ph, 0.8); }
}
function mountCamera(t) {
  const u = (t - ROCKIES) / (BACKMAP - ROCKIES);
  let pos, look;
  if (t < 47.5) { // glide in over the peaks, down into the valley
    const k = ease((t - ROCKIES) / 7.5); pos = new THREE.Vector3(lerp(-300, 20, k), lerp(1700, 26, k), lerp(-1700, 85, k)); look = new THREE.Vector3(lerp(-60, 0, k), lerp(200, 4, k), lerp(-500, 0, k));
  } else { // low by the cabin, zombies small on the slope behind
    const k = ease((t - 47.5) / 7.5); pos = new THREE.Vector3(lerp(-5.5, -4.5, k), lerp(3.2, 2.6, k), lerp(30, 22, k)); look = new THREE.Vector3(lerp(-3.5, -4.5, k), lerp(5, 7, k), lerp(-60, -150, k));
  }
  pos.y = Math.max(pos.y, terrainH(pos.x, pos.z) + (t < 46 ? 150 : 2.5));
  mountCam.position.copy(pos); mountCam.lookAt(look); mountCam.fov = t < 47.5 ? 52 : 46; mountCam.updateProjectionMatrix();
}
