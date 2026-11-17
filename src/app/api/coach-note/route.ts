import { currentRole } from '@/lib/session';
import { readText, writeText } from '@/lib/storage';

// Lời nhắn của người kèm, hiện trên trang Hôm nay của người học. Một file nhỏ, ghi đè mỗi lần lưu.
const KEY = 'data/coach-note.json';

interface CoachNote {
  text: string;
  at: number;
}

export async function GET() {
  if (!(await currentRole())) return new Response('Unauthorized', { status: 401 });
  const raw = await readText(KEY, true);
  let note: CoachNote | null = null;
  try {
    note = raw ? (JSON.parse(raw) as CoachNote) : null;
  } catch {
    note = null;
  }
  return Response.json({ note: note?.text ? note : null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: Request) {
  if ((await currentRole()) !== 'coach') return new Response('Unauthorized', { status: 401 });
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (typeof text !== 'string' || text.length > 1000) return new Response('Bad note', { status: 400 });
  const note: CoachNote = { text: text.trim(), at: Date.now() };
  await writeText(KEY, JSON.stringify(note));
  return Response.json({ note: note.text ? note : null });
}
