'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brand } from '@/components/ui/brand';
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
    <div className="rounded-card border border-navy-200 bg-surface p-8">
      <h1 className="text-title font-semibold text-navy-700">
        <Brand />
      </h1>
      <div aria-hidden="true" className="mt-3">
        <div className="h-px w-full bg-gold-500" />
        <div className="mt-0.5 h-px w-16 bg-gold-500" />
      </div>
      <p className="mt-3 text-sm text-navy-400">
        Sistem administrasi dan manajemen perkara hukum. Masuk dengan akun yang didaftarkan Admin.
      </p>
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
          <p role="alert" className="text-sm text-danger-fg">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? 'Memproses' : 'Masuk'}
        </button>
      </form>
      <p className="mt-6 border-t border-navy-100 pt-4 text-xs text-navy-400">
        Akses khusus staf terdaftar. Aktivitas masuk dan perubahan data tercatat di Audit Log.
      </p>
      <p className="mt-4 text-center text-sm text-navy-400">
        Belum ada akun?{' '}
        <Link href="/setup" className="text-navy-600 underline hover:text-navy-700">
          Setup Admin pertama
        </Link>
      </p>
    </div>
  );
}
