import { createRequire } from 'node:module'; import { serve } from './server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const srv = await serve(process.cwd(), 9950);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('http://localhost:9950/index.html', { waitUntil: 'commit', timeout: 0 });
await p.waitForFunction('window.READY || window.FAIL', null, { timeout: 0 });
for (const f of (process.argv[2] || '200,1977,3944').split(',').map(Number)) {
  await p.evaluate(f => window.renderFrame(f), f);
  console.log(f, JSON.stringify(await p.evaluate(f => window.PROF(f), f + 1)), JSON.stringify(await p.evaluate(f => window.PROF2(f), f + 1)));
}
await b.close(); srv.close();
