/** Kelas Tailwind bersama untuk kontrol form/tombol agar semua modul tampil seragam (Agent A · A3). */
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-600';

export const buttonClass = {
  primary: `inline-flex items-center justify-center rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`,
  secondary: `inline-flex items-center justify-center rounded-md border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`,
} as const;

export const labelClass = 'mb-1 block text-sm font-medium text-navy-800';

export const inputClass = `block w-full rounded-md border border-navy-200 bg-white px-3 py-2 text-sm text-navy-800 placeholder:text-navy-400 ${focus}`;
