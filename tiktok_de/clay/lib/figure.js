// Clay figures: a small FK rig (groups per joint) dressed with smooth lathe parts.
// Units: metres of a ~1.25 m tall toy. Forward is +z, up is +y.
// A pose is a plain object of joint rotations (radians); see POSES below and pose().
import * as THREE from 'three';
import { cone, ell, meshPrims } from './sdf.js';

const clay = (hex, rough = 0.74) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
export const MAT = {
  skin: clay('#f1dac8', 0.66), skinSh: clay('#e5c8b4', 0.7), eye: clay('#1b1514', 0.3), white: clay('#ffffff', 0.15),
  mouth: clay('#83403b', 0.6), mouthIn: clay('#4a2422', 0.7), blush: clay('#eaa596', 0.85), tear: new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', roughness: 0.05, transmission: 0.6, thickness: 0.01 }),
  dress: clay('#c98a93'), hairW: clay('#6b3e2a', 0.72), skirt: clay('#4a4f5c', 0.8), gold: clay('#e9c56a', 0.3),
  shirt: clay('#7fa58a'), pants: clay('#3d4047', 0.8), hairM: clay('#2e2624', 0.78), stubble: clay('#cbb5a5', 0.9), shoeM: clay('#3b3533', 0.6),
  shoeW: clay('#7d4a2e', 0.6),
};

function M(geo, mat, parent) { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function G(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.order = 'YXZ'; parent.add(g); return g; }
function ball(parent, r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const m = M(new THREE.SphereGeometry(r, 32, 24), mat, parent); m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m; }

// smooth tapered limb from y=0 down to y=-len with round ends
function taper(r1, r2, len, seg = 28) {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 * (1 - i / 8); pts.push(new THREE.Vector2(r1 * Math.cos(a), r1 * Math.sin(a))); }
  for (let i = 1; i <= 8; i++) { const a = -Math.PI / 2 * i / 8; pts.push(new THREE.Vector2(r2 * Math.cos(a), -len + r2 * Math.sin(a))); }
  pts.reverse();
  return new THREE.LatheGeometry(pts, seg);
}
// lathe from a list of [radius, y] pairs (bottom -> top), closed at both ends
function body(prof, seg = 40, phiStart = 0, phiLen = Math.PI * 2) {
  return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen);
}

// ---------------------------------------------------------------- face
function buildFace(head, R, kind) {
  const F = {};
  const hairMat = kind === 'w' ? MAT.hairW : MAT.hairM;
  F.eyes = []; F.brows = []; F.lids = [];
  for (const s of [-1, 1]) {
    const eg = G(head, s * 0.34 * R, 0.06 * R, 0.86 * R);
    const e = ball(eg, 0.1 * R, MAT.eye, 0, 0, 0.05 * R, 0.82, 1.12, 0.55);
    ball(e, 0.028 * R, MAT.white, 0.035 * R, 0.045 * R, 0.085 * R);
    // upper lid: skin cap that slides down for tired/sad looks
    const lid = M(new THREE.SphereGeometry(0.135 * R, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), MAT.skin, eg);
    lid.position.z = 0.02 * R; lid.rotation.x = 0; lid.scale.set(1, 1, 0.8);
    F.eyes.push(eg); F.lids.push(lid);
    const bg = G(head, s * 0.33 * R, 0.33 * R, 0.9 * R);
    const b = M(taper(0.03 * R, 0.026 * R, 0.3 * R, 12), hairMat, bg); b.rotation.z = s * Math.PI / 2; b.position.x = -s * 0.15 * R;
    F.brows.push(bg);
    ball(head, 0.11 * R, MAT.blush, s * 0.52 * R, -0.16 * R, 0.8 * R, 1, 0.62, 0.3);
  }
  ball(head, 0.07 * R, MAT.skin, 0, -0.08 * R, 0.98 * R, 1.05, 0.85, 0.8); // nose
  // mouth: arc (smile/frown) + open "o"
  F.mouthG = G(head, 0, -0.36 * R, 0.93 * R);
  F.arc = M(new THREE.TorusGeometry(0.15 * R, 0.026 * R, 10, 28, Math.PI * 0.62), MAT.mouth, F.mouthG);
  F.o = ball(F.mouthG, 0.08 * R, MAT.mouthIn, 0, 0, 0, 1.2, 0.9, 0.5);
  F.tears = [];
  for (const s of [-1, 1]) { const t = ball(head, 0.035 * R, MAT.tear, s * 0.4 * R, -0.12 * R, 0.9 * R, 0.8, 1.3, 0.6); t.visible = false; F.tears.push(t); }
  F.R = R;
  return F;
}

