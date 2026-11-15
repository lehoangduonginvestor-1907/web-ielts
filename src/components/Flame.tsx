// Ngọn lửa streak: vẽ tay bằng SVG, tắt (xám) khi hôm nay chưa học
export function Flame({ lit = true, size = 24, frozen = false }: { lit?: boolean; size?: number; frozen?: boolean }) {
  const outer = frozen ? '#7fb3d5' : lit ? '#e0561b' : '#cfc6b3';
  const inner = frozen ? '#d6ebf7' : lit ? '#f7b538' : '#ede7da';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.2 2.5c.4 2.6-.9 4.2-2.3 5.8C8.3 10 6.6 11.9 6.6 14.9 6.6 18.6 9 21.5 12 21.5s5.4-2.6 5.4-6.3c0-2.5-1.1-4.2-2.2-5.4-.2 1.4-.9 2.4-1.9 2.9.4-3.5-.5-7.1-1.1-10.2Z"
        fill={outer}
      />
      <path
        d="M12.1 12.2c.1 1.4-.6 2.1-1.3 2.9-.6.7-1.2 1.4-1.2 2.6 0 1.6 1.1 2.8 2.4 2.8 1.4 0 2.5-1.2 2.5-2.9 0-1.9-1.2-3.4-2.4-5.4Z"
        fill={inner}
      />
    </svg>
  );
}
