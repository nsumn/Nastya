// =================== Times Square: night sky, billboards, crowd, the incoming asteroid ===================
const ASTEROID_DIR = new THREE.Vector3(Math.cos(ENTRY_DEG * Math.PI / 180), Math.sin(ENTRY_DEG * Math.PI / 180), 0.02).normalize(); // comes in over the end of the street
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSunS: { value: new THREE.Vector3(-0.45, 0.42, 0.78).normalize() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 0.07 }, uDusk: { value: 0.0 },
    uAst: { value: ASTEROID_DIR.clone() }, uGlow: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform vec3 uAst; uniform float uGlow; varying vec3 vD; void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    c+=vec3(0.16,0.08,0.20)*pow(1.0-max(dot(d,uUp),0.0),3.0)*0.6;               // Times Square light dome
    float a=max(dot(d,uAst),0.0);
    c=mix(c, c*vec3(1.0,0.55,0.35), clamp(uGlow,0.0,1.0)*0.5); c+=vec3(1.0,0.32,0.06)*(pow(a,5.0)*0.45+pow(a,30.0)*0.8)*uGlow + vec3(0.55,0.16,0.04)*uGlow*uGlow*0.25;
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 40, 24), domeMat); dome.frustumCulled = false; dome.renderOrder = -10; city.add(dome);
const starMat = new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.55 });
{
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(0.1, 1), R(-1, 1)).normalize().multiplyScalar(4500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  city.add(new THREE.Points(g, starMat));
}

// ---- billboards (made-up ads, no real brands)
const ADS = [
  ['NOVA COLA', '#e8322a', '#ffd23a'], ['BROADWAY', '#1b1b3a', '#ffd86a'], ['LIVE TONIGHT', '#6a1fd0', '#ffffff'], ['MEGA SALE', '#ff7a1a', '#ffffff'],
  ['PIZZA 24/7', '#d9261c', '#fff2c0'], ['SKYLINE', '#0c6fd9', '#ffffff'], ['CINEMA', '#111111', '#ff3355'], ['ZOOM PHONE', '#13c2a3', '#04202a'],
  ['NEW YORK', '#ffffff', '#e8322a'], ['PLANET FM', '#2b2bff', '#9ef0ff'], ['SNACKZ', '#ffcc00', '#c4161c'], ['GALAXY TV', '#000000', '#38f5ff'],
  ['HOTEL 42', '#7a0f3a', '#ffd6e6'], ['RUN FAST', '#00b34a', '#ffffff'], ['ICE CREAM', '#ff8fc8', '#ffffff'], ['THE SHOW', '#b30000', '#ffe08a'],
];
function adTex(i, w, h) {
  const [word, bg, fg] = ADS[i % ADS.length];
  return canvasTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg); gr.addColorStop(1, '#' + new THREE.Color(bg).offsetHSL(R(-0.08, 0.08), 0, R(-0.2, 0.15)).getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const style = i % 4;
    if (style === 1) { g.fillStyle = 'rgba(255,255,255,0.18)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(R(0, w), R(0, h), R(20, h * 0.6), 0, Math.PI * 2); g.fill(); } }
    if (style === 2) { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 10, h); }
    if (style === 3) { g.fillStyle = fg; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.4, 0); g.lineTo(w * 0.6, 0); g.lineTo(w * 0.2, h); g.fill(); g.globalAlpha = 1; }
    let fs = h * 0.42; g.font = `900 ${fs}px Inter, Arial, sans-serif`; while (g.measureText(word).width > w * 0.86 && fs > 10) { fs -= 4; g.font = `900 ${fs}px Inter, Arial, sans-serif`; }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word, w / 2, h / 2);
    g.strokeStyle = fg; g.lineWidth = 6; g.globalAlpha = 0.6; g.strokeRect(6, 6, w - 12, h - 12); g.globalAlpha = 1;
  });
}
const adMats = [];
function billboard(i, w, h, pos, rotY) {
  const ratio = w / h, tw = 512, th = Math.max(64, Math.round(512 / ratio));
  const m = new THREE.MeshBasicMaterial({ map: adTex(i, tw, th), fog: false, toneMapped: true }); m.color.setScalar(1.5); adMats.push(m);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.copy(pos); p.rotation.y = rotY; city.add(p);
  const fr = mesh(BOX, M('#1a1a1c')); fr.scale.set(w + 0.6, h + 0.6, 0.4); fr.position.copy(pos); fr.rotation.y = rotY; if (rotY === 0) fr.position.z -= 0.25; else if (rotY === Math.PI) fr.position.z += 0.25; else fr.position.x += 0.25; city.add(fr);
  return p;
}
{
  let k = 0;
  for (const side of [-1, 1]) for (let x = 36; x < 160; x += R(11, 20)) {
    if (CROSS.some(c => Math.abs(x - c) < 9)) continue;
    let y = R(7, 11);
    while (y < 46) { const w = R(8, 16), h = R(4, 9); billboard(k++, w, h, new THREE.Vector3(x + R(-2, 2), y + h / 2, side * 11.7), side < 0 ? 0 : Math.PI); y += h + R(1.5, 6); }
  }
  // the tower at the end of the square, covered in screens
  const TX = 186;
  const tw = mesh(BOX, M('#2a2c30', { roughness: 0.6 })); tw.scale.set(20, 64, 24); tw.position.set(TX + 10, 32, 0); city.add(tw);
  let y = 9; while (y < 54) { const h = R(7, 13); const p = billboard(k++, 21, h, new THREE.Vector3(TX - 0.3, y + h / 2, 0), -Math.PI / 2); y += h + 1.2; }
  box(14, 6, 14, '#3a3c40', TX + 10, 67, 0); const pole = mesh(new THREE.CylinderGeometry(0.4, 0.6, 22, 6), M('#5a5c60')); pole.position.set(TX + 10, 81, 0); city.add(pole);
  // red steps stand in the square (Duffy Square style)
  for (let i = 0; i < 7; i++) box(10, 0.45, 1.4, M('#b3261e', { roughness: 0.5 }), 128, 0.25 + i * 0.45, -3.5 - i * 1.2);
}
// ---- crowd standing in the square, looking up the street
const crowd = [];
for (let i = 0; i < 90; i++) {
  const p = makePerson(rnd); city.add(p.outer);
  const x = R(84, 150), z = R(-6.2, 6.2);
  if (Math.abs(x - 128) < 7 && z < -2) { city.remove(p.outer); continue; }
  crowd.push({ p, x, z, ry: Math.PI / 2 + R(-0.5, 0.5), ph: R(0, 6) });
}
function updateCrowd(t) {
  for (const c of crowd) { c.p.outer.position.set(c.x, 0.95, c.z); c.p.outer.rotation.set(0, c.ry, 0); poseIdle(c.p, t, c.ph); c.p.outer.visible = Math.hypot(c.x - cam.position.x, c.z - cam.position.z) > 2.2; }
}
// ---- the asteroid seen from the street: real angular size for 1 mile at the real distance
function astRockGeo(detail, amp, sd) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position; const v = new THREE.Vector3();
  const bumps = Array.from({ length: 14 }, () => [new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), R(0.15, 0.5), R(-1, 1)]);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); let r = 1; for (const [c, w, a] of bumps) r += a * amp * Math.exp(-(1 - v.dot(c)) / (w * w * 0.25)); r += (Math.sin(v.x * 9 + sd) * Math.sin(v.y * 7) * Math.sin(v.z * 8)) * amp * 0.25; v.multiplyScalar(r); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
