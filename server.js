import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/game.js':'game.js','/engine.js':'engine.js','/effects.js':'effects.js','/effects-plan.js':'effects-plan.js'};
const mime = {html:'text/html',css:'text/css',js:'text/javascript'};
http.createServer(async (req,res) => {
  const file = files[new URL(req.url,'http://localhost').pathname];
  if (!file) {res.writeHead(404);res.end('Not found');return;}
  try {res.setHeader('Content-Type',mime[file.split('.').pop()]+'; charset=utf-8');res.end(await readFile(new URL(file,import.meta.url)));} catch {res.writeHead(500);res.end('Unable to load game');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',() => console.log('POP! running at http://localhost:3000'));
