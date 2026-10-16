import type { ReactNode } from 'react';
import { AppShell } from '@/shell/app-shell';
import type { NavItem } from '@/shell/app-shell';

// Semua halaman di (app) bergantung sesi + DB: jangan di-prerender saat build.
export const dynamic = 'force-dynamic';

// Kelompok menu memakai istilah yang sama dengan modul di PRD. Urutan array = urutan tampil.
const NAV: NavItem[] = [
  { label: 'Beranda', href: '/', icon: 'home' },
  { label: 'Perkara', href: '/cases', icon: 'cases', group: 'Perkara' },
  { label: 'Surat Masuk', href: '/surat-masuk', icon: 'suratMasuk', group: 'Surat' },
  { label: 'Surat Keluar', href: '/surat-keluar', icon: 'suratKeluar', group: 'Surat' },
  { label: 'Template Surat', href: '/templates', icon: 'templates', group: 'Surat' },
  { label: 'Invoice', href: '/invoices', icon: 'invoices', group: 'Keuangan' },
  { label: 'Honor Tim', href: '/honor-tim', icon: 'honorTim', group: 'Keuangan' },
  { label: 'Laporan', href: '/reports', icon: 'reports', group: 'Keuangan' },
  { label: 'Klien', href: '/clients', icon: 'clients', group: 'Master Data' },
  { label: 'Pihak Lawan', href: '/opponents', icon: 'opponents', group: 'Master Data' },
  { label: 'Data Advokat', href: '/advocates', icon: 'advocates', group: 'Master Data' },
  { label: 'Pengguna', href: '/users', icon: 'users', group: 'Sistem' },
  { label: 'Pengaturan', href: '/settings', icon: 'settings', group: 'Sistem' },
  { label: 'Audit Log', href: '/audit', icon: 'audit', group: 'Sistem' },
];

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AppShell nav={NAV}>{children}</AppShell>;
}
