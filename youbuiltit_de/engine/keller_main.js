// ===================== 01 Keller — timeline driven by the voice alignment =====================
// Built as: cat lib.js keller_main.js > keller.js

// ---------- words / timing ----------
const RAW = await (await fetch('../01_keller/words.json')).json();
const WORDS = [];
for (const [w, s, e] of RAW) {            // "Sommergewitter.Die" -> two words (missing line break in alignment)
  const parts = w.split(/(?<=[.!?])(?=[A-ZÄÖÜ])/);
  if (parts.length === 1) { WORDS.push([w, s, e]); continue; }
  const L = w.length; let acc = s;
  for (const p of parts) { const d = (e - s) * p.length / L; WORDS.push([p, acc, acc + d]); acc += d; }
}
const clean = w => w.replace(/[.,!?]/g, '');
function T(word, n = 1) {                 // start time of the n-th word starting with `word`
  let k = 0;
  for (const [w, s] of WORDS) if (clean(w).startsWith(word) && ++k === n) return s;
  throw new Error('word not found: ' + word);
}
const END = WORDS[WORDS.length - 1][2] + 0.6;
const cl = x => Math.max(0, Math.min(1, x));
const ramp = (t, a, b) => cl((t - a) / (b - a));
const sm = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => sm(ramp(t, a, b));
const back = x => { const c = 1.7; x = cl(x); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const pop = (t, a, d = .35) => back(ramp(t, a, a + d));
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, f = .3) => ramp(t, a, a + f) * (1 - ramp(t, b - f, b));   // 0..1 inside [a,b]

// ---------- growable boxes (pivot at the bottom, world-space UVs) ----------
function gbox(x0, x1, y0, y1, z0, z1, mat, s = 6, opt = {}) {
  const m = wbox(x0, x1, y0, y1, z0, z1, mat, s, opt);
  m.geometry.translate(-(x0 + x1) / 2, -y0, -(z0 + z1) / 2);
  m.position.set((x0 + x1) / 2, y0, (z0 + z1) / 2);
  m.userData = { y0, y1 };
  return m;
}
function growTo(m, h) {                   // show the box up to world height h
  const { y0, y1 } = m.userData; const k = cl((h - y0) / (y1 - y0));
  m.visible = k > 0.001; m.scale.y = Math.max(k, 0.001);
}

// ---------- extra materials ----------
const wallMat = new THREE.MeshStandardMaterial({ map: concreteMat.map, roughness: .9, color: '#b4b1aa' });
const leanMat = new THREE.MeshStandardMaterial({ color: '#8f8c86', roughness: 1 });
const woodTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#9a6b3e'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = `hsl(28,${40 + rnd() * 10}%,${30 + rnd() * 10}%)`; g.fillRect(0, y + 1, 256, 30); g.fillStyle = 'rgba(40,20,5,.6)'; g.fillRect(0, y, 256, 2); }
  noise(g, 256, 256, 18); return tex(c); })();
