// =================== "만약 5초 동안 중력이 절반이 된다면?" — 25 s. Banpo park at dusk (h_set.js), quick format.
// Story time T = (t-3)/3 (5 s over t 3–18). g: 9.8 → 4.9 m/s² at T=0, back at T=5. Same push-off speed → twice as high, twice as long:
// a 0.5 m standing jump (v0 = 3.13 m/s, 0.64 s in the air) becomes 1.0 m and 1.28 s. Fountain arcs: twice the height and reach.
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const T0 = 3, T1 = 18, END0 = 21.2, SL = 3;
const storyT = t => (t - T0) / SL;
const gOf = t => t < T0 || t >= T1 ? 9.8 : 4.9;
const gK = t => 1 + smooth(T0, T0 + 0.6, t) * (1 - smooth(T1, T1 + 0.5, t));   // 1 → 2 → 1 (arcs scale ~ 1/g)
foamAt(-1); splashAt(0, 0, 0, 0); bedStuff.visible = false; vanishRing.visible = false; ferry.visible = true;
// fountain with a gravity factor (copy of setJets: reach and rise scale with k)
function setJetsG(t, throwM, k, floorY = WATER_Y) {
  const P = jetGeo.attributes.position.array, C = jetGeo.attributes.color.array, MP = mist.geometry.attributes.position.array, MC = mist.geometry.attributes.color.array; let v = 0, mi = 0;
  for (let side = 0; side < 2; side++) { const sx = side ? 1 : -1;
    for (let j = 0; j < JET_N; j++) { const z = lerp(JZ0, JZ1, j / (JET_N - 1)), ph = hash(j * 3.3 + side), reach = k * throwM * (0.85 + 0.15 * ph) * (0.92 + 0.08 * Math.sin(t * 2.1 + j * 0.35)), x0 = sx * 12.8, y0 = DECK_Y - 1.0, drop = y0 - floorY, up = 6 * k;
      jetCol.setHSL(wrapR(j / JET_N * 2.2 + t * 0.05 + side * 0.3, 0, 1), 1.0, 0.5); const br = 1.1;
      for (let s = 0; s <= JET_SEG; s++) { const u = s / JET_SEG, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u, r = 0.08 + 0.4 * u * u;
        for (let q = 0; q < JET_SIDES; q++) { const a = q / JET_SIDES * Math.PI * 2; P[v * 3] = x + Math.cos(a) * r * 0.3; P[v * 3 + 1] = y + Math.sin(a) * r; P[v * 3 + 2] = z + Math.cos(a) * r; C[v * 3] = jetCol.r * br; C[v * 3 + 1] = jetCol.g * br; C[v * 3 + 2] = jetCol.b * br; v++; } }
      for (let m = 0; m < 3; m++) { const u = 0.55 + m * 0.2, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u; MP[mi * 3] = x; MP[mi * 3 + 1] = y; MP[mi * 3 + 2] = z + (m - 1) * 1.5; MC[mi * 3] = jetCol.r; MC[mi * 3 + 1] = jetCol.g; MC[mi * 3 + 2] = jetCol.b; mi++; } } }
  jetGeo.attributes.position.needsUpdate = jetGeo.attributes.color.needsUpdate = true; mist.geometry.attributes.position.needsUpdate = mist.geometry.attributes.color.needsUpdate = true; jetGeo.computeBoundingSphere(); }
