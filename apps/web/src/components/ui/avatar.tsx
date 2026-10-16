import { avatarColor } from '@/lib/avatar';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Lingkaran inisial berwarna per nama, cincin putih (gaya GAS). */
export function Avatar({ name, size = 8 }: { name: string; size?: 7 | 8 | 9 }) {
  const dim = { 7: 'size-7', 8: 'size-8', 9: 'size-9' }[size];
  return (
    <span
      title={name}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white ${avatarColor(name)}`}
    >
      <span aria-hidden="true">{initials(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** Beberapa avatar bertumpuk; sisanya diringkas "+n". */
export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  if (names.length === 0) return <span className="text-navy-300">—</span>;
  const shown = names.slice(0, max);
  return (
    <span className="flex -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} />
      ))}
      {names.length > max ? (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-navy-100 text-[11px] font-bold text-navy-600 ring-2 ring-white">
          +{names.length - max}
        </span>
      ) : null}
    </span>
  );
}
