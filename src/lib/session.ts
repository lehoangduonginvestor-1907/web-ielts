import 'server-only';
import { cookies } from 'next/headers';
import { COOKIE, roleFromCookie, type Role } from './auth';

/** Vai trò của người đang gọi (đọc từ cookie). Mọi route trả dữ liệu đều tự kiểm tra, không chỉ dựa vào proxy. */
export async function currentRole(): Promise<Role | null> {
  return roleFromCookie((await cookies()).get(COOKIE)?.value);
}
