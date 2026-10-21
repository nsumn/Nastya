// =================== STREET (meters): 42nd St looking WEST toward New Jersey — the Sun comes up at the end of the street ===================
const street = new THREE.Scene(); const sCam = new THREE.PerspectiveCamera(58, W / H, 0.1, 9000);
const SUNS = t => { const e = lerp(0.016, 0.06, smooth(0, CRANE + 1.5, t)); return V3(0.035, Math.sin(e), -Math.cos(e)).normalize(); };   // west = -z
// sky: warm horizon around the Sun, pink -> deep blue overhead, east side still night-ish
const skyMatS = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: V3(0, 0, -1) }, uK: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uSun; uniform float uK; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float h = d.y; float s = max(dot(d, uSun), 0.0);
      vec3 zen = mix(vec3(0.05,0.07,0.18), vec3(0.16,0.28,0.55), uK), mid = mix(vec3(0.42,0.30,0.45), vec3(0.62,0.52,0.62), uK), hor = mix(vec3(1.1,0.5,0.22), vec3(1.4,0.75,0.4), uK);
      vec3 c = mix(mid, zen, smoothstep(0.02, 0.55, h)); c = mix(c, hor, exp(-max(h, 0.0) * 9.0) * (0.35 + 0.65 * pow(s, 3.0)));
      c += vec3(1.6,0.9,0.45) * pow(s, 40.0) * 1.2 + vec3(5.0,3.6,2.2) * pow(s, 1800.0) * 6.0;
      if (h < 0.0) c = mix(c, vec3(0.2,0.14,0.16), smoothstep(0.0, -0.05, h));
      gl_FragColor = vec4(c, 1.0); }` });
const skyS = new THREE.Mesh(new THREE.SphereGeometry(8000, 48, 24), skyMatS); skyS.frustumCulled = false; skyS.renderOrder = -10; street.add(skyS);
const hemiS = new THREE.HemisphereLight(0xd8b8d0, 0x6a5048, 1.6); street.add(hemiS);
const sunS = new THREE.DirectionalLight(0xffb070, 3.4); sunS.castShadow = true; sunS.shadow.mapSize.set(2048, 2048);
Object.assign(sunS.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 1600 }); sunS.shadow.bias = -0.0005; street.add(sunS, sunS.target);
street.fog = new THREE.Fog(0xd89878, 300, 2400);
// ground: asphalt, crosswalks, lane lines, sidewalks
{ const asphalt = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#3a3a3e'; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, ['#444448', '#323236', '#4a4a4e']); g.fillStyle = '#d8c070'; g.fillRect(w / 2 - 3, 0, 6, h); }, [1, 60]);
  const road = mesh(new THREE.PlaneGeometry(18, 1800), M('#ffffff', { map: asphalt, roughness: 0.6, metalness: 0.1 }), false, true); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -850); street.add(road);
  for (const sx of [-1, 1]) { const sw = mesh(BOX, M('#9a948a', { roughness: 0.9 }), false, true); sw.scale.set(6, 0.18, 1800); sw.position.set(sx * 12, 0.09, -850); street.add(sw); }
  for (let z = -60; z > -800; z -= 80) for (let k = -4; k <= 4; k++) { const st = mesh(BOX, M('#e8e4da'), false, true); st.scale.set(0.9, 0.02, 4); st.position.set(k * 2, 0.01, z); street.add(st); } }
// buildings: two canyon walls of towers with window textures (some windows lit), mix of brick / limestone / glass
const facTex = [];
for (const [base, win, lit] of [['#8a5a46', '#2a2f3a', '#ffcf8a'], ['#c9bca4', '#2c3440', '#ffd89a'], ['#5a6e86', '#1e2a3a', '#fff0c0'], ['#a89a86', '#323844', '#ffc880'], ['#6e5048', '#252a34', '#ffd090']]) {
  const tx = canvasTex(128, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); speckle(g, w, h, 300, [base, '#00000022', '#ffffff18']); for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) { g.fillStyle = rnd() < 0.18 ? lit : win; g.fillRect(x, y, 9, 10); } }, null);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping; facTex.push(new THREE.MeshStandardMaterial({ map: tx, roughness: 0.75, metalness: 0.05 })); }
function tower(x, z, w, d, h, mi) { const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 8, uv.getY(i) * h / 16);
  const m = new THREE.Mesh(geo, facTex[mi]); m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; street.add(m);
  if (h > 90 && rnd() < 0.5) { const top = mesh(BOX, M('#7a7468', { roughness: 0.6 })); top.scale.set(w * 0.6, h * 0.08, d * 0.6); top.position.set(x, h + h * 0.04, z); street.add(top); if (rnd() < 0.5) { const sp = mesh(new THREE.ConeGeometry(w * 0.12, h * 0.25, 6), M('#b8b0a0', { metalness: 0.4 })); sp.position.set(x, h * 1.2, z); street.add(sp); } } }
for (const sx of [-1, 1]) { let z = 30; while (z > -780) { const w = R(16, 34), d = R(18, 40), h = z > -250 ? R(40, 230) : R(30, 140); tower(sx * (15 + d / 2), z - w / 2, d, w, h, Math.floor(rnd() * facTex.length)); z -= w + R(0.5, 3); } }
// New Jersey across the Hudson: low dark skyline + water that catches the sunrise
{ const water = mesh(new THREE.PlaneGeometry(4000, 900), M('#5a4a58', { roughness: 0.15, metalness: 0.6 }), false, true); water.rotation.x = -Math.PI / 2; water.position.set(0, -0.5, -1250); street.add(water);
  for (let i = 0; i < 70; i++) { const b = mesh(BOX, M('#3a3040', { roughness: 1 }), false, false); const h = R(6, 26); b.scale.set(R(15, 60), h, R(15, 40)); b.position.set(R(-1400, 1400), h / 2, R(-1750, -2300)); street.add(b); } }
// details: street lamps, traffic lights, taxis, people looking at the Sun, steam from a manhole
for (let z = -10; z > -760; z -= 38) for (const sx of [-1, 1]) { bx(0.18, 7, 0.18, '#2e3236', sx * 9.6, 3.5, z, street); bx(1.6, 0.14, 0.14, '#2e3236', sx * 8.9, 7, z, street); }
const TAXI = []; for (let i = 0; i < 26; i++) { const g = new THREE.Group(); bx(1.9, 0.8, 4.4, '#f2c21a', 0, 0.6, 0, g); bx(1.7, 0.6, 2.2, '#2a2e36', 0, 1.25, -0.2, g, { roughness: 0.2, metalness: 0.4 }); bx(0.5, 0.18, 0.25, '#f8f4e0', 0, 1.62, -0.2, g);
  for (const wx of [-0.95, 0.95]) for (const wz of [-1.4, 1.4]) { const wh = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 10), M('#1a1a1a')); wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.34, wz); g.add(wh); }
  street.add(g); TAXI.push({ g, lane: pick([-7, -3.8, 3.8, 7]), z0: R(-700, 40), v: R(4, 9) }); }
const CROWD = []; for (let i = 0; i < 46; i++) { const p = makePerson(rnd); const sx = pick([-1, 1]); p.outer.position.set(sx * R(10, 14), 0.95 + 0.18, R(-140, 18)); street.add(p.outer);
  CROWD.push({ p, stop: rnd() < 0.7, point: rnd() < 0.3, ph: R(0, 6), z0: p.outer.position.z, v: R(0.9, 1.5) * pick([-1, 1]) }); }
const steamS = makeSmoke(street, 400);
function updateStreet(t) { const sd = SUNS(t); skyMatS.uniforms.uSun.value.copy(sd); skyMatS.uniforms.uK.value = smooth(0, CRANE + 2, t);
  sunS.position.copy(sCam.position).addScaledVector(sd, 800); sunS.target.position.copy(sCam.position).add(V3(0, 0, -40)); sunS.intensity = lerp(1.2, 3.6, smooth(0.3, 3.5, t));
  for (const T of TAXI) { let z = T.z0 - T.v * t * (T.lane > 0 ? -1 : 1); z = wrapR(z, -760, 40); T.g.position.set(T.lane, 0, z); T.g.rotation.y = T.lane > 0 ? Math.PI : 0; }
  for (const C of CROWD) { const look = smooth(0.6 + C.ph * 0.15, 1.6 + C.ph * 0.15, t) * (C.stop ? 1 : 0);
    C.p.outer.position.z = C.z0 + C.v * (1 - look) * Math.min(t, 6); C.p.outer.rotation.y = lerp(C.v > 0 ? 0 : Math.PI, Math.PI, look);
    if (look > 0.5) { poseIdle(C.p, t, C.ph); if (C.point) { C.p.arms[1].rotation.x = -2.3 * smooth(0, 1, look * 2 - 1); C.p.elbows[1].rotation.x = -0.3; } } else poseWalk(C.p, t * 6 * Math.abs(C.v) + C.ph, 1); }
  steamS.begin(); smokeMat.uniforms.uTint.value.set('#e8d8d0'); for (let k = 0; k < 60; k++) { const age = (t * 0.45 + k / 60) % 1; _sp.set(-5.5 + Math.sin(k * 3.1) * 0.8 * age, 0.2 + age * 6, -46 + Math.cos(k * 1.7) * 0.8 * age); steamS.add(_sp, 0.6 + age * 3.0, 0.16 * (1 - age) * smooth(0, 0.15, age)); } steamS.end(); }
const _sp = new THREE.Vector3();
function streetCamera(t) { const crane = ease(clamp((t - CRANE) / 2.2, 0, 1));
  const p = V3(0.15 * Math.sin(t * 0.7), 1.7 + 0.05 * Math.sin(t * 1.9), 14 - 4.5 * t).lerp(V3(0, 420, -60 - 120 * crane), crane);
  const look = V3(0, 9 + 4 * t, -900).lerp(V3(0, 0, -520), Math.pow(crane, 1.4)); sCam.position.copy(p); sCam.lookAt(look); sCam.fov = lerp(56, 66, crane); }