// expression: {brow: -1 angry .. 0 .. 1 sad, mouth: -1 frown .. 1 smile, open: 0..1, lid: 0..1, look: [x, y], tears: bool, closed: bool}
export function setFace(F, ex) {
  const R = F.R, brow = ex.brow ?? 0, mouth = ex.mouth ?? 0, lid = ex.lid ?? 0.15, look = ex.look || [0, 0];
  F.brows.forEach((bg, i) => { const s = i ? 1 : -1; bg.rotation.z = -s * brow * 0.35; bg.position.y = (0.33 + Math.abs(brow) * 0.02 + (ex.surprise || 0) * 0.08) * R; });
  F.eyes.forEach((eg, i) => {
    const e = eg.children[0]; e.position.x = look[0] * 0.035 * R; e.position.y = look[1] * 0.035 * R;
    const l = F.lids[i]; l.rotation.x = -Math.PI * 0.5 + (ex.closed ? 1.15 : 0.15 + lid * 0.95) * -0.0 + (ex.closed ? 0.0 : 0); // reset below
    // lid hemisphere opens upward (rotation.x = -PI/2 points the cap forward); rotating towards 0 closes it
    l.rotation.x = -Math.PI * 0.5 - (ex.closed ? 0 : (1 - lid) * 1.1);
    l.rotation.z = (i ? -1 : 1) * brow * 0.25;
  });
  F.arc.visible = (ex.open ?? 0) < 0.3;
  F.o.visible = !F.arc.visible; F.o.scale.set(1.1, 0.5 + (ex.open || 0) * 0.9, 0.5);
  const m = mouth;
  F.arc.rotation.z = m >= 0 ? Math.PI + Math.PI * 0.19 : Math.PI * 0.19;
  F.arc.position.y = m >= 0 ? 0.13 * R : -0.06 * R;
  F.arc.scale.set(1, Math.max(0.25, Math.abs(m)), 1);
  F.tears.forEach(t => t.visible = !!ex.tears);
}

// ---------------------------------------------------------------- hair
function hairWoman(head, R) {
  const m = MAT.hairW;
  // bob: lathe around the head, open over the face
  const bob = M(body([[0.0, -0.4], [0.9, -1.0], [1.12, -0.98], [1.2, -0.6], [1.15, -0.4], [1.15, 0.0], [1.1, 0.42], [0.92, 0.8], [0.55, 1.04], [0.0, 1.12]].map(([r, y]) => [r * R, y * R]), 56, Math.PI * 0.26, Math.PI * 1.48), m, head);
  bob.material = m; m.side = THREE.DoubleSide;
  M(new THREE.SphereGeometry(R * 1.075, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.32), m, head).rotation.x = 0.12;
  // side-parted fringe: two soft lobes + a tucked strand
  const f1 = ball(head, 0.6 * R, m, -0.3 * R, 0.7 * R, 0.55 * R, 1.2, 0.4, 0.6); f1.rotation.z = 0.42;
  const f2 = ball(head, 0.5 * R, m, 0.48 * R, 0.76 * R, 0.42 * R, 0.95, 0.38, 0.6); f2.rotation.z = -0.5;
  for (const s of [-1, 1]) for (const [y, z] of [[-0.55, 0.3], [-0.85, 0.15]]) { const w = ball(head, 0.24 * R, m, s * 1.05 * R, y * R, z * R, 0.75, 0.9, 1.1); w.rotation.z = -s * 0.4; } // waves
  for (const s of [-1, 1]) ball(head, 0.04, MAT.gold, s * 0.98 * R, -0.3 * R, 0.2 * R);
}
function hairMan(head, R) {
  const m = MAT.hairM;
  // short cut hugging the skull: crown cap tilted back (higher hairline), full back, soft side part with a low quiff
  M(new THREE.SphereGeometry(R * 1.035, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.36), m, head).rotation.x = -0.05;
  const back = M(new THREE.SphereGeometry(R * 1.03, 40, 20, Math.PI * 0.55, Math.PI * 0.9, 0.15, Math.PI * 0.5), m, head); back.rotation.y = Math.PI;
  for (const s of [-1, 1]) { const side = M(new THREE.SphereGeometry(R * 1.03, 24, 16, s > 0 ? Math.PI * 1.05 : -Math.PI * 0.05, Math.PI * 0.3, Math.PI * 0.18, Math.PI * 0.28), m, head); side.rotation.y = Math.PI / 2; }
  const quiff = ball(head, 0.42 * R, m, 0.12 * R, 0.86 * R, 0.4 * R, 1.35, 0.32, 0.7); quiff.rotation.z = -0.2;
  // stubble along the jaw
  M(new THREE.SphereGeometry(R * 1.008, 48, 20, Math.PI * 0.06, Math.PI * 0.88, Math.PI * 0.69, Math.PI * 0.27), MAT.stubble, head);
  for (const s of [-1, 1]) ball(head, 0.22 * R, MAT.skin, s * 0.98 * R, 0.0, 0.0, 0.42, 0.75, 0.6); // ears
}

