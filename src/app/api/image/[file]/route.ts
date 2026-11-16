import fs from 'node:fs/promises';
import { imagePath } from '@/lib/content';

// Hình bản đồ / sơ đồ của đề, đọc từ content/images (không nằm trong public/)
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const img = imagePath(file);
  if (!img) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(img.path);
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': img.type, 'Cache-Control': 'private, max-age=86400' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
