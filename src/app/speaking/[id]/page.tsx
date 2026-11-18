import { notFound } from 'next/navigation';
import { findSpeakingTopic } from '@/lib/speakingTopics';
import SpeakingRoom from '@/components/speaking/SpeakingRoom';

export default async function SpeakingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { id } = await params;
  const { attempt } = await searchParams;
  const topic = findSpeakingTopic(id);
  if (!topic) notFound();

  return <SpeakingRoom topic={topic} attemptId={attempt} />;
}
