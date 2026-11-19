'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText, CalendarDays, GraduationCap, Home, Layers, Mic, NotebookPen, PenTool } from 'lucide-react';
import { dayKey } from '@/lib/dates';
import { isActive, streakOf, useStore } from '@/lib/store';
import { Flame } from './Flame';
import { MascotBadge, MascotDuo } from './Mascots';

const ITEMS = [
  { href: '/', label: 'Today', short: 'Today', icon: Home },
  { href: '/practice', label: 'Practice', short: 'Practice', icon: BookOpenText },
  { href: '/writing', label: 'Writing', short: 'Writing', icon: PenTool },
  { href: '/speaking', label: 'Speaking', short: 'Speaking', icon: Mic },
  { href: '/skills', label: 'Skills', short: 'Skills', icon: GraduationCap },
  { href: '/vocab', label: 'Vocab', short: 'Vocab', icon: Layers },
  { href: '/mistakes', label: 'Mistakes', short: 'Mistakes', icon: NotebookPen },
  { href: '/journal', label: 'Journal', short: 'Journal', icon: CalendarDays },
];

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-serif text-[23px] leading-none font-semibold tracking-tight whitespace-nowrap text-ink ${className}`}>
      Seal<span className="text-accent">IELTS</span>
    </span>
  );
}

function isOn(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href);
}

export default function Nav() {
  const path = usePathname();
  const store = useStore();
  const today = dayKey();
  const streak = store ? streakOf(store, today) : 0;
  const activeToday = !!store && isActive(store.days[today]);
  const frozenToday = !!store && store.frozenDays.includes(today);
  const needsSpark = !!store && streak > 0 && !activeToday && !frozenToday;

  return (
    <>
      {/* Desktop: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center justify-between gap-2 px-2">
          <Logo />
          <MascotDuo size={54} mood="study" />
        </Link>
        <nav className="mt-7 flex flex-col gap-0.5">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const on = isOn(path, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${
                  on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-sunk hover:text-ink'
                }`}
              >
                <Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2.5">
            <Flame lit={activeToday} frozen={frozenToday} size={28} />
            <div className="min-w-0">
              <div className="num text-lg leading-none font-bold">{store ? streak : '–'}</div>
              <div className={`mt-0.5 text-xs ${needsSpark ? 'font-semibold text-ember' : 'text-muted'}`}>
                {needsSpark ? 'keep it lit today' : 'day streak'}
              </div>
            </div>
            <MascotBadge character="hedgehog" variant="journal" size={32} className="ml-auto" />
          </div>
        </div>
      </aside>

      {/* Mobile: compact top bar with live streak flame */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="text-[20px]" />
        </Link>
        <Link
          href="/journal"
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            needsSpark ? 'border-ember/40 bg-ember-soft/60 text-ember' : 'border-line bg-surface text-ink'
          }`}
          title={needsSpark ? 'Keep your streak lit today' : `${streak}-day streak`}
        >
          <Flame lit={activeToday} frozen={frozenToday} size={18} />
          <span className="num">{store ? streak : '–'}</span>
          {needsSpark && <span className="text-[11px] font-medium">· light today</span>}
        </Link>
      </header>

      {/* Mobile: bottom bar */}
      <nav className="scroll-thin fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {ITEMS.map(({ href, short, icon: Icon }) => {
          const on = isOn(path, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-14 flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium whitespace-nowrap ${on ? 'text-accent' : 'text-muted'}`}
            >
              <Icon size={18} strokeWidth={on ? 2.2 : 1.8} />
              {short}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
