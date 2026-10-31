function place(P, x, z, ry, dy = 0) { P.outer.position.set(x, dy, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
// sitting on the ground, legs forward (knees a little up); returns how much to lower the body so the hips touch the mat
function sitGround(P, knee = 0.35) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.45 + knee * 0.5); rotL(P, 'calf_' + s, [1, 0, 0], knee); rotL(P, 'foot_' + s, [1, 0, 0], -0.3); }
  rotL(P, 'thigh_l', [0, 0, 1], 0.12); rotL(P, 'thigh_r', [0, 0, 1], -0.12); rotL(P, 'spine_01', [1, 0, 0], 0.12); }
function holdBowl(P, lift = 0) { armsDown(P, 1.0); for (const [s, k] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -0.45 - lift); rotL(P, 'upperarm_' + s, [0, 0, 1], 0.12 * k);
    rotL(P, 'lowerarm_' + s, [1, 0, 0], -1.05); rotL(P, 'lowerarm_' + s, [0, 1, 0], -0.55 * k); rotL(P, 'hand_' + s, [0, 0, 1], -0.6 * k); fingers(P, s, 0.55); } }
function settle(P, hipY = 0.1) { P.outer.updateMatrixWorld(true); const py = boneW(P, 'pelvis').y; P.outer.position.y += hipY - py; P.outer.updateMatrixWorld(true); }
const POSE = P => { sitGround(P); holdBowl(P); };
