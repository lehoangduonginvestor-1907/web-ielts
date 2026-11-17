'use client';

import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { Answers, Explanation, Group, Question, Skill } from '@/lib/types';
import { parseTemplate, type Piece } from '@/lib/markup';
import { correctDisplay, overLimit, shownAnswer, wordLimit } from '@/lib/scoring';
import { mistakeKey } from '@/lib/store';
import ReasonChips from '../ReasonChips';
import Explain from './Explain';

export interface ReviewInfo {
  results: Record<number, boolean>;
}

interface Props {
  g: Group;
  answers: Answers;
  onAnswer?: (n: number, v: string | string[]) => void;
  review?: ReviewInfo;
  focus?: number[];
  onLocate?: (ex: Explanation) => void;
  locateLabel?: string;
  reasonFor?: { testId: string; skill: Skill }; // xem lại: cho gắn lý do sai ngay dưới lời giải
  wordGuard?: boolean; // luyện tập: nhắc khi gõ quá số từ đề cho phép
  onReplay?: (ex: Explanation) => void; // xem lại bài nghe: phát lại đúng đoạn dẫn chứng
}

const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YNNG = ['YES', 'NO', 'NOT GIVEN'];

export default function GroupView(p: Props) {
  const { g } = p;
  const body = <GroupBody {...p} />;
  return (
    <section className="@container mb-10" aria-label={`Questions ${g.from}–${g.to}`}>
      <header className="mb-4">
        <h3 className="text-[15px] font-bold tracking-tight">
          Questions {g.from}
          {g.to > g.from ? `–${g.to}` : ''}
        </h3>
        <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-line text-ink-2">{g.instructions}</p>
      </header>

      {g.image ? (
        // Bản đồ / sơ đồ: đủ rộng thì hình đứng yên bên trái, câu hỏi cuộn bên phải
        <div className={g.kind === 'match' ? 'grid gap-5 @2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @2xl:items-start' : ''}>
          <Figure g={g} sticky={g.kind === 'match'} />
          <div>{body}</div>
        </div>
      ) : (
        body
      )}
    </section>
  );
}

function Figure({ g, sticky }: { g: Group; sticky: boolean }) {
  const [zoom, setZoom] = useState(false);
  const src = `/api/image/${g.image}`;
  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        title="Bấm để phóng to"
        className={`mb-5 block w-full cursor-zoom-in overflow-hidden rounded-lg border border-line-strong bg-white p-2 ${sticky ? '@2xl:sticky @2xl:top-28 @2xl:mb-0' : ''}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Hình cho Questions ${g.from}–${g.to}`} className="mx-auto max-h-[70dvh] w-auto max-w-full" />
      </button>
      {zoom && (
        <div className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-ink/70 p-3" onClick={() => setZoom(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="max-h-full max-w-full rounded-lg bg-white p-2" />
        </div>
      )}
    </>
  );
}

function GroupBody(p: Props) {
  const { g } = p;
  return (
    <>
      {g.options?.some(o => o.text) && g.kind !== 'multi' && <OptionBox g={g} />}

      {g.kind === 'gap' && <GapGroup {...p} />}
      {g.kind === 'mcq' && g.questions.map(q => <McqQuestion key={q.n} q={q} {...p} />)}
      {g.kind === 'multi' && <MultiGroup {...p} />}
      {(g.kind === 'tfng' || g.kind === 'ynng') &&
        g.questions.map(q => <ChoiceRow key={q.n} q={q} choices={g.kind === 'tfng' ? TFNG : YNNG} {...p} />)}
      {g.kind === 'match' && (
        <>
          {g.title && <p className="mb-3 font-semibold">{g.title}</p>}
          {g.questions.map(q => (
            <ChoiceRow key={q.n} q={q} choices={(g.options ?? []).map(o => o.key)} compact {...p} />
          ))}
        </>
      )}
    </>
  );
}

