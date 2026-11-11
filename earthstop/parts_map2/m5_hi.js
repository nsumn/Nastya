// =================== MAP v5 add-on (Nov 11 2026, from the Geolyth / geomapstories comparison) — include AFTER parts_map2/m3_map.js ===================
// addHiPatch(name): a high-res focus plane over the region of the story (data/hi_<name>_*.{png,jpg,json} from tools/hires_patch.py) + its rivers.
// groundLabel(text, lon, lat, size, opts): a place name lying ON the terrain in perspective. cityDot(name, lon, lat, size): white dot + ring + name.
// Also set mapUni.uV5.value = 1 (brighter land, deeper paint with the relief showing through) and mapUni.uDim.value = 0.
// Load the Inter weights before drawing label canvases: await Promise.all(['900','800','700','600'].map(w => document.fonts.load(`${w} 160px Inter`))).
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
