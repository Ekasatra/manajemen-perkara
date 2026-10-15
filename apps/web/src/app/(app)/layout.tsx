import type { ReactNode } from 'react';
import { AppShell } from '@/shell/app-shell';
import type { NavItem } from '@/shell/app-shell';

// A4 mengganti ini dengan menu hasil pemuat module.config.ts yang sudah difilter per role.
const NAV: NavItem[] = [{ label: 'Beranda', href: '/' }];

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell nav={NAV}>{children}</AppShell>;
}
