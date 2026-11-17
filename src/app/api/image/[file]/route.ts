import { imageKey } from '@/lib/content';
import { currentRole } from '@/lib/session';
import { serveFile } from '@/lib/storage';

// Hình bản đồ / sơ đồ của đề (không nằm trong public/). Chỉ người học đã đăng nhập mới xem được.
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  if ((await currentRole()) !== 'learner') return new Response('Unauthorized', { status: 401 });
  const img = imageKey((await ctx.params).file);
  if (!img) return new Response('Not found', { status: 404 });
  return serveFile(img.key, img.type, null);
}
