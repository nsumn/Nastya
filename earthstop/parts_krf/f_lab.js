// =================== KOREAN FACETED HERO LAB: the approved US low-poly human (tools/human_mesh.py) recast as a Korean guy ===================
const lab = new THREE.Scene(); lab.background = new THREE.Color('#e9d8c0'); const labCam = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);
lab.add(new THREE.HemisphereLight(0xfff2e0, 0x8a7060, 1.2)); { const k = new THREE.DirectionalLight(0xffe6c8, 1.8); k.position.set(1.5, 3, 4); k.castShadow = true; lab.add(k); const f = new THREE.DirectionalLight(0xc8d8ff, 0.5); f.position.set(-3, 1, 2); lab.add(f); }
bx(8, 6, 0.1, '#e9d8c0', 0, 3, -1.2, lab); bx(8, 0.1, 6, '#b88a5a', 0, -0.05, 1.5, lab);
const CAST = {
  us: makeBlock({ head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 }),
  kr: makeBlock({ head: 'human', body: 'human', skin: '#f1c9a5', hair: '#151215', browCol: '#1a1416', top: '#e8b23a', jeans: true, bottom: '#2f3d5c', shoe: '#f4f4f4', hairStyle: 'twoblock', headMesh: 'head_kr', kr: true, browW: 1.25, headS: 0.88 }),
  kr2: makeBlock({ head: 'human', body: 'human', skin: '#f1c9a5', hair: '#151215', browCol: '#1a1416', top: '#f2efe6', jeans: true, bottom: '#2f3d5c', shoe: '#f4f4f4', hairStyle: 'twoblock', headMesh: 'head_kr', kr: true, browW: 1.25, headS: 0.88 }) };
Object.values(CAST).forEach(p => { lab.add(p.outer); p.outer.visible = false; });
const SHOTS = [['kr', 'happy', 0], ['kr', 'laugh', 0], ['kr', 'surprised', 0], ['kr', 'worried', 0], ['kr', 'angry', 0], ['kr', 'smirk', 0], ['kr', 'crying', 0], ['kr', 'neutral', 1], ['kr', 'neutral', 2], ['kr2', 'happy', 0], ['us', 'happy', 0]];
const lbl = document.getElementById('lbl');
window.renderAt = (t) => { const n = Math.round(t);
  if (n === 20) { Object.values(CAST).forEach(p => p.outer.visible = false); [['kr', -0.45], ['us', 0.45]].forEach(([k, x]) => { const P = CAST[k]; P.outer.visible = true; P.outer.position.set(x, 0.95, 0); P.outer.rotation.y = -x * 0.3; poseIdle(P, 0, 0); P.face('happy', -1); });
    labCam.position.set(0, 1.4, 6.6); labCam.lookAt(0, 1.15, 0); shootTo(RTA, lab, labCam); composite(0, 1, 1); lbl.textContent = 'KOREA · USA'; return true; }
  const [who, ex, view] = SHOTS[clamp(n, 0, SHOTS.length - 1)];
  Object.values(CAST).forEach(p => p.outer.visible = false); const P = CAST[who]; P.outer.visible = true; P.outer.position.set(0, 0.95, 0); P.outer.rotation.y = 0; poseIdle(P, 0, 0); P.face(ex, -1);
  P.outer.updateMatrixWorld(true); const hd = P.head.getWorldPosition(V3(0, 0, 0)), off = [V3(0.4, 0.05, 1.8), V3(1.35, 0.1, 1.25), V3(1.85, 0.05, 0.02)][view];
  labCam.position.copy(hd).add(off); labCam.lookAt(hd.x, hd.y - 0.12, hd.z);
  shootTo(RTA, lab, labCam); compMat.uniforms.uPixOn.value = 0; compMat.uniforms.uRed.value = 0; composite(0, 1.0, 1.0);
  lbl.textContent = who.toUpperCase() + ' · ' + ex; return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
