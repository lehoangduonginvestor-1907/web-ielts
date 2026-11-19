import Link from 'next/link';
import { HedgehogMascot, SealMascot } from '@/components/Mascots';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex items-end">
        <SealMascot pose="encourage" size={108} />
        <HedgehogMascot pose="vocab" size={108} className="-ml-4" />
      </div>
      <p className="eyebrow mt-4">Error 404</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold">Oops, where did this page hide?</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-2">
        Hedgehog looked everywhere with a magnifying glass and couldn&apos;t find it. Seal suggests heading back to the home page to keep studying!
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to Today
      </Link>
    </main>
  );
}
