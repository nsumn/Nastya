import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// "What if you dug a hole through the Earth?" — realistic look: Poly Haven HDRI + photoscanned PBR textures + glTF scans,
// Solar System Scope 8k Earth maps, three.js Water/Sky, post: depth of field, bloom, grain, vignette (AgX tone mapping).
// Numbers: tools/hole_math.py (PREM): 7,919 mi through, 38.1 min fall, 22,188 mph at the center, 1.09 G at the core boundary.
// Assets: python3 tools/fetch_hole_assets.py  (-> assets/hole/, git-ignored)
// =================== timeline ===================
const DIG = 0.0, SHAFT = 4.0, CUT = 27.0, FALL = 32.0, OCEAN = 52.0, T_END = 60.0;
const A = 'assets/hole/';
// =================== rng / helpers ===================
let seed = 7741;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const fadeWin = (t, a, b, f = 0.35) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const fmt = n => Math.round(n).toLocaleString('en-US');

// =================== renderer + post ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(W, H);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera()); composer.addPass(renderPass);
const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 1.5, aperture: 0.004, maxblur: 0.008 }); composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.25, 0.6, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uGrain: { value: 0.03 }, uVig: { value: 0.32 }, uCon: { value: 1.1 }, uSat: { value: 1.15 }, uWarm: { value: 0.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT, uGrain, uVig, uCon, uSat, uWarm; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uT*61.7)*43758.5453); }
    void main(){ vec4 c=texture2D(tDiffuse,vUv); vec2 q=vUv-0.5; q.x*=0.5625;
      float v=1.0-uVig*smoothstep(0.18,0.75,length(q)*1.35); c.rgb*=v;
      float l=dot(c.rgb,vec3(0.299,0.587,0.114)); c.rgb=mix(vec3(l),c.rgb,uSat); c.rgb=(c.rgb-0.5)*uCon+0.5; c.rgb*=vec3(1.0+uWarm,1.0,1.0-uWarm);
      c.rgb+=(h(vUv*vec2(1080.0,1920.0))-0.5)*uGrain; gl_FragColor=c; }`,
}); composer.addPass(grain);
function post(scene, cam, o) {
  renderPass.scene = scene; renderPass.camera = cam;
  bokeh.enabled = !!o.dof; if (o.dof) { bokeh.scene = scene; bokeh.camera = cam; bokeh.uniforms.focus.value = o.dof.focus; bokeh.uniforms.aperture.value = o.dof.aperture; bokeh.uniforms.maxblur.value = o.dof.maxblur; bokeh.uniforms.aspect.value = cam.aspect; bokeh.uniforms.nearClip.value = cam.near; bokeh.uniforms.farClip.value = cam.far; }
  bloom.strength = o.bloom ?? 0.25; bloom.radius = o.bloomR ?? 0.6; bloom.threshold = o.bloomT ?? 0.92;
  renderer.toneMappingExposure = o.exp ?? 1.0;
  grain.uniforms.uCon.value = o.con ?? 1.1; grain.uniforms.uSat.value = o.sat ?? 1.15; grain.uniforms.uWarm.value = o.warm ?? 0;
}

// =================== loaders ===================
const texLoader = new THREE.TextureLoader(), rgbe = new RGBELoader(), gltfLoader = new GLTFLoader();
function texP(path, srgb = true, rep = null) { return new Promise(ok => texLoader.load(A + path, t => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } ok(t); })); }
async function pbrSet(name, rep) {
  const [map, nor, arm] = await Promise.all([texP(`tex/${name}_diff.jpg`, true, rep), texP(`tex/${name}_nor.jpg`, false, rep), texP(`tex/${name}_arm.jpg`, false, rep)]);
  return { map, nor, arm };
}
const gltf = path => new Promise((ok, bad) => gltfLoader.load(A + path, ok, undefined, bad));
const hdrP = path => new Promise((ok, bad) => rgbe.load(A + path, ok, undefined, bad));
const pmrem = new THREE.PMREMGenerator(renderer);
// brightest direction of an equirect HDR (the sun) in three.js world coordinates
function hdrSunDir(hdr) {
  const { data, width: w, height: h } = hdr.image; const half = data instanceof Uint16Array; let best = -1, bi = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; const r = half ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i]; const g = half ? THREE.DataUtils.fromHalfFloat(data[i + 1]) : data[i + 1]; const l = r + g; if (l > best) { best = l; bi = y * w + x; } }
  const px = bi % w, py = Math.floor(bi / w);
  const u = (px + 0.5) / w, v = 1 - (py + 0.5) / h;               // flipY: row 0 of the data is the top of the image
  const phi = (u - 0.5) * 2 * Math.PI, th = (v - 0.5) * Math.PI;
  return new THREE.Vector3(Math.cos(th) * Math.cos(phi), Math.sin(th), Math.cos(th) * Math.sin(phi)).normalize();
}

// =================== YARD (meters): HDRI sunset field, photoscanned lawn + dug pit, grass clumps, rusted spade, gnome ===================
const yard = new THREE.Scene();
const yCam = new THREE.PerspectiveCamera(42, W / H, 0.05, 400);
const ySun = new THREE.DirectionalLight(0xffc890, 4.2); ySun.castShadow = true; ySun.shadow.mapSize.set(4096, 4096);
Object.assign(ySun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 60 }); ySun.shadow.bias = -0.0003; ySun.shadow.normalBias = 0.01; ySun.shadow.radius = 3;
yard.add(ySun, ySun.target);
let SUN_Y = new THREE.Vector3(1, 0.1, 0);
// ground height: gentle lawn undulation, the dug pit, the spoil heap next to it
const HOLE_R = 0.42, MOUND = new THREE.Vector2(0.78, 0.22);
function yH(x, z) {
  const r = Math.hypot(x, z);
  let h = 0.012 * Math.sin(x * 2.1 + 0.6) * Math.cos(z * 1.7) + 0.006 * Math.sin(x * 7.3 + z * 5.1);
  const pit = 1 - smooth(HOLE_R - 0.1, HOLE_R + 0.04, r); h -= 0.75 * Math.pow(pit, 0.7);
  h += 0.05 * Math.exp(-(((r - HOLE_R - 0.08) / 0.09) ** 2));                                   // trampled lip
  const dm = Math.hypot(x - MOUND.x, z - MOUND.y); h += 0.24 * Math.exp(-((dm / 0.36) ** 2)) + 0.05 * Math.exp(-((dm / 0.6) ** 2));
  return h;
}
const dirtMask = (x, z) => Math.max(1 - smooth(0.52, 0.74, Math.hypot(x, z)), 1 - smooth(0.44, 0.68, Math.hypot(x - MOUND.x, z - MOUND.y)));
function lawnMaterial(g, d, cut) {
  const m = new THREE.MeshStandardMaterial({ map: g.map, normalMap: g.nor, roughnessMap: g.arm, aoMap: g.arm, aoMapIntensity: 0.8, roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) });
  m.onBeforeCompile = sh => {
    sh.uniforms.dMap = { value: d.map }; sh.uniforms.dNor = { value: d.nor }; sh.uniforms.uCut = { value: cut ? 1 : 0 };
    sh.vertexShader = 'varying vec3 vWp; varying vec3 vWn;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = `uniform sampler2D dMap, dNor; uniform float uCut; varying vec3 vWp; varying vec3 vWn;
      vec3 tri(sampler2D m, vec3 p, vec3 n){ vec3 w=pow(abs(n),vec3(4.0)); w/=w.x+w.y+w.z; return texture2D(m,p.zy).rgb*w.x+texture2D(m,p.xz).rgb*w.y+texture2D(m,p.xy).rgb*w.z; }
      float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
      float dmask(vec2 p){ float n=vn(p*7.0)*0.6+vn(p*19.0)*0.4; float a=1.0-smoothstep(0.50,0.74,length(p)+(n-0.5)*0.22); float b=1.0-smoothstep(0.42,0.70,length(p-vec2(${MOUND.x},${MOUND.y}))+(n-0.5)*0.22); return max(a,b); }
      ` + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n if(uCut>0.5 && max(abs(vWp.x),abs(vWp.z))<1.45) discard;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float dm=dmask(vWp.xz); vec3 dirt=tri(dMap, vWp*0.9, normalize(vWn));
        float deep=smoothstep(-0.05,-0.5,vWp.y); dirt=mix(dirt, dirt*vec3(0.62,0.55,0.5), deep);
        diffuseColor.rgb=mix(diffuseColor.rgb, dirt, dm);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,0.95,dm);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 dn=tri(dNor, vWp*0.9, normalize(vWn))*2.0-1.0; vec3 dN=normalize(tbn*dn); normal=normalize(mix(normal,dN,dm*(1.0-smoothstep(0.4,0.8,1.0-abs(vWn.y))))); }`);
  };
  return m;
}
const yardGrass = [];
async function buildYard() {
  const hdr = await hdrP('hdri/grasslands_sunset_4k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  const env = pmrem.fromEquirectangular(hdr).texture; yard.environment = env; yard.environmentIntensity = 1.0;
  SUN_Y = hdrSunDir(hdr);
  const sky = new GroundedSkybox(hdr, 1.6, 140); sky.position.y = 1.6 - 0.005; yard.add(sky);
  const [g, d] = await Promise.all([pbrSet('leafy_grass', [1, 1]), pbrSet('brown_mud_02', [1, 1])]);
  for (const t of [g.map, g.nor, g.arm]) t.repeat.set(0.75, 0.75);
  // near patch (fine mesh for the pit) + big lawn with the near square cut out
  const near = new THREE.PlaneGeometry(3, 3, 260, 260); near.rotateX(-Math.PI / 2);
  const p = near.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, yH(p.getX(i), p.getZ(i)));
  near.computeVertexNormals(); near.setAttribute('uv', new THREE.BufferAttribute(near.attributes.uv.array.map((v, i) => v * 3 * 0.75), 2));
  const nearM = new THREE.Mesh(near, lawnMaterial(g, d, false)); nearM.receiveShadow = true; nearM.castShadow = true; yard.add(nearM);
  const big = new THREE.PlaneGeometry(90, 90, 180, 180); big.rotateX(-Math.PI / 2);
  const bp = big.attributes.position; for (let i = 0; i < bp.count; i++) bp.setY(i, yH(bp.getX(i), bp.getZ(i)) - 0.002);
  big.computeVertexNormals(); big.setAttribute('uv', new THREE.BufferAttribute(big.attributes.uv.array.map(v => v * 90 * 0.75), 2));
  const bigM = new THREE.Mesh(big, lawnMaterial(g, d, true)); bigM.receiveShadow = true; yard.add(bigM);
  // grass clumps (photoscanned), instanced around the pit
  const clumps = [];
  for (const f of ['grass_medium_01', 'grass_medium_02']) { const gl = await gltf(`models/${f}/${f}.gltf`); gl.scene.traverse(o => { if (o.isMesh && !/large|tall|LOD[12]/.test(o.name)) clumps.push(o); }); }
  console.log('clumps', clumps.map(c => c.name).join(','), 'sun', SUN_Y.toArray().map(v => v.toFixed(3)).join(','));
  const o3 = new THREE.Object3D();
  const per = Math.round(14000 / clumps.length);
  for (const c of clumps) {
    const im = new THREE.InstancedMesh(c.geometry, c.material, per); let k = 0;
    c.material.side = THREE.DoubleSide; c.material.alphaTest = 0.5;
    for (let i = 0; i < per * 4 && k < per; i++) {
      const a = R(0, 6.283), r = 0.45 + Math.pow(rnd(), 1.4) * 5.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (dirtMask(x, z) > 0.25 + rnd() * 0.5) continue;
      if (r < 2.2 && Math.abs(Math.atan2(z, x) - Math.atan2(-SUN_Y.z, -SUN_Y.x)) < 0.35 && rnd() < 0.7) continue;     // thinner where the camera stands
      o3.position.set(x, yH(x, z) - 0.005, z); o3.rotation.set(R(-0.08, 0.08), R(0, 6.28), R(-0.08, 0.08)); const s = R(0.55, 1.0); o3.scale.set(s, s * R(0.85, 1.25), s); o3.updateMatrix(); im.setMatrixAt(k++, o3.matrix);
    }
    im.count = k; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; yard.add(im); yardGrass.push(im);
  }
  // spade stuck in the spoil heap, gnome watching
  const sp = (await gltf('models/rusted_spade_01/rusted_spade_01.gltf')).scene; sp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const spade = new THREE.Group(); spade.add(sp); sp.position.y = 0.5; yard.add(spade); yard.userData.spade = spade;
  const gn = (await gltf('models/garden_gnome/garden_gnome.gltf')).scene; gn.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  { const sh = new THREE.Vector3(SUN_Y.x, 0, SUN_Y.z).normalize(), sd = new THREE.Vector3(-sh.z, 0, sh.x); const gp = sh.clone().multiplyScalar(0.55).addScaledVector(sd, -0.95);
    gn.position.set(gp.x, yH(gp.x, gp.z), gp.z); gn.rotation.y = Math.atan2(-sh.x, -sh.z) + 0.5; } gn.scale.setScalar(1.0); yard.add(gn);
  // clods of dirt on the heap
  const clodM = new THREE.MeshStandardMaterial({ map: d.map, normalMap: d.nor, roughness: 0.95 });
  for (let i = 0; i < 160; i++) { const a = R(0, 6.28), r = Math.pow(rnd(), 0.7) * 0.75; const x = MOUND.x + Math.cos(a) * r, z = MOUND.y + Math.sin(a) * r; const c = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.006, 0.028), 1), clodM); c.position.set(x, yH(x, z) + 0.002, z); c.rotation.set(R(0, 3), R(0, 3), 0); c.scale.y = R(0.6, 0.9); c.castShadow = true; c.receiveShadow = true; yard.add(c); }
  ySun.position.copy(SUN_Y).multiplyScalar(30); ySun.target.position.set(0, 0, 0);
}
function poseSpade(t) {
  const s = yard.userData.spade; if (!s) return;
  const x = MOUND.x + 0.05, z = MOUND.y - 0.02; s.position.set(x, yH(x, z) - 0.22, z); s.rotation.set(0.08, 0.6, -0.42);
}

