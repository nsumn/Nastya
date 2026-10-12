
// =================== SKY scene (km) — the planet seen from the coast at the base of the shaft ===================
const sky = new THREE.Scene();
const skyCam = new THREE.PerspectiveCamera(60, W / H, 5, 120000);
const CITY_Y = -2.6, CITY_R = 2.05 + 0.08 * Math.sin((CITY_Y + 4.5) / 9.5 * Math.PI);
const SKY_POS = new THREE.Vector3(CITY_R * KM + 2.0, CITY_Y * KM, 0);
const SKY_UP = new THREE.Vector3(1, 0, 0);
// city basis -> sky basis: city +x (down the street) = toward the tip (+y), city +y (up) = shaft normal (+x), city +z = -z
const Q_CITY2SKY = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1)));
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uDark: { value: 0 } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize((modelMatrix*vec4(position,1.0)).xyz-cameraPosition); gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }',
  fragmentShader: SKYFN + `uniform float uDark; varying vec3 vD;
  void main(){ vec3 d=normalize(vD); vec3 c=skyColor(d);
    float sd=max(dot(d,uSunS),0.0); c+=vec3(1.0,0.95,0.85)*smoothstep(0.99985,0.99993,sd)*12.0 + vec3(1.0,0.85,0.6)*pow(sd,900.0)*2.0;
    c=mix(c, vec3(0.28,0.30,0.30)*(0.4+0.6*max(dot(d,uUp),0.0)), uDark);
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
const dome = new THREE.Mesh(new THREE.SphereGeometry(110000, 48, 32), domeMat); sky.add(dome);
// the planet at km scale; aBase keeps shape units so the noise pattern matches the space view
const skyPlanetGeo = rocketGeo.clone(); skyPlanetGeo.setAttribute('aBase', new THREE.BufferAttribute(rocketBase.slice(), 3)); skyPlanetGeo.scale(KM, KM, KM); skyPlanetGeo.computeBoundingSphere();
const skyPlanetMat = planetMat({ ns: SHAPE_NS * 7, ice: 0, land: 0.45, lights: 0, clouds: 0.25, mode: 1, near: 40, oct: 6, amb: 0.08 });
const skyPlanet = new THREE.Mesh(skyPlanetGeo, skyPlanetMat); skyPlanet.frustumCulled = false; sky.add(skyPlanet);
const skySeaMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: { uSun: { value: new THREE.Vector3() }, uCam: { value: SKY_POS }, uSunS: { value: new THREE.Vector3() }, uUp: { value: SKY_UP }, uDay: { value: 1 }, uDusk: { value: 0 }, uNear: { value: 40 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: SKYFN + `uniform vec3 uSun; uniform vec3 uCam; uniform float uNear; varying vec3 vN; varying vec3 vW;
    void main(){ if(distance(vW,uCam)<uNear) discard; vec3 N=normalize(vN); vec3 V=normalize(uCam-vW); vec3 Hh=normalize(uSun+V);
      vec3 col=vec3(0.04,0.19,0.33)*(0.25+max(dot(N,uSun),0.0)*1.2)+pow(max(dot(N,Hh),0.0),80.0)*0.9;
      vec3 d=normalize(vW-uCam); float e=dot(d,uUp); float T=exp(-0.07/max(e+0.035,0.035)); col=col*T+skyColor(d)*0.22;
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const skySeaGeo = seaRing.geometry.clone(); skySeaGeo.scale(KM, KM, KM);
const skySea = new THREE.Mesh(skySeaGeo, skySeaMat); skySea.frustumCulled = false; sky.add(skySea);
