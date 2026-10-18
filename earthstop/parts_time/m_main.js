// =================== era timeline ===================
const ORDER = [['lava', LAVA], ['ocean', OCEAN], ['gren', GREN], ['taco', TACO], ['pang', PANG], ['rift', RIFT], ['ice', ICE], ['woods', WOODS], ['old', OLD], ['now', NOW]];
const REWIND = ['now', 'old', 'woods', 'ice', 'rift', 'pang', 'taco', 'gren', 'ocean', 'lava'];
function eraAt(t) { if (t < REW) return 'now'; if (t < LAVA) return REWIND[Math.min(9, Math.floor((t - REW) / (LAVA - REW) * 10))]; let e = 'lava'; for (const [n, T] of ORDER) if (t >= T) e = n; return e; }
const YEARS = { lava: '4.5 billion years ago', ocean: '4 billion years ago', gren: '1.1 billion years ago', taco: '450 million years ago', pang: '250 million years ago', rift: '201 million years ago', ice: '20,000 years ago', woods: '1609', old: '1904', now: 'Today' };
const SUBS = { lava: 'NO OXYGEN · NO LIFE ON LAND', ocean: 'NO PLANTS ON LAND YET', gren: "NYC'S OLDEST ROCK (FORDHAM GNEISS)", taco: 'MANHATTAN SCHIST · NEAR THE EQUATOR', pang: 'SUPERCONTINENT PANGAEA', rift: 'ATLANTIC STARTS TO OPEN', ice: 'ICE ~1,000 FT THICK', woods: 'MANNAHATTA', old: 'LONGACRE SQUARE → TIMES SQUARE', now: 'TIMES SQUARE' };
let curEra = '';
function setEra(e) { if (e === curEra) return; curEra = e; for (const k in ERA) ERA[k].g.visible = k === e; const L = ERA[e].look; const u = dome.material.uniforms;
  u.uTop.value.set(L.top); u.uBot.value.set(L.bot); u.uSunDir.value.copy(L.sunDir).normalize(); u.uSunCol.value.set(L.sunCol); u.uSunSize.value = L.sunSize;
  world.fog.color.set(L.fog); world.fog.near = L.fogN; world.fog.far = L.fogF; hemi.color.set(L.hemiS); hemi.groundColor.set(L.hemiG); hemi.intensity = L.hemiI;
  sun.color.set(L.sunC); sun.intensity = L.sunI; sun.position.copy(L.sunPos); }
