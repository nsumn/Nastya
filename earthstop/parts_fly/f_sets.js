// =================== SETS (each its own scene + camera; you are re-parented into whichever set is shot) ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
function mkSet({ top = '#6a9ad8', bot = '#f4dcc0', fog = 0xf0dcc8, near = 40, far = 260, hemi = [0xfff0e0, 0x7a6a50, 1.1], sun = [0xfff0d8, 2.4, V3(10, 14, 8)], shadow = 18 } = {}) {
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const sky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false })));
  sc.fog = new THREE.Fog(fog, near, far); const hm = new THREE.HemisphereLight(...hemi); sc.add(hm);
  const s = new THREE.DirectionalLight(sun[0], sun[1]); s.position.copy(sun[2]); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02;
  Object.assign(s.shadow.camera, { left: -shadow, right: shadow, top: shadow, bottom: -shadow, far: 80 }); sc.add(s, s.target); sc.userData.sun = s; sc.userData.hemi = hm;
  const key = new THREE.PointLight(0xfff0e0, 0.8, 7, 1.3); cam.add(key); sc.add(cam);
  return { sc, cam }; }
const gplane = (sc, w, d, mat, x, z, y = 0, ry = 0) => { const p = mesh(new THREE.PlaneGeometry(w, d), typeof mat === 'string' ? F_(mat) : mat, false, true); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, y, z); sc.add(p); return p; };
const _o = new THREE.Object3D(), _c = new THREE.Color();
// bake a group (people.js person, makeCar…) into ONE geometry with vertex colours, so thousands can be instanced cheaply
const BAKE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
function bake(group) { group.updateMatrixWorld(true); const gs = [];
  group.traverse(o => { if (!o.isMesh || !o.visible) return; let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.color) { const c = (Array.isArray(o.material) ? o.material[0] : o.material).color || new THREE.Color(1, 1, 1), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
    gs.push(g); }); return mergeGeometries(gs); }
