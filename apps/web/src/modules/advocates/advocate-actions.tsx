'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

type Education = { level: string; institution: string; year?: string };

export type AdvocateActionRow = {
  id: string;
  fullName: string;
  address: string;
  phone: string;
  bankName: string | null;
  bankAccount: string;
  licenseNumber: string | null;
  education: unknown;
};

/** Ubah dan Hapus data advokat. Pendidikan ke-2 dan seterusnya, serta pelatihan, dibiarkan utuh. */
export function AdvocateActions({
  row,
  canEdit,
  canDelete,
}: {
  row: AdvocateActionRow;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);
  const education = Array.isArray(row.education) ? (row.education as Education[]) : [];
  const first = education[0];
  const id = `ea-${row.id}`;

  async function call(method: 'PATCH' | 'DELETE', body?: unknown) {
    const res = await fetch(`/api/v1/advocates/${row.id}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal memproses data advokat');
    setMode(null);
    router.refresh();
  }

  async function save(formData: FormData) {
    const text = (k: string) => String(formData.get(k) ?? '').trim();
    const year = text('eduYear');
    const head: Education = {
      level: text('eduLevel'),
      institution: text('eduInstitution'),
      ...(year ? { year } : {}),
    };
    await call('PATCH', {
      fullName: text('fullName'),
      address: text('address'),
      phone: text('phone'),
      bankName: text('bankName') || null,
      bankAccount: text('bankAccount'),
      licenseNumber: text('licenseNumber') || null,
      education: [head, ...education.slice(1)],
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
        <FormDialog open onClose={() => setMode(null)} title="Ubah data advokat" onSubmit={save}>
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
            <label htmlFor={`${id}-address`} className={labelClass}>
              Alamat
            </label>
            <textarea
              id={`${id}-address`}
              name="address"
              rows={2}
              required
              defaultValue={row.address}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={labelClass}>
              Telepon
            </label>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              required
              defaultValue={row.phone}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-bankName`} className={labelClass}>
              Nama bank
            </label>
            <input
              id={`${id}-bankName`}
              name="bankName"
              defaultValue={row.bankName ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-bankAccount`} className={labelClass}>
              Nomor rekening
            </label>
            <input
              id={`${id}-bankAccount`}
              name="bankAccount"
              required
              defaultValue={row.bankAccount}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-license`} className={labelClass}>
              Nomor lisensi
            </label>
            <input
              id={`${id}-license`}
              name="licenseNumber"
              defaultValue={row.licenseNumber ?? ''}
              className={inputClass}
            />
          </div>
          <fieldset className="border border-navy-200 p-3">
            <legend className={labelClass}>Pendidikan utama</legend>
            <div className="flex flex-col gap-2">
              <input
                name="eduLevel"
                placeholder="Jenjang (S1, S2, dll)"
                required
                defaultValue={first?.level ?? ''}
                aria-label="Jenjang"
                className={inputClass}
              />
              <input
                name="eduInstitution"
                placeholder="Institusi"
                required
                defaultValue={first?.institution ?? ''}
                aria-label="Institusi"
                className={inputClass}
              />
              <input
                name="eduYear"
                placeholder="Tahun (opsional)"
                defaultValue={first?.year ?? ''}
                aria-label="Tahun"
                className={inputClass}
              />
            </div>
          </fieldset>
        </FormDialog>
      ) : null}

      {canDelete && mode === 'delete' ? (
        <FormDialog
          open
          onClose={() => setMode(null)}
          title="Hapus data advokat?"
          description={`${row.fullName} akan dihapus permanen dan tidak bisa dikembalikan.`}
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
