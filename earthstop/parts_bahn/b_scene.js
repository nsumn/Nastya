// =================== PLATFORM (meters): a long-distance platform at golden hour — the departure board, the station clock, the track, waiting people ===================
const plat = new THREE.Scene(); plat.background = new THREE.Color('#f2c89a'); plat.fog = new THREE.Fog(0xf2c89a, 40, 200); const plCam = new THREE.PerspectiveCamera(50, W / H, 0.05, 400);
plat.add(new THREE.HemisphereLight(0xfff0e0, 0x5a5048, 0.9));
const sunP = new THREE.DirectionalLight(0xffd0a0, 2.4); sunP.position.set(18, 14, 10); sunP.castShadow = true; sunP.shadow.mapSize.set(2048, 2048); sunP.shadow.bias = -0.0004; Object.assign(sunP.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 80 }); plat.add(sunP, sunP.target);
{ const ground = mesh(new THREE.PlaneGeometry(400, 400), M('#6a6058', { roughness: 1 }), false, true); ground.rotation.x = -Math.PI / 2; plat.add(ground);
  const ballast = mesh(new THREE.BoxGeometry(4, 0.2, 300), M('#8a8278', { roughness: 1 }), false, true); ballast.position.set(-2.5, 0.1, -100); plat.add(ballast);
  for (const x of [-3.22, -1.78]) { const r = mesh(new THREE.BoxGeometry(0.08, 0.15, 300), M('#b8b8c0', { metalness: 0.7, roughness: 0.3 })); r.position.set(x, 0.28, -100); plat.add(r); }
  for (let z = 30; z > -250; z -= 0.65) { const sl = mesh(new THREE.BoxGeometry(2.6, 0.1, 0.25), M('#6a5a48'), false, true); sl.position.set(-2.5, 0.2, z); plat.add(sl); }
  const pf = mesh(new THREE.BoxGeometry(8, 0.76, 120), M('#c8c4bc', { roughness: 0.85 }), false, true); pf.position.set(3, 0.38, -40); plat.add(pf);
  const edge = mesh(new THREE.BoxGeometry(0.12, 0.01, 120), M('#f2f2f2'), false, true); edge.position.set(-0.4, 0.765, -40); plat.add(edge);
  const tactile = mesh(new THREE.BoxGeometry(0.3, 0.012, 120), M('#e8c840'), false, true); tactile.position.set(0.2, 0.767, -40); plat.add(tactile);
  bx(8.6, 0.25, 70, '#9a9ea8', 3, 5.4, -20, plat); for (let z = 12; z > -55; z -= 9) bx(0.3, 4.7, 0.3, '#4a4e58', 4.5, 3.05, z, plat);
  for (const z of [-6, -16, -28]) { bx(1.6, 0.08, 0.45, '#8a5a3a', 5.6, 1.2, z, plat); bx(1.6, 0.4, 0.06, '#8a5a3a', 5.6, 1.45, z - 0.2, plat); bx(0.08, 0.44, 0.4, '#2a2a30', 5.0, 0.98, z, plat); bx(0.08, 0.44, 0.4, '#2a2a30', 6.2, 0.98, z, plat); } }
