import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { authEnabled } from '@/lib/auth';
import { getIndex } from '@/lib/content';
import { loadProgress } from '@/lib/progressFile';
import { currentRole } from '@/lib/session';
import Coach from '@/components/Coach';

export const metadata: Metadata = { title: 'Coach' };

// Read-only dashboard for the coach. When access codes are enabled, only the coach code can enter.
export default async function CoachPage() {
  await connection();
  if (authEnabled() && (await currentRole()) !== 'coach') redirect('/login');
  const [saved, index] = await Promise.all([loadProgress(), getIndex()]);
  return <Coach store={saved?.store ?? null} index={index} />;
}
