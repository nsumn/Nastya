// =================== THE STORY: POV shots (world + the cabin frame drawn on top), the cabin from outside over the night Earth, the jump, the parachute ===================
for (const o of [friend.outer]) o.visible = false;
const sp = (t, a, b) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const dirOf = (yaw, pitch) => V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));   // yaw 0 = north (−z), π = south
// [start, kind, (t) => { yaw, pitch, fov } | camera for 'cab'/'fall'/'land', { mb }]
const SHOTS = [
  [0, 'city', t => ({ yaw: 0.35 - 0.1 * sp(t, 0, UP), pitch: 0.22 - 0.1 * sp(t, 0, UP), fov: 74 })],   // Times Square at night, looking up from the cabin
  [UP, 'city', t => ({ yaw: Math.PI * 0.93, pitch: lerp(0.05, -0.22, sp(t, UP, CLOUD)), fov: 74 }), { mb: true }],   // shooting up past the towers, One WTC downtown
  [CLOUD, 'sky', t => ({ yaw: Math.PI * 0.9, pitch: lerp(-0.35, -0.55, sp(t, CLOUD, EVER)), fov: 72 }), { mb: true }],   // through the clouds, the city glowing below
  [EVER, 'sky', t => ({ yaw: Math.PI * 0.8, pitch: lerp(-0.7, -0.45, sp(t, EVER, JET)), fov: 70 })],   // Everest height: frost creeps over the glass
  [JET, 'sky', t => ({ yaw: 0.02, pitch: lerp(-0.08, -0.02, sp(t, JET, ARM)), fov: 66 })],   // an airliner slides past
  [ARM, 'sky', t => ({ yaw: 0.0, pitch: lerp(-0.12, -0.3, sp(t, ARM, KAR)), fov: 70 })],   // the sky goes black, the horizon curves
  [KAR, 'space', t => ({ yaw: 0.25, pitch: lerp(-0.3, -0.45, sp(t, KAR, ISS)), fov: 72 })],   // space: the night US in lights
  [ISS, 'space', t => ({ yaw: 0.0, pitch: -0.06, fov: 66 })],   // the ISS whips past
  [FLOAT, 'space', t => ({ yaw: 0.1, pitch: lerp(-0.6, -1.15, sp(t, FLOAT, FLOAT + 2)), fov: 70 })],   // you look down: your mug is still on the floor
  [FLOAT + 3.0, 'cab', t => { const a = lerp(0.6, 1.3, sp(t, FLOAT + 3, JUMP)); return { pos: V3(Math.sin(a) * 6.5, 2.2 + 0.6 * sp(t, FLOAT + 3, JUMP), Math.cos(a) * 6.5), look: V3(0, 1.2, 0), fov: 50 }; }],   // the cabin, alone over the Earth
  [JUMP, 'cab', t => ({ pos: V3(0.3, 1.55, 4.2 - 0.8 * sp(t, JUMP, JUMP + 2)), look: V3(0, 1.45, 0), fov: 50 })],   // doors open… a wink… a parachute pack
  [JUMP + 2.3, 'cab', t => ({ pos: V3(4.5, 0.5, 5.5), look: V3(0, -1.5 * sp(t, JUMP + 2.3, DROP), 2.5), fov: 55 })],   // he jumps
  [DROP, 'fall', t => ({ pos: V3(1.6, 2.6, 1.9), look: V3(0, -2.5, 0), fov: 62 })],   // from above: you + the night Earth below   // falling head-first toward the glowing Earth
  [DROP + 3.0, 'fall', t => ({ pos: V3(-1.2, 2.2, 2.0), look: V3(0, -1.8, 0), fov: 62 })],   // the air catches fire around him
  [LAND, 'land', t => { const y = lerp(130, 0, sp(t, LAND, LAND + 1.7)); return { pos: V3(6, y + 0.4, 32), look: V3(0, y + 2.6, 20), fov: 60 }; }]];   // under the canopy, the ads behind   // the parachute over Times Square
