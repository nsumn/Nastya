// =================== STREET (meters): the classic low-poly city street (copied from parts_rocket/r_city.js) ===================
const city = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(62, W / H, 0.1, 5000);
city.fog = new THREE.Fog(new THREE.Color(0.6, 0.7, 0.85), 180, 2400);
const hemi = new THREE.HemisphereLight(0xbfd6f2, 0x5b4e40, 1.0); city.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0dc, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 600 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.02;
city.add(sunL, sunL.target);
const archL = new THREE.DirectionalLight(0xc8d8ff, 0); archL.position.set(0, 100, -10); city.add(archL, archL.target);

function box(w, h, d, mat, x, y, z, parent = city) { const m = mesh(BOX, typeof mat === 'string' ? M(mat) : mat); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }

// ---- ground: asphalt, sidewalks, markings
const XA = -600, XB = 1400;
const asphalt = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#55585e', '#41444a', '#5c5f64', '#3b3e43'], 3);
  for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(30,32,36,0.25)'; g.fillRect(R(0, w), R(0, h), R(40, 140), R(20, 80)); }
  g.strokeStyle = 'rgba(25,26,30,0.7)'; g.lineWidth = 1.6;
  for (let i = 0; i < 14; i++) { let x = R(0, w), y = R(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += R(-22, 22); y += R(-22, 22); g.lineTo(x, y); } g.stroke(); }
}, [(XB - XA) / 18, 2]);
const ground = mesh(new THREE.PlaneGeometry(XB - XA, 14), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); ground.rotation.x = -Math.PI / 2; ground.position.set((XA + XB) / 2, 0, 0); city.add(ground);
const sideTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ['#b3b1ac', '#9f9d98', '#bab8b2'], 2);
  g.strokeStyle = 'rgba(70,70,70,0.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
}, [(XB - XA) / 4, 5 / 4]);
for (const s of [-1, 1]) {
  const sw = mesh(new THREE.BoxGeometry(XB - XA, 0.18, 5), M('#ffffff', { map: sideTex, roughness: 0.9 }), false, true); sw.position.set((XA + XB) / 2, 0.09, s * 9.5); city.add(sw);
  box(XB - XA, 0.2, 0.25, '#8f8d88', (XA + XB) / 2, 0.1, s * 7.05);
}
const far = mesh(new THREE.PlaneGeometry(9000, 9000), M('#6d6a62', { roughness: 1 }), false, true); far.rotation.x = -Math.PI / 2; far.position.y = -0.05; city.add(far);
// lane markings (instanced)
{
  const dash = [], dy = [];
  for (let x = XA; x < XB; x += 9) { dash.push([x, 3.5]); dash.push([x, -3.5]); }
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.15), M('#e8e6df', { roughness: 0.6 }), dash.length); const d = new THREE.Object3D();
  dash.forEach(([x, z], i) => { d.position.set(x, 0.02, z); d.rotation.set(-Math.PI / 2, 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.receiveShadow = true; city.add(im);
  for (const z of [-0.14, 0.14]) { const l = mesh(new THREE.PlaneGeometry(XB - XA, 0.12), M('#e3b23c', { roughness: 0.6 }), false, true); l.rotation.x = -Math.PI / 2; l.position.set((XA + XB) / 2, 0.021, z); city.add(l); }
}
// cross streets
const CROSS = [-170, 30, 165, 300, 435, 570, 705, 840, 975, 1110];
const crossRoads = [];
for (const cx of CROSS) {
  const r = mesh(new THREE.PlaneGeometry(14, 2400), M('#ffffff', { map: asphalt, roughness: 0.95 }), false, true); r.rotation.x = -Math.PI / 2; r.position.set(cx, 0.005, 0); city.add(r);
  // crosswalks
  for (const xs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(2.6, 0.5), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + xs * 8.6, 0.025, k * 1.05); city.add(s); }
  for (const zs of [-1, 1]) for (let k = -6; k <= 6; k++) { const s = mesh(new THREE.PlaneGeometry(0.5, 2.6), M('#ecebe6', { roughness: 0.7 }), false, true); s.rotation.x = -Math.PI / 2; s.position.set(cx + k * 1.05, 0.026, zs * 8.6); city.add(s); }
  crossRoads.push(cx);
}

// ---- facades
const WALLS = [
  { wall: '#c56d4c', band: '#e5c27a', trim: '#f0e2c4', brick: true }, { wall: '#d98c69', band: '#f2d8a8', trim: '#f6eedc', brick: false },
  { wall: '#9b4632', band: '#d8b88a', trim: '#e9dcc0', brick: true }, { wall: '#d9a73c', band: '#efd27c', trim: '#7a4a2a', brick: false },
  { wall: '#e3cfab', band: '#c9b48c', trim: '#ffffff', brick: false }, { wall: '#b85a40', band: '#e8cf92', trim: '#efe3c8', brick: true },
  { wall: '#a8b8a8', band: '#e8e2d0', trim: '#ffffff', brick: false }, { wall: '#cf7b5a', band: '#d9a73c', trim: '#f5e9cf', brick: true },
];
const SIGNS = ['#2a6b4f', '#b83a2e', '#1f3d6b', '#e0a81e', '#3a3a3a', '#6b2f5a', '#d46a2a', '#2f7a8a'];
const AWN = ['#2f7a4a', '#c43b2e', '#e2b13a', '#2b5f8a', '#d97a2a', '#3d8a7a'];
function facade(wM, hM, o, store = true) {
  const PPM = 9, cw = Math.ceil(wM * PPM), ch = Math.ceil(hM * PPM);
  const groundH = store ? 4.6 : 3.4, floorH = 3.35;
  const floors = Math.max(1, Math.floor((hM - groundH - 0.9) / floorH));
  const bays = Math.max(2, Math.round(wM / 3.3)), bw = cw / bays;
  const lit = [];
  const map = canvasTex(cw, ch, (g) => {
    g.fillStyle = o.wall; g.fillRect(0, 0, cw, ch);
    const base = new THREE.Color(o.wall);
    speckle(g, cw, ch, cw * ch / 14, ['#' + base.clone().offsetHSL(0, 0, 0.04).getHexString(), '#' + base.clone().offsetHSL(0, 0, -0.05).getHexString()], 2);
    if (o.brick) { g.strokeStyle = 'rgba(60,25,15,0.18)'; g.lineWidth = 1; for (let y = 0; y < ch; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke(); } }
    // cornice
    g.fillStyle = o.band; g.fillRect(0, 0, cw, PPM * 0.9); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, PPM * 0.9, cw, 3);
    const winStyle = rnd();
    for (let f = 0; f < floors; f++) {
      const y0 = ch - (groundH + (f + 1) * floorH) * PPM;
      if (o.bandEvery || winStyle < 0.35) { g.fillStyle = o.band; g.fillRect(0, y0 + floorH * PPM - 4, cw, 4); }
      for (let b = 0; b < bays; b++) {
        const ww = bw * (winStyle < 0.5 ? 0.5 : 0.62), wh = floorH * PPM * (winStyle < 0.5 ? 0.62 : 0.55);
        const x = b * bw + (bw - ww) / 2, y = y0 + floorH * PPM * 0.2;
        g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
        const gr = g.createLinearGradient(x, y, x + ww, y + wh); const sky = rnd();
        gr.addColorStop(0, sky < 0.3 ? '#9fb8cc' : '#44505c'); gr.addColorStop(1, sky < 0.3 ? '#5d7387' : '#262d35');
        g.fillStyle = gr; g.fillRect(x, y, ww, wh);
        if (rnd() < 0.55) { g.fillStyle = pick(['#d9cbb0', '#e8e0d0', '#b8a890', '#6d5a4a']); g.fillRect(x, y, ww, wh * R(0.2, 0.6)); } // curtains
        g.fillStyle = o.trim; g.fillRect(x + ww / 2 - 1, y, 2, wh); g.fillRect(x - 5, y + wh + 2, ww + 10, 4);
        g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, y, ww, 3); g.fillRect(x, y, 3, wh);
        if (rnd() < 0.3) lit.push([x, y, ww, wh]);
      }
    }
    if (store) {
      const y = ch - groundH * PPM;
      g.fillStyle = pick(SIGNS); g.fillRect(0, y, cw, PPM * 0.95);
      g.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = PPM; x < cw - PPM * 2; x += R(PPM * 1.2, PPM * 2.2)) if (rnd() < 0.7) g.fillRect(x, y + PPM * 0.3, R(PPM * 0.4, PPM * 1.1), PPM * 0.35);
      const gy = y + PPM * 0.95, gh = groundH * PPM - PPM * 0.95;
      g.fillStyle = '#3a3f3f'; g.fillRect(0, gy, cw, gh);
      const panes = Math.max(2, Math.round(wM / 2.4));
      for (let p = 0; p < panes; p++) {
        const x = p * cw / panes + 4, w = cw / panes - 8;
        const gr = g.createLinearGradient(x, gy, x + w * 0.6, gy + gh); gr.addColorStop(0, '#7f9a9e'); gr.addColorStop(0.5, '#3c4c50'); gr.addColorStop(1, '#2a3436');
        g.fillStyle = gr; g.fillRect(x, gy + 4, w, gh - 10);
        if (rnd() < 0.5) { g.fillStyle = pick(['#c8a070', '#8fb0a0', '#d0c0a0', '#a07060']); g.fillRect(x + 4, gy + gh * 0.55, w - 8, gh * 0.3); }
      }
      g.fillStyle = '#c9c2b5'; g.fillRect(0, ch - 5, cw, 5);
    } else {
      for (let b = 0; b < bays; b++) { const ww = bw * 0.5, wh = groundH * PPM * 0.5, x = b * bw + (bw - ww) / 2, y = ch - groundH * PPM * 0.8; g.fillStyle = o.trim; g.fillRect(x - 3, y - 3, ww + 6, wh + 6); g.fillStyle = '#39434c'; g.fillRect(x, y, ww, wh); }
    }
  });
  const emi = canvasTex(cw, ch, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
    for (const [x, y, ww, wh] of lit) { g.fillStyle = pick(['#ffd28a', '#ffc070', '#ffe0a8', '#f0b060']); g.fillRect(x, y, ww, wh); }
    if (store) { g.fillStyle = '#ffcf8a'; g.fillRect(0, ch - groundH * PPM + PPM * 0.95 + 4, cw, groundH * PPM - PPM * 0.95 - 12); g.fillStyle = '#ffffff'; g.fillRect(0, ch - groundH * PPM + PPM * 0.3, cw, PPM * 0.35); }
  });
  return { map, emi };
}
const winMats = [];
function wallMat(tex) { const m = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emi, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.88 }); winMats.push(m); return m; }
const roofMat = M('#77736c', { roughness: 1 });
const sharedFacades = WALLS.map(o => ({ o, side: facade(16, 30, o, false) }));
const buildings = [];
function building(x0, x1, side, h, o, unique) {
  const w = x1 - x0, d = R(14, 22), x = (x0 + x1) / 2, z = side * (12 + d / 2);
  const front = unique ? facade(w, h, o, true) : null;
  const sh = sharedFacades.find(s => s.o === o) || sharedFacades[0];
  const sideMat = wallMat(sh.side); sideMat.map = sh.side.map.clone(); sideMat.map.needsUpdate = true; sideMat.map.wrapS = sideMat.map.wrapT = THREE.RepeatWrapping; sideMat.map.repeat.set(d / 16, h / 30);
  sideMat.emissiveMap = sh.side.emi.clone(); sideMat.emissiveMap.needsUpdate = true; sideMat.emissiveMap.wrapS = sideMat.emissiveMap.wrapT = THREE.RepeatWrapping; sideMat.emissiveMap.repeat.copy(sideMat.map.repeat);
  const frontMat = front ? wallMat(front) : sideMat;
  const mats = [sideMat, sideMat, roofMat, roofMat, side < 0 ? frontMat : sideMat, side > 0 ? frontMat : sideMat];
  const b = mesh(BOX, mats); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  // cornice + parapet
  box(w + 0.6, 0.7, d + 0.6, M(o.band), x, h - 0.35, z);
  box(w, 0.9, 0.3, M(o.band), x, h + 0.45, z - side * (d / 2 - 0.15));
  if (rnd() < 0.6) { const ty = h + 0.9; const tank = new THREE.Group(); tank.position.set(x + R(-w / 4, w / 4), ty, z + R(-d / 5, d / 5)); city.add(tank);
    const tk = mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 12), M('#8a6a4a')); tk.position.y = 3.6; tank.add(tk); const cone = mesh(new THREE.ConeGeometry(1.6, 1.2, 12), M('#5c4a38')); cone.position.y = 5.7; tank.add(cone);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 5), M('#3a3a3a')); l.position.set(lx, 1.05, lz); tank.add(l); } }
  for (let k = 0; k < 3; k++) box(R(1.5, 3), R(1, 2), R(1.5, 3), '#9a968e', x + R(-w / 3, w / 3), h + 0.7, z + R(-d / 3, d / 3));
  // awning
  if (unique && rnd() < 0.8) {
    const ac = pick(AWN); const aw = mesh(BOX, M(ac)); aw.scale.set(w * R(0.6, 0.95), 0.12, 2.2); aw.position.set(x, 3.85, side * (12 - 1.0)); aw.rotation.x = side * 0.28; aw.castShadow = true; city.add(aw);
    box(w * R(0.6, 0.9), 0.5, 0.06, M(ac), x, 3.5, side * (12 - 2.05));
  }
  buildings.push({ x, z, w, d, h, side });
  return b;
}
for (const side of [-1, 1]) {
  for (let bi = 0; bi < CROSS.length - 1; bi++) {
    const a = CROSS[bi] + 7, bEnd = CROSS[bi + 1] - 7;
    let x = a;
    while (x < bEnd - 6) {
      const w = Math.min(bEnd - x, R(13, 26)); const near = x < 420 && x > -120;
      const h = rnd() < 0.15 ? R(38, 52) : R(16, 34);
      building(x, x + w, side, h, pick(WALLS), near);
      x += w;
    }
  }
}
// second row + glass towers
function glassTex() {
  return canvasTex(128, 512, (g, w, h) => {
    const base = pick(['#5f7f99', '#6f8ea6', '#4f6a80', '#7d97a8', '#56707a']);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const c = new THREE.Color(base).offsetHSL(R(-0.01, 0.01), 0, R(-0.12, 0.14)); g.fillStyle = '#' + c.getHexString(); g.fillRect(x, y, 7, 7); }
    g.fillStyle = 'rgba(20,30,40,0.5)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y + 7, w, 1);
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.08)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}
const glassPool = [0, 1, 2, 3, 4].map(() => { const map = glassTex(); const emi = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (rnd() < 0.22) { g.fillStyle = pick(['#ffd28a', '#fff0d0', '#ffc070']); g.fillRect(x, y, 7, 7); } }); return { map, emi }; });
function tower(x, z, w, d, h) {
  const t = pick(glassPool); const mp = t.map.clone(); mp.needsUpdate = true; mp.wrapS = mp.wrapT = THREE.RepeatWrapping; mp.repeat.set(w / 30, h / 120);
  const em = t.emi.clone(); em.needsUpdate = true; em.wrapS = em.wrapT = THREE.RepeatWrapping; em.repeat.copy(mp.repeat);
  const m = new THREE.MeshStandardMaterial({ map: mp, emissiveMap: em, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, roughness: 0.35, metalness: 0.25 }); winMats.push(m);
  const b = mesh(BOX, [m, m, roofMat, roofMat, m, m]); b.scale.set(w, h, d); b.position.set(x, h / 2, z); city.add(b);
  box(w * 0.7, 3, d * 0.7, '#8d9aa3', x, h + 1.5, z);
}
for (const side of [-1, 1]) for (let x = -200; x < 1300; x += R(22, 40)) {
  const z = side * R(48, 70), h = R(28, 60); const o = pick(WALLS); const tex = pick(sharedFacades).side;
  const m = wallMat(tex); m.map = tex.map.clone(); m.map.needsUpdate = true; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.repeat.set(1.4, h / 30);
  m.emissiveMap = tex.emi.clone(); m.emissiveMap.needsUpdate = true; m.emissiveMap.wrapS = m.emissiveMap.wrapT = THREE.RepeatWrapping; m.emissiveMap.repeat.copy(m.map.repeat);
  const b = mesh(BOX, m); b.scale.set(R(18, 30), h, R(16, 26)); b.position.set(x, h / 2, z); city.add(b); box(b.scale.x + 0.5, 0.8, b.scale.z + 0.5, M(o.band), x, h, z);
}
for (let i = 0; i < 46; i++) { const side = rnd() < 0.5 ? -1 : 1; tower(R(120, 1500), side * R(30, 260), R(22, 40), R(22, 40), R(70, 210)); }
for (let i = 0; i < 160; i++) { const side = rnd() < 0.5 ? -1 : 1; const h = R(20, 90); box(R(20, 50), h, R(20, 50), pick(['#a99b8a', '#8f8a84', '#b49a80', '#9aa3aa', '#c2b49c']), R(-300, 2600), h / 2, side * R(80, 900)); }

