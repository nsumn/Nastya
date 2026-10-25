// =================== HANDS OUTDOORS (meters, close-up): his and her fingers interlace, standing on grass under an open sky; at the end the same hands at sunset with the glowing gap ===================
const cafe = new THREE.Scene(); const cfCam = new THREE.PerspectiveCamera(38, W / H, 0.01, 50);
const cfHemi = new THREE.HemisphereLight(0xeaf4ff, 0x4a6a3a, 0.9); cafe.add(cfHemi);
const cfKey = new THREE.DirectionalLight(0xfff0d8, 2.6); cfKey.position.set(-1.5, 1.2, 1.0); cfKey.castShadow = true; cfKey.shadow.mapSize.set(2048, 2048); cfKey.shadow.bias = -0.0002; Object.assign(cfKey.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 6 }); cafe.add(cfKey);
const cfRim = new THREE.DirectionalLight(0xffa070, 1.4); cfRim.position.set(1.2, 0.6, -1.4); cafe.add(cfRim);
const cfFill = new THREE.PointLight(0xffe0c8, 0.6, 3, 1.5); cfFill.position.set(0.4, 0.2, 0.6); cafe.add(cfFill);
// open sky with soft clouds (tinted for the sunset ending), grass below, a few distant trees
const bokehTex = canvasTex(1024, 1820, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a7ad8'); gr.addColorStop(0.5, '#7ab4ec'); gr.addColorStop(0.72, '#c8e2f8'); gr.addColorStop(1, '#e8f2fa'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const x = rnd() * w, y = R(0.12, 0.62) * h, s = R(60, 150); for (let k = 0; k < 7; k++) { const cx = x + R(-1.2, 1.2) * s, cy = y + R(-0.25, 0.25) * s, r = s * R(0.45, 0.8); const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.75)'); rg.addColorStop(0.6, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); } } });
const cfBack = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshBasicMaterial({ map: bokehTex, color: new THREE.Color(1, 1, 1), side: THREE.BackSide, fog: false })); cfBack.rotation.y = 0.6; cafe.add(cfBack);
{ const grass = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5a9a3e'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#4e8e36', '#6aaa4a', '#589a3c', '#76b456'], 3); }, [14, 14]);
  const gr = mesh(new THREE.CircleGeometry(28, 48), M('#ffffff', { map: grass, roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; gr.position.y = -1.2; cafe.add(gr);
  for (let i = 0; i < 22; i++) { const a = R(0, 6.28), d = R(16, 27); const c = mesh(new THREE.IcosahedronGeometry(R(1.0, 2.2), 1), M(pick(['#3e8a34', '#4a9a3a', '#5aaa44']), { flatShading: true })); c.position.set(Math.cos(a) * d, -1.2 + R(0.8, 2.2), Math.sin(a) * d); cafe.add(c); } }
// a stylised hand: forearm sleeve + cuff, palm, 4 three-joint fingers, 2-joint thumb. Wrist at the origin, fingers along +y, palm faces +z
function makeHand(skin, sleeve, cuff) { const g = new THREE.Group(), S = M(skin, { roughness: 0.6 }), SL = M(sleeve, { roughness: 0.8 });
  const arm = mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.34, 18), SL); arm.position.y = -0.19; g.add(arm); const cf = mesh(new THREE.TorusGeometry(0.031, 0.006, 8, 20), M(cuff, { roughness: 0.4, metalness: cuff === '#d8b860' ? 0.7 : 0 })); cf.rotation.x = Math.PI / 2; cf.position.y = -0.03; g.add(cf);
  const wr = mesh(new THREE.CylinderGeometry(0.026, 0.029, 0.04, 16), S); wr.position.y = -0.005; g.add(wr);
  const palm = mesh(new THREE.CapsuleGeometry(0.02, 0.06, 4, 12), S); palm.scale.set(2.05, 1, 0.62); palm.position.y = 0.055; g.add(palm);
  const fingers = [], base = [], LEN = [[0.042, 0.026, 0.02], [0.046, 0.03, 0.022], [0.044, 0.028, 0.021], [0.034, 0.022, 0.018]];
  for (let f = 0; f < 4; f++) { const rad = f === 3 ? 0.0074 : 0.0083; const j1 = grp(-0.03 + f * 0.02, 0.098, 0, 0, g); base.push(j1); let par = j1; const js = [j1];
    LEN[f].forEach((l, s) => { const c = mesh(new THREE.CapsuleGeometry(rad * (1 - s * 0.08), l - rad, 3, 10), S); c.position.y = l / 2; par.add(c); if (s < 2) { const j = grp(0, l, 0, 0, par); js.push(j); par = j; } });
    fingers.push(js); }
  const t1 = grp(0.04, 0.03, 0.008, 0, g); t1.rotation.z = -0.75; t1.rotation.x = 0.35; const tc1 = mesh(new THREE.CapsuleGeometry(0.0095, 0.026, 3, 10), S); tc1.position.y = 0.018; t1.add(tc1);
  const t2 = grp(0, 0.036, 0, 0, t1); const tc2 = mesh(new THREE.CapsuleGeometry(0.0088, 0.018, 3, 10), S); tc2.position.y = 0.014; t2.add(tc2);
  return { g, fingers, base, thumb: [t1, t2] }; }
