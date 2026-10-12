// Offline: rasterise US states (Albers USA, us-atlas), build a population-density grid, run a density-dependent
// front (zombies walk: fast where people are packed, slow where they're not) from every big metro on Halloween night.
import fs from 'fs';
import * as topojson from 'topojson-client';
import { geoAlbersUsa } from 'd3-geo';
const topo = JSON.parse(fs.readFileSync('node_modules/us-atlas/states-albers-10m.json'));
const L48 = { type: 'GeometryCollection', geometries: topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii'].includes(g.properties.name)) };
const states = topojson.feature(topo, L48).features;
const src = fs.readFileSync('parts_zombie/z_map.js', 'utf8');
const STATES = eval('(' + src.match(/const STATES = (\{[\s\S]*?\});/)[1] + ')');
const METROS = eval(src.match(/const METROS = (\[[\s\S]*?\]\]);/)[1]);
const MW = 975, MH = 610, GS = 2, GW = Math.ceil(MW / GS), GH = Math.ceil(MH / GS);
const sIdx = new Int16Array(GW * GH).fill(-1);
// scanline fill per polygon (even-odd over all rings)
states.forEach((f, si) => {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  for (const poly of polys) {
    let y0 = 1e9, y1 = -1e9; for (const ring of poly) for (const [, y] of ring) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let gy = Math.max(0, Math.floor(y0 / GS)); gy <= Math.min(GH - 1, Math.ceil(y1 / GS)); gy++) {
      const yc = (gy + 0.5) * GS; const xs = [];
      for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > yc) !== (yj > yc)) xs.push(xi + (yc - yi) / (yj - yi) * (xj - xi)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let gx = Math.max(0, Math.ceil(xs[k] / GS - 0.5)); gx <= Math.min(GW - 1, Math.floor(xs[k + 1] / GS - 0.5)); gx++) sIdx[gy * GW + gx] = si;
    }
  }
});
// fill border gaps: land mask from the nation outline, gap cells take a neighbouring state
const land = new Uint8Array(GW * GH);
{ const g = topojson.merge(topo, L48.geometries); const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  for (const poly of polys) { let y0 = 1e9, y1 = -1e9; for (const ring of poly) for (const [, y] of ring) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let gy = Math.max(0, Math.floor(y0 / GS)); gy <= Math.min(GH - 1, Math.ceil(y1 / GS)); gy++) { const yc = (gy + 0.5) * GS; const xs = [];
      for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > yc) !== (yj > yc)) xs.push(xi + (yc - yi) / (yj - yi) * (xj - xi)); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let gx = Math.max(0, Math.ceil(xs[k] / GS - 0.5)); gx <= Math.min(GW - 1, Math.floor(xs[k + 1] / GS - 0.5)); gx++) land[gy * GW + gx] = 1; } } }
