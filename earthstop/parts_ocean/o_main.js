// =================== timeline of scenes; neighbours dissolve over 0.9 s ===================
const SEGS = [['sea', 0], ['globe', GLOBE], ['river', RIVER], ['shop', STORE], ['ant', ICE], ['med', MED]];
const DIS = 0.9;
function renderScene(name, t, rt) {
  if (name === 'sea') { updateSea(t); seaCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(seaCam.fov * Math.PI / 360)); shootTo(rt, sea, seaCam); return 1.0; }
  if (name === 'globe' || name === 'med') { updateGlobe(t); globeCamera(t); shootTo(rt, space, spaceCam); return 1.05; }
  if (name === 'river') { updateRiver(t); riverCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(rivCam.fov * Math.PI / 360)); shootTo(rt, riv, rivCam); return 1.0; }
  if (name === 'shop') { updateShop(t); shopCamera(t); shootTo(rt, shop, shopCam); return 1.05; }
  if (name === 'ant') { updateAnt(t); antCamera(t); smokeMat.uniforms.uScale.value = H / (2 * Math.tan(antCam.fov * Math.PI / 360)); shootTo(rt, ant, antCam); return 1.0; }
}
// =================== DOM ===================
const $ = id => document.getElementById(id);
const el = Object.fromEntries(['title', 'stat', 'lab', 'val', 'sub', 'cap', 'flash', 'end', 'endT', 'endS', 'hud', 'veil'].map(k => [k, $(k)]));
const captions = [
  [4.3, 6.9, 'The sea pulls back<br>for miles.'],
  [7.0, 9.7, '400 feet down: you could walk<br>from Alaska to Russia.'],
  [10.3, 13.4, 'Hour 1: billions of fish,<br>stranded.'],
  [13.5, 16.7, 'The biggest US aquarium holds<br>1/32-trillionth of the ocean.'],
  [17.3, 19.9, 'Day 1: 112,500 cargo ships —<br>stuck.'],
  [20.0, 22.7, '80% of world trade moves by sea.<br>Store shelves go empty.'],
  [23.2, 26.1, "Surprise: the internet between continents<br>doesn't go through space…"],
  [26.2, 28.8, '…it runs through hundreds of cables<br>on the seafloor. Now you can walk on it.'],
  [29.3, 32.3, 'Left behind: about<br>200 feet of salt.'],
  [32.4, 35.7, 'Wind turns it into salt storms —<br>like the dried-up Aral Sea.'],
  [36.4, 39.4, 'Good news, Florida: no hurricanes —<br>they need 80°F ocean water.'],
  [39.5, 42.7, 'Bad news: no ocean, no clouds.<br>Scorching days, freezing nights.'],
  [43.4, 46.4, 'Rivers keep pouring<br>into the empty basins…'],
  [46.5, 49.7, '…until the rain stops.<br>86% of evaporation came from the ocean.'],
  [50.4, 52.6, 'Bottled water? It comes from springs<br>and taps — refilled by rain.'],
  [52.7, 54.7, 'Soon, water is worth<br>more than gold.'],
  [55.4, 57.6, "Ice holds about 69% of<br>Earth's fresh water…"],
  [57.7, 59.8, '…so Antarctica becomes the most<br>valuable place on Earth.'],
  [60.3, 63.0, 'It happened before: the Mediterranean dried up<br>~6 million years ago — then a flood refilled it.'],
];
function hudAt(t) { let stat = '', lab = '', val = '', sub = '', show = 1;
  if (t < RECEDE + 0.2 || t >= MED) show = 0;
  else if (t < SHIPS) { lab = 'SEA LEVEL'; val = '−' + fmt(-seaLevel(t) * 3.281) + ' ft'; sub = t < FISH ? 'THE OCEAN IS DRAINING' : 'FISH STRANDED: BILLIONS'; }
  else if (t < CABLES) { lab = 'CARGO SHIPS STUCK'; val = '112,500'; sub = '80% OF WORLD TRADE GOES BY SEA'; }
  else if (t < SALT) { lab = 'INTERNET CABLES ON THE SEAFLOOR'; val = '~900,000 mi'; sub = 'ALMOST ALL DATA BETWEEN CONTINENTS'; }
  else if (t < GLOBE) { stat = '<b></b>MODEL'; lab = 'SALT LEFT BEHIND'; val = '~200 ft'; sub = 'ON THE WHOLE SEAFLOOR'; }
  else if (t < RIVER) { lab = 'HURRICANES'; val = '0'; sub = t < 39.5 ? 'THEY NEED 80°F OCEAN WATER' : 'NO CLOUDS · DESERT TEMPERATURES'; }
  else if (t < STORE) { lab = 'EVAPORATION FROM THE OCEAN'; val = '86%'; sub = 'NOW GONE — RAIN MOSTLY STOPS'; }
  else if (t < ICE) { lab = 'BOTTLED WATER'; val = PRICES[Math.min(PRICES.length - 1, Math.floor(clamp((t - STORE) / (ICE - STORE), 0, 1) * PRICES.length * 1.05))]; sub = '55% SPRING WATER · 45% TAP WATER'; }
  else { lab = 'FRESH WATER IN ICE'; val = '~69%'; sub = 'USGS'; }
  return { stat, lab, val, sub, show }; }
function updateDOM(t) {
  el.title.style.opacity = 1 - smooth(3.3, 3.9, t);
  const h = hudAt(t); el.stat.innerHTML = h.stat; el.lab.textContent = h.lab; el.val.textContent = h.val; el.sub.textContent = h.sub; el.hud.style.opacity = h.show * (1 - smooth(T_END, T_END + 0.4, t));
  const c = captions.find(([a, b]) => t >= a && t < b); el.cap.innerHTML = c ? c[2] : ''; el.cap.style.opacity = c ? fadeWin(t, c[0], c[1], 0.25) : 0;
  el.end.style.opacity = smooth(T_END, T_END + 0.5, t); el.endT.style.opacity = smooth(T_END + 0.4, T_END + 0.9, t); el.endS.style.opacity = smooth(T_END + 0.8, T_END + 1.3, t);
}
// =================== render ===================
window.renderAt = (t) => {
  let i = 0; for (let k = 0; k < SEGS.length; k++) if (t >= SEGS[k][1]) i = k;
  let mix = 0, j = -1;
  if (i + 1 < SEGS.length && t > SEGS[i + 1][1] - DIS / 2) { j = i + 1; mix = smooth(SEGS[j][1] - DIS / 2, SEGS[j][1] + DIS / 2, t); }
  else if (i > 0 && t < SEGS[i][1] + DIS / 2) { j = i - 1; mix = 1 - smooth(SEGS[i][1] - DIS / 2, SEGS[i][1] + DIS / 2, t); }
  const ea = renderScene(SEGS[i][0], t, RTA); let eb = 1;
  if (j >= 0 && mix > 0.001) eb = renderScene(SEGS[j][0], t, RTB);
  composite(j >= 0 ? mix : 0, ea, eb);
  updateDOM(t); return true;
};
window.sceneReady = (async () => { await document.fonts.ready; await buildGlobe(); window.renderAt(0); return true; })();
