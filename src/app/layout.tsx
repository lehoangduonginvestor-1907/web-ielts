import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Literata } from 'next/font/google';
import CelebrationToast from '@/components/CelebrationToast';
import ReminderManager from '@/components/ReminderManager';
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
  title: { default: 'SealIELTS — IELTS Self-Study', template: '%s · SealIELTS' },
  description: 'Practice IELTS Reading, Listening, Writing, and Speaking with Cambridge tests, detailed explanations, spaced-repetition vocabulary, and daily study habits.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#faf5ee',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${ui.variable} ${read.variable}`}>
      <body className="antialiased">
        {children}
        <CelebrationToast />
        <ReminderManager />
      </body>
    </html>
  );
}