// ---- per-frame poses / props ----
function heroIn(scene) { if (hero.outer.parent !== scene) scene.add(hero.outer); hero.outer.visible = true; }
function poseHero(t, kind) { const P = hero; poseReset(P, t); CB.canopy.visible = CB.lines.visible = false; CB.pack.visible = false; CB.glow.forEach(s => s.visible = false);
  if (kind === 'cab') { heroIn(CAB.sc); const open = sp(t, JUMP + 0.2, JUMP + 0.8); CB.doorL.position.x = -0.5 - 0.95 * open; CB.doorR.position.x = 0.5 + 0.95 * open; CB.box.visible = true;
    const jt = t - (JUMP + 2.3); if (jt < 0) { place(P, 0, 0.0, t < JUMP + 0.6 ? Math.PI * 0.85 : 0, 0.0); P.face(t < FLOAT + 3 + 2.5 || t < JUMP ? 'neutral' : t < JUMP + 1.0 ? 'surprised' : 'smirk', t);
        if (t >= JUMP + 1.0 && t < JUMP + 1.8) { P.arms[1].rotation.set(-2.2, 0, -0.2); P.elbows[1].rotation.x = -1.6; }   // a little salute
        if (t >= JUMP + 1.8) { P.arms.forEach((a, i) => a.rotation.set(-0.4, 0, i ? -0.5 : 0.5)); P.root.rotation.x = 0.2 * sp(t, JUMP + 1.8, JUMP + 2.3); } }
    else { const u = jt; place(P, 0, 1.2 + 2.4 * u, 0, 1.0 * u - 4.9 * u * u * 0.5); P.root.rotation.x = 0.6 + 1.2 * u; P.arms.forEach((a, i) => a.rotation.set(-2.6, 0, i ? -0.6 : 0.6)); P.face('laugh', t); }
    P.outer.updateMatrixWorld(true); CB.pack.visible = true; CB.pack.position.copy(P.torso.localToWorld(V3(0, 0.15, -0.22))); CB.pack.quaternion.copy(P.torso.getWorldQuaternion(new THREE.Quaternion())); }
  else if (kind === 'fall') { heroIn(CAB.sc); CB.box.visible = false; place(P, 0, 0, 0, 0); P.outer.rotation.set(Math.PI * 0.55, 0.3 * Math.sin(t * 0.7), 0.15 * Math.sin(t * 1.3)); P.arms.forEach((a, i) => a.rotation.set(-1.4, 0, i ? -1.1 : 1.1)); P.legs.forEach((l, i) => l.rotation.x = 0.2 * Math.sin(t * 9 + i * 3)); P.face(t < DROP + 3 ? 'wired' : 'surprised', t);
    P.outer.updateMatrixWorld(true); CB.pack.visible = true; CB.pack.position.copy(P.torso.localToWorld(V3(0, 0.15, -0.22))); CB.pack.quaternion.copy(P.torso.getWorldQuaternion(new THREE.Quaternion()));
    const heat = sp(t, DROP + 1.5, DROP + 4.0) * (1 - sp(t, LAND - 0.6, LAND)); CB.glow.forEach((s, k) => { const u = ((t * 2.2 + k / 40) % 1); s.visible = heat > 0.02; s.position.set((hash(k) - 0.5) * 0.9 * (1 + u), -0.9 + 2.6 * u, (hash(k * 3) - 0.5) * 0.9 * (1 + u)); s.scale.setScalar((0.35 + 0.9 * u) * heat); s.material.opacity = 0.7 * (1 - u) * heat; }); }
  else if (kind === 'land') { heroIn(CITY.sc); const y = lerp(130, 0, sp(t, LAND, LAND + 1.7)); place(P, 0, 20, 0, y); P.arms.forEach((a, i) => a.rotation.set(-2.7, 0, i ? -0.25 : 0.25)); P.face(y > 1 ? 'happy' : 'laugh', t);
    CB.canopy.visible = CB.lines.visible = y > 0.5; if (CB.canopy.parent !== CITY.sc) { CITY.sc.add(CB.canopy); CITY.sc.add(CB.lines); CITY.sc.add(CB.pack); } CB.canopy.position.set(0, y + 0.95 + 4.4, 20); CB.lines.position.set(0, y + 0.95 + 0.3, 20);
    P.outer.updateMatrixWorld(true); CB.pack.visible = true; CB.pack.position.copy(P.torso.localToWorld(V3(0, 0.15, -0.22))); CT.heroLight.position.set(2, y + 3, 24); }
  if (kind !== 'land' && CB.canopy.parent !== CAB.sc) { CAB.sc.add(CB.canopy); CAB.sc.add(CB.lines); CAB.sc.add(CB.pack); } }
