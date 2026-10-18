// =================== one world, one camera at Broadway & 7th Ave (origin, looking north = -z); each era is a group ===================
const world = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.6, 9000);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); world.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 900 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
world.add(sun, sun.target); sun.target.position.set(0, 0, -70);
world.fog = new THREE.Fog(0xffffff, 300, 3000);
const dome = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uSunSize: { value: 0.0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform vec3 uTop, uBot, uSunDir, uSunCol; uniform float uSunSize; varying vec3 vD;
    void main(){ float e=max(vD.y,0.0); vec3 c=mix(uBot,uTop,pow(e,0.55)); float s=dot(normalize(vD),normalize(uSunDir));
      c+=uSunCol*(smoothstep(1.0-uSunSize,1.0-uSunSize*0.6,s)*1.5+pow(max(s,0.0),40.0)*0.25); gl_FragColor=vec4(c,1.0); }` }));
world.add(dome);
// ---- noise
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const h = (i, j) => hash(i * 157.31 + j * 311.77); const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); }
function fbm(x, y, o = 4) { let a = 0, s = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { a += vnoise(x * f, y * f) * s; n += s; s *= 0.5; f *= 2.03; } return a / n; }
const near = (x, z, r0, r1) => smooth(r0, r1, Math.hypot(x, z - 0));
const terMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
// ONE ground for all eras: every era stores heights + colours on the same grid, the frame blends between neighbours
const GW = 3200, GSEG = 220, GCZ = -1300;
const groundGeo = new THREE.PlaneGeometry(GW, GW, GSEG, GSEG); groundGeo.rotateX(-Math.PI / 2); groundGeo.translate(0, 0, GCZ);
groundGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(groundGeo.attributes.position.count * 3), 3));
const ground = mesh(groundGeo, terMat, false, true); world.add(ground);
const GX = [], GZ = []; { const p = groundGeo.attributes.position; for (let i = 0; i < p.count; i++) { GX.push(p.getX(i)); GZ.push(p.getZ(i)); } }
const KF = {};      // era -> { h: Float32Array, c: Float32Array }
let curDef = '';
function terrain(parent, hf, cf, o = {}) { const n = GX.length, h = new Float32Array(n), col = new Float32Array(n * 3); const c = new THREE.Color();
  for (let i = 0; i < n; i++) { const x = GX[i], z = GZ[i], y = o.raw ? hf(x, z) : lerp(-0.4 + (fbm(x * 0.08, z * 0.08, 2) - 0.5) * 0.5, hf(x, z), near(x, z, 10, 80)); h[i] = y; cf(c, x, y, z); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  KF[curDef] = { h, c: col }; return { scale: new THREE.Vector3() }; }
// ONE water surface too (level / colour / wave height per era); hidden eras keep it far below
const WKF = {};
const water = mesh(new THREE.PlaneGeometry(3400, 3400, 200, 200).rotateX(-Math.PI / 2).translate(0, 0, -1300), new THREE.MeshStandardMaterial({ color: '#2b5866', roughness: 0.5, metalness: 0.1, flatShading: true }), false, true);
water.userData.base = water.geometry.attributes.position.array.slice(); world.add(water);
function waterPlane(parent, color, y, o = {}) { WKF[curDef] = { level: y, color: new THREE.Color(color), amp: o.amp ?? 1.0 }; return water; }
function waves(m, t, amp = 1, k = 1) { const p = m.geometry.attributes.position, b = m.userData.base;
  for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; p.array[i * 3 + 1] = b[i * 3 + 1] + amp * (0.6 * Math.sin(x * 0.045 * k + t * 1.3) + 0.5 * Math.sin(z * 0.06 * k - t * 1.7 + x * 0.02) + 0.3 * Math.sin((x + z) * 0.11 * k + t * 2.3)) * smooth(0, 30, Math.hypot(x, z)) ; }
  p.needsUpdate = true; m.geometry.computeVertexNormals(); }
const puffs = makeSmoke(world, 3500);
const ERA = {}; const eraGroup = name => { const g = new THREE.Group(); world.add(g); ERA[name] = { g }; curDef = name; return g; };
// =================== LAVA (4.5 billion years ago) ===================
{ const g = eraGroup('lava');
  terrain(g, (x, z) => { const n = fbm(x * 0.012 + 3, z * 0.012, 5); return lerp(-3, (n - 0.56) * 60 + 50 * smooth(700, 1500, -z) * fbm(x * 0.003, z * 0.003), near(x, z, 30, 110)); },
    (c, x, y) => c.set(y < 1.5 ? '#6a2a12' : y < 8 ? '#3a302c' : '#4c4038').offsetHSL(0, 0, (hash(x * 0.3 + y) - 0.5) * 0.05), { raw: true, seg: 300 });
  const lavaMat = new THREE.ShaderMaterial({ fog: false, uniforms: { uT: { value: 0 }, uCool: { value: 0 } }, vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT, uCool; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 p=vW.xz*0.03; float a=n(p+vec2(uT*0.2,uT*0.1))*0.6+n(p*3.0-uT*0.3)*0.4; float crust=smoothstep(0.42,0.62,a);
        vec3 c=mix(vec3(1.9,0.5,0.08),vec3(2.6,1.3,0.3),n(p*6.0+uT));  c=mix(c,vec3(0.10,0.04,0.03),crust*0.9); float d=length(vW.xz); c=mix(c,vec3(0.9,0.25,0.06),smoothstep(800.0,2400.0,d)); c=mix(c,vec3(0.07,0.06,0.06),uCool);
        gl_FragColor=vec4(c,1.0); }` });
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 1, 1).rotateX(-Math.PI / 2), lavaMat); lava.position.set(0, 0.6, -1500); lava.userData.noGrow = true; world.add(lava); ERA.lava.plane = lava; ERA.lava.lavaMat = lavaMat;
  ERA.lava.meteors = [];
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 7, 260, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.8, 0.8), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const fl = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.userData.noGrow = fl.userData.noGrow = true; g.add(m, fl);
    ERA.lava.meteors.push({ m, fl, t0: LAVA + 0.3 + i * 0.68 + hash(i) * 0.2, hit: V3(R(-180, 180), 0, R(-700, -300)), dir: V3(R(-0.5, 0.5), -0.55, R(0.2, 0.6)).normalize() }); }
  ERA.lava.look = { top: '#140406', bot: '#ff5018', sunDir: V3(0.4, 0.05, -1), sunCol: '#ff8a40', sunSize: 0.0, fog: '#601a0a', fogN: 150, fogF: 2600, hemiS: '#a85040', hemiG: '#ff7030', hemiI: 1.6, sunC: '#ff9050', sunI: 1.6, sunPos: V3(300, 200, -600), exp: 1.1, camY: 3.0 }; }
