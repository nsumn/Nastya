// =================== THE STORY: midnight → the map goes dark → the neighbour's empty safe → the street → the bat rush → the market → the march → Congress → the FBI → YOUR garage ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const H_ = p => p.head ? headOf(p) : headP(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const seatY = (P, y) => y + 0.95 - 0.9 * (P.o ? P.o.h : P.h);
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
function setClock(txt) { if (BD.clockT === txt) return; BD.clockT = txt; const c = BD.clockTex.image.getContext('2d'); c.fillStyle = '#141416'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ff4a3a'; c.font = '700 36px Inter'; c.textAlign = 'center'; c.fillText(txt, 64, 45); BD.clockTex.needsUpdate = true; }
const PROPS = [MUG, HOTDOG, NOODLE, REMOTE];
// you (+ the neighbour) in every set
function pose(t, k, i) {
  const P = hero; poseReset(P, t); PROPS.forEach(o => { o.visible = false; });
  if (k === 'bed') { place(P, -0.9, -0.5, 0.15, seatY(P, 0.58) - 0.95); poseSit(P); const y = smooth(0.6, 1.4, t) * (1 - smooth(2.3, 2.9, t));
    P.arms.forEach((a, j) => a.rotation.set(-0.5 - 2.2 * y * (j ? 1 : 0.2), 0, (j ? -1 : 1) * 0.2)); P.elbows.forEach((e, j) => e.rotation.x = j ? -0.4 - 1.4 * y : -0.3); P.face(t < 2.6 ? 'sleepy' : 'neutral', t); }
  else if (k === 'st' && t < GARAGE) { place(P, 0.5, 3.1, 0.35); P.arms[1].rotation.set(-0.55 - 0.5 * smooth(13.6, 14.0, t) * (1 - smooth(14.5, 14.9, t)), 0, -0.1); P.elbows[1].rotation.x = -1.9; holdIn(P, 1, MUG, V3(0, -0.29, 0.06));
    P.face(t < 13.0 ? 'squint' : t < 14.6 ? 'surprised' : 'neutral', t); }
  else if (k === 'st') { const turn = smooth(55.5, 56.1, t); place(P, 5.0, -4.55, Math.PI * (1 - turn) + 0.15 * turn);
    if (t < 54.6) { P.arms[1].rotation.set(-1.35, 0, -0.1); P.elbows[1].rotation.x = -0.2; P.face(t < 53.2 ? 'neutral' : 'surprised', t); }
    else { P.arms[1].rotation.set(-0.3 - 1.2 * smooth(55.9, 56.3, t), 0, -0.15); P.elbows[1].rotation.x = -0.3 - 0.9 * smooth(55.9, 56.3, t); P.face(t < 56.2 ? 'surprised' : t < 57.2 ? 'smirk' : 'proud', t); }
    holdIn(P, 1, REMOTE, V3(0, -0.29, 0.05)); }
  else if (k === 'mkt') { place(P, 1.3, 5.7, -0.75); P.arms[0].rotation.set(-0.7, 0, 0.15); P.elbows[0].rotation.x = -1.2; holdIn(P, 0, NOODLE, V3(0, -0.3, 0.05), new THREE.Euler(1.35, 0, 0)); P.face(t < 19.8 ? 'surprised' : 'dumb', t); }
  else if (k === 'off') { const [x, z, ry] = OF.heroSeat; place(P, x, z, ry, seatY(P, 0.52) - 0.95); poseSit(P); P.arms.forEach(a => a.rotation.x = -1.0); P.elbows.forEach(e => e.rotation.x = -0.5); P.face(t < 25.4 ? 'surprised' : 'squint', t); }
  else if (k === 'wh') { place(P, 0, 24.2, 0.1 * Math.sin(t * 0.7)); P.arms[1].rotation.set(-0.9 - 0.45 * Math.max(0, Math.sin(t * 2.1)), 0, -0.05); P.elbows[1].rotation.x = -1.5 - 0.3 * Math.max(0, Math.sin(t * 2.1)); holdIn(P, 1, HOTDOG, V3(0.0, -0.3, 0.06), new THREE.Euler(0, 1.3, 0));
    P.face(t < 35 ? 'squint' : t < 36.5 ? 'happy' : 'dumb', t); }
  else P.outer.visible = false;
  if (k === 'man') { const Q = NBR; poseReset(Q, t); place(Q, -0.25, -6.35, 0.35); const k2 = smooth(MORN + 0.3, MORN + 0.8, t); Q.arms.forEach((a, j) => a.rotation.set(-0.3 - 0.35 * k2, 0, (j ? 1 : -1) * (0.2 + 0.75 * k2))); Q.elbows.forEach(e => e.rotation.x = -0.3 - 0.9 * k2); Q.face(t < MORN + 0.5 ? 'squint' : 'surprised', t); }
}
// ---- shots: [start, set, camera(t), opts{mb, dof, whip}] ----
const SETS = { bed: BED, map: { sc: mapScene, cam: mapCam }, man: MAN, st: { sc: st, cam: stCam }, mkt: MKT, off: OFF, wh: WH, con: CON, fbi: FBIS };
const SHOTS = [
  [WAKE, 'bed', t => { const u = esin(span(t, WAKE, MAP)); return LOOK(1.1 - 0.5 * u, 1.45 - 0.05 * u, 2.6 - 0.9 * u, -0.85, 1.05, -0.6, 44); }, { dof: () => H_(hero) }],
  [MAP, 'map', t => { const u = span(t, MAP, MORN); return LOOK(-60 * u, 2500 - 500 * esin(u), 1400 - 250 * u, -20 * u, 0, 40, 30); }, { whip: 1 }],
  [MORN, 'man', t => { const u = esin(span(t, MORN, STREETM)); return LOOK(0.9 - 0.5 * u, 1.55, -1.8 - 0.7 * u, -0.85, 1.7, -7.0, 48); }, { dof: () => H_(NBR), whip: -1 }],
  [STREETM, 'st', t => { const u = esin(span(t, STREETM, STORE)); return LOOK(3.6 - 1.4 * u, 1.55, 7.8 - 1.2 * u, -4.5, 1.65, -1.5, 46); }, { dof: () => H_(hero) }],
  [STORE, 'mkt', t => { const u = esin(span(t, STORE, 18.5)); return LOOK(0.4, 2.6 - 0.6 * u, 12.5 - 4.5 * u, 0, 1.0, -8, 50); }, { mb: true, whip: 1 }],
  [18.5, 'mkt', t => { const u = esin(span(t, 18.5, STOCK)); return LOOK(1.25 - 0.2 * u, 1.6, 8.9 - 0.8 * u, 0.55, 1.25, 4.6, 48); }, { dof: () => STO.bat.position.clone() }],
  [STOCK, 'off', t => { const u = esin(span(t, STOCK, 25.2)); return LOOK(0.3, 1.85 - 0.1 * u, 3.0 - 1.6 * u, 0, 1.6, -3.1, 44); }, { whip: -1 }],
  [25.2, 'off', t => orbit(H_(hero), V3(-1, 0.08, 0.3), -0.25, 0.15, 2.2, 1.8, 0.6, span(t, 25.2, MARCH), 42), { dof: () => H_(hero) }],
  [MARCH, 'wh', t => { const u = esin(span(t, MARCH, 33)); return LOOK(2 - 2 * u, 22 - 18.5 * u, 50 - 18 * u, 0, 2.5 + 0.5 * u, 14, 46); }, { whip: 1 }],
  [33, 'wh', t => orbit(H_(hero), V3(1, 0.1, 0.9), -0.3, 0.3, 3.0, 2.5, 0.6, span(t, 33, CONG), 44), { dof: () => H_(hero) }],
  [CONG, 'con', t => { const u = esin(span(t, CONG, 41.5)); return LOOK(1.2 - 2.0 * u, 3.9 - 0.5 * u, 9.6 - 1.8 * u, 0, 1.6, -2.6, 48); }, { whip: -1 }],
  [41.5, 'con', t => { const u = esin(span(t, 41.5, FBIT)); return LOOK(1.0 - 0.3 * u, 2.45, -0.2 - 0.4 * u, 0, 2.3, -3.4, 40); }, { dof: () => H_(CG.spk) }],
  [FBIT, 'fbi', t => { const u = esin(span(t, FBIT, 48.5)); return LOOK(2.1 - 0.8 * u, 1.75, 3.2 - 1.2 * u, 0.4, 1.65, -3.1, 46); }, { whip: 1 }],
  [48.5, 'fbi', t => orbit(H_(FB.c), V3(0.25, 0.05, 1), -0.2, 0.2, 2.1, 1.75, 0.6, span(t, 48.5, GARAGE), 42), { dof: () => H_(FB.c) }],
  [GARAGE, 'st', t => { const u = esin(span(t, GARAGE, 54.6)); return LOOK(5.65, 2.5, -8.2 + 0.4 * u, 5.1, 1.3 + 0.1 * u, -4.4, 56); }, { whip: -1 }],
  [54.6, 'st', t => { const u = esin(span(t, 54.6, ENDC)); return LOOK(5.9 - 0.3 * u, 1.45, -0.6 - 0.9 * u, 5.0, 1.3, -5.4, 42); }, { dof: () => H_(hero) }],
  [ENDC, 'st', t => LOOK(5.6, 1.45, -1.5, 5.0, 1.3, -5.4, 42)]];
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, k, cf] = SHOTS[i], S = SETS[k]; puffsReset();
  if (['bed', 'st', 'mkt', 'off', 'wh'].includes(k)) S.sc.add(hero.outer); if (k === 'man') S.sc.add(NBR.outer);
  if (k === 'bed') { updateBED(t, true); setClock(t < 3.5 ? '11:59' : '12:00'); }
  if (k === 'map') { lightsMat.uniforms.uOff.value = clamp((t - MAP - 0.5) / 3.6, 0, 1); lightsMat.uniforms.uT.value = t; }
  if (k === 'st') { updateStreet(t); setGarage(t < GARAGE ? 0 : t < 54.6 ? smooth(GARAGE + 0.3, GARAGE + 1.7, t) : 1 - smooth(56.0, 57.8, t)); const night = t < GARAGE; ROBES.forEach(w => { w.p.outer.visible = night; }); nb1.outer.visible = nb2.outer.visible = night; }
  if (k === 'mkt') updateStore(t); if (k === 'off') { updateOFF(t); const kk = Math.round(60 * clamp(span(t, STOCK + 0.5, STOCK + 4.6), 0, 1)) / 60; if (kk !== MKTV.k) { MKTV.k = kk; drawMarket(kk); } }
  if (k === 'wh') updateMarch(t); if (k === 'con') updateCongress(t); if (k === 'fbi') updateFBI(t);
  pose(t, k, i);
  const F = cf(t); applyF(S.cam, F); S.cam.updateMatrixWorld();
  if (k === 'map') { shootTo(rt, S.sc, S.cam); return; }
  const far = F.pos.y > 30; if (far) { shootTo(rt, S.sc, S.cam); return; } shootTo(RTS, S.sc, S.cam);
  const hid = []; S.sc.traverse(o => { if (o.isSprite && o.visible) { hid.push(o); o.visible = false; } });
  aoFor(k).render(renderer, rt, RTS); hid.forEach(o => { o.visible = true; }); }
