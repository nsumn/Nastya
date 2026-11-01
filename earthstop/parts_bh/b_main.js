// =================== "만약 강남역 사거리에 10원 동전 크기의 블랙홀이 생긴다면?" — Earth-mass black hole (r_s 8.9 mm, Ø 1.8 cm), tools/bh_math.py
// Everything at distance r has fallen in after the free-fall time t_ff(r) = (π/2)·sqrt(r³/2GM). The video runs in extreme slow motion: the HUD shows the real time.
// 0–18 s Gangnam crossing at night (metres) · 18–21 s aerial · 21–29 s the Korean peninsula from space · 29–32 s end card.
const END0 = 29.0, GM2 = 2 * 6.674e-11 * 5.972e24;
const tff = r => Math.PI / 2 * Math.sqrt(r * r * r / GM2);
const rFell = T => Math.pow(T / (Math.PI / 2), 2 / 3) * Math.pow(GM2, 1 / 3);           // radius that has fully fallen in by real time T
const TT = [[0, -7.5], [2, -7.5], [3, -6.6], [6, -6.0], [9, -4.3], [12, -3.6], [15, -2.75], [18, -1.6], [21, -0.8], [24, 0.25], [27, 0.85], [29, 0.95]];
function realT(tau) { if (tau < 2) return 0; for (let i = 1; i < TT.length; i++) if (tau <= TT[i][0]) { const [a, la] = TT[i - 1], [b, lb] = TT[i]; return Math.pow(10, la + (lb - la) * (tau - a) / (b - a)); } return Math.pow(10, 0.95); }
const fallK = (d, T) => { const f = clamp(T / tff(Math.max(d, 0.05)), 0, 1); return 1 - Math.pow(1 - f * f, 2 / 3); };     // 0 = still, 1 = gone (free-fall profile)
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
// =================== the night crossing (scene gn, metres; the hole hangs 1.1 m above the centre of the crossing) ===================
const gn = new THREE.Scene(); const gCam = new THREE.PerspectiveCamera(40, W / H, 0.005, 90000); gn.add(gCam);
const BH = V3(0, 1.1, 0);
gn.background = new THREE.Color('#0b1022'); gn.fog = new THREE.Fog('#141a30', 400, 9000);
gn.add(new THREE.HemisphereLight(0x51608a, 0x1a1410, 0.9));
const moonL = new THREE.DirectionalLight(0x8aa0d0, 0.6); moonL.position.set(-50, 80, 40); gn.add(moonL);
gn.environment = kw.environment; gn.environmentIntensity = 0.15;
const asph = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#26272b'; c.fillRect(0, 0, w, h); speckle(c, w, h, 7000, ['#202124', '#2e2f33', '#35363b'], 2); });
const road = mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ map: rep(asph, 300, 300), roughness: 0.55, metalness: 0.1 }), false, true); road.rotation.x = -Math.PI / 2; gn.add(road);
const nightCity = canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = '#0d0f17'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { c.fillStyle = ['#ffd38a', '#fff1d0', '#8ab8ff', '#ff9a6a'][(hash(i) * 4) | 0]; c.globalAlpha = 0.3 + hash(i * 3) * 0.7; c.fillRect(hash(i * 1.7) * w, hash(i * 2.9) * h, 1 + hash(i * 5) * 2, 1); } c.globalAlpha = 1;
  c.strokeStyle = 'rgba(255,190,110,.35)'; c.lineWidth = 2; for (let k = 0; k <= w; k += 64) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } });
