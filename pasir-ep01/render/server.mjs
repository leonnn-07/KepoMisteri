import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
export function serve(root,port){return new Promise(res=>{const s=http.createServer((q,a)=>{const p=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){a.writeHead(404);a.end();return;}a.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});a.end(d);});});s.listen(port,()=>res(s));});}
