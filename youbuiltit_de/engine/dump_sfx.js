// node dump_sfx.js <page> <out.json>  -> writes window.SFX of the page (sound events on word times)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage();
  await p.goto(`http://localhost:${process.env.PORT || 8766}/engine/${process.argv[2]}`); await p.waitForFunction('window.__done === true', null, { timeout: 300000 });
  const s = await p.evaluate(() => window.SFX || null); if (s) fs.writeFileSync(process.argv[3], JSON.stringify(s)); console.log(s ? 'sfx events: ' + s.events.length : 'no SFX'); await b.close(); })();
