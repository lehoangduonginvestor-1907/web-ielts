'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Settings2, Snowflake, Upload } from 'lucide-react';
import type { Store } from '@/lib/types';
import { exportData, importData, isActive, longestStreak, streakOf, update, useStore } from '@/lib/store';
import { addDays, dayKey, dow, fmtDay, weekdayName } from '@/lib/dates';
import { Flame } from './Flame';
import Onboarding from './Onboarding';

const MOODS = [
  { v: 1, label: 'Uể oải', face: 'M8 16.5c1.2-1 2.5-1.5 4-1.5s2.8.5 4 1.5' },
  { v: 2, label: 'Bình thường', face: 'M8.5 15.5h7' },
  { v: 3, label: 'Ổn', face: 'M8.5 14.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5' },
  { v: 4, label: 'Rất tốt', face: 'M7.5 13.5c1.2 2 2.7 3 4.5 3s3.3-1 4.5-3' },
];

function MoodIcon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="9" cy="10" r=".9" fill="currentColor" />
      <circle cx="15" cy="10" r=".9" fill="currentColor" />
      <path d={d} />
    </svg>
  );
}

function summary(s: Store, key: string) {
  const d = s.days[key];
  const atts = s.attempts.filter(a => dayKey(a.finishedAt) === key && !a.incomplete);
  return {
    minutes: Math.round((d?.seconds ?? 0) / 60),
    cards: d?.cards ?? 0,
    atts,
  };
}

const heat = (m: number) => (m <= 0 ? 'bg-sunk' : m < 15 ? 'bg-ember/25' : m < 30 ? 'bg-ember/50' : m < 60 ? 'bg-ember/75' : 'bg-ember');

