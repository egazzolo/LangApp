import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function createActivityLibraryServer(root = path.resolve('dist-activity-library')) {
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data: blob:; font-src 'self' data:; frame-src blob:; object-src 'none'; base-uri 'self'; form-action 'self'");
    try {
      if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
      const url=new URL(req.url,'http://localhost');
      let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
      if(url.pathname==='/'){res.writeHead(302,{Location:'/admin/activity-library'});res.end();return;}
      if(!path.extname(file))file+='.html';
      const info=await stat(file);if(!info.isFile())throw Error('not_file');
      const type=({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json'})[path.extname(file)]??'application/octet-stream';
      res.setHeader('Content-Type',type);
      res.end(req.method==='HEAD'?undefined:await readFile(file));
    }catch{res.writeHead(404);res.end('Not found. Build the PC library with npm run build:activity-library.');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.ACTIVITY_LIBRARY_PORT??8085);
  const server=createActivityLibraryServer();
  server.listen(port,'127.0.0.1',()=>console.log('PC Activity Library: http://localhost:'+port+'/admin/activity-library'));
}