// ---- street props
const poleMat = M('#3b3e42', { roughness: 0.6, metalness: 0.3 });
function streetLamp(x, z, side) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.08, 0.12, 7, 6), poleMat); p.position.y = 3.5; g.add(p);
  const arm = mesh(BOX, poleMat); arm.scale.set(0.1, 0.1, 1.6); arm.position.set(0, 6.9, -side * 0.8); g.add(arm);
  const head = mesh(BOX, new THREE.MeshStandardMaterial({ color: '#d8d4c8', emissive: '#ffd9a0', emissiveIntensity: 0 })); head.scale.set(0.35, 0.15, 0.6); head.position.set(0, 6.8, -side * 1.5); g.add(head); lampHeads.push(head.material);
}
const lampHeads = [];
const TL_STATE = [];
function trafficLight(x, z, side, armLen) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const p = mesh(new THREE.CylinderGeometry(0.12, 0.15, 6.4, 8), M('#2c2e31', { roughness: 0.5, metalness: 0.4 })); p.position.y = 3.2; g.add(p);
  const arm = mesh(BOX, M('#2c2e31')); arm.scale.set(0.14, 0.14, armLen); arm.position.set(0, 6.1, -side * armLen / 2); g.add(arm);
  for (const zz of [-side * armLen * 0.55, -side * armLen * 0.95, -side * 0.3]) {
    const hgrp = new THREE.Group(); hgrp.position.set(0, zz === -side * 0.3 ? 3.4 : 5.4, zz); g.add(hgrp);
    const housing = mesh(BOX, M('#1d1f22')); housing.scale.set(0.42, 1.25, 0.42); hgrp.add(housing);
    const back = mesh(BOX, M('#e0b52a')); back.scale.set(0.08, 1.45, 0.62); back.position.x = 0.24; hgrp.add(back);
    ['#ff3a2a', '#ffb22a', '#3aff7a'].forEach((c, i) => { const l = mesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshStandardMaterial({ color: '#202020', emissive: c, emissiveIntensity: 0 }), false, false); l.position.set(-0.22, 0.38 - i * 0.38, 0); l.rotation.y = -Math.PI / 2; hgrp.add(l); TL_STATE.push({ m: l.material, i }); });
  }
}
// palm tree
const leafTex = canvasTex(256, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let x = 6; x < w - 6; x += 3) { const L = (1 - x / w) * 26 + 6; for (const s of [-1, 1]) { g.strokeStyle = `rgba(${40 + R(0, 25) | 0},${105 + R(0, 40) | 0},${40 + R(0, 20) | 0},1)`; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + L * 0.45, h / 2 + s * L); g.stroke(); } }
  g.strokeStyle = '#5b6b2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
});
const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
const trunkTex = canvasTex(32, 128, (g, w, h) => { g.fillStyle = '#7a6248'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = '#5e4a36'; g.fillRect(0, y, w, 2); g.fillStyle = '#8e7656'; g.fillRect(0, y + 3, w, 2); } }, [1, 6]);
const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTex, roughness: 0.95 });
const palms = [];
function palm(x, z, h) {
  const g = new THREE.Group(); g.position.set(x, 0, z); city.add(g);
  const lean = new THREE.Vector3(R(-1, 1), 0, R(-1, 1)).normalize().multiplyScalar(R(0.4, 1.4));
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(lean.x * u * u, u * h, lean.z * u * u)); }
  const trunk = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.22, 7, false), trunkMat); g.add(trunk);
  const top = pts[8]; const fr = []; const n = 10;
  for (let k = 0; k < n; k++) {
    const L = R(3.6, 4.6); const pg = new THREE.PlaneGeometry(L, 1.7, 10, 1); pg.translate(L / 2, 0, 0); pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position; const droop = R(0.12, 0.2);
    for (let i = 0; i < pa.count; i++) { const xx = pa.getX(i), zz = pa.getZ(i); pa.setY(i, -droop * xx * xx + 0.15 * xx - Math.abs(zz) * 0.35); }
    pg.rotateX(R(-0.3, 0.3)); pg.rotateZ(R(0.05, 0.35)); pg.rotateY(k / n * Math.PI * 2 + R(-0.2, 0.2)); pg.translate(top.x, top.y, top.z); fr.push(pg);
  }
  const fronds = mesh(mergeGeometries(fr), leafMat); g.add(fronds);
  palms.push({ g, fronds, ph: R(0, 6) });
}
// cars
const CAR_COLS = ['#c9302c', '#e9e5da', '#2d4f7a', '#222326', '#e8b923', '#6d7a83', '#3d6b4a', '#8a8f96', '#f0f0ee'];
const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); wheelGeo.rotateX(Math.PI / 2);
const cars = [];
function car(lane, dir, x0, speed) {
  const g = new THREE.Group(); const taxi = rnd() < 0.2; const c = taxi ? '#f2c12e' : pick(CAR_COLS); const big = rnd() < 0.25;
  const L = big ? 4.8 : 4.3, Hh = big ? 0.85 : 0.72;
  box(L, Hh, 1.85, M(c, { roughness: 0.35, metalness: 0.3 }), 0, 0.33 + Hh / 2, 0, g);
  box(L * 0.55, 0.62, 1.68, M(c, { roughness: 0.35, metalness: 0.3 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.53, 0.5, 1.72, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(L * 0.57, 0.5, 1.6, M('#22303a', { roughness: 0.15, metalness: 0.6 }), -0.15, 0.33 + Hh + 0.3, 0, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, 0.6, g);
  box(0.06, 0.16, 0.45, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 0.6 }), L / 2, 0.33 + Hh * 0.6, -0.6, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, 0.62, g);
  box(0.06, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: '#a01010', emissive: '#ff2010', emissiveIntensity: 0.5 }), -L / 2, 0.33 + Hh * 0.6, -0.62, g);
  if (taxi) box(0.6, 0.2, 0.3, '#fff6d8', -0.15, 0.33 + Hh + 0.7, 0, g);
  for (const wx of [-L * 0.32, L * 0.32]) for (const wz of [-0.85, 0.85]) { const w = mesh(wheelGeo, M('#151515')); w.position.set(wx, 0.34, wz); g.add(w); }
  g.rotation.y = dir > 0 ? 0 : Math.PI; city.add(g);
  cars.push({ g, lane, dir, x0, speed });
}
// people
const people = [];
const jumpers = [];
function person(o) {
  const p = makePerson(rnd); city.add(p.outer); const P = { p, ...o, ph: R(0, 6) }; people.push(P); return P;
}