export default function Journal() {
  const store = useStore();
  const today = dayKey();
  const [note, setNote] = useState('');
  const [settings, setSettings] = useState(false);
  const [msg, setMsg] = useState('');
  const loaded = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (store && !loaded.current) {
      setNote(store.journal[today]?.note ?? '');
      loaded.current = true;
    }
  }, [store, today]);

  // Tự lưu ghi chú
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      update(s => {
        s.journal[today] = { ...s.journal[today], note };
      });
    }, 500);
    return () => clearTimeout(t);
  }, [note, today]);

  if (!store) return <div className="h-96" />;

  const streak = streakOf(store);
  const best = longestStreak(store);
  const studied = Object.keys(store.days).filter(k => isActive(store.days[k])).length;
  const totalHours = Object.values(store.days).reduce((a, d) => a + d.seconds, 0) / 3600;
  const goal = store.profile?.goalMinutes ?? 30;

  // Lịch nhiệt 18 tuần, cột là tuần (bắt đầu thứ Hai)
  const WEEKS = 18;
  const offset = (dow(today) + 6) % 7; // số ngày từ thứ Hai
  const start = addDays(today, -offset - (WEEKS - 1) * 7);
  const cols = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const maxMin = Math.max(goal, ...last14.map(k => (store.days[k]?.seconds ?? 0) / 60));

  const t = summary(store, today);
  const mood = store.journal[today]?.mood;
  const past = [...new Set([...Object.keys(store.days), ...Object.keys(store.journal)])]
    .filter(k => k < today && (isActive(store.days[k]) || store.journal[k]?.note))
    .sort()
    .reverse()
    .slice(0, 30);

  const doImport = async (f: File) => {
    try {
      importData(await f.text());
      setMsg('Đã khôi phục dữ liệu.');
    } catch (e) {
      setMsg(`Không đọc được file: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[34px] leading-tight font-semibold">Nhật ký</h1>
          <p className="mt-1 text-ink-2">Mỗi ngày một dòng. Nhìn lại mới thấy mình đã đi xa thế nào.</p>
        </div>
        <button className="btn-ghost" onClick={() => setSettings(s => !s)}>
          <Settings2 size={16} /> Cài đặt
        </button>
      </header>

      {settings && (
        <section className="card p-5 sm:p-6">
          <Onboarding initial={store.profile} onDone={() => setSettings(false)} />
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-sm font-semibold">Sao lưu</p>
            <p className="mt-1 text-sm text-muted">Dữ liệu học đang nằm trong trình duyệt này. Tải file sao lưu để chuyển sang máy khác hoặc phòng khi xoá lịch sử duyệt web.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-ghost"
                onClick={() => {
                  const blob = new Blob([exportData()], { type: 'application/json' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `deu-ielts-${today}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                <Download size={15} /> Tải bản sao lưu
              </button>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> Khôi phục từ file
              </button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
            </div>
            {msg && <p className="mt-2 text-sm text-ink-2">{msg}</p>}
          </div>
        </section>
      )}

      {/* Chuỗi & tổng */}
      <section className="card grid grid-cols-2 gap-px overflow-hidden bg-line p-0 sm:grid-cols-4">
        <div className="flex items-center gap-3 bg-surface p-5">
          <Flame lit={isActive(store.days[today])} size={36} />
          <div>
            <p className="num font-serif text-[30px] leading-none font-semibold">{streak}</p>
            <p className="mt-1 text-xs text-muted">ngày liên tiếp</p>
          </div>
        </div>
        {[
          [best, 'ngày dài nhất'],
          [studied, 'ngày đã học'],
          [totalHours < 10 ? totalHours.toFixed(1) : Math.round(totalHours), 'giờ tổng cộng'],
        ].map(([v, l]) => (
          <div key={l as string} className="bg-surface p-5">
            <p className="num font-serif text-[30px] leading-none font-semibold">{v}</p>
            <p className="mt-1 text-xs text-muted">{l}</p>
          </div>
        ))}
      </section>

      {/* Lịch nhiệt */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">18 tuần gần nhất</p>
          {store.freezes > 0 && (
            <p className="flex items-center gap-1 text-xs text-[#3b7ea8]">
              <Snowflake size={12} /> {store.freezes} vé nghỉ: tự dùng khi bạn lỡ một ngày
            </p>
          )}
        </div>
        <div className="scroll-thin mt-4 overflow-x-auto pb-1">
          <div className="flex gap-[3px]">
            <div className="mr-1 flex flex-col gap-[3px] text-[10px] leading-[13px] text-muted">
              {['T2', '', 'T4', '', 'T6', '', 'CN'].map((l, i) => (
                <span key={i} className="h-[13px]">
                  {l}
                </span>
              ))}
            </div>
            {cols.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.map(k => {
                  const m = Math.round((store.days[k]?.seconds ?? 0) / 60);
                  const frozen = store.frozenDays.includes(k);
                  const future = k > today;
                  return (
                    <span
                      key={k}
                      title={future ? '' : `${weekdayName(k)} ${fmtDay(k)}: ${frozen ? 'dùng vé nghỉ' : `${m} phút`}`}
                      className={`size-[13px] rounded-[3px] ${future ? 'bg-transparent' : frozen ? 'bg-[#bcdcef]' : heat(m)} ${k === today ? 'ring-1 ring-ink ring-offset-1 ring-offset-surface' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          Ít
          {[0, 10, 20, 45, 60].map(m => (
            <span key={m} className={`size-[11px] rounded-[2px] ${heat(m)}`} />
          ))}
          Nhiều
        </div>
      </section>

      {/* 14 ngày */}
      <section className="card p-5">
        <p className="eyebrow">Phút học 14 ngày qua</p>
        <div className="relative mt-4 flex h-32 items-end gap-1.5">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/60" style={{ bottom: `${(goal / maxMin) * 100}%` }}>
            <span className="absolute -top-4 right-0 text-[10px] text-accent">mục tiêu {goal}′</span>
          </div>
          {last14.map(k => {
            const m = (store.days[k]?.seconds ?? 0) / 60;
            return (
              <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${fmtDay(k)}: ${Math.round(m)} phút`}>
                <div className={`w-full rounded-t-[3px] ${m >= goal ? 'bg-accent' : m > 0 ? 'bg-accent/45' : 'bg-sunk'}`} style={{ height: `${Math.max(2, (m / maxMin) * 100)}%` }} />
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5 text-center text-[10px] text-muted">
          {last14.map(k => (
            <span key={k} className={`flex-1 ${k === today ? 'font-bold text-ink' : ''}`}>
              {Number(k.slice(8))}
            </span>
          ))}
        </div>
      </section>

      {/* Hôm nay */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold">Hôm nay · {weekdayName(today)} {fmtDay(today)}</h2>
          <p className="text-sm text-muted">
            {t.minutes} phút · {t.atts.length} bài · {t.cards} thẻ
          </p>
        </div>
        {t.atts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {t.atts.map(a => (
              <li key={a.id} className="rounded-md bg-sunk px-2 py-1 text-[12px] text-ink-2">
                {a.skill === 'listening' ? 'L' : 'R'} {a.testId.replace(/^c(\d+)t(\d+)$/, 'C$1T$2')} {a.focus?.length ? 'làm lại' : (a.skill === 'listening' ? 'P' : 'R') + a.units.join('')} ·{' '}
                <span className="num font-semibold text-ink">
                  {a.score}/{a.total}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5">
          <p className="text-sm font-semibold">Hôm nay thấy thế nào?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOODS.map(m => (
              <button
                key={m.v}
                onClick={() => update(s => void (s.journal[today] = { ...s.journal[today], mood: mood === m.v ? undefined : m.v }))}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  mood === m.v ? 'border-ink bg-ink text-paper' : 'border-line-strong text-ink-2 hover:bg-sunk'
                }`}
              >
                <MoodIcon d={m.face} size={18} /> {m.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="field mt-4 min-h-28 resize-y font-serif text-[15.5px] leading-relaxed"
          placeholder="Hôm nay học được gì? Vướng ở đâu? (vd. hay bị bẫy NOT GIVEN, nghe sót số điện thoại…)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">Tự lưu.</p>
      </section>

      {/* Những ngày trước */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold">Những ngày trước</h2>
          <ol className="relative space-y-4 border-l border-line pl-6">
            {past.map(k => {
              const s = summary(store, k);
              const j = store.journal[k];
              const md = MOODS.find(m => m.v === j?.mood);
              return (
                <li key={k} className="relative">
                  <span className={`absolute top-1.5 -left-[29px] size-2.5 rounded-full ${isActive(store.days[k]) ? 'bg-ember' : 'bg-line-strong'}`} />
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold">
                      {weekdayName(k)} {fmtDay(k)}
                    </span>
                    <span className="text-sm text-muted">
                      {s.minutes} phút · {s.atts.length} bài · {s.cards} thẻ
                    </span>
                    {md && (
                      <span className="flex items-center gap-1 text-sm text-ink-2">
                        <MoodIcon d={md.face} size={15} /> {md.label}
                      </span>
                    )}
                  </div>
                  {j?.note && <p className="mt-1 font-serif text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{j.note}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
