'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';
import { callApi, uploadFile } from '@/modules/surat/upload';

export function UploadTemplateDialog({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onSubmit(fd: FormData) {
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0)
      throw new Error('Berkas template wajib dipilih');
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
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Unggah Template"
        submitLabel="Unggah"
        onSubmit={onSubmit}
      >
        <RequiredNote />
        <div>
          <Label htmlFor="tp-name" required>
            Nama
          </Label>
          <input id="tp-name" name="name" required className={inputClass} />
        </div>
        <div>
          <Label htmlFor="tp-cat" required>
            Kategori
          </Label>
          <input id="tp-cat" name="category" required list="tp-cats" className={inputClass} />
          <datalist id="tp-cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="tp-desc" optional>
            Deskripsi
          </Label>
          <textarea id="tp-desc" name="description" rows={2} className={inputClass} />
        </div>
        <div>
          <Label htmlFor="tp-file" required>
            Berkas (maks 25 MB)
          </Label>
          <input id="tp-file" name="file" type="file" required className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
