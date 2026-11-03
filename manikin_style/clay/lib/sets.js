// Grey clay sets. Everything here is neutral grey so only the two heroes carry colour.
// Each set builder adds meshes to `g` (a Group) with the floor at y = 0 and the back wall at z = -1.2.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clay = (hex, rough = 0.8) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: 0 });
export const S = {
  wall: clay('#9b9da1'), wall2: clay('#8f9196'), floor: clay('#7b7d81'), wood: clay('#86888c'), dark: clay('#5a5c60'),
  mid: clay('#6f7175'), soft: clay('#7a7c80'), light: clay('#b3b5b9'), white: clay('#cdcfd2'), glass: new THREE.MeshBasicMaterial({ color: '#e3e6ea' }),
  night: new THREE.MeshBasicMaterial({ color: '#6c7280' }), metal: new THREE.MeshStandardMaterial({ color: '#a9abaf', roughness: 0.35, metalness: 0.6 }),
};
function M(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const box = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
const cyl = (r1, r2, h, s = 24) => new THREE.CylinderGeometry(r1, r2, h, s);

function shell(g, { wall = S.wall, floor = S.floor, w = 10, panels = true } = {}) {
  M(new THREE.PlaneGeometry(w, w), floor, g).rotation.x = -Math.PI / 2;
  M(new THREE.PlaneGeometry(w, 5), wall, g, 0, 2.5, -1.2);
  const side = M(new THREE.PlaneGeometry(6, 5), S.wall2, g, -2.2, 2.5, 1.5); side.rotation.y = Math.PI / 2;
  M(box(w, 0.08, 0.04, 0.012), S.light, g, 0, 0.04, -1.18);
  if (panels) {
    for (let i = -6; i <= 6; i++) M(box(0.62, 0.55, 0.03, 0.012), S.wall2, g, i * 0.72, 0.42, -1.18);
    M(box(w, 0.04, 0.05, 0.015), S.light, g, 0, 0.76, -1.17);
  }
}
function windowAt(g, x, y, w = 0.9, h = 1.15, night = false) {
  const win = new THREE.Group(); win.position.set(x, y, -1.17); g.add(win);
  M(box(w, h, 0.06), S.light, win);
  M(new THREE.PlaneGeometry(w - 0.12, h - 0.12), night ? S.night : S.glass, win, 0, 0, 0.032);
  M(box(0.03, h - 0.12, 0.04, 0.008), S.light, win, 0, 0, 0.04);
  M(box(w - 0.12, 0.03, 0.04, 0.008), S.light, win, 0, 0.1, 0.04);
  M(box(w + 0.15, 0.05, 0.16, 0.015), S.light, win, 0, -h / 2 - 0.03, 0.06);
  return win;
}
function frame(g, x, y, w, h) { M(box(w, h, 0.03, 0.01), S.dark, g, x, y, -1.17); M(box(w - 0.06, h - 0.06, 0.035, 0.005), S.light, g, x, y, -1.165); }
function plant(g, x, z, s = 1) {
  M(cyl(0.12 * s, 0.09 * s, 0.22 * s), S.light, g, x, 0.11 * s, z);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 16, 12), S.soft);
    l.position.set(x + Math.cos(a) * 0.09 * s, (0.4 + (i % 3) * 0.08) * s, z + Math.sin(a) * 0.09 * s); l.scale.set(0.6, 1.9, 0.35);
    l.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); l.castShadow = true; g.add(l);
  }
}
function floorLamp(g, x, z) {
  M(cyl(0.12, 0.14, 0.03), S.dark, g, x, 0.015, z); M(cyl(0.012, 0.012, 1.4, 10), S.dark, g, x, 0.7, z);
  const sh = M(new THREE.CylinderGeometry(0.13, 0.2, 0.24, 28, 1, true), S.white, g, x, 1.45, z); sh.material = S.white.clone(); sh.material.side = THREE.DoubleSide;
}
export function sofa(g, x, z, w = 1.9) {
  const so = new THREE.Group(); so.position.set(x, 0, z); g.add(so);
  // seat surface at y = 0.30 (sized to the ~1.2 m clay heroes)
  M(box(w, 0.18, 0.72, 0.07), S.mid, so, 0, 0.13, 0);
  for (const s of [-1, 1]) M(box(w / 2 - 0.07, 0.1, 0.6, 0.05), S.soft, so, s * (w / 4 - 0.02), 0.25, 0.04);
  M(box(w, 0.44, 0.2, 0.08), S.mid, so, 0, 0.44, -0.27);
  for (const s of [-1, 1]) M(box(0.2, 0.38, 0.72, 0.08), S.mid, so, s * (w / 2 + 0.03), 0.2, 0);
  const p = M(box(0.3, 0.26, 0.11, 0.055), S.light, so, w / 2 - 0.32, 0.42, -0.13); p.rotation.set(-0.25, -0.3, 0.15);
  return so;
}

