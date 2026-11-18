import MascotBuddy from '@/components/MascotBuddy';
import Nav from '@/components/Nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="min-h-dvh pb-24 lg:pb-0 lg:pl-56">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>
      <MascotBuddy />
    </>
  );
}
