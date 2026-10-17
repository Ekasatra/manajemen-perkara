'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { FieldError, Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
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
        <RequiredNote />
        <div>
          <Label htmlFor="sm-sender" required>
            Pengirim
          </Label>
          <input
            id="sm-sender"
            name="sender"
            required
            aria-describedby="err-sender"
            className={inputClass}
          />
          <FieldError name="sender" />
        </div>
        <div>
          <Label htmlFor="sm-subject" required>
            Perihal
          </Label>
          <input
            id="sm-subject"
            name="subject"
            required
            aria-describedby="err-subject"
            className={inputClass}
          />
          <FieldError name="subject" />
        </div>
        <div>
          <Label htmlFor="sm-no" optional>
            Nomor surat asal
          </Label>
          <input id="sm-no" name="noSurat" aria-describedby="err-noSurat" className={inputClass} />
          <FieldError name="noSurat" />
        </div>
        <div>
          <Label htmlFor="sm-tgl" optional>
            Tanggal surat
          </Label>
          <input
            id="sm-tgl"
            name="tglSurat"
            type="date"
            aria-describedby="err-tglSurat"
            className={inputClass}
          />
          <FieldError name="tglSurat" />
        </div>
        <div>
          <Label htmlFor="sm-terima" optional>
            Tanggal terima (default hari ini)
          </Label>
          <input
            id="sm-terima"
            name="tglTerima"
            type="date"
            aria-describedby="err-tglTerima"
            className={inputClass}
          />
          <FieldError name="tglTerima" />
        </div>
        <div>
          <Label htmlFor="sm-sifat" required>
            Sifat
          </Label>
          <select
            id="sm-sifat"
            name="sifat"
            required
            aria-describedby="err-sifat"
            defaultValue="Biasa"
            className={inputClass}
          >
            {['Biasa', 'Segera', 'Penting', 'Rahasia'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <FieldError name="sifat" />
        </div>
        <div>
          <Label htmlFor="sm-case" optional>
            Perkara terkait
          </Label>
          <select id="sm-case" name="caseId" aria-describedby="err-caseId" className={inputClass}>
            <option value="">Tanpa perkara</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError name="caseId" />
        </div>
        <div>
          <Label htmlFor="sm-assign" optional>
            Disposisi kepada
          </Label>
          <select
            id="sm-assign"
            name="assignedTo"
            aria-describedby="err-assignedTo"
            className={inputClass}
          >
            <option value="">Belum didisposisi</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <FieldError name="assignedTo" />
        </div>
        <div>
          <Label htmlFor="sm-note" optional>
            Catatan disposisi
          </Label>
          <textarea
            id="sm-note"
            name="disposisiNote"
            rows={2}
            aria-describedby="err-disposisiNote"
            className={inputClass}
          />
          <FieldError name="disposisiNote" />
        </div>
        <div>
          <Label htmlFor="sm-file" optional>
            Lampiran (maks 25 MB)
          </Label>
          <input id="sm-file" name="file" type="file" className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
