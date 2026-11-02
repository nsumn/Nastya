// =================== BANPO HANGANG PARK AT DUSK (meters; +z = the south-bank park, river from z=-12 to z=-812, north bank beyond; west = -x) ===================
// The river can vanish: water plane hidden → the real bed shows (stone revetment slopes, mud, rocks, lost stuff), WATER_Y = -1.5, bed ~ -7.
const hw = new THREE.Scene();
const hCam = new THREE.PerspectiveCamera(38, W / H, 0.05, 40000); hw.add(hCam);
const WATER_Y = -1.5, BED_Y = -7.0, RIV_N = -812, RIV_S = -12, BR_X = -150;   // Banpo Bridge runs north at x = 120
hw.fog = new THREE.FogExp2('#9a7c8c', 0.00048);
// ---- dusk sky: deep blue zenith, pink-orange band low in the west, thin lit clouds ----
const SUN_DIR = V3(-0.93, 0.035, -0.36).normalize();   // sun just above the horizon, west-northwest (down the river)
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN_DIR }, uDark: { value: 0.3 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform vec3 uSun; uniform float uDark; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0); float sw=max(dot(normalize(vec3(d.x,0.0,d.z)),normalize(vec3(uSun.x,0.0,uSun.z))),0.0);
      vec3 zen=vec3(0.07,0.11,0.26), mid=vec3(0.22,0.27,0.52), horE=vec3(0.52,0.42,0.62), horW=vec3(1.45,0.62,0.30);
      vec3 hor=mix(horE, horW, pow(sw,2.2)); vec3 c=mix(hor, mid, smoothstep(0.0,0.22,y)); c=mix(c, zen, smoothstep(0.18,0.75,y));
      c+=vec3(1.2,0.55,0.25)*pow(sw,8.0)*exp(-y*14.0)*1.2;                      // glow around the set sun
      vec2 uv=d.xz/(d.y+0.08)*1.1; float cl=fbm(uv*vec2(0.6,2.2)+vec2(1.3,0.2)); cl=smoothstep(0.55,0.8,cl)*smoothstep(0.015,0.08,d.y)*(1.0-smoothstep(0.3,0.6,d.y));
      vec3 cc=mix(vec3(0.32,0.28,0.45), vec3(1.6,0.7,0.45), pow(sw,3.0)); c=mix(c, cc, cl*0.75);
      if(d.y<0.0) c=hor*0.6;
      c*=1.0-0.75*uDark; gl_FragColor=vec4(c,1.0); }` });
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), skyMat); skyDome.frustumCulled = false; skyDome.renderOrder = -10; hw.add(skyDome);
{ const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
  hw.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 1, 400).texture; hw.environmentIntensity = 0.45; }
const hSun = new THREE.DirectionalLight(0xff9a5c, 1.6); hSun.castShadow = true; hSun.shadow.mapSize.set(4096, 4096);
Object.assign(hSun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 200 }); hSun.shadow.bias = -0.0004; hSun.shadow.normalBias = 0.03; hSun.shadow.radius = 5;
hw.add(hSun, hSun.target);
function aimSun(x, z) { hSun.target.position.set(x, 0, z); hSun.position.set(x, 0, z).add(V3(SUN_DIR.x, 0.32, SUN_DIR.z).normalize().multiplyScalar(80)); }
aimSun(0, 4);
const hRim = new THREE.DirectionalLight(0xffa86a, 2.2); hw.add(hRim, hRim.target);
const hHemi = new THREE.HemisphereLight(0x6f84c8, 0x2a2428, 0.6); hw.add(hHemi);
// ---- textures ----
const grassTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4f7a36'; g.fillRect(0, 0, w, h); speckle(g, w, h, 90000, ['#3f6a2a', '#5e8a3e', '#6a9646', '#456f2e', '#577f37', '#7aa452', '#3a5f26'], 3);
  for (let i = 0; i < 1400; i++) { g.strokeStyle = pick(['rgba(130,170,80,.5)', 'rgba(40,70,30,.5)']); g.lineWidth = 1; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-2, 2), y - R(4, 9)); g.stroke(); } });
const paveTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#8a8580'; g.fillRect(0, 0, w, h); speckle(g, w, h, 12000, ['#7d7873', '#96918b', '#85807a'], 2); g.fillStyle = '#3d6fa8'; g.fillRect(0, h * 0.42, w, h * 0.16);   // blue bike lane
  g.fillStyle = 'rgba(240,240,230,.8)'; for (let x = 0; x < w; x += 64) g.fillRect(x, h * 0.49, 34, 3); });
const stoneTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6d675f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { const x = rnd() * w, y = rnd() * h, r = R(10, 26); g.fillStyle = pick(['#7a746b', '#5e5850', '#857e74', '#6a645b', '#4f4a44']); g.beginPath(); g.ellipse(x, y, r, r * R(0.6, 0.9), R(0, 3), 0, 7); g.fill(); g.strokeStyle = 'rgba(30,28,25,.55)'; g.lineWidth = 2; g.stroke(); } });
const mudTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#4a4034'; g.fillRect(0, 0, w, h); speckle(g, w, h, 60000, ['#3d342a', '#574b3d', '#625545', '#2f2820', '#6b6150'], 3);
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(120,130,140,.18)'; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, R(10, 40), R(4, 12), R(0, 3), 0, 7); g.fill(); }   // wet puddles (sky sheen)
  for (let i = 0; i < 260; i++) { g.fillStyle = pick(['#8a8378', '#6e675d', '#9a9284']); g.beginPath(); g.ellipse(rnd() * w, rnd() * h, R(2, 7), R(2, 5), R(0, 3), 0, 7); g.fill(); } });
function rep(t, x, y) { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; }
// ---- park ground, promenade with the bike lane, then the stone revetment slope down to the bed ----
const park = mesh(new THREE.PlaneGeometry(3000, 500), new THREE.MeshStandardMaterial({ map: rep(grassTex, 600, 100), roughness: 1, color: '#7d8a78' }), false, true); park.rotation.x = -Math.PI / 2; park.position.set(0, 0, 246); hw.add(park);
const pave = mesh(new THREE.PlaneGeometry(3000, 6), new THREE.MeshStandardMaterial({ map: rep(paveTex, 600, 1), roughness: 0.9 }), false, true); pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0.02, -6); hw.add(pave);
// riverbed as one displaced surface: revetment slopes on both banks (stones), mud in between with ridges and channels
const bedGeo = new THREE.PlaneGeometry(3000, 840, 300, 120); bedGeo.rotateX(-Math.PI / 2);
function bedMud(z) { return clamp((-18 - z) / 12, 0, 1) * clamp((z - (RIV_N + 12)) / 12, 0, 1); }   // 0 on the stone slopes, 1 on the mud
function bedHeight(x, z) { const s = clamp((-9 - z) / 9, 0, 1), nn = clamp((z - (RIV_N + 3)) / -9, 0, 1);
  let y = lerp(-0.2, BED_Y, smooth(0, 1, s)); y = lerp(y, -0.2, smooth(0, 1, nn));
  return y + bedMud(z) * (0.5 * Math.sin(x * 0.013 + z * 0.02) + 0.35 * Math.sin(x * 0.05 - z * 0.031) + 0.9 * Math.sin(z * 0.0075) - 0.6 + 0.12 * Math.sin(x * 0.3 + z * 0.4)); }
{ const P = bedGeo.attributes.position, col = [];
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i) - 412; P.setY(i, bedHeight(x, z)); P.setZ(i, z); const c = bedMud(z); col.push(c, c, c); }
  bedGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bedGeo.computeVertexNormals(); }
const bedMat = new THREE.MeshStandardMaterial({ map: rep(mudTex, 700, 196), roughness: 0.5, metalness: 0.05, envMapIntensity: 0.9, color: '#8a8278' });   // wet mud: shiny
bedMat.onBeforeCompile = (sh) => { sh.uniforms.tStone = { value: rep(stoneTex, 300, 80) };
  sh.fragmentShader = 'uniform sampler2D tStone;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    vec4 st = texture2D(tStone, vMapUv * vec2(0.43, 0.41)); vec3 macro = texture2D(map, vMapUv * 0.061).rgb; diffuseColor.rgb *= 0.55 + 0.9 * macro; diffuseColor.rgb = mix(st.rgb * vec3(0.95,0.93,0.9), diffuseColor.rgb, vColor.r); diffuseColor.rgb /= max(vColor.r * 0.0 + 1.0, 1.0);`).replace('#include <color_fragment>', ''); };