// =================== OCEAN (~4 billion years ago) ===================
{ const g = eraGroup('ocean'); waterPlane(g, '#2b5866', 0, { amp: 1.3 });
  terrain(g, (x, z) => -16 + Math.max(0, fbm(x * 0.004 + 11, z * 0.004, 4) - 0.6) * 260 * smooth(200, 600, -z), (c, x, y) => c.set(y > 0 ? '#3e3834' : '#2a2a2c'), { raw: true });
  for (const [x, z, s] of [[-420, -1200, 60], [380, -900, 38], [900, -1600, 90], [-120, -1900, 50]]) { const r = mesh(new THREE.IcosahedronGeometry(s, 0), M('#3a3634', { flatShading: true })); r.scale.y = 0.45; r.position.set(x, 0, z); g.add(r); }
  ERA.ocean.look = { top: '#6c7686', bot: '#d0b49a', sunDir: V3(-0.3, 0.12, -1), sunCol: '#ffd8a0', sunSize: 0.004, fog: '#a8a49e', fogN: 300, fogF: 2600, hemiS: '#c8ccd4', hemiG: '#3a4a50', hemiI: 1.1, sunC: '#ffe0c0', sunI: 2.0, sunPos: V3(-200, 120, -600), exp: 1.0, camY: 3.2 }; }
