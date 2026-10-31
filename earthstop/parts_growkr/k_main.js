// =================== cast + shots ===================
// a person: outer group at the feet; place(P, x, z, ry, dy) puts the feet at (x, dy, z)
function place(P, x, z, ry, dy = 0) { P.outer.position.set(x, dy, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
const boneW = (P, n) => P.bones[n].getWorldPosition(V3(0, 0, 0));
// sitting on the ground, legs forward (knees a little up); returns how much to lower the body so the hips touch the mat
function sitGround(P, knee = 0.35) { for (const s of ['l', 'r']) { rotL(P, 'thigh_' + s, [1, 0, 0], -1.45 + knee * 0.5); rotL(P, 'calf_' + s, [1, 0, 0], knee); rotL(P, 'foot_' + s, [1, 0, 0], -0.3); }
  rotL(P, 'thigh_l', [0, 0, 1], 0.12); rotL(P, 'thigh_r', [0, 0, 1], -0.12); rotL(P, 'spine_01', [1, 0, 0], 0.12); }
function holdBowl(P, eat = 0) { armsDown(P, 1.0);
  rotL(P, 'upperarm_l', [1, 0, 0], -0.5); rotL(P, 'lowerarm_l', [1, 0, 0], -1.0); rotL(P, 'lowerarm_l', [0, 1, 0], -0.95); rotL(P, 'hand_l', [0, 0, 1], -1.3); fingers(P, 'l', 0.65);
  rotL(P, 'upperarm_r', [1, 0, 0], -0.55 - 0.25 * eat); rotL(P, 'lowerarm_r', [1, 0, 0], -1.35 - 0.3 * eat); rotL(P, 'lowerarm_r', [0, 1, 0], 0.8); fingers(P, 'r', 0.75); }
function settle(P, hipY = 0.1) { P.outer.updateMatrixWorld(true); const py = boneW(P, 'pelvis').y; P.outer.position.y += hipY - py; P.outer.updateMatrixWorld(true); }
const hero = makeHuman('hero', { tee: 'mustard' }); kw.add(hero.outer);
const cup = ramenCup(); cup.scale.setScalar(1.0); kw.add(cup);
picnicMat(0.05, 0.2, 0.1, '#3b78c4');
const extras = [];
for (const [nm, x, z, ry, o] of [['girl', -0.55, -8.2, 1.75, { tee: 'cream' }], ['man2', 1.35, -9.4, -1.6, {}], ['woman2', -1.2, -9.6, 1.5, {}]]) {
  const P = makeHuman(nm, o); kw.add(P.outer); extras.push([P, x, z, ry]); }
// HUD + captions
const $ = id => document.getElementById(id);
const nAt = t => clamp(Math.floor((t - T0) / DT) + 1, 0, NDBL);
const heightAt = t => 1.7 * Math.pow(2, nAt(t));
const fmtH = h => h < 1000 ? (h < 10 ? h.toFixed(1) : Math.round(h).toLocaleString('ko-KR')) + 'm' : (h / 1000 < 100 ? (h / 1000).toFixed(1) : Math.round(h / 1000).toLocaleString('ko-KR')) + 'km';
function text(t) {
  $('lab').textContent = '내 키'; $('val').innerHTML = fmtH(heightAt(t)); $('sub').textContent = `${nAt(t)}번째 · 1.5초마다 ×2`;
  $('title').style.opacity = 1 - smooth(1.6, 2.1, t);
  $('cap').innerHTML = t > 2.2 && t < 5.0 ? '라면 먹다가… 갑자기.' : '';
}
// =================== render ===================
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  poseRest(hero); place(hero, 0, 0, 0.35); sitGround(hero); holdBowl(hero, 0.5 + 0.5 * Math.sin(t * 4)); rotL(hero, 'head', [0, 1, 0], -0.15); rotL(hero, 'head', [1, 0, 0], 0.12); settle(hero, 0.1);
  const hA = boneW(hero, 'middle_01_l'), hB = boneW(hero, 'hand_l'); cup.position.copy(hA.lerp(hB, 0.4)).add(V3(-0.035, 0.0, 0.0)); cup.rotation.y = hero.outer.rotation.y;
  extras.forEach(([P, x, z, ry], i) => { poseRest(P); place(P, x + Math.sin(ry) * 0.9 * t, z, ry); armsDown(P, 0.9); const ph = t * 5.5 + i * 2;
    rotL(P, 'thigh_l', [1, 0, 0], 0.35 * Math.sin(ph)); rotL(P, 'thigh_r', [1, 0, 0], -0.35 * Math.sin(ph)); rotL(P, 'calf_l', [1, 0, 0], 0.4 * Math.max(0, Math.sin(ph + 1.6))); rotL(P, 'calf_r', [1, 0, 0], 0.4 * Math.max(0, -Math.sin(ph + 1.6)));
    rotL(P, 'upperarm_l', [1, 0, 0], -0.25 * Math.sin(ph)); rotL(P, 'upperarm_r', [1, 0, 0], 0.25 * Math.sin(ph)); fingers(P, 'l', 0.35); fingers(P, 'r', 0.35); });
  const cp = V3(0.32, 1.45, 3.05), lk = V3(-0.02, -1.6, -20);
  kCam.position.copy(cp); kCam.lookAt(lk); kCam.fov = 40;
  shootTo(RTA, kw, kCam); compMat.uniforms.uLook.value = 0.0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
