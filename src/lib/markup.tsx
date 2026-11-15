import React from 'react';

// ---- Markdown rút gọn trong lời giải: **đậm**, *nghiêng* ----

export function md(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={i++} className="font-semibold text-ink">{m[1]}</strong>);
    else out.push(<em key={i++} className="font-serif italic">{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ---- Mẫu điền từ: dòng "# ", "## ", "**...**", "- ", "  - ", còn lại là đoạn văn; {{n}} là chỗ trống ----

export type Piece = string | { gap: number };
export type Block =
  | { kind: 'h1' | 'h2' | 'label' | 'li' | 'li2' | 'p'; pieces: Piece[] }
  | { kind: 'table'; rows: Piece[][][] }; // hàng → ô → mảnh; hàng đầu là tiêu đề

function pieces(s: string): Piece[] {
  const out: Piece[] = [];
  const re = /\{\{(\d+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push({ gap: Number(m[1]) });
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function parseTemplate(t: string): Block[] {
  const out: Block[] = [];
  for (const line of t.split('\n')) {
    // Dòng bảng: "| ô | ô |"; các dòng liền nhau gộp thành một bảng
    if (line.trim().startsWith('|')) {
      const cells = line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map(c => pieces(c.trim()));
      const last = out[out.length - 1];
      if (last?.kind === 'table') last.rows.push(cells);
      else out.push({ kind: 'table', rows: [cells] });
      continue;
    }
    out.push(parseLine(line));
  }
  return out;
}

function parseLine(line: string): Block {
  if (line.startsWith('## ')) return { kind: 'h2', pieces: pieces(line.slice(3)) };
  if (line.startsWith('# ')) return { kind: 'h1', pieces: pieces(line.slice(2)) };
  if (/^\*\*.+\*\*$/.test(line.trim())) return { kind: 'label', pieces: pieces(line.trim().slice(2, -2)) };
  if (line.startsWith('  - ')) return { kind: 'li2', pieces: pieces(line.slice(4)) };
  if (line.startsWith('- ')) return { kind: 'li', pieces: pieces(line.slice(2)) };
  return { kind: 'p', pieces: pieces(line) };
}

// ---- Tìm câu dẫn chứng trong một đoạn (giữ đúng vị trí ký tự) ----

const fold = (s: string) => s.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-');

export function findRange(text: string, needle?: string): [number, number] | null {
  if (!needle) return null;
  const i = fold(text).indexOf(fold(needle.trim()));
  return i < 0 ? null : [i, i + needle.trim().length];
}

// Câu chứa vị trí [start, end) — dùng làm ngữ cảnh khi lưu từ
export function sentenceAround(text: string, start: number, end: number): string {
  let a = start;
  while (a > 0 && !/[.!?]/.test(text[a - 1])) a--;
  let b = end;
  while (b < text.length && !/[.!?]/.test(text[b])) b++;
  return text.slice(a, Math.min(text.length, b + 1)).trim();
}
