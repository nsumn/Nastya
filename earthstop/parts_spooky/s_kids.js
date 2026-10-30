// =================== TRICK-OR-TREATERS: one instanced mesh per costume (merged vertex-coloured low-poly kid, ~1.2 m), re-filled every frame.
// The line runs from the front door down the steps, down the front walk, then along the sidewalk toward -x for 3 km (2 ft = 0.61 m per kid). ===================
const KID_STEP = 0.61;
const KC = (geo, col, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => { const g = geo.clone(); g.scale(sx, sy, sz); if (rx || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz))); g.translate(x, y, z);
  const n = g.index ? g.toNonIndexed() : g, c = new THREE.Color(col), a = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } n.setAttribute('color', new THREE.BufferAttribute(a, 3)); n.deleteAttribute('uv'); return n; };
const kSph = (r, w = 9, h = 7) => new THREE.SphereGeometry(r, w, h), kCap = (r, l) => new THREE.CapsuleGeometry(r, l, 2, 7), kCyl = (a, b, h, n = 8) => new THREE.CylinderGeometry(a, b, h, n), kCone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n), kBox = new THREE.BoxGeometry(1, 1, 1);
function kidParts(kind, skin) {
  const P = [], add = (...a) => P.push(KC(...a));
  const legs = c => { for (const x of [-0.07, 0.07]) add(kCap(0.05, 0.3), c, x, 0.22, 0); for (const x of [-0.07, 0.07]) add(kBox, '#1c1c20', x, 0.03, 0.03, 0.09, 0.06, 0.16); };
  const body = (c, w = 1) => { add(kCap(0.13, 0.22), c, 0, 0.62, 0, 1.1 * w, 1, 0.8); for (const x of [-0.17, 0.17]) add(kCap(0.045, 0.3), c, x * w, 0.6, 0.02, 1, 1, 1, 0, x > 0 ? 0.18 : -0.18); };
  const head = (hair) => { add(kSph(0.13), skin, 0, 0.98, 0, 1, 1.08, 1); add(kBox, '#1a1a1e', -0.045, 0.99, 0.12, 0.025, 0.035, 0.01); add(kBox, '#1a1a1e', 0.045, 0.99, 0.12, 0.025, 0.035, 0.01); if (hair) add(new THREE.SphereGeometry(0.138, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.03, -0.035, 1, 0.95, 1.0); add(kBox, '#b0503a', 0, 0.93, 0.125, 0.06, 0.018, 0.01); };
  const bucket = () => { add(kCyl(0.08, 0.065, 0.12, 9), '#f07a1a', 0.21, 0.36, 0.07); add(new THREE.TorusGeometry(0.06, 0.008, 4, 10, Math.PI), '#2a2a2a', 0.21, 0.42, 0.07); };
  if (kind === 'ghost') { add(kCyl(0.16, 0.3, 0.86, 12), '#f4f4f6', 0, 0.45, 0); add(kSph(0.17, 12, 9), '#f4f4f6', 0, 0.92, 0); add(kBox, '#141414', -0.055, 0.95, 0.155, 0.05, 0.07, 0.02); add(kBox, '#141414', 0.055, 0.95, 0.155, 0.05, 0.07, 0.02); bucket(); }
  else if (kind === 'witch') { legs('#1d1d22'); add(kCone(0.26, 0.55, 10), '#4a2a6a', 0, 0.36, 0); body('#4a2a6a'); head('#2a1d14'); add(kCone(0.13, 0.36, 8), '#18181c', 0, 1.27, 0, 1, 1, 1, -0.12); add(kCyl(0.24, 0.24, 0.02, 12), '#18181c', 0, 1.09, 0); add(kCyl(0.135, 0.135, 0.035, 10), '#7a3aa8', 0, 1.115, 0); bucket(); }
  else if (kind === 'pumpkin') { legs('#1d1d22'); add(kSph(0.27, 12, 9), '#ec7a1e', 0, 0.58, 0, 1, 0.85, 1); add(kSph(0.06, 6, 5), '#ec7a1e', 0.2, 0.6, 0.05); head('#4a2f1b'); add(kCyl(0.03, 0.04, 0.09, 5), '#4b6a22', 0, 1.15, 0); bucket(); }
  else if (kind === 'vampire') { legs('#151518'); body('#151518'); add(kBox, '#8a1020', 0, 0.62, -0.13, 0.4, 0.62, 0.03); add(kBox, '#8a1020', 0, 0.86, -0.08, 0.38, 0.14, 0.04); head('#111114'); bucket(); }
  else if (kind === 'skeleton') { legs('#18181c'); body('#18181c'); for (let i = 0; i < 4; i++) add(kBox, '#f0f0ea', 0, 0.54 + i * 0.07, 0.11, 0.2 - i * 0.012, 0.025, 0.01); add(kBox, '#f0f0ea', 0, 0.64, 0.115, 0.03, 0.3, 0.01); add(kSph(0.135), '#f2f0ea', 0, 0.98, 0, 1, 1.08, 1); add(kBox, '#141414', -0.05, 1.0, 0.125, 0.05, 0.05, 0.01); add(kBox, '#141414', 0.05, 1.0, 0.125, 0.05, 0.05, 0.01); bucket(); }
  else if (kind === 'cat') { legs('#18181c'); body('#18181c'); head('#18181c'); for (const x of [-0.07, 0.07]) add(kCone(0.04, 0.09, 4), '#18181c', x, 1.12, 0); add(kCap(0.02, 0.3), '#18181c', 0, 0.4, -0.16, 1, 1, 1, -0.9); bucket(); }
  else if (kind === 'princess') { legs('#e8e2f0'); add(kCone(0.27, 0.62, 12), '#e88ab8', 0, 0.36, 0); body('#e88ab8', 0.9); head('#d9b36a'); add(kCyl(0.07, 0.07, 0.05, 8), '#f0c040', 0, 1.12, 0); bucket(); }
  else if (kind === 'hero') { legs('#2a4fb0'); body('#2a4fb0'); add(kBox, '#c8202a', 0, 0.62, -0.13, 0.36, 0.55, 0.025); head('#2a1d14'); add(kBox, '#1a1a1e', 0, 0.99, 0.11, 0.2, 0.05, 0.03); bucket(); }
  return P;
}
const KINDS = ['ghost', 'witch', 'pumpkin', 'vampire', 'skeleton', 'cat', 'princess', 'hero'];
const KID_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
const KID_MAX = 5200;
const kidIM = {};
for (const k of KINDS) { const im = new THREE.InstancedMesh(mergeGeometries(kidParts(k, '#e2b490')), KID_MAT, KID_MAX); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; st.add(im); kidIM[k] = im; }
// each kid: a costume, a size, a phase; NRF-ish mix (witches and ghosts are common)
const KIDS = Array.from({ length: KID_MAX }, (_, i) => ({ kind: KINDS[[0, 1, 1, 2, 3, 4, 5, 6, 7, 0, 2, 4][(hash(i * 1.37) * 12) | 0]], s: 0.85 + 0.3 * hash(i * 2.11), ph: hash(i * 3.3) * 6.28, dx: (hash(i * 4.7) - 0.5) * 0.18 }));
// the line path: door -> steps -> walk -> sidewalk (-x). s = metres from the door. Exit path (s < 0): along the porch to the right, onto the lawn, out to the street.
const LINE = [[0, -4.95], [0, -3.7], [0, 8.6], [-1.0, 8.95], [FAR_X, 8.95]];
const EXIT = [[0, -4.95], [1.3, -4.95], [1.8, -4.0], [3.4, 8.4], [4.5, 8.95], [400, 8.95]];
const NEXT = [[-13, -5.6], [-13, 8.4], [-14, 8.95], [FAR_X, 8.95]];   // next year: the neighbor's door
function polyAt(path, s) { s = Math.max(0, s); for (let i = 0; i < path.length - 1; i++) { const [ax, az] = path[i], [bx, bz] = path[i + 1], L = Math.hypot(bx - ax, bz - az);
  if (s <= L || i === path.length - 2) { const k = s / L; return { x: lerp(ax, bx, k), z: lerp(az, bz, k), h: Math.atan2(bx - ax, bz - az) }; } s -= L; } }
const groundAt = (x, z) => (Math.abs(x) < 1.55 && z < -4.4 && z > -6) ? PORCH_Y : (Math.abs(x) < 0.85 && z < -4.08 && z >= -4.4) ? 0.36 : (Math.abs(x) < 0.85 && z < -3.76 && z >= -4.08) ? 0.18 : 0;
const _d = new THREE.Object3D();
// place the kids: front(t) = metres the line has advanced; opts: { from, n, walkIn (metres still to walk), kindAt(i, t), pop(i), droop, path }
function layoutKids(t, o) {
  for (const k of KINDS) kidIM[k].count = 0;
  const path = o.path || LINE, n = Math.min(o.n ?? KID_MAX, KID_MAX);
  for (let i = o.from || 0; i < n; i++) {
    const K = KIDS[i]; let s = i * KID_STEP - (o.adv || 0) + (o.walkIn || 0), q, moving = (o.walkIn || 0) > 0.01 || o.moving;
    if (s < 0) { if (!o.exit) continue; q = polyAt(EXIT, -s); moving = true; if (-s > 30) continue; } else q = polyAt(path, s);
    const kind = o.kindAt ? o.kindAt(i, t) : K.kind, im = kidIM[kind]; if (im.count >= KID_MAX) continue;
    const side = s >= 0 && s > 14 ? K.dx : K.dx * 0.4, x = q.x + Math.cos(q.h) * side, z = q.z - Math.sin(q.h) * side;
    const bob = moving ? Math.abs(Math.sin(t * 9 + K.ph)) * 0.05 : Math.max(0, Math.sin(t * 2 * Math.PI / (BP * 2) + K.ph)) * 0.02;   // standing kids bounce on half-time
    const p = o.pop ? o.pop(i, t) : 1, sc = K.s * p;
    _d.position.set(x, groundAt(x, z) + bob, z); _d.rotation.set((o.droop || 0) + (moving ? 0.08 : 0), (s < 0 ? q.h : q.h + Math.PI) + 0.15 * Math.sin(K.ph)   /* in line: facing the door */, 0.04 * Math.sin(t * 3 + K.ph), 'YXZ');
    _d.scale.setScalar(sc); _d.updateMatrix(); im.setMatrixAt(im.count++, _d.matrix); }
  for (const k of KINDS) kidIM[k].instanceMatrix.needsUpdate = true; }
function hideKids() { for (const k of KINDS) kidIM[k].count = 0; }
