// finger lab: arms forward, palms down; ?c=curl&s=sign ; camera close on the hands from the front-top
const labS = new THREE.Scene(); labS.background = new THREE.Color('#a9bfd0'); labS.environment = new THREE.PMREMGenerator(renderer).fromScene(new (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment(), 0.04).texture; labS.environmentIntensity = 0.7;
const ls = new THREE.DirectionalLight(0xfff1dc, 2.2); ls.position.set(2, 4, 4); labS.add(ls);
const P = makeHuman('hero', { tee: 'mustard' }); labS.add(P.outer);
const q = new URLSearchParams(location.search), C = +(q.get('c') || 0.8), SG = +(q.get('s') || 1), VIEW = +(q.get('v') || 0);
const labCam = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);
window.renderAt = (t) => { poseRest(P); armsDown(P, 1); for (const [s, k] of [['l', 1], ['r', -1]]) { rotL(P, 'upperarm_' + s, [1, 0, 0], -1.2); rotL(P, 'upperarm_' + s, [0, 1, 0], -0.25 * k); }
  const AX = q.get('ax') || 'z'; const la = { x: V3(1, 0, 0), y: V3(0, 1, 0), z: V3(0, 0, 1) }[AX];
  for (const s of ['l', 'r']) for (const f of ['index', 'middle', 'ring', 'pinky']) for (const j of ['01', '02', '03']) { const b = P.bones[`${f}_${j}_${s}`]; b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(la, C * SG)); }
  P.outer.updateMatrixWorld(true);
  if (VIEW === 1) { labCam.position.set(-1.1, 1.35, 0.45); labCam.lookAt(-0.2, 1.3, 0.45); } else { labCam.position.set(0, 1.75, 1.35); labCam.lookAt(0, 1.3, 0.55); }
  shootTo(RTA, labS, labCam); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { window.renderAt(0); return true; })();
