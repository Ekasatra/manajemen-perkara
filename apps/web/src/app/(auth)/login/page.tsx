'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error?.message ?? 'Login gagal');
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-md border border-navy-200 bg-white p-8 shadow-sm">
      <h1 className="font-display text-3xl font-semibold text-navy-700">eKaSatra</h1>
      <p className="mt-1 text-sm text-navy-400">Masuk untuk mengelola perkara</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-navy-400">
        Belum ada akun?{' '}
        <Link href="/setup" className="text-navy-600 underline hover:text-navy-700">
          Setup Admin pertama
        </Link>
      </p>
    </div>
  );
}
