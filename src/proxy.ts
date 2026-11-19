import { NextResponse, type NextRequest } from 'next/server';
import { authEnabled, COOKIE, roleFromCookie } from '@/lib/auth';

// Cổng vào: chưa có mã thì chỉ thấy trang /login. Người kèm chỉ vào được /coach.
// (Các route dữ liệu vẫn tự kiểm tra vai trò, đây chỉ là lớp điều hướng.)
export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname === '/api/login' || pathname === '/api/reminder') return NextResponse.next();

  const role = await roleFromCookie(req.cookies.get(COOKIE)?.value);
  const isApi = pathname.startsWith('/api/');
  if (!role) {
    if (isApi) return new NextResponse('Unauthorized', { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isApi) return NextResponse.next();
  if (role === 'coach' && !pathname.startsWith('/coach')) return NextResponse.redirect(new URL('/coach', req.url));
  if (role === 'learner' && pathname.startsWith('/coach')) return NextResponse.redirect(new URL('/', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
