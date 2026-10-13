
// =================== OCEAN (meters): three.js Water under a real sunrise sky (Poly Haven HDRI) — the Indian Ocean ===================
const ocean = new THREE.Scene();
const oCam = new THREE.PerspectiveCamera(55, W / H, 0.1, 20000);
let OSUN = new THREE.Vector3(0, 0.1, -1).normalize();
let water = null;
async function buildOcean() {
  const hdr = await hdrP('hdri/kloppenheim_06_puresky_4k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  ocean.background = hdr; ocean.environment = pmrem.fromEquirectangular(hdr).texture; ocean.backgroundIntensity = 1.0;
  OSUN = hdrSunDir(hdr); console.log('ocean sun', OSUN.toArray().map(v => v.toFixed(3)).join(','));
  const wn = await texP('water/waternormals.jpg', false); wn.wrapS = wn.wrapT = THREE.RepeatWrapping;
  water = new Water(new THREE.PlaneGeometry(20000, 20000), { textureWidth: 1024, textureHeight: 1024, waterNormals: wn, sunDirection: OSUN.clone(), sunColor: 0xfff0d8, waterColor: 0x0a2a3c, distortionScale: 3.7, fog: false });
  water.material.uniforms.size.value = 2.0; water.rotation.x = -Math.PI / 2; ocean.add(water);
}
