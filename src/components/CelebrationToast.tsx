'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Snowflake, Sparkles, Target, Volume2, VolumeX, X } from 'lucide-react';
import { subscribeCelebrations, type CelebrationEvent } from '@/lib/celebrate';
import { playSfx, useSfxPref } from '@/lib/sfx';
import { Flame } from './Flame';
import { HedgehogMascot, SealMascot } from './Mascots';

const DISPLAY_MS = 5600;

export default function CelebrationToast() {
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const [sfxOn, setSfxOn] = useSfxPref();
  const playedRef = useRef<string | null>(null);
  const current = queue[0] ?? null;

  useEffect(() => {
    return subscribeCelebrations(ev => {
      setQueue(q => [...q.slice(-4), ev]);
    });
  }, []);

  const dismiss = useCallback(() => {
    setQueue(q => q.slice(1));
  }, []);

  useEffect(() => {
    if (!current) return;
    if (playedRef.current !== current.id) {
      playedRef.current = current.id;
      playSfx(current.sfx);
    }
    const t = setTimeout(dismiss, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  if (!current) return null;

  const badgeIcon =
    current.badge === 'flame' ? (
      <Flame lit size={18} />
    ) : current.badge === 'freeze' ? (
      <Snowflake size={15} className="text-[#3b7ea8]" />
    ) : current.badge === 'goal' ? (
      <Target size={15} className="text-good" />
    ) : (
      <Sparkles size={15} className="text-ember" />
    );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-4 z-50 flex justify-center sm:inset-x-auto sm:top-5 sm:right-5 sm:justify-end"
    >
      <div className="cel-card pointer-events-auto relative flex w-full max-w-sm items-center gap-3.5 overflow-hidden rounded-2xl border border-line-strong bg-surface p-3.5 pr-9 shadow-[var(--shadow-pop)]">
        {/* Pure-CSS storybook sparkles */}
        <span aria-hidden="true" className="cel-spark cel-s1" />
        <span aria-hidden="true" className="cel-spark cel-s2" />
        <span aria-hidden="true" className="cel-spark cel-s3" />
        <span aria-hidden="true" className="cel-spark cel-s4" />
        <span aria-hidden="true" className="cel-spark cel-s5" />

        <div className="relative shrink-0">
          {current.character === 'seal' ? (
            <SealMascot pose="celebrate" size={62} />
          ) : (
            <HedgehogMascot pose="celebrate" size={62} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {badgeIcon}
            <p className="font-serif text-[16px] leading-snug font-semibold text-ink">{current.title}</p>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{current.detail}</p>
          {queue.length > 1 && (
            <p className="mt-1 text-[11px] font-medium text-muted">+{queue.length - 1} more milestone</p>
          )}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setSfxOn(!sfxOn)}
            className="rounded-full p-1 text-muted hover:bg-sunk hover:text-ink"
            aria-label={sfxOn ? 'Mute celebration sounds' : 'Enable celebration sounds'}
            title={sfxOn ? 'Mute sounds' : 'Unmute sounds'}
          >
            {sfxOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full p-1 text-muted hover:bg-sunk hover:text-ink"
            aria-label="Dismiss celebration"
          >
            <X size={14} />
          </button>
        </div>

        {/* Auto-dismiss progress bar */}
        <span key={current.id} className="cel-bar absolute inset-x-0 bottom-0 h-[3px] bg-accent/60" />
      </div>
    </div>
  );
}
