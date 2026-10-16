/** Kontak klien/pihak lawan disimpan sebagai [{ type, value }]; helper kecil untuk tampilan. */
export type Contact = { type: string; value: string };

export function asContacts(value: unknown): Contact[] {
  return Array.isArray(value)
    ? (value as unknown[]).filter(
        (c): c is Contact =>
          !!c && typeof c === 'object' && 'type' in c && 'value' in c && !!(c as Contact).value,
      )
    : [];
}

export const PHONE_TYPES = ['HP', 'WhatsApp', 'Telepon'];

export function firstPhone(value: unknown): string | null {
  return asContacts(value).find((c) => PHONE_TYPES.includes(c.type))?.value ?? null;
}
