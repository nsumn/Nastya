// Render test stills:  node clay/still.js <outDir> [shot1,shot2,...]
// Serves tiktok_de/ on a local port and screenshots clay/index.html?shot=<name> with software WebGL.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.json': 'application/json', '.png': 'image/png' };

(async () => {
  const out = path.resolve(process.argv[2] || 'out/clay');
  const names = (process.argv[3] || 'sofa,kitchen,bed,close,stairs,street').split(',');
  fs.mkdirSync(out, { recursive: true });
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const n of names) {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on('pageerror', e => console.log(n, 'ERR', e.message));
    await p.goto(`http://localhost:${port}/clay/index.html?shot=${n}`);
    await p.waitForFunction(() => window.DONE, null, { timeout: 180000 });
    await p.screenshot({ path: path.join(out, `${n}.png`) }); await p.close();
    console.log('ok', n);
  }
  await b.close(); srv.close();
})();
