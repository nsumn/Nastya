// =================== THE STORY: you on the beach, in Allen SD, in the jam, in the cold; shots, captions/HUD, render ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.12, fov);
function framing(h, dir, dist, headY, fov = 40) { const d = dir.clone().normalize(), visH = 2 * dist * Math.tan(fov * Math.PI / 360); return { pos: h.clone().addScaledVector(d, dist), look: V3(h.x, h.y + (headY - 0.5) * visH, h.z), fov }; }
const LOOK = (px, py, pz, lx, ly, lz, fov = 40) => ({ pos: V3(px, py, pz), look: V3(lx, ly, lz), fov });
const lerpF = (A, B, k) => ({ pos: A.pos.clone().lerp(B.pos, k), look: A.look.clone().lerp(B.look, k), fov: lerp(A.fov, B.fov, k) });
const mid = () => H_(hero).lerp(H_(friend), 0.5); const H_ = p => headOf(p);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
// seated: hips on a seat at height y (hip joint sits 0.9·h above the body origin, which is 0.95 below outer)
const seatY = (P, y) => y + 0.95 - 0.9 * P.o.h;
const esin = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1)), span = (t, a, b) => (t - a) / (b - a), Y_ = V3(0, 1, 0);
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => fr(h, dir.clone().applyAxisAngle(Y_, lerp(a0, a1, esin(u))), lerp(d0, d1, esin(u)), hy, fov);
for (const o of [friend.outer]) o.visible = false;
const goggles = new THREE.Group(); { const gm = M('#2a2a30'), lens = M('#5ad8ff', { roughness: 0.1, metalness: 0.3 }); for (const s of [-1, 1]) { const l = mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 14), gm); l.position.set(s * 0.055, 0, 0); goggles.add(l); const g2 = mesh(new THREE.CircleGeometry(0.045, 14), lens); g2.position.set(s * 0.055, 0, -0.002); goggles.add(g2); } }
hero.head.add(goggles); goggles.position.set(0, 0.17, 0.2); goggles.rotation.x = -0.6;   // swim goggles pushed up on the forehead
function pose(t, k) { const P = hero; poseReset(P, t); P.torso.scale.set(1, 1, 1); BC.towel.visible = false;
  if (k === 'beach') {   // front row, center, facing the water (-z)
    const x = 0, z0 = 0.9; let y = 0, z = z0;
    if (t >= JUMP && t < MACRO) { const jt = JT(t), u = clamp(jt / 0.75, 0, 1); z = lerp(z0, -SHORE_LAND - 7.1 * 0.18, u); y = 1.6 * Math.sin(Math.PI * u) - 0.75 * smooth(0.85, 1, u); if (u >= 1) y = -0.75; }
    if (t >= COLD && t < BACK) { z = -SHORE_LAND - 7.1 * 0.18; y = -0.75 + 0.02 * Math.sin(t * 40); }
    if (t >= BACK) { const u = clamp((t - BACK) / 2.0, 0, 1); z = lerp(-SHORE_LAND - 1.3, z0 + 2.5, u); y = lerp(-0.75, 0, Math.min(1, u * 2.5)); }
    place(P, x, z, Math.PI, y);
    if (t < COUNT) P.face('happy', t); else if (t < JUMP) { P.face('wired', t); P.arms.forEach((a, i) => a.rotation.set(0.6 * smooth(COUNT, JUMP, t), 0, i ? -0.2 : 0.2)); }
    else if (t < COLD) { P.face('laugh', t); P.arms.forEach((a, i) => a.rotation.set(-2.6, 0, i ? -0.4 : 0.4)); }
    else if (t < BACK) { P.face('anxious', t); P.arms.forEach((a, i) => a.rotation.set(-0.9, 0, i ? 0.9 : -0.9)); P.elbows.forEach(e => e.rotation.x = -2.0); P.outer.position.x += 0.012 * Math.sin(t * 43); }   // hugging yourself, shivering
    else { P.face('sad', t); poseWalk(P, t * 6, 0.6); BC.towel.visible = true; P.outer.updateMatrixWorld(true); BC.towel.position.copy(headOf(P)).add(V3(0, -0.32, 0)); BC.towel.scale.set(1, 1, 1); } }
  else if (k === 'farm') {   // Allen, SD: you walk to your car with a towel and goggles; then it drives off (you in it)
    const u = smooth(ALLEN + 0.3, ALLEN + 3.4, t); place(P, lerp(-3, 1.0, u), lerp(1, 5.6, u), Math.atan2(4, 4.6)); if (u < 1) poseWalk(P, t * 7, 1); P.face('happy', t); P.outer.visible = t < ALLEN + 3.6; } }
