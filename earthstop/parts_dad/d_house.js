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
function updateRoom(t, mode) { if (dad.outer.parent !== room) room.add(dad.outer); const P = dad, o = P.outer; o.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); keys.visible = false; mom.outer.visible = false; dog.g.visible = false;
  const look = { winIn: 'snow', winOut: 'snow', read: 'eve', kitchen: 'eve', night: 'night', dogType: 'eve', dogWide: 'eve' }[mode] || 'day'; lightRoom(look);
  const seated = !['winIn', 'winOut', 'kitchen'].includes(mode);
  if (seated) { o.position.set(-1.0, 0.53, -1.3); poseSit(P); P.root.rotation.x = -0.1; }
  if (mode === 'far') { holdPhone(P, t, 'far'); P.face('squint', t); }
  else if (mode === 'type') { holdPhone(P, t, 'type'); P.face(t > B1 + 1.2 ? 'happy' : 'squint', t); }
  else if (mode === 'laugh') { holdPhone(P, t, 'near'); P.face('laugh', t); }
  else if (mode === 'read') { holdPhone(P, t, 'near'); P.face(t > B3 + 2.2 ? 'proud' : 'reading', t); }
  else if (mode === 'night') { holdPhone(P, t, 'near'); P.face(t < TW + 2.6 ? 'squint' : t < TW + 3.4 ? 'surprised' : 'proud', t); }
  else if (mode === 'reply') { holdPhone(P, t, 'near'); P.face(t > REP + 1.3 ? 'laugh' : 'happy', t); }
  else if (mode === 'dogType' || mode === 'dogWide') { holdPhone(P, t, 'type'); const del = mode === 'dogWide' ? t - B4 - 4 : 0; P.face(mode === 'dogType' ? (t > B4 + 2.2 ? 'worried' : 'reading') : del < 2.6 ? 'happy' : del < 3.3 ? 'worried' : 'neutral', t);
    dog.g.visible = true; dog.g.position.set(-0.2, 0, -0.95); dog.g.rotation.y = 0.3; dog.body.rotation.x = -0.35; dog.head.rotation.set(-0.2, -0.85, 0.3 * Math.sin(t * 0.9)); dog.tail.rotation.y = 0.6 * Math.sin(t * 9); }
  else if (mode === 'winIn' || mode === 'winOut') { o.position.set(1.3, 0.95, mode === 'winIn' ? -2.35 : -2.6); o.rotation.y = mode === 'winIn' ? 0 : Math.PI; poseIdle(P, t, 0); holdPhone(P, t, mode === 'winIn' ? 'type' : 'none');
    if (mode === 'winOut') { keys.visible = true; P.arms[0].rotation.set(-0.5, 0, 0.1); P.elbows[0].rotation.x = -1.2; }
    P.face(mode === 'winIn' ? 'reading' : 'worried', t); }
  else if (mode === 'kitchen') { o.position.set(2.2, 0.95, -1.5); o.rotation.y = 1.0; holdPhone(P, t, 'show'); P.face('proud', t);
    mom.outer.visible = true; mom.outer.position.set(2.95, 0.95, -1.3); mom.outer.rotation.y = -1.2; poseIdle(mom, t, 1); mom.arms[1].rotation.set(-0.4, 0, 0); mom.elbows[1].rotation.x = -1.4; mom.face(t > B3 + 5.6 ? 'happy' : 'surprised', t + 0.7); }
  // snow outside the window
  for (let i = 0; i < SN; i++) { const [x0, y0, z0, s] = SN0[i]; snowPos[i * 3] = x0 + 0.15 * Math.sin(t * 0.8 + i); snowPos[i * 3 + 1] = wrapR(y0 - t * 0.5 * s, 0, 4); snowPos[i * 3 + 2] = z0; } snowGeo.attributes.position.needsUpdate = true;
  P.outer.updateMatrixWorld(true); dadPhone.getWorldPosition(rmGlow.position); rmGlow.position.y += 0.05; }
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
// frame a head: camera at h + dir·dist; headY = where the head sits on screen (0 top … 1 bottom) — phone cards take the top half, captions the bottom
function frameCam(cam, h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); cam.position.copy(h).addScaledVector(d, dist); cam.fov = fov; cam.lookAt(h.x, h.y + (headY - 0.5) * visH, h.z); }
function roomCamera(t, mode) { updateRoom(t, mode); const h = headOf(dad), sw = (a, k) => Math.sin(t * 0.45 + a) * k;
  const seg = (a, b) => smooth(a - 0.2, b + 0.2, t);
  if (mode === 'far') frameCam(rmCam, h, V3(0.25 + sw(0, 0.05), -0.05, 1), lerp(3.1, 2.6, seg(0, B1)), 0.52);
  else if (mode === 'type') frameCam(rmCam, h, V3(-0.35, 0.1, 1), lerp(2.5, 2.2, seg(B1, B1 + 4)), 0.62);
  else if (mode === 'laugh') frameCam(rmCam, h, V3(0.4, 0.08, 1), lerp(2.6, 2.3, seg(B1 + 4, B2)), 0.66);
  else if (mode === 'read') frameCam(rmCam, h, V3(0.4, 0.1, 1), lerp(2.5, 2.2, seg(B3, B3 + 4)), 0.62);
  else if (mode === 'night') frameCam(rmCam, h, V3(-0.4, 0.05, 1), lerp(2.6, 2.3, seg(TW, REP)), 0.69);
  else if (mode === 'reply') frameCam(rmCam, h, V3(0.3, 0.08, 1), lerp(2.5, 2.2, seg(REP, T_END)), 0.64);
  else if (mode === 'dogType') frameCam(rmCam, h, V3(-0.3, 0.08, 1), lerp(2.5, 2.2, seg(B4, B4 + 4)), 0.62);
  else if (mode === 'dogWide') frameCam(rmCam, h, V3(0.65, 0.05, 1), lerp(3.6, 3.3, seg(B4 + 4, B5)), 0.54);
  else if (mode === 'winIn') frameCam(rmCam, h, V3(0.3, 0.05, 1), lerp(2.5, 2.2, seg(B2, B2 + 4)), 0.62);
  else if (mode === 'winOut') frameCam(rmCam, h, V3(0.08 + sw(1, 0.03), 0.02, -1), lerp(2.9, 2.5, seg(B2 + 4, B3)), 0.48, 38);
  else frameCam(rmCam, V3(2.55, 1.45, -1.4), V3(0.05, 0.1, 1), lerp(3.0, 2.7, seg(B3 + 4, B4)), 0.5); }