const farCity = mesh(new THREE.PlaneGeometry(80000, 80000), new THREE.MeshBasicMaterial({ map: rep(nightCity, 60, 60), fog: true }), false, false); farCity.rotation.x = -Math.PI / 2; farCity.position.y = -0.05; gn.add(farCity);
// crosswalks (zebras) on the 4 sides, lane lines
const zebra = new THREE.MeshStandardMaterial({ color: '#e8e8e2', roughness: 0.6 });
for (const [cx, cz, rot] of [[0, -18, 0], [0, 18, 0], [-18, 0, 1], [18, 0, 1]]) for (let i = -7; i <= 7; i++) { const s = mesh(new THREE.PlaneGeometry(0.5, 4.5), zebra, false, true); s.rotation.x = -Math.PI / 2; s.rotation.z = rot ? Math.PI / 2 : 0; s.position.set(cx + (rot ? 0 : i * 1.0), 0.01, cz + (rot ? i * 1.0 : 0)); gn.add(s); }
// the crossing lines on the road
for (const sgn of [-1, 1]) for (let k = 22; k < 400; k += 9) { for (const [x, z] of [[k * sgn, 0], [0, k * sgn]]) { const l = mesh(new THREE.PlaneGeometry(x ? 4 : 0.15, x ? 0.15 : 4), M('#d9c46a'), false, true); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.012, z); gn.add(l); } }
// towers: dark glass with lit windows + signs at street level
const winTex = (seed) => canvasTex(128, 256, (c, w, h) => { c.fillStyle = '#121722'; c.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 8) for (let x = 3; x < w; x += 8) { const on = hash(seed + x * 13 + y * 7) > 0.42; c.fillStyle = on ? ['#ffe2a8', '#fff4dc', '#cfe2ff'][(hash(seed + x + y) * 3) | 0] : '#1b2232'; c.fillRect(x, y, 5, 5); } });
const SIGNS = ['카페', '노래방', 'PC방', '치킨', '약국', '편의점', '안경', '헬스', '분식', '한의원', '부동산', '은행'];
const signTex = (txt, col) => canvasTex(256, 96, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 58px "Noto Sans KR"'; c.textAlign = 'center'; c.fillText(txt, w / 2, 70); });
const TOWERS = [];
for (const [qx, qz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let i = 0; i < 9; i++) {
  const x = qx * (24 + (i % 3) * 26 + hash(i * 3 + qx) * 6), z = qz * (24 + Math.floor(i / 3) * 26 + hash(i * 5 + qz) * 6), h = 30 + hash(i * 7 + qx * 3 + qz) * 140, w = 18 + hash(i * 11) * 6;
  const wt = winTex(i * 31 + qx * 7 + qz * 13); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(Math.round(w / 6), Math.round(h / 12));
  const m = new THREE.MeshStandardMaterial({ map: wt, emissiveMap: wt, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.4 });
  const g = new THREE.Group(); g.position.set(x, 0, z); gn.add(g); const b = mesh(BOX, m); b.scale.set(w, h, w); b.position.y = h / 2; g.add(b);
  for (let k = 0; k < 3; k++) { const s = mesh(new THREE.PlaneGeometry(4.2, 1.6), new THREE.MeshBasicMaterial({ map: signTex(SIGNS[(i * 3 + k + qx + 4) % SIGNS.length], ['#d0283a', '#2a6ad0', '#e88a1a', '#18a06a', '#8a2ad0'][(i + k) % 5]) }), false, false);
    s.position.set(-qx * (w / 2 + 0.05) * 0 + (k - 1) * 5.2, 4.2 + k * 0.1, -qz * (w / 2 + 0.06)); s.rotation.y = qz > 0 ? Math.PI : 0; g.add(s); }
  TOWERS.push({ g, d: Math.hypot(x, z), h, x, z }); }
// 강남역 exit sign + LED billboard
const gangnamSign = mesh(new THREE.PlaneGeometry(3.2, 1.1), new THREE.MeshBasicMaterial({ map: canvasTex(320, 110, (c, w, h) => { c.fillStyle = '#1a1a1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#3cb44a'; c.beginPath(); c.arc(50, 55, 34, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 44px Inter'; c.textAlign = 'center'; c.fillText('2', 50, 71);
  c.textAlign = 'left'; c.font = 'bold 40px "Noto Sans KR"'; c.fillText('강남역', 100, 52); c.font = '500 26px Inter'; c.fillText('Gangnam  222', 100, 88); }) }), false, false); gangnamSign.position.set(-14, 2.6, -21.5); gn.add(gangnamSign);
const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), M('#444')); pole.position.set(-14, 1.2, -21.6); gn.add(pole);
const led = mesh(new THREE.PlaneGeometry(26, 15), new THREE.MeshBasicMaterial({ map: canvasTex(520, 300, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff3d7f'); gr.addColorStop(1, '#4a2aff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 88px "Noto Sans KR"'; c.textAlign = 'center'; c.fillText('GANGNAM', w / 2, 150); c.font = '500 40px "Noto Sans KR"'; c.fillText('오늘 밤도 강남', w / 2, 220); }) }), false, false);
led.position.set(-30, 32, -34.9); gn.add(led);
// street lamps (light pools)
for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14], [-40, -14], [40, 14], [-14, 40], [14, -40]]) { const p = new THREE.PointLight(0xffd9a0, 30, 30, 1.6); p.position.set(x, 8, z); gn.add(p); const l = mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 8), M('#3a3d42')); l.position.set(x, 4, z); gn.add(l); }
// traffic lights with a pedestrian countdown
const cdTex = []; for (let n = 0; n <= 20; n++) cdTex.push(canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#060606'; c.fillRect(0, 0, w, h); c.fillStyle = '#3cff6a'; c.font = 'bold 44px Inter'; c.textAlign = 'center'; c.fillText(String(n), w / 2, 48); }));
const cd = mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: cdTex[12] }), false, false); cd.position.set(6.5, 3.0, -20.6); gn.add(cd); { const p2 = mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), M('#444')); p2.position.set(6.5, 1.6, -20.8); gn.add(p2); }
// cars and buses waiting at the red light
function carG(col) { const g = new THREE.Group(); bx(4.4, 0.9, 1.8, col, 0, 0.75, 0, g, { roughness: 0.3, metalness: 0.5 }); bx(2.4, 0.7, 1.6, '#151a20', -0.2, 1.45, 0, g, { roughness: 0.1, metalness: 0.6 });
  for (const s of [-1, 1]) { const hl = mesh(new THREE.BoxGeometry(0.1, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: '#fff6dd' })); hl.position.set(2.22, 0.85, s * 0.6); g.add(hl); const tl = mesh(new THREE.BoxGeometry(0.1, 0.16, 0.4), new THREE.MeshBasicMaterial({ color: '#ff2a2a' })); tl.position.set(-2.22, 0.9, s * 0.6); g.add(tl); }
  for (const [x, z] of [[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]]) { const w = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), M('#111')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); } return g; }
