// =================== "What if you were left ALONE at the South Pole all winter?" — US channel, 62.5 s ===================
// (first built as a Korean Jang Bogo video; switched to the US South Pole station — flat ice plateau: no mountains, no sea)
// The set: a coastal Antarctic station in the style of Jang Bogo (Terra Nova Bay, 74.6°S): a three-wing main building on stilts, outbuildings,
// fuel tanks, wind turbines, a radome, the sea ice to the north (−z), mountains around. Meters. Interior rooms live INSIDE wing A (north wing).
const pw = new THREE.Scene();
const pCam = new THREE.PerspectiveCamera(40, W / H, 0.05, 60000); pw.add(pCam);
pw.fog = new THREE.FogExp2('#8fa0bc', 0.00012);
// ---- sky: sun height uSunY (−0.2…0.1), night amount uNight, aurora uAur, stars, blizzard whiteout uWhite ----
const SUNAZ = V3(-0.25, 0, -1).normalize();
const skyU = { uSun: { value: V3(0, 0, -1) }, uNight: { value: 0 }, uAur: { value: 0 }, uWhite: { value: 0 }, uT: { value: 0 } };
const AUR_K = { v: 0.2 };
const pSky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform vec3 uSun; uniform float uNight, uAur, uWhite, uT; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0); vec3 s=normalize(uSun); float sw=max(dot(normalize(vec3(d.x,0.0,d.z)),normalize(vec3(s.x,0.0,s.z))),0.0);
      float sy=s.y; float day=smoothstep(-0.12,0.05,sy);
      vec3 zen=mix(vec3(0.004,0.007,0.02), vec3(0.08,0.16,0.36), day), mid=mix(vec3(0.01,0.02,0.05), vec3(0.3,0.38,0.6), day);
      vec3 horW=mix(vec3(0.05,0.05,0.09), vec3(1.6,0.62,0.26), smoothstep(-0.16,0.0,sy)), horE=mix(vec3(0.015,0.02,0.04), vec3(0.45,0.42,0.62), day);
      vec3 hor=mix(horE, horW, pow(sw,2.5)); vec3 c=mix(hor, mid, smoothstep(0.0,0.25,y)); c=mix(c, zen, smoothstep(0.2,0.8,y));
      float sd=max(dot(d,s),0.0); c+=vec3(1.4,0.6,0.25)*pow(sw,10.0)*exp(-y*12.0)*smoothstep(-0.14,0.0,sy)*1.3;
      c+=vec3(6.0,3.6,1.6)*smoothstep(0.9993,0.9998,sd)*step(-0.01,sy);                       // the sun disc
      // stars (fade in at night)
      vec2 sp=vec2(atan(d.z,d.x)*180.0, d.y*300.0); vec2 ci=floor(sp); float st=h(ci); float tw=0.7+0.3*sin(uT*3.0+st*40.0);
      c+=vec3(1.0,0.97,0.9)*step(0.9975,st)*smoothstep(0.35,0.0,length(fract(sp)-0.5))*2.2*tw*uNight*smoothstep(0.0,0.15,y);
      c+=vec3(0.4,0.45,0.6)*fbm(d.xz*3.0/(d.y+0.3))*0.02*uNight;
      // aurora: vertical curtains along a wavy band in the sky, green body, pink-red top, slow drift
      if(uAur>0.001){ vec3 acc=vec3(0.0); for(int k=0;k<24;k++){ float hh=0.08+float(k)*0.022; vec2 q=d.xz/(d.y+0.04)*hh; // project to a sheet at height
          float band=q.x*0.9+0.6*sin(q.y*1.3+uT*0.15)+0.25*sin(q.y*3.1-uT*0.27); float rays=fbm(vec2(q.y*6.0+uT*0.4, float(k)*0.05))*0.8+0.4*n(vec2(q.y*22.0,uT*0.6));
          float m=exp(-pow((band-0.2)*3.2,2.0))*rays*smoothstep(0.02,0.12,d.y); vec3 col=mix(vec3(0.15,1.0,0.45), vec3(0.95,0.25,0.55), float(k)/24.0); acc+=col*m*(1.0-float(k)/26.0); }
        c+=acc*0.2*uAur; }
      if(d.y<0.0) c=hor*0.5;
      c=mix(c, mix(vec3(0.03,0.035,0.05), vec3(0.55,0.6,0.7), day), uWhite);
      gl_FragColor=vec4(c,1.0); }` });
const pDome = new THREE.Mesh(new THREE.SphereGeometry(50000, 64, 32), pSky); pDome.frustumCulled = false; pDome.renderOrder = -10; pw.add(pDome);
{ const envScene = new THREE.Scene(); skyU.uSun.value.set(-0.2, 0.08, -0.97).normalize(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), pSky)); pw.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.02, 1, 400).texture; pw.environmentIntensity = 0.35; }
const pSun = new THREE.DirectionalLight(0xffa060, 2.0); pSun.castShadow = true; pSun.shadow.mapSize.set(4096, 4096);
Object.assign(pSun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 800 }); pSun.shadow.bias = -0.0005; pSun.shadow.normalBias = 0.05; pw.add(pSun, pSun.target);
const pHemi = new THREE.HemisphereLight(0x9fb4e0, 0x6a7088, 0.6); pw.add(pHemi);
const pMoon = new THREE.DirectionalLight(0x6a8cff, 0.0); pMoon.position.set(200, 300, 100); pw.add(pMoon);
// ---- snow ground: sastrugi ripples, sparkle, rocky outcrops on the point; flat sea ice to the north ----
const snowU = { uSun: { value: V3(0, 1, 0) }, uT: { value: 0 } };
const snowMat = new THREE.MeshStandardMaterial({ color: '#eef3fa', roughness: 0.75, metalness: 0 });
snowMat.onBeforeCompile = sh => { sh.uniforms.uT = snowU.uT;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vWP; float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float nn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
    { vec2 p=vWP.xz; float sa=sin(p.x*0.9+p.y*0.25+nn(p*0.08)*6.0)*0.5+0.5; float rk=smoothstep(0.62,0.72,nn(p*0.035)+0.25*nn(p*0.2))*smoothstep(-160.0,-60.0,p.y)*(1.0-smoothstep(160.0,400.0,length(p)));
      vec3 sn=vec3(0.9,0.94,1.0)*(0.9+0.1*sa)*(0.93+0.07*nn(p*1.7)); vec3 ice=vec3(0.78,0.86,0.96)*(0.92+0.08*nn(p*0.05)); float sea=0.0;
      vec3 rock=mix(vec3(0.16,0.14,0.13), vec3(0.3,0.27,0.25), nn(p*0.9)); diffuseColor.rgb=mix(sn,ice,0.25*nn(p*0.01)); }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { float sp=step(0.9985, hh(floor(vWP.xz*9.0))); totalEmissiveRadiance+=vec3(1.2,1.25,1.4)*sp*0.6; }`); };
{ const g = new THREE.PlaneGeometry(9000, 9000, 220, 220); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const land = smooth(-180, -60, z); const r = Math.hypot(x, z);
    p.setY(i, (0.35) * (2.5 * Math.sin(x * 0.02) * Math.cos(z * 0.017) + 4 * smooth(80, 600, r) * (0.5 + 0.5 * Math.sin(x * 0.006 + 1.3) * Math.sin(z * 0.008))) * (r < 70 ? r / 70 : 1)); }
  g.computeVertexNormals(); const gm = mesh(g, snowMat, false, true); pw.add(gm); }
