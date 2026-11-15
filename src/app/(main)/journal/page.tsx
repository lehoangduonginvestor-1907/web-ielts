import type { Metadata } from 'next';
import Journal from '@/components/Journal';

export const metadata: Metadata = { title: 'Nhật ký' };

export default function JournalPage() {
  return <Journal />;
}
