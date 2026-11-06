// =================== timeline (62.5 s) ===================
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const S = { PLANE: 0, AWAY: 3.5, SET: 8, HALL: 11.5, BOT: 15.5, BLIZ: 19.5, ROPE: 24.5, GH: 29.5, BED: 34, WX: 38.5, AUR: 42.5, SUN: 48.5, OUTS: 55, END: 58 };
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
const shake = (t, a) => V3(a * (Math.sin(t * 13.1) + 0.5 * Math.sin(t * 29.7)), a * (Math.sin(t * 11.3 + 1) + 0.5 * Math.sin(t * 23.9)), 0);
function sunDir(h) { return V3(SUNAZ.x, 0, SUNAZ.z).normalize().multiplyScalar(Math.sqrt(1 - h * h)).setY(h); }
// environment per shot: sun height, night, aurora, whiteout, window glow, flood lights, fog
function envAt(t) {
  let h = 0.02, night = 0, aur = 0, white = 0, glow = 0, flood = 0, fogC = '#a8b4cc', fogD = 0.00012, snow = 0, wind = 0;
  if (t < S.SET) { h = 0.12; glow = 0.3; }                                                     // February: the sun circles low all day
  else if (t < S.HALL) { const u = span(t, S.SET, S.HALL); h = lerp(0.012, -0.012, u); glow = lerp(0.6, 2.2, u); fogC = '#8a8aa8'; }   // the March sunset
  else if (t < S.BLIZ) { h = -0.12; night = 1; glow = 3; }
  else if (t < S.GH) { h = -0.2; night = 1; white = 0.85; glow = 3; flood = 1; fogC = '#2c3442'; fogD = 0.012; snow = 1; wind = 22; }
  else if (t < S.AUR) { h = -0.2; night = 1; glow = 3; }
  else if (t < S.SUN) { h = -0.2; night = 1; aur = smooth(S.AUR, S.AUR + 1.5, t); glow = 3; fogC = '#070a12'; fogD = 0.00004; }
  else if (t < S.OUTS) { const u = span(t, S.SUN, S.OUTS); h = lerp(-0.03, 0.0, ease(u)); night = 1 - smooth(0, 0.6, u) * 0.7; glow = 2.5; fogC = '#6a6a8a'; }
  else { const u = span(t, S.OUTS, S.END); h = lerp(0.003, 0.012, u); night = 0.25; glow = 2.2; fogC = '#9a8aa0'; }
  const sd = sunDir(h); skyU.uSun.value.copy(sd); skyU.uNight.value = night; skyU.uAur.value = aur; skyU.uWhite.value = white; skyU.uT.value = t;
  pSun.position.copy(sd).multiplyScalar(500); pSun.target.position.set(0, 0, 0); pSun.intensity = 2.4 * smooth(-0.02, 0.03, h); pSun.color.setHSL(0.07, h > 0.06 ? 0.5 : 1, h > 0.06 ? 0.8 : 0.6);
  pHemi.intensity = lerp(0.9, 0.09, night); pHemi.color.set(night > 0.5 ? '#3a4a78' : '#9fb4e0'); pMoon.intensity = 0.35 * night * (1 - white) + (aur > 0 ? 0.12 * aur : 0); pMoon.color.set(aur > 0 ? '#7ad8ff' : '#6a8cff');
  winGlow.emissiveIntensity = glow; FLOOD.forEach(L => L.intensity = 900 * flood); pw.fog.color.set(fogC); pw.fog.density = fogD;
  REDL.forEach((l, i) => l.visible = Math.sin(t * 3.1 + i) > -0.2); TURB.forEach((hb, i) => hb.rotation.z = t * (snow ? 3.2 : 0.6) + i);
  return { snow, wind, night };
}
const EYE = 1.62; let SNOWC = null;
function hideAll() { roomLights.forEach(L => L.intensity = 14); auroraFill.intensity = 0; GL.userData.wrist.rotation.set(0, 0, 0); GR.userData.wrist.rotation.set(0, 0, 0); SNOWC = null;
  heroIn.outer.visible = heroOut.outer.visible = false; GL.visible = GR.visible = false; BOT.visible = false; WEND[0].visible = true; frost.material.opacity = 0; PLANE.visible = planeCloud.visible = false; }
