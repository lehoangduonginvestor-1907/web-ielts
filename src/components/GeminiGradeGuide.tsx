'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  LifeBuoy,
  Loader2,
  MessageSquarePlus,
  Settings2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { usePref } from '@/lib/hooks';

// Chấm bài bằng Gemini của chính người học (thanh Gemini bên cạnh Chrome, hoặc gemini.google.com).
// App không gọi model nào: người học copy prompt → gửi cho Gemini → copy khối JSON → dán lại đây,
// máy chủ chỉ kiểm tra JSON (đủ điểm, đúng bài) rồi tính band. Dùng chung cho Writing và Speaking.

export type GradeKind = 'writing' | 'speaking';

/** Câu trả lời mẫu gửi lại cho Gemini khi nó trả lời sai định dạng. */
const FIX_NO_JSON = 'Return only the JSON code block described in my first message — no other text.';
const FIX_CUT_OFF = 'Your JSON was cut off. Send the complete JSON again, in one single code block.';

/** Văn bản dán vào trông như kết quả chấm (có khối "assessment"). */
export const looksLikeGradeJson = (s: string) => /"assessment"\s*:/.test(s);

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink">{children}</kbd>;
}

function StepCard({
  n,
  done,
  title,
  children,
}: {
  n: number;
  done?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done ? 'bg-good text-paper' : 'bg-accent-soft text-accent'
        }`}
        aria-hidden
      >
        {done ? <Check size={13} strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1 space-y-2 pb-1">
        <p className="font-semibold text-ink">{title}</p>
        <div className="space-y-2 text-[13px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </li>
  );
}

function CopyLine({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-1.5">
      <code className="min-w-0 flex-1 text-[12px] text-ink">{text}</code>
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-[11.5px]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? <Check size={12} className="text-good" /> : <Copy size={12} />}
        {copied ? 'Copied' : label}
      </button>
    </div>
  );
}

export default function GeminiGradeGuide({
  kind,
  attemptId,
  graded,
  getPrompt,
  recording,
  onSubmit,
}: {
  kind: GradeKind;
  attemptId: string;
  /** Bài đã có điểm: thu gọn thành "Chấm lại". */
  graded: boolean;
  getPrompt: () => string;
  /** Speaking: bản ghi để người học tải về rồi tải lên Gemini. */
  recording?: { url: string | null; missing?: boolean; fileName: string };
  /** Gửi JSON lên máy chủ; ném Error kèm lời báo khi không hợp lệ. */
  onSubmit: (json: string) => Promise<void>;
}) {
  const isSpeaking = kind === 'speaking';
  const [setupDone, setSetupDone] = usePref<'0' | '1'>('gemini.setupDone', '0');
  const [open, setOpen] = useState(!graded);
  const [setupOpen, setSetupOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptFallback, setPromptFallback] = useState<string | null>(null);
  const [json, setJson] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState('');
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  const showSetup = setupDone !== '1' || setupOpen;

  // Bài vừa được chấm (từ dán JSON) → thu gọn hướng dẫn
  const [wasGraded, setWasGraded] = useState(graded);
  if (graded !== wasGraded) {
    setWasGraded(graded);
    if (graded) setOpen(false);
  }

  const submit = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) {
        setErr('Paste the JSON from Gemini first.');
        return;
      }
      setBusy(true);
      setErr('');
      setHint('');
      try {
        await onSubmit(text);
        setJson('');
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not read this result.');
        setHelpOpen(true);
      } finally {
        setBusy(false);
      }
    },
    [onSubmit],
  );

  // Dán (Ctrl+V) ở bất kỳ đâu trên trang: nếu là kết quả chấm thì chấm luôn
  useEffect(() => {
    if (!open || busy) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable = target?.closest('input, textarea, [contenteditable="true"]');
      if (editable && editable !== boxRef.current) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (!looksLikeGradeJson(text)) {
        if (!editable && text.trim()) setHint('That is not Gemini’s grading result. Copy the JSON code block from Gemini (step “Copy Gemini’s result”).');
        return;
      }
      e.preventDefault();
      setJson(text);
      void submit(text);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open, busy, submit]);

  const copyPrompt = async () => {
    const text = getPrompt();
    try {
      await navigator.clipboard.writeText(text);
      setPromptFallback(null);
      setCopied(true);
    } catch {
      setPromptFallback(text);
    }
  };

  const pasteFromClipboard = async () => {
    setErr('');
    setHint('');
    try {
      const clip = await navigator.clipboard.readText();
      if (!looksLikeGradeJson(clip)) {
        setHint('Your clipboard does not hold Gemini’s result yet. In Gemini, click the copy icon on the JSON block first.');
        return;
      }
      setJson(clip);
      await submit(clip);
    } catch {
      setHint('Chrome blocked reading the clipboard. Click the box below and press Ctrl+V instead.');
      boxRef.current?.focus();
    }
  };

  const what = isSpeaking ? 'session' : 'essay';
  const promptStep = isSpeaking ? 2 : 1;
  const sendStep = promptStep + 1;

  return (
    <div className={`card p-4 sm:p-5 ${open && !graded ? 'border-accent/50' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex flex-wrap items-center gap-2">
          <Sparkles size={16} className="shrink-0 text-accent" />
          <span className="font-semibold text-ink">{graded ? 'Grade again with Gemini' : `Grade your ${what} with Gemini`}</span>
          <code className="rounded bg-sunk px-1.5 py-0.5 text-[11px] text-muted">ID {attemptId}</code>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
          {open ? 'Hide' : 'Show steps'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-5 border-t border-line pt-4">
          {!graded && (
            <p className="text-[13px] leading-relaxed text-ink-2">
              Your {what} is graded by <strong className="text-ink">your own Gemini</strong> in the panel on the right side of Chrome — the strongest
              model your Google account has, with no API limits. It takes {isSpeaking ? 'about 3 minutes' : 'about 1–2 minutes'}: copy, paste,
              copy back, paste.
            </p>
          )}

          {/* ---------- Cài đặt lần đầu ---------- */}
          {showSetup ? (
            <div className="rounded-xl border border-dashed border-line-strong bg-paper/60 p-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Settings2 size={15} className="text-accent" /> First time only: set up Gemini in Chrome
              </p>
              <ol className="mt-2.5 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-ink-2">
                <li>
                  Use <strong className="text-ink">Google Chrome</strong> on a computer, signed in to your Google account (your profile picture at the
                  top-right of Chrome). A Google AI Pro plan unlocks the strongest model; the free plan also works.
                </li>
                <li>
                  Click the <strong className="text-ink">Gemini button ✦</strong> at the <strong className="text-ink">top-right of Chrome’s toolbar</strong>.
                  The Gemini panel opens beside this page — keep it open while you grade.
                  <span className="mt-1 block text-[12px] text-muted">
                    No ✦ button? Update Chrome (⋮ menu → Help → About Google Chrome) and restart it. Still missing (some countries and work
                    accounts)? Open{' '}
                    <a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
                      gemini.google.com
                    </a>{' '}
                    in a new tab instead — every step below is the same.
                  </span>
                </li>
                <li>
                  In the panel’s message box, click the <strong className="text-ink">model name</strong> next to the microphone (it may say “Hydrogen”)
                  and choose <strong className="text-ink">4 Neon — “Deeper analysis”</strong>. Neon checks {isSpeaking ? 'what it hears' : 'chart and map details'}{' '}
                  most carefully. If Neon is busy or slow, <strong className="text-ink">4 Hydrogen</strong> is faster.
                </li>
                <li>
                  The panel may say <em>“Sharing ‘SealIELTS…’”</em>. That is fine: the grading prompt already contains everything Gemini needs
                  {isSpeaking ? ' except the recording, which you upload in step 3' : ' (task, verified chart data and your essay)'}.
                </li>
              </ol>
              <button
                type="button"
                className="btn-ghost mt-3 px-3 py-1.5 text-xs"
                onClick={() => {
                  setSetupDone('1');
                  setSetupOpen(false);
                }}
              >
                <Check size={13} /> Done — hide setup next time
              </button>
            </div>
          ) : (
            <button type="button" className="text-xs font-medium text-muted underline hover:text-ink" onClick={() => setSetupOpen(true)}>
              Show first-time setup (Gemini button, choosing 4 Neon)
            </button>
          )}

          {/* ---------- Các bước ---------- */}
          <ol className="space-y-4">
            {isSpeaking && (
              <StepCard n={1} done={downloaded} title="Download your recording">
                <p>Gemini cannot open files inside this page, so save the recording to your computer first.</p>
                {recording?.url ? (
                  <a href={recording.url} download={recording.fileName} className="btn-ghost w-fit" onClick={() => setDownloaded(true)}>
                    <Download size={15} /> Download {recording.fileName}
                  </a>
                ) : recording?.missing ? (
                  <p className="rounded-lg bg-ember-soft/70 px-3 py-2 text-ember">
                    The recording is stored only in the browser where you practised this session, and it is not in this one. Open this
                    session on that computer and browser to download it.
                  </p>
                ) : (
                  <p className="text-muted">Loading the recording…</p>
                )}
              </StepCard>
            )}

            <StepCard n={promptStep} done={copied} title="Copy the grading prompt">
              <p>
                It contains the {isSpeaking ? 'topic, the questions, the session timeline' : 'task, the verified chart data, your essay'}, the official
                IELTS band descriptors, and this {what}’s ID so a result can’t be mixed up with another {what}.
              </p>
              <button type="button" className={copied ? 'btn-ghost w-fit' : 'btn-primary w-fit'} onClick={() => void copyPrompt()}>
                {copied ? <Check size={15} className="text-good" /> : <Copy size={15} />}
                {copied ? 'Prompt copied — copy again' : 'Copy grading prompt'}
              </button>
              {promptFallback && (
                <div className="rounded-lg border border-line bg-paper p-2.5">
                  <p className="text-[12px] font-medium">Chrome blocked copying. Click the box, press Ctrl+A then Ctrl+C:</p>
                  <textarea readOnly rows={3} value={promptFallback} onFocus={e => e.currentTarget.select()} className="field mt-1.5 font-mono text-[11px]" />
                </div>
              )}
            </StepCard>

            <StepCard n={sendStep} title={isSpeaking ? 'Send the recording and the prompt to Gemini' : 'Send it to Gemini'}>
              <ol className="list-[lower-alpha] space-y-1.5 pl-4">
                <li>
                  In the Gemini panel, start a <strong className="text-ink">new chat</strong> (the <MessageSquarePlus size={13} className="inline align-[-2px]" />{' '}
                  new-chat icon, or ⋮ → New chat) so earlier {what}s don’t influence the score.
                </li>
                <li>Check the model says <strong className="text-ink">Neon</strong> (or Hydrogen).</li>
                {isSpeaking && (
                  <li>
                    Click <strong className="text-ink">+</strong> at the left of the message box → <Upload size={12} className="inline align-[-1px]" />{' '}
                    <strong className="text-ink">Upload files</strong> → choose <code className="text-ink">{recording?.fileName ?? 'the recording'}</code> from
                    your Downloads folder. Wait until the file has finished uploading.
                  </li>
                )}
                <li>
                  Click in the message box, press <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd> (Mac: <Kbd>⌘</Kbd>+<Kbd>V</Kbd>) to paste the prompt, then press{' '}
                  <Kbd>Enter</Kbd>.
                </li>
                <li>
                  Wait until Gemini has completely finished writing — {isSpeaking ? 'listening to the whole recording takes 1–3 minutes' : 'usually 30–60 seconds'}.
                </li>
              </ol>
            </StepCard>

            <StepCard n={sendStep + 1} title="Copy Gemini’s result">
              <p>
                Gemini answers with one box labelled <strong className="text-ink">JSON</strong>. Click the <Copy size={12} className="inline align-[-1px]" />{' '}
                <strong className="text-ink">copy icon</strong> in that box’s top-right corner (“Copy code”).
              </p>
              <p className="text-[12px] text-muted">
                Don’t select the text with the mouse — the result is long and easy to cut short. If the box keeps scrolling, Gemini is still writing.
              </p>
            </StepCard>

            <StepCard n={sendStep + 2} title="Paste it here">
              <p>
                Click anywhere on this page and press <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd> — your band scores appear straight away.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-primary" disabled={busy} onClick={() => void pasteFromClipboard()}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ClipboardPaste size={15} />}
                  {busy ? 'Checking the result…' : 'Paste & grade'}
                </button>
                <span className="text-[12px] text-muted">or paste into the box:</span>
              </div>
              <textarea
                ref={boxRef}
                rows={3}
                className="field font-mono text-xs"
                placeholder="Paste Gemini’s JSON here…"
                value={json}
                onChange={e => setJson(e.target.value)}
                spellCheck={false}
              />
              {json.trim() && !busy && (
                <button type="button" className="btn-ghost w-fit" onClick={() => void submit(json)}>
                  <Check size={15} /> Grade this result
                </button>
              )}
              {hint && <p className="text-[12.5px] font-medium text-ember">{hint}</p>}
              {err && <p className="rounded-lg bg-bad-soft/70 px-3 py-2 text-[12.5px] font-medium text-bad">{err}</p>}
            </StepCard>
          </ol>

          {/* ---------- Gặp sự cố ---------- */}
          <div className="rounded-xl border border-line bg-paper/60 p-3.5">
            <button
              type="button"
              onClick={() => setHelpOpen(o => !o)}
              aria-expanded={helpOpen}
              className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-ink"
            >
              <span className="flex items-center gap-2">
                <LifeBuoy size={15} className="text-accent" /> Something went wrong?
              </span>
              <ChevronDown size={14} className={`text-muted transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
            </button>
            {helpOpen && (
              <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-ink-2">
                <li>
                  <strong className="text-ink">Gemini wrote an explanation but no JSON box.</strong> Send it this message:
                  <CopyLine text={FIX_NO_JSON} label="Copy message" />
                </li>
                <li>
                  <strong className="text-ink">The JSON stops in the middle, or this page says it is not valid.</strong> Send:
                  <CopyLine text={FIX_CUT_OFF} label="Copy message" />
                  Then copy the new JSON box and paste it here again.
                </li>
                <li>
                  <strong className="text-ink">“…has no band score for …”</strong> — Gemini left out a criterion. Send the message above, or start a
                  new chat and send the prompt again.
                </li>
                <li>
                  <strong className="text-ink">“…belongs to a different {what}”</strong> — you pasted an older result. Copy this page’s prompt again
                  (step {promptStep}) and send it in a <strong className="text-ink">new chat</strong>.
                </li>
                {isSpeaking && (
                  <li>
                    <strong className="text-ink">“Gemini could not hear your voice clearly”</strong> — play the recording on this page. If your
                    voice is very quiet, practise again with the microphone closer or with headphones.
                  </li>
                )}
                {isSpeaking && (
                  <li>
                    <strong className="text-ink">No + / Upload files in the panel</strong> — open{' '}
                    <a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
                      gemini.google.com <ExternalLink size={11} className="inline" />
                    </a>
                    , upload the file there with +, and paste the prompt.
                  </li>
                )}
                <li>
                  <strong className="text-ink">Gemini refuses, gives no scores, or is very slow.</strong> Start a new chat and send the prompt again;
                  if it happens again, switch the model to <strong className="text-ink">4 Hydrogen</strong>.
                </li>
                <li>
                  <strong className="text-ink">“Paste & grade” says Chrome blocked the clipboard.</strong> Click the box in the last step, press{' '}
                  <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd>, then <em>Grade this result</em>.
                </li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
