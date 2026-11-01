// =================== STORY: "만약 달팽이 속도가 1초마다 2배가 된다면?" — MODEL: 1.5 mm/s ×2 every second from t = 2 (tools/snail_math.py) ===================
const N0 = 2.0, NN = 24, END0 = 28.5;
const nAtS = t => clamp(Math.floor(t - N0) + 1, 0, NN);
const vS = t => t < N0 ? 0.0015 : 0.0015 * Math.pow(2, Math.min(NN, t - N0 + 1));                       // smooth version for motion
const dS = t => t < N0 ? 0.0015 * t : 0.003 + 0.0015 / Math.LN2 * (Math.pow(2, Math.min(NN, t - N0 + 1)) - 2) + (t > N0 + NN - 1 ? 0.0015 * Math.pow(2, NN) * (t - (N0 + NN - 1)) : 0);
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// snail path (metres, kw): along the curb top, off its end onto the promenade edge, then along the river (+x)
const CURB_END = CURB.x1 + 3.0;
function snailPos(t) { const x = CURB.x0 + dS(t); if (x < CURB_END) return V3(x, CURB.h, CURB.z); const k = Math.min(1, (x - CURB_END) / 0.6); return V3(x, CURB.h * (1 - k) + 0.02 * k, lerp(CURB.z, -6.4, k)); }
const snail = makeSnail(); snail.rotation.y = Math.PI / 2; kw.add(snail);
// speed streak behind the snail (reads at any scale)
const streakSM = new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
const sStreak = mesh(new THREE.CylinderGeometry(1, 0.15, 1, 12, 1, true), streakSM, false, false); sStreak.rotation.z = Math.PI / 2; kw.add(sStreak);
const glowT = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(190,225,255,.7)'); gr.addColorStop(1, 'rgba(160,210,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); kw.add(glow);
const boomS = mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); kw.add(boomS);
// people on the promenade: walker 1.4 m/s, cyclist 5 m/s, runner 12 m/s — placed so the snail passes them at 11.6 / 13.1 / 14.1 s
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
function place(P, x, z, ry, y = 0) { P.outer.position.set(x, y, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
function walkCycle(P, ph, amp = 1) { rotL(P, 'thigh_l', [1, 0, 0], 0.4 * amp * Math.sin(ph)); rotL(P, 'thigh_r', [1, 0, 0], -0.4 * amp * Math.sin(ph)); rotL(P, 'calf_l', [1, 0, 0], 0.5 * amp * Math.max(0, Math.sin(ph + 1.6))); rotL(P, 'calf_r', [1, 0, 0], 0.5 * amp * Math.max(0, -Math.sin(ph + 1.6)));
  rotL(P, 'upperarm_l', [1, 0, 0], -0.35 * amp * Math.sin(ph)); rotL(P, 'upperarm_r', [1, 0, 0], 0.35 * amp * Math.sin(ph)); }
const PEOPLE = [{ P: makeHuman('girl', { tee: 'pink' }), v: 1.4, tp: 11.6, z: -6.9, kind: 'walk' }, { P: makeHuman('man2'), v: 5.2, tp: 13.1, z: -7.3, kind: 'bike' }, { P: makeHuman('hero', { tee: 'navy' }), v: 12.0, tp: 14.15, z: -7.0, kind: 'run' }];
PEOPLE.forEach(p => { kw.add(p.P.outer); p.x0 = snailPos(p.tp).x - p.v * p.tp; });
const bike = new THREE.Group(); { const fr = M('#2f6fb0', { metalness: 0.5, roughness: 0.4 }); for (const x of [-0.55, 0.55]) { const w = mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 24), M('#151515')); w.position.set(x, 0.35, 0); bike.add(w); } bx(1.1, 0.04, 0.04, fr, 0, 0.62, 0, bike); bx(0.04, 0.5, 0.04, fr, -0.15, 0.6, 0, bike); bx(0.25, 0.05, 0.12, '#222', -0.15, 0.88, 0, bike); bx(0.05, 0.5, 0.45, fr, 0.5, 0.85, 0, bike); } kw.add(bike);
const CAP = [[0.0, 0, ''], [2.1, 4.9, '…<span class="hl">스윽.</span>'], [5.0, 7.9, '<span class="hl">개미</span>랑 나란히.'], [8.0, 10.9, '10초 동안 겨우 <span class="hl">77cm.</span>'], [11.05, 11.95, '<span class="hl">걷는 사람</span> 추월.'],
  [12.05, 13.45, '<span class="hl">자전거</span> 추월.'], [13.5, 14.95, '<span class="hl">우사인 볼트</span>와 같은 속도.'], [15.05, 16.95, '<span class="hl">자동차</span>를 따라잡고…'], [17.0, 18.95, '<span class="hl">KTX</span> 추월!'], [19.0, 20.95, '<span class="hl">음속 돌파!</span> (343m/s)'],
  [21.0, 22.95, '<span class="hl">총알</span>보다 빠르게.'], [23.0, 23.95, '지구가 둥글어서…<br><span class="hl">땅이 멀어집니다.</span>'], [24.0, 25.95, '<span class="hl">지구 탈출 속도</span><br>(11.2km/s) 돌파!'], [26.05, 28.4, '…<span class="hl">집</span>은 챙겨 감. 🏠']];
