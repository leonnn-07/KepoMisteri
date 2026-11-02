// Headless renderer: drives index.html in Chromium (SwiftShader WebGL) and pipes frames into ffmpeg.
// usage:
//   node render/render.mjs --range 0:5850 --out output/parts/p0.mp4
//   node render/render.mjs --stills 30,300,900 --outdir /tmp/stills
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
import { serve } from './server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const port = 9000 + Math.floor(Math.random() * 900);
const srv = await serve(process.cwd(), port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'commit', timeout: 0 });
await page.waitForFunction('window.READY || window.FAIL', null, { timeout: 600000 });
if (await page.evaluate('window.FAIL')) { console.error('init failed'); process.exit(1); }
const total = await page.evaluate('window.TOTAL_FRAMES');
const grab = async (f) => Buffer.from((await page.evaluate(f => window.renderFrame(f), f)).split(',')[1], 'base64');
if (args.stills) {
  fs.mkdirSync(args.outdir, { recursive: true });
  for (const f of args.stills.split(',').map(Number)) { fs.writeFileSync(path.join(args.outdir, `f${String(f).padStart(5, '0')}.jpg`), await grab(f)); }
} else {
  const [a, b] = (args.range || `0:${total}`).split(':').map(Number);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', '30', args.out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    const buf = await grab(f);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 60 === 0) console.log(`frame ${f}/${b} ${(((Date.now() - t0) / 1000) / Math.max(1, f - a + 1)).toFixed(2)}s/f`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('done', args.out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await browser.close(); srv.close();
