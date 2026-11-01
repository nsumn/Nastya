// =================== SETS: night Manhattan (procedural lit windows on ~15,000 towers), the sky (clouds lit by the city, an airliner), space (night Earth with
// city lights, the ISS), the glass cabin (POV frame + your hand; and the cabin seen from outside), the parachute ===================
const F_ = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...e });
const _o = new THREE.Object3D(), _c = new THREE.Color();
const GLSL_HASH = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }`;
const FOG_NIGHT = new THREE.Color('#0d1424');

// ---------- 1) MANHATTAN AT NIGHT (meters; x = east, z = south; you start at Times Square = origin; One WTC downtown at z ≈ +6.5 km) ----------
const CITY = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(70, W / H, 0.05, 60000) };
const towerMat = new THREE.ShaderMaterial({ uniforms: { uFog: { value: FOG_NIGHT }, uCam: { value: new THREE.Vector3() }, uT: { value: 0 } },
  vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed;
    void main(){ mat4 im = instanceMatrix; vec4 w = modelMatrix * im * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix * im) * normal);
      vC = vec3(1.0); \n#ifdef USE_INSTANCING_COLOR\n vC = instanceColor; \n#endif\n vSeed = im[3].xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uFog, uCam; uniform float uT; varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec2 vSeed; ${GLSL_HASH}
    void main(){ vec3 n = normalize(vN); float side = 1.0 - step(0.5, abs(n.y)); vec3 col = vC * (0.05 + 0.10 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.3))), 0.0));
      if (side > 0.5) { float u = abs(n.x) > 0.5 ? vW.z : vW.x; vec2 g = vec2(u / 3.0, vW.y / 3.6); vec2 c = floor(g), f = fract(g);
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.78);
        float r = h21(c + vSeed * 0.37), lit = step(r, 0.42 + 0.25 * h21(floor(vSeed / 40.0)));
        vec3 warm = mix(vec3(1.0, 0.72, 0.38), vec3(0.75, 0.88, 1.0), step(0.78, h21(c * 1.7 + vSeed)));
        col = mix(col, mix(vec3(0.03, 0.045, 0.07), warm * (1.6 + 1.6 * h21(c + 3.1)), lit), win); }
      else col += vec3(0.02);
      float d = length(vW - uCam); float fg = 1.0 - exp(-d * 0.00011); col = mix(col, uFog, clamp(fg, 0.0, 0.92));
      gl_FragColor = vec4(col, 1.0); }` });
