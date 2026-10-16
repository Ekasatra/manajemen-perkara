'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { callApi, uploadFile } from '@/modules/surat/upload';

type Option = { id: string; label: string };

export function CreateSuratKeluarDialog({
  cases,
  reviewers,
  today,
}: {
  cases: Option[];
  reviewers: Option[];
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [jenis, setJenis] = useState<'Perkara' | 'Instansi'>('Perkara');

  async function onSubmit(fd: FormData) {
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) throw new Error('File surat wajib diunggah');
    const up = await uploadFile('surat-keluar', file);
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    await callApi('/api/v1/surat-keluar', 'POST', {
      noSurat: str('noSurat'),
      tglSurat: str('tglSurat'),
      kepada: str('kepada'),
      perihal: str('perihal'),
      jenis,
      caseId: jenis === 'Perkara' ? str('caseId') || null : null,
      reviewerId: jenis === 'Instansi' ? str('reviewerId') || null : null,
      notes: str('notes') || null,
      filePath: up.path,
      fileName: up.fileName,
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        Unggah Surat
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Unggah Surat Keluar"
        description="Surat disimpan sebagai Draft; ajukan dari halaman detail."
        submitLabel="Simpan Draft"
        onSubmit={onSubmit}
      >
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sk-no" className={labelClass}>
              Nomor surat
            </label>
            <input id="sk-no" name="noSurat" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="sk-tgl" className={labelClass}>
              Tanggal surat
            </label>
            <input
              id="sk-tgl"
              name="tglSurat"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <label htmlFor="sk-jenis" className={labelClass}>
              Jenis
            </label>
            <select
              id="sk-jenis"
              value={jenis}
              onChange={(e) => setJenis(e.target.value as 'Perkara' | 'Instansi')}
              className={inputClass}
            >
              <option value="Perkara">Perkara</option>
              <option value="Instansi">Instansi</option>
            </select>
          </div>
          {jenis === 'Perkara' ? (
            <div>
              <label htmlFor="sk-case" className={labelClass}>
                Perkara
              </label>
              <select id="sk-case" name="caseId" required className={inputClass}>
                <option value="">Pilih perkara</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="sk-rev" className={labelClass}>
                Reviewer (advokat)
              </label>
              <select id="sk-rev" name="reviewerId" className={inputClass}>
                <option value="">Saya sendiri (bila Advokat/Admin)</option>
                {reviewers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="sk-kepada" className={labelClass}>
            Kepada
          </label>
          <input id="sk-kepada" name="kepada" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="sk-perihal" className={labelClass}>
            Perihal
          </label>
          <input id="sk-perihal" name="perihal" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="sk-file" className={labelClass}>
            File surat (maks 25 MB)
          </label>
          <input id="sk-file" name="file" type="file" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="sk-notes" className={labelClass}>
            Catatan
          </label>
          <textarea id="sk-notes" name="notes" rows={2} className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
