/**
 * Satu-satunya tempat nama aplikasi dan penanda merek. Logo resmi menyusul: saat tiba,
 * ganti isi `Brand` dengan berkas dari `public/` tanpa menyentuh halaman lain.
 */
export const APP_NAME = 'eKaSatra';

const SIZE = {
  full: 'text-2xl',
  compact: 'text-xl',
} as const;

export function Brand({
  variant = 'full',
  className = '',
}: {
  variant?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span className={`font-display font-semibold ${SIZE[variant]} ${className}`}>{APP_NAME}</span>
  );
}
