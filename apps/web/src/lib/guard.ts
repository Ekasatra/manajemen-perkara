import { forbidden } from 'next/navigation';
import { can } from '@ekasatra/core';
import type { Action, PolicyUser, Resource } from '@ekasatra/core';

/**
 * Guard halaman untuk matriks akses PRD-MASUKAN §4 R7.
 *
 * Menolak akses URL langsung ke menu yang tidak berhak dengan halaman "Tidak punya akses"
 * (HTTP 403 lewat `forbidden()`), bukan sekadar menyembunyikan item menu. Ini melengkapi
 * API yang tetap memakai `ensureCan()` (JSON 403) di `packages/core`.
 *
 * Hanya boleh dipanggil dari jalur render Server Component.
 */
export function requireCan(user: PolicyUser, action: Action, resource: Resource): void {
  if (!can(user, action, resource)) forbidden();
}
