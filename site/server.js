const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

function parseCookies(header) {
  const result = {};
  if (!header) return result;
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    result[key] = decodeURIComponent(val);
  }
  return result;
}

function generateId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const buf = crypto.randomBytes(16);
  // Format as UUID v4-like
  buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // variant
  const hex = buf.toString('hex');
  return (
    hex.substring(0, 8) + '-' +
    hex.substring(8, 12) + '-' +
    hex.substring(12, 16) + '-' +
    hex.substring(16, 20) + '-' +
    hex.substring(20)
  );
}

function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { users: {} };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default: return 'application/octet-stream';
  }
}

function setCookieHeader(id, maxAgeSeconds) {
  const attrs = [
    `user_id=${encodeURIComponent(id)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  // For local HTTP development, do not set Secure. In prod add 'Secure'.
  return attrs.join('; ');
}

function sendJSON(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html')
                                 : path.join(PUBLIC_DIR, pathname);
  // Prevent path traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentTypeFor(resolved) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);
  if (!pathname) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  if (req.method === 'GET' && pathname === '/me') {
    const cookies = parseCookies(req.headers['cookie']);
    let id = cookies['user_id'];
    const now = new Date().toISOString();
    const db = readDB();
    let setCookie = null;

    if (!id) {
      id = generateId();
      setCookie = setCookieHeader(id, 60 * 60 * 24 * 365); // 1 year
      db.users[id] = { id, created_at: now, last_seen: now };
    } else {
      if (!db.users[id]) {
        db.users[id] = { id, created_at: now, last_seen: now };
      } else {
        db.users[id].last_seen = now;
      }
    }
    writeDB(db);
    const headers = setCookie ? { 'Set-Cookie': setCookie } : {};
    return sendJSON(res, 200, { id }, headers);
  }

  if (req.method === 'POST' && pathname === '/reset') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const cookies = parseCookies(req.headers['cookie']);
      const id = cookies['user_id'];
      const db = readDB();
      if (id && db.users[id]) {
        delete db.users[id];
        writeDB(db);
      }
      const clear = setCookieHeader('', 0);
      sendJSON(res, 200, { ok: true }, { 'Set-Cookie': clear });
    });
    return;
  }

  // Static files
  if (req.method === 'GET') {
    return serveStatic(req, res, pathname);
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`zero-auth local server running at http://${HOST}:${PORT}`);
});

