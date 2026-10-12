// =================== MAPS: Great Britain filling up, the USA emptying out ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#0a1424');
const mapCam = new THREE.PerspectiveCamera(40, W / H, 1, 20000);
mapScene.add(new THREE.HemisphereLight(0xcfe0ff, 0x203040, 1.2));
const mapKey = new THREE.DirectionalLight(0xffffff, 1.4); mapKey.position.set(-300, 900, 600); mapScene.add(mapKey);
const ukGroupM = new THREE.Group(), usGroupM = new THREE.Group(); mapScene.add(ukGroupM, usGroupM);
const sea = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ color: '#13304f', roughness: 0.6 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -1; mapScene.add(sea);
function slabFrom(polys, toXY, depth, color) {
  const shapes = [];
  for (const poly of polys) { const outer = poly[0].map(toXY); if (outer.length < 4) continue; const sh = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, -y))); for (const h of poly.slice(1)) sh.holes.push(new THREE.Path(h.map(toXY).map(([x, y]) => new THREE.Vector2(x, -y)))); shapes.push(sh); }
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }));
}
const polysOf = (geom) => geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
function maskSampler(polys, toXY, cell) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of polys) for (const [x, y] of p[0].map(toXY)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cw = Math.ceil((x1 - x0) / cell), ch = Math.ceil((y1 - y0) / cell); const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const g = cv.getContext('2d'); g.fillStyle = '#fff';
  for (const poly of polys) { g.beginPath(); for (const ring of poly) ring.map(toXY).forEach(([x, y], i) => { const px = (x - x0) / cell, py = (y - y0) / cell; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.fill('evenodd'); }
  const d = g.getImageData(0, 0, cw, ch).data; const ok = (x, y) => { const px = Math.floor((x - x0) / cell), py = Math.floor((y - y0) / cell); return px >= 0 && py >= 0 && px < cw && py < ch && d[(py * cw + px) * 4 + 3] > 128; };
  return { ok, x0, y0, x1, y1 };
}
// ---- UK (km, equirectangular around 54.5N 2.5W)
const UKLAT = 54.5, UKLON = -2.5, KX = 111.32 * Math.cos(UKLAT * Math.PI / 180), KY = 111.32;
const ukXY = ([lo, la]) => [(lo - UKLON) * KX, (UKLAT - la) * KY];
const UK_CITIES = [[51.51, -0.13, 9.0], [52.49, -1.89, 2.9], [53.48, -2.24, 2.8], [53.8, -1.55, 1.9], [55.86, -4.25, 1.7], [53.41, -2.98, 1.4], [51.45, -2.59, 1.0], [54.97, -1.61, 1.1], [55.95, -3.19, 0.9], [51.48, -3.18, 0.8], [54.6, -5.93, 0.7], [52.95, -1.15, 1.0], [53.38, -1.47, 1.0], [50.9, -1.4, 0.9]];
const DOT_N = 6000;
const dotGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
const ukDots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), DOT_N); ukDots.frustumCulled = false; ukGroupM.add(ukDots);
const usDots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), DOT_N); usDots.frustumCulled = false; usGroupM.add(usDots);
const UKD = [], USD = [];
async function buildMaps() {
  const topo = countryTopo; const feats = topojson.feature(topo, topo.objects.countries).features;
  const uk = feats.find(f => f.id === '826'), ie = feats.find(f => f.id === '372'), fr = feats.find(f => f.id === '250');
  const ukP = polysOf(uk.geometry); ukGroupM.add(slabFrom(ukP, ukXY, 6, '#4fb6e0'));
  ukGroupM.add(slabFrom(polysOf(ie.geometry), ukXY, 4, '#3d5a48'));
  ukGroupM.add(slabFrom(polysOf(fr.geometry).filter(p => p[0].some(([lo, la]) => la > 47 && lo < 4)), ukXY, 4, '#3d5a48'));
  const S = maskSampler(ukP, ukXY, 2);
  const cities = UK_CITIES.map(([la, lo, w]) => { const [x, y] = ukXY([lo, la]); return { x, y, w }; }); const wsum = cities.reduce((a, c) => a + c.w, 0);
  for (let i = 0; i < DOT_N; i++) {
    let x, y, tries = 0;
    do { if (rnd() < 0.55) { let r = rnd() * wsum, c = cities[0]; for (const cc of cities) { r -= cc.w; if (r <= 0) { c = cc; break; } } x = c.x + R(-1, 1) * 28 * Math.sqrt(c.w) * rnd(); y = c.y + R(-1, 1) * 28 * Math.sqrt(c.w) * rnd(); } else { x = R(S.x0, S.x1); y = R(S.y0, S.y1); } tries++; } while (!S.ok(x, y) && tries < 50);
    UKD.push({ x, z: y, t: T_UKMAP + 1.6 + Math.pow(i / DOT_N, 1.1) * 5.5, today: i < DOT_N / 4.93 });
  }
  // ---- US (Albers USA units, as the zombie map)
  const ust = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = ust.objects.states.geometries.filter(g => !['Alaska', 'Hawaii'].includes(g.properties.name));
  const merged = topojson.merge(ust, L48); const MWu = 975, MHu = 610; const usXY = ([x, y]) => [x - MWu / 2, y - MHu / 2];
  const usP = merged.coordinates; usGroupM.add(slabFrom(usP, usXY, 10, '#d8a24a'));
  const meshB = topojson.mesh(ust, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b);
  const pts = []; for (const line of meshB.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = usXY(line[i]), b = usXY(line[i + 1]); pts.push(a[0], 10.3, a[1], b[0], 10.3, b[1]); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); usGroupM.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#8a6a30', transparent: true, opacity: 0.6 })));
  const S2 = maskSampler(usP, usXY, 2);
  const proj = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
  const met = [[40.71, -74.0, 19.8], [34.05, -118.24, 13.2], [41.88, -87.63, 9.6], [32.78, -96.8, 7.6], [29.76, -95.37, 7.1], [38.9, -77.04, 6.4], [39.95, -75.17, 6.2], [25.76, -80.19, 6.1], [33.75, -84.39, 6.1], [42.36, -71.06, 4.9], [33.45, -112.07, 4.8], [37.77, -122.42, 4.7], [42.33, -83.05, 4.4], [47.61, -122.33, 4.0], [44.98, -93.27, 3.7], [32.72, -117.16, 3.3], [27.95, -82.46, 3.2], [39.74, -104.99, 3.0], [38.63, -90.2, 2.8], [35.23, -80.84, 2.7], [29.42, -98.49, 2.6], [45.52, -122.68, 2.5], [40.44, -79.99, 2.4], [36.17, -115.14, 2.3], [39.1, -84.51, 2.3], [39.1, -94.58, 2.2], [36.16, -86.78, 2.0], [39.96, -83.0, 2.1]]
    .map(([la, lo, w]) => { const p = proj([lo, la]); return p ? { x: p[0] - MWu / 2, y: p[1] - MHu / 2, w } : null; }).filter(Boolean);
  const ws = met.reduce((a, c) => a + c.w, 0);
  for (let i = 0; i < DOT_N; i++) {
    const brit = i < DOT_N / 4.93; let x, y, tries = 0;
    do { if (!brit && rnd() < 0.7) { let r = rnd() * ws, c = met[0]; for (const cc of met) { r -= cc.w; if (r <= 0) { c = cc; break; } } x = c.x + R(-1, 1) * 9 * Math.sqrt(c.w) * rnd(); y = c.y + R(-1, 1) * 9 * Math.sqrt(c.w) * rnd(); } else { x = R(S2.x0, S2.x1); y = R(S2.y0, S2.y1); } tries++; } while (!S2.ok(x, y) && tries < 60);
    USD.push({ x, z: y, brit, t: T_USMAP + 0.6 + rnd() * 1.6 });
  }
}
const dm = new THREE.Object3D(), cUS = new THREE.Color('#ff5a4a'), cUK = new THREE.Color('#ffffff');
function updateMaps(t, which) {
  ukGroupM.visible = which === 'uk'; usGroupM.visible = which === 'us';
  if (which === 'uk') {
    for (let i = 0; i < DOT_N; i++) {
      const D = UKD[i]; let s = 0, y = 6.5, col = cUK;
      if (t < T_UKMAP + 1.2) { s = D.today ? 1 : 0; }                               // today: Brits (white)
      else if (t < T_UKMAP + 1.6) { s = D.today ? 1 - smooth(T_UKMAP + 1.2, T_UKMAP + 1.6, t) : 0; }
      else { const k = smooth(D.t - 0.25, D.t, t); s = k; y = 6.5 + (1 - k) * 60; col = cUS; }
      dm.position.set(D.x, y, D.z); dm.scale.set(2.2 * s, 1.2, 2.2 * s); dm.updateMatrix(); ukDots.setMatrixAt(i, dm.matrix); ukDots.setColorAt(i, col);
    }
    ukDots.instanceMatrix.needsUpdate = true; ukDots.instanceColor.needsUpdate = true;
    const u = (t - T_UKMAP) / (T_LONDON - T_UKMAP);
    mapCam.position.set(lerp(-60, 40, u), lerp(1500, 1250, ease(u)), lerp(760, 620, ease(u))); mapCam.lookAt(lerp(-30, -10, u), 0, lerp(-40, -20, u));
  } else {
    for (let i = 0; i < DOT_N; i++) {
      const D = USD[i]; let s;
      if (D.brit) s = smooth(T_USMAP + 1.4, T_USMAP + 2.4, t + (i % 7) * 0.08); else s = 1 - smooth(D.t - 0.3, D.t, t);
      dm.position.set(D.x, 10.6, D.z); dm.scale.set(1.3 * s, 0.8, 1.3 * s); dm.updateMatrix(); usDots.setMatrixAt(i, dm.matrix); usDots.setColorAt(i, D.brit ? cUK : cUS);
    }
    usDots.instanceMatrix.needsUpdate = true; usDots.instanceColor.needsUpdate = true;
    const u = (t - T_USMAP) / (T_TALK - T_USMAP);
    mapCam.position.set(lerp(-120, 80, u), lerp(2350, 2200, u), lerp(1500, 1350, u)); mapCam.lookAt(0, 0, 10);
  }
  mapCam.near = 1; mapCam.far = 20000; mapCam.updateProjectionMatrix();
}
