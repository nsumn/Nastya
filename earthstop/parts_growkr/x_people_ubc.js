// =================== REAL PEOPLE: Quaternius "Universal Base Characters" (CC0, Standard/free) — real proportions, real hands (UE-style skeleton).
// The base bodies come in underwear, so clothes are GROWN from the body itself: the triangles weighted to the torso/arm/leg/foot bones are copied,
// smoothed (welded Laplacian) and pushed out along the normal, and stay skinned to the same skeleton → they follow every pose.
// Hair = Quaternius hair meshes rigged to the head bone, re-bound to the character's skeleton. Assets: assets/growkr/chars (git-ignored, see README).
const CH = 'assets/growkr/chars/';
const gltfL = new GLTFLoader();
const loadG = u => new Promise((ok, bad) => gltfL.load(CH + u, ok, undefined, bad));
const texL = new THREE.TextureLoader();
const loadT = (u, srgb = true) => new Promise(ok => texL.load(CH + u, t => { t.flipY = false; if (srgb) t.colorSpace = THREE.SRGBColorSpace; ok(t); }));
const BASE = { m: await loadG('ubc/Superhero_Male_FullBody.gltf'), f: await loadG('ubc/Superhero_Female_FullBody.gltf') };
const SKIN = { m: await loadT('ubc/T_Superhero_Male_Ligh.png'), f: await loadT('ubc/T_Superhero_Female_Light_BaseColor.png') };
const HAIR = {}; for (const h of ['Hair_SimpleParted', 'Hair_Long', 'Hair_Buns', 'Hair_Buzzed', 'Hair_BuzzedFemale']) HAIR[h] = await loadG('ubc_hair/' + h + '.gltf');
// cloth textures (canvas): soft cotton weave, denim twill
const cottonTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = y % 4 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'; g.fillRect(0, y, w, 1); } speckle(g, w, h, 3000, ['#7a7a7a', '#868686'], 2); }, [8, 8]);
cottonTex.colorSpace = THREE.NoColorSpace;
const denimMap = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#3e5f8e'; g.fillRect(0, 0, w, h); for (let i = -h; i < w; i += 3) { g.strokeStyle = i % 6 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,30,.12)'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); } speckle(g, w, h, 2500, ['#5a78a4', '#32507c', '#6a86b0'], 2); }, [6, 6]);
// region of each bone (by name)
const REG = n => /spine|clavicle|neck/.test(n) ? 'top' : /upperarm/.test(n) ? 'sleeve' : /pelvis|thigh|calf/.test(n) ? 'pants' : /foot|ball/.test(n) ? 'shoe' : 'skin';
function clothFrom(body, keep, push, smoothIt, mat, snap = null) {
  // keep(vertexIndex, regionWeights, bindPos) → bool; returns a SkinnedMesh with the kept triangles, smoothed + inflated
  const g0 = body.geometry, P = g0.attributes.position, J = g0.attributes.skinIndex, Wt = g0.attributes.skinWeight, bones = body.skeleton.bones, idx = g0.index ? g0.index.array : null;
  const nV = P.count, sel = new Uint8Array(nV), rw = [];
  for (let i = 0; i < nV; i++) { const r = { top: 0, sleeve: 0, pants: 0, shoe: 0, skin: 0 }; for (let k = 0; k < 4; k++) { const w = Wt.getComponent(i, k); if (w > 0) r[REG(bones[J.getComponent(i, k)].name)] += w; } rw.push(r); sel[i] = keep(i, r, V3(P.getX(i), P.getY(i), P.getZ(i))) ? 1 : 0; }
  const tris = []; const T = idx ? idx.length : nV; for (let t = 0; t < T; t += 3) { const a = idx ? idx[t] : t, b = idx ? idx[t + 1] : t + 1, c = idx ? idx[t + 2] : t + 2; if (sel[a] + sel[b] + sel[c] >= (snap ? 1 : 2)) tris.push(a, b, c); }
  const SP = new Float32Array(nV * 3); for (let i = 0; i < nV; i++) { const v = V3(P.getX(i), P.getY(i), P.getZ(i)); if (snap && !sel[i]) snap(v); SP[i * 3] = v.x; SP[i * 3 + 1] = v.y; SP[i * 3 + 2] = v.z; }
  const g = g0.clone(); g.setIndex(tris); g.deleteAttribute('normal'); g.computeVertexNormals();
  // weld by position for smoothing (UV seams split vertices)
  const key = i => `${Math.round(P.getX(i) * 2000)},${Math.round(P.getY(i) * 2000)},${Math.round(P.getZ(i) * 2000)}`; const wid = new Int32Array(nV), groups = new Map();
  for (let i = 0; i < nV; i++) { const k = key(i); if (!groups.has(k)) groups.set(k, groups.size); wid[i] = groups.get(k); }
  const nW = groups.size, nb = Array.from({ length: nW }, () => new Set()), used = new Uint8Array(nW);
  for (let t = 0; t < tris.length; t += 3) for (let e = 0; e < 3; e++) { const a = wid[tris[t + e]], b = wid[tris[t + (e + 1) % 3]]; nb[a].add(b); nb[b].add(a); used[a] = used[b] = 1; }
  let pos = new Float32Array(nW * 3); for (let i = 0; i < nV; i++) { pos[wid[i] * 3] = SP[i * 3]; pos[wid[i] * 3 + 1] = SP[i * 3 + 1]; pos[wid[i] * 3 + 2] = SP[i * 3 + 2]; }
  const rim = new Uint8Array(nW); if (snap) for (let i = 0; i < nV; i++) if (!sel[i]) rim[wid[i]] = 1;
  for (let it = 0; it < smoothIt; it++) { const np = pos.slice(); for (let w = 0; w < nW; w++) { if (!used[w] || nb[w].size < 3 || rim[w]) continue; let x = 0, y = 0, z = 0; for (const o of nb[w]) { x += pos[o * 3]; y += pos[o * 3 + 1]; z += pos[o * 3 + 2]; } const n = nb[w].size; np[w * 3] = lerp(pos[w * 3], x / n, 0.5); np[w * 3 + 1] = lerp(pos[w * 3 + 1], y / n, 0.5); np[w * 3 + 2] = lerp(pos[w * 3 + 2], z / n, 0.5); } pos = np; }
  const Q = g.attributes.position; for (let i = 0; i < nV; i++) Q.setXYZ(i, pos[wid[i] * 3], pos[wid[i] * 3 + 1], pos[wid[i] * 3 + 2]);
  g.computeVertexNormals(); const N = g.attributes.normal;
  // average normals across welded duplicates so the shell does not split at UV seams
  const acc = new Float32Array(nW * 3); for (let i = 0; i < nV; i++) { acc[wid[i] * 3] += N.getX(i); acc[wid[i] * 3 + 1] += N.getY(i); acc[wid[i] * 3 + 2] += N.getZ(i); }
  for (let i = 0; i < nV; i++) { const w = wid[i]; const v = V3(acc[w * 3], acc[w * 3 + 1], acc[w * 3 + 2]).normalize(); N.setXYZ(i, v.x, v.y, v.z); const d = typeof push === 'function' ? push(rw[i]) : push; Q.setXYZ(i, Q.getX(i) + v.x * d, Q.getY(i) + v.y * d, Q.getZ(i) + v.z * d); }
  const m = new THREE.SkinnedMesh(g, mat); m.bind(body.skeleton, body.bindMatrix); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; return m;
}
// makeHuman({ sex:'m'|'f', hair, hairCol, top, pants, shoes, sleeve:'short'|'long', skinTint })
function makeHuman(o = {}) {
  o = { sex: 'm', hair: 'Hair_SimpleParted', hairCol: '#1d1916', top: '#d9a63a', pants: 'denim', shoes: '#f2f2f0', sleeve: 'short', skinTint: '#fff4ec', ...o };
  const root = SkeletonUtils.clone(BASE[o.sex].scene); let body = null; const bones = {};
  root.traverse(n => { if (n.isBone) bones[n.name] = n; if (n.isSkinnedMesh) { n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false; if (/Retopology/.test(n.name) || n.material.name.startsWith('MI_Superhero')) body = n; } });
  body.material = body.material.clone(); body.material.map = SKIN[o.sex]; body.material.color.set('#ffffff'); body.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    float lum = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93,0.76,0.64) * (0.62 + 0.55 * lum / 0.45), 0.55);`); }; body.material.needsUpdate = true;
  root.updateMatrixWorld(true);
  // bind-pose landmarks (mesh space = the body's bind space)
  const B = n => { const v = V3(); bones[n].updateWorldMatrix(true, false); v.setFromMatrixPosition(bones[n].matrixWorld); return body.worldToLocal(v); };
  const sh = B('upperarm_l'), el = B('lowerarm_l'), wr = B('hand_l'), pel = B('pelvis'), ft = B('foot_l'), nk = B('neck_01'), hd = B('Head');
  const H = hd.y - ft.y;   // rough body-space size unit
  const sleeveX = o.sleeve === 'long' ? Math.abs(lerp(el.x, wr.x, 0.9)) : Math.abs(lerp(sh.x, el.x, 0.55));
  const topM = new THREE.MeshStandardMaterial({ color: o.top, roughness: 0.92, bumpMap: cottonTex, bumpScale: 0.6 });
  const hemY = pel.y + 0.035 * H, neckY = nk.y - 0.01 * H, waistY = pel.y + 0.05 * H, ankY = ft.y + 0.075 * H, shoeY = ft.y + 0.055 * H;
  const inTop = (r, p) => p.y > hemY && p.y < neckY + 0.02 * H && Math.abs(p.x) < sleeveX && (r.top + r.sleeve + r.pants + (o.sleeve === 'long' ? r.skin : 0) > 0.5) && !(Math.abs(p.x) < Math.abs(sh.x) * 0.9 && p.y > neckY - 0.012 * H * Math.max(0, p.z / 0.1));
  const top = clothFrom(body, (i, r, p) => inTop(r, p), r => 0.011 * H + 0.006 * H * r.sleeve, 3, topM,
    v => { if (Math.abs(v.x) > sleeveX) v.x = Math.sign(v.x) * sleeveX; if (v.y < hemY) v.y = hemY; if (v.y > neckY && Math.abs(v.x) < Math.abs(sh.x) * 0.9) v.y = neckY - (v.z > 0 ? 0.012 * H * clamp(v.z / 0.1, 0, 1) : 0); });
  const pantsM = o.pants === 'denim' ? new THREE.MeshStandardMaterial({ map: denimMap, roughness: 0.95 }) : new THREE.MeshStandardMaterial({ color: o.pants, roughness: 0.9, bumpMap: cottonTex, bumpScale: 0.5 });
  const pants = clothFrom(body, (i, r, p) => (r.pants + r.top > 0.5) && p.y < waistY && p.y > ankY, 0.009 * H, 3, pantsM, v => { if (v.y > waistY) v.y = waistY; if (v.y < ankY) v.y = ankY; });
  const shoes = clothFrom(body, (i, r, p) => p.y < shoeY, 0.013 * H, 4, new THREE.MeshStandardMaterial({ color: o.shoes, roughness: 0.6 }), v => { if (v.y > shoeY) v.y = shoeY; });
  body.parent.add(top, pants, shoes);
  if (o.hair && HAIR[o.hair]) { const hs = SkeletonUtils.clone(HAIR[o.hair].scene); let hm = null; hs.traverse(n => { if (n.isSkinnedMesh) hm = n; });
    if (hm) { const sk = new THREE.Skeleton(hm.skeleton.bones.map(b => bones[b.name]), hm.skeleton.boneInverses); hm.removeFromParent(); body.parent.add(hm); hm.bind(sk, body.bindMatrix);
      hm.material = hm.material.clone(); hm.material.color.set(o.hairCol); hm.castShadow = true; hm.frustumCulled = false; } }
  root.traverse(n => { if (n.isMesh && n !== body && /Hair_1/.test(n.material.name || '')) { n.material = n.material.clone(); n.material.color.set(o.browCol || '#4a3a30'); n.material.transparent = true; n.material.opacity = 0.75; } });
  // normalise height: 1.0 = the model's own size → scale so the person is o.h metres tall (default 1.72)
  const box = new THREE.Box3().setFromObject(root); const k = (o.h || 1.72) / (box.max.y - box.min.y);
  const outer = new THREE.Group(); outer.add(root); root.scale.setScalar(k); root.position.y = -box.min.y * k;
  const rest = {}; for (const n in bones) rest[n] = bones[n].quaternion.clone();
  return { outer, root, bones, rest, body, o, scale: k };
}
// ---- posing: rotations about WORLD axes applied on top of the rest pose, parent → child ----
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function poseRest(P) { for (const n in P.bones) P.bones[n].quaternion.copy(P.rest[n]); P.outer.updateMatrixWorld(true); }
function rotW(P, name, axis, ang) { const b = P.bones[name]; if (!b) return; b.parent.getWorldQuaternion(_pq); const bw = _pq.clone().multiply(b.quaternion); const la = axis.clone().normalize().applyQuaternion(bw.clone().invert());
  b.quaternion.multiply(_q.setFromAxisAngle(la, ang)); b.updateMatrixWorld(true); }
// pose helpers in the character's OWN frame (facing +Z, left = +X): axes are converted by the outer rotation
function rotL(P, name, ax, ang) { const a = V3(...ax).applyQuaternion(P.outer.getWorldQuaternion(new THREE.Quaternion())); rotW(P, name, a, ang); }
function armsDown(P, k = 1) { rotL(P, 'upperarm_l', [0, 0, 1], -1.25 * k); rotL(P, 'upperarm_r', [0, 0, 1], 1.25 * k); }
