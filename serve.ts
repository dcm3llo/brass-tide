import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const root=resolve('game'),port=Number(process.env.PORT??8087);
const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
createServer((req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url??'/',`http://localhost:${port}`).pathname).replace(/\/$/,'/index.html'));if(!path.startsWith(root+sep))throw 0;if(!statSync(path).isFile())throw 0;res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`BRASS TIDE http://127.0.0.1:${port}`));
