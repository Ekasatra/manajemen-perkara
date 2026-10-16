'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { callApi, uploadFile } from '@/modules/surat/upload';

type Option = { id: string; label: string };

export function CreateSuratMasukDialog({ cases, staff }: { cases: Option[]; staff: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onSubmit(fd: FormData) {
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    const file = fd.get('file');
    const up = file instanceof File && file.size > 0 ? await uploadFile('surat-masuk', file) : null;
    await callApi('/api/v1/surat-masuk', 'POST', {
      sender: str('sender'),
      subject: str('subject'),
      noSurat: str('noSurat') || null,
      tglSurat: str('tglSurat') || null,
      tglTerima: str('tglTerima') || undefined,
      sifat: str('sifat') || 'Biasa',
      caseId: str('caseId') || null,
      assignedTo: str('assignedTo') || null,
      disposisiNote: str('disposisiNote') || null,
      filePath: up?.path ?? null,
      fileName: up?.fileName ?? null,
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        Catat Surat Masuk
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Catat Surat Masuk"
        description="No. agenda (SM/tahun/nomor) dibuat otomatis. Mengisi disposisi langsung mengirim email."
        submitLabel="Simpan"
        onSubmit={onSubmit}
      >
        <div>
          <label htmlFor="sm-sender" className={labelClass}>Pengirim</label>
          <input id="sm-sender" name="sender" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="sm-subject" className={labelClass}>Perihal</label>
          <input id="sm-subject" name="subject" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="sm-no" className={labelClass}>Nomor surat asal</label>
          <input id="sm-no" name="noSurat" className={inputClass} />
        </div>
        <div>
          <label htmlFor="sm-tgl" className={labelClass}>Tanggal surat</label>
          <input id="sm-tgl" name="tglSurat" type="date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="sm-terima" className={labelClass}>Tanggal terima (default hari ini)</label>
          <input id="sm-terima" name="tglTerima" type="date" className={inputClass} />
        </div>
        <div>
          <label htmlFor="sm-sifat" className={labelClass}>Sifat</label>
          <select id="sm-sifat" name="sifat" defaultValue="Biasa" className={inputClass}>
            {['Biasa', 'Segera', 'Penting', 'Rahasia'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sm-case" className={labelClass}>Perkara terkait</label>
          <select id="sm-case" name="caseId" className={inputClass}>
            <option value="">Tanpa perkara</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sm-assign" className={labelClass}>Disposisi kepada</label>
          <select id="sm-assign" name="assignedTo" className={inputClass}>
            <option value="">Belum didisposisi</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sm-note" className={labelClass}>Catatan disposisi</label>
          <textarea id="sm-note" name="disposisiNote" rows={2} className={inputClass} />
        </div>
        <div>
          <label htmlFor="sm-file" className={labelClass}>Lampiran (maks 25 MB)</label>
          <input id="sm-file" name="file" type="file" className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
