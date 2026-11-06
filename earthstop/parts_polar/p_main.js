// =================== timeline ===================
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const S = { WIN: 0, EXT: 3.5, HALL: 7.5, BOT: 11, BLIZ: 15, ROPE: 20, BED: 25, WX: 29, AUR: 33, SUN: 38, END: 43 };
const T_END = 46.5;
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
const shake = (t, a) => V3(a * (Math.sin(t * 13.1) + 0.5 * Math.sin(t * 29.7)), a * (Math.sin(t * 11.3 + 1) + 0.5 * Math.sin(t * 23.9)), 0);
function sunDir(h) { return V3(SUNAZ.x, 0, SUNAZ.z).normalize().multiplyScalar(Math.sqrt(1 - h * h)).setY(h); }
// environment per shot: sun height, night, aurora, whiteout, window glow, flood lights, fog
function envAt(t) {
  let h = 0.02, night = 0, aur = 0, white = 0, glow = 0, flood = 0, fogC = '#8fa0bc', fogD = 0.00012, snow = 0, wind = 0;
  if (t < S.EXT) { h = lerp(0.018, 0.002, span(t, 0, S.EXT)); glow = 0.4; }
  else if (t < S.HALL) { const u = span(t, S.EXT, S.HALL); h = lerp(-0.004, -0.07, u); glow = lerp(0.6, 3.0, smooth(0, 0.6, u)); night = smooth(0.4, 1, u) * 0.5; fogC = '#5a6684'; }
  else if (t < S.BLIZ) { h = -0.12; night = 1; glow = 3; }
  else if (t < S.BED) { h = -0.2; night = 1; white = 0.85; glow = 3; flood = 1; fogC = '#2c3442'; fogD = 0.012; snow = 1; wind = 22; }
  else if (t < S.AUR) { h = -0.2; night = 1; glow = 3; }
  else if (t < S.SUN) { h = -0.2; night = 1; aur = smooth(S.AUR, S.AUR + 1.5, t); glow = 3; fogC = '#070a12'; fogD = 0.00004; }
  else { const u = span(t, S.SUN, S.END); h = lerp(-0.03, 0.012, ease(u)); night = 1 - smooth(0, 0.5, u) * 0.7; glow = 2.5; fogC = '#6a6a8a'; }
  const sd = sunDir(h); skyU.uSun.value.copy(sd); skyU.uNight.value = night; skyU.uAur.value = aur; skyU.uWhite.value = white; skyU.uT.value = t;
  pSun.position.copy(sd).multiplyScalar(500); pSun.target.position.set(0, 0, 0); pSun.intensity = 2.4 * smooth(-0.02, 0.02, h); pSun.color.setHSL(0.07, 1, 0.6);
  pHemi.intensity = lerp(0.9, 0.09, night); pHemi.color.set(night > 0.5 ? '#3a4a78' : '#9fb4e0'); pMoon.intensity = 0.35 * night * (1 - white) + (aur > 0 ? 0.12 * aur : 0); pMoon.color.set(aur > 0 ? '#7ad8ff' : '#6a8cff');
  winGlow.emissiveIntensity = glow; FLOOD.forEach(L => L.intensity = 900 * flood); pw.fog.color.set(fogC); pw.fog.density = fogD;
  REDL.forEach((l, i) => l.visible = Math.sin(t * 3.1 + i) > -0.2); TURB.forEach((hb, i) => hb.rotation.z = t * (snow ? 3.2 : 0.6) + i);
  return { snow, wind, night };
}
// ---- the figure / gloves / robot per shot ----
function hideAll() { roomLights.forEach(L => L.intensity = 14); auroraFill.intensity = 0; GL.userData.wrist.rotation.set(0, 0, 0); GR.userData.wrist.rotation.set(0, 0, 0); SNOWC = null; fig.outer.visible = false; GL.visible = GR.visible = false; BOT.visible = false; WEND[0].visible = true; frost.material.opacity = 0; }
function gloveAt(g, cam, off, rot) { g.visible = true; g.position.copy(cam.localToWorld(off.clone())); g.quaternion.copy(cam.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.x, rot.y, rot.z))); }
const EYE = 1.62; let SNOWC = null;
// ---- cameras ----
function shotAt(t, env) { hideAll(); const c = pCam; c.near = 0.05; c.far = 60000; dof(c, 1, 0); let exp = 1;
  if (t < S.EXT) { // POV at the mess-hall window, two gloved hands on the glass, the last sun sinking over the sea ice
    WEND[0].visible = false; const u = ease(span(t, 0, S.EXT)); const p = V3(1.25 + 0.06 * u, FL + EYE, RZ1 + lerp(1.5, 1.05, u)).add(shake(t, 0.004)); LOOKC(c, p, V3(p.x - 8, FL + EYE - 2.5, -400), lerp(52, 46, u)); c.updateMatrixWorld();
    for (const [g, sx] of [[GL, -1], [GR, 1]]) { g.visible = true; g.position.set(p.x - 0.02 + sx * 0.15, FL + EYE - 0.24 + 0.006 * Math.sin(t * 1.3 + sx), RZ1 + 0.1); g.rotation.set(0.08, 0, -sx * 0.22); g.userData.wrist.rotation.set(-1.05, 0, sx * 0.25); }
    frost.material.opacity = 0.25; dof(c, 0.9, 3); exp = 1.05; return exp; }
  if (t < S.HALL) { // exterior: a slow arc around the station as the last light dies and the windows come on
    const u = ease(span(t, S.EXT, S.HALL)), a = lerp(-0.35, 0.25, u), r = lerp(150, 120, u); LOOKC(c, V3(Math.sin(a) * r, lerp(26, 18, u), -Math.cos(a) * r - 40), V3(0, 6, -10), 46); c.near = 0.5; exp = 1.2; return exp; }
  if (t < S.BOT) { WEND[0].visible = false; // the empty mess hall: dolly along the tables (23 chairs) to the note
    const u = ease(span(t, S.HALL, S.BOT)); const p = V3(lerp(-0.2, -1.6, u), FL + lerp(1.55, 1.15, u), lerp(-24, -43.4, u)); LOOKC(c, p, V3(-2.1, FL + 0.78, -44.5).lerp(V3(0, FL + 1.0, -50), 1 - u), lerp(50, 38, u));
    roomLights.forEach((L, i) => L.intensity = i === 3 || i === 4 ? 14 : 3); dof(c, p.distanceTo(V3(-2.1, FL + 0.78, -44.5)), lerp(2, 9, u)); exp = 0.8; return exp; }
  if (t < S.BLIZ) { // the robot vacuum rolls between the chairs and up to you; POV looking down, a glove reaches for it
    WEND[0].visible = false; BOT.visible = true; if (t < 13) { const u = span(t, S.BOT, 13); const bp = V3(lerp(-0.3, 0.0, u), FL, lerp(-47.5, -41.3, ease(u))); botAt(bp, 0.15 * Math.sin(t * 2.5), t); const p = V3(0.25, FL + 0.14, lerp(-39.6, -39.9, u)); LOOKC(c, p, bp.clone().add(V3(0, 0.08, 0)), 44); roomLights.forEach((L, i) => L.intensity = i === 3 ? 6 : 2); dof(c, p.distanceTo(bp), 4); exp = 0.85; return exp; }
    const u = ease(span(t, 13, S.BLIZ)); const bp = V3(0, FL, -40.75); botAt(bp, 0.25 * Math.sin(t * 2) * (1 - u), t); const p = V3(0.0, FL + EYE, -40.2); LOOKC(c, p, V3(0, FL, -41.0), 58); c.updateMatrixWorld();
    gloveAt(GR, c, V3(0.14 - 0.06 * u, -0.34 + 0.08 * u, -0.62 - 0.25 * u), V3(-1.2 + 0.4 * u, 0.2, 0.15)); dof(c, 1.6, 3); exp = 1.0; return exp; }
  if (t < S.ROPE) { if (t < 17.5) { // D-80: the blizzard in the polar night — the station in floodlights, snow streaks
      const u = span(t, S.BLIZ, 17.5); LOOKC(c, V3(lerp(-55, -48, u), 6, lerp(60, 52, u)).add(shake(t, 0.08)), V3(0, 8, 0), 52); c.near = 0.2; exp = 1.5; return exp; }
    // from inside: the window is white noise, frost spreads, the lamps flicker
    WEND[0].visible = false; const u = span(t, 17.5, S.ROPE); const p = V3(1.6, FL + 1.45, RZ1 + 5.0 - 0.6 * u).add(shake(t, 0.006)); LOOKC(c, p, V3(0.6, FL + 1.7, RZ1 - 10), 50); frost.material.opacity = lerp(0.35, 0.8, u); SNOWC = V3(p.x, p.y, RZ1 - 27.5);
    roomLights.forEach((L, i) => L.intensity = (i > 2 ? 8 : 2) * (Math.sin(t * 37 + i) > 0.92 ? 0.3 : 1)); dof(c, 5, 2); exp = 0.85; return exp; }
  if (t < S.BED) { // the rope line: a tiny red figure from behind, then POV: your glove on the rope, the next post vanishing in white
    if (t < 22.5) { const u = span(t, S.ROPE, 22.5), k = 0.22 + 0.12 * u; const fp = ROPE_A.clone().lerp(ROPE_B, k); fig.outer.visible = true; fig.outer.position.set(fp.x + 0.45, 0.35, fp.z); fig.outer.rotation.y = Math.atan2(ROPE_B.x - ROPE_A.x, ROPE_B.z - ROPE_A.z);
      poseWalk(fig, t * 0.9); fig.outer.rotation.x = 0.18; const back = ROPE_A.clone().lerp(ROPE_B, k - 0.14); LOOKC(c, back.add(V3(2.5, 2.2, 0)).add(shake(t, 0.05)), fp.clone().add(V3(0, 1.0, 0)), 42); dof(c, 9, 2); exp = 1.6; return exp; }
    const u = span(t, 22.5, S.BED), k = 0.45 + 0.08 * u; const rp = ROPE_A.clone().lerp(ROPE_B, k); const dir = ROPE_B.clone().sub(ROPE_A).normalize(); const side = V3(dir.z, 0, -dir.x);
    const p = rp.clone().add(side.clone().multiplyScalar(0.35)).add(V3(0, 0.4 + EYE - 0.1, 0)).add(shake(t, 0.03)); LOOKC(c, p, rp.clone().add(dir.clone().multiplyScalar(8)).add(V3(0, 1.0, 0)), 56); c.updateMatrixWorld();
    GR.visible = true; GR.position.copy(rp).add(V3(0, 1.5, 0)).add(dir.clone().multiplyScalar(0.55)); GR.lookAt(GR.position.clone().add(side)); GR.rotateZ(Math.PI / 2); GR.rotateX(-0.3);
    GL.visible = true; GL.position.copy(rp).add(V3(0, 1.48, 0)).add(dir.clone().multiplyScalar(0.9)); GL.lookAt(GL.position.clone().add(side)); GL.rotateZ(Math.PI / 2); GL.rotateX(0.3); exp = 1.6; return exp; }
  if (t < S.WX) { // D-60: 3:12 AM, lying awake; the robot's eyes glow by the bed
    BOT.visible = true; botAt(V3(4000 - 0.1, 0, 0.0), Math.PI * 0.85, t); const u = ease(span(t, S.BED, S.WX)); const p = V3(4000 - 0.55 + 0.05 * u, 0.93, 0.6 - 0.08 * u); const lk = V3(4000.3, 0.55, -0.16).lerp(V3(4000 - 0.1, 0.1, 0.0), smooth(0.55, 0.95, u)); LOOKC(c, p, lk, 36);
    dof(c, p.distanceTo(lk), 6); exp = 1.4; return exp; }
  if (t < S.AUR) { // the weather screen: −34 °C; slow push past the frosted window
    WEND[0].visible = false; frost.material.opacity = 0.9; const u = ease(span(t, S.WX, S.AUR)); const p = V3(lerp(-3.2, -4.6, u), FL + 1.72, lerp(-42.8, -44.4, u)); LOOKC(c, p, V3(-RX, FL + 1.75, -45), lerp(44, 36, u)); roomLights.forEach((L, i) => L.intensity = i === 4 ? 4 : 2); dof(c, p.distanceTo(V3(-RX, FL + 1.75, -45)), 6); exp = 0.9; return exp; }
  if (t < S.SUN) { // aurora: the figure stands on the snow; the camera cranes up from low behind him to the sky
    fig.outer.visible = true; auroraFill.intensity = 35; pMoon.intensity = 0.12; fig.outer.position.set(-20, 0.35, -95); fig.outer.rotation.set(0, Math.PI * 0.95, 0); poseIdle(fig, t); const u = ease(span(t, S.AUR, S.SUN));
    LOOKC(c, V3(-15.5, lerp(1.0, 4.5, u), -82 + 2 * u), V3(-21, lerp(2.2, 16, u), -110), lerp(52, 64, u)); c.near = 0.1; dof(c, 13.5, lerp(2.5, 0, u)); exp = 1.9; return exp; }
  // D-0: the same window — a gold line, then the first sun in 94 days; the robot at your feet
  WEND[0].visible = false; const u = ease(span(t, S.SUN, S.END)); const p = V3(1.25, FL + EYE, RZ1 + lerp(1.6, 1.1, u)).add(shake(t, 0.003)); LOOKC(c, p, V3(p.x - 8, FL + EYE - 2.5, -400), lerp(48, 44, u)); c.updateMatrixWorld();
  for (const [g, sx] of [[GL, -1], [GR, 1]]) { g.visible = true; g.position.set(p.x - 0.02 + sx * 0.15, FL + EYE - lerp(0.36, 0.24, smooth(0.1, 0.5, u)), RZ1 + 0.1); g.rotation.set(0.08, 0, -sx * 0.22); g.userData.wrist.rotation.set(-1.05, 0, sx * 0.25); }
  BOT.visible = true; botAt(V3(1.6, FL, RZ1 + 0.7), Math.PI * 1.1, t); frost.material.opacity = lerp(0.6, 0.15, u); dof(c, 0.95, 2.5); exp = 1.1; return exp;
}
// ---- text ----
const TITLE = ['만약', '남극', '<span class="hl">장보고기지</span>에', '<br>', '<span class="hl">극야</span>', '동안', '혼자', '남는다면?'];
const CAPS = [[0.3, 3.4, '오늘 <span class="hl">마지막 해</span>가 집니다'], [3.6, 7.4, '다음 해는 <span class="hl">94일</span> 뒤에 뜹니다'], [7.6, 10.9, '월동대는 떠났고,<br>당신만 남았습니다'],
  [11.1, 15.0, '남극엔 1994년부터 개를 못 데려옵니다<br>그래서 동료는 <span class="hl">이 녀석</span>'], [15.2, 19.9, '순간 풍속 <span class="hl">초속 41m</span><br>시속 148km'], [20.1, 24.9, '눈보라 속에선<br>한 치 앞도 안 보입니다'],
  [25.1, 28.9, '극야 초반, 월동대원의 잠은<br>실제로 <span class="hl">나빠집니다</span>'], [29.1, 32.9, '기록된 최저 기온<br><span class="hl">−34°C</span>'], [33.4, 37.9, '그 대신, 남극의 <span class="hl">오로라</span>'], [38.6, 42.9, '<span class="hl">94일</span> 만에 첫 해']];
