// =================== "만약 지구가 5초 동안 멈춘다면?" — 24 s, quick format. Banpo park at dusk (h_set.js).
// The ground stops; everything loose keeps Seoul's rotation speed: 1,327 km/h = 369 m/s east (+x), Mach 1.07 (tools/stop_math.py). 5 s → 1.84 km.
// Story time: t 3–8 super slow-mo (T 0→0.25), then a ramp to T=5 at t=17. Cartoon flight, no impacts; he ends with a splash in the Han 1.8 km east.
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const T0 = 3, T1 = 17, END0 = 20, VS = 369;
function storyT(t) { if (t < T0) return t - T0; if (t < 8) return 0.25 * (t - T0) / 5; if (t < T1) return 0.25 + 4.75 * Math.pow((t - 8) / 9, 1.6); return 5; }
const D = T => VS * clamp(T, 0, 5);
foamAt(-1); bedStuff.visible = false; vanishRing.visible = false; ferry.visible = true; heroPhone.visible = false;
// flight path of a loose thing that starts at (x0, y0, z0): east with the old speed, lifted and tumbled by the supersonic wind, drifting north over the river
function flyPos(T, x0, y0, z0, k) { const d = D(T), lift = 2.2 * smooth(0, 0.04, T) + (6 + 4 * k) * smooth(0.04, 1.2, T) - (6 + 4 * k + 2.2 + y0 - WATER_Y) * smooth(4.2, 5, T) * (k < 0.5 ? 1 : 0);
  return V3(x0 + d, y0 + lift, z0 - 0.09 * d * (0.6 + 0.8 * k)); }
// picnic debris: cans, chicken boxes, cushions, cups
const DEBR = []; { seed = 5151; const cols = ['#d23a2a', '#f2c84a', '#3a8ad0', '#ffffff', '#4ab07a', '#c45a4a'];
  for (let i = 0; i < 90; i++) { const kind = i % 3, g = kind === 0 ? new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10) : kind === 1 ? new THREE.BoxGeometry(0.22, 0.12, 0.18) : new THREE.BoxGeometry(0.35, 0.08, 0.35);
    const m = mesh(g, M(pick(cols), { roughness: 0.5, metalness: kind === 0 ? 0.6 : 0 })), a = R(0, 6.28), r = R(0.4, 9);
    m.userData = { x: Math.cos(a) * r, z: 2 + Math.sin(a) * r * 0.6, k: rnd(), spin: V3(R(-4, 4), R(-4, 4), R(-4, 4)), off: V3(R(-3, 3), R(-1, 2.5), R(-3, 3)) }; hw.add(m); DEBR.push(m); } }
const CROWD_O = CROWD.map(P => P.outer.position.clone());
const HERO0 = V3(HERO_MAT.x - 0.1, 0.17, HERO_MAT.z + 0.15);
function heroAt(t) { const P = hero, T = storyT(t); P.outer.rotation.order = 'YXZ'; P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  if (T <= 0) { P.outer.position.copy(HERO0); P.outer.rotation.set(0, Math.PI - 0.1, 0); sitPose(P, t, 0); P.face('happy', t); return; }
  const p = flyPos(T, HERO0.x, 0.95, HERO0.z, 0.2); if (t >= T1) p.y = WATER_Y + 0.55 + 0.08 * Math.sin(t * 2.5); const up = smooth(0, 0.05, T); P.outer.position.copy(p);
  for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.3; P.legs[0].rotation.x = -0.35 + 0.2 * Math.sin(t * 5); P.legs[1].rotation.x = 0.2 - 0.2 * Math.sin(t * 5);
  P.arms[0].rotation.set(-0.5 + 0.12 * Math.sin(t * 6), 0, -0.45); P.arms[1].rotation.set(-0.45 - 0.12 * Math.cos(t * 6), 0, 0.45); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.5;
  P.outer.rotation.set(-0.35 * up, Math.PI * 0.5 - 0.2 + 0.25 * Math.sin(t * 0.9), 0.15 * Math.sin(t * 1.3));   // facing the flight direction (+x), leaning back into the wind
  P.face(t < 8 ? 'surprised' : t < T1 ? 'anxious' : 'dumb', t); }
