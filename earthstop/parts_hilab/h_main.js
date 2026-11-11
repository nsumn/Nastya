// =================== MAP v5 LAB (Nov 11 2026): before / after on the SAME camera — ?v=4 = the current news map, ?v=5 = the upgrades from the Geolyth / geomapstories comparison ===================
// v5 = (1) a high-res focus patch (tools/hires_patch.py: 0.004° Terrarium relief + NASA 500 m colour) so close-ups are crisp, (2) rivers (Natural Earth 10 m),
//      (3) brighter, more saturated land like theirs (they average 110–170 brightness / 140–170 saturation; v4 sat at 85), (4) the focus state painted with relief showing through + a thick rim,
//      (5) a clean finish (no paper/grain/vignette — they look crisp), (6) camera framing used for the frames: oblique 1.0–1.2, the subject fills the frame.
const Q = new URLSearchParams(location.search), V5 = Q.get('v') === '5', HI = Q.get('hi') || 'tx';
let HIM = null, RIV = null;
async function addHiPatch(name) {
  const meta = await fetch(`data/hi_${name}_rivers.json`).then(r => r.json()); const [lon0, lon1, lat0, lat1] = meta.bbox; const HB = { lon0, lon1, lat0, lat1, cw: meta.w, ch: meta.h };
  const L = new THREE.TextureLoader(); const [dem, sat] = await Promise.all([L.loadAsync(`data/hi_${name}_dem.png`), L.loadAsync(`data/hi_${name}_sat.jpg`)]);
  sat.colorSpace = THREE.SRGBColorSpace; sat.anisotropy = 8; sat.generateMipmaps = true; sat.minFilter = THREE.LinearMipmapLinearFilter; dem.colorSpace = THREE.NoColorSpace; dem.minFilter = THREE.LinearFilter; dem.generateMipmaps = false;
  const sf = topojson.feature(TOPO.us, TOPO.us.objects.states).features; sf.forEach((f, i) => { f.sid = i + 1; }); const usaId = COUNTRIES.find(c => c.name === 'United States of America').id;
  HIM = planeFor(HB, mapMaterial(HB, dem, idCanvas(HB, [], sf, usaId), true, sat), 1400, 1150); HIM.position.y = 0.06; HIM.renderOrder = 0;
  RIV = TOPO.lines({ coordinates: meta.rivers }, 1.7, 0x8fd0ff, 0.85, 1); }