const DAY = t => t < S.BLIZ ? 94 : t < S.BED ? 80 : t < S.WX ? 60 : t < S.AUR ? 52 : t < S.SUN ? 45 : Math.max(0, 3 - Math.floor(span(t, S.SUN, S.SUN + 2.2) * 3.999));
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
function text(t) {
  const tt = $('title');
  if (!tt.dataset.ok) { let k = 0; tt.innerHTML = TITLE.map(w => w === '<br>' ? '<br>' : `<span class="w" data-i="${k++}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.2 - i * 0.12) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(3.0, 3.4, t);
  const d = DAY(t); $('lab').innerHTML = '<b></b>해 뜨기까지'; $('val').textContent = 'D-' + d; $('sub').textContent = '장보고과학기지 · 남위 74.6°';
  const cuts = [S.BLIZ, S.BED, S.WX, S.AUR, S.SUN, S.SUN + 0.55, S.SUN + 1.1, S.SUN + 1.65]; let pop = 0; for (const k of cuts) pop += Math.max(0, 1 - Math.abs(t - k - 0.08) / 0.25);
  $('val').style.transform = `scale(${1 + 0.14 * pop})`; $('val').style.transformOrigin = 'left center'; $('val').style.color = d === 0 ? '#ffcf7a' : '#fff';
  $('big').style.opacity = 0; $('hud').style.opacity = smooth(0.1, 0.4, t) * (1 - smooth(S.END - 0.4, S.END, t)); $('mark').style.opacity = 1 - smooth(S.END, S.END + 0.4, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); } else cp.style.opacity = 0;
  $('flash').style.opacity = 0;
  $('end').style.opacity = smooth(S.END, S.END + 0.5, t); $('endT').style.opacity = smooth(S.END + 0.3, S.END + 0.9, t); $('endS').style.opacity = smooth(S.END + 0.8, S.END + 1.4, t);
}
// ---- render (sub-frame motion blur on the blizzard shots) ----
const MB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= S.END + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0; compMat.uniforms.uLook.value = 1;
  const env = envAt(t); const exp = shotAt(t, env); snowAt(t, pCam, env.wind, env.snow, SNOWC); shootTo(RTA, pw, pCam);
  // fades between shots (dip to black on the time jumps)
  const cutsK = [S.EXT, S.HALL, S.BOT, S.BLIZ, S.ROPE, S.BED, S.WX, S.AUR, S.SUN, S.END]; let dip = 1; for (const k of cutsK) { const big = [S.BLIZ, S.BED, S.AUR, S.SUN].includes(k); if (big) dip = Math.min(dip, smooth(0, 0.35, Math.abs(t - k))); }
  composite(0, exp * dip, 1); return true;
};
window.DBG = { THREE, pw, pCam, ST, ROOM, GL, GR, BOT, WEND, glass, frost }; window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
