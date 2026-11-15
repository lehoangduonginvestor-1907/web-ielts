import { connection } from 'next/server';
import { getIndex } from '@/lib/content';
import Today from '@/components/Today';

export default async function Home() {
  await connection(); // đọc mục lục mỗi lần mở, để đề mới thêm vào hiện ngay
  const index = await getIndex();
  return <Today index={index} />;
}
