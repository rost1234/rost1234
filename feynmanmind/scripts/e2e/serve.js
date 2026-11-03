// Static server for the exported web app, with SPA fallback to index.html.
//   node serve.js <export dir> [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '../../dist');
const port = Number(process.argv[3] || 8123);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.json': 'application/json' };

http
  .createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  })
  .listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
