'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText, CalendarDays, GraduationCap, Home, Layers, NotebookPen } from 'lucide-react';
import { streakOf, useStore } from '@/lib/store';
import { Flame } from './Flame';

const ITEMS = [
  { href: '/', label: 'Hôm nay', icon: Home },
  { href: '/practice', label: 'Luyện đề', icon: BookOpenText },
  { href: '/skills', label: 'Kỹ năng', icon: GraduationCap },
  { href: '/vocab', label: 'Từ vựng', icon: Layers },
  { href: '/mistakes', label: 'Sổ lỗi', icon: NotebookPen },
  { href: '/journal', label: 'Nhật ký', icon: CalendarDays },
];

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-serif text-[26px] leading-none font-semibold tracking-tight text-ink ${className}`}>
      đều<span className="text-ember">.</span>
    </span>
  );
}

function isOn(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href);
}

export default function Nav() {
  const path = usePathname();
  const store = useStore();
  const streak = store ? streakOf(store) : 0;

  return (
    <>
      {/* Máy tính: thanh bên */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
        <Link href="/" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-col gap-0.5">
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
            <Flame lit={streak > 0} size={26} />
            <div>
              <div className="num text-lg leading-none font-bold">{store ? streak : '–'}</div>
              <div className="mt-0.5 text-xs text-muted">ngày liên tiếp</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Điện thoại: thanh dưới */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const on = isOn(path, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${on ? 'text-accent' : 'text-muted'}`}
            >
              <Icon size={20} strokeWidth={on ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
