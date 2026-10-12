// Land outlines for the asteroid video, projected to km around Times Square (azimuthal equidistant:
// distances from ground zero are exact). x = east km, y = south km (canvas-style).
// Sources: US Census cartographic boundary counties 1:500k (cb_2023_us_county_500k, shoreline-clipped)
// for the US, world-atlas land-50m for Canada; us-atlas states-10m for state borders.
// Usage: node tools/asteroid_land.mjs <dir with cb_2023_us_county_500k.shp> -> data/asteroid_land.json
import fs from 'fs';
import * as shapefile from 'shapefile';
import * as d3 from 'd3-geo';
import * as topojson from 'topojson-client';

const TS = [-73.9855, 40.7580];
const proj = d3.geoAzimuthalEquidistant().rotate([-TS[0], -TS[1]]).scale(6371).translate([0, 0]).clipAngle(null);
const LIM = 900; // km half-size of the region
const BB = [-86, 34, -62, 49];
const P = ([lo, la]) => { const [x, y] = proj([lo, la]); return [Math.round(x * 100) / 100, Math.round(y * 100) / 100]; };
const tol = (x, y) => 0.06 + Math.hypot(x, y) / 600;      // finer near New York, coarser far away
function simplify(ring) {
  const out = [ring[0]];
  for (let i = 1; i < ring.length; i++) { const [x, y] = ring[i], [px, py] = out[out.length - 1]; if (Math.hypot(x - px, y - py) >= tol(x, y) || i === ring.length - 1) out.push(ring[i]); }
  return out;
}
const inBox = r => r.some(([x, y]) => Math.abs(x) < LIM && Math.abs(y) < LIM);
const land = [], manhattan = [];
const src = await shapefile.open(process.argv[2] + '/cb_2023_us_county_500k.shp', undefined, { encoding: 'utf-8' });
for (let r = await src.read(); !r.done; r = await src.read()) {
  const f = r.value;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    if (!poly[0].some(([lo, la]) => lo > BB[0] && lo < BB[2] && la > BB[1] && la < BB[3])) continue;
    const rings = poly.map(ring => simplify(ring.map(P))).filter(r => r.length >= 4);
    if (!rings.length || !inBox(rings[0])) continue;
    land.push(rings);
    if (f.properties.GEOID === '36061') manhattan.push(rings);
  }
}
const world = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-50m.json'));
const canada = [];
for (const poly of topojson.feature(world, world.objects.land).features.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) {
  if (!poly[0].some(([lo, la]) => lo > BB[0] && lo < BB[2] && la > BB[1] && la < BB[3])) continue;
  canada.push(poly.map(r => simplify(r.map(P))));
}
const states = JSON.parse(fs.readFileSync('node_modules/us-atlas/states-10m.json'));
const borders = topojson.mesh(states, states.objects.states, (a, b) => a !== b).coordinates
  .map(l => l.map(P)).filter(l => inBox(l));
const out = { lim: LIM, center: TS, land, canada, manhattan, borders };
fs.writeFileSync('data/asteroid_land.json', JSON.stringify(out));
const nPts = land.flat(2).length;
console.log('land polys', land.length, 'points', nPts, 'canada', canada.length, 'manhattan', manhattan.length, 'borders', borders.length, (fs.statSync('data/asteroid_land.json').size / 1e6).toFixed(2), 'MB');
for (const [n, ll] of [['Newark', [-74.1724, 40.7357]], ['Philadelphia', [-75.1652, 39.9526]], ['Boston', [-71.0589, 42.3601]], ['Washington', [-77.0369, 38.9072]]]) { const [x, y] = proj(ll); console.log(n, x.toFixed(1), y.toFixed(1), Math.hypot(x, y).toFixed(1), 'km'); }
