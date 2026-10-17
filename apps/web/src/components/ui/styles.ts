/**
 * Kelas Tailwind bersama untuk kontrol form/tombol agar semua modul tampil seragam (gaya GAS:
 * sudut besar, bayangan lembut, tombol utama navy, tombol emas, tombol bergaris putih).
 * Cincin fokus datang dari `:focus-visible` global di globals.css.
 *
 * Aturan jarak & sentuh tombol (berlaku di seluruh app; nilai px literal, bukan `gap-3`/`gap-2`,
 * karena `html { font-size: 15px }` membuat kelas `gap-3` hanya 11,25 px dan `gap-2` 7,5 px —
 * keduanya di bawah minimum): setiap grup tombol teks dalam satu baris atau kaki dialog berjarak
 * minimal 12 px (`gap-[12px]`); baris aksi tabel juga `gap-[12px]` (masuk rentang 8–12 px) dengan
 * tinggi tombol mengikuti `buttonClass` di bawah (44 px di ponsel, 40 px di md ke atas);
 * tombol ikon-saja berukuran `size-11` (±41 px, rentang sentuh 40–44 px), wajib punya
 * `aria-label`, dan berjarak minimal 8 px ke tetangganya; tab bar/segmen mengikuti aturan teks
 * 12 px; di ponsel tombol utama dialog ditumpuk vertikal dengan jarak 12 px. Jangan mengecilkan
 * tombol untuk mematuhi aturan ini — perbesar jarak atau ukurannya. Dokumentasi: docs/DESIGN.md.
 */
const base =
  'inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[40px]';

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
  'block min-h-[44px] w-full rounded-control border border-navy-200 bg-surface/80 px-3.5 py-2.5 text-sm text-navy-800 shadow-sm outline-none transition placeholder:text-navy-300 focus:border-gold-400 focus:ring-4 focus:ring-gold-100 md:min-h-[40px]';
