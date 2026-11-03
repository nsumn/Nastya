// =================== "만약 서울의 모든 불이 5초 동안 꺼진다면?" — 30 s. Banpo park at night (h_set.js + b_sky.js).
// Story time T (s): countdown to the blackout at t=3; t 3–4.6 shows the first 0.0002 s (the sky glow drains in ~0.1 ms: tools/blackout_math.py),
// t 4.6–6.5 ramps to 0.2 s, then 0.2→5.0 s over t 6.5–24 (slowed ~3.6×); the lights come back at t=24. End card at 26.2.
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const T0 = 3, T_ON = 24, END0 = 26.2, LEN = 30;
function storyT(t) { if (t < 4.6) return t - T0 < 0 ? t - T0 : 0.0002 * (t - T0) / 1.6; if (t < 6.5) return 0.0002 * Math.pow(1000, (t - 4.6) / 1.9); return 0.2 + 4.8 * span(t, 6.5, T_ON); }
const limAt = t => t >= T0 && t < T_ON ? 2.6 + 3.9 * smooth(9.6, 15.2, t) : 2;   // star limiting magnitude (also drives the HUD counter in the text pass)
// hide what this video does not use; night lighting
foamAt(-1); splashAt(0, 0, 0, 0); bedStuff.visible = false; vanishRing.visible = false; ferry.visible = true;
hw.environmentIntensity = 0.06; hSun.intensity = 0; hRim.intensity = 0;
hw.fog.color.set('#141218');
// ---- every light in the set: emissive windows, HDR unlit bulbs/LEDs, the fountain, point lights, the phone screen ----
const LIGHTS = [];
hw.traverse(o => {
  if (o === skyDome || o === STARS) return;
  if (o.isPointLight || o.isSpotLight) { LIGHTS.push({ o, k: 'intensity', v: o.intensity }); return; }
  const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
  for (const m of mats) { if (m.userData.lit) continue;
    if (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.05 && m !== foamM) { m.userData.lit = 1; LIGHTS.push({ m, k: 'emissiveIntensity', v: m.emissiveIntensity }); }
    else if (m.isMeshBasicMaterial && (m.vertexColors && m.blending === THREE.AdditiveBlending || Math.max(m.color.r, m.color.g, m.color.b) > 1.1)) { m.userData.lit = 1; LIGHTS.push({ m, k: 'color', v: m.color.clone() }); }
    else if (m.isSpriteMaterial && m.blending === THREE.AdditiveBlending) { m.userData.lit = 1; LIGHTS.push({ m, k: 'opacity', v: m.opacity }); } }
});
function lightsK(k) { for (const L of LIGHTS) { if (L.o) L.o[L.k] = L.v * k; else if (L.k === 'color') L.m.color.copy(L.v).multiplyScalar(k); else L.m[L.k] = L.v * k; } }
// ---- people ----
FACE.stargaze = { eye: 'wide', brow: [0, 0.07], mouth: 'o', look: [0, -0.4] };
FACE.squintLight = { eye: 'squint', brow: [-0.15, -0.01], mouth: 'flat' };
function heroSit(t, look) { const P = hero; P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = 0; P.torso.rotation.set(0, 0, 0); P.head.rotation.set(-look, 0, 0);
  P.outer.position.set(HERO_MAT.x - 0.1, 0.17, HERO_MAT.z + 0.15); P.outer.rotation.y = Math.PI - 0.1; sitPose(P, t, 0);
  P.arms[1].rotation.set(-0.55 + 0.35 * clamp(look * 2, 0, 1), 0, 0.05); P.elbows[1].rotation.x = -1.35 + 0.6 * clamp(look * 2, 0, 1);
  P.outer.updateMatrixWorld(true); const hp = V3(0, -0.28, 0.05); P.elbows[1].localToWorld(hp); heroPhone.position.copy(hp); heroPhone.lookAt(hp.clone().add(V3(0, 0.6, 1))); }