const hisH = makeHand('#b98260', '#2a3a6a', '#d8b860'); cafe.add(hisH.g);   // his: navy sleeve, gold watch-ring
const herH = makeHand('#f1d2b6', '#e86a9a', '#f4f0e8'); cafe.add(herH.g);   // hers: pink sleeve, pearl cuff
const gapGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.15), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ vec2 q=(vUv-0.5)*vec2(1.0,0.75); float d=length(q); gl_FragColor=vec4(vec3(1.0,0.85,0.6)*uA*exp(-d*d*28.0),1.0); }' }));
gapGlow.material.depthTest = false; gapGlow.renderOrder = 10; gapGlow.position.set(0.0, 0.0, 0.0); gapGlow.rotation.y = Math.PI / 2 * 0; cafe.add(gapGlow);
// pose: approach (0-1.8), fingers spread and slide between each other (1.8-2.6), then curl around the other hand (2.4-3.4)
function poseHands(t) { const app = ease(clamp(t / 1.9, 0, 1)), spread = smooth(1.2, 2.2, t), curl = smooth(2.3, 3.4, t) * 0.92;
  const breathe = 0.002 * Math.sin(t * 1.6);
  hisH.g.position.set(0.004, -0.11 + breathe, lerp(-0.1, -0.0135, app)); hisH.g.rotation.set(-0.28 - 0.2 * (1 - app), 0, -0.12);
  herH.g.position.set(-0.006, -0.11 - breathe, lerp(0.1, 0.0135, app)); herH.g.rotation.set(0.28 + 0.2 * (1 - app), Math.PI, -0.12);
  for (const Hh of [hisH, herH]) { Hh.base.forEach((b, f) => { b.position.x = (-1.5 + f) * lerp(0.02, 0.0205, spread) * lerp(1, 1.6, spread); b.rotation.z = (-1.5 + f) * 0.06 * spread; });
    Hh.fingers.forEach((js, f) => { js[0].rotation.x = lerp(0.15, 1.0, curl); js[1].rotation.x = lerp(0.1, 1.05, curl); js[2].rotation.x = lerp(0.05, 0.7, curl); });
    Hh.thumb[0].rotation.x = lerp(0.35, 0.9, curl); Hh.thumb[1].rotation.x = lerp(0.1, 0.6, curl); } }
const _cp = new THREE.Vector3();
function updateCafe(t, mode) { poseHands(mode === 'end' ? 3.6 + (t - ENDS) : t); const end = mode === 'end';
  cfKey.color.set(end ? '#ff9a5a' : '#fff0d8'); cfKey.intensity = end ? 2.2 : 2.6; cfRim.color.set(end ? '#ff6a8a' : '#c8e0ff'); cfHemi.intensity = end ? 0.55 : 0.9;
  cfBack.material.color.set(end ? '#ffa070' : '#ffffff').multiplyScalar(end ? 0.85 : 1);
  gapGlow.material.uniforms.uA.value = end ? (0.35 + 0.15 * Math.sin(t * 3)) * smooth(ENDS + 0.8, ENDS + 2.4, t) : 0; gapGlow.lookAt(cfCam.position); }
function cafeCamera(t, mode) { if (mode === 'end') { const k = smooth(ENDS - 0.5, T_END, t); cfCam.position.set(lerp(-0.34, -0.26, k), lerp(-0.07, -0.05, k), lerp(0.2, 0.16, k)); cfCam.lookAt(0, 0.03, 0); cfCam.fov = 38; return; }
  const k = smooth(0, ATOM, t); cfCam.position.set(lerp(0.36, 0.26, k), lerp(-0.08, -0.05, k), lerp(0.3, 0.2, k)); cfCam.lookAt(0, lerp(0.04, 0.03, k), 0); cfCam.fov = lerp(40, 30, smooth(LENS, ATOM, t)); }
