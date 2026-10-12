
// =================== US MAP (Albers USA units, 975 x 610; x right, y = 610 - albersY) ===================
const mapScene = new THREE.Scene(); mapScene.background = new THREE.Color('#05070d');
const mapCam = new THREE.PerspectiveCamera(36, W / H, 1, 6000);
mapScene.add(new THREE.HemisphereLight(0x9fb0d0, 0x101018, 0.9));
const mapKey = new THREE.DirectionalLight(0xc8d4ff, 1.2); mapKey.position.set(-300, 900, 700); mapScene.add(mapKey);
// approximate 2020 state population (millions) and land area (thousand sq mi) — used only for the rural density floor
const STATES = { Alabama: [5.0, 50.6], Alaska: [0.73, 571], Arizona: [7.2, 113.6], Arkansas: [3.0, 52.0], California: [39.5, 155.8], Colorado: [5.8, 103.6], Connecticut: [3.6, 4.8], Delaware: [1.0, 1.9], 'District of Columbia': [0.69, 0.06], Florida: [21.5, 53.6], Georgia: [10.7, 57.5], Hawaii: [1.46, 6.4], Idaho: [1.8, 82.6], Illinois: [12.8, 55.5], Indiana: [6.8, 35.8], Iowa: [3.2, 55.9], Kansas: [2.9, 81.8], Kentucky: [4.5, 39.5], Louisiana: [4.7, 43.2], Maine: [1.4, 30.8], Maryland: [6.2, 9.7], Massachusetts: [7.0, 7.8], Michigan: [10.1, 56.5], Minnesota: [5.7, 79.6], Mississippi: [3.0, 46.9], Missouri: [6.2, 68.7], Montana: [1.1, 145.5], Nebraska: [2.0, 76.8], Nevada: [3.1, 109.8], 'New Hampshire': [1.4, 8.95], 'New Jersey': [9.3, 7.4], 'New Mexico': [2.1, 121.3], 'New York': [20.2, 47.1], 'North Carolina': [10.4, 48.6], 'North Dakota': [0.78, 69.0], Ohio: [11.8, 40.9], Oklahoma: [4.0, 68.6], Oregon: [4.2, 95.9], Pennsylvania: [13.0, 44.7], 'Rhode Island': [1.1, 1.0], 'South Carolina': [5.1, 30.1], 'South Dakota': [0.89, 75.8], Tennessee: [6.9, 41.2], Texas: [29.1, 261.2], Utah: [3.3, 82.2], Vermont: [0.64, 9.2], Virginia: [8.6, 39.5], Washington: [7.7, 66.5], 'West Virginia': [1.8, 24.0], Wisconsin: [5.9, 54.2], Wyoming: [0.58, 97.1] };
// metro areas: [name, lat, lon, population (millions, approx.)]
const METROS = [['New York', 40.71, -74.0, 19.8], ['Los Angeles', 34.05, -118.24, 13.2], ['Chicago', 41.88, -87.63, 9.6], ['Dallas', 32.78, -96.8, 7.6], ['Houston', 29.76, -95.37, 7.1], ['Washington', 38.9, -77.04, 6.4], ['Philadelphia', 39.95, -75.17, 6.2], ['Miami', 25.76, -80.19, 6.1], ['Atlanta', 33.75, -84.39, 6.1], ['Boston', 42.36, -71.06, 4.9], ['Phoenix', 33.45, -112.07, 4.8], ['San Francisco', 37.77, -122.42, 4.7], ['Riverside', 33.95, -117.4, 4.6], ['Detroit', 42.33, -83.05, 4.4], ['Seattle', 47.61, -122.33, 4.0], ['Minneapolis', 44.98, -93.27, 3.7], ['San Diego', 32.72, -117.16, 3.3], ['Tampa', 27.95, -82.46, 3.2], ['Denver', 39.74, -104.99, 3.0], ['Baltimore', 39.29, -76.61, 2.8], ['St. Louis', 38.63, -90.2, 2.8], ['Orlando', 28.54, -81.38, 2.7], ['Charlotte', 35.23, -80.84, 2.7], ['San Antonio', 29.42, -98.49, 2.6], ['Portland', 45.52, -122.68, 2.5], ['Sacramento', 38.58, -121.49, 2.4], ['Pittsburgh', 40.44, -79.99, 2.4], ['Austin', 30.27, -97.74, 2.3], ['Las Vegas', 36.17, -115.14, 2.3], ['Cincinnati', 39.1, -84.51, 2.3], ['Kansas City', 39.1, -94.58, 2.2], ['Columbus', 39.96, -83.0, 2.1], ['Indianapolis', 39.77, -86.16, 2.1], ['Cleveland', 41.5, -81.69, 2.1], ['San Jose', 37.34, -121.89, 2.0], ['Nashville', 36.16, -86.78, 2.0], ['Virginia Beach', 36.85, -75.98, 1.8], ['Providence', 41.82, -71.41, 1.7], ['Jacksonville', 30.33, -81.66, 1.6], ['Milwaukee', 43.04, -87.91, 1.6], ['Raleigh', 35.78, -78.64, 1.4], ['Oklahoma City', 35.47, -97.52, 1.4], ['Memphis', 35.15, -90.05, 1.3], ['Richmond', 37.54, -77.44, 1.3], ['Louisville', 38.25, -85.76, 1.3], ['New Orleans', 29.95, -90.07, 1.3], ['Salt Lake City', 40.76, -111.89, 1.3], ['Hartford', 41.76, -72.67, 1.2], ['Buffalo', 42.89, -78.88, 1.2], ['Birmingham', 33.52, -86.8, 1.1], ['Rochester', 43.16, -77.61, 1.1], ['Grand Rapids', 42.96, -85.67, 1.1], ['Tucson', 32.22, -110.97, 1.0], ['Honolulu', 21.31, -157.86, 1.0], ['Tulsa', 36.15, -95.99, 1.0], ['Fresno', 36.74, -119.79, 1.0], ['Omaha', 41.26, -95.94, 0.97], ['Albuquerque', 35.08, -106.65, 0.92], ['El Paso', 31.76, -106.49, 0.87], ['Boise', 43.62, -116.2, 0.76], ['Spokane', 47.66, -117.43, 0.59], ['Anchorage', 61.22, -149.9, 0.4], ['Billings', 45.78, -108.5, 0.18], ['Missoula', 46.87, -113.99, 0.12], ['Cheyenne', 41.14, -104.82, 0.1],
  ['Des Moines', 41.59, -93.62, 0.7], ['Little Rock', 34.75, -92.29, 0.75], ['Wichita', 37.69, -97.34, 0.65], ['Knoxville', 35.96, -83.92, 0.88], ['Albany', 42.65, -73.75, 0.9], ['Charleston', 32.78, -79.93, 0.8], ['Madison', 43.07, -89.4, 0.68], ['Jackson', 32.3, -90.18, 0.59], ['Fargo', 46.88, -96.79, 0.25], ['Sioux Falls', 43.55, -96.73, 0.28], ['Reno', 39.53, -119.81, 0.49], ['Bismarck', 46.81, -100.78, 0.13], ['Rapid City', 44.08, -103.23, 0.14], ['Portland ME', 43.66, -70.26, 0.55]];