const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: .9 });
const waterMat = new THREE.MeshPhysicalMaterial({ color: '#4fa9c9', transparent: true, opacity: .62, roughness: .1, depthWrite: false });
const sewageMat = new THREE.MeshStandardMaterial({ color: '#6b5226', transparent: true, opacity: .9, roughness: .3 });
const xpsTex = (() => { const [c, g] = cv(256, 256); g.fillStyle = '#86c79a'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#5f9e72'; g.lineWidth = 3; for (let y = 0; y <= 256; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  for (let x = 0; x <= 256; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } noise(g, 256, 256, 10); return tex(c); })();
const xpsMat = new THREE.MeshStandardMaterial({ map: xpsTex, roughness: .8 });
const steelMat = new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: .85, roughness: .25 });
const darkMat = new THREE.MeshBasicMaterial({ color: '#05070c', transparent: true, opacity: 0, depthWrite: false });
const frostMat = new THREE.MeshBasicMaterial({ color: '#9fd6ff', transparent: true, opacity: 0, depthWrite: false });
function decal(drawFn, w, h) { const [c, g] = cv(512, 512); drawFn(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }); }
const dampMat = decal(g => { for (let i = 0; i < 60; i++) { const x = rr(0, 512), y = rr(0, 512), r = rr(20, 90); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,55,45,.75)'); gr.addColorStop(1, 'rgba(60,55,45,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
const mouldMat = decal(g => { for (let i = 0; i < 260; i++) { const x = rr(0, 512), y = rr(0, 512), r = rr(3, 16); g.fillStyle = pick(['rgba(40,70,30,.9)', 'rgba(20,30,20,.85)', 'rgba(70,95,40,.8)']); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } });
const poreMat = decal(g => { for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(30,30,30,.8)'; g.beginPath(); g.arc(rr(0, 512), rr(0, 512), rr(1.5, 4), 0, 7); g.fill(); } });
dampMat.map.wrapS = dampMat.map.wrapT = THREE.RepeatWrapping;

// ---------- geometry constants ----------
const PIT = { x0: -5, x1: 5, z0: -9, y: -3.6 };
const OUT = { x0: -4, x1: 4, z0: -8 }, TH = .3;     // basement outer box and wall thickness
const FL = -3.05, TOP = .3, CEIL = .6;               // floor (top of slab), top of walls, top of ceiling
const IN = { x0: OUT.x0 + TH, x1: OUT.x1 - TH, z0: OUT.z0 + TH };
const WIN = { z0: -1.4, y0: -1.3, y1: -.2 };          // window in the right wall (open to the cut face)

// ---------- static world ----------
backyardSet();
wbox(-WX, WX, BOT, PIT.y, -200, 0, soilMat, 6, { cast: false });
lawn(-WX, PIT.x0, -200, 0); lawn(PIT.x1, WX, -200, 0); lawn(PIT.x0, PIT.x1, -200, PIT.z0);

// digging: the soil inside the pit shrinks down
const digFill = gbox(PIT.x0, PIT.x1, PIT.y, -.22, PIT.z0, 0, soilMat, 6, { cast: false });
const digGrass = gbox(PIT.x0, PIT.x1, -.22, .02, PIT.z0, 0, [grassSideMat, grassSideMat, grassMat, grassSideMat, grassSideMat, grassSideMat], 6, { cast: false });
const mound = new THREE.Group(); scene.add(mound);
{ const before = scene.children.length; dirtMound(-1.5, -12.6, 1.35); dirtMound(2.2, -12.0, .9);
  scene.children.splice(before).forEach(o => mound.add(o)); }

// wooden roof (the "Dach drüber")
const roof = new THREE.Group(); scene.add(roof);
for (const s of [-1, 1]) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(5.9, .14, 10), woodMat); p.castShadow = true;
  p.position.set(s * 2.65, 1.25, -4.5); p.rotation.z = -s * .42; roof.add(p);
}
for (const [x, z] of [[-5.1, -.1], [5.1, -.1], [-5.1, -8.9], [5.1, -8.9]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.18, 1.1, .18), woodMat); post.position.set(x, .55, z); post.castShadow = true; roof.add(post); }

// rain water + slumping walls
const pitWater = gbox(PIT.x0 + .02, PIT.x1 - .02, PIT.y, PIT.y + .75, PIT.z0 + .02, -.003, waterMat, 4, { cast: false }); pitWater.renderOrder = 2;
function wedge(len, h, w) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(w, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: soilMap, bumpMap: soilBump, bumpScale: 3, roughness: 1, color: '#a06f47' })); m.castShadow = m.receiveShadow = true; scene.add(m); return m; }
const slumpL = wedge(9, 2.2, 1.6); slumpL.position.set(PIT.x0, PIT.y, PIT.z0);
const slumpR = wedge(9, 2.2, 1.6); slumpR.rotation.y = Math.PI; slumpR.position.set(PIT.x1, PIT.y, 0);
const slumpB = wedge(10, 2.2, 1.6); slumpB.rotation.y = Math.PI / 2; slumpB.position.set(PIT.x0, PIT.y, PIT.z0);
const fallRocks = []; for (let i = 0; i < 22; i++) { const r = rock(rr(.12, .3), pick(['#7a4826', '#8a5631', '#5c321a'])); const side = rnd() < .5 ? -1 : 1; r.userData = { x: side * rr(4.3, 4.9), z: rr(-8.5, -.4), y0: rr(-1, -.2), d: rr(0, .8) }; scene.add(r); fallRocks.push(r); }

// lean concrete + slab + rebar
const lean = gbox(-4.3, 4.3, PIT.y, -3.42, -8.3, 0, leanMat, 3);
const slab = gbox(OUT.x0, OUT.x1, -3.42, FL, OUT.z0, 0, wallMat, 3);
const rebar = new THREE.Group(); scene.add(rebar);
{ const rm = M('#8a3b22', { roughness: .6, metalness: .3 });
  for (const y of [-3.32, -3.15]) {
    for (let x = OUT.x0 + .15; x <= OUT.x1 - .1; x += .35) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 7.9, 6), rm); b.rotation.x = Math.PI / 2; b.position.set(x, y, -3.95); rebar.add(b); }
    for (let z = -.2; z >= OUT.z0 + .1; z -= .5) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 7.8, 6), rm); b.rotation.z = Math.PI / 2; b.position.set(0, y + .06, z); rebar.add(b); }
  } }

// walls (each piece grows up to the wall height h)
const walls = [
  gbox(OUT.x0, IN.x0, FL, TOP, OUT.z0, 0, wallMat, 3),                       // left
  gbox(OUT.x0, OUT.x1, FL, TOP, OUT.z0, IN.z0, wallMat, 3),                  // back
  gbox(IN.x1, OUT.x1, FL, TOP, OUT.z0, WIN.z0, wallMat, 3),                  // right, behind the window
  gbox(IN.x1, OUT.x1, FL, WIN.y0, WIN.z0, 0, wallMat, 3),                    // right, below the window
  gbox(IN.x1, OUT.x1, WIN.y1, TOP, WIN.z0, 0, wallMat, 3)];                  // right, above the window
const ceiling = gbox(OUT.x0, OUT.x1, TOP, CEIL, OUT.z0, 0, wallMat, 3);
const glass = new THREE.Mesh(new THREE.PlaneGeometry(-WIN.z0, WIN.y1 - WIN.y0), new THREE.MeshStandardMaterial({ color: '#a9d4ef', transparent: true, opacity: .35, roughness: .05 }));
glass.rotation.y = Math.PI / 2; glass.position.set((IN.x1 + OUT.x1) / 2, (WIN.y0 + WIN.y1) / 2, WIN.z0 / 2); scene.add(glass);

