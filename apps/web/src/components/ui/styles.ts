/**
 * Kelas Tailwind bersama untuk kontrol form/tombol agar semua modul tampil seragam (gaya GAS:
 * sudut besar, bayangan lembut, tombol utama navy, tombol emas, tombol bergaris putih).
 * Cincin fokus datang dari `:focus-visible` global di globals.css. Tinggi minimum 44 px di
 * layar sentuh (R-03), 40 px di md ke atas.
 */
const base =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-10';

export const buttonClass = {
  primary: `${base} bg-primary text-on-primary shadow-soft hover:bg-primary-hover`,
  gold: `${base} bg-gold-500 text-white shadow-soft hover:bg-gold-600`,
  secondary: `${base} border border-navy-200 bg-surface/70 text-navy-700 hover:border-navy-300 hover:bg-surface`,
  ghost: `${base} text-navy-700 hover:bg-navy-100`,
  danger: `${base} bg-danger-fg text-on-danger hover:opacity-90`,
  softDanger: `${base} border border-danger-fg/20 bg-danger-bg text-danger-fg hover:opacity-90`,
} as const;

export const labelClass = 'mb-2 block text-xs font-semibold tracking-wide text-navy-600';

export const inputClass =
  'block min-h-11 w-full rounded-control border border-navy-200 bg-surface/80 px-3.5 py-2.5 text-sm text-navy-800 shadow-sm outline-none transition placeholder:text-navy-300 focus:border-gold-400 focus:ring-4 focus:ring-gold-100 md:min-h-10';
