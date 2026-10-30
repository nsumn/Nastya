// character look test: you (the approved hero) + the friend (shorter, chubby, red tee) in front of the house, daylight
for (const o of [nb1.outer, nb2.outer, carKeys, eggDrop, ...BAGS, ...eggs, ...splats]) o.visible = false;   // (makeBlock returns {outer, …}: hide the outer group)
const friend = makeBlock({ head: 'human', body: 'human', fat: true, skin: '#f0c49a', hair: '#6a3a1e', top: '#d8342a', jeans: true, bottom: '#3d5f8f', shoe: '#2a2a2e', hairStyle: 'bangs', headS: 0.95, h: 0.86 }); st.add(friend.outer);
const VIEW = +(new URLSearchParams(location.search).get('v') || 0);
window.renderAt = (t) => {
  for (const [P, x, ry] of [[hero, -0.45, 0.25], [friend, 0.45, -0.25]]) { poseReset(P, t); place(P, x, 2.5, ry); }
  hero.face('happy', t); friend.face(VIEW === 2 ? 'laugh' : 'smirk', t);
  const c = [[V3(0, 1.25, 6.4), V3(0, 1.05, 2.5)], [V3(3.2, 1.3, 4.6), V3(0, 1.0, 2.5)], [V3(0.3, 1.5, 4.3), V3(0.2, 1.45, 2.5)]][VIEW];
  stCam.position.copy(c[0]); stCam.lookAt(c[1]); stCam.fov = 40; shootTo(RTA, st, stCam); composite(0, 1, 1); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
