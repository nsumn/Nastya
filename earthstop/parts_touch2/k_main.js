// =================== scene schedule: [start, id, dissolve] — the café -> atoms change is the scope reveal, so that boundary has no dissolve ===================
const SCN = { cafe: [t => updateCafe(t, 'start'), t => cafeCamera(t, 'start'), cafe, () => cfCam, 1.0], atoms: [updateAtoms, atomCamera, atomS, () => atCam, 1.2], yard: [updateYard, yardCamera, yard, () => ydCam, 1.0],
  port: [updatePort, portCamera, port, () => ptCam, 1.0], earth: [updateEarth, earthCamera, earthS, () => eaCam, 1.1], fuse: [updateFuse, fuseCamera, fuseS, () => fuCam, 1.1], cafeEnd: [t => updateCafe(t, 'end'), t => cafeCamera(t, 'end'), cafe, () => cfCam, 1.0] };
const SEQ = [[0, 'cafe', 0.7], [ATOM, 'atoms', 0], [HAM, 'yard', 0.7], [HUG, 'port', 0.7], [EARTH, 'earth', 0.7], [FUSE, 'fuse', 0.7], [ENDS, 'cafeEnd', 0.7]];
function shootScene(id, t, rt) { const S = SCN[id]; S[0](t); S[1](t); const c = S[3](); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, S[2], c); return S[4]; }
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'What if you could<br><span class="hl">REALLY</span> touch someone?'; el.endT.innerHTML = 'What if you could<br><span class="hl">REALLY</span> touch someone?';
el.endS.innerHTML = 'TOUCH = ELECTRON CLOUDS REPELLING (ELECTROMAGNETISM + PAULI EXCLUSION).<br>THE GAP IS ABOUT 1 ÅNGSTRÖM = 0.00000001 CM.<br>A FALL THROUGH EARTH IN A VACUUM TUBE: ~38 MIN ONE WAY (PREM MODEL).';
const captions = [
  [4.3, 7.8, 'Here’s the thing:<br>you never have.'],
  [8.3, 11.4, 'Atoms are almost<br>all empty space.'],
  [11.6, 14.8, 'That “touch” is electrons<br>shoving each other away.'],
  [15.4, 18.4, 'You’re not lying<br>in your hammock.'],
  [18.6, 21.8, 'You’re floating above it —<br>one atom up.'],
  [22.4, 24.9, 'Every hug in your life…'],
  [25.1, 27.9, '…had a gap of<br>0.00000001 cm.'],
  [28.2, 30.8, 'So let’s turn it off.'],
  [31.3, 33.9, 'You’d sink through<br>the floor…'],
  [34.1, 36.8, '…and keep going.'],
  [37.6, 42.6, '38 minutes to the<br>other side of Earth.'],
  [43.0, 48.6, 'Then back. And again.<br>Forever — no air in the way.'],
  [49.4, 52.6, 'Push even harder<br>and the nuclei fuse.'],
  [52.8, 55.8, 'That takes<br>Sun-core conditions.'],
  [56.4, 59.8, 'That tiny gap makes<br>everything solid.'],
  [60.0, 63.8, 'And it’s the closest two<br>people can ever get.'],
];
const BLUE = '<b style="background:#5ad8ff"></b>', RED = '<b style="background:#ff6a5a"></b>', GREEN = '<b style="background:#5fd27a"></b>';
const SCALES = [[LENS, '1 mm'], [LENS + 1.3, '0.1 mm'], [LENS + 2.5, '10 µm'], [LENS + 3.3, '1 µm'], [ATOM, '10 nm'], [ATOM + 1.2, '1 nm'], [ATOM + 2.2, '0.1 nm']];
function hudAt(t) {
  if (t < 3.8) return null;
  if (t < ATOM + 2.6) { let s = SCALES[0][1]; for (const [a, l] of SCALES) if (t >= a) s = l; return [BLUE + 'ZOOMING IN', 'SCALE', s, t < ATOM ? 'SKIN → CELLS → MOLECULES' : 'ATOMS']; }
  if (t < HAM) return ['<b></b>CONTACT?', 'GAP', '~0.1 nm', 'ELECTRONS PUSHING BACK'];
  if (t < HUG) return ['<b></b>YOUR HAMMOCK', 'GAP', '~1 atom', 'YOU NEVER QUITE TOUCH IT'];
  if (t < OFF) return ['<b></b>ARRIVALS', 'GAP', '~0.1 nm', 'EVEN IN THE TIGHTEST HUG'];
  if (t < SINK) { const p = Math.round(100 * (1 - smooth(OFF + 0.3, OFF + 2.0, t))); return [RED + 'PHYSICS SETTINGS', 'ELECTRON PUSH', p + '%', p > 0 ? 'TURNING OFF…' : 'OFF']; }
  if (t < EARTH) return [RED + 'ELECTRON PUSH: OFF', 'DEPTH', fmt(-fallY(t) * 3.281) + ' ft', 'FALLING THROUGH ROCK'];
  if (t < FUSE) { const u = Math.max(0, (t - FALL0) / LEG), leg = Math.floor(u); return [BLUE + (leg % 2 ? 'INDIAN OCEAN → CHICAGO' : 'CHICAGO → INDIAN OCEAN'), 'TIME', Math.round(u * 38.3) + ' min', 'TOP SPEED ~22,000 MPH']; }
  if (t < ENDS) return ['<b></b>SQUEEZE HARDER', 'NEEDS', '27 million °F', 'LIKE THE SUN’S CORE'];
  return [GREEN + 'EVERY TOUCH, EVER', 'GAP', '~0.1 nm', 'THE CLOSEST WE CAN GET']; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(T_END - 0.4, T_END, t)) * smooth(3.8, 4.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t); }
