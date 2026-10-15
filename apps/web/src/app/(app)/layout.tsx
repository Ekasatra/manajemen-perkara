import type { ReactNode } from 'react';
import { AppShell } from '@/shell/app-shell';
import type { NavItem } from '@/shell/app-shell';

// Menu sementara. Setelah sesi tersedia (C1: requireUser), ganti dengan
// `buildNav(MODULES, user)` dari '@/shell/nav' + '@/shell/registry'.
const NAV: NavItem[] = [{ label: 'Beranda', href: '/' }];

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell nav={NAV}>{children}</AppShell>;
}