// ---- mountains: a ring of jagged ridges 3–12 km out, snow on top/flat faces, dark rock on steep faces; a big volcano cone to the NW ----
const mtnMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
{ const gs = [];
  const ridge = (cx, cz, len, ht, ang, seg) => { const g = new THREE.PlaneGeometry(len, ht * 2.2, seg, 14); const p = g.attributes.position; const col = [];
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len + 0.5, v = p.getY(i) / (ht * 2.2) + 0.5; const prof = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.7) * (0.55 + 0.45 * Math.sin(u * 17 + cx) * Math.sin(u * 5.3 + cz)) + 0.08 * hash(i + cx);
      const y = ht * prof * v * (1 + 0.15 * (hash(i * 1.7 + cz) - 0.5)); const zz = (1 - v) * ht * 1.6 * (0.8 + 0.4 * hash(i * 0.3)); p.setXYZ(i, p.getX(i), Math.max(0, y), -zz); }
    g.computeVertexNormals(); const nr = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { const steep = 1 - Math.abs(nr.getY(i)); const snow = steep < 0.55 || hash(i * 9.1) < 0.25 ? 1 : 0; const c = snow ? [0.86, 0.9, 0.97] : [0.2, 0.18, 0.17]; col.push(...c); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.rotateY(ang); g.translate(cx, 0, cz); gs.push(g.toNonIndexed()); };
  for (let k = 0; k < 18; k++) { const a = Math.PI * 0.15 + k / 18 * Math.PI * 1.5; const r = 3200 + 6000 * hash(k * 3.1); ridge(Math.sin(a) * r, Math.cos(a) * r, 2500 + 3000 * hash(k), 500 + 1100 * hash(k * 7.3), a + Math.PI, 40); }
  for (let k = 0; k < 8; k++) { const a = -Math.PI * 0.45 + k * 0.12; const r = 14000 + 3000 * hash(k * 5); ridge(Math.sin(a) * r, -Math.cos(a) * r, 5000, 900 + 700 * hash(k * 2), -a, 50); }
  const vol = new THREE.ConeGeometry(9000, 2700, 48, 10, true); { const p = vol.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y + 60 * (hash(i) - 0.5)); } }
  vol.translate(-9000, 1350, -22000); vol.computeVertexNormals(); const vc = []; const vp = vol.attributes.position; for (let i = 0; i < vp.count; i++) { const s = vp.getY(i) > 600 || hash(i) < 0.4; vc.push(...(s ? [0.88, 0.92, 0.98] : [0.25, 0.22, 0.2])); }
  vol.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3)); gs.push(vol.toNonIndexed());
  }
