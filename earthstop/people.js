// Stylised low-poly people: jointed limbs (hips/knees, shoulders/elbows), varied outfits and hair.
// Each person = 9 meshes sharing one vertex-coloured material, so hundreds stay cheap to render.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });

function tint(geo, color) {
  const g = geo.index ? geo : geo; const c = new THREE.Color(color); const n = g.attributes.position.count; const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
}
function part(geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  const g = geo.clone(); g.scale(sx, sy, sz); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z);
  if (g.index) { const ng = g.toNonIndexed(); g.dispose(); return tint(ng, color); } return tint(g, color);
}
const CAP = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 7);
const SPH = (r) => new THREE.SphereGeometry(r, 9, 7);
const HALF = (r) => new THREE.SphereGeometry(r, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2);
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const CYL = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 8);

function mk(parts) { const m = new THREE.Mesh(mergeGeometries(parts), MAT); m.castShadow = true; m.receiveShadow = true; return m; }

const SKINS = ['#f1d2b6', '#e9c4a2', '#d7a47e', '#b98260', '#8d5a3c', '#6b4329'];
const HAIR = ['#2a1d14', '#4a2f1b', '#7a4a22', '#d9b36a', '#1a1a1a', '#9a9a9a', '#a5462a'];
const TOPS = ['#e24b3b', '#2f5d8a', '#f2f0ea', '#e0b040', '#4b8b5a', '#1f2a3a', '#7a4a8c', '#f08a4b', '#5aa0c8', '#c8c2b4', '#d46a8a', '#2b2b2e'];
const BOTTOMS = ['#2a3a5c', '#1d1d22', '#5a4632', '#3a4a5c', '#8a8a8a', '#c9b48a', '#23324d'];
const SHOES = ['#f4f4f4', '#1b1b1b', '#6b4a2e', '#b23a2e'];

export function makePerson(rnd, o = {}) {
  const pick = a => a[Math.floor(rnd() * a.length)];
  let skin = pick(SKINS), hair = pick(HAIR), top = pick(TOPS), bottom = pick(BOTTOMS), shoe = pick(SHOES);
  let dress = rnd() < 0.18, shorts = !dress && rnd() < 0.2, longSleeve = rnd() < 0.5, hairStyle = rnd(), cap = rnd() < 0.12;
  if (o.skin) skin = o.skin; if (o.hair) hair = o.hair; if (o.top) top = o.top; if (o.bottom) bottom = o.bottom; if (o.shoe) shoe = o.shoe;
  if (o.dress !== undefined) dress = o.dress; if (o.shorts !== undefined) shorts = o.shorts; if (o.longSleeve !== undefined) longSleeve = o.longSleeve; if (o.hairStyle !== undefined) hairStyle = o.hairStyle; if (o.cap !== undefined) cap = o.cap;
  const h = 0.92 + rnd() * 0.16; // height scale
  const outer = new THREE.Group(); const body = new THREE.Group(); body.position.y = -0.95; outer.add(body);
  const root = new THREE.Group(); root.scale.setScalar(h); body.add(root);
  // torso + head (one mesh)
  const tp = [];
  tp.push(part(CAP(0.15, 0.3), top, 0, 1.24, 0, 1.25, 1, 0.72));               // chest
  tp.push(part(CAP(0.13, 0.12), dress ? top : bottom, 0, 0.98, 0, 1.25, 1, 0.8)); // hips
  if (dress) tp.push(part(CYL(0.16, 0.3, 0.5), top, 0, 0.78, 0));
  tp.push(part(CYL(0.045, 0.05, 0.1), skin, 0, 1.5, 0));                        // neck
  tp.push(part(SPH(0.115), skin, 0, 1.63, 0.005, 1, 1.13, 1.05));               // head
  tp.push(part(BOXG, skin, 0, 1.62, 0.115, 0.03, 0.05, 0.04));                  // nose
  if (cap) { tp.push(part(HALF(0.125), pick(TOPS), 0, 1.68, 0)); tp.push(part(BOXG, pick(TOPS), 0, 1.69, 0.1, 0.2, 0.02, 0.12)); }
  else if (hairStyle < 0.12) { /* bald / buzz */ }
  else {
    tp.push(part(HALF(0.125), hair, 0, 1.655, -0.008, 1.02, 1.05, 1.06));
    if (hairStyle > 0.6) tp.push(part(CAP(0.1, 0.16), hair, 0, 1.52, -0.07, 1.05, 1, 0.55));        // long hair
    else if (hairStyle > 0.45) tp.push(part(SPH(0.06), hair, 0, 1.7, -0.11));                        // bun
  }
  const torso = mk(tp); root.add(torso);
  // legs
  const legs = [], knees = [], arms = [], elbows = [];
  for (const sx of [-0.085, 0.085]) {
    const hip = new THREE.Group(); hip.position.set(sx, 0.96, 0); root.add(hip);
    const thighCol = dress ? skin : bottom;
    hip.add(mk([part(CAP(0.068, 0.3), thighCol, 0, -0.2, 0)]));
    const knee = new THREE.Group(); knee.position.y = -0.43; hip.add(knee);
    const shinCol = dress || shorts ? skin : bottom;
    knee.add(mk([part(CAP(0.055, 0.32), shinCol, 0, -0.2, 0), part(BOXG, shoe, 0, -0.43, 0.04, 0.1, 0.07, 0.22)]));
    legs.push(hip); knees.push(knee);
  }
  for (const sx of [-0.215, 0.215]) {
    const sh = new THREE.Group(); sh.position.set(sx, 1.4, 0); root.add(sh);
    sh.add(mk([part(CAP(0.05, 0.2), top, 0, -0.14, 0)]));
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    el.add(mk([part(CAP(0.044, 0.18), longSleeve ? top : skin, 0, -0.12, 0), part(SPH(0.048), skin, 0, -0.27, 0, 0.9, 1.15, 0.8)]));
    sh.rotation.z = sx > 0 ? -0.08 : 0.08;
    arms.push(sh); elbows.push(el);
  }
  return { outer, legs, knees, arms, elbows, sx: [-1, 1], root, torso, h };
}

