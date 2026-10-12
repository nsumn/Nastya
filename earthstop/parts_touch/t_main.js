
// =================== underground (for the sink) ===================
const under = new THREE.Group(); city.add(under);
{
  const ug = new THREE.BoxGeometry(16, 200, 16); ug.translate(HERO.x, -100.03, HERO.z);
  const um = new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `varying vec3 vW;
      float h(float x){ return fract(sin(x*127.1)*43758.5453); }
      void main(){
        float y=-vW.y; float band=floor(y/1.7+0.6*sin(vW.x*0.15+vW.z*0.11));
        vec3 c=mix(vec3(0.42,0.30,0.20),vec3(0.30,0.24,0.20),h(band));
        c=mix(c,vec3(0.36,0.34,0.33),smoothstep(6.0,20.0,y)); c=mix(c,vec3(0.22,0.20,0.20),smoothstep(25.0,80.0,y));
        float n=sin(vW.x*3.1+vW.y*1.7)*sin(vW.z*2.7-vW.y*2.3)*sin(vW.y*5.3+vW.x*1.1); c*=0.82+0.18*n;
        c*=exp(-max(y-3.0,0.0)*0.012);
        gl_FragColor=vec4(c,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  under.add(new THREE.Mesh(ug, um));
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M('#6e655c', { flatShading: true, roughness: 1 }), 900); const d = new THREE.Object3D();
  for (let i = 0; i < 900; i++) { const a = R(0, 6.283), r = R(1.0, 7.5); d.position.set(HERO.x + Math.cos(a) * r, -R(0.6, 120), HERO.z + Math.sin(a) * r); d.rotation.set(R(0, 3), R(0, 3), R(0, 3)); d.scale.set(R(0.1, 0.5), R(0.08, 0.35), R(0.1, 0.5)); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); }
  under.add(rocks);
  for (const [y, z, r, c] of [[-1.6, 0.0, 0.35, '#4a5a66'], [-3.4, 1.3, 0.6, '#5b524a'], [-5.2, -1.0, 0.18, '#a07a2a']]) { const p = mesh(new THREE.CylinderGeometry(r, r, 80, 14), M(c, { roughness: 0.6, metalness: 0.2 })); p.rotation.z = Math.PI / 2; p.position.set(HERO.x, y, HERO.z + z); under.add(p); }
}
const lightUnder = new THREE.PointLight(0xffe0c0, 0, 30, 1.2); city.add(lightUnder);

// =================== state helpers ===================
const G0 = 9.8;
function sinkTau(t) { if (t < SWITCH_END) return 0; if (t < SLOWMO_END) return 0.35 * (t - SWITCH_END); return 0.35 * (SLOWMO_END - SWITCH_END) + (t - SLOWMO_END); }
function sinkDepth(t) { const tau = sinkTau(t); return 0.5 * G0 * tau * tau; }
const baseY = (p) => 0.18 + 0.95;
function sitY(p) { return 0.18 + 0.47 + 0.035 + 0.08 + 0.95 - 0.96 * p.h; }

// =================== cameras ===================
const BACK_HANDS = new THREE.Vector3(0.14, 0.06, -1).normalize();
const handsCam = new THREE.PerspectiveCamera(30, W / H, 0.002, 50);
function hookField(t) { return logKey([[0, 0.21], [1.7, 0.095], [2.6, 0.013]], t); }
function hookGap(t) { return logKey([[0, 0.12], [1.7, 0.006], [2.6, 0.0006]], t); }
function outroField(t) { return logKey([[FUSE_END - 0.4, 0.05], [T_END + 0.6, 0.2]], t); }
function diveField(t) { return logKey([[2.6, 0.013], [4.3, 0.0006], [5.7, 1.1e-5], [7.0, 1.4e-9], [15, 1.15e-9]], t); }
function fmtLen(m) {
  if (m >= 0.01) return (m * 100).toFixed(m >= 0.1 ? 0 : 1) + ' cm';
  if (m >= 0.001) return (m * 1000).toFixed(1) + ' mm';
  if (m >= 1e-6) { const u = m * 1e6; return (u >= 10 ? Math.round(u) : u.toFixed(1)) + ' µm'; }
  const n = m * 1e9; return (n >= 10 ? Math.round(n) : n.toFixed(1)) + ' nm';
}
function layerName(m) { return m > 2e-3 ? 'FINGERTIPS' : m > 5e-5 ? 'SKIN RIDGES' : m > 4e-7 ? 'SKIN CELLS' : m > 6e-9 ? 'MOLECULES' : 'ATOMS'; }

function setDayDusk(dusk) {
  const sun = SUN_DAY.clone().lerp(SUN_DUSK, dusk).normalize();
  domeMat.uniforms.uSunS.value.copy(sun); domeMat.uniforms.uDay.value = lerp(1, 0.55, dusk); domeMat.uniforms.uDusk.value = dusk;
  sunL.color.set(dusk > 0.5 ? 0xffb070 : 0xfff0dc); sunL.intensity = lerp(3.0, 2.2, dusk); hemi.intensity = lerp(1.0, 0.6, dusk);
  hemi.color.set(dusk > 0.5 ? 0xd0a8a0 : 0xbfd6f2);
  city.fog.color.setRGB(lerp(0.62, 0.86, dusk), lerp(0.74, 0.55, dusk), lerp(0.88, 0.42, dusk)); city.fog.near = 160; city.fog.far = 2600;
  for (const m of winMats) m.emissiveIntensity = 0.12 + 0.6 * dusk;
  for (const m of lampHeads) m.emissiveIntensity = 1.6 * dusk;
  clouds.forEach(c => c.material.color.setRGB(1, lerp(1, 0.78, dusk), lerp(1, 0.62, dusk)));
  handSun.color.set(dusk > 0.5 ? 0xffb878 : 0xfff0dc); handSun.intensity = lerp(2.6, 2.4, dusk); handHemi.intensity = lerp(1.1, 0.75, dusk);
  return sun;
}

// =================== update: city ===================
const hideSpots = [HERO, BENCH];
function updateCity(t, camera, dusk) {
  const sun = setDayDusk(dusk);
  sunL.position.copy(camera.position).addScaledVector(sun, 300); sunL.target.position.copy(camera.position).add(new THREE.Vector3(0, 0, 0)); sunL.target.updateMatrixWorld();
  const phase = Math.floor((t + 3) / 6) % 2; TL_STATE.forEach(({ m, i }) => { m.emissiveIntensity = (phase === 0 ? i === 2 : i === 0) ? 2.2 : 0.05; });
  palms.forEach(p => { p.fronds.rotation.y = 0.03 * Math.sin(t * 1.3 + p.ph); });
  for (const c of cars) {
    if (c.cross) continue;
    const x = wrapR(c.x0 + c.dir * c.speed * t, -220, 760);
    c.g.position.set(x, 0, c.lane); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0);
    c.g.visible = Math.hypot(x - camera.position.x, c.lane - camera.position.z) > 6;
  }
  for (const P of people) {
    const o = P.p.outer;
    if (P.kind === 'jump') { o.visible = false; continue; }
    let x, z, ry;
    if (P.kind === 'walk') { x = wrapR(P.x0 + P.v * t, -60, 260); z = P.z; ry = P.v > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else if (P.kind === 'idle') { x = P.x0; z = P.z; ry = P.rotIdle; }
    else { z = wrapR(P.z0 + P.v * t, -12, 12); x = P.x; ry = P.v > 0 ? 0 : Math.PI; }
    const gy = Math.abs(z) > 7 ? 0.18 : 0;
    o.position.set(x, gy + 0.95, z); o.rotation.set(0, ry, 0);
    if (P.kind === 'idle') poseIdle(P.p, t, P.ph); else poseWalk(P.p, t * 1.3 * 4.4 + P.ph);
    o.visible = !hideSpots.some(s => Math.hypot(x - s.x, z - s.z) < 3.2) && Math.hypot(x - camera.position.x, z - camera.position.z) > 2.5;
  }
  ball.visible = false;
  under.visible = camera.position.y < 0.5;
}
// heroes per shot
function poseHeroes(t) {
  const A = heroA, B = heroB;
  A.outer.visible = B.outer.visible = true; A.outer.rotation.set(0, 0, 0); B.outer.rotation.set(0, Math.PI, 0);
  glowA.uniforms.uA.value = 0; glowB.uniforms.uA.value = 0;
  if (t < BENCH_END) {
    // A on the bench, B out of shot
    A.outer.position.set(BENCH.x - 0.15, sitY(A), BENCH.z + 0.02); poseSit(A); A.arms[0].rotation.x = -0.45; A.arms[1].rotation.x = -0.25; A.elbows[0].rotation.x = -0.9; A.elbows[1].rotation.x = -0.7;
    B.outer.visible = false;
    return;
  }
  const HD = 0.125;
  A.outer.position.set(HERO.x, baseY(A), HERO.z - HD); B.outer.position.set(HERO.x, baseY(B), HERO.z + HD);
  const k = smooth(BENCH_END - 0.2, BENCH_END + 0.8, t);
  poseHug(A, k, true); poseHug(B, k, false);
  const g = 0.6 * smooth(22.8, 24.8, t) * (1 - smooth(SWITCH_END + 0.2, SWITCH_END + 1.0, t));
  glowA.uniforms.uA.value = g * (1 + 0.15 * Math.sin(t * 5)); glowB.uniforms.uA.value = g * (1 + 0.15 * Math.sin(t * 5 + 1.3));
  if (t >= SWITCH_END) {
    const d = sinkDepth(t); A.outer.position.y = baseY(A) - d;
    const s = t - SWITCH_END;
    if (s < 0.5) { poseHug(A, 1 - s * 1.2, true); A.arms[0].rotation.x -= s * 2; A.arms[1].rotation.x -= s * 2; }
    else poseFlail(A, t, 0.3);
    // B's arms close on nothing and B stumbles forward into the empty space
    const c = smooth(0.1, 0.9, s);
    poseHug(B, 1, false); B.elbows[0].rotation.z = lerp(B.elbows[0].rotation.z, 1.9, c); B.elbows[1].rotation.z = lerp(B.elbows[1].rotation.z, -1.9, c);
    B.outer.position.z = HERO.z + HD - 0.22 * smooth(0.2, 1.2, s); B.outer.rotation.x = -0.18 * smooth(0.2, 0.8, s) * (1 - 0.6 * smooth(1.0, 1.6, s));
  }
}
function cityCamera(t) {
  cam.fov = 50; cam.near = 0.05; cam.far = 5000;
  if (t < BENCH_END) { // bench: low side view, slow dolly in
    const u = (t - ATOM_END) / (BENCH_END - ATOM_END);
    cam.position.set(BENCH.x + lerp(3.3, 2.8, u), lerp(1.0, 0.95, u), BENCH.z + lerp(2.4, 2.0, u)); cam.lookAt(BENCH.x - 0.15, 1.22, BENCH.z);
  } else if (t < SWITCH_END) { // hug orbit
    const u = (t - BENCH_END) / (SWITCH_END - BENCH_END); const a = lerp(0.35, 1.25, u); const r = lerp(2.6, 2.0, ease(u));
    cam.position.set(HERO.x + Math.sin(a) * r, lerp(1.55, 1.42, u), HERO.z + Math.cos(a) * r); cam.lookAt(HERO.x, 1.28, HERO.z);
    cam.fov = 46;
  } else if (t < SLOWMO_END) { // sink: side view at waist height
    const u = (t - SWITCH_END) / (SLOWMO_END - SWITCH_END);
    cam.position.set(HERO.x + lerp(2.9, 2.4, u), lerp(1.35, 1.0, u), HERO.z + lerp(1.3, 1.7, u)); cam.lookAt(HERO.x, lerp(0.85, 0.35, u), HERO.z - 0.1);
  } else { // follow A down through the ground, looking down
    const Ay = heroA.outer.position.y; const u = smooth(SLOWMO_END, SLOWMO_END + 0.6, t);
    const from = new THREE.Vector3(HERO.x + 2.4, 1.0, HERO.z + 1.7), to = new THREE.Vector3(HERO.x + 1.0, Ay + 3.0, HERO.z + 1.5);
    cam.position.copy(from).lerp(to, u); cam.lookAt(HERO.x, lerp(0.3, Ay - 0.8, u), HERO.z - 0.1);
    cam.fov = lerp(50, 62, u);
  }
  cam.updateProjectionMatrix();
}
function spaceCamera(t) {
  const u = ease((t - SINK_END) / 2.2);
  const d0 = new THREE.Vector3(0.25, 1.0, 0.45).normalize(), d1 = new THREE.Vector3(1, 0.34, 1).normalize();
  const dir = d0.clone().lerp(d1, u).normalize();
  const orbit = 0.32 * smooth(36.5, EARTH_END, t); dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -orbit);
  const dist = Math.exp(lerp(Math.log(ER * 1.75), Math.log(ER * 7.4), u));
  const target = new THREE.Vector3(0, ER, 0).lerp(new THREE.Vector3(0, -0.15 * ER, 0), u);
  spaceCam.position.copy(dir.multiplyScalar(dist)).add(new THREE.Vector3(0, u < 1 ? 0 : 0, 0)); spaceCam.lookAt(target); spaceCam.updateProjectionMatrix();
}

// =================== update: micro layers ===================
function updateSkin(t, field) { camForField(skinCam, field * 1000, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.02, 1)); }
function updateCells(t, field) { camForField(cellCam, field * 1e6, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.08, 0.03, 1)); }
function atomState(t) {
  // defaults
  let shift = 0, glow = 0.25, squash = 0.25, bright = 1;
  if (t < ATOM_END) {
    glow = 0.25 + 0.15 * Math.sin(t * 3);
    if (t > 11.2) { const s = t - 11.4; const p = s > 0 ? Math.exp(-s * 1.4) * Math.sin(s * 5.0) : 0; shift = -0.42 * Math.max(0, p) - 0.25 * smooth(11.2, 11.4, t) * (s < 0 ? 1 : Math.exp(-s * 3)); glow += 1.4 * Math.max(0, -shift) / 0.42; }
  } else if (t >= EARTH_END) {
    shift = -0.62 * ease((t - EARTH_END) / 1.6); glow = 0.4 + 1.6 * smooth(EARTH_END, EARTH_END + 1.6, t) + 2.5 * smooth(53.5, FUSE, t);
  }
  cloudUni.uShiftT.value = shift; cloudUni.uShiftB.value = -shift; cloudUni.uGlow.value = glow; cloudUni.uSquash.value = squash; cloudUni.uBright.value = bright; cloudUni.uTime.value = t;
  nucTop.position.y = shift; nucBot.position.y = -shift;
  // hero pair (hydrogen atoms at the interface)
  let yh = 1.55 + shift, nucS = 0.055, sq = 1, arcA = 0, fb = 0, jit = 0, cloudA = 1;
  if (t >= EARTH_END) {
    const a = smooth(53.0, FUSE, t); yh = lerp(1.55 - 0.62, 0.42, Math.pow(a, 1.3)); nucS = lerp(0.055, 0.32, smooth(51.6, 53.4, t)); sq = lerp(1, 0.55, smooth(EARTH_END, 52, t));
    arcA = smooth(52.6, 54.2, t) * (0.7 + 0.3 * Math.sin(t * 23)); jit = 0.05 * a; cloudA = 1 - 0.5 * a;
    if (t >= FUSE) { const f = t - FUSE; yh = 0; fb = Math.exp(-f * 0.8); }
  }
  const jx = jit * Math.sin(t * 61), jz = jit * Math.cos(t * 53);
  heroCloudT.position.set(jx, yh, jz); heroCloudB.position.set(-jx, -yh, -jz);
  heroCloudT.scale.set(0.78, 0.78 * sq, 0.78); heroCloudB.scale.set(0.78, 0.78 * sq, 0.78);
  heroCloudT.material.uniforms.uA.value = cloudA; heroCloudB.material.uniforms.uA.value = cloudA;
  heroNucT.position.copy(heroCloudT.position); heroNucB.position.copy(heroCloudB.position); heroNucT.scale.setScalar(nucS); heroNucB.scale.setScalar(nucS);
  heroNucT.visible = heroNucB.visible = t < FUSE || t >= ATOM_END && t < EARTH_END;
  arcs.visible = arcA > 0.01; arcMat.opacity = arcA; arcs.scale.set(0.5 + yh * 0.4, Math.max(yh * 2 - nucS * 2, 0.05), 0.5 + yh * 0.4);
  fireball.visible = fb > 0.001; const fr = t >= FUSE ? 0.4 + 9 * Math.pow(t - FUSE, 0.6) : 0; fireball.scale.setScalar(fr); fireball.material.uniforms.uA.value = fb * 1.5;
  const heat = t >= EARTH_END ? smooth(52.5, FUSE, t) : 0; atoms.background = heatBg.clone().lerp(new THREE.Color('#3a0c04'), heat);
}
function updateAtomCam(t) {
  if (t < ATOM_END) {
    const f = diveField(t) * 1e10; const a = 0.22 * Math.sin((t - 7) * 0.35);
    camForField(atomCam, f, new THREE.Vector3(0, 0, -1.5), new THREE.Vector3(Math.sin(a) + 0.08, 0.06, Math.cos(a)));
  } else {
    const f = logKey([[EARTH_END, 15], [51.6, 13], [53.6, 4.6], [FUSE, 3.6], [FUSE_END, 5.5]], t);
    const a = 0.25 + 0.1 * Math.sin(t * 0.4); const tgt = new THREE.Vector3(0, 0, lerp(-1.5, 0, smooth(51.6, 53.6, t)));
    camForField(atomCam, f, tgt, new THREE.Vector3(Math.sin(a), 0.1, Math.cos(a)));
  }
  atomCam.near = 0.05; atomCam.far = 400; atomCam.updateProjectionMatrix();
  cloudUni.uFogNear.value = atomCam.position.distanceTo(new THREE.Vector3()) + 6; cloudUni.uFogFar.value = cloudUni.uFogNear.value + 40;
}
// =================== update: space ===================
const _v = new THREE.Vector3();
function updateSpace(t) {
  const wk = ease((t - CUT) / 1.0);
  wedge.position.set(1, 0.2, 1).multiplyScalar(ER * 1.8 * wk);
  if (globeWedge) { globeWedge.material.opacity = 1 - smooth(CUT + 0.3, CUT + 1.0, t); globeWedge.visible = wk < 0.999; }
  tunnel.material.opacity = 0.5 * smooth(CUT + 0.6, CUT + 1.1, t);
  const tau = tauAt(t); const y = tunY(tau) * ER;
  youDot.position.set(0, y, 0); youDot.scale.setScalar(lerp(0.45, 1.5, smooth(SINK_END, SINK_END + 2, t)) * (1 + 0.1 * Math.sin(t * 9)));
  const rate = tauRate(t); const L = Math.min(TUN_HALF * 4, Math.max(0.01, rate * 0.3));
  const pa = trailGeo.attributes.position;
  for (let i = 0; i < TRAIL_N; i++) { const tt = tau - L * i / (TRAIL_N - 1); pa.setXYZ(i, 0, tunY(Math.max(tt, 0)) * ER, 0); }
  pa.needsUpdate = true; trail.visible = t > FALL_A; trailGeo.computeBoundingSphere();
  const fast = smooth(44.5, 47.5, t); trailWide.material.opacity = 0.35 * fast; trailWide.scale.set(1, ER * 2, 1); trailWide.position.set(0, 0, 0);
  const sp = t - ARRIVE; splash.material.opacity = sp > 0 && sp < 1.4 ? (1 - sp / 1.4) : 0; splash.scale.setScalar(1 + sp * 2.5); splash.position.set(0, -ER * 1.002, 0);
  spaceSun.position.copy(spaceCam.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.9).add(new THREE.Vector3(0, ER * 2, 0));
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'cracks', 'veil', 'sw', 'swKnob', 'swState', 'labels', 'lead', 'inlab'].map(k => [k, $(k)]));
const fadeWin = (t, a, b, f = 0.25) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const captions = [
  [2.75, 6.85, 'Plot twist:<br>you never have. Not once.'],
  [7.2, 10.8, 'Atoms are mostly<br>empty space.'],
  [11.0, 14.8, 'What you feel as touch is<br>electrons pushing back.'],
  [15.3, 18.4, "You're not sitting<br>on your chair."],
  [18.6, 21.8, "You're hovering above it,<br>about one atom high."],
  [22.3, 25.0, "Every hug you've ever had…"],
  [25.2, 27.9, '…had a gap of<br>a hundred-millionth<br>of a centimeter.'],
  [28.2, 29.95, 'Now flip the switch.'],
  [30.4, 33.7, "You'd fall through<br>the floor…"],
  [34.1, 37.3, '…and through<br>the planet.'],
  [37.5, 41.6, 'About 38 minutes<br>to the other side.'],
  [42.2, 45.8, 'Then you fall back.<br>Again. And again.'],
  [46.0, 49.8, 'No air, no friction.<br>It never stops.'],
  [50.3, 53.2, 'Or squeeze harder:<br>the nuclei push back.'],
  [53.4, 56.3, "Fusing them takes conditions<br>like the Sun's core."],
  [58.3, 60.8, 'That tiny gap is what<br>makes things solid.'],
  [61.0, 63.45, "And it's as close as two<br>people can ever get."],
];
const fmtInt = n => Math.round(n).toLocaleString('en-US');
function hudAt(t) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < HOOK) show = 0;
  else if (t < DIVE_END) { const f = diveField(t); lab = 'SCALE'; val = fmtLen(f); sub = layerName(f); }
  else if (t < ATOM_END) { lab = 'THE GAP'; val = '0.1 nm'; sub = '≈ 0.000000004 INCHES'; }
  else if (t < BENCH_END) { lab = 'YOUR HOVER HEIGHT'; val = '0.1 nm'; sub = 'ABOUT ONE ATOM'; }
  else if (t < HUG_END) { lab = 'CLOSEST CONTACT'; val = '0.1 nm'; sub = 'A HUNDRED-MILLIONTH OF A CM'; }
  else if (t < SWITCH_END) show = 0;
  else if (t < SINK_END) { if (t < SLOWMO_END) stat = '<b></b>SLOW MOTION'; lab = 'FALLING'; val = fmtInt(sinkDepth(t) * 3.281) + ' ft'; sub = 'NOTHING HOLDS YOU UP'; }
  else if (t < FALL_A) { lab = 'STARTING POINT'; val = 'Los Angeles'; sub = 'STRAIGHT DOWN, THROUGH THE CENTER'; }
  else if (t < ARRIVE) {
    stat = '<b></b>TIME-LAPSE'; const tau = tauAt(t); lab = 'FALL TIME'; val = Math.floor(tau) + ' min';
    const dy = Math.abs(tunY(tau + 0.05) - tunY(tau - 0.05)) / 0.1 * 6371; sub = 'SPEED ' + fmtInt(Math.round(dy * 37.28 / 100) * 100) + ' MPH';
  }
  else if (t < 43.2) { lab = 'YOU POP OUT IN THE'; val = 'Indian Ocean'; sub = '38 MIN AFTER LEAVING L.A.'; }
  else if (t < EARTH_END) { stat = '<b></b>TIME-LAPSE'; lab = 'TRIPS THROUGH EARTH'; val = fmtInt(Math.floor(tauAt(t) / (TUN_HALF * 2))); sub = 'ONE EVERY 38 MIN · FOREVER'; }
  else if (t < FUSE_END) { const k = smooth(EARTH_END + 0.5, FUSE - 0.3, t); lab = 'TEMPERATURE NEEDED'; val = fmtInt(Math.round(Math.pow(k, 2.2) * 27e6 / 1000) * 1000) + ' °F'; sub = k > 0.98 ? "THE SUN'S CORE · 15 MILLION °C" : 'PUSHING HARDER…'; }
  else { lab = 'THE GAP'; val = '0.1 nm'; sub = 'AS CLOSE AS IT GETS'; }
  return { stat, lab, val, sub, show };
}
function buildCracks() {
  let s = '';
  for (const [cx, cy, n] of [[560, 900, 14], [250, 1420, 9], [820, 520, 9]]) {
    for (let i = 0; i < n; i++) {
      let a = i / n * Math.PI * 2 + R(-0.2, 0.2), x = cx, y = cy; let d = `M${cx},${cy}`; const L = R(160, 520);
      for (let l = 0; l < L; l += R(25, 60)) { a += R(-0.35, 0.35); x += Math.cos(a) * R(25, 60); y += Math.sin(a) * R(25, 60); d += ` L${x.toFixed(1)},${y.toFixed(1)}`; }
      s += `<path d="${d}" stroke="rgba(255,255,255,.85)" stroke-width="${R(1.5, 3).toFixed(1)}" fill="none"/>`;
    }
    for (const rr of [R(40, 70), R(110, 160)]) { let d = ''; const a0 = R(0, 6), a1 = a0 + R(2, 4.5); for (let a = a0; a < a1; a += 0.3) { const r = rr * R(0.85, 1.15); d += `${d ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `; } s += `<path d="${d}" stroke="rgba(255,255,255,.7)" stroke-width="1.6" fill="none"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(255,255,255,.9)"/>`;
  }
  el.cracks.innerHTML = s;
}
function proj(v, camera) { const p = v.clone().project(camera); return [(p.x * 0.5 + 0.5) * W, (1 - (p.y * 0.5 + 0.5)) * H, p.z]; }
const INSET = { cx: 560, cy: 600, r: 250 };
function labelHTML(x, y, text, cls = '', op = 1) { return `<div class="lbl ${cls}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;opacity:${op.toFixed(3)}">${text}</div>`; }
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(HOOK - 0.25, HOOK + 0.05, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - fadeWin(t, FUSE - 0.05, FUSE_END + 0.25, 0.15)) * (1 - smooth(T_END, T_END + 0.4, t)) * smooth(HOOK, HOOK + 0.3, t);
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1]) : 0;
  // switch
  el.sw.style.opacity = fadeWin(t, HUG_END + 0.1, SWITCH_END + 0.6, 0.3);
  const on = t < FLIP; el.sw.classList.toggle('off', !on); el.swState.textContent = on ? 'ON' : 'OFF';
  // veils / flashes
  const cut1 = fadeWin(t, ATOM_END - 0.3, ATOM_END + 0.3, 0.3);           // atoms -> bench
  const cut2 = fadeWin(t, SINK_END - 0.35, SINK_END + 0.35, 0.35);        // underground -> space
  const cut3 = fadeWin(t, EARTH_END - 0.3, EARTH_END + 0.3, 0.3);         // space -> atoms
  el.veil.style.background = t < 20 ? '#e8eef6' : '#05070c'; el.veil.style.opacity = Math.max(cut1 * 0.95, cut2, cut3);
  const flip = t >= FLIP ? Math.exp(-(t - FLIP) * 5) * 0.75 : 0;
  const fuse = t >= FUSE ? (t < FUSE_END ? 1 - smooth(FUSE_END - 0.5, FUSE_END + 0.35, t) * 1 : 1 - smooth(FUSE_END - 0.5, FUSE_END + 0.35, t)) : 0;
  el.flash.style.opacity = Math.max(flip, Math.max(0, fuse) * (t < FUSE + 0.25 ? smooth(FUSE, FUSE + 0.12, t) : 1));
  el.cracks.style.opacity = t >= FUSE + 0.05 && t < FUSE_END + 0.8 ? 1 - smooth(FUSE_END + 0.3, FUSE_END + 0.8, t) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
  // labels
  let L = '';
  const insetOn = t >= ATOM_END + 0.6 && t < BENCH_END;
  if (insetOn) {
    const op = fadeWin(t, ATOM_END + 0.6, BENCH_END, 0.4);
    L += labelHTML(INSET.cx, INSET.cy - INSET.r * 0.72, 'YOUR JEANS', 'blue', op) + labelHTML(INSET.cx, INSET.cy + INSET.r * 0.6, 'THE BENCH', 'orange', op) + labelHTML(INSET.cx + 105, INSET.cy - 4, '↕ 0.1 nm', 'big', op);
  }
  if (t >= SINK_END && t < EARTH_END) {
    const op = fadeWin(t, SINK_END + 0.4, EARTH_END, 0.4);
    const you = proj(youDot.position, spaceCam); L += labelHTML(you[0] - 70, you[1] - 8, 'YOU', 'you', op);
    const la = proj(new THREE.Vector3(0, ER * 1.02, 0), spaceCam); L += labelHTML(la[0], la[1] - 46, 'LOS ANGELES', '', op * smooth(SINK_END + 1.6, SINK_END + 2.2, t));
    const io = proj(new THREE.Vector3(0, -ER * 1.02, 0), spaceCam); L += labelHTML(io[0], io[1] + 22, 'INDIAN OCEAN', '', op * smooth(CUT + 0.8, CUT + 1.4, t));
    const lop = op * smooth(CUT + 1.0, CUT + 1.6, t) * (1 - smooth(42.6, 43.4, t));
    for (const [r, a, name] of [[0.74, 0.55, 'MANTLE'], [0.37, 0.75, 'OUTER CORE'], [0.0, 0, 'INNER CORE']]) {
      const p = r ? new THREE.Vector3(0, Math.sin(a) * r * ER, Math.cos(a) * r * ER) : new THREE.Vector3(0, 0, 0.6);
      const q = proj(p, spaceCam); L += labelHTML(q[0] - (r ? 0 : 0), q[1] + (r ? 0 : -30), name, 'small', lop);
    }
  }
  el.labels.innerHTML = L;
  // inset leader line (bench)
  if (insetOn) {
    const p = proj(new THREE.Vector3(BENCH.x - 0.15, 0.69, BENCH.z + 0.05), cam);
    const ang = Math.atan2(p[1] - INSET.cy, p[0] - INSET.cx); const sx = INSET.cx + Math.cos(ang) * INSET.r, sy = INSET.cy + Math.sin(ang) * INSET.r;
    el.lead.innerHTML = `<line x1="${sx}" y1="${sy}" x2="${p[0]}" y2="${p[1]}" stroke="rgba(255,255,255,.9)" stroke-width="3"/><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="none" stroke="#fff" stroke-width="3"/>`;
    el.lead.style.opacity = fadeWin(t, ATOM_END + 0.6, BENCH_END, 0.4);
  } else el.lead.style.opacity = 0;
}