bedMat.vertexColors = true;
const bed = mesh(bedGeo, bedMat, false, true); hw.add(bed);
// the water: planar-reflecting surface (three.js Water) — hidden while the river is gone
const waterNormals = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = x / w * Math.PI * 2, b = y / h * Math.PI * 2;
  const nx = 0.5 * Math.sin(a * 3 + Math.sin(b * 2) * 1.5) + 0.3 * Math.sin(a * 7 + b * 5) + 0.2 * Math.sin(a * 13 - b * 11), ny = 0.5 * Math.cos(b * 4 + Math.sin(a * 3)) + 0.3 * Math.sin(b * 9 - a * 4) + 0.2 * Math.cos(b * 15 + a * 6);
  const i = (y * w + x) * 4; im.data[i] = 128 + nx * 60; im.data[i + 1] = 128 + ny * 60; im.data[i + 2] = 240; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
waterNormals.colorSpace = THREE.NoColorSpace; waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const river = new Water(new THREE.PlaneGeometry(3000, 800), { textureWidth: 1024, textureHeight: 1024, waterNormals, sunDirection: SUN_DIR.clone(), sunColor: 0xff9a5c, waterColor: 0x10203a, distortionScale: 0.7, fog: true, alpha: 1 });
river.material.uniforms.uHR = { value: -1 }; river.material.uniforms.uHC = { value: new THREE.Vector2(BR_X, -412) };
river.material.fragmentShader = river.material.fragmentShader.replace('void main() {', 'uniform float uHR; uniform vec2 uHC;\nvoid main() { if (uHR > 0.0 && distance(worldPosition.xz, uHC) < uHR) discard;');
river.rotation.x = -Math.PI / 2; river.position.set(0, WATER_Y, (RIV_N + RIV_S) / 2 + 0.0); river.material.uniforms.size.value = 1.4; hw.add(river);
// far water (beyond the detailed 3 km) so the river runs to the horizon
const riverFar = mesh(new THREE.PlaneGeometry(30000, 800), new THREE.MeshStandardMaterial({ color: '#1a2a44', roughness: 0.15, metalness: 0.6 }), false, false); riverFar.rotation.x = -Math.PI / 2; riverFar.position.set(0, WATER_Y - 0.05, (RIV_N + RIV_S) / 2); hw.add(riverFar);
const bedFar = mesh(new THREE.PlaneGeometry(30000, 800), new THREE.MeshStandardMaterial({ map: rep(mudTex, 1500, 40), roughness: 0.7 }), false, false); bedFar.rotation.x = -Math.PI / 2; bedFar.position.set(0, BED_Y - 2.6, (RIV_N + RIV_S) / 2); hw.add(bedFar);
const farGround = mesh(new THREE.PlaneGeometry(40000, 20000), M('#2c3426', { roughness: 1 }), false, false); farGround.rotation.x = -Math.PI / 2; farGround.position.set(0, -0.3, 10500); hw.add(farGround);
// ---- city lights: window textures with random lit windows (warm/cool), apartment slabs on the north bank ----
function windowsTex(cols, rows, lit, seedN) { seed = seedN; return canvasTex(cols * 8, rows * 8, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (rnd() < lit) { g.fillStyle = pick(['#ffd9a0', '#ffe8c4', '#fff4e0', '#cfe4ff', '#ffc98a']); g.fillRect(c * 8 + 1, r * 8 + 2, 6, 4); } }); }
const aptBase = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#4a4850'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = '#26282f'; g.fillRect(0, y + 2, w, 4); g.fillStyle = '#5a5860'; g.fillRect(0, y + 6, w, 1); } });
const nbank = new THREE.Group(); nbank.position.z = RIV_N; hw.add(nbank);
bx(30000, 8, 26, '#5d5a55', 0, 0.5, -13, nbank); bx(30000, 0.8, 22, '#3a3b3f', 0, 4.6, -14, nbank);   // embankment + Gangbyeon expressway
const city = new THREE.Group(); nbank.add(city);
{ seed = 7702; const wm = []; for (let k = 0; k < 6; k++) wm.push(new THREE.MeshStandardMaterial({ map: rep(aptBase, 6, 24), emissive: '#ffffff', emissiveMap: windowsTex(48, 24, R(0.25, 0.5), 300 + k), emissiveIntensity: 2.2, roughness: 0.8 }));
  const side = M('#7d7b77', { roughness: 0.9 });
  for (let row = 0; row < 8; row++) for (let i = 0; i < 46; i++) { seed = 9000 + row * 100 + i;
    const x = -6400 + i * 280 + R(-70, 70) + (row % 2) * 140, z = -80 - row * 190 + R(-30, 30), f = Math.round(R(14, 32)), wu = Math.round(R(5, 8)), w = wu * 9, h = f * 2.9;
    const b = mesh(BOX, [side, side, side, side, wm[(i + row) % 6], side], false, false); b.scale.set(w, h, 14); b.position.set(x, h / 2, z); b.rotation.y = R(-0.06, 0.06); city.add(b); } }
{ seed = 8803; const lm = []; for (let k = 0; k < 4; k++) lm.push(new THREE.MeshStandardMaterial({ color: '#2c2b33', roughness: 0.9, emissive: '#ffffff', emissiveMap: windowsTex(16, 10, R(0.3, 0.55), 900 + k), emissiveIntensity: 1.6 }));
  for (let i = 0; i < 900; i++) { const x = R(-7000, 7000), z = R(-2600, -60), h = R(8, 40) * (z < -1500 ? 1.6 : 1), w = R(12, 40); const b = mesh(BOX, lm[i % 4], false, false); b.scale.set(w, h, R(12, 30)); b.position.set(x, h / 2, z); city.add(b); } }
