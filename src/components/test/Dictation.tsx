'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Headphones, RotateCcw, X } from 'lucide-react';
import { logSeconds } from '@/lib/store';

export interface DictationItem {
  n: number; // số câu hỏi
  audio: string; // đường dẫn /api/audio/...
  start: number;
  end: number;
  text: string; // câu dẫn chứng trong transcript
}

const words = (s: string) => s.split(/\s+/).filter(Boolean);
const norm = (w: string) =>
  w
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9']/g, '');

// So khớp từ (LCS): đánh dấu từ nào của câu gốc đã được chép đúng
function compare(target: string[], typed: string[]) {
  const a = target.map(norm);
  const b = typed.map(norm).filter(Boolean);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] && a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array<boolean>(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] && a[i] === b[j]) {
      hit[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // dấu câu đứng riêng (vd. "–") không tính
  const counted = a.map(x => !!x);
  return { hit, ok: hit.filter((h, k) => h && counted[k]).length, all: counted.filter(Boolean).length };
}

// Chép chính tả câu dẫn chứng của các câu nghe sai: nghe lại đúng đoạn đó, gõ những gì nghe được, so với transcript.
export default function Dictation({ items, onClose }: { items: DictationItem[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState(false);
  const [slow, setSlow] = useState(false);
  const [plays, setPlays] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const stopAt = useRef(0);
  const opened = useRef(0);
  const item = items[idx];

  // Tính thời gian luyện vào phút học trong ngày
  useEffect(() => {
    const t0 = Date.now();
    opened.current = t0;
    return () => logSeconds((Date.now() - t0) / 1000);
  }, []);

  const play = () => {
    const el = audio.current;
    if (!el || !item) return;
    stopAt.current = item.end + 0.35;
    el.playbackRate = slow ? 0.75 : 1;
    const go = () => {
      el.currentTime = Math.max(0, item.start - 0.3);
      void el.play();
    };
    if (el.readyState < 1) el.addEventListener('loadedmetadata', go, { once: true });
    else go();
    setPlays(p => p + 1);
  };

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    let id = 0;
    const tick = () => {
      if (!el.paused && el.currentTime >= stopAt.current) el.pause();
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [idx]);

  if (!item) return null;
  const target = words(item.text);
  const res = checked ? compare(target, words(typed)) : null;

  const next = () => {
    setIdx(i => i + 1);
    setTyped('');
    setChecked(false);
    setPlays(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onMouseDown={onClose}>
      <div className="card w-full max-w-xl p-5 sm:p-6" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">
            Dictation · Q{item.n} · {idx + 1}/{items.length}
          </p>
          <button className="btn-quiet -mr-2" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="mt-2 text-sm text-ink-2">Listen to the clip containing the answer you missed and type what you hear as closely as you can. Replay it as many times as you need.</p>
        <audio ref={audio} src={item.audio} preload="metadata" />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={play}>
            <Headphones size={16} /> {plays ? 'Replay' : 'Play'}
          </button>
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            <input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)} /> Slow (0.75×)
          </label>
          {plays > 0 && (
            <span className="num ml-auto text-xs text-muted">
              played {plays} {plays === 1 ? 'time' : 'times'}
            </span>
          )}
        </div>
        <textarea
          className="field mt-3 min-h-24 font-serif text-[16px] leading-relaxed"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          disabled={checked}
          placeholder="Type what you hear…"
          spellCheck={false}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) setChecked(true);
          }}
        />
        {res && (
          <div className="mt-3 rounded-lg border border-line bg-paper/70 p-3">
            <p className="font-serif text-[16px] leading-relaxed">
              {target.map((w, k) => (
                <span key={k} className={res.hit[k] ? 'text-good' : 'font-semibold text-bad underline decoration-bad/60 underline-offset-2'}>
                  {w}{' '}
                </span>
              ))}
            </p>
            <p className="num mt-2 text-sm text-ink-2">
              {res.ok}/{res.all} words matched. Red words were missed or misspelled — replay the clip and listen closely for them.
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {!checked ? (
            <button className="btn-ghost" disabled={!typed.trim()} onClick={() => setChecked(true)}>
              <Check size={16} /> Check transcript
            </button>
          ) : (
            <button
              className="btn-ghost"
              onClick={() => {
                setChecked(false);
                setTyped('');
              }}
            >
              <RotateCcw size={15} /> Try again
            </button>
          )}
          {idx + 1 < items.length ? (
            <button className="btn-primary" onClick={next}>
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
