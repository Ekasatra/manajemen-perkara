/**
 * Kelas Tailwind bersama untuk kontrol form/tombol agar semua modul tampil seragam.
 * Cincin fokus datang dari `:focus-visible` global di globals.css. Tinggi minimum 44 px di
 * layar sentuh (R-03), lebih rapat di md ke atas.
 */
const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 md:min-h-9';

export const buttonClass = {
  primary: `${base} bg-navy-700 text-white hover:bg-navy-600`,
  secondary: `${base} border border-navy-300 bg-white text-navy-700 hover:bg-navy-50`,
  ghost: `${base} text-navy-700 hover:bg-navy-100`,
  danger: `${base} bg-danger-fg text-white hover:opacity-90`,
} as const;

export const labelClass = 'mb-1 block text-sm font-medium text-navy-800';

export const inputClass =
  'block min-h-11 w-full rounded-control border border-navy-300 bg-white px-3 py-2 text-sm text-navy-800 placeholder:text-navy-400 md:min-h-9';