// ---------------------------------------------------------------- sets
export const SETS = {
  living(g) {
    shell(g); windowAt(g, -0.95, 1.55); frame(g, 0.75, 1.75, 0.42, 0.32); frame(g, 1.25, 1.62, 0.28, 0.36);
    for (let i = 0; i < 5; i++) M(cyl(0.045, 0.06, 1.7, 16), S.white, g, -1.55 + i * 0.07, 1.3, -1.1);
    sofa(g, 0.15, -0.75);
    M(box(2.2, 0.012, 1.3, 0.006), S.wall2, g, 0.15, 0.006, 0.35);
    M(box(0.75, 0.05, 0.42), S.light, g, 0.25, 0.22, 0.5);
    for (const x of [-0.3, 0.3]) for (const z of [-0.16, 0.16]) M(cyl(0.018, 0.018, 0.2, 10), S.dark, g, 0.25 + x, 0.1, 0.5 + z);
    M(cyl(0.035, 0.032, 0.08), S.white, g, 0.1, 0.285, 0.45);
    floorLamp(g, 1.35, -0.85); plant(g, -1.45, -0.8);
  },
  kitchen(g) {
    shell(g, { panels: false });
    // counter run along the back wall with upper cabinets and a window over the sink
    M(box(3.6, 0.6, 0.55, 0.03), S.light, g, 0.2, 0.3, -0.92);
    M(box(3.65, 0.04, 0.6, 0.015), S.white, g, 0.2, 0.62, -0.9);
    for (let i = 0; i < 6; i++) { M(box(0.56, 0.5, 0.02, 0.01), S.white, g, -1.2 + i * 0.6, 0.3, -0.64); M(box(0.12, 0.02, 0.03, 0.008), S.metal, g, -1.2 + i * 0.6, 0.5, -0.62); }
    for (const x of [-1.2, -0.6, 1.0, 1.6]) M(box(0.56, 0.55, 0.32, 0.02), S.white, g, x, 1.45, -1.03);
    windowAt(g, 0.2, 1.25, 0.95, 0.8);
    M(box(0.5, 0.05, 0.38, 0.02), S.metal, g, 0.2, 0.625, -0.9); // sink
    M(cyl(0.015, 0.015, 0.22, 10), S.metal, g, 0.2, 0.74, -1.06);
    M(box(0.03, 0.03, 0.14, 0.01), S.metal, g, 0.2, 0.85, -1.0);
    M(cyl(0.04, 0.035, 0.09), S.white, g, 0.48, 0.685, -0.85); // the cup
    // fridge
    M(box(0.7, 1.5, 0.62, 0.05), S.white, g, 2.35, 0.75, -0.9); M(box(0.03, 0.35, 0.04, 0.01), S.metal, g, 2.05, 1.0, -0.57);
    // table (top 0.48) with one chair behind it, facing the camera (seat 0.30)
    M(box(1.0, 0.04, 0.62, 0.02), S.wood, g, -0.4, 0.48, 0.32);
    for (const x of [-0.42, 0.42]) for (const z of [-0.25, 0.25]) M(cyl(0.02, 0.02, 0.46, 10), S.dark, g, -0.4 + x, 0.23, 0.32 + z);
    M(box(0.36, 0.035, 0.34, 0.015), S.mid, g, -0.4, 0.285, -0.12); M(box(0.36, 0.36, 0.035, 0.015), S.mid, g, -0.4, 0.48, -0.3);
    for (const a of [-0.15, 0.15]) for (const b of [-0.14, 0.14]) M(cyl(0.014, 0.014, 0.28, 8), S.dark, g, -0.4 + a, 0.14, -0.12 + b);
    M(cyl(0.035, 0.032, 0.08), S.white, g, -0.62, 0.54, 0.4);
  },
  bedroom(g) {
    shell(g, { wall: S.wall2 }); windowAt(g, 1.25, 1.5, 0.8, 1.1, true);
    const bed = new THREE.Group(); bed.position.set(-0.25, 0, -0.35); g.add(bed);
    M(box(1.5, 0.16, 1.9, 0.05), S.dark, bed, 0, 0.08, 0);
    M(box(1.6, 0.75, 0.08, 0.04), S.mid, bed, 0, 0.4, -0.95);
    M(box(1.44, 0.14, 1.82, 0.06), S.white, bed, 0, 0.23, 0.02);
    for (const s of [-1, 1]) { const p = M(box(0.55, 0.12, 0.3, 0.06), S.white, bed, s * 0.36, 0.36, -0.72); p.rotation.x = -0.25; }
    const duvet = M(box(1.5, 0.05, 1.25, 0.025), S.light, bed, 0, 0.32, 0.33);
    M(box(1.0, 0.05, 0.3, 0.025), S.soft, bed, -0.2, 0.36, -0.1); // folded throw
    for (const s of [-1, 1]) {
      M(box(0.4, 0.34, 0.36, 0.03), S.mid, g, -0.25 + s * 1.05, 0.17, -1.0);
      M(cyl(0.07, 0.09, 0.03), S.dark, g, -0.25 + s * 1.05, 0.355, -1.0); M(cyl(0.01, 0.01, 0.2, 8), S.dark, g, -0.25 + s * 1.05, 0.46, -1.0);
      M(new THREE.CylinderGeometry(0.08, 0.12, 0.16, 24), S.white, g, -0.25 + s * 1.05, 0.62, -1.0);
    }
    frame(g, -0.25, 1.55, 0.7, 0.42);
    M(box(1.8, 0.012, 1.0, 0.006), S.wall, g, -0.25, 0.006, 1.0);
  },
  stairs(g) {
    shell(g, { panels: false });
    const n = 11, rise = 0.17, run = 0.27;
    for (let i = 0; i < n; i++) M(box(1.0, rise * (i + 1), run, 0.015), i % 2 ? S.light : S.white, g, 0.35, rise * (i + 1) / 2, 0.9 - i * run);
    // rail posts + handrail
    for (let i = 0; i < n; i += 2) M(cyl(0.015, 0.015, 0.8, 8), S.dark, g, -0.12, rise * (i + 1) + 0.4, 0.9 - i * run);
    const len = Math.hypot(n * rise, n * run), hr = M(cyl(0.025, 0.025, len, 12), S.dark, g, -0.12, n * rise / 2 + 0.85, 0.9 - n * run / 2 + 0.1);
    hr.rotation.x = -Math.atan2(n * run, n * rise);
    M(box(0.9, 2.0, 0.08, 0.02), S.mid, g, -1.2, 1.0, -1.15); // door at the bottom
    M(cyl(0.025, 0.025, 0.06, 10), S.metal, g, -0.86, 1.0, -1.1).rotation.x = Math.PI / 2;
    frame(g, 1.4, 1.6, 0.35, 0.45);
  },
  street(g) {
    M(new THREE.PlaneGeometry(14, 14), S.mid, g).rotation.x = -Math.PI / 2;     // road
    M(box(14, 0.12, 3.2, 0.02), S.light, g, 0, 0.06, -0.4);                      // pavement
    M(box(14, 0.14, 0.18, 0.03), S.white, g, 0, 0.07, 1.25);                     // kerb
    for (let i = -10; i <= 10; i++) M(box(0.01, 0.002, 3.1, 0.001), S.wall2, g, i * 0.6, 0.121, -0.4);
    // facades
    for (let i = -4; i <= 4; i++) {
      const x = i * 1.4, h = 3.0 + ((i * 7 + 11) % 5) * 0.35;
      M(box(1.38, h, 0.4, 0.02), i % 2 ? S.wall : S.wall2, g, x, h / 2, -2.2);
      for (let r = 0; r < 3; r++) for (const c of [-0.32, 0.32]) {
        M(box(0.36, 0.5, 0.04, 0.01), S.light, g, x + c, 1.3 + r * 0.85, -1.99);
        M(new THREE.PlaneGeometry(0.28, 0.42), S.night, g, x + c, 1.3 + r * 0.85, -1.965);
      }
      M(box(0.4, 0.85, 0.05, 0.01), S.dark, g, x, 0.55, -1.98);
    }
    // street lamps + trees in pots
    for (const x of [-2.4, 1.8]) { M(cyl(0.03, 0.04, 2.6, 12), S.dark, g, x, 1.3, 0.95); M(box(0.12, 0.2, 0.12, 0.03), S.white, g, x, 2.65, 0.95); }
    for (const x of [-1.2, 3.0]) {
      M(cyl(0.05, 0.06, 1.1, 10), S.dark, g, x, 0.6, 0.95);
      for (const [a, b, c, r] of [[0, 1.5, 0, 0.42], [0.25, 1.35, 0.1, 0.3], [-0.25, 1.4, -0.05, 0.32]]) M(new THREE.IcosahedronGeometry(r, 2), S.soft, g, x + a, b, 0.95 + c);
    }
    M(box(0.6, 0.45, 0.4, 0.04), S.mid, g, 0.7, 0.35, -1.75); // bench-ish planter
  },
};

// light rig shared by all sets: soft key from the front-left, sky fill, cool rim
export function lights(scene, { key = 2.2, warm = 0, night = false } = {}) {
  scene.add(new THREE.HemisphereLight(night ? '#c9d0e0' : '#f2f2f4', '#55565a', night ? 0.75 : 1.1));
  const k = new THREE.DirectionalLight(warm ? '#fff1de' : '#ffffff', night ? key * 0.6 : key);
  k.position.set(-1.6, 3.2, 3.4); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); k.shadow.radius = 14; k.shadow.bias = -0.0004; k.shadow.normalBias = 0.01;
  Object.assign(k.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1.5, near: 0.5, far: 12 }); scene.add(k);
  const rim = new THREE.DirectionalLight('#e6ebf5', 0.8); rim.position.set(2.5, 2.2, -1.5); scene.add(rim);
  return k;
}
