// pose lab: the Korean hero in the Han River video poses, front + side
const lab = new THREE.Scene(); lab.background = new THREE.Color('#e9d8c0'); const labCam = new THREE.PerspectiveCamera(30, W / H, 0.05, 50);
lab.add(new THREE.HemisphereLight(0xfff2e0, 0x8a7060, 1.2)); { const k = new THREE.DirectionalLight(0xffe6c8, 1.8); k.position.set(1.5, 3, 4); lab.add(k); }
const P = makeBlock({ head: 'human', body: 'human', skin: '#f1c9a5', hair: '#151215', browCol: '#1a1416', top: '#2f5a40', outfit: 'tee_kr', collar: 1.556, jeans: true, bottom: '#2f3d5c', shoe: '#f4f4f4', hairStyle: 'twoblock', headMesh: 'head_kr', kr: true, browW: 1.25, headS: 0.88 });
lab.add(P.outer);
const reset = () => { for (const l of [...P.legs, ...P.arms]) l.rotation.set(0, 0, 0); for (const k of [...P.knees, ...P.elbows]) k.rotation.set(0, 0, 0); P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0); };
const POSES = [
  ['phone', () => { P.arms[1].rotation.set(-0.55, 0, 0.05); P.elbows[1].rotation.x = -1.35; }],
  ['wind', () => { P.arms[0].rotation.set(-0.45, 0, 0); P.arms[1].rotation.set(-0.5, 0, 0); P.elbows[0].rotation.x = -1.7; P.elbows[1].rotation.x = -1.6; P.torso.rotation.x = -0.12; }],
  ['slide', () => { P.arms[0].rotation.set(0.45, 0, -0.08); P.arms[1].rotation.set(0.45, 0, 0.08); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.1; }],
  ['surface', () => { P.arms[1].rotation.set(-0.6, 0, 0.05); P.elbows[1].rotation.x = -1.9; P.arms[0].rotation.set(-0.3, 0, 0); P.elbows[0].rotation.x = -0.6; }],
  ['pickup', () => { P.arms[1].rotation.set(-0.65, 0, 0); P.elbows[1].rotation.x = -0.9; P.torso.rotation.x = 0.35; }],
  ['run', () => { poseWalk(P, 1.4, 1.8); P.arms[0].rotation.x *= 0.6; P.arms[1].rotation.x *= 0.6; P.torso.rotation.x = 0.15; }],
];
window.renderAt = (t) => { const n = Math.round(t), [nm, fn] = POSES[Math.floor(n / 2) % POSES.length]; reset(); fn(); P.outer.position.set(0, 0.95, 0); P.outer.rotation.y = n % 2 ? Math.PI / 2 : 0.25; P.face('happy', -1);
  labCam.position.set(0, 1.35, 4.2); labCam.lookAt(0, 1.2, 0); shootTo(RTA, lab, labCam); composite(0, 1, 1); document.getElementById('lbl').textContent = nm; return true; };
window.sceneReady = (async () => { await document.fonts.ready; window.renderAt(0); return true; })();
