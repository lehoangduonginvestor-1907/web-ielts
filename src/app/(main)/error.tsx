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
      <h1 className="mt-4 font-serif text-2xl font-semibold">Oops, something went wrong</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-2">
        Hedgehog logged this error in the notebook. Your study progress is safe—try reloading this section.
      </p>
      <button type="button" onClick={() => retry()} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
