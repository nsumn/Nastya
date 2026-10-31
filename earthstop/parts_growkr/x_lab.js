// expression lab: ?e=<expression>  close-up of the hero's face
const labS = new THREE.Scene(); labS.background = new THREE.Color('#a9bfd0'); labS.environment = new THREE.PMREMGenerator(renderer).fromScene(new (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment(), 0.04).texture; labS.environmentIntensity = 0.7;
const ls = new THREE.DirectionalLight(0xfff1dc, 2.2); ls.position.set(1.5, 3, 4); labS.add(ls);
const P = makeHuman('hero', { tee: 'mustard' }); labS.add(P.outer);
const q = new URLSearchParams(location.search), E = q.get('e') || 'neutral';
const labCam = new THREE.PerspectiveCamera(22, W / H, 0.05, 100);
window.renderAt = (t) => { poseRest(P); armsDown(P, 1); face(P, E, 1.0); const h = P.bones.head.getWorldPosition(V3()); labCam.position.set(h.x, h.y + 0.06, h.z + 0.85); labCam.lookAt(h.x, h.y + 0.05, h.z);
  shootTo(RTA, labS, labCam); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { window.renderAt(0); return true; })();
