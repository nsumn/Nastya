// US city lights for the night Earth (elevator video): the 7,000 population dots of data/sea_dots.json back-projected from the Albers USA map to lon/lat.
import fs from 'fs';
import { geoAlbersUsa } from 'd3-geo';
const proj = geoAlbersUsa().scale(1300).translate([487.5, 305]), MW = 975, MH = 610;
const out = JSON.parse(fs.readFileSync('data/sea_dots.json')).map(([x, z]) => proj.invert([x + MW / 2, z + MH / 2])).filter(Boolean).map(([lo, la]) => [+lo.toFixed(3), +la.toFixed(3)]);
fs.writeFileSync('data/us_lights.json', JSON.stringify(out)); console.log(out.length, out.slice(0, 3));
