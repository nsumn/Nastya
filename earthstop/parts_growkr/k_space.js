// =================== SPACE (units = km): the real Earth (Solar System Scope 8k maps, CC BY 4.0) with Seoul at the origin, +Y up, north = -Z.
// Used once the hero is taller than ~10 km: clouds, airliner contrail, the Karman line, the ISS (~420 km).
const sp = new THREE.Scene();
const spCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 200000);
const RE = 6371, SEOUL = { lat: 37.5665, lon: 126.978 };
const ET = 'assets/growkr/earth/';
const etex = (u, srgb = true) => new Promise(ok => texL.load(ET + u, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; ok(t); }));
const [dayMap, cloudMap, nightMap] = await Promise.all([etex('8k_earth_daymap.jpg'), etex('8k_earth_clouds.jpg', false), etex('8k_earth_nightmap.jpg')]);
const earth = new THREE.Group(); earth.position.set(0, -RE, 0); sp.add(earth);
const globe = new THREE.Mesh(new THREE.SphereGeometry(RE, 256, 128), new THREE.MeshStandardMaterial({ map: dayMap, roughness: 0.85, metalness: 0, emissiveMap: nightMap, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.0 }));
earth.add(globe);
const clouds = new THREE.Mesh(new THREE.SphereGeometry(RE + 6, 192, 96), new THREE.MeshStandardMaterial({ color: '#ffffff', alphaMap: cloudMap, transparent: true, depthWrite: false, roughness: 1, opacity: 0.85 }));
earth.add(clouds);
// thin blue atmosphere: back-face fresnel shell (rim glow) + front haze
const atmo = new THREE.Mesh(new THREE.SphereGeometry(RE + 90, 128, 64), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uSun: { value: V3(-0.45, 0.42, 0.79).normalize() } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 v=normalize(cameraPosition-vW); float r=1.0-abs(dot(v,vN)); float a=pow(r,5.0)*1.6; float lit=0.35+0.65*max(dot(-vN,uSun)*0.5+0.5,0.0);
    gl_FragColor=vec4(vec3(0.35,0.6,1.0)*a*lit, a); }` }));
earth.add(atmo);
// rotate the globe so Seoul is straight up (+Y) and north points to -Z
{ const u = (SEOUL.lon + 180) / 360, th = (90 - SEOUL.lat) * Math.PI / 180;
  const d = V3(-Math.cos(2 * Math.PI * u) * Math.sin(th), Math.cos(th), Math.sin(2 * Math.PI * u) * Math.sin(th)).normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(d, V3(0, 1, 0));
  const np = V3(0, 1, 0).applyQuaternion(q1);                                     // the north pole after the first turn
  const nt = np.clone().sub(V3(0, 1, 0).multiplyScalar(np.dot(V3(0, 1, 0)))).normalize();   // its direction along the ground at Seoul
  const q2 = new THREE.Quaternion().setFromUnitVectors(nt, V3(0, 0, -1));
  globe.quaternion.copy(q2.multiply(q1)); clouds.quaternion.copy(globe.quaternion); }
const spSun = new THREE.DirectionalLight(0xfff4e6, 3.2); spSun.position.copy(V3(-0.45, 0.42, 0.79).multiplyScalar(1000)); sp.add(spSun, spSun.target);
sp.add(new THREE.HemisphereLight(0x9cc0ff, 0x203040, 0.35));
sp.environment = kw.environment; sp.environmentIntensity = 0.45;
// stars
{ const n = 6000, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i * 1.3) * Math.PI * 2, z = hash(i * 2.7) * 2 - 1, r = Math.sqrt(1 - z * z); pos.set([Math.cos(a) * r * 90000, z * 90000, Math.sin(a) * r * 90000], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sp.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false }))); }
// sky colour inside the atmosphere (fades to black with camera altitude)
function spSky(alt) { const k = smooth(15, 90, alt); sp.background = new THREE.Color('#7fa8d8').lerp(new THREE.Color('#02030a'), k); clouds.material.opacity = 0.85; return k; }
// airliner (A330-ish, ~64 m) + its contrail, flying at 11 km
const plane = new THREE.Group(); { const wM = M('#f4f5f7', { roughness: 0.35, metalness: 0.2 }), bl = M('#2f5fa8');
  const f = mesh(new THREE.CapsuleGeometry(0.0028, 0.058, 6, 12), wM); f.rotation.z = Math.PI / 2; plane.add(f);
  const w = mesh(new THREE.BoxGeometry(0.018, 0.0008, 0.06), wM); w.position.x = -0.002; plane.add(w);
  const tl = mesh(new THREE.BoxGeometry(0.008, 0.009, 0.0008), bl); tl.position.set(-0.028, 0.005, 0); plane.add(tl);
  const st = mesh(new THREE.BoxGeometry(0.006, 0.0006, 0.02), wM); st.position.set(-0.028, 0.001, 0); plane.add(st); }
plane.scale.setScalar(1); sp.add(plane);
const trail = mesh(new THREE.CylinderGeometry(0.06, 0.02, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false })); trail.rotation.z = Math.PI / 2; sp.add(trail);
// ISS (~109 m truss): truss, 8 solar wings, modules; plus a marker ring so it reads at this scale
const iss = new THREE.Group(); { const gr = M('#d8d8d0', { metalness: 0.4, roughness: 0.4 }), pan = new THREE.MeshStandardMaterial({ color: '#c08a2a', metalness: 0.6, roughness: 0.3, emissive: '#3a2400', emissiveIntensity: 0.4 });
  const tr = mesh(new THREE.BoxGeometry(0.109, 0.004, 0.004), gr); iss.add(tr);
  for (const x of [-0.05, -0.035, 0.035, 0.05]) for (const s of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.012, 0.0005, 0.035), pan); p.position.set(x, 0, s * 0.02); iss.add(p); }
  const md = mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.05, 10), gr); md.rotation.x = Math.PI / 2; iss.add(md); }
sp.add(iss);
const issRing = mesh(new THREE.RingGeometry(0.9, 1.0, 48), new THREE.MeshBasicMaterial({ color: '#ffd36a', transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })); issRing.renderOrder = 10; sp.add(issRing);