// ---- speech / thought bubbles (DOM), scripted ----
const pickNear = (side) => { let b = MARCHP[0], bd = 1e9; MARCHP.forEach(w => { if (w.side !== side) return; const d = Math.abs(w.x) + Math.abs(w.z - 25.5) * 0.8; if (d < bd) { bd = d; b = w; } }); return b; };
const LEFTY = pickNear(-1), RIGHTY = pickNear(1), YELLER = CG.people.reduce((b, w) => (w.yell && Math.abs(w.x) < Math.abs(b.x) && w.z > 3.5 ? w : b), CG.people[CG.people.length - 1]);
SPEECH.push(
  [MORN + 0.6, STREETM, 'man', () => H_(NBR), 'MY RIFLE?!', 'sp'],
  [STREETM + 0.5, 14.4, 'st', () => H_(nb1), 'Mine too?!', 'sp'], [13.4, STORE, 'st', () => H_(hero), 'huh.', ''],
  [18.8, 20.4, 'mkt', () => H_(STO.tugA), 'MINE!', 'sp'], [19.5, 20.9, 'mkt', () => H_(STO.tugB), 'I SAW IT FIRST!', 'sp'], [20.95, STOCK, 'mkt', () => H_(hero), 'this counts, right?', ''],
  [26.0, MARCH, 'off', () => H_(hero), 'should I buy alarm stocks?', ''],
  [33.3, 35.4, 'wh', () => H_(LEFTY.p), 'GIVE THEM BACK!', 'sp'], [34.4, 36.4, 'wh', () => H_(RIGHTY.p), 'KEEP THEM GONE!', 'sp'], [36.2, CONG, 'wh', () => H_(hero), 'can I finish my hot dog?', ''],
  [39.0, 41.5, 'con', () => H_(YELLER.p), 'vote on WHAT?!', 'sp'], [42.0, FBIT, 'con', () => H_(CG.spk), 'ORDER! ORDER!', 'sp'],
  [49.6, GARAGE, 'fbi', () => H_(FB.c), 'Has anyone checked… garages?', 'sp'],
  [56.4, ENDC, 'st', () => H_(hero), 'nobody needs to know.', '']);