// ---- the station ----
const ST = new THREE.Group(); pw.add(ST);
const clad = M('#d9dde2', { roughness: 0.45, metalness: 0.35 }), cladD = M('#2e3640', { roughness: 0.4, metalness: 0.5 }), steel = M('#8a9098', { roughness: 0.5, metalness: 0.6 }), redP = M('#b8322a', { roughness: 0.55 }), blueP = M('#2a4f8a', { roughness: 0.55 });
const winGlow = new THREE.MeshStandardMaterial({ color: '#10141a', emissive: new THREE.Color('#ffbe7a'), emissiveIntensity: 0, roughness: 0.15, metalness: 0.2 });
const WINGS = [0, 2.094, 4.189], WEND = [];   // wing A points north (−z)
const WING_L = 46, WING_W = 13, WING_H = 9, STILT = 3.2;
WINGS.forEach((a, wi) => { const w = grp(0, 0, 0, a + Math.PI, ST);
  // body: long box with chamfered ends, a dark window band, panel seams; rooftop rail
  bx(WING_W, WING_H, WING_L, clad, 0, STILT + WING_H / 2, WING_L / 2 + 6, w);
  for (const sx of [-1, 1]) bx(0.1, 1.4, WING_L - 2, winGlow, sx * (WING_W / 2 + 0.02), STILT + 5.2, WING_L / 2 + 6, w);
  for (let k = 0; k < 15; k++) for (const sx of [-1, 1]) bx(0.12, 1.5, 0.18, cladD, sx * (WING_W / 2 + 0.07), STILT + 5.2, 8 + k * 3, w);
  for (let k = 0; k < 10; k++) { for (const sx of [-1, 1]) bx(0.08, WING_H + 0.02, 0.08, steel, sx * (WING_W / 2 + 0.04), STILT + WING_H / 2, 7 + k * 4.6, w); bx(WING_W + 0.1, 0.06, 0.08, steel, 0, STILT + WING_H + 0.53, 7 + k * 4.6, w); }
  bx(WING_W + 0.4, 0.5, WING_L + 0.4, cladD, 0, STILT + WING_H + 0.25, WING_L / 2 + 6, w);
  bx(WING_W + 0.4, 0.4, WING_L + 0.4, cladD, 0, STILT - 0.2, WING_L / 2 + 6, w);
  WEND.push(bx(WING_W - 1, 2.0, 0.4, winGlow, 0, STILT + 5.6, WING_L + 6.1, w));
  for (let k = 0; k < 8; k++) for (const sx of [-1, 1]) { const s = mesh(new THREE.CylinderGeometry(0.35, 0.35, STILT, 10), steel); s.position.set(sx * (WING_W / 2 - 1.2), STILT / 2, 9 + k * 5.6); w.add(s); }
  if (wi === 1) { bx(3, 2.6, 3, cladD, 0, STILT + WING_H + 1.3, WING_L - 4, w); }
});
{ const hub = mesh(new THREE.CylinderGeometry(11, 11, WING_H + 2, 6), clad); hub.position.y = STILT + (WING_H + 2) / 2; ST.add(hub);
  const hr = mesh(new THREE.CylinderGeometry(11.3, 11.3, 1.6, 6), winGlow); hr.position.y = STILT + 6.2; ST.add(hr);
  const top = mesh(new THREE.CylinderGeometry(6, 8, 2.5, 6), cladD); top.position.y = STILT + WING_H + 3.2; ST.add(top);
  const stair = bx(2.4, STILT, 6, steel, 0, STILT / 2, 14, ST); stair.rotation.x = 0.45; }