// white water splash where he lands (instanced spheres)
const WSP = (() => { seed = 6161; const N = 360, g = new THREE.SphereGeometry(1, 6, 4), m = new THREE.MeshStandardMaterial({ color: '#eef3f8', roughness: 0.4, emissive: '#56606c', emissiveIntensity: 0.4 }), im = new THREE.InstancedMesh(g, m, N);
  im.frustumCulled = false; hw.add(im); const P = []; for (let i = 0; i < N; i++) { const a = R(0, 6.28), v = R(0.4, 3); P.push({ dx: Math.cos(a) * v, dz: Math.sin(a) * v, up: R(2, 8), sc: R(0.025, 0.08) }); } return { im, P }; })();
function wSplash(dt, c) { const mm = new THREE.Matrix4(); WSP.P.forEach((p, i) => { if (dt <= 0 || dt > 2.6) { mm.makeScale(0, 0, 0); WSP.im.setMatrixAt(i, mm); return; }
  const y = WATER_Y + p.up * dt - 4.9 * dt * dt, sc = p.sc * (y > WATER_Y ? 1 : 0); mm.makeScale(sc, sc, sc); mm.setPosition(c.x + p.dx * dt, Math.max(WATER_Y, y), c.z + p.dz * dt); WSP.im.setMatrixAt(i, mm); }); WSP.im.instanceMatrix.needsUpdate = true; }
