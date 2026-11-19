import type { Metadata } from 'next';
import VocabHome from '@/components/vocab/VocabHome';

export const metadata: Metadata = { title: 'Vocabulary' };

export default function VocabPage() {
  return <VocabHome />;
}
