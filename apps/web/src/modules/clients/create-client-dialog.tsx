'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';

export function CreateClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    const name = String(formData.get('name') ?? '');
    const type = String(formData.get('type') ?? '');
    const address = String(formData.get('address') ?? '');
    const phoneVal = String(formData.get('phone') ?? '');
    const emailVal = String(formData.get('email') ?? '');

    const contacts: { type: string; value: string }[] = [];
    if (phoneVal) contacts.push({ type: 'HP', value: phoneVal });
    if (emailVal) contacts.push({ type: 'Email', value: emailVal });

    const res = await fetch('/api/v1/clients', {
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
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat klien');
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
        Tambah Klien
      </button>
      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Klien"
        description="Kode klien (KL-) dibuat otomatis."
        submitLabel="Buat"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="cc-name" className={labelClass}>
            Nama
          </label>
          <input id="cc-name" name="name" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="cc-type" className={labelClass}>
            Tipe
          </label>
          <select id="cc-type" name="type" className={inputClass}>
            <option value="">—</option>
            <option value="Perorangan">Perorangan</option>
            <option value="Perusahaan">Perusahaan</option>
            <option value="Instansi">Instansi</option>
          </select>
        </div>
        <div>
          <label htmlFor="cc-phone" className={labelClass}>
            Telepon
          </label>
          <input id="cc-phone" name="phone" type="tel" className={inputClass} />
        </div>
        <div>
          <label htmlFor="cc-email" className={labelClass}>
            Email
          </label>
          <input id="cc-email" name="email" type="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="cc-address" className={labelClass}>
            Alamat
          </label>
          <textarea id="cc-address" name="address" rows={2} className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
