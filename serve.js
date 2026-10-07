// Крошечный сервер для просмотра сайта: node serve.js  →  http://localhost:5178
const http=require('http'),fs=require('fs'),path=require('path');
const T={'.html':'text/html;charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.css':'text/css','.js':'text/javascript','.md':'text/plain;charset=utf-8'};
http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html';
  const f=path.join(__dirname,p);
  if(!f.startsWith(__dirname)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('нет файла')}
  r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);
}).listen(5178,()=>console.log('http://localhost:5178'));
