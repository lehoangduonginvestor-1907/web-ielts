'use client';

// Bạn nhỏ nổi ở góc màn hình: đổi giữa Bé Hải Cẩu (kỹ năng) và Bé Nhím (cá nhân) theo trang,
// bấm vào để nghe một mẹo/lời động viên. Có thể thu nhỏ thành huy hiệu ló đầu.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { HedgehogMascot, MascotBadge, SealMascot, type HedgehogPose, type SealPose } from './Mascots';

type Who =
  | { character: 'seal'; pose: SealPose; badge: 'listening' | 'reading' | 'writing' | 'speaking' | 'skills' }
  | { character: 'hedgehog'; pose: HedgehogPose; badge: 'journal' | 'mistakes' | 'vocab' };

const SEAL_TIPS = [
  'Đọc câu hỏi trước rồi mới lướt bài nhé, đỡ lạc lắm!',
  'Sai một câu là học thêm một mẹo. Không sao đâu~',
  'Nghe kỹ các từ đổi hướng: but, however, actually!',
  'Gặp từ lạ? Đoán nghĩa từ câu xung quanh trước đã.',
  'Làm xong một đề thì nghỉ 5 phút, não sẽ nhớ tốt hơn.',
  'Hải Cẩu tin bạn làm được mà, cố lên! 🐾',
];

const AREA_TIPS: Record<string, string[]> = {
  writing: [
    'Mỗi đoạn một ý chính, kèm một ví dụ cụ thể nhé.',
    'Task 1 nhớ có câu overview — giám khảo tìm nó đầu tiên đó!',
    'Đọc lại bài 2 phút cuối để bắt lỗi chia động từ nha.',
  ],
  speaking: [
    'Trả lời xong thì thêm một lý do và một ví dụ nhé.',
    'Nói chậm mà rõ còn hơn nhanh mà vấp~',
    'Quên từ? Cứ diễn đạt vòng một chút, không sao cả!',
  ],
  skills: [
    'Học một mẹo, rồi luyện ngay một bài cho nhớ lâu.',
    'Mẹo nào thấy hay thì ghi vào sổ của Nhím nhé!',
  ],
};

const HEDGE_TIPS = [
  'Ôn thẻ từ đúng hạn là nhớ lâu gấp đôi đó!',
  'Mỗi lỗi trong sổ là một bậc thang lên band mới.',
  'Viết nhật ký hai dòng thôi cũng tính là chăm rồi~',
  'Dùng từ mới trong một câu của chính bạn nhé.',
  'Nhím giữ sổ giúp bạn, bạn chỉ cần quay lại thôi!',
];

const HIDE_KEY = 'deu:buddy-hidden';
const GREET_KEY = 'deu:buddy-greeted';

function whoFor(path: string, hour: number): Who {
  if (path.startsWith('/writing')) return { character: 'seal', pose: 'writing', badge: 'writing' };
  if (path.startsWith('/speaking')) return { character: 'seal', pose: 'speaking', badge: 'speaking' };
  if (path.startsWith('/skills')) return { character: 'seal', pose: 'skills', badge: 'skills' };
  if (path.startsWith('/practice')) return { character: 'seal', pose: 'listening', badge: 'listening' };
  if (path.startsWith('/vocab')) return { character: 'hedgehog', pose: 'vocab', badge: 'vocab' };
  if (path.startsWith('/mistakes')) return { character: 'hedgehog', pose: 'mistakes', badge: 'mistakes' };
  if (path.startsWith('/journal')) return { character: 'hedgehog', pose: 'journal', badge: 'journal' };
  // Trang Hôm nay: đêm khuya thì Nhím ngủ gật, còn lại Nhím cầm quả sồi mục tiêu
  return { character: 'hedgehog', pose: hour >= 23 || hour < 5 ? 'sleepy' : 'goal', badge: 'journal' };
}

function tipsFor(path: string, who: Who): string[] {
  if (who.character === 'hedgehog') return HEDGE_TIPS;
  const area = Object.keys(AREA_TIPS).find((k) => path.startsWith('/' + k));
  return area ? [...AREA_TIPS[area], ...SEAL_TIPS] : SEAL_TIPS;
}

function greeting(hour: number, name?: string) {
  const who = name ? ` ${name}` : '';
  if (hour < 5) return `Khuya rồi${who} ơi, học xíu rồi ngủ ngon nha 🌙`;
  if (hour < 11) return `Chào buổi sáng${who}! Hôm nay mình học gì nào? ☀️`;
  if (hour < 14) return `Trưa vui vẻ${who}! Một bài ngắn trước khi nghỉ nhé?`;
  if (hour < 18) return `Chiều rồi${who}, giữ nhịp đều đều thôi nào~`;
  return `Tối an lành${who}! Ôn nhẹ một chút là đủ rồi 🌷`;
}

