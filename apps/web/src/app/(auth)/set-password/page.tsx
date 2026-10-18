'use client';

import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Label } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';

const INVALID_LINK = 'Link tidak valid atau sudah kedaluwarsa. Minta link baru ke admin.';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Token sudah ditukar jadi sesi — percobaan ulang (mis. password ditolak) tidak verifikasi lagi.
  const [verified, setVerified] = useState(false);

  // Link email: /set-password?token_hash=…&type=recovery (lihat sendResetLink).
  const tokenHash = searchParams.get('token_hash');
  const linkOk = Boolean(tokenHash) && searchParams.get('type') === 'recovery';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!tokenHash) return;
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');
    if (password !== confirm) {
      setError('Password dan konfirmasi tidak sama.');
      setPending(false);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      // Token sekali pakai baru diverifikasi saat tombol ditekan, bukan saat halaman dimuat,
      // agar pemindai email yang membuka link duluan tidak menghabiskannya.
      if (!verified) {
        const { error: otpErr } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
        if (otpErr) {
          setError(INVALID_LINK);
          return;
        }
        setVerified(true);
      }
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw new Error(pwErr.message);
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menetapkan password');
    } finally {
      setPending(false);
    }
  }

  const displayError = error ?? (linkOk ? null : INVALID_LINK);

  const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300';
  return (
    <div className="card-surface p-7 sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-navy-800">Tetapkan Password</h1>
      <p className="mb-6 mt-1 text-sm text-navy-400">
        Pilih password baru untuk akun Anda. Password minimal 8 karakter.
      </p>
      {displayError ? (
        <p role="alert" className="mb-4 rounded-control bg-danger-bg p-3 text-sm text-danger-fg">
          {displayError}
        </p>
      ) : null}
      {linkOk ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="password" required>
              Password baru
            </Label>
            <div className="relative">
              <Lock aria-hidden="true" size={15} className={iconClass} />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`${inputClass} pl-10 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                className="absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-control text-navy-400 hover:bg-navy-100 hover:text-navy-700"
              >
                {showPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm" required>
              Konfirmasi password
            </Label>
            <div className="relative">
              <Lock aria-hidden="true" size={15} className={iconClass} />
              <input
                id="confirm"
                name="confirm"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>
          <button type="submit" disabled={pending} className={`${buttonClass.primary} w-full py-3`}>
            {pending ? 'Menyimpan…' : 'Simpan Password Baru'}
          </button>
        </form>
      ) : null}
      <p className="mt-6 flex items-center gap-2 border-t border-navy-50 pt-5 text-[11px] text-navy-400">
        <ShieldCheck aria-hidden="true" size={15} className="shrink-0 text-gold-500" />
        Link bersifat sekali pakai dan berlaku 1 jam.
      </p>
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense agar halaman bisa diprerender saat build.
export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
