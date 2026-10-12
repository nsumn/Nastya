const V1_GLOBE = 3.0, V1_NYC = 8.0, V1_WEIGH = 15.0, V1_SOUND = 21.0, V1_COW = 27.0, V1_FISH = 34.0, V1_SLOTH = 40.0, V1_BIRDS = 47.0, V1_LIGHT = 51.0, V1_T_END = 58.5;
// =================== updates ===================
const WAVE_DIR = new THREE.Vector3(1.0, 0.2, 0.6).normalize();
function globeAt(t) {
  const sound = t >= V1_SOUND;
  globe.rotation.y = sound ? 1.2 + (t - V1_SOUND) * 0.05 : -0.6 + t * 0.06;
  const d = sound ? 66 : lerp(80, 70, smooth(0, V1_NYC, t));
  gCam.position.set(sound ? 12 : 0, sound ? 22 : 6, d); gCam.lookAt(0, 0, 0); gCam.updateProjectionMatrix();
  // the moment: a front sweeps the planet
  const front = lerp(-1.25, 1.25, smooth(3.4, 6.6, t)); gWave.material.uniforms.uFront.value = front; gWave.material.uniforms.uA.value = sound ? 0 : smooth(3.2, 3.6, t) * (1 - smooth(7.0, 8.0, t));
  gAtm.material.uniforms.uG.value = sound ? 0.25 : smooth(4.5, 7.5, t) * 0.7;
  const inv = globe.matrixWorld.clone().invert(); globe.updateMatrixWorld();
  for (const p of gPuffs) {
    const n = p.s.position.clone().normalize(); const dw = n.dot(WAVE_DIR);
    const age = sound ? -1 : (front - dw) * 2.2;   // seconds-ish after the front passes
    const on = age > 0 && age < 3; p.s.material.opacity = on ? Math.min(1, age * 4) * (1 - smooth(1.6, 3, age)) : 0;
    p.s.scale.setScalar(on ? (0.25 + 0.9 * Math.min(age, 1.2)) * (0.7 + 0.6 * p.ph) : 0.01);
    p.s.position.copy(n.multiplyScalar(ER * (1.01 + (on ? age * 0.04 : 0))));
  }
  for (const r of gRings) { const u = sound ? ((t - V1_SOUND) * 0.7 + r.ph) % 1 : -1; r.r.material.opacity = u > 0 ? 0.8 * (1 - u) : 0; r.r.scale.setScalar(u > 0 ? 0.05 + u * 0.35 : 0.01); }
}
function nyAt(t) {
  const fin = t >= V1_LIGHT;
  const grow = ease((t - (V1_NYC + 0.6)) / 4.6);
  gasCube.scale.set(lerp(0.2, 1, grow), Math.max(grow, 0.001), lerp(0.2, 1, grow));
  gasCube.position.set(GAS_X, CUBE_S / 2 * grow, GAS_Z); cubeEdges.position.copy(gasCube.position); cubeEdges.scale.copy(gasCube.scale);
  gasMat.uniforms.uT.value = t; gasMat.uniforms.uA.value = smooth(V1_NYC + 0.4, V1_NYC + 1.4, t); cubeEdges.material.opacity = 0.55 * smooth(V1_NYC + 4.5, V1_NYC + 6, t);
  streams.forEach(o => { const u = ((t - V1_NYC) * 0.35 + o.ph) % 1; const on = t > V1_NYC + 0.3 && t < V1_NYC + 6.5 && !fin; const r = o.r * (1 - u); const a = o.a + u * 2.5;
    o.s.position.set(GAS_X + Math.cos(a) * r, o.y0 + 20 + u * 40, GAS_Z + Math.sin(a) * r); o.s.scale.setScalar(18 + 30 * u); o.s.material.opacity = on ? 0.8 * Math.sin(u * Math.PI) : 0; });
  let pos, look, fov = 50;
  if (t < V1_WEIGH) { const u = ease((t - V1_NYC) / (V1_WEIGH - V1_NYC)); pos = new THREE.Vector3(lerp(10, 40, u), lerp(24, 40, u), lerp(400, 440, u)); look = new THREE.Vector3(lerp(30, 42, u), lerp(52, 48, u), lerp(-10, -15, u)); fov = 48; }
  else if (!fin) { const u = (t - V1_WEIGH) / (V1_SOUND - V1_WEIGH); const a = lerp(-0.55, -0.25, u); pos = new THREE.Vector3(40 + Math.sin(a) * 470, 60, -15 + Math.cos(a) * 470); look = new THREE.Vector3(40, 48, -15); fov = 40; }
  else { // the lighter, then pull back
    const u = (t - V1_LIGHT) / (V1_T_END - V1_LIGHT); const base = new THREE.Vector3(GAS_X - 30, 3.2, GAS_Z + 95);
    const back = ease((t - (V1_LIGHT + 4.2)) / 3.2);
    pos = base.clone().lerp(new THREE.Vector3(GAS_X - 230, 70, GAS_Z + 430), back); look = new THREE.Vector3(GAS_X, lerp(35, 45, back), GAS_Z); fov = lerp(55, 46, back);
    lighter.visible = back < 0.2; const dir = look.clone().sub(pos).normalize(); const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    lighter.position.copy(pos).addScaledVector(dir, 0.36).addScaledVector(right, 0.07).add(new THREE.Vector3(0, -0.085, 0)); lighter.quaternion.copy(nyCam.quaternion);
    const lit = t > V1_LIGHT + 1.6; lFlame.visible = lit; lFlame.scale.set(0.022 * (1 + 0.15 * Math.sin(t * 31)), 0.045 * (1 + 0.2 * Math.sin(t * 23)), 1);
  }
  if (!fin) lighter.visible = false;
  nyCam.fov = fov; nyCam.near = fin && t < V1_LIGHT + 4.6 ? 0.02 : 0.5; nyCam.updateProjectionMatrix(); nyCam.position.copy(pos); nyCam.lookAt(look);
  nySun.position.copy(look).add(new THREE.Vector3(-300, 420, 260)); nySun.target.position.copy(look); nySun.target.updateMatrixWorld();
}
function farmAt(t) {
  const u = (t - V1_COW) / (V1_FISH - V1_COW);
  farmCam.position.set(lerp(4.6, 4.0, u), lerp(1.9, 1.7, u), lerp(5.6, 4.9, u)); farmCam.lookAt(0.3, 1.25, 0); farmCam.fov = 42; farmCam.updateProjectionMatrix();
  const head = cow.userData.head; head.rotation.z = -0.15 + 0.08 * Math.sin(t * 1.5) + (t > V1_COW + 2.6 && t < V1_COW + 4.2 ? 0.25 * Math.sin((t - V1_COW - 2.6) / 1.6 * Math.PI) : 0);
  herd.forEach((c, i) => { c.userData.head.rotation.z = -0.5 + 0.1 * Math.sin(t + i); });
  // tiny "pfft" at the back first, then the real thing comes out the front
  const tp = t - (V1_COW + 1.0); tailPuff.material.opacity = tp > 0 && tp < 1.2 ? 0.5 * (1 - tp / 1.2) : 0; tailPuff.scale.setScalar(0.2 + tp * 0.4); tailPuff.position.set(-1.25 - tp * 0.3, 1.3, 0).applyMatrix4(cow.matrixWorld);
  const hp = new THREE.Vector3(0.95, -0.1, 0).applyMatrix4(cow.userData.head.matrixWorld);
  burps.forEach(o => { const a = t - (V1_COW + 2.7) - o.ph * 1.4; const on = a > 0 && a < 2.6; o.s.material.opacity = on ? 0.85 * Math.min(1, a * 5) * (1 - a / 2.6) : 0; o.s.scale.setScalar(0.4 + a * 0.9);
    o.s.position.copy(hp).add(new THREE.Vector3(0.6 * a + 0.1 * Math.sin(o.ph * 20), 0.25 * a + 0.1 * Math.cos(o.ph * 13), 0.35 * a * Math.sin(o.ph * 9))); });
  cow.updateMatrixWorld(true);
}
function seaAt(t) {
  const u = (t - V1_FISH) / (V1_SLOTH - V1_FISH);
  seaCam.position.set(Math.sin(u * 0.6) * 1.2, lerp(-0.2, 0.3, u), lerp(5.6, 4.4, u)); seaCam.lookAt(0, 0, -1.5); seaCam.updateProjectionMatrix();
  let bi = 0;
  fishP.forEach((f, i) => { const a = f.ph + t * 0.35 * f.s; const r = 3.2 + 0.6 * Math.sin(f.ph * 3);
    const x = Math.cos(a) * r * 1.4 + f.x * 0.25, z = Math.sin(a) * r - 2.5 + f.z * 0.2, y = f.y + 0.2 * Math.sin(t * 1.3 + f.ph);
    D3.position.set(x, y, z); D3.rotation.set(0, -a - Math.PI / 2 + 0.15 * Math.sin(t * 9 + f.ph), 0); D3.scale.setScalar(f.s); D3.updateMatrix(); fishIM.setMatrixAt(i, D3.matrix);
    if (f.bub) for (let k = 0; k < 4 && bi < 1600; k++) { const age = ((t * 0.7 + f.ph + k * 0.25) % 1); const burst = Math.sin(t * 2.0 + f.ph * 7) > 0.4;
      D3.position.set(x - Math.cos(a + Math.PI / 2) * 0.12, y + age * 1.6, z - Math.sin(a + Math.PI / 2) * 0.12); D3.rotation.set(0, 0, 0); D3.scale.setScalar(burst ? 0.6 + age : 0.001); D3.updateMatrix(); bubIM.setMatrixAt(bi++, D3.matrix); } });
  for (; bi < 1600; bi++) { D3.position.set(0, -99, 0); D3.scale.setScalar(0); D3.updateMatrix(); bubIM.setMatrixAt(bi, D3.matrix); }
  fishIM.instanceMatrix.needsUpdate = true; bubIM.instanceMatrix.needsUpdate = true;
  rays.forEach((r, i) => { r.material.opacity = 0.05 + 0.03 * Math.sin(t * 0.8 + i); });
}
function jungleAt(t) {
  const u = (t - V1_SLOTH) / (V1_BIRDS - V1_SLOTH);
  jCam.position.set(lerp(2.4, 2.0, u), lerp(1.8, 1.9, u), lerp(4.2, 3.5, u)); jCam.lookAt(0.2, 1.85, 0); jCam.updateProjectionMatrix();
  sloth.rotation.x = 0.05 * Math.sin(t * 0.6); sloth.position.x = 0.02 * Math.sin(t * 0.4);
  const nose = new THREE.Vector3(0.62, -0.57, 0.4).applyMatrix4(sloth.matrixWorld);
  slothBreath.forEach(o => { const a = ((t - V1_SLOTH) * 0.45 + o.ph) % 1; const on = t > V1_SLOTH + 2.4; o.s.material.opacity = on ? 0.35 * Math.sin(a * Math.PI) : 0; o.s.scale.setScalar(0.06 + a * 0.22); o.s.position.copy(nose).add(new THREE.Vector3(0.08 * a, -0.05 * a, 0.25 * a)); });
  sloth.updateMatrixWorld(true);
}
function birdsAt(t) {
  const u = (t - V1_BIRDS) / (V1_LIGHT - V1_BIRDS);
  bCam.position.set(0, 0, 4); bCam.lookAt(0, 0.6, -10); bCam.updateProjectionMatrix();
  birds.forEach(b => { const x = b.x + lerp(-30, 30, u) + 4 * Math.sin(b.ph); b.g.position.set(x, b.y + 0.3 * Math.sin(t * 2 + b.ph), b.z); b.g.rotation.set(0, -Math.PI / 2, 0); const f = 0.7 * Math.sin(t * 9 + b.ph); b.wr.rotation.z = f; b.wl.rotation.z = -f; });
}