function readFlag(storage: 'local' | 'session', key: string) {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key) === '1';
  } catch {
    return false;
  }
}
function writeFlag(storage: 'local' | 'session', key: string, on: boolean) {
  try {
    const s = storage === 'local' ? localStorage : sessionStorage;
    if (on) s.setItem(key, '1');
    else s.removeItem(key);
  } catch {
    /* bỏ qua khi trình duyệt chặn lưu trữ */
  }
}

const hideListeners = new Set<() => void>();
function subscribeHidden(cb: () => void) {
  hideListeners.add(cb);
  return () => {
    hideListeners.delete(cb);
  };
}
function setHiddenFlag(on: boolean) {
  writeFlag('local', HIDE_KEY, on);
  hideListeners.forEach((f) => f());
}
const noopSubscribe = () => () => {};

export default function MascotBuddy() {
  const path = usePathname();
  const store = useStore();
  const hidden = useSyncExternalStore(subscribeHidden, () => readFlag('local', HIDE_KEY), () => false);
  const hour = useSyncExternalStore(noopSubscribe, () => new Date().getHours(), () => 12);
  const [bubble, setBubbleState] = useState<{ text: string; path: string } | null>(null);
  const [hop, setHop] = useState(0);
  const tipIdx = useRef(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const who = useMemo(() => whoFor(path, hour), [path, hour]);
  // Bong bóng chỉ thuộc về trang đã nói ra nó — đổi trang là tự tắt
  const bubbleText = bubble && bubble.path === path ? bubble.text : null;

  const say = useCallback((text: string, ms = 6000) => {
    setBubbleState({ text, path: pathRef.current });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBubbleState(null), ms);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Chào một lần mỗi phiên, khi đã biết tên người học
  const name = store?.profile?.name;
  const hasProfile = !!store?.profile;
  useEffect(() => {
    if (hidden || !hasProfile || readFlag('session', GREET_KEY)) return;
    writeFlag('session', GREET_KEY, true);
    const t = setTimeout(() => {
      say(greeting(new Date().getHours(), name), 5000);
      setHop((h) => h + 1);
    }, 900);
    return () => clearTimeout(t);
  }, [hidden, hasProfile, name, say]);

  if (!hasProfile) return null;

  const pokeBuddy = () => {
    const tips = tipsFor(path, who);
    tipIdx.current = tipIdx.current < 0 ? Math.floor(Math.random() * tips.length) : (tipIdx.current + 1) % tips.length;
    say(tips[tipIdx.current]);
    setHop((h) => h + 1);
  };

  const hide = () => {
    setBubbleState(null);
    setHiddenFlag(true);
  };
  const show = () => {
    setHiddenFlag(false);
    say(who.character === 'seal' ? 'Hải Cẩu quay lại rồi đây! 🐾' : 'Nhím về rồi nè! 🌰', 3500);
  };

  return (
    <div className="pointer-events-none fixed right-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 flex flex-col items-end sm:right-5 lg:bottom-5">
      {hidden ? (
        <button
          type="button"
          onClick={show}
          className="buddy-peek pointer-events-auto rounded-full shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-0.5"
          aria-label="Gọi bạn nhỏ quay lại"
          title="Gọi bạn nhỏ quay lại"
        >
          <MascotBadge character={who.character} variant={who.badge} size={40} />
        </button>
      ) : (
        <>
          {bubbleText && (
            <div
              role="status"
              className="buddy-bubble pointer-events-auto relative mb-1 max-w-[15rem] rounded-2xl border border-line-strong bg-surface px-3.5 py-2.5 pr-7 text-[13.5px] leading-snug text-ink shadow-[var(--shadow-pop)]"
            >
              {bubbleText}
              <button
                type="button"
                onClick={() => setBubbleState(null)}
                className="absolute top-1.5 right-1.5 rounded-full p-0.5 text-muted hover:bg-sunk hover:text-ink"
                aria-label="Đóng lời nhắn"
              >
                <X size={13} />
              </button>
              <span className="absolute -bottom-[7px] right-9 size-3 rotate-45 border-r border-b border-line-strong bg-surface" />
            </div>
          )}
          <div className="group pointer-events-auto relative">
            <button
              key={hop}
              type="button"
              onClick={pokeBuddy}
              className={`block cursor-pointer ${hop ? 'm-hop' : ''}`}
              aria-label={who.character === 'seal' ? 'Bé Hải Cẩu: nghe một mẹo' : 'Bé Nhím: nghe một lời nhắn'}
              title="Bấm để nghe mẹo nhỏ"
            >
              {who.character === 'seal' ? (
                <SealMascot pose={who.pose} size={72} className="drop-shadow-sm sm:size-[84px]" />
              ) : (
                <HedgehogMascot pose={who.pose} size={72} className="drop-shadow-sm sm:size-[84px]" />
              )}
            </button>
            <button
              type="button"
              onClick={hide}
              className={`absolute -top-1 -left-1 rounded-full border border-line-strong bg-surface p-0.5 text-muted shadow-sm hover:text-ink focus-visible:block ${bubbleText ? 'block' : 'hidden group-hover:block'}`}
              aria-label="Ẩn bạn nhỏ"
              title="Ẩn bạn nhỏ"
            >
              <X size={12} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
