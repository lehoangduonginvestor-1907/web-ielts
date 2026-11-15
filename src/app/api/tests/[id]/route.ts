import { getTest } from '@/lib/content';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const t = await getTest(id);
  if (!t) return new Response('Not found', { status: 404 });
  return Response.json(t, { headers: { 'Cache-Control': 'private, max-age=3600' } });
}
