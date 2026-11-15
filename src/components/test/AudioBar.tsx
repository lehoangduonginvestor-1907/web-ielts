'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react';
import { fmtClock } from '@/lib/dates';

export interface AudioHandle {
  play: () => void;
}

interface Props {
  src: string;
  label: string;
  locked?: boolean; // thi thử: chỉ nghe một lần, không tua, không dừng
  onEnded?: () => void;
}

const SPEEDS = [0.75, 0.9, 1, 1.15, 1.25];

const AudioBar = forwardRef<AudioHandle, Props>(function AudioBar({ src, label, locked, onEnded }, ref) {
  const a = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [vol, setVol] = useState(1);
  const [started, setStarted] = useState(false);

  useImperativeHandle(ref, () => ({ play: () => void a.current?.play() }), []);

  useEffect(() => {
    if (a.current) a.current.playbackRate = speed;
  }, [speed, src]);

  useEffect(() => {
    if (a.current) a.current.volume = vol;
  }, [vol]);

  const toggle = () => {
    const el = a.current;
    if (!el) return;
    if (el.paused) void el.play();
    else if (!locked) el.pause();
  };

  const seek = (d: number) => {
    if (a.current && !locked) a.current.currentTime = Math.max(0, Math.min(dur, a.current.currentTime + d));
  };

  // Phím tắt khi luyện tập: Space dừng/phát, ←/→ tua 5 giây
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'ArrowLeft') seek(-5);
      if (e.key === 'ArrowRight') seek(5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pct = dur ? (t / dur) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 shadow-[var(--shadow-card)]">
      <audio
        ref={a}
        src={src}
        preload="metadata"
        onPlay={() => (setPlaying(true), setStarted(true))}
        onPause={() => setPlaying(false)}
        onTimeUpdate={e => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDur(e.currentTarget.duration)}
        onEnded={() => (setPlaying(false), onEnded?.())}
      />
      <button
        onClick={toggle}
        disabled={locked && started}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-transform active:scale-95 disabled:opacity-40"
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>
      {!locked && (
        <div className="hidden items-center sm:flex">
          <button className="btn-quiet px-1.5" onClick={() => seek(-5)} aria-label="Lùi 5 giây" title="Lùi 5 giây (←)">
            <RotateCcw size={16} />
          </button>
          <button className="btn-quiet px-1.5" onClick={() => seek(5)} aria-label="Tới 5 giây" title="Tới 5 giây (→)">
            <RotateCw size={16} />
          </button>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate font-semibold text-ink-2">{label}</span>
          <span className="num shrink-0 text-muted">
            {fmtClock(t)} / {dur ? fmtClock(dur) : '–:––'}
          </span>
        </div>
        <div className="relative mt-1.5 h-1.5 rounded-full bg-sunk">
          <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct}%` }} />
          {!locked && (
            <input
              type="range"
              min={0}
              max={dur || 0}
              step={0.1}
              value={t}
              onChange={e => a.current && (a.current.currentTime = Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Vị trí"
            />
          )}
        </div>
      </div>
      {!locked && (
        <select
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="num rounded-md border border-line bg-surface px-1.5 py-1 text-xs font-semibold"
          aria-label="Tốc độ"
        >
          {SPEEDS.map(s => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      )}
      <label className="hidden items-center gap-1.5 text-muted md:flex">
        <Volume2 size={15} />
        <input type="range" min={0} max={1} step={0.05} value={vol} onChange={e => setVol(Number(e.target.value))} className="w-16 accent-[var(--color-accent)]" />
      </label>
    </div>
  );
});

export default AudioBar;
