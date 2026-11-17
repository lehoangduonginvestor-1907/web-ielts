// Đẩy kho đề lên kho Vercel Blob RIÊNG TƯ: content/index.json, tests/, images/ và audio đã nén (audio-web/).
// Chỉ tải những file chưa có hoặc đã đổi kích thước, nên chạy lại được nhiều lần.
//
// Chuẩn bị: 1) python tools/compress_audio.py   2) đặt BLOB_READ_WRITE_TOKEN trong .env.local
// Chạy:     node scripts/upload-content.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { list, put } from '@vercel/blob';

const root = process.cwd();
const dry = process.argv.includes('--dry');

// Đọc .env.local (không in giá trị ra màn hình)
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.BLOB_READ_WRITE_TOKEN && !dry) {
  console.error('Thiếu BLOB_READ_WRITE_TOKEN trong .env.local (lấy ở Vercel → Storage → kho Blob → .env.local).');
  process.exit(1);
}

const TYPES = { json: 'application/json', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const files = []; // { key, file, type }
const add = (dir, keyDir, type) => {
  const abs = path.join(root, 'content', dir);
  if (!fs.existsSync(abs)) return;
  for (const name of fs.readdirSync(abs).sort()) {
    if (name.endsWith('.part')) continue;
    files.push({ key: `content/${keyDir}/${name}`, file: path.join(abs, name), type: type ?? TYPES[name.split('.').pop()] ?? 'application/octet-stream' });
  }
};
files.push({ key: 'content/index.json', file: path.join(root, 'content', 'index.json'), type: 'application/json' });
add('tests', 'tests');
add('images', 'images');
// Audio: bản nén MP3, giữ nguyên tên file gốc (đề tham chiếu theo tên)
const srcAudio = fs.readdirSync(path.join(root, 'content', 'audio'));
const webAudio = fs.existsSync(path.join(root, 'content', 'audio-web')) ? fs.readdirSync(path.join(root, 'content', 'audio-web')).filter(n => !n.endsWith('.part')) : [];
const missing = srcAudio.filter(n => !webAudio.includes(n));
if (missing.length) {
  console.error(`Còn ${missing.length} file audio chưa nén (chạy tools/compress_audio.py trước): ${missing.slice(0, 5).join(', ')}…`);
  process.exit(1);
}
add('audio-web', 'audio', 'audio/mpeg');

const total = files.reduce((n, f) => n + fs.statSync(f.file).size, 0);
console.log(`${files.length} file · ${(total / 1e6).toFixed(0)} MB (giới hạn miễn phí của Blob: 1000 MB)`);
if (dry) process.exit(0);

// Những gì đã có trên kho
const have = new Map();
let cursor;
do {
  const page = await list({ prefix: 'content/', cursor, limit: 1000 });
  for (const b of page.blobs) have.set(b.pathname, b.size);
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

let sent = 0;
let skipped = 0;
for (const f of files) {
  const size = fs.statSync(f.file).size;
  if (have.get(f.key) === size) {
    skipped++;
    continue;
  }
  // Đọc cả file vào bộ nhớ (file lớn nhất chỉ vài MB): gửi bằng stream thì không thử lại được khi mạng chập chờn
  const body = fs.readFileSync(f.file);
  for (let attempt = 1; ; attempt++) {
    try {
      await put(f.key, body, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: f.type });
      break;
    } catch (e) {
      if (attempt >= 4) throw e;
      console.log(`  thử lại ${f.key} (lần ${attempt}): ${e.message}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  sent++;
  if (sent % 10 === 0) console.log(`  đã tải ${sent} file…`);
}
console.log(`Xong: tải ${sent} file, bỏ qua ${skipped} file đã có.`);
