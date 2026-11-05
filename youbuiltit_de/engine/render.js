// node render.js stills 1,5,12      -> frames/still_<t>.jpg
// node render.js video out.mp4 [fps] [from] [to]  -> mp4 (no audio) streamed into ffmpeg
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const PORT = process.env.PORT || 8766;
(async () => {
  const [mode, a1, a2, a3, a4] = process.argv.slice(2);
  // GPU=1 uses the machine's real video card through ANGLE/D3D11 (Windows) instead of software SwiftShader.
  const args = process.env.GPU === '1'
    ? ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const b = await chromium.launch({ channel: process.env.GPU === '1' ? 'chromium' : undefined, args });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto(`http://localhost:${PORT}/engine/${process.env.PAGE || 'index_keller.html'}`);
  await p.waitForFunction('window.__done === true', null, { timeout: 300000 });
  fs.mkdirSync('frames', { recursive: true });
  const grab = async t => Buffer.from((await p.evaluate(t => window.renderAt(t), t)).split(',')[1], 'base64');
  if (mode === 'stills') {
    for (const t of a1.split(',').map(Number)) { const t0 = Date.now(); fs.writeFileSync(`frames/still_${t}.jpg`, await grab(t)); console.log('still', t, Date.now() - t0, 'ms'); }
  } else {
    const fps = +(a2 || 30), end = await p.evaluate(() => window.END), from = +(a3 || 0), to = +(a4 || end);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', a1], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((to - from) * fps), t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const buf = await grab(from + i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000 / (i + 1)).toFixed(2)} s/frame`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
