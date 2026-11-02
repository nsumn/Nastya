// =================== SHOTS (every framing dollies), HUD = DAYS WITHOUT A SHOWER, captions in the series style (fade + pop) ===================
const fr = (h, dir, dist, hy, fov = 40) => framing(h, dir, dist, hy - 0.15, fov);
const H_ = P => headOf(P);
const sp = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
const home = m => t => { updateHome(t, m); fx(t, room, m); }, bathU = m => t => { updateBath(t, m); fx(t, bath, m); };
// the smell / flies / grease / patches by day
function fx(t, scene, m) { const day = t < DAY3 ? 0 : t < DAY7 ? 3 : t < DAY14 ? 7 : t < DAY30 ? 14 : 30, shower = t >= SHOWER;
  greasy(shower ? 0 : day >= 3 ? Math.min(1, 0.5 + day / 30) : 0); PATCHES.forEach(p => p.visible = day >= 30 && !shower);
  hero.outer.updateMatrixWorld(true); const hd = H_(hero);
  if (m === 'day14') { stinkAt(scene, shoes.position.clone().add(V3(0, 0.1, 0)), t, 6, 0.3, 1); fliesAt(scene, shoes.position.clone().add(V3(0, 0.25, 0)), t, 5, 0.18); }
  else if (!shower && day >= 3 && m !== 'mirror' && m !== 'doc') { stinkAt(scene, hd.clone().add(V3(0, -0.75, 0)), t, Math.min(10, 2 + day), 0.22, Math.min(1, 0.4 + day / 14)); fliesAt(scene, hd, t, day >= 14 ? 4 : 0); }
  else { stinkAt(scene, hd, t, 0); fliesAt(scene, hd, t, 0); } }
