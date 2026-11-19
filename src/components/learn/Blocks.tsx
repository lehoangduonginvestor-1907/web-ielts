'use client';

import React, { useState } from 'react';
import { BookMarked, Check, Lightbulb, ListOrdered, TriangleAlert, X } from 'lucide-react';
import type { Block, BoxKind } from '@/lib/learnParse';
import { playSfx } from '@/lib/sfx';
import { MascotBadge } from '../Mascots';

// Inline formatting: **bold**, *italic*, [[underline]] (focus span), ~~strike~~, ____ (blank)
const TOKEN = /(\*\*.+?\*\*|\[\[.+?\]\]|~~.+?~~|\*[^*\s][^*]*?\*|_{4,})/g;

export function Inline({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}><Inline text={part.slice(2, -2)} /></strong>;
        if (part.startsWith('[[') && part.endsWith(']]')) return <u key={i} className="decoration-accent decoration-2 underline-offset-[3px]"><Inline text={part.slice(2, -2)} /></u>;
        if (part.startsWith('~~') && part.endsWith('~~')) return <s key={i} className="text-muted"><Inline text={part.slice(2, -2)} /></s>;
        if (/^_{4,}$/.test(part)) return <span key={i} className="lesson-blank" aria-label="blank" />;
        if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}><Inline text={part.slice(1, -1)} /></em>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

const BOX: Record<BoxKind, { label: string; icon: React.ReactNode }> = {
  rule: { label: 'Rule', icon: <BookMarked size={16} /> },
  tip: { label: 'Tip', icon: <Lightbulb size={16} /> },
  trap: { label: 'Watch out', icon: <TriangleAlert size={16} /> },
  note: { label: 'Key takeaway', icon: <BookMarked size={16} /> },
  steps: { label: 'Steps', icon: <ListOrdered size={16} /> },
};

export function Blocks({ blocks, onCheck }: { blocks: Block[]; onCheck: (n: number, correct: boolean) => void }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h2':
            return <h2 key={i}><Inline text={b.text} /></h2>;
          case 'h3':
            return <h3 key={i}><Inline text={b.text} /></h3>;
          case 'p':
            return <p key={i}><Inline text={b.text} /></p>;
          case 'ul':
            return <ul key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>;
          case 'ol':
            return <ol key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ol>;
          case 'table':
            return (
              <div key={i} className="lesson-table scroll-thin">
                <table>
                  <thead>
                    <tr>{b.head.map((h, j) => <th key={j}><Inline text={h} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>{r.map((c, k) => <td key={k}><Inline text={c} /></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'box':
            return (
              <aside key={i} className={`lesson-box is-${b.kind}`}>
                <div className="lesson-box-title">
                  {BOX[b.kind].icon}
                  <span>{b.title || BOX[b.kind].label}</span>
                </div>
                <Blocks blocks={b.blocks} onCheck={onCheck} />
              </aside>
            );
          case 'examples':
            return (
              <ul key={i} className="lesson-examples">
                {b.items.map((ex, j) => (
                  <li key={j} className={ex.ok ? 'is-ok' : 'is-bad'}>
                    <span className="lesson-ex-icon" aria-label={ex.ok ? 'Correct' : 'Incorrect'}>
                      {ex.ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                    </span>
                    <div>
                      <div className="font-serif"><Inline text={ex.text} /></div>
                      {ex.note && <div className="lesson-ex-note"><Inline text={ex.note} /></div>}
                    </div>
                  </li>
                ))}
              </ul>
            );
          case 'check':
            return <QuickCheck key={i} b={b} onResult={c => onCheck(b.n, c)} />;
        }
      })}
    </>
  );
}

// Inline quick-check question: pick → Check → show feedback + explanation
function QuickCheck({ b, onResult }: { b: Extract<Block, { t: 'check' }>; onResult: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === b.answer;
  return (
    <div className="not-lesson my-6 rounded-xl border border-line-strong bg-paper/60 p-4 sm:p-5">
      <div className="eyebrow mb-2 text-accent">Quick Check {b.n}</div>
      <div className="mb-4 space-y-2 font-serif text-[16px] leading-relaxed">
        {b.prompt.map((line, i) => (
          <p key={i}><Inline text={line} /></p>
        ))}
      </div>
      <div className="space-y-2" role="radiogroup" aria-label={`Quick Check ${b.n}`}>
        {b.options.map((option, i) => {
          const tone = checked
            ? i === b.answer
              ? 'border-good bg-good-soft'
              : i === picked
                ? 'border-bad bg-bad-soft'
                : 'border-line'
            : i === picked
              ? 'border-accent bg-accent-soft'
              : 'border-line hover:border-line-strong hover:bg-sunk/50';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={checked}
              onClick={() => setPicked(i)}
              className={`flex w-full items-start gap-3 rounded-lg border bg-surface px-3 py-2 text-left text-[15px] transition-colors disabled:cursor-default ${tone}`}
            >
              <span className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${picked === i ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2'}`}>
                {'ABCDEF'[i]}
              </span>
              <span><Inline text={option} /></span>
            </button>
          );
        })}
      </div>
      {!checked ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn-primary"
            disabled={picked === null}
            onClick={() => {
              setChecked(true);
              if (picked === b.answer) playSfx('tick');
              onResult(picked === b.answer);
            }}
          >
            Check
          </button>
        </div>
      ) : (
        <div className={`mt-4 rounded-lg px-4 py-3 text-[14.5px] leading-relaxed ${correct ? 'bg-good-soft' : 'bg-bad-soft'}`} role="status">
          <div className={`mb-1 flex items-center gap-2 font-bold ${correct ? 'text-good' : 'text-bad'}`}>
            <MascotBadge character="seal" variant="skills" size={24} />
            {correct ? <Check size={17} /> : <X size={17} />}
            {correct ? 'Spot on!' : `Not quite. The answer is ${'ABCDEF'[b.answer]}.`}
          </div>
          <Inline text={b.explanation} />
          {!correct && (
            <div className="mt-2">
              <button
                type="button"
                className="text-sm font-semibold text-accent hover:underline"
                onClick={() => {
                  setChecked(false);
                  setPicked(null);
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
