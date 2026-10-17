/**
 * Daftar menu aplikasi + penyaringan berbasis `can()` (matriks PRD §4 + PRD-MASUKAN §4 R7).
 * Menu tampil bila role boleh `R` pada resource-nya; entri tanpa resource = semua staf.
 *
 * Menyembunyikan menu BUKAN otorisasi: setiap rute memanggil `requireCan()` (halaman 403)
 * dan setiap API memanggil `ensureCan()` (JSON 403). Filter ini satu-satunya sumber urutan menu.
 */
import { can } from '@ekasatra/core';
import type { PolicyUser, Resource } from '@ekasatra/core';
import type { NavItem } from './app-shell';

/** Entri menu internal dengan resource kernel untuk penyaringan; `resource` tidak ikut dirender. */
export type NavEntry = NavItem & { resource?: Resource };

// Kelompok menu memakai istilah yang sama dengan modul di PRD. Urutan array = urutan tampil.
export const APP_NAV: NavEntry[] = [
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

/** Menu yang boleh dilihat user; `resource` dibuang agar bentuknya `NavItem` untuk sidebar. */
export function visibleNav(user: PolicyUser | null): NavItem[] {
  return APP_NAV.filter(
    (item) => !item.resource || (user !== null && can(user, 'R', item.resource)),
  ).map(({ resource: _resource, ...item }) => item);
}
