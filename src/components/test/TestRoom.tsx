'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AArrowDown, AArrowUp, ArrowLeft, Flag, Headphones, BookOpen, Clock, X } from 'lucide-react';
import type { Answers, Attempt, Explanation, Group, ListeningPart, Passage as PassageT, Skill } from '@/lib/types';
import { gradeGroups, isFilled } from '@/lib/scoring';
import { draftKey, logSeconds, recordAttempt, update, useStore } from '@/lib/store';
import { usePref } from '@/lib/hooks';
import { fmtClock } from '@/lib/dates';
import { lessonFor, type LessonDef } from '@/lib/skills';
import { SealMascot } from '../Mascots';
import GroupView from './GroupView';
import Passage from './Passage';
import AudioBar, { type AudioHandle } from './AudioBar';
import Transcript from './Transcript';
import ReviewSummary from './ReviewSummary';

export interface RoomProps {
  testId: string;
  book: number;
  testNo: number;
  skill: Skill;
  units: (PassageT | ListeningPart)[];
  initialMode: 'practice' | 'exam';
  focus?: number[];
  drill?: boolean; // luyện theo dạng: focus là các câu của một nhóm
  attemptId?: string;
}

type Phase = 'intro' | 'doing' | 'review';

// Câu n đã có câu trả lời chưa (dạng chọn nhiều đáp án lưu chung ở câu đầu nhóm)
function isAnswered(groups: Group[], answers: Answers, n: number): boolean {
  const g = groups.find(x => x.questions.some(q => q.n === n));
  if (g?.kind === 'multi') {
    const picked = (answers[g.from] as string[] | undefined) ?? [];
    return picked.length > g.questions.findIndex(q => q.n === n);
  }
  return isFilled(answers[n]);
}

const FS_KEY = 'ielts.fontsize';