// v5: place names lying ON the terrain in perspective (theirs: 'Zaporizhzhia', 'Black Sea', 'Gulf of Mexico') + city dots with a pill label
const GLAB = [];
function groundLabel(text, lon, lat, size, { font = '800', italic = false, color = '#ffffff', shadow = 0.55, rot = 0, spacing = 0.08 } = {}) {
  const cv = document.createElement('canvas'), g = cv.getContext('2d'); const fs = 160; g.font = `${italic ? 'italic ' : ''}${font} ${fs}px Inter`; const w = Math.ceil(g.measureText(text).width * (1 + spacing) + fs * 0.6);
  cv.width = w; cv.height = Math.ceil(fs * 1.5); g.font = `${italic ? 'italic ' : ''}${font} ${fs}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle'; if ('letterSpacing' in g) g.letterSpacing = `${spacing * fs}px`;
  g.shadowColor = `rgba(0,0,0,${shadow})`; g.shadowBlur = fs * 0.12; g.shadowOffsetY = fs * 0.06; g.fillStyle = color; g.fillText(text, cv.width / 2, cv.height / 2);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size * cv.width / cv.height, size), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }));
  m.rotation.set(-Math.PI / 2, 0, rot); const p = ll2xz(lon, lat); m.position.set(p.x, HGT(lon, lat) + 2.2, p.z); m.renderOrder = 3; m.visible = false; MAPSC.add(m); GLAB.push(m); return m; }
function cityDot(name, lon, lat, size) { const g = new THREE.Group(); const p = ll2xz(lon, lat); g.position.set(p.x, HGT(lon, lat) + 1.6, p.z);
  const d = new THREE.Mesh(new THREE.CircleGeometry(size * 0.16, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false })); d.renderOrder = 3; g.add(d);
  const r = new THREE.Mesh(new THREE.RingGeometry(size * 0.2, size * 0.27, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthTest: false })); r.renderOrder = 3; g.add(r);
  g.visible = false; MAPSC.add(g); GLAB.push(g); const l = groundLabel(name, lon, lat, size * 0.36, { font: '700', shadow: 0.8 }); l.position.x += size * 0.95 + l.geometry.parameters.width / 2 - size * 0.5; return g; }
const SHOTS = [   // [lon, lat, height, tilt, yaw, fov]
  [-99.3, 31.0, 260, 1.05, 0.25, 34],    // all of Texas, oblique
  [-98.4, 30.3, 70, 1.15, 0.45, 34],     // Hill Country / Austin close-up
  [-104.4, 30.6, 85, 1.0, -0.3, 34],     // Big Bend / Davis Mountains (relief)
  [-95.6, 29.9, 60, 1.1, 0.1, 34],       // Houston / coast
  [-103.7, 29.4, 22, 1.1, 0.3, 34],      // very close: Big Bend canyons (shows the hi-res relief)
  [-97.8, 30.35, 14, 1.15, 0.4, 34]];    // very close: Austin + the Colorado River
function camAtL(i) { const [lon, lat, h, tilt, yaw, fov] = SHOTS[i], c = ll2xz(lon, lat), back = h * tilt; mCam.position.set(c.x + Math.sin(yaw) * back, h, c.z + Math.cos(yaw) * back); mCam.lookAt(c.x, 0, c.z);
  mCam.fov = fov; mCam.aspect = W / H; mCam.near = Math.max(0.3, h * 0.02); mCam.far = h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld(); }
// ?clip=1: a 6 s camera test. v4 = our measured camera (≈1 % zoom per second, no turn); v5 = their measured camera (continuous 15–20 % zoom per second, a turn, the tilt opens up near the ground).
const CLIP = Q.get('clip') === '1';
function camClip(t) { const es = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1)); let lon, lat, h, tilt, yaw;
  if (!V5) { const u = t / 6; lon = -99.3; lat = 31.0; h = 260 - 30 * u; tilt = 1.05; yaw = 0.25; }
  else { const a = es(t / 1.8), b = es((t - 0.9) / 5.1); lon = lerp(-97.5, -99.3, a) + (-97.8 + 99.3) * b; lat = lerp(35.0, 31.0, a) + (30.75 - 31.0) * b;
    h = Math.exp(lerp(Math.log(560), Math.log(240), a) + (Math.log(34) - Math.log(240)) * b); tilt = lerp(0.85, 1.0, a) + 0.3 * b; yaw = lerp(-0.25, 0.2, a) + 0.55 * b; }
  const c = ll2xz(lon, lat), back = h * tilt; mCam.position.set(c.x + Math.sin(yaw) * back, h, c.z + Math.cos(yaw) * back); mCam.lookAt(c.x, 0, c.z);
  mCam.fov = 34; mCam.aspect = W / H; mCam.near = Math.max(0.3, h * 0.02); mCam.far = h * 12 + 500; mCam.updateProjectionMatrix(); mCam.updateMatrixWorld(); }
window.renderAt = (t) => { const i = clamp(Math.floor(t), 0, SHOTS.length - 1); if (!window.__ord) { orderProps(); window.__ord = 1; }
  clearPaint(); if (Q.get('paint') !== '0') paintState('Texas', V5 ? '#ff3b3b' : '#e8463a', V5 ? 0.72 : 0.85, V5 ? 1.4 : 1.0); palTex.needsUpdate = true; rims(V5 ? [['state', 'Texas', 1]] : []);
  mapUni.uDim.value = V5 ? 0 : 0.6; mapUni.uV5.value = V5 ? 1 : 0; if (HIM) HIM.visible = V5; GLAB.forEach(o => { o.visible = V5 && (!CLIP || t > 1.3); }); if (RIV) RIV.visible = V5;
  if (CLIP) { const k = V5 ? clamp((t - 1.0) / 0.5, 0, 1) : 1; clearPaint(); paintState('Texas', V5 ? '#ff3b3b' : '#e8463a', (V5 ? 0.72 : 0.85) * k, (V5 ? 1.4 : 1.0) * (V5 ? (k < 1 ? k * 1.3 : 1) : 1)); palTex.needsUpdate = true; rims(V5 ? [['state', 'Texas', k]] : []); camClip(t); } else camAtL(i);
  shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture;
  const u = compMat.uniforms; u.uLook.value = V5 ? 0.0 : 0.1; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0;
  composite(0, V5 ? 1.12 : 1.0, 1.0); return true; };
window.sceneReady = (async () => { await mapReady; if (V5) { await addHiPatch(HI); await Promise.all(['900', '800', '700', '600'].map(w => document.fonts.load(`${w} 160px Inter`))); await document.fonts.ready;
    groundLabel('TEXAS', -99.6, 31.6, 9, { font: '900', spacing: 0.35, shadow: 0.6 }); groundLabel('Gulf of Mexico', -92.5, 26.6, 4.2, { font: '600', italic: true, color: '#e8f4ff', shadow: 0.35 });
    groundLabel('MEXICO', -104.5, 27.6, 5, { font: '800', spacing: 0.3, color: '#f4efe4', shadow: 0.5 }); cityDot('Austin', -97.74, 30.27, 3.2); cityDot('Houston', -95.37, 29.76, 3.2); cityDot('Dallas', -96.8, 32.78, 3.2); cityDot('San Antonio', -98.49, 29.42, 3.2); }
  window.renderAt(0); return true; })();