// south-bank city behind the park (Banpo apartments) + more bridges downstream (west) with lamp rows
{ seed = 8804; const lm = []; for (let k = 0; k < 4; k++) lm.push(new THREE.MeshStandardMaterial({ color: '#2c2b33', roughness: 0.9, emissive: '#ffffff', emissiveMap: windowsTex(24, 30, R(0.3, 0.55), 950 + k), emissiveIntensity: 1.6 }));
  for (let i = 0; i < 700; i++) { const x = R(-7000, 7000), z = R(320, 3000), h = R(30, 80), w = R(30, 70); const b = mesh(BOX, lm[i % 4], false, false); b.scale.set(w, h, R(12, 18)); b.position.set(x, h / 2, z); hw.add(b); } }
for (const bxp of [-1500, -2900, -4300, -5900]) { const g = grp(bxp, 0, 0, 0, hw); bx(22, 2.4, 860, '#5a5852', 0, 13, -412, g); for (let z = -40; z > -800; z -= 60) bx(4, 14, 4, '#4a4844', 0, 6, z, g);
  for (let z = 0; z > -820; z -= 25) for (const sx of [-1, 1]) bx(0.8, 0.4, 0.8, new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.4, 2.4) }), sx * 10, 19, z, g); }
// office towers + red aircraft-warning lights
const towerLights = [];
{ seed = 4411; for (let i = 0; i < 22; i++) { const h = R(70, 170), w = R(24, 40), m = new THREE.MeshStandardMaterial({ color: '#2a3442', roughness: 0.3, metalness: 0.6, emissive: '#ffffff', emissiveMap: windowsTex(12, 40, 0.55, 600 + i), emissiveIntensity: 1.8 });
  const x = R(-6000, 6000), z = R(-1600, -500), b = mesh(BOX, m, false, false); b.scale.set(w, h, w); b.position.set(x, h / 2, z); city.add(b);
  const rl = mesh(new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.4, 0.3) }), false, false); rl.position.set(x, h + 1, z); city.add(rl); towerLights.push(rl); } }
// expressway car lights: two streams (white heads, red tails)
const carHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.35, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 3.8) }), 700);
const carTails = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.35, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.25, 0.15) }), 700);
nbank.add(carHeads, carTails);
function carsAt(t) { const mm = new THREE.Matrix4(); for (let i = 0; i < 700; i++) { const x1 = wrapR(-7000 + i * 20 + hash(i) * 12 + t * 24, -7000, 7000), x2 = wrapR(7000 - i * 20 - hash(i + 9) * 12 - t * 22, -7000, 7000);
  mm.makeTranslation(x1, 5.3, -9); carHeads.setMatrixAt(i, mm); mm.makeTranslation(x2, 5.3, -19); carTails.setMatrixAt(i, mm); } carHeads.instanceMatrix.needsUpdate = carTails.instanceMatrix.needsUpdate = true; }
