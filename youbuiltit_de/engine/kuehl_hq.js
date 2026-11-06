// ===================== HQ look for 04 Kühlschrank (appended after kuehl_main.js) =====================
// Poly Haven photo textures (CC0, engine/assets/), HDRI image-based light, ambient occlusion (GTAO), MSAA x4.
// Build: cat lib.js kuehl_main.js kuehl_hq.js > kuehl.js      Off for comparison: index_kuehl.html?hq=0
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

if (Q.get('hq') !== '0') {
  window.__done = false;
  const TL = new THREE.TextureLoader();
  const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
  const pbr = async (d, n) => ({ d: await ld(d, true), n: await ld(n, false) });
  const rep = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
  const apply = (mat, p, rx, ry, o = {}) => { mat.map = rep(p.d, rx, ry); mat.normalMap = rep(p.n, rx, ry); mat.bumpMap = null;
    mat.normalScale.set(o.ns ?? 1, o.ns ?? 1); mat.color.set(o.color || '#ffffff'); mat.needsUpdate = true; };
  const [wood, thatch, grass, sky] = await Promise.all([
    pbr('wood_planks_diff_1k.jpg', 'wood_planks_nor_gl_1k.jpg'), pbr('thatch_roof_angled_diff_1k.jpg', 'thatch_roof_angled_nor_gl_1k.jpg'),
    pbr('leafy_grass_detail_1k.jpg', 'leafy_grass_nor_gl_1k.jpg'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);
  apply(woodMat, wood, 1.2, 1.2, { color: '#e2bf96' });
  apply(strawMat, thatch, 1.5, 1.5, { color: '#ffe7a8' });
  // lawn: keep the cartoon green, photo grass adds detail + normals (world UVs repeat every 6 m -> 4 tiles)
  apply(grassMat, grass, 4, 4, { color: '#74b54e', ns: .9 });
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(sky).texture;
  sun.shadow.mapSize.set(4096, 4096);

  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, W, H);
  gtao.updateGtaoMaterial({ radius: .6, distanceExponent: 2, thickness: 1, scale: 1.1, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: +(Q.get('pdr') || 6), rings: 2, samples: 16 });
  if (+(Q.get('ao') ?? 0) > 0) composer.addPass(gtao);   // off by default: GTAO left black screen-space rectangles here
  composer.addPass(new OutputPass());
  // sprites (labels, flag) would be squares in the AO depth pass: draw them in their own scene on top
  const overlay = new THREE.Scene(); const sprites = []; scene.traverse(o => { if (o.isSprite) sprites.push(o); });
  sprites.forEach(s => overlay.add(s));
  window.renderAt = (t, q = .92) => {
    update(t);
    scene.environmentIntensity = .55 * hemi.intensity / 1.15; hemi.intensity *= .55;
    composer.render();
    renderer.autoClear = false; renderer.render(overlay, camera); renderer.autoClear = true;
    og.drawImage(renderer.domElement, 0, 0); drawCaption(t);
    return out.toDataURL('image/jpeg', q);
  };
  window.__scene = scene;
  window.__done = true;
}
