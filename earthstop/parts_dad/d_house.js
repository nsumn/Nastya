// =================== THE CAST (square heads) + props: Dad's phone, the dog ===================
const DAD_HAIR = '#5a4436';   // own colour -> own material, greys over the years
const dad = makeBlock({ skin: '#e2ae86', hair: DAD_HAIR, top: '#3f6e9a', bottom: '#4a4a52', shoe: '#3a2a20', hairStyle: 'short', mustache: '#5a4436', glasses: '#2a2420' });
const mom = makeBlock({ skin: '#f0c8a4', hair: '#7a3a1e', top: '#d85a5a', bottom: '#2f3a5a', shoe: '#5a3a2a', hairStyle: 'long', lip: '#c8303c', h: 0.95 });
const hairMats = [M(DAD_HAIR, { roughness: 0.9 })];
function ageDad(k) { const c = new THREE.Color(DAD_HAIR).lerp(new THREE.Color('#a8a29a'), k); hairMats.forEach(m => m.color.copy(c)); }
function makePhone() { const g = new THREE.Group(); const b = mesh(BOX, M('#1c1c22', { roughness: 0.4 })); b.scale.set(0.085, 0.165, 0.012); g.add(b);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.074, 0.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.4, 1.6) })); scr.position.z = 0.0065; g.add(scr); g.scr = scr; return g; }
const dadPhone = makePhone(); dad.elbows[1].add(dadPhone);
// hold poses: 'near' (both hands, reading), 'far' (arm's length, squinting), 'type' (one finger poking), 'show' (held out sideways), 'up' (taking a photo), 'none'
function holdPhone(P, t, how) { dadPhone.visible = how !== 'none'; const [L, Rr] = [0, 1];
  if (how === 'none') return;
  if (how === 'carry') { P.arms[Rr].rotation.x += -0.2; P.elbows[Rr].rotation.x = -0.5; dadPhone.position.set(0, -0.31, 0.03); dadPhone.rotation.set(-1.4, 0, 0); return; }
  if (how === 'far') { P.arms[Rr].rotation.set(-1.25, 0, 0.05); P.elbows[Rr].rotation.x = -0.25; P.arms[L].rotation.set(-0.2, 0, 0.05); P.elbows[L].rotation.x = -0.3; }
  else if (how === 'show') { P.arms[Rr].rotation.set(-1.15, 0, -0.35); P.elbows[Rr].rotation.x = -0.35; }
  else if (how === 'up') { P.arms[Rr].rotation.set(-1.7, 0, 0.05); P.elbows[Rr].rotation.x = -0.35; P.arms[L].rotation.set(-0.3, 0, 0.05); }
  else { P.arms[Rr].rotation.set(-0.4, 0, 0.12); P.elbows[Rr].rotation.x = -1.35; const poke = how === 'type' ? 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 2.3) : 0.3;
    P.arms[L].rotation.set(-0.45, 0, -0.32); P.elbows[L].rotation.x = -1.2 - 0.18 * poke; }
  const far = how === 'far' || how === 'show' || how === 'up'; dadPhone.position.set(0, -0.31, 0.03); dadPhone.rotation.set(far ? -1.4 : -0.85, far ? 0 : 0.15, 0); }
// the dog: a blocky golden mutt with a drawn face; tail wags, head tilts
const dogFace = canvasTex(256, 230, (g, w, h) => { g.fillStyle = '#d8a050'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2d8a8'; g.beginPath(); g.ellipse(w / 2, h * 0.72, w * 0.3, h * 0.24, 0, 0, 7); g.fill();
  for (const x of [0.3, 0.7]) { g.fillStyle = '#1c1410'; g.beginPath(); g.ellipse(w * x, h * 0.42, w * 0.06, w * 0.07, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w * x - 5, h * 0.42 - 6, w * 0.022, 0, 7); g.fill(); }
  g.fillStyle = '#1c1410'; g.beginPath(); g.ellipse(w / 2, h * 0.62, w * 0.08, w * 0.055, 0, 0, 7); g.fill(); g.fillStyle = '#e8707a'; g.beginPath(); g.ellipse(w / 2, h * 0.86, w * 0.05, w * 0.07, 0, 0, 7); g.fill(); });
