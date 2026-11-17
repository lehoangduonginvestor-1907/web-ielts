import type { MistakeReason } from './types';

// Lý do sai: dùng ở màn xem lời giải, Sổ lỗi và trang người kèm
export const REASONS: { k: MistakeReason; label: string; hint: string }[] = [
  { k: 'vocab', label: 'Không biết từ', hint: 'Từ khoá trong bài hoặc đề lạ' },
  { k: 'paraphrase', label: 'Không nhận ra paraphrase', hint: 'Đề và bài nói cùng ý bằng chữ khác' },
  { k: 'locate', label: 'Không tìm ra chỗ', hint: 'Đọc lướt / nghe mà lạc vị trí' },
  { k: 'missed', label: 'Nghe sót', hint: 'Nói nhanh, bỏ lỡ đáp án' },
  { k: 'careless', label: 'Ẩu', hint: 'Chính tả, số ít/nhiều, quá số từ' },
  { k: 'time', label: 'Hết giờ', hint: 'Không kịp làm' },
];
