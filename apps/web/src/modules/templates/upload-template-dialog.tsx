'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { callApi, uploadFile } from '@/modules/surat/upload';

export function UploadTemplateDialog({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onSubmit(fd: FormData) {
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) throw new Error('Berkas template wajib dipilih');
    const up = await uploadFile('templates', file);
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    await callApi('/api/v1/templates', 'POST', {
      name: str('name'),
      category: str('category'),
      description: str('description') || null,
      filePath: up.path,
      fileName: up.fileName,
      fileSize: up.size,
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
        Unggah Template
      </button>
      <FormDialog open={open} onClose={() => setOpen(false)} title="Unggah Template" submitLabel="Unggah" onSubmit={onSubmit}>
        <div>
          <label htmlFor="tp-name" className={labelClass}>Nama</label>
          <input id="tp-name" name="name" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="tp-cat" className={labelClass}>Kategori</label>
          <input id="tp-cat" name="category" required list="tp-cats" className={inputClass} />
          <datalist id="tp-cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="tp-desc" className={labelClass}>Deskripsi</label>
          <textarea id="tp-desc" name="description" rows={2} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tp-file" className={labelClass}>Berkas (maks 25 MB)</label>
          <input id="tp-file" name="file" type="file" required className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