// =================== SHAFT (meters): the camera rides down the hole; walls are textured by their true depth ===================
// Local frame: camera at y=0 looking down -Y; a wall point at local y has depth D(t) - y.  uMode 0 = digging (photoscanned rock),
// uMode 1 = the magic tube through the mantle / core (glowing, from the PREM fall table).
const shaft = new THREE.Scene(); shaft.background = new THREE.Color('#000000');
const sCam = new THREE.PerspectiveCamera(72, W / H, 0.02, 400);
const RS = 0.45;                                                       // hole radius (a 3 ft hole)
const shaftU = {
  uD: { value: 0 }, uDv: { value: 0 }, uMode: { value: 0 }, uR: { value: RS }, uT: { value: 0 }, uSky: { value: 1 }, uWet: { value: 0 }, uHeat: { value: 0 }, uSqueeze: { value: 0 },
  tSoil: { value: null }, tClay: { value: null }, tLime: { value: null }, tGran: { value: null }, tGran2: { value: null },
  nSoil: { value: null }, nClay: { value: null }, nLime: { value: null }, nGran: { value: null }, uLamp: { value: 1 },
};
const SHAFT_VS = `uniform float uR, uSqueeze, uT, uD; varying vec3 vP; varying float vAng;
  void main(){ vec3 p=position; float a=atan(p.z,p.x); vAng=a;
    float bulge=uSqueeze*(0.10*sin(a*3.0+1.3)+0.07*sin(a*5.0-(uD-p.y)*0.9)+0.06)*smoothstep(-0.5,-6.0,p.y);   // rock creeping in
    p.xz*= (1.0-bulge);
    vP=p; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
const SHAFT_FS = `uniform float uD, uDv, uMode, uR, uT, uSky, uWet, uHeat, uLamp; uniform sampler2D tSoil, tClay, tLime, tGran, tGran2, nSoil, nClay, nLime, nGran;
  varying vec3 vP; varying float vAng;
  float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
  float fb(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
  vec3 layerCol(vec2 uv, float d){
    vec3 c=texture2D(tSoil,uv).rgb;
    c=mix(c, texture2D(tClay,uv*1.2).rgb*vec3(1.7,1.55,1.4), smoothstep(2.0,3.2,d));
    c=mix(c, texture2D(tLime,uv*0.7).rgb*vec3(1.25,1.2,1.08)+0.05, smoothstep(16.0,20.0,d));
    vec3 gr=mix(texture2D(tGran,uv).rgb*1.9, texture2D(tGran2,uv*1.3).rgb, 0.4); c=mix(c, gr*vec3(0.88,0.9,0.98), smoothstep(450.0,700.0,d));
    return c;
  }
  void main(){
    float d=uD-vP.y;                                                   // true depth of this wall point (m)
    float circ=6.2831853*uR; vec2 uv=vec2((vAng/6.2831853)*circ/1.6, d/1.6);
    vec3 N=normalize(vec3(-vP.x,0.0,-vP.z)); vec3 Tn=normalize(vec3(-vP.z,0.0,vP.x)); vec3 Bn=vec3(0.0,1.0,0.0);
    vec3 col; vec3 V=normalize(cameraPosition-vP);
    if(uMode<0.5){
      // motion blur along the shaft: average the wall over the distance travelled this frame
      float blurV=min(uDv/1.6,3.0); vec3 alb=vec3(0.0); for(int k=0;k<10;k++){ float o=(float(k)/9.0-0.5)*blurV; alb+=layerCol(uv+vec2(0.0,o), d+o*1.6); } alb/=10.0;
      alb=pow(alb,vec3(2.2));
      vec2 nuv=uv; vec3 nm; if(d<2.5) nm=texture2D(nSoil,nuv).xyz; else if(d<17.0) nm=texture2D(nClay,nuv).xyz; else if(d<600.0) nm=texture2D(nLime,nuv*0.8).xyz; else nm=texture2D(nGran,nuv).xyz; nm=nm*2.0-1.0; nm.xy*=1.0-smoothstep(0.3,1.5,blurV);
      vec3 Np=normalize(N+(Tn*nm.x+Bn*nm.y)*0.9);
      // wet clay band: darker, glossy, with running streaks
      float wet=uWet*smoothstep(5.0,7.0,d)*(1.0-smoothstep(16.0,19.0,d)); float run=smoothstep(0.55,0.8,fb(vec2(vAng*7.0,d*0.6+uT*1.5)));
      alb*=1.0-0.45*wet; float rough=mix(0.9,0.25,wet*(0.4+0.6*run));
      vec3 L=normalize(-vP); float dist=length(vP); float fall=uLamp*7.0/(1.0+dist*dist*0.22);
      float dif=max(dot(Np,L),0.0); vec3 Hh=normalize(L+V); float sp=pow(max(dot(Np,Hh),0.0),mix(8.0,90.0,1.0-rough))*(1.0-rough)*2.5;
      vec3 lamp=vec3(1.0,0.93,0.82);
      col=alb*(dif*fall*lamp+0.035) + sp*fall*lamp*0.6;
      // daylight from the opening (only near the surface)
      float sky=uSky*exp(-max(d,0.0)/1.4)*(0.5+0.5*max(dot(Np,vec3(0.0,1.0,0.0)),0.0)+0.4); col+=alb*vec3(1.0,0.82,0.62)*sky*1.2;
      // heat: deep granite starts to look hot and hazy (no glow below ~900 F)
      col=mix(col, col*vec3(1.25,0.95,0.75)+vec3(0.06,0.015,0.0)*uHeat, uHeat*smoothstep(5000.0,12000.0,d));
    } else {
      // the tube through the planet: glowing walls by layer (depth in km = d/1000)
      float km=d/1000.0; float blurV=min(uDv/40.0,6.0);
      vec2 q=vec2(vAng*3.0, d/40.0);
      float n=0.0; for(int k=0;k<8;k++){ float o=(float(k)/7.0-0.5)*blurV; n+=fb(q+vec2(0.0,o)+vec2(0.0,uT*0.05)); } n/=8.0;
      vec3 c;
      float mant=1.0-smoothstep(2850.0,2930.0,km); float outer=smoothstep(2850.0,2930.0,km)*(1.0-smoothstep(5110.0,5190.0,km)); float inner=smoothstep(5110.0,5190.0,km);
      float tmp=smoothstep(30.0,2890.0,km);
      vec3 mc=mix(vec3(0.55,0.10,0.02),vec3(1.6,0.45,0.08),tmp)*(0.35+1.1*smoothstep(0.35,0.75,n));
      vec3 oc=vec3(1.7,0.72,0.14)*(0.7+0.6*sin(n*12.0+uT*2.0)*0.5+0.4*n);
      vec3 ic=vec3(1.35,1.1,0.72)*(0.85+0.3*n);
      c=mc*mant+oc*outer+ic*inner;
      c=mix(vec3(0.12,0.08,0.06)*0.3, c, smoothstep(10.0,45.0,km));    // the crust at both ends is dark
      float far=smoothstep(8.0,60.0,length(vP)); vec3 fogc=mix(vec3(0.5,0.12,0.03),vec3(1.4,0.6,0.15),outer+inner*1.2)*(0.6+0.4*tmp); col=mix(c,fogc,far);
    }
    gl_FragColor=vec4(col,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const shaftMat = new THREE.ShaderMaterial({ uniforms: shaftU, vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, side: THREE.BackSide });
const shaftGeo = new THREE.CylinderGeometry(RS, RS, 90, 96, 360, true); shaftGeo.translate(0, -41, 0);
const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat); shaftMesh.frustumCulled = false; shaft.add(shaftMesh);
// the dig face below + flood water
const faceMat = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 });
const digFace = new THREE.Mesh(new THREE.CircleGeometry(RS, 64), faceMat); digFace.rotation.x = -Math.PI / 2; shaft.add(digFace);
const floodMat = new THREE.MeshStandardMaterial({ color: '#2b2116', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.92 });
const flood = new THREE.Mesh(new THREE.CircleGeometry(RS * 0.999, 64), floodMat); flood.rotation.x = -Math.PI / 2; shaft.add(flood);
const lamp = new THREE.PointLight(0xffeedd, 14, 30, 1.6); shaft.add(lamp);
shaft.add(new THREE.AmbientLight(0x403028, 0.15));
// utilities in the wall (problem #1): a yellow gas line and a black power cable, crossing just behind the wall
const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.4, 24), new THREE.MeshStandardMaterial({ color: '#f2c200', roughness: 0.45 })); pipe.rotation.z = Math.PI / 2; shaft.add(pipe);
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.4, 16), new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5 })); cable.rotation.x = Math.PI / 2; shaft.add(cable);
const cableTape = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.08, 16), new THREE.MeshStandardMaterial({ color: '#e64a19', roughness: 0.5 })); cableTape.rotation.x = Math.PI / 2; shaft.add(cableTape);
const PIPE_D = 1.7, CABLE_D = 1.2;
// fossils in the limestone: brachiopod / crinoid decals
const fossilMats = (() => { const out = [];
  for (let k = 0; k < 3; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256); g.translate(128, 150);
    if (k < 2) { const ribs = 14 + k * 6; for (let i = 0; i <= ribs; i++) { const a = -2.4 + i * (1.68 * 2 / ribs) * 1.43; const r = 95; g.strokeStyle = `rgba(${235 - i % 2 * 25},${222 - i % 2 * 22},${196 - i % 2 * 20},0.95)`; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 20); g.quadraticCurveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 + 10, Math.cos(a) * r, Math.sin(a) * r * 0.9); g.stroke(); }
      g.fillStyle = 'rgba(210,195,165,0.95)'; g.beginPath(); g.ellipse(0, 18, 16, 10, 0, 0, 7); g.fill(); }
    else { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? 'rgba(215,200,170,0.95)' : 'rgba(185,170,140,0.95)'; g.fillRect(-26, -110 + i * 36, 52, 32); g.fillStyle = 'rgba(120,105,85,0.9)'; g.beginPath(); g.arc(0, -94 + i * 36, 6, 0, 7); g.fill(); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    out.push(new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, roughness: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); }
  return out; })();
