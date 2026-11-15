import type { Metadata } from 'next';
import VocabHome from '@/components/vocab/VocabHome';

export const metadata: Metadata = { title: 'Từ vựng' };

export default function VocabPage() {
  return <VocabHome />;
}