function bubblesAt(t, i) { const [, k] = SHOTS[i], cam = SETS[k].cam, out = []; if (t >= ENDC) return '';
  const add = (p, b) => { const v = p.clone().add(V3(0, 0.32, 0)), dist = cam.position.distanceTo(v); v.project(cam); if (v.z > 1 || Math.abs(v.x) > 1.6 || v.y > 1.6 || v.y < -1.2) return;
    const s = 1.35, hw = (b.txt.length * 16 + 50) * s / 2;
    let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; x = clamp(x, 70 + hw, Math.min(1010, 880 + (y > 1650 || y < 950 ? 130 : 0)) - hw); y = clamp(y, 700, 1130);
    const al = smooth(b.a - 0.01, b.a + 0.08, t) * (1 - smooth(b.b - 0.18, b.b, t)); if (al < 0.02) return;
    out.push({ y, h: `<div class="tb ${b.cls || ''}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;opacity:${al.toFixed(2)};transform:translate(-50%,-100%) scale(${(s * pop(t, b.a, 0.26)).toFixed(3)})"><div class="c">${b.txt}</div><div class="d1"></div><div class="d2"></div></div>` }); };
  for (const [a, b, kk, hf, txt, cls] of SPEECH) if (kk === k && t >= a && t < b) add(hf(), { a, b, txt, cls });
  return out.map(o => o.h).join(''); }