// =================== render ===================
const _sc = new THREE.Vector3();
window.renderAt = (t) => { const u = compMat.uniforms; u.uPixOn.value = 0; u.uCircOn.value = 0; u.uRed.value = 0;
  if (t >= LENS + 0.3 && t < ATOM) {   // the scope: atoms inside a growing circle centred on the contact point
    const eA = shootScene('cafe', t, RTA), eB = shootScene('atoms', t, RTB); _sc.set(0, 0.0, 0).project(cfCam);
    u.uCirc.value.set(_sc.x * 0.5 + 0.5, _sc.y * 0.5 + 0.5, 0.11 * smooth(LENS + 0.3, LENS + 1.2, t) + 1.25 * smooth(LENS + 2.4, ATOM, t) ** 2); u.uCircOn.value = 1; composite(1, eA, eB); updateDOM(t); return true; }
  let i = 0; while (i < SEQ.length - 1 && t >= SEQ[i + 1][0]) i++;
  let A = SEQ[i][1], B = null, mix = 0;
  if (i < SEQ.length - 1 && SEQ[i + 1][2] > 0 && t > SEQ[i + 1][0] - SEQ[i + 1][2] / 2) { B = SEQ[i + 1][1]; mix = smooth(SEQ[i + 1][0] - SEQ[i + 1][2] / 2, SEQ[i + 1][0] + SEQ[i + 1][2] / 2, t); }
  else if (i > 0 && SEQ[i][2] > 0 && t < SEQ[i][0] + SEQ[i][2] / 2) { B = A; A = SEQ[i - 1][1]; mix = smooth(SEQ[i][0] - SEQ[i][2] / 2, SEQ[i][0] + SEQ[i][2] / 2, t); }
  let eA = 1, eB = 1; if (!B || mix < 1) eA = shootScene(A, t, RTA); if (B) eB = shootScene(B, t, RTB);
  u.uRed.value = 0.18 * fadeWin(t, OFF + 0.4, SINK + 0.6, 0.5);   // a warning tint while the push is switched off
  composite(B ? mix : 0, eA, eB); updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth(); window.renderAt(0); return true; })();
