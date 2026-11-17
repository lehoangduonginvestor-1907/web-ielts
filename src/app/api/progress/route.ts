import type { Store } from '@/lib/types';
import { loadProgress, saveProgress } from '@/lib/progressFile';
import { currentRole } from '@/lib/session';

const MAX_BYTES = 4_000_000;

// Tiến độ học lưu ở máy chủ. Trình duyệt của người học kéo về lúc mở app và đẩy lên khi có thay đổi.
export async function GET() {
  if ((await currentRole()) !== 'learner') return new Response('Unauthorized', { status: 401 });
  const saved = await loadProgress();
  return Response.json({ store: saved?.store ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: Request) {
  if ((await currentRole()) !== 'learner') return new Response('Unauthorized', { status: 401 });
  const text = await req.text();
  if (text.length > MAX_BYTES) return new Response('Too large', { status: 413 });
  let body: { store?: Store; base?: number };
  try {
    body = JSON.parse(text);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }
  const store = body.store;
  if (!store || store.version !== 1 || !Array.isArray(store.attempts) || typeof store.updatedAt !== 'number') {
    return new Response('Bad store', { status: 400 });
  }
  const saved = await loadProgress();
  const current = saved?.store.updatedAt ?? 0;
  // Máy chủ đang giữ bản mới hơn bản mà trình duyệt này từng thấy (đã học trên máy khác): không ghi đè, trả bản của máy chủ
  if (saved && current > (body.base ?? 0) && current > store.updatedAt) {
    return Response.json({ store: saved.store }, { status: 409 });
  }
  await saveProgress(store, saved);
  return Response.json({ ok: true, updatedAt: store.updatedAt });
}