// the crowd: 12 beachgoers (people.js, built from simple shapes like on our streets) × 4 poses
const GLSL_HASH = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`;
const SUN_DIR = V3(-0.55, 0.32, -0.77).normalize(), HAZE = new THREE.Color('#f0b47a');
// ---------- 1) THE BEDROOM (hook): you wake up, float… and bonk the ceiling fan ----------
const BED = mkSet({ top: '#9cc4ec', bot: '#f4dcc0', fog: 0xf4e4d0, near: 30, far: 200, hemi: [0xfff0e0, 0x8a6a50, 1.0], sun: [0xffd8a8, 2.6, V3(6, 5, 4)], shadow: 6 });
const BD = {}; { const sc = BED.sc, wall = F_('#e8dcc8'), wood = F_('#b88a60');
  gplane(sc, 6, 6, wood, 0, 0); bx(6, 0.1, 6, '#f4f0e8', 0, 2.8, 0, sc); bx(0.1, 2.8, 6, wall, -3, 1.4, 0, sc); bx(6, 2.8, 0.1, wall, 0, 1.4, -3, sc);
  bx(0.1, 2.8, 1.4, wall, 3, 1.4, -2.3, sc); bx(0.1, 2.8, 1.4, wall, 3, 1.4, 2.3, sc); bx(0.1, 0.8, 3.2, wall, 3, 0.4, 0, sc); bx(0.1, 0.5, 3.2, wall, 3, 2.55, 0, sc);   // a big window on the right (+x)
  const bed = new THREE.Group(); bx(1.6, 0.4, 2.2, '#6a4a34', 0, 0.2, 0, bed); bx(1.5, 0.18, 2.1, '#f4f2ee', 0, 0.48, 0, bed); bx(1.5, 0.12, 1.3, '#e8603a', 0, 0.6, 0.35, bed); bx(0.6, 0.12, 0.4, '#fff', -0.4, 0.62, -0.8, bed); bx(0.6, 0.12, 0.4, '#fff', 0.4, 0.62, -0.8, bed); bx(1.6, 0.9, 0.1, '#6a4a34', 0, 0.65, -1.1, bed); bed.position.set(-0.6, 0, -1.6); sc.add(bed);
  BD.fan = new THREE.Group(); bx(0.04, 0.35, 0.04, '#d8d8dc', 0, -0.17, 0, BD.fan); const hub = mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.14, 14), F_('#e8e8ec', { metalness: 0.4 })); hub.position.y = -0.38; BD.fan.add(hub);
  BD.blades = new THREE.Group(); BD.blades.position.y = -0.42; BD.fan.add(BD.blades); for (let k = 0; k < 5; k++) { const b = bx(0.7, 0.02, 0.14, '#8a6a4a', 0.42, 0, 0, BD.blades); const g = new THREE.Group(); g.add(b); g.rotation.y = k * Math.PI * 2 / 5; BD.blades.add(g); }
  BD.fan.position.set(-0.6, 2.75, -1.2); sc.add(BD.fan);
  const city = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8ab8e8'); gr.addColorStop(1, '#f8d8b0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const x = hash(i) * w, bw = 20 + 40 * hash(i * 3), bh = 120 + 300 * hash(i * 5); g.fillStyle = ['#c8b8a8', '#a8b0c0', '#d8c8b0', '#8a98b0'][i % 4]; g.fillRect(x, h - bh, bw, bh); } });
  const cp = mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshBasicMaterial({ map: city }), false, false); cp.position.set(9, 2, 0); cp.rotation.y = -Math.PI / 2; sc.add(cp);
  BD.stars = Array.from({ length: 5 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffd040'; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 12 : 30, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); }), transparent: true, depthWrite: false })); s.scale.setScalar(0.12); sc.add(s); return s; }); }
function updateBed(t) { BD.blades.rotation.y = -t * (t < 1.55 ? 14 : 3); BD.fan.rotation.z = t > 1.55 ? 0.15 * Math.exp(-(t - 1.55) * 3) * Math.sin((t - 1.55) * 30) : 0; }
// ---------- 2) MANHATTAN AT GOLDEN HOUR (meters): ~12,000 towers with a DAY window shader (sky reflections, warm sun, haze), streets, the park, the river ----------
const CITY = mkSet({ top: '#5a8ad0', bot: '#f6c896', fog: 0xf2c89a, near: 300, far: 5200, hemi: [0xffe4c8, 0x6a6058, 1.0], sun: [0xffd0a0, 3.2, SUN_DIR.clone().multiplyScalar(300)], shadow: 60 });
CITY.cam.far = 30000;
// a sky dome big enough for the whole flight: golden-hour gradient + a sun glow
{ const dome = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uSun: { value: SUN_DIR } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSun; varying vec3 vD; void main(){ float h = clamp(vD.y, -0.1, 1.0); vec3 c = mix(vec3(0.97, 0.78, 0.58), vec3(0.33, 0.52, 0.82), smoothstep(0.0, 0.55, h)); float s = max(dot(normalize(vD), uSun), 0.0); c += vec3(1.0, 0.75, 0.45) * (pow(s, 12.0) * 0.6 + pow(s, 400.0) * 3.0); gl_FragColor = vec4(c, 1.0); }' }));
  dome.frustumCulled = false; CITY.sc.add(dome); }
const towerDay = new THREE.ShaderMaterial({ uniforms: { uSun: { value: SUN_DIR }, uHaze: { value: HAZE }, uCam: { value: new THREE.Vector3() } },
  vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed;
    void main(){ mat4 im = instanceMatrix; vec4 w = modelMatrix * im * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * im) * normal); vC = vec3(1.0);
      \n#ifdef USE_INSTANCING_COLOR\n vC = instanceColor; \n#endif\n vSeed = floor(im[3].xz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uSun, uHaze, uCam; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed; ${GLSL_HASH}
    void main(){ vec3 n = normalize(vN), v = normalize(uCam - vW); float dif = max(dot(n, uSun), 0.0), side = 1.0 - step(0.5, abs(n.y));
      float ty = h21(vSeed * 0.731); int T = ty < 0.32 ? 0 : ty < 0.66 ? 1 : 2;   // 0 brick, 1 limestone, 2 glass curtain wall
      vec3 wall = T == 0 ? vec3(0.46, 0.2, 0.13) : T == 1 ? vec3(0.66, 0.57, 0.44) : vec3(0.22, 0.29, 0.36); wall *= 0.85 + 0.3 * vC;
      vec3 lit = vec3(0.3, 0.33, 0.4) + 1.1 * dif * vec3(1.0, 0.84, 0.64); vec3 col = wall * lit + vec3(0.03, 0.035, 0.05);
      if (side > 0.5) { float u = abs(n.x) > 0.5 ? vW.z : vW.x; float fw = T == 0 ? 2.4 : T == 1 ? 3.0 : 2.0, fh = T == 0 ? 3.2 : 3.6;
        vec2 g = vec2(u / fw, vW.y / fh); vec2 c = floor(g), f = fract(g); float mx = T == 2 ? 0.06 : T == 0 ? 0.25 : 0.18, my = T == 2 ? 0.08 : 0.24;
        float win = step(mx, f.x) * step(f.x, 1.0 - mx) * step(my, f.y) * step(f.y, 1.0 - my * 0.8);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 2.0); vec3 sky = mix(vec3(0.4, 0.55, 0.75), vec3(1.0, 0.8, 0.58), 0.35 + 0.45 * fres);
        vec3 glass = mix(vec3(0.04, 0.05, 0.08), sky * 0.7, (T == 2 ? 0.35 : 0.1) + 0.2 * fres) * (0.82 + 0.3 * h21(c + vSeed)); if (T == 2) glass *= vec3(0.85, 1.0, 1.02);
        float glint = pow(max(dot(reflect(-uSun, n), v), 0.0), 60.0) * (T == 2 ? 4.0 : 1.5);
        float dd = length(vW - uCam); col = mix(col, mix(glass + glint * vec3(1.0, 0.85, 0.6), mix(col, glass, 0.5), smoothstep(500.0, 1800.0, dd)), mix(win, 1.0, smoothstep(500.0, 1800.0, dd)));
        float band = T == 1 ? step(0.92, fract(vW.y / (fh * 4.0))) : T == 0 ? step(0.96, fract(vW.y / (fh * 6.0))) : 0.0; col = mix(col, wall * lit * 0.62, band * (1.0 - win * 0.0));
        float base = 1.0 - step(6.0, vW.y); col = mix(col, mix(vec3(0.12, 0.1, 0.09), vec3(0.9, 0.55, 0.25) * 0.6, step(0.5, fract(u / 7.0))) , base * 0.85);
        col *= 0.3 + 0.7 * smoothstep(0.0, 70.0, vW.y); }
      else col = vec3(0.2, 0.19, 0.18) * lit * (0.8 + 0.4 * h21(vSeed)); col = pow(max(col, 0.0), vec3(2.0)) * 1.8;
      float d = length(vW - uCam); col = mix(col, uHaze, clamp(1.0 - exp(-d * 0.00011), 0.0, 0.85)); gl_FragColor = vec4(col, 1.0); }` });
