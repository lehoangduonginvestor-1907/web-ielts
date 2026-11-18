import { notFound } from 'next/navigation';
import { findWritingPrompt } from '@/lib/writingPrompts';
import WritingRoom from '@/components/writing/WritingRoom';

export default async function WritingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { id } = await params;
  const { attempt } = await searchParams;
  const prompt = findWritingPrompt(id);
  if (!prompt) notFound();

  return <WritingRoom prompt={prompt} attemptId={attempt} />;
}
