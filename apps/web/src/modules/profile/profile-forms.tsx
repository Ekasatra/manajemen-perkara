'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Save, UserRound } from 'lucide-react';
import { Label } from '@/components/ui/field';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { useToast } from '@/shell/toast';

type Initial = {
  fullName: string;
  emailApproval: boolean;
  emailReminder: boolean;
  emailDisposisi: boolean;
};

async function send(url: string, method: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message ?? 'Gagal menyimpan. Coba lagi.');
}

const PREFS = [
  ['emailApproval', 'Email saat ada surat menunggu persetujuan saya'],
  ['emailDisposisi', 'Email saat ada disposisi surat masuk untuk saya'],
  ['emailReminder', 'Email pengingat sidang dan tenggat'],
] as const;

export function ProfileForms({
  email,
  roleLabel,
  initial,
}: {
  email: string;
  roleLabel: string;
  initial: Initial;
}) {
  const router = useRouter();
  const toast = useToast();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'profile' | 'pw' | null>(null);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy('profile');
    setProfileError(null);
    try {
      await send('/api/v1/auth/profile', 'PATCH', {
        fullName: String(fd.get('fullName') ?? ''),
        emailApproval: fd.get('emailApproval') === 'on',
        emailReminder: fd.get('emailReminder') === 'on',
        emailDisposisi: fd.get('emailDisposisi') === 'on',
      });
      toast.show('Profil disimpan.');
      router.refresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const next = String(fd.get('newPassword') ?? '');
    if (next !== String(fd.get('confirm') ?? '')) {
      setPwError('Konfirmasi password baru tidak sama.');
      return;
    }
    setBusy('pw');
    setPwError(null);
    try {
      await send('/api/v1/auth/change-password', 'POST', {
        currentPassword: String(fd.get('currentPassword') ?? ''),
        newPassword: next,
      });
      form.reset();
      toast.show('Password diganti.');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Gagal mengganti password.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="card-surface space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy-800">
          <UserRound aria-hidden="true" size={16} className="text-gold-500" /> Data Diri
        </h2>
        <div>
          <Label htmlFor="fullName" optional>
            Nama Lengkap
          </Label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={initial.fullName}
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              value={email}
              disabled
              readOnly
              className={`${inputClass} opacity-70`}
            />
          </div>
          <div>
            <Label htmlFor="role">Peran</Label>
            <input
              id="role"
              value={roleLabel}
              disabled
              readOnly
              className={`${inputClass} opacity-70`}
            />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className={labelClass}>Notifikasi Email</legend>
          {PREFS.map(([name, label]) => (
            <label key={name} className="flex items-center gap-3 text-sm text-navy-700">
              <input
                type="checkbox"
                name={name}
                defaultChecked={initial[name]}
                className="size-4 accent-gold-500"
              />
              {label}
            </label>
          ))}
        </fieldset>
        {profileError ? (
          <p role="alert" className="text-sm text-danger-fg">
            {profileError}
          </p>
        ) : null}
        <button type="submit" disabled={busy !== null} className={buttonClass.primary}>
          <Save aria-hidden="true" size={15} /> {busy === 'profile' ? 'Menyimpan' : 'Simpan Profil'}
        </button>
      </form>

      <form onSubmit={changePassword} className="card-surface space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy-800">
          <KeyRound aria-hidden="true" size={16} className="text-gold-500" /> Ganti Password
        </h2>
        <div>
          <Label htmlFor="currentPassword" required>
            Password Saat Ini
          </Label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="newPassword" required>
            Password Baru
          </Label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-navy-400">Minimal 8 karakter.</p>
        </div>
        <div>
          <Label htmlFor="confirm" required>
            Ulangi Password Baru
          </Label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
        {pwError ? (
          <p role="alert" className="text-sm text-danger-fg">
            {pwError}
          </p>
        ) : null}
        <button type="submit" disabled={busy !== null} className={buttonClass.gold}>
          <KeyRound aria-hidden="true" size={15} /> {busy === 'pw' ? 'Memproses' : 'Ganti Password'}
        </button>
      </form>
    </div>
  );
}
