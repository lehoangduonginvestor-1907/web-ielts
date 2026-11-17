import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { authEnabled } from '@/lib/auth';
import { getIndex } from '@/lib/content';
import { loadProgress } from '@/lib/progressFile';
import { currentRole } from '@/lib/session';
import Coach from '@/components/Coach';

export const metadata: Metadata = { title: 'Người kèm' };

// Trang chỉ đọc cho người kèm. Khi có khoá mã thì chỉ mã người kèm mới vào được.
export default async function CoachPage() {
  await connection();
  if (authEnabled() && (await currentRole()) !== 'coach') redirect('/login');
  const [saved, index] = await Promise.all([loadProgress(), getIndex()]);
  return <Coach store={saved?.store ?? null} index={index} />;
}
