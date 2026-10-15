/**
 * Kontrak menu modul + guard per role (Agent A · A4).
 * Tiap modul mendeklarasikan `module.config.ts` berisi `ModuleConfig`; sidebar dirakit dari
 * `registry.ts`. Menu tampil bila `can(user, 'R', resource)` — role tidak dicek di sini.
 * Menyembunyikan menu BUKAN otorisasi: route/API tetap wajib `ensureCan()`.
 */
import { can } from '@ekasatra/core';
import type { PolicyUser, Resource } from '@ekasatra/core';
import type { NavItem } from './app-shell';

export type ModuleConfig = {
  /** Label di sidebar. */
  name: string;
  /** Path halaman utama modul, mis. `/clients`. */
  href: string;
  /** Resource kernel (`RESOURCES`); menu tampil bila user boleh `R` pada resource ini. */
  resource: Resource;
  /** Urutan di sidebar, kecil di atas. Default 100; sama → urut nama. */
  order?: number;
  /** Diterima untuk kompatibilitas; belum dirender sidebar. */
  icon?: string;
};

export const HOME: NavItem = { label: 'Beranda', href: '/' };

const DEFAULT_ORDER = 100;

export function buildNav(modules: readonly ModuleConfig[], user: PolicyUser): NavItem[] {
  const visible = modules
    .filter((m) => can(user, 'R', m.resource))
    .sort(
      (a, b) =>
        (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER) ||
        a.name.localeCompare(b.name, 'id'),
    )
    .map((m) => ({ label: m.name, href: m.href }));
  return [HOME, ...visible];
}