const fossils = [];
for (let i = 0; i < 70; i++) { const a = R(0, 6.28), dpt = R(18.5, 34), s = R(0.05, 0.12); const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), pick(fossilMats));
  fossils.push({ m, a, d: dpt, rot: R(0, 6.28) }); shaft.add(m); }
// rock burst (problem #3): fragments + dust blown out of the wall
const burstRock = new THREE.MeshStandardMaterial({ color: '#2e2a27', roughness: 0.95, flatShading: true });
const frags = []; for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.006, 0.03), 0), burstRock); shaft.add(m); frags.push({ m, v: new THREE.Vector3(R(-0.4, 0.4), R(-0.6, 0.9), R(0.3, 1.0)).normalize().multiplyScalar(R(2, 6)), sp: new THREE.Vector3(R(-9, 9), R(-9, 9), R(-9, 9)) }); }
const dustTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(90,82,74,0.3)'); gr.addColorStop(1, 'rgba(120,108,96,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const dust = []; for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 })); shaft.add(s); dust.push({ s, v: new THREE.Vector3(R(-0.3, 0.3), R(-0.3, 0.5), R(0.2, 0.8)), ph: R(0, 1) }); }
// drips (problem #2)
const dripMat = new THREE.MeshBasicMaterial({ color: '#9fb0bc', transparent: true, opacity: 0.35 });
const drips = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.05, 6), dripMat); shaft.add(m); drips.push({ m, a: R(0, 6.28), ph: R(0, 1), sp: R(1.2, 2.2) }); }
async function buildShaft() {
  const L = async (n, rep) => { const p = await pbrSet(n, rep); for (const t of [p.map, p.nor]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return p; };
  const [soil, clay, lime, gran, gran2] = await Promise.all([L('excavated_soil_wall'), L('brown_mud_02'), L('granite_wall'), L('dark_rock_02'), L('rock_06')]);
  Object.assign(shaftU, {}); shaftU.tSoil.value = soil.map; shaftU.tClay.value = clay.map; shaftU.tLime.value = lime.map; shaftU.tGran.value = gran.map; shaftU.tGran2.value = gran2.map;
  shaftU.nSoil.value = soil.nor; shaftU.nClay.value = clay.nor; shaftU.nLime.value = lime.nor; shaftU.nGran.value = gran.nor;
  faceMat.map = soil.map; faceMat.normalMap = soil.nor; faceMat.needsUpdate = true;
}
// depth keyframes for the dig ride (t s, depth m), interpolated in log-depth with a monotone cubic
const DKEY = [[4.0, 0.6], [8.0, 3.0], [12.0, 18.0], [14.6, 26.0], [17.2, 600], [18.3, 3800], [20.6, 3835], [22.0, 4150], [25.0, 11700], [27.0, 12262]];
function digDepth(t) {
  const X = DKEY.map(k => k[0]), Y = DKEY.map(k => Math.log(k[1])); const n = X.length;
  if (t <= X[0]) return Math.exp(Y[0]); if (t >= X[n - 1]) return Math.exp(Y[n - 1]);
  const dl = []; for (let i = 0; i < n - 1; i++) dl.push((Y[i + 1] - Y[i]) / (X[i + 1] - X[i]));
  const m = [dl[0]]; for (let i = 1; i < n - 1; i++) m.push(dl[i - 1] * dl[i] <= 0 ? 0 : 3 * (X[i + 1] - X[i - 1]) / ((2 * X[i + 1] - X[i] - X[i - 1]) / dl[i - 1] + (X[i + 1] + X[i] - 2 * X[i - 1]) / dl[i])); m.push(dl[n - 2]);
  let i = 0; while (t > X[i + 1]) i++; const h = X[i + 1] - X[i], s = (t - X[i]) / h;
  const h00 = 2 * s ** 3 - 3 * s * s + 1, h10 = s ** 3 - 2 * s * s + s, h01 = -2 * s ** 3 + 3 * s * s, h11 = s ** 3 - s * s;
  return Math.exp(h00 * Y[i] + h10 * h * m[i] + h01 * Y[i + 1] + h11 * h * m[i + 1]);
}
let FALLT = null;                                                       // PREM fall table (data/hole_fall.json)
const FALL_MIN = 38.1, FALL_LEN = 20.0;                                 // 38.1 real minutes shown in 20 s
function fallState(t) {
  const tm = clamp((t - FALL) / FALL_LEN, 0, 1) * FALL_MIN; const half = FALLT.t[FALLT.t.length - 1]; const back = tm > half; const tt = back ? FALL_MIN - tm : tm;
  const T = FALLT.t; let i = 0; while (i < T.length - 2 && T[i + 1] < tt) i++; const k = clamp((tt - T[i]) / Math.max(T[i + 1] - T[i], 1e-6), 0, 1);
  const dpt = lerp(FALLT.d[i], FALLT.d[i + 1], k), mph = lerp(FALLT.mph[i], FALLT.mph[i + 1], k), gg = lerp(FALLT.g[i], FALLT.g[i + 1], k);
  return { min: tm, depthKm: back ? 12742 - dpt : dpt, layerKm: dpt, mph, g: gg, back };
}
function updateShaft(t) {
  shaftU.uT.value = t;
  let D, Dv;
  if (t < CUT) {
    D = digDepth(t); Dv = Math.abs(digDepth(t + 1 / 30) - D); shaftU.uMode.value = 0; shaftU.uR.value = RS; shaft.background = new THREE.Color(0, 0, 0);
    shaftU.uSky.value = 1; shaftU.uWet.value = smooth(7.5, 9.0, t); shaftU.uHeat.value = smooth(22.0, 26.0, t); shaftU.uSqueeze.value = smooth(24.6, 26.8, t) * 1.1;
    shaftMesh.scale.set(1, 1, 1); lamp.intensity = 14; shaftU.uLamp.value = 1;
    digFace.visible = t < 12.8; digFace.position.y = -lerp(2.6, 4.5, smooth(5.0, 12, t)); flood.visible = t > 8.0 && t < 12.6;
    flood.position.y = digFace.position.y + 0.02 + 1.4 * smooth(8.6, 12.0, t);
  } else {
    const f = fallState(t); D = f.layerKm * 1000; Dv = 40 * Math.min(60, f.mph / 400); shaftU.uMode.value = 1;
    shaftU.uR.value = 2.0; shaftMesh.scale.set(2.0 / RS, 1, 2.0 / RS); digFace.visible = false; flood.visible = false; lamp.intensity = 0; shaftU.uSqueeze.value = 0;
    const km = f.layerKm, oc = smooth(2850, 2930, km) * (1 - smooth(5110, 5190, km)), ic = smooth(5110, 5190, km), tp = smooth(30, 2890, km);
    shaft.background = new THREE.Color(0.5, 0.12, 0.03).lerp(new THREE.Color(1.4, 0.6, 0.15), oc + ic * 1.2).multiplyScalar(0.6 + 0.4 * tp);
  }
  shaftU.uD.value = D; shaftU.uDv.value = Dv;
  // utilities, fossils, burst, drips — positioned by their true depth relative to the camera
  pipe.visible = t < 9; pipe.position.set(0, D - PIPE_D, RS - 0.012);
  cable.visible = t < 9; cable.position.set(-RS + 0.006, D - CABLE_D, 0); cableTape.position.copy(cable.position).add(new THREE.Vector3(0, 0, 0.12));
  for (const F of fossils) { const y = D - F.d; F.m.visible = t > 11 && t < 16 && y < 1 && y > -20; if (!F.m.visible) continue; F.m.position.set(Math.cos(F.a) * (RS - 0.004), y, Math.sin(F.a) * (RS - 0.004)); F.m.lookAt(0, y, 0); F.m.rotateZ(F.rot); }
  const bt = t - 18.75, bOn = bt > 0 && bt < 2.2 && t < CUT; const bA = 0.6;                       // the burst bursts out of the wall at azimuth bA
  for (const F of frags) { F.m.visible = bOn; if (!bOn) continue; const p0 = new THREE.Vector3(Math.cos(bA) * RS, -1.6, Math.sin(bA) * RS);
    const inward = new THREE.Vector3(-Math.cos(bA), 0, -Math.sin(bA)); const v = inward.clone().multiplyScalar(F.v.z).add(new THREE.Vector3(-Math.sin(bA), 0, Math.cos(bA)).multiplyScalar(F.v.x)).add(new THREE.Vector3(0, F.v.y, 0)).multiplyScalar(F.v.length() / 1.0);
    const p = p0.clone().addScaledVector(v, bt * 0.35).add(new THREE.Vector3(0, -4.9 * bt * bt * 0.3, 0)); p.x = clamp(p.x, -RS * 0.97, RS * 0.97); p.z = clamp(p.z, -RS * 0.97, RS * 0.97);
    F.m.position.copy(p); F.m.rotation.set(F.sp.x * bt, F.sp.y * bt, F.sp.z * bt); }
  for (const P of dust) { P.s.visible = bOn; if (!bOn) continue; const k = bt + P.ph * 0.4; const p = new THREE.Vector3(Math.cos(bA) * RS * 0.9, -1.6, Math.sin(bA) * RS * 0.9).addScaledVector(new THREE.Vector3(-Math.cos(bA), 0.2, -Math.sin(bA)), k * 0.35).add(P.v.clone().multiplyScalar(k * 0.3));
    P.s.position.copy(p); P.s.scale.setScalar(0.08 + k * 0.22); P.s.material.opacity = 0.55 * smooth(0, 0.15, bt) * (1 - smooth(0.8, 2.2, bt)); }
  for (const Dp of drips) { const on = t > 8.2 && t < 12.6; Dp.m.visible = on; if (!on) continue; const k = ((t * Dp.sp + Dp.ph) % 1); const y = -0.3 - k * 4.2; Dp.m.position.set(Math.cos(Dp.a) * (RS - 0.01), y, Math.sin(Dp.a) * (RS - 0.01)); }
  return { D, Dv };
}

// =================== EARTH (radius 1): 8k day/night maps, clouds, atmosphere; a wedge cut out around the tunnel ===================
// Frame: the tunnel (Kansas -> its antipode in the Indian Ocean) is the +Y axis; the removed 90° wedge opens toward +Z (the camera).
const space = new THREE.Scene(); space.background = new THREE.Color('#000004');
const eCam = new THREE.PerspectiveCamera(32, W / H, 0.001, 200);
const K_LAT = 38.5, K_LON = -98.0;                                     // Kansas
const ll = (lat, lon) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(a) * Math.cos(o), Math.sin(a), -Math.cos(a) * Math.sin(o)); };
const DK = ll(K_LAT, K_LON);
// rotation taking Earth's texture frame to the tunnel frame: DK -> +Y, and pick the wedge so North America faces the camera side
const Q_E = (() => { const y = DK.clone(), z0 = new THREE.Vector3(0, 1, 0).sub(y.clone().multiplyScalar(y.y)).normalize().negate(); const x = new THREE.Vector3().crossVectors(y, z0);
  const m = new THREE.Matrix4().makeBasis(x, y, z0); return new THREE.Quaternion().setFromRotationMatrix(m).invert(); })();
