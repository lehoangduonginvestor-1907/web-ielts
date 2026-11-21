// Đọc phản hồi từ /api/{writing,speaking}/grade phía trình duyệt.
// Khi hàm trên Vercel hết giờ hoặc gói gửi lên quá lớn, nền tảng trả về trang lỗi chứ không phải JSON
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
  if (status === 401) return 'Your session has expired. Sign in again, then retry grading — your work is saved.';
  if (status === 413) return 'The recording is too large to upload for grading. Download it and grade it manually in Gemini below.';
  if (status === 504 || status === 502) {
    return 'The AI grader took too long and the server stopped waiting. Your work is saved — retry in a minute, or grade it manually in Gemini below.';
  }
  if (status >= 500) return 'The grading server had a problem. Your work is saved — please retry in a minute.';
  return null;
}
