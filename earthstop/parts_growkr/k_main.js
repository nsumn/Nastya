// =================== cast + shots ===================
function kReset(P, t) { P.outer.visible = true; P.outer.rotation.set(0, 0, 0); P.root.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); P.elbows.forEach(e => e.rotation.set(-0.15, 0, 0)); }
function kPlace(P, x, z, ry, y = 0) { P.outer.position.set(x, 0.95 + y, z); P.outer.rotation.y = ry; }
function sitGround(P) { P.legs.forEach((l, i) => l.rotation.set(-1.5, 0, (i ? -1 : 1) * 0.08)); P.knees.forEach(k => k.rotation.x = 0.05); }
const hero = makeBlock({ head: 'human', body: 'human', skin: '#efc6a0', hair: '#1e1a18', top: '#d9a63a', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 }); kw.add(hero.outer);
const cup = ramenCup(); kw.add(cup);
picnicMat(0.1, 0.1, 0.1, '#3b78c4');
const extras = [];
seed = 77; for (const [x, z, ry, c, top] of [[-3.2, -1.2, 0.6, '#e9c23c', '#e46a5a'], [-2.4, -1.0, -0.9, '#e9c23c', '#f0efe9'], [3.6, -2.4, -0.4, '#5aa070', '#35507a'], [4.4, -2.0, 2.4, '#5aa070', '#c8b8e8'], [-6.5, -3.2, 0.2, '#e46a5a', '#2f2f33']]) {
  const P = makeBlock({ head: 'human', body: 'human', skin: pick(['#efc6a0', '#e8bb92', '#f3cfb0']), hair: pick(['#1e1a18', '#2a211c', '#3a2a20']), top, jeans: rnd() < 0.6, bottom: '#2f3440', shoe: '#eeeeee', hairStyle: pick(['short', 'bangs', 'bangs']), headS: 0.88, h: R(0.92, 1.0) });
  kw.add(P.outer); picnicMat(x, z + 0.2, ry, c); extras.push([P, x, z, ry]); }
// HUD + captions
const $ = id => document.getElementById(id);
const heightAt = t => 1.7 * Math.pow(2, clamp(Math.floor((t - T0) / DT) + 1, 0, NDBL));
const nAt = t => clamp(Math.floor((t - T0) / DT) + 1, 0, NDBL);
const fmtH = h => h < 1000 ? (h < 10 ? h.toFixed(1) : Math.round(h).toLocaleString('ko-KR')) + 'm' : (h / 1000 < 100 ? (h / 1000).toFixed(1) : Math.round(h / 1000).toLocaleString('ko-KR')) + 'km';
function text(t) {
  const n = nAt(t), h = heightAt(t);
  $('lab').textContent = '내 키'; $('val').innerHTML = fmtH(h); $('sub').textContent = `${n}번째 · 1.5초마다 ×2`;
  $('title').style.opacity = 1 - smooth(1.6, 2.1, t);
  $('cap').innerHTML = t > 2.2 && t < 5.0 ? '라면 먹다가… 갑자기.' : '';
}
// =================== render ===================
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  kReset(hero, t); kPlace(hero, 0, 0, 0.55, -0.8); sitGround(hero);
  hero.arms.forEach((a, i) => a.rotation.set(-0.95, 0, (i ? -1 : 1) * 0.12)); hero.elbows.forEach(e => e.rotation.x = -1.05); hero.face('happy', t);
  hero.outer.updateMatrixWorld(true); const hA = hero.elbows[0].localToWorld(V3(0, -0.3, 0.04)), hB = hero.elbows[1].localToWorld(V3(0, -0.3, 0.04)); cup.position.copy(hA.lerp(hB, 0.5)).add(V3(0, 0.03, 0));
  for (const [P, x, z, ry] of extras) { kReset(P, t); kPlace(P, x, z, ry, -0.8); sitGround(P); P.arms.forEach(a => a.rotation.set(-0.4, 0, 0)); P.face('happy', t); }
  const cp = V3(1.05, 0.88, 2.55), lk = V3(0.15, 1.02, -18);
  kCam.position.copy(cp); kCam.lookAt(lk); kCam.fov = 40;
  shootTo(RTA, kw, kCam); compMat.uniforms.uLook.value = 0.0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
