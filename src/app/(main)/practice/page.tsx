import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getIndex } from '@/lib/content';
import Library from '@/components/Library';

export const metadata: Metadata = { title: 'Practice' };

export default async function PracticePage() {
  await connection(); // đọc mục lục mỗi lần mở, để đề mới thêm vào hiện ngay
  const index = await getIndex();
  return <Library index={index} />;
}
