// =================== "만약 반포대교 분수가 1000배 세진다면?" — 24 s, quick format. Banpo park at dusk (h_set.js).
// Story T = (t-3)/3. Real fountain: 380 nozzles, ~190 t/min. At 1000x: ~3,170 t/s, 15,800 t in 5 s (6 Olympic pools), ~20x the Han's normal flow (tools/fountain_math.py).
// The jets' reach/thickness is a MODEL; the spray drifts over the park and comes down as a downpour.
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const T0 = 3, T1 = 18, END0 = 20, SL = 3, QT = 3167;
const storyT = t => (t - T0) / SL;
const pK = t => smooth(T0, T0 + 0.8, t) * (1 - smooth(T1, T1 + 0.6, t));   // 0 → 1 → 0 power boost
foamAt(-1); splashAt(0, 0, 0, 0); bedStuff.visible = false; vanishRing.visible = false; ferry.visible = true;
// fountain with a gravity factor (copy of setJets: reach and rise scale with k)
function setJetsBig(t, throwM, b, floorY = WATER_Y) {   // b = boost 0..1: reach x8, rise x6, jets 6x thicker
  const P = jetGeo.attributes.position.array, C = jetGeo.attributes.color.array, MP = mist.geometry.attributes.position.array, MC = mist.geometry.attributes.color.array; let v = 0, mi = 0;
  for (let side = 0; side < 2; side++) { const sx = side ? 1 : -1;
    for (let j = 0; j < JET_N; j++) { const z = lerp(JZ0, JZ1, j / (JET_N - 1)), ph = hash(j * 3.3 + side), reach = (1 + 7 * b) * throwM * (0.85 + 0.15 * ph) * (0.92 + 0.08 * Math.sin(t * 2.1 + j * 0.35)), x0 = sx * 12.8, y0 = DECK_Y - 1.0, drop = y0 - floorY, up = 6 * (1 + 5 * b);
      jetCol.setHSL(wrapR(j / JET_N * 2.2 + t * 0.05 + side * 0.3, 0, 1), 1.0, 0.5); const br = 1.1 + 0.6 * b;
      for (let s = 0; s <= JET_SEG; s++) { const u = s / JET_SEG, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u, r = (0.08 + 0.4 * u * u) * (1 + 5 * b);
        for (let q = 0; q < JET_SIDES; q++) { const a = q / JET_SIDES * Math.PI * 2; P[v * 3] = x + Math.cos(a) * r * 0.3; P[v * 3 + 1] = y + Math.sin(a) * r; P[v * 3 + 2] = z + Math.cos(a) * r; C[v * 3] = jetCol.r * br; C[v * 3 + 1] = jetCol.g * br; C[v * 3 + 2] = jetCol.b * br; v++; } }
      for (let m = 0; m < 3; m++) { const u = 0.55 + m * 0.2, x = x0 + sx * reach * u, y = y0 + up * u - (up + drop) * u * u; MP[mi * 3] = x; MP[mi * 3 + 1] = y; MP[mi * 3 + 2] = z + (m - 1) * 1.5; MC[mi * 3] = jetCol.r; MC[mi * 3 + 1] = jetCol.g; MC[mi * 3 + 2] = jetCol.b; mi++; } } }
  jetGeo.attributes.position.needsUpdate = jetGeo.attributes.color.needsUpdate = true; mist.geometry.attributes.position.needsUpdate = mist.geometry.attributes.color.needsUpdate = true; jetGeo.computeBoundingSphere(); }
// ---- rain from the spray over the park ----
const RAIN = (() => { seed = 9191; const N = 4000, pos = new Float32Array(N * 6), base = []; for (let i = 0; i < N; i++) base.push([R(-30, 30), R(0, 30), R(-25, 25), R(0.5, 1.1)]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color: new THREE.Color(0.75, 0.82, 0.95), transparent: true, opacity: 0, depthWrite: false });
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; hw.add(l); return { l, base, pos, g, m }; })();
function rainAt(t, k, c) { RAIN.m.opacity = 0.55 * k; RAIN.l.visible = k > 0.01; if (!RAIN.l.visible) return; let o = 0;
  for (const [x, y0, z, sp] of RAIN.base) { const y = wrapR(y0 - t * 14 * sp, 0, 30); RAIN.pos[o++] = c.x + x; RAIN.pos[o++] = y; RAIN.pos[o++] = c.z + z; RAIN.pos[o++] = c.x + x + 0.12; RAIN.pos[o++] = y + 0.9; RAIN.pos[o++] = c.z + z; }
  RAIN.g.attributes.position.needsUpdate = true; }
const rainK = t => smooth(T0 + 1.6, T0 + 2.6, t) * (1 - smooth(T1 + 0.6, T1 + 2.2, t));
// ---- state ----
function heroSit(t, look) { const P = hero; P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = 0; P.torso.rotation.set(0, 0, 0); P.head.rotation.set(-look, 0, 0); heroPhone.visible = false;
  P.outer.position.set(HERO_MAT.x - 0.1, 0.17, HERO_MAT.z + 0.15); P.outer.rotation.y = Math.PI - 0.55; sitPose(P, t, 0);
  const cov = smooth(T0 + 2.2, T0 + 2.8, t) * (1 - smooth(T1 + 0.8, T1 + 1.6, t));   // arm up over the head against the rain (within the safe range, elbow bent)
  P.arms[1].rotation.set(-0.6 * cov, 0, 0.25 * cov); P.elbows[1].rotation.x = -1.6 * cov; }
