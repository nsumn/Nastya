// =================== debug turntable (?debug=car) ===================
const studio = new THREE.Scene(); studio.background = new THREE.Color('#202226');
const sCam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
studio.add(new THREE.HemisphereLight(0xdfe6f0, 0x303034, 1.1)); const sKey = new THREE.DirectionalLight(0xffffff, 2.5); sKey.position.set(4, 6, 3); sKey.castShadow = true; studio.add(sKey);
studio.add(mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), M('#3a3c40'), false, true));
const demoCar = makeRoadster(); studio.add(demoCar.g);
function debugCar(t) { const views = [[10, 2.2, 10], [0.01, 1.4, 15], [-14, 1.3, 0.01], [14, 1.1, 0.01], [-9, 3, 9]]; const v = views[Math.floor(t) % views.length];
  sCam.fov = 30; sCam.position.set(...v); sCam.lookAt(0, 0.55, 0); shoot(studio, sCam, 1.0); }
