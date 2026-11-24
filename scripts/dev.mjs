import http from 'node:http';
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

await build();

// Watch content/ and src/ for live rebuilds
let rebuildTimer = null;
for (const dir of ['content', 'src', 'public']) {
  const full = path.join(ROOT, dir);
  try {
    watch(full, { recursive: true }, () => {
      clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(() => {
        build().catch((err) => console.error('Rebuild failed:', err));
      }, 120);
    });
  } catch {
    // Ignore watch errors on unsupported platforms
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    let pathname = decodeURIComponent(reqUrl.pathname);
    let filePath = path.join(DIST, pathname);

    let stat = null;
    try {
      stat = await fs.stat(filePath);
    } catch {
      stat = null;
    }

    if (stat?.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    } else if (!stat && !path.extname(filePath)) {
      filePath = path.join(filePath, 'index.html');
    }

    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const notFound = await fs.readFile(path.join(DIST, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(notFound);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Preview server running at http://127.0.0.1:${PORT}/`);
});
