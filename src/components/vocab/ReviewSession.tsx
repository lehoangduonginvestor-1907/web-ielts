'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Volume2 } from 'lucide-react';
import type { Word } from '@/lib/types';
import { getStore, logCards, update } from '@/lib/store';
import { useMounted } from '@/lib/hooks';
import { preview, review, type Grade } from '@/lib/srs';
import { speak } from '@/lib/speech';
import { HedgehogMascot } from '../Mascots';

const GRADES: { g: Grade; label: string; tone: string }[] = [
  { g: 0, label: 'Quên', tone: 'border-bad/40 text-bad hover:bg-bad-soft' },
  { g: 1, label: 'Khó', tone: 'border-ember/40 text-ember hover:bg-ember-soft' },
  { g: 2, label: 'Nhớ', tone: 'border-good/40 text-good hover:bg-good-soft' },
  { g: 3, label: 'Dễ', tone: 'border-accent/40 text-accent hover:bg-accent-soft' },
];

// Câu ngữ cảnh với từ được che (mặt trước) hoặc in đậm (mặt sau)
function Cloze({ text, word, hide }: { text: string; word: string; hide: boolean }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      {hide ? (
        <span className="mx-0.5 inline-block w-16 border-b-2 border-ink-2 align-baseline" />
      ) : (
        <strong className="font-semibold text-ink not-italic">{text.slice(i, i + word.length)}</strong>
      )}
      {text.slice(i + word.length)}
    </>
  );
}

export default function ReviewSession() {
  // Phiên ôn chỉ dựng trên trình duyệt (danh sách thẻ nằm trong localStorage)
  return useMounted() ? <Session /> : <div className="h-96" />;
}

function Session() {
  // Lấy danh sách thẻ đến hạn một lần khi mở phiên
  const [queue, setQueue] = useState<Word[] | null>(() => {
    const now = Date.now();
    return getStore()
      .words.filter(w => w.srs.due <= now)
      .sort((a, b) => a.srs.due - b.srs.due)
      .slice(0, 60);
  });
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const [remembered, setRemembered] = useState(0);

  const card = queue?.[0];

  useEffect(() => {
    if (card) speak(card.word);
  }, [card]);

  const grade = useCallback(
    (g: Grade) => {
      if (!card) return;
      const next = review(card.srs, g);
      update(s => {
        const w = s.words.find(x => x.id === card.id);
        if (w) w.srs = next;
      });
      logCards(1);
      setDone(d => d + 1);
      if (g >= 2) setRemembered(r => r + 1);
      // Quên: đưa thẻ về cuối hàng để gặp lại trong phiên này
      setQueue(q => (q ? (g === 0 ? [...q.slice(1), { ...card, srs: next }] : q.slice(1)) : q));
      setShown(false);
    },
    [card],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return;
      if (!shown && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) {
        grade((Number(e.key) - 1) as Grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, shown, grade]);

  if (!queue) return <div className="h-96" />;

  const total = done + queue.length;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/vocab" className="btn-quiet -ml-2" aria-label="Quay lại">
          <ArrowLeft size={18} />
        </Link>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${total ? (done / total) * 100 : 100}%` }} />
        </div>
        <span className="num text-sm text-muted">
          {done}/{total}
        </span>
      </div>

      {card ? (
        <>
          <div className="card mt-8 flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
            <HedgehogMascot pose={shown ? 'celebrate' : 'vocab'} size={58} className="mb-2" />
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[40px] leading-tight font-semibold">{card.word}</h1>
              <button className="btn-quiet px-2" onClick={() => speak(card.word)} aria-label="Nghe lại">
                <Volume2 size={20} />
              </button>
            </div>
            {card.pos && <p className="text-sm text-muted italic">{card.pos}</p>}
            {card.context && (
              <p className="mt-6 max-w-md font-serif text-[16px] leading-relaxed text-ink-2 italic">
                “<Cloze text={card.context} word={card.word} hide={false} />”
              </p>
            )}
            {shown ? (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-[22px] font-semibold text-accent">{card.vi || 'Chưa có nghĩa. Bổ sung ở trang Từ vựng.'}</p>
                {card.source && <p className="mt-2 text-xs text-muted">{card.source}</p>}
              </div>
            ) : (
              <p className="mt-8 text-sm text-muted">Nghĩ ra nghĩa trước, rồi mới lật thẻ.</p>
            )}
          </div>

          <div className="mt-5">
            {shown ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(({ g, label, tone }, i) => (
                  <button key={g} onClick={() => grade(g)} className={`rounded-xl border bg-surface px-2 py-3 text-center transition-colors ${tone}`}>
                    <div className="font-semibold">{label}</div>
                    <div className="mt-0.5 text-[11px] opacity-70">{preview(card.srs, g)}</div>
                    <div className="mt-1 hidden text-[10px] text-muted sm:block">phím {i + 1}</div>
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn-primary w-full py-3 text-[15px]" onClick={() => setShown(true)}>
                Lật thẻ <span className="text-xs font-normal opacity-70">(Space)</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="card mt-8 px-6 py-12 text-center">
          <HedgehogMascot pose="celebrate" size={92} className="mx-auto mb-3" />
          <p className="font-serif text-[28px] font-semibold">{done ? 'Xong phiên ôn.' : 'Không có thẻ nào đến hạn.'}</p>
          {done > 0 && (
            <p className="mt-2 text-ink-2">
              Ôn {done} lượt · nhớ {Math.round((remembered / done) * 100)}%
            </p>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/" className="btn-primary">
              Về trang Hôm nay
            </Link>
            <Link href="/vocab" className="btn-ghost">
              Xem bộ từ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