function worldAt(t) {
  carsAt(t); fishAt(t); grassU.uT.value = t; river.material.uniforms.uHR.value = -1; const b = pK(t); setJetsBig(t, 32, b); river.material.uniforms.distortionScale.value = 0.7 + 3 * b;
  const hd = (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0))); rainAt(t, rainK(t), hd); aimSun(0, 0);
  heroSit(t, 0.12 + 0.25 * b); hero.face(t < T0 ? 'happy' : t < T0 + 2.4 ? 'surprised' : t < T1 ? 'worried' : 'dumb', t);
  CROWD.forEach((P, i) => { sitPose(P, t, i); const up = rainK(t) > 0.3 && (i % 3 !== 1); if (up) { P.outer.position.y = 0.95; for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02; P.arms[0].rotation.set(-0.6, 0, 0.2); P.elbows[0].rotation.x = -1.6; } else P.outer.position.y = 0.17;
    if (P.face) P.face(t >= T0 + 1 && t < T1 + 1 ? (i % 2 ? 'surprised' : 'worried') : 'happy', t + i); });
}
// ---- cameras ----
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function camAt(t) {
  dof(hCam, 1, 0); hCam.near = 0.05; hCam.far = 40000; const hd = (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0)));
  if (t < T0) { const u = ease(span(t, 0, T0)); const p = hd.clone().add(V3(lerp(1.9, 1.5, u), lerp(0.7, 0.6, u), lerp(2.6, 2.2, u))); LOOKC(hCam, p, V3(BR_X, 0, -200), 40); dof(hCam, 300, 3); return; }
  if (t < 8) { const u = ease(span(t, T0, 8)); LOOKC(hCam, V3(lerp(-20, -35, u), lerp(30, 45, u), lerp(80, 70, u)), V3(BR_X, lerp(20, 40, u), -260), 52); hCam.near = 0.3; return; }
  if (t < 12) { const u = ease(span(t, 8, 12)); const f = V3(Math.sin(Math.PI - 0.55), 0, Math.cos(Math.PI - 0.55)); const p = hd.clone().addScaledVector(f, lerp(1.5, 1.2, u)).add(V3(0.3, -0.1, 0)); LOOKC(hCam, p, hd.clone().add(V3(0, 0.05, 0)), 36); dof(hCam, p.distanceTo(hd), 6); return; }
  if (t < T1) { const u = ease(span(t, 12, T1)); LOOKC(hCam, V3(lerp(-40, -20, u), lerp(70, 90, u), lerp(160, 140, u)), V3(lerp(-120, -100, u), 0, -150), 50); hCam.near = 0.5; return; }
  const u = ease(span(t, T1, END0)); const p = hd.clone().add(V3(lerp(1.8, 1.5, u), lerp(0.3, 0.4, u), lerp(1.6, 1.3, u))); LOOKC(hCam, p, hd.clone().add(V3(-0.15, 0.05, -0.35)), 42); dof(hCam, p.distanceTo(hd), 4);
}
// ---- text ----
const TITLE = ['만약', '<span class="hl">반포대교</span>', '분수가', '<br>', '<span class="hl">1000배</span>', '세진다면?'];
const CAPS = [[3.3, 7.8, '분당 190톤 → <span class="hl">19만 톤</span>'], [8.2, 11.8, '물보라가 공원까지<br><span class="hl">폭우</span>처럼 쏟아진다'],
  [12.2, 14.9, '5초면 <span class="hl">1만 6천 톤</span><br>올림픽 수영장 6개'], [15.1, 17.8, '한강이 흘러오는 속도의<br><span class="hl">20배</span>를 퍼올린다'], [18.1, 19.9, '5초 끝. 소풍도 <span class="hl">끝</span>']];
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
function text(t) {
  const T = storyT(t), tt = $('title');
  if (!tt.dataset.ok) { let k = 0; tt.innerHTML = TITLE.map(w => w === '<br>' ? '<br>' : `<span class="w" data-i="${k++}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.2 - i * 0.14) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(2.6, 3.0, t);
  let lab, val, sub;
  if (t < T0) { lab = '분수 1000배까지'; val = '0:0' + (T0 - t).toFixed(3); sub = '지금: 분당 190톤'; }
  else { const Tc = Math.min(T, 5); lab = t < T1 ? '분수 1000배 · 경과 시간' : '분수 원래대로'; val = 'T+' + Tc.toFixed(3) + '초'; sub = `퍼올린 물 ${Math.round(QT * Tc).toLocaleString('ko-KR')}톤`; }
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
  compMat.uniforms.uWhip.value = 0; worldAt(t); camAt(t); shootTo(RTA, hw, hCam); composite(0, 1, 1); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
