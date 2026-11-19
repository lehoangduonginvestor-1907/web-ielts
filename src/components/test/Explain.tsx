'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Headphones, Quote, Sparkles } from 'lucide-react';
import type { Explanation, Skill } from '@/lib/types';
import { md } from '@/lib/markup';

export interface ExplainContext {
  qNum: number;
  prompt?: string;
  userAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
  skill?: Skill;
}

// Explanation card: evidence → gloss → why → paraphrase → trap → dive deeper with Gemini
export default function Explain({
  ex,
  onLocate,
  locateLabel = 'Locate in passage',
  onReplay,
  context,
}: {
  ex?: Explanation;
  onLocate?: () => void;
  locateLabel?: string;
  onReplay?: () => void;
  context?: ExplainContext;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fallbackPrompt, setFallbackPrompt] = useState<string | null>(null);

  if (!ex) return <p className="mt-3 text-sm text-muted">No detailed explanation is available for this question yet.</p>;

  const copyChip = async (id: string, text: string) => {
    setFallbackPrompt(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(cur => (cur === id ? null : cur));
      }, 2500);
    } catch {
      setFallbackPrompt(text);
    }
  };

  const chips: { id: string; label: string; prompt: string }[] = [];
  if (ex.evidence) {
    chips.push({
      id: 'grammar',
      label: 'Copy prompt: Analyze evidence grammar',
      prompt: `Break down the grammar of this IELTS ${context?.skill === 'listening' ? 'Listening' : 'Reading'} evidence sentence in clear, learner-friendly English (identify the main clause, subordinate or reduced clauses, key grammar structures, and 2–3 high-value academic words or collocations):\n\n"${ex.evidence}"`,
    });
  }
  if (context && !context.isCorrect) {
    chips.push({
      id: 'why-wrong',
      label: 'Copy prompt: Why was my answer wrong?',
      prompt: `I missed Question ${context.qNum} (${context.skill === 'listening' ? 'IELTS Listening' : 'IELTS Reading'}). Explain the distractor or reasoning trap behind my answer and how to avoid it next time:\n- Question: ${context.prompt || '(see on page)'}\n- My answer: ${context.userAnswer?.trim() || 'blank'}\n- Correct answer: ${context.correctAnswer}${ex.evidence ? `\n- Evidence: "${ex.evidence}"` : ''}${ex.trap ? `\n- Trap note: ${ex.trap}` : ''}`,
    });
  }
  if (ex.para?.length || ex.evidence) {
    const pairs = ex.para?.length
      ? `\nParaphrase pairs in this question:\n${ex.para.map(([q, p]) => `- "${q}" ≈ "${p}"`).join('\n')}`
      : '';
    chips.push({
      id: 'paraphrase',
      label: 'Copy prompt: Expand paraphrase pairs',
      prompt: `Explain the synonym and paraphrase pairs in this IELTS question in more depth, and give one natural example sentence for each so I can reuse them in IELTS Writing and Speaking:${pairs}${ex.evidence ? `\n\nEvidence sentence: "${ex.evidence}"` : ''}`,
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line bg-paper/70 p-4 text-[14.5px] leading-relaxed">
      {ex.evidence && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">Evidence</span>
            <span className="flex items-center gap-3">
              {onReplay && (
                <button onClick={onReplay} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                  <Headphones size={13} /> Replay clip
                </button>
              )}
              {onLocate && (
                <button onClick={onLocate} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                  {locateLabel} <ArrowUpRight size={13} />
                </button>
              )}
            </span>
          </div>
          <blockquote className="mt-1.5 flex gap-2 font-serif text-[15px] text-ink">
            <Quote size={14} className="mt-1 shrink-0 text-muted" />
            <span>{ex.evidence}</span>
          </blockquote>
          {ex.vi && <p className="mt-1 pl-[22px] text-ink-2 italic">{ex.vi}</p>}
        </div>
      )}
      <div>
        <span className="eyebrow">Why</span>
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
          <span className="eyebrow text-ember">Trap</span>
          <p className="mt-0.5 text-ink-2">{md(ex.trap)}</p>
        </div>
      )}
      {chips.length > 0 && (
        <div className="border-t border-line pt-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted uppercase">
            <Sparkles size={12} className="text-accent" /> Dive deeper with Gemini
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map(ch => {
              const copied = copiedId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => void copyChip(ch.id, ch.prompt)}
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    copied
                      ? 'border-good bg-good-soft text-good'
                      : 'border-line-strong bg-surface text-ink-2 hover:border-accent hover:text-accent'
                  }`}
                >
                  {copied && <Check size={12} />}
                  {copied ? 'Copied — paste into Gemini' : ch.label}
                </button>
              );
            })}
          </div>
          {fallbackPrompt && (
            <div className="mt-2 rounded-md border border-line bg-surface p-2 text-xs">
              <p className="text-ink-2">Clipboard access was blocked — press Ctrl+C to copy the prompt below:</p>
              <textarea
                readOnly
                rows={3}
                value={fallbackPrompt}
                onFocus={e => e.currentTarget.select()}
                className="field mt-1 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