// ---- the hero stands on the lawn and jumps ----
const HP = V3(4, 0, 0.8), JT0 = 7.2, V0 = 3.13;
function jumpY(t) { const tau = (t - JT0) / SL; if (tau <= 0) return 0; const y = V0 * tau - 0.5 * 4.9 * tau * tau; return Math.max(0, y); }
const JT1 = JT0 + SL * 2 * V0 / 4.9;   // landing (t ≈ 11.03)
function heroAt(t) { const P = hero; heroPhone.visible = false; P.outer.rotation.order = 'YXZ'; P.outer.rotation.set(0, 0.45, 0); P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02;
  P.arms[0].rotation.set(0, 0, -0.08); P.arms[1].rotation.set(0, 0, 0.08); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.15;
  let dy = 0;
  // the moment g halves: legs still push with full-weight force → a little lift, arms drift up
  const fl = span(t, T0, T0 + 1.2); dy += 0.07 * Math.sin(Math.PI * fl) * (t < T0 + 1.2 ? 1 : 0);
  const armUp = 0.25 * smooth(T0, T0 + 0.8, t) * (1 - smooth(JT0 - 0.6, JT0 - 0.3, t));
  P.arms[0].rotation.z = -0.08 - armUp; P.arms[1].rotation.z = 0.08 + armUp;
  // crouch, push off, the long flight, landing
  const cr = smooth(JT0 - 0.6, JT0 - 0.15, t) * (1 - smooth(JT0 - 0.15, JT0, t)) + smooth(JT1, JT1 + 0.12, t) * (1 - smooth(JT1 + 0.25, JT1 + 0.7, t));
  dy -= 0.16 * cr; for (const l of P.legs) l.rotation.x = -0.45 * cr; for (const k of P.knees) k.rotation.x = 0.02 + 0.9 * cr; P.outer.rotation.x = 0.12 * cr;
  const air = t > JT0 && t < JT1, jy = jumpY(t); dy += jy;
  if (air) { const k = Math.sin(Math.PI * (t - JT0) / (JT1 - JT0)); P.arms[0].rotation.set(-0.6 * k, 0, -0.3 * k); P.arms[1].rotation.set(-0.6 * k, 0, 0.3 * k); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.4 * k;
    P.legs[0].rotation.x = -0.25 * k; P.knees[0].rotation.x = 0.5 * k; P.legs[1].rotation.x = 0.1 * k; P.knees[1].rotation.x = 0.25 * k; }
  // gravity snaps back: a small dip
  const sn = smooth(T1, T1 + 0.12, t) * (1 - smooth(T1 + 0.2, T1 + 0.7, t)); dy -= 0.1 * sn; for (const k of P.knees) k.rotation.x += 0.5 * sn;
  P.outer.position.set(HP.x, 0.95 + dy, HP.z);
  P.face(t < T0 ? 'happy' : t < JT0 - 0.6 ? 'surprised' : air ? 'laugh' : t < T1 ? 'happy' : 'surprised', t);
  return jy; }
