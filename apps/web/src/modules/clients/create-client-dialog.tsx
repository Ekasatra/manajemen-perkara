'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';

type FormContact = { kind: 'phone' | 'email'; label?: string; value: string; isPrimary: boolean };

const INITIAL: FormContact[] = [
  { kind: 'phone', label: 'Telepon', value: '', isPrimary: true },
  { kind: 'email', label: 'Email', value: '', isPrimary: true },
];

export function CreateClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<FormContact[]>(INITIAL);

  function addContact(kind: 'phone' | 'email') {
    setContacts((prev) => [
      ...prev,
      { kind, label: kind === 'phone' ? 'Telepon' : 'Email', value: '', isPrimary: false },
    ]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function setPrimary(index: number) {
    setContacts((prev) => {
      const target = prev[index];
      if (!target) return prev;
      return prev.map((c, i) => ({ ...c, isPrimary: c.kind === target.kind && i === index }));
    });
  }

  function setValue(index: number, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, value } : c)));
  }

  async function handleSubmit(formData: FormData) {
    const name = String(formData.get('name') ?? '');
    const type = String(formData.get('type') ?? '');
    const address = String(formData.get('address') ?? '');

    const filled = contacts.filter((c) => c.value.trim());
    const byKind = (kind: 'phone' | 'email') => filled.filter((c) => c.kind === kind);
    const ensurePrimary = (list: FormContact[]) => {
      if (!list.length) return list;
      if (!list.some((c) => c.isPrimary)) return list.map((c, i) => ({ ...c, isPrimary: i === 0 }));
      return list;
    };

    const payload = [...ensurePrimary(byKind('phone')), ...ensurePrimary(byKind('email'))].map(
      (c, i) => ({ ...c, position: i }),
    );

    const res = await fetch('/api/v1/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: type || undefined,
        address: address || undefined,
        contacts: payload,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? 'Gagal membuat klien');
    setOpen(false);
    setContacts(INITIAL);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
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
        <RequiredNote />
        <div>
          <Label htmlFor="cc-name" required>
            Nama
          </Label>
          <input id="cc-name" name="name" type="text" required className={inputClass} />
        </div>
        <div>
          <Label htmlFor="cc-type" optional>
            Tipe
          </Label>
          <select id="cc-type" name="type" className={inputClass}>
            <option value="">Belum dipilih</option>
            <option value="Perorangan">Perorangan</option>
            <option value="Perusahaan">Perusahaan</option>
            <option value="Instansi">Instansi</option>
          </select>
        </div>
        {/* Kontak telepon */}
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold text-navy-600">Telepon</legend>
          {contacts
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => c.kind === 'phone')
            .map(({ c, i }) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="tel"
                  value={c.value}
                  onChange={(e) => setValue(i, e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={`${inputClass} flex-1`}
                />
                <label className="flex items-center gap-1 text-xs text-navy-500">
                  <input
                    type="radio"
                    name="phone-primary"
                    checked={c.isPrimary}
                    onChange={() => setPrimary(i)}
                  />
                  Utama
                </label>
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  aria-label="Hapus telepon"
                  className="text-navy-400 hover:text-danger-fg"
                >
                  ×
                </button>
              </div>
            ))}
          <button
            type="button"
            onClick={() => addContact('phone')}
            className={`${buttonClass.ghost} px-2 text-xs`}
          >
            + Tambah telepon
          </button>
        </fieldset>

        {/* Kontak email */}
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold text-navy-600">Email</legend>
          {contacts
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => c.kind === 'email')
            .map(({ c, i }) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="email"
                  value={c.value}
                  onChange={(e) => setValue(i, e.target.value)}
                  placeholder="nama@contoh.com"
                  className={`${inputClass} flex-1`}
                />
                <label className="flex items-center gap-1 text-xs text-navy-500">
                  <input
                    type="radio"
                    name="email-primary"
                    checked={c.isPrimary}
                    onChange={() => setPrimary(i)}
                  />
                  Utama
                </label>
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  aria-label="Hapus email"
                  className="text-navy-400 hover:text-danger-fg"
                >
                  ×
                </button>
              </div>
            ))}
          <button
            type="button"
            onClick={() => addContact('email')}
            className={`${buttonClass.ghost} px-2 text-xs`}
          >
            + Tambah email
          </button>
        </fieldset>
        <div>
          <Label htmlFor="cc-address" optional>
            Alamat
          </Label>
          <textarea id="cc-address" name="address" rows={2} className={inputClass} />
        </div>
      </FormDialog>
    </>
  );
}
