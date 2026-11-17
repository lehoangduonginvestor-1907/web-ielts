'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import type { Group, MistakeReason, MistakeState, Test } from '@/lib/types';
import { setMistakeReason, useStore } from '@/lib/store';
import { dayKey, fmtDay } from '@/lib/dates';
import { correctDisplay } from '@/lib/scoring';
import { useNow } from '@/lib/hooks';
import { HedgehogMascot } from './Mascots';

const REASONS: { k: MistakeReason; label: string; hint: string }[] = [
  { k: 'vocab', label: 'Không biết từ', hint: 'Từ khoá trong bài hoặc đề lạ' },
  { k: 'paraphrase', label: 'Không nhận ra paraphrase', hint: 'Đề và bài nói cùng ý bằng chữ khác' },
  { k: 'locate', label: 'Không tìm ra chỗ', hint: 'Đọc lướt / nghe mà lạc vị trí' },
  { k: 'missed', label: 'Nghe sót', hint: 'Nói nhanh, bỏ lỡ đáp án' },
  { k: 'careless', label: 'Ẩu', hint: 'Chính tả, số ít/nhiều, quá số từ' },
  { k: 'time', label: 'Hết giờ', hint: 'Không kịp làm' },
];

interface Item {
  key: string;
  testId: string;
  skill: 'listening' | 'reading';
  n: number;
  m: MistakeState;
}

function parseKey(key: string, m: MistakeState): Item {
  const [testId, s, n] = key.split(':');
  return { key, testId, skill: s === 'L' ? 'listening' : 'reading', n: Number(n), m };
}

