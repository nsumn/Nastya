// =================== THE BACKYARD at sunset (meters): the back porch (two chairs, a little table, his phone face-up), the grill on the lawn, a fence, trees ===================
const yard = new THREE.Scene(); const ydCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 300);
{ const skyT = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a4a8a'); gr.addColorStop(0.45, '#c87a8a'); gr.addColorStop(0.7, '#f4a860'); gr.addColorStop(1, '#ffd890'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, color: new THREE.Color(1.15, 1.1, 1.05) })); yard.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.6), fog: false })); sun.position.set(-20, 9, 100); sun.lookAt(0, 0, 0); yard.add(sun); }
yard.fog = new THREE.Fog(0xf0b080, 25, 110);
yard.add(new THREE.HemisphereLight(0xffd0a8, 0x5a6a3a, 0.9));
const ydSun = new THREE.DirectionalLight(0xffb070, 2.6); ydSun.position.set(-4, 4, 12); ydSun.castShadow = true; ydSun.shadow.mapSize.set(2048, 2048); ydSun.shadow.bias = -0.0004; Object.assign(ydSun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, far: 40 }); yard.add(ydSun, ydSun.target);
const ydFill = new THREE.PointLight(0xffe0c0, 1.5, 8, 1.4); ydFill.position.set(0, 2.5, 4); yard.add(ydFill);
const ydBuzz = new THREE.PointLight(0xbcd4ff, 0, 0.8, 1.5); yard.add(ydBuzz);
{ const grassT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6a9a3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = pick(['#5a8a34', '#7aaa48', '#628f3a', '#84b052']); g.fillRect(rnd() * w, rnd() * h, 2, R(3, 7)); } }, [30, 30]);
  const gr = mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; yard.add(gr);
  const sid = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = '#e8e2d4'; g.fillRect(0, y, w, 30); g.fillStyle = '#b8b0a0'; g.fillRect(0, y + 29, w, 3); } }, [5, 2]);
  const wall = mesh(BOX, new THREE.MeshStandardMaterial({ map: sid, roughness: 0.9 })); wall.scale.set(10, 3.4, 0.2); wall.position.set(0, 1.7, -0.1); yard.add(wall); bx(10.4, 0.25, 0.4, '#5a4a40', 0, 3.45, -0.05, yard);
  bx(0.95, 2.1, 0.06, '#8a3a2a', -1.2, 1.35, 0.02, yard); bx(1.2, 0.95, 0.05, '#ffd8a0', 1.6, 1.8, 0.02, yard).material = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.4, 0.9) }); bx(1.3, 0.06, 0.12, '#f4f0ea', 1.6, 1.3, 0.06, yard);
  // porch deck, steps, railing
  const deck = canvasTex(256, 256, (g, w, h) => { for (let x = 0; x < w; x += 28) { g.fillStyle = pick(['#a8784e', '#a07048', '#b0805a']); g.fillRect(x, 0, 27, h); g.fillStyle = 'rgba(60,35,20,0.4)'; g.fillRect(x + 26, 0, 2, h); } }, [3, 1]);
  const dk = mesh(BOX, new THREE.MeshStandardMaterial({ map: deck, roughness: 0.85 })); dk.scale.set(6, 0.3, 2.2); dk.position.set(0, 0.15, 1.1); yard.add(dk);
  for (let k = 0; k < 2; k++) bx(1.4, 0.15, 0.32, '#a07048', 2.2, 0.075 + k * 0, 2.36 + k * 0.3, yard);
  for (const x of [-2.95, -1.5, 0, 1.4]) bx(0.08, 0.9, 0.08, '#f4f0ea', x, 0.75, 2.15, yard); bx(4.4, 0.06, 0.1, '#f4f0ea', -0.8, 1.15, 2.15, yard);
  // porch chairs + the little table
  for (const x of [-0.6, 0.9]) { bx(0.55, 0.06, 0.5, '#f4f0ea', x, 0.72, 1.05, yard); bx(0.55, 0.6, 0.06, '#f4f0ea', x, 1.05, 0.8, yard); for (const [dx, dz] of [[-0.24, -0.2], [0.24, -0.2], [-0.24, 0.2], [0.24, 0.2]]) bx(0.05, 0.42, 0.05, '#f4f0ea', x + dx, 0.51, 1.05 + dz, yard); }
  bx(0.45, 0.05, 0.45, '#6a4a30', 0.15, 0.86, 1.25, yard); bx(0.06, 0.55, 0.06, '#6a4a30', 0.15, 0.58, 1.25, yard);
  // fence + trees far away
  for (let x = -14; x <= 14; x += 0.5) bx(0.12, 1.5, 0.05, '#e8dcc8', x, 0.75, 12, yard); bx(28, 0.08, 0.05, '#d8ccb8', 0, 1.2, 11.95, yard);
  for (let i = 0; i < 14; i++) { const x = R(-16, 16), z = R(14, 30), hgt = R(3, 6); const tr = mesh(new THREE.ConeGeometry(R(1, 1.8), hgt, 7), M(pick(['#3a6a34', '#4a7a3a', '#2f5a2e']), { flatShading: true })); tr.position.set(x, hgt / 2 + 0.6, z); yard.add(tr); } }
