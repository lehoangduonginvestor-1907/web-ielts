import type { Metadata } from 'next';
import ReviewSession from '@/components/vocab/ReviewSession';

export const metadata: Metadata = { title: 'Ôn từ' };

export default function VocabReviewPage() {
  return <ReviewSession />;
}
