'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Eraser, Highlighter } from 'lucide-react';
import type { Passage as PassageT, VocabItem } from '@/lib/types';
import { findRange, sentenceAround } from '@/lib/markup';
import { update, useStore } from '@/lib/store';
import SaveWord from './SaveWord';

type Range = { p: number; start: number; end: number };
type Seg = { text: string; hl?: number; ev?: boolean };

// Chia một đoạn thành các mảnh theo vùng tô sáng và vùng dẫn chứng
function segments(text: string, hls: { start: number; end: number; i: number }[], ev: [number, number] | null): Seg[] {
  const cuts = new Set([0, text.length]);
  for (const h of hls) {
    cuts.add(h.start);
    cuts.add(h.end);
  }
  if (ev) {
    cuts.add(ev[0]);
    cuts.add(ev[1]);
  }
  const pts = [...cuts].sort((a, b) => a - b);
  const out: Seg[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [a, b] = [pts[k], pts[k + 1]];
    if (a === b) continue;
    const h = hls.find(x => x.start <= a && x.end >= b);
    out.push({ text: text.slice(a, b), hl: h?.i, ev: !!ev && ev[0] <= a && ev[1] >= b });
  }
  return out;
}

// Vị trí ký tự của một điểm (node, offset) tính từ đầu phần chữ của đoạn
function offsetIn(root: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

interface Props {
  testId: string;
  passage: PassageT;
  evidence?: string | null;
  source: string;
}

export default function Passage({ testId, passage, evidence, source }: Props) {
  const store = useStore();
  const key = `${testId}:R:${passage.n}`;
  const hls = store?.highlights[key] ?? [];
  const boxRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<{ x: number; y: number; range?: Range; hit?: number; word?: string; context?: string } | null>(null);
  const [saving, setSaving] = useState<{ word: string; context: string } | null>(null);

  // Cuộn tới câu dẫn chứng khi được yêu cầu
  useEffect(() => {
    if (!evidence) return;
    const el = boxRef.current?.querySelector('mark.ev');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [evidence]);

  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !boxRef.current) return;
    const range = sel.getRangeAt(0);
    const startEl = (range.startContainer.parentElement as HTMLElement | null)?.closest<HTMLElement>('[data-text]');
    const endEl = (range.endContainer.parentElement as HTMLElement | null)?.closest<HTMLElement>('[data-text]');
    if (!startEl || startEl !== endEl) return; // chỉ trong một đoạn
    const p = Number(startEl.dataset.text);
    let start = offsetIn(startEl, range.startContainer, range.startOffset);
    let end = offsetIn(startEl, range.endContainer, range.endOffset);
    const text = passage.paragraphs[p].text;
    // Bỏ khoảng trắng thừa ở hai đầu
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end <= start) return;
    const rect = range.getBoundingClientRect();
    const box = boxRef.current.getBoundingClientRect();
    const picked = text.slice(start, end);
    const isWord = picked.split(/\s+/).length <= 4 && picked.length <= 40;
    setTool({
      x: rect.left + rect.width / 2 - box.left,
      y: rect.top - box.top + boxRef.current.scrollTop,
      range: { p, start, end },
      word: isWord ? picked.replace(/^[^\w]+|[^\w]+$/g, '') : undefined,
      context: sentenceAround(text, start, end),
    });
  }, [passage]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-tool]')) setTool(t => (t && !window.getSelection()?.toString() ? null : t));
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const addHighlight = () => {
    if (!tool?.range) return;
    const r = tool.range;
    update(s => {
      const list = (s.highlights[key] ??= []);
      // gộp với vùng chồng lấn trong cùng đoạn
      const overlapping = list.filter(h => h.p === r.p && h.start <= r.end && h.end >= r.start);
      const merged = overlapping.reduce((m, h) => ({ p: r.p, start: Math.min(m.start, h.start), end: Math.max(m.end, h.end) }), r);
      s.highlights[key] = [...list.filter(h => !overlapping.includes(h)), merged];
    });
    window.getSelection()?.removeAllRanges();
    setTool(null);
  };

  const removeHighlight = (i: number) => {
    update(s => {
      s.highlights[key] = (s.highlights[key] ?? []).filter((_, k) => k !== i);
    });
    setTool(null);
  };

  const vocabFor = (w: string): VocabItem | undefined =>
    passage.vocab?.find(v => v.word.toLowerCase() === w.toLowerCase() || w.toLowerCase().startsWith(v.word.toLowerCase()));

  return (
    <div ref={boxRef} className="relative" onMouseUp={onMouseUp}>
      <h2 className="font-serif text-[1.45em] leading-tight font-semibold">{passage.title}</h2>
      {passage.subtitle && <p className="mt-2 font-serif text-[0.95em] text-ink-2 italic">{passage.subtitle}</p>}
      <div className="passage mt-5">
        {passage.paragraphs.map((para, i) => {
          const mine = hls.map((h, idx) => ({ ...h, i: idx })).filter(h => h.p === i);
          const ev = findRange(para.text, evidence ?? undefined);
          return (
            <p key={i} className="relative">
              {para.label && (
                <span className="absolute -left-7 top-0 font-sans text-[0.8em] font-bold text-ink-2">{para.label}</span>
              )}
              <span data-text={i}>
                {segments(para.text, mine, ev).map((s, k) => {
                  if (s.hl !== undefined)
                    return (
                      <mark
                        key={k}
                        className={s.ev ? 'ev' : 'hl'}
                        onClick={e => {
                          const box = boxRef.current!.getBoundingClientRect();
                          const r = (e.target as HTMLElement).getBoundingClientRect();
                          setTool({ x: r.left + r.width / 2 - box.left, y: r.top - box.top, hit: s.hl });
                        }}
                      >
                        {s.text}
                      </mark>
                    );
                  if (s.ev) return <mark key={k} className="ev">{s.text}</mark>;
                  return <span key={k}>{s.text}</span>;
                })}
              </span>
            </p>
          );
        })}
      </div>
      {passage.footnotes?.length ? (
        <div className="mt-6 space-y-1 border-t border-line pt-3 text-[13px] text-muted">
          {passage.footnotes.map(f => (
            <p key={f}>* {f}</p>
          ))}
        </div>
      ) : null}

      {tool && (
        <div
          data-tool
          className="absolute z-20 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center gap-0.5 rounded-lg bg-ink p-1 text-[13px] text-paper shadow-[var(--shadow-pop)]"
          style={{ left: tool.x, top: tool.y }}
        >
          {tool.hit !== undefined ? (
            <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10" onClick={() => removeHighlight(tool.hit!)}>
              <Eraser size={14} /> Remove highlight
            </button>
          ) : (
            <>
              <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10" onClick={addHighlight}>
                <Highlighter size={14} /> Highlight
              </button>
              {tool.word && (
                <button
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10"
                  onClick={() => {
                    setSaving({ word: tool.word!, context: tool.context ?? '' });
                    setTool(null);
                  }}
                >
                  <BookmarkPlus size={14} /> Save word
                </button>
              )}
            </>
          )}
        </div>
      )}

      {saving && (
        <SaveWord
          word={saving.word}
          context={saving.context}
          source={source}
          suggestion={vocabFor(saving.word)}
          onClose={() => setSaving(null)}
        />
      )}
    </div>
  );
}