function makeDog() { const d = new THREE.Group(), fur = M('#d8a050', { roughness: 0.95 }), dark = M('#b8803a', { roughness: 0.95 });
  const body = new THREE.Group(); d.add(body); const B = (w, h, z_, col, x, y, z, par) => { const m = mesh(BOX, col); m.scale.set(w, h, z_); m.position.set(x, y, z); par.add(m); return m; };
  B(0.26, 0.26, 0.5, fur, 0, 0.36, 0, body); for (const [x, z] of [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]]) B(0.08, 0.26, 0.08, fur, x, 0.13, z, body);
  const tail = new THREE.Group(); tail.position.set(0, 0.45, -0.25); body.add(tail); B(0.05, 0.05, 0.22, dark, 0, 0.05, -0.1, tail);
  const head = new THREE.Group(); head.position.set(0, 0.56, 0.24); body.add(head); const hm = new THREE.Mesh(BOX, [fur, fur, fur, fur, new THREE.MeshStandardMaterial({ map: dogFace, roughness: 0.9 }), fur]); hm.scale.set(0.24, 0.22, 0.22); hm.castShadow = true; head.add(hm);
  for (const s of [-1, 1]) { const e = B(0.06, 0.16, 0.1, dark, s * 0.14, -0.02, -0.02, head); e.rotation.z = s * 0.25; }
  return { g: d, body, head, tail }; }
const dog = makeDog();

