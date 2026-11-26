#!/usr/bin/env node
/* =====================================================================
 * VivuGo – máy chủ nhỏ để chạy thử và LƯU ĐẶT CHỖ RA FILE data/bookings.json
 *
 *   node server.js            (hoặc: npm start)   ->  http://localhost:3000
 *
 * Không cần cài thư viện nào, chỉ cần Node.js 14 trở lên.
 *
 *  - Phục vụ cả website (HTML/CSS/JS/ảnh) như một máy chủ tĩnh.
 *  - API:  GET  /api/bookings?user=<email>   lấy đặt chỗ của một tài khoản
 *          POST /api/bookings                lưu / cập nhật (1 đặt chỗ, mảng, hoặc {bookings:[...]})
 *  - Mỗi đặt chỗ được kiểm tra bằng đúng hàm của js/bookings.js trước khi ghi.
 *
 * Biến môi trường (tuỳ chọn): PORT, HOST (mặc định 127.0.0.1: chỉ máy bạn truy cập được),
 * BOOKINGS_FILE (đổi đường dẫn file lưu).
 *
 * LƯU Ý: dự án chưa có đăng nhập thật (tài khoản nằm trong trình duyệt), nên máy chủ này
 * chỉ dành cho chạy thử / demo, không dùng để public ra Internet.
 * ===================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { sanitize, VERSION } = require('./js/bookings.js');

const ROOT = __dirname;
const DATA_FILE = path.resolve(process.env.BOOKINGS_FILE || path.join(ROOT, 'data', 'bookings.json'));
const MAX_BODY = 1024 * 1024;       // 1 MB mỗi yêu cầu
const MAX_PER_REQUEST = 200;
const MAX_TOTAL = 20000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.htm': 'text/html; charset=utf-8'
};
// Không phục vụ các file này qua đường tĩnh
const HIDDEN_FILES = new Set(['/server.js', '/package.json', '/package-lock.json']);

/* ---------------------------------------------------------------
 * Kho file JSON: đọc, ghi nguyên tử (ghi file tạm rồi đổi tên), xếp hàng để không ghi chồng nhau
 * ------------------------------------------------------------- */
