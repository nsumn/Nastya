// =================== THE STORY: you in the storm, shots (moving cameras, DOF, motion blur, whips), captions/HUD, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const H_ = p => p.head ? headOf(p) : (p.outer.updateMatrixWorld(true), p.root.localToWorld(V3(0, 1.63, 0)));   // people.js persons have no separate head object
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const seatY = (P, y) => y + 0.95 - 0.9 * (P.o ? P.o.h : P.h);   // makeBlock people carry o.h, people.js ones carry h
const Y_ = V3(0, 1, 0), esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
const span = (t, a, b) => (t - a) / (b - a);
friend.outer.visible = false;
// you: on the sidewalk under the umbrella (steps back from the geyser), later knee-deep in your flooded living room
function pose(t, k) {
  const P = hero; poseReset(P, t); UMB.visible = false;
  if (k === 'nyc' && t < RIVER) {
    const back = smooth(DRAIN + 0.6, DRAIN + 1.6, t); place(P, 8.6, 1.4 + 1.2 * back, Math.PI * 0.85 + 0.4 * back, 0.16); if (back > 0 && back < 1) poseWalk(P, t * 8, 0.8);
    P.arms[1].rotation.set(-1.25, 0, 0.15); P.elbows[1].rotation.x = -1.1; P.outer.updateMatrixWorld(true); UMB.visible = true; UMB.position.copy(P.elbows[1].localToWorld(V3(0, -0.3, 0.05))); UMB.rotation.set(0.12 * Math.sin(t * 2.3), 0, 0.1 + 0.06 * Math.sin(t * 3.1));
    P.face(t < DRAIN ? 'neutral' : t < DRAIN + 1.2 ? 'surprised' : 'worried', t); }
  else if (k === 'apt') { place(P, 0.6, -0.6, Math.PI + 0.25 - 0.4 * smooth(MOLD + 2.8, MOLD + 3.6, t)); P.outer.position.y -= 0.0; P.arms.forEach((a, i) => a.rotation.set(-0.25, 0, (i ? -1 : 1) * 0.35)); P.face(t < MOLD + 3 ? 'worried' : 'anxious', t); }
  else P.outer.visible = false;
}
// ---- shots: [start, set, camera(t), opts{mb, dof, whip}] ----
const SETS = { nyc: NYC, sub: SUB, apt: APT, old: OLDS, cal: CAL, esb: ESB, sky: SKY };
const SHOTS = [
  [0, 'nyc', t => lerpF(LOOK(4.0, 7.5, 16, 7.5, 1.6, 0.0), LOOK(6.0, 0.55, 8.2, 8.4, 1.5, 1.2), 1 - Math.pow(1 - clamp(t / DRAIN, 0, 1), 2.2))],   // crane down to the wet asphalt
  [DRAIN, 'nyc', t => { const u = esin(span(t, DRAIN, 7.0)); return LOOK(5.2 + 0.4 * u, 0.35 + 0.2 * u, 5.4 - 0.8 * u, 6.75, 0.25 + 0.5 * u, 3.0, 42); }, { dof: () => NY.drainP.clone().add(V3(0, 0.3, 0)) }],
  [7.0, 'nyc', t => orbit(H_(hero), V3(-0.5, 0.1, 1), -0.5, 0.25, 3.4, 2.9, 0.62, span(t, 7.0, RIVER)), { dof: () => H_(hero) }],
  [RIVER, 'nyc', t => { const u = esin(span(t, RIVER, 13.0)); return LOOK(1.5 - 1.5 * u, 3.0 + 1.5 * u, 14 - 2 * u, -0.5, 0.8, -20, 44); }, { whip: 1 }],
  [13.0, 'nyc', t => { const c = NY.cabs[2]; const p = c.position; return LOOK(p.x + 4.2 - 1.5 * span(t, 13, SUBWAY), p.y + 1.6, p.z + 5.5, p.x, p.y + 0.8, p.z, 40); }, { mb: true }],
  [SUBWAY, 'sub', t => { const u = esin(span(t, SUBWAY, 19.0)); return LOOK(-0.8 + 0.4 * u, 2.9 - 0.4 * u, 3.6 - 0.4 * u, 0.6, -0.8, -0.6, 46); }],
  [19.0, 'sub', t => { const u = esin(span(t, 19.0, MOLD)); return LOOK(5.8 - 1.6 * u, 3.6 - 0.5 * u, 6.2 + 1.0 * u, 0.3, 0.2, 0, 40); }, { whip: -1 }],
  [MOLD, 'apt', t => { const u = esin(span(t, MOLD, 25.0)); return LOOK(2.6 - 0.8 * u, 1.5, 2.2 - 0.6 * u, 0, 1.2, -3.2, 44); }],
  [25.0, 'apt', t => { const u = esin(span(t, 25.0, AERIAL)); return LOOK(0.9 + 0.3 * u, 1.1 + 0.15 * u, -1.6 - 0.4 * u, 0.3, 0.9, -3.45, 50); }, { dof: () => V3(0.4, 0.9, -3.44) }],
  [AERIAL, 'nyc', t => { const u = esin(span(t, AERIAL, 34.0)); return LOOK(2 - 6 * u, 8 + 34 * u, 20 + 10 * u, -1, 2, -60, 44); }, { mb: true, whip: 1 }],
  [OLD, 'old', t => { const u = esin(span(t, OLD, MAPC)); const z = boatZ(t); return LOOK(4.5 - 2 * u, 2.6 - 0.6 * u, z - 9 + 2 * u, 0.5, 1.8, z, 42); }, { sepia: 1 }],
  [MAPC, 'cal', t => { const u = esin(span(t, MAPC, ROW)); return LOOK(70 - 15 * u, 470 - 70 * u, 470 - 50 * u, 64, 0, 262, 34); }],
  [ROW, 'old', t => { OD.gov.outer.updateMatrixWorld(true); const h = H_(OD.gov); return fr(h, V3(0.6, 0.15, -1).applyAxisAngle(Y_, -0.3 + 0.5 * span(t, ROW, YEAR)), 2.4, 0.6); }, { sepia: 1, dof: () => H_(OD.gov) }],
  [YEAR, 'esb', t => { const u = esin(span(t, YEAR, 48.0)); return LOOK(-40 + 20 * u, 70 + 60 * u, 780 - 150 * u, -45, 220 + 40 * u, 40, 44); }],
  [48.0, 'esb', t => { const u = esin(span(t, 48.0, TWIST)); return LOOK(-50 + 40 * u, 25, 440 - 40 * u, -55, 300 + 60 * u, 40, 56); }],
  [TWIST, 'sky', t => { const u = esin(span(t, TWIST, TWIST + 3.2)), v = span(t, TWIST + 3.2, ENDC); return LOOK(0, -40 + 820 * u + 40 * Math.max(0, v), 900 - 300 * u, 0, 200 + 300 * u, -1800, 46); }, { mb: true }],
  [ENDC, 'sky', t => LOOK(0, 860 + 4 * (t - ENDC), 600, 0, 500, -1800, 46)]];
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, k, cf] = SHOTS[i], S = SETS[k]; puffsReset();
  if (k === 'nyc' || k === 'apt') S.sc.add(hero.outer), S.sc.add(UMB);
  pose(t, k); const F = cf(t); applyF(S.cam, F); S.cam.updateMatrixWorld();
  if (k === 'nyc') updateStormNYC(t, S.cam); if (k === 'sub') updateStormSUB(t, S.cam); if (k === 'apt') updateAPT(t, S.cam); if (k === 'old') updateOLD(t, S.cam); if (k === 'cal') updateCAL(t); if (k === 'esb') updateESB(t, S.cam); if (k === 'sky') updateSKY(t, S.cam);
  if (k === 'cal' || k === 'sky' || k === 'esb') { shootTo(rt, S.sc, S.cam); return; }
  const far = F.pos.y > 20; if (far) { shootTo(rt, S.sc, S.cam); return; } shootTo(RTS, S.sc, S.cam);
  const hid = []; S.sc.traverse(o => { if ((o.isSprite || o.material === RAINM || o.material === RINGM) && o.visible) { hid.push(o); o.visible = false; } });   // no rain/sprites in the AO pre-pass
  aoFor(k).render(renderer, rt, RTS); hid.forEach(o => { o.visible = true; }); }
