// Đọc phản hồi từ /api/{writing,speaking}/grade phía trình duyệt (sau khi người học dán JSON của Gemini).
// Khi máy chủ lỗi hoặc phiên đăng nhập hết hạn, nền tảng có thể trả về trang lỗi chứ không phải JSON
// của app: đổi những trường hợp đó thành lời báo dễ hiểu thay vì "Unexpected token".

export async function readGradeResponse<T extends { feedback?: unknown; error?: string }>(
  res: Response,
  fallback: string,
): Promise<T & { feedback: NonNullable<T['feedback']> }> {
  const data = (await res.json().catch(() => null)) as T | null;
  if (res.ok && data?.feedback) return data as T & { feedback: NonNullable<T['feedback']> };
  throw new Error(data?.error || gradeStatusMessage(res.status) || fallback);
}

export function gradeStatusMessage(status: number): string | null {
  if (status === 401) return 'Your session has expired. Sign in again, then paste Gemini’s result again — your work is saved.';
  if (status >= 500) return 'The server had a problem saving the result. Your work is saved — paste Gemini’s result again in a minute.';
  return null;
}
