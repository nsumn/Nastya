// =================== phones lighting up behind the windows + everyone on the phone ===================
const glowMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  uniforms: { uT: { value: 0 }, uAmt: { value: 0 } },
  vertexShader: `attribute float aPh; varying vec2 vUv; varying float vPh; void main(){ vUv=uv; vPh=aPh; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform float uT, uAmt; varying vec2 vUv; varying float vPh;
    void main(){ if(vPh>uAmt) discard; float cyc=fract(uT*0.45+vPh*17.0); float on=smoothstep(0.0,0.04,cyc)*(1.0-smoothstep(0.55,0.62,cyc));
      vec2 q=vUv-0.5; float d=length(q); float core=1.0-smoothstep(0.05,0.065,max(abs(q.x)*1.5,abs(q.y)));
      float halo=exp(-d*d*30.0)*0.9+exp(-d*d*120.0); float pulse=0.8+0.2*sin(uT*14.0+vPh*40.0);
      gl_FragColor=vec4((vec3(0.75,0.88,1.0)*core*2.0+vec3(0.25,0.5,1.0)*halo)*on*pulse, 1.0); }` });
const glowSlots = [];
for (const b of buildings) { if (b.x < -80 || b.x > 520) continue; const floors = Math.max(1, Math.floor((b.h - 4.6 - 0.9) / 3.35)); const bays = Math.max(2, Math.round(b.w / 3.3)), bw = b.w / bays;
  for (let f = 0; f < floors; f++) for (let k = 0; k < bays; k++) if (rnd() < 0.55) glowSlots.push([b.x - b.w / 2 + (k + 0.5) * bw, 6.1 + f * 3.35, b.side * 11.93, b.side]); }
const glowIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.0, 4.0), glowMat, glowSlots.length);
{ const d = new THREE.Object3D(); const ph = new Float32Array(glowSlots.length);
  glowSlots.forEach(([x, y, z, s], i) => { d.position.set(x + R(-0.3, 0.3), y + R(-0.3, 0.2), z); d.rotation.set(0, s > 0 ? Math.PI : 0, 0); d.updateMatrix(); glowIM.setMatrixAt(i, d.matrix); ph[i] = rnd(); });
  glowIM.geometry.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); glowIM.frustumCulled = false; city.add(glowIM); }
// every pedestrian gets a phone (shown only when everyone answers)
for (const P of people) givePhone(P.p);
function updateCalls(t, mode) {
  for (const c of clouds) c.material.color.set('#262c40');
  glowIM.visible = mode === 'city' || mode === 'street'; glowMat.uniforms.uT.value = t;
  glowMat.uniforms.uAmt.value = mode === 'city' ? lerp(0.08, 1.0, smooth(CITY, MAP - 0.8, t)) : 0.9;
  for (const P of people) { P.p.phone.visible = mode === 'street'; if (mode === 'street' && P.p.outer.visible) posePhone(P.p, t, P.ph); else { P.p.arms[1].rotation.set(P.p.arms[1].rotation.x, 0, -0.08); P.p.elbows[1].rotation.y = 0; } }
}
const camLight = new THREE.PointLight(0xffe2c0, 0, 30, 1.2); city.add(camLight);
// extra people standing on the near sidewalk, answering
for (let i = 0; i < 34; i++) { const side = i % 3 === 0 ? 1 : -1; person({ kind: 'idle', z: side * R(8.7, 11.3), x0: R(22, 70), v: 0, rotIdle: R(0, 6) }); givePhone(people[people.length - 1].p); }