// =================== THE HOUSE (meters): living room with Dad's recliner, a window in the back wall (seen from inside and from outside in the snow), the kitchen ===================
const room = new THREE.Scene(); const rmCam = new THREE.PerspectiveCamera(42, W / H, 0.03, 120);
const rmHemi = new THREE.HemisphereLight(0xfff2e2, 0x6a5848, 0.8); room.add(rmHemi);
const rmSun = new THREE.DirectionalLight(0xffe2c0, 2.0); rmSun.position.set(2, 4, -7); rmSun.castShadow = true; rmSun.shadow.mapSize.set(2048, 2048); rmSun.shadow.bias = -0.0004; Object.assign(rmSun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, far: 25 }); room.add(rmSun, rmSun.target);
const rmFill = new THREE.PointLight(0xffe6cc, 2.5, 9, 1.4); rmFill.position.set(0.5, 2.3, 1.5); room.add(rmFill);
const rmLamp = new THREE.PointLight(0xffb468, 0, 5, 1.4); rmLamp.position.set(-1.9, 1.35, -1.55); room.add(rmLamp);
const rmGlow = new THREE.PointLight(0xbcd4ff, 0, 1.2, 1.5); room.add(rmGlow);   // the phone screen lighting his face at night
const rmPorch = new THREE.PointLight(0xa8c0ff, 0, 6, 1.2); rmPorch.position.set(1.3, 2.6, -4.2); room.add(rmPorch);
const rmFace = new THREE.PointLight(0xffc890, 0, 3, 1.5); rmFace.position.set(1.3, 1.9, -1.9); room.add(rmFace);
const outsideM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.6, 1.8) });
{ const wood = canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = pick(['#b88a60', '#b08258', '#bc8e64', '#a87a52']); g.fillRect(0, y, w, 31); g.fillStyle = 'rgba(80,50,28,0.3)'; g.fillRect(0, y + 30, w, 2); } }, [4, 4]);
  const fl = mesh(new THREE.PlaneGeometry(8, 7), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }), false, true); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, -0.5); room.add(fl);
  const paper = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(160,120,80,0.25)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); }, [8, 3]);
  const wallM = new THREE.MeshStandardMaterial({ map: paper, roughness: 0.9 }), sid = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 32) { g.fillStyle = '#c8d4dc'; g.fillRect(0, y, w, 30); g.fillStyle = '#9aa8b4'; g.fillRect(0, y + 29, w, 3); } }, [6, 3]);
  // back wall z = -3 with a window hole (x 0.6..2.0, y 0.9..2.2); the outer skin is siding
  const BW = (w, h, x, y) => { const m = mesh(BOX, [wallM, wallM, wallM, wallM, wallM, new THREE.MeshStandardMaterial({ map: sid, roughness: 0.9 })]); m.scale.set(w, h, 0.16); m.position.set(x, y, -3); room.add(m); };
  BW(4.6, 2.8, -1.7, 1.4); BW(2.0, 2.8, 3.0, 1.4); BW(1.4, 0.9, 1.3, 0.45); BW(1.4, 0.6, 1.3, 2.5);
  bx(1.5, 0.06, 0.3, '#f4efe6', 1.3, 0.9, -2.9, room); bx(1.5, 0.06, 0.3, '#f4efe6', 1.3, 0.88, -3.12, room); for (const x of [0.6, 2.0]) bx(0.06, 1.36, 0.2, '#f4efe6', x, 1.55, -3, room); bx(1.46, 0.05, 0.18, '#f4efe6', 1.3, 1.55, -3, room);
  bx(0.12, 2.8, 7, '#e2d4bc', -4, 1.4, -0.5, room); bx(0.12, 2.8, 7, '#e2d4bc', 4, 1.4, -0.5, room); bx(8, 0.1, 7, '#f4f0ea', 0, 2.82, -0.5, room);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), outsideM); sky.position.set(0, 4, -14); room.add(sky);
  const yard = mesh(new THREE.PlaneGeometry(40, 12), M('#eef2f6', { roughness: 1 }), false, true); yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, -9); room.add(yard);
  // recliner (Dad's chair), side table + lamp, rug, family photos
  const lea = '#7a4a2e', lea2 = '#6a3e24'; bx(0.9, 0.42, 0.8, lea, -1.0, 0.21, -1.25, room); bx(0.9, 0.95, 0.24, lea2, -1.0, 0.75, -1.68, room).rotation.x = -0.18; for (const x of [-1.5, -0.5]) bx(0.18, 0.62, 0.8, lea2, x, 0.31, -1.25, room); bx(0.7, 0.14, 0.42, lea, -1.0, 0.3, -0.7, room);
  bx(0.45, 0.6, 0.45, '#6a4a30', -1.95, 0.3, -1.55, room); bx(0.04, 0.5, 0.04, '#2a2a30', -1.95, 0.85, -1.55, room); const sh = mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.24, 12, 1, true), M('#f4e4c8', { side: THREE.DoubleSide, emissive: '#5a3a10' })); sh.position.set(-1.95, 1.2, -1.55); room.add(sh);
  const rug = mesh(new THREE.PlaneGeometry(2.4, 1.8), M('#a84a3a', { roughness: 1 }), false, true); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.8, 0.005, -0.6); room.add(rug);
  for (const [x, y, w, h, c] of [[-2.4, 1.85, 0.5, 0.4, '#5a8ac8'], [-1.6, 2.0, 0.35, 0.45, '#e8b04a'], [-0.9, 1.8, 0.45, 0.35, '#6ab07a'], [-0.2, 2.0, 0.3, 0.3, '#d86a6a']]) { bx(w + 0.06, h + 0.06, 0.03, '#3a2a1e', x, y, -2.9, room); bx(w, h, 0.035, c, x, y, -2.9, room); }
  // kitchen (right): counter along the right wall, fridge with magnets
  bx(0.65, 0.9, 2.6, '#f2ede4', 3.6, 0.45, -1.4, room); bx(0.68, 0.05, 2.6, '#3a3a40', 3.6, 0.925, -1.4, room); bx(0.4, 0.72, 2.5, '#d8c8a8', 3.85, 1.95, -1.4, room);
  bx(0.7, 1.8, 0.7, '#e8ecee', 3.6, 0.9, 0.35, room); for (let k = 0; k < 5; k++) bx(0.02, 0.07, 0.07, pick(['#e84a4a', '#4a8ae8', '#f2c040', '#5ac87a']), 3.24, 1.1 + hash(k) * 0.6, 0.1 + hash(k + 9) * 0.45, room); }