// Namsan + N Seoul Tower (lit), slightly left of the bridge behind the apartments
const namsan = new THREE.Group(); namsan.position.set(-420, 0, -3600); hw.add(namsan);
{ const g = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const r = 1 + 0.06 * Math.sin(x * 9 + z * 7) + 0.04 * Math.sin(x * 23 - z * 17); P.setXYZ(i, x * r, y, z * r); }
  g.computeVertexNormals(); const hill = mesh(g, M('#1d2a22', { roughness: 1 }), false, false); hill.scale.set(900, 262, 700); namsan.add(hill);
  const tw = new THREE.Group(); tw.position.y = 255; namsan.add(tw); const wht = new THREE.MeshStandardMaterial({ color: '#d8dce8', emissive: '#9fb6ff', emissiveIntensity: 0.9, roughness: 0.5 });
  const shaft = mesh(new THREE.CylinderGeometry(4.2, 6.5, 135, 24), wht, false, false); shaft.position.y = 67; tw.add(shaft);
  for (const [y, r, hh] of [[132, 15, 9], [143, 14, 8], [151, 11, 6]]) { const p = mesh(new THREE.CylinderGeometry(r, r * 0.92, hh, 32), y === 143 ? new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 2.2) }) : wht, false, false); p.position.y = y; tw.add(p); }
  const ant = mesh(new THREE.CylinderGeometry(1.2, 2.6, 82, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 0.6, 0.5) }), false, false); ant.position.y = 196; tw.add(ant); }
// 63 Building (Yeouido, 249 m) on the western horizon: golden glass catching the last of the sunset
const b63 = new THREE.Group(); b63.position.set(-5400, 0, -1100); hw.add(b63);
{ const gold = new THREE.MeshStandardMaterial({ color: '#e0b052', roughness: 0.12, metalness: 0.95, envMapIntensity: 2.2, emissive: '#ff9a40', emissiveIntensity: 0.35 });
  const prof = new THREE.Shape(); prof.moveTo(-36, 0); prof.lineTo(36, 0); prof.lineTo(36, 200); prof.lineTo(20, 235); prof.lineTo(-10, 249); prof.lineTo(-36, 249); prof.lineTo(-36, 0);
  const g = new THREE.ExtrudeGeometry(prof, { depth: 34, bevelEnabled: false }); g.translate(0, 0, -17); const m = mesh(g, gold, false, false); m.rotation.y = Math.PI / 2 - 0.3; b63.add(m); }
// Lotte World Tower far right (east), lit crown
const lotte = new THREE.Group(); lotte.position.set(2600, 0, -5200); hw.add(lotte);
{ const pts = []; for (let i = 0; i <= 24; i++) { const y = i / 24; pts.push(new THREE.Vector2(36 * (1 - 0.82 * Math.pow(y, 1.6)), y * 555)); }
  const g = new THREE.LatheGeometry(pts, 4); g.rotateY(Math.PI / 4); lotte.add(mesh(g, new THREE.MeshStandardMaterial({ color: '#3a4656', roughness: 0.2, metalness: 0.8, emissive: '#ffffff', emissiveMap: windowsTex(8, 90, 0.5, 77), emissiveIntensity: 1.5 }), false, false));
  const crown = mesh(new THREE.ConeGeometry(9, 60, 4, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 3.2, 3.6), transparent: true, opacity: 0.85 }), false, false); crown.position.y = 525; lotte.add(crown); }
// ---- Banpo Bridge: upper deck on piers, Jamsu Bridge low below (submerges in floods), LED strips; the Moonlight Rainbow Fountain from both deck edges ----
const bridge = new THREE.Group(); bridge.position.set(BR_X, 0, 0); hw.add(bridge);
const DECK_Y = 16.5;
{ const conc = M('#7f7d78', { roughness: 0.85 }), dark = M('#55534f', { roughness: 0.9 });
  bx(25, 2.6, 900, conc, 0, DECK_Y, -420, bridge); bx(25.6, 0.9, 900, M('#2e3440', { roughness: 0.5 }), 0, DECK_Y + 1.6, -420, bridge);
  bx(25.4, 0.35, 900, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.2, 2.6) }), 0, DECK_Y - 1.35, -420, bridge);   // blue LED strip under the deck edge
  for (let z = -40; z > -800; z -= 50) { for (const s of [-1, 1]) bx(3.2, DECK_Y - BED_Y, 3.2, conc, s * 7, (DECK_Y + BED_Y) / 2 - 1, z, bridge); bx(22, 2.2, 4, conc, 0, DECK_Y - 2.2, z, bridge); }
  bx(10, 1.0, 800, dark, 0, WATER_Y + 1.6, -412, bridge);   // Jamsu Bridge (low)
  for (let z = -20; z > -800; z -= 12) bx(1.2, WATER_Y + 1.1 - BED_Y, 1.2, dark, 0, (WATER_Y + 1.1 + BED_Y) / 2, z, bridge);
  bx(25, 2.6, 160, conc, 0, DECK_Y, 70, bridge); for (let z = 0; z < 150; z += 30) bx(3, DECK_Y, 3, conc, 0, DECK_Y / 2, z, bridge);
  // street lamps on the deck
  for (let z = 120; z > -820; z -= 30) for (const s of [-1, 1]) { bx(0.25, 6, 0.25, '#2a2c30', s * 12, DECK_Y + 4, z, bridge); bx(0.6, 0.25, 0.4, new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.6, 2.8) }), s * 11.6, DECK_Y + 7, z, bridge); } }
