import type { Metadata } from 'next';
import Mistakes from '@/components/Mistakes';

export const metadata: Metadata = { title: 'Sổ lỗi' };

export default function MistakesPage() {
  return <Mistakes />;
}
