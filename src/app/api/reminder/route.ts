import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { authEnabled } from '@/lib/auth';
import { addDays } from '@/lib/dates';
import { loadProgress } from '@/lib/progressFile';
import { buildReviewQueue, NEW_CARD_DAILY_CAP } from '@/lib/srs';
import type { DayLog, Store } from '@/lib/types';

export const dynamic = 'force-dynamic';

const isActive = (d?: DayLog) =>
  !!d && (d.units >= 1 || (d.drills ?? 0) >= 1 || (d.lessons ?? 0) >= 1 || d.cards >= 10 || d.seconds >= 600);

function localDayKey(nowMs: number, tzOffsetHours: number): string {
  const shifted = new Date(nowMs + tzOffsetHours * 3600_000);
  const m = `${shifted.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${shifted.getUTCDate()}`.padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${m}-${d}`;
}

function streakOf(s: Store, today: string): number {
  const counts = (k: string) => isActive(s.days[k]) || s.frozenDays.includes(k);
  let k = counts(today) ? today : addDays(today, -1);
  let n = 0;
  while (counts(k)) {
    if (isActive(s.days[k])) n++;
    k = addDays(k, -1);
  }
  return n;
}

function secretOk(req: NextRequest): boolean {
  const secret = process.env.REMINDER_SECRET || process.env.CRON_SECRET;
  if (!secret) return !authEnabled();
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (req.nextUrl.searchParams.get('secret') ?? '');
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * External study reminder trigger (for Vercel Cron / GitHub Actions / self-hosted cron).
 * Checks if today's flame is unlit; if configured with TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 * or REMINDER_WEBHOOK_URL, pushes a concise reminder with streak, due flashcards, and due mistakes.
 */
export async function GET(req: NextRequest) {
  if (!secretOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const saved = await loadProgress();
  if (!saved?.store?.profile) {
    return NextResponse.json({ sent: false, reason: 'no_profile' });
  }

  const store = saved.store;
  const profile = store.profile;
  if (!profile) {
    return NextResponse.json({ sent: false, reason: 'no_profile' });
  }
  const now = Date.now();
  const tzOffset = Number(process.env.REMINDER_TZ_OFFSET ?? 7);
  const today = localDayKey(now, Number.isFinite(tzOffset) ? tzOffset : 7);

  if (isActive(store.days[today])) {
    return NextResponse.json({ sent: false, reason: 'already_active', today });
  }

  const streak = streakOf(store, today);
  const usedNew = store.days[today]?.newCards ?? 0;
  const vocabDue = buildReviewQueue(store.words, {
    now,
    maxNew: Math.max(0, NEW_CARD_DAILY_CAP - usedNew),
  }).queue.length;
  const rlMistakes = Object.values(store.mistakes).filter(m => !m.resolved && m.due <= now).length;
  const gMistakes = (store.grammarMistakes ?? []).filter(m => !m.resolved && m.due <= now).length;
  const totalMistakes = rlMistakes + gMistakes;

  const name = profile.name;
  const headline =
    streak > 0
      ? `🔥 ${name}, keep your ${streak}-day IELTS streak alive!`
      : `🐾 ${name}, ready for a quick 10-minute IELTS session?`;

  const lines = [headline];
  const pending: string[] = [];
  if (vocabDue > 0) pending.push(`${vocabDue} flashcards`);
  if (totalMistakes > 0) pending.push(`${totalMistakes} mistakes`);
  if (pending.length) lines.push(`Due today: ${pending.join(' · ')}`);
  lines.push('Low energy? A 3-minute 10-card warm-up is enough to light today’s flame.');
  if (process.env.APP_URL) lines.push(process.env.APP_URL);
  const message = lines.join('\n');

  const delivered: string[] = [];
  const errors: string[] = [];

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text: message }),
      });
      if (r.ok) delivered.push('telegram');
      else errors.push(`telegram:${r.status}`);
    } catch (e) {
      errors.push(`telegram:${(e as Error).message}`);
    }
  }

  const webhook = process.env.REMINDER_WEBHOOK_URL;
  if (webhook) {
    try {
      const r = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          text: message,
          today,
          streak,
          vocabDue,
          mistakesDue: totalMistakes,
        }),
      });
      if (r.ok) delivered.push('webhook');
      else errors.push(`webhook:${r.status}`);
    } catch (e) {
      errors.push(`webhook:${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    sent: delivered.length > 0,
    delivered,
    ...(errors.length ? { errors } : {}),
    today,
    streak,
    vocabDue,
    mistakesDue: totalMistakes,
    message,
  });
}