// fountain jets: one tube per nozzle, recomputed per frame (throw, how far down they fall, how much water is left); rainbow colour drifts along the bridge
const JET_N = 110, JET_SEG = 14, JET_SIDES = 5, JZ0 = -70, JZ1 = -640;
const jetGeo = new THREE.BufferGeometry(); const jetVerts = 2 * JET_N * (JET_SEG + 1) * JET_SIDES;
jetGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(jetVerts * 3), 3)); jetGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(jetVerts * 3), 3));
{ const idx = []; for (let j = 0; j < 2 * JET_N; j++) for (let s = 0; s < JET_SEG; s++) for (let k = 0; k < JET_SIDES; k++) { const b = (j * (JET_SEG + 1) + s) * JET_SIDES, k2 = (k + 1) % JET_SIDES;
  idx.push(b + k, b + JET_SIDES + k, b + k2, b + k2, b + JET_SIDES + k, b + JET_SIDES + k2); } jetGeo.setIndex(idx); }
const jetMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, side: THREE.DoubleSide });
const jets = new THREE.Mesh(jetGeo, jetMat); jets.frustumCulled = false; bridge.add(jets);
const mistTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const mist = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: mistTex, size: 11, vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
{ const n = 2 * JET_N * 3, p = new Float32Array(n * 3), c = new Float32Array(n * 3); mist.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); mist.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
mist.frustumCulled = false; bridge.add(mist);
const jetCol = new THREE.Color();
// throw = horizontal reach (m, real max 43), power 0..1 (pumps sucking air → 0), floor = y where the jets end (water surface or the bed)
function setJets(t, throwM = 30, power = 1, floorY = WATER_Y) {
  const P = jetGeo.attributes.position.array, C = jetGeo.attributes.color.array, MP = mist.geometry.attributes.position.array, MC = mist.geometry.attributes.color.array; let v = 0, mi = 0;
  for (let side = 0; side < 2; side++) { const sx = side ? 1 : -1;
    for (let j = 0; j < JET_N; j++) { const z = lerp(JZ0, JZ1, j / (JET_N - 1)), ph = hash(j * 3.3 + side), reach = throwM * power * (0.85 + 0.15 * ph) * (0.92 + 0.08 * Math.sin(t * 2.1 + j * 0.35)), x0 = sx * 12.8, y0 = DECK_Y - 1.0, drop = y0 - floorY, up = 6 * power;
      jetCol.setHSL(wrapR(j / JET_N * 2.2 + t * 0.05 + side * 0.3, 0, 1), 1.0, 0.5); const br = 1.1 * (0.4 + 0.6 * power);
      for (let s = 0; s <= JET_SEG; s++) { const u = s / JET_SEG, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u, r = (0.08 + 0.4 * u * u) * (0.5 + 0.5 * power);
        for (let k = 0; k < JET_SIDES; k++) { const a = k / JET_SIDES * Math.PI * 2; P[v * 3] = x + Math.cos(a) * r * 0.3; P[v * 3 + 1] = y + Math.sin(a) * r; P[v * 3 + 2] = z + Math.cos(a) * r; C[v * 3] = jetCol.r * br; C[v * 3 + 1] = jetCol.g * br; C[v * 3 + 2] = jetCol.b * br; v++; } }
      for (let m = 0; m < 3; m++) { const u = 0.55 + m * 0.2, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u; MP[mi * 3] = x; MP[mi * 3 + 1] = y; MP[mi * 3 + 2] = z + (m - 1) * 1.5; MC[mi * 3] = jetCol.r * power; MC[mi * 3 + 1] = jetCol.g * power; MC[mi * 3 + 2] = jetCol.b * power; mi++; } } }
  jetGeo.attributes.position.needsUpdate = jetGeo.attributes.color.needsUpdate = true; mist.geometry.attributes.position.needsUpdate = mist.geometry.attributes.color.needsUpdate = true; jetGeo.computeBoundingSphere(); }
// ---- Some Sevit floating islands (glowing domes) west of the bridge ----
{ for (const [x, z, s, c] of [[-215, -70, 0.8, '#ffc870'], [-245, -100, 0.65, '#8fc4ff'], [-195, -110, 0.55, '#ff9fcf']]) { const g = grp(x, WATER_Y, z, 0.4, hw);
  const dome = mesh(new THREE.SphereGeometry(16 * s, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1c1f28', emissive: c, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.9 }), false, false); dome.scale.set(1, 0.75, 0.7); g.add(dome);
  bx(36 * s, 1, 26 * s, '#2a2c33', 0, 0, 0, g); bx(36.4 * s, 0.25, 26.4 * s, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(4) }), 0, 0.6, 0, g); g.userData.float = true; } }
// ---- the Hangang cruise boat (lit) ----
const ferry = grp(-260, WATER_Y, -300, Math.PI / 2 + 0.15, hw);
{ const hull = new THREE.Shape(); hull.moveTo(-22, 0); hull.lineTo(18, 0); hull.quadraticCurveTo(24, 0, 26, 2.5); hull.lineTo(-23, 2.5); hull.lineTo(-22, 0);
  const hg = new THREE.ExtrudeGeometry(hull, { depth: 9, bevelEnabled: false }); hg.translate(0, -1.4, -4.5); ferry.add(mesh(hg, M('#e9e6df', { roughness: 0.5 })));
  bx(30, 2.6, 7.6, M('#1a2230', { roughness: 0.15, metalness: 0.6 }), -3, 2.4, 0, ferry); bx(30.4, 0.3, 8, M('#f0ede6'), -3, 3.8, 0, ferry); bx(16, 2.2, 6.6, M('#1a2230', { roughness: 0.15, metalness: 0.6 }), -6, 5.0, 0, ferry); bx(16.4, 0.3, 7, M('#f0ede6'), -6, 6.2, 0, ferry);
  for (const [y, len, x] of [[2.4, 29.6, -3], [5.0, 15.6, -6]]) for (const s of [-1, 1]) bx(len, 1.0, 0.1, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.6, 2.2) }), x, y, s * (y > 3 ? 3.32 : 3.82), ferry);
  bx(48, 0.25, 0.12, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 2.5, 5) }), 1, 1.0, 4.52, ferry); bx(48, 0.25, 0.12, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 2.5, 5) }), 1, 1.0, -4.52, ferry); }