function busG(col) { const g = new THREE.Group(); bx(11, 2.9, 2.5, col, 0, 1.75, 0, g, { roughness: 0.4, metalness: 0.3 }); bx(10, 1.0, 2.52, '#162030', 0, 2.3, 0, g, { roughness: 0.1, metalness: 0.6 }); return g; }
const VEH = []; ['#e8e8ea', '#1f2a44', '#b8bcc4', '#a22a2a', '#2f2f33', '#f2f2f2', '#3a5a8a', '#d9d9d9', '#2a2a2a', '#6a7280'].forEach((c, i) => { const lane = [-8, -4.5, 4.5, 8][i % 4], along = 26 + Math.floor(i / 4) * 7 + hash(i) * 2, g = carG(c); const onX = i % 2;
  g.position.set(onX ? along * (lane < 0 ? -1 : 1) : lane, 0, onX ? lane : -along * (lane < 0 ? 1 : -1)); g.rotation.y = onX ? 0 : Math.PI / 2; gn.add(g); VEH.push({ g, p0: g.position.clone(), r0: g.rotation.clone() }); });
for (const [x, z, ry, c] of [[24, -6, 0, '#2a8a3a'], [-27, 6, 0, '#2a5ad0']]) { const g = busG(c); g.position.set(x, 0, z); g.rotation.y = ry; gn.add(g); VEH.push({ g, p0: g.position.clone(), r0: g.rotation.clone() }); }
// pedestrians on the crosswalks and corners
const PEDS = []; { const looks = [['girl', 'cream'], ['hero', 'white'], ['man2', null], ['girl', 'pink'], ['hero', 'navy'], ['woman2', null]];
  for (let i = 0; i < 18; i++) { const [nm, tee] = looks[i % looks.length]; const P = makeHuman(nm, tee ? { tee } : {}); gn.add(P.outer);
    const side = i % 4, k = (i / 4 | 0) - 2; const pos = [V3(-6 + k * 2.6 + hash(i) * 1.2, 0, -18 + (hash(i * 2) - 0.5) * 2.5), V3(5 + k * 2.4, 0, 18 + (hash(i * 3) - 0.5) * 2), V3(-18 + (hash(i * 5) - 0.5) * 2, 0, 3 + k * 2.5), V3(17 + (hash(i * 7) - 0.5) * 2, 0, -4 + k * 2.6)][side];
    PEDS.push({ P, p0: pos, ry: [Math.PI / 2, -Math.PI / 2, 0, Math.PI][side], v: 1.3 + hash(i * 9) * 0.3, ph: hash(i * 11) * 6 }); } }
