
// =================== night sky for the city ===================
const MOON_DIR = new THREE.Vector3(-0.45, 0.42, 0.78).normalize();
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSunS: { value: MOON_DIR.clone() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 0.07 }, uDusk: { value: 0.0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d); c+=vec3(0.10,0.06,0.16)*pow(1.0-max(dot(d,uUp),0.0),3.0)*0.6; gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 40, 24), domeMat); dome.frustumCulled = false; dome.renderOrder = -10; city.add(dome);
{
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(0.08, 1), R(-1, 1)).normalize().multiplyScalar(4500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  city.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
}
function moonTex() {
  return canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, 'rgba(255,240,200,0.9)'); gr.addColorStop(0.42, 'rgba(255,230,180,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4ecd6'; g.beginPath(); g.arc(128, 128, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(170,160,140,0.5)'; for (const [x, y, r] of [[112, 116, 12], [142, 140, 9], [132, 106, 6], [118, 146, 7], [148, 118, 5]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  });
}
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), fog: false, depthWrite: false, transparent: true })); moon.scale.setScalar(900); city.add(moon);

// =================== jack-o'-lanterns ===================
const faceEmi = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffb030';
  const fx = 64;  // face centred at u = 0.25
  g.beginPath(); g.moveTo(fx - 22, 50); g.lineTo(fx - 8, 50); g.lineTo(fx - 15, 36); g.fill();
  g.beginPath(); g.moveTo(fx + 8, 50); g.lineTo(fx + 22, 50); g.lineTo(fx + 15, 36); g.fill();
  g.beginPath(); g.moveTo(fx - 26, 66); for (let i = 0; i <= 8; i++) g.lineTo(fx - 26 + i * 6.5, 66 + (i % 2 ? 10 : 2) + Math.sin(i / 8 * Math.PI) * 10); g.lineTo(fx + 26, 66); g.quadraticCurveTo(fx, 72, fx - 26, 66); g.fill();
});
const pumpkinMat = new THREE.MeshStandardMaterial({ color: '#e0701c', roughness: 0.7, emissiveMap: faceEmi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.2, flatShading: true });
const pumpkinGeo = (() => { const g = new THREE.SphereGeometry(1, 14, 10); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(z, x); const r = 1 + 0.07 * Math.cos(a * 8); p.setX(i, x * r); p.setZ(i, z * r); } g.computeVertexNormals(); return g; })();
const stemGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.22, 6);
function jackO(x, y, z, s, faceYaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); city.add(g);
  const b = mesh(pumpkinGeo, pumpkinMat); b.scale.set(s, s * 0.78, s); b.rotation.y = faceYaw; b.position.y = s * 0.78; g.add(b);
  const st = mesh(stemGeo, M('#4b5a22')); st.scale.setScalar(s * 1.6); st.position.y = s * 1.56 + 0.05; st.rotation.z = 0.2; g.add(st);
  return g;
}
// SphereGeometry u=0.25 faces -z; rotate so the face looks across the street
for (let x = 48; x < 100; x += R(2.4, 4.2)) { jackO(x, 0.18, -11.55 + R(-0.15, 0.1), R(0.2, 0.32), Math.PI); if (rnd() < 0.5) jackO(x + 0.5, 0.18, -11.45, R(0.14, 0.2), Math.PI + 0.3); }
for (let x = 48; x < 100; x += R(3, 5)) jackO(x, 0.18, 11.55, R(0.2, 0.3), 0);
const pumpLights = [];
for (const [x, z] of [[60, -11.0], [70, -11.0], [80, -11.0], [66, 11.0]]) { const l = new THREE.PointLight(0xff8a2a, 6, 9, 1.6); l.position.set(x, 0.8, z); city.add(l); pumpLights.push(l); }
// string lights / fake cobweb? keep it clean: orange garlands on the facades
{
  const bulbs = []; for (let x = 46; x < 100; x += 0.55) { const sag = 0.35 * Math.pow(Math.sin(((x - 46) % 6.6) / 6.6 * Math.PI), 1); bulbs.push([x, 3.2 - sag, -11.92]); }
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffa040' }), bulbs.length); const d = new THREE.Object3D();
  bulbs.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); city.add(im);
}

