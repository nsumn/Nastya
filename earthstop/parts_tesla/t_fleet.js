// =================== smoke (cold-gas plumes): one Points cloud per scene, rebuilt every frame from emitters ===================
const smokeMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uScale: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `attribute float aSize; attribute float aA; uniform float uScale; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=min(aSize*uScale/(-mv.z), 700.0); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uTint; varying float vA; void main(){ vec2 q=gl_PointCoord-0.5; float d=dot(q,q)*4.0; float a=exp(-d*3.0)*vA; if(a<0.01) discard; gl_FragColor=vec4(uTint*(0.9+0.1*(1.0-d)),a); }` });
function makeSmoke(scene, n) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3), sz = new Float32Array(n), al = new Float32Array(n);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aA', new THREE.BufferAttribute(al, 1));
  const pts = new THREE.Points(geo, smokeMat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
  let k = 0;
  return { begin() { k = 0; }, add(p, size, a) { if (k >= n) return; pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; sz[k] = size; al[k] = a; k++; },
    end() { for (let i = k; i < n; i++) al[i] = 0; geo.attributes.position.needsUpdate = true; geo.attributes.aSize.needsUpdate = true; geo.attributes.aA.needsUpdate = true; geo.setDrawRange(0, Math.max(1, k)); } };
}
// =================== actors: a state function of t -> pose + which thrusters fire ===================
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YZX'), _s = new THREE.Vector3(1, 1, 1);
function poseMatrix(st) { _e.set(st.roll || 0, st.yaw || 0, st.pitch || 0, 'YZX'); _q.setFromEuler(_e); return _m.compose(V3(st.x, st.y, st.z), _q, _s); }
const REAR_N = [V3(-2.3, 0.66, -0.3), V3(-2.3, 0.66, 0.3)], DOWN_N = [V3(1.7, 0.12, 0), V3(-1.75, 0.12, 0)];
function emitPlumes(smoke, actor, t, life = 1.1, dt = 0.05) {
  for (let k = Math.floor((t - life) / dt) + 1; k * dt <= t; k++) { const tau = k * dt, age = t - tau; const st = actor.state(tau); if (!st || !(st.rear || st.down)) continue;
    const m = poseMatrix(st).clone(); const fwd = V3(1, 0, 0).transformDirection(m), up = V3(0, 1, 0).transformDirection(m);
    const spread = (1 - Math.exp(-age * 3)) / 3, j = hash(k * 7.1 + actor.id * 13.3);
    if (st.rear) for (const n of REAR_N) { const p = n.clone().applyMatrix4(m).addScaledVector(fwd, -9 * spread).add(V3(0, 0.5 * age + 0.3 * age * age, (j - 0.5) * age)); smoke.add(p, 0.8 + 5.0 * age, 0.85 * Math.pow(1 - age / life, 1.2) * (st.rear)); }
    if (st.down) for (const n of DOWN_N) { const p = n.clone().applyMatrix4(m).addScaledVector(up, -6 * spread); p.x += (j - 0.5) * 2.5 * age; p.z += (hash(k * 3.3 + actor.id) - 0.5) * 2.5 * age; p.y = Math.max(p.y, 0.25 + 0.4 * age); smoke.add(p, 0.6 + 3.6 * age, 0.7 * Math.pow(1 - age / life, 1.4) * st.down); }
  }
}
// =================== semis (generic, for the jam) ===================
function makeSemi(cab) { const g = new THREE.Group();
  bx(15.5, 2.9, 2.6, M('#e8e6e0', { flatShading: true }), -6.2, 2.65, 0, g); bx(15.5, 0.25, 2.4, '#3a3a3e', -6.2, 1.1, 0, g);
  const c = grp(3.1, 0, 0, 0, g); bx(2.3, 2.6, 2.5, M(cab, { flatShading: true, roughness: 0.4 }), 0, 2.15, 0, c); bx(1.5, 1.2, 2.45, M(cab, { flatShading: true, roughness: 0.4 }), 1.6, 1.4, 0, c); bx(0.05, 0.9, 2.2, M('#22303a', { roughness: 0.15, metalness: 0.6 }), 1.16, 2.8, 0, c);
  const wg = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12).rotateX(Math.PI / 2);
  for (const x of [4.2, 1.6, 0.4, -10.5, -11.8]) for (const z of [-1.1, 1.1]) { const w = mesh(wg, M('#151515')); w.position.set(x, 0.5, z); g.add(w); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g; }
// =================== the city fleet ===================
const POOL = []; for (let i = 0; i < 90; i++) { const r = makeRoadster(); r.g.visible = false; city.add(r.g); POOL.push(r); }
const citySmoke = makeSmoke(city, 6000);
function placeCar(r, st) { if (!st) { r.g.visible = false; return; } r.g.visible = true; r.g.position.set(st.x, st.y, st.z); r.g.rotation.set(st.roll || 0, st.yaw || 0, st.pitch || 0, 'YZX');
  const spin = -(st.dist || 0) / 0.36; for (const w of r.wheels) w.rotation.z = spin; }