// damp, pores, mould decals
function plane(w, h, mat, pos, rot) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.rotation.set(...rot); m.renderOrder = 4; scene.add(m); return m; }
const WH = TOP - FL;
plane(IN.x1 - IN.x0, WH, dampMat, [0, FL + WH / 2, IN.z0 + .01], [0, 0, 0]);
plane(-IN.z0, WH, dampMat, [IN.x0 + .01, FL + WH / 2, IN.z0 / 2], [0, Math.PI / 2, 0]);
plane(TH, WH, dampMat, [(OUT.x0 + IN.x0) / 2, FL + WH / 2, .004], [0, 0, 0]);
plane(TH, WH, dampMat, [(OUT.x1 + IN.x1) / 2, FL + WH / 2, .004], [0, 0, 0]);
plane(IN.x1 - IN.x0, -IN.z0, mouldMat, [0, TOP - .01, IN.z0 / 2], [Math.PI / 2, 0, 0]);
plane(IN.x1 - IN.x0, .9, mouldMat, [0, TOP - .45, IN.z0 + .015], [0, 0, 0]);
const poreA = plane(TH, WH, poreMat, [(OUT.x0 + IN.x0) / 2, FL + WH / 2, .006], [0, 0, 0]);
const poreB = plane(TH, WH, poreMat, [(OUT.x1 + IN.x1) / 2, FL + WH / 2, .006], [0, 0, 0]);
const poreC = plane(OUT.x1 - OUT.x0, FL + 3.42, poreMat, [0, (FL - 3.42) / 2, .006], [0, 0, 0]);

// groundwater on the cut face + arrows
const wetFront = new THREE.MeshStandardMaterial({ map: wetMat.map, bumpMap: wetMat.bumpMap, bumpScale: 3, roughness: .8, transparent: true, opacity: 0, depthWrite: false });
plane(WX + PIT.x0, 16, wetFront, [(-WX + PIT.x0) / 2, -1.4 - 8, .003], [0, 0, 0]);
plane(WX - PIT.x1, 16, wetFront, [(WX + PIT.x1) / 2, -1.4 - 8, .003], [0, 0, 0]);
plane(PIT.x1 - PIT.x0, 12, wetFront, [0, PIT.y - 6, .003], [0, 0, 0]);
const gwArrows = [];
for (const y of [-2.8, -1.6]) { const a = arrow(0, 0, .08, .9); a.rotation.z = -Math.PI / 2; a.userData = { bx: -6.4, by: y, dx: 1, dy: 0 }; gwArrows.push(a);
  const b = arrow(0, 0, .08, .9); b.rotation.z = Math.PI / 2; b.userData = { bx: 6.4, by: y, dx: -1, dy: 0 }; gwArrows.push(b); }
for (const x of [-2.4, 0, 2.4]) { const a = arrow(0, 0, .08, .9); a.userData = { bx: x, by: -5.4, dx: 0, dy: 1 }; gwArrows.push(a); }

// the joint: red line, leaking drops, steel waterstop
const jointLine = new THREE.Mesh(new THREE.BoxGeometry(TH + .04, .035, .02), new THREE.MeshBasicMaterial({ color: '#ff3b2f', transparent: true, opacity: 0 }));
jointLine.position.set((OUT.x0 + IN.x0) / 2, FL, .012); scene.add(jointLine);
const leak = []; for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), new THREE.MeshStandardMaterial({ color: '#4fc3ff', emissive: '#1d6fa8', emissiveIntensity: .4, roughness: .1 })); d.userData = { ph: i / 9 }; scene.add(d); leak.push(d); }
const waterstop = new THREE.Mesh(new THREE.BoxGeometry(.03, .5, -OUT.z0), steelMat); waterstop.position.set((OUT.x0 + IN.x0) / 2, FL, OUT.z0 / 2 + .01); scene.add(waterstop);
const waterstopR = waterstop.clone(); waterstopR.position.x = (OUT.x1 + IN.x1) / 2; scene.add(waterstopR);

// frost + darkness inside
const frost = gbox(IN.x0, IN.x1, FL, TOP, IN.z0, -.01, frostMat, 6, { cast: false }); frost.renderOrder = 5;
const dark = gbox(IN.x0, IN.x1, FL, TOP, IN.z0, -.005, darkMat, 6, { cast: false }); dark.renderOrder = 6;
const flakes = (() => { const n = 160, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = rr(IN.x0, IN.x1); p[i * 3 + 1] = rr(FL, TOP); p[i * 3 + 2] = rr(-3, -.1); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: .09, transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 7; scene.add(m); m.userData.base = p.slice(); return m; })();

// insulation boards
const xps = [
  { m: gbox(OUT.x0 - .14, OUT.x0, FL - .3, .1, OUT.z0 - .14, 0, xpsMat, 1.2), d: [-1.5, 0] },
  { m: gbox(OUT.x0 - .14, OUT.x1 + .14, FL - .3, .1, OUT.z0 - .14, OUT.z0, xpsMat, 1.2), d: [0, -1.5] },
  { m: gbox(OUT.x1, OUT.x1 + .14, FL - .3, .1, OUT.z0, -1.6, xpsMat, 1.2), d: [1.5, 0] },
  { m: gbox(OUT.x1, OUT.x1 + .14, FL - .3, -1.65, -1.6, 0, xpsMat, 1.2), d: [1.5, 0] }];
xps.forEach(o => o.base = o.m.position.clone());