export default function TestRoom(props: RoomProps) {
  const { testId, book, testNo, skill, units, focus, drill } = props;
  const home = drill ? '/skills' : '/practice';
  const router = useRouter();
  const store = useStore();
  const isReading = skill === 'reading';
  const unitNums = units.map(u => u.n);
  const dKey = draftKey(testId, skill, unitNums, focus);
  const allGroups = useMemo(() => units.flatMap(u => u.groups), [units]);
  const [onlyWrong, setOnlyWrong] = useState(false); // xem lại: chỉ hiện nhóm câu có câu sai
  const shownGroups = (u: PassageT | ListeningPart) =>
    focus?.length ? u.groups.filter(g => g.questions.some(q => focus.includes(q.n))) : u.groups;
  const qNums = useMemo(() => {
    const all = allGroups.flatMap(g => g.questions.map(q => q.n));
    return focus?.length ? all.filter(n => focus.includes(n)) : all;
  }, [allGroups, focus]);

  const reviewAttempt = useMemo(
    () => (props.attemptId && store ? store.attempts.find(a => a.id === props.attemptId) : undefined),
    [props.attemptId, store],
  );

  // Dạng câu trong bài mà người học chưa đọc bài "cách làm": gợi ý ngay ở màn mở đầu
  const hints = useMemo(() => {
    const out: LessonDef[] = [];
    if (!store) return out;
    for (const g of allGroups) {
      if (focus?.length && !g.questions.some(q => focus.includes(q.n))) continue;
      const l = lessonFor(skill, g.type);
      if (l && !out.includes(l) && !store.lessons[l.slug]?.done) out.push(l);
    }
    return out;
  }, [store, allGroups, focus, skill]);

  const [phase, setPhase] = useState<Phase>(props.attemptId ? 'review' : 'intro');
  const [mode, setMode] = useState<'practice' | 'exam'>(focus?.length ? 'practice' : props.initialMode);
  const [answers, setAnswers] = useState<Answers>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [unitIdx, setUnitIdx] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'text' | 'questions'>('questions');
  const [fontPref, setFontPref] = usePref<string>(FS_KEY, '17');
  const fontSize = Math.min(22, Math.max(14, Number(fontPref) || 17));
  const [confirm, setConfirm] = useState<null | 'submit' | 'exit'>(null);
  const [audioDone, setAudioDone] = useState<number | null>(null); // thi thử nghe: mốc bắt đầu 2 phút kiểm tra
  const audioRef = useRef<AudioHandle>(null);
  const pendingPlay = useRef(false);
  const unloggedSeconds = useRef(0);

  const changeFont = (d: number) => setFontPref(String(Math.min(22, Math.max(14, fontSize + d))));

  const draft = store?.drafts[dKey];

  // ---------- Đồng hồ ----------
  const limit = mode === 'exam' && isReading ? units.length * 20 * 60 : null;
  useEffect(() => {
    if (phase !== 'doing') return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setSeconds(s => s + 1);
      unloggedSeconds.current += 1;
      if (unloggedSeconds.current >= 30) {
        logSeconds(unloggedSeconds.current);
        unloggedSeconds.current = 0;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Ghi nốt thời gian khi rời trang
  useEffect(() => {
    const flush = () => {
      if (unloggedSeconds.current > 0) {
        logSeconds(unloggedSeconds.current);
        unloggedSeconds.current = 0;
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  // Lưu nháp
  useEffect(() => {
    if (phase !== 'doing') return;
    const t = setTimeout(() => {
      update(s => {
        s.drafts[dKey] = { answers, seconds, flagged, startedAt };
      });
    }, 400);
    return () => clearTimeout(t);
  }, [answers, flagged, seconds, phase, dKey, startedAt]);

  const submit = useCallback(() => {
    setConfirm(null);
    if (unloggedSeconds.current > 0) {
      logSeconds(unloggedSeconds.current);
      unloggedSeconds.current = 0;
    }
    const graded = gradeGroups(allGroups, answers, focus);
    const blank = qNums.filter(n => !isAnswered(allGroups, answers, n));
    const attempt: Attempt = {
      id: `a${Date.now().toString(36)}`,
      testId,
      skill,
      units: unitNums,
      mode,
      focus,
      ...(drill ? { drill: true } : {}),
      startedAt: startedAt || Date.now(),
      finishedAt: Date.now(),
      seconds,
      answers,
      ...graded,
      blank,
      incomplete: qNums.length - blank.length < qNums.length / 2,
    };
    recordAttempt(attempt);
    setPhase('review');
    setEvidence(null);
    window.scrollTo({ top: 0 });
    const url = new URL(window.location.href);
    url.searchParams.set('attempt', attempt.id);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [allGroups, qNums, answers, focus, drill, testId, skill, unitNums, mode, startedAt, seconds, router]);

  // Hết giờ (thi thử Reading) hoặc hết 2 phút kiểm tra (thi thử Listening)
  const remaining = limit !== null ? limit - seconds : audioDone !== null ? 120 - (seconds - audioDone) : null;
  useEffect(() => {
    if (phase !== 'doing' || remaining === null || remaining > 0) return;
    const t = setTimeout(submit, 0);
    return () => clearTimeout(t);
  }, [remaining, phase, submit]);

  const start = (resume: boolean) => {
    if (resume && draft) {
      setAnswers(draft.answers);
      setSeconds(draft.seconds);
      setFlagged(draft.flagged);
      setStartedAt(draft.startedAt);
    } else {
      setAnswers({});
      setSeconds(0);
      setFlagged([]);
      setStartedAt(Date.now());
    }
    setUnitIdx(0);
    setPhase('doing');
    if (!isReading && mode === 'exam') pendingPlay.current = true;
  };

  // Thi thử nghe: tự phát khi vào bài
  useEffect(() => {
    if (phase === 'doing' && pendingPlay.current) {
      pendingPlay.current = false;
      setTimeout(() => audioRef.current?.play(), 300);
    }
  }, [phase, unitIdx]);

  const onAnswer = (n: number, v: string | string[]) => {
    setAnswers(a => ({ ...a, [n]: v }));
    setCurrent(n);
  };

  const unitOf = (n: number) => units.findIndex(u => u.groups.some(g => g.questions.some(q => q.n === n)));
  const goTo = (n: number) => {
    const i = unitOf(n);
    const locked = mode === 'exam' && !isReading && phase === 'doing';
    if (i >= 0 && i !== unitIdx && !locked) setUnitIdx(i);
    setCurrent(n);
    setMobilePane('questions');
    setTimeout(() => document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const shownAnswers = phase === 'review' && reviewAttempt ? reviewAttempt.answers : answers;
  const answered = (n: number) => isAnswered(allGroups, shownAnswers, n);
  const unanswered = qNums.filter(n => !answered(n)).length;
  const tooFew = qNums.length - unanswered < qNums.length / 2; // nộp lúc này sẽ không được tính

  const title = `Cambridge ${book} · Test ${testNo}`;
  const unitLabel = (u: PassageT | ListeningPart) => (isReading ? `Passage ${u.n}` : `Part ${u.n}`);
  const unit = units[unitIdx];
  const results = phase === 'review' ? reviewAttempt?.results : undefined;
  const locate = (ex: Explanation) => {
    setEvidence(null);
    setTimeout(() => setEvidence(ex.evidence ?? null), 10);
    setMobilePane('text');
  };

  // ---------- Màn mở đầu ----------
  if (phase === 'intro') {
    return (
      <Intro
        title={title}
        skill={skill}
        units={units.map(u => ({ n: u.n, title: u.title, label: unitLabel(u) }))}
        count={qNums.length}
        mode={mode}
        setMode={setMode}
        focus={focus}
        drill={drill}
        home={home}
        hints={hints}
        hasDraft={!!draft && Object.keys(draft.answers).length > 0}
        onStart={start}
      />
    );
  }

  if (phase === 'review' && !reviewAttempt) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-muted">
        {store ? (
          <div>
            <p>Không tìm thấy bài làm này trên máy.</p>
            <Link href="/practice" className="btn-ghost mt-4">
              Về thư viện đề
            </Link>
          </div>
        ) : (
          'Đang tải…'
        )}
      </div>
    );
  }

  const isListeningExam = !isReading && mode === 'exam' && phase === 'doing';
  const wrongNums = results ? Object.keys(results).map(Number).filter(n => !results[n]) : [];
  const visibleGroups = (u: PassageT | ListeningPart) =>
    phase === 'review' && onlyWrong ? shownGroups(u).filter(g => g.questions.some(q => results?.[q.n] === false)) : shownGroups(u);
  const groupProps = {
    answers: shownAnswers,
    onAnswer: phase === 'doing' ? onAnswer : undefined,
    review: results ? { results } : undefined,
    focus,
    onLocate: locate,
    reasonFor: phase === 'review' ? { testId, skill } : undefined,
    wordGuard: phase === 'doing' && mode === 'practice',
  };
  const filterBar =
    phase === 'review' && wrongNums.length > 0 ? (
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <div className="inline-flex rounded-lg border border-line-strong bg-surface p-1">
          {([false, true] as const).map(w => (
            <button
              key={String(w)}
              onClick={() => setOnlyWrong(w)}
              className={`rounded-md px-3 py-1 font-medium ${onlyWrong === w ? 'bg-ink text-paper' : 'text-ink-2'}`}
            >
              {w ? `Chỉ câu sai (${wrongNums.length})` : `Tất cả (${qNums.length})`}
            </button>
          ))}
        </div>
        {onlyWrong && visibleGroups(unit).length === 0 && <span className="text-muted">{isReading ? 'Passage' : 'Part'} này không có câu sai.</span>}
      </div>
    ) : null;
  // Phần nghe có bản đồ: nới rộng khung để hình đủ lớn, các nhóm câu khác giữ bề rộng cũ
  const wide = !isReading && phase !== 'review' && unit.groups.some(g => g.image);
  const narrow = wide ? 'mx-auto max-w-[44rem]' : '';

  return (
    <div className="flex h-dvh flex-col bg-paper" style={{ ['--passage-size' as string]: `${fontSize}px` }}>
      {/* ---------- Thanh trên ---------- */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:px-4">
        <button
          className="btn-quiet"
          onClick={() => (phase === 'doing' ? setConfirm('exit') : router.push(home))}
          aria-label="Thoát"
        >
          {phase === 'doing' ? <X size={18} /> : <ArrowLeft size={18} />}
        </button>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold">
            <span className="sm:hidden">
              Cam {book} · Test {testNo}
            </span>
            <span className="hidden sm:inline">{title}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-hidden text-xs whitespace-nowrap text-muted">
            {isReading ? <BookOpen size={12} /> : <Headphones size={12} />}
            {isReading ? 'Reading' : 'Listening'}
            {drill ? ' · luyện theo dạng' : focus?.length ? ' · làm lại câu sai' : mode === 'exam' ? ' · thi thử' : ' · luyện tập'}
          </div>
        </div>

        {units.length > 1 && (
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {units.map((u, i) => (
              <button
                key={u.n}
                disabled={isListeningExam}
                onClick={() => setUnitIdx(i)}
                className={`rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                  i === unitIdx ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunk disabled:hover:bg-transparent'
                }`}
              >
                {unitLabel(u)}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {isReading && (
            <div className="mr-1 hidden items-center sm:flex">
              <button className="btn-quiet px-2" onClick={() => changeFont(-1)} aria-label="Chữ nhỏ hơn">
                <AArrowDown size={17} />
              </button>
              <button className="btn-quiet px-2" onClick={() => changeFont(1)} aria-label="Chữ lớn hơn">
                <AArrowUp size={17} />
              </button>
            </div>
          )}
          {phase === 'doing' && (
            <div
              className={`num mr-1 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[14px] font-semibold sm:mr-2 sm:px-2 ${
                remaining !== null && remaining < 300 ? 'bg-bad-soft text-bad' : 'text-ink-2'
              }`}
              title={remaining !== null ? 'Thời gian còn lại' : 'Thời gian đã làm'}
            >
              <Clock size={14} />
              {remaining !== null ? fmtClock(remaining) : fmtClock(seconds)}
            </div>
          )}
          {phase === 'doing' ? (
            <button className="btn-primary whitespace-nowrap" onClick={() => (unanswered ? setConfirm('submit') : submit())}>
              Nộp bài
            </button>
          ) : (
            <Link
              href={`/test/${testId}/${skill}?p=${unitNums.join(',')}${drill && focus ? `&focus=${focus.join(',')}&drill=1` : ''}`}
              className="btn-ghost whitespace-nowrap"
              onClick={() => setPhase('intro')}
            >
              Làm lại
            </Link>
          )}
        </div>
      </header>

      {/* ---------- Nội dung ---------- */}
      {isReading ? (
        <>
          <div className="flex border-b border-line bg-surface lg:hidden">
            {(['text', 'questions'] as const).map(k => (
              <button
                key={k}
                onClick={() => setMobilePane(k)}
                className={`flex-1 py-2 text-[13px] font-semibold ${mobilePane === k ? 'border-b-2 border-ink text-ink' : 'text-muted'}`}
              >
                {k === 'text' ? 'Bài đọc' : 'Câu hỏi'}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className={`scroll-thin min-h-0 overflow-y-auto border-line bg-surface lg:border-r ${mobilePane === 'text' ? 'block' : 'hidden lg:block'}`}>
              <div className="mx-auto max-w-[44rem] py-8 pr-6 pl-12 sm:pr-10 sm:pl-16">
                <Passage
                  testId={testId}
                  passage={unit as PassageT}
                  evidence={evidence}
                  source={`Cam ${book} · Test ${testNo} · Reading ${unit.n}`}
                />
              </div>
            </div>
            <div className={`scroll-thin min-h-0 overflow-y-auto ${mobilePane === 'questions' ? 'block' : 'hidden lg:block'}`}>
              <div className="mx-auto max-w-[42rem] px-5 py-8 sm:px-8">
                {phase === 'review' && reviewAttempt && (
                  <ReviewSummary attempt={reviewAttempt} units={units} testId={testId} source={`Cam ${book} · Test ${testNo}`} />
                )}
                {filterBar}
                {visibleGroups(unit).map(g => (
                  <GroupView key={g.from} g={g} {...groupProps} />
                ))}
                <UnitPager units={units} idx={unitIdx} setIdx={setUnitIdx} label={unitLabel} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <div className={`mx-auto px-4 py-6 sm:px-8 ${phase === 'review' ? 'max-w-6xl' : wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
            <div className="sticky top-0 z-10 -mx-1 bg-paper/95 px-1 pt-1 pb-3 backdrop-blur">
              <div className={narrow}>
              <AudioBar
                key={(unit as ListeningPart).audio}
                ref={audioRef}
                src={`/api/audio/${(unit as ListeningPart).audio}`}
                label={`Part ${unit.n} · ${unit.title}`}
                locked={isListeningExam}
                onEnded={() => {
                  if (!isListeningExam) return;
                  if (unitIdx < units.length - 1) {
                    pendingPlay.current = true;
                    setUnitIdx(i => i + 1);
                    window.scrollTo({ top: 0 });
                  } else {
                    setAudioDone(seconds);
                  }
                }}
              />
              {isListeningExam && audioDone !== null && (
                <p className="mt-2 rounded-md bg-ember-soft px-3 py-1.5 text-center text-[13px] font-medium text-ember">
                  Audio đã hết. Bạn còn 2 phút để kiểm tra lại câu trả lời.
                </p>
              )}
              </div>
            </div>
            <div className={phase === 'review' ? 'grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : ''}>
              {phase === 'review' && (
                <aside className="order-2 lg:order-1">
                  <div className="lg:scroll-thin rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
                    <p className="eyebrow mb-3">Transcript · Part {unit.n}</p>
                    <Transcript script={(unit as ListeningPart).script} evidence={evidence} />
                  </div>
                </aside>
              )}
              <div className="order-1 lg:order-2">
                {phase === 'review' && reviewAttempt && (
                  <ReviewSummary attempt={reviewAttempt} units={units} testId={testId} source={`Cam ${book} · Test ${testNo}`} />
                )}
                {filterBar}
                {visibleGroups(unit).map(g => (
                  <div key={g.from} className={g.image ? '' : narrow}>
                    <GroupView g={g} {...groupProps} locateLabel="Xem trong transcript" />
                  </div>
                ))}
                {!isListeningExam && (
                  <div className={narrow}>
                    <UnitPager units={units} idx={unitIdx} setIdx={setUnitIdx} label={unitLabel} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Thanh câu hỏi ---------- */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-3 py-2">
        <div className="scroll-thin flex min-w-0 flex-1 gap-1 overflow-x-auto py-0.5">
          {qNums.map(n => {
            const r = results?.[n];
            const isFlag = flagged.includes(n);
            const tone =
              r === true
                ? 'bg-good text-white'
                : r === false
                  ? answered(n)
                    ? 'bg-bad text-white'
                    : 'bg-bad-soft text-bad ring-1 ring-bad ring-inset' // bỏ trống
                  : answered(n)
                    ? 'bg-ink text-paper'
                    : 'bg-surface text-ink-2 ring-1 ring-line-strong ring-inset';
            return (
              <button
                key={n}
                onClick={() => goTo(n)}
                className={`num relative size-8 shrink-0 rounded-md text-[12.5px] font-bold ${tone} ${current === n ? 'outline-2 outline-offset-1 outline-accent' : ''}`}
              >
                {n}
                {isFlag && <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-surface bg-ember" />}
              </button>
            );
          })}
        </div>
        {phase === 'doing' && (
          <button
            className={`btn-quiet shrink-0 ${current && flagged.includes(current) ? 'text-ember' : ''}`}
            disabled={!current}
            onClick={() => current && setFlagged(f => (f.includes(current) ? f.filter(x => x !== current) : [...f, current]))}
            title="Đánh dấu câu để xem lại"
          >
            <Flag size={16} />
            <span className="hidden sm:inline">Đánh dấu</span>
          </button>
        )}
      </footer>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4" onMouseDown={() => setConfirm(null)}>
          <div className="card w-full max-w-sm p-5" onMouseDown={e => e.stopPropagation()}>
            <SealMascot pose="encourage" size={56} className="mx-auto mb-2" />
            {confirm === 'submit' ? (
              <>
                <p className="font-semibold">Nộp bài khi còn {unanswered} câu bỏ trống?</p>
                <p className="mt-1 text-sm text-muted">
                  {tooFew
                    ? `Bạn mới trả lời ${qNums.length - unanswered}/${qNums.length} câu. Nộp bây giờ thì bài này không được tính là đã làm và không tính vào chuỗi ngày.`
                    : 'Trong phòng thi thật, đoán vẫn tốt hơn bỏ trống vì không bị trừ điểm.'}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">Tạm rời bài làm?</p>
                <p className="mt-1 text-sm text-muted">Câu trả lời đã được lưu nháp. Lần sau mở lại đề này bạn có thể làm tiếp.</p>
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-quiet" onClick={() => setConfirm(null)}>
                Ở lại
              </button>
              {confirm === 'submit' ? (
                <button className="btn-primary" onClick={submit}>
                  Nộp bài
                </button>
              ) : (
                <button className="btn-primary" onClick={() => router.push(home)}>
                  Rời bài
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitPager({ units, idx, setIdx, label }: { units: { n: number }[]; idx: number; setIdx: (i: number) => void; label: (u: never) => string }) {
  if (units.length < 2) return null;
  return (
    <div className="mt-2 flex justify-between border-t border-line pt-5">
      <button className="btn-ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
        ← {idx > 0 ? label(units[idx - 1] as never) : ''}
      </button>
      <button className="btn-ghost" disabled={idx === units.length - 1} onClick={() => setIdx(idx + 1)}>
        {idx < units.length - 1 ? label(units[idx + 1] as never) : ''} →
      </button>
    </div>
  );
}

// ---------- Màn mở đầu ----------

function Intro(p: {
  title: string;
  skill: Skill;
  units: { n: number; title: string; label: string }[];
  count: number;
  mode: 'practice' | 'exam';
  setMode: (m: 'practice' | 'exam') => void;
  focus?: number[];
  drill?: boolean;
  home: string;
  hints: LessonDef[];
  hasDraft: boolean;
  onStart: (resume: boolean) => void;
}) {
  const reading = p.skill === 'reading';
  const examTime = reading ? `${p.units.length * 20} phút, hết giờ tự nộp` : 'Audio phát một lần, không dừng, không tua';
  const modes = [
    {
      k: 'practice' as const,
      name: 'Luyện tập',
      desc: reading ? 'Không giới hạn giờ. Tô sáng, lưu từ thoải mái.' : 'Nghe tua lại được, chỉnh tốc độ, dừng khi cần.',
    },
    { k: 'exam' as const, name: 'Thi thử', desc: examTime },
  ];
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
      <div className="w-full max-w-lg">
        <Link href={p.home} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> {p.drill ? 'Kỹ năng' : 'Thư viện đề'}
        </Link>
        <div className="card mt-4 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{p.title}</p>
              <h1 className="mt-2 font-serif text-[28px] leading-tight font-semibold">
                {reading ? 'Reading' : 'Listening'}
                {p.units.length === 1 ? ` · ${p.units[0].label}` : ' · cả bài'}
              </h1>
            </div>
            <SealMascot pose={reading ? 'reading' : 'listening'} size={78} className="hidden sm:block" />
          </div>
          <ul className="mt-4 space-y-1.5">
            {p.units.map(u => (
              <li key={u.n} className="flex gap-3 text-[15px]">
                <span className="w-16 shrink-0 text-muted">{u.label}</span>
                <span className="font-serif">{u.title}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-2">
            {p.drill && p.focus?.length
              ? `Luyện theo dạng: câu ${p.focus[0]}–${p.focus[p.focus.length - 1]} (${p.count} câu)`
              : p.focus?.length
                ? `Làm lại ${p.count} câu đã sai: ${p.focus.join(', ')}`
                : `${p.count} câu hỏi`}
          </p>
          {p.drill && !reading && (
            <p className="mt-1 text-sm text-muted">Audio phát từ đầu Part. Nghe tới đoạn của các câu này rồi trả lời.</p>
          )}
          {p.hints.length > 0 && (
            <div className="mt-5 rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm">
              <p className="text-ink-2">Phần này có dạng câu bạn chưa học cách làm:</p>
              <ul className="mt-1.5 space-y-1">
                {p.hints.map(h => (
                  <li key={h.slug}>
                    <Link href={`/skills/${h.slug}`} className="font-semibold text-accent hover:underline">
                      {h.title}
                    </Link>
                    <span className="text-muted"> · {h.minutes} phút</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!p.focus?.length && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {modes.map(m => (
                <button
                  key={m.k}
                  onClick={() => p.setMode(m.k)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    p.mode === m.k ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:bg-sunk'
                  }`}
                >
                  <div className="font-semibold">{m.name}</div>
                  <div className={`mt-1 text-[13px] leading-snug ${p.mode === m.k ? 'text-paper/75' : 'text-muted'}`}>{m.desc}</div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {p.hasDraft && (
              <button className="btn-primary" onClick={() => p.onStart(true)}>
                Làm tiếp bài dở
              </button>
            )}
            <button className={p.hasDraft ? 'btn-ghost' : 'btn-primary'} onClick={() => p.onStart(false)}>
              {p.hasDraft ? 'Làm lại từ đầu' : 'Bắt đầu'}
            </button>
          </div>
          {!reading && (
            <p className="mt-4 text-xs text-muted">Đeo tai nghe. Khi luyện tập: Space để dừng/phát, ← → để tua 5 giây.</p>
          )}
        </div>
      </div>
    </div>
  );
}
