import 'server-only';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { get, put } from '@vercel/blob';

// Nơi cất đề (content/...) và tiến độ học (data/...).
//  - Chạy trên máy: thư mục content/ và data/ cạnh mã nguồn.
//  - Chạy trên Vercel: kho Vercel Blob riêng tư (có BLOB_READ_WRITE_TOKEN), cùng tên khoá.
// Khoá luôn có dạng "content/tests/c10t1.json", "data/progress.json"…

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
export const onBlob = !!TOKEN;

// turbopackIgnore: đường dẫn này chỉ dùng khi chạy trên máy, không cần gói cả project vào hàm trên Vercel
const localPath = (key: string) => path.join(/* turbopackIgnore: true */ process.cwd(), ...key.split('/'));

// Địa chỉ gốc của kho riêng tư, chỉ dùng phía máy chủ kèm token (trình duyệt không bao giờ thấy)
function blobUrl(key: string): string {
  const id = (process.env.BLOB_STORE_ID ?? TOKEN!.split('_')[3] ?? '').replace(/^store_/, '').toLowerCase();
  return `https://${id}.private.blob.vercel-storage.com/${key}`;
}

/** Đọc một file chữ. fresh = bỏ qua bộ đệm CDN (cần cho dữ liệu vừa ghi). */
export async function readText(key: string, fresh = false): Promise<string | null> {
  if (!onBlob) {
    try {
      return await fsp.readFile(localPath(key), 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  const r = await get(key, { access: 'private', useCache: !fresh });
  if (!r || r.statusCode !== 200) return null;
  return await new Response(r.stream).text();
}

export async function writeText(key: string, text: string): Promise<void> {
  if (!onBlob) {
    const p = localPath(key);
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.writeFile(`${p}.tmp`, text, 'utf8');
    await fsp.rename(`${p}.tmp`, p); // ghi xong mới thay file cũ, tránh file cụt khi mất điện
    return;
  }
  await put(key, text, { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 });
}

/**
 * Trả một file nhị phân (audio, hình) cho trình duyệt, có hỗ trợ Range để tua audio.
 * type: kiểu nội dung theo đuôi file; trên Blob dùng kiểu đã ghi lúc tải lên (audio đã nén thành MP3).
 */
export async function serveFile(key: string, type: string, range: string | null): Promise<Response> {
  const cache = 'private, max-age=86400';
  if (onBlob) {
    const up = await fetch(blobUrl(key), { headers: { authorization: `Bearer ${TOKEN}`, ...(range ? { range } : {}) } });
    if (up.status !== 200 && up.status !== 206) return new Response('Not found', { status: up.status === 416 ? 416 : 404 });
    const headers: Record<string, string> = { 'Content-Type': up.headers.get('content-type') ?? type, 'Accept-Ranges': 'bytes', 'Cache-Control': cache };
    for (const h of ['content-length', 'content-range']) {
      const v = up.headers.get(h);
      if (v) headers[h] = v;
    }
    return new Response(up.body, { status: up.status, headers });
  }

  const p = localPath(key);
  if (!fs.existsSync(p)) return new Response('Not found', { status: 404 });
  const size = fs.statSync(p).size;
  const headers: Record<string, string> = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': cache };
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    const stream = Readable.toWeb(fs.createReadStream(p, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(fs.createReadStream(p)) as ReadableStream, { headers: { ...headers, 'Content-Length': String(size) } });
}