const SETS = { beach: BEACH, farm: FARM, hwy: HWY, under: UNDER, macro: MACR, space: { sc: SPACE_S, cam: spCam }, map: { sc: mapScene, cam: mapCam } };
const UPD = { beach: (t, m) => updateBeach(t, m), farm: updateFarm, hwy: updateHwy, under: updateUnder, macro: () => {}, space: updateSpace, map: updateMap };
const SHOTS = [   // [start, set, camera(t), opts, beach mode]
  [0, 'beach', t => lerpF(LOOK(-40, 60, 70, 10, 0, -10), LOOK(-22, 26, 34, 6, 0.8, 0), esin(span(t, 0, MAP))), {}, 'crowd'],   // the crowd to the horizon (title)
  [MAP, 'map', t => LOOK(0, 900 - 120 * esin(span(t, MAP, ALLEN)), 330 - 60 * esin(span(t, MAP, ALLEN)), 0, 0, 10, 40), {}],   // everyone streams to the coasts
  [ALLEN, 'farm', t => lerpF(LOOK(13, 3.2, 17, -1, 1.6, 1), LOOK(11, 3.6, 15, -2, 1.8, -4), esin(span(t, ALLEN, ALLEN + 4))), {}],   // Allen, SD: 1,018 miles
  [ALLEN + 4.0, 'farm', t => LOOK(4, 1.4, 14, 1.8, 1.0, -10 - 30 * span(t, ALLEN + 4, JAM)), {}],   // the car drives off down the empty road
  [JAM, 'hwy', t => lerpF(LOOK(30, 60, 60, 0, 0, -120), LOOK(16, 14, 22, 0, 0, -160), esin(span(t, JAM, COAST))), { mb: true }],   // the jam to the horizon
  [COAST, 'beach', t => LOOK(-60 + 30 * esin(span(t, COAST, COAST + 3)), 9, -14, 0, 0.8, 4), { mb: true }],   // along the coast: rows of people
  [COAST + 3.0, 'beach', t => orbit(headOf(hero), V3(0.15, 0.08, -1), -0.25, 0.2, 2.3, 2.0, 0.6, span(t, COAST + 3, COUNT)), { dof: () => headOf(hero) }],   // you in the front row
  [COUNT, 'beach', t => LOOK(0, 1.3, -5.5, 0, 1.2, 6), {}],   // 3… 2… 1… (from the water, low)
  [JUMP, 'beach', t => lerpF(LOOK(2.5, 1.2, -6, 0, 1.0, 1), LOOK(4, 3.5, -9, 0, 0.5, 0), esin(span(t, JUMP, SPLASH))), { mb: true, whip: 1 }],   // JUMP (slow motion)
  [SPLASH, 'beach', t => LOOK(-30, 18 - 4 * span(t, SPLASH, SPLASH + 2.8), -40, 0, 0, -2), { mb: true }],   // the splash along the whole coast
  [SPLASH + 2.8, 'under', t => LOOK(0, -2.2, 6 - 1.5 * span(t, SPLASH + 2.8, MACRO), 0, -1.2, -10), {}],   // under water: a forest of legs
  [MACRO, 'macro', t => lerpF(LOOK(0, 4, 26, 0, 2.5, 0), LOOK(2, 0.5, 9, 0, 0.1, 3), esin(span(t, MACRO + 1.5, SPACE - 0.5))), {}],   // the hair vs the rise
  [SPACE, 'space', t => LOOK(0, 0.3 + 0.1 * span(t, SPACE, COLD), 3.4 - 0.4 * span(t, SPACE, COLD), 0, 0, 0, 40), {}],
  [COLD, 'beach', t => LOOK(-12, 3, -16, 0, -0.2, 0), {}, 'cold'],   // November water
  [COLD + 2.4, 'beach', t => orbit(headOf(hero), V3(0.2, 0.05, -1), -0.2, 0.2, 1.4, 1.2, 0.6, span(t, COLD + 2.4, BACK)), { dof: () => headOf(hero) }, 'cold'],   // you, shivering
  [BACK, 'beach', t => LOOK(-3, 6, -15 + 2 * span(t, BACK, ENDC), 0, 0.6, 6), {}, 'back'],   // everyone trudging back
  [ENDC, 'space', t => LOOK(0, 0.4, 3.0, 0, 0, 0), {}]];
const AO = {}; function aoFor(k) { if (!AO[k]) { const S = SETS[k]; const g = new GTAOPass(S.sc, S.cam, W / 2, H / 2); g.renderToScreen = false; g.blendIntensity = 1.0;
  g.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); AO[k] = g; } return AO[k]; }
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
function applyF(cam, F) { cam.position.copy(F.pos); cam.lookAt(F.look); cam.fov = F.fov; }
function shoot(i, t, rt) { const [, k, cf, , bm] = SHOTS[i], S = SETS[k]; puffsReset();
  if (!['map', 'space', 'under', 'macro', 'hwy'].includes(k)) { S.sc.add(hero.outer); hero.outer.visible = true; } else hero.outer.visible = false;
  UPD[k](t, bm || (t >= JUMP && t < MACRO ? 'jump' : 'crowd')); pose(t, k);
  const F = cf(t); applyF(S.cam, F);
  if (k === 'map' || k === 'space') { shootTo(rt, S.sc, S.cam); return; }
  shootTo(RTS, S.sc, S.cam); const spr = []; S.sc.traverse(o => { if (o.isSprite && o.visible) { spr.push(o); o.visible = false; } }); aoFor(k).render(renderer, rt, RTS); spr.forEach(o => { o.visible = true; }); }
