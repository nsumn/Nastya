// =================== NIGHT SKY for "만약 서울의 모든 불이 5초 동안 꺼진다면?" ===================
// Replaces the dusk sky of h_set.js: moonless night, an orange light-pollution dome (uGlow), a procedural Milky Way (uMW) and ~7000 stars
// with magnitudes (limit uLim: 2 = Seoul tonight ≈ 20 stars, 6 = a dark site ≈ 2,500). Faint stars crowd toward the Milky Way plane.
// Early-November evening in Seoul (~21 h): the Milky Way arches across the northern sky — up from the northeast (Auriga/Perseus) through Cassiopeia to Cygnus in the west.
const MW_A = V3(0.707, 0, -0.707), MW_B = V3(-0.82, 0.57, 0).normalize();          // NE horizon + Cygnus ~35° up in the west
const MW_N = MW_A.clone().cross(MW_B).normalize(), MW_E1 = MW_A.clone(), MW_E2 = MW_N.clone().cross(MW_E1).normalize();
const MW_CORE = MW_B.clone();   // brightest stretch (Cygnus) in the west
const nightMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uGlow: { value: 1 }, uMW: { value: 0 }, uGain: { value: 1 }, uN: { value: MW_N }, uE1: { value: MW_E1 }, uE2: { value: MW_E2 }, uCore: { value: MW_CORE } },
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }',
  fragmentShader: `uniform float uGlow, uMW, uGain; uniform vec3 uN, uE1, uE2, uCore; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.07; a*=0.5; } return s; }
    void main(){ vec3 d=normalize(vD); float y=max(d.y,0.0);
      vec3 c=mix(vec3(0.010,0.013,0.026), vec3(0.003,0.005,0.012), smoothstep(0.0,0.8,y));
      c+=vec3(0.010,0.016,0.012)*exp(-y*4.0)*(1.0-uGlow);                                     // faint airglow once the city is dark
      // light-pollution dome: orange-grey, strongest low over the city, a dull lift everywhere
      c+=vec3(0.50,0.28,0.14)*uGlow*(exp(-y*5.0)*0.7+0.06)+vec3(0.03,0.025,0.035)*uGlow;
      // Milky Way: a soft band with clumpy star clouds and a dark dust lane, extinguished near the horizon
      float b=dot(d,uN), u=atan(dot(d,uE2),dot(d,uE1));
      float band=exp(-b*b/0.034), core=pow(max(dot(d,uCore),0.0),2.0);
      float cl=fbm(vec2(u*9.0, b*16.0)+3.1), fine=fbm(vec2(u*30.0, b*36.0)+7.7);
      float dust=smoothstep(0.42,0.72,fbm(vec2(u*11.0+5.0, b*24.0)))*exp(-pow((b+0.03*sin(u*3.0))/0.07,2.0));
      float mw=band*(0.25+0.75*cl)*(0.75+0.5*fine)*(1.0-0.8*dust)*(0.55+1.5*core);
      c+=mix(vec3(0.55,0.62,0.85), vec3(1.0,0.86,0.66), core)*mw*0.075*uMW*smoothstep(0.02,0.3,y);
      if(d.y<0.0) c=vec3(0.006,0.007,0.012)+vec3(0.3,0.17,0.09)*uGlow*0.5;
      gl_FragColor=vec4(c*uGain,1.0); }` });
skyDome.material = nightMat;
// ---- stars ----
const STARS = (() => { seed = 7171; const N = 30000, pos = new Float32Array(N * 3), mag = new Float32Array(N), col = new Float32Array(N * 3);
  const a0 = Math.pow(10, 0.5 * -1.4), a1 = Math.pow(10, 0.5 * 7.0), v = V3(0, 0, 0);
  for (let i = 0; i < N; i++) { const m = Math.log10(a0 + rnd() * (a1 - a0)) / 0.5;
    for (;;) { v.set(R(-1, 1), R(-0.1, 1), R(-1, 1)); const l = v.length(); if (l > 1 || l < 0.1) continue; v.divideScalar(l);
      const b = v.dot(MW_N), keep = 0.35 + 0.65 * Math.exp(-b * b / 0.05) * smooth(3, 6, m) + (1 - smooth(3, 6, m)) * 0.65; if (rnd() < keep) break; }
    pos[i * 3] = v.x * 25000; pos[i * 3 + 1] = v.y * 25000; pos[i * 3 + 2] = v.z * 25000; mag[i] = m;
    const k = rnd(); const c = k < 0.2 ? [1.0, 0.82, 0.62] : k < 0.35 ? [0.75, 0.85, 1.0] : [1.0, 0.97, 0.92]; col.set(c, i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('mag', new THREE.BufferAttribute(mag, 1)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uLim: { value: 2 }, uK: { value: 1 } },
    vertexShader: `attribute float mag; attribute vec3 color; uniform float uLim, uK; varying float vA; varying vec3 vC;
      void main(){ vec3 d=normalize(position); float vis=smoothstep(uLim+0.35, uLim-0.35, mag)*smoothstep(0.0,0.14,d.y);
        vA=vis*uK*clamp(0.4+1.8*pow(10.0,-0.4*(mag-1.5)), 0.4, 7.0); vC=color;
        vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99998;
        gl_PointSize=vis>0.001 ? 2.8+1.6*clamp(3.0-mag,0.0,4.0) : 0.0; }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ vec2 q=gl_PointCoord-0.5; float r=length(q)*2.0; float a=exp(-r*r*3.5)*smoothstep(1.0,0.7,r); gl_FragColor=vec4(vC*vA*a, 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -9; hw.add(p); return p; })();
// stars visible for a limiting magnitude (calibrated: lim 2 ≈ 20-25 above the horizon in a lit city, lim 6 ≈ 2,500 at a dark site)
const starsVisible = lim => Math.round(Math.min(2500, 25 * Math.pow(10, 0.5 * (Math.min(lim, 6) - 2))));
function skyState(glow, lim, mw, gain = 1) { nightMat.uniforms.uGain.value = gain; STARS.material.uniforms.uK.value = Math.min(1.4, gain); nightMat.uniforms.uGlow.value = glow; nightMat.uniforms.uMW.value = mw; STARS.material.uniforms.uLim.value = lim; }