// ---------------------------------------------------------------- figure
// The rig is plain groups; the body is ONE smooth clay surface rebuilt from the joints on every pose() (see sdf.js),
// so arms, neck, hips and legs flow into each other without seams. Face, hair and earrings stay separate meshes on the head.
export function makeFigure(kind) {
  const isW = kind === 'w';
  const root = new THREE.Group();
  const R = 0.215;
  const dims = isW ? { hipW: 0.062, thigh: 0.24, shin: 0.22, torso: 0.3, shW: 0.145, upper: 0.19, fore: 0.17 }
                   : { hipW: 0.072, thigh: 0.26, shin: 0.24, torso: 0.33, shW: 0.17, upper: 0.21, fore: 0.19 };
  const J = { root };
  const pelvis = J.pelvis = G(root, 0, dims.thigh + dims.shin + 0.07, 0);
  const spine = J.spine = G(pelvis);
  const chest = J.chest = G(spine, 0, dims.torso, 0);
  J.neck = G(chest, 0, -0.01, 0);
  const head = J.head = G(J.neck, 0, 0.08 + R * 0.92, 0.0);
  J.face = buildFace(head, R, kind);
  isW ? hairWoman(head, R) : hairMan(head, R);
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    const sh = J['sh' + k] = G(chest, s * dims.shW, -0.04, 0);
    const el = J['el' + k] = G(sh, 0, -dims.upper, 0);
    J['ha' + k] = G(el, 0, -dims.fore, 0);
    const hip = J['hip' + k] = G(pelvis, s * dims.hipW, 0, 0);
    const kn = J['kn' + k] = G(hip, 0, -dims.thigh, 0);
    J['an' + k] = G(kn, 0, -dims.shin, 0);
  }
  J.bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0, side: THREE.DoubleSide });
  J.kind = kind; J.R = R; J.dims = dims;
  root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return J;
}

