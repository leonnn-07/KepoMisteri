// usage: node render/still.mjs page.html outprefix arg1 arg2 ...  -> calls window.shot(arg) and saves jpgs
import {createRequire} from 'node:module'; const {chromium}=createRequire(import.meta.url)('playwright'); import {serve} from './server.mjs'; import fs from 'node:fs';
const [page,out,...args]=process.argv.slice(2); const port=8200+Math.floor(Math.random()*500);
const srv=await serve(process.cwd(),port);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1920,height:1080}});p.on('console',m=>console.log('PAGE',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(`http://localhost:${port}/${page}`);await p.waitForFunction('window.READY||window.FAIL',null,{timeout:120000});
for(const a of args){const u=await p.evaluate(a=>window.shot(isNaN(+a)?a:+a),a); fs.writeFileSync(`${out}_${a}.jpg`,Buffer.from(u.split(',')[1],'base64'));}
await b.close();srv.close();