const snowGeo = new THREE.BufferGeometry(), SN = 900, snowPos = new Float32Array(SN * 3), SN0 = []; for (let i = 0; i < SN; i++) SN0.push([R(-1.5, 4), R(0, 4), R(-7, -3.25), R(0.5, 1.2)]);
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3)); const snowPts = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: new THREE.Color(2, 2, 2.1), size: 0.035, transparent: true, depthWrite: false })); snowPts.frustumCulled = false; room.add(snowPts);
room.add(dad.outer, mom.outer, dog.g);
const keys = new THREE.Group(); { const r = mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 14), M('#c8c8d0', { metalness: 0.8, roughness: 0.3 })); keys.add(r); const k = mesh(BOX, M('#c8c8d0', { metalness: 0.8, roughness: 0.3 })); k.scale.set(0.015, 0.06, 0.004); k.position.y = -0.05; keys.add(k); } dad.elbows[0].add(keys); keys.position.set(0, -0.32, 0.04);
function lightRoom(look) { const L = { day: [0.85, 2.0, [1.6, 1.7, 1.9], 0, 2.5, 0], eve: [0.6, 0.9, [1.6, 0.9, 0.6], 1.6, 2.0, 0], night: [0.22, 0, [0.12, 0.16, 0.34], 1.8, 0.6, 1.4], snow: [0.3, 0, [0.16, 0.2, 0.36], 2.2, 1.6, 0.6] }[look];
  rmHemi.intensity = L[0]; rmSun.intensity = L[1]; outsideM.color.setRGB(...L[2]); rmLamp.intensity = L[3]; rmFill.intensity = L[4]; rmGlow.intensity = L[5]; snowPts.visible = look === 'snow'; rmPorch.intensity = look === 'snow' ? 2.2 : 0; rmFace.intensity = look === 'snow' ? 2.0 : 0; }
// modes: far (2016 intro), type, laugh, read, winIn, winOut (snow), kitchen, dogType, dogWide, night, reply
// ---- one continuous take per beat: he sits and types, then (b2) gets up and walks to the window, (b3) walks to Mom in the kitchen ----
const SEAT = V3(-1.0, 0.53, -1.3), STAND = V3(-1.0, 0.95, -0.8), WIN = { p: V3(2.3, 0.95, -2.5), ry: -1.21 }, KIT = { p: V3(2.2, 0.95, -1.5), ry: 1.0 };
// seated until ts, stands up (0.6 s), walks tw0..tw1 to `to`, then turns to to.ry; returns 'sit' | 'stand' | 'walk' | 'there'
function standWalk(P, t, ts, tw0, tw1, to) { const o = P.outer;
  if (t < ts) { o.position.copy(SEAT); poseSit(P); P.root.rotation.x = -0.1; return 'sit'; }
  const ks = ease(clamp((t - ts) / 0.6, 0, 1)); poseSit(P);
  P.legs.forEach(l => l.rotation.x = lerp(-1.45, 0, ks)); P.knees.forEach(k => k.rotation.x = lerp(1.45, 0.02, ks)); P.root.rotation.x = lerp(-0.1, 0, ks) + 0.35 * Math.sin(Math.PI * ks);
  o.position.lerpVectors(SEAT, STAND, ks); const dir = Math.atan2(to.p.x - STAND.x, to.p.z - STAND.z);
  if (t < tw0) { o.rotation.y = lerp(0, dir, smooth(ts + 0.5, tw0, t)); return 'stand'; }
  const u = clamp((t - tw0) / (tw1 - tw0), 0, 1), w = u * u * (3 - 2 * u); o.position.lerpVectors(STAND, to.p, w);
  if (t < tw1) { o.rotation.y = dir; poseWalk(P, (t - tw0) * 10, Math.sin(Math.PI * u) * 0.9 + 0.1); P.root.rotation.x = 0; return 'walk'; }
  o.rotation.y = lerp(dir, to.ry, smooth(tw1, tw1 + 0.5, t)); poseIdle(P, t, 0); return 'there'; }
