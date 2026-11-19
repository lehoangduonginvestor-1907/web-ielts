'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Sparkles } from 'lucide-react';
import type { Store, WritingPrompt } from '@/lib/types';
import { fmtBand } from '@/lib/band';
import { CHROME_SKILL_TEMPLATES, summarizeGrammarMistakes, type ChromeSkillTemplate } from '@/lib/manualGrade';

/**
 * Explicit context panel (collapsed by default, never hidden via sr-only).
 * Renders structured learner data into the DOM when opened so Chrome's Gemini side panel can read accurate metrics and mistake history.
 */
export default function GeminiContextPanel({
  store,
  skill,
  prompt,
  essayText,
}: {
  store: Store;
  skill: 'writing' | 'speaking' | 'reading' | 'listening';
  prompt?: WritingPrompt;
  essayText?: string;
}) {
  const [open, setOpen] = useState(false);

  const summary = useMemo(
    () => summarizeGrammarMistakes(store, skill === 'writing' || skill === 'speaking' ? skill : undefined),
    [store, skill],
  );
  const wordCount = useMemo(() => (essayText ? essayText.trim().split(/\s+/).filter(Boolean).length : 0), [essayText]);

  return (
    <div className="rounded-xl border border-line bg-paper/70 p-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={15} className="shrink-0 text-accent" />
          <span>{open ? 'Context for Gemini Side Panel' : 'Open context for Gemini Side Panel'}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-normal text-muted">
          {open ? 'Collapse' : 'View data'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-2">
          <p className="text-[11.5px] text-muted">
            Chrome’s Gemini side panel (Tab Sharing) only reads what is currently visible on the page. Expand this section whenever you want Gemini to check exact chart data and your recurring errors.
          </p>

          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="font-bold text-ink">Learner Profile</p>
            <p className="mt-1">
              Skill: <strong className="text-ink uppercase">{skill}</strong> · Target:{' '}
              <strong className="text-ink">{store.profile ? `Band ${fmtBand(store.profile.target)}` : 'Not set'}</strong>
              {wordCount > 0 ? ` · Current draft length: ${wordCount} words` : ''}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="font-bold text-ink">Recurring Grammar / Phrasing Errors (Mistake Log)</p>
            {summary.topPatterns.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {summary.topPatterns.map(item => (
                  <span key={item.pattern} className="rounded bg-ember-soft px-2 py-0.5 font-medium text-ember">
                    {item.pattern} ({item.count}×)
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-muted">No recurring error patterns saved in your Mistake Log yet.</p>
            )}
            {summary.examples.length > 0 && (
              <ul className="mt-2 space-y-1.5 border-t border-line pt-2">
                {summary.examples.map(ex => (
                  <li key={ex.id}>
                    <span className="text-bad line-through decoration-1">{ex.original}</span>{' '}
                    <span className="text-muted">→</span>{' '}
                    <span className="font-medium text-good">{ex.improved}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {prompt?.chartSummary && (
            <div className="rounded-lg border border-line bg-surface p-3">
              <p className="font-bold text-ink">Verified Chart / Map Data (Task 1)</p>
              <p className="mt-1 whitespace-pre-line text-ink">{prompt.chartSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Optional setup guide for adding `/` shortcuts to chrome://skills/yourSkills.
 */
export function ChromeSkillsTip({
  skillIds,
  collapsible = true,
  defaultOpen = false,
}: {
  skillIds?: ChromeSkillTemplate['id'][];
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible || defaultOpen);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState<{ label: string; text: string } | null>(null);

  const items = useMemo(
    () => (skillIds?.length ? CHROME_SKILL_TEMPLATES.filter(t => skillIds.includes(t.id)) : CHROME_SKILL_TEMPLATES),
    [skillIds],
  );

  const copyField = async (key: string, label: string, text: string) => {
    setFallbackText(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(cur => (cur === key ? null : cur)), 2500);
    } catch {
      setFallbackText({ label, text });
    }
  };

  const body = (
    <div className="space-y-3 text-xs leading-relaxed text-ink-2">
      <p>
        If you use Google Chrome’s <strong>Ask Gemini</strong> side panel, you can set up <code>/</code> shortcuts once:
        open a new tab, go to <code className="rounded bg-sunk px-1.5 py-0.5 text-ink">chrome://skills/yourSkills</code> → click <strong>+ Add</strong> → paste the <strong>Name</strong> and <strong>Instructions</strong> below.
        Then enable <strong>Current tab</strong> in the side panel and type <code>/</code> to invoke it (optional—the <strong>Copy prompt</strong> button on each page always includes the full prompt and data).
      </p>

      <div className="space-y-2.5">
        {items.map(t => {
          const nameKey = `${t.id}:name`;
          const instKey = `${t.id}:inst`;
          return (
            <div key={t.id} className="rounded-lg border border-line bg-paper/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{t.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">{t.shortDescVi}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="btn-ghost px-2.5 py-1 text-[11.5px]"
                    onClick={() => void copyField(nameKey, `Name (${t.name})`, t.name)}
                  >
                    {copiedKey === nameKey ? <Check size={12} className="text-good" /> : <Copy size={12} />}
                    {copiedKey === nameKey ? 'Copied Name' : 'Copy Name'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2.5 py-1 text-[11.5px]"
                    onClick={() => void copyField(instKey, `Instructions (${t.name})`, t.instructions)}
                  >
                    {copiedKey === instKey ? <Check size={12} className="text-good" /> : <Copy size={12} />}
                    {copiedKey === instKey ? 'Copied Instructions' : 'Copy Instructions'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {fallbackText && (
        <div className="rounded-lg border border-line bg-surface p-2.5">
          <p className="font-medium text-ink">
            Clipboard access was blocked—select the text below and press Ctrl+C to copy {fallbackText.label}:
          </p>
          <textarea
            readOnly
            rows={4}
            value={fallbackText.text}
            onFocus={e => e.currentTarget.select()}
            className="field mt-1.5 font-mono text-[11.5px]"
          />
        </div>
      )}
    </div>
  );

  if (!collapsible) return body;

  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-paper/50 p-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-ink-2 hover:text-ink"
      >
        <span>Optional tip: Add / shortcuts in Chrome (chrome://skills) for quick access</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2.5 border-t border-line pt-2.5">{body}</div>}
    </div>
  );
}