// the departure board: redrawn every frame, each row flips from a delay to a green "pünktlich"
const brdCv = document.createElement('canvas'); brdCv.width = 1024; brdCv.height = 420; const brdTex = new THREE.CanvasTexture(brdCv); brdTex.colorSpace = THREE.SRGBColorSpace; brdTex.anisotropy = 8;
const ROWS = [['14:02', 'ICE', 'Berlin Hbf', '+25'], ['14:10', 'IC', 'Köln Hbf', '+40'], ['14:16', 'ICE', 'München Hbf', '+15'], ['14:31', 'ICE', 'Hamburg Hbf', 'fällt aus']];
const flipAt = r => BOARD + 0.6 + r * 0.45;
function drawBoard(t) { const g = brdCv.getContext('2d'); g.fillStyle = '#0c1c4c'; g.fillRect(0, 0, 1024, 420); g.fillStyle = '#ffffff'; g.font = 'bold 34px Inter, sans-serif'; g.fillText('Abfahrt', 30, 52); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(30, 70, 964, 3);
  ROWS.forEach((r, i) => { const y = 132 + i * 80, f = smooth(flipAt(i), flipAt(i) + 0.25, t), squash = Math.abs(Math.cos(Math.PI * clamp((t - flipAt(i)) / 0.25, 0, 1)));
    g.save(); g.translate(0, y - 20); g.scale(1, f > 0 && f < 1 ? Math.max(0.05, squash) : 1); g.translate(0, -(y - 20));
    g.fillStyle = '#ffffff'; g.font = '40px Inter, sans-serif'; g.fillText(r[0], 30, y); g.fillText(r[1], 170, y); g.fillText(r[2], 290, y);
    const ok = t >= flipAt(i) + 0.12; g.fillStyle = ok ? '#5fd27a' : '#ff6a5a'; g.font = 'bold 40px Inter, sans-serif'; g.textAlign = 'right'; g.fillText(ok ? 'pünktlich' : r[3], 994, y); g.textAlign = 'left'; g.restore(); });
  brdTex.needsUpdate = true; }
const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.48), new THREE.MeshBasicMaterial({ map: brdTex, color: new THREE.Color(1.25, 1.25, 1.25) })); board.position.set(2.2, 3.7, -4); plat.add(board);
bx(3.8, 1.62, 0.12, '#2a2e36', 2.2, 3.7, -4.07, plat); bx(0.08, 1.6, 0.08, '#2a2e36', 1.0, 5.0, -4.07, plat); bx(0.08, 1.6, 0.08, '#2a2e36', 3.4, 5.0, -4.07, plat);
// the station clock (no ticking sound — the second hand sweeps)
const clockG = grp(4.5, 3.05, -0.4, 0, plat);
{ const face = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.fillStyle = '#111'; for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0; g.save(); g.translate(128, 128); g.rotate(a); g.fillRect(-(big ? 4 : 1.5), -118, big ? 8 : 3, big ? 26 : 10); g.restore(); } });
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshBasicMaterial({ map: face, color: new THREE.Color(1.15, 1.15, 1.15) })); clockG.add(f);
  const rim = mesh(new THREE.TorusGeometry(0.51, 0.04, 8, 48), M('#1a1a1e')); clockG.add(rim); bx(0.06, 1.8, 0.06, '#2a2a30', 0, 1.4, -0.05, clockG); }
const hand = (len, w, col, z) => { const p = grp(0, 0, z, 0, clockG); bx(w, len, 0.01, col, 0, len / 2 - 0.05, 0, p); return p; };
const hH = hand(0.28, 0.05, '#111', 0.01), mH = hand(0.42, 0.035, '#111', 0.02), sH = hand(0.44, 0.012, '#d82020', 0.03);
// clock time in seconds since midnight: running fast up to 14:07:50, sweeping through the "5:59" gag, then normal again
const SCHED = 14 * 3600 + 2 * 60;
const clockTime = t => t < CLOCK ? 14 * 3600 + 7 * 60 + 30 + 2.5 * t : t < ARRIVE ? SCHED + 350 + (t - CLOCK) * 2.4 : SCHED + 362 + (t - ARRIVE) * 1;
// waiting people + the train (white body, red band, no logos)
const waiting = []; for (let k = 0; k < 9; k++) { const p = makePerson(rnd); plat.add(p.outer); waiting.push({ p, x: R(1.2, 4.0), z: R(-20, 2), ry: R(-2.2, -0.9) }); }
const train = new THREE.Group(); plat.add(train);
{ const W2 = 2.9, H2 = 3.6; for (let c = 0; c < 4; c++) { const z0 = -c * 26.5; const car = bx(W2, H2, 26, '#f4f4f2', 0, 0.6 + H2 / 2, z0 - 13, train, { roughness: 0.4 }); bx(W2 + 0.02, 0.28, 26, '#d8202a', 0, 1.35, z0 - 13, train);
    const win = bx(W2 + 0.03, 0.75, 22, '#1a2230', 0, 2.75, z0 - 13, train, { roughness: 0.15, metalness: 0.3 }); for (const dz of [-3, -23]) bx(W2 + 0.04, 2.1, 1.3, '#d8d8d4', 0, 1.75, z0 + dz, train); }
  const nose = mesh(new THREE.CylinderGeometry(0.01, 1.45, 5, 4, 1), M('#f4f4f2', { roughness: 0.4 })); nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.scale.set(1, 1, 0.9); nose.position.set(0, 2.1, 2.4); train.add(nose);
  const shield = bx(2.0, 0.7, 0.05, '#1a2230', 0, 2.9, 0.6, train); shield.rotation.x = -0.5;
  for (const x of [-0.8, 0.8]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.6) })); hl.position.set(x, 1.3, 2.6); train.add(hl); } }
