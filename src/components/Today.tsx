'use client';

import { Fragment, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, Headphones, Layers, Mic, NotebookPen, PenLine, PenTool, Snowflake } from 'lucide-react';
import type { Skill, Store, TestIndexEntry } from '@/lib/types';
import { applyFreezes, isActive, longestStreak, streakOf, useStore } from '@/lib/store';
import {
  bandEstimate,
  dueGrammarMistakes,
  dueMistakes,
  dueWords,
  nextUnit,
  speakingBandEstimate,
  tierProgress,
  typeStats,
  writingBandEstimate,
  type Suggestion,
} from '@/lib/progress';
import { WRITING_PROMPTS } from '@/lib/writingPrompts';
import { SPEAKING_TOPICS } from '@/lib/speakingTopics';
import { CoachNoteCard } from './CoachNote';
import { addDays, daysBetween, dayKey, dow } from '@/lib/dates';
import { fmtBand } from '@/lib/band';
import { lessonFor } from '@/lib/skills';
import { Flame } from './Flame';
import { HedgehogMascot, MascotBadge, MascotDuo, MascotLoading } from './Mascots';
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

  if (!store) return <MascotLoading character="hedgehog" label="Đang xếp việc hôm nay cho bạn…" />;
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
  const gMistakes = dueGrammarMistakes(store);
  const nextL = nextUnit(store, index, 'listening');
  const nextR = nextUnit(store, index, 'reading');

  // Chọn 1 đề Writing & Speaking chưa làm gần đây để gợi ý nhẹ xen kẽ
  const doneWritingIds = new Set((store.writingAttempts ?? []).map(a => a.promptId));
  const nextW = WRITING_PROMPTS.find(w => !doneWritingIds.has(w.id)) ?? WRITING_PROMPTS[0];
  const writingDoneToday = (store.writingAttempts ?? []).findLast(a => dayKey(a.finishedAt) === today);

  const doneSpeakingIds = new Set((store.speakingAttempts ?? []).map(a => a.topicId));
  const nextS = SPEAKING_TOPICS.find(t => !doneSpeakingIds.has(t.id)) ?? SPEAKING_TOPICS[0];
  const speakingDoneToday = (store.speakingAttempts ?? []).findLast(a => dayKey(a.finishedAt) === today);

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

  // Xen kẽ ngày chẵn/lẻ giữa Writing và Speaking (hoặc hiện cả hai nếu đã làm hôm nay)
  const dayNum = Number(today.slice(8)) || 1;
  const showWritingToday = !!writingDoneToday || dayNum % 2 === 0;
  if (writingDoneToday) {
    const pDone = WRITING_PROMPTS.find(x => x.id === writingDoneToday.promptId);
    tasks.push({
      key: 'writing',
      icon: PenTool,
      title: `Writing · ${pDone?.task === 'task1' ? 'Task 1' : 'Task 2'}`,
      detail: `${pDone?.title ?? writingDoneToday.promptId}${writingDoneToday.feedback ? ` · Band ${fmtBand(writingDoneToday.feedback.scores.overall)}` : ''}`,
      href: `/writing/${writingDoneToday.promptId}?attempt=${writingDoneToday.id}`,
      done: true,
      mins: 20,
    });
  } else if (showWritingToday) {
    tasks.push({
      key: 'writing',
      icon: PenTool,
      title: `Writing · ${nextW.task === 'task1' ? 'Task 1' : 'Task 2'}`,
      detail: `${nextW.title} (${nextW.categoryLabel})`,
      href: `/writing/${nextW.id}`,
      done: false,
      mins: 20,
    });
  }

  if (speakingDoneToday) {
    const tDone = SPEAKING_TOPICS.find(x => x.id === speakingDoneToday.topicId);
    tasks.push({
      key: 'speaking',
      icon: Mic,
      title: 'Speaking · Examiner trực tiếp',
      detail: `${tDone?.title ?? speakingDoneToday.topicId}${speakingDoneToday.feedback ? ` · Band ${fmtBand(speakingDoneToday.feedback.scores.overall)}` : ''}`,
      href: `/speaking/${speakingDoneToday.topicId}?attempt=${speakingDoneToday.id}`,
      done: true,
      mins: 10,
    });
  } else if (!showWritingToday) {
    tasks.push({
      key: 'speaking',
      icon: Mic,
      title: 'Speaking · Luyện nói 1-1',
      detail: `${nextS.title} (${nextS.themeVi})`,
      href: `/speaking/${nextS.id}`,
      done: false,
      mins: 10,
    });
  }

  const totalMistakes = mistakes.length + gMistakes.length;
  if (totalMistakes) {
    tasks.push({
      key: 'mistakes',
      icon: NotebookPen,
      title: `Làm lại ${totalMistakes} câu sai`,
      detail: 'Câu trắc nghiệm & câu viết/nói quay lại theo nhịp 1–3–7 ngày',
      href: '/mistakes',
      done: false,
      mins: Math.max(3, totalMistakes * 2),
    });
  }
  const doneCount = tasks.filter(t => t.done).length;
  // Đã xong phần của hôm nay mà còn sức: gợi ý phần kế tiếp
  const extra = ([nextL, nextR] as const).filter((s): s is Suggestion => !!s && !!doneToday(s.skill));

  const bandL = bandEstimate(store, 'listening');
  const bandR = bandEstimate(store, 'reading');
  const bandW = writingBandEstimate(store);
  const bandS = speakingBandEstimate(store);
  const weak = typeStats(store).filter(t => t.all >= 5).slice(0, 3);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const duoMood = doneCount === tasks.length && tasks.length > 0 ? 'done' : minutes === 0 ? 'welcome' : 'study';

  return (
    <div className="space-y-8">
      <header className="flex flex-col-reverse gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
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
        </div>
        <MascotDuo size={130} mood={duoMood} />
      </header>

      <CoachNoteCard />

      {/* Mục tiêu ngày + chuỗi */}
      <section className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        <div className="card flex items-center gap-4 p-5">
          <Ring pct={goalPct} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Mục tiêu hôm nay</p>
            <p className="mt-1 font-serif text-[26px] leading-none font-semibold">
              <span className="num">{minutes}</span>
              <span className="text-[17px] text-muted">/{p.goalMinutes} phút</span>
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {goalPct >= 1 ? 'Đã đạt mục tiêu. Học thêm là tiền lãi.' : `Còn ${p.goalMinutes - minutes} phút nữa.`}
            </p>
          </div>
          <HedgehogMascot pose={goalPct >= 1 ? 'celebrate' : 'goal'} size={62} className="hidden sm:block" />
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <Flame lit={isActive(log)} frozen={store.frozenDays.includes(today)} size={36} />
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
          {!isActive(log) && (
            <p className="mt-3 rounded-lg bg-sunk/70 px-3 py-2 text-[13px] leading-snug text-ink-2">
              Hôm nay mệt? Chỉ cần{' '}
              {store.words.length >= 10 ? (
                <Link href="/vocab/review" className="font-semibold text-accent hover:underline">
                  ôn 10 thẻ từ
                </Link>
              ) : (
                'ôn 10 thẻ từ'
              )}{' '}
              hoặc học 10 phút là giữ được chuỗi.
            </p>
          )}
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
          {tasks.map((t, i) => {
            const isPersonal = t.key === 'vocab' || t.key === 'mistakes';
            const badgeVariant =
              t.key === 'vocab'
                ? 'vocab'
                : t.key === 'mistakes'
                  ? 'mistakes'
                  : t.key === 'listening'
                    ? 'listening'
                    : t.key === 'writing'
                      ? 'writing'
                      : t.key === 'speaking'
                        ? 'speaking'
                        : 'reading';
            return (
              <li key={t.key}>
                <Link href={t.href} className="group flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-sunk/50 sm:px-5">
                  <span
                    className={`num flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      t.done ? 'bg-good text-white' : 'border border-line-strong text-ink-2'
                    }`}
                  >
                    {t.done ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </span>
                  <MascotBadge character={isPersonal ? 'hedgehog' : 'seal'} variant={badgeVariant} size={36} className="hidden sm:inline-flex" />
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${t.done ? 'text-muted line-through decoration-1' : ''}`}>{t.title}</p>
                    <p className="truncate text-sm text-muted">{t.detail}</p>
                  </div>
                  <span className="hidden text-xs text-muted sm:block">~{t.mins} phút</span>
                  <ArrowRight size={17} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            );
          })}
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
          <div className="flex items-center gap-2">
            <MascotBadge character="seal" variant="reading" size={28} />
            <p className="eyebrow">Band ước tính 4 kỹ năng</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {([['Listening', bandL], ['Reading', bandR]] as const).map(([name, b]) => (
              <div key={name}>
                <p className="text-sm text-ink-2">{name}</p>
                {b ? (
                  <>
                    <p className="mt-1 font-serif text-[32px] leading-none font-semibold">{fmtBand(b.avg)}</p>
                    <p className="mt-1 text-xs text-muted">
                      TB {b.count} đề thi thử · {b.avg >= p.target ? 'chạm mục tiêu' : `còn ${(p.target - b.avg).toFixed(1)}`}
                    </p>
                  </>
                ) : (
                  <TierMeter store={store} index={index} skill={name === 'Listening' ? 'listening' : 'reading'} />
                )}
              </div>
            ))}
            <div>
              <p className="text-sm text-ink-2">Writing</p>
              {bandW ? (
                <>
                  <p className="mt-1 font-serif text-[32px] leading-none font-semibold">{fmtBand(bandW.avg)}</p>
                  <p className="mt-1 text-xs text-muted">TB {bandW.count} bài chấm AI</p>
                </>
              ) : (
                <p className="mt-1.5 text-xs leading-snug text-muted">
                  <Link href="/writing" className="font-semibold text-accent hover:underline">
                    Viết 1 bài
                  </Link>{' '}
                  để Gemini 4 Argon ước tính band.
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-ink-2">Speaking</p>
              {bandS ? (
                <>
                  <p className="mt-1 font-serif text-[32px] leading-none font-semibold">{fmtBand(bandS.avg)}</p>
                  <p className="mt-1 text-xs text-muted">TB {bandS.count} buổi nói AI</p>
                </>
              ) : (
                <p className="mt-1.5 text-xs leading-snug text-muted">
                  <Link href="/speaking" className="font-semibold text-accent hover:underline">
                    Nói 1 buổi
                  </Link>{' '}
                  với Examiner 3.8 Live.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <MascotBadge character="hedgehog" variant="mistakes" size={28} />
            <p className="eyebrow">Dạng câu hay sai</p>
          </div>
          {weak.length ? (
            <ul className="mt-3 space-y-2.5">
              {weak.map(w => (
                <li key={`${w.skill}${w.type}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {lessonFor(w.skill, w.type) ? (
                        <Link href={`/skills/${lessonFor(w.skill, w.type)!.slug}`} className="hover:underline" title="Xem cách làm dạng này">
                          {w.type}
                        </Link>
                      ) : (
                        w.type
                      )}{' '}
                      <span className="text-muted">· {w.skill === 'listening' ? 'L' : 'R'}</span>
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

// Chưa có bài thi thử: cho thấy còn bao xa để mở phần khó hơn của lộ trình (không quy đổi band từ phần lẻ)
function TierMeter({ store, index, skill }: { store: Store; index: TestIndexEntry[]; skill: Skill }) {
  const tp = tierProgress(store, skill, index);
  if (!tp)
    return (
      <p className="mt-2 text-sm leading-snug text-muted">
        Đã mở hết các phần. Làm một bài thi thử cả 40 câu trên đề chưa làm để có band (bài luyện tập và đề đã gặp không tính).
      </p>
    );
  const word = skill === 'listening' ? 'Part' : 'Passage';
  const pct = tp.acc === null ? 0 : Math.round(tp.acc * 100);
  return (
    <div className="mt-2">
      <p className="text-sm leading-snug text-ink-2">
        Mở {word} {tp.next}: cần trung bình 70% riêng {word} {tp.unit}, trên {tp.need} đề khác nhau
      </p>
      <div className="relative mt-2 h-2 rounded-full bg-sunk">
        <div className={`h-full rounded-full ${pct >= 70 ? 'bg-good' : 'bg-accent'}`} style={{ width: `${Math.min(100, pct)}%` }} />
        <span className="absolute -top-1 h-4 w-0.5 bg-ink-2" style={{ left: '70%' }} aria-hidden="true" />
      </div>
      <p className="num mt-1 text-xs text-muted">
        {tp.count === 0
          ? `Chưa làm ${word} ${tp.unit} ở đề nào`
          : `${pct}% · ${tp.count} đề gần nhất (lần đầu làm)${tp.count < tp.need ? ` · cần thêm ${tp.need - tp.count} đề nữa` : ''}`}
      </p>
    </div>
  );
}