// ---- DOM: title fades, captions pop (series style), HUD (model counters), map labels, end card ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS'].map(k => [k, $(k)]));
const CAPS = [[DRAIN, 7.0, 'NYC sewers handle about <b>1.75 in</b> of rain an hour.'], [7.0, RIVER, 'This storm: <b>2 inches</b>. Every hour.'],
  [RIVER, 13.0, 'By nightfall, the streets are rivers.'], [13.0, SUBWAY, 'Cars start to float.'],
  [SUBWAY, 19.0, 'Hurricane Ida dropped <b>3.15 in</b> in one hour, and the subway flooded.'], [19.0, MOLD, 'This storm never ends.'],
  [MOLD, AERIAL, 'Day 2: mold starts growing in flooded homes.'], [AERIAL, OLD, '<b>4 feet</b> of rain a day. Nowhere for it to go.'],
  [OLD, MAPC, 'It happened before. In <b>1862</b>, storms hit California for <b>43 days</b>.'], [MAPC, ROW, 'The Central Valley became a <b>300-mile</b> lake.'],
  [ROW, YEAR, 'The governor rowed to his own inauguration.'], [YEAR, 48.0, 'In one year: <b>1,460 ft</b> of rain…'], [48.0, TWIST, '…taller than the Empire State Building.'],
  [TWIST, 55.3, 'The twist? All the water in the sky right now…'], [55.3, ENDC, '…would make only about <b>1 inch</b> of rain worldwide.']];
