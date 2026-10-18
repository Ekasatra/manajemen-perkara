/** Kontak klien/pihak lawan disimpan sebagai [{ kind, label?, value, isPrimary?, position? }];
 *  Format lama [{ type, value }] masih didukung untuk kompatibilitas data lama. */
export type Contact = {
  kind: string;
  label?: string;
  value: string;
  isPrimary?: boolean;
  position?: number;
};

export function asContacts(value: unknown): Contact[] {
  return Array.isArray(value)
    ? (value as unknown[]).filter(
        (c): c is Contact =>
          !!c &&
          typeof c === 'object' &&
          'value' in c &&
          !!((c as { value: unknown }).value as string) &&
          (('kind' in c && typeof (c as { kind: unknown }).kind === 'string') ||
            ('type' in c && typeof (c as { type: unknown }).type === 'string')),
      )
    : [];
}

/** Normalisasi kontak lama (type) menjadi kind untuk tampilan seragam. */
export function normalizeContact(c: Contact): Contact {
  const raw = c as { type?: string; kind?: string };
  return {
    kind: c.kind ?? raw.type ?? 'phone',
    label: c.label,
    value: c.value,
    isPrimary: c.isPrimary,
    position: c.position,
  };
}

export const PHONE_KINDS = ['HP', 'WhatsApp', 'Telepon', 'phone'];

export function firstPhone(value: unknown): string | null {
  return asContacts(value)
    .map(normalizeContact)
    .find((c) => PHONE_KINDS.includes(c.kind))?.value ?? null;
}

export function primaryByKind(contacts: unknown, kind: 'phone' | 'email'): Contact | null {
  return asContacts(contacts)
    .map(normalizeContact)
    .find((c) => c.kind === kind && c.isPrimary === true) ?? null;
}

export function contactsByKind(contacts: unknown, kind: 'phone' | 'email'): Contact[] {
  return asContacts(contacts)
    .map(normalizeContact)
    .filter((c) => c.kind === kind)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}
