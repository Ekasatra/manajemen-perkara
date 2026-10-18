'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { FieldError, Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { CASE_STATUS, changeCaseStatusSchema, updateCaseSchema } from '@ekasatra/shared';
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
  canSelesai,
}: {
  row: CaseActionRow;
  clientOptions: PartyOption[] | null;
  opponentOptions: PartyOption[] | null;
  canEdit: boolean;
  canDelete: boolean;
  canSelesai: boolean;
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
    const reason = String(formData.get('reason') ?? '').trim();
    if (status === row.status) throw new Error('Status sama dengan status saat ini');
    const res = await fetch(`/api/v1/cases/${row.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
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
          schema={changeCaseStatusSchema}
          onSubmit={changeStatus}
        >
          <div>
            <Label htmlFor="st-status" required>
              Status Baru
            </Label>
            <select
              id="st-status"
              name="status"
              required
              aria-describedby="err-status"
              defaultValue={row.status}
              className={inputClass}
            >
              {CASE_STATUS.map((st) => (
                <option
                  key={st}
                  disabled={st === 'Selesai' && !canSelesai}
                >
                  {st === 'Selesai' && !canSelesai ? `${st} (Admin saja)` : st}
                </option>
              ))}
            </select>
            <FieldError name="status" />
          </div>
          {canSelesai ? (
            <div>
              <Label htmlFor="st-reason" optional>
                Alasan (opsional)
              </Label>
              <textarea
                id="st-reason"
                name="reason"
                rows={2}
                aria-describedby="err-reason"
                className={inputClass}
                placeholder="Catatan untuk audit log, mis. alasan menyelesaikan/membuka kembali perkara"
              />
              <FieldError name="reason" />
            </div>
          ) : (
            <p className="text-xs text-navy-400">
              Status &ldquo;Selesai&rdquo; hanya dapat diatur oleh Admin.
            </p>
          )}
        </FormDialog>
      ) : null}

      {canEdit && mode === 'edit' ? (
        <FormDialog
          open
          onClose={() => setMode(null)}
          title="Ubah perkara"
          schema={updateCaseSchema}
          onSubmit={save}
        >
          <RequiredNote />
          <div>
            <Label htmlFor="ec-title" optional>
              Judul
            </Label>
            <input
              id="ec-title"
              name="title"
              aria-describedby="err-title"
              defaultValue={row.title}
              className={inputClass}
            />
            <FieldError name="title" />
          </div>
          {clientOptions ? (
            <div>
              <Label htmlFor="ec-client" optional>
                Klien
              </Label>
              <select
                id="ec-client"
                name="clientId"
                aria-describedby="err-clientId"
                defaultValue={row.clientId}
                className={inputClass}
              >
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <FieldError name="clientId" />
            </div>
          ) : null}
          {opponentOptions ? (
            <div>
              <Label htmlFor="ec-opponent" optional>
                Pihak lawan
              </Label>
              <select
                id="ec-opponent"
                name="opponentId"
                aria-describedby="err-opponentId"
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
              <FieldError name="opponentId" />
            </div>
          ) : null}
          <div>
            <Label htmlFor="ec-number" optional>
              No. perkara (pengadilan)
            </Label>
            <input
              id="ec-number"
              name="caseNumber"
              aria-describedby="err-caseNumber"
              defaultValue={row.caseNumber ?? ''}
              className={inputClass}
            />
            <FieldError name="caseNumber" />
          </div>
          <div>
            <Label htmlFor="ec-court" optional>
              Pengadilan
            </Label>
            <input
              id="ec-court"
              name="court"
              aria-describedby="err-court"
              defaultValue={row.court ?? ''}
              className={inputClass}
            />
            <FieldError name="court" />
          </div>
          <div>
            <Label htmlFor="ec-type" optional>
              Jenis perkara
            </Label>
            <select
              id="ec-type"
              name="caseType"
              aria-describedby="err-caseType"
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
            <FieldError name="caseType" />
          </div>
          <div>
            <Label htmlFor="ec-start" optional>
              Tanggal mulai
            </Label>
            <input
              id="ec-start"
              name="startDate"
              type="date"
              aria-describedby="err-startDate"
              defaultValue={row.startDate ?? ''}
              className={inputClass}
            />
            <FieldError name="startDate" />
          </div>
          <div>
            <Label htmlFor="ec-desc" optional>
              Keterangan
            </Label>
            <textarea
              id="ec-desc"
              name="description"
              rows={2}
              aria-describedby="err-description"
              defaultValue={row.description ?? ''}
              className={inputClass}
            />
            <FieldError name="description" />
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