// =================== GRENVILLE MOUNTAINS (1.1 billion years ago) ===================
{ const g = eraGroup('gren');
  const ridge = (x, z) => { let a = 0, s = 1, f = 0.0022; for (let i = 0; i < 5; i++) { a += s * (1 - Math.abs(vnoise(x * f + 7, z * f) * 2 - 1)); s *= 0.5; f *= 2.1; } return a; };
  terrain(g, (x, z) => ridge(x, z) * 260 * smooth(150, 700, -z) + fbm(x * 0.03, z * 0.03, 3) * 6, (c, x, y) => c.set(y > 300 ? '#8c8a88' : y > 120 ? '#6e625a' : '#7c6a58').offsetHSL(0, 0, (hash(x + y) - 0.5) * 0.05));
  ERA.gren.look = { top: '#5f8fc8', bot: '#d8e2ea', sunDir: V3(0.5, 0.35, -1), sunCol: '#fff4e0', sunSize: 0.003, fog: '#c8d4de', fogN: 400, fogF: 3200, hemiS: '#cfe0ff', hemiG: '#6a5a4a', hemiI: 1.0, sunC: '#fff0dc', sunI: 3.0, sunPos: V3(300, 260, -300), exp: 1.0, camY: 2.0 }; }
// =================== TACONIC COLLISION (450 million years ago, near the equator) ===================
{ const g = eraGroup('taco'); waterPlane(g, '#2ea6ae', 0, { amp: 0.35 });
  terrain(g, (x, z) => lerp(-1.6, (x < -60 ? (fbm(x * 0.006, z * 0.006, 4) * 140 - 20) * smooth(-60, -300, x) : -12) + (x < -60 ? 3 : 0), near(x, z, 10, 80)), (c, x, y) => c.set(y < 2 ? '#c8b48a' : '#6a5a4c'), { raw: true });
  ERA.taco.volcs = [];
  for (const [x, z, h, r] of [[430, -620, 330, 330], [700, -900, 440, 420], [260, -1150, 280, 300], [900, -1300, 380, 380]]) { const vg = new THREE.Group(); g.add(vg);
    const cone = mesh(new THREE.ConeGeometry(r, h, 10, 3), M('#4a3e38', { flatShading: true })); cone.position.y = h / 2 - 10; vg.add(cone);
    const glow = mesh(new THREE.CircleGeometry(r * 0.12, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), fog: false })); glow.position.y = h - 10.5; vg.add(glow);
    vg.userData.anim = true; ERA.taco.volcs.push({ vg, x, z, h, ph: R(0, 6) }); }
  ERA.taco.look = { top: '#2f6fd8', bot: '#cfe6f6', sunDir: V3(0.1, 1.0, -0.2), sunCol: '#fffbe8', sunSize: 0.004, fog: '#d6e8f2', fogN: 500, fogF: 3600, hemiS: '#d8ecff', hemiG: '#3a8a8a', hemiI: 1.1, sunC: '#fffaf0', sunI: 3.4, sunPos: V3(40, 400, -40), exp: 1.0, camY: 2.6 }; }
// =================== PANGAEA (~300-250 million years ago) ===================
{ const g = eraGroup('pang');
  const ridge = (x, z) => { let a = 0, s = 1, f = 0.0016; for (let i = 0; i < 5; i++) { a += s * (1 - Math.abs(vnoise(x * f + 31, z * f + 5) * 2 - 1)); s *= 0.5; f *= 2.1; } return a; };
  terrain(g, (x, z) => { const dunes = 5 * Math.sin(x * 0.035 + fbm(x * 0.01, z * 0.01) * 6) * Math.cos(z * 0.012) + fbm(x * 0.02, z * 0.02) * 6; return dunes * near(x, z, 8, 60) + ridge(x, z) * 420 * smooth(900, 1700, -z); },
    (c, x, y) => c.set(y > 420 ? '#f2efe8' : y > 60 ? '#8a5a40' : '#d8834a').offsetHSL(0, 0, (hash(x * 0.7 + y) - 0.5) * 0.05), { d: 3200, cz: -1300, seg: 170 });
  ERA.pang.look = { top: '#5a8ac0', bot: '#f2cc98', sunDir: V3(-0.4, 0.4, -1), sunCol: '#fff0d0', sunSize: 0.004, fog: '#f0d2a8', fogN: 500, fogF: 4200, hemiS: '#ffe8c8', hemiG: '#a05a30', hemiI: 1.0, sunC: '#fff0d8', sunI: 3.2, sunPos: V3(-300, 300, -200), exp: 1.0, camY: 2.2 }; }
