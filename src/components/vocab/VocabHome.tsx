'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Volume2 } from 'lucide-react';
import type { Word } from '@/lib/types';
import { addWord, update, useStore } from '@/lib/store';
import { speak } from '@/lib/speech';
import { dayKey, fmtDay } from '@/lib/dates';
import { useNow } from '@/lib/hooks';

const stage = (w: Word) => (w.srs.reps === 0 ? 'new' : w.srs.interval >= 21 ? 'known' : 'learning');
const STAGE_LABEL = { new: 'Mới', learning: 'Đang học', known: 'Đã thuộc' } as const;
const STAGE_TONE = { new: 'bg-sunk text-ink-2', learning: 'bg-ember-soft text-ember', known: 'bg-good-soft text-good' } as const;

// In đậm từ trong câu ngữ cảnh
function Context({ text, word }: { text: string; word: string }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-semibold text-ink not-italic">{text.slice(i, i + word.length)}</strong>
      {text.slice(i + word.length)}
    </>
  );
}

export default function VocabHome() {
  const store = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'learning' | 'known'>('all');
  const [word, setWord] = useState('');
  const [vi, setVi] = useState('');
  const [msg, setMsg] = useState('');

  const words = useMemo(() => store?.words ?? [], [store]);
  const now = useNow();
  const due = words.filter(w => w.srs.due <= now);
  const counts = { new: 0, learning: 0, known: 0 };
  words.forEach(w => counts[stage(w)]++);
  const nextDue = words.filter(w => w.srs.due > now).sort((a, b) => a.srs.due - b.srs.due)[0];

  const shown = words.filter(
    w => (filter === 'all' || stage(w) === filter) && (!q || w.word.toLowerCase().includes(q.toLowerCase()) || w.vi.toLowerCase().includes(q.toLowerCase())),
  );

  const add = () => {
    if (!word.trim()) return;
    const ok = addWord({ word, vi, source: 'Tự thêm' });
    setMsg(ok ? `Đã thêm “${word.trim()}”.` : 'Từ này đã có trong bộ.');
    if (ok) {
      setWord('');
      setVi('');
    }
  };

  if (!store) return <div className="h-96" />;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Từ vựng</h1>
          <p className="mt-1 text-ink-2">Từ lưu từ bài đọc, kèm câu gốc. Ôn đúng lúc sắp quên.</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Đến hạn hôm nay</p>
            <p className="mt-1 font-serif text-[40px] leading-none font-semibold">
              <span className="num">{due.length}</span> <span className="text-[17px] text-muted">thẻ</span>
            </p>
            {!due.length && (
              <p className="mt-2 text-sm text-muted">
                {nextDue ? `Lần ôn tới: ${dayKey(nextDue.srs.due) === dayKey() ? 'hôm nay' : fmtDay(dayKey(nextDue.srs.due))}` : 'Lưu vài từ từ bài đọc để bắt đầu.'}
              </p>
            )}
          </div>
          <Link href="/vocab/review" className={`btn-primary px-6 py-3 text-[15px] ${due.length ? '' : 'pointer-events-none opacity-40'}`}>
            Ôn ngay
          </Link>
        </div>
        <div className="card grid grid-cols-3 divide-x divide-line p-0">
          {(['new', 'learning', 'known'] as const).map(k => (
            <div key={k} className="p-4">
              <p className="text-xs text-muted">{STAGE_LABEL[k]}</p>
              <p className="num mt-1 font-serif text-[26px] font-semibold">{counts[k]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="field font-serif sm:max-w-56" placeholder="Từ / cụm từ tiếng Anh" value={word} onChange={e => setWord(e.target.value)} />
          <input className="field" placeholder="Nghĩa tiếng Việt" value={vi} onChange={e => setVi(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="btn-primary shrink-0" onClick={add} disabled={!word.trim()}>
            <Plus size={16} /> Thêm
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-ink-2">{msg}</p>}
        <p className="mt-2 text-xs text-muted">Mẹo: trong bài đọc, bôi đen một từ rồi bấm “Lưu từ” để giữ luôn câu ngữ cảnh.</p>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className="field pl-9" placeholder="Tìm từ hoặc nghĩa" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="inline-flex rounded-lg border border-line-strong bg-surface p-1 text-sm">
            {(['all', 'new', 'learning', 'known'] as const).map(k => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-md px-2.5 py-1 font-medium ${filter === k ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
              >
                {k === 'all' ? 'Tất cả' : STAGE_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        {shown.length ? (
          <ul className="card divide-y divide-line">
            {shown.map(w => (
              <li key={w.id} className="group flex gap-3 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-serif text-[17px] font-semibold">{w.word}</span>
                    {w.pos && <span className="text-xs text-muted italic">{w.pos}</span>}
                    <span className="text-[15px] text-ink-2">{w.vi || <span className="text-muted">— chưa có nghĩa</span>}</span>
                  </div>
                  {w.context && (
                    <p className="mt-1 line-clamp-2 font-serif text-[13.5px] text-muted italic">
                      <Context text={w.context} word={w.word} />
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted">
                    {w.source}
                    {w.srs.reps > 0 && ` · ôn lại ${fmtDay(dayKey(w.srs.due))}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STAGE_TONE[stage(w)]}`}>{STAGE_LABEL[stage(w)]}</span>
                  <button className="btn-quiet px-1.5 py-1" onClick={() => speak(w.word)} aria-label="Nghe">
                    <Volume2 size={15} />
                  </button>
                  <button
                    className="btn-quiet px-1.5 py-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={() => update(s => void (s.words = s.words.filter(x => x.id !== w.id)))}
                    aria-label="Xoá"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
            {words.length ? 'Không có từ nào khớp.' : 'Bộ từ đang trống. Làm xong một bài đọc rồi bấm “Thêm từ của bài vào bộ thẻ”.'}
          </div>
        )}
      </section>
    </div>
  );
}
