'use client';

import { useState } from 'react';
import { Volume2, X } from 'lucide-react';
import type { VocabItem } from '@/lib/types';
import { addWord } from '@/lib/store';
import { speak } from '@/lib/speech';

// Hộp lưu một từ vào bộ thẻ, kèm câu ngữ cảnh lấy từ bài
export default function SaveWord({
  word: initial,
  context,
  source,
  suggestion,
  onClose,
}: {
  word: string;
  context: string;
  source: string;
  suggestion?: VocabItem;
  onClose: () => void;
}) {
  const [word, setWord] = useState(suggestion?.word ?? initial);
  const [vi, setVi] = useState(suggestion?.vi ?? '');
  const [done, setDone] = useState<'saved' | 'exists' | null>(null);

  const save = () => {
    const ok = addWord({ word, vi, pos: suggestion?.pos, context, source });
    setDone(ok ? 'saved' : 'exists');
    if (ok) setTimeout(onClose, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center" onMouseDown={onClose}>
      <div className="card w-full max-w-md p-5" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="eyebrow">Save to vocabulary</span>
          <button className="btn-quiet -mr-2" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input className="field font-serif text-lg font-semibold" value={word} onChange={e => setWord(e.target.value)} />
          <button className="btn-ghost px-3" onClick={() => speak(word)} aria-label="Listen to pronunciation">
            <Volume2 size={16} />
          </button>
        </div>
        <input
          className="field mt-2"
          placeholder="Meaning / definition"
          value={vi}
          autoFocus={!vi}
          onChange={e => setVi(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
        />
        {context && <p className="mt-3 rounded-md bg-paper px-3 py-2 font-serif text-[14px] text-ink-2 italic">“{context}”</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          {done === 'exists' && <span className="mr-auto text-sm text-muted">Already in your deck.</span>}
          {done === 'saved' && <span className="mr-auto text-sm text-good">Saved.</span>}
          <button className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={!word.trim()}>
            Save word
          </button>
        </div>
      </div>
    </div>
  );
}
