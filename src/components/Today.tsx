'use client';

import { Fragment, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, Headphones, Layers, NotebookPen, PenLine, Snowflake } from 'lucide-react';
import type { Skill, TestIndexEntry } from '@/lib/types';
import { applyFreezes, isActive, longestStreak, streakOf, useStore } from '@/lib/store';
import { bandEstimate, dueMistakes, dueWords, nextUnit, typeStats, type Suggestion } from '@/lib/progress';
import { addDays, daysBetween, dayKey, dow } from '@/lib/dates';
import { fmtBand } from '@/lib/band';
import { Flame } from './Flame';
import Onboarding from './Onboarding';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function Today({ index }: { index: TestIndexEntry[] }) {
  const store = useStore();
  useEffect(() => {
    if (store) applyFreezes();
    // chỉ chạy một lần khi đã có dữ liệu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!store]);

  if (!store) return <div className="h-96" />;
  if (!store.profile) return <Onboarding />;

  const p = store.profile;
  const today = dayKey();
  const log = store.days[today] ?? { seconds: 0, units: 0, cards: 0 };
  const minutes = Math.round(log.seconds / 60);
  const goalPct = Math.min(1, minutes / p.goalMinutes);
  const streak = streakOf(store);
  const best = longestStreak(store);
  const daysLeft = p.examDate ? daysBetween(today, p.examDate) : null;

  // Bài đã làm hôm nay (không kể làm lại câu sai và bài bỏ dở)
  const todayAttempts = store.attempts.filter(a => dayKey(a.finishedAt) === today && !a.focus?.length && !a.incomplete);
  const doneToday = (s: Skill) => todayAttempts.findLast(a => a.skill === s);
  const words = dueWords(store);
  const mistakes = dueMistakes(store);
  const nextL = nextUnit(store, index, 'listening');
  const nextR = nextUnit(store, index, 'reading');

  type Task = { key: string; icon: typeof Layers; title: string; detail: string; href: string; done: boolean; mins: number };
  const tasks: Task[] = [];
  if (store.words.length) {
    tasks.push({
      key: 'vocab',
      icon: Layers,
      title: words.length ? `Ôn ${words.length} thẻ từ đến hạn` : 'Thẻ từ hôm nay',
      detail: words.length ? 'Lặp lại ngắt quãng: ôn đúng lúc sắp quên' : 'Đã ôn hết thẻ đến hạn',
      href: '/vocab/review',
      done: words.length === 0,
      mins: Math.max(3, Math.ceil(words.length / 6)),
    });
  }
  const skillName = (skill: Skill) => (skill === 'listening' ? 'Listening' : 'Reading');
  const unitWord = (skill: Skill) => (skill === 'listening' ? 'Part' : 'Passage');
  const unitTask = (skill: Skill, s: Suggestion | null): Task | null => {
    const base = { key: skill, icon: skill === 'listening' ? Headphones : BookOpen, mins: skill === 'listening' ? 10 : 20 };
    const a = doneToday(skill);
    if (a) {
      // Đã làm hôm nay: hiện đúng phần đã làm (không phải phần kế tiếp), bấm vào để xem lại lời giải
      const t = index.find(x => x.id === a.testId);
      const one = a.units.length === 1 ? t?.[skill].find(u => u.n === a.units[0]) : undefined;
      return {
        ...base,
        title: `${skillName(skill)} · ${a.units.length === 1 ? `${unitWord(skill)} ${a.units[0]}` : 'cả bài'}`,
        detail: `${t ? `Cam ${t.book} Test ${t.test}` : a.testId}${one ? ` · ${one.title}` : ''} · đúng ${a.score}/${a.total}`,
        href: `/test/${a.testId}/${skill}?p=${a.units.join(',')}&attempt=${a.id}`,
        done: true,
      };
    }
    if (!s) return null;
    return {
      ...base,
      title: `${skillName(skill)} · ${unitWord(skill)} ${s.unit.n}`,
      detail: `Cam ${s.book} Test ${s.test} · ${s.unit.title}`,
      href: `/test/${s.testId}/${skill}?p=${s.unit.n}`,
      done: false,
    };
  };
  const tl = unitTask('listening', nextL);
  const tr = unitTask('reading', nextR);
  if (tl) tasks.push(tl);
  if (tr) tasks.push(tr);
  if (mistakes.length) {
    tasks.push({
      key: 'mistakes',
      icon: NotebookPen,
      title: `Làm lại ${mistakes.length} câu sai`,
      detail: 'Câu sai hôm trước quay lại. Làm đúng 3 lần là gạch khỏi sổ',
      href: '/mistakes',
      done: false,
      mins: Math.max(3, mistakes.length * 2),
    });
  }
  const doneCount = tasks.filter(t => t.done).length;
  // Đã xong phần của hôm nay mà còn sức: gợi ý phần kế tiếp
  const extra = ([nextL, nextR] as const).filter((s): s is Suggestion => !!s && !!doneToday(s.skill));

  const bandL = bandEstimate(store, 'listening');
  const bandR = bandEstimate(store, 'reading');
  const weak = typeStats(store).filter(t => t.all >= 5).slice(0, 3);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">
          {greeting()}, {p.name}.
        </p>
        <h1 className="mt-1 font-serif text-[32px] leading-tight font-semibold sm:text-[38px]">
          {doneCount === tasks.length && tasks.length > 0
            ? 'Xong hết việc hôm nay rồi.'
            : minutes === 0
              ? 'Bắt đầu nhẹ thôi, 10 phút trước đã.'
              : `Hôm nay đã học ${minutes} phút.`}
        </h1>
        {daysLeft !== null && daysLeft >= 0 && (
          <p className="mt-2 text-ink-2">
            Còn <span className="num font-semibold text-ink">{daysLeft}</span> ngày đến kỳ thi · mục tiêu{' '}
            <span className="font-semibold text-ink">{fmtBand(p.target)}</span>
          </p>
        )}
      </header>

      {/* Mục tiêu ngày + chuỗi */}
      <section className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        <div className="card flex items-center gap-5 p-5">
          <Ring pct={goalPct} />
          <div className="min-w-0">
            <p className="eyebrow">Mục tiêu hôm nay</p>
            <p className="mt-1 font-serif text-[26px] leading-none font-semibold">
              <span className="num">{minutes}</span>
              <span className="text-[17px] text-muted">/{p.goalMinutes} phút</span>
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {goalPct >= 1 ? 'Đã đạt mục tiêu. Học thêm là tiền lãi.' : `Còn ${p.goalMinutes - minutes} phút nữa.`}
            </p>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <Flame lit={isActive(log)} size={34} />
            <div>
              <p className="font-serif text-[26px] leading-none font-semibold">
                <span className="num">{streak}</span> <span className="text-[16px] text-muted">ngày liên tiếp</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Kỷ lục {best} ngày
                {store.freezes > 0 && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-[#3b7ea8]">
                    · <Snowflake size={11} /> {store.freezes} vé nghỉ
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {week.map(k => {
              const on = isActive(store.days[k]);
              const frozen = store.frozenDays.includes(k);
              const label = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dow(k)];
              return (
                <div key={k} className="flex flex-col items-center gap-1">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-[11px] ${
                      on ? 'bg-ember text-white' : frozen ? 'bg-[#d6ebf7] text-[#3b7ea8]' : k === today ? 'border-2 border-dashed border-line-strong' : 'bg-sunk'
                    }`}
                  >
                    {on ? <Check size={13} strokeWidth={3} /> : frozen ? <Snowflake size={12} /> : ''}
                  </span>
                  <span className={`text-[10px] ${k === today ? 'font-bold text-ink' : 'text-muted'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Nhiệm vụ */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-semibold">Việc hôm nay</h2>
          <span className="num text-sm text-muted">
            {doneCount}/{tasks.length} xong
          </span>
        </div>
        <ol className="card divide-y divide-line">
          {tasks.map((t, i) => (
            <li key={t.key}>
              <Link href={t.href} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-sunk/50 sm:px-5">
                <span
                  className={`num flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    t.done ? 'bg-good text-white' : 'border border-line-strong text-ink-2'
                  }`}
                >
                  {t.done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${t.done ? 'text-muted line-through decoration-1' : ''}`}>{t.title}</p>
                  <p className="truncate text-sm text-muted">{t.detail}</p>
                </div>
                <span className="hidden text-xs text-muted sm:block">~{t.mins} phút</span>
                <ArrowRight size={17} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
          {!tasks.length && <li className="px-5 py-6 text-sm text-muted">Chưa có đề nào trong máy để giao việc.</li>}
        </ol>
        {extra.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Còn sức thì làm thêm:{' '}
            {extra.map((s, i) => (
              <Fragment key={s.skill}>
                {i > 0 && ' · '}
                <Link href={`/test/${s.testId}/${s.skill}?p=${s.unit.n}`} className="font-semibold text-accent hover:underline">
                  {skillName(s.skill)} {unitWord(s.skill)} {s.unit.n} (Cam {s.book} Test {s.test})
                </Link>
              </Fragment>
            ))}
          </p>
        )}
        {isActive(log) && !store.journal[today]?.note && (
          <Link href="/journal" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
            <PenLine size={15} /> Viết một dòng nhật ký: hôm nay vướng ở đâu?
          </Link>
        )}
      </section>

      {/* Band & điểm yếu */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <p className="eyebrow">Band ước tính</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {([['Listening', bandL], ['Reading', bandR]] as const).map(([name, b]) => (
              <div key={name}>
                <p className="text-sm text-ink-2">{name}</p>
                {b ? (
                  <>
                    <p className="mt-1 font-serif text-[34px] leading-none font-semibold">{fmtBand(b.avg)}</p>
                    <p className="mt-1 text-xs text-muted">
                      TB {b.count} đề gần nhất · {b.avg >= p.target ? 'đã chạm mục tiêu' : `còn ${(p.target - b.avg).toFixed(1)} band`}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-snug text-muted">Làm một bài cả 40 câu để có ước tính.</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Dạng câu hay sai</p>
          {weak.length ? (
            <ul className="mt-3 space-y-2.5">
              {weak.map(w => (
                <li key={`${w.skill}${w.type}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {w.type} <span className="text-muted">· {w.skill === 'listening' ? 'L' : 'R'}</span>
                    </span>
                    <span className="num font-semibold">{Math.round((w.ok / w.all) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-sunk">
                    <div className="h-full rounded-full bg-ember" style={{ width: `${(w.ok / w.all) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-snug text-muted">Cần khoảng 5 câu mỗi dạng để thấy điểm yếu. Cứ làm bài, phần này tự hiện.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" className="shrink-0" aria-hidden="true">
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-sunk)" strokeWidth="8" />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke={pct >= 1 ? 'var(--color-good)' : 'var(--color-accent)'}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 38 38)"
        style={{ transition: 'stroke-dasharray .6s ease' }}
      />
      {pct >= 1 && <path d="M28 38.5l7 7 13-14" fill="none" stroke="var(--color-good)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
