'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { callApi } from '@/modules/surat/upload';

type Option = { id: string; label: string };

export function DisposisiForm({
  id,
  staff,
  assignedTo,
  note,
  status,
}: {
  id: string;
  staff: Option[];
  assignedTo: string | null;
  note: string | null;
  status: 'Belum' | 'Didisposisi' | 'Selesai';
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await callApi(`/api/v1/surat-masuk/${id}`, 'PATCH', body);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const to = String(fd.get('assignedTo') ?? '');
        void patch({
          ...(to ? { assignedTo: to } : {}),
          disposisiNote: String(fd.get('disposisiNote') ?? '').trim() || null,
        });
      }}
    >
      <div>
        <label htmlFor="ds-to" className={labelClass}>Disposisi kepada</label>
        <select id="ds-to" name="assignedTo" defaultValue={assignedTo ?? ''} className={inputClass}>
          <option value="">Pilih penerima disposisi</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ds-note" className={labelClass}>Catatan</label>
        <textarea id="ds-note" name="disposisiNote" rows={2} defaultValue={note ?? ''} className={inputClass} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={buttonClass.primary}>
          Simpan disposisi
        </button>
        {status !== 'Selesai' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void patch({ status: 'Selesai' })}
            className={buttonClass.secondary}
          >
            Tandai selesai
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="text-sm text-danger-fg">{error}</p> : null}
    </form>
  );
}
