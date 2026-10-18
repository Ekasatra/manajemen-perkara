import { asContacts, normalizeContact } from '@/lib/contacts';

/** Ringkasan kontak: maksimal `max` baris, sisanya "+n lagi". */
export function ContactList({ contacts, max = 2 }: { contacts: unknown; max?: number }) {
  const list = asContacts(contacts).map(normalizeContact);
  if (list.length === 0) return <span className="text-navy-300">—</span>;
  const primaries = list.filter((c) => c.isPrimary === true);
  const others = list.filter((c) => c.isPrimary !== true);
  const show = [...primaries, ...others].slice(0, max);
  return (
    <ul className="space-y-0.5 text-xs">
      {show.map((c, i) => (
        <li key={`${c.kind}-${i}`} className="text-navy-700">
          <span className="text-navy-400">{c.label ?? c.kind}:</span> {c.value}
        </li>
      ))}
      {list.length > max ? <li className="text-navy-400">+{list.length - max} lagi</li> : null}
    </ul>
  );
}