// Tìm nhóm, phần và lời nhắc của câu n trong đề
function locate(t: Test | undefined, skill: Item['skill'], n: number) {
  if (!t) return null;
  for (const u of skill === 'reading' ? t.reading : t.listening) {
    for (const g of u.groups) {
      const q = g.questions.find(x => x.n === n);
      if (!q) continue;
      let prompt = q.prompt ?? g.prompt ?? '';
      if (!prompt && g.template) {
        const line = g.template.split('\n').find(l => l.includes(`{{${n}}}`)) ?? '';
        prompt = line.replace(/^[#\-*\s]+|\*\*/g, '').replace(`{{${n}}}`, '_____').replace(/\{\{\d+\}\}/g, '…');
      }
      return { unit: u.n, unitTitle: u.title, g: g as Group, prompt };
    }
  }
  return null;
}

export default function Mistakes() {
  const store = useStore();
  const [tests, setTests] = useState<Record<string, Test>>({});
  const [tab, setTab] = useState<'due' | 'all'>('due');

  const items = useMemo(() => (store ? Object.entries(store.mistakes).map(([k, m]) => parseKey(k, m)) : []), [store]);
  const open = items.filter(i => !i.m.resolved);
  const now = useNow();
  const due = open.filter(i => i.m.due <= now);
  const resolved = items.length - open.length;

  useEffect(() => {
    const ids = [...new Set(items.map(i => i.testId))].filter(id => !tests[id]);
    ids.forEach(id =>
      fetch(`/api/tests/${id}`)
        .then(r => (r.ok ? r.json() : null))
        .then((t: Test | null) => t && setTests(x => ({ ...x, [id]: t }))),
    );
  }, [items, tests]);

  const list = tab === 'due' ? due : open;

  // Gom theo phần để làm lại một lượt
  const batches = new Map<string, { testId: string; skill: Item['skill']; unit: number; title: string; ns: number[]; book?: number; test?: number }>();
  for (const i of due) {
    const loc = locate(tests[i.testId], i.skill, i.n);
    if (!loc) continue;
    const k = `${i.testId}:${i.skill}:${loc.unit}`;
    const b = batches.get(k) ?? { testId: i.testId, skill: i.skill, unit: loc.unit, title: loc.unitTitle, ns: [], book: tests[i.testId]?.book, test: tests[i.testId]?.test };
    b.ns.push(i.n);
    batches.set(k, b);
  }

  const reasonCount = new Map<MistakeReason, number>();
  items.forEach(i => i.m.reason && reasonCount.set(i.m.reason, (reasonCount.get(i.m.reason) ?? 0) + 1));
  const tagged = [...reasonCount.values()].reduce((a, b) => a + b, 0);

  if (!store) return <div className="h-96" />;

  return (
    <div>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Sổ lỗi</h1>
          <p className="mt-1 max-w-2xl text-ink-2">
            Bé Nhím giữ lại câu sai để quay lại sau 1, 3 rồi 7 ngày. Làm đúng 3 lần liên tiếp thì câu được gạch khỏi sổ. Ghi lý do sai để biết mình hay vấp ở đâu.
          </p>
        </div>
        <HedgehogMascot pose="mistakes" size={82} className="hidden sm:block" />
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Đến hạn làm lại', due.length, 'text-ember'],
          ['Đang theo dõi', open.length, 'text-ink'],
          ['Đã gạch khỏi sổ', resolved, 'text-good'],
        ].map(([label, n, tone]) => (
          <div key={label as string} className="card p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className={`num mt-1 font-serif text-[30px] leading-none font-semibold ${tone}`}>{n}</p>
          </div>
        ))}
      </section>

      {batches.size > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-serif text-lg font-semibold">Làm lại hôm nay</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[...batches.values()].map(b => (
              <Link
                key={`${b.testId}${b.skill}${b.unit}`}
                href={`/test/${b.testId}/${b.skill}?p=${b.unit}&focus=${b.ns.sort((x, y) => x - y).join(',')}`}
                className="card flex items-center gap-3 p-4 transition-colors hover:bg-sunk/50"
              >
                <RotateCcw size={18} className="shrink-0 text-ember" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {b.ns.length} câu · {b.skill === 'listening' ? `Part ${b.unit}` : `Passage ${b.unit}`}
                  </p>
                  <p className="truncate text-sm text-muted">
                    Cam {b.book} Test {b.test} · {b.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tagged > 0 && (
        <section className="card mt-6 p-5">
          <p className="eyebrow">Lý do sai nhiều nhất</p>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full">
            {REASONS.filter(r => reasonCount.get(r.k)).map((r, i) => (
              <div
                key={r.k}
                title={r.label}
                style={{ width: `${((reasonCount.get(r.k) ?? 0) / tagged) * 100}%`, background: ['#1f5e4f', '#e0561b', '#b83a2e', '#c9a227', '#6b6a63', '#3b7ea8'][i % 6] }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {REASONS.filter(r => reasonCount.get(r.k))
              .sort((a, b) => (reasonCount.get(b.k) ?? 0) - (reasonCount.get(a.k) ?? 0))
              .map(r => (
                <li key={r.k}>
                  <span className="font-semibold">{reasonCount.get(r.k)}</span> <span className="text-ink-2">{r.label}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 inline-flex rounded-lg border border-line-strong bg-surface p-1 text-sm">
          {(['due', 'all'] as const).map(k => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1 font-medium ${tab === k ? 'bg-ink text-paper' : 'text-ink-2'}`}>
              {k === 'due' ? `Đến hạn (${due.length})` : `Tất cả (${open.length})`}
            </button>
          ))}
        </div>

        {list.length ? (
          <ul className="space-y-3">
            {list
              .sort((a, b) => a.m.due - b.m.due)
              .map(i => {
                const t = tests[i.testId];
                const loc = locate(t, i.skill, i.n);
                return (
                  <li key={i.key} className="card p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="qnum">{i.n}</span>
                      <span>
                        Cam {t?.book} Test {t?.test} · {i.skill === 'listening' ? `Part ${loc?.unit ?? ''}` : `Passage ${loc?.unit ?? ''}`}
                      </span>
                      {loc && <span>· {loc.g.type}</span>}
                      <span className="ml-auto">
                        {i.m.due <= now ? 'Đến hạn' : `Làm lại ${fmtDay(dayKey(i.m.due))}`} · đúng {i.m.step}/3
                      </span>
                    </div>
                    {loc ? (
                      <>
                        <p className="mt-2 text-[15px]">{loc.prompt}</p>
                        <p className="mt-1 text-sm">
                          Đáp án: <span className="font-semibold text-good">{correctDisplay(loc.g, i.n)}</span>
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Đang tải câu hỏi…</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {REASONS.map(r => (
                        <button
                          key={r.k}
                          title={r.hint}
                          onClick={() => setMistakeReason(i.key, i.m.reason === r.k ? undefined : r.k)}
                          className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition-colors ${
                            i.m.reason === r.k ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:bg-sunk'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-10 text-center text-sm text-muted">
            <HedgehogMascot pose="sleepy" size={84} className="mx-auto mb-2" />
            {open.length ? 'Không có câu nào đến hạn hôm nay. Quay lại ngày mai nhé.' : 'Sổ lỗi đang trống. Làm một bài, câu sai sẽ tự vào đây.'}
          </div>
        )}
      </section>
    </div>
  );
}