for (let pass = 0; pass < 4; pass++) for (let k = 0; k < GW * GH; k++) if (land[k] && sIdx[k] < 0) { const x = k % GW, y = (k / GW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && sIdx[ny * GW + nx] >= 0) { sIdx[k] = sIdx[ny * GW + nx]; break; } } }
const stateCells = new Array(states.length).fill(0); for (let k = 0; k < GW * GH; k++) if (sIdx[k] >= 0) stateCells[sIdx[k]]++;
const dens = new Float32Array(GW * GH);
for (let k = 0; k < GW * GH; k++) { const s = sIdx[k]; if (s < 0) continue; const st = STATES[states[s].properties.name]; if (st) dens[k] = st[0] * 0.3 / Math.max(stateCells[s], 1); }
const proj = geoAlbersUsa().scale(1300).translate([487.5, 305]);
const mp = METROS.map(([n, la, lo, pop]) => { const p = proj([lo, la]); return p ? { n, x: p[0] / GS, y: p[1] / GS, pop } : null; }).filter(Boolean);
for (const m of mp) {
  const sig = (2.0 + 1.6 * Math.sqrt(m.pop)) / GS * 2; const amp = m.pop * 0.7 / (2 * Math.PI * sig * sig);
  for (let y = Math.max(0, Math.floor(m.y - 4 * sig)); y < Math.min(GH, m.y + 4 * sig); y++) for (let x = Math.max(0, Math.floor(m.x - 4 * sig)); x < Math.min(GW, m.x + 4 * sig); x++) {
    const k = y * GW + x; if (sIdx[k] < 0) continue; dens[k] += amp * Math.exp(-((x - m.x) ** 2 + (y - m.y) ** 2) / (2 * sig * sig));
  }
}
let popTotal = 0; for (let k = 0; k < GW * GH; k++) popTotal += dens[k];
const [VMIN, VK, DREF] = (process.argv[2] || '0.06,6,0.4').split(',').map(Number);
const speed = d => VMIN + VK * Math.sqrt(d / DREF);
const arrival = new Float64Array(GW * GH).fill(1e9);
// binary heap on typed arrays
const hv = new Float64Array(GW * GH * 9), hk = new Int32Array(GW * GH * 9); let hn = 0;
const push = (k, v) => { let i = hn++; hv[i] = v; hk[i] = k; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= hv[i]) break; [hv[p], hv[i]] = [hv[i], hv[p]]; [hk[p], hk[i]] = [hk[i], hk[p]]; i = p; } };
const popH = () => { const v = hv[0], k = hk[0]; hn--; hv[0] = hv[hn]; hk[0] = hk[hn]; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hn && hv[l] < hv[m]) m = l; if (r < hn && hv[r] < hv[m]) m = r; if (m === i) break; [hv[m], hv[i]] = [hv[i], hv[m]]; [hk[m], hk[i]] = [hk[i], hk[m]]; i = m; } return [v, k]; };
const snap = (m) => { let best = -1, bd = 1e9; for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { const x = Math.round(m.x) + dx, y = Math.round(m.y) + dy; if (x < 0 || y < 0 || x >= GW || y >= GH) continue; const k = y * GW + x; if (sIdx[k] >= 0 && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = k; } } return best; };
for (const m of mp) { const k = snap(m); if (k >= 0) { m.x = k % GW; m.y = (k / GW) | 0; } }
for (const m of mp) if (m.pop >= 0.9) { const k = Math.round(m.y) * GW + Math.round(m.x); if (sIdx[k] >= 0) { arrival[k] = m.n === 'New York' ? 0 : 0.2 + 0.15 * (METROS.findIndex(q => q[0] === m.n) % 5); push(k, arrival[k]); } else console.error('seed off-land', m.n); }
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
while (hn) {
  const [v, k] = popH(); if (v > arrival[k]) continue; const x = k % GW, y = (k / GW) | 0;
  for (const [dx, dy, L] of NB) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const nk = ny * GW + nx; if (sIdx[nk] < 0) continue;
    const nv = v + L / (0.5 * (speed(dens[k]) + speed(dens[nk]))); if (nv < arrival[nk]) { arrival[nk] = nv; push(nk, nv); } }
}
const order = []; for (let k = 0; k < GW * GH; k++) if (sIdx[k] >= 0) order.push(k); order.sort((a, b) => arrival[a] - arrival[b]);
let acc = 0; const curve = []; let next = 0;
for (const k of order) { acc += dens[k]; const d = arrival[k]; while (next <= 400 && d >= next) { curve.push(+(acc / popTotal).toFixed(5)); next += 0.5; } }
while (next <= 400) { curve.push(1); next += 0.5; }
const NR = ['Montana', 'Idaho', 'Wyoming']; const stat = {};
for (const D of [1, 3, 7, 14, 30, 60, 90, 120, 150, 160]) { let nr = 0, safe = 0; for (let k = 0; k < GW * GH; k++) if (sIdx[k] >= 0 && NR.includes(states[sIdx[k]].properties.name)) { nr++; if (arrival[k] > D) safe++; } stat['day' + D] = { infected: curve[Math.min(800, D * 2)], rockiesSafe: +(safe / nr).toFixed(3) }; }
// unreached (islands etc.)
let unreached = 0; for (const k of order) if (arrival[k] > 1e8) unreached++;
console.log(JSON.stringify(stat), 'unreached cells', unreached);
for (const n of ['Chicago', 'Denver', 'Salt Lake City', 'Billings', 'Missoula', 'Boise', 'Spokane', 'Cheyenne', 'Fargo', 'Bismarck']) { const m = mp.find(q => q.n === n); if (m) console.log(n, arrival[Math.round(m.y) * GW + Math.round(m.x)].toFixed(1)); }
// texture
const data = Buffer.alloc(GW * GH * 4);
for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
  const k = y * GW + x, o = ((GH - 1 - y) * GW + x) * 4; const land = sIdx[k] >= 0; const arr = Math.min(arrival[k], 400);
  data[o] = land ? Math.min(255, Math.round(Math.log(1 + arr) / Math.log(401) * 255)) : 255;
  data[o + 1] = land ? 255 : 0;
  data[o + 2] = land ? Math.min(255, Math.round(Math.min(Math.max(Math.log10(dens[k] * 50 + 1e-6) + 1.5, 0), 3.2) / 3.2 * 255)) : 0;
  data[o + 3] = land ? 140 + (sIdx[k] * 37) % 90 : 0;
}
fs.writeFileSync('zmap.bin', data);
fs.writeFileSync('zmap.json', JSON.stringify({ GW, GH, GS, curve, metros: mp.map(m => ({ n: m.n, x: m.x, y: m.y, pop: m.pop, arr: +arrival[Math.round(m.y) * GW + Math.round(m.x)].toFixed(2) })) }));
{ // debug: unreached cells by state
  const cnt = {}; for (const k of order) if (arrival[k] > 1e8) { const n = states[sIdx[k]].properties.name; cnt[n] = (cnt[n] || 0) + 1; }
  console.log('unreached by state', JSON.stringify(cnt));
  let landN = 0, assigned = 0; for (let k = 0; k < GW * GH; k++) { if (land[k]) landN++; if (sIdx[k] >= 0) assigned++; } console.log('land', landN, 'assigned', assigned);
}