const $ = id => document.getElementById(id);
const fmtV = v => v < 0.01 ? (v * 1000).toFixed(1) + ' mm/s' : v < 1 ? (v * 100).toFixed(1) + ' cm/s' : v < 1000 ? (v < 10 ? v.toFixed(1) : Math.round(v)).toLocaleString('ko-KR') + ' m/s' : (v / 1000).toFixed(1) + ' km/s';
function text(t) {
  const n = nAtS(t), pulse = n > 0 ? Math.max(0, 1 - (t - (N0 + n - 1)) / 0.3) : 0, v = 0.0015 * Math.pow(2, n);
  $('lab').textContent = '달팽이 속도'; $('val').textContent = fmtV(v); $('val').style.transform = `scale(${1 + 0.18 * pulse})`; $('val').style.transformOrigin = 'left center';
  $('sub').textContent = n ? `${n}번째 · 1초마다 ×2` : '1초마다 ×2';
  $('hud').style.opacity = 1 - smooth(28.3, 28.7, t); $('title').style.opacity = 1 - smooth(1.6, 2.0, t); $('mark').style.opacity = 1 - smooth(28.3, 28.7, t);
  const c = CAP.find(c => t >= c[0] && t < c[1] && c[2]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  if (c) { const k = clamp((t - c[0]) / 0.25, 0, 1); $('cap').style.transform = `scale(${k >= 1 ? 1 : 0.82 + 0.18 * easeOutBack(k)})`; }
  $('flash').style.opacity = 0.75 * Math.max(0, 1 - Math.abs(t - 19.0) / 0.12);
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
// overlay scene for the snail close-up in space (metres)
const snS = new THREE.Scene(); snS.environment = kw.environment; snS.environmentIntensity = 0.6; { const l = new THREE.DirectionalLight(0xfff4e6, 3.2); l.position.set(-2, 3, 4); snS.add(l); snS.add(new THREE.HemisphereLight(0x9cc0ff, 0x203040, 0.7)); }
const snCam = new THREE.PerspectiveCamera(40, W / H, 0.002, 100);
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; };
function frameAt(t) {
  compMat.uniforms.uLook.value = 0.0; compMat.uniforms.uTilt.value = 0;
  if (t < 23) {
    if (snail.parent !== kw) kw.add(snail);
    const p = snailPos(t), v = vS(t); snail.position.copy(p); snail.scale.setScalar(1); snail.rotation.set(0, Math.PI / 2, 0); snailAnim(snail, t, 1);
    if (p.x > CURB_END) snail.rotation.z = -0.2 * Math.max(0, 1 - (p.x - CURB_END) / 0.6);
    // slime trail
    const x0 = CURB.x0, x1 = Math.min(p.x, CURB_END); slime.visible = x1 > x0 + 0.01; slime.scale.set(x1 - x0, 1, 1); slime.position.set((x0 + x1) / 2, CURB.h + 0.0012, CURB.z);
    // ant: 5 cm/s along the curb, a little ahead at 5 s, level at ~7 s, then left behind
    const ax = CURB.x0 - 0.12 + 0.05 * t; ant.position.set(ax, CURB.h, CURB.z - 0.035); ant.visible = t < 11; ant.children.forEach((c, i) => { if (i > 2) c.rotation.x = 0.4 * Math.sin(t * 30 + i); });
    // speed streak
    const sl = Math.min(3000, v * 0.12); streakSM.opacity = 0.75 * smooth(10.5, 13, t); sStreak.visible = streakSM.opacity > 0.01; const r = Math.max(0.004 + 0.002 * Math.log2(1 + v), kCam.position.distanceTo(p) * 0.006);
    sStreak.scale.set(r, sl, r); sStreak.position.set(p.x - sl / 2 - 0.03, p.y + 0.012, p.z);
    // people
    PEOPLE.forEach((q, i) => { const P = q.P; poseRest(P); const x = q.x0 + q.v * t; place(P, x, q.z, Math.PI / 2); armsDown(P, 0.9);
      if (q.kind === 'bike') { P.outer.position.y = 0.42; for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.2 + 0.4 * Math.sin(t * 9 + (s === 'l' ? 0 : 3.14))); rotL(P, 'calf_' + s, [1, 0, 0], 1.1); } rotL(P, 'spine_01', [1, 0, 0], 0.35); rotL(P, 'upperarm_l', [1, 0, 0], -0.9); rotL(P, 'upperarm_r', [1, 0, 0], -0.9); bike.position.set(x + 0.15, 0, q.z); bike.rotation.y = 0; }
      else walkCycle(P, t * (q.kind === 'run' ? 16 : 6.5) + i, q.kind === 'run' ? 1.7 : 1);
      if (q.kind === 'run') rotL(P, 'spine_01', [1, 0, 0], 0.2);
      fingers(P, 'l', 0.4, 0.2); fingers(P, 'r', 0.4, 0.2); face(P, t > q.tp - 0.2 && t < q.tp + 1.2 ? 'shocked' : 'neutral', t); P.outer.visible = t > 9 && t < 16; });
    bike.visible = t > 9 && t < 16;
    CARS.forEach(c => { c.g.position.set(snailPos(15.6).x + c.x0 + c.v * (t - 15.6), 0, c.lane); c.g.visible = t > 13 && t < 21; });
    ktx.position.x = snailPos(17.0).x + 40 + 83 * (t - 17.0); ktx.visible = t > 14 && t < 21;
    glow.visible = t > 14.5; glow.position.copy(p).add(V3(0, 0.02, 0)); glow.scale.setScalar(Math.max(0.05, kCam.position.distanceTo(p) * 0.06)); glow.material.opacity = smooth(14.5, 15.5, t);
    const bk = (t - 19.0) / 0.8; boomS.visible = bk > 0 && bk < 1; boomS.position.copy(p).add(V3(0, 0.05, 0)); boomS.rotation.y = Math.PI / 2; boomS.scale.setScalar(0.5 + bk * 40); boomS.material.opacity = 0.8 * (1 - bk);
    cloudDeck.visible = false;
    // cameras
    const sh = t < 2 ? 0 : t < 5 ? 1 : t < 8 ? 2 : t < 11 ? 3 : t < 15 ? 4 : t < 19 ? 5 : 6, u = sh === 0 ? t / 2 : sh <= 3 ? ((t - 2) % 3) / 3 : sh === 4 ? (t - 11) / 4 : sh === 5 ? (t - 15) / 4 : (t - 19) / 4, U = u * u * (3 - 2 * u);
    if (sh === 0) LOOK(kCam, p.clone().add(V3(0.11 - 0.03 * U, 0.03, 0.09)), p.clone().add(V3(0, 0.012, 0)), 38);                                        // macro: face of the snail
    else if (sh === 1) { const a = 0.9 - 1.3 * U; LOOK(kCam, p.clone().add(V3(Math.cos(a) * 0.14, 0.035 + 0.02 * U, Math.sin(a) * 0.14)), p.clone().add(V3(0, 0.012, 0)), 40); }   // slow arc around it
    else if (sh === 2) LOOK(kCam, p.clone().add(V3(-0.02, 0.03, 0.2)), p.clone().add(V3(0.02, 0.008, -0.02)), 40);                                          // side: the ant level with it
    else if (sh === 3) LOOK(kCam, p.clone().add(V3(-0.35 - 0.2 * U, 0.12, 0.28)), p.clone().add(V3(0.2, 0, 0)), 44);                                        // behind: it starts to glide
    else if (sh === 4) LOOK(kCam, p.clone().add(V3(-1.7, 0.45 + 0.3 * U, 0.35)), p.clone().add(V3(2.0, 0.5, -1.6)), 56);                                     // tracking on the promenade
    else if (sh === 5) LOOK(kCam, p.clone().add(V3(-6, 3 + 2 * U, -9)), p.clone().add(V3(8, 2, 16)), 52);                                                  // tracking, road + KTX beyond
    else { const h = 40 * Math.pow(30, u); LOOK(kCam, p.clone().add(V3(-h * 0.6, h, h * 0.9)), p.clone().add(V3(h * 0.5, 0, 0)), 50); }                      // aerial: the streak over Seoul
    kCam.near = sh <= 3 ? 0.004 : sh === 4 ? 0.02 : 0.1; kCam.far = 90000; const camD = kCam.position.distanceTo(p); kw.fog.near = Math.max(900, camD * 1.5); kw.fog.far = Math.max(16000, camD * 8);
    if (sh <= 3) compMat.uniforms.uTilt.value = 0.012;   // macro: shallow focus look
    const sb = sh <= 3 ? 1.5 : 14; Object.assign(kSun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 1, far: 120 }); kSun.shadow.camera.updateProjectionMatrix(); kSun.position.copy(p).addScaledVector(SUN_DIR, 40); kSun.target.position.copy(p);
    { const cd = kCam.position.distanceTo(p); glow.scale.setScalar(Math.max(0.05, cd * 0.06)); const sl = Math.min(3000, v * 0.12), r = Math.max(0.004 + 0.002 * Math.log2(1 + v), cd * 0.006); sStreak.scale.set(r, sl, r); sStreak.position.set(p.x - sl / 2 - 0.03, p.y + 0.012, p.z); }
    shootTo(RTA, kw, kCam); return true;
  }
  if (t < 26) {   // ----- space, km: the snail leaves along the tangent while the Earth curves away -----
    const dk = dS(t) / 1000, sp0 = V3(dk, Math.max(0.01, dk * dk / (2 * RE)) * 0 + 0.01, -0.006);
    trail.visible = true; trail.scale.set(3, dk, 3); trail.position.set(dk / 2, 0.01, 0); trail.rotation.set(0, 0, Math.PI / 2); trail.material.opacity = 0.9;
    plane.visible = iss.visible = false; issRing.visible = true; issRing.position.copy(sp0); issRing.quaternion.copy(spCam.quaternion); const u = (t - 23) / 3;
    LOOK(spCam, V3(-300 + 200 * u, 260 + 900 * u * u, 1400 + 1600 * u), V3(dk * 0.5 + 150, 0, 0), 44); spCam.near = 1; spCam.far = 200000; spCam.aspect = W / H; spCam.updateProjectionMatrix();
    issRing.scale.setScalar(spCam.position.distanceTo(sp0) * 0.025); spSky(200);
    renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam); return true;
  }
  // ----- close-up of the snail in space, Earth behind (overlay) -----
  trail.visible = issRing.visible = false; if (snail.parent !== snS) snS.add(snail);
  snail.position.set(0, 0, 0); snail.rotation.set(0.2, Math.PI / 2 + (t - 26) * 0.4, 0.15 * Math.sin(t)); snailAnim(snail, t, 1.1);
  const u = (t - 26) / 2.5; LOOK(snCam, V3(0.09 - 0.02 * u, 0.04, 0.11 - 0.03 * u), V3(0, 0.01, 0), 40); snCam.aspect = W / H; snCam.updateProjectionMatrix();
  const dk = dS(t) / 1000; spCam.position.set(dk + 300, 120, 600); spCam.lookAt(dk * 0.2, -800, -2000); spCam.fov = 50; spCam.near = 1; spCam.far = 200000; spCam.aspect = W / H; spCam.updateProjectionMatrix(); spSky(200);
  renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(snS, snCam); renderer.autoClear = ac; return true;
}
// ---- motion blur (4 sub-frames) on the fast shots ----
const accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const accMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: RTA.texture }, w: { value: 0.25 } }, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tex,vUv).rgb*w,1.0); }' });
const accScene = new THREE.Scene(); accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat));
const MB = t => t >= 11 && t < 23;
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0.05 * Math.max(0, 1 - Math.abs(t - 15.0) / 0.1) + 0.05 * Math.max(0, 1 - Math.abs(t - 19.0) / 0.1);
  if (!MB(t)) { frameAt(t); composite(0, 1, 1); return true; }
  const n = 4, shutter = 0.5 / 30; renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < n; k++) { frameAt(t + (k / (n - 1) - 0.5) * shutter); accMat.uniforms.w.value = 1 / n; const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(accRT); renderer.render(accScene, compCam); renderer.autoClear = ac; }
  compMat.uniforms.tA.value = accRT.texture; composite(0, 1, 1); compMat.uniforms.tA.value = RTA.texture; return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