// body primitives in root space from the current joint frames
function bodyPrims(J) {
  const isW = J.kind === 'w', R = J.R, d = J.dims;
  J.root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(J.root.matrixWorld).invert();
  const fr = (g) => new THREE.Matrix4().multiplyMatrices(rootInv, g.matrixWorld);
  const at = (g, x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z).applyMatrix4(fr(g));
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = (m) => m.color;
  const top = C(isW ? MAT.dress : MAT.shirt), skin = C(MAT.skin), legC = C(isW ? MAT.skin : MAT.pants);
  const Fs = fr(J.spine), Fp = fr(J.pelvis), P = [];
  // torso: soft pear (her) / soft block (him), squashed front-to-back
  if (isW) {
    const low = cone(v(0, -0.05, 0), v(0, 0.15, 0), 0.13, 0.112, top, 0.05, Fs, 0.8); low.split = { y: -0.005, col: C(MAT.skirt) }; P.push(low);
    P.push(cone(v(0, 0.15, 0), v(0, 0.25, 0), 0.112, 0.118, top, 0.05, Fs, 0.78));
    P.push(cone(v(-0.095, 0.265, 0), v(0.095, 0.265, 0), 0.066, 0.066, top, 0.05, Fs, 0.8));
  } else {
    const low = cone(v(0, -0.04, 0), v(0, 0.22, 0), 0.128, 0.14, top, 0.05, Fs, 0.74); low.split = { y: 0.015, col: C(MAT.pants) }; P.push(low);
    P.push(cone(v(-0.11, 0.29, 0), v(0.11, 0.29, 0), 0.075, 0.075, top, 0.05, Fs, 0.78));
  }
  // neck + head (+ fuller cheeks, ears for him)
  const Fn = fr(J.neck), Fh = fr(J.head);
  P.push(cone(v(0, -0.02, 0), v(0, 0.13, 0), 0.052, 0.05, skin, 0.035, Fn));
  P.push(ell(v(0, 0, 0), R, R * 1.03, R * 0.97, skin, 0.04, Fh));
  P.push(ell(v(0, -0.28 * R, 0.08 * R), R * 0.85, R * 0.68, R * 0.82, skin, 0.03, Fh));
  if (!isW) for (const s of [-1, 1]) P.push(ell(v(s * 0.98 * R, 0, 0), 0.1 * R, 0.17 * R, 0.13 * R, skin, 0.015, Fh));
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    // arms: sleeves flow out of the shoulders, hands flow out of the cuffs
    const sh = at(J['sh' + k]), el = at(J['el' + k]), ha = at(J['ha' + k]), Fa = fr(J['ha' + k]);
    P.push(cone(sh, el, isW ? 0.05 : 0.056, isW ? 0.045 : 0.05, top, 0.045));
    P.push(cone(el, ha, isW ? 0.045 : 0.05, isW ? 0.043 : 0.048, top, 0.03));
    P.push(cone(v(0, 0.0, 0), v(0, -0.035, 0), isW ? 0.03 : 0.035, isW ? 0.031 : 0.036, skin, 0.012, Fa));
    P.push(ell(v(0, -0.07, 0.004), isW ? 0.036 : 0.042, isW ? 0.05 : 0.056, isW ? 0.024 : 0.028, skin, 0.025, Fa));
    P.push(ell(v(-s * 0.032, -0.055, 0.018), 0.014, 0.026, 0.014, skin, 0.012, Fa));
    // legs
    const hp = at(J['hip' + k]), kn = at(J['kn' + k]), an = at(J['an' + k]), Fan = fr(J['an' + k]);
    if (isW) {
      P.push(cone(hp, at(J['hip' + k], 0, -d.thigh * 0.86, 0), 0.078, 0.072, C(MAT.skirt), 0.05));
      P.push(cone(at(J['hip' + k], 0, -d.thigh * 0.6, 0), kn, 0.046, 0.043, skin, 0.03));
    } else P.push(cone(hp, kn, 0.064, 0.057, legC, 0.04));
    P.push(cone(kn, an, isW ? 0.043 : 0.057, isW ? 0.033 : 0.05, legC, 0.03));
    P.push(ell(v(0, -0.035, 0.04), isW ? 0.044 : 0.054, isW ? 0.034 : 0.04, isW ? 0.078 : 0.09, C(isW ? MAT.shoeW : MAT.shoeM), 0.02, Fan));
  }
  if (isW) { // skirt webbing between the thighs so it reads as one skirt, not shorts
    for (const t of [0.35, 0.8]) P.push(cone(at(J.hipL, 0, -d.thigh * t, 0), at(J.hipR, 0, -d.thigh * t, 0), 0.062, 0.062, C(MAT.skirt), 0.05));
  }
  return P;
}
export function rebuildBody(J, h = 0.0075) {
  if (J.body) { J.root.remove(J.body); J.body.geometry.dispose(); }
  const g = meshPrims(bodyPrims(J), h);
  J.body = new THREE.Mesh(g, J.bodyMat); J.body.castShadow = J.body.receiveShadow = true; J.root.add(J.body);
}

