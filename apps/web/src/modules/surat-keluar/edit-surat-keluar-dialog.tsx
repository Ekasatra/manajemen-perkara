'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { callApi } from '@/modules/surat/upload';

type Surat = {
  id: string;
  noSurat: string;
  tglSurat: string;
  kepada: string;
  perihal: string;
  notes: string | null;
};

export function EditSuratKeluarDialog({ surat }: { surat: Surat }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onSubmit(fd: FormData) {
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    await callApi(`/api/v1/surat-keluar/${surat.id}`, 'PATCH', {
      noSurat: str('noSurat'),
      tglSurat: str('tglSurat'),
      kepada: str('kepada'),
      perihal: str('perihal'),
      notes: str('notes') || null,
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.secondary}>
        Ubah
      </button>
      <FormDialog open={open} onClose={() => setOpen(false)} title="Ubah Surat Keluar" onSubmit={onSubmit}>
        <div>
          <label htmlFor="ek-no" className={labelClass}>Nomor surat</label>
          <input id="ek-no" name="noSurat" required defaultValue={surat.noSurat} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ek-tgl" className={labelClass}>Tanggal surat</label>
          <input id="ek-tgl" name="tglSurat" type="date" required defaultValue={surat.tglSurat} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ek-kepada" className={labelClass}>Kepada</label>
          <input id="ek-kepada" name="kepada" required defaultValue={surat.kepada} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ek-perihal" className={labelClass}>Perihal</label>
          <input id="ek-perihal" name="perihal" required defaultValue={surat.perihal} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ek-notes" className={labelClass}>Catatan</label>
          <textarea id="ek-notes" name="notes" rows={2} defaultValue={surat.notes ?? ''} className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
