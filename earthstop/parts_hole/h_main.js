
// =================== cameras ===================
function yardCamera(t) {
  const sh = new THREE.Vector3(SUN_Y.x, 0, SUN_Y.z).normalize();             // look toward the low sun (backlit, golden)
  const side = new THREE.Vector3(-sh.z, 0, sh.x);
  const u = clamp(t / SHAFT, 0, 1);
  const pos = new THREE.Vector3().addScaledVector(sh, -lerp(1.75, 1.35, ease(u))).addScaledVector(side, 0.35); pos.y = lerp(1.05, 0.95, u);
  const look = new THREE.Vector3(0.05, -0.3, 0).addScaledVector(sh, 2.4).addScaledVector(side, -0.1);
  yCam.fov = 58; yCam.updateProjectionMatrix(); yCam.position.copy(pos); yCam.lookAt(look); yCam.updateMatrixWorld();
  return pos.distanceTo(new THREE.Vector3(0.2, 0, 0));
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels'].map(k => [k, $(k)]));
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(SHAFT - 0.6, SHAFT - 0.1, t);
  el.hud.style.opacity = 0; el.cap.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
function earthCamera(t) { const u = clamp((t - CUT) / (FALL - CUT), 0, 1); const d = lerp(8.2, 7.6, ease(u)), a = 0.12 * u;
  eCam.position.set(Math.sin(a) * d, lerp(2.4, 1.8, u), Math.cos(a) * d); eCam.lookAt(0, -0.42, 0); }
function oceanCamera(t) { const u = clamp((t - OCEAN) / (T_END - OCEAN), 0, 1); const sh = new THREE.Vector3(OSUN.x, 0, OSUN.z).normalize(); const side = new THREE.Vector3(-sh.z, 0, sh.x);
  oCam.position.set(0, lerp(1.4, 2.0, u), 0); oCam.lookAt(sh.clone().multiplyScalar(100).addScaledVector(side, 30).setY(4)); }
window.renderAt = (t) => {
  grain.uniforms.uT.value = t;
  if (t < SHAFT) { poseSpade(t); const fd = yardCamera(t);
    post(yard, yCam, { dof: { focus: fd, aperture: 0.0035, maxblur: 0.006 }, bloom: 0.25, exp: 0.85, con: 1.12, sat: 1.2, warm: 0.04 }); }
  else if (t < OCEAN) { earthCamera(t); layerU.uT.value = t; earthG.rotation.y = 0; traveler.position.set(0, 1.0 - 2 * smooth(FALL, RISE + 8, t), 0); travGlow.position.copy(traveler.position);
    post(space, eCam, { bloom: 0.45, bloomR: 0.5, bloomT: 1.1, exp: 1.0, con: 1.05, sat: 1.1 }); }
  else { oceanCamera(t); water.material.uniforms.time.value = t * 0.6;
    post(ocean, oCam, { bloom: 0.2, bloomR: 0.4, bloomT: 4.0, exp: 0.62, con: 1.14, sat: 1.22 }); }
  composer.render();
  updateDOM(t);
  return true;
};
window.sceneReady = (async () => { await buildYard(); await buildEarth(); await buildOcean(); await document.fonts.ready; window.renderAt(0); return true; })();
