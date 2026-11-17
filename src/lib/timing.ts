import type { Group, ScriptSegment } from './types';

// Mốc thời gian của transcript: mỗi đoạn có ts[i] = giây bắt đầu của từ thứ i (tách theo khoảng trắng),
// ts[cuối] = lúc đoạn kết thúc. Sinh bằng Whisper + khớp với transcript (D:/ielts-data/work/align_timing.py).

const fold = (s: string) => s.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-');

export const hasTiming = (script: ScriptSegment[]) => script.length > 0 && script.every(s => (s.ts?.length ?? 0) > 0);

/** Vị trí ký tự bắt đầu của từng từ trong một đoạn. */
export function tokenStarts(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\S+/g)) out.push(m.index!);
  return out;
}

/** Thời điểm (giây) của vị trí ký tự c trong đoạn: lúc bắt đầu từ chứa c (atEnd: lúc kết thúc từ đó). */
function timeAt(seg: ScriptSegment, c: number, atEnd: boolean): number | null {
  const ts = seg.ts;
  if (!ts?.length) return null;
  const starts = tokenStarts(seg.text);
  let k = 0;
  while (k + 1 < starts.length && starts[k + 1] <= c) k++;
  return atEnd ? (ts[k + 1] ?? ts[ts.length - 1]) : ts[k];
}

/** Khoảng thời gian của một đoạn chữ (vd. câu dẫn chứng) trong transcript; null nếu không tìm thấy hoặc thiếu mốc. */
export function textRange(script: ScriptSegment[], needle?: string): { start: number; end: number } | null {
  if (!needle?.trim()) return null;
  // Nối các đoạn bằng một khoảng trắng (giống cách validator tìm dẫn chứng), nhớ vị trí đầu mỗi đoạn
  const offsets: number[] = [];
  let pos = 0;
  for (const s of script) {
    offsets.push(pos);
    pos += s.text.length + 1;
  }
  const joined = script.map(s => s.text).join(' ');
  const n = fold(needle.trim());
  const at = fold(joined).indexOf(n);
  if (at < 0) return null;
  const locate = (c: number) => {
    let k = 0;
    while (k + 1 < offsets.length && offsets[k + 1] <= c) k++;
    return { k, local: c - offsets[k] };
  };
  const a = locate(at);
  const b = locate(at + n.length - 1);
  const start = timeAt(script[a.k], a.local, false);
  const end = timeAt(script[b.k], b.local, true);
  return start === null || end === null ? null : { start, end: Math.max(end, start + 0.5) };
}

/**
 * Nên bắt đầu nghe từ đâu để làm câu n (luyện theo dạng, làm lại câu sai):
 * ngay sau câu dẫn chứng của câu n-1 trong cùng phần; câu đầu của phần thì từ đầu audio.
 */
export function startBefore(script: ScriptSegment[], groups: Group[], n: number): number {
  if (!hasTiming(script)) return 0;
  const ev = (k: number) => groups.flatMap(g => g.questions).find(q => q.n === k)?.explain?.evidence;
  const prev = textRange(script, ev(n - 1));
  const own = textRange(script, ev(n));
  if (!prev) return 0;
  let t = prev.end;
  if (own && own.start - 2 < t) t = own.start - 8; // dẫn chứng không theo thứ tự: lùi trước câu n một chút
  return Math.max(0, t - 1);
}