function OptionBox({ g }: { g: Group }) {
  return (
    <div className="mb-5 rounded-lg border border-line-strong bg-surface px-4 py-3">
      {g.optionsTitle && <p className="mb-2 text-center text-[14px] font-bold">{g.optionsTitle}</p>}
      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {g.options!.map(o => (
          <li key={o.key} className="flex gap-2.5 text-[14.5px]">
            <span className="w-4 shrink-0 font-bold">{o.key}</span>
            <span className="text-ink-2">{o.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Trạng thái đúng/sai + lời giải của một câu ----------

function ReviewLine({ g, q, p }: { g: Group; q: Question; p: Props }) {
  const ok = p.review!.results[q.n];
  const mine = shownAnswer(g, q.n, p.answers);
  const [open, setOpen] = useState(!ok);
  const inFocus = !p.focus?.length || p.focus.includes(q.n);
  if (!inFocus) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13.5px] ${ok ? 'bg-good-soft' : 'bg-bad-soft'}`}
      >
        {ok ? <Check size={15} className="text-good" /> : <X size={15} className="text-bad" />}
        <span className="num font-bold">{q.n}</span>
        <span className="min-w-0 flex-1 truncate">
          {ok ? (
            <span className="text-good">{correctDisplay(g, q.n)}</span>
          ) : (
            <>
              <span className="text-bad line-through decoration-1">{mine || 'bỏ trống'}</span>
              <span className="mx-1.5 text-muted">→</span>
              <span className="font-semibold text-good">{correctDisplay(g, q.n)}</span>
            </>
          )}
        </span>
        <span className="text-xs text-muted">{open ? 'Ẩn' : 'Giải thích'}</span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <Explain
          ex={q.explain}
          onLocate={q.explain?.evidence && p.onLocate ? () => p.onLocate!(q.explain!) : undefined}
          locateLabel={p.locateLabel}
          onReplay={q.explain?.evidence && p.onReplay ? () => p.onReplay!(q.explain!) : undefined}
        />
      )}
      {open && !ok && p.reasonFor && <ReasonChips mistakeKey={mistakeKey(p.reasonFor.testId, p.reasonFor.skill, q.n)} label="Vì sao câu này sai?" />}
    </div>
  );
}

const disabledFor = (p: Props, n: number) => !p.onAnswer || (!!p.focus?.length && !p.focus.includes(n));

// ---------- Điền từ ----------

function GapGroup(p: Props) {
  const { g } = p;
  const blocks = parseTemplate(g.template ?? '');
  const withOptions = !!g.options?.length;
  const limit = p.wordGuard && !withOptions ? wordLimit(g.instructions) : null;
  // Enter: sang ô điền từ kế tiếp trên trang
  const nextOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const all = [...document.querySelectorAll<HTMLInputElement>('input.gap-input:not([disabled])')];
    all[all.indexOf(e.currentTarget) + 1]?.focus();
  };

  const renderPiece = (piece: Piece, i: number) => {
    if (typeof piece === 'string') return <span key={i}>{piece}</span>;
    const n = piece.gap;
    const v = (p.answers[n] as string) ?? '';
    const state = p.review ? (p.review.results[n] ? 'is-right' : 'is-wrong') : '';
    const dim = p.focus?.length && !p.focus.includes(n) ? 'opacity-40' : '';
    return (
      <span key={i} id={`q-${n}`} className={`inline-flex scroll-mt-28 items-baseline ${dim}`}>
        {withOptions ? (
          <select
            aria-label={`Question ${n}`}
            className={`gap-input min-w-[5.5rem] cursor-pointer ${state}`}
            value={v}
            disabled={disabledFor(p, n)}
            onChange={e => p.onAnswer?.(n, e.target.value)}
          >
            <option value="">{n}</option>
            {g.options!.map(o => (
              <option key={o.key} value={o.key}>
                {o.key}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              aria-label={`Question ${n}`}
              className={`gap-input ${state} ${overLimit(v, limit) ? 'is-over' : ''}`}
              value={v}
              placeholder={`${n}`}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              enterKeyHint="next"
              disabled={disabledFor(p, n)}
              onChange={e => p.onAnswer?.(n, e.target.value)}
              onKeyDown={nextOnEnter}
            />
            {overLimit(v, limit) && (
              <span role="status" className="mr-1 rounded bg-ember-soft px-1.5 text-[11px] font-semibold whitespace-nowrap text-ember">
                quá {limit!.words} từ{limit!.number ? ' + 1 số' : ''}
              </span>
            )}
          </>
        )}
      </span>
    );
  };

  return (
    <>
      <div className="rounded-lg border border-line bg-surface px-5 py-4 text-[15px] leading-[2.15]">
        {blocks.map((b, i) => {
          if (b.kind === 'table') {
            return (
              <div key={i} className="scroll-thin my-2 overflow-x-auto">
                <table className="w-full border-collapse text-[14.5px] leading-snug">
                  <thead>
                    <tr>
                      {b.rows[0].map((c, k) => (
                        <th key={k} className="border border-line-strong bg-sunk/60 px-3 py-2 text-left font-semibold">
                          {c.map(renderPiece)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.slice(1).map((r, ri) => (
                      <tr key={ri}>
                        {r.map((c, k) => (
                          <td key={k} className="border border-line-strong px-3 py-2 align-top">
                            {c.map(renderPiece)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          const content = b.pieces.map(renderPiece);
          switch (b.kind) {
            case 'h1':
              return <p key={i} className="mb-1 text-center text-[16px] font-bold">{content}</p>;
            case 'h2':
              return <p key={i} className="mt-2 font-bold">{content}</p>;
            case 'label':
              return <p key={i} className="mt-1 font-semibold italic">{content}</p>;
            case 'li':
              return (
                <p key={i} className="relative pl-5 before:absolute before:left-1 before:text-muted before:content-['•']">
                  {content}
                </p>
              );
            case 'li2':
              return (
                <p key={i} className="relative pl-10 before:absolute before:left-6 before:text-muted before:content-['–']">
                  {content}
                </p>
              );
            default:
              return b.pieces.length ? <p key={i}>{content}</p> : <div key={i} className="h-2" />;
          }
        })}
      </div>
      {p.review && (
        <div className="mt-3">
          {g.questions.map(q => (
            <ReviewLine key={q.n} g={g} q={q} p={p} />
          ))}
        </div>
      )}
    </>
  );
}

// ---------- Trắc nghiệm một đáp án ----------

function McqQuestion({ q, ...p }: Props & { q: Question }) {
  const v = p.answers[q.n] as string | undefined;
  const disabled = disabledFor(p, q.n);
  const dim = p.focus?.length && !p.focus.includes(q.n) ? 'opacity-40' : '';
  return (
    <div id={`q-${q.n}`} className={`mb-6 scroll-mt-28 ${dim}`}>
      <p className="flex gap-3 text-[15px] leading-relaxed">
        <span className="qnum mt-0.5 shrink-0">{q.n}</span>
        <span className="font-medium">{q.prompt}</span>
      </p>
      <div className="mt-2.5 space-y-1.5 pl-[2.35rem]">
        {q.options!.map(o => {
          const chosen = v === o.key;
          const isKey = p.review && q.answer.includes(o.key);
          const tone = p.review
            ? isKey
              ? 'border-good bg-good-soft'
              : chosen
                ? 'border-bad bg-bad-soft'
                : 'border-line'
            : chosen
              ? 'border-accent bg-accent-soft'
              : 'border-line hover:border-line-strong hover:bg-sunk/50';
          return (
            <button
              key={o.key}
              disabled={disabled}
              onClick={() => p.onAnswer?.(q.n, chosen ? '' : o.key)}
              className={`flex w-full items-start gap-3 rounded-lg border bg-surface px-3 py-2 text-left text-[14.5px] transition-colors disabled:cursor-default ${tone}`}
            >
              <span
                className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                  chosen ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2'
                }`}
              >
                {o.key}
              </span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {p.review && (
        <div className="pl-[2.35rem]">
          <ReviewLine g={p.g} q={q} p={p} />
        </div>
      )}
    </div>
  );
}

// ---------- Chọn HAI đáp án ----------

function MultiGroup(p: Props) {
  const { g } = p;
  const picked = (p.answers[g.from] as string[] | undefined) ?? [];
  const pick = g.pick ?? 2;
  const disabled = disabledFor(p, g.from) && disabledFor(p, g.to);
  const key = new Set(g.questions[0].answer);
  const toggle = (k: string) => {
    if (!p.onAnswer) return;
    const next = picked.includes(k) ? picked.filter(x => x !== k) : picked.length < pick ? [...picked, k] : [...picked.slice(1), k];
    p.onAnswer(g.from, next.sort());
  };
  return (
    <div id={`q-${g.from}`} className="scroll-mt-28">
      <span id={`q-${g.to}`} />
      <p className="flex gap-3 text-[15px] leading-relaxed">
        <span className="qnum mt-0.5 shrink-0">
          {g.from}–{g.to}
        </span>
        <span className="font-medium">{g.prompt}</span>
      </p>
      <p className="mt-1 pl-[3.3rem] text-xs text-muted">
        Đã chọn {picked.length}/{pick}
        {!!p.focus?.length && !p.review && ` · làm lại: chấm cả nhóm, cần đúng cả ${pick} đáp án mới gạch được câu khỏi Sổ lỗi`}
      </p>
      <div className="mt-2 space-y-1.5 pl-[3.3rem]">
        {g.options!.map(o => {
          const chosen = picked.includes(o.key);
          const tone = p.review
            ? key.has(o.key)
              ? 'border-good bg-good-soft'
              : chosen
                ? 'border-bad bg-bad-soft'
                : 'border-line'
            : chosen
              ? 'border-accent bg-accent-soft'
              : 'border-line hover:border-line-strong hover:bg-sunk/50';
          return (
            <button
              key={o.key}
              disabled={disabled}
              onClick={() => toggle(o.key)}
              className={`flex w-full items-start gap-3 rounded-lg border bg-surface px-3 py-2 text-left text-[14.5px] transition-colors disabled:cursor-default ${tone}`}
            >
              <span
                className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-bold ${
                  chosen ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2'
                }`}
              >
                {o.key}
              </span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {p.review && (
        <div className="pl-[3.3rem]">
          {g.questions.map(q => (
            <ReviewLine key={q.n} g={g} q={q} p={p} />
          ))}
        </div>
      )}
      <div className="h-6" />
    </div>
  );
}

// ---------- TRUE/FALSE/NOT GIVEN, YES/NO, nối thông tin ----------

function ChoiceRow({ q, choices, compact, ...p }: Props & { q: Question; choices: string[]; compact?: boolean }) {
  const v = p.answers[q.n] as string | undefined;
  const disabled = disabledFor(p, q.n);
  const dim = p.focus?.length && !p.focus.includes(q.n) ? 'opacity-40' : '';
  return (
    <div id={`q-${q.n}`} className={`mb-5 scroll-mt-28 ${dim}`}>
      <p className="flex gap-3 text-[15px] leading-relaxed">
        <span className="qnum mt-0.5 shrink-0">{q.n}</span>
        <span>{q.prompt}</span>
      </p>
      <div className={`mt-2 flex flex-wrap gap-1.5 pl-[2.35rem]`}>
        {choices.map(c => {
          const chosen = v === c;
          const isKey = p.review && q.answer.includes(c);
          const tone = p.review
            ? isKey
              ? 'border-good bg-good-soft text-good'
              : chosen
                ? 'border-bad bg-bad-soft text-bad'
                : 'border-line text-muted'
            : chosen
              ? 'border-ink bg-ink text-paper'
              : 'border-line-strong bg-surface text-ink-2 hover:bg-sunk';
          return (
            <button
              key={c}
              disabled={disabled}
              onClick={() => p.onAnswer?.(q.n, chosen ? '' : c)}
              className={`rounded-md border font-semibold transition-colors disabled:cursor-default ${
                compact ? 'min-w-9 px-2 py-1 text-[13px]' : 'px-3 py-1 text-[12.5px] tracking-wide'
              } ${tone}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {p.review && (
        <div className="pl-[2.35rem]">
          <ReviewLine g={p.g} q={q} p={p} />
        </div>
      )}
    </div>
  );
}
