'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormDialog } from '@/components/ui/form-dialog';
import { Label, RequiredNote } from '@/components/ui/field';
import { buttonClass, inputClass } from '@/components/ui/styles';

type Contact = { type: string; value: string };

export type PartyRow = {
  id: string;
  name: string;
  type: string | null;
  address: string | null;
  contacts: unknown;
};

const PHONE_TYPES = ['HP', 'WhatsApp', 'Telepon'];

function asContacts(value: unknown): Contact[] {
  return Array.isArray(value) ? (value as Contact[]) : [];
}

/** Ganti kontak telepon/email pertama, kontak jenis lain dibiarkan utuh. */
function setContact(list: Contact[], types: string[], fallback: string, value: string): Contact[] {
  const i = list.findIndex((c) => types.includes(c.type));
  if (!value) return i < 0 ? list : list.filter((_, n) => n !== i);
  if (i < 0) return [...list, { type: fallback, value }];
  return list.map((c, n) => (n === i ? { ...c, value } : c));
}

/**
 * Tombol Ubah dan Hapus per baris untuk Klien dan Pihak Lawan. Tombol hanya dirender bila
 * server mengizinkan (`can()` di halaman); API tetap memeriksa ulang hak aksesnya.
 */
export function PartyActions({
  entity,
  row,
  canEdit,
  canDelete,
}: {
  entity: 'clients' | 'opponents';
  row: PartyRow;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null);
  const isClient = entity === 'clients';
  const contacts = asContacts(row.contacts);
  const phone = contacts.find((c) => PHONE_TYPES.includes(c.type))?.value ?? '';
  const email = contacts.find((c) => c.type === 'Email')?.value ?? '';
  const noun = isClient ? 'klien' : 'pihak lawan';

  async function call(method: 'PATCH' | 'DELETE', body?: unknown) {
    const res = await fetch(`/api/v1/${entity}/${row.id}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error?.message ?? `Gagal memproses ${noun}`);
    setMode(null);
    router.refresh();
  }

  async function save(formData: FormData) {
    const text = (k: string) => String(formData.get(k) ?? '').trim();
    let next = setContact(contacts, PHONE_TYPES, 'HP', text('phone'));
    if (isClient) next = setContact(next, ['Email'], 'Email', text('email'));
    await call('PATCH', {
      name: text('name'),
      type: text('type') || null,
      address: text('address') || null,
      contacts: next,
    });
  }

  const id = `ep-${entity}-${row.id}`;

  return (
    <div className="flex gap-[12px]">
      {canEdit ? (
        <button type="button" onClick={() => setMode('edit')} className={buttonClass.ghost}>
          Ubah
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={() => setMode('delete')}
          className={`${buttonClass.ghost} text-danger-fg`}
        >
          Hapus
        </button>
      ) : null}

      {canEdit && mode === 'edit' ? (
        <FormDialog open onClose={() => setMode(null)} title={`Ubah ${noun}`} onSubmit={save}>
          <RequiredNote />
          <div>
            <Label htmlFor={`${id}-name`} optional>
              Nama
            </Label>
            <input
              id={`${id}-name`}
              name="name"
              type="text"
              defaultValue={row.name}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor={`${id}-type`} optional>
              Tipe
            </Label>
            <select
              id={`${id}-type`}
              name="type"
              defaultValue={row.type ?? ''}
              className={inputClass}
            >
              <option value="">Belum dipilih</option>
              <option value="Perorangan">Perorangan</option>
              <option value="Perusahaan">Perusahaan</option>
              <option value="Instansi">Instansi</option>
            </select>
          </div>
          <div>
            <Label htmlFor={`${id}-phone`} optional>
              Telepon
            </Label>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              defaultValue={phone}
              className={inputClass}
            />
          </div>
          {isClient ? (
            <div>
              <Label htmlFor={`${id}-email`} optional>
                Email
              </Label>
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                defaultValue={email}
                className={inputClass}
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor={`${id}-address`} optional>
              Alamat
            </Label>
            <textarea
              id={`${id}-address`}
              name="address"
              rows={2}
              defaultValue={row.address ?? ''}
              className={inputClass}
            />
          </div>
        </FormDialog>
      ) : null}

      {canDelete && mode === 'delete' ? (
        <FormDialog
          open
          onClose={() => setMode(null)}
          title={`Hapus ${noun}?`}
          description={`${row.name} akan dihapus permanen dan tidak bisa dikembalikan.`}
          submitLabel="Hapus"
          destructive
          onSubmit={() => call('DELETE')}
        >
          <p className="text-sm text-navy-600">
            Hanya Superadmin yang dapat menghapus. Tindakan ini tercatat di Audit Log.
          </p>
        </FormDialog>
      ) : null}
    </div>
  );
}