// =================== costumes + zombies ===================
const ZSKIN = '#8fb860';
const COSTUMES = {
  witch: { top: '#3a1f4a', bottom: '#1d1d22', dress: true, add: (r, c) => { addPart(r, new THREE.ConeGeometry(0.15, 0.45, 8), c.hat || '#1a1a1e', 0, 1.93, 0); addPart(r, new THREE.CylinderGeometry(0.27, 0.27, 0.02, 12), c.hat || '#1a1a1e', 0, 1.72, 0); } },
  pumpkin: { top: '#e0701c', bottom: '#2a2a2a', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.21, 10, 8), c.z ? '#9a8a3a' : '#e8781e', 0, 1.64, 0); addPart(r, new THREE.CylinderGeometry(0.025, 0.035, 0.08, 5), '#4b5a22', 0, 1.88, 0); } },
  ghost: { top: '#f2f2f2', bottom: '#f2f2f2', ghost: true, add: (r, c) => { addPart(r, new THREE.CylinderGeometry(0.17, 0.4, 1.5, 12, 1, true), c.z ? '#cfe6b8' : '#f4f4f6', 0, 0.98, 0); addPart(r, new THREE.SphereGeometry(0.19, 12, 9), c.z ? '#cfe6b8' : '#f4f4f6', 0, 1.66, 0); addPart(r, new THREE.BoxGeometry(0.05, 0.06, 0.02), '#111', -0.06, 1.68, 0.18); addPart(r, new THREE.BoxGeometry(0.05, 0.06, 0.02), '#111', 0.06, 1.68, 0.18); } },
  vampire: { top: '#151518', bottom: '#151518', add: (r, c) => { addPart(r, new THREE.BoxGeometry(0.52, 1.0, 0.03), '#7a0f1a', 0, 1.0, -0.14); addPart(r, new THREE.BoxGeometry(0.5, 0.18, 0.04), '#7a0f1a', 0, 1.5, -0.1); } },
  devil: { top: '#b0202a', bottom: '#1d1d22', add: (r, c) => { for (const sx of [-0.07, 0.07]) addPart(r, new THREE.ConeGeometry(0.025, 0.1, 6), '#d02a2a', sx, 1.78, 0.02); } },
  hero: { top: '#2a4fb0', bottom: '#2a4fb0', add: (r, c) => { addPart(r, new THREE.BoxGeometry(0.46, 0.9, 0.025), '#c8202a', 0, 1.02, -0.13); } },
  cat: { top: '#1a1a1e', bottom: '#1a1a1e', add: (r, c) => { for (const sx of [-0.07, 0.07]) addPart(r, new THREE.ConeGeometry(0.04, 0.09, 4), '#1a1a1e', sx, 1.77, 0); } },
  cowboy: { top: '#8a5a32', bottom: '#2a3a5c', add: (r, c) => { addPart(r, new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14), '#6b4a2e', 0, 1.73, 0); addPart(r, new THREE.CylinderGeometry(0.12, 0.14, 0.14, 10), '#6b4a2e', 0, 1.8, 0); } },
  astronaut: { top: '#e8e8ea', bottom: '#e8e8ea', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.2, 12, 9), '#f2f2f2', 0, 1.64, -0.01); addPart(r, new THREE.BoxGeometry(0.2, 0.1, 0.02), '#2a3a5a', 0, 1.65, 0.19); addPart(r, new THREE.BoxGeometry(0.3, 0.4, 0.14), '#d8d8dc', 0, 1.22, -0.2); } },
  princess: { top: '#e88ab8', bottom: '#e88ab8', dress: true, add: (r, c) => { addPart(r, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8, 1, true), '#f0c040', 0, 1.79, 0); } },
  pirate: { top: '#e8e2d0', bottom: '#1d1d22', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.128, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#b0202a', 0, 1.655, 0); addPart(r, new THREE.BoxGeometry(0.06, 0.05, 0.02), '#111', 0.05, 1.65, 0.11); } },
  mummy: { top: '#e2d6b8', bottom: '#e2d6b8', add: (r, c) => { addPart(r, new THREE.SphereGeometry(0.125, 10, 8), '#e8dcc0', 0, 1.64, 0.005); } },
};
function addPart(root, geo, col, x, y, z) { const m = new THREE.Mesh(geo, M(col, { flatShading: true })); m.position.set(x, y, z); m.castShadow = true; root.add(m); return m; }
const SKINS_C = ['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c', '#6b4329'];
function darken(hex, k) { return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString(); }
function makeCostumed(kind, skin, kid, zombie) {
  const c = COSTUMES[kind];
  const o = { skin: zombie ? ZSKIN : skin, top: zombie ? darken(c.top, 0.75) : c.top, bottom: zombie ? darken(c.bottom, 0.75) : c.bottom, dress: !!c.dress, shorts: false, longSleeve: true, hairStyle: 0.3, cap: false, hair: zombie ? '#3a3a2a' : '#2a1d14', shoe: '#1b1b1b' };
  const p = makePerson(rnd, o);
  c.add(p.root, { z: zombie });
  if (c.ghost) p.outer.traverse(m => { if (m.isMesh && m.geometry.type === 'CapsuleGeometry') m.visible = false; });
  if (kid) p.outer.scale.setScalar(0.66);
  city.add(p.outer); p.outer.visible = false;
  return p;
}
// cast: positions on the sidewalk (side -1) around the party
const KINDS = Object.keys(COSTUMES);
const cast = [];
{
  const spots = [[66.0, -10.2], [67.7, -10.9], [64.6, -9.0], [68.8, -10.6], [63.2, -10.4], [70.2, -9.2], [62.0, -9.4], [71.6, -10.3], [65.4, -11.0], [69.4, -8.6],
    [60.6, -10.6], [73.0, -9.0], [61.4, -8.6], [74.4, -10.4], [58.8, -9.6], [75.6, -8.9], [57.4, -10.8], [77.0, -10.0], [59.6, -11.2], [72.4, -11.1], [76.4, -11.0], [56.4, -9.2]];
  // infection order (the party block): times in seconds
  const tinf = [5.6, 8.1, 8.9, 10.4, 10.9, 11.6, 12.1, 12.6, 13.0, 13.4, 13.8, 14.1, 14.4, 14.7, 15.0, 15.3, 15.6, 15.9, 16.1, 16.3, 99, 99];
  spots.forEach(([x, z], i) => {
    const kind = KINDS[i % KINDS.length]; const skin = pick(SKINS_C); const kid = i % 5 === 3 || i % 7 === 6;
    const s = seed; const human = makeCostumed(kind, skin, kid, false); const zom = makeCostumed(kind, skin, kid, true);
    cast.push({ x, z, kind, kid, human, zom, tinf: tinf[i], yaw: R(-Math.PI, Math.PI), ph: R(0, 6), biter: -1 });
  });
  // who bites whom: the nearest already-infected cast member (index 0 is bitten by patient zero)
  for (let i = 0; i < cast.length; i++) {
    if (i === 0) continue; let best = 0, bd = 1e9;
    for (let j = 0; j < cast.length; j++) if (cast[j].tinf < cast[i].tinf - 0.9) { const d = Math.hypot(cast[j].x - cast[i].x, cast[j].z - cast[i].z); if (d < bd) { bd = d; best = j; } }
    cast[i].biter = best;
  }
}
// patient zero: a real zombie in a torn suit, arriving from down the sidewalk
const zero = makePerson(rnd, { skin: ZSKIN, top: '#3a3f2e', bottom: '#2a2a22', dress: false, shorts: false, longSleeve: true, hairStyle: 0.0, cap: false, shoe: '#1b1b1b' });
city.add(zero.outer);
// green "turn" flashes
const flashTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(220,255,180,1)'); gr.addColorStop(0.3, 'rgba(120,255,90,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const flashes = cast.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); s.visible = false; city.add(s); return s; });

