import type { NextRequest } from 'next/server';
import { audioKey } from '@/lib/content';
import { currentRole } from '@/lib/session';
import { serveFile } from '@/lib/storage';

// Phát audio của đề, hỗ trợ Range để tua được trong trình duyệt. Chỉ người học đã đăng nhập mới nghe được.
export async function GET(req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  if ((await currentRole()) !== 'learner') return new Response('Unauthorized', { status: 401 });
  const a = audioKey((await ctx.params).file);
  if (!a) return new Response('Not found', { status: 404 });
  return serveFile(a.key, a.type, req.headers.get('range'));
}
