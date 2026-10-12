
// =================== sky dome for the city ===================
const SUN_DAY = new THREE.Vector3(-0.45, 0.85, 0.3).normalize();
const HAND_SUN = new THREE.Vector3(-0.62, 0.62, -0.5).normalize();
const SUN_DUSK = new THREE.Vector3(-0.45, 0.07, -0.89).normalize();
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uSunS: { value: SUN_DAY.clone() }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uDay: { value: 1 }, uDusk: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `varying vec3 vD; void main(){ vec3 c=skyColor(normalize(vD)); gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 40, 24), domeMat); dome.frustumCulled = false; dome.renderOrder = -10; city.add(dome);

// =================== heroes ===================
// A = "you" (blue, cool glow) · B = the other person (orange, warm glow)
const HERO = new THREE.Vector3(76, 0.18, -9.7);     // hug spot on the sidewalk (side -1)
const BENCH = new THREE.Vector3(62, 0.18, -10.9);
const COL_A = '#2f6fd0', COL_B = '#f07a2a';
const heroA = makePerson(rnd, { skin: '#e9c4a2', hair: '#2a1d14', top: COL_A, bottom: '#23324d', shoe: '#f4f4f4', dress: false, shorts: false, longSleeve: true, hairStyle: 0.3, cap: false });
const heroB = makePerson(rnd, { skin: '#b98260', hair: '#1a1a1a', top: COL_B, bottom: '#2a2a30', shoe: '#1b1b1b', dress: false, shorts: false, longSleeve: true, hairStyle: 0.7, cap: false });
city.add(heroA.outer, heroB.outer);
// bench for the "hovering" shot
const benchG = new THREE.Group(); benchG.position.copy(BENCH); city.add(benchG);
const woodM = M('#8a5a34', { roughness: 0.8 });
box(1.9, 0.07, 0.48, woodM, 0, 0.46, 0, benchG); box(1.9, 0.07, 0.1, woodM, 0, 0.62, -0.25, benchG); box(1.9, 0.07, 0.1, woodM, 0, 0.78, -0.27, benchG);
for (const sx of [-0.85, 0.85]) { box(0.06, 0.46, 0.06, '#2b2b2b', sx, 0.23, 0.18, benchG); box(0.06, 0.82, 0.06, '#2b2b2b', sx, 0.41, -0.24, benchG); box(0.06, 0.06, 0.48, '#2b2b2b', sx, 0.44, 0, benchG); }
// glow shells (fresnel rim, normal-extruded) — the gap made visible
function glowMat(col) {
  return new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    uniforms: { uCol: { value: new THREE.Color(col) }, uA: { value: 0 }, uPush: { value: 0.012 } },
    vertexShader: 'uniform float uPush; varying vec3 vN; varying vec3 vV; void main(){ vec3 p=position+normal*uPush; vec4 mv=modelViewMatrix*vec4(p,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0); gl_FragColor=vec4(uCol*(0.25+1.6*f)*uA,1.0); }',
  });
}
const glowA = glowMat('#5fb4ff'), glowB = glowMat('#ffab5a');
function addGlow(p, mat) { const list = []; p.outer.traverse(o => { if (o.isMesh) list.push(o); }); for (const m of list) { const g = new THREE.Mesh(m.geometry, mat); g.renderOrder = 5; m.add(g); } }
addGlow(heroA, glowA); addGlow(heroB, glowB);

// hug pose: arms forward and wrapped around the other person
function poseHug(p, k, high) {
  const s = high ? 1 : -1;
  p.legs[0].rotation.x = 0.05; p.legs[1].rotation.x = -0.05; p.knees[0].rotation.x = 0.06; p.knees[1].rotation.x = 0.06;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? 1 : -1;  // arms[0] is at x=-0.215
    p.arms[i].rotation.set(lerp(0.0, -1.25 - 0.18 * s, k), lerp(0, side * -0.55, k), lerp(side * 0.08, side * 0.12, k));
    p.elbows[i].rotation.set(lerp(-0.15, -0.35, k), 0, lerp(0, side * 1.25, k));
  }
}
function poseReach(p, k) { // one arm reaching forward-up (hook continuity)
  poseIdle(p, 0, 0); p.arms[1].rotation.set(-1.4 * k, 0, -0.1 * k); p.elbows[1].rotation.set(-0.2 * k, 0, 0);
}

// =================== hands (close-up, meters) ===================
const handMats = {};
function handMat(c) { return handMats[c] || (handMats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0, flatShading: true, side: THREE.DoubleSide })); }
function segFinger(g, mat, base, dir, lens, rad, bends, axis) {
  // chain of capsules; bends rotate around `axis` (local) at each joint
  let p = base.clone(); let d = dir.clone().normalize(); const parts = [];
  for (let i = 0; i < lens.length; i++) {
    d.applyAxisAngle(axis, bends[i]);
    const L = lens[i], r = rad * (1 - i * 0.07);
    const c = new THREE.CapsuleGeometry(r, L, 3, 8); c.translate(0, L / 2, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); c.translate(p.x, p.y, p.z);
    parts.push(c); p = p.clone().addScaledVector(d, L);
  }
  return { parts, tip: p, dir: d };
}
function makeHand(skin, sleeve, nail) {
  const g = new THREE.Group();
  const sk = [], sl = [];
  const palm = new THREE.SphereGeometry(1, 12, 9); palm.scale(0.043, 0.056, 0.021); palm.translate(0, 0.0, 0); sk.push(palm);
  const heel = new THREE.SphereGeometry(1, 10, 8); heel.scale(0.036, 0.03, 0.02); heel.translate(0, -0.04, 0.002); sk.push(heel);
  const wrist = new THREE.CylinderGeometry(0.026, 0.028, 0.08, 10); wrist.translate(0, -0.085, 0); sk.push(wrist);
  const X = new THREE.Vector3(1, 0, 0);
  // index: extended, slight natural bend
  const idx = segFinger(g, null, new THREE.Vector3(0.024, 0.048, 0.0), new THREE.Vector3(0.08, 1, 0), [0.046, 0.027, 0.021], 0.0098, [0, 0.06, 0.05], X);
  sk.push(...idx.parts);
  // curled middle / ring / pinky (bend toward +z = palm side)
  for (const [x, L, r] of [[0.008, 0.047, 0.0102], [-0.008, 0.044, 0.0098], [-0.024, 0.036, 0.0088]]) {
    const f = segFinger(g, null, new THREE.Vector3(x, 0.046, 0.002), new THREE.Vector3(0, 1, 0), [L * 0.85, L * 0.55, L * 0.42], r, [-1.25, -1.5, -1.15], X); sk.push(...f.parts);
  }
  // thumb tucked over the curled fingers
  const th = segFinger(g, null, new THREE.Vector3(0.033, -0.02, -0.008), new THREE.Vector3(-0.3, 0.85, -0.55), [0.036, 0.028, 0.023], 0.0115, [0, 0.3, 0.35], new THREE.Vector3(0, 0, 1)); sk.push(...th.parts);
  const skinMesh = new THREE.Mesh(mergeGeometries(sk.map(x => x.index ? x.toNonIndexed() : x).map(x => { x.deleteAttribute('uv'); return x; })), handMat(skin)); skinMesh.castShadow = true; skinMesh.receiveShadow = true; g.add(skinMesh);
  // nail on the index fingertip (back of the finger = -z)
  const nl = new THREE.SphereGeometry(1, 8, 6); nl.scale(0.0062, 0.0075, 0.0018);
  const nailM = new THREE.Mesh(nl, handMat(nail)); nailM.position.copy(idx.tip).addScaledVector(idx.dir, -0.006).add(new THREE.Vector3(0, 0, 0.0084)); g.add(nailM);
  // sleeve + cuff
  const s1 = new THREE.CylinderGeometry(0.039, 0.05, 0.42, 12); s1.translate(0, -0.34, 0); sl.push(s1);
  const cuff = new THREE.CylinderGeometry(0.041, 0.041, 0.035, 12); cuff.translate(0, -0.13, 0); sl.push(cuff);
  const sleeveMesh = new THREE.Mesh(mergeGeometries(sl), new THREE.MeshStandardMaterial({ color: sleeve, roughness: 0.9, flatShading: true })); sleeveMesh.castShadow = true; g.add(sleeveMesh);
  g.userData.tip = idx.tip.clone().addScaledVector(idx.dir, 0.0098 * 0.86);
  return g;
}
const hands = new THREE.Scene();
const handHemi = new THREE.HemisphereLight(0xcfe0ff, 0x6a5848, 1.1); hands.add(handHemi);
const handSun = new THREE.DirectionalLight(0xfff0dc, 2.6); hands.add(handSun, handSun.target);
const handRim = new THREE.DirectionalLight(0xffd0a0, 1.2); hands.add(handRim, handRim.target);
const CONTACT = new THREE.Vector3(HERO.x, 1.42, HERO.z + 0.25);
const handTop = makeHand('#f2c09a', COL_A, '#f6d2c4');   // A, from above (pointing down)
const handBot = makeHand('#c27f55', COL_B, '#e6b9a4');   // B, from below (pointing up)
const TIP = handTop.userData.tip.y;
handTop.scale.x = -1;                                    // mirror: a left hand meets a right hand
hands.add(handTop, handBot);
// glowing gap between the fingertips (only in the outro)
const gapGlow = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.ShaderMaterial({
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  uniforms: { uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(max(dot(normalize(vN),normalize(vV)),0.0),2.5); gl_FragColor=vec4(vec3(1.0,0.85,0.6)*f*uA,1.0); }',
}));
hands.add(gapGlow);
function placeHands(gap, t) {
  const wob = 0.0015 * Math.sin(t * 2.1);
  handBot.position.set(CONTACT.x, CONTACT.y - gap / 2 - TIP + wob, CONTACT.z); handBot.rotation.set(0.12, 0.35, -0.06);
  handTop.position.set(CONTACT.x, CONTACT.y + gap / 2 + TIP - wob, CONTACT.z); handTop.rotation.set(0.1, -0.4, Math.PI - 0.06);
  // keep fingertips exactly on the contact axis: correct for rotation of the tip
  for (const h of [handBot, handTop]) { h.updateMatrixWorld(); const tip = h.userData.tip.clone().applyMatrix4(h.matrixWorld); const want = new THREE.Vector3(CONTACT.x, CONTACT.y + (h === handTop ? gap / 2 : -gap / 2), CONTACT.z); h.position.add(want.sub(tip)); }
  gapGlow.position.copy(CONTACT); gapGlow.scale.set(0.012, Math.max(gap, 0.002) * 0.9 + 0.004, 0.012);
}
