'use client';

import { useEffect, useState } from 'react';
import { MessageCircleHeart, X } from 'lucide-react';
import { usePref } from '@/lib/hooks';

interface Note {
  text: string;
  at: number;
}

const DISMISS_KEY = 'ielts.coachnote.seen';

async function fetchNote(): Promise<Note | null> {
  try {
    const r = await fetch('/api/coach-note', { cache: 'no-store' });
    return r.ok ? ((await r.json()) as { note: Note | null }).note : null;
  } catch {
    return null;
  }
}

/** Coach note card displayed on the learner's Today page. Dismissible; reappears when updated. */
export function CoachNoteCard() {
  const [note, setNote] = useState<Note | null>(null);
  const [seen, setSeen] = usePref<string>(DISMISS_KEY, '');
  useEffect(() => {
    let alive = true;
    void fetchNote().then(n => alive && setNote(n));
    return () => {
      alive = false;
    };
  }, []);
  if (!note || seen === String(note.at)) return null;
  return (
    <section className="card flex items-start gap-3 border-accent/30 bg-accent-soft/60 p-4 sm:p-5">
      <MessageCircleHeart size={20} className="mt-0.5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-accent">Note from Coach · {new Date(note.at).toLocaleDateString('en-US')}</p>
        <p className="mt-1 font-serif text-[16px] leading-relaxed whitespace-pre-line text-ink">{note.text}</p>
      </div>
      <button className="btn-quiet -mt-1 -mr-1 shrink-0 px-2" onClick={() => setSeen(String(note.at))} aria-label="Dismiss note">
        <X size={16} />
      </button>
    </section>
  );
}

/** Note composer on the Coach View page. */
export function CoachNoteEditor() {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<Note | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => {
    void fetchNote().then(n => {
      setSaved(n);
      setText(n?.text ?? '');
    });
  }, []);
  const save = async (value: string) => {
    setState('saving');
    try {
      const r = await fetch('/api/coach-note', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: value }) });
      if (!r.ok) throw new Error(String(r.status));
      const { note } = (await r.json()) as { note: Note | null };
      setSaved(note);
      setText(note?.text ?? '');
      setState('saved');
    } catch {
      setState('error');
    }
  };
  return (
    <section className="card p-5">
      <p className="eyebrow">Note for Learner</p>
      <p className="mt-1 text-sm text-muted">Shown at the top of the learner’s Today page until dismissed. Updating it brings it back.</p>
      <textarea
        className="field mt-3 min-h-24 font-serif text-[15px] leading-relaxed"
        maxLength={1000}
        value={text}
        onChange={e => {
          setText(e.target.value);
          setState('idle');
        }}
        placeholder="e.g., You’ve been missing Matching Headings this week. Review the strategy lesson before trying Cam 12 Test 6."
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button className="btn-primary" disabled={state === 'saving' || text.trim() === (saved?.text ?? '')} onClick={() => save(text)}>
          {state === 'saving' ? 'Saving…' : 'Send note'}
        </button>
        {saved && (
          <button className="btn-quiet" disabled={state === 'saving'} onClick={() => save('')}>
            Clear note
          </button>
        )}
        <span className="text-xs text-muted">
          {state === 'saved' ? 'Saved.' : state === 'error' ? 'Failed to save—please try again.' : saved ? `Last sent ${new Date(saved.at).toLocaleString('en-US')}` : 'No note yet.'}
        </span>
      </div>
    </section>
  );
}