const subU = t => { updateSub(t); fx(t, sub, 'sub'); };
// a camera that orbits its subject (eased), with a little handheld drift
const orbit = (h, dir, a0, a1, d0, d1, hy, u, fov = 40) => { const dd = dir.clone().applyAxisAngle(V3(0, 1, 0), lerp(a0, a1, ease(clamp(u, 0, 1)))); return fr(h, dd, lerp(d0, d1, ease(clamp(u, 0, 1))), hy, fov); };
const hand = (F, t, k = 1) => { F.pos.add(V3(Math.sin(t * 1.7) * 0.012, Math.sin(t * 2.3 + 1) * 0.01, Math.sin(t * 1.3 + 2) * 0.008).multiplyScalar(k)); F.look.add(V3(Math.sin(t * 1.1) * 0.01, Math.sin(t * 1.9) * 0.008, 0).multiplyScalar(k)); return F; };
const FOCUS = { head: () => H_(hero), shoes: () => shoes.position.clone().add(V3(0, 0.08, 0)), micro: () => V3(0, 0.3, -3.5), cal: () => cal.position.clone() };
// [start, scene, camera, update(t), framing(t), { dof: focus key, amt, mb, whip }]
const SHOTS = [
  [0.0, bath, () => bathCam, bathU('title'), t => hand(orbit(H_(hero), V3(0.6, 0.02, 1), -0.25, 0.1, 2.4, 1.5, 0.68, t / DAY1), t), { dof: 'head', amt: 22 }],   // slow push past the curtain to your face
  [DAY1, room, () => rmCam, home('day1'), t => hand(orbit(H_(hero), V3(-0.5, -0.05, 1), -0.35, 0.35, 2.2, 1.9, 0.62, (t - DAY1) / 6), t), { dof: 'head', amt: 16 }],   // the sun shafts, a slow arc
  [MICRO, micro, () => microCam, updateMicro, t => ({ pos: V3(lerp(-1.2, 1.2, sp(t, MICRO, DAY3)), lerp(1.6, 0.9, sp(t, MICRO, DAY3)), lerp(1.5, -0.6, sp(t, MICRO, DAY3))), look: V3(0, 0.35, -3.8), fov: 42 }), { dof: 'micro', amt: 30 }],   // macro: shallow focus on the pores
  [DAY3, room, () => rmCam, home('day3'), t => hand(orbit(H_(hero), V3(-0.4, -0.25, 1), -0.2, 0.25, 1.4, 1.05, 0.6, (t - DAY3) / 6), t), { dof: 'head', amt: 20, whip: 1 }],   // low angle, rim light on the greasy hair
  [DAY7, sub, () => subCam, subU, t => hand(fr(V3(0, 1.4, lerp(3.0, 0.5, sp(t, DAY7, DAY7 + 3.6))), V3(0.08, 0.12, 1), 3.2, 0.5, 46), t, 2), { mb: true, whip: -1 }],   // tracking down the car as they edge away
  [DAY7 + 3.6, sub, () => subCam, subU, t => hand(orbit(H_(hero), V3(0.5, 0.0, 1), 0.2, -0.15, 1.3, 1.15, 0.62, (t - DAY7 - 3.6) / 3.4), t, 1.5), { dof: 'head', amt: 20 }],
  [DAY14, room, () => rmCam, home('day14'), t => hand(fr(V3(-1.7, 0.12, 1.6), V3(0.7, 0.18, 1), lerp(1.3, 1.0, sp(t, DAY14, DAY14 + 4)), 0.55, 44), t), { dof: 'shoes', amt: 26, whip: 1 }],   // floor level: the shoes sharp, you blurred behind
  [DAY14 + 4.0, room, () => rmCam, home('day14'), t => hand(orbit(H_(hero), V3(1, 0.1, 0.35), -0.15, 0.2, 1.6, 1.35, 0.6, (t - DAY14 - 4) / 4), t), { dof: 'head', amt: 18 }],
  [DAY30, bath, () => bathCam, bathU('mirror'), t => hand(fr(H_(hero), V3(1, 0.02, 0.15), lerp(1.3, 0.95, sp(t, DAY30, DAY30 + 4)), 0.5), t, 0.6), { dof: 'head', amt: 24 }],   // the mirror: a slow push
  [DAY30 + 4.0, bath, () => bathCam, bathU('mirror'), t => hand(orbit(H_(hero), V3(0.7, 0.0, 0.7), 0.15, -0.1, 1.15, 1.0, 0.5, (t - DAY30 - 4) / 4), t, 0.6), { dof: 'head', amt: 24 }],
  [DOC, room, () => rmCam, home('doc'), t => fr(V3(0.3, 1.6, -2.85), V3(0.05, 0.02, 1), lerp(1.4, 0.9, sp(t, DOC, DOC + 4)), 0.5), { dof: 'cal', amt: 22, whip: -1 }],   // the calendar flipping years
  [DOC + 4.0, room, () => rmCam, home('doc'), t => hand(orbit(H_(hero), V3(0.25, 0.06, 1), -0.2, 0.15, 1.6, 1.3, 0.6, (t - DOC - 4) / 4), t), { dof: 'head', amt: 18 }],
  [SHOWER, bath, () => bathCam, bathU('shower'), t => hand(orbit(H_(hero), V3(0.6, -0.15, 1), -0.3, 0.3, 1.9, 1.5, 0.64, (t - SHOWER) / 10), t, 0.6), { dof: 'head', amt: 16, whip: 1 }]];   // backlit steam, slow arc
