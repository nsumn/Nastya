// =================== FACE LAB: one bust per frame (t = index) — cast × expressions, for her to pick the look ===================
const lab = new THREE.Scene(); lab.background = new THREE.Color('#e9d8c0'); const labCam = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);
lab.add(new THREE.HemisphereLight(0xfff2e0, 0x8a7060, 1.2)); { const k = new THREE.DirectionalLight(0xffe6c8, 1.8); k.position.set(1.5, 3, 4); k.castShadow = true; lab.add(k); const f = new THREE.DirectionalLight(0xc8d8ff, 0.5); f.position.set(-3, 1, 2); lab.add(f); }
{ bx(8, 6, 0.1, '#e9d8c0', 0, 3, -1.2, lab); const fl = bx(8, 0.1, 6, '#b88a5a', 0, -0.05, 1.5, lab); }
const CAST = {
  dad: makeBlock({ skin: '#e2ae86', hair: '#5a4434', top: '#3f6e9a', bottom: '#4a4a52', hairStyle: 'short', mustache: '#5a4434', glasses: '#2a2420' }),
  mom: makeBlock({ skin: '#f0c8a4', hair: '#7a3a1e', top: '#d85a5a', bottom: '#2f3a5a', hairStyle: 'long', lip: '#c8303c' }),
  kid: makeBlock({ skin: '#c98d62', hair: '#1c1612', top: '#f2c040', bottom: '#3a4a6a', hairStyle: 'bangs', h: 0.86 }),
  grandma: makeBlock({ skin: '#f2d0b4', hair: '#eeeae4', browCol: '#b8b0a8', top: '#3a5ab8', bottom: '#5a4a5a', hairStyle: 'curly', glasses: '#8a6a3a', wrinkles: true }),
};
// the same family with ROUND heads and with SOFT (rounded-cube) heads
const variant = (shape) => ({
  dad: makeBlock({ head: shape, skin: '#e2ae86', hair: '#5a4434', top: '#3f6e9a', bottom: '#4a4a52', hairStyle: 'short', mustache: '#5a4434', glasses: '#2a2420' }),
  mom: makeBlock({ head: shape, skin: '#f0c8a4', hair: '#7a3a1e', top: '#d85a5a', bottom: '#2f3a5a', hairStyle: 'long', lip: '#c8303c' }),
  kid: makeBlock({ head: shape, skin: '#c98d62', hair: '#1c1612', top: '#f2c040', bottom: '#3a4a6a', hairStyle: 'bangs', h: 0.86 }),
  grandma: makeBlock({ head: shape, skin: '#f2d0b4', hair: '#eeeae4', browCol: '#b8b0a8', top: '#3a5ab8', bottom: '#5a4a5a', hairStyle: 'curly', glasses: '#8a6a3a', wrinkles: true }) });
const CASTS = { box: CAST, round: variant('round'), soft: variant('soft') };
Object.values(CASTS).forEach(c => Object.values(c).forEach(p => { lab.add(p.outer); p.outer.visible = false; }));
const SHOTS2 = [['round', 'dad', 'happy'], ['round', 'dad', 'laugh'], ['round', 'dad', 'squint'], ['round', 'dad', 'worried'], ['round', 'dad', 'sad'], ['round', 'dad', 'proud'],
  ['round', 'mom', 'happy'], ['round', 'mom', 'crying'], ['round', 'kid', 'laugh'], ['round', 'grandma', 'proud'],
  ['soft', 'dad', 'laugh'], ['soft', 'dad', 'worried'], ['soft', 'mom', 'surprised'], ['soft', 'mom', 'happy'], ['soft', 'kid', 'love'], ['soft', 'grandma', 'sleepy']];
const hideAll = () => Object.values(CASTS).forEach(c => Object.values(c).forEach(p => p.outer.visible = false));
const SHOTS = [['dad', 'neutral'], ['dad', 'happy'], ['dad', 'laugh'], ['dad', 'squint'], ['dad', 'reading'], ['dad', 'worried'], ['dad', 'sad'], ['dad', 'proud'],
  ['mom', 'happy'], ['mom', 'surprised'], ['mom', 'crying'], ['mom', 'angry'], ['kid', 'laugh'], ['kid', 'love'], ['grandma', 'proud'], ['grandma', 'sleepy']];
const lbl = document.getElementById('lbl');
function familyShot(CAST, name) { hideAll(); const xs = { grandma: -0.84, dad: -0.28, mom: 0.3, kid: 0.82 }, ex = { grandma: 'proud', dad: 'laugh', mom: 'happy', kid: 'love' };
  for (const [k, P] of Object.entries(CAST)) { P.outer.visible = true; P.outer.position.set(xs[k], 0.95, 0); P.outer.rotation.y = -xs[k] * 0.25; poseIdle(P, 0, 0); P.face(ex[k], -1); }
  CAST.kid.arms[1].rotation.set(-2.7, 0, -0.25); CAST.kid.elbows[1].rotation.x = -0.4;
  labCam.position.set(0, 1.3, 7.6); labCam.lookAt(0, 1.05, 0); shootTo(RTA, lab, labCam); composite(0, 1.0, 1.0); lbl.textContent = name; }
window.renderAt = (t) => { const n = Math.round(t);
  if (n === 16) { familyShot(CASTS.box, 'SQUARE'); return true; } if (n === 40) { familyShot(CASTS.round, 'ROUND'); return true; } if (n === 41) { familyShot(CASTS.soft, 'SOFT CUBE'); return true; }
  const [shape, who, ex] = n >= 20 ? SHOTS2[clamp(n - 20, 0, SHOTS2.length - 1)] : ['box', ...SHOTS[clamp(n, 0, SHOTS.length - 1)]];
  hideAll(); const P = CASTS[shape][who]; P.outer.visible = true; P.outer.position.set(0, 0.95, 0); poseIdle(P, 0, 0); P.face(ex, -1);
  P.outer.updateMatrixWorld(true); const hd = P.head.getWorldPosition(V3(0, 0, 0));
  labCam.position.set(hd.x + 0.4, hd.y + 0.05, hd.z + 1.8); labCam.lookAt(hd.x + 0.02, hd.y - 0.12, hd.z);
  shootTo(RTA, lab, labCam); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; composite(0, 1.0, 1.0);
  lbl.textContent = (shape === 'box' ? '' : shape.toUpperCase() + ' ') + who.toUpperCase() + ' · ' + ex; return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
