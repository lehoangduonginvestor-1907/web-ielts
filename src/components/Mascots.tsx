// Cozy Storybook mascots for SealIELTS.
// - Seal: 4 IELTS skills & practice tests (Listening, Reading, Writing, Speaking, Skills, Exam Room)
// - Hedgehog: Personal study tools (Journal, Mistake Log, Vocab Notebook, Daily Goal & Streak)

import React from 'react';

const INK = '#3b2e28';
const SEAL_BODY = '#fffdf9';
const SEAL_SHADE = '#e5eff2';
const BLUSH = '#f4a698';
const SCARF_1 = '#2f7d69';
const SCARF_2 = '#78b0a0';
const EMBER = '#ec7457';
const GOLD = '#f7b538';
const HEDGE_QUILL = '#8c6249';
const HEDGE_DEEP = '#6e4934';
const HEDGE_FACE = '#faeedc';

/** Đôi mắt long lanh (2 đốm sáng) biết chớp. */
function SparkleEyes({ lx, rx, y, r = 4.2, delay = '0s' }: { lx: number; rx: number; y: number; r?: number; delay?: string }) {
  return (
    <g className="m-blink" style={{ animationDelay: delay }}>
      {[lx, rx].map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r={r} fill={INK} />
          <circle cx={x + r * 0.34} cy={y - r * 0.38} r={r * 0.38} fill="#ffffff" />
          <circle cx={x - r * 0.36} cy={y + r * 0.36} r={r * 0.16} fill="#ffffff" />
        </g>
      ))}
    </g>
  );
}

/** Má hồng có 3 nét gạch nhỏ kiểu sticker. */
function Blush({ cx, cy, rx = 5.5, ry = 3.2 }: { cx: number; cy: number; rx?: number; ry?: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={BLUSH} opacity="0.82" />
      <g stroke="#e0806f" strokeWidth="0.9" strokeLinecap="round" opacity="0.75">
        <path d={`M${cx - 2.8} ${cy - 1.1} l-1 2`} />
        <path d={`M${cx} ${cy - 1.1} l-1 2`} />
        <path d={`M${cx + 2.8} ${cy - 1.1} l-1 2`} />
      </g>
    </g>
  );
}

export type SealPose = 'listening' | 'reading' | 'writing' | 'speaking' | 'skills' | 'celebrate' | 'encourage';
export type HedgehogPose = 'journal' | 'mistakes' | 'vocab' | 'goal' | 'sleepy' | 'celebrate';
export type DuoMood = 'welcome' | 'done' | 'study';

/**
 * Bé Hải Cẩu phong cách Sách Tranh — phụ trách 4 kỹ năng học & luyện đề.
 */