// ---- state ----
function worldAt(t) {
  carsAt(t); fishAt(t); grassU.uT.value = t; river.material.uniforms.uHR.value = -1; setJets(t, 32, 1, WATER_Y); const T = storyT(t), on = T > 0 ? 1 : 0;
  grassU.uWind.value = 2.5 * on; river.material.uniforms.distortionScale.value = 0.7 + 6 * on;
  CROWD.forEach((P, i) => { const o = CROWD_O[i]; sitPose(P, t, i);
    if (on) { const p = flyPos(T, o.x, 0.95, o.z, (i % 7) / 7 + 0.5); P.outer.position.copy(p); for (const l of P.legs) l.rotation.set(-0.3, 0, 0); P.arms[0].rotation.set(-0.5, 0, -0.4); P.arms[1].rotation.set(-0.5, 0, 0.4); P.outer.rotation.set(-0.3, Math.PI * 0.5 + (i % 5 - 2) * 0.3, 0.3 * Math.sin(t + i)); }
    else P.outer.position.copy(o);
    if (P.face) P.face(on ? 'surprised' : 'happy', t + i); });
  for (const m of DEBR) { const u = m.userData; if (!on) { m.position.set(u.x, 0.06, u.z); m.rotation.set(0, u.k * 6, 0); continue; }
    m.position.copy(flyPos(T, u.x, 0.3, u.z, 0.5 + u.k * 0.5)).add(u.off.clone().multiplyScalar(smooth(0, 0.3, T))); m.rotation.set(u.spin.x * t, u.spin.y * t, u.spin.z * t); }
  heroAt(t);
  const hp = flyPos(5, HERO0.x, 0.95, HERO0.z, 0.2); splashAt(0, 0, 0, 0); wSplash(t - T1 + 0.1, hp); aimSun(hero.outer.position.x, hero.outer.position.z);
}
// ---- cameras ----
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function camAt(t) {
  dof(hCam, 1, 0); hCam.near = 0.05; hCam.far = 40000; const hd = (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0)));
  if (t < 3.6) { const u = ease(span(t, 0, 3.6)); const p = HERO0.clone().add(V3(lerp(-3.5, -3.0, u), 1.4, lerp(3.2, 2.6, u))); LOOKC(hCam, p, HERO0.clone().add(V3(1.5, 0.9, -1)), 44); dof(hCam, 3.8, 3); return; }
  if (t < 8) { const u = ease(span(t, 3.6, 8)); const p = hd.clone().add(V3(lerp(1.6, 2.2, u), lerp(-0.1, 0.3, u), lerp(2.6, 3.2, u))); LOOKC(hCam, p, hd.clone().add(V3(-0.6, -0.2, 0)), 46); dof(hCam, p.distanceTo(hd), 4); return; }
  if (t < 12) { const u = ease(span(t, 8, 12)); const p = hd.clone().add(V3(lerp(-40, -70, u), lerp(25, 40, u), lerp(45, 70, u))); LOOKC(hCam, p, hd.clone().add(V3(lerp(-10, 20, u), -4, 0)), 50); hCam.near = 0.3; return; }
  if (t < T1) { const u = ease(span(t, 12, T1)); const p = hd.clone().add(V3(lerp(4, 3, u), lerp(1.2, 2.0, u), lerp(4, 5, u))); LOOKC(hCam, p, hd.clone().add(V3(-1.5, -0.6, -1)), 44); dof(hCam, p.distanceTo(hd), 3); return; }
  const hp = flyPos(5, HERO0.x, 0.95, HERO0.z, 0.2), u = ease(span(t, T1, END0)); LOOKC(hCam, hp.clone().add(V3(lerp(-7, -5.5, u), lerp(2.6, 2.2, u), lerp(6, 4.8, u))), hp.clone().add(V3(0, 0.6, 0)), 44); hCam.near = 0.2;
}
// ---- text ----
const TITLE = ['만약', '<span class="hl">지구가</span>', '<br>', '<span class="hl">5초</span>', '동안', '멈춘다면?'];
const CAPS = [[3.4, 7.8, '땅은 멈춰도 우리는 그대로<br>시속 <span class="hl">1,330km</span>'], [8.2, 11.8, '공기도 그대로 —<br><span class="hl">음속보다 빠른</span> 바람'],
  [12.2, 16.8, '5초면 동쪽으로<br><span class="hl">1.8km</span>'], [17.2, 19.9, '5초 끝. 지구는 다시 돌지만<br>나는 <span class="hl">한강</span>에 풍덩']];
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
function text(t) {
  const T = storyT(t), tt = $('title');
  if (!tt.dataset.ok) { let k = 0; tt.innerHTML = TITLE.map(w => w === '<br>' ? '<br>' : `<span class="w" data-i="${k++}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.2 - i * 0.14) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(2.6, 3.0, t);
  let lab, val, sub;
  if (t < T0) { lab = '지구 정지까지'; val = '0:0' + (T0 - t).toFixed(3); sub = '서울의 자전 속도 시속 1,327km'; }
  else { const Tc = Math.min(T, 5); lab = t < T1 ? '지구 정지 · 경과 시간' : '지구 다시 회전'; val = 'T+' + Tc.toFixed(3) + '초'; const d = D(Tc); sub = `동쪽으로 ${d < 1000 ? Math.round(d) + 'm' : (d / 1000).toFixed(2) + 'km'}`; }
  $('lab').innerHTML = '<b></b>' + lab; $('val').textContent = val; $('sub').textContent = sub;
  const pop = Math.max(0, 1 - Math.abs(t - T0) / 0.25) + Math.max(0, 1 - Math.abs(t - T1) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pop})`; $('val').style.transformOrigin = 'left center';
  $('big').style.opacity = 0; $('hud').style.opacity = smooth(0.1, 0.4, t) * (1 - smooth(END0 - 0.4, END0, t)); $('mark').style.opacity = 1 - smooth(END0, END0 + 0.4, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); } else cp.style.opacity = 0;
  $('flash').style.opacity = 0;
  $('end').style.opacity = smooth(END0, END0 + 0.5, t); $('endT').style.opacity = smooth(END0 + 0.3, END0 + 0.9, t); $('endS').style.opacity = smooth(END0 + 0.8, END0 + 1.4, t);
}
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0; worldAt(t); camAt(t); shootTo(RTA, hw, hCam); composite(0, 1, 1); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