const tablePhone = makePhone(); tablePhone.rotation.x = -Math.PI / 2; tablePhone.position.set(0.15, 0.895, 1.25); yard.add(tablePhone);
// the grill: kettle on legs, lid up, burgers on the grate (one extra), smoke
const grill = new THREE.Group(); grill.position.set(1.6, 0, 5.0); yard.add(grill);
{ const blk = M('#1e1e22', { roughness: 0.5, metalness: 0.3 }); const bowl = mesh(new THREE.SphereGeometry(0.35, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), blk); bowl.position.y = 0.85; grill.add(bowl);
  const lid = mesh(new THREE.SphereGeometry(0.35, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), blk); lid.position.set(-0.36, 0.85, 0); lid.rotation.z = 1.4; grill.add(lid);
  for (let k = 0; k < 3; k++) { const a = k * 2.09; const l = bx(0.03, 0.75, 0.03, '#2a2a2e', Math.cos(a) * 0.24, 0.4, Math.sin(a) * 0.24, grill); l.rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15); }
  const grate = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.01, 20), M('#5a5a60', { metalness: 0.6, roughness: 0.4 })); grate.position.y = 0.86; grill.add(grate);
  const coal = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.01, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.6, 0.15) })); coal.position.y = 0.72; grill.add(coal); }
