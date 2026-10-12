// Renders frames: PAGE=index_x.html node render.mjs <outDir> <tStart> <tEnd> 30 [comma-separated test times]
// PASS=text → text-only transparent PNGs; no PASS → everything in JPEGs.
// GL backend (env GL):
//   llvmpipe    — Mesa software GL, needs an X display (setup.sh starts Xvfb :99, found automatically). Default when a display exists.
//   swiftshader — Chromium's built-in software GL, works everywhere, ~10–20% slower.
//   gpu         — a real graphics card (Mac/PC), many times faster.
import fs from 'fs';

let chromium;
for (const p of ['playwright', '/opt/node-tools/node_modules/playwright/index.mjs', '/opt/npm-tools/node_modules/playwright/index.mjs']) {
  try { ({ chromium } = await import(p)); break; } catch {}
}
if (!chromium) throw new Error('Playwright not found: npm i -g playwright, or fix the paths at the top of render.mjs');

const [, , outDir, tStart = '0', tEnd = '16', fpsArg = '30', only] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
// Xvfb started by setup.sh lives on :99 — pick it up even if DISPLAY was not exported in this shell
if (!process.env.DISPLAY && fs.existsSync('/tmp/.X11-unix/X99')) process.env.DISPLAY = ':99';
const GL = process.env.GL || (process.env.DISPLAY ? 'llvmpipe' : 'swiftshader');
const glArgs = {
  swiftshader: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  llvmpipe: ['--use-gl=angle', '--use-angle=gl'],
  gpu: process.platform === 'darwin' ? ['--use-angle=metal'] : process.platform === 'win32' ? ['--use-angle=d3d11'] : ['--use-angle=gl'],
}[GL];
const browser = await chromium.launch({ headless: GL !== 'gpu' || process.env.HEADLESS === '1', args: [...glArgs, '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => { const s = m.text(); if (!/GL Driver Message|GroupMarkerNotSet/.test(s)) console.log('[page]', s); });
page.on('pageerror', e => console.log('[err]', e.message));
const PASS = process.env.PASS || '';
await page.goto('http://127.0.0.1:8765/' + (process.env.PAGE || 'index.html') + (PASS ? '?pass=' + PASS : ''));
await page.waitForFunction(() => window.sceneReady !== undefined);
await page.evaluate(() => window.sceneReady);
const renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; });
console.log(`GL=${GL}: ${renderer}`);
if (GL === 'llvmpipe' && !/llvmpipe/.test(renderer)) console.log('WARNING: llvmpipe not active (is Xvfb running and DISPLAY=:99 set?) — rendering is slower');
const fps = +fpsArg;
const times = only ? only.split(',').map(Number) : null;
const list = times || Array.from({ length: Math.round((+tEnd - +tStart) * fps) }, (_, i) => +tStart + i / fps);
let n = 0; const t0 = Date.now();
for (const t of list) {
  await page.evaluate(t => window.renderAt(t), t);
  if (PASS === 'text') await page.screenshot({ path: `${outDir}/f_${String(n).padStart(5, '0')}.png`, type: 'png', omitBackground: true });
  else await page.screenshot({ path: `${outDir}/f_${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
  n++;
  if (n % 30 === 0) console.log(`frame ${n}/${list.length}  ${((Date.now() - t0) / n).toFixed(0)} ms/frame`);
}
await browser.close();
console.log('done', n, `${((Date.now() - t0) / 1000).toFixed(0)} s`);