// =================== RIFT + DINOSAURS (201 million years ago) ===================
{ const g = eraGroup('rift');
  terrain(g, (x, z) => { const valley = -6 + Math.abs(x + 200 + 20 * Math.sin(z * 0.004)) * 0.05; const cliff = 90 * smooth(120, 170, x) + 60 * smooth(-200, -260, -x) * 0; return Math.min(valley + fbm(x * 0.02, z * 0.02) * 4, 40) * 0.6 + cliff + fbm(x * 0.004, z * 0.004) * 30 * smooth(300, 900, -z); },
    (c, x, y) => c.set(y > 60 ? '#3a3a40' : y < -1 ? '#7a3a2a' : '#9a4a34').offsetHSL(0, 0, (hash(x * 0.9 + y) - 0.5) * 0.05));
  waterPlane(g, '#3a6a6a', -1.2, { amp: 0.12 });
  // conifers + ferns
  const coneG = new THREE.ConeGeometry(2.6, 11, 7), trunkG = new THREE.CylinderGeometry(0.35, 0.45, 3, 6), fernG = new THREE.ConeGeometry(1.6, 1.2, 6);
  for (let i = 0; i < 160; i++) { const x = R(-90, 140), z = R(-600, -40); if (Math.abs(x) < 25 && z > -120) continue; const s = R(0.8, 1.8);
    const tr = mesh(trunkG, M('#5a4030')); tr.position.set(x, 1.5 * s - 2, z); tr.scale.setScalar(s); g.add(tr); const c = mesh(coneG, M(pick(['#2f5a32', '#3a6a3a', '#26502e']), { flatShading: true })); c.position.set(x, 8 * s - 2, z); c.scale.setScalar(s); g.add(c); }
  for (let i = 0; i < 120; i++) { const x = R(-80, 100), z = R(-160, -15); if (Math.abs(x) < 6 && z > -40) continue; const f = mesh(fernG, M(pick(['#4a8a3a', '#5a9a40']), { flatShading: true })); f.position.set(x, -0.6, z); f.scale.set(1, R(0.6, 1.2), 1); g.add(f); }
  // the glowing fissure + its smoke far away (the Palisades magma)
  const fis = mesh(new THREE.BoxGeometry(900, 3, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.2, 0.3), fog: false })); fis.position.set(-80, 4, -1300); fis.rotation.y = 0.15; g.add(fis);
  // dinosaurs: small two-legged theropods (the kind that left Grallator / Eubrontes tracks)
  ERA.rift.dinos = [];
  for (let i = 0; i < 7; i++) { const d = new THREE.Group(); const skin = M(pick(['#6a7a3a', '#7a6a3a', '#5a6a40']), { flatShading: true }); const s = i === 2 ? 3.2 : R(1.6, 2.2);
    const body = mesh(new THREE.SphereGeometry(0.6, 8, 6), skin); body.scale.set(1.6, 0.9, 0.8); body.position.y = 1.5; d.add(body);
    const tail = mesh(new THREE.ConeGeometry(0.42, 2.6, 6).rotateZ(Math.PI / 2), skin); tail.position.set(-1.9, 1.6, 0); d.add(tail);
    const neck = mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.1, 6), skin); neck.position.set(0.9, 2.1, 0); neck.rotation.z = -0.7; d.add(neck);
    const head = mesh(new THREE.BoxGeometry(0.75, 0.3, 0.3), skin); head.position.set(1.45, 2.55, 0); d.add(head);
    const legs = [-0.25, 0.25].map(zz => { const L = new THREE.Group(); L.position.set(0.1, 1.4, zz); d.add(L); const th = mesh(new THREE.CylinderGeometry(0.16, 0.1, 1.4, 5), skin); th.position.y = -0.7; L.add(th); const ft = mesh(new THREE.BoxGeometry(0.4, 0.08, 0.2), M('#4a4030')); ft.position.set(0.12, -1.4, 0); L.add(ft); return L; });
    d.scale.setScalar(s); d.userData.anim = true; g.add(d); ERA.rift.dinos.push({ d, legs, x0: -32 + i * 7 + R(-2, 2), z: -16 - i * 4.5 + R(-1, 1), v: R(2.2, 3.2), ph: R(0, 6), s }); }
  ERA.rift.look = { top: '#6f9ac8', bot: '#e8dcc0', sunDir: V3(0.6, 0.3, -1), sunCol: '#fff0d0', sunSize: 0.004, fog: '#d8d0b8', fogN: 300, fogF: 2600, hemiS: '#e0ecff', hemiG: '#6a4a30', hemiI: 1.0, sunC: '#fff0dc', sunI: 3.0, sunPos: V3(250, 220, -200), exp: 1.0, camY: 2.0 }; }
