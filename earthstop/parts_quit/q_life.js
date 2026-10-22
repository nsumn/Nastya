// =================== TIME (meters): an hourglass whose sand flows back UP (time won back) + day pages flying in ===================
const hg = new THREE.Scene(); hg.background = new THREE.Color('#141a2a'); const hCam = new THREE.PerspectiveCamera(40, W / H, 0.02, 100);
hg.add(new THREE.HemisphereLight(0xe0e8ff, 0x302838, 0.8)); const hKey = new THREE.DirectionalLight(0xffe8c8, 2.4); hKey.position.set(2, 3, 3); hg.add(hKey); const hGlow = new THREE.PointLight(0xffc870, 6, 5); hGlow.position.set(0, 1.0, 0.6); hg.add(hGlow);
const hour = new THREE.Group(); hg.add(hour); { const wood = M('#6a4a34', { roughness: 0.5 }); bx(0.9, 0.08, 0.9, wood, 0, 0.04, 0, hour); bx(0.9, 0.08, 0.9, wood, 0, 1.76, 0, hour); for (const [x, z] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) bx(0.05, 1.7, 0.05, wood, x, 0.9, z, hour);
  const pts = []; for (let i = 0; i <= 24; i++) { const y = i / 24; const r = 0.03 + 0.3 * Math.pow(Math.abs(Math.cos(y * Math.PI)), 0.8); pts.push(new THREE.Vector2(r, 0.1 + y * 1.6)); }
  hour.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }))); }
const sandMat = M('#e8c070', { roughness: 0.9, emissive: '#4a3010' });
const sandTop = mesh(new THREE.ConeGeometry(0.26, 0.4, 20), sandMat); sandTop.rotation.x = Math.PI; hour.add(sandTop); const sandBot = mesh(new THREE.ConeGeometry(0.28, 0.4, 20), sandMat); hour.add(sandBot);
const stream = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6), sandMat); stream.position.y = 0.9; hour.add(stream);
// calendar pages (one per "day won back") flying in a spiral around the hourglass
const pageTex = canvasTex(128, 150, (g, w, h) => { g.fillStyle = '#f8f4ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8302a'; g.fillRect(0, 0, w, 34); g.fillStyle = '#2a2a2e'; g.font = 'bold 64px Source Serif 4'; g.textAlign = 'center'; g.fillText('+1', w / 2, 112); g.fillStyle = '#fff'; g.font = 'bold 20px Inter'; g.fillText('DAY', w / 2, 25); });
const PAGE_N = 101; const pageMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.19), new THREE.MeshStandardMaterial({ map: pageTex, side: THREE.DoubleSide, roughness: 0.8 }), PAGE_N); pageMesh.frustumCulled = false; hg.add(pageMesh);
const PAGES = Array.from({ length: PAGE_N }, (_, i) => ({ at: YEARS + 0.4 + i * 0.04, a: i * 0.62, r: R(0.75, 1.1), y: R(0.2, 1.9), spin: R(-1, 1) })); const _ho = new THREE.Object3D();
// mountain at sunset: you, older, at the summit
const mt = new THREE.Scene(); const tCam = new THREE.PerspectiveCamera(50, W / H, 0.1, 4000);
const mtSky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {},
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: 'varying vec3 vD; void main(){ float h = vD.y; vec3 sd = normalize(vec3(0.0, 0.06, -1.0)); float s = max(dot(normalize(vD), sd), 0.0); vec3 c = mix(vec3(1.3,0.62,0.32), vec3(0.22,0.24,0.5), smoothstep(0.0, 0.5, h)); c += vec3(2.0,1.2,0.6) * pow(s, 60.0) + vec3(6.0,4.5,3.0) * pow(s, 2500.0); if (h < 0.0) c = vec3(0.3,0.2,0.25); gl_FragColor = vec4(c, 1.0); }' }));
mt.add(mtSky); mt.add(new THREE.HemisphereLight(0xffc8a0, 0x403040, 0.9)); const mtSun = new THREE.DirectionalLight(0xffa860, 3.0); mtSun.position.set(0, 20, -300); mt.add(mtSun); mt.fog = new THREE.Fog(0xc8806a, 60, 900);
{ const geo = new THREE.PlaneGeometry(1600, 1600, 120, 120); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const d = Math.hypot(x, y);
    let h = 60 * Math.exp(-d * d / 26000) + 22 * (Math.sin(x * 0.012) * Math.cos(y * 0.01) + 1) * smooth(150, 600, d) + 6 * Math.sin(x * 0.05 + y * 0.03) * smooth(30, 120, d); p.setZ(i, h); }
  geo.computeVertexNormals(); const ter = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ color: '#5a6a48', flatShading: true, roughness: 1 })); ter.geometry.computeVertexNormals(); ter.rotation.x = -Math.PI / 2; mt.add(ter); }
const peakY = 60; const old = makePerson(rnd, { top: '#c8582e', bottom: '#3a3e48', hair: '#d8d8d8', skin: '#e8b896', dress: false, shorts: false, longSleeve: true, cap: false }); mt.add(old.outer); old.outer.position.set(0, peakY + 0.95, 0); old.outer.rotation.y = Math.PI;
const stick = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 6), M('#6a4a34')); mt.add(stick);
function updateLife(t) { const u = smooth(YEARS + 0.3, MOUNT, t);
  sandTop.position.y = 1.08; sandTop.scale.set(lerp(0.4, 1, u), lerp(0.4, 1, u), lerp(0.4, 1, u)); sandBot.position.y = 0.3; sandBot.scale.setScalar(Math.max(0.0001, lerp(1, 0.4, u)));
  stream.visible = u < 0.98; stream.material.emissiveIntensity = 1; hour.rotation.y = 0.15 * Math.sin(t * 0.5);
  PAGES.forEach((P, i) => { const k = clamp((t - P.at) / 1.2, 0, 1); const a = P.a + t * 0.6; const r = lerp(2.4, P.r, 1 - Math.pow(1 - k, 3)); _ho.position.set(Math.cos(a) * r, lerp(2.4, P.y, k), Math.sin(a) * r); _ho.rotation.set(P.spin * t, a + Math.PI / 2, 0.2 * P.spin); _ho.scale.setScalar(k > 0 ? 1 : 0.0001); _ho.updateMatrix(); pageMesh.setMatrixAt(i, _ho.matrix); }); pageMesh.instanceMatrix.needsUpdate = true;
  poseIdle(old, t, 0); old.arms[1].rotation.set(-0.35, 0, 0); stick.position.copy(old.elbows[1].localToWorld(V3(0, -0.27, 0.05))).add(V3(0, -0.55, 0)); old.arms[0].rotation.set(-2.6 * smooth(MOUNT + 3.5, MOUNT + 4.5, t), 0, 0.3); }
function lifeCamera(t) { const k = ease(clamp((t - YEARS) / (MOUNT - YEARS), 0, 1)); hCam.position.set(Math.sin(lerp(-0.6, 0.6, k)) * lerp(3.6, 3.0, k), lerp(1.3, 1.0, k), Math.cos(lerp(-0.6, 0.6, k)) * lerp(3.6, 3.0, k)); hCam.lookAt(0, 0.95, 0); hCam.fov = 40; }
function mountCamera(t) { const k = ease(clamp((t - MOUNT) / (T_END - MOUNT), 0, 1)); const a = lerp(0.9, 0.2, k), d = lerp(9, 4.2, k); tCam.position.set(Math.sin(a) * d, peakY + lerp(4.5, 2.0, k), Math.cos(a) * d); tCam.lookAt(0, peakY + 1.4, -2); tCam.fov = 50; }
