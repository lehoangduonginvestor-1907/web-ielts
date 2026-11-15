import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Literata } from 'next/font/google';
import './globals.css';

const ui = Be_Vietnam_Pro({
  variable: '--font-ui',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

const read = Literata({
  variable: '--font-read',
  subsets: ['latin', 'vietnamese'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: { default: 'đều. — tự học IELTS', template: '%s · đều.' },
  description: 'Luyện Reading & Listening trên đề Cambridge, giải thích từng câu, ôn từ vựng và giữ nhịp học mỗi ngày.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#f5f1e8',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${ui.variable} ${read.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