const groundMat = new THREE.ShaderMaterial({ uniforms: { uFog: { value: FOG_NIGHT }, uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uScale: { value: 1 } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uFog, uCam; uniform float uT, uScale; varying vec3 vW; ${GLSL_HASH}
    void main(){ vec2 p = vW.xz; float water = (abs(p.x + 150.0 * sin(p.y * 0.0004)) > 1750.0 && abs(p.x) < 2350.0) || p.y > 7600.0 ? 1.0 : 0.0;
      // avenues (along z) every 140 m, streets (along x) every 70 m: glowing with headlights / streetlights
      float av = 1.0 - smoothstep(0.0, 3.0, abs(mod(p.x + 70.0, 140.0) - 70.0)), st = 1.0 - smoothstep(0.0, 2.0, abs(mod(p.y + 35.0, 70.0) - 35.0));
      float cars = step(0.55, fract(p.y * 0.05 - uT * 0.6 + h21(vec2(floor(p.x / 140.0), 1.0)))) * av;
      float suburb = smoothstep(2300.0, 2600.0, abs(p.x)), dens = mix(1.0, 0.45 + 0.4 * vn(p * 0.002), suburb);
      vec3 col = vec3(0.025, 0.03, 0.04) + vec3(1.0, 0.7, 0.35) * (av * 1.6 + st * 0.9 + cars * 2.2) * dens;
      col = mix(col, vec3(0.01, 0.02, 0.04) + 0.08 * vec3(1.0, 0.75, 0.4) * vn(p * 0.05 + uT), water);
      float d = length(vW - uCam); col = mix(col, uFog, clamp(1.0 - exp(-d * 0.00011), 0.0, 0.92)); gl_FragColor = vec4(col, 1.0); }` });
const CT = {}; {
  const sc = CITY.sc; sc.background = FOG_NIGHT;
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), groundMat); gnd.rotation.x = -Math.PI / 2; sc.add(gnd);
  sc.add(new THREE.HemisphereLight(0x8aa0ff, 0x2a2018, 0.5)); const moon = new THREE.DirectionalLight(0xb8c8ff, 0.6); moon.position.set(-300, 800, 200); sc.add(moon);
  const T = []; const towerAt = (x, z, w, d, h) => T.push([x, z, w, d, h]);
  for (let bx2 = -10; bx2 <= 10; bx2++) for (let bz = -140; bz <= 108; bz++) { const cx = bx2 * 140, cz = bz * 70, mid = Math.exp(-((cz / 1800) ** 2)), down = Math.exp(-(((cz - 6200) / 900) ** 2));
    if (Math.abs(cx) < 15 && Math.abs(cz) < 120) continue;   // Times Square: open plaza around the cabin
    const k = (bx2 + 20) * 1000 + bz; const n = 2 + ((hash(k) * 3) | 0);
    for (let q = 0; q < n; q++) { const w = 22 + 30 * hash(k * 3 + q), d = 18 + 22 * hash(k * 5 + q), x = cx + (q - (n - 1) / 2) * (112 / n), z = cz + (hash(k * 7 + q) - 0.5) * 18;
      const h = 18 + (40 + 300 * mid + 260 * down) * Math.pow(hash(k * 11 + q), 2.2) + 30 * hash(k * 13 + q); towerAt(x, z, Math.min(w, 112 / n - 6), Math.min(d, 52), h); } }
  for (let k = 0; k < 2600; k++) { const side = k % 2 ? 1 : -1; towerAt(side * (2600 + 9000 * hash(k)), -12000 + 22000 * hash(k * 3), 20 + 25 * hash(k * 5), 20 + 25 * hash(k * 7), 12 + 50 * hash(k * 9) ** 2); }   // NJ + Brooklyn/Queens
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerMat, T.length + 2);
  T.forEach(([x, z, w, d, h], i) => { _o.position.set(x, 0, z); _o.rotation.set(0, 0, 0); _o.scale.set(w, h, d); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); im.setColorAt(i, _c.setHSL(0.08 + 0.5 * hash(i), 0.15, 0.25 + 0.3 * hash(i * 3))); });
  // One World Trade Center: 541 m with the spire
  _o.position.set(-600, 0, 6500); _o.scale.set(62, 417, 62); _o.updateMatrix(); im.setMatrixAt(T.length, _o.matrix); im.setColorAt(T.length, _c.set('#8ab0d0'));
  _o.position.set(-600, 417, 6500); _o.scale.set(3, 124, 3); _o.updateMatrix(); im.setMatrixAt(T.length + 1, _o.matrix); im.setColorAt(T.length + 1, _c.set('#c8d0d8')); sc.add(im);
  CT.wtcTip = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.5, 3) })); CT.wtcTip.position.set(-600, 541, 6500); sc.add(CT.wtcTip);
  // Times Square billboards around the plaza (bright emissive → bloom)
  const ADS = [['#ff1a5a', '#ffd040', 'SODA'], ['#1a8aff', '#ffffff', 'NEW PHONE'], ['#ffc020', '#1a1a1a', 'BURGERS'], ['#7a2aff', '#fff', 'MUSICAL'], ['#00c870', '#fff', 'SALE 50%'], ['#ff6a1a', '#fff', 'SNEAKERS'], ['#111', '#ff2a6a', 'TONIGHT'], ['#e0e0f0', '#e8202a', 'NEWS']];
  const adTex = ADS.map(([bg, fg, txt]) => canvasTex(256, 384, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText(txt.split(' ')[0], w / 2, h * 0.45); if (txt.includes(' ')) { g.font = '800 40px Inter'; g.fillText(txt.split(' ')[1], w / 2, h * 0.58); }
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.beginPath(); g.arc(w / 2, h * 0.78, 30, 0, 6.3); g.fillStyle = fg; g.fill(); }));
  for (let k = 0; k < 34; k++) { const side = k % 2 ? 1 : -1, z = -60 + (k >> 1) * 7.5, wd = 6 + 6 * hash(k * 3), ht = wd * 1.5, m = new THREE.MeshBasicMaterial({ map: adTex[k % ADS.length], color: new THREE.Color(1.5, 1.5, 1.5), side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), m); b.position.set(side * (16 + 1.5 * hash(k * 5)), 8 + 30 * hash(k * 7), z); b.rotation.y = -side * Math.PI / 2; sc.add(b); }
  CT.heroLight = new THREE.PointLight(0xffd0a0, 60, 40, 1.5); sc.add(CT.heroLight);   // the glow of the ads on you as you land
  // the elevator rail rising from the plaza
  CT.rail = new THREE.Group(); for (const x of [-1.3, 1.3]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6000, 0.25), F_('#5a6070', { metalness: 0.6 })); r.position.set(x, 3000, -1.4); CT.rail.add(r); } sc.add(CT.rail);
  CT.lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.6, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.8) }), 400); for (let k = 0; k < 400; k++) { _o.position.set(-1.3, 15 * k, -1.4); _o.scale.setScalar(1); _o.updateMatrix(); CT.lamps.setMatrixAt(k, _o.matrix); } sc.add(CT.lamps); }
function updateCity(t, cam) { towerMat.uniforms.uCam.value.copy(cam.position); groundMat.uniforms.uCam.value.copy(cam.position); groundMat.uniforms.uT.value = t; CT.wtcTip.material.color.setScalar(2 + 2 * (Math.sin(t * 4) > 0 ? 1 : 0)); }

// ---------- 2) THE SKY (meters, 1.5–19 km): the lit city far below (same ground shader, wider), clouds lit orange from below, a dark sky + stars, an airliner ----------
const SKY = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(70, W / H, 1, 400000) };
const skyDome = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uAlt: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uAlt; varying vec3 vD; ${GLSL_HASH}
    void main(){ float h = clamp(vD.y, -0.2, 1.0), k = clamp(uAlt / 20000.0, 0.0, 1.0);
      vec3 top = mix(vec3(0.03, 0.05, 0.12), vec3(0.0, 0.0, 0.01), k), hor = mix(vec3(0.35, 0.22, 0.25), vec3(0.08, 0.12, 0.35), k);
      vec3 c = mix(hor, top, smoothstep(-0.05, 0.45, h)); vec2 sp = vD.xz / max(0.15, vD.y + 0.3) * 300.0; float st = step(0.997, h21(floor(sp))) * smoothstep(0.0, 0.3, h) * (0.3 + k);
      gl_FragColor = vec4(c + vec3(st) * 2.0, 1.0); }` });
const skyGround = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uCam; varying vec3 vW; ${GLSL_HASH}
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){ vec2 p = vW.xz; float ocean = smoothstep(-2000.0, 2000.0, p.x * 0.9 + p.y * 0.45 - 16000.0);
      float metro = exp(-length(p) / 22000.0) * 1.6 + smoothstep(0.55, 0.85, fbm(p * 0.00006)) * 0.8;
      vec2 c = floor(p / 55.0), f = fract(p / 55.0) - 0.5 + 0.3 * (vec2(h21(c * 2.1), h21(c * 3.7)) - 0.5); float spark = step(1.0 - 0.3 * metro, h21(c)) * (0.6 + h21(c * 1.3)) * (1.0 - smoothstep(0.03, 0.09, length(f)));
      float hw = 0.0; for (int i = 0; i < 5; i++) { float a = float(i) * 1.1 + 0.3; vec2 d = vec2(cos(a), sin(a)); hw += 1.0 - smoothstep(0.0, 60.0, abs(dot(p, vec2(-d.y, d.x)) - float(i - 2) * 9000.0)); }
      vec3 col = vec3(0.012, 0.016, 0.025) + vec3(1.0, 0.62, 0.3) * (spark * 3.0 * metro + hw * 0.5 * min(metro + 0.2, 1.0) + metro * 0.06);
      col = mix(col, vec3(0.005, 0.01, 0.025), ocean); float d = length(vW - uCam); col = mix(col, vec3(0.02, 0.03, 0.07), clamp(1.0 - exp(-d * 0.000005), 0.0, 0.8)); gl_FragColor = vec4(col, 1.0); }` });
const SK = {}; {
  const sc = SKY.sc; sc.add(new THREE.Mesh(new THREE.SphereGeometry(300000, 32, 16), skyDome));
  const g = new THREE.Mesh(new THREE.PlaneGeometry(600000, 600000), skyGround); g.rotation.x = -Math.PI / 2; sc.add(g);
  sc.add(new THREE.HemisphereLight(0x9ab0ff, 0x6a4020, 0.9));
  // clouds: big soft puffs between 1.6 and 2.6 km, warm underneath from the city glow
  const ct = canvasTex(128, 128, (g2, w, h) => { const gr = g2.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); });
  SK.clouds = []; for (let k = 0; k < 700; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, color: new THREE.Color().setRGB(0.42 + 0.2 * hash(k), 0.36 + 0.12 * hash(k), 0.42 + 0.08 * hash(k * 3)), opacity: 0.75 }));
    const r = 400 + 9000 * Math.sqrt(hash(k * 3)), a = hash(k * 5) * 6.283; s.position.set(Math.cos(a) * r, 1700 + 900 * hash(k * 7), Math.sin(a) * r); s.scale.setScalar(500 + 900 * hash(k * 9)); sc.add(s); SK.clouds.push(s); }
  // the airliner: fuselage, wings, tail, lit windows, blinking lights
  const pl = new THREE.Group(), white = F_('#e8ecf0', { roughness: 0.4 }); const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 60, 14), white); fus.rotation.z = Math.PI / 2; pl.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.0, 12, 8), white); nose.scale.set(2.2, 1, 1); nose.position.x = 30; pl.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 64), white); wing.position.set(2, -0.6, 0); wing.rotation.y = 0.25; pl.add(wing); const tl = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 0.5), white); tl.position.set(-27, 5, 0); pl.add(tl);
  const hs = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 20), white); hs.position.set(-27, 1, 0); pl.add(hs);
  for (let k = 0; k < 36; k++) for (const s of [-1, 1]) { const wdw = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.3), side: THREE.DoubleSide })); wdw.position.set(-22 + k * 1.3, 0.6, s * 2.02); pl.add(wdw); }
  SK.navR = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.3) })); SK.navR.position.set(4, -0.6, -33); pl.add(SK.navR);
  SK.navG = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 4, 0.5) })); SK.navG.position.set(4, -0.6, 33); pl.add(SK.navG);
  SK.plane = pl; sc.add(pl);
  SK.frost = null; }
function updateSky(t, cam, alt) { skyGround.uniforms.uCam.value.copy(cam.position); skyDome.uniforms.uAlt.value = alt;
  const blink = Math.sin(t * 6) > 0.6 ? 1 : 0.15; SK.navR.material.color.setRGB(4 * blink, 0.3, 0.3); SK.navG.material.color.setRGB(0.3, 4 * blink, 0.5);
  const u = (t - JET) / 6; SK.plane.position.set(-420 + 840 * u, 10668 - 6, -260 + 30 * u); SK.plane.rotation.set(0, 0.12, 0); }

// ---------- 3) SPACE (km): the night Earth with city lights, a blue atmosphere rim and a thin dawn on the limb; stars; the ISS ----------
const SPACE = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(70, W / H, 0.0005, 200000) };
const R_E = 6371, EARTH = new THREE.Group(); SPACE.sc.add(EARTH); EARTH.position.set(0, -R_E, 0); SPACE.sc.background = new THREE.Color('#010205');
async function buildEarth() { const topo = await (await fetch('node_modules/world-atlas/land-110m.json')).json(), land = topojson.feature(topo, topo.objects.land), us = await (await fetch('data/us_lights.json')).json();
  const W2 = 4096, H2 = 2048, P = (lo, la) => [(lo + 180) / 360 * W2, (90 - la) / 180 * H2];
  const mask = document.createElement('canvas'); mask.width = W2; mask.height = H2; const mg = mask.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, W2, H2); mg.fillStyle = '#fff';
  for (const f of land.features) for (const poly of (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) { mg.beginPath(); for (const ring of poly) ring.forEach(([lo, la], i) => { const [x, y] = P(lo, la); if (i) mg.lineTo(x, y); else mg.moveTo(x, y); }); mg.fill(); }
  const md = mg.getImageData(0, 0, W2, H2).data;
  const tex = canvasTex(W2, H2, (g, w, h) => { g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#141c24'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#060c1c'; g.fillRect(0, 0, w, h);
    const dot = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,190,110,${a})`); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
    for (const [lo, la] of us) { const [x, y] = P(lo, la); dot(x, y, 1.0, 0.35); }
    let n = 0; for (let k = 0; k < 400000 && n < 26000; k++) { const x = (hash(k * 1.3) * W2) | 0, y = (H2 * (0.18 + 0.5 * hash(k * 2.7))) | 0; if (md[(y * W2 + x) * 4] > 128 && hash(k * 9.1) < 0.35) { dot(x, y, 0.9, 0.25); n++; } } });
  const mat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: tex }, uSun: { value: new THREE.Vector3(-0.2, -0.15, -1).normalize() } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 c = texture2D(uTex, vUv).rgb; vec3 lights = max(c - vec3(0.06, 0.09, 0.14), 0.0) * vec3(1.6, 1.15, 0.7); float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
        float dawn = pow(max(dot(vN, -uSun), 0.0), 2.0) * rim; vec3 col = c * 0.6 + lights + vec3(0.1, 0.25, 0.7) * rim * 0.9 + vec3(1.2, 0.55, 0.2) * dawn * 1.6;
        gl_FragColor = vec4(col, 1.0); }` });
  const e = new THREE.Mesh(new THREE.SphereGeometry(R_E, 160, 96), mat); EARTH.add(e);
  const lo = -74.0 * Math.PI / 180, la = 40.75 * Math.PI / 180, phi = lo + Math.PI, th = Math.PI / 2 - la, dir = V3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
  e.quaternion.setFromUnitVectors(dir, V3(0, 1, 0));   // New York at the top, right under the cabin
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R_E * 1.012, 96, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float r = pow(1.0 - abs(dot(vN, vV)), 6.0); gl_FragColor = vec4(vec3(0.25, 0.5, 1.2) * r * 1.4, r); }' })); EARTH.add(atm);
  const n = 4000, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(hash(i) - 0.5, hash(i * 3) - 0.5, hash(i * 7) - 0.5).normalize().multiplyScalar(150000); p.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3)); SPACE.sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, sizeAttenuation: false })));
  SPACE.sc.add(new THREE.AmbientLight(0x8890a0, 1.2)); const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(2, 1, -4); SPACE.sc.add(sun); }
// the ISS (km units: ~0.109 km wide): truss, 8 solar wings, modules, radiators
const ISSM = new THREE.Group(); { const k = 0.001, gold = new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.6, roughness: 0.35, emissive: '#3a2a10' }), white = F_('#e8ecf0', { roughness: 0.5 });
  const tr = new THREE.Mesh(new THREE.BoxGeometry(109 * k, 3 * k, 3 * k), white); ISSM.add(tr);
  for (const x of [-48, -36, 36, 48]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(11 * k, 0.2 * k, 34 * k), gold); w.position.set(x * k, 0, s * 19 * k); ISSM.add(w); }
  for (const [x, z, l] of [[0, 0, 40], [0, 12, 14], [6, -10, 12]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * k, 2.2 * k, l * k, 12), white); m.rotation.x = Math.PI / 2; m.position.set(x * k, -3 * k, z * k); ISSM.add(m); }
  for (const x of [-20, 20]) { const r = new THREE.Mesh(new THREE.BoxGeometry(6 * k, 0.2 * k, 14 * k), white); r.position.set(x * k, 0, -10 * k); ISSM.add(r); } SPACE.sc.add(ISSM); }
function updateSpace(t, cam) { const u = (t - ISS - 1.4) / 1.6; ISSM.visible = t >= ISS && t < ISS + 6; ISSM.position.set(-0.4 + 0.8 * u, 400 - 0.03, -0.6); ISSM.rotation.set(0.2, 0.3, 0.1); }

// ---------- 4) THE CABIN: a POV frame + your hand (an overlay scene drawn on top of every POV shot), and the cabin seen from outside (meters) ----------
const POVS = new THREE.Scene(), povCam = new THREE.PerspectiveCamera(70, W / H, 0.02, 50); POVS.add(povCam);
POVS.add(new THREE.HemisphereLight(0xcfd8ff, 0x3a3028, 1.1)); const povKey = new THREE.DirectionalLight(0xffe0c0, 1.6); povKey.position.set(1, 2, 1); POVS.add(povKey);
const POV = {}; { const metal = F_('#2a2e36', { metalness: 0.7, roughness: 0.35 });
  for (const x of [-0.235, 0.235]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2, 0.03), metal); b.position.set(x, 0, -0.6); povCam.add(b); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.03), metal); top.position.set(0, 0.405, -0.6); povCam.add(top);
  POV.rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 10), F_('#c8ccd4', { metalness: 0.9, roughness: 0.2 })); POV.rail.rotation.z = Math.PI / 2; POV.rail.position.set(0, -0.33, -0.58); povCam.add(POV.rail);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.65, 0.8), transparent: true, opacity: 0.06, depthWrite: false })); glass.position.set(0, 0, -0.62); povCam.add(glass); POV.glass = glass;
  POV.frost = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), new THREE.MeshBasicMaterial({ map: canvasTex(256, 384, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const ex = hash(i * 5) < 0.5 ? hash(i * 11) * 40 : w - hash(i * 11) * 40, x = hash(i * 13) < 0.6 ? ex : hash(i * 5) * w, y = hash(i * 7) < 0.6 ? h - hash(i * 17) * 60 : hash(i * 7) * h; if (Math.abs(x - w / 2) < 70 && Math.abs(y - h / 2) < 120) continue; g.strokeStyle = `rgba(225,242,255,${0.2 + 0.35 * hash(i)})`; g.lineWidth = 0.6 + 0.8 * hash(i * 3); g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 3; s++) g.lineTo(x + (hash(i + s) - 0.5) * 14, y + (hash(i * 3 + s) - 0.5) * 14); g.stroke(); } }), transparent: true, opacity: 0, depthWrite: false })); POV.frost.position.set(0, 0, -0.61); POV.frost.scale.set(0.24, 0.27, 1); povCam.add(POV.frost);
  // your hand on the rail (charcoal sleeve, as the hero's tee)
  const arm = new THREE.Group(); const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 4, 10), F_('#4b4f57')); sleeve.rotation.x = Math.PI / 2 - 0.5; sleeve.position.set(0, 0.05, 0.22); arm.add(sleeve);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), F_('#e9b98f', { flatShading: false })); fist.scale.set(1.15, 0.85, 0.9); arm.add(fist);
  arm.position.set(0.13, -0.32, -0.56); arm.rotation.set(0.15, -0.35, 0); arm.scale.setScalar(0.55); povCam.add(arm); POV.arm = arm;
  POV.mug = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 14), F_('#e8603a')); m.position.y = 0.055; POV.mug.add(m); } POV.mug.position.set(-0.08, -0.36, -0.62); POV.mug.scale.setScalar(0.7); povCam.add(POV.mug); }
// the cabin from outside (meters), with you inside, hanging on its cable over the night Earth
const CAB = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(50, W / H, 0.05, 5000) };
const CB = {}; { const sc = CAB.sc; sc.add(new THREE.HemisphereLight(0xcfd8ff, 0x302820, 1.2)); const k2 = new THREE.DirectionalLight(0xfff0e0, 2.0); k2.position.set(-4, 3, 5); sc.add(k2);
  const metal = F_('#3a3e48', { metalness: 0.7, roughness: 0.3 }), box = new THREE.Group(); sc.add(box); CB.box = box;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(0.08, 2.6, 0.08, metal, x, 1.3, z, box); for (const y of [0, 2.6]) { bx(2.08, 0.1, 0.08, metal, 0, y, -1, box); bx(2.08, 0.1, 0.08, metal, 0, y, 1, box); bx(0.08, 0.1, 2.08, metal, -1, y, 0, box); bx(0.08, 0.1, 2.08, metal, 1, y, 0, box); }
  bx(2, 0.06, 2, '#4a4e58', 0, 0, 0, box); bx(2, 0.06, 2, '#4a4e58', 0, 2.6, 0, box);
  const gl = new THREE.MeshStandardMaterial({ color: '#a8c8e8', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false });
  CB.doorL = bx(1.0, 2.5, 0.02, gl, -0.5, 1.3, 1, box); CB.doorR = bx(1.0, 2.5, 0.02, gl, 0.5, 1.3, 1, box); bx(2, 2.5, 0.02, gl, 0, 1.3, -1, box); bx(0.02, 2.5, 2, gl, -1, 1.3, 0, box); bx(0.02, 2.5, 2, gl, 1, 1.3, 0, box);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4000, 6), metal); cab.position.set(0, 2000, -1.2); sc.add(cab); const cab2 = cab.clone(); cab2.position.set(0, -2000 + 0.02, -1.2); sc.add(cab2); CB.cables = [cab, cab2];
  CB.mug = new THREE.Group(); { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 14), F_('#e8603a')); m.position.y = 0.055; CB.mug.add(m); } CB.mug.position.set(0.4, 0.03, -0.4); box.add(CB.mug);
  // the parachute (canopy + lines), the pack, re-entry glow
  const canopy = new THREE.Group(); for (let k = 0; k < 12; k++) { const seg = new THREE.Mesh(new THREE.SphereGeometry(3.2, 4, 6, k * Math.PI / 6, Math.PI / 6, 0, Math.PI / 2.4), F_(k % 2 ? '#f4f4f0' : '#e8463a', { side: THREE.DoubleSide })); canopy.add(seg); }
  canopy.scale.set(1, 0.55, 1); CB.canopy = canopy; sc.add(canopy); CB.lines = new THREE.Group(); for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 4.2, 3), F_('#d8d8d8')); const a = k * Math.PI / 4; l.position.set(Math.cos(a) * 1.4, 2.1, Math.sin(a) * 1.4); l.rotation.set(Math.sin(a) * 0.33, 0, -Math.cos(a) * 0.33); CB.lines.add(l); } sc.add(CB.lines);
  CB.pack = bx(0.36, 0.48, 0.18, '#2a2a30', 0, 0, 0, sc);
  CB.glow = Array.from({ length: 40 }, (_, k) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: new THREE.Color(1.6, 0.45 + 0.35 * hash(k), 0.12), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sc.add(s); return s; }); }
