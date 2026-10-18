// =================== one continuous era parameter E(t): 0 lava ... 9 today; everything blends with it ===================
const NAMES = ['lava', 'ocean', 'gren', 'taco', 'pang', 'rift', 'ice', 'woods', 'old', 'now'];
const TS = [LAVA, OCEAN, GREN, TACO, PANG, RIFT, ICE, WOODS, OLD, NOW];
const TR = 2.4;   // each era melts into the next over 2.4 s centred on the boundary
function eraE(t) { if (t < REW) return 9; if (t < LAVA) return 9 * (1 - ease((t - REW) / (LAVA - REW)));
  let E = 0; for (let b = 1; b < 10; b++) E += smooth(TS[b] - TR / 2, TS[b] + TR / 2, t); return E; }
const pE = (E, i) => clamp(1 - Math.abs(E - i), 0, 1);
const YA = [4.5e9, 4.0e9, 1.1e9, 4.5e8, 2.5e8, 2.01e8, 2.0e4, 417, 122, 0];
const LABEL = ['4.5 billion years ago', '4 billion years ago', '1.1 billion years ago', '450 million years ago', '250 million years ago', '201 million years ago', '20,000 years ago', '1609', '1904', 'Today'];
const SUBS = ['NO OXYGEN · NO LIFE ON LAND', 'NO PLANTS ON LAND YET', "NYC'S OLDEST ROCK (FORDHAM GNEISS)", 'MANHATTAN SCHIST · NEAR THE EQUATOR', 'SUPERCONTINENT PANGAEA', 'ATLANTIC STARTS TO OPEN', 'ICE ~1,000 FT THICK', 'MANNAHATTA', 'LONGACRE SQUARE → TIMES SQUARE', 'TIMES SQUARE'];
const LY = [3.2, 6, 11, 8, 11, 6, 16, 4.7, 16, 16];
function yearsText(E) { const i = Math.min(8, Math.floor(E)), f = E - i; if (f < 0.03) return LABEL[i]; if (f > 0.97) return LABEL[i + 1];
  const ya = Math.exp(lerp(Math.log(YA[i] + 1), Math.log(YA[i + 1] + 1), f)) - 1;
  if (ya < 1000) return String(Math.round(2026 - ya)); if (ya >= 1e9) return (ya / 1e9).toFixed(1) + ' billion years ago'; if (ya >= 1e6) return Math.round(ya / 1e6) + ' million years ago'; return fmt(Math.round(ya / 100) * 100) + ' years ago'; }
// ---- ground / water / sky blending
let lastE = -1;
function blendGround(E) { if (Math.abs(E - lastE) < 1e-5) return; lastE = E; const i = Math.min(8, Math.floor(E)), f = E - i; const A = KF[NAMES[i]], B = KF[NAMES[i + 1]];
  const pos = groundGeo.attributes.position, col = groundGeo.attributes.color; const n = GX.length;
  for (let k = 0; k < n; k++) { pos.array[k * 3 + 1] = A.h[k] + (B.h[k] - A.h[k]) * f; }
  for (let k = 0; k < n * 3; k++) col.array[k] = A.c[k] + (B.c[k] - A.c[k]) * f;
  pos.needsUpdate = true; col.needsUpdate = true; groundGeo.computeVertexNormals(); }
const WHIDE = { level: -90, color: new THREE.Color('#2b5866'), amp: 0 };
const _c1 = new THREE.Color(), _c2 = new THREE.Color(), _v = new THREE.Vector3();
function blendLook(E) { const i = Math.min(8, Math.floor(E)), f = E - i; const A = ERA[NAMES[i]].look, B = ERA[NAMES[i + 1]].look; const u = dome.material.uniforms;
  const C = (a, b) => _c1.set(a).lerp(_c2.set(b), f);
  u.uTop.value.copy(C(A.top, B.top)); u.uBot.value.copy(C(A.bot, B.bot)); u.uSunDir.value.copy(A.sunDir).normalize().lerp(_v.copy(B.sunDir).normalize(), f).normalize(); u.uSunCol.value.copy(C(A.sunCol, B.sunCol)); u.uSunSize.value = lerp(A.sunSize, B.sunSize, f);
  world.fog.color.copy(C(A.fog, B.fog)); world.fog.near = lerp(A.fogN, B.fogN, f); world.fog.far = lerp(A.fogF, B.fogF, f);
  hemi.color.copy(C(A.hemiS, B.hemiS)); hemi.groundColor.copy(C(A.hemiG, B.hemiG)); hemi.intensity = lerp(A.hemiI, B.hemiI, f);
  sun.color.copy(C(A.sunC, B.sunC)); sun.intensity = lerp(A.sunI, B.sunI, f); sun.position.copy(A.sunPos).lerp(B.sunPos, f);
  const WA = WKF[NAMES[i]] || { ...WHIDE, color: (WKF[NAMES[i + 1]] || WHIDE).color }, WB = WKF[NAMES[i + 1]] || { ...WHIDE, color: WA.color };
  const lvl = lerp(WA.level, WB.level, f); water.visible = lvl > -60; water.position.y = lvl; water.material.color.copy(WA.color).lerp(WB.color, f); water.userData.amp = lerp(WA.amp, WB.amp, f);
  return lerp(A.exp, B.exp, f); }
