'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Flame as FlameIcon, Lightbulb, Sparkles, Volume2, Zap } from 'lucide-react';
import type { Word } from '@/lib/types';
import { getStore, logCards, logSeconds, update } from '@/lib/store';
import { useMounted, useNow, useStudyTimer } from '@/lib/hooks';
import { todayVocabQueue } from '@/lib/progress';
import { preview, review, type Grade } from '@/lib/srs';
import { playSfx } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { HedgehogMascot } from '../Mascots';

const GRADES: { g: Grade; label: string; tone: string }[] = [
  { g: 0, label: 'Again', tone: 'border-bad/40 text-bad hover:bg-bad-soft' },
  { g: 1, label: 'Hard', tone: 'border-ember/40 text-ember hover:bg-ember-soft' },
  { g: 2, label: 'Good', tone: 'border-good/40 text-good hover:bg-good-soft' },
  { g: 3, label: 'Easy', tone: 'border-accent/40 text-accent hover:bg-accent-soft' },
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

// Thẻ đã nhớ đúng từ 2 lần trở lên và có nghĩa tiếng Việt: hỏi ngược, nhìn nghĩa + câu khuyết rồi gõ lại từ.
// Đi thi cần viết đúng chính tả, không chỉ nhận ra nghĩa.
const recallMode = (w: Word) => w.srs.reps >= 2 && !!w.vi.trim();
const norm = (s: string) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');

/** Gợi ý khung chữ cái đầu/cuối (vd. "environment" -> "e _ _ _ _ _ _ _ _ _ t") mà không lộ đáp án. */
function letterHint(word: string): string {
  return word
    .trim()
    .split(/\s+/)
    .map(part => {
      if (part.length <= 2) return `${part[0]} _`;
      return `${part[0]} ${'_ '.repeat(part.length - 2)}${part[part.length - 1]}`;
    })
    .join('   ');
}

/** So khớp chính tả từng ký tự (LCS) để tô xanh chữ đúng và gạch đỏ chữ thiếu/sai. */
function SpellingDiff({ target, typed }: { target: string; typed: string }) {
  const a = [...norm(target)];
  const b = [...norm(typed)];
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const hit = new Array<boolean>(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      hit[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return (
    <span className="font-mono text-[15px] tracking-wide">
      {a.map((ch, idx) => (
        <span
          key={idx}
          className={
            hit[idx]
              ? 'text-good'
              : 'rounded-[2px] bg-bad-soft px-[1px] font-bold text-bad underline decoration-bad/70 underline-offset-2'
          }
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

export default function ReviewSession() {
  // Phiên ôn chỉ dựng trên trình duyệt (danh sách thẻ nằm trong localStorage)
  return useMounted() ? <Session /> : <div className="h-96" />;
}

function readMode(): { quick: boolean; extra: boolean } {
  if (typeof window === 'undefined') return { quick: false, extra: false };
  const sp = new URLSearchParams(window.location.search);
  return { quick: sp.get('quick') === '1', extra: sp.get('extra') === '1' };
}

function Session() {
  const [{ quick, extra }] = useState(readMode);
  const [queue, setQueue] = useState<Word[]>(() => {
    const plan = todayVocabQueue(getStore(), Date.now(), {
      quick,
      extraNew: extra ? 10 : undefined,
    });
    return plan.queue;
  });
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState('');
  const [hintShown, setHintShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seenNewIds = useRef<Set<string>>(new Set());
  const [done, setDone] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  const card = queue[0];
  const recall = !!card && recallMode(card);
  const typedRight = recall && norm(typed) === norm(card.word);

  // Ghi nhận thời gian ôn thẻ vào mục tiêu phút học mỗi ngày (Daily Goal)
  useStudyTimer(!!card, logSeconds);

  useEffect(() => {
    // Chế độ gõ từ: không đọc từ lên trước (sẽ lộ đáp án); đọc khi lật
    if (card && (!recallMode(card) || shown)) speak(card.word);
  }, [card, shown]);

  useEffect(() => {
    if (recall && !shown) inputRef.current?.focus();
  }, [recall, shown, card]);

  const grade = useCallback(
    (g: Grade) => {
      if (!card) return;
      const isNewCard = card.srs.reps === 0 && !seenNewIds.current.has(card.id);
      if (isNewCard) seenNewIds.current.add(card.id);
      const next = review(card.srs, g);
      update(s => {
        const w = s.words.find(x => x.id === card.id);
        if (w) w.srs = next;
      });
      logCards(1, isNewCard);
      setDone(d => d + 1);
      const finishing = queue.length === 1 && g !== 0;
      if (g >= 2) {
        setRemembered(r => r + 1);
        setCombo(c => {
          const nextCombo = c + 1;
          setBestCombo(b => Math.max(b, nextCombo));
          return nextCombo;
        });
        playSfx(finishing ? 'resolve' : 'tick');
      } else {
        setCombo(0);
        if (finishing) playSfx('resolve');
      }
      // Quên: đưa thẻ về cuối hàng để gặp lại trong phiên này
      setQueue(q => (g === 0 ? [...q.slice(1), { ...card, srs: next }] : q.slice(1)));
      setShown(false);
      setTyped('');
      setHintShown(false);
    },
    [card, queue.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return;
      if (e.target instanceof HTMLInputElement) return; // đang gõ từ: Enter do ô nhập xử lý
      if (!shown && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ['1', '2', '3', '4'].includes(e.key)) {
        const g = (Number(e.key) - 1) as Grade;
        if (recallMode(card) && norm(typed) !== norm(card.word) && g >= 2) return;
        grade(g);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, shown, grade, typed]);

  const startExtraBatch = (opts: { quick?: boolean; extraNew?: number }) => {
    const nextPlan = todayVocabQueue(getStore(), Date.now(), opts);
    if (!nextPlan.queue.length) return;
    setQueue(nextPlan.queue);
    setShown(false);
    setTyped('');
  };

  const now = useNow();
  const total = done + queue.length;
  const remainingPlan = !card && now ? todayVocabQueue(getStore(), now) : null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/vocab" className="btn-quiet -ml-2" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${total ? (done / total) * 100 : 100}%` }} />
        </div>
        {combo >= 3 && card && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-2 py-0.5 text-xs font-semibold text-ember">
            <FlameIcon size={12} /> {combo}
          </span>
        )}
        <span className="num text-sm text-muted">
          {done}/{total}
        </span>
      </div>

      {quick && card && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted">
          <Zap size={12} className="text-ember" /> Quick 10-card warm-up
        </p>
      )}

      {card ? (
        <>
          <div className="card mt-6 flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
            <HedgehogMascot pose={shown ? 'celebrate' : 'vocab'} size={58} className="mb-2" />
            {recall && !shown ? (
              <>
                <p className="eyebrow">Type the English word</p>
                <p className="mt-2 text-[24px] font-semibold text-accent">{card.vi}</p>
                {card.pos && <p className="text-sm text-muted italic">{card.pos}</p>}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-[40px] leading-tight font-semibold">{card.word}</h1>
                  <button className="btn-quiet px-2" onClick={() => speak(card.word)} aria-label="Listen again">
                    <Volume2 size={20} />
                  </button>
                </div>
                {card.pos && <p className="text-sm text-muted italic">{card.pos}</p>}
              </>
            )}
            {card.context && (
              <p className="mt-6 max-w-md font-serif text-[16px] leading-relaxed text-ink-2 italic">
                “<Cloze text={card.context} word={card.word} hide={recall && !shown} />”
              </p>
            )}
            {recall && !shown && (
              <div className="mt-6 flex w-full max-w-xs flex-col items-center gap-2">
                <form
                  className="flex w-full gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    setShown(true);
                  }}
                >
                  <input
                    ref={inputRef}
                    className="field text-center"
                    value={typed}
                    onChange={e => setTyped(e.target.value)}
                    aria-label="English word"
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                  />
                </form>
                {hintShown ? (
                  <p className="rounded-md bg-sunk/80 px-3 py-1 font-mono text-xs tracking-wider text-ink-2">
                    {letterHint(card.word)}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setHintShown(true);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-accent"
                  >
                    <Lightbulb size={12} /> Letter hint
                  </button>
                )}
              </div>
            )}
            {recall && shown && (
              <div className="mt-3 space-y-1 text-sm">
                <p className={`font-semibold ${typedRight ? 'text-good' : 'text-bad'}`}>
                  {typedRight ? 'Correct.' : typed.trim() ? `You typed: ${typed.trim()}` : 'Nothing typed.'}
                </p>
                {!typedRight && typed.trim() && (
                  <p className="text-xs text-muted">
                    Spelling check: <SpellingDiff target={card.word} typed={typed} />
                  </p>
                )}
              </div>
            )}
            {recall && shown ? (
              card.source && <p className="mt-2 text-xs text-muted">{card.source}</p>
            ) : shown ? (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-[22px] font-semibold text-accent">{card.vi || 'No definition yet. Add one on the Vocabulary page.'}</p>
                {card.source && <p className="mt-2 text-xs text-muted">{card.source}</p>}
              </div>
            ) : (
              <p className="mt-8 text-sm text-muted">
                {recall ? 'Type the word and press Enter. Exact spelling is required to mark Good.' : 'Recall the meaning before flipping the card.'}
              </p>
            )}
          </div>

          <div className="mt-5">
            {shown ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map(({ g, label, tone }, i) => (
                  <button
                    key={g}
                    onClick={() => grade(g)}
                    // Require exact spelling to mark Good/Easy
                    disabled={recall && !typedRight && g >= 2}
                    className={`rounded-xl border bg-surface px-2 py-3 text-center transition-colors disabled:opacity-35 ${tone}`}
                  >
                    <div className="font-semibold">{label}</div>
                    <div className="mt-0.5 text-[11px] opacity-70">{preview(card.srs, g)}</div>
                    <div className="mt-1 hidden text-[10px] text-muted sm:block">key {i + 1}</div>
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn-primary w-full py-3 text-[15px]" onClick={() => setShown(true)}>
                {recall ? 'Check' : 'Show answer'} <span className="text-xs font-normal opacity-70">({recall ? 'Enter' : 'Space'})</span>
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="card mt-8 px-6 py-12 text-center">
          <HedgehogMascot pose="celebrate" size={92} className="mx-auto mb-3" />
          <p className="font-serif text-[28px] font-semibold">{done ? 'Review complete.' : 'No cards due right now.'}</p>
          {done > 0 && (
            <p className="mt-2 text-ink-2">
              Reviewed {done} {done === 1 ? 'card' : 'cards'} · {Math.round((remembered / done) * 100)}% recalled
              {bestCombo >= 3 ? ` · best streak ${bestCombo}` : ''}
            </p>
          )}
          {remainingPlan && remainingPlan.queue.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              {remainingPlan.queue.length} more due {remainingPlan.queue.length === 1 ? 'card' : 'cards'} ready if you’d like to keep going.
            </p>
          )}
          {remainingPlan && remainingPlan.queue.length === 0 && remainingPlan.deferredNewCount > 0 && (
            <p className="mt-2 text-sm text-muted">
              Today’s new-card pace is complete — {remainingPlan.deferredNewCount} more new {remainingPlan.deferredNewCount === 1 ? 'word is' : 'words are'} saved for tomorrow so you don’t burn out.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/" className="btn-primary">
              Back to Today
            </Link>
            {remainingPlan && remainingPlan.queue.length > 0 && (
              <button className="btn-ghost" onClick={() => startExtraBatch({})}>
                <Sparkles size={15} /> Finish remaining ({remainingPlan.queue.length})
              </button>
            )}
            {remainingPlan && remainingPlan.queue.length === 0 && remainingPlan.deferredNewCount > 0 && (
              <button className="btn-ghost" onClick={() => startExtraBatch({ extraNew: 10 })}>
                <Sparkles size={15} /> Learn +{Math.min(10, remainingPlan.deferredNewCount)} extra new
              </button>
            )}
            <Link href="/vocab" className="btn-ghost">
              View vocabulary
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