// =================== per-era motion ===================
const _p = new THREE.Vector3();
function updateEra(e, t) {
  puffs.begin();
  if (e === 'lava') { ERA.lava.lavaMat.uniforms.uT.value = t; smokeMat.uniforms.uTint.value.set('#5a3a30');
    for (const M_ of ERA.lava.meteors) { const k = (t - M_.t0) / 0.5; M_.m.visible = k > 0 && k < 1; if (M_.m.visible) { M_.m.position.copy(M_.hit).addScaledVector(M_.dir, -(1 - k) * 1100 - 130); M_.m.lookAt(M_.m.position.clone().add(M_.dir)); }
      const f = t - (M_.t0 + 0.5); M_.fl.visible = f > 0 && f < 1.0; if (M_.fl.visible) { M_.fl.position.copy(M_.hit); M_.fl.scale.setScalar(15 + f * 160); M_.fl.material.opacity = Math.pow(1 - f, 2); }
      for (let j = 0; j < 8; j++) { const age = f - j * 0.12; if (age > 0 && age < 2.5) { _p.copy(M_.hit).add(V3((hash(j + M_.t0) - 0.5) * 60, age * 70, (hash(j * 3 + M_.t0) - 0.5) * 60)); puffs.add(_p, 60 + age * 90, 0.5 * (1 - age / 2.5)); } } } }
  else if (e === 'ocean') waves(ERA.ocean.sea, t, 1.3, 1);
  else if (e === 'gren') ERA.gren.t.scale.y = lerp(0.1, 1, ease((t - GREN) / (TACO - GREN - 0.3)));
  else if (e === 'taco') { waves(ERA.taco.sea, t, 0.35, 1.6); const u = clamp((t - TACO) / (PANG - TACO), 0, 1); smokeMat.uniforms.uTint.value.set('#8a8480');
    for (const v of ERA.taco.volcs) { v.vg.position.set(v.x - 300 * u, -40 * (1 - u), v.z); const top = V3(v.vg.position.x, v.vg.position.y + v.h - 10, v.z);
      for (let k = 0; k < 14; k++) { const age = ((t * 0.18 + k / 14 + v.ph) % 1); _p.copy(top).add(V3(age * 140, age * 380, -age * 40)); puffs.add(_p, 50 + age * 260, 0.6 * (1 - age) * smooth(0, 0.08, age)); } } }
  else if (e === 'rift') { waves(ERA.rift.lake, t, 0.12, 2.5); smokeMat.uniforms.uTint.value.set('#6a6460');
    for (const d of ERA.rift.dinos) { const x = d.x0 + d.v * (t - RIFT), ph = (t * d.v * 1.6 / d.s) + d.ph; d.d.position.set(x, -0.3 + Math.abs(Math.sin(ph)) * 0.08 * d.s, d.z); d.d.rotation.y = 0; d.legs[0].rotation.z = Math.sin(ph) * 0.6; d.legs[1].rotation.z = -Math.sin(ph) * 0.6; }
    for (let k = 0; k < 18; k++) { const age = ((t * 0.12 + k / 18) % 1); _p.set(-500 + k * 55, 10 + age * 300, -1300 + age * 40); puffs.add(_p, 80 + age * 260, 0.45 * (1 - age)); } }
  else if (e === 'ice') { const adv = ease((t - ICE) / 3.6), back = ease((t - (ICE + 4.7)) / 1.3); const a2 = clamp((t - ICE) / 3.6, 0, 1); ERA.ice.ice.position.z = t < ICE + 4.7 ? lerp(-1700, 12, a2 * a2) : lerp(12, -1600, back); ERA.ice.ghost.visible = t < ICE + 3.3; }
  else if (e === 'woods') { for (const d of ERA.woods.deer) d.children[2].position.y = 1.85 - 0.5 * smooth(0.4, 0.6, (Math.sin(t * 0.9 + d.position.x) + 1) / 2); }
  else if (e === 'old') { poseCrowd(ERA.old.crowd, t); for (const c of ERA.old.carts) { const z = wrapR(c.z0 + c.v * t, -320, 20); c.g.position.set(c.x, 0, z); c.g.rotation.y = c.v > 0 ? -Math.PI / 2 : Math.PI / 2; c.legs.forEach((l, i) => l.rotation.z = Math.sin(t * 7 + i * 1.6) * 0.4); } ERA.old.trolley.position.z = -80 + 2.5 * (t - OLD); }
  else if (e === 'now') { poseCrowd(ERA.now.crowd, t); for (const c of ERA.now.taxis) { const dir = c.x > 0 ? 1 : -1; c.g.position.set(c.x, 0, wrapR(c.z0 + dir * c.v * t, -500, 20)); c.g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; } }
  puffs.end();
}
function worldCamera(e, t) { const L = ERA[e].look; let ly = L.camY + 4, lz = -80, fov = 62;
  if (e === 'gren' || e === 'pang') ly = L.camY + 9; if (e === 'ice') ly = L.camY + 14 * (1 - smooth(ICE + 2.5, ICE + 3.4, t)) + 4; if (e === 'now' || e === 'old') { ly = L.camY + 14; fov = 64; } if (e === 'woods') ly = L.camY + 2.5; if (e === 'taco') ly = L.camY + 6; if (e === 'lava') ly = L.camY + 1;
  cam.fov = fov; cam.position.set(0.6 * Math.sin(t * 0.13), L.camY, 8 - 0.15 * (t % 6)); cam.lookAt(1.5 * Math.sin(t * 0.09), ly, lz); }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.6, 6.8, '4.5 billion years ago:<br>Earth is lava.'],
  [6.9, 8.8, 'Meteorites pound<br>the surface.'],
  [9.3, 11.6, 'Then: oceans.'],
  [11.7, 13.8, 'No plants on land<br>for 4 billion years.'],
  [14.3, 16.5, '1.1 billion years ago:<br>mountains rise.'],
  [16.6, 18.8, "NYC's oldest rock forms."],
  [19.3, 22.4, '450 million years ago:<br>volcanic islands crash in.'],
  [22.5, 24.1, "That crash makes<br>Manhattan's bedrock."],
  [24.2, 25.8, 'And this spot is<br>near the equator.'],
  [26.3, 28.8, "Now you're inside<br>the supercontinent Pangaea."],
  [28.9, 31.3, 'Mountains as tall<br>as the Andes.'],
  [31.8, 34.6, '201 million years ago:<br>the Atlantic starts to open.'],
  [34.7, 37.3, 'Dinosaur footprints from then<br>are still in New Jersey.'],
  [37.8, 40.8, '20,000 years ago:<br>a wall of ice.'],
  [40.9, 43.3, 'About 1,000 feet thick —<br>almost the Empire State Building.'],
  [43.8, 46.4, '1609: a forest.<br>A Lenape trail runs right here…'],
  [46.5, 49.3, '…it will become Broadway.'],
  [49.8, 52.6, '1904: it gets its name —<br>Times Square.'],
  [52.7, 55.3, 'Broadway is older than the grid —<br>that\'s why it cuts across.'],
  [55.8, 58.3, 'Same spot.<br>4.5 billion years.'],
];
function yearsText(t, e) { if (t >= REW && t < LAVA) { const u = (t - REW) / (LAVA - REW); const y = Math.pow(10, lerp(1, Math.log10(4.5e9), u)); return y > 1e9 ? (y / 1e9).toFixed(1) + ' billion years ago' : y > 1e6 ? Math.round(y / 1e6) + ' million years ago' : fmt(y) + ' years ago'; } return YEARS[e]; }
function updateDOM(t, e) {
  el.title.style.opacity = 1 - smooth(3.0, 3.5, t);
  const show = t >= REW && t < T_END; el.stat.innerHTML = '<b></b>THIS SPOT · BROADWAY & 7TH AVE'; el.lab.textContent = ''; el.val.textContent = yearsText(t, e); el.sub.textContent = t >= LAVA ? SUBS[e] : '';
  el.hud.style.opacity = show ? 1 - smooth(T_END, T_END + 0.4, t) : 0; el.val.style.fontSize = el.val.textContent.length > 16 ? '66px' : '98px';
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  const fl = Math.max(...ORDER.map(([, T]) => fadeWin(t, T - 0.1, T + 0.28, 0.1)), t >= REW && t < LAVA ? 0.25 + 0.2 * Math.sin(t * 60) : 0);
  el.flash.style.opacity = fl * 0.75;
  // inside the ice: a blue-white veil
  const inIce = fadeWin(t, ICE + 3.45, ICE + 4.85, 0.25); el.veil.style.background = 'linear-gradient(180deg,#bfe0f4,#e8f4fb 60%,#cfe6f2)'; el.veil.style.opacity = inIce;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
window.renderAt = (t) => {
  const e = DEBUG && ERA[DEBUG] ? DEBUG : eraAt(t); setEra(e); updateEra(e, t); worldCamera(e, t);
  smokeMat.uniforms.uScale.value = H / (2 * Math.tan(cam.fov * Math.PI / 360)); shoot(world, cam, ERA[e].look.exp);
  updateDOM(t, e); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
