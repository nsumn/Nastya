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
function hairWoman(head, R) {   // the hair itself is sculpted in bodyPrims(); only the earrings are separate
  for (const s of [-1, 1]) ball(head, 0.035, MAT.gold, s * 0.97 * R, -0.36 * R, 0.18 * R);
}
function hairMan(head, R) {     // hair sculpted in bodyPrims(); light stubble along the jaw stays a thin shell
  M(new THREE.SphereGeometry(R * 1.008, 48, 20, Math.PI * 0.06, Math.PI * 0.88, Math.PI * 0.69, Math.PI * 0.27), MAT.stubble, head);
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

// body primitives in root space from the current joint frames.
// Groups (see sdf.js): 'core' = torso, neck, head, skirt; each arm / leg / the hair is its own chain, so chains melt into the
// core but never into each other (legs stay apart, an arm on the lap doesn't weld to the thigh).
function bodyPrims(J) {
  const isW = J.kind === 'w', R = J.R, d = J.dims;
  J.root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(J.root.matrixWorld).invert();
  const fr = (g) => new THREE.Matrix4().multiplyMatrices(rootInv, g.matrixWorld);
  const at = (g, x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z).applyMatrix4(fr(g));
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const sub = (F, x, y, z, rx = 0, ry = 0, rz = 0) => F.clone().multiply(new THREE.Matrix4().compose(v(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), v(1, 1, 1)));
  const C = (m) => m.color;
  const top = C(isW ? MAT.dress : MAT.shirt), skin = C(MAT.skin);
  const Fs = fr(J.spine), Fn = fr(J.neck), Fh = fr(J.head), P = [];
  const add = (p, g, attach) => { if (g) p.g = g; if (attach !== undefined) p.attach = attach; P.push(p); return p; };
  // --- core: torso (sweater), neckline, head
  if (isW) {
    add(cone(v(0, 0.0, 0), v(0, 0.15, 0), 0.125, 0.11, top, 0.05, Fs, 0.8));
    add(cone(v(0, 0.15, 0), v(0, 0.25, 0), 0.11, 0.118, top, 0.05, Fs, 0.8));
    add(cone(v(-0.095, 0.265, 0), v(0.095, 0.265, 0), 0.066, 0.066, top, 0.05, Fs, 0.8));
    add(cone(v(0, -0.005, 0), v(0, 0.025, 0), 0.132, 0.132, top, 0.02, Fs, 0.8)); // ribbed hem band
    // A-line skirt: elliptical cone from the waist towards the knees (flat front-to-back when standing, flat
    // top-to-bottom when sitting, because its frame follows the thighs)
    const pel = at(J.pelvis, 0, 0.02, 0), knM = at(J.knL).add(at(J.knR)).multiplyScalar(0.5);
    const ax = at(J.hipR).sub(at(J.hipL)).normalize(), ay = knM.clone().sub(pel), L = ay.length(); ay.normalize();
    const az = new THREE.Vector3().crossVectors(ax, ay).normalize(); ax.crossVectors(ay, az).normalize();
    const Fk = new THREE.Matrix4().makeBasis(ax, ay, az).setPosition(pel);
    add(cone(v(0, 0.0, 0), v(0, Math.min(L * 0.82, 0.21), 0), 0.118, 0.138, C(MAT.skirt), 0.04, Fk, 0.62));
  } else {
    const low = add(cone(v(0, -0.02, 0), v(0, 0.22, 0), 0.128, 0.14, top, 0.05, Fs, 0.74)); low.split = { y: 0.03, col: C(MAT.pants) };
    add(cone(v(-0.11, 0.29, 0), v(0.11, 0.29, 0), 0.075, 0.075, top, 0.05, Fs, 0.78));
    add(cone(at(J.hipL, 0, -0.02, 0), at(J.hipR, 0, -0.02, 0), 0.078, 0.078, C(MAT.pants), 0.04));
    add(cone(v(0, 0.025, 0), v(0, 0.045, 0), 0.142, 0.142, top, 0.015, Fs, 0.76)); // hem band
  }
  add(cone(v(0, -0.035, 0), v(0, 0.005, 0), isW ? 0.068 : 0.074, isW ? 0.064 : 0.07, top, 0.02, Fn)); // collar
  add(cone(v(0, -0.02, 0), v(0, 0.13, 0), 0.052, 0.05, skin, 0.035, Fn));
  add(ell(v(0, 0, 0), R, R * 1.03, R * 0.97, skin, 0.04, Fh));
  add(ell(v(0, -0.28 * R, 0.08 * R), R * 0.85, R * 0.68, R * 0.82, skin, 0.03, Fh));
  // --- hair: one sculpted chain with the face carved out
  const H = isW ? C(MAT.hairW) : C(MAT.hairM);
  if (isW) {
    add(ell(v(0, 0.1 * R, -0.05 * R), 1.1 * R, 1.03 * R, 1.09 * R, H, 0.04, Fh), 'hair', 0.01);
    add(cone(v(0, 0.0, -0.3 * R), v(0, -0.92 * R, -0.42 * R), 0.86 * R, 0.74 * R, H, 0.05, Fh), 'hair');
    for (const s of [-1, 1]) {
      add(cone(v(s * 0.82 * R, 0.15 * R, 0.12 * R), v(s * 0.92 * R, -0.92 * R, 0.02 * R), 0.27 * R, 0.3 * R, H, 0.05, Fh), 'hair');
      add(ell(v(0, 0, 0), 0.36 * R, 0.2 * R, 0.42 * R, H, 0.04, sub(Fh, s * 0.9 * R, -1.02 * R, -0.05 * R, 0, 0, -s * 0.35)), 'hair'); // flicked-out ends
    }
    add(ell(v(0, 0, 0), 0.85 * R, 0.22 * R, 0.46 * R, H, 0.04, sub(Fh, 0, -1.02 * R, -0.42 * R)), 'hair');
    add(ell(v(0, 0, 0), 0.72 * R, 0.27 * R, 0.42 * R, H, 0.05, sub(Fh, -0.22 * R, 0.64 * R, 0.6 * R, 0, 0, 0.38)), 'hair'); // side-swept fringe
    add(ell(v(0, 0, 0), 0.48 * R, 0.22 * R, 0.36 * R, H, 0.05, sub(Fh, 0.5 * R, 0.72 * R, 0.5 * R, 0, 0, -0.5)), 'hair');
    const cut = add(ell(v(0, -0.38 * R, 0.78 * R), 0.94 * R, 0.96 * R, 0.85 * R, H, 0.02, Fh), 'hair'); cut.sub = true;
  } else {
    add(ell(v(0, 0.1 * R, -0.06 * R), 1.075 * R, 1.0 * R, 1.065 * R, H, 0.03, Fh), 'hair', 0.008);
    add(ell(v(0, 0, 0), 0.6 * R, 0.26 * R, 0.46 * R, H, 0.04, sub(Fh, 0.1 * R, 0.8 * R, 0.42 * R, 0, 0, -0.2)), 'hair'); // low quiff
    const c1 = add(ell(v(0, -0.55 * R, 0.6 * R), 1.25 * R, 1.02 * R, 1.0 * R, H, 0.02, Fh), 'hair'); c1.sub = true;  // face + forehead
    const c2 = add(ell(v(0, -1.12 * R, -0.15 * R), 1.5 * R, 0.78 * R, 1.5 * R, H, 0.02, Fh), 'hair'); c2.sub = true; // neckline
    for (const s of [-1, 1]) { const c = add(ell(v(s * 1.0 * R, -0.14 * R, 0.04 * R), 0.32 * R, 0.3 * R, 0.3 * R, H, 0.02, Fh), 'hair'); c.sub = true; } // ears
    for (const s of [-1, 1]) add(ell(v(s * 0.97 * R, -0.12 * R, 0), 0.11 * R, 0.17 * R, 0.13 * R, skin, 0.015, Fh));
  }
  // --- arms: sleeve -> ribbed cuff -> wrist -> mitten hand with a thumb
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    const g = 'arm' + k, sh = at(J['sh' + k]), el = at(J['el' + k]), ha = at(J['ha' + k]), Fa = fr(J['ha' + k]);
    add(cone(sh, el, isW ? 0.05 : 0.056, isW ? 0.045 : 0.05, top, 0.03), g, 0.05);
    add(cone(el, ha, isW ? 0.045 : 0.05, isW ? 0.043 : 0.048, top, 0.03), g);
    add(cone(v(0, 0.025, 0), v(0, 0.0, 0), isW ? 0.049 : 0.054, isW ? 0.047 : 0.052, top, 0.01, Fa), g);
    add(cone(v(0, -0.005, 0), v(0, -0.035, 0), isW ? 0.03 : 0.035, isW ? 0.031 : 0.036, skin, 0.012, Fa), g);
    add(ell(v(0, -0.07, 0.004), isW ? 0.036 : 0.042, isW ? 0.05 : 0.056, isW ? 0.024 : 0.028, skin, 0.025, Fa), g);
    add(ell(v(-s * 0.032, -0.055, 0.018), 0.014, 0.026, 0.014, skin, 0.012, Fa), g);
  }
  // --- legs: each its own chain
  for (const k of ['L', 'R']) {
    const g = 'leg' + k, hp = at(J['hip' + k]), kn = at(J['kn' + k]), an = at(J['an' + k]), Fan = fr(J['an' + k]);
    const legC = C(isW ? MAT.skin : MAT.pants);
    add(cone(hp, kn, isW ? 0.05 : 0.064, isW ? 0.043 : 0.057, legC, 0.03), g, 0.03);
    add(cone(kn, an, isW ? 0.043 : 0.057, isW ? 0.033 : 0.05, legC, 0.03), g);
    add(ell(v(0, -0.035, 0.04), isW ? 0.044 : 0.054, isW ? 0.034 : 0.04, isW ? 0.078 : 0.09, C(isW ? MAT.shoeW : MAT.shoeM), 0.02, Fan), g);
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
  stand: P({ shL: [0, 0, -0.2], shR: [0, 0, 0.2], elL: [-0.15, 0, 0], elR: [-0.15, 0, 0] }),
  sitSad: P({ seat: 0.3, hipL: [-1.5, 0.05, 0], hipR: [-1.5, -0.05, 0], knL: [1.45, 0, 0], knR: [1.45, 0, 0], spine: [0.22, 0, 0], neck: [0.15, 0, 0], head: [0.35, 0, 0],
               shL: [-0.55, 0, -0.05], shR: [-0.55, 0, 0.05], elL: [-0.9, 0.5, 0], elR: [-0.9, -0.5, 0] }),
  sitFaceInHands: P({ seat: 0.3, hipL: [-1.45, 0.12, 0], hipR: [-1.45, -0.12, 0], knL: [1.55, 0, 0], knR: [1.55, 0, 0], spine: [0.55, 0, 0], neck: [0.2, 0, 0], head: [0.45, 0, 0],
               shL: [-1.25, 0.2, -0.25], shR: [-1.25, -0.2, 0.25], elL: [-2.2, 0.3, 0], elR: [-2.2, -0.3, 0], haL: [0.2, 0, 0], haR: [0.2, 0, 0] }),
  sitPhone: P({ seat: 0.3, hipL: [-1.5, 0.08, 0], hipR: [-1.5, -0.08, 0], knL: [1.5, 0, 0], knR: [1.5, 0, 0], spine: [0.12, 0, 0], neck: [0.15, 0, 0], head: [0.4, 0, 0],
               shL: [-0.45, 0, -0.1], shR: [-0.45, 0, 0.1], elL: [-1.35, 0.45, 0], elR: [-1.35, -0.45, 0] }),
  armsCrossed: P({ shL: [-0.25, 0, -0.2], shR: [-0.25, 0, 0.2], elL: [-1.75, 1.15, 0], elR: [-1.65, -1.15, 0], head: [-0.05, 0, 0] }),
  reach: P({ shR: [-0.95, -0.15, 0.05], elR: [-0.35, 0, 0], shL: [0, 0, -0.22], elL: [-0.25, 0, 0], spine: [0.08, 0, 0] }),
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
  // p.seat = height of the seat surface: the pelvis rests on it instead of sinking in
  J.pelvis.position.y = p.seat !== undefined ? p.seat + (J.kind === 'w' ? 0.06 : 0.066) : J.dims.thigh + J.dims.shin + 0.07 + (p.y || 0);
  // ankles keep the feet flat-ish
  for (const s of ['L', 'R']) { const h = (p['hip' + s] || [0])[0], k = (p['kn' + s] || [0])[0]; J['an' + s].rotation.x = -(h + k) * 0.9; }
  rebuildBody(J);
}
export function place(J, x, z, yaw = 0, y = 0) { J.root.position.set(x, y, z); J.root.rotation.y = yaw; }