train.position.x = -2.5;
const arriveZ = t => { const u = clamp((t - ARRIVE + 0.4) / 3.0, 0, 1); return lerp(-170, 2, 1 - (1 - u) * (1 - u)); };   // decelerates into the platform, stops on time
function updatePlat(t) { drawBoard(t);
  const s = clockTime(t), sec = s % 60, min = (s / 60) % 60, hr = (s / 3600) % 12; sH.rotation.z = -sec / 60 * Math.PI * 2; mH.rotation.z = -min / 60 * Math.PI * 2; hH.rotation.z = -hr / 12 * Math.PI * 2;
  train.position.z = arriveZ(t); train.visible = t > ARRIVE - 0.8;
  const relief = smooth(BOARD + 0.6, BOARD + 2.4, t), board2 = smooth(ARRIVE + 2.6, ARRIVE + 4.6, t);
  waiting.forEach((Wt, k) => { const P = Wt.p; P.root.rotation.set(0, 0, 0); poseIdle(P, t, k);
    const sigh = (1 - relief) * (0.5 + 0.5 * Math.sin(t * 2 + k)); P.root.rotation.x = 0.12 * sigh; P.arms[0].rotation.x = -0.4 * sigh; P.arms[1].rotation.x = -0.4 * sigh;
    if (board2 > 0) { const x = lerp(Wt.x, -0.2, board2), z = Wt.z; P.outer.position.set(x, 0.95 + 0.76, z); P.outer.rotation.y = -Math.PI / 2; poseWalk(P, t * 8 + k, board2 < 1 ? 1 : 0); P.outer.visible = board2 < 0.97 || k % 3 === 0; }
    else { P.outer.position.set(Wt.x, 0.95 + 0.76, Wt.z); P.outer.rotation.y = Wt.ry + 0.8 * relief * Math.sin(k); P.outer.visible = true; } }); }
// camera keyframes: wide -> the board -> the clock -> the arrival
const KF = [[0, [6.0, 2.3, 12], [0.6, 2.8, -6]], [BOARD - 0.4, [5.4, 2.6, 9.5], [1.0, 3.0, -6]], [BOARD + 0.6, [2.2, 1.9, 4.4], [2.2, 2.55, -4]], [CLOCK - 0.6, [2.2, 1.9, 4.0], [2.2, 2.55, -4]],
  [CLOCK + 0.5, [4.5, 2.35, 2.6], [4.5, 2.6, -0.4]], [ARRIVE - 0.6, [4.5, 2.35, 2.4], [4.5, 2.6, -0.4]], [ARRIVE + 0.8, [3.4, 2.2, 11], [-2.0, 2.0, -12]], [T_END, [3.3, 2.1, 9.8], [-2.1, 2.0, -12]]];
