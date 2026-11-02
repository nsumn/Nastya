const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  for (const s of process.argv.slice(2)) {
    await p.goto(`http://localhost:8765/index.html?s=${s}`);
    await p.waitForFunction('window.__done === true', null, { timeout: 240000 });
    await p.screenshot({ path: `out_${s}.png` });
    console.log('ok', s);
  }
  await b.close();
})();