const hours = t => t < DRAIN ? 0 : t < MOLD ? lerp(0, 24, smooth(DRAIN, MOLD, t) * 0.0 + (t - DRAIN) / (MOLD - DRAIN)) : 0;
function hudAt(t) {
  if (t >= DRAIN && t < MOLD) { const h = Math.max(1, Math.ceil(hours(t))); return ['STORM · 2 IN/HR', 'HOUR ' + h, 'RAIN SO FAR: ' + fmt(2 * hours(t)) + ' IN']; }
  if (t >= MOLD && t < AERIAL) return ['FLOODED HOMES', 'DAY 2', 'MOLD CAN START IN 24–48 H (CDC)'];
  if (t >= AERIAL && t < OLD) return ['RAIN PER DAY', '4 FT', '48 IN · 24 H × 2 IN'];
  if (t >= OLD && t < YEAR) return ['THE GREAT FLOOD', '1862', 'CALIFORNIA · 43 DAYS OF STORMS'];
  if (t >= YEAR && t < TWIST) return ['ONE YEAR OF RAIN', fmt(1460 * smooth(YEAR + 0.3, YEAR + 6.5, t)) + ' FT', 'EMPIRE STATE BUILDING: 1,454 FT'];
  if (t >= TWIST && t < ENDC) return ['ALL WATER IN THE SKY', '≈1 IN', 'IF IT FELL AT ONCE (USGS)'];
  return null; }
function labelsAt(t, i) { const k = SHOTS[i][1]; const tag = (p, txt, cam) => { const v = p.clone().project(cam); return `<div class="lb" style="left:${clamp((v.x + 1) / 2 * W, 200, 880).toFixed(0)}px;top:${((1 - v.y) / 2 * H).toFixed(0)}px">${txt}</div>`; };
  if (k === 'cal' && CA.lake && t > MAPC + 1.2) return tag(V3(95, 8, 266), '300 MILES', CAL.cam) + tag(V3(56, 8, 249), 'SACRAMENTO', CAL.cam);
  if (k === 'esb' && t > YEAR + 1) return tag(V3(0, 455, 0), 'EMPIRE STATE', ESB.cam) + tag(V3(-110, colH(t) + 12, 40), '1 YEAR OF RAIN', ESB.cam);
  return ''; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, DRAIN, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = '<b></b>' + h[0]; el.val.textContent = h[1]; el.sub.textContent = h[2]; }
  el.labels.innerHTML = labelsAt(t, i);
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.9, ENDC + 1.3, t); }
// ---- optics: sub-frame motion blur (accumulate K renders across a 180° shutter), depth of field from the AO depth buffer, whip-pan smear ----
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
  document.body.classList.toggle('bright', SHOTS[i][1] === 'old' || SHOTS[i][1] === 'sky');   // soft dark backing under captions on bright sets
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  const o = shotOpts(i); let src = RTA;
  if (o.mb) {   // motion blur: average MB_K renders spread over the shutter (stay inside this shot)
    renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(SHOTS[i][0], t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(i, ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(i, t, RTA);   // leave the scene posed at t (DOM labels project from it)
  } else shoot(i, t, RTA);
  const S = SETS[SHOTS[i][1]];
  if (o.dof && AO[SHOTS[i][1]] && !o.mb) { const f = o.dof(); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = AO[SHOTS[i][1]].depthTexture; dofMat.uniforms.uNear.value = S.cam.near; dofMat.uniforms.uFar.value = S.cam.far;
    dofMat.uniforms.uFocus.value = S.cam.position.distanceTo(f); renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; }
  compMat.uniforms.tA.value = src.texture; compMat.uniforms.uWhip.value = whipAt(t); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t;
  compMat.uniforms.uSepia.value = o.sepia || 0; compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildCAL();
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
