
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
