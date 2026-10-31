// pose lab: ?v=0 front, ?v=1 side, ?v=2 top — hero only, with the sit + hold pose from k_main
const labS = new THREE.Scene(); labS.background = new THREE.Color('#a9bfd0'); labS.environment = new THREE.PMREMGenerator(renderer).fromScene(new (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment(), 0.04).texture; labS.environmentIntensity = 0.6;
const ls = new THREE.DirectionalLight(0xfff1dc, 2.6); ls.position.set(2, 4, 4); labS.add(ls);
const flo = mesh(new THREE.PlaneGeometry(20, 20), M('#cfc8bb')); flo.rotation.x = -Math.PI / 2; labS.add(flo);
for (let i = -5; i <= 5; i++) { const l = mesh(new THREE.BoxGeometry(0.01, 0.002, 10), M('#888')); l.position.set(i * 0.2, 0.001, 0); labS.add(l); const l2 = mesh(new THREE.BoxGeometry(10, 0.002, 0.01), M('#888')); l2.position.set(0, 0.001, i * 0.2); labS.add(l2); }
const P = makeHuman('hero', { tee: 'mustard' }); labS.add(P.outer);
const VIEW = +(new URLSearchParams(location.search).get('v') || 0);
const labCam = new THREE.PerspectiveCamera(30, W / H, 0.05, 100);
window.renderAt = (t) => { poseRest(P); place(P, 0, 0, 0); POSE(P); settle(P, 0.1);
  if (VIEW === 1) { labCam.position.set(3.2, 0.7, 0.3); labCam.lookAt(0, 0.6, 0.3); } else if (VIEW === 2) { labCam.position.set(0, 4.0, 0.31); labCam.lookAt(0, 0, 0.3); } else { labCam.position.set(0, 0.7, 3.2); labCam.lookAt(0, 0.6, 0); }
  shootTo(RTA, labS, labCam); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { window.renderAt(0); return true; })();