const groundDay = new THREE.ShaderMaterial({ uniforms: { uHaze: { value: HAZE }, uCam: { value: new THREE.Vector3() }, uT: { value: 0 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uHaze, uCam; uniform float uT; varying vec3 vW; ${GLSL_HASH}
    void main(){ vec2 p = vW.xz; float water = (abs(p.x) > 1750.0 && abs(p.x) < 2350.0) || p.y > 7600.0 ? 1.0 : 0.0;
      float park = step(abs(p.x - 100.0), 400.0) * step(-4600.0, p.y) * step(p.y, -1500.0);
      float av = 1.0 - smoothstep(4.0, 7.0, abs(mod(p.x + 70.0, 140.0) - 70.0)), st = 1.0 - smoothstep(3.0, 5.0, abs(mod(p.y + 35.0, 70.0) - 35.0));
      vec3 col = mix(vec3(0.2, 0.19, 0.18), vec3(0.07, 0.07, 0.08), max(av, st));
      float cab = step(0.82, h21(floor(vec2(p.x / 4.0, (p.y - uT * 9.0) / 9.0)))) * av; col = mix(col, vec3(0.95, 0.75, 0.15), cab);
      col = mix(col, mix(vec3(0.28, 0.48, 0.22), vec3(0.36, 0.56, 0.26), vn(p * 0.02)), park);
      col = mix(col, vec3(0.2, 0.36, 0.5) + 0.12 * vn(p * 0.05 + uT * 0.2), water);
      float d = length(vW - uCam); col = mix(col, uHaze, clamp(1.0 - exp(-d * 0.00011), 0.0, 0.85)); gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }` });
const CT = {}; { const sc = CITY.sc; const gnd = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), groundDay); gnd.rotation.x = -Math.PI / 2; sc.add(gnd);
  const T = []; for (let bx2 = -11; bx2 <= 11; bx2++) for (let bz = -60; bz <= 108; bz++) { const cx = bx2 * 140, cz = bz * 70; if (Math.abs(cx - 100) < 420 && cz > -4620 && cz < -1480) continue;
    const mid = Math.exp(-((cz / 1800) ** 2)), down = Math.exp(-(((cz - 6200) / 900) ** 2)), k = (bx2 + 20) * 1000 + bz, n = 2 + ((hash(k) * 3) | 0);
    for (let q = 0; q < n; q++) { const w = Math.min(22 + 30 * hash(k * 3 + q), 112 / n - 6), d = Math.min(18 + 22 * hash(k * 5 + q), 52), x = cx + (q - (n - 1) / 2) * (112 / n), z = cz + (hash(k * 7 + q) - 0.5) * 18;
      T.push([x, z, w, d, 18 + (40 + 300 * mid + 260 * down) * Math.pow(hash(k * 11 + q), 2.2) + 30 * hash(k * 13 + q) + (hash(k * 17 + q) > 0.985 ? 180 + 160 * hash(k * 19) : 0)]); } }
  for (let k = 0; k < 2000; k++) { const s2 = k % 2 ? 1 : -1; T.push([s2 * (2600 + 9000 * hash(k)), -8000 + 18000 * hash(k * 3), 20 + 25 * hash(k * 5), 20 + 25 * hash(k * 7), 12 + 50 * hash(k * 9) ** 2]); }
  // setbacks: tall towers step back in 2–3 tiers; a stone cornice tops each tier; roofs get water tanks, AC units, antennas, art-deco crowns and red lights
  const tiers = [], corn = [], tanks = [], acs = [], ants = [], crowns = [], reds = [];
  T.forEach(([x, z, w, d, h], i) => { const r = hash(i * 1.37); let y = 0, ww = w, dd = d; const nT = h > 140 ? 3 : h > 70 ? 2 : 1, parts = nT === 3 ? [0.55, 0.3, 0.15] : nT === 2 ? [0.7, 0.3] : [1];
    parts.forEach((f, j) => { const hh = h * f; tiers.push([x, y, z, ww, hh, dd, i]); corn.push([x, y + hh, z, ww + 1.2, 1.0, dd + 1.2]); y += hh; ww *= 0.72; dd *= 0.72; });
    const topY = y, tw = ww / 0.72, td = dd / 0.72;
    if (h < 130 && r < 0.45) tanks.push([x + (hash(i * 3) - 0.5) * tw * 0.4, topY + 1, z + (hash(i * 5) - 0.5) * td * 0.4]);
    if (r > 0.3) for (let q = 0; q < 2 + ((hash(i * 7) * 3) | 0); q++) acs.push([x + (hash(i * 9 + q) - 0.5) * tw * 0.6, topY + 0.6, z + (hash(i * 11 + q) - 0.5) * td * 0.6]);
    if (h > 160 && r < 0.5) ants.push([x, topY, z, 12 + 40 * hash(i * 13)]); if (h > 160 && r >= 0.5) crowns.push([x, topY, z, tw, td, 8 + 20 * hash(i * 17)]);
    if (h > 200) reds.push([x, topY + (r < 0.5 ? 12 + 40 * hash(i * 13) : 8 + 20 * hash(i * 17)) + 1, z]); });
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerDay, tiers.length);
  tiers.forEach(([x, y, z, w, h, d, i], k) => { _o.position.set(x, y, z); _o.rotation.set(0, 0, 0); _o.scale.set(w, h, d); _o.updateMatrix(); im.setMatrixAt(k, _o.matrix); im.setColorAt(k, _c.setScalar(0.85 + 0.3 * hash(i * 3))); });
  im.castShadow = true; im.receiveShadow = true; sc.add(im); CT.towers = T;
  const inst = (geo, mat, list, f) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); list.forEach((e, k) => { f(e); _o.updateMatrix(); m.setMatrixAt(k, _o.matrix); }); m.castShadow = true; sc.add(m); return m; };
  inst(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), F_('#7d756a'), corn, ([x, y, z, w, h, d]) => { _o.position.set(x, y, z); _o.rotation.set(0, 0, 0); _o.scale.set(w, h, d); });
  const tankG = mergeGeometries([new THREE.CylinderGeometry(2.4, 2.4, 4.5, 14).translate(0, 6.6, 0), new THREE.ConeGeometry(2.6, 1.8, 14).translate(0, 9.7, 0), new THREE.BoxGeometry(0.25, 4.4, 0.25).translate(-1.6, 2.2, -1.6), new THREE.BoxGeometry(0.25, 4.4, 0.25).translate(1.6, 2.2, -1.6), new THREE.BoxGeometry(0.25, 4.4, 0.25).translate(-1.6, 2.2, 1.6), new THREE.BoxGeometry(0.25, 4.4, 0.25).translate(1.6, 2.2, 1.6)]);
  inst(tankG, F_('#8a5e3c'), tanks, ([x, y, z]) => { _o.position.set(x, y, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); });
  inst(new THREE.BoxGeometry(3, 1.4, 2.2), F_('#c4c8ce'), acs, ([x, y, z]) => { _o.position.set(x, y, z); _o.rotation.set(0, hash(x) * 3, 0); _o.scale.setScalar(1); });
  inst(new THREE.CylinderGeometry(0.4, 0.9, 1, 6).translate(0, 0.5, 0), F_('#d8dade', { metalness: 0.6, roughness: 0.3 }), ants, ([x, y, z, h]) => { _o.position.set(x, y, z); _o.rotation.set(0, 0, 0); _o.scale.set(1, h, 1); });
  inst(new THREE.ConeGeometry(0.7, 1, 4).translate(0, 0.5, 0), F_('#c8b48a', { metalness: 0.5, roughness: 0.3 }), crowns, ([x, y, z, w, d, h]) => { _o.position.set(x, y, z); _o.rotation.set(0, Math.PI / 4, 0); _o.scale.set(w, h, d); });
  inst(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.3) }), reds, ([x, y, z]) => { _o.position.set(x, y, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); });
  // Central Park: thousands of trees; the avenues: cars + yellow cabs
  const trees = []; for (let k = 0; k < 4200; k++) trees.push([100 + (hash(k * 1.3) - 0.5) * 780, -4600 + 3100 * hash(k * 2.7), 5 + 5 * hash(k * 3.1)]);
  inst(new THREE.IcosahedronGeometry(1, 0).translate(0, 1.4, 0), F_('#4a7a34'), trees, ([x, z, s2]) => { _o.position.set(x, 0, z); _o.rotation.set(0, hash(x) * 3, 0); _o.scale.set(s2, s2 * 0.9, s2); });
  const cars = [], cabs = []; for (let k = 0; k < 6000; k++) { const ax = (Math.floor(hash(k * 1.7) * 22) - 11) * 140 + (hash(k * 3) < 0.5 ? -3 : 3), z = -6000 + 13000 * hash(k * 5.3); (hash(k * 7) < 0.35 ? cabs : cars).push([ax, z]); }
  inst(new THREE.BoxGeometry(1.9, 1.4, 4.4).translate(0, 0.7, 0), F_('#f2c42a', { roughness: 0.4 }), cabs, ([x, z]) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); });
  inst(new THREE.BoxGeometry(1.9, 1.4, 4.4).translate(0, 0.7, 0), F_('#3a3e48', { roughness: 0.4 }), cars, ([x, z]) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); });
  // the hero's rooftop: a water tower + AC units on a 160 m tower near the park's south end
  CT.roofY = 160; const rt = new THREE.Group(); bx(46, 160, 40, '#c8a888', 0, 80, 0, rt); bx(46.4, 1.0, 40.4, '#8a7a6a', 0, 160.5, 0, rt);
  const wt = new THREE.Group(); for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) bx(0.3, 5, 0.3, '#5a4a3a', x, 2.5, z, wt); const tank = mesh(new THREE.CylinderGeometry(2.8, 2.8, 5, 18), F_('#9a6a44')); tank.position.y = 7.5; wt.add(tank); const cone = mesh(new THREE.ConeGeometry(3.0, 2, 18), F_('#5a4030')); cone.position.y = 11; wt.add(cone); wt.position.set(-12, 161, -8); rt.add(wt);
  for (let k = 0; k < 5; k++) bx(3, 1.6, 2.2, '#b8bcc4', 6 + (k % 3) * 4.5, 161.8, 6 + Math.floor(k / 3) * 5, rt); rt.position.set(840, 0, -2800); sc.add(rt); CT.roof = rt;
  // the office tower with an open window on floor 30 (the latte)
  const of = new THREE.Group(); bx(50, 220, 40, '#a8b8c8', 0, 110, 0, of); const room = new THREE.Group(); bx(10, 0.2, 6, '#8a8a92', 0, 0, 0, room); bx(10, 3.2, 0.2, '#e8e8ec', 0, 1.6, -3, room); bx(4, 0.8, 1.6, '#c8b8a0', 0, 0.75, -1.5, room);
  const mon = bx(1.2, 0.7, 0.06, '#1a1a22', 0, 1.6, -2.0, room); room.position.set(0, 102, 20.3); of.add(room); { const ot = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fffbe8'; for (let x = 20; x < w; x += 90) g.fillRect(x, 10, 60, 8); g.fillStyle = '#c8c2b8'; g.fillRect(0, 150, w, 106);
    for (let x = 10; x < w; x += 120) { g.fillStyle = '#b89a78'; g.fillRect(x, 140, 90, 14); g.fillStyle = '#2a2a30'; g.fillRect(x + 25, 100, 40, 32); g.fillStyle = '#5a9ad8'; g.fillRect(x + 28, 103, 34, 26); g.fillStyle = '#3a8a4a'; g.beginPath(); g.arc(x + 100, 120, 18, 0, 6.3); g.fill(); } });
  const op = mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: ot, color: new THREE.Color(1.1, 1.1, 1.1) }), false, false); op.position.set(0, 2.2, -0.25); room.add(op); }
  CT.officeRoom = room; of.position.set(-420, 0, -600); sc.add(of); CT.office = of;
  { const r0 = seed; seed = 5150; const p = makePerson(rnd, { top: '#f4f4f0', longSleeve: true }); seed = r0; room.add(p.outer); p.outer.position.set(0.4, 0.95 + 0.1, 0.6); poseIdle(p, 0, 0); CT.worker = p; }
  // pigeons: 30 birds (body + 2 flapping wings)
  CT.birds = Array.from({ length: 30 }, (_, k) => { const g = new THREE.Group(), gm = F_(k % 5 ? '#8a8e9a' : '#6a6e7a'); const b = mesh(new THREE.SphereGeometry(0.16, 8, 6), gm); b.scale.set(1, 0.9, 1.7); g.add(b); const hd = mesh(new THREE.SphereGeometry(0.09, 8, 6), F_('#5a6a7a')); hd.position.set(0, 0.08, -0.26); g.add(hd);
    const beak = mesh(new THREE.ConeGeometry(0.025, 0.07, 4), F_('#e8a040')); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.07, -0.36); g.add(beak); const wings = []; for (const s2 of [-1, 1]) { const w = new THREE.Group(); const wm = mesh(new THREE.BoxGeometry(0.42, 0.02, 0.2), gm); wm.position.x = s2 * 0.21; w.add(wm); w.position.x = s2 * 0.1; g.add(w); wings.push(w); } g.userData.w = wings; g.scale.setScalar(0.6); sc.add(g); return g; });
  // the airliner (white, wings, tail, windows), a long way bigger than you
  const pl = new THREE.Group(), white = F_('#eef2f6', { roughness: 0.4 }); const fus = mesh(new THREE.CylinderGeometry(2.0, 2.0, 60, 16), white); fus.rotation.z = Math.PI / 2; pl.add(fus); const nose = mesh(new THREE.SphereGeometry(2.0, 14, 10), white); nose.scale.set(2.2, 1, 1); nose.position.x = 30; pl.add(nose);
  const wing = mesh(new THREE.BoxGeometry(10, 0.5, 64), white); wing.position.set(2, -0.6, 0); wing.rotation.y = 0.25; pl.add(wing); const tl = mesh(new THREE.BoxGeometry(6, 9, 0.5), F_('#2a5ad8')); tl.position.set(-27, 5, 0); pl.add(tl); const hs = mesh(new THREE.BoxGeometry(5, 0.4, 20), white); hs.position.set(-27, 1, 0); pl.add(hs);
  bx(56, 0.9, 4.1, '#2a5ad8', 0, -0.6, 0, pl); for (let k = 0; k < 34; k++) for (const s2 of [-1, 1]) bx(0.6, 0.5, 0.05, '#1a2230', -20 + k * 1.3, 0.7, s2 * 2.0, pl); for (const s2 of [-1, 1]) { const en = mesh(new THREE.CylinderGeometry(1.2, 1.1, 4.4, 14), F_('#d8dce0')); en.rotation.z = Math.PI / 2; en.position.set(4, -2.0, s2 * 9); pl.add(en); }
  CT.plane = pl; sc.add(pl); }
function updateCity(t, cam) { towerDay.uniforms.uCam.value.copy(cam.position); groundDay.uniforms.uCam.value.copy(cam.position); groundDay.uniforms.uT.value = t; }
// the flight path: P(t) in the city, your body pointing along the velocity
function flyPath(t) { const k = clamp((t - OUT) / (COFFEE - OUT), 0, 1); const z = lerp(-1200, -900, k) - 900 * Math.sin(k * 2.2), x = 160 - 600 * k + 120 * Math.sin(k * 7), y = lerp(170, 520, Math.min(1, k * 1.6)) + 20 * Math.sin(k * 11); return V3(x, y, z); }
// ---------- 3) THE BACKYARD POOL: a lawn, a fence, a house, the neighbors on loungers ----------
const YARD = mkSet({ top: '#6aa0e0', bot: '#f8d8b0', fog: 0xf0d8b8, near: 40, far: 300, hemi: [0xfff0e0, 0x6a7050, 1.1], sun: [0xffd8a8, 2.8, V3(8, 10, 6)], shadow: 14 });
const YD = {}; { const sc = YARD.sc; gplane(sc, 200, 200, '#6aa04a', 0, 0); const deck = bx(9, 0.1, 7, '#e8dcc4', 0, 0.05, 0, sc);
  const wm = new THREE.MeshStandardMaterial({ color: '#4ac0e8', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88 }); YD.water = mesh(new THREE.PlaneGeometry(6, 3.6, 40, 24), wm, false, true); YD.water.rotation.x = -Math.PI / 2; YD.water.position.set(0, 0.2, 0); sc.add(YD.water); YD.w0 = YD.water.geometry.attributes.position.array.slice();
  bx(6.2, 0.12, 0.12, '#f4f4f0', 0, 0.12, 1.85, sc); bx(6.2, 0.12, 0.12, '#f4f4f0', 0, 0.12, -1.85, sc); bx(0.12, 0.12, 3.8, '#f4f4f0', 3.05, 0.12, 0, sc); bx(0.12, 0.12, 3.8, '#f4f4f0', -3.05, 0.12, 0, sc);
  const house = new THREE.Group(); bx(12, 6, 8, '#f2e4cc', 0, 3, 0, house); const roof = mesh(new THREE.ConeGeometry(8.6, 3, 4), F_('#8a4a3a')); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.7); roof.position.y = 7.5; house.add(roof); house.position.set(0, 0, -12); sc.add(house);
  for (let x = -15; x <= 15; x += 1.2) bx(0.1, 1.6, 0.1, '#f4f4f0', x, 0.8, 7, sc); bx(30, 0.1, 0.06, '#f4f4f0', 0, 1.4, 7, sc);
  YD.ppl = [-2.8, 2.8].map((x, i) => { const l = new THREE.Group(); bx(0.7, 0.3, 1.9, i ? '#e8463a' : '#2a6ad8', 0, 0.3, 0, l); l.position.set(x, 0, 3.0); sc.add(l); const r0 = seed; seed = 9100 + i; const p = makePerson(rnd, { shorts: true, longSleeve: false }); seed = r0; sc.add(p.outer); p.outer.position.set(x, 0.5, 3.0); p.outer.rotation.y = Math.PI; poseSit(p); return p; });
  YD.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.8, 2.0) }), 400); YD.drops.frustumCulled = false; sc.add(YD.drops); }
function updateYard(t) { const pos = YD.water.geometry.attributes.position, a = pos.array, w0 = YD.w0, s0 = POOL + 1.9; for (let k = 0; k < a.length; k += 3) { const x = w0[k], y = w0[k + 1], r = Math.hypot(x, y); a[k + 2] = 0.02 * Math.sin(x * 3 + t * 2) + (t > s0 ? 0.18 * Math.exp(-(t - s0) * 0.8) * Math.sin(r * 5 - (t - s0) * 9) * Math.exp(-r * 0.4) : 0); } pos.needsUpdate = true; YD.water.geometry.computeVertexNormals();
  const u = t - s0; for (let k = 0; k < 400; k++) { const a2 = hash(k) * 6.28, v = 2 + 4 * hash(k * 3), q = u / 1.2; if (q > 0 && q < 1) { _o.position.set(Math.cos(a2) * v * 0.4 * q, 0.1 + v * q * 1.2 - 4.9 * q * q * 1.4, Math.sin(a2) * v * 0.4 * q); _o.scale.setScalar(1); } else { _o.position.set(0, -10, 0); _o.scale.setScalar(0.001); } _o.updateMatrix(); YD.drops.setMatrixAt(k, _o.matrix); } YD.drops.instanceMatrix.needsUpdate = true;
  YD.ppl.forEach((p, i) => { poseSit(p); if (t > s0 + 0.2) { p.arms.forEach(a2 => a2.rotation.set(-2.6, 0, i ? -0.4 : 0.4)); p.elbows.forEach(e => e.rotation.x = -0.4); } }); }