function gloveAt(g, cam, off, rot) { g.visible = true; g.position.copy(cam.localToWorld(off.clone())); g.quaternion.copy(cam.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z))); }
function handsOnGlass(p, t, lift = 0) { for (const [g, sx] of [[GL, -1], [GR, 1]]) { g.visible = true; g.position.set(p.x - 0.02 + sx * 0.15, FL + EYE - 0.24 - lift + 0.006 * Math.sin(t * 1.3 + sx), RZ1 + 0.1); g.rotation.set(0.08, 0, -sx * 0.22); g.userData.wrist.rotation.set(-1.05, 0, sx * 0.25); } }
const heroHead = () => (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0)));
// ---- shots ----
function shotAt(t) { hideAll(); const c = pCam; c.near = 0.05; c.far = 60000; dof(c, 1, 0);
  if (t < S.AWAY) { // POV at the mess-hall window: the last plane takes off across the snow
    WEND[0].visible = false; PLANE.visible = planeCloud.visible = true; planeAt(t, -0.4); const u = ease(span(t, 0, S.AWAY)); const p = V3(1.25 + 0.06 * u, FL + EYE, RZ1 + lerp(1.5, 1.05, u)).add(shake(t, 0.004));
    LOOKC(c, p, V3(p.x + 30 - 50 * u, FL + EYE - 4, -400), lerp(52, 46, u)); c.updateMatrixWorld(); handsOnGlass(p, t); frost.material.opacity = 0.15; dof(c, 0.9, 3); return 1.0; }
  if (t < S.SET) { // exterior: the plane climbs away over the station, the camera arcs and tilts after it
    PLANE.visible = planeCloud.visible = true; planeAt(t, -0.4); const u = ease(span(t, S.AWAY, S.SET));
    LOOKC(c, V3(lerp(14, 4, u), lerp(15, 21, u), lerp(95, 82, u)), PLANE.position.clone().add(V3(0, 4, 0)).lerp(V3(0, 8, 0), 0.35), lerp(48, 44, u)); c.near = 0.5; return 1.1; }
  if (t < S.HALL) { // the March sunset at the ceremonial pole; our hero watches it go
    heroBase(POLE.x - 1.4, POLE.z - 0.8, Math.atan2(SUNAZ.x, SUNAZ.z)); poseIdle(hero, t, 0); hero.face('sad', t); const u = ease(span(t, S.SET, S.HALL)); const hd = heroHead(); const hp = hero.outer.position;
    const perp = V3(-SUNAZ.z, 0, SUNAZ.x).normalize(); const p = hd.clone().add(perp.clone().multiplyScalar(lerp(2.6, 2.1, u))).add(V3(SUNAZ.x, 0, SUNAZ.z).multiplyScalar(lerp(-0.9, -0.5, u))).add(V3(0, lerp(-0.1, 0.05, u), 0)); LOOKC(c, p, hd.clone().add(V3(SUNAZ.x, -0.3, SUNAZ.z).multiplyScalar(0.35)), 44); dof(c, p.distanceTo(hd), 2.5); return 1.15; }
  if (t < S.BOT) { WEND[0].visible = false; // the empty mess hall: dolly along the tables to the note
    const u = ease(span(t, S.HALL, S.BOT)); const p = V3(lerp(-0.2, -1.6, u), FL + lerp(1.55, 1.15, u), lerp(-24, -43.4, u)); LOOKC(c, p, V3(-2.1, FL + 0.78, -44.5).lerp(V3(0, FL + 1.0, -50), 1 - u), lerp(50, 38, u));
    roomLights.forEach((L, i) => L.intensity = i === 3 || i === 4 ? 14 : 3); dof(c, p.distanceTo(V3(-2.1, FL + 0.78, -44.5)), lerp(2, 9, u)); return 0.8; }
  if (t < S.BLIZ) { WEND[0].visible = false; BOT.visible = true; // the robot vacuum rolls up to you; POV looking down, a glove reaches for it
    const tm = S.BOT + 2;
    if (t < tm) { const u = span(t, S.BOT, tm); const bp = V3(lerp(-0.3, 0.0, u), FL, lerp(-47.5, -41.3, ease(u))); botAt(bp, 0.15 * Math.sin(t * 2.5), t); const p = V3(0.25, FL + 0.14, lerp(-39.6, -39.9, u)); LOOKC(c, p, bp.clone().add(V3(0, 0.08, 0)), 44);
      roomLights.forEach((L, i) => L.intensity = i === 3 ? 6 : 2); dof(c, p.distanceTo(bp), 4); return 0.85; }
    const u = ease(span(t, tm, S.BLIZ)); const bp = V3(0, FL, -40.75); botAt(bp, 0.25 * Math.sin(t * 2) * (1 - u), t); const p = V3(0.0, FL + EYE, -40.2); LOOKC(c, p, V3(0, FL, -41.0), 58); c.updateMatrixWorld();
    gloveAt(GR, c, V3(0.14 - 0.06 * u, -0.34 + 0.08 * u, -0.62 - 0.25 * u), V3(-1.2 + 0.4 * u, 0.2, 0.15)); dof(c, 1.6, 3); return 1.0; }
  if (t < S.ROPE) { const tm = S.BLIZ + 2.5; if (t < tm) { // the blizzard in the polar night — the station in floodlights, snow streaks
      const u = span(t, S.BLIZ, tm); LOOKC(c, V3(lerp(-55, -48, u), 6, lerp(60, 52, u)).add(shake(t, 0.08)), V3(0, 8, 0), 52); c.near = 0.2; return 1.5; }
    WEND[0].visible = false; const u = span(t, tm, S.ROPE); const p = V3(1.6, FL + 1.45, RZ1 + 5.0 - 0.6 * u).add(shake(t, 0.006)); LOOKC(c, p, V3(0.6, FL + 1.7, RZ1 - 10), 50); frost.material.opacity = lerp(0.35, 0.8, u); SNOWC = V3(p.x, p.y, RZ1 - 27.5);
    roomLights.forEach((L, i) => L.intensity = (i > 2 ? 8 : 2) * (Math.sin(t * 37 + i) > 0.92 ? 0.3 : 1)); dof(c, 5, 2); return 0.85; }
  if (t < S.GH) { const tm = S.ROPE + 2.5; const dir = ROPE_B.clone().sub(ROPE_A).normalize(), side = V3(dir.z, 0, -dir.x);
    if (t < tm) { // our hero on the rope line, bent into the wind
      const u = span(t, S.ROPE, tm), k = 0.22 + 0.12 * u; const fp = ROPE_A.clone().lerp(ROPE_B, k); heroBase(fp.x + side.x * 0.45, fp.z + side.z * 0.45, Math.atan2(dir.x, dir.z)); poseWalk(hero, t * 0.9); hero.outer.rotation.x = 0.2;
      hero.arms[1].rotation.set(-0.6, 0, 0.35); hero.elbows[1].rotation.x = -0.5; hero.face('worried', t); const back = ROPE_A.clone().lerp(ROPE_B, k - 0.12);
      const p = back.add(side.clone().multiplyScalar(2.2)).add(V3(0, 2.0, 0)).add(shake(t, 0.05)); LOOKC(c, p, V3(hero.outer.position.x, 1.5, hero.outer.position.z), 42); dof(c, p.distanceTo(heroHead()), 2); return 1.6; }
    const u = span(t, tm, S.GH), k = 0.45 + 0.08 * u; const rp = ROPE_A.clone().lerp(ROPE_B, k);   // POV: your gloves on the rope, the next post vanishing in white
    const p = rp.clone().add(side.clone().multiplyScalar(0.35)).add(V3(0, 0.4 + EYE - 0.1, 0)).add(shake(t, 0.03)); LOOKC(c, p, rp.clone().add(dir.clone().multiplyScalar(8)).add(V3(0, 1.0, 0)), 56); c.updateMatrixWorld();
    GR.visible = true; GR.position.copy(rp).add(V3(0, 1.5, 0)).add(dir.clone().multiplyScalar(0.55)); GR.lookAt(GR.position.clone().add(side)); GR.rotateZ(Math.PI / 2); GR.rotateX(-0.3);
    GL.visible = true; GL.position.copy(rp).add(V3(0, 1.48, 0)).add(dir.clone().multiplyScalar(0.9)); GL.lookAt(GL.position.clone().add(side)); GL.rotateZ(Math.PI / 2); GL.rotateX(0.3); return 1.6; }
  if (t < S.BED) { // the greenhouse: our hero (hood down) walks between the lettuce racks, picks a tomato
    const u = ease(span(t, S.GH, S.BED)); heroBase(6000 + 0.05, lerp(1.6, 0.4, u), Math.PI, true); hero.outer.position.y = 0.95; poseWalk(hero, t * 0.8, 1 - smooth(0.6, 0.85, u)); hero.face(u > 0.7 ? 'happy' : 'neutral', t);
    if (u > 0.7) { const k = smooth(0.7, 0.9, u); hero.arms[1].rotation.set(-0.55 * k, 0, 0.25); hero.elbows[1].rotation.x = -0.9 * k; }
    const hd = heroHead(); const p = V3(6000 + lerp(0.55, 0.35, u), lerp(1.3, 1.5, u), lerp(-2.6, -1.4, u)); LOOKC(c, p, hd.clone().add(V3(0, -0.15, 0)), 40); dof(c, p.distanceTo(hd), 5); return 0.8; }
  if (t < S.WX) { // 3:12 AM, lying awake; the robot's eyes glow by the bed
    BOT.visible = true; botAt(V3(4000 - 0.1, 0, 0.0), Math.PI * 0.85, t); const u = ease(span(t, S.BED, S.WX)); const p = V3(4000 - 0.55 + 0.05 * u, 0.93, 0.6 - 0.08 * u); const lk = V3(4000.3, 0.55, -0.16).lerp(V3(4000 - 0.1, 0.1, 0.0), smooth(0.55, 0.95, u)); LOOKC(c, p, lk, 36);
    dof(c, p.distanceTo(lk), 6); return 1.4; }
  if (t < S.AUR) { // the weather screen: −104 °F
    WEND[0].visible = false; frost.material.opacity = 0.9; const u = ease(span(t, S.WX, S.AUR)); const p = V3(lerp(-3.2, -4.6, u), FL + 1.72, lerp(-42.8, -44.4, u)); LOOKC(c, p, V3(-RX, FL + 1.75, -45), lerp(44, 36, u));
    roomLights.forEach((L, i) => L.intensity = i === 4 ? 4 : 2); dof(c, p.distanceTo(V3(-RX, FL + 1.75, -45)), 6); return 0.9; }
  if (t < S.SUN) { // the southern lights: our hero stands on the snow, the camera cranes up from low behind him to the sky
    heroBase(-20, -95, Math.PI * 0.95); poseIdle(hero, t, 0); hero.head.rotation.x = -0.35 * smooth(S.AUR, S.AUR + 2, t); hero.face('surprised', t); auroraFill.intensity = 35; pMoon.intensity = 0.12; const u = ease(span(t, S.AUR, S.SUN));
    LOOKC(c, V3(-17.5, lerp(1.0, 4.5, u), -88 + 2 * u), V3(-21, lerp(2.0, 16, u), -110), lerp(50, 64, u)); c.near = 0.1; dof(c, 7.5, lerp(2.5, 0, u)); return 1.9; }
  if (t < S.OUTS) { // D-0: the same window — a gold line on the horizon; the robot at your feet
    WEND[0].visible = false; const u = ease(span(t, S.SUN, S.OUTS)); const p = V3(1.25, FL + EYE, RZ1 + lerp(1.6, 1.1, u)).add(shake(t, 0.003)); LOOKC(c, p, V3(p.x - 8, FL + EYE - 2.5, -400), lerp(48, 44, u)); c.updateMatrixWorld();
    handsOnGlass(p, t, lerp(0.12, 0, smooth(0.1, 0.5, u))); BOT.visible = true; botAt(V3(1.6, FL, RZ1 + 0.7), Math.PI * 1.1, t); frost.material.opacity = lerp(0.6, 0.15, u); dof(c, 0.95, 2.5); return 1.1; }
  // outside: the first sun in six months over the plateau; our hero at the pole, the camera arcs round to the sun
  heroBase(POLE.x - 1.4, POLE.z - 0.8, Math.atan2(SUNAZ.x, SUNAZ.z)); poseIdle(hero, t, 0); hero.face(t < S.OUTS + 1.2 ? 'surprised' : 'happy', t); hero.head.rotation.x = -0.12;
  const u = ease(span(t, S.OUTS, S.END)); const hd = heroHead(), sun = V3(SUNAZ.x, 0, SUNAZ.z).normalize(), perp = V3(-sun.z, 0, sun.x); const p = hd.clone().add(sun.clone().multiplyScalar(lerp(2.6, 2.0, u))).add(perp.clone().multiplyScalar(lerp(0.9, 0.5, u))).add(V3(0, lerp(-0.25, -0.1, u), 0));
  LOOKC(c, p, hd.clone().add(V3(0, -0.12, 0)), 42); dof(c, p.distanceTo(hd), 2.5); return 1.1;
}
// ---- text (series style: title fades, captions pop) ----
const CAPS = [[0.2, 3.4, 'The last plane just left.'], [3.6, 7.9, 'The next one lands in <b>November</b>.'], [8.1, 11.4, 'Next month, the sun sets.<br>For <b>6 months</b>.'], [11.6, 15.4, 'Everyone else is gone.<br>It’s just you.'],
  [15.6, 19.4, 'Dogs are banned in Antarctica since 1994.<br>So this is your crew.'], [19.6, 24.4, 'Gusts up to <b>54 mph</b>.'], [24.6, 29.4, 'Some days you can’t see<br>a <b>quarter mile</b>.'],
  [29.6, 33.9, 'The greenhouse: the only<br><b>fresh food</b> all winter.'], [34.1, 38.4, 'No sunrise. No sunset.<br>Your sleep falls apart.'], [38.6, 42.4, 'Outside: below <b>−100°F</b>.'], [42.8, 48.4, 'But you get this.<br>The <b>southern lights</b>.'],
  [48.8, 54.9, '6 months later…'], [55.1, 57.9, 'The sun is <b>back</b>.']];