// ---- populate props
for (const side of [-1, 1]) for (let x = -160; x < 1300; x += 30) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; streetLamp(x, side * 7.6, side); }
for (const side of [-1, 1]) for (let x = -150; x < 1300; x += R(11, 16)) { if (CROSS.some(c => Math.abs(x - c) < 10)) continue; if (side < 0 && x > 37 && x < 62) continue; palm(x, side * R(8.0, 8.5), R(7.5, 11.5)); }
for (const cx of [30, 165, 300]) { trafficLight(cx - 8.2, -8.0, -1, 7.5); trafficLight(cx + 8.2, 8.0, 1, 7.5); }
for (let i = 0; i < 46; i++) { const dir = rnd() < 0.5 ? 1 : -1; const lane = dir > 0 ? pick([-1.75, -5.25]) : pick([1.75, 5.25]); car(lane, dir, R(-200, 700), R(8, 13)); }
for (let i = 0; i < 18; i++) { const side = rnd() < 0.5 ? -1 : 1; const g = new THREE.Group(); city.add(g); const dirZ = side; cars.push({ g, cross: true }); g.visible = false; }
// parked/benches/bins
for (const side of [-1, 1]) for (let x = -140; x < 600; x += R(18, 34)) {
  if (CROSS.some(c => Math.abs(x - c) < 12)) continue;
  if (rnd() < 0.5) { const b = new THREE.Group(); b.position.set(x, 0.18, side * 10.9); b.rotation.y = side > 0 ? Math.PI : 0; city.add(b); box(1.8, 0.08, 0.5, '#7a5233', 0, 0.45, 0, b); box(1.8, 0.45, 0.06, '#7a5233', 0, 0.75, -0.25, b); for (const sx of [-0.8, 0.8]) box(0.06, 0.45, 0.45, '#2b2b2b', sx, 0.22, 0, b); }
  else { const bin = mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 10), M('#2f4a3a')); bin.position.set(x, 0.63, side * 7.9); city.add(bin); }
}
// pedestrians on sidewalks
for (let i = 0; i < 120; i++) {
  const side = rnd() < 0.5 ? -1 : 1; const walking = rnd() < 0.8;
  person({ kind: walking ? 'walk' : 'idle', z: side * R(8.9, 11.4), x0: R(-60, 260), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.55), rotIdle: R(0, 6) });
}
// crossing pedestrians
for (let i = 0; i < 26; i++) { const xs = pick([30 - 8.6, 30 + 8.6, 165 - 8.6]); person({ kind: 'cross', x: xs + R(-1, 1), z0: R(-11, 11), v: (rnd() < 0.5 ? 1 : -1) * R(1.1, 1.5) }); }
// jumpers (gravity shot) on the corner past the cross street
const JUMP = { g: 0.29 * 9.81, v0: Math.sqrt(2 * 9.81 * 0.5) };   // 0.5 m jump on Earth -> 1.72 m here, 2.2 s in the air
for (let i = 0; i < 9; i++) { const P = person({ kind: 'jump', x: 41 + (i % 5) * 2.2 + R(-0.5, 0.5), z: -8.4 - Math.floor(i / 5) * 2.2 + R(-0.3, 0.3), off: i * 0.37 + R(0, 0.2), rot: R(-2.5, -0.6) }); jumpers.push(P); }
const ball = mesh(new THREE.SphereGeometry(0.12, 12, 10), M('#d9662a', { roughness: 0.6 })); city.add(ball);

