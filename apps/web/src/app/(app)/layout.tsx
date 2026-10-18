import type { ReactNode } from 'react';
import type { PolicyUser } from '@ekasatra/core';
import { ROLE_LABEL } from '@/lib/role-label';
import { getAuthContext } from '@/lib/session';
import { AppShell } from '@/shell/app-shell';
import type { Viewer } from '@/shell/app-shell';
import { visibleNav } from '@/shell/app-nav';

// Semua halaman di (app) bergantung sesi + DB: jangan di-prerender saat build.
export const dynamic = 'force-dynamic';

/** Sesi tidak valid tidak dilempar dari sini: tiap halaman sudah mengarahkan ke /login sendiri. */
async function loadViewer() {
  try {
    return await getAuthContext();
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await loadViewer();
  const policyUser: PolicyUser | null = user ? { role: user.role } : null;
  // Menyembunyikan menu BUKAN otorisasi: tiap rute dan API tetap memanggil ensureCan()/requireCan().
  const nav = visibleNav(policyUser);
  const viewer: Viewer | null = user
    ? { name: user.fullName, email: user.email, roleLabel: ROLE_LABEL[user.role] ?? '' }
    : null;
  return (
    <AppShell nav={nav} viewer={viewer}>
      {children}
    </AppShell>
  );
}