const skyRock = new THREE.Mesh(astRockGeo(2, 0.12, 1), new THREE.MeshStandardMaterial({ color: '#6a5f55', emissive: '#ff7a1e', emissiveIntensity: 0.6, roughness: 0.95, flatShading: true, fog: false }));
city.add(skyRock);
const glowTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,236,200,0.9)'); gr.addColorStop(0.45, 'rgba(255,150,60,0.35)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const skyGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); skyGlow.renderOrder = 5; city.add(skyGlow);
// plasma tail: a stretched glow pointing back along the path (camera-facing ribbon)
const tailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide, uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float w=1.0-abs(vUv.y-0.5)*2.0; float f=pow(w,2.0)*pow(1.0-vUv.x,1.5); vec3 c=mix(vec3(1.0,0.32,0.06),vec3(1.0,0.75,0.4),pow(1.0-vUv.x,6.0)*w); gl_FragColor=vec4(c*f*uA*0.7,1.0); }',
});
const tail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), tailMat); tail.frustumCulled = false; city.add(tail);
const astLight = new THREE.DirectionalLight(0xffb070, 0); city.add(astLight, astLight.target);
const distKm = t => Math.max(0.05, V_KMS * (IMPACT - t));          // distance along the path to ground zero
function updateSky(t, camPos) {
  const d = distKm(t); const RD = 3200;                             // rendered at 3.2 km, scaled to the true angular size
  const ang = 1.609 / d;                                             // radians
  const p = camPos.clone().addScaledVector(ASTEROID_DIR, RD);
  skyRock.position.copy(p); skyRock.scale.setScalar(Math.max(RD * ang / 2, 3)); skyRock.rotation.set(t * 0.3, t * 0.5, 0);
  const alt = d * Math.sin(ENTRY_DEG * Math.PI / 180);
  const hot = smooth(110, 40, alt);                                  // glowing once it is in the thick air
  skyRock.material.emissiveIntensity = 0.4 + 1.6 * hot;
  const gs = RD * Math.max(ang * 4.5, 0.03 + 0.03 * hot); skyGlow.position.copy(p).addScaledVector(ASTEROID_DIR, -RD * 0.02); skyGlow.scale.setScalar(gs); skyGlow.material.opacity = 1; skyGlow.material.color.set(hot > 0.3 ? '#ff8a3a' : '#ffe8c8'); if (hot > 0.3) skyGlow.material.color.multiplyScalar(0.75);
  // tail
  const len = RD * Math.min(1.2, 0.05 + hot * 0.9) * (0.3 + ang * 4);
  const dir2 = ASTEROID_DIR.clone(); const mid = p.clone().addScaledVector(dir2, len / 2);
  tail.position.copy(mid); tail.scale.set(len, gs * 0.45, 1);
  // orient: x axis along the path, facing the camera
  const xa = dir2.clone(); const toCam = camPos.clone().sub(mid).normalize(); const ya = new THREE.Vector3().crossVectors(toCam, xa).normalize(); const za = new THREE.Vector3().crossVectors(xa, ya);
  tail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, za));
  tailMat.uniforms.uA.value = hot * 1.4;
  const glow = clamp(Math.pow(ang * 6, 1.3), 0, 1.6) * hot;
  domeMat.uniforms.uGlow.value = glow; starMat.opacity = 0.55 * (1 - clamp(glow, 0, 1));
  astLight.intensity = glow * 2.2; astLight.position.copy(camPos).addScaledVector(ASTEROID_DIR, 300); astLight.target.position.copy(camPos); astLight.target.updateMatrixWorld();
  return glow;
}
