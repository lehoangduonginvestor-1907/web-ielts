import { getTest } from '@/lib/content';
import { currentRole } from '@/lib/session';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if ((await currentRole()) !== 'learner') return new Response('Unauthorized', { status: 401 });
  const { id } = await ctx.params;
  const t = await getTest(id);
  if (!t) return new Response('Not found', { status: 404 });
  return Response.json(t, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}
