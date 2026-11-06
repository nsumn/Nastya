// =================== "만약 남극 장보고기지에 극야 동안 혼자 남는다면?" — Korean channel, ~46 s ===================
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
      vec3 sn=vec3(0.9,0.94,1.0)*(0.9+0.1*sa)*(0.93+0.07*nn(p*1.7)); vec3 ice=vec3(0.78,0.86,0.96)*(0.92+0.08*nn(p*0.05)); float sea=1.0-smoothstep(-200.0,-150.0,p.y);
      vec3 rock=mix(vec3(0.16,0.14,0.13), vec3(0.3,0.27,0.25), nn(p*0.9)); diffuseColor.rgb=mix(mix(sn,ice,sea), rock, rk*(1.0-sea)*0.92); }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { float sp=step(0.9985, hh(floor(vWP.xz*9.0))); totalEmissiveRadiance+=vec3(1.2,1.25,1.4)*sp*0.6; }`); };
{ const g = new THREE.PlaneGeometry(9000, 9000, 220, 220); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const land = smooth(-180, -60, z); const r = Math.hypot(x, z);
    p.setY(i, land * (2.5 * Math.sin(x * 0.02) * Math.cos(z * 0.017) + 4 * smooth(80, 600, r) * (0.5 + 0.5 * Math.sin(x * 0.006 + 1.3) * Math.sin(z * 0.008))) * (r < 70 ? r / 70 : 1)); }
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
  const mm = mesh(mergeGeometries(gs.map(g => { g.deleteAttribute('uv'); return g; })), mtnMat, false, false); pw.add(mm); }
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
// ---- the far figure in a red parka (wide exterior shots; POV = you) ----
const fig = makePerson(rnd, { skin: '#e8c0a0', top: '#c8322a', bottom: '#2a2e38', hair: '#151215' }); pw.add(fig.outer);
{ const hood = mesh(new THREE.SphereGeometry(0.155, 14, 12), M('#a8281f', { roughness: 0.85 })); hood.scale.set(1, 1.1, 1.08); hood.position.set(0, 1.65, -0.02); fig.torso.add(hood);
  const fur = mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 14), M('#d8cdb8', { roughness: 1 })); fur.position.set(0, 1.64, 0.1); fig.torso.add(fur);
  }
const FLOOD = []; [[0, 13, 20, 0.0], [-20, 11, -60, 0.0], [40, 11, 50, 0.0]].forEach(([x, y, z]) => { const L = new THREE.SpotLight(0xffd6a0, 0, 160, 0.9, 0.6, 1.2); L.position.set(x, y, z); L.target.position.set(x * 1.6, 0, z * 1.6 + 10); pw.add(L, L.target); FLOOD.push(L); });
const auroraFill = new THREE.PointLight(0xffc890, 0, 60, 1.2); auroraFill.position.set(-14, 6, -72); pw.add(auroraFill);
