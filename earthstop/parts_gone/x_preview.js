// character look test: you (the approved hero) + the friend (shorter, chubby, red tee) in front of the house, daylight
function headOf(P) { P.outer.updateMatrixWorld(true); return P.head.getWorldPosition(V3(0, 0, 0)); }
for (const o of [nb1.outer, nb2.outer, carKeys, eggDrop, ...BAGS, ...eggs, ...splats]) o.visible = false;   // (makeBlock returns {outer, …}: hide the outer group)
const friend = makeBlock({ head: 'human', body: 'human', fat: true, chubbyHead: true, skin: '#f4caa0', hair: '#c8642a', browCol: '#a04a1e', top: '#d8342a', jeans: true, bottom: '#3d5f8f', shoe: '#2a2a2e', hairStyle: 'mop', freckles: true, eyeS: 0.8, browW: 1.5, blush: 0.6, headS: 0.95, h: 0.86 }); st.add(friend.outer);
const VIEW = +(new URLSearchParams(location.search).get('v') || 0);
window.renderAt = (t) => {
  for (const [P, x, ry] of [[hero, -0.45, 0.25], [friend, 0.45, -0.25]]) { poseReset(P, t); place(P, x, 2.5, ry); }
  hero.face('happy', t); friend.face(VIEW === 2 ? 'laugh' : 'smirk', t);
  const fh = headOf(friend), c = [[V3(0, 1.25, 6.4), V3(0, 1.05, 2.5)], [fh.clone().add(V3(0.15, 0.05, 1.3)), fh.clone().add(V3(0, -0.12, 0))], [fh.clone().add(V3(-1.25, 0.05, 0.55)), fh.clone().add(V3(0, -0.12, 0))]][VIEW];
  stCam.position.copy(c[0]); stCam.lookAt(c[1]); stCam.fov = 40; shootTo(RTA, st, stCam); composite(0, 1, 1); return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
