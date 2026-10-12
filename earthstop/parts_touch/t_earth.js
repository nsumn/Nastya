
// =================== SPACE: cut-away Earth with the fall line (LA -> centre -> Indian Ocean) ===================
const space = new THREE.Scene(); space.background = new THREE.Color('#020308');
const spaceCam = new THREE.PerspectiveCamera(35, W / H, 0.05, 3000);
{
  const n = 5000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(1500); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
}
space.add(new THREE.AmbientLight(0x404a60, 0.7));
const spaceSun = new THREE.DirectionalLight(0xfff2e0, 3.0); spaceSun.position.set(-6, 4, 10); space.add(spaceSun);
const ER = 10;
function ll2v(lat, lon, r = ER) { const la = lat * Math.PI / 180, lo = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r); }
const LA = ll2v(34.05, -118.24).normalize();
// rotate the globe so LA is straight up (+y), then spin about y so North America faces the camera side of the cut
const Q_GLOBE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 2.3).multiply(new THREE.Quaternion().setFromUnitVectors(LA, new THREE.Vector3(0, 1, 0)));
const globe = new THREE.Group(); space.add(globe);
// wedge cut: remove x>0 && z>0 (world), camera looks into the notch from (+x,+z)
const CUTX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), CUTZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const KEEPX = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), KEEPZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let globeMain, globeWedge;
const wedge = new THREE.Group(); space.add(wedge);
async function buildGlobe() {
  const topo = await (await fetch('node_modules/world-atlas/land-50m.json')).json();
  const land = topojson.feature(topo, topo.objects.land);
  const MW = 2048, MH = 1024; const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.fillStyle = '#fff';
  const geoms = land.type === 'FeatureCollection' ? land.features.map(f => f.geometry) : [land.geometry];
  const polys = geoms.flatMap(gm => gm.type === 'MultiPolygon' ? gm.coordinates : [gm.coordinates]);
  for (const poly of polys) for (const ring of poly) {
    if (ring.every(([, la]) => la < -55)) continue;
    let prev = ring[0][0], off = 0; const pts = [];
    for (const [lo, la] of ring) { if (lo - prev > 180) off -= 360; else if (prev - lo > 180) off += 360; prev = lo; pts.push([lo + off, la]); }
    for (const sh of [-360, 0, 360]) { g.beginPath(); pts.forEach(([lo, la], i) => { const x = (lo + sh + 180) / 360 * MW, y = (90 - la) / 180 * MH; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fill('evenodd'); }
  }
  const img = g.getImageData(0, 0, MW, MH).data;
  const isLand = (lat, lon) => { const x = ((Math.floor((lon + 180) / 360 * MW) % MW) + MW) % MW, y = clamp(Math.floor((90 - lat) / 180 * MH), 0, MH - 1); return img[(y * MW + x) * 4] > 128; };
  const geo = new THREE.IcosahedronGeometry(ER, 48); const p = geo.attributes.position; const cols = new Float32Array(p.count * 3);
  const c = new THREE.Color(), v = new THREE.Vector3();
  for (let f = 0; f < p.count; f += 3) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, f + k)); v.normalize();
    const lat = Math.asin(v.y) * 180 / Math.PI, lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
    const al = Math.abs(lat); const j = rnd() * 0.06 - 0.03;
    if (lat < -62 || (al > 72 && isLand(lat, lon)) || lat > 80) c.set('#eef3f6');
    else if (isLand(lat, lon)) { if (al > 55) c.set('#7c8a62'); else if ((al > 14 && al < 36) && rnd() < 0.75) c.set('#c9a86a'); else c.set(rnd() < 0.5 ? '#5f8a3e' : '#6f9447'); c.offsetHSL(0, 0, j); }
    else { c.set(al > 50 ? '#2c5878' : '#2a6596'); c.offsetHSL(0, 0, j * 0.6); }
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (f + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.applyQuaternion(Q_GLOBE);
  const mMain = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, clippingPlanes: [CUTX, CUTZ], clipIntersection: true, side: THREE.DoubleSide });
  globeMain = new THREE.Mesh(geo, mMain); globe.add(globeMain);
  const mWedge = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, clippingPlanes: [KEEPX, KEEPZ], clipIntersection: false, transparent: true, side: THREE.DoubleSide });
  globeWedge = new THREE.Mesh(geo, mWedge); wedge.add(globeWedge);
}
// cross-section faces (unlit, layered): inner core 1,221 km · outer core 3,480 km · mantle · crust
const SECT_FS = `uniform float uT; varying vec3 vP;
  float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
  void main(){
    float r=length(vP)/${ER.toFixed(1)};
    vec3 c;
    if(r<0.192) c=mix(vec3(1.1,1.05,0.85),vec3(1.0,0.88,0.45),r/0.192);
    else if(r<0.546) c=mix(vec3(1.0,0.62,0.12),vec3(0.95,0.42,0.06),(r-0.192)/0.354);
    else if(r<0.895) c=mix(vec3(0.58,0.15,0.06),vec3(0.42,0.10,0.05),(r-0.546)/0.349);
    else if(r<0.99) c=mix(vec3(0.36,0.11,0.06),vec3(0.27,0.10,0.07),(r-0.895)/0.095);
    else c=vec3(0.36,0.30,0.26);
    // faceted low-poly feel: quantised jitter
    vec2 q=floor(vP.xy*1.6+vP.zz*1.6); c*=0.93+0.1*h(q);
    float edge=smoothstep(0.004,0.0,abs(r-0.192))+smoothstep(0.004,0.0,abs(r-0.546))+smoothstep(0.004,0.0,abs(r-0.895));
    c=mix(c,vec3(1.0,0.95,0.85),edge*0.35);
    gl_FragColor=vec4(c*1.15,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const sectMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT: { value: 0 } }, vertexShader: 'varying vec3 vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.0); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }', fragmentShader: SECT_FS });
{
  const f1 = new THREE.CircleGeometry(ER * 0.999, 128, -Math.PI / 2, Math.PI); f1.rotateY(-Math.PI / 2); globe.add(new THREE.Mesh(f1, sectMat)); // plane x=0, z>=0
  const f2 = new THREE.CircleGeometry(ER * 0.999, 128, -Math.PI / 2, Math.PI); globe.add(new THREE.Mesh(f2, sectMat));                       // plane z=0, x>=0
}
// atmosphere glow
const atm = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.06, 64, 48), new THREE.ShaderMaterial({
  transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(0.45,0.7,1.0,1.0)*f*1.3; }'
})); space.add(atm);
// tunnel line (on the notch edge = the y axis) + markers
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ER * 2, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, depthTest: false })); tunnel.renderOrder = 8; space.add(tunnel);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(160,210,255,0.9)'); gr.addColorStop(0.5, 'rgba(70,140,255,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
const youDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true })); youDot.renderOrder = 10; youDot.scale.setScalar(1.6); space.add(youDot);
const TRAIL_N = 90;
const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#8fd0ff', transparent: true, opacity: 0.9, depthTest: false, blending: THREE.AdditiveBlending })); trail.renderOrder = 9; space.add(trail);
const trailWide = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#4fa0ff', transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending })); trailWide.renderOrder = 9; space.add(trailWide);
const splash = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.75, 48), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false })); splash.rotation.x = Math.PI / 2; splash.renderOrder = 9; space.add(splash);
// fraction of radius at time tau (minutes), signed: + = LA side
function tunY(tau) {
  const P = TUN_HALF * 4; let u = ((tau % P) + P) % P;
  const half = (x) => { const k = clamp(x / TUN_HALF, 0, 1) * (TUN_R.length - 1); const i = Math.min(Math.floor(k), TUN_R.length - 2); return lerp(TUN_R[i], TUN_R[i + 1], k - i); };
  if (u < TUN_HALF) return half(u); if (u < 2 * TUN_HALF) return -half(2 * TUN_HALF - u); if (u < 3 * TUN_HALF) return -half(u - 2 * TUN_HALF); return half(4 * TUN_HALF - u);
}
const FALL_A = 36.6, FALL_RATE = TUN_HALF * 2 / (ARRIVE - FALL_A), FALL_K = 0.537;
function tauAt(t) {
  if (t < FALL_A) return 0;
  if (t < ARRIVE) return (t - FALL_A) * FALL_RATE;
  return TUN_HALF * 2 + FALL_RATE / FALL_K * (Math.exp(FALL_K * (t - ARRIVE)) - 1);
}
function tauRate(t) { return t < FALL_A ? 0 : t < ARRIVE ? FALL_RATE : FALL_RATE * Math.exp(FALL_K * (t - ARRIVE)); }
