import type { Store } from '@/lib/types';
import { loadProgress, saveProgress } from '@/lib/progressFile';
import { currentRole } from '@/lib/session';
import { mergeStores } from '@/lib/merge';

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
  const prev = saved?.store;
  // Bản ở máy chủ đã đổi kể từ lần trình duyệt này đồng bộ (học trên máy khác): gộp, không ghi đè.
  // Bản của trình duyệt đang gửi thắng khi hai bên cùng sửa một mục.
  const merged = !!prev && (prev.updatedAt ?? 0) !== (body.base ?? 0);
  const next: Store = merged ? mergeStores(prev, store) : store;
  // Mốc phiên bản do máy chủ cấp, luôn tăng, để không phụ thuộc đồng hồ của từng máy
  next.updatedAt = Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1);
  await saveProgress(next, saved);
  return Response.json({ ok: true, updatedAt: next.updatedAt, ...(merged ? { store: next } : {}) });
}
