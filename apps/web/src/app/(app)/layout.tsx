import type { ReactNode } from 'react';
import { can, requireUser } from '@ekasatra/core';
import type { PolicyUser, Resource } from '@ekasatra/core';
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ROLE_LABEL } from '@/lib/role-label';
import { AppShell } from '@/shell/app-shell';
import type { NavItem, Viewer } from '@/shell/app-shell';

// Semua halaman di (app) bergantung sesi + DB: jangan di-prerender saat build.
export const dynamic = 'force-dynamic';

/** Menu tampil bila role boleh `R` pada resource-nya (matriks PRD §4). Tanpa resource = semua staf. */
type NavEntry = NavItem & { resource?: Resource };

// Kelompok menu memakai istilah yang sama dengan modul di PRD. Urutan array = urutan tampil.
const NAV: NavEntry[] = [
  { label: 'Dashboard', href: '/', icon: 'home', group: 'Utama' },
  {
    label: 'Surat Masuk',
    href: '/surat-masuk',
    icon: 'suratMasuk',
    group: 'Korespondensi',
    resource: 'surat_masuk',
  },
  {
    label: 'Surat Keluar',
    href: '/surat-keluar',
    icon: 'suratKeluar',
    group: 'Korespondensi',
    resource: 'surat_keluar',
    badge: 'approvals',
  },
  {
    label: 'Template Surat',
    href: '/templates',
    icon: 'templates',
    group: 'Korespondensi',
    resource: 'templates',
  },
  { label: 'Perkara', href: '/cases', icon: 'cases', group: 'Perkara', resource: 'cases' },
  {
    label: 'Jadwal Sidang',
    href: '/jadwal',
    icon: 'schedule',
    group: 'Perkara',
    resource: 'schedules',
  },
  { label: 'Klien', href: '/clients', icon: 'clients', group: 'Perkara', resource: 'clients' },
  {
    label: 'Pihak Lawan',
    href: '/opponents',
    icon: 'opponents',
    group: 'Perkara',
    resource: 'opponents',
  },
  {
    label: 'Dokumen & Drive',
    href: '/dokumen',
    icon: 'documents',
    group: 'Perkara',
    resource: 'case_documents',
  },
  {
    label: 'Biaya Perkara',
    href: '/invoices',
    icon: 'invoices',
    group: 'Perkara',
    resource: 'invoices',
  },
  {
    label: 'Honor Tim',
    href: '/honor-tim',
    icon: 'honorTim',
    group: 'Perkara',
    resource: 'honor_tim',
  },
  {
    label: 'Data Advokat',
    href: '/advocates',
    icon: 'advocates',
    group: 'Tim',
    resource: 'advocates',
  },
  {
    label: 'Laporan & Export',
    href: '/reports',
    icon: 'reports',
    group: 'Analitik',
    resource: 'reports',
  },
  { label: 'Audit Log', href: '/audit', icon: 'audit', group: 'Analitik', resource: 'audit_log' },
  {
    label: 'Manajemen User',
    href: '/users',
    icon: 'users',
    group: 'Sistem',
    resource: 'users',
  },
  {
    label: 'Pengaturan',
    href: '/settings',
    icon: 'settings',
    group: 'Sistem',
    resource: 'settings',
  },
  { label: 'Profil Saya', href: '/profil', icon: 'profile', group: 'Sistem' },
];


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
