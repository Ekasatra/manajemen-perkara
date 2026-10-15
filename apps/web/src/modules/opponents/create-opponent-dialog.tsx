'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

export function CreateOpponentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const name = String(formData.get('name') ?? '');
    const type = String(formData.get('type') ?? '');
    const address = String(formData.get('address') ?? '');
    const phoneVal = String(formData.get('phone') ?? '');

    const contacts: { type: string; value: string }[] = [];
    if (phoneVal) contacts.push({ type: 'HP', value: phoneVal });

    const res = await fetch('/api/v1/opponents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: type || undefined,
        address: address || undefined,
        contacts,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat pihak lawan');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass.primary}
      >
        Tambah Pihak Lawan
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Pihak Lawan"
        submitLabel="Buat"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="co-name" className={labelClass}>
            Nama
          </label>
          <input id="co-name" name="name" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="co-type" className={labelClass}>
            Tipe
          </label>
          <select id="co-type" name="type" className={inputClass}>
            <option value="">—</option>
            <option value="Perorangan">Perorangan</option>
            <option value="Perusahaan">Perusahaan</option>
            <option value="Instansi">Instansi</option>
          </select>
        </div>
        <div>
          <label htmlFor="co-phone" className={labelClass}>
            Telepon
          </label>
          <input id="co-phone" name="phone" type="tel" className={inputClass} />
        </div>
        <div>
          <label htmlFor="co-address" className={labelClass}>
            Alamat
          </label>
          <textarea id="co-address" name="address" rows={2} className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
