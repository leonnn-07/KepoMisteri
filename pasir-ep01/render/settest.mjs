import {createRequire} from 'node:module'; const {chromium}=createRequire(import.meta.url)('playwright'); import {serve} from './server.mjs'; import fs from 'node:fs';
const [set,out,camsFile]=process.argv.slice(2); const cams=JSON.parse(fs.readFileSync(camsFile,'utf8')); const port=8700+Math.floor(Math.random()*200);
const srv=await serve(process.cwd(),port);
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1920,height:1080}});p.on('console',m=>console.log('PAGE',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
const qs=cams.map((c,i)=>`c${i}=${encodeURIComponent(JSON.stringify(c))}`).join('&');
await p.goto(`http://localhost:${port}/render/settest.html?set=${set}&${qs}`);await p.waitForFunction('window.READY||window.FAIL',null,{timeout:180000});
for(let i=0;i<cams.length;i++){const u=await p.evaluate(a=>window.shot(a),i); fs.writeFileSync(`${out}_${i}.jpg`,Buffer.from(u.split(',')[1],'base64'));}
await b.close();srv.close();