const DAY = t => t < S.SET ? 219 : t < S.HALL ? 186 : t < S.BLIZ ? 180 : t < S.GH ? 150 : t < S.BED ? 120 : t < S.WX ? 90 : t < S.AUR ? 75 : t < S.SUN ? 60 : Math.max(0, 3 - Math.floor(span(t, S.SUN + 0.3, S.SUN + 2.6) * 3.999));
const DUMP = [S.SET, S.HALL, S.BLIZ, S.GH, S.BED, S.WX, S.AUR, S.SUN + 0.3, S.SUN + 0.88, S.SUN + 1.45, S.SUN + 2.03];
const pop = (t, a, d) => 1 + 0.08 * Math.max(0, 1 - (t - a) / d) * (t >= a ? 1 : 0);
function text(t) {
  $('title').style.opacity = smooth(0.1, 0.5, t) * (1 - smooth(3.0, 3.4, t));
  const d = DAY(t); $('stat').innerHTML = '<b></b>SUNRISE IN'; $('val').textContent = d === 0 ? 'TODAY' : d + (d === 1 ? ' DAY' : ' DAYS'); $('sub').textContent = 'SOUTH POLE · 90°S · 9,300 FT';
  let pp = 0; for (const k of DUMP) pp += Math.max(0, 1 - Math.abs(t - k - 0.08) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pp})`; $('val').style.color = d === 0 ? '#ffb048' : '#fff';
  $('hud').style.opacity = smooth(3.4, 3.8, t) * (1 - smooth(S.END - 0.4, S.END, t));
  const cp = CAPS.find(([a, b]) => t >= a && t < b), el = $('cap'); el.innerHTML = cp ? cp[2] : ''; el.style.opacity = cp ? 1 - smooth(cp[1] - 0.15, cp[1], t) : 0; el.style.transform = cp ? `scale(${pop(t, cp[0], 0.22).toFixed(3)})` : '';
  $('end').style.opacity = smooth(S.END, S.END + 0.5, t); $('endT').style.opacity = smooth(S.END + 0.3, S.END + 0.9, t); $('endS').style.opacity = smooth(S.END + 0.8, S.END + 1.4, t);
}
// ---- render: GTAO on the indoor shots, depth of field from the depth buffer, sub-frame motion blur on the fast shots, a rim light that follows the hero ----
const DOFP = { f: 2, a: 0 }; function dof(cam, focus, amt) { DOFP.f = focus; DOFP.a = amt; }
const rim = new THREE.PointLight(0xcfe0ff, 0, 6, 1.5); pw.add(rim);
const AOP = new GTAOPass(pw, pCam, W / 2, H / 2); AOP.renderToScreen = false; AOP.blendIntensity = 1.0;
AOP.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.5, scale: 1.0, samples: 12 }); AOP.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
const RTS = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const RTD = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.FloatType) });
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
const SHOT_T = Object.values(S).sort((a, b) => a - b);
const shotStart = t => { let s0 = 0; for (const k of SHOT_T) if (t >= k) s0 = k; return Math.max(s0, [S.BOT + 2, S.BLIZ + 2.5, S.ROPE + 2.5].filter(k => t >= k).pop() || 0); };
const INDOOR = t => (t >= S.HALL && t < S.BLIZ) || (t >= S.BLIZ + 2.5 && t < S.ROPE) || (t >= S.GH && t < S.AUR);
const FAST = t => (t >= S.AWAY && t < S.SET) || (t >= S.BLIZ && t < S.BLIZ + 2.5) || (t >= S.ROPE && t < S.ROPE + 2.5);
function heroRim(t) { if (!heroIn.outer.visible && !heroOut.outer.visible) { rim.intensity = 0; return; } const hd = heroHead(), cp = pCam.position; const back = hd.clone().sub(cp).setY(0).normalize();
  rim.position.copy(hd).add(back.multiplyScalar(1.1)).add(V3(0, 0.45, 0)); rim.intensity = 9; rim.color.set(INDOOR(t) ? '#ffd8b0' : '#cfe0ff'); }
let lastExp = 1, lastDepth = null;
function aimShadow(near) { const sc = pSun.shadow.camera, r = near ? 7 : 120; if (sc.right !== r) { Object.assign(sc, { left: -r, right: r, top: r, bottom: -r }); sc.updateProjectionMatrix(); }
  pSun.shadow.normalBias = near ? 0.02 : 0.05; pSun.shadow.bias = near ? -0.0002 : -0.0005;
  if (near) { const hp = hero.outer.position; pSun.target.position.set(hp.x, 0, hp.z); pSun.position.copy(skyU.uSun.value).setY(Math.max(skyU.uSun.value.y, 0.25)).normalize().multiplyScalar(60).add(pSun.target.position); } }
function shoot(t, rt) { const env = envAt(t); lastExp = shotAt(t); aimShadow(hero.outer.visible); if (!INDOOR(t) && hero.outer.visible) { pCam.near = Math.max(pCam.near, 0.4); } heroRim(t); snowAt(t, pCam, env.wind, env.snow, SNOWC);
  if (INDOOR(t)) { pCam.far = 3000; pCam.near = 0.05; shootTo(RTS, pw, pCam); AOP.render(renderer, rt, RTS); lastDepth = AOP.depthTexture; }
  else { shootTo(RTD, pw, pCam); lastDepth = RTD.depthTexture; renderer.setRenderTarget(rt); accMat.uniforms.tSrc.value = RTD.texture; accMat.uniforms.uW.value = 1; renderer.setClearColor(0, 1); renderer.clear(); renderer.render(accSc, compCam); } }
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= S.END + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#120e16', 1); renderer.clear(); return true; }
  let src = RTA;
  if (FAST(t)) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear(); const s0 = shotStart(t);
    for (let j = 0; j < MB_K; j++) { const ts = Math.max(s0, t + (j / (MB_K - 1) - 0.5) * SHUTTER); shoot(ts, RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; shoot(t, RTA); }
  else { shoot(t, RTA); if (DOFP.a > 0.01) { dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = lastDepth; dofMat.uniforms.uNear.value = pCam.near; dofMat.uniforms.uFar.value = pCam.far; dofMat.uniforms.uFocus.value = DOFP.f; dofMat.uniforms.uAmt.value = DOFP.a * 3;
      renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; } }
  let dip = 1; for (const k of [S.HALL, S.BLIZ, S.GH, S.BED, S.AUR, S.SUN, S.OUTS]) dip = Math.min(dip, smooth(0, 0.35, Math.abs(t - k)));
  const u = compMat.uniforms; u.tA.value = src.texture; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uT.value = t; u.uSepia.value = 0; u.uLook.value = 0.12; u.uTilt.value = 0;
  composite(0, lastExp * dip, 1); u.tA.value = RTA.texture; return true;
};
window.DBG = { heroIn, heroOut, THREE, pw, pCam, ST, ROOM, GL, GR, BOT, WEND, glass, frost }; window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
