'use client';

import { useState } from 'react';
import { Logo } from '@/components/Nav';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      if (!r.ok) {
        setError('Mã chưa đúng. Thử lại nhé.');
        return;
      }
      const { role } = (await r.json()) as { role: string };
      window.location.assign(role === 'coach' ? '/coach' : '/');
    } catch {
      setError('Không kết nối được máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 sm:p-8">
        <Logo />
        <h1 className="mt-6 font-serif text-2xl font-semibold">Nhập mã vào cửa</h1>
        <p className="mt-1 text-sm text-muted">App này dành riêng cho một người học. Mã do người kèm đưa cho bạn.</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          aria-label="Mã vào cửa"
          className="field mt-5"
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        <button type="submit" className="btn-primary mt-4 w-full" disabled={busy || !code.trim()}>
          {busy ? 'Đang kiểm tra…' : 'Vào học'}
        </button>
      </form>
    </div>
  );
}
