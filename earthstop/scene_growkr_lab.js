import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { Water } from "three/addons/objects/Water.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

// "만약 내 키가 1.5초마다 2배가 된다면?" — Korean channel short (~33 s), ifcam-like look: clean semi-real Seoul, soft daylight, haze, serif Korean captions.
// Numbers: tools/growkr_math.py (start 1.7 m, x2 every 1.5 s from t=2, 18 doublings → 446 km, ISS ~420 km).
const T0 = 2.0, DT = 1.5, NDBL = 18, K_END = 33.0;
const DEBUG = new URLSearchParams(location.search).get('debug');
// =================== helpers ===================
let seed = 4242;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = x => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const wrapR = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));
const fadeWin = (t, a, b, f = 0.35) => smooth(a, a + f, t) * (1 - smooth(b - f, b, t));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = n => Math.round(n).toLocaleString('en-US');
// =================== renderer ===================
const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
// every scene renders into a linear HDR target; one full-screen pass tone-maps both and dissolves between them
const RTA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }), RTB = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tA: { value: RTA.texture }, tB: { value: RTB.texture }, uMix: { value: 0 }, uExpA: { value: 1 }, uExpB: { value: 1 }, uPix: { value: new THREE.Vector4(0, 0, 0, 0) }, uPixOn: { value: 0 }, uRed: { value: 0 }, uT: { value: 0 }, uLook: { value: 1 }, uTilt: { value: 0 }, uWhip: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
  fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uExpA, uExpB; varying vec2 vUv;
    vec3 RRT(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 aces(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c*=1.0/0.6; c=I*c; c=RRT(c); c=O*c; return clamp(c,0.0,1.0); }
    vec3 srgb(vec3 c){ return mix(c*12.92, pow(c,vec3(1.0/2.4))*1.055-0.055, step(vec3(0.0031308),c)); }
    uniform vec4 uPix; uniform float uPixOn, uRed, uT, uLook, uWhip, uTilt;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    // soft glow around bright HDR spots (lamps, the sun, emissive bits): two rings of taps on the over-1.0 part
    vec3 glow(sampler2D tx, vec2 uv, float ex){ vec3 g=vec3(0.0); for(int i=0;i<8;i++){ float a=float(i)*0.785398+0.39; vec2 d=vec2(cos(a),sin(a))*vec2(1.0,0.5625);
      g+=max(texture2D(tx,uv+d*0.012).rgb*ex-1.0,0.0)*0.6+max(texture2D(tx,uv+d*0.03).rgb*ex-1.0,0.0)*0.4; } return g/8.0; }
    void main(){ vec2 uv = vUv;
      // optional mosaic: 30 px blocks inside a screen rectangle
      if (uPixOn > 0.5 && uv.x > uPix.x && uv.x < uPix.z && uv.y > uPix.y && uv.y < uPix.w) { vec2 bs = vec2(30.0 / 1080.0, 30.0 / 1920.0); uv = (floor(uv / bs) + 0.5) * bs; }
      vec3 a=aces(texture2D(tA,uv).rgb*uExpA+0.35*uLook*glow(tA,uv,uExpA)); vec3 c=a; if(uMix>0.001){ vec3 b=aces(texture2D(tB,uv).rgb*uExpB+0.35*uLook*glow(tB,uv,uExpB)); c=mix(a,b,uMix); }
      // whip pan: a horizontal smear along the cut (uWhip = smear length in uv, signed = direction)
      if(abs(uWhip)>0.0005){ vec3 acc=c; for(int i=1;i<=14;i++){ float o=uWhip*(float(i)/14.0-0.5)*2.0; vec2 q=vec2(clamp(uv.x+o,0.0,1.0),uv.y); vec3 sa=aces(texture2D(tA,q).rgb*uExpA); if(uMix>0.001) sa=mix(sa,aces(texture2D(tB,q).rgb*uExpB),uMix); acc+=sa; } c=acc/15.0; }
      vec2 p = (vUv - 0.5) * vec2(1.125, 2.0); float r = length(p * vec2(1.25, 0.8)); c = mix(c, vec3(0.55, 0.02, 0.02), uRed * smoothstep(0.35, 1.0, r));
      // fake tilt-shift (clay look): blur grows above and below a sharp middle band, like a macro shot of a miniature
      if(uTilt>0.001){ float bl=uTilt*smoothstep(0.12,0.42,abs(vUv.y-0.56)); if(bl>0.0005){ vec3 acc=c; for(int i=0;i<12;i++){ float a=float(i)*0.5236; vec2 o=vec2(cos(a),sin(a)*0.5625)*bl*(0.5+0.5*mod(float(i),2.0)); acc+=aces(texture2D(tA,uv+o).rgb*uExpA); } c=acc/13.0; } }
      c=srgb(c);
      // "storybook" finish: softer contrast with lifted blacks and a STATIC paper texture (moving grain gets mangled by TikTok's re-encode)
      vec2 px=vUv*vec2(1080.0,1920.0); float paper=vn(px/90.0)*0.5+vn(px/23.0)*0.3+vn(px/6.0)*0.2, grain=vn(px/1.7)-0.5;
      vec3 l=mix(c, c*0.93+vec3(0.035,0.03,0.025), uLook); l*=1.0+uLook*(0.07*(paper-0.5)+0.05*grain);
      float vg=length((vUv-0.5)*vec2(1.0,0.75)); l*=1.0-uLook*0.18*smoothstep(0.35,0.75,vg);
      gl_FragColor=vec4(clamp(l,0.0,1.0),1.0); }` });
const compScene = new THREE.Scene(), compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); compScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compMat));
function shootTo(rt, scene, camera) { camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera); }
function composite(mix, expA, expB) { const u = compMat.uniforms; u.uMix.value = mix; u.uExpA.value = expA; u.uExpB.value = expB; renderer.setRenderTarget(null); renderer.render(compScene, compCam); }
// =================== materials / builders ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }
function bx(w, h, d, col, x, y, z, parent, opts = {}) { const m = mesh(BOX, typeof col === 'string' ? M(col, { flatShading: true, ...opts }) : col); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function grp(x, y, z, ry, parent) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
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
// look test for the people (not part of the video)
const labS = new THREE.Scene(); labS.background = new THREE.Color('#a9bfd0'); labS.environment = new THREE.PMREMGenerator(renderer).fromScene(new (await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment(), 0.04).texture; labS.environmentIntensity = 0.6;
const ls = new THREE.DirectionalLight(0xfff1dc, 2.6); ls.position.set(2, 4, 4); ls.castShadow = true; labS.add(ls);
const flo = mesh(new THREE.PlaneGeometry(20, 20), M('#cfc8bb')); flo.rotation.x = -Math.PI / 2; labS.add(flo);
const A = makeHuman({ sex: 'm' }), Bf = makeHuman({ sex: 'f', hair: 'Hair_Long', top: '#f2f0ea', pants: '#2b2f3a', h: 1.62 });
A.outer.position.set(-0.45, 0, 0); Bf.outer.position.set(0.45, 0, 0); labS.add(A.outer, Bf.outer);
const VIEW = +(new URLSearchParams(location.search).get('v') || 0);
const labCam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
window.renderAt = (t) => { for (const P of [A, Bf]) { poseRest(P); if (VIEW >= 1) armsDown(P); }
  if (VIEW === 2) { labCam.position.set(-0.45, 1.6, 0.9); labCam.lookAt(-0.45, 1.5, 0); } else { labCam.position.set(0, 1.0, 5.2); labCam.lookAt(0, 0.95, 0); }
  shootTo(RTA, labS, labCam); compMat.uniforms.uLook.value = 0; composite(0, 1, 1); return true; };
window.sceneReady = (async () => { window.renderAt(0); return true; })();
