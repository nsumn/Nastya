
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
  // the sea floor that shows up when the water drains away
  const sd = await pbrSet('damp_beach_sand', [1, 1]); for (const t of [sd.map, sd.nor, sd.arm]) t.repeat.set(400, 400);
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ map: sd.map, normalMap: sd.nor, roughnessMap: sd.arm, roughness: 1, color: new THREE.Color('#b8a890') }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = SEABED; bed.receiveShadow = true; ocean.add(bed);
  const sunL = new THREE.DirectionalLight(0xfff0d8, 2.5); sunL.position.copy(OSUN).multiplyScalar(100); ocean.add(sunL);
}
const SEABED = -4.0;
// the drain: a swirling funnel where the sea pours into your hole
const vortexMat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 0 } }, transparent: true, side: THREE.DoubleSide, depthWrite: false, depthTest: false,
  vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform float uT, uA; varying vec2 vUv; varying vec3 vW;
    void main(){ float a=vUv.x*6.2831853, r=vUv.y; float sw=a*3.0+r*14.0-uT*5.0;
      float streak=pow(0.5+0.5*sin(sw),6.0)+0.5*pow(0.5+0.5*sin(sw*2.3+1.0),10.0);
      vec3 deep=vec3(0.02,0.12,0.17), foam=vec3(0.85,0.93,0.95);
      vec3 c=mix(deep*(0.8+1.2*r), foam, streak*(0.45+0.5*r)); float al=uA*(0.75+0.25*r)*(1.0-smoothstep(0.82,1.0,r));
      gl_FragColor=vec4(c,al);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const vortex = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 0.3, 3.0, 96, 24, true), vortexMat); vortex.position.set(0, -1.5, -8); vortex.renderOrder = 10; ocean.add(vortex); vortex.visible = false;
// the tsunami: a tall curling wall of water rolling in from the horizon
const waveGeo = (() => { const g = new THREE.PlaneGeometry(1600, 1, 200, 60); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), v = p.getY(i) + 0.5; const h = 34 * Math.pow(v, 0.9); const curl = 9 * Math.pow(v, 3.0); p.setXYZ(i, x, h, -curl + 2.0 * Math.sin(x * 0.02)); }
  g.computeVertexNormals(); return g; })();
const waveMat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uSun: { value: new THREE.Vector3() } }, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform float uT; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
    float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
    void main(){ float v=vUv.y; float n=vn(vec2(vUv.x*240.0, v*14.0-uT*1.5))*0.6+vn(vec2(vUv.x*900.0, v*40.0-uT*3.0))*0.4;
      vec3 deep=vec3(0.015,0.09,0.12), mid=vec3(0.05,0.30,0.33);
      vec3 c=mix(deep, mid, smoothstep(0.1,0.85,v)*(0.7+0.5*n));
      float foam=smoothstep(0.78,0.95,v+n*0.12); c=mix(c, vec3(0.92,0.96,0.97), foam);
      vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); if(dot(N,V)<0.0) N=-N; c*=0.6+0.6*max(dot(N,uSun),0.0); c+=pow(1.0-max(dot(N,V),0.0),4.0)*vec3(0.15,0.25,0.28);
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const tsunami = new THREE.Mesh(waveGeo, waveMat); tsunami.frustumCulled = false; ocean.add(tsunami); tsunami.visible = false;
const spray = []; { const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (let i = 0; i < 80; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.7 })); tsunami.add(s); s.position.set(R(-500, 500), R(30, 40), R(-12, -6)); s.scale.setScalar(R(8, 22)); spray.push(s); } }
function seaLevel(t) { return lerp(0, SEABED + 0.3, ease(smooth(DRAIN + 0.2, WAVE - 0.2, t))); }
function updateSea(t) {
  const wl = seaLevel(t); water.position.y = wl;
  const vOn = t > DRAIN && t < WAVE + 1.5; vortex.visible = vOn; vortexMat.uniforms.uT.value = t; vortexMat.uniforms.uA.value = smooth(DRAIN + 0.3, DRAIN + 1.3, t) * (1 - smooth(WAVE + 0.4, WAVE + 1.4, t));
  { const shv = new THREE.Vector3(OSUN.x, 0, OSUN.z).normalize(); vortex.position.set(shv.x * 9, wl - 1.5 + 0.05, shv.z * 9); } vortex.rotation.y = -t * 1.2;
  const wOn = t > WAVE - 0.2; tsunami.visible = wOn; const kk = clamp((t - WAVE) / 4.2, 0, 1); const k = kk * kk * (0.4 + 0.6 * kk);
  const sh = new THREE.Vector3(OSUN.x, 0, OSUN.z).normalize();
  tsunami.position.copy(sh.clone().multiplyScalar(lerp(520, -4, k))); tsunami.position.y = SEABED + 0.2; tsunami.lookAt(0, SEABED + 0.2, 0); tsunami.scale.set(1, lerp(0.35, 1.0, smooth(WAVE, WAVE + 2.5, t)), 1);
  waveMat.uniforms.uT.value = t; waveMat.uniforms.uSun.value.copy(OSUN);
  for (const s of spray) s.material.opacity = 0.6 * smooth(WAVE + 0.8, WAVE + 2.0, t);
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
  const under = oCam.position.y < water.position.y - 0.02;
  uwCeil.visible = under; water.visible = !under; ocean.fog = under ? uwFog : null; ocean.background = under ? new THREE.Color('#0b3d55') : ocean.userData.hdr;
  uwMat.uniforms.uT.value = t;
  for (const b of bubbles) { b.s.visible = under; const y = b.y0 + ((t - OCEAN) * b.sp) % 6; b.s.position.set(b.x + 0.05 * Math.sin(t * 3 + b.y0), Math.min(y, -0.03), b.z); b.s.scale.setScalar(b.r); }
}
