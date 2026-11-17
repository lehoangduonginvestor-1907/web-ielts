import { cookies } from 'next/headers';
import { COOKIE, COOKIE_MAX_AGE, makeSession, roleForCode } from '@/lib/auth';

// Nhập mã vào cửa → ghi cookie phiên (httpOnly, 180 ngày)
export async function POST(req: Request) {
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const role = roleForCode(typeof code === 'string' ? code : '');
  if (!role) {
    await new Promise(r => setTimeout(r, 800)); // làm chậm việc dò mã
    return Response.json({ ok: false }, { status: 401 });
  }
  (await cookies()).set(COOKIE, await makeSession(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return Response.json({ ok: true, role });
}

// Đăng xuất
export async function DELETE() {
  (await cookies()).delete(COOKIE);
  return Response.json({ ok: true });
}
