'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { APP_NAME, Brand } from '@/components/ui/brand';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

export function SetupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/v1/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
          fullName: String(formData.get('fullName') ?? ''),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error?.message ?? 'Setup gagal');
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup gagal');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-card border border-navy-200 bg-white p-8">
      <Brand variant="compact" className="text-navy-400" />
      <h1 className="mt-2 text-title font-semibold text-navy-700">Setup Admin</h1>
      <div aria-hidden="true" className="mt-3">
        <div className="h-px w-full bg-gold-500" />
        <div className="mt-0.5 h-px w-16 bg-gold-500" />
      </div>
      <p className="mt-3 text-sm text-navy-400">
        Buat akun Admin pertama untuk mulai menggunakan {APP_NAME}.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Nama Lengkap
          </label>
          <input id="fullName" name="fullName" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-navy-400">Minimal 8 karakter.</p>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger-fg">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? 'Memproses…' : 'Buat Admin'}
        </button>
      </form>
    </div>
  );
}
