import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getDrillGroups, writtenLessons } from '@/lib/learn';
import Skills from '@/components/Skills';

export const metadata: Metadata = { title: 'Kỹ năng' };

export default async function SkillsPage() {
  await connection(); // kho luyện đọc từ content/ mỗi lần mở
  const [written, drills] = await Promise.all([writtenLessons(), getDrillGroups()]);
  return <Skills written={written} drills={drills} />;
}
