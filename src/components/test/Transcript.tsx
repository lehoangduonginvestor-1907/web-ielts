'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BookmarkPlus, Eraser, Highlighter, Play } from 'lucide-react';
import type { ScriptSegment, VocabItem } from '@/lib/types';
import { findRange, sentenceAround } from '@/lib/markup';
import { update, useStore } from '@/lib/store';
import { hasTiming, tokenStarts } from '@/lib/timing';
import type { AudioHandle } from './AudioBar';
import SaveWord from './SaveWord';

interface Props {
  script: ScriptSegment[];
  evidence?: string | null;
  testId: string;
  part: number;
  source: string;
  vocab?: VocabItem[];
  player?: RefObject<AudioHandle | null>;
}

interface Sentence {
  from: number; // vị trí ký tự
  start: number; // giây
  end: number;
}

// Câu trong một đoạn, kèm thời điểm bắt đầu/kết thúc lấy từ mốc của từng từ
function sentencesOf(seg: ScriptSegment): Sentence[] {
  const ts = seg.ts;
  if (!ts?.length) return [];
  const starts = tokenStarts(seg.text);
  const froms = [0];
  for (const m of seg.text.matchAll(/[.?!…]+["'”’)]*\s+(?=\S)/g)) froms.push(m.index! + m[0].length);
  const timeOf = (c: number) => {
    let k = 0;
    while (k + 1 < starts.length && starts[k + 1] <= c) k++;
    return ts[k];
  };
  const out = froms.map(from => ({ from, start: timeOf(from), end: 0 }));
  out.forEach((s, i) => (s.end = i + 1 < out.length ? out[i + 1].start : ts[ts.length - 1]));
  return out;
}

type Piece = { a: number; b: number; s: number; hl?: number; ev?: boolean };

// Chia đoạn thành các mảnh theo ranh giới câu, vùng tô sáng và vùng dẫn chứng
function piecesOf(len: number, sents: Sentence[], hls: { start: number; end: number; i: number }[], ev: [number, number] | null): Piece[] {
  const cuts = new Set([0, len, ...sents.map(s => s.from)]);
  for (const h of hls) {
    cuts.add(h.start);
    cuts.add(h.end);
  }
  if (ev) {
    cuts.add(ev[0]);
    cuts.add(ev[1]);
  }
  const pts = [...cuts].filter(x => x >= 0 && x <= len).sort((x, y) => x - y);
  const out: Piece[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [a, b] = [pts[k], pts[k + 1]];
    if (a === b) continue;
    let s = 0;
    while (s + 1 < sents.length && sents[s + 1].from <= a) s++;
    out.push({ a, b, s, hl: hls.find(h => h.start <= a && h.end >= b)?.i, ev: !!ev && ev[0] <= a && ev[1] >= b });
  }
  return out;
}

function offsetIn(root: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

// Transcript của một phần nghe: bấm vào câu để nghe lại từ câu đó, câu đang phát được tô nhạt,
// câu dẫn chứng tô xanh; bôi chữ để tô sáng, lưu từ hoặc nghe đoạn đó.
export default function Transcript({ script, evidence, testId, part, source, vocab, player }: Props) {
  const store = useStore();
  const box = useRef<HTMLDivElement>(null);
  const key = `${testId}:L:${part}`;
  const hls = store?.highlights[key] ?? [];
  const timed = hasTiming(script) && !!player;
  const [now, setNow] = useState(-1);
  const [tool, setTool] = useState<{ x: number; y: number; range?: { p: number; start: number; end: number }; hit?: number; word?: string; context?: string } | null>(null);
  const [saving, setSaving] = useState<{ word: string; context: string } | null>(null);

  const sents = useMemo(() => script.map(sentencesOf), [script]);

  useEffect(() => {
    if (evidence) box.current?.querySelector('mark.ev')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [evidence]);

  useEffect(() => {
    if (!timed) return;
    return player!.current?.onTime(setNow);
  }, [timed, player]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-tool]')) setTool(t => (t && !window.getSelection()?.toString() ? null : t));
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !box.current) return;
    const range = sel.getRangeAt(0);
    const startEl = (range.startContainer.parentElement as HTMLElement | null)?.closest<HTMLElement>('[data-text]');
    const endEl = (range.endContainer.parentElement as HTMLElement | null)?.closest<HTMLElement>('[data-text]');
    if (!startEl || startEl !== endEl) return;
    const p = Number(startEl.dataset.text);
    const text = script[p].text;
    let start = offsetIn(startEl, range.startContainer, range.startOffset);
    let end = offsetIn(startEl, range.endContainer, range.endOffset);
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end <= start) return;
    const rect = range.getBoundingClientRect();
    const b = box.current.getBoundingClientRect();
    const picked = text.slice(start, end);
    setTool({
      x: rect.left + rect.width / 2 - b.left,
      y: rect.top - b.top,
      range: { p, start, end },
      word: picked.split(/\s+/).length <= 4 && picked.length <= 40 ? picked.replace(/^[^\w]+|[^\w]+$/g, '') : undefined,
      context: sentenceAround(text, start, end),
    });
  }, [script]);

  if (!script.length) return <p className="text-sm text-muted">No transcript available for this part yet.</p>;

  const addHighlight = () => {
    const r = tool?.range;
    if (!r) return;
    update(s => {
      const list = (s.highlights[key] ??= []);
      const overlapping = list.filter(h => h.p === r.p && h.start <= r.end && h.end >= r.start);
      const merged = overlapping.reduce((m, h) => ({ p: r.p, start: Math.min(m.start, h.start), end: Math.max(m.end, h.end) }), r);
      s.highlights[key] = [...list.filter(h => !overlapping.includes(h)), merged];
    });
    window.getSelection()?.removeAllRanges();
    setTool(null);
  };

  const play = (t: number) => {
    if (window.getSelection()?.toString()) return; // đang bôi chữ, không phải bấm
    player?.current?.seek(Math.max(0, t - 0.15), true);
  };

  return (
    <div ref={box} className="relative space-y-3 font-serif text-[15.5px] leading-relaxed" onMouseUp={onMouseUp}>
      {timed && <p className="font-sans text-xs text-muted">Click any sentence to replay from there. Select text to highlight or save a word.</p>}
      {script.map((seg, i) => {
        const ev = findRange(seg.text, evidence ?? undefined);
        const mine = hls.map((h, idx) => ({ ...h, i: idx })).filter(h => h.p === i);
        const ss = sents[i];
        const pieces = piecesOf(seg.text.length, timed ? ss : [], mine, ev);
        return (
          <div key={i} className={seg.speaker ? 'grid grid-cols-[5.5rem_1fr] gap-3' : ''}>
            {seg.speaker && <span className="pt-0.5 font-sans text-[11px] font-bold tracking-wider text-muted">{seg.speaker}</span>}
            <p data-text={i}>
              {pieces.map((pc, k) => {
                const text = seg.text.slice(pc.a, pc.b);
                const sent = timed ? ss[pc.s] : undefined;
                const active = !!sent && now >= sent.start && now < sent.end;
                const onClick = sent ? () => play(sent.start) : undefined;
                if (pc.hl !== undefined)
                  return (
                    <mark
                      key={k}
                      className={pc.ev ? 'ev' : 'hl'}
                      onClick={e => {
                        if (window.getSelection()?.toString()) return;
                        const b = box.current!.getBoundingClientRect();
                        const r = (e.target as HTMLElement).getBoundingClientRect();
                        setTool({ x: r.left + r.width / 2 - b.left, y: r.top - b.top, hit: pc.hl });
                      }}
                    >
                      {text}
                    </mark>
                  );
                if (pc.ev)
                  return (
                    <mark key={k} className={`ev ${sent ? 'cursor-pointer' : ''}`} onClick={onClick}>
                      {text}
                    </mark>
                  );
                return (
                  <span key={k} className={`${sent ? 'cursor-pointer rounded-sm transition-colors hover:bg-sunk' : ''} ${active ? 'bg-accent-soft' : ''}`} onClick={onClick}>
                    {text}
                  </span>
                );
              })}
            </p>
          </div>
        );
      })}

      {tool && (
        <div
          data-tool
          className="absolute z-20 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center gap-0.5 rounded-lg bg-ink p-1 font-sans text-[13px] text-paper shadow-[var(--shadow-pop)]"
          style={{ left: tool.x, top: tool.y }}
        >
          {tool.hit !== undefined ? (
            <button
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10"
              onClick={() => {
                update(s => {
                  s.highlights[key] = (s.highlights[key] ?? []).filter((_, k) => k !== tool.hit);
                });
                setTool(null);
              }}
            >
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
              {timed && tool.range && (
                <button
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-white/10"
                  onClick={() => {
                    const r = tool.range!;
                    const sent = [...sents[r.p]].reverse().find(s => s.from <= r.start);
                    window.getSelection()?.removeAllRanges();
                    setTool(null);
                    if (sent) player?.current?.seek(Math.max(0, sent.start - 0.15), true);
                  }}
                >
                  <Play size={13} /> Play
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
          suggestion={vocab?.find(v => v.word.toLowerCase() === saving.word.toLowerCase())}
          onClose={() => setSaving(null)}
        />
      )}
    </div>
  );
}
