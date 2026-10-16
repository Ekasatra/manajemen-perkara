'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { CASE_STATUS } from '@ekasatra/shared';
import { CASE_TYPES } from './constants';

export type PartyOption = { id: string; label: string };

export type CaseActionRow = {
  id: string;
  title: string;
  clientId: string;
  opponentId: string | null;
  caseNumber: string | null;
  court: string | null;
  caseType: string | null;
  description: string | null;
  startDate: string | null;
  status: string;
};

/**
 * Ubah dan Hapus perkara di kepala detail. Daftar klien/lawan hanya dikirim server bila user
 * boleh membacanya (`null` = field disembunyikan dan tidak ikut dikirim ke API).
 */
export function CaseActions({
  row,
  clientOptions,
  opponentOptions,
  canEdit,
  canDelete,
}: {
  row: CaseActionRow;
  clientOptions: PartyOption[] | null;
  opponentOptions: PartyOption[] | null;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'delete' | 'status' | null>(null);

  async function call(method: 'PATCH' | 'DELETE', body?: unknown) {
    const res = await fetch(`/api/v1/cases/${row.id}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal memproses perkara');
    setMode(null);
    if (method === 'DELETE') router.push('/cases');
    router.refresh();
  }

  async function changeStatus(formData: FormData) {
    const status = String(formData.get('status') ?? '');
    if (status === row.status) throw new Error('Status sama dengan status saat ini');
    const res = await fetch(`/api/v1/cases/${row.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal mengubah status');
    setMode(null);
    router.refresh();
  }

  async function save(formData: FormData) {
    const text = (k: string) => String(formData.get(k) ?? '').trim();
    const body: Record<string, unknown> = {
      title: text('title'),
      caseNumber: text('caseNumber') || null,
      court: text('court') || null,
      caseType: text('caseType') || null,
      description: text('description') || null,
      startDate: text('startDate') || null,
    };
    if (clientOptions) body.clientId = text('clientId');
    if (opponentOptions) body.opponentId = text('opponentId') || null;
    await call('PATCH', body);
  }

  return (
    <>
      {canEdit ? (
        <button type="button" onClick={() => setMode('status')} className={buttonClass.gold}>
          Ubah Status
        </button>
      ) : null}
      {canEdit ? (
        <button type="button" onClick={() => setMode('edit')} className={buttonClass.secondary}>
          Edit
        </button>
      ) : null}
      <a
        href={`/api/v1/cases/${row.id}/export`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass.secondary}
      >
        Laporan Progress
      </a>
      {canDelete ? (
        <button
          type="button"
          onClick={() => setMode('delete')}
          className={`${buttonClass.secondary} text-danger-fg`}
        >
          Hapus
        </button>
      ) : null}

      {canEdit && mode === 'status' ? (
        <FormDialog
          open
          onClose={() => setMode(null)}
          title="Ubah Status Perkara"
          description="Aktif → Putus → Banding → Kasasi → PK → Selesai. Tanggal putus, batas upaya hukum, dan entri timeline diperbarui otomatis."
          submitLabel="Simpan Status"
          onSubmit={changeStatus}
        >
          <div>
            <label htmlFor="st-status" className={labelClass}>
              Status Baru
            </label>
            <select id="st-status" name="status" defaultValue={row.status} className={inputClass}>
              {CASE_STATUS.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </div>
        </FormDialog>
      ) : null}

      {canEdit && mode === 'edit' ? (
        <FormDialog open onClose={() => setMode(null)} title="Ubah perkara" onSubmit={save}>
          <div>
            <label htmlFor="ec-title" className={labelClass}>
              Judul
            </label>
            <input
              id="ec-title"
              name="title"
              required
              defaultValue={row.title}
              className={inputClass}
            />
          </div>
          {clientOptions ? (
            <div>
              <label htmlFor="ec-client" className={labelClass}>
                Klien
              </label>
              <select
                id="ec-client"
                name="clientId"
                required
                defaultValue={row.clientId}
                className={inputClass}
              >
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {opponentOptions ? (
            <div>
              <label htmlFor="ec-opponent" className={labelClass}>
                Pihak lawan
              </label>
              <select
                id="ec-opponent"
                name="opponentId"
                defaultValue={row.opponentId ?? ''}
                className={inputClass}
              >
                <option value="">Tanpa pihak lawan</option>
                {opponentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label htmlFor="ec-number" className={labelClass}>
              No. perkara (pengadilan)
            </label>
            <input
              id="ec-number"
              name="caseNumber"
              defaultValue={row.caseNumber ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ec-court" className={labelClass}>
              Pengadilan
            </label>
            <input
              id="ec-court"
              name="court"
              defaultValue={row.court ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ec-type" className={labelClass}>
              Jenis perkara
            </label>
            <select
              id="ec-type"
              name="caseType"
              defaultValue={row.caseType ?? ''}
              className={inputClass}
            >
              <option value="">Pilih jenis</option>
              {row.caseType && !(CASE_TYPES as readonly string[]).includes(row.caseType) ? (
                <option>{row.caseType}</option>
              ) : null}
              {CASE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ec-start" className={labelClass}>
              Tanggal mulai
            </label>
            <input
              id="ec-start"
              name="startDate"
              type="date"
              defaultValue={row.startDate ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ec-desc" className={labelClass}>
              Keterangan
            </label>
            <textarea
              id="ec-desc"
              name="description"
              rows={2}
              defaultValue={row.description ?? ''}
              className={inputClass}
            />
          </div>
        </FormDialog>
      ) : null}

      {canDelete && mode === 'delete' ? (
        <FormDialog
          open
          onClose={() => setMode(null)}
          title="Hapus perkara?"
          description={`${row.title} akan dihapus permanen beserta timeline, jadwal, dan dokumennya.`}
          submitLabel="Hapus"
          destructive
          onSubmit={() => call('DELETE')}
        >
          <p className="text-sm text-navy-600">
            Perkara yang masih punya invoice atau surat keluar akan ditolak. Tindakan ini tercatat
            di Audit Log.
          </p>
        </FormDialog>
      ) : null}
    </>
  );
}
