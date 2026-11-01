// shell orientation lab: ?phi=<rad>
const L = new THREE.Scene(); L.background = new THREE.Color('#b9c8d6'); L.environment = kw.environment; L.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.2)); const dl = new THREE.DirectionalLight(0xffffff, 2.5); dl.position.set(1, 2, 2); L.add(dl);
const fl = mesh(new THREE.PlaneGeometry(1, 1), M('#9a978f')); fl.rotation.x = -Math.PI / 2; L.add(fl);
const S = [0].map(i => { const s = makeSnail(); s.position.set(0, 0, 0); s.rotation.y = Math.PI / 2; snailAnim(s, 1); L.add(s); return s; });
const LC = new THREE.PerspectiveCamera(30, W / H, 0.005, 10);
window.renderAt = () => { LC.position.set(0.16, 0.05, 0.26); LC.lookAt(0, 0.012, 0); shootTo(RTA, L, LC); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = Promise.resolve(window.renderAt());
