/**
 * Layout untuk halaman auth (login, setup): tanpa sidebar, kartu di tengah, tombol tema di pojok.
 */
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/shell/theme-toggle';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-navy-50 p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
