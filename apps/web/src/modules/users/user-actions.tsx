'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

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
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);
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
