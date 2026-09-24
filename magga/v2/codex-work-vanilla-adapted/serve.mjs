#!/usr/bin/env node
// Local static server. Node.js 22+, no package installation or network required.
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function serve(root, { port = 4173, host = '127.0.0.1', base = '/' } = {}) {
  root = path.resolve(root); base = '/' + base.replace(/^\/+|\/+$/g, ''); if (base !== '/') base += '/';
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8' };
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end('Method not allowed'); }
      const url = new URL(req.url, 'http://localhost');
      if (base !== '/' && url.pathname === base.slice(0, -1)) { res.writeHead(302, { Location: base }); return res.end(); }
      if (!url.pathname.startsWith(base)) { res.writeHead(404); return res.end('Not found'); }
      let file = path.resolve(root, './' + decodeURIComponent(url.pathname.slice(base.length)));
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
      if ((await stat(file)).isDirectory()) {
        if (!url.pathname.endsWith('/')) { res.writeHead(302, { Location: url.pathname + '/' + url.search }); return res.end(); }
        file = path.join(file, 'index.html');
      }
      const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }); res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
  });
  server.listen(port, host, () => console.log(`Second Wind ready: http://${host}:${server.address().port}${base}`));
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = flag => process.argv[process.argv.indexOf(flag) + 1];
  const root = process.argv.includes('--root') ? value('--root') : fileURLToPath(new URL('.', import.meta.url));
  const server = serve(root, { port: Number(process.env.PORT || 4173), host: process.env.HOST || '127.0.0.1', base: process.argv.includes('--base') ? value('--base') : '/' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