function shootShot(S, t, rt) { const [, scene, cam, upd, frm] = S; upd(t); const c = cam(); applyF(c, frm(t));
  if (scene === room) { lightRoom('eve'); camKey.intensity = 0.7; SHAFTS.forEach((sh, k) => { sh.material.opacity = 0.45 + 0.12 * Math.sin(t * 0.7 + k); }); updateDust(t); placeRim(room, c, 0xffc890, 5); }
  if (scene === bath) { const shw = t >= SHOWER; bath.children.filter(o => o.isHemisphereLight).forEach(h => { h.color.set(shw ? '#fff0e0' : '#cfe0ff'); h.intensity = shw ? 0.6 : 0.75; }); showerBack.intensity = shw ? 3.2 : 0; placeRim(bath, c, shw ? 0xffd0a0 : 0xbfd8ff, shw ? 6 : 4); }
  if (scene === sub) placeRim(sub, c, 0xd8ffe8, 4); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(c.fov * Math.PI / 360)); shootTo(rt, scene, c); }
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'cap', 'end', 'endT', 'endS', 'tl', 'tlN', 'tlC', 'pop', 'flash'].map(k => [k, $(k)]));
const CAPS = [
  [DAY1 + 0.2, DAY1 + 3.0, 'Day 1: honestly? You’re fine.'], [DAY1 + 3.0, MICRO - 0.1, 'Most people don’t need a shower every day.'],
  [MICRO + 0.3, MICRO + 3.2, 'Sweat itself doesn’t smell.'], [MICRO + 3.2, DAY3 - 0.1, 'Skin bacteria turn it into stinky sulfur compounds.'],
  [DAY3 + 0.2, DAY7 - 0.1, 'Day 3: scalp oil piles up. Hair goes flat and shiny.'],
  [DAY7 + 0.2, DAY7 + 3.6, 'Day 7: everyone notices.'], [DAY7 + 3.6, DAY14 - 0.1, 'You don’t. Your nose tunes out your own smell.'],
  [DAY14 + 0.2, DAY14 + 4.0, 'Day 14: your shoes are a bacteria party.'], [DAY14 + 4.0, DAY30 - 0.1, 'Dead skin and oil just… stay on you.'],
  [DAY30 + 0.2, DAY30 + 4.0, 'Some people get dark, dirt-like patches.'], [DAY30 + 4.0, DOC - 0.1, 'Soap often won’t remove them. Rubbing alcohol does.'],
  [DOC + 0.3, DOC + 4.0, 'A doctor stopped showering for 5 years and wrote a book about it.'], [DOC + 4.0, SHOWER - 0.1, 'He still washes his hands. And he doesn’t recommend quitting cold turkey.'],
  [SHOWER + 0.2, ENDC - 0.1, 'Dermatologists: 2–3 showers a week is plenty for most people.']];
const DAYS = [[0, '0'], [DAY1, '1'], [MICRO, '2'], [DAY3, '3'], [DAY7, '7'], [DAY14, '14'], [DAY30, '30'], [DOC, '5 YEARS'], [SHOWER, '0']];
const POPS = [[DAY30 + 4.1, DOC - 0.2, () => 'TERRA FIRMA-FORME', 'DERMATOSIS · HARMLESS, RARE']];
function updateDOM(t, i) { el.title.style.opacity = fadeWin(t, 0, DAY1, 0.35);
  el.tl.style.opacity = smooth(DAY1 - 0.3, DAY1, t) * (1 - smooth(ENDC - 0.3, ENDC, t)) * (SHOTS[i][2] === undefined ? 1 : 1) * (t >= MICRO && t < DAY3 ? 0 : 1);
  const d = [...DAYS].reverse().find(([a]) => t >= a)[1]; el.tlN.textContent = t >= DOC && t < SHOWER ? 'ONE DOCTOR’S EXPERIMENT' : t >= SHOWER ? 'DAYS WITHOUT A SHOWER · RESET' : 'DAYS WITHOUT A SHOWER'; el.tlC.textContent = d;
  const pp = POPS.find(([a, b]) => t >= a && t < b); el.pop.innerHTML = pp ? `<span style="font-size:58px">${pp[2](t)}</span><div class="ps">${pp[3]}</div>` : ''; el.pop.style.opacity = pp ? fadeWin(t, pp[0], pp[1], 0.2) : 0; el.pop.style.transform = 'translateX(-50%)';
  el.flash.style.opacity = 0.35 * Math.exp(-Math.pow((t - SHOWER) / 0.1, 2));
  const cp = CAPS.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = cp ? cp[2] : ''; el.cap.style.opacity = cp ? fadeWin(t, cp[0], cp[1], 0.18) : 0;
  el.cap.style.transform = cp ? `scale(${(1 + 0.06 * Math.sin(Math.PI * clamp((t - cp[0]) / 0.25, 0, 1)) - 0.06 * (1 - clamp((t - cp[0]) / 0.18, 0, 1))).toFixed(3)})` : '';
  el.end.style.opacity = smooth(ENDC, ENDC + 0.4, t) * 0.94; el.endT.style.opacity = smooth(ENDC + 0.2, ENDC + 0.6, t); el.endS.style.opacity = smooth(ENDC + 0.8, ENDC + 1.2, t); }
