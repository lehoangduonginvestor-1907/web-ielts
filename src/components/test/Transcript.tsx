'use client';

import { useEffect, useRef } from 'react';
import type { ScriptSegment } from '@/lib/types';
import { findRange } from '@/lib/markup';

// Transcript của một phần nghe; câu dẫn chứng được tô xanh và cuộn tới
export default function Transcript({ script, evidence }: { script: ScriptSegment[]; evidence?: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (evidence) box.current?.querySelector('mark.ev')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [evidence]);

  if (!script.length) return <p className="text-sm text-muted">Chưa có transcript cho phần này.</p>;

  return (
    <div ref={box} className="space-y-3 font-serif text-[15.5px] leading-relaxed">
      {script.map((s, i) => {
        const r = findRange(s.text, evidence ?? undefined);
        return (
          <div key={i} className={s.speaker ? 'grid grid-cols-[5.5rem_1fr] gap-3' : ''}>
            {s.speaker && <span className="pt-0.5 font-sans text-[11px] font-bold tracking-wider text-muted">{s.speaker}</span>}
            <p>
              {r ? (
                <>
                  {s.text.slice(0, r[0])}
                  <mark className="ev">{s.text.slice(r[0], r[1])}</mark>
                  {s.text.slice(r[1])}
                </>
              ) : (
                s.text
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
