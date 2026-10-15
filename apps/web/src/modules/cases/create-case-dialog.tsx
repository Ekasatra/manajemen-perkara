'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

type ClientOption = { id: string; name: string; clientCode: string };

export function CreateCaseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/v1/clients?pageSize=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setClients(data.data.rows);
      })
      .catch(() => {});
  }, [open]);

  async function handleSubmit(formData: FormData) {
    const title = String(formData.get('title') ?? '');
    const clientId = String(formData.get('clientId') ?? '');
    const court = String(formData.get('court') ?? '');
    const caseNumber = String(formData.get('caseNumber') ?? '');
    const caseType = String(formData.get('caseType') ?? '');
    const description = String(formData.get('description') ?? '');

    if (!clientId) throw new Error('Klien wajib dipilih');

    const res = await fetch('/api/v1/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        clientId,
        court: court || undefined,
        caseNumber: caseNumber || undefined,
        caseType: caseType || undefined,
        description: description || undefined,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat perkara');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        Tambah Perkara
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Perkara"
        description="Nomor REG/{tahun}/ dibuat otomatis. Advokat pembuat otomatis menjadi anggota tim."
        submitLabel="Buat"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="cc-title" className={labelClass}>
            Judul
          </label>
          <input id="cc-title" name="title" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="cc-client" className={labelClass}>
            Klien
          </label>
          <select id="cc-client" name="clientId" required className={inputClass}>
            <option value="">— Pilih klien —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientCode} — {c.name}
              </option>
            ))}
          </select>
          {clients.length === 0 ? (
            <p className="mt-1 text-xs text-navy-400">Belum ada klien. Minta Admin menambahkan klien terlebih dahulu.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="cc-casenumber" className={labelClass}>
            No. Perkara (pengadilan)
          </label>
          <input id="cc-casenumber" name="caseNumber" type="text" className={inputClass} />
        </div>
        <div>
          <label htmlFor="cc-court" className={labelClass}>
            Pengadilan
          </label>
          <input id="cc-court" name="court" type="text" className={inputClass} />
        </div>
        <div>
          <label htmlFor="cc-casetype" className={labelClass}>
            Jenis Perkara
          </label>
          <input id="cc-casetype" name="caseType" type="text" className={inputClass} />
        </div>
        <div>
          <label htmlFor="cc-desc" className={labelClass}>
            Keterangan
          </label>
          <textarea id="cc-desc" name="description" rows={2} className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
