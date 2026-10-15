import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson, poseWalk, poseIdle, poseFlail, poseSit } from './people.js';

// "What if spam calls were missing people calling for help?" — classic series low-poly look (flat shading, soft shadows, no grain).
// Numbers: tools/spam_math.py — 52.5 B spam calls a year (YouMail 2025) = 1,665 / s; 93,447 missing (FBI NCIC 12/2024)
// -> 561,816 calls each a year = 1,539 a day = one every 56 s; 1 in 5 answered = 10.5 B = 49x the 212.9 M 911 calls (FCC 2024).
// =================== timeline ===================
const DECLINE = 4.0, ANSWER = 9.0, CITY = 15.0, MAP = 19.0, DIVIDE = 24.0, STREET = 33.0, CENTER = 42.0, DAWN = 51.0, T_END = 58.0;
// =================== helpers ===================
let seed = 9110;
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
function shoot(scene, camera, exp = 1) { camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.toneMappingExposure = exp; renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera); }
// =================== materials / builders ===================
const matCache = {};
function M(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }); return matCache[k]; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, typeof mat === 'string' ? M(mat) : mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
const BOX = new THREE.BoxGeometry(1, 1, 1);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
function speckle(g, w, h, n, cols, s = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(rnd() * w, rnd() * h, R(1, s), R(1, s)); } }
function bx(w, h, d, col, x, y, z, parent, opts = {}) { const m = mesh(BOX, typeof col === 'string' ? M(col, { flatShading: true, ...opts }) : col); m.scale.set(w, h, d); m.position.set(x, y, z); parent.add(m); return m; }
function grp(x, y, z, ry, parent) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
// a small glowing phone that people hold (attached to the forearm group of people.js)
const phoneGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.2), toneMapped: true });
function givePhone(p) { const g = new THREE.Group(); g.position.set(0, -0.28, 0.02); p.elbows[1].add(g);
  const b = mesh(BOX, M('#15161a', { roughness: 0.4 })); b.scale.set(0.035, 0.15, 0.075); g.add(b);
  const s = new THREE.Mesh(BOX, phoneGlowMat); s.scale.set(0.004, 0.13, 0.064); s.position.x = -0.017; g.add(s); p.phone = g; return g; }
// hand at the ear: right arm folded up so the phone sits by the head
function posePhone(p, t, ph) { p.arms[1].rotation.set(-0.35, 0, 0.62); p.elbows[1].rotation.set(-2.55, 0, 0); p.elbows[1].rotation.y = 0; }
