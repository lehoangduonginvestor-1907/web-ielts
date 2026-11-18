'use client';

import { useEffect } from 'react';
import { HedgehogMascot } from '@/components/Mascots';

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <HedgehogMascot pose="mistakes" size={104} />
      <h1 className="mt-4 font-serif text-2xl font-semibold">Úi, có gì đó trục trặc rồi</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-2">
        Nhím đã ghi lỗi này vào sổ. Dữ liệu học của bạn vẫn an toàn — thử tải lại phần này xem sao nhé.
      </p>
      <button type="button" onClick={() => retry()} className="btn-primary mt-6">
        Thử lại
      </button>
    </div>
  );
}