function platCamera(t) { let i = 0; while (i < KF.length - 2 && t >= KF[i + 1][0]) i++; const [a, pa, la] = KF[i], [b, pb, lb] = KF[i + 1], k = ease(clamp((t - a) / (b - a), 0, 1));
  plCam.position.set(lerp(pa[0], pb[0], k), lerp(pa[1], pb[1], k), lerp(pa[2], pb[2], k)); plCam.lookAt(lerp(la[0], lb[0], k), lerp(la[1], lb[1], k), lerp(la[2], lb[2], k)); plCam.fov = 50; }
// =================== DOM + render ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'end', 'endT', 'endS', 'hud'].map(k => [k, $(k)]));
el.title.innerHTML = 'Was wäre, wenn die<br><span class="hl">Deutsche Bahn</span><br>immer pünktlich wäre?'; el.endT.innerHTML = 'Was wäre, wenn die <span class="hl">Deutsche Bahn</span> immer pünktlich wäre?';
el.endS.innerHTML = 'DB FERNVERKEHR 2025: ~60 % PÜNKTLICH (2015: 74 %).<br>PÜNKTLICH = UNTER 6 MINUTEN ZU SPÄT, AUSFÄLLE NICHT GEZÄHLT.<br>ZIEL DES BUNDES: 70 % BIS 2029.';
const captions = [
  [3.4, 7.8, 'Heute: nur ~60 % der<br>Fernzüge sind pünktlich.'],
  [8.4, 12.8, '„Pünktlich“ heißt: unter<br>6 Minuten zu spät.<br>Ausfälle zählen gar nicht.'],
  [13.4, 17.8, 'Jeden Tag ~368.000 Fernreisende —<br>und keiner verpasst<br>den Anschluss.'],
];
const mmss = s => `+${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function hudAt(t) {
  if (t < 0.9) return null;
  if (t < BOARD) return ['<b></b>FERNVERKEHR · HEUTE', 'ICE NACH BERLIN', '+25 min', 'SCHON WIEDER'];
  if (t < CLOCK) return ['<b></b>DB FERNVERKEHR 2025', 'PÜNKTLICH', '~60 %', '2015 WAREN ES 74 %'];
  if (t < ARRIVE) { const d = clockTime(t) - SCHED; return [d < 360 ? '<b style="background:#5fd27a"></b>DB-DEFINITION' : '<b></b>DB-DEFINITION', 'ANKUNFT', mmss(d), d < 360 ? 'ZÄHLT NOCH ALS PÜNKTLICH' : 'JETZT ERST VERSPÄTET']; }
  if (t < CARD) return ['<b style="background:#5fd27a"></b>WAS WÄRE, WENN …', 'FERNREISENDE / TAG', '~368.000', 'Ø 2025 · ALLE PÜNKTLICH']; return null; }
function updateDOM(t) { el.title.style.opacity = 1 - smooth(2.6, 3.1, t);
  const h = hudAt(t); el.hud.style.opacity = h ? (1 - smooth(CARD - 0.3, CARD, t)) * smooth(0.8, 1.3, t) : 0; if (h) { el.stat.innerHTML = h[0]; el.lab.textContent = h[1]; el.val.textContent = h[2]; el.sub.textContent = h[3]; el.val.style.fontSize = h[2].length > 8 ? '80px' : ''; }
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(CARD, CARD + 0.4, t); el.endT.style.opacity = smooth(CARD + 0.2, CARD + 0.6, t); el.endS.style.opacity = smooth(CARD + 0.4, CARD + 0.8, t); }
window.renderAt = (t) => { updatePlat(t); platCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(plCam.fov * Math.PI / 360)); shootTo(RTA, plat, plCam);
  compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0.25 * fadeWin(t, CLOCK + 4.1, ARRIVE - 0.2, 0.2) * (clockTime(t) - SCHED >= 360 ? 1 : 0); composite(0, 1.0, 1.0); updateDOM(t); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