// ---- state ----
let EXP = 1;
function worldAt(t) {
  const T = storyT(t), dark = t >= T0 && t < T_ON, back = t >= T_ON;
  carsAt(t); fishAt(t); grassU.uT.value = t; river.material.uniforms.uHR.value = -1;
  // lights: off at T=0; back at T=5 with a hot overshoot (bulbs + eyes adapted to the dark)
  const on = dark ? 0 : back ? 1 + 0.6 * Math.exp(-(t - T_ON) * 3) : 1; lightsK(on);
  setJets(t, 32, dark ? 0 : back ? smooth(T_ON, T_ON + 1.5, t) : 1, WATER_Y);
  // sky: the glow dome drains in ~0.1 ms of story time; stars and the Milky Way grow as the camera "adapts"
  const glow = t < T0 ? 1 : dark ? 1 - smooth(0, 0.0001, T) : 1, lim = limAt(t), mw = dark ? smooth(13.5, 17.5, t) : 0;
  // adaptation: the dark sky and the starlight grow brighter (pupil, then rods) — done on the light, not the camera exposure (keeps the water black)
  const AD = dark ? lerp(0.25, 1.0, smooth(T0 + 0.1, 8, t)) + 0.8 * smooth(8, 16, t) : 1;
  skyState(glow, lim, mw, glow > 0.5 ? 1 : AD);
  hw.fog.color.setRGB(0.08, 0.07, 0.08).lerp(new THREE.Color(0.012, 0.016, 0.03), 1 - glow); hw.fog.density = 0.00035 * (0.4 + 0.6 * glow);
  hHemi.color.setRGB(0.32, 0.34, 0.5).lerp(new THREE.Color(0.35, 0.42, 0.7), 1 - glow); hHemi.groundColor.setRGB(0.12, 0.1, 0.1); hHemi.intensity = 0.35 * glow + 0.55 * AD * (1 - glow);
  { const ru = river.material.uniforms; ru.sunColor.value.setRGB(0.25, 0.18, 0.12).multiplyScalar(on); ru.distortionScale.value = 0.5; }
  // exposure: the frame drops to black at T=0, then opens (pupil, then rods); blown out when the lights return, then settles
  EXP = back ? lerp(2.4, 1.0, smooth(T_ON, T_ON + 1.3, t)) : 1.0;
  // people: sitting, looking at the city → up at the sky; some stand up and point their (dead) phones
  const look = t < T0 ? 0.1 : dark ? 0.1 + 0.42 * smooth(6.5, 11, t) : 0.15; heroSit(t, look);
  hero.face(t < T0 ? 'happy' : t < 6.5 ? 'surprised' : dark ? (t < 9 ? 'surprised' : 'stargaze') : 'squintLight', t);
  CROWD.forEach((P, i) => { sitPose(P, t, i); P.outer.rotation.order = 'YXZ'; const up = dark && (i % 3 !== 1) && t > 18 + (i % 5) * 0.35;
    if (up) { P.outer.position.y = 0.95; for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02; P.arms[0].rotation.set(-0.4, 0, -0.05); P.elbows[0].rotation.x = -0.6; P.arms[1].rotation.set(-0.3, 0, 0.05); }
    else P.outer.position.y = 0.17;
    P.head.rotation.x = dark ? -0.45 * smooth(7 + (i % 4) * 0.5, 11 + (i % 4) * 0.5, t) : 0; if (P.face) P.face(dark && t > 9 ? 'stargaze' : t >= T0 && dark ? 'surprised' : 'happy', t + i); });
  return T;
}
// ---- cameras ----
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
const NS = namsan.position;
function wideShot(t, a) {   // S1 / S7: high behind the picnic rows — the park, the river, the bridge, the city and Namsan in one frame
  const u = ease(span(t, a, a + 3.6)); LOOKC(hCam, V3(lerp(9, 6, u), lerp(3.6, 3.0, u), lerp(17, 13.5, u)), V3(-260, 60, -2600), lerp(50, 46, u)); hCam.near = 0.3; aimSun(0, 4); }
