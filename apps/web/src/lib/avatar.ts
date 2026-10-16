// Warna avatar bergilir per nama, sama dengan aplikasi GAS.
const AVATAR_COLORS = [
  'bg-navy-600',
  'bg-gold-500',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-rose-500',
  'bg-sky-600',
] as const;

export function avatarColor(name: string): string {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}