// =================== layers ===================
function drawHands(t, rt, outro) {
  const field = outro ? outroField(t) : hookField(t), gap = outro ? 0.0016 : hookGap(t);
  const dusk = outro ? 1 : 0;
  placeHands(gap, t);
  handsCam.fov = 30;
  camForField(handsCam, field, CONTACT, BACK_HANDS); handsCam.near = Math.max(0.002, handsCam.position.distanceTo(CONTACT) * 0.05); handsCam.far = 40; handsCam.updateProjectionMatrix();
  // blurred city behind (low-res render = cheap bokeh)
  cam.position.copy(handsCam.position); cam.quaternion.copy(handsCam.quaternion); cam.fov = handsCam.fov; cam.near = 0.3; cam.far = 4000; cam.updateProjectionMatrix();
  heroA.outer.visible = heroB.outer.visible = false; benchG.visible = true;
  updateCity(t, cam, dusk);
  toRT(rtSmall, city, cam);
  handSun.position.copy(CONTACT).addScaledVector(dusk ? SUN_DUSK : HAND_SUN, 5); handSun.target.position.copy(CONTACT); handSun.target.updateMatrixWorld();
  handRim.position.copy(CONTACT).add(new THREE.Vector3(-1, 0.6, 3)); handRim.target.position.copy(CONTACT); handRim.target.updateMatrixWorld(); handRim.intensity = outro ? 2.0 : 1.0;
  gapGlow.material.uniforms.uA.value = outro ? 1.6 * smooth(FUSE_END, FUSE_END + 1.2, t) : 0;
  renderer.setRenderTarget(rt); renderer.clear();
  blit(rtSmall.texture, { blur: 1.6 });
  renderer.clearDepth(); renderer.render(hands, handsCam);
}
function drawAtoms(t, rt) { atomState(t); updateAtomCam(t); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(atoms, atomCam); }
function drawSkin(t, rt) { updateSkin(t, diveField(t)); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(skin, skinCam); }
function drawCells(t, rt) { updateCells(t, Math.max(diveField(t), 7e-6)); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(cells, cellCam); }
function drawCity(t, rt) {
  poseHeroes(t); cityCamera(t); benchG.visible = true; updateCity(t, cam, 0);
  lightUnder.position.copy(heroA.outer.position).add(new THREE.Vector3(0.5, 1.5, 0.8)); lightUnder.intensity = cam.position.y < 0 ? 6 : 0;
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(city, cam);
  if (t >= ATOM_END + 0.6 && t < BENCH_END) {           // magnifier: atoms between jeans and bench
    const k = fadeWin(t, ATOM_END + 0.6, BENCH_END, 0.4);
    atomState(9.0); const ia = 0.12 + 0.03 * (t - ATOM_END); camForField(insetCam, 8.5, new THREE.Vector3(0, 0, -1.5), new THREE.Vector3(Math.sin(ia), 0.05, Math.cos(ia)));
    insetCam.aspect = 1; insetCam.updateProjectionMatrix(); cloudUni.uFogNear.value = insetCam.position.length() + 6; cloudUni.uFogFar.value = cloudUni.uFogNear.value + 40;
    const s = 0.82 + 0.18 * ease(k);
    // insetCam was framed for portrait height; for a square inset use the width
    cloudUni.uBright.value = 0.55; toRT(rtInset, atoms, insetCam, 0x05070f);
    renderer.setRenderTarget(rt);
    const r = INSET.r * s;
    blit(rtInset.texture, { rect: [(INSET.cx - r) / W, 1 - (INSET.cy + r) / H, 2 * r / W, 2 * r / H], circle: true, alpha: k, ring: [1.6, 1.6, 1.6] });
  }
}
function drawSpace(t, rt) { spaceCamera(t); updateSpace(t); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(space, spaceCam); }
const LAYERS = { hands: (t, rt) => drawHands(t, rt, false), outro: (t, rt) => drawHands(t, rt, true), skin: drawSkin, cells: drawCells, atoms: drawAtoms, city: drawCity, space: drawSpace };
// [name, from, to] — overlapping ranges crossfade
const SHOTS = [['hands', 0, 2.75], ['skin', 2.45, 4.5], ['cells', 4.2, 6.35], ['atoms', 6.05, ATOM_END], ['city', ATOM_END, SINK_END], ['space', SINK_END, EARTH_END], ['atoms', EARTH_END, FUSE_END], ['outro', FUSE_END - 0.4, T_END + 1.5]];
function shotsAt(t) { return SHOTS.filter(([, a, b]) => t >= a && t < b); }

// =================== main ===================
window.renderAt = (t) => {
  updateDOM(t);
  if (window.PASS === 'text') {
    // labels need the cameras even when nothing is rendered
    if (t >= ATOM_END && t < SINK_END) { poseHeroes(t); cityCamera(t); }
    if (t >= SINK_END && t < EARTH_END) { spaceCamera(t); updateSpace(t); updateDOM(t); }
    if (t >= ATOM_END && t < BENCH_END) updateDOM(t);
    return true;
  }
  const s = shotsAt(t);
  renderer.setRenderTarget(null); renderer.clear();
  if (s.length === 1) LAYERS[s[0][0]](t, null);
  else if (s.length >= 2) {
    const [a, b] = s; const k = smooth(b[1], a[2], t);
    LAYERS[a[0]](t, rtA); LAYERS[b[0]](t, rtB);
    renderer.setRenderTarget(null); renderer.clear(); blit(rtA.texture, { b: rtB.texture, k });
  }
  renderer.setRenderTarget(null);
  updateDOM(t);
  return true;
};
buildCracks();
window.sceneReady = Promise.all([document.fonts.ready, buildGlobe()]).then(() => { window.renderAt(0); return true; });
