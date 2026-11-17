// Ngọn lửa streak Sách Tranh: giữ lửa khi hôm nay có học, hoá khối băng khi dùng vé nghỉ, ngủ yên khi chưa học
export function Flame({ lit = true, size = 26, frozen = false }: { lit?: boolean; size?: number; frozen?: boolean }) {
  const ink = '#3b2e28';
  if (frozen) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <path
          d="M5 10 L14 4 L23 10 L23 20 L14 25 L5 20 Z"
          fill="#d6ebf7"
          stroke="#3b7ea8"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M5 10 L14 14 L23 10 M14 14 L14 25" fill="none" stroke="#85c1e9" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="11" cy="14" r="1.2" fill={ink} />
        <circle cx="17" cy="14" r="1.2" fill={ink} />
        <path d="M12.5 16.8 Q14 18 15.5 16.8" fill="none" stroke={ink} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  const outer = lit ? '#ec7457' : '#d8c5b4';
  const inner = lit ? '#f7b538' : '#f2e8dc';

  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path
        d="M14.3 3 C14.8 6.1 13.2 8 11.5 9.9 C9.6 12 7.6 14.3 7.6 17.8 C7.6 22.1 10.4 25.3 14 25.3 C17.6 25.3 20.4 22.3 20.4 17.9 C20.4 15 19.1 13 17.8 11.6 C17.5 13.2 16.7 14.4 15.5 15 C16 11 15 6.7 14.3 3 Z"
        fill={outer}
        stroke={ink}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.1 14.6 C14.2 16.2 13.4 17.1 12.6 18 C11.9 18.8 11.2 19.6 11.2 21 C11.2 22.9 12.5 24.3 14 24.3 C15.6 24.3 16.9 22.9 16.9 20.9 C16.9 18.7 15.5 16.9 14.1 14.6 Z"
        fill={inner}
      />
      {lit ? (
        <>
          <circle cx="12.2" cy="19.3" r="1" fill={ink} />
          <circle cx="15.8" cy="19.3" r="1" fill={ink} />
          <path d="M13 21.1 Q14 22.2 15 21.1" fill="none" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M11.3 19.5 Q12.2 20.3 13.1 19.5" fill="none" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M14.9 19.5 Q15.8 20.3 16.7 19.5" fill="none" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
