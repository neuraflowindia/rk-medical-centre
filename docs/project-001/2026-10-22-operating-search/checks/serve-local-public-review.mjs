import http from 'node:http';import {readFileSync,statSync} from 'node:fs';import {resolve,extname} from 'node:path';
const dist=resolve(process.argv[2]);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
http.createServer((request,response)=>{if(!['GET','HEAD'].includes(request.method)){response.writeHead(405).end();return;}const manifest=JSON.parse(readFileSync(resolve(dist,'appointment-surface-manifest.json')));const url=new URL(request.url,'http://localhost'),mode=request.headers.cookie?.includes('clinic_qa_mode=on')?'on':'off';let path;
try{path=decodeURIComponent(url.pathname);}catch{response.writeHead(400).end();return;}
if(manifest.public_paths.includes(path)||path==='/sitemap.xml')path='/__booking_display/'+mode+(path==='/'?'/index.html':path==='/sitemap.xml'?path:path+'.html');
else if(manifest.booking_paths.includes(path)){if(mode==='off'){response.writeHead(404).end('Page not found');return;}path='/__booking_display/on'+path+'.html';}
else if(!Object.hasOwn(manifest.assets,path)){response.writeHead(404).end('Page not found');return;}
const target=resolve(dist,'.'+path);if(!target.startsWith(dist+'/')){response.writeHead(404).end();return;}
try{if(!statSync(target).isFile())throw Error();response.writeHead(200,{'content-type':types[extname(target)]||'application/octet-stream','cache-control':'no-store'}).end(readFileSync(target));}catch{response.writeHead(404).end('Page not found');}
}).listen(Number(process.argv[3]||4251),'127.0.0.1',()=>console.log('Local generated-page review ready; synthetic mode only.'));
