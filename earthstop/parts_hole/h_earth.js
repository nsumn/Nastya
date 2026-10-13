
// =================== EARTH (radius 1): 8k day/night maps, clouds, atmosphere; a wedge cut out around the tunnel ===================
// Frame: the tunnel (Kansas -> its antipode in the Indian Ocean) is the +Y axis; the removed 90° wedge opens toward +Z (the camera).
const space = new THREE.Scene(); space.background = new THREE.Color('#000004');
const eCam = new THREE.PerspectiveCamera(32, W / H, 0.001, 200);
const K_LAT = 38.5, K_LON = -98.0;                                     // Kansas
const ll = (lat, lon) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180; return new THREE.Vector3(Math.cos(a) * Math.cos(o), Math.sin(a), -Math.cos(a) * Math.sin(o)); };
const DK = ll(K_LAT, K_LON);
// rotation taking Earth's texture frame to the tunnel frame: DK -> +Y, and pick the wedge so North America faces the camera side
const Q_E = (() => { const y = DK.clone(), z0 = new THREE.Vector3(0, 1, 0).sub(y.clone().multiplyScalar(y.y)).normalize().negate(); const x = new THREE.Vector3().crossVectors(y, z0);
  const m = new THREE.Matrix4().makeBasis(x, y, z0); return new THREE.Quaternion().setFromRotationMatrix(m).invert(); })();
const earthG = new THREE.Group(); space.add(earthG);
const WEDGE = 0.5 * Math.PI / 2;                                       // half-angle of the removed wedge
const CUT_GLSL = `uniform float uWedge, uCutOn; varying vec3 vTp;
  bool cutAway(){ float a=atan(vTp.x, vTp.z); return uCutOn>0.5 && abs(a)<uWedge; }`;
const earthU = { dayMap: { value: null }, nightMap: { value: null }, specMap: { value: null }, norMap: { value: null }, cloudMap: { value: null },
  uSun: { value: new THREE.Vector3(-0.6, 0.45, 0.65).normalize() }, uQ: { value: new THREE.Matrix3() }, uWedge: { value: WEDGE }, uCutOn: { value: 1 }, uNight: { value: 1 } };
const EARTH_VS = `uniform mat3 uQ; varying vec3 vTp; varying vec3 vOp; varying vec3 vWn; varying vec3 vWp;
  void main(){ vOp=normalize(position); vTp=uQ*position; vec4 w=modelMatrix*vec4(position,1.0); vWp=w.xyz; vWn=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`;
const earthMat = new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: EARTH_VS,
  fragmentShader: CUT_GLSL + `uniform sampler2D dayMap, nightMap, specMap, norMap, cloudMap; uniform vec3 uSun; uniform float uNight; varying vec3 vOp; varying vec3 vWn; varying vec3 vWp;
  vec2 eq(vec3 d){ return vec2(0.5+atan(-d.z,d.x)/6.2831853, 0.5+asin(clamp(d.y,-1.0,1.0))/3.1415926); }
  void main(){ if(cutAway()) discard;
    vec2 uv=eq(normalize(vOp)); vec3 N=normalize(vWn);
    // tangent frame for the normal map (east / north)
    vec3 up=vec3(0.0,1.0,0.0); vec3 Tn=normalize(cross(up,N)+1e-5); vec3 Bn=cross(N,Tn);
    vec3 nm=texture2D(norMap,uv).xyz*2.0-1.0; vec3 Nb=normalize(N+ (Tn*nm.x+Bn*nm.y)*0.6);
    float ndl=dot(Nb,uSun), dl=max(ndl,0.0);
    vec3 day=texture2D(dayMap,uv).rgb; day=pow(day,vec3(2.2));
    float spec=texture2D(specMap,uv).r; vec3 V=normalize(cameraPosition-vWp); vec3 Hh=normalize(uSun+V);
    float tw=smoothstep(-0.12,0.25,dot(N,uSun));
    vec3 c=day*(dl*2.6+0.004)+spec*pow(max(dot(N,Hh),0.0),60.0)*vec3(1.0,0.85,0.6)*1.8*tw;
    vec3 night=pow(texture2D(nightMap,uv).rgb,vec3(2.2))*vec3(1.0,0.8,0.55)*3.0;
    c+=night*(1.0-smoothstep(-0.08,0.12,dot(N,uSun)))*uNight;
    float cl=texture2D(cloudMap,uv+vec2(0.002,0.0)).r; c=mix(c, vec3(0.0), cl*0.35*tw);  // cloud shadows, softly
    float fr=pow(1.0-max(dot(N,V),0.0),3.0); c+=vec3(0.25,0.5,1.0)*fr*0.6*smoothstep(-0.2,0.4,dot(N,uSun));
    gl_FragColor=vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 160), earthMat); earthG.add(earthMesh);
const cloudMat = new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: EARTH_VS, transparent: true, depthWrite: false,
  fragmentShader: CUT_GLSL + `uniform sampler2D cloudMap; uniform vec3 uSun; varying vec3 vOp; varying vec3 vWn; varying vec3 vWp;
  vec2 eq(vec3 d){ return vec2(0.5+atan(-d.z,d.x)/6.2831853, 0.5+asin(clamp(d.y,-1.0,1.0))/3.1415926); }
  void main(){ if(cutAway()) discard; float cl=texture2D(cloudMap,eq(normalize(vOp))).r; vec3 N=normalize(vWn);
    float l=max(dot(N,uSun),0.0); vec3 c=vec3(1.0)*(l*2.4+0.01); gl_FragColor=vec4(c, cl*0.92);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.006, 192, 128), cloudMat); earthG.add(clouds);
