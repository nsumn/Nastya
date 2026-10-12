// =================== SKY scene (km) — the spoon seen from the surface ===================
const sky = new THREE.Scene();
const skyCam = new THREE.PerspectiveCamera(60, W / H, 5, 160000);
// a surface frame on the inner bowl: position (km, scene coords), up = inner normal, and city -> sky rotation
// (city +x = street direction, city +y = up)
function surfFrame(mx, my, mz, streetDir) {
  const a = SA - ST, b = SB - ST, c = SC - ST;
  const n = new THREE.Vector3(-mx / (a * a), -mz / (c * c), -my / (b * b)).normalize();          // inward normal, scene coords
  const p = new THREE.Vector3(mx, mz, my).multiplyScalar(KM).addScaledVector(n, 1.5);
  const tdir = streetDir.clone().addScaledVector(n, -n.dot(streetDir)).normalize();
  const z = new THREE.Vector3().crossVectors(tdir, n);
  return { pos: p, up: n, q: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tdir, n, z)) };
}
// the shore: just above the waterline on the far side from the handle, street running across the sea toward the handle
const SHORE_X = -(SA - ST) * Math.sqrt(1 - ((SEA_Z + 0.0004) / (SC - ST)) ** 2);
const SHORE = surfFrame(SHORE_X, 0, SEA_Z + 0.0004, new THREE.Vector3(1, 0, 0));
// halfway up the inner wall (54° tilt): street runs up-slope (+x), the sea is "down" the street (-x)
const WALL = surfFrame(0, (SB - ST) * 0.8, -(SC - ST) * 0.6, new THREE.Vector3(0, 1, 0));
let SKY_POS = SHORE.pos.clone(), SKY_UP = SHORE.up.clone(), Q_CITY2SKY = SHORE.q.clone();
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uDark: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform float uDark; varying vec3 vD;
  void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    float sd=max(dot(d,uSunS),0.0); c+=vec3(1.0,0.95,0.85)*smoothstep(0.99985,0.99993,sd)*12.0 + vec3(1.0,0.85,0.6)*pow(sd,900.0)*2.0;
    c=mix(c, vec3(0.02,0.03,0.06), uDark*smoothstep(-0.1,0.6,dot(d,uUp)));
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(150000, 48, 32), domeMat); sky.add(dome);
const skyPlanetGeo = spoonGeo.clone(); skyPlanetGeo.setAttribute('aBase', new THREE.BufferAttribute(spoonBase.slice(), 3)); skyPlanetGeo.scale(KM, KM, KM); skyPlanetGeo.computeBoundingSphere();
const skyPlanetMat = planetMat({ ns: SHAPE_NS * 7, ice: 0, land: 0.4, lights: 0, clouds: 0.2, mode: 1, near: 40, oct: 6, amb: 0.08 });
const skyPlanet = new THREE.Mesh(skyPlanetGeo, skyPlanetMat); skyPlanet.frustumCulled = false; sky.add(skyPlanet);
const skySeaMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: { uSun: { value: new THREE.Vector3() }, uCam: { value: SKY_POS }, uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uNear: { value: 2 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: SKYFN + `uniform vec3 uSun; uniform vec3 uCam; uniform float uNear; varying vec3 vN; varying vec3 vW;
    void main(){ if(distance(vW,uCam)<uNear) discard; vec3 N=normalize(vN); vec3 V=normalize(uCam-vW); if(dot(N,V)<0.0) N=-N; vec3 Hh=normalize(uSun+V);
      vec3 col=vec3(0.04,0.19,0.33)*(0.25+max(dot(N,uSun),0.0)*1.2)+pow(max(dot(N,Hh),0.0),80.0)*0.9;
      vec3 d=normalize(vW-uCam); float e=dot(d,uUp); float T=exp(-0.07/max(e+0.035,0.035)); col=col*T+skyColor(d)*0.22;
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const skySea = new THREE.Mesh(new THREE.CircleGeometry(1, 160), skySeaMat); skySea.rotation.x = -Math.PI / 2;
skySea.position.y = SEA_Z * KM; skySea.scale.set((SA - ST) * SEA_K * 1.02 * KM, (SB - ST) * SEA_K * 1.02 * KM, 1); skySea.frustumCulled = false; sky.add(skySea);
