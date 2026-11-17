// Đăng nhập bằng mã vào cửa cho app một người học + một người kèm.
// Cấu hình bằng biến môi trường: LEARNER_CODE, COACH_CODE, AUTH_SECRET.
// Không đặt LEARNER_CODE (chạy trên máy riêng) thì không khoá gì cả.
// File này dùng được cả trong proxy.ts nên chỉ dựa vào Web Crypto.

export type Role = 'learner' | 'coach';

export const COOKIE = 'deu_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 ngày

export const authEnabled = () => !!process.env.LEARNER_CODE;

const enc = new TextEncoder();

async function hmac(text: string): Promise<string> {
  const secret = process.env.AUTH_SECRET || `${process.env.LEARNER_CODE}|${process.env.COACH_CODE}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
}

// So sánh không lộ thời gian
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Mã đúng thì trả vai trò tương ứng. */
export function roleForCode(code: string): Role | null {
  const c = code.trim();
  if (!c) return null;
  if (process.env.LEARNER_CODE && same(c, process.env.LEARNER_CODE)) return 'learner';
  if (process.env.COACH_CODE && same(c, process.env.COACH_CODE)) return 'coach';
  return null;
}

export async function makeSession(role: Role): Promise<string> {
  return `${role}.${await hmac(role)}`;
}

/** Vai trò ghi trong cookie; null nếu cookie thiếu hoặc bị sửa. Khi không bật khoá: luôn là người học. */
export async function roleFromCookie(value: string | undefined): Promise<Role | null> {
  if (!authEnabled()) return 'learner';
  if (!value) return null;
  const [role, sig] = value.split('.');
  if ((role !== 'learner' && role !== 'coach') || !sig) return null;
  return same(sig, await hmac(role)) ? role : null;
}
