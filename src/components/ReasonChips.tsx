'use client';

import { REASONS } from '@/lib/reasons';
import { setMistakeReason, useStore } from '@/lib/store';

// "Why did I miss this?" reason chip selector for Mistake Log items. Hidden if not logged.
export default function ReasonChips({ mistakeKey, label }: { mistakeKey: string; label?: string }) {
  const store = useStore();
  const m = store?.mistakes[mistakeKey];
  if (!m) return null;
  return (
    <div className="mt-3">
      {label && <p className="mb-1.5 text-xs font-semibold text-ink-2">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map(r => (
          <button
            key={r.k}
            type="button"
            title={r.hint}
            aria-pressed={m.reason === r.k}
            onClick={() => setMistakeReason(mistakeKey, m.reason === r.k ? undefined : r.k)}
            className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors ${
              m.reason === r.k ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:bg-sunk'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
