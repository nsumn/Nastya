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
const DIG = 0.0, SHAFT = 4.0, KOLA = 11.0, CUT = 18.0, FALL = 25.0, CORE = 33.0, RISE = 41.0, OCEAN = 49.0, T_END = 58.0;
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
  ocean.background = hdr; ocean.environment = pmrem.fromEquirectangular(hdr).texture; ocean.backgroundIntensity = 1.0;
  OSUN = hdrSunDir(hdr); console.log('ocean sun', OSUN.toArray().map(v => v.toFixed(3)).join(','));
  const wn = await texP('water/waternormals.jpg', false); wn.wrapS = wn.wrapT = THREE.RepeatWrapping;
  water = new Water(new THREE.PlaneGeometry(20000, 20000), { textureWidth: 1024, textureHeight: 1024, waterNormals: wn, sunDirection: OSUN.clone(), sunColor: 0xfff0d8, waterColor: 0x0a2a3c, distortionScale: 3.7, fog: false });
  water.material.uniforms.size.value = 2.0; water.rotation.x = -Math.PI / 2; ocean.add(water);
}

// =================== cameras ===================
function yardCamera(t) {
  const sh = new THREE.Vector3(SUN_Y.x, 0, SUN_Y.z).normalize();             // look toward the low sun (backlit, golden)
  const side = new THREE.Vector3(-sh.z, 0, sh.x);
  const u = clamp(t / SHAFT, 0, 1);
  const pos = new THREE.Vector3().addScaledVector(sh, -lerp(1.75, 1.35, ease(u))).addScaledVector(side, 0.35); pos.y = lerp(1.05, 0.95, u);
  const look = new THREE.Vector3(0.05, -0.3, 0).addScaledVector(sh, 2.4).addScaledVector(side, -0.1);
  yCam.fov = 58; yCam.updateProjectionMatrix(); yCam.position.copy(pos); yCam.lookAt(look); yCam.updateMatrixWorld();
  return pos.distanceTo(new THREE.Vector3(0.2, 0, 0));
}

// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil', 'labels'].map(k => [k, $(k)]));
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(SHAFT - 0.6, SHAFT - 0.1, t);
  el.hud.style.opacity = 0; el.cap.style.opacity = 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}

// =================== render ===================
function earthCamera(t) { const u = clamp((t - CUT) / (FALL - CUT), 0, 1); const d = lerp(8.2, 7.6, ease(u)), a = 0.12 * u;
  eCam.position.set(Math.sin(a) * d, lerp(2.4, 1.8, u), Math.cos(a) * d); eCam.lookAt(0, -0.42, 0); }
function oceanCamera(t) { const u = clamp((t - OCEAN) / (T_END - OCEAN), 0, 1); const sh = new THREE.Vector3(OSUN.x, 0, OSUN.z).normalize(); const side = new THREE.Vector3(-sh.z, 0, sh.x);
  oCam.position.set(0, lerp(1.4, 2.0, u), 0); oCam.lookAt(sh.clone().multiplyScalar(100).addScaledVector(side, 30).setY(4)); }
window.renderAt = (t) => {
  grain.uniforms.uT.value = t;
  if (t < SHAFT) { poseSpade(t); const fd = yardCamera(t);
    post(yard, yCam, { dof: { focus: fd, aperture: 0.0035, maxblur: 0.006 }, bloom: 0.25, exp: 0.85, con: 1.12, sat: 1.2, warm: 0.04 }); }
  else if (t < OCEAN) { earthCamera(t); layerU.uT.value = t; earthG.rotation.y = 0; traveler.position.set(0, 1.0 - 2 * smooth(FALL, RISE + 8, t), 0); travGlow.position.copy(traveler.position);
    post(space, eCam, { bloom: 0.45, bloomR: 0.5, bloomT: 1.1, exp: 1.0, con: 1.05, sat: 1.1 }); }
  else { oceanCamera(t); water.material.uniforms.time.value = t * 0.6;
    post(ocean, oCam, { bloom: 0.2, bloomR: 0.4, bloomT: 4.0, exp: 0.62, con: 1.14, sat: 1.22 }); }
  composer.render();
  updateDOM(t);
  return true;
};
window.sceneReady = (async () => { await buildYard(); await buildEarth(); await buildOcean(); await document.fonts.ready; window.renderAt(0); return true; })();
