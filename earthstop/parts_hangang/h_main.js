// =================== look test (temporary): ?v= view ===================
function heroSit(t) { const P = hero; P.outer.position.set(HERO_MAT.x - 0.1, 0.17, HERO_MAT.z + 0.15); P.outer.rotation.y = Math.PI + 0.55; sitPose(P, t, 0); }
function headW(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
window.renderAt = (t) => {
  const v = +(new URLSearchParams(location.search).get('v') || 0) + Math.floor(t);
  heroSit(t); CROWD.forEach((P, i) => sitPose(P, t, i)); hero.face(v === 1 ? 'happy' : 'neutral', t);
  // phone held up, filming the fountain
  hero.arms[1].rotation.set(-1.25, 0.15, 0.05); hero.elbows[1].rotation.x = -0.35; hero.arms[0].rotation.set(-0.2, 0, 0.1); hero.outer.updateMatrixWorld(true);
  const hand = V3(0, -0.28, 0.05); hero.elbows[1].localToWorld(hand); heroPhone.position.copy(hand); heroPhone.rotation.set(0, Math.PI - 0.15, 0);
  carsAt(t); const dry = v === 4; river.visible = riverFar.visible = !dry; setJets(t, 32, dry ? 0.8 : 1, dry ? BED_Y : WATER_Y); ferry.position.y = dry ? BED_Y + 1.2 : WATER_Y;
  const hd = headW(hero); dof(hCam, 1, 0); hRim.target.position.copy(hd); hRim.position.copy(hd).add(V3(-30, 6, -14));
  if (v === 0) { hCam.fov = 36; hCam.position.copy(hd).add(V3(2.2, 0.25, 2.2)); hCam.lookAt(-150, 6, -260); aimSun(0, 3); dof(hCam, hCam.position.distanceTo(hd), 9); }
  else if (v === 1) { hCam.fov = 30; hCam.position.copy(hd).add(V3(-1.25, -0.2, -0.75)); hCam.lookAt(hd.x, hd.y - 0.15, hd.z); aimSun(hd.x, hd.z); dof(hCam, hCam.position.distanceTo(hd), 14); }
  else if (v === 2) { hCam.fov = 40; hCam.position.set(60, 45, 60); hCam.lookAt(-400, 0, -330); aimSun(0, 3); }
  else if (v === 4) { hCam.fov = 40; hCam.position.set(60, 45, 60); hCam.lookAt(-400, 0, -330); aimSun(0, 3); }
  else { hCam.fov = 32; hCam.position.copy(hd).add(V3(0.7, 0.15, 0.4)); hCam.lookAt(hd.x - 30, hd.y + 1, hd.z - 25); aimSun(hd.x, hd.z); dof(hCam, 0.6, 10); }
  shootTo(RTA, hw, hCam); composite(0, 1.0, 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