// outbuildings, tanks, turbines, radome, masts with red lights, rope-line posts
const OUT = [];
[[-70, 30, 18, 6, 10, redP], [-95, 5, 12, 5, 8, blueP], [75, 40, 22, 7, 12, redP], [95, 10, 10, 4, 7, M('#d8a420')], [-40, 75, 16, 6, 9, M('#cfd4da')], [30, 95, 26, 8, 14, redP]].forEach(([x, z, w, h, d, m]) => { const g = grp(x, 0, z, hash(x) * 0.6, ST); bx(w, h, d, m, 0, h / 2 + 0.4, 0, g); bx(w + 0.3, 0.35, d + 0.3, cladD, 0, h + 0.55, 0, g); bx(1.2, 2.2, 0.1, winGlow, w * 0.25, 1.5, d / 2 + 0.02, g); OUT.push(g); });
for (let k = 0; k < 4; k++) { const t2 = mesh(new THREE.CylinderGeometry(5, 5, 9, 28), M('#e8eaec', { roughness: 0.4, metalness: 0.4 })); t2.position.set(110 + k * 12, 4.5, -30 + (k % 2) * 4); ST.add(t2); const ring = mesh(new THREE.TorusGeometry(5.05, 0.12, 6, 28), steel); ring.rotation.x = Math.PI / 2; ring.position.set(t2.position.x, 9, t2.position.z); ST.add(ring); }
const TURB = [];
[[-130, -40], [-150, 30]].forEach(([x, z]) => { const g = grp(x, 0, z, 0, ST); const tw = mesh(new THREE.CylinderGeometry(0.6, 1.1, 30, 12), M('#eef0f2', { roughness: 0.4 })); tw.position.y = 15; g.add(tw);
  const hub = grp(0, 30, -1.2, 0, g); bx(1.4, 1.4, 3.2, M('#eef0f2'), 0, 0, 1.2, g).position.y = 30; for (let b = 0; b < 3; b++) { const bl = mesh(new THREE.BoxGeometry(0.5, 12, 0.12).translate(0, 6, 0), M('#f2f3f4')); bl.rotation.z = b * 2.094; hub.add(bl); } TURB.push(hub); });
{ const rd = mesh(new THREE.SphereGeometry(5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), M('#f4f4f2', { roughness: 0.5 })); rd.position.set(55, 9, -55); ST.add(rd); bx(6, 6, 6, clad, 55, 3, -55, ST); }
const REDL = []; [[40, -20, 28], [-60, -60, 22], [12, 60, 34]].forEach(([x, z, h]) => { const m = mesh(new THREE.CylinderGeometry(0.15, 0.25, h, 6), steel); m.position.set(x, h / 2, z); ST.add(m);
  for (let k = 1; k <= 4; k++) { const st = mesh(new THREE.CylinderGeometry(0.03, 0.03, h * 1.2, 4), steel); st.position.set(x + Math.sin(k * 1.57) * h * 0.3, h * 0.45, z + Math.cos(k * 1.57) * h * 0.3); st.lookAt(x, h, z); st.rotateX(Math.PI / 2); }
  const l = mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.3, 0.2) })); l.position.set(x, h + 0.3, z); ST.add(l); REDL.push(l); });
// the rope line: posts every 6 m from the main building to the science hut (blizzard walk)
const ROPE_A = V3(-14, 0, 22), ROPE_B = V3(-40, 0, 75);
{ const n = 10; const pts = []; for (let k = 0; k <= n; k++) { const p = ROPE_A.clone().lerp(ROPE_B, k / n); const post = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M('#f0d040')); post.position.set(p.x, 0.6 + 0.4, p.z); pw.add(post); pts.push(V3(p.x, 1.15 + 0.4, p.z)); }
  const curve = []; for (let k = 0; k < n; k++) for (let s = 0; s <= 8; s++) { const a = pts[k], b = pts[k + 1], u = s / 8; curve.push(a.clone().lerp(b, u).add(V3(0, -0.12 * Math.sin(Math.PI * u), 0))); }
  const rope = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 200, 0.025, 5), M('#e83a20', { roughness: 0.6 })); pw.add(rope); }
