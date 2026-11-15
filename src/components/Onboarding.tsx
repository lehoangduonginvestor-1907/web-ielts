'use client';

import { useState } from 'react';
import { saveProfile } from '@/lib/store';
import type { Profile } from '@/lib/types';
import { Logo } from './Nav';

const BANDS = [5.5, 6, 6.5, 7, 7.5];
const MINUTES = [20, 30, 45, 60];

export default function Onboarding({ initial, onDone }: { initial?: Profile; onDone?: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [examDate, setExamDate] = useState(initial?.examDate ?? '');
  const [target, setTarget] = useState(initial?.target ?? 6.5);
  const [goal, setGoal] = useState(initial?.goalMinutes ?? 30);

  const save = () => {
    saveProfile({ name: name.trim() || 'bạn', examDate: examDate || undefined, target, goalMinutes: goal, createdAt: initial?.createdAt ?? Date.now() });
    onDone?.();
  };

  return (
    <div className={initial ? '' : 'mx-auto max-w-xl pt-4 sm:pt-12'}>
      {!initial && (
        <>
          <Logo className="text-[40px]" />
          <h1 className="mt-6 font-serif text-[30px] leading-tight font-semibold">Học đều mỗi ngày, band sẽ tự lên.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            Mỗi ngày một chút Listening, một chút Reading, vài thẻ từ. Câu nào sai đều có giải thích tiếng Việt và sẽ quay lại để bạn làm lại cho
            tới khi chắc. Trả lời bốn câu dưới đây để bắt đầu.
          </p>
        </>
      )}

      <div className={`${initial ? '' : 'card mt-8 p-6'} space-y-6`}>
        <label className="block">
          <span className="text-sm font-semibold">Bạn tên gì?</span>
          <input className="field mt-1.5" value={name} onChange={e => setName(e.target.value)} placeholder="Tên để chào bạn mỗi ngày" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Ngày thi dự kiến</span>
          <input type="date" className="field mt-1.5" value={examDate} onChange={e => setExamDate(e.target.value)} />
          <span className="mt-1 block text-xs text-muted">Chưa chốt cũng được, đặt tạm khoảng 6–8 tháng nữa.</span>
        </label>

        <div>
          <span className="text-sm font-semibold">Band mục tiêu</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BANDS.map(b => (
              <button
                key={b}
                onClick={() => setTarget(b)}
                className={`num rounded-lg border px-3.5 py-1.5 text-sm font-semibold ${target === b ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:bg-sunk'}`}
              >
                {b.toFixed(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-sm font-semibold">Mỗi ngày học bao lâu?</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MINUTES.map(m => (
              <button
                key={m}
                onClick={() => setGoal(m)}
                className={`rounded-lg border px-3.5 py-1.5 text-sm font-semibold ${goal === m ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:bg-sunk'}`}
              >
                {m} phút
              </button>
            ))}
          </div>
          <span className="mt-1.5 block text-xs text-muted">Đều đặn quan trọng hơn nhiều. 30 phút mỗi ngày tốt hơn 3 tiếng một lần một tuần.</span>
        </div>

        <button className="btn-primary w-full py-2.5" onClick={save}>
          {initial ? 'Lưu thay đổi' : 'Bắt đầu học'}
        </button>
      </div>
    </div>
  );
}
