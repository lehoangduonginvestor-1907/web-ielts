'use client';

import { ArrowUpRight, Quote } from 'lucide-react';
import type { Explanation } from '@/lib/types';
import { md } from '@/lib/markup';

// Thẻ lời giải của một câu: dẫn chứng → dịch → vì sao → paraphrase → bẫy
export default function Explain({ ex, onLocate, locateLabel = 'Xem trong bài' }: { ex?: Explanation; onLocate?: () => void; locateLabel?: string }) {
  if (!ex) return <p className="mt-3 text-sm text-muted">Câu này chưa có lời giải chi tiết.</p>;
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line bg-paper/70 p-4 text-[14.5px] leading-relaxed">
      {ex.evidence && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">Dẫn chứng</span>
            {onLocate && (
              <button onClick={onLocate} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                {locateLabel} <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          <blockquote className="mt-1.5 flex gap-2 font-serif text-[15px] text-ink">
            <Quote size={14} className="mt-1 shrink-0 text-muted" />
            <span>{ex.evidence}</span>
          </blockquote>
          {ex.vi && <p className="mt-1 pl-[22px] text-ink-2 italic">{ex.vi}</p>}
        </div>
      )}
      <div>
        <span className="eyebrow">Vì sao</span>
        <p className="mt-1 text-ink-2">{md(ex.why)}</p>
      </div>
      {ex.para && ex.para.length > 0 && (
        <div>
          <span className="eyebrow">Paraphrase</span>
          <ul className="mt-1.5 space-y-1">
            {ex.para.map(([q, p], i) => (
              <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 text-[13.5px]">
                <span className="rounded bg-sunk px-1.5 py-0.5 text-ink-2">{q}</span>
                <span className="text-muted">≈</span>
                <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent-2">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ex.trap && (
        <div className="rounded-md border-l-[3px] border-ember bg-ember-soft/60 px-3 py-2">
          <span className="eyebrow text-ember">Bẫy</span>
          <p className="mt-0.5 text-ink-2">{md(ex.trap)}</p>
        </div>
      )}
    </div>
  );
}