// ---- blizzard: 9000 wind-driven snow streaks around the camera (pure function of t) ----
const SN = 9000; const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SN * 6), 3));
const snowLines = new THREE.LineSegments(snowGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.8), transparent: true, opacity: 0.55, fog: false, depthWrite: false })); snowLines.frustumCulled = false; pw.add(snowLines);
function snowAt(t, cam, wind, amt, ctr) { snowLines.visible = amt > 0.01; if (!snowLines.visible) return; snowLines.material.opacity = 0.6 * amt; const a = snowGeo.attributes.position.array, c = ctr || cam.position, B = 26;
  const vx = wind, vy = -2.5, vz = wind * 0.35, sl = 0.045;
  for (let i = 0; i < SN; i++) { const ox = hash(i * 1.1) * B * 2, oy = hash(i * 2.3) * B, oz = hash(i * 3.7) * B * 2; const sp = 0.7 + 0.6 * hash(i * 5.9);
    const x = wrapR(ox + vx * sp * t - c.x, 0, B * 2) - B + c.x, y = wrapR(oy + vy * sp * t - c.y + B * 0.5, 0, B) - B * 0.5 + c.y, z = wrapR(oz + vz * sp * t - c.z, 0, B * 2) - B + c.z;
    const tu = 0.4 * Math.sin(t * 3 + i); a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x - vx * sp * sl; a[i * 6 + 4] = y - (vy + tu) * sp * sl; a[i * 6 + 5] = z - vz * sp * sl; }
  snowGeo.attributes.position.needsUpdate = true; }
// ---- our hero — EXACTLY the approved line from HERO.md (tee). Outside (−100°F) the same hero in the approved hoodie outfit, same charcoal colour.
const HERO_O = { head: 'human', body: 'human', skin: '#e9b98f', hair: '#4a3020', top: '#4b4f57', jeans: true, bottom: '#3d5f8f', shoe: '#f4f4f4', hairStyle: 'short', headS: 0.88 };
const heroIn = makeBlock(HERO_O), heroOut = heroIn; pw.add(heroIn.outer); heroIn.outer.visible = false;   // the hoodie mesh tears — always the approved tee hero (HERO.md)
for (const H of [heroIn]) for (const n of Object.keys(FACE)) for (const bl of [false, true]) renderer.initTexture(faceTex(H.o, n, bl));
let hero = heroOut;
function heroBase(x, z, ry, inside = false) { heroIn.outer.visible = heroOut.outer.visible = false; hero = inside ? heroIn : heroOut; const P = hero; P.outer.visible = true; P.outer.rotation.order = 'YXZ'; P.outer.rotation.set(0, ry, 0); P.torso.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0);
  for (const l of P.legs) l.rotation.set(0, 0, 0); for (const k of P.knees) k.rotation.x = 0.02; P.arms[0].rotation.set(0, 0, -0.1); P.arms[1].rotation.set(0, 0, 0.1); P.elbows[0].rotation.x = P.elbows[1].rotation.x = -0.25; P.outer.position.set(x, 0.95 + 0.35, z); }
// ---- the ceremonial South Pole: a striped pole with a chrome ball ----
const POLE = V3(-6, 0.35, -120);
{ const st = canvasTex(64, 512, (g, w, h) => { for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#c8322a' : '#f4f2ee'; g.save(); g.translate(0, k * 32); g.transform(1, 0.5, 0, 1, 0, 0); g.fillRect(0, -32, w, 32); g.restore(); } });
  const pl = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 20), new THREE.MeshStandardMaterial({ map: st, roughness: 0.4 })); pl.position.set(POLE.x, POLE.y + 0.65, POLE.z); pw.add(pl);
  const ball = mesh(new THREE.SphereGeometry(0.2, 32, 20), new THREE.MeshStandardMaterial({ color: '#e8ecf2', metalness: 1, roughness: 0.05, envMapIntensity: 1.4 })); ball.position.set(POLE.x, POLE.y + 1.5, POLE.z); pw.add(ball);
  const base = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 16), M('#3a3c42')); base.position.set(POLE.x, POLE.y + 0.06, POLE.z); pw.add(base);
  // a ring of plain colored pennants on bamboo poles around it (no national flags)
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, x = POLE.x + Math.cos(a) * 3.2, z = POLE.z + Math.sin(a) * 3.2; const bp = mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), M('#c8b080')); bp.position.set(x, POLE.y + 0.8, z); pw.add(bp);
    const f = mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshStandardMaterial({ color: pick(['#2a4f9a', '#e8e4dc', '#c8322a', '#2f7a4a', '#e8b030']), side: THREE.DoubleSide, roughness: 0.8 })); f.position.set(x + 0.17, POLE.y + 1.49, z); f.rotation.y = 0.3; pw.add(f); } }