// light well
const well = new THREE.Group(); scene.add(well);
{ const wm = wallMat;
  const parts = [[OUT.x1 + .14, 5.0, -1.8, -1.65, -1.6, 0], [4.85, 5.0, -1.65, .12, -1.6, 0], [OUT.x1 + .14, 5.0, -1.65, .12, -1.6, -1.45]];
  for (const p of parts) { const m = wbox(...p, wm, 3); scene.remove(m); well.add(m); }
  const [c, g] = cv(128, 128); g.fillStyle = '#2a2d31'; for (let i = 0; i < 128; i += 16) { g.fillRect(i, 0, 5, 128); g.fillRect(0, i, 128, 5); }
  const gt = new THREE.CanvasTexture(c); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(3, 6);
  const grate = new THREE.Mesh(new THREE.PlaneGeometry(.86, 1.6), new THREE.MeshStandardMaterial({ map: gt, transparent: true, alphaTest: .5, metalness: .6, roughness: .4 }));
  { const [c2, g2] = cv(128, 128); g2.fillStyle = '#fff'; for (let i = 0; i < 128; i += 16) { g2.fillRect(i, 0, 5, 128); g2.fillRect(0, i, 128, 5); } const at = new THREE.CanvasTexture(c2); at.wrapS = at.wrapT = THREE.RepeatWrapping; at.repeat.set(3, 6); grate.material.alphaMap = at; }
  grate.rotation.x = -Math.PI / 2; grate.position.set(4.57, .13, -.8); well.add(grate);
  well.userData.baseY = 0; }
const beamShape = new THREE.Shape(); beamShape.moveTo(4.85, .12); beamShape.lineTo(OUT.x1 + .14, .12); beamShape.lineTo(OUT.x1, WIN.y1); beamShape.lineTo(-.4, FL); beamShape.lineTo(2.2, FL); beamShape.lineTo(OUT.x1, WIN.y0); beamShape.closePath();
const beam = new THREE.Mesh(new THREE.ShapeGeometry(beamShape), new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
beam.position.z = -.7; beam.renderOrder = 8; scene.add(beam);

// sewer: floor drain, house pipe, street main, backflow valve
const MAIN = { x: 8.6, y: -5.2, r: .85 };
const pipeGlass = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .62, roughness: .3, depthWrite: false });
const sewerPts = [[MAIN.x - .75, MAIN.y + .35, -.05], [7.2, -4.35, -.05], [2.2, -3.95, -.05], [1.6, -3.85, -.05], [1.6, FL + .02, -.05]];
const sewerPipe = pipe(sewerPts.slice().reverse(), .15, pipeGlass); sewerPipe.renderOrder = 3;
const fillCurve = new THREE.CatmullRomCurve3(sewerPts.map(p => new THREE.Vector3(p[0], p[1], p[2])), false, 'catmullrom', .02);
const fillGeo = new THREE.TubeGeometry(fillCurve, 240, .11, 10); const fillTube = new THREE.Mesh(fillGeo, sewageMat); scene.add(fillTube);
const fillCount = fillGeo.index.count;
const drain = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .5), M('#3b3f45', { metalness: .6, roughness: .4 })); drain.position.set(1.6, FL + .03, -.3); scene.add(drain);
const mainRing = new THREE.Mesh(new THREE.RingGeometry(MAIN.r, MAIN.r + .16, 48), M('#8d8a84', { roughness: .9 })); mainRing.position.set(MAIN.x, MAIN.y, .006); scene.add(mainRing);
const mainBack = new THREE.Mesh(new THREE.CircleGeometry(MAIN.r, 48), M('#2a2622', { roughness: 1 })); mainBack.position.set(MAIN.x, MAIN.y, .004); scene.add(mainBack);
const mainFill = new THREE.Mesh(new THREE.BufferGeometry(), sewageMat); mainFill.position.set(MAIN.x, MAIN.y, .005); scene.add(mainFill);
function setMainLevel(k) {            // k = 0..1 fill of the round sewer (circular segment below a chord)
  const r = MAIN.r, phi = Math.asin(Math.max(-1, Math.min(1, -1 + 2 * k))), n = 48, pts = [];
  for (let i = 0; i <= n; i++) { const th = (Math.PI - phi) + ((2 * Math.PI + phi) - (Math.PI - phi)) * i / n; pts.push(new THREE.Vector2(r * Math.cos(th), r * Math.sin(th))); }
  mainFill.geometry.dispose(); mainFill.geometry = k > .01 ? new THREE.ShapeGeometry(new THREE.Shape(pts)) : new THREE.BufferGeometry();
}
const manhole = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .06, 28), M('#3a3c40', { metalness: .5, roughness: .5 })); manhole.position.set(MAIN.x, .04, -2.5); scene.add(manhole);
const shaftM = gbox(MAIN.x - .45, MAIN.x + .45, MAIN.y + MAIN.r, .02, -.6, 0, wallMat, 3); // manhole shaft on the cut face
const puddle = gbox(IN.x0 + .01, IN.x1 - .01, FL, FL + .55, IN.z0 + .01, -.006, sewageMat, 4, { cast: false }); puddle.renderOrder = 3;
const valve = new THREE.Group(); scene.add(valve);
{ const body = new THREE.Mesh(new THREE.BoxGeometry(.75, .62, .45), M('#f08a24', { roughness: .45 })); valve.add(body);
  const win2 = new THREE.Mesh(new THREE.PlaneGeometry(.55, .42), M('#20242a')); win2.position.z = .231; valve.add(win2);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(.05, .38, .02), M('#e8e8e8', { metalness: .6, roughness: .3 })); flap.geometry.translate(0, -.19, 0); flap.position.set(0, .19, .245); valve.add(flap); valve.userData.flap = flap;
  valve.position.set(5.6, -4.17, .0); valve.rotation.z = -.08; }
