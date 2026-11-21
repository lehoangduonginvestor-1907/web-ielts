'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Layers,
  NotebookPen,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import type { WritingAttempt, WritingFeedback, WritingMode, WritingPrompt, WritingSentenceFix } from '@/lib/types';
import {
  addGrammarMistakes,
  addWord,
  hasWord,
  logSeconds,
  recordWritingAttempt,
  saveWritingDraft,
  updateWritingAttempt,
  useStore,
} from '@/lib/store';
import { fmtBand } from '@/lib/band';
import { fmtClock, fmtDuration } from '@/lib/dates';
import { writingTierOf } from '@/lib/progress';
import { readGradeResponse } from '@/lib/gradeClient';
import {
  buildWritingManualPrompt,
  buildWritingSocraticPrompt,
  summarizeGrammarMistakes,
} from '@/lib/manualGrade';
import GeminiContextPanel from '../GeminiContextPanel';
import GeminiGradeGuide from '../GeminiGradeGuide';
import { MascotLoading, SealMascot } from '../Mascots';

type Phase = 'intro' | 'writing' | 'review';

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const CRITERION_NAME: Record<'task' | 'cc' | 'lr' | 'gra', string> = {
  task: 'Task',
  cc: 'Coherence',
  lr: 'Lexical',
  gra: 'Grammar',
};