// ---- optics: depth of field from the depth buffer, sub-frame motion blur, whip-pan cuts ----
RTA.depthTexture = new THREE.DepthTexture(W, H); RTA.depthTexture.type = THREE.UnsignedIntType;
const RTDOF = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }), RTACC = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const fsq = mat => { const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); return sc; };
const dofMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, tDepth: { value: null }, uNear: { value: 0.03 }, uFar: { value: 60 }, uFocus: { value: 2 }, uAmt: { value: 20 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tSrc, tDepth; uniform float uNear, uFar, uFocus, uAmt; varying vec2 vUv;
    float dist(vec2 uv){ float d=texture2D(tDepth,uv).x; return uNear*uFar/(uFar-d*(uFar-uNear)); }
    float coc(vec2 uv){ float z=dist(uv); return clamp(abs(z-uFocus)/max(z,0.001)*uAmt,0.0,18.0); }
    void main(){ float c0=coc(vUv); vec3 acc=texture2D(tSrc,vUv).rgb; float w=1.0; vec2 px=vec2(1.0/1080.0,1.0/1920.0);
      for(int i=0;i<28;i++){ float a=float(i)*2.39996; float r=sqrt((float(i)+0.5)/28.0); vec2 o=vec2(cos(a),sin(a))*r*c0*px; float cs=coc(vUv+o);
        float k=smoothstep(r*c0-1.5,r*c0+0.5,cs+0.5*c0); acc+=texture2D(tSrc,vUv+o).rgb*k; w+=k; }
      gl_FragColor=vec4(acc/w,1.0); }` });
const accMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, uniforms: { tSrc: { value: null }, uW: { value: 0.25 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }', fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(tSrc,vUv).rgb*uW,1.0); }' });
const dofSc = fsq(dofMat), accSc = fsq(accMat), MB_K = 4, SHUTTER = 0.5 / 30;
const whipAt = t => { let w = 0; for (const S of SHOTS) { const o = S[5] || {}; if (o.whip) { const k = Math.max(0, 1 - Math.abs(t - S[0]) / 0.16); w += o.whip * 0.12 * k * k; } } return w; };
window.renderAt = (t) => {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++;
  if (window.PASS === 'text') { updateDOM(t, i); return true; }
  const S = SHOTS[i], o = S[5] || {}, P = i > 0 ? SHOTS[i - 1] : null, mix = P && P[1] !== S[1] && !o.whip ? smooth(S[0] - 0.001, S[0] + 0.3, t) : 1;
  let src = RTA;
  if (mix < 1) { shootShot(P, t, RTA); shootShot(S, t, RTB); }
  else if (o.mb) { renderer.setRenderTarget(RTACC); renderer.setClearColor(0x000000, 1); renderer.clear();
    for (let j = 0; j < MB_K; j++) { shootShot(S, Math.max(S[0], t + (j / (MB_K - 1) - 0.5) * SHUTTER * 2), RTA); accMat.uniforms.tSrc.value = RTA.texture; accMat.uniforms.uW.value = 1 / MB_K; renderer.setRenderTarget(RTACC); renderer.autoClear = false; renderer.render(accSc, compCam); renderer.autoClear = true; }
    src = RTACC; }
  else { shootShot(S, t, RTA);
    if (o.dof) { const c = S[2](); dofMat.uniforms.tSrc.value = RTA.texture; dofMat.uniforms.tDepth.value = RTA.depthTexture; dofMat.uniforms.uNear.value = c.near; dofMat.uniforms.uFar.value = c.far; dofMat.uniforms.uFocus.value = c.position.distanceTo(FOCUS[o.dof]()); dofMat.uniforms.uAmt.value = o.amt || 20;
      renderer.setRenderTarget(RTDOF); renderer.render(dofSc, compCam); src = RTDOF; } }
  compMat.uniforms.tA.value = src.texture;
  compMat.uniforms.uWhip.value = whipAt(t); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; compMat.uniforms.uT.value = t; compMat.uniforms.uLook.value = 1;
  composite(mix < 1 ? mix : 0, 1.0, 1.0); compMat.uniforms.tA.value = RTA.texture; updateDOM(t, i); return true; };
window.sceneReady = (async () => { await document.fonts.ready;
  for (const n of Object.keys(FACE)) for (const b of [false, true]) renderer.initTexture(faceTex(hero.o, n, b));
  for (const S of SHOTS) shootShot(S, S[0] + 0.5, RTA); window.renderAt(0); return true; })();
