// ===================== HQ look layer (appended after a scene's *_main.js) =====================
// Photo textures + HDRI sky from Poly Haven (CC0, engine/assets/), image-based lighting, ambient occlusion (GTAO).
// Build: cat lib.js burg_main.js hq_layer.js > burg.js     Turn off for comparison: index_burg.html?hq=0
// Expects from the scene: stoneMat, towerMat, woodMat, plankMat, stakeMat, thatchMat, terrMat, tGrass, updateTerrain,
// plain, daySky (let), hemi, camera, update, og, drawCaption.
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

if (Q.get('hq') !== '0') {
  window.__done = false;
  const HQ = { env: +(Q.get('env') || .55), ao: +(Q.get('ao') || 1), skyRot: +(Q.get('skyrot') || 0), bg: +(Q.get('bg') || 0) };
  const TL = new THREE.TextureLoader();
  const ld = (f, srgb) => new Promise((res, rej) => TL.load('assets/' + f, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
  const pbr = async name => ({ d: await ld(name + '_diff_1k.jpg', true), n: await ld(name + '_nor_gl_1k.jpg', false) });
  const rep = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
  const apply = (mat, p, rx = 1, ry = 1, o = {}) => {
    mat.map = rep(p.d, rx, ry); mat.normalMap = rep(p.n, rx, ry); mat.bumpMap = null;
    mat.normalScale.set(o.ns ?? 1, o.ns ?? 1); mat.color.set(o.color || '#ffffff'); mat.flatShading = false; mat.needsUpdate = true;
  };

  const grassP = (async () => ({ d: await ld('leafy_grass_detail_1k.jpg', true), n: await ld('leafy_grass_nor_gl_1k.jpg', false) }))();
  const [brick, grass, wood, thatch, sky] = await Promise.all([pbr('stone_wall'), grassP, pbr('wood_planks'),
    pbr('thatch_roof_angled'), new RGBELoader().loadAsync('assets/kloofendal_48d_partly_cloudy_puresky_2k.hdr')]);

  // stone + wood + thatch (also clones made earlier from these materials, e.g. the well ring)
  const oldStone = new Map([[stoneMat.map, [1, 1]], [towerMat.map, [4, 2.2]]]);
  scene.traverse(o => { const m = o.material; if (m && !Array.isArray(m) && m !== stoneMat && m !== towerMat && oldStone.has(m.map))
    apply(m, brick, ...oldStone.get(m.map), { ns: 1.3, color: '#f2ece2' }); });
  apply(stoneMat, brick, 1, 1, { ns: 1.3, color: '#f2ece2' });
  apply(towerMat, brick, 4, 2.2, { ns: 1.3, color: '#f2ece2' });
  apply(woodMat, wood, 1, 1, { color: '#d9b48a' });
  apply(plankMat, wood, 1, 1, { color: '#b98a5c' });
  apply(stakeMat, wood, .3, 1, { color: '#e0b98a' });
  apply(thatchMat, thatch, .5, .5);

  // terrain: our green vertex colours stay (lush, cartoon), the photo grass only adds detail (grey luminance map) + normals
  terrMat.map = rep(grass.d, 20, 20); terrMat.normalMap = rep(grass.n, 20, 20); terrMat.normalScale.set(.8, .8); terrMat.needsUpdate = true;
  plain.material.map = rep(grass.d, 150, 150); plain.material.needsUpdate = true;
  updateTerrain();

  // HDRI: background + image-based lighting
  sky.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromEquirectangular(sky).texture;
  if (HQ.bg > 0) { daySky = sky; scene.background = sky; scene.backgroundIntensity = HQ.bg; }   // default: keep the painted cartoon sky
  // lusher grass: a bit more saturated and brighter
  const hsl = {}; tGrass.forEach(c => { c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * 1.25), hsl.l * 1.08); }); updateTerrain();
  scene.backgroundRotation.y = HQ.skyRot; scene.environmentRotation.y = HQ.skyRot;

  // ambient occlusion, MSAA render target
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, W, H);
  gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 2, thickness: 1.5, scale: 1.2, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = HQ.ao;
  if (HQ.ao > 0) composer.addPass(gtao);
  composer.addPass(new OutputPass());

  window.renderAt = (t, q = .9) => {
    update(t);
    scene.environmentIntensity = HQ.env * hemi.intensity / 1.15;   // follows the day/night cycle of the scene
    hemi.intensity *= .5;                                            // the HDRI does most of the sky fill now
    composer.render();
    og.drawImage(renderer.domElement, 0, 0); drawCaption(t);
    return out.toDataURL('image/jpeg', q);
  };
  window.__done = true;
}