// ---- DOM: title, captions, HUD, bubbles, end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'bubs', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[MAP + 0.3, MORN, 'America has more guns than people. At midnight, <b>every one</b> of them vanishes.'],
  [MORN, STORE, '<b>84 million</b> gun owners check at the same time.'],
  [STORE, STOCK, 'Day 1: America buys every <b>baseball bat</b>.'],
  [STOCK, MARCH, 'Gun stocks crash. Home alarm stocks <b>skyrocket</b>.'],
  [MARCH, 33, 'Day 3: <b>383,000</b> gun industry workers go on strike.'], [33, CONG, 'Hunters join them. Then the other side shows up. <b>Same street.</b>'],
  [CONG, FBIT, 'Congress holds an emergency session. Nobody knows <b>what to vote on</b>.'],
  [FBIT, GARAGE, 'The FBI has one question: where did <b>393 million</b> guns go?'],
  [GARAGE + 1.2, ENDC, 'Day 7: they found them. In <b>YOUR</b> garage.']];
function hudAt(t) { const cnt = (a, b, v) => v * ease(clamp((t - a) / (b - a), 0, 1));
  if (t >= MAP && t < MORN) return ['GUNS IN AMERICA', fmt(393300000 * (1 - clamp((t - MAP - 0.5) / 3.6, 0, 1))), '120 FOR EVERY 100 PEOPLE'];
  if (t >= MORN && t < STORE) return ['GUN OWNERS', fmt(cnt(MORN + 0.2, MORN + 1.4, 84000000)), '1 IN 3 ADULTS'];
  if (t >= STORE && t < 18.5) return ['BASEBALL BATS', 'SOLD OUT', 'NATIONWIDE'];
  if (t >= MARCH && t < 33) return ['ON STRIKE', fmt(cnt(MARCH + 0.3, MARCH + 1.6, 383000)), 'GUN INDUSTRY JOBS'];
  if (t >= 33 && t < CONG) return ['HUNTERS', '15.9 MILLION', 'LICENSED · NOTHING TO HUNT WITH'];
  if (t >= FBIT && t < 48.5) return ['MISSING', '393,300,000', 'GUNS · NO LEADS'];
  return null; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, MAP, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.bubs.innerHTML = bubblesAt(t, i); el.labels.innerHTML = '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); }
// ---- optics: sub-frame motion blur, depth of field from the AO depth buffer, whip-pan smear ----
const RTACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }), RTDOF = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsq = (mat) => { const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return sc; };
const accMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, uniforms: { tSrc: { value: null }, uW: { value: 0.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0); }' });
const dofMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, tDepth: { value: null }, uNear: { value: 0.08 }, uFar: { value: 3000 }, uFocus: { value: 2 }, uAmt: { value: 26 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tSrc, tDepth; uniform float uNear, uFar, uFocus, uAmt; varying vec2 vUv;
    float dist(vec2 uv){ float d=texture2D(tDepth,uv).x; return uNear*uFar/(uFar-d*(uFar-uNear)); }
    float coc(vec2 uv){ float z=dist(uv); return clamp(abs(z-uFocus)/max(z,0.001)*uAmt,0.0,16.0); }
    void main(){ float c0=coc(vUv); vec3 acc=texture2D(tSrc,vUv).rgb; float w=1.0; vec2 px=vec2(1.0/1080.0,1.0/1920.0);
      for(int i=0;i<24;i++){ float a=float(i)*2.39996; float r=sqrt((float(i)+0.5)/24.0); vec2 o=vec2(cos(a),sin(a))*r*c0*px; float cs=coc(vUv+o);
        float k=smoothstep(r*c0-1.5,r*c0+0.5,cs+0.5*c0); acc+=texture2D(tSrc,vUv+o).rgb*k; w+=k; }
      gl_FragColor=vec4(acc/w,1.0); }` });
const accSc = fsq(accMat), dofSc = fsq(dofMat), MB_K = 4, SHUTTER = 0.5 / 30;
function shotOpts(i) { return SHOTS[i][3] || {}; }
function whipAt(t) { let w = 0; for (const [c, , , o] of SHOTS) if (o && o.whip) { const k = Math.max(0, 1 - Math.abs(t - c) / 0.14); w += o.whip * 0.11 * k * k; } return w; }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  document.body.classList.toggle('bright', ['man', 'mkt', 'off', 'wh'].includes(SHOTS[i][1]));   // soft dark backing under captions on bright sets
  if (window.PASS === 'text') { shoot(i, t, RTA); updateDOM(t, i); return true; }
  const o = shotOpts(i); let src = RTA;
  if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA);
  } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && AO[SHOTS[i][1]] && !o.mb) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = AO[SHOTS[i][1]].depthTexture; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  compMat.uniforms.tA.value = src.texture; compMat.uniforms.uWhip.value = whipAt(t); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uSepia.value = 0; compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildMap();
  for (const n of Object.keys(FACE)) for (const b of [false, true]) for (const P of [hero, NBR, CG.spk, FB.a, FB.b, FB.c, STO.tugA, STO.tugB, nb1, nb2]) renderer.initTexture(faceTex(P.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