// ---- render one shot into rt: the world, then (POV) the cabin frame on top / (cab, fall) the meters scene on top of space ----
const RTB2 = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function renderWorld(scene, cam, rt, clear = true) { cam.aspect = W / H; cam.updateProjectionMatrix(); renderer.setRenderTarget(rt); if (clear) { renderer.setClearColor(0x000000, 1); renderer.clear(); } else renderer.clearDepth(); renderer.render(scene, cam); }
function shoot(i, t, rt) { const [, kind, cf] = SHOTS[i], alt = altAt(t), F = cf(t); renderer.autoClear = false; puffsReset(); hero.outer.visible = false;
  if (kind === 'city' || kind === 'sky' || kind === 'space') {
    const W_ = kind === 'city' ? CITY : kind === 'sky' ? SKY : SPACE, cam = W_.cam, k = kind === 'space' ? 0.001 : 1, d = dirOf(F.yaw, F.pitch);
    cam.fov = F.fov; cam.position.set(0, (alt + 1.6) * k, 0); cam.lookAt(cam.position.clone().add(d));
    if (kind === 'city') updateCity(t, cam); else if (kind === 'sky') updateSky(t, cam, alt); else updateSpace(t, cam);
    renderWorld(W_.sc, cam, rt);
    povCam.fov = F.fov; povCam.position.set(0, 0, 0); povCam.quaternion.copy(cam.quaternion); povCam.updateMatrixWorld(true);
    POV.frost.material.opacity = 0.55 * sp(t, EVER + 0.5, EVER + 2.5) * (1 - sp(t, ARM - 0.5, ARM + 1.5)); POV.mug.visible = t >= FLOAT;
    renderWorld(POVS, povCam, rt, false); }
  else if (kind === 'cab' || kind === 'fall') {
    poseHero(t, kind); const c = CAB.cam; c.fov = F.fov; c.position.copy(F.pos); c.lookAt(F.look); c.updateMatrixWorld(true);
    CB.cables.forEach(c => { c.visible = kind === 'cab'; }); const altKm = kind === 'fall' ? lerp(400, 70, Math.pow(sp(t, DROP, LAND), 0.8)) : 400, sc = SPACE.cam; sc.fov = F.fov; sc.position.set(c.position.x / 1000, altKm + c.position.y / 1000, c.position.z / 1000); sc.quaternion.copy(c.quaternion); updateSpace(t, sc);
    renderWorld(SPACE.sc, sc, rt); renderWorld(CAB.sc, c, rt, false); }
  else { poseHero(t, 'land'); const c = CITY.cam; c.fov = F.fov; c.position.copy(F.pos); c.lookAt(F.look); updateCity(t, c); renderWorld(CITY.sc, c, rt); }
  renderer.autoClear = true; }
// ---- motion blur (sub-frame accumulation) for the rush shots ----
const RTACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, uniforms: { tSrc: { value: null }, uW: { value: 0.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0); }' });
const accSc = new THREE.Scene(); accSc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat)); const MB_K = 4, SHUTTER = 0.5 / 30;
// ---- DOM: HUD (altitude + the elevator clock), the to-scale minimap, captions ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS', 'flash', 'mini'].map(k => [k, $(k)]));
const CAPS = [[UP + 0.2, UP + 2.6, 'The fastest elevator on Earth: <b>47 mph</b>.'], [UP + 2.6, CLOUD - 0.1, '26 seconds: you pass One World Trade.'],
  [CLOUD + 0.3, EVER - 0.1, '6,500 ft. Your ears pop.'],
  [EVER + 0.3, EVER + 3.0, 'Everest height: the air is <b>1/3</b> as thick.'], [EVER + 3.0, JET - 0.1, 'Without the cabin: 3–5 minutes before you pass out.'],
  [JET + 0.3, JET + 3.0, 'Airliners. Outside: <b>−65°F</b>.'], [JET + 3.0, ARM - 0.1, 'Out there you’d have about 30 seconds.'],
  [ARM + 0.3, ARM + 3.0, '63,000 ft: the Armstrong limit.'], [ARM + 3.0, KAR - 0.1, 'Above it, your saliva would boil.'],
  [KAR + 0.3, KAR + 3.0, '62 miles: officially <b>SPACE</b>.'], [KAR + 3.0, ISS - 0.1, '79 minutes after Times Square.'],
  [ISS + 0.3, ISS + 3.0, '5 hours 19 minutes: the ISS’s height.'], [ISS + 3.0, FLOAT - 0.1, 'It flies past at <b>17,500 mph</b>.'],
  [FLOAT + 0.3, FLOAT + 3.0, 'But you don’t float. Gravity here: still <b>~90%</b>.'], [FLOAT + 3.0, JUMP - 0.1, 'Astronauts float because they’re falling around Earth at 17,500 mph.'],
  [JUMP + 2.3, DROP - 0.1, '…'], [DROP + 0.2, DROP + 3.0, 'You’d hit the air at <b>~5,200 mph</b>: 6× the record jump.'], [DROP + 3.0, LAND - 0.1, 'In real life you’d need a heat shield. Let’s pretend.'],
  [LAND + 0.1, ENDC - 0.05, 'Total trip: 5 h 19 min up, ~15 min down.']];