// ---------------------------------------------------------------- poses
// keys: pelvis [x,y,z] rotation, spine, chest, neck, head, shL, elL, haL, shR, ..., hipL, knL, anL, ...; y = pelvis height offset
const P = (o) => o;
export const POSES = {
  stand: P({ shL: [0, 0, -0.12], shR: [0, 0, 0.12], elL: [-0.15, 0, 0], elR: [-0.15, 0, 0] }),
  sitSad: P({ y: -0.31, hipL: [-1.5, 0.05, 0], hipR: [-1.5, -0.05, 0], knL: [1.45, 0, 0], knR: [1.45, 0, 0], spine: [0.22, 0, 0], neck: [0.15, 0, 0], head: [0.35, 0, 0],
               shL: [-0.55, 0, -0.05], shR: [-0.55, 0, 0.05], elL: [-0.9, 0.5, 0], elR: [-0.9, -0.5, 0] }),
  sitFaceInHands: P({ y: -0.31, hipL: [-1.45, 0.12, 0], hipR: [-1.45, -0.12, 0], knL: [1.55, 0, 0], knR: [1.55, 0, 0], spine: [0.55, 0, 0], neck: [0.2, 0, 0], head: [0.45, 0, 0],
               shL: [-1.25, 0.2, -0.25], shR: [-1.25, -0.2, 0.25], elL: [-2.2, 0.3, 0], elR: [-2.2, -0.3, 0], haL: [0.2, 0, 0], haR: [0.2, 0, 0] }),
  sitPhone: P({ y: -0.31, hipL: [-1.5, 0.08, 0], hipR: [-1.5, -0.08, 0], knL: [1.5, 0, 0], knR: [1.5, 0, 0], spine: [0.12, 0, 0], neck: [0.15, 0, 0], head: [0.4, 0, 0],
               shL: [-0.45, 0, -0.1], shR: [-0.45, 0, 0.1], elL: [-1.35, 0.45, 0], elR: [-1.35, -0.45, 0] }),
  armsCrossed: P({ shL: [-0.25, 0, -0.2], shR: [-0.25, 0, 0.2], elL: [-1.75, 1.15, 0], elR: [-1.65, -1.15, 0], head: [-0.05, 0, 0] }),
  reach: P({ shR: [-0.95, -0.15, 0.05], elR: [-0.35, 0, 0], shL: [0, 0, -0.12], elL: [-0.25, 0, 0], spine: [0.08, 0, 0] }),
  hug: P({ shL: [-1.2, 0.5, 0], shR: [-1.2, -0.5, 0], elL: [-0.9, 1.0, 0], elR: [-0.9, -1.0, 0], spine: [0.05, 0, 0] }),
  lieSide: P({}),
};
// walk cycle phase p (0..1) layered on top of a base pose
export function walk(p, stride = 0.42) {
  const a = Math.sin(p * Math.PI * 2), b = Math.sin(p * Math.PI * 2 + Math.PI);
  const kb = (x) => Math.max(0, -x) * 0.75 + 0.08;
  return { y: -Math.abs(Math.cos(p * Math.PI * 2)) * 0.012, hipL: [-a * stride, 0, 0], hipR: [-b * stride, 0, 0], knL: [kb(-a) + (a > 0 ? 0.25 : 0), 0, 0], knR: [kb(-b) + (b > 0 ? 0.25 : 0), 0, 0],
    shL: [b * 0.32, 0, -0.1], shR: [a * 0.32, 0, 0.1], elL: [-0.25, 0, 0], elR: [-0.25, 0, 0], spine: [0.04, 0, 0] };
}
export function mix(...poses) { return Object.assign({}, ...poses); }

const KEYS = ['spine', 'chest', 'neck', 'head', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR', 'pelvis'];
export function pose(J, p) {
  for (const k of KEYS) { const v = p[k] || [0, 0, 0]; J[k].rotation.set(v[0], v[1], v[2]); }
  J.pelvis.position.y = J.dims.thigh + J.dims.shin + 0.07 + (p.y || 0);
  // ankles keep the feet flat-ish
  for (const s of ['L', 'R']) { const h = (p['hip' + s] || [0])[0], k = (p['kn' + s] || [0])[0]; J['an' + s].rotation.x = -(h + k) * 0.9; }
  rebuildBody(J);
}
export function place(J, x, z, yaw = 0, y = 0) { J.root.position.set(x, y, z); J.root.rotation.y = yaw; }
