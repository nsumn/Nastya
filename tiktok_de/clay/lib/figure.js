// Clay figures: a small FK rig (groups per joint) dressed with smooth lathe parts.
// Units: metres of a ~1.25 m tall toy. Forward is +z, up is +y.
// A pose is a plain object of joint rotations (radians); see POSES below and pose().
import * as THREE from 'three';

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
  const f1 = ball(head, 0.6 * R, m, -0.28 * R, 0.62 * R, 0.6 * R, 1.25, 0.48, 0.62); f1.rotation.z = 0.38;
  const f2 = ball(head, 0.5 * R, m, 0.45 * R, 0.7 * R, 0.48 * R, 1.0, 0.45, 0.62); f2.rotation.z = -0.45;
  for (const s of [-1, 1]) for (const [y, z] of [[-0.55, 0.3], [-0.85, 0.15]]) { const w = ball(head, 0.24 * R, m, s * 1.05 * R, y * R, z * R, 0.75, 0.9, 1.1); w.rotation.z = -s * 0.4; } // waves
  for (const s of [-1, 1]) ball(head, 0.04, MAT.gold, s * 0.98 * R, -0.3 * R, 0.2 * R);
}
function hairMan(head, R) {
  const m = MAT.hairM;
  M(new THREE.SphereGeometry(R * 1.05, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.43), m, head).rotation.x = -0.32;
  const back = M(new THREE.SphereGeometry(R * 1.04, 40, 20, Math.PI * 0.6, Math.PI * 0.8, 0.2, Math.PI * 0.52), m, head); back.rotation.y = Math.PI;
  const quiff = ball(head, 0.55 * R, m, 0.1 * R, 0.82 * R, 0.42 * R, 1.3, 0.42, 0.7); quiff.rotation.z = -0.15;
  // stubble along the jaw
  M(new THREE.SphereGeometry(R * 1.008, 48, 20, Math.PI * 0.06, Math.PI * 0.88, Math.PI * 0.69, Math.PI * 0.27), MAT.stubble, head);
  for (const s of [-1, 1]) ball(head, 0.22 * R, MAT.skin, s * 0.98 * R, 0.0, 0.0, 0.42, 0.75, 0.6); // ears
}

// ---------------------------------------------------------------- figure
export function makeFigure(kind) {
  const isW = kind === 'w';
  const root = new THREE.Group();
  const R = 0.205;
  const dims = isW ? { hipW: 0.065, thigh: 0.24, shin: 0.23, torso: 0.3, shW: 0.15, upper: 0.2, fore: 0.18 }
                   : { hipW: 0.075, thigh: 0.26, shin: 0.25, torso: 0.33, shW: 0.18, upper: 0.22, fore: 0.2 };
  const J = { root };
  const pelvis = J.pelvis = G(root, 0, dims.thigh + dims.shin + 0.07, 0);
  const top = isW ? MAT.dress : MAT.shirt;
  // torso (spine group pivots at the pelvis)
  const spine = J.spine = G(pelvis);
  if (isW) {
    M(body([[0.0, -0.02], [0.125, -0.01], [0.135, 0.04], [0.125, 0.14], [0.13, 0.22], [0.125, 0.28], [0.09, 0.315], [0.0, 0.325]]), MAT.dress, spine).scale.set(1, 1, 0.78);
    M(body([[0.0, -0.07], [0.125, -0.06], [0.125, 0.0], [0.0, 0.01]]), MAT.skirt, spine).scale.set(1, 1, 0.78);
  } else {
    M(body([[0.0, -0.03], [0.125, -0.02], [0.13, 0.08], [0.135, 0.2], [0.15, 0.28], [0.12, 0.34], [0.0, 0.35]]), MAT.shirt, spine).scale.set(1, 1, 0.72);
    M(body([[0.0, -0.06], [0.12, -0.05], [0.13, 0.03], [0.0, 0.04]]), MAT.pants, spine).scale.set(1, 1, 0.75);
  }
  const chest = J.chest = G(spine, 0, dims.torso, 0);
  // neck + head
  J.neck = G(chest, 0, -0.01, 0);
  M(taper(0.05, 0.055, 0.1), MAT.skin, J.neck).position.y = 0.09;
  const head = J.head = G(J.neck, 0, 0.08 + R * 0.92, 0.0);
  ball(head, R, MAT.skin, 0, 0, 0, 1, 1.03, 0.97);
  ball(head, R * 0.85, MAT.skin, 0, -0.28 * R, 0.08 * R, 1, 0.8, 0.95); // fuller cheeks / jaw
  J.face = buildFace(head, R, kind);
  isW ? hairWoman(head, R) : hairMan(head, R);
  // arms
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    const sh = J['sh' + k] = G(chest, s * dims.shW, -0.04, 0);
    M(taper(isW ? 0.05 : 0.055, isW ? 0.044 : 0.047, dims.upper), top, sh); // long sleeves (sweater)
    const el = J['el' + k] = G(sh, 0, -dims.upper, 0);
    M(taper(isW ? 0.044 : 0.047, isW ? 0.04 : 0.042, dims.fore), top, el);
    const ha = J['ha' + k] = G(el, 0, -dims.fore, 0);
    M(taper(isW ? 0.034 : 0.04, isW ? 0.032 : 0.038, 0.03), MAT.skin, ha);
    ball(ha, isW ? 0.042 : 0.05, MAT.skin, 0, -0.05, 0.005, 0.8, 1.15, 0.62);
    const th = ball(ha, isW ? 0.018 : 0.022, MAT.skin, -s * 0.03, -0.035, 0.02, 1, 1.6, 1); th.rotation.z = s * 0.5;
  }
  // legs
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    const hip = J['hip' + k] = G(pelvis, s * dims.hipW, 0, 0);
    const legMat = isW ? MAT.skin : MAT.pants;
    if (isW) M(taper(0.07, 0.062, dims.thigh * 0.85), MAT.skirt, hip); // skirt over the thigh
    M(taper(isW ? 0.05 : 0.062, isW ? 0.042 : 0.055, dims.thigh), legMat, hip);
    const kn = J['kn' + k] = G(hip, 0, -dims.thigh, 0);
    M(taper(isW ? 0.042 : 0.055, isW ? 0.034 : 0.048, dims.shin), legMat, kn);
    const an = J['an' + k] = G(kn, 0, -dims.shin, 0);
    const shoe = ball(an, isW ? 0.045 : 0.055, isW ? MAT.shoeW : MAT.shoeM, 0, -0.03, 0.05, 0.85, 0.6, 1.7);
  }
  if (isW) { // skirt bridge between the thighs (follows the hips)
    J.skirt = M(body([[0.0, -0.17], [0.15, -0.16], [0.14, -0.06], [0.12, 0.0], [0.0, 0.01]]), MAT.skirt, pelvis); J.skirt.scale.set(1, 1, 0.8);
  }
  J.kind = kind; J.R = R; J.dims = dims;
  root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return J;
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
  if (J.skirt) { const h = ((p.hipL || [0])[0] + (p.hipR || [0])[0]) / 2; J.skirt.rotation.x = h * 0.55; J.skirt.scale.set(1, 1 - Math.min(0.5, -h * 0.25), 0.8 + Math.min(0.6, -h * 0.4)); J.skirt.position.z = -h * 0.06; }
}
export function place(J, x, z, yaw = 0, y = 0) { J.root.position.set(x, y, z); J.root.rotation.y = yaw; }
