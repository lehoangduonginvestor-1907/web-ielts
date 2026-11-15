import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { audioPath } from '@/lib/content';

// Phát audio từ content/audio, hỗ trợ Range để tua được trong trình duyệt
export async function GET(req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const a = audioPath(file);
  if (!a || !fs.existsSync(a.path)) return new Response('Not found', { status: 404 });
  const p = a.path;

  const size = fs.statSync(p).size;
  const range = req.headers.get('range');
  const headers: Record<string, string> = {
    'Content-Type': a.type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=86400',
  };

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(p, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(fs.createReadStream(p)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, 'Content-Length': String(size) } });
}