const fmtClock = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`; };
function hudAt(t) { if (t < UP - 0.2 || t >= LAND) return null; const alt = altAt(t);
  if (t >= DROP && t < LAND) return ['FALLING', fmt(5200 * sp(t, DROP, DROP + 2.5)) + ' MPH', 'FROM 250 MILES UP'];
  if (t >= JUMP) return ['ALTITUDE', '250 MI', 'DOORS OPEN'];
  const v = alt < 30000 ? fmt(alt * 3.281) + ' FT' : (alt / 1609.34 < 10 ? (alt / 1609.34).toFixed(1) : fmt(alt / 1609.34)) + ' MI';
  return ['ALTITUDE', v, 'TIME IN ELEVATOR ' + fmtClock(alt / 21) + ' · 47 MPH']; }
const MARKS = [['ONE WTC', 541], ['CLOUDS', 2000], ['EVEREST', 8849], ['JETS', 10668], ['ARMSTRONG LIMIT', 19202], ['SPACE', 100000], ['ISS', 400000]];
function miniAt(t) { if (t < UP || t >= JUMP + 2.3) return ''; const yOf = a => 200 - 180 * Math.log10(1 + a / 50) / Math.log10(1 + 400000 / 50), alt = altAt(t), y = yOf(alt);
  return `<svg width="230" height="230" viewBox="0 0 230 230"><circle cx="115" cy="115" r="112" fill="rgba(8,12,24,0.72)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
    <line x1="80" y1="20" x2="80" y2="200" stroke="rgba(255,255,255,0.35)" stroke-width="2"/><line x1="80" y1="${y.toFixed(1)}" x2="80" y2="200" stroke="#ffd060" stroke-width="4"/>
    ${MARKS.map(([n, a]) => `<line x1="74" x2="86" y1="${yOf(a).toFixed(1)}" y2="${yOf(a).toFixed(1)}" stroke="rgba(255,255,255,0.6)" stroke-width="2"/><text x="92" y="${(yOf(a) + 4).toFixed(1)}" font-family="Inter" font-size="11" font-weight="600" fill="rgba(255,255,255,${alt >= a ? 0.95 : 0.45})" letter-spacing="1">${n}</text>`).join('')}
    <circle cx="80" cy="${y.toFixed(1)}" r="7" fill="#ffd060"/><text x="58" y="${(y + 4).toFixed(1)}" font-family="Inter" font-size="11" font-weight="700" fill="#ffd060" text-anchor="end">YOU</text>
    <text x="115" y="222" font-family="Inter" font-size="10" font-weight="600" fill="rgba(255,255,255,0.6)" text-anchor="middle" letter-spacing="2">TO SCALE (LOG)</text></svg>`; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, UP, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.15) : 0;
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.mini.innerHTML = miniAt(t); el.mini.style.opacity = fadeWin(t, UP, JUMP + 2.3, 0.3);
  el.flash.style.opacity = 0.5 * Math.exp(-Math.pow((t - KAR) / 0.1, 2)) + 0.35 * Math.exp(-Math.pow((t - LAND) / 0.1, 2));
  el.labels.innerHTML = '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.7, ENDC + 1.0, t); }
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  const o = SHOTS[i][3] || {}; let src = RTA;
  if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER * 2); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; } else shoot(i, t, RTA);
  compMat.uniforms.tA.value = src.texture; compMat.uniforms.uWhip.value = 0; compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uLook.value = 1.0; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildEarth();
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