const MW = 975, MH = 610, GS = 2, GW = Math.ceil(MW / GS), GH = Math.ceil(MH / GS);
let arrivalTex, landTex, mapSlab, mapTop, borderLines, metroPts = [], arrival, cellPop, rockiesMask, popTotal = 0, infCurve = [];
const toMap = (x, y) => new THREE.Vector3(x - MW / 2, 0, y - MH / 2);   // albers (x, y-down) -> map plane (x, z)
async function buildMap() {
  // the spread itself is precomputed offline (tools/zombie_map.mjs -> zmap.bin / zmap.json)
  const topo = await (await fetch('node_modules/us-atlas/states-albers-10m.json')).json();
  const L48 = topo.objects.states.geometries.filter(g => !['Alaska', 'Hawaii'].includes(g.properties.name));
  const info = await (await fetch('zmap.json')).json();
  const bin = new Uint8Array(await (await fetch('zmap.bin')).arrayBuffer());
  infCurve = info.curve;
  arrivalTex = new THREE.DataTexture(bin, info.GW, info.GH, THREE.RGBAFormat); arrivalTex.magFilter = THREE.LinearFilter; arrivalTex.minFilter = THREE.LinearFilter; arrivalTex.needsUpdate = true;
  // slab: lower-48 outline extruded
  const merged = topojson.merge(topo, L48);
  const shapes = [];
  for (const poly of merged.coordinates) {
    const outer = poly[0]; if (outer.length < 8) continue;
    const sh = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2))));
    for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x - MW / 2, -(y - MH / 2)))));
    shapes.push(sh);
  }
  const slabGeo = new THREE.ExtrudeGeometry(shapes, { depth: 10, bevelEnabled: false, curveSegments: 1 });
  slabGeo.rotateX(-Math.PI / 2);
  mapSlab = new THREE.Mesh(slabGeo, mapMat); mapScene.add(mapSlab);
  // state borders (interior only)
  const mesh = topojson.mesh(topo, { type: 'GeometryCollection', geometries: L48 }, (a, b) => a !== b);
  const pts = []; for (const line of mesh.coordinates) for (let i = 0; i < line.length - 1; i++) { const a = line[i], b = line[i + 1]; pts.push(a[0] - MW / 2, 10.3, a[1] - MH / 2, b[0] - MW / 2, 10.3, b[1] - MH / 2); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  borderLines = new THREE.LineSegments(bg, new THREE.LineBasicMaterial({ color: '#8a94b0', transparent: true, opacity: 0.5 })); mapScene.add(borderLines);
  metroPts = info.metros.filter(m => !['Honolulu', 'Anchorage'].includes(m.n));
}
const mapMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: null }, uDay: { value: 0 }, uTime: { value: 0 } },
  vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform sampler2D uTex; uniform float uDay, uTime; varying vec3 vW; varying vec3 vN;
    void main(){
      vec2 uv=vec2((vW.x+${(MW / 2).toFixed(1)})/${MW.toFixed(1)}, 1.0-(vW.z+${(MH / 2).toFixed(1)})/${MH.toFixed(1)});
      vec4 tx=texture2D(uTex,uv);
      float arr=exp(tx.r*log(401.0))-1.0;
      float lit=tx.b; float shade=tx.a;
      vec3 base=mix(vec3(0.06,0.08,0.12),vec3(0.10,0.13,0.18),shade);
      vec3 col=base+vec3(1.0,0.78,0.42)*pow(lit,2.2)*1.4;                 // city lights
      float inf=smoothstep(arr-0.15,arr+0.15,uDay);
      vec3 zc=mix(vec3(0.25,0.03,0.03),vec3(0.55,0.06,0.04),shade)+vec3(1.0,0.12,0.06)*pow(lit,2.0)*1.6;
      col=mix(col,zc,inf);
      float front=exp(-abs(uDay-arr)/max(0.6,0.12*uDay))*(1.0-step(uDay,arr-3.0));
      col+=vec3(1.0,0.35,0.1)*front*0.9*(0.85+0.15*sin(uTime*9.0));
      if(vN.y<0.5) col=vec3(0.04,0.05,0.07)+inf*vec3(0.12,0.0,0.0);
      gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
// glow sprites for the biggest metros (they flare red when they fall)
const beaconTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const beacons = [];
function buildBeacons() { for (const m of metroPts) { if (m.pop < 1.2) continue; m.k = 0; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: beaconTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: '#ffd28a' })); s.position.copy(toMap(m.x * GS, m.y * GS)).setY(14); s.scale.setScalar(6 + 2.5 * Math.sqrt(m.pop)); mapScene.add(s); beacons.push({ s, m }); } }
function dayAt(t) { return linKey([[MAP, 0], [CITIES, 1.2], [RURAL, 8], [ROCKIES, 60], [BACKMAP, 120], [T_END, 160]], t, x => x); }
function infectedFrac(day) { if (!infCurve.length) return 0; const i = clamp(day * 2, 0, infCurve.length - 1); const i0 = Math.floor(i); return lerp(infCurve[i0], infCurve[Math.min(i0 + 1, infCurve.length - 1)], i - i0); }