const burgers = [[-0.14, -0.1], [0.12, -0.12], [-0.1, 0.13], [0.15, 0.12]].map(([x, z]) => { const b = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 14), M('#5a3420', { roughness: 0.9 })); b.position.set(x, 0.885, z); grill.add(b); return b; });
const spatula = new THREE.Group(); { bx(0.012, 0.3, 0.02, '#3a2a20', 0, 0.12, 0, spatula); bx(0.08, 0.004, 0.09, '#c8c8d0', 0, -0.04, 0.03, spatula); } dad.elbows[0].add(spatula); spatula.position.set(0, -0.3, 0.03); spatula.rotation.x = -0.9;
const grillSmoke = makeSmoke(yard, 160);
// modes: porchType (close, typing "Call me"), porchWide (phone face-up on the table; he jumps at each buzz), grillPhoto (phone up, taking a photo), grillWide (the extra burger)
const BUZZ = [B5 + 4.6, B5 + 6.3];
function updateYard(t, mode) { if (dad.outer.parent !== yard) yard.add(dad.outer); const P = dad, o = P.outer; o.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); poseIdle(P, t, 0); keys.visible = false; spatula.visible = false; tablePhone.visible = false; ydBuzz.intensity = 0; tablePhone.scr.material.color.setRGB(0.05, 0.05, 0.06);
  if (mode === 'b5') { o.position.set(-0.6, 0.83, 1.05); poseSit(P); P.root.rotation.x = -0.05;   // types "Call me. Not urgent.", sets the phone face-up on the table, waits; jumps at each buzz
    const put = smooth(B5 + 3.2, B5 + 3.9, t), back = smooth(B5 + 4.0, B5 + 4.6, t);
    if (t < B5 + 3.2) { holdPhone(P, t, 'type'); P.face(t > B5 + 2.0 ? 'reading' : 'squint', t); }
    else if (t < B5 + 4.0) { holdPhone(P, t, 'near'); P.arms[1].rotation.set(lerp(-0.4, -0.85, put), 0, lerp(0.12, -0.55, put)); P.elbows[1].rotation.x = lerp(-1.35, -0.5, put); P.face('neutral', t); }
    else { holdPhone(P, t, 'none'); tablePhone.visible = true; P.arms[1].rotation.set(lerp(-0.85, -0.5, back), 0, lerp(-0.55, -0.3, back)); P.elbows[1].rotation.x = lerp(-0.5, -0.6, back); P.arms[0].rotation.set(-0.35, 0, 0.1); P.elbows[0].rotation.x = -0.9;
      let jump = 0; for (const b of BUZZ) jump = Math.max(jump, Math.exp(-Math.pow((t - b - 0.15) / 0.18, 2))); o.position.y += 0.05 * jump; P.torso.rotation.y = -0.6 * Math.max(jump, smooth(BUZZ[0], BUZZ[0] + 0.3, t) * (1 - smooth(BUZZ[0] + 1.0, BUZZ[0] + 1.4, t)), smooth(BUZZ[1], BUZZ[1] + 0.3, t));
      const bz = BUZZ.some(b => t > b && t < b + 0.5); if (bz) tablePhone.scr.material.color.setRGB(1.6, 1.7, 1.9); tablePhone.position.x = 0.15 + (bz ? 0.004 * Math.sin(t * 90) : 0); ydBuzz.position.set(0.15, 1.0, 1.25); ydBuzz.intensity = bz ? 1.2 : 0;
      P.face(t < BUZZ[0] ? 'neutral' : t < BUZZ[0] + 1.2 ? 'surprised' : t < BUZZ[1] ? 'sad' : t < BUZZ[1] + 1.0 ? 'surprised' : 'sad', t); } }
  else { o.position.set(1.6, 0.95, 4.35); P.torso.rotation.y = 0;   // b6: snaps the grill, sends it, pockets the phone, flips burgers; one too many
    if (t < B6 + 1.1) { holdPhone(P, t, 'up'); P.face('happy', t); }
    else if (t < B6 + 3.3) { holdPhone(P, t, 'type'); P.face(t > B6 + 2.0 ? 'proud' : 'reading', t); }
    else { holdPhone(P, t, 'none'); spatula.visible = t > B6 + 3.6; const fl = smooth(B6 + 3.3, B6 + 3.9, t); P.arms[0].rotation.set(lerp(-0.2, -0.9, fl) - 0.25 * fl * Math.max(0, Math.sin(t * 2.2)), 0, -0.15 * fl); P.elbows[0].rotation.x = lerp(-0.15, -0.5, fl); P.face(t < B6 + 6.0 ? 'happy' : 'sad', t); } }
  grillSmoke.begin(); smokeMat.uniforms.uTint.value.set('#d8d4d0'); for (let k = 0; k < 60; k++) { const u = ((t * 0.35 + k / 60) % 1); grillSmoke.add(V3(1.6 + 0.1 * Math.sin(k * 3.1 + t) - u * 0.5, 0.95 + u * 1.6, 5.0 + 0.1 * Math.cos(k * 2.3) + u * 0.5), 0.12 + u * 0.4, 0.22 * (1 - u) * smooth(0, 0.1, u)); } grillSmoke.end(); }
function yardCamera(t, mode) { updateYard(t, mode); const h = headOf(dad); let F;
  if (mode === 'b5') F = blendF(framing(h, V3(0.4, 0.05, 1), lerp(2.5, 2.3, smooth(B5, B5 + 3, t)), 0.62), framing(V3(-0.2, 1.2, 1.15), V3(0.45, 0.3, 1), lerp(2.8, 2.5, smooth(B5 + 5, B6, t)), 0.5), smooth(B5 + 3.0, B5 + 4.8, t));
  else F = blendF(framing(h, V3(-0.5, 0.05, 1), 2.4, 0.62), framing(V3(1.6, 1.45, 4.6), V3(0.7, 0.15, 1), lerp(3.1, 2.8, smooth(B6 + 5, TW, t)), 0.55), smooth(B6 + 3.0, B6 + 5.0, t));
  applyF(ydCam, F); }
