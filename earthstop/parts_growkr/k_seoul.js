// =================== SEOUL (meters; camera side = +z = Banpo Hangang Park on the south bank, looking north across the Han River) ===================
// River z -12 … -1000 (≈1 km wide), Banpo Bridge on the right running north, the north bank: Gangbyeon expressway + white apartment slabs,
// Namsan with N Seoul Tower behind them; 63 Building far left (west), Lotte World Tower far right (stylised positions so all three read in one frame).
const kw = new THREE.Scene();
const kCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 60000);
kw.add(kCam);
const SKY_TOP = new THREE.Color('#4f86c9'), SKY_HOR = new THREE.Color('#d6e4ee');
kw.fog = new THREE.Fog('#c9d9e6', 900, 16000);
// ---- sky dome: gradient + soft cumulus (fbm), sun glow ----
const SUN_DIR = V3(-0.45, 0.42, 0.79).normalize();   // late-afternoon sun from the south-west = behind-left of the camera
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: SKY_TOP }, uHor: { value: SKY_HOR }, uSun: { value: SUN_DIR }, uSpace: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform vec3 uTop, uHor, uSun; uniform float uSpace; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0);
      vec3 c=mix(uHor, uTop, pow(y,0.55));
      vec2 uv=d.xz/(d.y+0.12)*1.6; float cl=fbm(uv+vec2(3.1,1.7)); cl=smoothstep(0.52,0.78,cl)*smoothstep(0.02,0.18,d.y)*(1.0-smoothstep(0.55,0.95,d.y));
      float lit=0.82+0.18*fbm(uv*1.7+vec2(0.4,0.0)); c=mix(c, vec3(1.0,0.99,0.97)*lit, cl*0.85);
      float s=max(dot(d,uSun),0.0); c+=vec3(1.0,0.92,0.78)*(pow(s,64.0)*0.6+pow(s,6.0)*0.10);
      if(d.y<0.0) c=mix(uHor, uHor*0.92, smoothstep(0.0,-0.2,d.y));
      // space (high shots): fade to black with stars
      float st=step(0.9985,h(floor(d.xz*900.0/(abs(d.y)+0.6))))*uSpace; c=mix(c, vec3(0.01,0.012,0.03)+st, uSpace);
      gl_FragColor=vec4(c,1.0); }` });
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(50000, 48, 24), skyMat); skyDome.frustumCulled = false; skyDome.renderOrder = -10; kw.add(skyDome);
// image-based light from the sky (reflections on water/glass + soft ambient)
const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
kw.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 1, 400).texture; kw.environmentIntensity = 0.55;
const kSun = new THREE.DirectionalLight(0xfff1dc, 3.0); kSun.position.copy(SUN_DIR).multiplyScalar(60); kSun.castShadow = true; kSun.shadow.mapSize.set(4096, 4096);
Object.assign(kSun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 160 }); kSun.shadow.bias = -0.0004; kSun.shadow.normalBias = 0.03; kSun.shadow.radius = 4;
kw.add(kSun, kSun.target);
kw.add(new THREE.HemisphereLight(0xcfe2ff, 0x6a7a52, 0.55));
// ---- textures ----
const grassTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6f9a4a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 26000, ['#5e8a3c', '#7eaa54', '#86b25c', '#64903f', '#729e48', '#8fb862'], 3); }, [1, 1]);
const paveTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c9c4ba'; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, ['#bdb8ae', '#d3cec4', '#b4afa5'], 2); g.strokeStyle = 'rgba(90,85,78,.35)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, [1, 1]);
function rep(t, x, y) { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; }
// apartment facade: one unit = balcony glass band per floor (repeat = units × floors)
const aptFront = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h); g.fillStyle = '#6f8698'; g.fillRect(8, 14, w - 16, 34); g.fillStyle = '#9fb3c2'; g.fillRect(8, 14, w - 16, 6);
  g.fillStyle = '#d9d6cf'; g.fillRect(w / 2 - 2, 14, 4, 34); g.fillStyle = '#f6f5f1'; g.fillRect(0, 48, w, 5); }, [1, 1]);
const aptSide = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#e4e1da'; g.fillRect(0, 0, w, h); g.fillStyle = '#7b8a96'; g.fillRect(26, 22, 12, 22); }, [1, 1]);
function aptNumber(num) { return canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#e8e5de'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d8a95'; for (let y = 140; y < h; y += 26) g.fillRect(112, y, 32, 14);
  g.fillStyle = '#2f5d8c'; g.font = 'bold 74px "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.fillText(num, w / 2, 96); g.fillStyle = '#3f8f6a'; g.fillRect(40, 112, w - 80, 8); }); }
const officeTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#7f95a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#a9bccb'; g.fillRect(3, 4, w - 6, 26); g.fillStyle = '#5f7488'; g.fillRect(0, 30, w, 4); }, [1, 1]);
// ---- ground: park (z > -12), promenade, stone revetment; the river; far bank ----
const parkMat = new THREE.MeshStandardMaterial({ map: rep(grassTex, 120, 120), roughness: 1 });
const park = mesh(new THREE.PlaneGeometry(6000, 600), parkMat, false, true); park.rotation.x = -Math.PI / 2; park.position.set(0, 0, 288); kw.add(park);
const pave = mesh(new THREE.PlaneGeometry(6000, 5), new THREE.MeshStandardMaterial({ map: rep(paveTex, 1500, 1.25), roughness: 0.95 }), false, true); pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0.02, -8.5); kw.add(pave);
const revet = mesh(new THREE.BoxGeometry(6000, 1.6, 2.2), M('#a7a196', { roughness: 1 }), false, true); revet.position.set(0, -0.6, -11.6); revet.rotation.x = 0.5; kw.add(revet);
// river: planar-reflecting water (three.js Water with a canvas normal map)
const waterNormals = canvasTex(256, 256, (g, w, h) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = x / w * Math.PI * 2, b = y / h * Math.PI * 2;
  const nx = 0.5 * Math.sin(a * 3 + Math.sin(b * 2) * 1.5) + 0.3 * Math.sin(a * 7 + b * 5) + 0.2 * Math.sin(a * 13 - b * 11), ny = 0.5 * Math.cos(b * 4 + Math.sin(a * 3)) + 0.3 * Math.sin(b * 9 - a * 4) + 0.2 * Math.cos(b * 15 + a * 6);
  const i = (y * w + x) * 4; im.data[i] = 128 + nx * 60; im.data[i + 1] = 128 + ny * 60; im.data[i + 2] = 240; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
waterNormals.colorSpace = THREE.NoColorSpace; waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
const river = new Water(new THREE.PlaneGeometry(14000, 1000), { textureWidth: 1024, textureHeight: 1024, waterNormals, sunDirection: SUN_DIR.clone(), sunColor: 0xfff1dc, waterColor: 0x2c5566, distortionScale: 1.2, fog: true, alpha: 1 });
river.rotation.x = -Math.PI / 2; river.position.set(0, -1.0, -505); kw.add(river);
river.material.uniforms.size.value = 6;
// north bank: embankment + expressway, then the apartment district
const nb = new THREE.Group(); nb.position.z = -1000; kw.add(nb);
bx(14000, 8, 30, '#b7b1a6', 0, 3, -15, nb); bx(14000, 1.2, 24, '#6c6e72', 0, 7.6, -16, nb); bx(14000, 2, 40, '#7aa05a', 0, 0, -50, nb);
const city = new THREE.Group(); nb.add(city);
const aptFrontMats = {}, aptNums = {};
function apartment(x, z, wUnits, floors, ry, num) {
  const w = wUnits * 9, h = floors * 2.9, d = 14, k = wUnits + '_' + floors;
  if (!aptFrontMats[k]) aptFrontMats[k] = new THREE.MeshStandardMaterial({ map: rep(aptFront, wUnits, floors), roughness: 0.75 });
  if (!aptNums[num]) aptNums[num] = new THREE.MeshStandardMaterial({ map: aptNumber(num), roughness: 0.85 });
  const side = aptNums[num], roof = M('#9a9892'), back = M('#d8d5ce', { roughness: 0.9 });
  const b = mesh(BOX, [side, side, roof, roof, aptFrontMats[k], back]); b.scale.set(w, h, d); b.position.set(x, h / 2 + 2, z); b.rotation.y = ry; city.add(b);
  const top = mesh(BOX, M('#cfccc4')); top.scale.set(w * 0.25, 5, d * 0.8); top.position.set(x, h + 4.5, z); top.rotation.y = ry; city.add(top);   // rooftop core
  return b; }
{ let n = 101; seed = 9101;
  for (let row = 0; row < 7; row++) for (let i = 0; i < 26; i++) {
    const x = -3600 + i * 280 + R(-60, 60) + (row % 2) * 140, z = -110 - row * 170 + R(-30, 30);
    if (Math.abs(x - 330) < 260 && row > 3) continue;     // leave Namsan's foot open
    apartment(x, z, Math.round(R(4, 8)), Math.round(R(15, 30) - row), R(-0.08, 0.08), String(n)); n = n >= 115 ? 101 : n + 1; } }
// a few office towers in the gaps (glassy)
for (let i = 0; i < 14; i++) { const h = R(60, 140), w = R(25, 40); const m = new THREE.MeshStandardMaterial({ map: rep(officeTex, Math.round(w / 4), Math.round(h / 4)), roughness: 0.35, metalness: 0.3 });
  const b = mesh(BOX, m); b.scale.set(w, h, w); b.position.set(R(-3000, 3000), h / 2 + 2, R(-1300, -900)); city.add(b); }
// Namsan (262 m) + N Seoul Tower (236.7 m) — behind the apartments
const namsan = new THREE.Group(); namsan.position.set(330, 0, -3400); kw.add(namsan);
{ const g = new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2); const P = g.attributes.position, col = [];
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); const r = 1 + 0.06 * Math.sin(x * 9 + z * 7) + 0.04 * Math.sin(x * 23 - z * 17); P.setXYZ(i, x * r, y * (1 + 0.1 * Math.sin(z * 5)), z * r);
    const c = new THREE.Color().setHSL(0.27 + 0.05 * hash(i), 0.38, 0.22 + 0.1 * hash(i * 3.3)); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const hill = mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), false, false); hill.scale.set(900, 262, 700); namsan.add(hill);
  const tw = new THREE.Group(); tw.position.y = 255; namsan.add(tw); const wht = M('#f1f1ee', { roughness: 0.5 });
  const shaft = mesh(new THREE.CylinderGeometry(4.2, 6.5, 135, 24), wht); shaft.position.y = 67; tw.add(shaft);
  for (const [y, r, hh] of [[132, 15, 9], [143, 14, 8], [151, 11, 6]]) { const p = mesh(new THREE.CylinderGeometry(r, r * 0.92, hh, 32), y === 143 ? new THREE.MeshStandardMaterial({ color: '#7b8fa3', roughness: 0.2, metalness: 0.4 }) : wht); p.position.y = y; tw.add(p); }
  const ant = mesh(new THREE.CylinderGeometry(1.2, 2.6, 82, 12), M('#e04a3a', { roughness: 0.6 })); ant.position.y = 196; tw.add(ant);
  for (let i = 0; i < 4; i++) { const b = mesh(new THREE.CylinderGeometry(2.7, 2.7, 4, 12), wht); b.position.y = 165 + i * 18; tw.add(b); } }
// 63 Building (249 m): golden glass, stepped profile — far left (Yeouido, west)
const b63 = new THREE.Group(); b63.position.set(-2600, 0, -2300); kw.add(b63);
{ const gold = new THREE.MeshStandardMaterial({ color: '#e0b052', roughness: 0.18, metalness: 0.92, envMapIntensity: 1.4 });
  const prof = new THREE.Shape(); prof.moveTo(-36, 0); prof.lineTo(36, 0); prof.lineTo(36, 200); prof.lineTo(20, 235); prof.lineTo(-10, 249); prof.lineTo(-36, 249); prof.lineTo(-36, 0);
  const g = new THREE.ExtrudeGeometry(prof, { depth: 34, bevelEnabled: false }); g.translate(0, 0, -17); const m = mesh(g, gold, false, false); b63.add(m);
  const ribs = M('#b78a3a', { metalness: 0.6, roughness: 0.4 }); for (let y = 6; y < 245; y += 7.6) bx(73, 0.5, 34.6, ribs, 0, y, 0, b63).visible = y < 200; }
// Lotte World Tower (555 m): slender tapered glass tower with the split crown — far right
const lotte = new THREE.Group(); lotte.position.set(3400, 0, -2100); kw.add(lotte);
{ const glass = new THREE.MeshStandardMaterial({ color: '#c9d6e2', roughness: 0.16, metalness: 0.75, envMapIntensity: 1.3 });
  const pts = []; for (let i = 0; i <= 24; i++) { const y = i / 24; pts.push(new THREE.Vector2(36 * (1 - 0.82 * Math.pow(y, 1.6)), y * 555)); }
  const g = new THREE.LatheGeometry(pts, 4); g.rotateY(Math.PI / 4); const m = mesh(g, glass, false, false); m.scale.set(1, 1, 0.92); lotte.add(m);
  const seam = M('#e9eef3', { roughness: 0.3, metalness: 0.3 }); for (const s of [-1, 1]) { const l = mesh(new THREE.BoxGeometry(1.2, 555, 1.2), seam); l.position.set(0, 277, s * 0.5); lotte.add(l); } }
// Banpo Bridge (double deck; Jamsu Bridge below), running north on the right of the frame
const bridge = new THREE.Group(); bridge.position.set(160, 0, 0); kw.add(bridge);
{ const deck = M('#b9b6ae', { roughness: 0.8 }), dark = M('#8e8b84'), rail = M('#4f6f8a', { roughness: 0.5 });
  bx(28, 3.2, 1060, deck, 0, 17, -500, bridge); bx(28.4, 0.8, 1060, rail, 0, 19, -500, bridge);
  bx(10, 1.2, 1000, dark, 0, 1.2, -505, bridge);    // Jamsu (low) bridge
  for (let z = -20; z > -1000; z -= 45) { bx(5, 16, 5, deck, -8, 8, z, bridge); bx(5, 16, 5, deck, 8, 8, z, bridge); bx(26, 2.2, 6, deck, 0, 14.6, z, bridge); }
  bx(28, 3.2, 120, deck, 0, 17, 60, bridge); bx(4, 17, 4, deck, 0, 8.5, 20, bridge); }
// ---- the park: trees, lamps, mats with people ----
const treeGeo = (() => { const parts = []; const tr = new THREE.CylinderGeometry(0.14, 0.22, 3.0, 7); tr.translate(0, 1.5, 0); parts.push([tr, 0]);
  for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(1, 2); const P = g.attributes.position; for (let j = 0; j < P.count; j++) { const v = V3(P.getX(j), P.getY(j), P.getZ(j)); const k = 1 + 0.12 * Math.sin(v.x * 5 + i) * Math.cos(v.z * 4 + v.y * 3); P.setXYZ(j, v.x * k, v.y * k, v.z * k); }
    const a = i / 6 * Math.PI * 2, r = i ? 0.9 : 0; g.scale(1.3, 1.1, 1.3); g.translate(Math.cos(a) * r, 3.7 + (i ? hash(i) * 0.8 : 1.0), Math.sin(a) * r); parts.push([g, 1]); }
  return parts; })();
const treeTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4f7f35'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#3f6e2a', '#5f9440', '#6ea64a', '#45772f', '#7cb256'], 5); });
const trunkM = M('#6a5442', { roughness: 0.95 }), leafM = new THREE.MeshStandardMaterial({ map: treeTex, roughness: 0.9, color: '#e8f0dc' });
function tree(x, z, s) { const g = grp(x, 0, z, hash(x * 1.3 + z) * 6, kw); g.scale.setScalar(s); for (const [geo, k] of treeGeo) g.add(mesh(geo, k ? leafM : trunkM)); return g; }
seed = 515; for (let i = 0; i < 70; i++) { const x = -260 + i * 7.5 + R(-2, 2), z = R(7, 12) + (i % 3) * 7; if (Math.abs(x - 160) < 22) continue; tree(x, z, R(1.0, 1.5)); }
for (let i = 0; i < 30; i++) { const x = -300 + i * 20 + R(-4, 4); if (Math.abs(x - 160) < 20) continue; const l = grp(x, 0, -5.6, 0, kw); bx(0.09, 4.2, 0.09, '#3c4248', 0, 2.1, 0, l); bx(0.5, 0.12, 0.22, '#3c4248', 0.2, 4.2, 0, l); }
const MATS = ['#3b78c4', '#e9c23c', '#e46a5a', '#5aa070', '#f0f0ec'];
const matTex = (c) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 8; i += 2) { g.fillRect(i * 16, 0, 16, h); g.fillRect(0, i * 16, w, 16); } });
function picnicMat(x, z, ry, c) { const m = mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: matTex(c), roughness: 0.9 }), false, true); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.015, z); kw.add(m); return m; }
// ramen cup (convenience-store style: white cup, red band) + chopsticks
function ramenCup() { const g = new THREE.Group(); const cup = mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.1, 24, 1, true), new THREE.MeshStandardMaterial({ map: canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#f7f5f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8282a'; c.fillRect(0, 18, w, 26); c.fillStyle = '#fff'; c.font = 'bold 20px "Noto Sans KR"'; for (let x = 10; x < w; x += 128) c.fillText('라면', x, 38); }), side: THREE.DoubleSide, roughness: 0.6 }));
  g.add(cup); const soup = mesh(new THREE.CircleGeometry(0.052, 24), M('#c8642a', { roughness: 0.3 })); soup.rotation.x = -Math.PI / 2; soup.position.y = 0.035; g.add(soup);
  for (const s of [-1, 1]) { const c = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 5), M('#d8c08a')); c.position.set(0.02 * s, 0.08, 0.01); c.rotation.z = 0.25; g.add(c); }
  return g; }