// =================== ICE (~20,000 years ago): the wall of ice rolls over, then melts back ===================
{ const g = eraGroup('ice');
  terrain(g, (x, z) => fbm(x * 0.01, z * 0.01, 3) * 6 - 1, (c, x, y) => c.set(y > 2 ? '#8a8a6a' : '#7a7f66').offsetHSL(0, 0, (hash(x + y * 3) - 0.5) * 0.06));
  for (let i = 0; i < 40; i++) { const b = mesh(new THREE.IcosahedronGeometry(R(0.6, 3.5), 0), M('#8a8682', { flatShading: true })); b.position.set(R(-120, 120), 0.2, R(-260, -10)); b.rotation.set(R(0, 3), R(0, 3), 0); g.add(b); }
  // the ice front: a faceted wall 305 m (1,000 ft) high, 3 km wide, with a long body behind
  const fg = new THREE.PlaneGeometry(3600, 305, 70, 12); const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), y = fp.getY(i); fp.setZ(i, (fbm(x * 0.01, y * 0.02, 3) - 0.5) * 60 + (y + 152) * 0.15); fp.setY(i, y + (fbm(x * 0.02, 9) - 0.5) * 18 * smooth(100, 152, y)); }
  fg.computeVertexNormals(); const iceM = new THREE.MeshStandardMaterial({ color: '#e6f2fb', emissive: '#6a9ac0', emissiveIntensity: 0.12, roughness: 0.5, flatShading: true });
  const ice = new THREE.Group(); ice.userData.noGrow = true; g.add(ice); const front = mesh(fg, iceM, false, true); front.position.y = 152; ice.add(front);
  const topS = mesh(new THREE.BoxGeometry(3600, 10, 4000), iceM, false, true); topS.position.set(0, 300, -2000); ice.add(topS);
  ERA.ice.ice = ice;
  // the Empire State Building as a ghost for scale (roof 1,250 ft = 381 m; tip 1,454 ft = 443 m)
  const ghost = new THREE.Group(); ghost.position.set(-120, 0, -760); ghost.userData.noGrow = true; g.add(ghost); const gm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false, fog: false }); ERA.ice.gm = gm;
  for (const [w, h, y] of [[56, 22, 11], [44, 250, 147], [34, 60, 302], [24, 40, 352], [14, 20, 372], [4, 62, 412]]) { const b = mesh(BOX, gm, false, false); b.scale.set(w, h, w * 0.7); b.position.y = y; ghost.add(b); }
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(44, 250, 31)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, fog: false })); ERA.ice.em = edges.material; edges.position.y = 147; ghost.add(edges);
  ERA.ice.ghost = ghost;
  ERA.ice.look = { top: '#7ea6d0', bot: '#e4ecf2', sunDir: V3(0.6, 0.25, -1), sunCol: '#fff8ec', sunSize: 0.003, fog: '#dfe8ef', fogN: 400, fogF: 3600, hemiS: '#e8f2ff', hemiG: '#6a6a5a', hemiI: 1.1, sunC: '#fff6ec', sunI: 2.6, sunPos: V3(300, 200, 100), exp: 1.0, camY: 1.8 }; }
