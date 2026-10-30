// =================== US MAP AT NIGHT: city lights from the zombie video's raster (zmap.bin: b = lights, a = relief shade), going dark region by region ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#04060c');
const mapCam = new THREE.PerspectiveCamera(30, W / H, 5, 9000);
const MW = 975, MH = 610;
const lightsMat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: null }, uOff: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D uTex; uniform float uOff, uT; varying vec3 vW; varying vec3 vN;
    float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    void main(){ vec2 uv=vec2((vW.x+${(MW / 2).toFixed(1)})/${MW.toFixed(1)}, 1.0-(vW.z+${(MH / 2).toFixed(1)})/${MH.toFixed(1)}); vec4 tx=texture2D(uTex,uv);
      float lit=tx.b, shade=tx.a; vec3 base=mix(vec3(0.05,0.065,0.1),vec3(0.09,0.11,0.16),shade);
      vec2 cell=floor(uv*vec2(26.0,16.0)); float when=0.08+0.84*h21(cell);          // each region's plants trip at a different moment
      float on=1.0-smoothstep(when-0.03,when+0.03,uOff);
      float flick=step(0.5,fract(sin(dot(cell,vec2(12.9,78.2))+uT*31.0)*43758.5)); on*=mix(1.0,0.4+0.6*flick,smoothstep(when-0.08,when-0.02,uOff)*(1.0-smoothstep(when-0.02,when,uOff)));
      vec3 col=base+vec3(1.0,0.78,0.42)*pow(lit,2.2)*1.6*on;
      if(vN.y<0.5) col=vec3(0.03,0.04,0.06);
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
async function buildMap() {
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii', 'Puerto Rico'].includes(g.properties.name));
  const info = await (await fetch('zmap.json')).json(), bin = new Uint8Array(await (await fetch('zmap.bin')).arrayBuffer());
  const tex = new THREE.DataTexture(bin, info.GW, info.GH, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; lightsMat.uniforms.uTex.value = tex;
  const merged = topojson.merge(topo, L48), shapes = [];
  for (const poly of merged.coordinates) { const o = poly[0]; if (o.length < 8) continue; const sh = new THREE.Shape(o.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))));
    for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))))); shapes.push(sh); }
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 }); g.rotateX(-Math.PI / 2); mapScene.add(new THREE.Mesh(g, lightsMat));
  const ms = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b), pts = [];
  for (const line of ms.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; pts.push(a[0] - MW / 2, 10.4, a[1] - MH / 2, b[0] - MW / 2, 10.4, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); mapScene.add(new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#3a4258', transparent: true, opacity: 0.6 }))); }
