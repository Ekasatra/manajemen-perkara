import { asContacts } from '@/lib/contacts';

/** Ringkasan kontak: maksimal `max` baris, sisanya "+n lagi". */
export function ContactList({ contacts, max = 2 }: { contacts: unknown; max?: number }) {
  const list = asContacts(contacts);
  if (list.length === 0) return <span className="text-navy-300">—</span>;
  return (
    <ul className="space-y-0.5 text-xs">
      {list.slice(0, max).map((c, i) => (
        <li key={`${c.type}-${i}`} className="text-navy-700">
          <span className="text-navy-400">{c.type}:</span> {c.value}
        </li>
      ))}
      {list.length > max ? <li className="text-navy-400">+{list.length - max} lagi</li> : null}
    </ul>
  );
}
