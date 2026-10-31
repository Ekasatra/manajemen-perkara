'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { Label } from '@/components/ui/field';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

type Education = { level: string; institution: string; year?: string };

export type AdvocateActionRow = {
  id: string;
  fullName: string;
  kind?: string;
  email?: string | null;
  address: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccount: string | null;
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
    // Pendidikan utama kosong = belum diisi (data belum lengkap), bukan error.
    const head: Education[] =
      text('eduLevel') && text('eduInstitution')
        ? [
            {
              level: text('eduLevel'),
              institution: text('eduInstitution'),
              ...(year ? { year } : {}),
            },
          ]
        : [];
    await call('PATCH', {
      fullName: text('fullName'),
      address: text('address'),
      phone: text('phone'),
      bankName: text('bankName') || null,
      bankAccount: text('bankAccount'),
      licenseNumber: text('licenseNumber') || null,
      education: [...head, ...education.slice(1)],
    });
  }

  return (
    <div className="flex gap-[12px]">
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
        <FormDialog
          open
          onClose={() => setMode(null)}
          title={`Ubah data ${(row.kind ?? 'Advokat').toLowerCase()}`}
          description="Nama dan email berasal dari akun. Lengkapi sisanya agar status menjadi Lengkap."
          onSubmit={save}
        >
          <div>
            <Label htmlFor={`${id}-email`} optional>
              Email akun
            </Label>
            <input
              id={`${id}-email`}
              value={row.email ?? ''}
              readOnly
              aria-describedby={`${id}-email-hint`}
              className={inputClass}
            />
            <p id={`${id}-email-hint`} className="mt-1 text-xs text-navy-400">
              Email hanya bisa diubah di Manajemen User.
            </p>
          </div>
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
            <Label htmlFor={`${id}-address`} optional>
              Alamat
            </Label>
            <textarea
              id={`${id}-address`}
              name="address"
              rows={2}
              defaultValue={row.address ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-phone`} optional>
              Telepon
            </Label>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              defaultValue={row.phone ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-bankName`} optional>
              Nama bank
            </Label>
            <input
              id={`${id}-bankName`}
              name="bankName"
              defaultValue={row.bankName ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-bankAccount`} optional>
              Nomor rekening
            </Label>
            <input
              id={`${id}-bankAccount`}
              name="bankAccount"
              defaultValue={row.bankAccount ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-license`} optional>
              Nomor lisensi
            </Label>
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
                defaultValue={first?.level ?? ''}
                aria-label="Jenjang"
                className={inputClass}
              />
              <input
                name="eduInstitution"
                placeholder="Institusi"
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
          title={`Hapus data ${(row.kind ?? 'Advokat').toLowerCase()}?`}
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
