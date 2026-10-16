import type { ReactNode } from 'react';
import { can, requireUser } from '@ekasatra/core';
import type { PolicyUser, Resource } from '@ekasatra/core';
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/shell/app-shell';
import type { NavItem, Viewer } from '@/shell/app-shell';

// Semua halaman di (app) bergantung sesi + DB: jangan di-prerender saat build.
export const dynamic = 'force-dynamic';

/** Menu tampil bila role boleh `R` pada resource-nya (matriks PRD §4). Tanpa resource = semua staf. */
type NavEntry = NavItem & { resource?: Resource };

// Kelompok menu memakai istilah yang sama dengan modul di PRD. Urutan array = urutan tampil.
const NAV: NavEntry[] = [
  { label: 'Beranda', href: '/', icon: 'home' },
  { label: 'Perkara', href: '/cases', icon: 'cases', group: 'Perkara', resource: 'cases' },
  {
    label: 'Surat Masuk',
    href: '/surat-masuk',
    icon: 'suratMasuk',
    group: 'Surat',
    resource: 'surat_masuk',
  },
  {
    label: 'Surat Keluar',
    href: '/surat-keluar',
    icon: 'suratKeluar',
    group: 'Surat',
    resource: 'surat_keluar',
  },
  {
    label: 'Template Surat',
    href: '/templates',
    icon: 'templates',
    group: 'Surat',
    resource: 'templates',
  },
  {
    label: 'Invoice',
    href: '/invoices',
    icon: 'invoices',
    group: 'Keuangan',
    resource: 'invoices',
  },
  {
    label: 'Honor Tim',
    href: '/honor-tim',
    icon: 'honorTim',
    group: 'Keuangan',
    resource: 'honor_tim',
  },
  { label: 'Laporan', href: '/reports', icon: 'reports', group: 'Keuangan', resource: 'reports' },
  { label: 'Klien', href: '/clients', icon: 'clients', group: 'Master Data', resource: 'clients' },
  {
    label: 'Pihak Lawan',
    href: '/opponents',
    icon: 'opponents',
    group: 'Master Data',
    resource: 'opponents',
  },
  {
    label: 'Data Advokat',
    href: '/advocates',
    icon: 'advocates',
    group: 'Master Data',
    resource: 'advocates',
  },
  { label: 'Pengguna', href: '/users', icon: 'users', group: 'Sistem', resource: 'users' },
  {
    label: 'Pengaturan',
    href: '/settings',
    icon: 'settings',
    group: 'Sistem',
    resource: 'settings',
  },
  { label: 'Audit Log', href: '/audit', icon: 'audit', group: 'Sistem', resource: 'audit_log' },
];

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  advokat: 'Advokat',
  paralegal: 'Paralegal',
};

/** Sesi tidak valid tidak dilempar dari sini: tiap halaman sudah mengarahkan ke /login sendiri. */
async function loadViewer() {
  try {
    return await requireUser(createDb(), await createSupabaseServerClient());
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await loadViewer();
  const policyUser: PolicyUser | null = user ? { role: user.role } : null;
  // Menyembunyikan menu BUKAN otorisasi: tiap rute dan API tetap memanggil ensureCan().
  const nav = NAV.filter(
    (item) => !item.resource || (policyUser && can(policyUser, 'R', item.resource)),
  ).map(({ resource: _resource, ...item }) => item);
  const viewer: Viewer | null = user
    ? { name: user.fullName, email: user.email, roleLabel: ROLE_LABEL[user.role] ?? '' }
    : null;
  return (
    <AppShell nav={nav} viewer={viewer}>
      {children}
    </AppShell>
  );
}