function poseZombie(p, t, ph, amt = 1) {
  const s = Math.sin(t * 3.2 + ph);
  p.legs[0].rotation.x = s * 0.32 * amt; p.legs[1].rotation.x = -s * 0.32 * amt;
  p.knees[0].rotation.x = Math.max(0, -Math.cos(t * 3.2 + ph)) * 0.45 * amt; p.knees[1].rotation.x = Math.max(0, Math.cos(t * 3.2 + ph)) * 0.45 * amt;
  p.arms[0].rotation.set(-1.45 + 0.08 * Math.sin(t * 2.1 + ph), 0, 0.12); p.arms[1].rotation.set(-1.38 + 0.08 * Math.cos(t * 1.9 + ph), 0, -0.12);
  p.elbows[0].rotation.x = -0.12; p.elbows[1].rotation.x = -0.2;
}
// position of a cast zombie after it turns: shuffle toward its next victim, then drift down the sidewalk
const ZSPEED = 0.55;
function castPos(i, t) {
  const c = cast[i];
  const targets = cast.map((v, k) => ({ v, k })).filter(o => o.v.biter === i && o.v.tinf < 98).sort((a, b) => a.v.tinf - b.v.tinf);
  let px = c.x, pz = c.z, pt = c.tinf;
  for (const { v } of targets) {
    if (t < pt) break;
    const arrive = v.tinf - 0.1; const ax = v.x + 0.42 * Math.cos(c.yaw), az = v.z + 0.3 * Math.sin(c.yaw);
    if (t <= arrive) { const u = clamp((t - pt) / Math.max(arrive - pt, 0.01), 0, 1); return { x: lerp(px, ax, u), z: lerp(pz, az, u), yaw: Math.atan2(ax - px, az - pz), lean: smooth(arrive - 0.35, arrive, t) * 0.35 }; }
    px = ax; pz = az; pt = v.tinf + 0.4;
  }
  const dt = Math.max(0, t - pt); return { x: px + ZSPEED * dt, z: pz + 0.15 * Math.sin(dt * 0.7 + c.ph), yaw: Math.PI / 2, lean: 0 };
}
function zeroPos(t) {
  const v = cast[0]; const ax = v.x - 0.45, az = v.z + 0.12;
  if (t < 5.5) { const u = smooth(0, 5.5, t); return { x: lerp(61.2, ax, u), z: lerp(-9.9, az, u), yaw: Math.PI / 2, lean: smooth(5.15, 5.5, t) * 0.4 }; }
  if (t < 6.2) return { x: ax, z: az, yaw: Math.PI / 2, lean: 0.4 * (1 - smooth(5.8, 6.2, t)) };
  // then go for #1 (if zero is its biter) — otherwise drift
  const dt = t - 6.2; return { x: ax + ZSPEED * dt, z: az + 0.1 * Math.sin(dt), yaw: Math.PI / 2, lean: 0 };
}
function updateCast(t) {
  // patient zero
  const zp = zeroPos(t); zero.outer.visible = t < RISE + 0.5; zero.outer.position.set(zp.x, 0.18 + 0.95, zp.z); zero.outer.rotation.set(zp.lean, zp.yaw, 0, 'YXZ'); poseZombie(zero, t, 0.4);
  for (let i = 0; i < cast.length; i++) {
    const c = cast[i]; const turned = t >= c.tinf;
    c.human.outer.visible = !turned && t < RISE + 0.5; c.zom.outer.visible = turned && t < RISE + 0.5;
    const bob = c.kid ? 0.66 : 1; const y0 = 0.18 + 0.95 * bob;
    if (!turned) {
      // partying: idle, little bounces, facing a neighbour; a beat of "shock" right before being bitten
      const o = c.human.outer; o.position.set(c.x, y0, c.z); o.rotation.set(0, c.yaw + 0.2 * Math.sin(t * 0.7 + c.ph), 0);
      poseIdle(c.human, t, c.ph); c.human.arms[1].rotation.x = -0.4 - 0.25 * Math.max(0, Math.sin(t * 2.4 + c.ph));
      o.position.y += 0.03 * Math.max(0, Math.sin(t * 6 + c.ph));
    } else {
      const p = castPos(i, t); const o = c.zom.outer; o.position.set(p.x, y0, p.z); o.rotation.set(p.lean, p.yaw, 0, 'YXZ'); poseZombie(c.zom, t, c.ph);
      if (t - c.tinf < 0.5) { const k = (t - c.tinf) / 0.5; o.rotation.x = -0.25 * Math.sin(k * Math.PI); }
    }
    const f = flashes[i]; const ft = t - c.tinf; f.visible = ft >= -0.05 && ft < 0.7 && t < RISE;
    if (f.visible) { f.position.set(c.x, y0 + 0.5 * bob, c.z); const s = (0.4 + 2.2 * clamp(ft + 0.05, 0, 1)) * bob; f.scale.set(s, s, 1); f.material.opacity = 1 - clamp(ft / 0.7, 0, 1); }
  }
}
