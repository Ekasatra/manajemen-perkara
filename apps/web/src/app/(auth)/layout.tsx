/**
 * Layout untuk halaman auth (login, setup) — tanpa sidebar, full-screen center.
 */
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
