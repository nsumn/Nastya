// =================== "만약 5초 동안 마찰이 사라진다면?" — 22.5 s, quick format. Banpo park at dusk (h_set.js).
// Story T = (t-3)/3. He walks north toward the river at 1.4 m/s; at T=0 friction = 0: the planted foot shoots forward, he falls on his back
// and keeps gliding at the same 1.4 m/s (nothing can slow him) → 7 m in 5 s, stopping right at the top of the stone slope when friction returns.
// Facts on screen: a car at 60 km/h covers 83 m in 5 s with no brakes and no steering; standing still on flat ground nothing would happen.
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const T0 = 3, T1 = 18, END0 = 18.6, SL = 3, VW = 1.4, X0 = 11, Z_SLIP = -2.0;
const storyT = t => (t - T0) / SL;
foamAt(-1); splashAt(0, 0, 0, 0); bedStuff.visible = false; vanishRing.visible = false; ferry.visible = true; heroPhone.visible = false;
// position along the walk (z decreases = toward the river); before T0 he walks at real speed, after it the slide runs in story time; stops at T1
function heroZ(t) { if (t < T0) return Z_SLIP + VW * (T0 - t); const T = Math.min(storyT(t), 5); return Z_SLIP - VW * T - (t > T1 ? 0.05 * smooth(T1, T1 + 0.3, t) : 0); }
const slid = t => Math.max(0, Z_SLIP - heroZ(t));
function heroAt(t) { const P = hero; P.outer.rotation.order = 'YXZ'; P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02;
  P.arms[0].rotation.set(0, 0, -0.08); P.arms[1].rotation.set(0, 0, 0.08); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.15;
  const z = heroZ(t); let y = 0.95, lean = 0;
  if (t < T0) { poseWalk(P, (T0 - t) * -7.5, 1); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.3; }
  else { const T = storyT(t), f = smooth(0, 0.55, T);   // feet out, fall backwards
    P.legs[0].rotation.x = lerp(0.3, -0.3, f) - 0.5 * Math.sin(Math.PI * f); P.legs[1].rotation.x = lerp(-0.3, -0.42, f) - 0.6 * Math.sin(Math.PI * f); P.knees[0].rotation.x = 0.1; P.knees[1].rotation.x = 0.25;
    lean = -1.45 * f; y = lerp(0.95, 0.24, smooth(0.1, 0.6, T));
    // arms thrown out on the way down, then trying to push up (small, within the safe range)
    const tr = Math.sin(Math.PI * span(T, 0, 0.7)); P.arms[0].rotation.set(-0.5 * tr, 0, -0.45 * tr - 0.08); P.arms[1].rotation.set(-0.5 * tr, 0, 0.45 * tr + 0.08);
    const fl = smooth(1.6, 2.0, T) * (1 - smooth(4.2, 4.6, T)); if (fl > 0) { const s = Math.sin(t * 7), c = Math.cos(t * 6); P.arms[0].rotation.x += (0.3 + 0.2 * s) * fl; P.arms[1].rotation.x += (0.3 - 0.2 * c) * fl; P.arms[0].rotation.z -= 0.25 * fl; P.arms[1].rotation.z += 0.25 * fl;
      P.legs[0].rotation.x += 0.25 * s * fl; P.legs[1].rotation.x -= 0.25 * c * fl; lean += 0.12 * fl * (0.5 + 0.5 * s); P.head.rotation.x = 0.3 * fl; }
    if (t >= T1) P.head.rotation.x = 0.45 * smooth(T1 + 0.2, T1 + 0.8, t); }
  P.outer.rotation.set(lean, Math.PI, 0); P.outer.position.set(X0, y, z);
  P.face(t < T0 ? 'happy' : t < T0 + 3 ? 'surprised' : t < T1 ? 'worried' : 'dumb', t); }
// ---- state ----
function worldAt(t) { carsAt(t); fishAt(t); grassU.uT.value = t; river.material.uniforms.uHR.value = -1; setJets(t, 32, 1, WATER_Y); aimSun(X0, heroZ(t));
  CROWD.forEach((P, i) => { sitPose(P, t, i); if (P.face) P.face(t >= T0 + 1 && t < T1 ? (i % 2 ? 'surprised' : 'laugh') : 'happy', t + i); }); heroAt(t); }
// ---- cameras: side tracking (bridge + fountain behind), wide from above at the river edge, close on the face at the stop ----
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function camAt(t) {
  dof(hCam, 1, 0); hCam.near = 0.05; hCam.far = 40000;
  const hd = (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0))), z = heroZ(t), C = V3(X0, 0, z);
  if (t < 12.4) { const u = span(t, 0, 12.4), lowk = smooth(T0, T0 + 2, t); const p = C.clone().add(V3(lerp(4.2, 3.6, u), lerp(1.4, 0.9, lowk), lerp(1.6, 1.0, u)));
    LOOKC(hCam, p, C.clone().add(V3(0, lerp(1.0, 0.35, lowk), -0.4)), 40); dof(hCam, p.distanceTo(hd), 3.5); return; }
  if (t < 16) { const u = ease(span(t, 12.4, 16)); LOOKC(hCam, V3(lerp(X0 + 3.5, X0 + 2.5, u), lerp(3.2, 3.8, u), lerp(-14.5, -14, u)), V3(X0, 0.2, z + 1.5), 48); dof(hCam, 7, 2); return; }
  const u = ease(span(t, 16, END0)); const p = hd.clone().add(V3(lerp(0.7, 0.55, u), lerp(0.55, 0.45, u), lerp(-1.4, -1.1, u))); LOOKC(hCam, p, hd.clone().add(V3(0, -0.05, 0.2)), 36); dof(hCam, p.distanceTo(hd), 6);
}
// ---- text ----
const TITLE = ['만약', '<span class="hl">5초</span>', '동안', '<br>', '<span class="hl">마찰</span>이', '사라진다면?'];
const CAPS = [[3.3, 6.4, '발이 <span class="hl">그대로</span> 미끄러진다'], [6.6, 9.8, '마찰이 없으면<br><span class="hl">멈출 수가 없다</span>'], [10.0, 12.3, '일어나려 해도 손발이 <span class="hl">헛돈다</span>'],
  [12.6, 15.8, '시속 60km 자동차는 5초 동안<br><span class="hl">83m</span>를 브레이크 없이 미끄러진다'], [16.2, 18.4, '5초 끝. 강 <span class="hl">바로 앞</span>에서 멈췄다']];
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
function text(t) {
  const T = storyT(t), tt = $('title');
  if (!tt.dataset.ok) { let k = 0; tt.innerHTML = TITLE.map(w => w === '<br>' ? '<br>' : `<span class="w" data-i="${k++}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.2 - i * 0.14) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(2.6, 3.0, t);
  let lab, val, sub;
  if (t < T0) { lab = '마찰이 사라지기까지'; val = '0:0' + (T0 - t).toFixed(3); sub = '걷는 속도 1.4 m/s'; }
  else { lab = '마찰 0 · 경과 시간'; val = 'T+' + Math.min(T, 5).toFixed(3) + '초'; sub = `미끄러진 거리 ${slid(t).toFixed(1)}m`; if (t >= T1) lab = '마찰 복귀'; }
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
