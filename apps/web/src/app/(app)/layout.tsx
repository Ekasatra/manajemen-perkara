import type { ReactNode } from 'react';
import { AppShell } from '@/shell/app-shell';
import type { NavItem } from '@/shell/app-shell';

// A4 akan mengganti ini dengan pemuat otomatis module.config.ts yang sudah difilter per role.
const NAV: NavItem[] = [
  { label: 'Beranda', href: '/' },
  { label: 'Perkara', href: '/cases' },
  { label: 'Klien', href: '/clients' },
  { label: 'Pihak Lawan', href: '/opponents' },
  { label: 'Data Advokat', href: '/advocates' },
  { label: 'Pengguna', href: '/users' },
  { label: 'Surat Masuk', href: '/surat-masuk' },
  { label: 'Surat Keluar', href: '/surat-keluar' },
  { label: 'Template Surat', href: '/templates' },
  { label: 'Invoice', href: '/invoices' },
  { label: 'Honor Tim', href: '/honor-tim' },
  { label: 'Laporan', href: '/reports' },
  { label: 'Pengaturan', href: '/settings' },
  { label: 'Audit Log', href: '/audit' },
];

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell nav={NAV}>{children}</AppShell>;
}