const goArrow = arrow(0, 0, 0, .55); goArrow.material = goArrow.material.clone(); goArrow.material.color.set('#3ccf5a'); goArrow.material.emissive.set('#3ccf5a'); goArrow.rotation.z = -Math.PI / 2;
const noArrow = arrow(0, 0, 0, .55); noArrow.material = noArrow.material.clone(); noArrow.material.color.set('#ff3b2f'); noArrow.material.emissive.set('#ff3b2f'); noArrow.rotation.z = Math.PI / 2;

// rain
const rain = (() => { const n = 2600, g = new THREE.BufferGeometry(), p = new Float32Array(n * 6), base = [];
  for (let i = 0; i < n; i++) base.push([rr(-14, 18), rr(-3, 16), rr(-16, 6), rr(9, 13)]);
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#dfe9f5', transparent: true, opacity: 0, depthWrite: false })); m.userData.base = base; m.renderOrder = 9; m.frustumCulled = false; scene.add(m); return m; })();
function updateRain(t, op) {
  rain.material.opacity = op; rain.visible = op > .01; if (!rain.visible) return;
  const p = rain.geometry.attributes.position.array; rain.userData.base.forEach(([x, y, z, v], i) => {
    const yy = -3 + (((y + 3) - t * v) % 19 + 19) % 19; p.set([x, yy, z, x - .05, yy + .55, z], i * 6); });
  rain.geometry.attributes.position.needsUpdate = true;
}

// room furniture at the end
const room = new THREE.Group(); scene.add(room);
const washer = new THREE.Group(); room.add(washer);
{ const b = new THREE.Mesh(new THREE.BoxGeometry(.75, .9, .7), M('#f4f5f6', { roughness: .35 })); b.position.y = .45; washer.add(b);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .045, 12, 32), M('#9aa3ad', { metalness: .7, roughness: .3 })); ring.position.set(0, .42, .36); washer.add(ring);
  const door = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), M('#5d7c99', { roughness: .1 })); door.position.set(0, .42, .355); washer.add(door);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(.75, .1, .02), M('#d4d7db')); panel.position.set(0, .82, .36); washer.add(panel);
  washer.position.set(-2.3, FL, -1.0); washer.traverse(o => o.castShadow = true); }
const shelf = new THREE.Group(); room.add(shelf);
{ for (const y of [0, .6, 1.2, 1.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, .05, .45), woodMat); b.position.y = y + .1; shelf.add(b); }
  for (const x of [-.88, .88]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.9, .45), woodMat); s.position.set(x, .95, 0); shelf.add(s); }
  for (const y of [0, .6, 1.2]) for (let x = -.7; x < .75; x += .24) { const j = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .22, 14), M(pick(['#d64b3c', '#e3a23a', '#7aa84c', '#9c4c7a', '#e9d8a6']), { roughness: .3 })); j.position.set(x, y + .24, rr(-.08, .08)); shelf.add(j); }
  shelf.position.set(1.1, FL, -6.9); shelf.traverse(o => o.castShadow = true); }
const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); bulb.position.set(-.5, TOP - .25, -3.5); room.add(bulb);
const bulbLight = new THREE.PointLight('#ffd9a0', 0, 12, 1.5); bulbLight.position.copy(bulb.position); scene.add(bulbLight);
const wellLight = new THREE.PointLight('#fff1c8', 0, 9, 1.6); wellLight.position.set(2.6, -1.4, -.8); scene.add(wellLight);
// backfill + green roof
const fills = [gbox(PIT.x0, OUT.x0 - .14, PIT.y, -.22, PIT.z0, 0, soilMat, 6, { cast: false }),
  gbox(OUT.x1 + .14, PIT.x1, PIT.y, -1.8, -1.6, 0, soilMat, 6, { cast: false }),
  gbox(OUT.x1 + .14, PIT.x1, PIT.y, -.22, PIT.z0, -1.6, soilMat, 6, { cast: false }),
  gbox(OUT.x0 - .14, OUT.x1 + .14, PIT.y, -.22, PIT.z0, OUT.z0 - .14, soilMat, 6, { cast: false })];
const gm = [grassSideMat, grassSideMat, grassMat, grassSideMat, grassSideMat, grassSideMat];
const fillGrass = [gbox(PIT.x0, OUT.x0 - .14, -.22, .02, PIT.z0, 0, gm, 6), gbox(OUT.x1 + .14, PIT.x1, -.22, .02, PIT.z0, -1.6, gm, 6), gbox(OUT.x0 - .14, OUT.x1 + .14, -.22, .02, PIT.z0, OUT.z0 - .14, gm, 6), gbox(OUT.x0, OUT.x1, CEIL, CEIL + .12, OUT.z0, 0, gm, 6)];

