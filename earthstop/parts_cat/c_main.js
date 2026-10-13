
// =================== look test: t<1 human eye height, 1-2 cat day, 2-3 cat night ===================
const $ = id => document.getElementById(id);
window.renderAt = (t) => {
  grain.uniforms.uT.value = t; catPass.uniforms.uT.value = t;
  const cat = t >= 1, night = t >= 2;
  if (!cat) { rCam.fov = 55; rCam.position.set(0.9, 1.62, 2.4); rCam.lookAt(-0.2, 0.55, -1.2); }
  else { rCam.fov = 74; rCam.position.set(0.42, 0.2, 1.5); rCam.lookAt(-0.05, 0.3, -0.9); }
  rCam.updateProjectionMatrix();
  sun.intensity = night ? 1.1 : 6.0; sun.color.set(night ? '#8fa8ff' : '#ffe2b8'); room.background = night ? new THREE.Color('#0a1226') : room.userData.day; room.environmentIntensity = night ? 0.03 : 0.55; lampL.intensity = 0;
  catPass.uniforms.uCat.value = cat ? 1 : 0; catPass.uniforms.uNight.value = night ? 1 : 0;
  const fd = cat ? rCam.position.distanceTo(props.duck.position) : rCam.position.distanceTo(new THREE.Vector3(0.2, 0.4, 0));
  post(room, rCam, { dof: { focus: fd, aperture: cat ? 0.012 : 0.002, maxblur: cat ? 0.01 : 0.004 }, bloom: night ? 0.1 : 0.25, bloomT: 1.2, exp: night ? 1.0 : 0.9, con: 1.08, sat: 1.1, warm: cat ? 0 : 0.03 });
  composer.render();
  $('lbl').textContent = !cat ? 'HUMAN · 5 FT 4 IN' : night ? 'CAT · NIGHT (6× LESS LIGHT NEEDED)' : 'CAT · 10 IN OFF THE FLOOR';
  $('wh').style.opacity = 0;
  return true;
};
window.sceneReady = (async () => { await buildRoom(); await document.fonts.ready; window.renderAt(0); return true; })();
