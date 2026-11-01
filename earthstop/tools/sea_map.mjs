// Precompute the "everyone heads for the coast" dots for the ocean-jump video: N dots sampled from the population layer of zmap.bin (blue = log density),
// each with a target = the nearest OCEAN coast point (outer rings of world-atlas land-50m projected with geoAlbersUsa, i.e. no lakes, no land borders).
// Output: data/sea_dots.json [[x, z, tx, tz], …] in the map's coordinates (x - MW/2, y - MH/2), same as x_map.js.
import fs from 'fs';
import { geoAlbersUsa } from 'd3-geo';
import { feature } from 'topojson-client';
const MW = 975, MH = 610, info = JSON.parse(fs.readFileSync('zmap.json')), bin = fs.readFileSync('zmap.bin'), { GW, GH, GS } = info;
const proj = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const land = feature(JSON.parse(fs.readFileSync('node_modules/world-atlas/land-50m.json')), 'land'), coast = [];
const okLL = (lon, lat) => lon > -125 && lon < -66.9 && lat > 24.4 && lat < 49.5 && !(lon > -100 && lon < -96 && lat < 25.9) && !(lon < -110 && lat < 32.6);
for (const poly of land.features[0].geometry.coordinates) { const ring = poly[0]; for (let i = 0; i < ring.length; i++) { const [lon, lat] = ring[i]; if (!okLL(lon, lat)) continue; const p = proj([lon, lat]); if (p) coast.push(p); } }
// densify: add midpoints so targets spread along the shore
console.log('coast points', coast.length);
const W8 = [], cells = [];
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const o = ((GH - 1 - y) * GW + x) * 4; if (!bin[o + 1]) continue; const d = Math.pow(10, bin[o + 2] / 255 * 3.2 - 1.5); cells.push([x, y]); W8.push(d); }
const tot = W8.reduce((a, b) => a + b, 0); let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const cum = []; let c = 0; for (const w of W8) { c += w / tot; cum.push(c); }
const N = 7000, dots = [];
for (let n = 0; n < N; n++) { const r = rnd(); let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
  const [gx, gy] = cells[lo], px = (gx + rnd()) * GS, py = (gy + rnd()) * GS; let best = 1e9, bp = null;
  for (const q of coast) { const d = (q[0] - px) ** 2 + (q[1] - py) ** 2; if (d < best) { best = d; bp = q; } }
  dots.push([+(px - MW / 2).toFixed(1), +(py - MH / 2).toFixed(1), +(bp[0] - MW / 2 + (rnd() - 0.5) * 3).toFixed(1), +(bp[1] - MH / 2 + (rnd() - 0.5) * 3).toFixed(1)]); }
fs.writeFileSync('data/sea_dots.json', JSON.stringify(dots));
const far = dots.map(d => Math.hypot(d[0] - d[2], d[1] - d[3])); console.log('dots', N, 'max travel px', Math.max(...far).toFixed(0), 'median', far.sort((a, b) => a - b)[N >> 1].toFixed(0));