// clouds (sprites)
const cloudTex = canvasTex(256, 128, (g, w, h) => {
  for (let i = 0; i < 26; i++) { const x = R(40, w - 40), y = R(50, h - 30), r = R(18, 42); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(250,250,252,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
});
const clouds = [];
for (let i = 0; i < 22; i++) {
  const m = new THREE.SpriteMaterial({ map: cloudTex, fog: false, transparent: true, depthWrite: false, color: '#ffffff', opacity: 0.9 }); const s = new THREE.Sprite(m);
  const ang = R(-0.9, 0.9) + (rnd() < 0.7 ? 0 : Math.PI); const dist = R(2600, 4400);
  s.position.set(Math.cos(ang) * dist, R(250, 520), Math.sin(ang) * dist); const sc = R(1300, 2400); s.scale.set(sc, sc * 0.38, 1);
  city.add(s); clouds.push(s);
}


const hzC = new THREE.Color();

// sky dome + street update (cars drive, people walk, pigeons) and a night switch
const cityDome = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTop: { value: new THREE.Color('#3d7fd0') }, uBot: { value: new THREE.Color('#cfe3f4') } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uTop, uBot; varying vec3 vD; void main(){ float e=max(vD.y,0.0); gl_FragColor=vec4(mix(uBot,uTop,pow(e,0.6)),1.0); }' }));
city.add(cityDome);
const pigeons = [];
for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const bm = M('#7d8088', { flatShading: true });
  const b = mesh(new THREE.SphereGeometry(0.11, 10, 8), bm); b.scale.set(1, 0.85, 1.5); g.add(b); const hd = mesh(new THREE.SphereGeometry(0.06, 8, 6), M('#5a6070', { flatShading: true })); hd.position.set(0, 0.09, -0.13); g.add(hd);
  const bk = mesh(new THREE.ConeGeometry(0.015, 0.04, 6), M('#e0a040')); bk.rotation.x = -Math.PI / 2; bk.position.set(0, 0.085, -0.2); g.add(bk);
  const wings = [-1, 1].map(s => { const w = mesh(new THREE.BoxGeometry(0.22, 0.01, 0.14), bm); w.geometry.translate(0.11 * s, 0, 0); w.position.set(0.04 * s, 0.04, 0); g.add(w); return w; });
  city.add(g); pigeons.push({ g, wings, x: R(38, 44), z: R(9.8, 11.3), ph: R(0, 6), vx: R(-1, 1), vy: R(2, 3.5), vz: R(-1.5, 1.5) }); }
function updateStreet(t, nightMode) {
  for (const c of cars) { if (c.cross) continue; const x = wrapR(c.x0 + c.dir * c.speed * t, -220, 760); c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0); c.g.visible = true; }
  for (const P of people) { const o = P.p.outer; if (P.kind === 'jump') { o.visible = false; continue; } let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; } else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; } else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    o.position.set(x, (Math.abs(z) > 7 ? 0.18 : 0) + 0.95, z); o.rotation.set(0, ry, 0); if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph); o.visible = Math.hypot(x - cam.position.x, z - cam.position.z) > 1.2; }
  const fly = -1;
  for (const S of pigeons) { const k = Math.max(0, fly - S.ph * 0.05); S.g.position.set(S.x + S.vx * k, 0.2 + (k > 0 ? S.vy * k + 0.6 * k * k : 0) + (k <= 0 ? Math.max(0, Math.sin(t * 5 + S.ph)) * 0.03 : 0), S.z + S.vz * k);
    S.g.rotation.set(k > 0 ? -0.3 : Math.max(0, Math.sin(t * 5 + S.ph)) * 0.5, S.ph, 0); const f = k > 0 ? Math.sin(t * 30 + S.ph) * 0.9 : -0.05; S.wings[0].rotation.z = f; S.wings[1].rotation.z = -f; S.g.visible = false; }
  for (const p of palms) p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph);
  const n = nightMode ? 1 : 0;
  sunL.intensity = lerp(3.0, 0.5, n); sunL.color.set(n ? '#9fb4ff' : '#fff0dc'); hemi.intensity = lerp(1.0, 0.45, n); hemi.color.set(n ? '#6f86c8' : '#bfd6f2'); sunL.position.copy(cam.position).add(new THREE.Vector3(-60, 120, 50)); sunL.target.position.copy(cam.position).add(new THREE.Vector3(10, 0, 0)); sunL.target.updateMatrixWorld();
  for (const m of winMats) m.emissiveIntensity = lerp(0.15, 0.9, n); for (const m of lampHeads) m.emissiveIntensity = lerp(0, 3.0, n);
  cityDome.material.uniforms.uTop.value.set(n ? '#04060f' : '#3d7fd0'); cityDome.material.uniforms.uBot.value.set(n ? '#151a2a' : '#cfe3f4');
  city.fog.color.set(n ? '#0c1020' : '#cfe3f4'); city.fog.near = 120; city.fog.far = 1600;
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
}
