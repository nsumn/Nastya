// =================== design frames (index_news.html?design=N) ===================
const $ = id => document.getElementById(id);
function card(img, name, role, x, y) { return `<div class="card" style="left:${x}px;top:${y}px"><img src="assets/news/photos/${img}.jpg"><div class="cn">${name}</div><div class="cr">${role}</div></div>`; }
function sticker(txt, pos, cls = '') { const v = pos.clone().project(mCam); const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; return `<div class="stk ${cls}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${txt}</div>`; }
function look(p, l, fov) { mCam.position.copy(p); mCam.lookAt(l); mCam.fov = fov; mCam.aspect = W / H; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld(); }
const BLUE = '#3d7dff', RED = '#ff4a4a';
window.renderAt = (t) => { clearPaint(); mapU.uT.value = t; let html = '';
  const d = +(DESIGN || 1);
  if (d === 1) { paint('Texas', BLUE, 0.95, 1.2); const tx = stPos('Texas', 2); look(tx.clone().add(V3(-28, 62, 92)), tx.clone().add(V3(0, 0, -6)), 34);
    html = sticker('TEXAS · FLIPPED', stPos('Texas', 14), 'b') + card('talarico', 'James Talarico', 'SENATOR-ELECT · TEXAS (D)', 170, 1380 - 600);
    $('stat').innerHTML = '<b></b>MIDTERMS 2026 · SENATE'; $('val').textContent = 'FIRST SINCE 1988'; $('sub').textContent = 'TEXAS ELECTS A DEMOCRAT';
    $('cap').innerHTML = 'Texas just elected a <span class="y">Democrat</span> to the Senate.'; }
  if (d === 2) { ['Texas', 'Ohio', 'North Carolina', 'Iowa', 'Kansas', 'Maine', 'South Carolina'].forEach(n => paint(n, BLUE, 0.95, 1.0)); ['Alaska', 'Mississippi'].forEach(n => paint(n, '#c8c8d0', 0.55, 0.6));
    const c = V3(MCX + 20, 0, MCZ + 6); look(c.clone().add(V3(0, 210, 150)), c, 40);
    html = ['Texas', 'Ohio', 'North Carolina', 'Iowa', 'Kansas', 'Maine', 'South Carolina'].map(n => sticker(n.toUpperCase(), stPos(n, 10), 'b sm')).join('') + sticker('TOO CLOSE', stPos('Mississippi', 10), 'g sm') + card('schumer', 'Chuck Schumer', 'SENATE DEMOCRATIC LEADER', 640, 1380 - 600);
    $('stat').innerHTML = '<b></b>U.S. SENATE · CONTROL'; $('val').innerHTML = '<span style="color:#7aa8ff">54</span> · <span style="color:#ff7a7a">44</span>'; $('sub').textContent = 'ALASKA & MISSISSIPPI STILL COUNTING';
    $('cap').innerHTML = 'Democrats flipped <span class="y">seven</span> Senate seats.'; }
  if (d === 3) { STATES.forEach(s => paint(s.name, '#2a3550', 0.5)); const c = V3(MCX, 0, MCZ); look(c.clone().add(V3(-40, 120, 230)), c.clone().add(V3(0, 0, -20)), 38);
    html = card('jeffries', 'Hakeem Jeffries', 'EXPECTED HOUSE SPEAKER', 170, 1380 - 600) + `<div id="hemi" style="top:520px">${hemiSVG(250, 435)}</div>`;
    $('stat').innerHTML = '<b></b>U.S. HOUSE · 435 SEATS'; $('val').innerHTML = '<span style="color:#7aa8ff">250+</span>'; $('sub').textContent = '218 NEEDED FOR A MAJORITY';
    $('cap').innerHTML = 'Democrats are projected to win <span class="y">more than 250</span>.'; }
  $('labels').innerHTML = html; $('hud').style.opacity = 1; $('cap').style.opacity = 1; $('title').style.opacity = 0;
  if (window.PASS === 'text') return true;
  shootTo(RTA, MAPSC, mCam); const u = compMat.uniforms; u.tA.value = RTA.texture; u.uLook.value = 0.12; u.uWhip.value = 0; composite(0, 1.0, 1.0); return true; };
function hemiSVG(dem, total) { let s = '<svg width="760" height="400" viewBox="0 0 760 400">'; let k = 0; const rows = 12;
  for (let r = 0; r < rows; r++) { const R = 160 + r * 17, n = Math.round(Math.PI * R / 15.5); for (let i = 0; i < n && k < total; i++, k++) { } }
  const seats = []; for (let r = 0; r < rows; r++) { const R = 160 + r * 17, n = Math.round(Math.PI * R / 15.5); for (let i = 0; i < n; i++) { const a = Math.PI * (1 - (i + 0.5) / n); seats.push([a, R]); } }
  seats.sort((p, q) => q[0] - p[0]); const use = seats.slice(0, total);
  use.forEach(([a, R], i) => { const x = 380 + Math.cos(a) * R, y = 370 - Math.sin(a) * R; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.2" fill="${i < dem ? '#3d7dff' : i < 275 ? '#5a5f6a' : '#ff4a4a'}"/>`; });
  s += `<text x="380" y="360" text-anchor="middle" font-family="Source Serif 4" font-size="64" fill="#fff">218</text><text x="380" y="392" text-anchor="middle" font-family="Inter" font-weight="600" font-size="20" letter-spacing="3" fill="#cfd6e4">TO CONTROL THE HOUSE</text></svg>`; return s; }
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; window.renderAt(0); return true; })();