// ---- the park: trees, lamps (with real point lights near the hero), shade tents, picnic mats, people ----
const treeTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2f4a26'; g.fillRect(0, 0, w, h); speckle(g, w, h, 12000, ['#263e1f', '#3a5a2e', '#456a34', '#203619', '#517a3a'], 5); });
const trunkM = M('#3d3128', { roughness: 0.95 }), leafM = new THREE.MeshStandardMaterial({ map: treeTex, roughness: 0.9 });
const treeParts = (() => { const parts = []; const tr = new THREE.CylinderGeometry(0.14, 0.22, 3.0, 7); tr.translate(0, 1.5, 0); parts.push([tr, 0]);
  for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(1, 2); const P = g.attributes.position; for (let j = 0; j < P.count; j++) { const v = V3(P.getX(j), P.getY(j), P.getZ(j)); const k = 1 + 0.14 * Math.sin(v.x * 5 + i) * Math.cos(v.z * 4 + v.y * 3); P.setXYZ(j, v.x * k, v.y * k, v.z * k); }
    g.computeVertexNormals(); const a = i / 6 * Math.PI * 2, r = i ? 0.9 : 0; g.scale(1.3, 1.1, 1.3); g.translate(Math.cos(a) * r, 3.7 + (i ? hash(i) * 0.8 : 1.0), Math.sin(a) * r); parts.push([g, 1]); } return parts; })();
function tree(x, z, s) { const g = grp(x, 0, z, hash(x * 1.3 + z) * 6, hw); g.scale.setScalar(s); for (const [geo, k] of treeParts) g.add(mesh(geo, k ? leafM : trunkM)); return g; }
seed = 515; for (let i = 0; i < 80; i++) { const x = -300 + i * 7.5 + R(-2, 2), z = R(16, 22) + (i % 3) * 8; if (Math.abs(x - BR_X) < 22 || Math.abs(x - 2) < 14) continue; tree(x, z, R(1.0, 1.6)); }
const lampHead = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 5.2, 3.0) });
for (let i = 0; i < 40; i++) { const x = -300 + i * 16; if (Math.abs(x - BR_X) < 18) continue; const l = grp(x, 0, -2.6, 0, hw); bx(0.1, 4.4, 0.1, '#25282c', 0, 2.2, 0, l); const hd = mesh(new THREE.SphereGeometry(0.22, 12, 8), lampHead, false, false); hd.position.set(0, 4.5, 0); l.add(hd); }
for (const x of [-12, 4, 20]) { const pl = new THREE.PointLight(0xffc488, 30, 22, 1.6); pl.position.set(x, 4.3, -2.6); hw.add(pl); }
// shade tents (그늘막): small dome tents in bright colours
function tent(x, z, ry, c) { const g = grp(x, 0, z, ry, hw); const t = mesh(new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI, 0, Math.PI / 2), M(c, { side: THREE.DoubleSide, roughness: 0.8 })); t.scale.set(1.1, 0.95, 1.3); g.add(t); return g; }
const MAT_COLS = ['#3b78c4', '#e9c23c', '#e46a5a', '#5aa070', '#f0f0ec', '#8a6ad0'];
const matTex = (c) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 8; i += 2) { g.fillRect(i * 16, 0, 16, h); g.fillRect(0, i * 16, w, 16); } });
function picnicMat(x, z, ry, c, s = 1.8) { const m = mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: matTex(c), roughness: 0.9 }), false, true); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.015, z); hw.add(m); return m; }
// food: fried-chicken box (open, drumsticks), beer cans, ramyeon cups, a phone
function chickenBox() { const g = new THREE.Group(); const box = M('#f2e6cc', { roughness: 0.8 }); bx(0.34, 0.02, 0.26, box, 0, 0.01, 0, g); for (const [x, z, w, d] of [[0, 0.13, 0.34, 0.01], [0, -0.13, 0.34, 0.01], [0.17, 0, 0.01, 0.26], [-0.17, 0, 0.01, 0.26]]) bx(w, 0.07, d, box, x, 0.04, z, g);
  const lid = bx(0.34, 0.01, 0.26, M('#d8402e', { roughness: 0.7 }), 0, 0.1, -0.2, g); lid.rotation.x = -1.1;
  for (let i = 0; i < 9; i++) { const c = mesh(new THREE.SphereGeometry(0.04, 7, 5), M(pick(['#b8641e', '#c9782a', '#a8541a']), { roughness: 0.6 })); c.scale.set(1.3, 0.75, 0.9); c.position.set(R(-0.12, 0.12), 0.05, R(-0.09, 0.09)); c.rotation.y = R(0, 3); g.add(c); }
  return g; }
function beerCan(c = '#d9b84a') { const g = new THREE.Group(); const can = mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 14), M(c, { roughness: 0.25, metalness: 0.7 })); can.position.y = 0.06; g.add(can); const top = mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.01, 14), M('#c9ccd0', { roughness: 0.2, metalness: 0.9 })); top.position.y = 0.125; g.add(top); return g; }
function ramenCup() { const g = new THREE.Group(); const cup = mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.1, 18, 1, true), M('#f3efe6', { side: THREE.DoubleSide, roughness: 0.6 })); cup.position.y = 0.05; g.add(cup);
  const band = mesh(new THREE.CylinderGeometry(0.0555, 0.05, 0.035, 18, 1, true), M('#d02a24', { roughness: 0.6 })); band.position.y = 0.07; g.add(band);
  const soup = mesh(new THREE.CircleGeometry(0.052, 18), M('#c8542a', { roughness: 0.25 })); soup.rotation.x = -Math.PI / 2; soup.position.y = 0.085; g.add(soup); return g; }