const earthG = new THREE.Group(); space.add(earthG);
const WEDGE = 0.5 * Math.PI / 2;                                       // half-angle of the removed wedge
const CUT_GLSL = `uniform float uWedge, uCutOn; varying vec3 vTp;
  bool cutAway(){ float a=atan(vTp.x, vTp.z); return uCutOn>0.5 && abs(a)<uWedge; }`;
const earthU = { dayMap: { value: null }, nightMap: { value: null }, specMap: { value: null }, norMap: { value: null }, cloudMap: { value: null },
  uSun: { value: new THREE.Vector3(-0.6, 0.45, 0.65).normalize() }, uQ: { value: new THREE.Matrix3() }, uWedge: { value: WEDGE }, uCutOn: { value: 1 }, uNight: { value: 1 } };
const EARTH_VS = `uniform mat3 uQ; varying vec3 vTp; varying vec3 vOp; varying vec3 vWn; varying vec3 vWp;
  void main(){ vOp=normalize(position); vTp=uQ*position; vec4 w=modelMatrix*vec4(position,1.0); vWp=w.xyz; vWn=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const earthMat = new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: EARTH_VS,
  fragmentShader: CUT_GLSL + `uniform sampler2D dayMap, nightMap, specMap, norMap, cloudMap; uniform vec3 uSun; uniform float uNight; varying vec3 vOp; varying vec3 vWn; varying vec3 vWp;
  vec2 eq(vec3 d){ return vec2(0.5+atan(-d.z,d.x)/6.2831853, 0.5+asin(clamp(d.y,-1.0,1.0))/3.1415926); }
  void main(){ if(cutAway()) discard;
    vec2 uv=eq(normalize(vOp)); vec3 N=normalize(vWn);
    // tangent frame for the normal map (east / north)
    vec3 up=vec3(0.0,1.0,0.0); vec3 Tn=normalize(cross(up,N)+1e-5); vec3 Bn=cross(N,Tn);
    vec3 nm=texture2D(norMap,uv).xyz*2.0-1.0; vec3 Nb=normalize(N+ (Tn*nm.x+Bn*nm.y)*0.6);
    float ndl=dot(Nb,uSun), dl=max(ndl,0.0);
    vec3 day=texture2D(dayMap,uv).rgb; day=pow(day,vec3(2.2));
    float spec=texture2D(specMap,uv).r; vec3 V=normalize(cameraPosition-vWp); vec3 Hh=normalize(uSun+V);
    float tw=smoothstep(-0.12,0.25,dot(N,uSun));
    vec3 c=day*(dl*2.6+0.004)+spec*pow(max(dot(N,Hh),0.0),60.0)*vec3(1.0,0.85,0.6)*1.8*tw;
    vec3 night=pow(texture2D(nightMap,uv).rgb,vec3(2.2))*vec3(1.0,0.8,0.55)*3.0;
    c+=night*(1.0-smoothstep(-0.08,0.12,dot(N,uSun)))*uNight;
    float cl=texture2D(cloudMap,uv+vec2(0.002,0.0)).r; c=mix(c, vec3(0.0), cl*0.35*tw);  // cloud shadows, softly
    float fr=pow(1.0-max(dot(N,V),0.0),3.0); c+=vec3(0.25,0.5,1.0)*fr*0.6*smoothstep(-0.2,0.4,dot(N,uSun));
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 160), earthMat); earthG.add(earthMesh);
const cloudMat = new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: EARTH_VS, transparent: true, depthWrite: false,
  fragmentShader: CUT_GLSL + `uniform sampler2D cloudMap; uniform vec3 uSun; varying vec3 vOp; varying vec3 vWn; varying vec3 vWp;
  vec2 eq(vec3 d){ return vec2(0.5+atan(-d.z,d.x)/6.2831853, 0.5+asin(clamp(d.y,-1.0,1.0))/3.1415926); }
  void main(){ if(cutAway()) discard; float cl=texture2D(cloudMap,eq(normalize(vOp))).r; vec3 N=normalize(vWn);
    float l=max(dot(N,uSun),0.0); vec3 c=vec3(1.0)*(l*2.4+0.01); gl_FragColor=vec4(c, cl*0.92);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.006, 192, 128), cloudMat); earthG.add(clouds);
const atmoU = Object.assign({ uC: { value: new THREE.Vector3() } }, earthU);
const atmoMat = new THREE.ShaderMaterial({ uniforms: atmoU, vertexShader: EARTH_VS, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  fragmentShader: CUT_GLSL + `uniform vec3 uSun, uC; varying vec3 vWn; varying vec3 vWp;
  void main(){ vec3 rd=normalize(vWp-cameraPosition); vec3 oc=uC-cameraPosition; float tc=dot(oc,rd); vec3 cp=cameraPosition+rd*tc; float b=length(cp-uC);
    if(b<1.0) discard;                                                     // over the globe itself: nothing (the cut stays clean)
    float g=exp(-(b-1.0)/0.011); vec3 n=normalize(cp-uC);
    float l=smoothstep(-0.35,0.45,dot(n,uSun)); vec3 c=mix(vec3(1.0,0.5,0.25),vec3(0.32,0.6,1.0),smoothstep(-0.05,0.4,dot(n,uSun)))*g*l*1.3;
    gl_FragColor=vec4(c,1.0); }` });
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.06, 128, 96), atmoMat); earthG.add(atmo);
// the two cut faces: half discs in the planes at ±WEDGE around the tunnel axis, showing the real layers (PREM radii)
const layerU = { uT: { value: 0 }, rockMap: { value: null }, uHot: { value: 1 } };
const layerMat = new THREE.ShaderMaterial({ uniforms: layerU, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT, uHot; uniform sampler2D rockMap; varying vec2 vP;
  float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
  float fb(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
  void main(){ float r=length(vP); if(r>1.0) discard; float th=atan(vP.y,vP.x);
    vec2 sw=vec2(cos(th+uT*0.05),sin(th+uT*0.05))*r;
    float n=fb(vP*6.0+vec2(0.0,uT*0.03)), n2=fb(sw*14.0);
    vec3 c;
    if(r<0.1917){ c=mix(vec3(2.4,2.1,1.5),vec3(1.9,1.3,0.55),smoothstep(0.0,0.19,r))*(0.9+0.2*n2); }                 // inner core: white-hot solid iron
    else if(r<0.5462){ float k=(r-0.1917)/0.3545; float fl=fb(vec2(th*3.0+uT*0.08, r*18.0)); c=mix(vec3(1.25,0.5,0.08),vec3(0.95,0.28,0.04),k)*(0.7+0.6*fl); } // outer core: liquid iron
    else if(r<0.9945){ float k=(r-0.5462)/0.4483; float cv=fb(vec2(th*4.0, r*9.0)+n*0.8); c=mix(vec3(0.62,0.13,0.025),vec3(0.36,0.06,0.015),k)*(0.55+0.9*cv);  // mantle: hot rock, slow convection
      c=mix(c, vec3(0.12,0.04,0.02), smoothstep(0.93,0.994,r)); }
    else { vec3 rk=texture2D(rockMap, vP*7.0).rgb; c=pow(rk,vec3(2.2))*0.9; }                                       // crust
    float edge=smoothstep(0.0,0.004,abs(r-0.1917))*smoothstep(0.0,0.004,abs(r-0.5462))*smoothstep(0.0,0.003,abs(r-0.9945)); c*=0.75+0.25*edge;
    gl_FragColor=vec4(c*uHot,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const faces = [-1, 1].map(s => { const g = new THREE.CircleGeometry(1, 256, -Math.PI / 2, Math.PI); const m = new THREE.Mesh(g, layerMat);
  // half disc spans +x of its plane (x from 0..1, y -1..1); rotate it about Y to sit at angle s*WEDGE from +Z
  m.rotation.y = s * WEDGE - Math.PI / 2 * (s > 0 ? 1 : 1) ; return m; });
faces.forEach((m, i) => { const s = i ? 1 : -1; m.rotation.set(0, 0, 0); m.rotateY(-Math.PI / 2 + s * WEDGE); earthG.add(m); });
// the tunnel along the spine of the wedge
const tunnelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.9, 2.3) });
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1.995, 12), tunnelMat); earthG.add(tunnel);
const traveler = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); earthG.add(traveler);
const travGlow = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#9fdcff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); travGlow.scale.setScalar(0.07); earthG.add(travGlow);
// stars
{ const n = 7000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(150); pos.set([v.x, v.y, v.z], i * 3); const b = Math.pow(rnd(), 3) * 0.9 + 0.1; col.set([b, b, b * R(0.9, 1.1)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true }))); }
async function buildEarth() {
  const [day, night, cl, spec, nor, rock] = await Promise.all([texP('earth/8k_earth_daymap.jpg', false), texP('earth/8k_earth_nightmap.jpg', false), texP('earth/8k_earth_clouds.jpg', false),
    texP('earth/earth_specular_2048.jpg', false), texP('earth/earth_normal_2048.jpg', false), texP('tex/rock_face_diff.jpg', false, [1, 1])]);
  for (const t of [day, night, cl, spec, nor]) { t.wrapS = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; }
  rock.wrapS = rock.wrapT = THREE.RepeatWrapping;
  Object.assign(earthU, {}); earthU.dayMap.value = day; earthU.nightMap.value = night; earthU.cloudMap.value = cl; earthU.specMap.value = spec; earthU.norMap.value = nor; layerU.rockMap.value = rock;
  // object -> tunnel frame (for the wedge test)
  earthU.uQ.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(Q_E));
  earthMesh.quaternion.copy(Q_E); clouds.quaternion.copy(earthMesh.quaternion); atmo.quaternion.copy(earthMesh.quaternion);
}

// =================== OCEAN (meters): three.js Water under a real sunrise sky (Poly Haven HDRI) — the Indian Ocean ===================
const ocean = new THREE.Scene();
const oCam = new THREE.PerspectiveCamera(55, W / H, 0.1, 20000);
let OSUN = new THREE.Vector3(0, 0.1, -1).normalize();
let water = null;
async function buildOcean() {
  const hdr = await hdrP('hdri/kloppenheim_06_puresky_4k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  ocean.background = hdr; ocean.userData.hdr = hdr; ocean.environment = pmrem.fromEquirectangular(hdr).texture; ocean.backgroundIntensity = 1.0;
  OSUN = hdrSunDir(hdr); console.log('ocean sun', OSUN.toArray().map(v => v.toFixed(3)).join(','));
  const wn = await texP('water/waternormals.jpg', false); wn.wrapS = wn.wrapT = THREE.RepeatWrapping;
  water = new Water(new THREE.PlaneGeometry(20000, 20000), { textureWidth: 1024, textureHeight: 1024, waterNormals: wn, sunDirection: OSUN.clone(), sunColor: 0xfff0d8, waterColor: 0x0a2a3c, distortionScale: 3.7, fog: false });
  water.material.uniforms.size.value = 2.0; water.rotation.x = -Math.PI / 2; ocean.add(water);
}
// under the surface: the bright, rippling ceiling seen from below + rising bubbles
const uwMat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } }, side: THREE.DoubleSide, transparent: false,
  vertexShader: 'varying vec2 vP; void main(){ vP=(modelMatrix*vec4(position,1.0)).xz; gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT; varying vec2 vP;
    void main(){ vec2 p=vP*1.3; float c=0.0; for(int i=0;i<4;i++){ float fi=float(i); c+=pow(abs(sin(p.x*(1.0+fi*0.7)+sin(p.y*(1.3+fi*0.5)+uT*(1.2+fi*0.3))+uT*0.8)),8.0); }
      float d=length(vP); vec3 col=mix(vec3(0.05,0.28,0.38),vec3(0.55,0.85,0.95),0.25+0.2*c)*exp(-d*0.04)*2.0; gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const uwCeil = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), uwMat); uwCeil.rotation.x = Math.PI / 2; uwCeil.position.y = -0.02; ocean.add(uwCeil);
const bubTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = 'rgba(220,245,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(24, 22, 6, 0, 7); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const bubbles = []; for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubTex, transparent: true, depthWrite: false })); ocean.add(s); bubbles.push({ s, x: R(-1.2, 1.2), z: R(-2.5, -0.4), y0: R(-6, -1), sp: R(0.8, 2.2), r: R(0.015, 0.06) }); }
const uwFog = new THREE.FogExp2('#0b3d55', 0.22);
function updateOcean(t) {
  const under = oCam.position.y < 0;
  uwCeil.visible = under; water.visible = !under; ocean.fog = under ? uwFog : null; ocean.background = under ? new THREE.Color('#0b3d55') : ocean.userData.hdr;
  uwMat.uniforms.uT.value = t;
  for (const b of bubbles) { b.s.visible = under; const y = b.y0 + ((t - OCEAN) * b.sp) % 6; b.s.position.set(b.x + 0.05 * Math.sin(t * 3 + b.y0), Math.min(y, -0.03), b.z); b.s.scale.setScalar(b.r); }
}

// =================== cameras ===================
function yardCamera(t) {
  const sh = new THREE.Vector3(SUN_Y.x, 0, SUN_Y.z).normalize();             // look toward the low sun (backlit, golden)
  const side = new THREE.Vector3(-sh.z, 0, sh.x);
  const u = clamp(t / 2.6, 0, 1), dive = smooth(2.5, SHAFT, t);
  const pos = new THREE.Vector3().addScaledVector(sh, -lerp(1.75, 1.35, ease(u))).addScaledVector(side, 0.35); pos.y = lerp(1.05, 0.95, u);
  const look = new THREE.Vector3(0.05, -0.3, 0).addScaledVector(sh, 2.4).addScaledVector(side, -0.1);
  // the dive: glide over the pit, tip straight down and drop in
  const over = new THREE.Vector3(0.02, lerp(0.9, -0.35, smooth(3.1, SHAFT, t)), 0.0), lookDown = new THREE.Vector3(0.02, -3, 0.001);
  pos.lerp(over, ease(dive)); look.lerp(lookDown, ease(smooth(2.5, 3.4, t)));
  yCam.fov = 58; yCam.updateProjectionMatrix(); yCam.position.copy(pos); yCam.lookAt(look); yCam.updateMatrixWorld();
  return Math.max(0.3, pos.distanceTo(new THREE.Vector3(0.2, 0, 0)) * (1 - dive) + 0.5 * dive);
}
function shaftCamera(t, D) {
  const fallMode = t >= CUT;
  const roll = fallMode ? (t - FALL) * 0.35 : t * 0.08;
  let shake = 0; if (!fallMode) { const bt = t - 18.75; if (bt > 0 && bt < 1.4) shake = 0.03 * Math.exp(-bt * 3) * 1; }
  sCam.position.set(Math.sin(t * 37) * shake, Math.cos(t * 41) * shake, Math.sin(t * 29 + 1) * shake);
  // weightless at the center: a slow tumble
  const center = fallMode ? Math.exp(-(((t - (FALL + FALL_LEN / 2)) / 1.6) ** 2)) : 0;
  const tilt = 0.18 + 0.9 * center;
  sCam.up.set(Math.sin(roll), 0, Math.cos(roll));
  sCam.lookAt(Math.sin(roll + 1) * tilt, -1, Math.cos(roll + 1) * tilt);
  sCam.fov = fallMode ? 80 : 72; sCam.updateProjectionMatrix();
}
function earthCamera(t) {
  const u = clamp((t - CUT) / (FALL - CUT), 0, 1), k = ease(smooth(0.05, 0.95, u));
  const d = Math.exp(lerp(Math.log(0.55), Math.log(7.8), k)), a = 0.12 * u;
  const tgt = new THREE.Vector3(0, lerp(0.97, -0.42, k), 0);
  eCam.position.set(Math.sin(a) * d * 0.9, tgt.y + lerp(0.25, 2.2, k), Math.cos(a) * d); eCam.lookAt(tgt);
}
function oceanCamera(t) {
  const sh = new THREE.Vector3(OSUN.x, 0, OSUN.z).normalize(), side = new THREE.Vector3(-sh.z, 0, sh.x);
  const rise = smooth(OCEAN, OCEAN + 1.35, t); const bob = 0.12 * Math.sin((t - OCEAN) * 1.7) * smooth(OCEAN + 1.4, OCEAN + 2.4, t);
  const y = lerp(-3.2, 0.45, ease(rise)) + bob + 0.4 * smooth(OCEAN + 1.3, OCEAN + 1.5, t) * (1 - smooth(OCEAN + 1.5, OCEAN + 2.3, t));
  oCam.position.set(0, y, 0);
  const lookUp = lerp(30, 4, smooth(OCEAN + 0.6, OCEAN + 1.6, t));
  oCam.lookAt(sh.clone().multiplyScalar(100).addScaledVector(side, 30).setY(lookUp));
}

// =================== HUD / captions ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels', 'mini', 'miniDot', 'here'].map(k => [k, $(k)]));
const captions = [
  [4.3, 7.8, 'Problem #1: buried gas lines.<br>Call 811 before you dig.'],
  [8.2, 11.8, 'Problem #2: groundwater.<br>Your hole starts to flood.'],
  [12.2, 16.8, 'Kansas was once a sea floor.<br>The rock is full of shells.'],
  [17.3, 20.4, 'Problem #3: rock bursts.<br>Walls explode under pressure.'],
  [20.6, 22.3, 'The deepest mine: 2.5 miles.'],
  [22.5, 25.3, 'Problem #4: heat.<br>356°F at 7.6 miles.'],
  [25.5, 26.9, 'The rock flows and<br>squeezes the hole shut.'],
  [27.3, 29.6, "That's the deepest hole ever.<br>0.1% of the way."],
  [29.8, 31.9, 'At that pace: 20,000 years<br>to dig through.'],
  [32.3, 35.3, 'Now jump into a magic tube<br>all the way through.'],
  [35.5, 38.6, "The mantle isn't lava.<br>It's solid rock that slowly flows."],
  [38.8, 40.8, 'Then: a sea of liquid iron.'],
  [41.0, 43.6, "The core: 10,800°F.<br>As hot as the Sun's surface."],
  [43.8, 47.4, 'Weightless at the center,<br>flying 22,000 mph.'],
  [47.6, 51.8, '38 minutes later…'],
  [53.6, 56.2, 'Not China.'],
  [56.4, 59.8, "From Kansas, you'd pop out<br>in the Indian Ocean."],
];
const rockF = d => d < 4000 ? lerp(55, 140, d / 4000) : lerp(140, 356, (d - 4000) / 8262);
function depthStr(m) { const ft = m / 0.3048; return ft < 5280 ? fmt(ft) + ' ft' : (ft / 5280).toFixed(ft < 52800 ? 1 : 0) + ' mi'; }
function hudAt(t, S) {
  let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < SHAFT + 0.2) show = 0;
  else if (t < CUT) {
    const D = S.D; lab = 'DEPTH'; val = depthStr(D); sub = 'ROCK: ' + fmt(rockF(D)) + '°F';
    if (t < 8) stat = '<b></b>PROBLEM #1'; else if (t < 12) stat = '<b></b>PROBLEM #2'; else if (t > 17.2 && t < 22.3) stat = '<b></b>PROBLEM #3'; else if (t > 22.3) stat = '<b></b>PROBLEM #4';
    if (t > 20.4 && t < 22.3) sub = 'MPONENG MINE · ROCK 140°F'; if (t > 24.5) { val = '7.6 mi'; sub = 'KOLA SUPERDEEP BOREHOLE · 356°F'; }
  }
  else if (t < FALL) { lab = 'DEEPEST HOLE EVER'; val = '7.6 mi'; sub = 'OF 7,900 MILES · 19 YEARS OF DRILLING'; if (t > 29.8) { stat = '<b></b>MODEL'; } }
  else if (t < OCEAN) { const f = S.f; stat = '<b></b>MODEL · NO AIR, HEAT-PROOF TUBE'; lab = 'SPEED'; val = fmt(f.mph) + ' mph'; sub = `${Math.floor(f.min)} MIN · GRAVITY ${f.g.toFixed(2)} G`; }
  else if (t < T_END) { if (t < OCEAN + 1.4) show = 0; lab = 'YOU COME OUT IN'; val = 'Indian Ocean'; sub = '38°S 82°E · OPPOSITE KANSAS'; }
  else show = 0;
  return { stat, lab, val, sub, show };
}
function updateDOM(t, S) {
  el.title.style.opacity = 1 - smooth(2.4, 2.9, t);
  const h = hudAt(t, S); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub;
  el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.3) : 0;
  const dip = Math.max(fadeWin(t, SHAFT - 0.18, SHAFT + 0.18, 0.18), fadeWin(t, CUT - 0.3, CUT + 0.3, 0.3), fadeWin(t, FALL - 0.3, FALL + 0.25, 0.25));
  el.veil.style.background = '#000000'; el.veil.style.opacity = dip;
  el.flash.style.opacity = Math.max(0.85 * fadeWin(t, OCEAN + 1.2, OCEAN + 1.75, 0.2), 0.6 * fadeWin(t, OCEAN - 0.35, OCEAN + 0.15, 0.2), 0.35 * fadeWin(t, 18.72, 19.05, 0.12));
  // mini-map of the cut Earth with your position during the fall
  const mA = smooth(FALL + 0.2, FALL + 0.8, t) * (1 - smooth(OCEAN - 0.6, OCEAN - 0.2, t)); el.mini.style.opacity = mA;
  if (mA > 0) { const f = S.f || fallState(t); el.miniDot.setAttribute('cy', (20 + 200 * f.depthKm / 12742).toFixed(1)); }
  // "you are here" on the cut Earth
  const hA = fadeWin(t, CUT + 0.4, FALL - 0.4, 0.4); el.here.style.opacity = hA;
  if (hA > 0) { eCam.updateMatrixWorld(); const p = new THREE.Vector3(0, 0.998, 0).project(eCam); el.here.style.left = ((p.x * 0.5 + 0.5) * W) + 'px'; el.here.style.top = ((-p.y * 0.5 + 0.5) * H) + 'px'; }
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
window.renderAt = (t) => {
  grain.uniforms.uT.value = t;
  const S = {};
  if (t < SHAFT) { poseSpade(t); const fd = yardCamera(t);
    post(yard, yCam, { dof: { focus: fd, aperture: 0.0035 * (1 - smooth(2.5, 3.2, t)) + 0.0001, maxblur: 0.006 }, bloom: 0.25, exp: 0.85, con: 1.12, sat: 1.2, warm: 0.04 }); }
  else if (t < CUT || (t >= FALL && t < OCEAN)) { const r = updateShaft(t); S.D = r.D; if (t >= FALL) S.f = fallState(t); shaftCamera(t, r.D);
    post(shaft, sCam, t < CUT ? { bloom: 0.15, bloomT: 1.5, exp: 1.5, con: 1.1, sat: 1.05, warm: 0.02 } : { bloom: 0.45, bloomR: 0.7, bloomT: 1.2, exp: 0.78, con: 1.1, sat: 1.15 }); }
  else if (t < FALL) { earthCamera(t); layerU.uT.value = t; traveler.visible = false; travGlow.visible = false;
    tunnel.visible = t > FALL - 2.2; tunnel.scale.y = smooth(FALL - 2.2, FALL - 0.4, t); tunnel.position.y = 1 - tunnel.scale.y;
    post(space, eCam, { bloom: 0.45, bloomR: 0.5, bloomT: 1.1, exp: 1.0, con: 1.05, sat: 1.1 }); }
  else { oceanCamera(t); updateOcean(t); water.material.uniforms.time.value = t * 0.6;
    post(ocean, oCam, oCam.position.y < 0 ? { bloom: 0.3, bloomT: 1.2, exp: 0.55, con: 1.12, sat: 1.2 } : { bloom: 0.2, bloomR: 0.4, bloomT: 4.0, exp: 0.5, con: 1.16, sat: 1.22 }); }
  composer.render();
  updateDOM(t, S);
  return true;
};
window.sceneReady = (async () => {
  FALLT = await (await fetch('data/hole_fall.json')).json();
  await buildYard(); await buildShaft(); await buildEarth(); await buildOcean(); await document.fonts.ready; window.renderAt(0); return true; })();
