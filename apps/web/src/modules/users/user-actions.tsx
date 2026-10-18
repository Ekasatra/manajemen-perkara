'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { FormDialog } from '@/components/ui/form-dialog';
import { FieldError, Label } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { useToast } from '@/shell/toast';
import { resetPasswordSchema } from '@ekasatra/shared';

/** Password acak 12 karakter tanpa huruf yang mudah tertukar (I, l, O, 0, 1). */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export type UserRow = { id: string; fullName: string; role: string; isActive: boolean; email?: string };

/** Sembunyikan email: "an***@domain.com". */
function maskEmail(email: string | undefined): string {
  if (!email) return '—';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email.slice(0, 2)}***${email.slice(at)}`;
}

/** Ubah dan Hapus pengguna. Akun Superadmin hanya dapat diubah Superadmin dan tidak dapat dihapus. */
export function UserActions({
  row,
  canEdit,
  canDelete,
}: {
  row: UserRow;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'delete' | 'password' | 'resetLink' | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const toast = useToast();
  const id = `eu-${row.id}`;

  async function call(method: 'PATCH' | 'DELETE', body?: unknown) {
    const res = await fetch(`/api/v1/users/${row.id}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal memproses pengguna');
    setMode(null);
    router.refresh();
  }

  async function resetPassword(formData: FormData) {
    const res = await fetch(`/api/v1/users/${row.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: String(formData.get('password') ?? '') }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal mereset password');
    setMode(null);
    toast.show('Password direset. Sampaikan kepada pengguna secara pribadi.');
  }

  async function sendResetLink() {
    setResetLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${row.id}/reset-link`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error?.message ?? 'Gagal mengirim link reset');
      setMode(null);
      toast.show(`Link reset dikirim ke ${data.data?.maskedEmail ?? 'email user'}.`);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Gagal mengirim link reset', 'error');
    } finally {
      setResetLoading(false);
    }
  }

  async function save(formData: FormData) {
    await call('PATCH', {
      fullName: String(formData.get('fullName') ?? '').trim(),
      role: String(formData.get('role')),
      isActive: formData.get('isActive') === 'on',
    });
  }

  return (
    <div className="flex gap-[12px]">
      {canEdit ? (
        <button type="button" onClick={() => setMode('edit')} className={buttonClass.ghost}>
          Ubah
        </button>
      ) : null}
      {canEdit ? (
        <button type="button" onClick={() => setMode('password')} className={buttonClass.ghost}>
          Reset Password
        </button>
      ) : null}
      {canEdit && row.email ? (
        <button type="button" onClick={() => setMode('resetLink')} className={buttonClass.ghost}>
          Kirim Link Reset
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={() => setMode('delete')}
          className={`${buttonClass.ghost} text-danger-fg`}
        >
          Hapus
        </button>
      ) : null}

      {canEdit && mode === 'edit' ? (
        <FormDialog open onClose={() => setMode(null)} title="Ubah pengguna" onSubmit={save}>
          <div>
            <Label htmlFor={`${id}-name`} optional>
              Nama lengkap
            </Label>
            <input
              id={`${id}-name`}
              name="fullName"
              defaultValue={row.fullName}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-role`} optional>
              Role
            </Label>
            {row.role === 'SuperAdmin' ? (
              <input id={`${id}-role`} value="Super Admin" disabled className={inputClass} />
            ) : (
              <select id={`${id}-role`} name="role" defaultValue={row.role} className={inputClass}>
                <option value="Admin">Admin</option>
                <option value="Advokat">Advokat</option>
                <option value="Paralegal">Paralegal</option>
              </select>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-800">
            <input type="checkbox" name="isActive" defaultChecked={row.isActive} />
            Akun aktif
          </label>
        </FormDialog>
      ) : null}

      {canEdit && mode === 'password' ? (
        <FormDialog
          open
          onClose={() => { setMode(null); setShowPw(false); }}
          title="Reset Password"
          description={row.fullName}
          submitLabel="Reset"
          schema={resetPasswordSchema}
          onSubmit={resetPassword}
        >
          <div>
            <Label htmlFor={`${id}-pw`} required>
              Password baru
            </Label>
            <div className="relative">
              <input
                id={`${id}-pw`}
                name="password"
                required
                minLength={8}
                autoComplete="off"
                type={showPw ? 'text' : 'password'}
                aria-describedby="err-password"
                defaultValue={generatePassword()}
                className={`${inputClass} font-mono pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError name="password" />
            <p className="mt-1.5 text-[11px] text-navy-400">
              Sampaikan password ini kepada pengguna secara pribadi. Tindakan tercatat di Audit Log.
            </p>
          </div>
        </FormDialog>
      ) : null}

      {canEdit && mode === 'resetLink' ? (
        <FormDialog
          open
          onClose={() => setMode(null)}
          title="Kirim Link Reset?"
          description={row.email ? maskEmail(row.email) : ''}
          submitLabel={resetLoading ? 'Mengirim…' : 'Kirim'}
          onSubmit={sendResetLink}
        >
          <p className="text-sm text-navy-600">
            Link reset akan dikirim ke email terdaftar pengguna. Link berlaku 1 jam dan hanya
            bisa dipakai sekali. Tindakan tercatat di Audit Log.
          </p>
        </FormDialog>
      ) : null}

      {canDelete && mode === 'delete' ? (
        <FormDialog
          open
          onClose={() => setMode(null)}
          title="Hapus pengguna?"
          description={`${row.fullName} akan dihapus permanen beserta akses loginnya.`}
          submitLabel="Hapus"
          destructive
          onSubmit={() => call('DELETE')}
        >
          <p className="text-sm text-navy-600">Tindakan ini tercatat di Audit Log.</p>
        </FormDialog>
      ) : null}
    </div>
  );
}