function phoneMesh() { const g = new THREE.Group(); bx(0.075, 0.155, 0.009, M('#1a1c20', { roughness: 0.3, metalness: 0.5 }), 0, 0, 0, g); const sc = bx(0.068, 0.145, 0.002, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.5, 1.8) }), 0, 0, 0.0055, g); g.userData.screen = sc; return g; }
// people around (blocky humans, sitting on mats), seeded
const CROWD = [];
{ seed = 3311; const tops = ['#e8e4dc', '#2f3a4a', '#c45a4a', '#f2c84a', '#5a7a9a', '#3a6a4a', '#d8a0b0', '#7a5a9a'], skins = ['#f1c9a5', '#e9b98f', '#eec29c', '#d9a37a'];
  for (let i = 0; i < 26; i++) { const x = R(-70, 90), z = R(1.5, 15); if (Math.abs(x) < 7 && z < 9) continue; if (Math.abs(x - BR_X) < 16) continue;
    picnicMat(x, z, R(-0.3, 0.3), pick(MAT_COLS), R(1.6, 2.2)); const nP = 1 + (rnd() < 0.7 ? 1 : 0) + (rnd() < 0.2 ? 1 : 0);
    for (let k = 0; k < nP; k++) { const P = makeBlock({ head: 'human', body: 'human', skin: pick(skins), hair: pick(['#151215', '#2a1e18', '#3a2a20']), browCol: '#1a1416', top: pick(tops), outfit: 'tee_kr', collar: 1.556, jeans: rnd() < 0.6, bottom: pick(['#2f3d5c', '#3a3a40', '#c8c0b0']), shoe: '#f4f4f4', hairStyle: pick(['twoblock', 'short', 'fringe']), headMesh: 'head_kr', kr: true, headS: 0.88, h: R(0.92, 1.0) });
      P.outer.position.set(x + (k - 0.5) * 0.8, 0.17, z + R(-0.3, 0.3)); P.outer.rotation.y = R(-0.5, 0.5) + Math.PI + (rnd() < 0.5 ? 0 : 0.6); hw.add(P.outer); CROWD.push(P); }
    if (rnd() < 0.6) { const cb = chickenBox(); cb.position.set(x + R(-0.3, 0.3), 0.02, z + R(-0.3, 0.3)); hw.add(cb); }
    if (rnd() < 0.4) tent(x + R(1.5, 2.5), z + R(1, 2), R(0, 6), pick(['#3a8ad0', '#f0a030', '#e04a5a', '#4ab07a'])); } }
function sitPose(P, t, ph) { P.legs[0].rotation.set(-1.35, 0, -0.12); P.legs[1].rotation.set(-1.35, 0, 0.12); P.knees[0].rotation.x = 0.35; P.knees[1].rotation.x = 0.35;
  P.arms[0].rotation.set(0.35, 0, -0.06); P.arms[1].rotation.set(0.35, 0, 0.06); P.elbows[0].rotation.x = -0.2; P.elbows[1].rotation.x = -0.2; P.torso.rotation.x = 0; P.head.rotation.x = 0.03 * Math.sin(t * 0.9 + ph); }
// bikes (Seoul public bike "따릉이": green frame) along the promenade
function bike(x, z, ry) { const g = grp(x, 0, z, ry, hw); const fr = M('#3fae5a', { roughness: 0.5, metalness: 0.3 }), tire = M('#1a1a1a');
  for (const s of [-0.5, 0.5]) { const w = mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 20), tire); w.position.set(s, 0.36, 0); g.add(w); }
  const b1 = bx(1.0, 0.05, 0.05, fr, 0, 0.6, 0, g); b1.rotation.z = 0.1; const b2 = bx(0.05, 0.5, 0.05, fr, -0.15, 0.6, 0, g); b2.rotation.z = 0.3; bx(0.22, 0.06, 0.1, '#222', -0.25, 0.86, 0, g); bx(0.05, 0.05, 0.5, '#555', 0.45, 0.95, 0, g); bx(0.2, 0.15, 0.25, fr, 0.55, 0.85, 0, g); return g; }
seed = 66; for (let i = 0; i < 8; i++) bike(R(-40, 60), -4.5 + R(-0.4, 0.4), R(-0.2, 0.2));
// ---- the hero (Korean faceted human, dark-green tee) on his own mat, front-row by the river ----
const hero = makeBlock({ head: 'human', body: 'human', skin: '#f1c9a5', hair: '#151215', browCol: '#1a1416', top: '#2f5a40', outfit: 'tee_kr', collar: 1.556, jeans: true, bottom: '#2f3d5c', shoe: '#f4f4f4', hairStyle: 'twoblock', headMesh: 'head_kr', kr: true, browW: 1.25, headS: 0.88 });
hw.add(hero.outer);
const HERO_MAT = V3(0, 0, -0.4); picnicMat(HERO_MAT.x, HERO_MAT.z, 0.1, '#3b78c4', 2.0);
const heroFood = new THREE.Group(); heroFood.position.copy(HERO_MAT); hw.add(heroFood);
{ const cb = chickenBox(); cb.position.set(0.35, 0.02, -0.2); heroFood.add(cb); const b1 = beerCan(); b1.position.set(-0.45, 0.02, -0.3); heroFood.add(b1); const b2 = beerCan('#3a6fb8'); b2.position.set(-0.3, 0.02, -0.5); heroFood.add(b2);
  const r = ramenCup(); r.position.set(0.6, 0.02, 0.25); heroFood.add(r); }
const heroPhone = phoneMesh(); hw.add(heroPhone);

