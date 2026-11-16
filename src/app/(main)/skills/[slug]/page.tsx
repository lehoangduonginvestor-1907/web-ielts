import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getDrillGroups, getLesson } from '@/lib/learn';
import { drillsOf, findLesson } from '@/lib/skills';
import LessonView from '@/components/learn/LessonView';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const lesson = findLesson((await params).slug);
  return lesson ? { title: lesson.title } : {};
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const lesson = findLesson(slug);
  if (!lesson) notFound();
  await connection();
  const [blocks, drills] = await Promise.all([getLesson(slug), getDrillGroups()]);
  return <LessonView key={slug} lesson={lesson} blocks={blocks} drills={drillsOf(drills, lesson)} />;
}
