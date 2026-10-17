'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300';
  return (
    <div className="card-surface p-7 sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-navy-800">Masuk</h1>
      <p className="mb-6 mt-1 text-sm text-navy-400">
        Gunakan email &amp; password akun kantor Anda.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email" required>
            Email
          </Label>
          <div className="relative">
            <Mail aria-hidden="true" size={15} className={iconClass} />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nama@ekasatra.id"
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="password" required>
            Password
          </Label>
          <div className="relative">
            <Lock aria-hidden="true" size={15} className={iconClass} />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${inputClass} pl-10 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
              className="absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-control text-navy-400 hover:bg-navy-100 hover:text-navy-700"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" size={16} />
              ) : (
                <Eye aria-hidden="true" size={16} />
              )}
            </button>
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger-fg">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full py-3`}>
          <LogIn aria-hidden="true" size={15} />
          {pending ? 'Memproses' : 'Masuk'}
        </button>
      </form>
      <p className="mt-6 flex items-center gap-2 border-t border-navy-50 pt-5 text-[11px] text-navy-400">
        <ShieldCheck aria-hidden="true" size={15} className="shrink-0 text-gold-500" />
        Aktivitas masuk dan perubahan data tercatat di Audit Log.
      </p>
    </div>
  );
}