const atmoU = Object.assign({ uC: { value: new THREE.Vector3() } }, earthU);
const atmoMat = new THREE.ShaderMaterial({ uniforms: atmoU, vertexShader: EARTH_VS, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  fragmentShader: CUT_GLSL + `uniform vec3 uSun, uC; varying vec3 vWn; varying vec3 vWp;
  void main(){ vec3 rd=normalize(vWp-cameraPosition); vec3 oc=uC-cameraPosition; float tc=dot(oc,rd); vec3 cp=cameraPosition+rd*tc; float b=length(cp-uC);
    if(b<1.0) discard;                                                     // over the globe itself: nothing (the cut stays clean)
    float g=exp(-(b-1.0)/0.011); vec3 n=normalize(cp-uC);
    float l=smoothstep(-0.35,0.45,dot(n,uSun)); vec3 c=mix(vec3(1.0,0.5,0.25),vec3(0.32,0.6,1.0),smoothstep(-0.05,0.4,dot(n,uSun)))*g*l*1.3;
    gl_FragColor=vec4(c,1.0); }` });
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.06, 128, 96), atmoMat); earthG.add(atmo);
// the two cut faces: half discs in the planes at ±WEDGE around the tunnel axis, showing the real layers (PREM radii)
const layerU = { uT: { value: 0 }, rockMap: { value: null }, uHot: { value: 1 } };
const layerMat = new THREE.ShaderMaterial({ uniforms: layerU, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform float uT, uHot; uniform sampler2D rockMap; varying vec2 vP;
  float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }
  float fb(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
  void main(){ float r=length(vP); if(r>1.0) discard; float th=atan(vP.y,vP.x);
    vec2 sw=vec2(cos(th+uT*0.05),sin(th+uT*0.05))*r;
    float n=fb(vP*6.0+vec2(0.0,uT*0.03)), n2=fb(sw*14.0);
    vec3 c;
    if(r<0.1917){ c=mix(vec3(2.4,2.1,1.5),vec3(1.9,1.3,0.55),smoothstep(0.0,0.19,r))*(0.9+0.2*n2); }                 // inner core: white-hot solid iron
    else if(r<0.5462){ float k=(r-0.1917)/0.3545; float fl=fb(vec2(th*3.0+uT*0.08, r*18.0)); c=mix(vec3(1.25,0.5,0.08),vec3(0.95,0.28,0.04),k)*(0.7+0.6*fl); } // outer core: liquid iron
    else if(r<0.9945){ float k=(r-0.5462)/0.4483; float cv=fb(vec2(th*4.0, r*9.0)+n*0.8); c=mix(vec3(0.62,0.13,0.025),vec3(0.36,0.06,0.015),k)*(0.55+0.9*cv);  // mantle: hot rock, slow convection
      c=mix(c, vec3(0.12,0.04,0.02), smoothstep(0.93,0.994,r)); }
    else { vec3 rk=texture2D(rockMap, vP*7.0).rgb; c=pow(rk,vec3(2.2))*0.9; }                                       // crust
    float edge=smoothstep(0.0,0.004,abs(r-0.1917))*smoothstep(0.0,0.004,abs(r-0.5462))*smoothstep(0.0,0.003,abs(r-0.9945)); c*=0.75+0.25*edge;
    gl_FragColor=vec4(c*uHot,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const faces = [-1, 1].map(s => { const g = new THREE.CircleGeometry(1, 256, -Math.PI / 2, Math.PI); const m = new THREE.Mesh(g, layerMat);
  // half disc spans +x of its plane (x from 0..1, y -1..1); rotate it about Y to sit at angle s*WEDGE from +Z
  m.rotation.y = s * WEDGE - Math.PI / 2 * (s > 0 ? 1 : 1) ; return m; });
faces.forEach((m, i) => { const s = i ? 1 : -1; m.rotation.set(0, 0, 0); m.rotateY(-Math.PI / 2 + s * WEDGE); earthG.add(m); });
// the tunnel along the spine of the wedge
const tunnelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.9, 2.3) });
const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1.995, 12), tunnelMat); earthG.add(tunnel);
const traveler = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); earthG.add(traveler);
const travGlow = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#9fdcff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); travGlow.scale.setScalar(0.07); earthG.add(travGlow);
// stars
{ const n = 7000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(150); pos.set([v.x, v.y, v.z], i * 3); const b = Math.pow(rnd(), 3) * 0.9 + 0.1; col.set([b, b, b * R(0.9, 1.1)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  space.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true }))); }
async function buildEarth() {
  const [day, night, cl, spec, nor, rock] = await Promise.all([texP('earth/8k_earth_daymap.jpg', false), texP('earth/8k_earth_nightmap.jpg', false), texP('earth/8k_earth_clouds.jpg', false),
    texP('earth/earth_specular_2048.jpg', false), texP('earth/earth_normal_2048.jpg', false), texP('tex/rock_face_diff.jpg', false, [1, 1])]);
  for (const t of [day, night, cl, spec, nor]) { t.wrapS = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; }
  rock.wrapS = rock.wrapT = THREE.RepeatWrapping;
  Object.assign(earthU, {}); earthU.dayMap.value = day; earthU.nightMap.value = night; earthU.cloudMap.value = cl; earthU.specMap.value = spec; earthU.norMap.value = nor; layerU.rockMap.value = rock;
  // object -> tunnel frame (for the wedge test)
  earthU.uQ.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(Q_E));
  earthMesh.quaternion.copy(Q_E); clouds.quaternion.copy(earthMesh.quaternion); atmo.quaternion.copy(earthMesh.quaternion);
}
