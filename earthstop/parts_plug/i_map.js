// =================== 3D-map INTROS for the photo-news format: ?v=A dive from the whole US down to the White House; ?v=B today's stories pop up across the US ===================
// Built like the news maps (y_head + m3_map + m5_hi + this). The date/title/captions come from index_intro.html?v=O (transparent PNGs composited on top).
const V = (new URLSearchParams(location.search).get('v') || 'A')[0];
const $ = id => document.getElementById(id);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const pop = (t, a, d = 0.3) => { const k = clamp((t - a) / d, 0, 1); return k <= 0 ? 0.001 : 1 + 0.25 * Math.sin(Math.PI * k) * (1 - k) - (1 - k) * (1 - k) * 0.9; };
const T1 = SENT[1], WHLL = [-77.0365, 38.8977];
const PINS5 = [['NVIDIA', -121.96, 37.35, '#ff4a4a'], ['BROOKLYN', -73.95, 40.65, '#ff4a4a'], ['MISSISSIPPI', -90.18, 32.3, '#3d7dff'], ['WASHINGTON', -77.03, 38.9, '#ffc23a'], ['KENTUCKY', -84.5, 38.2, '#3d7dff']];
function camAt(t) { let c, h, yaw, tilt;
  if (V === 'A') { const u = span(t, 0, T1 + 0.2), uc = easeOut(Math.min(1, u * 1.25)), uh = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    c = llPos(-96, 38.5).lerp(llPos(WHLL[0], WHLL[1] - 0.01), uc); h = Math.exp(Math.log(950) + (Math.log(13) - Math.log(950)) * uh); yaw = 0.7 * u * u; tilt = 0.7 + 0.35 * u; }
  else { const u = span(t, 0, T1 + 0.2); c = llPos(-98, 36.5); h = 660 * Math.exp(-0.12 * u * 3.3); yaw = -0.08 + 0.16 * u; tilt = 0.5 + 0.06 * u; }
  const back = h * tilt; mCam.position.set(c.x + Math.sin(yaw) * back, h, c.z + Math.cos(yaw) * back); mCam.lookAt(c.x, 0, c.z); mCam.fov = 36; mCam.aspect = W / H; mCam.near = Math.max(0.05, h * 0.02); mCam.far = h * 12 + 500;
  mCam.updateProjectionMatrix(); mCam.updateMatrixWorld(); mapUni.uFade.value.set(h * 2.2, h * 6.0); }
let PP = null;
function proj(p) { const v = p.clone().project(mCam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }
function mapAt(t) { if (!PP) PP = { pins: PINS5.map(p => makePin(p[3])) }; clearPaint(); mapUni.uDim.value = 0; mapUni.uV5.value = 1;
  STATES.forEach((s, i) => { if (s.name !== 'Alaska' && s.name !== 'Hawaii') paintState(s.name, '#ffffff', 0, 0); });
  paintState('District of Columbia', '#ffc23a', V === 'A' ? 0.5 : 0.9, 0);
  WH.visible = V === 'A'; if (WH.visible) { const p = llPos(WHLL[0], WHLL[1], 0); WH.position.set(p.x, (typeof HGT === 'function' ? HGT(WHLL[0], WHLL[1]) : 0) + 0.05, p.z); WH.rotation.y = 0; WH.scale.setScalar(0.2 * easeOut(span(t, 1.2, 1.9)) + 0.001); }
  PP.pins.forEach((g, i) => { const a = 0.25 + i * 0.42; g.visible = V === 'B' && t >= a; if (g.visible) { g.position.copy(llPos(PINS5[i][1], PINS5[i][2], 0)); g.scale.setScalar(9 * easeOut(span(t, a, a + 0.35)) + 0.01); const ph = (t * 0.9 + i * 0.2) % 1; g.userData.ring.scale.setScalar(1 + ph * 2.2); g.userData.ring.material.opacity = 1 - ph; } });
  if (typeof GLAB !== 'undefined') GLAB.forEach(o => { o.visible = V === 'A' && t > 1.4; });
  palTex.needsUpdate = true; }
function domAt(t) { let h = '';
  if (V === 'B') PINS5.forEach((p, i) => { const a = 0.25 + i * 0.42; if (t < a + 0.1) return; const q = proj(llPos(p[1], p[2], [30, 75, 30, 18, 52][i])); if (!q) return; h += `<div class="stk2" style="left:${Math.max(150, Math.min(930, q[0])).toFixed(0)}px;top:${q[1].toFixed(0)}px;background:${p[3]};transform:translate(-50%,-100%) scale(${pop(t, a + 0.1, 0.25).toFixed(3)})">${p[0]}</div>`; });
  if (V === 'A' && t > 1.9) { const q = proj(WH.position.clone().add(V3(0, 3.2, 0))); if (q) h += `<div class="stk2" style="left:${q[0].toFixed(0)}px;top:${q[1].toFixed(0)}px;background:rgba(10,14,22,.85);transform:translate(-50%,-100%) scale(${pop(t, 1.9, 0.25).toFixed(3)})">THE WHITE HOUSE</div>`; }
  $('labels').innerHTML = h; }
window.renderAt = (t) => { if (!window.__ord) { orderProps(); window.__ord = 1; } mapUni.uT.value = t; camAt(t); mapAt(t); domAt(t); shootTo(RTA, MAPSC, mCam); compMat.uniforms.tA.value = RTA.texture;
  const u = compMat.uniforms; u.uLook.value = 0.0; u.uWhip.value = 0; u.uPixOn.value = 0; u.uRed.value = 0; u.uSepia.value = 0; u.uTilt.value = 0; composite(0, 1.0, 1.0); return true; };
window.sceneReady = (async () => { await document.fonts.ready; await mapReady; await Promise.all(['900', '800', '700', '600'].map(w => document.fonts.load(`${w} 160px Inter`)));
  try { await addHiPatch('dc'); groundLabel('Washington', -77.03, 38.95, 0.5, { font: '800' }); groundLabel('Potomac River', -77.1, 38.84, 0.28, { font: '600', italic: true, color: '#e8f4ff', rot: 0.6 }); } catch (e) { console.log('no hi patch', e); }
  window.renderAt(0); return true; })();
