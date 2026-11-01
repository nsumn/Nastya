const labS = new THREE.Scene(); labS.background = new THREE.Color('#a9bfd0'); labS.environment = kw.environment; labS.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.4));
const V = (new URLSearchParams(location.search).get('ax') || 'z,1').split(','), AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[V[0]], SG = +V[1];
const P = makeHuman('girl', { tee: 'cream' }); labS.add(P.outer);
const LC = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);
window.renderAt = () => { poseRest(P); armsDown(P, 1); for (const [s, q] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [0, 0, 1], q * 1.15); rotL(P, 'upperarm_' + s, [1, 0, 0], -0.25); rotL(P, 'lowerarm_' + s, [0, 0, 1], q * 2.2); rotL(P, 'lowerarm_' + s, AX, -q * SG * 0.6); }
  LC.position.set(0.8, 1.3, 4.2); LC.lookAt(0, 1.2, 0); shootTo(RTA, labS, LC); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = Promise.resolve(window.renderAt());