let chain = Promise.resolve();
function locked(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function readStore() {
  let raw;
  try { raw = await fs.promises.readFile(DATA_FILE, 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return { version: VERSION, bookings: [] }; throw e; }
  try {
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : data.bookings;
    if (!Array.isArray(list)) throw new Error('thiếu mảng bookings');
    return { version: VERSION, bookings: list.map(b => { const r = sanitize(b); return r.ok ? r.value : null; }).filter(Boolean) };
  } catch (e) {
    // File hỏng (ví dụ sửa tay sai cú pháp): giữ lại bản sao để không mất dữ liệu, rồi bắt đầu file mới
    const backup = DATA_FILE.replace(/\.json$/, '') + '.corrupt-' + Date.now() + '.json';
    await fs.promises.rename(DATA_FILE, backup);
    console.warn('! ' + path.basename(DATA_FILE) + ' bị lỗi (' + e.message + '). Đã đổi tên thành ' + path.basename(backup));
    return { version: VERSION, bookings: [] };
  }
}

async function writeStore(store) {
  await fs.promises.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  await fs.promises.writeFile(tmp, JSON.stringify(store, null, 2) + '\n', 'utf8');
  await fs.promises.rename(tmp, DATA_FILE);
}

// Trả về 'added' | 'updated' | 'stale' | 'conflict'
function upsert(store, rec) {
  const i = store.bookings.findIndex(b => b.id === rec.id);
  if (i < 0) { store.bookings.push(rec); return 'added'; }
  const cur = store.bookings[i];
  if (cur.userEmail !== rec.userEmail) return 'conflict';      // không cho ghi đè đặt chỗ của tài khoản khác
  if (rec.updatedAt >= cur.updatedAt) { store.bookings[i] = rec; return 'updated'; }
  return 'stale';
}

/* ---------------------------------------------------------------
 * API
 * ------------------------------------------------------------- */
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Content-Length': Buffer.byteLength(body)
  };
  if (status === 413) headers.Connection = 'close';   // trả lỗi xong thì đóng, không nhận tiếp phần upload thừa
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, over = false; const chunks = [];
    req.on('data', c => {
      if (over) return;                       // đã quá giới hạn: bỏ phần còn lại, không giữ trong bộ nhớ
      size += c.length;
      if (size > MAX_BODY) { over = true; chunks.length = 0; reject(Object.assign(new Error('Yêu cầu quá lớn'), { status: 413 })); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  if (req.method === 'GET') {
    const user = (url.searchParams.get('user') || '').trim().toLowerCase();
    if (!user) return sendJson(res, 400, { error: 'Thiếu tham số user' });
    const store = await locked(readStore);
    return sendJson(res, 200, { version: VERSION, bookings: store.bookings.filter(b => b.userEmail === user) });
  }

  if (req.method === 'POST') {
    // Chặn ghi từ trang web khác: bắt buộc JSON (trình duyệt sẽ phải hỏi CORS) và Origin phải trùng máy chủ
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return sendJson(res, 415, { error: 'Chỉ nhận application/json' });
    const origin = req.headers.origin;
    if (origin && origin !== 'http://' + req.headers.host) return sendJson(res, 403, { error: 'Nguồn không được phép' });

    let payload;
    try { payload = JSON.parse(await readBody(req)); } catch (e) {
      return sendJson(res, e.status || 400, { error: e.status ? e.message : 'JSON không hợp lệ' });
    }
    const items = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.bookings) ? payload.bookings : [payload]);
    if (items.length > MAX_PER_REQUEST) return sendJson(res, 413, { error: 'Quá nhiều đặt chỗ trong một yêu cầu' });

    const clean = []; const rejected = [];
    items.forEach(x => {
      const r = sanitize(x);
      if (r.ok) clean.push(r.value); else rejected.push({ id: x && x.id ? String(x.id).slice(0, 40) : '', error: r.error });
    });

    const result = await locked(async () => {
      const store = await readStore();
      const counts = { added: 0, updated: 0, stale: 0, conflict: 0 };
      for (const rec of clean) {
        if (store.bookings.length >= MAX_TOTAL && !store.bookings.some(b => b.id === rec.id)) { rejected.push({ id: rec.id, error: 'Kho đã đầy' }); continue; }
        counts[upsert(store, rec)]++;
      }
      if (counts.added || counts.updated) await writeStore(store);
      return counts;
    });
    if (clean.length) console.log('POST /api/bookings  +' + result.added + ' mới, ' + result.updated + ' cập nhật' + (rejected.length ? ', ' + rejected.length + ' bị từ chối' : ''));
    return sendJson(res, rejected.length && !clean.length ? 400 : 200, Object.assign({ ok: true }, result, { rejected }));
  }

  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { error: 'Phương thức không được hỗ trợ' });
}

/* ---------------------------------------------------------------
 * Phục vụ file tĩnh
 * ------------------------------------------------------------- */
async function handleStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }

  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end('Bad request'); }
  if (rel.includes('\0')) { res.writeHead(400); return res.end('Bad request'); }

  const segments = rel.split('/').filter(Boolean);
  const hidden = segments.some(s => s.startsWith('.') || s === 'node_modules')
    || HIDDEN_FILES.has('/' + segments.join('/'))
    || path.resolve(path.join(ROOT, rel)) === DATA_FILE
    || /^bookings\..*\.json(\.tmp)?$/.test(segments[segments.length - 1] || '');
  let file = path.resolve(ROOT, '.' + path.posix.normalize('/' + rel));
  if (hidden || !(file === ROOT || file.startsWith(ROOT + path.sep))) { res.writeHead(404); return res.end('Not found'); }

  try {
    let st = await fs.promises.stat(file);
    if (st.isDirectory()) { file = path.join(file, 'index.html'); st = await fs.promises.stat(file); }
    const type = MIME[path.extname(file).toLowerCase()];
    if (!type) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const run = url.pathname === '/api/bookings' ? handleApi(req, res, url) : handleStatic(req, res, url);
    run.catch(err => {
      console.error(err);
      if (!res.headersSent) sendJson(res, 500, { error: 'Lỗi máy chủ' }); else res.destroy();
    });
  });
}

module.exports = { createServer, DATA_FILE };

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.on('error', err => {
    console.error(err.code === 'EADDRINUSE' ? 'Cổng ' + PORT + ' đang được dùng. Thử: PORT=3001 node server.js' : err);
    process.exit(1);
  });
  server.listen(PORT, HOST, () => {
    console.log('VivuGo đang chạy:  http://' + (HOST === '127.0.0.1' ? 'localhost' : HOST) + ':' + PORT);
    console.log('Đặt chỗ được lưu vào: ' + path.relative(ROOT, DATA_FILE));
  });
}