function walkCycle(P, ph, amp = 1) { rotL(P, 'thigh_l', [1, 0, 0], 0.4 * amp * Math.sin(ph)); rotL(P, 'thigh_r', [1, 0, 0], -0.4 * amp * Math.sin(ph)); rotL(P, 'calf_l', [1, 0, 0], 0.5 * amp * Math.max(0, Math.sin(ph + 1.6))); rotL(P, 'calf_r', [1, 0, 0], 0.5 * amp * Math.max(0, -Math.sin(ph + 1.6)));
  rotL(P, 'upperarm_l', [1, 0, 0], -0.35 * amp * Math.sin(ph)); rotL(P, 'upperarm_r', [1, 0, 0], 0.35 * amp * Math.sin(ph)); }
function place(P, x, z, ry) { P.outer.position.set(x, 0, z); P.outer.rotation.set(0, ry, 0); P.outer.updateMatrixWorld(true); }
// the hole: an event horizon (black sphere, Ø 1.8 cm), a thin glowing photon ring, an accretion glow that grows as matter falls in; a 10-won coin on the road for scale
const hole = mesh(new THREE.SphereGeometry(0.0089, 32, 16), new THREE.MeshBasicMaterial({ color: '#000000' }), false, false); hole.position.copy(BH); gn.add(hole);
const glowT2 = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(128, 128, 4, 128, 128, 126); gr.addColorStop(0, 'rgba(255,240,220,1)'); gr.addColorStop(0.12, 'rgba(255,190,120,.85)'); gr.addColorStop(0.4, 'rgba(255,120,60,.25)'); gr.addColorStop(1, 'rgba(255,90,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
const accr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); accr.position.copy(BH); gn.add(accr);
const coin = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.0015, 32), new THREE.MeshStandardMaterial({ color: '#c88a4a', metalness: 0.9, roughness: 0.3 })); coin.position.set(0.05, 0.001, 0.02); gn.add(coin);
const coinLift = new THREE.Group(); gn.add(coinLift);
// streams of light from everything that falls in (instanced thin quads aligned to the hole)
const NSTR = 900, strGeo = new THREE.PlaneGeometry(1, 1); strGeo.translate(0.5, 0, 0);
const strM = new THREE.MeshBasicMaterial({ color: '#ffd7a0', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
const STR = new THREE.InstancedMesh(strGeo, strM, NSTR); STR.frustumCulled = false; gn.add(STR);
const SRC = []; for (let i = 0; i < NSTR; i++) { const d = Math.pow(10, -0.3 + hash(i * 1.3) * 4.6), a = hash(i * 2.7) * Math.PI * 2, y = hash(i * 4.1) * Math.min(d * 0.6, 160); SRC.push(V3(Math.cos(a) * d, y, Math.sin(a) * d)); }
const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _s4 = V3(), _x = V3(1, 0, 0);
function streams(T, cam) { let n = 0; for (let i = 0; i < NSTR; i++) { const s = SRC[i], d = s.distanceTo(BH), k = fallK(d, T * (0.9 + 0.3 * hash(i))); if (k <= 0.02 || k >= 0.999) { _m4.makeScale(0, 0, 0); STR.setMatrixAt(i, _m4); continue; }
  const p = s.clone().lerp(BH, k), dir = BH.clone().sub(p), len = Math.min(dir.length(), d * 0.35 * Math.sin(Math.PI * k) + 0.02); dir.normalize(); _q4.setFromUnitVectors(_x, dir);
  const wdt = Math.max(0.004, cam.position.distanceTo(p) * 0.0016); _s4.set(len, wdt, 1); _m4.compose(p, _q4, _s4); STR.setMatrixAt(i, _m4); n++; } STR.instanceMatrix.needsUpdate = true; return n; }
// gravitational lensing in the final composite: deflection α = θE²/θ around the hole's screen position (and a black shadow inside the photon ring)
compMat.uniforms.uBH = { value: new THREE.Vector3(0.5, 0.5, 0) }; compMat.uniforms.uBHr = { value: 0.0 };
compMat.fragmentShader = compMat.fragmentShader.replace('void main(){ vec2 uv = vUv;', `uniform vec3 uBH; uniform float uBHr;
  void main(){ vec2 uv = vUv; float lensDark = 0.0; if (uBHr > 0.00001) { vec2 asp = vec2(1.0, 1.7778); vec2 d = (uv - uBH.xy) * asp; float r = length(d); float e2 = uBHr * uBHr;
    if (r < uBHr * 0.62) lensDark = 1.0; else { float rr = r - e2 / max(r, 1e-4); uv = uBH.xy + normalize(d) * rr / asp; uv = clamp(uv, 0.001, 0.999); } }`);
compMat.fragmentShader = compMat.fragmentShader.replace('gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }', 'l = mix(l, vec3(0.0), lensDark); gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }');
compMat.needsUpdate = true;
function lensFor(cam, eRad) { const p = BH.clone().project(cam); compMat.uniforms.uBH.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, 0); const dist = cam.position.distanceTo(BH), vis = p.z < 1 ? 1 : 0;
  compMat.uniforms.uBHr.value = vis * Math.min(0.35, eRad / (2 * dist * Math.tan(cam.fov * Math.PI / 360))); }
// =================== space: a dark, glowing scar at Seoul that grows with the fallen radius (km) ===================
const scar = mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.94 }), false, false); scar.position.set(0, -RE, 0); sp.add(scar);
const scarRing = mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#ffb36a', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), false, false); scarRing.position.set(0, -RE, 0); sp.add(scarRing);
function setScar(rk) { const th = Math.max(0.6, rk) / RE; scar.geometry.dispose(); scar.geometry = new THREE.SphereGeometry(RE + 4, 128, 8, 0, Math.PI * 2, 0, th);
  scarRing.geometry.dispose(); scarRing.geometry = new THREE.SphereGeometry(RE + 5, 128, 2, 0, Math.PI * 2, th * 0.97, th * 0.09); }
const scarGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.add(scarGlow);
// =================== text ===================
const fmtT = T => T <= 0 ? '0초' : T < 0.001 ? (T * 1e6 < 10 ? (T * 1e6).toFixed(1) : Math.round(T * 1e6)) + 'µs' : T < 1 ? (T * 1000 < 10 ? (T * 1000).toFixed(2) : Math.round(T * 1000)) + 'ms' : T.toFixed(1) + '초';
const fmtR = r => r < 1000 ? Math.round(r) + 'm' : (r / 1000 < 10 ? (r / 1000).toFixed(1) : Math.round(r / 1000)) + 'km';
const CAPS = [[3.0, 5.9, '<span class="hl">10원 동전</span> 크기.<br>질량은 <span class="hl">지구</span>와 같습니다.'], [6.0, 8.9, '1m 거리 중력:<br>지구의 <span class="hl">40조 배.</span>'], [9.0, 11.9, '<span class="hl">0.00006초</span>:<br>사거리 위의 모든 것이 사라집니다.'],
  [12.0, 14.9, '<span class="hl">빛</span>까지 휘어집니다.'], [15.0, 17.9, '<span class="hl">0.002초</span>: 강남역 빌딩들.'], [18.0, 20.9, '<span class="hl">0.16초</span>: 서울 전체.'], [21.0, 23.9, '<span class="hl">1.8초</span>: 수도권과 서해까지.'],
  [24.0, 26.9, '<span class="hl">7초</span>: 남한 대부분.'], [27.0, 28.9, '지구 전체는…<br><span class="hl">약 15분.</span>']];