export function SealMascot({
  pose = 'listening',
  size = 80,
  className = '',
  animate = true,
}: {
  pose?: SealPose;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const isCelebrate = pose === 'celebrate';
  const isEncourage = pose === 'encourage';
  const hasGlasses = pose === 'reading' || pose === 'skills';
  const hasCurl = pose === 'reading' || pose === 'speaking' || isCelebrate || isEncourage;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 112"
      className={`mascot shrink-0 ${animate ? 'mascot-bob' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Bóng nền sách tranh nhẹ */}
      <ellipse cx="60" cy="99" rx="34" ry="5.5" fill="rgb(59 46 40 / 0.09)" />

      <g className="m-body">

      {/* Đuôi hải cẩu */}
      <path
        d="M88 79 Q104 71 103 84 Q96 90 86 86 Z"
        fill={SEAL_SHADE}
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />

      {/* Thân mũm mĩm */}
      <path
        d="M27 68 C27 42, 41 27, 60 27 C79 27, 93 42, 93 68 C93 84, 81 94, 60 94 C39 94, 27 84, 27 68 Z"
        fill={SEAL_BODY}
        stroke={INK}
        strokeWidth="2.1"
      />

      {/* Bóng bụng ấm */}
      <ellipse cx="60" cy="80" rx="22" ry="9.5" fill={SEAL_SHADE} opacity="0.7" />

      {/* Chấm lông mày hạt đậu đặc trưng của hải cẩu */}
      <ellipse cx="45" cy="42" rx="2.6" ry="1.6" fill="#9fb2bf" transform="rotate(-12 45 42)" />
      <ellipse cx="75" cy="42" rx="2.6" ry="1.6" fill="#9fb2bf" transform="rotate(12 75 42)" />

      {/* Lọn tóc xoăn nhỏ trên đỉnh đầu */}
      {hasCurl && (
        <path d="M58 28 Q55 20 61 19 Q66 19 64 24" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Má hồng phúng phính */}
      <Blush cx={37} cy={59} />
      <Blush cx={83} cy={59} />

      {/* Mõm tròn & ria */}
      <ellipse cx="55.5" cy="58.5" rx="5" ry="3.8" fill="#ffffff" />
      <ellipse cx="64.5" cy="58.5" rx="5" ry="3.8" fill="#ffffff" />
      <g stroke={INK} strokeWidth="1.2" opacity="0.48" strokeLinecap="round">
        <line x1="34" y1="56.5" x2="26" y2="54.5" />
        <line x1="34" y1="60.5" x2="25" y2="61.5" />
        <line x1="86" y1="56.5" x2="94" y2="54.5" />
        <line x1="86" y1="60.5" x2="95" y2="61.5" />
      </g>

      {/* Đôi mắt theo trạng thái */}
      {isCelebrate ? (
        <g fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round">
          <path d="M40 53 Q45 46 50 53" />
          <path d="M70 53 Q75 46 80 53" />
        </g>
      ) : (
        <SparkleEyes lx={45} rx={75} y={51.5} />
      )}

      {/* Mũi & miệng */}
      <ellipse cx="60" cy="55.5" rx="3.6" ry="2.4" fill={INK} />
      {isCelebrate ? (
        <path d="M55 60.5 Q60 68 65 60.5 Z" fill="#e57373" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      ) : (
        <path
          d="M54.5 60.5 Q57.2 63.8 60 60.5 Q62.8 63.8 65.5 60.5"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Kính tròn khi đọc / học kỹ năng */}
      {hasGlasses && (
        <g stroke={INK} strokeWidth="1.7" fill="rgb(255 255 255 / 0.25)">
          <circle cx="45" cy="51.5" r="8" />
          <circle cx="75" cy="51.5" r="8" />
          <path d="M53 51 Q60 49 67 51" fill="none" />
        </g>
      )}

      {/* Khăn len kẻ sọc xanh ngọc có tua rua */}
      <g>
        <path
          d="M34 69 Q60 76 86 69 Q85 77 60 81 Q35 77 34 69 Z"
          fill={SCARF_1}
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M46 72 L45 78 M60 73 L60 80 M74 72 L75 78" stroke={SCARF_2} strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M68 76 L74 91 L63 89.5 L61 78 Z"
          fill={SCARF_1}
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <line x1="65" y1="89.5" x2="64" y2="93" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="69" y1="90" x2="69" y2="93.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="72.5" y1="90.5" x2="73" y2="94" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* Vây hai bên */}
      {isCelebrate ? (
        <g>
          <path className="m-wave-l" d="M29 66 Q16 55 23 48 Q31 48 35 60 Z" fill={SEAL_BODY} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
          <path className="m-wave-r" d="M91 66 Q104 55 97 48 Q89 48 85 60 Z" fill={SEAL_BODY} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
        </g>
      ) : (
        <g>
          <path d="M29 70 Q18 75 23 82 Q31 84 35 76 Z" fill={SEAL_BODY} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
          <path className="m-flip-r" d="M91 70 Q102 75 97 82 Q89 84 85 76 Z" fill={SEAL_BODY} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
        </g>
      )}

      {/* Phụ kiện theo kỹ năng */}
      {pose === 'listening' && (
        <g>
          <path d="M26 51 C25 20, 95 20, 94 51" fill="none" stroke={EMBER} strokeWidth="4.4" strokeLinecap="round" />
          <rect x="20" y="43" width="9.5" height="17" rx="4.5" fill={EMBER} stroke={INK} strokeWidth="1.8" />
          <rect x="90.5" y="43" width="9.5" height="17" rx="4.5" fill={EMBER} stroke={INK} strokeWidth="1.8" />
          {/* Nốt nhạc nhỏ */}
          <path d="M98 24 V14 L106 12 V22" fill="none" stroke={EMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="96" cy="24.5" r="2.6" fill={EMBER} />
          <circle cx="104" cy="22.5" r="2.6" fill={EMBER} />
        </g>
      )}

      {pose === 'reading' && (
        <g transform="translate(38, 76)">
          <path d="M2 5 Q12 1 22 6 L22 22 Q12 17 2 21 Z" fill={SCARF_1} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M42 5 Q32 1 22 6 L22 22 Q32 17 42 21 Z" fill={SCARF_1} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M5 7 Q13 4 20 7 L20 19 Q13 16 5 19 Z" fill="#fffdf8" />
          <path d="M39 7 Q31 4 24 7 L24 19 Q31 16 39 19 Z" fill="#fffdf8" />
          <line x1="9" y1="11" x2="17" y2="10" stroke={INK} strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
          <line x1="9" y1="14.5" x2="17" y2="13.5" stroke={INK} strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
          <line x1="27" y1="10" x2="35" y2="11" stroke={INK} strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
          <line x1="27" y1="13.5" x2="35" y2="14.5" stroke={INK} strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
        </g>
      )}

      {pose === 'writing' && (
        <g>
          {/* Mũ beret nghệ sĩ */}
          <path d="M42 29 C42 18, 78 18, 78 29 Q60 32 42 29 Z" fill={EMBER} stroke={INK} strokeWidth="1.8" />
          <line x1="60" y1="20" x2="62" y2="16" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          {/* Bút máy bên vây phải */}
          <g transform="translate(88, 63) rotate(22)">
            <rect x="0" y="0" width="6" height="19" rx="2" fill={GOLD} stroke={INK} strokeWidth="1.6" />
            <polygon points="0,19 6,19 3,25" fill="#fffdf8" stroke={INK} strokeWidth="1.4" />
          </g>
        </g>
      )}

      {pose === 'speaking' && (
        <g>
          {/* Micro nhỏ & bong bóng thoại */}
          <g transform="translate(84, 59) rotate(14)">
            <rect x="2" y="8" width="4.5" height="14" rx="2" fill={INK} />
            <circle cx="4.2" cy="5" r="5" fill={SCARF_2} stroke={INK} strokeWidth="1.7" />
          </g>
          <path d="M92 22 C92 15, 108 15, 108 22 C108 27, 101 29, 96 29 L91 33 L93 28 C92 26, 92 24, 92 22 Z" fill="#ffffff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="97" cy="22" r="1.1" fill={EMBER} />
          <circle cx="100.5" cy="22" r="1.1" fill={EMBER} />
          <circle cx="104" cy="22" r="1.1" fill={EMBER} />
        </g>
      )}

      {pose === 'skills' && (
        <g>
          {/* Mũ cử nhân nhỏ nhắn */}
          <polygon points="60,13 84,21 60,29 36,21" fill={INK} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M46 25 V31 Q60 35 74 31 V25" fill={INK} />
          <line x1="80" y1="22" x2="82" y2="33" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
          <circle cx="82" cy="34" r="2.2" fill={GOLD} />
          {/* Bóng đèn sáng kiến */}
          <g transform="translate(92, 16)">
            <circle cx="9" cy="9" r="6.5" fill={GOLD} stroke={INK} strokeWidth="1.5" />
            <rect x="6.5" y="15" width="5" height="3" rx="1" fill="#d8c5b4" stroke={INK} strokeWidth="1.2" />
            <line x1="9" y1="-1" x2="9" y2="-4" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="17" y1="4" x2="19.5" y2="2" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </g>
      )}

      {isCelebrate && (
        <g fill={GOLD}>
          <path className="m-twinkle" d="M18 32 L20 26 L22 32 L28 34 L22 36 L20 42 L18 36 L12 34 Z" />
          <path className="m-twinkle" style={{ animationDelay: '0.5s' }} d="M98 28 L99.5 23 L101 28 L106 29.5 L101 31 L99.5 36 L98 31 L93 29.5 Z" />
          <circle cx="30" cy="20" r="2.5" fill={EMBER} />
          <circle cx="90" cy="18" r="2.5" fill={SCARF_1} />
        </g>
      )}

      {isEncourage && (
        <path
          className="m-beat"
          d="M60 88 C60 88 51 82 51 77 C51 74 53.5 72 56 72 C58 72 59.5 73.5 60 74.5 C60.5 73.5 62 72 64 72 C66.5 72 69 74 69 77 C69 82 60 88 60 88 Z"
          fill={EMBER}
          stroke={INK}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
      </g>
    </svg>
  );
}

/**
 * Bé Nhím phong cách Sách Tranh — phụ trách Nhật ký, Sổ lỗi, Sổ từ vựng & Mục tiêu cá nhân.
 */
export function HedgehogMascot({
  pose = 'journal',
  size = 80,
  className = '',
  animate = true,
}: {
  pose?: HedgehogPose;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const isSleepy = pose === 'sleepy';
  const isCelebrate = pose === 'celebrate';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 112"
      className={`mascot shrink-0 ${animate ? (isSleepy ? 'mascot-breathe' : 'mascot-bob') : ''} ${className}`}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="99" rx="34" ry="5.5" fill="rgb(59 46 40 / 0.09)" />

      <g className="m-body">

      {/* Bộ lông gai sách tranh mềm mại */}
      <path
        d="M23 65 L15 53 L25 46 L21 33 L34 34 L38 20 L50 26 L60 15 L70 26 L82 20 L86 34 L99 33 L95 46 L105 53 L97 65 C97 85, 81 95, 60 95 C39 95, 23 85, 23 65 Z"
        fill={HEDGE_QUILL}
        stroke={INK}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Điểm nhấn nét lông bên trong */}
      <g stroke={HEDGE_DEEP} strokeWidth="1.7" strokeLinecap="round" opacity="0.55">
        <line x1="39" y1="30" x2="43" y2="35" />
        <line x1="60" y1="23" x2="60" y2="29" />
        <line x1="81" y1="30" x2="77" y2="35" />
        <line x1="25" y1="53" x2="31" y2="55" />
        <line x1="95" y1="53" x2="89" y2="55" />
      </g>

      {/* Chiếc lá nhỏ cài trên gai */}
      <g className="m-leaf">
        <path d="M63 19 Q66 9 76 10 Q74 19 63 19 Z" fill={SCARF_2} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M64.5 17.5 Q69 14 73 12" fill="none" stroke={SCARF_1} strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* Tai tròn ấm */}
      <circle cx="32" cy="46" r="6.5" fill={HEDGE_FACE} stroke={INK} strokeWidth="2.1" />
      <circle cx="32" cy="46" r="3" fill={BLUSH} opacity="0.72" />
      <circle cx="88" cy="46" r="6.5" fill={HEDGE_FACE} stroke={INK} strokeWidth="2.1" />
      <circle cx="88" cy="46" r="3" fill={BLUSH} opacity="0.72" />

      {/* Mặt & bụng kem bơ */}
      <path
        d="M29 66 C29 45, 42 36, 60 36 C78 36, 91 45, 91 66 C91 84, 78 94, 60 94 C42 94, 29 84, 29 66 Z"
        fill={HEDGE_FACE}
        stroke={INK}
        strokeWidth="2.1"
      />

      {/* Má hồng */}
      <Blush cx={38} cy={65} />
      <Blush cx={82} cy={65} />

      {/* Mắt theo trạng thái */}
      {isSleepy ? (
        <g fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round">
          <path d="M40 57 Q44.5 61 49 57" />
          <path d="M71 57 Q75.5 61 80 57" />
        </g>
      ) : isCelebrate ? (
        <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
          <path d="M40 57 Q44.5 50 49 57" />
          <path d="M71 57 Q75.5 50 80 57" />
        </g>
      ) : (
        <SparkleEyes lx={44.5} rx={75.5} y={56} r={4} delay="1.7s" />
      )}

      {/* Kính gọng tròn đặc trưng */}
      {!isSleepy && (
        <g stroke={INK} strokeWidth="1.7" fill="rgb(255 255 255 / 0.22)">
          <circle cx="44.5" cy="56" r="8" />
          <circle cx="75.5" cy="56" r="8" />
          <path d="M52.5 55.5 Q60 53.5 67.5 55.5" fill="none" />
        </g>
      )}

      {/* Mũi & miệng */}
      <ellipse cx="60" cy="62" rx="3.4" ry="2.4" fill={INK} />
      {isCelebrate ? (
        <path d="M55 66.5 Q60 73.5 65 66.5 Z" fill="#e57373" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      ) : isSleepy ? (
        <path d="M56 67 Q60 69.5 64 67" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <path
          d="M54.5 66.5 Q57.2 69.8 60 66.5 Q62.8 69.8 65.5 66.5"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Tay nhỏ (giơ lên khi ăn mừng) */}
      {isCelebrate ? (
        <>
          <ellipse className="m-wave-l" cx="27" cy="62" rx="5" ry="5.5" fill={HEDGE_FACE} stroke={INK} strokeWidth="1.8" />
          <ellipse className="m-wave-r" cx="93" cy="62" rx="5" ry="5.5" fill={HEDGE_FACE} stroke={INK} strokeWidth="1.8" />
        </>
      ) : (
        <>
          <ellipse cx="42" cy="83" rx="5.5" ry="4" fill={HEDGE_FACE} stroke={INK} strokeWidth="1.8" />
          <ellipse className="m-flip-r" cx="78" cy="83" rx="5.5" ry="4" fill={HEDGE_FACE} stroke={INK} strokeWidth="1.8" />
        </>
      )}
      {/* Đôi chân tròn xíu */}
      <ellipse cx="49" cy="94" rx="6" ry="3.4" fill={HEDGE_DEEP} stroke={INK} strokeWidth="1.6" />
      <ellipse cx="71" cy="94" rx="6" ry="3.4" fill={HEDGE_DEEP} stroke={INK} strokeWidth="1.6" />

      {/* Phụ kiện theo vai trò cá nhân */}
      {pose === 'journal' && (
        <g>
          {/* Cuốn sổ nhật ký bìa cam san hô có dây đánh dấu */}
          <rect x="44" y="72" width="32" height="23" rx="3.5" fill={EMBER} stroke={INK} strokeWidth="1.8" />
          <rect x="44" y="72" width="6" height="23" rx="2" fill="#d35b3f" stroke={INK} strokeWidth="1.6" />
          <rect x="54" y="77" width="16" height="7" rx="1.5" fill="#fffdf8" stroke={INK} strokeWidth="1.2" />
          <path d="M68 95 L68 101 L71 98.5 L74 101 L74 95" fill={GOLD} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          {/* Bút chì bên phải */}
          <g transform="translate(84, 66) rotate(22)">
            <rect x="0" y="0" width="6" height="19" rx="1.8" fill={GOLD} stroke={INK} strokeWidth="1.5" />
            <polygon points="0,19 6,19 3,24.5" fill={HEDGE_FACE} stroke={INK} strokeWidth="1.3" />
          </g>
        </g>
      )}

      {pose === 'mistakes' && (
        <g>
          {/* Sổ lỗi có sticker băng cá nhân chữa lỗi */}
          <rect x="43" y="73" width="32" height="22" rx="3" fill="#ffffff" stroke={INK} strokeWidth="1.8" />
          <line x1="49" y1="80" x2="67" y2="80" stroke={INK} strokeWidth="1.3" opacity="0.5" strokeLinecap="round" />
          <line x1="49" y1="85" x2="63" y2="85" stroke={INK} strokeWidth="1.3" opacity="0.5" strokeLinecap="round" />
          <path d="M62 88 L65.5 91.5 L72 84" fill="none" stroke={SCARF_1} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          {/* Sticker băng cá nhân nhỏ trên bìa */}
          <rect x="45" y="74" width="12" height="5" rx="2" transform="rotate(-14 51 76.5)" fill="#fde6df" stroke={EMBER} strokeWidth="1.2" />
          {/* Bút chì tẩy */}
          <g transform="translate(82, 65) rotate(20)">
            <rect x="0" y="0" width="6.5" height="5" rx="1.5" fill={BLUSH} stroke={INK} strokeWidth="1.4" />
            <rect x="0" y="5" width="6.5" height="15" fill={GOLD} stroke={INK} strokeWidth="1.4" />
            <polygon points="0,20 6.5,20 3.25,25" fill={HEDGE_FACE} stroke={INK} strokeWidth="1.3" />
          </g>
        </g>
      )}

      {pose === 'vocab' && (
        <g>
          {/* Xấp flashcard từ vựng */}
          <rect x="41" y="75" width="28" height="19" rx="3" transform="rotate(-6 55 84)" fill={SCARF_2} stroke={INK} strokeWidth="1.6" />
          <rect x="45" y="73" width="30" height="20" rx="3" fill="#ffffff" stroke={INK} strokeWidth="1.8" />
          <text x="60" y="86.5" textAnchor="middle" fontSize="10" fontWeight="700" fill={SCARF_1} fontFamily="serif">
            A–Z
          </text>
          {/* Kính lúp nhỏ */}
          <g transform="translate(77, 67)">
            <circle cx="7" cy="7" r="6" fill="#dff0eb" stroke={INK} strokeWidth="1.7" />
            <line x1="11.5" y1="11.5" x2="17" y2="17" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </g>
      )}

      {pose === 'goal' && (
        <g>
          {/* Quả sồi / mục tiêu vàng ấm */}
          <path d="M51 83 C51 77, 69 77, 69 83 C69 91, 63 96, 60 97 C57 96, 51 91, 51 83 Z" fill={GOLD} stroke={INK} strokeWidth="1.7" />
          <path d="M49 80 Q60 74 71 80 Q71 84 60 84 Q49 84 49 80 Z" fill={HEDGE_DEEP} stroke={INK} strokeWidth="1.7" />
          <line x1="60" y1="74" x2="60" y2="71" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {isSleepy && (
        <g fill={INK} opacity="0.6" fontFamily="sans-serif" fontWeight="700">
          <text className="m-zzz" x="86" y="34" fontSize="10">
            z
          </text>
          <text className="m-zzz" style={{ animationDelay: '0.7s' }} x="93" y="26" fontSize="12">
            Z
          </text>
          <text className="m-zzz" style={{ animationDelay: '1.4s' }} x="102" y="19" fontSize="9">
            z
          </text>
        </g>
      )}

      {isCelebrate && (
        <g fill={GOLD}>
          <path className="m-twinkle" d="M18 30 L20 24 L22 30 L28 32 L22 34 L20 40 L18 34 L12 32 Z" />
          <path className="m-twinkle" style={{ animationDelay: '0.5s' }} d="M98 28 L99.5 23 L101 28 L106 29.5 L101 31 L99.5 36 L98 31 L93 29.5 Z" />
          <circle cx="30" cy="18" r="2.5" fill={EMBER} />
          <circle cx="91" cy="17" r="2.5" fill={SCARF_1} />
        </g>
      )}
      </g>
    </svg>
  );
}

/**
 * 4 biểu cảm Bé Nhím cho Nhật ký (1 = Uể oải, 2 = Bình thường, 3 = Ổn, 4 = Rất tốt).
 */
export function HedgehogMood({ mood, size = 22, className = '' }: { mood: 1 | 2 | 3 | 4; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      {/* Viền gai nhẹ quanh đầu */}
      <path
        d="M5 18 L3 13 L7 10 L7 5 L12 6 L16 3 L20 6 L25 5 L25 10 L29 13 L27 18 C27 25, 22 28, 16 28 C10 28, 5 25, 5 18 Z"
        fill={HEDGE_QUILL}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Mặt kem */}
      <ellipse cx="16" cy="18.5" rx="9.5" ry="8" fill={HEDGE_FACE} stroke={INK} strokeWidth="1.5" />
      {/* Má hồng */}
      <circle cx="10" cy="19.5" r="1.8" fill={BLUSH} opacity="0.85" />
      <circle cx="22" cy="19.5" r="1.8" fill={BLUSH} opacity="0.85" />
      {/* Mắt & miệng theo mood */}
      {mood === 1 && (
        <>
          <path d="M10.5 16.5 Q12 18 13.5 16.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18.5 16.5 Q20 18 21.5 16.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M13.5 22 Q16 20.3 18.5 22" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M25.5 10 C25.5 10 27 12.2 27 13.4 A1.5 1.5 0 0 1 24 13.4 C24 12.2 25.5 10 25.5 10 Z" fill="#85c1e9" stroke={INK} strokeWidth="1" />
        </>
      )}
      {mood === 2 && (
        <>
          <circle cx="12" cy="16.5" r="1.4" fill={INK} />
          <circle cx="20" cy="16.5" r="1.4" fill={INK} />
          <line x1="13.5" y1="21.5" x2="18.5" y2="21.5" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {mood === 3 && (
        <>
          <circle cx="12" cy="16.3" r="1.5" fill={INK} />
          <circle cx="20" cy="16.3" r="1.5" fill={INK} />
          <path d="M13.5 20.8 Q14.7 22.4 16 20.8 Q17.3 22.4 18.5 20.8" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {mood === 4 && (
        <>
          <path d="M10.5 17 Q12 14.5 13.5 17" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M18.5 17 Q20 14.5 21.5 17" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13.5 20.5 Q16 23.8 18.5 20.5" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M26 7 L26.8 9 L28.8 9.6 L26.8 10.3 L26 12.3 L25.2 10.3 L23.2 9.6 L25.2 9 Z" fill={GOLD} />
        </>
      )}
      {/* Mũi nhỏ */}
      <ellipse cx="16" cy="18.8" rx="1.4" ry="1" fill={INK} />
    </svg>
  );
}

/**
 * Cặp đôi Bé Hải Cẩu (kỹ năng) & Bé Nhím (cá nhân) đồng hành cùng nhau.
 */
export function MascotDuo({
  size = 110,
  mood = 'welcome',
  className = '',
}: {
  size?: number;
  mood?: DuoMood;
  className?: string;
}) {
  const height = Math.round(size * 0.56);
  const isDone = mood === 'done';
  return (
    <svg width={size} height={height} viewBox="0 0 210 118" className={`mascot mascot-duo shrink-0 ${className}`} aria-hidden="true">
      {/* Nền bóng chung */}
      <ellipse cx="105" cy="105" rx="84" ry="7" fill="rgb(59 46 40 / 0.09)" />

      {/* Bé Hải Cẩu bên trái (đeo tai nghe + khăn len) */}
      <g transform="translate(4, 4)">
        <g className="m-body">
        <path d="M84 81 Q98 74 96 86 Q90 91 82 87 Z" fill={SEAL_SHADE} stroke={INK} strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M24 68 C24 42, 38 27, 57 27 C76 27, 90 42, 90 68 C90 85, 78 94, 57 94 C36 94, 24 85, 24 68 Z" fill={SEAL_BODY} stroke={INK} strokeWidth="2.1" />
        <ellipse cx="57" cy="80" rx="20" ry="9" fill={SEAL_SHADE} opacity="0.65" />
        <ellipse cx="43" cy="42" rx="2.4" ry="1.5" fill="#9fb2bf" transform="rotate(-12 43 42)" />
        <ellipse cx="71" cy="42" rx="2.4" ry="1.5" fill="#9fb2bf" transform="rotate(12 71 42)" />
        <Blush cx={35} cy={59} rx={5} ry={3} />
        <Blush cx={79} cy={59} rx={5} ry={3} />
        {isDone ? (
          <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
            <path d="M38 53 Q43 46 48 53" />
            <path d="M66 53 Q71 46 76 53" />
          </g>
        ) : (
          <SparkleEyes lx={43} rx={71} y={51.5} r={4} />
        )}
        <ellipse cx="57" cy="55.5" rx="3.4" ry="2.2" fill={INK} />
        <path d="M52 60.5 Q54.5 63.5 57 60.5 Q59.5 63.5 62 60.5" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
        {/* Khăn len */}
        <path d="M32 69 Q57 76 82 69 Q81 77 57 80 Q33 77 32 69 Z" fill={SCARF_1} stroke={INK} strokeWidth="1.8" />
        <path d="M64 76 L70 90 L60 88.5 L58 78 Z" fill={SCARF_1} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        {/* Tai nghe cam */}
        <path d="M23 51 C22 20, 92 20, 91 51" fill="none" stroke={EMBER} strokeWidth="4.2" strokeLinecap="round" />
        <rect x="17" y="43" width="9" height="16" rx="4.2" fill={EMBER} stroke={INK} strokeWidth="1.8" />
        <rect x="88" y="43" width="9" height="16" rx="4.2" fill={EMBER} stroke={INK} strokeWidth="1.8" />
        {/* Vây vẫy */}
        <path d="M26 70 Q15 75 20 82 Q28 83 32 76 Z" fill={SEAL_BODY} stroke={INK} strokeWidth="2" />
        <path className="m-wave-r" d="M88 70 Q98 67 96 76 Q90 80 84 75 Z" fill={SEAL_BODY} stroke={INK} strokeWidth="2" />
        </g>
      </g>

      {/* Bé Nhím bên phải (đeo kính + cầm sổ) */}
      <g transform="translate(96, 4)">
        <g className="m-body m-body-2">
        <path
          d="M21 65 L13 53 L23 46 L19 33 L32 34 L36 20 L48 26 L58 15 L68 26 L80 20 L84 34 L97 33 L93 46 L103 53 L95 65 C95 85, 79 95, 58 95 C37 95, 21 85, 21 65 Z"
          fill={HEDGE_QUILL}
          stroke={INK}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <circle cx="30" cy="46" r="6" fill={HEDGE_FACE} stroke={INK} strokeWidth="2" />
        <circle cx="86" cy="46" r="6" fill={HEDGE_FACE} stroke={INK} strokeWidth="2" />
        <path d="M27 66 C27 45, 40 36, 58 36 C76 36, 89 45, 89 66 C89 84, 76 94, 58 94 C40 94, 27 84, 27 66 Z" fill={HEDGE_FACE} stroke={INK} strokeWidth="2.1" />
        <Blush cx={36} cy={64} rx={5} ry={3} />
        <Blush cx={80} cy={64} rx={5} ry={3} />
        {isDone ? (
          <g fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round">
            <path d="M38 57 Q43 50 48 57" />
            <path d="M68 57 Q73 50 78 57" />
          </g>
        ) : (
          <SparkleEyes lx={43} rx={73} y={56} r={3.8} delay="1.7s" />
        )}
        <g stroke={INK} strokeWidth="1.6" fill="rgb(255 255 255 / 0.22)">
          <circle cx="43" cy="56" r="7.5" />
          <circle cx="73" cy="56" r="7.5" />
          <path d="M50.5 55.5 Q58 53.5 65.5 55.5" fill="none" />
        </g>
        <ellipse cx="58" cy="62" rx="3.2" ry="2.2" fill={INK} />
        <path d="M53 66.5 Q55.5 69.5 58 66.5 Q60.5 69.5 63 66.5" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
        {/* Cuốn sổ tay */}
        <rect x="44" y="73" width="28" height="20" rx="3" fill={SCARF_1} stroke={INK} strokeWidth="1.8" />
        <rect x="44" y="73" width="5" height="20" rx="1.5" fill="#246353" stroke={INK} strokeWidth="1.5" />
        <rect x="52" y="78" width="14" height="6" rx="1.2" fill="#fffdf8" />
        {/* Lá nhỏ trên gai */}
        <path className="m-leaf" d="M61 19 Q64 9 74 10 Q72 19 61 19 Z" fill={SCARF_2} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      </g>

      {/* Chi tiết trạng thái giữa hai bé */}
      {isDone ? (
        <g fill={GOLD}>
          <path className="m-twinkle" d="M105 14 L107 8 L109 14 L115 16 L109 18 L107 24 L105 18 L99 16 Z" />
          <circle cx="88" cy="18" r="2.4" fill={EMBER} />
          <circle cx="123" cy="18" r="2.4" fill={SCARF_1} />
        </g>
      ) : mood === 'welcome' ? (
        <path
          className="m-beat"
          d="M105 26 C105 26 98 21 98 17 C98 14.5 100 13 102 13 C103.5 13 104.6 14 105 15 C105.4 14 106.5 13 108 13 C110 13 112 14.5 112 17 C112 21 105 26 105 26 Z"
          fill={EMBER}
          stroke={INK}
          strokeWidth="1.4"
        />
      ) : null}
    </svg>
  );
}

/**
 * Huy hiệu avatar tròn nhỏ cho từng đầu việc & nhóm bài.
 */
export function MascotBadge({
  character,
  variant = 'reading',
  size = 36,
  className = '',
}: {
  character: 'seal' | 'hedgehog';
  variant?: 'listening' | 'reading' | 'writing' | 'speaking' | 'skills' | 'vocab' | 'mistakes' | 'journal';
  size?: number;
  className?: string;
}) {
  const bg =
    character === 'seal'
      ? variant === 'listening' || variant === 'speaking'
        ? '#fde6df'
        : variant === 'writing'
          ? '#f2e8dc'
          : '#dff0eb'
      : variant === 'vocab'
        ? '#dff0eb'
        : variant === 'mistakes'
          ? '#fde6df'
          : '#f2e8dc';

  const sealPose: SealPose =
    variant === 'listening' || variant === 'reading' || variant === 'writing' || variant === 'speaking' || variant === 'skills'
      ? variant
      : 'reading';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong ${className}`}
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-hidden="true"
    >
      {character === 'seal' ? (
        <SealMascot pose={sealPose} size={Math.round(size * 0.92)} animate={false} />
      ) : (
        <HedgehogMascot
          pose={variant === 'vocab' ? 'vocab' : variant === 'mistakes' ? 'mistakes' : 'journal'}
          size={Math.round(size * 0.92)}
          animate={false}
        />
      )}
    </span>
  );
}

/**
 * Friendly loading placeholder while data is being fetched.
 * Fades in after ~0.3s to prevent flicker on fast loads.
 */
export function MascotLoading({
  character = 'seal',
  label = 'Getting things ready…',
  className = 'h-96',
}: {
  character?: 'seal' | 'hedgehog';
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" className={`mascot-fade-in flex flex-col items-center justify-center gap-2 ${className}`}>
      {character === 'seal' ? <SealMascot pose="reading" size={84} /> : <HedgehogMascot pose="journal" size={84} />}
      <div className="flex items-center gap-1.5 text-sm text-muted">
        {label}
        <span className="m-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
