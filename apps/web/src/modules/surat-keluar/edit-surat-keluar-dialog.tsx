'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { FieldError, Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
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
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Ubah Surat Keluar"
        onSubmit={onSubmit}
      >
        <RequiredNote />
        <div>
          <Label htmlFor="ek-no" optional>
            Nomor surat
          </Label>
          <input
            id="ek-no"
            name="noSurat"
            aria-describedby="err-noSurat"
            defaultValue={surat.noSurat}
            className={inputClass}
          />
          <FieldError name="noSurat" />
        </div>
        <div>
          <Label htmlFor="ek-tgl" optional>
            Tanggal surat
          </Label>
          <input
            id="ek-tgl"
            name="tglSurat"
            type="date"
            aria-describedby="err-tglSurat"
            defaultValue={surat.tglSurat}
            className={inputClass}
          />
          <FieldError name="tglSurat" />
        </div>
        <div>
          <Label htmlFor="ek-kepada" optional>
            Kepada
          </Label>
          <input
            id="ek-kepada"
            name="kepada"
            aria-describedby="err-kepada"
            defaultValue={surat.kepada}
            className={inputClass}
          />
          <FieldError name="kepada" />
        </div>
        <div>
          <Label htmlFor="ek-perihal" optional>
            Perihal
          </Label>
          <input
            id="ek-perihal"
            name="perihal"
            aria-describedby="err-perihal"
            defaultValue={surat.perihal}
            className={inputClass}
          />
          <FieldError name="perihal" />
        </div>
        <div>
          <Label htmlFor="ek-notes" optional>
            Catatan
          </Label>
          <textarea
            id="ek-notes"
            name="notes"
            rows={2}
            aria-describedby="err-notes"
            defaultValue={surat.notes ?? ''}
            className={inputClass}
          />
          <FieldError name="notes" />
        </div>
      </FormDialog>
    </>
  );
}
