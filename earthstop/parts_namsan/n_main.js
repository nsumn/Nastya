// =================== "만약 남산타워가 로켓이라면?" — 33 s. Banpo park at dusk (h_set.js), Namsan moved to its real distance (4.6 km), the tower lifts off.
// Mission time T (s): countdown to 0 at t=3, real time until the sound reaches the park (T=13.5, t=16.5), then a speed ramp to orbit (T=510 = 8:30 at t=25).
// Numbers: tools/namsan_math.py. Thrust/fuel = MODEL.
const $ = id => document.getElementById(id);
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const END0 = 30.5, T_SND = 13.5;
function missionT(t) { if (t < 19.5) return t - 3; if (t < 25) return 16.5 * Math.pow(510 / 16.5, (t - 19.5) / 5.5); return 510 + (t - 25) * 30; }
function altM(T) { if (T <= 0) return 0; if (T < 60) return 0.5 * 4.9 * T * T; return 8820 + (400000 - 8820) * Math.pow(smooth(60, 510, T), 1.3); }
function downM(T) { return T < 20 ? 0 : 1.2e6 * Math.pow(smooth(20, 600, T), 1.6); }
// hide what this video does not use
foamAt(-1); splashAt(0, 0, 0, 0); bedStuff.visible = false; vanishRing.visible = false; ferry.visible = true;
for (const o of [plane, trail, iss, issRing]) o.visible = false;
// ---- Namsan at its real distance; the tower becomes a rocket ----
namsan.position.set(-560, 0, -4560);
const NTW = namsan.children.find(c => Math.abs(c.position.y - 255) < 0.1), TW0 = NTW.position.clone();
const nozM = new THREE.MeshStandardMaterial({ color: '#3a3a40', roughness: 0.35, metalness: 0.9 });
for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 2, r = i === 6 ? 0 : 4.2, n = mesh(new THREE.CylinderGeometry(1.2, 2.2, 4, 16, 1, true), nozM); n.position.set(Math.cos(a) * r, -2, Math.sin(a) * r); NTW.add(n); }
const flameMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uK: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT, uK; varying vec2 vUv; float h(float n){ return fract(sin(n)*43758.5453); }
    void main(){ float y=vUv.y; float fl=0.85+0.15*sin(uT*47.0+y*30.0)+0.1*h(floor(uT*30.0)+floor(y*12.0));
      vec3 core=vec3(4.0,3.4,2.4), edge=vec3(3.2,1.1,0.25); vec3 c=mix(edge, core, smoothstep(0.35,1.0,y)); float a=smoothstep(0.0,0.35,y)*fl*uK;
      gl_FragColor=vec4(c*a, a); }` });
const flame = mesh(new THREE.ConeGeometry(9, 1, 24, 1, true), flameMat, false, false); flame.rotation.x = Math.PI; NTW.add(flame);   // tip down (uv.y = 1 at the nozzles)
const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,160,60,.6)'); gr.addColorStop(1, 'rgba(255,100,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
  color: new THREE.Color(3, 2, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); NTW.add(flameGlow);
const TWM = NTW.children.find(c => c.material && c.material.emissive).material, TWE0 = TWM.emissiveIntensity;
const fireLight = new THREE.PointLight(0xffa050, 0, 0, 2); hw.add(fireLight);
// smoke: a ground cloud boiling out around the summit + a column left along the climb
const puffTex = canvasTex(128, 128, (g) => { for (let i = 0; i < 9; i++) { const x = 64 + R(-22, 22), y = 64 + R(-22, 22), r = R(22, 40), gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } });
const SMOKE = []; { seed = 3901; for (let i = 0; i < 520; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#b8b0a8', transparent: true, depthWrite: false, fog: true, opacity: 0 }));
  const col = i >= 260; s.userData = { col, t0: col ? (i - 260) / 260 * 60 : R(0.0, 10), a: R(0, 6.28), v: R(8, 30), r0: R(10, 40), sc: R(40, 110), rot: R(0, 6) }; s.material.rotation = s.userData.rot; hw.add(s); SMOKE.push(s); } }
function rocketPosW(T) { const b = namsan.position; return V3(b.x + downM(T) * 0.25, b.y + TW0.y + altM(T), b.z); }
function smokeAt(T, t) { for (const s of SMOKE) { const u = s.userData, a = T - u.t0; if (a <= 0 || T <= 0) { s.material.opacity = 0; continue; }
  let p, sc; if (!u.col) { const r = u.r0 + 340 * (1 - Math.exp(-u.v * Math.pow(a, 0.75) * 6 / 340)); p = V3(namsan.position.x + Math.cos(u.a) * r, TW0.y - 10 + Math.min(60, a * 4) + 30 * Math.sin(u.a * 3), namsan.position.z + Math.sin(u.a) * r * 0.8); sc = u.sc * (1 + a * 0.35); }
  else { p = rocketPosW(u.t0).add(V3(Math.cos(u.a) * 8 * a, -10 + Math.sin(u.a) * 4 * a, Math.sin(u.a) * 8 * a)); sc = u.sc * (0.6 + a * 0.25); }
  s.position.copy(p); s.scale.set(sc, sc, 1); const nz = rocketPosW(T).add(V3(0, -40, 0)), near = Math.pow(Math.max(0, 1 - p.distanceTo(nz) / 160), 2) * (T < 70 ? 1 : 0);
  s.material.color.setRGB(0.62 + 0.75 * near, 0.62 + 0.3 * near, 0.64 - 0.1 * near); s.material.opacity = 0.75 * smooth(0, 1.2, a) * (1 - smooth(120, 300, a)); } }
// ---- the rocket in space (km): a scaled clone of the tower + flame + a glow marker ----
const spRocket = new THREE.Group(); sp.add(spRocket);
{ const c = NTW.clone(true); c.position.set(0, 0, 0); c.scale.setScalar(0.001); spRocket.add(c); }
const spFlame = spRocket.children[0].children.find(o => o.material === flameMat);
const spGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameGlow.material.map, color: new THREE.Color(4, 2.6, 1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, depthTest: true })); sp.add(spGlow);
const spTrail = mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.7), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), false, false); sp.add(spTrail);
function rocketPosK(T) { const a = downM(T) / 1000 / RE, r = RE + altM(T) / 1000; return V3(Math.sin(a) * r, Math.cos(a) * r - RE, 0); }
// ---- state ----
function heroSitWatch(t, look) { const P = hero; P.outer.rotation.order = 'YXZ'; P.outer.rotation.x = 0; P.torso.rotation.set(0, 0, 0); P.head.rotation.set(-0.12 * look, 0, 0);
  P.outer.position.set(HERO_MAT.x - 0.1, 0.17, HERO_MAT.z + 0.15); P.outer.rotation.y = Math.PI - 0.1; sitPose(P, t, 0); P.arms[1].rotation.set(-0.55, 0, 0.05); P.elbows[1].rotation.x = -1.35;
  P.outer.updateMatrixWorld(true); const hp = V3(0, -0.28, 0.05); P.elbows[1].localToWorld(hp); heroPhone.position.copy(hp); heroPhone.lookAt(namsan.position.clone().setY(300)); heroPhone.rotateY(Math.PI); }
function worldAt(t) {
  const T = missionT(t); carsAt(t); fishAt(t); grassU.uT.value = t; setJets(t, 32, 1, WATER_Y); river.material.uniforms.uHR.value = -1;
  // rocket
  const lift = T > 0, h = altM(T), burn = T > -0.4 && T < 520 ? smooth(-0.4, 0.6, T) : 0;
  NTW.position.set(TW0.x + downM(T) * 0.25, TW0.y + h, TW0.z); NTW.rotation.z = -0.9 * smooth(20, 200, T);
  flame.visible = burn > 0.01; const fl = (60 + 30 * Math.sin(t * 23)) * (1 + smooth(5, 60, T) * 3); flame.scale.set(1.5 + smooth(10, 60, T), fl * 1.3, 1.5 + smooth(10, 60, T)); flame.position.y = -4 - fl * 1.3 / 2;
  flameMat.uniforms.uT.value = t; flameMat.uniforms.uK.value = burn; flameGlow.visible = burn > 0.01; flameGlow.position.y = -12; flameGlow.scale.setScalar(110 * burn * (1 + 0.1 * Math.sin(t * 31)));
  fireLight.position.copy(rocketPosW(T)).add(V3(0, -20, 0)); fireLight.intensity = 6e7 * burn * (1 + 0.15 * Math.sin(t * 29)) / (1 + Math.max(0, h - 300) / 1500);
  hHemi.color.setRGB(0.44, 0.52, 0.78).lerp(new THREE.Color(1.0, 0.6, 0.35), 0.35 * burn * (h < 3000 ? 1 : 0.3));
  smokeAt(T, t);
  // fog thins as the camera climbs (set in camAt)
  // sound arrives at the park
  const shock = T >= T_SND ? Math.exp(-(T - T_SND) * 1.4) : 0; grassU.uWind.value = 0.6 * shock; river.material.uniforms.distortionScale.value = 0.7 + 4 * shock + (T > T_SND ? 0.8 : 0);
  heroSitWatch(t, smooth(3, 20, t)); const f = t < 3 ? 'happy' : t < 6 ? 'surprised' : t < 16.5 ? 'surprised' : t < 19.5 ? 'surprised' : t < 27.5 ? 'happy' : 'dumb'; hero.face(FACE_OK(f), t);
  CROWD.forEach((P, i) => { sitPose(P, t, i); P.outer.rotation.order = 'YXZ'; P.outer.rotation.y = Math.PI + (i % 5 - 2) * 0.12; const up = (i % 3 === 0) && t > 8 + (i % 4) * 0.6; if (up) { P.outer.position.y = 0.95; for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02; P.arms[0].rotation.set(0, 0, 0); P.arms[1].rotation.set(-0.55, 0, 0.05); P.elbows[1].rotation.x = -1.35; } else P.outer.position.y = 0.17;
    P.outer.position.x += shock * 0.02 * Math.sin(t * 50 + i); });
  // space
  const rk = rocketPosK(T); spRocket.position.copy(rk); spRocket.rotation.z = -0.9 * smooth(20, 200, T) - downM(T) / 1000 / RE; spGlow.position.copy(rk); spGlow.scale.setScalar(Math.max(0.4, 0.004 * spCam.position.distanceTo(rk)) * burn);
  const r0 = rocketPosK(Math.max(1, T * 0.35)); spTrail.position.copy(r0.clone().lerp(rk, 0.5)); spTrail.scale.set(0.15 + 0.002 * spCam.position.distanceTo(rk), r0.distanceTo(rk), 0.15 + 0.002 * spCam.position.distanceTo(rk)); spTrail.lookAt(rk); spTrail.rotateX(Math.PI / 2); spTrail.visible = T > 30 && T < 520;
  return T;
}
const FACE_OK = f => f;   // all names exist in d_block FACE
// ---- cameras ----
let USE_SP = false;
const LOOKC = (cam, p, l, fov) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function camAt(t, T) {
  USE_SP = false; TWM.emissiveIntensity = TWE0; dof(hCam, 1, 0); hCam.near = 0.05; hw.fog.density = 0.00048; hCam.far = 40000; const hd = (hero.outer.updateMatrixWorld(true), hero.head.getWorldPosition(V3(0, 0, 0)));
  const NS = namsan.position, TOP = V3(NS.x, TW0.y + 120, NS.z), rk = rocketPosW(T);
  if (t < 3) {   // S1 over his shoulder, Namsan across the river, slow push
    const u = ease(span(t, 0, 3)); const p = hd.clone().add(V3(0.45, 0.18, 0.9)); const l = TOP.clone(); LOOKC(hCam, p, l, lerp(26, 20, u)); hw.fog.density = 0.00022; dof(hCam, 4000, 6 * (1 - u)); aimSun(hd.x, hd.z); return; }
  if (t < 7) {   // S2 on the hill: ignition, the tower lifts
    const u = ease(span(t, 3, 7)), p = NS.clone().add(V3(lerp(380, 300, u), lerp(330, 360, u), lerp(560, 470, u))); LOOKC(hCam, p, V3(NS.x, rk.y + 20, NS.z), 42); TWM.emissiveIntensity = 0.12; hCam.near = 0.5; hw.fog.density = 0.00012;
    const sh = 0.6 * smooth(3, 3.4, t) * Math.sin(t * 40); hCam.position.y += sh; aimSun(NS.x, NS.z); return; }
  if (t < 10.5) {   // S3 the park: the river turns orange, people stand up
    const u = ease(span(t, 7, 10.5)), p = V3(lerp(9, 6, u), lerp(1.4, 1.8, u), lerp(14, 11, u)); LOOKC(hCam, p, V3(NS.x, 200 + (rk.y - 255) * 0.6, NS.z), 30); hw.fog.density = 0.00022; dof(hCam, 9, 3); aimSun(0, 4); return; }
  if (t < 13) {   // S4 low under the rising tower, smoke boiling around the summit
    const u = ease(span(t, 10.5, 13)), p = NS.clone().add(V3(lerp(-900, -760, u), lerp(420, 520, u), lerp(1500, 1350, u))); LOOKC(hCam, p, V3(NS.x, (TW0.y + rk.y) * 0.5 + 60, NS.z), 40); TWM.emissiveIntensity = 0.35; hCam.near = 0.5; hw.fog.density = 0.00012; aimSun(NS.x, NS.z); return; }
  if (t < 16.5) {   // S5 his face, lit by the far fire, waiting for the sound
    const f = V3(Math.sin(Math.PI - 0.1), 0, Math.cos(Math.PI - 0.1)), u = span(t, 13, 16.5), p = hd.clone().addScaledVector(f, lerp(1.6, 1.25, ease(u))).add(V3(0.35, -0.12, 0));
    LOOKC(hCam, p, hd.clone().add(V3(0, -0.1, 0)), 32); dof(hCam, p.distanceTo(hd), 9); aimSun(hd.x, hd.z); return; }
  if (t < 19.5) {   // S6 the sound hits: shaking side view of the picnic row
    const sh = 0.05 * Math.exp(-(t - 16.5) * 1.3) * (t > 16.5 ? 1 : 0), u = span(t, 16.5, 19.5), p = hd.clone().add(V3(lerp(3.2, 2.8, u) + sh * Math.sin(t * 61), 0.2 + sh * Math.cos(t * 53), lerp(1.4, 1.0, u)));
    LOOKC(hCam, p, hd.clone().add(V3(-2, 0.1, -3)), 36); dof(hCam, p.distanceTo(hd), 5); aimSun(hd.x, hd.z); return; }
  if (t < 22) {   // S7 chase the climb over the city lights
    const u = span(t, 19.5, 22), off = V3(lerp(260, 900, u), lerp(-80, -500, u), lerp(420, 1100, u)); LOOKC(hCam, rk.clone().add(off), rk.clone().add(V3(0, -40, 0)), 40); hCam.near = 1; hCam.far = 60000;
    hw.fog.density = lerp(0.00012, 0.00002, smooth(500, 9000, rk.y)); aimSun(rk.x, rk.z); return; }
  USE_SP = true;
  if (t < 25) {   // S8 space: from beside the rocket out to the Earth's curve
    const u = ease(span(t, 22, 25)), rkK = rocketPosK(T), off = V3(lerp(1.5, 380, u), lerp(-0.6, 160, u), lerp(2.5, 520, u)); LOOKC(spCam, rkK.clone().add(off), rkK.clone().lerp(V3(0, -RE * 0.02, 0), u * 0.4), lerp(40, 46, u)); spSky(rkK.y); return; }
  if (t < 27.5) {   // S9 orbit over Korea at night
    const rkK = rocketPosK(T), u = span(t, 25, 27.5); LOOKC(spCam, rkK.clone().add(V3(-250 + 60 * u, 220, 420)), rkK.clone().add(V3(0, -200, 0)), 46); spSky(400); return; }
  USE_SP = false;   // S10 back at the park: Namsan without its tower
  const u = ease(span(t, 27.5, END0)), p = hd.clone().add(V3(lerp(0.6, 0.4, u), 0.2, lerp(1.0, 0.7, u))); LOOKC(hCam, p, V3(NS.x, 300, NS.z), lerp(30, 24, u)); hw.fog.density = 0.00022; dof(hCam, 4000, 5); aimSun(hd.x, hd.z);
}
// ---- text ----
const TITLE = ['만약', '<span class="hl">남산타워</span>가', '<br>', '로켓이라면?'];
const CAPS = [[3.3, 6.8, '높이 237m — 스타십의 <span class="hl">2배</span>'], [7.3, 10.3, '빛은 <span class="hl">바로</span> 온다'], [10.6, 12.9, '소리는 <span class="hl">아직</span> 오는 중…'],
  [13.2, 16.3, '반포에서 남산까지 <span class="hl">4.6km</span>'], [16.7, 19.3, '소리는 <span class="hl">13.5초</span> 늦게 도착한다'], [19.7, 24.6, '<span class="m">MODEL</span>우주정거장 높이 <span class="hl">400km</span>까지 8분 30초'],
  [25.1, 27.4, '초속 <span class="hl">7.7km</span> · 92분에 지구 한 바퀴'], [27.8, 30.3, '남산엔 이제 <span class="hl">산</span>만 남았다']];
const fmtMT = T => { const s = Math.max(0, T), m = Math.floor(s / 60); return `T+${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`; };
let lastCap = '';
function kineticHTML(html) { const out = []; let i = 0; for (const p of html.split(/(<[^>]+>)/)) { if (!p) continue; if (p.startsWith('<')) { out.push(p); continue; } for (const w of p.split(/(\s+)/)) { if (!w) continue; if (/^\s+$/.test(w)) out.push(w); else out.push(`<span class="w" data-i="${i++}">${w}</span>`); } } return out.join(''); }
function text(t) {
  const T = missionT(t), tt = $('title');
  if (!tt.dataset.ok) { tt.innerHTML = TITLE.map((w, i) => w === '<br>' ? '<br>' : `<span class="w" data-i="${i}">${w}</span>`).join(' '); tt.dataset.ok = 1; }
  tt.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - 0.25 - i * 0.2) / 0.35, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 26}px) scale(${0.9 + 0.1 * easeOutBack(k)})`; });
  tt.style.opacity = 1 - smooth(2.7, 3.2, t);
  let lab, val, sub = '';
  if (t < 3) { lab = '발사까지'; val = '0:0' + (3 - t).toFixed(3); }
  else { lab = '남산타워 · 비행 시간'; val = fmtMT(T); const alt = altM(T); sub = T < T_SND ? `소리 도착까지 ${(T_SND - T).toFixed(1)}초` : `고도 ${alt < 10000 ? Math.round(alt).toLocaleString('ko-KR') + 'm' : Math.round(alt / 1000) + 'km'}`; }
  $('lab').innerHTML = '<b></b>' + lab; $('val').textContent = val; $('sub').textContent = sub;
  const pop = Math.max(0, 1 - Math.abs(t - 3) / 0.25) + Math.max(0, 1 - Math.abs(t - 16.5) / 0.25); $('val').style.transform = `scale(${1 + 0.12 * pop})`; $('val').style.transformOrigin = 'left center';
  $('big').style.opacity = 0; $('hud').style.opacity = smooth(0.1, 0.4, t) * (1 - smooth(27.3, 27.7, t)); $('mark').style.opacity = 1 - smooth(END0, END0 + 0.4, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]), cp = $('cap');
  if (c) { if (lastCap !== c[2]) { cp.innerHTML = kineticHTML(c[2]); lastCap = c[2]; } cp.style.opacity = 1 - smooth(c[1] - 0.2, c[1], t);
    cp.querySelectorAll('span.w').forEach(e => { const i = +e.dataset.i, k = clamp((t - c[0] - i * 0.07) / 0.28, 0, 1); e.style.opacity = k; e.style.transform = `translateY(${(1 - easeOutBack(k)) * 18}px)`; }); } else cp.style.opacity = 0;
  $('flash').style.opacity = 0.35 * Math.max(0, 1 - Math.abs(t - 3.05) / 0.15) + 0.25 * Math.max(0, 1 - Math.abs(t - 16.5) / 0.1);
  $('end').style.opacity = smooth(END0, END0 + 0.5, t); $('endT').style.opacity = smooth(END0 + 0.3, END0 + 0.9, t); $('endS').style.opacity = smooth(END0 + 0.8, END0 + 1.4, t);
}
// ---- render ----
function frameAt(t) { const T = worldAt(t); camAt(t, T); if (USE_SP) { spCam.aspect = W / H; shootTo(RTA, sp, spCam); dof(spCam, 1, 0); } else shootTo(RTA, hw, hCam); }
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => (t >= 19.5 && t < 25) || (t >= 16.4 && t < 17.2);
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.5) { renderer.setRenderTarget(null); renderer.setClearColor('#0e0f13', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0;
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