// ---------- skies / light presets ----------
const skyDay = scene.background;
const skyStorm = (() => { const [c, g] = cv(540, 960); const gr = g.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#2c333d'); gr.addColorStop(.6, '#59626e'); gr.addColorStop(1, '#79828c'); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  for (let i = 0; i < 260; i++) { const x = rr(-40, 580), y = rr(0, 520), r = rr(30, 80); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(40,46,54,.6)'); rg.addColorStop(1, 'rgba(40,46,54,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const hemi = scene.children.find(o => o.isHemisphereLight);

// ---------- camera path ----------
const camera = new THREE.PerspectiveCamera(50, W / H, .1, 400);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const WIDE = [V(.3, 9.6, 21.5), V(.3, -1.3, -9)];
const tJoint = T('Aber', 3), tBlechEnd = T('Jetzt'), tWell = T('stockdunkel'), tStorm = T('Dann'), tKlappe = T('Also', 5), tGrube = T('Schütte');
const KEYS = [
  [0, ...WIDE],
  [3.6, V(.3, 8.4, 19), V(.3, -1.5, -8)],
  [T('Also'), V(0, 7.2, 17.5), V(0, -1.6, -6)],
  [T('Aber', 2) + .2, V(0, -.4, 12.5), V(0, -1.4, -6)],
  [T('Also', 2), V(0, -.4, 12.0), V(0, -1.4, -6)],
  [tJoint, V(0, 0, 12.6), V(0, -1.5, -6)],
  [tJoint + .9, V(-3.1, -2.45, 3.4), V(-3.65, -3.0, -.6)],
  [tBlechEnd - .1, V(-3.2, -2.5, 3.0), V(-3.7, -3.0, -.6)],
  [tBlechEnd + .8, V(.4, -.6, 12.8), V(.4, -1.5, -6)],
  [tWell, V(.6, -.6, 12.4), V(.6, -1.5, -6)],
  [tWell + 1.0, V(3.0, -.2, 8.6), V(3.7, -1.1, -1)],
  [tStorm - .1, V(3.0, -.2, 8.3), V(3.7, -1.1, -1)],
  [tStorm + 1.1, V(4.4, 3.4, 19.5), V(4.4, -2.8, -6)],
  [tKlappe - .2, V(4.4, 3.0, 18.5), V(4.4, -3.0, -6)],
  [tKlappe + .8, V(5.2, -2.8, 6.6), V(5.3, -3.5, -.6)],
  [tGrube - .1, V(5.2, -2.9, 6.2), V(5.3, -3.5, -.6)],
  [tGrube + 1.4, V(.3, 7.8, 20), V(.3, -1.6, -8)],
  [END, V(.3, 8.6, 21.5), V(.3, -1.2, -9)]];
function placeCamera(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, p0, l0] = KEYS[i], [t1, p1, l1] = KEYS[i + 1];
  const k = sm(ramp(t, t0, t1));
  camera.position.lerpVectors(p0, p1, k); camera.lookAt(new THREE.Vector3().lerpVectors(l0, l1, k));
}

// ---------- the timeline ----------
const tw = {
  dig0: .15, dig1: T('gräbst') + .6, roof: T('Dach'), regen: T('Regen'), knien: T('Knien'), rutsch: T('rutschen'),
  also: T('Also'), platte: T('Bodenplatte'), gitter: T('Gitter'), wande: T('Betonwände'),
  gw: T('Grundwasser'), poren: T('Poren'), feucht: T('feucht'), schimmel: T('Schimmel'),
  dicht: T('dicht'), weisse: T('weiße'), fuge: T('Fuge'), rein: T('rein'), blech: T('Stahlblech'), herum: T('herum'),
  eiskalt: T('eiskalt'), damm: T('Dämmplatten'), dunkel: T('stockdunkel'), schacht: T('Lichtschacht'),
  gewitter: T('Sommergewitter'), kanal: T('Kanalisation'), zuruck: T('zurück'), abfluss: T('Abfluss'), keller: T('Keller', 2),
  klappe: T('Klappe'), raus: T('raus'), nicht: T('nicht', 2), ruck: T('Rückstauklappe'),
  grube: T('Grube'), wasch: T('Waschmaschine'), regal: T('Regal'), gluck: T('Glückwunsch') };

function update(t) {
  // dig + roof
  const dig = ease(t, tw.dig0, tw.dig1);
  growTo(digFill, lerp(-.22, PIT.y, dig)); digGrass.visible = t < tw.dig0 + .1;
  const md = dig * (1 - ease(t, tw.grube, tw.grube + .9)); mound.scale.setScalar(Math.max(.001, md)); mound.visible = md > .01;
  const sew = t > tw.gewitter - .6; sewerPipe.visible = drain.visible = mainRing.visible = mainBack.visible = mainFill.visible = manhole.visible = shaftM.visible = sew;
  const roofIn = ramp(t, tw.roof - .1, tw.roof + .45), roofOut = ease(t, tw.wande, tw.wande + .9);
  roof.visible = roofIn > 0 && roofOut < 1;
  roof.position.y = (1 - back(roofIn)) * 7 + roofOut * 12; roof.rotation.z = roofOut * .6;
  // rain on the open pit
  const storm = win(t, tw.gewitter - .2, tw.klappe + .4, .6);
  updateRain(t, Math.max(win(t, tw.regen - .5, tw.also + .3, .5) * .55, storm * .75));
  const waterUp = ease(t, tw.regen, tw.knien + .4) * (1 - ease(t, tw.also, tw.also + .7));
  growTo(pitWater, PIT.y + .75 * waterUp); pitWater.visible = waterUp > .01;
  const sl = pop(t, tw.rutsch, .7) * (1 - ease(t, tw.also, tw.also + .6));
  for (const s of [slumpL, slumpR, slumpB]) { s.visible = sl > .01; s.scale.set(Math.max(sl, .001), Math.max(sl, .001), 1); }
  fallRocks.forEach(r => { const u = r.userData, k = ramp(t, tw.rutsch + u.d * .5, tw.rutsch + u.d * .5 + .6); r.visible = k > 0 && t < tw.also + .4;
    r.position.set(lerp(u.x, u.x * .8, k), lerp(u.y0, PIT.y + .25, k * k), u.z); r.rotation.set(k * 4, k * 3, 0); });
  // slab, rebar, walls, ceiling
  growTo(lean, lerp(PIT.y, -3.42, ease(t, tw.also + .3, tw.platte)));
  rebar.visible = t > tw.platte - .2; rebar.position.y = (1 - back(ramp(t, tw.platte - .2, tw.platte + .3))) * 3;
  growTo(slab, lerp(-3.42, FL, ease(t, tw.gitter + .3, tw.wande - .1)));
  const h = lerp(FL, TOP, ease(t, tw.wande, tw.wande + 1.6));
  walls.forEach(w => growTo(w, h)); glass.visible = h >= WIN.y1;
  const ceil = back(ramp(t, tw.wande + 1.6, tw.wande + 2.1)); ceiling.visible = t > tw.wande + 1.6; ceiling.position.y = TOP + (1 - ceil) * 4;
  // groundwater, pores, damp, mould
  const gw = ease(t, tw.gw - .1, tw.gw + .8) * (1 - ease(t, tw.herum + .3, tw.herum + 1.3));
  wetFront.opacity = gw * .9;
  const white = ease(t, tw.dicht, tw.weisse + .3);
  const push = win(t, tw.gw, tw.weisse + 1.2, .4);
  gwArrows.forEach((a, i) => { const u = a.userData, ph = (t * 1.6 + i * .37) % 1;
    const bounce = white > .5 ? -ramp(t, tw.weisse, tw.weisse + .6) * 1.2 : 0;
    const off = (sm(ph) * .7 + bounce) * (1 - white * .4);
    a.position.set(u.bx + u.dx * off, u.by + u.dy * off, .08); a.visible = push > .02; a.scale.setScalar(.9 * push); });
  const pores = win(t, tw.poren - .1, tw.feucht + 1.2, .3) * (1 - white);
  poreMat.opacity = pores * .85;
  dampMat.opacity = ease(t, tw.feucht, tw.feucht + .8) * (1 - white);
  mouldMat.opacity = ease(t, tw.schimmel, tw.schimmel + .7) * (1 - white);
  wallMat.color.set('#b4b1aa').lerp(new THREE.Color('#ffffff'), white);
  // the joint leak and the steel waterstop
  const jl = win(t, tw.fuge - .2, tw.herum + .6, .25);
  jointLine.material.opacity = jl * (.6 + .4 * Math.sin(t * 12));
  const leaking = ramp(t, tw.rein - .3, tw.rein + .2) * (1 - ramp(t, tw.blech + .5, tw.blech + .8));
  const blocked = ramp(t, tw.blech + .5, tw.blech + .8) * (1 - ramp(t, tw.eiskalt, tw.eiskalt + .3));
  leak.forEach(d => { const ph = (t * .9 + d.userData.ph) % 1; d.visible = leaking > .02 || blocked > .02;
    if (leaking > blocked) { // from outside soil, through the joint, onto the floor
      const x = lerp(OUT.x0 - .35, IN.x0 + .5, ph), y = FL + (ph < .55 ? .02 : -(ph - .55) * 0) + (ph > .55 ? .02 : 0);
      d.position.set(x, y + .03 * Math.sin(ph * 30), .04); }
    else { const x = lerp(OUT.x0 - .35, (OUT.x0 + IN.x0) / 2 - .05, Math.min(ph * 1.6, 1)); d.position.set(x, FL + .03 - Math.max(0, ph - .62) * .8, .04); }
    d.scale.setScalar(Math.max(leaking, blocked)); });
  const ws = ramp(t, tw.blech - .1, tw.blech + .45); waterstop.visible = waterstopR.visible = t > tw.blech - .1;
  waterstop.position.y = waterstopR.position.y = FL + (1 - sm(ws)) * 2.2;
  // frost, insulation, darkness, light well
  const cold = win(t, tw.eiskalt - .1, tw.damm + 1.4, .4);
  frostMat.opacity = cold * .38; flakes.material.opacity = cold;
  { const p = flakes.geometry.attributes.position.array, b = flakes.userData.base; for (let i = 0; i < p.length; i += 3) { p[i + 1] = FL + ((b[i + 1] - FL - t * .35) % (TOP - FL) + (TOP - FL)) % (TOP - FL); p[i] = b[i] + .1 * Math.sin(t * 2 + i); } flakes.geometry.attributes.position.needsUpdate = true; }
  xps.forEach((o, i) => { const k = back(ramp(t, tw.damm + i * .18, tw.damm + i * .18 + .45)); o.m.visible = k > .01; o.m.position.set(o.base.x + o.d[0] * (1 - k) * 2, o.base.y, o.base.z + o.d[1] * (1 - k) * 2); });
  const dk = ease(t, tw.dunkel, tw.dunkel + .4) * (1 - .55 * ease(t, tw.schacht, tw.schacht + .6)) * (1 - ease(t, tw.wasch - .4, tw.wasch + .2));
  darkMat.opacity = dk * .82;
  const wl = back(ramp(t, tw.schacht - .2, tw.schacht + .3)); well.visible = wl > .01; well.position.y = -(1 - wl) * 2.5;
  const lit = ease(t, tw.schacht + .1, tw.schacht + .6) * (1 - .7 * storm);
  beam.material.opacity = lit * .28; wellLight.intensity = lit * 9;
  // storm, sewer backflow, valve
  scene.background = storm > .5 ? skyStorm : skyDay;
  sun.intensity = 2.7 * (1 - .8 * storm); hemi.intensity = 1.15 * (1 - .45 * storm);
  const flash = Math.max(1 - ramp(t, tw.gewitter + .15, tw.gewitter + .45), 0) * (t > tw.gewitter + .15 ? 1 : 0) + Math.max(1 - ramp(t, tw.kanal + .9, tw.kanal + 1.15), 0) * (t > tw.kanal + .9 ? .7 : 0);
  renderer.toneMappingExposure = 1.05 + flash * 1.6;
  const mainK = lerp(.25, 1, ease(t, tw.kanal, tw.kanal + 1.2)) * (1 - .6 * ease(t, tw.grube - .2, tw.grube + .6));
  setMainLevel(t > tw.gewitter - 1 ? mainK : .2);
  const back1 = ease(t, tw.zuruck - .2, tw.abfluss + .6);                              // sewage climbs the house pipe
  const valveOn = t > tw.klappe + .2;
  const pipeFrac = valveOn ? lerp(back1, .22, ease(t, tw.klappe + .2, tw.raus)) : back1;
  fillGeo.setDrawRange(0, Math.floor(fillCount * pipeFrac / 3) * 3); fillTube.visible = pipeFrac > .01;
  const pud = ease(t, tw.abfluss + .4, tw.keller + .5) * (1 - ease(t, tw.raus - .4, tw.raus + .5));
  growTo(puddle, FL + .55 * pud); puddle.visible = pud > .01;
  const vk = back(ramp(t, tw.klappe, tw.klappe + .4)); valve.visible = vk > .01; valve.scale.setScalar(Math.max(vk, .001));
  const open = ease(t, tw.raus - .2, tw.raus + .2) * (1 - ease(t, tw.nicht - .2, tw.nicht + .1));
  valve.userData.flap.rotation.z = -open * 1.1;
  goArrow.visible = win(t, tw.raus - .2, tw.nicht - .1, .15) > 0; goArrow.position.set(6.7, -3.55, .3); goArrow.scale.setScalar(.55 * pop(t, tw.raus - .2));
  noArrow.visible = win(t, tw.nicht - .1, tw.grube - .3, .15) > 0; noArrow.position.set(4.5 + .15 * Math.sin(t * 14), -3.55, .3); noArrow.scale.setScalar(.55 * pop(t, tw.nicht - .1));
  // backfill + room
  const bf = ease(t, tw.grube, tw.grube + 1.1);
  fills.forEach(f => growTo(f, lerp(PIT.y, f.userData.y1, bf)));
  fillGrass.forEach((g, i) => { const k = back(ramp(t, tw.grube + 1.0 + i * .05, tw.grube + 1.4 + i * .05)); g.visible = k > .01; g.scale.y = Math.max(k, .001); });
  const wsh = back(ramp(t, tw.wasch, tw.wasch + .4)), rsh = back(ramp(t, tw.regal, tw.regal + .4));
  washer.visible = wsh > .01; washer.scale.setScalar(Math.max(wsh, .001));
  shelf.visible = rsh > .01; shelf.scale.setScalar(Math.max(rsh, .001));
  const bl = ease(t, tw.wasch - .4, tw.wasch); bulb.visible = bl > .01; bulbLight.intensity = bl * 7;
  placeCamera(t);
}

// ---------- captions (one word at a time, like the original) ----------
const out = document.createElement('canvas'); out.width = W; out.height = H; const og = out.getContext('2d');
function wordAt(t) { let w = null; for (const x of WORDS) { if (x[1] <= t + .02) w = x; else break; } return w && t < w[2] + .5 ? clean(w[0]).replace(/^./, c => c) : ''; }
function drawCaption(t) {
  const w = wordAt(t); if (!w) return;
  og.font = '700 96px Fredoka'; og.textAlign = 'center'; og.textBaseline = 'middle'; og.lineJoin = 'round';
  const y = 990;
  og.lineWidth = 16; og.strokeStyle = 'rgba(0,0,0,.92)'; og.strokeText(w, W / 2, y + 4);
  og.lineWidth = 12; og.strokeStyle = '#000'; og.strokeText(w, W / 2, y);
  og.fillStyle = '#ffffff'; og.fillText(w, W / 2, y);
}

await document.fonts.load('700 96px Fredoka');
window.END = END;
window.renderAt = (t, q = .9) => {
  update(t); renderer.render(scene, camera);
  og.drawImage(renderer.domElement, 0, 0); drawCaption(t);
  return out.toDataURL('image/jpeg', q);
};
window.__done = true;