export default function WritingRoom({ prompt, attemptId }: { prompt: WritingPrompt; attemptId?: string }) {
  const store = useStore();
  const router = useRouter();

  const existing = useMemo(
    () => (attemptId && store ? store.writingAttempts?.find(a => a.id === attemptId) : undefined),
    [attemptId, store],
  );

  const [phase, setPhase] = useState<Phase>(attemptId ? 'review' : 'intro');
  const [pickedMode, setMode] = useState<WritingMode | null>(null);
  const wTier = store ? writingTierOf(store) : 0;
  const mode: WritingMode = pickedMode ?? (wTier >= 2 ? 'exam' : wTier === 1 ? 'full' : 'step');
  const [text, setText] = useState('');
  const [stepTexts, setStepTexts] = useState<string[]>(() => prompt.scaffold.map(() => ''));
  const [seconds, setSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(attemptId ?? null);
  const [selectedFix, setSelectedFix] = useState<number | null>(null);
  const [reviewTab, setReviewTab] = useState<'fixes' | 'paragraphs' | 'sample'>('fixes');
  const [zoomChart, setZoomChart] = useState(false);
  const [showSupport, setShowSupport] = useState(true);
  const [vocabToast, setVocabToast] = useState<string | null>(null);
  const [mistakeToast, setMistakeToast] = useState<string | null>(null);
  const [socraticToast, setSocraticToast] = useState<{ key: string; msg: string; fallbackText?: string } | null>(null);

  const topErrorPatterns = useMemo(
    () => summarizeGrammarMistakes(store, 'writing').topPatterns.map(p => p.pattern),
    [store],
  );

  const copySocratic = async (key: string, sectionLabel: string, draftText: string) => {
    const promptText = buildWritingSocraticPrompt({ prompt, sectionLabel, draftText, topErrorPatterns });
    try {
      await navigator.clipboard.writeText(promptText);
      setSocraticToast({ key, msg: 'Socratic prompt copied — paste it into the Gemini side panel' });
      setTimeout(() => {
        setSocraticToast(cur => (cur?.key === key ? null : cur));
      }, 3000);
    } catch {
      setSocraticToast({
        key,
        msg: 'Your browser blocked automatic copying — select and press Ctrl+C below:',
        fallbackText: promptText,
      });
    }
  };

  const currentAttempt: WritingAttempt | undefined = useMemo(() => {
    if (!store) return undefined;
    const id = activeAttemptId ?? attemptId;
    return id ? store.writingAttempts?.find(a => a.id === id) : undefined;
  }, [store, activeAttemptId, attemptId]);

  const draft = store?.writingDrafts?.[prompt.id];
  const hasDraft = !!draft && (draft.text.trim().length > 0 || draft.stepTexts.some(x => x.trim().length > 0));

  const combinedText = mode === 'step' ? stepTexts.map(s => s.trim()).filter(Boolean).join('\n\n') : text;
  const wc = countWords(combinedText);
  const limit = mode === 'exam' ? prompt.recommendedMinutes * 60 : null;
  const remaining = limit !== null ? Math.max(0, limit - seconds) : null;

  // Timer while writing
  useEffect(() => {
    if (phase !== 'writing') return;
    let unlogged = 0;
    const t0 = Date.now() - seconds * 1000;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - t0) / 1000);
      setSeconds(elapsed);
      unlogged++;
      if (unlogged >= 30) {
        logSeconds(unlogged);
        unlogged = 0;
      }
    }, 1000);
    return () => {
      clearInterval(id);
      if (unlogged > 0) logSeconds(unlogged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-save draft
  useEffect(() => {
    if (phase !== 'writing') return;
    const t = setTimeout(() => {
      saveWritingDraft({ promptId: prompt.id, mode, text, stepTexts, seconds, startedAt });
    }, 600);
    return () => clearTimeout(t);
  }, [phase, prompt.id, mode, text, stepTexts, seconds, startedAt]);

  const start = (resume: boolean) => {
    if (resume && draft) {
      setMode(draft.mode);
      setText(draft.text);
      setStepTexts(draft.stepTexts.length === prompt.scaffold.length ? draft.stepTexts : prompt.scaffold.map(() => ''));
      setSeconds(draft.seconds);
      setStartedAt(draft.startedAt);
    } else {
      setText('');
      setStepTexts(prompt.scaffold.map(() => ''));
      setSeconds(0);
      setStartedAt(Date.now());
    }
    setPhase('writing');
  };

  /** Gửi JSON Gemini trả về lên máy chủ để kiểm tra (đủ điểm, đúng bài) và tính band. */
  const gradeFromGemini = useCallback(
    async (attempt: WritingAttempt, rawJson: string) => {
      const res = await fetch('/api/writing/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: prompt.id, essay: attempt.text, attemptId: attempt.id, manualJson: rawJson }),
      });
      const data = await readGradeResponse<{ feedback?: WritingFeedback; error?: string }>(res, 'Could not read this result.');
      updateWritingAttempt(attempt.id, a => {
        a.feedback = data.feedback;
      });
    },
    [prompt.id],
  );

  const submitEssay = useCallback(async () => {
    const essayText = combinedText.trim();
    if (!essayText) return;
    const id = `w${Date.now().toString(36)}`;
    const attempt: WritingAttempt = {
      id,
      promptId: prompt.id,
      task: prompt.task,
      mode,
      startedAt: startedAt || Date.now(),
      finishedAt: Date.now(),
      seconds,
      text: essayText,
      wordCount: countWords(essayText),
    };
    recordWritingAttempt(attempt);
    setActiveAttemptId(id);
    setPhase('review');
    router.replace(`/writing/${prompt.id}?attempt=${id}`, { scroll: false });
  }, [combinedText, prompt.id, prompt.task, mode, startedAt, seconds, router]);

  // Auto-submit when time runs out in Timed Mock Exam mode
  useEffect(() => {
    if (phase !== 'writing' || remaining === null || remaining > 0 || !combinedText.trim()) return;
    const t = setTimeout(() => void submitEssay(), 0);
    return () => clearTimeout(t);
  }, [phase, remaining, combinedText, submitEssay]);

  if (!store) return <MascotLoading character="seal" label="Seal is sharpening the pencil…" />;

  if (phase === 'intro') {
    const modes: { k: WritingMode; name: string; desc: string }[] = [
      { k: 'step', name: 'Guided Paragraphs (Beginner)', desc: 'Split into 4 clear sections with paragraph goals and starter phrases.' },
      { k: 'full', name: 'Full Essay (Practice)', desc: 'Freeform editor with no time limit and optional outline/vocab support.' },
      { k: 'exam', name: `Timed Mock Exam (${prompt.recommendedMinutes} min)`, desc: 'Hides all hints & vocabulary and counts down under real exam timing.' },
    ];
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
        <div className="w-full max-w-2xl">
          <Link href="/writing" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft size={15} /> Writing Prompt Bank
          </Link>
          <div className="card mt-4 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-accent">
                  Writing {prompt.task === 'task1' ? 'Task 1' : 'Task 2'} · {prompt.categoryLabel}
                </p>
                <h1 className="mt-1.5 font-serif text-[26px] leading-tight font-semibold">{prompt.title}</h1>
              </div>
              <SealMascot pose="writing" size={66} className="hidden sm:block" />
            </div>
            <p className="mt-4 rounded-lg border border-line bg-paper/70 p-4 font-serif text-[15.5px] leading-relaxed whitespace-pre-line">
              {prompt.prompt}
            </p>
            <p className="mt-3 text-xs text-muted">
              Minimum requirement: <strong className="text-ink">{prompt.minWords} words</strong> · Recommended time: {prompt.recommendedMinutes} min ·
              Graded across all 4 IELTS criteria by your Gemini in Chrome after you submit.
            </p>

            <div className="mt-5 grid gap-2">
              {modes.map(m => (
                <button
                  key={m.k}
                  onClick={() => setMode(m.k)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${
                    mode === m.k ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-surface hover:bg-sunk'
                  }`}
                >
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className={`mt-0.5 text-xs ${mode === m.k ? 'text-paper/75' : 'text-muted'}`}>{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {hasDraft && (
                <button className="btn-primary" onClick={() => start(true)}>
                  Resume draft
                </button>
              )}
              <button className={hasDraft ? 'btn-ghost' : 'btn-primary'} onClick={() => start(false)}>
                {hasDraft ? 'Start fresh' : 'Start writing'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const attempt = currentAttempt ?? existing;
  if (phase === 'review' && !attempt) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center text-muted">
        <div>
          <p>This essay attempt could not be found on this device.</p>
          <Link href="/writing" className="btn-ghost mt-4">
            Back to Writing Bank
          </Link>
        </div>
      </div>
    );
  }

  const fb = attempt?.feedback;

  const saveSuggestedVocab = () => {
    if (!fb || !attempt) return;
    let added = 0;
    for (const v of fb.suggestedVocab) {
      if (!hasWord(store, v.word)) {
        if (addWord({ word: v.word, vi: v.vi, pos: v.pos, context: v.context, source: `Writing ${prompt.task === 'task1' ? 'T1' : 'T2'} · ${prompt.title}` })) {
          added++;
        }
      }
    }
    updateWritingAttempt(attempt.id, a => {
      a.addedVocab = true;
    });
    setVocabToast(added > 0 ? `Added ${added} words/phrases to your flashcard deck.` : 'All of these expressions are already in your deck.');
  };

  const saveFixesToMistakes = () => {
    if (!fb || !attempt) return;
    const count = addGrammarMistakes(
      fb.sentenceFixes.map(f => ({
        sourceId: attempt.id,
        skill: 'writing' as const,
        original: f.original,
        improved: f.improved,
        criterion: f.criterion,
        reasonVi: f.reasonVi,
        errorPattern: f.errorPattern,
      })),
    );
    updateWritingAttempt(attempt.id, a => {
      a.addedMistakes = true;
    });
    setMistakeToast(count > 0 ? `Saved ${count} sentence fixes to your Mistake Log (review in 1–3–7 days).` : 'These sentences are already in your Mistake Log.');
  };

  return (
    <div className="flex h-dvh flex-col bg-paper">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
        <Link href="/writing" className="btn-quiet" aria-label="Back">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{prompt.title}</div>
          <div className="text-xs text-muted">
            {prompt.task === 'task1' ? 'Task 1' : 'Task 2'} · {prompt.categoryLabel} ·{' '}
            {phase === 'review' ? 'Review & Band Score' : mode === 'step' ? 'Guided Paragraphs' : mode === 'exam' ? 'Timed Mock Exam' : 'Practice'}
          </div>
        </div>
        {phase === 'writing' ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={`num rounded-md px-2 py-1 text-xs font-bold ${
                wc >= prompt.minWords ? 'bg-good-soft text-good' : 'bg-sunk text-ink-2'
              }`}
            >
              {wc}/{prompt.minWords} words
            </span>
            <span
              className={`num flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                remaining !== null && remaining < 180 ? 'bg-bad-soft text-bad' : 'text-ink-2'
              }`}
            >
              <Clock size={13} />
              {remaining !== null ? fmtClock(remaining) : fmtClock(seconds)}
            </span>
            <button className="btn-primary whitespace-nowrap" disabled={wc < 20} onClick={() => void submitEssay()}>
              Submit essay
            </button>
          </div>
        ) : (
          <Link href={`/writing/${prompt.id}`} className="btn-ghost whitespace-nowrap" onClick={() => setPhase('intro')}>
            Write new essay
          </Link>
        )}
      </header>

      {/* Main Split Workspace */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        {/* Left column: Prompt + Chart + Vocab / Sample Essay */}
        <aside className="scroll-thin min-h-0 overflow-y-auto border-b border-line bg-surface p-5 lg:border-r lg:border-b-0 sm:p-7">
          <div className="mx-auto max-w-xl space-y-5">
            <div>
              <p className="eyebrow">Prompt</p>
              <p className="mt-2 font-serif text-[16px] leading-relaxed whitespace-pre-line text-ink">{prompt.prompt}</p>
            </div>

            {prompt.chartSvg && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="eyebrow">Chart / Diagram</span>
                  <button onClick={() => setZoomChart(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    <ZoomIn size={13} /> Zoom in
                  </button>
                </div>
                <div
                  className="cursor-zoom-in overflow-hidden rounded-xl border border-line bg-paper p-2"
                  onClick={() => setZoomChart(true)}
                  dangerouslySetInnerHTML={{ __html: prompt.chartSvg }}
                />
              </div>
            )}

            {(phase === 'review' || mode !== 'exam') && (
              <div className="rounded-xl border border-line bg-paper/70 p-4">
                <button
                  onClick={() => setShowSupport(s => !s)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen size={15} className="text-accent" /> Topic Vocabulary ({prompt.keyVocab.length})
                  </span>
                  <span className="text-xs text-muted">{showSupport ? 'Hide' : 'Show'}</span>
                </button>
                {showSupport && (
                  <ul className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                    {prompt.keyVocab.map(v => (
                      <li key={v.word} className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-serif font-semibold text-ink">{v.word}</span>{' '}
                          {v.pos && <span className="text-xs text-muted italic">({v.pos})</span>}
                          <p className="text-xs text-ink-2">{v.vi}</p>
                        </div>
                        {!hasWord(store, v.word) ? (
                          <button
                            className="shrink-0 text-xs font-semibold text-accent hover:underline"
                            onClick={() => addWord({ word: v.word, vi: v.vi, pos: v.pos, context: v.context, source: `Writing · ${prompt.title}` })}
                          >
                            + Save word
                          </button>
                        ) : (
                          <span className="shrink-0 text-xs text-good">Saved</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {(phase === 'review' || mode !== 'exam') && (
              <GeminiContextPanel
                store={store}
                skill="writing"
                prompt={prompt}
                essayText={phase === 'review' ? attempt?.text : combinedText}
              />
            )}

            {phase === 'review' && (
              <div className="rounded-xl border border-dashed border-line-strong bg-paper/40 p-4">
                <p className="eyebrow">Band 7.5 Model Essay</p>
                <p className="mt-2 font-serif text-[14.5px] leading-relaxed whitespace-pre-line text-ink-2">{prompt.sampleBand7}</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right column: Editor or Gemini 4 Grading Results */}
        <section className="scroll-thin min-h-0 overflow-y-auto p-5 sm:p-7">
          {phase === 'writing' ? (
            <div className="mx-auto max-w-2xl space-y-4">
              {mode === 'step' ? (
                <>
                  {prompt.scaffold.map((step, idx) => {
                    const swc = countWords(stepTexts[idx] ?? '');
                    const stepText = stepTexts[idx] ?? '';
                    const toastHere = socraticToast?.key === step.id ? socraticToast : null;
                    return (
                      <div key={step.id} className="card p-4 sm:p-5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-bold text-ink">{step.label}</h3>
                          <span className={`num text-xs font-semibold ${swc >= step.minWords ? 'text-good' : 'text-muted'}`}>
                            {swc}/{step.minWords}+ words
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-2">{step.hint}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {step.starters.map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setStepTexts(prev =>
                                  prev.map((val, i) => (i === idx ? (val.trim() ? `${val.trim()} ${st}` : st) : val)),
                                )
                              }
                              className="rounded-md border border-line-strong bg-paper px-2 py-0.5 text-[11.5px] text-ink-2 hover:border-accent hover:text-accent"
                            >
                              + {st}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="field mt-3 min-h-28 resize-y font-serif text-[16px] leading-relaxed"
                          placeholder="Write this paragraph in English…"
                          value={stepText}
                          onChange={e => setStepTexts(prev => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                          spellCheck={false}
                        />
                        {swc >= 10 && (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => void copySocratic(step.id, step.label, stepText)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                            >
                              <Sparkles size={13} /> Ask Gemini for Socratic feedback (no rewriting)
                            </button>
                            {toastHere && !toastHere.fallbackText && (
                              <span className="text-xs font-medium text-good">{toastHere.msg}</span>
                            )}
                          </div>
                        )}
                        {toastHere?.fallbackText && (
                          <div className="mt-2 rounded-lg border border-line bg-paper p-2.5 text-xs">
                            <p className="font-medium text-ink-2">{toastHere.msg}</p>
                            <textarea
                              readOnly
                              rows={3}
                              value={toastHere.fallbackText}
                              onFocus={e => e.currentTarget.select()}
                              className="field mt-1.5 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="card p-4 sm:p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>Essay editor · {combinedText.split(/\n\s*\n/).filter(Boolean).length} paragraphs</span>
                    {mode !== 'exam' && wc >= 10 && (
                      <button
                        type="button"
                        onClick={() => void copySocratic('full', 'Full Essay', combinedText)}
                        className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
                      >
                        <Sparkles size={13} /> Ask Gemini for outline &amp; error hints (no rewriting)
                      </button>
                    )}
                  </div>
                  {socraticToast?.key === 'full' && (
                    <div className="mb-2 rounded-lg border border-line bg-paper p-2.5 text-xs">
                      <p className={socraticToast.fallbackText ? 'font-medium text-ink-2' : 'font-medium text-good'}>
                        {socraticToast.msg}
                      </p>
                      {socraticToast.fallbackText && (
                        <textarea
                          readOnly
                          rows={3}
                          value={socraticToast.fallbackText}
                          onFocus={e => e.currentTarget.select()}
                          className="field mt-1.5 text-xs"
                        />
                      )}
                    </div>
                  )}
                  <textarea
                    className="field min-h-[62dvh] resize-y font-serif text-[16.5px] leading-[1.8]"
                    placeholder="Start writing your essay here… Separate paragraphs clearly by pressing Enter twice."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-6">
              {attempt && (
                <GeminiGradeGuide
                  kind="writing"
                  attemptId={attempt.id}
                  graded={!!fb}
                  getPrompt={() => buildWritingManualPrompt({ prompt, essay: attempt.text, attemptId: attempt.id })}
                  onSubmit={json => gradeFromGemini(attempt, json)}
                />
              )}

              {fb && attempt && (
                <>
                  {/* 4-Criteria Scorecard */}
                  <div className="card overflow-hidden">
                    <div className="flex flex-wrap items-center gap-6 p-5 sm:p-6">
                      <div>
                        <p className="eyebrow text-accent">Estimated Band · {fb.gradedBy ?? 'Gemini 4'}</p>
                        <p className="num mt-1 font-serif text-[46px] leading-none font-semibold text-accent">
                          {fmtBand(fb.scores.overall)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {attempt.wordCount} words · {fmtDuration(attempt.seconds)}
                        </p>
                      </div>
                      <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {[
                          [prompt.task === 'task1' ? 'Task Ach.' : 'Task Resp.', fb.scores.task],
                          ['Coherence', fb.scores.cc],
                          ['Lexical', fb.scores.lr],
                          ['Grammar', fb.scores.gra],
                        ].map(([label, val]) => (
                          <div key={label as string} className="rounded-lg border border-line bg-paper/70 p-2.5 text-center">
                            <div className="text-[11px] font-medium text-muted">{label}</div>
                            <div className="num mt-0.5 font-serif text-xl font-bold text-ink">{fmtBand(val as number)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-line bg-paper/60 px-5 py-4 sm:px-6">
                      <p className="text-[14.5px] leading-relaxed text-ink">{fb.summaryVi}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-bold text-good">Strengths</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-2">
                            {fb.strengthsVi.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ember">Top Priorities</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-2">
                            {fb.prioritiesVi.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 sm:px-6">
                      <button
                        className="btn-ghost"
                        onClick={saveSuggestedVocab}
                        disabled={!fb.suggestedVocab.length || !!attempt.addedVocab}
                      >
                        <Layers size={15} />{' '}
                        {attempt.addedVocab ? 'Vocab saved to deck' : `Save ${fb.suggestedVocab.length} collocations to SRS`}
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={saveFixesToMistakes}
                        disabled={!fb.sentenceFixes.length || !!attempt.addedMistakes}
                      >
                        <NotebookPen size={15} />{' '}
                        {attempt.addedMistakes ? 'Saved to Mistake Log' : `Add ${fb.sentenceFixes.length} fixes to Mistake Log`}
                      </button>
                    </div>
                    {fb.gradingNotesVi && fb.gradingNotesVi.length > 0 && (
                      <ul className="list-disc space-y-0.5 border-t border-line px-5 py-3 pl-9 text-xs text-ink-2 sm:px-6 sm:pl-10">
                        {fb.gradingNotesVi.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    )}
                    {(vocabToast || mistakeToast) && (
                      <div className="border-t border-line bg-good-soft/50 px-5 py-2 text-xs text-good sm:px-6">
                        {vocabToast && <p>{vocabToast}</p>}
                        {mistakeToast && <p>{mistakeToast}</p>}
                      </div>
                    )}
                  </div>

                  {/* 4 Criteria Breakdown */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      [prompt.task === 'task1' ? 'Task Achievement' : 'Task Response', fb.scores.task, fb.criteriaNotesVi.task],
                      ['Coherence & Cohesion', fb.scores.cc, fb.criteriaNotesVi.cc],
                      ['Lexical Resource', fb.scores.lr, fb.criteriaNotesVi.lr],
                      ['Grammatical Range', fb.scores.gra, fb.criteriaNotesVi.gra],
                    ].map(([title, sc, note]) => (
                      <div key={title as string} className="card p-4">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-ink">{title}</span>
                          <span className="num text-xs font-bold text-accent">{fmtBand(sc as number)}</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{note}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tabs: Highlighted Essay / Paragraph Upgrades / Suggested Vocab */}
                  <div>
                    <div className="mb-3 inline-flex rounded-lg border border-line-strong bg-surface p-1 text-xs font-semibold">
                      {[
                        ['fixes', `Sentence Fixes (${fb.sentenceFixes.length})`],
                        ['paragraphs', 'Paragraph Upgrades'],
                        ['sample', `Suggested Vocab (${fb.suggestedVocab.length})`],
                      ].map(([k, label]) => (
                        <button
                          key={k}
                          onClick={() => setReviewTab(k as typeof reviewTab)}
                          className={`rounded-md px-3 py-1.5 ${reviewTab === k ? 'bg-ink text-paper' : 'text-ink-2'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {reviewTab === 'fixes' && (
                      <div className="space-y-4">
                        <div className="card p-5">
                          <p className="eyebrow mb-2">Your Essay (click highlighted text to inspect fixes)</p>
                          <HighlightedEssay
                            text={attempt.text}
                            fixes={fb.sentenceFixes}
                            selected={selectedFix}
                            onSelect={setSelectedFix}
                          />
                        </div>

                        <ul className="space-y-3">
                          {fb.sentenceFixes.map((f, idx) => (
                            <li
                              key={idx}
                              onClick={() => setSelectedFix(idx)}
                              className={`card cursor-pointer p-4 transition-colors ${
                                selectedFix === idx ? 'border-accent ring-2 ring-accent/20' : 'hover:border-line-strong'
                              }`}
                            >
                              <div className="flex items-center gap-2 text-xs">
                                <span className="rounded bg-sunk px-2 py-0.5 font-bold text-ink">{CRITERION_NAME[f.criterion]}</span>
                                {f.errorPattern && <span className="rounded bg-ember-soft px-2 py-0.5 font-medium text-ember">{f.errorPattern}</span>}
                              </div>
                              <p className="mt-2 font-serif text-[14.5px] text-bad line-through decoration-1">{f.original}</p>
                              <p className="mt-1 font-serif text-[15px] font-medium text-good">→ {f.improved}</p>
                              <p className="mt-2 text-xs leading-relaxed text-ink-2">{f.reasonVi}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {reviewTab === 'paragraphs' && (
                      <div className="space-y-4">
                        {fb.upgradedParagraphs.map((p, i) => (
                          <div key={i} className="card p-4 sm:p-5">
                            <p className="eyebrow text-accent">{p.label}</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-lg bg-paper p-3">
                                <p className="text-[11px] font-bold text-muted">Your Original</p>
                                <p className="mt-1 font-serif text-[14px] leading-relaxed text-ink-2">{p.original}</p>
                              </div>
                              <div className="rounded-lg bg-good-soft/45 p-3">
                                <p className="text-[11px] font-bold text-good">Upgraded Version (+0.5–1.0 Band)</p>
                                <p className="mt-1 font-serif text-[14px] leading-relaxed text-ink">{p.upgraded}</p>
                              </div>
                            </div>
                            <p className="mt-2.5 text-xs leading-relaxed text-ink-2">
                              <Sparkles size={12} className="mr-1 inline text-accent" /> {p.noteVi}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewTab === 'sample' && (
                      <ul className="card divide-y divide-line">
                        {fb.suggestedVocab.map(v => (
                          <li key={v.word} className="flex items-start justify-between gap-4 p-4">
                            <div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-serif text-[16px] font-semibold">{v.word}</span>
                                <span className="text-xs text-muted italic">{v.pos}</span>
                                <span className="text-sm text-ink-2">{v.vi}</span>
                              </div>
                              <p className="mt-1 font-serif text-xs text-muted italic">“{v.context}”</p>
                            </div>
                            {hasWord(store, v.word) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-good">
                                <Check size={13} /> Saved
                              </span>
                            ) : (
                              <button
                                className="btn-ghost px-2.5 py-1 text-xs"
                                onClick={() => addWord({ word: v.word, vi: v.vi, pos: v.pos, context: v.context, source: `Writing · ${prompt.title}` })}
                              >
                                + Save card
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {!fb && attempt && (
                <div className="card p-5">
                  <p className="eyebrow">Submitted Essay ({attempt.wordCount} words)</p>
                  <p className="mt-2 font-serif text-[15.5px] leading-relaxed whitespace-pre-line">{attempt.text}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {zoomChart && prompt.chartSvg && (
        <div className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-ink/70 p-4" onClick={() => setZoomChart(false)}>
          <div className="w-full max-w-4xl rounded-xl bg-white p-3" dangerouslySetInnerHTML={{ __html: prompt.chartSvg }} />
        </div>
      )}
    </div>
  );
}

function HighlightedEssay({
  text,
  fixes,
  selected,
  onSelect,
}: {
  text: string;
  fixes: WritingSentenceFix[];
  selected: number | null;
  onSelect: (idx: number) => void;
}) {
  const spans: { start: number; end: number; idx: number }[] = [];
  const lower = text.toLowerCase();
  fixes.forEach((f, idx) => {
    const needle = f.original.trim();
    if (!needle) return;
    let pos = text.indexOf(needle);
    if (pos < 0) pos = lower.indexOf(needle.toLowerCase());
    if (pos >= 0) {
      const end = pos + needle.length;
      if (!spans.some(s => pos < s.end && end > s.start)) {
        spans.push({ start: pos, end, idx });
      }
    }
  });
  spans.sort((a, b) => a.start - b.start);

  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const sp of spans) {
    if (sp.start > cursor) pieces.push(<span key={`t-${cursor}`}>{text.slice(cursor, sp.start)}</span>);
    const active = selected === sp.idx;
    pieces.push(
      <mark
        key={`m-${sp.idx}`}
        onClick={() => onSelect(sp.idx)}
        className={`cursor-pointer rounded px-0.5 transition-colors ${
          active ? 'bg-ember text-white' : 'bg-ember-soft text-ink underline decoration-ember decoration-dotted underline-offset-2'
        }`}
      >
        {text.slice(sp.start, sp.end)}
      </mark>,
    );
    cursor = sp.end;
  }
  if (cursor < text.length) pieces.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);

  return <div className="font-serif text-[15.5px] leading-[1.85] whitespace-pre-line">{pieces}</div>;
}
