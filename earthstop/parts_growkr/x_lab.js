// look test for the people (not part of the video)
const labS = new THREE.Scene(); labS.background = new THREE.Color('#a9bfd0'); labS.environment = new THREE.PMREMGenerator(renderer).fromScene(new (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment(), 0.04).texture; labS.environmentIntensity = 0.6;
const ls = new THREE.DirectionalLight(0xfff1dc, 2.6); ls.position.set(2, 4, 4); ls.castShadow = true; labS.add(ls);
const flo = mesh(new THREE.PlaneGeometry(20, 20), M('#cfc8bb')); flo.rotation.x = -Math.PI / 2; labS.add(flo);
const A = makeHuman({ sex: 'm' }), Bf = makeHuman({ sex: 'f', hair: 'Hair_Long', top: '#f2f0ea', pants: '#2b2f3a', h: 1.62 });
A.outer.position.set(-0.45, 0, 0); Bf.outer.position.set(0.45, 0, 0); labS.add(A.outer, Bf.outer);
const VIEW = +(new URLSearchParams(location.search).get('v') || 0);
const labCam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
window.renderAt = (t) => { for (const P of [A, Bf]) { poseRest(P); if (VIEW >= 1) armsDown(P); }
  if (VIEW === 2) { labCam.position.set(-0.45, 1.6, 0.9); labCam.lookAt(-0.45, 1.5, 0); } else { labCam.position.set(0, 1.0, 5.2); labCam.lookAt(0, 0.95, 0); }
  shootTo(RTA, labS, labCam); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { window.renderAt(0); return true; })();