// =================== 1609: fall forest, a stream and the Wickquasgeck trail (future Broadway) ===================
const trailX = z => 5 * Math.sin(z * 0.018) + z * 0.04;
{ const g = eraGroup('woods');
  terrain(g, (x, z) => fbm(x * 0.008, z * 0.008, 4) * 18 * near(x, z, 15, 120) + fbm(x * 0.05, z * 0.05, 2) * 0.5 - 0.3, (c, x, y, z) => { const tr = Math.abs(x - trailX(z)) < 1.6 && z < 10; c.set(tr ? '#8a6a48' : y > 10 ? '#6a7a3a' : '#5a7a34').offsetHSL(0, 0, (hash(x * 1.3 + z) - 0.5) * 0.06); }, { seg: 200, w: 1600, d: 1600, cz: -600, raw: true });
  const crown = new THREE.IcosahedronGeometry(1, 0), trunk = new THREE.CylinderGeometry(0.3, 0.5, 1, 6);
  const FALL = ['#d8622a', '#e8a030', '#b8382a', '#f0c040', '#6a8a3a', '#9aaa3a', '#c84a2a'];
  for (let i = 0; i < 900; i++) { const z = R(-700, 5), x = R(-260, 260); if (Math.abs(x - trailX(z)) < 4.5 || Math.hypot(x, z) < 6) continue; const s = R(0.8, 1.6), y0 = fbm(x * 0.008, z * 0.008, 4) * 18 * near(x, z, 15, 120);
    const tk = mesh(trunk, M('#4a3a2a')); tk.scale.set(s, 6 * s, s); tk.position.set(x, y0 + 3 * s, z); g.add(tk);
    const c = mesh(crown, M(pick(FALL), { flatShading: true })); c.scale.set(4.2 * s, 3.6 * s, 4.2 * s); c.position.set(x, y0 + 7.5 * s, z); g.add(c); }
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(5, 900, 1, 60).rotateX(-Math.PI / 2), M('#4a7a9a', { roughness: 0.2 })); stream.position.set(38, 0.4, -450); const sp = stream.geometry.attributes.position; for (let i = 0; i < sp.count; i++) sp.setX(i, sp.getX(i) + 10 * Math.sin(sp.getZ(i) * 0.02)); g.add(stream);
  ERA.woods.deer = [];
  for (const [x, z] of [[-9, -34], [-13, -38]]) { const d = new THREE.Group(); const fur = M('#8a5a3a', { flatShading: true }); const b = mesh(new THREE.SphereGeometry(0.5, 8, 6), fur); b.scale.set(1.5, 0.8, 0.7); b.position.y = 1.1; d.add(b);
    const n = mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 6), fur); n.position.set(0.7, 1.5, 0); n.rotation.z = -0.5; d.add(n); const h = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.22), fur); h.position.set(0.95, 1.85, 0); d.add(h);
    for (const [lx, lz] of [[0.5, 0.18], [0.5, -0.18], [-0.5, 0.18], [-0.5, -0.18]]) { const l = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.9, 5), fur); l.position.set(lx, 0.45, lz); d.add(l); }
    d.position.set(x, fbm(x * 0.008, z * 0.008, 4) * 18 * near(x, z, 15, 120), z); d.rotation.y = 0.8; g.add(d); ERA.woods.deer.push(d); }
  ERA.woods.look = { top: '#5f92d0', bot: '#f2dcb8', sunDir: V3(-0.7, 0.25, -1), sunCol: '#ffe6b8', sunSize: 0.004, fog: '#e8d8bc', fogN: 120, fogF: 1300, hemiS: '#ffe8c8', hemiG: '#5a6a30', hemiI: 1.0, sunC: '#ffd8a0', sunI: 2.8, sunPos: V3(-300, 160, -200), exp: 1.0, camY: 1.7 }; }
