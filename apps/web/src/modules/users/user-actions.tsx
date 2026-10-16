'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { useToast } from '@/shell/toast';

/** Password acak 12 karakter tanpa huruf yang mudah tertukar (I, l, O, 0, 1). */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export type UserRow = { id: string; fullName: string; role: string; isActive: boolean };

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
  const [mode, setMode] = useState<'edit' | 'delete' | 'password' | null>(null);
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

  async function save(formData: FormData) {
    await call('PATCH', {
      fullName: String(formData.get('fullName') ?? '').trim(),
      role: String(formData.get('role')),
      isActive: formData.get('isActive') === 'on',
    });
  }

  return (
    <div className="flex gap-1">
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
            <label htmlFor={`${id}-name`} className={labelClass}>
              Nama lengkap
            </label>
            <input
              id={`${id}-name`}
              name="fullName"
              required
              defaultValue={row.fullName}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-role`} className={labelClass}>
              Role
            </label>
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
          onClose={() => setMode(null)}
          title="Reset Password"
          description={row.fullName}
          submitLabel="Reset"
          onSubmit={resetPassword}
        >
          <div>
            <label htmlFor={`${id}-pw`} className={labelClass}>
              Password baru
            </label>
            <input
              id={`${id}-pw`}
              name="password"
              required
              minLength={8}
              autoComplete="off"
              defaultValue={generatePassword()}
              className={`${inputClass} font-mono`}
            />
            <p className="mt-1.5 text-[11px] text-navy-400">
              Sampaikan password ini kepada pengguna secara pribadi. Tindakan tercatat di Audit Log.
            </p>
          </div>
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
