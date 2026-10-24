// =================== BACKYARD HAMMOCK (meters): she naps in a striped hammock between two trees; a glowing strip marks the one-atom gap under her ===================
const yard = new THREE.Scene(); yard.background = new THREE.Color('#9ad0f2'); yard.fog = new THREE.Fog(0xbfe0f4, 18, 60); const ydCam = new THREE.PerspectiveCamera(45, W / H, 0.05, 200);
yard.add(new THREE.HemisphereLight(0xe8f4ff, 0x6a8a4a, 1.0));
{ const s = new THREE.DirectionalLight(0xfff0d8, 2.8); s.position.set(4, 8, 5); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; Object.assign(s.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); yard.add(s); }
{ const grass = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6aa84a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#5a9a3e', '#7ab85a', '#62a046', '#82c060'], 3); }, [12, 12]);
  const gr = mesh(new THREE.PlaneGeometry(80, 80), M('#ffffff', { map: grass, roughness: 1 }), false, true); gr.rotation.x = -Math.PI / 2; yard.add(gr);
  for (const x of [-1.62, 1.62]) { const tr = mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.6, 10), M('#7a5234')); tr.position.set(x, 1.3, -0.05); yard.add(tr);
    for (let k = 0; k < 4; k++) { const c = mesh(new THREE.IcosahedronGeometry(R(0.7, 1.0), 1), M(pick(['#4a9a3a', '#5aaa44', '#3e8a34']), { flatShading: true })); c.position.set(x + R(-0.4, 0.4), R(2.6, 3.3), R(-0.5, 0.3)); yard.add(c); } }
  for (let i = 0; i < 26; i++) { const x = R(-14, 14), z = R(-16, -5); const c = mesh(new THREE.IcosahedronGeometry(R(0.8, 1.6), 1), M(pick(['#4a9a3a', '#5aaa44', '#3e8a34', '#6ab04a']), { flatShading: true })); c.position.set(x, R(0.6, 1.6), z); yard.add(c); }
  bx(30, 1.2, 0.08, '#f2e8d8', 0, 0.6, -6, yard); for (let x = -15; x <= 15; x += 0.5) bx(0.1, 1.3, 0.1, '#f8f0e4', x, 0.65, -5.95, yard);   // a white picket fence
  const lem = grp(-2.4, 0, 0.9, 0.4, yard); bx(0.32, 0.5, 0.32, '#e8d8c0', 0, 0.25, 0, lem); const gl = mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.12, 12), M('#f2e04a', { transparent: true, opacity: 0.85 })); gl.position.set(0, 0.56, 0); lem.add(gl); }
// the hammock: a sagging, cupped striped sheet + ropes to the trunks
const hamGeo = (() => { const g = new THREE.PlaneGeometry(2.5, 0.95, 50, 14); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.82 - 0.36 * (1 - (x / 1.25) ** 2) + 0.16 * (z / 0.475) ** 2 * (1 - 0.6 * (x / 1.25) ** 2)); } g.computeVertexNormals(); return g; })();
const hamY = x => 0.82 - 0.36 * (1 - (x / 1.25) ** 2);
const stripe = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#f08a3a', '#f8f0e0', '#3aa8c8', '#f8f0e0'][i % 4]; g.fillRect(0, i * 8, w, 8); } });
const hammock = mesh(hamGeo, M('#ffffff', { map: stripe, side: THREE.DoubleSide, roughness: 0.9 })); yard.add(hammock);
{ const rope = new THREE.LineBasicMaterial({ color: '#e8dcc0' }); for (const s of [-1, 1]) for (const z of [-0.47, 0, 0.47]) { const g = new THREE.BufferGeometry().setFromPoints([V3(s * 1.25, 0.82 + 0.16 * (z / 0.475) ** 2 * 0.4, z), V3(s * 1.56, 1.25, -0.02)]); yard.add(new THREE.Line(g, rope)); } }
const herY = makeHer(); const herYG = grp(0, 0, 0, Math.PI / 2, yard); herYG.add(herY.outer);
const gapStrip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-0.85, -0.45, 0, 0.4, 0.75].map(x => V3(x, 0.82 - 0.36 * (1 - (x / 1.25) ** 2) + 0.06, 0.2))), 40, 0.02, 6, false), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uA, uT; varying vec2 vUv; void main(){ float e=smoothstep(0.0,0.1,vUv.x)*smoothstep(1.0,0.9,vUv.x); float s=0.7+0.3*sin(vUv.x*60.0-uT*6.0); gl_FragColor=vec4(vec3(0.6,0.9,1.0)*e*s*uA*2.0,1.0); }' }));
yard.add(gapStrip);
function updateYard(t) { const sway = 0.035 * Math.sin((t - HAM) * 1.4); hammock.rotation.x = sway; hammock.position.z = 0;
  const P = herY; P.root.rotation.set(0, 0, 0); poseIdle(P, t, 0); P.arms[0].rotation.set(-0.2, 0, 0.25); P.arms[1].rotation.set(-2.8, 0, -0.3); P.elbows[1].rotation.x = -1.9; P.knees[0].rotation.x = 0.35; P.legs[0].rotation.x = -0.2;   // one hand behind the head
  herY.outer.rotation.set(-Math.PI / 2 + 0.12, 0, 0); herY.outer.position.set(0, hamY(0) + 0.13, -0.05); herYG.rotation.set(sway, Math.PI / 2, 0);
  gapStrip.position.set(0, 0, 0); gapStrip.rotation.set(sway, 0, 0); gapStrip.material.uniforms.uA.value = (0.9 + 0.3 * Math.sin(t * 4)) * smooth(HAM + 2.6, HAM + 3.6, t); gapStrip.material.uniforms.uT.value = t; }
function yardCamera(t) { const k = smooth(HAM - 0.5, HUG + 0.5, t); ydCam.position.set(lerp(2.6, 1.7, k), lerp(1.45, 1.05, k), lerp(3.0, 2.1, k)); ydCam.lookAt(lerp(-0.1, -0.15, k), lerp(0.7, 0.58, k), 0); }