// ---- per-era motion (runs for every era that is at least partly present)
const _p = new THREE.Vector3();
function updateEras(E, t) {
  puffs.begin();
  const p = i => pE(E, i);
  ERA.lava.lavaMat.uniforms.uT.value = t; ERA.lava.lavaMat.uniforms.uCool.value = smooth(0.05, 0.75, E); ERA.lava.plane.visible = E < 1.4; ERA.lava.plane.position.y = lerp(0.6, -12, smooth(0.15, 1.2, E));
  if (water.visible) waves(water, t, water.userData.amp, 1);
  if (p(0) > 0) { smokeMat.uniforms.uTint.value.set('#5a3a30');
    for (const M_ of ERA.lava.meteors) { const ok = p(0) > 0.5; const k = (t - M_.t0) / 0.5; M_.m.visible = ok && k > 0 && k < 1; if (M_.m.visible) { M_.m.position.copy(M_.hit).addScaledVector(M_.dir, -(1 - k) * 1100 - 130); M_.m.lookAt(M_.m.position.clone().add(M_.dir)); }
      const f = t - (M_.t0 + 0.5); M_.fl.visible = ok && f > 0 && f < 1.0; if (M_.fl.visible) { M_.fl.position.copy(M_.hit); M_.fl.scale.setScalar(15 + f * 160); M_.fl.material.opacity = Math.pow(1 - f, 2); }
      for (let j = 0; j < 8; j++) { const age = f - j * 0.12; if (ok && age > 0 && age < 2.5) { _p.copy(M_.hit).add(V3((hash(j + M_.t0) - 0.5) * 60, age * 70, (hash(j * 3 + M_.t0) - 0.5) * 60)); puffs.add(_p, 60 + age * 90, 0.5 * (1 - age / 2.5)); } } } }
  if (p(3) > 0) { const u = clamp((t - TACO) / (PANG - TACO), 0, 1); smokeMat.uniforms.uTint.value.set('#8a8480');
    for (const v of ERA.taco.volcs) { v.vg.position.set(v.x - 300 * u, -10, v.z); if (p(3) < 0.6) continue; const top = V3(v.vg.position.x, v.h - 20, v.z);
      for (let k = 0; k < 14; k++) { const age = ((t * 0.18 + k / 14 + v.ph) % 1); _p.copy(top).add(V3(age * 140, age * 380, -age * 40)); puffs.add(_p, 50 + age * 260, 0.6 * (1 - age) * smooth(0, 0.08, age) * smooth(0.6, 0.9, p(3))); } } }
  if (p(5) > 0) { smokeMat.uniforms.uTint.value.set('#6a6460');
    for (const d of ERA.rift.dinos) { const x = d.x0 + d.v * (t - RIFT), ph = (t * d.v * 1.6 / d.s) + d.ph; d.d.position.set(x, -0.3 + Math.abs(Math.sin(ph)) * 0.08 * d.s, d.z); d.legs[0].rotation.z = Math.sin(ph) * 0.6; d.legs[1].rotation.z = -Math.sin(ph) * 0.6; }
    for (let k = 0; k < 18; k++) { const age = ((t * 0.12 + k / 18) % 1); _p.set(-500 + k * 55, 10 + age * 300, -1300 + age * 40); puffs.add(_p, 80 + age * 260, 0.45 * (1 - age) * p(5)); } }
  if (p(6) > 0) { const back = ease((t - (ICE + 4.7)) / 1.3), a2 = clamp((t - (ICE - 1.0)) / 4.6, 0, 1); ERA.ice.ice.position.z = t < ICE + 4.7 ? lerp(-2200, 12, a2 * a2) : lerp(12, -2400, back); ERA.ice.ghost.visible = t > ICE - 0.5 && t < ICE + 3.3; }
  if (p(7) > 0) for (const d of ERA.woods.deer) d.children[2].position.y = 1.85 - 0.5 * smooth(0.4, 0.6, (Math.sin(t * 0.9 + d.position.x) + 1) / 2);
  if (p(8) > 0) { poseCrowd(ERA.old.crowd, t); for (const c of ERA.old.carts) { const z = wrapR(c.z0 + c.v * t, -320, 20); c.g.position.set(c.x, 0, z); c.g.rotation.y = c.v > 0 ? -Math.PI / 2 : Math.PI / 2; c.legs.forEach((l, i) => l.rotation.z = Math.sin(t * 7 + i * 1.6) * 0.4); } ERA.old.trolley.position.set(-3.3, 0, -80 + 2.5 * (t - OLD)); }
  if (p(9) > 0) { poseCrowd(ERA.now.crowd, t); for (const c of ERA.now.taxis) { const dir = c.x > 0 ? 1 : -1; c.g.position.set(c.x, 0, wrapR(c.z0 + dir * c.v * t, -500, 20)); c.g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; } }
  puffs.end();
}
// ---- objects grow out of the ground (and sink back) with their era's presence, each on its own random threshold
function growEras(E) {
  for (let i = 0; i < 10; i++) { const g = ERA[NAMES[i]].g, pr = pE(E, i); g.visible = pr > 0.001; if (!g.visible) continue;
    for (const ch of g.children) { const u = ch.userData; if (u.noGrow) continue;
      if (u.th === undefined) { u.th = 0.15 + hash(ch.id * 1.37 + i) * 0.7; u.by = ch.position.y; u.bs = ch.scale.clone(); }
      if (u.sink) { ch.position.y = u.by - (1 - smooth(0.35, 0.9, pr)) * 1.5; ch.visible = true; continue; }
      const s = smooth(u.th - 0.13, u.th + 0.13, pr); const baseY = u.anim ? ch.position.y : u.by;
      ch.visible = s > 0.002 && !u.poseHidden; if (!ch.visible) continue;
      ch.position.y = baseY * s; ch.scale.set(u.bs.x * (0.3 + 0.7 * s), u.bs.y * s, u.bs.z * (0.3 + 0.7 * s)); } }
}
function worldCamera(E, t) { const i = Math.min(8, Math.floor(E)), f = E - i; let ly = lerp(LY[i], LY[i + 1], f);
  if (pE(E, 6) > 0.5) ly = lerp(ly, 6, smooth(ICE + 2.5, ICE + 3.4, t));
  cam.fov = lerp(62, 64, smooth(7, 8.5, E)); cam.position.set(0.6 * Math.sin(t * 0.13), 2.2, 8 - 0.04 * t); cam.lookAt(1.5 * Math.sin(t * 0.09), ly, -80); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.6, 6.8, '4.5 billion years ago:<br>Earth is lava.'],
  [6.9, 8.6, 'Meteorites pound<br>the surface.'],
  [9.8, 11.6, 'Then: oceans.'],
  [11.7, 13.7, 'No plants on land<br>for 4 billion years.'],
  [14.8, 16.5, '1.1 billion years ago:<br>mountains rise.'],
  [16.6, 18.6, "NYC's oldest rock forms."],
  [19.8, 22.4, '450 million years ago:<br>volcanic islands crash in.'],
  [22.5, 24.0, "That crash makes<br>Manhattan's bedrock."],
  [24.1, 25.7, 'And this spot is<br>near the equator.'],
  [26.8, 28.8, "Now you're inside<br>the supercontinent Pangaea."],
  [28.9, 31.2, 'Mountains as tall<br>as the Andes.'],
  [32.2, 34.6, '201 million years ago:<br>the Atlantic starts to open.'],
  [34.7, 37.2, 'Dinosaur footprints from then<br>are still in New Jersey.'],
  [38.2, 40.7, '20,000 years ago:<br>a wall of ice.'],
  [40.8, 43.2, 'About 1,000 feet thick —<br>almost the Empire State Building.'],
  [44.3, 46.5, '1609: a forest.<br>A Lenape trail runs right here…'],
  [46.6, 49.2, '…it will become Broadway.'],
  [50.3, 52.6, '1904: it gets its name —<br>Times Square.'],
  [52.7, 55.2, 'Broadway is older than the grid —<br>that\'s why it cuts across.'],
  [56.2, 58.4, 'Same spot.<br>4.5 billion years.'],
];
function updateDOM(t, E) {
  el.title.style.opacity = 1 - smooth(3.0, 3.5, t);
  const show = t >= REW && t < T_END; el.stat.innerHTML = '<b></b>THIS SPOT · BROADWAY & 7TH AVE'; el.lab.textContent = ''; el.val.textContent = yearsText(E); el.sub.textContent = t >= LAVA ? SUBS[Math.round(E)] : '';
  el.hud.style.opacity = show ? 1 - smooth(T_END, T_END + 0.4, t) : 0; el.val.style.fontSize = el.val.textContent.length > 16 ? '66px' : '98px';
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.flash.style.opacity = 0;
  const inIce = fadeWin(t, ICE + 3.45, ICE + 4.85, 0.3); el.veil.style.background = 'linear-gradient(180deg,#bfe0f4,#e8f4fb 60%,#cfe6f2)'; el.veil.style.opacity = inIce;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
window.renderAt = (t) => {
  const E = DEBUG !== null && DEBUG !== undefined && !isNaN(+DEBUG) ? +DEBUG : eraE(t);
  blendGround(E); const exp = blendLook(E); updateEras(E, t); growEras(E); worldCamera(E, t);
  smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shoot(world, cam, exp);
  updateDOM(t, E); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
