
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