// ---- what lies on the bed (only visible when the river is gone): puddles mirroring the sky, rocks, lost bikes, shopping carts, tyres, a scooter, fish ----
const bedStuff = new THREE.Group(); hw.add(bedStuff); bedStuff.visible = false;
const puddleM = new THREE.MeshStandardMaterial({ color: '#3a4256', roughness: 0.03, metalness: 0.95, envMapIntensity: 1.8, transparent: true, depthWrite: false, alphaMap: canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31); gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#ccc'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) });
{ seed = 1201; for (let i = 0; i < 260; i++) { const near = i < 140, x = near ? R(-80, 80) : R(-1400, 1400), z = near ? R(-110, -22) : R(-790, -30), r = R(1.5, near ? 6 : 18);
    const p = mesh(new THREE.CircleGeometry(1, 20), puddleM, false, false); p.rotation.x = -Math.PI / 2; p.scale.set(r, r * R(0.4, 0.8), 1); p.rotation.z = R(0, 3); p.position.set(x, bedHeight(x, z) + 0.04, z); bedStuff.add(p); }
  const rockG = new THREE.DodecahedronGeometry(1, 0), rockM = M('#7a746a', { roughness: 0.45, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockG, rockM, 900), mm = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 900; i++) { const x = i < 600 ? R(-90, 90) : R(-1400, 1400), z = i < 600 ? R(-120, -16) : R(-800, -16), sc = R(0.15, 0.9);
    q.setFromEuler(new THREE.Euler(R(0, 3), R(0, 3), R(0, 3))); mm.compose(V3(x, bedHeight(x, z) + sc * 0.3, z), q, V3(sc * R(0.8, 1.4), sc * 0.6, sc)); rocks.setMatrixAt(i, mm); }
  rocks.frustumCulled = false; bedStuff.add(rocks);
  const rust = M('#7a4a2a', { roughness: 0.8 }), chrome = M('#9aa0a6', { roughness: 0.35, metalness: 0.8 }), tyreM = M('#1c1c1c', { roughness: 0.9 });
  function lay(o, x, z, ry, tilt = 0) { o.position.set(x, bedHeight(x, z) + 0.05, z); o.rotation.set(tilt, ry, 0); bedStuff.add(o); return o; }
  for (let i = 0; i < 18; i++) { const b = bike(0, 0, 0); hw.remove(b); const x = R(-70, 70), z = R(-100, -24); lay(b, x, z, R(0, 6)); b.rotation.z = Math.PI / 2 - 0.15; b.position.y += 0.05; b.traverse(o => { if (o.material && o.material.color) o.material = o.material.clone(), o.material.color.multiplyScalar(0.55); }); }
  for (let i = 0; i < 7; i++) { const c = new THREE.Group(); bx(0.9, 0.6, 0.55, chrome, 0, 0.6, 0, c).material = new THREE.MeshStandardMaterial({ color: '#8a9096', roughness: 0.4, metalness: 0.8, wireframe: true }); bx(0.9, 0.04, 0.55, chrome, 0, 0.3, 0, c); for (const [a, b] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) { const w = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), tyreM); w.rotation.x = Math.PI / 2; w.position.set(a, 0.06, b); c.add(w); }
    lay(c, R(-60, 60), R(-90, -30), R(0, 6), 1.3); }
  for (let i = 0; i < 25; i++) { const t = mesh(new THREE.TorusGeometry(0.32, 0.12, 8, 18), tyreM); t.rotation.x = Math.PI / 2; lay(t, R(-90, 90), R(-110, -22), 0, Math.PI / 2 + R(-0.3, 0.3)); }
  for (let i = 0; i < 40; i++) { const can = beerCan(pick(['#d9b84a', '#3a6fb8', '#c43a2a', '#2f8a4a'])); lay(can, R(-40, 40), R(-60, -20), R(0, 6), Math.PI / 2); } }
// fish: silver bodies flopping (each its own phase); shown on the bed after the water goes
const FISH = [];
{ seed = 1301; const bodyG = new THREE.SphereGeometry(1, 12, 8), tailG = new THREE.ConeGeometry(0.5, 0.9, 4); tailG.rotateZ(Math.PI / 2);
  for (let i = 0; i < 60; i++) { const g = new THREE.Group(), sc = R(0.1, 0.19), m = new THREE.MeshStandardMaterial({ color: pick(['#c8d0d6', '#a8b2b8', '#d8d2b8', '#9eaaa0']), roughness: 0.35, metalness: 0.2, emissive: '#30343a', emissiveIntensity: 0.5, flatShading: true });
    const b = mesh(bodyG, m); b.scale.set(1, 0.36, 0.16); g.add(b); const eye = mesh(new THREE.SphereGeometry(0.07, 6, 4), M('#111')); eye.position.set(0.68, 0.08, 0.13); g.add(eye); const fin = mesh(tailG, m); fin.scale.set(0.35, 0.4, 0.12); fin.position.set(0.05, 0.36, 0); fin.rotation.z = -Math.PI / 2 + 0.6; g.add(fin); const tl = mesh(tailG, m); tl.position.x = -1.2; tl.scale.set(0.8, 0.9, 0.3); g.add(tl); g.scale.setScalar(sc);
    const x = i < 40 ? R(-50, 50) : R(-300, 300), z = i < 40 ? R(-90, -22) : R(-500, -22); g.position.set(x, bedHeight(x, z) + 0.08 * sc / 0.3, z); g.rotation.y = R(0, 6); g.userData = { ph: R(0, 6), sp: R(6, 11), y0: g.position.y }; bedStuff.add(g); FISH.push(g); } }
function fishAt(t) { for (const f of FISH) { const u = f.userData, k = Math.max(0, Math.sin(t * u.sp + u.ph)); f.rotation.x = Math.PI / 2 + 0.45 * Math.sin(t * u.sp * 0.7 + u.ph); f.rotation.z = 0.25 * Math.sin(t * u.sp + u.ph); f.position.y = u.y0 + 0.1 * k; } }
