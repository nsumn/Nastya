// One-piece clay bodies: a smooth union of round cones / ellipsoids, meshed with surface nets.
// Primitives live in figure-root space. A primitive may carry `inv` (Matrix4 elements, root -> local frame) and
// `zs` (z squash) so torsos, heads, hands and shoes can be flattened ellipsoids that follow their joint.
import * as THREE from 'three';

function roundCone(px, py, pz, P) {
  const bax = P.bx - P.ax, bay = P.by - P.ay, baz = P.bz - P.az;
  const l2 = bax * bax + bay * bay + baz * baz, rr = P.r1 - P.r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - P.ax, pay = py - P.ay, paz = pz - P.az;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const xx = pax * l2 - bax * y, xy = pay * l2 - bay * y, xz = paz * l2 - baz * y;
  const x2 = xx * xx + xy * xy + xz * xz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - P.r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - P.r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - P.r1;
}
function ellipsoid(px, py, pz, P) {
  const x = px - P.ax, y = py - P.ay, z = pz - P.az;
  const k0 = Math.sqrt((x / P.rx) ** 2 + (y / P.ry) ** 2 + (z / P.rz) ** 2);
  const k1 = Math.sqrt((x / (P.rx * P.rx)) ** 2 + (y / (P.ry * P.ry)) ** 2 + (z / (P.rz * P.rz)) ** 2);
  return k1 < 1e-9 ? -Math.min(P.rx, P.ry, P.rz) : k0 * (k0 - 1) / k1;
}

// primitive constructors (coordinates in the primitive's own frame if `frame` given, else root space)
export function cone(a, b, r1, r2, col, k = 0.035, frame = null, zs = 1) {
  return prep({ t: 0, ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, r1, r2, col, k, frame, zs });
}
export function ell(c, rx, ry, rz, col, k = 0.03, frame = null) {
  return prep({ t: 1, ax: c.x, ay: c.y, az: c.z, rx, ry, rz, col, k, frame, zs: 1 });
}
function prep(P) {
  if (P.frame) P.inv = new THREE.Matrix4().copy(P.frame).invert().elements; // root -> local
  // conservative bounding sphere in root space
  const loc = P.t === 0 ? [new THREE.Vector3(P.ax, P.ay, P.az), new THREE.Vector3(P.bx, P.by, P.bz)] : [new THREE.Vector3(P.ax, P.ay, P.az)];
  if (P.frame) loc.forEach(v => v.applyMatrix4(P.frame));
  const c = loc.length === 2 ? loc[0].clone().add(loc[1]).multiplyScalar(0.5) : loc[0];
  const ext = P.t === 0 ? Math.max(P.r1, P.r2) / Math.min(1, P.zs) + loc[0].distanceTo(loc[1]) / 2 : Math.max(P.rx, P.ry, P.rz);
  P.cx = c.x; P.cy = c.y; P.cz = c.z; P.rad = ext;
  return P;
}
function evalP(P, x, y, z) {
  if (P.inv) {
    const e = P.inv; const lx = e[0] * x + e[4] * y + e[8] * z + e[12], ly = e[1] * x + e[5] * y + e[9] * z + e[13], lz = e[2] * x + e[6] * y + e[10] * z + e[14];
    x = lx; y = ly; z = lz / P.zs;
  }
  const d = P.t === 0 ? roundCone(x, y, z, P) : ellipsoid(x, y, z, P);
  return P.zs !== 1 ? d * (0.5 + 0.5 * P.zs) : d;
}

// a primitive may switch colour below a horizontal line of its own frame (sweater hem over the skirt/trousers)
function splitCol(P, x, y, z) {
  if (!P.split) return P.col;
  let ly = y;
  if (P.inv) { const e = P.inv; ly = e[1] * x + e[5] * y + e[9] * z + e[13]; }
  const t = Math.min(1, Math.max(0, (ly - P.split.y) / 0.004 + 0.5));
  return P.col.clone().lerp(P.split.col, 1 - t);
}
// Field. Primitives are grouped: group 0 is the core (torso, head, skirt), every other group is a chain (an arm, a leg,
// a hair lock). A chain melts into the core with a smooth union but stays SEPARATE from other chains, so legs never
// fuse to each other and an arm resting on the lap doesn't weld to the thigh. `sub` primitives carve the result.
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
let G = new Float64Array(16), S = new Float64Array(16);
function field(prims, x, y, z) {
  const ng = prims.ng || 1;
  for (let g = 0; g < ng; g++) { G[g] = 1e9; S[g] = 1e9; }
  for (let i = 0; i < prims.length; i++) {
    const P = prims[i], gi = P.gi;
    const cur = P.sub ? S[gi] : G[gi];
    const dc = Math.sqrt((x - P.cx) ** 2 + (y - P.cy) ** 2 + (z - P.cz) ** 2) - P.rad;
    if (dc > cur + P.k) continue;
    const di = evalP(P, x, y, z);
    if (P.sub) S[gi] = smin(S[gi], di, P.k); else G[gi] = smin(G[gi], di, P.k);
  }
  for (let g = 0; g < ng; g++) if (S[g] < 1e8) G[g] = smax(G[g], -S[g], 0.012); // carve (e.g. the face opening in the hair)
  let d = G[0];
  for (let g = 1; g < ng; g++) if (G[g] < 1e8) d = Math.min(d, smin(G[0], G[g], prims.attach[g]));
  return d;
}
function groupPrims(prims) {
  const names = ['core']; prims.attach = [0];
  for (const P of prims) {
    const g = P.g || 'core'; let gi = names.indexOf(g);
    if (gi < 0) { gi = names.length; names.push(g); prims.attach[gi] = P.attach ?? 0.035; }
    P.gi = gi;
  }
  prims.ng = names.length; if (G.length < prims.ng) { G = new Float64Array(prims.ng); S = new Float64Array(prims.ng); }
}