// shot A/B: queues at the red light at x = 30, launch on green (Thrust: 0-60 in 0.9 s = 3.04 G)
const LAUNCH = [];
{ let id = 0; for (const [lane, dir, x0] of [[-1.75, 1, 19.6], [-5.25, 1, 19.6], [1.75, -1, 40.4], [5.25, -1, 40.4]]) for (let k = 0; k < 9; k++) {
    const xs = x0 - dir * k * 5.5; const delay = k * 0.16 + (lane === -5.25 || lane === 5.25 ? 0.07 : 0);
    LAUNCH.push({ id: id++, state(t) { const tl = t - (GREEN + delay); let s = 0, v = 0; const a1 = 3.04 * 9.81, t1 = 26.82 / a1;
      if (tl > 0) { if (tl < t1) { s = 0.5 * a1 * tl * tl; v = a1 * tl; } else { const a2 = 7, v1 = 26.82, tm = (58 - v1) / a2, u = Math.min(tl - t1, tm); s = 0.5 * a1 * t1 * t1 + v1 * u + 0.5 * a2 * u * u + Math.max(0, tl - t1 - tm) * 58; v = Math.min(58, v1 + a2 * (tl - t1)); } }
      return { x: xs + dir * s, y: 0, z: lane, yaw: dir > 0 ? 0 : Math.PI, pitch: tl > 0 && tl < 1.2 ? 0.035 * Math.sin(Math.PI * tl / 1.2) : 0, rear: tl > 0 && tl < 1.3 ? 1 - tl / 1.3 * 0.6 : 0, dist: s, v }; } }); } }
// shot C: everyone hops over a jam of semis around x = 330-350
const SEMIS = []; for (const [x, z, c] of [[346, -1.75, '#c43b2e'], [351, -5.25, '#2b5f8a']]) { const s = makeSemi(c); s.position.set(x, 0, z); city.add(s); SEMIS.push(s); }
const HOPPERS = [];
for (let k = 0; k < 22; k++) { const lane = k % 2 ? -5.25 : -1.75, th = JAM + 0.5 + k * 0.42, v = 13.5, xs = (lane === -1.75 ? 326 : 331), dur = 2.1, hmax = 6.2 + (k % 3) * 0.6, flip = k % 3 === 1;
  HOPPERS.push({ id: 100 + k, state(t) { const x = xs + v * (t - th); if (x < 215 || x > 420) return null; const u = clamp((t - th) / dur, 0, 1); const air = u > 0 && u < 1;
    return { x, y: air ? 4 * hmax * u * (1 - u) : 0, z: lane, yaw: 0, roll: flip && air ? Math.PI * 2 * smooth(0.12, 0.88, u) : 0, pitch: air ? 0.12 * Math.cos(Math.PI * u) : 0, down: air && (u < 0.3 || u > 0.82) ? 1 : 0, rear: air && u < 0.15 ? 0.6 : 0, dist: x }; } }); }
// shot D/F: the whole street hopping (hover ~1.2 s per tank, MODEL)
const SKYCARS = [];
for (let k = 0; k < 80; k++) { const lanes = [[-1.75, 1], [-5.25, 1], [1.75, -1], [5.25, -1]]; const [lane, dir] = lanes[k % 4]; const x0 = R(-40, 320), v = R(12, 17), P = R(2.4, 3.6), ph = R(0, P), dur = R(1.2, 1.5), hmax = R(3.0, 7.5), flip = rnd() < 0.18;
  SKYCARS.push({ id: 200 + k, state(t) { const x = wrapR(x0 + dir * v * t, -40, 320); const c = ((t + ph) % P); const u = clamp(c / dur, 0, 1); const air = c < dur;
    const y = air ? hmax * (1 - Math.pow(2 * u - 1, 4)) : 0;
    return { x, y, z: lane, yaw: dir > 0 ? 0 : Math.PI, roll: flip && air ? Math.PI * 2 * smooth(0.2, 0.8, u) : 0, pitch: air ? 0.08 * Math.sin(Math.PI * 2 * u) : 0, down: air && u < 0.9 ? 1 : 0, dist: x * dir }; } }); }
// shot F: a mid-air fender bender right in front of the camera (cartoony, both land on their wheels)
const BUMP_T = BUMP + 2.6;
const BUMPERS = [0, 1].map(i => ({ id: 400 + i, state(t) { const th = BUMP_T - 0.75 - (i ? 0.25 : 0), dur = i ? 1.9 : 1.6, h = i ? 5.2 : 4.6, v = i ? 17 : 12.5; const x0 = 118 - (i ? 20 : 9.375);
  const u = clamp((t - th) / dur, 0, 1), air = u > 0 && u < 1; const x = x0 + v * (t - th); let y = air ? 4 * h * u * (1 - u) : 0, roll = 0, yaw = 0, z = -1.75;
  if (t > BUMP_T && air) { const k = smooth(BUMP_T, th + dur - 0.1, t); roll = (i ? -1 : 1) * Math.PI * 2 * k; z += (i ? -1.6 : 1.4) * k; yaw = (i ? 0.25 : -0.3) * Math.sin(Math.PI * k); }
  return { x, y, z, yaw, roll, pitch: air ? 0.1 * Math.cos(Math.PI * u) : 0, down: air && (u < 0.35 || u > 0.8) ? 1 : 0, dist: x }; } }));
function updateFleet(t, shot) {
  let list = [];
  if (shot === 'launch') list = LAUNCH; else if (shot === 'jam') list = HOPPERS; else if (shot === 'sky') list = SKYCARS; else if (shot === 'bump') list = SKYCARS.filter(a => { const s = a.state(t); return !(Math.abs(s.x - 112) < 26 && s.z < 0) && !(s.z > 0 && s.x > 100 && s.x < 150); }).concat(BUMPERS);
  for (const s of SEMIS) s.visible = shot === 'jam';
  citySmoke.begin(); POOL.forEach((r, i) => { const a = list[i]; placeCar(r, a ? a.state(t) : null); if (a) emitPlumes(citySmoke, a, t); }); citySmoke.end();
}