function camAt(t) {
  dof(hCam, 1, 0); hCam.near = 0.05; hCam.far = 40000;
  const hd = (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0)));
  if (t < 3.6) { wideShot(t, 0); return; }
  if (t < 6.5) {   // S2 high over the Han: the orange dome over the city drains away (microseconds on the HUD)
    const u = ease(span(t, 3.6, 6.5)); LOOKC(hCam, V3(lerp(-120, -160, u), lerp(70, 95, u), lerp(160, 120, u)), V3(-330, lerp(330, 420, u), -3600), 52); hCam.near = 1; return; }
  if (t < 10) {   // S3 his face in the dark: eyes widen, he looks up
    const f = V3(Math.sin(Math.PI - 0.1), 0, Math.cos(Math.PI - 0.1)), u = ease(span(t, 6.5, 10)), p = hd.clone().addScaledVector(f, lerp(1.25, 0.95, u)).add(V3(0.22, lerp(-0.05, -0.18, u), 0));
    LOOKC(hCam, p, hd.clone().add(V3(0, 0.02, 0)), 30); dof(hCam, p.distanceTo(hd), 8); return; }
  if (t < 15) {   // S4 his view: tilt up from the dark skyline into the filling sky
    const u = ease(span(t, 10, 15)), p = hd.clone().add(V3(0, 0.14, -0.38)), el = lerp(0.12, 0.85, u), az = Math.PI + lerp(-0.15, 0.25, u);
    LOOKC(hCam, p, p.clone().add(V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))), lerp(50, 62, u)); return; }
  if (t < 21) {   // S5 drone pulls back and up: the dark city under the Milky Way
    const u = ease(span(t, 15, 21)), p = V3(lerp(4, 70, u), lerp(7, 230, u), lerp(12, 520, u)); LOOKC(hCam, p, V3(lerp(-60, -260, u), lerp(500, 1500, u), -2600), lerp(60, 66, u)); hCam.near = 0.3; return; }
  if (t < T_ON) {   // S6 low between the picnic mats: people up, heads back, the sky over them
    const u = ease(span(t, 21, T_ON)), p = hd.clone().add(V3(lerp(-0.9, -0.6, u), -0.45, lerp(-1.9, -1.6, u))); LOOKC(hCam, p, hd.clone().add(V3(0.25, lerp(0.05, 0.15, u), 1.0)), 50); dof(hCam, p.distanceTo(hd), 4); return; }
  wideShot(t, T_ON);   // S7 = S1: everything back on
}
// ---- text ----
const TITLE = ['만약', '서울의', '<br>', '<span class="hl">모든</span>', '<span class="hl">불이</span>', '<br>', '5초', '동안', '꺼진다면?'];
const CAPS = [[3.7, 6.4, '하늘의 빛은 <span class="hl">0.0001초</span> 만에 사라진다'], [6.7, 9.9, '동공은 <span class="hl">몇 초</span> 만에 커진다'],
  [10.2, 12.6, '서울 밤하늘의 별: 약 <span class="hl">20개</span>'], [12.7, 14.9, '진짜 어두운 하늘: <span class="hl">2,500개</span>'],
  [15.2, 18.0, '하지만 눈이 은하수를 보려면'], [18.1, 20.9, '<span class="hl">20–30분</span>이 필요하다'],
  [21.2, 23.9, '1994년 LA 정전 때 사람들은<br>은하수를 보고 <span class="hl">천문대에 전화했다</span>고 한다'], [24.3, 26.0, '5초 끝. 다시 별 <span class="hl">20개</span>.']];
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
const fmtT = T => T < 0.01 ? T.toFixed(6) + '초' : T.toFixed(3) + '초';
function text(t) {
  const T = storyT(t), tt = $('title');
  if (!tt.dataset.ok) { let k = 0; tt.innerHTML = TITLE.map(w => w === '<br>' ? '<br>' : `<span class="w" data-i="${k++}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.2 - i * 0.14) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(2.6, 3.0, t);
  let lab, val, sub = '';
  if (t < T0) { lab = '소등까지'; val = '0:0' + (T0 - t).toFixed(3); sub = `보이는 별 ${starsVisible(2)}개`; }
  else if (t < T_ON) { lab = '서울 · 정전'; val = 'T+' + fmtT(T); const lim = limAt(t); sub = `보이는 별 ${starsVisible(lim).toLocaleString('ko-KR')}개 · MODEL`; }
  else { lab = '서울 · 정전'; val = 'T+5.000초'; sub = '불이 다시 켜졌다'; }
  $('lab').innerHTML = '<b></b>' + lab; $('val').textContent = val; $('sub').textContent = sub;
  const pop = Math.max(0, 1 - Math.abs(t - T0) / 0.25) + Math.max(0, 1 - Math.abs(t - T_ON) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pop})`; $('val').style.transformOrigin = 'left center';
  $('big').style.opacity = 0; $('hud').style.opacity = smooth(0.1, 0.4, t) * (1 - smooth(END0 - 0.4, END0, t)); $('mark').style.opacity = 1 - smooth(END0, END0 + 0.4, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); } else cp.style.opacity = 0;
  $('flash').style.opacity = 0.5 * Math.max(0, 1 - Math.abs(t - T_ON - 0.03) / 0.2);
  $('end').style.opacity = smooth(END0, END0 + 0.5, t); $('endT').style.opacity = smooth(END0 + 0.3, END0 + 0.9, t); $('endS').style.opacity = smooth(END0 + 0.8, END0 + 1.4, t);
}
// ---- render ----
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0; worldAt(t); camAt(t); shootTo(RTA, hw, hCam); composite(0, EXP, 1); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