// surface nets: returns a BufferGeometry with position / normal / color
export function meshPrims(prims, h = 0.008) {
  groupPrims(prims);
  let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
  for (const P of prims) {
    if (P.sub) continue;
    x0 = Math.min(x0, P.cx - P.rad); y0 = Math.min(y0, P.cy - P.rad); z0 = Math.min(z0, P.cz - P.rad);
    x1 = Math.max(x1, P.cx + P.rad); y1 = Math.max(y1, P.cy + P.rad); z1 = Math.max(z1, P.cz + P.rad);
  }
  const pad = 2 * h; x0 -= pad; y0 -= pad; z0 -= pad; x1 += pad; y1 += pad; z1 += pad;
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const F = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  // NOTE: sub primitives may carry a big radius; they never extend the bounds
  // coarse pass: skip far-away blocks (field is ~distance, so a big positive value at a block centre clears it)
  const B = 4;
  for (let k = 0; k < nz; k += B) for (let j = 0; j < ny; j += B) for (let i = 0; i < nx; i += B) {
    const cxk = x0 + (i + B / 2) * h, cyk = y0 + (j + B / 2) * h, czk = z0 + (k + B / 2) * h;
    const dc = field(prims, cxk, cyk, czk);
    const far = dc > (B / 2 + 1) * h * 2.2;
    for (let kk = k; kk < Math.min(nz, k + B + 1); kk++) for (let jj = j; jj < Math.min(ny, j + B + 1); jj++) for (let ii = i; ii < Math.min(nx, i + B + 1); ii++) {
      const n = id(ii, jj, kk);
      if (far) { if (F[n] === 0) F[n] = dc; } else F[n] = NaN; // NaN = needs exact value
    }
  }
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const n = id(i, j, k);
    if (Number.isNaN(F[n]) || F[n] === 0) F[n] = field(prims, x0 + i * h, y0 + j * h, z0 + k * h);
  }
  // one vertex per sign-changing cell
  const vIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [], nor = [], col = [], idx = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { v[c] = F[id(i + C[c][0], j + C[c][1], k + C[c][2])]; if (v[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, m = 0;
    for (const [a, b] of E) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; m++;
    }
    const px = x0 + (i + sx / m) * h, py = y0 + (j + sy / m) * h, pz = z0 + (k + sz / m) * h;
    vIdx[cid(i, j, k)] = pos.length / 3; pos.push(px, py, pz);
    const e = h * 0.5;
    const gx = field(prims, px + e, py, pz) - field(prims, px - e, py, pz), gy = field(prims, px, py + e, pz) - field(prims, px, py - e, pz), gz = field(prims, px, py, pz + e) - field(prims, px, py, pz - e);
    const gl = Math.hypot(gx, gy, gz) || 1; nor.push(gx / gl, gy / gl, gz / gl);
    // colour: soft-max blend of nearby primitives so seams (cuffs, necklines, hems) are clean, not stair-stepped
    let wr = 0, wg = 0, wb = 0, ws = 0, dmin = 1e9; const ds = [];
    const cut = new Float64Array(prims.ng).fill(1e9);   // carved regions don't colour (the face isn't hair-coloured)
    for (const P of prims) if (P.sub) cut[P.gi] = Math.min(cut[P.gi], evalP(P, px, py, pz));
    for (let q = 0; q < prims.length; q++) { const P = prims[q]; if (P.sub || Math.sqrt((px - P.cx) ** 2 + (py - P.cy) ** 2 + (pz - P.cz) ** 2) - P.rad > 0.03) { ds.push(1e9); continue; } const dq = Math.max(evalP(P, px, py, pz), -cut[P.gi]); ds.push(dq); dmin = Math.min(dmin, dq); }
    for (let q = 0; q < prims.length; q++) { if (ds[q] > dmin + 0.02) continue; const w = Math.exp(-(ds[q] - dmin) / 0.0025); const cc = splitCol(prims[q], px, py, pz); wr += cc.r * w; wg += cc.g * w; wb += cc.b * w; ws += w; }
    col.push(wr / ws, wg / ws, wb / ws);
  }
  // quads across sign-changing grid edges
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = F[id(i, j, k)] < 0;
    // x edge
    if (a !== (F[id(i + 1, j, k)] < 0)) quad(cid(i, j - 1, k - 1), cid(i, j, k - 1), cid(i, j, k), cid(i, j - 1, k), a);
    if (a !== (F[id(i, j + 1, k)] < 0)) quad(cid(i - 1, j, k - 1), cid(i - 1, j, k), cid(i, j, k), cid(i, j, k - 1), a);
    if (a !== (F[id(i, j, k + 1)] < 0)) quad(cid(i - 1, j - 1, k), cid(i, j - 1, k), cid(i, j, k), cid(i - 1, j, k), a);
  }
  function quad(q0, q1, q2, q3, flip) {
    const A = vIdx[q0], Bq = vIdx[q1], Cq = vIdx[q2], D = vIdx[q3];
    if (A < 0 || Bq < 0 || Cq < 0 || D < 0) return;
    if (flip) idx.push(A, Bq, Cq, A, Cq, D); else idx.push(A, Cq, Bq, A, D, Cq);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