// walk cycle (ph in radians)
export function poseWalk(p, ph, amt = 1) {
  const s = Math.sin(ph);
  p.legs[0].rotation.x = s * 0.45 * amt; p.legs[1].rotation.x = -s * 0.45 * amt;
  p.knees[0].rotation.x = Math.max(0, -Math.cos(ph)) * 0.7 * amt; p.knees[1].rotation.x = Math.max(0, Math.cos(ph)) * 0.7 * amt;
  p.arms[0].rotation.x = -s * 0.4 * amt; p.arms[1].rotation.x = s * 0.4 * amt;
  p.elbows[0].rotation.x = -0.25 - Math.max(0, s) * 0.3 * amt; p.elbows[1].rotation.x = -0.25 - Math.max(0, -s) * 0.3 * amt;
}
export function poseIdle(p, t, ph) {
  p.legs[0].rotation.x = 0; p.legs[1].rotation.x = 0; p.knees[0].rotation.x = 0.02; p.knees[1].rotation.x = 0.02;
  p.arms[0].rotation.x = Math.sin(t * 1.3 + ph) * 0.05; p.arms[1].rotation.x = -Math.sin(t * 1.1 + ph) * 0.05;
  p.elbows[0].rotation.x = -0.15; p.elbows[1].rotation.x = -0.15;
}
// limbs thrown around while being pulled / blown away
export function poseFlail(p, t, ph) {
  const f = Math.sin(t * 9 + ph), g = Math.cos(t * 7 + ph);
  p.arms[0].rotation.x = -2.5 + f * 0.4; p.arms[1].rotation.x = -2.2 - g * 0.4;
  p.arms[0].rotation.z = 0.5 + g * 0.3; p.arms[1].rotation.z = -0.5 - f * 0.3;
  p.elbows[0].rotation.x = -0.6 + f * 0.3; p.elbows[1].rotation.x = -0.4 + g * 0.3;
  p.legs[0].rotation.x = 0.5 + f * 0.35; p.legs[1].rotation.x = -0.3 - g * 0.35;
  p.knees[0].rotation.x = 0.8 + g * 0.3; p.knees[1].rotation.x = 0.4 + f * 0.3;
}
export function poseSit(p) {
  p.legs[0].rotation.x = -1.45; p.legs[1].rotation.x = -1.45; p.knees[0].rotation.x = 1.45; p.knees[1].rotation.x = 1.45;
  p.arms[0].rotation.x = -0.3; p.arms[1].rotation.x = -0.3; p.elbows[0].rotation.x = -0.6; p.elbows[1].rotation.x = -0.6;
}