// ---- state ----
function worldAt(t) {
  carsAt(t); fishAt(t); grassU.uT.value = t; river.material.uniforms.uHR.value = -1; setJetsG(t, 32, gK(t)); aimSun(HP.x, HP.z);
  CROWD.forEach((P, i) => { sitPose(P, t, i); const up = t >= T0 && t < T1 ? 0.05 * Math.sin(Math.PI * span(t, T0, T0 + 1.2)) : 0; P.outer.position.y = 0.17 + up;
    if (P.face) P.face(t >= T0 && t < T1 ? (i % 2 ? 'surprised' : 'laugh') : 'happy', t + i); });
  return heroAt(t);
}
// ---- cameras ----
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function camAt(t, jy) {
  dof(hCam, 1, 0); hCam.near = 0.05; hCam.far = 40000; hw.fog.density = 0.00048;
  const hd = (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0)));
  if (t < T0) { const u = ease(span(t, 0, T0)); const p = HP.clone().add(V3(lerp(4.2, 2.6, u), lerp(1.6, 1.4, u), lerp(5.2, 5.6, u))); LOOKC(hCam, p, HP.clone().add(V3(-1.2, 1.15, -1.5)), 44); dof(hCam, p.distanceTo(hd), 3); return; }
  if (t < 7) { const u = ease(span(t, T0, 7)); const p = HP.clone().add(V3(lerp(1.5, 1.1, u), lerp(1.55, 1.6, u), lerp(2.7, 2.1, u))); LOOKC(hCam, p, hd.clone().add(V3(0, -0.12, 0)), 36); dof(hCam, p.distanceTo(hd), 7); return; }
  if (t < 11.4) { const u = ease(span(t, 7, 11.4)), a = lerp(1.25, 1.0, u), r = 4.4; const p = HP.clone().add(V3(Math.sin(a) * r, 1.3 + jy * 0.5, Math.cos(a) * r));
    LOOKC(hCam, p, HP.clone().add(V3(0, 1.0 + jy * 0.75, 0)), 42); dof(hCam, p.distanceTo(hd), 4); return; }
  if (t < T1) { const u = ease(span(t, 11.4, T1)); LOOKC(hCam, V3(lerp(-30, -45, u), lerp(28, 40, u), lerp(70, 55, u)), V3(BR_X, lerp(10, 16, u), -220), 50); hCam.near = 0.3; return; }
  const u = ease(span(t, T1, END0)); const p = HP.clone().add(V3(lerp(4.6, 4.0, u), 1.7, lerp(3.4, 3.0, u))); LOOKC(hCam, p, HP.clone().add(V3(-3.2, 1.9, -5.0)), 48); dof(hCam, p.distanceTo(hd), 2.5);
}
// ---- text ----
const TITLE = ['만약', '<span class="hl">5초</span>', '동안', '<br>', '<span class="hl">중력</span>이', '절반이', '된다면?'];
const CAPS = [[3.3, 6.6, '몸이 <span class="hl">붕</span> 뜬다<br>엘리베이터가 갑자기 내려갈 때처럼'], [7.0, 11.2, '같은 힘으로 뛰면<br><span class="hl">2배</span> 높이, <span class="hl">2배</span> 오래'],
  [11.6, 14.8, '분수 물줄기도 <span class="hl">2배</span> 높이·멀리'], [15.0, 17.8, '떨어지는 속도는 <span class="hl">절반</span>'], [18.2, 21.0, '5초 끝. 다시 <span class="hl">9.8m/s²</span>']];
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
function text(t) {
  const T = storyT(t), tt = $('title');
  if (!tt.dataset.ok) { let k = 0; tt.innerHTML = TITLE.map(w => w === '<br>' ? '<br>' : `<span class="w" data-i="${k++}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.2 - i * 0.14) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(2.6, 3.0, t);
  let lab, val, sub;
  if (t < T0) { lab = '중력 절반까지'; val = '0:0' + (T0 - t).toFixed(3); sub = '중력 9.8 m/s²'; }
  else if (t < T1) { lab = '중력 절반 · 경과 시간'; val = 'T+' + T.toFixed(3) + '초'; const jy = jumpY(t); sub = jy > 0.005 ? `중력 4.9 m/s² · 점프 높이 ${jy.toFixed(2)}m` : '중력 4.9 m/s²'; }
  else { lab = '중력 절반 · 경과 시간'; val = 'T+5.000초'; sub = '중력 9.8 m/s²'; }
  $('lab').innerHTML = '<b></b>' + lab; $('val').textContent = val; $('sub').textContent = sub;
  const pop = Math.max(0, 1 - Math.abs(t - T0) / 0.25) + Math.max(0, 1 - Math.abs(t - T1) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pop})`; $('val').style.transformOrigin = 'left center';
  $('big').style.opacity = 0; $('hud').style.opacity = smooth(0.1, 0.4, t) * (1 - smooth(END0 - 0.4, END0, t)); $('mark').style.opacity = 1 - smooth(END0, END0 + 0.4, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); } else cp.style.opacity = 0;
  $('flash').style.opacity = 0;
  $('end').style.opacity = smooth(END0, END0 + 0.5, t); $('endT').style.opacity = smooth(END0 + 0.3, END0 + 0.9, t); $('endS').style.opacity = smooth(END0 + 0.8, END0 + 1.4, t);
}
// ---- render ----
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0; const jy = worldAt(t); camAt(t, jy); shootTo(RTA, hw, hCam); composite(0, 1, 1); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