function updateRoom(t, mode) { if (dad.outer.parent !== room) room.add(dad.outer); const P = dad, o = P.outer; o.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); keys.visible = false; mom.outer.visible = false; dog.g.visible = false;
  lightRoom({ b2: 'snow', b3: 'eve', b4: 'eve', tw: 'night' }[mode] || 'day');
  if (mode === 'b1') { standWalk(P, t, 99, 99, 99, KIT);   // 0..B2: arm's-length squint, types "Hello this is Dad", laughs at his contacts
    if (t < B1) { holdPhone(P, t, 'far'); P.face('squint', t); } else if (t < B1 + 4) { holdPhone(P, t, 'type'); P.face(t > B1 + 1.2 ? 'happy' : 'squint', t); } else { holdPhone(P, t, 'near'); P.face(t > B1 + 5.0 ? 'laugh' : 'reading', t); } }
  else if (mode === 'b2') { const st = standWalk(P, t, B2 + 3.2, B2 + 3.9, B2 + 5.6, WIN);   // types the weather, gets up, walks to the window, keys in hand
    if (st === 'sit') { holdPhone(P, t, t < B2 + 1.6 ? 'type' : 'near'); P.face(t < B2 + 1.6 ? 'reading' : 'neutral', t); }
    else { holdPhone(P, t, 'carry'); P.face(st === 'there' ? 'worried' : 'neutral', t); if (st === 'there') { keys.visible = t > B2 + 6.0; P.arms[0].rotation.set(lerp(0, -0.5, smooth(B2 + 5.8, B2 + 6.3, t)), 0, 0.1); P.elbows[0].rotation.x = lerp(-0.15, -1.2, smooth(B2 + 5.8, B2 + 6.3, t)); } } }
  else if (mode === 'b3') { const st = standWalk(P, t, B3 + 3.0, B3 + 3.5, B3 + 5.0, KIT);   // sends 👍, gets up, walks over and shows Mom
    if (st === 'sit') { holdPhone(P, t, t > B3 + 1.3 && t < B3 + 2.6 ? 'type' : 'near'); P.face(t > B3 + 2.6 ? 'proud' : t > B3 + 1.3 ? 'squint' : 'reading', t); }
    else if (st === 'there') { holdPhone(P, t, t > B3 + 5.1 ? 'show' : 'carry'); P.face('proud', t); } else { holdPhone(P, t, 'carry'); P.face('happy', t); }
    mom.outer.visible = true; mom.outer.position.set(2.95, 0.95, -1.3); mom.outer.rotation.y = lerp(-1.6, -1.2, smooth(B3 + 4.6, B3 + 5.2, t)); poseIdle(mom, t, 1); mom.arms[1].rotation.set(-0.4, 0, 0); mom.elbows[1].rotation.x = -1.4; mom.face(t > B3 + 6.2 ? 'happy' : t > B3 + 5.2 ? 'surprised' : 'neutral', t + 0.7); }
  else if (mode === 'b4') { standWalk(P, t, 99, 99, 99, KIT); holdPhone(P, t, 'type'); const d = t - B4 - 4;   // typing for six minutes, the dog watching; the draft, then "ok"
    P.face(t < B4 + 2.2 ? 'reading' : t < B4 + 4 ? 'worried' : d < 2.6 ? 'happy' : d < 3.3 ? 'worried' : 'neutral', t);
    dog.g.visible = true; dog.g.position.set(-0.2, 0, -0.95); dog.g.rotation.y = 0.3; dog.body.rotation.x = -0.35; dog.head.rotation.set(-0.2, -0.85, 0.3 * Math.sin(t * 0.9)); dog.tail.rotation.y = 0.6 * Math.sin(t * 9); }
  else { standWalk(P, t, 99, 99, 99, KIT); holdPhone(P, t, 'near'); P.face(t < TW + 2.6 ? 'squint' : t < TW + 3.4 ? 'surprised' : t < REP ? 'proud' : t < REP + 1.3 ? 'happy' : 'laugh', t); }   // tw: storage full … your text
  for (let i = 0; i < SN; i++) { const [x0, y0, z0, sp] = SN0[i]; snowPos[i * 3] = x0 + 0.15 * Math.sin(t * 0.8 + i); snowPos[i * 3 + 1] = wrapR(y0 - t * 0.5 * sp, 0, 4); snowPos[i * 3 + 2] = z0; } snowGeo.attributes.position.needsUpdate = true;
  P.outer.updateMatrixWorld(true); dadPhone.getWorldPosition(rmGlow.position); rmGlow.position.y += 0.05; }
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
// a framing = {pos, look}: camera at h + dir·dist with the head at screen height headY (0 top … 1 bottom); cameras blend between framings, no cuts
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
function blendF(A, B, k) { return { pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) }; }
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function frameCam(cam, h, dir, dist, headY, fov = 40) { applyF(cam, framing(h, dir, dist, headY, fov)); }
function roomCamera(t, mode) { updateRoom(t, mode); const h = headOf(dad), sw = a => Math.sin(t * 0.45 + a) * 0.04; let F;
  if (mode === 'b1') { const intro = framing(h, V3(0.25 + sw(0), -0.05, 1), lerp(3.1, 2.6, smooth(0, B1, t)), 0.52), card = framing(h, V3(-0.35, 0.1, 1), 2.3, 0.62), ct = framing(h, V3(0.4, 0.08, 1), 2.4, 0.66);
    F = t < B1 + 2 ? blendF(intro, card, smooth(B1 - 1.2, B1 + 0.6, t)) : blendF(card, ct, smooth(B1 + 3.2, B1 + 5.0, t)); }
  else if (mode === 'b2') { const card = framing(h, V3(-0.3, 0.1, 1), lerp(2.5, 2.3, smooth(B2, B2 + 3, t)), 0.62), walk = framing(h, V3(-0.2, 0.15, 1), 3.0, 0.5), win = framing(h.clone().add(V3(-0.22, 0, -0.08)), V3(-0.56, 0.05, 0.83), 2.7, 0.52, 46);
    F = t < B2 + 4.5 ? blendF(card, walk, smooth(B2 + 3.0, B2 + 4.5, t)) : blendF(walk, win, smooth(B2 + 4.5, B2 + 6.2, t)); }
  else if (mode === 'b3') { const card = framing(h, V3(0.4, 0.1, 1), lerp(2.9, 2.6, smooth(B3, B3 + 3, t)), 0.68), walk = framing(h, V3(0.1, 0.15, 1), 3.0, 0.5), kit = framing(V3(2.55, 1.45, -1.4), V3(0.05, 0.1, 1), lerp(3.0, 2.7, smooth(B3 + 5, B4, t)), 0.5);
    F = t < B3 + 4.2 ? blendF(card, walk, smooth(B3 + 2.8, B3 + 4.2, t)) : blendF(walk, kit, smooth(B3 + 4.2, B3 + 5.6, t)); }
  else if (mode === 'b4') F = blendF(framing(h, V3(-0.3, 0.08, 1), 2.3, 0.62), framing(h, V3(0.65, 0.05, 1), lerp(3.4, 3.2, smooth(B4 + 5, B5, t)), 0.54), smooth(B4 + 3.0, B4 + 5.0, t));
  else F = blendF(framing(h, V3(-0.4, 0.05, 1), 2.5, 0.69), framing(h, V3(0.3, 0.08, 1), 2.3, 0.64), smooth(TW + 4.5, REP + 0.5, t));
  applyF(rmCam, F); }