// ---- DOM ----
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'hud', 'stat', 'val', 'sub', 'labels', 'end', 'endT', 'endS', 'flash'].map(k => [k, $(k)]));
const CAPS = [[MAP + 0.2, ALLEN - 0.1, 'Everyone heads for the coast.'],
  [ALLEN + 0.2, ALLEN + 3.4, 'The farthest town from any ocean: <b>1,018 miles</b>.'], [ALLEN + 3.4, JAM - 0.1, '17 hours of driving.'],
  [JAM + 0.2, COAST - 0.1, 'Every road to the coast: one big parking lot.'],
  [COAST + 0.2, COAST + 3.0, '<b>12,383 miles</b> of coast.'], [COAST + 3.0, COUNT - 0.1, '5 people for every foot of it.'],
  [JUMP + 0.1, SPLASH - 0.1, 'JUMP!'], [SPLASH + 0.2, MACRO - 0.1, 'The biggest splash in history. And the sea level rises by…'],
  [MACRO + 0.3, MACRO + 3.0, '<b>0.00006 mm</b>.'], [MACRO + 3.0, SPACE - 0.1, 'About 1/1,000 of a human hair.'],
  [SPACE + 0.2, COLD - 0.1, 'The ocean is <b>63 billion</b> times heavier than all of us.'],
  [COLD + 0.2, COLD + 2.4, 'It’s November: Maine’s water is about <b>50°F</b>.'], [COLD + 2.4, BACK - 0.1, 'Cold water makes you gasp — you can’t stop it.'],
  [BACK + 0.2, ENDC - 0.1, '17 hours back to South Dakota.']];
function hudAt(t) { if (t >= MAP && t < ALLEN) return ['AMERICANS', '341,784,857', 'CENSUS, JULY 2025'];
  if (t >= ALLEN && t < JAM) return ['MILES TO THE OCEAN', fmt(1018 * (1 - smooth(ALLEN + 4, JAM, t))), 'ALLEN, SOUTH DAKOTA'];
  if (t >= COAST && t < COUNT) return ['PEOPLE PER FOOT OF COAST', t < COAST + 3 ? '' : '5.2', 'NOAA: 12,383 MI OF COASTLINE'];
  if (t >= COUNT && t < JUMP) return ['', String(Math.max(1, 3 - Math.floor((t - COUNT - 0.2) / 1.1))), ''];
  if (t >= MACRO && t < SPACE) return ['SEA LEVEL RISE · MODEL', '+0.00006 mm', '1 HAIR ≈ 0.07 mm'];
  if (t >= COLD && t < BACK) return ['WATER · MAINE, NOVEMBER', '50°F', 'BELOW 70°F = COLD WATER (NWS)'];
  return null; }
function updateDOM(t, i) {
  el.title.style.opacity = fadeWin(t, 0, MAP, 0.3);
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? 1 : 0; el.cap.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  const h = hudAt(t); el.hud.style.opacity = h ? 1 : 0; if (h) { el.stat.innerHTML = h[0] ? '<b></b>' + h[0] : ''; el.val.textContent = h[1]; el.sub.textContent = h[2];
    const big = t >= COUNT && t < JUMP; el.val.style.fontSize = big ? '260px' : ''; el.val.style.transform = big ? `scale(${pop(t, COUNT + 0.2 + 1.1 * Math.floor((t - COUNT - 0.2) / 1.1), 0.25).toFixed(3)})` : ''; el.val.style.display = 'inline-block'; }
  el.flash.style.opacity = 0.6 * Math.exp(-Math.pow((t - JUMP) / 0.08, 2));
  const lab = (x, y, txt, a) => `<div class="lb" style="left:${x}px;top:${y}px;opacity:${a.toFixed(2)}">${txt}</div>`;
  el.labels.innerHTML = t >= MACRO + 0.4 && t < SPACE ? lab(540, 560, 'ONE HUMAN HAIR · 0.07 mm', fadeWin(t, MACRO + 0.4, MACRO + 3.0, 0.25)) + lab(540, 1160, '↓ THE SEA RISES THIS MUCH ↓', fadeWin(t, MACRO + 2.6, SPACE, 0.25)) : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.35, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.1, ENDC + 0.45, t); el.endS.style.opacity = smooth(ENDC + 0.7, ENDC + 1.0, t); }
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
  compMat.uniforms.uLook.value = 0.12; compMat.uniforms.uTilt.value = 0; composite(0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await buildMap(); await buildEarth();
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (let i = 0; i < SHOTS.length; i++) shoot(i, SHOTS[i][0] + 0.3, RTA); window.renderAt(0); return true; })();