// the station env map was made before; refresh it so the chrome ball reflects the plateau sky
// ---- the last plane: a ski-equipped four-engine turboprop (grey, orange tail band; no markings) ----
const PLANE = new THREE.Group(); pw.add(PLANE);
{ const gr = M('#9aa0a8', { roughness: 0.5, metalness: 0.3 }), dk = M('#30343a', { roughness: 0.5 });
  const fus = mesh(new THREE.CylinderGeometry(2.1, 2.1, 26, 20).rotateX(Math.PI / 2), gr); fus.position.set(0, 3.2, 0); PLANE.add(fus);
  const nose = mesh(new THREE.SphereGeometry(2.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), gr); nose.scale.set(1, 0.9, 1.4); nose.position.set(0, 3.1, 13); PLANE.add(nose);
  bx(2.4, 0.7, 1.6, dk, 0, 4.6, 12.6, PLANE);
  const tail = mesh(new THREE.CylinderGeometry(2.1, 0.6, 10, 16).rotateX(-Math.PI / 2), gr); tail.position.set(0, 3.9, -17.8); PLANE.add(tail);
  bx(0.4, 8, 5, M('#d8642a'), 0, 8.5, -21.5, PLANE); bx(13, 0.3, 3.4, gr, 0, 4.6, -21.5, PLANE);
  bx(40, 0.5, 4.2, gr, 0, 5.4, 2, PLANE);
  for (const x of [-12, -6, 6, 12]) { const en = mesh(new THREE.CylinderGeometry(0.75, 0.9, 4.5, 14).rotateX(Math.PI / 2), gr); en.position.set(x, 4.9, 3.4); PLANE.add(en);
    const pr = mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#202428', transparent: true, opacity: 0.35, depthWrite: false })); pr.position.set(x, 4.9, 5.75); PLANE.add(pr); }
  for (const x of [-2.4, 2.4]) { bx(0.9, 0.3, 7, M('#2a2a2e'), x, 0.25, 0, PLANE); } bx(0.9, 0.3, 4, M('#2a2a2e'), 0, 0.25, 10, PLANE);
  for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) bx(0.05, 0.5, 0.5, dk, sx * 2.08, 4.0, 7 - k * 1.6, PLANE); }
const planeCloud = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(1500 * 3), 3)), new THREE.PointsMaterial({ color: '#f4f6fa', size: 2.2, transparent: true, opacity: 0.5, depthWrite: false })); planeCloud.frustumCulled = false; pw.add(planeCloud);
function planeAt(t, t0) { const u = t - t0; const z = -260, x = 60 - 30 * u - 3 * u * u; const y = Math.max(0, 1.8 * (u - 2.2) * (u - 2.2) * (u > 2.2 ? 1 : 0)); PLANE.position.set(x, 0.35 + y, z); PLANE.rotation.set(0, -Math.PI / 2, 0); PLANE.rotateX(-Math.min(0.2, y * 0.02));
  const a = planeCloud.geometry.attributes.position.array; for (let i = 0; i < 1500; i++) { const age = hash(i) * 3, uu = u - age, px = 60 - 30 * uu - 3 * uu * uu + 6; const sp = age * 4; a[i * 3] = px + (hash(i * 3) - 0.5) * sp + 10 * age; a[i * 3 + 1] = 0.5 + hash(i * 5) * sp * 0.6 + (uu > 2.2 ? 1.8 * (uu - 2.2) ** 2 * 0.6 : 0); a[i * 3 + 2] = z + (hash(i * 7) - 0.5) * (sp + 6); }
  planeCloud.geometry.attributes.position.needsUpdate = true; }
const FLOOD = []; [[0, 13, 20, 0.0], [-20, 11, -60, 0.0], [40, 11, 50, 0.0]].forEach(([x, y, z]) => { const L = new THREE.SpotLight(0xffd6a0, 0, 160, 0.9, 0.6, 1.2); L.position.set(x, y, z); L.target.position.set(x * 1.6, 0, z * 1.6 + 10); pw.add(L, L.target); FLOOD.push(L); });
const auroraFill = new THREE.PointLight(0xffc890, 0, 60, 1.2); auroraFill.position.set(-14, 6, -72); pw.add(auroraFill);
