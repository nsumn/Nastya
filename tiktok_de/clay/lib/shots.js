// Test shots for the clay look: one per set, each with a body-language pose.
// fig: kind 'w'|'m', at [x, z], yaw, y (floor offset, e.g. a stair), pose (mix of POSES), face (setFace expression)
import { POSES, walk, mix } from './figure.js';

const SAD = { brow: 1, mouth: -0.7, lid: 0.35, look: [0, -0.6] };
const WORRY = { brow: 0.7, mouth: -0.35, lid: 0.2, look: [0, -0.2] };
const BLANK = { brow: 0.1, mouth: -0.1, lid: 0.45, look: [0, -0.9] };

export const SHOTS = {
  sofa: {
    set: 'living', cap: 'Je mehr sie liebt,',
    fig: [
      { kind: 'w', at: [-0.15, -0.62], yaw: 0.2, pose: POSES.sitSad, face: SAD },
      { kind: 'm', at: [0.5, 0.05], yaw: -0.8, pose: mix(POSES.reach, { head: [0.25, 0, 0], neck: [0.1, 0, 0] }), face: { ...WORRY, look: [-0.4, -0.5] } },
    ],
    cam: { pos: [0.3, 1.2, 4.5], look: [0.2, 0.5, -0.3], fov: 30 },
  },
  kitchen: {
    set: 'kitchen', cap: 'desto stiller wird sie',
    fig: [
      { kind: 'w', at: [0.45, -0.3], yaw: Math.PI - 0.35, pose: POSES.armsCrossed, face: SAD },
      { kind: 'm', at: [-0.4, -0.12], yaw: 0, pose: POSES.sitPhone, face: BLANK },
    ],
    cam: { pos: [0.0, 1.4, 4.6], look: [-0.05, 0.62, -0.1], fov: 31 },
  },
  bed: {
    set: 'bedroom', cap: 'Sie weint leise', night: true,
    fig: [{ kind: 'w', at: [0.05, 0.52], yaw: -0.15, pose: POSES.sitFaceInHands, face: { ...SAD, closed: true, tears: true } }],
    cam: { pos: [0.9, 1.15, 3.6], look: [-0.05, 0.6, 0.0], fov: 30 },
  },
  close: {
    set: 'bedroom', cap: 'Lange vorher.', night: true,
    fig: [{ kind: 'w', at: [-0.1, 0.52], yaw: 0.15, pose: mix(POSES.sitSad, { spine: [0.05, 0, 0], neck: [0, 0, 0], head: [0.05, 0.1, 0] }), face: { brow: 1, mouth: -0.8, lid: 0.3, look: [0.3, -0.3], tears: true } }],
    cam: { pos: [0.0, 1.0, 2.7], look: [-0.1, 0.84, 0.4], fov: 20 },
  },
  stairs: {
    set: 'stairs', cap: 'Sie geht nach oben',
    fig: [
      { kind: 'w', at: [0.35, 0.9 - 5 * 0.27], yaw: Math.PI, y: 5 * 0.17, pose: mix(walk(0.15, 0.35), { hipL: [-0.75, 0, 0], knL: [0.9, 0, 0] }), face: SAD },
      { kind: 'm', at: [1.05, 1.35], yaw: Math.PI + 0.35, pose: mix(POSES.stand, { head: [-0.35, 0, 0] }), face: { ...WORRY, look: [0, 0.8] } },
    ],
    cam: { pos: [1.6, 1.45, 4.9], look: [0.05, 0.8, 0.0], fov: 33 },
  },
  street: {
    set: 'street', cap: 'Sie geht leise',
    fig: [
      { kind: 'w', at: [-0.35, -0.3], yaw: 0.35, y: 0.12, pose: walk(0.25), face: SAD },
      { kind: 'm', at: [0.75, -0.6], yaw: -0.4, y: 0.12, pose: mix(POSES.stand, { head: [0, -0.4, 0] }), face: { ...WORRY, look: [-0.8, 0] } },
    ],
    cam: { pos: [0.2, 1.15, 4.7], look: [0.2, 0.6, -0.6], fov: 30 },
  },
};