const $ = id => document.getElementById(id);
function text(t) {
  const T = realT(t), r = rFell(T);
  $('lab').textContent = '실제 경과 시간'; $('val').textContent = fmtT(T); $('sub').textContent = t < 2 ? '지구 질량 · 지름 1.8cm' : `빨려 들어간 반경 ${fmtR(Math.max(0, r))}`;
  for (const id of ['hud', 'mark']) $(id).style.opacity = 1 - smooth(28.8, 29.2, t); $('title').style.opacity = 1 - smooth(2.4, 2.9, t);
  const c = CAPS.find(c => t >= c[0] && t < c[1]); $('cap').innerHTML = c ? c[2] : ''; $('cap').style.opacity = c ? smooth(c[0], c[0] + 0.1, t) * (1 - smooth(c[1] - 0.1, c[1], t)) : 0;
  if (c) { const k = clamp((t - c[0]) / 0.25, 0, 1); $('cap').style.transform = `scale(${k >= 1 ? 1 : 0.82 + 0.18 * easeOutBack(k)})`; }
  $('flash').style.opacity = 0.8 * Math.max(0, 1 - Math.abs(t - 2.0) / 0.12);
  $('end').style.opacity = smooth(END0, END0 + 0.4, t); $('endT').style.opacity = smooth(END0 + 0.2, END0 + 0.7, t); $('endS').style.opacity = smooth(END0 + 0.6, END0 + 1.1, t);
}
const LOOK = (cam, p, l, fov = 42) => { cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(l); cam.fov = fov; cam.aspect = W / H; cam.updateProjectionMatrix(); };
function frameAt(t) {
  compMat.uniforms.uLook.value = 0.25; compMat.uniforms.uBHr.value = 0;
  const T = realT(t), on = t >= 2.0;
  if (t < 18) {
    hole.visible = on; accr.visible = on;
    // people: walk until the hole appears, then freeze (slow motion), then fall in as the radius reaches them
    PEDS.forEach((q, i) => { const P = q.P; poseRest(P); const walk = Math.min(t, 2.0); const p = q.p0.clone().add(V3(Math.sin(q.ry) * q.v * walk, 0, Math.cos(q.ry) * q.v * walk));
      const k = fallK(p.distanceTo(BH), T); const pp = p.lerp(BH.clone().setY(0), k); place(P, pp.x, pp.z, q.ry); armsDown(P, 0.9); walkCycle(P, (t < 2 ? t : 2) * 6 + q.ph, 1); fingers(P, 'l', 0.3, 0.2); fingers(P, 'r', 0.3, 0.2);
      P.outer.scale.setScalar(Math.max(0.001, 1 - k)); P.outer.visible = k < 0.98; face(P, t < 2.2 ? 'neutral' : 'shocked', t); });
    VEH.forEach(v => { const d = v.p0.distanceTo(BH), k = fallK(d, T); v.g.position.copy(v.p0).lerp(BH, k); v.g.scale.setScalar(Math.max(0.001, 1 - k)); v.g.visible = k < 0.98; v.g.rotation.set(v.r0.x + k * 3, v.r0.y, v.r0.z + k * 2); });
    TOWERS.forEach(o => { const k = fallK(o.d, T); o.g.position.set(o.x * (1 - k), 0, o.z * (1 - k));
      o.g.scale.set(Math.max(0.001, 1 - k), Math.max(0.001, 1 - k * 0.95), Math.max(0.001, 1 - k)); o.g.visible = k < 0.98; });
    gangnamSign.visible = pole.visible = fallK(25, T) < 0.9; led.visible = fallK(46, T) < 0.9; cd.material.map = cdTex[Math.max(0, 12 - Math.floor(Math.min(t, 2) * 1))]; cd.visible = fallK(21, T) < 0.9;
    coin.visible = fallK(0.5, T) < 0.5;
    // camera per shot
    let lensR = 0;
    if (t < 3) LOOK(gCam, V3(9 - 1.2 * t, 1.65, 34 - 2 * t), V3(0, 2.5, 0), 46);                                                  // street level: the crowd crosses, the hole pops in
    else if (t < 6) { const u = (t - 3) / 3; LOOK(gCam, V3(0.06 - 0.02 * u, 1.13, 0.16 - 0.04 * u), BH, 40); }                       // macro: the hole, the 10-won coin below, lensed zebra
    else if (t < 9) { const u = (t - 6) / 3; LOOK(gCam, V3(3.2 - u, 1.4, 6.5 - 1.5 * u), BH.clone().add(V3(0, 0.3, 0)), 50); }          // people frozen around it
    else if (t < 12) { const u = (t - 9) / 3; LOOK(gCam, V3(-12 + 4 * u, 3 + 2 * u, 22 - 4 * u), BH, 52); }                           // the crossing falls in as light
    else if (t < 15) { const u = (t - 12) / 3; LOOK(gCam, V3(30 * Math.cos(u), 4 + 6 * u, 30 * Math.sin(u) + 10), BH.clone().add(V3(0, 4, 0)), 54); }   // orbit: lensing ring
    else if (t < 18) { const u = (t - 15) / 3; LOOK(gCam, V3(-120 + 40 * u, 40 + 120 * u, 160 - 20 * u), V3(0, 20, 0), 56); }        // crane up: towers peel off
    else { const u = (t - 18) / 3; LOOK(gCam, V3(-800 - 600 * u, 900 + 1500 * u, 1200 + 900 * u), V3(0, 0, 0), 52); }                  // aerial: Seoul streams in
    accr.scale.setScalar(t >= 18 ? gCam.position.length() * 0.18 : Math.max(0.03, Math.min(6, 0.02 + rFell(T) * 0.004)) * (t > 15 ? 1 + (t - 15) * 6 : 1)); accr.material.opacity = on ? Math.min(1, 0.4 + rFell(T) * 0.01) : 0;
    streams(on ? T : 0, gCam);
    gn.fog.near = Math.max(400, gCam.position.length() * 0.6); gn.fog.far = Math.max(9000, gCam.position.length() * 6);
    shootTo(RTA, gn, gCam);
    if (on) lensFor(gCam, t < 6 ? 0.022 : t < 12 ? 0.4 : t < 18 ? 3 + (t - 12) : 30);
    return true;
  }
  // ----- the peninsula from space: the scar grows to the fallen radius -----
  const rk = rFell(T) / 1000; setScar(rk); scarGlow.position.set(0, 2, 0); scarGlow.scale.setScalar(Math.max(20, rk * 3.2)); scarGlow.material.opacity = 0.9;
  plane.visible = trail.visible = iss.visible = issRing.visible = false;
  const u = (t - 18) / 11, e = u * u * (3 - 2 * u); LOOK(spCam, V3(-20 - 480 * e, 60 + 1440 * e, 120 + 1880 * e), V3(10 + 30 * e, 0, -10 - 50 * e), 46); spCam.near = 60; spCam.updateProjectionMatrix(); spCam.far = 200000; spSky(200);
  renderer.setRenderTarget(RTA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sp, spCam); return true;
}
window.renderAt = (t) => {
  text(t);
  if (window.PASS === 'text') return true;
  if (t >= END0 + 0.4) { renderer.setRenderTarget(null); renderer.setClearColor('#101114', 1); renderer.clear(); return true; }
  compMat.uniforms.uWhip.value = 0.05 * Math.max(0, 1 - Math.abs(t - 18.0) / 0.1);
  frameAt(t); composite(0, 1, 1); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
