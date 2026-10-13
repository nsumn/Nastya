
// =================== SPACE scenes ===================
// shared star field
const starGeo = (() => { const n = 6000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3); const c = new THREE.Color();
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(5000); pos.set([v.x, v.y, v.z], i * 3); c.set(pick(['#ffffff', '#cfe0ff', '#ffe9c8', '#ffffff', '#bcd2ff'])).multiplyScalar(R(0.35, 1)); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; })();
const starPtMat = new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false });
function addStars(scene) { const p = new THREE.Points(starGeo, starPtMat); p.frustumCulled = false; scene.add(p); return p; }

// star surface: boiling granulation + limb darkening (HDR, the tone mapper makes it glow)
const STAR_VS = 'varying vec3 vN; varying vec3 vP; varying vec3 vV; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }';
const STAR_FS = NOISE + `uniform vec3 uCol; uniform float uT, uI, uBoil; varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){ vec3 p=normalize(vP); float n=fbm6(p*6.0+vec3(0.0,uT*0.08,uT*0.05))*0.6+0.4*snoise(p*22.0+uT*0.3);
  float mu=max(dot(normalize(vN),vV),0.0); float limb=0.35+0.65*pow(mu,0.5);
  vec3 c=uCol*(1.0+uBoil*n)*limb*uI; c+=uCol*pow(1.0-mu,3.0)*0.6*uI;
  gl_FragColor=vec4(c,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function makeStar(r, col, glowCol, glowS = 3.2) {
  const g = new THREE.Group();
  const m = new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, uniforms: { uCol: { value: new THREE.Color(col) }, uT: { value: 0 }, uI: { value: 2.2 }, uBoil: { value: 0.35 }, uOct: { value: 6 } } });
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), m); g.add(s);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(glowCol), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 }));
  gl.scale.setScalar(glowS * 2); g.add(gl);
  g.scale.setScalar(r); g.userData = { mat: m, glow: gl, sphere: s }; return g;
}

// ---- 1) size line-up: the Sun next to Spica (R_sun = 1 unit)
const lineup = new THREE.Scene(); lineup.background = new THREE.Color('#010207'); addStars(lineup);
const spaceCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 20000);
const SPICA_R = 7.47;
const sunStar = makeStar(1, '#ffa424', '#ff8a1e', 3.0); sunStar.userData.mat.uniforms.uI.value = 1.15; sunStar.position.set(-11.5, 0, 0); lineup.add(sunStar);
const spica = makeStar(SPICA_R, '#6f9cff', '#4f7dff', 2.6); spica.userData.mat.uniforms.uI.value = 1.1; spica.position.set(3.0, 0, 0); lineup.add(spica);
// supernova pieces (same scene, around Spica)
const SN_FS = NOISE + `uniform float uT, uA; uniform vec3 uC1, uC2, uC3; varying vec3 vN; varying vec3 vP; varying vec3 vV;
void main(){ vec3 p=normalize(vP); float n=fbm6(p*3.2+vec3(uT*0.05)); float f=abs(snoise(p*7.0+n*2.0)); float fil=pow(1.0-f,6.0);
  float rim=pow(1.0-abs(dot(normalize(vN),vV)),1.6);
  vec3 c=mix(uC1,uC2,smoothstep(-0.2,0.5,n)); c=mix(c,uC3,smoothstep(0.35,0.8,fil*rim+0.2*n));
  float a=(0.25*rim+fil*(0.4+rim))*uA; gl_FragColor=vec4(c*a,a); }`;
const snMat = new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: SN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC1: { value: new THREE.Color('#3f7dff') }, uC2: { value: new THREE.Color('#ff4fa8') }, uC3: { value: new THREE.Color('#ffb060') }, uOct: { value: 6 } } });
const snShell = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), snMat); lineup.add(snShell); snShell.visible = false;
const snShell2 = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), snMat.clone()); snShell2.material.uniforms.uC1.value = new THREE.Color('#40e0ff'); snShell2.material.uniforms.uC2.value = new THREE.Color('#7f5bff'); snShell2.material.uniforms.uC3.value = new THREE.Color('#ffffff'); lineup.add(snShell2); snShell2.visible = false;
const snCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#cfe4ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); lineup.add(snCore); snCore.visible = false;
const sparks = (() => { const n = 2600, dir = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(0.55, 1.05)); dir.set([v.x, v.y, v.z], i * 3); c.set(pick(['#9fd0ff', '#ff8fd0', '#ffd08a', '#ffffff'])); col.set([c.r, c.g, c.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dir.slice(), 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.userData.dir = dir;
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; lineup.add(p); p.visible = false; return p; })();
function updateSN(t) {
  const on = t >= SN; snShell.visible = snShell2.visible = snCore.visible = sparks.visible = on; spica.visible = !on || t < SN + 0.25;
  if (!on) return;
  const u = t - SN; const r = SPICA_R * 1.3 + 17 * (1 - Math.exp(-u * 0.6)) + u * 1.0;
  snShell.position.copy(spica.position); snShell.scale.setScalar(r); snShell.rotation.set(u * 0.03, u * 0.05, 0);
  snShell2.position.copy(spica.position); snShell2.scale.setScalar(r * 0.72); snShell2.rotation.set(-u * 0.04, u * 0.02, 0.5);
  snMat.uniforms.uT.value = t; snMat.uniforms.uA.value = 1.1 * smooth(0, 0.6, u); snShell2.material.uniforms.uT.value = t + 40; snShell2.material.uniforms.uA.value = 0.9 * smooth(0.1, 0.9, u);
  snCore.position.copy(spica.position); snCore.scale.setScalar(SPICA_R * (10 * Math.exp(-u * 1.6) + 2.2)); snCore.material.opacity = 0.35 + 0.65 * Math.exp(-u * 0.9);
  const pa = sparks.geometry.attributes.position, d = sparks.geometry.userData.dir; for (let i = 0; i < pa.count; i++) pa.setXYZ(i, spica.position.x + d[i * 3] * r * 1.08, d[i * 3 + 1] * r * 1.08, d[i * 3 + 2] * r * 1.08); pa.needsUpdate = true;
  sparks.material.opacity = smooth(0.2, 1.0, u);
}

// ---- 2) Earth at 1 AU next to Spica: it heats until the rocks glow
const hotS = new THREE.Scene(); hotS.background = new THREE.Color('#010207'); addStars(hotS);
const earthGeo = withBase(new THREE.SphereGeometry(1, 128, 96));
const earthMat = planetMat({ ns: 1.25, ice: 1, land: 0, lights: 0, clouds: 1, amb: 0.03 });
const earth = new THREE.Mesh(earthGeo, earthMat); hotS.add(earth);
const earthAir = atmoShell(new THREE.SphereGeometry(1, 64, 48), 1.035); hotS.add(earthAir);
const HOT_DIR = new THREE.Vector3(-0.75, 0.35, 0.55).normalize();                    // toward Spica
const hotStar = makeStar(1, '#a9c6ff', '#6f9bff', 3.4); hotStar.position.copy(HOT_DIR).multiplyScalar(260); hotStar.scale.setScalar(260 * Math.tan(2.0 * Math.PI / 180)); hotS.add(hotStar);
const hotGlow = atmoShell(new THREE.SphereGeometry(1, 64, 48), 1.06, [1.0, 0.45, 0.12], 2.2); hotS.add(hotGlow);

// ---- 3) orbit map, true scale (1 unit = 1 AU), rings drawn by a pixel-width shader
const mapS = new THREE.Scene(); mapS.background = new THREE.Color('#010207'); addStars(mapS);
const RINGS = [1, 1.52, 5.2, 9.58, 19.2, 30.07, 143];
const mapMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { uR: { value: RINGS }, uNew: { value: 0 } },
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uR[7]; uniform float uNew; varying vec2 vP;
  void main(){ float r=length(vP); float fw=fwidth(r); vec3 c=vec3(0.0); float a=0.0;
    for(int i=0;i<6;i++){ float l=1.0-smoothstep(0.6*fw,2.0*fw,abs(r-uR[i])); vec3 rc=i==0?vec3(0.45,0.75,1.0):(i==5?vec3(0.55,0.75,1.0):vec3(0.75)); float ra=i==0?0.85:(i==5?0.8:0.4); c+=rc*l*ra; a=max(a,l*ra); }
    float ln=1.0-smoothstep(1.2*fw,3.6*fw,abs(r-uR[6])); c+=vec3(0.96,0.70,0.24)*ln*uNew; a=max(a,ln*uNew);
    gl_FragColor=vec4(c,a); }` });
const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mapMat); mapPlane.rotation.x = -Math.PI / 2; mapS.add(mapPlane);
const mapStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#9cc0ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); mapS.add(mapStar);
const mapEarth = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#6fd0ff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); mapS.add(mapEarth);
const mapPlanets = [[5.2, 2.2, '#e8c89a'], [9.58, 4.1, '#f0dca0'], [19.2, 0.9, '#a8e0e8'], [30.07, 5.3, '#7fa6ff']].map(([a, ph, c]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); s.position.set(Math.cos(ph) * a, 0, Math.sin(ph) * a); mapS.add(s); return { s, a }; });
const mapCam = new THREE.PerspectiveCamera(40, W / H, 0.01, 20000);
