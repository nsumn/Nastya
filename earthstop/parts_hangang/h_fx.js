// =================== EFFECTS: vanish ring, wind (grass + debris), ferry mud splash, the foam eruption ===================
// ---- the vanish: a bright ring racing out from the bridge, the water inside it gone ----
const vanishRing = mesh(new THREE.RingGeometry(0.97, 1.0, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 3.6, 4.2), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false, false);
vanishRing.rotation.x = -Math.PI / 2; vanishRing.position.set(BR_X, WATER_Y + 0.05, -412); hw.add(vanishRing); vanishRing.visible = false;
// ---- grass blades around the picnic, bending toward the river with the wind (uWind 0..1) ----
const grassU = { uWind: { value: 0 }, uT: { value: 0 } };
const blades = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.018, 0, 0, 0.018, 0, 0, 0, 0.13, 0], 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  const m = new THREE.MeshStandardMaterial({ color: '#6a8a4a', roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, grassU); sh.vertexShader = 'uniform float uWind, uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float hgt = position.y / 0.13; vec4 wp = instanceMatrix * vec4(0.0,0.0,0.0,1.0); float gust = 0.6 + 0.4 * sin(uT * 7.0 + wp.x * 0.7 + wp.z * 0.9);
    transformed.y *= 1.0 - 0.35 * uWind * hgt; `).replace('#include <project_vertex>', `vec4 mvPosition = vec4(transformed, 1.0); mvPosition = instanceMatrix * mvPosition;
    mvPosition.z -= hgt * hgt * 0.2 * (uWind * gust + 0.08 * sin(uT * 1.7 + wp.x)); mvPosition.x += hgt * hgt * 0.03 * sin(uT * 1.3 + wp.z);
    mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;`); };
  const n = 26000, im = new THREE.InstancedMesh(g, m, n), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); seed = 2201;
  for (let i = 0; i < n; i++) { const x = R(-16, 16), z = R(-3.2, 9); if (Math.abs(x - HERO_MAT.x) < 1.05 && Math.abs(z - HERO_MAT.z) < 1.05) { i--; continue; }
    q.setFromAxisAngle(V3(0, 1, 0), R(0, 6.28)); const sc = R(0.6, 1.4); mm.compose(V3(x, 0, z), q, V3(sc, sc * R(0.7, 1.3), sc)); im.setMatrixAt(i, mm); im.setColorAt(i, c.setHSL(R(0.22, 0.28), R(0.3, 0.5), R(0.35, 0.55))); }
  im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true; hw.add(im); return im; })();
// ---- debris carried by the wind into the empty channel: napkins, paper cups, a chicken-box lid, a cap ----
const DEB = [];
{ seed = 2301; const kinds = [[new THREE.PlaneGeometry(0.22, 0.22), '#f4f2ec'], [new THREE.CylinderGeometry(0.04, 0.03, 0.09, 10), '#e8e4dc'], [new THREE.PlaneGeometry(0.34, 0.26), '#d8402e'], [new THREE.BoxGeometry(0.2, 0.05, 0.14), '#f2e6cc']];
  for (let i = 0; i < 160; i++) { const [geo, col] = kinds[i < 70 ? 0 : i < 120 ? 1 : i < 125 ? 2 : 3]; const m = mesh(geo, M(col, { side: THREE.DoubleSide, roughness: 0.8 })); const x = R(-14, 14), z = R(-2, 9);
    m.userData = { x, z, d: R(0.0, 0.25), sp: R(9, 16), up: R(1.5, 4.5), sx: R(-1.5, 1.5), spin: V3(R(-9, 9), R(-9, 9), R(-9, 9)) }; m.position.set(x, 0.03, z); hw.add(m); DEB.push(m); } }
// story time s (seconds after the vanish): debris flies toward -z, lifts, then falls into the canyon
function debrisAt(s, t) { for (const m of DEB) { const u = m.userData, a = s - 0.12 - u.d; if (a <= 0) { m.position.set(u.x, 0.03, u.z); m.rotation.set(-Math.PI / 2, 0, 0); continue; }
  let z = u.z - u.sp * a, y = 0.03 + u.up * a - 2.0 * a * a; const lip = bedHeight(u.x, z) + 0.03; if (z < -9) y = Math.max(y - 4.9 * Math.max(0, a - (u.z + 9) / u.sp) ** 2, lip); else y = Math.max(y, 0.03);
  m.position.set(u.x + u.sx * a, y, z); m.rotation.set(u.spin.x * a, u.spin.y * a, u.spin.z * a); } }
// ---- mud splash when the ferry lands ----
const splash = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#4a3e30', { roughness: 0.4, flatShading: true }), 400); splash.frustumCulled = false; hw.add(splash);
const SPL = []; { seed = 2401; for (let i = 0; i < 400; i++) { const a = R(0, 6.28); SPL.push({ a, v: R(3, 12), up: R(3, 11), sc: R(0.15, 0.6), ox: R(-20, 20), oz: R(-4, 4) }); } }
function splashAt(dt, x, z, y0) { const mm = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < SPL.length; i++) { const p = SPL[i]; if (dt <= 0 || dt > 3) { mm.makeScale(0, 0, 0); splash.setMatrixAt(i, mm); continue; }
    const r = p.v * dt, y = Math.max(y0, y0 + p.up * dt - 4.9 * dt * dt), sc = p.sc * (y > y0 + 0.01 ? 1 : Math.max(0, 1 - (dt - 1.2) * 0.6));
    q.setFromEuler(new THREE.Euler(dt * 5 + i, dt * 3, 0)); mm.compose(V3(x + p.ox * 0.5 + Math.cos(p.a) * r, y, z + p.oz + Math.sin(p.a) * r), q, V3(sc, sc * 0.6, sc)); splash.setMatrixAt(i, mm); }
  splash.instanceMatrix.needsUpdate = true; }
// ---- the eruption: when the water comes back, the air that filled the channel is trapped inside it and bursts up as foam (MODEL) ----
const foamM = new THREE.MeshStandardMaterial({ color: '#eef1f6', roughness: 0.75, emissive: '#4a5060', emissiveIntensity: 0.5, flatShading: true });
const FOAM_N = 11000, foam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), foamM, FOAM_N); foam.frustumCulled = false; hw.add(foam);
const FOAMP = []; { seed = 2501; for (let i = 0; i < FOAM_N; i++) { const near = i < 6000; const z = near ? R(-140, -14) : R(-800, -14), close = near && z > -45; FOAMP.push({ x: near ? R(-120, 60) : R(-1500, 900), z, d: R(0, 0.5), v: close ? R(0.5, 3) : R(2, near ? 9 : 22), sc: close ? R(0.08, 0.3) : R(0.15, near ? 0.7 : 3.5), ph: R(0, 6) }); } }
const foamSheet = mesh(new THREE.PlaneGeometry(3000, 800), new THREE.MeshStandardMaterial({ color: '#e8ecf2', roughness: 1, transparent: true, opacity: 0, depthWrite: false, emissive: '#3a3f4a',
  map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8ccd4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = pick(['#ffffff', '#eef1f5', '#b8bec8', '#dfe3ea']); g.beginPath(); g.arc(rnd() * w, rnd() * h, R(2, 9), 0, 7); g.fill(); } }, [120, 32]) }), false, false);
foamSheet.rotation.x = -Math.PI / 2; foamSheet.position.set(0, WATER_Y + 0.06, (RIV_N + RIV_S) / 2); hw.add(foamSheet);
// dt = real seconds since the water came back
function foamAt(dt) { const mm = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < FOAM_N; i++) { const p = FOAMP[i], a = dt - p.d; if (a <= 0 || dt > 30) { mm.makeScale(0, 0, 0); foam.setMatrixAt(i, mm); continue; }
    const y = WATER_Y + Math.max(0, p.v * a - 4.9 * a * a) + 0.2 * Math.sin(a * 2 + p.ph), grow = Math.min(1, a / 0.35) * (1 - 0.5 * smooth(6, 14, a)), sc = p.sc * grow * (1 + 0.25 * Math.sin(a * 5 + p.ph));
    q.setFromEuler(new THREE.Euler(p.ph, a + p.ph, 0)); mm.compose(V3(p.x, y, p.z), q, V3(sc * (1 + 0.4 * Math.sin(p.ph * 3)), sc * 0.55, sc * (1 + 0.4 * Math.cos(p.ph * 5)))); foam.setMatrixAt(i, mm); }
  foam.instanceMatrix.needsUpdate = true; foamSheet.material.opacity = 0.92 * smooth(0.1, 1.2, dt) * (1 - 0.45 * smooth(8, 16, dt)); }
// ---- the phone screen shows what the phone camera sees (render target) ----
const phoneRT = new THREE.WebGLRenderTarget(360, 720, { type: THREE.HalfFloatType });
const phoneCam = new THREE.PerspectiveCamera(48, 0.5, 0.05, 40000);
heroPhone.userData.screen.material = new THREE.MeshBasicMaterial({ map: phoneRT.texture, color: new THREE.Color(1.15, 1.15, 1.15) });
heroPhone.userData.screen.scale.set(0.068, 0.145, 0.002);
